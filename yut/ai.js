/* 윷놀이 AI · AI 선생님 (core.js 위에서, 브라우저·Node 공용)
   · 🐣 easy  : 멀리 가기·잡기 위주 + 가끔 아무거나
   · 🐱 normal: 판 평가(말마다 '집까지 남은 기대 던지기 수' · 잡힐 위험 · 업기 · 지름길) 로 한 수씩 가장 좋은 것
   · 🐯 hard  : 이번 차례에 남은 결과를 어느 말에 어떤 순서로 쓸지 끝까지 따져 보고,
                차례가 넘어가면 다음 팀이 던질 결과(도~모 확률)마다 그 팀의 가장 좋은 수를 가정해 평균 (내다보기)
   평가 단위 = '던지기 한 번' (말 하나가 집까지 가는 데 드는 기대 던지기 수 E[칸] 의 차이) */
(function (root, factory) {
  const Y = typeof module === 'object' && module.exports ? require('./core.js') : root.Yut;
  const api = factory(Y);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YutAI = api;
})(typeof self !== 'undefined' ? self : this, function (Y) {
  'use strict';
  const { WAIT, HOME, BACKDO, YUT, MO, MAXK, A_THROW } = Y;

  // ── 판 표 (확률별로 한 번만 계산) ──────────────────────────
  const cache = new Map();
  function tables(flatP, backdo) {
    const key = flatP + '|' + backdo;
    if (cache.has(key)) return cache.get(key);
    const P = Y.probs(flatP, backdo);
    // DEST[칸][종류] = 한 번에 가는 곳 (지나온 길 모르면 빽도는 기본 뒤칸), -1 = 못 감
    const DEST = [];
    for (let n = 0; n <= HOME; n++) {
      DEST[n] = [];
      for (let k = 0; k < 6; k++) {
        if (n === HOME || (k === BACKDO && n === WAIT)) { DEST[n][k] = -1; continue; }
        if (k === BACKDO) { DEST[n][k] = Y.PRED[n]; continue; }
        let x = n, prev = -1;
        for (let i = 0; i < Y.STEPS[k]; i++) { const y = Y.next(x, i === 0, prev); prev = x; x = y; if (x === HOME) break; }
        DEST[n][k] = x;
      }
    }
    // E[칸] = 말 하나가 집까지 가는 데 드는 기대 던지기 수 (값 반복)
    const E = new Array(HOME + 1).fill(8);
    E[HOME] = 0;
    for (let it = 0; it < 400; it++) {
      for (let n = 0; n < HOME; n++) {
        let v = 1;
        for (let k = 0; k < 6; k++) { if (!P[k]) continue; const d = DEST[n][k]; v += P[k] * E[d < 0 ? n : d]; }
        E[n] = v;
      }
    }
    // HIT[칸][목표] = 그 칸의 말이 한 차례에 목표 칸에 내려앉을 대략의 확률 (윷·모 뒤 한 번 더 포함)
    const HIT = [];
    const pX = P[YUT] + P[MO];
    for (let n = 0; n < HOME; n++) {
      const h = new Float64Array(HOME + 1);
      for (let k = 0; k < 6; k++) {
        const d = DEST[n][k]; if (d < 0 || d === HOME || !P[k]) continue;
        h[d] += P[k];
        if (k === YUT || k === MO) for (let k2 = 0; k2 < 6; k2++) { const d2 = DEST[d][k2]; if (d2 > 0 && d2 < HOME) h[d2] += P[k] * P[k2]; }
        h[d] += pX * P[k] * 0.5;               // 윷·모를 다른 말에 쓰고 이 결과를 이 말에
      }
      for (let i = 0; i <= HOME; i++) h[i] = Math.min(0.95, h[i]);
      HIT[n] = h;
    }
    const T = { P, DEST, E, HIT, E0: E[WAIT] };
    cache.set(key, T);
    return T;
  }

  // ── 평가 ─────────────────────────────────────────────────
  const CORNER = { 5: 0.35, 10: 0.3, 23: 0.25 };
  function teamScore(s, t, T) {
    let sc = 0;
    const pos = s.pos[t];
    for (let i = 0; i < s.k; i++) sc += pos[i] === HOME ? T.E0 + 0.6 : T.E0 - T.E[pos[i]];
    // 판 위 묶음마다 잡힐 위험
    const seen = new Set();
    for (let i = 0; i < s.k; i++) {
      const X = pos[i];
      if (X === WAIT || X === HOME || seen.has(X)) continue;
      seen.add(X);
      let c = 0; for (let j = 0; j < s.k; j++) if (pos[j] === X) c++;
      let q = 1;
      for (let u = 0; u < s.n; u++) {
        if (u === t) continue;
        const pu = s.pos[u], us = new Set();
        for (let j = 0; j < s.k; j++) { const y = pu[j]; if (y === HOME || us.has(y)) continue; us.add(y); q *= 1 - T.HIT[y][X]; }
      }
      const pHit = 1 - q;
      sc -= pHit * (c * (T.E0 - T.E[X]) + 1) * 0.9;
      if (c > 1) sc += 0.15 * (c - 1);          // 업으면 던지기를 아낌
      if (CORNER[X]) sc += CORNER[X];
    }
    return sc;
  }
  function evaluate(s, t) {
    if (s.phase === 'end') return s.winner === t ? 1000 : -1000;
    const T = tables(s.flatP, s.backdo);
    const mine = teamScore(s, t, T);
    let sum = 0, mx = -1e9;
    for (let u = 0; u < s.n; u++) { if (u === t) continue; const v = teamScore(s, u, T); sum += v; if (v > mx) mx = v; }
    let v = mine - (0.5 * mx + 0.5 * sum / (s.n - 1));
    // 아직 내 차례면 남은 결과·던지기의 값어치
    if (s.turn === t) {
      for (const k of s.pool) v += k === BACKDO ? -0.15 : Y.STEPS[k] / 2.7;
      if (s.phase === 'throw') v += s.extra * 0.95;
    }
    return v;
  }

  // ── 난수 (AI 자체, 시험에서 똑같이 나오게 씨앗으로) ────────────
  function mkRng(seed) { const st = { rng: (seed >>> 0) || 7 }; return () => Y.rnd(st); }

  // ── 고르기 ───────────────────────────────────────────────
  function chooseEasy(s, rand) {
    const acts = Y.legalActions(s);
    if (acts.length === 1) return acts[0];
    if (rand() < 0.3) return acts[Math.floor(rand() * acts.length)];
    const T = tables(s.flatP, s.backdo), t = s.turn;
    let best = acts[0], bv = -1e9;
    for (const a of acts) {
      const { state: s2, events } = Y.step(s, a);
      let v = 0;
      for (let i = 0; i < s.k; i++) v += (s2.pos[t][i] === HOME ? T.E0 + 0.6 : T.E0 - T.E[s2.pos[t][i]]) - (s.pos[t][i] === HOME ? T.E0 + 0.6 : T.E0 - T.E[s.pos[t][i]]);
      if (events.some(e => e.type === 'capture')) v += 2;
      v += rand() * 1.6;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  function chooseNormal(s, rand) {
    const acts = Y.legalActions(s);
    if (acts.length === 1) return acts[0];
    const t = s.turn;
    let best = acts[0], bv = -1e9;
    for (const a of acts) {
      const v = evaluate(Y.step(s, a).state, t) + rand() * 0.01;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }

  // 🐯: 이번 차례 끝까지 찾기 + 다음 팀 던지기 기대값
  function chooseHard(s, rand, opt = {}) {
    const acts = Y.legalActions(s);
    if (acts.length === 1) return acts[0];
    const t = s.turn;
    const ctx = { t, budget: opt.budget || 4000, T: tables(s.flatP, s.backdo) };
    let best = acts[0], bv = -1e9;
    for (const a of acts) {
      const v = afterMove(Y.step(s, a).state, ctx, 0) + rand() * 0.01;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }
  // 움직인 뒤의 값 (아직 내 차례면 계속 찾기)
  function afterMove(s, ctx, depth) {
    ctx.budget--;
    if (s.phase === 'end') return evaluate(s, ctx.t);
    if (s.turn === ctx.t) {
      if (ctx.budget <= 0 || depth >= 4) return evaluate(s, ctx.t);
      if (s.phase === 'move') {
        let bv = -1e9;
        for (const a of Y.legalActions(s)) bv = Math.max(bv, afterMove(Y.step(s, a).state, ctx, depth + 1));
        return bv;
      }
      // 잡아서 한 번 더 던짐: 결과마다 평균 (한 단계만, 그 뒤는 평가)
      if (depth >= 2) return evaluate(s, ctx.t);
      let v = 0;
      for (let k = 0; k < 6; k++) {
        const p = ctx.T.P[k]; if (!p) continue;
        const c = Y.clone(s); Y.forceThrow(c, k);
        v += p * (c.turn === ctx.t && c.phase === 'move' ? greedyValue(c, ctx.t, ctx.t) : afterMove(c, ctx, depth + 2));
      }
      return v;
    }
    return opponentReply(s, ctx);
  }
  // 다음 팀이 한 번 던져서 (자기 눈으로) 가장 좋은 수를 둔다고 보고 평균
  function opponentReply(s, ctx) {
    if (s.phase !== 'throw') return evaluate(s, ctx.t);
    const u = s.turn;
    let v = 0;
    for (let k = 0; k < 6; k++) {
      const p = ctx.T.P[k]; if (!p) continue;
      const c = Y.clone(s); Y.forceThrow(c, k);
      if (c.turn !== u || c.phase !== 'move') { v += p * evaluate(c, ctx.t); continue; }
      v += p * greedyValue(c, u, ctx.t);
    }
    return v;
  }
  // mover 가 자기 평가로 한 수 둔 뒤의 판을 me 눈으로
  function greedyValue(s, mover, me) {
    const acts = Y.legalActions(s);
    let bestS = null, bv = -1e9;
    for (const a of acts) {
      const s2 = Y.step(s, a).state;
      const v = evaluate(s2, mover);
      if (v > bv) { bv = v; bestS = s2; }
    }
    return bestS ? evaluate(bestS, me) : evaluate(s, me);
  }

  function choose(s, tier = 'normal', opt = {}) {
    if (s.phase === 'throw') return A_THROW;
    const rand = mkRng(opt.seed != null ? opt.seed : (s.rng ^ (s.turnNo * 2654435761)) >>> 0);
    if (tier === 'easy') return chooseEasy(s, rand);
    if (tier === 'hard') return chooseHard(s, rand, opt);
    return chooseNormal(s, rand);
  }

  // ── AI 선생님: 가장 좋은 수 + 짧은 까닭 ───────────────────────
  const TEAM_WORD = ['빨강', '파랑', '노랑', '초록'];
  function describe(s, a, names) {
    const t = s.turn, { kind, piece } = Y.decode(a);
    const T = tables(s.flatP, s.backdo);
    const from = s.pos[t][piece];
    const { state: s2, events } = Y.step(s, a);
    const mv = events.find(e => e.type === 'move');
    const dest = mv ? mv.to : -1;
    const why = [];
    const cap = events.filter(e => e.type === 'capture');
    if (cap.length) {
      const n = cap.reduce((x, e) => x + e.pieces.length, 0);
      const who = cap.map(e => (names && names[e.victim]) || TEAM_WORD[e.victim] + '팀').join('·');
      why.push(`${who} 말${n > 1 ? ' ' + n + '개를' : '을'} 잡고 한 번 더 던져요`);
    }
    if (dest === HOME) why.push(mv.pieces.length > 1 ? `업힌 말 ${mv.pieces.length}개가 한꺼번에 나가요` : '말 하나가 집에 들어가요');
    if (events.some(e => e.type === 'stack') && !cap.length) why.push('내 말을 업어서 같이 가요');
    if (!cap.length && dest !== HOME && Y.NODE_NAME[dest] && dest !== 20 && dest !== 15) why.push(`${Y.NODE_NAME[dest]}에 서서 다음에 지름길로 가요`);
    if (from === WAIT && !why.length) why.push('새 말을 내보내요');
    if (kind === BACKDO && !why.length) why.push('빽도는 한 칸 뒤로 가요');
    // 위험 비교
    if (dest > 0 && dest < HOME && !why.length) {
      let q = 1;
      for (let u = 0; u < s2.n; u++) { if (u === t) continue; for (let j = 0; j < s2.k; j++) { const y = s2.pos[u][j]; if (y !== HOME) q *= 1 - T.HIT[y][dest]; } }
      const ph = 1 - q;
      if (ph < 0.12) why.push('상대가 잡기 어려운 자리예요');
      else if (from > 0 && from < HOME) {
        let q0 = 1;
        for (let u = 0; u < s.n; u++) { if (u === t) continue; for (let j = 0; j < s.k; j++) { const y = s.pos[u][j]; if (y !== HOME) q0 *= 1 - T.HIT[y][from]; } }
        if (1 - q0 > ph + 0.1) why.push('잡힐 뻔한 말을 피해요');
      }
    }
    if (!why.length) why.push(dest === 20 ? '참먹이까지 와서 다음엔 나가요' : '집에 가장 가까워지는 수예요');
    return { a, kind, piece, from, dest, path: mv ? mv.path : [], reason: why.slice(0, 2).join(', ') };
  }
  function suggest(s, names) {
    if (s.phase === 'throw') return { throw: true, reason: s.extra > 1 ? `한 번 더 던질 수 있어요 (${s.extra}번)` : '윷을 던질 차례예요' };
    if (s.phase !== 'move') return null;
    const a = choose(s, 'hard', { seed: 1 });
    return describe(s, a, names);
  }

  return { choose, evaluate, tables, suggest, describe };
});

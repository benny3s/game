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

  // ── AI 선생님: 가장 좋은 수 + 까닭 + 흐름 읽기 ─────────────────
  // 베니 님 11-01: '어디 두라고만 하니 뭔 말인지 모르겠고 재미없음' → 내 차례마다 셋을 같이 말함
  //   👀 상대 흐름: 내 지난 차례 뒤 상대가 한 일(coachRead.opp) + 지금 판에서 내 말이 잡힐 위험(threat)
  //   📊 내 흐름  : 났음 · 남은 칸 · 앞섬/뒤짐 · 지난 차례와 달라진 것(race)
  //   👉 수의 의미: 추천 수가 그 위험·기회와 어떻게 이어지는지(describe 의 reason)
  // 확률 = 코어의 윷 확률표(Y.probs) 그대로: '던지기 한 번에 그 칸에 정확히 내려앉는' 결과들의 합
  //   (윷·모 뒤 한 번 더 던지는 몫은 안 세서 실제 위험보다 조금 낮게 말함)
  const TEAM_WORD = ['빨강', '파랑', '노랑', '초록'];
  const NAMES = Y.NAMES, STEPS = Y.STEPS;
  const jong = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const ga = w => w + (jong(w) ? '이' : '가');
  const eul = w => w + (jong(w) ? '을' : '를');
  const ro = w => w + (jong(w) && (String(w).charCodeAt(String(w).length - 1) - 0xAC00) % 28 !== 8 ? '으로' : '로');
  const pctOf = p => Math.round(p * 100);
  const teamName = (names, q) => (names && names[q]) || TEAM_WORD[q] + '팀';
  const DIAG_FIRST = { 21: 1, 26: 1, 28: 1 };          // 모서리·방에서 떠날 때 지름길의 첫 칸

  // 집까지 남은 칸 (가장 짧은 길, 원하는 곳에 늘 설 수 있다고 칠 때)
  const remOf = (S, t) => S.pos[t].reduce((a, x) => a + Y.DIST[x], 0);
  const remAll = S => S.pos.map((_, t) => remOf(S, t));
  const othersOf = (S, t) => { const a = []; for (let u = 0; u < S.n; u++) if (u !== t) a.push(u); return a; };
  // 팀들의 말이 있는 서로 다른 칸 [[칸, 팀], …] (집에 든 말은 뺌 · 대기 0 포함)
  function srcOf(S, teams) {
    const out = [];
    for (const u of teams) {
      const seen = new Set();
      for (let i = 0; i < S.k; i++) { const x = S.pos[u][i]; if (x === HOME || seen.has(x)) continue; seen.add(x); out.push([x, u]); }
    }
    return out;
  }
  // src 의 말들이 던지기 한 번으로 target 칸에 내려앉는 결과들: { p 합, ks: [{ k 결과, p, who: [[칸, 팀], …] }] } (확률 높은 순)
  function directKinds(T, src, target) {
    const ks = []; let p = 0;
    for (let k = 0; k < 6; k++) {
      const pk = T.P[k]; if (!(pk > 0)) continue;
      const who = src.filter(([x]) => x !== HOME && T.DEST[x][k] === target);
      if (who.length) { ks.push({ k, p: pk, who }); p += pk; }
    }
    ks.sort((a, b) => b.p - a.p);
    return { p, ks };
  }
  // 팀 t 의 판 위 묶음마다 상대가 다음 던지기에 잡을 확률 (잃을 몫이 큰 순)
  function dangersOf(S, T, t) {
    const out = [], opp = srcOf(S, othersOf(S, t)), seen = new Set();
    for (let i = 0; i < S.k; i++) {
      const X = S.pos[t][i];
      if (X === WAIT || X === HOME || seen.has(X)) continue;
      seen.add(X);
      const pieces = []; for (let j = 0; j < S.k; j++) if (S.pos[t][j] === X) pieces.push(j);
      const dk = directKinds(T, opp, X);
      if (dk.p > 0) out.push({ node: X, pieces, p: dk.p, ks: dk.ks, loss: dk.p * (pieces.length * (T.E0 - T.E[X]) + 1) });
    }
    return out.sort((a, b) => b.loss - a.loss);
  }
  // 상대 묶음마다 내가 다음 던지기에 잡을 확률 (얻을 몫이 큰 순)
  function chancesOf(S, T, t) {
    const mine = srcOf(S, [t]), out = [];
    for (const u of othersOf(S, t)) {
      const seen = new Set();
      for (let i = 0; i < S.k; i++) {
        const X = S.pos[u][i];
        if (X === WAIT || X === HOME || seen.has(X)) continue;
        seen.add(X);
        let c = 0; for (let j = 0; j < S.k; j++) if (S.pos[u][j] === X) c++;
        const dk = directKinds(T, mine, X);
        if (dk.p > 0) out.push({ team: u, node: X, count: c, p: dk.p, ks: dk.ks, gain: dk.p * (c * (T.E0 - T.E[X]) + 1) });
      }
    }
    return out.sort((a, b) => b.gain - a.gain);
  }
  const kindList = ks => ks.map(e => NAMES[e.k]).join('·');
  const whoNames = (ks, names) => {
    const us = [];
    for (const e of ks) for (const [, u] of e.who) if (!us.includes(u)) us.push(u);
    return us.slice(0, 2).map(u => teamName(names, u)).join('·');
  };
  // "곰돌이팀 말이 내 말 2칸 뒤 — 개가 나오면 잡혀요 (약 35%)"
  function threatText(d, names, mine) {
    const c = d.pieces.length, grp = c > 1 ? `업은 ${mine} ${c}개` : mine, who = whoNames(d.ks, names);
    const head = d.ks.length === 1
      ? `${who} 말이 ${grp} ${d.ks[0].k === BACKDO ? '바로 앞' : STEPS[d.ks[0].k] + '칸 뒤'}`
      : `${who} 말이 ${grp} 뒤에 붙어 있어요`;
    return `${head} — ${ga(kindList(d.ks))} 나오면 ${c > 1 ? c + '개가 한꺼번에 ' : ''}잡혀요 (약 ${pctOf(d.p)}%)`;
  }
  function chanceText(c, names) {
    return `${ga(kindList(c.ks))} 나오면 ${teamName(names, c.team)} 말${c.count > 1 ? ' ' + c.count + '개를 한꺼번에' : '을'} 잡아요 (약 ${pctOf(c.p)}%)`;
  }

  // ── 흐름 기록: 한 판 동안 일어난 사건을 쌓아 둠 (화면이 행동마다 flowPush) ──
  //   log = 사건들 (최근 120개) · snap[팀] = 그 팀의 차례가 끝났을 때 팀별 남은 칸 (지난 차례와 견주기)
  function newFlow() { return { log: [], snap: [] }; }
  function flowPush(flow, S, events) {
    if (!flow || !events) return;
    for (const e of events) {
      flow.log.push(Object.assign({}, e));
      if (e.type === 'turn' && e.prev != null) flow.snap[e.prev] = remAll(S);
    }
    if (flow.log.length > 120) flow.log.splice(0, flow.log.length - 120);
  }

  // 👀 내 지난 차례 뒤 상대가 한 일 → [{ q, name, text, pri }] (중요한 순, 최대 2팀)
  function oppRead(S, flow, me, T, names, mine) {
    const log = (flow && flow.log) || [], evs = [];
    let i = log.length - 1;
    while (i >= 0 && (log[i].type === 'turn' || log[i].team === me)) i--;      // 이번 차례에 내가 이미 던지고 옮긴 것은 건너뜀
    for (; i >= 0; i--) {
      const e = log[i];
      if (e.type === 'turn') continue;
      if (e.team === me) break;                              // 내 지난 차례(내가 잡은 것 포함)가 나오면 거기까지
      evs.push(e);
    }
    evs.reverse();
    const order = [], by = {};
    for (const e of evs) { if (!by[e.team]) { by[e.team] = []; order.push(e.team); } by[e.team].push(e); }
    const mySrc = srcOf(S, [me]), out = [];
    for (const q of order) {
      const moves = []; let forfeit = false;
      for (const e of by[q]) {
        const last = moves[moves.length - 1];
        if (e.type === 'move') moves.push({ kind: e.kind, from: e.from, to: e.to, path: e.path || [], back: !!e.back, caps: [], stack: null, home: 0 });
        else if (e.type === 'forfeit') forfeit = true;
        else if (!last) continue;
        else if (e.type === 'capture') last.caps.push({ victim: e.victim, n: e.pieces.length });
        else if (e.type === 'stack') last.stack = e;
        else if (e.type === 'home') last.home = e.pieces.length;
      }
      const ph = moves.map(m => {
        const kro = ro(NAMES[m.kind]);
        if (m.caps.length) {
          const my = m.caps.find(c => c.victim === me);
          if (my) return { pri: 100, text: `${kro} ${mine} ${my.n}개를 잡았어요`, suf: ' — ' + (mine === '내 말' ? '내 말은 처음으로, 상대는 한 번 더' : '잡힌 말은 처음으로, 잡은 쪽은 한 번 더') };
          const c = m.caps[0];
          return { pri: 60, text: `${kro} ${teamName(names, c.victim)} 말 ${c.n}개를 잡았어요`, suf: ' — 잡은 쪽은 한 번 더' };
        }
        if (m.home) return { pri: 80, text: `${kro} 말 ${m.home}개를 집에 넣었어요`, suf: ` (남은 말 ${S.pos[q].filter(x => x !== HOME).length}개)` };
        if (m.stack) {
          const e = m.stack, standing = e.pieces.every(i => S.pos[q][i] === e.at);
          let suf = '';
          if (standing) {
            const dk = directKinds(T, mySrc, e.at);
            suf = dk.p >= 0.08 ? ` — 잡으면 크게 이득 (잡을 확률 약 ${pctOf(dk.p)}%)` : ' — 잡으면 크게 이득이지만 지금은 내 말이 멀어요';
          }
          return { pri: 70, text: `${kro} 말 ${e.pieces.length}개를 업었어요`, suf };
        }
        if ((m.from === 5 || m.from === 10) && DIAG_FIRST[m.path[0]]) return { pri: 50, text: `${kro} 모서리에서 지름길로 갔어요`, suf: '' };
        if (m.from === 23 && m.path[0] === 28) return { pri: 50, text: `${kro} 방에서 참먹이 쪽 지름길로 갔어요`, suf: '' };
        if (m.to === 5 || m.to === 10 || m.to === 23) return { pri: 40, text: `${kro} ${Y.NODE_NAME[m.to]}에 섰어요`, suf: ' — 다음엔 지름길로' };
        if (m.back) return { pri: 15, text: '빽도로 한 칸 뒤로 갔어요', suf: '' };
        if (m.from === WAIT) return { pri: 20, text: `${kro} 새 말을 내보냈어요`, suf: '' };
        return { pri: 10, text: `${kro} 말을 ${m.path.length}칸 앞으로 옮겼어요`, suf: '' };
      });
      if (!ph.length && forfeit) ph.push({ pri: 5, text: '움직일 말이 없어 쉬었어요', suf: '' });
      if (!ph.length) continue;
      ph.sort((a, b) => b.pri - a.pri);
      let text = ph[0].text + ph[0].suf;
      if (!ph[0].suf && ph[1] && ph[1].pri >= 30) text += ' · ' + ph[1].text;
      out.push({ q, name: teamName(names, q), text, pri: ph[0].pri });
    }
    out.sort((a, b) => b.pri - a.pri);
    return out.slice(0, 2);
  }

  // 📊 형세 한 줄: "나 1개 났음 · 남은 칸 34 vs 곰돌이팀 41 — 조금 앞서요 · 지난 차례보다 5칸 더 앞서요"
  function raceRead(S, flow, me, names, meL) {
    const rem = remAll(S), others = othersOf(S, me).sort((a, b) => rem[a] - rem[b]);
    const home = t => Y.homeCount(S, t);
    const gap = rem[others[0]] - rem[me];                 // + 이면 내가 앞섬
    const ag = Math.abs(gap);
    const word = ag <= 2 ? '비슷해요' : gap > 0 ? (ag <= 8 ? '조금 앞서요' : '많이 앞서요') : (ag <= 8 ? '조금 뒤져요' : '많이 뒤져요');
    let text = `${meL} ${home(me)}개 났음 · 남은 칸 ${rem[me]} vs ` +
      others.slice(0, 3).map(u => `${teamName(names, u)} ${rem[u]}${home(u) ? ` (${home(u)}개 났음)` : ''}`).join(' · ') + ` — ${word}`;
    const sn = flow && flow.snap && flow.snap[me];
    if (sn && sn.length === S.n) {
      const gapThen = Math.min(...othersOf(S, me).map(u => sn[u])) - sn[me], d = gap - gapThen;
      const n = Math.abs(d);                              // d > 0 이면 내 쪽으로 기움
      if (d >= 3) text += gap > 0 ? ` · 지난 차례보다 ${n}칸 더 앞서요` : ` · 지난 차례보다 ${n}칸 따라잡았어요`;
      else if (d <= -3) text += gap >= 0 ? ` · 지난 차례보다 ${n}칸 따라잡혔어요` : ` · 지난 차례보다 ${n}칸 더 뒤져요`;
    }
    return { text, rem, gap };
  }

  // 내 차례(S.turn)에 보여 줄 읽기 전부 — S 는 던지기 전이든 옮길 때든 상관없음
  //   → { opp: [{q,name,text}], note(상대가 한 일이 없을 때 대신), danger: [{node,pieces,p,ks}] (판에 ! 찍을 내 말, 25% 넘게 위험), threat, chance(내가 잡을 기회), race, rem, gap }
  //   opt.me = 나를 부르는 말 ('나' 기본 · 한 기기 여럿이면 팀 이름)
  function coachRead(S, flow, names, opt) {
    const me = S.turn, meL = (opt && opt.me) || '나', mine = meL === '나' ? '내 말' : meL + ' 말';
    const empty = { opp: [], note: '', danger: [], threat: '', chance: '', race: '', rem: [], gap: 0 };
    if (!S || S.phase === 'end') return empty;
    const T = tables(S.flatP, S.backdo);
    const opp = oppRead(S, flow, me, T, names, mine);
    const dg = dangersOf(S, T, me), ch = chancesOf(S, T, me), race = raceRead(S, flow, me, names, meL);
    let note = '';
    if (!opp.length) {
      const oth = othersOf(S, me);
      const onBoard = oth.reduce((a, u) => a + S.pos[u].filter(x => x !== WAIT && x !== HOME).length, 0);
      note = S.turnNo === 0 ? '아직 상대가 둔 수가 없어요' : `상대는 판 위 ${onBoard}개 · 집에 든 말 ${oth.reduce((a, u) => a + Y.homeCount(S, u), 0)}개예요`;
    }
    return {
      opp, note,
      danger: dg.filter(d => d.p >= 0.25),
      threat: dg.length && dg[0].p >= 0.1 ? threatText(dg[0], names, mine) : '',
      chance: ch.length && ch[0].p >= 0.1 ? chanceText(ch[0], names) : '',
      race: race.text, rem: race.rem, gap: race.gap,
    };
  }

  // 👉 수의 의미: 이 수가 위험·기회와 어떻게 이어지는지 (잡기 · 집 · 업기 · 위협 피하기 · 남는 위험 · 지름길 · 쫓기 · 내보내기)
  function describe(s, a, names) {
    const t = s.turn, { kind, piece } = Y.decode(a);
    const T = tables(s.flatP, s.backdo);
    const from = s.pos[t][piece];
    const { state: s2, events } = Y.step(s, a);
    const mv = events.find(e => e.type === 'move');
    const dest = mv ? mv.to : -1;
    const kro = ro(NAMES[kind]);
    const D0 = dangersOf(s, T, t), D2 = dangersOf(s2, T, t);
    const at = (D, node) => D.find(d => d.node === node);
    const why = [];                                              // [우선순위(작을수록 먼저), 글]
    const cap = events.filter(e => e.type === 'capture');
    if (cap.length) {
      const n = cap.reduce((x, e) => x + e.pieces.length, 0);
      const who = cap.map(e => teamName(names, e.victim)).join('·');
      const drop = (D0[0] ? D0[0].p : 0) - (D2[0] ? D2[0].p : 0);
      why.push([1, `잡을 수 있는 자리 — ${who} 말 ${n}개를 보내고 한 번 더 던져요${drop >= 0.2 ? ' · 나를 쫓던 말도 사라져요' : ''}`]);
    }
    if (dest === HOME) why.push([2, mv.pieces.length > 1 ? `업힌 말 ${mv.pieces.length}개가 한꺼번에 나가요` : '말 하나가 집에 들어가요']);
    if (events.some(e => e.type === 'stack') && !cap.length) {
      const d = at(D2, dest);
      why.push([3, '내 말을 업어서 같이 가요' + (d && d.p >= 0.25 ? ` (잡히면 ${d.pieces.length}개가 한꺼번에 돌아가요 — 위험 약 ${pctOf(d.p)}%)` : d ? '' : ' (상대가 잡기 어려운 자리예요)')]);
    }
    // 위협 피하기: 쫓기던 말을 움직여 위험이 확 줄 때
    if (from > 0 && from < HOME && dest !== from) {
      const d0 = at(D0, from), d2 = at(D2, dest);
      const p0 = d0 ? d0.p : 0, p2 = d2 ? d2.p : 0;
      if (p0 >= 0.2 && p2 <= p0 - 0.1) {
        const who = whoNames(d0.ks, names);
        const head = d0.ks.length === 1 && d0.ks[0].k !== BACKDO ? `${STEPS[d0.ks[0].k]}칸 뒤 ${eul(who)} 피해` : `뒤쫓는 ${eul(who)} 피해`;
        why.push([4, `${head} 쫓기는 말을 ${kro} 빼요 (위험 ${pctOf(p0)}% → ${pctOf(p2)}%)`]);
      }
    }
    // 남는 위험: 움직이지 않은 내 말이 여전히 크게 위험하면
    const left = D2.filter(d => d.node !== dest && d.p >= 0.25)[0];
    if (left && !cap.length) why.push([5, `대신 남는 ${left.pieces.length > 1 ? '업은 ' : ''}말이 ${whoNames(left.ks, names)}에게 잡힐 위험 ${pctOf(left.p)}%`]);
    if (!cap.length && dest !== HOME && Y.NODE_NAME[dest] && dest !== 20 && dest !== 15) why.push([6, `${Y.NODE_NAME[dest]}에 서서 다음에 지름길로 가요`]);
    // 쫓기: 옮긴 뒤 상대 말을 바로 뒤에서 노릴 수 있으면
    if (dest > 0 && dest < HOME && !cap.length) {
      const src = [[dest, t]];
      let best = null;
      for (const u of othersOf(s2, t)) {
        const seen = new Set();
        for (let j = 0; j < s2.k; j++) {
          const X = s2.pos[u][j];
          if (X === WAIT || X === HOME || seen.has(X)) continue;
          seen.add(X);
          const dk = directKinds(T, src, X);
          if (dk.p >= 0.25 && (!best || dk.p > best.p)) best = { u, p: dk.p, k: dk.ks[0].k, list: kindList(dk.ks) };
        }
      }
      if (best) why.push([7, `${teamName(names, best.u)} 말을 ${best.k === BACKDO ? '바로 앞' : STEPS[best.k] + '칸 뒤'}에서 쫓아요 — ${ga(best.list)} 나오면 잡아요 (약 ${pctOf(best.p)}%)`]);
    }
    if (from === WAIT) why.push([8, '새 말을 내보내요']);
    if (kind === BACKDO) why.push([9, '빽도는 한 칸 뒤로 가요']);
    if (dest > 0 && dest < HOME && !cap.length && !left) {
      const d = at(D2, dest);
      if ((!d || d.p < 0.12) && !why.some(w => w[0] === 4)) why.push([10, '상대가 잡기 어려운 자리예요']);       // 위협을 피했다고 이미 말했으면 되풀이 안 함
    }
    why.sort((x, y) => x[0] - y[0]);
    const txt = why.map(w => w[1]);
    if (!txt.length) txt.push(dest === 20 ? '참먹이까지 와서 다음엔 나가요' : '집에 가장 가까워지는 수예요');
    return { a, kind, piece, from, dest, path: mv ? mv.path : [], reason: (txt[1] && (txt[0] + txt[1]).length <= 58 ? txt[0] + ' · ' + txt[1] : txt[0]) };      // 까닭은 짧게 (폰): 두 번째는 합쳐서 짧을 때만
  }
  function suggest(s, names) {
    if (s.phase === 'throw') return { throw: true, reason: s.extra > 1 ? `한 번 더 던질 수 있어요 (${s.extra}번)` : '윷을 던질 차례예요' };
    if (s.phase !== 'move') return null;
    const a = choose(s, 'hard', { seed: 1 });
    return describe(s, a, names);
  }

  return { choose, evaluate, tables, suggest, describe, newFlow, flowPush, coachRead };
});

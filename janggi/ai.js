/* 장기 AI (ai.js) — 우리 엔진: 반복 심화 알파베타(PVS) · 치환표 · 정지 탐색(잡는 수) · 수 순서(MVV-LVA·킬러·히스토리) · 널 무브(=한수 쉼) · LMR · 칸 값 표
   Node·브라우저·워커 공용 (브라우저 전역 JanggiAI, 워커는 importScripts('core.js','ai.js'))
     JanggiAI.think({ rules, moves, fen }, { tier: 'easy'|'normal'|'hard', seed, timeMs, nodes, explain, hint }) → { move, score, mate, depth, nodes, ms, pv, why }
     JanggiAI.explain(game, uci, res) → { kind, text } 한 줄 까닭 (AI 선생님)
     JanggiAI.perft(game, depth) → 수 생성 검사 */
(function (root, factory) {
  const core = typeof module === 'object' && module && module.exports ? require('./core.js') : root.JanggiCore;
  const m = factory(core);
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.JanggiAI = m;
})(typeof self !== 'undefined' ? self : this, function (J) {
  'use strict';
  const L = J.lo, { RAYS, ZL, ZH, ZSL, ZSH, genPseudo, attacked } = L;
  const K = 1, A = 2, E = 3, H = 4, R = 5, C = 6, P = 7, CHO = 0, HAN = 1;
  const MATE = 30000, PW = 20000, INF = 32000;
  const PV = [0, 0, 300, 300, 500, 1300, 700, 200];      // 탐색용 기물 값 (점수 × 100)
  const VALP = J.VAL;                                    // 점수 (차13 …)
  const rowOf = s => (s / 9) | 0, colOf = s => s % 9;

  // ── 칸 값 표 (초 기준, r = 0 이 상대 끝줄). 한은 위아래를 뒤집어 씀 ──
  const PSTF = {
    [P]: (r, f) => { const adv = Math.max(0, Math.min(6, 6 - r)); let v = [0, 8, 18, 30, 44, 52, 28][adv]; if (r <= 2 && f >= 3 && f <= 5) v += 26; if (f === 4) v += 6; else if (f === 0 || f === 8) v -= 6; return v; },
    [H]: (r, f) => { let v = 12 - 4 * Math.abs(f - 4) + (r >= 2 && r <= 7 ? 8 : 0); if (r === 9) v -= 14; if (f === 0 || f === 8) v -= 8; return v; },
    [E]: (r, f) => 6 - 2 * Math.abs(f - 4) + (r === 9 ? -8 : 0) + (r >= 4 && r <= 7 ? 5 : 0),
    [R]: (r, f) => (r <= 3 ? 14 : 0) + (r <= 2 && f >= 3 && f <= 5 ? 12 : 0) + (f === 4 ? 6 : 0) + (r === 9 && (f === 0 || f === 8) ? -10 : 0) + (r >= 4 && r <= 6 ? 4 : 0),
    [C]: (r, f) => (f >= 3 && f <= 5 ? 6 : 0) + (r === 7 ? 4 : 0) + (r <= 2 && f >= 3 && f <= 5 ? 10 : 0) + (r === 8 && f === 4 ? 6 : 0),
    [A]: (r, f) => ({ '8,4': 12, '8,3': 6, '8,5': 6, '9,3': 4, '9,5': 4, '9,4': 2 }[r + ',' + f] || -6),
    [K]: (r, f) => ({ '8,4': 12, '9,4': 6, '8,3': 4, '8,5': 4, '9,3': 0, '9,5': 0, '7,4': -8 }[r + ',' + f] ?? -10),
  };
  const PST = new Int16Array(16 * 90);
  for (let t = 1; t <= 7; t++) for (let s = 0; s < 90; s++) {
    const r = rowOf(s), f = colOf(s);
    PST[(t) * 90 + s] = PSTF[t](r, f);                    // 초
    PST[(t | 8) * 90 + s] = PSTF[t](9 - r, f);            // 한 (위아래 뒤집음)
  }
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const key52 = (lo, hi) => (hi & 0xfffff) * 4294967296 + (lo >>> 0);

  // ════════ 탐색용 판 ════════
  const PASS = 1 << 14;
  class Pos {
    constructor(s) {
      this.b = s.b.slice(); this.side = s.turn; this.rules = s.rules; this.passes = s.passes; this.bik = s.bik;
      this.mat = [0, 0]; this.pst = [0, 0]; this.nc = [0, 0]; this.cnt = 0; this.ks = [L.kingSq(this.b, CHO), L.kingSq(this.b, HAN)];
      let lo = this.side ? ZSL : 0, hi = this.side ? ZSH : 0;
      for (let q = 0; q < 90; q++) { const p = this.b[q]; if (!p) continue; const sd = p >> 3; lo ^= ZL[p * 90 + q]; hi ^= ZH[p * 90 + q]; this.mat[sd] += PV[p & 7]; this.pst[sd] += PST[p * 90 + q]; this.cnt++; if ((p & 7) === C) this.nc[sd]++; }
      this.lo = lo; this.hi = hi;
      this.keys = s.keys.slice(); this.irr = [0];        // 같은 국면 세기 (잡은 뒤로는 같을 수 없음)
      this.st = [];
    }
    key() { return key52(this.lo, this.hi); }
    inCheck(side) { const k = this.ks[side]; return k >= 0 && attacked(this.b, k, side ^ 1); }
    make(m) {
      const b = this.b, f = m >> 7, t = m & 127, p = b[f], cap = b[t], sd = this.side;
      this.st.push(m, cap, this.passes, this.bik ? 1 : 0, this.lo, this.hi);
      this.lo ^= ZL[p * 90 + f] ^ ZL[p * 90 + t] ^ ZSL; this.hi ^= ZH[p * 90 + f] ^ ZH[p * 90 + t] ^ ZSH;
      this.pst[sd] += PST[p * 90 + t] - PST[p * 90 + f];
      if (cap) { const o = sd ^ 1; this.lo ^= ZL[cap * 90 + t]; this.hi ^= ZH[cap * 90 + t]; this.mat[o] -= PV[cap & 7]; this.pst[o] -= PST[cap * 90 + t]; this.cnt--; if ((cap & 7) === C) this.nc[o]--; }
      b[t] = p; b[f] = 0; if ((p & 7) === K) this.ks[sd] = t;
      this.side = sd ^ 1; this.passes = 0;
      this.keys.push(this.key()); this.irr.push(cap ? this.keys.length - 1 : this.irr[this.irr.length - 1]);
    }
    unmake() {
      const st = this.st, hi = st.pop(), lo = st.pop(), bik = st.pop(), passes = st.pop(), cap = st.pop(), m = st.pop();
      const b = this.b, f = m >> 7, t = m & 127, p = b[t], sd = this.side ^ 1;
      b[f] = p; b[t] = cap; if ((p & 7) === K) this.ks[sd] = f;
      this.pst[sd] -= PST[p * 90 + t] - PST[p * 90 + f];
      if (cap) { const o = sd ^ 1; this.mat[o] += PV[cap & 7]; this.pst[o] += PST[cap * 90 + t]; this.cnt++; if ((cap & 7) === C) this.nc[o]++; }
      this.side = sd; this.passes = passes; this.bik = !!bik; this.lo = lo; this.hi = hi;
      this.keys.pop(); this.irr.pop();
    }
    makePass() {
      this.st.push(PASS, 0, this.passes, this.bik ? 1 : 0, this.lo, this.hi);
      this.lo ^= ZSL; this.hi ^= ZSH; this.side ^= 1; this.passes++;
      this.keys.push(this.key()); this.irr.push(this.irr[this.irr.length - 1]);
    }
    unmakePass() {
      const st = this.st, hi = st.pop(), lo = st.pop(), bik = st.pop(), passes = st.pop(); st.pop(); st.pop();
      this.side ^= 1; this.passes = passes; this.bik = !!bik; this.lo = lo; this.hi = hi; this.keys.pop(); this.irr.pop();
    }
    facing() {
      const kc = this.ks[0], kh = this.ks[1];
      if (kc < 0 || kh < 0 || kc % 9 !== kh % 9) return false;
      for (let q = kh + 9; q < kc; q += 9) if (this.b[q]) return false;
      return true;
    }
    reps() { const k = this.keys[this.keys.length - 1], from = this.irr[this.irr.length - 1]; let n = 0; for (let i = this.keys.length - 1; i >= from; i--) if (this.keys[i] === k) n++; return n; }
    points(side) { let a = 0, b = 0; for (let q = 0; q < 90; q++) { const p = this.b[q]; if (!p) continue; if ((p >> 3) === CHO) a += VALP[p & 7]; else b += VALP[p & 7]; } const ch = a > b + J.DEOM ? 1 : -1; return side === CHO ? ch : -ch; }
    evaluate() {
      const T = this.cnt;
      const cadj = T < 28 ? -Math.min(250, (28 - T) * 12) : 0;   // 기물이 줄면 포는 넘을 다리가 없어 약해짐
      const sc = this.mat[0] + this.pst[0] - this.mat[1] - this.pst[1] + (this.nc[0] - this.nc[1]) * cadj;
      return (this.side === CHO ? sc : -sc) + 12;
    }
  }

  // ── 치환표 ──
  const TT_BITS = 18, TT_N = 1 << TT_BITS, TT_MASK = TT_N - 1;
  let ttLo = null, ttHi, ttMove, ttScore, ttDepth, ttFlag;
  function ttInit() {
    if (!ttLo) { ttLo = new Int32Array(TT_N); ttHi = new Int32Array(TT_N); ttMove = new Int32Array(TT_N); ttScore = new Int32Array(TT_N); ttDepth = new Int8Array(TT_N); ttFlag = new Int8Array(TT_N); }
    ttFlag.fill(0);
  }
  const killers = new Int32Array(256 * 2), hist = new Int32Array(2 * 128 * 128);
  const MAXPLY = 64;
  const pvT = new Int32Array(MAXPLY * MAXPLY), pvL = new Int32Array(MAXPLY);

  class Search {
    constructor(pos, o) { this.pos = pos; this.nodes = 0; this.stop = false; this.t0 = Date.now(); this.timeMs = o.timeMs || 1e9; this.maxNodes = o.nodes || 1e12; this.rootBest = 0; this.rootScore = 0; this.bufs = []; for (let i = 0; i < MAXPLY + 8; i++) this.bufs.push({ m: [], s: [] }); }
    tick() { if ((++this.nodes & 1023) === 0 && (Date.now() - this.t0 > this.timeMs)) this.stop = true; if (this.nodes >= this.maxNodes) this.stop = true; }
    // 둔 뒤 끝나는 판인가 (빅장 · 같은 국면 세 번) → 방금 둔 쪽 기준 값, 아니면 null
    terminalAfter(ply) {
      const pos = this.pos, mover = pos.side ^ 1;
      if (pos.rules.bik !== 'off') {
        const fc = pos.facing();
        if (pos.bik && fc) return pos.rules.bik === 'draw' ? 0 : pos.points(mover) * (PW - ply);
        pos.bik = fc;
      }
      if (pos.reps() >= 3) return pos.points(mover) * (PW - ply);
      return null;
    }
    order(ms, sc, n, ttm, ply) {
      const b = this.pos.b, k0 = killers[ply * 2], k1 = killers[ply * 2 + 1], sd = this.pos.side;
      for (let i = 0; i < n; i++) {
        const m = ms[i], cap = b[m & 127];
        if (m === ttm) sc[i] = 1e7;
        else if (cap) sc[i] = 1e6 + PV[cap & 7] * 10 - (PV[b[m >> 7] & 7] / 10 | 0);
        else if (m === k0) sc[i] = 9e5;
        else if (m === k1) sc[i] = 8e5;
        else sc[i] = hist[sd * 16384 + (m >> 7) * 128 + (m & 127)];
      }
    }
    pick(ms, sc, i, n) { let bi = i, bs = sc[i]; for (let j = i + 1; j < n; j++) if (sc[j] > bs) { bs = sc[j]; bi = j; } if (bi !== i) { let t = ms[i]; ms[i] = ms[bi]; ms[bi] = t; t = sc[i]; sc[i] = sc[bi]; sc[bi] = t; } return ms[i]; }
    search(depth, alpha, beta, ply, pvNode) {
      const pos = this.pos;
      pvL[ply] = ply;
      this.tick(); if (this.stop) return 0;
      if (ply >= MAXPLY - 2) return pos.evaluate();
      const side = pos.side, inChk = pos.inCheck(side);
      if (inChk && ply < 40) depth++;
      if (depth <= 0) return this.qs(alpha, beta, ply, 0);
      // 치환표
      const ti = pos.lo & TT_MASK;
      let ttm = 0;
      if (ttFlag[ti] && ttLo[ti] === pos.lo && ttHi[ti] === pos.hi) {
        ttm = ttMove[ti];
        if (!pvNode && ttDepth[ti] >= depth && ply > 0) {
          let v = ttScore[ti]; if (v > MATE - 500) v -= ply; else if (v < -MATE + 500) v += ply;
          const fl = ttFlag[ti];
          if (fl === 1 || (fl === 2 && v >= beta) || (fl === 3 && v <= alpha)) return v;
        }
      }
      // 널 무브 = 한수 쉼 (장기는 쉬는 수가 있어서 쓸 만함)
      if (!pvNode && !inChk && depth >= 3 && ply > 0 && pos.passes === 0 && !pos.bik && pos.mat[side] - 200 * 5 > 600 && pos.evaluate() >= beta) {
        pos.makePass();
        const v = -this.search(depth - 3, -beta, -beta + 1, ply + 1, false);
        pos.unmakePass();
        if (this.stop) return 0;
        if (v >= beta && v < PW - 500) return beta;
      }
      const buf = this.bufs[ply], ms = buf.m; ms.length = 0;
      genPseudo(pos.b, side, ms, false);
      const n = ms.length, sc = buf.s; sc.length = n;
      this.order(ms, sc, n, ttm, ply);
      let best = -INF, bestM = 0, legal = 0, a0 = alpha;
      for (let i = 0; i < n; i++) {
        const m = this.pick(ms, sc, i, n), cap = pos.b[m & 127];
        pos.make(m);
        if (pos.inCheck(side)) { pos.unmake(); continue; }
        legal++;
        let v = this.terminalAfter(ply + 1);
        if (v === null) {
          if (legal === 1) v = -this.search(depth - 1, -beta, -alpha, ply + 1, pvNode);
          else {
            let red = 0;
            if (depth >= 3 && legal > 4 && !cap && !inChk && !pos.inCheck(pos.side)) red = legal > 12 ? 2 : 1;
            v = -this.search(depth - 1 - red, -alpha - 1, -alpha, ply + 1, false);
            if (v > alpha && red) v = -this.search(depth - 1, -alpha - 1, -alpha, ply + 1, false);
            if (v > alpha && v < beta) v = -this.search(depth - 1, -beta, -alpha, ply + 1, pvNode);
          }
        }
        pos.unmake();
        if (this.stop) return 0;
        if (v > best) {
          best = v; bestM = m;
          if (ply === 0) { this.rootBest = m; this.rootScore = v; }
          if (v > alpha) {
            alpha = v;
            pvT[ply * MAXPLY + ply] = m; for (let j = ply + 1; j < pvL[ply + 1]; j++) pvT[ply * MAXPLY + j] = pvT[(ply + 1) * MAXPLY + j]; pvL[ply] = pvL[ply + 1];
            if (v >= beta) {
              if (!cap) { if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; } hist[side * 16384 + (m >> 7) * 128 + (m & 127)] += depth * depth; }
              break;
            }
          }
        }
      }
      // 한수 쉼 (규칙이 허락하면 · 둘 곳이 없으면 늘)
      if (best < beta && !inChk && (pos.rules.pass || legal === 0)) {
        const opp = pos.passes > 0;                    // 상대가 방금 쉬었으면 나도 쉬는 순간 점수로 끝
        pos.makePass();
        let v;
        if (opp) v = pos.points(side) * (PW - ply - 1);
        else { v = this.terminalAfter(ply + 1); if (v === null) v = -this.search(depth - 1, -beta, -alpha, ply + 1, false); }
        pos.unmakePass();
        if (this.stop) return 0;
        if (v > best) { best = v; bestM = PASS; if (ply === 0) { this.rootBest = PASS; this.rootScore = v; } if (v > alpha) { alpha = v; pvT[ply * MAXPLY + ply] = PASS; pvL[ply] = ply + 1; } }
        legal++;
      }
      if (!legal) return inChk ? -MATE + ply : 0;
      // 저장
      let sv = best; if (sv > MATE - 500) sv += ply; else if (sv < -MATE + 500) sv -= ply;
      ttLo[ti] = pos.lo; ttHi[ti] = pos.hi; ttMove[ti] = bestM === PASS ? 0 : bestM; ttScore[ti] = sv; ttDepth[ti] = depth;
      ttFlag[ti] = best >= beta ? 2 : best > a0 ? 1 : 3;
      return best;
    }
    // 정지 탐색: 잡는 수만 (장군 받는 중이면 모든 피하는 수)
    qs(alpha, beta, ply, qd) {
      const pos = this.pos;
      this.tick(); if (this.stop) return 0;
      pvL[ply] = ply;
      const side = pos.side, inChk = qd < 4 && pos.inCheck(side);
      if (ply >= MAXPLY - 2) return pos.evaluate();
      if (!inChk) { const sp = pos.evaluate(); if (sp >= beta) return sp; if (sp > alpha) alpha = sp; }
      const buf = this.bufs[ply], ms = buf.m; ms.length = 0;
      genPseudo(pos.b, side, ms, !inChk);
      const n = ms.length, sc = buf.s; sc.length = n;
      this.order(ms, sc, n, 0, ply);
      let best = inChk ? -INF : alpha, legal = 0;
      for (let i = 0; i < n; i++) {
        const m = this.pick(ms, sc, i, n);
        pos.make(m);
        if (pos.inCheck(side)) { pos.unmake(); continue; }
        legal++;
        let v = this.terminalAfter(ply + 1);
        if (v === null) v = -this.qs(-beta, -alpha, ply + 1, qd + 1);
        pos.unmake();
        if (this.stop) return 0;
        if (v > best) { best = v; if (v > alpha) { alpha = v; if (v >= beta) break; } }
      }
      if (inChk && !legal) return -MATE + ply;
      return best;
    }
  }

  // ── 난이도 ──
  const TIERS = {
    easy:   { mode: 'exact', depth: 1, noise: 140, blunder: 0.15 },
    normal: { mode: 'exact', depth: 2, noise: 30, blunder: 0, nodes: 300000 },
    hard:   { mode: 'id', depth: 30, timeMs: 1200, nodes: 3e6 },
  };
  const mateOf = sc => Math.abs(sc) > MATE - 500 ? (sc > 0 ? Math.ceil((MATE - sc) / 2) : -Math.ceil((MATE + sc) / 2)) : 0;
  const uciOf = m => (m === PASS ? 'pass' : J.uciOf(m));
  function stateOf(game) { return J.fromJSON(game || {}); }

  function think(game, o = {}) {
    const t0 = Date.now();
    const s = stateOf(game);
    const cfg = Object.assign({}, TIERS[o.tier] || TIERS.normal, o.cfg || {});
    const Rn = rng(o.seed == null ? 12345 : o.seed);
    if (s.over) return { move: null, score: 0, mate: 0, depth: 0, nodes: 0, ms: 0, pv: [] };
    if (s.phase === 'setup') {
      // 상차림: 초급은 아무거나, 그 밖은 자주 쓰는 마상상마 · 상마마상 위주 (조금씩 바꿔 가며)
      const pref = o.tier === 'easy' ? [0, 1, 2, 3] : [2, 2, 3, 3, 0, 1];
      const id = o.hint ? 2 : pref[Math.floor(Rn() * pref.length)];
      const r = { move: (s.turn === HAN ? 'h=' : 'c=') + id, score: 0, mate: 0, depth: 0, nodes: 0, pv: [], setup: id };
      return finish(r);
    }
    const legal = J.lo.genLegal(s.b, s.turn);
    const canPass = !s.check && (s.rules.pass || !legal.length);
    if (!legal.length) return finish({ move: canPass ? 'pass' : null, score: 0, mate: 0, depth: 0, nodes: 0, pv: canPass ? ['pass'] : [] });
    ttInit(); killers.fill(0); hist.fill(0);
    if (legal.length === 1 && !canPass && !o.hint && !o.explain) return finish({ move: uciOf(legal[0]), score: 0, mate: 0, depth: 0, nodes: 0, pv: [uciOf(legal[0])] });
    const pos = new Pos(s);
    const S = new Search(pos, { timeMs: o.timeMs != null ? o.timeMs : cfg.timeMs, nodes: o.nodes != null ? o.nodes : cfg.nodes });
    let res;
    if (cfg.mode === 'exact') {
      // 첫 수마다 값을 내고 난이도만큼 흔들어 고름 (초급 · 중급)
      const depth = o.depth || cfg.depth, list = [];
      const roots = legal.slice(); if (canPass) roots.push(PASS);
      for (const m of roots) {
        let v;
        if (m === PASS) { const opp = pos.passes > 0; pos.makePass(); v = opp ? pos.points(pos.side ^ 1) * PW : S.terminalAfter(1); if (v === null) v = -S.search(depth - 1, -INF, INF, 1, true); pos.unmakePass(); v -= 30; }
        else { pos.make(m); v = S.terminalAfter(1); if (v === null) v = -S.search(depth - 1, -INF, INF, 1, true); pos.unmake(); }
        if (S.stop) break;
        list.push({ m, sc: v });
      }
      if (!list.length) list.push({ m: legal[0], sc: 0 });
      for (const x of list) x.v = x.sc + (cfg.noise && Math.abs(x.sc) < PW - 500 ? (Rn() + Rn() + Rn() - 1.5) * cfg.noise : 0);
      list.sort((a, b) => b.v - a.v);
      let pick = list[0];
      if (cfg.blunder && Rn() < cfg.blunder) { const q = list.filter(x => x.m !== PASS); pick = q[Math.floor(Rn() * q.length)] || pick; }
      res = { move: uciOf(pick.m), score: pick.sc, mate: mateOf(pick.sc), depth, nodes: S.nodes, pv: [uciOf(pick.m)] };
    } else {
      // 반복 심화 (고급 · 선생님)
      let bestM = legal[0], bestS = 0, done = 0, pv = [];
      for (let d = 1; d <= (o.depth || cfg.depth); d++) {
        let a = -INF, bt = INF;
        if (d >= 4 && Math.abs(bestS) < PW - 500) { a = bestS - 60; bt = bestS + 60; }
        let sc = S.search(d, a, bt, 0, true);
        if (!S.stop && (sc <= a || sc >= bt)) sc = S.search(d, -INF, INF, 0, true);
        if (S.stop) { if (S.rootBest && d > 1) { bestM = S.rootBest; bestS = S.rootScore; } break; }
        bestM = S.rootBest || bestM; bestS = sc; done = d;
        pv = []; for (let j = 0; j < pvL[0]; j++) pv.push(uciOf(pvT[j]));
        if (Math.abs(sc) > MATE - 500 && MATE - Math.abs(sc) <= d) break;     // 외길 외통을 찾음
        const lim = o.timeMs != null ? o.timeMs : cfg.timeMs;
        if (lim && lim < 1e9 && Date.now() - S.t0 > lim * 0.5) break;          // 다음 깊이는 못 끝낼 듯
      }
      if (!pv.length || pv[0] !== uciOf(bestM)) pv = [uciOf(bestM)];
      res = { move: uciOf(bestM), score: bestS, mate: mateOf(bestS), depth: done, nodes: S.nodes, pv };
    }
    return finish(res);
    function finish(r) {
      r.ms = Date.now() - t0;
      if (o.explain && r.move) { try { r.why = explain(game, r.move, r); } catch (e) { r.why = null; } }
      return r;
    }
  }

  // ════════ AI 선생님: 왜 이 수인지 한 줄 ════════
  const JOSA = { 궁: 1, 상: 1, 졸: 1, 병: 1 };
  const nm = (t, side) => J.pieceName(t, side);
  const iga = n => n + (JOSA[n] ? '이' : '가');
  const eul = n => n + (JOSA[n] ? '을' : '를');
  const ro = n => n + (JOSA[n] && n !== '졸' ? '으로' : '로');
  const wa = n => n + (JOSA[n] ? '과' : '와');
  // 이 편 기물 중 공짜로(또는 손해 보고) 잡힐 것: [자리, 종류]
  function hanging(b, side) {
    const out = [];
    for (let q = 0; q < 90; q++) {
      const p = b[q]; if (!p || (p >> 3) !== side || (p & 7) === K) continue;
      const atk = L.attackers(b, q, side ^ 1); if (!atk.length) continue;
      const lowest = Math.min(...atk.map(x => VALP[b[x] & 7]));
      const save = b[q]; b[q] = J.mk(P, side ^ 1);         // 내가 다시 잡을 수 있나 (잡힌 자리에 상대 기물이 있다고 보고)
      const def = L.attackers(b, q, side).filter(x => x !== q).length;
      b[q] = save;
      if (!def || lowest < VALP[p & 7]) out.push([q, p & 7]);
    }
    return out;
  }
  function explain(game, uci, res) {
    const s = stateOf(game), me = s.turn, op = me ^ 1;
    if (s.phase === 'setup') { const id = +uci.slice(2); return { kind: 'setup', text: `${J.SETUPS[id].name}: ${J.SETUPS[id].desc}` }; }
    if (res && res.mate > 0) return { kind: 'mate', text: res.mate === 1 ? '외통! 이 수로 이겨요' : `${res.mate}수 안에 외통을 만들 수 있어요` };
    if (uci === 'pass') return { kind: 'pass', text: '한수 쉼 — 지금은 섣불리 움직이지 않는 게 나아요' };
    const m = J.parseMove(uci), f = m >> 7, t = m & 127, b = s.b, piece = b[f] & 7, cap = b[t] & 7;
    const wasCheck = s.check;
    const hangBefore = hanging(b, me);
    const after = J.fastClone(s); J.step(after, uci);
    const b2 = after.b;
    if (after.over && after.reason === 'mate') return { kind: 'mate', text: '외통! 이 수로 이겨요' };
    const gives = after.check;
    const safeAfter = !L.attacked(b2, t, op);
    if (wasCheck) {
      if (cap && L.attackers(b, L.kingSq(b, me), op).includes(t)) return { kind: 'evade', text: `장군 피하기 — 장군을 건 ${eul(nm(cap, op))} 잡아요` };
      if (piece === K) return { kind: 'evade', text: '장군 피하기 — 궁을 안전한 곳으로 옮겨요' };
      return { kind: 'evade', text: `장군 피하기 — ${ro(nm(piece, me))} 막아요 (멍군)${gives ? ' · 거기다 장군까지!' : ''}` };
    }
    if (cap) {
      if (safeAfter) return { kind: 'free', text: `${iga(nm(cap, op))} 공짜로 잡혀요` };
      if (VALP[cap] > VALP[piece]) return { kind: 'trade', text: `${ro(nm(piece, me))} ${eul(nm(cap, op))} 잡는 이득 보는 교환이에요` };
      if (VALP[cap] === VALP[piece] && piece !== K) return { kind: 'trade', text: `${wa(nm(piece, me))} ${eul(nm(cap, op))} 맞바꿔요` };
    }
    if (gives) return { kind: 'check', text: `장군! ${ro(nm(piece, me))} 상대 궁을 몰아요` };
    if (after.last && after.last.bik) return { kind: 'bik', text: s.rules.bik === 'draw' ? '빅장! 상대가 풀지 못하면 비겨요' : '빅장! 상대가 풀지 못하면 점수로 끝나요 (지금 점수를 봐요)' };
    const was = hangBefore.find(([q]) => q === f);
    if (was && safeAfter) return { kind: 'escape', text: `${iga(nm(piece, me))} 잡힐 뻔해서 피해요` };
    const hangAfter = hanging(b2, me);
    const saved = hangBefore.filter(([q]) => q !== f && !hangAfter.some(([x]) => x === q));
    if (saved.length) { const [, tp] = saved.sort((x, y) => VALP[y[1]] - VALP[x[1]])[0]; return { kind: 'defend', text: `${eul(nm(tp, me))} 지켜요 — 그냥 두면 잡혀요` }; }
    // 다음 수에 노리는 것
    const targets = [];
    for (let q = 0; q < 90; q++) { const p = b2[q]; if (!p || (p >> 3) !== op || (p & 7) === K) continue; if (L.attackers(b2, q, me).includes(t) && !L.attackers(b, q, me).includes(f)) targets.push(p & 7); }
    targets.sort((x, y) => VALP[y] - VALP[x]);
    if (targets.length && safeAfter && VALP[targets[0]] >= 3) return { kind: 'threat', text: `다음에 상대 ${eul(nm(targets[0], op))} 노려요` };
    if (piece === P && rowOf(t) !== rowOf(f)) return { kind: 'push', text: `${iga(nm(piece, me))} 앞으로 나가 자리를 넓혀요` };
    if (piece === R || piece === H || piece === E || piece === C) return { kind: 'develop', text: `${ro(nm(piece, me))} 좋은 자리를 잡아요` };
    return { kind: 'plain', text: '형세를 차분히 다져요' };
  }

  function perft(game, depth) {
    const s = stateOf(game), pos = new Pos(s);
    const go = d => {
      if (d === 0) return 1;
      const ms = genPseudo(pos.b, pos.side, [], false), sd = pos.side; let n = 0;
      for (const m of ms) { pos.make(m); if (!pos.inCheck(sd)) n += go(d - 1); pos.unmake(); }
      return n;
    };
    return go(depth);
  }

  return { think, explain, perft, hanging, TIERS, MATE, PW, PASS, _Pos: Pos };
});

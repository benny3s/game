/* 베니 서바이벌 · 균형의 만칼라 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 5일차 메인 매치 (7명)
   · 게임판 = 14칸 고리: 악마칸(맨 위) → 01~06 → 천사칸(맨 아래) → 07~12 → 악마칸 (시계 방향). 01 부터 빨강 · 파랑 · 초록이 번갈아
   · 각자 말 4개. 순서대로 1개씩 놓음 (한 칸에 최대 2개)
   · 차례: 내 말이 있는 칸 하나의 말을 '전부' 집어 다음 칸부터 시계 방향으로 1개씩 놓음 (어느 말을 어디 놓을지는 옮기는 사람이 정함)
   · 마지막으로 놓은 말의 주인이 그 칸의 말 수만큼 그 칸 색 점수를 얻음.
     천사칸 = 그 주인의 가장 적은 색 · 악마칸 = 가장 많은 색 (동률이면 옮기는 사람이 색을 고름)
   · 누군가 한 색에서 30점 이상이 되면 즉시 끝. 최종 점수 = 가장 적은 색 − (가장 많은 색 − 가장 적은 색)
   방송과 다른 점: 3~7명 (빈 자리는 AI) · 순서는 무작위 한 줄 (방송은 추첨) · 12바퀴(인원 × 12 차례)가 지나도 안 끝나면 그때 끝 ·
     최종 점수가 같으면 공동 순위 · 피스 · 페널티 · 상금 미션은 없음
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 장면에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).mancala = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NC = 14, DEV = 0, ANG = 7, GOAL = 30, MAXLAP = 12;
  const COLS = ["빨강", "파랑", "초록"];
  // 칸 → 색 (0 빨강 · 1 파랑 · 2 초록 · -1 악마 · -2 천사), 칸 이름 (방송 번호)
  const colOf = i => (i === DEV ? -1 : i === ANG ? -2 : ((i < ANG ? i : i - 1) - 1) % 3);
  const labelOf = i => (i === DEV ? "악마" : i === ANG ? "천사" : String(i < ANG ? i : i - 1).padStart(2, "0"));
  const OPTS = { laps: [12, 6] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 300) st.log.shift(); }

  // 최종 점수
  const fin = sc => { const lo = Math.min(...sc), hi = Math.max(...sc); return lo - (hi - lo); };
  // 천사 · 악마칸에서 점수를 받을 수 있는 색들 (가장 적은 / 많은 색)
  const tiedCols = (sc, kind) => { const v = kind === -2 ? Math.min(...sc) : Math.max(...sc); return [0, 1, 2].filter(c => sc[c] === v); };

  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(2, Math.min(7, n | 0 || 7));
    const o = optsOf(cfg), f = Math.floor(mix(seed, 3) * n) % n;
    const order = Array.from({ length: n }, (_, i) => (f + i) % n);
    const st = { n, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, order, cells: Array.from({ length: NC }, () => []),
      sc: Array.from({ length: n }, () => [0, 0, 0]), phase: "place", pi: 0, ti: 0, turn: 0, maxT: n * o.laps,
      last: null, hist: [], log: [], seq: 0, over: false, res: null, end: "" };
    push(st, { k: "start", order: order.slice() });
    return st;
  }
  const needs = st => (st.over ? [] : st.phase === "place" ? [st.order[st.pi % st.n]] : [st.order[st.ti]]);
  const over = st => !!st.over;
  const pieces = (st, s) => { let k = 0; for (const c of st.cells) for (const o of c) if (o === s) k++; return k; };
  // 옮기기 결과 (상태를 안 바꿈): 도착 칸 · 주인 · 점수 · 받을 수 있는 색
  function preview(cells, sc, from, seq) {
    const k = seq.length, land = (from + k) % NC, owner = seq[k - 1];
    let cnt = 0;
    for (let j = 0; j < k; j++) if ((from + 1 + j) % NC === land) cnt++;
    cnt += land === from ? 0 : cells[land].length;
    const col = colOf(land), opts = col >= 0 ? [col] : tiedCols(sc[owner], col);
    return { land, owner, pts: cnt, col, opts };
  }
  const sameBag = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "place") {
      if (a.t !== "place") return { ok: false, err: "말을 놓을 칸을 골라요" };
      const c = a.c;
      if (!Number.isInteger(c) || c < 0 || c >= NC) return { ok: false, err: "없는 칸이에요" };
      if (st.cells[c].length >= 2) return { ok: false, err: "한 칸에는 2개까지만 놓아요" };
      st.cells[c].push(seat);
      push(st, { k: "place", s: seat, c });
      st.pi++;
      if (st.pi >= st.n * 4) { st.phase = "move"; st.ti = 0; push(st, { k: "go" }); }
      return { ok: true };
    }
    if (a.t !== "move") return { ok: false, err: "옮길 칸을 골라요" };
    const from = a.from;
    if (!Number.isInteger(from) || from < 0 || from >= NC || !st.cells[from].includes(seat)) return { ok: false, err: "내 말이 있는 칸에서만 옮겨요" };
    const seq = Array.isArray(a.seq) ? a.seq : null;
    if (!seq || !seq.every(Number.isInteger) || !sameBag(seq, st.cells[from])) return { ok: false, err: "그 칸의 말을 전부, 한 번씩 놓아요" };
    const P = preview(st.cells, st.sc, from, seq);
    let col = P.opts[0];
    if (P.opts.length > 1 && a.col !== undefined) { if (!P.opts.includes(a.col)) return { ok: false, err: "그 색은 고를 수 없어요" }; col = a.col; }
    // 옮기기
    st.cells[from] = [];
    const path = [];
    for (let j = 0; j < seq.length; j++) { const c = (from + 1 + j) % NC; st.cells[c].push(seq[j]); path.push(c); }
    st.sc[P.owner][col] += P.pts;
    st.turn++;
    st.last = { s: seat, from, seq: seq.slice(), path, land: P.land, owner: P.owner, pts: P.pts, col, kind: P.col, tie: P.opts.length > 1, turn: st.turn };
    st.hist.push(JSON.parse(JSON.stringify(st.last)));
    push(st, { k: "move", s: seat, from, seq: seq.slice(), land: P.land, owner: P.owner, pts: P.pts, col });
    if (st.sc[P.owner][col] >= GOAL) return finish(st, "goal");
    if (st.turn >= st.maxT) return finish(st, "laps");
    st.ti = (st.ti + 1) % st.n;
    return { ok: true };
  }
  function finish(st, why) {
    st.over = true; st.phase = "end"; st.end = why;
    const f = st.sc.map(fin);
    st.res = { fin: f, why, by: st.last ? st.last.owner : -1 };
    push(st, { k: "end", why, fin: f.slice() });
    return { ok: true };
  }
  const auto = () => null;
  const advance = () => {};
  function ranks(st) { const f = st.sc.map(fin); return f.map(x => f.filter(y => y > x).length); }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "place") { const o = []; for (let c = 0; c < NC; c++) if (st.cells[c].length < 2) o.push({ t: "place", c }); return o; }
    const o = [];
    for (let c = 0; c < NC; c++) if (st.cells[c].includes(seat)) {
      for (const sq of arrangements(st.cells[c], 24)) {
        const P = preview(st.cells, st.sc, c, sq);
        for (const col of P.opts) o.push(P.opts.length > 1 ? { t: "move", from: c, seq: sq, col } : { t: "move", from: c, seq: sq });
      }
    }
    return o;
  }
  // 서로 다른 놓는 순서 (같은 주인 말은 같음), 많으면 cap 개까지
  function arrangements(bag, cap) {
    const cnt = {}; for (const o of bag) cnt[o] = (cnt[o] || 0) + 1;
    const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b), out = [], cur = [];
    (function rec() {
      if (out.length >= cap) return;
      if (cur.length === bag.length) { out.push(cur.slice()); return; }
      for (const k of keys) if (cnt[k]) { cnt[k]--; cur.push(k); rec(); cur.pop(); cnt[k]++; }
    })();
    return out;
  }

  // ── 보이는 것: 모두 공개 (숨긴 정보 없음) ──
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1;
    const pubObj = { c: st.cells, s: st.sc, p: st.phase, pi: st.pi, ti: st.ti, t: st.turn };
    return {
      n: st.n, opt: Object.assign({}, st.opt), order: st.order.slice(), cells: st.cells.map(c => c.slice()), sc: st.sc.map(x => x.slice()),
      fin: st.sc.map(fin), phase: st.phase, pi: st.pi, ti: st.ti, turn: st.turn, maxT: st.maxT, cur: needs(st)[0] ?? -1,
      last: st.last ? JSON.parse(JSON.stringify(st.last)) : null, hist: st.hist.map(h => JSON.parse(JSON.stringify(h))),
      needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      left: st.phase === "place" ? st.n * 4 - st.pi : 0, mine: me >= 0 ? pieces(st, me) : 0,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)).toString(36),
    };
  }

  // ── AI ──
  // 가벼운 상태 (AI 시뮬레이션용)
  const simOf = V => ({ n: V.n, order: V.order, cells: V.cells.map(c => c.slice()), sc: V.sc.map(x => x.slice()), ti: V.ti, turn: V.turn, maxT: V.maxT, over: false });
  function simMove(S, s, from, seq, col) {
    const P = preview(S.cells, S.sc, from, seq);
    const c0 = col !== undefined && P.opts.includes(col) ? col : P.opts[0];
    S.cells[from] = [];
    for (let j = 0; j < seq.length; j++) S.cells[(from + 1 + j) % NC].push(seq[j]);
    S.sc[P.owner][c0] += P.pts; S.turn++;
    if (S.sc[P.owner][c0] >= GOAL || S.turn >= S.maxT) S.over = true;
    S.ti = (S.ti + 1) % S.n;
    return P;
  }
  // 내 판단 값: 남들과의 최종 점수 차 (끝났으면 순위 그대로)
  function evalFor(S, me, P) {
    const f = S.sc.map(fin), m = f[me];
    let v = 0;
    for (let o = 0; o < S.n; o++) if (o !== me) {
      if (S.over) v += m > f[o] ? 1 : m === f[o] ? 0.5 : 0;
      else v += 1 / (1 + Math.exp(-(m - f[o]) / P.temp));
    }
    v /= S.n - 1;
    if (S.over) return v;
    // 30점에 가까운 색은 위험 (내가 끝을 못 고름), 가장 낮은 색을 채울 여지
    const hi = Math.max(...S.sc[me]);
    return v + (hi >= 24 && fin(S.sc[me]) < Math.max(...f) ? -0.04 * (hi - 23) : 0);
  }
  // 후보 수: 칸마다 '마지막 말 주인'별로 몇 가지 순서
  function candidates(S, s, R, wide) {
    const out = [];
    for (let c = 0; c < NC; c++) {
      if (!S.cells[c].includes(s)) continue;
      const bag = S.cells[c], owners = [...new Set(bag)];
      for (const last of owners) {
        const rest = bag.slice(); rest.splice(rest.indexOf(last), 1);
        const seqs = [];
        // ① 내 말을 앞쪽에 · ② 내 말을 뒤쪽에 · ③ 남의 말을 악마칸 앞으로 · 그리고 무작위 몇 개
        const mineF = rest.filter(o => o === s).concat(rest.filter(o => o !== s));
        seqs.push(mineF.concat([last]));
        seqs.push(rest.filter(o => o !== s).concat(rest.filter(o => o === s), [last]));
        if (wide) for (let r = 0; r < wide; r++) { const x = rest.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t; } seqs.push(x.concat([last])); }
        const seen = new Set();
        for (const sq of seqs) { const key = sq.join(); if (seen.has(key)) continue; seen.add(key); out.push({ from: c, seq: sq }); }
      }
    }
    return out;
  }
  // 욕심쟁이 한 수 (자기 최종 점수 변화가 가장 큰 수) — 미리 보기 속 상대 모형
  function greedyMove(S, s) {
    let best = null, bv = -1e9;
    const f0 = fin(S.sc[s]);
    for (const m of candidates(S, s, null, 0)) {
      const P = preview(S.cells, S.sc, m.from, m.seq);
      let v;
      if (P.owner === s) { let b = -1e9; for (const c of P.opts) { const x = S.sc[s].slice(); x[c] += P.pts; b = Math.max(b, fin(x)); } v = b - f0; }
      else v = 0.3 * P.pts * (P.col === -1 ? 1 : 0) + 0.01 * P.pts;   // 남에게 악마칸을 먹이면 조금 좋아함
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  // 한 수를 둔 뒤 다음 사람들이 욕심쟁이로 depth 번 두었을 때의 값
  function scoreMove(V, s, m, P, R) {
    if (P.sims) {                                          // 몬테카를로: 다음 내 차례까지 상대는 욕심쟁이(가끔 아무 수), 내 다음 수까지 두고 평가
      let tot = 0, pv0 = null;
      const NS = Math.max(8, Math.min(P.sims, Math.round(P.sims * 4.5 / V.n)));      // 인원이 많을수록 한 번이 비싸니 굴림을 줄임 (이 PC 에서 ai() 150ms 안)
      for (let k = 0; k < NS; k++) {
        const S = simOf(V); pv0 = simMove(S, s, m.from, m.seq, m.col);
        for (let d = 0; d < S.n - 1 && !S.over; d++) {
          const who = S.order[S.ti];
          let g;
          if (R() < P.eps) { const C = candidates(S, who, null, 0); g = C[Math.floor(R() * C.length)]; } else g = greedyMove(S, who);
          if (!g) break;
          simMove(S, who, g.from, g.seq);
        }
        if (P.next && !S.over) { const g = greedyMove(S, s); if (g) simMove(S, s, g.from, g.seq); }
        tot += evalFor(S, s, P);
      }
      return { v: tot / NS, pv: pv0 };
    }
    const S = simOf(V);
    const pv = simMove(S, s, m.from, m.seq, m.col);
    for (let d = 0; d < P.depth && !S.over; d++) {
      const who = S.order[S.ti];
      const g = greedyMove(S, who); if (!g) break;
      simMove(S, who, g.from, g.seq);
    }
    return { v: evalFor(S, s, P), pv };
  }
  const PROF = {
    easy: { wide: 0, depth: 0, rand: 0.45, temp: 4 },
    normal: { wide: 1, depth: 0, rand: 0.1, temp: 4 },
    hard: { wide: 3, depth: 0, rand: 0, temp: 4, sims: 16, eps: 0.5, next: 1 },   // 다음 내 차례까지 16번 굴려 봄 (상대는 반은 욕심쟁이 · 반은 아무 수)
  };
  const keyV = (V, s) => hash(JSON.stringify([V.cells, V.sc, V.turn, V.pi, s]));
  function rows(V, s, P, R) {
    const S = simOf(V), C = candidates(S, s, R, P.wide), out = [];
    for (const m of C) {
      const pv = preview(V.cells, V.sc, m.from, m.seq);
      // 동률 색 고르기: 내 점수면 내게 좋은 색 (보통 같음), 남이면 첫 색
      const cols = pv.opts.length > 1 ? pv.opts : [undefined];
      for (const col of cols) {
        const mm = col === undefined ? m : Object.assign({}, m, { col });
        const r = scoreMove(V, s, mm, Object.assign({}, P, { depth: Math.min(P.depth, V.n - 1) }), seeded(keyV(V, s) ^ 0x5bd1e995));   // 후보마다 같은 난수 (공정한 비교)
        out.push(Object.assign({ v: r.v, pv }, mm));
        if (col !== undefined && pv.owner !== s) break;
      }
    }
    out.sort((a, b) => b.v - a.v || a.from - b.from);
    return out;
  }
  // 놓기: 내 말이 흩어지게 · 악마칸 바로 앞(12)은 피하고 · 천사칸 쪽 길을 좋아함 (고급은 씨앗으로 같은 값 고르기)
  function placeRows(V, s) {
    const out = [];
    for (let c = 0; c < NC; c++) {
      if (V.cells[c].length >= 2) continue;
      const mineHere = V.cells[c].filter(o => o === s).length, mineAll = V.cells.reduce((k, x) => k + x.filter(o => o === s).length, 0);
      let v = 0;
      v -= mineHere * 2;                                  // 같은 칸에 몰면 고를 수 있는 칸이 줄어요
      const k = V.cells[c].length + 1;                    // 지금 놓으면 이 칸의 말 수
      const land = (c + k) % NC;
      if (land === ANG) v += 1.2; if (land === DEV) v -= 0.6;
      if (colOf(land) >= 0) v += 0.4;
      if (c === DEV || c === ANG) v += 0.3;               // 특수 칸의 말은 나중에 옮겨 둘 수 있어요
      v += 0.05 * (mineAll ? 0 : 1);
      out.push({ c, v });
    }
    out.sort((a, b) => b.v - a.v || a.c - b.c);
    return out;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const seed = keyV(V, s), R = P === PROF.hard || typeof rnd !== "function" ? seeded(seed) : rnd;
    if (V.phase === "place") {
      const pr = placeRows(V, s);
      if (P.rand && R() < P.rand) return { t: "place", c: pr[Math.floor(R() * pr.length)].c };
      const top = pr.filter(x => x.v >= pr[0].v - 1e-9);
      return { t: "place", c: top[Math.floor(R() * top.length)].c };
    }
    if (P.rand && R() < P.rand) {
      const C = candidates(simOf(V), s, R, 0), m = C[Math.floor(R() * C.length)];
      return { t: "move", from: m.from, seq: m.seq };
    }
    const r = rows(V, s, P, R)[0];
    const a = { t: "move", from: r.from, seq: r.seq };
    if (r.col !== undefined) a.col = r.col;
    return a;
  }
  function ai(V, s, tier, rnd) { return aiWith(V, s, PROF[tier] || PROF.normal, rnd); }
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, R = seeded(keyV(V, s));
    if (V.phase === "place") { const pr = placeRows(V, s); const a = aiWith(V, s, P); return { a, rows: pr }; }
    const rs = rows(V, s, P, R), r = rs[0];
    const a = { t: "move", from: r.from, seq: r.seq }; if (r.col !== undefined) a.col = r.col;
    return { a, rows: rs };
  }
  // 복기: 같은 자리에서 내 수와 고급 수를 같은 방식으로 평가
  function judge(V, s, myA, bestA) {
    if (!V || V.over || V.phase !== "move" || !myA || !bestA || myA.t !== "move" || bestA.t !== "move") return null;
    const P = Object.assign({}, PROF.hard, { depth: Math.min(PROF.hard.depth, V.n - 1) });
    const one = a => scoreMove(V, s, { from: a.from, seq: a.seq, col: a.col }, P, seeded(keyV(V, s) ^ 0x5bd1e995));
    const m = one(myA), b = one(bestA);
    return { my: m, best: b };
  }

  return {
    id: "mancala", NC, DEV, ANG, GOAL, COLS, OPTS, PROF, colOf, labelOf, fin, tiedCols, optsOf, preview, arrangements,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, placeRows,
  };
});

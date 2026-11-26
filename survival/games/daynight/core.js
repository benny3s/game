/* 베니 서바이벌 · 낮과 밤 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌 2 · 8일차 메인 매치 (8명). 나무위키 피의 게임2/8일차 문서(룰 14가지 · 14라운드 진행표 · 최종 점수)를 읽고 우리 말로 옮김.
   · 12칸 시계. 1~6 = 낮 (시침이 어디 있는지 모두에게 보임), 7~12 = 밤 (시침 위치 비공개). 시작은 1.
   · 각자 코인 20개 (교환 · 양도 · 파기 불가). 시작 전에 낮 구간(1~6) 하나 · 밤 구간(7~12) 하나를 비밀로 무작위로 받음 (시침이 두 바퀴 돌 때마다 모두 다시 뽑음). 구간은 겹칠 수 있음.
   · 라운드: 모두 코인을 원하는 만큼 비밀로 냄 → 가장 많이 낸 수만큼 시침이 한 칸씩 움직임 · 나머지는 소멸 → 시침이 선 칸의 주인이 점수 (낮 구간 1점 · 밤 구간 2점) → 점수는 이름 없이 알파벳으로 공개.
   · 먼저 10점 이상이 되면 끝.
   움직이는 칸 수: 원문 8번 문장 ('한 칸 이상 움직이려면 코인이 필요') 이 모호해서 14라운드 진행표 (최다 제출 코인 · 시침 위치) 로 확인 — 12라운드가 '최다 제출 = 움직인 칸 수' 와 맞고, 아무도 안 낸 라운드는 모두 1칸 (5 · 6 · 12라운드),
   13칸(= 12 + 1) · 19칸 같은 한 바퀴 넘는 이동도 같은 식. 그래서 이동 = max(1, 최다 제출 코인). (3라운드 하나만 표와 안 맞는데 문서 쪽 기록 오류로 봄.)
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 4~8명 (방송 8명). 코인 구매 · 개인자금 · 30분 회의 · 협상 · 연합 없음.
     ② 시침이 밤에 있을 때: 몇 칸 갔는지도 비공개 (코인은 모두 비밀로 내니 낮에 들어올 때만 위치가 보임).
     ③ 구간은 각자 낮 1 · 밤 1 (독립 추첨, 겹칠 수 있음). 시침이 24칸 움직일 때마다 다시 추첨 — 점수는 다시 뽑기 전 구간으로 계산.
     ④ 알파벳은 처음에 무작위로 나눠 각자 자기 것만 알고, 끝나면 공개. 라운드마다 알파벳별 득점과 합계가 공개.
     ⑤ 동시에 10점이 넘으면 점수가 더 높은 쪽 · 같으면 공동 1위. 30라운드까지 아무도 10점이 안 되면 그때 가장 높은 점수. 코인이 없어도 '0 내기' 를 눌러야 함 (코인 수가 안 보이게).
   숨은 정보: 남의 코인 · 구간 · 제출 · (밤엔) 시침 위치. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).daynight = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COINS = 20, GOAL = 10, CELLS = 12, LAP2 = 24, CAP = 30, LET = "ABCDEFGH";
  const isDay = c => c >= 1 && c <= 6;
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const wrap = c => ((c - 1) % CELLS + CELLS) % CELLS + 1;
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 400) st.log.shift(); }

  function init({ n, seed, cfg }) {
    cfg = cfg || {}; n = Math.max(4, Math.min(8, n | 0 || 6));
    const rs = (seed >>> 0) || 1, R = seeded(hash(`let|${rs}`));
    const perm = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const st = { n, rs, cfg: Object.assign({}, cfg), letter: perm, pos: 1, moved: 0, lap: 0, round: 0, phase: "bid", coins: Array(n).fill(COINS), zones: [], zhist: [], score: Array(n).fill(0),
      bid: Array(n).fill(null), res: null, hist: [], log: [], seq: 0, over: false, end: "" };
    draw(st);
    startRound(st);
    return st;
  }
  function draw(st) {
    const R = seeded(hash(`zone|${st.rs}|${st.lap}`));
    st.zones = Array.from({ length: st.n }, () => [1 + Math.floor(R() * 6), 7 + Math.floor(R() * 6)]);
    st.zhist.push({ from: st.round + 1, zones: clone(st.zones) });
  }
  function startRound(st) { st.round++; st.bid = Array(st.n).fill(null); st.phase = "bid"; st.res = null; push(st, { k: "round", r: st.round }); }
  const needs = st => (st.over || st.phase !== "bid" ? [] : st.bid.map((x, s) => (x === null ? s : -1)).filter(s => s >= 0));
  const over = st => !!st.over;
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    if (!a || a.t !== "bid" || !Number.isInteger(a.c)) return { ok: false, err: "코인을 몇 개 낼지 정해요" };
    if (a.c < 0 || a.c > st.coins[seat]) return { ok: false, err: `0~${st.coins[seat]}개만 낼 수 있어요` };
    st.bid[seat] = a.c;
    if (st.bid.every(x => x !== null)) resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const top = Math.max(...st.bid), move = Math.max(1, top), from = st.pos;
    for (let s = 0; s < st.n; s++) st.coins[s] -= st.bid[s];
    st.pos = wrap(st.pos + move); st.moved += move;
    const gain = Array(st.n).fill(0);
    for (let s = 0; s < st.n; s++) { const z = st.zones[s]; if (z[0] === st.pos) gain[s] += 1; if (z[1] === st.pos) gain[s] += 2; st.score[s] += gain[s]; }
    // 공개: 알파벳별 득점 · 합계 (누가 누구인지는 비공개)
    const byLetter = Array(st.n).fill(0), totLetter = Array(st.n).fill(0);
    for (let s = 0; s < st.n; s++) { byLetter[st.letter[s]] = gain[s]; totLetter[st.letter[s]] = st.score[s]; }
    const redraw = Math.floor(st.moved / LAP2) > st.lap;
    st.res = { r: st.round, top, move, from, pos: st.pos, gain: gain.slice(), bids: st.bid.slice() };
    st.hist.push({ r: st.round, pos: st.pos, vis: isDay(st.pos) ? st.pos : null, byLetter, totLetter, redraw });
    push(st, { k: "result", r: st.round, vis: isDay(st.pos) ? st.pos : null, night: !isDay(st.pos), byLetter: byLetter.slice(), totLetter: totLetter.slice(), redraw });
    st.phase = "show";
    if (redraw) st.pend = true;
    const mx = Math.max(...st.score);
    if (mx >= GOAL) { st.won = true; }
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 6000 : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    if (st.won) return finish(st, "goal");
    if (st.round >= CAP) return finish(st, "cap");
    if (st.pend) { st.pend = false; st.lap = Math.floor(st.moved / LAP2); draw(st); }
    startRound(st);
  }
  function finish(st, why) { st.over = true; st.phase = "end"; st.end = why; push(st, { k: "end", why, letters: st.letter.slice(), score: st.score.slice() }); }
  const ranks = st => st.score.map(x => st.score.filter(y => y > x).length);
  function legal(st, seat) { if (!needs(st).includes(seat)) return []; const o = []; for (let c = 0; c <= st.coins[seat]; c++) o.push({ t: "bid", c }); return o; }
  const zoneAt = (st, seat, r) => { let z = st.zhist[0].zones[seat]; for (const h of st.zhist) if (h.from <= r) z = h.zones[seat]; return z; };
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all";
    const reveal = st.over || isAll;
    const pubObj = { r: st.round, p: st.phase, b: st.bid.map(x => x !== null), h: st.hist.map(h => [h.vis, h.byLetter, h.redraw]), o: st.over };
    const V = {
      n: st.n, round: st.round, cap: CAP, goal: GOAL, phase: st.phase, seat: me, myLetter: me >= 0 ? LET[st.letter[me]] : null, coins: me >= 0 ? st.coins[me] : null,
      zone: me >= 0 ? st.zones[me].slice() : null,
      zones: me >= 0 ? st.zhist.map(h => ({ from: h.from, z: h.zones[me].slice() })) : [],
      vis: st.hist.length ? st.hist[st.hist.length - 1].vis : 1, visRound: st.hist.length ? st.hist[st.hist.length - 1].r : 0,
      subbed: st.bid.map(x => x !== null), myBid: me >= 0 ? st.bid[me] : null,
      hist: st.hist.map(h => ({ r: h.r, vis: h.vis, byLetter: h.byLetter.slice(), totLetter: h.totLetter.slice(), redraw: h.redraw })),
      tot: st.hist.length ? st.hist[st.hist.length - 1].totLetter.slice() : Array(st.n).fill(0),
      myGain: me >= 0 && st.res ? st.res.gain[me] : null,
      needs: needs(st), over: st.over, end: st.end, ranks: st.over ? ranks(st) : Array(st.n).fill(0), log: st.log.map(e => clone(e)), pub: hash(JSON.stringify(pubObj)).toString(36),
    };
    // 점수는 알파벳으로만 공개 — 내 점수는 내 알파벳 칸 · 남의 점수는 이름 없이
    V.score = V.tot.slice();
    if (me >= 0) V.myScore = st.score[me];
    if (reveal) { V.letters = st.letter.map(x => LET[x]); V.finalScore = st.score.slice(); V.score = st.score.slice(); }
    if (me < 0 && !reveal) V.myScore = null;
    if (isAll) { V.allZones = clone(st.zones); V.allCoins = st.coins.slice(); V.pos = st.pos; V.bids = st.bid.slice(); }
    return V;
  }
  const letterOf = (V, s) => (V.letters ? V.letters[s] : null);

  // ── AI: 시침 위치 믿음 (공개된 낮 위치 · 내 득점 · 내 구간으로) ──
  // 한 라운드에 시침이 움직이는 칸 수의 사전 분포 (1칸이 가장 흔함)
  function kernel(n) {
    const K = Array(CELLS).fill(0); let tot = 0;
    for (let m = 1; m <= 24; m++) { const p = m === 1 ? 0.36 : 0.64 * Math.pow(0.86, m - 2) * (1 - 0.86) / (1 - Math.pow(0.86, 23)); K[m % CELLS] += p; tot += p; }
    return K.map(x => x / tot);
  }
  const myPts = (z, cell) => (z[0] === cell ? 1 : 0) + (z[1] === cell ? 2 : 0);
  function belief(V) {
    const K = kernel(V.n); let b = Array(CELLS + 1).fill(0); b[1] = 1;
    const zAt = r => { let z = V.zones[0] ? V.zones[0].z : [0, 0]; for (const h of V.zones) if (h.from <= r) z = h.z; return z; };
    const L = V.myLetter ? LET.indexOf(V.myLetter) : -1;
    for (const h of V.hist) {
      const nb = Array(CELLS + 1).fill(0);
      for (let c = 1; c <= CELLS; c++) if (b[c] > 0) for (let d = 0; d < CELLS; d++) if (K[d] > 0) nb[wrap(c + d)] += b[c] * K[d];
      if (h.vis != null) { b = Array(CELLS + 1).fill(0); b[h.vis] = 1; continue; }
      // 밤: 7~12 만 남기고, 내 득점으로 거름
      const z = zAt(h.r), g = L >= 0 ? h.byLetter[L] : null;
      let tot = 0;
      for (let c = 1; c <= CELLS; c++) { if (isDay(c)) nb[c] = 0; else if (g != null && myPts(z, c) !== g) nb[c] = 0; tot += nb[c]; }
      if (tot <= 0) { for (let c = 7; c <= CELLS; c++) { nb[c] = 1; tot += 1; } }
      b = nb.map(x => x / tot);
    }
    return b;
  }
  const PROF = { easy: { hold: 0.5, cost: 0, noise: 0 }, normal: { cost: 0.07, noise: 4 }, hard: { cost: 0.07, noise: 0 } };
  // 내가 x 코인을 냈을 때 (남이 낸 최대 T 분포) 의 기대 점수
  function topDist(V) {
    // 남들의 최대 제출: 많은 사람이 0 (코인 아낌), 일부가 목표 칸 거리만큼 — n 이 클수록 큰 값이 나옴
    const m = V.n - 1, pz = 0.45, out = []; let tot = 0;
    for (let t = 0; t <= 20; t++) {
      const cdfAt = k => { let p = pz; for (let u = 1; u <= Math.min(k, 12); u++) p += (1 - pz) / 12; if (k >= 12) p = 1; return Math.min(1, p); };
      const p = Math.pow(cdfAt(t), m) - (t ? Math.pow(cdfAt(t - 1), m) : 0);
      out.push(Math.max(0, p)); tot += Math.max(0, p);
    }
    return out.map(p => p / tot);
  }
  function evalBids(V, P) {
    const b = belief(V), z = V.zone, T = topDist(V), rows = [], coins = V.coins;
    const roundsLeft = Math.max(1, V.cap - V.round), cost = P.cost * Math.max(0.5, Math.min(2, 8 / Math.max(2, roundsLeft / 3)));
    for (let x = 0; x <= Math.min(coins, 24); x++) {
      let u = 0;
      for (let t = 0; t < T.length; t++) { if (!T[t]) continue; const mv = Math.max(1, x, t); let e = 0; for (let c = 1; c <= CELLS; c++) if (b[c] > 0) e += b[c] * myPts(z, wrap(c + mv)); u += T[t] * e; }
      rows.push({ x, u, net: u - cost * x, win: T.reduce((a, p, t) => a + (t <= x ? p : 0), 0) });
    }
    return { rows, b, T, cost };
  }
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.hist.length, V.coins, V.zone, V.vis]));
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (V.coins <= 0) return { t: "bid", c: 0 };
    if (P === PROF.easy) { const c = R() < 0.5 ? 0 : Math.min(V.coins, 1 + Math.floor(R() * 9)); return { t: "bid", c }; }
    const E = evalBids(V, P);
    let bi = 0, bv = -1e9;
    for (const r of E.rows) { const v = r.net + (P.noise ? (R() - 0.5) * P.noise * 0.6 : 0); if (v > bv + 1e-9) { bv = v; bi = r.x; } }
    return { t: "bid", c: bi };
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const E = evalBids(V, PROF.hard), a = ai(V, s, "hard"), row = E.rows[a.c];
    const cells = []; for (let c = 1; c <= CELLS; c++) if (E.b[c] > 0.04) cells.push([c, E.b[c]]);
    return { a, row, none: E.rows[0], cells, cost: E.cost, T: E.T };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA) return null;
    const E = evalBids(V, PROF.hard), r = E.rows;
    return { my: r[Math.min(myA.c, r.length - 1)], best: r[Math.min(bestA.c, r.length - 1)] };
  }

  return { id: "daynight", COINS, GOAL, CELLS, CAP, LET, isDay, wrap, myPts, kernel, belief, topDist, evalBids, PROF, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, letterOf, zoneAt };
});

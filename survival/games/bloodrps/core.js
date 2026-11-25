/* 베니 서바이벌 · 배틀 가위바위보 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌1 · 배틀 가위바위보 (팀전 → 우리는 1:1)
   · 준비물: 사람마다 9장 = 가위 2 · 바위 2 · 보 2 + 빅토리 1 + 체인지 1 + 빈 카드(여러 번)
   · 5라운드. 매 라운드 가위바위보 카드 1장 + 특수 카드 1장(빅토리 / 체인지 / 빈 카드)을 동시에 숨겨 내고 한꺼번에 공개
   · 빅토리: 가위바위보와 상관없이 이김 (1회). 체인지: 서로의 가위바위보 카드를 맞바꿈, 상대가 빅토리면 체인지가 이김 (1회).
     빈 카드: 빅토리 · 체인지를 안 낼 때. 같은 특수 카드를 양쪽이 내면 효과는 모두 사라지고 가위바위보로만.
   · 쓴 가위바위보 · 빅토리 · 체인지는 다시 못 씀 (가위바위보 6장 중 5장을 씀). 쓴 카드는 공개.
   방송과 다른 점 (우리가 정함): ① 승점 = 이기면 2 · 비기면 1 · 지면 0 (원문에 점수 기준이 없음) ② 팀 5명 → 혼자 대 상대 1명
     ③ 5라운드 뒤 승점이 높은 쪽이 이기고 같으면 공동 1등 ④ 한 기기로는 못 함 (동시에 숨겨 냄), 2명 고정 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).bloodrps = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 5, WINP = 2, DRAWP = 1;
  const RPS = ["가위", "바위", "보"], SPN = { V: "빅토리", C: "체인지", B: "빈 카드" };
  const SPS = ["V", "C", "B"];
  const beats = (a, b) => (a - b + 3) % 3 === 1;      // 바위(1) > 가위(0) · 보(2) > 바위(1) · 가위(0) > 보(2)

  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 한 라운드 판정: c0 · c1 = { r: 0~2, s: 'V' | 'C' | 'B' } → { w: 이긴 자리 | -1, how, swap }
  //   how: rps(가위바위보) · V(빅토리) · C>V(체인지가 빅토리를 이김) · C(체인지로 맞바꾼 뒤 가위바위보) · void(같은 특수 카드, 효과 없음)
  function judge(c0, c1) {
    const s0 = c0.s, s1 = c1.s;
    let w = -1, how = "rps", swap = false;
    if (s0 === s1) how = s0 === "B" ? "rps" : "void";
    else if (s0 === "V" || s1 === "V") {
      const v = s0 === "V" ? 0 : 1, o = v === 0 ? s1 : s0;
      if (o === "B") { w = v; how = "V"; } else { w = 1 - v; how = "C>V"; }
    } else { swap = true; how = "C"; }
    if (w < 0) {
      const a = swap ? c1.r : c0.r, b = swap ? c0.r : c1.r;
      w = beats(a, b) ? 0 : beats(b, a) ? 1 : -1;
    }
    return { w, how, swap };
  }

  // ── 값 계산용 표 (손에 남은 카드 → 번호) ────────────────────
  // 한쪽 손 = 가위·바위·보 남은 장수(0~2) 셋 + 빅토리 남음 + 체인지 남음 → 0~107
  const IDX = (l0, l1, l2, fv, fc) => (((l0 * 3 + l1) * 3 + l2) * 2 + fv) * 2 + fc;
  const ACT = [], OUT = [];
  (function build() {
    for (let l0 = 0; l0 < 3; l0++) for (let l1 = 0; l1 < 3; l1++) for (let l2 = 0; l2 < 3; l2++) for (let fv = 0; fv < 2; fv++) for (let fc = 0; fc < 2; fc++) {
      const L = [l0, l1, l2], tot = l0 + l1 + l2, acts = [], ss = [];
      if (fv) ss.push("V"); if (fc) ss.push("C"); ss.push("B");
      if (tot > 1) for (let r = 0; r < 3; r++) if (L[r]) for (const s of ss) { // 6장 중 5장만 쓰므로 1장 남으면 끝난 판
        const L2 = L.slice(); L2[r]--;
        acts.push({ r, s, code: r * 3 + SPS.indexOf(s), nxt: IDX(L2[0], L2[1], L2[2], s === "V" ? 0 : fv, s === "C" ? 0 : fc), w: (L[r] / tot) / ss.length });
      }
      ACT[IDX(l0, l1, l2, fv, fc)] = acts;
    }
    for (let a = 0; a < 9; a++) {
      OUT[a] = [];
      for (let b = 0; b < 9; b++) { const j = judge({ r: (a / 3) | 0, s: SPS[a % 3] }, { r: (b / 3) | 0, s: SPS[b % 3] }); OUT[a][b] = j.w === 0 ? WINP : j.w === 1 ? -WINP : 0; }
    }
  })();
  const idxOf = (left, sp) => IDX(left[0], left[1], left[2], sp.V ? 1 : 0, sp.C ? 1 : 0);
  // 남은 판을 끝까지 두었을 때 내가 이길 확률 (나는 최선, 상대는 남은 카드를 고르게 낸다고 봄). d = 내 승점 − 상대 승점
  const MEMO = new Float64Array(108 * 108 * 21).fill(-1);
  function val(i0, i1, d) {
    const A = ACT[i0];
    if (!A.length) return d > 0 ? 1 : d === 0 ? 0.5 : 0;
    const key = (i0 * 108 + i1) * 21 + d + 10;
    const m = MEMO[key]; if (m >= 0) return m;
    const B = ACT[i1];
    let best = -1;
    for (const a of A) { let e = 0; for (const b of B) e += b.w * val(a.nxt, b.nxt, d + OUT[a.code][b.code]); if (e > best) best = e; }
    return (MEMO[key] = best);
  }
  // 이번 라운드 표: 내가 a 를 내고 상대가 b 를 냈을 때 남은 판까지 본 내 승률
  function matrix(V, me) {
    const A = ACT[idxOf(V.left[me], V.sp[me])], B = ACT[idxOf(V.left[1 - me], V.sp[1 - me])], d = V.pts[me] - V.pts[1 - me];
    return { A, B, M: A.map(a => B.map(b => val(a.nxt, b.nxt, d + OUT[a.code][b.code]))) };
  }
  // 영합 게임의 섞는 전략 (가상 놀이 — 한 줄 N 번 서로에게 최선 응수)
  function solveGame(M, iters) {
    const n = M.length, m = M[0].length, cr = Array(n).fill(0), rs = Array(n).fill(0), cs = Array(m).fill(0);
    let i = 0, j = 0;
    for (let t = 0; t < (iters || 300); t++) {
      cr[i]++; for (let c = 0; c < m; c++) cs[c] += M[i][c];
      let bj = 0; for (let c = 1; c < m; c++) if (cs[c] < cs[bj]) bj = c; j = bj;
      for (let r = 0; r < n; r++) rs[r] += M[r][j];
      let bi = 0; for (let r = 1; r < n; r++) if (rs[r] > rs[bi]) bi = r; i = bi;
    }
    const tot = cr.reduce((a, b) => a + b, 0);
    return cr.map(x => x / tot);
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, R: ROUNDS, round: 0, left: [[2, 2, 2], [2, 2, 2]], sp: [{ V: 1, C: 1 }, { V: 1, C: 1 }], sub: [null, null], pts: [0, 0], hist: [], phase: "pick", over: false, res: null, log: [], seq: 0 };
    push(st, { k: "round", r: 1 });
    return st;
  }
  const needs = st => (st.over || st.phase !== "pick" ? [] : [0, 1].filter(s => !st.sub[s]));
  function check(st, seat, a) {
    if (!a || !Number.isInteger(a.r) || a.r < 0 || a.r > 2) return "가위 · 바위 · 보 중에서 골라요";
    if (st.left[seat][a.r] <= 0) return `${RPS[a.r]} 카드는 다 썼어요`;
    if (!SPS.includes(a.s)) return "빅토리 · 체인지 · 빈 카드 중에서 골라요";
    if (a.s !== "B" && !st.sp[seat][a.s]) return `${SPN[a.s]}는 한 번만 쓸 수 있어요`;
    return null;
  }
  function apply(st, seat, a) {
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const err = check(st, seat, a);
    if (err) return { ok: false, err };
    st.sub[seat] = { r: a.r, s: a.s };
    push(st, { k: "lock", s: seat });
    if (!needs(st).length) resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const c = st.sub.map(x => ({ r: x.r, s: x.s })), j = judge(c[0], c[1]);
    const pts = j.w < 0 ? [DRAWP, DRAWP] : j.w === 0 ? [WINP, 0] : [0, WINP];
    for (let s = 0; s < 2; s++) { st.pts[s] += pts[s]; st.left[s][c[s].r]--; if (c[s].s !== "B") st.sp[s][c[s].s] = 0; }
    const rec = { r: st.round + 1, c, w: j.w, how: j.how, swap: j.swap, pts, tot: st.pts.slice() };
    st.hist.push(rec); st.res = rec;
    push(st, { k: "result", r: rec.r, c, w: j.w, how: j.how, swap: j.swap, pts });
    st.sub = [null, null]; st.phase = "show";
  }
  const auto = st => (st.phase === "show" ? 3200 : null);
  function advance(st) {
    if (st.phase !== "show") return;
    if (st.round + 1 >= ROUNDS) { st.over = true; st.phase = "end"; push(st, { k: "end" }); return; }
    st.round++; st.phase = "pick"; push(st, { k: "round", r: st.round + 1 });
  }
  const over = st => !!st.over;
  const ranks = st => st.pts.map(p => st.pts.filter(x => x > p).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const out = [];
    for (let r = 0; r < 3; r++) for (const s of SPS) if (!check(st, seat, { r, s })) out.push({ r, s });
    return out;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 숨은 것 = 이번 라운드에 상대가 낸 카드 (공개 전). 쓴 카드 · 남은 카드 · 승점은 모두에게 공개.
  function view(st, seat) {
    const all = seat === "all", ps = seat === 0 || seat === 1;
    const pubObj = { r: st.round, p: st.phase, sb: st.sub.map(Boolean), t: st.pts, h: st.hist.map(h => [h.c.map(x => x.r + x.s), h.w, h.how]), ov: st.over };
    return {
      n: 2, R: ROUNDS, round: st.round + 1, phase: st.phase, pts: st.pts.slice(), score: st.pts.slice(),
      left: st.left.map(x => x.slice()), sp: st.sp.map(x => ({ V: x.V, C: x.C })),
      submitted: st.sub.map(Boolean), mine: ps && st.sub[seat] ? { r: st.sub[seat].r, s: st.sub[seat].s } : null,
      subs: all ? st.sub.map(x => x && { r: x.r, s: x.s }) : null,
      hist: st.hist.map(h => ({ r: h.r, c: h.c.map(x => ({ r: x.r, s: x.s })), w: h.w, how: h.how, swap: h.swap, pts: h.pts.slice(), tot: h.tot.slice() })),
      res: st.phase === "show" || st.over ? st.res : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · 계산 (보이는 것만) ───────────────────────────────
  // 내 선택마다: 남은 판까지 본 승률(ev) · 이번 판 기대 승점(pts) · 섞어 내는 비율(mix)
  function chances(V, me) {
    const { A, B, M } = matrix(V, me);
    if (!A.length) return { acts: [], best: null };
    const ev = M.map(row => row.reduce((s, v, j) => s + v * B[j].w, 0));
    const now = A.map(a => B.reduce((s, b) => s + b.w * (OUT[a.code][b.code] > 0 ? WINP : OUT[a.code][b.code] === 0 ? DRAWP : 0), 0));
    const mix = solveGame(M);
    const acts = A.map((a, k) => ({ r: a.r, s: a.s, ev: ev[k], pts: now[k], mix: mix[k] }));
    let bi = 0; for (let k = 1; k < acts.length; k++) if (acts[k].ev > acts[bi].ev) bi = k;
    // 상대가 빅토리 · 체인지를 아직 가졌나, 상대 남은 가위바위보
    const o = 1 - me;
    return { acts, best: { r: acts[bi].r, s: acts[bi].s }, oppV: !!V.sp[o].V, oppC: !!V.sp[o].C, oppLeft: V.left[o].slice(), winProb: ev[bi] };
  }
  const cardText = c => `${RPS[c.r]}${c.s === "B" ? "" : "+" + SPN[c.s]}`;

  // ── AI (보이는 것만) ──────────────────────────────────────
  function ai(V, me, tier, rnd) {
    const A = ACT[idxOf(V.left[me], V.sp[me])];
    if (!A || !A.length) return null;
    const pickW = ws => { let t = ws.reduce((a, b) => a + b, 0), x = rnd() * t; for (let k = 0; k < ws.length; k++) { x -= ws[k]; if (x < 0) return k; } return ws.length - 1; };
    if (tier === "easy") {   // 그냥 아무거나 (특수 카드는 빈 카드 쪽이 더 잦음)
      const k = pickW(A.map(a => (a.s === "B" ? 2 : 1))); return { r: A[k].r, s: A[k].s };
    }
    const { B, M } = matrix(V, me);
    if (tier === "normal") {
      if (rnd() < 0.25) { const k = Math.floor(rnd() * A.length); return { r: A[k].r, s: A[k].s }; }
      let bi = 0, be = -1; M.forEach((row, k) => { const e = row.reduce((s, v, j) => s + v * B[j].w, 0); if (e > be + 1e-9) { be = e; bi = k; } });
      return { r: A[bi].r, s: A[bi].s };
    }
    const mix = solveGame(M), k = pickW(mix.map(x => x + 1e-9));
    return { r: A[k].r, s: A[k].s };
  }

  return {
    id: "bloodrps", ROUNDS, WINP, DRAWP, RPS, SPN, SPS, beats, judge, cardText,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    chances, matrix, solveGame,
  };
});

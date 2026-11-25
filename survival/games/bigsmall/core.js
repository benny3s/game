/* 베니 서바이벌 · 빅 스몰 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 7일차 결승전 1회전 (1:1)
   · 두 사람 모두 숫자 카드 0~10 (11장)과 칩 10개로 시작. 딜러는 사람마다 1~9 카드 한 벌(9장)을 따로 가짐
   · 라운드마다 한 사람은 대결, 다른 사람은 베팅 — 역할은 라운드마다 바뀜
   · 딜러가 대결하는 사람 몫의 1~9 카드 중 한 장을 무작위로 공개 (D)
   · 대결하는 사람은 D 를 보고 내 카드 한 장을 뒷면으로 냄 (P)
   · 베팅하는 사람은 P 가 D 보다 크면 '빅', 작으면 '스몰' 에 칩을 검
   · P > D 면 대결 승: 차이(P − D)만큼 칩을 받음 (지면 변화 없음) · 베팅이 맞으면 건 칩만큼 더 받고(두 배로 돌려받음), 틀리면 건 칩을 잃음
   · P = D 면 대결은 변화 없음 · 베팅은 돌려받음
   · 쓴 카드는 버림. 18라운드 뒤 칩이 많은 사람 승, 또는 상대 칩을 먼저 0개로 만든 사람 승
   방송과 다른 점 · 우리가 정한 것 (원문에 없거나 폰으로 바꾼 것)
   · 1라운드 역할은 무작위 (방송은 피스가 많은 사람이 정함)
   · 베팅은 1개부터 가진 칩 전부까지 (방송 글에 범위가 없음)
   · 남은 카드(두 사람 손패 · 남은 딜러 카드)는 화면에 보여 줌 (방송은 노트로 셈)
   · 18라운드 뒤 칩이 같으면 무승부 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).bigsmall = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const R = 18, CH0 = 10, HAND0 = 0x7FF, DSET0 = 0x3FE;        // 손패 0~10 비트 · 딜러 1~9 비트
  const bits = m => { const o = []; for (let v = 0; v <= 10; v++) if (m >> v & 1) o.push(v); return o; };
  const pop = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 진행 ─────────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, chips: [CH0, CH0], hand: [HAND0, HAND0], dset: [DSET0, DSET0], r: 0, first: 0,
      phase: "duel", duel: 0, D: 0, P: -1, bet: null, hist: [], log: [], seq: 0, over: false, res: null };
    st.first = rnd(st) < 0.5 ? 0 : 1;
    push(st, { k: "start", first: st.first });
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.r++;
    st.duel = (st.first + st.r - 1) % 2;
    const ds = bits(st.dset[st.duel]);
    st.D = ds[Math.floor(rnd(st) * ds.length)];
    st.dset[st.duel] &= ~(1 << st.D);
    st.P = -1; st.bet = null; st.phase = "duel";
    push(st, { k: "round", r: st.r, duel: st.duel, D: st.D });
  }
  const needs = st => st.over ? [] : st.phase === "duel" ? [st.duel] : st.phase === "bet" ? [1 - st.duel] : [];
  const over = st => !!st.over;
  function ranks(st) {
    const [a, b] = st.chips;
    if (st.res && st.res.why === "zero") return st.res.w === 0 ? [0, 1] : [1, 0];
    return a === b ? [0, 0] : a > b ? [0, 1] : [1, 0];
  }
  function legal(x, seat) {
    if (x.over) return [];
    if (x.phase === "duel" && seat === x.duel) return bits(x.handOwn ? x.handOwn[seat] : x.hand[seat]).map(v => ({ t: "card", v }));
    if (x.phase === "bet" && seat === 1 - x.duel) { const out = []; for (let a = 1; a <= x.chips[seat]; a++) for (const side of ["B", "S"]) out.push({ t: "bet", side, amt: a }); return out; }
    return [];
  }
  // 한 라운드 정산 (P · D · 베팅) → 칩 변화 [대결, 베팅]
  function settle(P, D, side, amt) {
    const g = P > D ? P - D : 0;
    const b = P === D ? 0 : (side === "B") === (P > D) ? amt : -amt;
    return [g, b];
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "duel") {
      if (seat !== st.duel) return { ok: false, err: "지금은 상대가 카드를 낼 차례예요" };
      if (a.t !== "card") return { ok: false, err: "이번 라운드는 내가 대결 — 카드를 한 장 내요" };
      const v = a.v;
      if (!Number.isInteger(v) || v < 0 || v > 10 || !(st.hand[seat] >> v & 1)) return { ok: false, err: "내 손에 있는 카드를 골라요" };
      st.hand[seat] &= ~(1 << v); st.P = v; st.phase = "bet";
      push(st, { k: "sub", s: seat, r: st.r });
      return { ok: true };
    }
    if (st.phase === "bet") {
      const bt = 1 - st.duel;
      if (seat !== bt) return { ok: false, err: "지금은 상대가 베팅할 차례예요" };
      if (a.t !== "bet") return { ok: false, err: "이번 라운드는 내가 베팅 — 빅 · 스몰에 칩을 걸어요" };
      if (a.side !== "B" && a.side !== "S") return { ok: false, err: "빅 · 스몰 중 하나를 골라요" };
      if (!Number.isInteger(a.amt) || a.amt < 1) return { ok: false, err: "칩을 1개 이상 걸어요" };
      if (a.amt > st.chips[seat]) return { ok: false, err: `가진 칩(${st.chips[seat]}개)까지만 걸 수 있어요` };
      const [g, b] = settle(st.P, st.D, a.side, a.amt);
      st.chips[st.duel] += g; st.chips[bt] += b;
      st.bet = { side: a.side, amt: a.amt };
      const rec = { r: st.r, duel: st.duel, D: st.D, P: st.P, side: a.side, amt: a.amt, g, b, chips: st.chips.slice() };
      st.hist.push(rec);
      push(st, Object.assign({ k: "res" }, rec));
      st.phase = "show";
      if (st.chips[bt] <= 0) finish(st, st.duel, "zero");
      else if (st.r >= R) { const [x, y] = st.chips; finish(st, x === y ? -1 : x > y ? 0 : 1, "end"); }
      return { ok: true };
    }
    return { ok: false, err: "잠깐 — 결과를 보여 주는 중이에요" };
  }
  function finish(st, w, why) {
    st.over = true; st.phase = "end";
    st.res = { w, why, chips: st.chips.slice(), r: st.r };
    push(st, { k: "end", w, why, chips: st.chips.slice() });
  }
  const auto = st => st.phase === "show" && !st.over ? 2600 : null;
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }

  // ── 보이는 것: 낸 카드(P)는 베팅이 끝날 때까지 낸 사람만 ──
  function view(st, seat) {
    const all = seat === "all", hidden = st.phase === "bet";
    const seeP = all || !hidden || seat === st.duel;
    // 공개 손패 = 이번에 낸 카드도 아직 손에 있는 것처럼 (안 그러면 빠진 카드로 P 가 드러남)
    const pubHand = st.hand.map((h, s) => hidden && s === st.duel ? h | (1 << st.P) : h);
    const handOwn = st.hand.slice();
    const pubObj = { r: st.r, ph: st.phase, d: st.duel, D: st.D, c: st.chips, h: pubHand, ds: st.dset, b: st.bet, o: st.over, P: hidden ? -9 : st.P };
    return {
      n: 2, R, CH0, r: st.r, phase: st.phase, duel: st.duel, bettor: 1 - st.duel, first: st.first, D: st.D,
      P: seeP ? st.P : -1, sent: hidden, chips: st.chips.slice(), hand: pubHand.slice(),
      handOwn: all ? handOwn : handOwn.map((h, s) => s === seat ? h : pubHand[s]),
      dset: st.dset.slice(), bet: st.bet ? Object.assign({}, st.bet) : null,
      hist: st.hist.map(h => Object.assign({}, h, { chips: h.chips.slice() })), last: st.hist.length ? Object.assign({}, st.hist[st.hist.length - 1]) : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? Object.assign({}, st.res, { chips: st.res.chips.slice() }) : null,
      score: st.chips.slice(), log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI ───────────────────────────────────────────────────
  // V(H, Rm) = 남은 대결에서 받을 칩의 기댓값 (D 는 남은 딜러 카드에서 무작위, 늘 가장 좋은 카드를 낸다고 봄 — 베팅은 뺌)
  const VM = new Float32Array(1 << 20).fill(-1);
  function Vf(H, Rm) {
    if (!Rm) return 0;
    const key = H * 512 + (Rm >> 1);
    const c = VM[key]; if (c >= 0) return c;
    let s = 0, n = 0;
    for (let D = 1; D <= 9; D++) if (Rm >> D & 1) {
      n++;
      let best = -1;
      for (let P = 0; P <= 10; P++) if (H >> P & 1) { const v = (P > D ? P - D : 0) + Vf(H & ~(1 << P), Rm & ~(1 << D)); if (v > best) best = v; }
      s += best;
    }
    const v = s / n; VM[key] = v; return v;
  }
  // 정규 분포 누적 (승률 근사용)
  function Phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  // 라운드가 끝난 뒤 대결한 사람(d)의 이길 확률 근사: 칩 차 + 남은 대결 기댓값 차, 남은 라운드가 많을수록 흔들림이 큼
  function Ud(cd, cb, Vd, Vb, left) {
    if (cb <= 0) return 1;
    if (cd <= 0) return 0;
    const diff = cd - cb + Vd - Vb;
    if (left <= 0) return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;
    return Phi(diff / (1 + 1.9 * Math.sqrt(left)));
  }
  const AMTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26, 30, 36, 44, 52, 64, 80, 100];
  const amountsOf = c => { const a = AMTS.filter(x => x <= c); if (!a.includes(c)) a.push(c); return a; };
  // 이번 라운드 표 (행 = 대결 카드, 열 = 베팅) → 대결한 사람의 이길 확률
  function stage(V) {
    const d = V.duel, b = 1 - d, D = V.D, H = V.hand[d];          // 공개 손패 (이번에 낸 카드 포함)
    const rows = bits(H), cols = [];
    for (const amt of amountsOf(V.chips[b])) for (const side of ["B", "S"]) cols.push({ side, amt });
    const left = R - V.r, Rd = V.dset[d], Vb = Vf(V.hand[b] | 0, V.dset[b]);
    const M = rows.map(P => {
      const Vd = Vf(H & ~(1 << P), Rd);
      return cols.map(c => { const [g, x] = settle(P, D, c.side, c.amt); return Ud(V.chips[d] + g, V.chips[b] + x, Vd, Vb, left); });
    });
    return { rows, cols, M };
  }
  // 두 사람 영합 게임의 균형 (후회 맞추기 + , 평균 전략) — 결정적
  function solve(M, T) {
    const m = M.length, n = M[0].length;
    const rx = new Float64Array(m), ry = new Float64Array(n), sx = new Float64Array(m), sy = new Float64Array(n);
    const x = new Float64Array(m), y = new Float64Array(n);
    for (let t = 1; t <= T; t++) {
      let zx = 0; for (let i = 0; i < m; i++) zx += rx[i];
      for (let i = 0; i < m; i++) x[i] = zx > 0 ? rx[i] / zx : 1 / m;
      let zy = 0; for (let j = 0; j < n; j++) zy += ry[j];
      for (let j = 0; j < n; j++) y[j] = zy > 0 ? ry[j] / zy : 1 / n;
      // 행: 이길 확률 높이기 · 열: 낮추기
      const ux = new Float64Array(m), uy = new Float64Array(n);
      let vx = 0;
      for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < n; j++) s += M[i][j] * y[j]; ux[i] = s; vx += x[i] * s; }
      for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < m; i++) s += M[i][j] * x[i]; uy[j] = -s; }
      const vy = -vx;
      for (let i = 0; i < m; i++) rx[i] = Math.max(0, rx[i] + ux[i] - vx);
      for (let j = 0; j < n; j++) ry[j] = Math.max(0, ry[j] + uy[j] - vy);
      for (let i = 0; i < m; i++) sx[i] += t * x[i];
      for (let j = 0; j < n; j++) sy[j] += t * y[j];
    }
    const nx = sx.reduce((a, b) => a + b, 0), ny = sy.reduce((a, b) => a + b, 0);
    return { x: Array.from(sx, v => v / nx), y: Array.from(sy, v => v / ny) };
  }
  // 균형 계산 결과 (선생님 · 복기 · 고급 AI 공용) — 같은 보기면 다시 계산 안 함
  let EQ = { key: "", v: null };
  function equilibrium(V) {
    const H = V.hand[V.duel];
    const key = [V.r, V.duel, V.D, H, V.hand[1 - V.duel], V.dset.join(","), V.chips.join(",")].join("|");
    if (EQ.key === key) return EQ.v;
    const S = stage(V), E = solve(S.M, 600);
    // 행 값 = 베팅 쪽 균형에 맞섰을 때의 이길 확률 · 열 값 = 대결 쪽 균형에 맞섰을 때 (베팅한 사람의 이길 확률)
    const rowV = S.M.map(r => r.reduce((s, v, j) => s + v * E.y[j], 0));
    const colV = S.cols.map((c, j) => 1 - S.M.reduce((s, r, i) => s + r[j] * E.x[i], 0));
    const value = rowV.reduce((s, v, i) => s + v * E.x[i], 0);
    let pB = 0, pS = 0, pT = 0;
    S.rows.forEach((P, i) => { if (P > V.D) pB += E.x[i]; else if (P < V.D) pS += E.x[i]; else pT += E.x[i]; });
    const v = { rows: S.rows, cols: S.cols, x: E.x, y: E.y, rowV, colV, value, pB, pS, pT };
    EQ = { key, v };
    return v;
  }
  // 베팅 쪽 믿음: 상대가 균형대로만 내지는 않으니 섞음 — 균형 55% · 손패 아무거나 30% · 'D 를 넘는 가장 작은 카드' 15%
  function belief(V) {
    const E = equilibrium(V), n = E.rows.length, win = E.rows.find(P => P > V.D);
    return E.rows.map((P, i) => 0.55 * E.x[i] + 0.3 / n + (win !== undefined ? (P === win ? 0.15 : 0) : 0.15 / n));
  }
  // 고급 베팅: 믿음으로 쪽마다 맞을 · 틀릴 확률 → 쪽은 차이가 큰 쪽, 칩은 절반 켈리 (틀릴 수 없으면 전부),
  //   내 마지막 베팅이면 따라잡는 데 필요한 만큼도 후보 — 후보 중 이길 확률 근사(Ud)가 가장 높은 것
  function betChoice(V) {
    const E = equilibrium(V), bel = belief(V), me = 1 - V.duel, c = V.chips[me];
    const p = { B: [0, 0], S: [0, 0] };                       // [맞음, 틀림]
    E.rows.forEach((P, i) => { if (P > V.D) { p.B[0] += bel[i]; p.S[1] += bel[i]; } else if (P < V.D) { p.S[0] += bel[i]; p.B[1] += bel[i]; } });
    const side = p.B[0] - p.B[1] >= p.S[0] - p.S[1] ? "B" : "S", [pw, pl] = p[side];
    // 후보 칩 수 → 어디서 나온 수인지 (선생님 글의 이유): one = 1개 · kelly = 절반 켈리 · need = 따라잡기 · all = 틀릴 수 없음
    const cand = new Map([[1, "one"]]), add = (amt, why) => { if (!cand.has(amt) || why === "all" || why === "need") cand.set(amt, why); };
    if (pl < 0.01 && pw > 0) add(c, "all");
    else { const f = Math.max(0, pw - pl) / Math.max(0.01, pw + pl) / 2; add(Math.max(1, Math.min(c, Math.round(f * c))), "kelly"); }
    let lastBet = true; for (let r = V.r + 1; r <= R; r++) if (1 - (V.first + r - 1) % 2 === me) { lastBet = false; break; }
    const d = V.duel, H = V.hand[d], Vme = Vf(V.hand[me], V.dset[me]);
    if (lastBet && pw > pl) {
      // 상대 끝 칩 기대 = 지금 칩 + 이번 대결 이득 + 남은 대결 (낸 카드는 믿음으로 평균 — 공개 손패엔 낸 카드가 아직 들어 있음)
      let oppEnd = 0;
      E.rows.forEach((P, i) => { oppEnd += bel[i] * (V.chips[d] + (P > V.D ? P - V.D : 0) + Vf(H & ~(1 << P), V.dset[d])); });
      const need = Math.ceil(oppEnd - c - Vme) + 1;
      if (need > 0) add(Math.min(c, need), "need");
    }
    const left = R - V.r;
    let best = null;
    for (const [amt, why] of cand) {
      let u = 0;
      E.rows.forEach((P, i) => { const [g, x] = settle(P, V.D, side, amt); u += bel[i] * (1 - Ud(V.chips[d] + g, c + x, Vf(H & ~(1 << P), V.dset[d]), Vme, left)); });
      if (!best || u > best.u + 1e-9) best = { amt, u, why };
    }
    return { a: { t: "bet", side, amt: best.amt }, pw, pl, pt: 1 - pw - pl, side, u: best.u, sure: pl < 0.01 && pw > 0, lastBet, why: best.why };
  }
  const clean = (ps, cut) => { const z = ps.map(p => p < cut ? 0 : p), s = z.reduce((a, b) => a + b, 0); return s > 0 ? z.map(p => p / s) : ps; };
  const pick = (ps, r) => { let u = r(), i = 0; for (; i < ps.length - 1; i++) { u -= ps[i]; if (u < 0) break; } return i; };
  // 단계: hard = 균형 전략 · normal = 눈에 보이는 수 세기 · easy = 거의 아무렇게
  function ai(V, seat, tier, r) {
    r = r || Math.random;
    if (V.over || !V.needs.includes(seat)) return null;
    const d = V.duel, D = V.D;
    if (V.phase === "duel") {
      const H = bits(V.handOwn ? V.handOwn[seat] : V.hand[seat]);
      if (tier === "hard") { const E = equilibrium(V); return { t: "card", v: E.rows[pick(clean(E.x, 0.02), r)] }; }
      if (tier === "normal") {
        const win = H.filter(v => v > D);
        if (win.length && r() < 0.6) return { t: "card", v: win[0] };            // D 를 넘는 가장 작은 카드
        if (r() < 0.5) return { t: "card", v: H[0] };                             // 가장 작은 카드 버리기
        return { t: "card", v: H[Math.floor(r() * H.length)] };
      }
      return { t: "card", v: H[Math.floor(r() * H.length)] };
    }
    const c = V.chips[seat], H = bits(V.hand[d]);
    if (tier === "hard") return betChoice(V).a;
    const big = H.filter(v => v > D).length, small = H.filter(v => v < D).length;
    if (tier === "normal") {
      const side = big === small ? (r() < 0.5 ? "B" : "S") : big > small ? "B" : "S";
      const p = Math.max(big, small) / Math.max(1, big + small);
      const amt = p >= 1 ? c : Math.max(1, Math.min(c, p > 0.75 ? 3 : p > 0.6 ? 2 : 1));
      return { t: "bet", side, amt };
    }
    return { t: "bet", side: r() < 0.5 ? "B" : "S", amt: Math.max(1, Math.min(c, 1 + Math.floor(r() * 2))) };
  }

  // ── 선생님 · 복기 보조 ──
  function recommend(V, me) {
    if (V.over || !V.needs.includes(me)) return null;
    const E = equilibrium(V);
    if (V.phase === "duel") {
      const i = E.x.indexOf(Math.max(...E.x));
      const mix = E.rows.map((P, k) => [P, E.x[k]]).filter(z => z[1] >= 0.05).sort((a, b) => b[1] - a[1]);
      return { a: { t: "card", v: E.rows[i] }, mix, pB: E.pB, pS: E.pS, pT: E.pT, value: E.value };
    }
    const B = betChoice(V);
    return Object.assign({ pB: E.pB, pS: E.pS, pT: E.pT, value: B.u }, B);
  }
  // 복기: 내 수 · 고급 AI 수가 상대 균형 전략에 맞섰을 때의 이길 확률
  function judge(V, seat, a, b) {
    if (V.over || !V.needs.includes(seat) || !a || !b) return null;
    const E = equilibrium(V);
    if (V.phase === "duel") {
      const val = act => { const i = E.rows.indexOf(act.v); return i < 0 ? null : E.rowV[i]; };
      return { my: val(a), best: val(b), E };
    }
    // 베팅: 고급 AI 와 같은 믿음(균형 + 아무 카드 + 가장 작은 이기는 카드)으로 이길 확률 근사
    const bel = belief(V), d = V.duel, bb = 1 - d, H = V.hand[d], left = R - V.r, Vb = Vf(V.hand[bb], V.dset[bb]);
    const val = act => {
      let s = 0;
      E.rows.forEach((P, i) => { const [g, x] = settle(P, V.D, act.side, act.amt); s += bel[i] * (1 - Ud(V.chips[d] + g, V.chips[bb] + x, Vf(H & ~(1 << P), V.dset[d]), Vb, left)); });
      return s;
    };
    return { my: val(a), best: val(b), E };
  }

  return {
    id: "bigsmall", R, CH0, bits, pop, settle, Vf, Ud, amountsOf, stage, solve, equilibrium,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, judge, belief, betChoice,
  };
});

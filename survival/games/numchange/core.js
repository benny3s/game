/* 베니 서바이벌 · 넘버 체인지 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌2 · 머니챌린지 · 넘버 체인지 (팀전 → 우리는 1:1)
   · 준비물: 사람마다 1~7 블록 2세트 = 14개
   · 한 라운드: 두 블록을 동시에 숨겨 냄 → 공개 → 합이 큰 쪽 1점 (같으면 득점 없음).
     낸 두 블록 중 큰 블록끼리 서로 주고받고, 작은 블록은 딜러에게 회수(버림) → 매 라운드 블록이 1개씩 줄어 14 → 2
   · 히든 찬스: 게임 중 1회. 쓴 라운드는 내 합계 · 낸 블록이 상대에게 비공개 (승패만 공개).
     그때 상대는 자기가 낸 두 블록 중 하나를 무작위로 골라 나에게 주고 (내 큰 블록은 상대에게 감) 나머지는 딜러에게
   · 7점을 먼저 얻으면 바로 승. 12라운드가 끝나면 점수가 높은 쪽 승. 같으면 남은 블록(2개)으로 연장 1판, 그래도 같으면 공동 1등
   방송과 다른 점 (우리가 정함): ① 주고받는 블록 = 서로의 '큰 블록' (원문에 어느 블록인지 없음) ② 팀 → 1:1
     ③ 히든 찬스를 둘 다 같은 라운드에 쓰면 둘 다 무작위 (각자 낸 두 블록 중 하나가 상대에게)
     ④ 히든 찬스 뒤 상대 손은 '가능한 경우'로 보여 줌 (상대가 어느 블록을 냈는지 모르니까) ⑤ 한 기기로는 못 함, 2명 고정
     ⑥ 구경꾼은 블록 수만 봄 (낸 블록은 공개된 라운드만) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).numchange = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MAXV = 7, ROUNDS = 12, WINPT = 7;
  const full = () => [0, 2, 2, 2, 2, 2, 2, 2];
  const size = c => { let t = 0; for (let v = 1; v <= MAXV; v++) t += c[v]; return t; };

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function mul(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 손(장수 배열)에서 낼 수 있는 서로 다른 두 블록 → [큰, 작은] 목록
  function pairsOf(c) {
    const out = [];
    for (let a = 1; a <= MAXV; a++) { if (c[a] < 1) continue; for (let b = a; b <= MAXV; b++) if (a === b ? c[a] >= 2 : c[b] >= 1) out.push([b, a]); }
    return out;
  }
  // 손에서 서로 다른 블록 두 개를 무작위로 (장수만큼 뽑힐 확률) → [큰, 작은]
  function drawPair(H, r) {
    const n = size(H);
    const i = Math.floor(r() * n); let j = Math.floor(r() * (n - 1)); if (j >= i) j++;
    const at = k => { for (let v = 1; v <= MAXV; v++) { if (k < H[v]) return v; k -= H[v]; } return 1; };
    const x = at(i), y = at(j); return x >= y ? [x, y] : [y, x];
  }
  // 한 라운드의 블록 오감 (엔진 · AI 가 같이 씀). H = [손0, 손1] (장수 배열, 바로 바뀜), P = [[큰, 작은] × 2], h = [히든0, 히든1]
  //   상대가 히든 찬스를 쓴 쪽은 낸 두 블록 중 무작위 하나를 주고, 아니면 큰 블록을 줌. 준 것 외 나머지는 딜러에게.
  function exchange(H, P, h, r) {
    const give = [0, 0], drop = [0, 0];
    for (let s = 0; s < 2; s++) {
      if (h[1 - s]) { const k = r() < 0.5 ? 0 : 1; give[s] = P[s][k]; drop[s] = P[s][1 - k]; }
      else { give[s] = P[s][0]; drop[s] = P[s][1]; }
    }
    for (let s = 0; s < 2; s++) { H[s][P[s][0]]--; H[s][P[s][1]]--; }
    for (let s = 0; s < 2; s++) H[s][give[1 - s]]++;
    return { give, drop };
  }

  // ── 상대 손 짐작 (보이는 것만으로) ───────────────────────────
  // 자리마다 '상대 손이 될 수 있는 경우들(장수 배열 목록)'을 따로 들고 있음. 낸 블록이 다 보이면 경우가 하나로 좁혀지고,
  // 상대가 히든 찬스를 쓰면 낸 블록 중 작은(또는 모르는) 하나가 후보로 퍼짐 — 승패 · 내가 받은 블록으로 걸러냄.
  function belUpdate(st, o, info) {
    const t = 1 - o, h = info.h, P = info.P, out = new Map();
    const recv = info.give[o];                          // 상대가 받은 블록 = 내가 준 블록 (나는 앎)
    const take = (W, vs) => { const X = W.slice(); for (const v of vs) { if (X[v] <= 0) return null; X[v]--; } X[recv]++; return X; };
    const add = X => { if (X) out.set(X.join(""), X); };
    for (const W of st.bel[o]) {
      if (!h[t]) { add(take(W, P[t])); continue; }
      const known = info.give[t], So = info.S[o];       // 내가 받은 블록 = 상대가 낸 블록 중 하나
      for (let u = 1; u <= MAXV; u++) {
        if (!h[o] && u > known) continue;               // 나는 안 숨겼다면 받은 블록이 상대의 큰 블록
        const sm = known + u, cmp = sm > So ? t : sm < So ? o : -1;
        if (cmp !== info.w) continue;                   // 공개된 승패와 맞아야 함
        add(take(W, [known, u]));
      }
    }
    st.bel[o] = [...out.values()];
  }

  // 상대가 지금까지 높은 합 쪽을 냈는지 (0 = 늘 가장 낮은 쌍 … 1 = 늘 가장 높은 쌍). 낸 블록이 보인 라운드만, 내가 짐작하는 상대 손 기준
  function styleUpdate(st, o, info) {
    const t = 1 - o; if (info.h[t]) return;
    const S = info.S[t]; let q = 0;
    for (const W of st.bel[o]) {
      const ps = pairsOf(W); let lt = 0, eq = 0;
      for (const p of ps) { const x = p[0] + p[1]; if (x < S) lt++; else if (x === S) eq++; }
      q += ps.length > 1 ? Math.max(0, (lt + eq / 2 - 0.5) / (ps.length - 1)) : 0.5;
    }
    st.style[o].n++; st.style[o].s += q / st.bel[o].length;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, R: ROUNDS, round: 0, hand: [full(), full()], bel: [[full()], [full()]], style: [{ n: 0, s: 0 }, { n: 0, s: 0 }], hid: [false, false], score: [0, 0], sub: [null, null], hist: [], phase: "pick", over: false, res: null, log: [], seq: 0 };
    push(st, { k: "round", r: 1, ext: false });
    return st;
  }
  const needs = st => (st.over || st.phase !== "pick" ? [] : [0, 1].filter(s => !st.sub[s]));
  function check(st, seat, a) {
    if (!a || !Number.isInteger(a.a) || !Number.isInteger(a.b) || a.a < 1 || a.a > MAXV || a.b < 1 || a.b > MAXV) return "1~7 블록 두 개를 골라요";
    const H = st.hand[seat];
    if (a.a === a.b ? H[a.a] < 2 : (H[a.a] < 1 || H[a.b] < 1)) return "그 블록은 가지고 있지 않아요";
    if (a.h && st.hid[seat]) return "히든 찬스는 한 번뿐이에요";
    return null;
  }
  function apply(st, seat, a) {
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const err = check(st, seat, a);
    if (err) return { ok: false, err };
    st.sub[seat] = { a: a.a, b: a.b, h: !!a.h };
    push(st, { k: "lock", s: seat });
    if (!needs(st).length) resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const P = st.sub.map(x => (x.a >= x.b ? [x.a, x.b] : [x.b, x.a])), h = st.sub.map(x => x.h);
    const S = P.map(p => p[0] + p[1]), w = S[0] > S[1] ? 0 : S[1] > S[0] ? 1 : -1;
    if (w >= 0) st.score[w]++;
    const ex = exchange(st.hand, P, h, () => rnd(st));
    h.forEach((x, s) => { if (x) st.hid[s] = true; });
    const info = { P, S, h, w, give: ex.give, drop: ex.drop };
    for (let o = 0; o < 2; o++) { styleUpdate(st, o, info); belUpdate(st, o, info); }
    const rec = { r: st.round + 1, P, S, h, w, give: ex.give, drop: ex.drop, sc: st.score.slice() };
    st.hist.push(rec); st.res = rec; st.round++;
    const open = !h[0] && !h[1];
    push(st, { k: "res", r: rec.r, w, h, P: P.map((p, s) => (h[s] ? null : p)), S: S.map((x, s) => (h[s] ? null : x)), give: open ? ex.give : null, sc: rec.sc });
    st.sub = [null, null]; st.phase = "show";
  }
  const auto = st => (st.phase === "show" ? 3600 : null);
  function advance(st) {
    if (st.phase !== "show") return;
    const sc = st.score;
    if (sc[0] >= WINPT || sc[1] >= WINPT || st.round > ROUNDS || (st.round === ROUNDS && sc[0] !== sc[1])) { st.over = true; st.phase = "end"; push(st, { k: "end", sc: sc.slice() }); return; }
    st.phase = "pick"; push(st, { k: "round", r: st.round + 1, ext: st.round >= ROUNDS });
  }
  const over = st => !!st.over;
  const ranks = st => st.score.map(p => st.score.filter(x => x > p).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const out = [];
    for (const [b, a] of pairsOf(st.hand[seat])) { out.push({ a: b, b: a, h: false }); if (!st.hid[seat]) out.push({ a: b, b: a, h: true }); }
    return out;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 한 라운드 기록을 보는 사람 눈에 맞게: 히든 찬스를 쓴 쪽의 낸 블록 · 합은 본인만 봄. 오간 블록은 준 사람 · 받은 사람 (히든 없는 라운드면 모두) 이 봄.
  function visRec(rec, v) {
    const all = v === "all", seat = v === 0 || v === 1 ? v : -1, open = !rec.h[0] && !rec.h[1];
    const pv = s => all || !rec.h[s] || s === seat;
    const gv = s => all || open || seat === s || seat === 1 - s;
    return {
      r: rec.r, w: rec.w, h: rec.h.slice(), sc: rec.sc.slice(),
      P: [0, 1].map(s => (pv(s) ? rec.P[s].slice() : null)), S: [0, 1].map(s => (pv(s) ? rec.S[s] : null)),
      give: [0, 1].map(s => (gv(s) ? rec.give[s] : null)), drop: [0, 1].map(s => (pv(s) && gv(s) ? rec.drop[s] : null)),
    };
  }
  function view(st, seat) {
    const all = seat === "all", ps = seat === 0 || seat === 1, v = all ? "all" : ps ? seat : -1;
    const sizes = [size(st.hand[0]), size(st.hand[1])];
    let opp = null;
    if (ps) {
      const W = st.bel[seat], sure = Array(MAXV + 1).fill(0), maybe = Array(MAXV + 1).fill(0);
      for (let x = 1; x <= MAXV; x++) { sure[x] = Math.min(...W.map(c => c[x])); maybe[x] = Math.max(...W.map(c => c[x])); }
      opp = { n: sizes[1 - seat], worlds: W.map(c => c.slice()), sure, maybe };
    }
    const pubObj = { r: st.round, p: st.phase, sc: st.score, hd: st.hid, sb: st.sub.map(Boolean), sz: sizes, l: st.log.filter(e => e.k === "res").slice(-3).map(e => [e.r, e.w, e.h, e.P, e.S]), ov: st.over };
    return {
      n: 2, R: ROUNDS, winAt: WINPT, round: st.round, ext: st.round >= ROUNDS, phase: st.phase, score: st.score.slice(),
      hid: st.hid.slice(), sizes, submitted: st.sub.map(Boolean),
      hand: ps ? st.hand[seat].slice() : null, opp, style: ps ? { n: st.style[seat].n, aggr: st.style[seat].n ? st.style[seat].s / st.style[seat].n : 0.5 } : null,
      hands: all ? st.hand.map(c => c.slice()) : null, subs: all ? st.sub.map(x => x && { a: x.a, b: x.b, h: x.h }) : null,
      mine: ps && st.sub[seat] ? { a: st.sub[seat].a, b: st.sub[seat].b, h: st.sub[seat].h } : null,
      hist: st.hist.map(r => visRec(r, v)), res: (st.phase === "show" || st.over) && st.res ? visRec(st.res, v) : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 (보이는 것만) ─────────────────────────────────────
  // 상대가 낼 법한 두 블록: 가능한 손 하나하나에서 서로 다른 두 블록을 무작위로 뽑는다고 봄 → [{ P:[큰, 작은], p }]
  function oppDist(V) {
    const m = new Map(), Ws = V.opp.worlds;
    for (const W of Ws) {
      const n = size(W), tot = n * (n - 1) / 2;
      for (const P of pairsOf(W)) { const ways = P[0] === P[1] ? W[P[0]] * (W[P[0]] - 1) / 2 : W[P[0]] * W[P[1]], k = P.join(); const e = m.get(k) || { P, p: 0 }; e.p += ways / tot / Ws.length; m.set(k, e); }
    }
    return [...m.values()];
  }
  // 내 선택마다 이번 라운드 이길 · 비길 · 질 확률 (합 비교만)
  function chances(V, me) {
    const dist = oppDist(V), acts = [];
    for (const [b, a] of pairsOf(V.hand)) {
      let pw = 0, pt = 0, pl = 0;
      for (const o of dist) { const d = b + a - o.P[0] - o.P[1]; if (d > 0) pw += o.p; else if (d === 0) pt += o.p; else pl += o.p; }
      acts.push({ a: b, b: a, pWin: pw, pTie: pt, pLose: pl });
    }
    acts.sort((x, y) => (y.pWin + y.pTie / 2) - (x.pWin + x.pTie / 2) || (x.a + x.b) - (y.a + y.b));
    return { opp: dist.sort((x, y) => y.p - x.p), acts, best: acts[0] || null };
  }

  // ── AI ────────────────────────────────────────────────────
  // 손에서 합이 낮은 순으로 늘어놓고 분위수 q (0 = 가장 낮은 쌍, 1 = 가장 높은 쌍) 쯤의 쌍을 고름 (조금 흔들어서)
  function pairAtQ(H, q, r) {
    const ps = pairsOf(H).sort((x, y) => (x[0] + x[1]) - (y[0] + y[1]) || x[0] - y[0]);
    return ps[Math.max(0, Math.min(ps.length - 1, Math.round((q + (r() - 0.5) * 0.25) * (ps.length - 1))))];
  }
  // 상대 합을 겨우 넘는 가장 낮은 쌍 (못 넘으면 가장 낮은 쌍) — 큰 블록을 아끼면서 이기는 수
  function lowWin(H, S1) {
    let win = null, low = null;
    for (const p of pairsOf(H)) { const s = p[0] + p[1]; if (!low || s < low[0] + low[1]) low = p; if (s > S1 && (!win || s < win[0] + win[1])) win = p; }
    return win || low;
  }
  function stepSim(H, sc, P0, P1, h0, h1, r) {
    const S0 = P0[0] + P0[1], S1 = P1[0] + P1[1];
    if (S0 > S1) sc[0]++; else if (S1 > S0) sc[1]++;
    exchange(H, [P0, P1], [h0, h1], r);
  }
  function simRest(H, sc, k, q, r) {                    // k = 끝난 라운드 수 → 끝까지 가볍게 둬서 내(0번) 결과. 상대는 분위수 q 쯤으로 냄
    while (sc[0] < WINPT && sc[1] < WINPT && k < ROUNDS + 1 && !(k === ROUNDS && sc[0] !== sc[1])) {
      const P1 = pairAtQ(H[1], q, r), guess = pairAtQ(H[1], q, r);      // 내 수는 상대 수를 정확히 모른 채 '이 정도 내겠지' 로만 맞춤
      stepSim(H, sc, lowWin(H[0], guess[0] + guess[1]), P1, false, false, r); k++;
    }
    return sc[0] > sc[1] ? 1 : sc[0] < sc[1] ? 0 : 0.5;
  }
  // 고급: 상대가 지금까지 높은 합 쪽(style.aggr)이었는지 낮은 쪽이었는지로 상대 유형을 섞어 보고, 내 후보마다 끝까지 여러 번 둬 봄
  function hardPick(V, me, rnd, SAMP) {
    const Ws = V.opp.worlds, base = (rnd() * 4294967296) >>> 0, samples = [];
    const n0 = V.style ? V.style.n : 0, a = n0 ? V.style.aggr : 0.5, sg = 0.3 / Math.sqrt(n0 + 1) + 0.1;
    const QS = [0, 0.25, 0.5, 0.75, 1], wq = QS.map(q => Math.exp(-((q - a) * (q - a)) / (2 * sg * sg))), wt = wq.reduce((x, y) => x + y, 0);
    for (let s = 0; s < SAMP; s++) {
      const r = mul(base + s * 977); let x = r() * wt, k = 0; while (k < 4 && (x -= wq[k]) > 0) k++;
      const W = Ws[Math.floor(r() * Ws.length)];
      samples.push({ W, q: QS[k], P1: pairAtQ(W, QS[k], r), seed: (r() * 4294967296) >>> 0 });
    }
    const val = (P, h) => {
      let t = 0;
      for (const sm of samples) { const H = [V.hand.slice(), sm.W.slice()], sc = [V.score[me], V.score[1 - me]], r = mul(sm.seed); stepSim(H, sc, P, sm.P1, h, false, r); t += simRest(H, sc, V.round + 1, sm.q, r); }
      return t / samples.length;
    };
    const cands = pairsOf(V.hand).map(P => ({ P, v: val(P, false) })).sort((x, y) => y.v - x.v || (x.P[0] + x.P[1]) - (y.P[0] + y.P[1]));
    // 기준 수: 상대가 낼 수 있는 가장 큰 합을 확실히 넘는 가장 낮은 쌍 (없으면 가장 낮은 쌍). 계산이 비슷하면 이 수를 믿음
    const oMax = Math.max(...oppDist(V).map(o => o.P[0] + o.P[1])), anchor = lowWin(V.hand, oMax);
    const av = cands.find(c => c.P[0] === anchor[0] && c.P[1] === anchor[1]);
    if (av && av.v >= cands[0].v - 0.05) cands.unshift(cands.splice(cands.indexOf(av), 1)[0]);
    let best = { P: cands[0].P, h: false, v: cands[0].v };
    if (!V.hid[me]) for (const c of cands.slice(0, 4)) { const v = val(c.P, true); if (v > best.v + 0.02) best = { P: c.P, h: true, v }; }
    return { a: best.P[0], b: best.P[1], h: best.h };
  }
  function ai(V, me, tier, rnd) {
    const cs = pairsOf(V.hand);
    if (!cs.length) return null;
    if (tier === "easy") {
      const P = cs[Math.floor(rnd() * cs.length)];
      return { a: P[0], b: P[1], h: !V.hid[me] && rnd() < 0.08 };
    }
    if (tier === "normal") {
      const c = chances(V, me);
      if (rnd() < 0.2) { const P = cs[Math.floor(rnd() * cs.length)]; return { a: P[0], b: P[1], h: false }; }
      const pick = c.acts.slice(0, 3)[Math.floor(rnd() * Math.min(3, c.acts.length) * rnd())] || c.acts[0];   // 위쪽 셋 중 대체로 첫째
      return { a: pick.a, b: pick.b, h: false };
    }
    return hardPick(V, me, rnd, 48);
  }

  return {
    id: "numchange", ROUNDS, WINPT, MAXV, full, size, pairsOf, exchange, visRec,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    chances, oppDist,
  };
});

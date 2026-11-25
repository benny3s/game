/* 베니 서바이벌 · 하우머치 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 (그랜드 파이널) 11화 (나무위키 회차 문서 기준)
   · 플레이어 + 게스트 5명(AI). 10라운드, 라운드마다 상품 1개 — 게스트 5명이 몰래 정한 가격 중 '가장 높은 값(M)'을 맞히는 게임
   · 플레이어는 상품마다 1원 ~ 2억원을 제시하고, 10라운드 제시액 합계는 2억원 이하 (예산)
   · 이번 라운드 승자 = M 이하(M 과 같아도 됨)를 낸 사람 중 가장 높은 가격. 같은 가격을 낸 사람끼리는 서로 무효 (방송 1 · 4라운드)
   · 승점: 1 ~ 7라운드 1점, 8 · 9라운드 2점, 10라운드 4점 (합 15). 10라운드는 정보 확인 없이 바로 제시
   · 정보 확인(1 ~ 9라운드): 공개정보 1회(모두 같은 결과 — 우리 판은 라운드마다 돌아가며 한 사람이 고름) + 비공개정보 1회씩(각자). 질문은 둘:
     (가) 게스트 한 명이 5명 중 몇 번째로 높은 가격을 냈는가 (나) 게스트 한 명이 낸 가격
   · 게스트 5명이 10개 상품에 낸 가격 합계는 처음부터 공개. 상품은 게스트 합계가 낮은 순서로 공개
   · 우승 = 총 승점 최다, 같으면 10라운드 승점을 얻은 사람
   우리 판 다듬기(방송 문서에 없음): 게스트 가격은 AI 가 만든 값 (게임마다 달라요) · 토론 10분은 없음 · 2 ~ 6명 · 제시는 동시에 비밀로 · 모두 M 초과면 득점 없음
   · 남은 라운드마다 최소 1원은 남겨 두어야 제시할 수 있음 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-howmuch"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const BUDGET = 200000000, CAP = 100000000, ROUNDS = 10, PTS = [1, 1, 1, 1, 1, 1, 1, 2, 2, 4];
  const GUESTS = ["손님 1", "손님 2", "손님 3", "손님 4", "손님 5"], GEM = ["🎩", "🧢", "🎀", "🕶️", "🎒"];
  // 상품 (med = 게스트들이 부르는 값의 보통 규모 · 우리가 정한 값)
  const POOL = [
    { id: 0, name: "스마트폰 한 달 통신비", med: 350000 },
    { id: 1, name: "아이스 아메리카노 한 잔", med: 1200000 },
    { id: 2, name: "오랜 연인과의 데이트 하루", med: 800000 },
    { id: 3, name: "근사한 저녁 한 끼 (1인분)", med: 4000000 },
    { id: 4, name: "대학 한 학기 등록금", med: 8000000 },
    { id: 5, name: "하루치 기억을 지울 수 있다면", med: 10000000 },
    { id: 6, name: "9박 10일 여행", med: 14000000 },
    { id: 7, name: "좋아하는 스타와의 1시간", med: 15000000 },
    { id: 8, name: "내가 받아 마땅한 월급", med: 20000000 },
    { id: 9, name: "빼앗긴 투표권을 되찾는 값", med: 30000000 },
  ];
  const SIG = 1.0, BIAS_SD = 0.35;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const gauss = st => { let u = 0, v = 0; while (u === 0) u = rnd(st); v = rnd(st); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 50) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  // 사람처럼 둥글려 부르는 값 (유효숫자 1 ~ 3자리)
  function humanRound(x, k) { if (x < 10) return Math.max(1, Math.round(x)); const d = Math.pow(10, Math.floor(Math.log10(x)) - k + 1); return Math.max(1, Math.round(x / d) * d); }
  function genPrice(st, med, bias) {
    const u = rnd(st);
    if (u < 0.05) return rnd(st) < 0.7 ? CAP : 1000;   // 장난 가격
    const v = med * Math.exp(bias + SIG * gauss(st)), q = rnd(st);
    return Math.max(1, Math.min(CAP, humanRound(v, q < 0.2 ? 1 : q < 0.8 ? 2 : 3)));
  }
  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(6, n | 0 || 3));
    const st = { n, rs: (seed >>> 0) || 1, round: 0, bias: [], items: [], guestTotal: [0, 0, 0, 0, 0], spent: Array(n).fill(0), pts: Array(n).fill(0), phase: "", info: [], pubAns: null, priv: Array(n).fill(null), bids: Array(n).fill(null), res: null, hist: [], last10: -1, log: [], seq: 0, over: false, cfg: cfg || {} };
    if (cfg && cfg.items) st.items = cfg.items.map(it => ({ id: it.id | 0, name: it.name, prices: it.prices.slice() }));
    else {
      st.bias = [0, 1, 2, 3, 4].map(() => BIAS_SD * gauss(st));
      st.items = POOL.map(p => ({ id: p.id, name: p.name, prices: [0, 1, 2, 3, 4].map(g => genPrice(st, p.med, st.bias[g])) }));
      st.items.sort((a, b) => a.prices.reduce((s, x) => s + x, 0) - b.prices.reduce((s, x) => s + x, 0));   // 합계가 낮은 상품부터
    }
    for (const it of st.items) it.prices.forEach((p, g) => { st.guestTotal[g] += p; });
    startRound(st);
    return st;
  }
  const ptsOf = r => PTS[r - 1];
  const maxOf = it => Math.max(...it.prices);
  const remaining = (st, i) => BUDGET - st.spent[i];
  const bidMax = (st, i) => Math.max(0, remaining(st, i) - (ROUNDS - st.round));   // 남은 라운드에 1원씩은 남겨야 함
  function startRound(st) {
    st.round++;
    st.info = Array(st.n).fill(null); st.pubAns = null; st.priv = Array(st.n).fill(null); st.bids = Array(st.n).fill(null); st.res = null;
    st.pubSeat = (st.round - 1) % st.n;
    st.phase = st.round >= ROUNDS ? "bid" : "info";
    push(st, { k: "round", r: st.round });
  }
  function answer(st, kind, g) {
    const pr = st.items[st.round - 1].prices;
    return kind === "price" ? pr[g] : 1 + pr.filter(x => x > pr[g]).length;
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "info") return [...Array(st.n).keys()].filter(i => st.info[i] === null);
    if (st.phase === "bid") return [...Array(st.n).keys()].filter(i => st.bids[i] === null);
    return [];
  }
  const okQ = q => q && (q.kind === "rank" || q.kind === "price") && Number.isInteger(q.guest) && q.guest >= 0 && q.guest < 5;
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "info") {
      if (a.t !== "info" || !okQ(a)) return { ok: false, err: "질문 종류와 손님을 골라요" };
      if (seat === st.pubSeat && !okQ(a.pub)) return { ok: false, err: "이번 라운드 공개정보 질문도 골라요" };
      st.info[seat] = { kind: a.kind, guest: a.guest };
      if (seat === st.pubSeat) st.pubQ = { kind: a.pub.kind, guest: a.pub.guest };
      push(st, { k: "info", s: seat });
      if (needs(st).length === 0) {
        st.pubAns = { kind: st.pubQ.kind, guest: st.pubQ.guest, ans: answer(st, st.pubQ.kind, st.pubQ.guest), by: st.pubSeat };
        for (let i = 0; i < st.n; i++) st.priv[i] = { kind: st.info[i].kind, guest: st.info[i].guest, ans: answer(st, st.info[i].kind, st.info[i].guest) };
        st.phase = "bid";
      }
      return { ok: true };
    }
    if (st.phase === "bid") {
      const p = a.p;
      if (a.t !== "bid" || !Number.isInteger(p)) return { ok: false, err: "가격을 정수(원)로 적어요" };
      const mx = bidMax(st, seat);
      if (p < 1 || p > mx) return { ok: false, err: `1원 ~ ${mx.toLocaleString("ko-KR")}원 (남은 예산 안에서)` };
      st.bids[seat] = p; push(st, { k: "bid", s: seat });
      if (needs(st).length === 0) resolve(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  function resolve(st) {
    const it = st.items[st.round - 1], M = maxOf(it), b = st.bids.slice();
    for (let i = 0; i < st.n; i++) st.spent[i] += b[i];
    const cnt = new Map(); for (const x of b) cnt.set(x, (cnt.get(x) || 0) + 1);
    let w = -1;
    for (let i = 0; i < st.n; i++) if (b[i] <= M && cnt.get(b[i]) === 1 && (w < 0 || b[i] > b[w])) w = i;
    const P = ptsOf(st.round);
    if (w >= 0) { st.pts[w] += P; if (st.round === ROUNDS) st.last10 = w; }
    const dup = b.map((x, i) => cnt.get(x) > 1), over = b.map(x => x > M);
    st.res = { r: st.round, item: it.name, M, bids: b, winner: w, pts: P, dup, over, prices: it.prices.slice(), spent: st.spent.slice() };
    st.hist.push({ r: st.round, item: it.name, M, bids: b, winner: w, pts: P, dup, over });
    push(st, { k: "res", r: st.round, w });
    st.phase = "reveal";
  }
  const auto = st => (st.phase === "reveal" ? 5200 : null);
  function advance(st) {
    if (st.phase !== "reveal") return;
    if (st.round >= ROUNDS) { st.over = true; st.phase = "end"; return; }
    startRound(st);
  }
  const over = st => !!st.over;
  // 순위: 승점 많은 순, 같으면 10라운드 승점을 얻은 사람이 앞
  const key = (st, i) => st.pts[i] * 10 + (st.last10 === i ? 5 : 0);
  const ranks = st => st.pts.map((_, i) => st.pts.filter((_, j) => key(st, j) > key(st, i)).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "info") { const a = { t: "info", kind: "price", guest: 0 }; if (seat === st.pubSeat) a.pub = { kind: "price", guest: 1 }; return [a]; }
    const mx = bidMax(st, seat); return mx >= 1 ? [{ t: "bid", p: Math.min(mx, 1000) }] : [];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), rev = st.phase === "reveal" || st.phase === "end";
    const it = st.items[Math.min(st.round, ROUNDS) - 1];
    const pubObj = { r: st.round, p: st.phase, sp: st.spent, pt: st.pts, d: st.info.map(x => (x ? 1 : 0)), b: st.bids.map(x => (x === null ? 0 : 1)), pa: st.pubAns, res: rev && st.res ? [st.res.M, st.res.bids, st.res.winner] : 0, ov: st.over };
    return {
      n: st.n, seat, round: st.round, rounds: ROUNDS, phase: st.phase, itemId: it.id, item: it.name, pts: ptsOf(Math.min(st.round, ROUNDS)), ptsTable: PTS.slice(),
      guests: GUESTS.map((nm, g) => ({ name: nm, em: GEM[g], total: st.guestTotal[g] })), pubSeat: st.pubSeat, noInfo: st.round >= ROUNDS,
      pubAns: st.pubAns ? Object.assign({}, st.pubAns) : null, priv: all ? st.priv.map(x => x && Object.assign({}, x)) : seat >= 0 && st.priv[seat] ? Object.assign({}, st.priv[seat]) : null,
      done: st.phase === "info" ? st.info.map(x => !!x) : st.bids.map(x => x !== null), mine: all ? null : seat >= 0 ? st.bids[seat] : null,
      spent: st.spent.slice(), budget: BUDGET, left: st.spent.map(s => BUDGET - s), bidMax: seat >= 0 ? bidMax(st, seat) : 0, cap: CAP,
      points: st.pts.slice(), last10: st.last10, res: rev ? (all ? st.res : Object.assign({}, st.res, { prices: null })) : null, prices: all ? it.prices.slice() : null, hist: st.hist.slice(), bids: all ? st.bids.slice() : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.pts.slice(), log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 가격 추정 · AI (내가 보는 것만) ─────────────────────────────
  // 손님 가격은 (상품 규모 med) × exp(손님 성향 + 잡음) 로 만들어짐 — 합계가 큰 손님은 성향이 높은 쪽
  function guestBias(V) {
    const sm = POOL.reduce((s, p) => s + p.med, 0) * Math.exp(SIG * SIG / 2);
    return V.guests.map(g => Math.max(-0.9, Math.min(0.9, Math.log(Math.max(1, g.total) / sm) * 0.8)));
  }
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 알아낸 정보에 맞는 손님 가격 5개를 K 번 어림해 뽑아요 (복기 · 정보 질문 평가도 같이 씀)
  function sampleWorlds(V, K, r) {
    const med = POOL[V.itemId].med, bias = guestBias(V), facts = [];
    if (V.pubAns) facts.push(V.pubAns); if (V.priv) facts.push(V.priv);
    const g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
    const out = [];
    for (let k = 0; k < K; k++) {
      let best = null;
      for (let tries = 0; tries < 25; tries++) {
        const pr = bias.map(b => { const u = r(); if (u < 0.05) return r() < 0.7 ? CAP : 1000; return Math.max(1, Math.min(CAP, med * Math.exp(b + SIG * g()))); });
        for (const f of facts) if (f.kind === "price") pr[f.guest] = f.ans;
        best = pr;
        if (facts.every(f => f.kind === "price" || 1 + pr.filter(x => x > pr[f.guest]).length === f.ans)) break;
      }
      out.push(best);
    }
    return out;
  }
  function sampleM(V, K, r) { return sampleWorlds(V, K, r).map(pr => Math.max(...pr)).sort((a, b) => a - b); }
  const quant = (arr, q) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor(q * arr.length)))];
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  // 남이 M 의 몇 배를 낼지: 로그정규 (중심 0.65 · 폭 0.7) — 상대가 낼 값이 b 이상이면서 M 이하일 확률
  function pOtherAbove(b, M) {
    const mu = Math.log(0.65), sd = 0.7;
    const lo = Math.log(Math.max(1, b) / M), hi = 0;
    return Math.max(0, Phi((hi - mu) / sd) - Phi((lo - mu) / sd));
  }
  const TIER = { easy: { K: 20, kappa: 1.3, noise: 0.9 }, normal: { K: 120, kappa: 0.8, noise: 0.15 }, hard: { K: 220, kappa: 0.6, noise: 0.05 } };
  function ptsLeft(V) { let s = 0; for (let r = V.round; r <= ROUNDS; r++) s += PTS[r - 1]; return s; }
  function bidPlan(V, me, tier, r) {
    const T = TIER[tier], samples = sampleM(V, T.K, r), others = V.n - 1;
    const mx = V.bidMax, P = V.pts, left = V.left[me];
    if (mx < 1) return { p: 0, med: 0, q10: 0, q90: 0, pw: 0 };
    const lam = T.kappa * (ptsLeft(V) * 0.4) / Math.max(1, left);
    let bestB = 1, bestU = -1e9, bestP = 0;
    const lo = Math.log(1000), hi = Math.log(Math.min(mx, CAP));
    const steps = hi > lo ? 70 : 1;
    for (let s = 0; s < steps; s++) {
      const b = Math.max(1, Math.round(Math.exp(lo + (hi - lo) * (steps > 1 ? s / (steps - 1) : 0))));
      let pw = 0;
      for (const M of samples) { if (b > M) continue; let q = 1; for (let o = 0; o < others; o++) q *= 1 - pOtherAbove(b, M); pw += q; }
      pw /= samples.length;
      const u = P * pw - lam * b;
      if (u > bestU) { bestU = u; bestB = b; bestP = pw; }
    }
    // 끝자리를 흩뜨려 남과 겹치지 않게
    let p = bestB; if (p > 100) p = Math.max(1, p - Math.floor(r() * Math.min(p * 0.03, 5000)) - 1); if (T.noise > 0.1) p = Math.max(1, Math.round(p * (1 + (r() - 0.5) * T.noise * 2)));
    p = Math.max(1, Math.min(mx, p));
    return { p, med: quant(samples, 0.5), q10: quant(samples, 0.1), q90: quant(samples, 0.9), pw: bestP, best: bestB, lam };
  }
  // ── 복기 평가 (ai 의 선택은 안 바꿈 · 받은 view 도 안 바꿈 · 난수는 받은 씨앗만) ──
  // 내 제시가 b 일 때 이길 확률 · 예산의 값을 뺀 기대 점수 (bidPlan 과 같은 모형)
  function evalBids(V, me, bids, seed) {
    const T = TIER.hard, samples = sampleM(V, T.K, sampler(seed)), others = V.n - 1, left = V.left[me], P = V.pts;
    const lam = T.kappa * (ptsLeft(V) * 0.4) / Math.max(1, left);
    return {
      med: quant(samples, 0.5), q10: quant(samples, 0.1), q90: quant(samples, 0.9), lam, P,
      bids: bids.map(b => {
        let pw = 0;
        for (const M of samples) { if (b > M) continue; let q = 1; for (let o = 0; o < others; o++) q *= 1 - pOtherAbove(b, M); pw += q; }
        pw /= samples.length;
        return { b, pw, cost: lam * b, util: P * pw - lam * b };
      }),
    };
  }
  // 정보 질문 평가: 질문마다 '최고가(M)의 불확실성을 몇 % 줄이는가' (손님 가격 어림 세계를 답에 따라 묶어 분산이 줄어드는 비율) · 손님마다 최고가를 냈을 확률
  function infoValue(V, seed) {
    const W = sampleWorlds(V, 300, sampler(seed)), N = W.length, lnM = W.map(pr => Math.log(Math.max(...pr)));
    const mean = a => a.reduce((s, x) => s + x, 0) / a.length, mAll = mean(lnM), vAll = mean(lnM.map(x => (x - mAll) * (x - mAll))) || 1e-9;
    const red = key => { const g = new Map(); W.forEach((pr, i) => { const k = key(pr, i); if (!g.has(k)) g.set(k, []); g.get(k).push(lnM[i]); }); let w = 0; for (const a of g.values()) { const m = mean(a); w += a.reduce((s, x) => s + (x - m) * (x - m), 0); } return Math.max(0, Math.min(1, 1 - (w / N) / vAll)); };
    const price = [], rank = [], pMax = [];
    for (let g = 0; g < 5; g++) {
      const sorted = W.map(pr => pr[g]).sort((a, b) => a - b), cut = []; for (let q = 1; q < 10; q++) cut.push(sorted[Math.floor(q * N / 10)]);
      price.push(red(pr => cut.filter(c => pr[g] >= c).length));
      rank.push(red(pr => 1 + pr.filter(x => x > pr[g]).length));
      pMax.push(W.filter(pr => pr[g] === Math.max(...pr)).length / N);
    }
    return { price, rank, pMax };
  }
  // 정보 질문 고르기: 합계가 큰 손님(최고가를 낼 가능성이 큼)의 가격을 물음
  function askPlan(V, me, tier, r) {
    const order = V.guests.map((g, i) => i).sort((a, b) => V.guests[b].total - V.guests[a].total);
    const kind = tier === "easy" && r() < 0.4 ? "rank" : "price";
    const priv = { kind, guest: order[Math.min(order.length - 1, tier === "easy" ? Math.floor(r() * 3) : (V.pubSeat === me ? 1 : 0))] };
    const pub = { kind: "price", guest: order[0] };
    return { priv, pub };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "info") {
      const q = askPlan(V, me, tier, r), a = { t: "info", kind: q.priv.kind, guest: q.priv.guest };
      if (V.pubSeat === me) a.pub = q.pub;
      return a;
    }
    if (V.phase === "bid") { const pl = bidPlan(V, me, tier, r); return pl.p >= 1 ? { t: "bid", p: pl.p } : null; }
    return null;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const won = x => (x >= 100000000 ? `${(x / 100000000).toFixed(x % 100000000 ? 2 : 0)}억` : x >= 10000 ? `${(x / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만` : String(x)) + "원";
  const fmt = x => Math.round(x).toLocaleString("ko-KR") + "원";
  const pct = x => Math.round(x * 100) + "%";
  const pct1 = x => (x < 0.01 ? "1% 미만" : Math.round(x * 100) + "%");
  // 받침에 맞춰 조사 붙이기 (이름 · 숫자 끝)
  const jp = (w, a, b) => { w = String(w); const c = w.slice(-1), k = c.charCodeAt(0); const t = k >= 0xAC00 && k <= 0xD7A3 ? (k - 0xAC00) % 28 !== 0 : /[0-9]/.test(c) ? "013678".includes(c) : false; return w + (t ? a : b); };
  const sg2 = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
  function coach(V, me, since, names) {
    const seated = Number.isInteger(me) && me >= 0 && me < V.n, nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    const gname = g => `${V.guests[g].em}${V.guests[g].name}`;
    const qtxt = a => `${gname(a.guest)} ${a.kind === "price" ? `가격 ${fmt(a.ans)}` : `${a.ans}번째로 높음`}`;
    if (V.over) {
      const best = Math.max(...V.points), H = V.hist || [], won0 = H.filter(h => h.winner >= 0).length, dupN = H.filter(h => h.dup.some(Boolean)).length, overN = H.filter(h => h.over.every(Boolean)).length;
      const rk = seated && V.ranks ? V.ranks[me] + 1 : 0;
      return {
        opp: `승점: ${V.points.map((x, i) => `${nm(i)} ${x}`).join(" · ")}${V.last10 >= 0 ? ` · 10라운드 4점 득점: ${nm(V.last10)}` : " · 10라운드는 아무도 득점하지 못했어요"}`,
        mine: seated ? `내 승점 ${V.points[me]} · 최고 ${best} (${rk}위) · 남은 예산 ${won(V.left[me])}` : `최고 승점 ${best}`,
        rec: seated ? (V.ranks[me] === 0 ? "우승이에요!" : "예산 배분을 돌아봐요 — 10라운드 4점이 승부처예요") : "끝났어요",
        why: `${H.length}판 중 득점이 나온 판 ${won0}번 · 같은 값 무효가 있던 판 ${dupN}번 · 모두 최고가(M) 초과로 득점이 없던 판 ${overN}번이었어요. 승점은 1×7 · 2 · 2 · 4 (합 15), 같으면 10라운드 승자가 우승해요.`,
      };
    }
    if (V.phase === "reveal") {
      const r = V.res, win = r ? r.winner : -1, mb = r && seated ? r.bids[me] : null;
      let why = "";
      if (r && seated) {
        const ratio = Math.round(100 * mb / r.M), top = win >= 0 ? r.bids[win] : null;
        why = win === me ? `내 ${fmt(mb)}은 최고가 M 의 ${ratio}%로 M 이하 중 가장 높은 값(겹치는 값 없음)이라 이겼어요 (+${r.pts}점).`
          : r.over[me] ? `내 ${fmt(mb)}은 M ${fmt(r.M)}의 ${ratio}%라 M 을 넘어 무효예요 — M 의 어림 범위를 벗어났어요.`
            : r.dup[me] ? `내 ${fmt(mb)}은 다른 사람과 같은 값이라 서로 무효예요 — 끝자리를 어긋나게 해야 해요 (M 의 ${ratio}%).`
              : win >= 0 ? `내 ${fmt(mb)}(M 의 ${ratio}%)은 유효하지만 ${nm(win)}의 ${fmt(top)}(M 의 ${Math.round(100 * top / r.M)}%)이 더 높아서 졌어요 — ${fmt(top - mb)} 차이.`
                : `모두 M 을 넘었거나 같은 값이라 득점한 사람이 없어요.`;
      } else if (r) why = win >= 0 ? `최고가 M ${fmt(r.M)} 이하 중 가장 높은 값(${fmt(r.bids[win])})이 이겼어요.` : "모두 M 을 넘었거나 같은 값이라 득점한 사람이 없어요.";
      return { opp: r ? `최고가 M = ${fmt(r.M)} · ${win < 0 ? "이번 판 득점 없음" : `${win === me ? "내가" : jp(nm(win), "이", "가")} +${r.pts}점`} · 제시(M 대비): ${r.bids.map((b, i) => `${nm(i)} ${Math.round(100 * b / r.M)}%${r.over[i] ? "🚫" : r.dup[i] ? "⚠️" : ""}`).join(" · ")}` : "", mine: seated ? `승점 나 ${V.points[me]} · 남은 예산 ${won(V.left[me])} · 남은 점수 ${ptsLeft({ round: V.round + 1 })}점` : `남은 점수 ${ptsLeft({ round: V.round + 1 })}점`, rec: "결과를 보고 다음 판을 준비해요", why };
    }
    if (!seated) return { opp: "구경 중이에요 — 손님 5명이 몰래 낸 가격 중 최고가(M)가 이번 승부의 기준이에요.", mine: `${V.round}/${V.rounds} 판 · 이번 판 ${V.pts}점`, rec: "자리에 앉으면 내 차례마다 알려 드려요", why: "M 이하 중 가장 높은 값이 이기고, 같은 값은 서로 무효예요." };
    const known = []; if (V.pubAns) known.push(`공개정보: ${qtxt(V.pubAns)}`);
    if (V.priv) known.push(`내 정보: ${qtxt(V.priv)}`);
    const r = sampler(V.round * 7919 + V.itemId * 31 + (V.priv ? V.priv.ans | 0 : 0)), S = sampleM(V, 300, r);
    const oppTxt = `손님 5명이 낸 가격 중 최고가(M)가 이번 승부의 기준이에요. M 이하인 사람 중 가장 높은 값이 이기고, 같은 값은 서로 무효예요. ${known.length ? known.join(" · ") + "." : "아직 알아낸 정보가 없어요."} 손님 10개 합계 순위: ${V.guests.map((g, i) => [g.total, i]).sort((a, b) => b[0] - a[0]).map(x => `${gname(x[1])} ${won(x[0])}`).join(" > ")}. 다른 사람 승점 ${V.points.map((x, i) => (i === me ? null : `${nm(i)} ${x}`)).filter(Boolean).join(" · ")}`;
    const mineTxt = `이번 판 ${V.pts}점 · 남은 예산 ${won(V.left[me])} (남은 점수 ${ptsLeft(V)}점, 라운드당 평균 ${won(Math.round(V.left[me] / Math.max(1, V.rounds - V.round + 1)))}) · 승점 나 ${V.points[me]} · 추정 M: 중앙 ${won(quant(S, 0.5))} (80% 범위 ${won(quant(S, 0.1))} ~ ${won(quant(S, 0.9))})`;
    let rec = "정보를 골라요", why = "";
    if (V.phase === "info") {
      const q = askPlan(V, me, "hard", () => 0.5), iv = infoValue(V, V.round * 7919 + V.itemId * 31 + 5), g = q.priv.guest, o = q.priv.kind === "price" ? "rank" : "price";
      rec = `${V.guests[g].name}의 ${q.priv.kind === "price" ? "가격" : "순위"} 묻기`;
      why = `${gname(g)} ${q.priv.kind === "price" ? "가격을" : "순위를"} 물으면 최고가(M)의 불확실성이 약 ${pct(iv[q.priv.kind][g])} 줄어요 (같은 손님의 ${o === "price" ? "가격을" : "순위를"} 물으면 약 ${pct(iv[o][g])}). 10개 합계가 큰 ${jp(gname(g), "은", "는")} 이번에 최고가를 냈을 확률이 약 ${pct(iv.pMax[g])}예요 (가장 작은 손님은 ${pct(Math.min(...iv.pMax))}). 가격을 직접 알면 M 의 하한을 잡을 수 있어요.`;
    } else if (V.phase === "bid" && V.needs.includes(me)) {
      const sd = V.round * 104729 + V.itemId, pl = bidPlan(V, me, "hard", sampler(sd));
      if (pl.p >= 1) {
        const ev = evalBids(V, me, [Math.max(1, Math.round(pl.p / 2)), pl.p, Math.min(V.bidMax, Math.round(pl.p * 1.5))], sd), [lo, mid, hi] = ev.bids;
        rec = `약 ${won(pl.p)} (끝자리를 흩뜨려서)`;
        why = `이길 확률 약 ${pct(pl.pw)} (추정 M 중앙 ${won(quant(S, 0.5))}의 ${pct1(pl.p / Math.max(1, quant(S, 0.5)))}). 비교: ${won(lo.b)} → ${pct(lo.pw)} · ${won(mid.b)} → ${pct(mid.pw)} · ${won(hi.b)} → ${pct(hi.pw)}. M 을 넘기면 무효, 남과 같은 값이면 둘 다 무효 — 끝자리를 어긋나게! 예산이 ${won(V.left[me])} 남았으니 ${V.pts >= 4 ? "4점이 걸린 마지막 판을 위해 아껴 둔 만큼 과감하게" : `이번 판 ${V.pts}점에 쓰는 ${won(pl.p)}은 남은 예산의 ${pct1(pl.p / Math.max(1, V.left[me]))}예요 — 점수가 큰 뒤 라운드를 위해 너무 많이 쓰지 말아요`}.`;
      } else { rec = "낼 수 있는 예산이 없어요"; why = `남은 예산 ${won(V.left[me])}에서 남은 라운드마다 1원씩은 남겨야 해서 이번 판에는 낼 수 없어요.`; }
    } else if (V.phase === "bid") { rec = "다른 사람을 기다려요"; why = "이미 제시했어요."; }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-howmuch", TIER, BUDGET, CAP, ROUNDS, PTS, POOL, GUESTS, GEM, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, bidPlan, askPlan, sampleM, sampleWorlds, sampler, evalBids, infoValue, ptsLeft, quant, bidMax, answer, maxOf, ptsOf };
});

/* 베니 서바이벌 · 과일가게 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 블랙가넷 1화 메인 매치 — 13명, 과일 6종, 4라운드, 1인 판매권 2개 (서로 다른 과일), 희망가 1,000~5,000원
   · 라운드마다 자기 과일마다 희망가를 비공개로 제시 → 과일별 판매가 = 그 과일 판매자들 중 최저가
   · 최저가를 낸 사람이 (판매가 × 그 과일 판매자 수)를 수입으로 가져가고, 나머지 판매자는 그 과일에서 0 (최저가 동률이면 균등 분배, 나머지는 버림)
   · 아이템은 4라운드 중 딱 한 번, '교체'(희망가 제시 전에 내 과일 하나를 다른 과일로 바꿈 · 모두에게 공개) 또는 '비밀'(과일 하나의 판매가 · 수입 공개를 막음 · 누가 썼는지도 비공개) 중 하나
   · 4라운드 뒤 누적 수입 1위 = 우승, 최하위 = 탈락 후보. 개인 누적 수입은 비공개 (공개된 과일별 수입을 더하면 알 수 있어요)
   우리 판 다듬기(방송 문서에 없음): 사람 수 N(3~6)에 맞춰 과일은 3종만 쓰고, 각자 한 과일을 빼고 두 과일을 팔아요 (6명이면 과일마다 4명) ·
   모든 사람의 판매 과일은 공개 · 전원 수입이 같으면 무승부 (방송의 −10,000원 연장 라운드는 뺐어요) · 가격 단위는 1천 원 (1~5) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-fruit"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const FRUITS = [{ n: "사과", e: "🍎" }, { n: "포도", e: "🍇" }, { n: "수박", e: "🍉" }], ROUNDS = 4, PMAX = 5;
  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 40) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(6, n | 0 || 6));
    const c = cfg || {}, st = { n, rs: (seed >>> 0) || 1, cfg: c, rounds: c.rounds || ROUNDS, own: [], item: Array(n).fill(true), itemUsed: Array(n).fill(null), round: 0, phase: "swap", swapIn: Array(n).fill(null), prices: Array(n).fill(null), secret: Array(n).fill(-1), income: Array(n).fill(0), hist: [], over: false, ranks: null, score: Array(n).fill(0), log: [], seq: 0 };
    // 각자 한 과일을 빼요: 빠지는 과일을 3종에 고르게 섞어 나눠요
    let om = []; for (let i = 0; i < n; i++) om.push(i % 3);
    for (let i = om.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [om[i], om[j]] = [om[j], om[i]]; }
    if (c.omit) om = c.omit.slice();   // 시험용
    for (let i = 0; i < n; i++) st.own.push([0, 1, 2].filter(f => f !== om[i]));
    push(st, { k: "start" });
    return st;
  }
  const sellers = (st, f) => st.own.map((o, i) => (o.includes(f) ? i : -1)).filter(i => i >= 0);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "swap") return [...Array(st.n).keys()].filter(i => !st.swapIn[i]);   // 아이템이 없어도 모두 '계속'을 눌러요 (누가 남았는지 흐름으로 안 드러나게)
    return [...Array(st.n).keys()].filter(i => !st.prices[i]);
  }
  function resolveSwaps(st) {
    const sw = [];
    for (let i = 0; i < st.n; i++) {
      const a = st.swapIn[i];
      if (a && a.t === "swap") { st.own[i] = st.own[i].map(f => (f === a.from ? a.to : f)).sort(); st.item[i] = false; st.itemUsed[i] = "swap"; sw.push({ s: i, from: a.from, to: a.to }); }
    }
    st.curSwaps = sw; if (sw.length) push(st, { k: "swap", sw });
    st.phase = "price";
  }
  function resolvePrices(st) {
    const fr = [];
    const hide = new Set(st.secret.filter(f => f >= 0));
    for (let f = 0; f < 3; f++) {
      const S = sellers(st, f); if (!S.length) { fr.push({ f, price: null, sellers: [], inc: [], hidden: hide.has(f), all: [] }); continue; }
      const pr = S.map(i => st.prices[i].p[f]), mn = Math.min(...pr), L = S.filter((i, k) => pr[k] === mn), pool = mn * S.length, share = Math.floor(pool / L.length);
      const inc = S.map(i => (L.includes(i) ? share : 0));
      S.forEach((i, k) => { st.income[i] += inc[k]; });
      fr.push({ f, price: mn, sellers: S, inc, hidden: hide.has(f), pr });
    }
    for (let i = 0; i < st.n; i++) if (st.secret[i] >= 0) { st.item[i] = false; st.itemUsed[i] = "secret"; }
    const rec = { r: st.round, swaps: st.curSwaps || [], fruits: fr, secrets: st.secret.map((f, i) => (f >= 0 ? i : -1)).filter(i => i >= 0) };
    st.hist.push(rec);
    push(st, { k: "round", r: st.round, swaps: rec.swaps, hid: [...hide] });
    st.round++; st.curSwaps = [];
    st.swapIn = Array(st.n).fill(null); st.prices = Array(st.n).fill(null); st.secret = Array(st.n).fill(-1);
    if (st.round >= st.rounds) {
      st.over = true; st.phase = "over";
      const mx = Math.max(...st.income), mn = Math.min(...st.income);
      st.ranks = st.income.map(x => st.income.filter(y => y > x).length);
      st.score = st.income.slice(); st.draw = mx === mn;
      if (st.draw) st.ranks = Array(st.n).fill(0);
      st.losers = st.draw ? [] : st.income.map((x, i) => (x === mn ? i : -1)).filter(i => i >= 0);
      push(st, { k: "end" });
    } else st.phase = "swap";
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a) return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "swap") {
      if (st.swapIn[seat]) return { ok: false, err: "이미 정했어요 — 다른 사람을 기다려요" };
      if (a.t === "noswap") st.swapIn[seat] = { t: "no" };
      else if (a.t === "swap") {
        if (!st.item[seat]) return { ok: false, err: "아이템은 한 번만 쓸 수 있어요" };
        if (!st.own[seat].includes(a.from) || !Number.isInteger(a.to) || a.to < 0 || a.to > 2 || st.own[seat].includes(a.to)) return { ok: false, err: "내 과일 하나를, 내가 안 파는 과일로 바꿔요" };
        st.swapIn[seat] = { t: "swap", from: a.from, to: a.to };
      } else return { ok: false, err: "교체를 하거나 안 해요" };
      if (needs(st).length === 0) resolveSwaps(st);
      return { ok: true };
    }
    if (a.t !== "price") return { ok: false, err: "희망가를 정해요" };
    if (st.prices[seat]) return { ok: false, err: "이미 냈어요 — 다른 사람을 기다려요" };
    const p = a.p || {};
    for (const f of st.own[seat]) if (!Number.isInteger(p[f]) || p[f] < 1 || p[f] > PMAX) return { ok: false, err: "내 과일마다 1천~5천 원을 정해요" };
    let sec = -1;
    if (a.secret !== undefined && a.secret !== null && a.secret >= 0) {
      if (!st.item[seat]) return { ok: false, err: "아이템은 한 번만 쓸 수 있어요" };
      if (!Number.isInteger(a.secret) || a.secret > 2) return { ok: false, err: "숨길 과일을 골라요" };
      sec = a.secret;
    }
    st.prices[seat] = { p: { [st.own[seat][0]]: p[st.own[seat][0]], [st.own[seat][1]]: p[st.own[seat][1]] } };
    st.secret[seat] = sec;
    if (needs(st).length === 0) resolvePrices(st);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) {
    if (st.over) return [];
    if (st.phase === "swap") return !st.swapIn[seat] ? [{ t: "noswap" }] : [];
    if (st.prices[seat]) return [];
    return [{ t: "price", p: { [st.own[seat][0]]: PMAX, [st.own[seat][1]]: PMAX } }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const reveal = st.over || all;
    // 공개 기록: 비밀 과일은 판매가 · 수입을 감춰요 (판매자 본인 수입만 본인에게)
    const hist = st.hist.map(h => ({
      r: h.r, swaps: h.swaps.map(x => ({ s: x.s, from: x.from, to: x.to })),
      fruits: h.fruits.map(fr => {
        const hid = fr.hidden && !reveal;
        return { f: fr.f, hidden: !!fr.hidden, sellers: fr.sellers.slice(), price: hid ? null : fr.price, inc: hid ? fr.sellers.map(i => (i === me ? fr.inc[fr.sellers.indexOf(i)] : null)) : fr.inc.slice() };
      }),
      secretBy: reveal ? h.secrets.slice() : (me >= 0 && h.secrets.includes(me) ? [me] : []),
    }));
    // 내 누적 수입 (공개된 것 + 내가 본 비밀 과일 내 몫) = 실제 값
    const pub = { r: st.round, ph: st.phase, own: st.own, sub: needs(st), h: hist.length ? st.hist.map(h => [h.swaps, h.fruits.map(fr => [fr.f, fr.hidden ? null : fr.price, fr.hidden ? null : fr.inc, fr.hidden ? 1 : 0])]) : [], ov: st.over };
    const mineIn = me >= 0 ? st.income[me] : null;
    const v = {
      n: st.n, seat, round: st.round, rounds: st.rounds, phase: st.phase, own: st.own.map(o => o.slice()), item: me >= 0 ? st.item[me] : null,
      sellersOf: [0, 1, 2].map(f => sellers(st, f)), income: mineIn, hist, swapsNow: (st.curSwaps || []).map(x => ({ s: x.s, from: x.from, to: x.to })),
      swapIn: me >= 0 && st.swapIn[me] ? st.swapIn[me].t : null, mineP: me >= 0 && st.prices[me] ? Object.assign({}, st.prices[me].p) : null, mineSecret: me >= 0 ? st.secret[me] : -1,
      waiting: needs(st), needs: needs(st), over: st.over, ranks: st.over ? st.ranks.slice() : null, losers: st.over ? st.losers.slice() : [], draw: !!st.draw, score: st.over ? st.score.slice() : Array(st.n).fill(0),
      incomes: reveal ? st.income.slice() : null, prices: reveal ? st.hist.map(h => h.fruits.map(fr => (fr.pr ? fr.pr.slice() : []))) : null, log: st.log.slice(-30), pub: hash(JSON.stringify(pub)),
    };
    return v;
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  // 공개된 기록에서 다른 사람이 값을 깎았던 횟수를 세요 (최저가 · 수입을 가져가면서 5천 원보다 낮았던 사람)
  function observe(V, me) {
    const cut = Array(V.n).fill(0), seen = Array(V.n).fill(0), lastMin = [null, null, null];
    for (const h of V.hist) for (const fr of h.fruits) {
      if (fr.hidden && fr.price === null) { continue; }
      lastMin[fr.f] = fr.price;
      fr.sellers.forEach((i, k) => { if (i === me) return; seen[i]++; if (fr.price < PMAX && fr.inc[k] > 0) cut[i]++; });
    }
    return { cut, seen, lastMin };
  }
  const TIER = { easy: { coop: 0.55, bet: 0.0 }, normal: { coop: 0.85, bet: 0.4 }, hard: { coop: 1, bet: 1 } };
  function pickPrice(V, me, f, tier, r, ob) {
    const T = TIER[tier] || TIER.normal, S = V.sellersOf[f].filter(i => i !== me), left = V.rounds - V.round, last = left === 1;
    if (tier === "easy") { if (r() < T.coop) return PMAX; return [4, 3, 3, 2, 1][Math.floor(r() * 5)]; }
    const lm = ob.lastMin[f];
    if (tier === "normal") {
      const hurt = lm !== null && lm < PMAX;
      if (hurt) return Math.max(1, lm - (r() < 0.3 ? 1 : 0));
      if (last && r() < T.bet) return 4;
      return PMAX;
    }
    // hard: 상대마다 '깎을 가능성'을 어림해 기대 수입이 가장 큰 가격을 골라요 (몬테카를로)
    const base = [0.12, 0.2, 0.3, 0.55][Math.min(3, V.round)], q = S.map(i => {
      const rate = ob.seen[i] ? ob.cut[i] / ob.seen[i] : 0;
      let x = base + 0.5 * rate; if (lm !== null && lm < PMAX && !ob.cut[i]) x += 0.25;   // 가격 전쟁 분위기
      return Math.min(0.9, x);
    });
    const M = 160; let bestP = PMAX, bestE = -1;
    const draw = () => { const u = r(); return u < 0.5 ? 4 : u < 0.75 ? 3 : u < 0.9 ? 2 : 1; };
    const samples = []; for (let m = 0; m < M; m++) samples.push(q.map(x => (r() < x ? draw() : PMAX)));
    const k = V.sellersOf[f].length;
    for (let p = 1; p <= PMAX; p++) {
      let E = 0;
      for (const opp of samples) { const mn = Math.min(p, ...opp), win = opp.filter(x => x === mn).length + (p === mn ? 1 : 0); E += p === mn ? Math.floor(mn * k / win) : 0; }
      E /= M;
      // 깎으면 다음 라운드부터 상대가 따라 깎아요 → 남은 라운드가 많을수록 깎는 값에 벌점
      if (p < PMAX && !last) E -= 1.6 * (left - 1) * (PMAX - p) / 4 * 1.2;
      if (E > bestE) { bestE = E; bestP = p; }
    }
    return bestP;
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "swap") return { t: "noswap" };
    const ob = observe(V, me), p = {};
    for (const f of V.own[me]) p[f] = pickPrice(V, me, f, tier, r, ob);
    let secret = -1;
    if (V.item && V.round < V.rounds - 1) {
      const cutF = V.own[me].filter(f => p[f] < PMAX);
      const prob = tier === "hard" ? 1 : tier === "normal" ? 0.5 : 0.15;
      if (cutF.length && r() < prob) secret = cutF[0];
    }
    return secret >= 0 ? { t: "price", p, secret } : { t: "price", p };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const won = x => `${x * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`), fn = f => FRUITS[f].e + FRUITS[f].n;
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      return { opp: V.draw ? "모두 수입이 같아 무승부예요." : `최하위: ${V.losers.map(nm).join(" · ")}`, mine: `내 수입 ${won(V.incomes[me])}`, rec: V.draw ? "무승부" : first.includes(me) ? "이겼어요!" : "아깝네요", why: "과일마다 가장 싼 값을 낸 사람이 그 과일 수입을 독식해요. 서로 믿고 같은 값을 내면 똑같이 나눠 가져요." };
    }
    const ob = observe(V, me), mine = V.own[me].map(fn).join(" · ");
    const cutters = ob.cut.map((c, i) => (c > 0 && i !== me ? `${nm(i)}(${c}번)` : null)).filter(Boolean);
    const opp = V.hist.length ? `지난 라운드까지 값을 깎아 수입을 독식한 사람: ${cutters.length ? cutters.join(" · ") : "없음"} · 지난 라운드 판매가 ${[0, 1, 2].map(f => (ob.lastMin[f] === null ? null : `${FRUITS[f].e}${ob.lastMin[f]}천`)).filter(Boolean).join(" ")}` : "아직 공개된 정보가 없어요 — 첫 라운드예요.";
    const info = `${V.round + 1}/${V.rounds} 라운드 · 내 과일 ${mine} · 내 수입 ${won(V.income)}${V.item ? " · 아이템 남음(교체 또는 비밀 1번)" : ""}`;
    if (!V.needs.includes(me)) return { opp, mine: info, rec: "다른 사람을 기다려요", why: "이미 냈어요." };
    if (V.phase === "swap") return { opp, mine: info, rec: "이번엔 교체하지 않아요", why: "교체는 희망가를 내기 전에 내 과일 하나를 바꾸는 아이템이에요 (한 번만, 모두에게 공개). 판매자가 적은 과일로 옮기면 독식할 수 있지만, 지금은 비밀 아이템을 아껴 둬요." };
    const sd = V.round * 77 + V.hist.length * 11 + me * 3 + 5, a = ai(V, me, "hard", sampler(sd));
    const rec = V.own[me].map(f => `${fn(f)} ${a.p[f]}천 원`).join(" · ") + (a.secret !== undefined ? ` · 🔒 ${fn(a.secret)} 비밀` : "");
    const cutNow = V.own[me].filter(f => a.p[f] < PMAX).length > 0;
    const why = cutNow ? "다른 사람이 값을 깎을 것 같아서 나도 깎아요. 가장 싼 값을 혼자 내면 (판매가 × 판매자 수)를 독식하지만, 같이 깎으면 서로 손해예요." + (a.secret !== undefined ? " 비밀 아이템으로 이 과일의 결과를 숨기면 다음 라운드에 보복당할 걱정이 줄어요." : "") : "모두가 5천 원을 내면 과일마다 똑같이 나눠 가져요(1인 1만 원). 깎을 신호가 없어서 약속을 지켜요.";
    return { opp, mine: info, rec, why };
  }

  return { id: "gn-fruit", FRUITS, ROUNDS, PMAX, sellers, init, needs, apply, view, over, ranks, legal, auto, advance, ai, observe, pickPrice, coach, won, TIER };
});

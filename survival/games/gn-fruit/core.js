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
    const ev = evPrices(V, me, f, r, ob);
    let bestP = PMAX, bestE = -1;
    for (let p = 1; p <= PMAX; p++) if (ev.adj[p] > bestE) { bestE = ev.adj[p]; bestP = p; }
    return bestP;
  }
  // 상대(나 빼고 이 과일 판매자)마다 이번 라운드에 값을 깎을 가능성 어림 — hard 의 판단과 복기 평가가 같이 써요
  function cutProbs(V, me, f, ob) {
    const S = V.sellersOf[f].filter(i => i !== me), lm = ob.lastMin[f], base = [0.12, 0.2, 0.3, 0.55][Math.min(3, V.round)];
    return S.map(i => {
      const rate = ob.seen[i] ? ob.cut[i] / ob.seen[i] : 0;
      let x = base + 0.5 * rate; if (lm !== null && lm < PMAX && !ob.cut[i]) x += 0.25;   // 가격 전쟁 분위기
      return Math.min(0.9, x);
    });
  }
  // 내 희망가 p(1~5) 의 기대 수입: raw = 이번 라운드만 · adj = 값을 깎으면 다음 라운드부터 상대가 따라 깎는 벌점까지 뺀 값 (hard 가 고르는 기준)
  function evPrices(V, me, f, r, ob) {
    const left = V.rounds - V.round, last = left === 1, q = cutProbs(V, me, f, ob), M = 160, k = V.sellersOf[f].length;
    const draw = () => { const u = r(); return u < 0.5 ? 4 : u < 0.75 ? 3 : u < 0.9 ? 2 : 1; };
    const samples = []; for (let m = 0; m < M; m++) samples.push(q.map(x => (r() < x ? draw() : PMAX)));
    const raw = [0], adj = [0], pen = [0];
    for (let p = 1; p <= PMAX; p++) {
      let E = 0;
      for (const opp of samples) { const mn = Math.min(p, ...opp), win = opp.filter(x => x === mn).length + (p === mn ? 1 : 0); E += p === mn ? Math.floor(mn * k / win) : 0; }
      E /= M;
      const pn = p < PMAX && !last ? 1.6 * (left - 1) * (PMAX - p) / 4 * 1.2 : 0;   // 깎으면 다음 라운드부터 상대가 따라 깎아요 → 남은 라운드가 많을수록 벌점
      raw.push(E); pen.push(pn); adj.push(E - pn);
    }
    return { raw, adj, pen, q, k };
  }
  // 복기 평가: 내 과일마다 희망가별 기대 수입 (받은 view 를 바꾸지 않고, 씨앗만 쓰는 순수 함수)
  function evalPrices(V, me, seed) {
    const ob = observe(V, me), r = sampler(seed);
    return V.own[me].map(f => Object.assign({ f }, evPrices(V, me, f, r, ob)));
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
  // 공개된 기록에서 본 각 자리의 수입 (비밀 과일은 모름 — 내 몫만 알아요) → [{ i, inc }]
  function pubIncome(V, me) {
    const inc = Array(V.n).fill(0);
    for (const h of V.hist) for (const fr of h.fruits) fr.sellers.forEach((i, k) => { if (fr.inc[k] !== null && fr.inc[k] !== undefined) inc[i] += fr.inc[k]; });
    return inc;
  }
  const f1 = x => (Math.abs(x) < 0.05 ? "0.0" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(1));
  const pct = x => Math.round(x * 100) + "%";
  const anyCut = q => 1 - q.reduce((s, x) => s * (1 - x), 1);
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`), fn = f => FRUITS[f].e + FRUITS[f].n;
    const seated = Number.isInteger(me) && me >= 0 && V.own && V.own[me];
    if (V.over) {
      const inc = V.incomes || [], mx = Math.max(...inc), mn = Math.min(...inc);
      let cutN = 0, coopN = 0; for (const h of V.hist) for (const fr of h.fruits) { if (fr.price === null || !fr.sellers.length) continue; if (fr.price < PMAX) cutN++; else coopN++; }
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), rk = seated ? V.ranks[me] + 1 : 0;
      return {
        opp: (V.draw ? "모두 수입이 같아 무승부예요." : `최하위: ${V.losers.map(nm).join(" · ")}`) + ` · 수입(천 원) ${inc.map((x, i) => `${nm(i)} ${x}`).join(" / ")}`,
        mine: seated ? `내 수입 ${won(inc[me])} · ${V.draw ? "무승부" : `${rk}위 (1위와 ${mx - inc[me]}천 원 차이 · 최하위와 ${inc[me] - mn}천 원 차이)`}` : `1위 수입 ${won(mx)} · 최하위 ${won(mn)}`,
        rec: V.draw ? "무승부" : seated && first.includes(me) ? "이겼어요!" : "아깝네요",
        why: `4라운드 동안 과일별로 값을 깎아 독식한 판 ${cutN}번, 5천 원으로 똑같이 나눈 판 ${coopN}번이었어요. 과일마다 가장 싼 값을 낸 사람이 그 과일 수입을 독식하고, 서로 믿고 같은 값을 내면 똑같이 나눠 가져요 (모두 5천 원이면 1인 1만 원).`,
      };
    }
    if (!seated) return { opp: "구경 중이에요 — 과일마다 가장 싼 값을 낸 사람이 그 과일의 수입을 독식해요.", mine: `${V.round + 1}/${V.rounds} 라운드 · ${V.phase === "swap" ? "교체 단계" : "희망가 단계"}`, rec: "자리에 앉으면 내 차례마다 알려 드려요", why: "판매가 = 그 과일 판매자 희망가 중 최저가, 최저가를 낸 사람이 (판매가 × 판매자 수)를 가져가요. 모두 5천 원이면 과일마다 5천 원씩 나눠요." };
    const ob = observe(V, me), mine = V.own[me].map(fn).join(" · ");
    const cutters = ob.cut.map((c, i) => (c > 0 && i !== me ? `${nm(i)} ${c}/${ob.seen[i]}번` : null)).filter(Boolean);
    const pi = pubIncome(V, me); pi[me] = V.income;
    const lead = pi.map((x, i) => [x, i]).filter(x => x[1] !== me).sort((a, b) => b[0] - a[0])[0];
    const sdQ = V.round * 77 + V.hist.length * 11 + me * 3 + 5, evs = V.phase === "price" ? evalPrices(V, me, sdQ) : [];
    const qs = V.phase === "price" ? evs.map(e => `${FRUITS[e.f].e}${FRUITS[e.f].n} ${pct(anyCut(e.q))}`) : [];
    const opp = V.hist.length
      ? `값을 깎아 독식한 횟수(깎음/본 횟수): ${cutters.length ? cutters.join(" · ") : "아직 없음"} · 지난 라운드 판매가 ${[0, 1, 2].map(f => (ob.lastMin[f] === null ? null : `${FRUITS[f].e}${ob.lastMin[f]}천`)).filter(Boolean).join(" ")}${qs.length ? ` · 이번에 누가 깎을 가능성(내 어림): ${qs.join(" · ")}` : ""}`
      : `아직 공개된 정보가 없어요 — 첫 라운드예요. 처음엔 다들 5천 원을 낼 가능성이 커요 (사람마다 깎을 가능성 어림 약 ${pct(cutProbs(V, me, V.own[me][0], ob)[0] || 0.12)})${qs.length ? ` · 이번에 누가 깎을 가능성(내 어림): ${qs.join(" · ")}` : ""}.`;
    const info = `${V.round + 1}/${V.rounds} 라운드 · 내 과일 ${mine} · 내 수입 ${won(V.income)}${lead && V.hist.length ? ` (공개된 수입으로 본 다른 사람 최고 ${won(lead[0])}${lead[0] > V.income ? ` — ${lead[0] - V.income}천 원 앞섬` : ""} · 비밀 과일 제외)` : ""}${V.item ? " · 아이템 남음(교체 또는 비밀 1번)" : " · 아이템 씀"}`;
    if (!V.needs.includes(me)) return { opp, mine: info, rec: "다른 사람을 기다려요", why: "이미 냈어요." };
    if (V.phase === "swap") {
      const to = [0, 1, 2].find(f => !V.own[me].includes(f)), kt = V.sellersOf[to].length, qt = anyCut(cutProbs(V, me, to, ob));
      const cnt = [0, 1, 2].map(f => `${FRUITS[f].e}${V.sellersOf[f].length}명`).join(" ");
      return {
        opp, mine: info, rec: V.item ? "이번엔 교체하지 않아요" : "아이템을 이미 썼어요 — '계속'을 눌러요",
        why: `지금 판매자 수 ${cnt}. 교체하면 판매자가 적은 쪽으로 옮겨 독식 몫(값 × 판매자 수)이 달라지지만, ${FRUITS[to].e}${FRUITS[to].n}(지금 ${kt}명 → ${kt + 1}명)에서 누가 깎을 가능성은 약 ${pct(qt)}라 얻는 것이 뚜렷하지 않아요. 아이템은 교체 · 비밀 중 한 번뿐이라 비밀을 아껴 둬요.`,
      };
    }
    const a = ai(V, me, "hard", sampler(sdQ));
    const rec = V.own[me].map(f => `${fn(f)} ${a.p[f]}천 원`).join(" · ") + (a.secret !== undefined ? ` · 🔒 ${fn(a.secret)} 비밀` : "");
    const lines = evs.map(e => {
      const p = a.p[e.f], k = e.k, last = V.rounds - V.round === 1;
      if (p < PMAX) return `${fn(e.f)}: 판매자 ${k}명, 혼자 ${p}천 원이면 ${p}×${k}=${p * k}천 원 독식 · 한 명이라도 깎을 확률 ${pct(anyCut(e.q))} → ${p}천 원 기대 ${f1(e.adj[p])}천 (이번 라운드만 ${f1(e.raw[p])}${last ? "" : `, 다음 라운드부터 따라 깎일 위험 ${f1(-e.pen[p])}`}) vs 5천 원 ${f1(e.adj[PMAX])}천`;
      return `${fn(e.f)}: 판매자 ${k}명, 한 명이라도 깎을 확률 ${pct(anyCut(e.q))} → 5천 원 기대 ${f1(e.adj[PMAX])}천 vs 4천 원 ${f1(e.adj[4])}천 (깎아도 이번 라운드만 ${f1(e.raw[4])}, 깎을수록 다음 라운드부터 따라 깎여요)`;
    });
    const cutNow = lines.length > 0 && V.own[me].some(f => a.p[f] < PMAX);
    const why = lines.join(" / ") + (cutNow ? " — 같이 깎으면 서로 손해예요." + (a.secret !== undefined ? " 비밀 아이템으로 이 과일의 결과를 숨기면 다음 라운드에 보복당할 걱정이 줄어요." : "") : " — 깎을 신호가 없어서 약속을 지켜요 (모두 5천 원이면 1인 1만 원).");
    return { opp, mine: info, rec, why };
  }

  return { id: "gn-fruit", FRUITS, ROUNDS, PMAX, sellers, init, needs, apply, view, over, ranks, legal, auto, advance, ai, observe, pickPrice, cutProbs, evPrices, evalPrices, sampler, pubIncome, coach, won, TIER };
});

/* 베니 서바이벌 · 투자와 기부 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 블랙가넷 8화 메인 매치 — 6명, 1인당 현금 15만 원, 9라운드
   · 라운드마다 모두가 투자 · 기부 금액을 비공개로 내요 (0원 가능). 라운드가 끝나면 투자 총액 · 기부 총액 · 대주주 · 수전노만 공개
   · 대주주 = 투자를 가장 많이 한 1명 (동률이면 아무도 못 받고, 그다음으로 많이 낸 사람이 받아요 — 그다음도 동률이면 없음)
   · 수전노 = 기부를 가장 적게 한 사람 (동률이면 모두). 단 그 라운드의 대주주는 수전노를 받지 않고, 나머지 중 가장 적게 기부한 사람이 받아요
   · 9라운드 뒤: 수전노 표식이 가장 많은 사람이 최하위(탈락 후보) → 나머지 중 대주주 표식이 가장 많은 사람이 우승
   우리 판 다듬기(방송 문서에 없음): 지폐 단위(거스름돈 없음)는 빼고 1,000원 단위로 자유롭게 내요 (남은 돈 안에서) ·
   대주주 동률은 '다음 순위 한 명만' 받는 걸로 정했어요 · 수전노 표식 최다가 모두 같으면 무승부 · 방송의 연합 · 협상은 AI 로 대신해요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-invest"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 9, CASH = 150;   // 1,000원 단위 (150 = 15만 원)
  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 40) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(6, n | 0 || 6));
    const c = cfg || {};
    return { n, rs: (seed >>> 0) || 1, cfg: c, rounds: c.rounds || ROUNDS, cash: Array(n).fill(c.cash || CASH), bids: Array(n).fill(null), round: 0, hist: [], bigC: Array(n).fill(0), misC: Array(n).fill(0), over: false, ranks: null, score: Array(n).fill(0), log: [], seq: 0 };
  }
  const needs = st => (st.over ? [] : [...Array(st.n).keys()].filter(i => !st.bids[i]));

  // 대주주: 투자 최다 1명. 동률이면 없음 → 그다음 금액 한 사람이 받아요 (그것도 동률이면 없음). 투자 0 은 못 받아요
  function pickBig(v) {
    const lv = [...new Set(v)].filter(x => x > 0).sort((a, b) => b - a);
    for (let k = 0; k < Math.min(2, lv.length); k++) {
      const h = v.map((x, i) => (x === lv[k] ? i : -1)).filter(i => i >= 0);
      if (h.length === 1) return h[0];
      if (k === 1) return -1;
    }
    return -1;
  }
  function pickMiser(d, big) {
    const c = d.map((x, i) => i).filter(i => i !== big);
    const mn = Math.min(...c.map(i => d[i]));
    return c.filter(i => d[i] === mn);
  }
  function rankAll(st) {
    const n = st.n, mx = Math.max(...st.misC), lose = st.misC.map(x => x === mx);
    if (lose.every(Boolean)) return { ranks: Array(n).fill(0), score: Array(n).fill(0), losers: [...Array(n).keys()], draw: true };
    const rest = [...Array(n).keys()].filter(i => !lose[i]);
    const better = (a, b) => st.bigC[a] > st.bigC[b] || (st.bigC[a] === st.bigC[b] && st.misC[a] < st.misC[b]);
    const ranks = Array(n).fill(0), score = Array(n).fill(0);
    for (const i of rest) { ranks[i] = rest.filter(j => better(j, i)).length; score[i] = st.bigC[i]; }
    for (let i = 0; i < n; i++) if (lose[i]) ranks[i] = rest.length;
    return { ranks, score, losers: [...Array(n).keys()].filter(i => lose[i]), draw: false };
  }
  function resolve(st) {
    const v = st.bids.map(b => b.v), d = st.bids.map(b => b.d), big = pickBig(v), miser = pickMiser(d, big);
    const ti = v.reduce((s, x) => s + x, 0), td = d.reduce((s, x) => s + x, 0);
    for (let i = 0; i < st.n; i++) st.cash[i] -= v[i] + d[i];
    if (big >= 0) st.bigC[big]++;
    for (const i of miser) st.misC[i]++;
    st.hist.push({ r: st.round, ti, td, big, miser, v, d });
    push(st, { k: "round", r: st.round, ti, td, big, miser });
    st.bids = Array(st.n).fill(null); st.round++;
    if (st.round >= st.rounds) {
      const R = rankAll(st); st.over = true; st.ranks = R.ranks; st.score = R.score; st.losers = R.losers; st.draw = R.draw;
      push(st, { k: "end", losers: R.losers, draw: R.draw });
    }
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a || a.t !== "bid") return { ok: false, err: "투자와 기부 금액을 정해요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.bids[seat]) return { ok: false, err: "이미 냈어요 — 다른 사람을 기다려요" };
    const v = a.v, d = a.d;
    if (!Number.isInteger(v) || !Number.isInteger(d) || v < 0 || d < 0) return { ok: false, err: "금액은 0 이상의 1,000원 단위예요" };
    if (v + d > st.cash[seat]) return { ok: false, err: `가진 돈(${st.cash[seat]}천 원)보다 많이 낼 수 없어요` };
    st.bids[seat] = { v, d };
    if (st.bids.every(Boolean)) resolve(st);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  const legal = (st, seat) => (st.over || st.bids[seat] ? [] : [{ t: "bid", v: 0, d: Math.min(st.cash[seat], 3) }]);

  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const reveal = st.over || all;
    const hist = st.hist.map(h => ({ r: h.r, ti: h.ti, td: h.td, big: h.big, miser: h.miser.slice(), mv: me >= 0 ? h.v[me] : null, md: me >= 0 ? h.d[me] : null }));
    const pubObj = { r: st.round, sub: st.bids.map(b => (b ? 1 : 0)), h: st.hist.map(h => [h.ti, h.td, h.big, h.miser]), ov: st.over };
    const v = {
      n: st.n, seat, round: st.round, rounds: st.rounds, cash: me >= 0 ? st.cash[me] : null, submitted: st.bids.map(b => !!b), mineBid: me >= 0 && st.bids[me] ? { v: st.bids[me].v, d: st.bids[me].d } : null,
      hist, bigC: st.bigC.slice(), misC: st.misC.slice(), needs: needs(st), over: st.over, ranks: st.over ? st.ranks.slice() : null, score: st.over ? st.score.slice() : Array(st.n).fill(0), losers: st.over ? st.losers.slice() : [], draw: !!st.draw,
      amts: reveal ? st.hist.map(h => ({ v: h.v.slice(), d: h.d.slice() })) : null, cashes: reveal ? st.cash.slice() : null,
      log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
    return v;
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  // 다른 사람 1인 평균 투자 · 기부 = (공개된 합계 − 내 금액) / (n − 1)
  function observe(V) {
    let oi = 0, od = 0, k = 0;
    for (const h of V.hist) { if (h.mv === null) continue; oi += (h.ti - h.mv) / (V.n - 1); od += (h.td - h.md) / (V.n - 1); k++; }
    return { aInv: k ? oi / k : 5, aDon: k ? od / k : 4, k };
  }
  // 돈은 남겨 봐야 쓸모없어요 → 남은 돈을 남은 라운드에 나눠 쓰는 게 기본 (b = 한 라운드 평균 예산)
  // easy 는 예산을 안 보고 감으로 · normal 은 예산만 · hard 는 관찰(다른 사람 평균)과 마지막 라운드 전액 사용까지
  const TIER = { easy: { atk: 0.42, av: 2.0, df: 0.45, nz: 1.0, bud: 0, obs: 0, last: 0 }, normal: { atk: 0.33, av: 2.4, df: 0.75, nz: 0.6, bud: 1, obs: 0, last: 1 }, hard: { atk: 0.35, av: 1.8, df: 0.7, nz: 0.4, bud: 1, obs: 0, last: 1 } };
  function plan(V, me, tier, r) {
    const T = TIER[tier] || TIER.normal, C = V.cash, R = V.rounds - V.round, o = observe(V);
    const myMis = V.misC[me], maxMis = Math.max(...V.misC), myBig = V.bigC[me], maxBig = Math.max(...V.bigC);
    const nz = (r() - 0.5) * 2 * T.nz, b = T.bud ? C / R : 8;
    if (R === 1 && T.last) {   // 마지막 라운드: 남은 돈 전부 (대주주를 노리면서 기부로 수전노도 피해요)
      const v = Math.round(C * 0.62 + nz * C * 0.1), d = C - v;
      return { v: Math.max(0, Math.min(C, v)), d: Math.max(0, d), mode: "last" };
    }
    let pAtk = T.atk;
    if (R <= 3 && myBig < maxBig) pAtk += 0.25;
    if (R <= 3 && myBig === 0) pAtk += 0.15;
    if (myMis >= maxMis && myMis > 0) pAtk -= 0.2;   // 수전노가 가장 많으면 위험 — 기부로 방어
    if (C < b * 1.5) pAtk = 0;
    if (r() < pAtk) {
      let v = Math.round(b * T.av * (1 + nz * 0.4));
      if (T.obs && o.k) v = Math.max(v, Math.round(o.aInv * 2.6));
      v = Math.max(2, Math.min(v, Math.round(C - b * 0.3)));
      return { v, d: Math.max(0, Math.min(C - v, Math.round(b * 0.25))), mode: "atk" };
    }
    let d = Math.round(b * T.df * (1 + nz * 0.5));
    if (T.obs && o.k) d = Math.max(d, Math.round(o.aDon * 1.15));
    d = Math.max(myMis >= maxMis && myMis > 0 ? 2 : 1, d);
    return { v: 0, d: Math.min(d, C), mode: "def" };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const p = plan(V, me, tier, r), C = V.cash;
    let v = p.v, d = p.d; if (v + d > C) { v = Math.max(0, C - d); if (v + d > C) d = C - v; }
    return { t: "bid", v: Math.max(0, v | 0), d: Math.max(0, d | 0) };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const won = x => `${x * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      return { opp: V.draw ? "수전노 표식이 모두 같아 무승부예요." : `최하위(수전노 최다): ${V.losers.map(nm).join(" · ")}`, mine: `내 표식 — 대주주 ${V.bigC[me]} · 수전노 ${V.misC[me]}`, rec: V.draw ? "무승부" : first.includes(me) ? "이겼어요!" : V.losers.includes(me) ? "수전노가 가장 많았어요" : "아깝네요", why: "수전노가 가장 많으면 최하위, 나머지 중 대주주가 가장 많은 사람이 우승이에요." };
    }
    const o = observe(V), last = V.hist.length ? V.hist[V.hist.length - 1] : null;
    const opp = V.hist.length ? `지난 라운드까지 다른 사람 평균: 투자 ${o.aInv.toFixed(1)}천 원 · 기부 ${o.aDon.toFixed(1)}천 원 / 라운드${last ? ` · 지난 라운드 대주주 ${last.big >= 0 ? nm(last.big) : "없음"} · 수전노 ${last.miser.map(nm).join("·")}` : ""}.` : "아직 공개된 정보가 없어요 — 첫 라운드예요.";
    const mine = `${V.round + 1}/${V.rounds} 라운드 · 남은 돈 ${won(V.cash)} · 내 표식 대주주 ${V.bigC[me]} / 수전노 ${V.misC[me]} · 최다 수전노 ${Math.max(...V.misC)}`;
    if (!V.needs.includes(me)) return { opp, mine, rec: "다른 사람을 기다려요", why: "이미 냈어요." };
    const p = plan(V, me, "hard", sampler(V.round * 97 + V.hist.length * 13 + me + 7));
    const a = ai(V, me, "hard", sampler(V.round * 97 + V.hist.length * 13 + me + 7));
    const rec = `투자 ${won(a.v)} · 기부 ${won(a.d)}`;
    const why = p.mode === "last" ? "마지막 라운드예요: 남은 돈은 끝나면 쓸모가 없으니 전부 써요. 투자 6 · 기부 4 정도로 나눠 대주주도 노리고 수전노도 피해요."
      : p.mode === "atk" ? `이번 라운드는 대주주를 노려요: 남은 돈을 남은 라운드로 나눈 예산(${won(Math.round(V.cash / (V.rounds - V.round)))})의 약 2배를 투자하고 기부는 조금만 해요. 같은 금액을 낸 사람이 있으면 대주주가 못 되고, 못 되면 수전노까지 받을 수 있어요.`
        : `이번 라운드는 수전노를 피해요: 투자는 하지 않고 예산(${won(Math.round(V.cash / (V.rounds - V.round)))})의 70% 정도를 기부해요. 기부가 가장 적은 사람이 수전노예요 (대주주는 면제). 돈은 남겨 봐야 쓸모없으니 골고루 써요.`;
    return { opp, mine, rec, why };
  }

  return { id: "gn-invest", ROUNDS, CASH, pickBig, pickMiser, rankAll, init, needs, apply, view, over, ranks, legal, auto, advance, ai, plan, observe, coach, won, TIER };
});

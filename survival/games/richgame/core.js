/* 베니 서바이벌 · 부자 게임 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌 1 6일차 메인 매치 '부자 게임' — 나무위키 '피의 게임(시즌 1)/6일차' 문서 룰 · 가격표 · 종목 정체 확인
   · 종목 4개 (A 부동산 · B 가상화폐 · C 현물 · D 주식), 5라운드. 모두 종목마다 칩 10개씩 (그 종목에만 입찰 가능 · 쓴 칩은 돌려받지 않음)
   · 라운드마다 종목에 칩을 걸어 입찰 (동시 · 비공개) → 라운드 가격이 공개되면 종목마다 칩을 가장 많이 건 사람이 그 종목 값(가격)을 가짐
     같은 칩이 가장 많으면 그 입찰은 무효 → 차순위 입찰자가 가짐 (차순위가 없으면 유찰)
   · 아이템: 등락 정보(고른 종목의 이번 라운드 등락: 폭등 · 상승 · 하락 · 폭락) · 정보 공개권(종목 정체) — 방송은 개인 자금으로 샀지만 우리는 한 장씩
   · 5라운드 뒤 가진 금액이 가장 많은 사람이 승 · 종목 정체 공개
   방송 시세(기본): R1 5.35 / 10.74 / 6.9507 / 9.872 · R2 5.7 / 1.58 / 6.1878 / 8.638 · R3 5.95 / 0.896 / 7.0182 / 6.125 · R4 8.8 / 1.044 / 6.408 / 3.948 · R5 10.5 / 5.596 / 7.3944 / 7.658 (억 원)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 view 에서 만든 씨앗만). 금액은 만 원 단위 정수. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["richgame"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NC = 4, NR = 5, CHIPS = 10;
  const KIND = ["부동산", "가상화폐", "현물", "주식"], CODE = ["A", "B", "C", "D"];
  // 방송 시세 (만 원)
  const BROAD = [[53500, 107400, 69507, 98720], [57000, 15800, 61878, 86380], [59500, 8960, 70182, 61250], [88000, 10440, 64080, 39480], [105000, 55960, 73944, 76580]];
  const IDENT = ["세종시 아파트 33평 1채", "리플 40만 개", "휘발유 45,000L", "남양유업 14,000주"];
  const TREND = { surge: "폭등", up: "상승", down: "하락", crash: "폭락" };
  const trendOf = (a, b) => { const r = b / a; return r >= 1.4 ? "surge" : r >= 1 ? "up" : r > 0.6 ? "down" : "crash"; };
  const OPTS = { mode: [0, 1], items: [1, 0] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const man = m => { const e = Math.floor(m / 10000), r = m % 10000; return e ? (r ? `${e}억 ${r.toLocaleString("en-US")}만` : `${e}억`) : `${r.toLocaleString("en-US")}만`; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.sq++; st.log.push(e); }

  // 새 시세: 종목마다 변동 등급 (1 작음 · 2 보통 · 3 큼) 이 무작위로 정해지고, 가격은 그 크기로 움직임
  function newPrices(R) {
    const vols = [1, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = vols[i]; vols[i] = vols[j]; vols[j] = t; }
    const base = vols.map(v => Math.round((v === 3 ? 4 + R() * 7 : 5 + R() * 5) * 10000));
    const pr = [base.slice()];
    for (let r = 1; r < NR; r++) pr.push(pr[r - 1].map((p, c) => {
      const v = vols[c]; let f;
      if (v === 1) f = 0.88 + R() * 0.28;
      else if (v === 2) f = 0.62 + R() * 0.9;
      else f = R() < 0.55 ? 0.15 + R() * 0.7 : 1.15 + R() * 2.6;
      return Math.max(3000, Math.round(p * f / 10) * 10);
    }));
    return { pr, vols };
  }
  function init({ n, seed, cfg }) {
    const o = optsOf(cfg || {}), rs = (seed >>> 0) || 1, N = Math.max(3, Math.min(6, n | 0 || 4)), R = seeded(rs ^ 0x7A11E5);
    let prices, vols = [0, 0, 0, 0];
    if (o.mode === 0) prices = BROAD.map(r => r.slice()); else { const g = newPrices(R); prices = g.pr; vols = g.vols; }
    const st = { n: N, rs, cfg: Object.assign({}, cfg || {}), opt: o, prices, vols, round: 0, phase: "bid", bids: Array(N).fill(null), chips: Array.from({ length: N }, () => Array(NC).fill(CHIPS)),
      money: Array(N).fill(0), items: Array.from({ length: N }, () => (o.items ? { trend: 1, id: 1 } : { trend: 0, id: 0 })), intel: Array.from({ length: N }, () => []), hist: [], log: [], sq: 0, over: false, res: null };
    push(st, { k: "start", n: N, mode: o.mode });
    return st;
  }
  const needs = st => (st.over ? [] : st.bids.map((b, s) => (b ? -1 : s)).filter(s => s >= 0));
  const over = st => !!st.over;
  function ranks(st) {
    if (!st.over) return Array(st.n).fill(0);
    return st.money.map(m => st.money.filter(x => x > m).length);
  }
  const auto = () => null;
  function advance() {}

  // 한 종목 낙찰: 칩이 가장 많은 사람 (같으면 그 입찰 무효 → 차순위), 없으면 -1
  function winnerOf(vals) {
    const e = vals.map((b, s) => [b, s]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
    let i = 0;
    while (i < e.length) { let j = i; while (j < e.length && e[j][0] === e[i][0]) j++; if (j - i === 1) return { w: e[i][1], b: e[i][0] }; i = j; }
    return { w: -1, b: 0 };
  }
  function resolve(st) {
    const r = st.round, pr = st.prices[r], win = [], wb = [];
    for (let c = 0; c < NC; c++) { const x = winnerOf(st.bids.map(b => b[c])); win.push(x.w); wb.push(x.b); if (x.w >= 0) st.money[x.w] += pr[c]; }
    for (let s = 0; s < st.n; s++) for (let c = 0; c < NC; c++) st.chips[s][c] -= st.bids[s][c];
    const h = { r, prices: pr.slice(), bids: st.bids.map(b => b.slice()), win, wb };
    st.hist.push(h); push(st, { k: "round", r, prices: pr.slice(), bids: h.bids, win, wb });
    st.bids = Array(st.n).fill(null); st.round++;
    if (st.round >= NR) { st.over = true; st.phase = "end"; st.res = { money: st.money.slice(), ident: IDENT.slice(), mode: st.opt.mode }; push(st, { k: "end" }); }
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "이미 걸었어요 — 다른 사람을 기다려요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (a.t === "item") {
      if (!st.opt.items) return { ok: false, err: "아이템이 꺼져 있어요" };
      const k = a.k, c = a.c;
      if (k !== "trend" && k !== "id") return { ok: false, err: "아이템을 골라요" };
      if (!Number.isInteger(c) || c < 0 || c >= NC) return { ok: false, err: "종목을 골라요" };
      if (!(st.items[seat][k] > 0)) return { ok: false, err: "이미 쓴 아이템이에요" };
      if (k === "trend" && st.round < 1) return { ok: false, err: "첫 라운드는 비교할 지난 가격이 없어요 (등락 정보는 2라운드부터)" };
      st.items[seat][k]--;
      const e = k === "trend" ? { r: st.round, k, c, v: trendOf(st.prices[st.round - 1][c], st.prices[st.round][c]) }
        : { r: st.round, k, c, text: st.opt.mode === 0 ? IDENT[c] : `변동 ${["", "작음", "보통", "큼"][st.vols[c]]}` };
      st.intel[seat].push(e); push(st, { k: "item", s: seat, r: st.round, item: k, c });
      return { ok: true };
    }
    if (a.t !== "bid") return { ok: false, err: "칩을 걸어요" };
    const b = a.bids;
    if (!Array.isArray(b) || b.length !== NC) return { ok: false, err: "종목 4개에 모두 정해요 (0도 괜찮아요)" };
    for (let c = 0; c < NC; c++) {
      if (!Number.isInteger(b[c]) || b[c] < 0) return { ok: false, err: "칩은 0 이상 정수예요" };
      if (b[c] > st.chips[seat][c]) return { ok: false, err: `${CODE[c]} 종목 칩이 모자라요 (남은 ${st.chips[seat][c]}개)` };
    }
    st.bids[seat] = b.slice();
    push(st, { k: "bid", s: seat, r: st.round });
    if (!needs(st).length) resolve(st);
    return { ok: true };
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    return [{ t: "bid", bids: st.chips[seat].map(x => Math.min(x, 1)) }, { t: "bid", bids: [0, 0, 0, 0] }];
  }

  // ── 보이는 것 ──  끝난 라운드의 가격 · 모두의 입찰은 공개, 이번 라운드 가격 · 남이 낸 입찰 · 남의 아이템 정보는 숨김 ('all' 만 다 봄)
  function pubKey(st) { return JSON.stringify({ r: st.round, d: st.bids.map(b => !!b), m: st.money, c: st.chips, o: st.over, h: st.hist.length }); }
  function view(st, seat) {
    const all = seat === "all", me = Number.isInteger(seat) && seat >= 0 && seat < st.n ? seat : -1;
    return {
      n: st.n, opt: Object.assign({}, st.opt), round: st.round, rounds: NR, phase: st.phase, kinds: KIND.slice(),
      hist: st.hist.map(h => ({ r: h.r, prices: h.prices.slice(), bids: h.bids.map(b => b.slice()), win: h.win.slice(), wb: h.wb.slice() })),
      chips: st.chips.map(c => c.slice()), money: st.money.slice(), items: st.items.map((x, s) => (all || s === me ? Object.assign({}, x) : { hid: 1 })),
      mine: all ? st.bids.map(b => (b ? b.slice() : null)) : me >= 0 && st.bids[me] ? st.bids[me].slice() : null,
      done: st.bids.map(b => !!b), intel: all ? st.intel.map(l => l.map(e => Object.assign({}, e))) : me >= 0 ? st.intel[me].map(e => Object.assign({}, e)) : [],
      cur: all ? st.prices[Math.min(st.round, NR - 1)].slice() : null,
      ident: st.over ? IDENT.slice() : null, prices: st.over || all ? st.prices.map(r => r.slice()) : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null, score: st.money.slice(),
      log: st.log.filter(e => e.k !== "item" || all || e.s === me).map((e, i) => Object.assign({}, e, { i })), seat, pub: hash(pubKey(st)).toString(36),
    };
  }

  // ═══ AI ═══════════════════════════════════════════════════════
  // 단계: mem = 지난 입찰 기록을 몇 라운드까지 보고 상대를 읽나 · noise = 칩 고르기 흔들림 · 고급은 몬테카를로로 종목별 최적 입찰
  const PROF = {
    easy: { mem: 0, noise: 1, lam: 0 },
    normal: { mem: 1, noise: 0.35, lam: 0.5 },
    hard: { mem: 9, noise: 0, lam: 1 },
  };
  const keyOf = (V, s, k) => hash(JSON.stringify([V.pub, s, k, V.round]));
  const PRIOR = [0.22, 0.24, 0.2, 0.14, 0.1, 0.06, 0.04];       // 기록이 없을 때 남의 입찰 칩 분포 (0~6)
  // 종목 c 의 이번 라운드 기대 가격 (만 원) — 지난 가격과 종목 성격 (부동산은 완만 · 가상화폐는 출렁), 등락 정보가 있으면 반영
  function expPrice(V, s, c) {
    const H = V.hist.map(h => h.prices[c]), last = H.length ? H[H.length - 1] : 70000;
    const mean = H.length ? H.reduce((a, b) => a + b, 0) / H.length : 70000;
    let e = c === 0 ? last * 1.04 : c === 2 ? 0.7 * last + 0.3 * mean : c === 1 ? 0.5 * last + 0.5 * mean : 0.6 * last + 0.4 * mean;
    if (!H.length) e = 70000;
    const it = V.intel.find(x => x.k === "trend" && x.c === c && x.r === V.round);
    if (it && last) e = last * ({ surge: 1.8, up: 1.1, down: 0.82, crash: 0.3 })[it.v];
    return e;
  }
  // 남의 입찰 분포 (종목 c) — 최근 mem 라운드, 가진 칩 대비
  function oppDist(V, s, c, mem) {
    const cnt = PRIOR.slice(); let tot = 1;
    const hs = V.hist.slice(Math.max(0, V.hist.length - mem));
    for (const h of hs) h.bids.forEach((b, p) => { if (p !== s) { cnt[Math.min(b[c], cnt.length - 1)] += 1.6 / PRIOR.length * 6; tot += 1.6 / PRIOR.length * 6; } });
    let sum = 0; for (const x of cnt) sum += x;
    return cnt.map(x => x / sum);
  }
  function sampleBid(D, R) { let u = R(), i = 0; while (i < D.length - 1 && u > D[i]) { u -= D[i]; i++; } return i; }
  // 내 입찰 b 로 이길 확률 (몬테카를로, 결정적)
  function winProbs(V, s, c, P) {
    const D = oppDist(V, s, c, P.mem), R = seeded(hash(JSON.stringify([V.pub, c, "mc"]))), M = 160, maxB = Math.min(V.chips[s][c], 10), wins = Array(maxB + 1).fill(0);
    for (let t = 0; t < M; t++) {
      const o = []; for (let p = 0; p < V.n; p++) if (p !== s) o.push(sampleBid(D, R) + (V.chips[p][c] <= 0 ? -99 : 0));
      const ob = o.map(x => Math.max(0, Math.min(x, 10)));
      for (let b = 0; b <= maxB; b++) { if (b === 0) continue; const vals = ob.concat([b]); const w = winnerOf(vals); if (w.w === ob.length) wins[b]++; }
    }
    return wins.map(x => x / M);
  }
  function bestBids(V, s, P) {
    const left = V.rounds - V.round, out = [], det = [];
    for (let c = 0; c < NC; c++) {
      const L = V.chips[s][c], ep = expPrice(V, s, c), wp = winProbs(V, s, c, P), chipVal = ep * 0.065 * Math.max(0, left - 1) / left * P.lam;
      let best = 0, bv = 0;
      for (let b = 1; b <= L; b++) { const v = ep * wp[b] - chipVal * b; if (v > bv + 1e-9) { bv = v; best = b; } }
      out.push(best); det.push({ c, ep, wp, best, ev: bv });
    }
    return { bids: out, det };
  }
  // 입찰 하나의 기대 이득 (복기 · 선생님) — 고급 AI 와 같은 모델
  function evalBids(V, s, bids) {
    const P = PROF.hard, left = V.rounds - V.round; let ev = 0; const rows = [];
    for (let c = 0; c < NC; c++) {
      const ep = expPrice(V, s, c), wp = winProbs(V, s, c, P), chipVal = ep * 0.065 * Math.max(0, left - 1) / left, b = bids[c] | 0;
      const v = b > 0 ? ep * wp[Math.min(b, wp.length - 1)] - chipVal * b : 0; ev += v; rows.push({ c, b, ep, p: b > 0 ? wp[Math.min(b, wp.length - 1)] : 0, v });
    }
    return { ev, rows };
  }
  function normalBids(V, s, P, R) {
    const left = V.rounds - V.round, out = [];
    for (let c = 0; c < NC; c++) {
      const L = V.chips[s][c]; let b = Math.round(L / left + (R() - 0.5) * 2 * P.noise * 2);
      const H = V.hist.map(h => h.prices[c]), last = H.length ? H[H.length - 1] : 70000;
      if (last > 80000) b += 1; else if (last < 40000) b -= 1;
      out.push(Math.max(0, Math.min(L, b)));
    }
    return out;
  }
  function easyBids(V, s, R) {
    return V.chips[s].map(L => (L <= 0 ? 0 : R() < 0.45 ? Math.min(L, 1 + Math.floor(R() * 5)) : 0));
  }
  function useItem(V, s, P) {
    if (!V.opt.items || V.round < 1 || P.lam < 1) return null;
    if (!(V.items[s].trend > 0) || V.intel.some(x => x.k === "trend" && x.r === V.round)) return null;
    let bc = -1, bv = 0;
    for (let c = 0; c < NC; c++) { if (V.chips[s][c] <= 0) continue; const H = V.hist.map(h => h.prices[c]), last = H[H.length - 1], vol = c === 1 ? 3 : c === 3 ? 2 : 1; const v = last * vol * (V.chips[s][c] > 2 ? 1 : 0.5); if (v > bv) { bv = v; bc = c; } }
    if (V.round < 3 && V.round !== 1) return null;                     // 쓸 만한 때 (2 · 4라운드) 한 번
    return bc >= 0 ? { t: "item", k: "trend", c: bc } : null;
  }
  function ai(V, s, tier, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF[tier] || PROF.normal;
    const R = tier === "hard" ? seeded(keyOf(V, s, 3)) : typeof rnd === "function" ? rnd : seeded(keyOf(V, s, 5));
    const it = useItem(V, s, P); if (it) return it;
    if (tier === "easy") return { t: "bid", bids: easyBids(V, s, R) };
    if (tier === "normal") return { t: "bid", bids: normalBids(V, s, P, R) };
    return { t: "bid", bids: bestBids(V, s, P).bids };
  }
  const recommend = (V, s) => ai(V, s, "hard");
  const analyze = (V, s) => bestBids(V, s, PROF.hard);

  return {
    id: "richgame", NC, NR, CHIPS, KIND, CODE, BROAD, IDENT, TREND, OPTS, PROF, optsOf, trendOf, man, winnerOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, analyze, evalBids, expPrice, oppDist, winProbs, bestBids,
  };
});

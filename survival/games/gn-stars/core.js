/* 베니 서바이벌 · 별자리 게임 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 블랙가넷 7화 (나무위키 회차 · 게임 문서 기준)
   · 숫자 카드 1~5 (매 라운드 5장으로 다시 시작). 테이블에는 색 별 N개(방송 7) + 폭탄 1개
   · 전원이 카드 1장을 비밀로 내고 동시에 공개 → 같은 숫자를 낸 사람은 이번 라운드 선택에서 전부 제외
   · 남은 사람이 낮은 숫자부터 차례로 '그 숫자만큼' 테이블에서 별/폭탄을 골라 가져감 (모자라면 남은 것 전부)
   · 별자리: 양자리(빨강 3개 → 2점) 화살자리(노랑 4개 → 3점) 카시오페아(파랑 5개 → 5점) 거문고자리(초록 6개 → 7점)
   · 같은 색 별 3개 = 원하는 색 별 1개 (언제든, 플레이어끼리 주고받기는 불가)
   · 즉시 종료: 폭탄 3개 → 그 사람 탈락, 승점 최고자 우승 / 별자리 3개 완성 → 승점 최고자 우승, 최저자 탈락 / 별이 바닥나면 승점 비교
   · 우승은 별자리 개수가 아니라 승점 합계
   우리 판 다듬기: 별자리는 별이 모이면 자동 완성 · 흰 별(방송에서도 안 쓰임) 없음 · 3 ~ 7명, 별 수는 인원만큼(방송 7명=7개) · 라운드 30 넘으면 승점 비교 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-stars"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NEED = [3, 4, 5, 6], CP = [2, 3, 5, 7], CN = ["양자리", "화살자리", "카시오페아", "거문고자리"], COL = ["빨강", "노랑", "파랑", "초록"], CEM = ["🔴", "🟡", "🔵", "🟢"];
  const PERCOL = 25, MAX_ROUNDS = 30, PEN = [0, 1.2, 4, 14];
  const sum = a => a.reduce((s, x) => s + x, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const ptsOf = h => { let p = 0; for (let c = 0; c < 4; c++) if (h[c] >= NEED[c]) p += CP[c]; return p; };
  const consOf = h => { let k = 0; for (let c = 0; c < 4; c++) if (h[c] >= NEED[c]) k++; return k; };

  function draw(st) {
    const tot = sum(st.bag); if (tot <= 0) return -1;
    let r = Math.floor(rnd(st) * tot);
    for (let c = 0; c < 4; c++) { if (r < st.bag[c]) { st.bag[c]--; return c; } r -= st.bag[c]; }
    return -1;
  }
  function refill(st) {
    while (sum(st.table) < st.n) { const c = draw(st); if (c < 0) break; st.table[c]++; }
    if (st.tbomb < 1) st.tbomb = 1;
  }
  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(7, n | 0 || 7));
    const st = { n, rs: (seed >>> 0) || 1, bag: Array(4).fill(PERCOL), table: [0, 0, 0, 0], tbomb: 0, hold: Array.from({ length: n }, () => [0, 0, 0, 0]), bombs: Array(n).fill(0), round: 0, phase: "card", cards: Array(n).fill(null), rev: null, hist: [], queue: [], qi: 0, picker: -1, pickK: 0, over: false, why: "", loser: -1, log: [], seq: 0, cfg: cfg || {} };
    if (cfg && cfg.table) { st.table = cfg.table.slice(0, 4); st.tbomb = cfg.bomb | 0; for (let c = 0; c < 4; c++) st.bag[c] -= st.table[c]; }   // 시험용: 테이블을 직접 정함
    else refill(st);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.cards = Array(st.n).fill(null); st.phase = "card"; st.rev = null; st.queue = []; st.qi = 0; st.picker = -1; st.pickK = 0;
    push(st, { k: "round", r: st.round });
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "card") return [...Array(st.n).keys()].filter(i => st.cards[i] === null);
    if (st.phase === "pick") return [st.picker];
    return [];
  }
  // 별 3개 → 별 1개 교환 (사본에 적용)
  function doSwaps(h, bag, swaps) {
    for (const s of swaps || []) {
      if (!s || !Number.isInteger(s.from) || !Number.isInteger(s.to) || s.from < 0 || s.from > 3 || s.to < 0 || s.to > 3 || s.from === s.to) return "교환할 색을 다시 골라요";
      if (h[s.from] < 3) return `${COL[s.from]} 별이 3개 있어야 바꿀 수 있어요`;
      if (bag[s.to] < 1) return `${COL[s.to]} 별이 남아 있지 않아요`;
      h[s.from] -= 3; bag[s.from] += 3; h[s.to]++; bag[s.to]--;
    }
    return null;
  }
  function endGame(st, why, loser) {
    st.over = true; st.why = why; st.loser = loser; st.phase = "end";
    if (st.rev && !st.rev.done) { st.rev.done = true; st.hist.push(st.rev); }
    push(st, { k: "end", why, loser });
  }
  function checkEnd(st) {
    if (st.over) return true;
    for (let i = 0; i < st.n; i++) if (st.bombs[i] >= 3) { endGame(st, "bomb", i); return true; }
    for (let i = 0; i < st.n; i++) if (consOf(st.hold[i]) >= 3) { endGame(st, "cons", -1); return true; }
    return false;
  }
  function doTake(st, s, take) {
    for (let c = 0; c < 4; c++) { st.table[c] -= take[c]; st.hold[s][c] += take[c]; }
    st.tbomb -= take[4]; st.bombs[s] += take[4];
    st.rev.takes.push({ s, k: st.cards[s], take: take.slice() });
    push(st, { k: "take", s, take: take.slice() });
  }
  function resolveCards(st) {
    const cnt = Array(6).fill(0); for (const c of st.cards) cnt[c]++;
    const elim = st.cards.map(c => cnt[c] > 1);
    const order = [...Array(st.n).keys()].filter(i => !elim[i]).sort((a, b) => st.cards[a] - st.cards[b]);
    st.rev = { r: st.round, cards: st.cards.slice(), elim, order, takes: [], done: false };
    st.queue = order; st.qi = 0;
    push(st, { k: "rev", r: st.round, cards: st.cards.slice() });
    advancePicks(st);
  }
  function advancePicks(st) {
    while (st.qi < st.queue.length) {
      const s = st.queue[st.qi], tot = sum(st.table) + st.tbomb, k = Math.min(st.cards[s], tot);
      if (k === 0) { st.rev.takes.push({ s, k: st.cards[s], take: [0, 0, 0, 0, 0] }); st.qi++; continue; }
      const types = [...st.table, st.tbomb].filter(x => x > 0).length;
      if (k >= tot || types <= 1) {
        let take;
        if (k >= tot) take = [...st.table, st.tbomb];
        else { take = [0, 0, 0, 0, 0]; const t = [...st.table, st.tbomb].findIndex(x => x > 0); take[t] = k; }
        doTake(st, s, take); st.qi++;
        if (checkEnd(st)) return;
        continue;
      }
      st.phase = "pick"; st.picker = s; st.pickK = k; return;
    }
    st.rev.done = true; st.hist.push(st.rev);
    if (st.round >= MAX_ROUNDS || (sum(st.table) === 0 && sum(st.bag) === 0)) { endGame(st, "out", -1); return; }
    st.phase = "rev"; st.picker = -1; st.pickK = 0;
  }
  function apply(st, seat, a) {
    if (!a || st.over || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const h = st.hold[seat].slice(), bag = st.bag.slice();
    if (a.t === "swap") {
      const err = doSwaps(h, bag, [a]); if (err) return { ok: false, err };
      st.hold[seat] = h; st.bag = bag; push(st, { k: "swap", s: seat, from: a.from, to: a.to });
      checkEnd(st); return { ok: true };
    }
    if (st.phase === "card") {
      if (a.t !== "card" || !Number.isInteger(a.c) || a.c < 1 || a.c > 5) return { ok: false, err: "1 ~ 5 카드를 골라요" };
      const err = doSwaps(h, bag, a.swaps); if (err) return { ok: false, err };
      if (a.swaps && a.swaps.length) { st.hold[seat] = h; st.bag = bag; for (const s of a.swaps) push(st, { k: "swap", s: seat, from: s.from, to: s.to }); if (checkEnd(st)) return { ok: true }; }
      st.cards[seat] = a.c; push(st, { k: "card", s: seat });
      if (needs(st).length === 0) resolveCards(st);
      return { ok: true };
    }
    if (st.phase === "pick") {
      const t = a.take;
      if (a.t !== "take" || !Array.isArray(t) || t.length !== 5 || !t.every(x => Number.isInteger(x) && x >= 0)) return { ok: false, err: "가져갈 것을 골라요" };
      if (sum(t) !== st.pickK) return { ok: false, err: `${st.pickK}개를 골라야 해요` };
      for (let c = 0; c < 4; c++) if (t[c] > st.table[c]) return { ok: false, err: `${COL[c]} 별이 모자라요` };
      if (t[4] > st.tbomb) return { ok: false, err: "폭탄이 모자라요" };
      for (let c = 0; c < 4; c++) h[c] += t[c];
      const err = doSwaps(h, bag, a.swaps); if (err) return { ok: false, err };
      doTake(st, seat, t);
      st.hold[seat] = h; st.bag = bag; for (const s of a.swaps || []) push(st, { k: "swap", s: seat, from: s.from, to: s.to });
      st.qi++;
      if (checkEnd(st)) return { ok: true };
      advancePicks(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = st => (st.phase === "rev" && !st.over ? 4600 : null);
  function advance(st) {
    if (st.phase !== "rev" || st.over) return;
    refill(st); startRound(st);
  }
  const over = st => !!st.over;
  function ranks(st) {
    const p = st.hold.map(ptsOf), loser = st.why === "bomb" ? st.loser : -1;
    return p.map((x, i) => (i === loser ? st.n - 1 : p.filter((y, j) => j !== loser && y > x).length));
  }
  // ── AI 쪽 계산 (보이는 것만) ─────────────────────────────────
  function fc(c, x) { const nd = NEED[c], p = CP[c]; return x >= nd ? p + 0.15 * (x - nd) : p * 0.85 * Math.pow(x / nd, 1.2); }
  const Vh = h => fc(0, h[0]) + fc(1, h[1]) + fc(2, h[2]) + fc(3, h[3]);
  const util = (h, b) => Vh(h) - PEN[Math.min(3, b)];
  function greedyTake(tab, h, k) {
    const t = tab.slice(), hh = h.slice(), take = [0, 0, 0, 0, 0];
    for (let i = 0; i < k; i++) {
      let best = -1, bg = -1e9;
      for (let c = 0; c < 4; c++) if (t[c] > 0) { const g = fc(c, hh[c] + 1) - fc(c, hh[c]) + t[c] * 1e-4; if (g > bg) { bg = g; best = c; } }
      if (best < 0) { if (t[4] > 0) best = 4; else break; }
      t[best]--; take[best]++; if (best < 4) hh[best]++;
    }
    return take;
  }
  // 교환: 점수 · 진행도가 오르는 것만 (같은 색 3개 → 1개)
  function planSwaps(hold, bag, tier) {
    const h = hold.slice(), b = bag.slice(), out = [];
    for (let it = 0; it < 4; it++) {
      let best = null, bg = tier === "easy" ? 0.5 : 0.05;
      for (let x = 0; x < 4; x++) if (h[x] >= 3) for (let y = 0; y < 4; y++) if (y !== x && b[y] >= 1) {
        const g = Vh(h.map((v, c) => (c === x ? v - 3 : c === y ? v + 1 : v))) - Vh(h);
        if (g > bg) { bg = g; best = { from: x, to: y }; }
      }
      if (!best) break;
      h[best.from] -= 3; b[best.from] += 3; h[best.to]++; b[best.to]--; out.push(best);
    }
    return { swaps: out, hold: h, bag: b };
  }
  const TIER = { easy: { K: 12, temp: 1.4, rnd: 0.2, hist: false, rot: false }, normal: { K: 60, temp: 0.5, rnd: 0.04, hist: true, rot: false }, hard: { K: 140, temp: 0.28, rnd: 0, hist: true, rot: true } };
  function oppDist(V, j, T) {
    const w = [1, 1, 1, 1, 1];
    if (T.hist) {
      const H = V.hist.filter(x => x.cards[j]); let wt = 1;
      for (let a = H.length - 1; a >= 0; a--) { w[H[a].cards[j] - 1] += wt; wt *= 0.82; }
      if (T.rot && H.length >= 3) {
        const c3 = H.slice(-3).map(x => x.cards[j]), nx = x => (x % 5) + 1;
        if (nx(c3[0]) === c3[1] && nx(c3[1]) === c3[2]) w[nx(c3[2]) - 1] += 5;
      }
    }
    const s = sum(w); return w.map(x => x / s);
  }
  const pick = (d, r) => { let u = r(); for (let i = 0; i < d.length; i++) { u -= d[i]; if (u <= 0) return i + 1; } return d.length; };
  // 내가 낼 수 있는 카드 5장의 기대 이득 (남의 카드는 지난 기록으로 추정)
  function evalCards(V, me, T, r) {
    const n = V.n, tab = [...V.table, V.tbomb], h0 = V.hold[me], u0 = util(h0, V.bombs[me]);
    const others = [...Array(n).keys()].filter(j => j !== me), dist = others.map(j => oppDist(V, j, T));
    const op = V.hold.map(ptsOf).filter((_, j) => j !== me), omax = Math.max(0, ...op), omin = Math.min(...op, 99);
    const ev = Array(6).fill(0), col = Array(6).fill(0);
    for (let k = 0; k < T.K; k++) {
      const oc = Array(n).fill(0), cnt = Array(6).fill(0);
      others.forEach((j, a) => { oc[j] = pick(dist[a], r); cnt[oc[j]]++; });
      for (let c = 1; c <= 5; c++) {
        if (cnt[c] > 0) { col[c]++; continue; }
        const order = others.filter(j => cnt[oc[j]] === 1 && oc[j] < c).sort((a, b) => oc[a] - oc[b]);
        let tt = tab.slice();
        for (const s of order) { const kk = Math.min(oc[s], sum(tt)), tk = greedyTake(tt, V.hold[s], kk); for (let q = 0; q < 5; q++) tt[q] -= tk[q]; }
        const kk = Math.min(c, sum(tt)), tk = greedyTake(tt, h0, kk), h1 = h0.map((v, q) => v + tk[q]), b1 = V.bombs[me] + tk[4];
        let d = util(h1, b1) - u0;
        if (consOf(h1) >= 3) { const mp = ptsOf(h1); d += mp > omax ? 9 : mp <= omin ? -5 : -1; }
        ev[c] += d;
      }
    }
    for (let c = 1; c <= 5; c++) { ev[c] /= T.K; col[c] /= T.K; }
    return { ev, col };
  }
  function cardPlan(V, me, tier, r) {
    const T = TIER[tier], { ev, col } = evalCards(V, me, T, r);
    let c;
    if (r() < T.rnd) c = 1 + Math.floor(r() * 5);
    else {
      const mx = Math.max(...ev.slice(1)), w = ev.slice(1).map(x => Math.exp((x - mx) / T.temp)), s = sum(w);
      let u = r() * s; c = 5; for (let i = 0; i < 5; i++) { u -= w[i]; if (u <= 0) { c = i + 1; break; } }
    }
    const bestC = ev.indexOf(Math.max(...ev.slice(1)), 1);
    return { c, ev, col, bestC };
  }
  function pickTake(V, me) { return greedyTake([...V.table, V.tbomb], V.hold[me], V.pickK); }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const T = TIER[tier] ? tier : "normal";
    if (V.phase === "card") {
      const sp = planSwaps(V.hold[me], V.bag, T), V2 = Object.assign({}, V, { hold: V.hold.map((x, i) => (i === me ? sp.hold : x)) });
      const a = { t: "card", c: cardPlan(V2, me, T, r).c }; if (sp.swaps.length) a.swaps = sp.swaps; return a;
    }
    if (V.phase === "pick") {
      let take = pickTake(V, me);
      if (T === "easy" && r() < 0.25) { const t = [...V.table, V.tbomb], tk = [0, 0, 0, 0, 0]; for (let i = 0; i < V.pickK; i++) { const av = [0, 1, 2, 3, 4].filter(q => t[q] > 0); const q = av[Math.floor(r() * av.length)]; t[q]--; tk[q]++; } take = tk; }
      const h = V.hold[me].map((v, c) => v + take[c]), sp = planSwaps(h, V.bag, T), a = { t: "take", take };
      if (sp.swaps.length) a.swaps = sp.swaps; return a;
    }
    return null;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "card") return [{ t: "card", c: 1 }];
    return [{ t: "take", take: greedyTake([...st.table, st.tbomb], st.hold[seat], st.pickK) }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const shown = st.rev && (st.phase === "pick" || st.phase === "rev" || st.phase === "end") ? st.rev : null;
    const pts = st.hold.map(ptsOf);
    const pubObj = { r: st.round, p: st.phase, t: st.table, tb: st.tbomb, h: st.hold, b: st.bombs, d: st.cards.map(c => (c === null ? 0 : 1)), rev: shown ? [shown.cards, shown.takes] : 0, pk: st.picker, o: st.over, bag: st.bag };
    return {
      n: st.n, seat, round: st.round, maxRounds: MAX_ROUNDS, phase: st.phase, table: st.table.slice(), tbomb: st.tbomb, bag: st.bag.slice(),
      hold: st.hold.map(h => h.slice()), bombs: st.bombs.slice(), points: pts, cons: st.hold.map(consOf),
      done: st.cards.map(c => c !== null), mine: me >= 0 ? st.cards[me] : null, cards: all ? st.cards.slice() : null,
      rev: shown ? { r: shown.r, cards: shown.cards.slice(), elim: shown.elim.slice(), order: shown.order.slice(), takes: shown.takes.map(t => ({ s: t.s, k: t.k, take: t.take.slice() })) } : null,
      hist: st.hist.slice(-12).map(x => ({ r: x.r, cards: x.cards.slice(), elim: x.elim.slice(), order: x.order.slice(), takes: x.takes.map(t => ({ s: t.s, k: t.k, take: t.take.slice() })) })),
      picker: st.picker, pickK: st.pickK, needs: needs(st), over: st.over, why: st.why, loser: st.loser, ranks: st.over ? ranks(st) : null, score: pts, log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const itemTxt = take => take.map((x, i) => (x > 0 ? `${i < 4 ? CEM[i] : "💣"}${x}` : "")).filter(Boolean).join(" ") || "없음";
  function coach(V, me, since, names) {
    const who = i => (i === me ? "나" : nm(names, i));
    if (V.over) {
      const why = V.why === "bomb" ? `${who(V.loser)}가 폭탄 3개를 받아 끝났어요` : V.why === "cons" ? "누군가 별자리 3개를 완성해 끝났어요" : "별을 다 나눠서 끝났어요";
      return { opp: `${why}. 승점이 가장 높은 쪽이 우승이에요.`, mine: `내 승점 ${V.points[me]} · 완성한 별자리 ${V.cons[me]}개 · 폭탄 ${V.bombs[me]}개`, rec: V.ranks && V.ranks[me] === 0 ? "우승이에요!" : "승점 합계가 승부예요", why: "별자리 개수보다 승점 합계로 우승이 가려져요 (3개 10점보다 2개 12점이 이길 수 있어요)." };
    }
    const danger = [];
    for (let i = 0; i < V.n; i++) { if (i === me) continue; if (V.bombs[i] >= 2) danger.push(`${who(i)} 폭탄 ${V.bombs[i]}개(하나 더 받으면 탈락)`); if (V.cons[i] >= 2) danger.push(`${who(i)} 별자리 ${V.cons[i]}개(하나 더 완성하면 끝)`); }
    const last = V.hist[V.hist.length - 1];
    const oppTxt = `${last ? `지난 라운드 카드: ${[...Array(V.n).keys()].map(i => `${who(i)} ${last.cards[i]}${last.elim[i] ? "(겹침)" : ""}`).join(" · ")}. ` : ""}${danger.length ? `주의: ${danger.join(", ")}.` : "아직 끝이 가까운 사람은 없어요."}`;
    const need3 = [0, 1, 2, 3].map(c => `${CEM[c]}${V.hold[me][c]}/${NEED[c]}`).join(" ");
    const mineTxt = `승점 ${V.points[me]} · 별자리 ${V.cons[me]}개 · 폭탄 ${V.bombs[me]}개 · 내 별 ${need3}`;
    if (V.phase === "rev") return { opp: oppTxt, mine: mineTxt, rec: "결과를 확인해요", why: "곧 다음 라운드가 시작돼요." };
    let rec = "기다려요", why = "";
    if (V.phase === "card" && V.needs.includes(me)) {
      const sp = planSwaps(V.hold[me], V.bag, "hard"), V2 = Object.assign({}, V, { hold: V.hold.map((x, i) => (i === me ? sp.hold : x)) });
      const pl = cardPlan(V2, me, "hard", sampler(V.round * 7919 + me * 31 + V.hist.length)), c = pl.bestC;
      rec = `${c}번 카드 내기`; why = `다른 사람이 같은 숫자를 낼 확률은 약 ${Math.round(pl.col[c] * 100)}%예요 (겹치면 이번 라운드는 아무것도 못 가져가요). 1~3은 폭탄을 피하기 쉽고, 4~5는 남은 것이 폭탄뿐일 위험이 커요.${sp.swaps.length ? ` 먼저 ${sp.swaps.map(s => `${CEM[s.from]}3개→${CEM[s.to]}1개`).join(", ")} 교환하면 별자리에 가까워져요.` : ""}`;
    } else if (V.phase === "card") { rec = "다른 사람을 기다려요"; why = "카드는 모두가 낸 뒤 동시에 공개돼요."; }
    else if (V.phase === "pick" && V.picker === me) { const tk = pickTake(V, me); rec = `${itemTxt(tk)} 가져가기`; why = "별자리를 빨리 채울 별부터, 폭탄은 마지막에 가져가요. 폭탄 3개를 받으면 바로 탈락이에요."; }
    else if (V.phase === "pick") { rec = `${who(V.picker)}가 고르는 중`; why = `${V.pickK}개를 가져가요. 내 카드는 ${V.rev && V.rev.elim[me] ? "겹쳐서 제외됐어요" : "순서를 기다려요"}.`; }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-stars", NEED, CP, CN, COL, CEM, PERCOL, MAX_ROUNDS, TIER, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, cardPlan, evalCards, greedyTake, planSwaps, ptsOf, consOf, util, doSwaps };
});

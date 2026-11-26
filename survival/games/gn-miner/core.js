/* 베니 서바이벌 · 광부 게임 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 5화 메인 매치 — 9명이 3명씩 3조, 한 조가 광부(광물 채굴) · 나머지 6명이 제시자(비공개로 '나눠 갖고 싶은 점수' 1~50)
   · 광물 49개: 금 14(3점) · 은 14(2점) · 동 14(1점) · 다이아몬드 2(채굴 합계 ×2) · 폭탄 5(0점)
   · 광부 셋이 돌아가며 자기 차례에 광산에서 광물을 한 번에 원하는 만큼(1개든 여러 개든) 꺼내거나, 꺼내기 전에 스톱 (꺼낸 광물은 모두 봐요).
     폭탄이 3개 이상이 되면 바로 끝 (한 번에 꺼낸 것 안에 폭탄이 4개여도 그 차례는 끝까지 꺼내요)
   · 판 번호 cfg.ver — "b" = 방송대로(위 규칙 · 화면 옵션의 기본값이 b 라 새 판은 cfg 에 ver:"b" 가 들어가요) · 없음/"a" = 예전 규칙(한 번에 1개씩) — 옛 복기를 그대로 재생하려고 남겨 둬요
   · 정산 (M = 채굴 점수, S = 제시 합, B = 폭탄 수):
       B ≥ 3 → 광부 0점, 제시자는 각자 제시한 점수를 받아요
       M ≥ S → 제시자는 제시한 점수를 받고, 남은 점수 (M − S) 를 광부 3명이 똑같이 나눠요 (나머지 버림)
       M < S → 제시자 전원 0점, 광부 3명이 M 을 똑같이 나눠요 · 가장 높게 제시한 사람은 그 점수만큼 감점, 감점 합은 가장 낮게 제시한 사람이 가져가요 (여럿이면 나눔, 모두 같으면 변동 없음)
   · 3라운드 × 3조 — 1라운드는 1조부터, 2라운드부터는 조원 점수 합이 낮은 조부터 · 점수 합계 1위 우승, 꼴찌 탈락 후보
   우리 판 다듬기(방송 문서에 없음): 광물 49개는 조마다 다시 채워요 · 다이아몬드는 하나마다 ×2 (둘이면 ×4) · 꺼낸 광물은 모두에게 공개 ·
   채굴 순서는 조마다 무작위 · 협상 · 연합 없음 (AI 는 혼자 판단) · 나머지 점수는 버려요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-miner"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 9, TURNS = 9, BMIN = 1, BMAX = 50, TEAM = 3;
  const BAG = { g: 14, s: 14, c: 14, d: 2, b: 5 }, VAL = { g: 3, s: 2, c: 1 };
  const NAME = { g: "금", s: "은", c: "동", d: "다이아몬드", b: "폭탄" }, EM = { g: "🟡", s: "⚪", c: "🟤", d: "💎", b: "💣" };
  const BAGN = 49;
  const isB = st => !!(st.cfg && st.cfg.ver === "b");   // 방송대로(한 번에 여러 개) 판인가 — 아니면 예전 규칙 (cfg 에 ver 가 없는 옛 복기도 여기)

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ── 광물 · 정산 ──────────────────────────────────────────
  function tally(drawn) {
    let base = 0, d = 0, b = 0;
    for (const x of drawn) { if (x === "d") d++; else if (x === "b") b++; else base += VAL[x]; }
    return { base, d, b, M: base * Math.pow(2, d) };
  }
  function leftOf(drawn) { const l = Object.assign({}, BAG); for (const x of drawn) l[x]--; return l; }
  const share = (M, B, S, k) => (B >= 3 ? 0 : M >= S ? Math.floor((M - S) / k) : Math.floor(M / k));   // 광부 한 사람 몫
  // bids: { 자리: 제시 점수 } · miners: 광부 자리들 → { kind, S, M, B, d: { 자리: 이번 조에서 얻은 점수 } }
  function settle(bids, miners, M, B) {
    const seats = Object.keys(bids).map(Number), S = seats.reduce((a, s) => a + bids[s], 0), d = {};
    for (const m of miners) d[m] = 0;
    for (const s of seats) d[s] = 0;
    let kind;
    if (B >= 3) { kind = "bomb"; for (const s of seats) d[s] = bids[s]; }
    else if (M >= S) { kind = "ok"; for (const s of seats) d[s] = bids[s]; const sh = Math.floor((M - S) / miners.length); for (const m of miners) d[m] = sh; }
    else {
      kind = "short";
      const sh = Math.floor(M / miners.length); for (const m of miners) d[m] = sh;
      const vs = seats.map(s => bids[s]), mx = Math.max(...vs), mn = Math.min(...vs);
      if (mx !== mn) {
        const hi = seats.filter(s => bids[s] === mx), lo = seats.filter(s => bids[s] === mn);
        for (const s of hi) d[s] -= mx;
        const each = Math.floor(mx * hi.length / lo.length); for (const s of lo) d[s] += each;
      }
    }
    return { kind, S, M, B, d };
  }

  // ── 판 ──────────────────────────────────────────────────
  const tsum = (st, g) => st.groups[g].reduce((a, s) => a + st.score[s], 0);
  function init({ n, seed, cfg } = {}) {
    const c = cfg || {};
    const st = { n: N, rs: (seed >>> 0) || 1, cfg: c, groups: [], gOf: Array(N).fill(0), turn: 0, gorder: [0, 1, 2], phase: "bid", miners: [], pres: [], bids: {}, bag: [], drawn: [], cur: 0, score: Array(N).fill(0), hist: [], over: false, ranks: null, log: [], seq: 0 };
    const seats = shuffle([...Array(N).keys()], () => rnd(st));   // 제비뽑기
    st.groups = c.groups ? c.groups.map(g => g.slice()) : [0, 1, 2].map(g => seats.slice(g * TEAM, g * TEAM + TEAM).sort((a, b) => a - b));
    st.groups.forEach((g, gi) => g.forEach(s => { st.gOf[s] = gi; }));
    push(st, { k: "groups", groups: st.groups.map(g => g.slice()) });
    startTurn(st);
    return st;
  }
  function startTurn(st) {
    const r = Math.floor(st.turn / TEAM), k = st.turn % TEAM;
    if (k === 0) st.gorder = r === 0 ? [0, 1, 2] : [0, 1, 2].sort((a, b) => tsum(st, a) - tsum(st, b) || a - b);
    const g = st.gorder[k];
    st.miners = shuffle(st.groups[g].slice(), () => rnd(st));
    st.pres = [...Array(N).keys()].filter(s => st.gOf[s] !== g);
    st.bids = {}; st.drawn = []; st.cur = 0; st.phase = "bid";
    if (isB(st)) st.grabs = [];   // 이번 조에서 누가 몇 개씩 꺼냈나 (옛 규칙 판에는 이 칸이 없어요 — 옛 복기 지문 그대로)
    const bag = []; for (const x of Object.keys(BAG)) for (let i = 0; i < BAG[x]; i++) bag.push(x);
    st.bag = shuffle(bag, () => rnd(st));
    push(st, { k: "turn", t: st.turn, r, g, miners: st.miners.slice() });
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "bid") return st.pres.filter(s => st.bids[s] === undefined);
    return [st.miners[st.cur]];
  }
  function endTurn(st, why) {
    const t = tally(st.drawn), res = settle(st.bids, st.miners, t.M, t.b);
    for (const s of Object.keys(res.d)) st.score[+s] += res.d[s];
    const h = { t: st.turn, r: Math.floor(st.turn / TEAM), g: st.gorder[st.turn % TEAM], miners: st.miners.slice(), drawn: st.drawn.slice(), why, M: res.M, B: res.B, S: res.S, kind: res.kind, bids: Object.assign({}, st.bids), d: Object.assign({}, res.d) };
    if (isB(st)) h.grabs = st.grabs.map(x => ({ s: x.s, xs: x.xs.slice() }));
    st.hist.push(h);
    push(st, { k: "settle", t: st.turn, kind: res.kind, M: res.M, B: res.B, S: res.S, why });
    st.turn++;
    if (st.turn >= TURNS) { st.over = true; st.phase = "over"; st.ranks = st.score.map(a => st.score.filter(b => b > a).length); push(st, { k: "end" }); }
    else startTurn(st);
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a) return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= N) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "bid") {
      if (a.t !== "bid") return { ok: false, err: "제시할 점수를 정해요" };
      if (st.gOf[seat] === st.gOf[st.miners[0]]) return { ok: false, err: "이번엔 내가 광부예요 — 제시는 다른 조가 해요" };
      if (st.bids[seat] !== undefined) return { ok: false, err: "이미 제시했어요 — 다른 사람을 기다려요" };
      if (!Number.isInteger(a.v) || a.v < BMIN || a.v > BMAX) return { ok: false, err: `${BMIN}~${BMAX}점 사이 정수로 제시해요` };
      st.bids[seat] = a.v;
      push(st, { k: "bid", s: seat });
      if (st.pres.every(s => st.bids[s] !== undefined)) { st.phase = "mine"; st.cur = 0; push(st, { k: "mine", first: st.miners[0] }); }
      return { ok: true };
    }
    if (seat !== st.miners[st.cur]) return { ok: false, err: "지금은 내 차례가 아니에요" };
    if (a.t === "stop") { push(st, { k: "stop", s: seat }); endTurn(st, "stop"); return { ok: true }; }
    if (a.t !== "draw") return { ok: false, err: "꺼내기 · 스톱 중에서 골라요" };
    if (isB(st)) {   // 방송대로: 한 번에 원하는 만큼 (개수를 안 적으면 1개)
      const n = a.n === undefined ? 1 : a.n;
      if (!Number.isInteger(n) || n < 1) return { ok: false, err: "꺼낼 개수는 1 이상의 정수로 골라요" };
      if (n > st.bag.length) return { ok: false, err: `광산에는 ${st.bag.length}개만 남았어요` };
      const xs = []; for (let i = 0; i < n; i++) xs.push(st.bag.pop());
      for (const x of xs) st.drawn.push(x);
      st.grabs.push({ s: seat, xs: xs.slice() }); push(st, { k: "draw", s: seat, n, xs: xs.slice() });
    } else {
      const x = st.bag.pop();
      st.drawn.push(x); push(st, { k: "draw", s: seat, x });
    }
    const t = tally(st.drawn);
    if (t.b >= 3) endTurn(st, "bomb");
    else if (!st.bag.length) endTurn(st, "empty");
    else st.cur = (st.cur + 1) % st.miners.length;
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) {
    if (st.over) return [];
    if (st.phase === "bid") return st.pres.includes(seat) && st.bids[seat] === undefined ? [{ t: "bid", v: 3 }] : [];
    return seat === st.miners[st.cur] ? [{ t: "stop" }, isB(st) ? { t: "draw", n: 1 } : { t: "draw" }] : [];   // 시간이 다 되면 첫 수(스톱)로 대신해요
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const t = tally(st.drawn), left = leftOf(st.drawn);
    const bidDone = Array(N).fill(false); for (const s of Object.keys(st.bids)) bidDone[+s] = true;
    const tsc = [0, 1, 2].map(g => tsum(st, g));
    const mine = me >= 0 && st.bids[me] !== undefined ? st.bids[me] : null;
    const B = isB(st), pubObj = { g: st.groups, t: st.turn, ph: st.phase, mi: st.miners, bd: bidDone, dr: st.drawn, h: st.hist, sc: st.score, c: st.cur, go: st.gorder };
    if (B) pubObj.gr = st.grabs.map(x => [x.s, x.xs.join("")]);   // 옛 규칙 판은 지문 그대로
    return {
      ver: B ? "b" : "a", grabs: B ? st.grabs.map(x => ({ s: x.s, xs: x.xs.slice() })) : [],
      n: N, seat, phase: st.phase, turn: st.turn, round: Math.floor(st.turn / TEAM), pos: st.turn % TEAM, turns: TURNS,
      groups: st.groups.map(g => g.slice()), gOf: st.gOf.slice(), gorder: st.gorder.slice(), tscore: tsc,
      miners: st.miners.slice(), pres: st.pres.slice(), cur: st.phase === "mine" ? st.miners[st.cur] : -1, bidDone,
      mineBid: mine, bids: all ? Object.assign({}, st.bids) : null,
      drawn: st.drawn.slice(), M: t.M, B: t.b, left, bagN: BAGN - st.drawn.length,
      hist: st.hist.map(h => { const o = { t: h.t, r: h.r, g: h.g, miners: h.miners.slice(), drawn: h.drawn.slice(), why: h.why, M: h.M, B: h.B, S: h.S, kind: h.kind, bids: Object.assign({}, h.bids), d: Object.assign({}, h.d) }; if (h.grabs) o.grabs = h.grabs.map(x => ({ s: x.s, xs: x.xs.slice() })); return o; }),
      score: st.score.slice(), needs: needs(st), over: st.over, ranks: st.over ? st.ranks.slice() : null,
      log: st.log.slice(-40), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const PRIOR_BIDS = [2, 3, 3, 4, 4, 5, 5, 6, 8, 10];
  function allBids(V, ex) { const a = []; for (const h of V.hist) for (const s of Object.keys(h.bids)) if (+s !== ex) a.push(h.bids[s]); return a; }   // ex = 빼고 볼 자리 (방송대로 판은 내 제시를 '남들의 제시' 표본에서 뺌)
  function meanS(V) { const hs = V.hist.slice(-4); return hs.length ? hs.reduce((x, h) => x + h.S, 0) / hs.length : 24; }
  function pickBid(pool, r) { return pool[Math.floor(r() * pool.length)]; }
  // 광부 규칙(기본): 목표 점수에 닿을 때까지 꺼내고, 폭탄이 2개면 위험을 따져요
  function minerDraw(t, left, T) {
    if (t.b >= 3) return false;
    if (t.M >= T) return false;
    const rest = left.g + left.s + left.c + left.d + left.b;
    if (rest <= 0) return false;
    if (t.b === 2) {
      const p = left.b / rest, good = left.g + left.s + left.c, avg = good ? (3 * left.g + 2 * left.s + left.c) / good : 0;
      return (1 - p) * avg > p * t.M;
    }
    return true;
  }
  function drawFrom(left, r) {   // 남은 광물에서 하나 (복원 없음)
    const rest = left.g + left.s + left.c + left.d + left.b; let x = r() * rest;
    for (const k of ["g", "s", "c", "d", "b"]) { if (x < left[k]) { left[k]--; return k; } x -= left[k]; }
    left.c--; return "c";
  }
  function simMine(drawn0, T, r) {   // 기본 규칙 광부가 끝까지 해 본 결과 → 최종 점수 · 폭탄 수
    const drawn = drawn0.slice(), left = leftOf(drawn);
    for (let g = 0; g < 60; g++) {
      const t = tally(drawn);
      if (!minerDraw(t, left, T)) break;
      drawn.push(drawFrom(left, r));
      if (tally(drawn).b >= 3) break;
    }
    const t = tally(drawn); return { M: t.M, B: t.b };
  }
  function sampleBids(V, k, r, ex) {
    const emp = allBids(V, ex), pool = emp.length >= 6 ? emp : PRIOR_BIDS.concat(emp), out = [];
    for (let i = 0; i < k; i++) out.push(r() < 0.12 ? 1 + Math.floor(r() * 12) : pickBid(pool, r));
    return out;
  }
  const bestIdx = (arr, r) => { let m = -Infinity; for (const x of arr) if (x > m) m = x; const near = arr.map((x, i) => (x >= m - Math.max(0.05, Math.abs(m) * 0.02) ? i : -1)).filter(i => i >= 0); return near[Math.floor(r() * near.length)]; };
  const CANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 25, 30, 40, 50];
  const targetT = V => clamp(Math.round(Math.max(14, meanS(V) * 1.1 + 3)), 14, 60);   // 기본 광부가 노리는 채굴 점수
  function sampleM(V, r) {   // 광부들이 이번에 캘 점수: 지난 조들의 기록(최근 것에 가중)으로, 없으면 기본 규칙 광부로
    const hs = V.hist;
    if (V.ver === "b" && hs.length >= 1) {   // 방송대로 판: 이 광부 조가 앞서 캔 기록이 있으면 그것을 더 믿어요 (조마다 캐는 버릇이 달라요)
      const key = V.miners.slice().sort((x, y) => x - y).join(), same = hs.filter(h => h.miners.slice().sort((x, y) => x - y).join() === key);
      if (same.length && r() < 0.6) { const h = same[Math.floor(r() * same.length)]; return { M: Math.max(0, Math.round(h.M * (0.8 + r() * 0.4))), B: h.B }; }
    }
    if (hs.length >= 2) { const h = hs[Math.max(0, hs.length - 1 - Math.floor(r() * r() * hs.length))]; return { M: Math.max(0, Math.round(h.M * (0.8 + r() * 0.4))), B: h.B }; }
    return V.ver === "b" ? simMineB(V.drawn || [], null, 14 + Math.floor(r() * 25), r) : simMine([], 14 + Math.floor(r() * 17), r);
  }
  function evalBids(V, me, r, trials) {   // 후보 제시 점수마다 평균 점수 (같은 표본으로 견줘요)
    const miners = V.miners, others = V.pres.filter(s => s !== me), sums = Array(CANDS.length).fill(0);
    for (let i = 0; i < trials; i++) {
      const m = sampleM(V, r), ob = sampleBids(V, others.length, r, V.ver === "b" ? me : -1);
      CANDS.forEach((b, ci) => {
        const bids = { [me]: b }; others.forEach((s, j) => { bids[s] = ob[j]; });
        sums[ci] += settle(bids, miners, m.M, m.B).d[me];
      });
    }
    return sums.map(x => x / trials);
  }
  function actBid(V, me, tier, r) {
    if (tier === "easy") return { t: "bid", v: r() < 0.8 ? 1 + Math.floor(r() * 20) : 1 + Math.floor(r() * 50) };
    const emp = allBids(V, V.ver === "b" ? me : -1), base = emp.length ? emp.reduce((a, b) => a + b, 0) / emp.length : 4;
    if (tier === "normal") {
      const last = V.hist[V.hist.length - 1], f = !last ? 1 : last.kind === "short" ? 0.8 : last.kind === "ok" && last.M - last.S > 6 ? 1.25 : 1;
      return { t: "bid", v: clamp(Math.round(base * f + (r() * 3 - 1.5)), 1, 14) };
    }
    const ev = evalBids(V, me, r, 140), cap = V.ver === "b" ? Math.max(6, Math.round(2 * base)) : 999;   // 방송대로 판: 남들 평균의 2배(최소 6점)를 넘게 부르면 'M 이 모자랄 때 최고 제시자 감점' 이 커서 후보에서 뺌
    const i = bestIdx(ev.map((x, j) => (CANDS[j] > cap ? -1e9 : x)), r);
    return { t: "bid", v: CANDS[i], ev: ev[i] };
  }
  function actMine(V, me, tier, r) {
    const t = { M: V.M, b: V.B, d: 0 };
    if (tier === "easy") return { t: r() < 0.16 ? "stop" : "draw" };
    const T = targetT(V);
    if (tier === "normal") return { t: minerDraw(t, V.left, T) ? "draw" : "stop" };
    // 어려움: 제시 합(S) 표본 · 남은 광물 순서 표본으로 '지금 스톱' 과 '하나 더 꺼내고 기본 규칙' 의 평균 몫을 견줘요
    let dStop = 0, dDraw = 0; const TRIALS = 130;
    for (let i = 0; i < TRIALS; i++) {
      const S = sampleBids(V, 6, r).reduce((a, b) => a + b, 0), left = Object.assign({}, V.left), drawn = V.drawn.slice();
      dStop += share(V.M, V.B, S, 3);
      drawn.push(drawFrom(left, r));
      const tt = tally(drawn);
      let M = tt.M, B = tt.b;
      if (B < 3) { const m = simMine(drawn, T, r); M = m.M; B = m.B; }
      dDraw += share(M, B, S, 3);
    }
    return { t: dDraw > dStop + 0.01 * TRIALS ? "draw" : "stop", dDraw: dDraw / TRIALS, dStop: dStop / TRIALS };
  }
  // ── 방송대로(ver "b") 광부 AI: 한 번에 몇 개를 꺼낼지 (복원 없는 표본으로 · 보이는 것만) ─────────────────
  //   · 폭탄 확률은 초기하분포 — 남은 광산 rest 개 중 폭탄 bombs 개에서 k 개를 한꺼번에 꺼낼 때 폭탄이 need 개 이상일 확률
  //   · 보통: 목표 점수 T 에 닿을 만큼 꺼내되 터질 확률이 12% 를 넘지 않게 · 어려움: 후보 개수마다 평균 몫을 같은 표본으로 견줘요
  const LF = [0]; for (let i = 1; i <= 64; i++) LF.push(LF[i - 1] + Math.log(i));
  const lC = (n, k) => (k < 0 || k > n ? -Infinity : LF[n] - LF[k] - LF[n - k]);
  function pBust(rest, bombs, k, need) {
    if (need <= 0) return 1;
    k = Math.min(k, rest); if (bombs < need || k < need) return 0;
    let p = 0; for (let i = need; i <= Math.min(bombs, k); i++) p += Math.exp(lC(bombs, i) + lC(rest - bombs, k - i) - lC(rest, k));
    return Math.min(1, p);
  }
  const GRABS = [1, 2, 3, 4, 5, 6, 8, 10, 12], GRAB_CAP = 12, BUST_OK = 0.12;
  const restOf = left => left.g + left.s + left.c + left.d + left.b;
  function addTo(t, x) { if (x === "d") t.d++; else if (x === "b") t.b++; else t.base += VAL[x]; t.M = t.base * Math.pow(2, t.d); }
  const cloneT = t => ({ base: t.base, d: t.d, b: t.b, M: t.M });
  // 기본 규칙 광부: 이번 차례에 몇 개를 꺼낼까 (0 = 스톱)
  function planK(t, left, T) {
    const rest = restOf(left);
    if (t.b >= 3 || rest <= 0 || t.M >= T) return 0;
    const need = 3 - t.b;
    if (need === 1) { const gain = ((3 * left.g + 2 * left.s + left.c) * Math.pow(2, t.d) + left.d * t.M) / rest; return gain > (left.b / rest) * t.M ? 1 : 0; }   // 폭탄 하나만 더 나와도 끝 — 한 개씩만
    const per = Math.max(0.4, ((3 * left.g + 2 * left.s + left.c) * Math.pow(2, t.d) + left.d * t.M) / rest);   // 한 개당 평균으로 느는 점수
    let k = Math.max(1, Math.min(rest, GRAB_CAP, Math.round((T - t.M) / per)));
    while (k > 1 && pBust(rest, left.b, k, need) > BUST_OK) k--;
    return k;
  }
  function simContinueB(t, left, perm, pos, T) {   // perm = 광산에 남은 것을 섞은 순서 (같은 표본으로 여러 수를 견줄 때)
    for (let g = 0; g < 40; g++) {
      const k = planK(t, left, T); if (!k) break;
      for (let i = 0; i < k && pos < perm.length; i++) { const x = perm[pos++]; left[x]--; addTo(t, x); }
      if (t.b >= 3) break;
    }
    return t;
  }
  function simMineB(drawn0, left0, T, r) {   // 기본 규칙 광부들이 끝까지 해 본 결과 → 최종 점수 · 폭탄 수
    const t = cloneT(tally(drawn0)), left = Object.assign({}, left0 || leftOf(drawn0)), perm = [];
    for (const k of ["g", "s", "c", "d", "b"]) for (let i = 0; i < left[k]; i++) perm.push(k);
    shuffle(perm, r); simContinueB(t, left, perm, 0, T); return { M: t.M, B: t.b };
  }
  // 후보 개수(0 = 스톱)마다 '득실' 평균 — 같은 제시 합 · 같은 광산 순서 표본으로 견줘요 (꺼낸 뒤 거기서 멈춘다고 보고)
  //   득실 = 내 몫(광부 한 사람) − 제시자 한 명의 평균 몫 : 순위 싸움이라 폭탄이 3개 이상 되거나 M ≥ S 가 되면 제시자 6명이 가져가는 점수(S÷6)도 손해로 쳐요
  function evalMineB(V, cands, r, trials, me) {
    const t0 = tally(V.drawn), vals = cands.map(() => []); let sS = 0;
    for (let i = 0; i < trials; i++) {
      const S = sampleBids(V, 6, r, me).reduce((a, b) => a + b, 0), perm = []; sS += S;
      for (const k of ["g", "s", "c", "d", "b"]) for (let j = 0; j < V.left[k]; j++) perm.push(k);
      shuffle(perm, r);
      cands.forEach((c, ci) => {
        const t = cloneT(t0); for (let j = 0; j < c; j++) addTo(t, perm[j]);
        vals[ci].push(share(t.M, t.b, S, 3) - (t.b >= 3 || t.M >= S ? S / 6 : 0));
      });
    }
    return { vals, avgS: sS / trials };
  }
  const mean = a => a.reduce((p, q) => p + q, 0) / (a.length || 1);
  function actMineB(V, me, tier, r) {
    const rest = V.bagN;
    if (tier === "easy") return r() < 0.25 ? { t: "stop" } : { t: "draw", n: Math.min(rest, 1 + Math.floor(r() * 2)) };
    if (tier === "normal") { const k = planK(tally(V.drawn), V.left, targetT(V)); return k ? { t: "draw", n: k } : { t: "stop" }; }
    const cands = [0].concat(GRABS.filter(k => k <= rest)), e = evalMineB(V, cands, r, 110, me), mv = e.vals.map(mean);
    mv[0] += 0.05;   // 비슷하면 스톱 쪽으로
    const i = bestIdx(mv, r), k = cands[i];
    return { t: k ? "draw" : "stop", n: k || undefined, dStop: mean(e.vals[0]), dBest: mean(e.vals[i]), bestN: k, avgS: e.avgS, pBust: k ? pBust(rest, V.left.b, k, 3 - V.B) : 0, cands, means: mv.map((x, j) => (j === 0 ? x - 0.05 : x)) };
  }
  // 복기: 내 수(스톱 · N개 꺼내기)와 고급 AI 수를 같은 표본으로 견줘요 — 평균 몫 · 차이의 표준오차 · 폭탄 3개 이상 될 확률
  function compareMineB(V, me, myA, bestA, seed, trials) {
    if (!V || V.ver !== "b" || V.phase !== "mine" || V.cur !== me || V.over) return null;
    const kOf = a => (a && a.t === "stop" ? 0 : a && a.t === "draw" ? (a.n === undefined ? 1 : a.n) : -1), km = kOf(myA), kb = kOf(bestA), rest = V.bagN;
    if (!(Number.isInteger(km) && km >= 0 && km <= rest) || !(Number.isInteger(kb) && kb >= 0 && kb <= rest) || km === kb) return null;
    const T = Math.max(20, trials | 0 || 200), r = sampler(seed >>> 0), e = evalMineB(V, [km, kb], r, T, me), need = 3 - V.B, pb = k => (k > 0 ? pBust(rest, V.left.b, k, need) : 0);
    return paired(e.vals[0], e.vals[1], { avgS: e.avgS, kMy: km, kBest: kb, pBustMy: pb(km), pBustBest: pb(kb), trials: T });
  }

  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "bid") { const a = actBid(V, me, tier, r); return { t: "bid", v: a.v }; }
    if (V.ver === "b") { const a = actMineB(V, me, tier, r); return a.t === "draw" ? { t: "draw", n: a.n } : { t: "stop" }; }
    const a = actMine(V, me, tier, r); return { t: a.t };
  }

  // ── 🎞️ 복기용 평가 (보이는 것만 · 같은 표본 · 고정 씨앗 — ai() 의 선택은 바꾸지 않아요) ─────────
  // 제시 두 값(내 것 · 고급 AI 것)을 같은 표본(광부들이 캘 점수 · 다른 제시자 점수)으로 견줘요 → 평균 점수 · 'M<S' 확률 · 차이의 표준오차
  function compareBids(V, me, myV, bestV, seed, trials) {
    if (!V || V.phase !== "bid" || !V.pres.includes(me) || V.bidDone[me]) return null;
    const ok = x => Number.isInteger(x) && x >= BMIN && x <= BMAX;
    if (!ok(myV) || !ok(bestV) || myV === bestV) return null;
    const T = Math.max(20, trials | 0 || 200), r = sampler(seed >>> 0), miners = V.miners, others = V.pres.filter(s => s !== me);
    const d = { my: [], best: [] }, sh = { my: 0, best: 0 }; let sM = 0, sO = 0;
    for (let i = 0; i < T; i++) {
      const m = sampleM(V, r), ob = sampleBids(V, others.length, r, V.ver === "b" ? me : -1);
      sM += m.M; sO += ob.reduce((x, y) => x + y, 0);
      for (const k of ["my", "best"]) {
        const bids = { [me]: k === "my" ? myV : bestV }; others.forEach((s, j) => { bids[s] = ob[j]; });
        const res = settle(bids, miners, m.M, m.B); d[k].push(res.d[me]); if (res.kind === "short") sh[k]++;
      }
    }
    return paired(d.my, d.best, { avgM: sM / T, avgOthers: sO / T, pShortMy: sh.my / T, pShortBest: sh.best / T, trials: T });
  }
  function paired(xm, xb, extra) {   // 두 수의 평균 · 차이(고급−내) · 차이의 표준오차
    const mean = a => a.reduce((p, q) => p + q, 0) / a.length, df = xb.map((x, i) => x - xm[i]), md = mean(df);
    const sd = Math.sqrt(df.reduce((p, q) => p + (q - md) * (q - md), 0) / Math.max(1, df.length - 1));
    return Object.assign({ evMy: mean(xm), evBest: mean(xb), dEv: md, se: sd / Math.sqrt(df.length) }, extra);
  }
  // 광부의 '꺼내기 vs 스톱' — actMine(어려움)과 같은 식으로 두 수의 평균 몫을 같은 표본으로 견줘요
  function compareMine(V, me, myT, bestT, seed, trials) {
    if (!V || V.phase !== "mine" || V.cur !== me || V.over) return null;
    if (!(myT === "draw" || myT === "stop") || !(bestT === "draw" || bestT === "stop") || myT === bestT) return null;
    const T = Math.max(20, trials | 0 || 200), r = sampler(seed >>> 0), Tg = targetT(V), dStop = [], dDraw = []; let sS = 0;
    for (let i = 0; i < T; i++) {
      const S = sampleBids(V, 6, r).reduce((a, b) => a + b, 0), left = Object.assign({}, V.left), drawn = V.drawn.slice();
      sS += S; dStop.push(share(V.M, V.B, S, 3));
      drawn.push(drawFrom(left, r));
      const tt = tally(drawn); let M = tt.M, B = tt.b;
      if (B < 3) { const m = simMine(drawn, Tg, r); M = m.M; B = m.B; }
      dDraw.push(share(M, B, S, 3));
    }
    const mv = a => a.reduce((p, q) => p + q, 0) / a.length, pBomb = V.bagN ? V.left.b / V.bagN : 0;
    const my = myT === "draw" ? dDraw : dStop, best = bestT === "draw" ? dDraw : dStop;
    return paired(my, best, { avgS: sS / T, pBomb, dDraw: mv(dDraw), dStop: mv(dStop), trials: T });
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const grabTxt = xs => ["g", "s", "c", "d", "b"].map(k => { const c = xs.filter(x => x === k).length; return c ? `${EM[k]}${c}` : ""; }).filter(Boolean).join(" ");
  // 방송대로 판의 채굴 중 선생님: 방금 누가 몇 개 꺼냈나(👀) · 꺼내기/스톱 추천(💡) · 폭탄이 3개 이상 될 확률(👉)
  function coachMineB(V, me, who, opp, mine, Sx, cur, rest, pct) {
    const lg = V.grabs && V.grabs.length ? V.grabs[V.grabs.length - 1] : null, need = 3 - V.B;
    const oppM = lg ? `이번 조 광산: 방금 ${who(lg.s)}가 ${lg.xs.length}개를 한 번에 꺼냈어요 (${grabTxt(lg.xs)}) · 지금까지 ${V.drawn.length}개 · 채굴 ${V.M}점 · 폭탄 ${V.B}/3개` : opp;
    if (cur !== me) {
      const isMiner = V.miners.includes(me), wait = isMiner ? ` 같은 조 광부로서 M ≥ S(평균 ${Sx}점)가 되면 (M−S)÷3을 받아요.` : V.mineBid !== null ? ` 내 제시 ${V.mineBid}점은 M ≥ S(평균 ${Sx}점)일 때만 받아요 — 지금 채굴 ${V.M}점은 그 ${Math.round(100 * V.M / Math.max(1, Sx))}%예요.` : "";
      return { opp: oppM, mine, rec: "기다려요", why: `${who(cur)} 차례예요 · 광부는 자기 차례에 한 번에 여러 개를 꺼내거나 스톱해요 · 광산에 남은 ${rest}개 중 폭탄 ${V.left.b}개 (한 개 꺼낼 때 약 ${pct}%).${wait}` };
    }
    const a = actMineB(V, me, "hard", sampler(V.turn * 71 + V.drawn.length * 13 + me + 9)), exp = meanS(V);
    const pb5 = Math.round(100 * pBust(rest, V.left.b, Math.min(5, rest), need)), pb10 = Math.round(100 * pBust(rest, V.left.b, Math.min(10, rest), need));
    const sg = x => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}`, recTxt = a.t === "draw" ? `${a.n}개 꺼내요 (득실 평균 ${sg(a.dBest)}점 · 스톱하면 ${sg(a.dStop)}점)` : `스톱 (득실 평균 ${sg(a.dStop)}점 · 꺼내면 최대 ${sg(Math.max(...a.means.slice(1)))}점)`;
    return { opp: oppM, mine: `${mine} · 지금 채굴 ${V.M}점 · 폭탄 ${V.B}개`, rec: recTxt, why: `제시 합(S)은 평균 ${Math.round(exp)}점쯤으로 보여요. 채굴 점수가 S를 넘으면 (M−S)÷3 만, 못 넘으면 M÷3을 받지만 폭탄이 3개 이상이면 0점이에요. 한 번에 꺼낸 것 안에서도 폭탄을 세요 — 광산에 남은 ${rest}개 중 폭탄 ${V.left.b}개라서 5개를 꺼내면 폭탄이 ${need}개 이상 나올 확률 약 ${pb5}% · 10개면 약 ${pb10}%예요. 득실 = 내 몫 − 제시자 평균 몫이에요 (폭탄이 터지거나 M ≥ S 면 제시자 6명이 제시한 점수를 가져가니 그것도 손해로 쳐요).` };
  }
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const teamTxt = (V, g, who) => V.groups[g].map(who).join("·");
  function coach(V, me, since, names) {
    const who = i => (i === me ? "나" : nm(names, i));
    if (!(me >= 0 && me < N)) return { opp: V.hist.length ? `지난 ${V.hist.length}조 평균 제시 합 ${Math.round(meanS(V))}점` : `아직 지난 조가 없어요 (광물 ${BAGN}개 중 폭탄 ${BAG.b}개)`, mine: `${V.round + 1}라운드 · 순서 ${V.pos + 1}/3 · ${V.turn}/${TURNS}조 지남`, rec: "-", why: "자리에 앉은 사람에게만 추천이 나와요." };
    const myG = V.gOf[me];
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), mx = Math.max(...V.ranks), last = V.ranks.map((x, i) => (x === mx ? i : -1)).filter(i => i >= 0);
      return { opp: `최종 점수: ${V.score.map((s, i) => `${who(i)} ${s}`).join(" · ")}`, mine: `내 점수 ${V.score[me]}점 · ${V.ranks[me] + 1}위`, rec: first.includes(me) ? `우승이에요! (${V.score[me]}점)` : `점수 합계 1위는 ${Math.max(...V.score)}점 — 나와 ${Math.max(...V.score) - V.score[me]}점 차이였어요`, why: `우승 ${first.map(who).join("·")}(${Math.max(...V.score)}점) · 꼴찌 ${last.map(who).join("·")}(${Math.min(...V.score)}점). 광부일 땐 제시 합(S)을 넘기지 않게, 제시자일 땐 광부가 캘 만큼만 제시하는 게 핵심이에요.` };
    }
    const hs = V.hist, avgM = hs.length ? Math.round(hs.reduce((a, h) => a + h.M, 0) / hs.length) : null, avgS = hs.length ? Math.round(hs.reduce((a, h) => a + h.S, 0) / hs.length) : null;
    const bombs = hs.filter(h => h.B >= 3).length, shorts = hs.filter(h => h.kind === "short").length;
    const opp = hs.length ? `지난 ${hs.length}조: 평균 채굴 ${avgM}점 · 평균 제시 합 ${avgS}점 · 목표 모자람 ${shorts}번 · 폭탄 3개 ${bombs}번` : `아직 지난 조가 없어요 — 처음엔 제시 합을 ${Math.round(meanS(V))}점쯤(6명 × 4점)으로 보고, 광물 ${BAGN}개 중 폭탄은 ${BAG.b}개(약 ${Math.round(100 * BAG.b / BAGN)}%)예요`;
    const ownTurns = hs.filter(h => h.miners.includes(me)).length;
    const mine = `내 점수 ${V.score[me]}점 (${V.ranks ? "" : `내 조 합계 ${V.tscore[myG]}`}) · 광부 ${ownTurns}번 지남 · 이번 조: ${V.miners.map(who).join(" → ")}`;
    const Sx = Math.round(meanS(V)), done = V.bidDone.filter(Boolean).length;
    if (V.phase === "bid") {
      if (V.gOf[V.miners[0]] === myG) return { opp, mine, rec: "제시자들이 정하는 동안 기다려요", why: `제시자 ${V.pres.length}명이 비밀로 점수를 정하고 있어요 (${done}/${V.pres.length}명 완료). 제시 합(S)은 평균 ${Sx}점쯤으로 보여요 — 그보다 많이 캐면(M ≥ S) 남는 (M−S)점을 우리 조 3명이 나눠요.` };
      if (V.bidDone[me]) return { opp, mine, rec: `내 제시 ${V.mineBid}점 — 기다려요`, why: `다른 제시자 ${done - 1}/${V.pres.length - 1}명이 정했어요. 제시 합(S)은 평균 ${Sx}점쯤으로 보여요 — 광부가 그만큼 캐면 내 ${V.mineBid}점을 받고, 모자라면 0점이에요.` };
      const a = actBid(V, me, "hard", sampler(V.turn * 131 + me * 7 + V.score[me] + 3)), emp = allBids(V, V.ver === "b" ? me : -1), base = emp.length ? Math.round(emp.reduce((x, y) => x + y, 0) / emp.length) : 4;
      return { opp, mine, rec: `${a.v}점 제시`, why: `광부 3명이 평균 ${avgM === null ? "20점 안팎" : avgM + "점"}쯤 캔다고 보고, 다른 제시자들이 평균 ${base}점씩 낸다고 가정해 계산했어요${a.ev !== undefined ? ` (이 제시의 기대 점수 약 ${a.ev >= 0 ? "+" : ""}${a.ev.toFixed(1)}점)` : ""}. 6명의 제시 합(S)이 채굴 점수(M)보다 크면 모두 0점이고 가장 높게 낸 사람은 자기 점수만큼 잃어요 — 너무 높게도, 너무 낮게도 말아요.` };
    }
    const cur = V.cur, rest = V.bagN, p = rest ? V.left.b / rest : 0, pct = Math.round(p * 100);
    if (V.ver === "b") return coachMineB(V, me, who, opp, mine, Sx, cur, rest, pct);
    if (cur !== me) {
      const isMiner = V.miners.includes(me), wait = isMiner ? ` 같은 조 광부로서 M ≥ S(평균 ${Sx}점)가 되면 (M−S)÷3을 받아요.` : V.mineBid !== null ? ` 내 제시 ${V.mineBid}점은 M ≥ S(평균 ${Sx}점)일 때만 받아요 — 지금 채굴 ${V.M}점은 그 ${Math.round(100 * V.M / Math.max(1, Sx))}%예요.` : "";
      return { opp, mine, rec: "기다려요", why: `${who(cur)} 차례예요 · 지금까지 ${V.drawn.length}개 · 채굴 ${V.M}점 · 폭탄 ${V.B}/3개 · 다음에 폭탄이 나올 확률 약 ${pct}%.${wait}` };
    }
    const a = actMine(V, me, "hard", sampler(V.turn * 71 + V.drawn.length * 13 + me + 9));
    const exp = meanS(V);
    return { opp, mine: `${mine} · 지금 채굴 ${V.M}점 · 폭탄 ${V.B}개`, rec: `${a.t === "draw" ? "하나 더 꺼내요" : "스톱"}${a.dDraw !== undefined ? ` (꺼내면 평균 ${a.dDraw.toFixed(1)}점 · 스톱하면 ${a.dStop.toFixed(1)}점)` : ""}`, why: `제시 합(S)은 평균 ${Math.round(exp)}점쯤으로 보여요. 채굴 점수가 S를 넘으면 (M−S)÷3 만, 못 넘으면 M÷3을 받지만 폭탄이 3개면 0점이에요. 다음에 폭탄이 나올 확률은 약 ${pct}% (남은 ${V.left.b}/${rest}).${a.dDraw !== undefined ? ` 계산: 꺼내면 평균 ${a.dDraw.toFixed(1)}점 · 스톱하면 ${a.dStop.toFixed(1)}점.` : ""}` };
  }

  return { id: "gn-miner", N, TURNS, BMIN, BMAX, TEAM, BAG, VAL, NAME, EM, BAGN, GRABS, init, needs, apply, view, over, ranks, legal, auto, advance, tally, leftOf, settle, share, compareBids, compareMine, compareMineB, minerDraw, simMine, simMineB, planK, pBust, evalMineB, sampleBids, evalBids, actBid, actMine, actMineB, ai, coach, meanS, allBids, sampler, hash, CANDS };
});

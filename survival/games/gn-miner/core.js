/* 베니 서바이벌 · 광부 게임 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 5화 메인 매치 — 9명이 3명씩 3조, 한 조가 광부(광물 채굴) · 나머지 6명이 제시자(비공개로 '나눠 갖고 싶은 점수' 1~50)
   · 광물 49개: 금 14(3점) · 은 14(2점) · 동 14(1점) · 다이아몬드 2(채굴 합계 ×2) · 폭탄 5(0점)
   · 광부는 순서대로 광물을 1개씩 꺼내거나 스톱 (꺼낸 광물은 모두 봐요). 폭탄 3개가 나오면 끝
   · 정산 (M = 채굴 점수, S = 제시 합, B = 폭탄 수):
       B ≥ 3 → 광부 0점, 제시자는 각자 제시한 점수를 받아요
       M ≥ S → 제시자는 제시한 점수를 받고, 남은 점수 (M − S) 를 광부 3명이 똑같이 나눠요 (나머지 버림)
       M < S → 제시자 전원 0점, 광부 3명이 M 을 똑같이 나눠요 · 가장 높게 제시한 사람은 그 점수만큼 감점, 감점 합은 가장 낮게 제시한 사람이 가져가요 (여럿이면 나눔, 모두 같으면 변동 없음)
   · 3라운드 × 3조 — 1라운드는 1조부터, 2라운드부터는 조원 점수 합이 낮은 조부터 · 점수 합계 1위 우승, 꼴찌 탈락 후보
   우리 판 다듬기(방송 문서에 없음): 광물 49개는 조마다 다시 채워요 · 다이아몬드는 하나마다 ×2 (둘이면 ×4) · 꺼낸 광물은 모두에게 공개 ·
   채굴 순서는 조마다 무작위 · 폭탄이 3개 나오면 바로 끝 · 협상 · 연합 없음 (AI 는 혼자 판단) · 나머지 점수는 버려요 */
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
    st.hist.push({ t: st.turn, r: Math.floor(st.turn / TEAM), g: st.gorder[st.turn % TEAM], miners: st.miners.slice(), drawn: st.drawn.slice(), why, M: res.M, B: res.B, S: res.S, kind: res.kind, bids: Object.assign({}, st.bids), d: Object.assign({}, res.d) });
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
    const x = st.bag.pop();
    st.drawn.push(x); push(st, { k: "draw", s: seat, x });
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
    return seat === st.miners[st.cur] ? [{ t: "stop" }, { t: "draw" }] : [];   // 시간이 다 되면 첫 수(스톱)로 대신해요
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const t = tally(st.drawn), left = leftOf(st.drawn);
    const bidDone = Array(N).fill(false); for (const s of Object.keys(st.bids)) bidDone[+s] = true;
    const tsc = [0, 1, 2].map(g => tsum(st, g));
    const mine = me >= 0 && st.bids[me] !== undefined ? st.bids[me] : null;
    const pubObj = { g: st.groups, t: st.turn, ph: st.phase, mi: st.miners, bd: bidDone, dr: st.drawn, h: st.hist, sc: st.score, c: st.cur, go: st.gorder };
    return {
      n: N, seat, phase: st.phase, turn: st.turn, round: Math.floor(st.turn / TEAM), pos: st.turn % TEAM, turns: TURNS,
      groups: st.groups.map(g => g.slice()), gOf: st.gOf.slice(), gorder: st.gorder.slice(), tscore: tsc,
      miners: st.miners.slice(), pres: st.pres.slice(), cur: st.phase === "mine" ? st.miners[st.cur] : -1, bidDone,
      mineBid: mine, bids: all ? Object.assign({}, st.bids) : null,
      drawn: st.drawn.slice(), M: t.M, B: t.b, left, bagN: BAGN - st.drawn.length,
      hist: st.hist.map(h => ({ t: h.t, r: h.r, g: h.g, miners: h.miners.slice(), drawn: h.drawn.slice(), why: h.why, M: h.M, B: h.B, S: h.S, kind: h.kind, bids: Object.assign({}, h.bids), d: Object.assign({}, h.d) })),
      score: st.score.slice(), needs: needs(st), over: st.over, ranks: st.over ? st.ranks.slice() : null,
      log: st.log.slice(-40), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const PRIOR_BIDS = [2, 3, 3, 4, 4, 5, 5, 6, 8, 10];
  function allBids(V) { const a = []; for (const h of V.hist) for (const s of Object.keys(h.bids)) a.push(h.bids[s]); return a; }
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
  function sampleBids(V, k, r) {
    const emp = allBids(V), pool = emp.length >= 6 ? emp : PRIOR_BIDS.concat(emp), out = [];
    for (let i = 0; i < k; i++) out.push(r() < 0.12 ? 1 + Math.floor(r() * 12) : pickBid(pool, r));
    return out;
  }
  const bestIdx = (arr, r) => { let m = -Infinity; for (const x of arr) if (x > m) m = x; const near = arr.map((x, i) => (x >= m - Math.max(0.05, Math.abs(m) * 0.02) ? i : -1)).filter(i => i >= 0); return near[Math.floor(r() * near.length)]; };
  const CANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 25, 30, 40, 50];
  const targetT = V => clamp(Math.round(Math.max(14, meanS(V) * 1.1 + 3)), 14, 60);   // 기본 광부가 노리는 채굴 점수
  function sampleM(V, r) {   // 광부들이 이번에 캘 점수: 지난 조들의 기록(최근 것에 가중)으로, 없으면 기본 규칙 광부로
    const hs = V.hist;
    if (hs.length >= 2) { const h = hs[Math.max(0, hs.length - 1 - Math.floor(r() * r() * hs.length))]; return { M: Math.max(0, Math.round(h.M * (0.8 + r() * 0.4))), B: h.B }; }
    return simMine([], 14 + Math.floor(r() * 17), r);
  }
  function evalBids(V, me, r, trials) {   // 후보 제시 점수마다 평균 점수 (같은 표본으로 견줘요)
    const miners = V.miners, others = V.pres.filter(s => s !== me), sums = Array(CANDS.length).fill(0);
    for (let i = 0; i < trials; i++) {
      const m = sampleM(V, r), ob = sampleBids(V, others.length, r);
      CANDS.forEach((b, ci) => {
        const bids = { [me]: b }; others.forEach((s, j) => { bids[s] = ob[j]; });
        sums[ci] += settle(bids, miners, m.M, m.B).d[me];
      });
    }
    return sums.map(x => x / trials);
  }
  function actBid(V, me, tier, r) {
    if (tier === "easy") return { t: "bid", v: r() < 0.8 ? 1 + Math.floor(r() * 20) : 1 + Math.floor(r() * 50) };
    const emp = allBids(V), base = emp.length ? emp.reduce((a, b) => a + b, 0) / emp.length : 4;
    if (tier === "normal") {
      const last = V.hist[V.hist.length - 1], f = !last ? 1 : last.kind === "short" ? 0.8 : last.kind === "ok" && last.M - last.S > 6 ? 1.25 : 1;
      return { t: "bid", v: clamp(Math.round(base * f + (r() * 3 - 1.5)), 1, 14) };
    }
    const ev = evalBids(V, me, r, 140), i = bestIdx(ev, r);
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
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "bid") { const a = actBid(V, me, tier, r); return { t: "bid", v: a.v }; }
    const a = actMine(V, me, tier, r); return { t: a.t };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const teamTxt = (V, g, who) => V.groups[g].map(who).join("·");
  function coach(V, me, since, names) {
    const who = i => (i === me ? "나" : nm(names, i));
    if (!(me >= 0 && me < N)) return { opp: "구경 중이에요", mine: `${V.round + 1}라운드 · 순서 ${V.pos + 1}/3`, rec: "-", why: "자리에 앉은 사람에게만 추천이 나와요." };
    const myG = V.gOf[me];
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), mx = Math.max(...V.ranks), last = V.ranks.map((x, i) => (x === mx ? i : -1)).filter(i => i >= 0);
      return { opp: `최종 점수: ${V.score.map((s, i) => `${who(i)} ${s}`).join(" · ")}`, mine: `내 점수 ${V.score[me]}점 · ${V.ranks[me] + 1}위`, rec: first.includes(me) ? "우승이에요!" : "점수 합계가 가장 높은 사람이 우승이에요", why: `우승 ${first.map(who).join("·")} · 꼴찌 ${last.map(who).join("·")}. 광부일 땐 제시 합(S)을 넘기지 않게, 제시자일 땐 광부가 캘 만큼만 제시하는 게 핵심이에요.` };
    }
    const hs = V.hist, avgM = hs.length ? Math.round(hs.reduce((a, h) => a + h.M, 0) / hs.length) : null, avgS = hs.length ? Math.round(hs.reduce((a, h) => a + h.S, 0) / hs.length) : null;
    const bombs = hs.filter(h => h.B >= 3).length, shorts = hs.filter(h => h.kind === "short").length;
    const opp = hs.length ? `지난 ${hs.length}조: 평균 채굴 ${avgM}점 · 평균 제시 합 ${avgS}점 · 목표 모자람 ${shorts}번 · 폭탄 3개 ${bombs}번` : "아직 지난 조가 없어요 — 평균 제시 합은 알 수 없어요";
    const ownTurns = hs.filter(h => h.miners.includes(me)).length;
    const mine = `내 점수 ${V.score[me]}점 (${V.ranks ? "" : `내 조 합계 ${V.tscore[myG]}`}) · 광부 ${ownTurns}번 지남 · 이번 조: ${V.miners.map(who).join(" → ")}`;
    if (V.phase === "bid") {
      if (V.gOf[V.miners[0]] === myG) return { opp, mine, rec: "제시자들이 정하는 동안 기다려요", why: `제시자 ${V.pres.length}명이 비밀로 점수를 정하고 있어요 (${V.bidDone.filter(Boolean).length}/${V.pres.length}명 완료). 그다음 내 조가 광물을 캐요 — 제시 합(S)보다 많이 캐면 남는 점수를 우리 조가 나눠요.` };
      if (V.bidDone[me]) return { opp, mine, rec: `내 제시 ${V.mineBid}점 — 기다려요`, why: "다른 제시자를 기다리는 중이에요." };
      const a = actBid(V, me, "hard", sampler(V.turn * 131 + me * 7 + V.score[me] + 3)), emp = allBids(V), base = emp.length ? Math.round(emp.reduce((x, y) => x + y, 0) / emp.length) : 4;
      return { opp, mine, rec: `${a.v}점 제시`, why: `광부 3명이 평균 ${avgM === null ? "20점 안팎" : avgM + "점"}쯤 캔다고 보고, 다른 제시자들이 평균 ${base}점씩 낸다고 가정해 계산했어요. 6명의 제시 합(S)이 채굴 점수(M)보다 크면 모두 0점이고 가장 높게 낸 사람은 자기 점수만큼 잃어요 — 너무 높게도, 너무 낮게도 말아요.` };
    }
    const cur = V.cur;
    if (cur !== me) return { opp, mine, rec: "기다려요", why: `${who(cur)} 차례예요 · 지금까지 ${V.drawn.length}개 · 채굴 ${V.M}점 · 폭탄 ${V.B}개.` };
    const a = actMine(V, me, "hard", sampler(V.turn * 71 + V.drawn.length * 13 + me + 9)), rest = V.bagN, p = rest ? V.left.b / rest : 0;
    const exp = meanS(V);
    return { opp, mine: `${mine} · 지금 채굴 ${V.M}점 · 폭탄 ${V.B}개`, rec: a.t === "draw" ? "하나 더 꺼내요" : "스톱", why: `제시 합(S)은 평균 ${Math.round(exp)}점쯤으로 보여요. 채굴 점수가 S 를 넘으면 (M−S)÷3 만, 못 넘으면 M÷3 을 받지만 폭탄이 3개면 0점이에요. 다음에 폭탄이 나올 확률은 약 ${Math.round(p * 100)}% (남은 ${V.left.b}/${rest}).${a.dDraw !== undefined ? ` 계산: 꺼내면 평균 ${a.dDraw.toFixed(1)}점 · 스톱하면 ${a.dStop.toFixed(1)}점.` : ""}` };
  }

  return { id: "gn-miner", N, TURNS, BMIN, BMAX, TEAM, BAG, VAL, NAME, EM, BAGN, init, needs, apply, view, over, ranks, legal, auto, advance, tally, leftOf, settle, share, minerDraw, simMine, sampleBids, evalBids, actBid, actMine, ai, coach, meanS, allBids, sampler, hash, CANDS };
});

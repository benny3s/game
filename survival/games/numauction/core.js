/* 베니 서바이벌 · 숫자 경매 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌2 · 숫자 경매 (세미파이널)
   · 사람마다 자금 블록 11개 (1·2·3·4·6·8·10·12·15·20·25, 합 106). 경매 카드 16장 = 매물 1~10 · GOOD 3장 · BAD 3장 (−5점 · 점수 절반 · 매물 반납)
   · 라운드마다 카드 1장 공개 → 차례대로 한 명씩 '내 입찰 더미에 블록을 더 얹어 합을 지금 최고 합보다 크게' 또는 '패스'
     패스하면 낸 블록을 돌려받고 그 라운드에서 빠짐 · 합을 못 넘기면 반드시 패스 · 한 명만 남으면 낙찰, 낸 블록은 사라짐
   · BAD 는 거꾸로: 가장 먼저 패스한 사람이 받고 (낸 블록은 사라짐), 나머지는 낸 블록을 돌려받음
   · 점수: 가진 매물 숫자 합 → GOOD 마다 ×2 → −5 → 점수 절반 (소수 한 자리). 매물 반납: 받는 즉시 가진 매물 또는 GOOD 1장을 반납, 없으면 다음에 받는 매물 1장을 반납
   · 끝: GOOD 3장과 '점수 절반'이 모두 낙찰되면 (또는 카드 소진). 점수 높은 쪽이 1등 — 단 1등이 남은 블록 합이 가장 적으면 자격을 잃고 차순위가 1등. 동점은 남은 블록이 많은 쪽 위, 맨 아래는 탈락
   우리 판 다듬기 (방송과 다른 점):
   · 3~6명 (방송 5명). 첫 순서는 추첨, 다음 라운드부터 직전 낙찰자 (BAD 는 받은 사람) 가 먼저. 입찰은 돌아가며 한 번에 한 명씩 — 합이 제일 큰 사람은 차례가 안 옴
   · 모두 패스해 한 명만 남으면 아무것도 안 내도 낙찰 (낸 블록 0). 블록 추가 구매 없음. 블록 · 점수는 전부 공개
   · GOOD 은 장마다 ×2 (3장이면 ×8). 반납된 카드는 게임에서 빠지고 '낙찰된 것'으로 셈 (끝 조건에 그대로 셈)
   · 순위: 점수 → 같으면 남은 블록 합. 1등이 혼자 블록이 가장 적으면 1등 자리에서 빠지고 점수 동점 1등들 바로 뒤로 가고 다음 사람이 1등 (같은 값이 있으면 그대로) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).numauction = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const BLOCKS = [1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25], NB = BLOCKS.length, FULL = (1 << NB) - 1, TOT = 106;
  const NC = 16, GOOD0 = 10, M5 = 13, HALF = 14, RET = 15;   // 카드 id: 0~9 매물(숫자 = id+1) · 10~12 GOOD · 13 −5점 · 14 점수 절반 · 15 매물 반납
  const isItem = c => c >= 0 && c < GOOD0, isGood = c => c >= GOOD0 && c < M5, isBad = c => c >= M5;
  const cardName = c => (isItem(c) ? String(c + 1) : isGood(c) ? "GOOD" : c === M5 ? "−5점" : c === HALF ? "점수 절반" : "매물 반납");
  const SUM = new Int16Array(1 << NB);
  for (let m = 1; m < SUM.length; m++) SUM[m] = SUM[m & (m - 1)] + BLOCKS[31 - Math.clz32(m & -m)];
  const pop = m => { let c = 0; for (; m; m &= m - 1) c++; return c; };
  const idxList = m => { const a = []; for (let k = 0; k < NB; k++) if (m & (1 << k)) a.push(k); return a; };
  const bitsOf = l => l.reduce((m, k) => m | (1 << k), 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 100) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 점수: 매물 합 → GOOD ×2 → −5 → 절반. fb = 앞으로 더 얻을 것으로 기대하는 매물 점수 (AI 가 미리 셈할 때만)
  function scoreOf(cards, fb) {
    let b = fb || 0, g = 0, m = 0, h = 0;
    for (const c of cards) { if (isItem(c)) b += c + 1; else if (isGood(c)) g++; else if (c === M5) m++; else if (c === HALF) h++; }
    let s = b * (1 << g) - 5 * m;
    if (h) s /= 2 ** h;
    return s;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed }) {
    n = Math.max(3, Math.min(6, n | 0));
    const st = {
      n, rs: (seed >>> 0) || 1, seq: 0, log: [], round: 0, phase: "", over: false, turn: -1,
      deck: [], card: -1, seen: [], have: Array(n).fill(FULL), pile: Array(n).fill(0), won: Array.from({ length: n }, () => []), debt: Array(n).fill(0),
      aw: Array(NC).fill(false), gone: [], first: 0, active: Array(n).fill(true), top: 0, topSeat: -1, res: null, final: null,
    };
    st.deck = shuffle(() => rnd(st), Array.from({ length: NC }, (_, k) => k));
    st.first = Math.floor(rnd(st) * n);
    startRound(st);
    return st;
  }
  // 시험용: 카드가 열리는 순서(order)와 첫 순서를 정해 처음부터 다시 시작
  function deal(st, order, first) {
    st.deck = order.slice().reverse(); st.seen = []; st.round = 0; st.first = first; st.log = []; st.seq = 0;
    st.have = Array(st.n).fill(FULL); st.won = Array.from({ length: st.n }, () => []); st.debt = Array(st.n).fill(0);
    st.aw = Array(NC).fill(false); st.gone = []; st.over = false; st.final = null;
    startRound(st);
    return st;
  }
  const allDone = st => st.aw[GOOD0] && st.aw[GOOD0 + 1] && st.aw[GOOD0 + 2] && st.aw[HALF];
  const pileSum = (st, i) => SUM[st.pile[i]];
  const freeMask = (st, i) => st.have[i] & ~st.pile[i];
  const nextActive = (st, from) => { for (let k = 1; k <= st.n; k++) { const i = (from + k) % st.n; if (st.active[i]) return i; } return -1; };
  const canRaise = (st, i) => SUM[freeMask(st, i)] > st.top - pileSum(st, i);

  function startRound(st) {
    st.round++; st.card = st.deck.pop(); st.seen.push(st.card);
    st.active = Array(st.n).fill(true); st.pile = Array(st.n).fill(0); st.top = 0; st.topSeat = -1; st.res = null;
    st.turn = st.first; st.phase = "bid";
    push(st, { k: "round", r: st.round, c: st.card, f: st.first });
    settle(st);
  }
  // 합을 못 넘기는 차례는 저절로 패스
  function settle(st) { while (st.phase === "bid" && !canRaise(st, st.turn)) pass(st, st.turn, true); }
  function pass(st, seat, forced) {
    push(st, { k: "pass", s: seat, forced: forced ? 1 : 0, lose: isBad(st.card) ? pileSum(st, seat) : 0 });
    st.active[seat] = false;
    if (isBad(st.card)) return resolve(st, seat);
    st.pile[seat] = 0;
    const left = st.active.map((a, i) => (a ? i : -1)).filter(i => i >= 0);
    if (left.length === 1) resolve(st, left[0]); else st.turn = nextActive(st, seat);
  }
  const returnable = (st, w) => st.won[w].filter(c => isItem(c) || isGood(c));
  function resolve(st, w) {
    const c = st.card, spent = st.pile[w], res = (st.res = { w, c, paid: SUM[spent], blocks: idxList(spent), back: null, ret: null, debt: false });
    st.have[w] &= ~spent; st.pile = Array(st.n).fill(0);
    st.first = w; st.turn = -1; st.aw[c] = true;
    if (isItem(c)) { if (st.debt[w] > 0) { st.debt[w]--; res.back = c; st.gone.push(c); } else st.won[w].push(c); }
    else if (c !== RET) st.won[w].push(c);
    else if (returnable(st, w).length) { st.phase = "ret"; st.turn = w; push(st, { k: "win", s: w, c, paid: res.paid }); return; }
    else { st.debt[w]++; res.debt = true; }
    push(st, { k: "win", s: w, c, paid: res.paid, back: res.back });
    st.phase = "show";
  }
  function standings(st) {
    const n = st.n, sc = st.won.map(c => scoreOf(c)), rem = st.have.map(m => SUM[m]);
    const better = (a, b) => sc[a] > sc[b] || (sc[a] === sc[b] && rem[a] > rem[b]);
    const rk = sc.map((_, i) => { let c = 0; for (let j = 0; j < n; j++) if (j !== i && better(j, i)) c++; return c; });
    const tops = rk.map((r, i) => (r === 0 ? i : -1)).filter(i => i >= 0);
    let dq = -1, ranks = rk;
    if (tops.length === 1 && rem.every((x, j) => j === tops[0] || x > rem[tops[0]])) dq = tops[0];
    if (dq >= 0) {
      const others = sc.map((_, i) => i).filter(i => i !== dq), r2 = {};
      for (const i of others) r2[i] = others.filter(j => j !== i && better(j, i)).length;
      const t = others.filter(i => r2[i] === 0).length;
      ranks = rk.map((_, i) => (i === dq ? t : r2[i] === 0 ? 0 : r2[i] + 1));
    }
    const worst = Math.max(...ranks);
    return { score: sc, rem, ranks, dq, out: worst > 0 ? ranks.map((r, i) => (r === worst ? i : -1)).filter(i => i >= 0) : [] };
  }
  function finish(st) { st.final = standings(st); st.over = true; st.phase = "end"; st.turn = -1; push(st, { k: "end" }); }

  const needs = st => (!st.over && (st.phase === "bid" || st.phase === "ret") ? [st.turn] : []);
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "ret") {
      if (a.t !== "ret" || !returnable(st, seat).includes(a.c)) return { ok: false, err: "돌려줄 매물이나 GOOD 카드를 골라요" };
      st.won[seat] = st.won[seat].filter(c => c !== a.c); st.gone.push(a.c); st.res.ret = a.c;
      push(st, { k: "ret", s: seat, c: a.c });
      st.phase = "show"; st.turn = -1;
      return { ok: true };
    }
    if (a.t === "pass") { pass(st, seat, false); settle(st); return { ok: true }; }
    if (a.t !== "bid") return { ok: false, err: "블록을 얹거나 패스해요" };
    if (!Array.isArray(a.c) || !a.c.length) return { ok: false, err: "얹을 블록을 골라 주세요" };
    let add = 0;
    for (const k of a.c) {
      if (!Number.isInteger(k) || k < 0 || k >= NB || !(freeMask(st, seat) & (1 << k)) || (add & (1 << k))) return { ok: false, err: "낼 수 없는 블록이에요" };
      add |= 1 << k;
    }
    const tot = pileSum(st, seat) + SUM[add];
    if (tot <= st.top) return { ok: false, err: `합계가 ${st.top} 보다 커야 해요 (지금 ${tot})` };
    st.pile[seat] |= add; st.top = tot; st.topSeat = seat;
    push(st, { k: "bid", s: seat, b: idxList(add), add: SUM[add], tot });
    st.turn = nextActive(st, seat);
    settle(st);
    return { ok: true };
  }
  const auto = st => (st.phase === "show" ? (isBad(st.res.c) ? 4200 : 3400) : null);
  function advance(st) {
    if (st.phase !== "show") return;
    if (!st.deck.length || allDone(st)) finish(st); else startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => standings(st).ranks;

  // 줄 수 있는 입찰: 합이 need 를 넘는 가장 작은 블록 묶음들 (하나 빼면 못 넘는 것)
  function raiseOptions(free, need) {
    const out = [];
    for (let m = free; m; m = (m - 1) & free) {
      const s = SUM[m];
      if (s <= need) continue;
      let min = true;
      for (let b = m; b; b &= b - 1) if (s - BLOCKS[31 - Math.clz32(b & -b)] > need) { min = false; break; }
      if (min) out.push(m);
    }
    return out;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "ret") return returnable(st, seat).map(c => ({ t: "ret", c }));
    return [{ t: "pass" }].concat(raiseOptions(freeMask(st, seat), st.top - pileSum(st, seat)).map(m => ({ t: "bid", c: idxList(m) })));
  }

  // ── 보이는 것 (블록 · 점수는 모두 공개, 숨는 것은 아직 안 열린 카드의 순서뿐) ───────────────
  function view(st, seat) {
    const V = {
      n: st.n, round: st.round, phase: st.phase, card: st.card, seen: st.seen.slice(), left: st.deck.slice().sort((a, b) => a - b),
      have: st.have.map(idxList), pile: st.pile.map(idxList), haveSum: st.have.map(m => SUM[m]), pileSum: st.pile.map(m => SUM[m]),
      top: st.top, topSeat: st.topSeat, active: st.active.slice(), turn: st.turn, first: st.first,
      won: st.won.map(a => a.slice()), debt: st.debt.slice(), gone: st.gone.slice(),
      res: st.res ? { ...st.res, blocks: st.res.blocks.slice() } : null,
      final: st.final ? { ...st.final, score: st.final.score.slice(), rem: st.final.rem.slice(), ranks: st.final.ranks.slice(), out: st.final.out.slice() } : null,
      needs: needs(st), over: st.over, ranks: st.over ? st.final.ranks.slice() : null, score: st.won.map(c => scoreOf(c)), log: st.log.slice(-60),
    };
    V.pub = hash(JSON.stringify(V));
    V.seat = seat;
    return V;
  }

  // ── AI (보이는 것만) ────────────────────────────────────────
  const nextAct = (V, from) => { for (let k = 1; k <= V.n; k++) { const i = (from + k) % V.n; if (V.active[i]) return i; } return -1; };
  // 합이 min 이상이 되는 가장 작은 묶음 (같으면 블록 수가 적은 쪽)
  function pickAdd(free, min) {
    let best = 0, bs = 1e9, bc = 99;
    for (let m = free; m; m = (m - 1) & free) {
      const s = SUM[m]; if (s < min || s > bs) continue;
      const c = pop(m); if (s < bs || c < bc) { best = m; bs = s; bc = c; }
    }
    return best;
  }
  // 앞으로: 몇 장 더 열릴지 (GOOD · 절반이 다 열려야 끝) · 남은 매물 중 얼마나 나올지
  function outlook(V, tier) {
    const L = V.left, m = L.length, items = L.filter(isItem), k = L.filter(c => isGood(c) || c === HALF).length;
    const E = tier === "easy" ? m : !k ? 0 : tier === "hard" ? (k * (m + 1)) / (k + 1) : m * 0.8, frac = m ? E / m : 0;
    const sum = items.reduce((s, c) => s + c + 1, 0);
    return { m, k, E, frac, avg: items.length ? sum / items.length : 5.5, fut: sum * frac, goods: L.filter(isGood).length };
  }
  // 이 카드를 받으면 내 점수가 몇 점 변하나 (앞으로 받을 매물은 기대값으로)
  function valueOf(V, me, card, o, tier) {
    if (tier === "easy") return isItem(card) ? card + 1 : isGood(card) ? 8 : card === M5 ? -5 : card === HALF ? -8 : -6;
    const cs = V.won[me], fb = o.fut / V.n, base = scoreOf(cs, fb), lose = Math.max(0, fb - o.avg * 0.85);
    if (isItem(card)) return V.debt[me] > 0 ? base - scoreOf(cs, lose) : scoreOf(cs.concat(card), fb) - base;
    if (card === RET) {
      const opts = cs.filter(c => isItem(c) || isGood(c));
      return (opts.length ? Math.max(...opts.map(c => scoreOf(cs.filter(x => x !== c), fb))) : scoreOf(cs, lose)) - base;
    }
    return scoreOf(cs.concat(card), fb) - base;
  }
  const G = V => 55 / V.n;   // GOOD 한 장의 평균 값어치 (매물 합 55 를 나눠 가진 몫)
  // 1점이 시장에서 블록 몇 개쯤인가 (모두의 남은 블록 ÷ 앞으로 오갈 점수)
  function priceOf(V, o, card) {
    const R = V.haveSum.reduce((a, b) => a + b, 0);
    const cur = isItem(card) ? (card + 1) * 1.15 : isGood(card) ? G(V) : 0;
    return R / Math.max(1, cur + (o.fut + o.goods * G(V) * o.frac) * 1.15);
  }
  // 끝 무렵 남들의 남은 블록 중 가장 적은 값 짐작 (모두가 지금까지 쓴 속도로 앞으로도 쓰고 남들이 똑같이 나눠 쓴다고 보고). 일반은 반만 믿음
  function reserveOf(V, me, o, tier) {
    const done = Math.max(0, V.round - 1), spent = V.n * TOT - V.haveSum.reduce((a, b) => a + b, 0);
    const fut = ((spent + 30) / (done + 1)) * (o.E + 1) / V.n;
    let low = TOT;
    for (let j = 0; j < V.n; j++) if (j !== me) low = Math.min(low, tier === "hard" ? V.haveSum[j] - Math.max(fut, ((TOT - V.haveSum[j]) * (o.E + 1) * 0.7) / Math.max(1, done)) : V.haveSum[j] * 0.5);
    return Math.max(0, Math.min(TOT, low));
  }
  // 내 차례 계획: { a: 낼 행동, val: 이 카드의 값(점), p: 1점당 블록, willing: 낼 수 있는 최대 합, tot: 내가 만들 합, why }
  function plan(V, me, tier, r) {
    const o = outlook(V, tier), card = V.card, val = valueOf(V, me, card, o, tier), p = priceOf(V, o, card);
    const free = bitsOf(V.have[me]) & ~bitsOf(V.pile[me]), pile = V.pileSum[me], need = V.top - pile;
    const out = { a: { t: "pass" }, val, p, o, need, pile, willing: 0, tot: null, why: "pass" };
    const bid = (m, why) => { out.a = { t: "bid", c: idxList(m) }; out.tot = pile + SUM[m]; out.why = why; };
    if (isBad(card)) {
      // 거꾸로 경매: 먼저 패스하는 사람이 받음 → 다음 사람이 못 넘기게 합을 끌어올리면 그 사람이 받음
      const pen = Math.max(0, -val), X = nextAct(V, me), capX = V.haveSum[X];
      const kmin = Math.max(capX, V.top + 1) - pile, kill = kmin <= SUM[free] ? pickAdd(free, kmin) : 0, minM = pickAdd(free, need + 1);
      out.pen = pen; out.willing = pen * p;
      if (tier === "easy") { if (minM && r() < 0.45) bid(minM, "눈치"); }
      else if (kill && (tier === "hard" || r() > 0.2)) bid(kill, "kill");
      else if (minM && (tier === "hard" || r() > 0.3) && 0.4 * (pen * p + pile) > 0.6 * SUM[minM]) bid(minM, "gamble");
      return out;
    }
    const shade = tier === "hard" ? 0.92 : tier === "normal" ? 0.75 + r() * 0.3 : 0.25 + r() * 1.1;
    let pp = p;
    if (tier !== "easy") {   // 1등이 돼도 남은 블록이 혼자 제일 적으면 박탈 → 남들의 끝 무렵 남은 블록(지금까지 쓴 속도로 짐작)보다 적게 남지 않게 아껴 씀
      const budget = Math.max(0, V.haveSum[me] - reserveOf(V, me, o, tier));
      const cur = isItem(card) ? (card + 1) * 1.15 : G(V), share = (tier === "hard" ? 0.8 : 1) / V.n;
      pp = Math.min(p, budget / Math.max(1, cur + o.fut * share));
      out.budget = budget;
    }
    let willing = val > 0 ? val * pp * shade : 0;
    out.willing = willing;
    if (willing > V.top) {
      const step = Math.max(1, Math.round((willing - V.top) * (tier === "hard" ? 0.45 : 0.5)));
      let m = pickAdd(free, need + step);
      if (!m || pile + SUM[m] > willing) m = pickAdd(free, need + 1);
      if (tier === "easy" && m && r() < 0.3) { const L = raiseOptions(free, need); m = L[Math.floor(r() * L.length)]; }
      if (m && pile + SUM[m] <= willing) bid(m, "bid");
    }
    return out;
  }
  function ai(V, me, tier, r) {
    if (V.phase === "ret") {
      const o = outlook(V, tier), cs = V.won[me], opts = cs.filter(c => isItem(c) || isGood(c));
      if (tier === "easy") return { t: "ret", c: opts[Math.floor(r() * opts.length)] };
      const fb = o.fut / V.n; let best = opts[0], bs = -1e9;
      for (const c of opts) { const s = scoreOf(cs.filter(x => x !== c), fb); if (s > bs) { bs = s; best = c; } }
      return { t: "ret", c: best };
    }
    return V.phase === "bid" ? plan(V, me, tier, r).a : null;
  }

  return {
    id: "numauction", BLOCKS, NB, TOT, cardName, isItem, isGood, isBad, GOOD0, M5, HALF, RET, NC,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    scoreOf, standings, raiseOptions, pickAdd, outlook, valueOf, priceOf, plan, deal,
  };
});

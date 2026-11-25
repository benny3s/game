/* 베니 서바이벌 · HIT, STAY — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 6일차 메인 매치 'HIT, STAY' (나무위키 '룰' 절 기준 — 진행 절은 비어 있어 아래 '확인 못 한 점'은 우리가 정함)
   · 숫자 카드 35장: 7이 1장 · 6이 2장 · 5가 3장 · 4가 4장 · 3이 5장 · 2가 6장 · 1이 7장 · −1이 7장 (매 라운드 새로 섞음)
   · 칩 30개씩 (방송: 피스 1개 = 칩 1개). 기본 베팅 1칩, 10라운드마다 1칩씩 늘어남. 선 플레이어는 라운드마다 왼쪽(시계방향) 사람으로 옮겨감.
   · 라운드: 기본 베팅 → 한계 숫자(8면체 주사위 5~12) → 카드 3장씩 받고 각자 1장 공개(나머지 2장은 숨김) → 1차 베팅(콜 · 레이즈 · 폴드, 한 사람이 걸 수 있는 칩은 칩이 가장 적은 사람의 칩 수까지)
     → 선부터 HIT(카드 1장 더 · 모두에게 공개) 또는 STAY → (전원 STAY 이거나 카드가 없으면) 2차 베팅 → 카드 공개
   · 카드 합이 한계 숫자에 가까울수록 승 · 같으면 카드 수가 많은 쪽 · 한계를 넘으면(bust) 그 라운드 최하위 · 승자가 걸린 칩을 다 가짐
     그 밖의 동률은 무승부: 걸린 칩을 똑같이 나누고 남는 칩은 선에 가까운 쪽이 가짐
   · 칩이 가장 먼저 0 이 된 사람이 탈락(최하위), 한 명 남을 때까지 계속 → 마지막 한 명이 1위
   확인 못 한 점(우리가 정함): ① 1·2차 베팅에서 아무도 안 걸었으면 체크 가능 ② STAY 한 사람은 다시 HIT 못 함 ③ 카드가 다 떨어지면 바로 2차 베팅
     ④ 살아남은 사람이 전부 bust 면 한계를 가장 덜 넘은 사람이 이김 ⑤ 칩이 모자라 기본 베팅을 다 못 내면 있는 만큼만 냄
   우리 판: 2~6명(방송 5명) · 피스 · 상금 · 징표 없음 · 칩 30개(빠르게 15개 선택 가능) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).hitstay = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DECK = [7, 6, 6, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1];
  const SUMV = a => a.reduce((x, y) => x + y, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 100) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const anteOf = hand => 1 + Math.floor((hand - 1) / 10);

  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(6, n | 0));
    const start = cfg && +cfg.chips === 15 ? 15 : 30;
    const st = { n, rs: (seed >>> 0) || 1, start, hand: 0, chips: Array(n).fill(start), alive: Array(n).fill(true), outs: [], dealer: 0, log: [], seq: 0, phase: "", over: false, res: null, final: null };
    st.dealer = Math.floor(rnd(st) * n);
    st.dealer = (st.dealer + n - 1) % n;     // startHand 에서 한 칸 돌므로 처음 선이 추첨 결과가 되게
    startHand(st);
    return st;
  }
  const liveSeats = st => st.cards.map((c, i) => i).filter(i => st.cards[i] && !st.folded[i]);
  function nextOf(st, from, ok) { for (let k = 1; k <= st.n; k++) { const i = (from + k) % st.n; if (ok(i)) return i; } return -1; }

  function startHand(st) {
    const al = st.alive.map((a, i) => (a ? i : -1)).filter(i => i >= 0);
    if (al.length < 2) { return finish(st); }
    st.hand++;
    st.dealer = nextOf(st, st.dealer, i => st.alive[i]);
    st.ante = anteOf(st.hand);
    st.L = 5 + Math.floor(rnd(st) * 8);
    st.deck = shuffle(() => rnd(st), DECK.slice());
    st.cards = Array(st.n).fill(null); st.folded = Array(st.n).fill(true);
    st.pot = 0; st.res = null; st.bet = Array(st.n).fill(0); st.cur = 0; st.raises = 0; st.acted = Array(st.n).fill(false);
    st.stay = Array(st.n).fill(false); st.hitPtr = -1; st.revealed = Array(st.n).fill(false);
    for (const i of al) {
      const pay = Math.min(st.ante, st.chips[i]); st.chips[i] -= pay; st.pot += pay; st.folded[i] = false;
      st.cards[i] = { hand: [st.deck.pop(), st.deck.pop(), st.deck.pop()], open: [], hid: [], hidx: -1 };
    }
    push(st, { k: "hand", h: st.hand, d: st.dealer, L: st.L, ante: st.ante });
    st.phase = "reveal"; st.turn = -1;
  }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "reveal") return liveSeats(st).filter(i => !st.revealed[i]);
    if (st.phase === "bet1" || st.phase === "bet2") return st.turn >= 0 ? [st.turn] : [];
    if (st.phase === "hit") return st.turn >= 0 ? [st.turn] : [];
    return [];
  };
  function startBet(st, street) {
    st.phase = street === 1 ? "bet1" : "bet2";
    const L = liveSeats(st);
    if (L.length < 2) return foldWin(st);
    st.bet = Array(st.n).fill(0); st.cur = 0; st.raises = 0; st.acted = Array(st.n).fill(false);
    st.cap = Math.min(...L.map(i => st.chips[i]));
    st.turn = st.folded[st.dealer] ? nextOf(st, st.dealer, i => !st.folded[i] && st.cards[i]) : st.dealer;
    if (st.cap <= 0) afterBet(st);
  }
  function afterBet(st) {
    st.turn = -1;
    if (st.phase === "bet1") startHit(st); else showdown(st);
  }
  function startHit(st) {
    st.phase = "hit";
    st.hitPtr = st.folded[st.dealer] ? nextOf(st, st.dealer, i => !st.folded[i] && st.cards[i]) : st.dealer;
    nextHit(st, true);
  }
  // 다음 HIT/STAY 차례 (STAY 안 한 사람 중, 카드가 남아 있을 때만)
  function nextHit(st, first) {
    const L = liveSeats(st).filter(i => !st.stay[i]);
    if (!L.length || !st.deck.length) { st.turn = -1; return startBet(st, 2); }
    if (first) { st.turn = L.includes(st.hitPtr) ? st.hitPtr : nextOf(st, st.hitPtr, i => L.includes(i)); return; }
    st.turn = nextOf(st, st.hitPtr, i => L.includes(i));
  }
  function foldWin(st) {
    const w = liveSeats(st)[0];
    st.chips[w] += st.pot;
    st.res = { fold: true, win: [w], gain: [[w, st.pot]], pot: st.pot, L: st.L };
    push(st, { k: "show", fold: true, w, pot: st.pot });
    st.pot = 0; st.phase = "show"; st.turn = -1;
  }
  const totalOf = c => SUMV(c.hand.concat(c.extra || []));
  function cardsOf(c) { return c.hand.concat(c.extra || []); }
  function showdown(st) {
    const rows = liveSeats(st).map(i => {
      const cs = cardsOf(st.cards[i]), sum = SUMV(cs);
      return { i, cards: cs, sum, n: cs.length, bust: sum > st.L, d: Math.abs(sum - st.L), over: Math.max(0, sum - st.L) };
    });
    const ok = rows.filter(x => !x.bust);
    let win;
    const better = (a, b) => (a.d !== b.d ? a.d - b.d : b.n - a.n);   // 음수면 a 가 이김
    if (ok.length) { const best = ok.slice().sort(better)[0]; win = ok.filter(x => better(x, best) === 0); }
    else { const best = rows.slice().sort((a, b) => a.over - b.over)[0]; win = rows.filter(x => x.over === best.over); }
    const pot = st.pot, k = win.length, each = Math.floor(pot / k);
    const gain = win.map(x => [x.i, each]);
    let rest = pot - each * k;
    if (rest) { const ord = win.map(x => x.i).sort((a, b) => ((a - st.dealer + st.n) % st.n) - ((b - st.dealer + st.n) % st.n)); for (let g = 0; rest > 0; g++, rest--) gain.find(x => x[0] === ord[g % ord.length])[1]++; }
    for (const [i, g] of gain) st.chips[i] += g;
    st.res = { fold: false, L: st.L, rows, win: win.map(x => x.i), gain, pot, draw: k > 1 };
    push(st, { k: "show", win: st.res.win, pot });
    st.pot = 0; st.phase = "show"; st.turn = -1;
  }
  function endHand(st) {
    const out = st.alive.map((a, i) => (a && st.chips[i] <= 0 ? i : -1)).filter(i => i >= 0);
    if (out.length) { out.forEach(i => { st.alive[i] = false; }); st.outs.push(out); push(st, { k: "out", s: out }); }
    if (st.alive.filter(Boolean).length < 2) finish(st); else startHand(st);
  }
  function finish(st) {
    const ranks = Array(st.n).fill(0);
    // 마지막 남은 사람 = 0, 탈락 반대 순서로 등수 (같은 때 탈락 = 같은 등수)
    let rank = st.alive.filter(Boolean).length;
    for (let g = st.outs.length - 1; g >= 0; g--) { for (const i of st.outs[g]) ranks[i] = rank; rank += st.outs[g].length; }
    st.final = { ranks };
    st.over = true; st.phase = "end"; st.turn = -1; st.cards = st.cards || []; push(st, { k: "end" });
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "reveal") {
      if (a.t !== "reveal" || !(a.k >= 0 && a.k < 3) || a.k !== (a.k | 0)) return { ok: false, err: "공개할 카드를 1장 골라요" };
      const c = st.cards[seat];
      c.open = [c.hand[a.k]]; c.hid = c.hand.filter((x, k) => k !== a.k); c.hidx = a.k; c.extra = [];
      c.hand = c.hand.slice();
      st.revealed[seat] = true;
      push(st, { k: "reveal", s: seat, c: c.open[0] });
      if (!needs(st).length) startBet(st, 1);
      return { ok: true };
    }
    if (st.phase === "bet1" || st.phase === "bet2") {
      const toCall = st.cur - st.bet[seat];
      const pay = x => { st.chips[seat] -= x; st.bet[seat] += x; st.pot += x; };
      if (a.t === "check") { if (toCall > 0) return { ok: false, err: "앞사람이 걸었어요 — 콜 · 레이즈 · 폴드 중에서" }; push(st, { k: "bet", s: seat, a: "check" }); }
      else if (a.t === "call") { if (toCall <= 0) return { ok: false, err: "걸린 칩이 없어요 — 체크하면 돼요" }; pay(Math.min(toCall, st.chips[seat])); push(st, { k: "bet", s: seat, a: "call", x: toCall }); }
      else if (a.t === "raise") {
        const to = a.to | 0;
        if (to <= st.cur || to > st.cap) return { ok: false, err: `${st.cur + 1}~${st.cap}칩까지만 걸 수 있어요` };
        pay(to - st.bet[seat]); st.cur = to; st.raises++;
        st.acted = st.acted.map((x, i) => (i === seat ? x : false));
        push(st, { k: "bet", s: seat, a: "raise", to });
      } else if (a.t === "fold") { st.folded[seat] = true; push(st, { k: "bet", s: seat, a: "fold" }); }
      else return { ok: false, err: "모르는 행동이에요" };
      st.acted[seat] = true;
      if (liveSeats(st).length < 2) { foldWin(st); return { ok: true }; }
      const nx = nextOf(st, seat, i => !st.folded[i] && st.cards[i] && (!st.acted[i] || st.bet[i] < st.cur));
      if (nx < 0) afterBet(st); else st.turn = nx;
      return { ok: true };
    }
    if (st.phase === "hit") {
      if (a.t === "hit") {
        if (!st.deck.length) return { ok: false, err: "남은 카드가 없어요" };
        const c = st.cards[seat], card = st.deck.pop();
        c.extra.push(card);
        push(st, { k: "hit", s: seat, c: card });
      } else if (a.t === "stay") { st.stay[seat] = true; push(st, { k: "stay", s: seat }); }
      else return { ok: false, err: "HIT 이나 STAY 중에서 골라요" };
      st.hitPtr = seat;
      nextHit(st, false);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  const auto = st => (st.phase === "show" ? (st.res && st.res.fold ? 2400 : 5200) : null);
  function advance(st) { if (st.phase === "show") endHand(st); }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : st.chips.map(() => 0));
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "reveal") return [0, 1, 2].map(k => ({ t: "reveal", k }));
    if (st.phase === "bet1" || st.phase === "bet2") {
      const L = [{ t: "fold" }], toCall = st.cur - st.bet[seat];
      L.push(toCall > 0 ? { t: "call" } : { t: "check" });
      if (st.cap > st.cur) L.push({ t: "raise", to: st.cur + 1 });
      return L;
    }
    if (st.phase === "hit") return [{ t: "stay" }].concat(st.deck.length ? [{ t: "hit" }] : []);
    return [];
  }

  // ── 보이는 것 ───────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", showAll = st.phase === "show" && st.res && !st.res.fold;
    const sees = i => all || i === seat || (showAll && st.cards[i] && !st.folded[i]);
    const hands = st.cards.map((c, i) => (c && c.hand ? {
      open: (c.open || []).concat(c.extra || []),
      first: (c.open || [])[0],
      extraN: (c.extra || []).length,
      hid: sees(i) ? (c.hid || []).slice() : (c.hid || []).map(() => null),
      hidN: (c.hid || []).length,
      raw: sees(i) && st.phase === "reveal" ? c.hand.slice() : null,
    } : null));
    const pubObj = { h: st.hand, p: st.phase, c: st.chips, f: st.folded, pot: st.pot, b: st.bet, cur: st.cur, t: st.turn, o: hands.map(x => x && x.open), L: st.L, st: st.stay, rv: st.revealed, r: st.res && st.res.gain, ov: st.over };
    return {
      n: st.n, hand: st.hand, phase: st.phase, L: st.L, ante: st.ante, start: st.start, chips: st.chips.slice(), alive: st.alive.slice(), folded: st.folded.slice(), pot: st.pot,
      bet: st.bet.slice(), cur: st.cur, cap: st.cap, turn: st.turn, dealer: st.dealer, deckN: st.deck ? st.deck.length : 0,
      hands, stay: st.stay ? st.stay.slice() : [], revealed: st.revealed ? st.revealed.slice() : [],
      res: st.res ? { fold: st.res.fold, L: st.res.L, win: st.res.win.slice(), gain: st.res.gain.map(x => x.slice()), pot: st.res.pot, draw: st.res.draw, rows: st.res.rows ? st.res.rows.map(r => ({ ...r, cards: r.cards.slice() })) : null } : null,
      needs: needs(st), over: st.over, ranks: st.final ? st.final.ranks.slice() : null, score: st.chips.slice(),
      log: st.log.slice(-40), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }
  const minRaise = V => V.cur + 1;

  // ── 확률 (보이는 것만) ───────────────────────────────────────
  // 내가 모르는 카드 = 전체 35장 − 내가 본 카드 (남의 숨은 카드 · 아직 안 뽑은 카드 모두 이 안에 섞여 있음)
  function unseenPool(V, me) {
    const pool = DECK.slice();
    const take = v => { const k = pool.indexOf(v); if (k >= 0) pool.splice(k, 1); };
    V.hands.forEach((h, i) => { if (!h) return; h.open.forEach(take); if (i === me || h.hid.every(x => x !== null)) h.hid.forEach(take); });
    return pool;
  }
  function mySum(V, me) { const h = V.hands[me]; return h ? SUMV(h.open.concat(h.hid)) : 0; }
  function myCount(V, me) { const h = V.hands[me]; return h ? h.open.length + h.hid.length : 0; }
  // 내가 이길 확률 (상대 숨은 카드 · 상대가 더 뽑을 카드를 뽑아서 가상으로 돌려 봄)
  function winProb(V, me, extraMine, samples, r) {
    const pool = unseenPool(V, me);
    const L = V.L, mine0 = mySum(V, me) + SUMV(extraMine), mc = myCount(V, me) + extraMine.length;
    const opp = V.hands.map((h, i) => i).filter(i => i !== me && V.hands[i] && !V.folded[i]);
    if (!opp.length) return 1;
    let w = 0;
    for (let s = 0; s < samples; s++) {
      const p = pool.slice(); let top = p.length;
      const take = () => { const k = Math.floor(r() * top); const c = p[k]; p[k] = p[--top]; return c; };
      let best = null;
      for (const j of opp) {
        const h = V.hands[j]; let sum = SUMV(h.open), n = h.open.length;
        const hidN = h.hidN || 2;
        for (let g = 0; g < hidN; g++) { sum += take(); n++; }
        // 아직 STAY 안 한 상대는 한계에서 3 이상 모자라면 (STAY 할 때까지) 한 장씩 더 뽑는다고 봄 (2차 베팅부터는 이미 끝)
        if ((V.phase === "bet1" || V.phase === "hit") && !(V.stay && V.stay[j])) for (let g = 0; g < 3 && top && sum <= L - 3; g++) { sum += take(); n++; }
        const bust = sum > L, d = Math.abs(sum - L);
        const cur = { bust, d, n, over: Math.max(0, sum - L) };
        if (!best) best = cur;
        else if (best.bust && !cur.bust) best = cur;
        else if (!best.bust === !cur.bust) { if (!cur.bust ? (cur.d < best.d || (cur.d === best.d && cur.n > best.n)) : cur.over < best.over) best = cur; }
      }
      const myBust = mine0 > L, myD = Math.abs(mine0 - L);
      let res;
      if (myBust && best.bust) res = mine0 - L < best.over ? 1 : mine0 - L === best.over ? 0.5 : 0;
      else if (myBust) res = 0;
      else if (best.bust) res = 1;
      else res = myD < best.d ? 1 : myD > best.d ? 0 : (mc > best.n ? 1 : mc < best.n ? 0 : 0.5);
      w += res;
    }
    return w / samples;
  }
  const SAMPLES = { easy: 30, normal: 80, hard: 180 };
  // HIT 하면 이길 확률 vs STAY: 다음 카드를 뽑아 본 평균
  function hitPlan(V, me, tier, r) {
    const pool = unseenPool(V, me), sam = SAMPLES[tier] || 80, per = Math.max(6, Math.floor(sam / 8));
    const stay = winProb(V, me, [], sam, r);
    const seen = new Set(); let tot = 0, cnt = 0, bust = 0;
    const L = V.L, cur = mySum(V, me);
    for (const c of pool) { if (seen.has(c)) continue; seen.add(c); const k = pool.filter(x => x === c).length; const p = winProb(V, me, [c], per, r); tot += p * k; cnt += k; if (cur + c > L) bust += k; }
    const hit = cnt ? tot / cnt : 0;
    return { stay, hit, bustRisk: cnt ? bust / cnt : 0, cur };
  }
  function betPlan(V, me, tier, r) {
    const p = winProb(V, me, [], SAMPLES[tier] || 80, r);
    const toCall = V.cur - V.bet[me], live = V.hands.filter((h, i) => h && !V.folded[i]).length;
    const share = p * (live > 1 ? 1 : 1);
    const potAfter = V.pot + toCall;
    let a;
    const canRaise = V.cap > V.cur, room = Math.min(V.cap, V.cur + Math.max(1, Math.round(V.pot / 3)));
    if (toCall > 0 && share * potAfter < toCall * 0.95) a = { t: "fold" };
    else if (canRaise && share > (tier === "hard" ? 0.5 : 0.58)) a = { t: "raise", to: tier === "hard" && share > 0.82 ? V.cap : share > 0.7 ? room : Math.min(V.cap, V.cur + 1) };
    else a = toCall > 0 ? { t: "call" } : { t: "check" };
    return { a, p, toCall, potAfter };
  }
  function ai(V, me, tier, r) {
    if (V.phase === "reveal") {
      const raw = V.hands[me].raw || [];
      // 합이 한계에 가까우면 한가운데 값을, 아니면 무작위로 공개 (남이 읽기 어렵게)
      const idx = raw.map((v, k) => k).sort((a, b) => raw[a] - raw[b]);
      return { t: "reveal", k: tier === "easy" ? Math.floor(r() * 3) : idx[1] };
    }
    if (V.phase === "bet1" || V.phase === "bet2") {
      let a = betPlan(V, me, tier, r).a;
      if (tier === "normal" && r() < 0.18) a = a.t === "fold" ? { t: "call" } : a.t === "raise" ? (V.cur > V.bet[me] ? { t: "call" } : { t: "check" }) : a;      // 중급: 가끔 뻔한 실수 (폴드할 판에서 콜 · 레이즈할 판에서 소극적)
      if (tier === "easy") {
        if (a.t === "fold" && r() < 0.5) a = { t: "call" };
        if (a.t === "raise" && r() < 0.5) a = V.cur > V.bet[me] ? { t: "call" } : { t: "check" };
        if (a.t === "raise") a = { t: "raise", to: Math.min(V.cap, V.cur + 1) };
      }
      return a;
    }
    if (V.phase === "hit") {
      if (!V.deckN) return { t: "stay" };
      if (tier === "easy") { const need = V.L - mySum(V, me); return { t: need >= 3 || r() < 0.1 ? "hit" : "stay" }; }
      const p = hitPlan(V, me, tier, r);
      return { t: p.hit > p.stay + (tier === "hard" ? 0.01 : 0.03) ? "hit" : "stay" };
    }
    return null;
  }

  // ── AI 선생님 ───────────────────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) return { opp: "판이 끝났어요.", mine: `내 칩 ${V.chips[me]}개 · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    if (!V.hands[me]) return { opp: "이번 판은 칩이 없어 쉬어요.", mine: `칩 ${V.chips[me]}개`, rec: "구경하며 상대 버릇을 봐 두세요.", why: "" };
    const r = (() => { let a = 4242 + V.hand * 17 + me; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    const h = V.hands[me], L = V.L, cur = mySum(V, me);
    // 👀 상대 흐름: 공개된 카드와 최근 행동
    const evs = V.log.filter(e => e.i > since && e.s !== me && (e.k === "hit" || e.k === "stay" || e.k === "bet" || e.k === "reveal"));
    const showOpp = i => { const o = V.hands[i]; return `${nm(i)} 공개 ${o.open.join("·")}(합 ${SUMV(o.open)} + 숨은 ${o.hidN}장)${V.stay[i] ? " · STAY" : ""}`; };
    const others = V.hands.map((x, i) => i).filter(i => i !== me && V.hands[i] && !V.folded[i]);
    let opp = others.length ? others.slice(0, 3).map(showOpp).join(" / ") : "남은 상대가 없어요.";
    const last = evs.slice(-3).map(e => e.k === "hit" ? `${nm(e.s)} HIT(${e.c})` : e.k === "stay" ? `${nm(e.s)} STAY` : e.k === "bet" ? `${nm(e.s)} ${e.a === "raise" ? `레이즈 ${e.to}` : e.a === "call" ? "콜" : e.a === "check" ? "체크" : "폴드"}` : "").filter(Boolean);
    if (last.length) opp = last.join(" · ") + " — " + opp;
    // 📊 내 흐름
    const dist = L - cur;
    const pool = unseenPool(V, me), bustN = pool.filter(c => cur + c > L).length;
    const mine = `한계 ${L} · 내 합 ${cur} (${h.open.concat(h.hid).join("+")}) · ${dist >= 0 ? `${dist} 남음` : `${-dist} 넘음 (bust)`} · 칩 ${V.chips[me]}개 · 판돈 ${V.pot} · 다음 카드로 넘길 확률 ${pc(pool.length ? bustN / pool.length : 0)}`;
    // 💡 추천 + 👉 의미
    let rec = "상대 차례를 기다려요", why = "";
    const myTurn = V.needs.includes(me);
    if (V.phase === "reveal" && myTurn) {
      const raw = h.raw || [], idx = raw.map((v, k) => k).sort((a, b) => raw[a] - raw[b]), k = idx[1];
      rec = `${raw[k]} 공개`;
      why = `한가운데 값(${raw[k]})을 보여 주면 내 합이 높은지 낮은지 상대가 읽기 어려워요. 가장 큰 카드를 보이면 bust 위험으로, 작은 카드를 보이면 여유로 읽혀요.`;
    } else if ((V.phase === "bet1" || V.phase === "bet2") && myTurn) {
      const p = betPlan(V, me, "hard", r), t = p.a.t;
      rec = t === "fold" ? "폴드" : t === "call" ? `콜 (${p.toCall}칩)` : t === "check" ? "체크" : `레이즈 → ${p.a.to}칩까지`;
      why = `내가 이길 확률은 약 ${pc(p.p)}예요. ${t === "fold" ? `콜에 ${p.toCall}칩인데 판돈 ${p.potAfter}칩의 몫으로는 손해가 커요.` : t === "raise" ? "앞서 있다고 보여서 판돈을 키워요 — 상대가 따라오면 더 받아요." : t === "call" ? "따라가도 본전 이상이에요." : "걸 만큼 앞서지는 않아요 — 공짜로 다음 단계를 봐요."}`;
    } else if (V.phase === "hit" && myTurn) {
      const p = hitPlan(V, me, "hard", r);
      rec = p.hit > p.stay + 0.01 ? "HIT (한 장 더)" : "STAY";
      why = `지금 STAY 로 이길 확률 ${pc(p.stay)} · 한 장 더 받으면 ${pc(p.hit)} (넘길 위험 ${pc(p.bustRisk)}). ${p.hit > p.stay ? "한계에 더 가까워질 수 있어서 받는 게 나아요." : "넘길 위험이 이득보다 커요."}`;
    } else if (V.phase === "show") { rec = "결과를 보고 다음 라운드를 준비해요"; if (V.res && !V.res.fold) why = `한계 ${V.L} · 승자 ${V.res.win.map(nm).join(", ")}`; }
    return { opp, mine, rec, why };
  }

  return {
    id: "hitstay", DECK, anteOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach,
    unseenPool, winProb, hitPlan, betPlan, mySum, minRaise,
  };
});

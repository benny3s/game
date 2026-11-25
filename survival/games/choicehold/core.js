/* 베니 서바이벌 · 초이스 홀덤 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌X · 초이스 홀덤 (파이널 2R, 1:1)
   · 1~5 카드 4세트 20장, 칩 20개씩. 한 판: 기본 베팅 → 개인 카드 1장씩 + 공유 카드 3장 공개 → 1차 베팅 → 카드 선택 → 2차 베팅 → 공개
   · 카드 선택: 선에게 카드 2장이 주어져 한 장은 앞면, 한 장은 뒷면으로 놓음 → 후가 둘 중 한 장을 고르고, 남은 한 장은 선이 가짐 (후는 뒷면 카드를 못 봄)
   · 내 개인 카드 2장 + 공유 3장으로 조합 — 포카드 > 풀하우스 > 스트레이트(1-2-3-4-5) > 트리플 > 투페어 > 원페어 (숫자가 1~5 뿐이라 노페어 없음)
     같은 조합이면 조합 숫자가 높은 쪽 → 조합에 안 쓴 개인 카드가 높은 쪽 → 모두 같으면 판돈을 다음 판으로 이월 (선후공 · 기본 베팅 그대로)
   · 선후공은 판마다 번갈아 (이월되면 유지). 기본 베팅은 10판마다 1칩씩 늘어남 (1~10판 1칩, 11~20판 2칩, …). 기본 베팅을 낼 칩이 없으면 패
   우리 판 다듬기 (방송과 다른 점):
   · 체크는 없고 '콜'이 체크 역할 (걸린 칩이 없으면 콜 = 그대로 넘김). 둘 다 한 번씩 말한 뒤 칩이 같아지면 베팅 끝
   · 레이즈는 1칩 이상, 둘 중 칩이 적은 쪽이 낼 수 있는 만큼까지, 한 베팅에 3번까지 (올인은 따로 없음). 폴드하면 상대가 판돈을 다 가져감
   · 카드 선택용 2장은 덱에서 (판마다 20장을 새로 섞음). 2차 베팅도 선이 먼저. 첫 선은 무작위
   · 조합에 안 쓴 개인 카드는 높은 순으로 하나씩 겨룸 (조합 숫자와 같은 숫자 카드는 조합에 쓴 것으로 봄). 풀하우스는 트리플 숫자 → 투페어는 큰 페어 → 작은 페어 순
   · 40판(이월 제외)을 마치면 칩 많은 쪽이 이김. 같으면 공동 1등 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).choicehold = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const START = 20, MAXH = 40, MAXRAISE = 3, DECK = 20;
  const NAMES = ["", "원페어", "투페어", "트리플", "스트레이트", "풀하우스", "포카드"];
  const anteOf = h => 1 + Math.floor((h - 1) / 10);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 100) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 조합 ──────────────────────────────────────────────────
  // 카드 5장(숫자 1~5) → { r: 조합(1 원페어 … 6 포카드), nums: 조합 숫자(큰 것부터), used: 조합에 쓴 숫자 }
  function evalHand(five) {
    const cnt = [0, 0, 0, 0, 0, 0];
    for (const v of five) cnt[v]++;
    const g = [];
    for (let v = 5; v >= 1; v--) if (cnt[v]) g.push([cnt[v], v]);
    g.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const r = { 41: 6, 32: 5, 11111: 4, 311: 3, 221: 2, 2111: 1 }[g.map(x => x[0]).join("")];
    const used = r === 4 ? [1, 2, 3, 4, 5] : g.filter(x => x[0] >= 2).map(x => x[1]);
    return { r, nums: r === 4 ? [] : used, used };
  }
  // 겨루는 힘: 조합 → 조합 숫자 → 조합에 안 쓴 개인 카드 (클수록 이김, 같으면 무승부)
  const PW = new Int32Array(6 ** 5).fill(-1);   // 개인 2장 + 공유 3장 → 힘 (기억해 둠)
  function power(mine, com) {
    const k = (((mine[0] * 6 + mine[1]) * 6 + com[0]) * 6 + com[1]) * 6 + com[2];
    if (PW[k] >= 0) return PW[k];
    const h = evalHand(mine.concat(com)), rest = mine.filter(v => !h.used.includes(v)).sort((a, b) => b - a);
    return (PW[k] = h.r * 10000 + (h.nums[0] || 0) * 1000 + (h.nums[1] || 0) * 100 + (rest[0] || 0) * 10 + (rest[1] || 0));
  }
  const rankOf = p => Math.floor(p / 10000);

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ seed }) {
    const st = {
      n: 2, rs: (seed >>> 0) || 1, seq: 0, log: [], chips: [START, START], pot: 0, done: 0, hand: 0, first: 0, phase: "", over: false, turn: -1, final: null, res: null,
      pc: [0, 0], com: [], offer: [0, 0], up: -1, taken: null, sec: [null, null], bet: [0, 0], cur: 0, cap: 0, raises: 0, acted: [false, false],
    };
    st.first = rnd(st) < 0.5 ? 0 : 1;
    startHand(st);
    return st;
  }
  // 시험용: 이번 판의 선 · 칩 · 지난 판 수 · 카드를 정해서 다시 시작 (o = { first, chips, done, pc, com, offer })
  function deal(st, o) {
    st.first = o.first | 0; st.chips = (o.chips || [START, START]).slice(); st.done = o.done | 0; st.pot = o.pot | 0; st.over = false; st.final = null;
    startHand(st, o);
    return st;
  }
  function startHand(st, fx) {
    st.hand = st.done + 1; st.res = null;
    if (st.done >= MAXH) return finish(st, "hands");
    const ante = anteOf(st.hand), can = st.chips.map(c => c >= ante);
    if (!can[0] || !can[1]) return finish(st, "ante", can);
    for (let i = 0; i < 2; i++) { st.chips[i] -= ante; st.pot += ante; }
    const deck = shuffle(() => rnd(st), Array.from({ length: DECK }, (_, k) => (k % 5) + 1)), f = fx || {};
    st.pc = f.pc ? f.pc.slice() : [deck.pop(), deck.pop()];
    st.com = f.com ? f.com.slice() : [deck.pop(), deck.pop(), deck.pop()];
    st.offer = f.offer ? f.offer.slice() : [deck.pop(), deck.pop()];
    st.up = -1; st.taken = null; st.sec = [null, null];
    push(st, { k: "hand", h: st.hand, f: st.first, ante });
    startBet(st, 1);
  }
  function startBet(st, street) {
    st.phase = street === 1 ? "bet1" : "bet2";
    st.bet = [0, 0]; st.cur = 0; st.raises = 0; st.acted = [false, false]; st.cap = Math.min(st.chips[0], st.chips[1]); st.turn = st.first;
    if (st.cap <= 0) afterBet(st);   // 더 걸 칩이 없으면 베팅 없이 넘어감
  }
  function afterBet(st) {
    if (st.phase === "bet1") { st.phase = "place"; st.turn = st.first; } else showdown(st);
  }
  function foldWin(st, folder) {
    const w = 1 - folder;
    st.res = { fold: true, win: w, folder, tie: false, pot: st.pot };
    st.chips[w] += st.pot; st.pot = 0;
    push(st, { k: "show", fold: 1, w });
    st.phase = "show"; st.turn = -1;
  }
  function showdown(st) {
    const hv = [0, 1].map(i => power([st.pc[i], st.sec[i]], st.com)), w = hv[0] === hv[1] ? -1 : hv[0] > hv[1] ? 0 : 1;
    st.res = { fold: false, win: w, tie: w < 0, pot: st.pot, rows: [0, 1].map(i => ({ i, pc: st.pc[i], sec: st.sec[i], p: hv[i], r: rankOf(hv[i]) })) };
    if (w >= 0) { st.chips[w] += st.pot; st.pot = 0; }
    push(st, { k: "show", w });
    st.phase = "show"; st.turn = -1;
  }
  function finish(st, why, can) {
    const c = st.chips;
    let w = c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1;
    if (can && can[0] !== can[1]) { w = can[0] ? 0 : 1; st.chips[w] += st.pot; st.pot = 0; }   // 기본 베팅을 못 낸 쪽이 짐
    st.final = { why, win: w, ranks: w < 0 ? [0, 0] : w === 0 ? [0, 1] : [1, 0] };
    st.over = true; st.phase = "end"; st.turn = -1;
    push(st, { k: "end", w, why });
  }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "bet1" || st.phase === "bet2") return [st.turn];
    if (st.phase === "place") return [st.first];
    if (st.phase === "take") return [1 - st.first];
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const ph = st.phase;
    if (ph === "bet1" || ph === "bet2") {
      const toCall = st.cur - st.bet[seat], pay = x => { st.chips[seat] -= x; st.bet[seat] += x; st.pot += x; };
      if (a.t === "call") { pay(toCall); push(st, { k: "bet", s: seat, a: "call", x: toCall, ph }); }
      else if (a.t === "raise") {
        if (st.raises >= MAXRAISE) return { ok: false, err: "이번 베팅은 레이즈를 다 썼어요" };
        if (!Number.isInteger(a.to) || a.to <= st.cur || a.to > st.cap) return { ok: false, err: st.cap > st.cur ? `${st.cur + 1}~${st.cap}칩까지만 걸 수 있어요` : "더 걸 칩이 없어요" };
        pay(a.to - st.bet[seat]); st.cur = a.to; st.raises++; st.acted = [false, false];
        push(st, { k: "bet", s: seat, a: "raise", to: a.to, ph });
      } else if (a.t === "fold") { push(st, { k: "bet", s: seat, a: "fold", ph }); foldWin(st, seat); return { ok: true }; }
      else return { ok: false, err: "콜 · 레이즈 · 폴드 중에서 골라요" };
      st.acted[seat] = true;
      if (st.acted[0] && st.acted[1] && st.bet[0] === st.bet[1]) afterBet(st); else st.turn = 1 - seat;
      return { ok: true };
    }
    if (ph === "place") {
      if (a.t !== "place" || (a.up !== 0 && a.up !== 1)) return { ok: false, err: "앞면으로 놓을 카드를 골라요" };
      st.up = a.up; st.phase = "take"; st.turn = 1 - st.first;
      push(st, { k: "place", s: seat, c: st.offer[a.up] });
      return { ok: true };
    }
    if (a.t !== "take" || (a.d !== "up" && a.d !== "down")) return { ok: false, err: "앞면 · 뒷면 중에서 골라요" };
    const ti = a.d === "up" ? st.up : 1 - st.up;
    st.sec[seat] = st.offer[ti]; st.sec[1 - seat] = st.offer[1 - ti]; st.taken = a.d;
    push(st, { k: "take", s: seat, d: a.d, c: a.d === "up" ? st.offer[st.up] : null });
    startBet(st, 2);
    return { ok: true };
  }
  const auto = st => (st.phase === "show" ? (st.res.fold ? 2200 : 4500) : null);
  function advance(st) {
    if (st.phase !== "show") return;
    if (!st.res.tie) { st.done++; st.first = 1 - st.first; }   // 이월(무승부)이면 같은 판 번호 · 같은 선
    startHand(st);
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : st.chips[0] === st.chips[1] ? [0, 0] : st.chips[0] > st.chips[1] ? [0, 1] : [1, 0]);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "place") return [{ t: "place", up: 0 }, { t: "place", up: 1 }];
    if (st.phase === "take") return [{ t: "take", d: "up" }, { t: "take", d: "down" }];
    const L = [{ t: "call" }, { t: "fold" }];
    if (st.raises < MAXRAISE && st.cap > st.cur) L.push({ t: "raise", to: st.cur + 1 });
    return L;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = all ? -1 : seat, F = st.first, B = 1 - F;
    const rev = st.phase === "show" && st.res && !st.res.fold;   // 대결까지 가면 둘 다 공개
    const own = i => all || rev || i === me, placed = st.up >= 0;
    const upC = placed ? st.offer[st.up] : null;
    const pubObj = { h: st.hand, p: st.phase, c: st.chips, pot: st.pot, b: st.bet, cur: st.cur, t: st.turn, f: F, com: st.com, up: upC, tk: st.taken, r: st.res, ov: st.over, fin: st.final };
    return {
      n: 2, hand: st.hand, maxHand: MAXH, ante: anteOf(st.hand), first: F, phase: st.phase, chips: st.chips.slice(), pot: st.pot,
      bet: st.bet.slice(), cur: st.cur, cap: st.cap, raises: st.raises, maxRaise: MAXRAISE, turn: st.turn, com: st.com.slice(),
      pc: [0, 1].map(i => (own(i) ? st.pc[i] : null)), sec: [0, 1].map(i => (own(i) ? st.sec[i] : null)),
      give: all || (me === F && st.phase === "place") ? st.offer.slice() : null,           // 선이 받은 2장 (선만)
      up: upC, taken: st.taken,                                                         // 앞면으로 놓인 카드 · 후가 고른 쪽 ('up' | 'down')
      down: placed && (all || rev || me === F || (me === B && st.taken === "down")) ? st.offer[1 - st.up] : null,   // 뒷면 카드 (선 · 그걸 가진 후만)
      osec: all || !st.taken ? null : me === F ? st.sec[B] : me === B && st.taken === "down" ? upC : null,         // 상대가 가진 두 번째 카드 (내가 알 때만)
      res: st.res ? JSON.parse(JSON.stringify(st.res)) : null, needs: needs(st), over: st.over, ranks: st.over ? st.final.ranks.slice() : null,
      final: st.final ? { ...st.final, ranks: st.final.ranks.slice() } : null, score: st.chips.slice(), log: st.log.slice(-50), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 (보이는 것만) ─────────────────────────────────────
  const poolOf = known => { const p = [0, 4, 4, 4, 4, 4]; for (const v of known) p[v]--; return p; };
  const cmp = (a, b) => (a > b ? 1 : a === b ? 0.5 : 0);
  // 내가 이길 · 비길 확률. 모르는 카드(상대 개인 카드 · 아직 못 본 두 번째 카드)를 남은 카드로 전부 따져 봄. f > 1 이면 상대가 레이즈해서 센 조합일수록 더 가능성 있게 봄
  function equity(V, me, f) {
    const mySec = V.sec[me], osec = V.osec, known = [V.pc[me]].concat(V.com);
    if (mySec != null) known.push(mySec);
    if (osec != null) known.push(osec);
    const pool = poolOf(known), vals = [1, 2, 3, 4, 5];
    let W = 0, win = 0, tie = 0;
    for (const o of vals) {
      if (pool[o] <= 0) continue; const w1 = pool[o]; pool[o]--;
      for (const s of mySec == null ? vals : [mySec]) {
        if (mySec == null && pool[s] <= 0) continue; const w2 = mySec == null ? w1 * pool[s]-- : w1;
        for (const t of osec == null ? vals : [osec]) {
          if (osec == null && pool[t] <= 0) continue; let w = osec == null ? w2 * pool[t]-- : w2;
          const a = power([V.pc[me], s], V.com), b = power([o, t], V.com);
          if (f > 1) w *= Math.pow(f, rankOf(b));
          W += w; if (a > b) win += w; else if (a === b) tie += w;
          if (osec == null) pool[t]++;
        }
        if (mySec == null) pool[s]++;
      }
      pool[o]++;
    }
    return { win: win / W, tie: tie / W, lose: 1 - (win + tie) / W, e: (win + tie / 2) / W };
  }
  // 후: 앞면 카드(u)를 가질지 뒷면을 가질지 — 내 개인 카드 pc, 공유 com. 모르는 건 선의 개인 카드와 뒷면 카드
  function takeEval(pc, com, u) {
    const pool = poolOf([pc].concat(com, u));
    let W = 0, up = 0, down = 0;
    for (let x = 1; x <= 5; x++) {
      if (pool[x] <= 0) continue; const w1 = pool[x]; pool[x]--;
      for (let d = 1; d <= 5; d++) {
        if (pool[d] <= 0) continue; const w = w1 * pool[d];
        up += w * cmp(power([pc, u], com), power([x, d], com)); down += w * cmp(power([pc, d], com), power([x, u], com)); W += w;
      }
      pool[x]++;
    }
    return { up: up / W, down: down / W };
  }
  // 선: 받은 2장(give)을 어떻게 놓을지 — 후가 takeEval 대로 고른다고 보고 내 기대 승률 (up: 0 이면 첫 장이 앞면)
  function placeEval(V, me) {
    const [a, b] = V.give, pool = poolOf([V.pc[me]].concat(V.com, a, b)), ev = [0, 0];
    let W = 0;
    for (let o = 1; o <= 5; o++) {
      if (pool[o] <= 0) continue; const w = pool[o];
      for (let k = 0; k < 2; k++) {
        const u = k === 0 ? a : b, d = k === 0 ? b : a, te = takeEval(o, V.com, u), takeUp = te.up >= te.down;
        const mine = takeUp ? d : u, theirs = takeUp ? u : d;
        ev[k] += w * cmp(power([V.pc[me], mine], V.com), power([o, theirs], V.com));
      }
      W += w;
    }
    return [ev[0] / W, ev[1] / W];
  }
  // 베팅 판단: 이길 확률 → 판돈 대비 (콜 값 ÷ (판돈 + 콜 값)) 보다 높아야 콜
  function betPlan(V, me, tier, r) {
    let raised = false;
    for (let k = V.log.length - 1; k >= 0 && V.log[k].k !== "hand"; k--) { const e = V.log[k]; if (e.k === "bet" && e.s !== me && e.a === "raise" && e.ph === V.phase) raised = true; }
    const f = raised ? (tier === "hard" ? 1.3 : tier === "normal" ? 1.12 : 1) : 1, q = equity(V, me, f);
    const nz = tier === "hard" ? 0 : (r() + r() + r() - 1.5) * (tier === "normal" ? 0.16 : 0.5), e = q.win + q.tie / 2 + nz;
    const toCall = V.cur - V.bet[me], need = toCall / (V.pot + toCall), canRaise = V.raises < V.maxRaise && V.cap > V.cur;
    const thr = tier === "hard" ? 0.6 : tier === "normal" ? 0.65 : 0.7;
    let a = { t: "call" };
    if (toCall > 0 && e < need - 0.02) a = { t: "fold" };
    if (canRaise && e > (toCall > 0 ? thr + 0.12 : thr)) a = { t: "raise", to: Math.min(V.cap, V.cur + Math.max(1, Math.round(V.pot * (e - 0.45) * 0.9))) };
    return { a, e, q, need, toCall, raised };
  }
  function ai(V, me, tier, r) {
    if (V.phase === "bet1" || V.phase === "bet2") {
      let a = betPlan(V, me, tier, r).a;
      if (tier === "easy" && r() < 0.15) {
        const L = [{ t: "call" }]; if (V.cur > V.bet[me]) L.push({ t: "fold" }); if (V.raises < V.maxRaise && V.cap > V.cur) L.push({ t: "raise", to: V.cur + 1 });
        a = L[Math.floor(r() * L.length)];
      }
      return a;
    }
    const slip = tier === "easy" ? 1 : tier === "normal" ? 0.3 : 0;
    if (V.phase === "place") { const ev = placeEval(V, me); return { t: "place", up: r() < slip ? (r() < 0.5 ? 0 : 1) : ev[0] >= ev[1] ? 0 : 1 }; }
    if (V.phase === "take") { const e = takeEval(V.pc[me], V.com, V.up); return { t: "take", d: r() < slip ? (r() < 0.5 ? "up" : "down") : e.up >= e.down ? "up" : "down" }; }
    return null;
  }

  return {
    id: "choicehold", START, MAXH, MAXRAISE, NAMES, anteOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, deal,
    evalHand, power, rankOf, equity, takeEval, placeEval, betPlan,
  };
});

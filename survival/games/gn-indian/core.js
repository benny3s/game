/* 베니 서바이벌 · 인디언 포커 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 1 (게임의 법칙) 6 · 7화 데스매치, 12화 결승 1회전 (나무위키 회차 문서 기준)
   · 두 사람. 카드는 1 ~ 10 두 장씩 20장 (무늬 없음). 각자 카드 1장을 이마에 붙여 — 상대 카드만 보이고 내 카드는 안 보임
   · 매 판 기본 베팅 1칩씩 → 선부터 콜 · 레이즈 · 폴드. 콜 = 상대와 같은 누적액을 맞추고 바로 공개, 높은 숫자가 판돈을 다 가져감
   · 폴드는 낸 칩만 잃음. 단, 내 카드가 10 인 채 폴드하면 칩 10개를 더 내야 함 (내 카드를 모르니까 함정)
   · 같은 숫자면 무승부 — 판돈은 다음 판 이긴 사람이 가져가고, 그 판은 기본 베팅이 없음
   · 칩이 0 이 되면 바로 패배. 공개된 카드는 버려지니 20장 안에서 남은 숫자를 세면 이득
   우리 판 다듬기(방송 문서에 없는 것): 첫 판 선은 동전, 이후 번갈아 · 올인 상한은 두 사람 중 적은 쪽 칩 · 가진 칩이 모자라면 페널티는 있는 만큼 · 30판 안전장치 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-indian"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MAXR = 30, PEN = 10;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function newDeck(st) {
    const d = []; for (let r = 1; r <= 10; r++) d.push(r, r);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }

  function init({ n, seed, cfg }) {
    const start = Math.max(5, Math.min(100, (cfg && +cfg.chips) || 45));
    const maxR = Math.max(3, Math.min(MAXR, (cfg && +cfg.rounds) || MAXR));
    const st = { n: 2, rs: (seed >>> 0) || 1, start, maxR, chips: [start, start], round: 0, first: 0, deck: [], used: [], cards: [0, 0], contrib: [0, 0], carry: 0, cur: 0, turn: 0, acted: [false, false], phase: "", log: [], seq: 0, over: false, res: null, hist: [], cfg: cfg || {}, last: -1 };
    st.first0 = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.first = (st.first0 + st.round - 1) % 2;
    const c = st.cfg || {};
    if (c.cards && c.cards[st.round - 1]) { st.cards = c.cards[st.round - 1].slice(); st.used = st.used || []; }
    else {
      if (st.deck.length < 2) { st.deck = newDeck(st); st.used = []; }
      st.cards = [st.deck.pop(), st.deck.pop()];
    }
    st.res = null; st.acted = [false, false];
    if (st.carry > 0) st.contrib = [0, 0];
    else { st.contrib = [0, 0]; for (const i of [0, 1]) { const a = Math.min(1, st.chips[i]); st.chips[i] -= a; st.contrib[i] = a; } }
    st.cur = Math.max(st.contrib[0], st.contrib[1]);
    st.turn = st.first; st.phase = "bet";
    push(st, { k: "round", r: st.round, f: st.first });
    // 한쪽이라도 더 걸 칩이 없으면 바로 공개
    if (!canRaise(st)) showdown(st);
  }
  const capTotal = st => Math.min(st.chips[0] + st.contrib[0], st.chips[1] + st.contrib[1]);
  const canRaise = st => capTotal(st) > st.cur;
  const pot = st => st.contrib[0] + st.contrib[1] + st.carry;

  function needs(st) { return st.over || st.phase !== "bet" ? [] : [st.turn]; }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const opp = 1 - seat;
    if (a.t === "fold") {
      let pen = 0;
      if (st.cards[seat] === 10) { pen = Math.min(PEN, st.chips[seat]); st.chips[seat] -= pen; }
      const gain = pot(st) + pen;
      st.chips[opp] += gain; st.carry = 0;
      finish(st, { type: "fold", folder: seat, win: opp, gain, pen, pot: gain - pen });
      return { ok: true };
    }
    if (a.t === "call") {
      const need = st.cur - st.contrib[seat];
      if (need > st.chips[seat]) return { ok: false, err: "칩이 모자라요" };
      st.chips[seat] -= need; st.contrib[seat] += need;
      push(st, { k: "bet", s: seat, a: "call", to: st.contrib[seat] });
      showdown(st);
      return { ok: true };
    }
    if (a.t === "raise") {
      const to = a.to | 0;
      if (!canRaise(st)) return { ok: false, err: "더 걸 수 없어요" };
      if (to <= st.cur) return { ok: false, err: `지금 ${st.cur}칩보다 많이 걸어야 해요` };
      if (to > capTotal(st)) return { ok: false, err: `최대 ${capTotal(st)}칩까지 (상대가 맞출 수 있는 만큼)` };
      const pay = to - st.contrib[seat];
      st.chips[seat] -= pay; st.contrib[seat] = to; st.cur = to;
      push(st, { k: "bet", s: seat, a: "raise", to });
      st.turn = opp;
      return { ok: true };
    }
    return { ok: false, err: "콜 · 레이즈 · 폴드 중에서 골라요" };
  }
  function showdown(st) {
    const [x, y] = st.cards, P = pot(st);
    if (x === y) { st.carry = P; finish(st, { type: "draw", pot: P }); return; }
    const w = x > y ? 0 : 1;
    st.chips[w] += P; st.carry = 0;
    finish(st, { type: "show", win: w, gain: P, pot: P });
  }
  function finish(st, r) {
    r.cards = st.cards.slice(); r.r = st.round; r.contrib = st.contrib.slice(); r.chips = st.chips.slice(); r.f = st.first;
    st.res = r; st.hist.push({ r: r.r, type: r.type, win: r.win, cards: r.cards, pot: r.pot, pen: r.pen || 0, f: r.f, contrib: r.contrib, chips: r.chips });
    st.used = (st.used || []).concat(st.cards);
    st.phase = "reveal"; st.contrib = [0, 0];
    push(st, { k: "end", r: st.round, t: r.type, w: r.win });
    const broke = st.chips[0] <= 0 || st.chips[1] <= 0;
    if ((broke && st.carry === 0) || st.round >= st.maxR) {   // 마지막 판에 이월 판돈이 남으면 반씩 나눠요
      if (st.carry > 0) { const h = Math.floor(st.carry / 2); st.chips[0] += h; st.chips[1] += h; st.carry = 0; r.chips = st.chips.slice(); st.hist[st.hist.length - 1].chips = r.chips; }
      st.over = true; st.phase = "end";
    }
  }
  const auto = st => (st.phase === "reveal" ? 3300 : null);
  function advance(st) { if (st.phase === "reveal") startRound(st); }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const L = [{ t: "fold" }];
    const need = st.cur - st.contrib[seat];
    if (need <= st.chips[seat]) L.push({ t: "call" });
    if (canRaise(st)) L.push({ t: "raise", to: st.cur + 1 });
    return L;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", show = st.phase === "reveal" || st.phase === "end";
    const cards = st.cards.map((c, i) => (all || show || i !== seat ? c : -1));
    const pubObj = { r: st.round, p: st.phase, c: st.chips, ct: st.phase === "bet" ? st.contrib : 0, cy: st.carry, t: st.turn, u: st.used.length, res: show && st.res ? [st.res.type, st.res.win, st.res.cards] : 0, ov: st.over };
    return {
      n: 2, round: st.round, maxR: st.maxR, phase: st.phase, chips: st.chips.slice(), contrib: st.phase === "bet" ? st.contrib.slice() : [0, 0], carry: st.carry, pot: st.phase === "bet" ? pot(st) : 0,
      cur: st.cur, turn: st.turn, first: st.first, cap: st.phase === "bet" ? capTotal(st) : 0, canRaise: st.phase === "bet" && canRaise(st), start: st.start,
      cards, used: st.used.slice(), res: st.res, hist: st.hist.slice(-12), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(),
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · AI (내가 보는 것만) ─────────────────────────────
  // 남은 카드(20장 중 버려진 것 · 상대 카드 뺀 것)에서 내 카드 후보를 세고, 상대가 이번 판에 한 레이즈로 가중치를 바꿈
  function posterior(V, me, tier) {
    const opp = 1 - me, o = V.cards[opp];
    const cnt = Array(11).fill(0); for (let r = 1; r <= 10; r++) cnt[r] = 2;
    if (tier !== "easy") for (const c of V.used) cnt[c]--;   // 초급은 지나간 카드를 세지 않아요
    if (o > 0) cnt[o]--;
    const w = cnt.map(x => Math.max(0, x));
    if (V.phase === "bet" && tier !== "easy") {
      const strength = tier === "hard" ? 1 : 0.6;
      const raises = V.log.filter(e => e.k === "bet" && e.s === opp && e.a === "raise" && e.i >= roundStart(V));
      for (const e of raises) {
        const big = e.to >= 5;
        for (let c = 1; c <= 10; c++) {
          let f = o > c ? 1 : o === c ? (big ? 0.4 : 0.55) : (big ? 0.15 : 0.3);
          w[c] *= Math.pow(f, strength);
        }
      }
    }
    const s = w.reduce((a, b) => a + b, 0) || 1;
    const p = w.map(x => x / s);
    let win = 0, draw = 0, lose = 0;
    for (let c = 1; c <= 10; c++) { if (c > o) win += p[c]; else if (c === o) draw += p[c]; else lose += p[c]; }
    return { p, win, draw, lose, p10: p[10] || 0 };
  }
  const roundStart = V => { const e = V.log.filter(x => x.k === "round").pop(); return e ? e.i : 0; };

  function plan(V, me, tier, r) {
    const opp = 1 - me, P = posterior(V, me, tier);
    const mine = V.contrib[me], q = V.contrib[opp], need = V.cur - mine, carry = V.carry;
    const thr = tier === "easy" ? 0.62 : tier === "normal" ? 0.5 : 0.44;
    const canR = V.canRaise, room = V.cap - V.cur;
    const evCall = P.win * (carry + q) - P.lose * q;
    const evFold = -mine - PEN * P.p10 * (tier === "easy" ? 0.3 : 1);
    let a, why;
    const pickRaise = (frac) => { const to = Math.min(V.cap, V.cur + Math.max(1, Math.round(room * Math.min(1, frac)))); return { t: "raise", to }; };
    const big = Math.max(0.12, (P.win - 0.3) * (tier === "hard" ? 1.7 : 1.2));
    if (need > 0) {
      if (evCall < evFold - (tier === "easy" ? 0 : 0.3)) { a = { t: "fold" }; why = "fold"; }
      else if (canR && P.win >= thr + 0.12 && r() < (tier === "easy" ? 0.4 : 0.9)) { a = pickRaise(big * 0.8); why = "value"; }
      else { a = { t: "call" }; why = "call"; }
    } else {
      if (canR && P.win >= thr && r() < (tier === "easy" ? 0.5 : 0.95)) { a = pickRaise(big); why = "value"; }
      else if (canR && tier === "hard" && P.win < 0.4 && V.chips[me] > 6 && r() < 0.22) { a = pickRaise(0.25 + 0.3 * r()); why = "bluff"; }
      else if (canR && tier === "normal" && P.win < thr && r() < 0.12) { a = pickRaise(0.2); why = "bluff"; }
      else { a = { t: "call" }; why = "show"; }
    }
    return { a, why, P, evCall, evFold, need };
  }
  // 고급: 가능한 수(폴드 · 콜 · 여러 크기의 레이즈)마다, 내 카드가 무엇일지(확률 p) × 상대가 어떻게 받을지(상대 눈에 보이는 것만으로 '초급·보통'이 두는 대로)
  // 를 어림해 기대 칩을 계산하고 가장 큰 수를 골라요. 상대의 가려진 카드는 안 쓰고, 내 눈에 보이는 상대 카드만 써요.
  function oppView(V, me, c, X) {   // 상대 시점의 가상 화면: 상대는 내 카드 c 를 보고, 자기 카드는 못 봄
    const opp = 1 - me, contrib = V.contrib.slice(); contrib[me] = X;
    const cards = [-1, -1]; cards[me] = c;
    return { n: 2, phase: "bet", chips: V.chips.map((c, i) => (i === me ? Math.max(0, c - (X - V.contrib[me])) : c)), contrib, carry: V.carry, cur: X, cap: V.cap, canRaise: V.cap > X, used: V.used, cards, turn: opp,
      log: [{ k: "round", i: 0 }, { k: "bet", s: me, a: "raise", to: X, i: 1 }] };
  }
  function planEV(V, me, r) {
    const opp = 1 - me, o = V.cards[opp], P = posterior(V, me, "hard"), m = V.contrib[me], q = V.contrib[opp], carry = V.carry, need = V.cur - m;
    const room = V.cap - V.cur, cands = [{ t: "fold" }];
    if (need <= V.chips[me]) cands.push({ t: "call" });
    if (V.canRaise) { const seen = new Set(); for (const f of [0.15, 0.35, 0.6, 1]) { const to = Math.min(V.cap, V.cur + Math.max(1, Math.round(room * f))); if (!seen.has(to)) { seen.add(to); cands.push({ t: "raise", to }); } } }
    const oppChips = V.chips[opp], penOpp = o === 10 ? Math.min(PEN, oppChips) : 0, K = 6, base = Math.floor(r() * 1e9);
    const rg = i => { let a = (base + i * 7919) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const show = (c, fin) => (c > o ? fin + carry : c < o ? -fin : 0);   // 맞춰 보였을 때(각자 fin 칩): 이기면 상대 몫 + 이월, 지면 내 몫, 비기면 0
    let best = null;
    for (const a of cands) {
      let ev = 0, rf = 0, rc = 0;   // rf/rc: 상대가 재레이즈했을 때 내가 폴드/콜하는 값(합쳐서 더 나은 쪽)
      for (let c = 1; c <= 10; c++) {
        const pc = P.p[c]; if (!(pc > 0)) continue;
        const penMe = c === 10 ? Math.min(PEN, V.chips[me]) : 0;
        if (a.t === "fold") { ev += pc * (-m - penMe); continue; }
        if (a.t === "call") { ev += pc * show(c, V.cur); continue; }
        // 레이즈 → 상대의 응답을 '초급 · 보통' 번갈아 가며 표본
        let sum = 0;
        for (let k = 0; k < K; k++) {
          const rr = rg(k * 31 + c), ov = oppView(V, me, c, a.to), pl = plan(ov, opp, k % 2 ? "normal" : "easy", rr).a;
          if (pl.t === "fold") sum += q + carry + penOpp;
          else if (pl.t === "call") sum += show(c, a.to);
          else { rf += pc * (-a.to - penMe) / K; rc += pc * show(c, Math.min(V.cap, pl.to || a.to)) / K; }
        }
        ev += pc * sum / K;
      }
      if (a.t === "raise") ev += Math.max(rf, rc);
      if (!best || ev > best.ev + 1e-9) best = { a, ev };
    }
    return { a: best.a, ev: best.ev, P, need };
  }
  function ai(V, me, tier, r) {
    if (V.phase !== "bet" || !V.needs.includes(me)) return null;
    if (tier === "hard") return planEV(V, me, r).a;
    return plan(V, me, tier, r).a;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    const opp = 1 - me;
    if (V.over) return { opp: "승부가 끝났어요.", mine: `내 칩 ${V.chips[me]} · 상대 ${V.chips[opp]}`, rec: V.ranks[me] === 0 ? "이겼어요! 한 판 더?" : "아쉬워요 — 남은 카드를 세며 다시!", why: "" };
    if (V.phase !== "bet") {
      const r = V.res;
      return { opp: r ? `${nm(opp)} 카드 ${r.cards[opp]} · 내 카드 ${r.cards[me]}${r.type === "fold" ? ` — ${r.folder === me ? "내가" : nm(opp) + "이"} 폴드${r.pen ? ` (10 페널티 ${r.pen}칩)` : ""}` : ""}` : "다음 판을 준비해요.", mine: `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]}${V.carry ? ` · 이월 판돈 ${V.carry}` : ""}`, rec: "결과를 보고 남은 카드를 머리에 새겨요", why: `20장 중 ${V.used.length}장이 지나갔어요.` };
    }
    const o = V.cards[opp], P = posterior(V, me, "hard");
    const evs = V.log.filter(e => e.k === "bet" && e.s === opp && e.i >= roundStart(V));
    const lastE = evs[evs.length - 1];
    const oppTxt = lastE ? `${nm(opp)}이 ${lastE.a === "raise" ? `${lastE.to}칩까지 레이즈` : "콜"} — 내 카드가 낮다는 신호일 수도, 허세일 수도 있어요 (상대 카드는 ${o}).` : `${nm(opp)}의 카드는 ${o}. 아직 베팅이 없어요.`;
    const left = []; for (let c = 1; c <= 10; c++) { const n = 2 - V.used.filter(x => x === c).length - (o === c ? 1 : 0); if (n > 0) left.push(c + (n > 1 ? "×2" : "")); }
    const mineTxt = `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} · 판돈 ${V.pot}${V.carry ? ` (이월 ${V.carry} 포함)` : ""} · 내 카드가 ${o}보다 클 확률 ${pc(P.win)} · 같을 확률 ${pc(P.draw)} · 10일 확률 ${pc(P.p10)}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me)) {
      const pl = planEV(V, me, () => 0.5);
      const t = pl.a.t;
      rec = t === "fold" ? "폴드하기" : t === "call" ? (pl.need > 0 ? `콜 (${pl.need}칩)` : "콜 (바로 공개)") : `레이즈 → ${pl.a.to}칩`;
      if (t === "fold") why = `이길 확률 ${pc(P.win)}로 콜의 기대값이 낮아요. 단, 내 카드가 10일 확률 ${pc(P.p10)} × 페널티 10칩도 계산했어요.`;
      else if (t === "raise") why = `이길 확률이 ${pc(P.win)}라 판돈을 키워요. 상대는 내 카드를 보고 있다는 점도 기억해요.`;
      else why = pl.need > 0 ? `이길 확률 ${pc(P.win)}로 ${pl.need}칩을 내고 맞서 볼 만해요.` : `더 걸 만큼 앞서지 않아요 (이길 확률 ${pc(P.win)}). 공개하면 손해는 기본 베팅뿐이에요.`;
      why += ` 이 수의 기대 칩은 ${pl.ev >= 0 ? "+" : ""}${pl.ev.toFixed(1)} (상대가 보이는 카드로 두는 대로 가정해 계산).`;
      why += ` 남은 카드: ${left.join(" ")}`;
    }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-indian", MAXR, PEN, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, posterior, plan, canRaise, capTotal };
});

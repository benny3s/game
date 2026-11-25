/* 베니 서바이벌 · 인디언 홀덤 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 2 (룰 브레이커) 7 · 10화 데스매치, 12화 결승 1회전 (나무위키 회차 문서 기준)
   · 두 사람. 카드는 1 ~ 10 네 장씩 40장. 공유카드 2장이 공개되고, 각자 카드 1장은 이마에 붙여 — 상대 카드만 보임
   · 조합: 트리플(내 카드 = 공유 둘) > 스트레이트(세 장이 이어지는 숫자, 10 과 1 도 이어짐) > 더블(내 카드 = 공유 하나) > 없음
     서로 다른 조합이면 높은 조합이 이기고, 같은 조합이면 내 카드 숫자가 큰 쪽이 이김
   · 기본 베팅 1칩 → 선부터 콜 · 레이즈 · 폴드. 콜하면 바로 공개. 폴드는 낸 칩만 잃음
   · 단, 스트레이트나 트리플을 든 채 폴드하면 칩 10개를 더 냄 (결승 판은 더블 폴드 5개도 추가)
   · 같으면 무승부 — 판돈은 다음 판 이긴 사람이 가져가고 그 판은 기본 베팅이 없음. 칩이 0 이 되면 바로 패배
   우리 판 다듬기(방송 문서에 없는 것): 첫 판 선은 동전, 이후 번갈아 · 올인 상한은 적은 쪽 칩 · 공유카드 둘이 같고 내 카드가 다르면 '없음' · 순환 스트레이트는 방송 확률(19/39)과 맞는 해석 · 30판 안전장치 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-holdem"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MAXR = 30;
  const CAT = ["없음", "더블", "스트레이트", "트리플"];

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 70) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function newDeck(st) {
    const d = []; for (let r = 1; r <= 10; r++) d.push(r, r, r, r);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }

  // ── 조합 ──────────────────────────────────────────────────
  const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 10 - d); };   // 1 ~ 10 을 둥글게 놓은 거리
  function isStraight(a, b, x) {
    if (a === b || a === x || b === x) return false;
    const v = [a, b, x].map(n => n - 1).sort((p, q) => p - q);
    // 둥근 10칸에서 세 칸이 이어지는지: 모든 시작점에서 {s, s+1, s+2} 와 비교
    for (let s = 0; s < 10; s++) { const t = [s, (s + 1) % 10, (s + 2) % 10].sort((p, q) => p - q); if (t[0] === v[0] && t[1] === v[1] && t[2] === v[2]) return true; }
    return false;
  }
  function cat(sh, x) {
    const [a, b] = sh;
    if (x === a && x === b) return 3;
    if (isStraight(a, b, x)) return 2;
    if (x === a || x === b) return 1;
    return 0;
  }
  // 내 카드 x · 상대 카드 y → 1 이기면 / 0 무승부 / -1 지면
  function cmp(sh, x, y) {
    const cx = cat(sh, x), cy = cat(sh, y);
    if (cx !== cy) return cx > cy ? 1 : -1;
    return x === y ? 0 : x > y ? 1 : -1;
  }
  const penOf = (st, c) => (c >= 2 ? 10 : c === 1 ? st.doublePen : 0);

  function init({ n, seed, cfg }) {
    const ver = cfg && cfg.ver === "b" ? "b" : "a";
    const start = Math.max(5, Math.min(100, (cfg && +cfg.chips) || (ver === "b" ? 20 : 15)));
    const maxR = Math.max(3, Math.min(MAXR, (cfg && +cfg.rounds) || MAXR));
    const st = { n: 2, rs: (seed >>> 0) || 1, ver, start, maxR, doublePen: ver === "b" ? 5 : 0, chips: [start, start], round: 0, first: 0, deck: [], used: [], shared: [0, 0], cards: [0, 0], contrib: [0, 0], carry: 0, cur: 0, turn: 0, phase: "", log: [], seq: 0, over: false, res: null, hist: [], cfg: cfg || {} };
    st.first0 = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.first = (st.first0 + st.round - 1) % 2;
    const c = st.cfg || {};
    if (c.cards && c.cards[st.round - 1]) { const q = c.cards[st.round - 1]; st.shared = [q[0], q[1]]; st.cards = [q[2], q[3]]; }
    else {
      if (st.deck.length < 4) { st.deck = newDeck(st); st.used = []; }
      st.shared = [st.deck.pop(), st.deck.pop()]; st.cards = [st.deck.pop(), st.deck.pop()];
    }
    st.res = null;
    st.contrib = [0, 0];
    if (st.carry === 0) for (const i of [0, 1]) { const a = Math.min(1, st.chips[i]); st.chips[i] -= a; st.contrib[i] = a; }
    st.cur = Math.max(st.contrib[0], st.contrib[1]);
    st.turn = st.first; st.phase = "bet";
    push(st, { k: "round", r: st.round, f: st.first });
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
      const c = cat(st.shared, st.cards[seat]);
      let pen = penOf(st, c); pen = Math.min(pen, st.chips[seat]); st.chips[seat] -= pen;
      const gain = pot(st) + pen;
      st.chips[opp] += gain; const P = pot(st); st.carry = 0;
      finish(st, { type: "fold", folder: seat, win: opp, gain, pen, pot: P });
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
    const P = pot(st), r = cmp(st.shared, st.cards[0], st.cards[1]);
    if (r === 0) { st.carry = P; finish(st, { type: "draw", pot: P }); return; }
    const w = r > 0 ? 0 : 1;
    st.chips[w] += P; st.carry = 0;
    finish(st, { type: "show", win: w, gain: P, pot: P });
  }
  function finish(st, r) {
    r.cards = st.cards.slice(); r.shared = st.shared.slice(); r.r = st.round; r.contrib = st.contrib.slice(); r.chips = st.chips.slice(); r.f = st.first;
    r.cat = st.cards.map(x => cat(st.shared, x));
    st.res = r; st.hist.push({ r: r.r, type: r.type, win: r.win, cards: r.cards, shared: r.shared, cat: r.cat, pot: r.pot, pen: r.pen || 0, f: r.f, chips: r.chips });
    st.used = (st.used || []).concat(st.shared, st.cards);
    st.phase = "reveal"; st.contrib = [0, 0];
    push(st, { k: "end", r: st.round, t: r.type, w: r.win });
    const broke = st.chips[0] <= 0 || st.chips[1] <= 0;
    if ((broke && st.carry === 0) || st.round >= st.maxR) {   // 마지막 판에 이월 판돈이 남으면 반씩 나눠요
      if (st.carry > 0) { const h = Math.floor(st.carry / 2); st.chips[0] += h; st.chips[1] += h; st.carry = 0; r.chips = st.chips.slice(); st.hist[st.hist.length - 1].chips = r.chips; }
      st.over = true; st.phase = "end";
    }
  }
  const auto = st => (st.phase === "reveal" ? 3600 : null);
  function advance(st) { if (st.phase === "reveal") startRound(st); }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const L = [{ t: "fold" }];
    if (st.cur - st.contrib[seat] <= st.chips[seat]) L.push({ t: "call" });
    if (canRaise(st)) L.push({ t: "raise", to: st.cur + 1 });
    return L;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", show = st.phase === "reveal" || st.phase === "end";
    const cards = st.cards.map((c, i) => (all || show || (seat >= 0 && i !== seat) ? c : -1));
    const pubObj = { r: st.round, p: st.phase, c: st.chips, ct: st.phase === "bet" ? st.contrib : 0, cy: st.carry, t: st.turn, sh: st.shared, u: st.used.length, res: show && st.res ? [st.res.type, st.res.win, st.res.cards] : 0, ov: st.over };
    return {
      n: 2, round: st.round, maxR: st.maxR, ver: st.ver, doublePen: st.doublePen, phase: st.phase, chips: st.chips.slice(), contrib: st.phase === "bet" ? st.contrib.slice() : [0, 0], carry: st.carry, pot: st.phase === "bet" ? pot(st) : 0,
      cur: st.cur, turn: st.turn, first: st.first, cap: st.phase === "bet" ? capTotal(st) : 0, canRaise: st.phase === "bet" && canRaise(st), start: st.start,
      shared: st.shared.slice(), cards, used: st.used.slice(), res: st.res, hist: st.hist.slice(-12), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(),
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · AI (내가 보는 것만) ─────────────────────────────
  const roundStart = V => { const e = V.log.filter(x => x.k === "round").pop(); return e ? e.i : 0; };
  // 내 카드 후보 = 40장 중 버려진 카드 · 공유 · 상대 카드를 뺀 나머지, 상대의 이번 판 레이즈로 가중
  function posterior(V, me, tier) {
    const opp = 1 - me, y = V.cards[opp], sh = V.shared;
    const cnt = Array(11).fill(0); for (let r = 1; r <= 10; r++) cnt[r] = 4;
    if (tier !== "easy") for (const c of V.used) cnt[c]--;   // 초급은 지나간 카드를 세지 않아요
    for (const c of sh) cnt[c]--;
    if (y > 0) cnt[y]--;
    const w = cnt.map(x => Math.max(0, x));
    if (V.phase === "bet" && tier !== "easy") {
      const strength = tier === "hard" ? 1 : 0.6;
      const raises = V.log.filter(e => e.k === "bet" && e.s === opp && e.a === "raise" && e.i >= roundStart(V));
      for (const e of raises) {
        const big = e.to >= 5;
        for (let x = 1; x <= 10; x++) {
          const r = cmp(sh, y, x);   // 상대가 이기는 쪽이면 레이즈가 자연스러움
          const f = r > 0 ? 1 : r === 0 ? (big ? 0.4 : 0.55) : (big ? 0.15 : 0.3);
          w[x] *= Math.pow(f, strength);
        }
      }
    }
    const s = w.reduce((a, b) => a + b, 0) || 1;
    const p = w.map(x => x / s);
    let win = 0, draw = 0, lose = 0, penE = 0, pStrong = 0;
    for (let x = 1; x <= 10; x++) {
      const r = cmp(sh, x, y);
      if (r > 0) win += p[x]; else if (r === 0) draw += p[x]; else lose += p[x];
      const c = cat(sh, x); const pn = c >= 2 ? 10 : c === 1 ? V.doublePen : 0;
      penE += p[x] * pn; if (c >= 2) pStrong += p[x];
    }
    return { p, win, draw, lose, penE, pStrong };
  }
  function plan(V, me, tier, r) {
    const opp = 1 - me, P = posterior(V, me, tier);
    const mine = V.contrib[me], q = V.contrib[opp], need = V.cur - mine, carry = V.carry;
    const thr = tier === "easy" ? 0.62 : tier === "normal" ? 0.5 : 0.44;
    const canR = V.canRaise, room = V.cap - V.cur;
    const evCall = P.win * (carry + q) - P.lose * q;
    const evFold = -mine - P.penE * (tier === "easy" ? 0.3 : 1);
    let a, why;
    const pickRaise = frac => ({ t: "raise", to: Math.min(V.cap, V.cur + Math.max(1, Math.round(room * Math.min(1, frac)))) });
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
  // 고급: 폴드 · 콜 · 여러 크기의 레이즈마다 '내 카드가 무엇일지(확률) × 상대가 받아 칠 모습(상대 눈에 보이는 것만으로 초급·보통이 두는 대로)'을 어림해 기대 칩이 가장 큰 수를 골라요
  function oppView(V, me, x, X) {   // 상대 시점의 가상 화면: 상대는 내 카드 x 와 공유카드를 보고, 자기 카드는 못 봄
    const contrib = V.contrib.slice(); contrib[me] = X;
    const cards = [-1, -1]; cards[me] = x;
    return { n: 2, phase: "bet", chips: V.chips.map((c, i) => (i === me ? Math.max(0, c - (X - V.contrib[me])) : c)), contrib, carry: V.carry, cur: X, cap: V.cap, canRaise: V.cap > X, used: V.used, shared: V.shared, doublePen: V.doublePen, cards, turn: 1 - me,
      log: [{ k: "round", i: 0 }, { k: "bet", s: me, a: "raise", to: X, i: 1 }] };
  }
  // 수 하나의 기대 칩(이번 판 시작 기준)을 재는 틀. planEV(고급 AI 의 선택)와 evalActs(복기 · 선생님)가 같은 식을 씀 — K = 상대 응답 표본 수(AI 는 6)
  function evCtx(V, me, r, K) {
    const opp = 1 - me, y = V.cards[opp], sh = V.shared, P = posterior(V, me, "hard"), m = V.contrib[me], q = V.contrib[opp], carry = V.carry, need = V.cur - m;
    const room = V.cap - V.cur, cands = [{ t: "fold" }];
    if (need <= V.chips[me]) cands.push({ t: "call" });
    if (V.canRaise) { const seen = new Set(); for (const f of [0.15, 0.35, 0.6, 1]) { const to = Math.min(V.cap, V.cur + Math.max(1, Math.round(room * f))); if (!seen.has(to)) { seen.add(to); cands.push({ t: "raise", to }); } } }
    const penOf = (x, chips) => { const c = cat(sh, x); return Math.min(chips, c >= 2 ? 10 : c === 1 ? V.doublePen : 0); };
    const penOpp = penOf(y, V.chips[opp]), base = Math.floor(r() * 1e9);
    K = K || 6;
    const rg = i => { let a = (base + i * 7919) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const show = (x, fin) => { const c = cmp(sh, x, y); return c > 0 ? fin + carry : c < 0 ? -fin : 0; };
    const evOf = a => {
      let ev = 0, rf = 0, rc = 0;
      for (let x = 1; x <= 10; x++) {
        const px = P.p[x]; if (!(px > 0)) continue;
        const penMe = penOf(x, V.chips[me]);
        if (a.t === "fold") { ev += px * (-m - penMe); continue; }
        if (a.t === "call") { ev += px * show(x, V.cur); continue; }
        let sum = 0;
        for (let k = 0; k < K; k++) {
          const rr = rg(k * 31 + x), pl = plan(oppView(V, me, x, a.to), opp, k % 2 ? "normal" : "easy", rr).a;
          if (pl.t === "fold") sum += q + carry + penOpp;
          else if (pl.t === "call") sum += show(x, a.to);
          else { rf += px * (-a.to - penMe) / K; rc += px * show(x, Math.min(V.cap, pl.to || a.to)) / K; }
        }
        ev += px * sum / K;
      }
      if (a.t === "raise") ev += Math.max(rf, rc);
      return ev;
    };
    return { P, need, cands, evOf };
  }
  function planEV(V, me, r) {
    const X = evCtx(V, me, r); let best = null;
    for (const a of X.cands) { const ev = X.evOf(a); if (!best || ev > best.ev + 1e-9) best = { a, ev }; }
    return { a: best.a, ev: best.ev, P: X.P, need: X.need };
  }
  // 복기 · 선생님용: 기본 후보(폴드 · 콜 · 레이즈 몇 가지)의 기대 칩 표 + extra 로 준 수들의 기대 칩(ex)을 같은 표본으로 잼. view 는 안 바꾸고 ai() 의 선택과 무관.
  function evalActs(V, me, r, extra, K) {
    const X = evCtx(V, me, r, K);
    return { P: X.P, need: X.need, list: X.cands.map(a => ({ a, ev: X.evOf(a) })), ex: (extra || []).map(a => X.evOf(a)) };
  }
  function ai(V, me, tier, r) {
    if (V.phase !== "bet" || !V.needs.includes(me)) return null;
    if (tier === "hard") return planEV(V, me, r).a;
    return plan(V, me, tier, r).a;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const sg = v => (v < -0.05 ? "−" : "+") + Math.abs(v).toFixed(1);   // 부호 붙인 칩 (소수 1자리)
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const jong = s => { const t = String(s).replace(/[^0-9A-Za-z가-힣]+$/, ""), ch = t.slice(-1), c = ch.charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28; if (ch >= "0" && ch <= "9") return "013678".includes(ch) ? 1 : 0; return 0; };
  const josa = (name, withJ, noJ) => esc(name) + (jong(name) ? withJ : noJ);   // 받침 있으면 withJ · 없으면 noJ
  const lastRaises = (V, who) => V.log.filter(e => e.k === "bet" && e.s === who && e.a === "raise" && e.i >= roundStart(V));
  const stat = (H, me) => ({ n: H.length, w: H.filter(x => x.type !== "draw" && x.win === me).length, l: H.filter(x => x.type !== "draw" && x.win === 1 - me).length, d: H.filter(x => x.type === "draw").length, foldOpp: H.filter(x => x.type === "fold" && x.win === me).length, foldMe: H.filter(x => x.type === "fold" && x.win === 1 - me).length, penMe: H.filter(x => x.pen && x.win === 1 - me).length, combo: H.filter(x => x.cat && x.cat.some(c => c >= 2)).length });
  const catP = (sh, p) => { const o = [0, 0, 0, 0]; for (let x = 1; x <= 10; x++) o[cat(sh, x)] += p[x] || 0; return o; };   // 내 카드가 없음 · 더블 · 스트레이트 · 트리플일 확률
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : 0;
    const raw = i => String((names && names[i]) || `${i + 1}번`), nm = i => esc(raw(i)), opp = 1 - me, sh = V.shared, H = V.hist || [], S = stat(H, me);
    if (V.over) {
      const df = V.chips[me] - V.chips[opp];
      return { opp: `승부가 끝났어요 — ${nm(opp)}의 칩 ${V.chips[opp]}.`, mine: `내 칩 ${V.chips[me]} : 상대 ${V.chips[opp]} (${df >= 0 ? "+" : "−"}${Math.abs(df)} · ${V.round}판 진행, 시작 칩 ${V.start})`,
        rec: df > 0 ? "이겼어요! 한 판 더?" : df === 0 ? "비겼어요 — 다시 겨뤄 봐요" : "아쉬워요 — 공유카드 간격을 먼저 보세요!",
        why: S.n ? `마지막 ${S.n}판 기록: 내가 이긴 판 ${S.w} · 상대가 이긴 판 ${S.l} · 무승부 ${S.d} · 폴드는 나 ${S.foldMe}번 / 상대 ${S.foldOpp}번 · 스트레이트 이상이 나온 판 ${S.combo}번${S.penMe ? ` · 내가 조합을 들고 폴드한 판 ${S.penMe}번` : ""}.` : "기록된 판이 없어요." };
    }
    if (V.phase !== "bet") {
      const r = V.res, cnt = Array(11).fill(4); for (const c of V.used) cnt[c]--;
      const left = cnt.reduce((a, b, i) => a + (i ? Math.max(0, b) : 0), 0), hi = cnt.slice(8).reduce((a, b) => a + Math.max(0, b), 0), gone = []; for (let c = 1; c <= 10; c++) if (cnt[c] <= 0) gone.push(c);
      let net = 0, outT = "";
      if (r) {
        net = r.type === "draw" ? 0 : r.win === me ? r.gain - r.contrib[me] : -r.contrib[me] - (r.pen || 0);
        outT = r.type === "draw" ? ` — 무승부 (판돈 ${r.pot}칩은 다음 판으로)` : r.type === "fold" ? ` — ${r.folder === me ? "내가" : josa(raw(opp), "이", "가")} 폴드${r.pen ? ` (페널티 ${r.pen}칩)` : ""}` : ` — ${r.win === me ? "내가" : josa(raw(opp), "이", "가")} 이겼어요 (판돈 ${r.pot}칩)`;
      }
      return { opp: r ? `${nm(opp)} 카드 ${r.cards[opp]}(${CAT[r.cat[opp]]}) · 내 카드 ${r.cards[me]}(${CAT[r.cat[me]]}) · 공유 ${r.shared[0]}·${r.shared[1]}${outT}` : "다음 판을 준비해요.",
        mine: `${r ? `이번 판 ${net >= 0 ? "+" : "−"}${Math.abs(net)}칩 → ` : ""}칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]}${V.carry ? ` · 이월 판돈 ${V.carry}` : ""}`,
        rec: `덱에 ${left}장 남았어요 — 8 이상이 ${hi}장 (${left ? pc(hi / left) : "0%"})${gone.length ? ` · 다 나온 숫자 ${gone.join(" · ")}` : ""}`,
        why: `40장 중 ${V.used.length}장이 지나갔어요${S.n ? ` · 최근 ${S.n}판: 내가 ${S.w}번 · 상대가 ${S.l}번 이김, 무승부 ${S.d}번, 스트레이트 이상이 나온 판 ${S.combo}번` : ""}.` };
    }
    const y = V.cards[opp], P = posterior(V, me, "hard"), m = V.contrib[me];
    const P0 = posterior(Object.assign({}, V, { log: V.log.filter(e => !(e.k === "bet" && e.s === opp && e.a === "raise")) }), me, "hard");
    const gap = circ(sh[0], sh[1]);
    const risky = gap <= 2;   // 공유 둘이 같거나 1 · 2 차이 → 트리플 · 스트레이트 가능
    const rs = lastRaises(V, opp), lastR = rs[rs.length - 1], cy = cat(sh, y), penY = Math.min(V.chips[opp], cy >= 2 ? 10 : cy === 1 ? V.doublePen : 0);
    const oppTxt = `${nm(opp)}의 카드는 ${y}${cy ? ` (공유와 ${CAT[cy]})` : ""}.` + (lastR ? ` ${lastR.to}칩까지 레이즈 — 레이즈 전엔 내 이길 확률 ${pc(P0.win)}, 지금은 ${pc(P.win)}예요 (약하다는 신호일 수도, 허세일 수도 있어요).` : ` 아직 베팅이 없어요 (상대 칩 ${V.chips[opp]}).`) + (penY ? ` 상대가 폴드하면 페널티 ${penY}칩이 나가요.` : "") + (S.n ? ` 최근 ${S.n}판 중 상대 폴드 ${S.foldOpp}번.` : "");
    const pC = catP(sh, P.p), combo = [1, 2, 3].filter(c => pC[c] >= 0.005).map(c => `${CAT[c]} ${pc(pC[c])}`);
    const mineTxt = `공유 ${sh[0]}·${sh[1]} (간격 ${gap} → ${risky ? "조합이 나올 수 있어요" : "조합이 안 나와 숫자 싸움"}) · 칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} · 내가 건 칩 ${m} · 판돈 ${V.pot} · 이길 확률 ${pc(P.win)} · 무승부 ${pc(P.draw)}${combo.length ? ` · 내 조합 확률: ${combo.join(" · ")}` : ""}`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me)) {
      const E = evalActs(V, me, () => 0.5), pl = E.list.reduce((b, x) => (!b || x.ev > b.ev + 1e-9 ? x : b), null), t = pl.a.t;   // ai() 의 고급(planEV)과 같은 식 · 같은 표본
      rec = t === "fold" ? "폴드하기" : t === "call" ? (E.need > 0 ? `콜 (${E.need}칩)` : "콜 (바로 공개)") : `레이즈 → ${pl.a.to}칩`;
      if (t === "fold") why = `이길 확률 ${pc(P.win)}라 콜의 기대값이 낮아요.${P.penE >= 0.05 ? ` 단, 내가 스트레이트 · 트리플일 확률 ${pc(P.pStrong)} 때문에 폴드 페널티 기대값(약 ${P.penE.toFixed(1)}칩)도 계산했어요.` : ""}`;
      else if (t === "raise") why = `이길 확률이 ${pc(P.win)}라 판돈을 키워요.${risky ? " 공유카드가 가까워 상대도 조합일 수 있으니 조심!" : ""}`;
      else why = E.need > 0 ? `이길 확률 ${pc(P.win)}로 ${E.need}칩을 내고 맞서 볼 만해요.` : `더 걸 만큼 앞서지 않아요 (${pc(P.win)}). 공개해도 손해는 기본 베팅뿐이에요.`;
      const fo = E.list.find(x => x.a.t === "fold"), ca = E.list.find(x => x.a.t === "call"), rz = E.list.filter(x => x.a.t === "raise").reduce((b, x) => (!b || x.ev > b.ev ? x : b), null);
      why += ` 기대 칩: 폴드 ${sg(fo.ev)}${ca ? ` · 콜 ${sg(ca.ev)}` : ""}${rz ? ` · 레이즈 ${rz.a.to}칩 ${sg(rz.ev)}` : ""} (상대가 보이는 카드로 두는 대로 가정해 계산).`;
      if (!risky) why += V.doublePen ? ` 공유카드 간격이 3 이상이면 스트레이트 · 트리플이 안 나와 큰 페널티(10칩)는 없어요 (더블이면 ${V.doublePen}칩).` : " 공유카드 간격이 3 이상이면 조합이 안 나와 폴드해도 페널티가 없어요.";
    } else {
      const evShow = P.win * (V.carry + V.cur) - P.lose * V.cur;
      const rto = Math.min(V.cap, Math.max(5, V.cur + 1)), Pr = posterior(Object.assign({}, V, { log: V.log.concat([{ k: "bet", s: opp, a: "raise", to: rto, i: 1e9 }]) }), me, "hard");
      why = `상대가 콜하면 바로 공개돼요 — 이길 ${pc(P.win)} · 질 ${pc(P.lose)} · 기대 칩 ${sg(evShow)}. 상대가 폴드하면 +${V.contrib[opp] + V.carry + penY}칩${penY ? ` (상대 조합 페널티 ${penY}칩 포함)` : ""}.${V.canRaise ? ` 상대가 ${rto}칩까지 레이즈하면 이길 확률이 ${pc(Pr.win)}로 바뀌어요.` : ""}`;
    }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-holdem", MAXR, CAT, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, posterior, plan, planEV, evalActs, canRaise, capTotal, cat, cmp, isStraight, circ };
});

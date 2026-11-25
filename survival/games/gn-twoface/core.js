﻿/* 베니 서바이벌 · 양면포커 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 (블랙가넷) 4 · 5화 데스매치, 시즌 4 (그랜드 파이널) 10화 (나무위키 회차 문서 기준)
   · 두 사람. 카드는 앞면 · 뒷면에 서로 다른 숫자(1 ~ 10). 각자 카드 1장을 받는데 — 내 뒷면과 상대 앞면만 보임
   · 기본 베팅 1칩(무승부 뒤에도 매 판). 선이 한 면을 골라 베팅 → 콜하면 고른 두 면의 숫자를 공개, 큰 쪽이 판돈. 같으면 무승부 · 판돈 이월
   · 면은 첫 베팅(레이즈 · 콜)할 때 고르고 바꿀 수 없음
   · 양면베팅 x: 앞 · 뒤 두 면에 각각 x 를 건다(내 총액 1 + 2x). 상대가 고른 면보다 두 면이 다 크면 성공 → 상대 칩 10 개를 더 가져옴
     상대는 콜(고른 면에 x 만큼) 또는 폴드. 양면베팅에 폴드하면 칩 10 개를 더 냄. 한 면이라도 같거나 낮으면 실패 → 상대 승
   · 시작 칩: 블랙가넷 30 (카드 90장) / 그랜드 파이널 40 (카드 200장, 앞뒤 홀짝이 반대). 칩이 0 이 되면 바로 패배
   우리 판 다듬기(방송 문서에 없음): 첫 판 선은 동전, 이후 번갈아 · 올인 상한은 적은 쪽 칩 · 양면베팅 실패는 건 칩(1 + 2x) 전부 잃음
   · 양면베팅에 레이즈 · 맞양면은 없음 · 칩이 모자라 10 개를 못 내면 있는 만큼 · 30판 안전장치
   · 기본 베팅만 하고 넘기기(체크): 먼저 넘긴 사람이 면을 고르면 상대는 면을 골라 콜(바로 공개)만 해요 — 더 걸거나 접을 수 없어요 (콜 = 바로 공개, 방송 표의 '기본 1칩 판돈 이월' 장면) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-twoface"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MAXR = 30, BONUS = 10;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 70) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  // 카드 묶음: a = 앞 ≠ 뒤 모든 순서쌍 90장 / b = 앞뒤 홀짝이 반대인 50장 × 4세트 = 200장
  function newDeck(st) {
    const d = [];
    for (let f = 1; f <= 10; f++) for (let b = 1; b <= 10; b++) {
      if (f === b) continue;
      if (st.ver === "b") { if ((f + b) % 2 === 1) for (let k = 0; k < 4; k++) d.push([f, b]); }
      else d.push([f, b]);
    }
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }

  function init({ n, seed, cfg }) {
    const ver = cfg && cfg.ver === "b" ? "b" : "a";
    const start = Math.max(5, Math.min(100, (cfg && +cfg.chips) || (ver === "b" ? 40 : 30)));
    const maxR = Math.max(3, Math.min(MAXR, (cfg && +cfg.rounds) || MAXR));
    const st = { n: 2, rs: (seed >>> 0) || 1, ver, start, maxR, chips: [start, start], round: 0, first: 0, deck: [], card: [[0, 0], [0, 0]], contrib: [0, 0], side: [-1, -1], dbl: [0, 0], carry: 0, cur: 0, turn: 0, phase: "", log: [], seq: 0, over: false, res: null, hist: [], cfg: cfg || {} };
    st.first0 = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.first = (st.first0 + st.round - 1) % 2;
    const c = st.cfg || {};
    if (c.cards && c.cards[st.round - 1]) { const q = c.cards[st.round - 1]; st.card = [[q[0], q[1]], [q[2], q[3]]]; }
    else { if (st.deck.length < 2) st.deck = newDeck(st); st.card = [st.deck.pop(), st.deck.pop()]; }
    st.res = null; st.side = [-1, -1]; st.dbl = [0, 0]; st.chk = false;
    st.contrib = [0, 0];
    for (const i of [0, 1]) { const a = Math.min(1, st.chips[i]); st.chips[i] -= a; st.contrib[i] = a; }
    st.cur = Math.max(st.contrib[0], st.contrib[1]);
    st.turn = st.first; st.phase = "bet";
    push(st, { k: "round", r: st.round, f: st.first });
    if (!canRaise(st)) { st.side = [1, 1]; showdown(st); }   // 칩이 없어 더 걸 수 없으면 둘 다 뒷면으로 바로 공개
  }
  const capTotal = st => Math.min(st.chips[0] + st.contrib[0], st.chips[1] + st.contrib[1]);
  const canRaise = st => capTotal(st) > st.cur;
  const pot = st => st.contrib[0] + st.contrib[1] + st.carry;
  const face = (st, p) => (st.side[p] === 0 ? st.card[p][0] : st.card[p][1]);
  const dblOpp = st => (st.dbl[0] ? 0 : st.dbl[1] ? 1 : -1);   // 양면베팅을 건 사람 (없으면 -1)

  // 양면베팅 x 가 가능한 범위: x ≥ max(1, 상대가 건 칩) · 내 총액 1 + 2x · 상대는 1 + x 를 맞출 수 있어야 함
  function dblRange(st, seat) {
    const opp = 1 - seat;
    const lo = Math.max(1, st.cur - 1);
    const hiMe = Math.floor((st.chips[seat] + st.contrib[seat] - 1) / 2);
    const hiOpp = st.chips[opp] + st.contrib[opp] - 1;
    return { lo, hi: Math.min(hiMe, hiOpp) };
  }
  function needs(st) { return st.over || st.phase !== "bet" ? [] : [st.turn]; }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const opp = 1 - seat, vs = dblOpp(st) === opp;   // 상대가 양면베팅을 걸어 놓은 상태
    const pickSide = () => {
      if (st.side[seat] >= 0) return true;
      if (a.side !== 0 && a.side !== 1) return false;
      st.side[seat] = a.side; return true;
    };
    if (st.chk && a.t !== "call") return { ok: false, err: "상대가 넘겼어요 — 면을 골라 콜하면 바로 공개돼요" };   // 방송: 콜 = 바로 공개 (넘긴 판은 상대가 더 걸거나 접을 수 없어요)
    if (a.t === "fold") {
      const pen = vs ? Math.min(BONUS, st.chips[seat]) : 0;
      st.chips[seat] -= pen;
      const P = pot(st), gain = P + pen;
      st.chips[opp] += gain; st.carry = 0;
      finish(st, { type: "fold", folder: seat, win: opp, gain, pen, pot: P, dbl: vs });
      return { ok: true };
    }
    if (a.t === "call") {
      const need = st.cur - st.contrib[seat];
      if (need > st.chips[seat]) return { ok: false, err: "칩이 모자라요" };
      if (!pickSide()) return { ok: false, err: "앞면 · 뒷면 중 하나를 골라요" };
      st.chips[seat] -= need; st.contrib[seat] += need;
      if (need === 0 && !st.chk) {   // 기본 베팅만 한 채 넘김(체크) — 상대도 넘기면(콜) 바로 공개
        st.chk = true; push(st, { k: "bet", s: seat, a: "check", to: st.contrib[seat], side: st.side[seat] }); st.turn = opp; return { ok: true };
      }
      push(st, { k: "bet", s: seat, a: "call", to: st.contrib[seat], side: st.side[seat] });
      showdown(st);
      return { ok: true };
    }
    if (vs) return { ok: false, err: "양면베팅에는 콜 · 폴드만 할 수 있어요" };
    if (a.t === "raise") {
      const to = a.to | 0;
      if (!canRaise(st)) return { ok: false, err: "더 걸 수 없어요" };
      if (to <= st.cur) return { ok: false, err: `지금 ${st.cur}칩보다 많이 걸어야 해요` };
      if (to > capTotal(st)) return { ok: false, err: `최대 ${capTotal(st)}칩까지` };
      if (!pickSide()) return { ok: false, err: "앞면 · 뒷면 중 하나를 골라요" };
      const pay = to - st.contrib[seat];
      st.chips[seat] -= pay; st.contrib[seat] = to; st.cur = to;
      push(st, { k: "bet", s: seat, a: "raise", to, side: st.side[seat] });
      st.turn = opp;
      return { ok: true };
    }
    if (a.t === "double") {
      const x = a.x | 0, R = dblRange(st, seat);
      if (st.dbl[seat]) return { ok: false, err: "이미 양면베팅을 했어요" };
      if (R.hi < R.lo) return { ok: false, err: "양면베팅을 할 칩이 모자라요" };
      if (x < R.lo || x > R.hi) return { ok: false, err: `양면베팅은 ${R.lo} ~ ${R.hi}칩 (앞 · 뒤 각각)` };
      const total = 1 + 2 * x, pay = total - st.contrib[seat];
      st.chips[seat] -= pay; st.contrib[seat] = total; st.dbl[seat] = x; st.cur = 1 + x;
      push(st, { k: "bet", s: seat, a: "double", x, to: total });
      if (st.contrib[opp] >= 1 + x) showdown(st);   // 상대가 이미 x 이상 걸어 놓았으면 바로 공개
      else st.turn = opp;
      return { ok: true };
    }
    return { ok: false, err: "베팅 · 콜 · 양면베팅 · 폴드 중에서 골라요" };
  }
  function showdown(st) {
    const P = pot(st), D = dblOpp(st);
    if (D >= 0) {
      const S = 1 - D, v = face(st, S), ok = st.card[D][0] > v && st.card[D][1] > v;
      if (ok) {
        const bonus = Math.min(BONUS, st.chips[S]);
        st.chips[S] -= bonus; st.chips[D] += P + bonus; st.carry = 0;
        finish(st, { type: "dbl", win: D, ok: true, gain: P + bonus, bonus, pot: P, D });
      } else {
        st.chips[S] += P; st.carry = 0;
        finish(st, { type: "dbl", win: S, ok: false, gain: P, bonus: 0, pot: P, D });
      }
      return;
    }
    const a = face(st, 0), b = face(st, 1);
    if (a === b) { st.carry = P; finish(st, { type: "draw", pot: P }); return; }
    const w = a > b ? 0 : 1;
    st.chips[w] += P; st.carry = 0;
    finish(st, { type: "show", win: w, gain: P, pot: P });
  }
  function finish(st, r) {
    r.cards = st.card.map(c => c.slice()); r.side = st.side.slice(); r.r = st.round; r.contrib = st.contrib.slice(); r.chips = st.chips.slice(); r.f = st.first;
    if (r.type === "show" || r.type === "draw" || r.type === "dbl") r.show = true;
    st.res = r;
    st.hist.push({ r: r.r, type: r.type, win: r.win, ok: r.ok, pot: r.pot, pen: r.pen || 0, bonus: r.bonus || 0, f: r.f, chips: r.chips, cards: r.show ? r.cards : null, side: r.side });
    st.phase = "reveal"; st.contrib = [0, 0];
    push(st, { k: "end", r: st.round, t: r.type, w: r.win });
    const broke = st.chips[0] <= 0 || st.chips[1] <= 0;
    if ((broke && st.carry === 0) || st.round >= st.maxR) {   // 이월 판돈이 남았으면 다음 판에서 가려요 (마지막 판에 남으면 반씩 나눠요)
      if (st.carry > 0) { const h = Math.floor(st.carry / 2); st.chips[0] += h; st.chips[1] += h; st.carry = 0; r.chips = st.chips.slice(); st.hist[st.hist.length - 1].chips = r.chips; }
      st.over = true; st.phase = "end";
    }
  }
  const auto = st => (st.phase === "reveal" ? 3800 : null);
  function advance(st) { if (st.phase === "reveal") startRound(st); }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const L = st.chk ? [] : [{ t: "fold" }], vs = dblOpp(st) === 1 - seat;
    if (st.cur - st.contrib[seat] <= st.chips[seat]) L.push({ t: "call", side: st.side[seat] >= 0 ? st.side[seat] : 1 });
    if (!vs && !st.chk && canRaise(st)) L.push({ t: "raise", to: st.cur + 1, side: st.side[seat] >= 0 ? st.side[seat] : 1 });
    return L;
  }

  // ── 보이는 것: 내 뒷면 · 상대 앞면만 (구경꾼은 모두) ──────────────
  function view(st, seat) {
    const all = seat === "all", show = st.phase === "reveal" || st.phase === "end";
    const open = show && st.res && st.res.show;
    const cards = st.card.map((c, i) => ({ f: all || open || (seat >= 0 && i !== seat) ? c[0] : -1, b: all || open || i === seat ? c[1] : -1 }));
    const bet = st.phase === "bet";
    const pubObj = { r: st.round, p: st.phase, c: st.chips, ct: bet ? st.contrib : 0, cy: st.carry, t: st.turn, sd: st.side, d: st.dbl, res: show && st.res ? [st.res.type, st.res.win, st.res.ok ? 1 : 0, open ? st.res.cards : 0] : 0, ov: st.over };
    const R = bet && needs(st).length ? dblRange(st, st.turn) : { lo: 1, hi: 0 };
    return {
      n: 2, round: st.round, maxR: st.maxR, ver: st.ver, phase: st.phase, chips: st.chips.slice(), contrib: bet ? st.contrib.slice() : [0, 0], carry: st.carry, pot: bet ? pot(st) : 0,
      cur: st.cur, turn: st.turn, first: st.first, cap: bet ? capTotal(st) : 0, canRaise: bet && canRaise(st), start: st.start,
      side: st.side.slice(), dbl: st.dbl.slice(), dRange: R, chk: !!st.chk, cards, res: st.res && !open && !all ? Object.assign({}, st.res, { cards: null }) : st.res, hist: st.hist.slice(-12),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(), log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · AI (내가 보는 것만) ─────────────────────────────
  const roundStart = V => { const e = V.log.filter(x => x.k === "round").pop(); return e ? e.i : 0; };
  const cands = (V, known) => { const out = []; for (let v = 1; v <= 10; v++) if (v !== known && (V.ver !== "b" || (v % 2) !== (known % 2))) out.push(v); return out; };
  const sig = x => 1 / (1 + Math.exp(-x));
  // 상대 뒷면 b' 의 가능성 (상대 앞면 f' 는 내가 봄) — 상대가 뒷면을 골랐거나 크게 걸었으면 높은 쪽으로 기울임
  function oppBack(V, me, tier) {
    const opp = 1 - me, fo = V.cards[opp].f, cs = cands(V, fo);
    const w = Array(11).fill(0); for (const v of cs) w[v] = 1;
    if (tier !== "easy") {
      const k = tier === "hard" ? 1.5 : 0.9;
      if (V.side[opp] === 1) for (const v of cs) w[v] *= sig((v - 5.5) / 1.2) * 1.6 + 0.04;
      if (V.phase === "bet") {
        for (const e of V.log) if (e.k === "bet" && e.s === opp && e.i >= roundStart(V)) {
          if (e.a === "raise" || e.a === "double") { const big = (e.to || 0) >= 5 ? 1.5 : 1; for (const v of cs) w[v] *= Math.pow((v + 1) / 11, k * 0.8 * big); }
        }
      }
    }
    const s = w.reduce((a, b) => a + b, 0) || 1;
    return { w: w.map(x => x / s), fo };
  }
  // 상대가 낼 면의 숫자 분포
  function oppFace(V, me, tier) {
    const opp = 1 - me, B = oppBack(V, me, tier), d = Array(11).fill(0);
    if (V.side[opp] === 0) { d[B.fo] = 1; return d; }
    if (V.side[opp] === 1) { for (let v = 1; v <= 10; v++) d[v] = B.w[v]; return d; }
    // 아직 안 골랐으면: 뒷면이 6 이상이면 뒷면, 아니면 (모르는) 앞면을 고를 것으로 봄
    for (let v = 1; v <= 10; v++) { if (!B.w[v]) continue; d[v >= 6 ? v : B.fo] += B.w[v]; }
    return d;
  }
  function myFronts(V, me) { return cands(V, V.cards[me].b); }
  // 내 면 하나(0 앞 / 1 뒤)를 냈을 때: 이김 · 무승부
  function faceOdds(V, me, side, d) {
    const b = V.cards[me].b; let win = 0, draw = 0;
    const ms = side === 1 ? [b] : myFronts(V, me);
    for (const m of ms) for (let v = 1; v <= 10; v++) { if (!d[v]) continue; if (m > v) win += d[v] / ms.length; else if (m === v) draw += d[v] / ms.length; }
    return { win, draw, lose: 1 - win - draw };
  }
  // 양면베팅 성공 확률: 내 앞 · 뒤가 둘 다 상대 면보다 큼
  function dblOdds(V, me, d) {
    const b = V.cards[me].b, F = myFronts(V, me); let p = 0;
    for (let v = 1; v <= 10; v++) { if (!d[v] || b <= v) continue; p += d[v] * F.filter(f => f > v).length / F.length; }
    return p;
  }
  function bestSide(V, me, d) {
    if (V.side[me] >= 0) return V.side[me];
    const o1 = faceOdds(V, me, 1, d), o0 = faceOdds(V, me, 0, d);
    return (o0.win + 0.5 * o0.draw) > (o1.win + 0.5 * o1.draw) + 0.04 ? 0 : 1;
  }
  // 상대가 양면베팅을 걸었을 때 내가 이길 확률 (상대 앞면은 내가 봄, 뒷면은 추정)
  function vsDouble(V, me, tier, side) {
    const opp = 1 - me, B = oppBack(V, me, tier), fo = B.fo;
    const b = V.cards[me].b, ms = side === 1 ? [b] : myFronts(V, me); let pFail = 0;
    const w = B.w.slice();
    if (tier !== "easy") for (let v = 1; v <= 10; v++) w[v] *= (v + 1) / 11;   // 양면을 걸었으니 뒷면이 높을 가능성
    const s = w.reduce((a, c) => a + c, 0) || 1;
    for (const m of ms) { let pf = 0; if (fo <= m) pf = 1; else for (let v = 1; v <= 10; v++) if (v <= m) pf += w[v] / s; pFail += pf / ms.length; }
    return pFail;
  }
  function plan(V, me, tier, r) {
    const opp = 1 - me, mine = V.contrib[me], q = V.contrib[opp], need = V.cur - mine, carry = V.carry;
    const thr = tier === "easy" ? 0.6 : tier === "normal" ? 0.5 : 0.45;
    if (V.chk) {   // 상대가 기본 판돈만 걸고 넘겼어요 — 면을 골라 콜(바로 공개)만 할 수 있어요
      const d0 = oppFace(V, me, tier), side0 = bestSide(V, me, d0);
      return { a: { t: "call", side: side0 }, why: "chkCall", side: side0, o: faceOdds(V, me, side0, d0), need };
    }
    // 상대가 양면베팅을 건 경우: 콜 또는 폴드
    if (V.dbl[opp] > 0) {
      const x = V.dbl[opp], side = V.side[me] >= 0 ? V.side[me] : (vsDouble(V, me, tier, 0) > vsDouble(V, me, tier, 1) + 0.04 ? 0 : 1);
      const pf = vsDouble(V, me, tier, side), cost = need, bonus = Math.min(BONUS, Math.max(0, V.chips[me] - cost));
      const evCall = pf * (1 + 2 * x + carry) - (1 - pf) * (1 + x + bonus), evFold = -mine - Math.min(BONUS, V.chips[me]);
      const a = evCall >= evFold - (tier === "easy" ? 2 : 0) ? { t: "call", side } : { t: "fold" };
      return { a, why: a.t === "call" ? "callDbl" : "foldDbl", side, pf, evCall, evFold, need };
    }
    const d = oppFace(V, me, tier), side = bestSide(V, me, d), o = faceOdds(V, me, side, d), ps = dblOdds(V, me, d);
    const canR = V.canRaise, room = V.cap - V.cur, R = V.dRange || { lo: 1, hi: 0 };
    const evCall = o.win * (carry + q) - o.lose * q;
    const evFold = -mine;
    const big = Math.max(0.12, (o.win - 0.3) * (tier === "hard" ? 1.7 : 1.2));
    const pickRaise = frac => ({ t: "raise", to: Math.min(V.cap, V.cur + Math.max(1, Math.round(room * Math.min(1, frac)))), side });
    const thD = tier === "easy" ? 0.78 : tier === "normal" ? 0.52 : 0.4;
    let a, why;
    const canD = R.hi >= R.lo && !(R.lo > 1 && R.lo > V.chips[me]);
    if (canD && ps >= thD && r() < (tier === "easy" ? 0.5 : 0.92)) {
      const x = V.cur - 1 > 0 ? Math.max(R.lo, Math.min(R.hi, V.cur - 1)) : Math.min(R.hi, ps >= 0.7 && tier !== "easy" ? 2 : 1);
      a = { t: "double", x: Math.max(R.lo, x) }; why = "double";
    } else if (need > 0) {
      if (evCall < evFold - (tier === "easy" ? 0 : 0.3)) { a = { t: "fold" }; why = "fold"; }
      else if (canR && o.win >= thr + 0.12 && r() < (tier === "easy" ? 0.4 : 0.9)) { a = pickRaise(big * 0.8); why = "value"; }
      else { a = { t: "call", side }; why = "call"; }
    } else {
      // 아직 아무도 안 건 때: 강하면 걸고, 아니면 기본 베팅만 하고 넘김(체크 · 상대도 넘기면 공개) — 가끔 작게 떠봄
      if (canR && o.win >= thr && r() < (tier === "easy" ? 0.6 : 0.95)) { a = pickRaise(big); why = "value"; }
      else if (canR && tier !== "easy" && o.win < thr && r() < 0.12) { a = pickRaise(0.12); why = "probe"; }
      else { a = { t: "call", side }; why = "check"; }
    }
    return { a, why, side, o, ps, evCall, evFold, need };
  }
  function ai(V, me, tier, r) {
    if (V.phase !== "bet" || !V.needs.includes(me)) return null;
    return plan(V, me, tier, r).a;
  }

  // ── 복기 · 선생님용 평가 (ai 와 같은 확률 도우미를 그대로 재사용 · 보이는 것만 · 받은 view 는 안 바꿈 · 난수 없음) ──
  // 한 수의 '이번 판 기대 칩'(판 시작 대비) 과 p(이길 확률 · 양면베팅은 성공 확률 · 양면베팅을 받았을 땐 내가 이길 확률)
  // 가정: 내가 레이즈하면 상대가 PFOLD 만큼 접고 나머지는 콜하는 것으로 봄 · 무승부는 0 으로 셈 (ai 의 evCall 과 같은 식)
  const PFOLD = 0.25;
  function evalAct(V, me, a, tier) {
    tier = tier || "hard";
    if (!V || !a || typeof a !== "object" || V.phase !== "bet" || me !== 0 && me !== 1) return null;
    const opp = 1 - me, mine = V.contrib[me], q = V.contrib[opp], cur = V.cur, carry = V.carry;
    if (V.dbl[opp] > 0) {   // 상대가 양면베팅을 건 상태: 콜 또는 폴드
      const x = V.dbl[opp];
      if (a.t === "fold") return { kind: "foldDbl", ev: -mine - Math.min(BONUS, V.chips[me]), p: null, side: -1 };
      if (a.t !== "call") return null;
      const need = cur - mine, side = V.side[me] >= 0 ? V.side[me] : (a.side === 0 || a.side === 1 ? a.side : (vsDouble(V, me, tier, 0) > vsDouble(V, me, tier, 1) + 0.04 ? 0 : 1));
      const pf = vsDouble(V, me, tier, side), bonus = Math.min(BONUS, Math.max(0, V.chips[me] - need));
      return { kind: "callDbl", side, p: pf, ev: pf * (1 + 2 * x + carry) - (1 - pf) * (1 + x + bonus), x };
    }
    const d = oppFace(V, me, tier);
    const sd = V.side[me] >= 0 ? V.side[me] : (a.side === 0 || a.side === 1 ? a.side : bestSide(V, me, d));
    if (a.t === "fold") return { kind: "fold", ev: -mine, p: null, side: -1 };
    if (a.t === "call") {
      const o = faceOdds(V, me, sd, d);
      return { kind: "call", side: sd, p: o.win, pd: o.draw, ev: o.win * (carry + cur) - o.lose * cur, stake: cur, chk: V.cur - mine <= 0 };
    }
    if (a.t === "raise") {
      const to = a.to | 0;
      if (to <= cur || !V.canRaise) return null;
      // 판돈만큼 키운 것까지만 이득으로 셈 (그보다 크게 걸면 상대가 접으니, 크기 차이는 판단 차이일 뿐)
      const o = faceOdds(V, me, sd, d), toEff = Math.min(to, cur + Math.max(2, carry + mine + q)), evShow = o.win * (carry + toEff) - o.lose * toEff;
      return { kind: "raise", side: sd, to, p: o.win, pd: o.draw, ev: (1 - PFOLD) * evShow + PFOLD * (carry + q) };
    }
    if (a.t === "double") {
      const x = a.x | 0, R = V.dRange || { lo: 1, hi: 0 };
      if (x < 1 || R.hi < R.lo) return null;
      const ps = dblOdds(V, me, d), co = Math.max(q, 1 + x), bonus = Math.min(BONUS, Math.max(0, V.chips[opp] - Math.max(0, 1 + x - q)));
      return { kind: "double", side: -1, x, p: ps, ev: ps * (co + carry + bonus) - (1 - ps) * (1 + 2 * x) };
    }
    return null;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  // 이름 뒤 조사: '나' → 내가 · 받침 있으면 이 / 없으면 가
  const iga = s => { s = String(s); if (s === "나") return "내가"; const c = s.charCodeAt(s.length - 1); const bat = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "0136780".includes(s[s.length - 1]) && /[0-9]/.test(s[s.length - 1]); return s + (bat ? "이" : "가"); };
  const sgn = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
  const SIDE = ["앞면", "뒷면"];
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me;
    if (V.over) {
      const h = V.hist || [], won = h.filter(x => x.win === me).length, dblOk = h.filter(x => x.type === "dbl" && x.ok && x.win === me).length, df = V.chips[me] - V.chips[opp];
      return {
        opp: `승부가 끝났어요. ${nm(opp)}의 마지막 칩은 ${V.chips[opp]}개 (시작 ${V.start}개).`,
        mine: `내 칩 ${V.chips[me]} : 상대 ${V.chips[opp]} (시작 ${V.start}칩 대비 ${V.chips[me] >= V.start ? "+" : "−"}${Math.abs(V.chips[me] - V.start)})`,
        rec: V.ranks[me] === 0 && V.ranks[opp] === 0 ? "비겼어요 — 칩이 같아요" : V.ranks[me] === 0 ? "이겼어요! 한 판 더?" : "아쉬워요 — 상대 앞면과 내 뒷면을 먼저 비교해 보세요!",
        why: `${V.round}판 가운데 마지막 ${h.length}판은 내가 ${won}판 이겼고 양면베팅 성공은 ${dblOk}번이에요. 칩 차이는 ${df >= 0 ? "+" : "−"}${Math.abs(df)}개예요.`,
      };
    }
    if (V.phase !== "bet") {
      const r = V.res;
      let t = "다음 판을 준비해요.", why = `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} · 이월 판돈 ${V.carry}칩.`;
      if (r) {
        t = r.type === "fold" ? `${r.folder === me ? "내가" : iga(nm(opp))} 폴드${r.pen ? ` (양면베팅 폴드 페널티 ${r.pen}칩)` : ""}` : r.type === "dbl" ? `양면베팅 ${r.ok ? "성공" : "실패"} — ${nm(r.win)} 승` : r.type === "draw" ? "무승부 — 판돈 이월" : `${nm(r.win)} 승`;
        const cs = r.cards, cardTxt = i => (cs && cs[i] && r.side[i] >= 0 ? `${SIDE[r.side[i]]} ${cs[i][r.side[i]]}` : "");
        if (r.type === "fold") why = `폴드로 판돈 ${r.pot}칩이 ${r.win === me ? "내게" : nm(r.win) + "에게"} 갔어요${r.pen ? ` (+ 페널티 ${r.pen}칩)` : ""}. 칩은 나 ${V.chips[me]} : 상대 ${V.chips[opp]}.`;
        else if (r.type === "dbl" && cs) { const D = r.D, S = 1 - D; why = `양면베팅 ${D === me ? "내" : nm(D) + "의"} 앞 ${cs[D][0]} · 뒤 ${cs[D][1]} vs ${S === me ? "내" : nm(S) + "의"} ${cardTxt(S)} — ${r.ok ? "둘 다 커서 성공" : "한 면이 같거나 낮아 실패"}. 판돈 ${r.pot}칩${r.bonus ? ` + 보너스 ${r.bonus}칩` : ""}.`; }
        else if (cs) why = `내 ${cardTxt(me)} vs 상대 ${cardTxt(opp)} → ${r.type === "draw" ? `같아서 무승부, 판돈 ${r.pot}칩이 다음 판으로 이월돼요` : `${r.win === me ? "내가" : iga(nm(r.win))} 이겨 판돈 ${r.pot}칩을 가져가요`}. 칩은 나 ${V.chips[me]} : 상대 ${V.chips[opp]}.`;
      }
      return { opp: t, mine: `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]}${V.carry ? ` · 이월 판돈 ${V.carry}` : ""}`, rec: "결과를 보고 다음 판을 준비해요", why };
    }
    const fo = V.cards[opp].f, b = V.cards[me].b, tier = "hard";
    const evs = V.log.filter(e => e.k === "bet" && e.s === opp && e.i >= roundStart(V)); const last = evs[evs.length - 1];
    const d = oppFace(V, me, tier), side = bestSide(V, me, d), o = faceOdds(V, me, side, d), ps = dblOdds(V, me, d);
    const oppTxt = `${nm(opp)}의 앞면은 ${fo}(내가 보는 숫자)${V.ver === "b" ? ` → 뒷면은 ${fo % 2 ? "짝" : "홀"}수` : ""}. ` + (V.side[opp] >= 0 ? `${SIDE[V.side[opp]]}으로 ${V.side[opp] === 0 ? `승부 — 그 숫자는 ${fo}!` : "승부 — 숫자는 아직 몰라요."}` : "아직 면을 안 골랐어요.") + (last ? ` ${last.a === "double" ? `양면베팅 ${last.x}칩` : last.a === "raise" ? `${last.to}칩까지 베팅` : last.a === "check" ? "기본 1칩만 걸고 넘김" : "콜"}.` : "");
    const mineTxt = `내 뒷면 ${b}${V.ver === "b" ? ` (앞면은 ${b % 2 ? "짝" : "홀"}수)` : ""} · 칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} · 판돈 ${V.pot} · ${SIDE[side]}으로 가면 이길 확률 ${pc(o.win)} · 양면베팅 성공 확률 ${pc(ps)}`;
    let rec = "상대 차례를 기다려요", why = `상대 차례예요. 지금 ${SIDE[side]}으로 가면 이길 확률 ${pc(o.win)} (비길 확률 ${pc(o.draw)}) · 양면베팅 성공 확률 ${pc(ps)}이라서, 상대가 걸어 오면 이 숫자로 콜 · 폴드를 정해요.`;
    if (V.needs.includes(me)) {
      const pl = plan(V, me, "hard", () => 0.5), t = pl.a.t;
      rec = t === "fold" ? "폴드하기" : t === "call" ? (pl.need > 0 ? `콜 (${SIDE[pl.a.side]})` : V.chk ? `콜 · 바로 공개 (${SIDE[pl.a.side]})` : `넘기기 (${SIDE[pl.a.side]})`) : t === "double" ? `양면베팅 ${pl.a.x}칩` : `${SIDE[pl.side]}으로 ${pl.a.to}칩까지`;
      if (pl.why === "callDbl" || pl.why === "foldDbl") why = `상대 앞면 ${fo}${fo <= b ? "은 내 뒷면 이하라 양면베팅은 반드시 실패해요 — 콜!" : "보다 내 면이 낮을 수 있어요."} 양면베팅이 성공하면 10칩을 더 잃어요 (폴드해도 10칩). 내가 이길 확률 ${pc(pl.pf)}.`;
      else if (t === "double") why = `내 앞 · 뒤가 둘 다 상대 면보다 클 확률이 ${pc(ps)}예요. 성공하면 상대 칩 10개를 더 가져오고, 실패하면 건 칩(앞 · 뒤 합계)을 잃어요.`;
      else if (t === "fold") why = `${SIDE[pl.side]}으로 이길 확률이 ${pc(pl.o.win)}라 낮아요. 폴드는 낸 칩만 잃어요 (양면베팅 폴드가 아니면 페널티 없음).`;
      else if (t === "raise") why = `${SIDE[pl.side]}으로 이길 확률 ${pc(pl.o.win)} — 판돈을 키워요. 면은 한 번 고르면 못 바꿔요.`;
      else why = `${SIDE[pl.side]}으로 ${pc(pl.o.win)}라 공개해 볼 만해요.`;
      const ev = evalAct(V, me, pl.a, "hard");
      if (ev) why += ` (이 수의 기대 칩 ${sgn(ev.ev)}${t === "fold" ? "" : ` · 폴드는 ${sgn(evalAct(V, me, { t: "fold" }, "hard").ev)}`})`;
    }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-twoface", MAXR, BONUS, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, plan, evalAct, canRaise, capTotal, dblRange, oppFace, faceOdds, dblOdds, face };
});

/* 베니 서바이벌 · 수식 하이 로우 — 규칙 (결정적, Node · 브라우저 공용)
   카드 52장: 숫자 0~10 × 4색(금 > 은 > 동 > 흑) 44장 + √ 4장 + × 4장. 사람마다 + − ÷ 기호 한 장씩.
   한 판: 참가비 1칩 → 숨긴 숫자 1장 + 공개 2장 → 1차 베팅 → 공개 1장 → 식 만들기(하이 식 · 로우 식) → 2차 베팅 → 하이·로우·스윙 동시 선언 → 공개
   · 공개 카드로 √ 가 오면 숫자 1장 더 (√ 는 숫자 하나에 붙임) · × 가 오면 숫자 1장 더 (식에서 + − ÷ 하나 대신 × 를 꼭 씀)
   · 식: 숫자 4장 · 기호 3장을 모두 써서 한 줄로 (곱셈 · 나눗셈 먼저, 괄호 없음). 하이 = 20 에, 로우 = 1 에 가까울수록
   · 같으면: 하이는 가장 큰 숫자 카드, 로우는 가장 작은 숫자 카드로 (숫자 → 색)
   · 판돈: 하이 승자 · 로우 승자가 반씩 (홀수 칩은 하이). 스윙은 두 쪽 다 이겨야 다 가져가고, 못 이기면 빈손
   · 한 판에 거는 칩은 그 판에 남은 사람 중 가장 적은 칩까지 (나눠 갖는 판돈이 생기지 않게)
   · 식 시간: 방송은 90초, 넘으면 패 → 옵션 limit(기본 끔, 켜면 LIMIT 초): 화면이 시계를 재고 넘으면 {t:"eq", late:true} 를 대신 냄 → 그 판은 접은 것으로 침 (옛 기록은 limit 값이 없어 그대로 재생)
   우리 판 다듬기: 칩 20개(방송은 피스 1개 = 칩 5개로 바꿔 시작해 사람마다 시작 칩이 다름 — 우리는 피스 4개 = 칩 20개로 같게)로 5판(또는 8판) · 레이즈는 한 베팅에 3번까지 · ×를 받으면 버릴 기호는 식 만들 때 고름 (방송은 받자마자 버림) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).formula = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLORS = ["금", "은", "동", "흑"];
  const NUMS = 44, ROOT0 = 44, MUL0 = 48, DECK = 52;
  const START = 20, ANTE = 1, MAXRAISE = 3, LIMIT = 90;   // LIMIT: 옵션 limit 를 켰을 때 식 만드는 초 (시계는 화면이 재고, 넘으면 {t:"eq", late:true} 를 대신 냄)
  const isNum = c => c >= 0 && c < NUMS;
  const val = c => c % 11;
  const col = c => Math.floor(c / 11);
  const isRoot = c => c >= ROOT0 && c < MUL0;
  const isMul = c => c >= MUL0 && c < DECK;
  const cardName = c => isNum(c) ? `${COLORS[col(c)]}${val(c)}` : isRoot(c) ? "√" : "×";
  const OPN = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 식 계산 ───────────────────────────────────────────────
  const rootN = (v, k) => { let x = v; for (let j = 0; j < k; j++) x = Math.sqrt(x); return x; };
  function evalVals(vals, ops) {
    const terms = [vals[0]], signs = [];
    for (let k = 0; k < ops.length; k++) {
      const op = ops[k], x = vals[k + 1];
      if (op === "*") terms[terms.length - 1] *= x;
      else if (op === "/") { if (x === 0) return NaN; terms[terms.length - 1] /= x; }
      else { signs.push(op); terms.push(x); }
    }
    let v = terms[0];
    for (let k = 0; k < signs.length; k++) v = signs[k] === "+" ? v + terms[k + 1] : v - terms[k + 1];
    return v;
  }
  function evalEq(e) {
    if (!e) return NaN;
    return evalVals(e.n.map((c, k) => rootN(val(c), e.r[k] | 0)), e.o);
  }
  const fmt = v => !isFinite(v) ? "?" : Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString();
  function eqText(e) {
    if (!e) return "";
    let s = "";
    e.n.forEach((c, k) => { s += "√".repeat(e.r[k] | 0) + val(c); if (k < 3) s += ` ${OPN[e.o[k]]} `; });
    return s;
  }

  // 미리 만든 차례들
  const PERM4 = [];
  (function perm(a, rest) { if (!rest.length) { PERM4.push(a); return; } rest.forEach((x, i) => perm(a.concat(x), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  const OPS = [0, 1, 2, 3].map(m => {
    const out = new Set(), basics = ["+", "-", "/"];
    const choose = (start, need, acc) => {
      if (!need) {
        const ms = acc.concat(Array(m).fill("*"));
        (function perm(a, rest) { if (!rest.length) { out.add(a.join("")); return; } rest.forEach((x, i) => perm(a.concat(x), rest.filter((_, j) => j !== i))); })([], ms);
        return;
      }
      for (let i = start; i < 3; i++) choose(i + 1, need - 1, acc.concat(basics[i]));
    };
    choose(0, 3 - m, []);
    return [...out].map(s => s.split(""));
  });
  const ROOTS = [];
  for (let r = 0; r <= 4; r++) {
    const out = [];
    for (let a = 0; a <= r; a++) for (let b = 0; a + b <= r; b++) for (let c = 0; a + b + c <= r; c++) out.push([a, b, c, r - a - b - c]);
    ROOTS.push(out);
  }

  // 카드 4장 · × 수 · √ 수 → 하이 최선 · 로우 최선 (식까지)
  function search(cards, muls, roots, limit) {
    let bh = null, bl = null, n = 0;
    const ops = OPS[Math.min(3, muls)], rts = ROOTS[Math.min(4, roots)];
    for (const p of PERM4) {
      const cs = p.map(k => cards[k]);
      for (const rr of rts) {
        const vals = cs.map((c, k) => rootN(val(c), rr[k]));
        for (const o of ops) {
          const v = evalVals(vals, o);
          if (!isFinite(v)) continue;
          const dh = Math.abs(v - 20), dl = Math.abs(v - 1);
          if (!bh || dh < bh.d - 1e-12) bh = { d: dh, v, e: { n: cs, o, r: rr } };
          if (!bl || dl < bl.d - 1e-12) bl = { d: dl, v, e: { n: cs, o, r: rr } };
          if (limit && ++n >= limit) return { H: bh, L: bl };
        }
      }
    }
    return { H: bh, L: bl };
  }
  // 값만 (확률 계산용, 기억해 둠)
  const MEMO = new Map();
  function bestD(vs, muls, roots) {
    const key = vs.slice().sort((a, b) => a - b).join(",") + "|" + muls + "|" + roots;
    let r = MEMO.get(key);
    if (r) return r;
    const fake = vs.map(v => v);   // 숫자 값 → 아무 색 카드 id (값만 씀)
    const s = search(fake, muls, roots);
    r = { h: s.H ? s.H.d : 99, l: s.L ? s.L.d : 99 };
    if (MEMO.size > 20000) MEMO.clear();
    MEMO.set(key, r);
    return r;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n, rs: (seed >>> 0) || 1, R: Math.max(1, Math.min(12, (cfg && +cfg.rounds) || 5)), limit: cfg && +cfg.limit >= 1 ? LIMIT : 0, hand: 0, chips: Array(n).fill(START), dealer: 0, log: [], seq: 0, phase: "", over: false, res: null, H: [], deck: [] };
    st.dealer = Math.floor(rnd(st) * n);
    startHand(st);
    return st;
  }
  const alive = st => st.chips.map((c, i) => i).filter(i => st.chips[i] > 0 || (st.H[i] && !st.folded[i] && st.phase !== "show" && st.phase !== "end"));
  const live = st => st.H.map((h, i) => i).filter(i => st.H[i] && !st.folded[i]);
  function nextOf(st, from, ok) { for (let k = 1; k <= st.n; k++) { const i = (from + k) % st.n; if (ok(i)) return i; } return -1; }
  function drawNum(st) {
    for (let g = 0; g < 200; g++) {
      const c = st.deck.pop();
      if (isNum(c)) return c;
      st.deck.splice(Math.floor(rnd(st) * (st.deck.length + 1)), 0, c);
    }
    return st.deck.find(isNum);
  }
  function dealOpen(st, i) {
    const H = st.H[i];
    for (let g = 0; g < 60; g++) {
      const c = st.deck.pop();
      if (c === undefined) return;
      if (isNum(c)) { H.open.push(c); push(st, { k: "deal", s: i, c }); return; }
      if (isMul(c) && H.muls >= 3) { st.deck.splice(Math.floor(rnd(st) * (st.deck.length + 1)), 0, c); continue; }
      if (isRoot(c)) H.roots++; else H.muls++;
      H.sym.push(c); push(st, { k: "deal", s: i, c });
    }
  }
  function startHand(st) {
    const al = st.chips.map((c, i) => i).filter(i => st.chips[i] > 0);
    if (st.hand >= st.R || al.length < 2) { st.phase = "end"; st.over = true; st.turn = -1; push(st, { k: "end" }); return; }
    st.hand++;
    st.dealer = nextOf(st, st.dealer, i => st.chips[i] > 0);
    st.deck = shuffle(() => rnd(st), Array.from({ length: DECK }, (_, k) => k));
    st.H = Array(st.n).fill(null); st.folded = Array(st.n).fill(true); st.late = Array(st.n).fill(false);
    st.eqH = Array(st.n).fill(null); st.eqL = Array(st.n).fill(null); st.decl = Array(st.n).fill(null);
    st.pot = 0; st.res = null; st.bet = Array(st.n).fill(0); st.cur = 0;
    for (const i of al) { st.chips[i] -= ANTE; st.pot += ANTE; st.folded[i] = false; st.H[i] = { hid: drawNum(st), open: [], sym: [], muls: 0, roots: 0 }; }
    push(st, { k: "hand", h: st.hand, d: st.dealer });
    for (let r = 0; r < 2; r++) for (const i of al) dealOpen(st, i);
    startBet(st, 1);
  }
  function startBet(st, street) {
    st.phase = street === 1 ? "bet1" : "bet2";
    const L = live(st);
    if (L.length < 2) return foldWin(st);
    st.bet = Array(st.n).fill(0); st.cur = 0; st.raises = 0; st.acted = Array(st.n).fill(false);
    st.cap = Math.min(...L.map(i => st.chips[i]));
    st.turn = nextOf(st, st.dealer, i => st.H[i] && !st.folded[i]);
    if (st.cap <= 0) afterBet(st);
  }
  function afterBet(st) {
    st.turn = -1;
    if (st.phase === "bet1") { for (const i of live(st)) dealOpen(st, i); st.phase = "build"; }
    else { st.phase = "declare"; }
  }
  function foldWin(st) {
    const w = live(st)[0];
    st.chips[w] += st.pot;
    st.res = { fold: true, win: [w], gain: [[w, st.pot]], pot: st.pot };
    push(st, { k: "show", fold: true, w, pot: st.pot });
    st.pot = 0; st.phase = "show"; st.turn = -1;
  }
  function keyHi(cards) { let b = -1; for (const c of cards) { const k = val(c) * 4 + (3 - col(c)); if (k > b) b = k; } return b; }   // 클수록 좋음
  function keyLo(cards) { let b = 99; for (const c of cards) { const k = val(c) * 4 + col(c); if (k < b) b = k; } return b; }      // 작을수록 좋음
  function showdown(st) {
    const info = live(st).map(i => {
      const cards = [st.H[i].hid].concat(st.H[i].open);
      const vH = evalEq(st.eqH[i]), vL = evalEq(st.eqL[i]);
      return { i, d: st.decl[i], vH, vL, dH: isFinite(vH) ? Math.abs(vH - 20) : 1e9, dL: isFinite(vL) ? Math.abs(vL - 1) : 1e9, kH: keyHi(cards), kL: keyLo(cards) };
    });
    // 계산이 안 되는 식(숫자 0 네 장 같은 드문 손)은 그쪽 후보에서 뺌
    const bestH = xs => xs.filter(x => isFinite(x.vH)).sort((a, b) => (Math.abs(a.dH - b.dH) > 1e-9 ? a.dH - b.dH : b.kH - a.kH))[0] || null;
    const bestL = xs => xs.filter(x => isFinite(x.vL)).sort((a, b) => (Math.abs(a.dL - b.dL) > 1e-9 ? a.dL - b.dL : a.kL - b.kL))[0] || null;
    let pool = info.slice(), hw = null, lw = null;
    const busted = [];
    for (let g = 0; g < 10; g++) {
      hw = bestH(pool.filter(x => x.d !== "L")); lw = bestL(pool.filter(x => x.d !== "H"));
      const bad = pool.filter(x => x.d === "S" && (hw !== x || lw !== x));
      if (!bad.length) break;
      bad.forEach(x => busted.push(x.i));
      pool = pool.filter(x => !bad.includes(x));
    }
    const pot = st.pot, gain = [];
    if (!hw && !lw) {
      const L = info.map(x => x.i), each = Math.floor(pot / L.length);
      L.forEach((i, k) => gain.push([i, each + (k === 0 ? pot - each * L.length : 0)]));
    } else if (hw && lw && hw !== lw) { gain.push([hw.i, Math.ceil(pot / 2)], [lw.i, Math.floor(pot / 2)]); }
    else gain.push([(hw || lw).i, pot]);
    for (const [i, g] of gain) st.chips[i] += g;
    st.res = {
      fold: false, pot, gain, hi: hw ? hw.i : -1, lo: lw ? lw.i : -1, swingFail: busted,
      rows: info.map(x => ({ i: x.i, d: x.d, vH: x.vH, vL: x.vL, eH: eqText(st.eqH[x.i]), eL: eqText(st.eqL[x.i]) })),
    };
    push(st, { k: "show", hi: st.res.hi, lo: st.res.lo, pot });
    st.pot = 0; st.phase = "show"; st.turn = -1;
  }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "bet1" || st.phase === "bet2") return st.turn >= 0 ? [st.turn] : [];
    if (st.phase === "build") return live(st).filter(i => !st.eqH[i]);
    if (st.phase === "declare") return live(st).filter(i => !st.decl[i]);
    return [];
  }
  // 숫자 네 장이 모두 0 처럼 어떻게 놓아도 0 으로 나누게 되는 아주 드문 손: 이때만 계산 안 되는 식도 냄 (어느 쪽도 이길 수 없음)
  function fallbackEq(H) {
    const o = Array(H.muls).fill("*").concat(["+", "-", "/"].slice(0, 3 - H.muls)), r = [H.roots, 0, 0, 0];
    return { n: [H.hid].concat(H.open), o, r };
  }
  function bestEqs(H, limit, cards) {
    const all = [H.hid].concat(H.open);
    let s = search(cards || all, H.muls, H.roots, limit);
    if (!(s.H && s.L) && limit) s = search(all, H.muls, H.roots);   // 몇 가지만 보다 못 찾으면 전부 봄
    if (s.H && s.L) return { h: s.H.e, l: s.L.e, s };
    const f = fallbackEq(H); return { h: f, l: f, s: null };
  }
  function checkEq(H, e) {
    if (!e || !Array.isArray(e.n) || !Array.isArray(e.o) || !Array.isArray(e.r)) return "식이 비었어요";
    const nums = [H.hid].concat(H.open);
    if (e.n.length !== 4 || nums.length !== 4 || e.n.map(Number).sort((a, b) => a - b).join() !== nums.slice().sort((a, b) => a - b).join()) return "숫자 카드 4장을 한 번씩 모두 써야 해요";
    if (e.o.length !== 3 || e.o.some(o => !Object.prototype.hasOwnProperty.call(OPN, o))) return "기호 3개를 넣어야 해요";
    if (e.o.filter(o => o === "*").length !== H.muls) return "× 카드는 모두 써야 해요";
    const b = e.o.filter(o => o !== "*");
    if (new Set(b).size !== b.length) return "+ − ÷ 는 한 장씩뿐이에요";
    if (e.r.length !== 4 || e.r.some(x => !Number.isInteger(x) || x < 0) || e.r.reduce((a, x) => a + x, 0) !== H.roots) return "√ 카드를 모두 숫자에 붙여야 해요";
    if (!isFinite(evalEq(e)) && search(nums, H.muls, H.roots).H) return "0 으로는 나눌 수 없어요";
    return null;
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "bet1" || st.phase === "bet2") {
      const toCall = st.cur - st.bet[seat];
      const pay = x => { st.chips[seat] -= x; st.bet[seat] += x; st.pot += x; };
      if (a.t === "check") { if (toCall > 0) return { ok: false, err: "앞사람이 걸었어요 — 콜 · 레이즈 · 폴드 중에서" }; push(st, { k: "bet", s: seat, a: "check" }); }
      else if (a.t === "call") { if (toCall <= 0) return { ok: false, err: "걸린 칩이 없어요 — 체크하면 돼요" }; pay(toCall); push(st, { k: "bet", s: seat, a: "call", x: toCall }); }
      else if (a.t === "raise") {
        const to = a.to | 0;
        if (st.raises >= MAXRAISE) return { ok: false, err: "이번 베팅은 레이즈를 다 썼어요" };
        if (to <= st.cur || to > st.cap) return { ok: false, err: `${st.cur + 1}~${st.cap}칩까지만 걸 수 있어요` };
        pay(to - st.bet[seat]); st.cur = to; st.raises++;
        st.acted = st.acted.map((x, i) => i === seat ? x : false);
        push(st, { k: "bet", s: seat, a: "raise", to });
      } else if (a.t === "fold") { st.folded[seat] = true; push(st, { k: "bet", s: seat, a: "fold" }); }
      else return { ok: false, err: "모르는 행동이에요" };
      st.acted[seat] = true;
      if (live(st).length < 2) { foldWin(st); return { ok: true }; }
      const nx = nextOf(st, seat, i => st.H[i] && !st.folded[i] && (!st.acted[i] || st.bet[i] < st.cur));
      if (nx < 0) afterBet(st); else st.turn = nx;
      return { ok: true };
    }
    if (st.phase === "build") {
      if (a.t !== "eq") return { ok: false, err: "식을 만들어 주세요" };
      if (a.late) {   // 방송처럼 90초 안에 식을 못 냄 → 그 판은 패 (접은 것으로 침, 이미 건 칩은 판돈에 남음)
        if (!st.limit) return { ok: false, err: "이 판은 식 시간 제한이 없어요" };
        st.folded[seat] = true; st.late[seat] = true;
        push(st, { k: "late", s: seat });
        if (live(st).length < 2) { foldWin(st); return { ok: true }; }
        if (!needs(st).length) startBet(st, 2);
        return { ok: true };
      }
      const H = st.H[seat], e1 = checkEq(H, a.h), e2 = checkEq(H, a.l);
      if (e1) return { ok: false, err: "하이 식: " + e1 };
      if (e2) return { ok: false, err: "로우 식: " + e2 };
      const norm = e => ({ n: e.n.map(Number), o: e.o.slice(), r: e.r.map(Number) });
      st.eqH[seat] = norm(a.h); st.eqL[seat] = norm(a.l);
      push(st, { k: "built", s: seat });
      if (!needs(st).length) startBet(st, 2);
      return { ok: true };
    }
    if (st.phase === "declare") {
      if (a.t !== "decl" || !["H", "L", "S"].includes(a.d)) return { ok: false, err: "하이 · 로우 · 스윙 중에서 골라요" };
      st.decl[seat] = a.d;
      push(st, { k: "declared", s: seat });
      if (!needs(st).length) showdown(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  const auto = st => st.phase === "show" ? (st.res && st.res.fold ? 2200 : 4200) : null;
  function advance(st) { if (st.phase === "show") startHand(st); }
  const over = st => !!st.over;
  function ranks(st) { return st.chips.map(c => st.chips.filter(x => x > c).length); }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "bet1" || st.phase === "bet2") {
      const L = [{ t: "fold" }], toCall = st.cur - st.bet[seat];
      L.push(toCall > 0 ? { t: "call" } : { t: "check" });
      if (st.raises < MAXRAISE && st.cap > st.cur) L.push({ t: "raise", to: st.cur + 1 });
      return L;
    }
    if (st.phase === "build") { const b = bestEqs(st.H[seat]); return [{ t: "eq", h: b.h, l: b.l }]; }
    if (st.phase === "declare") return [{ t: "decl", d: "H" }, { t: "decl", d: "L" }];
    return [];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all";
    const reveal = st.phase === "show" && st.res && !st.res.fold;
    const sees = i => all || i === seat || (reveal && st.H[i] && !st.folded[i]);
    const hands = st.H.map((H, i) => H ? { hid: sees(i) ? H.hid : -1, open: H.open.slice(), sym: H.sym.slice(), muls: H.muls, roots: H.roots } : null);
    const pubObj = { h: st.hand, p: st.phase, c: st.chips, f: st.folded, pot: st.pot, b: st.bet, cur: st.cur, t: st.turn, o: hands.map(x => x && [x.open, x.sym]), bu: st.eqH.map(Boolean), de: st.decl.map(Boolean), r: st.res && st.res.gain, ov: st.over };
    return {
      n: st.n, R: st.R, limit: st.limit || 0, late: (st.late || []).slice(), hand: st.hand, phase: st.phase, chips: st.chips.slice(), folded: st.folded.slice(), pot: st.pot,
      bet: st.bet.slice(), cur: st.cur, cap: st.cap, raises: st.raises, maxRaise: MAXRAISE, turn: st.turn, dealer: st.dealer,
      hands, built: st.eqH.map(Boolean), declared: st.decl.map(Boolean),
      eqH: st.eqH.map((e, i) => (sees(i) ? e : null)), eqL: st.eqL.map((e, i) => (sees(i) ? e : null)), decl: st.decl.map((d, i) => (sees(i) ? d : null)),
      res: st.res, needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(),
      log: st.log.slice(-40), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 (보이는 것만) ─────────────────────────────────────
  // 남은 카드로 모자란 카드를 채워 여러 번 → 내가 하이 · 로우에서 이길 확률
  function chances(V, me, samples, r) {
    const seen = new Set();
    V.hands.forEach(h => { if (!h) return; h.open.forEach(c => seen.add(c)); h.sym.forEach(c => seen.add(c)); if (h.hid >= 0) seen.add(h.hid); });
    const pool = []; for (let c = 0; c < DECK; c++) if (!seen.has(c)) pool.push(c);
    const L = V.hands.map((h, i) => i).filter(i => V.hands[i] && !V.folded[i]);
    const more = V.phase === "bet1" ? 1 : 0;
    let wH = 0, wL = 0, wB = 0;
    const oppSide = {};
    for (let s = 0; s < samples; s++) {
      const deck = pool.slice(); let top = deck.length;
      const take = () => { const k = Math.floor(r() * top); const c = deck[k]; deck[k] = deck[--top]; return c; };
      const takeNum = () => { for (let g = 0; g < 40; g++) { const c = take(); if (isNum(c)) return c; } return 5; };
      let myH = 99, myL = 99, oH = 99, oL = 99;
      for (const i of L) {
        const h = V.hands[i]; const vs = h.open.map(val); let mu = h.muls, ro = h.roots;
        vs.push(val(h.hid >= 0 ? h.hid : takeNum()));
        for (let m = 0; m < more; m++) { for (let g = 0; g < 10; g++) { const c = take(); if (isNum(c)) { vs.push(val(c)); break; } if (isRoot(c)) ro++; else if (mu < 3) mu++; } }
        while (vs.length < 4) vs.push(val(takeNum()));
        const d = bestD(vs.slice(0, 4), mu, Math.min(4, ro));
        if (i === me) { myH = d.h; myL = d.l; }
        else { oH = Math.min(oH, d.h); oL = Math.min(oL, d.l); const o = oppSide[i] || (oppSide[i] = { h: 0, l: 0 }); if (d.h < d.l * 6) o.h++; else o.l++; }
      }
      const h = myH < oH - 1e-9 || (Math.abs(myH - oH) < 1e-9 && r() < 0.5), l = myL < oL - 1e-9 || (Math.abs(myL - oL) < 1e-9 && r() < 0.5);
      if (h) wH++; if (l) wL++; if (h && l) wB++;
    }
    const lean = {}; for (const i in oppSide) lean[i] = oppSide[i].h >= oppSide[i].l ? "H" : "L";
    return { pH: wH / samples, pL: wL / samples, pB: wB / samples, lean };
  }
  function myBest(V, me) {
    const h = V.hands[me]; if (!h || h.hid < 0) return null;
    const cards = [h.hid].concat(h.open);
    if (cards.length < 4) {
      // 아직 3장 — 지금 카드로 '한 장 더 오면' 대신 지금까지만 보여 줌 (가장 흔한 5 로 채워 봄)
      return null;
    }
    const s = search(cards, h.muls, h.roots);
    return s.H && s.L ? s : null;
  }
  const SAMPLES = { easy: 24, normal: 70, hard: 180 };
  // 베팅 판단: 이길 확률 → 판돈 기대값과 콜 값 비교
  function betPlan(V, me, tier, r) {
    const c = chances(V, me, SAMPLES[tier] || 70, r);
    const toCall = V.cur - V.bet[me];
    const others = V.hands.filter((h, i) => h && !V.folded[i] && i !== me).length;
    const half = others >= 1 ? 0.5 : 1;
    const eq = Math.min(1, Math.max(c.pH, c.pL) * half + c.pB * half);   // 판돈 중 내 몫 기대 비율
    const potAfter = V.pot + toCall;
    const need = toCall > 0 ? toCall / (potAfter + toCall * 0) : 0;   // 내 몫 비율이 이만큼은 돼야 본전
    let a;
    const canRaise = V.raises < V.maxRaise && V.cap > V.cur;
    const roomBig = Math.min(V.cap, V.cur + Math.max(2, Math.round(V.pot / 2)));
    if (eq * potAfter < toCall * 0.85 && toCall > 0) a = { t: "fold" };
    else if (canRaise && eq > (tier === "hard" ? 0.42 : 0.5)) a = { t: "raise", to: eq > 0.6 ? roomBig : Math.min(V.cap, V.cur + 1) };
    else a = toCall > 0 ? { t: "call" } : { t: "check" };
    return { a, eq, need, c, toCall };
  }
  function ai(V, me, tier, r) {
    if (V.phase === "bet1" || V.phase === "bet2") {
      const p = betPlan(V, me, tier, r);
      let a = p.a;
      if (tier === "easy") {
        if (a.t === "fold" && r() < 0.5) a = { t: "call" };
        if (a.t === "raise" && r() < 0.5) a = V.cur > V.bet[me] ? { t: "call" } : { t: "check" };
        if (a.t === "raise") a = { t: "raise", to: Math.min(V.cap, V.cur + 1) };
      }
      if (tier === "hard" && a.t === "check" && V.raises < V.maxRaise && V.cap > V.cur && r() < 0.1) a = { t: "raise", to: Math.min(V.cap, V.cur + 1) };   // 가끔 허세
      return a;
    }
    if (V.phase === "build") {
      const h = V.hands[me], cards = [h.hid].concat(h.open);
      if (tier === "easy") {
        // 몇 가지만 시도
        const b = bestEqs(h, 12, shuffle(r, cards.slice()));
        return { t: "eq", h: b.h, l: b.l };
      }
      const b = bestEqs(h, 0, cards);
      return { t: "eq", h: b.h, l: b.l };
    }
    if (V.phase === "declare") {
      const c = chances(V, me, SAMPLES[tier] || 70, r);
      if (tier !== "easy" && c.pB > (tier === "hard" ? 0.8 : 0.9)) return { t: "decl", d: "S" };
      if (tier === "easy") return { t: "decl", d: r() < 0.25 ? (r() < 0.5 ? "H" : "L") : (c.pH >= c.pL ? "H" : "L") };
      // 고급: 상대가 많이 노리는 쪽은 피함
      let pH = c.pH, pL = c.pL;
      if (tier === "hard") { const ls = Object.values(c.lean); const nh = ls.filter(x => x === "H").length, nl = ls.length - nh; pH *= nh > nl ? 0.9 : 1.05; pL *= nl > nh ? 0.9 : 1.05; }
      return { t: "decl", d: pH >= pL ? "H" : "L" };
    }
    return null;
  }

  // ── AI 선생님 (보이는 것만 읽음) ────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    const r = (() => { let a = 12345 + V.hand * 31 + me; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    if (V.over) return { opp: "판이 끝났어요.", mine: `내 칩 ${V.chips[me]}개 · ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" };
    if (!V.hands[me]) return { opp: "이번 판은 칩이 없어 쉬어요.", mine: `칩 ${V.chips[me]}개`, rec: "구경하며 상대 버릇을 봐 두세요.", why: "" };
    // 👀 상대 흐름
    const evs = V.log.filter(e => e.i > since && e.s !== me && (e.k === "bet"));
    const lean = chances(V, me, 40, r).lean;
    const leanTxt = i => {
      const h = V.hands[i]; if (!h) return "";
      const big = h.open.filter(c => val(c) >= 7).length, small = h.open.filter(c => val(c) <= 2).length;
      const side = lean[i] === "H" ? "하이(20)" : "로우(1)";
      return `공개 ${h.open.map(c => val(c)).join("·")}${h.sym.length ? " " + h.sym.map(cardName).join("") : ""} → ${side} 쪽이 쉬워 보여요${big >= 2 ? " (큰 수가 많음)" : small >= 2 ? " (작은 수가 많음)" : ""}`;
    };
    let opp;
    if (evs.length) {
      const said = evs.slice(-4).map(e => `${nm(e.s)} ${e.a === "raise" ? `레이즈(${e.to}칩까지)` : e.a === "call" ? "콜" : e.a === "check" ? "체크" : "폴드"}`);
      const raiser = [...evs].reverse().find(e => e.a === "raise");
      opp = said.join(" · ") + (raiser ? ` — ${nm(raiser.s)}: ${leanTxt(raiser.s)}` : "");
    } else {
      const others = V.hands.map((h, i) => i).filter(i => i !== me && V.hands[i] && !V.folded[i]);
      opp = others.length ? others.slice(0, 2).map(i => `${nm(i)}: ${leanTxt(i)}`).join(" / ") : "남은 상대가 없어요.";
    }
    // 📊 내 흐름
    const h = V.hands[me], b = h.open.length >= 3 ? myBest(V, me) : null;
    const c = chances(V, me, 90, r);
    const startChips = V.log.filter(e => e.k === "hand").length;
    let mine = `칩 ${V.chips[me]}개 · 판돈 ${V.pot} · `;
    if (b) mine += `내 최선: 하이 ${fmt(b.H.v)}(20까지 ${fmt(b.H.d)}) · 로우 ${fmt(b.L.v)}(1까지 ${fmt(b.L.d)}) → `;
    mine += `이길 확률 하이 ${pc(c.pH)} · 로우 ${pc(c.pL)}`;
    void startChips;
    // 💡 추천 + 👉 의미
    let rec = "상대 차례를 기다려요", why = "";
    const myTurn = V.needs.includes(me);
    if (V.phase === "bet1" || V.phase === "bet2") {
      if (myTurn) {
        const p = betPlan(V, me, "hard", r);
        const t = p.a.t;
        rec = t === "fold" ? "폴드" : t === "call" ? `콜 (${p.toCall}칩)` : t === "check" ? "체크" : `레이즈 → ${p.a.to}칩까지`;
        const share = Math.round(p.eq * 100);
        if (t === "fold") why = `콜에 ${p.toCall}칩인데 이 판돈에서 기대 몫이 ${share}% 쯤이라 손해가 커요 — 상대가 센 쪽을 노리는 것 같아요.`;
        else if (t === "raise") why = `내 쪽이 앞서요 (기대 몫 ${share}%). 판돈을 키우면 따라오는 상대에게서 더 받아요.`;
        else if (t === "call") why = `${p.toCall}칩으로 판돈 ${V.pot + p.toCall}칩을 노려요 — 기대 몫 ${share}% 면 따라갈 만해요.`;
        else why = `걸 만큼 앞서지는 않아요 (기대 몫 ${share}%). 공짜로 다음 카드를 봐요.`;
      } else rec = "상대 베팅을 기다려요 — 누가 레이즈하는지 보세요";
    } else if (V.phase === "build") {
      if (myTurn && b) { rec = `하이 식 ${eqText(b.H.e)} = ${fmt(b.H.v)} · 로우 식 ${eqText(b.L.e)} = ${fmt(b.L.v)}`; why = "곱셈 · 나눗셈이 먼저 계산돼요. 큰 수끼리 곱하고 빼거나, 같은 수로 나눠 1 을 만들면 좋아요."; }
      else rec = "다른 사람이 식을 만드는 중이에요";
    } else if (V.phase === "declare") {
      if (myTurn) {
        const d = c.pB > 0.85 ? "S" : c.pH >= c.pL ? "H" : "L";
        rec = d === "S" ? "↕ 스윙 (둘 다)" : d === "H" ? "🔼 하이" : "🔽 로우";
        why = d === "S" ? "두 쪽 다 이길 확률이 높아 판돈을 다 노려요. 하나라도 지면 빈손이에요." : `${d === "H" ? "하이" : "로우"} 쪽 확률(${pc(d === "H" ? c.pH : c.pL)})이 더 높아요. 다른 사람이 많이 노리는 쪽을 피하면 반은 챙겨요.`;
      } else rec = "다른 사람의 선언을 기다려요";
    } else if (V.phase === "show") {
      rec = "결과를 보고 다음 판을 준비해요";
      if (V.res && !V.res.fold) why = `하이 ${V.res.hi >= 0 ? nm(V.res.hi) : "없음"} · 로우 ${V.res.lo >= 0 ? nm(V.res.lo) : "없음"}`;
    }
    return { opp, mine, rec, why };
  }

  return {
    id: "formula", COLORS, START, ANTE, MAXRAISE, LIMIT, isNum, isRoot, isMul, val, col, cardName, OPN,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach,
    evalEq, eqText, checkEq, search, chances, fmt, keyHi, keyLo,
  };
});

/* 베니 서바이벌 · 피라미드 넘버 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌X · 피라미드 넘버 (9일차 파이널 1라운드, 웨이브 공식 하이라이트 영상의 화면 설명을 읽고 우리 말로 옮김)
   · 10라운드. 라운드마다 연산용 숫자 3개와 피라미드 모양으로 놓인 목표 숫자 14개가 공개됨 (4층 2개 · 3층 3개 · 2층 4개 · 1층 5개).
   · 연산용 숫자 3개를 반드시 모두(한 번씩) 써서 목표 숫자 중 하나를 만드는 수식을 만들어야 함. 라운드마다 만들 수 있는 목표 숫자의 개수는 정해져 있지 않고, 하나도 없을 수 있음.
   · 수식을 만든 사람은 '정답 선언' → 5초 안에 수식을 공개해야 하고, 오답이면 −1점.
     정답이면 상대에게 30초 동안 더 높은 층의 목표 숫자에 도전할 기회 (이 시간에는 틀려도 감점 없음). 성공하면 다시 상대(처음 사람)에게 30초 — 이렇게 이어서 가장 높은 층을 만든 사람이 그 라운드 승자,
     승점은 마지막으로 완성한 목표 숫자의 '층 수' (1층 = 1점 … 4층 = 4점).
   · 아무도 정답 선언을 하지 않은 상태에서 '불가능 선언' 가능 → 상대에게 1분. 그 안에 아무 목표도 못 만들면 선언한 사람 +5점. 만들면 선언한 사람 −3점, 만든 사람은 그 목표의 층 점수.
   · 10라운드 뒤 승점이 높은 쪽이 최종 승.
   방송과 다른 점 (원문에 없거나 우리 화면에 맞추려 정한 것 — 화면 '방송과 다른 점' 한 줄로도 알림):
     ① 방송은 둘이 동시에 푸는 순발력 싸움. 우리는 라운드마다 '먼저 답할 차례'를 번갈아 줌 (공용 껍데기가 AI 를 0.6~1.1 초 뒤 움직이게 해서 먼저 외치기는 사람이 못 이김).
        먼저 차례가 정답 선언 · 넘기기 · 불가능 선언 중 하나. 넘기면 상대가 같은 선택, 둘 다 넘기면 그 라운드는 점수 없이 끝.
     ② '30초 · 1분 · 5초' 대신 화면 시계(30초 · 1분)가 끝나면 넘기기를 대신 눌러 줌 (규칙은 시계 없이 결정적), 도전 중 틀린 시도는 4번까지.
     ③ 쓸 수 있는 기호는 영상에서 다 확인하지 못함(루트 · 제곱이 나옴) → + − × ÷ 와 제곱(²) · 세제곱(³) · 루트(√ — 제곱수일 때만)를 '식 전체에서 한 번까지'로 정함.
        중간 값은 분수여도 되고, 목표와 같은 정수가 되면 정답. 0으로 나누기는 안 됨.
     ④ 목표 숫자는 1~60, 연산용 숫자는 1~9 중 서로 다른 3개. 만들 수 있는 목표 수는 라운드마다 0~9개 (높은 층일수록 만들기 어려운 것이 오게 함).
     ⑤ 10라운드 뒤 점수가 같으면 공동 1등. 5라운드 옵션 있음.
   숨은 정보: 없음 (연산용 숫자 · 목표 숫자 · 모든 선언은 둘에게 공개). 정답 목록(만들 수 있는 목표와 수식)은 라운드가 끝나기 전엔 view 에 안 실림. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).pyramid = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const FLOORS = [4, 3, 2, 1], WIDTH = { 4: 2, 3: 3, 2: 4, 1: 5 }, NT = 14, LO = 1, HI = 60, OPLO = 1, OPHI = 9;
  const ROUND_OPTS = [5, 10], WRONG_MAX = 4, IMP_WIN = 5, IMP_LOSE = 3, WRONG_PEN = 1, UMAX = 1;
  const SLOTS = [4, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1];
  const BOP = { "+": 1, "-": 1.1, "*": 1.2, "/": 1.8 }, UOP = { s: 1.5, c: 2.0, r: 2.2 };
  const SYM = { "+": "+", "-": "−", "*": "×", "/": "÷", s: "²", c: "³", r: "√" };
  const CAPN = 20000, CAPD = 400;

  // ── 분수 계산 (정확히) ──
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  function mk(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; n /= g; d /= g; if (Math.abs(n) > CAPN || d > CAPD) return null; return [n, d]; }
  function bin(o, a, b) {
    if (o === "+") return mk(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
    if (o === "-") return mk(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
    if (o === "*") return mk(a[0] * b[0], a[1] * b[1]);
    if (b[0] === 0) return null;
    return mk(a[0] * b[1], a[1] * b[0]);
  }
  const isq = x => { if (x < 0) return -1; const r = Math.round(Math.sqrt(x)); return r * r === x ? r : -1; };
  function un(o, a) {
    if (o === "s") return mk(a[0] * a[0], a[1] * a[1]);
    if (o === "c") return mk(a[0] * a[0] * a[0], a[1] * a[1] * a[1]);
    const p = isq(a[0]), q = isq(a[1]); if (p < 0 || q < 0) return null; return mk(p, q);
  }
  const fstr = v => (v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`);

  // ── 수식 = 역폴란드식(RPN) 토큰: "0" "1" "2" (연산용 숫자 순서) · + - * / (두 값) · s c r (한 값: 제곱 · 세제곱 · 루트) ──
  const isNum = t => t === "0" || t === "1" || t === "2";
  function evalRpn(rpn, ops, part) {          // part = true 면 숫자 셋을 다 안 써도 됨 (화면에서 만드는 중인 조각)
    if (!Array.isArray(rpn) || rpn.length < (part ? 1 : 5) || rpn.length > 14) return { ok: false, err: "수식이 이상해요" };
    const used = [false, false, false], stk = []; let u = 0;
    for (const t of rpn) {
      if (isNum(t)) { const i = +t; if (used[i]) return { ok: false, err: "연산용 숫자는 한 번씩만 써요" }; used[i] = true; stk.push([ops[i], 1]); continue; }
      if (t === "+" || t === "-" || t === "*" || t === "/") {
        if (stk.length < 2) return { ok: false, err: "수식이 이상해요" };
        const b = stk.pop(), a = stk.pop(); if (t === "/" && b[0] === 0) return { ok: false, err: "0으로는 나눌 수 없어요" };
        const v = bin(t, a, b); if (!v) return { ok: false, err: "값이 너무 커요" }; stk.push(v); continue;
      }
      if (t === "s" || t === "c" || t === "r") {
        if (!stk.length) return { ok: false, err: "수식이 이상해요" };
        if (++u > UMAX) return { ok: false, err: "제곱 · 세제곱 · 루트는 식 전체에서 한 번만 써요" };
        const a = stk.pop(), v = un(t, a); if (!v) return { ok: false, err: t === "r" ? "루트는 제곱수에만 쓸 수 있어요" : "값이 너무 커요" }; stk.push(v); continue;
      }
      return { ok: false, err: "쓸 수 없는 기호예요" };
    }
    if (stk.length !== 1 || (!part && !used.every(Boolean))) return { ok: false, err: "연산용 숫자 세 개를 모두 써야 해요" };
    return { ok: true, v: stk[0] };
  }
  // RPN → 보통 식 (괄호는 필요한 만큼만)
  function infix(rpn, ops) {
    const stk = [];
    for (const t of rpn) {
      if (isNum(t)) { stk.push({ s: String(ops[+t]), p: 4 }); continue; }
      if (t === "s" || t === "c") { const a = stk.pop(); stk.push({ s: (a.p < 4 ? `(${a.s})` : a.s) + SYM[t], p: 3 }); continue; }
      if (t === "r") { const a = stk.pop(); stk.push({ s: "√" + (a.p < 4 ? `(${a.s})` : a.s), p: 3 }); continue; }
      const b = stk.pop(), a = stk.pop(), p = t === "+" || t === "-" ? 1 : 2;
      const l = a.p < p ? `(${a.s})` : a.s;
      const r = (t === "+" ? b.p < 1 : t === "-" ? b.p <= 1 : t === "*" ? b.p < 2 : b.p <= 2) ? `(${b.s})` : b.s;
      stk.push({ s: `${l} ${SYM[t]} ${r}`, p });
    }
    return stk.length ? stk[0].s : "";
  }

  // ── 연산용 숫자 3개로 만들 수 있는 모든 값 (가장 쉬운 식 하나씩) ──
  const ECACHE = {};
  function enumerate(ops) {
    const ck = ops.join(",");
    if (ECACHE[ck]) return ECACHE[ck];
    const V = []; for (let m = 1; m < 8; m++) V[m] = new Map();
    const put = (map, v, u, cost, rpn) => { const k = v[0] + "/" + v[1] + "|" + u; const cur = map.get(k); if (!cur || cur.cost > cost) map.set(k, { v, u, cost, rpn }); };
    const clos = map => {
      for (let it = 0; it < UMAX; it++) for (const e of [...map.values()]) {
        if (e.u !== it || e.v[0] === 0 || (e.v[0] === 1 && e.v[1] === 1)) continue;
        for (const o of "scr") { const v = un(o, e.v); if (v) put(map, v, e.u + 1, e.cost + UOP[o], e.rpn.concat(o)); }
      }
    };
    for (let i = 0; i < 3; i++) { put(V[1 << i], [ops[i], 1], 0, 0, [String(i)]); clos(V[1 << i]); }
    for (const m of [3, 5, 6, 7]) {
      for (let a = (m - 1) & m; a > 0; a = (a - 1) & m) {
        const b = m ^ a; if (a > b) continue;
        for (const x of V[a].values()) for (const y of V[b].values()) {
          if (x.u + y.u > UMAX) continue;
          for (const [p, q] of [[x, y], [y, x]]) for (const o in BOP) {
            if ((o === "+" || o === "*") && p === y) continue;
            const v = bin(o, p.v, q.v); if (v) put(V[m], v, x.u + y.u, p.cost + q.cost + BOP[o], p.rpn.concat(q.rpn, o));
          }
        }
      }
      clos(V[m]);
    }
    const out = new Map();
    for (const e of V[7].values()) if (e.v[1] === 1 && e.v[0] >= LO && e.v[0] <= HI) { const c = out.get(e.v[0]); if (!c || c.cost > e.cost) out.set(e.v[0], { cost: e.cost, rpn: e.rpn }); }
    return (ECACHE[ck] = out);          // 정수 값 → { cost, rpn }
  }
  const diffOf = cost => (cost < 3.1 ? 0 : cost < 4.05 ? 1 : 2);   // 0 쉬움 · 1 보통 · 2 어려움

  // ── 난수 · 도우미 ──
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function rand(st) { const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0); let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const int = (st, n) => Math.floor(rand(st) * n);
  function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = int(st, i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ── 라운드 만들기: 연산용 숫자 3개 + 목표 14개 (만들 수 있는 것 k개, 어려운 것이 높은 층) ──
  function pickK(st, nR, nU) {
    const r = rand(st);
    let k = r < 0.12 ? 0 : r < 0.52 ? 1 + int(st, 3) : r < 0.82 ? 4 + int(st, 3) : 7 + int(st, 3);
    k = Math.max(k, NT - nU); k = Math.min(k, nR, NT);
    return k;
  }
  function makeRound(st) {
    const pool = []; for (let x = OPLO; x <= OPHI; x++) pool.push(x);
    const ops = shuffle(st, pool).slice(0, 3).sort((a, b) => a - b);
    const E = enumerate(ops), R = [], U = [];
    for (let v = LO; v <= HI; v++) (E.has(v) ? R : U).push(v);
    const k = pickK(st, R.length, U.length);
    const reach = shuffle(st, R.slice()).slice(0, k).sort((a, b) => E.get(b).cost - E.get(a).cost || a - b);   // 어려운 것 먼저
    const decoy = shuffle(st, U.slice()).slice(0, NT - k);
    const slotIdx = shuffle(st, SLOTS.map((_, i) => i)), mine = slotIdx.slice(0, k).map(i => SLOTS[i]).sort((a, b) => b - a);
    const floors = {}; FLOORS.forEach(f => { floors[f] = []; });
    reach.forEach((v, i) => floors[mine[i]].push(v));
    // 만들 수 있는 것이 몰린 층 말고 남은 자리는 못 만드는 숫자로 채움
    const left = {}; FLOORS.forEach(f => { left[f] = WIDTH[f] - floors[f].length; });
    let di = 0; for (const f of FLOORS) for (let j = 0; j < left[f]; j++) floors[f].push(decoy[di++]);
    const rows = FLOORS.map(f => shuffle(st, floors[f]));
    const sol = {}; reach.forEach(v => { const f = FLOORS.find(x => floors[x].includes(v)); sol[v] = { f, cost: E.get(v).cost, rpn: E.get(v).rpn.slice() }; });
    return { ops, rows, sol };
  }
  const floorOf = (rows, v) => { for (let i = 0; i < rows.length; i++) if (rows[i].includes(v)) return FLOORS[i]; return 0; };

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const rounds = ROUND_OPTS.includes(+(cfg && cfg.rounds)) ? +cfg.rounds : 10;
    const st = { n: 2, rs: (seed >>> 0) || 1, rounds, round: 0, first: 0, phase: "open", ops: [], rows: [], sol: {}, hold: 0, step: 0, lead: -1, floor: 0, chal: -1, decl: -1, tries: 0, trace: [], rd: [0, 0], pts: [0, 0], hist: [], res: null, over: false, log: [], seq: 0 };
    st.first = int(st, 2);
    startRound(st);
    return st;
  }
  function startRound(st) {
    const r = makeRound(st);
    st.ops = r.ops; st.rows = r.rows; st.sol = r.sol;
    st.phase = "open"; st.hold = (st.first + st.round) % 2; st.step = 0; st.lead = -1; st.floor = 0; st.chal = -1; st.decl = -1; st.tries = 0; st.trace = []; st.rd = [0, 0]; st.res = null;
    push(st, { k: "round", r: st.round + 1, s: st.hold });
  }
  const needs = st => (st.over ? [] : st.phase === "open" ? [st.hold] : st.phase === "raise" ? [st.chal] : st.phase === "imp" ? [1 - st.decl] : []);
  function revealSol(st) { return Object.keys(st.sol).map(Number).sort((a, b) => st.sol[b].f - st.sol[a].f || st.sol[a].cost - st.sol[b].cost).map(v => ({ v, f: st.sol[v].f, rpn: st.sol[v].rpn.slice() })); }
  function finish(st, kind, win, add) {
    // add = [점수 변화 0번 · 1번] 중 이 단계에서 아직 안 더한 것
    st.pts[0] += add[0]; st.pts[1] += add[1]; st.rd[0] += add[0]; st.rd[1] += add[1];
    const rec = { no: st.round + 1, first: (st.first + st.round) % 2, kind, win, decl: st.decl, f: kind === "raise" ? st.floor : kind === "imp" && win >= 0 && win !== st.decl ? st.floor : 0, d: st.rd.slice(), pts: st.pts.slice(), trace: st.trace.map(t => Object.assign({}, t, t.rpn ? { rpn: t.rpn.slice() } : {})), sol: revealSol(st), ops: st.ops.slice(), rows: st.rows.map(r => r.slice()) };
    st.hist.push(rec); st.res = rec; st.phase = "show"; st.hold = -1; st.chal = -1;
    push(st, { k: "result", q: rec.no, w: win, kind, d: st.rd.slice() });
  }
  function noteAns(st, seat, v, f, rpn, ok) { st.trace.push({ s: seat, k: ok ? "ok" : "bad", v, f, rpn: rpn.slice() }); push(st, { k: ok ? "ok" : "bad", s: seat, v, f }); }
  function apply(st, seat, a) {
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    let ev = null, tv = null, f = 0;
    if (a.t === "ans") {
      ev = evalRpn(a.rpn, st.ops); if (!ev.ok) return ev;
      tv = ev.v[1] === 1 ? ev.v[0] : null;
      if (a.tv != null && a.tv !== tv) return { ok: false, err: "식의 값이 달라요" };
      f = tv != null ? floorOf(st.rows, tv) : 0;
    } else if (a.t !== "pass" && !(a.t === "imp" && st.phase === "open")) return { ok: false, err: "그렇게는 못 해요" };
    const other = 1 - seat;
    if (st.phase === "open") {
      if (a.t === "pass") { st.trace.push({ s: seat, k: "pass" }); push(st, { k: "pass", s: seat }); if (st.step === 0) { st.step = 1; st.hold = other; push(st, { k: "turn", s: other }); } else finish(st, "none", -1, [0, 0]); return { ok: true }; }
      if (a.t === "imp") { st.trace.push({ s: seat, k: "imp" }); push(st, { k: "imp", s: seat }); st.phase = "imp"; st.decl = seat; st.tries = 0; st.hold = -1; return { ok: true }; }
      noteAns(st, seat, tv != null ? tv : fstr(ev.v), f, a.rpn, f > 0);
      if (f > 0) {
        st.lead = seat; st.floor = f; st.tries = 0;
        if (f === 4) { finish(st, "raise", seat, seat === 0 ? [f, 0] : [0, f]); return { ok: true }; }
        st.phase = "raise"; st.chal = other; st.hold = -1; push(st, { k: "turn", s: other }); return { ok: true };
      }
      // 틀린 선언: −1점, 상대 차례 (이미 상대 차례였다면 점수 없이 끝)
      const pen = seat === 0 ? [-WRONG_PEN, 0] : [0, -WRONG_PEN]; st.pts[0] += pen[0]; st.pts[1] += pen[1]; st.rd[0] += pen[0]; st.rd[1] += pen[1];
      if (st.step === 0) { st.step = 1; st.hold = other; push(st, { k: "turn", s: other }); } else finish(st, "none", -1, [0, 0]);
      return { ok: true };
    }
    if (st.phase === "raise") {
      if (a.t === "pass") { st.trace.push({ s: seat, k: "pass" }); push(st, { k: "pass", s: seat }); finish(st, "raise", st.lead, st.lead === 0 ? [st.floor, 0] : [0, st.floor]); return { ok: true }; }
      const good = f > st.floor;
      noteAns(st, seat, tv != null ? tv : fstr(ev.v), f, a.rpn, good);
      if (good) {
        st.lead = seat; st.floor = f; st.tries = 0;
        if (f === 4) { finish(st, "raise", seat, seat === 0 ? [f, 0] : [0, f]); return { ok: true }; }
        st.chal = other; push(st, { k: "turn", s: other }); return { ok: true };
      }
      if (++st.tries >= WRONG_MAX) finish(st, "raise", st.lead, st.lead === 0 ? [st.floor, 0] : [0, st.floor]);
      return { ok: true };
    }
    // 불가능 선언 뒤: seat = 도전하는 쪽
    const d = st.decl;
    if (a.t === "pass") { st.trace.push({ s: seat, k: "pass" }); push(st, { k: "pass", s: seat }); finish(st, "imp", d, d === 0 ? [IMP_WIN, 0] : [0, IMP_WIN]); return { ok: true }; }
    if (f > 0) {
      noteAns(st, seat, tv, f, a.rpn, true);
      st.floor = f; st.lead = seat;
      const add = [0, 0]; add[d] = -IMP_LOSE; add[seat] = f;
      finish(st, "imp", seat, add);
      return { ok: true };
    }
    noteAns(st, seat, tv != null ? tv : fstr(ev.v), 0, a.rpn, false);
    if (++st.tries >= WRONG_MAX) finish(st, "imp", d, d === 0 ? [IMP_WIN, 0] : [0, IMP_WIN]);
    return { ok: true };
  }
  const auto = st => (st.phase === "show" && !st.over ? 3600 : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    st.round++;
    if (st.round >= st.rounds) { st.over = true; st.phase = "end"; push(st, { k: "end" }); return; }
    startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => st.pts.map(p => st.pts.filter(x => x > p).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    return st.phase === "open" ? [{ t: "pass" }, { t: "imp" }] : [{ t: "pass" }];
  }

  // ── 보이는 것 (숨은 것 없음. 정답 목록은 라운드가 끝난 뒤에만) ──
  function view(st, seat) {
    const hist = st.hist.map(h => ({ no: h.no, first: h.first, kind: h.kind, win: h.win, decl: h.decl, f: h.f, d: h.d.slice(), pts: h.pts.slice(), trace: h.trace.map(t => Object.assign({}, t, t.rpn ? { rpn: t.rpn.slice() } : {})), sol: h.sol.map(s => ({ v: s.v, f: s.f, rpn: s.rpn.slice() })), ops: h.ops.slice(), rows: h.rows.map(r => r.slice()) }));
    const pubObj = { r: st.round, p: st.phase, o: st.ops, w: st.rows, h: st.hold, sp: st.step, l: st.lead, f: st.floor, c: st.chal, d: st.decl, t: st.tries, tr: st.trace.map(t => [t.s, t.k, t.v, t.f, t.rpn && t.rpn.join("")]), pt: st.pts, hs: hist.map(h => [h.no, h.win, h.f, h.d.join(",")]), ov: st.over };
    return {
      n: 2, seat, round: Math.min(st.round + 1, st.rounds), rounds: st.rounds, first: st.first, phase: st.phase,
      ops: st.ops.slice(), rows: st.rows.map(r => r.slice()), floors: FLOORS.slice(),
      hold: st.phase === "open" ? st.hold : -1, step: st.step, lead: st.lead, floor: st.floor, chal: st.phase === "raise" ? st.chal : -1, decl: st.phase === "imp" ? st.decl : -1,
      tries: st.tries, wrongMax: WRONG_MAX, trace: st.trace.map(t => Object.assign({}, t, t.rpn ? { rpn: t.rpn.slice() } : {})), rd: st.rd.slice(),
      pts: st.pts.slice(), score: st.pts.slice(), hist, res: (st.phase === "show" || st.over) && hist.length ? hist[hist.length - 1] : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-40), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (보이는 것으로: 연산용 숫자와 목표만으로 직접 풂. 얼마나 찾는지는 단계마다 다름) ──
  const FIND = { easy: [0.55, 0.2, 0.05], normal: [0.85, 0.5, 0.2], hard: [0.98, 0.85, 0.6] };
  const unit = s => parseInt(hash(s), 36) / 4294967296;                        // 문자열 → 0~1 (같은 판 같은 값)
  function table(V) {                                                         // 이 라운드에서 만들 수 있는 목표 [{v,f,cost,rpn}] (높은 층 먼저)
    const E = enumerate(V.ops), out = [];
    V.rows.forEach((row, i) => row.forEach(v => { const e = E.get(v); if (e) out.push({ v, f: V.floors[i], cost: e.cost, rpn: e.rpn.slice() }); }));
    return out.sort((a, b) => b.f - a.f || a.cost - b.cost);
  }
  function found(V, seat, tier, tab) {
    const P = FIND[tier] || FIND.normal;
    return tab.filter(t => unit(`${V.round}|${V.ops.join("")}|${seat}|${tier}|${t.v}`) < P[diffOf(t.cost)]);
  }
  const pFind = (tier, cost) => (FIND[tier] || FIND.normal)[diffOf(cost)];
  function ai(V, seat, tier, rnd) {
    if (!V.needs.includes(seat)) return null;
    const tab = table(V), mine = found(V, seat, tier, tab);
    const ans = t => ({ t: "ans", rpn: t.rpn.slice(), tv: t.v });
    if (V.phase === "raise") { const up = mine.filter(t => t.f > V.floor); return up.length ? ans(up[0]) : { t: "pass" }; }
    if (V.phase === "imp") return mine.length ? ans(mine[0]) : { t: "pass" };
    if (mine.length) return ans(mine[0]);
    // 찾은 게 없음: 넘길까 · 불가능 선언할까 (상대가 찾을 확률 q 를 가늠)
    const q = 1 - tab.reduce((p, t) => p * (1 - pFind("hard", t.cost)), 1);
    const thr = tier === "hard" ? 0.45 : tier === "normal" ? 0.25 : 0;
    if (!tab.length) return rnd() < (tier === "easy" ? 0.6 : 1) ? { t: "imp" } : { t: "pass" };
    return q <= thr ? { t: "imp" } : { t: "pass" };
  }
  const canon = a => (a && a.t === "ans" ? "ans:" + (a.tv != null ? a.tv : (a.rpn || []).join(" ")) : JSON.stringify(a));

  return {
    id: "pyramid", FLOORS, WIDTH, NT, LO, HI, OPLO, OPHI, ROUND_OPTS, WRONG_MAX, IMP_WIN, IMP_LOSE, WRONG_PEN, UMAX, FIND, SYM,
    evalRpn, infix, enumerate, diffOf, floorOf, fstr, table, found,
    init, needs, apply, view, over, ranks, ai, legal, auto, advance, canon,
  };
});

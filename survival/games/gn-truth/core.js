/* 베니 서바이벌 · 진실탐지기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 2 룰 브레이커 12화 결승 2회전 (나무위키 회차 · 게임 문서 기준) — 1:1
   · 각자 비밀로 4자리 패스워드를 정함 (0~9, 같은 숫자 반복 가능)
   · 한 턴에 질문 1개 — 상대 패스워드에 관한 질문. 답하는 쪽은 반드시 '거짓'으로 답해야 해요
   · 진실을 말하면 탐지기가 울리고 진실 페널티: 자기 패스워드에 안 쓰인 숫자 1개를 상대에게 공개
   · 정답 시도도 한 턴. 틀리면 턴이 넘어가고 (추가 페널티 없음), 먼저 상대 패스워드를 정확히 맞히면 승리
   · 아이템(12화 결승, 4종 · 1회용): 선 플레이어 · 진실 페널티 면제 · 더블 턴 · 아이템 무효화 (방송: 한 사람이 선 + 면제, 다른 사람이 더블 + 무효화)
   우리 판 다듬기(방송 문서에 없음): 질문은 정해진 틀(자리 · 합 · 포함 · 크기 비교 등)에서 골라요 · 공개할 숫자는 쓰이지 않은 숫자 중 무작위 ·
   면제는 진실을 말하면 자동으로 쓰임 · 더블 턴은 질문 2개 또는 질문 1개 + 정답 시도 · 두 사람의 행동이 합쳐 120번을 넘으면 무승부 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-truth"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LIMIT = 120;
  const ALL = (() => { const a = []; for (let n = 0; n < 10000; n++) a.push([(n / 1000 | 0) % 10, (n / 100 | 0) % 10, (n / 10 | 0) % 10, n % 10]); return a; })();
  const ga = d => ([2, 4, 5, 9].includes(d) ? "가" : "이");
  const sum4 = c => c[0] + c[1] + c[2] + c[3];
  const parse = s => s.split("").map(Number);
  const YN = new Set(["has", "gt", "par", "sumge", "cmp", "eq"]);
  const isYN = q => YN.has(q.k);
  function evalQ(q, c) {
    switch (q.k) {
      case "digit": return c[q.i];
      case "has": return c.includes(q.d);
      case "gt": return c[q.i] > q.d;
      case "par": return c[q.i] % 2 === 0;
      case "sum": return sum4(c);
      case "sumge": return sum4(c) >= q.t;
      case "pair": return c[q.i] + c[q.j];
      case "cnt": return c.filter(x => x === q.d).length;
      case "max": return Math.max(...c);
      case "min": return Math.min(...c);
      case "dist": return new Set(c).size;
      case "ev": return c.filter(x => x % 2 === 0).length;
      case "cmp": return c[q.i] > c[q.j];
      case "eq": return c[q.i] === c[q.j];
    }
    return null;
  }
  const DOM = { digit: [0, 9], sum: [0, 36], pair: [0, 18], cnt: [0, 4], max: [0, 9], min: [0, 9], dist: [1, 4], ev: [0, 4] };
  const inR = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  function qValid(q) {
    if (!q || typeof q.k !== "string") return false;
    switch (q.k) {
      case "digit": case "par": return inR(q.i, 0, 3);
      case "has": case "cnt": return inR(q.d, 0, 9);
      case "gt": return inR(q.i, 0, 3) && inR(q.d, 0, 8);
      case "sumge": return inR(q.t, 1, 36);
      case "pair": case "eq": return inR(q.i, 0, 3) && inR(q.j, 0, 3) && q.i < q.j;
      case "cmp": return inR(q.i, 0, 3) && inR(q.j, 0, 3) && q.i !== q.j;
      case "sum": case "max": case "min": case "dist": case "ev": return true;
    }
    return false;
  }
  const QLIST = (() => {
    const L = [];
    for (let i = 0; i < 4; i++) { L.push({ k: "digit", i }); L.push({ k: "par", i }); for (let d = 0; d <= 8; d++) L.push({ k: "gt", i, d }); }
    for (let d = 0; d <= 9; d++) { L.push({ k: "has", d }); L.push({ k: "cnt", d }); }
    for (let t = 1; t <= 36; t++) L.push({ k: "sumge", t });
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { L.push({ k: "pair", i, j }); L.push({ k: "eq", i, j }); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) L.push({ k: "cmp", i, j });
    for (const k of ["sum", "max", "min", "dist", "ev"]) L.push({ k });
    return L;
  })();
  function qText(q) {
    const n1 = q.i + 1, n2 = q.j + 1;
    switch (q.k) {
      case "digit": return `${n1}번째 숫자는 무엇인가요?`;
      case "has": return `숫자 ${q.d}${ga(q.d)} 들어 있나요?`;
      case "gt": return `${n1}번째 숫자가 ${q.d}보다 큰가요?`;
      case "par": return `${n1}번째 숫자가 짝수인가요?`;
      case "sum": return "네 숫자를 모두 더하면 얼마인가요?";
      case "sumge": return `네 숫자의 합이 ${q.t} 이상인가요?`;
      case "pair": return `${n1}번째와 ${n2}번째 숫자의 합은 얼마인가요?`;
      case "cnt": return `숫자 ${q.d}${ga(q.d)} 몇 번 나오나요?`;
      case "max": return "가장 큰 숫자는 무엇인가요?";
      case "min": return "가장 작은 숫자는 무엇인가요?";
      case "dist": return "서로 다른 숫자가 몇 가지인가요?";
      case "ev": return "짝수가 몇 개인가요?";
      case "cmp": return `${n1}번째 숫자가 ${n2}번째 숫자보다 큰가요?`;
      case "eq": return `${n1}번째와 ${n2}번째 숫자가 같은가요?`;
    }
    return "?";
  }
  const ansText = (q, v) => (isYN(q) ? (v ? "예" : "아니오") : String(v));

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed, cfg }) {
    const ver = cfg && cfg.ver === "b" ? "b" : "a";
    const st = { n: 2, rs: (seed >>> 0) || 1, ver, codes: [null, null], phase: "code", turn: -1, acts: 0, doubled: false, first: -1, have: { dbl: [0, 0], ex: [0, 0], nul: [0, 0] }, used: { dbl: [0, 0], ex: [0, 0], nul: [0, 0] }, pend: null, pendBy: -1, nulPend: null, curEv: null, hist: [], known: [[], []], count: 0, over: false, winner: -1, draw: false, log: [], seq: 0, cfg: cfg || {} };
    return st;
  }
  function setupItems(st) {
    const s = st.cfg && (st.cfg.first === 0 || st.cfg.first === 1) ? st.cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    st.first = s;
    if (st.ver === "a") { st.have.ex[s] = 1; st.have.dbl[1 - s] = 1; st.have.nul[1 - s] = 1; }
    st.turn = s; st.acts = 1; st.doubled = false; st.phase = "ask";
    push(st, { k: "start", first: s });
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "code") return [0, 1].filter(i => st.codes[i] === null);
    if (st.phase === "ask") return [st.turn];
    if (st.phase === "answer") return [1 - st.turn];
    if (st.phase === "nul") return [1 - st.nulPend.user];
    return [];
  }
  const left = (st, kind, i) => st.have[kind][i] && !st.used[kind][i];
  function endGame(st, winner, draw) {
    st.over = true; st.winner = winner; st.draw = !!draw; st.phase = "end"; st.pend = null; st.nulPend = null;
    push(st, { k: "end", winner, draw: !!draw });
  }
  function switchTurn(st) { st.turn = 1 - st.turn; st.acts = 1; st.doubled = false; st.phase = "ask"; st.pend = null; }
  // 질문(답까지 끝남)이나 정답 시도 하나가 끝날 때마다 한 번 — 더블 턴이면 한 번 더
  function afterAction(st, forceEnd) {
    st.count++;
    if (st.count >= LIMIT) { endGame(st, -1, true); return; }
    st.acts = forceEnd ? 0 : st.acts - 1;
    if (st.acts > 0) { st.phase = "ask"; st.pend = null; } else switchTurn(st);
  }
  // 진실 페널티: 쓰이지 않은 숫자 중 아직 공개 안 된 것 하나를 무작위로 공개
  function reveal(st, ev, who) {
    const code = parse(st.codes[who]), cand = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !code.includes(d) && !st.known[who].includes(d));
    if (!cand.length) return;
    const d = cand[Math.floor(rnd(st) * cand.length)];
    ev.rev = d; st.known[who].push(d);
  }
  function finishAnswer(st) { st.nulPend = null; st.curEv = null; afterAction(st); }
  function apply(st, seat, a) {
    if (!a || st.over || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "code") {
      const s = a.code;
      if (a.t !== "code" || typeof s !== "string" || !/^[0-9]{4}$/.test(s)) return { ok: false, err: "0~9 숫자 4개를 적어요" };
      st.codes[seat] = s; push(st, { k: "code", s: seat });
      if (needs(st).length === 0) setupItems(st);
      return { ok: true };
    }
    if (st.phase === "ask") {
      if (a.t === "item") {
        if (a.item !== "double" || !left(st, "dbl", seat) || st.doubled || st.acts !== 1) return { ok: false, err: "지금은 더블 턴을 쓸 수 없어요" };
        if (left(st, "nul", 1 - seat)) { st.nulPend = { item: "double", user: seat }; st.phase = "nul"; push(st, { k: "item", s: seat, item: "double" }); return { ok: true }; }
        st.used.dbl[seat] = 1; st.doubled = true; st.acts = 2; push(st, { k: "item", s: seat, item: "double", ok: true });
        return { ok: true };
      }
      if (a.t === "ask") {
        if (!qValid(a.q)) return { ok: false, err: "질문을 다시 골라요" };
        st.pend = Object.assign({}, a.q); st.pendBy = seat; st.phase = "answer"; push(st, { k: "ask", s: seat, q: a.q });
        return { ok: true };
      }
      if (a.t === "guess") {
        const g = a.code;
        if (typeof g !== "string" || !/^[0-9]{4}$/.test(g)) return { ok: false, err: "0~9 숫자 4개를 적어요" };
        const ok = g === st.codes[1 - seat];
        st.hist.push({ i: st.hist.length, by: seat, g, ok }); push(st, { k: "guess", s: seat, g, ok });
        if (ok) { endGame(st, seat, false); return { ok: true }; }
        afterAction(st, true);
        return { ok: true };
      }
      return { ok: false, err: "질문을 하거나 정답을 말해요" };
    }
    if (st.phase === "answer") {
      const q = st.pend, yn = isYN(q);
      if (a.t !== "answer") return { ok: false, err: "답을 골라요" };
      if (yn ? typeof a.v !== "boolean" : !inR(a.v, DOM[q.k][0], DOM[q.k][1])) return { ok: false, err: yn ? "예 / 아니오로 답해요" : `${DOM[q.k][0]} ~ ${DOM[q.k][1]} 중에서 답해요` };
      const truth = evalQ(q, parse(st.codes[seat])), rang = truth === a.v;
      const ev = { i: st.hist.length, by: st.pendBy, q: Object.assign({}, q), v: a.v, rang, rev: null, exu: false, nul: false };
      st.hist.push(ev); st.curEv = ev; push(st, { k: "ans", s: seat, rang });
      if (rang) {
        if (left(st, "ex", seat)) {
          if (left(st, "nul", st.pendBy)) { st.nulPend = { item: "exempt", user: seat }; st.phase = "nul"; return { ok: true }; }
          st.used.ex[seat] = 1; ev.exu = true;
        } else reveal(st, ev, seat);
      }
      finishAnswer(st);
      return { ok: true };
    }
    if (st.phase === "nul") {
      if (a.t !== "nullify" || typeof a.use !== "boolean") return { ok: false, err: "무효화를 쓸지 정해요" };
      const np = st.nulPend, user = np.user, ev = st.curEv;
      if (a.use) { st.used.nul[seat] = 1; push(st, { k: "nullify", s: seat, item: np.item }); }
      if (np.item === "double") {
        st.used.dbl[user] = 1; st.nulPend = null;
        if (a.use) { if (ev) ev.nul = true; } else { st.doubled = true; st.acts = 2; }
        st.phase = "ask";
        return { ok: true };
      }
      // exempt
      st.used.ex[user] = 1;
      if (a.use) { ev.nul = true; reveal(st, ev, user); } else ev.exu = true;
      finishAnswer(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = () => null;
  const advance = () => {};
  const over = st => !!st.over;
  const ranks = st => (st.draw || st.winner < 0 ? [0, 0] : [st.winner === 0 ? 0 : 1, st.winner === 1 ? 0 : 1]);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "code") return [{ t: "code", code: "1234" }];
    if (st.phase === "ask") return [{ t: "ask", q: { k: "par", i: 0 } }];
    if (st.phase === "answer") { const q = st.pend, t = evalQ(q, parse(st.codes[seat])); return [{ t: "answer", v: isYN(q) ? !t : (t === DOM[q.k][0] ? DOM[q.k][1] : DOM[q.k][0]) }]; }
    if (st.phase === "nul") return [{ t: "nullify", use: false }];
    return [];
  }

  // ── 후보 추리 (보이는 것만) ───────────────────────────────────
  function consistent(c, ev) {
    if (ev.q) { const t = evalQ(ev.q, c); if (ev.rang ? t !== ev.v : t === ev.v) return false; }
    if (ev.rev !== null && ev.rev !== undefined && c.includes(ev.rev)) return false;
    return true;
  }
  // 내가 한 질문 · 답 · 정답 시도로 좁힌 상대 패스워드 후보
  function candidates(V, me) {
    const mine = V.hist.filter(e => e.by === me);
    return ALL.filter(c => mine.every(e => okEv(c, e)));
  }
  const okEv = (c, e) => (e.g !== undefined ? (c.join("") === e.g) === !!e.ok : consistent(c, e));
  // 상대가 (내가 답한 것으로) 내 패스워드에 대해 좁혀 놓은 후보
  function oppCandidates(V, me) {
    const th = V.hist.filter(e => e.by !== me);
    return ALL.filter(c => th.every(e => okEv(c, e)));
  }
  function sampleOf(arr, k, r) {
    if (arr.length <= k) return arr;
    const out = []; for (let i = 0; i < k; i++) out.push(arr[Math.floor(r() * arr.length)]);
    return out;
  }
  // 질문의 가치: 답한 뒤 남을 후보 수의 기대값 (작을수록 좋음)
  function qScore(q, C) {
    const N = C.length;
    if (isYN(q)) { let a = 0; for (const c of C) if (evalQ(q, c)) a++; return (a * a + (N - a) * (N - a)) / N; }
    const [lo, hi] = DOM[q.k], g = Array(hi - lo + 1).fill(0), D = hi - lo + 1;
    for (const c of C) g[evalQ(q, c) - lo]++;
    let s = 0; for (const x of g) s += x * (N - x);
    return N - s / (N * Math.max(1, D - 1));
  }
  const TIER = { easy: { sample: 120, top: 14, slip: 0.1, guessN: 1, dblN: 0 }, normal: { sample: 500, top: 3, slip: 0, guessN: 3, dblN: 6 }, hard: { sample: 1200, top: 1, slip: 0, guessN: 5, dblN: 10 } };
  function bestQuestions(V, me, T, r, C) {
    const S = sampleOf(C, T.sample, r), asked = new Set(V.hist.filter(e => e.by === me && e.q).map(e => JSON.stringify(e.q)));
    return QLIST.filter(q => !asked.has(JSON.stringify(q))).map(q => ({ q, s: qScore(q, S) })).sort((a, b) => a.s - b.s);
  }
  function pickGuess(C, r) { return C[Math.floor(r() * C.length)].join(""); }
  // 한 턴의 행동 정하기
  function planAsk(V, me, tier, r) {
    const T = TIER[tier] || TIER.normal, C = candidates(V, me), N = C.length;
    const acts = V.acts, haveD = V.items.dbl[me] === 1 && !V.items.usedDbl[me] && !V.doubled && acts === 1;
    const Nopp = tier === "hard" ? oppCandidates(V, me).length : 99;
    if (haveD && N > 1) {
      if ((T.dblN > 0 && N <= T.dblN) || (tier === "hard" && Nopp <= 1 && N <= 60) || (tier === "easy" && r() < 0.12)) return { t: "item", item: "double" };
    }
    if (N <= 0) return { t: "guess", code: pickGuess(ALL, r) };
    if (N === 1) return { t: "guess", code: C[0].join("") };
    if (N <= T.guessN || (tier === "hard" && Nopp <= 1)) return { t: "guess", code: pickGuess(C, r) };
    if (acts === 2 && N <= 2) return { t: "guess", code: pickGuess(C, r) };
    const L = bestQuestions(V, me, T, r, C);
    if (!L.length) return { t: "guess", code: pickGuess(C, r) };
    const q = L[Math.min(L.length - 1, Math.floor(r() * T.top))].q;
    return { t: "ask", q };
  }
  function planAnswer(V, me, tier, r) {
    const T = TIER[tier] || TIER.normal, q = V.pend, code = parse(V.myCode), truth = evalQ(q, code);
    if (isYN(q)) return { t: "answer", v: T.slip && r() < T.slip ? truth : !truth };
    const [lo, hi] = DOM[q.k], vals = []; for (let v = lo; v <= hi; v++) if (v !== truth) vals.push(v);
    if (T.slip && r() < T.slip) return { t: "answer", v: truth };
    if (tier === "easy") return { t: "answer", v: vals[Math.floor(r() * vals.length)] };
    // 상대가 좁혀 둔 후보에서, 말해도 후보를 가장 적게 지우는 값 (진짜 값은 남아야 하므로 거짓만 고름)
    const C = oppCandidates(V, me), g = Array(hi - lo + 1).fill(0);
    for (const c of C) g[evalQ(q, c) - lo]++;
    const sc = vals.map(v => ({ v, g: g[v - lo] })).sort((a, b) => a.g - b.g);
    const top = tier === "hard" ? sc.filter(x => x.g === sc[0].g) : sc.slice(0, 3);
    return { t: "answer", v: top[Math.floor(r() * top.length)].v };
  }
  function planNul(V, me, tier, r) {
    const it = V.nulPend.item, opp = 1 - me;
    if (it === "double") return { t: "nullify", use: tier === "easy" ? r() < 0.6 : true };
    if (tier === "hard") return { t: "nullify", use: !(V.items.dbl[opp] === 1 && !V.items.usedDbl[opp]) };
    return { t: "nullify", use: tier === "normal" ? r() < 0.5 : false };
  }
  function planCode(r) { let s = ""; for (let i = 0; i < 4; i++) s += Math.floor(r() * 10); return { t: "code", code: s }; }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "code") return planCode(r);
    if (V.phase === "ask") return planAsk(V, me, tier, r);
    if (V.phase === "answer") return planAnswer(V, me, tier, r);
    if (V.phase === "nul") return planNul(V, me, tier, r);
    return null;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const items = { first: st.first, dbl: st.have.dbl.slice(), ex: st.have.ex.slice(), nul: st.have.nul.slice(), usedDbl: st.used.dbl.slice(), usedEx: st.used.ex.slice(), usedNul: st.used.nul.slice() };
    const hist = st.hist.map(e => (e.g !== undefined ? { i: e.i, by: e.by, g: e.g, ok: e.ok } : { i: e.i, by: e.by, q: e.q, v: e.v, rang: e.rang, rev: e.rev, exu: e.exu, nul: e.nul }));
    const pubObj = { p: st.phase, t: st.turn, a: st.acts, d: st.doubled, it: items, pq: st.pend, np: st.nulPend, h: hist, k: st.known, c: st.codes.map(c => (c === null ? 0 : 1)), o: st.over, w: st.winner };
    return {
      n: 2, seat, ver: st.ver, phase: st.phase, turn: st.turn, acts: st.acts, doubled: st.doubled, items, pend: st.pend ? Object.assign({}, st.pend) : null, pendBy: st.pendBy,
      nulPend: st.nulPend ? Object.assign({}, st.nulPend) : null, hist, known: st.known.map(a => a.slice()), done: st.codes.map(c => c !== null),
      myCode: me >= 0 ? st.codes[me] : null, codes: all || st.over ? st.codes.slice() : null, count: st.count, limit: LIMIT,
      needs: needs(st), over: st.over, winner: st.winner, draw: st.draw, ranks: st.over ? ranks(st) : null, score: st.over ? ranks(st).map(x => (x === 0 && !st.draw ? 1 : 0)) : [0, 0], log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI 선생님 (내가 보는 것만) ───────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function posText(C) {
    const out = [];
    for (let p = 0; p < 4; p++) { const s = new Set(C.map(c => c[p])), arr = [...s].sort((a, b) => a - b); out.push(`${p + 1}번째 ${arr.length === 10 ? "모든 숫자" : arr.length > 6 ? `${arr.length}가지` : arr.join("·")}`); }
    return out.join(" / ");
  }
  function coach(V, me, since, names) {
    const opp = 1 - me, nm = (names && names[opp]) || "상대";
    if (V.over) return { opp: V.draw ? "행동이 너무 많아 무승부로 끝났어요." : `${V.winner === me ? "내가" : nm + "가"} 상대 패스워드를 맞혀서 끝났어요.`, mine: `내 패스워드 ${V.myCode} · 상대 ${V.codes ? V.codes[opp] : "?"}`, rec: V.winner === me ? "이겼어요!" : "다음엔 예 / 아니오 질문으로 범위를 반씩 줄여요", why: "답이 늘 거짓이라 예 / 아니오 질문은 답의 반대가 정확한 정보예요." };
    const Nopp = oppCandidates(V, me).length;
    const oppTxt = V.phase === "code" ? "상대도 4자리를 정하는 중이에요." : `상대가 내 패스워드로 좁힌 후보는 약 ${Nopp.toLocaleString("ko-KR")}개예요${Nopp <= 5 ? " — 곧 맞힐 수 있어서 위험해요!" : ""}.`;
    if (V.phase === "code") return { opp: oppTxt, mine: "아직 숫자를 정하지 않았어요.", rec: "섞인 숫자 4개로 정하기", why: "1234 · 1111 같은 뻔한 숫자는 쉽게 읽혀요. 같은 숫자를 반복해도 되니 무작위처럼 정해요." };
    const C = candidates(V, me), N = C.length;
    const mineTxt = `내 패스워드 ${V.myCode} · 상대 후보 ${N.toLocaleString("ko-KR")}개 · ${N <= 80 || N === 10000 ? posText(C) : "자리별 후보가 아직 넓어요"}${V.known[opp].length ? ` · 상대 패스워드에 없는 숫자 ${V.known[opp].join(", ")}` : ""}`;
    if (V.phase === "ask" && V.turn === me) {
      const rr = sampler(V.hist.length * 131 + 7), a = planAsk(V, me, "hard", rr);
      let rec, why;
      if (a.t === "guess") { rec = `정답 시도: ${a.code}`; why = N === 1 ? "후보가 하나만 남았어요. 맞히면 바로 이겨요!" : `후보가 ${N}개 남았어요. 이쯤이면 질문보다 정답을 말해 보는 게 더 빨라요 (틀려도 페널티는 없고 후보 하나가 줄어요).`; }
      else if (a.t === "item") { rec = "더블 턴 쓰기"; why = `후보가 ${N}개로 줄었어요. 이번 턴에 질문 + 정답까지 해서 마무리해 봐요.`; }
      else { rec = `"${qText(a.q)}" 묻기`; why = `${isYN(a.q) ? "예 / 아니오 질문은 상대가 거짓말로 답하니 '답의 반대'가 사실이에요. " : ""}후보 ${N}개를 가장 고르게 가르는 질문이에요.`; }
      return { opp: oppTxt, mine: mineTxt, rec, why };
    }
    if (V.phase === "answer" && V.pendBy !== me) {
      const q = V.pend, truth = evalQ(q, parse(V.myCode)), pl = planAnswer(V, me, "hard", sampler(V.hist.length * 17 + 3));
      return { opp: oppTxt, mine: mineTxt, rec: `"${ansText(q, pl.v)}"라고 거짓말하기`, why: `사실은 "${ansText(q, truth)}"이에요. 사실과 같은 답을 하면 탐지기가 울려서 쓰이지 않은 숫자 하나가 상대에게 공개돼요.` };
    }
    if (V.phase === "nul" && V.nulPend && V.nulPend.user !== me) {
      const pl = planNul(V, me, "hard", sampler(5));
      return { opp: oppTxt, mine: mineTxt, rec: pl.use ? "무효화 쓰기" : "무효화 아끼기", why: V.nulPend.item === "double" ? "상대의 더블 턴은 한 턴에 질문을 두 번 하게 해 줘요. 막으면 이번 턴은 질문 한 번뿐이에요." : "상대의 진실 페널티 면제를 막으면 숫자 하나를 공개시킬 수 있어요." };
    }
    return { opp: oppTxt, mine: mineTxt, rec: "기다려요", why: "상대가 정하는 중이에요." };
  }

  return { id: "gn-truth", LIMIT, ALL, QLIST, TIER, DOM, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, evalQ, qValid, qText, ansText, isYN, candidates, oppCandidates, qScore, planAsk, planAnswer, parse };
});

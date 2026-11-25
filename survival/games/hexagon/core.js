/* 베니 서바이벌 · 헥사곤 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 (시즌 1) · 7일차 결승전 2회전 (1:1)
   · 정육각형 칸 19개가 3 · 4 · 5 · 4 · 3 줄로 모인 육각 판. 칸 앞면엔 숫자, 뒷면엔 알파벳 A~S
   · 라운드마다 새 판: 30초 동안 앞면(숫자)을 보여 주고 → 뒷면(알파벳)으로 덮은 뒤 타깃 넘버 공개
   · 가로 · 대각선으로 이어진 세 칸의 숫자 합이 타깃이 되는 조합을 찾으면 버저 → 10초 안에 알파벳 세 개로 선언
     (가운데 칸은 가운데로: ABC · CBA 는 되지만 BCA 는 안 됨)
   · 정답 +1 · 오답 −1 (이미 나온 답 · 일렬이 아닌 세 칸 · 시간 초과도 오답). 선언한 칸은 열지 않고, 나온 정답도 판에 표시 안 함
   · 정답이 몇 개인지는 안 알려 줌. 정답이 다 나오거나 아무도 버저를 안 누르면(방송 90초) 라운드 끝 · 10라운드
   · 점수 많은 사람 승, 같으면 연장 라운드
   방송과 다른 점 (폰 · AI 때문): 판 숫자 · 타깃은 씨앗 난수로 만들어요 (방송 10판처럼 숫자 1~10, 정답 1~6개) ·
     '모르겠어요(넘기기)' 로 바로 넘길 수 있고 두 사람 다 넘기면 라운드 끝 · 연장은 3라운드까지(그래도 같으면 무승부) ·
     라운드가 끝나면 판과 정답을 잠깐 보여 줌 · 피스 베네핏(시작 1점)은 없음
   재현 약속: 시계 · Math.random 을 안 써요. 버저 시각은 행동 {t:"buzz", ms} 로 실려 오고(사람 = UI 가 잰 값, AI = ai() 가 정한 값),
     10초 제한은 {t:"timeout"} 행동으로 와요. AI 의 기억 · 반응 난수는 라운드 · 버저 차례마다 씨앗 난수로 미리 뽑아 그 자리 view 에만 실려요. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).hexagon = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LET = "ABCDEFGHIJKLMNOPQRS".split("");
  const HMIN = (typeof window !== "undefined" && window.SVHuman && window.SVHuman.MIN) || 120;
  const NO_BUZZ = 99999, MIN_MS = 900, MAXCALLS = 30, MEMPOOL = 16, EXTRA = 3;
  // 칸 좌표 (축 좌표 q, r — 줄 r = −2..2, 위에서부터 3 · 4 · 5 · 4 · 3칸)
  const CELL = [];
  for (let r = -2; r <= 2; r++) for (let q = Math.max(-2, -2 - r); q <= Math.min(2, 2 - r); q++) CELL.push({ q, r, row: r + 2 });
  const AT = new Map(CELL.map((c, i) => [c.q + "," + c.r, i]));
  // 세 칸 줄 27개: 가로(→) · 오른쪽 아래(↘) · 왼쪽 아래(↙)
  const DIRS = [[1, 0, "가로"], [0, 1, "대각선 ↘"], [-1, 1, "대각선 ↙"]];
  const LINES = [];
  DIRS.forEach(([dq, dr, nm], d) => CELL.forEach((c, i) => {
    const b = AT.get((c.q + dq) + "," + (c.r + dr)), e = AT.get((c.q + 2 * dq) + "," + (c.r + 2 * dr));
    if (b !== undefined && e !== undefined) LINES.push({ c: [i, b, e], d, nm });
  }));
  const LINE_OF = new Map();
  LINES.forEach((L, k) => { LINE_OF.set(L.c.join(","), k); LINE_OF.set(L.c.slice().reverse().join(","), k); });
  const lineName = k => LINES[k].c.map(i => LET[i]).join("");

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const sumOf = (board, k) => LINES[k].c.reduce((s, i) => s + board[i], 0);
  const answersOf = (board, t) => LINES.map((_, k) => k).filter(k => sumOf(board, k) === t);

  // ── 옵션 ──
  const OPTS = { look: [30, 45, 60], rounds: [10, 5], limit: [10, 15], aid: [1, 0] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  // 라운드별 숫자 범위 (방송 10판: 앞쪽은 1~6 · 7, 뒤로 갈수록 8 · 10 까지)
  const maxNum = (r, R) => r > R ? 9 : r === R ? 10 : r * 10 <= R * 3 ? 6 : r * 10 <= R * 6 ? 7 : 8;
  // 타깃: 정답이 2~5개인 합을 주로 (1개 · 6개도 가끔)
  const TW = { 1: 1, 2: 2, 3: 4, 4: 4, 5: 3, 6: 1 };
  function makeBoard(st, m) {
    for (let tries = 0; tries < 40; tries++) {
      const board = CELL.map(() => 1 + Math.floor(rnd(st) * m));
      const cnt = {};
      LINES.forEach((_, k) => { const s = sumOf(board, k); cnt[s] = (cnt[s] || 0) + 1; });
      const cands = Object.keys(cnt).map(Number).filter(s => TW[cnt[s]]).sort((a, b) => a - b);
      if (!cands.length) continue;
      const tot = cands.reduce((s, x) => s + TW[cnt[x]], 0);
      let u = rnd(st) * tot, t = cands[cands.length - 1];
      for (const x of cands) { u -= TW[cnt[x]]; if (u < 0) { t = x; break; } }
      return { board, target: t };
    }
    // (거의 없음) 그래도 없으면 아무 줄의 합
    const board = CELL.map(() => 1 + Math.floor(rnd(st) * m));
    return { board, target: sumOf(board, 0) };
  }

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    const o = optsOf(cfg);
    const st = { n: 2, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, R: o.rounds, round: 0, phase: "look", board: [], target: 0, m: 6, ans: [],
      found: [], decl: [], rdy: [false, false], bz: [null, null], caller: -1, calls: 0, last: null, score: [0, 0], mem: [[], []], rd: [[0, 0, 0], [0, 0, 0]],
      stat: [{ bz: 0, ok: 0, bad: 0, ms: 0 }, { bz: 0, ok: 0, bad: 0, ms: 0 }], hist: [], log: [], seq: 0, over: false, res: null };
    const fixed = Array.isArray(cfg.board) && cfg.board.length === 19 && cfg.board.every(v => Number.isInteger(v) && v >= 1 && v <= 10) && Number.isInteger(cfg.target);   // 시험용 고정 판 (옵션에는 없음)
    startRound(st, fixed ? { board: cfg.board.slice(), target: cfg.target } : null);
    return st;
  }
  function startRound(st, fixed) {
    st.round++;
    st.m = maxNum(st.round, st.R);
    const g = fixed || makeBoard(st, st.m);
    st.board = g.board; st.target = g.target; st.ans = answersOf(st.board, st.target);
    st.found = []; st.decl = []; st.rdy = [false, false]; st.calls = 0; st.caller = -1; st.last = null; st.bz = [null, null];
    // 그 자리 AI 의 기억 풀: 19칸 중 16칸 (단계마다 앞에서부터 쓰는 만큼) + 칸마다 잘못 외울 난수
    st.mem = [0, 1].map(() => shuffle(st, CELL.map((_, i) => i)).slice(0, MEMPOOL).map(c => ({ c, v: st.board[c], u: rnd(st) })));
    st.phase = "look";
    push(st, { k: "round", r: st.round, m: st.m });
  }
  function newBuzz(st) {
    st.bz = [null, null]; st.caller = -1;
    st.rd = [0, 1].map(() => [rnd(st), rnd(st), rnd(st)]);
    st.phase = "buzz";
  }
  function endRound(st, why) {
    st.phase = "reveal";
    st.hist.push({ r: st.round, t: st.target, m: st.m, board: st.board.slice(), ans: st.ans.slice(), found: st.found.map(f => ({ k: f.k, s: f.s })), why, score: st.score.slice() });
    push(st, { k: "reveal", r: st.round, why, ans: st.ans.slice(), board: st.board.slice() });
  }
  function finish(st) {
    const [a, b] = st.score;
    st.over = true; st.phase = "end";
    st.res = { w: a === b ? -1 : a > b ? 0 : 1, score: st.score.slice(), r: st.round, extra: st.round > st.R };
    push(st, { k: "end", w: st.res.w, score: st.score.slice() });
  }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "look") return [0, 1].filter(i => !st.rdy[i]);
    if (st.phase === "buzz") return [0, 1].filter(i => st.bz[i] === null);
    if (st.phase === "call") return [st.caller];
    return [];
  }
  const over = st => !!st.over;
  function ranks(st) {
    const [a, b] = st.score;
    return a === b ? [0, 0] : a > b ? [0, 1] : [1, 0];
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "look") return [{ t: "ready" }];
    if (st.phase === "buzz") return [{ t: "buzz", ms: NO_BUZZ }, { t: "buzz", ms: 3000 }];
    return LINES.map(L => ({ t: "call", c: L.c.slice() })).concat([{ t: "timeout" }]);
  }
  function judgeCall(st, c) {
    const k = LINE_OF.get(c.join(","));
    if (k === undefined) return { ok: false, why: "line", k: -1 };
    if (st.found.some(f => f.k === k)) return { ok: false, why: "dup", k };
    const s = sumOf(st.board, k);
    return s === st.target ? { ok: true, why: "ok", k, sum: s } : { ok: false, why: "sum", k, sum: s };
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (seat !== 0 && seat !== 1) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "look") {
      if (a.t !== "ready") return { ok: false, err: "판을 외우는 중이에요" };
      if (st.rdy[seat]) return { ok: false, err: "이미 준비했어요" };
      st.rdy[seat] = true;
      if (st.rdy[0] && st.rdy[1]) { push(st, { k: "hide", r: st.round, t: st.target }); newBuzz(st); }
      return { ok: true };
    }
    if (st.phase === "buzz") {
      if (a.t !== "buzz" || typeof a.ms !== "number" || !Number.isFinite(a.ms)) return { ok: false, err: "버저를 누르거나 넘겨요" };
      if (st.bz[seat] !== null) return { ok: false, err: "이미 정했어요" };
      const r = Math.round(a.ms);        // 사람 최소 반응(셸 공용 SVHuman.MIN) 아래는 그 값으로 · 안 누름(NO_BUZZ)은 그대로
      st.bz[seat] = r >= NO_BUZZ ? NO_BUZZ : Math.max(HMIN, Math.min(NO_BUZZ, r));
      if (st.bz[0] !== null && st.bz[1] !== null) {
        const [m0, m1] = st.bz;
        if (m0 >= NO_BUZZ && m1 >= NO_BUZZ) { push(st, { k: "buzz", r: st.round, w: -1, ms: [m0, m1] }); endRound(st, "pass"); return { ok: true }; }
        const w = m0 < m1 ? 0 : m1 < m0 ? 1 : rnd(st) < 0.5 ? 0 : 1;
        st.caller = w; st.phase = "call";
        st.stat[w].bz++; st.stat[w].ms += st.bz[w];
        push(st, { k: "buzz", r: st.round, w, ms: [m0, m1] });
      }
      return { ok: true };
    }
    if (st.phase === "call") {
      if (seat !== st.caller) return { ok: false, err: "상대가 선언하는 중이에요" };
      let J, c = null;
      if (a.t === "timeout") J = { ok: false, why: "time", k: -1 };
      else if (a.t === "call") {
        c = a.c;
        if (!Array.isArray(c) || c.length !== 3 || !c.every(x => Number.isInteger(x) && x >= 0 && x < 19) || new Set(c).size !== 3) return { ok: false, err: "서로 다른 칸 세 개를 골라요" };
        c = c.slice(); J = judgeCall(st, c);
      } else return { ok: false, err: "알파벳 세 칸을 선언해요" };
      st.calls++;
      st.score[seat] += J.ok ? 1 : -1;
      if (J.ok) { st.found.push({ k: J.k, s: seat }); st.stat[seat].ok++; } else st.stat[seat].bad++;
      st.last = { s: seat, c, ok: J.ok, why: J.why, k: J.k, n: st.calls };
      st.decl.push({ s: seat, c, ok: J.ok, why: J.why, k: J.k });
      push(st, { k: "call", r: st.round, s: seat, c, ok: J.ok, why: J.why });
      st.phase = "show";
      return { ok: true };
    }
    return { ok: false, err: "잠깐 — 결과를 보여 주는 중이에요" };
  }
  const auto = st => st.over ? null : st.phase === "show" ? (st.last && st.last.ok ? 1700 : 2100) : st.phase === "reveal" ? 4800 : null;
  function advance(st) {
    if (st.over) return;
    if (st.phase === "show") {
      if (st.found.length >= st.ans.length) endRound(st, "all");
      else if (st.calls >= MAXCALLS) endRound(st, "cap");
      else newBuzz(st);
      return;
    }
    if (st.phase === "reveal") {
      const tied = st.score[0] === st.score[1];
      if (st.round >= st.R && (!tied || st.round >= st.R + EXTRA)) finish(st);
      else startRound(st, null);
    }
  }

  // ── 보이는 것 ──
  //  앞면 숫자 = 외우는 시간 · 라운드 끝 · 끝 (또는 'all') 만. 정답 목록 · 정답 수는 라운드 끝에만.
  //  mem · rd = 그 자리 AI 의 기억 · 반응 난수 (상대 것은 안 실림). 버저 시각은 둘 다 정한 뒤 기록(log)으로만.
  function view(st, seat) {
    const all = seat === "all", s = seat === 0 || seat === 1 ? seat : -1;
    const open = all || st.phase === "look" || st.phase === "reveal" || st.phase === "end";
    const tShown = st.phase !== "look" || all;
    const L = st.last;
    const pubObj = { r: st.round, p: st.phase, sc: st.score, t: st.phase === "look" ? 0 : st.target, b: st.phase === "look" || st.phase === "reveal" || st.phase === "end" ? st.board : 0,
      f: st.found.map(f => [f.k, f.s]), d: st.decl.map(d => [d.s, d.c, d.ok ? 1 : 0, d.why]), c: st.caller, rdy: st.rdy, o: st.over, a: st.phase === "reveal" || st.phase === "end" ? st.ans : 0 };
    return {
      n: 2, R: st.R, opt: Object.assign({}, st.opt), round: st.round, phase: st.phase, m: st.m,
      board: open ? st.board.slice() : null, target: tShown ? st.target : 0,
      ans: all || st.phase === "reveal" || st.phase === "end" ? st.ans.slice() : null,
      found: st.found.map(f => Object.assign({}, f)), decl: st.decl.map(d => Object.assign({}, d, { c: d.c ? d.c.slice() : null })),
      rdy: st.rdy.slice(), caller: st.caller, calls: st.calls, last: L ? Object.assign({}, L, { c: L.c ? L.c.slice() : null }) : null,
      mine: s >= 0 ? st.bz[s] !== null : false, myMs: s >= 0 ? st.bz[s] : null,
      bz: all ? st.bz.slice() : null,
      score: st.score.slice(), stat: st.stat.map(x => Object.assign({}, x)),
      hist: st.hist.map(h => Object.assign({}, h, { board: h.board.slice(), ans: h.ans.slice(), found: h.found.map(f => Object.assign({}, f)), score: h.score.slice() })),
      mem: s >= 0 ? st.mem[s].map(x => Object.assign({}, x)) : null,
      rd: s >= 0 ? st.rd[s].slice() : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? Object.assign({}, st.res, { score: st.res.score.slice() }) : null,
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI ──
  //  mem = 외운 칸 수 · err = 잘못 외울 확률(±1) · forget = 남이 맞힌 답을 잊을 확률 · ms = 떠올리는 시간 · rash = 두 칸만 알 때 찍을 확률
  const PROF = {
    easy:   { mem: 5,  err: 0.15, forget: 0.35, lo: 4200, hi: 9500, rash: 0.25 },
    normal: { mem: 9,  err: 0.07, forget: 0.15, lo: 2800, hi: 6800, rash: 0.06 },
    hard:   { mem: 13, err: 0.02, forget: 0,    lo: 1700, hi: 4300, rash: 0 },
  };
  const frac = x => x - Math.floor(x);
  // 이 AI 가 아는 칸 값 (잘못 외운 것 포함)
  function memOf(V, P) {
    const k = [];
    (V.mem || []).slice(0, P.mem).forEach(x => { const bad = x.u < P.err; k[x.c] = bad ? Math.max(1, x.v + (frac(x.u * 977.3) < 0.5 ? -1 : 1)) : x.v; });
    return k;
  }
  // 이 AI 가 '이미 나온 답' 으로 기억하는 줄 · 자기가 틀린 줄
  function doneOf(V, P, seat) {
    const rd = V.rd || [0.5, 0.5, 0.5], set = new Set();
    (V.decl || []).forEach((d, j) => {
      if (d.k < 0) return;
      if (d.s === seat) { set.add(d.k); return; }                         // 내가 부른 건 다 기억
      if (d.ok && frac(rd[2] * 131.7 + j * 0.6180339) >= P.forget) set.add(d.k);
    });
    return set;
  }
  function knownLines(V, P, seat) {
    const K = memOf(V, P), done = doneOf(V, P, seat), sure = [], part = [];
    LINES.forEach((L, k) => {
      if (done.has(k)) return;
      const kn = L.c.filter(i => K[i] !== undefined);
      if (kn.length === 3) { if (kn.reduce((s, i) => s + K[i], 0) === V.target) sure.push(k); }
      else if (kn.length === 2) { const need = V.target - kn.reduce((s, i) => s + K[i], 0); if (need >= 1 && need <= (V.m || 10)) part.push(k); }
    });
    return { sure, part };
  }
  function aiWith(V, seat, P) {
    if (!V || V.over || !V.needs || !V.needs.includes(seat)) return null;
    if (V.phase === "look") return { t: "ready" };
    const rd = V.rd || [0.5, 0.5, 0.5], { sure, part } = knownLines(V, P, seat);
    if (V.phase === "buzz") {
      if (sure.length) {
        const mult = 1 / (1 + 0.18 * (sure.length - 1));
        return { t: "buzz", ms: Math.max(MIN_MS, Math.round((P.lo + (P.hi - P.lo) * rd[0]) * mult)) };
      }
      if (part.length && frac(rd[1] * 7.31) < P.rash) return { t: "buzz", ms: Math.max(MIN_MS, Math.round(P.hi * (1 + rd[0]))) };
      return { t: "buzz", ms: NO_BUZZ };
    }
    if (V.phase === "call") {
      const pool = sure.length ? sure : part.length ? part : LINES.map((_, k) => k).filter(k => !(V.found || []).some(f => f.k === k));
      if (!pool.length) return { t: "timeout" };
      const k = pool[Math.floor(frac(rd[1] * 53.17 + (V.calls || 0) * 0.37) * pool.length)];
      const c = LINES[k].c.slice();
      return { t: "call", c: frac(rd[0] * 91.3) < 0.5 ? c : c.reverse() };
    }
    return null;
  }
  function ai(V, seat, tier) { return aiWith(V, seat, PROF[tier] || PROF.normal); }

  // ── 선생님 · 복기 보조 ──
  // 외우는 동안 보이는 판으로: 합마다 줄 수 (타깃 후보 = 정답 2~5개인 합)
  function lineSums(board) {
    const by = {};
    LINES.forEach((L, k) => { const s = sumOf(board, k); (by[s] = by[s] || []).push(k); });
    return by;
  }
  // 버저를 누를지: 맞을 확률 p 면 기대 2p − 1 점
  const buzzEV = p => 2 * p - 1;
  function recommend(V, seat) { return ai(V, seat, "hard"); }
  // 복기: 그 자리 기억 풀(16칸, 진짜 값)로 판정 — 모르는 칸이 끼면 판정하지 않음
  function judgeFromPool(V, c) {
    const K = []; (V.mem || []).forEach(x => { K[x.c] = x.v; });
    const k = LINE_OF.get(c.join(","));
    if (k === undefined) return { why: "line", k: -1 };
    if ((V.found || []).some(f => f.k === k)) return { why: "dup", k };
    const cs = LINES[k].c, kn = cs.every(i => K[i] !== undefined);
    if (!kn) return { why: "unknown", k };
    const vals = cs.map(i => K[i]), s = vals.reduce((a, b) => a + b, 0);
    return { why: s === V.target ? "ok" : "sum", k, vals, sum: s };
  }
  function poolAnswers(V) {
    const K = []; (V.mem || []).forEach(x => { K[x.c] = x.v; });
    return LINES.map((_, k) => k).filter(k => LINES[k].c.every(i => K[i] !== undefined) && sumOf(K, k) === V.target && !(V.found || []).some(f => f.k === k));
  }

  return {
    id: "hexagon", LET, CELL, LINES, LINE_OF, NO_BUZZ, MEMPOOL, PROF, lineName, sumOf, answersOf, maxNum, optsOf, makeBoard,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, knownLines, lineSums, buzzEV, judgeFromPool, poolAnswers,
  };
});

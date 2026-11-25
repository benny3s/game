/* 베니 서바이벌 · 수식 피라미드 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 6일차 감옥 매치 (2명). 나무위키 6일차 문서의 룰 · 10라운드 문제판 · 정답 목록을 읽고 우리 말로 옮김.
   · 10라운드. 라운드마다 피라미드 10칸(A~J, 칸마다 '+7 · −5 · ×3 · ÷4' 처럼 부호와 숫자)과 타깃 넘버가 공개됨.
   · 3칸을 골라 순서대로 이어 타깃 넘버가 되는 수식을 만듦. 같은 칸은 두 번 못 씀, 첫 칸의 부호는 무시 (숫자만).
     계산은 사칙 연산 순서 (곱셈 · 나눗셈 먼저). 예) 타깃 10 · A ×7 · C +9 · H ÷3 → ACH = 7 + 9 ÷ 3 = 10.
     (방송 10라운드 정답 목록과 이 해석으로 찾은 답이 전부 같음 — 분수 중간값을 허용해도 · 막아도 같음 → 정확한 분수로 계산)
   · 맞히면 +1점. 틀리거나 이미 나온 답을 다시 말하면 −1점.
   · 모든 정답이 나오면 라운드 끝. 10라운드 뒤 점수가 높은 사람이 이김.
   방송과 다른 점 (폰 · AI 때문에 우리가 정함 — 화면 '방송과 다른 점' 한 줄로도 알림):
     ① 방송은 버저 순발력 싸움. 우리는 차례를 번갈아 줌 (한 차례에 답 하나 또는 넘기기) — 공용 껍데기가 AI 를 1초쯤 뒤 움직여서 먼저 누르기는 사람이 못 이김.
        라운드마다 첫 차례는 한 칸씩 돌아감. 모두 이어서 넘기면 (= 더 못 찾음) 라운드 끝 → 못 찾은 답을 보여 줌.
     ② '10초 안에 못 대면 −1 · 3분' 시계는 없음 (대신 라운드마다 차례 수 상한).
     ③ 문제판: 방송 10판 그대로 (옵션) 또는 새 문제 (씨앗으로 만듦, 정답 2~8개).
     ④ 2~4명 (방송 2명), 점수가 같으면 공동 순위.
   숨은 정보: 없음. 다만 라운드가 끝나기 전 정답 목록은 view 에 안 실음 (풀이는 각자). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).eqpyramid = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const L = "ABCDEFGHIJ", NCELL = 10;
  const OPTS = { rounds: [10, 5], src: ["new", "tv"] };
  // 방송 10라운드 (나무위키 데스룸 6일차 · 수식 피라미드 진행표)
  const TV = [
    [10, "×7 ÷5 +9 -5 ×2 +2 ÷8 ÷3 -8 ×3"], [1, "÷4 +8 ×2 -3 +9 +1 ×7 ÷11 -6 ×8"], [8, "+7 ÷9 ×2 -13 +15 ÷5 ×1 ÷3 -11 ×3"],
    [11, "×3 ×13 -8 -14 ÷2 ÷7 ×9 ÷5 -1 ÷4"], [6, "÷14 ÷2 -10 ÷7 ×8 ÷5 ÷12 -5 -6 ÷4"], [3, "÷9 -2 -10 ×6 ×3 -8 ×2 ×5 ÷7 ×4"],
    [19, "-1 +2 +3 -4 ×5 ×6 ×7 -8 ×9 -10"], [9, "-16 -14 ÷2 ÷8 ×12 ×4 ÷7 +10 +3 ÷5"], [7, "-2 +12 ÷6 ×4 ÷2 +8 ×6 ÷10 -4 ×2"],
    [17, "-10 ×4 ×9 ×5 ×2 +3 +1 ÷6 ÷8 ÷7"],
  ].map(([t, s]) => ({ target: t, cells: s.split(" ").map(x => ({ op: x[0], n: +x.slice(1) })) }));

  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? (typeof OPTS[k][0] === "number" ? +cfg[k] : String(cfg[k])) : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 400) st.log.shift(); }

  // ── 계산: 정확한 분수 [분자, 분모] ──
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const fr = (p, q) => { if (q < 0) { p = -p; q = -q; } const g = gcd(p, q) || 1; return [p / g, q / g]; };
  const AR = {
    "+": (x, y) => fr(x[0] * y[1] + y[0] * x[1], x[1] * y[1]), "-": (x, y) => fr(x[0] * y[1] - y[0] * x[1], x[1] * y[1]),
    "×": (x, y) => fr(x[0] * y[0], x[1] * y[1]), "÷": (x, y) => (y[0] === 0 ? null : fr(x[0] * y[1], x[1] * y[0])),
  };
  const hiOp = o => o === "×" || o === "÷";
  // 칸 3개 (순서대로) → 값 (첫 칸 부호 무시, 곱셈 · 나눗셈 먼저)
  function evalK(cells, k) {
    const i = L.indexOf(k[0]), j = L.indexOf(k[1]), m = L.indexOf(k[2]);
    const A = [cells[i].n, 1], o1 = cells[j].op, B = [cells[j].n, 1], o2 = cells[m].op, C = [cells[m].n, 1];
    if (!hiOp(o1) && hiOp(o2)) { const t = AR[o2](B, C); return t && AR[o1](A, t); }
    const t = AR[o1](A, B); return t && AR[o2](t, C);
  }
  const isK = k => typeof k === "string" && k.length === 3 && [...k].every(c => L.includes(c)) && new Set(k).size === 3;
  function solve(cells, target) {
    const out = [];
    for (let i = 0; i < NCELL; i++) for (let j = 0; j < NCELL; j++) for (let m = 0; m < NCELL; m++) {
      if (i === j || j === m || i === m) continue;
      const k = L[i] + L[j] + L[m], v = evalK(cells, k);
      if (v && v[1] === 1 && v[0] === target) out.push(k);
    }
    return out.sort();
  }
  // 사람 눈으로 찾기 어려운 정도 (AI 실력 · 선생님 설명): 나눗셈 · 순서 뒤집힘 · 분수 중간값 · 큰 수
  function hardOf(cells, k) {
    const i = L.indexOf(k[0]), j = L.indexOf(k[1]), m = L.indexOf(k[2]);
    const o1 = cells[j].op, o2 = cells[m].op, a = cells[i].n, b = cells[j].n, c = cells[m].n;
    let d = 1;
    if (o1 === "÷" || o2 === "÷") d += 0.8;
    if (!hiOp(o1) && hiOp(o2)) d += 0.6;                                  // 뒤 칸을 먼저 계산
    const mid = !hiOp(o1) && hiOp(o2) ? AR[o2]([b, 1], [c, 1]) : AR[o1]([a, 1], [b, 1]);
    if (mid && mid[1] !== 1) d += 1.4;                                    // 중간에 분수
    if (cells[i].op === "÷" || cells[i].op === "-") d += 0.4;             // 첫 칸 부호를 무시해야 보임
    if (Math.max(a, b, c) >= 12) d += 0.3;
    if (o1 === "×" && o2 === "×") d += 0.3;
    return d;
  }
  const exprOf = (cells, k) => {
    const i = L.indexOf(k[0]), j = L.indexOf(k[1]), m = L.indexOf(k[2]);
    const sym = o => (o === "-" ? "−" : o);
    return `${cells[i].n} ${sym(cells[j].op)} ${cells[j].n} ${sym(cells[m].op)} ${cells[m].n}`;
  };
  const calc2 = (a, op, b) => valTxt(AR[op]([a, 1], [b, 1]));
  const valTxt = v => (!v ? "나눌 수 없음" : v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`);

  // 새 문제: 씨앗으로 10칸 · 타깃 (정답 2~8개)
  function makeBoard(seed, r) {
    const R = seeded((hash(`eqp|${seed}|${r}`) ^ 0x2545F491) >>> 0);
    const pick = a => a[Math.floor(R() * a.length)];
    let best = null;
    for (let tr = 0; tr < 600; tr++) {
      const cells = [];
      for (let c = 0; c < NCELL; c++) {
        const op = pick(["+", "-", "×", "÷", "+", "-", "×", "÷", "×", "-"]);
        const n = op === "×" ? 1 + Math.floor(R() * 13) : op === "÷" ? 2 + Math.floor(R() * 13) : 1 + Math.floor(R() * 16);
        cells.push({ op, n });
      }
      const target = 1 + Math.floor(R() * 20), ans = solve(cells, target);
      if (ans.length >= 2 && ans.length <= 8) return { target, cells };
      if (ans.length >= 2 && !best) best = { target, cells };
    }
    return best || TV[(r - 1) % TV.length];
  }

  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(2, Math.min(4, n | 0 || 2));
    const o = optsOf(cfg), f = Math.floor(mix(seed, 7) * n) % n;
    const st = { n, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, R: o.rounds, first: f, sc: Array(n).fill(0),
      round: 0, board: null, ans: [], found: [], tries: [], turn: f, streak: 0, cnt: 0, cap: 0, phase: "play", last: null, hist: [],
      log: [], seq: 0, over: false, end: "" };
    push(st, { k: "start", first: f });
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    const b = st.opt.src === "tv" ? TV[(st.round - 1) % TV.length] : makeBoard(st.rs, st.round);
    st.board = { target: b.target, cells: b.cells.map(c => ({ op: c.op, n: c.n })) };
    st.ans = solve(st.board.cells, st.board.target);
    st.found = []; st.tries = []; st.streak = 0; st.cnt = 0; st.phase = "play";
    st.cap = 3 * 8 + 4 * st.n + 4;   // 정답 수와 무관 (보기에 실려도 정답 수가 안 샘)
    st.turn = (st.first + st.round - 1) % st.n;
    push(st, { k: "round", r: st.round, target: st.board.target, cells: st.board.cells.map(c => c.op + c.n).join(" ") });
  }
  function endRound(st, why) {
    st.phase = "rend";
    st.last = { round: st.round, target: st.board.target, cells: st.board.cells.map(c => ({ op: c.op, n: c.n })), ans: st.ans.slice(),
      found: st.found.map(x => ({ k: x.k, s: x.s })), why, sc: st.sc.slice() };
    st.hist.push({ round: st.round, target: st.board.target, nAns: st.ans.length, found: st.found.map(x => ({ k: x.k, s: x.s })) });
    push(st, { k: "rend", r: st.round, why, ans: st.ans.slice() });
  }
  function finish(st) {
    st.over = true; st.phase = "end"; st.end = "rounds";
    push(st, { k: "end", sc: st.sc.slice() });
  }
  const needs = st => (st.over || st.phase !== "play" ? [] : [st.turn]);
  const over = st => !!st.over;

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (a.t === "say") {
      if (!isK(a.k)) return { ok: false, err: "서로 다른 칸 3개를 골라요" };
      let res;
      if (st.found.some(x => x.k === a.k)) { res = "dup"; st.sc[seat]--; }
      else if (st.ans.includes(a.k)) { res = "ok"; st.sc[seat]++; st.found.push({ k: a.k, s: seat }); }
      else { res = "wrong"; st.sc[seat]--; }
      const v = evalK(st.board.cells, a.k);
      st.tries.push({ s: seat, k: a.k, res, v: valTxt(v) });
      push(st, { k: "say", s: seat, key: a.k, res, v: valTxt(v) });
      st.streak = 0;
    } else if (a.t === "pass") {
      st.tries.push({ s: seat, k: "", res: "pass" });
      push(st, { k: "pass", s: seat });
      st.streak++;
    } else return { ok: false, err: "답을 말하거나 넘겨요" };
    st.cnt++;
    if (st.found.length >= st.ans.length) endRound(st, "all");
    else if (st.streak >= st.n) endRound(st, "pass");
    else if (st.cnt >= st.cap) endRound(st, "cap");
    else st.turn = (st.turn + 1) % st.n;
    return { ok: true };
  }
  const auto = st => (st.over ? null : st.phase === "rend" ? 5600 : null);
  function advance(st) {
    if (st.over || st.phase !== "rend") return;
    if (st.round >= st.R) finish(st); else startRound(st);
  }
  function ranks(st) { return st.sc.map(x => st.sc.filter(y => y > x).length); }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const o = [{ t: "pass" }];
    for (let i = 0; i < NCELL; i++) for (let j = 0; j < NCELL; j++) for (let m = 0; m < NCELL; m++) if (i !== j && j !== m && i !== m) o.push({ t: "say", k: L[i] + L[j] + L[m] });
    return o;
  }

  // ── 보이는 것: 모두 공개, 라운드 중 정답 목록만 뺌 ──
  function view(st, seat) {
    const pubObj = { r: st.round, p: st.phase, f: st.found, tr: st.tries.length, sc: st.sc, t: st.turn };
    return {
      n: st.n, opt: Object.assign({}, st.opt), R: st.R, round: st.round, phase: st.phase, turn: st.turn, first: st.first,
      target: st.board.target, cells: st.board.cells.map(c => ({ op: c.op, n: c.n })), sc: st.sc.slice(),
      found: st.found.map(x => ({ k: x.k, s: x.s })), tries: st.tries.map(x => Object.assign({}, x)), streak: st.streak, cnt: st.cnt, cap: st.cap,
      ans: st.phase === "play" ? null : st.ans.slice(),
      last: st.last ? JSON.parse(JSON.stringify(st.last)) : null, hist: st.hist.map(h => JSON.parse(JSON.stringify(h))),
      needs: needs(st), over: st.over, ranks: ranks(st), seat,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), pub: hash(JSON.stringify(pubObj)).toString(36),
    };
  }

  // ── AI: 보이는 판을 스스로 풂. 쉬움 · 보통은 어려운 답을 못 볼 때가 있고 가끔 헛답 ──
  const PROF = {
    easy: { see: 0.32, wrong: 0.16, pass: 0.25 },
    normal: { see: 0.6, wrong: 0.06, pass: 0.08 },
    hard: { see: 1, wrong: 0, pass: 0 },
  };
  const keyV = (V, s) => hash(`${V.pub}|${V.round}|${s}|${V.cnt}`);
  function remainOf(V) {
    const all = solve(V.cells, V.target), got = new Set(V.found.map(x => x.k));
    return all.filter(k => !got.has(k)).map(k => ({ k, d: hardOf(V.cells, k) })).sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1));
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    const rem = remainOf(V);
    if (P.see >= 1) return rem.length ? { t: "say", k: rem[0].k } : { t: "pass" };
    if (P.pass && R() < P.pass) return { t: "pass" };   // 이번 차례엔 못 찾음
    const seen = rem.filter(x => R() < P.see / x.d * 1.6);
    if (seen.length) return { t: "say", k: seen[0].k };
    if (R() < P.wrong) {   // 헛답: 계산을 잘못한 그럴듯한 3칸 (아직 안 나온 것)
      const got = new Set(V.found.map(x => x.k).concat(V.tries.map(x => x.k), solve(V.cells, V.target)));   // 헛답이 우연히 정답이 되지 않게
      for (let g = 0; g < 40; g++) {
        const k = [0, 1, 2].reduce(acc => { let c; do c = L[Math.floor(R() * NCELL)]; while (acc.includes(c)); return acc + c; }, "");
        if (!got.has(k)) return { t: "say", k };
      }
    }
    return { t: "pass" };
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const rows = remainOf(V);
    return { a: aiWith(V, s, PROF.hard), rows };
  }
  // 복기: 그 수의 점수 변화 (+1 · 0 · −1)
  function judge(V, s, myA, bestA) {
    if (!V || V.over || V.phase !== "play" || !myA || !bestA) return null;
    const all = solve(V.cells, V.target), got = new Set(V.found.map(x => x.k));
    const gain = a => (a.t === "pass" ? 0 : got.has(a.k) ? -1 : all.includes(a.k) ? 1 : -1);
    return { my: gain(myA), best: gain(bestA), left: all.length - got.size };
  }

  return {
    id: "eqpyramid", L, NCELL, OPTS, TV, PROF, optsOf, evalK, calc2, solve, hardOf, exprOf, valTxt, makeBoard, isK,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, remainOf,
  };
});

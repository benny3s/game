/* 베니 서바이벌 · 수식미로 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌3 · 수식미로 (8일차 데스매치 1:1) — 나무위키 「피의 게임3/8일차」 데스매치 규칙을 읽고 우리 말로 옮김
   · 3라운드, 문제 5개 (1 · 2라운드는 2개씩, 3라운드는 1개). 라운드가 시작되면 16칸(4×4) 숫자판의 앞면이 공개되고 1분 뒤 알파벳(A~P) 뒷면으로 바뀜.
     라운드가 바뀌면 숫자판이 새로 바뀌고 다시 1분 외움.
   · 문제: 출발 · 도착 알파벳과 정답 값이 나옴. 앞면에서 본 숫자를 떠올려 출발 → 도착 길을 완성 (상하좌우로 변이 맞닿은 칸끼리만 이을 수 있고, 길에 든 숫자는 모두 합산).
   · 길을 완성한 사람이 정답을 외치고 지나간 알파벳을 말함. 맞으면 승점 1. 틀리면 감점 없이 발언 기회가 상대에게 30초 넘어감. 풀이 제한 시간은 따로 없음.
   · 먼저 3점이면 즉시 승. 3라운드가 끝났을 때는 승점이 높은 쪽 승.
   방송과 다른 점 (원문에 없거나 우리 화면에 맞추려 정한 것 — 화면 '방송과 다른 점' 한 줄로도 알림):
     ① 방송은 둘이 동시에 풀다가 먼저 외친 사람이 답함. 우리는 문제마다 '먼저 답할 차례'를 번갈아 줌 (첫 문제 차례는 무작위, 이후 번갈아).
        그 사람이 길을 내거나 넘기면(오답 · 넘김) 상대가 한 번 이어서 답함 — 방송의 '오답이면 상대에게 30초'와 같은 모양 (30초는 화면 타이머, 넘기기 가능).
        (공용 껍데기가 AI 를 0.6~1.1 초 뒤 움직이게 해서 '먼저 외치기' 경주는 사람이 이길 수 없기 때문)
     ② 상대도 틀리거나 넘기면 그 문제는 아무도 점수 없이 끝남 (원문에 없음). 틀린 길 · 정답 길은 알파벳으로만 공개 (숫자는 라운드가 끝날 때 열림).
     ③ 숫자는 1~19 중 16개를 겹치지 않게 (원문에 범위 없음, 예시 판이 1~19) · 같은 칸은 한 번만 지남 (원문에 없음, 예시가 모두 그랬음) · 출발 · 도착 칸도 합에 넣음 (예시 합이 그랬음).
     ④ 문제는 출발 · 도착이 3칸 이상 떨어지고, 정답 길이 5~9칸, 같은 합을 만드는 길이 3개 이하인 것으로 만듦.
     ⑤ 5문제 뒤 점수가 같으면 연장 문제 1개 (3라운드 판 그대로), 그래도 같으면 공동 1등 (원문에 동점 규정 없음).
     ⑥ 외우는 시간 = 옵션 30초 · 1분(방송) · 90초. 시간은 화면이 재서 끝나면 '다 외웠어요'를 대신 눌러 줌 (규칙은 시계 없이 결정적).
     ⑦ 한 기기로는 못 함 — 길을 고르는 모습이 상대 눈에 보이고, 둘이 동시에 '다 외웠어요'를 눌러야 해서. 2명 고정.
   숨은 정보: 외우기가 끝나면 숫자판은 아무에게도 안 보임 (구경꾼 · AI 구경 포함, view.board = null). 문제 · 틀린 길 · 정답 길(알파벳)만 공개.
     AI 는 '다 외웠어요' 행동에 자기가 기억한 칸만 실어 보내고(잊은 칸 = null), 이후 view.mem 으로 자기 기억만 돌려받음 → 판을 엿볼 수 없음. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).mazesum = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SIDE = 4, CELLS = 16, LO = 1, HI = 19, ROUNDS = 3, PLAN = [2, 2, 1], TOTAL = 5, WIN = 3;
  const LETTERS = "ABCDEFGHIJKLMNOP", MEMO_OPTS = [30, 60, 90];
  const FORGET = { easy: 0.3, normal: 0.14, hard: 0.03 };   // AI 가 외우다 놓치는 칸 비율 (초급 30% · 중급 14% · 고급 3%)
  const THR = 0.34;                                         // 먼저 답하는 AI 가 이 확률은 돼야 내봄 (아니면 넘김)
  const letter = i => LETTERS[i];
  const dist = (a, b) => Math.abs(((a / SIDE) | 0) - ((b / SIDE) | 0)) + Math.abs((a % SIDE) - (b % SIDE));
  const NB = [];
  for (let i = 0; i < CELLS; i++) { const r = (i / SIDE) | 0, c = i % SIDE, a = []; if (r > 0) a.push(i - SIDE); if (r < SIDE - 1) a.push(i + SIDE); if (c > 0) a.push(i - 1); if (c < SIDE - 1) a.push(i + 1); NB[i] = a; }
  const roundOf = qi => (qi < 2 ? 0 : qi < 4 ? 1 : 2);
  const minCells = (s, e) => dist(s, e) + 1;
  const sumOf = (bd, cells) => cells.reduce((t, c) => t + bd[c], 0);

  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function rand(st) { const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0); let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const int = (st, n) => Math.floor(rand(st) * n);

  // 출발 → 도착, 같은 칸을 두 번 안 지나는 길 전부 (4×4 에서 많아야 수백 개)
  const PCACHE = {};
  function paths(s, e) {
    const k = s * CELLS + e; if (PCACHE[k]) return PCACHE[k];
    const out = [], cur = [s];
    (function dfs(v, seen) {
      if (v === e) { out.push(cur.slice()); return; }
      for (const w of NB[v]) if (!((seen >> w) & 1)) { cur.push(w); dfs(w, seen | (1 << w)); cur.pop(); }
    })(s, 1 << s);
    return (PCACHE[k] = out);
  }
  // 길이 규칙에 맞는지 (맞으면 null, 아니면 이유)
  function pathErr(q, cells) {
    if (!Array.isArray(cells) || cells.length < 2 || cells.length > CELLS) return "길은 두 칸 이상으로 이어 주세요";
    if (!cells.every(c => Number.isInteger(c) && c >= 0 && c < CELLS)) return "없는 칸이에요";
    if (cells[0] !== q.s) return `출발은 ${letter(q.s)} 칸이에요`;
    if (cells[cells.length - 1] !== q.e) return `도착은 ${letter(q.e)} 칸이에요`;
    if (new Set(cells).size !== cells.length) return "같은 칸을 두 번 지날 수 없어요";
    for (let i = 1; i < cells.length; i++) if (!NB[cells[i - 1]].includes(cells[i])) return "위 · 아래 · 왼쪽 · 오른쪽으로 맞닿은 칸만 이을 수 있어요";
    return null;
  }

  function makeBoard(st) {
    const v = []; for (let x = LO; x <= HI; x++) v.push(x);
    for (let i = v.length - 1; i > 0; i--) { const j = int(st, i + 1); [v[i], v[j]] = [v[j], v[i]]; }
    return v.slice(0, CELLS);
  }
  // 문제 하나: 출발 · 도착 · 정답 합 (정답 길을 먼저 정하고 그 합을 문제로 냄)
  function makeQ(st, bd) {
    const used = st.qs.map(q => `${q.s},${q.e},${q.sum}`);
    let fall = null;
    for (let t = 0; t < 600; t++) {
      const s = int(st, CELLS), e = int(st, CELLS);
      if (dist(s, e) < 3) continue;
      const all = paths(s, e), P = all.filter(p => p.length >= 5 && p.length <= 9);
      if (!P.length) continue;
      const p = P[int(st, P.length)], sum = sumOf(bd, p);
      if (used.includes(`${s},${e},${sum}`)) continue;
      const nsol = all.filter(x => sumOf(bd, x) === sum).length, q = { s, e, sum, ans: p.slice(), nsol };
      fall = fall || q;
      if (nsol <= (t < 400 ? 3 : 6)) return q;
    }
    if (fall) return fall;
    for (let s = 0; s < CELLS; s++) for (let e = 0; e < CELLS; e++) {   // 사실상 안 오는 길: 무작위가 600번 다 빗나가면 순서대로 찾음
      if (dist(s, e) < 3) continue;
      const all = paths(s, e), P = all.filter(p => p.length >= 5 && p.length <= 9);
      if (!P.length) continue;
      const p = P[0], sum = sumOf(bd, p);
      if (!used.includes(`${s},${e},${sum}`)) return { s, e, sum, ans: p.slice(), nsol: all.filter(x => sumOf(bd, x) === sum).length };
    }
    return null;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, memoSec: MEMO_OPTS.includes(+(cfg && cfg.memo)) ? +cfg.memo : 60, round: 0, qi: 0, phase: "memo", bds: [], bd: null, qs: [], first: 0, ready: [false, false], mem: [null, null], hold: -1, step: 0, tries: [], pts: [0, 0], hist: [], res: null, open: false, final: false, over: false, log: [], seq: 0 };
    for (let r = 0; r < ROUNDS; r++) st.bds.push(makeBoard(st));
    for (let k = 0; k < TOTAL; k++) st.qs.push(makeQ(st, st.bds[roundOf(k)]));
    st.first = int(st, 2); st.bd = st.bds[0];
    push(st, { k: "round", r: 1 });
    return st;
  }
  const holderOf = (st, qi) => (st.first + qi) % 2;
  const needs = st => (st.over ? [] : st.phase === "memo" ? [0, 1].filter(s => !st.ready[s]) : st.phase === "ask" ? [st.hold] : []);
  function beginQuestion(st) {
    st.phase = "ask"; st.hold = holderOf(st, st.qi); st.step = 0; st.tries = []; st.res = null;
    push(st, { k: "ask", q: st.qi + 1, s: st.hold });
  }
  function finish(st, win, path) {
    const q = st.qs[st.qi];
    if (win >= 0) st.pts[win]++;
    const rec = { no: st.qi + 1, round: roundOf(st.qi) + 1, ext: st.qi >= TOTAL, first: holderOf(st, st.qi), win, s: q.s, e: q.e, sum: q.sum, ans: (win >= 0 && path ? path : q.ans).slice(), tries: st.tries.map(t => ({ s: t.s, cells: t.cells ? t.cells.slice() : null, ok: t.ok })), pts: st.pts.slice() };
    st.hist.push(rec); st.res = rec; st.phase = "show"; st.hold = -1;
    st.final = st.pts[0] >= WIN || st.pts[1] >= WIN || (st.qi === TOTAL - 1 && st.pts[0] !== st.pts[1]) || st.qi >= TOTAL;
    st.open = st.final || st.qi === 1 || st.qi === 3;      // 같은 판으로 더 풀 문제가 없으면 숫자를 열어 줌
    push(st, { k: "result", q: rec.no, w: win, pts: st.pts.slice() });
  }
  function fail(st, seat) {
    if (st.step === 0) { st.step = 1; st.hold = 1 - seat; push(st, { k: "turn", s: st.hold }); }
    else finish(st, -1);
  }
  function apply(st, seat, a) {
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (st.phase === "memo") {
      if (a.t !== "ready") return { ok: false, err: "먼저 숫자판을 외워 주세요" };
      let mem = null;
      if (a.mem != null) {
        mem = Array.isArray(a.mem) && a.mem.length === CELLS ? Array.from(a.mem, x => (x === undefined ? null : x)) : null;   // 구멍 뚫린 배열도 null 로 채움
        if (!mem || !mem.every((x, i) => x === null || x === st.bd[i])) return { ok: false, err: "기억한 숫자가 판과 달라요" };
      }
      st.ready[seat] = true; st.mem[seat] = mem; push(st, { k: "ready", s: seat });
      if (st.ready.every(Boolean)) beginQuestion(st);
      return { ok: true };
    }
    const q = st.qs[st.qi];
    if (a.t === "pass") { st.tries.push({ s: seat, cells: null, ok: false }); push(st, { k: "pass", s: seat }); fail(st, seat); return { ok: true }; }
    if (a.t !== "path") return { ok: false, err: "길을 내거나 넘겨 주세요" };
    const err = pathErr(q, a.cells);
    if (err) return { ok: false, err };
    const ok = sumOf(st.bd, a.cells) === q.sum;
    st.tries.push({ s: seat, cells: a.cells.slice(), ok });
    push(st, { k: "try", s: seat, cells: a.cells.slice(), ok });
    if (ok) finish(st, seat, a.cells); else fail(st, seat);
    return { ok: true };
  }
  const auto = st => (st.phase === "show" && !st.over ? 3600 : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    if (st.final) { st.over = true; st.phase = "end"; st.open = true; push(st, { k: "end" }); return; }
    st.qi++; st.open = false;
    if (st.qi >= TOTAL && !st.qs[st.qi]) st.qs.push(makeQ(st, st.bds[2]));
    const r = roundOf(st.qi);
    if (r !== st.round) { st.round = r; st.bd = st.bds[r]; st.phase = "memo"; st.ready = [false, false]; st.mem = [null, null]; st.tries = []; st.res = null; push(st, { k: "round", r: r + 1 }); }
    else beginQuestion(st);
  }
  const over = st => !!st.over;
  const ranks = st => st.pts.map(p => st.pts.filter(x => x > p).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    return st.phase === "memo" ? [{ t: "ready" }] : [{ t: "pass" }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 숨은 것 = 외우기 뒤의 숫자판 · 정답 길(문제가 끝나기 전) · 남의 기억. 내 기억(mem)만 내 눈에 돌려줌 (AI 가 쓰는 것, 사람은 null).
  function view(st, seat) {
    const all = seat === "all", ps = seat === 0 || seat === 1, memo = st.phase === "memo", showBd = memo || st.open || st.over;
    const q = st.phase === "ask" || st.phase === "show" || st.over ? st.qs[st.qi] : null;
    const hist = st.hist.map(h => ({ no: h.no, round: h.round, ext: h.ext, first: h.first, win: h.win, s: h.s, e: h.e, sum: h.sum, ans: h.ans.slice(), tries: h.tries.map(t => ({ s: t.s, cells: t.cells ? t.cells.slice() : null, ok: t.ok })), pts: h.pts.slice() }));
    const tries = q ? st.tries.map(t => ({ s: t.s, cells: t.cells ? t.cells.slice() : null, ok: t.ok })) : [];
    const pubObj = { r: st.round, p: st.phase, qi: st.qi, pts: st.pts, rd: st.ready, q: q && [q.s, q.e, q.sum], h: st.phase === "ask" ? st.hold : -1, sp: st.step, tr: tries.map(t => [t.s, t.cells && t.cells.join("."), t.ok]), hs: hist.map(h => [h.no, h.win, h.ans.join(".")]), bd: showBd ? st.bd : 0, ov: st.over };
    return {
      n: 2, seat, round: st.round + 1, rounds: ROUNDS, qi: st.qi, qNo: Math.min(st.qi + 1, TOTAL), qTotal: TOTAL, ext: st.qi >= TOTAL, first: st.first,
      phase: st.phase, memoSec: st.memoSec, pts: st.pts.slice(), score: st.pts.slice(), win: WIN,
      board: showBd ? st.bd.slice() : null, ready: st.ready.slice(),
      q: q ? { s: q.s, e: q.e, sum: q.sum } : null,
      hold: st.phase === "ask" ? st.hold : -1, step: st.step, tries, hist,
      mem: ps && st.mem[seat] ? st.mem[seat].slice() : null, memn: all ? st.mem.map(m => (m ? m.filter(x => x !== null).length : null)) : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-40), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (보이는 것 + 자기 기억만) ───────────────────────────
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  // 내 기억으로 본 각 길의 정답 가능성: 기억한 칸 합 + 잊은 칸 값(남은 숫자 중 서로 다른 값)이 정답 합과 같을 확률
  function solve(V, mem) {
    const q = V.q, tried = new Set(V.tries.filter(t => t.cells).map(t => t.cells.join(",")));
    const known = new Set(); mem.forEach(x => { if (x != null) known.add(x); });
    const R = []; for (let v = LO; v <= HI; v++) if (!known.has(v)) R.push(v);
    const U = mem.filter(x => x == null).length, J = Math.min(U, 9), maxS = HI * J + 1;
    const dp = Array.from({ length: J + 1 }, () => new Float64Array(maxS + 1)); dp[0][0] = 1;
    for (const v of R) for (let j = J; j >= 1; j--) for (let s = maxS - v; s >= 0; s--) if (dp[j - 1][s]) dp[j][s + v] += dp[j - 1][s];
    const sure = [], cand = []; let tot = 0;
    for (const p of paths(q.s, q.e)) {
      if (tried.has(p.join(","))) continue;
      let K = 0, u = 0; for (const c of p) { const m = mem[c]; if (m == null) u++; else K += m; }
      if (u === 0) { if (K === q.sum) sure.push(p); continue; }
      if (p.length < 5 || p.length > 9 || u > J) continue;
      const res = q.sum - K; if (res <= 0 || res > maxS) continue;
      const w = dp[u][res] / binom(R.length, u);
      if (w > 0) { cand.push({ p, w }); tot += w; }
    }
    return { sure, cand, tot };
  }
  function ai(V, seat, tier, rnd) {
    const f = FORGET[tier] != null ? FORGET[tier] : FORGET.normal;
    if (V.phase === "memo") return V.board ? { t: "ready", mem: V.board.map(x => (rnd() < f ? null : x)) } : { t: "ready" };
    if (V.phase !== "ask" || V.hold !== seat || !V.q) return null;
    const { sure, cand, tot } = solve(V, V.mem || Array(CELLS).fill(null));
    if (sure.length) return { t: "path", cells: sure[Math.floor(rnd() * sure.length)].slice() };
    if (!cand.length) return { t: "pass" };
    let best = cand[0].w; for (const c of cand) if (c.w > best) best = c.w;
    const top = cand.filter(c => c.w >= best - 1e-12);
    if (V.step === 0 && best / tot < THR) return { t: "pass" };
    return { t: "path", cells: top[Math.floor(rnd() * top.length)].p.slice() };
  }

  return {
    id: "mazesum", SIDE, CELLS, LO, HI, ROUNDS, PLAN, TOTAL, WIN, LETTERS, MEMO_OPTS, FORGET, THR,
    letter, dist, minCells, sumOf, paths, pathErr, roundOf, NB,
    init, needs, apply, view, over, ranks, ai, legal, auto, advance,
  };
});

/* 베니 서바이벌 · 블라인드 오목 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 (시즌 1) · 6일차 비밀의 방 (감옥에서 들어간 1명 vs NPC)
   · 19줄 바둑판에 두는 오목. 돌 밑면은 흑돌 · 백돌이지만 윗면과 옆은 여러 색으로 덮여 있어, 위에서는 색만 보이고 누구 돌인지 안 보임
   · 플레이어가 흑(먼저) · NPC 가 백. 흑은 색을 골라 두고, 백은 바로 앞에 흑이 쓴 돌과 같은 색으로 둠
   · 내 돌과 상대 돌을 기억해서 내 돌 5개를 한 줄(가로 · 세로 · 대각선)로 먼저 놓으면 승리
     (방송: 이기면 피스 10개 · 지면 가진 피스를 모두 잃고 바로 탈락, 속임수 · 반칙은 그 즉시 패배)
   방송과 다른 점 (폰 · 사람끼리 · AI 때문): 1:1 사람끼리 또는 AI 와 · 첫 판 흑은 무작위, 다음 판은 번갈아 ·
     5개 이상 한 줄이면 승리 (장목도 인정 · 33 금지 없음) · 5목은 심판이 바로 알려 줌 · 판이 다 차면 무승부 ·
     판 수 옵션 (1판 · 3판 2선승) · 판 크기 옵션 (19줄 · 15줄) · '흑백 보기' 연습 옵션 (방송은 안 보임)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 판에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).blindomok = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLS = ["빨강", "주황", "노랑", "초록", "하늘", "파랑", "보라"], NC = COLS.length;
  const LET = "ABCDEFGHJKLMNOPQRST";                 // 바둑 표기처럼 I 를 뺀 19글자
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const cellName = (N, i) => LET[i % N] + (Math.floor(i / N) + 1);

  // ── 옵션 ──
  const OPTS = { size: [19, 15], games: [1, 3], peek: [0, 1] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }

  // ── 5칸 창 (AI 평가용) — 판 크기마다 한 번 ──
  const WINS = {};
  function winsOf(N) {
    if (WINS[N]) return WINS[N];
    const cells = [], at = Array.from({ length: N * N }, () => []);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of DIRS) {
      const r4 = r + 4 * dr, c4 = c + 4 * dc;
      if (r4 < 0 || r4 >= N || c4 < 0 || c4 >= N) continue;
      const w = []; for (let k = 0; k < 5; k++) w.push((r + k * dr) * N + c + k * dc);
      const id = cells.length; cells.push(w); for (const x of w) at[x].push(id);
    }
    return (WINS[N] = { cells, at });
  }

  // p 의 돌로 i 를 지나는 5개 이상 한 줄 (없으면 null)
  function lineAt(own, N, i, p) {
    const r0 = Math.floor(i / N), c0 = i % N;
    for (const [dr, dc] of DIRS) {
      const seg = [i];
      for (const sg of [1, -1]) {
        let r = r0 + sg * dr, c = c0 + sg * dc;
        while (r >= 0 && r < N && c >= 0 && c < N && own[r * N + c] === p) { if (sg > 0) seg.push(r * N + c); else seg.unshift(r * N + c); r += sg * dr; c += sg * dc; }
      }
      if (seg.length >= 5) return seg;
    }
    return null;
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 500) st.log.shift(); }

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    void n;
    const o = optsOf(cfg);
    const st = { n: 2, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, N: o.size, need: o.games === 1 ? 1 : 2, maxG: o.games === 1 ? 1 : 5,
      gi: 0, black: -1, own: [], col: [], mv: [], turn: 0, lastC: -1, phase: "play", wins: [0, 0], draws: 0, last: null, line: null, gw: null,
      hist: [], log: [], seq: 0, over: false, res: null, gseed: 0 };
    startGame(st);
    return st;
  }
  function startGame(st) {
    st.gi++;
    st.black = st.gi === 1 ? (mix(st.rs, 77) < 0.5 ? 0 : 1) : 1 - st.black;
    st.own = Array(st.N * st.N).fill(-1); st.col = Array(st.N * st.N).fill(-1); st.mv = [];
    st.turn = st.black; st.lastC = -1; st.last = null; st.line = null; st.gw = null;
    st.gseed = Math.floor(mix(st.rs, st.gi, 5) * 4294967296) >>> 0;
    st.phase = "play";
    push(st, { k: "game", g: st.gi, black: st.black });
  }
  function needs(st) { return st.over || st.phase !== "play" ? [] : [st.turn]; }
  const over = st => !!st.over;
  function ranks(st) { return st.wins.map(w => st.wins.filter(q => q > w).length); }

  // 행동 확인 → 오류 글 ("" = 됨). 돌려주는 c 는 실제로 쓸 색
  function check(st, seat, a) {
    if (!a || a.t !== "put") return { err: "모르는 행동이에요" };
    const N = st.N, p = a.p;
    if (!Number.isInteger(p) || p < 0 || p >= N * N) return { err: "둘 곳을 골라요" };
    if (st.own[p] >= 0) return { err: "이미 돌이 있는 자리예요" };
    if (seat === st.black) {
      const c = a.c == null ? (st.lastC >= 0 ? st.lastC : 0) : a.c;
      if (!Number.isInteger(c) || c < 0 || c >= NC) return { err: "색을 골라요" };
      return { err: "", c };
    }
    if (a.c != null && a.c !== st.lastC) return { err: `백은 흑이 방금 둔 색(${COLS[st.lastC]})으로만 둬요` };
    return { err: "", c: st.lastC };
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (st.phase !== "play") return { ok: false, err: "잠깐 — 판 결과를 보는 중이에요" };
    if (seat !== st.turn) return { ok: false, err: "지금은 차례가 아니에요" };
    const ck = check(st, seat, a);
    if (ck.err) return { ok: false, err: ck.err };
    const p = a.p, c = ck.c;
    st.own[p] = seat; st.col[p] = c; st.mv.push({ p, s: seat, c });
    if (seat === st.black) st.lastC = c;
    st.last = { s: seat, p, c, n: st.mv.length };
    push(st, { k: "act", g: st.gi, s: seat, a: { t: "put", p, c } });
    const L = lineAt(st.own, st.N, p, seat);
    if (L) endGame(st, seat, L);
    else if (st.mv.length >= st.N * st.N) endGame(st, -1, null);
    else st.turn = 1 - seat;
    return { ok: true };
  }
  function endGame(st, w, line) {
    st.phase = "gameend"; st.gw = w; st.line = line ? line.slice() : null;
    if (w >= 0) st.wins[w]++; else st.draws++;
    st.hist.push({ g: st.gi, black: st.black, w, moves: st.mv.length, own: st.own.slice(), col: st.col.slice(), line: st.line ? st.line.slice() : null, mv: st.mv.map(m => ({ p: m.p, s: m.s, c: m.c })) });
    push(st, { k: "gend", g: st.gi, w, moves: st.mv.length });
  }
  const auto = st => (st.over ? null : st.phase === "gameend" ? 4200 : null);
  function advance(st) {
    if (st.over || st.phase !== "gameend") return;
    if (Math.max(...st.wins) >= st.need || st.gi >= st.maxG) finish(st); else startGame(st);
  }
  function finish(st) {
    st.over = true; st.phase = "end";
    const best = Math.max(...st.wins);
    st.res = { wins: st.wins.slice(), draws: st.draws, w: [0, 1].filter(i => st.wins[i] === best) };
    push(st, { k: "end", wins: st.wins.slice() });
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const out = [];
    for (let p = 0; p < st.N * st.N; p++) if (st.own[p] < 0) out.push({ t: "put", p, c: seat === st.black ? p % NC : st.lastC, N: st.N });
    return out;
  }

  // ── 보이는 것 ──
  //  누가 어디에 뒀는지는 두 사람 다 눈으로 본 것이라 그대로 실어요 (화면은 색만 그리고, 기억은 사람 몫).
  function view(st, seat) {
    const pubObj = { g: st.gi, p: st.phase, own: st.own, col: st.col, t: st.turn, w: st.wins, d: st.draws, o: st.over, b: st.black };
    return {
      n: 2, N: st.N, opt: Object.assign({}, st.opt), need: st.need, maxG: st.maxG, gi: st.gi, black: st.black, phase: st.phase,
      own: st.own.slice(), col: st.col.slice(), mv: st.mv.map(m => ({ p: m.p, s: m.s, c: m.c })), lastC: st.lastC,
      cur: st.phase === "play" && !st.over ? st.turn : -1, last: st.last ? Object.assign({}, st.last) : null,
      line: st.line ? st.line.slice() : null, gw: st.gw, wins: st.wins.slice(), draws: st.draws, gseed: st.gseed,
      hist: st.hist.map(h => ({ g: h.g, black: h.black, w: h.w, moves: h.moves, own: h.own.slice(), col: h.col.slice(), line: h.line ? h.line.slice() : null, mv: h.mv.map(m => ({ p: m.p, s: m.s, c: m.c })) })),
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? { wins: st.res.wins.slice(), draws: st.res.draws, w: st.res.w.slice() } : null,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)).toString(36),
    };
  }

  // ── AI ──
  //  기억: 오래된 돌일수록 '누구 돌이었지?'를 헷갈림 (돌마다 정해진 때가 지나면 주인을 거꾸로 기억 — 판마다 · 사람마다 고정)
  //  수 고르기: 5칸 창 평가 (상대 돌이 없는 창에 내 돌이 몇 개 · 내 돌이 없는 창에 상대 돌이 몇 개)
  const PROF = {
    easy:   { mem: { A: 3, span: 10, p: 0.32 }, def: 0.6, noise: 0.7, top: 6 },
    normal: { mem: { A: 8, span: 18, p: 0.1 }, def: 0.85, noise: 0.25, top: 3 },
    hard:   { mem: null, def: 0.95, noise: 0, top: 1, look: 8 },
  };
  const AW = [0, 1, 12, 140, 2400, 1e7];     // 내 돌이 (둔 뒤) k개인 창 하나의 값
  const DW = [0, 1, 10, 110, 1800, 4e6];     // 상대 돌이 (내가 막는 자리 빼고) k-1 개인 창 하나의 값
  function belief(V, s, P) {
    const own = V.own.slice();
    if (!P || !P.mem) return own;
    const L = V.mv.length;
    for (let k = 0; k < L; k++) {
      const age = L - k;
      if (mix(V.gseed, k, s, 1) < P.mem.p && age > P.mem.A + Math.floor(mix(V.gseed, k, s, 2) * P.mem.span)) {
        const p = V.mv[k].p; if (own[p] >= 0) own[p] = 1 - own[p];
      }
    }
    return own;
  }
  function scoreAt(own, N, i, p) {
    const W = winsOf(N); let att = 0, def = 0, a5 = 0, d5 = 0, a4 = 0, d4 = 0;
    for (const w of W.at[i]) {
      let mine = 0, opp = 0;
      for (const c of W.cells[w]) { const o = own[c]; if (o === p) mine++; else if (o >= 0) opp++; }
      if (!opp) { att += AW[mine + 1]; if (mine === 4) a5++; else if (mine === 3) a4++; }
      if (!mine) { def += DW[opp + 1]; if (opp === 4) d5++; else if (opp === 3) d4++; }
    }
    return { att, def, a5, d5, a4, d4 };
  }
  function candidates(V) {
    const N = V.N, out = [], seen = new Uint8Array(N * N);
    let any = false;
    for (let i = 0; i < N * N; i++) if (V.own[i] >= 0) {
      any = true;
      const r0 = Math.floor(i / N), c0 = i % N;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const r = r0 + dr, c = c0 + dc; if (r < 0 || r >= N || c < 0 || c >= N) continue;
        const j = r * N + c; if (V.own[j] < 0 && !seen[j]) { seen[j] = 1; out.push(j); }
      }
    }
    if (!any) { const m = Math.floor(N / 2); out.push(m * N + m); }
    return out;
  }
  // 후보마다 값 (own = 믿는 판)
  function rankWith(V, own, s, P) {
    const rows = [];
    for (const i of candidates(V)) {
      const sc = scoreAt(own, V.N, i, s);
      rows.push(Object.assign({ p: i, v: sc.att + P.def * sc.def }, sc));
    }
    rows.sort((x, y) => y.v - x.v || x.p - y.p);
    return rows;
  }
  // 고급: 위 후보 몇 개는 상대의 가장 좋은 대답까지 봄
  function lookAhead(V, own, s, P, rows) {
    const win = rows.find(r => r.a5); if (win) return win;           // 5목이 먼저, 그다음 5목 막기 (막기 값이 겹쳐 커져도)
    const blk = rows.find(r => r.d5); if (blk) return blk;
    const top = rows.slice(0, P.look);
    let best = null, bv = -Infinity;
    for (const r of top) {
      own[r.p] = s;
      let rep = 0;
      for (const j of candidates(Object.assign({}, V, { own }))) {
        if (own[j] >= 0) continue;
        const sc = scoreAt(own, V.N, j, 1 - s); const v = sc.att + 0.9 * sc.def;
        if (v > rep) rep = v;
      }
      own[r.p] = -1;
      const v = r.v - 0.55 * rep;
      if (v > bv) { bv = v; best = r; }
    }
    return best || rows[0];
  }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const keyOf = (V, s) => hash(JSON.stringify([V.own, V.col, V.gi, s]));
  // 흑의 색: 고급은 둘레 돌에 가장 많은 색 (헷갈리게), 나머지는 아무 색
  function pickColor(V, p, P, R) {
    if (P.mem) return Math.floor(R() * NC) % NC;
    const N = V.N, r0 = Math.floor(p / N), c0 = p % N, cnt = Array(NC).fill(0);
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = r0 + dr, c = c0 + dc; if (r < 0 || r >= N || c < 0 || c >= N) continue;
      const k = V.col[r * N + c]; if (k >= 0) cnt[k]++;
    }
    let b = Math.floor(R() * NC), bv = -1;
    for (let k = 0; k < NC; k++) { const j = (b + k) % NC; if (cnt[j] > bv) { bv = cnt[j]; b = j; } }
    return b;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P.mem ? (typeof rnd === "function" ? rnd : seeded(keyOf(V, s))) : seeded(keyOf(V, s));
    const own = belief(V, s, P);
    const rows = rankWith(V, own, s, P);
    let pick;
    if (P.look) pick = lookAhead(V, own, s, P, rows);
    else {
      const fives = rows.filter(r => r.a5);
      if (fives.length && R() < (P.top > 3 ? 0.8 : 1)) pick = fives[0];
      else {
        let bv = -Infinity;
        for (const r of rows.slice(0, P.top)) { const v = r.v * (1 + (R() - 0.5) * 2 * P.noise); if (v > bv) { bv = v; pick = r; } }
      }
    }
    if (!pick) return null;
    return { t: "put", p: pick.p, c: s === V.black ? pickColor(V, pick.p, P, R) : V.lastC, N: V.N };
  }
  function ai(V, s, tier, rnd) { return aiWith(V, s, PROF[tier] || PROF.normal, rnd); }

  // 추천 = 고급 AI 의 수 그대로 + 까닭 (완벽히 기억한다고 보고)
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const a = aiWith(V, s, PROF.hard);
    if (!a) return null;
    const sc = scoreAt(V.own, V.N, a.p, s);
    const tag = sc.a5 ? "win" : sc.d5 ? "block5" : sc.a4 >= 2 ? "four" : sc.d4 >= 2 ? "block3" : sc.a4 ? "four1" : "build";
    return Object.assign({ a, tag }, sc);
  }
  // p 가 지금 판에서 한 수로 5목이 되는 자리
  function fivesFor(own, N, p) {
    const out = [];
    for (let i = 0; i < N * N; i++) if (own[i] < 0) { own[i] = p; if (lineAt(own, N, i, p)) out.push(i); own[i] = -1; }
    return out;
  }
  // p 의 가장 긴 줄 (이어진 돌 수)
  function longest(own, N, p) {
    let best = 0;
    for (let i = 0; i < N * N; i++) if (own[i] === p) {
      const r0 = Math.floor(i / N), c0 = i % N;
      for (const [dr, dc] of DIRS) {
        const pr = r0 - dr, pc = c0 - dc;
        if (pr >= 0 && pr < N && pc >= 0 && pc < N && own[pr * N + pc] === p) continue;
        let k = 0, r = r0, c = c0; while (r >= 0 && r < N && c >= 0 && c < N && own[r * N + c] === p) { k++; r += dr; c += dc; }
        if (k > best) best = k;
      }
    }
    return best;
  }
  // 이 사람이 지금까지 헷갈렸을 돌 수 (AI 기억 모형 기준, 선생님 설명용)
  const mixedUp = (V, s, tier) => { const b = belief(V, s, PROF[tier]); let k = 0; for (let i = 0; i < b.length; i++) if (b[i] !== V.own[i]) k++; return k; };

  return {
    id: "blindomok", COLS, NC, LET, DIRS, OPTS, PROF, AW, DW, cellName, optsOf, winsOf, lineAt, check,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, belief, scoreAt, candidates, rankWith, fivesFor, longest, mixedUp,
  };
});

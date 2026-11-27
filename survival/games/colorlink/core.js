/* 베니 서바이벌 · 컬러 링크 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 · 7일차 결승 2회전 (장동민 vs 현경렬) — 나무위키 '데블스 플랜: 데드 어게인/7일차' 룰 + 영상 자막(마지막 라운드 풀이 해설) 확인
   · 둘이서 하는 5라운드, 먼저 3점. 라운드마다 다른 판(벽 · 미리 놓인 말이 있음). 색마다 말 2개 (14색 28개 — A~L · 검정 X · 흰색 Y)
   · 선공은 말 1개, 그다음부터 번갈아 서로 다른 색 2개를 놓음 (제한 3분, 못 놓으면 그 라운드 패). 1라운드 선후공은 동전, 다음부터는 진 사람이 고름
   · 같은 색 두 말은 서로 겹치지 않는 길(칸을 이은 선)로 이어져야 하고 길 하나는 시작 · 끝 칸까지 합쳐 최소 6칸. 다른 색 말 · 벽 칸은 밟을 수 없음
   · 상대가 놓은 뒤 '이을 수 없다'고 보면 불가능 선언 → 마지막에 놓은 사람이 5분 안에 모든 색을 겹치지 않게 이어 증명 (한 개만 놓인 색은 짝도 놓아서)
     증명 성공 = 증명한 사람 1점, 실패 = 선언한 사람 1점
   방송과 다른 점 · 우리가 정한 것: 판 크기 · 벽 · 미리 놓인 말은 방송 화면을 못 구해 우리가 만든 판 (라운드마다 생성기로 만들고 처음 판은 반드시 풀 수 있음) ·
     판은 7×7 에서 9×9 까지 · 놓을 수 있는 말은 이 라운드에 쓰는 6~8색 · 놓을 말이 모자라 못 놓으면 '불가능 선언'만 할 수 있음 ·
     시간 제한(3분 · 5분)은 옵션 (기본 끔) · 4번의 선언 전 아무도 안 놓았으면 선언 불가
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 view 에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).colorlink = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MINLEN = 6, WIN = 3, ROUNDS = 5, NCOL = 14;
  // 색 14개: A~L 열두 개 + 검정 X · 흰색 Y (방송 영상: 빨강 A · 청록 F · 흑 X · 백 Y)
  const COLORS = [
    { l: "A", n: "빨강", h: "#ef4444" }, { l: "B", n: "주황", h: "#f97316" }, { l: "C", n: "노랑", h: "#facc15" }, { l: "D", n: "초록", h: "#22c55e" },
    { l: "E", n: "연두", h: "#a3e635" }, { l: "F", n: "청록", h: "#14b8a6" }, { l: "G", n: "하늘", h: "#38bdf8" }, { l: "H", n: "파랑", h: "#3b6df6" },
    { l: "I", n: "보라", h: "#a855f7" }, { l: "J", n: "분홍", h: "#f472b6" }, { l: "K", n: "갈색", h: "#a16207" }, { l: "L", n: "자홍", h: "#be185d" },
    { l: "X", n: "검정", h: "#111827" }, { l: "Y", n: "흰색", h: "#f8fafc" },
  ];
  // 라운드별 판: 크기 · 쓰는 색 수 · 벽 칸 수 · 처음부터 짝이 다 놓인 색 · 한 개만 놓인 색
  const SPEC = [
    { W: 7, H: 7, K: 6, walls: 4, full: 2, single: 0 },
    { W: 8, H: 7, K: 6, walls: 5, full: 2, single: 1 },
    { W: 8, H: 8, K: 7, walls: 6, full: 2, single: 1 },
    { W: 9, H: 8, K: 7, walls: 7, full: 3, single: 1 },
    { W: 9, H: 9, K: 8, walls: 9, full: 3, single: 1 },
  ];
  const LIM_PLACE = 180, LIM_PROVE = 300;
  const OPTS = { limit: [0, 1] };
  function optsOf(cfg) { const o = {}; for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; } return o; }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 300) st.log.shift(); }
  const cname = k => (COLORS[k] ? `${COLORS[k].n} ${COLORS[k].l}` : "?");

  // ── 판 기하 ──
  const NBC = {};
  function nbOf(W, H) {
    const key = W * 100 + H;
    if (NBC[key]) return NBC[key];
    const o = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = []; if (y > 0) a.push((y - 1) * W + x); if (x > 0) a.push(y * W + x - 1); if (x < W - 1) a.push(y * W + x + 1); if (y < H - 1) a.push((y + 1) * W + x);
      o.push(a);
    }
    return (NBC[key] = o);
  }
  const cname2 = (W, c) => `${String.fromCharCode(65 + (c % W))}${((c / W) | 0) + 1}`;
  const manh = (W, a, b) => Math.abs((a % W) - (b % W)) + Math.abs(((a / W) | 0) - ((b / W) | 0));
  // 두 말을 잇는 길의 최소 칸 수 (칸 수 = 모서리 수 + 1, 격자라서 모서리 수의 홀짝은 거리와 같음)
  function minCells(W, a, b) { const m = manh(W, a, b); return (m + 1) % 2 === 0 ? Math.max(MINLEN, m + 1) : Math.max(MINLEN + 1, m + 1); }

  // ═══ 풀이기 ═══════════════════════════════════════════════════
  // pieces = [{c, k}] (색 k 가 1개면 짝은 어디든 놓을 수 있음). 반환 { res: 1 풀림(paths) · 0 불가능 확정 · -1 모름(예산 초과), nodes }
  function solve(W, H, wall, pieces, budget) {
    const n = W * H, nb = nbOf(W, H);
    const byK = new Map();
    for (const p of pieces) { if (!byK.has(p.k)) byK.set(p.k, []); byK.get(p.k).push(p.c); }
    const cols = [];
    for (const [k, cs] of byK) cols.push({ k, a: cs[0], b: cs.length > 1 ? cs[1] : -1, done: false, path: null });
    cols.sort((x, y) => x.k - y.k);
    if (!cols.length) return { res: 1, paths: {}, nodes: 0 };
    const blk = new Uint8Array(n);
    for (let c = 0; c < n; c++) if (wall[c]) blk[c] = 1;
    for (const p of pieces) blk[p.c] = 2;
    let nodes = 0, aborted = false;
    const comp = new Int32Array(n), stk = new Int32Array(n), mark = new Int32Array(n);
    let mk = 0;
    const freeDeg = c => { let d = 0; for (const v of nb[c]) if (blk[v] === 0) d++; return d; };
    // 남은 색마다 쓸 수 있는 빈 구역이 있고 칸이 모자라지 않는가 (필요 조건만 — 풀 수 있는 판을 거절하지 않음)
    function prune() {
      comp.fill(-1);
      const sizes = []; let nc = 0, total = 0;
      for (let c = 0; c < n; c++) {
        if (blk[c] !== 0 || comp[c] >= 0) continue;
        let sp = 0, sz = 0; stk[sp++] = c; comp[c] = nc;
        while (sp) { const u = stk[--sp]; sz++; for (const v of nb[u]) if (blk[v] === 0 && comp[v] < 0) { comp[v] = nc; stk[sp++] = v; } }
        sizes.push(sz); total += sz; nc++;
      }
      const forced = new Array(nc).fill(0); let need = 0;
      for (const co of cols) {
        if (co.done) continue;
        const A = []; for (const v of nb[co.a]) if (blk[v] === 0 && !A.includes(comp[v])) A.push(comp[v]);
        if (co.b < 0) { need += MINLEN - 1; if (!A.some(ci => sizes[ci] >= MINLEN - 1)) return false; continue; }
        const it = minCells(W, co.a, co.b) - 2, cc = [];
        for (const v of nb[co.b]) if (blk[v] === 0 && A.includes(comp[v]) && sizes[comp[v]] >= it && !cc.includes(comp[v])) cc.push(comp[v]);
        if (!cc.length) return false;
        need += it;
        if (cc.length === 1) forced[cc[0]] += it;
      }
      for (let i = 0; i < nc; i++) if (forced[i] > sizes[i]) return false;
      return need <= total;
    }
    // v 에서 도착 칸 b 까지 빈 칸으로 닿을 수 있는가
    function reach(v, b) {
      mk++; let sp = 0; stk[sp++] = v; mark[v] = mk;
      while (sp) { const u = stk[--sp]; for (const w of nb[u]) { if (w === b) return true; if (blk[w] === 0 && mark[w] !== mk) { mark[w] = mk; stk[sp++] = w; } } }
      return false;
    }
    function route() {
      let best = null, bs = 1e9;
      for (const co of cols) { if (co.done) continue; const sc = freeDeg0(co.a) + (co.b >= 0 ? freeDeg0(co.b) : 5); if (sc < bs) { bs = sc; best = co; } }
      if (!best) return true;
      best.done = true;
      const ok = walk(best, best.a, 1, [best.a]);
      if (!ok) best.done = false;
      return ok;
    }
    const freeDeg0 = c => { let d = 0; for (const v of nb[c]) if (blk[v] === 0) d++; return d; };
    function finish(co, path) {
      co.path = path.slice();
      if (prune() && route()) return true;
      co.path = null;
      return false;
    }
    function walk(co, cur, len, path) {
      if (++nodes > budget) { aborted = true; return false; }
      const cand = [];
      for (const v of nb[cur]) {
        if (co.b >= 0 && v === co.b) { if (len + 1 >= MINLEN) cand.push(v); continue; }
        if (blk[v] === 0) cand.push(v);
      }
      if (co.b >= 0 && cand.length > 1) {
        const key = v => { if (v === co.b) return -99; const d = manh(W, v, co.b), est = len + 1 + d; return est >= MINLEN ? d * 4 + freeDeg0(v) : -d * 4 + freeDeg0(v) + 40; };
        cand.sort((p, q) => key(p) - key(q) || p - q);
      } else if (co.b < 0 && cand.length > 1) cand.sort((p, q) => freeDeg0(p) - freeDeg0(q) || p - q);
      for (const v of cand) {
        if (v === co.b) { path.push(v); if (finish(co, path)) return true; path.pop(); if (aborted) return false; continue; }
        blk[v] = 3; path.push(v);
        if (co.b < 0) {
          if (len + 1 >= MINLEN) { if (finish(co, path)) return true; }
          else if (walk(co, v, len + 1, path)) return true;
        } else if (reach(v, co.b) && walk(co, v, len + 1, path)) return true;
        path.pop(); blk[v] = 0;
        if (aborted) return false;
      }
      return false;
    }
    if (!prune()) return { res: 0, paths: null, nodes };
    const ok = route();
    if (ok) { const paths = {}; for (const co of cols) paths[co.k] = co.path.slice(); return { res: 1, paths, nodes }; }
    return { res: aborted ? -1 : 0, paths: null, nodes };
  }

  // 증명 확인: paths = { 색: [칸…] } — 놓인 색마다 겹치지 않는 6칸 이상의 길 (한 개만 놓인 색은 끝 칸이 빈 칸 = 짝을 놓는 자리)
  function checkProof(W, H, wall, grid, paths) {
    if (!paths || typeof paths !== "object") return "이은 길이 없어요";
    const n = W * H, nb = nbOf(W, H), used = new Uint8Array(n), need = Object.create(null);
    for (let c = 0; c < n; c++) if (grid[c] >= 0) (need[grid[c]] = need[grid[c]] || []).push(c);
    for (const k of Object.keys(paths)) if (!(k in need)) return `${COLORS[k] ? cname(k) : "?"}은 놓이지 않은 색이에요`;
    for (const k of Object.keys(need)) {
      const p = paths[k], ps = need[k];
      if (!Array.isArray(p) || !p.length) return `${cname(k)}을 이어요`;
      if (p.length < MINLEN) return `${cname(k)} 길이 ${p.length}칸이에요 — 최소 ${MINLEN}칸`;
      for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (!Number.isInteger(c) || c < 0 || c >= n) return "칸이 이상해요";
        if (used[c]) return `${cname(k)} 길이 다른 길과 겹쳐요 (${cname2(W, c)})`;
        used[c] = 1;
        if (i > 0 && !nb[p[i - 1]].includes(c)) return `${cname(k)} 길이 끊겨 있어요`;
        if (wall[c]) return `${cname(k)} 길이 벽을 지나요`;
        const end = i === 0 || i === p.length - 1;
        if (grid[c] >= 0 && !(end && grid[c] === +k)) return `${cname(k)} 길이 다른 말(${cname2(W, c)})을 밟아요`;
      }
      if (grid[p[0]] !== +k) return `${cname(k)} 길은 그 색 말에서 시작해요`;
      if (ps.length === 2) { if (grid[p[p.length - 1]] !== +k || p[0] === p[p.length - 1]) return `${cname(k)} 길이 짝에 닿지 않아요`; }
      else if (grid[p[p.length - 1]] >= 0) return `${cname(k)} 길이 이상해요`;
    }
    return "";
  }

  // ── 판 만들기 ──
  function genBoard(rs, r) {
    const P = SPEC[r], W = P.W, H = P.H, n = W * H, nb = nbOf(W, H);
    for (let att = 0; att < 60; att++) {
      const R = seeded(Math.floor(mix(rs, 4000 + r, att) * 4294967296) >>> 0), pick = a => a[Math.floor(R() * a.length) % a.length];
      const wall = Array(n).fill(0);
      for (let i = 0; i < P.walls; i++) { for (let t = 0; t < 20; t++) { const c = Math.floor(R() * n) % n; if (!wall[c]) { wall[c] = 1; break; } } }
      if (r >= 2 && att < 40) {                                  // 가운데에 짧은 벽 한 줄 (방송 판의 가림막)
        const horiz = R() < 0.5, len = 3 + (R() < 0.5 ? 1 : 0), sx = Math.floor(R() * (horiz ? W - len + 1 : W)), sy = Math.floor(R() * (horiz ? H : H - len + 1));
        for (let i = 0; i < len; i++) wall[(horiz ? sy : sy + i) * W + (horiz ? sx + i : sx)] = 1;
      }
      const ids = []; for (let k = 0; k < NCOL; k++) ids.push(k);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
      const cols = ids.slice(0, P.K).sort((a, b) => a - b), plan = ids.slice(0, P.K);
      const used = wall.slice(), pre = [];
      let okAll = true;
      for (let i = 0; i < P.full + P.single && okAll; i++) {
        const k = plan[i], L = 6 + Math.floor(R() * 3);
        let done = false;
        for (let t = 0; t < 60 && !done; t++) {
          const free = []; for (let c = 0; c < n; c++) if (!used[c]) free.push(c);
          if (!free.length) break;
          const walkP = [pick(free)], seen = new Set(walkP);
          while (walkP.length < L) {
            const cur = walkP[walkP.length - 1], opts = nb[cur].filter(v => !used[v] && !seen.has(v));
            if (!opts.length) break;
            const v = pick(opts); walkP.push(v); seen.add(v);
          }
          if (walkP.length < L) continue;
          for (const c of walkP) used[c] = 1;
          pre.push({ c: walkP[0], k }); if (i < P.full) pre.push({ c: walkP[walkP.length - 1], k });
          done = true;
        }
        if (!done) okAll = false;
      }
      if (!okAll) continue;
      const grid = Array(n).fill(-1); for (const p of pre) grid[p.c] = p.k;
      const chk = solve(W, H, wall, pieceList(null, grid), 30000);
      if (chk.res !== 1) continue;
      return { W, H, wall, cols, grid, pre: pre.map(p => p.c) };
    }
    return null;
  }

  // ── 진행 ──
  function startRound(st) {
    const b = genBoard(st.rs, st.round) || genBoard(st.rs + 1, st.round);
    st.W = b.W; st.H = b.H; st.wall = b.wall; st.cols = b.cols; st.grid = b.grid; st.pre = b.pre;
    st.stock = Array(NCOL).fill(0);
    for (const k of st.cols) st.stock[k] = 2;
    for (const c of st.pre) st.stock[st.grid[c]]--;
    st.nPlace = 0; st.lastPlacer = -1; st.decl = -1; st.prover = -1; st.proof = null; st.rres = null;
  }
  function init({ n, seed, cfg }) {
    void n;
    const o = optsOf(cfg || {}), rs = (seed >>> 0) || 1;
    const st = { n: 2, rs, cfg: Object.assign({}, cfg || {}), opt: o, round: 0, scores: [0, 0], first: mix(rs, 31) < 0.5 ? 0 : 1, phase: "place", cur: 0, chooser: -1,
      W: 0, H: 0, wall: [], cols: [], grid: [], pre: [], stock: [], nPlace: 0, lastPlacer: -1, decl: -1, prover: -1, proof: null, rres: null, over: false, res: null, log: [], seq: 0 };
    startRound(st);
    st.cur = st.first;
    push(st, { k: "round", r: 0, first: st.first, coin: 1 });
    return st;
  }
  const stockKinds = st => st.cols.filter(k => st.stock[k] > 0);
  function needCount(st) { const d = stockKinds(st).length; return st.nPlace === 0 ? Math.min(1, d) : Math.min(2, d); }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "place") return [st.cur];
    if (st.phase === "prove") return [st.prover];
    if (st.phase === "choose") return [st.chooser];
    return [];
  }
  const over = st => !!st.over;
  function ranks(st) { if (!st.over) return [0, 0]; return st.scores[0] > st.scores[1] ? [0, 1] : st.scores[1] > st.scores[0] ? [1, 0] : [0, 0]; }
  const auto = st => (!st.over && st.phase === "show" ? 5200 : null);
  function endRound(st, w, why) {
    st.scores[w]++;
    st.rres = { w, why, r: st.round, scores: st.scores.slice() };
    push(st, { k: "rend", r: st.round, w, why });
    st.cur = -1;
    if (st.scores[w] >= WIN || st.round >= ROUNDS - 1) { st.over = true; st.phase = "end"; st.res = { w: st.scores[0] > st.scores[1] ? 0 : 1, why }; push(st, { k: "end", w: st.res.w }); }
    else st.phase = "show";
  }
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    const w = st.rres.w;
    st.round++; startRound(st);
    st.chooser = 1 - w; st.cur = -1; st.phase = "choose";
    push(st, { k: "round", r: st.round, chooser: st.chooser });
  }
  const pieceList = (st, grid) => { const o = []; for (let c = 0; c < grid.length; c++) if (grid[c] >= 0) o.push({ c, k: grid[c] }); return o; };

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "choose") {
      if (a.t !== "first") return { ok: false, err: "먼저 할지 나중에 할지 골라요" };
      st.first = a.mine ? seat : 1 - seat; st.cur = st.first; st.phase = "place";
      push(st, { k: "first", s: seat, mine: !!a.mine, first: st.first });
      return { ok: true };
    }
    if (st.phase === "place") {
      if (a.t === "timeout") {
        if (!st.opt.limit) return { ok: false, err: "시간 제한이 꺼져 있어요" };
        push(st, { k: "timeout", s: seat, ph: "place" });
        endRound(st, 1 - seat, "time");
        return { ok: true };
      }
      if (a.t === "declare") {
        if (st.lastPlacer < 0) return { ok: false, err: "아직 아무도 말을 놓지 않았어요" };
        st.decl = seat; st.prover = st.lastPlacer; st.phase = "prove";
        push(st, { k: "declare", s: seat, to: st.prover });
        return { ok: true };
      }
      if (a.t !== "place") return { ok: false, err: "말을 놓거나 불가능을 선언해요" };
      const need = needCount(st);
      if (!need) return { ok: false, err: "놓을 말이 없어요 — 불가능을 선언해요" };
      const put = a.put;
      if (!Array.isArray(put) || put.length !== need) return { ok: false, err: `서로 다른 색 ${need}개를 놓아요` };
      const ks = new Set(), cs = new Set(), n = st.W * st.H;
      for (const p of put) {
        if (!p || !Number.isInteger(p.c) || !Number.isInteger(p.k)) return { ok: false, err: "놓는 곳이 이상해요" };
        if (p.c < 0 || p.c >= n || st.wall[p.c] || st.grid[p.c] >= 0) return { ok: false, err: "빈 칸에만 놓을 수 있어요" };
        if (!st.cols.includes(p.k) || st.stock[p.k] < 1) return { ok: false, err: "놓을 수 없는 색이에요" };
        if (ks.has(p.k)) return { ok: false, err: "서로 다른 색을 놓아요" };
        if (cs.has(p.c)) return { ok: false, err: "같은 칸에 둘을 놓을 수 없어요" };
        ks.add(p.k); cs.add(p.c);
      }
      for (const p of put) { st.grid[p.c] = p.k; st.stock[p.k]--; }
      st.nPlace++; st.lastPlacer = seat; st.cur = 1 - seat;
      push(st, { k: "place", s: seat, put: put.map(p => ({ c: p.c, k: p.k })) });
      return { ok: true };
    }
    if (st.phase === "prove") {
      if (a.t === "timeout") {
        if (!st.opt.limit) return { ok: false, err: "시간 제한이 꺼져 있어요" };
        push(st, { k: "timeout", s: seat, ph: "prove" });
        endRound(st, st.decl, "time");
        return { ok: true };
      }
      if (a.t === "giveup") { st.proof = { s: seat, ok: false, paths: {} }; push(st, { k: "proof", s: seat, ok: false, give: 1 }); endRound(st, st.decl, "giveup"); return { ok: true }; }
      if (a.t !== "prove") return { ok: false, err: "이은 길을 내요" };
      const e = checkProof(st.W, st.H, st.wall, st.grid, a.paths);
      if (e) return { ok: false, err: e };
      const paths = {}; for (const k of Object.keys(a.paths)) paths[k] = a.paths[k].slice();
      st.proof = { s: seat, ok: true, paths };
      push(st, { k: "proof", s: seat, ok: true });
      endRound(st, seat, "proved");
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }

  // 놓을 수 있는 수 하나 (시험 · 막힌 AI 용)
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "choose") return [{ t: "first", mine: true }];
    if (st.phase === "prove") return [{ t: "giveup" }];
    if (st.phase !== "place") return [];
    const out = [], need = needCount(st), ks = stockKinds(st), em = []; for (let c = 0; c < st.grid.length; c++) if (!st.wall[c] && st.grid[c] < 0) em.push(c);
    if (st.lastPlacer >= 0) out.push({ t: "declare" });
    if (need && em.length >= need) out.push({ t: "place", put: [{ c: em[0], k: ks[0] }].concat(need > 1 ? [{ c: em[1], k: ks[1] }] : []) });
    return out;
  }

  // ── 보이는 것 (숨은 정보 없음 — 판은 모두에게 보임) ──
  function pubKey(st) { return JSON.stringify([st.round, st.phase, st.cur, st.grid, st.stock, st.nPlace, st.lastPlacer, st.decl, st.scores, st.over, st.proof ? [st.proof.s, st.proof.ok] : 0, st.rres && st.rres.w, st.first]); }
  function view(st, seat) {
    const need = st.phase === "place" ? needCount(st) : 0;
    return {
      n: 2, W: st.W, H: st.H, round: st.round + 1, rounds: ROUNDS, win: WIN, scores: st.scores.slice(), score: st.scores.slice(), phase: st.phase, cur: st.phase === "place" && !st.over ? st.cur : -1,
      first: st.first, opt: Object.assign({}, st.opt), wall: st.wall.slice(), grid: st.grid.slice(), pre: st.pre.slice(), cols: st.cols.slice(), stock: st.stock.slice(),
      nPlace: st.nPlace, lastPlacer: st.lastPlacer, need, canDeclare: st.phase === "place" && st.lastPlacer >= 0 && !st.over, decl: st.decl, prover: st.prover, chooser: st.chooser,
      proof: st.proof ? { s: st.proof.s, ok: st.proof.ok, paths: JSON.parse(JSON.stringify(st.proof.paths)) } : null, rres: st.rres ? JSON.parse(JSON.stringify(st.rres)) : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? Object.assign({}, st.res) : null, log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(pubKey(st)).toString(36),
    };
  }

  // ═══ AI ═══════════════════════════════════════════════════════
  const PROF = {
    easy: { total: 6000, cand: 3, check: 0.45, sbud: 500, dbud: 600, decl: 0.55, falseDecl: 0.04, sq: 0, pbud: 1500, mist: 0.35 },
    normal: { total: 7000, cand: 8, check: 1, sbud: 1500, dbud: 3000, decl: 0.9, falseDecl: 0, sq: 0, pbud: 8000, mist: 0 },
    hard: { total: 12000, cand: 12, check: 1, sbud: 3000, dbud: 8000, decl: 1, falseDecl: 0, sq: 5, pbud: 30000, mist: 0 },
  };
  const solveV = (V, grid, bud) => solve(V.W, V.H, V.wall, pieceList(V, grid), bud);
  // 한 번의 ai() 가 쓸 수 있는 탐색 총량 (시계가 아니라 탐색 횟수로 잘라 같은 판 = 같은 수)
  const solveL = (V, g, per, lim) => { const r = solveV(V, g, Math.max(60, Math.min(per, lim.left))); lim.left -= r.nodes; return r; };
  const keyOf = (V, s, k) => hash(JSON.stringify([V.pub, s, k]));
  const emptiesOf = V => { const o = []; for (let c = 0; c < V.grid.length; c++) if (!V.wall[c] && V.grid[c] < 0) o.push(c); return o; };
  function sample(R, V, need, kinds, empt, stockLeft) {
    const ks = kinds.slice(), cs = empt.slice(), put = [];
    for (let i = 0; i < need; i++) {
      if (!ks.length || !cs.length) return null;
      const ki = Math.floor(R() * ks.length) % ks.length, ci = Math.floor(R() * cs.length) % cs.length;
      put.push({ c: cs[ci], k: ks[ki] }); ks.splice(ki, 1); cs.splice(ci, 1);
    }
    void stockLeft;
    return put;
  }
  function withPut(V, put) { const g = V.grid.slice(); for (const p of put) g[p.c] = p.k; return g; }
  // 다음 사람이 두 말을 놓았을 때 풀리는 비율 (표본) — 낮을수록 상대가 안전한 수를 찾기 어려워요
  function squeeze(V, put, g, R, M, bud, lim) {
    const V2 = { W: V.W, H: V.H, wall: V.wall, grid: g }, st2 = V.stock.slice();
    for (const p of put) st2[p.k]--;
    const kinds = V.cols.filter(k => st2[k] > 0), empt = []; for (let c = 0; c < g.length; c++) if (!V.wall[c] && g[c] < 0) empt.push(c);
    const need = Math.min(2, kinds.length); if (!need) return 0;     // 상대가 놓을 말이 없음 → 선언뿐 (가장 좋음)
    let ok = 0;
    for (let i = 0; i < M; i++) { const p2 = sample(R, V, need, kinds, empt); if (!p2) return 1; if (lim.left <= 0) return ok / Math.max(1, i + 1); if (solveL(V2, withPut(V2, p2), bud, lim).res === 1) ok++; }
    return ok / M;
  }
  function aiPlace(V, s, P, R, tier) {
    const need = V.need, kinds = V.cols.filter(k => V.stock[k] > 0), empt = emptiesOf(V), lim = { left: P.total };
    // ① 선언: 지금 판이 풀리지 않는다고 확정되면 (초급은 놓치기도 하고 가끔 괜히 선언)
    if (V.canDeclare) {
      const r = solveL(V, V.grid, P.dbud, lim);
      if (r.res === 0 && (R() < P.decl || !need)) return { t: "declare" };
      if (r.res !== 0 && P.falseDecl && R() < P.falseDecl && empt.length < V.W * V.H * 0.45) return { t: "declare" };
    }
    if (!need) return V.canDeclare ? { t: "declare" } : { t: "timeout" };
    // ② 놓기: 후보를 뽑아 풀리는지 확인 (초급은 가끔 안 보고 놓음)
    if (P.check < 1 && R() >= P.check) { const put = sample(R, V, need, kinds, empt); if (put) return { t: "place", put }; }
    const safe = [], want = P.sq ? 6 : 1;
    for (let i = 0; i < P.cand + 14 && safe.length < want && lim.left > 0; i++) {
      if (i >= P.cand && safe.length) break;
      const put = sample(R, V, need, kinds, empt); if (!put) break;
      const g = withPut(V, put), r = solveL(V, g, P.sbud, lim);
      if (r.res === 1) safe.push({ put, g });
    }
    if (!safe.length) {
      // 안전한 수를 못 찾음: 풀 수 있는 판일 거라 믿고 '불가능 확정'이 아닌 수를 고름
      for (let i = 0; i < 12; i++) { const put = sample(R, V, need, kinds, empt); if (!put) break; if (solveL(V, withPut(V, put), P.sbud * 2, { left: 3000 }).res !== 0) return { t: "place", put }; }
      const put = sample(R, V, need, kinds, empt); return put ? { t: "place", put } : { t: V.canDeclare ? "declare" : "timeout" };
    }
    if (!P.sq || safe.length === 1) return { t: "place", put: safe[0].put };
    let best = safe[0], bv = 9;
    for (const c of safe) { const v = squeeze(V, c.put, c.g, seeded(keyOf(V, s, 9) ^ (c.put[0].c * 31 + c.put[0].k)), P.sq, 700, lim); if (v < bv - 1e-9) { bv = v; best = c; } }
    void tier;
    return { t: "place", put: best.put };
  }
  function aiProve(V, s, P) {
    const r = solveV(V, V.grid, P.pbud);
    if (r.res === 1) { const paths = {}; for (const k of Object.keys(r.paths)) paths[k] = r.paths[k]; return { t: "prove", paths }; }
    return { t: "giveup" };
  }
  function ai(V, s, tier, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF[tier] || PROF.normal;
    const R = tier === "hard" ? seeded(keyOf(V, s, 3)) : typeof rnd === "function" ? rnd : seeded(keyOf(V, s, 5));
    if (V.phase === "choose") {
      // 판이 꽉 찰수록 마지막에 놓는 쪽이 유리 — 놓을 말 수의 홀짝으로 고름 (선공 1개, 이후 2개씩)
      const left = V.cols.reduce((a, k) => a + V.stock[k], 0), mineWin = left % 2 === 1;
      return { t: "first", mine: tier === "easy" ? R() < 0.5 : mineWin };
    }
    if (V.phase === "place") return aiPlace(V, s, P, R, tier);
    if (V.phase === "prove") return aiProve(V, s, P);
    return null;
  }

  // ── 선생님 · 복기가 쓰는 것 ──
  // 놓을 곳 하나의 평가 (고급 기준): 풀리는가 + 상대가 안전한 수를 찾을 확률(표본)
  function evalPut(V, put, bud) {
    const g = withPut(V, put), r = solveV(V, g, bud || 4000);
    return { res: r.res, nodes: r.nodes, g };
  }
  function boardInfo(V) {
    const n = V.W * V.H; let walls = 0, pcs = 0, free = 0;
    for (let c = 0; c < n; c++) { if (V.wall[c]) walls++; else if (V.grid[c] >= 0) pcs++; else free++; }
    const byK = {}; for (let c = 0; c < n; c++) if (V.grid[c] >= 0) (byK[V.grid[c]] = byK[V.grid[c]] || []).push(c);
    let need = 0; for (const k of Object.keys(byK)) { const ps = byK[k]; need += ps.length > 1 ? minCells(V.W, ps[0], ps[1]) - 2 : MINLEN - 1; }
    return { n, walls, pcs, free, need, colors: Object.keys(byK).length };
  }


  // 풀 수 없는 까닭 (선생님 · 복기 글용, 풀이기의 필요 조건과 같은 검사로 숫자를 말함)
  function unsatWhy(V) {
    const W = V.W, H = V.H, n = W * H, nb = nbOf(W, H), comp = Array(n).fill(-1), sizes = [];
    for (let c = 0; c < n; c++) {
      if (V.wall[c] || V.grid[c] >= 0 || comp[c] >= 0) continue;
      const id = sizes.length, stk = [c]; comp[c] = id; let sz = 0;
      while (stk.length) { const u = stk.pop(); sz++; for (const v of nb[u]) if (!V.wall[v] && V.grid[v] < 0 && comp[v] < 0) { comp[v] = id; stk.push(v); } }
      sizes.push(sz);
    }
    const byK = {}; for (let c = 0; c < n; c++) if (V.grid[c] >= 0) (byK[V.grid[c]] = byK[V.grid[c]] || []).push(c);
    let need = 0, total = sizes.reduce((a, b) => a + b, 0);
    for (const k of Object.keys(byK)) {
      const ps = byK[k], A = [...new Set(nb[ps[0]].filter(v => comp[v] >= 0).map(v => comp[v]))];
      if (ps.length < 2) { need += MINLEN - 1; if (!A.some(ci => sizes[ci] >= MINLEN - 1)) return `${cname(k)} 말 둘레에 빈 칸이 모자라 6칸 길을 못 만들어요`; continue; }
      const it = minCells(W, ps[0], ps[1]) - 2, B = nb[ps[1]].filter(v => comp[v] >= 0).map(v => comp[v]);
      if (!A.some(ci => B.includes(ci) && sizes[ci] >= it)) return `${cname(k)} 두 말을 이을 빈 칸이 막혔어요 (최소 ${it}칸 필요)`;
      need += it;
    }
    if (need > total) return `이으려면 빈 칸이 최소 ${need}칸 필요한데 ${total}칸뿐이에요`;
    return `빈 칸 ${total}칸 · 필요한 최소 ${need}칸이지만 길끼리 서로 막아서 겹치지 않게 놓을 방법이 없어요`;
  }

  return {
    id: "colorlink", MINLEN, WIN, ROUNDS, NCOL, COLORS, SPEC, LIM_PLACE, LIM_PROVE, OPTS, optsOf, cname, cname2, nbOf, manh, minCells,
    solve, checkProof, genBoard, unsatWhy, solveL, init, needs, apply, view, over, ranks, legal, auto, advance, ai, pieceList, evalPut, boardInfo, solveV, withPut, emptiesOf, squeeze, PROF, keyOf, seeded,
  };
});

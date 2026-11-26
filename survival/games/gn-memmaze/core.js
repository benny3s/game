/* 베니 서바이벌 · 기억의 미로 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 블랙가넷 (시즌 3) · 8화 데스매치 (김유현 vs 신아영) · 9화 데스매치 (하연주 vs 김유현) — 디글 클래식 「[#더지니어스3] 기억의 미로」 규칙 설명 확인
   · 가로 7 × 세로 7 정사각형 판 · 칸과 칸 사이에 보이지 않는 벽 32개 (끝날 때까지 안 보여 줌, 바닥에 표시 금지)
   · 두 사람은 아래쪽 양 모서리(출발점)에서 출발 · 도착점은 대각선 방향 위쪽 모서리 · 도착점까지의 최단 거리는 둘이 같음
   · 선 플레이어부터 번갈아 3칸씩 이동 (3칸보다 적게는 안 됨) · 가로 · 세로 아무 방향, 대각선 X · 왔던 칸으로 되돌아가도 됨 · 같은 칸에 같이 서도 됨
   · 이동 중 벽을 지나가면 이동 실패 → 그 즉시 출발점으로, 다음 턴은 출발점부터
   · 더블찬스 각자 2번: 그 턴의 이동이 6칸 (쓰면 꼭 6칸)
   · 대각선 방향의 도착점에 먼저 닿으면 승리 (닿는 순간 끝 — 남은 칸은 안 움직여도 됨)
   · 상대가 움직이는 길과 부딪힌 자리는 서로 다 보임 (방송: 같은 바닥에서 지켜봄 — 9화 하연주가 김유현이 찾은 길을 따라감)
   방송과 다른 점 · 우리가 정한 것: 방송 판 그림은 못 구해 미로는 판마다 씨앗으로 새로 만듦 (벽 32개 · 이어진 미로 · 최단 거리 같음 16~20칸 — 8화 판 최단 16칸 · 기준 탐색이 혼자 34턴 넘게 걸리거나 두 사람 차이가 8턴 넘는 막힌 미로는 뺌, 방송처럼 25턴 안팎에 끝나게) ·
     '9화 기록 판'(옵션)은 9화 이동 기록 49턴의 성공 · 실패 36곳에 맞추고 나머지 벽은 우리가 채움 ·
     선은 무작위 (방송: 지목당한 사람이 출발점 · 선을 고름) · 자리 0 = 왼쪽 출발 · 각자 60턴이 지나면 지금 자리에서 도착점까지 실제 거리가 짧은 쪽 승 (같으면 무승부)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 와 기록만 봄 — 벽은 못 봄). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-memmaze"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 7, NC = N * N, NE = 2 * N * (N - 1), WALLS = 32, STEP = 3, DSTEP = 6, DBL = 2, MAXT = 60, DMIN = 16, DMAX = 20, PMAX = 34, PGAP = 8;
  const LETX = "ABCDEFG";
  const X = i => i % N, Y = i => (i / N) | 0, at = (x, y) => y * N + x;
  const inb = (x, y) => x >= 0 && x < N && y >= 0 && y < N;
  const cellName = i => (i >= 0 && i < NC ? LETX[X(i)] + (Y(i) + 1) : "?");
  const S = [at(0, 0), at(N - 1, 0)], G = [at(N - 1, N - 1), at(0, N - 1)];   // 자리 0: 왼쪽 아래 → 오른쪽 위 · 자리 1: 오른쪽 아래 → 왼쪽 위
  // 칸 사이 번호: 가로 이웃 (x,y)-(x+1,y) = y*6+x (0..41) · 세로 이웃 (x,y)-(x,y+1) = 42 + y*7 + x (42..83)
  function eid(a, b) {
    if (!(a >= 0 && b >= 0 && a < NC && b < NC)) return -1;
    if (a > b) { const t = a; a = b; b = t; }
    if (b - a === 1 && Y(a) === Y(b)) return Y(a) * (N - 1) + X(a);
    if (b - a === N) return N * (N - 1) + Y(a) * N + X(a);
    return -1;
  }
  const ENDS = [];
  for (let e = 0; e < NE; e++) {
    if (e < N * (N - 1)) { const y = (e / (N - 1)) | 0, x = e % (N - 1); ENDS.push([at(x, y), at(x + 1, y)]); }
    else { const k = e - N * (N - 1), y = (k / N) | 0, x = k % N; ENDS.push([at(x, y), at(x, y + 1)]); }
  }
  const NB = Array.from({ length: NC }, (_, i) => [[0, 1], [1, 0], [0, -1], [-1, 0]].filter(([dx, dy]) => inb(X(i) + dx, Y(i) + dy)).map(([dx, dy]) => at(X(i) + dx, Y(i) + dy)));
  const NBE = NB.map((ns, i) => ns.map(n => eid(i, n)));
  const edgeName = e => (e >= 0 && e < NE ? `${cellName(ENDS[e][0])}–${cellName(ENDS[e][1])}` : "?");
  // 방향 (판 아래 = 1줄)
  function dirOf(a, b) { const dx = X(b) - X(a), dy = Y(b) - Y(a); return dy > 0 ? "up" : dy < 0 ? "down" : dx > 0 ? "right" : dx < 0 ? "left" : ""; }
  const DIRK = { up: "⬆ 위", down: "⬇ 아래", left: "⬅ 왼쪽", right: "➡ 오른쪽" };

  // ── 옵션 ──
  const OPTS = { help: [0, 1], map: [0, 9] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); }

  // ── 미로 ──
  function bfs(wall, s) {
    const d = Array(NC).fill(-1); d[s] = 0; const q = [s];
    for (let h = 0; h < q.length; h++) { const c = q[h]; NB[c].forEach((n, k) => { if (d[n] < 0 && !wall[NBE[c][k]]) { d[n] = d[c] + 1; q.push(n); } }); }
    return d;
  }
  // 무작위 신장 나무(크루스칼, 길 48) + 고리 4개 → 길 52 · 벽 32. forceOpen · forceWall 은 9화 기록 판을 찾을 때만
  function carve(r, forceOpen, forceWall) {
    const par = Array.from({ length: NC }, (_, i) => i), f = i => (par[i] === i ? i : (par[i] = f(par[i])));
    const open = Array(NE).fill(0), order = Array.from({ length: NE }, (_, e) => e);
    for (let i = NE - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    let n = 0;
    for (const e of forceOpen || []) { if (!open[e]) { open[e] = 1; n++; } par[f(ENDS[e][0])] = f(ENDS[e][1]); }
    for (const e of order) { if (open[e] || (forceWall && forceWall.has(e))) continue; const [a, b] = ENDS[e]; if (f(a) !== f(b)) { par[f(a)] = f(b); open[e] = 1; n++; } }
    for (const e of order) { if (n >= NE - WALLS) break; if (open[e] || (forceWall && forceWall.has(e))) continue; open[e] = 1; n++; }
    return n === NE - WALLS ? open.map(v => (v ? 0 : 1)) : null;
  }
  const fairOf = w => { const d0 = bfs(w, S[0]), d1 = bfs(w, S[1]); return { ok: !d0.some(v => v < 0) && d0[G[0]] === d1[G[1]], d: d0[G[0]] }; };
  // 기준 탐색: 모르는 칸 사이는 열렸다고 보고(값 3) 가장 짧은 길로 3칸씩 — 혼자 도착까지 걸리는 턴으로 미로가 너무 막혔는지 잼 (lim 턴을 넘으면 lim + 1)
  function probe(wall, me, lim) {
    const cost = new Int8Array(NE).fill(3), d = new Int16Array(NC);
    let pos = S[me];
    const L = lim || 120;
    for (let t = 1; t <= L; t++) {
      d.fill(9999); d[G[me]] = 0;                                        // 값이 1 · 3 뿐이라 칸 수 바구니로 (다익스트라와 같은 답)
      const bk = [[G[me]]];
      for (let x = 0; x < bk.length; x++) {
        const B = bk[x]; if (!B) continue;
        for (const u of B) {
          if (d[u] !== x) continue;
          const ns = NB[u], es = NBE[u];
          for (let k = 0; k < ns.length; k++) { const c = cost[es[k]]; if (c && x + c < d[ns[k]]) { d[ns[k]] = x + c; (bk[x + c] || (bk[x + c] = [])).push(ns[k]); } }
        }
      }
      let cur = pos, fail = false;
      for (let j = 0; j < STEP; j++) {
        let best = -1, bv = 1e9;
        const ns = NB[cur], es = NBE[cur];
        for (let k = 0; k < ns.length; k++) { const c = cost[es[k]]; if (c && c + d[ns[k]] < bv) { bv = c + d[ns[k]]; best = ns[k]; } }
        const e = eid(cur, best);
        if (wall[e]) { cost[e] = 0; fail = true; break; }
        cost[e] = 1; cur = best;
        if (cur === G[me]) return t;
      }
      pos = fail ? S[me] : cur;
    }
    return L + 1;
  }
  function genMaze(rs) {
    let any = null;
    for (let a = 0; a < 6000; a++) {
      const w = carve(seeded(hash(`maze|${rs}|${a}`)));
      if (!w) continue;
      const F = fairOf(w);
      if (!F.ok || F.d < DMIN || F.d > DMAX) continue;
      if (!any) any = w;
      const t0 = probe(w, 0, PMAX + 1); if (t0 > PMAX) continue;
      const t1 = probe(w, 1, PMAX + 1);
      if (Math.max(t0, t1) <= PMAX && Math.abs(t0 - t1) <= PGAP) return w;
    }
    return any;
  }
  // 9화 기록 판: 9화 49턴(하연주 25 · 김유현 24)의 성공한 칸 사이 23곳 · 부딪힌 벽 13곳에 맞추고 나머지는 carve 로 채움 (최단 거리 16칸 · 둘이 같음 · 기준 탐색 33 · 32턴)
  const EP9 = [1, 2, 4, 9, 12, 14, 15, 21, 27, 34, 37, 39, 42, 48, 49, 50, 53, 54, 57, 59, 61, 62, 63, 65, 67, 71, 72, 75, 77, 80, 81, 83];

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    void n;
    const o = optsOf(cfg || {}), rs = (seed >>> 0) || 1;
    const wl = o.map === 9 ? (() => { const w = Array(NE).fill(0); EP9.forEach(e => { w[e] = 1; }); return w; })() : genMaze(rs);
    const first = mix(rs, 31) < 0.5 ? 0 : 1;
    const st = { n: 2, rs, cfg: Object.assign({}, cfg || {}), opt: o, wall: wl, dist: fairOf(wl).d, first, turn: first, phase: "play",
      pos: S.slice(), dbl: [DBL, DBL], turns: [0, 0], fails: [0, 0], last: [null, null], log: [], seq: 0, over: false, res: null };
    push(st, { k: "start", first });
    return st;
  }
  function needs(st) { return st.over ? [] : [st.turn]; }
  const over = st => !!st.over;
  function ranks(st) { if (!st.over || !st.res) return [0, 0]; const w = st.res.w; return w < 0 ? [0, 0] : [w === 0 ? 0 : 1, w === 1 ? 0 : 1]; }
  const auto = () => null;
  function advance() {}

  // 경로 검사 (벽은 안 봄): 칸 번호 배열 · 이웃 칸 · 정확히 3칸 (더블 6칸) · 도착점에 닿으면 거기서 끝
  function checkPath(from, s, path, dbl) {
    const need = dbl ? DSTEP : STEP;
    if (!Array.isArray(path) || !path.length) return "갈 칸을 골라요";
    if (path.length > need) return `${need}칸까지만 움직여요`;
    let cur = from;
    for (let j = 0; j < path.length; j++) {
      const c = path[j];
      if (!Number.isInteger(c) || eid(cur, c) < 0) return "가로 · 세로로 한 칸씩 이어진 칸만 (대각선 X)";
      if (c === G[s] && j !== path.length - 1) return "도착점에 닿으면 거기서 끝나요";
      cur = c;
    }
    if (path.length < need && cur !== G[s]) return `${need}칸을 꼭 움직여요 (도착점에 닿을 때만 덜 가요)`;
    return "";
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object" || a.t !== "go") return { ok: false, err: "갈 길을 골라요" };
    const dbl = a.dbl === 1 || a.dbl === true ? 1 : 0;
    if (dbl && st.dbl[seat] <= 0) return { ok: false, err: "더블찬스를 다 썼어요" };
    const path = Array.isArray(a.path) ? a.path.map(v => +v) : null;
    const e0 = checkPath(st.pos[seat], seat, path, dbl); if (e0) return { ok: false, err: e0 };
    const from = st.pos[seat];
    let cur = from, fail = -1, goal = false;
    for (let j = 0; j < path.length; j++) {
      if (st.wall[eid(cur, path[j])]) { fail = j; break; }
      cur = path[j];
      if (cur === G[seat]) { goal = true; break; }
    }
    if (dbl) st.dbl[seat]--;
    st.turns[seat]++;
    const ev = { k: "go", s: seat, t: st.turns[seat], from, path: fail >= 0 ? path.slice(0, fail + 1) : path.slice(), fail, dbl, goal };
    if (fail >= 0) { st.fails[seat]++; st.pos[seat] = S[seat]; } else st.pos[seat] = cur;
    push(st, ev); st.last[seat] = copyEv(ev);
    if (goal) { finish(st, seat, "goal"); return { ok: true }; }
    if (st.turns[0] >= MAXT && st.turns[1] >= MAXT) {
      const d = [0, 1].map(s => bfs(st.wall, st.pos[s])[G[s]]);
      finish(st, d[0] === d[1] ? -1 : d[0] < d[1] ? 0 : 1, "cap", d);
      return { ok: true };
    }
    st.turn = 1 - seat;
    return { ok: true };
  }
  function finish(st, w, why, d) {
    st.over = true; st.phase = "end"; st.turn = -1;
    st.res = { w, why, turns: st.turns.slice(), fails: st.fails.slice(), d: d || null };
    push(st, { k: "end", w, why, d: d || null });
  }
  const copyEv = e => JSON.parse(JSON.stringify(e));
  // 걸어 볼 수 있는 3칸 길 전부 (시험 · 막혔을 때)
  function legal(st, seat) {
    if (st.over || st.turn !== seat) return [];
    const out = [];
    const rec = (cur, p) => {
      if (p.length === STEP || (p.length && cur === G[seat])) { out.push({ t: "go", path: p.slice(), dbl: 0 }); return; }
      for (const n of NB[cur]) { p.push(n); rec(n, p); p.pop(); }
    };
    rec(st.pos[seat], []);
    return out;
  }

  // 지금까지 공개된 것: 지나간 칸 사이(길) · 부딪힌 칸 사이(벽)
  function factsOf(log) {
    const F = []; let k = 0;
    for (const e of log) {
      if (e.k !== "go") continue;
      let cur = e.from;
      e.path.forEach((c, j) => { F.push({ e: eid(cur, c), w: j === e.fail ? 1 : 0, s: e.s, k }); cur = c; });
      k++;
    }
    return { F, nGo: k };
  }
  function knownOf(log) {
    const K = new Int8Array(NE);
    for (const f of factsOf(log).F) if (f.e >= 0) K[f.e] = f.w ? 2 : 1;
    const open = [], wall = [];
    K.forEach((v, e) => { if (v === 1) open.push(e); else if (v === 2) wall.push(e); });
    return { open, wall };
  }
  function pubKey(st) { return JSON.stringify([st.turn, st.pos, st.dbl, st.turns, st.fails, st.over, st.seq, st.res && st.res.w]); }
  function view(st, seat) {
    const show = seat === "all" || st.over;
    return {
      n: 2, N, opt: Object.assign({}, st.opt), first: st.first, phase: st.phase, turn: st.turn, cur: st.over ? -1 : st.turn,
      pos: st.pos.slice(), start: S.slice(), goal: G.slice(), dbl: st.dbl.slice(), turns: st.turns.slice(), fails: st.fails.slice(), maxT: MAXT,
      last: st.last.map(e => (e ? copyEv(e) : null)), known: knownOf(st.log),
      walls: show ? st.wall.map((v, e) => (v ? e : -1)).filter(e => e >= 0) : null, dist: show ? st.dist : null,
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      score: st.turns.slice(), log: st.log.map(copyEv), seat, pub: hash(pubKey(st)).toString(36),
    };
  }

  // ═══ AI ═══════════════════════════════════════════════════════
  // 기억: 고급은 기록을 다 기억 · 보통은 상대 것부터 천천히 잊음 · 초급은 빨리 잊고 가끔 벽 자리를 옆 칸 사이로 헷갈림
  // 길 고르기: 모르는 칸 사이 값 = 1 + k × 벽일 확률 + rho × 벽일 확률 × 출발점에서 거리 (멀리서 부딪히면 손해가 큼) → 도착점까지 가장 싼 길을 따라 3칸
  const PROF = {
    easy: { own: 0.975, opp: 0.8, wallK: 0.4, conf: 0.12, deduce: 0, deg: 0, k: 3, rho: 0, jit: 1.0, rand: 0.05, dblRand: 0.15, dblMode: 0 },
    normal: { own: 0.99, opp: 0.93, wallK: 0.4, conf: 0.03, deduce: 1, deg: 1, k: 4, rho: 0.2, jit: 0.4, rand: 0.01, dblRand: 0, dblMode: 1 },
    hard: { own: 1, opp: 1, wallK: 1, conf: 0, deduce: 1, deg: 1, k: 5, rho: 0.3, jit: 0, rand: 0, dblRand: 0, dblMode: 2 },
  };
  const profOf = t => PROF[t] || PROF.normal;
  // 칸마다 길이 적어도 하나 (이어진 미로) · 벽은 모두 32개 — 여기서 확실히 아는 것을 더 끌어냄
  function deduce(K) {
    for (let it = 0; it < 8; it++) {
      let ch = false;
      for (let c = 0; c < NC; c++) {
        let open = 0, unk = -1, nu = 0;
        for (const e of NBE[c]) { if (K[e] === 1) open++; else if (K[e] === 0) { nu++; unk = e; } }
        if (!open && nu === 1) { K[unk] = 1; ch = true; }
      }
      let nw = 0, nu = 0; for (let e = 0; e < NE; e++) { if (K[e] === 2) nw++; else if (!K[e]) nu++; }
      if (nu && nw === WALLS) { for (let e = 0; e < NE; e++) if (!K[e]) K[e] = 1; ch = true; }
      else if (nu && nu === WALLS - nw) { for (let e = 0; e < NE; e++) if (!K[e]) K[e] = 2; ch = true; }
      if (!ch) break;
    }
    return K;
  }
  function memory(V, me, tier) {
    const P = profOf(tier), { F, nGo } = factsOf(V.log || []), K = new Int8Array(NE);
    const g0 = (V.log || []).find(e => e.k === "go");
    const salt = hash(`mz|${me}|${V.first}|${g0 ? g0.path.join(",") : ""}`);
    for (const f of F) {
      if (f.e < 0) continue;
      const age = nGo - 1 - f.k, base = f.s === me ? P.own : P.opp;
      const keep = Math.pow(base, age * (f.w ? P.wallK : 1));
      if (keep < 1 && mix(salt, f.e, f.k, f.w) >= keep) continue;                       // 잊음
      let e = f.e;
      if (f.w && P.conf && mix(salt, f.e, f.k, 77) < P.conf) {                            // 헷갈림: 옆의 다른 칸 사이로
        const c = ENDS[f.e][mix(salt, f.k, 5) < 0.5 ? 0 : 1], alt = NBE[c].filter(x => x !== f.e);
        if (alt.length) e = alt[Math.floor(mix(salt, f.e, f.k, 9) * alt.length)];
        if (K[e] === 1) continue;
      }
      K[e] = f.w ? 2 : 1;
    }
    return P.deduce ? deduce(K) : K;
  }
  function dijkstra(src, cost) {
    const d = new Float64Array(NC).fill(Infinity), done = new Uint8Array(NC);
    d[src] = 0;
    for (let it = 0; it < NC; it++) {
      let u = -1, best = Infinity;
      for (let i = 0; i < NC; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      const ns = NB[u], es = NBE[u];
      for (let k = 0; k < ns.length; k++) { const c = cost[es[k]]; if (c < Infinity && d[u] + c < d[ns[k]]) d[ns[k]] = d[u] + c; }
    }
    return d;
  }
  const BIG = 999;
  const dval = x => (x < Infinity ? Math.min(BIG, x) : BIG);
  // 칸마다 길 수 평균 (만든 미로 400개: 모서리 1.37 · 가장자리 1.97 · 안쪽 2.36)
  const EDEG = { 2: 1.37, 3: 1.97, 4: 2.36 };
  // 모르는 칸 사이마다 벽일 확률: deg = 1 이면 양 끝 칸에 남은 길 수(평균 − 아는 길)로 짐작해 남은 벽 수에 맞춤 · 0 이면 모두 같게
  function wallProb(K, deg) {
    let nw = 0, nu = 0; for (let e = 0; e < NE; e++) { if (K[e] === 2) nw++; else if (!K[e]) nu++; }
    const pe = new Float64Array(NE), left = Math.max(0, WALLS - nw), p0 = nu ? Math.min(0.95, Math.max(0.03, left / nu)) : 0;
    if (!nu) return { pe, p: 0, nw, nu };
    if (!deg) { for (let e = 0; e < NE; e++) if (!K[e]) pe[e] = p0; return { pe, p: p0, nw, nu }; }
    const openFrom = new Float64Array(NC);
    for (let c = 0; c < NC; c++) {
      let o = 0, u = 0; for (const e of NBE[c]) { if (K[e] === 1) o++; else if (!K[e]) u++; }
      if (!u) continue;
      let rem = EDEG[NBE[c].length] - o; if (!o) rem = Math.max(1, rem);
      openFrom[c] = Math.min(0.97, Math.max(0.04, rem / u));
    }
    let sw = 0;
    for (let e = 0; e < NE; e++) if (!K[e]) { pe[e] = 1 - (openFrom[ENDS[e][0]] + openFrom[ENDS[e][1]]) / 2; sw += pe[e]; }
    const f = sw > 0 ? left / sw : 1;
    for (let e = 0; e < NE; e++) if (!K[e]) pe[e] = Math.min(0.97, Math.max(0.02, pe[e] * f));
    return { pe, p: p0, nw, nu };
  }
  // 판단 바탕: 칸 사이 값 · 도착점까지 '짐작 거리' D · 실패하면 출발점에서 다시 잴 거리
  function context(K, me, P, rnd) {
    const { pe, p, nw, nu } = wallProb(K, P.deg);
    const ca = new Float64Array(NE); for (let e = 0; e < NE; e++) ca[e] = K[e] === 2 ? Infinity : 1;
    const Rs = dijkstra(S[me], ca);
    const cost = new Float64Array(NE);
    for (let e = 0; e < NE; e++) {
      if (K[e] === 2) { cost[e] = Infinity; continue; }
      if (K[e] === 1) { cost[e] = 1; continue; }
      const r = Math.min(Rs[ENDS[e][0]], Rs[ENDS[e][1]]);
      cost[e] = 1 + P.k * pe[e] + P.rho * pe[e] * (r < Infinity ? r : 12) + (P.jit && rnd ? P.jit * rnd() : 0);
    }
    const D = dijkstra(G[me], cost);
    const fc = new Map();
    const dfail = e => {                                                // 그 칸 사이가 벽이라 출발점으로 돌아간 뒤의 짐작 거리
      if (fc.has(e)) return fc.get(e);
      const old = cost[e]; cost[e] = Infinity; const v = dijkstra(G[me], cost)[S[me]]; cost[e] = old;
      const r = dval(v); fc.set(e, r); return r;
    };
    return { K, me, p, pe, D, cost, dfail, nw, nu };
  }
  // 도착점까지 가장 싼 길을 따라 L 칸 (도착점에 닿으면 거기서 끝) — 같으면 위 · 오른쪽 · 아래 · 왼쪽 순
  function route(X0, from, L) {
    const { D, cost, me } = X0, path = [];
    let cur = from;
    for (let j = 0; j < L && cur !== G[me]; j++) {
      let best = -1, bv = Infinity;
      NB[cur].forEach((n, k) => { const c = cost[NBE[cur][k]]; if (c < Infinity && c + D[n] < bv - 1e-9) { bv = c + D[n]; best = n; } });
      if (best < 0) break;
      path.push(best); cur = best;
    }
    return path;
  }
  // 한 길을 고급 AI 눈으로 평가: 성공할 확률 · 처음 가는 칸 사이 · 부딪힐 아는 벽 · 기대 짐작 거리 E
  function evalPath(X0, from, path) {
    const { K, me, pe, D, dfail } = X0;
    const seen = new Set(), unkE = [];
    let cur = from, alive = 1, acc = 0, wallHit = -1, wallAt = -1, end = from, goal = false;
    for (let j = 0; j < path.length; j++) {
      const e = eid(cur, path[j]);
      if (K[e] === 2 && !seen.has(e)) { acc += alive * dfail(e); alive = 0; wallHit = e; wallAt = j; break; }
      if (K[e] === 0 && !seen.has(e)) { acc += alive * pe[e] * dfail(e); alive *= 1 - pe[e]; unkE.push(e); }
      seen.add(e); cur = path[j]; end = cur;
      if (cur === G[me]) { goal = true; break; }
    }
    const E = acc + alive * (goal ? 0 : dval(D[end]));
    return { E, alive, unk: unkE.length, unkE, end, goal, pGoal: goal ? alive : 0, wallHit, wallAt };
  }
  // 아는 길(지나간 칸 사이)만으로 a → b 가장 짧은 칸 수 (없으면 -1)
  function knownRoute(K, a, b) {
    const d = Array(NC).fill(-1), pr = Array(NC).fill(-1); d[a] = 0; const q = [a];
    for (let h = 0; h < q.length; h++) { const c = q[h]; NB[c].forEach((n, k) => { if (d[n] < 0 && K[NBE[c][k]] === 1) { d[n] = d[c] + 1; pr[n] = c; q.push(n); } }); }
    if (d[b] < 0) return { n: -1, path: [] };
    const path = []; for (let c = b; c !== a; c = pr[c]) path.unshift(c);
    return { n: d[b], path };
  }
  // 아무 데로나 3칸 (초급이 헷갈릴 때) — 아는 벽은 피함
  function wander(K, from, me, R) {
    const path = []; let cur = from;
    for (let j = 0; j < STEP && cur !== G[me]; j++) {
      const ok = NB[cur].filter((n, k) => K[NBE[cur][k]] !== 2), ns = ok.length ? ok : NB[cur];
      cur = ns[Math.floor(R() * ns.length) % ns.length]; path.push(cur);
    }
    return path;
  }
  const unkIn = (K, from, path) => { let cur = from, n = 0; const seen = new Set(); for (const c of path) { const e = eid(cur, c); if (!K[e] && !seen.has(e)) n++; seen.add(e); cur = c; } return n; };
  // 한 차례 판단 (내부): 고른 수 · 근거
  function decide(V, me, tier, rnd) {
    const P = profOf(tier), from = V.pos[me], op = 1 - me, R = rnd || (() => 0.5);
    let K = memory(V, me, tier), X0 = context(K, me, P, P.jit ? R : null);
    // (헷갈린 기억으로) 도착점까지 길이 없다고 믿으면: 벽 기억을 '모름'으로 풀고 다시
    if (!(X0.D[from] < Infinity)) { K = K.map(v => (v === 2 ? 0 : v)); X0 = context(K, me, P, P.jit ? R : null); }
    // 상대가 다음 차례에 아는 길로 도착할 수 있나 (내 기억으로)
    const oR = knownRoute(K, V.pos[op], G[op]);
    const threat = oR.n >= 0 && oR.n <= (V.dbl[op] > 0 ? DSTEP : STEP);
    let path = route(X0, from, STEP), dbl = 0, why = "route";
    if (V.dbl[me] > 0) {
      const p6 = route(X0, from, DSTEP), g6 = p6.length > 0 && p6[p6.length - 1] === G[me];
      const u3 = unkIn(K, from, path), u6 = unkIn(K, from, p6);
      let use = false;
      if (P.dblMode === 2) use = (g6 && (threat || u6 <= 2)) || (p6.length === DSTEP && u6 === u3 && u6 <= 1) || (threat && u6 <= u3 + 1);
      else if (P.dblMode === 1) use = (g6 && u6 <= 1) || (p6.length === DSTEP && u6 === 0);
      else if (P.dblRand && R() < P.dblRand && p6.length >= 4) use = true;
      if (use && (p6.length === DSTEP || g6) && p6.length > STEP) { path = p6; dbl = 1; why = g6 ? "dblGoal" : "dbl"; }
    }
    if (!dbl && P.rand && R() < P.rand) { path = wander(K, from, me, R); why = "wander"; }
    // 3칸이 안 되면 (도착점이 아닌데) 왔던 칸으로 되돌아가며 채움
    while (path.length < (dbl ? DSTEP : STEP) && (!path.length || path[path.length - 1] !== G[me])) path.push(path.length >= 2 ? path[path.length - 2] : from);
    return { path, dbl, why, X0, K, threat, oR };
  }
  function ai(V, me, tier, rnd) {
    if (!V || V.over || V.cur !== me) return null;
    const d = decide(V, me, tier || "normal", rnd);
    return d ? { t: "go", path: d.path.slice(), dbl: d.dbl } : null;
  }
  const recommend = (V, me) => ai(V, me, "hard");
  // 선생님 · 복기용: 고급 AI 눈(완벽한 기억)으로 본 판단 근거
  function analyze(V, me) {
    const d = decide(V, me, "hard");
    if (!d) return null;
    const { X0, K } = d, from = V.pos[me];
    return { path: d.path, dbl: d.dbl, why: d.why, threat: d.threat, oR: d.oR, K, p: X0.p, pe: X0.pe, nw: X0.nw, nu: X0.nu,
      Dpos: dval(X0.D[from]), myR: knownRoute(K, from, G[me]), fromS: knownRoute(K, S[me], from), best: evalPath(X0, from, d.path),
      eval: path => evalPath(X0, from, path), dfail: X0.dfail, ctx: X0 };
  }

  return {
    id: "gn-memmaze", N, NC, NE, WALLS, STEP, DSTEP, DBL, MAXT, DMIN, DMAX, PMAX, PGAP, LETX, S, G, ENDS, NB, NBE, EP9, OPTS, PROF, DIRK,
    X, Y, at, eid, cellName, edgeName, dirOf, optsOf, bfs, carve, genMaze, fairOf, probe, checkPath, factsOf, knownOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend,
    memory, deduce, wallProb, context, route, evalPath, knownRoute, analyze, dijkstra, hash, mix, seeded,
  };
});

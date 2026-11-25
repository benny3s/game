/* 베니 서바이벌 · 바그찰 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 7일차 결승전 2회전 (1:1)
   · 가로세로 5줄 판의 점 25개 (선이 만나는 점에 말). 모서리 네 점에 호랑이 4마리, 염소 20마리는 밖에서 시작
   · 판 두 개(A · B)를 동시에 둠 — 한 사람은 A 에서 염소 · B 에서 호랑이, 다른 사람은 그 반대
   · 염소: 20마리를 다 놓기 전엔 빈 점에 하나씩 놓기만, 다 놓은 뒤엔 선을 따라 이웃 빈 점으로 한 칸
   · 호랑이: 선을 따라 이웃 빈 점으로 한 칸, 또는 바로 옆 염소를 한 줄로 뛰어넘어 그 너머 빈 점에 내려앉으며 잡기 (한 번에 한 마리)
   · 호랑이가 염소 5마리를 잡으면 호랑이 승, 호랑이 4마리가 모두 움직일 수 없으면 염소 승
   · 두 판 중 먼저 끝난 판의 승자가 이 게임의 승자
   · 차례: 선공(판 A 의 염소)이 염소 한 수로 시작 → 그다음부터는 한 사람의 차례 = 내 염소 판 한 수 + 내 호랑이 판 한 수
     (A 염소 → B 염소 · A 호랑이 → A 염소 · B 호랑이 → B 염소 · A 호랑이 → …)
   방송과 다른 점 · 우리가 정한 것 (원문에 없거나 폰으로 바꾼 것)
   · 한 수 90초 제한 · 연습 시간 없음, 선공은 무작위 (방송은 베네핏 가진 사람이 선후공을 정함)
   · 대각선은 전통 바그찰 판대로 (점 번호 합이 짝수인 점에서만 대각선이 이어짐)
   · 움직일 수 있는 염소가 없으면 그 수는 건너뜀
   · 두 판 합쳐 LIMIT 수가 지나도 안 끝나면 호랑이로 더 많이 잡은 사람 승, 같으면 무승부 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).baghchal = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NP = 25, GOATS = 20, WINCAP = 5, LIMIT = 321, WINV = 100000;   // LIMIT = 1 + 4k: 두 사람의 호랑이 수가 같음 (80번씩)
  const G = 1, T = 2;                                         // 점에 놓인 것: 0 빈 점 · 1 염소 · 2 호랑이
  const RC = Array.from({ length: NP }, (_, p) => [Math.floor(p / 5), p % 5]);
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ok5 = (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5;
  const ADJ = Array.from({ length: NP }, () => []);            // 이웃 점
  const JMP = Array.from({ length: NP }, () => []);            // [건너뛸 점, 내려앉을 점]
  for (let p = 0; p < NP; p++) {
    const [r, c] = RC[p], diagOK = (r + c) % 2 === 0;
    for (const [dr, dc] of DIRS) {
      if (dr && dc && !diagOK) continue;
      if (ok5(r + dr, c + dc)) ADJ[p].push((r + dr) * 5 + c + dc);
      if (ok5(r + 2 * dr, c + 2 * dc)) JMP[p].push([(r + dr) * 5 + c + dc, (r + 2 * dr) * 5 + c + 2 * dc]);
    }
  }
  ADJ.forEach(a => a.sort((x, y) => x - y));
  const CORNER = [0, 4, 20, 24];
  const LBL = RC.map(([r, c]) => "abcde"[c] + (5 - r));        // 칸 이름: 가로 a~e · 아래에서 1~5
  const BN = ["A", "B"];

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 200) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const isP = x => Number.isInteger(x) && x >= 0 && x < NP;

  // ── 판 보조 (한 판 = c 점 25개 · h 아직 안 놓은 염소 · cap 잡힌 염소) ──
  // role: "g" 염소 · "t" 호랑이 → 수 목록 [from, to, over] (from -1 = 놓기, over = 잡는 염소 점 · 없으면 -1)
  function movesOf(c, h, role) {
    const out = [];
    if (role === "g") {
      if (h > 0) { for (let p = 0; p < NP; p++) if (!c[p]) out.push([-1, p, -1]); return out; }
      for (let f = 0; f < NP; f++) if (c[f] === G) for (const t of ADJ[f]) if (!c[t]) out.push([f, t, -1]);
      return out;
    }
    for (let f = 0; f < NP; f++) if (c[f] === T) {
      for (const t of ADJ[f]) if (!c[t]) out.push([f, t, -1]);
      for (const [o, t] of JMP[f]) if (c[o] === G && !c[t]) out.push([f, t, o]);
    }
    return out;
  }
  // 호랑이 한 마리가 움직일 수 있는 길 수 (잡기 포함)
  function tigerMob(c, f) {
    let n = 0;
    for (const t of ADJ[f]) if (!c[t]) n++;
    for (const [o, t] of JMP[f]) if (c[o] === G && !c[t]) n++;
    return n;
  }
  // 지금 호랑이가 바로 잡을 수 있는 염소 점 (겹치지 않게)
  function exposed(c) {
    const s = new Set();
    for (let f = 0; f < NP; f++) if (c[f] === T) for (const [o, t] of JMP[f]) if (c[o] === G && !c[t]) s.add(o);
    return [...s].sort((a, b) => a - b);
  }
  function trapped(c) { const out = []; for (let f = 0; f < NP; f++) if (c[f] === T && !tigerMob(c, f)) out.push(f); return out; }
  const onBoard = c => { let n = 0; for (let p = 0; p < NP; p++) if (c[p] === G) n++; return n; };
  const toAct = ([f, t], b) => f < 0 ? { t: "place", to: t, b } : { t: "move", from: f, to: t, b };

  // ── 차례 ─────────────────────────────────────────────────
  // step 0: 판 A 염소 (선공 X). step ≥ 1 은 4수씩 돎: B 염소(Y) · A 호랑이(Y) · A 염소(X) · B 호랑이(X)
  function slot(st, s) {
    const X = st.X, Y = 1 - X;
    if (s === 0) return { b: 0, role: "g", seat: X };
    return [{ b: 1, role: "g", seat: Y }, { b: 0, role: "t", seat: Y }, { b: 0, role: "g", seat: X }, { b: 1, role: "t", seat: X }][(s - 1) % 4];
  }
  // 판 b 에서 염소 · 호랑이를 맡은 자리
  const goatOf = (st, b) => b === 0 ? st.X : 1 - st.X;
  const tigerOf = (st, b) => 1 - goatOf(st, b);

  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, X: 0, step: 0, B: [], log: [], seq: 0, over: false, res: null, last: null, skips: 0 };
    st.X = rnd(st) < 0.5 ? 0 : 1;
    for (let b = 0; b < 2; b++) {
      const c = Array(NP).fill(0);
      CORNER.forEach(p => { c[p] = T; });
      st.B.push({ c, h: GOATS, cap: 0, last: null, moves: 0 });
    }
    push(st, { k: "start", X: st.X });
    settle(st);
    return st;
  }
  const cur = st => st.over ? null : slot(st, st.step);
  const needs = st => st.over ? [] : [cur(st).seat];
  const over = st => !!st.over;
  function ranks(st) {
    if (!st.over || !st.res || st.res.w < 0) return [0, 0];
    return st.res.w === 0 ? [0, 1] : [1, 0];
  }
  function legal(x, seat) {
    if (x.over) return [];
    const k = x.cur || cur(x);
    if (!k || k.seat !== seat) return [];
    const bd = x.B[k.b];
    return movesOf(bd.c, bd.h, k.role).map(m => toAct(m, k.b));
  }

  function finish(st, b, w, why) {
    st.over = true;
    const caps = [0, 0];                                       // 자리마다 호랑이로 잡은 염소 수
    for (let k = 0; k < 2; k++) caps[tigerOf(st, k)] = st.B[k].cap;
    st.res = { b, w, why, caps, step: st.step };
    push(st, { k: "end", b, w, why, caps: caps.slice() });
  }
  // 다음 수로 넘어가기 전 정리: 수 상한 · 움직일 수 없는 쪽 (호랑이 = 염소 승 · 염소 = 건너뜀)
  function settle(st) {
    for (let guard = 0; guard < 8 && !st.over; guard++) {
      if (st.step >= LIMIT) {
        const caps = [0, 0];
        for (let k = 0; k < 2; k++) caps[tigerOf(st, k)] = st.B[k].cap;
        finish(st, -1, caps[0] === caps[1] ? -1 : caps[0] > caps[1] ? 0 : 1, "limit");
        return;
      }
      const k = slot(st, st.step), bd = st.B[k.b];
      if (movesOf(bd.c, bd.h, k.role).length) return;
      if (k.role === "t") { finish(st, k.b, goatOf(st, k.b), "trap"); return; }
      push(st, { k: "skip", b: k.b, s: k.seat });
      st.skips++; st.step++;
    }
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    const k = cur(st);
    if (seat !== k.seat) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (a.b !== undefined && a.b !== k.b) return { ok: false, err: `지금은 판 ${BN[k.b]} 에 둘 차례예요` };
    const bd = st.B[k.b], c = bd.c;
    let f, t;
    if (a.t === "place") {
      if (k.role !== "g") return { ok: false, err: "호랑이는 놓지 않고 옮겨요" };
      if (bd.h <= 0) return { ok: false, err: "염소를 다 놓았어요 — 판 위 염소를 옮겨요" };
      f = -1; t = a.to;
      if (!isP(t)) return { ok: false, err: "점을 골라 주세요" };
      if (c[t]) return { ok: false, err: "빈 점이 아니에요" };
    } else if (a.t === "move") {
      f = a.from; t = a.to;
      const mine = k.role === "g" ? G : T;
      if (k.role === "g" && bd.h > 0) return { ok: false, err: `아직 놓을 염소가 ${bd.h}마리 — 다 놓은 뒤에 옮겨요` };
      if (!isP(f) || c[f] !== mine) return { ok: false, err: `옮길 ${k.role === "g" ? "염소" : "호랑이"}를 골라 주세요` };
      if (!isP(t)) return { ok: false, err: "점을 골라 주세요" };
      if (c[t]) return { ok: false, err: "빈 점이 아니에요" };
    } else return { ok: false, err: "모르는 행동이에요" };
    const m = movesOf(c, bd.h, k.role).find(z => z[0] === f && z[1] === t);
    if (!m) return { ok: false, err: k.role === "t" ? "선을 따라 한 칸, 또는 바로 옆 염소를 한 줄로 뛰어넘어 그 너머 빈 점으로만 가요" : "선을 따라 이웃한 빈 점으로 한 칸만 옮겨요" };
    const o = m[2];
    if (f < 0) bd.h--; else c[f] = 0;
    c[t] = k.role === "g" ? G : T;
    if (o >= 0) { c[o] = 0; bd.cap++; }
    bd.moves++;
    bd.last = { role: k.role, f, t, o };
    st.last = { b: k.b, role: k.role, seat, f, t, o };
    push(st, { k: k.role === "g" ? (f < 0 ? "pl" : "gm") : "tm", b: k.b, s: seat, from: f, to: t, cap: o });
    st.step++;
    if (bd.cap >= WINCAP) { finish(st, k.b, seat, "cap"); return { ok: true }; }
    // 염소 수로 호랑이 4마리가 모두 막히면 그 판은 바로 끝 (그 판의 호랑이 차례까지 기다리지 않음 — 그 사이 다른 판 두 수는 두지 않음)
    if (k.role === "g" && !movesOf(c, bd.h, "t").length) { finish(st, k.b, seat, "trap"); return { ok: true }; }
    settle(st);
    return { ok: true };
  }
  const auto = () => null;
  function advance() {}

  // ── 보이는 것 (전부 공개) ──────────────────────────────────
  function view(st, seat) {
    const k = cur(st);
    const boards = st.B.map((bd, b) => ({
      c: bd.c.slice(), h: bd.h, cap: bd.cap, on: onBoard(bd.c), moves: bd.moves, goat: goatOf(st, b), tiger: tigerOf(st, b),
      last: bd.last ? Object.assign({}, bd.last) : null, trapped: trapped(bd.c), exposed: exposed(bd.c),
    }));
    const pubObj = { b: st.B.map(bd => [bd.c, bd.h, bd.cap]), s: st.step, o: st.over, x: st.X };
    return {
      n: 2, X: st.X, step: st.step, LIMIT, left: Math.max(0, LIMIT - st.step), GOATS, WINCAP, B: boards, cur: k ? Object.assign({}, k) : null,
      last: st.last ? Object.assign({}, st.last) : null, res: st.res ? Object.assign({}, st.res, { caps: st.res.caps.slice() }) : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: [0, 1].map(s => st.B[goatOf(st, 0) === s ? 1 : 0].cap),
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI: 한 판씩 알파베타 (그 판의 염소 · 호랑이가 번갈아 둔다고 보고 읽음) ──
  // 판 B = { c: Int8Array, h, cap } · 값은 둘 차례 쪽에서 본 값
  function evalG(B) {                                         // 염소 쪽에서 본 값
    const c = B.c;
    let v = -B.cap * 160, mob = 0, trap = 0;
    for (let f = 0; f < NP; f++) if (c[f] === T) { const m = tigerMob(c, f); mob += m; if (!m) trap++; }
    v += trap * 45 - mob * 4;
    return { v, exp: exposed(c).length };
  }
  function evalS(B, role) {
    const e = evalG(B);
    const g = e.v - e.exp * (role === "t" ? 90 : 30);          // 호랑이 차례면 곧 잡힘
    return role === "g" ? g : -g;
  }
  function make(B, m, role) {
    const [f, t, o] = m, c = B.c;
    if (f < 0) B.h--; else c[f] = 0;
    c[t] = role === "g" ? G : T;
    if (o >= 0) { c[o] = 0; B.cap++; }
  }
  function unmake(B, m, role) {
    const [f, t, o] = m, c = B.c;
    c[t] = 0;
    if (f < 0) B.h++; else c[f] = role === "g" ? G : T;
    if (o >= 0) { c[o] = G; B.cap--; }
  }
  const other = r => r === "g" ? "t" : "g";
  // 수 순서: 잡기 먼저 · 염소는 잡히는 자리를 뒤로
  function orderKey(B, m, role) {
    if (role === "t") return m[2] >= 0 ? 1000 : 0;
    const [f, t] = m, c = B.c;
    if (f < 0) B.h--; else c[f] = 0;
    c[t] = G;
    const e = exposed(c).length;
    let mob = 0; for (let p = 0; p < NP; p++) if (c[p] === T) mob += tigerMob(c, p);
    c[t] = 0; if (f < 0) B.h++; else c[f] = G;
    return -e * 100 - mob;
  }
  const sortBy = (mv, key) => mv.map(m => [key(m), m]).sort((x, y) => y[0] - x[0]).map(z => z[1]);
  function negamax(B, depth, role, alpha, beta, ply) {
    if (B.stop) return 0;
    if (++B.nodes > B.limit) { B.stop = 1; return 0; }
    if (B.cap >= WINCAP) return role === "g" ? -(WINV - ply) : WINV - ply;
    let mv = movesOf(B.c, B.h, role);
    if (!mv.length) {
      if (role === "t") return -(WINV - ply);                   // 호랑이가 다 갇힘
      return depth <= 0 ? evalS(B, role) : -negamax(B, depth - 1, "t", -beta, -alpha, ply + 1);   // 염소는 건너뜀
    }
    if (depth <= 0) return evalS(B, role);
    if (mv.length > 1) mv = sortBy(mv, m => orderKey(B, m, role));
    let best = -Infinity;
    for (const m of mv) {
      make(B, m, role);
      const v = -negamax(B, depth - 1, other(role), -beta, -alpha, ply + 1);
      unmake(B, m, role);
      if (B.stop) return 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  // 단계: depth = 앞을 읽는 수 · nodes = 읽는 양 한도 · noise = 점수 흔들림 · rand = 아무 수나 둘 확률
  const TIER = {
    easy: { depth: 1, nodes: 2000, noise: 120, rand: 0.35 },
    normal: { depth: 3, nodes: 10000, noise: 25, rand: 0.05 },
    hard: { depth: 6, nodes: 40000, noise: 1, rand: 0 },
    coach: { depth: 6, nodes: 40000, noise: 0, rand: 0 },
  };
  const boardOf = bd => ({ c: Int8Array.from(bd.c), h: bd.h, cap: bd.cap, nodes: 0, limit: 1e9, stop: 0 });
  // 수마다 값 [[수, 값], …] — 반복 깊이, 끝까지 읽은 마지막 깊이의 값
  function scoreC(bd, role, cfg) {
    const B = boardOf(bd);
    let mv = movesOf(B.c, B.h, role);
    if (cfg.only) mv = mv.filter(cfg.only);
    if (!mv.length) return null;
    mv = sortBy(mv, m => orderKey(B, m, role));
    B.limit = cfg.nodes;
    let done = null;
    for (let d = 1; d <= cfg.depth; d++) {
      B.nodes = 0; B.stop = 0;
      const sc = [];
      for (const m of mv) {
        make(B, m, role);
        const v = B.cap >= WINCAP ? WINV - 1 : -negamax(B, d - 1, other(role), -Infinity, Infinity, 1);
        unmake(B, m, role);
        if (B.stop) break;
        sc.push([m, v]);
      }
      if (B.stop) break;
      done = sc; done.depth = d;
      if (sc.some(z => z[1] >= WINV - 50)) break;
      const val = new Map(sc.map(z => [z[0], z[1]]));
      mv = sortBy(mv, m => val.has(m) ? val.get(m) : -Infinity);
    }
    if (!done) done = mv.map(m => [m, 0]);
    return done.slice().sort((a, b) => b[1] - a[1]);
  }
  function pickC(V, k, tier, r) {
    const cfg = TIER[tier] || TIER.normal, bd = V.B[k.b];
    if (cfg.rand && r() < cfg.rand) { const mv = movesOf(bd.c, bd.h, k.role); return mv.length ? mv[Math.floor(r() * mv.length)] : null; }
    const done = scoreC(bd, k.role, cfg);
    if (!done) return null;
    let bm = done[0][0], bv = -Infinity;
    for (const [m, v] of done) { const z = v + (m[2] >= 0 ? 2 : 0) + r() * cfg.noise; if (z > bv) { bv = z; bm = m; } }
    return bm;
  }
  function ai(V, seat, tier, r) {
    if (V.over || !V.cur || V.cur.seat !== seat) return null;
    const m = pickC(V, V.cur, tier, r || Math.random);
    return m ? toAct(m, V.cur.b) : null;
  }

  // ── 선생님 · 복기 보조 (모두 공개) ──
  // 한 수의 뜻: cap(잡기) · safe(잡힐 염소를 감쌈) · expose(내 염소가 잡힐 자리) · trap(호랑이를 가둠) · free(갇힌 호랑이를 풂) · fork(다음에 잡을 곳이 둘 이상)
  function explain(V, k, a) {
    const bd = V.B[k.b], c = bd.c.slice(), tags = [];
    const e0 = exposed(c), tr0 = trapped(c).length;
    let mob0 = 0; for (let p = 0; p < NP; p++) if (c[p] === T) mob0 += tigerMob(c, p);
    const f = a.t === "place" ? -1 : a.from, t = a.to;
    const m = movesOf(c, bd.h, k.role).find(z => z[0] === f && z[1] === t);
    if (!m) return { tags };
    if (f >= 0) c[f] = 0;
    c[t] = k.role === "g" ? G : T;
    if (m[2] >= 0) { c[m[2]] = 0; tags.push("cap"); }
    const e1 = exposed(c), tr1 = trapped(c).length;
    let mob1 = 0; for (let p = 0; p < NP; p++) if (c[p] === T) mob1 += tigerMob(c, p);
    if (k.role === "g") {
      if (e1.length < e0.length) tags.push("safe");
      if (e1.length > 0) tags.push("expose");
      if (tr1 > tr0) tags.push("trap");
    } else {
      if (e1.length >= 2) tags.push("fork");
      if (tr1 < tr0) tags.push("free");
    }
    return { tags, exp: [e0, e1], mob: [mob0, mob1], trapped: [tr0, tr1], cap: m[2] };
  }
  function recommend(V, me) {
    if (V.over || !V.cur || V.cur.seat !== me) return null;
    const done = scoreC(V.B[V.cur.b], V.cur.role, TIER.coach);
    if (!done) return null;
    const a = toAct(done[0][0], V.cur.b);
    return Object.assign({ a, v: done[0][1], b: V.cur.b, role: V.cur.role }, explain(V, V.cur, a));
  }
  // 복기: 내 수 · 고급 AI 수의 값 (같은 깊이로 읽은 값, 잡힌 염소 1마리 ≈ 160)
  function judge(V, seat, a, b) {
    if (V.over || !V.cur || V.cur.seat !== seat || !a || !b) return null;
    const hit = act => m => act.t === "place" ? m[0] === -1 && m[1] === act.to : m[0] === act.from && m[1] === act.to;
    const done = scoreC(V.B[V.cur.b], V.cur.role, TIER.coach);
    if (!done) return null;
    const val = act => { const z = done.find(q => hit(act)(q[0])); return z ? z[1] : null; };
    return { my: val(a), best: val(b), top: done[0][1], WINV };
  }

  return {
    id: "baghchal", NP, GOATS, WINCAP, LIMIT, RC, ADJ, JMP, LBL, CORNER, BN,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    movesOf, exposed, trapped, tigerMob, slot, explain, recommend, judge, TIER,
  };
});

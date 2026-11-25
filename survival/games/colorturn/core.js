/* 베니 서바이벌 · 컬러턴 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌2 · 컬러턴 (1:1 데스매치)
   · 판 6×6, 검정 · 하양 칩 7개씩 (자리 0 = 검정 · 아래쪽, 자리 1 = 하양 · 위쪽). 숨은 지뢰 18개 = 가로 줄마다 3개
   · 번갈아 한 턴에 하나: ① 배치 — 안 올린 칩 1개를 내 앞 첫 줄 빈칸에 ② 이동 — 색 상관없이 칩 1개를 주변 8칸 중 빈칸으로
     (상대가 직전 턴에 움직인 칩은 못 고름)
   · 지뢰 칸에 칩이 들어가면(배치든 이동이든) 칩 색이 바뀌고 그 지뢰가 드러남
   · 같은 색 칩 4개가 가로 · 세로 · 대각선으로 이어지면 그 색의 승
   방송과 다른 점 · 우리가 정한 것 (원문에 없음)
   · 한 번 움직임 끝에 어느 쪽이든 4목이 생기면 그 색이 승 (상대 차례에 내 색 4목이 이어져도 내가 승), 둘 다 생기면 움직인 사람이 승
   · 칩을 7개 다 올린 뒤에는 이동만. 둘 수 있는 수가 없으면 그 턴은 넘김 (둘 다 없으면 무승부)
   · 60턴이 되도록 4목이 없으면 무승부(공동 1등). 선공 무작위
   · 드러난 지뢰는 사라지지 않음 — 다시 밟으면 또 색이 바뀜. 4목은 4개 이상 이어진 것 모두
   · 지뢰는 두 사람 모두에게 숨음 (AI 도 못 봄). 가로 줄마다 3개라는 것, 밟은 칸의 결과만 단서 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).colorturn = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const W = 6, NC = 36, CHIPS = 7, PER_ROW = 3, MAXTURN = 60, PL = 36 << 6, WINV = 100000;
  const NAMES = ["검정", "하양"];
  const HOME = [[30, 31, 32, 33, 34, 35], [0, 1, 2, 3, 4, 5]];
  const NB = Array.from({ length: NC }, (_, i) => {
    const r = (i / W) | 0, c = i % W, o = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && r + a >= 0 && r + a < W && c + b >= 0 && c + b < W) o.push((r + a) * W + c + b);
    return o;
  });
  const WINS = [], CW = Array.from({ length: NC }, () => []);
  (function () {
    const add = a => { a.forEach(c => CW[c].push(WINS.length)); WINS.push(a); };
    for (let r = 0; r < W; r++) for (let c = 0; c <= 2; c++) add([0, 1, 2, 3].map(k => r * W + c + k));
    for (let c = 0; c < W; c++) for (let r = 0; r <= 2; r++) add([0, 1, 2, 3].map(k => (r + k) * W + c));
    for (let r = 0; r <= 2; r++) for (let c = 0; c <= 2; c++) { add([0, 1, 2, 3].map(k => (r + k) * W + c + k)); add([0, 1, 2, 3].map(k => (r + k) * W + c + 3 - k)); }
  })();

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 수 만들기 (한 곳) ─────────────────────────────────────
  // 수 = from << 6 | to  (배치는 from = 36)
  function gen(cells, seat, placed, lastTo) {
    const out = [];
    if (placed < CHIPS) for (const c of HOME[seat]) if (!cells[c]) out.push(PL | c);
    for (let f = 0; f < NC; f++) if (cells[f] && f !== lastTo) for (const t of NB[f]) if (!cells[t]) out.push((f << 6) | t);
    return out;
  }
  const isCell = x => Number.isInteger(x) && x >= 0 && x < NC;
  function toInt(a) {
    if (!a || typeof a !== "object") return -1;
    if (a.t === "place" && isCell(a.to)) return PL | a.to;
    if (a.t === "move" && isCell(a.from) && isCell(a.to)) return (a.from << 6) | a.to;
    return -1;
  }
  const toAct = m => (m >> 6) === 36 ? { t: "place", to: m & 63 } : { t: "move", from: m >> 6, to: m & 63 };
  function lineCells(cells, col) {
    const s = new Set();
    for (const w of WINS) if (cells[w[0]] === col && cells[w[1]] === col && cells[w[2]] === col && cells[w[3]] === col) w.forEach(c => s.add(c));
    return [...s].sort((a, b) => a - b);
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, cells: Array(NC).fill(0), mine: Array(NC).fill(0), known: Array(NC).fill(0), placed: [0, 0], turn: 0, first: 0, tc: 0, lastTo: -1, log: [], seq: 0, over: false, win: -1, why: "", line: [] };
    for (let r = 0; r < W; r++) shuffle(() => rnd(st), [0, 1, 2, 3, 4, 5]).slice(0, PER_ROW).forEach(c => { st.mine[r * W + c] = 1; });
    st.turn = st.first = rnd(st) < 0.5 ? 0 : 1;
    push(st, { k: "start", first: st.first });
    return st;
  }
  const needs = st => st.over ? [] : [st.turn];
  const over = st => !!st.over;
  function ranks(st) { return st.win < 0 ? [0, 0] : st.win === 0 ? [0, 1] : [1, 0]; }
  function legal(x, seat) { return x.over || seat !== x.turn ? [] : gen(x.cells, seat, x.placed[seat], x.lastTo).map(toAct); }

  function finish(st, win, why, line) { st.over = true; st.win = win; st.why = why; st.line = line || []; push(st, { k: "end", w: win, why, line: st.line }); }
  function apply(st, seat, a) {
    if (st.over || seat !== st.turn) return { ok: false, err: "지금은 차례가 아니에요" };
    const m = toInt(a);
    if (m < 0) return { ok: false, err: "모르는 행동이에요" };
    if (!gen(st.cells, seat, st.placed[seat], st.lastTo).includes(m)) return { ok: false, err: whyNot(st, seat, a) };
    const f = m >> 6, t = m & 63, flip = !!st.mine[t];
    let col;
    if (f === 36) { col = seat + 1; st.placed[seat]++; } else { col = st.cells[f]; st.cells[f] = 0; }
    if (flip) col = 3 - col;
    st.cells[t] = col; st.known[t] = flip ? 2 : 1;
    push(st, f === 36 ? { k: "place", s: seat, to: t, flip } : { k: "move", s: seat, from: f, to: t, flip });
    const b = lineCells(st.cells, 1), w = lineCells(st.cells, 2);
    if (b.length || w.length) {
      const win = b.length && w.length ? seat : b.length ? 0 : 1;
      finish(st, win, "line", win === 0 ? b : w);
      return { ok: true };
    }
    st.tc++; st.lastTo = f === 36 ? -1 : t;
    if (st.tc >= MAXTURN) { finish(st, -1, "turns"); return { ok: true }; }
    let nx = 1 - seat;
    if (!gen(st.cells, nx, st.placed[nx], st.lastTo).length) {
      push(st, { k: "pass", s: nx }); st.tc++; st.lastTo = -1;
      if (st.tc >= MAXTURN) { finish(st, -1, "turns"); return { ok: true }; }
      if (!gen(st.cells, seat, st.placed[seat], -1).length) { finish(st, -1, "stuck"); return { ok: true }; }
      nx = seat;
    }
    st.turn = nx;
    return { ok: true };
  }
  function whyNot(st, seat, a) {
    if (a.t === "place") {
      if (st.placed[seat] >= CHIPS) return "칩을 7개 다 올렸어요 — 움직여 봐요";
      if (!HOME[seat].includes(a.to)) return "칩은 내 앞 첫 줄에만 올릴 수 있어요";
      return "빈칸이 아니에요";
    }
    if (!st.cells[a.from]) return "움직일 칩을 골라 주세요";
    if (a.from === st.lastTo) return "상대가 방금 움직인 칩은 못 골라요";
    if (!NB[a.from].includes(a.to)) return "주변 8칸 빈칸으로만 움직여요";
    return "빈칸이 아니에요";
  }
  const auto = () => null;
  const advance = () => {};

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const cnt = [st.cells.filter(c => c === 1).length, st.cells.filter(c => c === 2).length];
    const pubObj = { c: st.cells, k: st.known, p: st.placed, t: st.turn, l: st.lastTo, o: st.over, w: st.win };
    return {
      n: 2, W, chips: CHIPS, cells: st.cells.slice(), known: st.known.slice(), placed: st.placed.slice(), left: st.placed.map(p => CHIPS - p),
      turn: st.turn, first: st.first, tc: st.tc, maxTurn: MAXTURN, lastTo: st.lastTo,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: cnt,
      win: st.over ? { seat: st.win, why: st.why, line: st.line.slice() } : null,
      mines: st.over ? st.mine.slice() : null,           // 끝난 뒤에만 지뢰 전체를 보여 줌
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }
  // 아직 안 밟은 칸이 지뢰일 확률 (가로 줄마다 3개) — 보이는 것만으로
  function mineProb(V) {
    const p = new Array(NC).fill(0);
    for (let r = 0; r < W; r++) {
      let rev = 0, unk = 0;
      for (let c = 0; c < W; c++) { const k = V.known[r * W + c]; if (k === 2) rev++; else if (k === 0) unk++; }
      for (let c = 0; c < W; c++) { const i = r * W + c, k = V.known[i]; p[i] = k === 2 ? 1 : k === 1 ? 0 : unk ? Math.max(0, PER_ROW - rev) / unk : 0; }
    }
    return p;
  }

  // ── AI 의 머릿속 판 (증분 평가) ─────────────────────────────
  const SB = [0, 1, 8, 50, 0];
  function chip(B, cell, col, d) {
    const nb = B.nb, nw = B.nw, ws = CW[cell];
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k]; let b = nb[w], x = nw[w];
      B.sc -= x === 0 ? SB[b] : b === 0 ? -SB[x] : 0;
      if (b === 4) B.l4b--; else if (x === 4) B.l4w--;
      if (col === 1) b += d; else x += d;
      nb[w] = b; nw[w] = x;
      B.sc += x === 0 ? SB[b] : b === 0 ? -SB[x] : 0;
      if (b === 4) B.l4b++; else if (x === 4) B.l4w++;
    }
  }
  function boardFrom(V) {
    const B = { cells: Int8Array.from(V.cells), known: Int8Array.from(V.known), p: Float64Array.from(mineProb(V)), nb: new Int8Array(WINS.length), nw: new Int8Array(WINS.length), sc: 0, l4b: 0, l4w: 0, placed: V.placed.slice() };
    for (let i = 0; i < NC; i++) if (B.cells[i]) chip(B, i, B.cells[i], 1);
    return B;
  }
  function make(B, m, s, fl) {
    const f = m >> 6, t = m & 63;
    let col;
    if (f === 36) { col = s + 1; B.placed[s]++; } else { col = B.cells[f]; chip(B, f, col, -1); B.cells[f] = 0; }
    if (fl) col = 3 - col;
    const pk = B.known[t]; B.known[t] = fl ? 2 : 1;
    B.cells[t] = col; chip(B, t, col, 1);
    return pk;
  }
  function unmake(B, m, s, fl, pk) {
    const f = m >> 6, t = m & 63, ct = B.cells[t];
    chip(B, t, ct, -1); B.cells[t] = 0; B.known[t] = pk;
    if (f === 36) B.placed[s]--; else { const c0 = fl ? 3 - ct : ct; B.cells[f] = c0; chip(B, f, c0, 1); }
  }
  const term = (B, s) => { const b = B.l4b > 0, w = B.l4w > 0; return b && w ? s : b ? 0 : w ? 1 : -1; };
  // 한 수의 값 (검정 쪽에서 본 점수) — 밟은 칸이 지뢰일 확률로 평균
  function staticEV(B, m, s, ply) {
    const t = m & 63, k = B.known[t], pf = k === 2 ? 1 : k === 1 ? 0 : B.p[t];
    let ev = 0;
    for (let fl = 0; fl < 2; fl++) {
      const w = fl ? pf : 1 - pf; if (w <= 0) continue;
      const pk = make(B, m, s, fl), tw = term(B, s);
      ev += w * (tw < 0 ? B.sc : tw === 0 ? WINV - ply : ply - WINV);
      unmake(B, m, s, fl, pk);
    }
    return ev;
  }
  function deepEV(B, m, s, depth, ply, bm) {
    const t = m & 63, k = B.known[t], pf = k === 2 ? 1 : k === 1 ? 0 : B.p[t];
    let ev = 0;
    for (let fl = 0; fl < 2; fl++) {
      const w = fl ? pf : 1 - pf; if (w <= 0) continue;
      const pk = make(B, m, s, fl), tw = term(B, s);
      ev += w * (tw < 0 ? search(B, depth - 1, 1 - s, (m >> 6) === 36 ? -1 : t, bm, ply + 1) : tw === 0 ? WINV - ply : ply - WINV);
      unmake(B, m, s, fl, pk);
    }
    return ev;
  }
  function search(B, depth, s, lastTo, bm, ply) {
    const mvs = gen(B.cells, s, B.placed[s], lastTo), maxi = s === 0;
    if (!mvs.length) {
      if (!gen(B.cells, 1 - s, B.placed[1 - s], -1).length) return 0;
      return depth <= 1 ? B.sc : search(B, depth - 1, 1 - s, -1, bm, ply + 1);
    }
    if (depth <= 1) {
      let best = maxi ? -Infinity : Infinity;
      for (const m of mvs) { const v = staticEV(B, m, s, ply); if (maxi ? v > best : v < best) best = v; }
      return best;
    }
    return scored(B, depth, s, lastTo, bm, ply)[0][1];
  }
  // 위로 beam 개만 깊이 읽음 → [[수, 값], …] 좋은 순
  function scored(B, depth, s, lastTo, bm, ply) {
    const maxi = s === 0, cmp = (a, b) => (maxi ? b[1] - a[1] : a[1] - b[1]);
    const ps = gen(B.cells, s, B.placed[s], lastTo).map(m => [m, staticEV(B, m, s, ply)]).sort(cmp).slice(0, bm[depth] || 10);
    for (const p of ps) if (Math.abs(p[1]) < WINV - 200) p[1] = deepEV(B, p[0], s, depth, ply, bm);
    return ps.sort(cmp);
  }
  // 단계: depth = 앞을 읽는 수 · bm = 깊이별로 더 읽을 후보 수 · noise = 점수에 섞는 흔들림 · rand = 아무 수나 둘 확률
  const TIER = {
    easy: { depth: 1, bm: [], noise: 40, rand: 0.4 },
    normal: { depth: 2, bm: [0, 0, 30], noise: 6, rand: 0.1 },
    hard: { depth: 3, bm: [0, 0, 8, 14], noise: 0.4, rand: 0 },
  };
  function pick(B, s, lastTo, tier, r) {
    const mvs = gen(B.cells, s, B.placed[s], lastTo);
    if (!mvs.length) return -1;
    const cfg = TIER[tier] || TIER.normal, sg = s === 0 ? 1 : -1;
    if (cfg.rand && r() < cfg.rand) return mvs[Math.floor(r() * mvs.length)];
    const sc = cfg.depth <= 1 ? mvs.map(m => [m, staticEV(B, m, s, 1)]) : scored(B, cfg.depth, s, lastTo, cfg.bm, 1);
    let bm = sc[0][0], bv = -Infinity;
    for (const [m, v] of sc) { const x = sg * v + r() * cfg.noise; if (x > bv) { bv = x; bm = m; } }
    return bm;
  }
  function ai(V, seat, tier, r) {
    if (V.over || V.turn !== seat) return null;
    const m = pick(boardFrom(V), seat, V.lastTo, tier, r || Math.random);
    return m < 0 ? null : toAct(m);
  }

  // ── 선생님이 쓰는 보조 (보이는 것만으로) ─────────────────────
  // 같은 색 3개 + 빈칸 1개인 줄 = 위협 (그 색이 빈칸을 채우면 4목)
  function threats(cells) {
    const out = [];
    for (const w of WINS) for (const col of [1, 2]) {
      let n = 0, e = -1, x = 0;
      for (const c of w) { if (cells[c] === col) n++; else if (cells[c] === 0) e = c; else x++; }
      if (n === 3 && x === 0 && e >= 0) out.push({ col, cells: w.slice(), empty: e });
    }
    return out;
  }
  // 한 수의 뜻 태그: win(4목 완성) · block(상대 위협을 줄임) · threat(내 위협을 늘림) · mine(드러난 지뢰로 색 바꿈) · gamble(안 밟은 칸 — 지뢰일 수 있음) · safe(밟아 본 안전한 칸) · flipFail(지뢰라 색이 바뀌면)
  function explain(V, me, a) {
    const m = toInt(a); if (m < 0) return { tags: [] };
    const B = boardFrom(V), col = me + 1, t = m & 63, k = B.known[t], p = B.p[t];
    const before = threats(Array.from(B.cells)), cnt = (ts, c) => ts.filter(x => x.col === c).length;
    const flip = k === 2;   // 안 밟은 칸은 지뢰가 아닌 쪽으로 읽고, 위험은 gamble 태그로 따로 알림
    make(B, m, me, flip);
    const after = threats(Array.from(B.cells)), tags = [];
    if (term(B, me) === me) tags.push("win");
    if (cnt(after, 3 - col) < cnt(before, 3 - col)) tags.push("block");
    if (cnt(after, col) > cnt(before, col)) tags.push("threat");
    if (k === 2) tags.push("mine"); else if (k === 1) tags.push("safe"); else if (p > 0) tags.push("gamble");
    return { tags, p: k === 0 ? p : k === 2 ? 1 : 0 };
  }
  function recommend(V, me) {
    const m = pick(boardFrom(V), me, V.lastTo, "hard", () => 0.5);
    if (m < 0) return null;
    const a = toAct(m);
    return Object.assign({ a }, explain(V, me, a));
  }
  function analyze(V, me) {
    const ts = threats(V.cells), col = me + 1;
    return { me: ts.filter(x => x.col === col), opp: ts.filter(x => x.col !== col), mineProb: mineProb(V), left: V.left.slice(), count: V.score.slice(), rec: V.over || V.turn !== me ? null : recommend(V, me) };
  }

  return {
    id: "colorturn", W, CHIPS, MAXTURN, NAMES, HOME, NB, WINS,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    gen, lineCells, mineProb, threats, explain, recommend, analyze, TIER,
  };
});

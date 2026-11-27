/* 베니 서바이벌 · 동물원 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 시즌 1 · 4일차 메인 매치 (9명). 나무위키 4일차 문서(룰 · 크레딧 경매 · 점수 · 라운드 기록)를 읽고 우리 말로 옮김.
   · 동물 카드 5종(뱀 · 앵무새 · 코끼리 · 사자 · 원숭이) × 6장 = 30장. 각자 3장을 받아 순서를 정해 '조합'을 만들고, 그중 1장만 공개. 개인 조건 카드 1장(10종, 'A 타일이 B 타일보다 많다') 은 비공개.
   · 동물 타일: A · B 두 상자에 각각 5종 × 4개 = 20개. 라운드마다 각 상자에서 4개씩, 모두 8개를 공개. 5라운드(상자당 20개를 다 씀).
   · 크레딧 30 (비공개 · 양도 불가 · 못 따도 돌려받지 못함). 라운드마다 모두 A 또는 B 를 골라 1 이상 몰래 걸음 (올인 가능).
     두 그룹 중 걸린 크레딧 합이 적은 그룹이 낙찰, 그 그룹에서 가장 많이 건 사람이 승자(정체 비공개)가 되어 그 그룹 타일 4개를 5×5 판에 놓음 (위에서 떨어져 아래 칸부터 쌓임).
     합이 같거나 낙찰 그룹 최고액이 같으면 무효 — 크레딧을 돌려주고 다시. 낙찰 못 된 타일은 버림.
   · 끝나면 내 조합이 판에 (가로 · 세로 · 대각선, 거꾸로도) 순서대로 놓인 곳 1개당 1점, 개인 조건을 이루면 그 점수 2배.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 3~6명 (방송 9명) · 카드 3장 순서 · 공개할 1장은 내가 고름 · 개인 조건 10종은 우리가 만든 'A 타일이 B 타일보다 많다' 10개 (종류 짝은 방송 목록을 못 봄)
     ② 입찰은 순서 없이 동시에 몰래 (방송은 한 명씩 차례로 비공개) · 대화 · 동맹 · 도와주기 없음 · 피스 증감 없음 (순위만)
     ③ 무효는 같은 라운드에서 두 번까지 다시 하고, 세 번째도 무효면 그 라운드 타일은 버림 · 한 그룹에만 걸렸으면 그 그룹이 낙찰 · 크레딧이 0 이면 그 라운드는 쉼
     ④ 타일 수: 방송 글이 '박스마다 20개' 와 '합쳐 20개' 로 엇갈렸는데, 5라운드 × 4개 × 2그룹 = 상자당 20개가 맞아서 '상자당 20개' 로 함 (판은 25칸 · 낙찰 타일 20개)
     ⑤ 같은 조합 줄은 한 줄로만 셈 (거꾸로도 같은 모양이면 한 번)
   숨은 정보: 남의 크레딧 · 입찰 · 조합 순서 · 비공개 카드 · 개인 조건 · 낙찰 승자. 공개: 판 · 타일 · 라운드마다 그룹별 걸린 합 · 어느 그룹이 낙찰 · 각자 공개한 1장. 끝나면 모두 공개. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).zoo = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SP = [{ nm: "뱀", em: "🐍" }, { nm: "앵무새", em: "🦜" }, { nm: "코끼리", em: "🐘" }, { nm: "사자", em: "🦁" }, { nm: "원숭이", em: "🐵" }];
  const COND = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [1, 3], [2, 4], [3, 0], [4, 1]];     // [x, y] = x 타일이 y 타일보다 많다
  const NR = 5, SZ = 5, CR0 = 30, MAXVOID = 2;
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // ── 판 ──
  const WIN = [];
  for (let r = 0; r < SZ; r++) for (let c = 0; c < SZ; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const r2 = r + 2 * dr, c2 = c + 2 * dc; if (r2 < SZ && c2 >= 0 && c2 < SZ) WIN.push([[r, c], [r + dr, c + dc], [r2, c2]]);
  }
  const emptyBoard = () => Array.from({ length: SZ }, () => Array(SZ).fill(null));
  const dropRow = (b, c) => { for (let r = SZ - 1; r >= 0; r--) if (b[r][c] == null) return r; return -1; };
  function lineCount(b, seq) {
    let n = 0;
    for (const w of WIN) { const v = w.map(([r, c]) => b[r][c]); if ((v[0] === seq[0] && v[1] === seq[1] && v[2] === seq[2]) || (v[0] === seq[2] && v[1] === seq[1] && v[2] === seq[0])) n++; }
    return n;
  }
  const tileCount = b => { const c = [0, 0, 0, 0, 0]; for (const row of b) for (const x of row) if (x != null) c[x]++; return c; };
  const condMet = (b, cond) => { const c = tileCount(b); return c[cond[0]] > c[cond[1]]; };
  // 모의 점수: 끝난 줄 + 아직 살아 있는 줄의 일부 (놓을 수 있다고 봄), 개인 조건이 이뤄질 가능성만큼 2배
  function evalBoard(b, seq, cond) {
    let done = 0, part = 0;
    for (const w of WIN) {
      let best = 0, dead = true;
      for (const o of [seq, [seq[2], seq[1], seq[0]]]) {
        let m = 0, ok = true;
        for (let k = 0; k < 3; k++) { const x = b[w[k][0]][w[k][1]]; if (x == null) continue; if (x === o[k]) m++; else { ok = false; break; } }
        if (ok) { dead = false; if (m > best) best = m; }
      }
      if (dead) continue; if (best === 3) done++; else part += (best / 3) * (best / 3);
    }
    const c = tileCount(b), d = c[cond[0]] - c[cond[1]], p = 1 / (1 + Math.exp(-(d - 0.3) / 1.4));
    return (done + 0.3 * part) * (1 + p);
  }

  // ── 상태 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {}; n = Math.max(3, Math.min(6, n | 0 || 4));
    const rs = (seed >>> 0) || 1, R = seeded(hash(`zoo|${rs}`));
    const deck = []; for (let s = 0; s < 5; s++) for (let k = 0; k < 6; k++) deck.push(s);
    shuffle(deck, R);
    const cids = shuffle(COND.map((_, i) => i), R);
    const box = () => { const a = []; for (let s = 0; s < 5; s++) for (let k = 0; k < 4; k++) a.push(s); return shuffle(a, R); };
    const st = { n, rs, cfg: Object.assign({}, cfg), cards: Array.from({ length: n }, (_, s) => deck.slice(s * 3, s * 3 + 3)), cond: cids.slice(0, n), ord: Array(n).fill(null), show: Array(n).fill(null),
      credits: Array(n).fill(CR0), box: { A: box(), B: box() }, round: 0, phase: "setup", tiles: { A: [], B: [] }, bids: Array(n).fill(null), voids: 0, win: null, queue: [], board: emptyBoard(),
      over: false, end: "", score: Array(n).fill(0), detail: [], log: [], seq: 0 };
    st.log.push({ i: st.seq++, k: "start", n });
    return st;
  }
  const seqOf = (st, s) => (st.ord[s] ? st.ord[s].map(i => st.cards[s][i]) : null);
  function startRound(st) {
    st.round++;
    if (st.round > NR) return finish(st);
    st.tiles = { A: st.box.A.splice(0, 4), B: st.box.B.splice(0, 4) }; st.voids = 0; st.win = null; st.queue = [];
    st.log.push({ i: st.seq++, k: "tiles", r: st.round, A: st.tiles.A.slice(), B: st.tiles.B.slice() });
    openBids(st);
  }
  function openBids(st) {
    st.phase = "bid"; st.bids = st.credits.map(c => (c > 0 ? null : { skip: 1 }));
    if (st.bids.every(b => b)) { st.log.push({ i: st.seq++, k: "skip", r: st.round }); st.phase = "show"; }
  }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "setup") return st.ord.map((o, s) => (o ? -1 : s)).filter(s => s >= 0);
    if (st.phase === "bid") return st.bids.map((b, s) => (b ? -1 : s)).filter(s => s >= 0);
    if (st.phase === "place") return [st.win.seat];
    return [];
  };
  const over = st => !!st.over;
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "setup") { const o = []; for (const p of PERMS) for (let sh = 0; sh < 3; sh++) o.push({ t: "combo", ord: p.slice(), show: sh }); return o; }
    if (st.phase === "bid") { const o = []; for (const g of ["A", "B"]) for (let c = 1; c <= st.credits[seat]; c++) o.push({ t: "bid", g, c }); return o; }
    const o = []; st.queue.forEach((_, ti) => { for (let c = 0; c < SZ; c++) if (dropRow(st.board, c) >= 0) o.push({ t: "place", ti, col: c }); }); return o;
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동이 이상해요" };
    if (st.phase === "setup") {
      if (a.t !== "combo" || !Array.isArray(a.ord) || a.ord.length !== 3 || [...a.ord].sort().join() !== "0,1,2" || !(a.show === 0 || a.show === 1 || a.show === 2)) return { ok: false, err: "카드 순서와 공개할 카드를 골라요" };
      st.ord[seat] = a.ord.slice(); st.show[seat] = a.show;
      if (st.ord.every(o => o)) { st.log.push({ i: st.seq++, k: "ready" }); startRound(st); }
      return { ok: true };
    }
    if (st.phase === "bid") {
      if (a.t !== "bid" || (a.g !== "A" && a.g !== "B") || !Number.isInteger(a.c) || a.c < 1) return { ok: false, err: "그룹과 1 이상 크레딧을 골라요" };
      if (a.c > st.credits[seat]) return { ok: false, err: "크레딧이 모자라요" };
      st.bids[seat] = { g: a.g, c: a.c };
      if (st.bids.every(b => b)) resolveBids(st);
      return { ok: true };
    }
    // 배치
    if (a.t !== "place" || !Number.isInteger(a.ti) || a.ti < 0 || a.ti >= st.queue.length || !Number.isInteger(a.col) || a.col < 0 || a.col >= SZ) return { ok: false, err: "타일과 칸을 골라요" };
    const row = dropRow(st.board, a.col); if (row < 0) return { ok: false, err: "그 줄은 가득 찼어요" };
    const sp = st.queue.splice(a.ti, 1)[0]; st.board[row][a.col] = sp;
    st.log.push({ i: st.seq++, k: "place", r: st.round, sp, col: a.col, row, seat });
    if (!st.queue.length) st.phase = "show";
    return { ok: true };
  }
  function resolveBids(st) {
    const tot = { A: 0, B: 0 }, top = { A: [], B: [] };
    st.bids.forEach((b, s) => { if (b.skip) return; tot[b.g] += b.c; top[b.g].push([s, b.c]); });
    const groups = ["A", "B"].filter(g => top[g].length);
    const bids = st.bids.map(b => (b.skip ? null : { g: b.g, c: b.c }));
    let g = null, why = "";
    if (groups.length === 1) g = groups[0];
    else if (tot.A === tot.B) why = "total"; else g = tot.A < tot.B ? "A" : "B";
    let seat = -1;
    if (g) { const mx = Math.max(...top[g].map(x => x[1])), w = top[g].filter(x => x[1] === mx); if (w.length > 1) { why = "top"; g = null; } else seat = w[0][0]; }
    if (!g) {
      st.log.push({ i: st.seq++, k: "void", r: st.round, tA: tot.A, tB: tot.B, why, bids });
      st.voids++;
      if (st.voids > MAXVOID) { st.log.push({ i: st.seq++, k: "skip", r: st.round }); st.phase = "show"; st.tiles = { A: [], B: [] }; return; }
      return openBids(st);
    }
    st.bids.forEach((b, s) => { if (!b.skip) st.credits[s] -= b.c; });
    st.log.push({ i: st.seq++, k: "auc", r: st.round, tA: tot.A, tB: tot.B, g, seat, bids });
    st.win = { g, seat }; st.queue = st.tiles[g].slice(); st.phase = "place";
  }
  function finish(st) {
    const det = [];
    for (let s = 0; s < st.n; s++) { const seq = seqOf(st, s), lines = lineCount(st.board, seq), ok = condMet(st.board, COND[st.cond[s]]); det.push({ lines, cond: ok, total: lines * (ok ? 2 : 1) }); }
    st.detail = det; st.score = det.map(d => d.total); st.over = true; st.phase = "end"; st.end = "done";
    st.log.push({ i: st.seq++, k: "end", score: st.score.slice(), detail: clone(det), cards: clone(st.cards), ord: clone(st.ord), cond: st.cond.slice(), credits: st.credits.slice() });
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 3600 : null);
  function advance(st) { if (st.over || st.phase !== "show") return; startRound(st); }
  const ranks = st => (st.over ? st.score.map(x => st.score.filter(y => y > x).length) : Array(st.n).fill(0));

  // ── 보이는 것 ──
  function pubLog(e, full) {
    if (full) return clone(e);
    if (e.k === "auc") return { i: e.i, k: "auc", r: e.r, tA: e.tA, tB: e.tB, g: e.g };
    if (e.k === "void") return { i: e.i, k: "void", r: e.r, tA: e.tA, tB: e.tB, why: e.why };
    if (e.k === "place") return { i: e.i, k: "place", r: e.r, sp: e.sp, col: e.col, row: e.row };
    return clone(e);
  }
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all", full = isAll || st.over;
    const shown = st.ord.map((o, s) => (o && st.show[s] != null && (st.phase !== "setup" || full) ? { pos: st.show[s], sp: st.cards[s][o[st.show[s]]] } : null));
    const sb = st.phase === "setup" ? st.ord.map(o => !!o) : st.phase === "bid" ? st.bids.map(b => !!b && !b.skip) : Array(st.n).fill(false);
    const nd = needs(st);
    const pubObj = { r: st.round, p: st.phase, t: st.tiles, b: st.board, sh: shown, sb, q: st.queue, v: st.voids, ov: st.over };
    const V = { n: st.n, round: st.round, rounds: NR, phase: st.phase, seat: me, tiles: clone(st.tiles), queue: st.queue.slice(), board: clone(st.board), shown, subbed: sb, voids: st.voids,
      needs: full ? nd : (me >= 0 && nd.includes(me) ? [me] : []), over: st.over, end: st.end, ranks: ranks(st), score: st.over ? st.score.slice() : Array(st.n).fill(0),
      log: st.log.map(e => pubLog(e, full)), pub: hash(JSON.stringify(pubObj)).toString(36), mine: null, all: null, detail: st.over ? clone(st.detail) : null, boxLeft: { A: st.box.A.length, B: st.box.B.length } };
    if (me >= 0) V.mine = { credits: st.credits[me], cards: st.cards[me].slice(), ord: st.ord[me] ? st.ord[me].slice() : null, seq: seqOf(st, me), cond: COND[st.cond[me]].slice(), bid: st.bids[me] && !st.bids[me].skip ? Object.assign({}, st.bids[me]) : null, skip: !!(st.bids[me] && st.bids[me].skip), isWin: !!(st.win && st.win.seat === me && st.phase === "place") };
    if (full) V.all = { cards: clone(st.cards), ord: clone(st.ord), seq: st.ord.map((o, s) => seqOf(st, s)), cond: st.cond.map(c => COND[c].slice()), credits: st.credits.slice(), win: st.win ? Object.assign({}, st.win) : null, bids: st.bids.map(b => (b ? Object.assign({}, b) : null)) };
    return V;
  }

  // ── AI (보이는 것만) ──
  const PROF = { easy: { samples: 0 }, normal: { samples: 4, noise: 1.6, kappa: 1.0 }, hard: { samples: 60, noise: 0, kappa: 0.35 } };
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.phase, V.tiles, V.board, V.mine && V.mine.credits, V.mine && V.mine.seq, V.mine && V.mine.cond, V.queue, V.voids, V.log.length]));
  const wOf = (V, sp) => { const m = V.mine, seq = m.seq || []; let w = 0; for (const x of seq) if (x === sp) w += 1; if (sp === m.cond[0]) w += 0.4; if (sp === m.cond[1]) w -= 0.4; return w; };
  const valOf = (V, g) => 0.5 * V.tiles[g].reduce((a, sp) => a + wOf(V, sp), 0);
  // 지금까지 공개된 합으로 남의 평균 지출 · 크레딧을 짐작
  function belief(V) {
    const auc = V.log.filter(e => e.k === "auc"), spent = auc.reduce((a, e) => a + e.tA + e.tB, 0), avg = spent / V.n;
    return { est: Math.max(1, CR0 - avg), rounds: auc.length };
  }
  function sampleOpp(V, s, bel, R, mine) {
    const b = Math.max(1, bel.est / Math.max(1, NR - V.round + 1));
    let c = Math.round(b * Math.exp((R() - 0.5) * 1.5 + (R() - 0.5) * 0.9)); c = Math.max(1, Math.min(Math.round(bel.est), c));
    const sh = V.shown[s]; let pA = 0.5; if (sh) { const ca = V.tiles.A.filter(x => x === sh.sp).length, cb = V.tiles.B.filter(x => x === sh.sp).length; pA = Math.max(0.2, Math.min(0.8, 0.5 + 0.1 * (ca - cb))); }
    return { g: R() < pA ? "A" : "B", c };
  }
  function bidScores(V, me, P, R) {
    const cr = V.mine.credits, left = Math.max(1, NR - V.round + 1), b = cr / left, VA = valOf(V, "A"), VB = valOf(V, "B"), Vb = Math.max(0.4, VA, VB), mu = left <= 1 ? 0.0001 : P.kappa * Vb / Math.max(1.5, b) * (left - 1) / left, bel = belief(V);
    const opps = []; for (let s = 0; s < V.n; s++) if (s !== me) opps.push(s);
    const cands = []; const maxc = Math.min(cr, Math.max(3, Math.round(b * 3.2)));
    for (let c = 1; c <= maxc; c++) { cands.push({ g: "A", c }); cands.push({ g: "B", c }); }
    const smp = []; for (let i = 0; i < Math.max(1, P.samples); i++) smp.push(opps.map(s => sampleOpp(V, s, bel, R)));
    const rows = cands.map(cd => {
      let win = 0;
      for (const os of smp) {
        const all = os.concat([cd]), tot = { A: 0, B: 0 }, top = { A: [], B: [] };
        all.forEach(x => { tot[x.g] += x.c; top[x.g].push(x.c); });
        const groups = ["A", "B"].filter(g => top[g].length); let g;
        if (groups.length === 1) g = groups[0]; else if (tot.A === tot.B) continue; else g = tot.A < tot.B ? "A" : "B";
        const mx = Math.max(...top[g]); if (g === cd.g && cd.c === mx && top[g].filter(x => x === mx).length === 1) win++;
      }
      const p = win / smp.length, val = cd.g === "A" ? VA : VB;
      return { a: { t: "bid", g: cd.g, c: cd.c }, p, val, u: p * val - mu * cd.c };
    });
    return { rows, mu, VA, VB };
  }
  function evalPlace(V, queue, ti, col) {
    const seq = V.mine.seq, cond = V.mine.cond, b = V.board.map(r => r.slice()), row = dropRow(b, col); if (row < 0) return -1e9;
    b[row][col] = queue[ti]; return evalBoard(b, seq, cond);
  }
  function placeRows(V, P, R) {
    const rows = [];
    V.queue.forEach((_, ti) => { for (let c = 0; c < SZ; c++) { if (dropRow(V.board, c) < 0) continue; let u = evalPlace(V, V.queue, ti, c); if (P.noise) u += (R() - 0.5) * 2 * P.noise; rows.push({ a: { t: "place", ti, col: c }, u }); } });
    return rows;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s) || !V.mine) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (V.phase === "setup") {
      const ord = PERMS[Math.floor(R() * 6)].slice(), cards = V.mine.cards;
      // 같은 동물이 두 장이면 그중 하나를 공개 (정보를 덜 줌), 아니면 아무거나
      let show = Math.floor(R() * 3); if (P.samples) { const pos = ord.map(i => cards[i]); const dup = pos.findIndex((x, i) => pos.some((y, j) => j !== i && y === x)); if (dup >= 0 && P === PROF.hard) show = dup; }
      return { t: "combo", ord, show };
    }
    if (V.phase === "bid") {
      const cr = V.mine.credits, left = Math.max(1, NR - V.round + 1), b = cr / left;
      if (!P.samples) return { t: "bid", g: R() < 0.5 ? "A" : "B", c: 1 + Math.floor(R() * Math.max(1, Math.min(cr, Math.round(b * 2)))) };
      const { rows } = bidScores(V, s, P, R);
      if (P.noise) for (const r of rows) r.u += (R() - 0.5) * P.noise * Math.max(0.3, r.val);
      rows.sort((x, y) => y.u - x.u || x.a.c - y.a.c || (x.a.g < y.a.g ? -1 : 1));
      return Object.assign({}, rows[0].a);
    }
    const rows = placeRows(V, P.samples ? P : { noise: 0 }, R);
    if (!rows.length) return null;
    if (!P.samples) return rows[Math.floor(R() * rows.length)].a;
    rows.sort((x, y) => y.u - x.u || x.a.col - y.a.col || x.a.ti - y.a.ti);
    return Object.assign({}, rows[0].a);
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s) || !V.mine) return null;
    const a = ai(V, s, "hard");
    if (V.phase === "bid") { const B = bidScores(V, s, PROF.hard, seeded(keyV(V, s))), top = B.rows.slice().sort((x, y) => y.u - x.u || x.a.c - y.a.c).slice(0, 3); return { a, rows: top, VA: B.VA, VB: B.VB, mu: B.mu }; }
    if (V.phase === "place") { const rows = placeRows(V, { noise: 0 }, seeded(1)).sort((x, y) => y.u - x.u); return { a, rows: rows.slice(0, 3), cur: evalBoard(V.board, V.mine.seq, V.mine.cond) }; }
    return { a, rows: [] };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA || !V.mine) return null;
    if (V.phase === "bid") { const B = bidScores(V, s, PROF.hard, seeded(keyV(V, s))), f = a => B.rows.find(r => r.a.g === a.g && r.a.c === a.c); const m = f(myA) || { u: -B.mu * myA.c, p: 0, val: 0 }, b = f(bestA); return b ? { my: m, best: b, kind: "bid" } : null; }
    if (V.phase === "place") { const my = evalPlace(V, V.queue, myA.ti, myA.col), best = evalPlace(V, V.queue, bestA.ti, bestA.col); return { my, best, kind: "place" }; }
    return null;
  }

  return { id: "zoo", SP, COND, NR, SZ, CR0, PERMS, WIN, PROF, lineCount, tileCount, condMet, evalBoard, dropRow, seqOf, wOf, valOf, belief, bidScores, placeRows, evalPlace,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge };
});

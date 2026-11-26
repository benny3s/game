/* 베니 서바이벌 · 벽바둑 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 5일차 감옥 '벽바둑'(시즌 2) · 데드 어게인 4일차 감옥 '벽바둑 Ⅱ'(시즌 3) (나무위키 '룰' 절 기준)
   · 7×7 판 (A-G · 1-7). 3명이 1라운드, 1라운드 1등은 생존 확정, 나머지 둘이 2라운드(1:1)에서 맞붙어 진 쪽이 탈락.
   · 1라운드: 사람마다 말 2개 (Ⅱ: 사각 말 1 + 원형 말 1 / 원작: 사각 말 2). 순서 추첨 → 1-2-3-3-2-1 순서로 말을 빈 칸에 한 개씩 놓음.
   · 자기 차례: ① 말 하나 이동 ② 이동한 말의 4면 중 한 곳에 벽 설치(필수, 이미 벽 있는 면 불가).
     사각 말 = 상하좌우 한 방향으로 1~2칸 (Ⅱ 에서도 같음), 원형 말(Ⅱ) = 한 칸 이동 + 좌/우로 꺾어 1칸 더 (꺾지 않아도 됨).
     다른 말이 있는 칸으로는 못 가고 (지나가기도 불가), 길에 벽이 있으면 못 감. 1라운드에 한해 사람마다 한 번 '벽 부수기'(길의 벽 하나를 부수고 이동).
   · 모든 사람의 말이 벽으로 서로 다른 구역에 갈라지면 즉시 라운드 끝. 말이 있는 구역의 칸 수 합이 가장 큰 사람이 1등 (같으면 가장 넓은 한 구역).
   · 2라운드: 1라운드에서 더 넓게 얻은 사람이 선. 각자 말 4개 (Ⅱ: 사각 2 + 원형 2 / 원작: 사각 4), 이 중 2개는 시작 위치가 정해져 있고 나머지 2개는 번갈아 놓음 (선-후-후-선). 벽 부수기 없음.
   확인 못 한 점(우리가 정함): ① 2라운드 고정 말 자리: 선 B2 · F6, 후 F2 · B6 ② 판 가장자리는 이미 벽으로 봄 (벽 설치 · 부수기 불가)
     ③ 두 칸 이동은 중간 칸에도 말이 없어야 함 ④ 같은 점수 · 같은 큰 구역이면 나중에 두는 사람이 위 ⑤ 움직일 수 있는 말이 없으면 차례 넘김
     ⑥ 시간 제한(90초) 없음 ⑦ 1라운드 첫 순서는 무작위 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).wallgo = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const R = 7;
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];                 // 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽
  const DN = ["위", "오른쪽", "아래", "왼쪽"];
  const FIX = [[[1, 1], [5, 5]], [[1, 5], [5, 1]]];             // 2라운드 고정 말 (선, 후)
  const inb = (r, c) => r >= 0 && r < R && c >= 0 && c < R;
  const coord = (r, c) => "ABCDEFG"[c] + (r + 1);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 150) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const mk = (a, b, v) => Array.from({ length: a }, () => Array(b).fill(v));

  // ── 판 ──────────────────────────────────────────────────────
  // S: { wh: 6×7 (위아래로 막는 벽 = (r,c) 아래), wv: 7×6 (좌우를 막는 벽 = (r,c) 오른쪽), pieces: [{o,k,r,c,fx}] }
  function wall(S, r, c, d) {
    if (d === 0) return r === 0 || S.wh[r - 1][c];
    if (d === 2) return r === R - 1 || S.wh[r][c];
    if (d === 1) return c === R - 1 || S.wv[r][c];
    return c === 0 || S.wv[r][c - 1];
  }
  function setWall(S, r, c, d, v) {
    if (d === 0) S.wh[r - 1][c] = v; else if (d === 2) S.wh[r][c] = v; else if (d === 1) S.wv[r][c] = v; else S.wv[r][c - 1] = v;
  }
  const pieceAt = (S, r, c) => S.pieces.findIndex(p => p.r === r && p.c === c);
  const cloneS = S => ({ ...S, wh: S.wh.map(a => a.slice()), wv: S.wv.map(a => a.slice()), pieces: S.pieces.map(p => ({ ...p })), broke: S.broke.slice(), pool: S.pool.map(p => ({ ...p })) });

  // 말 pi 가 갈 수 있는 이동 모두: { p, dirs, to:[r,c], brk: null | 부술 걸음(0/1) }
  function moves(S, pi) {
    const P = S.pieces[pi], out = [], canBreak = S.round === 1 && !S.broke[P.o];
    const trySteps = dirs => {
      let r = P.r, c = P.c, brk = null;
      for (let k = 0; k < dirs.length; k++) {
        const d = dirs[k], nr = r + DR[d], nc = c + DC[d];
        if (!inb(nr, nc)) return;
        if (wall(S, r, c, d)) { if (!canBreak || brk !== null) return; brk = k; }
        if (pieceAt(S, nr, nc) >= 0) return;
        r = nr; c = nc;
      }
      out.push({ p: pi, dirs: dirs.slice(), to: [r, c], brk });
    };
    for (let d = 0; d < 4; d++) {
      trySteps([d]);
      if (P.k === "ci") { trySteps([d, (d + 1) % 4]); trySteps([d, (d + 3) % 4]); }
      else trySteps([d, d]);
    }
    return out;
  }
  function allMoves(S, seat) { const L = []; S.pieces.forEach((p, i) => { if (p.o === seat) L.push(...moves(S, i)); }); return L; }
  function doMove(S, mv) {
    const P = S.pieces[mv.p]; let r = P.r, c = P.c;
    for (let k = 0; k < mv.dirs.length; k++) {
      const d = mv.dirs[k];
      if (mv.brk === k) { setWall(S, r, c, d, false); S.broke[P.o] = true; }
      r += DR[d]; c += DC[d];
    }
    P.r = r; P.c = c; S.moved = mv.p;
  }
  const sides = (S, pi) => { const P = S.pieces[pi], L = []; for (let d = 0; d < 4; d++) if (!wall(S, P.r, P.c, d)) L.push(d); return L; };

  // 구역 나누기 → 각 칸의 구역 번호
  function regions(S) {
    const id = Array(R * R).fill(-1), sizes = [];
    for (let s = 0; s < R * R; s++) {
      if (id[s] >= 0) continue;
      const k = sizes.length; let n = 0; const q = [s]; id[s] = k;
      while (q.length) {
        const x = q.pop(), r = (x / R) | 0, c = x % R; n++;
        for (let d = 0; d < 4; d++) { if (wall(S, r, c, d)) continue; const y = (r + DR[d]) * R + c + DC[d]; if (id[y] < 0) { id[y] = k; q.push(y); } }
      }
      sizes.push(n);
    }
    return { id, sizes };
  }
  // 현재 구역 기준 점수 (말이 있는 서로 다른 구역의 칸 수 합) · 가장 큰 구역 · 모두 갈라졌는지
  function areas(S, seats) {
    const g = regions(S), own = sizes => sizes.map(() => new Set());
    const owners = own(g.sizes);
    for (const p of S.pieces) owners[g.id[p.r * R + p.c]].add(p.o);
    const score = {}, big = {};
    for (const s of seats) { score[s] = 0; big[s] = 0; }
    owners.forEach((set, k) => { for (const o of set) if (o in score) { score[o] += g.sizes[k]; big[o] = Math.max(big[o], g.sizes[k]); } });
    const sep = new Set(S.pieces.map(p => p.o)).size >= 2 && owners.every(set => set.size <= 1);
    return { score, big, sep };
  }
  // 먼저 닿을 수 있는 칸 (말마다 벽을 피해 걷는 거리로 비교, 같은 거리면 주인 없음) → 칸마다 주인 (-1 없음)
  function terr(S, seats) {
    const best = Array(R * R).fill(1e9), who = Array(R * R).fill(-1);
    for (const o of seats) {
      const dist = Array(R * R).fill(1e9), q = [];
      for (const p of S.pieces) if (p.o === o) { dist[p.r * R + p.c] = 0; q.push(p.r * R + p.c); }
      for (let h = 0; h < q.length; h++) {
        const x = q[h], r = (x / R) | 0, c = x % R;
        for (let d = 0; d < 4; d++) { if (wall(S, r, c, d)) continue; const y = (r + DR[d]) * R + c + DC[d]; if (dist[y] > dist[x] + 1) { dist[y] = dist[x] + 1; q.push(y); } }
      }
      for (let i = 0; i < R * R; i++) { if (dist[i] < best[i]) { best[i] = dist[i]; who[i] = o; } else if (dist[i] === best[i] && dist[i] < 1e9 && who[i] !== o) who[i] = -1; }
    }
    return who;
  }

  // ── 상태 ────────────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 3, rs: (seed >>> 0) || 1, log: [], seq: 0, over: false, final: null, variant: cfg && cfg.ver === "classic" ? "classic" : "ii" };
    const ord = [0, 1, 2];
    for (let i = 2; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    st.ord0 = ord; st.r1 = null;
    startRound(st, 1, ord);
    return st;
  }
  function startRound(st, round, ord) {
    st.round = round; st.ord = ord.slice(); st.wh = mk(R - 1, R, false); st.wv = mk(R, R - 1, false); st.pieces = [];
    st.broke = [false, false, false]; st.moved = -1; st.t = 0; st.passRun = 0; st.res = null;
    const ii = st.variant === "ii";
    st.pool = [0, 1, 2].map(() => ({ sq: 0, ci: 0 }));
    if (round === 1) {
      for (const o of ord) { if (ii) { st.pool[o].sq = 1; st.pool[o].ci = 1; } else st.pool[o].sq = 2; }
      st.q = [ord[0], ord[1], ord[2], ord[2], ord[1], ord[0]];
    } else {
      ord.forEach((o, i) => { for (const [r, c] of FIX[i]) st.pieces.push({ o, k: ii ? "ci" : "sq", r, c, fx: true }); st.pool[o].sq = 2; });
      st.q = [ord[0], ord[1], ord[1], ord[0]];
    }
    st.phase = "place"; st.cur = st.q[0]; st.qi = 0;
    push(st, { k: "round", r: round, ord: ord.slice() });
  }
  const cntLeft = (st, s) => st.pool[s].sq + st.pool[s].ci;
  function curMoves(st) { return st.phase === "move" ? allMoves(st, st.cur) : []; }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "place") return [st.cur];
    if (st.phase === "move") return allMoves(st, st.cur).length ? [st.cur] : [];
    if (st.phase === "wall") return sides(st, st.moved).length ? [st.cur] : [];
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "place") {
      if (a.t !== "place" || !Number.isInteger(a.r) || !Number.isInteger(a.c) || !inb(a.r, a.c)) return { ok: false, err: "빈 칸을 골라요" };
      const k = st.variant === "ii" ? a.k : "sq";
      if (k !== "sq" && k !== "ci") return { ok: false, err: "말 종류를 골라요" };
      if (!st.pool[seat][k]) return { ok: false, err: "그 말이 더 없어요" };
      if (pieceAt(st, a.r, a.c) >= 0) return { ok: false, err: "이미 말이 있는 칸이에요" };
      st.pool[seat][k]--; st.pieces.push({ o: seat, k, r: a.r, c: a.c, fx: false });
      push(st, { k: "place", s: seat, kind: k, r: a.r, c: a.c });
      st.qi++;
      if (st.qi >= st.q.length) { st.phase = "move"; st.t = 0; st.cur = st.ord[0]; } else st.cur = st.q[st.qi];
      return { ok: true };
    }
    if (st.phase === "move") {
      if (a.t !== "move") return { ok: false, err: "말을 움직여요" };
      const ms = allMoves(st, seat), mv = ms.find(m => m.p === a.p && JSON.stringify(m.dirs) === JSON.stringify(a.dirs) && (m.brk === undefined ? null : m.brk) === (a.brk === undefined ? null : a.brk));
      if (!mv) return { ok: false, err: "그렇게는 못 움직여요" };
      const from = [st.pieces[mv.p].r, st.pieces[mv.p].c];
      doMove(st, mv); st.passRun = 0; st.phase = "wall";
      push(st, { k: "move", s: seat, p: mv.p, from, to: mv.to.slice(), brk: mv.brk !== null });
      return { ok: true };
    }
    if (a.t !== "wall" || !Number.isInteger(a.d) || a.d < 0 || a.d > 3) return { ok: false, err: "벽을 세울 면을 골라요" };
    if (wall(st, st.pieces[st.moved].r, st.pieces[st.moved].c, a.d)) return { ok: false, err: "이미 벽이 있는 면이에요" };
    const P = st.pieces[st.moved];
    setWall(st, P.r, P.c, a.d, true);
    push(st, { k: "wall", s: seat, p: st.moved, r: P.r, c: P.c, d: a.d });
    afterTurn(st);
    return { ok: true };
  }
  function afterTurn(st) {
    st.moved = -1;
    const seats = st.ord, A = areas(st, seats);
    if (A.sep || st.passRun >= seats.length) return endRound(st, A);
    st.t++; st.cur = st.ord[st.t % st.ord.length]; st.phase = "move";
  }
  // 순위 키: 구역 합 → 가장 큰 구역 → 나중에 두는 사람
  const keyOf = (st, A, s) => [A.score[s], A.big[s], st.ord.indexOf(s)];
  const cmp = (x, y) => y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  function endRound(st, A) {
    const seats = st.ord.slice().sort((a, b) => cmp(keyOf(st, A, a), keyOf(st, A, b)));
    const res = { r: st.round, score: { ...A.score }, big: { ...A.big }, order: seats.slice(), terr: terr(st, st.ord) };
    st.res = res;
    push(st, { k: "end", r: st.round, score: { ...A.score }, win: seats[0] });
    if (st.round === 1) {
      st.r1 = { score: { ...A.score }, win: seats[0], order: seats.slice(), wh: st.wh.map(a => a.slice()), wv: st.wv.map(a => a.slice()), pieces: st.pieces.map(p => ({ ...p })) };
      startRound(st, 2, [seats[1], seats[2]]);            // 더 넓게 얻은 쪽이 선
      return;
    }
    const w = seats[0], l = seats[1], ranks = [0, 0, 0];
    ranks[st.r1.win] = 0; ranks[w] = 1; ranks[l] = 2;
    st.final = { ranks, winner: st.r1.win, w2: w, l2: l };
    st.over = true; st.phase = "end"; push(st, { k: "over", ranks: ranks.slice() });
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : [0, 0, 0]);
  const auto = st => (st.over ? null : st.phase === "move" && !allMoves(st, st.cur).length ? 1100 : st.phase === "wall" && !sides(st, st.moved).length ? 700 : null);
  function advance(st) {
    if (st.over) return;
    if (st.phase === "move" && !allMoves(st, st.cur).length) { push(st, { k: "pass", s: st.cur }); st.passRun++; afterTurn(st); return; }
    if (st.phase === "wall" && !sides(st, st.moved).length) afterTurn(st);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "place") {
      const L = [];
      for (const k of ["sq", "ci"]) if (st.pool[seat][k] && (st.variant === "ii" || k === "sq")) for (let r = 0; r < R; r++) for (let c = 0; c < R; c++) if (pieceAt(st, r, c) < 0) L.push({ t: "place", k, r, c });
      return L;
    }
    if (st.phase === "move") return allMoves(st, seat).map(m => ({ t: "move", p: m.p, dirs: m.dirs, brk: m.brk }));
    return sides(st, st.moved).map(d => ({ t: "wall", d }));
  }

  // ── 보이는 것 (모두 공개) ─────────────────────────────────────
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const A = areas(st, st.ord);
    const cur = st.over ? -1 : st.cur;
    const V = {
      n: 3, variant: st.variant, round: st.round, phase: st.phase, cur, ord: st.ord.slice(), t: st.t,
      wh: st.wh.map(a => a.slice()), wv: st.wv.map(a => a.slice()), pieces: st.pieces.map(p => ({ ...p })),
      pool: st.pool.map(p => ({ ...p })), broke: st.broke.slice(), moved: st.moved, qi: st.qi, q: st.q.slice(),
      area: A.score, big: A.big, terr: terr(st, st.ord), sep: A.sep,
      moves: cur >= 0 && st.phase === "move" && cur === me ? allMoves(st, me).map(m => ({ p: m.p, dirs: m.dirs, to: m.to, brk: m.brk })) : [],
      sides: cur >= 0 && st.phase === "wall" && cur === me ? sides(st, st.moved) : [],
      r1: st.r1 ? { score: st.r1.score, win: st.r1.win, order: st.r1.order.slice() } : null,
      res: st.res ? { r: st.res.r, score: { ...st.res.score }, big: { ...st.res.big }, order: st.res.order.slice() } : null,
      needs: needs(st), over: st.over, ranks: st.final ? st.final.ranks.slice() : null, winner: st.final ? st.final.winner : null,
      w2: st.final ? st.final.w2 : null, l2: st.final ? st.final.l2 : null,
      score: [0, 1, 2].map(s => A.score[s] || 0), log: st.log.slice(-80), seat,
    };
    V.pub = hash(JSON.stringify({ ...V, moves: 0, sides: 0, seat: 0, pub: 0 }));
    return V;
  }
  // view → 계산용 판 (AI · 선생님이 같은 함수를 쓰게)
  const fromView = V => ({ round: V.round, variant: V.variant, wh: V.wh.map(a => a.slice()), wv: V.wv.map(a => a.slice()), pieces: V.pieces.map(p => ({ ...p })),
    broke: V.broke.slice(), pool: V.pool.map(p => ({ ...p })), ord: V.ord.slice(), cur: V.cur, moved: V.moved, phase: V.phase });

  // ── AI ──────────────────────────────────────────────────────
  // 평가: 내가 먼저 닿는 칸 − 가장 센 상대. 갈라졌으면 실제 구역으로 승패에 큰 값.
  function evalS(S, me) {
    const seats = S.ord, A = areas(S, seats);
    if (A.sep) {
      const opp = seats.filter(s => s !== me), mo = Math.max(...opp.map(s => A.score[s])), bo = Math.max(...opp.map(s => A.big[s]));
      const win = opp.every(o => cmp(keyOf(S, A, me), keyOf(S, A, o)) < 0);     // 실제 순위 규칙 그대로 (같으면 나중에 두는 사람이 위)
      return (win ? 60 : -60) + (A.score[me] - mo);
    }
    const w = terr(S, seats); let mine = 0; const oth = {};
    for (const o of seats) oth[o] = 0;
    for (const x of w) if (x >= 0) oth[x]++;
    mine = oth[me]; const mo = Math.max(...seats.filter(s => s !== me).map(s => oth[s]));
    return mine - mo + 0.12 * mine;
  }
  function bestWall(S, me) {
    let best = null;
    for (const d of sides(S, S.moved)) { const T = cloneS(S), P = T.pieces[T.moved]; setWall(T, P.r, P.c, d, true); const e = evalS(T, me); if (!best || e > best.e) best = { d, e }; }
    return best;
  }
  function candMoves(S, me, r, penalty = 1.5) {
    const L = [];
    for (const mv of allMoves(S, me)) {
      const T = cloneS(S); doMove(T, mv);
      const w = bestWall(T, me);
      const e = (w ? w.e : evalS(T, me)) - (mv.brk !== null ? penalty : 0) + r() * 0.02;
      L.push({ mv, e, d: w ? w.d : -1 });
    }
    return L.sort((a, b) => b.e - a.e);
  }
  // 벽 칠 수 있는 면마다 평가 (복기 · AI 가 같이 씀)
  function wallEvals(S, me) {
    const L = [];
    for (const d of sides(S, S.moved)) { const T = cloneS(S), P = T.pieces[T.moved]; setWall(T, P.r, P.c, d, true); L.push({ d, e: evalS(T, me) }); }
    return L.sort((a, b) => b.e - a.e);
  }
  // 말 놓기 후보와 평가 (내림차순) — 무작위 흔들림 r 을 쓴다
  function placeOpts(V, me, r) {
    const S = fromView(V), opts = [];
    for (const k of (V.variant === "ii" ? ["sq", "ci"] : ["sq"])) if (V.pool[me][k]) for (let rr = 0; rr < R; rr++) for (let c = 0; c < R; c++) {
      if (pieceAt(S, rr, c) >= 0) continue;
      S.pieces.push({ o: me, k, r: rr, c, fx: false });
      const e = evalS(S, me) + (k === "ci" ? 0.05 : 0) - (Math.abs(rr - 3) + Math.abs(c - 3)) * 0.04 + r() * 0.15;
      S.pieces.pop(); opts.push({ k, r: rr, c, e });
    }
    return opts.sort((a, b) => b.e - a.e);
  }
  function pickPlace(V, me, tier, r) {
    const opts = placeOpts(V, me, r);
    const top = tier === "easy" ? Math.min(14, opts.length) : tier === "normal" ? Math.min(3, opts.length) : 1;
    const o = opts[Math.floor(r() * top)];
    return { t: "place", k: o.k, r: o.r, c: o.c };
  }
  function ai(V, me, tier, r) {
    if (V.phase === "place") return pickPlace(V, me, tier, r);
    const S = fromView(V);
    if (V.phase === "wall") { const w = bestWall(S, me); return w ? { t: "wall", d: tier === "easy" && r() < 0.3 ? sides(S, S.moved)[Math.floor(r() * sides(S, S.moved).length)] : w.d } : null; }
    if (V.phase !== "move") return null;
    const L = candMoves(S, me, r);
    if (!L.length) return null;
    let pickI = 0;
    if (tier === "easy") pickI = Math.floor(r() * Math.min(L.length, Math.max(3, Math.ceil(L.length * 0.35))));
    else if (tier === "normal") pickI = r() < 0.2 ? Math.min(1, L.length - 1) : 0;
    else {                                                        // 어려움: 다음 상대의 최선 응수까지 보고 고름
      const nxt = S.ord[(V.t + 1) % S.ord.length];
      let bs = -1e9;
      L.slice(0, 8).forEach((c, i) => {
        const T = cloneS(S); doMove(T, c.mv); if (c.d >= 0) { const P = T.pieces[T.moved]; setWall(T, P.r, P.c, c.d, true); }
        T.moved = -1; T.cur = nxt; const a = areas(T, T.ord);
        let e;
        if (a.sep) e = evalS(T, me);
        else { const reply = candMoves(T, nxt, r, 1.5)[0]; if (!reply) e = c.e; else { const U = cloneS(T); doMove(U, reply.mv); if (reply.d >= 0) { const P = U.pieces[U.moved]; setWall(U, P.r, P.c, reply.d, true); } e = evalS(U, me); } }
        e = e * 0.8 + c.e * 0.2;
        if (e > bs) { bs = e; pickI = i; }
      });
    }
    const m = L[pickI].mv;
    return { t: "move", p: m.p, dirs: m.dirs, brk: m.brk };
  }

  // ── AI 선생님 ───────────────────────────────────────────────
  const KOK = { sq: "사각 말", ci: "원형 말" };
  let coachCache = { key: "", val: null };                          // 화면을 다시 그릴 때마다 계산하지 않게 마지막 답을 기억
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const raw = i => String((names && names[i]) || `${i + 1}번`), nm = i => esc(raw(i));
    const cnt = [0, 0, 0]; for (const x of V.terr) if (x >= 0) cnt[x]++;
    const act = V.ord, oth = act.filter(s => s !== me);
    if (V.over) {
      if (me < 0) return { opp: "끝났어요.", mine: "", rec: "구경 끝", why: "" };
      const kept = V.ranks[me] === 0 && V.r1 ? V.r1.score[me] : V.area[me];       // 1라운드 1등은 1라운드 구역, 나머지는 2라운드 구역
      return { opp: "끝났어요.", mine: `내 구역 ${kept || 0}칸`, rec: V.ranks[me] === 0 ? "🏆 1라운드에서 살아남았어요" : V.ranks[me] === 1 ? "2라운드에서 이겼어요" : "2라운드에서 졌어요", why: "" };
    }
    const opp = oth.length ? oth.map(s => `${nm(s)} 영역 ${cnt[s]}칸(예상)`).join(" · ") + `. 구역이 갈라지면 말이 있는 구역의 칸 수 합으로 승부가 나요.` : "";
    const mine = me >= 0 && act.includes(me) ? `내 영역 ${cnt[me]}칸(예상)${V.round === 1 ? ` · 벽 부수기 ${V.broke[me] ? "썼음" : "남음"}` : ""}.` : "내 말이 없어요";
    if (me < 0) return { opp, mine: "구경 중이에요", rec: "구경해요", why: "색이 바뀌는 것을 보며 누가 더 넓은 영역을 쥐는지 따라가 봐요." };
    if (!act.includes(me)) return { opp, mine, rec: "구경해요", why: "1라운드에서 살아남았어요. 나머지 둘이 2라운드를 해요." };
    if (!V.needs.includes(me)) return { opp, mine, rec: "다른 사람을 기다려요", why: "" };
    const r = (() => { let a = 91 + V.t * 17 + me * 7 + V.pieces.length; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    const ckey = `${me}|${V.pub}`;
    const g = coachCache.key === ckey ? coachCache.val : (coachCache = { key: ckey, val: ai(V, me, "hard", r) }).val;
    if (!g) return { opp, mine, rec: "-", why: "" };
    // 숫자 근거: 그 수를 둔 뒤 내가 먼저 닿는 칸 수와 가장 센 상대의 칸 수 (갈라졌으면 말이 있는 구역의 칸 수 합)
    const snap = T => {
      const seats = T.ord, A = areas(T, seats), others = seats.filter(s => s !== me);
      if (A.sep) return { sep: true, mine: A.score[me], opp: Math.max(...others.map(s => A.score[s])) };
      const w = terr(T, seats), oc = {}; for (const o of seats) oc[o] = 0;
      for (const x of w) if (x >= 0) oc[x]++;
      return { sep: false, mine: oc[me], opp: Math.max(...others.map(s => oc[s])) };
    };
    const line = s => (s.sep ? `구역이 갈라져 말이 있는 구역의 칸 수 합이 나 ${s.mine} · 가장 센 상대 ${s.opp}` : `내가 먼저 닿는 칸 ${s.mine}개 · 가장 센 상대 ${s.opp}개`);
    const nowOpp = Math.max(0, ...oth.map(s => cnt[s]));
    if (g.t === "place") {
      const S2 = fromView(V); S2.pieces.push({ o: me, k: g.k, r: g.r, c: g.c, fx: false });
      return { opp, mine, rec: `${KOK[g.k]}을 ${coord(g.r, g.c)}에`, why: `여기에 놓으면 ${line(snap(S2))}예요 — 말 둘레로 먼저 닿는 칸이 가장 많고 상대와 덜 겹치는 자리예요. 한쪽 귀퉁이에만 몰리면 협공당하기 쉬워요.` };
    }
    const S = fromView(V);
    if (g.t === "move") {
      const P = S.pieces[g.p], mv = allMoves(S, me).find(m => m.p === g.p && JSON.stringify(m.dirs) === JSON.stringify(g.dirs) && m.brk === g.brk);
      const T = cloneS(S); doMove(T, mv); const w = bestWall(T, me);
      if (w) { const Q = T.pieces[T.moved]; setWall(T, Q.r, Q.c, w.d, true); }
      return { opp, mine, rec: `${coord(P.r, P.c)}의 ${KOK[P.k]}을 ${coord(mv.to[0], mv.to[1])}${ja(coord(mv.to[0], mv.to[1]), "로")}${mv.brk !== null ? " (벽 부수기)" : ""}`, why: `${w ? `이동한 뒤 ${DN[w.d]}쪽에 벽을 세우면` : "이렇게 하면"} ${line(snap(T))}예요 (지금은 나 ${cnt[me]}칸 · 상대 ${nowOpp}칸).${mv.brk !== null ? " 벽 부수기는 한 번뿐이라 정말 이득일 때만 써요." : ""}` };
    }
    const T2 = cloneS(S), P2 = T2.pieces[T2.moved]; setWall(T2, P2.r, P2.c, g.d, true);
    return { opp, mine, rec: `${DN[g.d]}쪽에 벽`, why: `이 면에 벽을 세우면 ${line(snap(T2))}예요 (지금은 나 ${cnt[me]}칸 · 상대 ${nowOpp}칸) — 내가 먼저 닿는 영역은 지키고 상대가 파고들 길은 막아요. 구역을 가르면 말이 있는 구역의 칸 수 합으로 끝나니 늘 세어 봐요.` };
  }

  return { id: "wallgo", R, FIX, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, moves, allMoves, areas, terr, regions, coord, wall, fromView, cloneS, doMove, sides, evalS, DN, candMoves, wallEvals, placeOpts };
});

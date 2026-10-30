/* 바둑 규칙 엔진 (화면 없음 · 결정적 · 브라우저/Node 같은 코드)
   - 상태(state)는 평범한 객체 + Int8Array (Baduk.toJSON / fromJSON 으로 JSON 왕복)
   - 행동(action) = 점 번호 y*N+x (0 ~ N*N-1), 패스 = N*N, 기권 = -1
   - play(state, a) → { state(새 객체), events } : 화면은 events 로 소리·효과만 냄
   - 빠른 판(Board 클래스)은 AI 수읽기·신경망 입력·축 찾기에 같이 씀
   - 집 계산: 한국식(집 + 따낸 돌 + 덤, 빅은 집 없음) = goscorer(MIT, lightvector) · 강화학습 보상 = Tromp-Taylor 면적 계산 */
(function (root) {
  "use strict";
  const EMPTY = 0, BLACK = 1, WHITE = 2, WALL = 3;
  const opp = c => 3 - c;

  // 결정적 난수 (조브리스트 표·AI 공용) — mulberry32
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 조브리스트: 판 크기별로 한 번 (같은 씨앗 → 언제나 같은 값)
  const ZOB = {};
  function zobrist(N) {
    if (ZOB[N]) return ZOB[N];
    const A = (N + 2) * (N + 1) + 1, r = mulberry32(0x9e3779b9 ^ N);
    const t = new Int32Array(A * 6);
    for (let i = 0; i < t.length; i++) t[i] = (r() * 4294967296) | 0;
    return (ZOB[N] = t);
  }

  /* ── 빠른 판 ───────────────────────────────────────────────
     칸 번호 i = (y+1)*(N+1) + (x+1), 둘레는 WALL. 사슬은 원형 연결 목록(head·next·sz)
     활로 수는 필요할 때 세고(도장 배열로 중복 제거), 따낸 돌은 lastCap 에 */
  class Board {
    constructor(N) {
      this.N = N; this.W = N + 1; this.A = (N + 2) * (N + 1) + 1;
      const A = this.A;
      this.c = new Int8Array(A).fill(WALL);
      this.head = new Int16Array(A); this.next = new Int16Array(A); this.sz = new Int16Array(A);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) this.c[(y + 1) * this.W + x + 1] = EMPTY;
      this.ko = 0;                       // 다음 사람이 못 두는 패 자리 (0 = 없음, 0 번은 늘 벽)
      this.capB = 0; this.capW = 0;      // 흑이 따낸 돌 · 백이 따낸 돌
      this.h1 = 0; this.h2 = 0;          // 판 해시 (돌 배치만)
      this.stamp = new Int32Array(A); this.st = 1;
      this.adj = [-this.W, -1, 1, this.W];
      this.lastCap = [];                 // 마지막 수로 따낸 칸들
      this.z = zobrist(N);
    }
    idx(x, y) { return (y + 1) * this.W + x + 1; }
    pt(i) { return (((i / this.W) | 0) - 1) * this.N + (i % this.W) - 1; }
    ix(p) { return this.idx(p % this.N, (p / this.N) | 0); }
    clone() { const b = new Board(this.N); b.copyFrom(this); return b; }
    copyFrom(o) {
      this.c.set(o.c); this.head.set(o.head); this.next.set(o.next); this.sz.set(o.sz);
      this.ko = o.ko; this.capB = o.capB; this.capW = o.capW; this.h1 = o.h1; this.h2 = o.h2;
    }
    _mark() { if (++this.st > 2e9) { this.stamp.fill(0); this.st = 1; } return this.st; }
    // 사슬 활로 수 (max 에 닿으면 바로 멈춤)
    libs(i, max = 9999) {
      const c = this.c, s = this._mark(), st = this.stamp, a = this.adj;
      let n = 0, cur = i;
      do {
        for (let k = 0; k < 4; k++) {
          const j = cur + a[k];
          if (c[j] === EMPTY && st[j] !== s) { st[j] = s; if (++n >= max) return n; }
        }
        cur = this.next[cur];
      } while (cur !== i);
      return n;
    }
    libList(i, out) {
      const c = this.c, s = this._mark(), st = this.stamp, a = this.adj;
      out.length = 0; let cur = i;
      do {
        for (let k = 0; k < 4; k++) { const j = cur + a[k]; if (c[j] === EMPTY && st[j] !== s) { st[j] = s; out.push(j); } }
        cur = this.next[cur];
      } while (cur !== i);
      return out;
    }
    chain(i, out = []) { out.length = 0; let cur = i; do { out.push(cur); cur = this.next[cur]; } while (cur !== i); return out; }
    // 자충(스스로 잡힘)이 아니고, 비어 있고, 패가 아니면 둘 수 있음
    isLegal(i, col) {
      const c = this.c;
      if (c[i] !== EMPTY || i === this.ko) return false;
      return !this.isSuicide(i, col);
    }
    isSuicide(i, col) {
      const c = this.c, a = this.adj;
      for (let k = 0; k < 4; k++) {
        const j = i + a[k], cj = c[j];
        if (cj === EMPTY) return false;
        if (cj === col) { if (this.libs(this.head[j], 2) >= 2) return false; }
        else if (cj !== WALL) { if (this.libs(this.head[j], 2) === 1) return false; }
      }
      return true;
    }
    _hash(i, col) { const z = this.z, k = (i * 3 + col) * 2; this.h1 ^= z[k]; this.h2 ^= z[k + 1]; }
    // 둠 (둘 수 있는 자리라고 가정). 따낸 돌 수를 돌려줌. 패스는 i = 0
    play(i, col) {
      this.lastCap.length = 0;
      if (i === 0) { this.ko = 0; return 0; }
      const c = this.c, a = this.adj, o = opp(col), head = this.head, next = this.next, sz = this.sz;
      c[i] = col; head[i] = i; next[i] = i; sz[i] = 1; this._hash(i, col);
      let captured = 0, koSpot = 0;
      for (let k = 0; k < 4; k++) {
        const j = i + a[k], cj = c[j];
        if (cj === col) {
          const hj = head[j], hi = head[i];
          if (hj !== hi) {                                           // 작은 사슬을 큰 사슬에 붙임
            let big = hj, small = hi;
            if (sz[hi] > sz[hj]) { big = hi; small = hj; }
            let cur = small; do { head[cur] = big; cur = next[cur]; } while (cur !== small);
            const t = next[big]; next[big] = next[small]; next[small] = t;
            sz[big] += sz[small];
          }
        } else if (cj === o) {
          if (this.libs(head[j], 1) === 0) { const n = this._remove(head[j]); captured += n; koSpot = j; }
        }
      }
      // 패: 돌 하나를 따냈고, 둔 돌이 홀로 활로 하나뿐일 때
      this.ko = (captured === 1 && sz[head[i]] === 1 && this.libs(i, 2) === 1) ? koSpot : 0;
      if (col === BLACK) this.capB += captured; else this.capW += captured;
      return captured;
    }
    _remove(h) {
      const c = this.c, next = this.next; let n = 0, cur = h;
      do { const nx = next[cur]; this._hash(cur, c[cur]); c[cur] = EMPTY; this.lastCap.push(cur); n++; cur = nx; } while (cur !== h);
      return n;
    }
    // 단순 눈: 네 방향이 다 내 돌(또는 벽), 대각 상대 돌이 적음 — 플레이아웃에서 눈 메우지 않기
    isEye(i, col) {
      const c = this.c, W = this.W;
      if (c[i] !== EMPTY) return false;
      let wall = false;
      for (const d of this.adj) { const v = c[i + d]; if (v === WALL) wall = true; else if (v !== col) return false; }
      let bad = 0; const o = opp(col);
      for (const d of [-W - 1, -W + 1, W - 1, W + 1]) if (c[i + d] === o) bad++;
      return wall ? bad === 0 : bad < 2;
    }
    // 판에서 바로 만들기 (Int8Array N*N, 0/1/2)
    static fromArray(N, arr) {
      const b = new Board(N);
      for (let p = 0; p < N * N; p++) if (arr[p]) { const i = b.ix(p); b.c[i] = arr[p]; b.head[i] = i; b.next[i] = i; b.sz[i] = 1; b._hash(i, arr[p]); }
      for (let p = 0; p < N * N; p++) {                                // 이웃끼리 사슬 합치기
        const i = b.ix(p), col = b.c[i]; if (col !== BLACK && col !== WHITE) continue;
        for (const d of [1, b.W]) {
          const j = i + d; if (b.c[j] !== col) continue;
          const hi = b.head[i], hj = b.head[j]; if (hi === hj) continue;
          let big = hj, small = hi; if (b.sz[hi] > b.sz[hj]) { big = hi; small = hj; }
          let cur = small; do { b.head[cur] = big; cur = b.next[cur]; } while (cur !== small);
          const t = b.next[big]; b.next[big] = b.next[small]; b.next[small] = t; b.sz[big] += b.sz[small];
        }
      }
      return b;
    }
    toArray(out = new Int8Array(this.N * this.N)) { const N = this.N; for (let p = 0; p < N * N; p++) out[p] = this.c[this.ix(p)]; return out; }
  }

  // ── 축(사다리) 찾기 — KataGo board.cpp searchIsLadderCaptured(MIT) 를 옮김. 신경망 입력 14~17 번에 씀
  // 판을 깊이마다 복사해서 수를 되돌림. 마디 2만 5천 개 넘으면 '모름 = 안 잡힘'
  const LADDER_BUDGET = 25000;
  function ladderCaptured(b0, i, defenderFirst) {
    const col = b0.c[i]; if (col !== BLACK && col !== WHITE) return false;
    const L = b0.libs(b0.head[i], 3);
    if (L > 2 || (defenderFirst && L > 1)) return false;
    const pla = col, o = opp(col);
    let nodes = 0;
    const tmp = [];
    function search(b, isDef, depth) {
      if (depth > b.N * b.N * 1.5) return true;
      const libs = b.libs(b.head[i], 3);
      if (!isDef && libs <= 1) return true;
      if (!isDef && libs >= 3) return false;
      if (isDef && libs >= 2) return false;
      if (isDef && b.ko !== 0) return false;                         // 패가 걸리면 축 아님으로 봄
      let moves;
      if (isDef) {
        moves = libertyGainingCaptures(b, i);
        const lib = b.libList(b.head[i], tmp)[0];
        if (moves.indexOf(lib) < 0) moves.push(lib);
        const [lo, hi] = boundLibsAfterPlay(b, moves[moves.length - 1], pla);
        if (lo >= 3) return false;
        if (moves.length === 1 && hi <= 1) return true;
      } else {
        moves = b.libList(b.head[i], tmp).slice();
        let l0 = immLibs(b, moves[0]), l1 = immLibs(b, moves[1]);
        if (l0 === 0 && l1 === 0 && wouldBeKoCapture(b, moves[0], o) && wouldBeKoCapture(b, moves[1], o)) {
          if (libsAfterPlay(b, moves[0], pla, 3) <= 2 && libsAfterPlay(b, moves[1], pla, 3) <= 2 && !hasLibertyGainingCaptures(b, i)) return true;
        }
        if (!isAdjacent(b, moves[0], moves[1])) {
          if (l0 >= 3 && l1 >= 3) return false;
          else if (l0 >= 3) moves = [moves[0]];
          else if (l1 >= 3) moves = [moves[1]];
        }
        if (moves.length > 1) {
          l0 = l0 * 2 + connLibsX2(b, moves[0], pla); l1 = l1 * 2 + connLibsX2(b, moves[1], pla);
          if (l1 > l0) moves = [moves[1], moves[0]];
        }
      }
      for (const m of moves) {
        const p = isDef ? pla : o;
        if (!b.isLegal(m, p)) continue;
        if (++nodes > LADDER_BUDGET) throw LADDER_BUDGET;
        const nb = b.clone(); nb.play(m, p);
        const r = search(nb, !isDef, depth + 1);
        if (isDef && !r) return false;
        if (!isDef && r) return true;
      }
      return isDef;
    }
    const b = b0.clone();
    if (defenderFirst) b.ko = 0;                                     // 뿌리에서는 지키는 쪽 패를 풀어 줌
    try { return search(b, defenderFirst, 0); } catch (e) { if (e === LADDER_BUDGET) return false; throw e; }
  }
  // 활로 둘인 사슬: 공격자가 먼저 두어 축으로 잡히는 수 (잡히면 그 수들)
  function ladderAttackFirst2(b, i) {
    const lib = b.libList(b.head[i], []);
    if (lib.length !== 2) return null;
    const o = opp(b.c[i]), works = [];
    for (const m of lib) {
      if (!b.isLegal(m, o)) continue;
      const nb = b.clone(); nb.play(m, o);
      if (ladderCaptured(nb, i, true)) works.push(m);
    }
    return works.length ? works : null;
  }
  function immLibs(b, i) { let n = 0; for (const d of b.adj) if (b.c[i + d] === EMPTY) n++; return n; }
  function isAdjacent(b, i, j) { const d = i - j; return d === 1 || d === -1 || d === b.W || d === -b.W; }
  function connLibsX2(b, i, pla) { let n = 0; for (const d of b.adj) { const j = i + d; if (b.c[j] === pla) { const l = b.libs(b.head[j]); if (l > 1) n += l * 2 - 3; } } return n; }
  function wouldBeKoCapture(b, i, pla) {
    if (b.c[i] !== EMPTY) return false;
    const o = opp(pla); let cap = 0;
    for (const d of b.adj) {
      const j = i + d, v = b.c[j];
      if (v !== WALL && v !== o) return false;
      if (v === o && b.libs(b.head[j], 2) === 1) { if (cap) return false; cap = j; }
    }
    return cap !== 0 && b.sz[b.head[cap]] === 1;
  }
  function hasLibertyGainingCaptures(b, i) {
    const o = opp(b.c[i]); let cur = i;
    do { for (const d of b.adj) { const j = cur + d; if (b.c[j] === o && b.libs(b.head[j], 2) === 1) return true; } cur = b.next[cur]; } while (cur !== i);
    return false;
  }
  function libertyGainingCaptures(b, i) {
    const o = opp(b.c[i]), out = [], seen = [], tmp = []; let cur = i;
    do {
      for (const d of b.adj) {
        const j = cur + d;
        if (b.c[j] === o) { const h = b.head[j]; if (seen.indexOf(h) < 0 && b.libs(h, 2) === 1) { seen.push(h); for (const l of b.libList(h, tmp)) if (out.indexOf(l) < 0) out.push(l); } }
      }
      cur = b.next[cur];
    } while (cur !== i);
    return out;
  }
  function boundLibsAfterPlay(b, i, pla) {
    const o = opp(pla); let imm = 0, caps = 0, capStones = 0, conn = 0, maxConn = 0;
    for (const d of b.adj) {
      const j = i + d, v = b.c[j];
      if (v === EMPTY) imm++;
      else if (v === o) { if (b.libs(b.head[j], 2) === 1) { caps++; capStones += b.sz[b.head[j]]; } }
      else if (v === pla) { const cl = b.libs(b.head[j]) - 1; conn += cl; if (cl > maxConn) maxConn = cl; }
    }
    return [caps + Math.max(maxConn, imm), imm + capStones + conn];
  }
  function libsAfterPlay(b, i, pla, max) {
    const nb = b.clone(); if (!nb.isLegal(i, pla) && i !== b.ko) return 0;
    nb.ko = 0; nb.play(i, pla); return Math.min(max, nb.libs(nb.head[i], max));
  }
  // 판 전체: 축에 걸린 돌(14·15·16 번)과 잡는 수(17 번). fn(칸, 잡는 수들) 을 돌마다 부름
  function iterLadders(b, fn) {
    const N = b.N, solved = new Map();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = b.idx(x, y), col = b.c[i];
      if (col !== BLACK && col !== WHITE) continue;
      const L = b.libs(b.head[i], 3);
      if (L !== 1 && L !== 2) continue;
      const h = b.head[i];
      if (solved.has(h)) { if (solved.get(h)) fn(i, []); continue; }
      let works = null, lad;
      if (L === 1) lad = ladderCaptured(b, i, true);
      else { works = ladderAttackFirst2(b, i); lad = !!works; }
      solved.set(h, lad);
      if (lad) fn(i, works || []);
    }
  }

  /* ── 게임 상태 (순수 함수) ───────────────────────────────── */
  const HANDI = {                                    // 접바둑 돌 자리 (x,y) — 화점 순서
    9: [[6, 2], [2, 6], [6, 6], [2, 2], [4, 4], [2, 4], [6, 4], [4, 2], [4, 6]],
    13: [[9, 3], [3, 9], [9, 9], [3, 3], [6, 6], [3, 6], [9, 6], [6, 3], [6, 9]],
    19: [[15, 3], [3, 15], [15, 15], [3, 3], [9, 9], [3, 9], [15, 9], [9, 3], [9, 15]],
  };
  function handicapPoints(N, n) {
    const L = HANDI[N]; if (!L || n < 2) return [];
    let pick;
    if (n <= 4) pick = L.slice(0, n);
    else if (n === 5) pick = [...L.slice(0, 4), L[4]];
    else if (n === 6) pick = [...L.slice(0, 4), L[5], L[6]];
    else if (n === 7) pick = [...L.slice(0, 4), L[5], L[6], L[4]];
    else if (n === 8) pick = [...L.slice(0, 4), L[5], L[6], L[7], L[8]];
    else pick = L.slice(0, 9);
    return pick.map(([x, y]) => y * N + x);
  }
  const STAR = { 7: [[2, 2], [4, 2], [3, 3], [2, 4], [4, 4]], 9: [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]], 13: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]], 19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]] };
  const starPoints = N => (STAR[N] || []).map(([x, y]) => y * N + x);

  const HIST = 8;                                    // 상태에 담는 이전 판 수 (강화학습 입력·신경망 축 입력)
  // create({ size, komi, handicap, superko, maxMoves, rules }) 또는 create(size, komi, rules)
  function create(opt = {}, komi, rules) {
    if (typeof opt === "number") opt = { size: opt, komi, rules };
    const N = opt.size || 9;
    if (![5, 7, 9, 11, 13, 15, 17, 19].includes(N)) throw new Error("판 크기는 5~19 홀수");
    const handicap = Math.max(0, Math.min(9, opt.handicap | 0));
    const setup = handicapPoints(N, handicap);
    const board = new Int8Array(N * N);
    for (const p of setup) board[p] = BLACK;
    return {
      v: 1, size: N,
      komi: opt.komi != null ? +opt.komi : (handicap >= 2 ? 0.5 : 6.5),
      rules: opt.rules || "korean", superko: !!opt.superko, handicap: setup.length ? handicap : 0,
      maxMoves: opt.maxMoves || N * N * 3,
      setup, board, toPlay: setup.length ? WHITE : BLACK, ko: -1,
      caps: [0, 0, 0], moves: [], passes: 0, hist: [], hashes: [],
      over: false, end: null,
    };
  }
  const first = s => (s.setup.length ? WHITE : BLACK);
  function toBoard(s) { const b = Board.fromArray(s.size, s.board); b.ko = s.ko >= 0 ? b.ix(s.ko) : 0; b.capB = s.caps[1]; b.capW = s.caps[2]; return b; }
  // 둘 수 있는지 (패·자충·초패(켰을 때)·끝난 판)
  function isLegal(s, a, b = toBoard(s)) {
    const N = s.size;
    if (s.over) return false;
    if (a === N * N || a === -1) return true;
    if (!(a >= 0 && a < N * N) || s.board[a] !== EMPTY) return false;
    const i = b.ix(a);
    if (!b.isLegal(i, s.toPlay)) return false;
    if (s.superko) { const nb = b.clone(); nb.play(i, s.toPlay); if (s.hashes.includes(hashKey(nb))) return false; }
    return true;
  }
  const hashKey = b => (b.h1 >>> 0).toString(36) + "." + (b.h2 >>> 0).toString(36);
  function legal(s) {
    const N = s.size, m = new Uint8Array(N * N + 1);
    if (s.over) return m;
    const b = toBoard(s);
    for (let p = 0; p < N * N; p++) if (s.board[p] === EMPTY && isLegal(s, p, b)) m[p] = 1;
    m[N * N] = 1;
    return m;
  }
  function play(s, a) {
    const N = s.size, PASS = N * N, events = [];
    if (s.over) return { state: s, events: [{ type: "illegal", why: "over" }] };
    const col = s.toPlay;
    if (a === -1) {                                                   // 기권
      const ns = { ...s, over: true, end: { reason: "resign", loser: col, winner: opp(col) } };
      return { state: ns, events: [{ type: "resign", color: col }, { type: "end", ...ns.end }] };
    }
    const b = toBoard(s);
    if (!isLegal(s, a, b)) return { state: s, events: [{ type: "illegal", p: a, why: s.board[a] ? "occupied" : (a === s.ko ? "ko" : "suicide") }] };
    const ns = { ...s, moves: s.moves.concat([a]), hist: [s.board].concat(s.hist).slice(0, HIST), caps: s.caps.slice() };
    if (a === PASS) {
      ns.passes = s.passes + 1; ns.ko = -1; ns.toPlay = opp(col);
      events.push({ type: "pass", color: col });
    } else {
      const i = b.ix(a);
      b.play(i, col);
      ns.board = b.toArray();
      ns.caps[col] += b.lastCap.length;
      ns.ko = b.ko ? b.pt(b.ko) : -1;
      ns.passes = 0; ns.toPlay = opp(col);
      events.push({ type: "place", p: a, color: col });
      if (b.lastCap.length) events.push({ type: "capture", by: col, points: b.lastCap.map(j => b.pt(j)) });
      // 단수(돌이 활로 하나): 상대 돌을 단수로 만들었으면 알려 줌 (초보 도움말·소리)
      const ataris = [];
      for (const d of b.adj) { const j = i + d; if (b.c[j] === opp(col) && b.libs(b.head[j], 2) === 1 && !ataris.includes(b.head[j])) ataris.push(b.head[j]); }
      if (ataris.length) events.push({ type: "atari", color: opp(col), points: ataris.flatMap(h => b.chain(h).map(j => b.pt(j))) });
      if (ns.ko >= 0) events.push({ type: "ko", p: ns.ko });
      if (s.superko) ns.hashes = s.hashes.concat([hashKey(b)]);
    }
    if (ns.passes >= 2) { ns.over = true; ns.end = { reason: "pass" }; events.push({ type: "end", reason: "pass" }); }
    else if (ns.moves.length >= s.maxMoves) { ns.over = true; ns.end = { reason: "maxmoves" }; events.push({ type: "end", reason: "maxmoves" }); }
    return { state: ns, events };
  }
  // 되돌리기: 처음부터 다시 둬서 (결정적, 단순). n 수 무름
  function undo(s, n = 1) {
    const keep = Math.max(0, s.moves.length - n);
    return replay(s, s.moves.slice(0, keep));
  }
  function replay(s, moves) {
    let t = create({ size: s.size, komi: s.komi, rules: s.rules, superko: s.superko, handicap: s.handicap, maxMoves: s.maxMoves });
    if (s.superko) { const b = toBoard(t); t.hashes = [hashKey(b)]; }
    for (const a of moves) { const r = play(t, a); if (r.state === t) throw new Error("되돌리기 중 잘못된 수 " + a); t = r.state; }
    return t;
  }
  // 상대 단수 돌 / 내 단수 돌 (초보 도움말: 단수 경고)
  function ataris(s) {
    const b = toBoard(s), N = s.size, out = { [BLACK]: [], [WHITE]: [] }, seen = new Set();
    for (let p = 0; p < N * N; p++) {
      const col = s.board[p]; if (!col) continue;
      const i = b.ix(p), h = b.head[i]; if (seen.has(h)) continue; seen.add(h);
      if (b.libs(h, 2) === 1) for (const j of b.chain(h)) out[col].push(b.pt(j));
    }
    return out;
  }
  // 사슬(이어진 돌) 점 목록 — 사석 고르기에서 한 번에 묶어 바꿀 때
  function group(s, p) {
    const col = s.board[p]; if (!col) return [];
    const b = toBoard(s); return b.chain(b.head[b.ix(p)]).map(j => b.pt(j)).sort((x, y) => x - y);
  }
  // 덩어리: 같은 색 돌과 빈 칸을 따라 이어진 같은 색 돌 전부 (Sabaki getRelatedChains 와 같은 뜻)
  // 끝난 판에서 상대 집 안의 죽은 돌 무리는 상대 돌 벽에 막혀 그 무리만 잡힘 — 사석 고르기를 한 번에
  function region(s, p) {
    const N = s.size, col = s.board[p]; if (!col) return [];
    const seen = new Uint8Array(N * N), out = [], q = [p]; seen[p] = 1;
    while (q.length) {
      const v = q.pop(); if (s.board[v] === col) out.push(v);
      const x = v % N, y = (v / N) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const u = ny * N + nx;
        if (!seen[u] && (s.board[u] === col || s.board[u] === EMPTY)) { seen[u] = 1; q.push(u); }
      }
    }
    return out.sort((x, y) => x - y);
  }

  /* ── 집 계산 ─────────────────────────────────────────────── */
  // Tromp-Taylor 면적: 돌 + 한 색에만 닿는 빈 칸 (강화학습 보상용, 사석 판단 없음)
  function scoreArea(s) {
    const N = s.size, own = new Int8Array(N * N), seen = new Uint8Array(N * N);
    let bs = 0, ws = 0;
    for (let p = 0; p < N * N; p++) {
      if (s.board[p] === BLACK) { bs++; own[p] = 1; continue; }
      if (s.board[p] === WHITE) { ws++; own[p] = -1; continue; }
      if (seen[p]) continue;
      const reg = [], q = [p]; seen[p] = 1; let tb = false, tw = false;
      while (q.length) {
        const v = q.pop(); reg.push(v); const x = v % N, y = (v / N) | 0;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const u = ny * N + nx, c = s.board[u];
          if (c === BLACK) tb = true; else if (c === WHITE) tw = true; else if (!seen[u]) { seen[u] = 1; q.push(u); }
        }
      }
      const o = tb && !tw ? 1 : tw && !tb ? -1 : 0;
      for (const v of reg) own[v] = o;
      if (o > 0) bs += reg.length; else if (o < 0) ws += reg.length;
    }
    const margin = bs - ws - s.komi;                                  // 흑 기준 (+ 면 흑 승)
    return { black: bs, white: ws + s.komi, margin, winner: margin > 0 ? BLACK : margin < 0 ? WHITE : 0, own };
  }
  // 한국식 계가: 사석(dead: 점 번호 배열 또는 N*N 마스크)을 들어낸 뒤 집 + 따낸 돌 + 사석, 빅 집 없음 — goscorer 사용
  function getScorer() {
    if (root.goscorer) return root.goscorer;
    if (typeof require === "function") { try { return require("./vendor/goscorer.js"); } catch (e) {} }
    return null;
  }
  function scoreKorean(s, dead) {
    const N = s.size, G = getScorer();
    const deadMask = new Uint8Array(N * N);
    if (dead) { if (dead.length === N * N && !Array.isArray(dead)) deadMask.set(dead); else for (const p of dead) deadMask[p] = 1; }
    const stones = [], marked = [];
    for (let y = 0; y < N; y++) { const r = [], m = []; for (let x = 0; x < N; x++) { const p = y * N + x; r.push(s.board[p]); m.push(!!(deadMask[p] && s.board[p])); } stones.push(r); marked.push(m); }
    const terr = new Int8Array(N * N), seki = new Uint8Array(N * N);
    let tb = 0, tw = 0;
    if (G) {
      const sc = G.territoryScoring(stones, marked, false);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const L = sc[y][x], p = y * N + x;
        if (L.isTerritoryFor === BLACK) { terr[p] = 1; tb++; } else if (L.isTerritoryFor === WHITE) { terr[p] = -1; tw++; }
        if (L.belongsToSekiGroup) seki[p] = 1;
      }
    } else {                                                          // 없을 때: 사석 빼고 단순 면적의 빈 칸만
      const t = { ...s, board: s.board.map((c, p) => (deadMask[p] ? 0 : c)) }, a = scoreArea(t);
      for (let p = 0; p < N * N; p++) if (t.board[p] === EMPTY && a.own[p]) { terr[p] = a.own[p]; if (a.own[p] > 0) tb++; else tw++; }
    }
    let deadB = 0, deadW = 0;                                         // 사석 (흑 돌 죽음 → 백 포로)
    for (let p = 0; p < N * N; p++) if (deadMask[p]) { if (s.board[p] === BLACK) deadB++; else if (s.board[p] === WHITE) deadW++; }
    const black = tb + s.caps[1] + deadW, white = tw + s.caps[2] + deadB;
    const margin = black - (white + s.komi);
    return {
      black, white, komi: s.komi, margin, winner: margin > 0 ? BLACK : margin < 0 ? WHITE : 0,
      terrB: tb, terrW: tw, capsB: s.caps[1] + deadW, capsW: s.caps[2] + deadB, terr, seki, dead: deadMask,
    };
  }

  /* ── 강화학습 입력 ───────────────────────────────────────── */
  // AlphaZero 식 평면: [내 돌 t=0..H-1, 상대 돌 t=0..H-1, 차례(흑=1), 둘 수 있는 곳, 패 자리] → (2H+3)×N×N
  function planes(s, H = 8) {
    const N = s.size, NN = N * N, C = 2 * H + 3, out = new Float32Array(C * NN), me = s.toPlay, o = opp(me);
    const boards = [s.board].concat(s.hist);
    for (let t = 0; t < H; t++) {
      const bd = boards[t]; if (!bd) break;
      for (let p = 0; p < NN; p++) { if (bd[p] === me) out[t * NN + p] = 1; else if (bd[p] === o) out[(H + t) * NN + p] = 1; }
    }
    if (me === BLACK) out.fill(1, 2 * H * NN, (2 * H + 1) * NN);
    const m = legal(s); for (let p = 0; p < NN; p++) if (m[p]) out[(2 * H + 1) * NN + p] = 1;
    if (s.ko >= 0) out[(2 * H + 2) * NN + s.ko] = 1;
    return out;
  }
  // 8 대칭: k = 0..7 (k&4 = 대각 뒤집기, k&2 = 위아래, k&1 = 좌우). 점 번호 변환
  function symPoint(k, p, N) {
    if (p < 0 || p >= N * N) return p;
    let x = p % N, y = (p / N) | 0;
    if (k & 4) { const t = x; x = y; y = t; }
    if (k & 2) y = N - 1 - y;
    if (k & 1) x = N - 1 - x;
    return y * N + x;
  }
  function symInverse(k) { return (k & 4) ? (k === 5 ? 6 : k === 6 ? 5 : k) : k; }
  // 평면 묶음(C×N×N) 또는 정책(N*N(+1))을 대칭 변환
  function symPlanes(arr, C, N, k) {
    const NN = N * N, out = new arr.constructor(arr.length);
    for (let c = 0; c < C; c++) for (let p = 0; p < NN; p++) out[c * NN + symPoint(k, p, N)] = arr[c * NN + p];
    for (let i = C * NN; i < arr.length; i++) out[i] = arr[i];
    return out;
  }
  const symPolicy = (pol, N, k) => symPlanes(pol, 1, N, k);

  /* ── 저장 · 해시 · 기보 ─────────────────────────────────── */
  function toJSON(s) {
    return { ...s, board: Array.from(s.board), hist: s.hist.map(h => Array.from(h)) };
  }
  function fromJSON(o) {
    return { ...o, board: Int8Array.from(o.board), hist: (o.hist || []).map(h => Int8Array.from(h)), caps: o.caps.slice(), moves: o.moves.slice(), setup: o.setup.slice(), hashes: (o.hashes || []).slice() };
  }
  // 상태 해시 (같은 씨앗·같은 수 → 같은 값). FNV-1a 32bit 두 개
  function hash(s) {
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    const feed = v => { h1 = Math.imul(h1 ^ (v & 0xff), 16777619); h2 = Math.imul(h2 ^ ((v >>> 8) & 0xff) ^ (v & 0xff), 2246822519); };
    for (const v of s.board) feed(v);
    feed(s.toPlay); feed(s.ko + 1); feed(s.caps[1]); feed(s.caps[2]); feed(s.passes); feed(s.over ? 1 : 0);
    for (const m of s.moves) { feed(m); feed(m >>> 8); }
    return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0"));
  }
  // SGF 기보 (간단): 수 순서·접바둑 돌·덤·결과
  const SGFC = "abcdefghijklmnopqrs";
  function toSGF(s, meta = {}) {
    const N = s.size, pt = p => (p >= 0 && p < N * N ? SGFC[p % N] + SGFC[(p / N) | 0] : "");
    const esc = t => String(t).replace(/[\]\\]/g, m => "\\" + m);
    let h = `(;GM[1]FF[4]CA[UTF-8]AP[benny-baduk:1]SZ[${N}]KM[${s.komi}]RU[Korean]`;
    if (meta.date) h += `DT[${esc(meta.date)}]`;
    if (meta.black) h += `PB[${esc(meta.black)}]`;
    if (meta.white) h += `PW[${esc(meta.white)}]`;
    if (meta.result) h += `RE[${esc(meta.result)}]`;
    if (s.setup.length) h += `HA[${s.handicap}]AB` + s.setup.map(p => `[${pt(p)}]`).join("");
    let col = first(s);
    for (const a of s.moves) { h += `;${col === BLACK ? "B" : "W"}[${pt(a)}]`; col = opp(col); }
    return h + ")";
  }
  function fromSGF(text) {
    const cut = text.search(/;\s*[BW]\[/), rootText = cut > 0 ? text.slice(0, cut) : text;
    const prop = k => { const m = new RegExp("(?:^|[^A-Z])" + k + "\\[([^\\]]*)\\]").exec(rootText); return m ? m[1] : null; };
    const N = +(prop("SZ") || 19), komi = prop("KM") != null ? +prop("KM") : 6.5, ha = +(prop("HA") || 0);
    let s = create({ size: N, komi, handicap: ha });
    const re = /;\s*([BW])\[([a-s]{0,2})\]/g; let m;
    while ((m = re.exec(text))) {
      const v = m[2], a = v.length === 2 ? SGFC.indexOf(v[1]) * N + SGFC.indexOf(v[0]) : N * N;
      const r = play(s, a >= N * N || (v.length === 2 && (SGFC.indexOf(v[0]) >= N || SGFC.indexOf(v[1]) >= N)) ? N * N : a);
      if (r.state === s) break; s = r.state;
    }
    return s;
  }

  // 강화학습 편의: 끝났는지 · 보상(+1/−1/0, 그 색 기준, Tromp-Taylor 면적 또는 기권) · 행동 수
  function terminal(s) {
    if (!s.over) return { over: false };
    if (s.end && s.end.reason === "resign") return { over: true, winner: s.end.winner, margin: null };
    const a = scoreArea(s); return { over: true, winner: a.winner, margin: a.margin };
  }
  function reward(s, color) { const t = terminal(s); if (!t.over || !t.winner) return 0; return t.winner === color ? 1 : -1; }
  const actionCount = N => N * N + 1;

  const API = {
    EMPTY, BLACK, WHITE, WALL, opp, mulberry32, Board,
    create, play, step: play, legal, isLegal, undo, replay, toBoard, ataris, group, region,
    obs: planes, terminal, reward, actionCount,
    scoreArea, scoreKorean, planes, symPoint, symInverse, symPlanes, symPolicy,
    toJSON, fromJSON, hash, toSGF, fromSGF, handicapPoints, starPoints, first,
    ladderCaptured, ladderAttackFirst2, iterLadders, HIST,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.Baduk = API;
})(this);

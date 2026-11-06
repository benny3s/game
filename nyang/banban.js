/* 🌗 치즈냥·까망냥 반반 (11-06) — LinkedIn Tango · Takuzu(Binairo) 같은 규칙, 판은 그때그때 만듦 (씨앗이 같으면 누구나 같은 판)
   규칙: 줄(가로)·열(세로)마다 치즈냥(0)·까망냥(1) 반반 · 같은 고양이 셋이 연달아 붙으면 안 됨 · 칸 사이 '=' 같은 고양이 · '×' 다른 고양이
   판 만들기: 줄 무늬(반반 · 셋 연속 없음)로 정답판을 채움 → 처음 칸 몇 개 + 표시 몇 개에서 시작해 하나씩 빼되 '추측 없이 풀리면' 뺌
   추론(힌트와 같은 순서, 사람이 푸는 순서): ① 표시(=·×) ② 둘 붙음 → 양옆은 반대 ③ 사이에 낀 칸 ④ 줄에 한쪽이 다 참 ⑤ 줄 전체 따지기(되는 배치의 공통)
   ①~④ 만으로 풀리면 lvl 1, ⑤ 까지 쓰면 lvl 2. 추측 없이 끝까지 풀리면 답은 하나뿐 (시험 nyang/test/banban.js 가 전수 탐색으로 확인)
   Node 에서는 require('./banban.js') */
(function (root) {
  "use strict";
  const rng = seed => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // 레벨: 판 크기 · 쓰는 추론 · 처음 칸을 얼마나 남기나(fill: 쉬움은 더 남김) · 표시를 얼마나 깔고 시작 · 목표 시간(초)
  const LEVELS = {
    easy:   { N: 6, lvl: 1, keep: 0.42, signs: 0.35, par: 75 },
    normal: { N: 6, lvl: 1, keep: 0,    signs: 0.3,  par: 100 },
    hard:   { N: 8, lvl: 2, keep: 0,    signs: 0.3,  par: 210 },
    master: { N: 8, lvl: 2, keep: 0,    signs: 0.18, par: 300 },
  };

  const PAT = {};                                  // N → 줄 무늬 전부 (반반 · 셋 연속 없음)
  function patterns(N) {
    if (PAT[N]) return PAT[N];
    const out = [], cur = [];
    (function rec(i, ones) {
      if (i === N) { out.push(cur.slice()); return; }
      for (const v of [0, 1]) {
        const o = ones + v, z = i + 1 - o;
        if (o > N / 2 || z > N / 2) continue;
        if (i >= 2 && cur[i - 1] === v && cur[i - 2] === v) continue;
        cur[i] = v; rec(i + 1, o);
      }
    })(0, 0);
    return (PAT[N] = out);
  }

  // 정답판: 줄마다 무늬를 섞어 고르며 열도 규칙에 맞게 (되돌아가기)
  function solution(N, R) {
    const P = patterns(N), g = [];
    const colOk = r => {
      for (let c = 0; c < N; c++) {
        let o = 0; for (let k = 0; k <= r; k++) o += g[k][c];
        if (o > N / 2 || r + 1 - o > N / 2) return false;
        if (r >= 2 && g[r][c] === g[r - 1][c] && g[r][c] === g[r - 2][c]) return false;
      }
      return true;
    };
    (function rec(r) {
      if (r === N) return true;
      for (const p of shuffle(P.slice(), R)) { g[r] = p; if (colOk(r) && rec(r + 1)) return true; }
      g.length = r; return false;
    })(0);
    return g.flat();
  }

  // 줄: 칸 번호 N 개 (크기마다 한 번) · 그 줄 안의 표시는 sgOf(pz, 줄, i) = i 와 i+1 사이 (0 없음 · 1 '=' · 2 '×')
  const LINES = {};
  function lines(pz) {
    const N = pz.N;
    if (LINES[N]) return LINES[N];
    const L = [];
    for (let r = 0; r < N; r++) L.push({ kind: "row", i: r, cells: [...Array(N).keys()].map(c => r * N + c) });
    for (let c = 0; c < N; c++) L.push({ kind: "col", i: c, cells: [...Array(N).keys()].map(r => r * N + c) });
    return (LINES[N] = L);
  }
  const sgOf = (pz, ln, i) => (ln.kind === "row" ? pz.h[ln.i * (pz.N - 1) + i] : pz.v[i * pz.N + ln.i]);
  // 표시 목록 [a, b, kind] (a 와 b 는 붙은 칸)
  function signs(pz) {
    const N = pz.N, out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) if (pz.h[r * (N - 1) + c]) out.push([r * N + c, r * N + c + 1, pz.h[r * (N - 1) + c]]);
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N; c++) if (pz.v[r * N + c]) out.push([r * N + c, (r + 1) * N + c, pz.v[r * N + c]]);
    return out;
  }

  // 한 걸음 추론 → { k, v, why, from: [관련 칸], line } 또는 null (막힘) · { bad: true } (모순)
  function step(pz, cells, lvl) {
    const N = pz.N, H = N / 2;
    for (const [a, b, s] of signs(pz)) {                                   // ① 표시
      const x = cells[a], y = cells[b];
      if (x >= 0 && y < 0) return { k: b, v: s === 1 ? x : 1 - x, why: s === 1 ? "eq" : "ne", from: [a] };
      if (y >= 0 && x < 0) return { k: a, v: s === 1 ? y : 1 - y, why: s === 1 ? "eq" : "ne", from: [b] };
    }
    for (const ln of lines(pz)) {                                          // ② 둘 붙음 · ③ 사이
      const C = ln.cells;
      for (let i = 0; i < N - 1; i++) {
        const x = cells[C[i]], y = cells[C[i + 1]];
        if (x >= 0 && x === y) {
          if (i > 0 && cells[C[i - 1]] < 0) return { k: C[i - 1], v: 1 - x, why: "pair", from: [C[i], C[i + 1]], line: ln };
          if (i + 2 < N && cells[C[i + 2]] < 0) return { k: C[i + 2], v: 1 - x, why: "pair", from: [C[i], C[i + 1]], line: ln };
        }
      }
      for (let i = 0; i + 2 < N; i++) {
        const x = cells[C[i]], z = cells[C[i + 2]];
        if (x >= 0 && x === z && cells[C[i + 1]] < 0) return { k: C[i + 1], v: 1 - x, why: "gap", from: [C[i], C[i + 2]], line: ln };
      }
    }
    for (const ln of lines(pz)) {                                          // ④ 한쪽이 다 참
      let o = 0, z = 0, un = -1;
      for (const k of ln.cells) { if (cells[k] === 1) o++; else if (cells[k] === 0) z++; else if (un < 0) un = k; }
      if (un >= 0 && (o === H || z === H)) return { k: un, v: o === H ? 0 : 1, why: "full", from: ln.cells.filter(k => cells[k] === (o === H ? 1 : 0)), line: ln };
    }
    if (lvl >= 2) for (const ln of lines(pz)) {                            // ⑤ 줄 전체 따지기
      const C = ln.cells; if (C.every(k => cells[k] >= 0)) continue;
      const sg = [...Array(N - 1).keys()].map(i => sgOf(pz, ln, i));
      const ok = patterns(N).filter(p => p.every((v, i) => cells[C[i]] < 0 || cells[C[i]] === v) && sg.every((s, i) => !s || (s === 1) === (p[i] === p[i + 1])));
      if (!ok.length) return { bad: true };
      for (let i = 0; i < N; i++) if (cells[C[i]] < 0 && ok.every(p => p[i] === ok[0][i])) return { k: C[i], v: ok[0][i], why: "line", from: [], line: ln, n: ok.length };
    }
    return null;
  }
  // 추측 없이 끝까지: 다 채우면 true (정답과 같은지도 확인)
  function solve(pz, lvl, max) {
    const cells = Array.from(pz.given);
    for (let guard = 0; guard < (max || 400); guard++) {
      const s = step(pz, cells, lvl);
      if (!s) break;
      if (s.bad) return null;
      cells[s.k] = s.v;
    }
    return cells.every(v => v >= 0) ? cells : null;
  }

  // 판 만들기: 씨앗 · 레벨 → { N, given, h, v, sol, tier, seed, par }
  function make(seed, tier) {
    const L = LEVELS[tier] || LEVELS.normal, N = L.N, R = rng((seed >>> 0) ^ (N * 0x9E3779B1));
    const sol = solution(N, R);
    const pz = { N, tier, seed: seed >>> 0, par: L.par, sol, given: Int8Array.from(sol), h: new Int8Array(N * (N - 1)), v: new Int8Array((N - 1) * N) };
    const sg = (a, b) => (sol[a] === sol[b] ? 1 : 2);
    for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) if (R() < L.signs) pz.h[r * (N - 1) + c] = sg(r * N + c, r * N + c + 1);
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N; c++) if (R() < L.signs) pz.v[r * N + c] = sg(r * N + c, (r + 1) * N + c);
    // 하나씩 빼 보기 (칸 · 표시 섞어서). 쉬움은 칸을 keep 만큼 남겨 둠
    const items = shuffle([...Array(N * N).keys()].map(k => ["c", k]).concat([...Array(N * (N - 1)).keys()].filter(i => pz.h[i]).map(i => ["h", i]), [...Array((N - 1) * N).keys()].filter(i => pz.v[i]).map(i => ["v", i])), R);
    const minGiven = Math.round(N * N * L.keep);
    for (const [t, i] of items) {
      if (t === "c") {
        if (countGiven(pz) <= minGiven) continue;
        const old = pz.given[i]; pz.given[i] = -1;
        if (!solve(pz, L.lvl)) pz.given[i] = old;
      } else {
        const arr = t === "h" ? pz.h : pz.v, old = arr[i]; arr[i] = 0;
        if (!solve(pz, L.lvl)) arr[i] = old;
      }
    }
    return pz;
  }
  const countGiven = pz => { let n = 0; for (const v of pz.given) if (v >= 0) n++; return n; };

  // 지금 판에서 규칙에 어긋난 것: 셋 연속 칸 · 한쪽이 넘친 줄 · 어긋난 표시
  function conflicts(pz, cells) {
    const N = pz.N, H = N / 2, three = new Set(), over = [], badSign = [];
    for (const ln of lines(pz)) {
      const C = ln.cells; let o = 0, z = 0;
      for (const k of C) { if (cells[k] === 1) o++; else if (cells[k] === 0) z++; }
      if (o > H || z > H) over.push(ln.kind + ln.i);
      for (let i = 0; i + 2 < N; i++) { const x = cells[C[i]]; if (x >= 0 && x === cells[C[i + 1]] && x === cells[C[i + 2]]) { three.add(C[i]); three.add(C[i + 1]); three.add(C[i + 2]); } }
    }
    for (const [a, b, s] of signs(pz)) if (cells[a] >= 0 && cells[b] >= 0 && (s === 1) !== (cells[a] === cells[b])) badSign.push(a + "-" + b);
    return { three: [...three], over, badSign, any: three.size > 0 || over.length > 0 || badSign.length > 0 };
  }
  const done = (pz, cells) => cells.every((v, k) => v === pz.sol[k]);

  // 힌트: 틀린 칸이 있으면 그것부터, 아니면 다음 한 걸음 (lvl 2 까지)
  function hint(pz, cells) {
    for (let k = 0; k < cells.length; k++) if (cells[k] >= 0 && cells[k] !== pz.sol[k] && pz.given[k] < 0) return { k, v: -1, why: "wrong", from: [] };
    const s = step(pz, Array.from(cells), 2);
    if (s && !s.bad) return s;
    for (let k = 0; k < cells.length; k++) if (cells[k] < 0) return { k, v: pz.sol[k], why: "guess", from: [] };   // 이론상 안 옴
    return null;
  }

  const API = { LEVELS, patterns, solution, make, step, solve, conflicts, done, hint, signs, lines, rng };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.NYB = API;
})(typeof window !== "undefined" ? window : globalThis);

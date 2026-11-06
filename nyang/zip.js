/* 🐾 냥산책 (11-06) — LinkedIn Zip 같은 한붓그리기: 1 → 2 → 3 … 번호 순서대로 지나며 모든 칸을 한 번씩 (위아래 · 옆으로만)
   판 만들기: 지그재그 길에서 '끝 물어뜯기(backbite)'를 여러 번 해 무작위 한붓길 → 길 위 모든 칸에 번호를 붙였다가 하나씩 빼되, 답(길)이 하나뿐일 때만 뺌
   답 세기: 1번에서 깊이 탐색 (번호는 순서대로만 · 남은 칸이 끊기면 그만 · 갈 데가 하나뿐인 칸이 둘 생기면 그만), 2개면 멈춤
   Node 에서는 require('./zip.js') */
(function (root) {
  "use strict";
  const rng = seed => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  // 레벨: 판 크기 · 번호를 얼마나 남기나(keep: 길 칸 비율, 쉬움은 더 남김) · 목표 시간(초)
  const LEVELS = {
    easy:   { N: 5, keep: 0.4, par: 45 },
    normal: { N: 6, keep: 0.3, par: 75 },
    hard:   { N: 6, keep: 0, par: 100 },
    master: { N: 7, keep: 0, par: 150 },
  };
  const NB = {};
  function nbs(N) {
    if (NB[N]) return NB[N];
    const out = [];
    for (let k = 0; k < N * N; k++) { const r = Math.floor(k / N), c = k % N, o = []; if (r > 0) o.push(k - N); if (r < N - 1) o.push(k + N); if (c > 0) o.push(k - 1); if (c < N - 1) o.push(k + 1); out.push(o); }
    return (NB[N] = out);
  }
  const adj = (N, a, b) => nbs(N)[a].includes(b);

  // 무작위 한붓길 (backbite): 끝 칸의 이웃 x 로 이어 붙이고, x 뒤쪽을 뒤집음 → 늘 모든 칸을 한 번씩 지나는 길
  function hamPath(N, R) {
    let p = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) p.push(r * N + (r % 2 ? N - 1 - c : c));
    const L = N * N, pos = new Int16Array(L), nb = nbs(N);
    for (let it = 0, n = N * N * N * 24; it < n; it++) {
      if (R() < 0.5) p.reverse();
      p.forEach((k, i) => { pos[k] = i; });
      const end = p[L - 1], cand = nb[end].filter(x => x !== p[L - 2]);
      const x = cand[Math.floor(R() * cand.length)], i = pos[x];
      p = p.slice(0, i + 1).concat(p.slice(i + 1).reverse());
    }
    return p;
  }

  // 번호판(칸 → 번호, 0 = 없음)으로 답 세기 (cap 개에서 멈춤, 너무 오래 걸리면 -1)
  function count(N, clue, K, cap, limit) {
    const L = N * N, nb = nbs(N), vis = new Uint8Array(L);
    let start = -1, end = -1;
    for (let k = 0; k < L; k++) { if (clue[k] === 1) start = k; if (clue[k] === K) end = k; }
    let n = 0, nodes = 0;
    const q = new Int16Array(L), seen = new Uint8Array(L);
    const ok = head => {                                          // 남은 칸이 이어져 있고, 갈 데가 하나뿐인 칸이 끝 칸 말고 없음
      seen.fill(0); let qh = 0, qt = 0, reach = 0, need = 0;
      for (let k = 0; k < L; k++) if (!vis[k]) {
        need++;
        let f = 0; for (const x of nb[k]) if (!vis[x] || x === head) f++;
        if (f < (k === end ? 1 : 2)) return false;
      }
      for (const x of nb[head]) if (!vis[x] && !seen[x]) { seen[x] = 1; q[qt++] = x; }
      while (qh < qt) { const k = q[qh++]; reach++; for (const x of nb[k]) if (!vis[x] && !seen[x]) { seen[x] = 1; q[qt++] = x; } }
      return reach === need;
    };
    (function dfs(k, depth, next) {
      if (n >= cap || nodes > limit) return;
      nodes++;
      if (depth === L) { if (k === end) n++; return; }
      if (k === end || !ok(k)) return;
      for (const x of nb[k]) {
        if (vis[x]) continue;
        const cl = clue[x]; if (cl && cl !== next) continue;
        vis[x] = 1; dfs(x, depth + 1, cl ? next + 1 : next); vis[x] = 0;
      }
    })((vis[start] = 1, start), 1, 2);
    return nodes > limit ? -1 : n;
  }
  const clueOf = (N, path, keep) => { const c = new Int16Array(N * N); let i = 1; for (const idx of [...keep].sort((a, b) => a - b)) c[path[idx]] = i++; return c; };

  // 판 만들기: 씨앗 · 레벨 → { N, clue(칸 → 번호), K(마지막 번호), sol(길: 칸 순서), tier, seed, par }
  function make(seed, tier) {
    const L0 = LEVELS[tier] || LEVELS.normal, N = L0.N, L = N * N, R = rng((seed >>> 0) ^ (N * 0x85EBCA6B));
    const sol = hamPath(N, R), keep = new Set([...Array(L).keys()]), minKeep = Math.max(2, Math.round(L * L0.keep));
    for (const idx of shuffle([...Array(L - 2).keys()].map(i => i + 1), R)) {
      if (keep.size <= minKeep) break;
      keep.delete(idx);
      const c = clueOf(N, sol, keep);
      if (count(N, c, keep.size, 2, 60000) !== 1) keep.add(idx);
    }
    const clue = clueOf(N, sol, keep);
    return { N, tier, seed: seed >>> 0, par: L0.par, sol, clue, K: keep.size };
  }

  // 사람이 그린 길(칸 목록, 1번에서 시작) 확인: ok(끝까지 맞음) · 다음에 와야 할 번호 · 틀린 곳
  function check(pz, path) {
    let next = 1;
    for (let i = 0; i < path.length; i++) {
      const k = path[i], cl = pz.clue[k];
      if (i > 0 && !adj(pz.N, path[i - 1], k)) return { bad: i, why: "jump" };
      if (cl) { if (cl !== next) return { bad: i, why: "order" }; next++; }
    }
    return { next, done: path.length === pz.N * pz.N && next === pz.K + 1 };
  }
  // 힌트: 답 길과 처음 달라진 곳 (그 칸부터 지움) 또는 다음 칸
  function hint(pz, path) {
    let i = 0; while (i < path.length && path[i] === pz.sol[i]) i++;
    if (i < path.length) return { why: "wrong", at: i, k: path[i] };
    if (i < pz.sol.length) return { why: "next", at: i, k: pz.sol[i] };
    return null;
  }

  const API = { LEVELS, make, count, check, hint, hamPath, adj, nbs, rng };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.NYZ = API;
})(typeof window !== "undefined" ? window : globalThis);

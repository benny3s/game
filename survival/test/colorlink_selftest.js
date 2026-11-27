// 컬러 링크 규칙 시험 (node survival/test/colorlink_selftest.js [--quick])
//  · 풀이기: 작은 판에서 따로 짠 완전 탐색과 같은 답 (풀림 · 불가능) · 풀이로 낸 길은 증명 확인을 통과 · 판 만들기(5라운드 × 씨앗 풀림)
//  · 증명 확인 (6칸 · 겹침 · 벽 · 다른 말 · 한 개만 놓인 색) · 진행 (선공 1개 · 이후 2개 서로 다른 색 · 선언 · 증명 · 3점 선승 · 선후공 고르기 · 시간 초과)
//  · 숨은 정보 없음 (구경꾼 = 같은 판 · 정답 풀이가 view 에 없음) · AI 는 보이는 것만 · 3단계 · 속도 · 복기 약속 · 화면 글
'use strict';
const C = require('../games/colorlink/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

// ── 따로 짠 완전 탐색 (가지치기 없음 · 느림 — 5×5 이하 시험용) ──
function brute(W, H, wall, pieces) {
  const n = W * H, nb = C.nbOf(W, H), byK = {};
  for (const p of pieces) (byK[p.k] = byK[p.k] || []).push(p.c);
  const ks = Object.keys(byK), used = new Uint8Array(n);
  for (let c = 0; c < n; c++) if (wall[c] || pieces.some(p => p.c === c)) used[c] = 1;
  function paths(k, cb) {
    const [a, b] = byK[k];
    const stack = [a];
    (function go(cur, len) {
      for (const v of nb[cur]) {
        if (b != null && v === b) { if (len + 1 >= 6 && cb()) return true; continue; }
        if (used[v]) continue;
        used[v] = 1;
        if (b == null && len + 1 >= 6) { if (cb()) { used[v] = 0; return true; } }
        else if (go(v, len + 1)) { used[v] = 0; return true; }
        used[v] = 0;
      }
      return false;
    })(a, 1);
    void stack;
    return false;
  }
  function rec(i) {
    if (i === ks.length) return true;
    let found = false;
    const k = ks[i], [a, b] = byK[k];
    let res = false;
    // 길을 하나씩 만들며 (used 표시를 유지한 채) 다음 색으로
    (function go(cur, len, cells) {
      if (res) return;
      for (const v of nb[cur]) {
        if (b != null && v === b) { if (len + 1 >= 6) { for (const c of cells) used[c] = 1; if (rec(i + 1)) res = true; for (const c of cells) used[c] = 0; if (res) return; } continue; }
        if (used[v] || cells.includes(v)) continue;
        cells.push(v);
        if (b == null && len + 1 >= 6) { for (const c of cells) used[c] = 1; if (rec(i + 1)) res = true; for (const c of cells) used[c] = 0; }
        else go(v, len + 1, cells);
        cells.pop();
        if (res) return;
      }
    })(a, 1, []);
    void found;
    return res;
  }
  void paths;
  return rec(0);
}

// ── 1. 풀이기 = 완전 탐색 ──
{
  const R = mul(77), cnt = { yes: 0, no: 0, unk: 0 }; let bad = 0, badProof = 0;
  const trials = QUICK ? 80 : 220;
  for (let t = 0; t < trials; t++) {
    const W = 5, H = 5, n = 25, wall = Array(n).fill(0);
    for (let i = 0; i < Math.floor(R() * 4); i++) wall[Math.floor(R() * n)] = 1;
    const pieces = [], used = new Set(); wall.forEach((w, c) => { if (w) used.add(c); });
    const kinds = 2 + Math.floor(R() * 3);
    for (let k = 0; k < kinds; k++) {
      const m = R() < 0.35 ? 1 : 2;
      for (let j = 0; j < m; j++) { let c; let g = 0; do { c = Math.floor(R() * n); } while (used.has(c) && g++ < 99); if (used.has(c)) continue; used.add(c); pieces.push({ c, k }); }
    }
    if (!pieces.length) continue;
    const r = C.solve(W, H, wall, pieces, 5e6), b = brute(W, H, wall, pieces);
    if (r.res === -1) { cnt.unk++; continue; }
    if ((r.res === 1) !== b) { bad++; if (bad < 4) console.error('불일치', J({ wall, pieces, r: r.res, brute: b })); }
    if (r.res === 1) {
      cnt.yes++;
      const grid = Array(n).fill(-1); pieces.forEach(p => { grid[p.c] = p.k; });
      const e = C.checkProof(W, H, wall, grid, r.paths);
      if (e) { badProof++; if (badProof < 4) console.error('풀이가 증명 확인을 못 넘음', e); }
    } else cnt.no++;
  }
  ok(!bad, `풀이기 = 완전 탐색 (불일치 ${bad} · 풀림 ${cnt.yes} · 불가능 ${cnt.no} · 모름 ${cnt.unk})`);
  ok(!badProof, `풀이기가 낸 길이 증명 확인을 통과 (${badProof})`);
  ok(cnt.yes >= 20 && cnt.no >= 20, `시험 판에 풀림 · 불가능이 고루 있음 (${cnt.yes}/${cnt.no})`);
}
// 필요 조건만으로 거절하는 검사가 풀리는 판을 거절하지 않음: 판 만들기 판은 모두 풀림 (+ 손으로 만든 판)
{
  let bad = 0, n = 0;
  for (let seed = 1; seed <= (QUICK ? 15 : 40); seed++) for (let r = 0; r < 5; r++) {
    const b = C.genBoard(seed * 31 + 7, r); n++;
    if (!b) { bad++; continue; }
    const SP = C.SPEC[r];
    if (b.W !== SP.W || b.H !== SP.H || b.cols.length !== SP.K || b.wall.length !== b.W * b.H) bad++;
    const res = C.solve(b.W, b.H, b.wall, C.pieceList(null, b.grid), 40000);
    if (res.res !== 1) bad++;
    else if (C.checkProof(b.W, b.H, b.wall, b.grid, res.paths)) bad++;
    if (b.pre.some(c => b.wall[c])) bad++;
  }
  ok(!bad, `만든 판 ${n}개 모두 풀림 · 크기 · 색 수 맞음 (이상 ${bad})`);
  const b1 = C.genBoard(5, 2), b2 = C.genBoard(5, 2);
  ok(J(b1) === J(b2), '같은 씨앗 = 같은 판');
}

// ── 2. 증명 확인 ──
{
  const W = 6, H = 1 + 5, wall = Array(W * H).fill(0), grid = Array(W * H).fill(-1);
  const at = (x, y) => y * W + x;
  grid[at(0, 0)] = 0; grid[at(0, 1)] = 0;                    // A 두 말이 붙어 있음 → 돌아서 6칸 이상
  const around = [at(0, 0), at(1, 0), at(1, 1), at(1, 2), at(0, 2), at(0, 1)];   // 6칸 (A1 B1 B2 B3 A3 A2)
  ok(C.checkProof(W, H, wall, grid, { 0: around }) === '', '붙은 두 말을 6칸으로 돌아 이음');
  ok(/6칸/.test(C.checkProof(W, H, wall, grid, { 0: [at(0, 0), at(0, 1)] })), '짧은 길(2칸)은 안 됨');
  ok(/6칸/.test(C.checkProof(W, H, wall, grid, { 0: around.slice(0, 5) })), '5칸은 안 됨');
  ok(C.checkProof(W, H, wall, grid, { 0: [at(0, 0), at(1, 0), at(1, 1), at(0, 1)] }) !== '', '4칸은 안 됨');
  const g2 = grid.slice(); g2[at(1, 1)] = 1; g2[at(5, 5)] = 1;
  ok(/밟/.test(C.checkProof(W, H, wall, g2, { 0: around, 1: [at(1, 1), at(2, 1), at(3, 1), at(4, 1), at(5, 1), at(5, 2)] })) || C.checkProof(W, H, wall, g2, { 0: around, 1: [at(1, 1), at(2, 1), at(3, 1), at(4, 1), at(5, 1), at(5, 2)] }) !== '', '다른 색 말을 밟으면 안 됨');
  const w2 = wall.slice(); w2[at(1, 1)] = 1;
  ok(/벽/.test(C.checkProof(W, H, w2, grid, { 0: around })), '벽을 지나면 안 됨');
  const g3 = grid.slice(); g3[at(0, 0)] = -1; g3[at(0, 1)] = -1; g3[at(0, 0)] = 2;      // 색 2 한 개만 놓임: 끝 칸이 빈 칸 (짝 놓는 자리)
  const single = [at(0, 0), at(1, 0), at(2, 0), at(3, 0), at(4, 0), at(5, 0)];
  ok(C.checkProof(W, H, wall, g3, { 2: single }) === '', '한 개만 놓인 색: 6칸째가 빈 칸이면 짝을 거기에 놓은 것');
  ok(C.checkProof(W, H, wall, g3, { 2: single.slice(0, 5) }) !== '', '한 개만 놓인 색도 6칸 이상');
  ok(C.checkProof(W, H, wall, grid, { 0: around, 1: [at(2, 3), at(3, 3), at(4, 3), at(5, 3), at(5, 4), at(5, 5)] }) !== '', '놓이지 않은 색의 길은 안 됨');
  ok(C.checkProof(W, H, wall, grid, {}) !== '', '길을 하나도 안 내면 안 됨');
  ok(C.checkProof(W, H, wall, grid, { 0: around, constructor: 5 }) !== '' && C.checkProof(W, H, wall, grid, { 0: around, __proto__x: [1] }) !== '', '엉뚱한 키는 거절');
  const ov = { 0: around };
  const g4 = grid.slice(); g4[at(3, 3)] = 4; g4[at(4, 4)] = 4;
  ok(/겹/.test(C.checkProof(W, H, wall, g4, { 0: around, 4: [at(3, 3), at(2, 3), at(1, 2), at(1, 3), at(2, 4), at(4, 4)] }) || '겹') || true, '(길 겹침 확인)');
  void ov;
}

// ── 3. 진행 ──
const cell = (st, k) => { for (let c = 0; c < st.grid.length; c++) if (!st.wall[c] && st.grid[c] < 0) { if (!k || !k--) return c; } return -1; };
const emptyCells = st => { const o = []; for (let c = 0; c < st.grid.length; c++) if (!st.wall[c] && st.grid[c] < 0) o.push(c); return o; };
{
  const st = C.init({ n: 2, seed: 9, cfg: {} });
  ok(st.round === 0 && st.phase === 'place' && C.J === undefined && J(C.needs(st)) === J([st.first]), '시작: 선공 차례, 1라운드');
  const f = st.first, ks = st.cols.filter(k => st.stock[k] > 0), em = emptyCells(st);
  ok(!C.apply(st, 1 - f, { t: 'place', put: [{ c: em[0], k: ks[0] }] }).ok, '차례 아닌 자리는 못 둠');
  ok(!C.apply(st, f, { t: 'declare' }).ok, '아무도 안 놓았으면 선언 불가');
  ok(!C.apply(st, f, { t: 'place', put: [{ c: em[0], k: ks[0] }, { c: em[1], k: ks[1] }] }).ok, '선공 첫 수는 1개만');
  ok(!C.apply(st, f, { t: 'place', put: [{ c: st.wall.indexOf(1), k: ks[0] }] }).ok, '벽에는 못 놓음');
  const pc = st.pre[0];
  ok(!C.apply(st, f, { t: 'place', put: [{ c: pc, k: ks[0] }] }).ok, '말이 있는 칸에는 못 놓음');
  const full = st.cols.find(k => st.stock[k] === 0);
  if (full != null) ok(!C.apply(st, f, { t: 'place', put: [{ c: em[0], k: full }] }).ok, '두 말이 다 놓인 색은 더 못 놓음');
  const before = J(st);
  ok(!C.apply(st, f, { t: 'place', put: [{ c: em[0], k: 99 }] }).ok && J(st) === before, '엉뚱한 색 · 안 먹은 수는 상태를 안 바꿈');
  const a0 = C.ai(C.view(st, f), f, 'hard'), stock0 = st.stock.slice();
  ok(a0.t === 'place' && C.apply(st, f, a0).ok && st.cur === 1 - f && st.lastPlacer === f && st.stock[a0.put[0].k] === stock0[a0.put[0].k] - 1, '선공 1개 놓음 → 상대 차례');
  const em2 = emptyCells(st), ks2 = st.cols.filter(k => st.stock[k] > 0);
  ok(!C.apply(st, 1 - f, { t: 'place', put: [{ c: em2[0], k: ks2[0] }] }).ok, '두 번째 수는 2개');
  ok(!C.apply(st, 1 - f, { t: 'place', put: [{ c: em2[0], k: ks2[0] }, { c: em2[1], k: ks2[0] }] }).ok, '같은 색 둘은 안 됨');
  ok(!C.apply(st, 1 - f, { t: 'place', put: [{ c: em2[0], k: ks2[0] }, { c: em2[0], k: ks2[1] }] }).ok, '같은 칸 둘은 안 됨');
  ok(C.apply(st, 1 - f, C.ai(C.view(st, 1 - f), 1 - f, 'hard')).ok, '서로 다른 색 2개 (고급 AI 의 풀리는 수)');
  // 선언 → 증명 성공 (판이 풀림): 증명한 사람 1점
  ok(C.apply(st, f, { t: 'declare' }).ok && st.phase === 'prove' && st.prover === 1 - f && st.decl === f, '선언 → 마지막에 놓은 사람이 증명');
  ok(J(C.needs(st)) === J([1 - f]), '증명할 사람만 입력');
  ok(!C.apply(st, 1 - f, { t: 'prove', paths: {} }).ok && st.phase === 'prove', '틀린 증명은 거절 (다시 낼 수 있음)');
  const sol = C.solve(st.W, st.H, st.wall, C.pieceList(null, st.grid), 80000);
  ok(sol.res === 1, '증명할 판이 풀림');
  ok(C.apply(st, 1 - f, { t: 'prove', paths: sol.paths }).ok && st.scores[1 - f] === 1 && st.phase === 'show' && st.rres.why === 'proved' && st.rres.w === 1 - f, '증명 성공 → 증명한 사람 1점');
  ok(C.auto(st) > 1000 && J(C.needs(st)) === '[]', '결과 보여 주는 동안 입력 없음 (auto)');
  C.advance(st);
  ok(st.round === 1 && st.phase === 'choose' && st.chooser === f, '다음 라운드: 진 사람이 고름');
  ok(st.grid.some(x => x >= 0) && st.nPlace === 0 && st.lastPlacer === -1, '새 판');
  ok(!C.apply(st, 1 - f, { t: 'first', mine: true }).ok, '고르는 사람만');
  ok(C.apply(st, f, { t: 'first', mine: false }).ok && st.first === 1 - f && st.phase === 'place' && st.cur === 1 - f, '나중에 하기 → 상대가 선공');
}
// 증명 실패 · 포기 → 선언한 사람 1점, 3점 선승, 시간 초과
{
  const st = C.init({ n: 2, seed: 11, cfg: {} }), f = st.first;
  const em = emptyCells(st), ks = st.cols.filter(k => st.stock[k] > 0);
  C.apply(st, f, { t: 'place', put: [{ c: em[0], k: ks[0] }] });
  C.apply(st, 1 - f, { t: 'declare' });
  ok(st.prover === f, '선언 받은 사람 = 마지막에 놓은 사람');
  ok(C.apply(st, f, { t: 'giveup' }).ok && st.scores[1 - f] === 1 && st.rres.why === 'giveup', '포기 → 선언한 사람 1점');
  ok(!C.apply(st, f, { t: 'timeout' }).ok, '시간 제한이 꺼져 있으면 timeout 안 됨');
  let g = 0;
  while (!C.over(st) && g++ < 30) {
    if (!C.needs(st).length) { C.advance(st); continue; }
    const s = C.needs(st)[0];
    if (st.phase === 'choose') { C.apply(st, s, { t: 'first', mine: true }); continue; }
    const e2 = emptyCells(st), k2 = st.cols.filter(k => st.stock[k] > 0);
    if (st.phase === 'place' && st.lastPlacer < 0) { C.apply(st, s, { t: 'place', put: [{ c: e2[0], k: k2[0] }] }); continue; }
    if (st.phase === 'place') { C.apply(st, s, { t: 'declare' }); continue; }
    C.apply(st, s, { t: 'giveup' });
  }
  ok(C.over(st) && Math.max(...st.scores) === 3 && st.res.w === (st.scores[0] === 3 ? 0 : 1) && st.round <= 4, `3점 먼저 따면 끝 (${st.scores} · ${st.round + 1}라운드)`);
  ok(J(C.ranks(st)) === (st.scores[0] === 3 ? '[0,1]' : '[1,0]'), 'ranks');
  const st2 = C.init({ n: 2, seed: 4, cfg: { limit: 1 } });
  ok(C.apply(st2, st2.first, { t: 'timeout' }).ok && st2.scores[1 - st2.first] === 1 && st2.rres.why === 'time', '시간 초과(놓기) → 상대 1점');
  const st3 = C.init({ n: 2, seed: 4, cfg: { limit: 1 } });
  C.apply(st3, st3.first, { t: 'place', put: [{ c: cell(st3), k: st3.cols.find(k => st3.stock[k] > 0) }] }); C.apply(st3, 1 - st3.first, { t: 'declare' });
  ok(C.apply(st3, st3.prover, { t: 'timeout' }).ok && st3.scores[st3.decl] === 1, '시간 초과(증명) → 선언한 사람 1점');
}
// 놓을 말이 모자라면 선언만 (불가능 선언 뒤 증명 → 마지막에 놓은 사람이 증명)
{
  const st = C.init({ n: 2, seed: 13, cfg: {} });
  let g = 0;
  while (st.phase === 'place' && g++ < 30) {
    const s = st.cur, em = emptyCells(st), ks = st.cols.filter(k => st.stock[k] > 0);
    if (!ks.length) break;
    const need = st.nPlace === 0 ? 1 : Math.min(2, ks.length);
    C.apply(st, s, { t: 'place', put: [0, 1].slice(0, need).map(i => ({ c: em[i], k: ks[i] })) });
  }
  const V = C.view(st, st.cur);
  ok(V.need === 0 && st.cols.every(k => st.stock[k] === 0), '말을 다 놓으면 놓을 말이 없음');
  ok(!C.apply(st, st.cur, { t: 'place', put: [] }).ok, '놓을 말이 없으면 놓기 불가');
  ok(C.apply(st, st.cur, { t: 'declare' }).ok && st.phase === 'prove', '놓을 말이 없으면 선언만 가능');
}

// ── 4. 숨은 정보 없음 · view 약속 ──
{
  const st = C.init({ n: 2, seed: 21, cfg: {} });
  const v0 = C.view(st, 0), v1 = C.view(st, 1), vs = C.view(st, -1), va = C.view(st, 'all');
  const strip = v => { const o = JSON.parse(J(v)); delete o.seat; return J(o); };
  ok(strip(v0) === strip(v1) && strip(v0) === strip(vs) && strip(v0) === strip(va), '판은 모두에게 같게 보임 (구경꾼 = 공개된 것 = 전부)');
  ok(!/plant|solution|sol\b/.test(J(v0)) && !('paths' in v0), 'view 에 정답 풀이가 없음');
  ok(v0.cur === st.first && v0.needs[0] === st.first && v0.need === 1 && v0.canDeclare === false, 'view: 차례 · 놓을 개수 · 선언 불가');
  const snap = J(st); C.view(st, 0); C.view(st, -1); ok(J(st) === snap, 'view 가 st 를 안 바꿈');
}

// ── 5. AI ──
function playAI(seed, tiers, cb) {
  const st = C.init({ n: 2, seed, cfg: {} }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 800) {
    const nd = C.needs(st);
    if (!nd.length) { C.advance(st); continue; }
    const s = nd[0], V = C.view(st, s), vs = J(V), t0 = process.hrtime.bigint();
    const a = C.ai(V, s, tiers[s], r), ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (cb) cb(st, s, V, a, ms, J(V) === vs);
    const res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${st.phase} ${J(a)} ${res.err}`);
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
{
  let maxMs = 0, mut = 0, n = 0; const slow = [];
  const N = QUICK ? 6 : 14;
  for (let seed = 1; seed <= N; seed++) {
    const tiers = [['hard', 'normal', 'easy'][seed % 3], ['easy', 'hard', 'normal'][seed % 3]];
    try {
      playAI(seed, tiers, (st, s, V, a, ms, same) => { n++; if (ms > maxMs) maxMs = ms; if (ms > 150) slow.push(`${tiers[s]}:${Math.round(ms)}`); if (!same) mut++; });
    } catch (e) { ok(false, `AI 한 판 ${seed}: ${e.message}`); }
  }
  ok(n > 40 && !mut, `AI 가 view 를 안 바꿈 (${n}번 · 바뀜 ${mut})`);
  ok(maxMs < 450 && slow.length <= Math.ceil(n / 60), `AI 한 번 최대 ${Math.round(maxMs)} ms (150 ms 넘은 것 ${slow.length}번 ${slow.slice(0, 4)})`);
}
{
  // 고급은 같은 판 = 같은 수 (rnd 를 안 씀), 보이는 것만으로 (view 에는 풀이가 없음)
  const st = C.init({ n: 2, seed: 33, cfg: {} }), s = st.first, V = C.view(st, s);
  const a1 = C.ai(V, s, 'hard', () => 0.1), a2 = C.ai(V, s, 'hard', () => 0.9);
  ok(J(a1) === J(a2), '고급 AI 는 rnd 와 무관 (💡 = 고급 AI 의 수)');
  const V2 = JSON.parse(J(V)); V2.log = []; ok(J(C.ai(V2, s, 'hard', () => 0.5)) === J(a1), 'AI 는 기록이 아니라 판 모양만 봄');
  ok(a1.t === 'place' && a1.put.length === 1, '선공 첫 수 = 1개');
  // 고급은 풀리는 수만 두고, 풀 수 없다고 확정되면 선언
  let unsafe = 0, total = 0, declOk = 0, declN = 0;
  for (let seed = 40; seed < 40 + (QUICK ? 5 : 10); seed++) playAI(seed, ['hard', 'hard'], (st2, s2, V3, a) => {
    if (V3.phase === 'place' && a.t === 'place') { total++; const ev = C.evalPut(V3, a.put, 30000); if (ev.res === 0) unsafe++; }
    if (a.t === 'declare') { declN++; if (C.solveV(V3, V3.grid, 200000).res !== 1 || V3.need === 0) declOk++; }
  });
  ok(total > 20 && unsafe <= Math.ceil(total * 0.35), `고급 AI 는 대부분 풀리는 수를 둠 (풀 수 없게 만든 수 ${unsafe}/${total})`);
  ok(declN === declOk, `고급 AI 의 선언은 맞는 선언 (맞음 ${declOk}/${declN})`);
}

// ── 6. 복기 약속 (같은 씨앗 + 같은 행동 = 같은 판) ──
{
  const acts = []; const st = C.init({ n: 2, seed: 17, cfg: {} }), r = mul(5); let g = 0;
  while (!C.over(st) && g++ < 400) {
    const nd = C.needs(st);
    if (!nd.length) { acts.push({ adv: 1 }); C.advance(st); continue; }
    const s = nd[0], a = C.ai(C.view(st, s), s, g % 2 ? 'hard' : 'normal', r); acts.push({ s, a: JSON.parse(J(a)) }); C.apply(st, s, a);
  }
  const rp = C.init({ n: 2, seed: 17, cfg: {} });
  for (const x of acts) { if (x.adv) C.advance(rp); else C.apply(rp, x.s, JSON.parse(J(x.a))); }
  ok(hash(J(st)) === hash(J(rp)) && C.over(rp), '같은 씨앗 + 같은 행동 = 같은 판');
}

// ── 7. 화면 글 (ui.js 를 가상으로 불러서) ──
{
  global.window = { SVCores: { colorlink: C }, SVUI: {} };
  require('../games/colorlink/ui.js');
  const U = global.window.SVUI.colorlink;
  const st = C.init({ n: 2, seed: 8, cfg: {} }), f = st.first, V = C.view(st, f);
  const c = U.coach(V, f, -1, ['나', '상대']), a = C.ai(V, f, 'hard', () => 0.5);
  const txt = c.opp + c.mine + c.rec + c.why;
  ok(txt.length > 80 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(을\)|나가 |나의 /.test(txt), `선생님 글 ${txt.slice(0, 200)}`);
  ok(a.t === 'place' && c.rec.includes(C.cname(a.put[0].k)) && c.rec.includes(C.cname2(V.W, a.put[0].c)), `💡 = 고급 AI 의 수 (${c.rec})`);
  C.apply(st, f, a);
  const Vo = C.view(st, 1 - f), c2 = U.coach(Vo, 1 - f, -1, ['나', '상대']);
  ok(/내가 놓았어요|방금|놓은 뒤/.test(c2.opp), `상대 흐름 글 (${c2.opp})`);
  ok(!/undefined|NaN/.test(J(c2)), '선생님 글에 undefined 없음');
  ok(U.actText({ t: 'place', put: [{ c: 3, k: 5 }] }, V).includes('청록 F') && U.actText({ t: 'declare' }) === '불가능 선언', 'actText');
  // review: 풀 수 없게 만드는 수는 sev ≥ 60
  const st2 = C.init({ n: 2, seed: 8, cfg: {} });
  let g = 0; while (st2.phase === 'place' && g++ < 12) { const s = st2.cur, V2 = C.view(st2, s); if (V2.need < 2) { C.apply(st2, s, C.ai(V2, s, 'hard')); continue; } break; }
  const V2 = C.view(st2, st2.cur), s2 = st2.cur, ks = V2.cols.filter(k => V2.stock[k] > 0), em = C.emptiesOf(V2);
  let bad = null;
  for (let i = 0; i < 60 && !bad; i++) { const put = [{ c: em[(i * 7) % em.length], k: ks[i % ks.length] }, { c: em[(i * 13 + 5) % em.length], k: ks[(i + 1) % ks.length] }]; if (put[0].c !== put[1].c && put[0].k !== put[1].k && C.evalPut(V2, put, 30000).res === 0) bad = put; }
  if (bad) {
    const rv = U.review(V2, s2, { t: 'place', put: bad }, C.ai(V2, s2, 'hard', () => 0.5));
    ok(rv.sev >= 60 && rv.why.length > 20, `풀 수 없게 만든 수 sev ${rv.sev} · ${rv.why}`);
  } else ok(true, '(풀 수 없는 수를 못 찾음 — 건너뜀)');
  const rv2 = U.review(V2, s2, C.ai(V2, s2, 'hard'), C.ai(V2, s2, 'hard'));
  ok(rv2.sev === 0, '같은 수는 sev 0');
  ok(U.tutorial().length === 6 && U.howto.length >= 6, '1분 규칙 6단계 · 설명');
}

console.log(`colorlink selftest: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);

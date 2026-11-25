// 배틀 오름차순 규칙 시험 (node survival/test/ascbattle_selftest.js)
'use strict';
const B = require('../games/ascbattle/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const clone = o => JSON.parse(JSON.stringify(o));
const J = x => JSON.stringify(x);

// 1) 구간 계산 (같은 숫자도 이어짐)
{
  const L = sh => B.runOf(sh).len;
  ok(L([1, 2, 3, 4, 5, 6, 7, 8]) === 8 && L([4, 4, 4, 4, 4, 4, 4, 4]) === 8, '8칸 모두 오름차순');
  ok(L([8, 7, 6, 5, 4, 3, 2, 1]) === 1, '내림차순 = 1');
  ok(L([2, 5, 3, 3, 4, 9, 1, 1]) === 4 && B.runOf([2, 5, 3, 3, 4, 9, 1, 1]).from === 2, '3·3·4·9 = 4 (2·5 는 2) ' + J(B.runOf([2, 5, 3, 3, 4, 9, 1, 1])));
  ok(L([1, 2, null, 3, 4, 5, null, 7]) === 3, '빈칸에서 끊김');
}

// 2) 시작
{
  const seen = new Set();
  for (let s = 1; s <= 40; s++) {
    const st = B.init({ n: 2, seed: s });
    ok(st.sheets.length === 2 && st.sheets.every(sh => sh.length === 8 && sh.every(x => x == null)), '빈 시트 두 개 (8칸)');
    ok(st.pair.every(x => x >= 1 && x <= 10) && st.drawer === st.first && st.turn === 0 && st.phase === 'keep', '첫 턴: 카드 2장을 뽑음');
    ok(J(B.needs(st)) === J([st.drawer]), '뽑은 사람이 먼저');
    seen.add(st.first);
  }
  ok(seen.size === 2, '선공이 무작위');
}

// 3) 잘못된 입력 · 흐름
{
  const st = B.init({ n: 2, seed: 11 });
  const d = st.drawer, o = 1 - d, pair = st.pair.slice();
  ok(!B.apply(st, o, { t: 'keep', k: 0, c: 0 }).ok, '뽑는 사람이 아니면 못 고름');
  for (const bad of [{ t: 'keep', k: 2, c: 0 }, { t: 'keep', k: -1, c: 0 }, { t: 'keep', k: 0, c: 8 }, { t: 'keep', k: 0, c: -1 }, { t: 'keep', k: 0, c: 1.5 }, { t: 'keep', k: 0 }, { t: 'put', c: 0 }, null, {}])
    ok(!B.apply(st, d, bad).ok, '잘못된 선택 거부 ' + J(bad));
  ok(B.apply(st, d, { t: 'keep', k: 1, c: 3 }).ok, '카드 고르기');
  ok(st.sheets[d][3] === pair[1] && st.gift === pair[0] && st.phase === 'put', '고른 카드는 내 시트, 나머지는 상대에게');
  ok(J(B.needs(st)) === J([o]) && !B.apply(st, d, { t: 'put', c: 0 }).ok && !B.apply(st, o, { t: 'keep', k: 0, c: 0 }).ok, '이제 상대 차례 (넘어온 카드 적기)');
  ok(B.legal(st, o).length === 8 && B.legal(st, d).length === 0, 'legal');
  ok(B.apply(st, o, { t: 'put', c: 0 }).ok && st.sheets[o][0] === pair[0], '넘어온 카드 적기');
  ok(!B.apply(st, d, { t: 'keep', k: 0, c: 3 }).ok || st.drawer !== d, '턴이 바뀜');
  ok(st.turn === 1 && st.drawer === o && st.phase === 'keep', '다음엔 상대가 뽑음');
  const st2 = B.init({ n: 2, seed: 12 });
  B.apply(st2, st2.drawer, { t: 'keep', k: 0, c: 2 }); B.apply(st2, 1 - st2.drawer, { t: 'put', c: 2 });
  // 8턴 모두 같은 칸 순서로 → 각 칸이 한 번씩 참
  const stF = B.init({ n: 2, seed: 13 });
  for (let t = 0; t < 8; t++) { const dd = stF.drawer; ok(B.apply(stF, dd, { t: 'keep', k: 0, c: t }).ok && B.apply(stF, 1 - dd, { t: 'put', c: t }).ok, `${t + 1}턴`); }
  ok(stF.over && stF.sheets.every(sh => sh.every(x => x != null)) && B.needs(stF).length === 0, '모든 칸이 차면 끝');
  ok(!B.apply(stF, 0, { t: 'keep', k: 0, c: 0 }).ok, '끝난 판은 입력 거부');
  const dd = stF.first; ok(stF.log.filter(e => e.k === 'deal').map(e => e.s).every((s, i) => s === (dd + i) % 2), '뽑는 사람은 번갈아');
  const V = B.view(stF, 0);
  ok(V.over && V.ranks && J(V.score) === J(stF.sheets.map(s => B.runOf(s).len)), '끝난 판 등수 · 점수');
}

// 4) 승패 · 동점 공동
{
  const st = B.init({ n: 2, seed: 3 });
  st.sheets = [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1]];
  ok(J(B.ranks(st)) === J([0, 1]), '긴 쪽이 1등');
  st.sheets = [[1, 2, 3, 1, 2, 3, 4, 5], [5, 5, 5, 5, 1, 2, 3, 4]];
  ok(J(B.ranks(st)) === J([0, 1]), '1·2·3·4·5 (5칸) 대 5·5·5·5 / 1·2·3·4 (4칸) ' + J(B.ranks(st)));
  st.sheets = [[1, 2, 3, 4, 5, 6, 1, 1], [3, 3, 3, 3, 3, 3, 1, 1]];
  ok(J(B.ranks(st)) === J([0, 0]), '같은 점수는 공동 1등 ' + J(B.ranks(st)));
}

// 5) AI 끼리 끝까지
function play(seed, tiers) {
  const st = B.init({ n: 2, seed }), r = lcg(seed * 7 + 3);
  let steps = 0;
  while (!B.over(st) && steps < 100) {
    const need = B.needs(st);
    ok(need.length === 1, '한 번에 한 자리');
    const seat = need[0], V = B.view(st, seat);
    ok(V.needs.includes(seat), '내 차례');
    const a = B.ai(V, seat, tiers[seat], r), res = B.apply(st, seat, a);
    if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase}) ${J(a)} → ${res.err}`); B.apply(st, seat, B.legal(st, seat)[0]); }
    steps++;
  }
  ok(B.over(st) && steps === 16, `판이 끝남 (seed ${seed}, ${steps}번 = 8턴 × 2)`);
  const R = B.ranks(st);
  ok(R.length === 2 && R.includes(0), '등수');
  ok(new Set([-1, 0, 1, 'all'].map(i => B.view(st, i).pub)).size === 1, '공개 지문이 자리마다 다름');
  return st;
}
const T0 = Date.now();
const mix = [['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard'], ['hard', 'easy'], ['easy', 'hard'], ['normal', 'hard']];
for (let k = 0; k < 60; k++) play(100 + k, mix[k % mix.length]);
for (let k = 0; k < 40; k++) {   // 무작위 합법 수
  const st = B.init({ n: 2, seed: 900 + k }), r = lcg(k + 1);
  let steps = 0;
  while (!B.over(st) && steps++ < 100) { const s = B.needs(st)[0], L = B.legal(st, s); ok(L.length > 0 && B.apply(st, s, L[Math.floor(r() * L.length)]).ok, 'legal 수 거부'); }
  ok(B.over(st), '무작위 합법 수로 끝남');
}

// 6) 같은 seed → 같은 결과
{
  const a = play(4242, ['hard', 'normal']), b = play(4242, ['hard', 'normal']), c = play(4243, ['hard', 'normal']);
  ok(J(a.sheets) === J(b.sheets) && J(a.log) === J(b.log), '같은 seed 는 같은 판');
  ok(J(a.sheets) !== J(c.sheets), '다른 seed 는 다른 판');
}

// 7) 공개 게임 — 모든 자리가 같은 것을 봄 · 아직 안 뽑은 카드는 어디에도 없음
{
  const st = B.init({ n: 2, seed: 77 });
  B.apply(st, st.drawer, { t: 'keep', k: 0, c: 4 });
  const norm = V => { const v = clone(V); delete v.seat; return J(v); };
  ok(norm(B.view(st, 0)) === norm(B.view(st, 1)) && norm(B.view(st, 0)) === norm(B.view(st, -1)) && norm(B.view(st, 0)) === norm(B.view(st, 'all')), "모든 자리 · 구경꾼 · 'all' 이 같은 것을 봄");
  const st2 = clone(st); st2.rs = (st2.rs ^ 0x5555) >>> 0;
  ok(J(B.view(st, 0)) === J(B.view(st2, 0)), '난수 상태(앞으로 뽑을 카드)는 보기에 없음');
  ok(!J(B.view(st, 0)).includes('"rs"'), '난수 상태 키 없음');
  const V = B.view(st, 0);
  ok(V.phase === 'put' && V.gift > 0 && V.pair.length === 2 && V.kept === 0, '넘기는 카드 · 뽑은 두 장은 모두에게 공개');
}

// 8) 세기: hard > normal > easy
function match(tA, tB, games) {
  let w = 0;
  for (let g = 0; g < games; g++) {
    const me = g % 2, tiers = me === 0 ? [tA, tB] : [tB, tA], st = play(30000 + g * 7, tiers), R = B.ranks(st);
    w += R[me] === 0 ? (R[1 - me] === 0 ? 0.5 : 1) : 0;
  }
  return w / games;
}
{
  const he = match('hard', 'easy', 200), ne = match('normal', 'easy', 200), hn = match('hard', 'normal', 200);
  console.log(`  승률: hard→easy ${(he * 100).toFixed(1)}% · normal→easy ${(ne * 100).toFixed(1)}% · hard→normal ${(hn * 100).toFixed(1)}%`);
  ok(he > 0.55, 'hard 가 easy 를 이김 ' + he);
  ok(ne > 0.5, 'normal 이 easy 를 이김 ' + ne);
  ok(hn > 0.5, 'hard 가 normal 을 이김 ' + hn);
}
console.log(`  걸린 시간 ${((Date.now() - T0) / 1000).toFixed(1)}초`);

console.log(`배틀 오름차순 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

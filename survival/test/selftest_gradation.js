// 그라데이션 규칙 시험 (node survival/test/selftest_gradation.js)
'use strict';
const G = require('../games/gradation/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 1) 큐브 넣기 규칙
ok(G.checkSetup([0, 1, 2, 3, 4, 5, 9]) === null, '정상 배치');
ok(G.checkSetup([9, 9, 8, 0, 0, 1, 2]) === null, '9 두 개 · 합 29 정상 (순서는 자동 오름차순)');
ok(G.checkSetup([9, 9, 9, 0, 0, 1, 2]) !== null, '같은 수 3개 거절');
ok(G.checkSetup([9, 9, 8, 8, 0, 0, 0]) !== null, '0 이 3개 거절');
ok(G.checkSetup([9, 9, 8, 8, 1, 1, 0]) !== null, '합 36 > 30 거절');
ok(G.checkSetup([1, 2, 3]) !== null, '7개가 아니면 거절');
ok(G.checkSetup([0, 1, 2, 3, 4, 5, 10]) !== null, '10 큐브는 없음');
ok(G.checkSetup([0, 1, 2, 3, 4, 5, 6.5]) !== null, '정수만');

// 2) 손으로 한 대결
function setupDuel(a0, a1, lead) {
  const st = G.init({ n: 3, seed: 7 });
  st.duel = [0, 1]; st.sit = 2; st.lead = lead == null ? 0 : lead;
  ok(G.apply(st, 0, { t: 'setup', v: a0 }).ok, '0 번 큐브 넣기');
  ok(!G.apply(st, 2, { t: 'setup', v: a1 }).ok, '쉬는 사람은 못 넣음');
  ok(G.apply(st, 1, { t: 'setup', v: a1 }).ok, '1 번 큐브 넣기');
  eq(st.phase, 'play', '둘 다 넣으면 시작');
  return st;
}
function round(st, kL, kF) {
  const L = st.lead, F = L === st.duel[0] ? st.duel[1] : st.duel[0];
  eq(G.needs(st), [L], '선이 먼저 냄');
  ok(!G.apply(st, F, { t: 'play', k: kF }).ok, '후공은 선 다음에 냄');
  ok(G.apply(st, L, { t: 'play', k: kL }).ok, '선이 냄');
  const V = G.view(st, F);
  eq(V.sub[L], kL, '후공 눈에 선이 낸 통의 자리(색)가 보임');
  ok(V.res === null, '숫자는 아직 비공개');
  eq(G.needs(st), [F], '이제 후공 차례');
  ok(G.apply(st, F, { t: 'play', k: kF }).ok, '후공이 냄');
  eq(st.phase, 'show', '둘 다 내면 공개');
}
{
  const st = setupDuel([9, 8, 7, 3, 2, 1, 0], [9, 5, 4, 3, 2, 1, 0], 0);   // 0 번: 0 1 2 3 7 8 9 (30) · 1 번: 0 1 2 3 4 5 9 (24)
  eq(st.arr[0], [0, 1, 2, 3, 7, 8, 9], '왼쪽→오른쪽 오름차순으로 정렬됨');
  const V1 = G.view(st, 1);
  ok(V1.mine && V1.mine.join() === '0,1,2,3,4,5,9', '내 큐브는 나만 봄');
  ok(G.view(st, 0).mine.join() === '0,1,2,3,7,8,9', '상대는 내 큐브를 못 봄');
  // R1: 선(0) 6번(9) vs 6번(9) → 무승부, 선 그대로
  round(st, 6, 6); eq(st.res.win, -1, '9 vs 9 무승부'); G.advance(st); eq(st.lead, 0, '무승부면 선 그대로'); eq(st.pts.slice(0, 2), [0, 0], '무승부 점수 없음');
  // R2: 0번(0) vs 0번(0) 무승부 / R3: 선 5번(8) vs 5번(5) → 선 승
  round(st, 0, 0); G.advance(st);
  round(st, 5, 5); eq(st.res.win, 0, '8 > 5 선 승'); G.advance(st); eq(st.lead, 0, '이긴 선이 계속 선');
  // R4: 선 4번(7) vs 4번(4) → 선 승
  round(st, 4, 4); G.advance(st);
  // R5: 선 3번(3) vs 1번(1) → 선 승 / R6: 선 2번(2) vs 3번(3) → 후공 승 (선 바뀜)
  round(st, 3, 1); G.advance(st);
  round(st, 2, 3); eq(st.res.win, 1, '후공이 이김'); G.advance(st); eq(st.lead, 1, '후공이 이기면 다음 선');
  ok(!G.apply(st, 1, { t: 'play', k: 6 }).ok, '이미 쓴 통은 못 냄');
  // R7: 마지막 남은 통: 1번 선의 남은 통 = 2번(2) · 0번 쪽 남은 통 = 1번(1)
  round(st, 2, 1);
  G.advance(st);
  eq(st.phase, 'mshow', '7라운드가 끝나면 대결 결과');
  eq(st.pts.slice(0, 2), [3, 2], '3 : 2');
  eq(st.mres.winner, 0, '0 번이 이김');
  G.advance(st);
  eq(st.duel, [0, 2], '이긴 사람 0 번이 쉬던 2 번과 대결');
  eq(st.sit, 1, '진 사람이 쉼');
  eq(st.lead, 0, '직전 대결 승자가 첫 선');
  eq(st.phase, 'setup', '새 대결은 큐브를 다시 넣음');
  // 두 번째 대결에서 0 번이 또 이기면 2연승 → 끝
  G.apply(st, 0, { t: 'setup', v: [9, 9, 8, 0, 0, 1, 2] }); G.apply(st, 2, { t: 'setup', v: [0, 0, 1, 1, 2, 2, 3] });
  let guard = 0;
  while (st.phase !== 'mshow' && guard++ < 30) {
    if (st.phase === 'show') { G.advance(st); continue; }
    const L = st.lead, F = st.duel.find(x => x !== L);
    // 0 번은 항상 가장 큰 통부터, 2 번은 가장 작은 통부터
    const pick = s => { const arr = st.arr[s]; const free = arr.map((v, k) => k).filter(k => !st.used[s][k]); return s === 0 ? free[free.length - 1] : free[0]; };
    G.apply(st, L, { t: 'play', k: pick(L) }); G.apply(st, F, { t: 'play', k: pick(F) });
  }
  eq(st.phase, 'mshow', '두 번째 대결 결과');
  eq(st.mres.winner, 0, '0 번이 두 번째 대결도 이김');
  ok(st.mres.over, '2연승이면 끝');
  G.advance(st);
  ok(G.over(st), '판 끝');
  eq(G.ranks(st), [0, 1, 1], '이긴 사람 1등, 나머지 둘 공동 2등');
}

// 3) 재대결 (동점) 과 연승이 끊기는 경우
{
  const st = setupDuel([0, 1, 2, 3, 4, 5, 9], [0, 1, 2, 3, 4, 5, 9], 0);
  for (let k = 0; k < 7; k++) { round(st, k, k); G.advance(st); }
  eq(st.mres.rematch, true, '같은 점수면 재대결');
  G.advance(st);
  eq(st.duel, [0, 1], '재대결은 같은 두 사람');
  eq(st.phase, 'setup', '재대결은 큐브를 다시 넣음');
  eq(st.matchNo, 2, '대결 번호가 올라감');
  // 이번에는 1 번이 이김 → 1 번이 쉬던 2 번과, 연승 카운터는 1 번
  G.apply(st, 0, { t: 'setup', v: [0, 0, 1, 1, 2, 2, 3] }); G.apply(st, 1, { t: 'setup', v: [9, 9, 8, 0, 0, 1, 2] });
  for (let k = 0; k < 7; k++) { const L = st.lead, F = st.duel.find(x => x !== L); const free = s => st.arr[s].map((v, i) => i).filter(i => !st.used[s][i]); G.apply(st, L, { t: 'play', k: free(L)[0] }); G.apply(st, F, { t: 'play', k: free(F)[0] }); G.advance(st); }
  eq(st.mres.winner, 1, '1 번이 이김');
  G.advance(st);
  eq(st.duel, [1, 2], '이긴 1 번 대 쉬던 2 번');
  eq(st.streak, 1, '1 번이 1승 연속');
}

// 4) 끝까지 (AI 끼리) + 규칙 어김 없음
function playOut(seed, tiers) {
  const st = G.init({ n: 3, seed }), r = rngOf(seed ^ 5);
  let guard = 0;
  while (!G.over(st) && guard++ < 4000) {
    const need = G.needs(st);
    if (!need.length) { ok(G.auto(st) != null, '입력도 자동도 없으면 멈춤 ' + st.phase); G.advance(st); continue; }
    for (const s of need.slice()) {
      const a = G.ai(G.view(st, s), s, tiers[s % tiers.length], r);
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase} 자리 ${s} ${JSON.stringify(a)}): ${res.err}`); return st; }
    }
  }
  ok(G.over(st), `끝남 (seed ${seed} 대결 ${st.matchNo})`);
  return st;
}
for (let k = 0; k < 24; k++) {
  const tiers = [['easy'], ['normal'], ['hard'], ['easy', 'normal', 'hard']][k % 4];
  const st = playOut(300 + k, tiers);
  eq(G.ranks(st).slice().sort(), [0, 1, 1], '등수는 1등 하나 + 공동 2등 둘');
  ok(st.matchNo <= 12, '대결은 12번 안에 끝남 (' + st.matchNo + ')');
  st.arr.forEach(a => { if (a) ok(G.checkSetup(a) === null, '넣은 큐브는 규칙에 맞음'); });
}

// 5) 숨김: 상대의 아직 안 나온 큐브를 바꿔도 내 화면 · 선생님 · AI 수가 같아야 함
{
  let leaks = 0, checks = 0;
  for (let k = 0; k < 8; k++) {
    const st = G.init({ n: 3, seed: 900 + k }), r = rngOf(k + 3);
    let steps = 0;
    while (!G.over(st) && steps++ < 800) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const s = need[0];
      if (st.phase === 'play' && steps % 2 === 0) {
        const opp = st.duel.find(x => x !== s);
        const alt = JSON.parse(JSON.stringify(st));
        const known = st.rev[opp].slice();
        // 상대가 이번 라운드에 이미 낸 통의 값은 아직 비공개이므로 known 에 넣지 않음
        const A = G.sampleOpp(known, rngOf(steps * 7 + k));
        // 이미 낸 (공개된) 칸은 sampleOpp 가 그대로 맞춰 줌
        alt.arr[opp] = A;
        const v1 = G.view(st, s), v2 = G.view(alt, s);
        checks++;
        if (JSON.stringify(v1) !== JSON.stringify(v2)) { leaks++; if (leaks < 3) console.error('내 화면이 상대 큐브에 따라 달라짐'); }
        const c1 = G.coach(v1, s, -1, null), c2 = G.coach(v2, s, -1, null);
        if (JSON.stringify(c1) !== JSON.stringify(c2)) { leaks++; if (leaks < 3) console.error('선생님 글이 상대 큐브에 따라 달라짐'); }
        const a1 = G.ai(v1, s, 'hard', rngOf(2)), a2 = G.ai(v2, s, 'hard', rngOf(2));
        if (JSON.stringify(a1) !== JSON.stringify(a2)) { leaks++; if (leaks < 3) console.error('AI 수가 상대 큐브에 따라 달라짐'); }
      }
      ok(G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r)).ok, '숨김 시험 진행');
    }
  }
  ok(checks > 20, '숨김 비교 횟수 ' + checks);
  ok(leaks === 0, '상대 큐브가 내 화면 · 선생님 · AI 에 새지 않음 (누출 ' + leaks + ')');
}

// 6) 공개 지문 = 모든 자리 같음
{
  const st = G.init({ n: 3, seed: 5 }), r = rngOf(8);
  let steps = 0;
  while (!G.over(st) && steps++ < 400) {
    const need = G.needs(st);
    if (!need.length) { G.advance(st); continue; }
    const pubs = new Set([0, 1, 2].map(i => G.view(st, i).pub).concat(G.view(st, 'all').pub));
    ok(pubs.size === 1, '모든 자리의 pub 지문이 같음');
    const s = need[0]; G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r));
  }
}

console.log(`그라데이션 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

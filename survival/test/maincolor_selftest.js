// 메인 컬러 규칙 시험 (node survival/test/maincolor_selftest.js [--quick])
'use strict';
const C = require('../games/maincolor/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sub = (b, w, g, p) => ({ t: 'sub', b, w, g, p: p || 0 });
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 3000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
const vote = (st, vs) => { for (let s = 0; s < st.n; s++) { const r = C.apply(st, s, { t: 'vote', c: vs[s] }); if (!r.ok) throw new Error('vote ' + r.err); } };

// 1) 시작
{
  const st = C.init({ n: 5, seed: 7 });
  ok(st.n === 5 && st.round === 1 && st.rounds === 5 && st.phase === 'vote' && st.score.every(x => x === 0), '5명 · 5라운드 · 투표부터');
  ok(st.hands.every(h => h.length === 3 && h[0] + h[1] + h[2] === 8), '모두 카드 8장 (검정 · 하양 · 회색)');
  ok(J(C.needs(st)) === J([0, 1, 2, 3, 4]), '모두 동시에 투표');
  ok(C.init({ n: 2, seed: 1 }).n === 3 && C.init({ n: 12, seed: 1 }).n === 7, '인원 3~7');
  ok(C.init({ n: 4, seed: 1, cfg: { rounds: 3 } }).rounds === 3 && C.init({ n: 4, seed: 1, cfg: { rounds: 4 } }).rounds === 5, '라운드 옵션');
  ok(J(C.init({ n: 5, seed: 7 }).hands) === J(st.hands) && J(C.init({ n: 5, seed: 8 }).hands) !== J(st.hands), '씨앗 결정적');
  // 색은 대체로 고르게
  const cnt = [0, 0, 0]; for (let sd = 1; sd <= 50; sd++) for (const h of C.init({ n: 7, seed: sd }).hands) h.forEach((x, c) => { cnt[c] += x; });
  ok(cnt.every(x => Math.abs(x / (50 * 7 * 8) - 1 / 3) < 0.03), '세 색이 고르게 나옴 ' + cnt);
}
// 2) 투표 · 메인 컬러
{
  const st = C.init({ n: 5, seed: 3 }), s0 = J(st);
  ok(!C.apply(st, 0, { t: 'vote', c: 3 }).ok && !C.apply(st, 0, sub(0, 0, 0)).ok && !C.apply(st, 0, { t: 'x' }).ok && J(st) === s0, '이상한 투표 · 투표 때 제출 막고 상태 그대로');
  ok(C.apply(st, 0, { t: 'vote', c: 2 }).ok && !C.apply(st, 0, { t: 'vote', c: 1 }).ok, '투표는 한 번');
  const V1 = C.view(st, 1), V0 = C.view(st, 0), W = C.view(st, -1);
  ok(V0.myVote === 2 && V1.myVote === null && V1.voted[0] === true && W.tally === null, '내 투표만 보임 · 득표는 모두 던지기 전엔 비공개');
  ok(V0.pub === V1.pub && V1.pub === W.pub, '공개 지문 같음');
  ok(!J(V1).includes('"votes"') && J(C.view(st, 'all').votes).includes('2'), 'all 만 투표 목록');
  for (let s = 1; s < 5; s++) C.apply(st, s, { t: 'vote', c: s < 3 ? 2 : 0 });
  ok(st.phase === 'sub' && J(st.tally) === J([2, 0, 3]) && J(st.main) === J([2]), '회색 3표 → 메인 컬러 회색');
  const st2 = C.init({ n: 4, seed: 3 }); vote(st2, [0, 0, 1, 1]);
  ok(J(st2.main) === J([0, 1]), '동점이면 동점인 색 모두 메인 컬러');
  const st3 = C.init({ n: 3, seed: 3 }); vote(st3, [0, 1, 2]);
  ok(J(st3.main) === J([0, 1, 2]), '모두 다르면 세 색 모두');
}
// 3) 제출 검사 · 점수
{
  const st = C.init({ n: 3, seed: 5 }); st.hands = [[3, 2, 3], [2, 4, 2], [3, 3, 2]]; vote(st, [2, 2, 0]);   // 회색 메인
  ok(J(st.main) === J([2]) && st.phase === 'sub', '회색 메인');
  const s0 = J(st);
  ok(!C.apply(st, 0, sub(1, 0, 0)).ok && !C.apply(st, 0, sub(0, 1, 0)).ok, '메인 컬러가 아닌 검정 · 하양은 단독으로 못 냄');
  ok(!C.apply(st, 0, sub(0, 0, 4)).ok && !C.apply(st, 0, sub(0, 0, 1, 3)).ok && !C.apply(st, 0, { t: 'sub', b: -1, w: 0, g: 0, p: 0 }).ok && !C.apply(st, 0, { t: 'sub', b: 0.5, w: 0, g: 0, p: 0 }).ok, '가진 것보다 많이 · 음수 · 소수 막음');
  ok(J(st) === s0, '안 먹은 제출은 상태를 안 바꿈');
  ok(C.apply(st, 0, sub(0, 0, 3, 1)).ok, '회색 3 + 검정 · 하양 짝 1 (5장 · 점수 4)');
  ok(J(C.view(st, 1).mySub) === 'null' && C.view(st, 1).subbed[0] === true && !J(C.view(st, 1)).includes('"subs"'), '남의 제출은 안 보임');
  C.apply(st, 1, sub(0, 0, 2, 2)); C.apply(st, 2, sub(0, 0, 1, 1));
  // 장수: 0번 5 · 1번 6 (회색2 + 짝2 = 6장 점수 4) · 2번 3 → 1번이 가장 많이 냄 → 0점
  ok(st.phase === 'show' && st.score[0] === 4 && st.score[1] === 0 && st.score[2] === 2, `가장 많이 낸 1번(6장)은 0점, 나머지는 점수대로 (${st.score})`);
  const R = st.res.rows; ok(R[1].zero && R[1].pts === 4 && R[1].got === 0 && R[1].phys === 6 && R[1].left === 2 && !R[0].zero, '결과 기록: 0점 · 낸 장수 · 남은 카드');
}
// 4) 0점 동률 · 아무도 안 냄 · 자동 0장
{
  const st = C.init({ n: 3, seed: 5 }); st.hands = [[3, 2, 3], [2, 4, 2], [3, 3, 2]]; vote(st, [0, 0, 0]);   // 검정만 메인
  C.apply(st, 0, sub(3, 0, 0)); C.apply(st, 1, sub(2, 0, 0)); C.apply(st, 2, sub(3, 0, 0));
  ok(st.score[0] === 0 && st.score[2] === 0 && st.score[1] === 2, '가장 많이 낸 사람이 둘이면 둘 다 0점');
  const s2 = C.init({ n: 3, seed: 5 }); s2.hands = [[3, 2, 3], [2, 4, 2], [3, 3, 2]]; vote(s2, [1, 1, 1]);
  C.apply(s2, 0, sub(0, 0, 0)); C.apply(s2, 1, sub(0, 0, 0)); C.apply(s2, 2, sub(0, 0, 0));
  ok(s2.score.every(x => x === 0), '아무도 안 내면 모두 0점');
  const s3 = C.init({ n: 3, seed: 5 }); s3.hands = [[8, 0, 0], [0, 8, 0], [0, 0, 8]]; vote(s3, [0, 0, 0]);
  ok(J(C.needs(s3)) === J([0, 1, 2]) && C.view(s3, 0).subbed.every(x => !x), '낼 카드가 없는 사람도 직접 0장을 냄 (낼 카드 유무가 안 새게)');
  C.apply(s3, 1, sub(0, 0, 0)); C.apply(s3, 2, sub(0, 0, 0)); C.apply(s3, 0, sub(8, 0, 0));
  ok(s3.phase === 'show' && s3.score[0] === 0, '혼자 낸 사람이 가장 많이 낸 사람 → 0점');
  // 검정 + 하양 메인: 짝은 안 됨
  const s4 = C.init({ n: 3, seed: 5 }); s4.hands = [[3, 3, 2], [3, 3, 2], [3, 3, 2]]; vote(s4, [0, 1, 0]);
  ok(J(s4.main) === J([0]), '검정 2표 메인');
  const s5 = C.init({ n: 4, seed: 5 }); s5.hands = Array.from({ length: 4 }, () => [3, 3, 2]); vote(s5, [0, 1, 0, 1]);
  ok(!C.apply(s5, 0, { t: 'sub', b: 1, w: 1, g: 0, p: 1 }).ok && C.apply(s5, 0, sub(3, 3, 0)).ok, '검정 + 하양 메인: 짝 불가 · 각각 점수');
}
// 5) 끝 · 순위
{
  const st = C.init({ n: 3, seed: 5, cfg: { rounds: 3 } }); let g = 0;
  while (!C.over(st) && g++ < 200) { const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; } for (const s of nd) C.apply(st, s, st.phase === 'vote' ? { t: 'vote', c: 0 } : C.legal(st, s)[0]); }
  ok(C.over(st) && st.round === 3 && st.hist.length === 3 && st.end === 'rounds', '3라운드 뒤 끝');
  const V = C.view(st, 0); ok(V.over && V.ranks.length === 3 && V.log[V.log.length - 1].k === 'end', '끝난 view');
  ok(!C.apply(st, 0, { t: 'vote', c: 0 }).ok, '끝난 뒤 못 함');
  const st2 = C.init({ n: 3, seed: 5 }); st2.score = [5, 5, 2]; ok(J(C.ranks(st2)) === J([0, 0, 2]), '같은 점수는 공동 순위');
}
// 6) AI: 규칙 안, 결정적, 상태 안 바꿈, 엿보기 없음
{
  for (const [n, seed] of [[3, 1], [4, 2], [5, 3], [7, 4]]) {
    const tiers = Array.from({ length: n }, (_, i) => ['hard', 'normal', 'easy'][i % 3]);
    const st = playAI(seed, tiers, seed % 2 ? {} : { rounds: 3 }, (st0, s, V, V0, a) => {
      ok(J(V) === V0, 'ai 가 view 를 안 바꿈');
      ok(!('hands' in V) && !('votes' in V) && !('subs' in V), 'AI 에게 남의 손패 · 투표 · 제출이 안 보임');
      if (tiers[s] === 'hard') { const R = C.recommend(V, s); ok(J(C.ai(V, s, 'hard', mul(9))) === J(a) && R && J(R.a) === J(a), '고급 rnd 무시 · 추천 = 고급'); }
    });
    const st2 = playAI(seed, tiers, seed % 2 ? {} : { rounds: 3 });
    ok(J(st.score) === J(st2.score), `씨앗 ${seed} 결정적 · ${n}명`);
  }
  // 엿보기: 남의 손패만 다른 두 세계에서 같은 수
  const a = C.init({ n: 4, seed: 21 }), b = C.init({ n: 4, seed: 21 });
  b.hands[1] = [a.hands[1][2], a.hands[1][0], a.hands[1][1]];
  ok(J(C.ai(C.view(a, 0), 0, 'hard')) === J(C.ai(C.view(b, 0), 0, 'hard')), '남의 손패가 달라도 내 투표는 같음 (엿보기 없음)');
  // 판단: 회색 투표 기대치가 상식과 맞음 — 회색이 하나도 없는 손패는 회색에 투표하지 않음
  const st = C.init({ n: 5, seed: 8 }); const V = C.view(st, 0); V.hand = [4, 4, 0];
  ok(C.ai(V, 0, 'hard').c !== 2, '회색이 0장이면 회색에 투표 안 함');
}
// 7) 실력
{
  const N = QUICK ? 30 : 100;
  for (const [A, B, need] of [['hard', 'easy', 0.65]].concat(QUICK ? [] : [['normal', 'easy', 0.6]])) {
    let pair = 0, cnt = 0;
    for (const n of [3, 5, 7]) for (let g = 0; g < N / 3; g++) {
      const hs = g % n, T = Array(n).fill(B); T[hs] = A;
      const st = playAI(101 + g * 13, T, {}), R = C.ranks(st);
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += R[j] > R[hs] ? 1 : R[j] === R[hs] ? 0.5 : 0;
      pair += p / (n - 1); cnt++;
    }
    console.log(`· ${A} vs ${B} 짝 승률 ${(pair / cnt * 100).toFixed(0)}% (${cnt}판)`);
    ok(pair / cnt >= need, `${A} 이 ${B} 를 이김 ${(pair / cnt).toFixed(2)}`);
  }
}
// 8) AI 시간
{
  let mx = 0; const st = C.init({ n: 7, seed: 5 }), r = mul(5);
  for (let g = 0; g < 100 && !C.over(st); g++) { const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; } for (const s of nd) { const V = C.view(st, s), t = process.hrtime.bigint(); const a = C.ai(V, s, 'hard', r); mx = Math.max(mx, Number(process.hrtime.bigint() - t) / 1e6); const x = C.recommend(V, s); void x; C.apply(st, s, a); } }
  ok(mx < 150, `고급 AI 한 번 최대 ${mx.toFixed(1)}ms < 150ms`);
}
console.log(`maincolor selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

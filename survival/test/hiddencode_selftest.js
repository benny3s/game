// 히든코드 규칙 시험 (node survival/test/hiddencode_selftest.js [--quick])
'use strict';
const C = require('../games/hiddencode/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = id => C.RULES.find(r => r.id === id);
const cellsOf = (...g) => { const c = [[], [], [], [], []]; g.forEach((x, i) => { c[i] = x; }); return c; };
const pickAll = (st, vs) => { for (let s = 0; s < st.n; s++) { const r = C.apply(st, s, { t: 'pick', v: vs[s] }); if (!r.ok) throw new Error('pick ' + r.err); } };
function playAI(seed, tiers, check) {
  const n = tiers.length, st = C.init({ n, seed }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 4000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a); if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
// 1) 방송 기록과 규칙 계산이 같은가 (나무위키 1~3라운드)
{
  ok(C.RULES.length === 12, '규칙 12개');
  ok(R('sumEven').f([79, 280, 31, 124, 2]) === 406, '1라운드 짝수 칸의 합 = 406');
  ok(R('sumEven').f([64, 15, 3]) === 64 && R('sumEven').f([1, 65, 43]) === 0 && R('sumEven').f([1, 3, 4, 5, 6]) === 10, '1라운드 시험 결과 64 · 0 · 10');
  ok(R('pms').f([9, 111, 3, 1, 12]) === 35828, '2라운드 곱 − 합 = 35828');
  ok(R('pms').f([4, 4, 1, 5, 1]) === 65 && R('pms').f([5, 11, 4, 4]) === 856 && R('pms').f([44, 1, 1, 5]) === 169 && R('pms').f([14, 4, 1, 5]) === 256, '2라운드 시험 결과 65 · 856 · 169 · 256');
  ok(R('hangulO').f([86, 2, 91, 0, 13]) === 6, "3라운드 한글 'ㅇ' 6개");
  ok(R('hangulO').f([1, 1, 6, 6, 2]) === 5 && R('hangulO').f([662, 11]) === 5 && R('hangulO').f([12, 16, 6]) === 5, '3라운드 시험 결과 5 · 5 · 5');
  ok(R('sum').f([1, 2, 3]) === 6 && R('maxmin').f([9, 2, 5]) === 7 && R('digcnt').f([12, 3, 456]) === 6 && R('digsum').f([12, 3]) === 6 && R('sumOdd').f([1, 2, 3]) === 4 && R('evenCnt').f([1, 2, 4]) === 2, '나머지 규칙 계산');
}
// 2) 시작 · 숫자 획득 · 시험 (모두 동시에)
const stepAll = (st, f) => { for (const s of C.needs(st).slice()) { if (!C.needs(st).includes(s)) continue; const r = C.apply(st, s, f(s, st)); if (!r.ok) throw new Error(`apply ${s} ${r.err}`); } };
const ID = cellsOf([0], [1], [2], [3], [4]);
{
  const s3 = C.init({ n: 3, seed: 7 }), s2 = C.init({ n: 2, seed: 7 });
  ok(s3.butler.length === 2 && s2.butler.length === 3, '집사 주사위 = 5 − 인원');
  ok(s3.star.length === 5 && C.targetOf(s3.rule, s3.star) === s3.target, '별 5칸 · 결괏값');
  ok(C.init({ n: 9, seed: 1 }).n === 3 && C.init({ n: 1, seed: 1 }).n === 2, '인원 2~3');
  ok(J(C.needs(s3)) === J([0, 1, 2]), '숫자 획득: 모두 동시에');
  ok(!C.apply(s3, 0, { t: 'pick', v: 7 }).ok && !C.apply(s3, 0, { t: 'test', cells: ID }).ok, '엉뚱한 행동 막음');
  ok(C.apply(s3, 0, { t: 'pick', v: 3 }).ok && !C.apply(s3, 0, { t: 'pick', v: 4 }).ok, '낸 뒤 또 못 냄');
  const V1 = C.view(s3, 1), V0 = C.view(s3, 0);
  ok(V1.myPick == null && V0.myPick === 3 && V1.picked[0] === true && V1.nums === null, '남이 고른 눈은 다 낼 때까지 안 보임');
  ok(C.view(s3, -1).myPick == null, '구경꾼도 못 봄');
  C.apply(s3, 1, { t: 'pick', v: 1 }); C.apply(s3, 2, { t: 'pick', v: 6 });
  ok(s3.phase === 'test' && s3.nums.length === 5 && s3.nums.slice(0, 2).every(x => x.by === -1) && s3.nums[2].v === 3 && s3.nums[2].by === 0, '5개 숫자 공개 (집사 → 자리 순)');
  ok(J(C.needs(s3)) === J([0, 1, 2]), '시험도 모두 동시에');
  const bad = [[[0, 1], [2], [3], [4], [4]], [[0], [1], [2], [3], []], [[0, 1, 2, 3, 4]], [[0], [1], [2], [3], [4], []]];
  for (const b of bad) ok(!C.apply(s3, 0, { t: 'test', cells: b }).ok, '5개를 다 쓰지 않은 배치 막음');
  const nm = s3.nums.map(x => x.v);
  ok(C.apply(s3, 0, { t: 'test', cells: cellsOf([0, 1], [2], [3], [4]) }).ok && s3.sub[0] && !C.needs(s3).includes(0), '낸 사람은 기다림');
  ok(!C.apply(s3, 0, { t: 'pass' }).ok, '한 단계에 한 번');
  ok(C.view(s3, 1).sub[0] === true && C.view(s3, 1).mySub === null && C.view(s3, 0).mySub.t === 'test', '남이 뭘 냈는지는 냈다는 것만 보임');
  C.apply(s3, 1, { t: 'test', cells: ID }); C.apply(s3, 2, { t: 'pass' });
  ok(s3.tests[0].length === 1 && s3.tests[0][0].vals[0] === nm[0] * 10 + nm[1], '두 자리 붙이기');
  ok(s3.tests[0][0].res === C.RULES[s3.rule].f(s3.tests[0][0].vals), '시험 결과 = 숨은 규칙');
  ok(s3.done[2] && J(C.needs(s3)) === J([0, 1]), '넘긴 사람은 이 숫자 단계에서 빠짐');
}
// 3) 숨김: 남의 시험 · 규칙 · 결괏값
{
  const st = C.init({ n: 3, seed: 11 }); pickAll(st, [2, 4, 5]);
  stepAll(st, s => (s === 0 ? { t: 'test', cells: ID } : { t: 'pass' }));
  for (const seat of [0, 1, 2, -1]) {
    const V = C.view(st, seat), t = J(V);
    ok(V.rule == null && V.target == null && V.all === undefined && V.picksAll === undefined && V.res === null, `자리 ${seat}: 규칙 · 결괏값 · 전체 시험 안 보임`);
    ok((seat === 0 ? V.my.length === 1 : V.my.length === 0) && V.tn[0] === 1, `자리 ${seat}: 내 시험만 보이고 횟수만 공개`);
    ok(seat === 0 || !t.includes('"cells"'), `자리 ${seat}: 남의 배치 안 보임`);
  }
  const A = C.view(st, 'all'); ok(A.rule === st.rule && A.target === st.target && A.all[0].length === 1, "'all' 은 다 보임");
}
// 4) 외치기 · 오답 벌 · 동시 정답 · 점수
{
  const st = C.init({ n: 3, seed: 5 }); pickAll(st, [1, 2, 3]);
  const T = st.target;
  ok(!C.apply(st, 0, { t: 'say', v: 1.5 }).ok, '정수만');
  stepAll(st, s => (s === 0 ? { t: 'say', v: T + 1 } : { t: 'test', cells: ID }));
  ok(st.wrong[0] === 1 && st.blk[0] === 1 && st.says.length === 1 && !st.says[0].ok && st.phase === 'test' && st.score.every(x => x === 0), '오답: 감점 없이 벌 표시 · 계속');
  ok(C.view(st, -1).says[0].v === T + 1, '틀린 외침은 모두에게 공개');
  ok(!C.apply(st, 0, { t: 'say', v: T }).ok, '다음 단계엔 정답을 못 외침 (30초 발언권 대신)');
  stepAll(st, s => (s === 0 ? { t: 'test', cells: ID } : { t: 'pass' }));
  ok(st.blk[0] === 0 && C.apply(st, 0, { t: 'say', v: T }).ok && st.res && st.res.win === 0 && st.score[0] === 1 && st.phase === 'show', '벌이 지나면 다시 외칠 수 있음 · 정답이면 1점 · 라운드 끝');
  const V = C.view(st, 1); ok(V.res && V.res.rule === st.rule && V.res.target === T && V.all, '라운드가 끝나면 규칙 · 결괏값 · 서로의 시험 공개');
  ok(C.auto(st) > 0, '결과는 잠깐 보여 줌');
  C.advance(st); ok(st.round === 2 && st.phase === 'pick' && st.score[0] === 1, '다음 문제');
  ok(C.view(st, 0).res === null && C.view(st, 0).all === undefined, '다음 문제에서 지난 시험은 안 보임');
  const d = C.init({ n: 3, seed: 6 }); pickAll(d, [1, 1, 1]);
  stepAll(d, s => (s < 2 ? { t: 'say', v: d.target } : { t: 'say', v: d.target + 5 }));
  ok(J(d.res.wins) === J([0, 1]) && d.score.join() === '1,1,0', '같은 단계에 맞히면 맞힌 사람 모두 1점');
}
// 5) 숫자 획득 되풀이 · 4번 뒤 무득점 · 외치기 2번 제한
{
  const st = C.init({ n: 2, seed: 3 }); let g = 0;
  while (st.round === 1 && g++ < 200) {
    if (st.phase === 'pick') { stepAll(st, () => ({ t: 'pick', v: 2 })); continue; }
    stepAll(st, () => ({ t: 'pass' }));
  }
  ok(st.round === 1 && st.phase === 'show' && st.res.win === -1 && st.score.every(x => x === 0) && st.set === C.SETCAP + 1, `숫자 획득 ${C.SETCAP}번 되풀이 뒤 0점으로 끝 (${st.phase}, ${st.set})`);
  const s3 = C.init({ n: 2, seed: 3 }); pickAll(s3, [1, 1]);
  stepAll(s3, () => ({ t: 'say', v: s3.target + 1 })); stepAll(s3, () => ({ t: 'test', cells: ID })); stepAll(s3, () => ({ t: 'say', v: s3.target + 2 }));
  ok(s3.wrong.join() === '2,2' && !C.apply(s3, 0, { t: 'say', v: 5 }).ok, '오답 2번이면 더 못 외침');
}
// 6) 끝 · 순위 · 연장
{
  const st = C.init({ n: 3, seed: 21 }); st.score = [2, 1, 0]; st.round = 1; pickAll(st, [1, 2, 3]);
  stepAll(st, s => (s === 0 ? { t: 'say', v: st.target } : { t: 'pass' })); C.advance(st);
  ok(C.over(st) && st.end === 'win' && st.score[0] === 3 && J(C.ranks(st)) === J([0, 1, 2]), '3점이면 즉시 승 (' + st.end + ')');
  const t2 = C.init({ n: 2, seed: 4 }); t2.round = 5; t2.score = [2, 2]; t2.phase = 'show'; t2.res = { win: -1 }; C.advance(t2);
  ok(!C.over(t2) && t2.round === 6, '5라운드 뒤 동점이면 연장');
  const t3 = C.init({ n: 2, seed: 4 }); t3.round = 5; t3.score = [2, 1]; t3.phase = 'show'; t3.res = { win: -1 }; C.advance(t3);
  ok(C.over(t3) && t3.end === 'rounds' && J(C.ranks(t3)) === J([0, 1]), '5라운드 뒤 최다 승점');
  const t4 = C.init({ n: 2, seed: 4 }); t4.round = 9; t4.score = [2, 2]; t4.phase = 'show'; t4.res = { win: -1 }; C.advance(t4);
  ok(C.over(t4) && t4.end === 'cap' && J(C.ranks(t4)) === J([0, 0]), '9라운드까지 같으면 공동');
  const t5 = C.init({ n: 2, seed: 4 }); t5.round = 3; t5.score = [3, 3]; t5.phase = 'show'; t5.res = { win: -1 }; C.advance(t5);
  ok(!C.over(t5) && t5.round === 4, '둘이 동시에 3점이면 연장');
  ok(!C.apply(t4, 0, { t: 'say', v: 1 }).ok, '끝난 뒤 못 냄');
}
// 7) AI: 규칙 안 · 결정적 · 보이는 것만 · 상태 안 바꿈 · 추천 = 고급
{
  for (const [n, seed] of [[2, 1], [3, 2], [3, 3], [2, 4]]) {
    const tiers = Array.from({ length: n }, (_, i) => ['hard', 'normal', 'easy'][i % 3]);
    const st = playAI(seed, tiers, (st0, s, V, V0, a) => {
      ok(J(V) === V0, 'ai 가 view 를 안 바꿈');
      ok(V.rule === undefined && V.target === undefined && V.all === undefined, 'AI 에게 규칙 · 결괏값 · 남의 시험이 안 보임');
      if (tiers[s] === 'hard' && V.phase === 'test') { const Rr = C.recommend(V, s); ok(J(C.ai(V, s, 'hard', mul(9))) === J(a) && Rr && J(Rr.a) === J(a), '고급은 rnd 를 안 씀 · 추천 = 고급'); }
    });
    const st2 = playAI(seed, tiers); ok(J(st.score) === J(st2.score) && st.round === st2.round, `씨앗 ${seed} 결정적 · ${st.round}문제`);
  }
  // 엿보기 시험: 남의 시험 · 남이 고른 눈이 달라도 내 AI 는 같은 수
  const a = C.init({ n: 3, seed: 31 }), b = C.init({ n: 3, seed: 31 });
  C.apply(a, 1, { t: 'pick', v: 2 }); C.apply(b, 1, { t: 'pick', v: 5 });
  ok(J(C.ai(C.view(a, 0), 0, 'hard')) === J(C.ai(C.view(b, 0), 0, 'hard')), '남이 낸 눈이 달라도 내 눈은 같음 (엿보기 없음)');
  // 고급은 규칙 후보가 하나로 좁혀지면 바로 외침
  const st = C.init({ n: 2, seed: 8 }); pickAll(st, [1, 2]); let said = false, g = 0;
  while (st.phase === 'test' && g++ < 40) { for (const c of C.needs(st).slice()) { const V = C.view(st, c), x = C.ai(V, c, 'hard'); if (x.t === 'say') { said = true; ok(x.v === st.target || C.hyp(V, mul(1), 0).length > 1, '고급이 확신 없이 외침'); } C.apply(st, c, x); } }
  ok(said, '고급은 시험으로 규칙을 좁힌 뒤 외침');
}
// 8) 실력: 고급 > 보통 > 쉬움
{
  const N = QUICK ? 40 : 160;
  for (const [A, B, need] of [['hard', 'easy', 0.65]].concat(QUICK ? [] : [['hard', 'normal', 0.55]])) {
    let pair = 0, cnt = 0;
    for (const n of [2, 3]) for (let g = 0; g < N / 2; g++) {
      const hs = g % n, T = Array(n).fill(B); T[hs] = A;
      const st = playAI(101 + g * 13, T), Rk = C.ranks(st);
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += Rk[j] > Rk[hs] ? 1 : Rk[j] === Rk[hs] ? 0.5 : 0;
      pair += p / (n - 1); cnt++;
    }
    console.log(`· ${A} vs ${B} 짝 승률 ${(pair / cnt * 100).toFixed(0)}% (${cnt}판)`);
    ok(pair / cnt >= need, `${A} 이 ${B} 를 이김 ${(pair / cnt).toFixed(2)}`);
  }
}
// 9) AI 시간
{
  let mx = 0; const st = C.init({ n: 3, seed: 5 }), r = mul(5);
  for (let g = 0; g < 400 && !C.over(st); g++) { const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; } for (const s of nd) { if (!C.needs(st).includes(s)) continue; const V = C.view(st, s), t = process.hrtime.bigint(); const a = C.ai(V, s, 'hard', r); mx = Math.max(mx, Number(process.hrtime.bigint() - t) / 1e6); C.apply(st, s, a); } }
  ok(mx < 150, `고급 AI 한 번 최대 ${mx.toFixed(1)}ms < 150ms`);
}
console.log(`hiddencode selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

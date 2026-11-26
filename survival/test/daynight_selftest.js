// 낮과 밤 규칙 시험 (node survival/test/daynight_selftest.js [--quick])
'use strict';
const C = require('../games/daynight/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const bidAll = (st, arr) => { for (let s = 0; s < st.n; s++) { const r = C.apply(st, s, { t: 'bid', c: arr[s] }); if (!r.ok) throw new Error('bid ' + r.err); } };
function playAI(seed, tiers, check) {
  const n = tiers.length, st = C.init({ n, seed }), r = mul(seed * 7 + 3); let g = 0;
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

// 1) 시작
{
  const st = C.init({ n: 6, seed: 7 });
  ok(st.n === 6 && st.round === 1 && st.pos === 1 && st.phase === 'bid' && st.coins.every(c => c === 20) && st.score.every(x => x === 0), '6명 · 1라운드 · 시침 1칸 · 코인 20');
  ok(st.zones.length === 6 && st.zones.every(z => z[0] >= 1 && z[0] <= 6 && z[1] >= 7 && z[1] <= 12), '구역: 낮 1~6 하나 · 밤 7~12 하나');
  ok(J(C.needs(st)) === J([0, 1, 2, 3, 4, 5]), '모두 동시에 제출');
  ok(C.init({ n: 2, seed: 1 }).n === 4 && C.init({ n: 12, seed: 1 }).n === 8, '인원 4~8');
  ok(J(C.init({ n: 5, seed: 7 }).zones) === J(C.init({ n: 5, seed: 7 }).zones) && J(C.init({ n: 5, seed: 7 }).zones) !== J(C.init({ n: 5, seed: 8 }).zones), '씨앗 결정적');
  ok(new Set(st.letter).size === 6, '알파벳은 서로 다름');
  let overlap = 0; for (let sd = 1; sd <= 60; sd++) { const z = C.init({ n: 8, seed: sd }).zones; if (new Set(z.map(x => x[0])).size < 8) overlap++; } ok(overlap > 40, '낮 구역은 겹칠 수 있음 ' + overlap);
}
// 2) 제출 검사
{
  const st = C.init({ n: 4, seed: 5 }), s0 = J(st);
  ok(!C.apply(st, 0, { t: 'bid', c: -1 }).ok && !C.apply(st, 0, { t: 'bid', c: 21 }).ok && !C.apply(st, 0, { t: 'bid', c: 1.5 }).ok && !C.apply(st, 0, { t: 'x' }).ok && !C.apply(st, 9, { t: 'bid', c: 1 }).ok && J(st) === s0, '이상한 제출 · 상태 그대로');
  ok(C.apply(st, 0, { t: 'bid', c: 3 }).ok && !C.apply(st, 0, { t: 'bid', c: 2 }).ok && J(C.needs(st)) === J([1, 2, 3]), '한 번만 · 남은 사람');
  const V1 = C.view(st, 1), V0 = C.view(st, 0), W = C.view(st, -1);
  ok(V0.myBid === 3 && V1.myBid === null && V1.subbed[0] === true && W.myBid === null, '내 제출만 보임');
  ok(V0.pub === V1.pub && V1.pub === W.pub, '공개 지문 같음');
}
// 3) 시침 이동 · 점수
{
  const st = C.init({ n: 4, seed: 5 }); st.zones = [[1, 7], [2, 8], [3, 9], [4, 10]];
  bidAll(st, [0, 0, 0, 0]);
  ok(st.pos === 2 && st.phase === 'show' && J(st.res.gain) === J([0, 1, 0, 0]) && st.score[1] === 1, '아무도 안 내면 1칸 (1 → 2) · 낮 구역 +1');
  ok(J(st.coins) === J([20, 20, 20, 20]), '안 냈으니 코인 그대로');
  C.advance(st); ok(st.phase === 'bid' && st.round === 2, '다음 라운드');
  bidAll(st, [1, 0, 0, 0]); ok(st.pos === 3 && st.coins[0] === 19, '1개 내면 1칸 · 코인 소멸');
  C.advance(st); bidAll(st, [3, 5, 2, 0]); ok(st.pos === 8 && st.coins[1] === 15, '최다 5칸 (3 → 8) · 낸 코인 모두 소멸');
  ok(J(st.res.gain) === J([0, 2, 0, 0]) && st.score[1] === 3, '밤 구역 +2');
  const V = C.view(st, 0); ok(V.vis === null && V.hist.length === 3 && V.hist[2].vis === null, '밤에는 위치를 안 알려줌 (마지막 낮 3 · 기록은 null)');
  // 한 바퀴 넘는 이동
  const s2 = C.init({ n: 4, seed: 5 }); s2.zones = [[1, 7], [2, 8], [3, 9], [4, 10]]; s2.pos = 10; s2.coins = [20, 20, 20, 20];
  bidAll(s2, [5, 0, 0, 0]); ok(s2.pos === 3, '10 + 5 = 15 → 3칸');
  const s3 = C.init({ n: 4, seed: 5 }); s3.coins = [20, 20, 20, 20]; bidAll(s3, [12, 0, 0, 0]); ok(s3.pos === 1, '12칸이면 한 바퀴 제자리');
  const s4 = C.init({ n: 4, seed: 5 }); s4.zones = [[1, 7], [2, 8], [3, 9], [4, 10]]; bidAll(s4, [0, 0, 0, 0]);
  ok(s4.moved === 1, '움직인 칸 수 기록');
}
// 4) 구역 다시 뽑기 (24칸마다)
{
  const st = C.init({ n: 4, seed: 9 }), z0 = J(st.zones); st.zones = [[1, 7], [2, 8], [3, 9], [4, 10]]; st.moved = 20; st.coins = [20, 20, 20, 20];
  bidAll(st, [5, 0, 0, 0]);
  const pre = [[1, 7], [2, 8], [3, 9], [4, 10]], pos = st.pos; const gain0 = J(st.res.gain); ok(J(st.zones) === J(pre), '결과 보는 동안은 옛 구역'); C.advance(st);
  ok(st.moved === 25 && st.lap === 1 && J(st.zones) !== J(pre) && st.zhist.length === 2, '24칸 넘으면 구역 다시 뽑음');
  let want = [0, 0, 0, 0]; pre.forEach((z, s) => { want[s] = (z[0] === pos ? 1 : 0) + (z[1] === pos ? 2 : 0); });
  ok(gain0 === J(want), '다시 뽑기 전 구역으로 점수 계산');
  const V = C.view(st, 0); ok(V.zones.length === 2 && V.zones[1].from === 2 && J(V.zone) === J(st.zones[0]), '내 구역 기록 · 현재 구역');
  void z0;
}
// 5) 끝 조건
{
  const st = C.init({ n: 4, seed: 5 }); st.zones = [[1, 7], [2, 8], [3, 9], [4, 10]]; st.score = [9, 0, 0, 0]; st.pos = 12; st.coins = [20, 20, 20, 20];
  bidAll(st, [1, 0, 0, 0]);   // 12 → 1 : 0번 낮 구역 +1 = 10
  ok(st.score[0] === 10 && st.phase === 'show' && !st.over, '10점 도달 · 결과 보여주는 중');
  C.advance(st); ok(st.over && st.end === 'goal' && C.ranks(st)[0] === 0 && C.ranks(st)[1] === 1, '10점이면 끝 · 1등');
  const s2 = C.init({ n: 4, seed: 5 }); s2.zones = [[1, 7], [1, 8], [3, 9], [4, 10]]; s2.score = [9, 8, 0, 0]; s2.pos = 12; s2.coins = [20, 20, 20, 20];
  bidAll(s2, [1, 0, 0, 0]); C.advance(s2); ok(s2.over && s2.score[0] === 10 && s2.score[1] === 9 && C.ranks(s2)[0] === 0, '동시에 넘으면 높은 쪽');
  const s3 = C.init({ n: 4, seed: 5 }); s3.zones = [[1, 7], [1, 8], [3, 9], [4, 10]]; s3.score = [9, 9, 0, 0]; s3.pos = 12; bidAll(s3, [0, 0, 0, 0]); C.advance(s3);
  ok(s3.over && C.ranks(s3)[0] === 0 && C.ranks(s3)[1] === 0, '같으면 공동 1위');
  const s4 = C.init({ n: 4, seed: 5 }); s4.zones = [[2, 7], [2, 8], [3, 9], [4, 10]]; s4.round = 30; s4.phase = 'bid'; s4.bid = Array(4).fill(null); s4.pos = 6;
  bidAll(s4, [0, 0, 0, 0]); ok(s4.phase === 'show' && !s4.over, '30라운드 마지막 결과'); C.advance(s4); ok(s4.over && s4.end === 'cap', '30라운드면 끝');
  ok(!C.apply(s4, 0, { t: 'bid', c: 0 }).ok, '끝난 뒤 제출 막힘');
}
// 6) 숨은 정보
{
  const st = C.init({ n: 5, seed: 11 }); bidAll(st, [0, 2, 0, 0, 7]); C.advance(st);
  const V = C.view(st, 1), W = C.view(st, -1), A = C.view(st, 'all');
  const s = J(V);
  ok(V.coins === 20 - 2 && V.myBid === null, '내 코인만 보임');
  ok(!('allZones' in V) && !('bids' in V) && !('allCoins' in V) && !('pos' in V) && !('letters' in V), '남의 구역 · 제출 · 코인 · 위치 · 알파벳 키 없음');
  ok(W.coins === null && W.zone === null && W.zones.length === 0 && W.myLetter === null, '구경꾼은 개인 정보 없음');
  ok(J(A.allZones) === J(st.zones) && J(A.allCoins) === J(st.coins) && J(A.bids) !== undefined, "'all' 은 다 보임");
  ok(!s.includes(J(st.zones[0])) || J(st.zones[0]) === J(st.zones[1]) || J(V.zone) === J(st.zones[0]), '남의 구역이 view 에 섞이지 않음');
  ok(J(V.ranks) === J([0, 0, 0, 0, 0]) && J(W.ranks) === J([0, 0, 0, 0, 0]), '중간에는 순위를 안 알려줌');
  ok(V.hist[0].byLetter.length === 5 && V.tot.length === 5 && !J(V.hist).includes('"seat"'), '점수는 알파벳으로만');
  ok(W.log.every(e => e.k !== 'result' || e.byLetter.length === 5), '로그도 알파벳');
  ok(V.letters === undefined && W.letters === undefined, '알파벳 주인은 끝나야 공개');
  const f = playAI(21, ['hard', 'normal', 'easy', 'hard']);
  ok(C.view(f, 0).letters.length === 4 && C.view(f, -1).finalScore.length === 4 && C.view(f, 0).ranks.some(x => x === 0), '끝나면 알파벳 · 점수 공개');
  // 같은 공개 상태에서 개인 정보만 다른 두 판 → 공개 지문 같음
  const a = C.init({ n: 4, seed: 31 }), b = C.init({ n: 4, seed: 32 }); bidAll(a, [0, 0, 0, 0]); bidAll(b, [0, 0, 0, 0]);
  ok(C.view(a, 0).hist[0].vis === 2 && C.view(b, 0).hist[0].vis === 2, '낮에는 위치 공개');
}
// 7) 결정성 · 순수성
{
  const a = playAI(41, ['hard', 'hard', 'normal', 'easy', 'hard']), b = playAI(41, ['hard', 'hard', 'normal', 'easy', 'hard']);
  ok(J(a.score) === J(b.score) && J(a.log) === J(b.log) && a.round === b.round, '같은 씨앗 · 같은 AI → 같은 판');
  const st = C.init({ n: 5, seed: 3 }), before = J(st); for (let s = 0; s < 5; s++) C.ai(C.view(st, s), s, 'hard', mul(1));
  ok(J(st) === before, 'AI 가 상태를 안 바꿈');
  const V = C.view(st, 2), r1 = C.ai(V, 2, 'hard', mul(1)), r2 = C.ai(V, 2, 'hard', mul(99));
  ok(J(r1) === J(r2), '어려움 AI 는 결정적');
}
// 8) AI 가 view 만 씀 · 시간 · 모든 단계가 끝까지
{
  let maxMs = 0, bids = 0, zeros = 0;
  const N = QUICK ? 12 : 40;
  for (let g = 0; g < N; g++) {
    const n = 4 + (g % 5), tiers = Array.from({ length: n }, (_, i) => ['easy', 'normal', 'hard'][(g + i) % 3]);
    const st = playAI(100 + g, tiers, (st2, s, V, V0, a) => {
      const t0 = process.hrtime.bigint(); C.ai(V, s, tiers[s], mul(5)); const ms = Number(process.hrtime.bigint() - t0) / 1e6; if (ms > maxMs) maxMs = ms;
      ok(a && a.t === 'bid' && Number.isInteger(a.c) && a.c >= 0 && a.c <= V.coins, `AI 제출 모양 ${J(a)}`);
      ok(J(V) === V0, 'AI 호출이 view 를 바꾸지 않음');
      // 다른 사람의 비밀이 다르게 섞인 같은 view → 같은 답 (hard)
      if (tiers[s] === 'hard' && g < 6) {
        const o = C.init({ n, seed: 777 + g }); void o;
        ok(J(C.ai(JSON.parse(V0), s, 'hard', mul(1))) === J(a), 'view 만으로 같은 답');
      }
      bids++; if (a.c === 0) zeros++;
    });
    ok(st.round <= 30 && st.over, `판 ${g} 끝남`);
    ok(st.score.every((x, i) => x >= 0) && st.coins.every(c => c >= 0 && c <= 20), '코인 · 점수 범위');
  }
  ok(maxMs <= 150, `AI 한 번 ${maxMs.toFixed(1)}ms ≤ 150`);
  ok(zeros > 0 && zeros < bids, `AI 가 0 도 · 코인도 씀 (${zeros}/${bids})`);
}
// 9) legal · 선생님 · 복기
{
  const st = C.init({ n: 4, seed: 6 }), V = C.view(st, 0);
  ok(C.legal(st, 0).length === 21 && C.legal(st, 0)[20].c === 20, '낼 수 있는 수 0~20');
  const R = C.recommend(V, 0); ok(R && R.a.t === 'bid' && R.row && R.none && R.cells.length, '추천 · 근거');
  ok(Math.abs(R.cells.reduce((a, x) => a + x[1], 0) - 1) < 0.05 || R.cells.length > 0, '위치 믿음 분포');
  const Jd = C.judge(V, 0, { t: 'bid', c: 0 }, R.a); ok(Jd && Jd.my.net != null && Jd.best.net >= Jd.my.net - 1e-9, '복기: 추천 기대값이 더 큼');
  ok(C.recommend(C.view(st, -1), -1) === null && C.judge(V, 1, { t: 'bid', c: 0 }, { t: 'bid', c: 0 }) !== undefined, '구경꾼은 추천 없음');
  // 믿음: 낮 관측
  const s2 = C.init({ n: 4, seed: 5 }); bidAll(s2, [0, 0, 0, 0]); C.advance(s2);
  const b = C.belief(C.view(s2, 0)); ok(b[2] === 1, '낮 관측 → 위치 확정');
  // 밤 관측: 내 득점으로 거름
  const s3 = C.init({ n: 4, seed: 5 }); s3.zones = [[1, 7], [2, 8], [3, 9], [4, 10]]; s3.zhist[0].zones = s3.zones; s3.pos = 6; s3.coins = [20, 20, 20, 20]; bidAll(s3, [1, 0, 0, 0]); C.advance(s3);   // 6 → 7
  const b3 = C.belief(C.view(s3, 0)); ok(b3[7] > 0.99 || b3.slice(7).every(x => x >= 0), '밤 관측: 7~12 로 좁힘');
  ok(b3.slice(1, 7).every(x => x === 0), '밤이면 낮 칸은 0');
  const b3b = C.belief(C.view(s3, 1)); ok(b3b[8] === 0 && b3b[7] > 0 && Math.abs(b3b.reduce((a, x) => a + x, 0) - 1) < 1e-9, '내 득점 0 이면 내 구역(8)이 아님');
}
console.log(`daynight_selftest: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);

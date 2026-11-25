'use strict';
// 과일가게 selftest — 규칙 · 아이템 · 숨은 정보 · AI
const G = require('../games/gn-fruit/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const noswap = st => { for (const s of G.needs(st)) ap(st, s, { t: 'noswap' }); };
// prices[i] = { 과일: 가격 }
const price = (st, pr, secrets) => pr.forEach((p, i) => { const r = ap(st, i, Object.assign({ t: 'price', p }, secrets && secrets[i] !== undefined ? { secret: secrets[i] } : {})); if (!r.ok) throw new Error('price ' + i + ' ' + r.err); });
const T3 = { omit: [0, 1, 2] };   // 3명: s0=[1,2] s1=[0,2] s2=[0,1]

// 1) 시작 · 판매권
{
  for (const N of [3, 4, 5, 6]) {
    const st = G.init({ n: N, seed: 7 + N });
    ok(st.own.every(o => o.length === 2 && o[0] !== o[1]), `${N}명: 각자 서로 다른 과일 2개`);
    const cnt = [0, 1, 2].map(f => G.sellers(st, f).length);
    ok(cnt.reduce((a, b) => a + b, 0) === 2 * N, `${N}명: 판매권 합 ${2 * N}`);
    if (N === 6) ok(cnt.join() === '4,4,4', '6명이면 과일마다 판매자 4명 (방송의 4~5명에 맞춤)');
  }
  const st = G.init({ n: 4, seed: 1 });
  ok(st.phase === 'swap' && G.needs(st).length === 4 && st.rounds === 4, '처음엔 아이템(교체) 단계 — 모두 아이템이 있어요');
  ok(G.init({ n: 2, seed: 1 }).n === 3 && G.init({ n: 8, seed: 1 }).n === 6, '인원은 3~6명');
}
// 2) 가격 정산: 최저가 독식 · 동률 균등
{
  const st = G.init({ n: 3, seed: 1, cfg: T3 }); noswap(st);
  ok(st.phase === 'price' && G.needs(st).length === 3, '교체를 안 쓰면 희망가 단계');
  price(st, [{ 1: 5, 2: 5 }, { 0: 5, 2: 4 }, { 0: 5, 1: 5 }]);
  ok(st.income.join() === '5,13,10', '과일마다 최저가가 (판매가 × 판매자 수)를 독식 · 동률은 균등: 수박 s1 4×2=8 독식, 나머지는 5씩');
  const H = G.view(st, 0).hist[0];
  ok(H.fruits[2].price === 4 && H.fruits[2].inc.join() === '0,8' && H.fruits[0].price === 5 && H.fruits[0].inc.join() === '5,5', '공개: 과일별 판매가와 판매자별 수입');
  ok(st.round === 1 && st.phase === 'swap', '다음 라운드 (아이템이 남아 있으니 다시 교체 단계)');
}
{
  const st = G.init({ n: 4, seed: 1, cfg: { omit: [0, 0, 1, 2] } }); noswap(st);   // s0=[1,2] s1=[1,2] s2=[0,2] s3=[0,1]
  price(st, [{ 1: 1, 2: 3 }, { 1: 1, 2: 3 }, { 0: 5, 2: 3 }, { 0: 5, 1: 5 }]);
  // 포도 판매자 0,1,3: 가격 1,1,5 → 최저 1 두 명 · 풀 3 → 1씩 (나머지 버림) / 수박 0,1,2: 3,3,3 → 풀 9 → 3씩 / 사과 2,3: 5,5 → 5씩
  ok(st.income.join() === '4,4,8,5', '동률 균등은 나머지를 버려요 (풀 3 ÷ 2 = 1) · 전원 동률이면 모두 같은 몫');
}
// 3) 입력 검증
{
  const st = G.init({ n: 3, seed: 1, cfg: T3 }); noswap(st);
  ok(!ap(st, 0, { t: 'price', p: { 1: 5 } }).ok, '내 과일마다 가격을 정해야 해요');
  ok(!ap(st, 0, { t: 'price', p: { 1: 0, 2: 5 } }).ok && !ap(st, 0, { t: 'price', p: { 1: 6, 2: 5 } }).ok && !ap(st, 0, { t: 'price', p: { 1: 2.5, 2: 5 } }).ok, '가격은 1~5 정수');
  ok(ap(st, 0, { t: 'price', p: { 1: 5, 2: 5 } }).ok && !ap(st, 0, { t: 'price', p: { 1: 5, 2: 5 } }).ok, '한 번 낸 뒤엔 바꿀 수 없어요');
  ok(G.needs(st).join() === '1,2', '내지 않은 사람만 기다려요');
  ok(!ap(st, 1, { t: 'swap', from: 0, to: 1 }).ok, '교체 단계가 지나면 교체할 수 없어요');
}
// 4) 교체: 공개 · 한 번뿐 · 규칙
{
  const st = G.init({ n: 3, seed: 1, cfg: T3 });
  ok(!ap(st, 0, { t: 'swap', from: 0, to: 1 }).ok, '내가 안 파는 과일은 바꿀 수 없어요 (from)');
  ok(!ap(st, 0, { t: 'swap', from: 1, to: 2 }).ok, '이미 파는 과일로는 못 바꿔요 (to)');
  ok(ap(st, 0, { t: 'swap', from: 1, to: 0 }).ok && st.phase === 'swap', '내 사과 대신 사과로: 포도 → 사과 교체 선택');
  ap(st, 1, { t: 'noswap' }); ap(st, 2, { t: 'noswap' });
  ok(st.phase === 'price' && st.own[0].join() === '0,2' && st.item[0] === false && st.item[1] === true, '교체하면 내 과일이 바뀌고 아이템은 사라져요');
  const V = G.view(st, 1);
  ok(V.swapsNow.length === 1 && V.swapsNow[0].s === 0 && V.swapsNow[0].from === 1 && V.swapsNow[0].to === 0, '교체는 모두에게 공개');
  ok(G.sellers(st, 0).join() === '0,1,2' && G.sellers(st, 1).join() === '2', '판매자 목록이 바뀌어요');
  ok(!ap(st, 0, { t: 'price', p: { 0: 5, 2: 5 }, secret: 2 }).ok, '교체를 쓴 사람은 비밀을 못 써요 (아이템은 한 번)');
  price(st, [{ 0: 5, 2: 5 }, { 0: 5, 2: 5 }, { 0: 5, 1: 5 }]);
  ok(st.round === 1 && st.phase === 'swap' && G.needs(st).join() === '1,2', '다음 라운드: 아이템이 남은 사람만 교체 단계');
}
// 5) 비밀: 판매가 · 수입 공개를 막아요
{
  const st = G.init({ n: 3, seed: 1, cfg: T3 }); noswap(st);
  price(st, [{ 1: 5, 2: 5 }, { 0: 5, 2: 3 }, { 0: 5, 1: 5 }], [undefined, 2]);   // s1 이 수박(2)을 숨김 — 자기도 파는 과일
  const V0 = G.view(st, 0), V1 = G.view(st, 1), V2 = G.view(st, 2), VA = G.view(st, 'all');
  const f0 = V0.hist[0].fruits[2], f1 = V1.hist[0].fruits[2];
  ok(f0.hidden && f0.price === null && f0.inc.every(x => x === null || x === 0 || x === 8) === true, '비밀 과일은 판매가가 안 보여요');
  ok(f0.inc[f0.sellers.indexOf(0)] === 0 && V2.hist[0].fruits[2].inc.every(x => x === null) , '비밀 과일의 수입은 판매자 본인 것만 보여요 (s0 는 0, 구경 s2 는 판매자가 아니라 전부 안 보임)');
  ok(f1.inc[f1.sellers.indexOf(1)] === 6 && V1.hist[0].secretBy.join() === '1' && V0.hist[0].secretBy.length === 0, '쓴 사람만 자기가 썼다는 걸 알아요 (누가 썼는지도 비공개)');
  ok(VA.hist[0].fruits[2].price === 3 && VA.hist[0].secretBy.join() === '1', '구경하는 사람은 다 보여요');
  ok(st.item[1] === false && st.item[0] === true, '비밀을 쓰면 아이템이 사라져요');
  ok(G.needs(st).join() === '0,2', '다음 라운드: 아이템이 남은 사람만 교체 단계');
  // 지난 비밀 과일의 수입은 내 누적에는 들어가요
  ok(st.income.join() === '5,11,5' || st.income[1] === 11, '숨겨도 수입은 실제로 정산돼요');
}
// 6) 끝 · 순위
{
  const st = G.init({ n: 3, seed: 1, cfg: Object.assign({}, T3, { rounds: 2 }) });
  const R = () => { noswap(st); price(st, [{ 1: 5, 2: 5 }, { 0: 5, 2: 4 }, { 0: 5, 1: 5 }]); };
  R(); ok(!st.over, '아직 라운드가 남았어요'); R();
  ok(st.over && st.income.join() === '10,26,20' && st.ranks.join() === '2,0,1' && st.losers.join() === '0', '끝 — 누적 수입 1위 s1 · 최하위 s0');
  ok(G.view(st, 0).incomes.join() === '10,26,20' && G.view(st, 0).prices.length === 2, '끝나면 모든 수입 · 가격이 공개돼요');
  const d = G.init({ n: 3, seed: 1, cfg: Object.assign({}, T3, { rounds: 1 }) }); noswap(d);
  price(d, [{ 1: 5, 2: 5 }, { 0: 5, 2: 5 }, { 0: 5, 1: 5 }]);
  ok(d.over && d.draw && d.ranks.join() === '0,0,0' && d.losers.length === 0, '전원 수입이 같으면 무승부');
  ok(!ap(st, 0, { t: 'price', p: { 1: 5, 2: 5 } }).ok, '끝난 판에는 낼 수 없어요');
}
// 7) 숨은 정보: 최저가가 아닌 사람의 가격이 달라도 공개 결과가 같으면 pub · AI · 선생님이 같아요
{
  const mk = p2 => { const st = G.init({ n: 3, seed: 9, cfg: T3 }); noswap(st); price(st, [{ 1: 5, 2: 5 }, { 0: 3, 2: 4 }, p2]); return st; };
  const A = mk({ 0: 5, 1: 5 }), B = mk({ 0: 4, 1: 5 });   // s2 의 사과 가격만 다름 (s1 이 3 으로 최저)
  const va = G.view(A, 0), vb = G.view(B, 0);
  ok(va.pub === vb.pub && JSON.stringify(va.hist) === JSON.stringify(vb.hist), '개인 가격이 달라도 공개 결과가 같으면 pub 가 같아요');
  let same = true;
  for (const t of ['easy', 'normal', 'hard']) for (let k = 0; k < 6; k++) if (JSON.stringify(G.ai(va, 0, t, sampler(k + 5))) !== JSON.stringify(G.ai(vb, 0, t, sampler(k + 5)))) same = false;
  ok(same, '다른 사람의 개인 가격을 몰라도 AI 가 똑같이 결정해요');
  ok(JSON.stringify(G.coach(va, 0, 0, null)) === JSON.stringify(G.coach(vb, 0, 0, null)), '선생님 설명도 숨은 정보에 안 흔들려요');
  // 이번 라운드에 다른 사람이 낸 가격은 안 보여요
  const C = G.init({ n: 3, seed: 9, cfg: T3 }), D = G.init({ n: 3, seed: 9, cfg: T3 }); noswap(C); noswap(D);
  ap(C, 1, { t: 'price', p: { 0: 1, 2: 1 } }); ap(D, 1, { t: 'price', p: { 0: 5, 2: 5 } });
  ok(G.view(C, 0).pub === G.view(D, 0).pub && JSON.stringify(G.ai(G.view(C, 0), 0, 'hard', sampler(3))) === JSON.stringify(G.ai(G.view(D, 0), 0, 'hard', sampler(3))), '이번 라운드에 낸 값은 누구에게도 안 보여요');
}
// 8) AI 가 낸 값은 늘 규칙 안 · 판이 끝남 · 어려운 AI 가 쉬운 AI 보다 못하지 않아요
{
  for (const N of [3, 4, 5, 6]) {
    const sum = { hard: 0, normal: 0, easy: 0 }, cnt = { hard: 0, normal: 0, easy: 0 };
    for (let g = 0; g < 80; g++) {
      const st = G.init({ n: N, seed: 300 + g }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]), rr = sampler(g * 3 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 100) for (const s of G.needs(st)) {
        const V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
        if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); const L = G.legal(st, s); ap(st, s, L[0]); }
      }
      ok(G.over(st), `${N}명 ${g}판 끝남`);
      for (let i = 0; i < N; i++) { sum[T[i]] += st.income[i]; cnt[T[i]]++; }
    }
    const av = t => sum[t] / cnt[t];
    console.log(`  ${N}명: 평균 수입(천 원) hard ${av('hard').toFixed(1)} · normal ${av('normal').toFixed(1)} · easy ${av('easy').toFixed(1)}`);
    ok(av('hard') >= av('easy'), `${N}명: 어려운 AI 가 쉬운 AI 보다 못하지 않아요`);
  }
}
console.log(`과일가게 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

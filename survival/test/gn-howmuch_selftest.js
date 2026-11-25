// 하우머치 규칙 시험 (node survival/test/gn-howmuch_selftest.js)
// 방송 그랜드 파이널 11화 10라운드 표(최종 7 · 5 · 3점, 예산 합계) 재현 · 무효 규칙 · 정보 질문 · 숨은 정보 · AI 무작위 판
'use strict';
const G = require('../games/gn-howmuch/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };

// 방송 표: 라운드별 [오현민, 장동민, 김경훈] 제시가 · 최고가 · 승자 (좌석 0 · 1 · 2)
const TABLE = [
  [[1000000, 1000000, 999999], 1000000, 2],
  [[2100000, 2500000, 3000002], 2500000, 1],
  [[3000000, 10001000, 3000000], 15000000, 1],
  [[15000000, 1000, 15000000], 55000000, 1],
  [[25100001, 3000, 10004], 100000000, 0],
  [[1520001, 22000, 10000], 51000000, 0],
  [[26130001, 16500000, 1], 100000000, 0],
  [[49999999, 59280000, 46479995], 60000000, 1],
  [[1149053, 20000, 21526999], 100000000, 2],
  [[70000000, 99990000, 100000000], 100000000, 2],
];
const mkItems = () => TABLE.map((t, i) => ({ id: i, name: `상품 ${i + 1}`, prices: [t[1], Math.round(t[1] * 0.4), Math.round(t[1] * 0.1) + 1, 7, Math.round(t[1] * 0.7)] }));
const quick = (st, bidsRow, info) => {   // 정보 단계는 아무 질문으로 통과
  if (st.phase === 'info') for (let i = 0; i < st.n; i++) { const a = { t: 'info', kind: 'price', guest: 0 }; if (i === st.pubSeat) a.pub = { kind: 'rank', guest: 1 }; ap(st, i, a); }
  for (let i = 0; i < st.n; i++) ap(st, i, { t: 'bid', p: bidsRow[i] });
};

{
  const st = G.init({ n: 3, seed: 1, cfg: { items: mkItems() } });
  const won = [];
  for (let r = 0; r < 10; r++) {
    ok(st.round === r + 1, `${r + 1}라운드`);
    if (r === 9) ok(st.phase === 'bid', '10라운드는 정보 확인 없이 바로 제시');
    else ok(st.phase === 'info', `${r + 1}라운드는 정보 확인부터`);
    quick(st, TABLE[r][0]);
    ok(st.res.M === TABLE[r][1], `${r + 1}라운드 최고가 ${TABLE[r][1]}`);
    ok(st.res.winner === TABLE[r][2], `${r + 1}라운드 승자 ${TABLE[r][2]} (실제 ${st.res.winner})`);
    won.push(st.res.winner);
    G.advance(st);
  }
  ok(G.over(st), '10라운드 뒤 끝');
  ok(st.pts.join() === '3,5,7', `최종 승점 오현민 3 · 장동민 5 · 김경훈 7 (실제 ${st.pts.join()})`);
  ok(st.spent[0] === 194999055 && st.spent[1] === 189317000 && st.spent[2] === 190027000, '개인 예산 합계 (오현민 194,999,055 · 장동민 189,317,000 · 김경훈 190,027,000)');
  ok(G.ranks(st).join() === '2,1,0', '순위');
  const R1 = G.init({ n: 3, seed: 1, cfg: { items: mkItems() } }); quick(R1, TABLE[0][0]);
  ok(R1.res.dup.join() === 'true,true,false', '1라운드: 같은 값(오현민 · 장동민)은 서로 무효');
}
// 무효 규칙 · 득점 없음 · 10라운드 동점 규칙
{
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i % 10, name: `상품 ${i + 1}`, prices: [1000, 2000, 3000, 4000, 5000] }));   // 최고가 5000
  const st = G.init({ n: 3, seed: 2, cfg: { items } });
  quick(st, [5000, 5001, 4999]);               // 5001 은 M 초과 → 무효, 5000 이 최고
  ok(st.res.winner === 0 && st.res.over[1], 'M 과 같은 가격은 유효, 초과는 무효');
  G.advance(st); quick(st, [6000, 7000, 8000]);   // 전원 M 초과
  ok(st.res.winner === -1, '모두 M 초과면 득점 없음');
  G.advance(st); quick(st, [100, 100, 100]);
  ok(st.res.winner === -1 && st.res.dup.every(Boolean), '세 명 같은 가격이면 득점 없음');
  G.advance(st); quick(st, [300, 200, 300]);
  ok(st.res.winner === 1, '높은 값이 겹치면 그다음으로 높은 사람이 이김');
  const t2 = G.init({ n: 2, seed: 2, cfg: { items } }); quick(t2, [100, 100]);
  ok(t2.res.winner === -1, '2명이 같은 가격이면 득점 없음');
}
{
  // 10라운드 점수 4점 · 최종 동점이면 10라운드 승점자가 우승
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i % 10, name: `상품 ${i + 1}`, prices: [9000, 9000, 9000, 9000, 9000] }));
  const st = G.init({ n: 2, seed: 3, cfg: { items } });
  for (let r = 0; r < 10; r++) { quick(st, r < 9 ? [20, 10] : [10, 20]); G.advance(st); }
  ok(G.over(st) && st.pts.join() === '11,4' && st.last10 === 1, '좌석 0 이 1~9라운드(1×7 + 2 + 2 = 11점), 좌석 1 이 10라운드(4점)');
  ok(G.ranks(st).join() === '0,1', '점수가 많은 쪽이 우승');
  const a = G.init({ n: 2, seed: 3, cfg: { items } });
  a.pts = [4, 4]; a.last10 = 1; a.over = true;
  ok(G.ranks(a).join() === '1,0', '동점이면 10라운드 승점자가 우승');
  a.last10 = -1; ok(G.ranks(a).join() === '0,0', '10라운드 점수 없으면 동점');
}
// 점수표 · 정보 질문 · 순번
{
  ok(G.PTS.join() === '1,1,1,1,1,1,1,2,2,4' && G.PTS.reduce((a, b) => a + b, 0) === 15, '점수 1×7 · 2 · 2 · 4 (합 15)');
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i % 10, name: `상품 ${i + 1}`, prices: [8000, 3000, 8000, 1000, 5000] }));
  const st = G.init({ n: 3, seed: 4, cfg: { items } });
  ok(st.pubSeat === 0, '1라운드 공개정보 질문은 0번 좌석');
  ok(!G.apply(st, 0, { t: 'info', kind: 'price', guest: 0 }).ok, '공개정보 담당은 공개 질문도 골라야 함');
  ok(!G.apply(st, 1, { t: 'info', kind: 'bogus', guest: 0 }).ok && !G.apply(st, 1, { t: 'info', kind: 'rank', guest: 9 }).ok, '질문 종류 · 손님 검사');
  ap(st, 0, { t: 'info', kind: 'rank', guest: 0, pub: { kind: 'price', guest: 4 } });
  ap(st, 1, { t: 'info', kind: 'price', guest: 1 });
  ok(st.phase === 'info', '모두 정해야 다음 단계');
  ap(st, 2, { t: 'info', kind: 'rank', guest: 2 });
  ok(st.phase === 'bid' && st.pubAns.ans === 5000 && st.pubAns.guest === 4, '공개정보: 손님 5 가격 5000');
  ok(st.priv[0].ans === 1 && st.priv[2].ans === 1 && st.priv[1].ans === 3000, '순위 질문: 같은 값은 같은 순위 (8000 이 공동 1등) · 가격 질문');
  const v1 = G.view(st, 1), v0 = G.view(st, 0);
  ok(v1.priv.ans === 3000 && v0.priv.ans === 1 && v1.pubAns.ans === 5000 && v1.prices === null, '비공개정보는 내 것만 · 손님 가격표는 안 보임');
  ap(st, 0, { t: 'bid', p: 7000 }); ap(st, 1, { t: 'bid', p: 6000 }); ap(st, 2, { t: 'bid', p: 8000 });
  ok(st.res.winner === 2 && G.view(st, 0).res.M === 8000, '최고가 8000 · 가장 높은 값 승');
  G.advance(st);
  ok(st.round === 2 && st.pubSeat === 1, '2라운드 공개정보 담당은 1번 좌석');
}
// 예산
{
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i % 10, name: `상품 ${i + 1}`, prices: [1, 1, 1, 1, 1] }));
  const st = G.init({ n: 2, seed: 5, cfg: { items } });
  ok(G.bidMax(st, 0) === 200000000 - 9, '남은 9라운드에 1원씩은 남김');
  if (st.phase === 'info') for (let i = 0; i < 2; i++) { const a = { t: 'info', kind: 'price', guest: 0 }; if (i === st.pubSeat) a.pub = { kind: 'price', guest: 1 }; ap(st, i, a); }
  ok(!G.apply(st, 0, { t: 'bid', p: 0 }).ok, '0원 거절');
  ok(!G.apply(st, 0, { t: 'bid', p: 1.5 }).ok && !G.apply(st, 0, { t: 'bid', p: 200000000 }).ok, '소수 · 남은 예산 초과 거절');
  ap(st, 0, { t: 'bid', p: 1 }); ap(st, 1, { t: 'bid', p: 1 });
  ok(st.spent[0] === 1 && st.spent[1] === 1, '제시한 값이 예산에서 빠짐');
}
{
  const st = G.init({ n: 2, seed: 5, cfg: { items: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `상품 ${i + 1}`, prices: [9, 9, 9, 9, 9] })) } });
  st.spent[0] = 199999995; st.round = 5; st.phase = 'bid'; st.bids = [null, null];
  ok(G.bidMax(st, 0) === 200000000 - 199999995 - 5, '남은 예산 5 에서 남은 5라운드(이번 포함 6라운드 중 5라운드) 몫 1원씩 제외하면 0');
  ok(!G.apply(st, 0, { t: 'bid', p: 1000 }).ok, '남은 예산을 넘는 제시 거절');
}
// 생성: 상품 순서 · 합계 · 숨은 정보
{
  for (let s = 1; s <= 30; s++) {
    const st = G.init({ n: 3, seed: s * 977, cfg: {} });
    const sums = st.items.map(it => it.prices.reduce((a, b) => a + b, 0));
    ok(sums.every((x, i) => i === 0 || sums[i - 1] <= x), `상품은 게스트 합계가 낮은 순서 (${s})`);
    ok(st.items.every(it => it.prices.every(p => p >= 1 && p <= G.CAP)), '가격은 1원 ~ 1억');
    ok(st.guestTotal.every((t, g) => t === st.items.reduce((a, it) => a + it.prices[g], 0)), '손님별 합계 공개값');
    ok(new Set(st.items.map(it => it.id)).size === 10, '상품 10개');
  }
  const st = G.init({ n: 3, seed: 11, cfg: {} });
  const v = G.view(st, 0), va = G.view(st, 'all');
  ok(v.prices === null && v.priv === null && va.prices.length === 5, '손님 가격은 숨김 (구경꾼만 봄)');
  ok(G.view(st, 1).pub === v.pub && va.pub === v.pub, '공개 지문 같음');
}
// 선생님 · AI 는 손님 가격을 모른다 (같은 정보 · 다른 숨은 가격)
{
  // 손님별 합계(공개)는 같고, 이번 라운드 상품의 가격 배치만 다르게 (1번 상품과 2번 상품의 가격표를 맞바꿈)
  const base = Array.from({ length: 10 }, (_, i) => ({ id: i === 0 ? 3 : 4, name: `상품 ${i + 1}`, prices: [100000 + i * 10, 2000000, 30000 + i, 4000, 5000 * (i + 1)] }));
  const swapped = base.map(it => ({ id: it.id, name: it.name, prices: it.prices.slice() }));
  const t = swapped[0].prices; swapped[0].prices = swapped[1].prices; swapped[1].prices = t;
  const A = G.init({ n: 3, seed: 8, cfg: { items: base } }), B = G.init({ n: 3, seed: 8, cfg: { items: swapped } });
  ok(A.guestTotal.join() === B.guestTotal.join(), '손님 합계는 같음');
  const va = G.view(A, 1), vb = G.view(B, 1);
  ok(JSON.stringify(G.coach(va, 1, -1, ['가', '나', '다'])) === JSON.stringify(G.coach(vb, 1, -1, ['가', '나', '다'])), '숨은 가격이 달라도 정보 확인 전 선생님 글은 같다');
  ok(JSON.stringify(G.ai(va, 1, 'hard', () => 0.5)) === JSON.stringify(G.ai(vb, 1, 'hard', () => 0.5)), '정보 확인 전 AI 도 같은 수');
  // 정보 확인 뒤 (같은 질문 · 같은 답이 나오게 이번 라운드 손님 1 가격만 같게) 제시 단계에서도 숨은 가격에 영향 없음
  const C = G.init({ n: 3, seed: 8, cfg: { items: base } }), D = G.init({ n: 3, seed: 8, cfg: { items: swapped } });
  for (const st of [C, D]) { st.items[0].prices[0] = 777777; st.guestTotal = A.guestTotal.slice(); }
  for (const st of [C, D]) { ap(st, 0, { t: 'info', kind: 'price', guest: 0, pub: { kind: 'price', guest: 0 } }); ap(st, 1, { t: 'info', kind: 'price', guest: 0 }); ap(st, 2, { t: 'info', kind: 'price', guest: 0 }); }
  ok(G.view(C, 1).pubAns.ans === 777777 && G.view(D, 1).pubAns.ans === 777777, '같은 정보');
  ok(JSON.stringify(G.ai(G.view(C, 1), 1, 'hard', () => 0.5)) === JSON.stringify(G.ai(G.view(D, 1), 1, 'hard', () => 0.5)), '제시 단계 AI 도 숨은 가격(손님 2~5)을 모르고 같은 수');
  ok(JSON.stringify(G.coach(G.view(C, 1), 1, -1, null)) === JSON.stringify(G.coach(G.view(D, 1), 1, -1, null)), '제시 단계 선생님 글도 같다');
}
// AI 끼리 · 2 ~ 6명 · 합법 수 · 예산 · 끝까지
for (const tier of ['easy', 'normal', 'hard']) {
  let bad = 0, games = 0, tot = [0, 0], cnt = [0, 0], noScore = 0, rounds = 0, spentMax = 0;
  for (let s = 1; s <= 24; s++) {
    const n = 2 + (s % 5);
    const st = G.init({ n, seed: s * 6101, cfg: {} });
    const rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    let guard = 0;
    while (!G.over(st) && guard++ < 500) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const seat of need.slice()) {
        if (!G.needs(st).includes(seat)) continue;
        const r = G.apply(st, seat, G.ai(G.view(st, seat), seat, seat === 0 ? tier : 'normal', rr));
        if (!r.ok) { bad++; const L = G.legal(st, seat); if (L.length) G.apply(st, seat, L[0]); }
      }
      if (st.phase === 'reveal' && st.res && st.res.winner < 0) noScore++;
      if (st.phase === 'reveal') rounds++;
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    ok(st.spent.every(x => x <= G.BUDGET), '예산 2억 이하');
    spentMax = Math.max(spentMax, ...st.spent);
    ok(st.pts.reduce((a, b) => a + b, 0) <= 15, '승점 합 15 이하');
    games++; tot[0] += st.pts[0]; cnt[0] += 1; tot[1] += st.pts.slice(1).reduce((a, b) => a + b, 0) / (n - 1); cnt[1] += 1;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석0) 평균 승점 ${(tot[0] / cnt[0]).toFixed(2)} vs 중급 평균 ${(tot[1] / cnt[1]).toFixed(2)} · 득점 없는 라운드 ${noScore}/${rounds} · 최대 사용 예산 ${Math.round(spentMax / 1e6)}백만`);
}
console.log(`gn-howmuch selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

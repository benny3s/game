// 콰트로 규칙 시험 (node survival/test/gn-quattro_selftest.js)
// 카드 41장 구성 · 교환 규칙(1명 1번 · 오픈 카드 불가 · 판 a 마지막 카드 · 판 b 3명 · 엿보기) · 방송 결과 재현 · 0 카드 · 숨은 정보 · AI 무작위 판
'use strict';
const G = require('../games/gn-quattro/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
const R = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 8) / 16777216; }; };
const mk = G.mk;   // (색 0 빨강 · 1 파랑 · 2 노랑 · 3 초록, 숫자)

// 덱을 직접 정해서 시작: 후보 0 · 후보 1 의 손, 나머지는 순서대로 관전 플레이어 11명(3장씩)
function start(h0, h1, ver, first) {
  const used = new Set([...h0, ...h1]), rest = []; for (let i = 0; i < 41; i++) if (!used.has(i)) rest.push(i);
  return G.init({ n: 2, seed: 1, cfg: { ver, first: first === undefined ? 0 : first, deck: [...h0, ...h1, ...rest] } });
}
const openAll = (st, seat) => { for (let i = 0; i < 4; i++) if (!st.hands[seat][i].o) { if (st.turn !== seat) st.turn = seat; const r = G.apply(st, seat, { t: 'open', c: i }); if (!r.ok) return r; } return { ok: true }; };

// 1) 덱 · 시작
{
  const st = G.init({ n: 2, seed: 5, cfg: { ver: 'a' } });
  const all = [...st.hands.flat().map(x => x.c), ...st.guests.flat()];
  ok(all.length === 41 && new Set(all).size === 41, '카드 41장이 겹치지 않게 나눠짐');
  ok(st.hands.every(h => h.length === 4) && st.guests.length === 11 && st.guests.every(g => g.length === 3), '후보 4장씩 · 관전 플레이어 11명 3장씩');
  ok(all.filter(c => c === 0).length === 1 && G.col(0) === 4 && G.num(0) === 0, '검정 0 은 한 장');
  const cnt = {}; all.forEach(c => { if (c) { const k = G.col(c) + ':' + G.num(c); cnt[k] = (cnt[k] || 0) + 1; } });
  ok(Object.keys(cnt).length === 40 && Object.values(cnt).every(x => x === 1), '4색 × 1~10 = 40장');
  ok(G.needs(st).length === 1, '차례는 한 명');
}
// 2) 방송 결과 재현: 1화 (임윤선 34 vs 남휘종 33, 둘 다 콰트로 → 합이 큰 쪽)
{
  const A = [mk(0, 10), mk(3, 8), mk(1, 7), mk(2, 9)], B = [mk(3, 9), mk(0, 8), mk(2, 10), mk(1, 6)];
  ok(G.isQ(A) && G.isQ(B) && G.sumOf(A) === 34 && G.sumOf(B) === 33, '1화 방송 값: 둘 다 콰트로, 합 34 vs 33');
  const st = start(A, B, 'b');   // 0 = 임윤선
  ok(openAll(st, 0).ok && !st.over, '한 명이 다 열어도 상대가 남으면 안 끝나요');
  openAll(st, 1);
  ok(st.over && st.winner === 0 && st.why === 'sum' && G.ranks(st).join() === '0,1', '합이 큰 임윤선 승');
  ok(G.view(st, 1).hands[0].every(x => x.c !== null), '끝나면 둘의 카드가 모두 공개');
}
// 3) 결승 장면: 이상민 10·6·4·3 = 23 콰트로 vs 임요환 9·8·3·6 = 26 (콰트로 실패) → 이상민 승
{
  const lee = [mk(0, 10), mk(1, 6), mk(2, 4), mk(3, 3)], lim = [mk(0, 9), mk(0, 8), mk(1, 3), mk(3, 6)];
  ok(G.isQ(lee) && !G.isQ(lim) && G.sumOf(lee) === 23 && G.sumOf(lim) === 26, '결승 3회전: 이상민만 콰트로');
  const st = start(lee, lim, 'b'); openAll(st, 0); openAll(st, 1);
  ok(st.over && st.winner === 0 && st.why === 'one', '한 명만 콰트로면 합이 작아도 그쪽 승');
}
// 4) 판정: 합이 같으면 가장 큰 숫자 · 그것도 같으면 무승부 · 둘 다 못 하면 무승부
{
  const A = [mk(0, 10), mk(1, 1), mk(2, 3), mk(3, 4)], B = [mk(0, 6), mk(1, 9), mk(2, 2), mk(3, 1)];
  ok(G.sumOf(A) === 18 && G.sumOf(B) === 18 && G.isQ(A) && G.isQ(B), '시험 준비: 합 18 · 18');
  const st = start(A, B, 'b'); openAll(st, 0); openAll(st, 1);
  ok(st.winner === 0 && st.why === 'max', '합이 같으면 4장 중 가장 큰 숫자(10 vs 9)가 큰 쪽');
  const C = [mk(0, 5), mk(1, 5), mk(2, 5), mk(3, 5)], D = [mk(0, 1), mk(0, 2), mk(1, 1), mk(1, 2)];
  const s2 = start(C, D, 'b'); openAll(s2, 0); openAll(s2, 1);
  ok(s2.over && s2.draw && G.ranks(s2).join() === '0,0' && s2.winner === -1, '둘 다 콰트로가 아니면 무승부');
  const E = [mk(0, 7), mk(1, 8), mk(2, 9), mk(3, 10)], F = [mk(0, 1), mk(1, 2), mk(2, 3), mk(3, 4)];
  const s3 = start(E, F, 'b'); openAll(s3, 0); openAll(s3, 1);
  ok(s3.winner === 0 && G.sumOf(E) === 34, '최대 합 34 (7 · 8 · 9 · 10) 콰트로');
}
// 5) 0 카드: 판 a 는 오픈하면 즉시 패 · 판 b 는 정상 카드(검정 한 장)
{
  const A = [0, mk(1, 5), mk(2, 7), mk(3, 9)], B = [mk(0, 3), mk(1, 1), mk(2, 2), mk(3, 4)];
  const sa = start(A, B, 'a');
  ok(ap(sa, 0, { t: 'open', c: 1 }).ok && !sa.over, '0 이 아닌 카드는 마음대로 열어요');
  sa.turn = 0; ap(sa, 0, { t: 'open', c: 0 });
  ok(sa.over && sa.winner === 1 && sa.why === 'zero' && sa.loser === 0, '판 a: 0 을 오픈하면 상대 콰트로 여부와 상관없이 즉시 패');
  const sb = start(A, B, 'b');
  ok(G.isQ([mk(0, 5), mk(1, 7), mk(2, 9), 0]), '서로 다른 색 · 숫자 3장 + 검정 0 은 콰트로');
  const A2 = [0, mk(1, 5), mk(2, 7), mk(3, 9)];
  openAll(sb, 0); openAll(sb, 1);
  ok(sb.over && sb.winner === 0 && sb.why === 'sum' && G.sumOf(A2) === 21, '판 b: 0 이 열려도 즉시 패가 아니고 콰트로로 인정 (합 21 vs 10 → 승)');
}
// 6) 교환 규칙
{
  const A = [mk(0, 5), mk(1, 6), mk(2, 7), mk(3, 8)], B = [mk(0, 1), mk(1, 2), mk(2, 3), mk(3, 4)];
  const st = start(A, B, 'b');
  ok(!G.apply(st, 0, { t: 'swap', g: 0, c: 0 }).ok, '카드를 1장 오픈해야 교환할 수 있어요');
  ok(!G.apply(st, 1, { t: 'open', c: 0 }).ok, '내 차례가 아니면 못 해요');
  ap(st, 0, { t: 'open', c: 3 });   // 0번이 초록 8 오픈 → 차례는 1번
  ok(st.turn === 1, '한 가지를 하면 차례가 넘어가요');
  ap(st, 1, { t: 'open', c: 3 });
  const g0 = st.guests[0].slice();
  ok(!G.apply(st, 0, { t: 'swap', g: 0, c: 3 }).ok, '오픈한 카드는 교환할 수 없어요');
  const r = ap(st, 0, { t: 'swap', g: 0, c: 0 });
  ok(r.ok && g0.includes(r.got) && st.hands[0][0].c === r.got && !st.hands[0][0].o, '관전 플레이어 3장 중 한 장을 받고, 받은 카드는 안 열린 상태');
  ok(st.guests[0].includes(A[0]) && !st.guests[0].includes(r.got), '관전 플레이어는 내가 준 카드를 가져요');
  ok(st.gex[0][0] && st.nEx[0] === 1 && !st.gex[1][0], '교환 기록은 후보마다 따로');
  ap(st, 1, { t: 'swap', g: 5, c: 0 });
  ok(!G.apply(st, 0, { t: 'swap', g: 0, c: 1 }).ok, '한 관전 플레이어와는 한 번만 교환');
  ap(st, 0, { t: 'swap', g: 1, c: 1 }); ap(st, 1, { t: 'swap', g: 6, c: 1 });
  ap(st, 0, { t: 'swap', g: 2, c: 2 }); ap(st, 1, { t: 'swap', g: 7, c: 2 });
  ok(st.nEx[0] === 3, '판 b: 교환 3번');
  ok(!G.apply(st, 0, { t: 'swap', g: 3, c: 0 }).ok, '판 b: 교환은 최대 3명까지');
  // 교환한 카드가 합쳐도 41장 보존
  const all = [...st.hands.flat().map(x => x.c), ...st.guests.flat()];
  ok(all.length === 41 && new Set(all).size === 41, '교환 후에도 카드 41장이 그대로');
}
// 7) 엿보기 (판 b): 한 번 · 차례를 쓰지 않아요 · 판 a 에선 없음
{
  const st = G.init({ n: 2, seed: 9, cfg: { ver: 'b', first: 0 } });
  ok(!G.view(st, 0).peeked, '처음엔 엿본 것이 없어요');
  ok(ap(st, 0, { t: 'peek', g: 4 }).ok && st.turn === 0, '엿보기는 차례를 쓰지 않아요');
  const V = G.view(st, 0); ok(V.peeked && V.peeked.g === 4 && V.peeked.cards.join() === st.guests[4].join(), '엿본 3장이 보여요');
  ok(G.view(st, 1).peeked === null, '상대는 내가 엿본 카드를 몰라요');
  ok(!G.apply(st, 0, { t: 'peek', g: 5 }).ok, '엿보기는 한 번뿐');
  const sa = G.init({ n: 2, seed: 9, cfg: { ver: 'a', first: 0 } });
  ok(!G.apply(sa, 0, { t: 'peek', g: 0 }).ok, '판 a 에는 엿보기가 없어요');
}
// 8) 판 a: 마지막 카드는 11명과 모두 교환한 뒤에야 열 수 있어요
{
  const A = [mk(0, 5), mk(1, 6), mk(2, 7), mk(3, 8)], B = [mk(0, 1), mk(1, 2), mk(2, 3), mk(3, 4)];
  const st = start(A, B, 'a');
  ap(st, 0, { t: 'open', c: 0 }); st.turn = 0; ap(st, 0, { t: 'open', c: 1 }); st.turn = 0; ap(st, 0, { t: 'open', c: 2 });
  st.turn = 0;
  const e = G.apply(st, 0, { t: 'open', c: 3 }); ok(!e.ok && e.err.includes('11명'), '교환이 끝나기 전에는 마지막 카드를 못 열어요');
  for (let g = 0; g < 11; g++) { st.turn = 0; const r = G.apply(st, 0, { t: 'swap', g, c: 3 }); if (!r.ok) { ok(false, `판 a 교환 ${g}: ${r.err}`); break; } }
  ok(st.nEx[0] === 11, '11명 모두와 교환');
  st.turn = 0; ok(!G.apply(st, 0, { t: 'swap', g: 0, c: 3 }).ok, '더 교환할 사람도 없음');
  const L = G.legal(st, 0); ok(L.length === 1 && L[0].t === 'open', '이제 마지막 카드를 열 수 있어요');
  const c = st.hands[0][3].c; st.turn = 0; ap(st, 0, { t: 'open', c: 3 });
  ok(st.hands[0].every(x => x.o) && c !== undefined, '4장 모두 오픈');
}
// 9) 숨은 정보: 상대의 안 연 카드 · 관전 플레이어의 손이 달라도 내 시점 · AI · 선생님은 같아요
{
  const A = [mk(0, 5), mk(1, 6), mk(2, 7), mk(3, 8)];
  const sa = start(A, [mk(0, 1), mk(1, 2), mk(2, 3), mk(3, 4)], 'b'), sb = start(A, [mk(0, 10), mk(1, 9), mk(2, 8), mk(3, 3)], 'b');
  ok(G.view(sa, 0).pub === G.view(sb, 0).pub, '상대가 안 연 카드가 달라도 공개 지문이 같아요');
  ok(G.view(sa, 0).opp.every(x => x.c === null), '상대의 안 연 카드는 안 보여요');
  ok(G.view(sa, 0).hands === null && G.view(sa, -1).hands !== null, '끝나기 전엔 전체 공개는 구경 시점에만');
  for (const tier of ['easy', 'normal', 'hard']) {
    const x = G.ai(G.view(sa, 0), 0, tier, R(4)), y = G.ai(G.view(sb, 0), 0, tier, R(4));
    ok(JSON.stringify(x) === JSON.stringify(y), `${tier} AI 는 상대 · 관전 플레이어의 안 보이는 카드를 몰라요`);
  }
  const ca = G.coach(G.view(sa, 0), 0, 0, null), cb = G.coach(G.view(sb, 0), 0, 0, null);
  ok(JSON.stringify(ca) === JSON.stringify(cb), 'AI 선생님도 안 보이는 카드를 쓰지 않아요');
  ok(ca.opp.length > 2 && ca.mine.length > 2 && ca.rec.length > 2, '선생님 말이 비어 있지 않아요');
}
// 10) 무작위 판: 두 판 모두 끝까지 · 카드 보존 · AI 가 막히지 않음 · 단계별 실력
{
  for (const ver of ['a', 'b']) {
    const wins = { hard: 0, easy: 0 }, draws = { n: 0 };
    for (let g = 0; g < 60; g++) {
      const rr = R(g * 5 + 1), st = G.init({ n: 2, seed: 300 + g, cfg: { ver, first: g % 2 } }), tiers = g % 2 ? ['hard', 'easy'] : ['easy', 'hard'];
      let guard = 0;
      while (!G.over(st) && guard++ < 400) {
        const seat = G.needs(st)[0], V = G.view(st, seat), a = G.ai(V, seat, tiers[seat], rr);
        let r = a ? G.apply(st, seat, a) : { ok: false };
        if (!r.ok) { ok(false, `AI 거절 ${ver} ${g} ${JSON.stringify(a)} ${r.err}`); const L = G.legal(st, seat); if (!L.length) break; G.apply(st, seat, L[0]); }
        const all = [...st.hands.flat().map(x => x.c), ...st.guests.flat()];
        if (new Set(all).size !== 41) { ok(false, '카드 보존 깨짐'); break; }
      }
      ok(G.over(st), `${ver}판 ${g} 끝남`);
      if (st.draw) draws.n++; else wins[tiers[st.winner]]++;
    }
    console.log(`  판 ${ver} 60판: 승 hard ${wins.hard} / easy ${wins.easy} · 무승부 ${draws.n}`);
    ok(wins.hard >= wins.easy, `판 ${ver}: 어려운 AI 가 쉬운 AI 보다 못하지 않아요`);
  }
}
console.log(`콰트로 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

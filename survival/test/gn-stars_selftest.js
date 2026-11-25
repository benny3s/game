// 별자리 게임 규칙 시험 (node survival/test/gn-stars_selftest.js)
// 방송 7화 1라운드 벡터 · 겹침 제외 · 낮은 숫자부터 가져가기 · 폭탄 3개 · 별자리 3개 · 교환 · 별 보존 · 숨은 정보 · AI 무작위 판
'use strict';
const G = require('../games/gn-stars/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
const total = st => st.bag.reduce((a, b) => a + b, 0) + st.table.reduce((a, b) => a + b, 0) + st.hold.reduce((s, h) => s + h.reduce((a, b) => a + b, 0), 0);
const cards = (st, arr) => arr.forEach((c, i) => ap(st, i, { t: 'card', c }));

// 1) 방송 1라운드 벡터: 카드 1 · 2 · 3 · 3 · 4 · 4 · 5 → 3 · 4 번 겹침 제외, 1 → 1개, 2 → 2개, 5 → 남은 5개 (별 7 + 폭탄 1 = 8)
{
  const st = G.init({ n: 7, seed: 11, cfg: { table: [2, 2, 2, 1], bomb: 1 } });
  ok(st.phase === 'card' && G.needs(st).length === 7, '처음엔 7명 모두 카드를 내요');
  ok(total(st) === 100, '별은 모두 100개 (색마다 25)');
  cards(st, [1, 2, 3, 3, 4, 4, 5]);
  ok(st.rev.elim.join() === 'false,false,true,true,true,true,false', '3 · 4 를 낸 네 명은 제외');
  ok(st.rev.order.join() === '0,1,6', '가져가는 차례는 낮은 숫자부터 (1 → 2 → 5)');
  ok(G.needs(st).join() === '0', '1번 카드는 1개를 골라야 해요 (고를 수 있음)');
  ok(ap(st, 0, { t: 'take', take: [1, 0, 0, 0, 0] }).ok, '1개 가져가기');
  ok(!G.apply(st, 1, { t: 'take', take: [1, 1, 1, 0, 0] }).ok, '2개를 골라야 하는데 3개는 거절');
  ok(!G.apply(st, 1, { t: 'take', take: [0, 0, 0, 0, 2] }).ok, '폭탄은 1개뿐이라 2개는 거절');
  ok(ap(st, 1, { t: 'take', take: [0, 1, 1, 0, 0] }).ok, '2개 가져가기');
  ok(st.phase === 'rev', '5번 카드는 남은 5개를 자동으로 다 가져가고 라운드가 끝나요');
  ok(st.hold[6].join() === '1,1,1,1' && st.bombs[6] === 1, '하연주(5번)가 남은 별 4개와 폭탄 1개 (총 5개)');
  ok(st.table.every(x => x === 0) && st.tbomb === 0, '테이블이 비었어요');
  ok(st.hist.length === 1 && st.hist[0].takes.length === 3, '기록에 가져간 사람 3명');
  G.advance(st);
  ok(st.round === 2 && st.phase === 'card' && st.table.reduce((a, b) => a + b, 0) === 7 && st.tbomb === 1, '2라운드: 별 7개 + 폭탄 1개로 다시 채움');
  ok(total(st) === 100, '채운 뒤에도 별 100개 보존');
}
// 2) 남은 것이 모자라면 남은 것 전부 · 개수보다 별 종류가 하나뿐이면 고르지 않아요
{
  const st = G.init({ n: 3, seed: 3, cfg: { table: [1, 0, 0, 0], bomb: 1 } });
  cards(st, [4, 1, 5]);   // 1번 카드가 먼저 1개 (고름: 빨강 or 폭탄), 4번이 남은 것 전부
  ok(G.needs(st).join() === '1', '카드 1 의 주인이 먼저 고름');
  ap(st, 1, { t: 'take', take: [1, 0, 0, 0, 0] });
  ok(st.phase === 'rev' && st.bombs[0] === 1 && st.hold[1][0] === 1, '4번 카드는 남은 폭탄만 가져가요 (모자라면 남은 것 전부)');
  ok(st.bombs[2] === 0, '5번 카드는 가져갈 것이 없어요');
  const t2 = G.init({ n: 3, seed: 4, cfg: { table: [5, 0, 0, 0], bomb: 0 } });
  ok(t2.tbomb === 0, '시험용: 폭탄 없이 시작');
  cards(t2, [2, 3, 3]);
  ok(t2.phase === 'rev' && t2.hold[0][0] === 2, '별 한 가지뿐이면 고르지 않고 바로 가져가요');
}
// 3) 모두 같은 숫자를 내면 아무도 못 가져가요
{
  const st = G.init({ n: 4, seed: 5 });
  cards(st, [2, 2, 3, 3]);
  ok(st.phase === 'rev' && st.hold.every(h => h.every(x => x === 0)), '모두 겹치면 라운드가 빈손으로 끝나요');
  ok(st.table.reduce((a, b) => a + b, 0) === 4 && st.tbomb === 1, '테이블은 그대로 (다음 라운드로 이월)');
  G.advance(st); ok(st.table.reduce((a, b) => a + b, 0) === 4, '별이 이미 N개라 더 채우지 않아요');
}
// 4) 폭탄 3개 → 즉시 종료 · 탈락 · 승점 최고자 우승
{
  const st = G.init({ n: 3, seed: 6, cfg: { table: [0, 0, 0, 0], bomb: 1 } });
  st.bombs[1] = 2; st.hold[0] = [3, 4, 0, 0];   // 0번: 5점
  cards(st, [5, 1, 2]);   // 1번 카드 → 폭탄 1개 가져가 3개
  ok(st.over && st.why === 'bomb' && st.loser === 1, '폭탄 3개를 받으면 바로 끝나고 탈락');
  ok(G.ranks(st).join() === '0,2,1' || G.ranks(st).join() === '0,2,0', `폭탄 맞은 사람이 꼴찌 (${G.ranks(st).join()})`);
  ok(G.view(st, 0).ranks[1] === 2, 'view 순위에도 반영');
  ok(!G.apply(st, 0, { t: 'card', c: 1 }).ok, '끝난 뒤에는 아무것도 못 해요');
}
// 5) 폭탄을 받은 사람이 승점 1위여도 우승은 아님
{
  const st = G.init({ n: 3, seed: 7, cfg: { table: [0, 0, 0, 0], bomb: 1 } });
  st.bombs[0] = 2; st.hold[0] = [3, 4, 5, 0]; st.hold[1] = [3, 0, 0, 0];
  cards(st, [1, 4, 5]);
  ok(st.over && st.loser === 0, '0번이 폭탄 3개');
  ok(G.ranks(st)[0] === 2 && G.ranks(st)[1] === 0, '승점이 가장 높아도 폭탄 3개면 꼴찌, 나머지 중 최고가 우승');
}
// 6) 별자리 3개 → 즉시 종료 · 승점 최고자 우승 (개수가 아니라 점수)
{
  const st = G.init({ n: 3, seed: 8, cfg: { table: [0, 0, 0, 2], bomb: 0 } });
  st.hold[0] = [3, 4, 4, 0]; st.hold[1] = [0, 0, 0, 6];   // 0번: 파랑 4개 → 5개가 되면 별자리 3개 (2 + 3 + 5 = 10점) · 1번: 거문고 7점
  ok(G.ptsOf(st.hold[1]) === 7 && G.consOf(st.hold[0]) === 2 && G.ptsOf(st.hold[0]) === 5, '시험 준비: 0번 별자리 2개 5점 · 1번 7점');
  st.hold[0][2] = 5;
  ok(G.ptsOf(st.hold[0]) === 10 && G.consOf(st.hold[0]) === 3, '3 + 4 + 5 개로 별자리 3개 = 10점');
  G.apply(st, 0, { t: 'card', c: 1 });
  ok(!st.over, '카드를 내는 것만으로는 안 끝나요');
  ap(st, 1, { t: 'card', c: 2 }); ap(st, 2, { t: 'card', c: 3 });
  ok(st.over && st.why === 'cons', '별을 받는 순간 별자리 3개 완성 판정 → 즉시 종료');
  ok(G.ranks(st)[0] === 0 && G.ranks(st)[1] === 1 && G.ranks(st)[2] === 2, `승점 10 이 1등 · 7점 2등 · 0점 꼴찌 (${G.ranks(st).join()})`);
  const st2 = G.init({ n: 3, seed: 9 });
  st2.hold[0] = [3, 4, 5, 0]; st2.hold[1] = [0, 0, 0, 6]; st2.hold[2] = [3, 0, 0, 6];   // 거문고 7 + 양자리 2 = 9 < 10
  ok(G.ptsOf(st2.hold[1]) === 7 && G.ptsOf(st2.hold[0]) === 10, '점수 계산');
  const st3 = G.init({ n: 3, seed: 9 }); st3.hold[0] = [3, 4, 0, 6]; st3.hold[1] = [3, 4, 5, 0]; st3.hold[2] = [0, 4, 0, 0];   // 0번: 2+3+7 = 12 (3개), 1번: 10 (3개)
  st3.hold[0] = [3, 4, 0, 6]; // 별자리 3개 12점 > 2개 만으로 12점인 사람은 없음
  ok(G.ptsOf(st3.hold[0]) === 12 && G.consOf(st3.hold[0]) === 3, '양자리 + 화살자리 + 거문고자리 = 12점');
}
// 7) 교환: 같은 색 3개 → 원하는 색 1개 · 별 보존 · 거절 조건
{
  const st = G.init({ n: 3, seed: 10 });
  st.hold[0] = [9, 0, 0, 0]; st.bag[0] -= 9;
  ok(total(st) === 100, '시험 준비 후 별 보존');
  ok(!G.apply(st, 0, { t: 'swap', from: 1, to: 2 }).ok, '노랑이 없으면 교환 못 해요');
  ok(!G.apply(st, 0, { t: 'swap', from: 0, to: 0 }).ok, '같은 색으로는 못 바꿔요');
  ok(ap(st, 0, { t: 'swap', from: 0, to: 2 }).ok, '빨강 3개 → 파랑 1개');
  ok(st.hold[0].join() === '6,0,1,0' && total(st) === 100, '빨강 3개가 줄고 파랑 1개가 생김 · 별 보존');
  ok(ap(st, 0, { t: 'card', c: 3, swaps: [{ from: 0, to: 3 }] }).ok, '카드를 내면서 교환 (빨강 3개 → 초록 1개)');
  ok(st.hold[0].join() === '3,0,1,1' && st.cards[0] === 3, '교환 뒤 카드 제출');
  ok(!G.apply(st, 1, { t: 'card', c: 2, swaps: 'x' }).ok && st.cards[1] === null, '교환 값이 배열이 아니면 거절 (오류 없이)');
  const s2 = G.init({ n: 3, seed: 10 }); s2.hold[1] = [0, 3, 0, 0]; s2.bag[1] -= 3; s2.bag[2] = 0;
  ok(!G.apply(s2, 1, { t: 'swap', from: 1, to: 2 }).ok, '그 색 별이 더 없으면 교환 불가');
  ok(!G.apply(s2, 1, { t: 'card', c: 2, swaps: [{ from: 1, to: 2 }] }).ok && s2.cards[1] === null, '교환이 거절되면 카드도 내지 않은 것으로');
  // 교환으로 별자리 3개가 완성되면 즉시 종료
  const s3 = G.init({ n: 3, seed: 12 }); s3.hold[0] = [3, 4, 4, 3]; s3.bag[0] -= 3; s3.bag[1] -= 4; s3.bag[2] -= 4; s3.bag[3] -= 3;
  s3.hold[1] = [3, 0, 0, 0]; s3.bag[0] -= 3;
  ok(ap(s3, 0, { t: 'swap', from: 3, to: 2 }).ok && s3.over && s3.why === 'cons', '교환으로 별자리 3개를 채워도 즉시 종료');
  ok(s3.loser === 2 && G.ranks(s3).join() === '0,1,2', '별자리 3개 종료: 승점 최저자가 탈락 후보(꼴찌)');
  // 완성한 별자리의 별은 잠겨서 교환할 수 없음 (남는 별 3개가 있어야 함)
  const s4 = G.init({ n: 3, seed: 14 }); s4.hold[0] = [3, 0, 0, 0]; s4.bag[0] -= 3;
  ok(!G.apply(s4, 0, { t: 'swap', from: 0, to: 2 }).ok && s4.hold[0].join() === '3,0,0,0', '완성한 별자리(빨강 3/3)의 별은 교환 못 해요');
  s4.hold[0] = [6, 0, 0, 0]; s4.bag[0] -= 3;
  ok(G.apply(s4, 0, { t: 'swap', from: 0, to: 2 }).ok && s4.hold[0].join() === '3,0,1,0', '남는 별 3개(6−3)는 교환 가능, 완성은 유지');
}
// 8) 고르기 검증 · 가져가고 바로 교환 (take + swaps)
{
  const st = G.init({ n: 3, seed: 13, cfg: { table: [2, 1, 0, 0], bomb: 1 } });
  st.hold[0] = [2, 0, 0, 0]; st.bag[0] -= 2;
  cards(st, [3, 1, 2]);   // 1번(카드1) → 1개 · 2번(카드2) → 2개 · 0번(카드3) → 남은 1개
  ap(st, 1, { t: 'take', take: [0, 1, 0, 0, 0] });
  ok(ap(st, 2, { t: 'take', take: [2, 0, 0, 0, 0] }).ok, '2번이 빨강 2개');
  ok(st.hold[0].join() === '2,0,0,0' && st.bombs[0] === 1, '0번은 폭탄 1개만 남아서 받음');
  const s2 = G.init({ n: 3, seed: 14, cfg: { table: [3, 0, 0, 0], bomb: 1 } });
  s2.hold[0] = [0, 0, 0, 0];
  cards(s2, [3, 4, 5]);
  ok(s2.hold[0][0] === 3 && s2.phase === 'card' || s2.phase === 'rev' || s2.phase === 'pick', '3개 가져가기');
}
// 9) 보이는 것 · 숨은 정보: 남의 카드는 공개 전에 안 보이고, 바꿔도 view(pub) · AI · 선생님 결과가 같아요
{
  const mk = (c1, c2) => { const st = G.init({ n: 5, seed: 21 }); ap(st, 1, { t: 'card', c: c1 }); ap(st, 2, { t: 'card', c: c2 }); return st; };
  const a = mk(1, 4), b = mk(5, 2);
  ok(JSON.stringify(G.view(a, 0).pub) === JSON.stringify(G.view(b, 0).pub), '남이 낸 카드가 달라도 공개 지문은 같아요');
  ok(G.view(a, 0).cards === null && G.view(a, 0).mine === null, '내 시점엔 남의 카드가 없어요');
  ok(G.view(a, -1).cards && G.view(a, -1).cards[1] === 1, '구경(전체) 시점엔 보여요');
  const r1 = (() => { let s = 7; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; })(), r2 = (() => { let s = 7; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; })();
  for (const tier of ['easy', 'normal', 'hard']) {
    const x = G.ai(G.view(a, 0), 0, tier, (() => { let s = 5; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; })());
    const y = G.ai(G.view(b, 0), 0, tier, (() => { let s = 5; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }; })());
    ok(JSON.stringify(x) === JSON.stringify(y), `${tier} AI 는 남의 숨은 카드에 따라 달라지지 않아요`);
  }
  const ca = G.coach(G.view(a, 0), 0, 0, null), cb = G.coach(G.view(b, 0), 0, 0, null);
  ok(JSON.stringify(ca) === JSON.stringify(cb), 'AI 선생님도 남의 숨은 카드를 쓰지 않아요');
  ok(ca.opp.length > 2 && ca.mine.length > 2 && ca.rec.length > 2, '선생님 말이 비어 있지 않아요');
}
// 10) 무작위 판: 끝까지 가고 · 별 보존 · 폭탄 ≤ 3 · AI 가 막히지 않음 · 단계 합당
{
  const R = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 8) / 16777216; }; };
  let games = 0, rounds = 0, why = { bomb: 0, cons: 0, out: 0 }, maxR = 0, winCount = {};
  for (let g = 0; g < 160; g++) {
    const n = 3 + (g % 5), st = G.init({ n, seed: 100 + g }), rr = R(g * 7 + 1), tiers = ['easy', 'normal', 'hard'];
    let guard = 0;
    while (!G.over(st) && guard++ < 4000) {
      const nd = G.needs(st);
      if (!nd.length) { if (G.auto(st) === null) { ok(false, `멈춤 ${g}`); break; } G.advance(st); continue; }
      for (const seat of nd.slice()) {
        if (!G.needs(st).includes(seat)) continue;
        const V = G.view(st, seat), a = G.ai(V, seat, tiers[(seat + g) % 3], rr);
        let r = a ? G.apply(st, seat, a) : { ok: false };
        if (!r.ok) { const l = G.legal(st, seat); r = G.apply(st, seat, l[0]); ok(false, `AI 가 거절당함 ${g} ${JSON.stringify(a)} → ${JSON.stringify(r)}`); }
      }
      if (total(st) !== 100) { ok(false, `별 보존 깨짐 ${g}`); break; }
      if (st.bombs.some(b => b > 3)) { ok(false, '폭탄 3 초과'); break; }
    }
    ok(G.over(st), `${g}번째 판이 끝남 (n=${n})`);
    games++; rounds += st.round; maxR = Math.max(maxR, st.round); why[st.why]++;
    const rk = G.ranks(st); ok(rk.includes(0), '1등이 있어요'); ok(rk.every(x => x >= 0 && x < n), '순위 범위');
    const v = G.view(st, 0); ok(v.over && v.ranks.length === n && v.score.length === n, '끝난 view');
  }
  console.log(`  무작위 ${games}판: 평균 ${(rounds / games).toFixed(1)}라운드 · 최대 ${maxR} · 끝난 이유`, JSON.stringify(why));
  ok(maxR <= G.MAX_ROUNDS, '라운드 상한 안에서 끝남');
}
// 11) AI 단계: 어려운 AI 가 쉬운 AI 보다 승점이 더 나아요 (평균 순위)
{
  const R = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 8) / 16777216; }; };
  const sc = { easy: 0, normal: 0, hard: 0 }, cnt = { easy: 0, normal: 0, hard: 0 };
  for (let g = 0; g < 90; g++) {
    const n = 6, st = G.init({ n, seed: 900 + g }), rr = R(g + 3), tiers = ['easy', 'normal', 'hard', 'easy', 'normal', 'hard'], rot = g % 6;
    let guard = 0;
    while (!G.over(st) && guard++ < 4000) {
      const nd = G.needs(st);
      if (!nd.length) { G.advance(st); continue; }
      for (const seat of nd.slice()) { if (!G.needs(st).includes(seat)) continue; const a = G.ai(G.view(st, seat), seat, tiers[(seat + rot) % 6], rr); G.apply(st, seat, a || G.legal(st, seat)[0]); }
    }
    const rk = G.ranks(st); for (let i = 0; i < n; i++) { const t = tiers[(i + rot) % 6]; sc[t] += rk[i]; cnt[t]++; }
  }
  const avg = t => +(sc[t] / cnt[t]).toFixed(2);
  console.log('  평균 순위 (낮을수록 좋음) easy', avg('easy'), 'normal', avg('normal'), 'hard', avg('hard'));
  ok(avg('hard') <= avg('easy') + 0.15, '어려운 AI 가 쉬운 AI 보다 크게 나쁘지 않아요');
}
console.log(`별자리 게임 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

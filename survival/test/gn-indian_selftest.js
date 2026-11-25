// 인디언 포커 규칙 시험 (node survival/test/gn-indian_selftest.js)
// 방송 12화(결승 1회전) 칩 기록 앞 4판을 그대로 재현 + 규칙 하나하나 + AI 무작위 판 + 숨은 카드 · 선생님이 새지 않는지
'use strict';
const G = require('../games/gn-indian/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

// 1) 결승 기록 (김경란 = 좌석 0, 홍진호 = 좌석 1, 칩 25:25)
{
  const st = G.init({ n: 2, seed: 1, cfg: { chips: 25, first: 0, cards: [[7, 8], [5, 9], [2, 4], [10, 7], [5, 6]] } });
  ok(st.chips[0] === 24 && st.chips[1] === 24 && st.contrib[0] === 1, '기본 베팅 1칩씩');
  ok(G.needs(st)[0] === 0, '1판 선은 좌석 0');
  // 1판 7 vs 8: 김경란 2 베팅(레이즈 to 2) → 홍진호 폴드 → 26:24
  ok(G.apply(st, 0, { t: 'raise', to: 2 }).ok, '레이즈 to 2');
  ok(G.apply(st, 1, { t: 'fold' }).ok, '폴드');
  ok(st.chips[0] === 26 && st.chips[1] === 24, '1판 26:24');
  ok(G.auto(st) > 0, '결과 뒤 자동 넘김'); G.advance(st);
  // 2판 5 vs 9: 선은 홍진호. 홍진호 2 레이즈 → 김경란 콜 → 홍진호 승 24:26
  ok(G.needs(st)[0] === 1, '2판 선은 좌석 1');
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'call' });
  ok(st.chips[0] === 24 && st.chips[1] === 26, '2판 24:26 (콜 · 높은 숫자 승)');
  G.advance(st);
  // 3판 2 vs 4: 선 김경란 즉시 폴드 → 23:27
  G.apply(st, 0, { t: 'fold' });
  ok(st.chips[0] === 23 && st.chips[1] === 27, '3판 23:27');
  G.advance(st);
  // 4판 10 vs 7: 선 홍진호 2 레이즈 → 김경란(10) 폴드 → 기본 1 + 페널티 10 = −11 → 12:38
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.chips[0] === 12 && st.chips[1] === 38, '4판 10 폴드 페널티 12:38');
  ok(st.res.pen === 10, '페널티 10칩');
  G.advance(st);
  // 5판 5 vs 6: 선 김경란 레이즈 3 → 홍진호 콜 → 홍진호 승 (칩 3 잃음)
  G.apply(st, 0, { t: 'raise', to: 3 }); G.apply(st, 1, { t: 'call' });
  ok(st.chips[0] === 12 - 1 - 2 + 0 && st.chips[1] === 38 - 1 - 2 + 6, '5판 숫자 큰 쪽이 판돈 6 가져감');
}

// 2) 무승부 이월 · 다음 판 기본 베팅 없음
{
  const st = G.init({ n: 2, seed: 2, cfg: { chips: 20, first: 0, cards: [[4, 4], [3, 9]] } });
  G.apply(st, 0, { t: 'raise', to: 3 }); G.apply(st, 1, { t: 'call' });
  ok(st.chips[0] === 17 && st.chips[1] === 17 && st.carry === 6, '무승부: 판돈 6 이월, 칩은 그대로');
  G.advance(st);
  ok(st.contrib[0] === 0 && st.contrib[1] === 0 && st.chips[0] === 17, '이월 뒤 판은 기본 베팅 없음');
  ok(G.view(st, 0).pot === 6, '판돈에 이월분이 들어감');
  G.apply(st, 1, { t: 'call' });   // 선(좌석 1)이 0 = 0 에서 콜 → 바로 공개
  ok(st.chips[1] === 17 + 6 && st.carry === 0, '다음 판 이긴 사람이 이월 판돈을 다 가져감 (좌석 1 카드 9)');
}

// 3) 레이즈 규칙 · 올인 상한 · 칩 0 이면 끝
{
  const st = G.init({ n: 2, seed: 3, cfg: { chips: 6, first: 0, cards: [[2, 9]] } });
  ok(!G.apply(st, 0, { t: 'raise', to: 1 }).ok, '지금과 같거나 낮은 레이즈 거절');
  ok(!G.apply(st, 0, { t: 'raise', to: 7 }).ok, '두 사람 중 적은 쪽 칩(6)보다 많이 못 걸음');
  ok(!G.apply(st, 1, { t: 'call' }).ok, '내 차례가 아니면 거절');
  ok(G.apply(st, 0, { t: 'raise', to: 6 }).ok, '올인(6)');
  ok(!G.apply(st, 1, { t: 'raise', to: 7 }).ok, '다시 올릴 수 없음');
  G.apply(st, 1, { t: 'call' });
  ok(st.chips[0] === 0 && st.chips[1] === 12 && G.over(st), '칩 0 → 바로 끝');
  ok(G.ranks(st)[0] === 1 && G.ranks(st)[1] === 0, '등수');
}
// 폴드한 쪽 카드가 10 인데 칩이 모자라면 있는 만큼만
{
  const st = G.init({ n: 2, seed: 4, cfg: { chips: 6, first: 1, cards: [[10, 2]] } });
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 5 && st.chips[0] === 0 && st.chips[1] === 6 + 1 + 5, '칩이 모자라면 페널티는 있는 만큼 (5)');
  ok(G.over(st), '칩이 0 이 되어 끝');
}

// 4) 숨은 카드
{
  const st = G.init({ n: 2, seed: 5, cfg: { chips: 20, first: 0, cards: [[3, 8]] } });
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all');
  ok(v0.cards[0] === -1 && v0.cards[1] === 8, '내 카드는 안 보이고 상대 카드는 보임 (0)');
  ok(v1.cards[1] === -1 && v1.cards[0] === 3, '내 카드는 안 보이고 상대 카드는 보임 (1)');
  ok(va.cards[0] === 3 && va.cards[1] === 8, '다 보기');
  ok(v0.pub === v1.pub && v1.pub === va.pub, '공개 지문이 같다');
  G.apply(st, 0, { t: 'raise', to: 2 }); G.apply(st, 1, { t: 'call' });
  ok(G.view(st, 0).cards[0] === 3 && G.view(st, 1).cards[1] === 8, '공개 뒤에는 둘 다 보임');
}

// 5) 선생님은 내 카드를 모른 채 읽는다 — 내 카드만 바꾼 두 장면에서 글이 같아야 함
{
  const mk = mine => { const st = G.init({ n: 2, seed: 6, cfg: { chips: 30, first: 1, cards: [[mine, 6]] } }); G.apply(st, 1, { t: 'raise', to: 4 }); return st; };
  const a = G.coach(G.view(mk(2), 0), 0, -1, ['나', '상대']), b = G.coach(G.view(mk(9), 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(a) === JSON.stringify(b), '내 카드가 달라도 선생님 글은 같다');
  ok(a.opp && a.mine && a.rec && a.why, '선생님 글 4줄');
  const A1 = G.ai(G.view(mk(2), 0), 0, 'hard', () => 0.5), A2 = G.ai(G.view(mk(9), 0), 0, 'hard', () => 0.5);
  ok(JSON.stringify(A1) === JSON.stringify(A2), 'AI 도 내 카드를 모른 채 같은 수를 둔다');
}

// 6) AI 끼리 · 덱 순환 · 합법 수
for (const tier of ['easy', 'normal', 'hard']) {
  let wins = [0, 0], draws = 0, bad = 0, rounds = 0, longest = 0;
  for (let s = 1; s <= 80; s++) {
    const st = G.init({ n: 2, seed: s * 104729, cfg: { chips: s % 2 ? 45 : 25 } });
    const rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    let guard = 0;
    while (!G.over(st) && guard++ < 2000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const seat = need[0], a = G.ai(G.view(st, seat), seat, seat ? tier : 'normal', rr);
      const r = G.apply(st, seat, a);
      if (!r.ok) { bad++; G.apply(st, seat, G.legal(st, seat)[0]); }
      ok(st.chips[0] >= 0 && st.chips[1] >= 0, '칩이 음수가 되지 않는다');
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    rounds += st.round; longest = Math.max(longest, st.round);
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else wins[R[0] === 0 ? 0 : 1]++;
    ok(st.chips[0] + st.chips[1] + st.carry + (st.contrib[0] + st.contrib[1]) === 2 * st.start, '칩 총량이 보존된다');
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${wins[0]} · 좌석1 ${wins[1]} · 무 ${draws} / 80판 · 평균 ${(rounds / 80).toFixed(1)}판 · 최장 ${longest}`);
}

console.log(`gn-indian selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

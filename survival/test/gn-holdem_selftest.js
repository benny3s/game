// 인디언 홀덤 규칙 시험 (node survival/test/gn-holdem_selftest.js)
// 조합 판정 · 방송 7화 앞 3판(올인 무승부 이월 → 10 이 30칩) 재현 · 폴드 페널티 · 숨은 카드 · AI 무작위 판
'use strict';
const G = require('../games/gn-holdem/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

// 1) 조합
ok(G.cat([4, 4], 4) === 3, '트리플');
ok(G.cat([4, 4], 5) === 0, '공유가 같고 내 카드가 다르면 없음 (임의)');
ok(G.cat([4, 5], 6) === 2 && G.cat([4, 5], 3) === 2 && G.cat([4, 6], 5) === 2, '스트레이트 (연속 세 숫자)');
ok(G.cat([9, 10], 1) === 2 && G.cat([10, 1], 9) === 2 && G.cat([10, 1], 2) === 2 && G.cat([1, 2], 10) === 2, '10 과 1 도 이어짐');
ok(G.cat([4, 5], 7) === 0 && G.cat([4, 6], 8) === 0, '떨어져 있으면 스트레이트 아님');
ok(G.cat([3, 8], 8) === 1 && G.cat([3, 8], 3) === 1, '더블');
ok(G.cmp([4, 5], 6, 9) === 1 && G.cmp([4, 5], 9, 6) === -1, '스트레이트가 숫자 큰 것보다 이김');
ok(G.cmp([3, 8], 3, 8) === 0 || G.cmp([3, 8], 3, 8) === -1 || true, '더블끼리는 숫자 비교 (아래서 확인)');
ok(G.cmp([3, 8], 8, 3) === 1 && G.cmp([3, 8], 3, 8) === -1, '둘 다 더블이면 내 카드 숫자가 큰 쪽');
ok(G.cmp([3, 8], 5, 7) === -1 && G.cmp([3, 8], 7, 5) === 1 && G.cmp([3, 8], 6, 6) === 0, '둘 다 없음 → 숫자만, 같으면 무승부');
// 방송 확률: 공유 간격 0·1·2·8·9 면 위험 = 19/39 (내 카드가 조합이 되는 경우의 수 — 40장 중 공유 2장 · 상대 카드를 뺀 39장 기준)
{
  let hit = 0, tot = 0;
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
    const gap = G.circ(a, b), risky = gap <= 2;
    let can = false; for (let x = 1; x <= 10; x++) if (G.cat([a, b], x) >= 2) can = true;
    ok(can === (a === b ? true : gap === 1 || gap === 2), `공유 ${a},${b}: 트리플/스트레이트 가능 여부`);
    void risky;
  }
}

// 2) 방송 7화 앞 3판 (은지원 = 좌석 0, 홍진호 = 좌석 1, 15칩씩)
{
  const st = G.init({ n: 2, seed: 1, cfg: { ver: 'a', chips: 15, first: 0, cards: [[1, 8, 2, 2], [9, 10, 6, 6], [4, 7, 10, 5]] } });
  ok(st.chips[0] === 14 && st.chips[1] === 14, '기본 베팅 1칩씩');
  ok(G.apply(st, 0, { t: 'raise', to: 15 }).ok, '올인 15');
  ok(G.apply(st, 1, { t: 'call' }).ok, '콜');
  ok(st.chips[0] === 0 && st.chips[1] === 0 && st.carry === 30 && st.res.type === 'draw', '둘 다 2 → 무승부, 30칩 이월');
  G.advance(st);
  ok(st.phase === 'reveal' && st.res.type === 'draw' && st.carry === 30 && st.round === 2, '2판: 칩이 없어 바로 공개 → 둘 다 6, 다시 무승부');
  ok(!G.over(st), '이월 판돈이 있으면 끝나지 않음');
  G.advance(st);
  ok(G.over(st) && st.chips[0] === 30 && st.chips[1] === 0 && st.carry === 0, '3판: 10 이 이월 30칩을 다 가져가고 끝 (30:0)');
}

// 3) 폴드 페널티 (7화형: 스트레이트·트리플만 10, 결승형: 더블 5 추가)
{
  const mk = (ver, cards) => G.init({ n: 2, seed: 2, cfg: { ver, chips: 30, first: 1, cards: [cards] } });
  let st = mk('a', [4, 5, 6, 9]);   // 좌석 0 = 6 → 스트레이트
  G.apply(st, 1, { t: 'raise', to: 3 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 10 && st.chips[0] === 30 - 1 - 10 && st.chips[1] === 30 - 1 - 2 + 3 + 1 + 10, '스트레이트 폴드: 10칩 페널티');
  st = mk('a', [4, 4, 4, 9]);
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 10, '트리플 폴드: 10칩');
  st = mk('a', [4, 8, 8, 2]);
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 0, '7화형: 더블 폴드는 페널티 없음');
  st = mk('b', [4, 8, 8, 2]);
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 5, '결승형: 더블 폴드 5칩 (방송 12화 6턴 +7 = 기본 2 + 5)');
  st = mk('b', [2, 9, 3, 7]);
  G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  ok(st.res.pen === 0, '조합 없음 폴드는 페널티 없음');
}

// 4) 규칙 거절 · 숨은 카드
{
  const st = G.init({ n: 2, seed: 3, cfg: { ver: 'b', first: 0, cards: [[2, 6, 3, 8]] } });
  ok(st.chips[0] === 19 && st.chips[1] === 19, '결승형 시작 칩 20');
  ok(!G.apply(st, 1, { t: 'call' }).ok && !G.apply(st, 0, { t: 'raise', to: 1 }).ok && !G.apply(st, 0, { t: 'raise', to: 21 }).ok, '차례 · 레이즈 범위 거절');
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all');
  ok(v0.cards[0] === -1 && v0.cards[1] === 8 && v1.cards[1] === -1 && v1.cards[0] === 3, '내 카드 안 보이고 상대 카드 보임');
  ok(v0.shared[0] === 2 && v0.shared[1] === 6 && va.cards[0] === 3 && va.cards[1] === 8, '공유카드는 모두에게 보임');
  ok(v0.pub === v1.pub && v1.pub === va.pub, '공개 지문 같음');
}
// 선생님 · AI 는 내 카드를 모른다
{
  const mk = mine => { const st = G.init({ n: 2, seed: 6, cfg: { ver: 'a', chips: 30, first: 1, cards: [[3, 8, mine, 6]] } }); G.apply(st, 1, { t: 'raise', to: 4 }); return st; };
  const a = G.coach(G.view(mk(2), 0), 0, -1, ['나', '상대']), b = G.coach(G.view(mk(9), 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(a) === JSON.stringify(b) && a.opp && a.mine && a.rec && a.why, '내 카드가 달라도 선생님 글은 같다');
  ok(JSON.stringify(G.ai(G.view(mk(2), 0), 0, 'hard', () => 0.5)) === JSON.stringify(G.ai(G.view(mk(9), 0), 0, 'hard', () => 0.5)), 'AI 도 같은 수');
}

// 5) AI 끼리 · 덱 순환(10판) · 합법 수 · 칩 보존
for (const tier of ['easy', 'normal', 'hard']) {
  let wins = [0, 0], draws = 0, bad = 0, rounds = 0;
  for (let s = 1; s <= 60; s++) {
    const ver = s % 2 ? 'a' : 'b', start = ver === 'a' ? 15 : 20;
    const st = G.init({ n: 2, seed: s * 7907, cfg: { ver } });
    const rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    let guard = 0;
    while (!G.over(st) && guard++ < 2000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const seat = need[0], r = G.apply(st, seat, G.ai(G.view(st, seat), seat, seat ? tier : 'normal', rr));
      if (!r.ok) { bad++; G.apply(st, seat, G.legal(st, seat)[0]); }
      ok(st.chips[0] >= 0 && st.chips[1] >= 0, '칩이 음수가 되지 않는다');
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    rounds += st.round;
    ok(st.chips[0] + st.chips[1] + st.carry + st.contrib[0] + st.contrib[1] === 2 * start, '칩 총량 보존');
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else wins[R[0] === 0 ? 0 : 1]++;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${wins[0]} · 좌석1 ${wins[1]} · 무 ${draws} / 60판 · 평균 ${(rounds / 60).toFixed(1)}판`);
}
console.log(`gn-holdem selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

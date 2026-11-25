// 양면포커 규칙 시험 (node survival/test/gn-twoface_selftest.js)
// 방송 칩 기록(블랙가넷 4화 A2 · 그랜드 파이널 10화 13턴 · 21턴) 재현 · 양면베팅 성공/실패/폴드 · 무승부 이월 · 숨은 면 · AI 무작위 판
'use strict';
const G = require('../games/gn-twoface/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
// 칩을 방송 기록대로 맞춤 (기본 베팅 1 은 이미 낸 상태)
const setup = (ver, cards, chips, first) => {
  const st = G.init({ n: 2, seed: 5, cfg: { ver, first, cards: [cards] } });
  st.chips = [chips[0] - 1, chips[1] - 1];
  return st;
};
const total = st => st.chips[0] + st.chips[1] + st.carry + st.contrib[0] + st.contrib[1];

// 1) 블랙가넷 4화 A2: 양면 1Bet(3) vs 상대 뒤 Call(2) → 40:20 → 52:8 (상대 투입 2 + 10)
{
  const st = setup('a', [4, 3, 7, 9], [20, 40], 0);   // 좌석 0 = 상대 (뒷면 3), 좌석 1 = 양면베팅 (앞 7 · 뒤 9)
  ok(ap(st, 0, { t: 'raise', to: 2, side: 1 }).ok, '상대 뒤 1 베팅 (총 2)');
  const R = G.dblRange(st, 1);
  ok(R.lo === 1 && R.hi >= 1, '양면베팅은 상대가 건 1칩 이상');
  ok(!G.apply(st, 1, { t: 'double', x: 0 }).ok, 'x 0 거절');
  ok(ap(st, 1, { t: 'double', x: 1 }).ok, '양면 1Bet (내 총액 3)');
  ok(st.res && st.res.type === 'dbl' && st.res.ok && st.res.win === 1, '두 면(7·9)이 상대 뒷면 3 보다 큼 → 성공');
  ok(st.chips[1] === 52 && st.chips[0] === 8, `40:20 → 52:8 (실제 ${st.chips[1]}:${st.chips[0]})`);
}
// 2) 그랜드 파이널 10화 13턴: 양면 10Bet(21) vs 상대 뒤 Call(11) → 38:42 → 17:63
{
  const st = setup('b', [2, 5, 6, 9], [38, 42], 0);   // 상대 뒷면 5 · 양면 (앞 6 · 뒤 9), 앞뒤 홀짝 반대
  ok(ap(st, 0, { t: 'raise', to: 11, side: 1 }).ok, '상대 뒤 10 베팅 (총 11)');
  ok(ap(st, 1, { t: 'double', x: 10 }).ok, '양면 10Bet (총 21)');
  ok(st.res.ok && st.chips[1] === 63 && st.chips[0] === 17, `38:42 → 17:63 (실제 ${st.chips[0]}:${st.chips[1]})`);
}
// 3) 그랜드 파이널 21턴: 24:56 → 13:67 (양면 1벳에 폴드 = 기본 1 + 페널티 10)
{
  const st = setup('b', [3, 8, 9, 2], [24, 56], 1);   // 좌석 1 = 양면 선언 (선)
  ok(ap(st, 1, { t: 'double', x: 1 }).ok, '양면 1벳');
  ok(st.turn === 0 && G.needs(st)[0] === 0, '상대가 콜 · 폴드를 고를 차례');
  ok(!G.apply(st, 0, { t: 'raise', to: 5, side: 1 }).ok, '양면베팅에 레이즈 거절');
  ok(ap(st, 0, { t: 'fold' }).ok, '폴드');
  ok(st.res.pen === 10 && st.chips[0] === 13 && st.chips[1] === 67, `24:56 → 13:67 (실제 ${st.chips[0]}:${st.chips[1]})`);
}
// 4) 양면베팅 실패 (한 면이 같거나 낮음) · 콜로 받기
{
  let st = setup('a', [5, 6, 8, 7], [30, 30], 1);   // 좌석 1 = 선, 앞 8 · 뒤 7 / 좌석 0 = 뒤 6 이면 성공, 뒤 7 이면 같으니 실패
  ap(st, 1, { t: 'double', x: 2 });
  ok(ap(st, 0, { t: 'call', side: 1 }).ok, '상대가 콜 (뒷면 6)');
  ok(st.res.ok && st.chips[1] === 43 && st.chips[0] === 17, `성공: 판돈 8 + 보너스 10 (실제 ${st.chips[1]}:${st.chips[0]})`);
  st = setup('a', [5, 7, 8, 7], [30, 30], 1);   // 상대 뒷면 7 → 양면 선언자 뒷면 7 과 같음 → 실패
  ap(st, 1, { t: 'double', x: 2 });
  ap(st, 0, { t: 'call', side: 1 });
  ok(st.res.type === 'dbl' && !st.res.ok && st.res.win === 0, '같으면 실패, 상대 승');
  ok(st.chips[1] === 25 && st.chips[0] === 35, `선언자는 건 칩 5(1 + 2x) 를 잃음 (실제 ${st.chips[1]}:${st.chips[0]})`);
  st = setup('a', [5, 9, 8, 7], [30, 30], 1);   // 상대가 앞면(5)을 고르면 두 면(8·7)이 모두 큼 → 성공
  ap(st, 1, { t: 'double', x: 1 });
  ap(st, 0, { t: 'call', side: 0 });
  ok(st.res.ok, '상대가 앞면(5)을 골라도 판정은 두 면 모두');
}
// 5) 보통 승부 · 면 고정 · 체크 · 무승부 이월
{
  const st = G.init({ n: 2, seed: 9, cfg: { ver: 'a', first: 0, cards: [[4, 9, 6, 2], [3, 8, 8, 7], [5, 1, 5, 2]] } });
  ok(!G.apply(st, 0, { t: 'raise', to: 3 }).ok, '면을 안 고르면 거절');
  ok(ap(st, 0, { t: 'raise', to: 3, side: 1 }).ok && st.side[0] === 1, '뒷면 선택');
  ok(ap(st, 1, { t: 'call', side: 0 }).ok, '상대는 앞면(6)으로 콜');
  ok(st.res.type === 'show' && st.res.win === 0 && st.chips[0] === 30 - 3 + 6 && st.chips[1] === 27, '내 뒷면 9 > 상대 앞면 6');
  G.advance(st);
  ok(st.round === 2 && st.first === 1 && st.contrib[0] === 1 && st.contrib[1] === 1, '2판: 선이 바뀌고 기본 베팅 1칩');
  ok(ap(st, 1, { t: 'call', side: 0 }).ok && st.chk && st.turn === 0, '선이 넘김(체크) → 상대 차례');
  ok(ap(st, 0, { t: 'call', side: 1 }).ok, '상대도 넘기면 공개');
  ok(st.res.type === 'draw' && st.carry === 2 && st.chips[0] === 32 && st.chips[1] === 26, '좌석1 앞 8 = 좌석0 뒤 8 → 무승부, 기본 판돈 2 이월');
  G.advance(st);
  ok(st.carry === 2 && st.contrib[0] === 1 && st.contrib[1] === 1, '이월 뒤에도 기본 베팅 1칩씩');
}
{
  // 무승부: 좌석 0 뒤 8 · 좌석 1 앞 8 → 같음 → 판돈 이월 + 다음 판 기본 베팅은 그대로 1칩
  const st = G.init({ n: 2, seed: 9, cfg: { ver: 'a', first: 0, cards: [[1, 8, 8, 2], [3, 4, 5, 6]] } });
  ap(st, 0, { t: 'raise', to: 2, side: 1 }); ap(st, 1, { t: 'call', side: 0 });
  ok(st.res.type === 'draw' && st.carry === 4 && st.chips[0] === 28 && st.chips[1] === 28, '무승부 → 판돈 4 이월');
  G.advance(st);
  ok(st.contrib[0] === 1 && st.contrib[1] === 1 && st.carry === 4, '이월 뒤에도 기본 베팅 1칩');
  ok(total(st) === 60, '칩 총량 60');
}
// 6) 구조 · 숨은 면
{
  const st = G.init({ n: 2, seed: 3, cfg: { ver: 'b', first: 0, cards: [[2, 5, 6, 9]] } });
  ok(st.chips[0] === 39 && st.chips[1] === 39, '그랜드 파이널 시작 칩 40');
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all'), vs = G.view(st, -1);
  ok(v0.cards[0].f === -1 && v0.cards[0].b === 5 && v0.cards[1].f === 6 && v0.cards[1].b === -1, '내 뒷면 · 상대 앞면만 보임');
  ok(v1.cards[1].f === -1 && v1.cards[1].b === 9 && v1.cards[0].f === 2 && v1.cards[0].b === -1, '반대편도 마찬가지');
  ok(va.cards[0].f === 2 && va.cards[0].b === 5 && va.cards[1].b === 9 && vs.cards[0].f === -1 && vs.cards[0].b === -1 && vs.cards[1].f === -1 && vs.cards[1].b === -1, 'all 은 모두 보이고 온라인 구경꾼(-1)은 아무것도 못 봄');
  ok(v0.pub === v1.pub && v1.pub === va.pub && va.pub === vs.pub, '공개 지문 같음');
  for (const ver of ['a', 'b']) {
    const s = G.init({ n: 2, seed: 77, cfg: { ver } });
    for (let k = 0; k < 40 && !G.over(s); k++) {
      const c = s.card[0], d = s.card[1];
      ok(c[0] !== c[1] && d[0] !== d[1], '앞면과 뒷면은 다름');
      if (ver === 'b') ok((c[0] + c[1]) % 2 === 1 && (d[0] + d[1]) % 2 === 1, '그랜드 파이널 판: 앞뒤 홀짝 반대');
      const need = G.needs(s); if (!need.length) { G.advance(s); continue; }
      ap(s, need[0], { t: 'fold' });
    }
  }
}
// 선생님 · AI 는 숨은 면을 모른다 (내 앞면 · 상대 뒷면을 바꿔도 같은 글 · 같은 수)
{
  // 카드 배열 = [좌석0 앞, 좌석0 뒤, 좌석1 앞, 좌석1 뒤] · 좌석 0 = 나 (앞면은 내가 못 봄), 좌석 1 = 상대 (뒷면은 내가 못 봄)
  const mk2 = (myFront, oppBack) => { const st = G.init({ n: 2, seed: 6, cfg: { ver: 'a', chips: 30, first: 1, cards: [[myFront, 5, 7, oppBack]] } }); G.apply(st, 1, { t: 'raise', to: 4, side: 0 }); return st; };
  const A = mk2(2, 9), B = mk2(8, 3);
  const ca = G.coach(G.view(A, 0), 0, -1, ['나', '상대']), cb = G.coach(G.view(B, 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(ca) === JSON.stringify(cb) && ca.opp && ca.mine && ca.rec && ca.why, '숨은 면이 달라도 선생님 글은 같다');
  ok(JSON.stringify(G.ai(G.view(A, 0), 0, 'hard', () => 0.5)) === JSON.stringify(G.ai(G.view(B, 0), 0, 'hard', () => 0.5)), 'AI 도 같은 수');
}
// 7) AI 끼리 · 합법 수 · 칩 보존 · 양면베팅이 실제로 나오는지
for (const tier of ['easy', 'normal', 'hard']) {
  let w = [0, 0], draws = 0, bad = 0, rounds = 0, dbl = 0, dblOk = 0, folds = 0, pens = 0;
  for (let s = 1; s <= 60; s++) {
    const ver = s % 2 ? 'a' : 'b', start = ver === 'a' ? 30 : 40;
    const st = G.init({ n: 2, seed: s * 6007, cfg: { ver } });
    const rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    let guard = 0;
    while (!G.over(st) && guard++ < 3000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const seat = need[0], r = G.apply(st, seat, G.ai(G.view(st, seat), seat, seat ? tier : 'normal', rr));
      if (!r.ok) { bad++; G.apply(st, seat, G.legal(st, seat)[0]); }
      if (st.res && (st.phase === 'reveal' || st.phase === 'end')) { const R = st.res; if (R.type === 'dbl') { dbl++; if (R.ok) dblOk++; } if (R.type === 'fold') { folds++; if (R.pen) pens++; } }
      ok(st.chips[0] >= 0 && st.chips[1] >= 0, '칩이 음수가 되지 않는다');
      if (st.phase === 'reveal') G.advance(st);
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    rounds += st.round;
    ok(total(st) === 2 * start, '칩 총량 보존');
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else w[R[0] === 0 ? 0 : 1]++;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${w[0]} · 좌석1 ${w[1]} · 무 ${draws} / 60판 · 평균 ${(rounds / 60).toFixed(1)}판 · 양면베팅 ${dbl}번(성공 ${dblOk}) · 폴드 ${folds}번(페널티 ${pens})`);
}

// 방송대로 콜 = 바로 공개: 기본 판돈만 걸고 넘기면 상대는 면을 골라 콜(공개)만 — 더 걸기 · 접기 · 양면베팅 거절
{
  const st = G.init({ n: 2, seed: 5, cfg: { first: 0, cards: [[3, 7, 5, 2]] } });
  ok(ap(st, 0, { t: 'call', side: 1 }).ok && st.chk && st.turn === 1 && st.phase === 'bet', '선이 기본 판돈만 걸고 넘김 → 상대 차례');
  ok(JSON.stringify(G.legal(st, 1).map(a => a.t)) === '["call"]', '넘긴 뒤 상대의 합법 수는 콜뿐');
  ok(!G.apply(st, 1, { t: 'raise', to: 2, side: 1 }).ok && !G.apply(st, 1, { t: 'fold' }).ok && !G.apply(st, 1, { t: 'double', x: 1 }).ok && st.phase === 'bet', '넘긴 뒤 상대는 레이즈 · 폴드 · 양면베팅을 못 해요');
  const V = G.view(st, 1), a = G.ai(V, 1, 'hard', () => 0.5);
  ok(a && a.t === 'call', '고급 AI 도 콜만 (바로 공개)');
  ok(ap(st, 1, { t: 'call', side: 1 }).ok && (st.phase === 'reveal' || st.phase === 'end'), '콜하면 바로 공개');
  for (const tier of ['easy', 'normal', 'hard']) { const s2 = G.init({ n: 2, seed: 5, cfg: { first: 0, cards: [[3, 7, 5, 2]] } }); G.apply(s2, 0, { t: 'call', side: 1 }); const c = G.coach(G.view(s2, 1), 1, -1, ['나', '상대']); ok(c && c.rec && !/undefined|NaN/.test(JSON.stringify(c)), '넘긴 뒤 선생님 글 ' + tier); }
}
console.log(`gn-twoface selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

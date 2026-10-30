// 텍사스 홀덤 포커 (Texas Hold'em) 족보 판정 · 드로(Outs) · 베팅 · AI 코치 자체 시험
// 실행: node poker/test/selftest.js
const P = require('../core.js');
const AI = require('../ai.js');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', msg); }
}

const c = (arr) => arr.map(P.parseCard);

// 1) 52장 카드 덱 검증
ok(P.CARDS.length === 52, '포커 덱 52장');
ok(P.cardOf(P.parseCard('As')).rank === 14 && P.cardOf(P.parseCard('As')).suit === 0, 'As 파싱');
ok(P.cardOf(P.parseCard('10h')).rank === 10 && P.cardOf(P.parseCard('10h')).suit === 1, '10h 파싱');

// 2) 10단계 정통 포커 족보 서열 검증 (7장 중 최적 5장 자동 선택)
const eRoyal = P.eval7(c(['As', 'Ks', 'Qs', 'Js', '10s', '2h', '3d']));
const eSF = P.eval7(c(['9h', '8h', '7h', '6h', '5h', 'As', 'Kd']));
const eFour = P.eval7(c(['Ah', 'Ad', 'Ac', 'As', 'Kh', '2c', '3d']));
const eFull = P.eval7(c(['Kh', 'Kd', 'Kc', 'Qs', 'Qh', '2c', '3d']));
const eFlush = P.eval7(c(['Ad', 'Jd', '9d', '6d', '2d', 'Ks', 'Qh']));
const eStraight = P.eval7(c(['10s', '9h', '8d', '7c', '6s', '2h', '2d']));
const eWheel = P.eval7(c(['As', '2h', '3d', '4c', '5s', 'Kh', 'Qd']));
const eTrips = P.eval7(c(['Qc', 'Qd', 'Qh', '9s', '4d', '2h', '3c']));
const eTwoPair = P.eval7(c(['Jh', 'Jd', '8s', '8c', 'Ah', '4d', '2c']));
const eOnePair = P.eval7(c(['10s', '10d', 'Ah', 'Kc', '9d', '4s', '2c']));
const eHigh = P.eval7(c(['As', 'Kd', '9h', '7c', '4s', '3d', '2h']));

ok(eRoyal.cat === 9 && eRoyal.shortName === '로열 플러시', '로열 스트레이트 플러시 판정');
ok(eSF.cat === 8 && eSF.shortName === '스트레이트 플러시', '스트레이트 플러시 판정');
ok(eFour.cat === 7 && eFour.shortName === '포카드', '포카드 판정');
ok(eFull.cat === 6 && eFull.shortName === '풀하우스', '풀하우스 판정');
ok(eFlush.cat === 5 && eFlush.shortName === '플러시', '플러시 판정');
ok(eStraight.cat === 4 && eStraight.shortName === '스트레이트', '스트레이트 판정');
ok(eWheel.cat === 4 && eWheel.name.includes('백스트레이트'), 'A-2-3-4-5 백스트레이트(Wheel) 판정');
ok(eStraight.score > eWheel.score, '10탑 스트레이트 > 5탑 백스트레이트');
ok(eTrips.cat === 3 && eTrips.shortName === '트리플', '트리플 판정');
ok(eTwoPair.cat === 2 && eTwoPair.shortName === '투페어', '투페어 판정');
ok(eOnePair.cat === 1 && eOnePair.shortName === '원페어', '원페어 판정');
ok(eHigh.cat === 0 && eHigh.shortName === '하이카드', '하이카드 판정');

ok(
  eRoyal.score > eSF.score &&
  eSF.score > eFour.score &&
  eFour.score > eFull.score &&
  eFull.score > eFlush.score &&
  eFlush.score > eStraight.score &&
  eStraight.score > eTrips.score &&
  eTrips.score > eTwoPair.score &&
  eTwoPair.score > eOnePair.score &&
  eOnePair.score > eHigh.score,
  '10단계 족보 점수 엄격 단조 증가'
);

// 3) 드로(Outs) 탐지기 검증 (플러시 드로 9아웃츠, 양차 스트레이트 드로 8아웃츠)
const dFlush = P.analyzeDraws(c(['As', 'Ks']), c(['7s', '2s', '9d']));
ok(dFlush.outsCount >= 9 && dFlush.tags.some(t => t.includes('플러시 드로')), '플러시 드로 9아웃츠 감지');

const dOESD = P.analyzeDraws(c(['8h', '7d']), c(['6s', '5c', 'Kd']));
ok(dOESD.outsCount >= 8 && dOESD.tags.some(t => t.includes('양차')), '양차 스트레이트 드로 8아웃츠 감지');

// 4) 스트리트 진행 (프리플랍 -> 플랍 -> 턴 -> 리버 -> 쇼다운) 검증
let s = P.create({ players: 2, seed: 2026 });
ok(s.street === 0 && s.board.length === 0 && s.pot === 30, '프리플랍 블라인드 10/20 포스팅');
s = P.step(s, P.A_CALL).state; // SB 콜
s = P.step(s, P.A_CALL).state; // BB 체크
ok(s.street === 1 && s.board.length === 3, '플랍 3장 오픈');
s = P.step(s, P.A_CALL).state;
s = P.step(s, P.A_CALL).state;
ok(s.street === 2 && s.board.length === 4, '턴 4장째 오픈');
s = P.step(s, P.A_CALL).state;
s = P.step(s, P.A_CALL).state;
ok(s.street === 3 && s.board.length === 5, '리버 5장째 오픈');
s = P.step(s, P.A_CALL).state;
s = P.step(s, P.A_CALL).state;
ok(s.phase === 'end' && s.result && s.result.kind === 'showdown', '리버 체크-체크 후 쇼다운 종료');

// 5) AI GTO 일타 강사 (coach) 검증
const s2 = P.create({ players: 2, seed: 777 });
const coachRes = AI.coach(P.view(s2, s2.turn), s2.turn, { samples: 120 });
ok(coachRes && typeof coachRes.equityPct === 'number', 'AI 코치 에퀴티 산출');
ok(coachRes.equityPct >= 0 && coachRes.equityPct <= 100, '에퀴티 0~100% 범위');
ok(coachRes.byAction && Object.keys(coachRes.byAction).length >= 2, '액션별 EV 산출');
ok(typeof coachRes.headline === 'string' && coachRes.headline.length > 5, '한국어 코칭 헤드라인 생성');

// 6) AI 자가 대국 25판 완주 및 칩 보존 법칙 검증
for (let g = 0; g < 25; g++) {
  let st = P.create({ players: 2, seed: 8000 + g });
  let guard = 0;
  while (st.phase !== 'end' && guard++ < 50) {
    const v = P.view(st, st.turn);
    const act = AI.choose(v, g % 2 === 0 ? 'hard' : 'normal', { seed: 300 + guard });
    ok(P.isLegal(st, act), `포커 게임 ${g} 스텝 ${guard} 합법 액션`);
    st = P.step(st, act).state;
  }
  ok(st.phase === 'end' && st.result !== null, `포커 게임 ${g} 정상 종료`);
  const sumChips = st.coins[0] + st.coins[1];
  ok(sumChips === 2000, `포커 게임 ${g} 칩 보존 법칙 (총합 ${sumChips})`);
}

// 7) 빠른 점수(score7) 가 eval7 과 똑같은지 (무작위 5~7장 20000번)
{
  const rng = P.makeRng(31337);
  let diff = 0;
  for (let t = 0; t < 20000; t++) {
    const d = Array.from({ length: 52 }, (_, i) => i);
    for (let i = 51; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const hand = d.slice(0, 5 + Math.floor(rng() * 3));
    if (P.eval7(hand).score !== P.score7(hand)) diff++;
  }
  ok(diff === 0, `score7 == eval7.score (불일치 ${diff})`);
}

// 8) 사이드 팟 계산 (buildPots)
{
  let pots = P.buildPots([100, 100, 100], [true, true, true]);
  ok(pots.length === 1 && pots[0].amount === 300, '같은 금액이면 한 팟');
  pots = P.buildPots([50, 200, 200], [true, true, true]);
  ok(pots.length === 2 && pots[0].amount === 150 && pots[0].elig.join() === '0,1,2' && pots[1].amount === 300 && pots[1].elig.join() === '1,2', '50 올인: 메인 150 + 사이드 300');
  pots = P.buildPots([30, 80, 200, 200], [true, true, true, true]);
  ok(pots.map(p => p.amount).join() === '120,150,240' && pots[2].elig.join() === '2,3', '4명 계단식 올인 (30/80/200/200)');
  pots = P.buildPots([100, 300], [true, true]);
  ok(pots.length === 2 && pots[1].refund === true && pots[1].amount === 200, '안 받아 준 200 은 돌려줌');
  pots = P.buildPots([60, 60, 200, 200, 200], [false, true, true, true, false]);          // 0·4번은 폴드
  ok(pots.reduce((a, p) => a + p.amount, 0) === 720, '폴드한 사람의 칩도 팟에 남음 (총합 보존)');
  ok(pots[0].elig.join() === '1,2,3' && pots[1].elig.join() === '2,3', '폴드한 사람은 자격 없음');
  pots = P.buildPots([0, 100, 100, 0], [false, true, true, false]);
  ok(pots.length === 1 && pots[0].elig.join() === '1,2', '탈락·미참가(0칩) 자리는 무시');
}

// 9) 쇼다운 사이드 팟: 정해진 카드로 8명 테이블 만들기 (올인 여러 명)
{
  const C = a => a.map(P.parseCard);
  // 상태를 직접 만들어 resolveShowdown 대신 step 으로 끝까지 진행: 올인 연쇄
  let s = P.create({ players: 4, seed: 11, stacks: [100, 300, 700, 700] });
  // 카드 고정: 0번 AA, 1번 KK, 2번 QQ, 3번 72 / 보드 2c 3d 9h Js 4c (페어 없음)
  s.hands = [C(['As', 'Ah']), C(['Ks', 'Kh']), C(['Qs', 'Qh']), C(['7d', '2h'])];
  s.deck = C(['5s', '4c', 'Js', '9h', '3d', '2c']).reverse().concat(s.deck.filter(c => ![...C(['As', 'Ah', 'Ks', 'Kh', 'Qs', 'Qh', '7d', '2h', '5s', '4c', 'Js', '9h', '3d', '2c'])].includes(c)));
  // deck.pop() 순서 = 2c 3d 9h Js 4c ... 가 되도록 맞춤 (플랍 2c,3d,9h / 턴 Js / 리버 4c)
  const total = s.coins.reduce((a, b) => a + b, 0) + s.pot;
  // 프리플랍: 모두 올인
  let guard = 0;
  while (s.phase === 'bet' && guard++ < 30) s = P.step(s, P.legal(s).includes(P.A_ALLIN) ? P.A_ALLIN : P.A_CALL).state;
  ok(s.phase === 'end' && s.result.kind === 'showdown', '올인 연쇄 후 쇼다운');
  ok(s.coins.reduce((a, b) => a + b, 0) === total, '칩 보존');
  const r = s.result;
  ok(r.pots.length >= 2, '메인·사이드 팟 여러 개 (' + r.pots.length + ')');
  // AA(0번, 100칩)는 메인 팟만 먹음 → 최대 4×100 = 400
  ok(r.payouts[0] <= 400, `100칩 올인한 AA 는 메인 팟(최대 400)까지만 (${r.payouts[0]})`);
  // 그 위 사이드 팟 승자는 KK(1번, 300칩 올인): 사이드 1 = (300-100)×3 = 600
  ok(r.payouts[1] === 600, `KK 는 사이드 팟 600 (${r.payouts[1]})`);
  // QQ(2번): 700 중 300 이상 낸 사이드 2 → 2·3번만 (700-300)×2 = 800 → QQ 승
  ok(r.payouts[2] === 800, `QQ 는 두 번째 사이드 팟 800 (${r.payouts[2]})`);
  ok(r.payouts[3] === 0, '72 는 못 먹음');
}

// 10) 무승부 스플릿 + 홀수 칩 (딜러 왼쪽부터)
{
  const C = a => a.map(P.parseCard);
  let s = P.create({ players: 3, seed: 5, stacks: [1000, 1000, 1000] });
  // 판 상태를 만든 뒤 바로 리버 쇼다운: 보드가 로열 → 0·1번 둘 다 보드 플레이 → 스플릿
  s.board = C(['As', 'Ks', 'Qs', 'Js', '10s']);
  s.street = 3; s.phase = 'bet';
  s.hands = [C(['2c', '3d']), C(['4c', '5d']), C(['6c', '7d'])];
  s.folded = [false, false, true]; s.allIn = [false, false, false];
  s.totalBets = [101, 100, 100]; s.bets = [0, 0, 0];
  s.pot = 301; s.coins = [899, 900, 900]; s.curBet = 0; s.acted = [false, false, true]; s.turn = 0; s.dealer = 2;
  s = P.step(s, P.A_CALL).state;
  s = P.step(s, P.A_CALL).state;
  ok(s.phase === 'end', '리버 체크-체크 → 쇼다운');
  // 101 vs 100: 0번만 101 → 위 1칩은 돌려받음, 메인 팟 300(0·1·2 기여 100씩) 은 0·1번이 150 씩
  ok(s.result.payouts[0] === 151 && s.result.payouts[1] === 150, `스플릿 팟 150/150 + 0번에게 환불 1 (${s.result.payouts})`);
  ok(s.coins[0] + s.coins[1] + s.coins[2] === 899 + 900 + 900 + 301, '칩 보존');
  // 홀수 칩: 팟 101 을 둘이 나눔 → 먼저 받는 쪽(딜러 왼쪽)이 +1
  let t = P.create({ players: 3, seed: 6, stacks: [1000, 1000, 1000] });
  t.board = C(['As', 'Ks', 'Qs', 'Js', '10s']); t.street = 3; t.phase = 'bet';
  t.hands = [C(['2c', '3d']), C(['4c', '5d']), C(['6c', '7d'])];
  t.folded = [false, false, true]; t.allIn = [false, false, false];
  t.totalBets = [50, 50, 1]; t.bets = [0, 0, 0]; t.pot = 101; t.coins = [950, 950, 999]; t.curBet = 0; t.acted = [false, false, true]; t.turn = 0; t.dealer = 2;
  t = P.step(t, P.A_CALL).state; t = P.step(t, P.A_CALL).state;
  ok(t.result.payouts[0] + t.result.payouts[1] === 101 && t.result.payouts[0] === 51 && t.result.payouts[1] === 50, `홀수 칩은 딜러 왼쪽(0번)이 먼저 (${t.result.payouts})`);
}

// 11) 블라인드·딜러 버튼 회전 (3~8명), 탈락자 건너뛰기
{
  for (let n = 3; n <= 8; n++) {
    let s = P.create({ players: n, seed: 700 + n });
    ok(s.sbSeat === (s.dealer + 1) % n && s.bbSeat === (s.dealer + 2) % n, `${n}인 SB·BB 는 딜러 왼쪽 두 자리`);
    ok(s.pot === 30 && s.turn === (s.bbSeat + 1) % n, `${n}인 프리플랍 첫 액션은 BB 다음`);
    const seen = new Set([s.dealer]);
    for (let h = 0; h < n; h++) {
      s = P.nextRound(s, 99 + h);
      seen.add(s.dealer);
    }
    ok(seen.size === n, `${n}인 딜러 버튼이 한 바퀴 돎`);
  }
  // 헤즈업: 딜러 = SB 가 프리플랍 먼저
  const h2 = P.create({ players: 2, seed: 1 });
  ok(h2.sbSeat === h2.dealer && h2.turn === h2.dealer, '헤즈업: 딜러가 SB, 먼저 액션');
  // 탈락자: 0칩이면 다음 판에서 빠지고 버튼·블라인드는 남은 사람끼리
  let s = P.create({ players: 4, seed: 12, stacks: [1000, 1000, 1000, 1000] });
  s.phase = 'end'; s.coins = [0, 1000, 1000, 1000]; s.pot = 0; s.result = { kind: 'showdown' };
  const nx = P.nextRound(s, 5);
  ok(nx.out[0] === true && nx.hands[0].length === 0 && nx.folded[0], '칩 0 자리는 탈락(카드 없음)');
  ok(nx.sbSeat !== 0 && nx.bbSeat !== 0 && nx.dealer !== 0, '탈락자는 버튼·블라인드에서 제외');
  // 한 명만 남으면 게임 끝
  let t = P.create({ players: 3, seed: 13 });
  t.phase = 'end'; t.coins = [0, 0, 3000]; t.pot = 0; t.result = { kind: 'showdown' };
  const ov = P.nextRound(t, 5);
  ok(ov.over === true && ov.champion === 2 && ov.result.kind === 'over', '마지막 한 명이 우승');
}

// 12) 8인 AI 대국: 탈락까지 끝까지 (칩 보존, 합법 행동, 사이드 팟 합계)
{
  let totalHands = 0, sideHands = 0, finished = 0, tms = 0;
  for (let g = 0; g < 8; g++) {
    const n = 4 + (g % 5);                                  // 4~8명
    let s = P.create({ players: n, seed: 12000 + g, coins: 200 });
    const total = n * 200;
    let h = 0;
    while (!s.over && h < 150) {
      let guard = 0;
      const t0 = Date.now();
      while (s.phase === 'bet' && guard++ < 200) {
        const act = AI.choose(P.view(s, s.turn), ['easy', 'normal', 'hard'][(g + guard) % 3], { seed: 41 + guard + h });
        ok(P.isLegal(s, act), `8인 대국 ${g} 합법 액션`);
        s = P.step(s, act).state;
      }
      tms += Date.now() - t0;
      ok(s.phase === 'end', `8인 대국 ${g} 핸드 종료`);
      const sum = s.coins.reduce((a, b) => a + b, 0);
      ok(sum === total, `8인 대국 ${g}.${h} 칩 보존 (${sum}/${total})`);
      if (s.result.payouts && s.result.kind === 'showdown') {
        ok(s.result.payouts.reduce((a, b) => a + b, 0) === s.pot, '배당 합 = 팟');
        if (s.result.pots.filter(p => !p.refund).length > 1) sideHands++;
      }
      totalHands++; h++;
      s = P.nextRound(s, 777 + h);
    }
    if (s.over) finished++;
  }
  ok(finished >= 6, `AI 대국 대부분 우승자가 가려짐 (${finished}/8)`);
  ok(sideHands > 0, `사이드 팟이 실제로 생긴 핸드가 있음 (${sideHands}/${totalHands})`);
  ok(tms < 90000, `8인 AI 대국 계산 시간 (${tms}ms)`);
}

// 13) 시점 상태: 내 카드만, 덱·씨앗 없음, 쇼다운 전 남의 카드 비공개
{
  const s = P.create({ players: 8, seed: 21 });
  const v = P.view(s, 3);
  ok(v.deck === undefined && v.seed === undefined, '시점 상태에 덱·씨앗 없음');
  ok(v.hands.every((h, q) => (q === 3 ? h[0] >= 0 && h[1] >= 0 : h[0] === -1 && h[1] === -1)), '남의 홀카드는 비공개');
  // 폴드 승리 시: 승자도 카드 비공개
  let t = P.create({ players: 3, seed: 22 });
  while (t.phase === 'bet') t = P.step(t, P.legal(t).includes(P.A_FOLD) ? P.A_FOLD : P.A_CALL).state;
  const vw = P.view(t, (t.result.winner + 1) % 3);
  ok(t.result.kind === 'foldWin' && vw.result.evals.every(e => e.p === vw.me || e.hidden || !e.hole.length), '폴드 승리: 남의 카드 안 보임');
}

// 14) 8인 코치: 시간 · 범위
{
  const s = P.create({ players: 8, seed: 31 });
  const t0 = Date.now();
  const c = AI.coach(P.view(s, s.turn), s.turn);
  ok(c.equityPct >= 0 && c.equityPct <= 100, '8인 에퀴티 0~100');
  ok(Date.now() - t0 < 500, `8인 코치 계산 500ms 이내 (${Date.now() - t0}ms)`);
}

console.log(`poker selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

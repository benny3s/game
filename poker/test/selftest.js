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

console.log(`poker selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

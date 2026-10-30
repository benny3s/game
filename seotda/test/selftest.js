// 섯다(Seotda) 핵심 족보 · 특수 족보 · 배팅 · AI 일타 강사 자체 시험
// 실행: node seotda/test/selftest.js
const S = require('../core.js');
const AI = require('../ai.js');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) pass++;
  else { fail++; console.error('FAIL:', msg); }
}

// 카드 헬퍼: (month, kind) -> cardId
function findCard(m, k) {
  const c = S.CARDS.find(x => x.m === m && (k ? x.kind === k : true));
  if (!c) throw new Error('card not found: ' + m + ' ' + k);
  return c.id;
}

// 1) 20장 화투 섯다 덱 검증
ok(S.CARDS.length === 20, '섯다 덱 20장');
for (let m = 1; m <= 10; m++) {
  const mCards = S.CARDS.filter(c => c.m === m);
  ok(mCards.length === 2, `${m}월 카드 2장`);
}

// 2) 기본 족보 서열 검증 (38광땡 > 18광땡 > 13광땡 > 장땡 > ... > 1땡 > 알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙 > 갑오 > 8끗~1끗 > 망통)
const c1G = findCard(1, 'G'), c1P = findCard(1, 'T');
const c2Y = findCard(2, 'Y'), c2T = findCard(2, 'T');
const c3G = findCard(3, 'G'), c3P = findCard(3, 'T');
const c4Y = findCard(4, 'Y'), c4T = findCard(4, 'T');
const c7Y = findCard(7, 'Y'), c7T = findCard(7, 'T');
const c8G = findCard(8, 'G'), c8Y = findCard(8, 'Y');
const c9Y = findCard(9, 'Y'), c9T = findCard(9, 'T');
const c10Y = findCard(10, 'Y'), c10T = findCard(10, 'T');

const e38 = S.evalHand(c3G, c8G);
const e18 = S.evalHand(c1G, c8G);
const e13 = S.evalHand(c1G, c3G);
const eJang = S.evalHand(c10Y, c10T);
const e9D = S.evalHand(c9Y, c9T);
const e1D = S.evalHand(c1G, c1P);
const eAli = S.evalHand(c1P, c2T);
const eDoksa = S.evalHand(c1P, c4T);
const eGupping = S.evalHand(c1P, c9T);
const eJangpping = S.evalHand(c1P, c10T);
const eJangsa = S.evalHand(c10T, c4T);
const e6Kkeut = S.evalHand(c4T, c2T); // 4+2=6끗
const eSeryukReal = S.evalHand(c4T, findCard(6, 'T')); // 4월+6월 = 세륙
const eGabo = S.evalHand(c1P, c8Y); // 1+8=9 갑오
const eMangtong = S.evalHand(c2T, c8Y); // 2+8=10 망통

ok(e38.code === '38G' && e38.rank === 3000, '38광땡 3000점');
ok(e18.code === '18G' && e18.rank === 2580, '18광땡 2580점');
ok(e13.code === '13G' && e13.rank === 2530, '13광땡 2530점');
ok(eJang.code === 'D10' && eJang.rank === 2100, '장땡 2100점');
ok(e9D.code === 'D9' && e9D.rank === 2090, '9땡 2090점');
ok(e1D.code === 'D1' && e1D.rank === 2010, '1땡 2010점');
ok(eAli.code === 'alli' && eAli.rank === 1600, '알리 1600점');
ok(eDoksa.code === 'doksa' && eDoksa.rank === 1500, '독사 1500점');
ok(eGupping.code === 'gupping' && eGupping.rank === 1400, '구삥 1400점');
ok(eJangpping.code === 'jangpping' && eJangpping.rank === 1300, '장삥 1300점');
ok(eJangsa.code === 'jangsa' && eJangsa.rank === 1200, '장사 1200점');
ok(eSeryukReal.code === 'seryuk' && eSeryukReal.rank === 1100, '세륙 1100점');
ok(eGabo.code === 'K9' && eGabo.rank === 109, '갑오 109점');
ok(e6Kkeut.code === 'K6' && e6Kkeut.rank === 106, '6끗 106점');
ok(eMangtong.code === 'K0' && eMangtong.rank === 100, '망통 100점');
ok(e38.rank > e18.rank && e18.rank > eJang.rank && eJang.rank > e1D.rank && e1D.rank > eAli.rank && eSeryukReal.rank > eGabo.rank && eGabo.rank > eMangtong.rank, '족보 서열 일관성');

// 3) 특수 족보 판정 검증 (암행어사, 땡잡이, 멍텅구리 구사, 구사)
// 3-1) 암행어사(4열+7열) vs 18광땡 -> 암행어사 승리!
const jAmhaengWin = S.judgeShowdown([
  { p: 0, c1: c4Y, c2: c7Y },
  { p: 1, c1: c1G, c2: c8G },
]);
ok(jAmhaengWin.kind === 'win' && jAmhaengWin.winner === 0, '암행어사가 18광땡 제압');

// 3-2) 암행어사(4열+7열) vs 장땡 -> 광땡이 없으므로 1끗으로 패배!
const jAmhaengLose = S.judgeShowdown([
  { p: 0, c1: c4Y, c2: c7Y },
  { p: 1, c1: c10Y, c2: c10T },
]);
ok(jAmhaengLose.kind === 'win' && jAmhaengLose.winner === 1, '암행어사는 광땡 없으면 1끗 (장땡에 패배)');

// 3-3) 땡잡이(3광+7열) vs 9땡 -> 땡잡이 승리!
const jDdangjabiWin = S.judgeShowdown([
  { p: 0, c1: c3G, c2: c7Y },
  { p: 1, c1: c9Y, c2: c9T },
]);
ok(jDdangjabiWin.kind === 'win' && jDdangjabiWin.winner === 0, '땡잡이가 9땡 제압');

// 3-4) 땡잡이(3광+7열) vs 장땡 -> 장땡은 못 잡고 망통으로 패배!
const jDdangjabiLose = S.judgeShowdown([
  { p: 0, c1: c3G, c2: c7Y },
  { p: 1, c1: c10Y, c2: c10T },
]);
ok(jDdangjabiLose.kind === 'win' && jDdangjabiLose.winner === 1, '땡잡이는 장땡 제압 불가');

// 3-5) 멍텅구리 구사(4열+9열) vs 9땡 -> 재경기(rematch)!
const jMungGusa = S.judgeShowdown([
  { p: 0, c1: c4Y, c2: c9Y },
  { p: 1, c1: c9Y, c2: c9T },
]);
ok(jMungGusa.kind === 'rematch', '멍텅구리 구사는 9땡 이하를 재경기 처리');

// 3-6) 멍텅구리 구사(4열+9열) vs 18광땡 -> 광땡에는 재경기 불가, 광땡 승!
const jMungGusaLose = S.judgeShowdown([
  { p: 0, c1: c4Y, c2: c9Y },
  { p: 1, c1: c1G, c2: c8G },
]);
ok(jMungGusaLose.kind === 'win' && jMungGusaLose.winner === 1, '멍텅구리 구사는 광땡 앞에서 무효');

// 3-7) 일반 구사(4띠+9띠) vs 알리 -> 재경기(rematch)!
const jGusaRematch = S.judgeShowdown([
  { p: 0, c1: c4T, c2: c9T },
  { p: 1, c1: c1P, c2: c2T },
]);
ok(jGusaRematch.kind === 'rematch', '일반 구사는 알리 이하 상대로 재경기');

// 3-8) 일반 구사(4띠+9띠) vs 1땡 -> 땡 이상에는 재경기 불가!
const jGusaLose = S.judgeShowdown([
  { p: 0, c1: c4T, c2: c9T },
  { p: 1, c1: c1G, c2: c1P },
]);
ok(jGusaLose.kind === 'win' && jGusaLose.winner === 1, '일반 구사는 1땡 이상 상대로 재경기 불가');

// 4) 배팅 진행 및 쇼다운/기권 상태 머신 검증
const st1 = S.create({ players: 2, seed: 101 });
ok(st1.phase === 'bet' && st1.street === 1, '초기 상태는 1차 오픈 배팅');
ok(st1.pot === 20, '기본 학교(안테) 10냥씩 총 20냥');
const v0 = S.view(st1, 0);
ok(v0.hands[0][0] >= 0 && v0.hands[0][1] === -1, '1차 배팅 시 내 패도 첫 장만 공개');

// 콜-콜로 2차 배팅 진입
let r = S.step(st1, S.A_CALL);
r = S.step(r.state, S.A_CALL);
ok(r.state.phase === 'bet' && r.state.street === 2, '1차 콜-콜 후 2차 히든 배팅 진입');
const v0Street2 = S.view(r.state, 0);
ok(v0Street2.hands[0][1] >= 0 && v0Street2.hands[1][1] === -1, '2차 배팅 시 내 두 번째 패는 보이고 상대 두 번째 패는 가림');

// 5) AI 일타 강사(coach) 수학적 기댓값 분석 검증
const coachRes = AI.coach(S.view(r.state, r.state.turn), r.state.turn);
ok(coachRes && typeof coachRes.winPct === 'number', 'AI 코치 승률 산출');
ok(coachRes.winPct >= 0 && coachRes.winPct <= 100, '승률 0~100% 범위');
ok(coachRes.byAction && Object.keys(coachRes.byAction).length >= 2, '각 액션별 EV 산출');
ok(typeof coachRes.headline === 'string' && coachRes.headline.length > 5, '한국어 코칭 헤드라인 생성');

// 6) AI 자가 대국 25판 완주 검증
for (let g = 0; g < 25; g++) {
  let s = S.create({ players: 2, seed: 5000 + g });
  let guard = 0;
  while (s.phase !== 'end' && guard++ < 40) {
    const v = S.view(s, s.turn);
    const act = AI.choose(v, g % 2 === 0 ? 'hard' : 'normal', { seed: 900 + guard });
    ok(S.isLegal(s, act), `게임 ${g} 스텝 ${guard} 합법 액션`);
    s = S.step(s, act).state;
  }
  ok(s.phase === 'end' && s.result !== null, `게임 ${g} 정상 종료`);
  const totalCoins = s.coins[0] + s.coins[1] + (s.carryPot || 0);
  ok(totalCoins === 1000, `게임 ${g} 코인 보존 법칙 (총합 ${totalCoins})`);
}

console.log(`seotda selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

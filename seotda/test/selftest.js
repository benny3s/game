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

// 7) 6인 섯다: 20장 중 12장 사용, 패 중복 없음, 시점별 정보 가림
{
  const s6 = S.create({ players: 6, seed: 4242 });
  ok(s6.n === 6 && s6.pot === 60, '6인 학교비 60냥');
  const used = [].concat(...s6.hands);
  ok(used.length === 12 && new Set(used).size === 12, '6인 12장 중복 없음');
  ok(S.create({ players: 9 }).n === 6, '인원 상한 6명');
  const v2 = S.view(s6, 2);
  ok(v2.seed === undefined && v2.deck === undefined, '시점 상태에 덱·씨앗 없음');
  ok(v2.hands.every((h, q) => h[0] === s6.hands[q][0] && h[1] === -1), '1차 배팅: 모두 첫 장만 공개');
  // 2차 배팅 진입 후 내 둘째 장만 보임
  let st = s6;
  for (let i = 0; i < 6; i++) st = S.step(st, S.A_CALL).state;
  ok(st.street === 2 && st.phase === 'bet', '6인 콜 일주 후 2차 배팅');
  const vv = S.view(st, 3);
  ok(vv.hands[3][1] >= 0 && vv.hands.every((h, q) => q === 3 || h[1] === -1), '2차 배팅: 내 둘째 장만 보임');
}

// 8) 여러 명 판정: 땡·광땡·암행어사·땡잡이·구사·동점
{
  const h = (a, b) => ({ c1: a, c2: b });
  const mk = (list) => list.map((x, i) => Object.assign({ p: i }, h(x[0], x[1])));
  const c6Y = findCard(6, 'Y');
  // 6인 중 38광땡이 이김 (장땡·알리 등 섞여 있어도)
  let j = S.judgeShowdown(mk([[c3G, c8G], [c10Y, c10T], [c1P, c2T], [c9Y, c9T], [c4T, c9T], [c2Y, c6Y]]));
  ok(j.kind === 'win' && j.winner === 0, '구사가 있어도 38광땡이 있으면 파토 안 됨');
  j = S.judgeShowdown(mk([[c3G, c8G], [c10Y, c10T], [c1P, c2T], [c9Y, c9T], [c2Y, c6Y]]));
  ok(j.kind === 'win' && j.winner === 0, '다인: 38광땡 최강');
  // 구사 파토: 알리 이하만 있으면 6명이어도 재경기
  j = S.judgeShowdown(mk([[c4T, c9T], [c1P, c2T], [c1P, c4T], [c2Y, c6Y], [c7T, c8Y]]));
  ok(j.kind === 'rematch', '다인: 구사(4·9) + 알리 이하 → 파토');
  // 땡잡이: 9땡·3땡이 있어도 장땡 없으면 땡잡이가 이김
  const c5Y = findCard(5, 'Y'), c5T = findCard(5, 'T');
  j = S.judgeShowdown(mk([[c3G, c7Y], [c9Y, c9T], [c5Y, c5T], [c1P, c2T]]));
  ok(j.kind === 'win' && j.winner === 0, '다인: 땡잡이가 9땡·5땡을 잡음');
  j = S.judgeShowdown(mk([[c3G, c7Y], [c9Y, c9T], [c10Y, c10T]]));
  ok(j.kind === 'win' && j.winner === 2, '다인: 장땡이 있으면 장땡 승');
  // 암행어사 vs 13광땡·알리
  j = S.judgeShowdown(mk([[c4Y, c7Y], [c1G, c3G], [c1P, c2T], [c9Y, c9T]]));
  ok(j.kind === 'win' && j.winner === 0, '다인: 암행어사가 13광땡을 잡음 (9땡도 이김)');
  // 동점 → 재경기 (같은 끗 두 명 + 약한 패)
  const c2Y_ = findCard(2, 'Y'), c8Y_ = findCard(8, 'Y'), c1Pt = findCard(1, 'T'), c3Pt = findCard(3, 'T'), c6Pt = findCard(6, 'T');
  j = S.judgeShowdown(mk([[c1Pt, c8Y_], [c3Pt, c6Pt], [c2Y_, c4T]]));      // 9끗, 9끗, 6끗
  ok(j.kind === 'rematch' && j.winners.length === 2, '다인: 최고 끗 동점 → 재경기');
}

// 9) 사이드 팟 (buildPots)
{
  let pots = S.buildPots([100, 100, 100], [true, true, true]);
  ok(pots.length === 1 && pots[0].amount === 300 && pots[0].elig.length === 3, '사이드 팟: 모두 같으면 한 팟');
  pots = S.buildPots([50, 100, 100], [true, true, true]);
  ok(pots.length === 2 && pots[0].amount === 150 && pots[0].elig.length === 3 && pots[1].amount === 100 && pots[1].elig.join() === '1,2', '사이드 팟: 50 올인 → 메인 150 + 사이드 100');
  pots = S.buildPots([50, 100, 200], [true, true, true]);
  ok(pots.length === 3 && pots[2].refund === true && pots[2].amount === 100, '아무도 안 받아 준 100은 돌려줌');
  pots = S.buildPots([40, 100, 100, 100], [true, false, true, true]);          // 1번은 다이: 죽은 돈은 메인에 포함, 자격 없음
  ok(pots[0].amount === 160 && pots[0].elig.join() === '0,2,3' && pots[1].elig.join() === '2,3', '다이한 사람 돈은 팟에 남고 자격은 없음');
}

// 10) 짧은 스택 올인: 코인이 모자란 사람이 이겨도 자기 몫까지만
{
  let s = S.create({ players: 3, seed: 31, stacks: [40, 500, 500] });
  s.hands = [[c10Y, c10T], [c9Y, c9T], [c1P, c2T]];     // 0번 장땡, 1번 9땡, 2번 알리
  s.turn = 1;                                          // 1번부터
  let r = S.step(s, S.A_HALF); s = r.state;
  s = S.step(s, S.A_CALL).state;                       // 2번 콜
  s = S.step(s, S.A_CALL).state;                       // 0번 (40 코인뿐) 올인 콜
  ok(s.street === 2 || s.phase === 'end', '짧은 스택 콜 후 진행');
  let guard = 0;
  while (s.phase === 'bet' && guard++ < 30) {
    const L = S.legal(s);
    s = S.step(s, L.includes(S.A_QUARTER) && s.turn !== 0 ? S.A_QUARTER : S.A_CALL).state;
  }
  ok(s.phase === 'end', '짧은 스택 판 종료');
  const total = s.coins.reduce((a, b) => a + b, 0) + s.carryPot;
  ok(total === 1040, `짧은 스택 판 코인 보존 (${total})`);
  ok(s.result.kind === 'showdown' && s.result.winner === 0, '장땡이 메인 팟 승');
  ok(s.result.payouts[0] <= s.bets[0] * 3, '짧은 스택 승자의 몫은 자기가 낸 만큼의 3배(3명)까지');
  ok(s.result.payouts[1] > 0, '사이드 팟은 남은 사람 중 최고(9땡)에게');
}

// 11) 6인 AI 대국 60판 — 합법 행동, 정상 종료, 코인 보존, 시간
{
  let tTotal = 0, rematches = 0;
  for (let g = 0; g < 60; g++) {
    const n = 3 + (g % 4);                               // 3~6인
    let s = S.create({ players: n, seed: 9000 + g });
    const total = n * 500;
    let guard = 0;
    const t0 = Date.now();
    while (s.phase !== 'end' && guard++ < 120) {
      const v = S.view(s, s.turn);
      const act = AI.choose(v, ['easy', 'normal', 'hard'][g % 3], { seed: 77 + guard });
      ok(S.isLegal(s, act), `다인 게임 ${g} 합법 액션`);
      s = S.step(s, act).state;
    }
    tTotal += Date.now() - t0;
    ok(s.phase === 'end' && s.result, `다인 게임 ${g} (${n}인) 정상 종료`);
    const sum = s.coins.reduce((a, b) => a + b, 0) + s.carryPot;
    ok(sum === total, `다인 게임 ${g} 코인 보존 (${sum}/${total})`);
    if (s.result.kind === 'rematch') {
      rematches++;
      const nx = S.nextRound(s, { seed: 1 });
      ok(nx.pot >= s.carryPot, '재경기 판돈 이월');
    }
  }
  ok(tTotal < 60000, `다인 AI 대국 시간 (${tTotal}ms)`);
}

// 12) 다인 AI 선생님(코치): 6인 1차·2차 배팅 모두 계산됨
{
  let s = S.create({ players: 6, seed: 808 });
  const c1 = AI.coach(S.view(s, s.turn), s.turn);
  ok(c1.winPct >= 0 && c1.winPct <= 100 && c1.headline.length > 5, '6인 1차 코치');
  for (let i = 0; i < 6; i++) s = S.step(s, S.A_CALL).state;
  const c2 = AI.coach(S.view(s, s.turn), s.turn);
  ok(c2.winPct >= 0 && c2.winPct <= 100 && Object.keys(c2.byAction).length >= 2, '6인 2차 코치');
  const t0 = Date.now(); AI.coach(S.view(s, s.turn), s.turn);
  ok(Date.now() - t0 < 300, '6인 코치 계산 300ms 이내');
}

console.log(`seotda selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

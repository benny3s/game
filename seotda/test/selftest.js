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

// 12) 전체 판정이 재경기(구사·동점)여도 사이드 팟은 층마다 따로 판정 — 소액 올인자와 무관한 층은 승자에게 지급
{
  const c6Y = findCard(6, 'Y');
  const run = (hands) => {
    let s = S.create({ players: 3, seed: 31, stacks: [40, 500, 500] });
    s.hands = hands.map(h => h.slice());
    s.turn = 1;
    s = S.step(s, S.A_HALF).state;
    s = S.step(s, S.A_CALL).state;
    s = S.step(s, S.A_CALL).state;
    let guard = 0;
    while (s.phase === 'bet' && guard++ < 30) {
      const L = S.legal(s);
      s = S.step(s, L.includes(S.A_QUARTER) && s.turn !== 0 ? S.A_QUARTER : S.A_CALL).state;
    }
    return s;
  };
  // 0번(40냥 올인) 구사 → 메인 팟은 파토, 1번 갑오 vs 2번 8끗 사이드 팟은 1번이 가져가야 함
  let s = run([[c4T, c9T], [c1P, c8Y], [c2T, c6Y]]);
  ok(s.phase === 'end', '구사 + 사이드 팟 판 종료');
  ok(s.coins.reduce((a, b) => a + b, 0) + s.carryPot === 1040, `구사 + 사이드 팟 코인 보존 (${s.coins} + 이월 ${s.carryPot})`);
  ok(s.result.payouts[1] > 0 && s.result.payouts[0] === 0 && s.result.payouts[2] === 0, `사이드 팟 승자(1번)는 받음 (${s.result.payouts})`);
  ok(s.carryPot === 3 * s.bets[0] && s.result.carry === s.carryPot, `메인 팟만 이월 (${s.carryPot} / 3×${s.bets[0]})`);
  ok(s.result.kind === 'showdown' && s.result.winners.join() === '1', '사이드 팟 승자가 있으면 showdown 결과');
  // 1·2번이 같은 끗(갑오) 동점 → 사이드 팟도 동점이라 전부 이월, 결과는 rematch
  s = run([[c2T, c4T], [c1P, c8Y], [c3P, c6Y]]);
  ok(s.phase === 'end' && s.result.kind === 'rematch', '사이드 팟 승자 없음: 재경기 결과');
  ok(s.coins.reduce((a, b) => a + b, 0) + s.carryPot === 1040 && s.carryPot > 0, `전부 이월 코인 보존 (${s.coins} + 이월 ${s.carryPot})`);
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

// 13) 🧑‍🏫 선생님 흐름 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠음 → 👀 상대 흐름 · 📊 내 흐름 · 👉 수의 의미)
//     모두에게 보인 것(행동·오픈패·내 패)만 씀 — 상대의 숨은 둘째 장은 이름을 부르면 안 됨
{
  ok(typeof AI.noteAct === 'function' && typeof AI.flow === 'function', '흐름 API (noteAct · flow) 가 있음');
  if (typeof AI.noteAct === 'function' && typeof AI.flow === 'function') {
    const c3T = findCard(3, 'T'), c4Tt = findCard(4, 'T'), c10Yy = findCard(10, 'Y'), c10Tt = findCard(10, 'T');
    const c5Y = findCard(5, 'Y'), c6Yy = findCard(6, 'Y'), c2Yy = findCard(2, 'Y');
    const names = ['나', '짝귀', '독사'];
    // 내 7끗(3월+4월) · 짝귀 장땡 · 독사 5월+6월: 1차 모두 콜 → 2차 내가 체크, 짝귀 따당, 독사 콜 → 다시 내 차례
    const play = (hands, acts) => {
      let s = S.create({ players: 3, seed: 7 });
      s.hands = hands.map(h => h.slice()); s.turn = 0;
      const hist = [];
      for (const a of acts) { hist.push(AI.noteAct(s, a)); s = S.step(s, a).state; }
      return { s, hist };
    };
    const H = [[c3T, c4Tt], [c10Yy, c10Tt], [c5Y, c6Yy]];
    const A = [S.A_CALL, S.A_CALL, S.A_CALL, S.A_CALL, S.A_DDADANG, S.A_CALL];
    const g = play(H, A);
    ok(g.s.street === 2 && g.s.turn === 0 && g.s.phase === 'bet', '흐름 시나리오: 2차 배팅에서 다시 내 차례');
    ok(g.hist.length === 6 && g.hist[4].p === 1 && g.hist[4].a === S.A_DDADANG && g.hist[4].s === 2, 'noteAct 가 차례마다 공개된 값을 적음');
    const v = S.view(g.s, 0);
    const f = AI.flow(v, 0, g.hist, names);
    ok(f && Array.isArray(f.opp) && f.opp.length >= 1, '👀 상대 흐름 줄이 있음');
    const oppTxt = f && f.opp ? f.opp.map(o => o.text).join(' / ') : '';
    ok(/짝귀/.test(oppTxt) && /따당/.test(oppTxt), '👀 짝귀의 따당을 말함: ' + oppTxt);
    ok(/강|센|블러/.test(oppTxt), '👀 따당이 뜻하는 바(강한 패 · 블러핑)를 말함');
    ok(/독사/.test(oppTxt) && /콜/.test(oppTxt), '👀 독사의 콜도 (자세히 또는 한 줄로) 나옴');
    ok(f && /7끗/.test(f.mine), '📊 내 패 7끗: ' + (f && f.mine));
    ok(f && /\d+%/.test(f.mine) && /(중간|약|강)/.test(f.mine), '📊 내 패 세기 말 + 승률');
    ok(f && /^👉/.test(f.why) && f.why.length > 12, '👉 수의 의미 줄: ' + (f && f.why));
    const best = AI.coach(v, 0).bestAction;
    ok(f && (best !== S.A_FOLD || /짝귀/.test(f.why)), '👉 다이 추천이면 상대(짝귀) 신호를 까닭으로 이음: ' + (f && f.why));
    // 숨은 패 이름이 새지 않음 (짝귀·독사의 둘째 장), 그리고 숨은 패가 달라도 같은 장면이면 같은 글
    const all = f ? [oppTxt, f.mine, f.why].join('\n') : '';
    ok(!all.includes(S.cardName(c10Tt)) && !all.includes(S.cardName(c6Yy)), '숨은 패 이름이 글에 없음');
    const H2 = [[c3T, c4Tt], [c10Yy, c2Yy], [c5Y, c6Yy]];            // 짝귀의 숨은 둘째 장만 다름 (같은 행동)
    const g2 = play(H2, A), f2 = AI.flow(S.view(g2.s, 0), 0, g2.hist, names);
    ok(JSON.stringify(S.view(g2.s, 0)) === JSON.stringify(v), '시점이 같음 (숨은 둘째 장은 내 눈에 안 보임)');
    ok(JSON.stringify(f2) === JSON.stringify(f), '상대 숨은 패가 달라도 선생님 글은 같음');
    // '내 지난 차례 뒤' 만: 내 행동 앞의 짝귀 따당은 빠지고, 뒤의 독사 콜만 남음
    const fx = AI.flow(v, 0, [g.hist[4], g.hist[3], g.hist[5]], names);
    const tx = fx.opp.map(o => o.text).join(' / ');
    ok(!/짝귀/.test(tx) && /독사/.test(tx), '👀 내 지난 차례 앞의 행동은 빼고 뒤만: ' + tx);
    // 아까 승률과 달라지면 📊 에 '아까 N% 에서' 를 붙임
    const fp = AI.flow(v, 0, g.hist, names, undefined, 60);
    ok(/아까 60%에서 내려/.test(fp.mine), '📊 승률 변화(아까 60% → 지금): ' + fp.mine);
    ok(!/아까/.test(f.mine), '아까 값이 없으면 변화 말은 안 붙임');
    // 1차(둘째 장 받기 전) 행동은 패 단서가 없다고 말함
    const g1 = play(H, [S.A_CALL, S.A_HALF, S.A_CALL]);              // 나 콜 → 짝귀 하프 → 독사 콜 → 다시 내 차례 (1차)
    const f1 = AI.flow(S.view(g1.s, 0), 0, g1.hist, names);
    const t1 = f1 && f1.opp ? f1.opp.map(o => o.text).join(' ') : '';
    ok(f1 && g1.s.street === 1 && /짝귀/.test(t1) && /하프/.test(t1) && /둘째 장|단서/.test(t1), '1차 흐름: 둘째 장 전이라 패 단서가 없다고 말함: ' + t1);
    // 아직 아무도 안 움직였을 때
    const f0 = AI.flow(S.view(play(H, []).s, 0), 0, [], names);
    ok(f0 && f0.opp.length === 0 && /^📊/.test(f0.mine) && /^👉/.test(f0.why), '내가 먼저일 때도 📊 · 👉 은 나옴');
    ok(f0 && /첫 장|오픈|3월/.test(f0.mine), '1차 📊 은 첫 장 이야기: ' + (f0 && f0.mine));
  }
}

// 14) 선생님 흐름 무작위 대국: 6인까지 매 차례 → 항상 📊 · 👉, 숨은 패 이름 없음, 빠름
if (typeof AI.noteAct === 'function' && typeof AI.flow === 'function') {
  let leaks = 0, calls = 0, bad = 0, tMax = 0, haveOpp = 0, haveRead = 0;
  for (let g = 0; g < 24; g++) {
    const n = 2 + (g % 5);
    let s = S.create({ players: n, seed: 3100 + g });
    const hist = [], names = Array.from({ length: n }, (_, i) => (i ? 'AI' + i : '나'));
    let guard = 0;
    while (s.phase === 'bet' && guard++ < 80) {
      const p = s.turn, v = S.view(s, p);
      if (p === 0) {
        const t0 = Date.now(), f = AI.flow(v, 0, hist, names), dt = Date.now() - t0;
        tMax = Math.max(tMax, dt); calls++;
        const txt = [].concat(f.opp.map(o => o.text), f.mine, f.why).join('\n');
        for (let q = 1; q < n; q++) if (s.hands[q][1] >= 0 && txt.includes(S.cardName(s.hands[q][1]))) leaks++;
        if (!/^📊/.test(f.mine) || !/^👉/.test(f.why) || /undefined|NaN|null/.test(txt)) bad++;
        if (f.opp.length) haveOpp++;
        if (f.opp.some(o => o.read)) haveRead++;
      }
      const a = p === 0 ? (g % 3 === 0 ? S.A_CALL : AI.choose(v, 'normal', { seed: 11 + guard })) : AI.choose(v, ['easy', 'normal', 'hard'][(g + p) % 3], { seed: 5 + guard });
      hist.push(AI.noteAct(s, S.isLegal(s, a) ? a : S.A_CALL));
      s = S.step(s, a).state;
    }
  }
  ok(calls > 20, `흐름 무작위 대국에서 내 차례 ${calls}번 읽음`);
  ok(leaks === 0, `숨은 패 이름이 글에 샌 곳 ${leaks}`);
  ok(bad === 0, `줄 모양 · undefined/NaN 이상한 곳 ${bad}`);
  ok(haveOpp > 5 && haveRead > 0, `상대 흐름 줄 ${haveOpp}번 · 그 중 패 짐작 ${haveRead}번`);
  ok(tMax < 700, `흐름 계산 한 번 최대 ${tMax}ms`);
} else ok(false, '흐름 무작위 대국을 못 돌림 (flow 없음)');

console.log(`seotda selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

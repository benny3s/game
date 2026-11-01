// 베니캐치 규칙 시험: node catch/test/selftest.js
const C = require('../core.js');
const W = require('../../draw/words.js');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✘', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// 정답 판정
eq(C.judge('고양이', '고양이'), 'hit', '똑같음');
eq(C.judge(' 고 양 이!! ', '고양이'), 'hit', '띄어쓰기·느낌표');
eq(C.judge('고양이ㅋㅋ', '고양이'), 'hit', 'ㅋㅋ 붙임');
eq(C.judge('선물상자', '선물 상자'), 'hit', '띄어쓰기 없는 답');
eq(C.judge('고얌이', '고양이'), 'close', '한 글자 다름');
eq(C.judge('고양', '고양이'), 'close', '한 글자 모자람');
eq(C.judge('강아지', '고양이'), 'miss', '다른 말');
eq(C.judge('곰', '공'), 'miss', '한 글자 말은 아까워요 없음');
eq(C.judge('', '고양이'), 'miss', '빈 답');
eq(C.judge('ABC', 'abc'), 'hit', '대소문자');
ok(C.leaks('정답은 고양이야', '고양이'), '채팅에 답 들어 있음');
ok(!C.leaks('귀엽다', '고양이'), '답 없는 채팅');

// 힌트
eq(C.hintOf('고양이', 0), '○○○', '힌트 0');
eq(C.hintOf('고양이', 1), 'ㄱㅇㅇ', '힌트 1 초성');
eq(C.hintOf('고양이', 2), '고ㅇㅇ', '힌트 2 첫 글자');
eq(C.hintOf('선물 상자', 2), '선ㅁ ㅅㅈ', '띄어쓰기 유지');
eq(C.hintOf('곰', 2), 'ㄱ', '한 글자는 초성까지');
eq(C.hintOf('달력', 2), 'ㄷㄹ', '두 글자는 초성까지');
eq(C.hintLevel(80, 80), 0, '처음');
eq(C.hintLevel(50, 80), 1, '37% 지남');
eq(C.hintLevel(20, 80), 2, '75% 지남');

// 한 판: 3명 · 1바퀴
const G = C.create(3, { sec: 80, rounds: 1 });
eq(G.turns, 3, '차례 수');
eq(C.startTurn(G, 0, ['고양이', '붕어빵', '우주선']), 0, '0번 차례 그림');
ok(C.choose(G, 1), '고르기');
eq(G.word, '붕어빵', '고른 말');
eq(C.guess(G, 0, '붕어빵', 70).kind, 'hide', '그린 사람이 답을 말하면 가림');
eq(C.guess(G, 0, '힌트 줄게', 70).kind, 'chat', '그린 사람 채팅');
eq(C.guess(G, 1, '잉어빵', 70).kind, 'close', '아까워요');
const h1 = C.guess(G, 1, '붕어빵', 80);
eq(h1, { kind: 'hit', pts: 100 }, '첫 정답·시간 꽉 참 = 60+40');
eq(C.guess(G, 1, '붕어빵 맞지', 70).kind, 'hide', '맞힌 사람이 답 흘리면 가림');
eq(C.guess(G, 1, '와 잘 그렸다', 70).kind, 'chat', '맞힌 사람 채팅');
ok(!C.allGot(G), '아직 다 안 맞힘');
ok(C.allGot(G, [2]), '나간 사람 빼면 다 맞힘');
const h2 = C.guess(G, 2, '붕어빵', 40);
eq(h2.pts, 50 + 20, '둘째 정답·절반 남음');
ok(C.allGot(G), '다 맞힘');
eq(G.scores, [40, 100, 70], '점수 (그린 사람 20×2)');
const hist = C.endTurn(G);
eq(hist, { d: 0, w: '붕어빵', got: [1, 2], gain: [40, 100, 70] }, '차례 기록');
eq(C.guess(G, 2, '붕어빵', 10).kind, 'chat', '정답 공개 뒤엔 채팅');
ok(!C.isLast(G), '마지막 아님');
// 1번 차례: 아무도 못 맞힘 · 시간 끝나 자동 첫 말
C.startTurn(G, 1, ['달력', '김장', '폭죽']);
eq(G.drawer, 1, '1번 그림');
eq(C.endTurn(G).w, '달력', '안 골랐으면 첫 말로 기록');
// 2번 차례: 한 기기 award
C.startTurn(G, 2, ['송편', '한복', '떡국']); C.choose(G, 0);
eq(C.award(G, 0, 0), 60, '한 기기 맞힘 (시간 0)');
eq(C.award(G, 0, 0), 0, '두 번은 안 줌');
eq(C.award(G, 2, 50), 0, '그린 사람은 못 받음');
C.endTurn(G);
ok(C.isLast(G), '마지막 차례');
eq(G.scores, [100, 100, 90], '끝 점수');
const st = C.finish(G);
eq(st.map(r => [r.i, r.rank]), [[0, 1], [1, 1], [2, 3]], '동점은 같은 등수');
eq(C.rankInfo(G.scores, 0), { res: 'w', beat: 1, score: 100, opp: [{ idx: 1, res: 'd' }, { idx: 2, res: 'w' }] }, '랭킹 기록 (동점 1등)');
eq(C.rankInfo(G.scores, 2).res, 'l', '3등은 l');
eq(C.rankInfo([0, 0, 0], 0), null, '아무도 점수 없으면 기록 안 함');

// 바퀴 · 그리는 순서
const G2 = C.create(4, { sec: 60, rounds: 2 });
eq(G2.turns, 8, '4명 2바퀴');
eq([0, 1, 2, 3, 4, 5, 6, 7].map(k => C.drawerOf(G2, k)), [0, 1, 2, 3, 0, 1, 2, 3], '그리는 순서');
eq(C.roundOf(G2, 5), 2, '바퀴 번호');
eq(C.create(3, { sec: 33, rounds: 9 }).cfg, { sec: 80, rounds: 1 }, '이상한 설정은 기본값');

// 제시어 목록: 모두 판정·힌트가 되는지
for (const w of W.all) {
  ok(C.judge(w, w) === 'hit', '제시어 자기 자신 정답: ' + w);
  ok(Array.from(C.hintOf(w, 0)).length === Array.from(w).length, '힌트 길이: ' + w);
}
// 무작위 판 200개: 점수 합 = 맞힌 사람 점수 + 20×맞힌 수, 음수 없음
let rnd = 7; const R = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let t = 0; t < 200; t++) {
  const n = 2 + Math.floor(R() * 7), g = C.create(n, { sec: 80, rounds: 1 + Math.floor(R() * 3) });
  let expect = 0;
  for (let k = 0; k < g.turns; k++) {
    C.startTurn(g, k, W.pick3(R).map(x => x.w)); C.choose(g, Math.floor(R() * 3));
    for (let p = 0; p < n; p++) { const r = C.guess(g, p, R() < 0.5 ? g.word : '아무말', Math.floor(R() * 81)); if (r.kind === 'hit') expect += r.pts + 20; }
    C.endTurn(g);
  }
  ok(g.scores.reduce((a, b) => a + b, 0) === expect, '점수 합 ' + t);
  ok(g.scores.every(s => s >= 0), '음수 없음 ' + t);
  ok(g.hist.length === g.turns, '기록 수 ' + t);
}
console.log(`${fail ? '✘' : '✔'} 베니캐치 selftest: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);

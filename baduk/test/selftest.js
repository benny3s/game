/* 바둑 자기 시험: node game/baduk/test/selftest.js  (2분 안)
   1) 규칙 단위 시험  2) Sabaki go-board(MIT) 와 무작위 대국 비교  3) 결정성(같은 수 → 같은 해시)
   4) 집 계산  5) 강화학습 입력·대칭  6) 신경망(있으면) 입력·출력 확인  7) AI 끼리 대국 통계 */
"use strict";
const path = require("path");
const B = require(path.join(__dirname, "..", "core.js"));
const SabakiBoard = require(path.join(__dirname, "vendor", "sabaki-go-board.js"));
const t0 = Date.now();
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log("  ✗ " + name); } };
const section = name => console.log("\n■ " + name);
const xy = (N, x, y) => y * N + x;

// 판 그림으로 상태 만들기: 'X' 흑, 'O' 백, '.' 빈칸 (위 줄부터). 다음 차례 지정
function fromPic(rows, toPlay = B.BLACK, opt = {}) {
  const N = rows.length, s = B.create({ size: N, ...opt });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = rows[y][x]; s.board[xy(N, x, y)] = ch === "X" ? B.BLACK : ch === "O" ? B.WHITE : 0;
  }
  s.toPlay = toPlay; return s;
}
const run = (s, moves) => { for (const a of moves) { const r = B.play(s, a); if (r.state === s) throw new Error("illegal " + a); s = r.state; } return s; };

section("규칙");
{
  // 가운데 돌 하나 따내기
  let s = fromPic([".....", "..O..", ".X.X.", "..X..", "....."]);
  let r = B.play(s, xy(5, 2, 1 - 1 + 0));               // (2,0) 에 두면 백 (2,1) 단수 → 먼저 확인용
  ok(r.state !== s, "빈 곳에 둘 수 있음");
  s = fromPic([".....", ".XO..", ".OXO.", "..O..", "....."], B.WHITE);
  ok(!B.isLegal(fromPic([".....", ".XO..", ".O.O.", "..O..", "....."], B.BLACK), xy(5, 2, 2)), "둘러싸인 빈칸은 자충");
  // 자충 금지: 흑이 백 돌로 둘러싸인 빈칸에 두기
  s = fromPic([".O...", "O....", ".....", ".....", "....."], B.BLACK);
  ok(!B.isLegal(s, xy(5, 0, 0)), "모서리 자충 금지");
  // 여러 점 자충 금지
  s = fromPic(["XO...", ".O...", "OO...", ".....", "....."], B.BLACK);
  ok(!B.isLegal(s, xy(5, 0, 1)), "두 점 자충 금지");
  // 자충처럼 보여도 따내면 됨
  s = fromPic([".X...", "XO...", ".X...", ".....", "....."], B.WHITE);
  s.board[xy(5, 1, 1)] = B.WHITE;
  s = fromPic(["OX...", "X....", ".....", ".....", "....."], B.WHITE);
  ok(B.isLegal(fromPic([".XO..", "X.XO.", ".XO..", ".....", "....."], B.WHITE), xy(5, 1, 1)), "따내는 수는 자충이어도 됨");
  // 따내기: 귀의 백 한 점
  s = fromPic(["OX...", ".....", ".....", ".....", "....."], B.BLACK);
  r = B.play(s, xy(5, 0, 1));
  ok(r.state.board[0] === 0 && r.state.caps[B.BLACK] === 1, "귀 따내기 + 따낸 수");
  ok(r.events.some(e => e.type === "capture" && e.points.length === 1 && e.points[0] === 0), "따냄 이벤트");
  // 무리 따내기
  s = fromPic([".XX..", "XOOX.", ".XX..", ".....", "....."], B.BLACK);
  r = B.play(s, xy(5, 0, 0));
  ok(r.state.board[0] === B.BLACK, "귀 둠");
  s = fromPic(["XOOX.", ".XX..", ".....", ".....", "....."], B.BLACK);
  ok(s.board[1] === B.WHITE, "준비");
  s = fromPic([".OOX.", "XXX..", ".....", ".....", "....."], B.BLACK);
  r = B.play(s, 0);
  ok(r.state.board[1] === 0 && r.state.board[2] === 0 && r.state.caps[B.BLACK] === 2, "두 점 따내기");
  // 패: 따내고 바로 되따내기 금지, 한 수 쉬면 가능
  s = fromPic([".....", ".XO..", "X.XO.", ".XO..", "....."], B.WHITE);
  r = B.play(s, xy(5, 1, 2));                            // 백이 (1,2) 에 둬서 흑 (2,2) 따냄
  ok(r.state.board[xy(5, 2, 2)] === 0 && r.state.ko === xy(5, 2, 2), "패 자리 표시");
  ok(!B.isLegal(r.state, xy(5, 2, 2)), "패 바로 되따내기 금지");
  ok(r.events.some(e => e.type === "ko"), "패 이벤트");
  let s2 = run(r.state, [xy(5, 4, 4), xy(5, 4, 0)]);     // 팻감 주고받기
  ok(B.isLegal(s2, xy(5, 2, 2)), "한 수 뒤 되따내기 가능");
  // 환격(되따내기): 한 점이 아니라 두 점을 되따내므로 패 아님
  s = fromPic(["..XO.", ".XO.O", ".XO..", "..XO.", "....."], B.WHITE);
  ok(B.isLegal(s, xy(5, 3, 1)), "준비2");
  // 패스 두 번이면 끝
  s = B.create({ size: 9 });
  s = run(s, [81, 81]);
  ok(s.over && s.end.reason === "pass", "패스 두 번 → 끝");
  ok(!B.isLegal(s, 40), "끝난 판엔 못 둠");
  // 기권
  s = B.play(B.create({ size: 9 }), -1).state;
  ok(s.over && s.end.winner === B.WHITE, "흑 기권 → 백 승");
  // 접바둑: 4점, 백 먼저, 덤 0.5
  s = B.create({ size: 19, handicap: 4 });
  ok(s.toPlay === B.WHITE && s.komi === 0.5 && s.setup.length === 4 && s.board[xy(19, 3, 3)] === B.BLACK, "접바둑 4점");
  ok(B.create({ size: 13, handicap: 9 }).setup.length === 9, "13줄 9점");
  // 되돌리기
  s = run(B.create({ size: 9 }), [40, 41, 49, 50]);
  const back = B.undo(s, 2);
  ok(B.hash(back) === B.hash(run(B.create({ size: 9 }), [40, 41])), "되돌리기 = 그 수까지 다시 둔 판");
  // 초패(켰을 때): 같은 판이 다시 나오면 금지
  s = B.create({ size: 9, superko: true });
  s = run(s, [40]);
  const fake = { ...s, hashes: s.hashes.concat([]) };
  const b = B.toBoard(fake), nb = b.clone(); nb.play(nb.ix(41), B.WHITE);
  fake.hashes = fake.hashes.concat([(nb.h1 >>> 0).toString(36) + "." + (nb.h2 >>> 0).toString(36)]);
  ok(!B.isLegal(fake, 41) && B.isLegal(fake, 42), "초패 금지");
  // 단수 이벤트
  s = fromPic([".....", ".XOX.", ".....", ".....", "....."], B.BLACK);
  r = B.play(s, xy(5, 2, 0));
  ok(r.events.some(e => e.type === "atari" && e.points[0] === xy(5, 2, 1)), "단수 이벤트");
}

section("Sabaki go-board 와 무작위 대국 비교");
{
  const rnd = B.mulberry32(12345);
  let moves = 0, games = 0, mism = 0;
  for (const N of [5, 7, 9, 9, 9, 13, 19]) {
    for (let g = 0; g < (N === 19 ? 6 : 30); g++) {
      games++;
      let s = B.create({ size: N, komi: 6.5 });
      let sb = new SabakiBoard(Array.from({ length: N }, () => Array(N).fill(0)));
      for (let k = 0; k < N * N * 2 && !s.over; k++) {
        const m = B.legal(s), sign = s.toPlay === B.BLACK ? 1 : -1;
        // 둘 수 있는 곳 비교 (Sabaki: 자충·패 금지)
        for (let p = 0; p < N * N; p++) {
          if (s.board[p]) continue;
          const an = sb.analyzeMove(sign, [p % N, (p / N) | 0]);
          const sLegal = !an.suicide && !an.ko;
          if (sLegal !== !!m[p]) { mism++; if (mism < 5) console.log("  legal mismatch", N, p, sLegal, m[p]); }
        }
        const cand = []; for (let p = 0; p < N * N; p++) if (m[p]) cand.push(p);
        const a = cand.length && rnd() < 0.97 ? cand[Math.floor(rnd() * cand.length)] : N * N;
        if (a === N * N) { s = B.play(s, a).state; continue; }
        sb = sb.makeMove(sign, [a % N, (a / N) | 0], { preventSuicide: true, preventKo: true });
        s = B.play(s, a).state; moves++;
        let same = true;
        for (let p = 0; p < N * N && same; p++) { const v = sb.signMap[(p / N) | 0][p % N]; if ((v === 1 ? 1 : v === -1 ? 2 : 0) !== s.board[p]) same = false; }
        if (!same || sb.getCaptures(1) !== s.caps[1] || sb.getCaptures(-1) !== s.caps[2]) { mism++; if (mism < 5) console.log("  board mismatch", N, k); break; }
      }
    }
  }
  ok(mism === 0, `판·둘 곳 불일치 0 (대국 ${games}판, ${moves}수)`);
  console.log(`  대국 ${games}판 · ${moves}수 비교, 불일치 ${mism}`);
}

section("결정성");
{
  const playRandom = seed => {
    const r = B.mulberry32(seed); let s = B.create({ size: 9 });
    while (!s.over) { const m = B.legal(s), c = []; for (let p = 0; p < 81; p++) if (m[p]) c.push(p); s = B.play(s, c.length && r() < 0.98 ? c[Math.floor(r() * c.length)] : 81).state; }
    return s;
  };
  const a = playRandom(7), b2 = playRandom(7), c = playRandom(8);
  ok(B.hash(a) === B.hash(b2), "같은 씨앗 → 같은 해시");
  ok(B.hash(a) !== B.hash(c), "다른 씨앗 → 다른 해시");
  const j = JSON.parse(JSON.stringify(B.toJSON(a)));
  ok(B.hash(B.fromJSON(j)) === B.hash(a), "JSON 왕복");
  ok(B.hash(B.replay(a, a.moves)) === B.hash(a), "기록 다시 두기 = 같은 판");
  const sgf = B.toSGF(a, { result: "B+R" }), back = B.fromSGF(sgf);
  ok(back.moves.length === a.moves.length && Array.from(back.board).join() === Array.from(a.board).join(), "SGF 왕복");
}

section("집 계산");
{
  // 흑이 왼쪽, 백이 오른쪽을 나눠 가진 9줄 판
  const rows = [];
  for (let y = 0; y < 9; y++) rows.push("...X.O...".replace(/\./g, (m, i) => "."));
  const s = fromPic([
    "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....",
  ], B.BLACK, { komi: 6.5 });
  const a = B.scoreArea(s);
  ok(a.black === 36 && a.white === 45 + 6.5, `면적 계산 흑 36 · 백 45+6.5 (지금 ${a.black} · ${a.white})`);
  const k = B.scoreKorean(s, []);
  ok(k.terrB === 27 && k.terrW === 36 && k.winner === B.WHITE, `한국식 집 흑 27 · 백 36 (지금 ${k.terrB} · ${k.terrW})`);
  // 사석: 흑 집 안 백 한 점을 사석으로
  const s2 = fromPic([
    "...XO....", ".O.XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....", "...XO....",
  ], B.BLACK, { komi: 6.5 });
  const k2 = B.scoreKorean(s2, [xy(9, 1, 1)]);
  ok(k2.terrB === 27 && k2.capsB === 1 && k2.black === 28, `사석 처리 흑 집 27 + 사석 1 (지금 ${k2.terrB} + ${k2.capsB})`);
  ok(B.region(s2, xy(9, 1, 1)).length === 1, "덩어리(사석 무리) 고르기");
}

section("강화학습 입력 · 대칭");
{
  let s = run(B.create({ size: 9 }), [40, 41, 30]);
  const P = B.planes(s, 8), NN = 81;
  ok(P.length === 19 * NN, "평면 19×81");
  ok(P[0 * NN + 41] === 1 && P[8 * NN + 40] === 1, "현재 판: 백 차례 → 내 돌(백) 41, 상대(흑) 40");
  ok(P[16 * NN] === 0, "차례 평면 (백이면 0)");
  ok(P[17 * NN + 40] === 0 && P[17 * NN + 0] === 1, "둘 수 있는 곳 평면");
  for (let k = 0; k < 8; k++) {
    let okk = true;
    for (let p = 0; p < NN; p++) if (B.symPoint(B.symInverse(k), B.symPoint(k, p, 9), 9) !== p) okk = false;
    ok(okk, "대칭 " + k + " 역변환");
  }
  const c3 = B.create(9, 7.5, "korean");
  ok(c3.size === 9 && c3.komi === 7.5, "create(size, komi, rules) 형태");
  const tt = run(B.create({ size: 5, komi: 0.5 }), [12, 25, 25]);
  const term = B.terminal(tt);
  ok(term.over && term.winner === B.BLACK && B.reward(tt, B.BLACK) === 1 && B.reward(tt, B.WHITE) === -1, "terminal · reward (Tromp-Taylor)");
  ok(B.actionCount(9) === 82 && B.obs === B.planes && B.step === B.play && !B.terminal(c3).over, "obs · step · actionCount");
  const sp = B.symPlanes(P, 19, 9, 3);
  ok(sp[0 * NN + B.symPoint(3, 41, 9)] === 1, "평면 대칭 변환");
}

section("친구랑 — 자리 · 구경꾼 · 늦게 온 사람 (room.js)");
{
  const RM = require(path.join(__dirname, "..", "room.js"));
  // 방장 H, 친구들은 들어온 시각 순서: A(10) → B(20) → C(30). 객체 순서는 뒤죽박죽
  const P = { C: { name: "철수", t: 30 }, H: { name: "방장", t: 50 }, B: { name: "영희", t: 20 }, A: { name: "민수", t: 10 } };
  let seats = RM.seatsFrom(P, "H", 1);
  ok(seats[1] === "H" && seats[2] === "A", "자리: 방장 흑 + 가장 먼저 온 친구 백");
  const sw = RM.seatsFrom(P, "H", 2);
  ok(sw[2] === "H" && sw[1] === "A", "방장이 백을 고르면 친구가 흑");
  ok(RM.seatsFrom({ ...P, A: { name: "민수", t: 10, watch: 1 } }, "H", 1)[2] === "B", "구경만 원한 사람(watch)은 건너뜀");
  const spec = RM.spectators(P, seats, "H");
  ok(spec.length === 2 && spec[0].uid === "B" && spec[1].uid === "C", "구경꾼 = 나머지 (들어온 순)");
  ok(RM.seatOf(seats, "H") === 1 && RM.seatOf(seats, "A") === 2 && RM.seatOf(seats, "B") === 0, "seatOf");
  ok(RM.seatsFrom({ H: { name: "방장", t: 1 } }, "H", 1)[2] === null && !RM.full(RM.seatsFrom({ H: { t: 1 } }, "H")), "혼자면 빈자리");
  // 구경꾼은 못 둠 · 차례 아닌 사람도 못 둠 · 수 번호가 어긋나면 버림
  let s = B.create({ size: 9 });
  ok(RM.validMove(B, seats, "H", s, { a: 40, n: 0 }), "흑 차례: 방장(흑) 수 받음");
  ok(!RM.validMove(B, seats, "A", s, { a: 40, n: 0 }), "흑 차례에 백은 못 둠");
  ok(!RM.validMove(B, seats, "B", s, { a: 40, n: 0 }), "구경꾼은 못 둠");
  ok(!RM.validMove(B, seats, "H", s, { a: 40, n: 3 }), "수 번호가 다르면 버림 (중복·늦은 메시지)");
  s = run(s, [40]);
  ok(RM.validMove(B, seats, "A", s, { a: 81, n: 1 }) && !RM.validMove(B, seats, "A", s, { a: 40, n: 1 }), "백 패스 OK · 이미 돌 있는 곳 X");
  // 늦게 온 사람: 묶음 → 되살리기 → 같은 판 해시, 이어서 둬도 같음
  s = run(s, [30, 50, 81]);
  const g = { g: 3, st: s, phase: "score", dead: new Uint8Array(81).fill(0), seats, names: RM.names(P, seats) };
  g.dead[30] = 1;
  const wire = JSON.parse(JSON.stringify(RM.snap(B, g)));
  const back = RM.restore(B, wire);
  ok(back.g === 3 && back.phase === "score" && B.hash(back.st) === B.hash(s) && back.st.moves.length === 4, "묶음 되살리기: 같은 판 · 같은 수");
  ok(back.dead[30] === 1 && back.dead.length === 81 && back.seats[2] === "A" && back.names[1] === "방장" && back.names[2] === "민수", "죽은 돌 · 자리 · 이름도 그대로");
  ok(B.hash(run(back.st, [20])) === B.hash(run(s, [20])), "되살린 판에서 이어 두기 = 원래 판");
  // 한 판 더: 색 바꿈, 나간 사람 자리는 먼저 온 구경꾼이
  let nx = RM.nextSeats(seats, P, "H");
  ok(nx[1] === "A" && nx[2] === "H", "한 판 더: 색 바꿈");
  const P2 = { ...P }; delete P2.A;
  nx = RM.nextSeats(seats, P2, "H");
  ok(nx[2] === "H" && nx[1] === "B", "두던 친구가 나가면 첫 구경꾼(영희)이 들어옴");
  ok(!RM.full(RM.nextSeats(seats, { H: P.H }, "H")), "아무도 없으면 시작 못 함");
  // AI 선생님 까닭 한 줄
  const W = RM.coachWhy;
  ok(/따낼/.test(W(B, fromPic([".X...", "XOX..", ".....", ".....", "....."], B.BLACK), xy(5, 1, 2))), "까닭: 백 한 점 따냄");
  ok(/살리는/.test(W(B, fromPic(["..O..", ".OX..", "..O..", ".....", "....."], B.BLACK), xy(5, 3, 1))), "까닭: 단수 돌 살리기");
  ok(/단수로/.test(W(B, fromPic([".....", ".XO..", "..X..", ".....", "....."], B.BLACK), xy(5, 2, 0))), "까닭: 단수로 몰기");
  ok(/초반/.test(W(B, B.create({ size: 9 }), 40)) && /패스/.test(W(B, B.create({ size: 9 }), 81)), "까닭: 초반 · 패스");
}

section("7줄 빠른 바둑 (덤 9)");
{
  const s7 = B.create({ size: 7, komi: 9 });
  ok(s7.size === 7 && s7.komi === 9 && B.actionCount(7) === 50 && B.legal(s7).length === 50, "7줄 판 · 행동 50개");
  ok(B.starPoints(7).length === 5 && B.starPoints(7).includes(24), "7줄 화점 5개 (천원 24)");
  // 무작위 대국 끝까지 · 같은 수 → 같은 해시 · 집 계산 (흑 + 백 + 덤 = 맞는 차)
  let okAll = true, okDet = true, games = 0;
  for (let gi = 0; gi < 30; gi++) {
    const r = B.mulberry32(700 + gi); let s = s7;
    while (!s.over) { const m = B.legal(s), c = []; for (let p = 0; p <= 49; p++) if (m[p]) c.push(p); s = B.play(s, c.length > 1 && r() < 0.95 ? c[Math.floor(r() * (c.length - 1))] : 49).state; }
    games++;
    if (B.hash(B.replay(s7, s.moves)) !== B.hash(s)) okDet = false;
    const sc = B.scoreKorean(s, []);
    if (Math.abs(sc.margin - (sc.black - sc.white - 9)) > 1e-9) okAll = false;
  }
  ok(okDet && games === 30, "7줄 무작위 30판: 다시 둬도 같은 해시");
  ok(okAll, "7줄 집 계산: 차 = 흑 − 백 − 덤 9");
}

module.exports = { ok, section, fromPic, run };
if (require.main === module) {
  const extra = path.join(__dirname, "selftest_ai.js");
  const finish = () => {
    console.log(`\n결과: 통과 ${pass} · 실패 ${fail} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
    process.exit(fail ? 1 : 0);
  };
  try { require("fs").accessSync(extra); Promise.resolve(require(extra)({ ok, section, B })).then(finish, e => { console.error(e); fail++; finish(); }); }
  catch (e) { if (e.code !== "ENOENT") throw e; finish(); }
}

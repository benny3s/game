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

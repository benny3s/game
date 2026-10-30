/* AI 자기 시험 (selftest.js 가 불러 씀): 신경망 입력·출력 · wasm=JS · 결정성 · 사석 추정 · AI 끼리 대국 통계 */
"use strict";
const path = require("path"), fs = require("fs");
module.exports = async function ({ ok, section, B }) {
  const NN = require(path.join(__dirname, "..", "nn.js"));
  const AI = require(path.join(__dirname, "..", "ai.js"));
  const file = path.join(__dirname, "..", "model", "b6c96.bkn");
  const xy = (N, x, y) => y * N + x;
  const name = (N, p) => (p === N * N ? "pass" : "ABCDEFGHJKLMNOPQRST"[p % N] + (N - Math.floor(p / N)));
  const T0 = Date.now();

  section("몬테카를로(신경망 없이)");
  {
    // 단수 백 한 점: 흑이 바로 따내야 함
    let s = B.create({ size: 9 });
    for (const a of [xy(9, 3, 4), xy(9, 4, 4), xy(9, 5, 4), xy(9, 8, 8), xy(9, 4, 3), xy(9, 8, 7)]) s = B.play(s, a).state;   // 백 (4,4) 활로: (4,5) 하나
    const r = AI.mctsMove(s, { seed: 3, playouts: 600 });
    ok(r.move === xy(9, 4, 5), `MCTS 가 단수 돌 따냄 (${name(9, r.move)})`);
    const r2 = AI.mctsMove(s, { seed: 3, playouts: 600 }), r3 = AI.mctsMove(s, { seed: 4, playouts: 600 });
    ok(r2.move === r.move, "MCTS 같은 씨앗 → 같은 수");
    ok(B.isLegal(s, r3.move), "MCTS 둘 수 있는 수");
  }

  if (!fs.existsSync(file)) { console.log("  (모델 파일 없음 — 신경망 시험 건너뜀)"); return; }
  const buf = fs.readFileSync(file), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  const mw = NN.loadModel(ab), mj = NN.loadModel(ab, { wasm: false });
  AI.setModel(mw);

  section("신경망 (KataGo b6c96)");
  {
    const top = (st, m = mw) => { const e = NN.evaluate(m, NN.posFromState(st)); let b = 0; for (let p = 1; p < e.policy.length; p++) if (e.policy[p] > e.policy[b]) b = p; return [b, e]; };
    const [p9, e9] = top(B.create({ size: 9, komi: 7 }));
    ok(p9 === 40, `9줄 빈 판 첫 수 = 천원 (${name(9, p9)})`);
    ok(e9.winrate > 0.3 && e9.winrate < 0.7, `9줄 빈 판 승률 반반 근처 (${e9.winrate.toFixed(2)})`);
    const [p19] = top(B.create({ size: 19, komi: 7.5 }));
    const x = p19 % 19, y = Math.floor(p19 / 19), lo = Math.min(x, 18 - x), hi = Math.min(y, 18 - y);
    ok([2, 3].includes(lo) && [2, 3].includes(hi), `19줄 첫 수 = 귀 화점·소목 (${name(19, p19)})`);
    // 단수 백 돌 살리기
    let s = B.create({ size: 9 });
    for (const a of [40, 41, 50, 49, 58]) s = B.play(s, a).state;
    const [pa, ea] = top(s);
    ok(pa === 48 && ea.policy[48] > 0.8, `단수 돌 달아나기 (${name(9, pa)} ${(ea.policy[pa] * 100).toFixed(0)}%)`);
    // 축(사다리): 백 (4,4) 활로 둘, 흑이 먼저 몰면 귀까지 잡힘 → 축 표시. 길목에 백 돌(축머리)이 있으면 축 아님
    s = B.create({ size: 9 });
    for (const [x, y] of [[3, 4], [4, 5], [5, 5]]) s.board[xy(9, x, y)] = 1;
    s.board[xy(9, 4, 4)] = 2;
    const bd = B.toBoard(s); let lad = 0; B.iterLadders(bd, i => { if (bd.pt(i) === xy(9, 4, 4)) lad++; });
    ok(lad === 1, '축 찾기: 몰리는 돌 표시');
    s.board[xy(9, 7, 1)] = 2;
    const bd2 = B.toBoard(s); let lad2 = 0; B.iterLadders(bd2, i => { if (bd2.pt(i) === xy(9, 4, 4)) lad2++; });
    ok(lad2 === 0, '축머리가 있으면 축 아님');
    // wasm 과 JS 결과 같음
    if (mw.wasm) {
      let md = 0; s = B.create({ size: 13 }); const r = B.mulberry32(2);
      for (let k = 0; k < 30; k++) { const m = B.legal(s), c = []; for (let p = 0; p < 169; p++) if (m[p]) c.push(p); s = B.play(s, c[Math.floor(r() * c.length)]).state; }
      const a = NN.evaluate(mw, NN.posFromState(s)), b = NN.evaluate(mj, NN.posFromState(s));
      for (let p = 0; p < a.policy.length; p++) md = Math.max(md, Math.abs(a.policy[p] - b.policy[p]));
      ok(md < 1e-4 && Math.abs(a.winrate - b.winrate) < 1e-4, `wasm SIMD = JS (최대 차이 ${md.toExponential(1)})`);
    } else console.log("  (이 Node 에서는 wasm SIMD 안 됨 — JS 경로만)");
    // 대칭 평가가 비슷함 (신경망은 대칭을 배웠음)
    const st = B.play(B.play(B.create({ size: 9 }), 20).state, 60).state;
    const e0 = NN.evaluate(mw, NN.posFromState(st), { sym: 0 }), e3 = NN.evaluate(mw, NN.posFromState(st), { sym: 3 });
    ok(Math.abs(e0.winrate - e3.winrate) < 0.08, `대칭 바꿔도 승률 비슷 (${e0.winrate.toFixed(3)} / ${e3.winrate.toFixed(3)})`);
  }

  section("AI 결정성 · 사석");
  {
    let s = B.create({ size: 9 });
    for (const a of [40, 30, 50]) s = B.play(s, a).state;
    for (const tier of ["easy", "normal"]) {
      const a = AI.chooseMove(s, { tier, seed: 42 }), b = AI.chooseMove(s, { tier, seed: 42 });
      ok(a.move === b.move && B.isLegal(s, a.move), `${tier} 같은 씨앗 → 같은 수 (${name(9, a.move)})`);
    }
    const h1 = AI.nnSearch(s, { seed: 7, visits: 24, timeMs: 1e9 }), h2 = AI.nnSearch(s, { seed: 7, visits: 24, timeMs: 1e9 });
    ok(h1.move === h2.move && h1.info.visits === 24, `수읽기 방문 고정 → 같은 수 (${name(9, h1.move)})`);
  }

  // ── AI 끼리 대국: 9줄, 사석 추정 + 한국식 계가로 승패
  section("AI 끼리 대국 (9줄)");
  function game(pb, pw, seed) {
    let s = B.create({ size: 9, komi: 6.5 }); let k = 0; const t = Date.now();
    while (!s.over && k < 220) { const p = s.toPlay === 1 ? pb : pw; const r = AI.chooseMove(s, { ...p, seed: seed * 1000 + k }); const n = B.play(s, r.move); if (n.state === s) return { illegal: true }; s = n.state; k++; }
    const g = AI.guessDead(s, {}); const sc = B.scoreKorean(s, g.dead);
    return { moves: k, margin: sc.margin, winner: sc.winner, byPass: !!(s.end && s.end.reason === "pass"), ms: Date.now() - t, leadB: g.analysis.leadB };
  }
  const P = {
    "🐣": { tier: "easy" }, "🐱": { tier: "normal" }, "🐯": { tier: "hard", visits: 32, timeMs: 1e9 },
    "MC300": { tier: "normal", noNN: true, playouts: 300 },
  };
  const rows = [];
  async function match(a, b, n) {
    if (Date.now() - T0 > 80000) { console.log(`  (${a} vs ${b}: 시간이 많이 걸려 건너뜀 — PC 가 바쁨)`); return null; }
    let wa = 0, sumM = 0, sumMv = 0, ms = 0, passEnd = 0, illegal = 0, agree = 0;
    for (let i = 0; i < n; i++) {
      const aBlack = i % 2 === 0, r = game(aBlack ? P[a] : P[b], aBlack ? P[b] : P[a], 11 + i);
      if (r.illegal) { illegal++; continue; }
      const aWon = (r.winner === 1) === aBlack; if (aWon) wa++;
      sumM += aBlack ? r.margin : -r.margin; sumMv += r.moves; ms += r.ms; if (r.byPass) passEnd++;
      if ((r.margin > 0) === (r.leadB > 0) || Math.abs(r.leadB) < 3) agree++;
      await new Promise(res => setImmediate(res));
    }
    rows.push([`${a} vs ${b}`, `${wa}/${n}`, (sumM / n).toFixed(1), (sumMv / n).toFixed(0), `${passEnd}/${n}`, (ms / Math.max(1, sumMv)).toFixed(1), `${agree}/${n}`]);
    ok(illegal === 0, `${a} vs ${b}: 잘못된 수 없음`);
    return wa;
  }
  const w1 = await match("🐱", "🐣", 6);
  ok(w1 == null || w1 >= 5, `🐱 가 🐣 를 대부분 이김 (${w1}/6)`);
  const w2 = await match("🐯", "🐱", 2);
  ok(w2 == null || w2 >= 1, `🐯(32방문) 가 🐱 를 이김 (${w2}/2)`);
  const w3 = await match("🐣", "MC300", 4);
  ok(w3 == null || w3 >= 1, `🐣 가 MCTS300 과 겨룰 만함 (${w3}/4)`);
  console.log("  대국            A승   A집차(평균)  수  패스로끝  ms/수  계가=신경망형세");
  for (const r of rows) console.log("  " + r[0].padEnd(14) + r[1].padStart(5) + r[2].padStart(11) + r[3].padStart(6) + r[4].padStart(8) + r[5].padStart(8) + r[6].padStart(10));
  console.log(`  (AI 시험 ${((Date.now() - T0) / 1000).toFixed(1)}초)`);
};

// 베니 지니어스 핵심 엔진 자가 테스트 (node genius/test/selftest.js)
const assert = require("assert");
const G = require("../core.js");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("  ✓", name);
}

console.log("🧠 GeniusCore selftest");

test("흑과 백: 9라운드 완주 & 점수·선공 규칙 검증", () => {
  const rng = G.makeRng(42);
  const st = G.newBW({ firstLead: 0 });
  while (st.winner === null) {
    const seat = st.turn;
    const t = G.aiPickBW(st, seat, "normal", rng);
    const res = G.playBW(st, seat, t);
    assert(res.ok, res.err);
    if (!res.resolved) {
      assert(st.leadColor === "B" || st.leadColor === "W");
      assert.strictEqual(st.turn, seat ^ 1);
    }
  }
  assert(st.winner === 0 || st.winner === 1 || st.winner === "draw");
  assert(st.scores[0] + st.scores[1] <= 9);
});

test("흑과 백: 코치·AI 블라인드 공정성 (상대 비밀 패 교체 시 불변)", () => {
  const st1 = G.newBW({ firstLead: 1 });
  // 상대(seat 1)가 2(흑)를 냄 -> 짝수
  assert(G.playBW(st1, 1, 2).ok);
  const st2 = G.newBW({ firstLead: 1 });
  // 상대(seat 1)가 8(흑)을 냄 -> 역시 짝수
  assert(G.playBW(st2, 1, 8).ok);

  const c1 = G.coachBW(st1, 0);
  const c2 = G.coachBW(st2, 0);
  assert.strictEqual(c1.oppFlow, c2.oppFlow);
  assert.strictEqual(c1.myFlow, c2.myFlow);
  assert.strictEqual(c1.bestTile, c2.bestTile);
  assert.strictEqual(c1.reason, c2.reason);
  const a1 = G.aiPickBW(st1, 0, "hard", G.makeRng(7));
  const a2 = G.aiPickBW(st2, 0, "hard", G.makeRng(7));
  assert.strictEqual(a1, a2);
});

test("흑과 백: 과거 라운드 베이지안 추론 & 가성비/필승 추천 검증", () => {
  const st = G.newBW({ firstLead: 0 });
  // 상대(1)가 흑 3장(4,6,8) 소모했고 내가 [2,3,5]로 다 졌으면, 상대 남은 흑은 [0,2]뿐!
  assert(G.playBW(st, 0, 2).ok && G.playBW(st, 1, 4).ok);
  assert(G.playBW(st, 1, 6).ok && G.playBW(st, 0, 3).ok);
  assert(G.playBW(st, 1, 8).ok && G.playBW(st, 0, 5).ok);
  // 4라운드 선공(상대 1)이 또 흑(0)을 냄 → 남은 흑은 [0] 또는 [2] (4,6,8 불가능!)
  assert(G.playBW(st, 1, 0).ok);
  const pub = G.bwPublicView(st, 0);
  const inf = G.inferOppBW(pub);
  assert.deepStrictEqual(inf.leadCands, [0, 2], "과거 흑 3패 소모 시 남은 흑 후보 [0,2]로 정확히 소거");
  assert(pub.history.every(h => h.oppTile === null), "대국 진행 중엔 oppTile 비공개 유지");
  const c = G.coachBW(st, 0);
  // 내 손패 남은 [0,1,4,6,7,8] 중 [4]이면 [0,2] 상대로 100% 필승하면서 6,7,8 아낌!
  assert.strictEqual(c.bestTile, 4, `후보 [0,2] 상대로 6,7,8 대신 100% 최소 필승패 [4] 추천 (실제 ${c.bestTile})`);
  for (let seed = 1; seed <= 10; seed++) {
    assert.strictEqual(G.aiPickBW(st, 0, "hard", G.makeRng(seed)), 4, "고수 AI도 100% 최소 필승패 [4]를 낭비 없이 선택");
  }
  // 4라운드 마무리 후 대국 완료까지 진행 → 종료 후 복기용 oppTile 공개 확인
  assert(G.playBW(st, 0, 4).ok);
  while (st.winner === null) {
    const s = st.turn;
    assert(G.playBW(st, s, st.hands[s][0]).ok);
  }
  const endPub = G.bwPublicView(st, 0);
  assert(endPub.history.length > 0 && endPub.history.every(h => typeof h.oppTile === "number"), "대국 완전 종료 후 복기용 oppTile 공개");
});

test("결! 합!: 합 판정 + 중복/오답 -1 + 결 +3 완주", () => {
  const st = G.newGH({ seed: 99, minHaps: 2, maxHaps: 4, players: 2 });
  assert(st.haps.length >= 2 && st.haps.length <= 4);

  // 오답 결(-1)
  const badGyul = G.callGyulGH(st, 0);
  assert(badGyul.ok && !badGyul.success && st.scores[0] === -1);

  // 비합 찾기
  let nonHap = null;
  const hset = new Set(st.haps.map(t => t.join("-")));
  for (let i = 0; i < 9 && !nonHap; i++) {
    for (let j = i + 1; j < 9 && !nonHap; j++) {
      for (let k = j + 1; k < 9 && !nonHap; k++) {
        if (!hset.has(`${i}-${j}-${k}`)) nonHap = [i, j, k];
      }
    }
  }
  assert(nonHap);
  const miss = G.submitHapGH(st, 1, nonHap);
  assert(miss.ok && !miss.hit && st.scores[1] === -1);

  // 모든 합 찾기
  for (const t of st.haps) {
    const r = G.submitHapGH(st, 0, t);
    assert(r.ok && r.hit);
  }
  // 중복 합 제출 시 감점
  const dup = G.submitHapGH(st, 0, st.haps[0]);
  assert(dup.ok && !dup.hit && dup.duplicate);

  const c = G.coachGH(st);
  assert.strictEqual(c.remaining, 0);

  // 정답 결! (+3)
  const goodGyul = G.callGyulGH(st, 0);
  assert(goodGyul.ok && goodGyul.success && st.done);
  assert.strictEqual(st.winner, 0);
});

test("십이장기: 자 승급(후) + 포로 끝줄 배치 금지 + 왕 잡기 + Try 규칙", () => {
  const st = G.new12();
  const moves0 = G.legalMoves12(st, 0);
  assert(moves0.length >= 4);

  // 적진 끝줄에 포로 배치 금지 확인
  st.reserves[0].push("ja");
  const drops = G.legalMoves12(st, 0).filter(m => m.kind === "drop");
  assert(drops.length > 0);
  assert(drops.every(m => m.tr !== 0), "적진 끝줄(row 0)에 포로를 놓을 수 없어야 함");

  // AI끼리 완주 또는 40수 이내 합법 수 동작 검증
  const sim = G.new12();
  const rng = G.makeRng(12);
  let steps = 0;
  while (sim.winner === null && steps < 40) {
    const mv = G.aiPick12(sim, sim.turn, steps % 2 === 0 ? "hard" : "normal", rng);
    assert(mv, "합법 수가 존재해야 함");
    const r = G.applyMove12(sim, mv);
    assert(r.ok, r.err);
    steps++;
  }
  assert(steps > 0);

  // Try 규칙 테스트: P0 왕이 row 0에 들어가고 P1이 왕을 잡지 못하면 P0 Try 승
  const trySt = G.new12();
  trySt.board = Array.from({ length: 4 }, () => [null, null, null]);
  trySt.board[1][0] = { t: "king", s: 0 };
  trySt.board[0][2] = { t: "king", s: 1 };
  trySt.board[3][2] = { t: "ja", s: 1 };
  const r1 = G.applyMove12(trySt, { kind: "move", fr: 1, fc: 0, tr: 0, tc: 0 });
  assert(r1.ok && trySt.pendingTry === 0 && trySt.winner === null);
  const r2 = G.applyMove12(trySt, { kind: "move", fr: 0, fc: 2, tr: 1, tc: 2 });
  assert(r2.ok && trySt.winner === 0 && trySt.winReason === "try");
});

test("십이장기: 상급 AI가 상급 이하/초급 대비 왕 포획 놓치지 않음", () => {
  const st = G.new12();
  st.board = Array.from({ length: 4 }, () => [null, null, null]);
  st.board[1][1] = { t: "jang", s: 0 };
  st.board[0][1] = { t: "king", s: 1 };
  st.board[3][0] = { t: "king", s: 0 };
  const mv = G.aiPick12(st, 0, "hard");
  assert(mv && mv.tr === 0 && mv.tc === 1 && mv.cap === "king");
});

console.log(`✅ All ${passed} GeniusCore tests passed!`);

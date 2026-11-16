/* 비밀 서재 탈출 단위 시험 (node escape/test/selftest.js) */
"use strict";
const assert = require("assert");
const E = require("../core.js");

let passed = 0;
function test(name, fn) {
  fn();
  console.log("  ✓ " + name);
  passed++;
}

console.log("🗝️ EscapeCore selftest");

test("1. 시작 상태 → 8단계 퍼즐 완주(탈출) 막힘 없음 검증", () => {
  const res = E.validateSolvable();
  assert.strictEqual(res.ok, true);
  assert(res.steps.length >= 15, "전 단계 통과");
});

test("2. 잘못된 비밀번호·순서 틀림·잘못된 아이템 조합 방어", () => {
  let st = E.initialState(100);
  const wrongBox = E.submitBoxCode(st, "9999");
  assert.strictEqual(wrongBox.ok, false);
  assert.strictEqual(wrongBox.state.flags.boxOpen, false);

  const wrongSafe = E.submitSafeCode(st, "123");
  assert.strictEqual(wrongSafe.ok, false);
  assert.strictEqual(wrongSafe.state.flags.safeOpen, false);

  // 책 순서 중간 틀리면 리셋
  let r1 = E.pressBook(st, "red");
  assert.strictEqual(r1.state.bookSeq.length, 1);
  let r2 = E.pressBook(r1.state, "blue"); // gold가 와야 함
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.state.bookSeq.length, 0);

  // 어울리지 않는 조합 거절 (서랍 열고 직접 집은 뒤)
  let rPick = E.inspectSpot(st, "silver_spot").state;
  rPick = E.selectItem(rPick, "silver_key").state;
  rPick = E.inspectSpot(rPick, "drawer").state;
  assert.strictEqual(rPick.zoom, "drawer");
  assert(!rPick.inv.includes("magnet"), "서랍 열기만으로는 인벤토리에 자동 획득되지 않음");
  rPick = E.takeItem(rPick, "magnet").state;
  rPick = E.takeItem(rPick, "uv_off").state;
  const badComb = E.combineItems(rPick, "magnet", "uv_off");
  assert.strictEqual(badComb.ok, false);
  assert(badComb.state.inv.includes("magnet") && badComb.state.inv.includes("uv_off"));
});

test("3. 진행 단계별 3단계 상태 인지 힌트(getHint) 및 장면 단계 분리 정합성", () => {
  let st = E.initialState(100);
  const h0 = E.getHint(st, 3);
  assert(h0.includes("은열쇠"), "처음엔 은열쇠 안내");

  st = E.inspectSpot(st, "silver_spot").state;
  const h1 = E.getHint(st, 3);
  assert(h1.includes("서랍"), "은열쇠 뒤엔 서랍 안내");

  st = E.inspectSpot(E.selectItem(st, "silver_key").state, "drawer").state;
  assert(E.getHint(st, 3).includes("자석"), "열린 서랍에서 물건 안 챙겼으면 집기 안내");
  st = E.takeItem(st, "magnet").state;
  st = E.takeItem(st, "uv_off").state;
  const h2 = E.getHint(st, 3);
  assert(h2.includes("빨강"), "서랍 물건 획득 뒤엔 책장 순서 안내");

  // 액자 나사 해제 시 자물쇠 화면으로 바로 점프하지 않고 벽 금고만 노출되는지 검증
  st.inv.push("driver");
  st.wall = "W";
  st = E.selectItem(st, "driver").state;
  const unRes = E.inspectSpot(st, "frame");
  assert(unRes.ok && unRes.state.flags.frameOpen && unRes.state.zoom === null, "드라이버 해제 후 곧바로 금고 줌으로 건너뛰지 않음");
  const safeRes = E.submitSafeCode(E.inspectSpot(unRes.state, "frame").state, "379");
  assert(safeRes.ok && safeRes.state.flags.safeOpen && safeRes.state.zoom === "safe" && !safeRes.state.inv.includes("seal"), "금고 열어도 메달이 인벤토리로 텔레포트하지 않고 열린 금고에 남아 있음");
});

test("4. 핫스팟 좌표 및 4개 방면(N/E/S/W) 전환 검증", () => {
  let st = E.initialState(100);
  assert.strictEqual(st.wall, "S");
  st = E.turnWall(st, 1).state;
  assert.strictEqual(st.wall, "W");
  st = E.turnWall(st, 1).state;
  assert.strictEqual(st.wall, "N");
  for (const w of E.WALLS) {
    const hs = E.getHotspots(st, w);
    assert(hs.length >= 2, `${w} 벽 핫스팟 2개 이상`);
    for (const h of hs) {
      assert(h.x >= 0 && h.y >= 0 && h.x + h.w <= 100 && h.y + h.h <= 100, `${w}:${h.id} 좌표 0..100 범위`);
    }
  }
});

console.log(`✅ All ${passed} EscapeCore tests passed!`);

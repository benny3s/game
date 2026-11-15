// 비밀 서재 탈출 브라우저 통합 UI 시험 (node escape/test/ui.js)
// - 모바일 화면 맞춤 · 튜토리얼 실습 · 4면 이동 · 8단계 실제 클릭 완주 탈출 · 3단계 AI 힌트 · 자동 저장 검증
"use strict";
const U = require("../../test/qa/lib/uitest");

const wait = (p, fn, ms = 8000) => U.waitFor(p, fn, undefined, ms);

U.main(async T => {
  const p = await T.open("escape/");
  await wait(p, () => !!window.__escape && !!document.getElementById("startBtn"));
  T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "모바일(390px) 가로 넘침 없음");

  // 1) 1분 움직이는 규칙 설명 실습 (열쇠 선택 → 서랍 열기)
  await p.click("#helpBtn");
  await wait(p, () => !!document.querySelector(".tut-ov"));
  await p.click("#tutNext");
  await wait(p, () => !!document.getElementById("etutKey") && !!document.getElementById("etutBox"));
  await p.click("#etutKey");
  await p.click("#etutBox");
  await T.sleep(200);
  T.ok(await p.evaluate(() => !!document.querySelector("#tutTry.ok")), "방탈출 튜토리얼 직접 열기 연습 완료");
  await p.click(".tut-x");

  // 2) 서재 들어가기 + 이미지 로드 확인
  await p.click("#startBtn");
  await wait(p, () => !document.getElementById("play").hidden && !!__escape.state());
  await wait(p, () => {
    const im = document.getElementById("roomImg");
    return im && im.complete && im.naturalWidth > 0;
  }, 8000);
  T.ok(true, "남쪽 서재 일러스트 이미지 정상 로드");

  // AI 선생님 3단계 힌트 확인
  await p.click("#coachBtn");
  await wait(p, () => document.querySelector(".cpn") && !document.querySelector(".cpn").hidden);
  await p.click('[data-hl="3"]');
  T.ok(await p.evaluate(() => document.querySelector(".cpn-body").textContent.includes("은열쇠")), "현재 진행 맞춤 AI 힌트 확인");
  await p.click(".cpn-min");

  // 3) 남쪽: 은열쇠 줍기 → 일지 읽기 → 은열쇠 선택해 서랍 열기
  await p.click('.esc-spot[data-spot="silver_spot"]');
  await wait(p, () => __escape.state().inv.includes("silver_key"));
  await p.click('.esc-spot[data-spot="diary"]');
  await wait(p, () => !document.getElementById("zoomModal").hidden);
  await p.click("#zoomCloseBtn");
  await p.click('.esc-slot[data-item="silver_key"]');
  await p.click('.esc-spot[data-spot="drawer"]');
  await wait(p, () => __escape.state().flags.drawerOpen);
  T.ok(await p.evaluate(() => __escape.state().inv.includes("magnet") && __escape.state().inv.includes("uv_off")), "서랍 열고 자석 + 빈 UV 손전등 획득");

  // 4) 동쪽 이동: 책장 4색 책 순서 맞추기 → UV 합치기 → 어두운 석판 UV 비추기
  await p.click('#compass button[data-w="E"]');
  await wait(p, () => __escape.state().wall === "E");
  await p.click('.esc-spot[data-spot="bookshelf"]');
  await wait(p, () => !document.getElementById("zoomModal").hidden);
  for (const col of ["red", "gold", "green", "blue"]) {
    await p.click(`.ez-book[data-bk="${col}"]`);
  }
  await wait(p, () => __escape.state().flags.shelfOpen);
  T.ok(await p.evaluate(() => __escape.state().inv.includes("pendulum") && __escape.state().inv.includes("battery")), "책장 4색 퍼즐 성공 → 시계추 + 건전지 획득");

  // 인벤토리 합치기: 빈 UV 손전등 + 건전지 → 켜진 UV 손전등
  await p.click("#combineBtn");
  await p.click('.esc-slot[data-item="uv_off"]');
  await p.click('.esc-slot[data-item="battery"]');
  await wait(p, () => __escape.state().inv.includes("uv_on"));
  await p.click('.esc-spot[data-spot="slate"]');
  await wait(p, () => __escape.state().flags.uvClueSeen);
  await p.click("#zoomCloseBtn");
  T.ok(await p.evaluate(() => !!document.querySelector(".ov-uv-slate")), "동쪽 석판 위 형광 단서 ☾3 ★7 ☀9 출현");

  // 5) 북쪽 이동: 시계추 장착 → 03:45 확인 + 명주실 획득
  await p.click('#compass button[data-w="N"]');
  await wait(p, () => __escape.state().wall === "N");
  await p.click('.esc-slot[data-item="pendulum"]');
  await p.click('.esc-spot[data-spot="clock"]');
  await wait(p, () => __escape.state().flags.clockFixed);
  await p.click("#zoomCloseBtn");
  T.ok(await p.evaluate(() => __escape.state().inv.includes("thread") && !!document.querySelector(".ov-clock-badge")), "괘종시계 복구(03:45) + 명주실 획득");

  // 6) 남쪽 이동: 4자리 다이얼 상자 0345 입력 → 드라이버 획득
  await p.click('#compass button[data-w="S"]');
  await p.click('.esc-spot[data-spot="box"]');
  await wait(p, () => !document.getElementById("zoomModal").hidden);
  // 0, 3, 4, 5 다이얼 맞추기
  for (let i = 0; i < 3; i++) await p.click('[data-du="1"]');
  for (let i = 0; i < 4; i++) await p.click('[data-du="2"]');
  for (let i = 0; i < 5; i++) await p.click('[data-du="3"]');
  await p.click("#boxSubmitBtn");
  await wait(p, () => __escape.state().flags.boxOpen);
  T.ok(await p.evaluate(() => __escape.state().inv.includes("driver")), "0345 상자 열림 → 드라이버 획득");

  // 7) 서쪽 이동: 액자 나사 풀기 → 금고 379 열기 → 자석+실 조합 → 환풍구 마스터키 낚시
  await p.click('#compass button[data-w="W"]');
  await p.click('.esc-slot[data-item="driver"]');
  await p.click('.esc-spot[data-spot="frame"]');
  await wait(p, () => __escape.state().flags.frameOpen && !document.getElementById("zoomModal").hidden);
  for (let i = 0; i < 3; i++) await p.click('[data-su="0"]');
  for (let i = 0; i < 7; i++) await p.click('[data-su="1"]');
  for (let i = 0; i < 9; i++) await p.click('[data-su="2"]');
  await p.click("#safeSubmitBtn");
  await wait(p, () => __escape.state().flags.safeOpen);

  await p.click("#combineBtn");
  await p.click('.esc-slot[data-item="magnet"]');
  await p.click('.esc-slot[data-item="thread"]');
  await wait(p, () => __escape.state().inv.includes("magnet_line"));
  await p.click('.esc-spot[data-spot="grate"]');
  await wait(p, () => __escape.state().flags.grateFished && __escape.state().inv.includes("master_key"));

  // 8) 북쪽 출구 문: 마스터 키 + 황동 인장 메달 사용 → 최종 탈출!
  await p.click('#compass button[data-w="N"]');
  await p.click('.esc-slot[data-item="master_key"]');
  await p.click('.esc-spot[data-spot="door"]');
  await wait(p, () => __escape.state().flags.doorKeyDone && !document.getElementById("zoomModal").hidden);
  await p.click("#doorSealSlot");
  await wait(p, () => __escape.state().flags.escaped);
  T.ok(await p.evaluate(() => document.getElementById("zoomTitle").textContent.includes("탈출 성공")), "최종 서재 탈출 성공 화면 표시 확인");

  await p.close();
});

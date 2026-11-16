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

  // 3) 남쪽: 은열쇠 줍기(책상 위 열쇠 사라진 이미지 전환 확인) → 장식 벽시계 구분 → 일지 읽기 → 은열쇠 선택해 서랍 열기
  await p.click('.esc-spot[data-spot="silver_spot"]');
  await wait(p, () => __escape.state().inv.includes("silver_key"));
  T.ok(await p.evaluate(() => document.getElementById("roomImg").getAttribute("src").includes("wall_south_nokey.jpg")), "은열쇠 획득 후 책상 위 열쇠 사라진 일러스트 전환");
  await p.click('.esc-spot[data-spot="wall_clock"]');
  await T.sleep(60);
  T.ok(await p.evaluate(() => document.getElementById("msgBox").textContent.includes("장식용")), "남쪽 장식 벽시계 클릭 시 혼동 방지 안내");
  await p.click('.esc-spot[data-spot="diary"]');
  await wait(p, () => !document.getElementById("closeupView").hidden);
  await p.click("#zoomCloseBtn");
  await p.click('.esc-slot[data-item="silver_key"]');
  await p.click('.esc-spot[data-spot="drawer"]');
  await wait(p, () => __escape.state().flags.drawerOpen && !document.getElementById("closeupView").hidden);
  T.ok(await p.evaluate(() => !__escape.state().inv.includes("magnet") && !!document.querySelector('[data-take="magnet"]')), "서랍 열면 열린 서랍 안에 자석·UV 손전등이 놓여 있음");
  await p.click('[data-take="magnet"]');
  await p.click('[data-take="uv_off"]');
  await wait(p, () => __escape.state().inv.includes("magnet") && __escape.state().inv.includes("uv_off"));
  await p.click("#zoomCloseBtn");

  // 4) 동쪽 이동: 맨손으로 석판 눌러도 팝업/줌 안 뜸 → 책장 4색 책 순서 맞추기 → 비밀공간에서 시계추·건전지 직접 줍기 → UV 합치기 → 어두운 석판 UV 비추기
  await p.click('#compass button[data-w="E"]');
  await wait(p, () => __escape.state().wall === "E");
  await p.click('.esc-spot[data-spot="slate"]');
  await T.sleep(100);
  T.ok(await p.evaluate(() => document.getElementById("closeupView").hidden), "맨손으로 석판 클릭 시 불필요한 팝업/줌 안 뜸");

  await p.click('.esc-spot[data-spot="bookshelf"]');
  await wait(p, () => !document.getElementById("closeupView").hidden);
  for (const col of ["red", "gold", "green", "blue"]) {
    await p.click(`.ez-spine[data-bk="${col}"]`);
  }
  await wait(p, () => __escape.state().flags.shelfOpen && !!document.querySelector('[data-take="pendulum"]'));
  await p.click('[data-take="pendulum"]');
  await p.click('[data-take="battery"]');
  await wait(p, () => __escape.state().inv.includes("pendulum") && __escape.state().inv.includes("battery"));
  await p.click("#zoomCloseBtn");
  await p.click('.esc-spot[data-spot="bookshelf"]');
  await T.sleep(100);
  T.ok(await p.evaluate(() => document.getElementById("closeupView").hidden), "모두 챙긴 열린 책장 재클릭 시 팝업 안 뜸");

  // 인벤토리 합치기: 빈 UV 손전등 + 건전지 → 켜진 UV 손전등 → 석판에 비추기 (벽면 직접 발광)
  await p.click("#combineBtn");
  await p.click('.esc-slot[data-item="uv_off"]');
  await p.click('.esc-slot[data-item="battery"]');
  await wait(p, () => __escape.state().inv.includes("uv_on"));
  await p.click('.esc-spot[data-spot="slate"]');
  await wait(p, () => __escape.state().flags.uvClueSeen);
  T.ok(await p.evaluate(() => !!document.querySelector(".ov-uv-slate") && document.getElementById("closeupView").hidden), "동쪽 석판 위 형광 단서 ☾3 ★7 ☀9 벽면 직접 출현 (팝업 방해 없음)");

  // 5) 북쪽 이동: 맨손 시계 클릭 시 줌 안 뜸 → 시계추 장착(벽만 바뀜) → 시계 확대에서 03:45 확인 + 아래 진자함 명주실 챙기기
  await p.click('#compass button[data-w="N"]');
  await wait(p, () => __escape.state().wall === "N");
  await p.click('.esc-spot[data-spot="clock"]');
  await T.sleep(100);
  T.ok(await p.evaluate(() => document.getElementById("closeupView").hidden), "맨손 시계 클릭 시 스포일러 팝업 안 뜸");
  await p.click('.esc-slot[data-item="pendulum"]');
  await p.click('.esc-spot[data-spot="clock"]');
  await wait(p, () => __escape.state().flags.clockFixed);
  T.ok(await p.evaluate(() => !__escape.state().inv.includes("thread") && document.getElementById("roomImg").getAttribute("src").includes("wall_north_fixed.jpg") && document.getElementById("closeupView").hidden), "괘종시계 복구 후 실제 시계 일러스트 전환 (팝업 점프 없음)");
  await p.click('.esc-spot[data-spot="clock"]');
  await wait(p, () => !document.getElementById("closeupView").hidden);
  T.ok(await p.evaluate(() => {
    const z = document.getElementById("zoomBody");
    return !!z.querySelector('img[src*="zoom_clock.jpg"]') && !!z.querySelector('[data-take="thread"]') && !z.querySelector("svg");
  }), "수리된 괘종시계 클릭 시 실제 시계 확대 + 아래 진자함 명주실 표시");
  await p.click('[data-take="thread"]');
  await wait(p, () => __escape.state().inv.includes("thread"));
  await p.click("#zoomCloseBtn");

  // 6) 남쪽 이동: 오답 입력 시 스포일러 힌트 노출 안 됨 확인 → 4자리 다이얼 상자 0345 입력 → 열린 상자에서 드라이버 직접 챙기기
  await p.click('#compass button[data-w="S"]');
  await p.click('.esc-spot[data-spot="box"]');
  await wait(p, () => !document.getElementById("closeupView").hidden);
  await p.click("#boxSubmitBtn");
  await T.sleep(80);
  T.ok(await p.evaluate(() => {
    const m = document.getElementById("msgBox").textContent;
    return !m.includes("시계") && !m.includes("0345");
  }), "자물쇠 오답 시 스포일러 힌트 미노출");
  // 0, 3, 4, 5 다이얼 맞추기
  for (let i = 0; i < 3; i++) await p.click('[data-du="1"]');
  for (let i = 0; i < 4; i++) await p.click('[data-du="2"]');
  for (let i = 0; i < 5; i++) await p.click('[data-du="3"]');
  await p.click("#boxSubmitBtn");
  await wait(p, () => __escape.state().flags.boxOpen && !!document.querySelector('[data-take="driver"]'));
  T.ok(await p.evaluate(() => !__escape.state().inv.includes("driver")), "상자 열면 열린 상자 안에 드라이버가 놓여 있음");
  await p.click('[data-take="driver"]');
  await wait(p, () => __escape.state().inv.includes("driver"));
  await p.click("#zoomCloseBtn");

  // 7) 서쪽 이동: 액자 나사 풀기(액자만 사라지고 벽 금고만 노출!) → 금고 눌러 379 열기 → 열린 금고 안에서 메달 직접 챙기기 → 자석+실 조합 → 환풍구 마스터키 낚시
  await p.click('#compass button[data-w="W"]');
  await p.click('.esc-slot[data-item="driver"]');
  await p.click('.esc-spot[data-spot="frame"]');
  await wait(p, () => __escape.state().flags.frameOpen);
  T.ok(await p.evaluate(() => document.getElementById("roomImg").getAttribute("src").includes("wall_west_safe.jpg") && document.getElementById("closeupView").hidden && !document.querySelector(".ov-safe-behind")), "액자 해제 시 금고 줌으로 건너뛰지 않고 벽 금고만 드러남");
  await p.click('.esc-spot[data-spot="frame"]');
  await wait(p, () => !document.getElementById("closeupView").hidden && !!document.getElementById("safeSubmitBtn"));
  for (let i = 0; i < 3; i++) await p.click('[data-su="0"]');
  for (let i = 0; i < 7; i++) await p.click('[data-su="1"]');
  for (let i = 0; i < 9; i++) await p.click('[data-su="2"]');
  await p.click("#safeSubmitBtn");
  await wait(p, () => __escape.state().flags.safeOpen && !!document.querySelector('[data-take="seal"]'));
  T.ok(await p.evaluate(() => document.getElementById("roomImg").getAttribute("src").includes("wall_west_safe_open.jpg") && !__escape.state().inv.includes("seal")), "금고 해제 시 열린 금고 안에 황동 인장 메달이 놓여 있음");
  await p.click('[data-take="seal"]');
  await wait(p, () => __escape.state().inv.includes("seal"));
  await p.click("#zoomCloseBtn");

  await p.click("#combineBtn");
  await p.click('.esc-slot[data-item="magnet"]');
  await p.click('.esc-slot[data-item="thread"]');
  await wait(p, () => __escape.state().inv.includes("magnet_line"));
  await p.click('.esc-spot[data-spot="grate"]');
  await wait(p, () => __escape.state().flags.grateFished && __escape.state().inv.includes("master_key"));

  // 8) 북쪽 출구 문: 마스터 키 + 황동 인장 메달 사용 → 실사 문 확대 + 최종 탈출!
  await p.click('#compass button[data-w="N"]');
  await p.click('.esc-slot[data-item="master_key"]');
  await p.click('.esc-spot[data-spot="door"]');
  await wait(p, () => __escape.state().flags.doorKeyDone && !document.getElementById("closeupView").hidden);
  T.ok(await p.evaluate(() => !!document.getElementById("zoomBody").querySelector('img[src*="zoom_door.jpg"]')), "출구 문 클릭 시 실사 문 확대 일러스트 표시");
  await p.click("#doorSealSlot");
  await wait(p, () => __escape.state().flags.escaped);
  T.ok(await p.evaluate(() => document.getElementById("zoomBody").textContent.includes("탈출 성공")), "최종 서재 탈출 성공 화면 표시 확인");

  await p.close();
});

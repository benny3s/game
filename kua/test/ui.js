/* 베니 크아 브라우저 통합 UI 시험 (node kua/test/ui.js)
   - 포털 모음 등록 · 모바일 화면 맞춤 · 1분 튜토리얼 실습(Ctrl 바늘) · 키보드 이동/물풍선 · 결과/AI 복기 · 친구랑 2인 mock Arena 동기화 검증 (소리 OFF) */
"use strict";
const U = require("../../test/qa/lib/uitest");

const wait = (p, fn, ms = 8000) => U.waitFor(p, fn, undefined, ms);

U.main(async T => {
  // 1) 포털 메인 '액션·스포츠 모음' 안에 베니 크아 포함 확인
  const pHome = await T.open("");
  await wait(pHome, () => document.querySelectorAll("#grid .capsule").length >= 6);
  await pHome.click('#grid .col-card[data-col="col_action"] .cap-art');
  await wait(pHome, () => !document.getElementById("colModal").hidden);
  const actionHrefs = await pHome.evaluate(() => [...document.querySelectorAll("#colGrid a.capsule")].map(a => a.getAttribute("href")));
  T.ok(actionHrefs.includes("kua/"), "포털 액션·스포츠 모음에 kua/ 포함 확인");
  await pHome.close();

  // 2) 베니 크아 메뉴 · 1분 튜토리얼 실습 · 혼자 하기 + 키보드 조작(소리 꺼짐)
  const p = await T.open("kua/");
  await wait(p, () => !!window.__kua && !!document.getElementById("startBtn"));
  await p.evaluate(() => __kua.setMuted(true));
  T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "모바일(390px) 가로 넘침 없음");

  await p.click("#helpBtn");
  await wait(p, () => !!document.querySelector(".tut-ov"));
  await p.click("#tutNext");
  await wait(p, () => !!document.getElementById("ktutNeedle"));
  await p.click("#ktutNeedle");
  await T.sleep(150);
  T.ok(await p.evaluate(() => !!document.querySelector("#tutTry.ok")), "베니 크아 튜토리얼 바늘 탈출 연습 완료");
  await p.click(".tut-x");

  // 캐릭터 선택 후 시작!
  await p.click('.k-char-btn[data-ch="bazzi"]');
  await wait(p, () => document.getElementById("charStatBox").textContent.includes("배찌"));
  await p.click("#startBtn");
  await wait(p, () => !document.getElementById("play").hidden && !!__kua.state());

  // PC 데스크톱 뷰포트(1180x800)에서 터치패드 비노출 + 사이드바(타이머/Ctrl아이템) + 한 화면 맞춤 확인
  await p.setViewportSize({ width: 1180, height: 800 });
  await T.sleep(80);
  const deskOk = await p.evaluate(() => {
    const tp = getComputedStyle(document.getElementById("touchPad")).display;
    const tv = document.getElementById("timerVal").textContent;
    const cb = document.getElementById("ctrlItemBox").textContent;
    const shell = document.querySelector(".k-arcade-shell").getBoundingClientRect();
    return { tp, tv, cb, h: shell.height, scroll: document.documentElement.scrollHeight };
  });
  T.ok(deskOk.tp === "none", "데스크톱 1180x800에서 가상 터치패드 숨김 (display=" + deskOk.tp + ")");
  T.ok(deskOk.tv.includes(":") && deskOk.cb.includes("Ctrl"), "크아 우측 사이드바 타이머 & Ctrl 바늘 슬롯 표시");
  T.ok(deskOk.h <= 790, "데스크톱 1180x800 세로 스크롤 없이 아케이드 프레임 수납 (h=" + Math.round(deskOk.h) + ")");

  // 워밍업 지나고 키보드 Space / 방향키 입력 테스트
  await wait(p, () => __kua.state().warmupMs <= 0, 4000);
  const startPos = await p.evaluate(() => {
    const me = __kua.state().players[0];
    return { x: me.x, y: me.y };
  });
  await p.keyboard.press("Space");
  await p.keyboard.down("ArrowRight");
  await T.sleep(250);
  await p.keyboard.up("ArrowRight");
  const after = await p.evaluate(() => {
    const st = __kua.state();
    return { bombs: st.bombs.length, x: st.players[0].x };
  });
  T.ok(after.bombs >= 1 && after.x > startPos.x, `키보드 Space 설치 & 방향키 이동 확인 (bombs=${after.bombs}, dx=${Math.round(after.x - startPos.x)})`);

  // 판 끝 복기 AI 선생님 동작 확인
  await p.evaluate(() => {
    const st = __kua.state();
    st.players.forEach((pl, i) => { if (i > 0) pl.state = "dead"; });
  });
  await wait(p, () => !document.getElementById("resultOv").hidden, 4000);
  await p.click("#resCoachBtn");
  await wait(p, () => document.querySelector(".cpn") && !document.querySelector(".cpn").hidden);
  T.ok(await p.evaluate(() => document.querySelector(".cpn-body").textContent.includes("내 흐름")), "판 종료 후 AI 선생님 복기 3요소 표시 확인");

  // 3) 온라인 친구랑 (Host + Guest mock) 실시간 스냅샷 동기화
  const pH = await T.open("kua/");
  await wait(pH, () => !!window.__kua);
  await pH.evaluate(() => __kua.setMuted(true));
  await pH.click("#tabFriend");
  await pH.click("#startBtn");
  await wait(pH, () => { const b = document.querySelector("[data-host]"); return b && __qa.vis(b) && !b.disabled; });
  await pH.click("[data-host]");
  const code = await wait(pH, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, 10000);
  T.ok(!!code, "베니 크아 아레나 방 코드 발급: " + code);

  const pG = await T.open("kua/", "room=" + code);
  await wait(pG, () => !!window.__kua);
  await pG.evaluate(() => __kua.setMuted(true));
  await wait(pH, () => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= 2, 10000);
  await wait(pH, () => { const b = document.querySelector("[data-start]"); return b && !b.disabled && __qa.vis(b); });
  await pH.click("[data-start]");
  await wait(pH, () => !document.getElementById("play").hidden && !!__kua.state());
  await wait(pG, () => !document.getElementById("play").hidden && !!__kua.state(), 8000);
  T.ok(await pG.evaluate(() => (__kua.state().p || []).length >= 2), "게스트 화면에 실시간 경기장 스냅샷 동기화 완료");

  await pG.close();
  await pH.close();
  await p.close();
});

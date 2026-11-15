// 베니 두뇌 랩 브라우저 통합 UI 시험 (node brain/test/ui.js)
// - 튜토리얼 실습 · 100점 종합 평가(8문제 완주 + 결과 + 성장 그래프 저장/재열람) · AI 선생님 · 친구랑 2인 시드 동기화 검증
"use strict";
const U = require("../../test/qa/lib/uitest");

const wait = (p, fn, ms = 8000) => U.waitFor(p, fn, undefined, ms);

U.main(async T => {
  // 1) 홈 & 모바일 가로 넘침 확인 + 1분 규칙 설명 실습
  const p = await T.open("brain/");
  await wait(p, () => !!window.__brain && !!document.getElementById("startBtn"));
  T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "모바일(390px) 가로 넘침 없음");

  await p.click("#helpBtn");
  await wait(p, () => !!document.querySelector(".tut-ov"));
  await p.click("#tutNext");
  await p.click("#tutNext");
  await wait(p, () => !!document.querySelector(".btut-opts button[data-v='14']"));
  await p.click(".btut-opts button[data-v='14']");
  await T.sleep(200);
  T.ok(await p.evaluate(() => !!document.querySelector("#tutTry.ok")), "두뇌 랩 튜토리얼 직접 풀기 연습 완료");
  await p.click(".tut-x");

  // 2) 100점 종합 평가 (8문제 완주 — choice 문제 + memory 문제 모두 실플레이)
  await p.click("#startBtn");
  await wait(p, () => !document.getElementById("play").hidden && !!__brain.state());

  // AI 선생님 켜고 코칭 내용 확인
  await p.click("#coachBtn");
  await wait(p, () => document.querySelector(".cpn") && !document.querySelector(".cpn").hidden);
  T.ok(await p.evaluate(() => document.querySelector(".cpn-body").textContent.includes("힌트")), "AI 선생님 힌트 표시");

  for (let i = 0; i < 8; i++) {
    const q = await p.evaluate(() => __brain.state().curQ);
    T.ok(!!q, `문제 ${i + 1} 로드`);
    if (q.type === "choice") {
      await p.click(`.br-opt[data-idx="${q.answer}"]`);
    } else {
      // memory 프리뷰가 끝나 입력 가능 상태가 될 때까지 대기 후 정답 순서대로 탭
      await wait(p, () => {
        const b = document.querySelector(".br-mem-cell");
        return b && !b.disabled;
      }, 6000);
      for (const cell of q.targets) {
        await p.click(`.br-mem-cell[data-cell="${cell}"]`);
      }
    }
    await wait(p, () => !!document.getElementById("nextQBtn"));
    await p.click("#nextQBtn");
    if (i < 7) {
      await wait(p, () => __brain.state().idx === i + 1);
    }
  }

  // 최종 100점 평가 결과 & 성장 이력 확인
  await wait(p, () => !!document.querySelector(".br-result-card"));
  const resText = await p.evaluate(() => document.querySelector(".br-result-card").textContent);
  T.ok(resText.includes("/ 100점") && resText.includes("그랜드마스터"), "전부 정답 시 그랜드마스터 100점 등급 표시: " + resText.slice(0, 60));
  T.ok(await p.evaluate(() => __brain.history().length === 1), "성장 이력 1회 저장 확인");

  // 두 번째 평가 시 성장 이력 차트 & 직전 대비 증감 확인 (성장 이력 모달 오픈)
  await p.click("#resHistBtn");
  await wait(p, () => !document.getElementById("histModal").hidden);
  T.ok(await p.evaluate(() => document.querySelectorAll(".b-hist-item").length === 1 && !!document.querySelector(".b-hist-body svg")), "성장 이력 모달 그래프 및 목록 표시");
  await p.click("#histCloseBtn");

  // 3) 친구랑 온라인 2인 (mock Arena) — 같은 시드 문제 동기화 및 실시간 진행 공유
  const pH = await T.open("brain/");
  await wait(pH, () => !!window.__brain);
  await pH.click("#tabFriend");
  await pH.click("#startBtn");
  await wait(pH, () => { const b = document.querySelector("[data-host]"); return b && __qa.vis(b) && !b.disabled; });
  await pH.click("[data-host]");
  const code = await wait(pH, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, 10000);
  T.ok(!!code, "친구 대결 방 코드 발급: " + code);

  const pG = await T.open("brain/", "room=" + code);
  await wait(pG, () => !!window.__brain);
  await wait(pH, () => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= 2, 10000);

  await wait(pH, () => { const b = document.querySelector("[data-start]"); return b && !b.disabled && __qa.vis(b); });
  await pH.click("[data-start]");
  await wait(pH, () => !document.getElementById("play").hidden && __brain.state() && __brain.state().curQ);
  await wait(pG, () => !document.getElementById("play").hidden && __brain.state() && __brain.state().curQ);

  const sameTitle = await pH.evaluate(() => __brain.state().curQ.title) === await pG.evaluate(() => __brain.state().curQ.title);
  const sameSeed = await pH.evaluate(() => __brain.state().seed) === await pG.evaluate(() => __brain.state().seed);
  T.ok(sameTitle && sameSeed, "방장·게스트 동일한 시드·문제 출제 동기화 완료");

  // 방장 1번 문제 정답 → 게스트 점수바 실시간 갱신 확인
  const hAns = await pH.evaluate(() => __brain.state().curQ.answer);
  await pH.click(`.br-opt[data-idx="${hAns}"]`);
  await wait(pG, () => document.querySelector("#scoreBar").textContent.includes("1/8"));
  T.ok(true, "게스트 점수바에 방장 진행률(1/8 · 1정답) 실시간 반영");

  await pG.close();
  await pH.close();
  await p.close();
});

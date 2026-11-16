// 복잡 7종목(섯다·포커·원카드·윷놀이·체스·장기·바둑) 1분 규칙 설명 UI 검증 (node common/test/tutorials-ui.js)
"use strict";
const U = require("../../test/qa/lib/uitest");
const wait = (p, fn, ms = 6000) => U.waitFor(p, fn, undefined, ms);

U.main(async T => {
  const games = ["seotda", "poker", "onecard", "yut", "chess", "janggi", "baduk"];
  for (const g of games) {
    const p = await T.open(`${g}/`);
    await wait(p, () => !!document.getElementById("tutBtn"));
    await p.click("#tutBtn");
    await wait(p, () => !!document.querySelector(".tut-ov"));
    const subLen = await p.evaluate(() => document.getElementById("tutSub").textContent.trim().length);
    T.ok(subLen > 10, `${g}: 1분 규칙 설명 열림 및 자막 표시`);
    // 2번 다음 → 3번째 체험 스텝 도달
    await p.click("#tutNext");
    await p.click("#tutNext");
    const tryVis = await wait(p, () => {
      const el = document.getElementById("tutTry");
      return el && !el.hidden && el.textContent.trim().length > 4;
    });
    T.ok(tryVis, `${g}: STEP 3 직접 체험 배너 표시`);
    await p.click(".tut-x");
    await p.close();
  }
});

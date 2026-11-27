// 부자 게임 화면 시험: node survival/test/richgame_ui.js [--shots 폴더] [--runs 3]
//  s3ui_lib: 화면 단추(＋ · － · 아이템 · 걸기 확정)만 눌러 끝까지 (3 · 4 · 6명, 방송 · 새 시세 번갈아) + 선생님 글 + 결과 + 1분 규칙(직접 해 보기)
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const info = await page.evaluate(() => { const h = window.__h, V = h.view(); return { round: V.round, items: V.items[h.ME], draft: [...document.querySelectorAll('.rg-ctl .n')].map(e => +e.firstChild.nodeValue), pick: !!document.querySelector('.rg-col.pk'), done: V.done[h.ME] }; });
  if (info.done) return false;
  if (info.pick) { await page.locator('.rg-hd').nth(step % 4).click(); return true; }
  if (info.round >= 1 && info.items && info.items.trend > 0 && step % 4 === 0) { await page.locator('[data-it=trend]').click(); return true; }
  if (info.round === 0 && info.items && info.items.id > 0 && step % 5 === 0) { await page.locator('[data-it=id]').click(); return true; }
  const total = info.draft.reduce((a, b) => a + b, 0);
  if (total < 3 + (step % 3)) {
    const c = step % 4, b = page.locator(`[data-p="${c}"]:not([disabled])`);
    if (await b.count()) { await b.click(); return true; }
  }
  if (step % 7 === 0 && total > 0) { const m = page.locator('[data-m]:not([disabled])'); if (await m.count()) { await m.first().click(); return true; } }
  await page.locator('[data-a=bid]').click(); return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ i, k }) => {
    const box = document.getElementById('tutStage');
    const els = [...box.querySelectorAll('[data-bid]')];
    if (!els.length) return false; els[k % els.length].click(); return true;
  }, { i, k });
}
run('richgame', policy, { runs: 4, ns: [3, 4, 6, 5], tutPolicy, allShots: false, query: r => (r % 2 ? 'cfg_mode=1' : 'cfg_mode=0') });

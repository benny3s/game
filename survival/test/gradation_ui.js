// 그라데이션 화면 시험: node survival/test/gradation_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'setup') {
    const have = await page.locator('.gr-edit .gr-b.pick').count();
    const okBtn = page.locator('[data-a=ok]');
    if (have === 7) { await okBtn.click(); return true; }
    if (await okBtn.isDisabled().catch(() => false) === false && have < 7) { /* 7개가 아닌데 시작이 켜져 있으면 안 됨 */ throw new Error('큐브 ' + have + '개인데 시작 단추가 켜져 있음'); }
    if (step % 13 === 5) { await page.locator('[data-a=rec]').click(); return true; }
    if (step % 17 === 3 && have > 0) { await page.locator('.gr-edit .gr-b.pick').first().click(); return true; }
    const add = page.locator('[data-add]:not([disabled])'), n = await add.count();
    if (!n) return false;
    await add.nth((step * 7) % n).click(); return true;
  }
  if (ph === 'play') {
    const b = page.locator('[data-pick]'), n = await b.count();
    if (!n) return false;
    await b.nth((step * 5) % n).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ i, k }) => {
    const box = document.getElementById('tutStage');
    if (i === 1) { const a = [...box.querySelectorAll('[data-add]:not([disabled])')]; if (!a.length) return false; a[k % a.length].click(); return true; }
    const v = [...box.querySelectorAll('[data-v]')]; if (!v.length) return false; v[k % v.length].click(); return true;
  }, { i, k });
}
run('gradation', policy, { runs: 4, tutPolicy });

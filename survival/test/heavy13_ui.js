// 무거운 13 화면 시험: node survival/test/heavy13_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'choose') {
    const hasCard = await page.locator('.h13-card.sel').count(), hasChip = await page.locator('.h13-chip.sel').count();
    if (!hasCard) { const c = page.locator('.h13-card:not([disabled])'), n = await c.count(); if (!n) return false; await c.nth((step * 3) % n).click(); return true; }
    if (!hasChip) { const c = page.locator('.h13-chip:not([disabled])'), n = await c.count(); if (!n) return false; await c.nth((step * 5) % n).click(); return true; }
    const ok = page.locator('[data-a=ok]');
    if (await ok.isDisabled()) throw new Error('카드와 칩을 골랐는데 확정이 꺼져 있음');
    await ok.click(); return true;
  }
  if (ph === 'place') {
    const pass = page.locator('[data-a=pass]');
    if (step % 4 === 0 && (await pass.count())) { await pass.click(); return true; }
    const put = page.locator('[data-put]'), n = await put.count();
    if (!n) return false;
    await put.nth(step % n).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ i, k }) => {
    const box = document.getElementById('tutStage');
    const els = i === 1 ? [...box.querySelectorAll('[data-w]')] : [...box.querySelectorAll('[data-a]')];
    if (!els.length) return false; els[k % els.length].click(); return true;
  }, { i, k });
}
run('heavy13', policy, { runs: 3, ns: [3, 5, 7], tutPolicy, allShots: true });

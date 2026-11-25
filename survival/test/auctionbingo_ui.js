// 경매 빙고 화면 시험: node survival/test/auctionbingo_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'pick') {
    const b = page.locator('.ab-box.can'), n = await b.count();
    if (!n) return false;
    await b.nth(step % n).click(); return true;
  }
  if (ph === 'bid') {
    const btn = page.locator('[data-a=bid]');
    if (!(await btn.count())) return false;
    if (!(await btn.isDisabled())) { await btn.click(); return true; }
    const coins = page.locator('.ab-coin:not([disabled]):not(.sel)'), n = await coins.count();
    if (!n) return false;
    await coins.nth(step % n).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ k }) => {
    const c = [...document.getElementById('tutStage').querySelectorAll('.ab-coin')]; if (!c.length) return false;
    c[k % c.length].click(); return true;
  }, { k });
}
run('auctionbingo', policy, { runs: 3, ns: [3, 5, 8], tutPolicy });

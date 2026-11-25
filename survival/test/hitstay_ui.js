// HIT, STAY 화면 시험: node survival/test/hitstay_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'reveal') {
    const c = page.locator('.hs-c.pick'), n = await c.count();
    if (!n) return false;
    await c.nth(step % n).click(); return true;
  }
  if (ph === 'bet1' || ph === 'bet2') {
    const pref = step % 5 === 0 ? '[data-a=raise]' : step % 7 === 0 ? '[data-a=fold]' : '[data-a=call],[data-a=check]';
    let b = page.locator(pref); if (!(await b.count())) b = page.locator('[data-a=call],[data-a=check],[data-a=fold]');
    if (!(await b.count())) return false;
    await b.first().click(); return true;
  }
  if (ph === 'hit') {
    const b = page.locator(step % 3 === 0 ? '[data-a=hit]:not([disabled])' : '[data-a=stay]');
    if (!(await b.count())) { const s = page.locator('[data-a=stay]'); if (!(await s.count())) return false; await s.click(); return true; }
    await b.first().click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-a=hit]'); if (!b) return false; b.click(); return true; });
}
run('hitstay', policy, { runs: 4, ns: [2, 4, 6], tutPolicy, query: r => (r % 2 ? 'cfg_chips=15' : '') });

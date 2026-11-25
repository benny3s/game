// 보석 암시장 화면 시험: node survival/test/gemmarket_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph !== 'swap') return false;
  const sw = page.locator('[data-a=swap]');
  if (!(await sw.count())) return false;
  if (!(await sw.isDisabled())) { await sw.click(); return true; }
  const pk = page.locator('[data-a=peek]');
  if (step % 6 === 0 && (await pk.count()) && !(await pk.isDisabled())) {
    await pk.click();
    const slots = page.locator('.gm-slot:not([disabled])'), n = await slots.count();
    if (n) { await slots.nth(step % n).click(); return true; }
    return true;
  }
  const t = page.locator('[data-to]:not([disabled])'), n = await t.count();
  if (!n) return false;
  await t.nth(step % n).click(); return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ k }) => {
    const c = [...document.getElementById('tutStage').querySelectorAll('[data-v]')]; if (!c.length) return false;
    c[k % c.length].click(); return true;
  }, { k });
}
run('gemmarket', policy, { runs: 3, ns: [9, 4, 6], tutPolicy });

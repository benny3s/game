// 벽바둑 화면 시험: node survival/test/wallgo_ui.js [--shots 폴더] [--runs 4]
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step, run: r }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'place') {
    const kinds = page.locator('[data-kind]:not([disabled])'), kn = await kinds.count();
    if (kn > 1 && step % 3 === 0) { await kinds.nth(step % kn).click(); }
    const cells = page.locator('.wg-cell.go'), n = await cells.count();
    if (!n) return false;
    await cells.nth((step * 7) % n).click(); return true;
  }
  if (ph === 'move') {
    const st = await page.evaluate(() => ({ dest: document.querySelectorAll('.wg-cell.dest').length, can: document.querySelectorAll('.wg-pc.can').length }));
    if (!st.dest) {
      if (!st.can) return false;
      const pcs = page.locator('.wg-cell:has(.wg-pc.can)'); await pcs.nth(step % st.can).click(); return true;
    }
    const plain = page.locator('.wg-cell.dest:not(.brk)'), brk = page.locator('.wg-cell.dest.brk');
    const np = await plain.count(), nb = await brk.count();
    if (nb && (step % 5 === 0 || !np)) { const b = brk.nth(step % nb); await b.click(); await page.locator('.wg-cell.dest.cf').first().click(); return true; }   // 벽 부수기: 두 번 눌러 확정
    if (!np) return false;
    await plain.nth(step % np).click(); return true;
  }
  if (ph === 'wall') {
    const w = page.locator('[data-wall]:not([disabled])'), n = await w.count();
    if (!n) return false;
    await w.nth(step % n).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ i, k }) => {
    const box = document.getElementById('tutStage');
    const els = [...box.querySelectorAll('[data-w]')];
    if (!els.length) return false; els[k % els.length].click(); return true;
  }, { i, k });
}
run('wallgo', policy, { runs: 4, ns: [3], tutPolicy, allShots: false, query: r => (r % 2 ? 'cfg_ver=classic' : 'cfg_ver=ii') });

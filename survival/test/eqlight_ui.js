// 수식 신호등 화면 시험: node survival/test/eqlight_ui.js [--shots 폴더] [--runs 3]
'use strict';
const { run } = require('./s3ui_lib.js');

let bsUsed = false, tapUsed = false;
async function policy(page, { step, run: r }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  const info = await page.evaluate(() => ({ cells: [...document.querySelectorAll('.eql-in .eql-c')].map(c => c.textContent.trim()), msg: (document.querySelector('.eql-msg') || {}).textContent || '' }));
  const filled = info.cells.filter(Boolean).length;
  if (ph === 'set') {
    if (await page.locator('[data-a=sample]').count() === 0) return false;
    if (r % 2 === 0) {                                   // 예시 버튼
      if (!filled) { await page.locator('[data-a=sample]').click(); return true; }
    } else {                                              // 손으로 입력
      const target = [...'12+3×4=24'];
      if (filled < 9) { await page.locator(`[data-k="${target[filled]}"]`).click(); return true; }
    }
    const ok = page.locator('[data-a=ok]');
    if (await ok.isDisabled()) throw new Error('성립하는 수식인데 정하기가 꺼져 있음: ' + info.msg);
    await ok.click(); return true;
  }
  if (ph === 'guess') {
    if (await page.locator('[data-a=ok]').count() === 0) return false;
    const rec = await page.evaluate(() => window.__h.coach().rec);
    const target = [...(rec && rec.length === 9 ? rec : '12+3×4=24')];
    if (filled === 0) { bsUsed = false; tapUsed = false; }
    if (filled === 4 && !bsUsed && r === 0) { bsUsed = true; await page.locator('[data-k=bs]').click(); return true; }
    if (filled < 9) { await page.locator(`[data-k="${target[filled]}"]`).click(); return true; }
    if (!tapUsed && r === 0) { tapUsed = true; await page.locator('[data-c="0"]').click(); await page.locator(`[data-k="${target[0]}"]`).click(); return true; }
    const ok = page.locator('[data-a=ok]');
    if (await ok.isDisabled()) throw new Error('9칸을 채웠는데 추측이 꺼져 있음');
    await ok.click(); return true;
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
run('eqlight', policy, { runs: 3, ns: [2], tutPolicy, allShots: true });

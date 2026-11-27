// 같은 그림 찾기 화면 시험: node survival/test/gn-samepic_ui.js [--shots 폴더] [--runs 4]
//  s3ui_lib: 화면 단추만 눌러 끝까지 (시즌 4 · 시즌 1·2 번갈아) + 선생님 글 + 결과 + 1분 규칙(직접 해 보기)
'use strict';
const { run } = require('./s3ui_lib.js');

async function policy(page, { step }) {
  const info = await page.evaluate(() => { const V = window.__h.view(); return { ph: V.phase, can: V.can, tgt: V.tgt[window.__h.ME], known: V.known, pic: window.__h.st().pic }; });
  if (info.ph === 'first') { await page.locator('[data-first]').nth(step % 2).click(); return true; }
  if (info.can && step % 3 === 0) { await page.locator('[data-a=stop]').click(); return true; }
  const k = info.pic.indexOf(info.tgt), cells = page.locator('.sp-c:not([disabled])'), n = await cells.count();
  if (!n) return false;
  const kk = step % 4 === 0 && k >= 0 ? k : (step * 5) % 16;
  await page.locator(`.sp-c[data-k="${kk}"]`).click(); return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(({ i, k }) => {
    const box = document.getElementById('tutStage');
    const els = [...box.querySelectorAll('[data-k]')];
    if (!els.length) return false; els[k % els.length].click(); return true;
  }, { i, k });
}
run('gn-samepic', policy, { runs: 4, ns: [2], tutPolicy, allShots: true, query: r => (r % 2 ? 'cfg_ver=1' : 'cfg_ver=4') });

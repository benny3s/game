// 오름차순 화면 시험: node survival/test/ascend_ui.js [--shots 폴더] [--runs 4]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 선생님 글은 숨은 것(남의 시트)만 바꾼 두 장면에서 같아야 하고, 비지 않아야 함
(() => {
  const core = require(path.join(ROOT, 'games/ascend/core.js'));
  global.window = { SVCores: { ascend: core } };
  require(path.join(ROOT, 'games/ascend/ui.js'));
  const U = global.window.SVUI.ascend;
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  let n = 0;
  for (let k = 0; k < 20; k++) {
    const players = 2 + (k % 5), st = core.init({ n: players, seed: 800 + k, cfg: {} });
    let rs = k + 3; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 40 + k * 3 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      for (const s of [0, 1]) {
        const st2 = JSON.parse(JSON.stringify(st));
        for (let j = 0; j < players; j++) if (j !== s) {
          const cnt = st2.sheets[j].filter(x => x != null).length, cells = [...Array(10).keys()].sort(() => r() - 0.5).slice(0, cnt);
          st2.sheets[j] = Array(10).fill(null); cells.forEach(c => { st2.sheets[j][c] = 1 + Math.floor(r() * 10); });
        }
        if (st.phase === 'show') continue;
        const names = Array.from({ length: players }, (_, i) => 'P' + i);
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 남의 시트로 바뀜 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
  }
  nok(n > 100, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'say') {
    const b = page.locator(`[data-a=say][data-v="${1 + (step * 7) % 10}"]`);
    if (!(await b.count())) return false;
    await b.click(); return true;
  }
  if (ph === 'put') {
    const cells = page.locator('[data-c]'), n = await cells.count();
    if (!n) return false;
    await cells.nth(step % n).click();
    const ok = page.locator('[data-a=put]:not([disabled])');
    if (!(await ok.count())) return false;
    await ok.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  // 불린 숫자 (큰 동그라미) 가 들어갈 수 있는 빈칸: 양옆 숫자 사이
  return page.evaluate(() => {
    const box = document.getElementById('tutStage'), cur = +box.querySelector('.as-big').textContent;
    const all = [...box.querySelectorAll('.as-sheet .as-c')];
    if (!all.length || isNaN(cur)) return false;
    const vals = all.map(el => (el.classList.contains('e') ? null : +el.textContent));
    for (let c = 0; c < all.length; c++) {
      if (vals[c] != null) continue;
      let a = c - 1; while (a >= 0 && vals[a] == null) a--;
      let b = c + 1; while (b < vals.length && vals[b] == null) b++;
      if ((a < 0 || vals[a] <= cur) && (b >= vals.length || cur <= vals[b])) { all[c].click(); return true; }
    }
    return false;
  });
}
(async () => {
  await run('ascend', policy, { runs: 4, ns: [2, 4, 6, 3], tutPolicy, query: r => (r === 1 ? 'cfg_rounds=3' : '') });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

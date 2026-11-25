// 배틀 오름차순 화면 시험: node survival/test/ascbattle_ui.js [--shots 폴더] [--runs 4]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 선생님 글은 '앞으로 뽑힐 카드'(숨은 것)를 바꾼 두 장면, 시점(seat) 만 다른 두 장면에서 같아야 하고 비지 않아야 함
(() => {
  const core = require(path.join(ROOT, 'games/ascbattle/core.js'));
  global.window = { SVCores: { ascbattle: core } };
  require(path.join(ROOT, 'games/ascbattle/ui.js'));
  const U = global.window.SVUI.ascbattle;
  nok(U.board === true && U.min === 2 && U.max === 2, '한 기기 됨 · 2명 고정');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  let n = 0;
  const names = ['나', '삐약'];
  for (let k = 0; k < 24; k++) {
    const st = core.init({ n: 2, seed: 900 + k, cfg: {} });
    let rs = k + 5; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 40 && !core.over(st); steps++) {
      const need = core.needs(st);
      for (const s of [0, 1]) {
        const st2 = JSON.parse(JSON.stringify(st)); st2.rs = (st.rs ^ 0x5bd1e995) >>> 0;   // 앞으로 뽑힐 카드만 달라짐
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names), c3 = U.coach(core.view(st, -1), s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 앞으로 뽑힐 카드로 바뀜 (자리 ${s}, ${st.phase})`);
        nok(JSON.stringify(c1) === JSON.stringify(c3), `선생님 글이 시점(seat)에 따라 바뀜 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        if (need.includes(s)) nok(/칸/.test(c1.rec), `차례인데 추천이 칸을 말하지 않음 ${c1.rec}`);
        n++;
      }
      const seat = need[0], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(JSON.stringify(fin)), '끝난 판 선생님 글');
    nok(typeof U.result(core.view(st, 0), 0) === 'string' && /칸/.test(U.result(core.view(st, 0), 0)), '결과 html');
  }
  nok(n > 100, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (카드 고르기 → 칸 고르기 → 확인)
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'keep') {
    const cards = page.locator('[data-k]');
    if (!(await cards.count())) return false;
    await cards.nth(step % 2).click();
    if (step % 3 === 0) await cards.nth((step + 1) % 2).click();          // 카드 바꿔 누르기도
    const cells = page.locator('[data-c]'), n = await cells.count();
    if (!n) return false;
    await cells.nth(step % n).click();
    const ok = page.locator('[data-a=ok]:not([disabled])');
    if (!(await ok.count())) return false;
    await ok.click(); return true;
  }
  if (ph === 'put') {
    const cells = page.locator('[data-c]'), n = await cells.count();
    if (!n) return false;
    await cells.nth(step % n).click();
    const ok = page.locator('[data-a=ok]:not([disabled])');
    if (!(await ok.count())) return false;
    await ok.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => {
    const box = document.getElementById('tutStage');
    const cards = [...box.querySelectorAll('[data-k]')], all = [...box.querySelectorAll('.ab-sheet .ab-c')];
    if (!cards.length || !all.length) return false;
    const vals = all.map(el => (el.classList.contains('e') ? null : +el.textContent));
    for (const card of cards) {
      const v = +card.textContent;
      for (let c = 0; c < all.length; c++) {
        if (vals[c] != null) continue;
        let a = c - 1; while (a >= 0 && vals[a] == null) a--;
        let b = c + 1; while (b < vals.length && vals[b] == null) b++;
        if ((a < 0 || vals[a] <= v) && (b >= vals.length || v <= vals[b])) {
          if (!card.classList.contains('sel')) { card.click(); return true; }
          all[c].click(); return true;
        }
      }
    }
    return false;
  });
}
(async () => {
  await run('ascbattle', policy, { runs: 4, ns: [2, 2, 2, 2], tutPolicy });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

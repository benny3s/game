// 메인 컬러 화면 시험: node survival/test/maincolor_ui.js [--shots 폴더] [--quick]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), why: c.why }; };

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me] of [[7, 2], [4, 0]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'maincolor', `seed=${4 + n}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `mc-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, shows = 0, coached = 0, steps = 0;
    for (let k = 1; k <= 120; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, hand: V.hand, main: V.main }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      if (k === 1) await shot('vote');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { shows++; if (shows === 1) await shot('show'); await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (coached < (QUICK ? 2 : 6)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && (!r.need || r.why.length > 20), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 2 && vp.w === 375 && r.need && n === 7) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시:\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      if (s.phase === 'vote') { await page.locator(`[data-vote="${k % 3}"]`).click(); continue; }
      // 카드 내기: 단추로 하나씩 올리기
      steps++;
      const plus = page.locator('[data-k][data-d="1"]:not([disabled])'), np = await plus.count();
      if (steps === 1) await shot('sub');
      if (np) { await plus.nth(k % np).click(); await plus.first().isVisible().catch(() => 0); }
      if (steps % 3 === 0) { await page.locator('[data-a=all]').click(); const minus = page.locator('[data-k][data-d="-1"]:not([disabled])'); if (await minus.count()) await minus.first().click(); }
      const sm = await page.evaluate(() => document.querySelector('.mc-sum').innerText);
      ok(/낼 카드 \d+장 → 점수 \d+/.test(sm), `${tag} #${k}: 합계 줄 ${sm}`);
      if (steps === 2) await shot('sub2');
      await page.locator('[data-a=sub]').click();
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/라운드/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 100)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'maincolor', 'seed=4&n=5&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ vote: document.querySelectorAll('[data-vote]').length, hand: document.querySelectorAll('.mc-hand').length }));
  ok(r.vote === 0 && r.hand === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) {
  const v = page.locator('[data-vote]'); if (await v.count()) { await v.nth(step % 3).click(); return true; }
  const plus = page.locator('[data-k][data-d="1"]:not([disabled])'), np = await plus.count();
  if (np && step % 2) await plus.nth(step % np).click();
  const sb = page.locator('[data-a=sub]'); if (!(await sb.count())) return false;
  await sb.click(); return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => { const b = document.getElementById('tutStage').querySelector(`[data-n="${k2 === 0 ? 5 : 3}"]`); if (!b) return false; b.click(); return true; }, k);
}
(async () => {
  const f = await session('메인 컬러 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('maincolor', policy, { runs: QUICK ? 2 : 4, ns: [5, 3, 7, 4], tutPolicy, query: r => (r % 2 ? 'cfg_rounds=3' : '') });
})();

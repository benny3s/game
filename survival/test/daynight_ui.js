// 낮과 밤 화면 시험: node survival/test/daynight_ui.js [--shots 폴더] [--quick]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), why: c.why }; };

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me] of [[8, 2], [4, 0]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'daynight', `seed=${4 + n}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `dn-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, shows = 0, coached = 0, steps = 0;
    for (let k = 1; k <= 140; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      if (k === 1) await shot('bid');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { shows++; if (shows === 1) await shot('show'); await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (coached < (QUICK ? 2 : 6)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && (!r.need || r.why.length > 20), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 2 && vp.w === 375 && r.need && n === 8) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시:\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      steps++;
      if (steps === 1) await shot('bid2');
      const plus = page.locator('[data-d="1"]:not([disabled])');
      if (await plus.count()) await plus.first().click();
      if (steps % 2 === 0) { const q3 = page.locator('[data-q="3"]'); if (await q3.count()) await q3.first().click(); }
      if (steps % 5 === 0) { const q0 = page.locator('[data-q="0"]'); if (await q0.count()) await q0.first().click(); }
      const t = await page.evaluate(() => document.querySelector('[data-a=bid]').innerText);
      ok(/\d+개 내기/.test(t), `${tag} #${k}: 내기 단추 ${t}`);
      await page.locator('[data-a=bid]').click();
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/라운드/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 100)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'daynight', 'seed=4&n=5&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ bid: document.querySelectorAll('[data-a=bid]').length, own: /내 구역/.test(document.body.innerText) }));
  ok(r.bid === 0 && !r.own, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) {
  const q = page.locator('[data-q]'); const nq = await q.count();
  if (nq && step % 2) await q.nth(step % nq).click();
  const sb = page.locator('[data-a=bid]'); if (!(await sb.count())) return false;
  await sb.click(); return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => { const b = document.getElementById('tutStage').querySelector(`[data-n="${k2 === 0 ? 3 : 0}"]`); if (!b) return false; b.click(); return true; }, k);
}
(async () => {
  const f = await session('낮과 밤 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('daynight', policy, { runs: QUICK ? 2 : 4, ns: [6, 4, 8, 5], tutPolicy });
})();

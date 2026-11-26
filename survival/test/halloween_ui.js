// 핼러윈 몬스터 화면 시험: node survival/test/halloween_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판 끝까지: 넘침 · 잘림 · 전장 카드가 core 와 같은지 · 선생님 · 쌍검 두 전장
//  ② s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 + 결과 + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  const cards = [...st.querySelectorAll('.hw-field .hw-mon')];
  if (cards.length !== 3) bad.push('전장 ' + cards.length);
  V.field.forEach((m, f) => {
    const c = cards[f]; if (!c) return;
    if (!m) { if (!c.classList.contains('empty')) bad.push('빈 전장 ' + f); return; }
    const hv = c.querySelector('.hv').innerText.replace(/\s/g, '');
    if (hv !== `♥최대${m.max}`) bad.push(`최대 체력 ${f}: ${hv} ≠ ${m.max}`);
    if (m.hp != null && !V.over) bad.push('보이는 view 에 남은 체력 ' + f);
    if (c.querySelector('.hv2').innerText.replace(/\s/g, '') !== `내공격${m.est}`) bad.push(`내 공격 ${f}`);
    if (/♥\s*\d+\s*\/\s*\d+/.test(c.innerText)) bad.push('남은 체력 글 ' + f);
  });
  if (V.phase === 'show' && V.res && st.querySelectorAll('.hw-show .r').length !== V.res.turns.length) bad.push('결과 줄');
  if (V.phase === 'pick' && st.querySelector('.hw-show')) bad.push('고르는 중에 결과 줄');
  return bad;
};
const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me) && V.phase === 'pick', why: c.why }; };

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me, cfg] of [[4, 0, ''], [6, 2, '&cfg_mons=all']]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'halloween', `seed=${3 + n}&n=${n}&me=${me}${cfg}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `hw-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, shows = 0, picked = 0, coached = 0, twinTried = false;
    for (let k = 1; k <= 160; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, twin: (V.inv[h.ME].twin || 0) > 0 }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW); ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 3)}`);
      if (k === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { shows++; if (shows === 1) await shot('show'); await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (k % 3 === 1 && coached < (QUICK ? 2 : 5)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && (!r.need || /%/.test(r.why)), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 1 && vp.w === 375 && r.need && n === 4) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시:\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      const fs = page.locator('.hw-mon.pick'), nf = await fs.count();
      ok(nf >= 1, `${tag} #${k}: 누를 수 있는 전장 없음`);
      if (k === 1) await shot('mine');
      await fs.nth(k % nf).click();
      if (s.twin && !twinTried && nf >= 2) {
        twinTried = true; await page.locator('.hw-w[data-w=twin]').click(); await fs.nth((k + 1) % nf).click();
        const two = await page.evaluate(() => document.querySelectorAll('.hw-mon.sel2').length);
        ok(two === 1, `${tag} #${k}: 쌍검 두 번째 전장 표시 ${two}`);
        await shot('twin');
      } else if (k % 4 === 2) {
        const ws = page.locator('.hw-w'), nw = await ws.count(); await ws.nth(nw - 1).click();
      }
      const go = page.locator('[data-a=go]'); ok(await go.isEnabled(), `${tag} #${k}: 전장을 골랐는데 공격 단추가 꺼져 있음`);
      await go.click(); picked++;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`); ok(picked >= 2, `${tag}: 낸 횟수 ${picked}`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/라운드/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 120)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'halloween', 'seed=4&n=4&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ mon: document.querySelectorAll('.hw-mon').length, me: document.querySelectorAll('.hw-me').length, go: document.querySelectorAll('[data-a=go]').length }));
  ok(r.mon === 3 && r.me === 0 && r.go === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) {
  const fs = page.locator('.hw-mon.pick'), n = await fs.count(); if (!n) return false;
  await fs.nth(step % n).click();
  const ws = page.locator('.hw-w'), nw = await ws.count();
  if (nw > 1 && step % 3 === 0) { await ws.nth(1 + (step % (nw - 1))).click(); }
  const go = page.locator('[data-a=go]:not([disabled])'); if (!(await go.count())) return false;
  await go.click(); return true;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const box = document.getElementById('tutStage'), m = box.querySelector('.hw-mon[data-f="0"]'), b = box.querySelector('[data-a=go]'); if (!m) return false; if (!m.classList.contains('sel')) { m.click(); return true; } if (b && !b.disabled) { b.click(); return true; } return false; });
}
(async () => {
  const f = await session('핼러윈 몬스터 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('halloween', policy, { runs: QUICK ? 2 : 4, ns: [4, 3, 6, 5], tutPolicy, query: r => (r % 2 ? 'cfg_mons=all' : '') });
})();

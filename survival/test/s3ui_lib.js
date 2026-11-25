// S3 게임 화면 시험 공통 (Playwright 로 survival/test/s3ui_harness.html 에 core+ui 만 붙여 실제 단추를 눌러 한 판 끝까지)
//  node survival/test/<id>_ui.js [--shots <폴더>] [--seed N] [--n 인원] [--runs 판수]
//  · 소리 끔 (--mute-audio) · 127.0.0.1 임시 서버 · 끝나면 브라우저·서버 닫음
//  · 검사: 페이지 오류 · 가로 넘침 · 'undefined/NaN' 글 · 한 판 끝까지(화면 단추로만) · 선생님 글 · 결과 html · 1분 규칙 단계(직접 해 보기 포함)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { serve } = require(path.join(ROOT, 'test', 'qa', 'lib', 'server.js'));
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = ['1247', '1243'].map(v => `${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-${v}/chrome-headless-shell-win64/chrome-headless-shell.exe`);

const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

async function run(id, policy, opt = {}) {
  const pw = require(PW);
  const exe = CHROME.find(f => fs.existsSync(f));
  const shotDir = path.resolve(val('shots', opt.shots || path.join(process.env.TEMP || '.', 's3ui_shots')));
  fs.mkdirSync(shotDir, { recursive: true });
  const srv = await serve(ROOT, 8860);
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--mute-audio'] });
  let pass = 0, fail = 0; const notes = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
  const runs = +val('runs', opt.runs || 3), n = +val('n', 0) || 0, seed0 = +val('seed', 11);
  try {
    for (let r = 0; r < runs; r++) {
      const seed = seed0 + r * 17, nn = opt.ns ? opt.ns[r % opt.ns.length] : n;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
      page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
      const qs = `g=${id}&seed=${seed}${nn ? '&n=' + nn : ''}${opt.query ? '&' + opt.query(r) : ''}`;
      await page.goto(`${srv.base}survival/test/s3ui_harness.html?${qs}`);
      await page.waitForFunction(() => window.__ready || (window.__errors && window.__errors.length), null, { timeout: 15000 });
      await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });      // 결과 화면에서 멈추게 (실제 shell 은 auto 시간 뒤 알아서 넘김)
      const tag = `${id}-r${r}-n${nn || 'def'}`;
      const seen = new Set(); let steps = 0, overSeen = false, stuck = 0, domActs = 0;
      while (steps++ < 700) {
        const info = await page.evaluate(() => {
          const h = window.__h, V = h.view();
          const canAct = V.needs.includes(h.ME) && !V.over;
          const stage = document.getElementById('stage');
          const txt = stage.innerText;
          return { phase: V.phase, over: !!V.over, canAct, auto: h.C.auto(h.st()), needsN: V.needs.length,
            ovx: stage.scrollWidth > stage.clientWidth + 1, ovy: stage.scrollHeight - stage.clientHeight, docx: document.documentElement.scrollWidth > innerWidth + 1,
            bad: /undefined|NaN|\[object|null/.test(txt), len: stage.innerHTML.length, errs: window.__errors.slice() };
        });
        if (info.errs.length) { errs.push(...info.errs); await page.evaluate(() => { window.__errors.length = 0; }); }
        ok(!info.ovx && !info.docx, `${tag}: 가로 넘침 (phase ${info.phase})`);
        ok(!info.bad, `${tag}: 화면 글에 undefined/NaN/null (phase ${info.phase})`);
        if (info.ovy > 2) { const k = `ovy-${info.phase}`; if (!seen.has(k)) { seen.add(k); notes.push(`${tag}: phase ${info.phase} 에서 화면이 ${info.ovy}px 넘침 (stage 는 overflow:hidden)`); } }
        const key = `${info.phase}|${info.canAct ? 'me' : 'wait'}`;
        if (!seen.has(key) && (r === 0 || opt.allShots || argv.includes('--allshots'))) { seen.add(key); await page.screenshot({ path: path.join(shotDir, `${tag}-${steps}-${info.phase}-${info.canAct ? 'me' : 'wait'}.png`) }); }
        if (info.over) {
          overSeen = true;
          const fin = await page.evaluate(() => { const h = window.__h; return { res: h.result(), v: h.view() }; });
          ok(Array.isArray(fin.v.ranks) && fin.v.ranks.length > 0, `${tag}: 끝났는데 ranks 없음`);
          if (r === 0) await page.screenshot({ path: path.join(shotDir, `${tag}-end.png`) });
          break;
        }
        if (info.canAct) {
          // 선생님 글이 비지 않는지
          const co = await page.evaluate(() => { try { const c = window.__h.coach(); return c ? JSON.stringify(c) : ''; } catch (e) { return 'ERR ' + e.message; } });
          ok(co && !/^ERR/.test(co) && !/undefined|NaN/.test(co), `${tag}: 선생님 글 이상 (${co.slice(0, 120)})`);
          const clicked = await policy(page, { step: steps, run: r });
          if (clicked) { domActs++; stuck = 0; }
          else {
            stuck++;
            if (stuck >= 2) {
              notes.push(`${tag}: phase ${info.phase} 에서 화면 단추로 할 수 있는 동작이 없어 qa 로 진행`);
              const r2 = await page.evaluate(() => { const h = window.__h, a = h.U.qa(h.view(), h.ME, h.rnd); return a ? h.act(a).ok : null; });
              ok(r2 === true, `${tag}: qa() 동작이 안 먹음 (phase ${info.phase}, err ${await page.evaluate(() => window.__h.lastErr())})`);
              stuck = 0;
            }
          }
        } else {
          const adv = await page.evaluate(() => window.__h.next());
          if (!adv) { await page.waitForTimeout(30); stuck++; if (stuck > 40) { ok(false, `${tag}: 멈춤 (phase ${info.phase})`); break; } }
          else stuck = 0;
        }
      }
      ok(overSeen, `${tag}: 한 판이 끝나지 않음 (${steps} 걸음, 화면 동작 ${domActs}번)`);
      ok(domActs > 0, `${tag}: 화면 단추를 한 번도 못 누름`);
      for (const e of errs) ok(false, `${tag}: ${e}`);
      await ctx.close();
    }
    // 1분 규칙
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push('pageerror: ' + e.message));
      await page.goto(`${srv.base}survival/test/s3ui_harness.html?g=${id}&seed=3${opt.query ? '&' + opt.query(0) : ''}`);
      await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
      const cnt = await page.evaluate(() => window.__h.tut(0).count);
      ok(cnt >= 4 && cnt <= 8, `${id}: 1분 규칙 단계 ${cnt}개 (4~8개여야 함)`);
      for (let i = 0; i < cnt; i++) {
        const t = await page.evaluate(i => window.__h.tut(i), i);
        ok(t.html > 20, `${id}: 규칙 ${i + 1}단계 내용 없음`);
        if (t.interactive) {
          let done = false;
          for (let k = 0; k < 160 && !done; k++) {
            const clicked = await opt.tutPolicy(page, i, k);
            done = await page.evaluate(() => window.__tutDone);
            if (!clicked && !done) break;
          }
          ok(done, `${id}: 규칙 ${i + 1}단계(직접 해 보기) 를 끝낼 수 없음`);
        }
        const bad = await page.evaluate(() => /undefined|NaN|\[object/.test(document.getElementById('tutStage').innerText));
        ok(!bad, `${id}: 규칙 ${i + 1}단계 글에 undefined/NaN`);
        if (i === 0 || t.interactive) {
          const box = await page.$('#tutStage');
          await page.evaluate(() => { const b = document.getElementById('tutStage'); b.style.left = '0'; b.style.top = '0'; b.style.background = '#120c16'; b.style.zIndex = 99; b.style.color = '#fff'; });
          await page.screenshot({ path: path.join(shotDir, `${id}-tut${i + 1}.png`), clip: { x: 0, y: 0, width: 390, height: 520 } });
          await page.evaluate(() => { document.getElementById('tutStage').style.left = '-9999px'; });
          void box;
        }
      }
      const e2 = await page.evaluate(() => window.__errors.slice());
      for (const e of errs.concat(e2)) ok(false, `${id}: 규칙 화면 오류 ${e}`);
      await ctx.close();
    }
  } finally {
    await browser.close(); await srv.close();
  }
  for (const m of notes) console.log('· 메모:', m);
  console.log(`${id} 화면 시험: 통과 ${pass} · 실패 ${fail} (스크린샷 ${shotDir})`);
  process.exit(fail ? 1 : 0);
}
module.exports = { run };

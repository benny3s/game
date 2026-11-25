// 판 게임(컬러턴 · 카드 체스) 화면 보조 시험 — s3ui_lib 가 못 하는 것: 다른 화면 크기 · 직접 만든 장면 · 숨은 것만 다른 두 세계의 선생님 글 비교
//  · s3ui_harness.html 을 그대로 씀 (core + ui 만 붙임) · 소리 끔 · 127.0.0.1 임시 서버 · 끝나면 브라우저 · 서버 닫음
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { serve } = require(path.join(ROOT, 'test', 'qa', 'lib', 'server.js'));
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = ['1247', '1243'].map(v => `${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-${v}/chrome-headless-shell-win64/chrome-headless-shell.exe`);
const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const shotDir = () => { const d = path.resolve(val('shots', path.join(process.env.TEMP || '.', 's3ui_shots'))); fs.mkdirSync(d, { recursive: true }); return d; };
const VPS = [{ w: 375, h: 667 }, { w: 390, h: 844 }, { w: 360, h: 640 }];

async function session(title, fn) {
  const pw = require(PW);
  const exe = CHROME.find(f => fs.existsSync(f));
  const srv = await serve(ROOT, 8860);
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--mute-audio'] });
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
  try { await fn({ browser, base: srv.base, ok }); }
  catch (e) { fail++; console.error('FAIL: 시험 도중 오류', e && e.stack || e); }
  finally { await browser.close(); await srv.close(); }
  console.log(`${title}: 통과 ${pass} · 실패 ${fail}`);
  return fail;
}

async function open(browser, base, id, query, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${base}survival/test/s3ui_harness.html?g=${id}&${query || ''}`);
  await page.waitForFunction(() => window.__ready || (window.__errors && window.__errors.length), null, { timeout: 15000 });
  await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
  return { page, ctx, errs, close: () => ctx.close() };
}

// 화면 안에 다 들어가는지: 가로 넘침 · stage 아래로 잘림 · 어떤 요소든 화면 밖으로 삐져나감 · 'undefined/NaN' 글
async function measure(page) {
  return page.evaluate(() => {
    const s = document.getElementById('stage'), r = s.getBoundingClientRect(), W = innerWidth;
    let outR = 0, outL = 0, outB = 0, who = '';
    s.querySelectorAll('*').forEach(el => {
      const b = el.getBoundingClientRect(); if (!b.width) return;
      if (b.right > W + 1 && b.right - W > outR) { outR = b.right - W; who = el.className; }
      if (b.left < -1 && -b.left > outL) { outL = -b.left; who = el.className; }
      if (b.bottom > r.bottom + 2 && b.bottom - r.bottom > outB) { outB = b.bottom - r.bottom; who = el.className; }
    });
    const dock = document.getElementById('dock').getBoundingClientRect();
    return { docx: document.documentElement.scrollWidth > W + 1, sx: s.scrollWidth > s.clientWidth + 1, sy: s.scrollHeight - s.clientHeight, outR, outL, outB, who,
      stageH: Math.round(r.height), dockTop: Math.round(dock.top), stageBottom: Math.round(r.bottom), bad: /undefined|NaN|\[object|null/.test(s.innerText) };
  });
}
module.exports = { session, open, measure, VPS, shotDir, val, argv };

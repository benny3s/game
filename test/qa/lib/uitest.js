// 게임 화면 한 군데만 빠르게 시험하는 작은 도구 (버그 고친 뒤 회귀 시험용)
//   소리 없이 (chromium --mute-audio + page.js HELPERS), 127.0.0.1 서버, 주소엔 늘 ?mock (실서버 Firebase 요청은 막음)
//   const U = require('../../test/qa/lib/uitest');
//   U.main(async T => {                       // T.ok(조건, 설명) 로 확인, 실패가 있으면 종료 코드 1
//     const p = await T.open('omok/');         // 혼자 쓰는 페이지
//     const { H, W } = await T.pair(require('../../test/qa/adapters/omok'));   // 친구랑: 방장 H + 손님 W 가 판을 시작한 상태
//   });
'use strict';
const fs = require('fs'), path = require('path');
const { serve } = require('./server');
const P = require('./page');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = [
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe',
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe',
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(page, fn, arg, ms = 15000, every = 150) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const v = await page.evaluate(fn, arg); if (v) return v; } catch (e) {}
    await sleep(every);
  }
  return null;
}

async function start(opt = {}) {
  const pw = require(PW);
  const srv = await serve(ROOT, 8900);
  const browser = await pw.chromium.launch({ executablePath: CHROME.find(f => fs.existsSync(f)), args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
  const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: opt.viewport || { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.route(/identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseio\.com|firebasedatabase\.app|firestore\.googleapis\.com|firebaseinstallations\.googleapis\.com|cloudfunctions\.net/, r => r.abort());
  await ctx.addInitScript(P.HELPERS);
  await ctx.addInitScript({ path: path.join(ROOT, 'common', 'arena-mock.js') });
  let pass = 0, fail = 0;
  const T = {
    base: srv.base, ctx, sleep, waitFor,
    ok(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } },
    errors: [],
    // 페이지 열기 (예: 'omok/'), 오류는 T.errors 에 모음
    async open(rel, extra = '') {
      const page = await ctx.newPage();
      page.on('pageerror', e => T.errors.push(rel + ' ' + (e.message || e)));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) T.errors.push(rel + ' console ' + m.text().slice(0, 200)); });
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await page.goto(srv.base + rel + '?mock' + (extra ? '&' + extra : ''), { waitUntil: 'load', timeout: 30000 });
      return page;
    },
    // 어댑터(test/qa/adapters/<게임>.js)의 친구랑 단추로 방장 H + 손님 W 를 만들어 판 시작까지
    async pair(A, extra = '') {
      const O = A.online, ev = (p, f, a) => p.evaluate(f, a);
      extra = [A.query, extra].filter(Boolean).join('&');   // 어댑터 주소 꼬리표 (예: chess 는 debug)
      const H = await T.open(A.path, extra);
      if (!(await waitFor(H, A.ready, null, 15000))) throw new Error('방장 화면 준비 안 됨');
      await sleep(400);
      await ev(H, O.open);
      if (!(await waitFor(H, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; }, null, 8000))) throw new Error('방 만들기 단추 없음');
      if (O.beforeHost) await ev(H, O.beforeHost);
      await H.click('[data-host]');
      const code = await waitFor(H, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, null, 15000);
      if (!code) throw new Error('방 코드 안 생김');
      const W = await T.open(A.path, (extra ? extra + '&' : '') + 'room=' + code);
      if (!(await waitFor(W, A.ready, null, 15000))) throw new Error('손님 화면 준비 안 됨');
      if (!(await waitFor(H, () => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= 2, null, 15000))) throw new Error('손님이 안 들어옴');
      if (O.beforeStart) await ev(H, O.beforeStart);
      if (!(await waitFor(H, () => { const b = document.querySelector('[data-start]'); return b && !b.disabled && __qa.vis(b); }, null, 10000))) throw new Error('시작 단추 꺼져 있음');
      await H.click('[data-start]');
      const [a, b] = await Promise.all([waitFor(H, O.started, null, 20000), waitFor(W, O.started, null, 20000)]);
      if (!a || !b) throw new Error(`판이 시작 안 됨 (방장 ${!!a}, 손님 ${!!b})`);
      if (O.setup) { await ev(H, O.setup, 'host'); await ev(W, O.setup, 'guest'); }
      return { H, W, code };
    },
  };
  T.close = async () => { try { await browser.close(); } catch (e) {} try { await srv.close(); } catch (e) {} };
  T.summary = () => ({ pass, fail });
  return T;
}

// 시험 본문 실행 → 요약 출력 (실패 있으면 종료 코드 1)
async function main(fn, title = '') {
  const T = await start();
  let crashed = false;
  try { await fn(T); } catch (e) { crashed = true; console.error('시험 중 오류:', e && e.stack || e); } finally { await T.close(); }
  const { pass, fail } = T.summary();
  if (T.errors.length) console.log('(페이지 오류 ' + T.errors.length + '개: ' + T.errors.slice(0, 3).join(' | ') + ')');
  console.log(`${title ? title + ' · ' : ''}통과 ${pass} · 실패 ${fail}${crashed ? ' · 시험 도중 중단' : ''}`);
  process.exit(fail || crashed ? 1 : 0);
}

module.exports = { start, main, waitFor, sleep, ROOT };

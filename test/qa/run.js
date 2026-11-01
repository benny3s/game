#!/usr/bin/env node
// 게임 사이트 자동 QA — 한 명령으로 selftest + 브라우저(폰·PC, Chromium·WebKit) + 친구랑(mock) 검사 → report/index.html
//   node test/qa/run.js                 전체 (모든 게임·모든 모드·WebKit 포함)
//   node test/qa/run.js --quick         빠르게 (~5분): 폰 Chromium 은 혼자 한 판+몽키, PC 는 화면 배치, WebKit 폰은 메뉴+한 판
//   node test/qa/run.js --games gostop,yut   일부 게임만
//   node test/qa/run.js --live          https://benny3s.github.io/game/ 에서 (친구랑은 ?guest 시험 공간)
//   그 밖: --no-selftest  --no-webkit  --no-online  --only selftest,menu,play,nav,monkey,online  --jobs 6  --seed 123  --monkey 20  --out <폴더>
//
// 검사 (게임마다): selftest(Node) · menu(오류·404·가로 넘침·화면 밖/가려진 단추·잠금 화면) · play:<모드>(혼자·AI 구경·한 기기를 손잡이로
//   한 판 끝까지, 멈춤 감지 → 스크린샷) · game-layout(PC 화면) · monkey(보이는 단추·카드 아무거나 누르기) · links(포털 링크)
//   · online(친구랑 mock: 방장+손님, 판 비교, 손님 새로 고침 후 다시 들어오기) · spectate(늦게 온 구경꾼) · next-round(✋ 준비 → 방장 다음 판)
// 게임별 조작은 adapters/<게임>.js (손잡이 window.__<게임> 사용법), 공통 검사는 lib/checks.js · lib/online.js, 보고서는 lib/report.js
// 로컬은 127.0.0.1 에만 서버(8830 부터 빈 포트), 주소엔 늘 ?mock (실서버 Firebase 로 가는 요청은 막음). 게임 코드는 안 고침.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { serve } = require('./lib/server');
const P = require('./lib/page');
const { GameRun, ev } = require('./lib/checks');
const { onlineCheck } = require('./lib/online');
const { writeReport } = require('./lib/report');

const ROOT = path.resolve(__dirname, '..', '..');
const QA = __dirname;
const LIVE_BASE = 'https://benny3s.github.io/game/';
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = [
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe',
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe',
];
const ALL = ['portal', 'gostop', 'seotda', 'poker', 'baduk', 'omok', 'cube', 'chess', 'janggi', 'yut', 'billiards', 'volley', 'land', 'onecard', 'nyang', 'snake', 'sc', 'draw', 'catch'];

// ── 인자
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const OPT = {
  quick: flag('quick'), live: flag('live'),
  games: (val('games', '') || ALL.join(',')).split(',').map(s => s.trim()).filter(Boolean),
  selftest: !flag('no-selftest'), webkit: !flag('no-webkit'), online: !flag('no-online'),
  only: val('only', '') ? val('only').split(',') : null,
  jobs: +val('jobs', 0) || Math.max(3, Math.min(8, Math.floor(os.cpus().length / 2))),
  seed: +val('seed', 0) || (Date.now() % 100000),
  monkeyMs: (+val('monkey', 0) || 0) * 1000,
};
const want = c => !OPT.only || OPT.only.includes(c);
for (const g of OPT.games) if (!ALL.includes(g)) { console.error('모르는 게임: ' + g + ' (가능: ' + ALL.join(',') + ')'); process.exit(2); }

const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(3)}s]`, ...a);

// ── 결과 모으기
const DATA = { meta: {}, selftests: [], games: {}, harness: [] };
const gameData = id => (DATA.games[id] = DATA.games[id] || { checks: [], issues: [] });
function addIssue(o) {
  const g = gameData(o.game);
  // 같은 증상은 하나로 (어디서 났는지만 모음)
  const norm = s => String(s || '').replace(/https?:\/\/[^/\s]+\//g, '/').replace(/\?v=\d+/g, '').replace(/:\d+:\d+/g, '').slice(0, 220);
  const key = [o.sev, o.title, o.kind === 'layout' ? o.vp : '', norm(o.kind === 'error' ? o.detail : '')].join('|');
  const old = g.issues.find(i => i._key === key);
  const where = `${o.engine}/${o.vp}${o.check ? ' · ' + o.check : ''}`;
  if (old) { old.count++; if (!old.where.includes(where)) old.where.push(where); if (!old.shot && o.shot) old.shot = o.shot; return; }
  g.issues.push(Object.assign({ _key: key, count: 1, where: [where], cat: o.cat || 'bug' }, o));
}
function addCheck(id, c) { gameData(id).checks.push(c); const mark = { pass: '✔', fail: '✘', warn: '!', skip: '-' }[c.status] || '?'; log(`${mark} ${id.padEnd(9)} ${c.engine}/${c.vp} ${c.name.padEnd(12)} ${c.note}`); }

// 콘솔·오류 이벤트 → 문제 목록
const first = t => String(t || '').split('\n')[0].replace(/^Uncaught (\(in promise\) )?/, '').slice(0, 90);
function absorb(R) {
  const seen = new Set();
  for (const e of R.events) {
    if (e.kind === 'dialog') continue;
    if (e.kind === 'console' && e.dupReq) continue;                   // http 이벤트와 중복
    const envish = e.env || (/identitytoolkit|firebase|googleapis|gstatic|fonts\./i.test((e.url || '') + e.text) && !OPT.live);
    const key = e.kind + '|' + e.text + '|' + (e.url || '');
    if (seen.has(key)) continue; seen.add(key);
    const [engine, vp] = (e.where || 'chromium/phone').split('/');
    let sev, title;
    if (e.kind === 'pageerror' && envish) { sev = 'info'; title = '외부 서비스(Firebase 등) 오류 — 로컬 시험은 실서버 요청을 막아서 생김'; }
    else if (e.kind === 'pageerror') { sev = 'high'; title = '자바스크립트 오류 (잡히지 않은 예외): ' + first(e.text); }
    else if (e.kind === 'crash') { sev = 'high'; title = '페이지가 죽음 (crash)'; }
    else if (e.kind === 'console' && /Blocked call to navigator.vibrate/.test(e.text)) { addIssue({ game: R.A.id, engine, vp, check: e.check, sev: 'info', cat: 'harness', title: '콘솔: 진동(navigator.vibrate)이 막힘 — 자동 시험은 진짜 손가락 터치가 없어서 생김 (실제 폰에선 대개 안 생김)', detail: e.text + (e.url ? ' @ ' + e.url : ''), kind: 'error' }); continue; }
    else if (e.kind === 'console') { sev = envish ? 'info' : 'medium'; title = envish ? '콘솔 오류 (외부 서비스 — 로컬 환경 탓일 수 있음)' : '콘솔 오류: ' + first(e.text); }
    else if (e.kind === 'http' || e.kind === 'reqfail') { sev = envish ? 'info' : 'medium'; title = envish ? `외부 요청 실패 ${e.text}` : `파일을 못 불러옴 (${e.text})`; }
    else continue;
    addIssue({ game: R.A.id, engine, vp, check: e.check, sev, title, detail: e.text + (e.url ? '\n@ ' + e.url : '') + (e.after ? '\n몽키가 바로 전에 누른 것: ' + e.after : ''), kind: 'error', cat: envish ? 'env' : 'bug' });
  }
  R.events.length = 0;
}

// ── 어댑터 불러오기
function loadAdapter(id) {
  const f = path.join(QA, 'adapters', id + '.js');
  if (!fs.existsSync(f)) return null;
  const A = require(f);
  A.id = A.id || id;
  const noop = () => null;
  A.setup = A.setup || noop; A.drive = A.drive || noop; A.home = A.home || (() => location.reload());
  A.menu = A.menu || (() => true); A.ready = A.ready || (() => document.readyState === 'complete');
  A.modes = A.modes || {};
  return A;
}

// ── selftest (Node, 병렬)
function runSelftests(parMax) {
  const list = [];
  for (const g of OPT.games) {
    if (g === 'portal') continue;
    const dir = path.join(ROOT, g, 'test');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/selftest.*\.js$|^aitest\.js$/.test(f) || /_ai\.js$/.test(f)) continue;   // selftest_ai.js 는 인자가 필요한 도구
      if (OPT.quick && f === 'aitest.js') continue;
      // 빠른 모드: 'quick' 인자를 아는 selftest(chess · janggi · omok)는 짧게
      const args = OPT.quick && fs.readFileSync(path.join(dir, f), 'utf8').includes("argv.includes('quick')") ? ['quick'] : [];
      list.push({ game: g, file: path.join(g, 'test', f), args });
    }
  }
  const SLOW = ['onecard', 'baduk', 'chess', 'omok', 'gostop', 'land', 'janggi', 'billiards', 'cube'];   // 오래 걸리는 것 먼저
  const rank = t => { const k = SLOW.indexOf(t.game); return k < 0 ? 99 : k; };
  list.sort((a, b) => rank(a) - rank(b));
  const par = Math.max(2, Math.min(list.length, parMax || Math.floor(os.cpus().length / 2)));
  return new Promise(done => {
    let i = 0, running = 0;
    const next = () => {
      if (i >= list.length && running === 0) return done();
      while (running < par && i < list.length) {
        const t = list[i++]; running++;
        const t0 = Date.now();
        const ch = cp.spawn(process.execPath, [t.file, ...t.args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        ch.stdout.on('data', d => { out += d; if (out.length > 200000) out = out.slice(-100000); });
        ch.stderr.on('data', d => { out += d; });
        const kill = setTimeout(() => ch.kill(), 180000);
        ch.on('close', code => {
          clearTimeout(kill); running--;
          const lines = out.trim().split(/\r?\n/);
          const fails = lines.filter(l => /✗|✘|FAIL|실패:|not ok|AssertionError/i.test(l) && !/실패 0|0 failed|0 실패|0개 실패/.test(l)).slice(0, 8);
          const r = { game: t.game, file: t.file.replace(/\\/g, '/') + (t.args.length ? ' ' + t.args.join(' ') : ''), ok: code === 0, code, ms: Date.now() - t0, summary: lines.slice(-1)[0] || '', fails };
          DATA.selftests.push(r);
          log(`${r.ok ? '✔' : '✘'} selftest ${r.file} ${(r.ms / 1000).toFixed(1)}s ${r.summary.slice(0, 80)}`);
          if (!r.ok) addIssue({ game: t.game, engine: 'node', vp: '-', check: 'selftest', sev: 'high', title: `selftest 실패: ${r.file}`, detail: (fails.join('\n') || lines.slice(-6).join('\n')).slice(0, 1500), repro: `node ${r.file}`, kind: 'selftest' });
          next();
        });
      }
    };
    next();
  });
}

// ── 작은 동시 실행기
async function pool(tasks, n) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, async () => { while (i < tasks.length) { const t = tasks[i++]; try { await t(); } catch (e) { log('작업 오류', e.message); DATA.harness.push('작업 오류: ' + e.message); } } }));
}

(async () => {
  const pw = require(PW);
  let srv = null, base;
  if (OPT.live) base = LIVE_BASE;
  else { srv = await serve(ROOT, 8830); base = srv.base; }
  const OUTDIR = path.resolve(val('out', path.join(QA, 'report')));   // --out 폴더 (기본 test/qa/report, 실행마다 덮어씀)
  const shotDir = path.join(OUTDIR, 'shots');
  fs.mkdirSync(shotDir, { recursive: true });
  for (const f of fs.readdirSync(shotDir)) if (OPT.games.some(g => f.startsWith(g + '_'))) fs.unlinkSync(path.join(shotDir, f));   // 이번에 검사하는 게임 것만 지움
  log(`QA 시작 — ${base} · 게임 ${OPT.games.join(',')} · ${OPT.quick ? 'quick' : 'full'} · seed ${OPT.seed} · 동시 ${OPT.jobs}`);

  // selftest: 전체 모드는 먼저 다 끝내고(CPU 다툼 없게), 빠른 모드는 브라우저 검사와 같이 돌림 (동시 3개)
  const selfP = OPT.selftest && !OPT.live && want('selftest') ? runSelftests(OPT.quick ? 3 : 0) : Promise.resolve();
  if (!OPT.quick) await selfP;

  // 브라우저
  const engines = { chromium: await pw.chromium.launch({ executablePath: CHROME.find(f => fs.existsSync(f)), args: ['--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] }) };
  if (OPT.webkit) {
    try { engines.webkit = await pw.webkit.launch(); }
    catch (e) { DATA.harness.push('WebKit 을 못 띄움 — Chromium 만 검사: ' + e.message.split('\n')[0]); log('WebKit 없음 — Chromium 만'); }
  }
  const VPS = {
    phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  };
  const env = {
    base, root: ROOT, shotDir, quick: OPT.quick, live: OPT.live, seed: OPT.seed,
    issue: addIssue, check: addCheck, absorb,
    // 로컬 시험은 실서버 Firebase(로그인·DB)에 요청이 아예 안 가게 막음 (게임 SDK 파일은 받음)
    guard: async ctx => { if (!OPT.live) await ctx.route(/identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseio\.com|firebasedatabase\.app|firestore\.googleapis\.com|firebaseinstallations\.googleapis\.com|cloudfunctions\.net/, r => r.abort()); },
    ctxOpts: (vp, engine) => Object.assign({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'no-preference' }, VPS[vp], engine === 'webkit' && vp === 'phone' ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } : {}),
  };

  // 검사 단위 만들기: 게임 × 엔진 × 화면
  const tasks = [];
  const adapters = {};
  for (const id of OPT.games) {
    const A = id === 'portal' ? { id: 'portal', path: '', ready: () => document.readyState === 'complete', menu: () => true, modes: {}, setup() {}, drive() {}, home() {} } : loadAdapter(id);
    if (!A) { addIssue({ game: id, engine: '-', vp: '-', sev: 'info', title: '어댑터 없음 — 브라우저 검사 건너뜀', cat: 'harness' }); continue; }
    adapters[id] = A;
    for (const g of A.gaps || []) addIssue({ game: id, engine: '-', vp: '-', check: 'hook', sev: 'info', title: '시험 손잡이 빈틈: ' + g, cat: 'harness' });
    const modeNames = Object.keys(A.modes);
    const quickModes = (A.quickModes || modeNames.slice(0, 1)).filter(m => A.modes[m]);
    const monkeyMs = OPT.monkeyMs || (OPT.quick ? 15000 : 20000);
    const unit = (engine, vp, plan) => tasks.push(async () => {
      if (!engines[engine]) return;
      const ctx = await engines[engine].newContext(env.ctxOpts(vp, engine));
      await env.guard(ctx);
      await ctx.addInitScript(P.HELPERS);
      if (!OPT.live) await ctx.addInitScript({ path: path.join(ROOT, 'common', 'arena-mock.js') });
      ctx.on('page', p => { p.opener().then(o => { if (o) p.close().catch(() => {}); }).catch(() => {}); });   // 새 창(팝업)은 닫음
      const R = new GameRun(A, env, { engine, vp });
      try {
        const page = await R.newPage(ctx);
        const ok = want('menu') || want('play') ? await R.menuCheck(page) : true;
        if (ok) {
          for (const m of plan.modes) {
            if (!want('play')) break;
            const done = await R.playMode(page, m);
            await P.pullRejections(page, R.events, null);
            absorb(R);
            if (!done) { try { await page.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 800)); } catch (e) {} }
            else { try { await ev(page, A.home); await new Promise(r => setTimeout(r, 400)); } catch (e) { await page.reload().catch(() => {}); } }
          }
          if (plan.peek && want('play') && modeNames.length) await R.peekMode(page, quickModes[0] || modeNames[0]);
          if (plan.links && want('menu')) await R.linkCheck(page);
          if (plan.nav && want('nav')) { const p3 = await R.newPage(ctx); if ((await R.load(p3)).ok) await R.navCheck(p3, quickModes[0]); await p3.close().catch(() => {}); }
          if (plan.monkey && want('monkey')) { const p2 = await R.newPage(ctx); await page.close().catch(() => {}); await R.monkey(p2, plan.monkey); }
        }
      } catch (e) {
        R.issue({ sev: 'medium', title: '검사 도구 예외', detail: e.stack ? e.stack.slice(0, 600) : String(e), cat: 'harness' });
        log(`✘ ${id} ${engine}/${vp} 검사 도구 예외: ${e.message}`);
      } finally { absorb(R); await ctx.close().catch(() => {}); }
    });
    if (id === 'portal') { unit('chromium', 'phone', { modes: [], links: true, monkey: OPT.quick ? 8000 : 15000 }); unit('chromium', 'desktop', { modes: [] }); unit('webkit', 'phone', { modes: [] }); continue; }
    if (OPT.quick) {
      unit('chromium', 'phone', { modes: quickModes, monkey: monkeyMs, nav: true });
      unit('chromium', 'desktop', { modes: [], peek: true });
      unit('webkit', 'phone', { modes: quickModes.slice(0, 1), monkey: 8000 });
    } else {
      unit('chromium', 'phone', { modes: modeNames, monkey: monkeyMs, nav: true });
      unit('chromium', 'desktop', { modes: (A.desktopModes || modeNames.slice(0, 1)).filter(m => A.modes[m]), peek: true, monkey: monkeyMs / 2 });
      unit('webkit', 'phone', { modes: modeNames, monkey: monkeyMs });
      unit('webkit', 'desktop', { modes: [], peek: true });
    }
    if (OPT.online && want('online') && A.online) {
      tasks.push(() => onlineCheck(A, env, engines.chromium, 'chromium'));
      if (!OPT.quick && engines.webkit) tasks.push(() => onlineCheck(A, env, engines.webkit, 'webkit'));
    } else if (OPT.online && want('online') && !A.online && A.onlineGap) addIssue({ game: id, engine: '-', vp: '-', check: 'online', sev: 'info', title: '친구랑 검사 못 함: ' + A.onlineGap, cat: 'harness' });
  }
  // 오래 걸리는 것 먼저 (친구랑·폰)
  await pool(tasks, OPT.jobs);
  await selfP;

  for (const b of Object.values(engines)) await b.close().catch(() => {});
  if (srv) {
    // 서버에서 본 404 (워커가 부른 파일 포함)
    const seen = new Set();
    for (const m of srv.missing) {
      const g = (m.referer.match(/\/\/[^/]+\/([^/?]+)\//) || [])[1] || (m.path.split('/')[1] || 'portal');
      const id = OPT.games.includes(g) ? g : (OPT.games.includes(m.path.split('/')[1]) ? m.path.split('/')[1] : null);
      if (!id || seen.has(m.path)) continue; seen.add(m.path);
      addIssue({ game: id, engine: 'server', vp: '-', check: 'server', sev: 'medium', title: '없는 파일을 부름 (404)', detail: m.path + (m.referer ? '\n← ' + m.referer.replace(base, '/') : ''), kind: 'error' });
    }
    await srv.close();
  }
  DATA.meta = { started: new Date(T0).toISOString(), durationMs: Date.now() - T0, base, mode: OPT.quick ? 'quick' : 'full', live: OPT.live, seed: OPT.seed, engines: Object.keys(engines), games: OPT.games, jobs: OPT.jobs, node: process.version };
  const out = writeReport(DATA, OUTDIR);
  const all = Object.values(DATA.games).flatMap(g => g.issues);
  const cnt = s => all.filter(i => i.sev === s && i.cat === 'bug').length;
  log(`끝 — ${((Date.now() - T0) / 1000).toFixed(0)}초 · 문제 high ${cnt('high')} · medium ${cnt('medium')} · low ${cnt('low')} · 보고서 ${out}`);
  process.exitCode = cnt('high') ? 1 : 0;
})().catch(e => { console.error(e); process.exit(3); });

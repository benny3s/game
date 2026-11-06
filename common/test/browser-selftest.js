// 공용 모듈 브라우저 시험 (화면이 있어야 하는 것) — Chromium 헤드리스, 소리 끔(--mute-audio)
// 실행: node common/test/browser-selftest.js
//   가짜 주소(https://benny3s.github.io/game/… · http://127.0.0.1:9/game/…)를 가로채 이 저장소 파일로 답하고, 다른 요청은 다 막음 (실서버·Firebase 에 안 감)
//   Firebase 는 common/test/fakefb.js (가짜) · 게임 페이지는 안 엶
//   cozy.js 창 Enter · arena-ui.js 대기실 설정 요약 · gate.js 실서버 ?guest·?mock / 관리자 표시 / 계정 바뀜 방문자 기록 · me.js 새 이름은 PIN 먼저
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = [
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-win64/chrome-headless-shell.exe',
  process.env.LOCALAPPDATA + '/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe',
];
const PROD = 'https://benny3s.github.io', LOCAL = 'http://127.0.0.1:9';
const FAKE = fs.readFileSync(path.join(__dirname, 'fakefb.js'), 'utf8');
const MOCKJS = fs.readFileSync(path.join(ROOT, 'common', 'arena-mock.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  ✔ ' + msg); } else { fail++; console.log('  ✘ FAIL: ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 시험 페이지: /game/<이름>/ → 아래 스크립트들 (../common/… 는 저장소 파일)
const PAGES = {
  '': ['common/gate.js'],                                         // 아케이드 첫 화면(포털) 흉내
  czt: ['../common/cozy.js'],
  aut: ['../common/arena.js', '../common/arena-ui.js'],
  gtt: ['../common/gate.js', '../common/arena.js'],
  glt: ['../common/glog.js', '../common/arena.js'],
  met: ['../common/me.js'],
  rpt: ['../common/cozy.js', '../common/arena.js'],
};
const html = list => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app">시험</main>${list.map(s => `<script src="${s}"></script>`).join('')}</body></html>`;

async function newCtx(browser, { fake, qa, ls, mock } = {}) {
  const ctx = await browser.newContext({ locale: 'ko-KR', viewport: { width: 420, height: 860 } });
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if ((u.origin === PROD || u.origin === LOCAL) && u.pathname.startsWith('/game/')) {
      const rel = u.pathname.slice(6);
      const m = /^(?:[a-z]+\/)?(common\/[a-z0-9-]+\.js)$/.exec(rel);
      if (m) return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(path.join(ROOT, m[1]), 'utf8') });
      if (/^snake\//.test(rel)) {                                  // 지렁이는 진짜 페이지 그대로
        const f = path.join(ROOT, /\/$/.test(rel) ? rel + 'index.html' : rel);
        if (fs.existsSync(f)) return r.fulfill({ status: 200, contentType: { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json' }[path.extname(f)] || 'text/plain', body: fs.readFileSync(f) });
      }
      const key = rel.replace(/\/?(index\.html)?$/, '');
      if (key in PAGES) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html(PAGES[key]) });
      return r.fulfill({ status: 404, body: '' });
    }
    return r.abort();                                            // 그 밖(구글·Firebase·폰트…)은 전부 막음
  });
  if (qa) await ctx.addInitScript('window.__qa = window.__qa || { rej: [] };');   // QA 도구(test/qa)가 연 탭 흉내 — 페이지보다 먼저 심음
  if (ls) await ctx.addInitScript(`(() => { const o = ${JSON.stringify(ls)}; if (!sessionStorage.getItem('__lsDone')) { sessionStorage.setItem('__lsDone', '1'); for (const k in o) localStorage.setItem(k, o[k]); } })();`);
  if (mock) await ctx.addInitScript(MOCKJS);
  if (fake) {                                                     // 규칙: 'gp' = 이름·PIN 규칙, 아니면 방문자 기록은 내 uid 자리만
    const rules = fake.rules === 'gp' ? 'FakeFB.gpRules' : 'w => { const m = /^game_presence\\/([^/]+)/.exec(w.path); return !m || m[1] === w.uid; }';
    await ctx.addInitScript(FAKE + `\n;window.__fs = FakeFB.install(window, { store: FakeFB.store({ rules: ${rules} }), user: ${JSON.stringify(fake.user || null)} });`);
  }
  return ctx;
}
const open = async (ctx, url) => { const p = await ctx.newPage(); p.on('pageerror', e => console.log('    (페이지 오류) ' + e.message)); await p.goto(url, { waitUntil: 'load' }); return p; };
const waitFn = async (p, fn, arg, ms = 4000) => { try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };

// ── #18 cozy.js 창: Enter 는 textarea·한글 조합 중·다른 단추에 포커스면 '보내기'(primary)를 누르지 않음
async function cozyTests(browser) {
  console.log('창 cozy.js (Enter)');
  const ctx = await newCtx(browser);
  const p = await open(ctx, LOCAL + '/game/czt/');
  await waitFn(p, () => !!window.Cozy);
  const mk = async () => { await p.evaluate(() => { window.hits = []; Cozy.modal({ title: '시험', html: '<textarea id="ta"></textarea><input id="inp">', buttons: [{ label: '닫기', onClick: () => { hits.push('close'); } }, { label: '보내기', primary: true, onClick: () => { hits.push('send'); } }] }); }); await sleep(90); };   // PC 는 30ms 뒤 '보내기'에 포커스
  const hits = () => p.evaluate(() => window.hits.join(','));
  const openNow = () => p.evaluate(() => document.querySelectorAll('.overlay').length);
  await mk(); await p.focus('#ta'); await p.keyboard.type('줄'); await p.keyboard.press('Enter'); await sleep(80);
  ok((await hits()) === '' && (await openNow()) === 1 && (await p.evaluate(() => document.getElementById('ta').value)) === '줄\n', `#18 textarea 에서 Enter = 줄 바꿈 (안 보냄) — hits '${await hits()}'`);
  await p.evaluate(() => document.querySelectorAll('.overlay').forEach(o => [...o.querySelectorAll('.row button')].find(b => b.textContent === '닫기').click()));   // 창은 닫기로 (remove 만 하면 Enter 듣기가 남음)
  await mk(); await p.focus('#inp');
  await p.evaluate(() => { const i = document.getElementById('inp'); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true })); });
  await sleep(50);
  ok((await hits()) === '' && (await openNow()) === 1, `#18 한글 조합 중 Enter(isComposing·229)는 안 보냄 — hits '${await hits()}'`);
  await p.keyboard.press('Enter'); await sleep(50);
  ok((await hits()) === 'send', `한 줄 입력칸에서 Enter = 보내기 (그대로) — hits '${await hits()}'`);
  await mk(); await p.evaluate(() => [...document.querySelectorAll('.overlay .row button')].find(b => b.textContent === '닫기').focus());
  await p.keyboard.press('Enter'); await sleep(50);
  ok((await hits()) === 'close', `#18 '닫기'에 포커스 → Enter 는 그 단추 (보내기 아님) — hits '${await hits()}'`);
  await mk(); await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await p.keyboard.press('Enter'); await sleep(50);
  ok((await hits()) === 'send', `아무 데도 포커스 없음 → Enter = 보내기 (그대로) — hits '${await hits()}'`);
  await mk(); await p.keyboard.press('Enter'); await sleep(50);
  ok((await hits()) === 'send', `'보내기'에 포커스(PC 기본) → Enter 한 번 = 한 번만 보냄 — hits '${await hits()}'`);
  await ctx.close();
}

// ── #25 arena-ui.js: buildConfig(el) 게임(바둑·홀덤·섯다) 방장 대기실의 ⚙️ 설정 요약이 바꾼 값으로 바뀜
async function arenaUiTests(browser) {
  console.log('대기실 arena-ui.js');
  const ctx = await newCtx(browser, { mock: true });
  const p = await open(ctx, LOCAL + '/game/aut/?mock');
  await waitFn(p, () => !!window.ArenaUI);
  await p.evaluate(() => ArenaUI.open({ game: 'aut', title: '시험', max: 2, min: 2,
    buildConfig(el) { el.innerHTML = '<select id="sz"><option value="9">9줄</option><option value="19">19줄</option></select>'; return () => ({ size: +el.querySelector('#sz').value }); },
    renderConfig: c => (c && c.size ? c.size + '줄' : '?'), onStart() {}, onLeave() {} }));
  await waitFn(p, () => { const b = document.querySelector('[data-host]'); return b && !b.disabled; });
  await p.click('[data-host]');
  await waitFn(p, () => !!document.querySelector('[data-sum]') && !!document.querySelector('#sz'));
  await sleep(200);
  const sum = () => p.evaluate(() => document.querySelector('[data-sum]').textContent);
  ok((await sum()) === '9줄', `처음 요약 — '${await sum()}'`);
  await p.evaluate(() => { const s = document.querySelector('#sz'); s.value = '19'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);   // ⚙️ 설정은 접혀 있음 → 값만 바꿈
  ok((await sum()) === '19줄' && (await p.evaluate(() => ArenaUI.net.meta.cfg.size)) === 19, `#25 설정을 바꾸면 요약도 바뀜 — '${await sum()}' (cfg ${await p.evaluate(() => JSON.stringify(ArenaUI.net.meta.cfg))})`);
  ok((await p.evaluate(() => document.querySelectorAll('#sz').length)) === 1, `설정 칸은 한 번만 그림 (고른 값 유지) — ${await p.evaluate(() => document.querySelector('#sz').value)}`);
  await ctx.close();
}

// ── #3 gate.js: 실서버 주소에서 ?guest·?mock 만 붙여서는 잠금·방 만들기 권한이 안 풀림 (QA 도구가 연 탭은 그대로 시험 모드)
async function gateFlagTests(browser) {
  console.log('출입 gate.js (실서버 ?guest·?mock)');
  const st = async (p, arena) => p.evaluate(async a => {
    await new Promise(r => setTimeout(r, 700));
    let ac = null; if (a) { try { await Arena.init(); ac = Arena.canHost; } catch (e) { ac = 'err ' + e.message; } }
    const g = document.getElementById('bennyGateOverlay');
    return { unlocked: Gate.state.unlocked, canHost: Gate.state.canHost, role: Gate.state.role, lock: !!(g && !g.hidden), mockAllow: typeof Gate._mockAllow, arena: ac };
  }, arena);
  for (const [q, arena] of [['?guest', true], ['?mock', false]]) {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'devX', claims: {} } } });
    const p = await open(ctx, PROD + '/game/gtt/' + q);
    const s = await st(p, arena);
    ok(!s.unlocked && !s.canHost && s.role !== 'local' && s.lock, `#3 실서버 ${q} (허용 안 된 기기) → 잠김 · 방 만들기 안 됨 — ${JSON.stringify(s)}`);
    if (arena) ok(s.arena === false, `#3 실서버 ?guest → Arena.canHost 도 false (시험 방 test/arena 못 만듦) — ${s.arena}`);
    if (!arena) ok(s.mockAllow === 'undefined', `실서버 ?mock → 시험용 _mockAllow 없음 — ${s.mockAllow}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'devQ', claims: {} } }, qa: true });
    const p = await open(ctx, PROD + '/game/gtt/?guest');
    const s = await st(p, true);
    ok(s.unlocked && s.canHost && s.role === 'local' && !s.lock && s.arena === true, `실서버 ?guest + QA 도구 탭(--live) → 시험 모드 그대로 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'devL', claims: {} } } });
    const p = await open(ctx, LOCAL + '/game/gtt/?mock');
    const s = await st(p, false);
    ok(s.unlocked && s.canHost && s.role === 'local' && s.mockAllow === 'function', `로컬(127.0.0.1) ?mock → 시험 모드 그대로 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
}

// ── #37 gate.js: 관리자는 로그인 토큰(admin:1)만 믿음 — 이 기기의 예전 표시(game.gate.admin=1·캐시 role admin)로는 관리자가 아님
async function gateAdminTests(browser) {
  console.log('출입 gate.js (관리자 표시)');
  const ls = { 'game.gate.admin': '1', 'game.gate.pass.v1': JSON.stringify({ uid: 'devY', role: 'admin', status: 'active', expiresAt: 0 }) };
  const read = p => p.evaluate(async () => {
    for (let i = 0; i < 60 && Gate.state.status === 'checking'; i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 500));
    return { isAdmin: Gate.state.isAdmin, canApprove: Gate.state.canApprove, status: Gate.state.status, key: localStorage.getItem('game.gate.admin'), pass: localStorage.getItem('game.gate.pass.v1') };
  });
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'devY', claims: {} } }, ls });
    const s = await read(await open(ctx, PROD + '/game/'));
    ok(!s.isAdmin && !s.canApprove, `#37 일반 계정 + 예전 관리자 표시 → 관리자 아님 — ${JSON.stringify(s)}`);
    ok(s.key === null, `#37 관리자가 아니면 game.gate.admin 표시를 지움 — ${s.key}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'benny', claims: { admin: 1 } } } });
    const s = await read(await open(ctx, PROD + '/game/'));
    ok(s.isAdmin && s.canApprove && s.key === '1', `토큰 admin:1 → 관리자 (그대로) — ${JSON.stringify(s)}`);
    await ctx.close();
  }
}

// ── 11-04 베니 님: 지렁이만 잠금이 없어 허용 안 된 기기도 그냥 함 → 다른 게임처럼 허용된 기기만, 방 링크 손님은 그 방만
async function snakeGateTests(browser) {
  console.log('출입 gate.js (지렁이)');
  const read = p => p.evaluate(async () => {
    for (let i = 0; i < 80 && !(window.Gate && Gate.state.status !== 'checking'); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 400));
    const g = document.getElementById('bennyGateOverlay');
    return { gate: !!window.Gate, unlocked: !!(window.Gate && Gate.state.unlocked), status: window.Gate && Gate.state.status, lock: !!(g && !g.hidden), game: !!document.getElementById('solo') };
  });
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'snkNo', claims: {} } } });
    const s = await read(await open(ctx, PROD + '/game/snake/'));
    ok(s.gate && !s.unlocked && s.lock, `허용 안 된 기기 → 지렁이도 잠금 창 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'snkRoom', claims: {} } } });
    await ctx.addInitScript(() => { window.__fs.tree.arena = { snake: { rooms: { ABCD: { meta: { host: 'hst', max: 4, phase: 'lobby', cfg: {} }, players: { hst: { name: '방장' } } } } } }; window.__fs.tree.gp = { players: { pT: { n: '시험' } } }; localStorage.setItem('game.me', JSON.stringify({ pid: 'pT', name: '시험' })); });
    const s = await read(await open(ctx, PROD + '/game/snake/?room=ABCD'));
    ok(s.gate && s.unlocked && !s.lock, `방 링크로 온 손님 → 잠기지 않음 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'snkOk', claims: {} } } });
    await ctx.addInitScript(() => { window.__fs.tree.game_devices = { snkOk: { status: 'active', expiresAt: 0, role: 'friend', name: '시험' } }; });
    const s = await read(await open(ctx, PROD + '/game/snake/'));
    ok(s.gate && s.unlocked && !s.lock, `허용된 기기 → 그대로 함 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
}

// ── 11-05: 같은 계정이 다른 기기에서 자기 방 링크를 열면 방이 닫히던 것 (관리자 PC·폰) → 이 탭만 임시 계정으로 손님. 방장이 새로 고침한 탭은 전처럼 닫음
async function arenaOwnTests(browser) {
  console.log('친구랑 arena.js (같은 계정 · 자기 방)');
  const seed = () => { window.__fs.tree.arena = { omok: { rooms: { ABCD: { meta: { host: 'own1', max: 4, phase: 'lobby', cfg: {} }, players: { own1: { name: '베니' } } } } } }; };
  const tryJoin = p => p.evaluate(async () => {
    await Arena.init();
    const out = { me0: Arena.uid };
    try {
      const n = await Promise.race([Arena.join('omok', 'ABCD', { name: '폰' }), new Promise((_, no) => setTimeout(() => no(new Error('join 시간 초과')), 6000))]);
      out.uid = n.uid; out.host = n.meta && n.meta.host;
    } catch (e) { out.own = !!e.own; out.err = String(e.message).slice(0, 40); }
    out.room = !!(window.__fs.tree.arena.omok.rooms.ABCD);
    out.seat = Object.keys(window.__fs.tree.arena.omok.rooms.ABCD.players || {});
    return out;
  });
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'own1', claims: {} } } });
    await ctx.addInitScript(seed);
    const r = await tryJoin(await open(ctx, PROD + '/game/gtt/'));
    ok(!r.own && r.uid && r.uid !== 'own1' && r.host === 'own1' && r.room && r.seat.includes(r.uid) && r.seat.includes('own1'), `다른 기기에서 내 방 링크 → 방은 그대로, 임시 계정으로 손님 — ${JSON.stringify(r)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'own1', claims: {} } } });
    await ctx.addInitScript(seed);
    await ctx.addInitScript(() => sessionStorage.setItem('arena.hosted.omok.ABCD', '1'));
    const r = await tryJoin(await open(ctx, PROD + '/game/gtt/'));
    ok(r.own === true, `방장이 새로 고침한 탭 → 전처럼 e.own (방을 닫고 새로) — ${JSON.stringify(r)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'lg1', claims: {} } } });
    const p = await open(ctx, PROD + '/game/glt/');
    const r = await p.evaluate(async () => {
      await Arena.init();
      const L = GLOG(() => Arena.db(), 'omok');
      if (!L.use) return { noUse: true };
      L.use('2026-11-05/000000_ABCD'); L.matchStart({ mode: 'x' }); L.matchEnd({ won: true }); await new Promise(r => setTimeout(r, 200));
      return { paths: window.__fs.log.map(x => x.path).filter(x => /^logs\//.test(x)), inMatch: L.inMatch };
    });
    ok(r.paths && r.paths.length && r.paths.every(x => x.startsWith('logs/omok/2026-11-05/000000_ABCD/matches')) , `판 기록이 방 세션 한 줄에 들어감 — ${JSON.stringify(r).slice(0, 160)}`);
    await ctx.close();
  }
}

// ── presence: 계정이 바뀌면(switchUser) 방문자 기록을 새 uid 자리에 씀 (예전 자리는 권한이 없음)
async function presenceTests(browser) {
  console.log('출입 gate.js (계정 바뀜 → 방문자 기록)');
  // 자동 시험 브라우저는 방문자에 안 남으니 (맨 아래에서 따로 확인) 여기선 보통 브라우저로
  const ctx = await newCtx(browser, { fake: { user: { uid: 'u1', claims: {} } } });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const p = await open(ctx, PROD + '/game/');
  const w1 = await waitFn(p, () => window.__fs.log.some(x => x.path === 'game_presence/u1'), null, 4000);
  ok(w1, `처음 계정 u1 방문자 기록 — ${await p.evaluate(() => window.__fs.log.map(x => x.path).filter(x => /presence/.test(x)).join(','))}`);
  await p.evaluate(() => firebase.app().auth()._switch('u2', {}));
  const w2 = await waitFn(p, () => window.__fs.log.some(x => x.path === 'game_presence/u2'), null, 3000);
  await sleep(300);
  const r = await p.evaluate(() => ({ paths: window.__fs.log.map(x => x.path + '@' + x.uid).filter(x => /presence/.test(x)), denied: window.__fs.denied.map(x => x.path + '@' + x.uid), uid: Gate.state.uid }));
  ok(w2 && r.uid === 'u2', `계정이 u2 로 바뀌면 방문자 기록도 game_presence/u2 — ${JSON.stringify(r)}`);
  ok(!r.denied.length, `예전 자리(u1)에 쓰다 막힌 것 없음 — ${r.denied.join(',') || '없음'}`);
  await ctx.close();
  // 11-04: 실서버 자동 시험이 첫 화면에 '손님'으로 보였음 → navigator.webdriver 면 방문자·열어 본 수를 안 남김
  const ctx2 = await newCtx(browser, { fake: { user: { uid: 'u3', claims: {} } } });
  const q = await open(ctx2, PROD + '/game/');
  await sleep(1500);
  const left = await q.evaluate(() => window.__fs.log.map(x => x.path).filter(x => /game_presence|game_plays/.test(x)));
  ok(!left.length, `자동 시험 브라우저는 방문자 기록을 안 남김 — ${left.join(',') || '없음'}`);
  await ctx2.close();
}

// ── 11-06: 지민 님이 🐞 로 신고했는데 처리됐는지 알 길이 없었음 → 비서 앱 단추가 game_reports/{id}.status 를 쓰면 🐞 에 보임
async function reportStatusTests(browser) {
  console.log('🐞 보낸 신고 처리 상태');
  const ctx = await newCtx(browser, { fake: { user: { uid: 'r1', claims: {} } } });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('__repNow')) sessionStorage.setItem('__repNow', String(Date.now()));   // 새로 고침해도 같은 시각 (가짜 서버는 탭마다 새로 생김)
    const now = +sessionStorage.getItem('__repNow');
    window.__fs.tree.game_reports = {
      a1: { kind: 'report', game: 'rpt', msg: '색이 눈 아파요\n[최근 오류] x', t: now - 86400000, uid: 'r1', seen: true, status: 'done', statusT: now - 1000 },
      a2: { kind: 'report', game: 'rpt', msg: '남의 신고', t: now - 5000, uid: 'zz', seen: true, status: 'done', statusT: now - 900 },
      a3: { kind: 'report', game: 'rpt', msg: '아직 안 간 것', t: now - 3000, uid: 'r1' },
      e1: { kind: 'error', game: 'rpt', msg: '오류', t: now - 2000, uid: 'r1' },
    };
  });
  const p = await open(ctx, PROD + '/game/rpt/');
  const toasted = await waitFn(p, () => { const t = document.querySelector('.toast'); return t && !t.hidden && /고쳤어요/.test(t.textContent); }, null, 7000);
  const s1 = await p.evaluate(() => ({ toast: (document.querySelector('.toast') || {}).textContent, dot: !(document.getElementById('czBugDot') || { hidden: true }).hidden, seen: localStorage.getItem('cz.repSeen') }));
  ok(toasted && /색이 눈 아파요/.test(s1.toast) && !/남의/.test(s1.toast), `처음 보는 '고쳤어요' → 알림 한 번 (내 것만) — '${s1.toast}'`);
  ok(s1.dot, `🐞 손잡이에 빨간 점 — ${JSON.stringify(s1)}`);
  await p.click('#czBug');
  await waitFn(p, () => document.querySelectorAll('.cz-rep').length > 0, null, 4000);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.cz-rep')].map(r => r.textContent));
  ok(rows.length === 2 && /✅ 고쳤어요/.test(rows[1]) && /색이 눈 아파요/.test(rows[1]) && !/최근 오류/.test(rows[1]) && /📨 보냈어요/.test(rows[0]) && /아직 안 간 것/.test(rows[0]), `🐞 창: 내가 보낸 신고 2개만 (남의 것·자동 오류 빼고, 새것 먼저) — ${JSON.stringify(rows)}`);
  ok(await p.evaluate(() => document.getElementById('czBugDot').hidden), `창을 열면 점이 사라짐`);
  await p.fill('#czRep', '시험 신고');
  await p.click('.overlay .btn.primary');
  const sent = await waitFn(p, () => window.__fs.log.some(x => /^game_reports\/k/.test(x.path) && x.v && x.v.msg === '시험 신고'), null, 4000);
  const row = await p.evaluate(() => (window.__fs.log.find(x => /^game_reports\/k/.test(x.path) && x.v && x.v.msg === '시험 신고') || {}).v);
  ok(sent && row.uid === 'r1' && row.kind === 'report', `새 신고에는 내 uid 가 들어감 (나중에 처리 상태를 찾을 수 있게) — ${JSON.stringify(row)}`);
  await p.reload({ waitUntil: 'load' });
  await sleep(3800);
  const s2 = await p.evaluate(() => ({ toast: (document.querySelector('.toast') || { hidden: true }).hidden ? '' : document.querySelector('.toast').textContent, dot: !document.getElementById('czBugDot').hidden }));
  ok(!/고쳤어요/.test(s2.toast) && !s2.dot, `다시 와도 같은 알림 · 점은 안 나옴 — ${JSON.stringify(s2)}`);
  await ctx.close();
}

// ── #4 me.js 이름 고르기 창: 새 이름은 PIN 을 먼저 받고 이름·프로필을 한 번에 → PIN 치다 새로 고침해도 이름이 안 묶임
// ── 11-05: 규호 님이 하루 71판인데 접속 기록이 없었음 → 주소에 방 코드가 있으면 문지기가 확인 없이 열고 아무것도 안 남겼음
//   없는 코드로도 잠금이 풀림 (10-30 베니 님 '방 링크 손님은 그 방에서만' 과 어긋남)
async function roomLinkTests(browser) {
  console.log('방 코드가 붙은 주소');
  const ME = { 'game.me': JSON.stringify({ pid: 'pT', name: '시험' }) };
  const real = ctx => ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const seedRoom = () => { window.__fs.tree.arena = { snake: { rooms: { ABCD: { meta: { host: 'hst', max: 4, phase: 'lobby', cfg: {} }, players: { hst: { name: '방장' } } } } } }; };
  const real0 = real;
  const realMe = async ctx => { await real0(ctx); await ctx.addInitScript(() => { window.__fs.tree.gp = { players: { pT: { n: '시험' } } }; }); };
  const read = async p => {
    await sleep(1800);
    return p.evaluate(() => {
      const g = document.getElementById('bennyGateOverlay'), uid = Gate.state.uid, pres = (window.__fs.tree.game_presence || {})[uid];
      const room = ((window.__fs.tree.arena || {}).snake || { rooms: {} }).rooms.ABCD;
      return { lock: !!(g && !g.hidden), unlocked: Gate.state.unlocked, allowed: Gate.state.allowed, uid, cur: firebase.app().auth().currentUser.uid, game: pres && pres.game, mode: pres && pres.mode, lastSeen: window.__fs.log.some(x => /lastSeen/.test(x.path)), search: location.search, seats: room ? Object.keys(room.players || {}) : null };
    });
  };
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rOk', claims: {} } }, ls: ME });
    await realMe(ctx);
    await ctx.addInitScript(() => { window.__fs.tree.game_devices = { rOk: { status: 'active', expiresAt: 0, role: 'friend', name: '시험' } }; });
    const s = await read(await open(ctx, PROD + '/game/snake/?room=ZZZZ'));
    ok(s.allowed && !s.lock && s.game === 'snake' && s.mode === 'allowed' && s.lastSeen && s.search === '', `허용된 기기가 끝난 방 주소로 와도 접속 기록 · 최근 접속이 남고 잠기지 않음 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rNo', claims: {} } }, ls: ME });
    await realMe(ctx);
    const s = await read(await open(ctx, PROD + '/game/snake/?room=ZZZZ'));
    ok(s.lock && !s.unlocked && s.search === '', `허용 안 된 기기 + 없는 방 코드 → 잠금 창 — ${JSON.stringify(s)}`);
    ok(s.game === 'snake' && s.mode === 'guest', `그 손님도 접속 기록에 남음 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rIn', claims: {} } }, ls: ME });
    await realMe(ctx);
    await ctx.addInitScript(seedRoom);
    const p = await open(ctx, PROD + '/game/snake/?room=ABCD');
    const s = await read(p);
    ok(!s.lock && s.unlocked && s.seats && s.seats.includes('rIn'), `허용 안 된 기기 + 있는 방 → 방 안에서는 안 잠김 — ${JSON.stringify(s)}`);
    await p.evaluate(() => ArenaUI.leave());
    const t = await read(p);
    ok(t.lock && !t.unlocked, `방에서 나오면 잠금 창 — ${JSON.stringify(t)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: null }, ls: ME });
    await realMe(ctx);
    await ctx.addInitScript(seedRoom);
    const s = await read(await open(ctx, PROD + '/game/snake/?room=ABCD'));
    ok(s.uid && s.uid === s.cur && s.seats && s.seats.includes(s.cur) && s.seats.length === 2, `처음 온 손님 → 문지기와 방이 같은 임시 계정 하나 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rNm', claims: {} } } });
    await real0(ctx);
    await ctx.addInitScript(seedRoom);
    const p = await open(ctx, PROD + '/game/snake/?room=ABCD');
    await sleep(1000);
    await p.evaluate(() => document.querySelector('.gme-x').click());
    const s = await read(p);
    ok(s.lock && !s.unlocked, `이름을 안 정하고 창을 닫으면 잠금 창 — ${JSON.stringify(s)}`);
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rPg', claims: {} } } });
    await real(ctx);
    const p = await open(ctx, PROD + '/game/gtt/?room=ABCD');
    await sleep(1200);
    const lock = await p.evaluate(() => { const g = document.getElementById('bennyGateOverlay'); return !!(g && !g.hidden) && !Gate.state.unlocked; });
    ok(lock, '방이 없는 화면(친구방 없는 페이지)은 방 코드를 붙여도 잠금');
    await ctx.close();
  }
  {
    const ctx = await newCtx(browser, { fake: { user: { uid: 'rApp', claims: {} } } });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/4.4212.0 Chrome/152.0.7977.167 Safari/537.36 MSIX' }); });
    const p = await open(ctx, PROD + '/game/');
    await sleep(1000);
    const left = await p.evaluate(() => window.__fs.log.map(x => x.path).filter(x => /game_presence|game_plays/.test(x)));
    ok(!left.length, `Claude 앱 안 브라우저는 방문 기록을 안 남김 (11-05 22:57 손님) — ${left.join(',')}`);
    await ctx.close();
  }
}

async function mePickTests(browser) {
  console.log('이름 고르기 me.js (새 이름)');
  const ctx = await newCtx(browser, { fake: { rules: 'gp', user: { uid: 'devM', claims: {} } } });
  await ctx.addInitScript('window.Gate = window.Gate || { state: {} };');   // me.js 가 gate.js 를 따로 부르지 않게
  const p = await open(ctx, LOCAL + '/game/met/');
  await waitFn(p, () => !!window.GME);
  await p.evaluate(() => { firebase.initializeApp({ databaseURL: 'fake' }); window.__pick = GME.pick(firebase.app().database(), { canClose: true }).then(m => (window.__picked = m)); });
  await waitFn(p, () => document.querySelector('.gme-list') && !/불러오는/.test(document.querySelector('.gme-list').textContent));
  await p.fill('.gme-in', '새친구');
  await waitFn(p, () => !!document.querySelector('[data-new]'));
  await p.click('[data-new]');
  const pinUp = await waitFn(p, () => !!document.querySelector('.gme-pin'), null, 3000);
  const held = await p.evaluate(() => window.__fs.get('gp/names/새친구'));
  ok(pinUp && held == null, `#4 PIN 을 치는 동안엔 이름이 아직 안 묶임 (새로 고침해도 유령 없음) — names ${JSON.stringify(held)}`);
  await p.fill('.gme-pin', '1234');
  const done = await waitFn(p, () => !!window.__picked, null, 4000);
  const r = await p.evaluate(() => ({ me: window.__picked, names: window.__fs.get('gp/names'), pl: window.__picked && window.__fs.get('gp/players/' + window.__picked.pid), pin: window.__picked && !!window.__fs.get('gp/pins/' + window.__picked.pid) }));
  ok(done && r.me && r.names && r.names['새친구'] === r.me.pid && r.pl && r.pl.n === '새친구' && r.pin, `PIN 뒤 이름·프로필·PIN 이 같이 생김 — ${JSON.stringify(r)}`);
  await ctx.close();
}

(async () => {
  const t0 = Date.now();
  const pw = require(PW);
  const browser = await pw.chromium.launch({ executablePath: CHROME.find(f => fs.existsSync(f)), args: ['--mute-audio'] });
  for (const t of [cozyTests, arenaUiTests, gateFlagTests, gateAdminTests, snakeGateTests, arenaOwnTests, presenceTests, roomLinkTests, reportStatusTests, mePickTests]) {
    try { await t(browser); } catch (e) { fail++; console.log('  ✘ FAIL: 시험 도구 예외 ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); }
  }
  await browser.close();
  console.log(`\n공용 모듈 브라우저 selftest: 통과 ${pass} · 실패 ${fail} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  process.exit(fail ? 1 : 0);
})();

// 냥도쿠 화면 시험 (브라우저, 소리 없음): node nyang/test/ui.js
//   11-04 베니 님 (와이프 아이폰): ① 칸을 두 번 누르다 화면이 확대됨 — 다른 게임에 있는 아이폰 확대 막이가 냥도쿠만 빠져 있었음
//                                  ② 허용된 기기인데 방을 못 만듦 — 허용 안 된 기기엔 PERMISSION_DENIED 대신 허용 창, 허용되면 바로 방 만들기
//   11-05 베니 님 "모든걸 맞춰": ③ 공통 화면 틀 (다크 라운지 · 탭 · 맨 아래 랭킹 줄) ④ 이 기기 기록(localStorage) 그대로
//                                ⑤~⑧ 친구랑 = ArenaUI (빨리 풀기 · 타임어택 · 협동 · 관전 · 채팅 · 재접속 · 다음 판 · 대기실로) ⑨ 카톡 안 브라우저 기록 지키기
//   진짜 아이폰의 확대 동작은 여기서 못 일으킴 → 막이가 걸려 있는지(값·이벤트)와, 막아도 판·단추가 그대로 눌리는지를 봄
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/nyang');

// ── 도우미: 칸을 손가락처럼 누름 (한 번 = ✕, 0.4초 안에 두 번 = 🐱)
const tap = (p, k) => p.evaluate(k => {
  const el = document.getElementById('board').children[k], r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
}, k);
const cat = async (p, k) => { await tap(p, k); await tap(p, k); };
const ansOf = p => p.evaluate(() => { const G = __ny.G, o = []; for (let r = 0; r < G.n; r++) { const k = r * G.n + G.ans[r]; if (!G.cats.has(k)) o.push(k); } return o; });
const wrongOf = p => p.evaluate(() => { const G = __ny.G, o = []; for (let k = 0; k < G.n * G.n; k++) if (!G.isAns(k) && !G.cats.has(k) && !G.bad.has(k) && !G.xs.has(k)) o.push(k); return o; });
const solve = async p => { for (const k of await ansOf(p)) await cat(p, k); };
const shown = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!(e && __qa.vis(e)); }, sel);
const clickText = (p, re) => p.evaluate(s => __qa.clickText(new RegExp(s)), re);

U.main(async T => {
  const p = await T.open('nyang/');
  await U.waitFor(p, A.ready);

  // ── ① 확대 막이: 화면 값
  const vp = await p.evaluate(() => document.querySelector('meta[name=viewport]').content);
  T.ok(/maximum-scale=1/.test(vp) && /user-scalable=no/.test(vp), '① viewport 확대 막음 (' + vp + ')');
  const ta = await p.evaluate(() => ['body', '#tabSolo', '#tabFriend', '#startBtn'].map(q => { const e = document.querySelector(q); return e ? getComputedStyle(e).touchAction : '없음:' + q; }));
  T.ok(ta.every(v => v === 'manipulation'), '① 판 밖은 두 번 톡 확대 없음 touch-action (' + ta.join() + ')');

  // ── ① 확대 막이: 이벤트 (페이지 어디서든 + 판 위 손가락 뗌)
  const ev = await p.evaluate(() => {
    const fire = (el, e) => { el.dispatchEvent(e); return e.defaultPrevented; };
    const t = (el, id, x) => new Touch({ identifier: id, target: el, clientX: x, clientY: 50 });
    return {
      gesture: fire(document.body, new Event('gesturestart', { bubbles: true, cancelable: true })),
      dbl: fire(document.body, new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
      two: fire(document.body, new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t(document.body, 1, 10), t(document.body, 2, 90)] })),
      one: fire(document.body, new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t(document.body, 1, 10)] })),
    };
  });
  T.ok(ev.gesture, '① 두 손가락 확대 막음 (gesturestart)');
  T.ok(ev.dbl, '① 두 번 톡 막음 (dblclick)');
  T.ok(ev.two, '① 두 손가락 움직임 막음 (touchmove)');
  T.ok(!ev.one, '① 한 손가락 움직임은 그대로 (쪽 넘기기)');

  // ── ③ 공통 화면 틀 (CONVENTIONS '화면 틀')
  const frame = await p.evaluate(() => {
    const $ = id => document.getElementById(id), rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    return {
      cozy: !!document.querySelector('link[href*="common/cozy.css"]'),
      ownFont: !!document.querySelector('link[href*="Jua"], link[href*="Gowun"]') || /Jua|Gowun/.test(getComputedStyle(document.body).fontFamily),
      tabs: [...document.querySelectorAll('.tabs .btn')].map(b => b.textContent.trim()),
      topLink: (document.querySelector('header.top a') || {}).textContent,
      profile: !!document.querySelector('header.top .mechip, #meChip'),
      minor: [...document.querySelectorAll('#home .minor .btn')].filter(b => !b.hidden).map(b => b.textContent.trim()),
      minorLast: (() => { const s = $('home'), m = s.querySelector('.minor'); return !!m && m === s.lastElementChild; })(),
      start: (() => { const b = $('startBtn'); return b ? [b.textContent.trim(), b.classList.contains('primary'), b.classList.contains('big')] : []; })(),
      howBeforeStart: (() => { const h = $('howto'), b = $('startBtn'); return !!(h && b) && !!(h.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); })(),
      bg: lum(rgb(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().replace('#', '').match(/../g).map(h => parseInt(h, 16)).join(','))),
      ink: lum(rgb(getComputedStyle(document.body).color)),
      playBox: !!document.querySelector('section.play#play'),
      barBox: !!document.querySelector('#play .bar .iconbtn#giveUp'),
      oldLobby: !!$('lobby') || !!$('rooms') || !!$('tabRank'),
      netGone: !window.NET && ![...document.scripts].some(s => /nyang\/net\.js|^net\.js|\/net\.js/.test(s.src)),
    };
  });
  T.ok(frame.cozy, '③ common/cozy.css 를 씀');
  T.ok(!frame.ownFont, '③ 게임별 글꼴 없음 (Jua·Gowun 없앰)');
  T.ok(frame.tabs.join('|') === '혼자|친구랑|AI 구경', '③ 탭 = 혼자 · 친구랑 · AI 구경 (' + frame.tabs.join('|') + ')');
  T.ok(frame.topLink === '게임 목록', '③ 위 오른쪽 게임 목록 (' + frame.topLink + ')');
  T.ok(!frame.profile, '③ 위쪽 프로필 단추 없음');
  T.ok(frame.minor.includes('🏆 랭킹') && frame.minorLast, '③ 맨 아래 작은 줄에 🏆 랭킹 (' + frame.minor.join('|') + ')');
  T.ok(frame.start[0] === '시작!' && frame.start[1] && frame.start[2], '③ 큰 단추 시작! (' + frame.start + ')');
  T.ok(frame.howBeforeStart, '③ 규칙 안내가 시작! 위에');
  T.ok(frame.bg > 0.7 && frame.ink < 0.2, '③ 11-06 밝은 바탕 · 어두운 글자 (지민 님: 어두운 판이 눈 아픔) (' + frame.bg.toFixed(3) + ' / ' + frame.ink.toFixed(3) + ')');
  {  // 11-06: 눈 피로 다시 안 생기게 — 칸과 틈(판 바탕)의 밝기 차이 (어두운 판은 평균 9.8배 · 최대 13.3배였음)
    const c = await p.evaluate(() => {
      const L = rgb => { const a = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
      const hex = h => h.slice(1).match(/../g).map(x => parseInt(x, 16));
      const probe = document.createElement('div'); probe.id = 'board'; probe.style.display = 'none'; const old = document.getElementById('board'); (old || document.body).parentNode.appendChild(probe);
      const bg = (old ? getComputedStyle(old) : getComputedStyle(probe)).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number); probe.remove();
      const r = __ny.NY.COLORS.map(x => { const a = L(hex(x[0])), b = L(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
      return { avg: r.reduce((x, y) => x + y, 0) / r.length, max: Math.max(...r) };
    });
    T.ok(c.avg < 2.5 && c.max < 3, `③ 칸과 판 바탕의 밝기 차이가 작음 (평균 ${c.avg.toFixed(1)}배 · 최대 ${c.max.toFixed(1)}배)`);
  }
  T.ok(frame.playBox && frame.barBox, '③ 게임 화면도 cozy .play · .bar');
  T.ok(!frame.oldLobby, '③ 자체 대기실·방 목록·랭킹 탭 없음');
  T.ok(frame.netGone, '③ nyang/net.js 를 안 부름');
  // 랭킹 창: 탭이 아니라 맨 아래 단추로 · 뒤로 닫기(backnav)가 찾는 닫기 단추가 있음
  await p.evaluate(() => document.getElementById('rankBtn').click());
  T.ok(await U.waitFor(p, () => { const b = document.getElementById('rankBox'); return b && !b.hidden; }, null, 2000, 50), '③ 🏆 랭킹 → 랭킹 창');
  T.ok(await U.waitFor(p, () => /실제 사이트/.test(document.getElementById('rkList').textContent), null, 3000, 50), '③ 시험 화면 랭킹은 오류 대신 안내 글');
  await p.evaluate(() => document.querySelector('#rankBox [data-x]').click());
  T.ok(await p.evaluate(() => document.getElementById('rankBox').hidden), '③ 랭킹 창 닫기');
  // 고르기 → 시작!: 난이도를 눌러도 바로 시작하지 않음
  await p.evaluate(() => { const $ = id => document.getElementById(id); [...$('soloMode').children].find(b => b.dataset.v === 'one').click(); $('tiers').querySelector('.t-normal').click(); });
  T.ok(await p.evaluate(() => document.getElementById('play').hidden && document.querySelector('#tiers .t-normal').getAttribute('aria-pressed') === 'true'), '③ 난이도 카드는 고르기만');
  await p.evaluate(() => { const $ = id => document.getElementById(id); $('tiers').querySelector('.t-easy').click(); $('startBtn').click(); });

  // ── ① 막아도 판이 그대로: 진짜 터치로 한 번 = ✕, 두 번 = 🐱 (판은 pointerdown 으로 받음)
  T.ok(!!(await U.waitFor(p, () => { const G = window.__ny.G; return G && !document.getElementById('play').hidden && document.querySelector('#board .c'); })), '① 판이 열림');
  const boardTA = await p.evaluate(() => getComputedStyle(document.getElementById('board')).touchAction);
  T.ok(boardTA === 'none', '① 판은 끌어서 ✕ 칠하기라 touch-action none 그대로 (' + boardTA + ')');
  const endDef = await p.evaluate(() => {
    const c = document.querySelector('#board .c'), e = new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [new Touch({ identifier: 1, target: c, clientX: 5, clientY: 5 })] });
    c.dispatchEvent(e); return e.defaultPrevented;
  });
  T.ok(endDef, '① 판에서 손가락 뗄 때 막음 (아이폰은 touch-action none 만으론 안 따를 때가 있음)');
  const covered = await p.evaluate(() => {   // 판 위에 다른 단추(🐞 문제 알리기 · 💬 채팅 손잡이)가 얹혀 칸을 가리지 않아야 함
    const bad = [];
    for (const c of document.getElementById('board').children) {
      const r = c.getBoundingClientRect();
      for (const [fx, fy] of [[.1, .1], [.1, .5], [.1, .9], [.5, .5], [.9, .5]]) { const e = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); if (!e || !e.closest('#board')) bad.push(e ? (e.id || e.className) : 'null'); }
    }
    return bad;
  });
  T.ok(covered.length === 0, '① 판 위를 가리는 것 없음 (' + [...new Set(covered)].join() + ')');
  const pos = await p.evaluate(() => {
    const G = window.__ny.G; let k = -1, x = -1, y = -1;
    for (let i = 0; i < G.n * G.n; i++) { if (G.isAns(i)) { if (k < 0) k = i; } else if (x < 0) x = i; else if (y < 0) y = i; }
    const at = i => { const r = document.getElementById('board').children[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    return { k, x, y, ans: at(k), wrong: at(x), wrong2: at(y) };
  });
  await p.touchscreen.tap(pos.wrong.x, pos.wrong.y);
  T.ok(!!(await U.waitFor(p, x => window.__ny.G.xs.has(x), pos.x, 2000, 40)), '① 진짜 터치 한 번 = ✕');
  await T.sleep(500);
  await p.touchscreen.tap(pos.wrong.x, pos.wrong.y);
  T.ok(!!(await U.waitFor(p, x => !window.__ny.G.xs.has(x), pos.x, 2000, 40)), '① 0.4초 넘겨 또 누르면 ✕ 꺼짐 (🐱 아님)');
  T.ok(await p.evaluate(() => window.__ny.G.mistakes === 0), '① 천천히 두 번은 실수로 안 셈');
  await T.sleep(500);
  await p.touchscreen.tap(pos.ans.x, pos.ans.y); await p.touchscreen.tap(pos.ans.x, pos.ans.y);
  T.ok(!!(await U.waitFor(p, k => window.__ny.G.cats.has(k), pos.k, 2000, 40)), '① 진짜 터치 두 번 = 🐱');
  // 드래그: 누른 채 끌면 지나간 칸마다 ✕
  const xs0 = await p.evaluate(() => window.__ny.G.xs.size);
  await T.sleep(450);
  await p.mouse.move(pos.wrong.x, pos.wrong.y); await p.mouse.down(); await p.mouse.move(pos.wrong2.x, pos.wrong2.y, { steps: 6 }); await p.mouse.up();
  T.ok((await p.evaluate(() => window.__ny.G.xs.size)) >= xs0 + 2, '① 끌면 지나간 칸마다 ✕');
  // 판 밖 단추도 터치로 그대로 눌림
  const auto0 = await p.evaluate(() => document.getElementById('autoX').getAttribute('aria-pressed'));
  const ax = await p.evaluate(() => { const r = document.getElementById('autoX').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.touchscreen.tap(ax.x, ax.y);
  T.ok(!!(await U.waitFor(p, v => document.getElementById('autoX').getAttribute('aria-pressed') !== v, auto0, 2000, 40)), '① 판 밖 단추는 터치로 그대로 눌림');
  await p.close();

  // ── ④ 이 기기 기록 그대로: localStorage 키·값을 그대로 읽고, 같은 키에 씀 (와이프 폰의 단계·별·고양이·기록)
  const d = await T.open('nyang/');
  await U.waitFor(d, A.ready);
  const SAVED = { 'nyang.stageStars': { 1: 3, 2: 1, 10: 2 }, 'nyang.skin': '🐈', 'nyang.solved': { easy: [0, 1] }, 'nyang.bestT': { easy: 12.3 }, 'nyang.taBest': { easy: 7 }, 'nyang.autoX': true, 'nyang.soloMode2': 'map', 'nyang.cfg': { tier: 'hard', hint: 'off', rounds: 5, mode: 'coop' }, 'nyang.recent_easy': [3], 'nyang.rk2': { kind: 'tb', tier: 'easy', mins: 3 } };
  await d.evaluate(s => { localStorage.clear(); for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); localStorage.setItem('nyang.sound', '0'); }, SAVED);
  await d.reload({ waitUntil: 'load' });
  await U.waitFor(d, A.ready);
  const ls = await d.evaluate(() => { const $ = id => document.getElementById(id); return {
    stars: /모은 별 ⭐ 6개/.test($('stageBox').textContent), cur: !!document.querySelector('#stageBox [data-k="11"].cur'), lock: !!document.querySelector('#stageBox [data-k="12"].lock'),
    skinOn: (document.querySelector('.skins button.on') || {}).textContent, autoX: $('autoX').getAttribute('aria-pressed'), sound: window.NYSND && NYSND.on,
    onemode: $('tiers').hidden };
  });
  T.ok(ls.stars && ls.cur && ls.lock, '④ 단계·별 그대로 (' + JSON.stringify(ls) + ')');
  T.ok(ls.skinOn === '🐈', '④ 고른 고양이 그대로 (' + ls.skinOn + ')');
  T.ok(ls.autoX === 'true', '④ 자동 ✕ 설정 그대로');
  T.ok(ls.sound === false, '④ 소리 끔 그대로');
  T.ok(ls.onemode, '④ 지난번 고른 방식(단계 지도) 그대로');
  const rec = await d.evaluate(async () => { const $ = id => document.getElementById(id); const pick = v => [...$('soloMode').children].find(b => b.dataset.v === v).click(); pick('one'); const a = $('tiers').querySelector('.t-easy').textContent; pick('ta'); const b = $('tiers').querySelector('.t-easy').textContent; pick('map'); return { a, b }; });
  T.ok(/0:12\.3/.test(rec.a), '④ 한 판 최고 시간 그대로 (' + rec.a + ')');
  T.ok(/7개/.test(rec.b), '④ 타임어택 최고 그대로 (' + rec.b + ')');
  const raw = await d.evaluate(s => Object.keys(s).filter(k => !['nyang.soloMode2'].includes(k)).filter(k => localStorage.getItem(k) !== JSON.stringify(s[k])), SAVED);
  T.ok(raw.length === 0, '④ 여는 것만으로 저장값이 안 바뀜 (' + raw.join() + ')');
  // 단계 하나 깨면 같은 키에 씀
  await d.evaluate(() => document.getElementById('startBtn').click());
  await U.waitFor(d, () => { const G = window.__ny.G; return G && !document.getElementById('play').hidden; });
  T.ok(await d.evaluate(() => /🐈/.test(document.querySelector('#board .c .cat').textContent)), '④ 판에도 고른 고양이');
  await solve(d);
  T.ok(!!(await U.waitFor(d, () => !document.getElementById('resBox').hidden && /11단계 성공/.test(document.getElementById('resTitle').textContent), null, 4000, 60)), '④ 11단계 성공 창');
  const after = await d.evaluate(() => ({ st: JSON.parse(localStorage.getItem('nyang.stageStars')), sv: JSON.parse(localStorage.getItem('nyang.solved')), keys: Object.keys(localStorage).filter(k => /stage|star/i.test(k)) }));
  T.ok(after.st[11] >= 1 && after.st[1] === 3 && after.st[10] === 2, '④ 새 별도 같은 키에 (' + JSON.stringify(after.st) + ')');
  T.ok(after.keys.join() === 'nyang.stageStars', '④ 단계 저장 키 이름 그대로 (' + after.keys.join() + ')');
  T.ok(after.sv.easy.includes(0) && after.sv.easy.length >= 2, '④ 푼 문제 목록 이어서');
  // 방 설정도 지난번 값 그대로 (같은 키)
  await d.evaluate(() => { const b = [...document.querySelectorAll('#resBtns button')].pop(); if (b) b.click(); document.getElementById('tabFriend').click(); });
  await U.waitFor(d, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; });
  await d.evaluate(() => document.querySelector('[data-host]').click());
  T.ok(await U.waitFor(d, () => { const m = ArenaUI.net && ArenaUI.net.meta; return m && m.cfg && m.cfg.tier === 'hard' && m.cfg.mode === 'coop' && m.cfg.rounds === 5; }, null, 4000, 60), '④ 방 설정 지난번 값 그대로 (nyang.cfg)');
  await d.evaluate(() => localStorage.clear());
  await d.close();

  // ── ② 방 만들기 문: 허용 안 된 기기 → 허용 창 (거절하면 방 안 생김) · 창에서 허용되면 이어서 방 · 허용된 기기는 창 없이
  const q = await T.open('nyang/', 'nohost');
  await U.waitFor(q, A.ready);
  await U.waitFor(q, () => !!(window.Gate && window.GME));
  const press = allow => q.evaluate(async allow => {
    window.__asked = 0;
    Gate.requestHost = async () => { window.__asked++; if (allow) Gate.state.canHost = true; return allow; };
    if (window.ArenaUI && ArenaUI.net) ArenaUI.leave();
    const x = document.querySelector('.arn-ov:not([hidden]) [data-x]'); if (x) x.click();
    document.getElementById('tabFriend').click();
    for (let i = 0; i < 40 && !document.querySelector('.arn-ov:not([hidden]) [data-host]'); i++) await new Promise(r => setTimeout(r, 50));
    document.querySelector('.arn-ov:not([hidden]) [data-host]').click();
    await new Promise(r => setTimeout(r, 300));
    return { asked: window.__asked, hosted: !!(window.ArenaUI && ArenaUI.net) };
  }, allow);
  await q.evaluate(() => { Gate.state.canHost = false; });
  const no = await press(false);
  T.ok(no.asked === 1, '② 허용 안 된 기기: 방 만들기 → 허용 창 (' + no.asked + ')');
  T.ok(!no.hosted, '② 창을 닫으면 방이 안 생김');
  const yes = await press(true);
  T.ok(yes.asked === 1 && yes.hosted, '② 창에서 허용되면 이어서 방을 만듦 (' + JSON.stringify(yes) + ')');
  const ok = await press(false);
  T.ok(ok.asked === 0 && ok.hosted, '② 허용된 기기: 창 없이 바로 방을 만듦 (' + JSON.stringify(ok) + ')');
  await q.evaluate(() => { if (window.ArenaUI && ArenaUI.net) ArenaUI.leave(); });
  await q.close();

  // ── ⑤ 대기실: 설정 칸 (방식·시간·난이도·힌트·판 수) · 최대 8명 · 방식 설명
  const R0 = () => { const pick = (id, v) => { const b = document.querySelector('#' + id + ' [data-v="' + v + '"]'); if (b) b.click(); }; pick('cfgMode', 'race'); pick('cfgTier', 'easy'); pick('cfgHint', 'penalty'); pick('cfgRounds', '3'); };
  const L = await T.open('nyang/');
  await U.waitFor(L, A.ready);
  await L.evaluate(() => document.getElementById('tabFriend').click());
  await U.waitFor(L, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; });
  await L.click('[data-host]');
  const code = await U.waitFor(L, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code);
  T.ok(!!code, '⑤ 방 코드 생김');
  const lob = await L.evaluate(() => { const $ = s => document.querySelector(s); return {
    max: ArenaUI.net.meta.max, ids: ['cfgMode', 'cfgTier', 'cfgHint', 'cfgRounds'].filter(i => !document.getElementById(i)), modes: [...document.querySelectorAll('#cfgMode [data-v]')].map(b => b.dataset.v).join(), cnt: $('[data-count]').textContent, start: $('[data-start]').disabled }; });
  T.ok(lob.max === 8, '⑤ 최대 8명 (' + lob.max + ')');
  T.ok(lob.ids.length === 0, '⑤ 설정이 ArenaUI 대기실 칸에 (' + lob.ids.join() + ')');
  T.ok(lob.modes === 'race,ta,coop', '⑤ 방식 세 가지 (' + lob.modes + ')');
  T.ok(lob.start, '⑤ 혼자면 시작 단추 잠김');
  await L.evaluate(() => document.querySelector('#cfgMode [data-v="ta"]').click());
  const lob2 = await L.evaluate(() => ({ mins: !!document.querySelector('#cfgMins [data-v="5"]'), desc: document.querySelector('[data-desc]').textContent, sum: document.querySelector('[data-sum]').textContent, saved: JSON.parse(localStorage.getItem('nyang.cfg') || 'null') }));
  T.ok(lob2.mins, '⑤ 타임어택이면 시간 고르기가 나옴');
  T.ok(/정해진 시간/.test(lob2.desc), '⑤ 방식 설명 (' + lob2.desc + ')');
  T.ok(/타임어택/.test(lob2.sum), '⑤ 설정 요약 (' + lob2.sum + ')');
  T.ok(lob2.saved && lob2.saved.mode === 'ta', '⑤ 설정은 다음 방에도 (nyang.cfg)');
  const LG = await T.open('nyang/', 'room=' + code);
  await U.waitFor(LG, A.ready);
  T.ok(await U.waitFor(LG, () => { const e = document.querySelector('[data-sum]'); return e && /타임어택/.test(e.textContent) && !document.getElementById('cfgMode'); }, null, 6000, 60), '⑤ 손님은 설정을 보기만');
  await L.evaluate(() => document.querySelector('#cfgMins [data-v="5"]').click());
  T.ok(await U.waitFor(LG, () => /5분/.test(document.querySelector('[data-sum]').textContent), null, 3000, 60), '⑤ 방장이 바꾸면 손님 화면도');
  await L.evaluate(() => ArenaUI.leave());
  T.ok(await U.waitFor(LG, () => !ArenaUI.net && /닫았어요/.test(document.querySelector('.arn-box').textContent), null, 3000, 60), '⑤ 방장이 나가면 손님에게 방 닫힘');
  await L.close(); await LG.close();

  // ── ⑥ 빨리 풀기: 같은 판 · 진행 · 관전 · 결과 · 결과 다시 보기 · 다음 판 · 채팅 · 재접속 · 구경꾼 · 대기실로
  {
    const { H, W } = await T.pair({ ...A, online: { ...A.online, beforeStart: R0 } });
    const same = await Promise.all([H, W].map(x => x.evaluate(() => JSON.stringify([__ny.G.reg, __ny.G.ans, __ny.meta.round, __ny.meta.pid, __ny.meta.vs]))));
    T.ok(same[0] === same[1], '⑥ 두 화면이 같은 판');
    T.ok(await W.evaluate(() => __ny.meta.round === 1 && document.getElementById('opp').children.length === 2), '⑥ 위쪽 이름표 2명');
    // 진행이 방장·손님 서로에게
    const wk = await ansOf(W); await cat(W, wk[0]);
    const wu = await W.evaluate(() => ArenaUI.net.uid), hu = await H.evaluate(() => ArenaUI.net.uid);
    T.ok(await U.waitFor(H, u => { const q = __ny.prog[u]; return q && q.placed === 1 && /c/.test(q.b); }, wu, 3000, 50), '⑥ 손님 🐱 → 방장이 앎');
    const hx = (await wrongOf(H))[0]; await tap(H, hx);
    T.ok(await U.waitFor(W, a => { const q = __ny.prog[a[0]]; return q && q.b[a[1]] === 'x'; }, [hu, hx], 3000, 50), '⑥ 방장 ✕ → 손님이 앎 (판 모양)');
    // 내 판 끝나기 전엔 친구 판을 못 봄
    await W.evaluate(u => document.querySelector('#opp .p[data-u="' + u + '"]').click(), hu);
    T.ok(await W.evaluate(() => document.getElementById('spyBox').hidden), '⑥ 끝나기 전엔 관전 안 열림');
    // 채팅: 게임 중 💬 → 공통 채팅창, 받는 쪽은 말풍선·배지
    T.ok(await shown(W, '#chatBtn'), '⑥ 게임 중 💬 단추');
    T.ok(!(await shown(W, '.arn-ctab')), '⑥ 판을 가리는 왼쪽 손잡이는 게임 중 숨김');
    await W.click('#chatBtn');
    T.ok(await shown(W, '.arn-cpan'), '⑥ 💬 → 채팅창');
    await W.fill('.arn-cin', '냥냥 힘내'); await W.click('[data-cs]');
    T.ok(await U.waitFor(H, () => /냥냥 힘내/.test(document.querySelector('.arn-cbub').textContent), null, 3000, 50), '⑥ 상대에게 말풍선');
    T.ok(await shown(H, '#chatBadge'), '⑥ 상대 💬 에 배지');
    T.ok(await W.evaluate(() => /냥냥 힘내/.test(document.querySelector('.arn-clog').textContent)), '⑥ 내 채팅창 기록');
    await W.click('[data-cx]');
    // 재접속: 손님 새로 고침 → 같은 자리 · 판 그대로 (고양이·✕·실수)
    const wx = (await wrongOf(W))[0]; await tap(W, wx);
    await U.waitFor(H, a => { const q = __ny.prog[a[0]]; return q && q.b[a[1]] === 'x'; }, [wu, wx], 3000, 50);
    const before = await W.evaluate(() => ({ c: [...__ny.G.cats], x: [...__ny.G.xs], r: __ny.meta.round }));
    await W.reload({ waitUntil: 'load' });
    await U.waitFor(W, A.ready);
    T.ok(await U.waitFor(W, A.online.started, null, 10000, 60), '⑥ 손님 새로 고침 → 게임으로 돌아옴');
    T.ok(await U.waitFor(W, b => { const G = __ny.G; return G && JSON.stringify([...G.cats]) === JSON.stringify(b.c) && G.xs.has(b.x[0]); }, before, 4000, 60), '⑥ 다시 들어와도 판이 그대로 (' + JSON.stringify(before) + ')');
    T.ok(await W.evaluate(u => __ny.meta.who.includes(u) && !/구경/.test(document.getElementById('stLabel').textContent), wu), '⑥ 구경꾼으로 밀리지 않음');
    // 구경꾼: 판 도중 들어옴 → 👀 · 이번 판은 구경 · 친구 판(판 모양)을 바로 봄 · 눌러도 안 놓임
    const S = await T.open('nyang/', 'room=' + (await H.evaluate(() => ArenaUI.net.code)));
    await U.waitFor(S, A.ready);
    T.ok(await U.waitFor(S, A.online.started, null, 10000, 60), '⑥ 늦게 온 사람 → 판 화면');
    T.ok(await S.evaluate(() => /구경/.test(document.getElementById('stLabel').textContent)), '⑥ 늦게 온 사람은 구경');
    T.ok(await U.waitFor(S, () => !document.getElementById('spyBox').hidden && document.querySelectorAll('#spyBoard .c').length > 0, null, 4000, 60), '⑥ 구경꾼에게 친구 판이 바로 보임');
    const specCats = await S.evaluate(() => __ny.G.cats.size);
    await S.evaluate(() => { document.getElementById('spyClose').click(); });
    await tap(S, 0); await tap(S, 0);
    T.ok(await S.evaluate(n => __ny.G.cats.size === n && __ny.G.bad.size === 0, specCats), '⑥ 구경꾼은 판을 못 건드림');
    const su = await S.evaluate(() => ArenaUI.net.uid);
    T.ok(await H.evaluate(u => !__ny.meta.who.includes(u) && !__ny.prog[u], su), '⑥ 구경꾼은 판 끝 기다림에 안 들어감');
    // 내가 먼저 끝내면 친구 판 보기
    await solve(W);
    T.ok(await U.waitFor(W, () => __ny.G.won, null, 2000, 40), '⑥ 손님 다 풀음');
    await T.sleep(1300);
    T.ok(await U.waitFor(W, () => document.querySelector('#opp .p.can'), null, 2000, 50), '⑥ 끝나면 친구 이름표가 눌림');
    await W.evaluate(u => document.querySelector('#opp .p[data-u="' + u + '"]').click(), hu);
    T.ok(await U.waitFor(W, x => !document.getElementById('spyBox').hidden && document.querySelectorAll('#spyBoard .c')[x].classList.contains('has-x'), hx, 2000, 50), '⑥ 관전: 친구 판 모양이 보임');
    await W.evaluate(() => document.getElementById('spyClose').click());
    // 결과: 방장도 끝내면 둘 다 결과 창
    await solve(H);
    const resT = () => { const b = document.getElementById('resBox'); return !b.hidden && document.getElementById('resTitle').textContent; };
    const [ht, wt] = await Promise.all([U.waitFor(H, resT, null, 5000, 60), U.waitFor(W, resT, null, 5000, 60)]);
    T.ok(/승리|이겼어요/.test(ht) && /승리|이겼어요/.test(wt), '⑥ 결과 창 (' + ht + ' / ' + wt + ')');
    T.ok(await H.evaluate(() => document.querySelectorAll('#resBody table.rank tr').length === 3), '⑥ 결과표 2명');
    T.ok(await U.waitFor(H, () => Object.values(__ny.meta.wins || {}).reduce((a, b) => a + b, 0) === 1, null, 2000, 50), '⑥ 승수 하나 올라감');
    T.ok(await U.waitFor(S, resT, null, 4000, 60), '⑥ 구경꾼에게도 결과');
    // 결과 다시 보기
    await clickText(W, '^판 보기');
    T.ok(await U.waitFor(W, () => { const b = document.getElementById('resPeek'); return b && __qa.vis(b); }, null, 2000, 50), '⑥ 판 보기 → 결과 다시 보기 단추');
    await W.click('#resPeek');
    T.ok(await W.evaluate(() => !document.getElementById('resBox').hidden), '⑥ 결과 다시 보기');
    await clickText(W, '^판 보기');
    // 다음 판: 구경꾼도 이번엔 같이
    const start2 = await H.evaluate(() => { const b = [...document.querySelectorAll('#resBtns button')].find(x => /다음 판/.test(x.textContent)); if (b) b.click(); return !!b; });
    T.ok(start2, '⑥ 방장 다음 판');
    for (const [x, n] of [[H, '방장'], [W, '손님'], [S, '구경꾼']]) T.ok(await U.waitFor(x, () => __ny.myRound === 2 && __ny.G && !document.getElementById('play').hidden && document.getElementById('countBox').hidden, null, 8000, 60), '⑥ 다음 판 시작 · ' + n);
    T.ok(await S.evaluate(u => __ny.meta.who.includes(u) && !/구경/.test(document.getElementById('stLabel').textContent), su), '⑥ 구경꾼도 다음 판부터 같이');
    T.ok(await W.evaluate(() => !__ny.G.cats.size && !__ny.G.xs.size), '⑥ 다음 판은 새 판');
    // 대기실로: 모두 돌아감 · 옛 판이 저절로 안 시작됨 · 다시 시작하면 1판부터
    await H.evaluate(() => ArenaUI.toLobby());
    T.ok(await U.waitFor(W, () => document.getElementById('play').hidden && __qa.vis(document.querySelector('.arn-ov .arn-wait')), null, 3000, 50), '⑥ 대기실로 → 손님도 대기실');
    await T.sleep(600);
    T.ok(await W.evaluate(() => !__ny.G && document.getElementById('countBox').hidden), '⑥ 대기실에서 옛 판이 저절로 안 시작됨');
    await H.click('[data-start]');
    for (const [x, n] of [[H, '방장'], [W, '손님']]) T.ok(await U.waitFor(x, () => __ny.myRound === 1 && __ny.G && !document.getElementById('play').hidden && document.getElementById('countBox').hidden, null, 8000, 60), '⑥ 대기실에서 다시 시작 → 1판 · ' + n);
    // 방 나가기: 손님 나가면 첫 화면, 방은 그대로
    await W.evaluate(() => ArenaUI.leave());
    T.ok(await U.waitFor(W, () => !document.getElementById('home').hidden && !__ny.G && !document.body.classList.contains('playing'), null, 3000, 50), '⑥ 나가면 첫 화면');
    T.ok(await U.waitFor(H, u => !ArenaUI.net.players[u], wu, 3000, 50), '⑥ 방장 화면에서 빠짐');
    for (const x of [H, W, S]) { await x.evaluate(() => { if (window.ArenaUI && ArenaUI.net) ArenaUI.leave(); }); await x.close(); }
  }

  // ── ⑦ 타임어택: 같은 순서 · 푼 개수로 승부 · 시간 끝 → 결과
  {
    const TA = () => { const pick = (id, v) => { const b = document.querySelector('#' + id + ' [data-v="' + v + '"]'); if (b) b.click(); }; pick('cfgMode', 'ta'); pick('cfgMins', '2'); pick('cfgTier', 'easy'); pick('cfgHint', 'penalty'); pick('cfgRounds', '3'); };
    const { H, W } = await T.pair({ ...A, online: { ...A.online, beforeStart: TA } });
    const seq = await Promise.all([H, W].map(x => x.evaluate(() => JSON.stringify([__ny.TA.seq, __ny.TA.endAt, __ny.G.reg]))));
    T.ok(seq[0] === seq[1], '⑦ 모두 같은 순서·같은 시간·같은 첫 판');
    await solve(H);
    T.ok(await U.waitFor(H, () => __ny.TA.solved === 1, null, 3000, 50), '⑦ 방장 1개');
    T.ok(await U.waitFor(H, () => __ny.TA.i === 1 && !__ny.G.cats.size, null, 3000, 50), '⑦ 다음 문제로');
    const hu = await H.evaluate(() => ArenaUI.net.uid);
    T.ok(await U.waitFor(W, u => __ny.prog[u] && __ny.prog[u].solved === 1, hu, 3000, 50), '⑦ 손님이 방장 개수를 앎');
    // 손님 새로 고침: 푼 개수·문제 번호가 안 사라짐
    await solve(W);
    await U.waitFor(W, () => __ny.TA.i === 1 && !__ny.G.cats.size, null, 3000, 50);
    const wi = await W.evaluate(() => ArenaUI.net.uid);
    await U.waitFor(H, u => __ny.prog[u] && __ny.prog[u].solved === 1, wi, 3000, 50);
    await W.reload({ waitUntil: 'load' });
    await U.waitFor(W, A.ready);
    T.ok(await U.waitFor(W, () => window.__ny && __ny.TA && __ny.TA.solved === 1 && __ny.TA.i === 1 && !document.getElementById('play').hidden, null, 10000, 60), '⑦ 재접속해도 푼 개수 그대로');
    await solve(H);
    T.ok(await U.waitFor(H, () => __ny.TA.solved === 2, null, 3000, 50), '⑦ 방장 2개');
    await U.waitFor(W, u => __ny.prog[u] && __ny.prog[u].solved === 2, hu, 3000, 50);
    await Promise.all([H, W].map(x => x.evaluate(() => { __ny.TA.endAt = Date.now() - 1; })));
    const resT = () => { const b = document.getElementById('resBox'); return !b.hidden && document.getElementById('resTitle').textContent; };
    const [a, b] = await Promise.all([U.waitFor(H, resT, null, 8000, 60), U.waitFor(W, resT, null, 8000, 60)]);
    T.ok(/내가 이겼어요/.test(a), '⑦ 많이 푼 방장 승 (' + a + ')');
    T.ok(/승리/.test(b), '⑦ 손님 화면에도 방장 승 (' + b + ')');
    T.ok(await W.evaluate(() => /푼 문제/.test(document.getElementById('resBody').textContent)), '⑦ 결과표에 푼 문제');
    for (const x of [H, W]) { await x.evaluate(() => { if (window.ArenaUI && ArenaUI.net) ArenaUI.leave(); }); await x.close(); }
  }

  // ── ⑧ 협동: 한 판을 같이 · 🐟 5마리 같이 · 재접속해도 내가 놓은 것이 안 사라짐 · 같이 끝
  {
    const CO = () => { const pick = (id, v) => { const b = document.querySelector('#' + id + ' [data-v="' + v + '"]'); if (b) b.click(); }; pick('cfgMode', 'coop'); pick('cfgTier', 'easy'); pick('cfgHint', 'penalty'); pick('cfgRounds', '3'); };
    const { H, W } = await T.pair({ ...A, online: { ...A.online, beforeStart: CO } });
    T.ok(await H.evaluate(() => __ny.G.maxMistakes === 5 && document.getElementById('fish').children.length === 5), '⑧ 🐟 5마리');
    const keys = await ansOf(H);
    await cat(H, keys[0]);
    T.ok(await U.waitFor(W, k => __ny.G.cats.has(k), keys[0], 3000, 50), '⑧ 방장 🐱 → 손님 판에도');
    await cat(W, keys[1]);
    T.ok(await U.waitFor(H, k => __ny.G.cats.has(k), keys[1], 3000, 50), '⑧ 손님 🐱 → 방장 판에도');
    const x = (await wrongOf(W))[0]; await tap(W, x);
    T.ok(await U.waitFor(H, k => __ny.G.xs.has(k), x, 3000, 50), '⑧ 손님 ✕ → 방장 판에도');
    const bad = (await wrongOf(H)).filter(k => k !== x)[0]; await cat(H, bad);
    T.ok(await U.waitFor(W, () => __ny.G.mistakes === 1 && document.querySelectorAll('#fish .gone').length === 1, null, 3000, 50), '⑧ 틀린 것도 같이 (🐟 하나 잃음)');
    await W.reload({ waitUntil: 'load' });
    await U.waitFor(W, A.ready);
    T.ok(await U.waitFor(W, k => window.__ny && __ny.G && __ny.G.cats.has(k[0]) && __ny.G.cats.has(k[1]) && __ny.G.mistakes === 1, keys, 10000, 60), '⑧ 손님 재접속: 판 그대로');
    await T.sleep(200);
    const k3 = keys[2]; await cat(H, k3);
    T.ok(await U.waitFor(H, k => __ny.G.cats.has(k[1]) && __ny.G.cats.has(k[2]), keys, 3000, 50), '⑧ 재접속 뒤에도 손님이 놓은 🐱 그대로');
    await U.waitFor(W, k => __ny.G.cats.has(k), k3, 3000, 50);
    await cat(W, keys[3]);
    await U.waitFor(H, k => __ny.G.cats.has(k), keys[3], 3000, 50);
    for (const k of keys.slice(4)) { await cat(H, k); }
    const resT = () => { const b = document.getElementById('resBox'); return !b.hidden && document.getElementById('resTitle').textContent; };
    const [a, b] = await Promise.all([U.waitFor(H, resT, null, 6000, 60), U.waitFor(W, resT, null, 6000, 60)]);
    T.ok(/같이 다 찾았어요/.test(a) && /같이 다 찾았어요/.test(b), '⑧ 같이 끝 (' + a + ' / ' + b + ')');
    T.ok(await W.evaluate(() => /찾은 🐱/.test(document.getElementById('resBody').textContent)), '⑧ 누가 몇 마리');
    for (const y of [H, W]) { await y.evaluate(() => { if (window.ArenaUI && ArenaUI.net) ArenaUI.leave(); }); await y.close(); }
  }

  // ── ⑨ 카톡 안 브라우저: 냥도쿠 기록이 있으면 기본 브라우저로 안 넘김 (저장 칸이 브라우저마다 따로라 기록이 안 보이게 됨), 없으면 다른 게임처럼 넘김
  const kakao = async () => {
    const K = await T.ctx.newPage();
    await K.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone) KAKAOTALK 10.0' });
      window.__kk = []; const si = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'cozy.kakaoOut') window.__kk.push(document.currentScript ? document.currentScript.src : '?'); return si.call(this, k, v); };
    });
    await K.goto(T.base + 'nyang/?mock', { waitUntil: 'load', timeout: 30000 }).catch(() => {});
    const r = await K.evaluate(() => window.__kk).catch(() => null);
    await K.close();
    return r;
  };
  const Z = await T.open('nyang/');
  await Z.evaluate(() => localStorage.clear());
  const k0 = await kakao();
  T.ok(k0 && k0.length === 1 && /cozy.js/.test(k0[0]), '⑨ 기록 없으면 cozy.js 가 기본 브라우저로 넘김 (' + JSON.stringify(k0) + ')');
  await Z.evaluate(() => localStorage.setItem('nyang.stageStars', '{"1":3}'));
  const k1 = await kakao();
  T.ok(k1 && k1.length === 1 && k1[0] === '', '⑨ 기록 있으면 안 넘김 (' + JSON.stringify(k1) + ')');
  await Z.evaluate(() => localStorage.clear());
  await Z.close();

  T.ok(T.errors.length === 0, '콘솔·페이지 오류 없음 (' + T.errors.slice(0, 4).join(' | ') + ')');
}, 'nyang ui');

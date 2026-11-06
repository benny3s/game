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

  // ── ⑩ 📅 오늘의 퍼즐 (11-06 베니 님 "와이프가 단골이니까 맞춰서 · 벤치마킹": LinkedIn Queens · NYT 처럼 하루 한 판, 가족끼리 시간 겨루기)
  {
    const D = await T.open('nyang/');
    await U.waitFor(D, A.ready);
    await D.evaluate(() => { for (const k of ['nyang.day', 'nyang.dayTry']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await D.reload({ waitUntil: 'load' }); await U.waitFor(D, A.ready);
    await U.waitFor(D, () => document.querySelectorAll('#soloMode .btn').length === 4, null, 3000);
    const seg = await D.evaluate(() => [...document.querySelectorAll('#soloMode .btn')].map(b => ({ t: b.textContent.trim(), dot: b.classList.contains('dot') })));
    T.ok(seg[0] && /📅 오늘/.test(seg[0].t) && seg[0].dot, '⑩ 맨 앞 📅 오늘 · 안 풀었으면 점 (' + JSON.stringify(seg) + ')');
    const fit = await D.evaluate(() => { const s = document.getElementById('soloMode'); return [...s.children].every(b => b.scrollWidth <= b.clientWidth + 1) && s.scrollWidth <= s.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; });
    T.ok(fit, '⑩ 단추 넷이 폰 폭에 들어감');
    await D.evaluate(() => document.querySelector('#soloMode [data-v="day"]').click());
    const card = await D.evaluate(() => ({ box: !document.getElementById('dayBox').hidden, tiers: document.getElementById('tiers').hidden, stage: document.getElementById('stageBox').hidden, txt: document.getElementById('dayBox').textContent, d: __ny.dailyInfo() }));
    T.ok(card.box && card.tiers && card.stage && /오늘의 퍼즐/.test(card.txt) && card.txt.includes('일월화수목금토'[card.d.wd] + '요일'), '⑩ 오늘 카드 (요일 · 난이도): ' + card.txt.replace(/\s+/g, ' ').slice(0, 70));
    const tiers = await D.evaluate(() => ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map(k => __ny.dailyInfo(k).tier));
    T.ok(JSON.stringify(tiers) === JSON.stringify(['easy', 'easy', 'normal', 'normal', 'hard', 'hard', 'master']), '⑩ 월·화 초급 → 수·목 중급 → 금·토 고급 → 일 고수 (' + tiers + ')');
    const diff = await D.evaluate(() => { const a = __ny.dailyInfo('2026-11-06'), b = __ny.dailyInfo('2026-11-13'), c = __ny.dailyInfo('2026-11-06'); return [a.idx === c.idx && a.vs === c.vs, a.idx !== b.idx || a.vs !== b.vs]; });
    T.ok(diff[0] && diff[1], '⑩ 같은 날 = 같은 판, 다른 날 = 다른 판');
    await D.click('#startBtn');
    await U.waitFor(D, () => window.__ny.G && !document.getElementById('play').hidden);
    const same = await D.evaluate(() => { const d = __ny.dailyInfo(), p = __ny.NY.variant(window.__nyBank[d.tier][d.idx], d.vs); return JSON.stringify(__ny.G.ans) === JSON.stringify(__ny.NY.decode(p).ans) && /오늘의 퍼즐/.test(document.getElementById('stLabel').textContent); });
    T.ok(same, '⑩ 시작하면 오늘 판 (누구나 같은 모양) · 위 줄 📅 오늘의 퍼즐');
    await solve(D);
    T.ok(!!(await U.waitFor(D, () => /오늘의 퍼즐 성공/.test(document.getElementById('resTitle').textContent), null, 4000)), '⑩ 다 풀면 "오늘의 퍼즐 성공!"');
    const rec = await D.evaluate(() => JSON.parse(localStorage.getItem('nyang.day') || '{}')[__ny.kstDay()]);
    T.ok(rec && rec.s > 0 && rec.m === 0 && rec.k === 1, '⑩ 오늘 기록이 남음 ' + JSON.stringify(rec));
    await D.evaluate(() => __qa.clickText(/^닫기$/));
    const after = await D.evaluate(() => ({ txt: document.getElementById('dayBox').textContent, dot: document.querySelector('#soloMode [data-v="day"]').classList.contains('dot') }));
    T.ok(/✅ 오늘/.test(after.txt) && !after.dot && /🔥 1일/.test(after.txt), '⑩ 카드에 ✅ 오늘 기록 · 🔥 1일 · 점 사라짐: ' + after.txt.replace(/\s+/g, ' ').slice(0, 80));
    // 연속: 어제 · 그제도 풀었으면 3일 (나흘 전은 끊겨서 안 셈)
    await D.evaluate(() => { const k = __ny.kstDay(), sh = (key, d) => new Date(Date.parse(key + 'T00:00:00Z') + d * 864e5).toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem('nyang.day')); o[sh(k, -1)] = { s: 50, m: 0, h: 0, k: 1 }; o[sh(k, -2)] = { s: 60, m: 1, h: 0, k: 1 }; o[sh(k, -4)] = { s: 70, m: 0, h: 0, k: 1 }; localStorage.setItem('nyang.day', JSON.stringify(o)); document.querySelector('#soloMode [data-v="day"]').click(); });
    T.ok(await D.evaluate(() => /🔥 3일 연속/.test(document.getElementById('dayBox').textContent)), '⑩ 어제 · 그제도 풀었으면 🔥 3일 (나흘 전은 끊김)');
    // 가족 오늘 기록: 같은 판이라 시간으로 줄 세움 (힌트 한 번 = +10초)
    const fam = await D.evaluate(() => {
      const k = __ny.kstDay();
      __ny.setRk({ rec: { pA: { day: { [k]: { s: 83, m: 0, h: 0 } } }, pB: { day: { [k]: { s: 70, m: 0, h: 2 } } }, pC: { day: { '2026-01-01': { s: 9 } } } }, names: { pA: '지밍비', pB: '베니', pC: '훈' } });
      return [...document.querySelectorAll('#dayBox .dc-board li')].map(li => li.textContent.replace(/\s+/g, ' ').trim());
    });
    T.ok(fam.length === 3 && /지밍비/.test(fam.find(x => /🥈|🥇|🥉/.test(x) && /지밍비/.test(x)) || '') && fam.findIndex(x => /지밍비/.test(x)) < fam.findIndex(x => /베니/.test(x)) && !fam.some(x => /훈/.test(x)), '⑩ 가족 오늘 기록: 시간 + 힌트 벌점 순, 오늘 안 푼 사람은 빠짐 (' + fam.join(' / ') + ')');
    // 다시 풀어도 오늘 기록은 그대로
    await D.evaluate(() => __ny.setRk(null));
    await D.click('#startBtn'); await U.waitFor(D, () => window.__ny.G && !window.__ny.G.over && !document.getElementById('play').hidden);
    await solve(D);
    T.ok(!!(await U.waitFor(D, () => /다시 풀었어요/.test(document.getElementById('resTitle').textContent), null, 4000)), '⑩ 두 번째는 "다시 풀었어요"');
    const rec2 = await D.evaluate(() => JSON.parse(localStorage.getItem('nyang.day'))[__ny.kstDay()]);
    T.ok(rec2 && rec2.s === rec.s, '⑩ 오늘 기록은 처음 성공한 그대로 (' + (rec2 && rec2.s) + ' = ' + rec.s + ')');
    await D.evaluate(() => __qa.clickText(/^닫기$/));
    // ⏱ 내 기준선 (벤치마킹 1순위: 판마다 '평소보다 몇 초' · 오늘 몇 판째) — 평균은 3판부터
    const tierNow = await D.evaluate(() => __ny.dailyInfo().tier);
    await D.evaluate(t => { localStorage.setItem('nyang.avg', JSON.stringify({ [t]: [500, 500, 500] })); localStorage.setItem('nyang.today', JSON.stringify({ [__ny.kstDay()]: 7 })); document.getElementById('resBody').innerHTML = ''; }, tierNow);
    await D.click('#startBtn'); await U.waitFor(D, () => window.__ny.G && !window.__ny.G.over && !document.getElementById('play').hidden);
    await solve(D);
    const bl = await U.waitFor(D, () => { const e = document.querySelector('#resBody .baseln'); return e && e.textContent; }, null, 4000);
    T.ok(bl && /평소\(.+평균 8:20\.0\)보다 [\d.]+초 빨라요/.test(bl) && /오늘 8판째/.test(bl), '⑩ 결과에 "평소보다 몇 초 빨라요 · 오늘 몇 판째": ' + bl);
    await D.evaluate(() => __qa.clickText(/^닫기$/));
    await D.evaluate(() => { for (const k of ['nyang.day', 'nyang.dayTry', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await D.close();
  }

  // ── ⑪ 🌗 치즈냥·까망냥 반반 (11-06 베니 님 '다 진행' — 벤치마킹 1순위 새 퍼즐: LinkedIn Tango 같은 규칙)
  {
    const B = await T.open('nyang/');
    await U.waitFor(B, A.ready);
    await B.evaluate(() => { for (const k of ['nyang.bday', 'nyang.bdayTry', 'nyang.bbBest']) localStorage.removeItem(k); localStorage.setItem('nyang.kind', '"q"'); document.querySelector('#soloMode [data-v="one"]').click(); });
    const k0 = await B.evaluate(() => ({ seg: [...document.querySelectorAll('#kindSeg .btn')].map(b => b.textContent.trim()), vis: !document.getElementById('kindSeg').hidden }));
    T.ok(k0.vis && k0.seg.length >= 2 && /냥도쿠/.test(k0.seg[0]) && /반반/.test(k0.seg[1]), '⑪ 한 판: 🐱 냥도쿠 · 🌗 반반 고르기 (' + k0.seg.join(' · ') + ')');
    await B.evaluate(() => document.querySelector('#kindSeg [data-v="b"]').click());
    const k1 = await B.evaluate(() => ({ desc: [...document.querySelectorAll('#tiers .tier span:not(.em)')].map(s => s.textContent).join(' '), hb: !document.getElementById('howtoB').hidden, hq: document.getElementById('howto').hidden, fit: document.documentElement.scrollWidth <= innerWidth }));
    T.ok(/6×6/.test(k1.desc) && /8×8/.test(k1.desc) && k1.hb && k1.hq && k1.fit, '⑪ 반반 고르면 난이도 글이 6×6·8×8, 반반 하는 법 · 폰 폭 그대로');
    await B.evaluate(() => document.querySelector('#tiers .tier[data-t="normal"]').click());
    await B.click('#startBtn');
    T.ok(!!(await U.waitFor(B, () => window.NYBUI && NYBUI.pz && !document.getElementById('bplay').hidden && document.getElementById('home').hidden, null, 4000)), '⑪ 시작하면 반반 판 (첫 화면은 숨김)');
    const b0 = await B.evaluate(() => { const P = NYBUI.pz; return { N: P.N, cells: document.querySelectorAll('#bboard .bc').length, signs: document.querySelectorAll('#bboard .bs').length, want: NYB.signs(P).length, given: document.querySelectorAll('#bboard .bc.g').length, gv: [...P.given].filter(v => v >= 0).length }; });
    T.ok(b0.N === 6 && b0.cells === 36 && b0.signs === b0.want && b0.given === b0.gv && b0.gv > 0, '⑪ 중급 6×6 판: 칸 36 · 표시 · 처음 칸 ' + JSON.stringify(b0));
    // 누르기: 빈칸 → 🐈 → 🐈‍⬛ → 빈칸 (처음 칸은 안 바뀜)
    const cyc = await B.evaluate(() => { const P = NYBUI.pz, k = [...P.given].findIndex(v => v < 0), g = [...P.given].findIndex(v => v >= 0), el = i => document.querySelector(`#bboard .bc[data-k="${i}"]`), out = []; for (let i = 0; i < 3; i++) { el(k).click(); out.push(el(k).textContent); } const before = el(g).textContent; el(g).click(); return { out, fixed: el(g).textContent === before }; });
    T.ok(JSON.stringify(cyc.out) === JSON.stringify(['🐈', '🐈‍⬛', '']) && cyc.fixed, '⑪ 누를 때마다 🐈 → 🐈‍⬛ → 빈칸 · 처음 칸은 그대로 ' + JSON.stringify(cyc));
    // 셋 연속이면 빨개짐 (가로로 비어 있는 세 칸이 있으면)
    const three = await B.evaluate(() => { const P = NYBUI.pz, N = P.N; for (let r = 0; r < N; r++) for (let c = 0; c + 2 < N; c++) { const ks = [0, 1, 2].map(i => r * N + c + i); if (ks.every(k => P.given[k] < 0)) { ks.forEach(k => document.querySelector(`#bboard .bc[data-k="${k}"]`).click()); const bad = ks.every(k => document.querySelector(`#bboard .bc[data-k="${k}"]`).classList.contains('bad')); ks.forEach(k => { const e = document.querySelector(`#bboard .bc[data-k="${k}"]`); e.click(); e.click(); }); return bad ? 'bad' : 'nobad'; } } return 'none'; });
    T.ok(three === 'bad' || three === 'none', '⑪ 같은 고양이 셋 연속 → 빨간 칸 (' + three + ')');
    // 힌트: 까닭 글 + 적용하면 정답과 같은 칸
    await B.click('#bHintBtn');
    const h = await B.evaluate(() => ({ txt: document.getElementById('bHintText').textContent, vis: !document.getElementById('bHint').hidden }));
    T.ok(h.vis && /💡/.test(h.txt) && h.txt.length > 8, '⑪ 💡 힌트 까닭: ' + h.txt.slice(0, 60));
    await B.click('#bHintApply');
    // 다 채우면 성공 (🧽 처음부터 → 정답대로 누르기)
    const solveBB = p => p.evaluate(() => { document.getElementById('bClear').click(); const P = NYBUI.pz; for (let k = 0; k < P.N * P.N; k++) if (P.given[k] < 0) { const e = document.querySelector(`#bboard .bc[data-k="${k}"]`); for (let i = 0; i <= P.sol[k]; i++) e.click(); } });
    await solveBB(B);
    T.ok(!!(await U.waitFor(B, () => /다 맞혔어요/.test(document.getElementById('resTitle').textContent) && !document.getElementById('resBox').hidden, null, 5000)), '⑪ 다 맞히면 "다 맞혔어요!"');
    const r1 = await B.evaluate(() => ({ body: document.getElementById('resBody').textContent, stars: document.querySelectorAll('#resBody .stars span').length }));
    T.ok(r1.stars === 3 && /힌트 1번/.test(r1.body) && /6×6/.test(r1.body), '⑪ 결과: 별 · 힌트 수 · 판 크기: ' + r1.body.replace(/\s+/g, ' ').slice(0, 80));
    await B.evaluate(() => __qa.clickText(/난이도 고르기/));
    T.ok(await B.evaluate(() => !document.getElementById('home').hidden && document.getElementById('bplay').hidden), '⑪ 난이도 고르기 → 첫 화면');
    // 📅 오늘 아래 '오늘의 반반': 모두 같은 판 · 처음 성공만 기록
    await B.evaluate(() => document.querySelector('#soloMode [data-v="day"]').click());
    T.ok(await B.evaluate(() => !!document.getElementById('dayBB') && /오늘의 반반/.test(document.getElementById('dayBox').textContent)), '⑪ 📅 오늘에 🌗 오늘의 반반 카드');
    await B.click('#dayBB');
    await U.waitFor(B, () => window.NYBUI && !document.getElementById('bplay').hidden, null, 4000);
    const dd = await B.evaluate(() => ({ seed: NYBUI.pz.seed, want: __ny.dailyInfo().bseed, lbl: document.getElementById('bLabel').textContent }));
    T.ok(dd.seed === dd.want && /오늘의 반반/.test(dd.lbl), '⑪ 오늘의 반반 = 날짜 씨앗 (누구나 같은 판)');
    await solveBB(B);
    T.ok(!!(await U.waitFor(B, () => /오늘의 반반 성공/.test(document.getElementById('resTitle').textContent), null, 5000)), '⑪ "오늘의 반반 성공!"');
    const bd = await B.evaluate(() => JSON.parse(localStorage.getItem('nyang.bday') || '{}')[__ny.kstDay()]);
    T.ok(bd && typeof bd.s === 'number' && bd.s >= 0 && bd.h === 0 && bd.k === 1, '⑪ 오늘의 반반 기록 (시험은 순식간에 풀어 0초일 수 있음) ' + JSON.stringify(bd));
    await B.evaluate(() => __qa.clickText(/^닫기$/));
    T.ok(await B.evaluate(() => /✅/.test((document.querySelector('.bbcard') || {}).textContent || '')), '⑪ 카드에 ✅ 오늘 기록');
    await B.evaluate(() => { for (const k of ['nyang.bday', 'nyang.bdayTry', 'nyang.bbBest', 'nyang.kind', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await B.close();
  }

  // ── ⑫ 11-06 '와이프가 좋아하는 것' → 👨‍👩 이번 주 가족 목표 (같이 채움) · 📅 이번 달 달력 (지난 판으로 채우기 · 한 달 다 채우면 🏆)
  {
    const F = await T.open('nyang/');
    await U.waitFor(F, A.ready);
    await F.evaluate(() => { localStorage.setItem('game.me', JSON.stringify({ pid: 'pA', name: '지밍비' })); for (const k of ['nyang.day', 'nyang.dayArc', 'nyang.monthTrophy', 'nyang.famDone']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"day"'); });
    await F.reload({ waitUntil: 'load' }); await U.waitFor(F, A.ready);
    const fam = await F.evaluate(async () => {
      __ny.setRk({ rec: {}, names: { pA: '지밍비', pB: '베니' } });
      await __ny.setFam({ cur: { pA: 120, pB: 30 }, last: 200, week: '2026-11-02' });
      const e = document.querySelector('#soloProg .pc-fam'); return e ? e.textContent.replace(/\s+/g, ' ') : '';
    });
    T.ok(/이번 주 가족 목표/.test(fam) && /같이 150\/220판/.test(fam) && /지밍비 120 · 베니 30/.test(fam), '⑫ 가족 목표: 지난주 200판 × 1.1 = 220 · 같이 150 · 사람별: ' + fam);
    const fam2 = await F.evaluate(async () => { await __ny.setFam({ cur: { pA: 200, pB: 40 }, last: 200, week: '2026-11-02' }); const e = document.querySelector('#soloProg .pc-fam'); return { t: e ? e.textContent : '', done: JSON.parse(localStorage.getItem('nyang.famDone') || '{}') }; });
    T.ok(/달성/.test(fam2.t) && fam2.done['2026-11-02'] === 1, '⑫ 넘기면 🎉 달성 · 그 주 도장');
    // 📅 달력: 오늘 · 푼 날 🐱 · 미래는 못 누름
    await F.evaluate(() => { const k = __ny.kstDay(); localStorage.setItem('nyang.day', JSON.stringify({ [k]: { s: 60, m: 0, h: 0, k: 1 } })); document.querySelector('#soloMode [data-v="day"]').click(); });
    T.ok(await F.evaluate(() => /달력/.test((document.getElementById('dayCal') || {}).textContent || '')), '⑫ 오늘 카드에 📅 달력 단추');
    await F.click('#dayCal');
    const cal = await F.evaluate(() => { const ds = [...document.querySelectorAll('.cl-d')], k = __ny.kstDay(), last = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate(); return { n: ds.length, last, today: ds.filter(b => b.classList.contains('today')).length, on: ds.filter(b => b.classList.contains('on')).length, fut: ds.filter(b => b.disabled).length, futWant: last - +k.slice(8) }; });
    T.ok(cal.n === cal.last && cal.today === 1 && cal.on === 1 && cal.fut === cal.futWant, '⑫ 달력: 이번 달 날짜 모두 · 오늘 표시 · 푼 날 🐱 · 앞날은 못 누름 ' + JSON.stringify(cal));
    await F.evaluate(() => __qa.clickText(/^닫기$/));
    // 지난달을 하루만 빼고 채워 두고 → 달력에서 마지막 날 누르기 → 지난 판 → 다 풀면 🏆 10월 개근 (연속 일수엔 안 셈)
    await F.evaluate(() => { const o = JSON.parse(localStorage.getItem('nyang.day')); for (let i = 1; i <= 30; i++) o['2026-10-' + String(i).padStart(2, '0')] = { s: 50, m: 0, h: 0, k: 1 }; localStorage.setItem('nyang.day', JSON.stringify(o)); __ny.openCalendar('2026-10'); });
    T.ok(await F.evaluate(() => /30\/31일/.test((document.querySelector('.cl-nav') || {}).textContent || '')), '⑫ 지난달 달력 30/31일');
    await F.evaluate(() => document.querySelector('.cl-d[data-k="2026-10-31"]').click());
    T.ok(!!(await U.waitFor(F, () => window.__ny.G && !document.getElementById('play').hidden && /10\/31 퍼즐/.test(document.getElementById('stLabel').textContent), null, 4000)), '⑫ 지난 날을 누르면 그날 판 (위 줄 10/31 퍼즐)');
    const same = await F.evaluate(() => { const d = __ny.dailyInfo('2026-10-31'), p = __ny.NY.variant(window.__nyBank[d.tier][d.idx], d.vs); return JSON.stringify(__ny.G.ans) === JSON.stringify(__ny.NY.decode(p).ans); });
    T.ok(same, '⑫ 그날 오늘의 퍼즐과 같은 판');
    await solve(F);
    T.ok(!!(await U.waitFor(F, () => /10\/31 퍼즐 성공/.test(document.getElementById('resTitle').textContent), null, 4000)), '⑫ "10/31 퍼즐 성공!"');
    const tr = await F.evaluate(() => ({ body: document.getElementById('resBody').textContent, tr: JSON.parse(localStorage.getItem('nyang.monthTrophy') || '{}'), arc: JSON.parse(localStorage.getItem('nyang.dayArc') || '{}'), streak: __ny.streakOf(__ny.myDays()) }));
    T.ok(/10월 개근/.test(tr.body) && tr.tr['2026-10'] && tr.arc['2026-10-31'] && tr.streak === 1, '⑫ 🏆 10월 개근 · 지난 판은 달력에만 (연속 일수는 그대로 1) ' + JSON.stringify({ tr: !!tr.tr['2026-10'], arc: !!tr.arc['2026-10-31'], streak: tr.streak }));
    await F.evaluate(() => __qa.clickText(/^닫기$/));
    await F.evaluate(() => { for (const k of ['nyang.day', 'nyang.dayArc', 'nyang.monthTrophy', 'nyang.famDone', 'game.me', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await F.close();
  }

  // ── ⑬ 11-06 베니 님 '퍼즐 같은 거' → 🐾 냥산책 (LinkedIn Zip 같은 한붓그리기: 1 → 2 → … 순서대로 모든 칸 한 번씩, 끌어서 그림)
  {
    const Z = await T.open('nyang/');
    await U.waitFor(Z, A.ready);
    await Z.evaluate(() => { for (const k of ['nyang.zday', 'nyang.zdayTry', 'nyang.zzBest']) localStorage.removeItem(k); document.querySelector('#soloMode [data-v="one"]').click(); });
    const segs = await Z.evaluate(() => [...document.querySelectorAll('#kindSeg .btn')].map(b => b.textContent.trim()));
    T.ok(segs.length === 3 && /산책/.test(segs[2]), '⑬ 한 판 고르기에 🐾 산책 (' + segs.join(' · ') + ')');
    await Z.evaluate(() => document.querySelector('#kindSeg [data-v="z"]').click());
    const k1 = await Z.evaluate(() => ({ desc: [...document.querySelectorAll('#tiers .tier span:not(.em)')].map(s => s.textContent).join(' '), hz: !document.getElementById('howtoZ').hidden, fit: document.documentElement.scrollWidth <= innerWidth }));
    T.ok(/5×5/.test(k1.desc) && /7×7/.test(k1.desc) && k1.hz && k1.fit, '⑬ 산책 난이도 글 5×5 … 7×7 · 하는 법 · 폰 폭 그대로');
    await Z.evaluate(() => document.querySelector('#tiers .tier[data-t="easy"]').click());
    await Z.click('#startBtn');
    T.ok(!!(await U.waitFor(Z, () => window.NYZUI && NYZUI.pz && !document.getElementById('zplay').hidden && document.getElementById('home').hidden, null, 4000)), '⑬ 시작하면 산책 판');
    const z0 = await Z.evaluate(() => ({ N: NYZUI.pz.N, cells: document.querySelectorAll('#zboard .zc').length, nums: document.querySelectorAll('#zboard .zn').length, K: NYZUI.pz.K }));
    T.ok(z0.N === 5 && z0.cells === 25 && z0.nums === z0.K && z0.K >= 2, '⑬ 초급 5×5 · 번호 ' + z0.K + '개');
    // 진짜 마우스로 끌기: 1번에서 시작해 답 길을 따라 세 칸
    const center = k => Z.evaluate(k => { const r = document.querySelector(`#zboard .zc[data-k="${k}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, k);
    const drawPath = async (cells, release = true) => { let [x, y] = await center(cells[0]); await Z.mouse.move(x, y); await Z.mouse.down(); for (const k of cells.slice(1)) { [x, y] = await center(k); await Z.mouse.move(x, y, { steps: 3 }); } if (release) await Z.mouse.up(); };
    const sol = await Z.evaluate(() => NYZUI.pz.sol);
    await drawPath(sol.slice(0, 4), false);
    const p1 = await Z.evaluate(() => ({ len: NYZUI.path.length, head: (document.querySelector('#zboard .zc.head .zh') || {}).textContent }));
    T.ok(p1.len === 4 && p1.head === '🐈', '⑬ 끌면 길이 이어지고 머리에 🐈 (' + JSON.stringify(p1) + ')');
    { const [x, y] = await center(sol[2]); await Z.mouse.move(x, y, { steps: 3 }); await Z.mouse.up(); }
    T.ok(await Z.evaluate(() => NYZUI.path.length === 3), '⑬ 지나온 칸으로 되돌아가면 거기까지 지워짐');
    // 💡 힌트: 처음부터 지운 뒤 → '1번 칸에서 시작' → 적용하면 1번 칸
    await Z.click('#zClear'); await Z.click('#zHintBtn');
    const h = await Z.evaluate(() => document.getElementById('zHintText').textContent);
    await Z.click('#zHintApply');
    T.ok(/1번/.test(h) && (await Z.evaluate(() => NYZUI.path.length === 1 && NYZUI.path[0] === NYZUI.pz.sol[0])), '⑬ 💡 힌트: ' + h);
    // 끝까지 그리면 성공
    await Z.click('#zClear');
    await drawPath(sol);
    T.ok(!!(await U.waitFor(Z, () => /산책 끝/.test(document.getElementById('resTitle').textContent) && !document.getElementById('resBox').hidden, null, 5000)), '⑬ 모든 칸을 순서대로 지나면 "산책 끝!"');
    const r1 = await Z.evaluate(() => document.getElementById('resBody').textContent);
    T.ok(/5×5/.test(r1) && /힌트 1번/.test(r1), '⑬ 결과: 판 크기 · 힌트 수: ' + r1.replace(/\s+/g, ' ').slice(0, 70));
    await Z.evaluate(() => __qa.clickText(/난이도 고르기/));
    // 📅 오늘 아래 '오늘의 산책': 날짜 씨앗 · 처음 성공만 기록
    await Z.evaluate(() => document.querySelector('#soloMode [data-v="day"]').click());
    T.ok(await Z.evaluate(() => !!document.getElementById('dayZZ')), '⑬ 📅 오늘에 🐾 오늘의 산책 카드');
    await Z.click('#dayZZ');
    await U.waitFor(Z, () => window.NYZUI && !document.getElementById('zplay').hidden, null, 4000);
    const dz = await Z.evaluate(() => ({ seed: NYZUI.pz.seed, want: __ny.dailyInfo().zseed, sol: NYZUI.pz.sol }));
    T.ok(dz.seed === dz.want, '⑬ 오늘의 산책 = 날짜 씨앗 (누구나 같은 판)');
    await Z.evaluate(sol => { for (const k of sol) NYZUI.step(k, true); }, dz.sol);
    T.ok(!!(await U.waitFor(Z, () => /오늘의 산책 성공/.test(document.getElementById('resTitle').textContent), null, 5000)), '⑬ "오늘의 산책 성공!"');
    T.ok(await Z.evaluate(() => { const v = JSON.parse(localStorage.getItem('nyang.zday') || '{}')[__ny.kstDay()]; return !!v && typeof v.s === 'number'; }), '⑬ 오늘의 산책 기록');
    await Z.evaluate(() => __qa.clickText(/^닫기$/));
    await Z.evaluate(() => { for (const k of ['nyang.zday', 'nyang.zdayTry', 'nyang.zzBest', 'nyang.kind', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await Z.close();
  }

  // ── ⑭ 11-06 '게임 중간중간' → 🎁 단계 지도 5단계마다 보너스 판 (🌗 반반 · 🐾 산책 번갈아, 깬 단계만 열림, 진행은 안 막음)
  {
    const M = await T.open('nyang/');
    await U.waitFor(M, A.ready);
    await M.evaluate(() => { const o = {}; for (let k = 1; k <= 12; k++) o[k] = 3; localStorage.setItem('nyang.stageStars', JSON.stringify(o)); localStorage.removeItem('nyang.bonus'); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await M.reload({ waitUntil: 'load' }); await U.waitFor(M, A.ready);
    await U.waitFor(M, () => document.querySelectorAll('#stageBox .bonus').length > 0, null, 4000);
    const b0 = await M.evaluate(() => [...document.querySelectorAll('#stageBox .bonus')].map(b => ({ k: +b.dataset.bk, t: b.dataset.bt, lock: b.classList.contains('lock') })));
    const at = k => b0.find(x => x.k === k);
    T.ok(at(10) && at(10).t === 'z' && !at(10).lock && (!at(15) || at(15).lock), '⑭ 지도에 보너스: 10단계 🐾 열림 · 15단계 잠김 ' + JSON.stringify(b0));
    const fit = await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#stageBox .stage-row')].every(r => r.scrollWidth <= r.clientWidth + 2));
    T.ok(fit, '⑭ 보너스 단추가 단계 줄에 들어감 (가로 넘침 없음)');
    if (at(15)) { await M.evaluate(() => document.querySelector('#stageBox .bonus[data-bk="15"]').click()); T.ok(await M.evaluate(() => !document.getElementById('home').hidden), '⑭ 잠긴 보너스는 안 열림'); }
    await M.evaluate(() => document.querySelector('#stageBox .bonus[data-bk="10"]').click());
    T.ok(!!(await U.waitFor(M, () => window.NYZUI && !document.getElementById('zplay').hidden && /10단계 보너스/.test(document.getElementById('zLabel').textContent), null, 4000)), '⑭ 10단계 보너스 = 🐾 산책 판');
    const seed1 = await M.evaluate(() => NYZUI.pz.seed);
    await M.evaluate(() => { for (const k of NYZUI.pz.sol) NYZUI.step(k, true); });
    T.ok(!!(await U.waitFor(M, () => /10단계 보너스 성공/.test(document.getElementById('resTitle').textContent), null, 5000)), '⑭ "🎁 10단계 보너스 성공!"');
    const st = await M.evaluate(() => JSON.parse(localStorage.getItem('nyang.bonus') || '{}').z10);
    T.ok(st >= 1, '⑭ 보너스 별 저장 ' + st);
    await M.evaluate(() => __qa.clickText(/다시/));
    T.ok(!!(await U.waitFor(M, s => window.NYZUI && !document.getElementById('zplay').hidden && NYZUI.pz.seed === s, seed1, 4000)), '⑭ 다시 하면 같은 판 (단계마다 정해진 판)');
    await M.evaluate(() => { NYZUI.close(); document.getElementById('resBox').hidden = true; });
    await M.evaluate(() => { for (const k of ['nyang.stageStars', 'nyang.bonus', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await M.close();
  }

  T.ok(T.errors.length === 0, '콘솔·페이지 오류 없음 (' + T.errors.slice(0, 4).join(' | ') + ')');
}, 'nyang ui');

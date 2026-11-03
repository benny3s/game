// 냥도쿠 화면 시험 (브라우저, 소리 없음): node nyang/test/ui.js
//   11-04 베니 님 (와이프 아이폰): ① 칸을 두 번 누르다 화면이 확대됨 — 다른 게임에 있는 아이폰 확대 막이가 냥도쿠만 빠져 있었음
//                                  ② 허용된 기기인데 방을 못 만듦 — 허용 안 된 기기엔 PERMISSION_DENIED 대신 허용 창, 허용되면 바로 방 만들기
//   진짜 아이폰의 확대 동작은 여기서 못 일으킴 → 막이가 걸려 있는지(값·이벤트)와, 막아도 판·단추가 그대로 눌리는지를 봄
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/nyang');

U.main(async T => {
  const p = await T.open('nyang/');
  await U.waitFor(p, A.ready);

  // ── ① 확대 막이: 화면 값
  const vp = await p.evaluate(() => document.querySelector('meta[name=viewport]').content);
  T.ok(/maximum-scale=1/.test(vp) && /user-scalable=no/.test(vp), '① viewport 확대 막음 (' + vp + ')');
  const ta = await p.evaluate(() => ['body', '#tabSolo', '#mkRoom'].map(q => getComputedStyle(document.querySelector(q)).touchAction));
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

  // ── ① 막아도 판이 그대로: 진짜 터치로 한 번 = ✕, 두 번 = 🐱 (판은 pointerdown 으로 받음)
  await p.evaluate(() => {
    document.querySelectorAll('.overlay button').forEach(b => { if (/알겠/.test(b.textContent)) b.click(); });
    const $ = id => document.getElementById(id);
    [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
    $('tiers').querySelector('.t-easy').click();
  });
  T.ok(!!(await U.waitFor(p, () => { const G = window.__ny.G; return G && !document.getElementById('play').hidden && document.querySelector('#board .c'); })), '① 판이 열림');
  const boardTA = await p.evaluate(() => getComputedStyle(document.getElementById('board')).touchAction);
  T.ok(boardTA === 'none', '① 판은 끌어서 ✕ 칠하기라 touch-action none 그대로 (' + boardTA + ')');
  const endDef = await p.evaluate(() => {
    const c = document.querySelector('#board .c'), e = new TouchEvent('touchend', { bubbles: true, cancelable: true, changedTouches: [new Touch({ identifier: 1, target: c, clientX: 5, clientY: 5 })] });
    c.dispatchEvent(e); return e.defaultPrevented;
  });
  T.ok(endDef, '① 판에서 손가락 뗄 때 막음 (아이폰은 touch-action none 만으론 안 따를 때가 있음)');
  const pos = await p.evaluate(() => {
    const G = window.__ny.G; let k = -1, x = -1;
    for (let i = 0; i < G.n * G.n; i++) { if (G.isAns(i)) { if (k < 0) k = i; } else if (x < 0) x = i; }
    const at = i => { const r = document.getElementById('board').children[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    return { k, x, ans: at(k), wrong: at(x) };
  });
  await p.touchscreen.tap(pos.wrong.x, pos.wrong.y);
  T.ok(!!(await U.waitFor(p, x => window.__ny.G.xs.has(x), pos.x, 2000, 40)), '① 진짜 터치 한 번 = ✕');
  await T.sleep(500);
  await p.touchscreen.tap(pos.ans.x, pos.ans.y); await p.touchscreen.tap(pos.ans.x, pos.ans.y);
  T.ok(!!(await U.waitFor(p, k => window.__ny.G.cats.has(k), pos.k, 2000, 40)), '① 진짜 터치 두 번 = 🐱');
  // 판 밖 단추도 터치로 그대로 눌림
  const auto0 = await p.evaluate(() => document.getElementById('autoX').getAttribute('aria-pressed'));
  const ax = await p.evaluate(() => { const r = document.getElementById('autoX').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.touchscreen.tap(ax.x, ax.y);
  T.ok(!!(await U.waitFor(p, v => document.getElementById('autoX').getAttribute('aria-pressed') !== v, auto0, 2000, 40)), '① 판 밖 단추는 터치로 그대로 눌림');
  await p.close();

  // ── ② 방 만들기 문: 허용 안 된 기기 → 허용 창 (거절하면 서버에 안 감) · 허용 → 바로 방 · 창에서 허용되면 이어서 방
  const q = await T.open('nyang/');
  await U.waitFor(q, A.ready);
  await U.waitFor(q, () => !!(window.Gate && window.GME));
  await q.evaluate(() => { for (const k of ['game.me', 'game.me.test']) localStorage.setItem(k, JSON.stringify({ name: '시험' })); });
  await q.reload({ waitUntil: 'load' });
  await U.waitFor(q, A.ready);
  await U.waitFor(q, () => !!(window.Gate && window.GME && GME.me && GME.me.name));
  const press = allow => q.evaluate(async allow => {
    window.__asked = 0; window.__hosted = 0;
    NET.init = async () => {};
    NET.host = async () => { window.__hosted++; throw new Error('시험: 서버 안 감'); };
    Gate.requestHost = async () => { window.__asked++; return allow; };
    document.getElementById('tabVs').click();
    document.getElementById('mkRoom').click();
    await new Promise(r => setTimeout(r, 200));
    return { asked: window.__asked, hosted: window.__hosted };
  }, allow);
  await q.evaluate(() => { Gate.state.canHost = false; });
  const no = await press(false);
  T.ok(no.asked === 1, '② 허용 안 된 기기: 방 만들기 → 허용 창 (' + no.asked + ')');
  T.ok(no.hosted === 0, '② 창을 닫으면 서버에 안 감 (' + no.hosted + ')');
  const yes = await press(true);
  T.ok(yes.asked === 1 && yes.hosted === 1, '② 창에서 허용되면 이어서 방을 만듦 (' + yes.asked + ',' + yes.hosted + ')');
  await q.evaluate(() => { Gate.state.canHost = true; });
  const ok = await press(false);
  T.ok(ok.asked === 0 && ok.hosted === 1, '② 허용된 기기: 창 없이 바로 방을 만듦 (' + ok.asked + ',' + ok.hosted + ')');
  await q.close();
}, 'nyang ui');

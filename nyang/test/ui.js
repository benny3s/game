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
  // 이 판(①)은 손가락 동작만 봄 → 고양이를 놓을 때 저절로 쳐지는 ✕ (11-13 부터 늘 켬) 는 이 판에서만 끔. 저절로 치는 것은 ㉓ 에서 따로 봄
  await p.evaluate(() => { window.__ny.G.autoX = false; });
  // 첫 판은 판 크기 맞춤이 한 박자 늦을 때가 있음 (300px → 화면 폭) → 판 자리가 멈춘 뒤에 좌표를 잼 (11-12 가끔 실패하던 까닭)
  { let last = '', same = 0; for (let i = 0; i < 40 && same < 4; i++) { const r = await p.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); return [b.left, b.top, b.width].map(Math.round).join(); }); same = r === last ? same + 1 : 0; last = r; await T.sleep(100); } }
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
  // ── 11-08 지민 님 아이폰 '옆 칸이 눌림 · 두 번 안 눌렀는데 🐱' (옛 코드로 셋 다 실패 확인)
  const pe = (type, o) => p.evaluate(([type, o]) => {
    const t = type === 'pointerdown' ? document.elementFromPoint(o.x, o.y) : window;
    (t || window).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: o.x, clientY: o.y, pointerType: 'touch', pointerId: o.id || 7, isPrimary: o.prim !== false }));
  }, [type, o]);
  const two = await p.evaluate(() => {   // 옆으로 붙은 빈칸 두 개 A·B + 떨어진 빈칸 C·D (답 아님)
    const G = window.__ny.G, n = G.n, free = k => !G.isAns(k) && !G.cats.has(k) && !G.bad.has(k) && !G.xs.has(k);
    const rc = k => { const r = document.getElementById('board').children[k].getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; };
    const pairs = []; for (let k = 0; k < n * n && pairs.length < 2; k++) if (k % n < n - 1 && free(k) && free(k + 1) && !pairs.some(a => Math.abs(a - k) < 2)) pairs.push(k);
    const [a, a2] = pairs, far = []; for (let k = n * n - 1; k >= 0 && far.length < 2; k--) if (free(k) && [a, a2].every(q => Math.abs(k - q) > n + 1)) far.push(k);
    return { a, b: a + 1, a2, b2: a2 + 1, c: far[0], d: far[1], A: rc(a), B: rc(a + 1), A2: rc(a2), B2: rc(a2 + 1), C: rc(far[0]), D: rc(far[1]), m0: G.mistakes };
  });
  const at = (R, fx, fy = .5) => ({ x: R.l + R.w * fx, y: R.t + R.h * fy });
  const st = () => p.evaluate(o => { const G = window.__ny.G; return { ax: G.xs.has(o.a), bx: G.xs.has(o.b), a2x: G.xs.has(o.a2), b2x: G.xs.has(o.b2), cx: G.xs.has(o.c), dx: G.xs.has(o.d), acat: G.cats.has(o.a), m: G.mistakes }; }, two);
  await T.sleep(450);
  await pe('pointerdown', at(two.A, .5)); await pe('pointerup', at(two.A, .5));
  await pe('pointerdown', at(two.A, .97)); await pe('pointerup', at(two.A, .97));       // 옆 칸 B 를 누르려다 A 가장자리에 닿음 (0.4초 안)
  const s1 = await st();
  T.ok(!s1.acat && s1.m === two.m0, '① 0.4초 안이라도 같은 칸 반대쪽 가장자리 두 번째 톡은 🐱 아님 (' + JSON.stringify(s1) + ')');
  await T.sleep(450);
  await pe('pointerdown', at(two.A2, .85)); await pe('pointermove', at(two.A2, .95)); await pe('pointermove', at(two.B2, .1)); await pe('pointerup', at(two.B2, .1));   // 톡 하다 손가락이 살짝 밀림 (앞 시험과 다른 칸)
  const s2 = await st();
  T.ok(s2.a2x && !s2.b2x, '① 톡 하다 옆 칸 가장자리로 살짝 밀려도 옆 칸은 그대로 (' + JSON.stringify(s2) + ')');
  await T.sleep(450);
  await pe('pointerdown', at(two.A2, .5));
  await pe('pointerdown', { ...at(two.C, .5), id: 8, prim: false }); await pe('pointermove', { ...at(two.D, .5), id: 8, prim: false });   // 판을 누르는 동안 다른 손가락(손바닥)
  await pe('pointerup', { ...at(two.D, .5), id: 8, prim: false }); await pe('pointerup', at(two.A2, .5));
  const s3 = await st();
  T.ok(!s3.cx && !s3.dx && !s3.a2x, '① 누르는 동안 다른 손가락이 닿은 칸은 그대로 (' + JSON.stringify(s3) + ')');
  // ── 11-12 베니 님 '✕ 치려고 쭉 끌면 종종 끊겨서 표시됨' (옛 코드로 ⓐⓑⓒ 실패 확인)
  await T.sleep(450);
  {
    const row = await p.evaluate(() => {   // 옆으로 빈칸 4개가 이어지고 바로 아랫줄 4칸도 빈 곳
      const G = window.__ny.G, n = G.n, free = k => !G.cats.has(k) && !G.bad.has(k) && !G.xs.has(k);
      const rc = k => { const r = document.getElementById('board').children[k].getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; };
      for (let r = 0; r < n - 1; r++) for (let c = 0; c + 3 < n; c++) { const ks = [0, 1, 2, 3].map(i => r * n + c + i); if (ks.every(free) && ks.every(k => free(k + n))) return { ks, below: ks.map(k => k + n), R: ks.map(rc), B: ks.map(k => rc(k + n)) }; }
      return null;
    });
    T.ok(!!row, '① 끌기 시험용 빈 줄 찾음');
    if (row) {
      const xs = () => p.evaluate(o => { const G = window.__ny.G; return { up: o.ks.map(k => +G.xs.has(k)).join(''), dn: o.below.map(k => +G.xs.has(k)).join('') }; }, row);
      const wipe = async () => { await p.evaluate(o => { const G = window.__ny.G; for (const k of [...o.ks, ...o.below]) G.xs.delete(k); }, row); await T.sleep(450); };
      // ⓐ 빠르게 끌기: 점이 첫 칸과 끝 칸에만 찍혀도 사이 칸이 빠지지 않음
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[3], .5)); await pe('pointerup', at(row.R[3], .5));
      const d1 = await xs();
      T.ok(d1.up === '1111' && d1.dn === '0000', '① 빠르게 끌어도 사이 칸이 빠지지 않음 (' + JSON.stringify(d1) + ')');
      await wipe();
      // ⓑ 줄 아래쪽 가장자리 · 틈 · 아랫줄 위쪽 가장자리를 스치며 끌어도 끌던 줄에 그대로
      await pe('pointerdown', at(row.R[0], .5));
      for (const [i, fx, fy] of [[0, .8, .7], [1, .5, .95], [2, .3, 1.3], [2, .7, 1.3], [3, .5, .9]]) await pe('pointermove', at(row.R[i], fx, fy));
      await pe('pointerup', at(row.R[3], .5, .9));
      const d2 = await xs();
      T.ok(d2.up === '1111' && d2.dn === '0000', '① 줄 가장자리로 흘러가며 끌어도 그 줄에 이어서 ✕ (' + JSON.stringify(d2) + ')');
      await wipe();
      // ⓒ 끌다가 손가락이 잠깐 떨어졌다 다시 닿아도 이어서 ✕ (지워지거나 지우기로 뒤집히지 않음)
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[1], .5)); await pe('pointerup', at(row.R[1], .5));
      await pe('pointerdown', at(row.R[1], .6)); await pe('pointermove', at(row.R[2], .5)); await pe('pointermove', at(row.R[3], .5)); await pe('pointerup', at(row.R[3], .5));
      const d3 = await xs();
      T.ok(d3.up === '1111' && d3.dn === '0000', '① 끌다 손가락이 잠깐 떨어져도 이어서 ✕ (' + JSON.stringify(d3) + ')');
      await wipe();
      // ⓓ 아랫줄 가운데까지 내려가면 그 줄로 넘어감 (꺾어 끌기는 그대로)
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[1], .5)); await pe('pointermove', at(row.B[1], .5)); await pe('pointermove', at(row.B[2], .5)); await pe('pointerup', at(row.B[2], .5));
      const d4 = await xs();
      T.ok(d4.up === '1100' && d4.dn === '0110', '① 꺾어서 아랫줄로 끌면 그 줄에 ✕ (' + JSON.stringify(d4) + ')');
      await wipe();
      // ⓕ 가로로 끌다 대각선으로 꺾어 내려가도 안 지나간 칸(꺾은 곳 옆 칸)은 그대로 (교차 검토에서 찾음)
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[1], .5));
      for (const f of [.25, .5, .75]) await pe('pointermove', { x: row.R[1].l + row.R[1].w * .5 + (row.B[2].l - row.R[1].l) * f, y: row.R[1].t + row.R[1].h * .5 + (row.B[2].t - row.R[1].t) * f });
      await pe('pointermove', at(row.B[2], .5)); await pe('pointerup', at(row.B[2], .5));
      const d6 = await xs();
      T.ok(d6.up === '1100' && d6.dn === '0010', '① 가로로 끌다 대각선으로 꺾어도 안 지나간 칸은 그대로 (' + JSON.stringify(d6) + ')');
      await wipe();
      // ⓖ 끌고 나서 바로(0.25초 안) 옆 칸을 톡 하면 평소대로 켜고 끔 (이어 가기는 뗀 자리 근처만)
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[1], .5)); await pe('pointermove', at(row.R[2], .5)); await pe('pointerup', at(row.R[2], .5));
      await pe('pointerdown', at(row.R[1], .5)); await pe('pointerup', at(row.R[1], .5));
      const d7 = await xs();
      T.ok(d7.up === '1010', '① 끌고 나서 바로 옆 칸 톡은 ✕ 켜고 끔 그대로 (' + JSON.stringify(d7) + ')');
      await wipe();
      // ── 11-12 지민 님 아이폰 '두 번 눌러도 ✕ 가 풀렸다 됐다만 하고 🐱 가 안 될 때가 있음' (옛 코드로 ⓗⓘ 실패 확인)
      {
        const snap = () => p.evaluate(() => { const G = window.__ny.G; return { xs: [...G.xs], cats: [...G.cats], bad: [...G.bad], m: G.mistakes }; });
        const back = s => p.evaluate(s => { const G = window.__ny.G; G.xs.clear(); s.xs.forEach(k => G.xs.add(k)); G.cats.clear(); s.cats.forEach(k => G.cats.add(k)); G.bad.clear(); s.bad.forEach(k => G.bad.add(k)); G.mistakes = s.m; G.over = false; G.won = false; localStorage.removeItem('nyang.dblWin'); }, s);   // 판만 되돌림 — 그 사이 넉넉해진 두 번 톡 시간(㉔)도 기본으로
        const s0 = await snap();
        const tgt = await p.evaluate(() => { const G = window.__ny.G, n = G.n; for (let r = 0; r < n; r++) { const k = r * n + G.ans[r]; if (!G.cats.has(k) && !G.xs.has(k)) { const b = document.getElementById('board').children[k].getBoundingClientRect(); return { k, R: { l: b.left, t: b.top, w: b.width, h: b.height } }; } } return null; });
        const isCat = () => p.evaluate(k => window.__ny.G.cats.has(k), tgt.k);
        // ⓗ 두 번째 톡이 같은 칸 안이지만 첫 번째와 좀 떨어진 자리 (엄지로 빠르게 두 번 = 자리가 조금씩 다름)
        await pe('pointerdown', at(tgt.R, .25, .3)); await pe('pointerup', at(tgt.R, .25, .3));
        await pe('pointerdown', at(tgt.R, .75, .7)); await pe('pointerup', at(tgt.R, .75, .7));
        T.ok(await isCat(), '① 같은 칸 안에서 자리가 좀 달라도 두 번 톡 = 🐱');
        await back(s0); await T.sleep(450);
        // ⓘ 손가락은 0.4초 안에 두 번 닿았는데 폰이 바빠 두 번째를 늦게 처리함 (닿은 때 기준으로 재야 함)
        await p.evaluate(o => {
          const el = document.elementFromPoint(o.x, o.y), mk = type => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: o.x, clientY: o.y, pointerType: 'touch', pointerId: 7, isPrimary: true });
          el.dispatchEvent(mk('pointerdown')); window.dispatchEvent(mk('pointerup'));
          const e2 = mk('pointerdown'), until = performance.now() + 430; while (performance.now() < until) { /* 폰이 바쁜 동안 */ }
          el.dispatchEvent(e2); window.dispatchEvent(mk('pointerup'));
        }, at(tgt.R, .5));
        T.ok(await isCat(), '① 폰이 바빠 두 번째 톡을 늦게 처리해도 닿은 때가 0.4초 안이면 🐱');
        await back(s0); await T.sleep(450);
        // ⓙ 지킬 것: 같은 칸이라도 두 번째가 맨 가장자리(옆 칸을 누르려던 것)면 🐱 아님 · 0.4초 넘게 띄운 두 번은 ✕ 켜고 끔
        await pe('pointerdown', at(tgt.R, .2)); await pe('pointerup', at(tgt.R, .2));
        await pe('pointerdown', at(tgt.R, .95)); await pe('pointerup', at(tgt.R, .95));
        const e1 = await isCat();
        await back(s0); await T.sleep(450);
        await pe('pointerdown', at(tgt.R, .5)); await pe('pointerup', at(tgt.R, .5)); await T.sleep(480);
        await pe('pointerdown', at(tgt.R, .5)); await pe('pointerup', at(tgt.R, .5));
        const e2 = await p.evaluate(k => ({ cat: window.__ny.G.cats.has(k), x: window.__ny.G.xs.has(k) }), tgt.k);
        T.ok(!e1 && !e2.cat && !e2.x, '① 맨 가장자리 두 번째 톡 · 천천히 두 번은 🐱 아님 (' + JSON.stringify({ e1, e2 }) + ')');
        await back(s0); await T.sleep(450);
        // ⓚ 11-13 지민 님 '또 고양이 안 되고 ✕ · ✕ 해제, 자주': 터치 시계가 앱 시계보다 앞서 가는 폰 (홈 화면 앱이 자다 깬 뒤) + 폰이 바빠 두 번째를 늦게 처리
        //    gap = 손가락이 닿은 간격, busy = 두 번째를 처리할 때까지 폰이 바빴던 시간, ahead = 터치 시계가 앞선 만큼
        const skew = (o, gap, busy, ahead) => p.evaluate(([o, gap, busy, ahead]) => {
          const el = document.elementFromPoint(o.x, o.y), t0 = performance.now() + ahead;
          const mk = (type, ts) => { const e = new PointerEvent(type, { bubbles: true, cancelable: true, clientX: o.x, clientY: o.y, pointerType: 'touch', pointerId: 7, isPrimary: true }); Object.defineProperty(e, 'timeStamp', { value: ts }); return e; };
          el.dispatchEvent(mk('pointerdown', t0)); window.dispatchEvent(mk('pointerup', t0 + 60));
          const until = performance.now() + busy; while (performance.now() < until) { /* 폰이 바쁜 동안 */ }
          el.dispatchEvent(mk('pointerdown', t0 + gap)); window.dispatchEvent(mk('pointerup', t0 + gap + 60));
        }, [o, gap, busy, ahead]);
        await skew(at(tgt.R, .5), 250, 430, 3600000);
        T.ok(await isCat(), '① 터치 시계가 앞서 가는 폰에서도 닿은 간격(0.25초)으로 재서 두 번 톡 = 🐱 (처리는 0.43초 뒤)');
        await back(s0); await T.sleep(450);
        await skew(at(tgt.R, .5), 480, 0, 3600000);
        const k2 = await p.evaluate(k => ({ cat: window.__ny.G.cats.has(k), x: window.__ny.G.xs.has(k) }), tgt.k);
        T.ok(!k2.cat && !k2.x, '① 그런 폰에서도 0.4초 넘게 띄운 두 번은 🐱 아님 (' + JSON.stringify(k2) + ')');
        await back(s0); await T.sleep(450);
      }
      // ⓔ 끌기가 끝난 뒤 한참(0.45초) 지나 누른 것은 새로 누른 것 = 켜고 끔 그대로
      await pe('pointerdown', at(row.R[0], .5)); await pe('pointermove', at(row.R[1], .5)); await pe('pointerup', at(row.R[1], .5));
      await T.sleep(450);
      await pe('pointerdown', at(row.R[1], .5)); await pe('pointerup', at(row.R[1], .5));
      const d5 = await xs();
      T.ok(d5.up === '1000', '① 끌기 끝나고 한참 뒤 누르면 ✕ 켜고 끔 그대로 (' + JSON.stringify(d5) + ')');
      await wipe();
    }
  }
  // ── 11-11 지민 님 아이폰 '실제로 누르는 곳과 다른 데가 클릭되는 느낌': 틈새 무반응 제거 · 아래 입체 그림자 터치 보정 · 경계 더블탭 자석 · 사파리 스크롤 초기화
  await T.sleep(450);
  { // 1) 칸 사이 틈(gap)에 닿아도 가장 가까운 칸으로 잡힘 (씹히지 않음)
    const gpPt = { x: two.A2.l + two.A2.w + 0.8, y: two.A2.t + two.A2.h * .5 };
    await pe('pointerdown', gpPt); await pe('pointerup', gpPt);
    const sg = await st();
    T.ok(sg.a2x && !sg.b2x, '① 칸 사이 틈(gap)을 눌러도 안 씹히고 가까운 칸에 ✕ (' + JSON.stringify(sg) + ')');
    await T.sleep(450);
    await pe('pointerdown', at(two.A2, .5)); await pe('pointerup', at(two.A2, .5));   // 원복
  }
  await T.sleep(450);
  { // 2) 윗칸 아랫부분(3px 입체 그림자 바로 아래 틈)을 손가락으로 누르면 아랫줄로 안 밀리고 윗칸이 눌림
    const vPair = await p.evaluate(() => {
      const G = window.__ny.G, n = G.n, free = k => !G.isAns(k) && !G.cats.has(k) && !G.bad.has(k) && !G.xs.has(k);
      for (let k = 0; k < n * (n - 1); k++) if (free(k) && free(k + n)) {
        const r = document.getElementById('board').children[k].getBoundingClientRect();
        return { topK: k, botK: k + n, x: r.left + r.width * .5, y: r.bottom + 1.5 };
      }
      return null;
    });
    if (vPair) {
      await pe('pointerdown', { x: vPair.x, y: vPair.y }); await pe('pointerup', { x: vPair.x, y: vPair.y });
      const sv = await p.evaluate(o => ({ top: window.__ny.G.xs.has(o.topK), bot: window.__ny.G.xs.has(o.botK) }), vPair);
      T.ok(sv.top && !sv.bot, '① 손가락 터치 중심이 칸 아랫변 살짝 아래에 찍혀도 시선이 겨냥한 윗칸이 눌림 (' + JSON.stringify(sv) + ')');
      await T.sleep(450);
      await pe('pointerdown', { x: vPair.x, y: vPair.y }); await pe('pointerup', { x: vPair.x, y: vPair.y });
    }
  }
  await T.sleep(450);
  { // 3) 정답 칸 경계 근처를 빠르게 두 번 톡톡 누를 때 두 번째 손가락이 옆 칸으로 1~2px 넘어가도 첫 칸에 🐱 (옆 칸에 ✕ 안 찍힘)
    const bCat = await p.evaluate(() => {
      const G = window.__ny.G, n = G.n;
      for (let r = 0; r < n; r++) {
        const k = r * n + G.ans[r];
        if (!G.cats.has(k) && G.ans[r] < n - 1 && !G.xs.has(k + 1) && !G.cats.has(k + 1)) {
          const A = document.getElementById('board').children[k].getBoundingClientRect(), B = document.getElementById('board').children[k + 1].getBoundingClientRect();
          return { k, nb: k + 1, p1: { x: A.right - 2, y: A.top + A.height * .5 }, p2: { x: B.left + 1.5, y: B.top + B.height * .5 } };
        }
      }
      return null;
    });
    if (bCat) {
      await pe('pointerdown', bCat.p1); await pe('pointerup', bCat.p1);
      await pe('pointerdown', bCat.p2); await pe('pointerup', bCat.p2);
      const sb = await p.evaluate(o => ({ cat: window.__ny.G.cats.has(o.k), nbX: window.__ny.G.xs.has(o.nb) }), bCat);
      T.ok(sb.cat && !sb.nbX, '① 경계 근처 빠른 두 번 탭이 옆 칸으로 살짝 넘어가도 첫 칸 🐱 · 옆 칸 ✕ 없음 (' + JSON.stringify(sb) + ')');
    }
  }
  { // 4) #home 을 스크롤한 채 [시작!] 을 눌러 .play 로 들어갈 때 scrollY 가 즉시 0 으로 초기화됨 (iOS 사파리 뷰포트 밀림 방지)
    const scReset = await p.evaluate(() => {
      document.getElementById('giveUp').click(); document.getElementById('giveUp').click();
      document.body.style.minHeight = '2400px'; window.scrollTo(0, 320);
      const before = window.scrollY;
      document.getElementById('startBtn').click();
      const after = window.scrollY;
      document.body.style.minHeight = '';
      return { before, after, playing: !document.getElementById('play').hidden };
    });
    T.ok(scReset.before > 100 && scReset.after === 0 && scReset.playing, '① 스크롤된 첫 화면에서 판으로 들어갈 때 scrollY=0 즉시 초기화 (' + JSON.stringify(scReset) + ')');
  }
  // 판 밖 단추도 터치로 그대로 눌림
  const ax = await p.evaluate(() => { document.getElementById('hintBox').hidden = true; const r = document.getElementById('hintBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.touchscreen.tap(ax.x, ax.y);
  T.ok(!!(await U.waitFor(p, () => !document.getElementById('hintBox').hidden, null, 2000, 40)), '① 판 밖 단추(💡 힌트)는 터치로 그대로 눌림');
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
    skinOn: (document.querySelector('.skins button.on') || {}).textContent, noBtn: !$('autoX') && !$('sndBtn'), sound: window.NYSND && NYSND.on,
    onemode: $('tiers').hidden };
  });
  T.ok(ls.stars && ls.cur && ls.lock, '④ 단계·별 그대로 (' + JSON.stringify(ls) + ')');
  T.ok(ls.skinOn === '🐈', '④ 고른 고양이 그대로 (' + ls.skinOn + ')');
  T.ok(ls.noBtn && ls.sound === true, '④ 11-13 🪄 자동 ✕ · 🔊 소리 단추 없음 — 게임 안에서 소리를 꺼 두었던 폰도 소리는 켬 (폰 음소거 · 볼륨으로): ' + JSON.stringify([ls.noBtn, ls.sound]));
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
    const B = await T.open('nyang/', 'kinds=1');   // 11-12 반반 · 산책은 화면에서 뺌 → ?kinds=1 로만
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
    // 11-08 '화면이 너무 복잡' → 📅 오늘엔 냥도쿠만, 오늘의 반반은 🧩 한 판에서 🌗 반반을 고르면 위에
    await B.evaluate(() => document.querySelector('#soloMode [data-v="day"]').click());
    T.ok(await B.evaluate(() => !document.getElementById('dayBB') && !/오늘의 반반|오늘의 산책/.test(document.getElementById('dayBox').textContent)), '⑪ 📅 오늘에는 반반 · 산책 카드가 없음 (냥도쿠 오늘의 퍼즐만)');
    await B.evaluate(() => { document.querySelector('#soloMode [data-v="one"]').click(); document.querySelector('#kindSeg [data-v="b"]').click(); });
    T.ok(await B.evaluate(() => !!document.getElementById('dayBB') && !document.getElementById('kindDay').hidden && /오늘의 반반/.test(document.getElementById('kindDay').textContent)), '⑪ 🧩 한 판 → 🌗 반반 위에 오늘의 반반 카드');
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
    const Z = await T.open('nyang/', 'kinds=1');
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
    // 11-08 지민 님 아이폰: 끌 때 옆 칸 가장자리를 스치면 길이 붙거나 지워지면 안 됨 (옛 코드로 실패 확인)
    const edge = (b, a, f) => Z.evaluate(([b, a, f]) => {   // 칸 b 안, a 와 맞닿은 변에서 칸 크기 f 만큼 들어간 자리
      const N = NYZUI.pz.N, r = document.querySelector(`#zboard .zc[data-k="${b}"]`).getBoundingClientRect(), dx = Math.sign(b % N - a % N), dy = Math.sign(Math.floor(b / N) - Math.floor(a / N));
      return [r.left + r.width / 2 - dx * (.5 - f) * r.width, r.top + r.height / 2 - dy * (.5 - f) * r.height];
    }, [b, a, f]);
    await Z.click('#zClear');
    { let [x, y] = await center(sol[0]); await Z.mouse.move(x, y); await Z.mouse.down();
      [x, y] = await edge(sol[1], sol[0], .1); await Z.mouse.move(x, y, { steps: 3 }); }
    const e1 = await Z.evaluate(() => NYZUI.path.length);
    { const [x, y] = await center(sol[1]); await Z.mouse.move(x, y, { steps: 3 }); }
    const e2 = await Z.evaluate(() => NYZUI.path.length);
    { const [x, y] = await edge(sol[0], sol[1], .1); await Z.mouse.move(x, y, { steps: 3 }); await Z.mouse.up(); }
    const e3 = await Z.evaluate(() => NYZUI.path.length);
    T.ok(e1 === 1 && e2 === 2 && e3 === 2, `⑬ 옆 칸 가장자리를 스치면 그대로 · 안쪽까지 가야 이어짐 · 지난 칸 가장자리를 스쳐도 안 지워짐 (${e1}·${e2}·${e3})`);
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
    await Z.evaluate(() => { document.querySelector('#soloMode [data-v="one"]').click(); document.querySelector('#kindSeg [data-v="z"]').click(); });
    T.ok(await Z.evaluate(() => !!document.getElementById('dayZZ') && /오늘의 산책/.test(document.getElementById('kindDay').textContent)), '⑬ 🧩 한 판 → 🐾 산책 위에 오늘의 산책 카드');
    T.ok(await Z.evaluate(() => { document.querySelector('#kindSeg [data-v="q"]').click(); const h = document.getElementById('kindDay').hidden; document.querySelector('#kindSeg [data-v="z"]').click(); return h; }), '⑬ 🐱 냥도쿠를 고르면 오늘의 산책 카드는 숨김');
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

  // ── ⑮ 11-08 베니 님 '오늘 선착순 · 타임어택 친구끼리 경쟁 — 랭킹 잘 보이게, 자꾸 나한테 물어봐' → 혼자 화면 맨 위 순위 띠 · 타임어택 친구 순위 · 결과창 순위
  {
    const K = await T.open('nyang/');
    await U.waitFor(K, A.ready);
    await K.evaluate(() => { localStorage.setItem('game.me', JSON.stringify({ pid: 'pA', name: '지밍비' })); for (const k of ['nyang.taW', 'nyang.taBest', 'nyang.day']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); localStorage.setItem('nyang.soloTier', '"easy"'); });
    await K.reload({ waitUntil: 'load' }); await U.waitFor(K, A.ready);
    await K.evaluate(() => {
      const k = __ny.kstDay(), wk = __ny.weekKey(), at = h => Date.parse(k + 'T00:00:00+09:00') + h * 3600e3;
      __ny.setRk({ rec: {
        pA: { ta: { master_3: 7 }, w: { [wk]: { ta: { master_3: 6 } } } },
        pB: { day: { [k]: { s: 95.2, m: 0, h: 0, at: at(7.2) } }, ta: { master_3: 4 }, w: { [wk]: { ta: { master_3: 4 } } } },
        pC: { day: { [k]: { s: 80, m: 1, h: 2, at: at(6.5) } }, ta: { master_3: 7 }, w: { [wk]: { ta: { master_3: 7 } } } },
        pD: { ta: { master_3: 9 }, w: { '2020-01-06': { ta: { master_3: 9 } } } },
      }, names: { pA: '지밍비', pB: '베니', pC: '멋쟁이규호', pD: '훈' } });
    });
    const s0 = await K.evaluate(() => [...document.querySelectorAll('#rankStrip .rs-row')].map(r => ({ go: r.dataset.go, t: r.textContent.replace(/\s+/g, ' ').trim() })));
    T.ok(s0.length === 2 && s0[0].go === 'day' && /오늘의 퍼즐 순위/.test(s0[0].t) && s0[0].t.indexOf('베니') < s0[0].t.indexOf('멋쟁이규호') && /나는 아직/.test(s0[0].t), '⑮ 🗺 단계 화면에도 📅 오늘 순위 (힌트 벌점 넣어 빠른 순 · 나는 아직): ' + (s0[0] && s0[0].t));
    T.ok(s0[1] && s0[1].go === 'ta' && /이번 주 타임어택 순위/.test(s0[1].t) && /고수 3분/.test(s0[1].t) && /멋쟁이규호 7개/.test(s0[1].t) && /나 2등/.test(s0[1].t) && !/훈/.test(s0[1].t), '⑮ ⏱ 이번 주 타임어택 순위 (지난주 기록은 빠짐 · 나 2등): ' + (s0[1] && s0[1].t));
    await K.evaluate(() => document.querySelector('#rankStrip [data-go="ta"]').click());
    const t1 = await K.evaluate(() => ({ mode: document.querySelector('#soloMode [aria-pressed="true"]').dataset.v, tier: document.querySelector('#tiers [aria-pressed="true"]').dataset.t, rows: [...document.querySelectorAll('#taBoard li')].map(li => ({ t: li.textContent.replace(/\s+/g, ' ').trim(), me: li.classList.contains('me') })), strip: [...document.querySelectorAll('#rankStrip .rs-row')].map(r => r.dataset.go), card: document.querySelector('#tiers [data-t="master"]').textContent, howto: document.getElementById('howto').hidden }));
    T.ok(t1.mode === 'ta' && t1.tier === 'master' && t1.rows.length === 3 && /멋쟁이규호.*7개/.test(t1.rows[0].t) && t1.rows[1].me && /지밍비.*6개/.test(t1.rows[1].t) && t1.strip.join() === 'day', '⑮ 띠를 누르면 ⏱ 타임어택 · 고수 · 친구 순위판 (나는 표시) · 띠엔 오늘 줄만: ' + JSON.stringify(t1.rows));
    T.ok(/이번 주 멋쟁이규호 7개/.test(t1.card) && t1.howto, '⑮ 난이도 칸에 이번 주 1등 · 타임어택에선 규칙 글 숨김: ' + t1.card.replace(/\s+/g, ' '));
    const t2 = await K.evaluate(() => { document.querySelector('#taBoard [data-p="all"]').click(); return [...document.querySelectorAll('#taBoard li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()); });
    T.ok(t2.length === 4 && /훈.*9개/.test(t2[0]), '⑮ 역대를 누르면 지난 기록까지 (훈 9개 1등): ' + t2.join(' / '));
    // 📅 오늘: 순위 + 푼 시각 (누가 먼저 풀었는지)
    await K.evaluate(() => document.querySelector('#soloMode [data-v="day"]').click());
    const d1 = await K.evaluate(() => ({ t: document.getElementById('dayBox').textContent.replace(/\s+/g, ' '), at: [...document.querySelectorAll('#dayBox .dc-board .at')].map(e => e.textContent), strip: [...document.querySelectorAll('#rankStrip .rs-row')].map(r => r.dataset.go) }));
    T.ok(/오늘 순위/.test(d1.t) && d1.at.join() === '7:12,6:30' && d1.strip.join() === 'ta', '⑮ 📅 오늘 카드: 🏆 오늘 순위 + 푼 시각 · 띠엔 타임어택 줄만: ' + JSON.stringify(d1.at));
    // 타임어택 결과창: 이번 주 친구 순위 (8개면 1등)
    await K.evaluate(() => { document.querySelector('#soloMode [data-v="ta"]').click(); document.querySelector('#tiers [data-t="master"]').click(); });
    await K.click('#startBtn');
    await U.waitFor(K, () => window.__ny.TA && window.__ny.G && !document.getElementById('play').hidden, null, 4000);
    // ── ⑳ 11-12 지민 님 기록: 요즘 타임어택만 함 · 30% 를 중간에 그만두고 다시 함 → 판 위에 이번 주 1등 기록, ↺ 로 바로 다시 시작
    {
      const hud = () => K.evaluate(() => ({ lbl: document.getElementById('stLabel').textContent, re: !document.getElementById('restart').hidden && document.getElementById('restart').textContent.replace(/\s+/g, ' ').trim(), left: Math.round((__ny.TA.endAt - Date.now()) / 1000), solved: __ny.TA.solved }));
      const h0 = await hud();
      T.ok(/1등 7개/.test(h0.lbl) && /다시 시작/.test(h0.re || ''), '⑳ 타임어택 판 위에 이번 주 1등 기록 · ↺ 다시 시작 단추: ' + JSON.stringify(h0));
      await K.evaluate(() => { __ny.TA.solved = 3; __ny.TA.endAt -= 60000; });
      const ta0 = await K.evaluate(() => { window.__ta0 = __ny.TA; document.getElementById('restart').click(); return { same: __ny.TA === window.__ta0, over: __ny.TA.over }; });
      T.ok(ta0.same && !ta0.over, '⑳ 다시 시작은 한 번 눌러선 안 됨 (실수 막이)');
      await K.evaluate(() => document.getElementById('restart').click());
      await U.waitFor(K, () => window.__ny.TA && window.__ny.TA !== window.__ta0 && window.__ny.G && !window.__ny.G.over, null, 4000);
      const h1 = await hud();
      const old = await K.evaluate(() => ({ over: window.__ta0.over, res: document.getElementById('resBox').hidden }));
      T.ok(h1.solved === 0 && h1.left > 170 && old.over && old.res, '⑳ 두 번 누르면 시간 · 개수 처음부터 (결과창 없이 바로): ' + JSON.stringify(h1));
      // ── ㉑ 11-12 베니 님 '바꿔 줘': 판 크기가 무작위(9·10·11칸)라 작은 판이 많이 걸리면 운으로 이김 → 순서를 모두 같게 (9 → 10 → 11 되풀이)
      const desc = await K.evaluate(() => document.getElementById('soloDesc').textContent);
      const ns = [];
      for (let j = 0; j < 4; j++) {
        await U.waitFor(K, j => window.__ny.TA.i === j && window.__ny.G && !window.__ny.G.over && document.getElementById('board').children.length === window.__ny.G.n ** 2, j, 5000, 50);
        ns.push(await K.evaluate(() => __ny.G.n));
        if (j < 3) await solve(K);
      }
      T.ok(ns.join() === '9,10,11,9', '㉑ 혼자 타임어택 판 크기는 9 → 10 → 11 차례로 되풀이: ' + ns.join(' → '));
      T.ok(/9 → 10 → 11칸/.test(desc), '㉑ 시작 전 설명에 판 크기 차례: ' + desc);
      await K.evaluate(() => { window.__ta1 = __ny.TA; document.getElementById('restart').click(); document.getElementById('restart').click(); });
      await U.waitFor(K, () => window.__ny.TA !== window.__ta1 && window.__ny.G && !window.__ny.G.over, null, 4000);
      const n0 = await K.evaluate(() => [__ny.TA.i, __ny.G.n]);
      T.ok(n0.join() === '0,9', '㉑ 다시 시작하면 9칸부터: ' + n0.join());
    }
    await K.evaluate(() => { __ny.TA.solved = 8; __ny.TA.endAt = Date.now() - 1; });
    const r1 = await U.waitFor(K, () => !document.getElementById('resBox').hidden && /시간 끝/.test(document.getElementById('resTitle').textContent) && document.getElementById('resRank').textContent.replace(/\s+/g, ' '), null, 5000);
    T.ok(r1 && /이번 주 1등/.test(r1) && /2등 멋쟁이규호 7개/.test(r1), '⑮ 타임어택 결과창: 이번 주 친구 순위 · 나 1등: ' + r1);
    const lw = await K.evaluate(() => JSON.parse(localStorage.getItem('nyang.taW') || '{}'));
    T.ok(lw.wk === (await K.evaluate(() => __ny.weekKey())) && lw.v && lw.v.master_3 === 8, '⑮ 이번 주 내 기록을 폰에도 (서버 다시 읽기 전에 순위에 바로) ' + JSON.stringify(lw));
    await K.evaluate(() => { for (const k of ['game.me', 'nyang.taW', 'nyang.taBest', 'nyang.soloTier', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); localStorage.setItem('nyang.soloMode2', '"map"'); });
    await K.close();
  }

  // ── ⑯ 11-08 '고수 판 더 만들고 — 매번 내가 만들라고 해야 하나?' → 고수 단계는 1,000판 묶음을 차례로 (bank/master-N.json · index.json)
  {
    const C = await T.open('nyang/');
    await U.waitFor(C, A.ready);
    const c0 = await C.evaluate(async () => { await __ny.bankIdxP; const a = __ny.stageInfo(1090), b = __ny.stageInfo(1091), c = __ny.stageInfo(91); return { n: __ny.bankIdx.master || 0, a, b, c, want: (999 * 7919 + 101) % 1000 }; });
    T.ok(c0.n >= 1 && c0.a.chunk === 0 && c0.a.idx === c0.want && c0.c.chunk === 0 && c0.c.idx === 101, '⑯ 1090단계까지는 예전 그대로 (처음 묶음 · 같은 판 번호) ' + JSON.stringify({ a: c0.a, c: c0.c, n: c0.n }));
    T.ok(c0.b.chunk === 1 && c0.b.idx >= 1000 && c0.b.idx < 2000, '⑯ 1091단계부터 다음 묶음 ' + JSON.stringify(c0.b));
    await C.evaluate(() => { localStorage.setItem('nyang.stageStars', JSON.stringify({ 1090: 3 })); });
    await C.reload({ waitUntil: 'load' }); await U.waitFor(C, A.ready);
    await C.evaluate(() => __ny.playStage(1091));
    const g = await U.waitFor(C, () => window.__ny.G && !document.getElementById('play').hidden && document.getElementById('stLabel').textContent, null, 8000);
    T.ok(g && /1091/.test(g), '⑯ 1091단계를 누르면 새 묶음을 받아 판이 열림: ' + g);
    T.ok(await C.evaluate(() => { const s = __ny.stageInfo(1091); return __ny.G.n === __ny.bankAt('master', s.idx).n; }), '⑯ 열린 판 = 새 묶음의 그 번호 판');
    // ── ⑱ 11-12 베니 님 '힌트가 정답을 아는 AI 가 설명하는 느낌, 눈높이에 안 맞음'
    //    1단계 = 무엇을 볼지 묻는 말, 2단계 = 판에 표시된 것(반짝 · 주황 테두리)으로 까닭 (좌표 안 씀), 가정해 보기 = 놓게 되는 칸에 ①②③
    {
      const txt = () => C.evaluate(() => document.getElementById('hintText').textContent);
      const press = id => C.evaluate(id => document.getElementById(id).click(), id);
      await press('hintBtn');
      const a1 = await txt();
      T.ok(/반짝이는/.test(a1) && !/알 수 있는 게 있어요/.test(a1), '⑱ 힌트 1단계는 무엇을 볼지 짚어 줌: ' + a1);
      await press('hintMore');
      const a2 = await txt(), tg = await C.evaluate(() => document.querySelectorAll('#board .c.tgt').length);
      T.ok(/주황 테두리|①/.test(a2) && tg >= 1 && !/번째 줄 \d+번째 칸/.test(a2), '⑱ 2단계 까닭은 판에 표시된 것으로 (좌표 안 씀): ' + a2.slice(0, 80));
      await press('hintClose');
      // 힌트대로 풀어 가다 '가정해 보기'가 나오는 곳에서 멈춤 (이 판에 없으면 다음 단계 판으로)
      const walk = () => C.evaluate(() => {
        const G = __ny.G, NY = __ny.NY;
        for (let i = 0; i < 600 && !G.over; i++) {
          const h = NY.nextHint(G); if (!h) return null;
          if (h.kind === 'suppose') return { n: h.ghost.length, k: h.target[0], xs: G.xs.size };
          if (h.act === 'cat') { if (G.cats.size >= G.n - 1) return null; G.place(h.target[0]); } else for (const k of h.target) G.setX(k, h.act === 'x');
        }
        return null;
      });
      let sup = await walk();
      for (let st = 1092; st <= 1099 && !sup; st++) {
        await C.evaluate(st => { const o = {}; for (let s = 1085; s < st; s++) o[s] = 3; localStorage.setItem('nyang.stageStars', JSON.stringify(o)); }, st);
        await C.reload({ waitUntil: 'load' }); await U.waitFor(C, A.ready);
        await C.evaluate(st => __ny.playStage(st), st);
        await U.waitFor(C, () => window.__ny.G && !document.getElementById('play').hidden && document.getElementById('stLabel').textContent, null, 8000);
        sup = await walk();
      }
      T.ok(!!sup && sup.n >= 2, '⑱ 가정해 보기가 나오는 판을 찾음 ' + JSON.stringify(sup));
      if (sup) {
        await press('hintBtn');
        const s1 = await txt();
        await press('hintMore');
        const s2 = await txt();
        const v = await C.evaluate(k => ({ g: [...document.querySelectorAll('#board .c[data-g]')].map(e => e.dataset.g).sort().join(''), tgt: [...document.querySelectorAll('#board .c.tgt')].map(e => +e.dataset.k), first: document.getElementById('board').children[k].dataset.g, look: document.querySelectorAll('#board .c.look').length }), sup.k);
        T.ok(/상상/.test(s1) && /①/.test(s2) && /②/.test(s2) && /놓을 칸이 하나도 없어요/.test(s2), '⑱ 가정해 보기: 어디에 놓게 되고 어디가 막히는지 차례로 말함: ' + s2.slice(0, 90));
        T.ok(v.g.length === sup.n && v.first === '①' && v.tgt.length === 1 && v.tgt[0] === sup.k && v.look >= 1, '⑱ 놓게 되는 칸에 ①②③ · 막히는 곳 반짝 ' + JSON.stringify(v));
        await press('hintApply');
        const af = await C.evaluate(k => ({ x: __ny.G.xs.has(k), g: document.querySelectorAll('#board .c[data-g]').length, box: document.getElementById('hintBox').hidden }), sup.k);
        T.ok(af.x && af.g === 0 && af.box, '⑱ 적용하면 그 칸에 ✕, 번호는 사라짐 ' + JSON.stringify(af));
      }
    }
    // ── ⑲ 11-12 베니 님 '다른 게임 합쳐 놓은 건 분리하든 빼든' → 반반 · 산책은 냥도쿠 화면에서 뺌 (전에 반반을 골라 둔 폰도 냥도쿠로)
    {
      const X = await T.open('nyang/');
      await U.waitFor(X, A.ready);
      await X.evaluate(() => { localStorage.setItem('nyang.kind', '"b"'); localStorage.setItem('nyang.soloMode2', '"one"'); });
      await X.reload({ waitUntil: 'load' }); await U.waitFor(X, A.ready);
      const k = await X.evaluate(() => ({ seg: document.getElementById('kindSeg').hidden, hb: document.getElementById('howtoB').hidden, hq: document.getElementById('howto').hidden, day: document.getElementById('kindDay').hidden, home: document.getElementById('home').innerText }));
      T.ok(k.seg && k.hb && !k.hq && k.day && !/반반|산책/.test(k.home.replace(/\s+/g, ' ')), '⑲ 🧩 한 판에 반반 · 산책 고르는 줄 없음 ' + JSON.stringify({ seg: k.seg, hb: k.hb, hq: k.hq, day: k.day }));
      await X.evaluate(() => document.getElementById('startBtn').click());
      T.ok(!!(await U.waitFor(X, () => window.__ny.G && !document.getElementById('play').hidden && !(document.getElementById('bplay') && !document.getElementById('bplay').hidden), null, 6000)), '⑲ 시작하면 냥도쿠 판 (반반 판 아님)');
      await X.evaluate(() => { for (const k of ['nyang.kind', 'nyang.soloMode2', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); });
      await X.close();
    }
    await C.evaluate(() => { for (const k of ['nyang.stageStars', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); });
    await C.close();
  }

  // ── ⑰ 11-10 베니 님 (지민 님 비행기 오프라인 문의): 비행기 모드(오프라인)에서도 바로 열리고 · 기록(판 수·별·배지·오늘의 퍼즐)이 폰에 쌓였다가 · 온라인 복귀 때 서버로 자동 동기화
  {
    const O = await T.open('nyang/');
    await U.waitFor(O, A.ready);
    await O.evaluate(() => {
      localStorage.setItem('game.me', JSON.stringify({ pid: 'pOff', name: '지밍비' }));
      for (const k of ['rank.q.v1', 'rank.mine.nyang.pOff', 'rank.mine.test/nyang.pOff', 'nyang.recPend', 'nyang.myRec', 'nyang.stageStars', 'nyang.day', 'nyang.bestT', 'nyang.gm']) localStorage.removeItem(k);
      localStorage.setItem('nyang.soloMode2', '"map"');
    });
    await O.reload({ waitUntil: 'load' }); await U.waitFor(O, A.ready);
    await O.evaluate(() => { Object.defineProperty(navigator, 'onLine', { value: false, configurable: true }); });
    const prog0 = await O.evaluate(() => document.getElementById('soloProg').textContent.replace(/\s+/g, ' ').trim());
    T.ok(/0판 깼어요/.test(prog0), '⑰ 오프라인에서도 혼자 화면 위 진행 줄이 멈추지 않고 바로 표시됨: ' + prog0);
    // 오프라인에서 1단계 깨기
    await O.click('#startBtn');
    await U.waitFor(O, () => window.__ny.G && !document.getElementById('play').hidden);
    await solve(O);
    T.ok(!!(await U.waitFor(O, () => !document.getElementById('resBox').hidden && /1단계 성공/.test(document.getElementById('resTitle').textContent), null, 4000)), '⑰ 오프라인에서 1단계 성공 창');
    await T.sleep(1350);   // checkBadges 타이머(1200ms) 대기
    const offState = await O.evaluate(async () => {
      const m = await GRank.mine('nyang');
      const q = JSON.parse(localStorage.getItem('rank.q.v1') || '[]');
      const pend = JSON.parse(localStorage.getItem('nyang.recPend') || 'null');
      const myRec = JSON.parse(localStorage.getItem('nyang.myRec') || '{}');
      const st = JSON.parse(localStorage.getItem('nyang.stageStars') || '{}');
      return { mineN: m && m.all && m.all.n, qLen: q.length, pendSv: pend && pend.sv, hasFirstAch: !!(myRec.ach && myRec.ach.first), st1: st[1], prog: document.getElementById('soloProg').textContent.replace(/\s+/g, ' ').trim() };
    });
    T.ok(offState.mineN === 1 && /1판 깼어요/.test(offState.prog), '⑰ 오프라인에서 판을 깨면 공용 랭킹 내 판 수 · 화면 숫자가 즉시 +1 반영됨: ' + JSON.stringify(offState));
    T.ok(offState.qLen === 1 && offState.pendSv === 1 && offState.st1 >= 1 && offState.hasFirstAch, '⑰ 오프라인 큐(rank.q.v1 · nyang.recPend)와 로컬 배지·단계 별이 저장됨: ' + JSON.stringify(offState));
    // 온라인 복귀 → 자동 동기화 (GRank.flush + syncLocalToServer)
    const synced = await O.evaluate(async () => {
      const writes = {};
      const mkRef = path => ({
        child: p => mkRef(path ? path + '/' + p : p),
        set: v => { writes[path] = v; return Promise.resolve(); },
        transaction: fn => { writes[path] = fn(writes[path]); return Promise.resolve({ committed: true }); },
        get: () => Promise.resolve({ val: () => null }),
      });
      const fakeDb = { ref: p => mkRef(p) };
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.__rankTestDb = fakeDb;
      Arena.db = () => fakeDb;
      await GRank.flush();
      __ny.syncLocalToServer({});
      delete window.__rankTestDb;
      return {
        qAfter: JSON.parse(localStorage.getItem('rank.q.v1') || '[]').length,
        pendAfter: JSON.parse(localStorage.getItem('nyang.recPend') || 'null'),
        writes: Object.keys(writes),
        svVal: writes['nyang/rec/pOff/sv'],
        st1Val: writes['nyang/rec/pOff/st/s1'],
        achFirst: !!writes['nyang/rec/pOff/ach/first'],
        rankN: writes['rank/nyang/pOff/m/a'] && writes['rank/nyang/pOff/m/a'].n,
      };
    });
    T.ok(synced.qAfter === 0 && synced.pendAfter === null && synced.svVal === 1 && synced.st1Val >= 1 && synced.achFirst && synced.rankN === 1, '⑰ 온라인 복귀 시 대기 큐가 비워지고 서버(rank · nyang/rec)로 자동 동기화됨: ' + JSON.stringify(synced));
    // [✈️ 비행기용] 단추 → 6,090단계 완충 + 준비 완료 표시 + 홈 화면 앱(#s=...) 권한·프로필 이어받기
    await O.evaluate(() => {
      const b = [...document.querySelectorAll('#resBtns button')].pop(); if (b) b.click();
      localStorage.setItem('game.gate.pass.v1', JSON.stringify({ uid: 'uJ', role: 'friend', status: 'active', expiresAt: 0 }));
      document.getElementById('offBtn').click();
    });
    const offDone = await U.waitFor(O, () => {
      const h = document.getElementById('offHead');
      return h && /준비 완료/.test(h.textContent) && document.getElementById('offBtn').textContent;
    }, null, 8000);
    T.ok(offDone === '✈️ 준비됨 ✓', '⑰ [✈️ 비행기용] 누르면 6,090단계 저장 후 "✈️ 준비됨 ✓" 표시: ' + offDone);
    const hash = await O.evaluate(() => location.hash);
    T.ok(/^#s=/.test(hash), '⑰ 홈 화면 추가용 이어받기 해시(#s=...) 생성됨');
    await O.evaluate(() => { for (const k of ['game.me', 'game.gate.pass.v1', 'rank.q.v1', 'rank.mine.nyang.pOff', 'rank.mine.test/nyang.pOff', 'nyang.recPend', 'nyang.myRec', 'nyang.stageStars', 'nyang.bestT', 'nyang.solved', 'nyang.avg', 'nyang.today', 'nyang.gm', 'nyang.offlineReady']) localStorage.removeItem(k); });
    await O.reload({ waitUntil: 'load' });
    await U.waitFor(O, A.ready);
    const restored = await O.evaluate(() => ({
      me: JSON.parse(localStorage.getItem('game.me') || 'null'),
      pass: JSON.parse(localStorage.getItem('game.gate.pass.v1') || 'null'),
      st: JSON.parse(localStorage.getItem('nyang.stageStars') || '{}'),
    }));
    T.ok(restored.me && restored.me.name === '지밍비' && restored.pass && restored.pass.pwa === 1 && restored.st[1] >= 1, '⑰ 홈 화면 앱(#s=...)으로 열면 프로필·허용 권한·단계가 자동 복원됨: ' + JSON.stringify(restored));
    await O.evaluate(() => { for (const k of ['game.me', 'game.gate.pass.v1', 'nyang.stageStars', 'nyang.skin', 'nyang.offlineReady']) localStorage.removeItem(k); });
    await O.close();
  }

  // ── ㉒ 11-13 베니 님 '검토를 시켜도 막상 하면 오류가 많았다' → 🐞 이상해요: 실제 폰에서 '눌렀는데 뜻대로 안 됨'을 모음
  //    판 아래 단추(글자 없이 한 번) · 의심 신호 세기(flip · miss · gap · undrag · slip) · 판 기록 한 줄에 같이 · 결과창 물음(하루 한 번)
  {
    const Y = await T.open('nyang/');
    await U.waitFor(Y, A.ready);
    await Y.evaluate(() => {   // 시험 화면엔 DB 가 없어 기록을 안 남김 → 어디에 무엇을 쓰는지 보려고 가짜 DB
      window.__w = [];
      const node = path => ({ key: path.split('/').pop(), get parent() { return node(path.split('/').slice(0, -1).join('/')); }, child: c => node(path + '/' + c),
        set: v => (__w.push(['set', path, v]), Promise.resolve()), update: v => (__w.push(['update', path, v]), Promise.resolve()),
        push(v) { const nd = node(path + '/-p' + __w.length); if (v !== undefined) __w.push(['push', path, v]); return nd; } });
      const db = () => ({ ref: p => node(p) }); db.ServerValue = { TIMESTAMP: 'TS' };
      if (!window.firebase) window.firebase = { database: db };
      Arena.db = db;
      for (const k of ['nyang.oddAsk', 'nyang.oddSent']) localStorage.removeItem(k);
    });
    const begin = async () => {
      await Y.evaluate(() => { document.querySelector('#soloMode [data-v="one"]').click(); document.querySelector('#tiers [data-t="easy"]').click(); document.getElementById('startBtn').click(); });
      await U.waitFor(Y, () => window.__ny.G && !window.__ny.G.over && !document.getElementById('play').hidden && document.getElementById('board').children.length === window.__ny.G.n ** 2, null, 6000);
      let last = '', same = 0; for (let i = 0; i < 40 && same < 4; i++) { const r = await Y.evaluate(() => { const b = document.getElementById('board').getBoundingClientRect(); return b.width + ',' + b.top; }); same = r === last ? same + 1 : 0; last = r; await T.sleep(50); }
      await Y.evaluate(() => { __ny.G.autoX = false; });   // 신호 시험은 빈칸이 넉넉해야 해서 이 판들만 저절로 치는 ✕ 를 끔 (저절로 치는 것은 ㉓)
    };
    const pe = (type, k, id) => Y.evaluate(([type, k, id]) => {
      const r = document.getElementById('board').children[k].getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      (type === 'pointerdown' ? document.elementFromPoint(x, y) : window).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', pointerId: id || 7, isPrimary: true }));
    }, [type, k, id]);
    const swipe = async ks => { await pe('pointerdown', ks[0]); for (const k of ks.slice(1)) await pe('pointermove', k); await pe('pointerup', ks[ks.length - 1]); };
    const st = () => Y.evaluate(() => ({ cnt: { ...__ny.ODD.cnt }, inp: { ...__ny.ODD.inp }, snap: __ny.ODD.snap && __ny.ODD.snap.why, xs: [...__ny.G.xs], m: __ny.G.mistakes }));
    const freeW = skip => Y.evaluate(skip => { const G = __ny.G; for (let k = G.n * G.n - 1; k >= 0; k--) if (!G.isAns(k) && !G.cats.has(k) && !G.bad.has(k) && !G.xs.has(k) && !skip.includes(k)) return k; return -1; }, skip);
    await begin();
    const n = await Y.evaluate(() => __ny.G.n);
    // 판 아래 단추: 보이고, 좁은 폰에서도 단추 줄이 화면을 안 넘음
    const dk = await Y.evaluate(() => { const b = document.getElementById('oddBtn'), d = document.getElementById('dock'); return { vis: __qa.vis(b), txt: b.textContent.replace(/\s+/g, ' ').trim(), fit: [...d.children].filter(e => !e.hidden).every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5; }), n: [...d.children].filter(e => !e.hidden).length, w: innerWidth }; });
    T.ok(dk.vis && /이상해요/.test(dk.txt) && dk.fit && dk.n === 4, '㉒ 판 아래 🐞 이상해요 단추 (힌트 · ✕ 지우기 · 처음부터 · 이상해요 4개가 화면 폭 안): ' + JSON.stringify(dk));
    // undrag: 끌어서 ✕ 친 줄을 바로 반대로 다시 끎
    await swipe([0, 1, 2]);
    const s1 = await st();
    await swipe([0, 1, 2]);
    const s2 = await st();
    T.ok([0, 1, 2].every(k => s1.xs.includes(k)) && s1.inp.drag === 1 && !s1.cnt.undrag && s2.xs.length === 0 && s2.cnt.undrag === 1 && s2.snap === 'sig:undrag', '㉒ 끌어서 친 ✕ 를 2.5초 안에 반대로 끌면 undrag 1: ' + JSON.stringify([s1.cnt, s2.cnt, s2.inp]));
    // gap: 끌고 지나간 칸들 사이에 빠진 칸을 바로 따로 눌러 채움 (지금 끌기는 안 빠지니, 빠진 끌기는 값으로 넣고 채우는 톡은 진짜로)
    await Y.evaluate(n => __ny.ODD.drag({ on: true, seen: new Set([n, n + 2]), last: n + 2 }), n);
    await tap(Y, n + 1);
    const s3 = await st();
    T.ok(s3.cnt.gap === 1 && s3.cnt.undrag === 1 && s3.xs.includes(n + 1), '㉒ 끈 칸들 사이 빠진 칸을 2초 안에 눌러 채우면 gap 1: ' + JSON.stringify(s3.cnt));
    await tap(Y, 2 * n);   // 끈 줄과 상관없는 칸은 gap 아님
    T.ok((await st()).cnt.gap === 1, '㉒ 끈 줄 밖의 칸을 누른 것은 gap 아님');
    // 단추 한 번 → 직전 입력 + 판 모양
    const b1 = await Y.evaluate(() => { document.getElementById('oddBtn').click(); const L = __ny.ODD.last, tr = L && JSON.parse(L.tr); return L && { why: L.why, n: L.n, reg: L.reg.length, box: L.box.split(',').length, ty: [...new Set(tr.map(e => e[1]))].sort().join(' '), neg: tr.every(e => e[0] <= 0 && e[0] > -20000), msg: __ny.ODD.msg(L), odd: __w.filter(w => w[0] === 'push' && /^logs\/nyang\/[\d-]+\/[\w]+\/odd$/.test(w[1]) && w[2].why !== 'auto').map(w => w[2].why + '/' + w[2].t), auto: __w.filter(w => w[0] === 'push' && /\/odd$/.test(w[1]) && w[2].why === 'auto').map(w => w[2].sig).join(), toast: (document.querySelector('.toast') || {}).textContent }; });
    T.ok(b1 && b1.why === 'btn' && b1.reg === b1.n * b1.n && b1.box === 4 && b1.neg && ['!gap', '!undrag', 'd', 'm', 'p', 'u', 'x+'].every(t => b1.ty.split(' ').includes(t)), '㉒ 🐞 한 번 누르면 직전 20초 입력(닿음 · 지나감 · 뗌 · 결과 · 신호) + 판 모양을 묶음: ' + JSON.stringify({ ty: b1 && b1.ty, n: b1 && b1.n }));
    T.ok(b1.odd.join() === 'btn/TS' && /보냈어요/.test(b1.toast || ''), '㉒ 기록(logs/nyang/날짜/세션/odd)에 남기고 알림: ' + JSON.stringify([b1.odd, b1.toast]));
    T.ok(b1.auto === 'sig:undrag,sig:gap', '㉒ 신호가 날 때마다 그때의 입력 기록이 저절로 남음 (알림 없음): ' + b1.auto);
    T.ok(/^\[이상해요\] 초급 \d칸 한 판 · 신호 undrag1 gap1 · v\d+ · 기록 [\d-]+\/\w+\n/.test(b1.msg) && /✕켬\(2,2\)/.test(b1.msg) && b1.msg.length <= 500, '㉒ 베니 님 폰 알림 한 줄 (500자 안): ' + b1.msg.replace(/\n/g, ' ⏎ ').slice(0, 150));
    const b2 = await Y.evaluate(() => { document.getElementById('oddBtn').click(); return { odd: __w.filter(w => w[0] === 'push' && /\/odd$/.test(w[1]) && w[2].why !== 'auto').length, toast: (document.querySelector('.toast') || {}).textContent }; });
    T.ok(b2.odd === 1 && /방금 보냈어요/.test(b2.toast || ''), '㉒ 15초 안에 또 누르면 한 번만 보냄: ' + JSON.stringify(b2));
    // flip: 같은 칸 ✕ 를 세 번 켰다 껐다
    const F = await freeW([]);
    await tap(Y, F); await T.sleep(450); await tap(Y, F);
    const f2 = await st();
    await T.sleep(450); await tap(Y, F);
    const f3 = await st();
    T.ok(!f2.cnt.flip && f3.cnt.flip === 1 && f3.snap === 'sig:flip', '㉒ 같은 칸 ✕ 를 2.5초 안에 세 번 켰다 껐다 하면 flip 1 (두 번은 아님): ' + JSON.stringify(f3.cnt));
    // miss: 두 번 톡이 안 먹혀 다시 함 (한 번 · 쉬고 · 두 번) / 평소 두 번 톡은 아님
    const ans = await ansOf(Y);
    await cat(Y, ans[0]);
    const m0 = await st();
    await tap(Y, ans[1]); await T.sleep(450); await cat(Y, ans[1]);
    const m1 = await st();
    T.ok(!m0.cnt.miss && m1.cnt.miss === 1 && m1.inp.dbl === 2, '㉒ 따로 한 번 누른 직후(0.45초) 두 번 톡으로 고양이면 miss 1 (평소 두 번 톡은 아님): ' + JSON.stringify(m1.cnt));
    await tap(Y, ans[2]); await T.sleep(1000); await cat(Y, ans[2]);   // ✕ 를 쳐 두고 1초 뒤 생각을 바꿔 고양이 = 신호 아님
    T.ok((await st()).cnt.miss === 1, '㉒ ✕ 치고 1초 뒤 마음을 바꿔 고양이를 놓은 것은 miss 아님');
    await Y.evaluate(() => localStorage.removeItem('nyang.dblWin'));   // 위 miss 로 이 폰의 두 번 톡 시간이 넉넉해짐(㉔) — 아래 0.45초 톡 시험은 기본 0.4초로
    // slip: ✕ 가 있던 칸에 고양이가 놓여 실수
    const W = await freeW([F]);
    await tap(Y, W); await T.sleep(1700); await cat(Y, W);
    const p1 = await st();
    T.ok(p1.cnt.slip === 1 && p1.m === m1.m + 1 && p1.cnt.miss === 1 && p1.inp.bad === 1 && p1.inp.dbl === 4, '㉒ ✕ 가 있던 칸에 두 번 톡이 먹혀 실수가 되면 slip 1: ' + JSON.stringify(p1.cnt));
    // 판이 끝나면 기록 한 줄에 신호 · 입력 수, 결과창에 물음 (하루 한 번)
    await solve(Y);
    await U.waitFor(Y, () => !document.getElementById('resBox').hidden, null, 6000);
    const e1 = await Y.evaluate(() => { const u = __w.filter(w => w[0] === 'update' && /\/matches\//.test(w[1])).pop(), a = document.getElementById('oddAsk'); return { m: u && u[2], ask: a && a.textContent.replace(/\s+/g, ' ').trim(), day: localStorage.getItem('nyang.oddAsk'), today: JSON.stringify(__ny.kstDay()) }; });
    T.ok(e1.m && e1.m.won === true && e1.m.sus && e1.m.sus.flip === 1 && e1.m.sus.gap === 1 && e1.m.sus.undrag === 1 && e1.m.sus.miss === 1 && e1.m.sus.slip === 1 && e1.m.inp.tap >= 6 && e1.m.inp.dbl >= n && e1.m.inp.drag === 3, '㉒ 판 기록 한 줄에 의심 신호(sus) · 입력 수(inp): ' + JSON.stringify(e1.m && [e1.m.sus, e1.m.inp]));
    T.ok(/뜻대로 안 된 적이 있었나요\?.*네, 있었어요.*아니요/.test(e1.ask || '') && e1.day === e1.today, '㉒ 신호가 있었던 판의 결과창에 물음: ' + e1.ask);
    const y1 = await Y.evaluate(() => { document.querySelector('#oddAsk [data-a="y"]').click(); const L = __ny.ODD.last; return { why: L.why, sig: L.sig, gone: !document.getElementById('oddAsk'), odd: __w.filter(w => w[0] === 'push' && /\/odd$/.test(w[1]) && w[2].why !== 'auto').map(w => w[2].why).join(), toast: (document.querySelector('.toast') || {}).textContent }; });
    T.ok(y1.why === 'ask-yes' && /^sig:/.test(y1.sig) && y1.gone && y1.odd === 'btn,ask-yes' && /보냈어요/.test(y1.toast || ''), '㉒ [네] 를 누르면 그 신호 때의 입력 기록을 보냄: ' + JSON.stringify(y1));
    // 같은 날 다음 판: 신호가 있어도 다시 안 물음 · 신호 수는 새 판에서 0부터
    await Y.evaluate(() => document.querySelector('#resBtns .btn').click());
    await U.waitFor(Y, () => !document.getElementById('home').hidden || (window.__ny.G && !window.__ny.G.over), null, 4000);
    if (await Y.evaluate(() => !document.getElementById('home').hidden)) await begin();
    else await U.waitFor(Y, () => window.__ny.G && !window.__ny.G.over && document.getElementById('board').children.length === window.__ny.G.n ** 2 && !document.getElementById('play').hidden, null, 6000);
    await T.sleep(300);
    await Y.evaluate(() => { __ny.G.autoX = false; });
    const z0 = await st();
    const F2 = await freeW([]);
    await tap(Y, F2); await T.sleep(450); await tap(Y, F2); await T.sleep(450); await tap(Y, F2);
    const z1 = await st();
    await solve(Y);
    await U.waitFor(Y, () => !document.getElementById('resBox').hidden, null, 6000);
    const e2 = await Y.evaluate(() => ({ ask: !!document.getElementById('oddAsk'), m: (__w.filter(w => w[0] === 'update' && /\/matches\//.test(w[1])).pop() || [])[2] }));
    T.ok(!Object.keys(z0.cnt).length && z1.cnt.flip === 1 && !e2.ask && e2.m.sus && e2.m.sus.flip === 1 && !e2.m.sus.gap, '㉒ 같은 날엔 다시 안 물음 · 신호는 판마다 따로 셈: ' + JSON.stringify([z1.cnt, e2.ask, e2.m && e2.m.sus]));
    await Y.evaluate(() => { for (const k of ['nyang.oddAsk', 'nyang.oddSent', 'nyang.avg', 'nyang.today', 'nyang.solved', 'nyang.bestT']) localStorage.removeItem(k); });
    await Y.close();
  }

  // ── ㉓ 11-13 베니 님 '소리 버튼 필요해? 음소거랑 볼륨으로 하면 되지 · 자동으로 ✕ 쳐지게 하자 그것도'
  //    아래 단추 = 힌트 · ✕ 지우기 · 처음부터 · 이상해요. 예전에 자동 ✕ 를 꺼 둔 폰도 고양이를 놓으면 둘레 · 같은 줄 · 같은 묶음에 저절로 ✕
  {
    const V = await T.open('nyang/');
    await U.waitFor(V, A.ready);
    await V.evaluate(() => { localStorage.setItem('nyang.autoX', 'false'); localStorage.setItem('nyang.sound', '0'); });
    await V.reload({ waitUntil: 'load' }); await U.waitFor(V, A.ready);
    await V.evaluate(() => { document.querySelector('#soloMode [data-v="one"]').click(); document.querySelector('#tiers [data-t="easy"]').click(); document.getElementById('startBtn').click(); });
    await U.waitFor(V, () => window.__ny.G && !window.__ny.G.over && !document.getElementById('play').hidden && document.getElementById('board').children.length === window.__ny.G.n ** 2, null, 6000);
    const v0 = await V.evaluate(() => ({ dock: [...document.getElementById('dock').children].filter(e => !e.hidden).map(e => e.id).join(), xs: __ny.G.xs.size, snd: window.NYSND && NYSND.on }));
    T.ok(v0.dock === 'hintBtn,clearX,restart,oddBtn' && v0.xs === 0 && v0.snd === true, '㉓ 아래 단추는 힌트 · ✕ 지우기 · 처음부터 · 이상해요 (자동 ✕ · 소리 단추 없음, 소리는 켬): ' + JSON.stringify(v0));
    const a0 = (await ansOf(V))[0];
    await cat(V, a0);
    const v1 = await V.evaluate(k => { const G = __ny.G, bl = G.blockedBy(k); return { cat: G.cats.has(k), all: bl.every(b => G.xs.has(b)), n: bl.length, xs: G.xs.size, shown: bl.every(b => document.getElementById('board').children[b].classList.contains('x') || /✕|×/.test(document.getElementById('board').children[b].textContent) || G.xs.has(b)) }; }, a0);
    T.ok(v1.cat && v1.all && v1.n > 0 && v1.xs === v1.n, '㉓ 고양이를 놓으면 둘레 · 같은 줄 · 같은 묶음에 저절로 ✕ (꺼 두었던 폰도): ' + JSON.stringify(v1));
    await V.evaluate(() => { for (const k of ['nyang.autoX', 'nyang.sound', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); });
    await V.close();
  }

  // ── ㉔ 11-13 베니 님 '두 번 눌렀는데 ✕ 로만 되고, 다시 두 번 누르면 ✕ 가 취소' → 개선
  //    두 번 톡이 0.4초를 살짝 넘는 사람: 빈칸에 ✕ 켜고 끔(0.4~0.75초) 직후 다시 두 번 톡으로 고양이를 놓으면 '두 번 톡이 안 먹힌 것' 으로 보고
  //    이 폰의 두 번 톡 시간을 그 간격만큼 넉넉하게 (최대 0.6초). 빈칸에서 시작한 두 번만 넓힘 — ✕ 가 있던 칸(지우려던 톡)은 0.4초 그대로
  {
    const W = await T.open('nyang/');
    await U.waitFor(W, A.ready);
    await W.evaluate(() => { localStorage.removeItem('nyang.dblWin'); localStorage.removeItem('nyang.dblWinTold'); document.querySelector('#soloMode [data-v="one"]').click(); document.querySelector('#tiers [data-t="easy"]').click(); document.getElementById('startBtn').click(); });
    await U.waitFor(W, () => window.__ny.G && !window.__ny.G.over && !document.getElementById('play').hidden && document.getElementById('board').children.length === window.__ny.G.n ** 2, null, 6000);
    await T.sleep(300);
    const sv = k => W.evaluate(k => ({ cat: __ny.G.cats.has(k), x: __ny.G.xs.has(k), m: __ny.G.mistakes, win: JSON.parse(localStorage.getItem('nyang.dblWin') || 'null') }), k);
    const [a0, a1] = await ansOf(W);
    await tap(W, a0); await T.sleep(480); await tap(W, a0);                 // 0.48초 두 번 → 아직은 ✕ 켜고 끔
    const w0 = await sv(a0);
    await T.sleep(900); await cat(W, a0);                                    // 안 먹힌 것을 보고 잠깐 뒤 다시 두 번 톡
    const w1 = await sv(a0);
    T.ok(!w0.cat && !w0.x && w1.cat && w1.win >= 480 && w1.win <= 600, '㉔ 0.48초 두 번이 ✕ 켜고 끔이 된 뒤 바로 두 번 톡으로 고양이 → 이 폰은 두 번 톡 시간을 넉넉하게: ' + JSON.stringify([w0, w1]));
    await T.sleep(450);
    await tap(W, a1); await T.sleep(480); await tap(W, a1);
    const w2 = await sv(a1);
    T.ok(w2.cat && w2.m === 0, '㉔ 그 뒤로는 0.48초 두 번도 고양이: ' + JSON.stringify(w2));
    // 지킬 것: ✕ 가 있던 칸을 지웠다 다시 켠 것(0.48초)은 고양이 아님 (틀린 칸이면 🐟 를 잃음) · 0.7초 띄운 두 번도 고양이 아님
    await T.sleep(450);
    const [f1, f2] = await wrongOf(W);
    await W.evaluate(k => { __ny.G.setX(k, true); }, f1);
    await tap(W, f1); await T.sleep(480); await tap(W, f1);
    const w3 = await sv(f1);
    await T.sleep(450);
    await tap(W, f2); await T.sleep(700); await tap(W, f2);
    const w4 = await sv(f2);
    T.ok(!w3.cat && w3.x && !w4.cat && !w4.x && w4.m === 0, '㉔ ✕ 를 지웠다 다시 켠 것 · 0.7초 띄운 두 번은 고양이 아님 (🐟 그대로): ' + JSON.stringify([w3, w4]));
    await W.evaluate(() => { for (const k of ['nyang.dblWin', 'nyang.dblWinTold', 'nyang.avg', 'nyang.today']) localStorage.removeItem(k); });
    await W.close();
  }

  T.ok(T.errors.length === 0, '콘솔·페이지 오류 없음 (' + T.errors.slice(0, 4).join(' | ') + ')');
}, 'nyang ui');

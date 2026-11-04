// 지렁이 화면 시험 (브라우저, 소리 없음, Firebase 없음 ?mock): node snake/test/ui.js
//   공통 틀: 메뉴(자체 이름·관리자·방 화면 없음) · 공통 이름(GME) · 🏆 랭킹(GRank) · 친구랑(ArenaUI 8명 · 방장 설정 · 늦게 온 사람 · 대기실 왕복)
//           보내기(상태=빠른 통로, 전체 맞춤=꼭 도착 통로 · 서버 경유면 두 틱마다) · 감지 기록(자기 자리에만) · 관리자 감지기 단추
//           진짜 common/arena.js 길(가짜 Firebase · 서버 경유) — 나머지는 mock
//   slither 콘솔 도구: 가짜 slither 화면 slither-fixture.html 위에서
//     29 slither-probe: 벽 거리를 원점이 아니라 (grd,grd) 중심으로 재야 함
//     33·34 autopilot / autopilot-min / bot3 / brain: 다시 붙여넣어도 그리기 반복(rAF)이 하나만
const fs = require('fs'), path = require('path');
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/snake');

const SN = path.join(U.ROOT, 'snake');
const read = f => fs.readFileSync(path.join(SN, f), 'utf8');
const ready = async p => { if (!(await U.waitFor(p, A.ready, null, 15000))) throw new Error('지렁이 화면 준비 안 됨'); await U.sleep(200); };

// 혼자: 혼자 탭에서 진짜 단추로 고르고 시작. 게임이 뜨면 true
const solo = (p, o) => p.evaluate(async o => {
  const $ = id => document.getElementById(id), pick = (id, v) => { const b = $(id).querySelector(`[data-v="${v}"]`); if (b) b.click(); };
  if (o.helper) window.__helperPreset = {};
  pick('gameMode', o.mode); pick('speedSel', '20'); pick('aiLevel', o.ai || 'mid'); pick('aiCount', String(o.n == null ? 3 : o.n)); pick('helperSel', o.helper ? 'on' : 'none');
  for (let i = 0; i < 30 && !$('menu').hidden; i++) { $('solo').click(); await new Promise(r => setTimeout(r, 100)); }
  return $('menu').hidden;
}, o);
const stubRank = p => p.evaluate(() => { window.__rk = []; if (window.GRank) GRank.result = (g, r) => { window.__rk.push({ g, ...JSON.parse(JSON.stringify(r)) }); }; });
const backToMenu = p => p.evaluate(A.home);
// 시험 판: 지렁이들이 벽·서로에 부딪혀 판이 먼저 끝나지 않게 (보호 상태: 벽에 닿으면 가운데로 돎)
const protect = H => H.evaluate(() => window.__snake.sim.snakes.forEach(s => { s.protectUntil = performance.now() + 120000; }));
// 대기실에서 방장이 ⚙️ 설정 고르기 (data-set 안 진짜 단추)
const setRoom = (H, o) => H.evaluate(o => { for (const [k, v] of Object.entries(o)) { const b = document.querySelector(`[data-set] [data-${k}="${v}"]`); if (b) b.click(); } }, o);
// 방장 탭 → 방 만들기까지. 코드를 돌려줌
async function hostRoom(T, extra) {
  const H = await T.open('snake/', extra);
  await ready(H);
  await H.evaluate(A.online.open);
  await U.waitFor(H, () => { const b = document.querySelector('[data-host]'); return b && !b.disabled; }, null, 8000);
  await H.click('[data-host]');
  const code = await U.waitFor(H, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, null, 15000);
  if (!code) throw new Error('방 코드 안 생김');
  return { H, code };
}
const guest = async (T, code, extra) => { const W = await T.open('snake/', (extra ? extra + '&' : '') + 'room=' + code); await ready(W); return W; };
const seats = (H, n) => U.waitFor(H, n => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= n, n, 15000);
const startRoom = async (H, ...Ws) => {
  await U.waitFor(H, () => { const b = document.querySelector('[data-start]'); return b && !b.disabled; }, null, 8000);
  await H.click('[data-start]');
  for (const p of [H, ...Ws]) if (!(await U.waitFor(p, A.online.started, null, 15000))) throw new Error('판이 시작 안 됨');
};

async function snakeTests(T) {
  // ── 메뉴: 자체 이름 칸 · 관리자 단추·로그인 창 · 방 목록·대기실 화면이 없고, 혼자 설정·색·🏆 랭킹은 있음
  {
    const p = await T.open('snake/');
    await ready(p);
    const d = await p.evaluate(() => ({
      gone: ['name', 'meChip', 'adminBtn', 'adminBtn2', 'pauseAdmin', 'login', 'pw', 'rooms', 'newRoom', 'code', 'code2', 'hostBtn', 'joinBtn', 'lobby', 'lbStart', 'lbCode', 'lbLink', 'lbPlayers', 'lbChat', 'lbName', 'lbColors', 'gchat', 'gchatForm', 'chatBtn', 'inviteHead'].filter(id => document.getElementById(id)),
      keep: ['colors', 'solo', 'rankBtn', 'helpBtn', 'tabSolo', 'tabFriend', 'speedSel', 'gameMode', 'aiLevel', 'aiCount', 'helperSel', 'acBtn', 'admin', 'copyLink'].filter(id => !document.getElementById(id)),
      net: ['adminLogin', 'host', 'join', 'listRooms', 'deleteRoom'].filter(k => k in NET),
      scripts: [...document.scripts].map(s => (s.getAttribute('src') || '').split('?')[0]).filter(Boolean),
      arena: !!window.Arena && !!window.ArenaUI && !!window.GRank && !!window.GME,
    }));
    T.ok(!d.gone.length, `옛 화면 요소가 없어야 함: ${d.gone.join(',')}`);
    T.ok(!d.keep.length, `남아야 할 요소: ${d.keep.join(',')}`);
    T.ok(!d.net.length, `쓰지 않게 된 NET 함수가 없어야 함: ${d.net.join(',')}`);
    T.ok(d.arena, `공통 모듈(Arena·ArenaUI·GRank·GME)이 있어야 함: ${d.scripts.join(' ')}`);
    const order = ['../common/cozy.js', '../common/me.js', '../common/rank.js', '../common/arena-mock.js', '../common/arena.js', '../common/arena-ui.js', 'net.js', 'main.js'].map(s => d.scripts.indexOf(s));
    T.ok(order.every((v, i) => v >= 0 && (!i || v > order[i - 1])), `스크립트 순서 (volley 와 같게): ${d.scripts.join(' ')}`);
    await p.close();
  }

  // ── 이름: 공통 프로필 (GME). 옛 snake-name 은 안 씀, 없으면 '나' (mock 은 이름 창 없음)
  {
    const p = await T.open('snake/');
    await ready(p);
    await p.evaluate(() => { localStorage.setItem('snake-name', '옛이름'); localStorage.setItem('game.me', JSON.stringify({ pid: 'pSnk', name: '베니' })); });
    await p.reload({ waitUntil: 'load' });
    await ready(p);
    T.ok(await solo(p, { mode: 'free' }), '혼자 시작 (이름 있음)');
    const nm = await p.evaluate(() => window.game.me && window.game.me.name);
    T.ok(nm === '베니', `혼자 판 이름 = 공통 프로필 (${nm})`);
    T.ok(await p.evaluate(() => localStorage.getItem('snake-name') === '옛이름'), '옛 저장값을 새로 쓰지 않음');
    await backToMenu(p);
    await p.evaluate(() => { localStorage.removeItem('game.me'); localStorage.removeItem('snake-name'); });
    await p.reload({ waitUntil: 'load' });
    await ready(p);
    T.ok(await solo(p, { mode: 'free' }), '혼자 시작 (이름 없음)');
    const r = await p.evaluate(() => ({ n: window.game.me && window.game.me.name, dlg: !!document.querySelector('.gme-ov') }));
    T.ok(r.n === '나' && !r.dlg, `이름 없으면 '나', mock 은 이름 창 없음 (${JSON.stringify(r)})`);
    await p.close();
  }

  // ── 첫 화면 틀 (CONVENTIONS '화면 틀'): 탭 혼자·친구랑 · 카드 = 고를 것 → ul.howto → 큰 시작! → 맨 아래 작은 줄 하는 법·랭킹
  {
    const p = await T.open('snake/');
    await ready(p);
    const d = await p.evaluate(() => {
      const card = document.querySelector('#menu .card'), kids = [...card.children];
      const idx = sel => kids.findIndex(k => k.matches(sel) || !!k.querySelector(sel));
      const minor = card.querySelector('.row.center.minor'), start = document.getElementById('solo');
      return {
        tabs: [...card.querySelectorAll('.tabs .btn')].map(b => b.textContent.trim()),
        order: { tabs: idx('.tabs'), mode: idx('#gameMode'), ai: idx('#aiLevel'), speed: idx('#speedSel'), color: idx('#colors'), helper: idx('#helperSel'), howto: idx('ul.howto'), start: kids.indexOf(start), minor: kids.indexOf(minor) },
        start: start.textContent.trim(), startCls: start.className,
        minor: minor ? [...minor.querySelectorAll('.btn.ghost')].map(b => b.textContent.trim()) : [],
        rankBig: /big|primary/.test(document.getElementById('rankBtn').className),
        fits: document.getElementById('menu').scrollHeight <= document.getElementById('menu').clientHeight,
        over: document.getElementById('menu').scrollHeight - document.getElementById('menu').clientHeight,
      };
    });
    T.ok(d.tabs.join('·') === '혼자·친구랑', `탭 (${d.tabs.join('·')})`);
    const o = d.order;
    T.ok(o.tabs < o.mode && o.mode < o.howto && o.ai < o.howto && o.speed < o.howto && o.color < o.howto && o.helper < o.howto && o.howto < o.start && o.start < o.minor, `카드 순서 고를 것 → 안내 → 시작! → 작은 줄 (${JSON.stringify(o)})`);
    T.ok(d.start === '시작!' && /primary/.test(d.startCls) && /big/.test(d.startCls), `큰 시작! (${d.start})`);
    T.ok(d.minor.join('·') === '❓ 하는 법·🏆 랭킹' && !d.rankBig, `맨 아래 작은 줄 (${d.minor.join('·')})`);
    T.ok(d.fits, `폰 첫 화면이 스크롤 없이 들어감 (${d.over}px 넘침)`);
    await p.click('#helpBtn');
    T.ok(await U.waitFor(p, () => /하는 법/.test((document.querySelector('.overlay:not([hidden]) h2') || {}).textContent || ''), null, 2000), '❓ 하는 법 창');
    await p.evaluate(() => { for (const b of document.querySelectorAll('.overlay:not([hidden]) button')) if (/알겠어요/.test(b.textContent)) b.click(); });
    // 혼자 탭에서 고르고 시작! 한 번에 게임으로 (설정 화면을 또 넘기지 않음)
    await p.click('#gameMode [data-v="round"]');
    await U.waitFor(p, () => !!window.__snake && window.__snake.mode === 'menu', null, 2000);
    await p.click('#solo');
    T.ok(await U.waitFor(p, () => window.__snake.mode === 'solo' && window.__snake.sim && window.__snake.sim.mode === 'round' && document.getElementById('menu').hidden, null, 5000), '시작! 한 번에 고른 방식으로 게임');
    await U.sleep(400);
    const soloOverlap = await p.evaluate(() => {
      const r = id => { const e = document.getElementById(id); return e && !e.hidden ? e.getBoundingClientRect() : null; };
      const a = { top: r('topbtn'), timer: r('timer'), lb: r('lb') }, ks = Object.keys(a).filter(k => a[k]), out = [];
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const x = a[ks[i]], y = a[ks[j]]; if (x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom) out.push(ks[i] + '×' + ks[j]); }
      return out;
    });
    T.ok(!soloOverlap.length, '혼자 판: 폰 위쪽 표시가 안 겹침 (' + soloOverlap.join(' ') + ')');
    await p.close();
  }

  // ── 🏆 랭킹: 단추 · 혼자 판 결과 (끝이 있는 판만, 1등 = 승, 각자 한 번)
  {
    const p = await T.open('snake/');
    await ready(p);
    await p.click('#rankBtn');
    T.ok(await U.waitFor(p, () => !!document.querySelector('.rk-ov'), null, 3000), '🏆 랭킹 단추 → 랭킹 창');
    await p.evaluate(() => { const x = document.querySelector('.rk-x'); if (x) x.click(); });
    // 메뉴 내 기록은 GRank 에서 읽음
    await p.evaluate(() => { GRank.mine = async () => ({}); GRank.line = (g, t) => g === 'snake' ? (t ? `${t} 2승 1패` : '3승 2패') : ''; dispatchEvent(new CustomEvent('grank', { detail: { game: 'snake' } })); });
    T.ok(await U.waitFor(p, () => /3승 2패/.test((document.getElementById('myRec') || {}).textContent || ''), null, 2000), '메뉴에 내 기록 (GRank.line)');
    await stubRank(p);
    const ends = async (o, len) => {
      T.ok(await solo(p, o), `혼자 시작 ${o.mode}`);
      await p.evaluate(len => { const S = window.__snake, m = window.game.me; S.sim.snakes.forEach(s => { if (s.id !== 'me') s.length = 50; }); m.length = len; S.sim.tick += 200 * (S.sim.hz || 20); }, len);
      T.ok(await U.waitFor(p, () => !document.getElementById('results').hidden, null, 6000), `${o.mode} 결과 창`);
      await U.sleep(600);                                                   // 결과 창이 떠 있는 동안 두 번 세지 않음
      const rk = await p.evaluate(() => window.__rk.splice(0));
      await p.evaluate(() => document.getElementById('resMenu').click());
      return rk;
    };
    let rk = await ends({ mode: 'round', ai: 'mid', n: 3 }, 500);
    T.ok(rk.length === 1 && rk[0].g === 'snake' && rk[0].mode === 'ai' && rk[0].tier === 'mid' && rk[0].res === 'w' && rk[0].beat === 3 && rk[0].score >= 400, `라운드 1등 → 승 (${JSON.stringify(rk)})`);
    rk = await ends({ mode: 'round', ai: 'hard', n: 3 }, 12);
    T.ok(rk.length === 1 && rk[0].tier === 'hard' && rk[0].res === 'l' && rk[0].beat === 0, `라운드 1등 아님 → 패 (${JSON.stringify(rk)})`);
    rk = await ends({ mode: 'royale', ai: 'rule', n: 3 }, 500);
    T.ok(rk.length === 1 && rk[0].mode === 'ai' && rk[0].tier === 'rule', `배틀로얄도 셈 (${JSON.stringify(rk)})`);
    rk = await ends({ mode: 'round', ai: 'mid', n: 0 }, 50);
    T.ok(rk.length === 0, `AI 0마리 혼자 판은 안 셈 (${JSON.stringify(rk)})`);
    // 자유 모드: 죽고 나가도 안 셈
    T.ok(await solo(p, { mode: 'free' }), '자유 시작');
    await p.evaluate(() => { const S = window.__snake; S.sim.snakes.find(s => s.id === 'me').head = [99, 99]; S.ff(5); });
    await U.sleep(400);
    T.ok((await p.evaluate(() => window.__rk.length)) === 0, '자유 모드는 안 셈');
    await backToMenu(p);
    // 헬퍼를 켠 판은 안 셈 (자동 조종으로 순위를 올리지 못하게)
    await p.evaluate(() => { window.__snakeHelper = window.__snakeHelper || { apply() {}, off() {} }; });
    rk = await ends({ mode: 'round', ai: 'mid', n: 3, helper: true }, 500);
    T.ok(rk.length === 0, `헬퍼 켠 판은 안 셈 (${JSON.stringify(rk)})`);
    await p.close();
  }

  // ── 친구랑: ArenaUI 대기실 · 방장 설정 · 8명까지 · 입력 · 내 색 · 랭킹 · 대기실 왕복
  {
    const { H, code } = await hostRoom(T);
    await H.evaluate(() => { localStorage.setItem('snake-hue', '330'); });
    const W = await T.open('snake/', 'room=' + code);
    await ready(W);
    T.ok(await seats(H, 2), '손님이 초대 주소로 들어옴');
    const l0 = await H.evaluate(() => { const n = ArenaUI.net; return { max: n.meta.max, count: (document.querySelector('[data-count]') || {}).textContent || '', start: document.querySelector('[data-start]') ? document.querySelector('[data-start]').textContent : '', sets: document.querySelectorAll('[data-set] [data-mode]').length, share: !!document.querySelector('[data-share]'), acc: !!document.querySelector('[data-acc]'), chat: !!document.querySelector('[data-lchat] .arn-cin') }; });
    T.ok(l0.max === 8, `방 최대 8명 (${l0.max})`);
    T.ok(/2명/.test(l0.start), `들어온 사람 수로 시작 (${l0.start})`);
    T.ok(l0.sets === 3 && l0.share && l0.acc && l0.chat, `대기실: 설정·초대 링크·제목·비밀번호·채팅은 ArenaUI (${JSON.stringify(l0)})`);
    await setRoom(H, { mode: 'round', hz: '10', ailv: 'easy', ain: '3' });
    const gset = await U.waitFor(W, () => { const b = document.querySelector('[data-set] [data-mode="round"]'); return b && b.disabled && /round/.test(JSON.stringify(ArenaUI.net.meta.cfg)) ? JSON.stringify(ArenaUI.net.meta.cfg) : null; }, null, 4000);
    T.ok(gset, '손님에겐 방장 설정이 보이고 못 바꿈');
    await W.evaluate(() => { const b = document.querySelector('[data-set] [data-myhue="85"]'); if (b) b.click(); });
    await startRoom(H, W);
    await protect(H);
    const s0 = await H.evaluate(() => { const S = window.__snake, sim = S.sim; return { mode: sim.mode, hz: sim.hz, ai: sim.snakes.filter(s => s.kind === 'easy').length, humans: sim.snakes.filter(s => s.kind === 'human').map(s => ({ id: s.id, hue: s.hue, name: s.name })), rd: S.round, room: !document.getElementById('room').hidden, lobby: !document.querySelector('.arn-ov:not([hidden])') }; });
    // 폰 위쪽 표시가 서로 겹치지 않음 (방 표시 · 메뉴 단추 · 남은 시간 · 순위표)
    await U.sleep(400);
    const hudOverlap = await H.evaluate(() => {
      const r = id => { const e = document.getElementById(id); return e && !e.hidden ? e.getBoundingClientRect() : null; };
      const a = { room: r('room'), top: r('topbtn'), timer: r('timer'), lb: r('lb') }, ks = Object.keys(a).filter(k => a[k]), out = [];
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const x = a[ks[i]], y = a[ks[j]]; if (x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom) out.push(ks[i] + '×' + ks[j]); }
      return out;
    });
    T.ok(!hudOverlap.length, `폰 위쪽 표시가 안 겹침 (${hudOverlap.join(' ')})`);
    // 메뉴 창에 초대 링크 (게임 중에도 친구를 부름)
    await H.click('#toMenu');
    T.ok(await H.evaluate(() => !document.getElementById('copyLink').hidden && !document.getElementById('toLobby').hidden), '메뉴 창: 초대 링크 복사 · 모두 대기실로');
    await H.click('#resume');
    T.ok(s0.mode === 'round' && s0.hz === 10 && s0.ai === 3 && s0.humans.length === 2, `방장 설정대로 판이 만들어짐 (${JSON.stringify(s0)})`);
    T.ok(s0.lobby && s0.room, '시작하면 대기실 창이 닫히고 방 표시');
    T.ok(s0.humans.some(h => h.hue === 85), `손님이 고른 색이 방장 판에 (${JSON.stringify(s0.humans)})`);
    const g0 = await W.evaluate(() => ({ n: window.game.snakes.length, hz: window.game.hz, me: window.game.me && window.game.me.name }));
    T.ok(g0.n === 5 && !!g0.me, `손님 화면에 5마리 (${JSON.stringify(g0)})`);
    T.ok(await U.waitFor(W, () => window.game.snakes.every(s => s.name), null, 4000), '손님 화면에 이름이 곧 보임');

    // 손님의 진짜 손가락 → 방장 판의 입력
    const uid = await W.evaluate(() => ArenaUI.net.uid);
    await W.evaluate(() => { const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2 + 100, clientY: r.top + r.height / 2 }; cv.dispatchEvent(new PointerEvent('pointerdown', o)); });
    const inp = await U.waitFor(H, u => { const i = window.__snake.sim.inputs[u]; return i && i.aim != null ? String(i.aim) : null; }, uid, 3000);
    T.ok(inp != null && Math.abs(Number(inp)) < 0.05, `손님 손가락 조준이 방장 판으로 (${inp})`);

    // 보내기: 상태=빠른 통로 매 틱, 전체 맞춤=꼭 도착 통로 30틱마다, 입력은 빠른 통로
    const wire = await H.evaluate(async () => {
      const n = ArenaUI.net, o = n.send, log = { s: 0, y: 0, sRel: 0, yRel: 0, sBytes: 0, yBytes: 0 }, t0 = window.__snake.sim.tick;
      n.send = (u, m, r) => { if (m.t === 's') { log.s++; if (r) log.sRel++; log.sBytes = JSON.stringify(m).length; } if (m.t === 'y') { log.y++; if (r) log.yRel++; log.yBytes = JSON.stringify(m).length; } return o.call(n, u, m, r); };
      await new Promise(r => setTimeout(r, 3100));
      n.send = o; log.ticks = window.__snake.sim.tick - t0;
      return log;
    });
    T.ok(wire.ticks > 10 && Math.abs(wire.s - wire.ticks) <= 2 && wire.sRel === 0, `상태는 매 틱 빠른 통로 (${JSON.stringify(wire)})`);
    T.ok(wire.y >= 1 && wire.y <= Math.ceil(wire.ticks / 30) + 1 && wire.yRel === wire.y, `전체 맞춤은 30틱마다 꼭 도착 통로 (${JSON.stringify(wire)})`);
    const up = await W.evaluate(async () => {
      const n = ArenaUI.net, o = n.send, log = { i: 0, rel: 0 };
      n.send = (m, r) => { if (m.t === 'i') { log.i++; if (r) log.rel++; } return o.call(n, m, r); };
      await new Promise(r => setTimeout(r, 2000));
      n.send = o; return log;
    });
    T.ok(up.i >= 8 && up.i <= 42 && up.rel === 0, `손님 입력: 안 바뀌어도 0.2초마다, 많아도 초당 20번, 빠른 통로 (${JSON.stringify(up)})`);
    // 서버 경유: 두 틱마다 한 번만 (RTDB down = 최신 값 하나), 전체 맞춤도 꼭 전할 줄(downq)에 안 넣음
    const relay = await H.evaluate(async () => {
      const n = ArenaUI.net, o = n.send, op = n.peers, log = { s: 0, y: 0, rel: 0 }, t0 = window.__snake.sim.tick;
      n.peers = () => op.call(n).map(([u]) => [u, false]);
      n.send = (u, m, r) => { if (r) log.rel++; if (m.t === 's') log.s++; if (m.t === 'y') log.y++; };
      await new Promise(r => setTimeout(r, 3100));
      n.send = o; n.peers = op; log.ticks = window.__snake.sim.tick - t0;
      return log;
    });
    T.ok(relay.ticks > 10 && relay.s + relay.y <= Math.ceil(relay.ticks / 2) + 3 && relay.s >= relay.ticks / 2 - 3 && relay.rel === 0, `서버 경유는 두 틱마다 · 꼭 전할 줄 안 씀 (${JSON.stringify(relay)})`);

    // 판 끝: 각자 한 번 GRank (친구 판), 1등 = 승, 상대는 사람만
    await stubRank(H); await stubRank(W);
    const wuid = await W.evaluate(() => ArenaUI.net.uid);
    await H.evaluate(u => { const sim = window.__snake.sim; sim.snakes.forEach(s => { s.length = s.id === u ? 300 : 100; }); sim.tick += 200 * sim.hz; }, wuid);
    const over = await Promise.all([H, W].map(p => U.waitFor(p, () => !document.getElementById('results').hidden, null, 8000)));
    T.ok(over[0] && over[1], '두 화면 다 결과 창');
    await U.sleep(600);
    const [rh, rw] = await Promise.all([H, W].map(p => p.evaluate(() => window.__rk.slice())));
    T.ok(rw.length === 1 && rw[0].mode === 'friend' && rw[0].res === 'w' && rw[0].beat === 1 && rw[0].opp.length === 1 && rw[0].opp[0].res === 'w' && rw[0].score >= 200, `손님 1등 → 친구 판 승 (${JSON.stringify(rw)})`);
    T.ok(rh.length === 1 && rh[0].mode === 'friend' && rh[0].res === 'l' && rh[0].beat === 0 && rh[0].opp.length === 1 && rh[0].opp[0].uid === wuid && rh[0].opp[0].res === 'l', `방장 → 친구 판 패 (${JSON.stringify(rh)})`);
    // 결과 창 단추: 손님 ✋ 준비 · 방장은 잠김, '안 기다리고' 와 '대기실로'
    const rb = await H.evaluate(() => { const $ = id => document.getElementById(id); return { again: $('again').textContent, dis: $('again').disabled, force: !$('resForce').hidden, lobby: !$('resLobby').hidden, list: $('resReady').textContent }; });
    T.ok(/준비 0\/1/.test(rb.again) && rb.dis && rb.force && rb.lobby, `방장 결과 창: 준비를 기다림 (${JSON.stringify(rb)})`);
    // 손님 새로 고침해도 같은 판을 또 세지 않음
    await W.reload({ waitUntil: 'load' });
    await stubRank(W);
    await ready(W);
    T.ok(await U.waitFor(W, () => !document.getElementById('results').hidden, null, 8000), '새로 고침한 손님도 결과 창');
    await U.sleep(500);
    T.ok((await W.evaluate(() => window.__rk.length)) === 0, '새로 고침해도 같은 판을 또 세지 않음');
    await T.sleep(100);

    // 대기실로 → 다시 시작 (새 판)
    await H.evaluate(() => document.getElementById('resLobby').click());
    const lb = await Promise.all([H, W].map(p => U.waitFor(p, () => !!document.querySelector('.arn-ov:not([hidden]) .arn-big') && document.getElementById('results').hidden, null, 6000)));
    T.ok(lb[0] && lb[1], '방장 대기실로 → 두 화면 다 대기실');
    const rd0 = await H.evaluate(() => window.__snake.round);
    await setRoom(H, { mode: 'free' });
    await H.click('[data-start]');
    const again = await Promise.all([H, W].map(p => U.waitFor(p, r => window.__snake.playing && window.__snake.round > r, rd0, 8000)));
    T.ok(again[0] && again[1], `다시 시작 → 새 판 (${rd0}→${again[0]}·${again[1]})`);
    T.ok(await U.waitFor(W, () => window.game.me && window.game.me.alive && window.__snake.gmode === 'free', null, 4000), '손님도 새 설정(자유)으로');
    await protect(H);

    // 자유 모드: 늦게 온 사람은 바로 같이 함
    const L = await T.open('snake/', 'room=' + code);
    await ready(L);
    T.ok(await U.waitFor(L, A.online.started, null, 15000), '늦게 온 사람도 판으로');
    T.ok(await U.waitFor(H, () => window.__snake.sim.snakes.filter(s => s.kind === 'human').length === 3, null, 5000), '자유 모드: 늦게 온 사람도 바로 지렁이');
    T.ok(await U.waitFor(L, () => window.game.me && window.game.me.alive, null, 5000), '늦게 온 사람 지렁이가 살아 있음');

    // 나가기: 손님이 메뉴로 나가면 방장 판에서 빠짐 · 방장이 나가면 손님은 메뉴 + '방장이 방을 닫았어요'
    await L.evaluate(A.home);
    T.ok(await U.waitFor(H, () => window.__snake.sim.snakes.filter(s => s.kind === 'human').length === 2, null, 5000), '손님이 나가면 방장 판에서 빠짐');
    T.ok(await L.evaluate(() => !document.getElementById('menu').hidden && !ArenaUI.net), '나간 손님은 메뉴로');
    await L.close();
    await H.evaluate(A.home);
    T.ok(await U.waitFor(W, () => !document.getElementById('menu').hidden && /방장이 방을 닫았어요/.test((document.querySelector('.arn-ov:not([hidden])') || {}).textContent || ''), null, 6000), "방장이 나가면 손님은 메뉴 + 알림");
    T.ok(await W.evaluate(() => window.__snake.mode === 'menu'), '손님 게임 상태 정리됨');
    await H.close(); await W.close();
  }

  // ── 배틀로얄: 20초 뒤에 온 사람은 구경 (지렁이 없음·결과·랭킹에 안 들어감), 다음 판부터 같이
  {
    const { H, code } = await hostRoom(T);
    const W = await guest(T, code);
    await seats(H, 2);
    await setRoom(H, { mode: 'royale', hz: '20', ailv: 'rule', ain: '0' });
    await startRoom(H, W);
    await protect(H);
    await H.evaluate(() => { window.__snake.sim.tick += 21 * 20; });
    const L = await guest(T, code);
    T.ok(await U.waitFor(L, A.online.started, null, 15000), '구경꾼이 판을 받음');
    const v = await U.waitFor(L, () => { const m = window.game.me, s = document.getElementById('spec'); return m && !m.alive && !s.hidden && /관전 중: \S/.test(s.textContent) ? s.textContent : null; }, null, 6000);
    T.ok(v && !/새로 시작/.test(v) && !/관전 중: ·/.test(v), `구경꾼 표시: 보는 지렁이 이름까지 (${v})`);
    T.ok(await L.evaluate(() => document.getElementById('dead').hidden), "구경꾼에겐 '죽었어요' 창 없음");
    const lw = await L.evaluate(() => ({ me: document.getElementById('me').textContent, boost: document.getElementById('boost').hidden }));
    T.ok(/구경 중/.test(lw.me) && lw.boost, `구경꾼: '구경 중' 표시 · 부스트 단추 없음 (${JSON.stringify(lw)})`);
    await stubRank(L); await stubRank(H);
    await H.evaluate(() => { window.__snake.sim.tick += 200 * 20; });
    T.ok(await U.waitFor(L, () => !document.getElementById('results').hidden, null, 8000), '구경꾼도 결과 창');
    await U.sleep(500);
    const lu = await L.evaluate(() => ArenaUI.net.uid);
    const r = await H.evaluate(u => ({ rk: window.__rk.slice(), inRes: window.__snake.sim.results.some(x => x.id === u) }), lu);
    T.ok(!r.inRes, '구경꾼은 순위에 없음');
    T.ok(r.rk.length === 1 && !(r.rk[0].opp || []).some(o => o.uid === lu), `방장 랭킹 상대에 구경꾼 없음 (${JSON.stringify(r.rk)})`);
    T.ok((await L.evaluate(() => window.__rk.length)) === 0, '구경꾼은 판을 안 셈');
    await H.evaluate(() => document.getElementById('resForce').click());
    T.ok(await U.waitFor(L, () => window.game.me && window.game.me.alive && document.getElementById('spec').hidden && document.getElementById('results').hidden && !document.getElementById('boost').hidden, null, 6000), '다음 판부터 같이 (부스트 단추도 돌아옴)');
    await H.close(); await W.close(); await L.close();
  }

  // ── 8명까지 (9번째는 꽉 참) · 8명 + AI 8마리 상태 크기
  {
    const { H, code } = await hostRoom(T);
    const G = [];
    for (let i = 0; i < 7; i++) G.push(await T.open('snake/', 'room=' + code));
    T.ok(await seats(H, 8), '8명까지 들어옴');
    const X = await T.open('snake/', 'room=' + code);
    await ready(X);
    T.ok(await U.waitFor(X, () => /꽉 찼어요/.test((document.querySelector('.arn-ov:not([hidden]) .arn-msg') || {}).textContent || ''), null, 6000), '9번째는 방이 꽉 참');
    await X.close();
    await setRoom(H, { mode: 'free', hz: '14', ailv: 'hard', ain: '8' });
    await U.waitFor(H, () => /8명/.test((document.querySelector('[data-start]') || {}).textContent || ''), null, 3000);
    await H.click('[data-start]');
    for (const p of [H, G[6]]) T.ok(await U.waitFor(p, A.online.started, null, 20000), '8명 판 시작');
    await U.sleep(1500);
    const sz = await H.evaluate(async () => {
      const n = ArenaUI.net, o = n.send, log = { s: 0, y: 0 };
      n.send = (u, m, r) => { const k = m.t; if (k === 's') log.s = Math.max(log.s, JSON.stringify(m).length); if (k === 'y') log.y = Math.max(log.y, JSON.stringify(m).length); return o.call(n, u, m, r); };
      await new Promise(r => setTimeout(r, 2600));
      n.send = o; return { ...log, snakes: window.__snake.sim.snakes.length };
    });
    console.log(`  (8명 + AI 8마리: 상태 ${sz.s}B · 전체 맞춤 ${sz.y}B · 지렁이 ${sz.snakes}마리)`);
    T.ok(sz.snakes === 16 && sz.s > 0 && sz.y > 0, `8명 + AI 8마리 (${JSON.stringify(sz)})`);
    const fine = await G[6].evaluate(() => window.game.snakes.length);
    T.ok(fine === 16, `손님 화면도 16마리 (${fine})`);
    await H.close();
    for (const g of G) await g.close();
  }

  // ── 감지 기록: 규칙상 자기 자리(snake/ac/방/내 uid)에만 씀 — 방장이 본 친구 행동도 방장 자리 아래 peer/친구 로 (옛 snake/rooms 방장 규칙이 없으니)
  //    관리자 감지기 단추: Gate.state.isAdmin 일 때만 게임 중에 보이고, 패널에 친구 기록이 합쳐져 보임
  {
    const fakeDb = () => {
      const paths = []; window.__acPaths = paths;
      const ref = p => ({ set(v) { paths.push(p); return Promise.resolve(); }, update() { paths.push(p); return Promise.resolve(); }, remove() { return Promise.resolve(); }, child(c) { return ref(p + '/' + c); }, push() { return ref(p + '/x' + paths.length); }, on() {}, off() {}, limitToLast() { return ref(p); }, get key() { return p.split('/').pop(); }, get parent() { return ref(p.split('/').slice(0, -1).join('/')); }, get() { return Promise.resolve({ val: () => null, exists: () => false }); }, transaction() { return Promise.resolve(); } });
      window.firebase = window.firebase || { database: { ServerValue: { TIMESTAMP: 0 } } };
      Arena.db = () => ({ ref });
    };
    const { H, code } = await hostRoom(T);
    const W = await guest(T, code);
    await seats(H, 2);
    await setRoom(H, { mode: 'free', ain: '0' });
    await H.evaluate(fakeDb); await W.evaluate(fakeDb);
    await startRoom(H, W);
    const [hu, wu] = await Promise.all([H, W].map(p => p.evaluate(() => ArenaUI.net.uid)));
    await U.sleep(5600);                                                    // 5초마다 기록
    const hp = await H.evaluate(() => window.__acPaths.filter(p => p.startsWith('snake/ac/'))), wp = await W.evaluate(() => window.__acPaths.filter(p => p.startsWith('snake/ac/')));
    T.ok(hp.length && hp.every(p => p.startsWith(`snake/ac/${code}/${hu}/`)), `방장은 자기 자리에만 씀 (${hp.join(' ')})`);
    T.ok(hp.includes(`snake/ac/${code}/${hu}/client`) && hp.includes(`snake/ac/${code}/${hu}/host`) && hp.includes(`snake/ac/${code}/${hu}/peer/${wu}`), `방장: 내 신호 + 친구 행동 (${hp.join(' ')})`);
    T.ok(wp.length && wp.every(p => p === `snake/ac/${code}/${wu}/client`), `손님은 자기 자리에 client 만 (${wp.join(' ')})`);
    // 감지기 단추
    const adm0 = await H.evaluate(() => ({ btn: document.getElementById('acBtn').hidden, panel: document.getElementById('admin').hidden }));
    T.ok(adm0.btn && adm0.panel, `관리자 아니면 감지기 단추 없음 (${JSON.stringify(adm0)})`);
    await H.evaluate(() => {
      NET.watchReports = cb => cb({ [ArenaUI.net.code]: { h1: { client: { name: '베니', sig: [['가짜 입력', 0, '없음']], t: 1 }, host: { name: '베니', sig: [], t: 1 }, peer: { f1: { name: '지민', score: 25, sig: [['반응 속도', 1, '너무 빠름']], t: 2 } } }, f1: { client: { name: '지민', helperDeclared: 'none', sig: [['주입 흔적', 0, '없음']], t: 2 } } } });
      NET.watchRooms = cb => cb({ [ArenaUI.net.code]: { h: '베니', n: 2, max: 8, ph: 'play', m: '자유' } });
      Gate.state.isAdmin = true;
    });
    T.ok(await U.waitFor(H, () => !document.getElementById('acBtn').hidden, null, 2000), 'Gate.state.isAdmin 이면 게임 중 감지기 단추');
    await H.click('#acBtn');
    const panel = await H.evaluate(() => { const a = document.getElementById('admin'); return a.hidden ? '' : a.textContent; });
    T.ok(/감지기/.test(panel) && /지민/.test(panel) && /너무 빠름/.test(panel) && /주입 흔적/.test(panel) && /열린 방 1개/.test(panel), `패널: 친구 기록이 한 줄로 합쳐짐 (${panel.slice(0, 200)})`);
    await H.click('#acBtn');
    T.ok(await H.evaluate(() => document.getElementById('admin').hidden), '단추로 닫힘');
    await H.evaluate(() => { Gate.state.isAdmin = false; });
    await H.close(); await W.close();
  }
}

// ── 진짜 common/arena.js 길 (mock 아님): 가짜 Firebase(common/test/fakefb.js)로 방 · 서버 경유(RTDB down/up/downq/upq) · 랭킹 · 기록 · 감지 기록
//    직접 연결은 상대 탭이 없어 안 열림 → 서버 경유 길을 봄. 상대 쪽은 store 에 직접 씀. 규칙 흉내: snake/ac/방/uid 는 자기 uid 만 (실제 규칙과 같음)
async function realArenaTests(T) {
  const FAKE = fs.readFileSync(path.join(U.ROOT, 'common', 'test', 'fakefb.js'), 'utf8');
  const INSTALL = ';window.__fs = FakeFB.install(window, { store: FakeFB.store({ rules: w => { const m = /^snake\\/ac\\/[^/]+\\/([^/]+)/.exec(w.path); return !m || m[1] === w.uid; } }), user: { uid: "uMe", claims: {} } });'
    // 진짜 RTDB 처럼 숫자 키만 있는 칸은 배열로 돌려줌 (fakefb 는 객체로 둠)
    + '(() => { const S = window.__fs, toA = v => { if (!v || typeof v !== "object") return v; const ks = Object.keys(v); for (const k of ks) v[k] = toA(v[k]); if (ks.length && ks.every(k => /^\\d+$/.test(k)) && Math.max(...ks.map(Number)) < 2 * ks.length) { const a = []; for (const k of ks) a[+k] = v[k]; return a; } return v; }, g0 = S.get; S.get = p => toA(g0(p)); })();';
  const open = async (q, tree) => {
    const ctx = await T.ctx.browser().newContext({ locale: 'ko-KR', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(/identitytoolkit|securetoken|firebaseio\.com|firebasedatabase\.app|gstatic\.com\/firebasejs/, r => r.abort());
    await ctx.addInitScript(FAKE + INSTALL);
    await ctx.addInitScript(tree => { Object.assign(window.__fs.tree, tree); try { localStorage.setItem('game.me', JSON.stringify({ pid: 'pMe', name: '베니' })); } catch (e) {} }, tree);
    const p = await ctx.newPage();
    p.on('pageerror', e => T.errors.push('real ' + (e.message || e)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) T.errors.push('real console ' + m.text().slice(0, 200)); });
    p.on('dialog', d => d.dismiss().catch(() => {}));
    await p.goto(T.base + 'snake/' + q, { waitUntil: 'load' });
    await ready(p);
    return { p, ctx };
  };
  const gp = { players: { pMe: { n: '베니', l: 1 } } };

  // ── 방장
  {
    const { p: H, ctx } = await open('', { gp });
    T.ok(await H.evaluate(() => !window.Arena.mock), '(시험 조건) 진짜 arena.js');
    await H.evaluate(A.online.open);
    await U.waitFor(H, () => { const b = document.querySelector('[data-host]'); return b && !b.disabled; }, null, 8000);
    await H.click('[data-host]');
    const code = await U.waitFor(H, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, null, 8000);
    T.ok(!!code, '진짜 Arena: 방 코드');
    const write = (o) => H.evaluate(o => window.__fs.write(o, { uid: 'gU' }), o);
    const R = 'arena/snake/rooms/' + code;
    await write({ [R + '/players/gU']: { name: '지민', pid: 'pG', t: 1, hue: 85 } });
    T.ok(await seats(H, 2), '진짜 Arena: 손님 자리 → 인원 2명');
    await setRoom(H, { mode: 'round', hz: '20', ailv: 'rule', ain: '3' });
    await startRoom(H);
    await protect(H);
    const hu = await H.evaluate(() => ArenaUI.net.uid);
    const g0 = await H.evaluate(() => { const g = window.__snake.sim.snakes.find(s => s.id === 'gU'); return g && { hue: g.hue, name: g.name, n: window.__snake.sim.snakes.length, peers: ArenaUI.net.peers() }; });
    T.ok(g0 && g0.hue === 85 && g0.name === '지민' && g0.n === 5, '진짜 Arena: 손님이 판에 (' + JSON.stringify(g0) + ')');
    // 서버 경유: 두 틱마다 down, 전체 맞춤도 down (downq 는 안 씀)
    const w0 = await H.evaluate(R => ({ t: window.__snake.sim.tick, d: window.__fs.log.filter(x => x.path === R + '/down').length }), R);
    await U.sleep(2000);
    const w1 = await H.evaluate(([R, w0]) => { const l = window.__fs.log.filter(x => x.path === R + '/down').slice(w0.d); return { ticks: window.__snake.sim.tick - w0.t, down: l.length, s: l.filter(x => x.v && x.v.m && x.v.m.t === 's').length, y: l.filter(x => x.v && x.v.m && x.v.m.t === 'y').length, q: window.__fs.log.filter(x => x.path.startsWith(R + '/downq/')).length }; }, [R, w0]);
    T.ok(w1.ticks > 15 && w1.down >= w1.ticks / 2 - 4 && w1.down <= w1.ticks / 2 + 4 && w1.s > 0 && w1.y >= 1 && w1.q === 0, '서버 경유 쓰기 = 두 틱마다 · 꼭 전할 줄 안 씀 (' + JSON.stringify(w1) + ')');
    const down = await H.evaluate(R => window.__fs.get(R + '/down'), R);
    T.ok(down && down.m && Array.isArray(down.m.s) && down.m.g && down.m.rd === 1, 'down 모양 (' + JSON.stringify(down).slice(0, 120) + ')');
    // 손님 입력·hi (up · upq)
    await write({ [R + '/up/gU']: { m: { t: 'i', a: 1.5, b: 1, r: 0, rs: 0 }, t: 1 } });
    T.ok(await U.waitFor(H, () => { const i = window.__snake.sim.inputs.gU; return i && i.aim === 1.5 && i.boost === true; }, null, 3000), '서버 경유 입력 → 방장 판');
    await write({ [R + '/upq/x1']: { u: 'gU', m: { t: 'hi' }, t: 2 } });
    const hi = await U.waitFor(H, R => { const l = window.__fs.log.filter(x => x.path.startsWith(R + '/downq/') && x.v && x.v.to === 'gU').map(x => x.v.m.t); return l.includes('s') && l.includes('y') ? l.join(',') : null; }, R, 3000);
    T.ok(hi, '재접속 hi → 그 손님에게 지금 판 (꼭 전할 줄) (' + hi + ')');
    // 판 끝: 진짜 GRank 로 rank/snake/{pid} 에 (친구 판, 상대 전적)
    await H.evaluate(() => { const sim = window.__snake.sim; sim.snakes.forEach(s => { s.length = s.id === 'gU' ? 100 : s.kind === 'human' ? 300 : 50; }); sim.tick += 200 * sim.hz; });
    T.ok(await U.waitFor(H, () => !document.getElementById('results').hidden, null, 6000), '결과 창');
    const rk = await U.waitFor(H, () => { const v = window.__fs.get('rank/snake/pMe'); return v && v.m && v.m.f && v.vs && v.vs.pG ? v : null; }, null, 4000);
    T.ok(rk && rk.m.f.n === 1 && rk.m.f.w === 1 && rk.m.f.p === 1 && rk.m.f.b >= 300 && rk.vs.pG.w === 1 && rk.name === '베니', '랭킹 기록 (' + JSON.stringify(rk) + ')');
    // 손님 ✋ 준비 (upq) → 방장 단추 켜짐 → 다음 판
    await write({ [R + '/upq/x2']: { u: 'gU', m: { t: 'rdy', rd: 1 }, t: 3 } });
    T.ok(await U.waitFor(H, () => { const a = document.getElementById('again'); return !a.disabled && /다음 판 시작/.test(a.textContent); }, null, 3000), '손님 준비 → 다음 판 시작 켜짐');
    await U.sleep(5200);                                                    // 감지 기록은 5초마다
    await H.evaluate(() => document.getElementById('again').click());
    T.ok(await U.waitFor(H, () => window.__snake.round === 2 && !window.__snake.sim.over, null, 3000), '다음 판');
    const logs = await H.evaluate(() => { const out = []; for (const day of Object.values(window.__fs.get('logs/snake') || {})) for (const s of Object.values(day)) out.push({ kind: s.info && s.info.kind, room: s.info && s.info.room, players: Object.keys(s.players || {}).length, finals: Object.values(s.matches || {}).filter(m => m.final).length, matches: Object.keys(s.matches || {}).length, net: Object.keys(s.net || {}).length }); return out; });
    const gl = logs.find(x => x.kind === '친구랑');
    T.ok(gl && gl.room === code && gl.finals === 1 && gl.net === 1, '판 결과·연결 품질 기록 (' + JSON.stringify(logs) + ')');
    T.ok(logs.length === 2 && logs.some(x => !x.kind && x.players === 2), '참가자는 ArenaUI 공통 기록 세션에 (' + JSON.stringify(logs) + ')');
    T.ok(await H.evaluate(R => !!window.__fs.get(R + '/meta/log'), R), '손님이 쓸 기록 세션이 방 정보에');
    const ac = await H.evaluate(() => ({ p: [...new Set(window.__fs.log.map(x => x.path).filter(x => x.startsWith('snake/ac/')))], denied: window.__fs.denied.map(x => x.path) }));
    T.ok(ac.p.includes('snake/ac/' + code + '/' + hu + '/client') && ac.p.includes('snake/ac/' + code + '/' + hu + '/host') && ac.p.includes('snake/ac/' + code + '/' + hu + '/peer/gU'), '감지 기록 (' + ac.p.join(' ') + ')');
    T.ok(!ac.denied.length, '규칙에 막힌 쓰기 없음 (' + ac.denied.join(' ') + ')');
    // 옛 자리에 쓰지 않음
    const old = await H.evaluate(() => window.__fs.log.map(x => x.path).filter(x => /^snake\/(rooms|index)/.test(x)));
    T.ok(!old.length, '옛 snake/rooms·snake/index 에 안 씀 (' + old.slice(0, 3).join(' ') + ')');
    await ctx.close();
  }

  // ── 손님 (진짜 Arena.join · 서버 경유)
  {
    const tree = { gp, arena: { snake: { rooms: { ABCD: { meta: { host: 'hU', created: 1, phase: 'play', cfg: { m: 'free', hz: 14, ai: { level: 'rule', count: 0 } }, max: 8, v: 1 }, players: { hU: { name: '방장', t: 1 } } } } } } };
    const { p: W, ctx } = await open('?room=ABCD', tree);
    const R = 'arena/snake/rooms/ABCD';
    const uid = await U.waitFor(W, R => { const n = window.ArenaUI && ArenaUI.net; return n && window.__fs.get(R + '/players/' + n.uid) ? n.uid : null; }, R, 8000);
    T.ok(!!uid, '진짜 Arena: 초대 주소로 자리에 앉음');
    const seat = await U.waitFor(W, ([R, uid]) => { const s = window.__fs.get(R + '/players/' + uid); return s && s.hue != null ? s : null; }, [R, uid], 4000);
    T.ok(seat && seat.name === '베니' && seat.pid === 'pMe' && seat.hue === 48 && seat.helper === false, '내 자리: 공통 이름·색 (' + JSON.stringify(seat) + ')');
    T.ok(await U.waitFor(W, R => window.__fs.log.some(x => x.path.startsWith(R + '/upq/') && x.v && x.v.m && x.v.m.t === 'hi'), R, 3000), '판이 진행 중이면 hi 를 보냄');
    await W.evaluate(([R, uid]) => window.__fs.write({
      [R + '/down']: { m: { t: 's', rd: 1, k: 5, s: [[uid, 1, 1, 2, 2, 0, 100, 1, 0, 0, 0, 0], ['hU', 5, 5, 6, 6, 0, 100, 1, 0, 0, 0, 0]], fd: [[3, null]], g: { m: 'free', hz: 14, R: 60, tl: -1, o: 0 } }, t: 1 },
    }, { uid: 'hU' }), [R, uid]);
    T.ok(await U.waitFor(W, () => window.__snake.playing, null, 4000), '서버 경유 상태 → 손님 화면');
    const s1 = await W.evaluate(() => ({ head: window.game.me && window.game.me.head, n: window.game.snakes.length, len: window.game.me && window.game.me.length }));
    T.ok(s1.n === 2 && s1.head[0] === 2 && s1.head[1] === 2 && s1.len === 10, '손님 화면 (' + JSON.stringify(s1) + ')');
    await W.evaluate(([R, uid]) => window.__fs.write({
      [R + '/down']: { m: { t: 'y', rd: 1, k: 5, b: { [uid]: [1, 1, 0, 0], hU: [5, 5, 4, 4] }, f: [[1, 2, 30, 1, 0], 0, [3, 4, 30, 1, 0]], info: { [uid]: ['human', '베니', 48, 0], hU: ['human', '방장', 200, 0] } }, t: 2 },
    }, { uid: 'hU' }), [R, uid]);
    const s2 = await U.waitFor(W, () => { const n = window.game.snakes.map(s => s.name).sort().join(','), f = window.game.food; return n === '방장,베니' && f.length === 3 && f[1] === null && f[2][0] === 3 ? n : null; }, null, 3000);
    T.ok(s2, '서버 경유 전체 맞춤: 이름·먹이 (' + s2 + ')');
    // 입력 → up (서버 경유: 초당 15번까지)
    const up0 = await W.evaluate(uid => window.__fs.log.filter(x => x.path.endsWith('/up/' + uid)).length, uid);
    await W.evaluate(() => { const cv = document.getElementById('cv'), r = cv.getBoundingClientRect(); let i = 0; const go = () => { const o = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: r.left + 100 + (i % 80) * 2, clientY: r.top + 300 }; cv.dispatchEvent(new PointerEvent(i ? 'pointermove' : 'pointerdown', o)); if (++i < 60) setTimeout(go, 16); }; go(); });
    await U.sleep(1100);
    const up = await W.evaluate(([uid, up0]) => { const l = window.__fs.log.filter(x => x.path.endsWith('/up/' + uid)); return { n: l.length - up0, last: l[l.length - 1] && l[l.length - 1].v }; }, [uid, up0]);
    T.ok(up.n >= 5 && up.n <= 18 && up.last && up.last.m && up.last.m.t === 'i' && up.last.m.a != null, '서버 경유 입력 쓰기 (' + JSON.stringify(up) + ')');
    // 방장이 내보냄 → 메뉴 + 알림
    await W.evaluate(([R, uid]) => window.__fs.write({ [R + '/players/' + uid]: null }, { uid: 'hU' }), [R, uid]);
    T.ok(await U.waitFor(W, () => window.__snake.mode === 'menu' && !document.getElementById('menu').hidden && /내보냈어요/.test((document.querySelector('.arn-ov:not([hidden])') || {}).textContent || ''), null, 4000), '내보내면 메뉴 + 알림');
    await ctx.close();
  }
}

U.main(async T => {
  await snakeTests(T);
  await realArenaTests(T);

  // ── 29) 벽 거리
  {
    const p = await T.open('snake/slither-fixture.html');
    await U.waitFor(p, () => !!window.__slitherProbe, null, 10000);
    const r = await p.evaluate(() => {
      const P = __slitherProbe, R = 21600, st = (head, ang) => ({ playing: true, head, ang, R, len: 20, foods: [], bodies: [] });
      const wallTerms = o => Array.from({ length: 16 }, (_, k) => o[k * 4 + 3]);
      return {
        center: wallTerms(P.observe(st([R, R], 0))),                 // 판 한가운데 (벽이 멀리 → 전부 0)
        east: wallTerms(P.observe(st([2 * R - 100, R], 0))),         // 동쪽 벽까지 100 → 정면 구역은 0.5 쯤
        west: wallTerms(P.observe(st([100, R], Math.PI))),           // 서쪽 벽 가까이 보고 있음 → 마찬가지
      };
    });
    T.ok(r.center.every(v => Math.abs(v) < 1e-9), `29 한가운데에선 벽 값이 모두 0 (${r.center.map(v => v.toFixed(2)).join(' ')})`);
    T.ok(r.center.every(v => v >= 0 && v <= 1) && r.east.every(v => v >= 0 && v <= 1) && r.west.every(v => v >= 0 && v <= 1), '29 벽 값은 늘 0~1');
    T.ok(Math.abs(r.east[0] - 0.49) < 0.06 && Math.abs(r.east[15] - 0.49) < 0.06, `29 동쪽 벽 100 앞 정면 구역 ≈ 0.49 (${r.east[0].toFixed(2)} · ${r.east[15].toFixed(2)})`);
    T.ok(r.east[8] === 0 && r.east[7] === 0, `29 반대쪽(서쪽) 구역은 벽이 멀어 0 (${r.east[8].toFixed(2)})`);
    T.ok(Math.abs(r.west[0] - 0.49) < 0.06, `29 서쪽 벽 100 앞 정면 구역 ≈ 0.49 (${r.west[0].toFixed(2)})`);
    await p.close();
  }

  // ── 33·34) 다시 붙여넣기
  for (const f of ['slither-autopilot.js', 'autopilot-min.js', 'slither-bot3.js', 'slither-brain.js']) {
    const p = await T.open('snake/slither-fixture.html');
    await U.waitFor(p, () => !!window.__slitherProbe, null, 10000);
    // 우리 도구가 등록하는 rAF(코드에 S.err 가 있는 것)만 세어, 한 화면 갱신에 몇 개나 도는지 봄
    await p.evaluate(() => {
      const orig = window.requestAnimationFrame.bind(window); window.__perFrame = new Map();
      window.requestAnimationFrame = cb => orig(t => { if (String(cb).includes('S.err')) window.__perFrame.set(t, (window.__perFrame.get(t) || 0) + 1); cb(t); });
    });
    const code = read(f);
    await p.addScriptTag({ content: code });
    await p.addScriptTag({ content: code });                       // 다시 붙여넣기
    await p.addScriptTag({ content: code });
    await T.sleep(700);
    const m = await p.evaluate(() => { const v = [...window.__perFrame.values()]; return { frames: v.length, max: Math.max(0, ...v) }; });
    T.ok(m.frames > 10, `(시험 조건) ${f}: 도구 반복이 돌고 있음 (${m.frames}번)`);
    T.ok(m.max === 1, `33·34 ${f}: 세 번 붙여넣어도 한 화면 갱신에 반복이 1개 (최대 ${m.max}개)`);
    await p.close();
  }
}, '지렁이');

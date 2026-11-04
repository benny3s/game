// 냥도쿠 어댑터 — 혼자(단계 지도 · 한 판 · 타임어택 · 일부러 틀려서 실패) · AI 구경 · 친구랑(ArenaUI, 빨리 풀기)
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
// 손잡이: window.__ny = { G(지금 판) · TA(타임어택) · meta · prog · myRound · NY(core) } 와 window.__nyBank(퍼즐 은행) — main.js 끝의 '점검용' 읽기 전용 손잡이.
//   판을 여는 것·고양이를 놓는 것은 진짜 화면 단추/판을 눌러서 함: 단계 지도·난이도 고르고 [시작!], 칸 두 번 톡(= 🐱), 한 번 톡(= ✕), 💡 힌트 → 이유 → 적용.
//   정답은 __ny.G.ans 로 앎 (정답 칸에 🐱 → 다 놓으면 '다 찾았어요', 틀린 칸에 3번 놓으면 '물고기를 다 잃었어요').
// 친구랑: 빨리 풀기를 하네스(arena-mock)로 돌림 (방장·손님·구경꾼·손님 새로 고침·다음 판). 타임어택·협동·관전·채팅은 nyang/test/ui.js 가 봄.
module.exports = {
  id: 'nyang',
  path: 'nyang/',
  query: '',
  hookName: '__ny',
  ready: () => !!window.__ny && !!window.__nyBank && !!document.getElementById('home') && !!document.querySelector('#startBtn') && !!document.querySelector('.stg, #tiers button'),
  menu: () => !document.getElementById('home').hidden && !document.querySelector('.arn-ov:not([hidden])') && document.getElementById('rankBox').hidden,
  // 어디서든 시작 화면으로: 친구랑 창·랭킹 창을 닫고, 결과 창이면 맨 끝 단추(난이도 고르기·지도), 판 화면이면 ‹ 두 번(나가기), 타임어택은 그렇게 하면 결과 창이 떠서 한 번 더
  home: () => {
    const $ = id => document.getElementById(id);
    if (window.ArenaUI && ArenaUI.net) ArenaUI.leave();
    const ax = document.querySelector('.arn-ov:not([hidden]) [data-x]'); if (ax) ax.click();
    for (const o of document.querySelectorAll('.rk-ov, .gme-ov')) o.remove();
    $('rankBox').hidden = true;
    for (let i = 0; i < 6; i++) {
      if (!$('resBox').hidden) { const b = [...$('resBtns').children].pop(); if (b) b.click(); continue; }
      if (!$('play').hidden) { $('giveUp').click(); continue; }
      break;
    }
    $('tabSolo').click();
  },
  setup: mode => {
    const $ = id => document.getElementById(id);
    window.__qaN = 0; window.__qaHint = 0; window.__qaWrong = 0; window.__qaLeft = 0; window.__qaSeed = 2463534242;
    // 자동 ✕ 는 '한 판' 에서만 켬 (나머지는 끔) — 켜고 끄는 단추도 같이 시험
    const want = mode === 'solo', on = $('autoX').getAttribute('aria-pressed') === 'true';
    if (want !== on) $('autoX').click();
  },
  reproHint: (mode, seed) => ({
    stage: '혼자 탭 → 🗺 단계 → [시작!] → 정답 칸마다 두 번 톡(🐱)',
    solo: '혼자 탭 → 🧩 한 판 → 🐣 초급 → [시작!] → 정답 칸마다 두 번 톡(🐱)',
    fail: '혼자 탭 → 🧩 한 판 → 🐣 초급 → [시작!] → 틀린 칸에 🐱 세 번',
    ta: '혼자 탭 → ⏱ 타임어택 → 🐣 초급 → [시작!] → 몇 개 풀고 시간 끝',
    watch: 'AI 구경 탭 → 🐱 중급 → 빠르게 → ▶ 보기',
    leave: '혼자 탭 → 🧩 한 판 → 🐣 초급 → [시작!] → 마지막 🐱 을 놓자마자(결과 창 뜨기 전 1초 안에) ‹ 한 번 → 1.5초 뒤 콘솔에 오류가 없어야',
  }[mode] || `start ${mode}`),
  modes: {
    // 단계 지도: 1단계(초급) — 힌트(💡 → 이유 → 적용)를 한 번 쓰고 나머지는 정답 칸에 🐱, ✕ 도 몇 번 눌러 봄
    stage: { start: () => {
      const $ = id => document.getElementById(id);
      const seg = [...$('soloMode').children].find(b => b.dataset.v === 'map'); if (seg && seg.getAttribute('aria-pressed') !== 'true') seg.click();
      $('startBtn').click();
    }, timeout: 60000 },
    // 한 판: 초급 · 자동 ✕ 켠 채 정답 칸에 🐱
    solo: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
      $('startBtn').click();
    }, timeout: 60000 },
    // 일부러 틀리기: 정답이 아닌 칸에 🐱 세 번 → 물고기를 다 잃고 실패 결과
    fail: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
      $('startBtn').click();
    }, timeout: 40000 },
    // 타임어택(3분): 초급 몇 개 풀고 → 남은 시간을 0 으로 당겨 '시간 끝!' 결과
    ta: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'ta').click();
      $('tiers').querySelector('.t-easy').click();
      $('startBtn').click();
    }, timeout: 80000 },
    // 이긴 직후 바로 나가기: 마지막 🐱 을 놓자마자 ‹ (결과 창은 1.15초 뒤에 뜨도록 돼 있어서, 그 사이에 나가면 옛 판의 '끝 처리'가 G=null 로 도는 경합) → 1.7초 뒤까지 오류 없이 시작 화면
    leave: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
      $('startBtn').click();
    }, timeout: 40000 },
    // AI 구경: 중급 · 빠르게 · ▶ 보기 → 'AI 가 다 풀었어요'
    watch: { start: () => {
      const $ = id => document.getElementById(id);
      $('tabWatch').click();
      $('wTier').value = 'normal'; $('wTier').dispatchEvent(new Event('change'));
      const sp = [...$('wSpeed').children].find(b => b.dataset.v === '10'); if (sp) sp.click();
      $('wPlay').click();
    }, timeout: 60000 },
  },
  quickModes: ['stage'],
  monkeyStart: 'stage',
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  gaps: [
    '하네스의 친구랑은 빨리 풀기만 돌림 — 타임어택·협동·관전·채팅·재접속 복원은 nyang/test/ui.js 가 봄',
    '로컬 시험(?mock)은 Firebase 없이 돌아서 이름 정하기·🏆 랭킹·기록 저장(rank/nyang · nyang/rec)은 안 돌아감 — 랭킹 창은 안내 글로만 뜸',
  ],
  probe: mode => {
    const ny = window.__ny, $ = id => document.getElementById(id);
    if (mode === 'watch') {
      const done = /다시 보기/.test($('wPlay').textContent), say = $('wSay').textContent;
      return { fp: [$('wCats').textContent, $('wSteps').textContent, done ? 1 : 0].join('|'), over: done, waiting: false, info: `AI 구경 ${$('wCats').textContent} · ${$('wSteps').textContent} · ${done ? '끝' : say.slice(0, 24)}` };
    }
    const G = ny && ny.G, TA = ny && ny.TA, res = !$('resBox').hidden, title = $('resTitle').textContent;
    if (mode === 'leave' && window.__qaLeft) {                              // 나간 뒤 1.7초 (옛 판 끝 처리가 뜨는 1.15초를 지남) 동안 시작 화면에 머물러야 함
      const dt = Date.now() - window.__qaLeft;
      return { fp: ['left', Math.floor(dt / 300), G ? 1 : 0, res ? 1 : 0].join('|'), over: dt > 1700 && !G && !res && !$('home').hidden, waiting: false, info: `이긴 직후 나감 +${dt}ms · 판 ${G ? '있음' : '없음'} · 결과 창 ${res ? '떠 있음(나갔는데 옛 결과가 뜸)' : '없음'} · 시작 화면 ${$('home').hidden ? '아님' : '맞음'}` };
    }
    if (!G) return { fp: 'none|' + (res ? title : ''), over: res, waiting: false, info: '판 없음' + (res ? ' · 결과 ' + title : '') };
    const over = mode === 'ta' ? (res && /시간 끝/.test(title)) : res;
    return {
      fp: [G.cats.size, G.xs.size, G.bad.size, G.mistakes, G.hints, G.over ? 1 : 0, res ? title : '', TA ? TA.solved + '/' + TA.failed + '/' + TA.i : ''].join('|'),
      over,
      waiting: false,
      info: `${G.n}x${G.n} 🐱${G.cats.size} ✕${G.xs.size} 실수${G.mistakes} 힌트${G.hints}${TA ? ' · 타임어택 푼 ' + TA.solved + ' 실패 ' + TA.failed : ''}${res ? ' · 결과 "' + title + '"' : ''}`,
    };
  },
  drive: mode => {
    const ny = window.__ny, $ = id => document.getElementById(id);
    if (mode === 'watch') return;                                         // 구경은 start 가 ▶ 를 눌러 두면 저절로 돎
    const G = ny && ny.G, TA = ny && ny.TA;
    if (mode === 'leave' && window.__qaLeft) return;
    if (mode === 'leave' && G && G.won && !$('play').hidden) { window.__qaLeft = Date.now(); $('giveUp').click(); return; }   // 이겼다(마지막 🐱) → 바로 ‹ (이미 끝난 판이라 한 번에 나감)
    if (!G || G.over || $('play').hidden) return;
    if (!$('resBox').hidden) return;
    // ── 도우미: 칸을 진짜 손가락처럼 (pointerdown) 누름. 한 번 = ✕, 같은 칸 두 번 = 🐱
    const cell = k => $('board').children[k];
    const tap = k => {
      const el = cell(k); if (!el) return false;
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !hit.closest('#board .c')) return false;                // 다른 것(창·알림)에 가려졌으면 못 누름
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
      return true;
    };
    const cat = k => tap(k) && tap(k);
    const ansCells = () => { const out = []; for (let r = 0; r < G.n; r++) out.push(r * G.n + G.ans[r]); return out.filter(k => !G.cats.has(k)); };
    const n = window.__qaN = (window.__qaN || 0) + 1;
    // 타임어택: 정해진 개수만 풀고 시간을 당겨 끝냄 (진짜 3분을 안 기다림)
    if (mode === 'ta') {
      if (TA && TA.solved >= 2 && !TA.over) { TA.endAt = Date.now() - 1; return; }
      if (TA && TA.over) return;
    }
    // 일부러 틀리기: 정답이 아닌 빈 칸에 🐱 (최대 3번 → 실패)
    if (mode === 'fail') {
      const wrong = []; for (let k = 0; k < G.n * G.n; k++) if (!G.isAns(k) && !G.cats.has(k) && !G.bad.has(k)) wrong.push(k);
      if (wrong.length) cat(wrong[(n * 7) % wrong.length]);
      return;
    }
    // 힌트 한 번 (단계 지도): 💡 → 이유 보기 → 적용 — 3번에 나눠서 (창이 뜨고 닫히는 걸 한 틱씩 지나감)
    if (mode === 'stage' && window.__qaHint < 3) {
      const h = window.__qaHint;
      if (h === 0 && n >= 2) { $('hintBtn').click(); window.__qaHint = $('hintBox').hidden ? 3 : 1; return; }       // 힌트 줄 게 없으면(창이 안 뜸) 건너뜀
      if (h === 1) { if (!$('hintMore').hidden) $('hintMore').click(); window.__qaHint = 2; return; }
      if (h === 2) { if (!$('hintApply').hidden) $('hintApply').click(); else if (!$('hintBox').hidden) $('hintClose').click(); window.__qaHint = 3; return; }
      return;
    }
    if (!$('hintBox').hidden) $('hintClose').click();
    // ✕ 도 가끔 눌러 봄 (정답이 아닌 빈 칸에 한 번 → 켜짐, 또 한 번은 400ms 뒤라서 따로 → 꺼짐)
    if (n % 4 === 2 && mode !== 'solo' && mode !== 'leave') {
      const emp = []; for (let k = 0; k < G.n * G.n; k++) if (!G.isAns(k) && !G.cats.has(k) && !G.bad.has(k)) emp.push(k);
      if (emp.length) { tap(emp[(n * 5) % emp.length]); return; }
    }
    const todo = ansCells();
    if (todo.length) cat(todo[0]);
  },
  // 친구랑 (mock): 빨리 풀기 · 초급. 손님은 방장이 다 풀면 따라서 끝냄 (__qaGo = 하네스가 판을 끝내라고 함)
  online: {
    open: () => document.getElementById('tabFriend').click(),
    beforeStart: () => { const pick = (id, v) => { const b = document.querySelector('#' + id + ' [data-v="' + v + '"]'); if (b) b.click(); }; pick('cfgMode', 'race'); pick('cfgTier', 'easy'); pick('cfgHint', 'penalty'); pick('cfgRounds', '3'); },
    started: () => { const ny = window.__ny, m = ny && ny.meta, $ = id => document.getElementById(id); return !!(ny && ny.G && m && m.phase === 'play' && m.round && ny.myRound === m.round && !$('play').hidden && $('countBox').hidden); },
    round: () => { const ny = window.__ny; return ny && ny.meta ? ny.myRound : -1; },
    setup: role => { window.__qaN = 0; window.__qaPause = false; window.__qaRole = role; window.__qaLastX = -1; },
    pause: () => { window.__qaPause = true; },
    resume: () => { window.__qaPause = false; },
    finish: () => { window.__qaGo = window.__ny.meta.round; },
    stuckMs: 30000,
    // 두 화면이 같아야 하는 것: 판 번호·문제·모양 · 사람마다 진행(고양이 수·실수·끝남·판 모양) · 승수
    fp: () => {
      const ny = window.__ny, m = ny && ny.meta;
      if (!m || !m.round || ny.myRound !== m.round) return null;
      const rows = Object.keys(ny.prog).sort().filter(u => ny.prog[u] && ny.prog[u].round === m.round).map(u => { const q = ny.prog[u]; return [u, q.placed, q.mistakes || 0, q.done ? 1 : 0, q.failed ? 1 : 0, q.b || ''].join(':'); });
      return JSON.stringify({ r: m.round, p: m.pid, v: m.vs, mode: m.cfg.mode || 'race', who: (m.who || []).slice().sort(), rows });
    },
    drive: role => {
      const ny = window.__ny, $ = id => document.getElementById(id), G = ny && ny.G;
      if (window.__qaPause || role === 'spec' || !G || !ny.meta || G.over || $('play').hidden || !$('resBox').hidden || !$('countBox').hidden) return;
      const tap = k => {
        const el = $('board').children[k]; if (!el) return false;
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
        if (!hit || !hit.closest('#board .c')) return false;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }));
        return true;
      };
      const n = window.__qaN = (window.__qaN || 0) + 1, m = ny.meta, hq = ny.prog[m.host];
      const todo = []; for (let r = 0; r < G.n; r++) { const k = r * G.n + G.ans[r]; if (!G.cats.has(k)) todo.push(k); }
      const finish = window.__qaGo === m.round || (role === 'guest' && hq && hq.round === m.round && hq.done);
      if (finish) { if (todo.length && tap(todo[0])) tap(todo[0]); return; }
      if (n % 8 === 0 && todo.length > 1) { if (tap(todo[0])) tap(todo[0]); return; }                      // 평소엔 조금씩 (마지막 한 칸은 남겨 둠)
      const emp = []; for (let k = 0; k < G.n * G.n; k++) if (!G.isAns(k) && !G.cats.has(k) && !G.bad.has(k) && k !== window.__qaLastX) emp.push(k);   // 같은 칸을 0.4초 안에 또 누르면 🐱 라서 다른 칸으로
      if (emp.length) { const k = emp[(n * 5) % emp.length]; window.__qaLastX = k; tap(k); }
    },
  },
};

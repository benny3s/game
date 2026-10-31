// 냥도쿠 어댑터 — 혼자(단계 지도 · 한 판 · 타임어택 · 일부러 틀려서 실패) · AI 구경
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
// 손잡이: window.__ny = { G(지금 판) · TA(타임어택) · meta · prog · NY(core) } 와 window.__nyBank(퍼즐 은행) — main.js 끝의 '점검용' 읽기 전용 손잡이.
//   판을 여는 것·고양이를 놓는 것은 진짜 화면 단추/판을 눌러서 함: 단계 지도 [▶ 시작], 난이도 단추, 칸 두 번 톡(= 🐱), 한 번 톡(= ✕), 💡 힌트 → 이유 → 적용.
//   정답은 __ny.G.ans 로 앎 (정답 칸에 🐱 → 다 놓으면 '다 찾았어요', 틀린 칸에 3번 놓으면 '물고기를 다 잃었어요').
// 친구랑(방 만들기·대기실·빨리 풀기·타임어택·협동)은 Arena 가 아니라 nyang/net.js 가 Firebase Realtime DB 를 직접 부름 → 하네스(arena-mock) 로는 못 돌림: onlineGap
module.exports = {
  id: 'nyang',
  path: 'nyang/',
  query: '',
  hookName: '__ny',
  ready: () => !!window.__ny && !!window.__nyBank && !!document.getElementById('home') && !!document.querySelector('#stageGo, #tiers button'),
  menu: () => !document.getElementById('home').hidden,
  // 어디서든 시작 화면으로: 결과 창이면 맨 끝 단추(난이도 고르기·지도), 판 화면이면 ‹ 두 번(나가기), 타임어택은 그렇게 하면 결과 창이 떠서 한 번 더
  home: () => {
    const $ = id => document.getElementById(id);
    for (let i = 0; i < 6; i++) {
      if (!$('resBox').hidden) { const b = [...$('resBtns').children].pop(); if (b) b.click(); continue; }
      if (!$('play').hidden) { $('giveUp').click(); continue; }
      break;
    }
    if (!$('lobby').hidden) $('leave1').click();
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
    stage: '혼자 탭 → 🗺 단계 → [▶ 1단계 시작] → 정답 칸마다 두 번 톡(🐱)',
    solo: '혼자 탭 → 🧩 한 판 → 🐣 초급 → 정답 칸마다 두 번 톡(🐱)',
    fail: '혼자 탭 → 🧩 한 판 → 🐣 초급 → 틀린 칸에 🐱 세 번',
    ta: '혼자 탭 → ⏱ 타임어택 → 🐣 초급 → 몇 개 풀고 시간 끝',
    watch: 'AI 구경 탭 → 🐱 중급 → 빠르게 → ▶ 보기',
    leave: '혼자 탭 → 🧩 한 판 → 🐣 초급 → 마지막 🐱 을 놓자마자(결과 창 뜨기 전 1초 안에) ‹ 한 번 → 1.5초 뒤 콘솔에 오류가 없어야',
  }[mode] || `start ${mode}`),
  modes: {
    // 단계 지도: 1단계(초급) — 힌트(💡 → 이유 → 적용)를 한 번 쓰고 나머지는 정답 칸에 🐱, ✕ 도 몇 번 눌러 봄
    stage: { start: () => {
      const $ = id => document.getElementById(id);
      const seg = [...$('soloMode').children].find(b => b.dataset.v === 'map'); if (seg && seg.getAttribute('aria-pressed') !== 'true') seg.click();
      $('stageGo').click();
    }, timeout: 60000 },
    // 한 판: 초급 · 자동 ✕ 켠 채 정답 칸에 🐱
    solo: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
    }, timeout: 60000 },
    // 일부러 틀리기: 정답이 아닌 칸에 🐱 세 번 → 물고기를 다 잃고 실패 결과
    fail: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
    }, timeout: 40000 },
    // 타임어택(3분): 초급 몇 개 풀고 → 남은 시간을 0 으로 당겨 '시간 끝!' 결과
    ta: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'ta').click();
      $('tiers').querySelector('.t-easy').click();
    }, timeout: 80000 },
    // 이긴 직후 바로 나가기: 마지막 🐱 을 놓자마자 ‹ (결과 창은 1.15초 뒤에 뜨도록 돼 있어서, 그 사이에 나가면 옛 판의 '끝 처리'가 G=null 로 도는 경합) → 1.7초 뒤까지 오류 없이 시작 화면
    leave: { start: () => {
      const $ = id => document.getElementById(id);
      [...$('soloMode').children].find(b => b.dataset.v === 'one').click();
      $('tiers').querySelector('.t-easy').click();
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
  onlineGap: '냥도쿠 친구랑(방·대기실·빨리 풀기·타임어택·협동)은 Arena 가 아니라 nyang/net.js 가 Firebase Realtime DB 를 직접 부름 → arena-mock 으로 흉내 못 냄 (DB 가짜가 따로 필요)',
  gaps: [
    '친구랑(빨리 풀기 · 타임어택 · 협동 · 관전 · 채팅): Firebase DB 직접 사용이라 자동 시험 못 함 — 로컬 시험은 Firebase 요청을 막아서 이름 정하기·랭킹·기록 저장도 안 돌아감 (🏆 랭킹 탭은 \'못 불러왔어요\' 로만 뜸)',
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
};

// 섯다 어댑터 — 손잡이 __seotda 는 읽기 전용(ses 만) → 시작·진행은 진짜 화면 단추를 눌러서 함
//  · 한 판(= 한 번 판돈 걸고 끝) 이 끝나면 결과 창(#resBox) 이 뜸 → over
//  · 빠르기·씨앗·자동 응답 손잡이가 없음 (gaps 참고) → AI 차례 ~0.6초씩 기다림, 사람 차례는 drive() 가 단추를 누름
//  · hot(한 기기) 는 차례마다 가림막(HotSeat.cover) → drive() 가 __qa.hot() 으로 닫음
module.exports = {
  id: 'seotda',
  path: 'seotda/',
  query: '',
  hookName: '__seotda',
  gaps: [
    '__seotda 는 ses 읽기만 — 시작/빠르기/씨앗/자동응답 손잡이가 없어 메뉴 단추를 눌러 시작하고 AI 차례(0.6초)를 그대로 기다림, 판 씨앗을 못 정해 재현 불가',
  ],
  ready: () => !!window.__seotda && !!document.getElementById('home') && !!document.getElementById('startBtn'),
  menu: () => !document.getElementById('home').hidden,
  // 나가기 단추는 두 번 눌러야 나감 (backGuard)
  home: () => { const b = document.getElementById('backBtn'); if (b) { b.click(); b.click(); } },
  setup: () => { window.__qaPause = false; window.__qaN = 0; },
  modes: {
    solo: {
      start: () => {
        const q = s => document.querySelector(s);
        q('#tabSolo').click();
        q('#modeSeg [data-v="2"]').click();          // 나 + AI 1명
        q('#tiers [data-id="easy"]').click();        // 가장 쉬운 AI
        q('#startBtn').click();
      },
      timeout: 90000,
    },
    watch: {
      start: () => {
        const q = s => document.querySelector(s);
        q('#tabWatch').click();
        q('#wModeSeg [data-v="2"]').click();         // AI 2명
        q('#watchBtn').click();
      },
      timeout: 90000,
    },
  },
  quickModes: ['solo'],
  probe: () => {
    const ses = window.__seotda && __seotda.ses;
    if (!ses) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const s = ses.S || ses.V;
    if (!s) return { fp: 'nostate|' + ses.mode, over: false, waiting: false, info: '아직 판이 안 만들어짐 (' + ses.mode + ')' };
    const rb = document.getElementById('resBox');
    return {
      fp: [ses.mode, s.round, s.street, s.phase, s.turn, s.pot, s.raises, s.coins.join('.'), s.bets.join('.'), s.folded.map(Number).join(''), window.HotSeat && HotSeat.isOpen ? 'cover' : ''].join('|'),
      over: !!rb && !rb.hidden,
      waiting: !!ses.pending,
      info: `${s.round}판 · ${s.street}차 · ${s.phase} · 차례 ${s.turn} · 판돈 ${s.pot}`,
    };
  },
  // 가림막 닫고, 내 차례면 단추 하나 누름 (콜 위주 + 가끔 다른 것 → 다이·쿼터·하프·따당도 거침)
  drive: () => {
    __qa.hot();
    const ses = window.__seotda && __seotda.ses; if (!ses) return;
    const btns = __qa.$$('#betGrid .bet-btn').filter(b => !b.disabled);
    if (!btns.length) return;
    const n = window.__qaN = (window.__qaN || 0) + 1;
    const call = btns.find(b => b.dataset.a === '1');
    (n % 4 === 0 ? btns[(n >> 2) % btns.length] : (call || btns[0])).click();
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    started: () => { const ses = window.__seotda && __seotda.ses; return !!(ses && ses.net && !document.getElementById('play').hidden && (ses.S || ses.V)); },
    setup: () => { window.__qaPause = false; window.__qaN = 0; },
    round: () => { const ses = window.__seotda && __seotda.ses, s = ses && (ses.S || ses.V); return s ? s.round : -1; },
    // 방장·손님이 같이 가져야 하는 것만 (손님 화면은 남의 둘째 패가 가려짐 → 첫 패(공개)만 비교)
    fp: () => {
      const ses = __seotda.ses, s = ses && (ses.S || ses.V); if (!s) return null;
      return JSON.stringify({ r: s.round, st: s.street, ph: s.phase, t: s.turn, p: s.pot, c: s.coins, b: s.bets, f: s.folded, rs: s.raises, h0: s.hands.map(h => h[0]), w: s.result ? [s.result.kind, s.result.winners] : null });
    },
    drive: () => {
      if (window.__qaPause) return;
      const ses = window.__seotda && __seotda.ses; if (!ses) return;
      const rb = document.getElementById('resBox');
      if (rb && !rb.hidden) { const b = rb.querySelector('#resBtns .btn.primary'); if (b && !b.disabled) b.click(); return; }
      const btns = __qa.$$('#betGrid .bet-btn').filter(b => !b.disabled);
      if (!btns.length) return;
      const n = window.__qaN = (window.__qaN || 0) + 1;
      const call = btns.find(b => b.dataset.a === '1');
      (n % 4 === 0 ? btns[(n >> 2) % btns.length] : (call || btns[0])).click();
    },
    pause: () => { window.__qaPause = true; },
    resume: () => { window.__qaPause = false; },
  },
};

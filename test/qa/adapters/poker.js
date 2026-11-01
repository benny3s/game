// 포커(텍사스 홀덤) 어댑터 — 손잡이 __poker 는 읽기 전용(ses 만) → 시작·진행은 진짜 화면 단추를 눌러서 함
//  · 시작 창(#startModal) 에서 모드·인원·AI 실력을 고르고 #goStart 를 누름
//  · 한 핸드가 끝나면 결과 창(#endModal) 이 뜸 → over (게임 끝·탈락 창도 같은 #endModal)
//  · hot(한 기기) 는 차례마다 가림막(HotSeat.cover) → drive() 가 __qa.hot() 으로 닫음
module.exports = {
  id: 'poker',
  path: 'poker/',
  query: '',
  hookName: '__poker',
  reproHint: (mode) => mode === 'watchskip'
    ? "시작 창 'AI 구경' · AI 2명 → 결과 창이 뜨면 바로 [다음 핸드 진행], 다음 결과 창(또는 우승 창)은 그대로 둠 → 앞서 누른 판의 4.2초 자동 넘김 타이머가 새 창을 닫아 버려 단추가 하나도 없는 채 멈춤"
    : `시작 창 '${{ solo: '혼자', watch: 'AI 구경', hot: '한 기기' }[mode] || mode}' → 시작, 내 차례엔 콜 위주로`,
  gaps: [
    '__poker 는 ses 읽기만 — 시작/빠르기/씨앗/자동응답 손잡이가 없어 시작 창 단추를 눌러 시작하고 AI 차례(0.7초)를 그대로 기다림, 핸드 씨앗을 못 정해 재현 불가',
  ],
  ready: () => !!window.__poker && !!document.getElementById('goStart') && !!document.getElementById('startModal'),
  menu: () => !document.getElementById('startModal').hidden,
  home: () => document.getElementById('menuBtn').click(),
  setup: () => { window.__qaPause = false; window.__qaN = 0; },
  modes: {
    solo: {
      start: () => {
        const q = s => document.querySelector(s);
        q('.seg[data-seg="mode"] [data-val="1p"]').click();
        q('#countSeg [data-val="2"]').click();                       // 나 + AI 1명
        q('.seg[data-seg="tier"] [data-val="easy"]').click();        // 가장 쉬운 AI
        q('#goStart').click();
      },
      timeout: 90000,
    },
    watch: {
      start: () => {
        const q = s => document.querySelector(s);
        q('.seg[data-seg="mode"] [data-val="watch"]').click();
        q('#countSeg [data-val="2"]').click();                       // AI 2명
        q('#goStart').click();
      },
      timeout: 90000,
    },
    // AI 구경에서 결과 창을 일찍 눌러 넘기기 — 눌러서 넘긴 판의 4.2초 자동 넘김 타이머가 남아 있다가 다음 판 결과 창(또는 우승 창)을
    // 닫아 버리면 구경이 영영 멈춤(단추 없음) → 멈춤 감지(stuck)가 잡음 (poker/main.js showEnd 의 setTimeout). 결과 창 8번 넘기면 끝
    watchskip: {
      start: () => {
        window.__qaKey = ''; window.__qaEnds = 0;
        const q = s => document.querySelector(s);
        q('.seg[data-seg="mode"] [data-val="watch"]').click();
        q('#countSeg [data-val="2"]').click();                       // AI 2명 (판이 짧아야 타이머와 겹침)
        q('#goStart').click();
      },
      timeout: 120000,
    },
  },
  quickModes: ['solo', 'watchskip'],   // watchskip = 알려진 버그(결과 창 타이머) 재발 확인 — 빠른 모드에도
  probe: mode => {
    const ses = window.__poker && __poker.ses;
    if (!ses) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const s = ses.S || ses.V;
    if (!s) return { fp: 'nostate|' + ses.mode, over: false, waiting: false, info: '아직 판이 안 만들어짐 (' + ses.mode + ')' };
    const em = document.getElementById('endModal');
    const skip = mode === 'watchskip';
    return {
      fp: [ses.mode, s.round, s.street, s.phase, s.turn, s.pot, s.board.length, s.coins.join('.'), s.bets.join('.'), s.folded.map(Number).join(''), window.HotSeat && HotSeat.isOpen ? 'cover' : '', s.over ? 'over' : ''].join('|'),
      over: skip ? (window.__qaEnds || 0) >= 8 : !!em && !em.hidden,
      waiting: !!ses.pending,
      info: skip ? `결과 창 ${window.__qaEnds || 0}번 넘김 · ${s.round}번째 핸드 · ${s.phase}${em && !em.hidden ? ' · 결과 창 보임' : ' · 결과 창 안 보임'}` : `${s.round}번째 핸드 · 스트리트 ${s.street} · ${s.phase} · 차례 ${s.turn} · 팟 ${s.pot}`,
    };
  },
  // 가림막 닫고, 내 차례면 단추 하나 누름 (체크/콜 위주 + 가끔 다른 것 → 폴드·하프·팟·올인도 거침)
  drive: mode => {
    __qa.hot();
    const ses = window.__poker && __poker.ses; if (!ses) return;
    if (mode === 'watchskip') {
      // 홀수 번째 결과 창은 뜨자마자 눌러 넘기고(= 4.2초 자동 타이머를 남김), 짝수 번째는 안 누르고 자동으로 넘어가길 기다림
      // → 남긴 타이머가 다음 창을 닫아 버리면(버그) 구경이 멈춤. 게임 끝(우승) 창은 자동 넘김이 없으니 남은 타이머가 지난 뒤(6초) 누름
      const em = document.getElementById('endModal'), s = ses.S, now = Date.now();
      if (em && !em.hidden && s) {
        const key = s.round + '|' + (s.over ? 'o' : 'h');
        if (window.__qaKey !== key) { window.__qaKey = key; window.__qaEnds = (window.__qaEnds || 0) + 1; window.__qaPrevT = window.__qaT || 0; window.__qaT = now; }
        const odd = window.__qaEnds % 2 === 1;
        const go = s.over ? now - window.__qaPrevT > 6000 : odd || now - window.__qaT > 9000;
        const b = em.querySelector('#endBtns button.primary');
        if (go && b && !b.disabled) b.click();
      }
      return;
    }
    const btns = __qa.$$('#betBar .bet-btn').filter(b => !b.disabled);
    if (!btns.length) return;
    const n = window.__qaN = (window.__qaN || 0) + 1;
    const call = btns.find(b => b.dataset.act === '1');
    (n % 4 === 0 ? btns[(n >> 2) % btns.length] : (call || btns[0])).click();
  },
  online: {
    // 시작 창에서 '친구랑' → 방 만들기·들어가기 → 친구랑 창
    open: () => {
      document.querySelector('.seg[data-seg="mode"] [data-val="online"]').click();
      document.getElementById('goStart').click();
    },
    started: () => { const ses = window.__poker && __poker.ses; return !!(ses && ses.net && (ses.S || ses.V) && document.getElementById('startModal').hidden); },
    setup: () => { window.__qaPause = false; window.__qaN = 0; },
    round: () => { const ses = window.__poker && __poker.ses, s = ses && (ses.S || ses.V); return s ? s.round + (s.over ? 'o' : '') : -1; },
    // 방장·손님이 같이 가져야 하는 것만 (남의 손패는 손님 화면에서 가려짐 → 제외, 보드·칩·차례만)
    fp: () => {
      const ses = __poker.ses, s = ses && (ses.S || ses.V); if (!s) return null;
      return JSON.stringify({ r: s.round, st: s.street, ph: s.phase, t: s.turn, p: s.pot, c: s.coins, b: s.bets, f: s.folded, a: s.allIn, bd: s.board, d: s.dealer, o: s.out, ov: s.over, w: s.result ? [s.result.kind, s.result.winners] : null });
    },
    drive: () => {
      if (window.__qaPause) return;
      const ses = window.__poker && __poker.ses; if (!ses) return;
      const em = document.getElementById('endModal');
      if (em && !em.hidden) { const b = em.querySelector('#endBtns button.primary'); if (b && !b.disabled) b.click(); return; }
      const btns = __qa.$$('#betBar .bet-btn').filter(b => !b.disabled);
      if (!btns.length) return;
      const n = window.__qaN = (window.__qaN || 0) + 1;
      const call = btns.find(b => b.dataset.act === '1');
      (n % 4 === 0 ? btns[(n >> 2) % btns.length] : (call || btns[0])).click();
    },
    pause: () => { window.__qaPause = true; },
    resume: () => { window.__qaPause = false; },
  },
};

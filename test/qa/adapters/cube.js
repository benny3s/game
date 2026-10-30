// 베니큐브 어댑터 — 손잡이 __cube: G · state · startGame(mode, seed) · goMenu · autoTurn(내 차례를 AI 가 대신) · fastFwd · revealCover · openFriend
//  · solo  = 나 + AI 1명 (입문자) · hot = 한 폰으로(사람 2명, 차례마다 가림막) · watch = AI 4명 구경
//  · 한 판이 끝나면 결과 창(.overlay.result) 이 뜸 → over (나가리도 같은 창)
//  · AI 차례는 진짜 타이머(schedule)로 두되 G.speed 를 4 로 올려서 빨리 끝냄
module.exports = {
  id: 'cube',
  path: 'cube/',
  query: '',
  hookName: '__cube',
  ready: () => !!window.__cube && !!document.getElementById('startBtn') && !!document.getElementById('play'),
  menu: () => document.getElementById('play').hidden,
  home: () => __cube.goMenu(),
  setup: () => { window.__qaPause = false; },
  modes: {
    solo: {
      start: seed => {
        const q = s => document.querySelector(s);
        q('#tabSolo').click();
        q('#aiCount [data-v="1"]').click();               // AI 1명
        q('#tiers [data-id="easy"]').click();             // 입문자
        __cube.startGame('solo', seed);
      },
      timeout: 120000,
    },
    hot: {
      start: seed => {
        document.getElementById('tabLocal').click();      // 자리 고르기 기본값: 사람 2명
        __cube.startGame('local', seed);
      },
      timeout: 120000,
    },
    watch: {
      start: seed => {
        const q = s => document.querySelector(s);
        q('#tabWatch').click();
        q('#wTiers [data-id="easy"]').click();
        __cube.startGame('watch', seed);
      },
      timeout: 120000,
    },
  },
  quickModes: ['solo'],
  probe: () => {
    const G = window.__cube && __cube.G;
    if (!G || !G.st) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const st = G.st;
    const lv = G.levels[st.turn];
    return {
      fp: [G.mode, G.round, G.log.length, st.turn, st.phase, st.deck.length, window.HotSeat && HotSeat.isOpen ? 'cover' : ''].join('|'),
      over: !!G.over && !!document.querySelector('.overlay.result'),
      waiting: st.phase !== 'over' && !G.over && lv === 'human',
      info: `${G.round}판 · ${G.log.length}번째 수 · ${st.phase} · 차례 ${st.turn} · 더미 ${st.deck.length}`,
    };
  },
  // 가림막 닫고, AI 속도 올리고, 내 차례면 AI 가 대신 한 턴(뽑기 + 버리기) 둠
  drive: () => {
    __qa.hot();
    const G = window.__cube && __cube.G; if (!G || !G.st) return;
    if (G.mode === 'local') { const cv = document.getElementById('cover'), cb = document.getElementById('coverBtn'); if (cv && !cv.hidden && cb && !cb.disabled) cb.click(); }
    if (G.speed < 4) G.speed = 4;
    if (window.__qaPause || G.mode === 'watch' || G.over) return;
    __cube.autoTurn();      // 뽑기
    __cube.autoTurn();      // 버리기 (뽑은 직후 같은 턴)
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    started: () => { const G = window.__cube && __cube.G; return !!(G && G.mode === 'online' && G.net && G.st && !document.getElementById('play').hidden); },
    setup: () => { window.__qaPause = false; },
    round: () => { const G = window.__cube && __cube.G; return G && G.mode === 'online' ? G.round : -1; },
    // 두 화면 모두 같은 씨앗에서 수를 되풀이해 만든 판 → 손패까지 같아야 함
    fp: () => {
      const G = __cube.G, st = G && G.st; if (!st) return null;
      return JSON.stringify({ r: G.round, k: G.log.length, t: st.turn, ph: st.phase, d: st.deck.length, dc: st.discards, h: st.hands.map(h => h.slice().sort((a, b) => a - b)), w: st.winner });
    },
    drive: () => {
      if (window.__qaPause) return;
      const G = window.__cube && __cube.G; if (!G || !G.st) return;
      const ov = document.querySelector('.overlay.result');
      if (ov) { const b = [...ov.querySelectorAll('.row .btn.primary')].find(x => !x.disabled); if (b) b.click(); return; }
      if (G.over) return;
      __cube.autoTurn();
      __cube.autoTurn();
    },
    pause: () => { window.__qaPause = true; },
    resume: () => { window.__qaPause = false; },
  },
};

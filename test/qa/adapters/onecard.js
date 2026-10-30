// 원카드 어댑터 — 고스톱과 같은 틀 (window.__onecard: start · startHot · home · fast · autoHuman · act · call · catchIt · legal)
// ※ 원카드는 다른 일꾼이 아직 만드는 중 → wip: 메뉴가 안 열리면 '버그'가 아니라 '건너뜀'으로 적음 (게임 코드는 안 건드림)
//   원카드! 외치기(phase 'call')는 시간 경주라 자동 응답(autoHuman)이 안 받음 → drive() 가 #callZone 의 진짜 단추(원카드!/잡았다!)를 누름
module.exports = {
  id: 'onecard',
  path: 'onecard/',
  query: '',
  wip: true,
  hookName: '__onecard',
  ready: () => !!window.__onecard && !!document.getElementById('home') && !!document.getElementById('startBtn'),
  menu: () => !document.getElementById('home').hidden,
  home: () => __onecard.home(),
  setup: () => { __onecard.fast(1); __onecard.autoHuman = true; window.__qaN = 0; },
  modes: {
    solo: { start: seed => __onecard.start({ seed, n: 2, tier: 'easy' }), timeout: 60000 },
    watch: { start: seed => __onecard.start({ seed, watch: true, wN: 3, wTiers: ['easy', 'normal', 'easy'] }), timeout: 60000 },
    hot: { start: seed => __onecard.startHot({ seed, seats: [{ kind: 'human', name: '사람1' }, { kind: 'human', name: '사람2' }] }), timeout: 60000 },
  },
  quickModes: ['solo'],
  probe: () => {
    const g = window.__onecard, ses = g.ses, s = g.state;
    if (!ses || !s) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const rb = document.getElementById('resBox');
    return {
      fp: [s.round, s.turnNo, s.phase, s.turn, s.hands.map(h => h.length).join('.'), s.pile.length, s.deck.length, ses.seq, window.HotSeat && HotSeat.isOpen ? 'cover' : ''].join('|'),
      over: (rb && !rb.hidden) || s.phase === 'end',
      waiting: !!(ses.pending && !ses.pending.isResult),
      info: `판 ${s.round} · 수 ${s.turnNo} · ${s.phase} · 차례 ${s.turn} · 손패 ${s.hands.map(h => h.length).join('/')}`,
    };
  },
  drive: () => {
    const g = window.__onecard, ses = g.ses; if (!ses) return;
    __qa.hot();
    const cz = document.getElementById('callZone');
    if (cz && !cz.hidden) { const n = window.__qaN = (window.__qaN || 0) + 1; if (n % 3) g.call(); else g.catchIt(); return; }
    if (!ses.pending || ses.pending.isResult || ses.pending.isCall) { window.__qaPend = 0; return; }
    const n = window.__qaPend = (window.__qaPend || 0) + 1;
    if (__qa.click('.overlay:not([hidden]) .picks button')) return;   // 무늬 고르기 등
    if (n > 4) { const L = g.legal(); if (L.length) g.act(L[0]); window.__qaPend = 0; }
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    started: () => !!(window.__onecard && __onecard.ses && __onecard.ses.cfg && __onecard.ses.cfg.online && !document.getElementById('play').hidden && __onecard.state),
    setup: () => { __onecard.fast(1); __onecard.autoHuman = true; },
    round: () => { const s = window.__onecard && __onecard.state; return s ? s.round : -1; },
    // 손님 화면은 남의 손패가 가려진 view 일 수 있음 → 장수만 비교
    fp: () => { const s = __onecard.state, ses = __onecard.ses; return s ? JSON.stringify({ r: s.round, t: s.turnNo, tu: s.turn, ph: s.phase, h: s.hands.map(h => h.length), p: s.pile.length, top: s.pile[s.pile.length - 1], d: s.deck.length, su: s.suit, atk: s.atk, out: s.out, seq: ses.seq }) : null; },
    drive: () => {
      const g = window.__onecard, ses = g.ses; if (!ses) return;
      if (window.__qaPause) return;
      const r = document.getElementById('resBox');
      if (r && !r.hidden) { const b = r.querySelector('.btn.primary'); if (b && !b.disabled) b.click(); return; }
      const cz = document.getElementById('callZone');
      if (cz && !cz.hidden) { g.call(); return; }
      if (g.autoHuman && ses.pending && !ses.pending.isResult && !ses.pending.isCall) { const n = window.__qaPend = (window.__qaPend || 0) + 1; if (n > 4) { const L = g.legal(); if (L.length) g.act(L[0]); window.__qaPend = 0; } } else window.__qaPend = 0;
    },
    pause: () => { window.__qaPause = true; __onecard.autoHuman = false; },
    resume: () => { window.__qaPause = false; __onecard.autoHuman = true; },
  },
};

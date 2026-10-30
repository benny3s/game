// 고스톱 어댑터 — 다른 어댑터의 본보기
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
//   window.__qa 도우미: vis(el) · $$(sel) · click(sel) · clickText(re, sel) · hot() (한 기기 가림막 닫기) · hash(x)
module.exports = {
  id: 'gostop',
  path: 'gostop/',
  query: '',
  ready: () => !!window.__gostop && !!document.getElementById('home'),
  menu: () => !document.getElementById('home').hidden,
  home: () => __gostop.home(),
  setup: () => { __gostop.fast(1); __gostop.autoHuman = true; },
  modes: {
    solo: { start: seed => __gostop.start({ seed, mode: 2, tier: 'easy' }), timeout: 60000 },
    watch: { start: seed => __gostop.start({ seed, watch: true, wMode: 2, wTiers: ['easy', 'easy'] }), timeout: 60000 },
    hot: { start: seed => __gostop.startHot({ seed, mode: 2, seats: ['human', 'human'] }), timeout: 60000 },
  },
  quickModes: ['solo'],
  // 지금 상태: fp(바뀌면 진행 중) · over(한 판 끝) · waiting(사람 입력 기다림)
  probe: () => {
    const g = window.__gostop, ses = g.ses, s = g.state;
    if (!ses || !s) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const res = !document.getElementById('resBox').hidden || !!(ses.pending && ses.pending.isResult);
    return {
      fp: [s.round, s.turnNo, s.phase, s.turn, s.hands.map(h => h.length).join('.'), s.table.length, ses.seq].join('|'),
      over: res || s.phase === 'end',
      waiting: !!(ses.pending && !ses.pending.isResult),
      info: `판 ${s.round} · 수 ${s.turnNo} · ${s.phase} · 차례 ${s.turn}`,
    };
  },
  // 사람 차례 자동 응답: 진짜 화면 단추를 먼저 누르고, 안 되면 손잡이로
  drive: () => {
    const g = window.__gostop, ses = g.ses; if (!ses) return;
    __qa.hot();
    if (!ses.pending || ses.pending.isResult) { window.__qaPend = 0; return; }
    const n = window.__qaPend = (window.__qaPend || 0) + 1;
    if (!document.getElementById('goBox').hidden && __qa.click('#goBtns button')) return;
    if (__qa.click('.overlay:not([hidden]) .picks button')) return;
    if (n > 4) { const L = g.legal(); if (L.length) g.act(L[0]); window.__qaPend = 0; }
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    started: () => !!(window.__gostop && __gostop.ses && __gostop.ses.cfg && __gostop.ses.cfg.online && !document.getElementById('play').hidden && __gostop.state),
    setup: () => { __gostop.fast(1); __gostop.autoHuman = true; },
    round: () => { const s = window.__gostop && __gostop.state; return s ? s.round : -1; },
    fp: () => { const s = __gostop.state, ses = __gostop.ses; return s ? JSON.stringify({ r: s.round, t: s.turnNo, h: s.hands, tb: s.table.slice().sort(), cap: s.cap, ph: s.phase, seq: ses.seq }) : null; },
    drive: () => {
      const g = window.__gostop, ses = g.ses; if (!ses) return;
      const r = document.getElementById('resBox');
      if (r && !r.hidden) { const b = r.querySelector('.btn.primary'); if (b && !b.disabled) b.click(); return; }
      if (g.autoHuman && ses.pending && !ses.pending.isResult) { const n = window.__qaPend = (window.__qaPend || 0) + 1; if (n > 4) { const L = g.legal(); if (L.length) g.act(L[0]); window.__qaPend = 0; } } else window.__qaPend = 0;
    },
    pause: () => { __gostop.autoHuman = false; },
    resume: () => { __gostop.autoHuman = true; },
  },
};

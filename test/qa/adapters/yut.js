// 윷놀이 어댑터 — 손잡이 __yut: ses · fast(빠르게) · seed(씨앗) · submit · autoAct(내 차례를 AI 가 대신) · canAct
//  · solo  = '혼자(AI 와)' 탭: 나 1팀 + AI 1팀 (병아리), 말 2개
//  · hot   = '한 기기' 탭: 사람 2팀, 말 2개 (윷놀이는 가림막이 없음)
//  · watch = 따로 메뉴는 없지만 '한 기기' 탭에서 두 팀을 모두 AI(병아리)로 두면 사람 없이 AI 끼리 한 판 → 구경 대용
//  · 한 판이 끝나면 결과 창(.overlay.yres) 이 뜸 → over
module.exports = {
  id: 'yut',
  path: 'yut/',
  query: '',
  hookName: '__yut',
  ready: () => !!window.__yut && !!document.getElementById('home') && !!document.getElementById('startBtn'),
  menu: () => !document.getElementById('home').hidden,
  home: () => { const b = document.getElementById('backBtn'); if (b) { b.click(); b.click(); } },   // 두 번 눌러야 나감 (backGuard)
  setup: () => { __yut.fast(1); window.__qaPause = false; },
  modes: {
    solo: {
      start: seed => {
        const q = s => document.querySelector(s);
        __yut.fast(1); __yut.seed(seed);
        q('#tabAi').click();
        q('#aiCountSeg [data-v="1"]').click();           // AI 1팀
        q('#tiers [data-id="easy"]').click();            // 병아리
        q('#pieceSeg [data-v="2"]').click();             // 말 2개
        q('#startBtn').click();
      },
      timeout: 90000,
    },
    hot: {
      start: seed => {
        const q = s => document.querySelector(s);
        __yut.fast(1); __yut.seed(seed);
        q('#tabLocal').click();
        q('#teamSeg [data-v="2"]').click();              // 2팀
        q('[data-ty="0"] [data-v="human"]').click();
        q('[data-ty="1"] [data-v="human"]').click();
        q('#pieceSeg [data-v="2"]').click();
        q('#startBtn').click();
      },
      timeout: 90000,
    },
    watch: {
      start: seed => {
        const q = s => document.querySelector(s);
        __yut.fast(1); __yut.seed(seed);
        q('#tabLocal').click();
        q('#teamSeg [data-v="2"]').click();
        q('[data-ty="0"] [data-v="easy"]').click();      // 두 팀 모두 AI
        q('[data-ty="1"] [data-v="easy"]').click();
        q('#pieceSeg [data-v="2"]').click();
        q('#startBtn').click();
      },
      timeout: 90000,
    },
  },
  quickModes: ['solo'],
  probe: () => {
    const ses = window.__yut && __yut.ses;
    if (!ses || !ses.S) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const S = ses.S;
    return {
      fp: [ses.games, S.turnNo, S.throwNo, S.turn, S.phase, S.pool.join(','), JSON.stringify(S.pos)].join('|'),
      over: S.phase === 'end' && !!document.querySelector('.overlay.yres'),
      waiting: !!__yut.canAct(),
      info: `${ses.games}번째 판 · ${S.turnNo}번째 차례 · ${S.phase} · 팀 ${S.turn}`,
    };
  },
  // 처음 한 번 뜨는 '하는 법' 창을 닫고, 내 차례면 AI 가 대신 던지고·옮김
  drive: () => {
    __qa.clickText(/알겠어요/);
    if (window.__qaPause) return;
    __yut.autoAct();
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    // 대기실에서 말 2개로 (빨리 끝나게)
    beforeStart: () => { const b = document.querySelector('.ylob [data-s="pieces"] [data-v="2"]'); if (b) b.click(); },
    started: () => { const ses = window.__yut && __yut.ses; return !!(ses && ses.cfg && ses.cfg.mode === 'online' && !document.getElementById('play').hidden && ses.S); },
    setup: () => { __yut.fast(1); window.__qaPause = false; },
    round: () => { const ses = window.__yut && __yut.ses; return ses && ses.S ? ses.games : -1; },
    // 방장·손님 모두 가진 것만 (rng 는 손님 쪽이 0 으로 지워짐 → 제외)
    fp: () => {
      const ses = __yut.ses, S = ses && ses.S; if (!S) return null;
      return JSON.stringify({ g: ses.games, tn: S.turnNo, th: S.throwNo, t: S.turn, ph: S.phase, ex: S.extra, pool: S.pool, pos: S.pos, mi: S.mi, w: S.winner });
    },
    drive: () => {
      if (window.__qaPause) return;
      const ov = document.querySelector('.overlay.yres');
      if (ov) { const b = [...ov.querySelectorAll('.row .btn.primary')].find(x => !x.disabled); if (b) b.click(); return; }
      __yut.autoAct();
    },
    pause: () => { window.__qaPause = true; },
    resume: () => { window.__qaPause = false; },
  },
};

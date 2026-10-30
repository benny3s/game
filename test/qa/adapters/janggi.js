// 장기 어댑터 — 혼자(solo, AI 대전) · AI 구경(watch) · 한 기기 둘이서(hot) · 친구랑(mock)
// ※ window.__janggi 는 ?debug 가 있어야 생김 → query: 'debug'. 손잡이에 newGame·goMenu 가 없어서 시작·나가기는 진짜 메뉴 단추를 누름.
// 수는 진짜 판(#board)에 pointerdown 을 두 번(고르기 → 갈 곳) 보내서 둠 → board.js 의 눌러 두기 길 그대로.
// 상차림(마·상 자리)은 판 아래 #setupBox 의 진짜 단추(.su-o → #suGo)로 고름.
//
// 한 판이 끝나는 길 (실제 사용자가 할 수 있는 길만):
//   solo  : 내 수 15번(무작위 합법수, 잡을 수 있으면 잡기) → 안 끝났으면 [기권] → 확인창 [기권]
//   hot   : 두 사람 역할로 무작위 합법수 20수 → [기권] → 확인창 [기권]
//   watch : AI 둘(🐯 고급 vs 🐣 초급, 빠르게)이 끝까지
//   친구랑: 두 사람이 무작위 합법수 (40수까지), 세 번째 비교 직전에 방장이 [기권]

const MK = function () {
  const qa = window.__qa;
  const J = () => window.__janggi;
  const H = {
    rnd() { let s = (window.__qaSeed >>> 0) || 2463534242; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; window.__qaSeed = s; return s / 4294967296; },
    G() { return J() && J().G; },
    // main.js 의 humanTurn() 과 같은 조건 (그 함수는 바깥에 안 보임)
    myTurn() {
      const G = H.G(); if (!G || G.over || G.thinking) return false;
      const c = G.s.turn;
      if (G.mode === 'online') return G.me === c;
      return !!G.players[c] && G.players[c].kind === 'human';
    },
    legal() { return J().C.legal(H.G().s).filter(m => !m.pass && m.from != null); },
    // 판 위 자리 sq 를 손가락으로 누른 것처럼 (pointerdown)
    tap(sq) {
      const b = J().board, el = b.el, r = el.getBoundingClientRect(), d = b.disp(sq);
      const x = r.left + (d[0] + 0.5) * r.width / 9, y = r.top + (d[1] + 0.5) * r.height / 10;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 }));
    },
    move(m) { H.tap(m.from); H.tap(m.to); },
    pick() {
      const L = H.legal(); if (!L.length) return null;
      const cap = L.filter(m => m.captured);
      const pool = cap.length && H.rnd() < 0.7 ? cap : L;
      return pool[Math.floor(H.rnd() * pool.length)];
    },
    // 상차림 칸이 떠 있으면 아무 상차림이나 고르고 [이대로 ✔]
    setup() {
      const box = document.getElementById('setupBox'); if (!box || box.hidden) return false;
      const os = qa.$$('#suOpts .su-o'); if (os.length) os[Math.floor(H.rnd() * os.length)].click();
      qa.click('#suGo');
      return true;
    },
    modal(re) { return qa.clickText(re, '.overlay:not([hidden]) button'); },
    resultShown() { const G = H.G(); return !!(G && G.over && qa.$$('.overlay button').some(b => /기보 복사/.test(b.textContent))); },
    press(sel) { return qa.click(sel); },
  };
  return H;
};
const withH = fn => new Function('arg', 'const H = window.__qaH || (window.__qaH = (' + MK.toString() + ')()); return (' + fn.toString() + ')(arg, H);');

module.exports = {
  id: 'janggi',
  path: 'janggi/',
  query: 'debug',
  hookName: 'window.__janggi (주소에 ?debug 가 있어야 생김)',
  reproHint: (mode, seed) => mode === 'solo' ? '메뉴: 혼자 → AI 단계 → 초 → 시작, 상차림 아무거나, 내 수 15번 두고 기권' : mode === 'hot' ? '메뉴: 둘이서 → 시작, 상차림 둘 다, 20수 두고 기권' : '메뉴: AI 구경 → 초 🐯 고급 · 한 🐣 초급 · 빠르게 → 구경 시작',
  gaps: ['__janggi 손잡이는 ?debug 주소에서만 생기고 newGame · goMenu 가 없음 → 어댑터는 메뉴 단추를 눌러 시작·나가기 함, AI 씨앗은 게임 안 Math.random 이라 같은 판 재현 불가'],
  ready: withH((_, H) => !!window.__janggi && !!document.getElementById('home') && !!window.__qa),
  menu: withH((_, H) => document.getElementById('play').hidden && !document.getElementById('home').hidden),
  // 판 위 [‹]: 끝난 판은 바로 메뉴, 두는 중이면 '나갈까요?' 창의 [나가기]
  home: withH((_, H) => {
    if (!document.getElementById('play').hidden) { document.getElementById('backBtn').click(); H.modal(/^나가기$/); }
    else location.reload();
  }),
  setup: withH((mode, H) => { window.__qaSeed = 12345; window.__qaPause = 0; window.__qaEx = {}; }),
  modes: {
    solo: {
      timeout: 120000, stuckMs: 40000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1; window.__qaEx = {};
        H.press('#tabSolo'); H.press('#tiers .tier[data-t="' + ['easy', 'normal'][((seed || 1) >>> 3) % 2] + '"]');
        H.press('#sideSeg [data-v="0"]');
        H.press('#startBtn');
      }),
    },
    watch: {
      timeout: 240000, stuckMs: 45000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1;
        H.press('#tabWatch'); H.press('#watchC [data-v="hard"]'); H.press('#watchH [data-v="easy"]'); H.press('#speedSeg [data-v="fast"]');
        H.press('#startBtn');
      }),
    },
    hot: {
      timeout: 90000, stuckMs: 30000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1; window.__qaEx = {};
        H.press('#tabDuo');
        H.press('#startBtn');
      }),
    },
  },
  quickModes: ['solo'],
  probe: withH((mode, H) => {
    const G = H.G();
    if (!G) return { fp: 'none', over: false, waiting: false, info: '판 없음' };
    const s = G.s;
    const su = !document.getElementById('setupBox').hidden;
    return {
      fp: [G.round || 0, s.phase, s.moves.join(' '), s.over ? 1 : 0, G.thinking ? 1 : 0, su ? 1 : 0, document.querySelectorAll('.overlay:not([hidden])').length].join('|'),
      over: H.resultShown(),
      waiting: H.myTurn(),
      info: `${G.mode}${G.mode === 'ai' ? ' · AI ' + G.cfg.tier : ''} · ${s.phase} · ${s.moves.length}수 · 차례 ${s.turn ? '한' : '초'}${G.thinking ? ' · AI 생각 중' : ''}${su ? ' · 상차림 칸' : ''}${s.over ? ' · 끝: ' + s.reason + ' 승자 ' + s.winner : ''}`,
    };
  }),
  drive: withH((mode, H) => {
    const G = H.G(); if (!G) return;
    if (H.modal(/^알겠어요$/)) return;                         // 처음 안내창
    if (G.over) return;                                        // 결과창을 기다림
    if (mode === 'watch') return;
    if (!H.myTurn()) return;
    if (H.modal(/^기권$/)) return;                             // 확인창 [기권]
    if (H.setup()) return;
    if (G.s.phase !== 'play') return;
    const n = G.s.moves.length, ex = window.__qaEx = window.__qaEx || {};
    const limit = mode === 'solo' ? 32 : 22;                  // 상차림 2 + 내 수 15 (혼자) / 20수 (둘이서)
    if (mode === 'solo' && n >= 6 && !ex.flip) { ex.flip = 1; window.__qa.click('#flipBtn'); return; }
    if (mode === 'solo' && n >= 10 && !ex.undo) { ex.undo = 1; window.__qa.click('#undoBtn'); return; }
    if (n < limit) { const m = H.pick(); if (m) H.move(m); return; }
    window.__qa.click('#resignBtn');
  }),
  online: {
    open: withH((_, H) => { document.getElementById('tabFriend').click(); }),
    started: withH((_, H) => { const G = H.G(); return !!(G && G.mode === 'online' && !document.getElementById('play').hidden); }),
    setup: withH((role, H) => { window.__qaRole = role; window.__qaSeed = role === 'host' ? 777 : role === 'guest' ? 999 : 555; window.__qaPause = 0; window.__qaLast = 0; }),
    round: withH((_, H) => { const G = H.G(); return G && G.mode === 'online' ? G.round : -1; }),
    // 두 화면이 같아야 하는 것: 몇 번째 판 + 수 순서(상차림 포함) + 끝 표시 + 자리표
    fp: withH((_, H) => { const G = H.G(); if (!G || G.mode !== 'online') return null; return [G.round, G.s.moves.join(' '), G.s.over ? G.s.winner + ':' + G.s.reason : '', JSON.stringify(G.seats)].join('|'); }),
    drive: withH((role, H) => {
      const G = H.G(); if (!G || G.mode !== 'online') return;
      H.modal(/^알겠어요$/);
      if (window.__qaPause || !H.myTurn()) return;
      const now = Date.now();
      if (now - (window.__qaLast || 0) < 450) return;
      window.__qaLast = now;
      if (H.setup()) return;
      if (G.s.phase !== 'play' || G.s.moves.length >= 42) return;
      const m = H.pick(); if (m) H.move(m);
    }),
    pause: withH((_, H) => {
      window.__qaPause = 1;
      if (window.__qaRole === 'host' && (window.__qaPauses = (window.__qaPauses || 0) + 1) === 3) { document.getElementById('resignBtn').click(); H.modal(/^기권$/); }
    }),
    resume: withH((_, H) => { window.__qaPause = 0; }),
    stuckMs: 35000,
  },
};

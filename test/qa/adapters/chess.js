// 체스 어댑터 — 혼자(solo, AI 대전) · AI 구경(watch) · 한 기기 둘이서(hot) · 친구랑(mock)
// ※ window.__chess 는 ?debug 가 있어야 생김 → query: 'debug'. 그 손잡이에는 newGame 이 없어서 시작은 진짜 메뉴 단추를 누름.
// 규칙: 브라우저 안에서 도는 함수들은 withH() 로 감쌈 → (인자, H) 로 받음. H = 아래 MK 가 만든 도우미 (페이지에 한 번만 심김)
// 수는 진짜 판에서 기물 칸을 누르고(고르기) 갈 칸을 누르는(두기) 포인터 이벤트로 둠 → board.js 의 눌러 두기 길 그대로.
//
// 한 판이 끝나는 길 (실제 사용자가 할 수 있는 길만):
//   solo  : 내 수 15번(무작위 합법수) → 안 끝났으면 [기권] → 확인창 [기권]   (그 사이 AI 가 체크메이트하면 거기서 끝)
//   hot   : 두 사람 역할 — 나이트 왕복 4수로 처음 모양 되돌리기 → 스칼라 메이트(e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#) = 체크메이트로 끝 · 시계 5분 켬
//   watch : AI 둘(🐯 고급 vs 🐣 초급, 빠르게)이 끝까지 (체크메이트·무승부 어느 쪽이든)
//   친구랑: 두 사람이 무작위 합법수 (체크메이트·승진은 피함 → 우연히 판이 끝나 fp 가 멎는 일 방지), 44수까지

const MK = function () {
  const qa = window.__qa;
  const ch = () => window.__chess;
  const H = {
    rnd() { let s = (window.__qaSeed >>> 0) || 2463534242; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; window.__qaSeed = s; return s / 4294967296; },
    G() { return ch() && ch().G; },
    // main.js 의 humanTurn() 과 같은 조건 (그 함수는 바깥에 안 보임)
    myTurn() {
      const G = H.G(); if (!G || G.over || G.thinking) return false;
      const c = ch().C.turn(G.s);
      if (G.mode === 'online') return G.me === c;
      return G.players[c].kind === 'human';
    },
    legal() { return ch().C.legal(H.G().s); },
    // 판 위 칸 sq 를 손가락으로 누른 것처럼 (pointerdown + pointerup)
    tap(sq) {
      const b = ch().board, el = b.el, r = el.getBoundingClientRect(), d = b.disp(sq);
      const x = r.left + (d[0] + 0.5) * r.width / 8, y = r.top + (d[1] + 0.5) * r.height / 8;
      for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 }));
    },
    move(m) { H.tap(m.from); H.tap(m.to); },
    // 무작위 합법수 (승진·메이트는 피함. 다른 수가 없으면 아무거나)
    pick() {
      const L = H.legal(); if (!L.length) return null;
      const ok = L.filter(m => !m.promotion && !/#/.test(m.san));
      const pool = ok.length ? ok : L;
      return pool[Math.floor(H.rnd() * pool.length)];
    },
    // 승진 고르기 창이 떠 있으면 첫 말(퀸)을 고름
    promo() {
      const b = ch().board; if (b.promo.hidden) return false;
      const pp = b.promo.querySelector('.cb-pp'); if (!pp) return true;
      for (const t of ['pointerdown', 'pointerup']) pp.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 8, button: 0 }));
      return true;
    },
    modal(re) { return qa.clickText(re, '.overlay:not([hidden]) button'); },
    resultShown() { const G = H.G(); return !!(G && G.over && qa.$$('.overlay button').some(b => /다시 하기|한 판 더|대기실|기보 복사/.test(b.textContent))); },
    // 진짜 메뉴 단추 누르기: 눌러 보이는 것만
    press(sel) { return qa.click(sel); },
  };
  return H;
};
const withH = fn => new Function('arg', 'const H = window.__qaH || (window.__qaH = (' + MK.toString() + ')()); return (' + fn.toString() + ')(arg, H);');

module.exports = {
  id: 'chess',
  path: 'chess/',
  query: 'debug',
  hookName: 'window.__chess (주소에 ?debug 가 있어야 생김)',
  reproHint: (mode, seed) => mode === 'solo' ? `메뉴: 혼자 → ${['🐣 초급', '🐱 중급', '🐯 고급'][(seed >>> 3) % 3]} → 백 → 시계 없음 → 시작, 내 수 15번 두고 기권` : mode === 'hot' ? '메뉴: 둘이서 → 시계 5분 → 시작, 스칼라 메이트 e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7' : '메뉴: AI 구경 → 백 🐯 고급 · 흑 🐣 초급 · 빠르게 → 구경 시작',
  // 시험 손잡이의 빈틈 (버그 아님)
  gaps: ['__chess 손잡이는 ?debug 주소에서만 생기고 newGame · goMenu · hostAgain 이 없음 → 어댑터는 메뉴 단추를 눌러 시작·나가기 함 (메뉴 구조를 바꾸면 어댑터도 고쳐야 함)'],
  ready: withH((_, H) => !!window.__chess && !!document.getElementById('home') && !!window.__qa),
  menu: withH((_, H) => document.getElementById('play').hidden && !document.getElementById('home').hidden),
  // 판 안의 [‹]: 끝난 판은 바로 메뉴, 두는 중이면 '나갈까요?' 창의 [나가기]
  home: withH((_, H) => {
    if (!document.getElementById('play').hidden) { document.getElementById('backBtn').click(); H.modal(/^나가기$/); }
    else location.reload();
  }),
  setup: withH((mode, H) => { window.__qaSeed = 12345; window.__qaPause = 0; }),
  modes: {
    solo: {
      timeout: 120000, stuckMs: 40000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1; window.__qaEx = {};
        H.press('#tabSolo'); H.press('#tiers .tier[data-t="' + ['easy', 'normal', 'hard'][((seed || 1) >>> 3) % 3] + '"]');   // AI 단계는 씨앗에 따라
        H.press('#colorSeg [data-v="w"]'); H.press('#clockSeg [data-v="0"]');
        H.press('#startBtn');
      }),
    },
    watch: {
      timeout: 200000, stuckMs: 45000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1;
        H.press('#tabWatch'); H.press('#watchW [data-v="hard"]'); H.press('#watchB [data-v="easy"]'); H.press('#speedSeg [data-v="fast"]');
        H.press('#startBtn');
      }),
    },
    hot: {
      timeout: 60000, stuckMs: 30000,
      start: withH((seed, H) => {
        window.__qaSeed = seed || 1;
        H.press('#tabDuo'); H.press('#clockSeg [data-v="5"]');
        H.press('#startBtn');
      }),
    },
  },
  quickModes: ['solo'],
  probe: withH((mode, H) => {
    const G = H.G();
    if (!G) return { fp: 'none', over: false, waiting: false, info: '판 없음' };
    const s = G.s;
    const way = G.mode === 'ai' ? '내 15수 뒤에도 안 끝나면 기권' : G.mode === 'duo' ? '스칼라 메이트(체크메이트)' : 'AI 둘이 끝까지';
    return {
      fp: [G.round || 0, s.moves.join(' '), s.over ? 1 : 0, G.thinking ? 1 : 0, __chess.board.promo.hidden ? 0 : 1].join('|'),
      over: H.resultShown(),
      waiting: H.myTurn(),
      info: `${G.mode}${G.mode === 'ai' ? ' · AI ' + G.cfg.tier : ''} · ${s.moves.length}수(ply) · 차례 ${__chess.C.turn(s)}${G.thinking ? ' · AI 생각 중' : ''}${s.over ? ' · 끝: ' + s.reason + ' 승자 ' + s.winner : ''} · 끝난 길: ${way}`,
    };
  }),
  drive: withH((mode, H) => {
    const G = H.G(); if (!G) return;
    if (H.modal(/^알겠어요$/)) return;                         // 처음 안내창
    if (G.over) return;                                        // 결과창이 뜨기를 기다림
    if (H.promo()) return;                                     // 승진 고르기
    if (mode === 'watch') return;                              // AI 둘이 둠
    if (!H.myTurn()) return;
    const s = G.s, n = s.moves.length;
    if (mode === 'solo') {
      if (H.modal(/^기권$/)) return;                            // 확인창 [기권]
      // 곁가지 단추도 한 번씩: 판 돌리기 · 되돌리기
      const ex = window.__qaEx = window.__qaEx || {};
      if (n >= 4 && !ex.flip) { ex.flip = 1; window.__qa.click('#flipBtn'); return; }
      if (n >= 10 && !ex.undo) { ex.undo = 1; window.__qa.click('#undoBtn'); return; }
      if (n < 30) { const m = H.pick(); if (m) H.move(m); return; }
      window.__qa.click('#resignBtn');                         // 확인창은 다음 턴에
      return;
    }
    if (mode === 'hot') {
      const want = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'][n];
      const L = H.legal();
      const m = (want && L.find(x => x.uci === want)) || H.pick();
      if (m) H.move(m);
    }
  }),
  online: {
    open: withH((_, H) => { document.getElementById('tabFriend').click(); }),
    started: withH((_, H) => { const G = H.G(); return !!(G && G.mode === 'online' && !document.getElementById('play').hidden); }),
    setup: withH((role, H) => { window.__qaRole = role; window.__qaSeed = role === 'host' ? 777 : 999; window.__qaPause = 0; window.__qaLast = 0; }),
    round: withH((_, H) => { const G = H.G(); return G && G.mode === 'online' ? G.round : -1; }),
    // 두 화면이 같아야 하는 것: 몇 번째 판 + 수 순서 + 끝 표시 + 자리표 (시계는 빼고)
    fp: withH((_, H) => { const G = H.G(); if (!G || G.mode !== 'online') return null; return [G.round, G.s.moves.join(' '), G.s.over ? G.s.winner + ':' + G.s.reason : '', JSON.stringify(G.seats)].join('|'); }),
    drive: withH((role, H) => {
      const G = H.G(); if (!G || G.mode !== 'online') return;
      H.modal(/^알겠어요$/);
      if (H.promo()) return;
      if (window.__qaPause || !H.myTurn()) return;
      const now = Date.now();
      if (now - (window.__qaLast || 0) < 450) return;
      if (G.s.moves.length >= 44) return;
      window.__qaLast = now;
      const m = H.pick(); if (m) H.move(m);
    }),
    // 세 번째 멈춤(= 마지막 비교 직전)에 방장이 진짜 [기권] 단추로 판을 끝냄 → 끝 소식이 손님에게 같은 모양으로 가는지까지 비교됨
    pause: withH((_, H) => {
      window.__qaPause = 1;
      if (window.__qaRole === 'host' && (window.__qaPauses = (window.__qaPauses || 0) + 1) === 3) { document.getElementById('resignBtn').click(); H.modal(/^기권$/); }
    }),
    resume: withH((_, H) => { window.__qaPause = 0; }),
    stuckMs: 25000,
  },
};

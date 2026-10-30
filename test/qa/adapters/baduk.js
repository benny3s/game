// 바둑 어댑터 — 혼자(solo) · AI 구경(watch) · 한 기기 둘이서(hot) · 친구랑(mock)
// 규칙: 브라우저 안에서 도는 함수들은 withH() 로 감쌈 → (인자, H) 로 받음. H = 아래 MK 가 만든 도우미 (페이지에 한 번만 심김)
//   (gostop 본보기와 달리 도우미를 여러 함수가 같이 쓰므로 new Function 으로 감쌈 — 직렬화되어 브라우저에서 그대로 돌아감)
//
// 한 판이 끝나는 길 (실제 사용자가 할 수 있는 길만):
//   solo  : 내 수를 14번 둔 뒤 [패스] 한 번 → [기권] → 확인창 [기권]  (불계승. AI 가 같이 패스하면 계가 → [이대로 확정]으로 끝남)
//   hot   : 두 사람 역할로 번갈아 둔 뒤 [패스] 둘 → 계가 화면(죽은 돌 추정은 AI 워커) → [이대로 확정]  (집 계산 결과)
//   watch : AI 둘이 끝까지 (둘 다 패스 → 계가 → 자동 확정). 70수가 넘도록 안 끝나면 __baduk.score() 로 계가 화면으로 건너뜀 (시험 손잡이라 info 에 '[시험용 건너뜀]' 이 붙음)
// (숫자는 브라우저 안 함수에서 쓰므로 상수로 못 빼고 drive 안에 그대로 적음: solo 내 수 14번, hot 22수 뒤 패스, watch 70수)

const MK = function () {
  const qa = window.__qa;
  const bd = () => window.__baduk;
  const H = {
    rnd() { let s = (window.__qaSeed >>> 0) || 2463534242; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; window.__qaSeed = s; return s / 4294967296; },
    G() { return bd() && bd().G; },
    res() { return document.getElementById('resBox'); },
    canMove() { const G = H.G(); return !!(G && G.phase === 'play' && !G.st.over && G.players[G.st.toPlay] === 'human' && !G.thinking); },
    // 둘 수 있는 점 중 하나 (내 눈은 메우지 않음. 없으면 -1)
    pick() {
      const G = H.G(), st = G.st, N = st.size, B = bd().B, m = B.legal(st), me = st.toPlay, L = [];
      for (let p = 0; p < N * N; p++) {
        if (!m[p]) continue;
        const x = p % N, y = (p / N) | 0, nb = [];
        if (x > 0) nb.push(p - 1); if (x < N - 1) nb.push(p + 1); if (y > 0) nb.push(p - N); if (y < N - 1) nb.push(p + N);
        if (nb.every(q => st.board[q] === me)) continue;
        L.push(p);
      }
      return L.length ? L[Math.floor(H.rnd() * L.length)] : -1;
    },
    // 판을 손가락으로 누른 것처럼 (캔버스에 pointerdown + pointerup). 13·19줄은 한 번 눌러 자리를 보고 한 번 더 눌러야 놓임
    touch(p) {
      const g = bd().geom(), cv = document.getElementById('board'), N = g.N;
      const x = g.left + g.o + (p % N) * g.cell, y = g.top + g.o + ((p / N) | 0) * g.cell;
      for (let k = 0; k < (N >= 13 ? 2 : 1); k++) for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 11, pointerType: 'touch', isPrimary: true, button: 0 }));
    },
    // 겹쳐 뜬 창의 단추 누르기 (안내 · 확인창)
    modal(re) { return qa.clickText(re, '.overlay:not([hidden]) button'); },
    hash(G) { try { return bd().B.hash(G.st); } catch (e) { return '?'; } },
  };
  return H;
};
const withH = fn => new Function('arg', 'const H = window.__qaH || (window.__qaH = (' + MK.toString() + ')()); return (' + fn.toString() + ')(arg, H);');

module.exports = {
  id: 'baduk',
  path: 'baduk/',
  query: '',
  hookName: 'window.__baduk',
  reproHint: (mode, seed) => mode === 'solo' ? `__baduk.start({mode:'solo', size:${[7, 9, 13][seed % 3]}, tier:'${seed % 3 === 2 ? 'easy' : ['easy', 'normal', 'hard'][(seed >>> 3) % 3]}', color:'black'}) 후 내 수 14번 → 패스 → 기권` : mode === 'hot' ? `__baduk.start({mode:'duo', size:7}) 후 22수 → 패스 둘 → 이대로 확정` : `__baduk.start({mode:'watch', wsize:7, wb:'easy', ww:'easy', speed:'fast'})`,
  ready: withH((_, H) => !!window.__baduk && !!document.getElementById('home') && !!window.__qa),
  menu: withH((_, H) => !document.getElementById('home').hidden),
  // 판 안의 [‹] 는 두 번 눌러야 나감 (2초 안) — 진짜 단추 그대로. 메뉴가 아닌데 판도 아니면 새로 고침
  home: withH((_, H) => {
    if (!document.getElementById('play').hidden) { const b = document.getElementById('backBtn'); b.click(); b.click(); }
    else location.reload();
  }),
  setup: withH((mode, H) => { window.__qaSeed = 12345; }),
  modes: {
    solo: {
      timeout: 120000, stuckMs: 40000,
      // 판 크기: 씨앗에 따라 7 · 9 · 13줄 (13줄은 두 번 눌러 놓는 길까지), AI 단계도 씨앗에 따라 (13줄은 느려서 늘 입문). 수는 진짜 판을 손가락으로 누르는 이벤트로 둠 (solo · hot)
      start: withH((seed, H) => { window.__qaSeed = seed || 1; window.__qaPass = 0; window.__qaEx = {}; const n = [7, 9, 13][(seed || 1) % 3], tier = n === 13 ? 'easy' : ['easy', 'normal', 'hard'][((seed || 1) >>> 3) % 3]; __baduk.start({ mode: 'solo', size: n, tier, color: 'black', handi: n === 7 ? 'k9' : 'k6.5', atari: true }); }),
    },
    watch: {
      timeout: 180000, stuckMs: 40000,
      start: withH((seed, H) => { window.__qaSeed = seed || 1; window.__qaFF = 0; __baduk.start({ mode: 'watch', wsize: 7, wb: 'easy', ww: 'easy', speed: 'fast' }); }),
    },
    hot: {
      timeout: 90000, stuckMs: 40000,
      start: withH((seed, H) => { window.__qaSeed = seed || 1; __baduk.start({ mode: 'duo', size: 7, handi: 'k9' }); }),
    },
  },
  quickModes: ['solo'],
  probe: withH((mode, H) => {
    const G = H.G();
    if (!G) return { fp: 'none', over: false, waiting: false, info: '판 없음' };
    const st = G.st, resHidden = H.res().hidden;
    const scoring = G.phase === 'score' && !document.getElementById('scoreBtns').hidden && G.mode !== 'watch';
    return {
      fp: [G.phase, st.moves.length, st.caps.join(','), st.toPlay, st.passes, H.hash(G), G.thinking ? 1 : 0, resHidden ? 0 : 1].join('|'),
      over: !resHidden,
      waiting: H.canMove() || scoring,
      info: `${G.mode} ${st.size}줄${G.mode === 'solo' ? ' · AI ' + G.tiers[3 - G.human] : ''} · ${st.moves.length}수 · ${G.phase}${st.over ? '(끝: ' + (st.end && st.end.reason) + ')' : ''} · 차례 ${st.toPlay}${G.thinking ? ' · AI 생각 중' : ''} · 끝난 길: ${mode === 'solo' ? '패스 한 번 뒤 기권 (AI 도 패스하면 계가)' : mode === 'hot' ? '패스 둘→계가→확정' : 'AI 둘이 계가→자동 확정'} · ${document.getElementById('resTitle').textContent}${window.__qaFF ? ' · [시험용 건너뜀: 70수가 넘어 score() 호출]' : ''}`,
    };
  }),
  drive: withH((mode, H) => {
    const G = H.G(); if (!G) return;
    if (H.modal(/^알겠어요$/)) return;                         // 처음 안내창
    if (!H.res().hidden) return;                               // 결과창이 떠 있음 = 끝
    const st = G.st, qa = window.__qa;
    if (mode === 'watch') {
      // AI 둘이 둠. 너무 길어지면 계가로 건너뜀 (시험 손잡이 — info 에 표시됨)
      if (G.phase === 'play' && !st.over && st.moves.length > 70 && !G.thinking) { window.__qaFF = 1; __baduk.score(); }
      return;
    }
    if (G.phase === 'score') { qa.click('#confirmBtn'); return; }  // 계가: [이대로 확정]
    if (!H.canMove()) return;
    const n = st.moves.length;
    if (mode === 'solo') {
      if (H.modal(/^기권$/)) return;
      if (H.modal(/^패스$/)) return;
      // 곁가지 단추도 한 번씩: 형세(⚖️) · 되돌리기
      const ex = window.__qaEx = window.__qaEx || {};
      if (n >= 8 && !ex.est) { ex.est = 1; qa.click('#estBtn'); return; }
      if (n >= 12 && !ex.undo) { ex.undo = 1; qa.click('#undoBtn'); return; }
      if (n < 2 * 14) { const p = H.pick(); if (p >= 0) H.touch(p); else qa.click('#passBtn'); return; }
      // 내 수 14번 뒤: [패스] 한 번 (AI 가 같이 패스하면 계가 → [이대로 확정] — 쉬운 AI 는 보통 계속 둠) → 그다음 [기권]
      if ((window.__qaPass = (window.__qaPass || 0) + 1) <= 1) { qa.click('#passBtn'); return; }
      qa.click('#resignBtn');                                   // 확인창은 다음 턴에 [기권]
      return;
    }
    if (mode === 'hot') {
      if (H.modal(/^패스$/)) return;
      if (n < 22) { const p = H.pick(); if (p >= 0) H.touch(p); else qa.click('#passBtn'); return; }
      qa.click('#passBtn');
    }
  }),
  online: {
    open: withH((_, H) => { document.getElementById('tabFriend').click(); }),
    // 대기실(손님이 들어온 뒤)의 설정에서 7줄 고르기 (진짜 단추) — 방 만들 때의 임시 설정창은 버려져서 그때는 못 고름
    beforeStart: withH((_, H) => { const b = document.querySelector('#fSizeSeg button[data-v="7"]'); if (b) b.click(); }),
    started: withH((_, H) => { const G = H.G(); return !!(G && G.mode === 'online' && !document.getElementById('play').hidden); }),
    setup: withH((role, H) => { window.__qaRole = role; window.__qaSeed = role === 'host' ? 777 : 999; window.__qaPause = 0; window.__qaLast = 0; }),
    round: withH((_, H) => { const G = H.G(); return G && G.mode === 'online' ? G.g : -1; }),
    // 두 화면이 같아야 하는 것: 판(돌·차례·따냄·패·수 순서) + 몇 번째 판 + 단계
    fp: withH((_, H) => { const G = H.G(); if (!G || G.mode !== 'online') return null; return [G.g, G.phase, G.st.moves.length, H.hash(G)].join('|'); }),
    drive: withH((role, H) => {
      const G = H.G(); if (!G || G.mode !== 'online') return;
      H.modal(/^알겠어요$/);
      if (window.__qaPause || !H.canMove()) return;
      const now = Date.now();
      if (now - (window.__qaLast || 0) < 450) return;            // 한 쪽이 초당 2수 정도 (판이 가득 차지 않게)
      if (G.st.moves.length > 40) return;
      window.__qaLast = now;
      const p = H.pick(); if (p >= 0) __baduk.tap(p);
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

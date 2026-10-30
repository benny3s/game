// 오목 어댑터 — 혼자(solo, AI 대전) · AI 구경(watch) · 한 기기 둘이서(hot) · 친구랑(mock)
// 규칙: 브라우저 안에서 도는 함수들은 withH() 로 감쌈 → (인자, H) 로 받음. H = 아래 MK 가 만든 도우미 (페이지에 한 번만 심김)
// solo · hot 의 수는 진짜 판을 손가락으로 누르는 이벤트로 둠 (미리 보기 → 같은 자리 한 번 더 / [착수] 단추, 번갈아)
//
// 한 판이 끝나는 길 (실제 사용자가 할 수 있는 길만):
//   solo  : 내 수는 AI 가 이어 둔 줄을 막거나(없으면 돌 근처 아무 데나) 25번 (사이에 AI 가 다섯을 먼저 이으면 거기서 끝) → 안 끝났으면 [기권] → 확인창 [기권]
//   hot   : 두 사람 역할로 번갈아 16수 흩어 둔 뒤, 흑이 위에서 7째 줄에 다섯을 이어 이김 (진짜 오목 승리)
//   watch : AI 둘(🌱 vs 👑)이 끝까지 (한 쪽이 다섯을 이음). 자유 규칙 · [빠르게] 단추를 눌러 둠
//   친구랑: 흑은 (짝,짝) 칸 · 백은 (홀,홀) 칸에만 둠 → 서로 붙지 않아 우연히 다섯이 되지 않음 (판이 끝나 fp 가 멎는 일 방지)

const MK = function () {
  const qa = window.__qa;
  const om = () => window.__omok;
  const H = {
    rnd() { let s = (window.__qaSeed >>> 0) || 2463534242; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; window.__qaSeed = s; return s / 4294967296; },
    G() { return om() && om().G; },
    // main.js 의 humanTurn() 과 같은 조건 (그 함수는 바깥에 안 보임)
    myTurn() {
      const G = H.G(); if (!G || G.over || G.review || G.thinking) return false;
      if (G.mode === 'online') return !!om().seats.canMove(G.seats, G.cfg.uid, G.s);
      return G.players[G.s.turn].kind === 'human';
    },
    legal() { return om().Omok.legalMoves(H.G().s); },
    // 돌 근처(두 칸 안) 합법 칸 중 하나, 첫 수는 가운데 근처
    near() {
      const G = H.G(), s = G.s, N = s.size, L = H.legal();
      if (!s.moves.length) return 112;
      const ok = L.filter(i => { const x = i % N, y = (i / N) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && X < N && Y >= 0 && Y < N && s.board[Y * N + X]) return true; } return false; });
      const pool = ok.length ? ok : L;
      return pool.length ? pool[Math.floor(H.rnd() * pool.length)] : -1;
    },
    // 막기: 상대가 이어 둔 줄(둘 이상)의 끝을 막음 → AI 가 몇 수 만에 이기지 못하게 판을 길게 (없으면 -1)
    defend() {
      const G = H.G(), s = G.s, N = s.size, O = om().Omok, opp = 3 - s.turn, L = H.legal();
      let best = 2, pool = [];
      for (const i of L) {
        const x = i % N, y = (i / N) | 0; let m = 0;
        for (let d = 0; d < 4; d++) m = Math.max(m, O.runThrough(s.board, N, x, y, d, opp));
        if (m > best) { best = m; pool = [i]; } else if (m === best && m > 2) pool.push(i);
      }
      return pool.length ? pool[Math.floor(H.rnd() * pool.length)] : -1;
    },
    // 친구랑용: 색마다 서로 붙지 않는 칸 (흑 짝·짝 / 백 홀·홀)
    spread(color) {
      const G = H.G(), N = G.s.size, par = color === 1 ? 0 : 1, L = H.legal().filter(i => (i % N) % 2 === par && ((i / N) | 0) % 2 === par);
      return L.length ? L[Math.floor(H.rnd() * L.length)] : -1;
    },
    // 판을 손가락으로 누른 것처럼 (캔버스에 pointerdown + pointerup). 터치는 '미리 보기' 후 같은 자리를 한 번 더 누르거나 [착수]
    touch(i, how) {
      const b = om().board, cv = b.cv, r = cv.getBoundingClientRect(), k = b.S / r.width, N = b.N;
      const x = r.left + (b.m + (i % N) * b.cell) / k, y = r.top + (b.m + ((i / N) | 0) * b.cell) / k;
      const tap = () => { for (const t of ['pointerdown', 'pointerup']) cv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 11, pointerType: 'touch', isPrimary: true, button: 0 })); };
      tap();
      if (how === 'btn') qa.click('#placeBtn'); else tap();
    },
    modal(re) { return qa.clickText(re, '.overlay:not([hidden]) button'); },
    // 결과창이 떠 있나 (끝난 판)
    resultShown() { const G = H.G(); return !!(G && G.over && qa.$$('.overlay button').some(b => /다시 하기|한 판 더|대기실|복기/.test(b.textContent))); },
  };
  return H;
};
const withH = fn => new Function('arg', 'const H = window.__qaH || (window.__qaH = (' + MK.toString() + ')()); return (' + fn.toString() + ')(arg, H);');

module.exports = {
  id: 'omok',
  path: 'omok/',
  query: '',
  hookName: 'window.__omok',
  reproHint: (mode, seed) => mode === 'solo' ? `__omok.newGame({mode:'ai', rule:'standard', tier:'${['easy', 'normal', 'hard'][(seed >>> 3) % 3]}', color:'black'}) 후 AI 가 이은 줄을 막으며 두기, 안 끝나면 기권` : mode === 'hot' ? "__omok.newGame({mode:'two', rule:'renju'}) 후 16수 흩어 두고 흑이 위에서 7째 줄에 다섯 잇기" : "__omok.newGame({mode:'watch', rule:'free', wb:'hard', ww:'easy'}) 후 [빠르게]",
  ready: withH((_, H) => !!window.__omok && !!document.getElementById('home') && !!window.__qa),
  menu: withH((_, H) => document.getElementById('play').hidden && !document.getElementById('home').hidden),
  home: withH((_, H) => { if (!document.getElementById('play').hidden) __omok.goMenu(); else location.reload(); }),
  setup: withH((mode, H) => { window.__qaSeed = 12345; window.__qaPause = 0; }),
  modes: {
    solo: {
      timeout: 120000, stuckMs: 40000,
      start: withH((seed, H) => { window.__qaSeed = seed || 1; window.__qaEx = {}; __omok.newGame({ mode: 'ai', rule: 'standard', tier: ['easy', 'normal', 'hard'][((seed || 1) >>> 3) % 3], color: 'black' }); }),   // AI 단계는 씨앗에 따라
    },
    watch: {
      timeout: 180000, stuckMs: 40000,
      start: withH((seed, H) => { window.__qaSeed = seed || 1; window.__qaFast = 0; __omok.newGame({ mode: 'watch', rule: 'free', wb: 'hard', ww: 'easy' }); }),
    },
    hot: {
      timeout: 60000, stuckMs: 30000,
      start: withH((seed, H) => { window.__qaSeed = seed || 1; __omok.newGame({ mode: 'two', rule: 'renju' }); }),
    },
  },
  quickModes: ['solo'],
  probe: withH((mode, H) => {
    const G = H.G();
    if (!G) return { fp: 'none', over: false, waiting: false, info: '판 없음' };
    const s = G.s, O = __omok.Omok;
    const way = G.mode === 'ai' ? '내 25수 뒤에도 안 끝나면 기권' : G.mode === 'two' ? '16수 흩어 둔 뒤 흑이 다섯 잇기' : 'AI 둘이 끝까지';
    return {
      fp: [G.round || 0, O.encode(s), G.over ? 1 : 0, G.thinking ? 1 : 0, G.review ? 1 : 0].join('|'),
      over: H.resultShown(),
      waiting: H.myTurn(),
      info: `${G.mode}/${s.rule}${G.mode === 'ai' ? ' · AI ' + G.cfg.tier : ''} · ${s.moves.length}수 · 차례 ${s.turn}${G.thinking ? ' · AI 생각 중' : ''}${s.over ? ' · 끝: ' + (s.reason || '?') + ' 승자 ' + s.winner : ''} · 끝난 길: ${way}`,
    };
  }),
  drive: withH((mode, H) => {
    const G = H.G(); if (!G) return;
    if (H.modal(/^알겠어요$/)) return;                         // 처음 안내창
    if (G.over || G.review) return;                            // 결과창이 뜨기를 기다림
    if (mode === 'watch') {
      if (!window.__qaFast) { const b = document.getElementById('speedBtn'); if (b && !G.fast) b.click(); window.__qaFast = 1; }
      return;
    }
    if (!H.myTurn()) return;
    const s = G.s, n = s.moves.length, qa = window.__qa;
    if (mode === 'solo') {
      if (H.modal(/^기권$/)) return;                            // 확인창 [기권]
      // 곁가지 단추도 한 번씩: AI 선생님 켜기 · 되돌리기
      const ex = window.__qaEx = window.__qaEx || {};
      if (n >= 6 && !ex.coach) { ex.coach = 1; qa.click('#coachBtn'); return; }
      if (n >= 10 && !ex.undo) { ex.undo = 1; qa.click('#undoBtn'); return; }
      if (n < 50) { let i = H.defend(); if (i < 0) i = H.near(); if (i >= 0) H.touch(i, (n >> 1) % 2 ? 'btn' : 'tap'); return; }
      document.getElementById('resignBtn').click();            // 확인창은 다음 턴에
      return;
    }
    if (mode === 'hot') {
      // 처음 16수는 흩어 두고(흑 짝·짝, 백 홀·홀), 그다음 흑이 위에서 7째 줄(y=6)에 다섯을 이음 — 백은 계속 홀·홀 칸
      const N = s.size, L = H.legal(), pick = L.length ? L[Math.floor(H.rnd() * L.length)] : -1;
      let i = -1;
      if (n < 16) {
        const par = s.turn === 1 ? 0 : 1;
        const c = L.filter(k => (k % N) % 2 === par && ((k / N) | 0) % 2 === par && ((k / N) | 0) !== 6);
        i = c.length ? c[Math.floor(H.rnd() * c.length)] : pick;
      } else if (s.turn === 1) {
        const want = [2, 3, 4, 5, 6].map(x => 6 * N + x).find(k => s.board[k] === 0 && L.includes(k));
        i = want != null ? want : pick;
      } else {
        const c = L.filter(k => (k % N) % 2 === 1 && ((k / N) | 0) % 2 === 1);
        i = c.length ? c[Math.floor(H.rnd() * c.length)] : pick;
      }
      if (i >= 0) H.touch(i, (n >> 1) % 2 ? 'btn' : 'tap');
    }
  }),
  online: {
    open: withH((_, H) => { document.getElementById('tabFriend').click(); }),
    started: withH((_, H) => { const G = H.G(); return !!(G && G.mode === 'online' && !document.getElementById('play').hidden); }),
    setup: withH((role, H) => { window.__qaRole = role; window.__qaSeed = role === 'host' ? 777 : 999; window.__qaPause = 0; window.__qaLast = 0; }),
    round: withH((_, H) => { const G = H.G(); return G && G.mode === 'online' ? G.round : -1; }),
    // 두 화면이 같아야 하는 것: 몇 번째 판 + 수 순서(+끝 표시) + 자리표.  (O.hash 는 화면마다 다른 난수 씨앗이 들어 있어 못 씀)
    fp: withH((_, H) => { const G = H.G(); if (!G || G.mode !== 'online') return null; return [G.round, __omok.Omok.encode(G.s), JSON.stringify(G.seats)].join('|'); }),
    drive: withH((role, H) => {
      const G = H.G(); if (!G || G.mode !== 'online') return;
      H.modal(/^알겠어요$/);
      if (window.__qaPause || !H.myTurn()) return;
      const now = Date.now();
      if (now - (window.__qaLast || 0) < 450) return;
      if (G.s.moves.length >= 44) return;
      window.__qaLast = now;
      const i = H.spread(G.me); if (i >= 0) __omok.play(i);
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

// 냥냥 배구 어댑터 — 실시간(60Hz 고정 틱) 게임
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
//
// 빨리 끝내는 법: 점수 7점 · 쉬운 AI · drive() 가 틱을 __volley.ff(1) 로 직접 돌림 (진짜 tick() 코드가 돌아감).
//   사람 자리(나 / 한 기기 두 사람)는 VolleyBots 를 '입력 생성기'로 써서 틱마다 __volley.hold(자리, 비트) 를 눌러 줌.
//   rAF 고리가 죽었는지 보려고: drive 호출 사이에 (ff 말고) 저절로 틱이 흘렀는지 재서, 2.5초 넘게 안 흐르면 ff 를 멈춰 '멈춤'으로 잡히게 함.
// 친구랑은 ff 못 씀(실시간 동기) → 250ms 마다 거친 입력(공 쫓기·점프·스매시)만 줌. 두 화면 비교는 점수·판 씨앗 같은 굵은 값.
module.exports = {
  id: 'volley',
  path: 'volley/',
  query: '',
  ready: () => !!window.__volley && !!document.getElementById('menu') && !!window.VolleyBots,
  menu: () => !document.getElementById('menu').hidden,
  home: () => __volley.goMenu(),
  setup: () => { window.__qaBots = null; window.__qaT = null; window.__qaDead = 0; window.__qaModalT = 0; },
  reproHint: (mode, seed) => ({
    solo: `__volley.start({kind:'ai',team:1,tier:'easy',furs:['cheese','mackerel'],target:7,seed:${seed}})`,
    solo2: `__volley.start({kind:'ai',team:2,tier:'normal',furs:['cheese','mackerel','black','calico'],target:7,seed:${seed}})`,
    watch: `__volley.start({kind:'watch',team:1,tiers:['normal','hard'],furs:['calico','black'],target:7,seed:${seed}})`,
    hot: `__volley.start({kind:'duo',team:1,seats:['h','h'],furs:['cheese','mackerel'],target:7,seed:${seed}})`,
    hot4: `__volley.start({kind:'duo',team:2,seats:['h','h','h','h'],furs:['cheese','mackerel','black','calico'],target:7,seed:${seed}})`,
  }[mode] || `start ${mode} seed=${seed}`) + ' → 그 뒤 틱을 __volley.ff(1) 로 돌리며 사람 자리는 VolleyBots 입력을 __volley.hold(자리, 비트) 로',
  modes: {
    // 혼자 1:1 (나 vs 🌱 쉬운 AI)
    solo: { start: seed => __volley.start({ kind: 'ai', team: 1, tier: 'easy', furs: ['cheese', 'mackerel'], target: 7, seed }), timeout: 90000 },
    // 혼자 2:2 복식 (나 + AI 짝꿍 vs AI 둘)
    solo2: { start: seed => __volley.start({ kind: 'ai', team: 2, tier: 'normal', furs: ['cheese', 'mackerel', 'black', 'calico'], target: 7, seed }), timeout: 120000 },
    // AI 구경 (봇 대 봇)
    watch: { start: seed => __volley.start({ kind: 'watch', team: 1, tiers: ['normal', 'hard'], furs: ['calico', 'black'], target: 7, seed }), timeout: 120000 },
    // 한 기기 둘이서 (사람 둘 — 둘 다 자동 입력)
    hot: { start: seed => __volley.start({ kind: 'duo', team: 1, seats: ['h', 'h'], furs: ['cheese', 'mackerel'], target: 7, seed }), timeout: 120000 },
    // 한 기기 2:2 복식, 사람 넷 (PC 키보드 하나로 4명 — 폰 화면에서도 start 손잡이로는 열림)
    hot4: { start: seed => __volley.start({ kind: 'duo', team: 2, seats: ['h', 'h', 'h', 'h'], furs: ['cheese', 'mackerel', 'black', 'calico'], target: 7, seed }), timeout: 150000 },
  },
  quickModes: ['solo'],
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  gaps: [
    '친구랑: 실시간(60Hz) 동기 경기라 일시정지·빨리 감기 손잡이가 없어 두 화면은 점수·판 씨앗·승자 같은 굵은 값만 비교함 (고양이·공 위치는 같은 순간을 못 맞춰 비교 못 함)',
    '혼자·구경·한 기기: __volley.ff(n) 이 틱을 직접 돌려 hit-stop(G.stop)·계속! 대기(G.wait) 같은 화면 쪽 멈칫은 건너뜀 — 진짜 rAF 흐름은 틱이 저절로 흐르는지 확인하는 것으로만 봄',
  ],
  probe: () => {
    const V = window.__volley, G = V && V.G;
    if (!G || !G.s) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const s = G.s, modal = !!document.querySelector('body > .overlay:not(#pauseBox):not([hidden]) .big');
    const howto = !G.over && !!document.querySelector('body > .overlay:not(#pauseBox):not([hidden]) ul.howto');
    const dead = (window.__qaDead || 0) >= 10;
    let settled = true;                                          // 결과 창이 0.7초쯤 떠 있은 뒤에 '끝' (창이 나타나는 중에 화면을 찍지 않게)
    if (modal) { window.__qaModalT = window.__qaModalT || Date.now(); settled = Date.now() - window.__qaModalT > 700; } else window.__qaModalT = 0;
    return {
      fp: [s.score[0], s.score[1], s.phase, s.stats.rallies, Math.floor(s.tick / 600), G.paused ? 1 : 0, G.over ? 1 : 0].join('|'),
      over: !!G.over && modal && settled,                                   // 결과 창(점수 .big)까지 떠야 한 판 끝
      waiting: !!G.paused || howto,                              // 쉬기·하는 법 창이 열려 자동 입력이 못 닫은 경우
      info: `${G.o.kind}${G.team === 2 ? ' 2:2' : ''} ${s.score[0]}:${s.score[1]} · ${s.phase} · 랠리 ${s.stats.rallies} · 최장 ${s.stats.longest} · 틱 ${s.tick}${G.over ? ' · 끝(' + (modal ? '결과 창 뜸' : '결과 창 안 뜸') + ')' : ''}${dead ? ' · ⚠ 화면 고리(rAF)가 안 돎(자연 틱 0)' : ''}${G.paused ? ' · 쉬는 중' : ''}`,
    };
  },
  drive: () => {
    const V = window.__volley, G = V && V.G, qa = window.__qa;
    if (!G || !G.s) return;
    // 처음 하는 법 창 → 닫기 (이게 열려 있으면 게임 고리가 멈춰 있음)
    if (qa.clickText(/알겠어요/, '.overlay:not([hidden]) button')) return;
    if (G.paused) { qa.click('#resumeBtn'); return; }              // 창 포커스를 잃어 자동으로 쉬기에 들어간 경우
    if (G.over) { for (const k of [0, 1, 2, 3]) V.hold(k, 0); return; }
    if (document.querySelector('body > .overlay:not(#pauseBox):not([hidden])')) return;
    // 고리 심장박동: ① ff 를 시작하기 전에 틱이 저절로 흐르는 걸 먼저 확인(최대 2.5초) ② 그 뒤로도 drive 호출 사이에 (ff 말고) 저절로 흐른 틱이 있어야 함
    //   → 화면 고리(rAF)가 죽었으면 ff 도 안 돌려서 '멈춤'으로 잡히게 함 (ff 가 가려 버리지 않게)
    let T = window.__qaT;
    if (!T || T.gen !== G.gen) { T = window.__qaT = { gen: G.gen, t0: G.s.tick, last: G.s.tick, alive: false, n: 0, dead: 0 }; window.__qaDead = 0; }
    if (!T.alive) {
      if (G.s.tick - T.t0 >= 6) T.alive = true;
      else { if (!document.hidden && ++T.n >= 10) window.__qaDead = 99; return; }
    } else if (!document.hidden) {
      T.dead = G.s.tick - T.last <= 0 ? T.dead + 1 : 0;
      window.__qaDead = T.dead;
    }
    if ((window.__qaDead || 0) >= 10) return;
    const o = G.o;
    const seats = o.kind === 'ai' ? [0] : o.kind === 'duo' ? G.hcats.slice() : [];
    if (seats.length) {                                            // 사람 자리 자동 입력용 봇 (한 번 만듦)
      let b = window.__qaBots;
      if (!b || b.gen !== G.gen) {
        b = window.__qaBots = { gen: G.gen, m: {} };
        for (const k of seats) b.m[k] = VolleyBots.create('normal', k & 1, (G.seed ^ (0xA11 + k * 7919)) >>> 0, G.team === 2 ? { cat: k, team: {} } : undefined);
      }
      const t0 = performance.now();
      let n = 0;
      while (V.G === G && !G.over && n < 3000 && performance.now() - t0 < 110) {
        for (const k of seats) V.hold(k, b.m[k].act(G.s));
        V.ff(1); n++;
      }
      for (const k of seats) V.hold(k, 0);
    } else {                                                       // 구경(봇끼리)
      const t0 = performance.now();
      let n = 0;
      while (V.G === G && !G.over && n < 3000 && performance.now() - t0 < 110) { V.ff(1); n++; }
    }
    T.last = G.s.tick;
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    // 대기실에서 7점 내기로 (짧게)
    beforeStart: () => { const b = document.querySelector('[data-tg="7"]'); if (b && !b.disabled) b.click(); },
    started: () => { const G = window.__volley && __volley.G; return !!(G && G.o.kind === 'online' && G.s && !document.getElementById('play').hidden); },
    round: () => { const G = window.__volley && __volley.G; return G && G.s ? G.o.seed : -1; },
    // 두 화면이 같아야 하는 굵은 값: 판 씨앗 · 점수 · 승자 · 목표 · 복식 여부 (실시간이라 위치까지는 같은 순간을 못 맞춤)
    fp: () => {
      const G = window.__volley && __volley.G;
      if (!G || !G.s) return null;
      return JSON.stringify({ sd: G.o.seed, sc: G.s.score, w: G.s.winner, tg: G.s.target, tm: G.team, ov: G.over ? 1 : 0 });
    },
    drive: () => {
      const V = window.__volley, G = V && V.G, qa = window.__qa;
      if (!G || !G.s) return;
      if (G.over) {                                               // 결과 창: 방장 = 다음 판 · 손님 = 준비
        qa.clickText(/다음 판 시작|^✋/, 'body > .overlay button');
        return;
      }
      const k = G.myCat;
      if (k < 0) return;
      const s = G.s, c = s.cats[k], b = s.ball, side = k & 1, C = Volley.C;
      const mineSide = side === 0 ? b.x < C.NET_X : b.x > C.NET_X;
      const home = Volley.homeX ? Volley.homeX(side) : c.x;
      const tx = mineSide ? b.x : home, dx = tx - c.x;
      let bits = dx > 22 ? Volley.IN.RIGHT : dx < -22 ? Volley.IN.LEFT : 0;
      const near = Math.abs(b.x - c.x) < 90 && mineSide;
      if (near) bits |= Volley.IN.JUMP;
      if (near && Math.abs(b.x - c.x) < 60 && b.y < c.y + 150) bits |= Volley.IN.SMASH | (side === 0 ? Volley.IN.RIGHT : Volley.IN.LEFT);
      V.hold(0, bits);
    },
  },
};

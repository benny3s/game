// 땅따먹기 어댑터 — 실시간(초당 8틱) 게임
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
//
// 빨리 끝내는 법: 4마리 판(52x52) · 쉬운 AI · drive() 가 틱을 __land.ff(1) 로 직접 돌림 (진짜 tick() 코드가 돌아감, 3분 = 1440틱).
//   카운트다운(3-2-1)은 진짜 타이머로 기다림 (S.running 이 켜져야 ff 시작).
//   사람 자리(나 / 둘이서의 1P·2P)는 LandBots 를 '입력 생성기'로 써서 틱마다 __land.steer(방향, 자리) 를 눌러 줌.
//   rAF 고리가 죽었는지 보려고: drive 호출 사이에 (ff 말고) 저절로 틱이 흘렀는지 재서, 2.5초 넘게 안 흐르면 ff 를 멈춰 '멈춤'으로 잡히게 함.
// 친구랑은 일시정지·빨리 감기가 없음(모두 같은 시계) → 실시간으로만 둠. 두 화면 비교는 "8틱마다 칸 상태 해시 기록 → 같은 틱의 해시 비교".
module.exports = {
  id: 'land',
  path: 'land/',
  query: '',
  ready: () => !!window.__land && !!document.getElementById('home') && !!window.LandBots,
  menu: () => document.getElementById('play').hidden,
  home: () => __land.goMenu(),
  setup: () => { window.__qaBot = null; window.__qaT = null; window.__qaDead = 0; window.__qaModalT = 0; },
  reproHint: (mode, seed) => `(Math.random 을 seed ${seed} 로 바꿔 놓고) __land.opts.count=4; __land.opts.mode='${mode === 'life' ? 'life' : 'classic'}'; __land.opts.tier='easy'; __land.start('${mode === 'watch' ? 'watch' : mode === 'hot' ? 'duo' : 'solo'}') → 틱은 __land.ff(1) 로 돌리며 사람 자리는 LandBots.decide 결과를 __land.steer 로`,
  modes: {
    // 혼자 클래식 3분 (나 + AI 3마리)
    solo: {
      start: seed => {
        const orig = Math.random; let a = (seed >>> 0) || 1;
        Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // 시작 순간만 씨앗 고정
        try { const o = __land.opts; o.count = 4; o.mode = 'classic'; o.tier = 'easy'; __land.start('solo'); } finally { Math.random = orig; }
      }, timeout: 90000,
    },
    // 혼자 한 목숨 (아웃되면 탈락 → 구경으로 넘어가는 길까지)
    life: {
      start: seed => {
        const orig = Math.random; let a = ((seed >>> 0) ^ 0x5bd1e995) || 1;
        Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        try { const o = __land.opts; o.count = 4; o.mode = 'life'; o.tier = 'easy'; __land.start('solo'); } finally { Math.random = orig; }
      }, timeout: 90000,
    },
    // AI 구경 (봇만)
    watch: {
      start: seed => {
        const orig = Math.random; let a = ((seed >>> 0) ^ 0x1234567) || 1;
        Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        try { const o = __land.opts; o.count = 4; o.mode = 'classic'; o.tier = 'normal'; __land.start('watch'); } finally { Math.random = orig; }
      }, timeout: 90000,
    },
    // 한 키보드 둘이서 (1P WASD · 2P 방향키) — 마우스+키보드 기기(hover:hover & pointer:fine)에서만 열림. 폰에서는 게임이 혼자 하기로 바꿔 시작함
    hot: {
      start: seed => {
        const orig = Math.random; let a = ((seed >>> 0) ^ 0x7777) || 1;
        Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        try { const o = __land.opts; o.count = 4; o.mode = 'classic'; o.tier = 'easy'; __land.start('duo'); } finally { Math.random = orig; }
      }, timeout: 90000,
    },
  },
  desktopModes: ['solo', 'hot'],   // hot(듀오)는 마우스 화면에서만 열림
  quickModes: ['solo'],
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  gaps: [
    '친구랑: 일시정지·빨리 감기 손잡이가 없어(모두 같은 시계) 어댑터가 __land.R.afterTick 을 감싸 8틱마다 칸 상태 해시를 기록하고, 같은 틱의 해시끼리 비교함',
    '한 키보드 둘이서(hot=duo)는 hover:hover + pointer:fine 기기에서만 열림 → 폰 화면에선 게임이 혼자 하기로 바꿔 시작하고, 하네스는 PC 화면에서 첫 모드(solo)만 돌려서 duo 는 자동 검사에 안 걸림 (PC 화면에서 hot 도 돌리는 설정이 필요)',
    '시작 때 Math.random 씨앗을 어댑터가 잠깐 바꿔 판을 재현 가능하게 함 (게임 쪽 씨앗 인자는 없음)',
  ],
  probe: () => {
    const Ld = window.__land, S = Ld && Ld.S;
    if (!S || !S.st) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const st = S.st, modal = !!document.querySelector('.overlay.land-res:not([hidden])');
    const dead = (window.__qaDead || 0) >= 10;
    let settled = true;                                          // 결과 창이 0.7초쯤 떠 있은 뒤에 '끝' (창이 나타나는 중에 화면을 찍지 않게)
    if (modal) { window.__qaModalT = window.__qaModalT || Date.now(); settled = Date.now() - window.__qaModalT > 700; } else window.__qaModalT = 0;
    let mine = '';
    if (S.me >= 0) { const p = st.players[S.me]; mine = ` · 내 땅 ${(p.area / (st.W * st.H) * 100).toFixed(1)}%${p.alive ? '' : ' (아웃)'}`; }
    return {
      fp: [Math.floor(st.tick / 40), S.running ? 1 : 0, S.counting ? 1 : 0, S.paused ? 1 : 0, S.ended ? 1 : 0, S.out ? 1 : 0].join('|'),
      over: !!S.ended && modal && settled,                                  // 결과 창(.land-res)까지 떠야 한 판 끝
      waiting: !!S.paused && !S.counting,                        // 멈춤 창이 열려 자동 입력이 못 닫은 경우
      info: `${S.kind}/${S.mode} ${S.st.n}마리 · 틱 ${st.tick}/${st.limit}${mine}${S.out ? ' · 탈락' : ''}${S.ended ? ' · 끝(' + (modal ? '결과 창 뜸' : '결과 창 안 뜸') + ')' : ''}${dead ? ' · ⚠ 화면 고리(rAF)가 안 돎(자연 틱 0)' : ''}${S.paused ? ' · 멈춤' : ''}`,
    };
  },
  drive: () => {
    const Ld = window.__land, S = Ld && Ld.S, qa = window.__qa;
    if (!S || !S.st) return;
    if (S.paused && !S.counting) { qa.clickText(/계속하기/, '.overlay:not([hidden]) button'); return; }   // 창 포커스를 잃어 자동으로 멈춘 경우
    if (S.ended || !S.running || S.counting || S.paused) return;   // 카운트다운 중 · 끝 → 진짜 타이머를 기다림
    // 고리 심장박동: ① ff 를 시작하기 전에 틱이 저절로 흐르는 걸 먼저 확인(최대 2.5초) ② 그 뒤로도 drive 호출 사이에 (ff 말고) 저절로 흐른 틱이 있어야 함
    //   → 화면 고리(rAF)가 죽었으면 ff 도 안 돌려서 '멈춤'으로 잡히게 함 (ff 가 가려 버리지 않게)
    let T = window.__qaT;
    if (!T || T.s !== S) { T = window.__qaT = { s: S, t0: S.st.tick, last: S.st.tick, alive: false, n: 0, dead: 0 }; window.__qaDead = 0; }
    if (!T.alive) {
      if (S.st.tick - T.t0 >= 2) T.alive = true;
      else { if (!document.hidden && ++T.n >= 10) window.__qaDead = 99; return; }
    } else if (!document.hidden) {
      T.dead = S.st.tick - T.last <= 0 ? T.dead + 1 : 0;
      window.__qaDead = T.dead;
    }
    if ((window.__qaDead || 0) >= 10) return;
    const humans = S.kind === 'duo' ? [0, 1] : S.me >= 0 && !S.out ? [S.me] : [];
    let bot = window.__qaBot;
    if (!bot || bot.s !== S) bot = window.__qaBot = { s: S, m: {} };
    for (const pid of humans) if (!bot.m[pid]) bot.m[pid] = LandBots.create(S.st, pid, 'normal', ((S.seed ^ (0x9e37 * (pid + 1))) >>> 0), {});
    const t0 = performance.now();
    let n = 0;
    while (Ld.S === S && !S.ended && !S.paused && n < 400 && performance.now() - t0 < 110) {
      for (const pid of humans) {
        const p = S.st.players[pid];
        if (!p.alive || (S.kind === 'duo' ? S.outs[pid] : S.out)) continue;
        const a = LandBots.decide(S.st, pid, bot.m[pid]);
        if (a) { const nd = Land.turn(p.dir, a); if (nd !== p.dir) Ld.steer(nd, pid); }
      }
      Ld.ff(1); n++;
    }
    if (Ld.S === S) T.last = S.st.tick;
  },
  online: {
    open: () => document.getElementById('tabFriend').click(),
    started: () => { const S = window.__land && __land.S; return !!(S && S.kind === 'online' && S.st && !document.getElementById('play').hidden); },
    // 8틱(1초)마다 칸 상태 해시를 기록해 둠 → fp 는 "서로 확실히 지난" 같은 틱의 해시를 비교 (실시간이라 같은 순간은 못 맞춤)
    setup: () => {
      const Ld = window.__land; if (!Ld || Ld.R.__qaWrap) return;
      const R = Ld.R, orig = R.afterTick;
      window.__qaH = {};
      R.afterTick = function () {
        try {
          const S = Ld.S;
          if (S && S.st && S.st.tick % 8 === 0) {
            const H = window.__qaH[S.g] || (window.__qaH[S.g] = {});
            H[S.st.tick] = Land.hash(S.st);
            const ks = Object.keys(H); if (ks.length > 120) for (const k of ks.slice(0, ks.length - 120)) delete H[k];
          }
        } catch (e) {}
        return orig.apply(this, arguments);
      };
      R.__qaWrap = true;
    },
    round: () => { const S = window.__land && __land.S; return S && S.st ? S.g : -1; },
    roundMs: 230000, nextQuick: false,   // 한 판이 3분 (클래식) → 빠른 모드에선 '다음 판' 검사를 건너뜀
    fp: () => {
      const Ld = window.__land, S = Ld && Ld.S;
      if (!S || !S.st) return null;
      const H = (window.__qaH || {})[S.g];
      if (!H) return null;
      const T = Math.floor((S.st.tick - 12) / 8) * 8;               // 12틱(1.5초) 이상 지난 가장 가까운 8의 배수 틱
      if (T <= 0 || H[T] == null) return null;
      return JSON.stringify({ g: S.g, sd: S.seed, n: S.st.n, T, h: H[T] });
    },
    drive: () => {
      const Ld = window.__land, S = Ld && Ld.S, qa = window.__qa;
      if (!S || !S.st) return;
      if (S.ended) { qa.clickText(/다음 판 시작|^✋/, '.overlay.land-res button'); return; }
      if (!S.running || S.counting || S.me < 0 || S.out) return;
      const p = S.st.players[S.me]; if (!p || !p.alive) return;
      let bot = window.__qaBot;
      if (!bot || bot.s !== S) bot = window.__qaBot = { s: S, m: LandBots.create(S.st, S.me, 'normal', (S.seed ^ 0x51ed) >>> 0, {}) };
      const a = LandBots.decide(S.st, S.me, bot.m);
      if (a) { const q = S.ctrls[S.me].q, cur = q.length ? q[q.length - 1] : p.dir, nd = Land.turn(cur, a); if (nd !== cur) Ld.steer(nd); }
    },
  },
};

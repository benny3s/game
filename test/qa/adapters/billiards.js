// 당구 어댑터 — 턴제 + 물리 애니메이션(canvas) 게임
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
//
// 빨리 끝내는 법: 메뉴는 진짜 단추(.gcard · #targetSeg · #tiers · 탭 · #startBtn)를 눌러 설정 → 4구 30다마(=3점) 같은 짧은 판.
//   내 차례는 BilliardsAI.chooseAsync(중급)로 고른 샷을 ses.aim 에 넣고 진짜 '샷!' 단추(#shootBtn)를 누름. 상대 AI 는 🌱 초급(느리게 침).
//   공 구르는 애니메이션은 ses.anim.speed = 10 으로 빨리 감음 (frames 는 이미 계산돼 있어 판정·결과 코드는 그대로 돎). 단 포켓이 들어가는 샷(8볼)은 실제 속도로 —
//   빨리 감으면 포켓 빠짐 그림(main.js ses.sinking)이 NaN 좌표로 오류를 내는데, 이건 진짜 게임 버그라 (프레임 끊김 150ms 만으로도 남) 어댑터가 일부러 피함.
//   당구는 빨리 감기 손잡이가 없음 → 위 두 가지는 __billiards.ses 내부 객체를 직접 만지는 것 (하네스 한계, 보고서 참고).
//   게임이 시드를 안 받음(rand32) → 판 재현은 같은 시드로 못 함.
module.exports = {
  id: 'billiards',
  path: 'billiards/',
  query: '',
  ready: () => !!window.__billiards && !!document.getElementById('home') && !!window.BilliardsAI,
  menu: () => !document.getElementById('home').hidden,
  // 나가기 단추는 2초 안에 두 번 눌러야 나감 (Cozy.backGuard)
  home: () => { const b = document.getElementById('backBtn'); b.click(); b.click(); },
  setup: () => {
    window.__qaThink = null; window.__qaFb = 0; window.__qaRetry = 0; window.__qaPrF = {}; window.__qaCoachMiss = 0; window.__qaModalT = 0;
    try { __billiards.opt.coach = 0; localStorage.setItem('billiards.coach', '0'); } catch (e) {}   // 앞 판(연습)에서 켠 AI 선생님이 다른 판에 남지 않게
  },
  reproHint: (mode, seed) => ({
    solo: "탭 'AI와 대결' · 4구 · 30다마 · 🌱 초급 → 시작 (내 차례는 BilliardsAI.chooseAsync(s,'normal') 샷을 ses.aim 에 넣고 샷! 단추)",
    hot: "탭 '한 기기에서 여럿' · 3쿠션 5점 · 2명 → 시작 (두 사람 모두 BilliardsAI 중급 샷)",
    practice: "탭 '혼자 연습' · 3쿠션 → 시작 → AI 선생님 켜기 · '이대로 겨누기' · 샷! 4번 (+다시 보기·되돌리기·처음 배치)",
    pool: "탭 'AI와 대결' · 포켓볼 · 🌱 초급 → 시작",
  }[mode] || `start ${mode}`),
  modes: {
    // AI와 대결: 4구 30다마(3점) — 나(중급 샷) vs 🌱 초급
    solo: {
      start: () => {
        const $ = id => document.getElementById(id), click = sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e; };
        $('tabAi').click(); click('.gcard[data-id="4gu"]'); click('#targetSeg button[data-v="30"]'); click('#tiers .tier[data-id="easy"]');
        $('startBtn').click();
      }, timeout: 120000,
    },
    // 한 기기에서 여럿: 3쿠션 5점, 두 사람 다 자동
    hot: {
      start: () => {
        const $ = id => document.getElementById(id), click = sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e; };
        $('tabHot').click(); click('.gcard[data-id="3c"]'); click('#targetSeg button[data-v="5"]'); click('#hotN button[data-v="2"]');
        $('startBtn').click();
      }, timeout: 150000,
    },
    // 혼자 연습: AI 선생님 · 되돌리기 · 처음 배치 · 다시 보기 도 눌러 봄, 4번 치면 끝
    practice: {
      start: () => {
        const $ = id => document.getElementById(id), click = sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e; };
        $('tabPractice').click(); click('.gcard[data-id="3c"]');
        $('startBtn').click();
      }, timeout: 150000,
    },
    // 포켓볼(8볼) vs 🌱 초급 — 구멍·그룹 규칙·프리볼까지 가는 가장 긴 판
    pool: {
      start: () => {
        const $ = id => document.getElementById(id), click = sel => { const e = document.querySelector(sel); if (e) e.click(); return !!e; };
        $('tabAi').click(); click('.gcard[data-id="8ball"]'); click('#tiers .tier[data-id="easy"]');
        $('startBtn').click();
      }, timeout: 240000, stuckMs: 30000,
    },
  },
  quickModes: ['solo'],
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  gaps: [
    '시드·빨리 감기 손잡이가 없음: 판 시작 씨앗은 게임 안 rand32() 라 같은 판을 재현할 수 없고, 공 구르기를 빨리 하려면 어댑터가 __billiards.ses.anim.speed 를, 샷을 넣으려면 ses.aim·ses.place 를 직접 만짐',
    'hook(__billiards)에 goHome·myTurn 이 없어 나가기는 #backBtn 두 번 클릭, 내 차례 판정은 ses 필드로 따로 계산함',
  ],
  probe: () => {
    const b = window.__billiards, ses = b && b.ses;
    if (!ses || !ses.s) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const s = ses.s, res = !document.getElementById('resBox').hidden, pr = ses.kind === 'practice';
    const seat = ses.seats[s.turn];
    const myTurn = s.phase === 'play' && !ses.anim && !ses.aiBusy && !ses.waiting && !!seat && seat.ctrl === 'me';
    // 결과 창이 0.7초쯤 떠 있은 뒤에 '끝' (창이 나타나는 중에 화면을 찍지 않게)
    let settled = true;
    if (res) { window.__qaModalT = window.__qaModalT || Date.now(); settled = Date.now() - window.__qaModalT > 700; } else window.__qaModalT = 0;
    const over = pr ? ses.pr.tries >= 4 && !ses.anim : res && settled;
    return {
      fp: [ses.kind, s.shots, s.turn, s.scores.join(','), s.phase, ses.anim ? 1 : 0, ses.aiBusy ? 1 : 0, ses.pr.tries, ses.undo.length, ses.coachRes ? 1 : 0].join('|'),
      over,
      waiting: myTurn && !pr,                                    // 내 차례인데 자동 샷이 안 나감
      info: `${ses.kind}/${s.mode} 샷 ${s.shots} · 점수 ${s.scores.join(':')} · 차례 ${s.turn}${s.ballInHand ? ' 프리볼' : ''} · ${s.phase}${pr ? ` · 연습 ${ses.pr.ok}/${ses.pr.tries}` : ''}${over ? ' · 끝(' + (pr ? '연습 4번' : res ? '결과 창 뜸' : '결과 창 안 뜸') + ')' : ''}${window.__qaFb ? ' · 샷! 단추 못 눌러 hook 으로 ' + window.__qaFb + '번' : ''}${window.__qaRetry ? ' · 친 샷이 사라져 다시 침 ' + window.__qaRetry + '번' : ''}${window.__qaCoachMiss ? ' · 선생님 응답 없어 기본 겨냥 ' + window.__qaCoachMiss + '번' : ''}`,
    };
  },
  drive: () => {
    const b = window.__billiards, ses = b && b.ses, qa = window.__qa;
    if (!ses || !ses.s) return;
    qa.hot();
    if (qa.clickText(/알겠어요/, '.overlay:not([hidden]) button')) return;      // 처음 하는 법 창
    const s = ses.s, $ = id => document.getElementById(id), pr = ses.kind === 'practice';
    // 공 구르기는 빨리 (다시 보기도)
    const speedUp = () => {                                        // 포켓이 들어가는 샷은 실제 속도로 (큰 프레임 점프가 오면 게임이 오류 — 보고서 '포켓 애니메이션' 참고)
      const a = ses.anim; if (!a) return;
      if (a.qaPocket == null) a.qaPocket = !!(a.events && a.events.some(e => e.k === 'p'));
      const sp = window.__qaSpeed || (a.qaPocket ? 1 : 10);
      if (a.speed < sp) a.speed = sp;
    };
    speedUp();
    if (!$('resBox').hidden) return;
    if (pr && ses.pr.tries >= 4) { if (ses.coachOn) $('coachBtn').click(); return; }   // 끝났으니 AI 선생님 끔 (다음 판에 남지 않게)
    if (s.phase !== 'play' || ses.anim || ses.aiBusy || ses.waiting) return;
    const seat = ses.seats[s.turn];
    if (!seat || seat.ctrl !== 'me') return;
    // ── 내 차례
    let th = window.__qaThink;
    if (!th || th.s !== s) th = window.__qaThink = { s, t: Date.now(), done: false, step: 0 };
    if (th.done && Date.now() - th.t < 15000) return;
    if (th.done && !pr) { th.done = false; th.busy = false; th.t = Date.now(); window.__qaRetry = (window.__qaRetry || 0) + 1; }   // 샷을 쳤는데 15초 뒤에도 같은 판·같은 차례 = 샷이 사라짐(그림 오류 등) → 다시 침
    const shootNow = () => {
      th.done = true;
      const btn = $('shootBtn');
      if (btn && !btn.disabled && qa.vis(btn)) btn.click(); else { window.__qaFb = (window.__qaFb || 0) + 1; b.shoot(); }
      speedUp();
    };
    if (pr) {
      // 연습: AI 선생님 켜고 → 추천 샷 '이대로 겨누기' → 샷!  (4번 치는 사이 다시 보기 · 되돌리기 · 처음 배치도 한 번씩)
      if (!ses.coachOn) { $('coachBtn').click(); return; }
      const F = window.__qaPrF || (window.__qaPrF = {});          // 한 번씩만 (되돌리기·처음 배치는 상태 객체를 바꿔서 th 가 새로 만들어지므로 window 에 기억)
      if (ses.pr.tries === 1 && ses.last && !F.replay) { F.replay = 1; if (!$('replayBtn').disabled) { $('replayBtn').click(); return; } }
      if (ses.pr.tries === 2 && ses.undo.length && !F.undo) { F.undo = 1; if (!$('undoBtn').disabled) { $('undoBtn').click(); return; } }
      if (ses.pr.tries === 3 && !F.rack) { F.rack = 1; $('rackBtn').click(); return; }
      const waited = Date.now() - th.t;
      if (ses.coachRes && !th.applied) {
        const ap = document.querySelector('[data-apply]');
        if (ap) { ap.click(); th.applied = true; th.at = Date.now(); return; }
      }
      if (th.applied && Date.now() - th.at > 150) { shootNow(); return; }
      if (waited > 12000) { window.__qaCoachMiss = (window.__qaCoachMiss || 0) + 1; shootNow(); }
      return;
    }
    // AI 와 대결 · 한 기기: 중급 AI 샷을 고름 → 조작판에 넣고 진짜 단추
    if (th.busy) return;
    th.busy = true;
    BilliardsAI.chooseAsync(s, ses.kind === 'hot' ? 'hard' : 'normal', { seed: (Math.random() * 1e9) | 0 }).then(act => {
      if (b.ses !== ses || ses.s !== s || ses.anim || ses.aiBusy) return;
      ses.aim.angle = act.angle; ses.aim.power = act.power; ses.aim.spinX = act.spinX; ses.aim.spinY = act.spinY;
      if (act.place) ses.place = act.place.slice();
      shootNow();
    });
  },
  online: {
    open: () => { document.getElementById('tabFriend').click(); document.getElementById('startBtn').click(); },
    started: () => { const ses = window.__billiards && __billiards.ses; return !!(ses && ses.kind === 'online' && ses.s && !document.getElementById('play').hidden); },
    setup: () => { window.__qaThink = null; window.__qaPause = 0; window.__qaFb = 0; },
    round: () => { const ses = window.__billiards && __billiards.ses; return ses && ses.s ? ses.gid : -1; },
    // 샷 하나가 끝나 두 화면이 다 가라앉았을 때의 판: 판 번호 · 샷 번호 · 차례 · 점수 · 공 자리 (구르는 중이면 null → 다시 잼)
    fp: () => {
      const ses = window.__billiards && __billiards.ses;
      if (!ses || !ses.s || ses.anim || ses.waiting) return null;
      const s = ses.s;
      return JSON.stringify({ gid: ses.gid, no: ses.no, turn: s.turn, ph: s.phase, sc: s.scores, sh: s.shots, run: s.run, b: s.balls.map(x => x.on ? [Math.round(x.x * 1000), Math.round(x.y * 1000)] : 0) });
    },
    pause: () => { window.__qaPause = 1; },
    resume: () => { window.__qaPause = 0; },
    driveSpec: true,                                                 // 구경꾼 화면도 공 구르기만 빨리 (안 그러면 실제 속도라 뒤처져 비교가 안 맞음)
    drive: role => {
      const b = window.__billiards, ses = b && b.ses, qa = window.__qa, $ = id => document.getElementById(id);
      if (!ses) return;
      if (ses.anim) {                                                // 두 화면 다 공 구르기를 빨리 (포켓 샷은 실제 속도)
        const a = ses.anim;
        if (a.qaPocket == null) a.qaPocket = !!(a.events && a.events.some(e => e.k === 'p'));
        const sp = window.__qaSpeed || (a.qaPocket ? 1 : 10);
        if (a.speed < sp) a.speed = sp;
      }
      if (role === 'spec') return;                                   // 구경꾼은 빨리 감기만, 아무것도 안 누름
      if (!$('resBox').hidden) { qa.clickText(/다음 판 시작|^✋/, '#resBtns button'); return; }   // 방장 = 다음 판(손님이 준비해야 켜짐) · 손님 = ✋ 준비
      if (window.__qaPause || !ses.s) return;
      const s = ses.s;
      if (s.phase !== 'play' || ses.anim || ses.aiBusy || ses.waiting) return;
      const seat = ses.seats[s.turn];
      if (!seat || seat.ctrl !== 'me') return;
      let th = window.__qaThink;
      if (th && th.s === s && Date.now() - th.t < 12000) return;
      th = window.__qaThink = { s, t: Date.now() };
      BilliardsAI.chooseAsync(s, 'normal', { seed: (Math.random() * 1e9) | 0 }).then(act => {
        if (b.ses !== ses || ses.s !== s || ses.anim || window.__qaPause) return;
        ses.aim.angle = act.angle; ses.aim.power = act.power; ses.aim.spinX = act.spinX; ses.aim.spinY = act.spinY;
        if (act.place) ses.place = act.place.slice();
        const btn = $('shootBtn');
        if (btn && !btn.disabled && qa.vis(btn)) btn.click(); else { window.__qaFb = (window.__qaFb || 0) + 1; b.shoot(); }
        if (ses.anim) { const a = ses.anim; if (a.qaPocket == null) a.qaPocket = !!(a.events && a.events.some(e => e.k === 'p')); const sp = window.__qaSpeed || (a.qaPocket ? 1 : 10); if (a.speed < sp) a.speed = sp; }
      });
    },
  },
};

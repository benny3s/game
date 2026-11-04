// 지렁이 대결 어댑터 — 혼자(AI 상대): 자유(죽을 때까지) · 라운드 3분(끝까지) · 배틀로얄(끝까지)
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
// 손잡이: window.game (헬퍼가 읽는 공개 변수: me · snakes · food · input · zoneR) + window.__snake (main.js 끝의 QA 손잡이: sim · mode · round · playing · ff(n) · freeze).
//   시작은 진짜 화면 단추: 혼자 탭에서 속도·게임 방식·AI 를 고르고 [시작!]. 조종은 캔버스에 진짜 pointer 이벤트(폰 = 손가락, PC = 마우스) + 부스트 단추.
//   라운드 3분·배틀로얄은 진짜 시간으로는 오래 걸려서 __snake.ff(n) 으로 틱을 직접 더 돌림 (진짜 stepSim 이 돎: AI·충돌·먹이·결과 계산 그대로).
//   자유 모드는 끝이 없어서 '죽음'이 끝: 먹이를 쫓다가 벽으로 부스트해 들어감 → '죽었어요' 창.
// 친구랑: 다른 게임처럼 ArenaUI + Arena 라 arena-mock 으로 돌림 (online 블록). 방장이 판을 계산하고 손님은 상태를 덮어씀
// 시작 함수는 브라우저 안에서 문자열로 돌아가므로 (바깥 변수 못 씀) 설정 이름만 박아 넣은 자기 완결 함수로 만듦
const begin = kind => new Function('return (' + BEGIN.toString() + ')(' + JSON.stringify(kind) + ')');

module.exports = {
  id: 'snake',
  path: 'snake/',
  query: '',
  hookName: '__snake',
  ready: () => !!window.game && !!window.__snake && !!document.getElementById('solo') && !!document.getElementById('menu'),
  menu: () => !document.getElementById('menu').hidden,
  // 어디서든 첫 메뉴로: 결과 → [메뉴로] · 죽음 → [메뉴로] · 게임 중 → [메뉴] → [메뉴로 나가기]
  home: () => {
    const $ = id => document.getElementById(id);
    if (!$('menu').hidden) return;
    if (!$('results').hidden) { $('resMenu').click(); return; }
    if (!$('dead').hidden) { $('deadMenu').click(); return; }
    if ($('pause').hidden) $('toMenu').click();
    $('quit').click();
  },
  setup: () => { window.__qaN = 0; window.__qaJoy = 0; window.__qaSpec = 0; window.__qaBoost = 0; },
  reproHint: mode => ({
    free: '혼자 탭: 자유 · 빠르게 · AI 중급 3마리 → [시작!] → 먹이를 쫓다가 벽으로 부스트',
    round: '혼자 탭: 라운드 3분 · 빠르게 · AI 중급 3마리 → [시작!] → 3분 (콘솔 __snake.ff(3600) 로 건너뜀)',
    royale: '혼자 탭: 배틀로얄 · 빠르게 · AI 중급 3마리 → [시작!] → 끝까지 (콘솔 __snake.ff(4000))',
  }[mode] || `start ${mode}`),
  modes: {
    free: { start: begin('free'), timeout: 60000, stuckMs: 15000 },
    round: { start: begin('round'), timeout: 90000, stuckMs: 15000 },
    royale: { start: begin('royale'), timeout: 120000, stuckMs: 15000 },
  },
  quickModes: ['free'],
  monkeyStart: 'free',
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  gaps: [
    '친구랑: mock 은 같은 브라우저 탭끼리라 지연·유실이 없음 — 실제 렉·WebRTC 연결·서버 경유 속도는 실제 두 기기 판에서만 볼 수 있음',
    '라운드 3분·배틀로얄: 진짜 시간(3분)으로는 오래 걸려 __snake.ff(n) 으로 틱을 직접 돌려 건너뜀 — 화면 쪽 타이머(rAF)·보간은 건너뛰지 않고 같이 돌지만 시계 흐름은 빨라짐',
    '헬퍼(🧪): 판마다 켜 보지는 않음 · 감지기 패널의 실제 기록 읽기는 관리자 토큰(Firebase)이 필요해 snake/test/ui.js 에서 가짜 기록으로만 봄',
  ],
  probe: mode => {
    const g = window.game, S = window.__snake, $ = id => document.getElementById(id);
    const sim = S && S.sim;
    if (!sim) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
    const me = g.me, res = !$('results').hidden, dead = !$('dead').hidden, paused = !$('pause').hidden;
    const over = mode === 'free' ? (dead || res) : res;
    const alive = sim.snakes.filter(s => s.alive).length;
    return {
      fp: [Math.floor(sim.tick / 10), me ? Math.floor(me.length) + (me.alive ? 'a' : 'd') + me.deaths : '-', alive, sim.over ? 1 : 0, paused ? 1 : 0, dead ? 1 : 0, res ? 1 : 0].join('|'),
      over,
      waiting: paused,
      info: `${sim.mode} 틱 ${sim.tick} · 내 길이 ${me ? Math.floor(me.length) : '-'}${me && !me.alive ? '(죽음)' : ''} 죽음 ${me ? me.deaths : '-'} · 생존 ${alive}/${sim.snakes.length}${sim.timeLeft != null ? ' · 남은 ' + Math.ceil(sim.timeLeft) + '초' : ''}${paused ? ' · 멈춤 창' : ''}${dead ? ' · 죽었어요 창' : ''}${res ? ' · 결과 창' : ''}`,
    };
  },
  drive: mode => {
    const g = window.game, S = window.__snake, qa = window.__qa, $ = id => document.getElementById(id);
    const sim = S && S.sim; if (!sim) return;
    const n = window.__qaN = (window.__qaN || 0) + 1;
    if (!$('results').hidden) return;                                       // 결과 창 = 끝
    // 멈춤 창이 떠 있으면 → 계속 (자유 모드에서는 일부러 한 번 띄워 봄)
    if (!$('pause').hidden) { $('resume').click(); return; }
    const coarse = matchMedia('(pointer: coarse)').matches, cv = $('cv');
    const R = g.zoneR || 60;
    const ptr = (el, type, x, y, o) => el.dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: coarse ? 'touch' : 'mouse', isPrimary: true }, o || {})));
    // 세계 각도 a 쪽으로 조준: 캔버스 가운데(=내 머리)에서 본 방향으로 손가락/마우스를 둠 (main.js aimFrom 과 같은 약속: 위쪽이 +각도)
    const aim = a => {
      const r = cv.getBoundingClientRect(), x = r.left + r.width / 2 + Math.cos(a) * r.width * 0.25, y = r.top + r.height / 2 - Math.sin(a) * r.width * 0.25;
      if (coarse) { if (!window.__qaJoy) { ptr(cv, 'pointerdown', x, y); window.__qaJoy = 1; } else ptr(cv, 'pointermove', x, y); }
      else ptr(cv, 'pointermove', x, y);
      return a;
    };
    const boost = on => {
      if (!!window.__qaBoost === !!on) return; window.__qaBoost = on ? 1 : 0;
      if (coarse && !$('boost').hidden) ptr($('boost'), on ? 'pointerdown' : 'pointerup', 5, 5);
      else { const r = cv.getBoundingClientRect(); ptr(cv, on ? 'pointerdown' : 'pointerup', r.left + r.width / 2, r.top + r.height / 2 - 50); }
    };
    // 먹이 쫓기: 가장 가까운 먹이 쪽, 벽 가까우면 가운데 쪽
    const chase = me => {
      const [hx, hy] = me.head;
      if (Math.hypot(hx, hy) > R - 7) return Math.atan2(-hy, -hx);
      let best = null, bd = 1e9;
      for (const f of g.food) { if (!f) continue; const d = Math.hypot(f[0] - hx, f[1] - hy); if (d < bd) { bd = d; best = f; } }
      return best ? Math.atan2(best[1] - hy, best[0] - hx) : me.ang;
    };
    let me = g.me;
    // ── 죽었을 때
    if (me && !me.alive) {
      boost(false);
      if (!$('dead').hidden) {
        if (mode === 'free') return;                                       // 자유 모드는 '죽었어요' 창이 끝
        if (mode === 'round') { $('respawn').click(); return; }            // 라운드는 다시 태어나 계속 (3분은 계속 흐름)
        if (mode === 'royale' && !window.__qaSpec) { window.__qaSpec = 1; $('spectate').click(); }   // 배틀로얄은 탈락 → 관전하며 끝까지
      }
      if (mode === 'round') { if (me.deaths) $('respawn').click(); }
    }
    // ── 자유: 몇 초 먹이를 쫓다 → 한 번 멈춤/계속 → 벽으로 부스트 (= 죽음)
    if (mode === 'free') {
      if (!me || !me.alive) return;
      if (n === 8) { $('toMenu').click(); return; }                         // 멈춤 창 (다음 호출에서 [계속])
      if (n < 18) { boost(n % 6 === 3); aim(chase(me)); return; }           // (PC 의 부스트 = 캔버스 mouse 누름이라 조준도 같이 바뀜 → 조준을 나중에)
      boost(true); aim(Math.atan2(me.head[1], me.head[0]));                 // 바깥(벽) 쪽으로 부스트
      return;
    }
    // ── 라운드·배틀로얄: 틱을 직접 돌려 빨리 끝냄. 돌리는 동안 몇 틱마다 먹이 쪽으로 다시 조준
    const t0 = performance.now(); let k = 0;
    aim(me && me.alive ? chase(me) : 0);
    while (!sim.over && performance.now() - t0 < 120 && k < 600) {
      me = g.me;
      if (me && !me.alive && mode === 'round') $('respawn').click();      // 라운드: 죽으면 바로 다시 태어남
      if (me && me.alive && k % 4 === 0) { const a = chase(me); g.input.aim = a; g.input.target = null; }
      if (!S.ff(1)) break; k++;
    }
  },
  // 친구랑 (mock): 진짜 ArenaUI 단추로 방 → 대기실 ⚙️ 설정(배틀로얄·빠르게·규칙 봇 3마리) → 시작
  //   배틀로얄: 20초 뒤에 온 사람은 부활 없는 판이라 구경 (core.js add) → 세 번째 탭이 진짜 구경꾼. 20초는 안 기다리고 setup 에서 틱만 넘김
  //   판 비교: 방장이 잠깐 멈추면(freeze) 손님·구경꾼 화면은 방장이 보낸 마지막 상태와 똑같아야 함 → 머리 위치·길이·생사·먹이까지 비교
  online: {
    open: () => document.getElementById('tabFriend').click(),
    beforeStart: () => {
      const pick = (k, v) => { const b = document.querySelector(`[data-set] [data-${k}="${v}"]`); if (b && !b.disabled) b.click(); };
      pick('mode', 'royale'); pick('hz', '20'); pick('ailv', 'rule'); pick('ain', '3');
    },
    started: () => !!window.__snake && !!__snake.playing,
    setup: role => {
      window.__qaJoy = 0; window.__qaBoost = 0;
      if (role === 'host') { const sim = __snake.sim; if (sim && !sim.over) sim.tick += 21 * (sim.hz || 20); }
    },
    round: () => (window.__snake && __snake.playing ? __snake.round : -1),
    pause: () => { if (window.__snake && __snake.freeze) __snake.freeze(true); },
    resume: () => { if (window.__snake && __snake.freeze) __snake.freeze(false); },
    finish: () => { window.__qaFinish = 1; },
    fp: () => {
      const g = window.game, S = window.__snake;
      if (!g || !S || !S.playing) return null;
      const r2 = v => Math.round(v * 100) / 100;
      const sn = g.snakes.map(s => [s.id, s.alive ? r2(s.head[0]) : 0, s.alive ? r2(s.head[1]) : 0, Math.round(s.length * 10), s.alive ? 1 : 0, s.deaths, s.kills].join(',')).sort();
      let n = 0, sum = 0;
      for (const f of g.food) if (f) { n++; sum += Math.round(f[0] * 100) + Math.round(f[1] * 100); }
      return JSON.stringify({ rd: S.round, over: S.over ? 1 : 0, sn, food: [n, sum] });
    },
    drive: role => {
      const g = window.game, S = window.__snake, $ = id => document.getElementById(id);
      if (!g || !S || !S.playing) return;
      if (role === 'host' && window.__qaFinish && S.sim && !S.sim.over) { S.sim.tick += 180 * (S.sim.hz || 20); window.__qaFinish = 0; return; }   // 진짜 finish 길로: 다음 틱에 시간 끝
      if (!$('results').hidden) return;                                     // 결과 창 단추는 하네스가 누름 (✋ 준비 · 다음 판)
      if (!$('dead').hidden) { $('spectate').click(); return; }             // 배틀로얄 탈락 → 관전
      const me = g.me; if (!me || !me.alive) return;
      // 먹이 쫓기, 벽 가까우면 가운데 쪽 — 진짜 포인터 이벤트로 (폰 = 손가락)
      const [hx, hy] = me.head, R = g.zoneR || 60;
      let a = me.ang;
      if (Math.hypot(hx, hy) > R - 7) a = Math.atan2(-hy, -hx);
      else { let bd = 1e9; for (const f of g.food) { if (!f) continue; const d = Math.hypot(f[0] - hx, f[1] - hy); if (d < bd) { bd = d; a = Math.atan2(f[1] - hy, f[0] - hx); } } }
      const coarse = matchMedia('(pointer: coarse)').matches, cv = $('cv'), r = cv.getBoundingClientRect();
      const x = r.left + r.width / 2 + Math.cos(a) * r.width * 0.25, y = r.top + r.height / 2 - Math.sin(a) * r.width * 0.25;
      const ptr = type => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: coarse ? 'touch' : 'mouse', isPrimary: true }));
      if (coarse && !window.__qaJoy) { window.__qaJoy = 1; ptr('pointerdown'); } else ptr('pointermove');
    },
  },
};

// 시작: 혼자 탭에서 고르기 → [시작!] (AI 두뇌 파일이 늦게 오면 될 때까지 다시 누름)
async function BEGIN(kind) {
  const $ = id => document.getElementById(id);
  const pick = (id, v) => { const b = $(id).querySelector(`[data-v="${v}"]`); if (b) b.click(); };
  pick('gameMode', kind); pick('speedSel', '20'); pick('aiLevel', 'mid'); pick('aiCount', '3');
  const end = Date.now() + 9000;
  while (Date.now() < end) {
    if ($('menu').hidden) return true;
    $('solo').click();
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('시작 단추를 눌러도 게임이 안 열림: ' + (document.getElementById('msg').textContent || '(메시지 없음)'));
}

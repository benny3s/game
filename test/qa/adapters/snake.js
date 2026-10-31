// 지렁이 대결 어댑터 — 혼자(AI 상대): 자유(죽을 때까지) · 라운드 3분(끝까지) · 배틀로얄(끝까지)
// 규칙: 아래 함수들은 브라우저 안에서 돌아감 (page.evaluate 로 문자열화) → 바깥 변수 못 씀, 인자 하나만 받음.
// 손잡이: window.game (헬퍼가 읽는 공개 변수: me · snakes · food · input · zoneR) + window.__snake (main.js 끝의 QA 손잡이: sim · mode · lobby · ff(n)).
//   시작은 진짜 화면 단추: [혼자 하기] → 설정(속도·게임 방식·AI) → [시작]. 조종은 캔버스에 진짜 pointer 이벤트(폰 = 손가락, PC = 마우스) + 부스트 단추.
//   라운드 3분·배틀로얄은 진짜 시간으로는 오래 걸려서 __snake.ff(n) 으로 틱을 직접 더 돌림 (진짜 stepSim 이 돎: AI·충돌·먹이·결과 계산 그대로).
//   자유 모드는 끝이 없어서 '죽음'이 끝: 먹이를 쫓다가 벽으로 부스트해 들어감 → '죽었어요' 창.
// 친구랑(방 목록·대기실·방장/손님)은 Arena 가 아니라 snake/net.js 가 Firebase Realtime DB + WebRTC 를 직접 부름 → 하네스(arena-mock)로 못 돌림: onlineGap
// 시작 함수는 브라우저 안에서 문자열로 돌아가므로 (바깥 변수 못 씀) 설정 이름만 박아 넣은 자기 완결 함수로 만듦
const begin = kind => new Function('return (' + BEGIN.toString() + ')(' + JSON.stringify(kind) + ')');

module.exports = {
  id: 'snake',
  path: 'snake/',
  query: '',
  hookName: '__snake',
  ready: () => !!window.game && !!window.__snake && !!document.getElementById('solo') && !!document.getElementById('menu'),
  menu: () => !document.getElementById('menu').hidden,
  // 어디서든 첫 메뉴로: 설정 → [나가기/뒤로] · 결과 → [메뉴로] · 죽음 → [메뉴로] · 게임 중 → [메뉴] → [메뉴로 나가기]
  home: () => {
    const $ = id => document.getElementById(id);
    if (!$('menu').hidden) return;
    if (!$('lobby').hidden) { $('lbLeave').click(); return; }
    if (!$('results').hidden) { $('resMenu').click(); return; }
    if (!$('dead').hidden) { $('deadMenu').click(); return; }
    if ($('pause').hidden) $('toMenu').click();
    $('quit').click();
  },
  setup: () => { window.__qaN = 0; window.__qaJoy = 0; window.__qaSpec = 0; window.__qaBoost = 0; },
  reproHint: mode => ({
    free: '[혼자 하기] → 자유 · 빠르게 · AI 중급 3마리 → [시작] → 먹이를 쫓다가 벽으로 부스트',
    round: '[혼자 하기] → 라운드 3분 · 빠르게 · AI 중급 3마리 → [시작] → 3분 (콘솔 __snake.ff(3600) 로 건너뜀)',
    royale: '[혼자 하기] → 배틀로얄 · 빠르게 · AI 중급 3마리 → [시작] → 끝까지 (콘솔 __snake.ff(4000))',
  }[mode] || `start ${mode}`),
  modes: {
    free: { start: begin('free'), timeout: 60000, stuckMs: 15000 },
    round: { start: begin('round'), timeout: 90000, stuckMs: 15000 },
    royale: { start: begin('royale'), timeout: 120000, stuckMs: 15000 },
  },
  quickModes: ['free'],
  monkeyStart: 'free',
  // 하네스가 못 하는 것 (버그가 아니라 시험 손잡이 빈틈)
  onlineGap: '지렁이 친구랑(방 목록·대기실·방장/손님)은 Arena 가 아니라 snake/net.js 가 Firebase Realtime DB + WebRTC 를 직접 부름 → arena-mock 으로 흉내 못 냄',
  gaps: [
    '친구랑(방장·손님·관전·채팅): Firebase DB + WebRTC 직접 사용이라 자동 시험 못 함',
    '라운드 3분·배틀로얄: 진짜 시간(3분)으로는 오래 걸려 __snake.ff(n) 으로 틱을 직접 돌려 건너뜀 — 화면 쪽 타이머(rAF)·보간은 건너뛰지 않고 같이 돌지만 시계 흐름은 빨라짐',
    '관리자 패널·헬퍼(🧪)·내 감지기: 관리자 로그인(Firebase)이 필요해 시험 안 함',
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
};

// 시작: [혼자 하기] → 설정 고르기 → [시작] (AI 두뇌 파일이 늦게 오면 될 때까지 다시 누름)
async function BEGIN(kind) {
  const $ = id => document.getElementById(id);
  const pick = (id, v) => { const b = $(id).querySelector(`[data-v="${v}"]`); if (b) b.click(); };
  if ($('lobby').hidden) $('solo').click();
  pick('gameMode', kind); pick('speedSel', '20'); pick('aiLevel', 'mid'); pick('aiCount', '3');
  const end = Date.now() + 9000;
  while (Date.now() < end) {
    if ($('menu').hidden && $('lobby').hidden) return true;
    $('lbStart').click();
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('시작 단추를 눌러도 게임이 안 열림: ' + (document.getElementById('msg').textContent || '(메시지 없음)'));
}

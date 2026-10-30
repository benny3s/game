/* 냥냥 배구 — 규칙·물리 코어 (결정적 · 화면 없이도 돌아감)
   브라우저(window.Volley)와 Node(require) 양쪽에서 그대로 씀. 나중에 파이썬 학습 환경이 똑같이 따라 함.
   - 60Hz 고정 틱. Math.random·Date·performance·삼각함수 없음 (sqrt·사칙연산만 → 어느 언어로 옮겨도 같은 값)
   - 상태는 JSON 으로 그대로 저장·전송되는 평범한 객체 (온라인 때 방장 시뮬을 그대로 흘려보냄)
   - 좌표: x 0~640 (왼쪽 벽 0, 그물 320), y 는 모래 바닥(0)에서 위로 +. 고양이 x,y = 발 가운데
   - 입력 = 비트 {LEFT 1, RIGHT 2, JUMP 4, SMASH 8, DOWN 16, UP 32} (화면 기준 방향). DOWN·UP 은 공중 스매시 방향용 */
(function (root) {
  'use strict';

  const C = {
    HZ: 60,
    W: 640, NET_X: 320, NET_H: 128, NET_HW: 6,                     // 코트 · 그물(위가 둥근 막대)
    BALL_R: 20, G_BALL: 0.4, BALL_MAX: 24,                          // 공 (한 틱 24 미만 → 그물을 뚫고 지나가지 않음)
    WALL_E: 0.9, NET_E: 0.45, SAND_E: 0.42,                         // 벽·그물·모래 튕김
    CAT_R: 34, CAT_SEG: 12, CAT_HW: 34,                             // 고양이 몸 = 세로 캡슐 (반지름 34, 키 80)
    MOVE_V: 6.2, ACC: 1.5, DEC: 2.3, ACC_AIR: 1.0,                  // 달리기 (금방 붙고 금방 서게)
    JUMP_V: 14.4, G_CAT: 0.8, G_CUT: 2.0, FALL_MAX: 18,             // 점프 (점프를 일찍 떼면 낮게 뜀)
    E_CAT: 0.8, BUMP_N_MIN: 6.5, BUMP_N_MAX: 12, TAN_K: 0.45,       // 몸으로 받기: 튀는 세기는 범위 안으로
    POP_MIN: 6.5, POP_K: 3.5, CARRY: 0.35, BUMP_MAX: 16, ASSIST: 1.4,   //   위쪽으로 맞으면 늘 톡 떠오르고, 상대 쪽으로 살짝 밀어 줌
    POP_MIN_FAST: 4.5, ASSIST_FAST: 0,                              //   스매시처럼 빠른 공은 덜 뜨고 밀어 주지도 않음 (한 번 더 쳐야 넘어감)
    SWING_T: 12, SWING_CD: 10, PERFECT_T: 3, NOHIT_T: 6, SMASH_VIN: 16.5,   // 공중 스매시: 휘두르는 시간 · 쉼 · 이보다 빠른 공(스매시)은 못 받아침
    PAW_DX: 22, PAW_DY: 74, PAW_R: 40,                              //   앞발이 닿는 범위 (발끝 기준 앞·위)
    SPIKE_V: 17.5, DRIVE_V: 19.5, PERFECT_K: 1.12,                  //   내리꽂기 · 강타 속도 (타이밍 좋으면 더 빠름)
    LOB_APEX: 60, LOB_D0: 70, LOB_DK: 0.5, LOB_DMAX: 190, LOB_VX: 9,   //   살짝 넘기기: 그물 앞에서 치면 짧게, 뒤에서 치면 길게
    HEAT_FROM: 12, HEAT_K: 0.02, HEAT_MAX: 0.3,                     // 랠리가 길어지면(넘김 12번 넘게) 스매시가 조금씩 빨라짐 → 끝없는 랠리 없음
    DIVE_T: 16, DIVE_V: 10, DIVE_HOP: 2.4, DIVE_FR: 0.86, REC_T: 16, DIVE_R: 24,   // 땅 스매시 + 방향키 = 다이빙 · 일어나는 시간
    DIVE_BUF: 4,                                                    //   스매시와 방향키를 이 틱 안에 차례로 눌러도 다이빙 (방향 없이 스매시만 누르면 그냥 헛손질)
    DIG_VY: 12.5, DIG_VX: 2.4,                                      //   다이빙으로 받으면 높이 떠오름
    UP_VY: 1,                                                       // 공중 스매시 '위' = ▲ 단추, 또는 점프를 누른 채 (오르는 중이 아닐 때만 — 높이 뛰려고 누른 점프와 헷갈리지 않게)
    POWER_V: 17.5, DUNK_V: 19.6,                                    //   방향 없이(내리꽂기와 같은 속도지만 덜 가파름) · 앞+아래 스매시 속도
    BACK_APEX: 110, BACK_D: 100, SET_APEX: 220, SET_D: 150, BACK_LO: 60, BACK_HI: 50,   //   뒤로 스매시: 공이 오르는 높이 · 뒤로 가는 거리 · 놓일 자리(제 코트 벽에서 BACK_LO ~ 그물에서 BACK_HI)
    RISE_APEX: 40, RISE_D: 240, RISE_VX: 13,                        //   앞+위: 낮게 깔리듯 오르다 상대 코트 깊이 떨어짐
    TOUCH_MERGE: 8, READY_T: 60, READY_T0: 84, POINT_T: 96,         // 같은 접촉 묶음 · 서브 전 대기 · 점수 후 쉬는 시간
    SERVE_X: 160, SERVE_DX: 16, SERVE_Y: 236, SERVE_TOSS: 4,        // 서브: 공이 서버 머리 위(그물 쪽으로 살짝)에서 톡 올라갔다 떨어짐
    D_BACK: 112, D_FRONT: 238, TM_SEP: 58, TM_DY: 70, TM_PUSH: 1.6,  // 2:2 복식: 뒤·앞 자리 · 같은 편끼리는 부드럽게 밀어냄(딱딱하게 부딪히지 않음 → 끼지 않음)
  };
  const IN = { LEFT: 1, RIGHT: 2, JUMP: 4, SMASH: 8, DOWN: 16, UP: 32 };   // DOWN·UP 은 스매시 방향 전용 (움직임엔 영향 없음)

  // 스매시 각도표 [cos, sin] (sin + = 아래로). 삼각함수 대신 숫자로 박아 둠 → 다른 언어에서도 같은 값
  // 가파른 것부터 보고, 그물을 넘는 첫 각도를 씀 (그물 앞에서 치면 바로 뒤로 꽂히고, 멀리서 치면 저절로 납작해짐)
  const SPIKE_ANG = [[0.374607, 0.927184], [0.5, 0.866025], [0.615661, 0.788011], [0.694658, 0.71934], [0.766044, 0.642788], [0.829038, 0.559193], [0.882948, 0.469472], [0.927184, 0.374607],
    [0.961262, 0.275637], [0.984808, 0.173648], [0.997564, 0.069756], [0.999391, -0.034899], [0.990268, -0.139173], [0.970296, -0.241922]];   // 68° ~ -14°
  // 강타: 납작하고 빠르게 (그물을 넘는 첫 각도 · 뒤 벽을 맞고 튀어나오기도 함)
  const DRIVE_ANG = [[0.970296, 0.241922], [0.984808, 0.173648], [0.994522, 0.104528], [0.999391, 0.034899], [0.99863, -0.052336], [0.990268, -0.139173],
    [0.97437, -0.224951], [0.951057, -0.309017]];                                                                                             // 14° ~ -18°
  // 방향 없이 치는 스매시: 내리꽂기보다 덜 가파른 곳(28°)부터 — 곧게 뻗는 힘찬 공
  const POWER_ANG = SPIKE_ANG.slice(6);

  // 행동표 (학습용): [방향 0 없음 / -1 뒤 / +1 앞(상대 쪽), 점프, 스매시, 아래] → 15가지
  //   0~11 은 예전 그대로 (아래 없음). 12~14 = 아래 + 스매시 (방향 없음 / 뒤 / 앞) → 내리꽂기 · 뒤로 · 앞+아래
  const ACTIONS = [];
  for (const d of [0, -1, 1]) for (const j of [0, 1]) for (const k of [0, 1]) ACTIONS.push([d, j, k, 0]);
  for (const d of [0, -1, 1]) ACTIONS.push([d, 0, 1, 1]);
  const OBS_N = 18, OBS_N2 = 26;

  // 씨앗 난수 (mulberry32) — 상태 안에 들어 있어 저장·복원해도 이어짐
  function rand(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const homeX = i => i === 0 ? C.SERVE_X : C.W - C.SERVE_X;
  // 복식 자리: 편(side) 0 왼쪽 · 1 오른쪽, front = 그물 앞
  const homeX2 = (side, front) => { const x = front ? C.D_FRONT : C.D_BACK; return side === 0 ? x : C.W - x; };
  // 고양이 k 의 편: 0·2 왼쪽, 1·3 오른쪽 (1:1 이면 고양이 번호 = 편)
  const sideOf = k => k & 1;
  // 복식: 이 편에서 지금 뒤(서브 차례)에 서는 고양이
  const backCat = (s, side) => side + 2 * s.rot[side];
  function newCat(i, prevIn, x) {
    return { x: x == null ? homeX(i) : x, y: 0, vx: 0, vy: 0, ground: true, swing: 0, swingCd: 0, dive: 0, diveDir: 0, rec: 0, noHit: 0, dbuf: 0, prevIn: prevIn || 0 };
  }

  // 새 경기. opts: { target: 7|11|15, maxTouches: 0 = 제한 없음(기본, 가족용) | 3 = 진짜 배구처럼, server: 0|1 (없으면 씨앗으로),
  //   team: 1 (기본, 1:1) | 2 (2:2 복식 — 고양이 4마리: 0·2 왼쪽, 1·3 오른쪽) }
  function create(opts, seed) {
    opts = opts || {};
    const s = {
      v: 1, tick: 0,
      target: opts.target || 11, maxTouches: opts.maxTouches == null ? 0 : opts.maxTouches,
      rng: (seed >>> 0) || 0x9E3779B9,
      phase: 'ready', phaseT: C.READY_T0,
      score: [0, 0], server: 0, winner: -1,
      touches: [0, 0], lastSide: -1, lastTick: -99, ballSide: 0,
      hits: 0, crosses: 0, lastHitter: -1, lastKind: '',
      stats: { longest: 0, smashes: [0, 0], perfect: [0, 0], digs: [0, 0], rallies: 0 },
      lastPoint: null,
      cats: [newCat(0), newCat(1)],
      ball: { x: 0, y: 0, vx: 0, vy: 0 },
    };
    if (opts.team === 2) {                                          // 복식 필드는 2:2 때만 (1:1 상태 모양은 그대로)
      s.team = 2; s.rot = [0, 0]; s.serveCat = 0; s.lastCat = -1;
      s.cats.push(newCat(0), newCat(1));
    }
    s.server = opts.server === 0 || opts.server === 1 ? opts.server : (rand(s) < 0.5 ? 0 : 1);
    if (s.team === 2) s.rot[1 - s.server] = 1;                      // 받는 편은 처음 서브를 가져올 때 돌아서 0번이 서브
    resetRally(s, C.READY_T0);
    return s;
  }

  // 점수 사이: 자리로 돌아가고 공은 서버 머리 위에 떠 있음
  function resetRally(s, t) {
    let sx;
    if (s.team === 2) {                                             // 복식: 편마다 뒤 1마리 · 앞 1마리, 서브는 서브 편의 뒤 고양이
      const cats = [];
      for (let k = 0; k < 4; k++) { const sd = sideOf(k); cats.push(newCat(sd, s.cats[k].prevIn, homeX2(sd, backCat(s, sd) !== k))); }
      s.cats = cats; s.serveCat = backCat(s, s.server); s.lastCat = -1;
      sx = homeX2(s.server, false);
    } else {
      s.cats = [newCat(0, s.cats[0].prevIn), newCat(1, s.cats[1].prevIn)];
      sx = homeX(s.server);
    }
    const f = s.server === 0 ? 1 : -1;
    s.ball = { x: sx + f * C.SERVE_DX, y: C.SERVE_Y, vx: 0, vy: 0 };
    s.ballSide = s.server; s.touches = [0, 0]; s.lastSide = -1; s.lastTick = -99;
    s.hits = 0; s.crosses = 0; s.lastHitter = -1; s.lastKind = '';
    s.phase = 'ready'; s.phaseT = t;
  }
  // 복식: 같은 편 둘이 겹치면 부드럽게 떼어 놓음 (한 틱에 최대 TM_PUSH, 위아래로 떨어져 있으면 그냥 지나감)
  //   딱딱한 충돌이 아니라서 벽에 몰려도 서로 끼어 멈추는 일이 없음 — 비켜 가는 쪽 입력은 늘 그대로 먹힘
  function separate(s) {
    for (let sd = 0; sd < 2; sd++) {
      const a = s.cats[sd], b = s.cats[sd + 2];
      let dx = b.x - a.x; const dy = b.y - a.y;
      if (dy >= C.TM_DY || dy <= -C.TM_DY) continue;
      const ad = dx < 0 ? -dx : dx;
      if (ad >= C.TM_SEP) continue;
      let push = (C.TM_SEP - ad) / 2; if (push > C.TM_PUSH) push = C.TM_PUSH;
      const d = dx > 0 ? 1 : dx < 0 ? -1 : (sd === 0 ? 1 : -1);    // 딱 겹치면 번호 작은 쪽이 벽 쪽으로
      a.x -= d * push; b.x += d * push;
      clampCat(a, sd); clampCat(b, sd);
    }
  }
  function clampCat(c, i) {
    const lo = i === 0 ? C.CAT_HW : C.NET_X + C.NET_HW + C.CAT_HW;
    const hi = i === 0 ? C.NET_X - C.NET_HW - C.CAT_HW : C.W - C.CAT_HW;
    if (c.x < lo) { c.x = lo; if (c.vx < 0) c.vx = 0; } else if (c.x > hi) { c.x = hi; if (c.vx > 0) c.vx = 0; }
  }

  // ── 공 물리 (중력·벽·그물). ev 가 없으면 예측용 (봇이 미리 굴려 봄)
  function ballPhys(b, ev) {
    const R = C.BALL_R;
    b.vy -= C.G_BALL;
    b.x += b.vx; b.y += b.vy;
    if (b.x < R) { b.x = R; if (b.vx < 0) { if (ev) ev.push({ t: 'wall', x: 0, y: b.y, v: -b.vx }); b.vx = -b.vx * C.WALL_E; } }
    else if (b.x > C.W - R) { b.x = C.W - R; if (b.vx > 0) { if (ev) ev.push({ t: 'wall', x: C.W, y: b.y, v: b.vx }); b.vx = -b.vx * C.WALL_E; } }
    const rr = R + C.NET_HW, dx = b.x - C.NET_X;
    if (dx < rr && dx > -rr && b.y < C.NET_H + rr) {
      const py = b.y < C.NET_H ? (b.y > 0 ? b.y : 0) : C.NET_H;
      let nx = dx, ny = b.y - py;
      const d2 = nx * nx + ny * ny;
      if (d2 < rr * rr) {
        let d = Math.sqrt(d2);
        if (d < 1e-6) { nx = b.vx > 0 ? -1 : 1; ny = 0; d = 1; } else { nx /= d; ny /= d; }
        b.x = C.NET_X + nx * rr; b.y = py + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= (1 + C.NET_E) * vn * nx; b.vy -= (1 + C.NET_E) * vn * ny;
          if (ev) ev.push({ t: 'net', x: b.x, y: b.y, v: -vn });
        }
        if (py === C.NET_H && b.vx > -0.6 && b.vx < 0.6) b.vx += nx >= 0 ? 0.6 : -0.6;   // 그물 꼭대기에 얹혀 멈추지 않게
      }
    }
  }
  function clampSpeed(b, m) {
    const v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 > m * m) { const k = m / Math.sqrt(v2); b.vx *= k; b.vy *= k; }
  }
  // 공이 모래에 닿을 때까지 굴려 봄 → { x, t } (봇·테스트용)
  function predictLanding(ball, maxT) {
    const b = { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
    const n = maxT || 400;
    for (let t = 1; t <= n; t++) { ballPhys(b, null); if (b.y <= C.BALL_R) return { x: b.x, t }; }
    return { x: b.x, t: n };
  }

  // 고양이 몸 캡슐 (선분 a-b + 반지름 r). 다이빙 중엔 가로로 눕고, 앞쪽 끝은 그물을 넘지 않음
  function catShape(c, i) {
    if (c.dive > 0) {
      const d = c.diveDir, y = c.y + C.DIVE_R;
      let ax = c.x - d * 10, bx = c.x + d * 26;
      const lim = i === 0 ? C.NET_X - C.NET_HW - C.DIVE_R : C.NET_X + C.NET_HW + C.DIVE_R;
      if (i === 0) { if (bx > lim) bx = lim; if (ax > lim) ax = lim; } else { if (bx < lim) bx = lim; if (ax < lim) ax = lim; }
      return { ax, ay: y, bx, by: y, r: C.DIVE_R };
    }
    return { ax: c.x, ay: c.y + C.CAT_R, bx: c.x, by: c.y + C.CAT_R + C.CAT_SEG, r: C.CAT_R };
  }
  const pawOf = (c, i) => ({ x: c.x + (i === 0 ? 1 : -1) * C.PAW_DX, y: c.y + C.PAW_DY });

  // 이 속도로 치면 그물에 안 걸리고 상대 쪽으로 넘어가나 (중력만 보고 ballPhys 와 같은 순서로 굴려 봄 · 그물 둥근 꼭대기까지)
  function clearsNet(x, y, vx, vy, f) {
    const rr = C.BALL_R + C.NET_HW + 1, edge = C.NET_X + f * rr;
    for (let t = 0; t < 240; t++) {
      if ((x - edge) * f >= 0) return true;
      vy -= C.G_BALL; x += vx; y += vy;
      if (y <= C.BALL_R || x < C.BALL_R || x > C.W - C.BALL_R) return (x - edge) * f >= 0;
      const dx = x - C.NET_X;
      if (dx < rr && dx > -rr) {
        const py = y < C.NET_H ? (y > 0 ? y : 0) : C.NET_H, dy = y - py;
        if (dx * dx + dy * dy < rr * rr) return false;
      }
    }
    return false;
  }
  // 랠리 열기 (0 ~ HEAT_MAX): 넘김이 HEAT_FROM 번을 넘으면 스매시가 조금씩 빨라짐
  function heat(s) {
    const n = s.phase === 'play' ? s.crosses - C.HEAT_FROM : 0;
    return n > 0 ? (n * C.HEAT_K < C.HEAT_MAX ? n * C.HEAT_K : C.HEAT_MAX) : 0;
  }

  const LOB_UP = [0, 60, 150, 260], LOB_SLOW = [1, 0.6, 0.35, 0.2];
  // 스매시 방향 이름 (내 고양이가 보는 쪽 = 앞 = 그물 쪽 기준)
  //   방향 없음 power(곧게 힘찬 공) · 앞 drive(더 빠르고 납작) · 위 lob(높이 띄워 살짝 넘김) · 아래 spike(가파르게 내리꽂기)
  //   앞+위 rise(낮게 오르다 깊이) · 앞+아래 dunk(가파르고 더 빠르게) · 뒤 back(제 코트 뒤로 높이 — 짝에게 올려 주기) · 뒤+위 set(더 높고 더 뒤로)
  //   뒤+아래 는 back 과 같음
  function aimOf(c, i) {
    const f = i === 0 ? 1 : -1, pin = c.prevIn | 0;
    const h = (((pin & IN.RIGHT) ? 1 : 0) - ((pin & IN.LEFT) ? 1 : 0)) * f;
    const dn = (pin & IN.DOWN) !== 0, up = (pin & IN.UP) !== 0 || ((pin & IN.JUMP) !== 0 && c.vy <= C.UP_VY);
    const v = up === dn ? 0 : up ? 1 : -1;
    return h > 0 ? (v > 0 ? 'rise' : v < 0 ? 'dunk' : 'drive') : h < 0 ? (v > 0 ? 'set' : 'back') : (v > 0 ? 'lob' : v < 0 ? 'spike' : 'power');
  }
  // 포물선으로 상대 코트 D 만큼 뒤(그물에서)에 떨어뜨리기. 그물에 걸리면 더 높이·더 천천히 띄워 봄 (그물 바로 옆 낮은 공도)
  function arcShot(b, f, apex, D, vcap) {
    const top0 = (b.y > C.NET_H + 40 ? b.y : C.NET_H + 40) + apex;
    for (let n = 0; n < 16; n++) {
      const top = top0 + LOB_UP[n >> 2], vy = Math.sqrt(2 * C.G_BALL * (top - b.y));
      const t = (vy + Math.sqrt(vy * vy + 2 * C.G_BALL * (b.y - C.BALL_R))) / C.G_BALL;
      let vx = (C.NET_X + f * D - b.x) / t * LOB_SLOW[n & 3];
      if (vx > vcap) vx = vcap; else if (vx < -vcap) vx = -vcap;
      const vmin = n & 3 ? 0.3 : 1;                                 // 늘 상대 쪽으로
      if (vx * f < vmin) vx = f * vmin;
      b.vx = vx; b.vy = vy;
      if (clearsNet(b.x, b.y, vx, vy, f)) break;
    }
  }
  // 뒤로 스매시: 제 코트 안쪽(벽에서 BACK_LO ~ 그물에서 BACK_HI)으로 높이 띄움 → 오래 떠 있어서 뛰어가 다시 받을 수 있음 (바로 제 코트에 꽂히지 않음)
  function backShot(b, f, apex, D) {
    const u = f > 0 ? b.x : C.W - b.x;                              // 제 벽에서 잰 거리
    let tu = u - D; const hi = C.NET_X - C.BACK_HI;
    if (tu < C.BACK_LO) tu = C.BACK_LO; else if (tu > hi) tu = hi;
    const tx = f > 0 ? tu : C.W - tu;
    const top = (b.y > C.NET_H + 40 ? b.y : C.NET_H + 40) + apex, vy = Math.sqrt(2 * C.G_BALL * (top - b.y));
    const t = (vy + Math.sqrt(vy * vy + 2 * C.G_BALL * (b.y - C.BALL_R))) / C.G_BALL;
    b.vx = (tx - b.x) / t; b.vy = vy;
  }
  // 스매시 공 속도. aim 은 aimOf 이름. 돌려주는 값 = 실제로 친 방법
  // 너무 낮아서 어느 각도로도 그물을 못 넘기면 살짝 넘기기(lob)로 바뀜 (제 코트에 내리꽂지 않게)
  function shoot(b, i, aim, perfect, ht) {
    const f = i === 0 ? 1 : -1;
    const tbl = aim === 'drive' ? DRIVE_ANG : aim === 'power' ? POWER_ANG : aim === 'spike' || aim === 'dunk' ? SPIKE_ANG : null;
    if (tbl) {
      let S = (aim === 'drive' ? C.DRIVE_V : aim === 'power' ? C.POWER_V : aim === 'dunk' ? C.DUNK_V : C.SPIKE_V) * (perfect ? C.PERFECT_K : 1) * (1 + (ht || 0));
      if (S > C.BALL_MAX - 0.01) S = C.BALL_MAX - 0.01;
      for (let n = 0; n < tbl.length; n++) {                        // 그물을 넘는 가장 가파른 각도
        const vx = f * S * tbl[n][0], vy = -S * tbl[n][1];
        if (clearsNet(b.x, b.y, vx, vy, f)) { b.vx = vx; b.vy = vy; return aim; }
      }
    } else if (aim === 'rise') { arcShot(b, f, C.RISE_APEX, C.RISE_D, C.RISE_VX); return aim; }
    else if (aim === 'back' || aim === 'set') { if (aim === 'set') backShot(b, f, C.SET_APEX, C.SET_D); else backShot(b, f, C.BACK_APEX, C.BACK_D); return aim; }
    const dNet = (C.NET_X - b.x) * f;
    let D = C.LOB_D0 + C.LOB_DK * (dNet > 0 ? dNet : 0);
    if (D > C.LOB_DMAX) D = C.LOB_DMAX;
    arcShot(b, f, C.LOB_APEX, D, C.LOB_VX);
    return 'lob';
  }

  // 공과 고양이 하나의 접촉 (점수 계산 없음, 물리만). 닿았으면 { kind, aim, perfect } 아니면 null
  function contact(c, i, b, ht) {
    if (c.noHit > 0) return null;
    const f = i === 0 ? 1 : -1, fast = b.vx * b.vx + b.vy * b.vy >= C.SMASH_VIN * C.SMASH_VIN;
    if (c.swing > 0 && !c.ground && c.dive === 0 && !fast) {        // 공중 스매시: 휘두르는 중 + 앞발 범위 + 너무 빠르지 않은 공
      const px = c.x + f * C.PAW_DX, py = c.y + C.PAW_DY, dx = b.x - px, dy = b.y - py, rr = C.PAW_R + C.BALL_R;
      if (dx * dx + dy * dy < rr * rr) {
        const perfect = C.SWING_T - c.swing <= C.PERFECT_T;
        const aim = shoot(b, i, aimOf(c, i), perfect, ht);          // 이 순간 누르고 있는 방향대로
        c.swing = 0; c.noHit = C.NOHIT_T;
        return { kind: 'smash', aim, perfect };
      }
    }
    const sh = catShape(c, i), R = sh.r + C.BALL_R;
    let px = sh.ax, py = sh.ay;                                     // 선분에서 공에 가장 가까운 점
    const ex = sh.bx - sh.ax, ey = sh.by - sh.ay, ll = ex * ex + ey * ey;
    if (ll > 0) {
      let u = ((b.x - sh.ax) * ex + (b.y - sh.ay) * ey) / ll;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      px = sh.ax + u * ex; py = sh.ay + u * ey;
    }
    let nx = b.x - px, ny = b.y - py;
    const d2 = nx * nx + ny * ny;
    if (d2 >= R * R) return null;
    let d = Math.sqrt(d2);
    if (d < 1e-6) { nx = 0; ny = 1; d = 1; } else { nx /= d; ny /= d; }
    b.x = px + nx * R; b.y = py + ny * R;
    if (b.x < C.BALL_R || b.x > C.W - C.BALL_R) {                   // 벽과 몸 사이에 끼면 위로 빠져나가게
      b.x = b.x < C.BALL_R ? C.BALL_R : C.W - C.BALL_R;
      const ex = b.x - px, h = R * R - ex * ex;
      if (h > 0) { const up = py + Math.sqrt(h); if (b.y < up) b.y = up; }
      nx = (b.x - px) / R; ny = (b.y - py) / R; const nl = Math.sqrt(nx * nx + ny * ny) || 1; nx /= nl; ny /= nl;
    }
    const rvx = b.vx - c.vx, rvy = b.vy - c.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return null;                                       // 이미 멀어지는 중
    if (c.dive > 0) {                                               // 다이빙 받기: 높이 톡
      b.vy = C.DIG_VY; b.vx = f * C.DIG_VX + c.vx * 0.2; c.noHit = C.NOHIT_T;
      return { kind: 'dig', aim: '', perfect: false };
    }
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
    let on = -vn * C.E_CAT;
    on = on < C.BUMP_N_MIN ? C.BUMP_N_MIN : on > C.BUMP_N_MAX ? C.BUMP_N_MAX : on;
    let ovx = nx * on + tx * vt * C.TAN_K + c.vx * C.CARRY + f * (fast ? C.ASSIST_FAST : C.ASSIST);
    let ovy = ny * on + ty * vt * C.TAN_K + c.vy * C.CARRY;
    if (ny > -0.3) { const pop = (fast ? C.POP_MIN_FAST : C.POP_MIN) + ny * C.POP_K; if (ovy < pop) ovy = pop; }
    b.vx = ovx; b.vy = ovy;
    clampSpeed(b, C.BUMP_MAX);
    return { kind: 'bump', aim: '', perfect: false };
  }

  function startDive(c, i, k, d, ev) {
    c.dive = C.DIVE_T; c.diveDir = d; c.vx = d * C.DIVE_V; c.vy = C.DIVE_HOP; c.ground = false; c.swing = 0; c.dbuf = 0;
    ev.push({ t: 'dive', side: i, cat: k, dir: d });
  }
  // ── 고양이 움직임 (입력 → 속도 → 위치)
  function moveCat(s, k, inp, ev) {
    const i = sideOf(k), c = s.cats[k], f = i === 0 ? 1 : -1;
    if (s.phase === 'over') inp = 0;
    const dir = ((inp & IN.RIGHT) ? 1 : 0) - ((inp & IN.LEFT) ? 1 : 0);
    const jump = (inp & IN.JUMP) !== 0, press = (inp & IN.SMASH) !== 0 && !(c.prevIn & IN.SMASH);
    c.prevIn = inp;
    if (c.swing > 0) c.swing--;
    if (c.swingCd > 0) c.swingCd--;
    if (c.noHit > 0) c.noHit--;
    if (c.dbuf > 0) c.dbuf--;
    if (c.dive > 0) {                                               // 다이빙 중: 조작 없음, 모래에서 미끄러지며 느려짐
      c.dive--;
      if (c.ground) c.vx *= C.DIVE_FR;
      if (c.dive === 0) c.rec = C.REC_T;
    } else if (c.rec > 0) {                                         // 일어나는 중
      c.rec--; c.vx *= 0.5;
    } else {
      const want = dir * C.MOVE_V;
      const a = c.ground ? (dir !== 0 && dir * c.vx >= 0 ? C.ACC : C.DEC) : C.ACC_AIR;
      const dv = want - c.vx;
      c.vx += dv > a ? a : dv < -a ? -a : dv;
      if (jump && c.ground) { c.vy = C.JUMP_V; c.ground = false; ev.push({ t: 'jump', side: i, cat: k }); }
      else if (dir !== 0 && c.dbuf > 0 && c.ground && !press && s.phase !== 'ready') startDive(c, i, k, dir, ev);   // 스매시를 먼저 누르고 방향키가 조금 늦은 경우
      if (press && s.phase !== 'ready') {
        if (c.ground) {
          if (dir !== 0) startDive(c, i, k, dir, ev);               // 방향키를 누른 채 스매시일 때만 몸을 날림
          else { c.dbuf = C.DIVE_BUF; ev.push({ t: 'swipe', side: i, cat: k }); }   // 방향 없이는 제자리 헛손질 (안 움직임)
        } else if (c.swingCd === 0) {
          c.swing = C.SWING_T; c.swingCd = C.SWING_T + C.SWING_CD;
          ev.push({ t: 'swing', side: i, cat: k });
        }
      }
    }
    if (!c.ground) {
      const g = c.vy > 0 && !jump && c.dive === 0 ? C.G_CAT * C.G_CUT : C.G_CAT;
      c.vy -= g;
      if (c.vy < -C.FALL_MAX) c.vy = -C.FALL_MAX;
    }
    c.x += c.vx; c.y += c.vy;
    if (c.y <= 0) {
      c.y = 0;
      if (!c.ground) { ev.push({ t: 'land', side: i, cat: k, v: -c.vy, dive: c.dive > 0 }); c.ground = true; c.swing = 0; }
      c.vy = 0;
    }
    clampCat(c, i);
  }

  function awardPoint(s, w, reason, ev) {
    if (s.team === 2 && s.server !== w) s.rot[w] ^= 1;             // 복식: 서브를 되찾은 편은 한 칸 돌아 다른 고양이가 서브
    s.score[w]++; s.server = w;
    if (s.crosses > s.stats.longest) s.stats.longest = s.crosses;
    s.stats.rallies++;
    const fin = s.score[w] >= s.target;
    if (fin) s.winner = w;
    const kind = s.lastHitter === w ? s.lastKind : '';
    s.lastPoint = { w, reason, kind, x: s.ball.x };
    s.phase = 'point'; s.phaseT = C.POINT_T;
    ev.push({ t: 'point', w, reason, kind, final: fin, score: [s.score[0], s.score[1]] });
  }

  // 접촉 기록: 같은 고양이가 잇달아 닿으면 터치 +1, 상대가 닿거나 공이 그물을 넘으면 처음부터
  //   복식: 같은 편 다른 고양이가 받으면 (붙어 있어도) 새 터치
  function hitCat(s, k, ev) {
    const i = sideOf(k), b = s.ball, r = contact(s.cats[k], i, b, heat(s));
    if (!r) return;
    const live = s.phase === 'play';
    if (live) {
      const same = s.team === 2 ? s.lastCat === k : true;
      if (!(s.lastSide === i && same && s.tick - s.lastTick < C.TOUCH_MERGE)) {
        if (s.lastSide === i) s.touches[i]++; else { s.touches[i] = 1; s.touches[1 - i] = 0; }
        s.hits++;
      }
      if (s.team === 2) s.lastCat = k;
      s.lastSide = i; s.lastTick = s.tick; s.lastHitter = i; s.lastKind = r.kind;
      if (r.kind === 'smash') { s.stats.smashes[i]++; if (r.perfect) s.stats.perfect[i]++; }
      if (r.kind === 'dig') s.stats.digs[i]++;
    }
    ev.push({ t: 'hit', side: i, cat: k, kind: r.kind, aim: r.aim, perfect: r.perfect, x: b.x, y: b.y, v: Math.sqrt(b.vx * b.vx + b.vy * b.vy), vx: b.vx, vy: b.vy, n: s.touches[i] });
    if (live && s.maxTouches > 0 && s.touches[i] > s.maxTouches) {
      ev.push({ t: 'fault', side: i, reason: 'touches' });
      awardPoint(s, 1 - i, 'touches', ev);
    }
  }

  // ── 한 틱 진행. 반환 = 이번 틱에 일어난 일 (소리·효과용)
  //   복식이면 고양이 번호 순서로 넷: step(s, 고양이0, 고양이1, 고양이2, 고양이3) — 0·2 왼쪽, 1·3 오른쪽
  function step(s, inA, inB, inC, inD) {
    const ev = [], two = s.team === 2;
    s.tick++;
    moveCat(s, 0, inA | 0, ev);
    moveCat(s, 1, inB | 0, ev);
    if (two) { moveCat(s, 2, inC | 0, ev); moveCat(s, 3, inD | 0, ev); separate(s); }
    const b = s.ball;
    if (s.phase === 'ready') {                                      // 공은 서버 머리 위에 떠 있음 (아직 안 닿음)
      if (--s.phaseT <= 0) { s.phase = 'play'; b.vy = C.SERVE_TOSS; ev.push({ t: 'serve', side: s.server, cat: two ? s.serveCat : s.server }); }
      return ev;
    }
    ballPhys(b, ev);
    const o = s.tick & 1;                                           // 둘 다 닿을 때 순서 치우치지 않게 번갈아
    if (two) { hitCat(s, o, ev); hitCat(s, o + 2, ev); hitCat(s, 1 - o, ev); hitCat(s, 3 - o, ev); }
    else { hitCat(s, o, ev); hitCat(s, 1 - o, ev); }
    clampSpeed(b, C.BALL_MAX);
    const side = b.x < C.NET_X - 2 ? 0 : b.x > C.NET_X + 2 ? 1 : s.ballSide;
    if (side !== s.ballSide) {
      s.ballSide = side;
      if (s.phase === 'play') {
        s.crosses++; s.touches[0] = 0; s.touches[1] = 0; s.lastSide = -1;
        if (s.crosses > C.HEAT_FROM) ev.push({ t: 'heat', v: heat(s), n: s.crosses });
      }
    }
    if (b.y <= C.BALL_R) {
      const v = -b.vy;
      if (s.phase === 'play') {
        const land = b.x < C.NET_X ? 0 : 1;
        ev.push({ t: 'floor', x: b.x, y: C.BALL_R, v, side: land, point: true });
        awardPoint(s, 1 - land, 'floor', ev);
      } else if (v > 2) ev.push({ t: 'floor', x: b.x, y: C.BALL_R, v, side: b.x < C.NET_X ? 0 : 1, point: false });
      b.y = C.BALL_R;
      if (b.vy < 0) b.vy = -b.vy * C.SAND_E;
      if (b.vy < 1.2) b.vy = 0;
      b.vx *= 0.75;
    }
    if (s.phase === 'point' && --s.phaseT <= 0) {
      if (s.winner >= 0) { s.phase = 'over'; ev.push({ t: 'over', w: s.winner }); }
      else { resetRally(s, C.READY_T); ev.push({ t: 'ready', side: s.server, cat: two ? s.serveCat : s.server }); }
    }
    return ev;
  }

  // ── 학습용: 관찰값 (각자 자기가 왼쪽에 있는 것처럼 좌우를 뒤집어 봄). 길이 OBS_N = 18
  function obs(s, side, out) { return obsOf(s, side, side, 1 - side, out || new Float32Array(OBS_N)); }
  // 복식용 관찰 (길이 OBS_N2 = 26): 고양이 k 기준 obs 18개(상대 = 맞은편 k^1) + 같은 편 x,y,vx,vy + 다른 상대 x,y,vx,vy
  function obsTeam(s, k, out) {
    const o = out || new Float32Array(OBS_N2), side = sideOf(k);
    obsOf(s, side, k, k ^ 1, o);
    const m = side === 0 ? 1 : -1, X = x => m * (x - C.NET_X) / C.NET_X;
    const put = (c, n) => { o[n] = X(c.x); o[n + 1] = c.y / 150; o[n + 2] = m * c.vx / C.MOVE_V; o[n + 3] = c.vy / C.JUMP_V; };
    const mate = s.cats[k ^ 2], op2 = s.cats[k ^ 3];
    if (mate && op2) { put(mate, 18); put(op2, 22); } else for (let n = 18; n < 26; n++) o[n] = 0;
    return o;
  }
  function obsOf(s, side, ki, ko, o) {
    const m = side === 0 ? 1 : -1, X = x => m * (x - C.NET_X) / C.NET_X;   // 내 쪽 -1~0, 상대 쪽 0~1
    const me = s.cats[ki], op = s.cats[ko], b = s.ball;
    o[0] = X(me.x); o[1] = me.y / 150; o[2] = m * me.vx / C.MOVE_V; o[3] = me.vy / C.JUMP_V;
    o[4] = X(op.x); o[5] = op.y / 150; o[6] = m * op.vx / C.MOVE_V; o[7] = op.vy / C.JUMP_V;
    o[8] = X(b.x); o[9] = b.y / 300; o[10] = m * b.vx / 20; o[11] = b.vy / 20;
    o[12] = me.swing > 0 ? 1 : 0;
    o[13] = me.swingCd / (C.SWING_T + C.SWING_CD);
    o[14] = me.dive > 0 ? me.dive / C.DIVE_T : me.rec > 0 ? -me.rec / C.REC_T : 0;
    o[15] = op.dive > 0 || op.rec > 0 ? 1 : 0;
    o[16] = s.maxTouches > 0 ? s.touches[side] / s.maxTouches : 0;
    o[17] = s.phase === 'play' ? 1 : s.phase === 'ready' ? -s.phaseT / C.READY_T0 : 0;
    return o;
  }
  function actionToInput(a, side) {
    const A = ACTIONS[a] || ACTIONS[0];
    const fwd = side === 0 ? IN.RIGHT : IN.LEFT, back = side === 0 ? IN.LEFT : IN.RIGHT;
    return (A[0] > 0 ? fwd : A[0] < 0 ? back : 0) | (A[1] ? IN.JUMP : 0) | (A[2] ? IN.SMASH : 0) | (A[3] ? IN.DOWN : 0);
  }
  function inputToAction(inp, side) {                               // 사람 플레이 기록 → 행동 번호 (흉내 학습용)
    const r = (inp & IN.RIGHT) ? 1 : 0, l = (inp & IN.LEFT) ? 1 : 0;
    let d = r - l; if (side === 1) d = -d;
    if ((inp & IN.DOWN) && (inp & IN.SMASH)) return 12 + (d === 0 ? 0 : d < 0 ? 1 : 2);   // 아래 + 스매시 (12~14)
    return (d === 0 ? 0 : d < 0 ? 1 : 2) * 4 + ((inp & IN.JUMP) ? 2 : 0) + ((inp & IN.SMASH) ? 1 : 0);
  }

  // 입력 비트 ↔ 읽기 쉬운 모양 ({ left, right, jump, smash })
  const bits = o => o ? (o.left ? IN.LEFT : 0) | (o.right ? IN.RIGHT : 0) | (o.jump ? IN.JUMP : 0) | (o.smash ? IN.SMASH : 0) | (o.down ? IN.DOWN : 0) | (o.up ? IN.UP : 0) : 0;
  const unbits = n => ({ left: !!(n & IN.LEFT), right: !!(n & IN.RIGHT), jump: !!(n & IN.JUMP), smash: !!(n & IN.SMASH), down: !!(n & IN.DOWN), up: !!(n & IN.UP) });

  // ── 도구: 복사 · 해시 · 좌우 뒤집기 (테스트·데이터 늘리기용)
  const clone = s => JSON.parse(JSON.stringify(s));
  // 저장·전송한 상태 되살리기 (모양이 다르면 null)
  function fromJSON(o) {
    if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { return null; } }
    if (!o || o.v !== 1 || !o.cats || !o.ball) return null;
    return clone(o);
  }
  function hash(s) {
    const str = JSON.stringify(s);
    let h = 0x811c9dc5;
    for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  const swapLR = inp => (inp & ~3) | ((inp & 1) << 1) | ((inp & 2) >> 1);
  function mirror(s0) {
    const s = clone(s0), W = C.W;
    const fc = c => Object.assign(c, { x: W - c.x, vx: -c.vx, diveDir: -c.diveDir, prevIn: swapLR(c.prevIn) });
    s.cats = s.team === 2 ? [fc(s.cats[1]), fc(s.cats[0]), fc(s.cats[3]), fc(s.cats[2])] : [fc(s.cats[1]), fc(s.cats[0])];
    if (s.team === 2) { s.rot = [s.rot[1], s.rot[0]]; s.serveCat ^= 1; if (s.lastCat >= 0) s.lastCat ^= 1; }
    s.ball.x = W - s.ball.x; s.ball.vx = -s.ball.vx;
    const sw = a => [a[1], a[0]], fl = v => v === 0 || v === 1 ? 1 - v : v;
    s.score = sw(s.score); s.touches = sw(s.touches);
    s.server = fl(s.server); s.winner = fl(s.winner); s.lastSide = fl(s.lastSide); s.lastHitter = fl(s.lastHitter); s.ballSide = fl(s.ballSide);
    for (const k of ['smashes', 'perfect', 'digs']) s.stats[k] = sw(s.stats[k]);
    if (s.lastPoint) { s.lastPoint.w = fl(s.lastPoint.w); s.lastPoint.x = W - s.lastPoint.x; }
    return s;
  }

  const API = { C, IN, ACTIONS, OBS_N, OBS_N2, SPIKE_ANG, DRIVE_ANG, create, step, obs, obsTeam, sideOf, homeX2, actionToInput, inputToAction, bits, unbits, clone, fromJSON, hash, mirror, rand,
    ballPhys, predictLanding, catShape, pawOf, contact, shoot, aimOf, clearsNet, heat, homeX, POWER_ANG };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Volley = API;
})(this);

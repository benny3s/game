/* 냥냥 배구 — 규칙·물리 코어 (결정적 · 화면 없이도 돌아감)
   브라우저(window.Volley)와 Node(require) 양쪽에서 그대로 씀. 나중에 파이썬 학습 환경이 똑같이 따라 함.
   - 60Hz 고정 틱. Math.random·Date·performance·삼각함수 없음 (sqrt·사칙연산만 → 어느 언어로 옮겨도 같은 값)
   - 상태는 JSON 으로 그대로 저장·전송되는 평범한 객체 (온라인 때 방장 시뮬을 그대로 흘려보냄)
   - 좌표: x 0~640 (왼쪽 벽 0, 그물 320), y 는 모래 바닥(0)에서 위로 +. 고양이 x,y = 발 가운데
   - 입력 = 비트 {LEFT 1, RIGHT 2, JUMP 4, SMASH 8} (화면 기준 방향) */
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
    DIVE_T: 16, DIVE_V: 10, DIVE_HOP: 2.4, DIVE_FR: 0.86, REC_T: 16, DIVE_R: 24,   // 땅 스매시 = 다이빙 · 일어나는 시간
    DIG_VY: 12.5, DIG_VX: 2.4,                                      //   다이빙으로 받으면 높이 떠오름
    TOUCH_MERGE: 8, READY_T: 60, READY_T0: 84, POINT_T: 96,         // 같은 접촉 묶음 · 서브 전 대기 · 점수 후 쉬는 시간
    SERVE_X: 160, SERVE_DX: 16, SERVE_Y: 236, SERVE_TOSS: 4,        // 서브: 공이 서버 머리 위(그물 쪽으로 살짝)에서 톡 올라갔다 떨어짐
  };
  const IN = { LEFT: 1, RIGHT: 2, JUMP: 4, SMASH: 8 };

  // 스매시 각도표 [cos, sin] (sin + = 아래로). 삼각함수 대신 숫자로 박아 둠 → 다른 언어에서도 같은 값
  // 가파른 것부터 보고, 그물을 넘는 첫 각도를 씀 (그물 앞에서 치면 바로 뒤로 꽂히고, 멀리서 치면 저절로 납작해짐)
  const SPIKE_ANG = [[0.374607, 0.927184], [0.5, 0.866025], [0.615661, 0.788011], [0.694658, 0.71934], [0.766044, 0.642788], [0.829038, 0.559193], [0.882948, 0.469472], [0.927184, 0.374607],
    [0.961262, 0.275637], [0.984808, 0.173648], [0.997564, 0.069756], [0.999391, -0.034899], [0.990268, -0.139173], [0.970296, -0.241922]];   // 68° ~ -14°
  // 강타: 납작하고 빠르게 (그물을 넘는 첫 각도 · 뒤 벽을 맞고 튀어나오기도 함)
  const DRIVE_ANG = [[0.970296, 0.241922], [0.984808, 0.173648], [0.994522, 0.104528], [0.999391, 0.034899], [0.99863, -0.052336], [0.990268, -0.139173],
    [0.97437, -0.224951], [0.951057, -0.309017]];                                                                                             // 14° ~ -18°

  // 행동표 (학습용): [방향 0 없음 / -1 뒤 / +1 앞(상대 쪽), 점프, 스매시] → 12가지
  const ACTIONS = [];
  for (const d of [0, -1, 1]) for (const j of [0, 1]) for (const k of [0, 1]) ACTIONS.push([d, j, k]);
  const OBS_N = 18;

  // 씨앗 난수 (mulberry32) — 상태 안에 들어 있어 저장·복원해도 이어짐
  function rand(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const homeX = i => i === 0 ? C.SERVE_X : C.W - C.SERVE_X;
  function newCat(i, prevIn) {
    return { x: homeX(i), y: 0, vx: 0, vy: 0, ground: true, swing: 0, swingCd: 0, dive: 0, diveDir: 0, rec: 0, noHit: 0, prevIn: prevIn || 0 };
  }

  // 새 경기. opts: { target: 7|11|15, maxTouches: 0 = 제한 없음(기본, 가족용) | 3 = 진짜 배구처럼, server: 0|1 (없으면 씨앗으로) }
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
    s.server = opts.server === 0 || opts.server === 1 ? opts.server : (rand(s) < 0.5 ? 0 : 1);
    resetRally(s, C.READY_T0);
    return s;
  }

  // 점수 사이: 자리로 돌아가고 공은 서버 머리 위에 떠 있음
  function resetRally(s, t) {
    s.cats = [newCat(0, s.cats[0].prevIn), newCat(1, s.cats[1].prevIn)];
    const f = s.server === 0 ? 1 : -1;
    s.ball = { x: homeX(s.server) + f * C.SERVE_DX, y: C.SERVE_Y, vx: 0, vy: 0 };
    s.ballSide = s.server; s.touches = [0, 0]; s.lastSide = -1; s.lastTick = -99;
    s.hits = 0; s.crosses = 0; s.lastHitter = -1; s.lastKind = '';
    s.phase = 'ready'; s.phaseT = t;
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
  // 스매시 공 속도. aim: spike(그냥) / drive(앞) / lob(뒤). 돌려주는 값 = 실제로 친 방법
  // 너무 낮아서 어느 각도로도 그물을 못 넘기면 살짝 넘기기로 바뀜 (제 코트에 내리꽂지 않게)
  function shoot(b, i, aim, perfect, ht) {
    const f = i === 0 ? 1 : -1;
    if (aim !== 'lob') {
      const tbl = aim === 'drive' ? DRIVE_ANG : SPIKE_ANG;
      let S = (aim === 'drive' ? C.DRIVE_V : C.SPIKE_V) * (perfect ? C.PERFECT_K : 1) * (1 + (ht || 0));
      if (S > C.BALL_MAX - 0.01) S = C.BALL_MAX - 0.01;
      for (let n = 0; n < tbl.length; n++) {                        // 그물을 넘는 가장 가파른 각도
        const vx = f * S * tbl[n][0], vy = -S * tbl[n][1];
        if (clearsNet(b.x, b.y, vx, vy, f)) { b.vx = vx; b.vy = vy; return aim; }
      }
    }
    const dNet = (C.NET_X - b.x) * f;
    let D = C.LOB_D0 + C.LOB_DK * (dNet > 0 ? dNet : 0);
    if (D > C.LOB_DMAX) D = C.LOB_DMAX;
    const top0 = (b.y > C.NET_H + 40 ? b.y : C.NET_H + 40) + C.LOB_APEX;
    for (let n = 0; n < 16; n++) {                                  // 그물에 걸리면 더 높이·더 천천히 띄워 봄 (그물 바로 옆 낮은 공도)
      const top = top0 + LOB_UP[n >> 2], vy = Math.sqrt(2 * C.G_BALL * (top - b.y));
      const t = (vy + Math.sqrt(vy * vy + 2 * C.G_BALL * (b.y - C.BALL_R))) / C.G_BALL;
      let vx = (C.NET_X + f * D - b.x) / t * LOB_SLOW[n & 3];
      if (vx > C.LOB_VX) vx = C.LOB_VX; else if (vx < -C.LOB_VX) vx = -C.LOB_VX;
      const vmin = n & 3 ? 0.3 : 1;                                 // 늘 상대 쪽으로
      if (vx * f < vmin) vx = f * vmin;
      b.vx = vx; b.vy = vy;
      if (clearsNet(b.x, b.y, vx, vy, f)) break;
    }
    return 'lob';
  }

  // 공과 고양이 하나의 접촉 (점수 계산 없음, 물리만). 닿았으면 { kind, aim, perfect } 아니면 null
  function contact(c, i, b, ht) {
    if (c.noHit > 0) return null;
    const f = i === 0 ? 1 : -1, fast = b.vx * b.vx + b.vy * b.vy >= C.SMASH_VIN * C.SMASH_VIN;
    if (c.swing > 0 && !c.ground && c.dive === 0 && !fast) {        // 공중 스매시: 휘두르는 중 + 앞발 범위 + 너무 빠르지 않은 공
      const px = c.x + f * C.PAW_DX, py = c.y + C.PAW_DY, dx = b.x - px, dy = b.y - py, rr = C.PAW_R + C.BALL_R;
      if (dx * dx + dy * dy < rr * rr) {
        const held = ((c.prevIn & IN.RIGHT) ? 1 : 0) - ((c.prevIn & IN.LEFT) ? 1 : 0);
        const want = held * f > 0 ? 'drive' : held * f < 0 ? 'lob' : 'spike';
        const perfect = C.SWING_T - c.swing <= C.PERFECT_T;
        const aim = shoot(b, i, want, perfect, ht);
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

  // ── 고양이 움직임 (입력 → 속도 → 위치)
  function moveCat(s, i, inp, ev) {
    const c = s.cats[i], f = i === 0 ? 1 : -1;
    if (s.phase === 'over') inp = 0;
    const dir = ((inp & IN.RIGHT) ? 1 : 0) - ((inp & IN.LEFT) ? 1 : 0);
    const jump = (inp & IN.JUMP) !== 0, press = (inp & IN.SMASH) !== 0 && !(c.prevIn & IN.SMASH);
    c.prevIn = inp;
    if (c.swing > 0) c.swing--;
    if (c.swingCd > 0) c.swingCd--;
    if (c.noHit > 0) c.noHit--;
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
      if (jump && c.ground) { c.vy = C.JUMP_V; c.ground = false; ev.push({ t: 'jump', side: i }); }
      if (press && s.phase !== 'ready') {
        if (c.ground) {
          const d = dir !== 0 ? dir : f;
          c.dive = C.DIVE_T; c.diveDir = d; c.vx = d * C.DIVE_V; c.vy = C.DIVE_HOP; c.ground = false; c.swing = 0;
          ev.push({ t: 'dive', side: i, dir: d });
        } else if (c.swingCd === 0) {
          c.swing = C.SWING_T; c.swingCd = C.SWING_T + C.SWING_CD;
          ev.push({ t: 'swing', side: i });
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
      if (!c.ground) { ev.push({ t: 'land', side: i, v: -c.vy, dive: c.dive > 0 }); c.ground = true; c.swing = 0; }
      c.vy = 0;
    }
    const lo = i === 0 ? C.CAT_HW : C.NET_X + C.NET_HW + C.CAT_HW;
    const hi = i === 0 ? C.NET_X - C.NET_HW - C.CAT_HW : C.W - C.CAT_HW;
    if (c.x < lo) { c.x = lo; if (c.vx < 0) c.vx = 0; } else if (c.x > hi) { c.x = hi; if (c.vx > 0) c.vx = 0; }
  }

  function awardPoint(s, w, reason, ev) {
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
  function hitCat(s, i, ev) {
    const b = s.ball, r = contact(s.cats[i], i, b, heat(s));
    if (!r) return;
    const live = s.phase === 'play';
    if (live) {
      if (!(s.lastSide === i && s.tick - s.lastTick < C.TOUCH_MERGE)) {
        if (s.lastSide === i) s.touches[i]++; else { s.touches[i] = 1; s.touches[1 - i] = 0; }
        s.hits++;
      }
      s.lastSide = i; s.lastTick = s.tick; s.lastHitter = i; s.lastKind = r.kind;
      if (r.kind === 'smash') { s.stats.smashes[i]++; if (r.perfect) s.stats.perfect[i]++; }
      if (r.kind === 'dig') s.stats.digs[i]++;
    }
    ev.push({ t: 'hit', side: i, kind: r.kind, aim: r.aim, perfect: r.perfect, x: b.x, y: b.y, v: Math.sqrt(b.vx * b.vx + b.vy * b.vy), n: s.touches[i] });
    if (live && s.maxTouches > 0 && s.touches[i] > s.maxTouches) {
      ev.push({ t: 'fault', side: i, reason: 'touches' });
      awardPoint(s, 1 - i, 'touches', ev);
    }
  }

  // ── 한 틱 진행. 반환 = 이번 틱에 일어난 일 (소리·효과용)
  function step(s, inA, inB) {
    const ev = [];
    s.tick++;
    moveCat(s, 0, inA | 0, ev);
    moveCat(s, 1, inB | 0, ev);
    const b = s.ball;
    if (s.phase === 'ready') {                                      // 공은 서버 머리 위에 떠 있음 (아직 안 닿음)
      if (--s.phaseT <= 0) { s.phase = 'play'; b.vy = C.SERVE_TOSS; ev.push({ t: 'serve', side: s.server }); }
      return ev;
    }
    ballPhys(b, ev);
    const o = s.tick & 1;                                           // 둘 다 닿을 때 순서 치우치지 않게 번갈아
    hitCat(s, o, ev); hitCat(s, 1 - o, ev);
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
      else { resetRally(s, C.READY_T); ev.push({ t: 'ready', side: s.server }); }
    }
    return ev;
  }

  // ── 학습용: 관찰값 (각자 자기가 왼쪽에 있는 것처럼 좌우를 뒤집어 봄). 길이 OBS_N = 18
  function obs(s, side, out) {
    const o = out || new Float32Array(OBS_N);
    const m = side === 0 ? 1 : -1, X = x => m * (x - C.NET_X) / C.NET_X;   // 내 쪽 -1~0, 상대 쪽 0~1
    const me = s.cats[side], op = s.cats[1 - side], b = s.ball;
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
    return (A[0] > 0 ? fwd : A[0] < 0 ? back : 0) | (A[1] ? IN.JUMP : 0) | (A[2] ? IN.SMASH : 0);
  }
  function inputToAction(inp, side) {                               // 사람 플레이 기록 → 행동 번호 (흉내 학습용)
    const r = (inp & IN.RIGHT) ? 1 : 0, l = (inp & IN.LEFT) ? 1 : 0;
    let d = r - l; if (side === 1) d = -d;
    return (d === 0 ? 0 : d < 0 ? 1 : 2) * 4 + ((inp & IN.JUMP) ? 2 : 0) + ((inp & IN.SMASH) ? 1 : 0);
  }

  // 입력 비트 ↔ 읽기 쉬운 모양 ({ left, right, jump, smash })
  const bits = o => o ? (o.left ? IN.LEFT : 0) | (o.right ? IN.RIGHT : 0) | (o.jump ? IN.JUMP : 0) | (o.smash ? IN.SMASH : 0) : 0;
  const unbits = n => ({ left: !!(n & IN.LEFT), right: !!(n & IN.RIGHT), jump: !!(n & IN.JUMP), smash: !!(n & IN.SMASH) });

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
    s.cats = [fc(s.cats[1]), fc(s.cats[0])];
    s.ball.x = W - s.ball.x; s.ball.vx = -s.ball.vx;
    const sw = a => [a[1], a[0]], fl = v => v === 0 || v === 1 ? 1 - v : v;
    s.score = sw(s.score); s.touches = sw(s.touches);
    s.server = fl(s.server); s.winner = fl(s.winner); s.lastSide = fl(s.lastSide); s.lastHitter = fl(s.lastHitter); s.ballSide = fl(s.ballSide);
    for (const k of ['smashes', 'perfect', 'digs']) s.stats[k] = sw(s.stats[k]);
    if (s.lastPoint) { s.lastPoint.w = fl(s.lastPoint.w); s.lastPoint.x = W - s.lastPoint.x; }
    return s;
  }

  const API = { C, IN, ACTIONS, OBS_N, SPIKE_ANG, DRIVE_ANG, create, step, obs, actionToInput, inputToAction, bits, unbits, clone, fromJSON, hash, mirror, rand,
    ballPhys, predictLanding, catShape, pawOf, contact, shoot, clearsNet, heat, homeX };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Volley = API;
})(this);

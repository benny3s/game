/* 당구 — 물리 + 규칙 엔진 (core.js)
   · 화면 없이 Node 에서도 돎 (UMD: 브라우저는 window.Billiards, Node 는 require)
   · 상태(state)는 JSON 그대로 저장·전송 가능. 난수는 상태 안 mulberry32 (Math.random·Date 안 씀)
   · simulate(state, action) = 한 번 친 공이 멈출 때까지 고정 시간 간격(1/60초 + 속도에 맞춘 잘게 쪼개기)으로 계산,
     프레임마다 공 위치 + 사건(공-공 · 쿠션 · 포켓) 을 돌려줌 → 방장이 한 번 계산해서 모두에게 보냄
   · 물리: 미끄러짐 ↔ 굴림 마찰, 회전(밀어치기·끌어치기·좌우 회전), 쿠션 반발 + 회전에 따른 각도 변화, 공끼리 탄성 충돌(약간의 던짐)
   · 규칙: 4구(한국식), 3쿠션, 포켓볼(8볼, 간단 규칙) */
(function (root) {
  'use strict';

  const G = 9.81;
  const FPS = 60, FDT = 1 / FPS;

  // ── 당구대 (치수 m, 쿠션 코 기준 안쪽 크기)
  const TABLES = {
    // 국제식 대대 (3쿠션)
    carom: { kind: 'carom', L: 2.844, W: 1.422, R: 0.03075, rail: 0.13, diamonds: [8, 4] },
    // 중대 (한국 4구)
    carom4: { kind: 'carom', L: 2.54, W: 1.27, R: 0.03275, rail: 0.125, diamonds: [8, 4] },
    // 9피트 포켓볼
    pool: { kind: 'pool', L: 2.54, W: 1.27, R: 0.028575, rail: 0.13, diamonds: [8, 4], cornerGap: 0.08, sideGap: 0.066 },
  };
  // 물리 상수 (게임 느낌에 맞춰 조금 손봄) · bbMu = 공-공 마찰 μ(미끄러짐 속도) = a + b·e^(−c·v) (Alciatore·Marlow 측정값: 느릴수록 던짐이 큼)
  const PHYS = {
    carom: { mus: 0.2, mur: 0.0125, damp: 0.035, eb: 0.94, ec: 0.82, muc: 0.28, spinDecay: 14, keepRoll: 0.3, bbMu: [0.00995, 0.108, 1.088], vmax: 7.2, tipMax: 0.55 },
    pool: { mus: 0.2, mur: 0.0135, damp: 0.04, eb: 0.96, ec: 0.78, muc: 0.22, spinDecay: 16, keepRoll: 0.3, bbMu: [0.00995, 0.108, 1.088], vmax: 9.5, tipMax: 0.55 },
  };
  const MODES = {
    '4gu': { id: '4gu', name: '4구', table: 'carom4', targets: [30, 50, 80, 100, 150, 200], defTarget: 80 },
    '3c': { id: '3c', name: '3쿠션', table: 'carom', targets: [5, 10, 15, 20, 30, 40], defTarget: 10 },
    '8ball': { id: '8ball', name: '포켓볼', table: 'pool', targets: [1], defTarget: 1 },
  };
  // 공 이름 (화면·설명용)
  const CAROM_NAMES = ['흰 공', '노란 공', '빨간 공', '빨간 공 2'];

  // ── 씨앗 난수 (mulberry32, 공개 도메인). 상태 안 정수 하나로 이어감
  function rngNext(s) {
    let a = (s.rng + 0x6D2B79F5) | 0; s.rng = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function makeRng(seed) { const o = { rng: seed | 0 }; return () => rngNext(o); }

  // ── 쿠션 선분·턱(포켓 모서리)·포켓 만들기 (표 모양만 보고 한 번)
  const geomCache = {};
  function geom(tid) {
    if (geomCache[tid]) return geomCache[tid];
    const t = TABLES[tid], L = t.L, W = t.W, segs = [], jaws = [], pockets = [];
    const seg = (ax, ay, bx, by, nx, ny, rail) => { const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy); segs.push({ ax, ay, dx: dx / len, dy: dy / len, len, nx, ny, rail }); };
    if (t.kind === 'carom') {
      seg(0, 0, L, 0, 0, 1, 0); seg(L, 0, L, W, -1, 0, 1); seg(L, W, 0, W, 0, -1, 2); seg(0, W, 0, 0, 1, 0, 3);
    } else {
      const g = t.cornerGap, s = t.sideGap;
      seg(g, 0, L / 2 - s, 0, 0, 1, 0); seg(L / 2 + s, 0, L - g, 0, 0, 1, 1);
      seg(L, g, L, W - g, -1, 0, 2);
      seg(L - g, W, L / 2 + s, W, 0, -1, 3); seg(L / 2 - s, W, g, W, 0, -1, 4);
      seg(0, W - g, 0, g, 1, 0, 5);
      for (const q of segs) { jaws.push([q.ax, q.ay]); jaws.push([q.ax + q.dx * q.len, q.ay + q.dy * q.len]); }
      // 포켓: 0 왼쪽 아래, 1 가운데 아래, 2 오른쪽 아래, 3 오른쪽 위, 4 가운데 위, 5 왼쪽 위 (그림용 중심·반지름)
      const cr = 0.062, sr = 0.06;
      pockets.push({ x: -0.012, y: -0.012, r: cr }, { x: L / 2, y: -0.03, r: sr }, { x: L + 0.012, y: -0.012, r: cr },
        { x: L + 0.012, y: W + 0.012, r: cr }, { x: L / 2, y: W + 0.03, r: sr }, { x: -0.012, y: W + 0.012, r: cr });
    }
    return (geomCache[tid] = { segs, jaws, pockets, L, W, R: t.R, kind: t.kind });
  }
  function nearestPocket(gm, x, y) {
    let bi = 0, bd = 1e9;
    gm.pockets.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i; } });
    return bi;
  }

  // ── 큐로 치기: 공에 줄 처음 속도·회전
  // action = { angle(라디안, 당구대 좌표), power 0..1, spinX -1..1 (오른쪽 +), spinY -1..1 (위 = 밀어치기 +), place:[x,y] (프리볼일 때) }
  function cueSpeed(phys, power) { const p = Math.max(0.01, Math.min(1, +power || 0)); return phys.vmax * Math.pow(p, 1.5); }
  function clampSpin(sx, sy) {
    sx = Math.max(-1, Math.min(1, +sx || 0)); sy = Math.max(-1, Math.min(1, +sy || 0));
    const m = Math.hypot(sx, sy); if (m > 1) { sx /= m; sy /= m; }
    return [sx, sy];
  }
  function strike(b, action, R, phys) {
    const v = cueSpeed(phys, action.power);
    const dx = Math.cos(action.angle), dy = Math.sin(action.angle);
    const [sx, sy] = clampSpin(action.spinX, action.spinY);
    const a = sx * phys.tipMax * R, h = sy * phys.tipMax * R;   // 당점: 옆(a)·위아래(h)
    b.vx = v * dx; b.vy = v * dy;
    // ω = (r × J)/I, I = 0.4 m R²
    const k = 2.5 * v / (R * R);
    b.wx = -h * dy * k; b.wy = h * dx * k; b.wz = a * k;
  }

  // ── 한 번 친 공을 멈출 때까지 계산
  // opt: { maxTime(초), record:false 면 프레임 안 남김, stop(ev, sim) → true 면 그만 }
  function simulate(state, action, opt) {
    opt = opt || {};
    const tid = state.table, T = TABLES[tid], gm = geom(tid), R = T.R, P = PHYS[T.kind];
    const L = T.L, W = T.W, n = state.balls.length, R2 = 2 * R, R2s = R2 * R2;
    const B = state.balls.map(b => ({ x: b.x, y: b.y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, on: !!b.on, mv: false }));
    const cueId = action.cue != null ? action.cue : cueOf(state, state.turn);
    const cb = B[cueId];
    if (action.place && cb) { cb.x = action.place[0]; cb.y = action.place[1]; cb.on = true; }
    strike(cb, action, R, P); cb.mv = true;
    const record = opt.record !== false;
    const frames = [], events = [];
    const snap = () => { const f = new Float32Array(2 * n); for (let i = 0; i < n; i++) { const b = B[i]; f[2 * i] = b.on ? b.x : NaN; f[2 * i + 1] = b.on ? b.y : NaN; } frames.push(f); };
    if (record) snap();
    const maxF = Math.round((opt.maxTime || 40) * FPS);
    const lastCush = new Int32Array(n).fill(-99), lastCushRail = new Int32Array(n).fill(-1);
    let frame = 0, stopped = false, hcur = FDT;
    const mus = P.mus, mur = P.mur, damp = P.damp, eb = P.eb, ec = P.ec, muc = P.muc, keep = P.keepRoll, bbA = P.bbMu[0], bbB = P.bbMu[1], bbC = P.bbMu[2], sd = P.spinDecay;
    const pool = T.kind === 'pool', segs = gm.segs, jaws = gm.jaws;
    const cornerCut = pool ? T.cornerGap * 0.62 : 0;
    const energy = opt.energy ? [] : null, I = 0.4 * R * R;
    const enr = () => { let e = 0; for (const b of B) if (b.on) e += 0.5 * (b.vx * b.vx + b.vy * b.vy) + 0.5 * I * (b.wx * b.wx + b.wy * b.wy + b.wz * b.wz); energy.push(e); };
    if (energy) enr();
    const emit = ev => { ev.f = frame; events.push(ev); if (opt.stop && opt.stop(ev)) stopped = true; };

    // 쿠션·턱 반발 (n = 당구대 안쪽을 향하는 법선)
    function cushion(b, nx, ny, i, rail, pen) {
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) { if (pen > 0) { b.x += nx * pen; b.y += ny * pen; } return; }
      const jn = -(1 + ec) * vn;
      const tx = -ny, ty = nx;
      const s = b.vx * tx + b.vy * ty - R * b.wz;               // 쿠션에 닿는 점의 미끄러짐
      let jt = -s / 3.5; const lim = muc * jn; if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      b.vx += jn * nx + jt * tx; b.vy += jn * ny + jt * ty;
      b.wz += -2.5 * jt / R;
      // 굴림 회전 중 쿠션 쪽 성분은 많이 줄어듦 (쿠션이 공 중심보다 높게 닿음)
      const svx = R * b.wy, svy = -R * b.wx, svn = svx * nx + svy * ny;
      const nsx = svx - (1 - keep) * svn * nx, nsy = svy - (1 - keep) * svn * ny;
      b.wy = nsx / R; b.wx = -nsy / R;
      // 밀어내기: 겹친 만큼 + 닿은 뒤 튀어 나왔을 거리(ec × 겹침, 이번 칸에 움직인 만큼까지) → 잘게 쪼갠 칸 위치에 따라 길이 몇 mm 씩 흔들리지 않게
      if (pen > 0) { const k = pen + ec * Math.min(pen, -vn * hcur); b.x += nx * k; b.y += ny * k; }
      b.mv = true;
      if (-vn > 0.02 && !(lastCushRail[i] === rail && frame - lastCush[i] < 3)) emit({ k: 'c', a: i, b: rail, v: -vn });
      lastCush[i] = frame; lastCushRail[i] = rail;
    }

    while (frame < maxF && !stopped) {
      let vmax = 0, any = false;
      for (let i = 0; i < n; i++) { const b = B[i]; if (!b.on || !b.mv) continue; any = true; const sp = Math.hypot(b.vx, b.vy); if (sp > vmax) vmax = sp; }
      if (!any) break;
      const sub = Math.min(80, Math.max(1, Math.ceil(vmax * FDT / (0.3 * R))));
      const h = FDT / sub; hcur = h;
      for (let st = 0; st < sub && !stopped; st++) {
        // 1) 마찰·이동
        for (let i = 0; i < n; i++) {
          const b = B[i]; if (!b.on || !b.mv) continue;
          const ux = b.vx - R * b.wy, uy = b.vy + R * b.wx, us = Math.hypot(ux, uy);
          if (us > 1e-4) {
            const dec = mus * G * h;
            if (3.5 * dec >= us) { b.vx -= ux / 3.5; b.vy -= uy / 3.5; b.wy = b.vx / R; b.wx = -b.vy / R; }
            else { const ex = ux / us, ey = uy / us; b.vx -= dec * ex; b.vy -= dec * ey; b.wx -= 2.5 * dec * ey / R; b.wy += 2.5 * dec * ex / R; }
          } else {
            const sp = Math.hypot(b.vx, b.vy);
            if (sp > 0) { const nd = sp - (mur * G + damp * sp) * h; const k = nd > 0 ? nd / sp : 0; b.vx *= k; b.vy *= k; }
            b.wy = b.vx / R; b.wx = -b.vy / R;
          }
          if (b.wz !== 0) { const d = sd * h; b.wz = Math.abs(b.wz) <= d ? 0 : b.wz - Math.sign(b.wz) * d; }
          b.x += b.vx * h; b.y += b.vy * h;
          const sp2 = b.vx * b.vx + b.vy * b.vy;
          if (sp2 < 1e-6) {
            const ux2 = b.vx - R * b.wy, uy2 = b.vy + R * b.wx;
            if (ux2 * ux2 + uy2 * uy2 < 4e-6) { b.vx = b.vy = b.wx = b.wy = b.wz = 0; b.mv = false; }
          }
        }
        // 2) 쿠션·포켓
        for (let i = 0; i < n; i++) {
          const b = B[i]; if (!b.on) continue;
          if (!b.mv) continue;
          if (pool) {
            // 포켓: 쿠션 줄을 넘어갔으면(틈으로만 갈 수 있음) 또는 모서리 깊숙이 들어갔으면
            const cut = R * 0.3;
            const deep = (b.x + b.y < cornerCut) || ((L - b.x) + b.y < cornerCut) || ((L - b.x) + (W - b.y) < cornerCut) || (b.x + (W - b.y) < cornerCut);
            if (deep || b.x < -cut || b.x > L + cut || b.y < -cut || b.y > W + cut) {
              const pk = nearestPocket(gm, b.x, b.y);
              b.on = false; b.mv = false; b.vx = b.vy = b.wx = b.wy = b.wz = 0;
              emit({ k: 'p', a: i, b: pk, v: 0 });
              continue;
            }
          }
          for (let q = 0; q < segs.length; q++) {
            const sg = segs[q];
            const rx = b.x - sg.ax, ry = b.y - sg.ay;
            const d = rx * sg.nx + ry * sg.ny;
            if (d >= R || d < -R) continue;
            const u = rx * sg.dx + ry * sg.dy;
            if (u < 0 || u > sg.len) continue;
            cushion(b, sg.nx, sg.ny, i, sg.rail, R - d);
          }
          for (let q = 0; q < jaws.length; q++) {
            const jx = b.x - jaws[q][0], jy = b.y - jaws[q][1], dd = jx * jx + jy * jy;
            if (dd >= R * R || dd < 1e-12) continue;
            const d = Math.sqrt(dd);
            cushion(b, jx / d, jy / d, i, 10 + q, R - d);
          }
        }
        // 3) 공끼리 (두 번 훑어서 뭉친 공도 잘 퍼지게)
        for (let pass = 0; pass < 2; pass++) {
          let hit = false;
          for (let i = 0; i < n; i++) {
            const a = B[i]; if (!a.on) continue;
            for (let j = i + 1; j < n; j++) {
              const c = B[j]; if (!c.on || (!a.mv && !c.mv)) continue;
              const dx = c.x - a.x, dy = c.y - a.y, dd = dx * dx + dy * dy;
              if (dd >= R2s) continue;
              let d = Math.sqrt(dd) || 1e-9, nx = dx / d, ny = dy / d;
              let vrel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
              // 닿은 순간으로 되감기: 잘게 쪼갠 한 칸 안에서 겹친 깊이만큼 법선이 틀어지면 두께(컷 각)가 최대 5~7° 흔들림
              //   → 두 공을 지금 속도로 뒤로 돌려 딱 닿는 자리에서 법선을 잡고, 충돌 뒤 같은 시간만큼 새 속도로 보냄
              let tb = 0;
              if (vrel > 0) {
                const rvx = c.vx - a.vx, rvy = c.vy - a.vy, A = rvx * rvx + rvy * rvy, Bq = dx * rvx + dy * rvy;
                if (A > 1e-12) { const t0 = (Bq + Math.sqrt(Math.max(0, Bq * Bq - A * (dd - R2s)))) / A; if (t0 > 0 && t0 <= h) tb = t0; }
              }
              if (tb > 0) {
                a.x -= a.vx * tb; a.y -= a.vy * tb; c.x -= c.vx * tb; c.y -= c.vy * tb;
                const ex = c.x - a.x, ey = c.y - a.y; d = Math.hypot(ex, ey) || 1e-9; nx = ex / d; ny = ey / d;
                vrel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
              } else {
                const pen = (R2 - d) / 2;
                a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
              }
              if (vrel <= 0) { if (tb > 0) { a.x += a.vx * tb; a.y += a.vy * tb; c.x += c.vx * tb; c.y += c.vy * tb; } continue; }
              hit = true;
              const jn = (1 + eb) / 2 * vrel;
              a.vx -= jn * nx; a.vy -= jn * ny; c.vx += jn * nx; c.vy += jn * ny;
              // 던짐: 닿는 면의 미끄러짐을 마찰로 조금 줄임 (옆 회전·얇은 두께가 상대 공 방향을 살짝 바꿈)
              //   마찰은 미끄러짐이 빠를수록 작고, 밀어치기·끌어치기의 위아래 미끄러짐이 섞이면 옆으로 미는 몫이 줄어듦 (굴러가는 공은 던짐이 적음)
              const tx = -ny, ty = nx;
              const s = (a.vx - c.vx) * tx + (a.vy - c.vy) * ty + R * (a.wz + c.wz);
              const sz = R * ((a.wx + c.wx) * ny - (a.wy + c.wy) * nx), sAll = Math.hypot(s, sz);
              const mu = bbA + bbB * Math.exp(-bbC * sAll);
              let jt = -s / 7; const lim = mu * jn * (sAll > 1e-9 ? Math.abs(s) / sAll : 1); if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
              a.vx += jt * tx; a.vy += jt * ty; c.vx -= jt * tx; c.vy -= jt * ty;
              a.wz += 2.5 * jt / R; c.wz += 2.5 * jt / R;
              if (tb > 0) { a.x += a.vx * tb; a.y += a.vy * tb; c.x += c.vx * tb; c.y += c.vy * tb; }
              a.mv = c.mv = true;
              if (pass === 0 || vrel > 0.01) emit({ k: 'b', a: i, b: j, v: vrel });
            }
          }
          if (!hit) break;
        }
      }
      frame++;
      if (record) snap();
      if (energy) enr();
    }
    return {
      frames, events, fps: FPS, n, cue: cueId, frameCount: frame, energy,
      final: B.map(b => ({ x: b.x, y: b.y, on: b.on })),
      truncated: stopped || frame >= maxF,
    };
  }

  // ── 상태 만들기
  function create(o) {
    o = o || {};
    const mode = MODES[o.mode] ? o.mode : '3c', M = MODES[mode];
    const n = Math.max(1, Math.min(4, o.players | 0 || 2));
    const seed = (o.seed == null ? 12345 : o.seed) | 0;
    const s = {
      v: 1, mode, table: M.table, n, seed, rng: seed,
      target: o.target || M.defTarget, finish3c: !!o.finish3c,
      balls: [], turn: 0, scores: new Array(n).fill(0), innings: new Array(n).fill(0), runs: new Array(n).fill(0), high: new Array(n).fill(0), run: 0,
      groups: [null, null], ballInHand: false, kitchen: false, breakShot: mode === '8ball', shots: 0,
      phase: 'play', winner: -1, winTeam: -1, last: null, practice: !!o.practice,
    };
    rack(s);
    s.innings[0] = 1;
    return s;
  }
  // 공 놓기 (판 시작 배치)
  function rack(s) {
    const T = TABLES[s.table], L = T.L, W = T.W, R = T.R;
    if (s.mode === '3c') {
      s.balls = [{ x: L / 4, y: W / 2 - 0.1524, on: true }, { x: L / 4, y: W / 2, on: true }, { x: 3 * L / 4, y: W / 2, on: true }];
    } else if (s.mode === '4gu') {
      s.balls = [{ x: L / 4, y: W / 2 - 0.16, on: true }, { x: L * 0.885, y: W / 2, on: true }, { x: 3 * L / 4, y: W / 2, on: true }, { x: L / 4, y: W / 2, on: true }];
    } else {
      // 8볼 삼각 랙: 맨 앞 공 = 풋 스폿, 8번은 셋째 줄 가운데, 뒷줄 양 끝은 단색 하나·줄무늬 하나
      const balls = new Array(16);
      balls[0] = { x: L * 0.22, y: W / 2, on: true };
      const sol = [1, 2, 3, 4, 5, 6, 7], str = [9, 10, 11, 12, 13, 14, 15];
      const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rngNext(s) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      shuffle(sol); shuffle(str);
      const apex = sol.pop();
      const cs = sol.pop(), ct = str.pop();
      const rest = shuffle(sol.concat(str));
      const gap = 2 * R + 0.0004, dx = gap * Math.sqrt(3) / 2;
      const flip = rngNext(s) < 0.5;                      // 뒷줄 양 끝: 단색·줄무늬 하나씩 (어느 쪽인지는 무작위)
      let ri = 0;
      for (let row = 0; row < 5; row++) {
        for (let k = 0; k <= row; k++) {
          let id;
          if (row === 0) id = apex;
          else if (row === 2 && k === 1) id = 8;
          else if (row === 4 && k === 0) id = flip ? cs : ct;
          else if (row === 4 && k === 4) id = flip ? ct : cs;
          else id = rest[ri++];
          balls[id] = { x: 3 * L / 4 + row * dx, y: W / 2 + (k - row / 2) * gap, on: true };
        }
      }
      s.balls = balls;
      s.ballInHand = true; s.kitchen = true;
    }
  }

  // 누가 어느 수구를 치나 (캐롬: 짝수 자리 = 흰 공, 홀수 = 노란 공 / 포켓: 늘 0번)
  function cueOf(s, p) { return s.mode === '8ball' ? 0 : (p % 2); }
  function teamOf(s, p) { return p % 2; }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  // ── 프리볼 자리 확인
  function validPlace(s, x, y) {
    const T = TABLES[s.table], R = T.R;
    if (!(x >= R && x <= T.L - R && y >= R && y <= T.W - R)) return false;
    if (s.kitchen && x > T.L / 4) return false;
    for (let i = 1; i < s.balls.length; i++) { const b = s.balls[i]; if (b.on && Math.hypot(b.x - x, b.y - y) < 2 * R + 0.001) return false; }
    return true;
  }
  // 놓을 수 없는 자리면 가까운 빈자리
  function fixPlace(s, x, y) {
    const T = TABLES[s.table], R = T.R;
    const cx = v => Math.max(R, Math.min((s.kitchen ? T.L / 4 : T.L - R), v)), cy = v => Math.max(R, Math.min(T.W - R, v));
    x = cx(x); y = cy(y);
    if (validPlace(s, x, y)) return [x, y];
    for (let r = 0.01; r < 1.5; r += 0.01) {
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2, px = cx(x + Math.cos(a) * r), py = cy(y + Math.sin(a) * r);
        if (validPlace(s, px, py)) return [px, py];
      }
    }
    return [T.L / 5, T.W / 2];
  }
  // 빈자리 찾기 (공 다시 놓기용)
  function freeSpot(s, x, y, skip) {
    const R = TABLES[s.table].R;
    const ok = (px, py) => s.balls.every((b, i) => i === skip || !b.on || Math.hypot(b.x - px, b.y - py) >= 2 * R + 0.001);
    if (ok(x, y)) return [x, y];
    for (let d = 2 * R + 0.002; d < 1.2; d += 0.005) { if (ok(x + d, y)) return [x + d, y]; if (ok(x - d, y)) return [x - d, y]; }
    return [x, y];
  }

  // ── 사건 정리: 수구가 맞힌 공 순서, 쿠션 수
  function analyze(s, sim) {
    const cue = sim.cue, contacts = [], cushBefore = {};
    let cush = 0;
    const firstAt = {};
    sim.events.forEach((e, idx) => {
      if (e.k === 'c' && e.a === cue) cush++;
      if (e.k === 'b' && (e.a === cue || e.b === cue)) {
        const o = e.a === cue ? e.b : e.a;
        if (firstAt[o] == null) { firstAt[o] = idx; cushBefore[o] = cush; contacts.push(o); }
      }
    });
    const pocketed = sim.events.filter(e => e.k === 'p').map(e => e.a);
    // 첫 접촉 뒤에 어떤 공이든 쿠션에 닿았나 (8볼 반칙 판정)
    const fi = contacts.length ? firstAt[contacts[0]] : -1;
    const railAfter = fi >= 0 && sim.events.some((e, idx) => idx > fi && e.k === 'c');
    return { cue, contacts, cushBefore, cushions: cush, pocketed, firstAt, railAfter };
  }

  // ── 한 번 치기: 시뮬레이션 + 규칙 → 새 상태
  function applyShot(state, action, opt) {
    const s = clone(state);
    if (s.phase !== 'play') return { state: s, sim: null, result: { ok: false, msg: '판이 끝났어요' } };
    const fin = v => (Number.isFinite(+v) ? +v : 0);   // 손님이 보낸 값: 유한한 수만 (문자열 '1e999' 가 Infinity 가 돼 공이 NaN 이 되는 것을 막음)
    const act = { angle: fin(action.angle), power: Math.max(0.01, Math.min(1, fin(action.power))), spinX: fin(action.spinX), spinY: fin(action.spinY) };
    const cueId = cueOf(s, s.turn);
    if (s.ballInHand) {
      const pl = action.place || [s.balls[cueId].x, s.balls[cueId].y];
      act.place = fixPlace(s, pl[0], pl[1]);
      s.balls[cueId].x = act.place[0]; s.balls[cueId].y = act.place[1]; s.balls[cueId].on = true;
    }
    const sim = simulate(s, act, opt);
    const result = judgeSim(s, sim, act);
    return { state: s, sim, result };
  }
  // 시뮬레이션 결과(사건 목록 + 마지막 자리)에 규칙 적용 — s 를 바꿈 (시험에서 가짜 사건으로도 부름)
  function judgeSim(s, sim, act) {
    sim.final.forEach((b, i) => { s.balls[i].x = b.x; s.balls[i].y = b.y; s.balls[i].on = b.on; });
    const an = analyze(s, sim);
    const p = s.turn;
    let result;
    if (s.mode === '8ball') result = judge8(s, an, p);
    else result = judgeCarom(s, an, p);
    result.shooter = p;
    s.shots++;
    s.last = { action: act || null, result: { score: result.score, foul: !!result.foul, msg: result.msg, cont: result.cont }, shooter: p };
    return result;
  }

  function nextTurn(s) {
    s.run = 0;
    s.turn = (s.turn + 1) % s.n;
    s.innings[s.turn]++;
  }

  // 캐롬 (4구·3쿠션) 판정
  function judgeCarom(s, an, p) {
    const cue = an.cue, opp = 1 - cue;
    const r = { score: 0, foul: false, cont: false, msg: '', tags: [] };
    const hit = id => an.contacts.includes(id);
    if (s.mode === '4gu') {
      const hitOpp = hit(opp), reds = hit(2) && hit(3);
      let ok = reds && !hitOpp;
      const last = s.scores[p] + 1 >= needPoints(s);
      if (ok && s.finish3c && last) {
        const second = an.contacts.filter(c => c === 2 || c === 3)[1];
        if ((an.cushBefore[second] || 0) < 3) { ok = false; r.msg = '마무리는 쓰리쿠션으로 해야 해요'; r.tags.push('need3c'); }
      }
      if (hitOpp) {
        r.foul = true; r.msg = `${CAROM_NAMES[opp]}을 맞혔어요 · 감점`;
        if (!s.practice) s.scores[p] = Math.max(0, s.scores[p] - 1);
        r.score = -1;
      } else if (ok) {
        r.score = 1; r.msg = s.finish3c && last ? '쓰리쿠션 마무리!' : '빨간 공 둘 다 맞혔어요!';
        if (an.cushions >= 3) r.tags.push('cushion');
      } else if (!r.msg) {
        r.msg = an.contacts.length === 0 ? '아무 공도 못 맞혔어요' : (hit(2) || hit(3)) ? '빨간 공 하나만 맞았어요' : '아쉬워요';
      }
    } else {
      const first = an.contacts[0], second = an.contacts.find(c => c !== first && c !== cue);
      const both = an.contacts.length >= 2;
      const cb = both ? (an.cushBefore[second] || 0) : an.cushions;
      if (both && cb >= 3) { r.score = 1; r.msg = `${cb}쿠션 성공!`; }
      else if (both) r.msg = `쿠션 ${cb}번 뒤에 맞았어요 (3번 필요)`;
      else if (an.contacts.length === 1) r.msg = '두 번째 공을 못 맞혔어요';
      else r.msg = '아무 공도 못 맞혔어요';
      r.cushions = cb;
    }
    if (r.score > 0) {
      if (!s.practice) s.scores[p]++;
      s.run++; s.runs[p] = s.run; if (s.run > s.high[p]) s.high[p] = s.run;
      r.cont = true;
      if (!s.practice && s.scores[p] >= needPoints(s)) { s.phase = 'end'; s.winner = p; r.win = true; r.msg += ' · 승리!'; }
    } else if (s.practice) {
      s.run = 0;
    } else {
      nextTurn(s);
    }
    return r;
  }
  // 4구는 다마 수(30·50·…)를 10으로 나눈 만큼 득점해야 함
  function needPoints(s) { return s.mode === '4gu' ? Math.max(1, Math.round(s.target / 10)) : s.mode === '3c' ? s.target : 1; }

  // 8볼 판정 (간단 규칙)
  const isSolid = id => id >= 1 && id <= 7, isStripe = id => id >= 9 && id <= 15;
  const groupOf = id => isSolid(id) ? 'solid' : isStripe(id) ? 'stripe' : null;
  function remainingOf(s, g) { let c = 0; for (let i = 1; i < 16; i++) if (i !== 8 && s.balls[i].on && groupOf(i) === g) c++; return c; }
  function judge8(s, an, p) {
    const team = teamOf(s, p), r = { score: 0, foul: false, cont: false, msg: '', tags: [] };
    const myG = s.groups[team];
    const pocketed = an.pocketed, scratch = pocketed.includes(0);
    const objs = pocketed.filter(id => id !== 0 && id !== 8);
    const eight = pocketed.includes(8);
    const first = an.contacts[0];
    // 친 뒤 남은 공으로 '8번 차례였나' 계산 (방금 넣은 공 되돌려 셈)
    const onEightBefore = myG && (remainingOf(s, myG) + objs.filter(id => groupOf(id) === myG).length) === 0;
    const wasBreak = s.breakShot;
    s.breakShot = false; s.kitchen = false; s.ballInHand = false;
    if (wasBreak) {
      if (eight) { const [x, y] = freeSpot(s, TABLES[s.table].L * 3 / 4, TABLES[s.table].W / 2, 8); Object.assign(s.balls[8], { x, y, on: true }); r.msg = '브레이크에 8번 공 → 다시 놓아요. '; }
      if (scratch) { r.foul = true; r.msg += '브레이크 스크래치! 상대 프리볼'; }
      else if (objs.length) { r.cont = true; r.msg += `브레이크로 ${objs.length}개 넣었어요! 계속 쳐요 (아직 오픈 테이블)`; r.score = objs.length; }
      else r.msg += '브레이크 · 차례가 넘어가요';
    } else {
      let foul = '', rail = false;
      if (first == null) foul = '아무 공도 못 맞혔어요';
      else if (myG == null && first === 8) foul = '오픈 테이블에선 8번을 먼저 맞히면 안 돼요';
      else if (myG && !onEightBefore && groupOf(first) !== myG) foul = '내 공을 먼저 맞혀야 해요';
      else if (myG && onEightBefore && first !== 8) foul = '8번 공을 먼저 맞혀야 해요';
      if (!foul && first != null) {
        // 첫 접촉 뒤에 어떤 공이든 쿠션에 닿았거나 공이 들어갔나
        rail = pocketed.length > 0 || an.railAfter;
        if (!rail) foul = '맞힌 뒤 쿠션에 닿은 공이 없어요';
      }
      if (scratch) foul = '스크래치! 수구가 들어갔어요';
      if (eight) {
        if (onEightBefore && !foul) { s.phase = 'end'; s.winTeam = team; s.winner = p; r.win = true; r.msg = '8번 공 성공! 승리!'; r.score = 1; return r; }
        s.phase = 'end'; s.winTeam = 1 - team; s.winner = (p + 1) % s.n; r.lose = true; r.foul = !!foul;
        r.msg = onEightBefore ? `8번 공은 들어갔지만 반칙(${foul}) · 패배` : '8번 공을 너무 일찍 넣었어요 · 패배';
        return r;
      }
      if (foul) { r.foul = true; r.msg = foul + ' · 상대 프리볼'; }
      else {
        if (myG == null && objs.length) {
          const g = groupOf(objs[0]); s.groups[team] = g; s.groups[1 - team] = g === 'solid' ? 'stripe' : 'solid';
          r.msg = `${g === 'solid' ? '단색(1~7)' : '줄무늬(9~15)'} 공이 내 공이 됐어요!`; r.cont = true; r.score = objs.length; r.tags.push('group');
        } else if (myG) {
          const mine = objs.filter(id => groupOf(id) === myG).length;
          if (mine) { r.cont = true; r.score = mine; r.msg = mine > 1 ? `${mine}개 넣었어요!` : '넣었어요!'; }
          else r.msg = objs.length ? '상대 공만 들어갔어요' : '못 넣었어요';
        } else r.msg = '못 넣었어요';
      }
    }
    if (r.foul) {
      if (scratch || !s.balls[0].on) { const [x, y] = freeSpot(s, TABLES[s.table].L / 4, TABLES[s.table].W / 2, 0); Object.assign(s.balls[0], { x, y, on: true }); }
      if (!s.practice) { nextTurn(s); s.ballInHand = true; }
      else s.ballInHand = true;
    } else if (r.cont) {
      s.run++;
    } else if (!s.practice) nextTurn(s);
    if (!s.balls[0].on) { const [x, y] = freeSpot(s, TABLES[s.table].L / 4, TABLES[s.table].W / 2, 0); Object.assign(s.balls[0], { x, y, on: true }); s.ballInHand = true; }
    return r;
  }

  // ── 가이드: 수구가 처음 닿는 곳 (직선)
  function firstContact(s, angle, cueId) {
    const T = TABLES[s.table], R = T.R, gm = geom(s.table);
    cueId = cueId == null ? cueOf(s, s.turn) : cueId;
    const c = s.balls[cueId], dx = Math.cos(angle), dy = Math.sin(angle);
    let best = { t: 1e9, type: 'none' };
    s.balls.forEach((b, i) => {
      if (i === cueId || !b.on) return;
      const ox = b.x - c.x, oy = b.y - c.y, proj = ox * dx + oy * dy;
      if (proj <= 0) return;
      const perp2 = ox * ox + oy * oy - proj * proj, rr = 4 * R * R;
      if (perp2 >= rr) return;
      const t = proj - Math.sqrt(rr - perp2);
      if (t < best.t) best = { t, type: 'ball', ball: i, offset: (ox * dy - oy * dx) / (2 * R) };
    });
    for (const sg of gm.segs) {
      const vn = dx * sg.nx + dy * sg.ny; if (vn >= 0) continue;
      const d0 = (c.x - sg.ax) * sg.nx + (c.y - sg.ay) * sg.ny;
      const t = (d0 - R) / -vn; if (t < 0 || t >= best.t) continue;
      const px = c.x + dx * t - sg.ax, py = c.y + dy * t - sg.ay, u = px * sg.dx + py * sg.dy;
      if (u < -R || u > sg.len + R) continue;
      best = { t, type: 'rail', rail: sg.rail, nx: sg.nx, ny: sg.ny };
    }
    if (best.type === 'none') best.t = 0;
    best.x = c.x + dx * best.t; best.y = c.y + dy * best.t;
    return best;
  }

  // ── 강화학습용 관측 (RL.md 참고)
  const OBS_BALLS = 16, OBS_LEN = 3 * OBS_BALLS + 3 + 4 + 6;
  function obs(s, p) {
    p = p == null ? s.turn : p;
    const T = TABLES[s.table], o = new Float32Array(OBS_LEN);
    const cue = cueOf(s, p);
    // 수구를 늘 0번 칸에 (캐롬은 내 공·상대 공 순서를 바꿔 줌)
    const order = s.balls.map((_, i) => i);
    if (s.mode !== '8ball' && cue === 1) { order[0] = 1; order[1] = 0; }
    order.forEach((id, k) => { const b = s.balls[id]; o[3 * k] = b.on ? 1 : 0; o[3 * k + 1] = b.on ? b.x / T.L : 0; o[3 * k + 2] = b.on ? b.y / T.W : 0; });
    let q = 3 * OBS_BALLS;
    o[q + ['4gu', '3c', '8ball'].indexOf(s.mode)] = 1; q += 3;
    const need = needPoints(s);
    o[q++] = s.scores[p] / need; o[q++] = Math.max(...s.scores.filter((_, i) => i !== p).concat([0])) / need;
    o[q++] = s.ballInHand ? 1 : 0; o[q++] = s.kitchen ? 1 : 0;
    const g = s.groups[teamOf(s, p)];
    o[q++] = g === 'solid' ? 1 : 0; o[q++] = g === 'stripe' ? 1 : 0; o[q++] = g == null && s.mode === '8ball' ? 1 : 0;
    o[q++] = g ? remainingOf(s, g) / 7 : 0; o[q++] = s.breakShot ? 1 : 0; o[q++] = Math.min(1, s.run / 10);
    return o;
  }
  function reward(prev, next, p) {
    if (next.phase === 'end') return next.winner === p || (next.mode === '8ball' && next.winTeam === teamOf(next, p)) ? 1 : -1;
    if (next.mode === '8ball') return 0;
    return (next.scores[p] - prev.scores[p]) / needPoints(prev);
  }

  // ── 궤적 묶기 (전송용): 30프레임/초, mm 정수(Int16) → base64
  function b64enc(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
  }
  function b64dec(str) {
    if (typeof Buffer !== 'undefined') { const b = Buffer.from(str, 'base64'); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); }
    const s = atob(str), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u;
  }
  function packTraj(sim, fps) {
    fps = fps || 30;
    const step = Math.max(1, Math.round(sim.fps / fps)), n = sim.n, F = sim.frames;
    const idx = []; for (let i = 0; i < F.length; i += step) idx.push(i); if (idx[idx.length - 1] !== F.length - 1) idx.push(F.length - 1);
    const a = new Int16Array(idx.length * 2 * n);
    idx.forEach((fi, k) => { const f = F[fi]; for (let j = 0; j < 2 * n; j++) a[k * 2 * n + j] = isNaN(f[j]) ? -32768 : Math.round(f[j] * 1000); });
    return {
      fps: sim.fps / step, n, cue: sim.cue, data: b64enc(new Uint8Array(a.buffer)),
      ev: sim.events.map(e => [e.f, e.k, e.a, e.b, Math.round(e.v * 100) / 100]),
    };
  }
  function unpackTraj(pk) {
    const u8 = b64dec(pk.data), a = new Int16Array(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    const n = pk.n, nf = a.length / (2 * n), frames = [];
    for (let k = 0; k < nf; k++) { const f = new Float32Array(2 * n); for (let j = 0; j < 2 * n; j++) { const v = a[k * 2 * n + j]; f[j] = v === -32768 ? NaN : v / 1000; } frames.push(f); }
    const scale = pk.fps / FPS;
    return { frames, fps: pk.fps, n, cue: pk.cue, events: pk.ev.map(e => ({ f: Math.round(e[0] * scale), f60: e[0], k: e[1], a: e[2], b: e[3], v: e[4] })) };
  }

  // ── 해시 (결정성 시험용, FNV-1a)
  function hashFrames(sim) {
    let h = 0x811c9dc5;
    for (const f of sim.frames) for (let j = 0; j < f.length; j++) { const v = isNaN(f[j]) ? -1 : Math.round(f[j] * 1e6); h ^= v & 0xffff; h = Math.imul(h, 16777619); h ^= v >>> 16; h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  const API = {
    TABLES, PHYS, MODES, CAROM_NAMES, FPS, OBS_LEN, N_ACTION: 4,
    makeRng, rngNext, geom, create, rack, clone, cueOf, teamOf, simulate, applyShot, judgeSim, analyze: (s, sim) => analyze(s, sim),
    validPlace, fixPlace, firstContact, needPoints, groupOf, remainingOf, cueSpeed, clampSpin,
    obs, reward, packTraj, unpackTraj, hashFrames,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Billiards = API;
})(this);

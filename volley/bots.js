/* 냥냥 배구 — AI 고양이. 코어 함수(ballPhys·contact·shoot)만 써서 공을 미리 굴려 보고 움직임
   - 반응 지연: 공을 몇 틱 늦게 '보고', 그 뒤로는 물리대로 이어 그려 판단 (사람처럼 맞은 직후엔 잠깐 헛걸음)
   - 받기: 서 있을(또는 뛰어오를) 자리 후보마다 진짜 접촉 계산을 돌려 공이 어디에 떨어질지 보고 고름
   - 스매시: 점프 궤적을 틱마다 공 길과 맞춰 봐서 앞발에 먼저 닿는 계획만 씀, 상대 자리를 보고 내리꽂기/강타/살짝 넘기기
   - 다이빙: 달려서는 못 닿고 몸을 날리면 닿는 공만
   VolleyBots.create(tier, side, seed).act(state) → 입력 비트. 학습한 정책도 같은 모양(policy) */
(function (root) {
  'use strict';
  const V = root.Volley || (typeof require !== 'undefined' ? require('./core.js') : null);
  const C = V.C, IN = V.IN;

  // 단계별 성격: 반응 지연(틱)·자리 오차·스매시 의지·스매시 거리·휘두르기 타이밍(이르게 누르는 틱, 3 이하면 퍼펙트)·다이빙·자리 후보 간격·노림수·점프 받기
  //   react = 스매시 자리를 고를 때 '상대가 이만큼 늦게 반응한다'고 보는 틱 (작을수록 빠른 상대도 못 닿는 곳을 노림)
  const TIERS = {
    // 초급: 처음 하는 사람도 점수를 꽤 낼 만큼 느긋하게 (selftest 의 '초보 사람 흉내'로 맞춤)
    easy: { label: '초급', delay: 17, delayVar: 7, noise: 35, smash: 0.1, smashRange: 80, lead: 8, leadVar: 3, dive: 0.2, step: 16, aim: 0, react: 12, serveSmash: 0, home: 0, jumpBump: 0 },
    normal: { label: '중급', delay: 9, delayVar: 4, noise: 11, smash: 0.5, smashRange: 150, lead: 6, leadVar: 3, dive: 0.65, step: 8, aim: 0.5, react: 6, serveSmash: 0.3, home: 0, jumpBump: 0.5 },
    hard: { label: '고급', delay: 4, delayVar: 2, noise: 3, smash: 0.9, smashRange: 230, lead: 4, leadVar: 2, dive: 1, step: 4, aim: 1, react: 3, serveSmash: 0.6, home: 1, jumpBump: 1 },
  };

  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // 다이빙하면 몇 틱 뒤 얼마나 가 있나 (코어로 한 번 굴려 둠)
  const DIVE_DIST = (() => {
    const s = V.create({ server: 0 }, 1); s.phase = 'play'; s.phaseT = 0; s.ball.y = 9999;
    s.cats[0].x = 60; const x0 = s.cats[0].x, out = [0];
    V.step(s, IN.SMASH | IN.RIGHT, 0); out.push(s.cats[0].x - x0);
    for (let t = 0; t < C.DIVE_T + 2; t++) { V.step(s, IN.RIGHT, 0); out.push(s.cats[0].x - x0); }
    return out;
  })();
  const jumpY = j => C.JUMP_V * j - C.G_CAT * j * (j + 1) / 2;    // 점프를 누르고 있을 때 j 틱째 높이
  const jumpVy = j => C.JUMP_V - C.G_CAT * j;

  // 복식이면 opt = { cat: 고양이 번호(0~3), team: 같은 편 두 봇이 함께 쓰는 빈 객체 {} } — 누가 받을지 둘이 같은 답을 보게 함
  function create(tier, side, seed, opt) {
    const P = TIERS[tier] || TIERS.normal;
    opt = opt || {};
    const ci = opt.cat == null ? side : opt.cat, team = opt.team || {};
    const rnd = makeRng(seed == null ? 0xC0FFEE + ci * 7919 : seed);
    const f = side === 0 ? 1 : -1;
    const mine = x => side === 0 ? x < C.NET_X : x > C.NET_X;
    const lo = side === 0 ? C.CAT_HW : C.NET_X + C.NET_HW + C.CAT_HW, hi = side === 0 ? C.NET_X - C.NET_HW - C.CAT_HW : C.W - C.CAT_HW;
    const clampX = x => x < lo ? lo : x > hi ? hi : x;
    const bell = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
    const fwdBit = side === 0 ? IN.RIGHT : IN.LEFT, backBit = side === 0 ? IN.LEFT : IN.RIGHT;
    let hist = [], plan = null, delay = P.delay, noiseX = 0, homeOff = 0, mood = { smash: false, dive: false, serve: false };
    let lastPhase = '', prevOut = 0, moving = false;

    function reset() { hist = []; plan = null; lastPhase = ''; prevOut = 0; moving = false; }
    // 공이 새 길로 바뀔 때마다 이번 공을 어떻게 대할지 한 번만 정함 → 매 틱 흔들리지 않음
    function newTrajectory() {
      delay = Math.max(1, Math.round(P.delay + (rnd() - 0.5) * 2 * P.delayVar));
      noiseX = bell() * P.noise * (rnd() < 0.2 ? 1.8 : 1);
      mood.smash = rnd() < P.smash; mood.dive = rnd() < P.dive;
    }

    // 공 길 미리 보기 (hover 틱 동안은 서브 대기로 제자리). out[k] = k+1 틱 뒤
    function path(b0, hover, n) {
      const b = { x: b0.x, y: b0.y, vx: b0.vx, vy: b0.vy }, out = [];
      for (let k = 1; k <= n; k++) {
        if (k <= hover) { if (k === hover) b.vy = C.SERVE_TOSS; } else V.ballPhys(b, null);
        out.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy });
        if (b.y <= C.BALL_R) break;
      }
      return out;
    }
    // 자리 xc 에서 받으면 (a >= 0 이면 a 틱 기다렸다 점프해서) → { k: 닿는 틱, land: 떨어질 x, apex, t }
    function evalBump(b0, hover, xc, a) {
      const b = { x: b0.x, y: b0.y, vx: b0.vx, vy: b0.vy };
      const cat = { x: xc, y: 0, vx: 0, vy: 0, ground: true, swing: 0, swingCd: 0, dive: 0, diveDir: 0, rec: 0, noHit: 0, prevIn: 0 };
      for (let k = 1; k <= 200; k++) {
        if (k <= hover) { if (k === hover) b.vy = C.SERVE_TOSS; } else V.ballPhys(b, null);
        if (a >= 0 && k > a) {
          const j = k - a, y = jumpY(j);
          if (y > 0) { cat.y = y; cat.vy = jumpVy(j); cat.ground = false; } else { cat.y = 0; cat.vy = 0; cat.ground = true; }
        }
        if (V.contact(cat, side, b)) {
          const apex = b.y + (b.vy > 0 ? b.vy * b.vy / (2 * C.G_BALL) : 0);
          const L = V.predictLanding(b, 300);
          return { k, land: L.x, apex, t: L.t };
        }
        if (b.y <= C.BALL_R) return null;
      }
      return null;
    }
    // 점프해서 앞발 범위에 공이 먼저 들어오나 (몸에 먼저 닿으면 실패) → { k: 닿는 틱 번호(Pt 기준), j }
    function simJump(Pt, xc, a) {
      const pr = C.PAW_R + C.BALL_R - 5, br = C.CAT_R + C.BALL_R + 2;
      for (let j = 1; j <= 34; j++) {
        const k = a + j - 1; if (k >= Pt.length) return null;
        const cy = jumpY(j); if (cy < 0) return null;
        const p = Pt[k];
        const dx = p.x - (xc + f * C.PAW_DX), dy = p.y - (cy + C.PAW_DY);
        if (dx * dx + dy * dy < pr * pr) return { k, j };
        const sy = p.y < cy + C.CAT_R ? cy + C.CAT_R : p.y > cy + C.CAT_R + C.CAT_SEG ? cy + C.CAT_R + C.CAT_SEG : p.y;
        const ex = p.x - xc, ey = p.y - sy;
        if (ex * ex + ey * ey < br * br) return null;
      }
      return null;
    }
    // 스매시 결과 점수: 상대가 제때 닿기 어려운 곳일수록 높음
    //   여유 = 공이 떨어지는 틱 - (달려가는 틱 + 상대 반응 P.react) → 음수면 못 닿음. 0~2 점 + 조금의 변덕
    function shotScore(p, aim, ops, ht) {
      const b = { x: p.x, y: p.y, vx: 0, vy: 0 };
      const used = V.shoot(b, side, aim, false, ht);
      const L = V.predictLanding(b, 200);
      if (mine(L.x)) return -5;
      let margin = 1e9;                                               // 상대가 둘이면 가장 빨리 닿는 쪽 기준
      for (const op of ops) {
        const busy = op.dive + op.rec + (op.ground ? 0 : 5);
        const run = Math.max(0, Math.abs(L.x - op.x) - 44) / C.MOVE_V + 3 + busy;
        const mg = L.t - run - P.react; if (mg < margin) margin = mg;
      }
      const m = margin < -12 ? -12 : margin > 12 ? 12 : margin;
      return 1 - m / 12 + (used !== aim ? -0.3 : 0) + rnd() * 0.25;
    }

    function think(s, est, hover) {
      const me = s.cats[ci], two = s.team === 2, now = s.tick;
      const ops = two ? [s.cats[1 - side], s.cats[3 - side]] : [s.cats[1 - side]], op = ops[0];
      const Pt = path(est, hover, 260);
      const end = Pt[Pt.length - 1];
      let comes = mine(end.x);
      if (!comes) for (let k = 0; k < Pt.length; k++) if (mine(Pt[k].x) && Pt[k].y < 240) { comes = true; break; }
      const homeX = two ? homeFor(s) : V.homeX(side) + (P.home ? f * ((op.x - C.NET_X) * f < 90 ? -14 : 8) : 0);
      if (!comes || s.phase === 'point' || s.phase === 'over') return { kind: 'home', x: clampX(homeX + homeOff), made: now };
      if (two) {                                                      // 복식: 맡은 고양이만 공에 가고, 다른 하나는 빈 곳(앞이면 뒤, 뒤면 앞)을 지킴
        const tk = taker(s);
        if (tk.cat !== ci) {
          // 내 쪽 벽에서 잰 거리(u)로: 짝이 뒤에서 받으면 앞을, 앞에서 받으면 뒤를 지키되 짝 자리에서 90 이상 떨어져 (서로 길을 막지 않게)
          const mx = team.tgt && team.tgt.key === team.key ? team.tgt.x : s.cats[ci ^ 2].x;   // 짝이 가려는 자리 (아직 모르면 지금 자리)
          const u0 = side === 0 ? mx : C.W - mx, uMax = C.NET_X - C.NET_HW - C.CAT_HW;
          const fr = Math.max(C.D_FRONT, u0 + 90), bk = Math.min(C.D_BACK, u0 - 90);
          const myU = side === 0 ? me.x : C.W - me.x;                 // 짝을 가로질러 가지 않게: 내가 짝보다 앞이면 앞을, 뒤면 뒤를 먼저
          const frontFirst = Math.abs(myU - u0) < 30 ? u0 < 215 : myU > u0;
          let u = frontFirst ? (fr <= uMax ? fr : bk >= C.CAT_HW ? bk : uMax) : (bk >= C.CAT_HW ? bk : fr <= uMax ? fr : C.CAT_HW);
          return { kind: 'home', x: clampX((side === 0 ? u : C.W - u) + homeOff * 0.5), made: now, cover: true };
        }
      }
      const busy = me.rec + me.dive;
      const need = x => Math.abs(x - me.x) / C.MOVE_V + 2 + busy;
      // 터치 제한이 없어도 세 번 안에 넘기려 함 (머리로 공을 계속 튀기며 시간 끌지 않게)
      const used = s.lastSide === side ? s.touches[side] : 0;
      const touchesLeft = s.maxTouches > 0 ? s.maxTouches - used : Math.max(1, 3 - used);
      let best = null;
      const consider = c => { if (!best || c.score > best.score) best = c; };

      // (가) 스매시 (너무 빠른 공은 코어가 스매시로 안 받아 줌)
      const vin2 = (C.SMASH_VIN - 0.5) * (C.SMASH_VIN - 0.5), ht = V.heat(s);
      if ((mood.smash || (hover > 0 && mood.serve)) && me.ground && me.dive === 0 && me.rec === 0 && touchesLeft > 0) {
        for (let k = 3; k < Pt.length; k += 2) {
          const p = Pt[k];
          if (!mine(p.x) || p.y < 130 || p.y > 272 || p.vx * p.vx + p.vy * p.vy > vin2) continue;
          if ((C.NET_X - p.x) * f > P.smashRange) continue;
          const xc = clampX(p.x - f * 8);
          let bj = 0, be = 1e9;
          for (let j = 4; j <= 26; j++) { const e = Math.abs(jumpY(j) + C.PAW_DY + 28 - p.y); if (e < be) { be = e; bj = j; } }
          for (let da = -1; da <= 1; da++) {
            const a = k - bj + 1 + da;
            if (a < 0 || need(xc) > a + 6) continue;
            const r = simJump(Pt, xc, a);
            if (!r) continue;
            const q = Pt[r.k];
            if (q.vx * q.vx + q.vy * q.vy > vin2) continue;
            let aim = 'spike', as = -9;
            const aims = ['spike', 'drive', 'lob'];
            if (rnd() < P.aim) { for (const am of aims) { const v = shotScore(q, am, ops, ht); if (v > as) { as = v; aim = am; } } }
            else { aim = aims[Math.floor(rnd() * 3)]; as = shotScore(q, aim, ops, ht); }
            if (as < -1) continue;
            const contact = now + 1 + r.k, lead0 = Math.max(0, Math.round(P.lead + (rnd() - 0.5) * 2 * P.leadVar));
            const lead = hover > 0 || s.hits === 0 ? Math.min(lead0, 3) : lead0;   // 서브 토스는 맞는 때가 조금 늦어지기 쉬워 일찍 휘두르지 않음
            consider({ kind: 'smash', x: xc, score: 2 + as - 0.003 * r.k, aim, contact, jumpStep: now + 1 + a, swingStep: contact - lead, made: now, jumped: false, swung: false });
          }
        }
      }
      // (나) 몸으로 받기: 자리 후보마다 진짜 접촉을 돌려 봄
      const scoreBump = (r, xc, extra) => {
        let sc;
        let od = 1e9; for (const o of ops) { const d = Math.abs(r.land - o.x); if (d < od) od = d; }
        if (!mine(r.land)) sc = 1 + 0.5 * od / 320 + (r.t < 40 ? 0.15 : 0);
        else sc = touchesLeft > 1 ? 0.1 + (r.apex > 210 && (C.NET_X - r.land) * f < 140 ? 0.25 : 0) : -2;
        if (need(xc) > r.k + 1 - extra) sc -= 3;
        return sc - 0.0015 * Math.abs(xc - me.x) - extra * 0.004;
      };
      let kb = -1;
      for (let k = 0; k < Pt.length; k++) if (mine(Pt[k].x) && Pt[k].y < 128 && Pt[k].vy < 0) { kb = k; break; }
      if (kb < 0) for (let k = 0; k < Pt.length; k++) if (mine(Pt[k].x) && Pt[k].y < 200) { kb = k; break; }
      if (kb >= 0) {
        const bx = Pt[kb].x;
        for (let off = -66; off <= 66; off += P.step) {
          const xc = clampX(bx + off), r = evalBump(est, hover, xc, -1);
          if (r) consider({ kind: 'bump', x: xc, score: scoreBump(r, xc, 0), k: r.k, made: now });
        }
      }
      // (나-2) 점프해서 받기: 깊은 공·낮게 깔린 공을 높이 넘기기 (서 있는 받기로 못 넘길 때만)
      if (P.jumpBump && me.ground && me.rec === 0 && (!best || best.score < 1) && rnd() < P.jumpBump) {
        for (const h of [150, 185]) {
          let kh = -1;
          for (let k = 0; k < Pt.length; k++) if (mine(Pt[k].x) && Pt[k].vy < 0 && Pt[k].y < h) { kh = k; break; }
          if (kh < 0) continue;
          let bj = 0, be = 1e9;
          for (let j = 3; j <= 16; j++) { const e = Math.abs(jumpY(j) + 2 * C.CAT_R + C.CAT_SEG + C.BALL_R - Pt[kh].y); if (e < be) { be = e; bj = j; } }
          const a = kh - bj + 1;
          if (a < 0) continue;
          for (let off = -36; off <= 36; off += Math.max(6, P.step)) {
            const xc = clampX(Pt[kh].x + off), r = evalBump(est, hover, xc, a);
            if (r) consider({ kind: 'jbump', x: xc, score: scoreBump(r, xc, 4), jumpStep: now + 1 + a, made: now, jumped: false });
          }
        }
      }
      // (다) 다이빙: 달려서 못 닿으면
      if ((!best || best.score < 0) && mood.dive && mine(end.x) && touchesLeft > 0) consider({ kind: 'dive', x: end.x, land: now + Pt.length, score: 0, made: now });
      if (!best) best = { kind: 'chase', x: clampX(end.x - f * 12), score: -1, made: now };
      best.x = clampX(best.x + (best.kind === 'smash' || best.kind === 'jbump' ? noiseX * 0.35 : noiseX));
      if (two) team.tgt = { key: team.key, x: best.x };              // 짝이 비켜 설 수 있게 내가 갈 자리를 알려 둠
      return best;
    }

    // 목표 자리로: 가까우면 멈추고, 미끄러질 거리를 보고 미리 손을 뗌. 조금 지나쳤으면 되돌아가지 않고 그냥 섬 (덜덜 떨지 않게)
    function steer(me, x, dead) {
      const dx = x - me.x, stop = me.vx * me.vx / (2 * (me.ground ? C.DEC : C.ACC_AIR)) + 1;
      if (moving ? Math.abs(dx) < 2.5 : Math.abs(dx) < dead) { moving = false; return 0; }
      if (me.vx * dx < 0 && Math.abs(dx) < dead + 6 && Math.abs(me.vx) > 0.5) return 0;
      moving = true;
      if (dx > 0) return me.vx > 0 && dx < stop ? 0 : IN.RIGHT;
      return me.vx < 0 && -dx < stop ? 0 : IN.LEFT;
    }

    // 복식 자리: 그물에 더 가까운 쪽이 앞, 다른 쪽이 뒤 (같은 자리면 번호 큰 쪽이 앞)
    //   한 번 정하면 공이 그물을 넘을 때까지 그대로 (team 객체로 같이 봄 → 둘이 같은 자리로 몰리며 오락가락하지 않음)
    function homeFor(s) {
      const key = s.stats.rallies + ":" + s.crosses + ":" + (s.phase === "ready" ? "r" : "p");
      if (team.rk !== key || team.rside !== side) {
        const me = s.cats[ci], mate = s.cats[ci ^ 2], d = (me.x - mate.x) * f;
        team.front = s.phase === "ready" && s.rot ? side + 2 * (1 - s.rot[side]) : d > 0 || (d === 0 && ci >= 2) ? ci : ci ^ 2;
        team.rk = key; team.rside = side;
      }
      return V.homeX2(side, team.front === ci);
    }
    // 복식: 이번 공(랠리·접촉·넘김이 같은 동안)은 누가 받나 — 같은 편 봇이 team 객체로 한 번만 정해 같이 씀
    //   진짜 공 길에서 처음 받을 높이로 내려오는 곳까지 가까운 쪽 (방금 친 고양이는 다음 터치를 짝에게 미룸 · 몸 날린 뒤엔 늦음)
    const takeKey = s => s.stats.rallies + ':' + s.hits + ':' + s.crosses + ':' + (s.phase === 'ready' ? 'r' : 'p');
    function taker(s) {
      const key = takeKey(s);
      if (team.key === key && team.side === side) return team.pick;
      let x0;
      if (s.phase === 'ready') x0 = s.ball.x;
      else {
        const b = { x: s.ball.x, y: s.ball.y, vx: s.ball.vx, vy: s.ball.vy };
        x0 = null;
        for (let t = 0; t < 220; t++) { V.ballPhys(b, null); if (mine(b.x) && b.vy < 0 && b.y < 150) { x0 = b.x; break; } if (b.y <= C.BALL_R) break; }
        if (x0 == null) x0 = b.x;
      }
      let best = -1, bc = 1e9;
      for (const k of [side, side + 2]) {
        const c = s.cats[k];
        let cost = Math.abs(x0 - c.x) + (c.dive + c.rec) * C.MOVE_V;
        if (s.phase === 'ready') cost = s.serveCat === k ? 0 : 999;
        else if (s.lastSide === side && s.lastCat === k) cost += 70;
        if (cost < bc) { bc = cost; best = k; }
      }
      team.key = key; team.side = side; team.pick = { cat: best, x: x0 };
      return team.pick;
    }

    function act(s) {
      const me = s.cats[ci], b = s.ball;
      hist.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, phase: s.phase });
      if (hist.length > 40) hist.shift();
      if (s.phase !== lastPhase) {                                     // 새 점수·서브: 처음부터
        if (s.phase === 'ready') { hist = [hist[hist.length - 1]]; mood.serve = (s.team === 2 ? s.serveCat === ci : s.server === side) && rnd() < P.serveSmash; homeOff = bell() * P.noise * 0.4; }
        lastPhase = s.phase; newTrajectory(); plan = null;
      }
      if (s.phase === 'over') { prevOut = 0; return 0; }
      // 늦게 본 공 → 물리대로 지금까지 이어 그림
      const di = Math.max(0, hist.length - 1 - delay), seen = hist[di];
      let changed = false;
      if (di > 0) {
        const pv = hist[di - 1], q = { x: pv.x, y: pv.y, vx: pv.vx, vy: pv.vy };
        if (pv.phase !== 'ready') V.ballPhys(q, null);
        if (Math.abs(q.vx - seen.vx) > 0.05 || Math.abs(q.vy - seen.vy) > 0.05 || Math.abs(q.x - seen.x) > 0.5) changed = true;
      }
      if (changed) newTrajectory();
      const ready = s.phase === 'ready';
      let est = seen, hover = 0;
      if (ready) { est = b; hover = s.phaseT; }
      else if (s.hits === 0 && s.phase === 'play') est = b;            // 서브 토스는 누구나 뻔히 보임 (늦게 본 것처럼 잘못 짐작하지 않게)
      else { const q = { x: seen.x, y: seen.y, vx: seen.vx, vy: seen.vy }; for (let k = 0; k < hist.length - 1 - di; k++) V.ballPhys(q, null); est = q; }
      const locked = plan && (plan.kind === 'smash' || plan.kind === 'jbump') && plan.jumped;
      let stale = !plan || changed || ((plan.kind === 'home' || plan.kind === 'bump' || plan.kind === 'chase') && s.tick - plan.made >= (plan.cover ? 5 : 12)) || (s.team === 2 && plan.kind === 'dive' && s.tick + 1 > plan.land + 4);
      // 복식: 짝이 '내 공!' 하고 맡았으면 늦게 봤어도 바로 비켜 줌 (둘이 같은 공으로 달려가 겹치지 않게)
      if (s.team === 2 && plan && !locked && plan.kind !== 'home' && team.key === takeKey(s) && team.side === side && team.pick.cat !== ci) stale = true;
      if (stale && !(locked && !changed)) plan = think(s, est, hover);

      let out = 0;
      const t1 = s.tick + 1;
      if (plan.kind === 'smash' || plan.kind === 'jbump') {
        if (!plan.jumped && me.ground && t1 >= plan.jumpStep) { out |= IN.JUMP; plan.jumped = true; }
        else if (plan.jumped && me.vy > 0) out |= IN.JUMP;            // 끝까지 높이
        if (plan.kind === 'smash' && (!me.ground || out & IN.JUMP) && !plan.swung && t1 >= plan.swingStep && !(prevOut & IN.SMASH)) { out |= IN.SMASH; plan.swung = true; }
        if (plan.kind === 'smash' && plan.swung && t1 <= plan.contact + 3) out |= plan.aim === 'drive' ? fwdBit : plan.aim === 'lob' ? backBit : 0;
        else out |= steer(me, plan.x, 3);
        if (plan.jumped && me.ground && !(out & IN.JUMP) && t1 > plan.jumpStep + 3) plan = { kind: 'home', x: clampX(s.team === 2 ? homeFor(s) : V.homeX(side)), made: s.tick };
      } else if (plan.kind === 'dive') {
        const left = plan.land - t1, dist = Math.abs(plan.x - me.x) - 40;
        const run = dist / C.MOVE_V + 2;
        if (me.ground && me.rec === 0 && me.dive === 0 && run > left - 1 && dist > 0) {
          let tr = 99;                                                  // 몸을 날려 그만큼 가는 데 걸리는 틱
          for (let t = 1; t < DIVE_DIST.length; t++) if (DIVE_DIST[t] >= dist) { tr = t; break; }
          if (tr >= left - 2 && tr <= left + 2 && !(prevOut & IN.SMASH)) out |= IN.SMASH | (plan.x > me.x ? IN.RIGHT : IN.LEFT);
          else out |= steer(me, plan.x, 3);
        } else out |= steer(me, plan.x, 3);
      } else {
        out |= steer(me, plan.x, plan.kind === 'home' ? 10 : 4);
      }
      prevOut = out;
      return out;
    }
    return { tier, side, cat: ci, act, reset, P, get plan() { return plan; } };
  }

  // ── 나중에 학습한 정책을 끼우는 자리: 작은 MLP(JSON) → 관찰 18개 → 행동 12개 중 가장 큰 것
  //    brain = { layers: [{ W: [[...]], b: [...], act: 'tanh'|'relu'|'linear' }, ...] }
  function logits(brain, x) {
    let h = x;
    for (const L of brain.layers) {
      const y = new Float32Array(L.b.length);
      for (let i = 0; i < L.b.length; i++) {
        let sum = L.b[i]; const w = L.W[i];
        for (let j = 0; j < h.length; j++) sum += w[j] * h[j];
        y[i] = L.act === 'tanh' ? Math.tanh(sum) : L.act === 'relu' ? (sum > 0 ? sum : 0) : sum;
      }
      h = y;
    }
    return h;
  }
  function policy(brain, side) {
    const buf = new Float32Array(V.OBS_N);
    return {
      tier: 'policy', side, reset() {},
      act(s) {
        const h = logits(brain, V.obs(s, side, buf));
        let a = 0; for (let i = 1; i < h.length; i++) if (h[i] > h[a]) a = i;
        return V.actionToInput(a, side);
      },
    };
  }

  const API = { TIERS, create, policy, logits, DIVE_DIST };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VolleyBots = API;
})(this);

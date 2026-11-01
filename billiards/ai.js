/* 당구 AI — 시뮬레이터로 여러 샷을 미리 쳐 보고 가장 좋은 걸 고름 (ai.js)
   · 🐣 초급: 조금만 찾아보고 손이 많이 떨림  · 🐱 중급: 넓게 찾고 조금 떨림  · 🐯 고급: 아주 넓게 찾고 다듬은 뒤 거의 정확
   · coach(state) = 'AI 선생님' 추천 샷 + 설명 재료 (두께·쿠션 순서·회전·성공률)
   · UMD: 브라우저 window.BilliardsAI, Node require('./ai.js') */
(function (root) {
  'use strict';
  const B = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.Billiards;
  const TAU = Math.PI * 2;

  const TIERS = {
    easy: { em: '🐣', name: '초급', noise: { a: 0.9, p: 0.08, s: 0.15 }, offs: [-0.55, -0.25, 0, 0.25, 0.55], pows: [0.38, 0.56], spins: [[0, 0.2]], bank: 0, refine: 0 },
    normal: { em: '🐱', name: '중급', noise: { a: 0.28, p: 0.03, s: 0.06 }, robust: 3, offs: [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8], pows: [0.34, 0.48, 0.62, 0.78], spins: [[0, 0.3], [0.6, 0.2], [-0.6, 0.2]], bank: 24, refine: 24 },
    hard: { em: '🐯', name: '고급', noise: { a: 0.08, p: 0.01, s: 0.02 }, robust: 6, offs: [-0.88, -0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88], pows: [0.32, 0.46, 0.6, 0.76], spins: [[0, 0.3], [0.7, 0.25], [-0.7, 0.25], [0.5, -0.4], [-0.5, -0.4]], bank: 40, refine: 60 },
  };

  function bell(rng) { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = a => ((a % TAU) + TAU) % TAU;

  // 손떨림 (실력 단계별)
  function jitter(act, tier, rng) {
    const n = (TIERS[tier] || TIERS.normal).noise;
    const out = Object.assign({}, act);
    out.angle = norm(act.angle + bell(rng) * n.a * Math.PI / 180);
    out.power = clamp(act.power * (1 + bell(rng) * n.p), 0.05, 1);
    out.spinX = clamp(act.spinX + bell(rng) * n.s, -1, 1);
    out.spinY = clamp(act.spinY + bell(rng) * n.s, -1, 1);
    return out;
  }

  // 수구 → 목적구를 '두께 f' 로 맞히는 각도 (f: 0 정면, +1 목적구 왼쪽을 스치듯)
  function aimAt(cx, cy, ox, oy, f, R) {
    const dx = ox - cx, dy = oy - cy, d = Math.hypot(dx, dy);
    const th = Math.atan2(dy, dx), k = clamp(f * 2 * R / d, -0.999, 0.999);
    return norm(th + Math.asin(k));
  }

  // ── 캐롬: 결과를 점수로 (성공 1, 실패는 얼마나 가까웠나 0~0.9, 4구 파울 -1)
  function scoreCarom(s, act, cueId, full) {
    const T = B.TABLES[s.table], R = T.R;
    const opp = 1 - cueId, objs = s.mode === '4gu' ? [2, 3] : [opp, 2];
    const contacts = [], cushAt = []; let cush = 0, foul = false, done = false, failAt = -1;
    const sim = B.simulate(s, Object.assign({ cue: cueId }, act), {
      maxTime: full ? 30 : 12,
      stop(ev) {
        if (ev.k === 'c' && ev.a === cueId) { cush++; cushAt.push(ev.f); }
        if (ev.k === 'b' && (ev.a === cueId || ev.b === cueId)) {
          const o = ev.a === cueId ? ev.b : ev.a;
          if (s.mode === '4gu' && o === opp) { foul = true; return true; }
          if (!contacts.includes(o)) {
            contacts.push(o);
            if (contacts.length === 2) {
              if (s.mode === '3c' && cush < 3) { failAt = ev.f; return true; }
              done = true; return !full;
            }
          }
        }
        return false;
      },
    });
    const ok = done && !foul;
    if (foul) return { v: -1, sim, contacts, cush, ok: false, foul: true };
    if (ok) return { v: 1 - act.power * 0.04 - Math.abs(act.spinX) * 0.01, sim, contacts, cush, ok: true };
    // 가까움: 첫 공을 맞힌 뒤(3쿠션은 3쿠션 뒤) 남은 공에 수구가 얼마나 가까이 갔나
    const F = sim.frames;
    let v = 0;
    if (contacts.length >= 1) {
      const need = objs.find(o => o !== contacts[0]);
      let from = 0;
      const fe = sim.events.find(e => e.k === 'b' && (e.a === cueId || e.b === cueId)); if (fe) from = fe.f;
      if (s.mode === '3c' && cushAt.length >= 3) from = Math.max(from, cushAt[2]);
      else if (s.mode === '3c') from = F.length;                 // 3쿠션을 못 채움
      const end = failAt >= 0 ? failAt : F.length;
      let md = 9;
      for (let i = from; i < end && i < F.length; i += 2) { const f = F[i]; const d = Math.hypot(f[2 * cueId] - f[2 * need], f[2 * cueId + 1] - f[2 * need + 1]); if (d < md) md = d; }
      const close = clamp(1 - (md - 2 * R) / 0.6, 0, 1);
      v = (s.mode === '3c' ? 0.35 + 0.1 * Math.min(cush, 3) / 3 : 0.4) + 0.4 * close;
      if (failAt >= 0) v = 0.3;
    } else {
      let md = 9;
      for (let i = 0; i < F.length; i += 3) for (const o of objs) { const f = F[i]; const d = Math.hypot(f[2 * cueId] - f[2 * o], f[2 * cueId + 1] - f[2 * o + 1]); if (d < md) md = d; }
      v = 0.15 * clamp(1 - md / 1.0, 0, 1);
    }
    return { v, sim, contacts, cush, ok: false };
  }

  // ── 포켓볼: 결과를 점수로
  function score8(s, act) {
    const r = B.applyShot(s, act, { maxTime: 20 });
    const ns = r.state, p = s.turn, team = B.teamOf(s, p);
    let v = 0;
    if (ns.phase === 'end') v = ns.winTeam === team ? 100 : -100;
    else if (r.result.foul) v = -20;
    else if (r.result.cont) {
      v = 10 * r.result.score;
      // 다음 샷이 쉬운가: 내 공 중 수구에서 바로 포켓 각이 나오는 공 수
      v += 2 * easyShots(ns);
      if (s.breakShot) v += 5;
    } else {
      v = -2;
      // 상대에게 쉬운 공을 남기면 감점 (안전하게)
      v -= 1.2 * easyShots(ns);
    }
    return { v, r, ok: !!r.result.cont && !r.result.foul };
  }
  // 수구에서 가로막힘 없이 넣기 쉬운 (공·포켓) 수
  function easyShots(s) {
    if (s.mode !== '8ball' || s.phase !== 'play') return 0;
    const T = B.TABLES[s.table], gm = B.geom(s.table), R = T.R, c = s.balls[0];
    const team = B.teamOf(s, s.turn), g = s.groups[team];
    const targets = [];
    for (let i = 1; i < 16; i++) { if (!s.balls[i].on) continue; if (g == null ? i !== 8 : (B.remainingOf(s, g) === 0 ? i === 8 : B.groupOf(i) === g)) targets.push(i); }
    let cnt = 0;
    for (const i of targets) {
      const b = s.balls[i];
      for (const pk of gm.pockets) {
        const px = pk.x, py = pk.y, dx = px - b.x, dy = py - b.y, d = Math.hypot(dx, dy);
        const gx = b.x - dx / d * 2 * R, gy = b.y - dy / d * 2 * R;
        const ax = gx - c.x, ay = gy - c.y, ad = Math.hypot(ax, ay);
        const cos = (ax * dx + ay * dy) / (ad * d);
        if (cos < 0.45) continue;                                  // 컷 63° 넘으면 어려움
        if (!clear(s, c.x, c.y, gx, gy, [0, i]) || !clear(s, b.x, b.y, px, py, [0, i])) continue;
        cnt++; break;
      }
    }
    return Math.min(cnt, 4);
  }
  function clear(s, x1, y1, x2, y2, skip) {
    const R = B.TABLES[s.table].R, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    for (let i = 0; i < s.balls.length; i++) {
      if (skip.includes(i) || !s.balls[i].on) continue;
      const b = s.balls[i], t = ((b.x - x1) * dx + (b.y - y1) * dy) / (L * L);
      if (t <= 0 || t >= 1) continue;
      const px = x1 + dx * t - b.x, py = y1 + dy * t - b.y;
      if (px * px + py * py < 4 * R * R) return false;
    }
    return true;
  }

  // ── 후보 샷 목록
  function caromCands(s, tier, cueId) {
    const T = B.TABLES[s.table], R = T.R, cfg = TIERS[tier] || TIERS.normal;
    const c = s.balls[cueId], opp = 1 - cueId, objs = s.mode === '4gu' ? [2, 3] : [opp, 2];
    const out = [];
    for (const o of objs) {
      const b = s.balls[o];
      for (const f of cfg.offs) for (const p of cfg.pows) for (const [sx, sy] of cfg.spins) {
        // 3쿠션: 얇게 + 같은 쪽 회전이 기본 (돌리기). 반대 조합도 조금
        const sxx = s.mode === '3c' && f !== 0 ? Math.sign(f) * sx : sx;
        out.push({ angle: aimAt(c.x, c.y, b.x, b.y, f, R), power: p, spinX: sxx, spinY: sy });
      }
    }
    // 쿠션 먼저 (가라치기·대회전 같은 샷)
    for (let k = 0; k < cfg.bank; k++) {
      const a = (k + 0.5) / cfg.bank * TAU;
      for (const p of [0.5, 0.7]) out.push({ angle: a, power: p, spinX: (k % 2 ? 0.5 : -0.5), spinY: 0.2 });
    }
    return out;
  }
  function poolCands(s, tier) {
    const T = B.TABLES[s.table], gm = B.geom(s.table), R = T.R, cfg = TIERS[tier] || TIERS.normal;
    const out = [];
    if (s.breakShot) {
      const ys = [T.W / 2, T.W / 2 + 0.2, T.W / 2 - 0.2];
      for (const y of ys) {
        const px = T.L * 0.2, apex = s.balls.reduce((m, b, i) => (i && b.on && b.x < m.x ? b : m), { x: 9, y: 0 });
        const a = Math.atan2(apex.y - y, apex.x - px);
        out.push({ angle: a, power: 1, spinX: 0, spinY: -0.1, place: [px, y] });
        out.push({ angle: a + 0.004, power: 0.95, spinX: 0, spinY: 0, place: [px, y] });
      }
      return out;
    }
    const team = B.teamOf(s, s.turn), g = s.groups[team];
    const targets = [];
    for (let i = 1; i < 16; i++) { if (!s.balls[i].on) continue; if (g == null ? i !== 8 : (B.remainingOf(s, g) === 0 ? i === 8 : B.groupOf(i) === g)) targets.push(i); }
    const pows = tier === 'easy' ? [0.35, 0.55] : tier === 'normal' ? [0.3, 0.45, 0.65] : [0.26, 0.38, 0.52, 0.7];
    const spins = tier === 'easy' ? [[0, 0]] : tier === 'normal' ? [[0, 0], [0, -0.45], [0, 0.45]] : [[0, 0], [0, -0.5], [0, 0.5], [0.4, 0], [-0.4, 0]];
    for (const i of targets) {
      const b = s.balls[i];
      gm.pockets.forEach(pk => {
        const dx = pk.x - b.x, dy = pk.y - b.y, d = Math.hypot(dx, dy);
        const gx = b.x - dx / d * 2 * R, gy = b.y - dy / d * 2 * R;
        let cx = s.balls[0].x, cy = s.balls[0].y, place = null;
        if (s.ballInHand) {
          // 프리볼: 고스트볼 뒤 일직선에 수구를 둠
          for (const back of [0.25, 0.4, 0.15]) {
            const px = gx - dx / d * back, py = gy - dy / d * back;
            if (B.validPlace(s, px, py)) { place = [px, py]; break; }
          }
          if (!place) return;
          cx = place[0]; cy = place[1];
        }
        const ax = gx - cx, ay = gy - cy, ad = Math.hypot(ax, ay);
        if ((ax * dx + ay * dy) / (ad * d) < 0.2) return;           // 너무 얇은 컷
        const a = Math.atan2(ay, ax);
        for (const p of pows) for (const [sx, sy] of spins) out.push({ angle: norm(a), power: p, spinX: sx, spinY: sy, place });
      });
    }
    if (!out.length || tier !== 'easy') {
      // 넣을 각이 없으면: 내 공을 그냥 맞히는 안전한 샷들
      const c = s.ballInHand ? B.fixPlace(s, T.L / 4, T.W / 2) : [s.balls[0].x, s.balls[0].y];
      for (const i of targets) for (const f of [-0.5, 0, 0.5]) {
        out.push({ angle: aimAt(c[0], c[1], s.balls[i].x, s.balls[i].y, f, R), power: 0.4, spinX: 0, spinY: 0, place: s.ballInHand ? c : null });
      }
    }
    return out;
  }

  // ── 찾기 (조각조각 돌릴 수 있게 상태 기계로)
  function makeSearch(s, tier, opt) {
    opt = opt || {};
    const pool = s.mode === '8ball', cueId = B.cueOf(s, s.turn), cfg = TIERS[tier] || TIERS.normal;
    const rng = B.makeRng((opt.seed == null ? (s.seed ^ (s.shots * 7919)) : opt.seed) | 0);
    let cands = pool ? poolCands(s, tier) : caromCands(s, tier, cueId);
    const scored = [];
    let i = 0, phase = 0;
    const evalOne = a => pool ? score8(s, a) : scoreCarom(s, a, cueId, false);
    return {
      step(budgetMs) {
        const t0 = Date.now();
        while (Date.now() - t0 < budgetMs) {
          if (phase === 0) {
            if (i >= cands.length) {
              phase = 1; i = 0;
              scored.sort((a, b) => b.v - a.v);
              // 다듬기: 잘 된 후보 근처를 조금씩 바꿔 봄
              const top = scored.slice(0, 6), more = [];
              const nRef = pool ? Math.round(cfg.refine / 3) : cfg.refine;
              for (let k = 0; k < nRef && top.length; k++) {
                const t = top[k % top.length].a;
                more.push({ angle: norm(t.angle + bell(rng) * 0.6 * Math.PI / 180), power: clamp(t.power + bell(rng) * 0.06, 0.08, 1), spinX: clamp(t.spinX + bell(rng) * 0.2, -1, 1), spinY: clamp(t.spinY + bell(rng) * 0.15, -1, 1), place: t.place });
              }
              cands = more;
              continue;
            }
            const a = cands[i++]; const r = evalOne(a); scored.push({ a, v: r.v, ok: r.ok });
          } else if (phase === 1) {
            if (i >= cands.length) { phase = 2; continue; }
            const a = cands[i++]; const r = evalOne(a); scored.push({ a, v: r.v, ok: r.ok });
          } else return true;
        }
        return phase === 2;
      },
      best() {
        scored.sort((a, b) => b.v - a.v);
        if (!pool) {
          // 끝까지 다시 쳐서 확인 (중간에 멈춘 계산이라 끝 파울을 놓칠 수 있음)
          for (const c of scored.slice(0, 5)) { if (!c.ok) break; const full = scoreCarom(s, c.a, cueId, true); if (full.ok) return c; c.v = full.v; }
          scored.sort((a, b) => b.v - a.v);
        }
        // 튼튼한 샷 고르기: 잘 된 후보 몇 개를 내 손떨림으로 여러 번 쳐 보고 평균이 높은 것
        const nr = cfg.robust || 0;
        if (nr && !opt.exact && scored.length) {
          const top = scored.filter(c => c.ok).slice(0, pool ? 4 : 6);
          if (top.length > 1) {
            for (const c of top) {
              let sum = 0;
              for (let k = 0; k < nr; k++) { const a = jitter(c.a, tier, rng); if (c.a.place) a.place = c.a.place; sum += pool ? score8(s, a).v : scoreCarom(s, a, cueId, true).v; }
              c.rv = sum / nr;
            }
            top.sort((a, b) => b.rv - a.rv);
            return top[0];
          }
        }
        return scored[0] || { a: { angle: 0, power: 0.4, spinX: 0, spinY: 0 }, v: 0 };
      },
      get count() { return scored.length; },
      rng,
    };
  }

  function finalize(s, tier, best, rng, opt) {
    let a = Object.assign({}, best.a);
    if (a.place == null) delete a.place;
    if (!(opt && opt.exact)) a = jitter(a, tier, rng);
    return a;
  }
  // 바로 고르기 (Node 시험·RL)
  function choose(s, tier, opt) {
    const S = makeSearch(s, tier, opt);
    while (!S.step(1e9)) { /* 끝까지 */ }
    return finalize(s, tier, S.best(), S.rng, opt);
  }
  // 화면용: 조금씩 계산 (화면이 멈추지 않게)
  function chooseAsync(s, tier, opt) {
    return new Promise(res => {
      const S = makeSearch(s, tier, opt);
      const tick = () => { if (S.step(12)) res(finalize(s, tier, S.best(), S.rng, opt)); else setTimeout(tick, 0); };
      setTimeout(tick, 0);
    });
  }

  // ── AI 선생님: 고급으로 찾고 설명 재료 + 성공률 (중급 손떨림으로 10번)
  function coachAsync(s, opt) {
    return new Promise(res => {
      const S = makeSearch(s, 'hard', Object.assign({ seed: 777 + s.shots }, opt));
      const tick = () => {
        if (!S.step(12)) { setTimeout(tick, 0); return; }
        const best = S.best();
        res(explain(s, best.a, S.rng));
      };
      setTimeout(tick, 0);
    });
  }
  function coach(s, opt) {
    const S = makeSearch(s, 'hard', Object.assign({ seed: 777 + s.shots }, opt));
    while (!S.step(1e9)) { /* 끝까지 */ }
    return explain(s, S.best().a, S.rng);
  }
  function explain(s, act, rng, noRate) {
    const pool = s.mode === '8ball', T = B.TABLES[s.table], R = T.R;
    act = Object.assign({}, act); if (act.place == null) delete act.place;
    const r = B.applyShot(s, act);
    const an = B.analyze(s, r.sim);
    const cueId = an.cue;
    const c = act.place ? { x: act.place[0], y: act.place[1] } : s.balls[cueId];
    const out = { action: act, mode: s.mode, ok: !!(r.result.score > 0 || r.result.cont) && !r.result.foul, msg: r.result.msg };
    // 친 뒤 공 자리 (👉 '성공하면 다음 공도 가까이 남는 길' 읽기용) · 포켓볼은 다음 차례에 쉬운 공 수 (내가 계속이면 내 것, 넘기면 상대 것)
    out.end = r.state.balls.map(b => ({ x: Math.round(b.x * 1000) / 1000, y: Math.round(b.y * 1000) / 1000, on: !!b.on }));
    if (pool && r.state.phase === 'play') out.easyNext = easyShots(r.state);
    const first = an.contacts[0];
    if (first != null) {
      const fc = B.firstContact(Object.assign({}, s, { balls: s.balls.map((b, i) => i === cueId ? Object.assign({}, b, { x: c.x, y: c.y }) : b) }), act.angle, cueId);
      out.firstBall = first;
      if (fc.type === 'ball') { out.thick = 1 - Math.min(1, Math.abs(fc.offset)); out.side = fc.offset > 0 ? 'left' : 'right'; }
      else out.bankFirst = true;
    }
    // 수구가 닿은 쿠션 순서 (두 번째 공 전까지)
    const rails = [];
    const second = an.contacts[1], secAt = second != null ? an.firstAt[second] : 1e9;
    r.sim.events.forEach((e, idx) => { if (e.k === 'c' && e.a === cueId && idx < secAt) rails.push(e.b); });
    out.rails = rails; out.second = second;
    out.pocketed = an.pocketed.filter(x => x !== 0);
    if (pool) {
      const pe = r.sim.events.find(e => e.k === 'p' && e.a !== 0);
      if (pe) { out.ball = pe.a; out.pocket = pe.b; }
    }
    if (noRate) return out;
    // 성공률: 중급 정도 손떨림으로 10번 쳐 봄
    let succ = 0; const N = 10;
    for (let k = 0; k < N; k++) {
      const a = jitter(act, 'normal', rng);
      if (pool) { const q = B.applyShot(s, a, { maxTime: 20 }); if ((q.result.cont || q.state.winTeam === B.teamOf(s, s.turn)) && !q.result.foul) succ++; }
      else if (scoreCarom(s, a, cueId, true).ok) succ++;
    }
    out.rate = Math.round(succ / N * 100);
    return out;
  }

  // 복기용: 실제로 친 샷 설명 (두께·쿠션 순서·회전, 성공률은 안 셈)
  const describe = (s, act) => explain(s, act, null, true);
  // 샷 하나가 성공했나 (캐롬: 득점 / 포켓볼: 계속 치기·8번 승리, 반칙 아님) + 가까움 v (캐롬 0~1)
  function shotOk(s, act) {
    if (s.mode === '8ball') {
      const q = B.applyShot(s, act, { maxTime: 20, record: false });
      const ok = (!!q.result.cont && !q.result.foul) || (q.state.phase === 'end' && q.state.winTeam === B.teamOf(s, s.turn));
      return { ok, v: ok ? 1 : 0, foul: !!q.result.foul };
    }
    const r = scoreCarom(s, act, B.cueOf(s, s.turn), true);
    return { ok: r.ok, v: clamp(r.v, 0, 1), foul: !!r.foul };
  }

  // ── AI 선생님 읽기 (11-01 베니 님: '어디 두라'고만 하니 뭔 말인지 모르겠고 재미없음) ───────────────────────
  //   shotRec = 친 샷을 읽기용 기록으로 · flowRead = 👀 상대 흐름 + 📊 내 흐름 · whyShot = 👉 추천 샷의 까닭
  //   화면 없이 글만 만듦(시험은 selftest). 다시 시뮬레이션하지 않고 이미 나온 사건·점수·공 자리만 읽어서 가벼움.
  const CNAMES = B.CAROM_NAMES;
  const railGap = (T, b) => Math.min(b.x, T.L - b.x, b.y, T.W - b.y) - T.R;          // 공 겉면과 가장 가까운 쿠션 사이
  const stripFree = m => String(m || '').replace(/[\s·]*상대 프리볼$/, '');
  const gname = g => g === 'solid' ? '단색(1~7)' : '줄무늬(9~15)';

  // 친 샷 하나를 읽기용 기록으로 — 사건(events)만 봄. before = 치기 전 · after = 친 뒤 상태
  function shotRec(before, after, result, events, cue) {
    const r = result || {};
    let first = null, second = null, bank = false, cush = 0;
    const rails = [], pk = [];
    for (const e of events || []) {
      if (e.k === 'c' && e.a === cue) {
        if (second == null) { cush++; rails.push(e.b); }
        if (first == null) bank = true;                               // 공보다 쿠션을 먼저 쳤음
      } else if (e.k === 'b' && (e.a === cue || e.b === cue)) {
        const o = e.a === cue ? e.b : e.a;
        if (first == null) first = o; else if (second == null && o !== first) second = o;
      } else if (e.k === 'p' && e.a !== cue) pk.push(e.a);
    }
    return {
      p: before.turn, n: after.shots, cue, first, second, bank, cush, rails, pk, run: after.run, sc: after.scores.slice(),
      res: { score: r.score || 0, foul: !!r.foul, cont: !!r.cont, win: !!r.win, lose: !!r.lose, msg: r.msg || '', cushions: r.cushions, tags: r.tags || [] },
    };
  }

  // 지금 내 차례 자리가 어떤지 (상대가 남긴 자리) — hard 2 아주 어려움 · 1 어려움 · -1 쉬움 · 0 모름
  function leaveCarom(s, rate) {
    const T = B.TABLES[s.table], R = T.R, cue = B.cueOf(s, s.turn), opp = 1 - cue, c = s.balls[cue];
    const objs = (s.mode === '4gu' ? [2, 3] : [opp, 2]).filter(i => s.balls[i] && s.balls[i].on);
    if (railGap(T, c) < 0.6 * R) return { hard: 2, text: '내 공이 쿠션에 붙었어요 (어려운 자리)' };
    if (railGap(T, c) < 2.5 * R) return { hard: 1, text: '내 공이 쿠션 가까이 있어요' };
    for (const i of objs) if (Math.hypot(s.balls[i].x - c.x, s.balls[i].y - c.y) < 3.2 * R) return { hard: 1, text: '내 공과 목표 공이 바싹 붙었어요 (두께 맞추기 어려운 자리)' };
    if (objs.some(i => railGap(T, s.balls[i]) < 0.6 * R)) return { hard: 1, text: '목표 공이 쿠션에 붙어 있어요' };
    if (rate != null && rate <= 30) return { hard: 1, text: `어려운 자리 (최선 성공률 약 ${rate}%)` };
    if (rate != null && rate >= 70) return { hard: -1, text: `쉬운 자리 (성공률 약 ${rate}%)` };
    return { hard: 0, text: '' };
  }
  function leave8(s) {
    if (s.ballInHand) return '프리볼이라 수구를 원하는 곳에 놓을 수 있어요';
    const n = easyShots(s);
    return n === 0 ? '넣기 쉬운 공이 없어요 (어려운 자리)' : n === 1 ? '넣기 쉬운 공이 1개 있어요' : `넣기 쉬운 공이 ${n}개 열려 있어요`;
  }

  // 👀 상대 흐름 + 📊 내 흐름 — s: 지금(내 차례) 상태 · hist: shotRec 모음 · o: { names, kind: ai|hot|online|practice, rate, pr }
  function flowRead(s, hist, o) {
    o = o || {};
    const out = { opp: '', race: '' };
    if (!s || s.phase !== 'play') return out;
    const cur = s.turn, names = o.names || [], kind = o.kind || 'ai', rate = typeof o.rate === 'number' ? o.rate : null;
    const nm = i => names[i] || `선수 ${i + 1}`;
    const lab = n => /[0-9]$/.test(n) ? n + ':' : n;                        // '친구 2' + 점수 0 → '친구 2: 0' (안 헷갈리게)
    const you = kind === 'hot' ? nm(cur) : '나';                         // 한 기기 여럿은 이름 그대로
    const pool = s.mode === '8ball', d4 = s.mode === '4gu', mul = d4 ? 10 : 1, unit = d4 ? '다마' : '점';
    // 기록은 지금 판의 마지막 샷에서 거꾸로 이어지는 것만 (옛 기록 · 빠진 샷은 거기서 끊음) → 같은 사람이 이어 친 묶음(= 한 차례)으로
    const seq = []; let exp = s.shots;
    for (let i = (hist || []).length - 1; i >= 0; i--) { const h = hist[i]; if (!h || h.n !== exp) break; seq.unshift(h); exp--; }
    const runs = [];
    for (const h of seq) { const l = runs[runs.length - 1]; if (l && l.p === h.p) l.shots.push(h); else runs.push({ p: h.p, shots: [h] }); }
    const lastRun = runs[runs.length - 1];
    const cont = !!lastRun && lastRun.p === cur;                            // 내가 득점해서 이어 치는 중
    const gainOf = run => run.shots.reduce((a, h) => a + h.res.score, 0);
    let prevMine = null;
    if (!cont) for (let i = runs.length - 1; i >= 0; i--) if (runs[i].p === cur) { prevMine = runs[i]; break; }

    // ── 혼자 연습: 상대가 없으니 방금 내 샷 + 성공/시도
    if (kind === 'practice') {
      if (lastRun) {
        const h = lastRun.shots[lastRun.shots.length - 1], good = h.res.score > 0 || h.res.cont;
        out.opp = `방금 내 샷 — ${good ? '성공!' : h.res.foul ? '반칙' : '실패'}${h.res.msg ? ` (${stripFree(h.res.msg)})` : ''}`;
      }
      const pr = o.pr || { tries: seq.length, ok: seq.filter(h => h.res.score > 0 || h.res.cont).length, run: 0, best: 0 };
      out.race = `연습 ${pr.ok}/${pr.tries} 성공 · 지금 ${pr.run}연속 (최고 ${pr.best})`;
      return out;
    }

    // ── 👀 상대가 방금 한 일 (내 차례가 끝난 뒤 이어서 친 샷들)
    if (lastRun && !cont) {
      const run = lastRun, who = nm(run.p), last = run.shots[run.shots.length - 1];
      if (!pool) {
        const okShots = run.shots.filter(h => h.res.score > 0), pts = okShots.length;
        const best = okShots.reduce((m, h) => (!m || h.cush > m.cush ? h : m), null);
        const lead = pts === 0 ? '' : pts === 1 ? `${s.mode === '3c' && best ? `${best.bank ? '빈쿠션 먼저 ' : ''}${best.cush}쿠션으로 ` : ''}1점 내고 ` : `${pts}번 연속 득점 후 `;
        const lv = leaveCarom(s, rate);
        if (last.res.foul) {
          const mineBall = (1 - last.cue) === B.cueOf(s, cur);
          out.opp = `${who} ${lead}감점 — ${mineBall ? '내 공을 건드렸어요' : `${CNAMES[1 - last.cue]}을 건드렸어요`}${lv.text ? ` → ${lv.text}` : ''}`;
        } else out.opp = `${who} ${lead}실패 — ${lv.text || last.res.msg || '득점하지 못했어요'}`;
      } else {
        const potted = run.shots.reduce((a, h) => a + Math.max(0, h.res.score), 0);
        const myG = s.groups[B.teamOf(s, cur)], newGroup = run.shots.some(h => (h.res.tags || []).includes('group'));
        out.opp = `${who} ${potted > 0 ? `${potted}개 넣은 뒤 ` : ''}${last.res.foul ? `반칙 — ${stripFree(last.res.msg) || '규칙을 어겼어요'}` : '못 넣고 차례 넘김'}`
          + `${newGroup && myG ? ` · 이제 내 공은 ${gname(myG)}` : ''} → ${leave8(s)}`;
      }
    }

    // ── 📊 내 흐름
    if (!pool) {
      const sc = s.scores, head = sc.map((v, i) => `${lab(i === cur ? you : nm(i))} ${v * mul}`).join(' / ') + ` (목표 ${s.target}${unit})`;
      let diff;
      if (sc.length === 2) { const d = (sc[cur] - sc[1 - cur]) * mul; diff = d > 0 ? `${d}${unit} 앞서요` : d < 0 ? `${-d}${unit} 뒤져요` : '동점'; }
      else { const top = Math.max(...sc.filter((_, i) => i !== cur)), d = (sc[cur] - top) * mul; diff = d > 0 ? '내가 1등' : d === 0 ? '공동 1등' : `1등과 ${-d}${unit} 차`; }
      let tail = '';
      if (cont) tail = s.run >= 2 ? `${s.run}연속 득점 중!` : '방금 득점해 계속 쳐요';
      else if (prevMine) { const g = gainOf(prevMine) * mul; tail = g > 0 ? `지난 차례 +${g}${unit}` : g < 0 ? `지난 차례 ${g}${unit}(감점)` : `지난 차례 0${unit}`; }
      out.race = `${head} · ${diff}${tail ? `, ${tail}` : ''}`;
    } else {
      const myG = s.groups[B.teamOf(s, cur)], oppG = myG ? (myG === 'solid' ? 'stripe' : 'solid') : null;
      let base;
      if (!myG) base = '오픈 테이블 — 처음 넣은 공 종류가 내 공이 돼요';
      else { const a = B.remainingOf(s, myG), b = B.remainingOf(s, oppG); base = `내 ${gname(myG)} ${a ? `${a}개 남음` : '다 넣었어요 — 8번만 남음'} · 상대 ${b}개 남음`; }
      let tail = '';
      if (cont) tail = s.run >= 2 ? `${s.run}연속으로 넣는 중!` : '방금 넣어 계속 쳐요';
      else if (prevMine) { const g = gainOf(prevMine); tail = g > 0 ? `지난 차례 +${g}개` : '지난 차례 0개'; }
      out.race = base + (tail ? ` · ${tail}` : '');
    }
    return out;
  }

  // 👉 추천 샷의 까닭 — 지금 자리 → 그래서 이 길 → (성공하면 / 회전) 한 줄
  //   공 이름은 말하지 않음 (어느 공인지는 💡 줄이 이미 말함) — 여기선 '왜 그 길인지'만
  function whyShot(s, r) {
    if (!r || !r.action) return '';
    return s.mode === '8ball' ? why8(s, r) : whyCarom(s, r);
  }
  function spinWhy(a) {
    if (a.spinY >= 0.3) return '밀어치기로 수구가 첫 공을 따라가요';
    if (a.spinY <= -0.3) return '끌어치기로 수구가 되돌아와요';
    if (Math.abs(a.spinX) >= 0.3) return '옆회전으로 쿠션 각을 맞춰요';
    return '';
  }
  function whyCarom(s, r) {
    if (!r.ok) return '확실한 득점 길이 안 보여요 → 가장 가까이 가는 샷이에요';
    const T = B.TABLES[s.table], R = T.R, cueId = B.cueOf(s, s.turn), c = s.balls[cueId], a = r.action;
    const first = r.firstBall != null ? s.balls[r.firstBall] : null, rails = r.rails || [], nr = rails.length;
    // 1) 지금 자리
    let sit = '';
    if (railGap(T, c) < 0.6 * R) sit = '수구가 쿠션에 붙어 바로 치기 어려워요';
    else if (railGap(T, c) < 2.5 * R) sit = '수구가 쿠션 가까이 있어 치기 까다로워요';
    else if (first && railGap(T, first) < 0.6 * R) sit = '첫 공이 쿠션에 붙어 있어요';
    // 2) 그래서 이 길
    let how;
    if (r.bankFirst) how = `${(rails[0] === 1 || rails[0] === 3) ? '짧은' : '긴'} 쿠션을 먼저 쳐서 돌아가요`;
    else how = nr ? `쿠션 ${nr}번 돌려 ${s.mode === '3c' ? '두 번째 공까지' : '나머지 빨간 공까지'} 가요` : '곧바로 두 공을 이어 맞히는 가장 쉬운 길이에요';
    // 3) 성공하면 다음 공이 가까이 남는지 / 회전 이야기
    let extra = '';
    if (r.end) {
      const e = r.end, ec = e[cueId], objs = (s.mode === '4gu' ? [2, 3] : [1 - cueId, 2]).filter(i => e[i] && e[i].on);
      if (ec && ec.on && railGap(T, ec) >= 2.5 * R && objs.length) {
        const dmin = Math.min(...objs.map(i => Math.hypot(e[i].x - ec.x, e[i].y - ec.y)));
        if (dmin < 0.6) extra = '성공하면 다음 공도 가까이 남아요';
      }
    }
    if (!extra) extra = spinWhy(a);
    return `${sit ? `${sit} → ` : ''}${how}${extra ? `, ${extra}` : ''}`;
  }
  function why8(s, r) {
    const a = r.action, free = s.ballInHand && a.place && !s.breakShot;
    if (s.breakShot) return '브레이크 — 힘껏 쳐서 공을 넓게 흩어 놓아요';
    const cut = r.thick != null ? Math.round(Math.asin(clamp(1 - r.thick, 0, 1)) * 180 / Math.PI) : null;
    let how;
    if (r.ball != null && r.ok) {
      how = cut == null ? '가장 넣기 쉬운 공이에요'
        : cut <= 20 ? `거의 정면으로 들어가는 쉬운 길 (컷 약 ${cut}°)`
          : cut <= 45 ? `무난한 각으로 넣는 길 (컷 약 ${cut}°)`
            : `컷이 약 ${cut}°로 큰 편이지만 가장 넣을 만한 길`;
    } else {
      how = `넣을 공이 마땅치 않아 → ${s.groups[B.teamOf(s, s.turn)] ? '내 공' : '공'}을 맞히고 쿠션에 보내 상대가 치기 어렵게 해요${r.easyNext != null ? ` (상대에게 쉬운 공 ${r.easyNext}개)` : ''}`;
    }
    let extra = '';
    if (r.ball != null && r.ok && r.easyNext > 0) extra = `성공하면 다음 공도 쉬운 자리가 ${r.easyNext}개 열려요`;
    else if (a.spinY < -0.2) extra = '끌어치기로 수구를 세워 다음 공 자리를 잡아요';
    else if (a.spinY > 0.2) extra = '밀어치기로 수구가 따라 나가요';
    return `${free && r.ball != null && r.ok ? '프리볼이라 수구를 그 공 뒤 일직선에 놓고, ' : ''}${how}${extra ? `, ${extra}` : ''}`;
  }

  const API = { TIERS, choose, chooseAsync, coach, coachAsync, jitter, aimAt, scoreCarom, easyShots, describe, shotOk, shotRec, flowRead, whyShot };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BilliardsAI = API;
})(this);

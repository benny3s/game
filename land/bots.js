/* 땅따먹기 — 컴퓨터 친구 (규칙 AI). Land 규칙 API 로 상태만 읽고 행동(0 그대로 · 1 왼쪽 · 2 오른쪽)을 돌려줌
   · 집(내 땅)에서: 앞·왼쪽·오른쪽으로 나갈 곳과 네모 고리 크기를 점수로 골라 나감
   · 밖에서: 나가기 → 옆으로 → 집으로 (곧게 가는 길 우선). 남의 머리가 내 선에 닿을 만큼 가까우면 바로 집으로
   · 사냥: 남의 선이 그 사람이 집에 가기 전에 닿을 거리면 끊으러 감
   · 초급 = 작은 고리·늦은 눈치·가끔 실수 / 중급 = 보통 / 고급 = 땅 계산·남의 땅 뺏기·적극 사냥·머리 박기 피하기
   · 봐주기(gentle): create(..., { gentle: [사람 번호] }) 로 알려 준 사람의 선은 초급이 피해 가고(끊지 않음) 중급은 덜 노림
   나중에 학습한 AI 는 policy(brain) 으로 같은 자리(조종 칸)에 끼우면 됨 */
(function (root) {
  'use strict';
  const L = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.Land;
  const DX = L.DX, DY = L.DY;

  const TIERS = {
    // vsGentle: 봐줄 사람(초보 사람)의 선을 만났을 때 — cut 은 그 칸 점수(보통 남의 선 +70), huntP 는 그 사람을 사냥하러 갈 확률
    easy:   { vsGentle: { cut: -300, huntP: 0 }, a: [3, 6],  b: [3, 7],  margin: -1, react: 0.45, huntR: 4,  huntP: 0.2,  wobble: 0.045, steal: 1.0, headOn: 0.3, pocket: 0.8, pick: 'rand', wander: 0.12, risk: 0 },
    normal: { vsGentle: { cut: 40, huntP: 0.4 }, a: [4, 9],  b: [4, 11], margin: 1,  react: 0.9,  huntR: 9,  huntP: 0.55, wobble: 0.008, steal: 1.3, headOn: 0.85, pocket: 1, pick: 'soft', wander: 0.03, risk: 0.3 },
    hard:   { a: [4, 15], b: [5, 19], margin: 2,  react: 1,    huntR: 16, huntP: 1,    wobble: 0,     steal: 1.8, headOn: 1,   pocket: 1, pick: 'best', wander: 0,    risk: 0.55 },
  };

  // 봇마다 따로 쓰는 난수 (상태의 난수는 건드리지 않음)
  function rnd(m) {
    let t = (m.rng = (m.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const between = (m, r) => r[0] + Math.floor(rnd(m) * (r[1] - r[0] + 1));

  // ── 작업용 배열 (모든 봇이 같이 씀)
  let WS = null;
  function ws(st) {
    const N = st.W * st.H;
    if (!WS || WS.N < N) WS = { N, mark: new Uint32Array(N), dist: new Int32Array(N), first: new Int8Array(N), q: new Int32Array(N), stamp: 0, cst: null, ct: -1, home: [], pm: null, pe: null };
    return WS;
  }
  function stamp(w) { if (++w.stamp >= 0xFFFFFFF0) { w.mark.fill(0); w.stamp = 1; } return w.stamp; }

  // start 칸에서 내 땅까지 가장 짧은 길 (내 선은 못 지나감). pref 방향을 먼저 넓혀서 같은 길이면 그쪽으로 곧게 가는 길을 고름
  // 돌려줌: [거리, 첫 방향] · 못 가면 [-1, -1]
  function bfsHome(st, pid, start, pref) {
    const w = ws(st), W = st.W, H = st.H, owner = st.owner, trail = st.trail, k = pid + 1, s = stamp(w);
    if (owner[start] === k) return [0, -1];
    const mark = w.mark, dist = w.dist, first = w.first, q = w.q;
    const order = [pref, (pref + 1) & 3, (pref + 3) & 3, (pref + 2) & 3];
    let qh = 0, qt = 0;
    mark[start] = s; dist[start] = 0; first[start] = -1; q[qt++] = start;
    while (qh < qt) {
      const c = q[qh++], x = c % W, y = (c - x) / W, d = dist[c];
      for (let i = 0; i < 4; i++) {
        const dir = order[i], nx = x + DX[dir], ny = y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = ny * W + nx;
        if (mark[nc] === s || trail[nc] === k) continue;
        mark[nc] = s; dist[nc] = d + 1; first[nc] = c === start ? dir : first[c];
        if (owner[nc] === k) return [d + 1, first[nc]];
        q[qt++] = nc;
      }
    }
    return [-1, -1];
  }

  // 머리에서 maxD 칸 안을 모두 넓혀 봄 (사냥용). 돌려줌: 방문한 칸 수 (w.q[0..n) · w.dist · w.first 에 결과)
  function bfsScan(st, pid, start, pref, maxD) {
    const w = ws(st), W = st.W, H = st.H, trail = st.trail, k = pid + 1, s = stamp(w);
    const mark = w.mark, dist = w.dist, first = w.first, q = w.q;
    const order = [pref, (pref + 1) & 3, (pref + 3) & 3, (pref + 2) & 3];
    let qh = 0, qt = 0;
    mark[start] = s; dist[start] = 0; first[start] = -1; q[qt++] = start;
    while (qh < qt) {
      const c = q[qh++], x = c % W, y = (c - x) / W, d = dist[c];
      if (d >= maxD) continue;
      if (c !== start && trail[c] && trail[c] !== k) continue;      // 남의 선 칸에 닿으면 거기서 끝 (밟는 순간 끊김)
      for (let i = 0; i < 4; i++) {
        const dir = order[i], nx = x + DX[dir], ny = y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = ny * W + nx;
        if (mark[nc] === s || trail[nc] === k) continue;
        if (c === start && dir === ((pref + 2) & 3)) continue;      // 첫 걸음에 뒤로는 못 감
        mark[nc] = s; dist[nc] = d + 1; first[nc] = c === start ? dir : first[c];
        q[qt++] = nc;
      }
    }
    return qt;
  }

  // 다른 사람이 지금 집에 가는 데 걸리는 칸 수 (틱마다 한 번만 계산해서 같이 씀)
  function homeDist(st, pid) {
    const w = ws(st);
    if (w.cst !== st || w.ct !== st.tick) { w.cst = st; w.ct = st.tick; w.home = []; }
    if (w.home[pid] === undefined) {
      const p = st.players[pid];
      w.home[pid] = p.alive && p.trail.length ? bfsHome(st, pid, p.y * st.W + p.x, p.dir)[0] : 0;
    }
    return w.home[pid];
  }

  // 내 선(머리 포함)에 가장 빨리 닿을 수 있는 다른 머리까지의 거리 (맨해튼, 등 돌린 상대는 +2)
  function threat(st, p, hard) {
    const W = st.W, tr = p.trail;
    let best = 999;
    for (const q of st.players) {
      if (q === p || !q.alive) continue;
      for (let i = tr.length - 1; i >= 0; i--) {
        const c = tr[i], x = c % W, y = (c - x) / W;
        let d = Math.abs(q.x - x) + Math.abs(q.y - y);
        if (!hard && d > 1 && (x - q.x) * DX[q.dir] + (y - q.y) * DY[q.dir] < 0) d += 2;
        if (d < best) best = d;
      }
    }
    return best;
  }

  // 내 땅 · 남의 땅 칸 수 누적 합 (네모 안 칸 수를 바로 셈)
  function prefix(st, k) {
    const W = st.W, H = st.H, owner = st.owner, w = ws(st), S = W + 1, need = S * (H + 1);
    if (!w.pm || w.pm.length < need) { w.pm = new Int32Array(need); w.pe = new Int32Array(need); }
    const pm = w.pm, pe = w.pe;
    for (let y = 0; y < H; y++) {
      let rm = 0, re = 0;
      for (let x = 0; x < W; x++) {
        const o = owner[y * W + x];
        if (o === k) rm++; else if (o) re++;
        pm[(y + 1) * S + x + 1] = pm[y * S + x + 1] + rm;
        pe[(y + 1) * S + x + 1] = pe[y * S + x + 1] + re;
      }
    }
    return S;
  }
  const rectSum = (P, S, x0, y0, x1, y1) => P[(y1 + 1) * S + x1 + 1] - P[y0 * S + x1 + 1] - P[(y1 + 1) * S + x0] + P[y0 * S + x0];

  // 집에서 나갈 계획 고르기: 앞·왼쪽·오른쪽 × 고리 방향 × 크기 후보 → (얻는 땅 / 걸리는 틱) × 안전도
  function choosePlan(st, p, m, T) {
    const W = st.W, H = st.H, owner = st.owner, k = p.id + 1;
    const S = prefix(st, k), pm = ws(st).pm, pe = ws(st).pe;
    const foes = st.players.filter(q => q !== p && q.alive);
    let best = null, bs = -1;
    const cands = [];
    for (const d of [p.dir, (p.dir + 3) & 3, (p.dir + 1) & 3]) {
      // 그 방향으로 내 땅 안을 걸어가다 처음 나가는 칸 바로 앞 = E
      let x = p.x, y = p.y, steps = 0, ok = true;
      for (;;) {
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) { ok = false; break; }
        if (owner[ny * W + nx] !== k) break;
        x = nx; y = ny;
        if (++steps > 80) { ok = false; break; }
      }
      if (!ok) continue;
      // 벽까지 남은 칸 (고리가 판 밖으로 나가지 않게)
      const room = dir => dir === 0 ? y : dir === 1 ? W - 1 - x : dir === 2 ? H - 1 - y : x;
      const roomD = room(d) - 1;
      if (roomD < 2) continue;
      for (const side of [1, 3]) {
        const sd = (d + side) & 3, roomS = room(sd) - 1;
        if (roomS < 2) continue;
        const tries = T.pick === 'best' ? 7 : 3;
        for (let t = 0; t < tries; t++) {
          const a = Math.max(2, Math.min(roomD, Math.round(between(m, T.a) * m.pers.size)));
          const b = Math.max(2, Math.min(roomS, Math.round(between(m, T.b) * m.pers.size)));
          // 고리가 둘러쌀 네모: E에서 d로 1..a, sd로 0..b
          const ax = x + DX[d], ay = y + DY[d], bx = x + DX[d] * a + DX[sd] * b, by = y + DY[d] * a + DY[sd] * b;
          const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
          const total = (x1 - x0 + 1) * (y1 - y0 + 1);
          const mine = rectSum(pm, S, x0, y0, x1, y1), foe = rectSum(pe, S, x0, y0, x1, y1);
          const gain = total - mine - foe + foe * T.steal * m.pers.greed;
          if (gain < 3) continue;
          const cost = steps + 2 * a + b + 2;
          // 안전도: 가장 가까운 남의 머리가 네모에서 얼마나 먼가 (고리 둘레와 비교)
          let safe = 1;
          if (T.risk > 0) {
            let de = 999;
            for (const q of foes) { const dx = Math.max(x0 - q.x, 0, q.x - x1), dy = Math.max(y0 - q.y, 0, q.y - y1); de = Math.min(de, dx + dy); }
            const need = (a + b) * T.risk + 2;
            safe = de >= need ? 1 : Math.max(0.05, de / need) ** 2;
          }
          const sc = gain / cost * safe;
          cands.push({ d, sd, a, b, sc });
        }
      }
    }
    if (!cands.length) return null;
    if (T.pick === 'rand') best = cands[Math.floor(rnd(m) * cands.length)];
    else for (const c of cands) { const s = T.pick === 'soft' ? c.sc * (0.65 + rnd(m) * 0.7) : c.sc; if (s > bs) { bs = s; best = c; } }
    return { d: best.d, sd: best.sd, a: best.a, b: best.b };
  }

  // 사냥: 남이 집에 닿기 전에 내가 먼저 닿을 수 있는 남의 선 칸 → 그쪽 첫 방향 (없으면 -1)
  function tryHunt(st, p, m, T) {
    if (p.trail.length > 14) return -1;
    const eh = [];
    let any = false;
    for (const q of st.players) if (q !== p && q.alive && q.trail.length) { eh[q.id] = homeDist(st, q.id); any = true; }
    if (!any) return -1;
    const W = st.W, trail = st.trail, w = ws(st);
    const n = bfsScan(st, p.id, p.y * W + p.x, p.dir, Math.round(T.huntR * m.pers.aggro));
    let bestC = -1, bd = 999, who = -1;
    for (let i = 1; i < n; i++) {
      const c = w.q[i], t = trail[c];
      if (!t || t === p.id + 1) continue;
      const e = t - 1, d = w.dist[c], lim = eh[e];
      if (T.vsGentle && T.vsGentle.huntP <= 0 && m.gentle.indexOf(e) >= 0) continue;   // 봐주는 사람은 아예 안 노림
      if (lim === undefined || lim < 0) continue;
      if (d <= lim - (T.pick === 'best' ? 0 : 1) && d < bd) { bd = d; bestC = c; who = e; }
    }
    if (bestC < 0) return -1;
    // 같은 상대는 잠깐 동안 한 번만 결정 (매 틱 주사위를 다시 굴리면 결국 다 쫓아가니까)
    const memo = m.hunts[who];
    const hp = T.vsGentle && m.gentle.indexOf(who) >= 0 ? T.vsGentle.huntP : T.huntP;
    if (!memo || st.tick - memo.t > 24) m.hunts[who] = { t: st.tick, go: rnd(m) < hp };
    if (!m.hunts[who].go) return -1;
    m.huntT = st.tick;
    return w.first[bestC];
  }

  // 밖에 있을 때 계획대로: 나가기(a) → 옆으로(b) → 집으로
  function legDir(st, p, m) {
    const pl = m.plan, W = st.W, ex = p.exit % W, ey = (p.exit - ex) / W;
    const pd = (p.x - ex) * DX[pl.d] + (p.y - ey) * DY[pl.d], ps = (p.x - ex) * DX[pl.sd] + (p.y - ey) * DY[pl.sd];
    if (m.leg === 0) { if (pd < pl.a) return pl.d; m.leg = 1; }
    if (m.leg === 1) { if (ps < pl.b) return pl.sd; m.leg = 2; }
    return -1;
  }

  // 마지막 안전 검사: 판 밖·내 선은 절대 안 감, 막다른 곳(집에 못 돌아가는 칸)·머리 박을 칸은 피함
  function pickSafe(st, p, want, T, m) {
    const W = st.W, H = st.H, owner = st.owner, trail = st.trail, k = p.id + 1;
    let best = -1, bs = -1e9;
    for (let a = 0; a < 3; a++) {
      const d = L.turn(p.dir, a), nx = p.x + DX[d], ny = p.y + DY[d];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const c = ny * W + nx;
      if (trail[c] === k) continue;
      let sc = d === want ? 100 : 0;
      if (trail[c]) sc += T.vsGentle && m.gentle.indexOf(trail[c] - 1) >= 0 ? T.vsGentle.cut : 70;   // 남의 선 = 끊을 기회 (봐주는 사람 선은 초급이 피함)
      if (owner[c] !== k) {
        if (rnd(m) < T.pocket) { const r = bfsHome(st, p.id, c, d); sc += r[0] < 0 ? -1000 : -r[0] * 0.4; }
        if (rnd(m) < T.headOn) for (const q of st.players) {
          if (q === p || !q.alive) continue;
          if (Math.abs(q.x - nx) + Math.abs(q.y - ny) === 1) sc -= owner[c] === q.id + 1 ? 400 : 160;
        }
        // 벽 바로 옆으로 붙는 길은 조금 싫어함
        if (nx === 0 || ny === 0 || nx === W - 1 || ny === H - 1) sc -= 6;
      }
      if (sc > bs) { bs = sc; best = a; }
    }
    return best < 0 ? 0 : best;
  }

  const randTurn = (p, m) => (p.dir + (rnd(m) < 0.5 ? 1 : 3)) & 3;

  // 봇 기억 (JSON 으로 저장 가능)
  //   opt.gentle: 봐줄 사람 번호들 (혼자 하기의 사람). 숨은 상태가 아니라 기억에 적어 둠 → 저장·재현 그대로
  function create(st, pid, tier, seed, opt) {
    const gentle = opt && Array.isArray(opt.gentle) ? opt.gentle.filter(g => g !== pid) : [];
    const m = { tier: TIERS[tier] ? tier : 'normal', rng: (seed >>> 0) || 1, mode: 'home', plan: null, leg: 0, replan: 0, hunts: {}, huntT: -99, pers: null, gentle };
    m.pers = { size: 0.85 + rnd(m) * 0.35, margin: Math.floor(rnd(m) * 2), aggro: 0.8 + rnd(m) * 0.4, greed: 0.9 + rnd(m) * 0.3 };
    return m;
  }

  // 한 틱 행동 고르기 → 0 그대로 · 1 왼쪽 · 2 오른쪽
  function decide(st, pid, m) {
    const p = st.players[pid];
    if (!p || !p.alive) { m.mode = 'home'; m.plan = null; return 0; }
    const T = TIERS[m.tier], W = st.W, k = pid + 1;
    let want;
    if (!p.trail.length) {
      // ── 내 땅 안
      if (m.mode !== 'home') { m.mode = 'home'; m.plan = null; }
      const h = T.huntR > 0 ? tryHunt(st, p, m, T) : -1;
      if (h >= 0) return pickSafe(st, p, h, T, m);
      if (!m.plan || m.plan.d === ((p.dir + 2) & 3) || --m.replan <= 0) { m.plan = choosePlan(st, p, m, T); m.replan = 10 + Math.floor(rnd(m) * 8); }
      want = m.plan ? m.plan.d : p.dir;
      // 나가려는 칸 바로 앞에 남의 머리가 있으면 잠깐 안에서 돌기 (중급 이상)
      if (T.risk > 0 && m.plan) {
        const nx = p.x + DX[want], ny = p.y + DY[want];
        if (nx >= 0 && ny >= 0 && nx < W && ny < st.H && st.owner[ny * W + nx] !== k) {
          for (const q of st.players) if (q !== p && q.alive && Math.abs(q.x - nx) + Math.abs(q.y - ny) <= 2 + m.pers.margin) { want = randTurn(p, m); m.plan = null; break; }
        }
      }
      if (T.wander && rnd(m) < T.wander) want = randTurn(p, m);
      return pickSafe(st, p, want, T, m);
    }
    // ── 내 땅 밖 (선을 긋는 중)
    if (m.mode === 'home') {
      // 방금 나옴: 실제로 나온 방향으로 계획을 맞춤
      m.mode = 'out'; m.leg = 0;
      const pl = m.plan || { a: between(m, T.a), b: between(m, T.b) };
      pl.d = p.dir;
      if (!(pl.sd === ((p.dir + 1) & 3) || pl.sd === ((p.dir + 3) & 3))) pl.sd = rnd(m) < 0.5 ? (p.dir + 1) & 3 : (p.dir + 3) & 3;
      m.plan = pl;
    }
    const head = p.y * W + p.x;
    let legWant = m.mode === 'out' ? legDir(st, p, m) : -1;
    const pref = legWant >= 0 ? legWant : m.leg >= 2 ? (m.plan.d + 2) & 3 : p.dir;
    const hr = bfsHome(st, pid, head, pref), hd = hr[0], hfirst = hr[1];
    // 위험: 남의 머리가 내 선까지 오는 거리 ≤ 내가 집까지 가는 거리 + 여유 → 바로 집으로
    if (m.mode !== 'return' && hd >= 0) {
      const th = threat(st, p, T.pick === 'best');
      if (th - (T.margin + m.pers.margin) <= hd && rnd(m) < T.react) m.mode = 'return';
      if (p.trail.length > (m.plan.a + m.plan.b) * 2 + 14) m.mode = 'return';   // 너무 오래 밖에 있음
    }
    if (m.mode === 'return' || hd < 0) want = hfirst >= 0 ? hfirst : p.dir;
    else {
      const look = T.huntR > 0 && (st.tick - m.huntT < 40 || rnd(m) < 0.5);    // 사냥 중이면 매 틱, 아니면 두 틱에 한 번꼴로 살핌
      const h = look ? tryHunt(st, p, m, T) : -1;
      want = h >= 0 ? h : legWant >= 0 ? legWant : (hfirst >= 0 ? hfirst : p.dir);
    }
    if (T.wobble && rnd(m) < T.wobble) want = randTurn(p, m);
    return pickSafe(st, p, want, T, m);
  }

  // 나중에: 학습한 작은 신경망(JSON: [{W:[[..]], b:[..]}, ...], 마지막 층 3개 = 0·1·2 점수)을 같은 자리에서 쓰기
  function policy(brain) {
    const buf = new Float32Array(L.C.OBS_N);
    return {
      decide(st, pid) {
        let h = L.obs(st, pid, buf);
        brain.forEach((layer, li) => {
          const y = new Float32Array(layer.b.length);
          for (let i = 0; i < y.length; i++) { let s = layer.b[i]; const wi = layer.W[i]; for (let j = 0; j < h.length; j++) s += wi[j] * h[j]; y[i] = li < brain.length - 1 ? Math.max(0, s) : s; }
          h = y;
        });
        let a = 0; for (let i = 1; i < 3; i++) if (h[i] > h[a]) a = i;
        return a;
      },
    };
  }

  const API = { TIERS, create, decide, policy, bfsHome, threat };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LandBots = API;
})(this);

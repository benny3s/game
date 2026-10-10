/* 지렁이 대결 — 게임 규칙 v2 (혼자 하기·방장 컴퓨터가 같이 씀)
   ai-practice/rl-14-slither/slither_env2.py 와 같은 숫자라서 거기서 학습한 AI가 그대로 통한다.
   v2: 따라가는 몸(원을 돌면 점점 조여듦) · 길수록 느린 회전 · 부스트하면 먹이를 흘림 · 죽으면 몸 전체가 큰 먹이 · 넓은 맵 */
const SNK = (() => {
  const C = { R_ARENA: 60, N_NORM: 400, N_DROP: 1400, N_SECT: 16, VIEW: 15, SPEED: 0.5, BOOST: 1.0, TURN: 0.25, SEG: 1.0, NMAX: 320, L0: 10, L_MIN: 6 };
  C.N_FOOD = C.N_NORM + C.N_DROP;
  const TAU = Math.PI * 2;
  const radius = L => 0.5 + 0.01 * L;
  const turnRate = L => { const x = Math.min(1, Math.max(0, (L - 10) / 250)); return C.TURN * (0.35 + 0.65 * (1 - x) ** 2); };
  const randPoint = rmax => { const r = rmax * Math.sqrt(Math.random()), t = Math.random() * TAU; return [r * Math.cos(t), r * Math.sin(t)]; };
  const FOOD_HUES = [0, 30, 55, 120, 175, 200, 260, 300, 330];
  const newFood = (R = C.R_ARENA) => { const p = randPoint(R - 1); return [p[0], p[1], FOOD_HUES[Math.floor(Math.random() * FOOD_HUES.length)], 1]; };   // [x, y, 색, 값]

  // 따라가는 몸: 마디마다 '앞 마디가 직전에 있던 자리' 쪽으로 (속도/간격)만큼 → 간격 SEG로 다시 맞춤
  //   곧게 가면 머리 길 그대로, 곡선에선 현(지름길)을 타서 원을 계속 돌면 점점 조여듦. 친구 화면도 같은 계산을 따라 함
  function follow(body, newHead, v, n) {
    const f = v / C.SEG, m = Math.min(n, body.length - 1);
    let px = body[0][0], py = body[0][1];                                  // 앞 마디의 '직전' 자리
    body[0] = newHead;
    for (let i = 1; i <= m; i++) {
      const ox = body[i][0], oy = body[i][1];
      let x = ox + f * (px - ox), y = oy + f * (py - oy);
      const dx = x - body[i - 1][0], dy = y - body[i - 1][1], d = Math.hypot(dx, dy) || 1e-9;
      body[i] = [body[i - 1][0] + dx / d * C.SEG, body[i - 1][1] + dy / d * C.SEG];
      px = ox; py = oy;
    }
  }
  function straightBody(head, ang, n) { return Array.from({ length: n }, (_, k) => [head[0] - Math.cos(ang) * C.SEG * k, head[1] - Math.sin(ang) * C.SEG * k]); }

  function newSnake(id, kind, name, hue) {
    const s = { id, kind, name, hue, body: [], head: [0, 0], ang: 0, length: C.L0, alive: true, dropAcc: 0,
      respawnAt: 0, best: C.L0, deaths: 0, eaten: 0, kills: 0, pts: [], boosting: false, helper: false, prev: null };
    spawn(s); return s;
  }
  function safePoint(others, R = C.R_ARENA) {
    let best = null, bestD = -1;
    for (let i = 0; i < 20; i++) {
      const p = randPoint(R * 0.8);
      let d = 1e9;
      for (const t of others) { if (!t.alive) continue; d = Math.min(d, Math.hypot(t.head[0] - p[0], t.head[1] - p[1]) - 3); for (let j = 0; j < t.pts.length; j += 3) d = Math.min(d, Math.hypot(t.pts[j][0] - p[0], t.pts[j][1] - p[1])); }
      if (d > bestD) { bestD = d; best = p; }
    }
    return best;
  }
  function spawn(s, others = [], now = 0, R = C.R_ARENA) {
    const p = others.length ? safePoint(others.filter(t => t !== s), R) : randPoint(R * 0.75);
    const ang = Math.atan2(-p[1], -p[0]) + (Math.random() - 0.5);
    s.body = straightBody(p, ang, C.NMAX); s.head = p; s.ang = ang; s.length = C.L0; s.alive = true; s.dropAcc = 0;
    s.protectUntil = now + 2000;
    s.pts = s.body.slice(1, 1 + Math.floor(s.length)); s.prev = null;
  }

  // B 방식 관찰 (AI가 보는 것)
  function observe(s, snakes, food, R = C.R_ARENA) {
    const N = C.N_SECT, V = C.VIEW, o = new Float32Array(N * 4 + 2);
    const minF = new Array(N).fill(V), cnt = new Array(N).fill(0), minB = new Array(N).fill(V);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - s.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N) % N; };
    for (const f of food) { if (!f) continue; const dx = f[0] - s.head[0], dy = f[1] - s.head[1]; if (Math.abs(dx) > V || Math.abs(dy) > V) continue; const d = Math.hypot(dx, dy); if (d < V) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const t of snakes) {
      if (t === s || !t.alive) continue;
      const rad = radius(t.length);
      for (const p of t.pts) { const dx = p[0] - s.head[0], dy = p[1] - s.head[1]; if (Math.abs(dx) > V + 3 || Math.abs(dy) > V + 3) continue; const d = Math.hypot(dx, dy) - rad; if (d < V) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], Math.max(d, 0)); } }
    }
    for (let k = 0; k < N; k++) {
      const mid = s.ang + (k + 0.5) / N * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = s.head[0] * dx + s.head[1] * dy, c = s.head[0] ** 2 + s.head[1] ** 2 - R ** 2;
      const wall = -b + Math.sqrt(Math.max(b * b - c, 0));
      o[k * 4] = 1 - minF[k] / V; o[k * 4 + 1] = Math.min(cnt[k] / 8, 1); o[k * 4 + 2] = 1 - minB[k] / V; o[k * 4 + 3] = 1 - Math.min(wall, V) / V;
    }
    o[64] = Math.min(s.length / 100, 1); o[65] = s.length > C.L_MIN + 1 ? 1 : 0;
    return o;
  }
  function logits(brain, x) {
    let h = x;
    brain.forEach((L, li) => { const y = new Float32Array(L.b.length); for (let i = 0; i < L.b.length; i++) { let sum = L.b[i]; const w = L.W[i]; for (let j = 0; j < h.length; j++) sum += w[j] * h[j]; y[i] = li < 2 ? Math.tanh(sum) : sum; } h = y; });
    return h;
  }
  function sample(h) { const m = Math.max(...h), e = Array.from(h, v => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); let r = Math.random() * z; for (let i = 0; i < e.length; i++) { r -= e[i]; if (r <= 0) return i; } return e.length - 1; }
  function ruleBot(o) {
    let best = 0, bs = -1e9;
    for (let k = 0; k < C.N_SECT; k++) { const danger = Math.max(o[k * 4 + 2], o[k * 4 + 3]); const sc = o[k * 4] + 0.5 * o[k * 4 + 1] - 3 * (danger > 0.6) - 1.5 * danger; if (sc > bs) { bs = sc; best = k; } }
    return ((best >= 1 && best <= 7) ? 1 : (best >= 9 && best <= 14) ? -1 : 0) + 1;
  }
  // 사람 입력 → 행동. 우선순위: 방향키(turn) > 마우스 방향(aim) > 목표 지점(target, 헬퍼 변수 방식)
  function humanAction(s, inp) {
    let turn = inp.turn || 0;
    if (turn === 0 && (inp.aim != null || inp.target)) {
      const want = inp.aim != null ? inp.aim : Math.atan2(inp.target[1] - s.head[1], inp.target[0] - s.head[0]);
      const diff = ((want - s.ang) % TAU + TAU * 1.5) % TAU - Math.PI;
      turn = Math.abs(diff) < turnRate(s.length) / 2 ? 0 : diff > 0 ? 1 : -1;
    }
    return (turn + 1) + (inp.boost ? 3 : 0);
  }

  // AI 종류 (easy·mid = v1 규칙에서 배운 신경망이라 v2에선 서툶, hard = v2에서 이어서 학습)
  const AI_KINDS = {
    raw: { name: "학습 전 AI", brain: "untrained", hue: 270 },
    rule: { name: "규칙 봇", brain: null, hue: 25 },
    easy: { name: "AI 초급", brain: "easy", hue: 150 },
    mid: { name: "AI 중급", brain: "mid", hue: 190 },
    hard: { name: "AI 상급", brain: "trained", hue: 170 },
  };

  class Sim {
    // mode: free(끝없이) / round(3분, 최고 길이 순위) / royale(배틀로얄: 경기장이 줄고 부활 없음, 마지막 생존자 승리)
    constructor(brains, mode = "free") {
      this.brains = brains; this.snakes = []; this.mode = mode; this.R = C.R_ARENA; this.over = false; this.results = null;
      this.limit = mode === "free" ? 0 : 180;                              // 초
      this.food = Array.from({ length: C.N_FOOD }, (_, i) => i < C.N_NORM ? newFood() : null);   // 앞 400 = 보통(다시 생김), 뒤 400 = 흘린 먹이 칸
      this.dropPtr = 0; this.tick = 0; this.foodChanged = new Set(); this.events = []; this.inputs = {};
    }
    add(id, kind, name, hue) {
      const s = newSnake(id, kind, name, hue); s.respawnSeq = (this.inputs[id] || {}).respawn || 0;
      if (this.snakes.length) spawn(s, this.snakes, performance.now(), this.R);
      if (this.mode === "royale" && this.tick > 20 * 20) { s.alive = false; s.out = true; s.pts = []; }   // 배틀로얄 중간 입장은 관전만
      this.snakes.push(s); return s;
    }
    remove(id) { this.snakes = this.snakes.filter(s => s.id !== id); }
    // 흘린 먹이 칸(1,400개): 빈 칸부터 채우고, 꽉 찼을 때만 가장 오래된 칸을 덮어씀 (예전 400칸은 금방 차서 시체 먹이가 갑자기 사라졌음)
    drop(x, y, hue, val) {
      let i = -1;
      for (let k = 0; k < C.N_DROP; k++) { const j = C.N_NORM + (this.dropPtr + k) % C.N_DROP; if (!this.food[j]) { i = j; break; } }
      if (i < 0) i = C.N_NORM + this.dropPtr;
      this.food[i] = [x, y, hue, val, this.tick + 2400 + Math.floor(Math.random() * 600)]; this.foodChanged.add(i); this.dropPtr = (i - C.N_NORM + 1) % C.N_DROP;   // 5번째 = 사라지는 틱 (2~2.5분 뒤, 마지막 5초는 화면에서 줄어들며 흐려짐)
    }
    get elapsed() { return this.tick / 20; }
    get timeLeft() { return this.limit ? Math.max(0, this.limit - this.elapsed) : null; }
    finish() {
      this.over = true;
      const score = s => this.mode === "royale" ? (s.alive ? 1e6 + s.length : (s.outAt || 0)) : s.best;
      this.results = [...this.snakes].sort((a, b) => score(b) - score(a)).map(s => ({ id: s.id, name: s.name, hue: s.hue, len: Math.floor(this.mode === "round" ? s.best : s.length), kills: s.kills, alive: s.alive }));
    }
    step(now, hooks = {}) {
      const { snakes, food } = this;
      if (this.over) return;
      if (this.mode === "royale") {                                        // 20초 뒤부터 2분 30초 동안 60 → 12
        const k = Math.min(1, Math.max(0, (this.elapsed - 20) / 150));
        this.R = C.R_ARENA - (C.R_ARENA - 12) * k;
      }
      for (const s of snakes) {
        s.prev = s.alive ? { head: s.head, pts: s.body.slice(1, Math.floor(s.length) + 4) } : null;   // 화면 보간용 직전 틱 (꼬리 끝 몇 마디 더 → 꼬리도 부드럽게)
        if (!s.alive) {
          if (this.mode === "royale") continue;                               // 배틀로얄은 부활 없음
          const want = s.kind === "human" ? ((this.inputs[s.id] || {}).respawn || 0) > (s.respawnSeq || 0) : now > s.respawnAt;
          if (want) { if (s.kind === "human") s.respawnSeq = this.inputs[s.id].respawn; spawn(s, snakes, now, this.R); this.events.push(["spawn", s.id]); }
          continue;
        }
        let a;
        if (s.kind === "human") { const inp = this.inputs[s.id] || {}; a = humanAction(s, inp); if (hooks.human) hooks.human(s, a, () => observe(s, snakes, food, this.R), inp); }
        else { const o = observe(s, snakes, food, this.R), k = AI_KINDS[s.kind]; a = k.brain ? sample(logits(this.brains[k.brain], o)) : ruleBot(o); }
        const turn = a % 3 - 1, boost = Math.floor(a / 3) === 1 && s.length > C.L_MIN + 1;
        s.ang = ((s.ang + turnRate(s.length) * turn) % TAU + TAU) % TAU;
        const v = boost ? C.BOOST : C.SPEED;
        s.head = [s.head[0] + v * Math.cos(s.ang), s.head[1] + v * Math.sin(s.ang)];
        follow(s.body, s.head, v, Math.floor(s.length) + 8);               // 길이보다 조금 더 (큰 먹이로 한 번에 길어져도 꼬리가 튀지 않게)
        s.boosting = boost;
        if (boost) {                                                       // 부스트: 0.5 줄 때마다 꼬리에 +0.5 먹이를 흘림
          s.length -= 0.1; s.dropAcc += 0.1;
          if (s.dropAcc >= 0.5 - 1e-9) { s.dropAcc -= 0.5; const t = s.body[Math.min(Math.floor(s.length), C.NMAX - 1)]; this.drop(t[0] + (Math.random() - .5) * .4, t[1] + (Math.random() - .5) * .4, s.hue, 0.5); }
        }
      }
      for (let i = 0; i < food.length; i++) {
        const f = food[i]; if (!f) continue;
        for (const s of snakes) {
          if (s.alive && Math.abs(f[0] - s.head[0]) < 3 && Math.hypot(f[0] - s.head[0], f[1] - s.head[1]) < 1 + radius(s.length)) {
            s.length = Math.min(s.length + f[3], C.NMAX - 2); s.eaten += f[3];
            food[i] = i < C.N_NORM ? newFood(this.R) : null; this.foodChanged.add(i); break;
          }
        }
      }
      for (const s of snakes) s.pts = s.alive ? s.body.slice(1, 1 + Math.floor(s.length)) : [];
      const dead = [];
      for (const s of snakes) s.prot = s.alive && now < (s.protectUntil || 0);
      for (const s of snakes) {
        if (!s.alive) continue;
        if (Math.hypot(s.head[0], s.head[1]) > this.R) { if (s.prot) { s.ang = Math.atan2(-s.head[1], -s.head[0]); continue; } dead.push([s, null]); continue; }
        if (s.prot) continue;
        // 이번 틱에 머리가 지나간 '선분' 전체로 검사 (부스트 때 한 틱 1칸씩 가서 얇은 몸을 건너뛰던 문제) + 상대 머리도 몸으로
        const a = s.prev ? s.prev.head : s.head, b = s.head, ex = b[0] - a[0], ey = b[1] - a[1], ll = ex * ex + ey * ey || 1e-9;
        const segDist = p => { const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / ll)); return Math.hypot(p[0] - a[0] - u * ex, p[1] - a[1] - u * ey); };
        for (const t of snakes) {
          if (t === s || !t.alive || t.prot) continue;
          const rad = radius(t.length), lim = rad + 1.2;                   // 머리 중심이 몸 안에 들어가야 죽음 = 보이는 그대로
          const hit = p => Math.abs(p[0] - b[0]) < lim && Math.abs(p[1] - b[1]) < lim && segDist(p) < rad;
          if (hit(t.head) || t.pts.some(hit)) { dead.push([s, t]); break; }
        }
      }
      for (const [s, killer] of dead) {
        const val = 0.5 + 0.001 * s.length;                                // 몸 마디마다 큰 먹이 (클수록 조금 더 크고 값이 높음, 몸 길이의 55~80%만 돌려줌)
        for (const p of s.pts) this.drop(p[0] + (Math.random() - .5) * .7, p[1] + (Math.random() - .5) * .7, s.hue, val);
        s.alive = false; s.deaths++; s.respawnAt = now + 1500; s.pts = [];
        if (this.mode === "royale") { s.out = true; s.outAt = this.elapsed; }
        if (killer) killer.kills++;
        this.events.push(["death", s.id, killer ? killer.id : null, Math.floor(s.length)]);
        if (hooks.death) hooks.death(s);
      }
      for (const s of snakes) s.best = Math.max(s.best, s.length);
      if (this.tick % 10 === 0) for (let i = C.N_NORM; i < C.N_FOOD; i++) { const f = food[i]; if (f && f[4] && this.tick >= f[4]) { food[i] = null; this.foodChanged.add(i); } }
      // 줄어든 경기장 밖 먹이는 안쪽으로 옮김
      if (this.mode === "royale" && this.tick % 20 === 0) for (let i = 0; i < C.N_NORM; i++) { const f = food[i]; if (f && Math.hypot(f[0], f[1]) > this.R - 1) { food[i] = newFood(this.R); this.foodChanged.add(i); } }
      this.tick++;
      if (this.limit && this.elapsed >= this.limit) this.finish();
      if (this.mode === "royale" && this.elapsed > 3 && snakes.filter(s => s.alive).length <= 1) this.finish();
    }
  }
  return { C, TAU, radius, turnRate, follow, straightBody, Sim, AI_KINDS, observe, logits, FOOD_HUES };
})();

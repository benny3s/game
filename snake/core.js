/* 지렁이 대결 — 게임 규칙 (혼자 하기·방장 컴퓨터가 같이 씀)
   rl-14 slither_env.py 와 같은 숫자라서 거기서 학습한 AI가 그대로 통한다. */
const SNK = (() => {
  const C = { R_ARENA: 40, N_FOOD: 200, N_SECT: 16, VIEW: 15, SPEED: 0.5, BOOST: 1.0, TURN: 0.25, SPACING: 2, T_TRAIL: 600, L0: 10, L_MIN: 6 };
  const TAU = Math.PI * 2;
  const radius = L => 0.5 + 0.01 * L;
  const randPoint = rmax => { const r = rmax * Math.sqrt(Math.random()), t = Math.random() * TAU; return [r * Math.cos(t), r * Math.sin(t)]; };
  const FOOD_HUES = [0, 30, 55, 120, 175, 200, 260, 300, 330];

  function newSnake(id, kind, name, hue) {
    const s = { id, kind, name, hue, trail: new Array(C.T_TRAIL), ptr: 0, head: [0, 0], ang: 0, length: C.L0, alive: true,
      respawnAt: 0, best: C.L0, deaths: 0, eaten: 0, kills: 0, pts: [], boosting: false, helper: false };
    spawn(s); return s;
  }
  function spawn(s) {
    const p = randPoint(C.R_ARENA * 0.75), ang = Math.random() * TAU, back = [-Math.cos(ang) * C.SPEED, -Math.sin(ang) * C.SPEED];
    for (let k = 0; k < C.T_TRAIL; k++) { const m = Math.min(k, 40); s.trail[((s.ptr - k) % C.T_TRAIL + C.T_TRAIL) % C.T_TRAIL] = [p[0] + back[0] * m, p[1] + back[1] * m]; }
    s.head = p; s.ang = ang; s.length = C.L0; s.alive = true; s.pts = bodyPoints(s);
  }
  function bodyPoints(s) {
    const n = Math.min(Math.floor(s.length), C.T_TRAIL / C.SPACING), out = [];
    for (let i = 0; i < n; i++) out.push(s.trail[((s.ptr - C.SPACING * (i + 1)) % C.T_TRAIL + C.T_TRAIL) % C.T_TRAIL]);
    return out;
  }
  function newFood() { const p = randPoint(C.R_ARENA - 1); return [p[0], p[1], FOOD_HUES[Math.floor(Math.random() * FOOD_HUES.length)]]; }

  // B 방식 관찰 (AI가 보는 것)
  function observe(s, snakes, food) {
    const N = C.N_SECT, V = C.VIEW, o = new Float32Array(N * 4 + 2);
    const minF = new Array(N).fill(V), cnt = new Array(N).fill(0), minB = new Array(N).fill(V);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - s.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N) % N; };
    for (const f of food) { const dx = f[0] - s.head[0], dy = f[1] - s.head[1], d = Math.hypot(dx, dy); if (d < V) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const t of snakes) {
      if (t === s || !t.alive) continue;
      const rad = radius(t.length);
      for (const p of t.pts) { const dx = p[0] - s.head[0], dy = p[1] - s.head[1]; if (Math.abs(dx) > V + 2 || Math.abs(dy) > V + 2) continue; const d = Math.hypot(dx, dy) - rad; if (d < V) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], Math.max(d, 0)); } }
    }
    for (let k = 0; k < N; k++) {
      const mid = s.ang + (k + 0.5) / N * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = s.head[0] * dx + s.head[1] * dy, c = s.head[0] ** 2 + s.head[1] ** 2 - C.R_ARENA ** 2;
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
  // 사람 입력 → 행동. 한 번에 0.25라디안만 (AI와 같은 조건)
  //   우선순위: 방향키(turn) > 마우스 방향(aim: 화면 가운데=내 머리 기준 각도, slither 방식) > 목표 지점(target: 헬퍼 변수 방식)
  function humanAction(s, inp) {
    let turn = inp.turn || 0;
    if (turn === 0 && (inp.aim != null || inp.target)) {
      const want = inp.aim != null ? inp.aim : Math.atan2(inp.target[1] - s.head[1], inp.target[0] - s.head[0]);
      const diff = ((want - s.ang) % TAU + TAU * 1.5) % TAU - Math.PI;
      turn = Math.abs(diff) < C.TURN / 2 ? 0 : diff > 0 ? 1 : -1;
    }
    return (turn + 1) + (inp.boost ? 3 : 0);
  }

  // AI 종류: 학습 정도별 신경망, 규칙 봇
  const AI_KINDS = {
    raw: { name: "학습 전 AI", brain: "untrained", hue: 270 },
    rule: { name: "규칙 봇", brain: null, hue: 25 },
    easy: { name: "AI 초급", brain: "easy", hue: 150 },
    mid: { name: "AI 중급", brain: "mid", hue: 190 },
    hard: { name: "AI 상급", brain: "trained", hue: 170 },
  };

  class Sim {
    constructor(brains) { this.brains = brains; this.snakes = []; this.food = Array.from({ length: C.N_FOOD }, newFood); this.tick = 0; this.foodChanged = new Set(); this.events = []; this.inputs = {}; }
    add(id, kind, name, hue) { const s = newSnake(id, kind, name, hue); s.respawnSeq = (this.inputs[id] || {}).respawn || 0; this.snakes.push(s); return s; }
    remove(id) { this.snakes = this.snakes.filter(s => s.id !== id); }
    step(now, hooks = {}) {
      const { snakes, food } = this;
      for (const s of snakes) {
        if (!s.alive) {
          // AI는 1.5초 뒤 자동으로, 사람은 '다시 하기'를 눌러야(입력의 respawn 숫자가 올라가야) 다시 태어남
          const want = s.kind === "human" ? ((this.inputs[s.id] || {}).respawn || 0) > (s.respawnSeq || 0) : now > s.respawnAt;
          if (want) { if (s.kind === "human") s.respawnSeq = this.inputs[s.id].respawn; spawn(s); this.events.push(["spawn", s.id]); }
          continue;
        }
        let a;
        if (s.kind === "human") { const inp = this.inputs[s.id] || {}; a = humanAction(s, inp); if (hooks.human) hooks.human(s, a, () => observe(s, snakes, food), inp); }
        else { const o = observe(s, snakes, food), k = AI_KINDS[s.kind]; a = k.brain ? sample(logits(this.brains[k.brain], o)) : ruleBot(o); }
        const turn = a % 3 - 1, boost = Math.floor(a / 3) === 1 && s.length > C.L_MIN + 1;
        s.ang = ((s.ang + C.TURN * turn) % TAU + TAU) % TAU;
        const v = boost ? C.BOOST : C.SPEED;
        s.head = [s.head[0] + v * Math.cos(s.ang), s.head[1] + v * Math.sin(s.ang)];
        s.ptr = (s.ptr + 1) % C.T_TRAIL; s.trail[s.ptr] = s.head;
        s.boosting = boost;
        if (boost) s.length -= 0.1;
      }
      for (let i = 0; i < food.length; i++) for (const s of snakes) {
        if (s.alive && Math.abs(food[i][0] - s.head[0]) < 3 && Math.hypot(food[i][0] - s.head[0], food[i][1] - s.head[1]) < 1 + radius(s.length)) { s.length += 1; s.eaten++; food[i] = newFood(); this.foodChanged.add(i); break; }
      }
      for (const s of snakes) s.pts = s.alive ? bodyPoints(s) : [];
      const dead = [];
      for (const s of snakes) {
        if (!s.alive) continue;
        if (Math.hypot(s.head[0], s.head[1]) > C.R_ARENA) { dead.push([s, null]); continue; }
        for (const t of snakes) {
          if (t === s || !t.alive) continue;
          const rad = radius(t.length) + 0.3;
          if (t.pts.some(p => Math.abs(p[0] - s.head[0]) < rad && Math.hypot(p[0] - s.head[0], p[1] - s.head[1]) < rad)) { dead.push([s, t]); break; }
        }
      }
      for (const [s, killer] of dead) {
        s.pts.filter((_, i) => i % 2 === 0).slice(0, C.N_FOOD / 4).forEach(p => { const i = Math.floor(Math.random() * C.N_FOOD); food[i] = [p[0] + (Math.random() - .5) * .6, p[1] + (Math.random() - .5) * .6, s.hue]; this.foodChanged.add(i); });
        s.alive = false; s.deaths++; s.respawnAt = now + 1500; s.pts = [];
        if (killer) killer.kills++;
        this.events.push(["death", s.id, killer ? killer.id : null, Math.floor(s.length)]);
        if (hooks.death) hooks.death(s);
      }
      for (const s of snakes) s.best = Math.max(s.best, s.length);
      this.tick++;
    }
  }
  return { C, TAU, radius, Sim, AI_KINDS, observe, logits, bodyPoints, FOOD_HUES };
})();

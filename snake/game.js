/* 지렁이 대결 — 게임 본체 + 헬퍼 감지기(관리자)
   규칙은 ai-practice/rl-14-slither/slither_env.py 와 같음. AI 상대는 거기서 셀프플레이로 학습한 신경망(brains.json).

   헬퍼 실습을 위해 실제 slither.io 처럼 게임 상태를 페이지 변수 window.game 에 둔다:
     game.snakes[i] = { kind, head:[x,y], ang, length, alive, pts:[[x,y]...] }   game.food = [[x,y]...]
     game.input = { target:[x,y] | null, boost, turn }   ← slither 봇들이 바꾸던 마우스 좌표 변수와 같은 역할
     game.view = { canvas, size, scale, toScreen(p), toWorld(x,y) }
   감지기는 이 페이지 안에서 돌지만, 실제 서비스라면 서버가 같은 신호(입력 기록·반응 시간)를 보고 판단한다. */
(() => {
  const R_ARENA = 40, N_FOOD = 200, N_SECT = 16, VIEW = 15, SPEED = 0.5, BOOST = 1.0, TURN = 0.25, SPACING = 2, T_TRAIL = 600, L0 = 10, L_MIN = 6;
  const TAU = Math.PI * 2;
  const COLORS = { me: "#ffd666", ai: "#5ec4b6", bot: "#f08a4b", raw: "#b48cf0" };
  const NAMES = { me: "나", ai: "학습된 AI", bot: "규칙 봇", raw: "학습 전 AI" };
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const SIZE = 760, SC = (SIZE - 24) / (2 * R_ARENA);
  let BRAINS = null, snakes = [], food = [], mode = null, timer = null, hz = 20;
  const input = { target: null, boost: false, turn: 0 };

  const randPoint = rmax => { const r = rmax * Math.sqrt(Math.random()), t = Math.random() * TAU; return [r * Math.cos(t), r * Math.sin(t)]; };
  const radius = L => 0.5 + 0.01 * L;
  const X = p => SIZE / 2 + p[0] * SC, Y = p => SIZE / 2 - p[1] * SC;

  function makeSnake(kind, idx) {
    const s = { kind, idx, trail: new Array(T_TRAIL), ptr: 0, head: [0, 0], ang: 0, length: L0, alive: true, respawnAt: 0, best: L0, deaths: 0, eaten: 0, kills: 0, pts: [] };
    spawn(s); return s;
  }
  function spawn(s) {
    const p = randPoint(R_ARENA * 0.75), ang = Math.random() * TAU, back = [-Math.cos(ang) * SPEED, -Math.sin(ang) * SPEED];
    for (let k = 0; k < T_TRAIL; k++) { const m = Math.min(k, 40); s.trail[((s.ptr - k) % T_TRAIL + T_TRAIL) % T_TRAIL] = [p[0] + back[0] * m, p[1] + back[1] * m]; }
    s.head = p; s.ang = ang; s.length = L0; s.alive = true;
  }
  function bodyPoints(s) {
    const n = Math.min(Math.floor(s.length), T_TRAIL / SPACING), out = [];
    for (let i = 0; i < n; i++) out.push(s.trail[((s.ptr - SPACING * (i + 1)) % T_TRAIL + T_TRAIL) % T_TRAIL]);
    return out;
  }

  // ── B 방식 관찰 (AI 상대가 보는 것)
  function observe(s, bodies) {
    const o = new Float32Array(N_SECT * 4 + 2);
    const minF = new Array(N_SECT).fill(VIEW), cnt = new Array(N_SECT).fill(0), minB = new Array(N_SECT).fill(VIEW);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - s.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N_SECT) % N_SECT; };
    for (const f of food) { const dx = f[0] - s.head[0], dy = f[1] - s.head[1], d = Math.hypot(dx, dy); if (d < VIEW) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const t of snakes) {
      if (t === s || !t.alive) continue;
      const rad = radius(t.length);
      for (const p of bodies.get(t)) { const dx = p[0] - s.head[0], dy = p[1] - s.head[1], d = Math.hypot(dx, dy) - rad; if (d < VIEW) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], Math.max(d, 0)); } }
    }
    for (let k = 0; k < N_SECT; k++) {
      const mid = s.ang + (k + 0.5) / N_SECT * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = s.head[0] * dx + s.head[1] * dy, c = s.head[0] ** 2 + s.head[1] ** 2 - R_ARENA ** 2;
      const wall = -b + Math.sqrt(Math.max(b * b - c, 0));
      o[k * 4] = 1 - minF[k] / VIEW; o[k * 4 + 1] = Math.min(cnt[k] / 8, 1); o[k * 4 + 2] = 1 - minB[k] / VIEW; o[k * 4 + 3] = 1 - Math.min(wall, VIEW) / VIEW;
    }
    o[64] = Math.min(s.length / 100, 1); o[65] = s.length > L_MIN + 1 ? 1 : 0;
    return o;
  }
  function logits(brain, x) {
    let h = x;
    brain.forEach((L, li) => { const y = new Float32Array(L.b.length); for (let i = 0; i < L.b.length; i++) { let sum = L.b[i]; const w = L.W[i]; for (let j = 0; j < h.length; j++) sum += w[j] * h[j]; y[i] = li < 2 ? Math.tanh(sum) : sum; } h = y; });
    return h;
  }
  function sample(h) { const m = Math.max(...h), e = Array.from(h, v => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0); let r = Math.random() * z; for (let i = 0; i < e.length; i++) { r -= e[i]; if (r <= 0) return i; } return e.length - 1; }
  function heuristic(o) {
    let best = 0, bs = -1e9;
    for (let k = 0; k < N_SECT; k++) { const danger = Math.max(o[k * 4 + 2], o[k * 4 + 3]); const sc = o[k * 4] + 0.5 * o[k * 4 + 1] - 3 * (danger > 0.6) - 1.5 * danger; if (sc > bs) { bs = sc; best = k; } }
    return ((best >= 1 && best <= 7) ? 1 : (best >= 9 && best <= 14) ? -1 : 0) + 1;
  }
  // 사람 입력 → 행동: 목표 지점 쪽으로 한 번에 0.25라디안만 (AI와 같은 조건)
  function humanAction(s) {
    let turn = input.turn;
    if (turn === 0 && input.target) {
      const want = Math.atan2(input.target[1] - s.head[1], input.target[0] - s.head[0]);
      const diff = ((want - s.ang) % TAU + TAU * 1.5) % TAU - Math.PI;
      turn = Math.abs(diff) < TURN / 2 ? 0 : diff > 0 ? 1 : -1;
    }
    return (turn + 1) + (input.boost ? 3 : 0);
  }

  // ── 한 걸음
  function tick() {
    const now = performance.now();
    const bodies = new Map(snakes.map(s => [s, s.alive ? bodyPoints(s) : []]));
    for (const s of snakes) {
      if (!s.alive) { if (now > s.respawnAt) spawn(s); continue; }
      let a;
      if (s.kind === "me") { a = humanAction(s); AC.beforeMove(s, observe(s, bodies), a, now); }
      else { const o = observe(s, bodies); a = s.kind === "bot" ? heuristic(o) : sample(logits(BRAINS[s.kind === "ai" ? "trained" : "untrained"], o)); }
      const turn = a % 3 - 1, boost = Math.floor(a / 3) === 1 && s.length > L_MIN + 1;
      s.ang = ((s.ang + TURN * turn) % TAU + TAU) % TAU;
      const v = boost ? BOOST : SPEED;
      s.head = [s.head[0] + v * Math.cos(s.ang), s.head[1] + v * Math.sin(s.ang)];
      s.ptr = (s.ptr + 1) % T_TRAIL; s.trail[s.ptr] = s.head;
      if (boost) s.length -= 0.1;
    }
    for (let i = 0; i < food.length; i++) for (const s of snakes) {
      if (s.alive && Math.hypot(food[i][0] - s.head[0], food[i][1] - s.head[1]) < 1 + radius(s.length)) { s.length += 1; s.eaten++; food[i] = randPoint(R_ARENA - 1); break; }
    }
    const after = new Map(snakes.map(s => [s, s.alive ? bodyPoints(s) : []]));
    const dead = [];
    for (const s of snakes) {
      if (!s.alive) continue;
      if (Math.hypot(s.head[0], s.head[1]) > R_ARENA) { dead.push([s, null]); continue; }
      for (const t of snakes) { if (t === s || !t.alive) continue; const rad = radius(t.length) + 0.3; if (after.get(t).some(p => Math.hypot(p[0] - s.head[0], p[1] - s.head[1]) < rad)) { dead.push([s, t]); break; } }
    }
    for (const [s, killer] of dead) {
      after.get(s).filter((_, i) => i % 2 === 0).slice(0, N_FOOD / 4).forEach(p => { food[Math.floor(Math.random() * N_FOOD)] = [p[0] + (Math.random() - .5) * .6, p[1] + (Math.random() - .5) * .6]; });
      s.alive = false; s.deaths++; s.respawnAt = now + 1000;
      if (killer) killer.kills++;
      if (s.kind === "me") AC.onDeath();
    }
    for (const s of snakes) { s.best = Math.max(s.best, s.length); s.pts = after.get(s); }
    draw(); board(); AC.render();
  }

  // ── 그리기
  function draw() {
    ctx.fillStyle = "#0f1716"; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "#2c3a36"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(SIZE / 2, SIZE / 2, R_ARENA * SC, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#ffe7a3"; for (const f of food) { ctx.beginPath(); ctx.arc(X(f), Y(f), 2.6, 0, TAU); ctx.fill(); }
    for (const s of snakes) {
      if (!s.alive) continue;
      const r = Math.max(2.2, radius(s.length) * SC);
      ctx.fillStyle = COLORS[s.kind]; ctx.globalAlpha = 0.72;
      for (let i = s.pts.length - 1; i >= 0; i--) { ctx.beginPath(); ctx.arc(X(s.pts[i]), Y(s.pts[i]), r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(X(s.head), Y(s.head), r * 1.35, 0, TAU); ctx.fill();
      if (s.kind === "me") { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
    }
  }
  function board() {
    const el = document.getElementById("board"); el.innerHTML = "";
    [...snakes].sort((a, b) => b.length - a.length).forEach(s => {
      const d = document.createElement("div"); d.className = "row";
      d.innerHTML = '<span class="dot"></span><span class="nm"></span><span class="v"></span>';
      d.children[0].style.background = COLORS[s.kind];
      d.children[1].textContent = NAMES[s.kind] + (s.kind === "me" ? "" : " " + s.idx);
      d.children[2].textContent = `길이 ${s.alive ? Math.floor(s.length) : "-"} · 최고 ${Math.floor(s.best)} · 죽음 ${s.deaths} · 잡음 ${s.kills}`;
      el.appendChild(d);
    });
  }

  // ── 입력 (마우스·손가락·키보드). 모든 입력은 감지기가 기록
  const toWorld = (clientX, clientY) => { const r = cv.getBoundingClientRect(); const x = (clientX - r.left) / r.width * SIZE, y = (clientY - r.top) / r.height * SIZE; return [(x - SIZE / 2) / SC, (SIZE / 2 - y) / SC]; };
  cv.addEventListener("pointermove", e => { AC.onInput("move", e); input.target = toWorld(e.clientX, e.clientY); });
  cv.addEventListener("pointerdown", e => { AC.onInput("down", e); input.target = toWorld(e.clientX, e.clientY); input.boost = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener("pointerup", e => { AC.onInput("up", e); input.boost = false; });
  window.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) { AC.onInput("key", e); e.preventDefault(); }
    if (e.key === "ArrowLeft") input.turn = 1; if (e.key === "ArrowRight") input.turn = -1; if (e.key === " ") input.boost = true;
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { AC.onInput("key", e); input.turn = 0; }
    if (e.key === " ") { AC.onInput("key", e); input.boost = false; }
  });

  // ── 헬퍼 감지기 (관리자). 실제 서비스라면 서버 쪽에서 같은 신호를 본다
  const AC = (() => {
    const st = { events: 0, untrusted: 0, intervals: [], lastEvt: 0, tamperTicks: 0, lastSeenTarget: null, lastEventAt: 0,
      dangerOn: false, dangerAt: 0, reactions: [], episodes: 0, survived: 0, injected: [], overlays: 0, log: [] };
    const say = m => { st.log.unshift(`${new Date().toLocaleTimeString()} ${m}`); st.log.length = Math.min(st.log.length, 8); };
    function onInput(kind, e) {
      const t = performance.now();
      st.events++; st.lastEventAt = t;
      if (!e.isTrusted) { if (st.untrusted === 0) say("가짜 입력 발견: 브라우저가 아니라 스크립트가 만든 이벤트(isTrusted=false)"); st.untrusted++; }
      if (kind === "move") { if (st.lastEvt) st.intervals.push(t - st.lastEvt); st.lastEvt = t; if (st.intervals.length > 200) st.intervals.shift(); }
    }
    function beforeMove(s, o, action, now) {
      // ① 이벤트 없이 바뀐 입력 = 변수 직접 조작
      const tgt = input.target ? input.target.join(",") : "";
      if (tgt !== st.lastSeenTarget) {
        if (st.lastSeenTarget !== null && now - st.lastEventAt > 120) { if (st.tamperTicks === 0) say("입력 변조: 마우스 이벤트 없이 목표 좌표가 바뀜 (게임 변수를 직접 고침)"); st.tamperTicks++; }
        st.lastSeenTarget = tgt;
      }
      // ② 위험 반응 시간: 정면(±34°)에 남의 몸·벽이 가까워진 순간부터 반대쪽으로 틀기 시작할 때까지
      let danger = 0, side = 0;
      for (const k of [15, 0, 1]) danger = Math.max(danger, o[k * 4 + 2], o[k * 4 + 3]);
      const left = Math.max(o[1 * 4 + 2], o[2 * 4 + 2], o[1 * 4 + 3]), right = Math.max(o[15 * 4 + 2], o[14 * 4 + 2], o[15 * 4 + 3]);
      side = left > right ? -1 : 1;                                   // 피해야 할 쪽의 반대
      const turn = action % 3 - 1;
      if (!st.dangerOn && danger > 0.55) { st.dangerOn = true; st.dangerAt = now; st.need = side; st.reacted = turn === side; st.episodes++; }   // 이미 그쪽으로 틀던 중이면 반응 시간에서 뺌
      if (st.dangerOn && !st.reacted && turn === st.need) { st.reacted = true; st.reactions.push(now - st.dangerAt); if (st.reactions.length > 60) st.reactions.shift(); }
      if (st.dangerOn && danger < 0.35) { st.dangerOn = false; st.survived++; }
    }
    function onDeath() { if (st.dangerOn) st.dangerOn = false; }
    // ③ 주입 감시: 처음 없던 스크립트·캔버스가 생기면
    const known = new Set([...document.scripts].map(s => s.src || "inline"));
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.tagName === "SCRIPT" && !known.has(n.src || "inline")) { st.injected.push(n.src || "인라인 스크립트"); say("주입된 스크립트: " + (n.src || "인라인").split("/").pop()); }
      if (n.tagName === "CANVAS" || (n.querySelector && n.querySelector("canvas"))) { st.overlays++; say("게임 위에 덧그린 화면(오버레이) 발견"); }
    }))).observe(document.documentElement, { childList: true, subtree: true });

    // 지금 페이지에 붙어 있는 주입물 (기록을 지워도 남아 있으면 계속 잡힘)
    const present = () => (document.querySelectorAll("canvas").length - 1) + [...document.scripts].filter(s => !known.has(s.src || "inline")).length;
    const median = a => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
    function score() {
      const iv = st.intervals.slice(-80), mean = iv.reduce((a, b) => a + b, 0) / (iv.length || 1);
      const cvv = iv.length > 1 ? Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length) / mean : NaN;
      const rt = median(st.reactions), avoid = st.episodes ? st.survived / st.episodes : NaN;
      const sig = [
        ["가짜 입력 (isTrusted=false)", st.untrusted > 0, `${st.untrusted}번`, 40],
        ["입력 변조 (이벤트 없이 좌표 바뀜)", st.tamperTicks >= 2, `${st.tamperTicks}번`, 35],
        ["주입된 스크립트·오버레이 (지금 붙어 있음)", present() > 0, `스크립트 ${st.injected.length} · 덧그린 화면 ${document.querySelectorAll("canvas").length - 1}`, 20],
        ["반응이 사람보다 빠름 (중앙값 < 180ms)", st.reactions.length >= 5 && rt < 180, isNaN(rt) ? "자료 부족" : `${Math.round(rt)}ms (${st.reactions.length}번)`, 25],
        ["입력 간격이 너무 일정함 (변동 < 0.25)", iv.length >= 30 && cvv < 0.25, isNaN(cvv) ? "자료 부족" : `변동 ${cvv.toFixed(2)}`, 15],
        ["위험을 거의 다 피함 (95% 이상, 10번+)", st.episodes >= 10 && avoid >= 0.95, isNaN(avoid) ? "자료 부족" : `${Math.round(avoid * 100)}% (${st.episodes}번)`, 10],
      ];
      return { sig, total: Math.min(100, sig.reduce((a, s) => a + (s[1] ? s[3] : 0), 0)) };
    }
    function render() {
      const el = document.getElementById("ac"); if (!el || el.hidden) return;
      const { sig, total } = score();
      const verdict = total >= 60 ? ["헬퍼 사용 의심 높음", "hot"] : total >= 25 ? ["주의 관찰", "warn"] : ["정상으로 보임", "ok"];
      el.querySelector(".ac-score").textContent = total;
      const v = el.querySelector(".ac-verdict"); v.textContent = verdict[0]; v.className = "ac-verdict " + verdict[1];
      el.querySelector(".ac-sig").innerHTML = sig.map(s => `<li class="${s[1] ? "on" : ""}"><span>${s[1] ? "●" : "○"} ${s[0]}</span><b>${s[2]}</b></li>`).join("");
      el.querySelector(".ac-log").innerHTML = st.log.map(m => `<li>${m}</li>`).join("") || "<li>아직 이상 없음</li>";
    }
    function reset() { Object.assign(st, { events: 0, untrusted: 0, intervals: [], lastEvt: 0, tamperTicks: 0, lastSeenTarget: null, dangerOn: false, reactions: [], episodes: 0, survived: 0, log: [] }); }
    return { onInput, beforeMove, onDeath, render, reset, score };
  })();

  function start(m) {
    mode = m;
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    const kinds = m === "mix" ? ["ai", "ai", "bot", "bot", "raw"] : Array(5).fill(m);
    snakes = [makeSnake("me", 0), ...kinds.map((k, i) => makeSnake(k, i + 1))];
    food = Array.from({ length: N_FOOD }, () => randPoint(R_ARENA - 1));
    document.getElementById("over").hidden = true;
    restart();
  }
  function restart() { clearInterval(timer); timer = setInterval(tick, 1000 / hz); }
  document.getElementById("speed").addEventListener("change", e => { hz = Number(e.target.value); if (mode) restart(); });
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { if (BRAINS) start(b.dataset.mode); }));
  document.getElementById("acToggle").addEventListener("click", e => {
    const el = document.getElementById("ac"); el.hidden = !el.hidden; e.target.setAttribute("aria-pressed", String(!el.hidden)); AC.render();
  });
  document.getElementById("acReset").addEventListener("click", () => { AC.reset(); AC.render(); });
  ctx.fillStyle = "#0f1716"; ctx.fillRect(0, 0, SIZE, SIZE);
  fetch("brains.json").then(r => r.json()).then(b => { BRAINS = b; document.getElementById("loading").hidden = true; });

  // ── 헬퍼가 읽는 공개 변수 (실제 slither.io 클라이언트가 전역 변수에 상태를 두던 것과 같은 구조)
  window.game = {
    get snakes() { return snakes; }, get food() { return food; }, get me() { return snakes[0]; },
    input, consts: { R_ARENA, N_SECT, VIEW, SPEED, BOOST, TURN, L_MIN },
    view: { canvas: cv, size: SIZE, scale: SC, toScreen: p => [X(p), Y(p)], toWorld },
    get hz() { return hz; },
  };
})();

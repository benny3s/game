/* 지렁이 대결 헬퍼 (실습용) — 게임과 따로 떨어진 스크립트가 페이지에 주입되어 일하는 구조
   실제 브라우저 게임 헬퍼와 같은 세 층:
     ① 읽기: 페이지 변수 window.game 에서 지렁이·먹이·내 위치를 읽음
     ② 판단: 미래 예측(몇 가지 조작을 0.7초 앞까지 시뮬레이션) 또는 학습된 AI 신경망
     ③ 조작: 마우스 이벤트를 만들어 넣거나(이벤트 방식), 게임의 입력 변수를 직접 바꿈(변수 방식 = 옛 slither 봇들)
   기능: 레이더 · AI 추천 방향 · 예상 경로와 충돌 경고 · 먹이 안내 · 넓게 보기 · 위험 진동 · 예측 회피 · 자동 조종
   메뉴의 '헬퍼'로 고르면 같은 파일이 붙고(이름 앞 🧪), 북마크로 몰래 붙이면 감지기가 잡는지 실습할 수 있음.
   이 게임(우리 사이트) 전용. 다른 사람들과 하는 실제 게임에서는 쓰지 않는다. */
(() => {
  const preset = window.__helperPreset || {};
  if (window.__snakeHelper) { window.__snakeHelper.apply(preset); return; }
  const G = window.game;
  if (!G) { alert("지렁이 대결 페이지에서 실행하세요"); return; }
  const BASE = (document.currentScript && document.currentScript.src) || location.href;
  const TAU = Math.PI * 2, K = G.consts, { N_SECT, VIEW, L_MIN } = K;
  let brain = null;
  fetch(new URL("brains.json?v=v2-4m", BASE)).then(r => r.json()).then(b => { brain = b.trained; });
  const radius = (window.SNK && SNK.radius) || (L => L <= 50 ? 0.5 + 0.01 * L : 1 + 0.6 * (Math.sqrt(L / 50) - 1));   // 게임과 같은 굵기
  const turnRate = L => { const x = Math.min(1, Math.max(0, (L - 10) / 250)); return K.TURN * (0.35 + 0.65 * (1 - x) ** 2); };

  // ── 패널
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;left:10px;top:calc(env(safe-area-inset-top,0px) + 80px);z-index:9;background:rgba(27,20,38,.92);color:#eee;border:1px solid #6b4fa0;border-radius:10px;padding:8px 10px;font:12.5px/1.6 'Malgun Gothic',sans-serif;width:230px";
  const row = (k, t) => `<label style="display:block"><input type="checkbox" data-k="${k}"> ${t}</label>`;
  panel.innerHTML = `<b style="color:#c9a6ff">🧪 헬퍼</b> <button data-fold style="float:right;font:inherit;background:none;border:0;color:#c9a6ff;cursor:pointer">접기</button>
    <div data-body>
    <div style="color:#bbb">보기 도우미</div>
    ${row("radar", "레이더 (가까운 머리·방향)")}${row("path", "예상 경로 + 충돌 경고")}${row("food", "먹이 많은 곳 안내")}${row("arrow", "AI 추천 방향")}${row("zoom", "넓게 보기 (1.6배)")}${row("buzz", "위험하면 진동 (휴대폰)")}
    <div style="color:#bbb;margin-top:4px">대신 조종</div>
    ${row("guard", "예측 회피 (부딪히기 직전만)")}${row("auto", "자동 조종 (AI)")}
    <div style="color:#bbb;margin-top:4px">조작 방식 (공부용)</div>
    <label style="display:block"><input type="radio" name="hm" value="event"> 마우스 이벤트 넣기</label>
    <label style="display:block"><input type="radio" name="hm" value="var"> 게임 변수 직접 바꾸기</label>
    ${row("human", "사람처럼 위장")}
    <div data-out style="color:#c9a6ff">대기 중</div>
    <button data-off style="font:inherit;padding:3px 9px;border-radius:6px;border:1px solid #6b4fa0;background:#2a1f3d;color:#eee;cursor:pointer">헬퍼 끄기</button></div>`;
  document.body.appendChild(panel);
  const opt = { radar: true, path: true, food: false, arrow: false, zoom: false, buzz: false, guard: false, auto: false, human: false, how: "var" };
  function apply(p) {
    Object.assign(opt, p || {});
    panel.querySelectorAll("[data-k]").forEach(c => { c.checked = !!opt[c.dataset.k]; });
    panel.querySelectorAll("[name=hm]").forEach(r => { r.checked = r.value === opt.how; });
    G.view.zoom = opt.zoom ? 1.6 : 1;
    panel.hidden = false;
  }
  apply(preset);
  panel.querySelectorAll("[data-k]").forEach(c => c.addEventListener("change", () => { opt[c.dataset.k] = c.checked; if (c.dataset.k === "zoom") G.view.zoom = c.checked ? 1.6 : 1; }));
  panel.querySelectorAll("[name=hm]").forEach(r => r.addEventListener("change", () => { opt.how = r.value; }));
  panel.querySelector("[data-fold]").onclick = e => { const b = panel.querySelector("[data-body]"); b.hidden = !b.hidden; e.target.textContent = b.hidden ? "펴기" : "접기"; };
  if (innerWidth < 600) panel.querySelector("[data-fold]").click();
  const out = panel.querySelector("[data-out]");

  // ── 오버레이: 게임 캔버스 위에 투명 캔버스를 하나 더 (감지기는 이것도 잡음)
  const cv = G.view.canvas;
  const ov = document.createElement("canvas");
  ov.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:2";
  document.body.appendChild(ov);
  const ox = ov.getContext("2d");
  function fit() { const d = Math.min(devicePixelRatio || 1, 2); ov.width = Math.round(cv.clientWidth * d); ov.height = Math.round(cv.clientHeight * d); ox.setTransform(d, 0, 0, d, 0, 0); }
  fit(); addEventListener("resize", fit);

  // ── ① 읽기: 장애물 목록 (남의 몸·머리), B 방식 관찰값
  function obstacles(me) {
    const obs = [];
    for (const t of G.snakes) {
      if (t === me || !t.alive || t.prot) continue;
      const r = radius(t.length);
      if (Math.hypot(t.head[0] - me.head[0], t.head[1] - me.head[1]) < 30 + t.length) { obs.push([t.head[0], t.head[1], r]); for (const p of t.pts) obs.push([p[0], p[1], r]); }
    }
    return obs;
  }
  function observe(me) {
    const o = new Float32Array(N_SECT * 4 + 2), R = G.zoneR;
    const minF = Array(N_SECT).fill(VIEW), cnt = Array(N_SECT).fill(0), minB = Array(N_SECT).fill(VIEW);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - me.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N_SECT) % N_SECT; };
    for (const f of G.food) { if (!f) continue; const dx = f[0] - me.head[0], dy = f[1] - me.head[1], d = Math.hypot(dx, dy); if (d < VIEW) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const t of G.snakes) {
      if (t === me || !t.alive) continue;
      const rad = radius(t.length);
      for (const p of t.pts) { const dx = p[0] - me.head[0], dy = p[1] - me.head[1], d = Math.hypot(dx, dy) - rad; if (d < VIEW) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], Math.max(d, 0)); } }
    }
    for (let k = 0; k < N_SECT; k++) {
      const mid = me.ang + (k + 0.5) / N_SECT * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = me.head[0] * dx + me.head[1] * dy, c = me.head[0] ** 2 + me.head[1] ** 2 - R ** 2;
      const wall = -b + Math.sqrt(Math.max(b * b - c, 0));
      o[k * 4] = 1 - minF[k] / VIEW; o[k * 4 + 1] = Math.min(cnt[k] / 8, 1); o[k * 4 + 2] = 1 - minB[k] / VIEW; o[k * 4 + 3] = 1 - Math.min(wall, VIEW) / VIEW;
    }
    o[64] = Math.min(me.length / 100, 1); o[65] = me.length > L_MIN + 1 ? 1 : 0;
    return o;
  }
  function decide(o) {
    let h = o;
    brain.forEach((L, li) => { const y = new Float32Array(L.b.length); for (let i = 0; i < L.b.length; i++) { let s = L.b[i]; const w = L.W[i]; for (let j = 0; j < h.length; j++) s += w[j] * h[j]; y[i] = li < 2 ? Math.tanh(s) : s; } h = y; });
    let b = 0; for (let i = 1; i < 6; i++) if (h[i] > h[b]) b = i;
    return b;
  }

  // ── ② 판단: 미래 예측. 조작 방식(policy) 하나를 N틱 시뮬레이션해서 몇 틱 뒤에 부딪히는지 (안 부딪히면 N+1)
  const N = 14;
  function simulate(me, obs, policy, boost, keepPath) {
    let x = me.head[0], y = me.head[1], ang = me.ang;
    const len = me.length, R = G.zoneR, path = keepPath ? [[x, y]] : null, tr = turnRate(len);
    for (let k = 1; k <= N; k++) {
      ang += tr * policy(ang, k, x, y);
      const v = boost && len > L_MIN + 1 ? K.BOOST : K.SPEED;
      x += v * Math.cos(ang); y += v * Math.sin(ang);
      if (path) path.push([x, y]);
      if (Math.hypot(x, y) > R - 0.4) return { ttc: k, path };
      for (const o of obs) if (Math.abs(o[0] - x) < o[2] + 0.4 && Math.abs(o[1] - y) < o[2] + 0.4 && Math.hypot(o[0] - x, o[1] - y) < o[2] + 0.25) return { ttc: k, path };
    }
    return { ttc: N + 1, path };
  }
  const steerTo = want => ang => { const d = ((want - ang) % TAU + TAU * 1.5) % TAU - Math.PI; return Math.abs(d) < 0.06 ? 0 : d > 0 ? 1 : -1; };
  function humanPolicy() {                                                  // 사람이 지금 하려는 조작을 그대로 이어 간다고 가정
    const inp = G.input;
    if (inp.turn) return () => inp.turn;
    if (inp.aim != null) return steerTo(inp.aim);
    return () => 0;
  }
  // 후보 조작: 계속 왼쪽/직진/오른쪽, 잠깐 틀고 직진 — 각각 부스트 켜고 끄고
  const CANDS = [];
  for (const turn of [-1, 0, 1]) for (const hold of [N, 5]) for (const boost of [false, true]) if (!(turn === 0 && hold === 5)) CANDS.push({ turn, hold, boost, policy: (a, k) => (k <= hold ? turn : 0) });

  // ── ③ 조작
  let boosting = false;
  function steer(aim, boost) {
    const me = G.me;
    if (opt.how === "var") { G.input.aim = aim; G.input.target = null; G.input.turn = 0; G.input.boost = boost; return; }
    const world = [me.head[0] + 8 * Math.cos(aim), me.head[1] + 8 * Math.sin(aim)];
    const [x, y] = G.view.toScreen(world), r = cv.getBoundingClientRect();
    const ev = t => new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 7, pointerType: "mouse" });
    cv.dispatchEvent(ev("pointermove"));
    if (boost && !boosting) cv.dispatchEvent(ev("pointerdown"));
    if (!boost && boosting) cv.dispatchEvent(ev("pointerup"));
    boosting = boost;
  }

  const last = { action: 1, danger: false, human: null, foodAt: null };
  let dangerSince = 0, alive = true, timer = null, wasTaking = false, buzzed = false;
  function densestFood(me) {                                                // 반경 40 안 5칸 격자에서 먹이 값 합이 가장 큰 곳
    const cells = new Map();
    for (const f of G.food) {
      if (!f) continue;
      const dx = f[0] - me.head[0], dy = f[1] - me.head[1]; if (dx * dx + dy * dy > 1600) continue;
      const k = Math.floor(f[0] / 5) + "," + Math.floor(f[1] / 5), c = cells.get(k) || [0, 0, 0], w = f[3] || 1;
      c[0] += w; c[1] += f[0] * w; c[2] += f[1] * w; cells.set(k, c);
    }
    let best = null; for (const c of cells.values()) if (!best || c[0] > best[0]) best = c;
    return best && best[0] >= 4 ? [best[1] / best[0], best[2] / best[0], best[0]] : null;
  }
  function loop() {
    if (!alive) return;
    const me = G.me;
    if (me && me.alive) {
      const obs = obstacles(me), now = performance.now();
      const hum = simulate(me, obs, humanPolicy(), G.input.boost, true);
      last.human = hum; last.danger = hum.ttc <= N;
      if (brain && (opt.arrow || opt.auto)) last.action = decide(observe(me));
      if (last.danger && !dangerSince) dangerSince = now;
      if (!last.danger) dangerSince = 0;
      if (opt.buzz && last.danger && !buzzed && navigator.vibrate) { navigator.vibrate(60); buzzed = true; }
      if (!last.danger) buzzed = false;
      if (opt.food && (!last.foodAt || Math.random() < 0.1)) last.foodAt = densestFood(me);
      let take = false;
      if (opt.auto && brain) {                                              // 자동 조종: AI가 고른 방향
        const a = last.action; steer(me.ang + (a % 3 - 1) * 0.6, a >= 3); take = true; out.textContent = "자동 조종 중";
      } else if (opt.guard && last.danger && now - dangerSince >= (opt.human ? 200 + Math.random() * 150 : 0)) {
        // 예측 회피: 사람 조작대로면 부딪힘 → 후보 중 가장 오래 안전한 것 (같으면 부스트 없이, 사람이 가려던 쪽에 가까운 것)
        const wantSide = G.input.aim != null ? Math.sign(Math.sin(G.input.aim - me.ang)) : 0;
        let best = null;
        for (const c of CANDS) { const r = simulate(me, obs, c.policy, c.boost, false); const sc = r.ttc * 10 - (c.boost ? 3 : 0) - (c.turn === wantSide ? 0 : 1); if (!best || sc > best.sc) best = { c, sc, ttc: r.ttc }; }
        if (best && best.ttc > hum.ttc) { steer(me.ang + best.c.turn * 1.2, best.c.boost); take = true; out.textContent = `위험! 피하는 중 (${best.ttc > N ? "안전한 길 찾음" : best.ttc + "틱 버팀"})`; }
      }
      if (!take) { if (wasTaking && boosting) steer(me.ang, false); if (wasTaking && opt.how === "var") G.input.boost = false; out.textContent = last.danger ? `위험! ${hum.ttc}틱 뒤 부딪힘` : "보는 중"; }
      wasTaking = take;
    }
    timer = setTimeout(loop, opt.human ? 30 + Math.random() * 90 : 50);
  }
  loop();

  function draw() {
    if (!alive) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    ox.clearRect(0, 0, W, H);
    const me = G.me, S = G.view.scale;
    if (me && me.alive) {
      const [hx, hy] = G.view.toScreen(me.head);
      if (opt.radar) {
        for (const t of G.snakes) {
          if (t === me || !t.alive || Math.hypot(t.head[0] - me.head[0], t.head[1] - me.head[1]) > 20) continue;
          const [tx, ty] = G.view.toScreen(t.head);
          ox.strokeStyle = "rgba(255,90,120,.85)"; ox.lineWidth = 2; ox.beginPath(); ox.arc(tx, ty, 3 * S, 0, TAU); ox.stroke();
          ox.beginPath(); ox.moveTo(tx, ty); ox.lineTo(tx + Math.cos(t.ang) * 6 * S, ty - Math.sin(t.ang) * 6 * S); ox.stroke();
        }
      }
      if (opt.path && last.human && last.human.path) {                       // 예상 경로: 안전하면 하늘색, 부딪히면 빨강 + X
        const p = last.human.path;
        ox.strokeStyle = last.danger ? "rgba(255,80,100,.95)" : "rgba(120,220,255,.6)"; ox.lineWidth = 3; ox.setLineDash([6, 5]);
        ox.beginPath(); p.forEach((q, i) => { const [x, y] = G.view.toScreen(q); i ? ox.lineTo(x, y) : ox.moveTo(x, y); }); ox.stroke(); ox.setLineDash([]);
        if (last.danger) { const [x, y] = G.view.toScreen(p[p.length - 1]); ox.strokeStyle = "#ff5a78"; ox.lineWidth = 4; ox.beginPath(); ox.moveTo(x - 8, y - 8); ox.lineTo(x + 8, y + 8); ox.moveTo(x + 8, y - 8); ox.lineTo(x - 8, y + 8); ox.stroke(); }
      }
      if (opt.food && last.foodAt) {                                         // 먹이 안내: 화면 안이면 동그라미, 밖이면 가장자리 화살표
        const [fx, fy] = G.view.toScreen(last.foodAt);
        if (fx > 20 && fy > 20 && fx < W - 20 && fy < H - 20) { ox.strokeStyle = "rgba(255,214,102,.9)"; ox.lineWidth = 3; ox.beginPath(); ox.arc(fx, fy, 22, 0, TAU); ox.stroke(); }
        else {
          const a = Math.atan2(fy - H / 2, fx - W / 2), rr = Math.min(W, H) / 2 - 30, ex = W / 2 + Math.cos(a) * rr, ey = H / 2 + Math.sin(a) * rr;
          ox.fillStyle = "rgba(255,214,102,.95)"; ox.beginPath(); ox.moveTo(ex + Math.cos(a) * 16, ey + Math.sin(a) * 16); ox.lineTo(ex + Math.cos(a + 2.5) * 12, ey + Math.sin(a + 2.5) * 12); ox.lineTo(ex + Math.cos(a - 2.5) * 12, ey + Math.sin(a - 2.5) * 12); ox.fill();
          ox.font = "600 12px sans-serif"; ox.fillText("먹이 " + Math.round(last.foodAt[2]), ex - 18, ey + 26);
        }
      }
      if (opt.arrow) {
        const dir = me.ang + (last.action % 3 - 1) * 0.6, [px, py] = G.view.toScreen([me.head[0] + 6 * Math.cos(dir), me.head[1] + 6 * Math.sin(dir)]);
        ox.strokeStyle = "#c9a6ff"; ox.lineWidth = 3; ox.beginPath(); ox.moveTo(hx, hy); ox.lineTo(px, py); ox.stroke();
        ox.fillStyle = "#c9a6ff"; ox.beginPath(); ox.arc(px, py, 5, 0, TAU); ox.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  function off() {
    alive = false; clearTimeout(timer); ov.remove(); panel.remove();
    if (boosting && G.me) steer(G.me.ang, false);
    G.input.boost = false; G.view.zoom = 1;
    delete window.__snakeHelper;
  }
  panel.querySelector("[data-off]").addEventListener("click", off);
  window.__snakeHelper = { panel, apply, off };
})();

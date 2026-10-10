/* 지렁이 대결 헬퍼 (실습용) — 게임과 따로 떨어진 스크립트가 페이지에 주입되어 일하는 구조
   실제 브라우저 게임 헬퍼와 같은 세 층:
     ① 읽기: 페이지 변수 window.game 에서 지렁이·먹이·내 위치를 읽고, B 방식 관찰값을 스스로 계산
     ② 판단: 학습된 AI 신경망(brains.json)이 갈 방향을 고름
     ③ 조작: 마우스 이벤트를 만들어 넣거나(이벤트 방식), 게임의 입력 변수를 직접 바꿈(변수 방식 = 옛 slither 봇들)
   메뉴의 '헬퍼'로 고르면 같은 파일이 붙고(이름 앞 🧪), 북마크로 몰래 붙이면 감지기가 잡는지 실습할 수 있음.
   이 게임(우리 사이트) 전용. 다른 사람들과 하는 실제 게임에서는 쓰지 않는다. */
(() => {
  const preset = window.__helperPreset || {};
  if (window.__snakeHelper) { window.__snakeHelper.apply(preset); return; }
  const G = window.game;
  if (!G) { alert("지렁이 대결 페이지에서 실행하세요"); return; }
  const BASE = (document.currentScript && document.currentScript.src) || location.href;
  const TAU = Math.PI * 2, { R_ARENA, N_SECT, VIEW, L_MIN } = G.consts;
  let brain = null;
  fetch(new URL("brains.json", BASE)).then(r => r.json()).then(b => { brain = b.trained; });

  // ── 패널
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;right:10px;top:calc(env(safe-area-inset-top,0px) + 210px);z-index:9;background:rgba(27,20,38,.92);color:#eee;border:1px solid #6b4fa0;border-radius:10px;padding:8px 10px;font:12.5px/1.55 'Malgun Gothic',sans-serif;width:220px";
  panel.innerHTML = `<b style="color:#c9a6ff">🧪 헬퍼</b> <button data-fold style="float:right;font:inherit;background:none;border:0;color:#c9a6ff;cursor:pointer">접기</button>
    <div data-body>
    <label style="display:block"><input type="checkbox" data-k="radar"> 레이더</label>
    <label style="display:block"><input type="checkbox" data-k="arrow"> AI 추천 방향</label>
    <label style="display:block"><input type="checkbox" data-k="guard"> 위험할 때 대신 피하기</label>
    <label style="display:block"><input type="checkbox" data-k="auto"> 자동 조종</label>
    <div style="color:#bbb">조작 방식 (공부용)</div>
    <label style="display:block"><input type="radio" name="hm" value="event"> 마우스 이벤트 넣기</label>
    <label style="display:block"><input type="radio" name="hm" value="var"> 게임 변수 직접 바꾸기</label>
    <label style="display:block"><input type="checkbox" data-k="human"> 사람처럼 위장</label>
    <div data-out style="color:#c9a6ff">대기 중</div>
    <button data-off style="font:inherit;padding:3px 9px;border-radius:6px;border:1px solid #6b4fa0;background:#2a1f3d;color:#eee;cursor:pointer">헬퍼 끄기</button></div>`;
  document.body.appendChild(panel);
  const opt = { radar: true, arrow: true, guard: false, auto: false, human: false, how: "event" };
  function apply(p) {
    Object.assign(opt, p || {});
    panel.querySelectorAll("[data-k]").forEach(c => { c.checked = !!opt[c.dataset.k]; });
    panel.querySelectorAll("[name=hm]").forEach(r => { r.checked = r.value === opt.how; });
    panel.hidden = false;
  }
  apply(preset);
  panel.querySelectorAll("[data-k]").forEach(c => c.addEventListener("change", () => { opt[c.dataset.k] = c.checked; }));
  panel.querySelectorAll("[name=hm]").forEach(r => r.addEventListener("change", () => { opt.how = r.value; }));
  panel.querySelector("[data-fold]").onclick = e => { const b = panel.querySelector("[data-body]"); b.hidden = !b.hidden; e.target.textContent = b.hidden ? "펴기" : "접기"; };
  if (innerWidth < 600) panel.querySelector("[data-fold]").click();          // 휴대폰은 접힌 채로 시작
  const out = panel.querySelector("[data-out]");

  // ── 오버레이: 게임 캔버스 위에 투명 캔버스를 하나 더 (감지기는 이것도 잡음)
  const cv = G.view.canvas;
  const ov = document.createElement("canvas");
  ov.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:2";
  document.body.appendChild(ov);
  const ox = ov.getContext("2d");
  function fit() { const d = Math.min(devicePixelRatio || 1, 2); ov.width = Math.round(cv.clientWidth * d); ov.height = Math.round(cv.clientHeight * d); ox.setTransform(d, 0, 0, d, 0, 0); }
  fit(); addEventListener("resize", fit);

  // ── ① 읽기: B 방식 관찰값 (게임 코드와 독립적으로 다시 계산)
  function observe(me) {
    const o = new Float32Array(N_SECT * 4 + 2);
    const minF = Array(N_SECT).fill(VIEW), cnt = Array(N_SECT).fill(0), minB = Array(N_SECT).fill(VIEW);
    const sect = (dx, dy) => { let a = (Math.atan2(dy, dx) - me.ang) % TAU; if (a < 0) a += TAU; return Math.floor(a / TAU * N_SECT) % N_SECT; };
    for (const f of G.food) { if (!f) continue; const dx = f[0] - me.head[0], dy = f[1] - me.head[1], d = Math.hypot(dx, dy); if (d < VIEW) { const k = sect(dx, dy); minF[k] = Math.min(minF[k], d); cnt[k]++; } }
    for (const t of G.snakes) {
      if (t === me || !t.alive) continue;
      const rad = 0.5 + 0.01 * t.length;
      for (const p of t.pts) { const dx = p[0] - me.head[0], dy = p[1] - me.head[1], d = Math.hypot(dx, dy) - rad; if (d < VIEW) { const k = sect(dx, dy); minB[k] = Math.min(minB[k], Math.max(d, 0)); } }
    }
    for (let k = 0; k < N_SECT; k++) {
      const mid = me.ang + (k + 0.5) / N_SECT * TAU, dx = Math.cos(mid), dy = Math.sin(mid);
      const b = me.head[0] * dx + me.head[1] * dy, c = me.head[0] ** 2 + me.head[1] ** 2 - R_ARENA ** 2;
      const wall = -b + Math.sqrt(Math.max(b * b - c, 0));
      o[k * 4] = 1 - minF[k] / VIEW; o[k * 4 + 1] = Math.min(cnt[k] / 8, 1); o[k * 4 + 2] = 1 - minB[k] / VIEW; o[k * 4 + 3] = 1 - Math.min(wall, VIEW) / VIEW;
    }
    o[64] = Math.min(me.length / 100, 1); o[65] = me.length > L_MIN + 1 ? 1 : 0;
    return o;
  }
  // ── ② 판단: 신경망에서 가장 높은 행동
  function decide(o) {
    let h = o;
    brain.forEach((L, li) => { const y = new Float32Array(L.b.length); for (let i = 0; i < L.b.length; i++) { let s = L.b[i]; const w = L.W[i]; for (let j = 0; j < h.length; j++) s += w[j] * h[j]; y[i] = li < 2 ? Math.tanh(s) : s; } h = y; });
    let b = 0; for (let i = 1; i < 6; i++) if (h[i] > h[b]) b = i;
    return b;
  }
  const frontDanger = o => Math.max(...[15, 0, 1].map(k => Math.max(o[k * 4 + 2], o[k * 4 + 3])));

  // ── ③ 조작
  const aimPoint = (me, action) => { const dir = me.ang + (action % 3 - 1) * 0.6; return [me.head[0] + 8 * Math.cos(dir), me.head[1] + 8 * Math.sin(dir)]; };
  let boosting = false;
  function steer(world, boost) {
    if (opt.how === "var") { G.input.target = world; G.input.turn = 0; G.input.boost = boost; return; }
    const [x, y] = G.view.toScreen(world), r = cv.getBoundingClientRect();
    const ev = t => new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 7, pointerType: "mouse" });
    cv.dispatchEvent(ev("pointermove"));
    if (boost && !boosting) cv.dispatchEvent(ev("pointerdown"));
    if (!boost && boosting) cv.dispatchEvent(ev("pointerup"));
    boosting = boost;
  }

  let last = { action: 1, danger: 0 }, dangerSince = 0, alive = true, timer = null, wasTaking = false;
  function loop() {
    if (!alive) return;
    const me = G.me;
    if (brain && me && me.alive) {
      const o = observe(me), a = decide(o), d = frontDanger(o), now = performance.now();
      last = { action: a, danger: d };
      if (d > 0.55 && !dangerSince) dangerSince = now;
      if (d < 0.35) dangerSince = 0;
      const delay = opt.human ? 200 + Math.random() * 150 : 0;            // 위장: 위험을 '알아차리는' 데 사람만큼 걸린 척
      const take = opt.auto || (opt.guard && dangerSince && now - dangerSince >= delay);
      if (take) {
        let p = aimPoint(me, a);
        if (opt.human) p = [p[0] + (Math.random() - .5) * 2, p[1] + (Math.random() - .5) * 2];
        steer(p, a >= 3);
        out.textContent = opt.auto ? "자동 조종 중" : "위험! 대신 피하는 중";
      } else {
        if (wasTaking && boosting) steer(me.head, false);
        out.textContent = d > 0.55 ? "위험!" : "보는 중";
      }
      wasTaking = take;
    }
    timer = setTimeout(loop, opt.human ? 30 + Math.random() * 90 : 50);
  }
  loop();

  function draw() {
    if (!alive) return;
    ox.clearRect(0, 0, ov.width, ov.height);
    const me = G.me, S = G.view.scale;
    if (me && me.alive) {
      const [hx, hy] = G.view.toScreen(me.head);
      if (opt.radar) {
        for (const t of G.snakes) {
          if (t === me || !t.alive) continue;
          if (Math.hypot(t.head[0] - me.head[0], t.head[1] - me.head[1]) > 16) continue;
          const [tx, ty] = G.view.toScreen(t.head);
          ox.strokeStyle = "rgba(255,90,120,.85)"; ox.lineWidth = 2; ox.beginPath(); ox.arc(tx, ty, 3 * S, 0, TAU); ox.stroke();
          ox.beginPath(); ox.moveTo(tx, ty); ox.lineTo(tx + Math.cos(t.ang) * 4 * S, ty - Math.sin(t.ang) * 4 * S); ox.stroke();
        }
        ox.strokeStyle = last.danger > 0.55 ? "rgba(255,90,120,.9)" : "rgba(201,166,255,.4)"; ox.lineWidth = 3;
        ox.beginPath(); ox.arc(hx, hy, VIEW * S * 0.45, -me.ang - 0.6, -me.ang + 0.6); ox.stroke();
      }
      if (opt.arrow) {
        const p = G.view.toScreen(aimPoint(me, last.action));
        ox.strokeStyle = "#c9a6ff"; ox.lineWidth = 3; ox.beginPath(); ox.moveTo(hx, hy); ox.lineTo(p[0], p[1]); ox.stroke();
        ox.fillStyle = "#c9a6ff"; ox.beginPath(); ox.arc(p[0], p[1], 5, 0, TAU); ox.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  function off() {
    alive = false; clearTimeout(timer); ov.remove(); panel.remove();
    if (boosting && G.me) steer(G.me.head, false);
    G.input.boost = false;
    delete window.__snakeHelper;
  }
  panel.querySelector("[data-off]").addEventListener("click", off);
  window.__snakeHelper = { panel, apply, off };
})();

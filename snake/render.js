/* 지렁이 대결 — 그리기: 내 지렁이를 따라가는 카메라, 육각 바닥, 빛나는 먹이, 눈 달린 지렁이, 미니맵·순위표 */
const RND = (() => {
  const { C, TAU, radius } = SNK;
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const mini = document.getElementById("mini"), mctx = mini.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const Q = { maxDpr: coarse ? 1.5 : 2, gap: coarse ? 0.6 : 0.45, ema: 16, low: 0, lastT: 0 };   // gap = 구슬 간격(반지름 배수)
  const cam = { x: 0, y: 0, ppu: 20, follow: null, whole: false, zoom: 1 };   // ppu = 화면 픽셀 / 게임 1칸, zoom = 헬퍼 "넓게 보기" 배율

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, Q.maxDpr);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  window.addEventListener("resize", resize);

  // 육각 바닥 무늬 (한 번 그려 두고 반복)
  function hexTile(size) {
    const w = size * Math.sqrt(3), h = size * 3;
    const t = document.createElement("canvas"); t.width = Math.round(w); t.height = Math.round(h);
    const g = t.getContext("2d");
    g.fillStyle = "#151b22"; g.fillRect(0, 0, t.width, t.height);
    const hex = (cx, cy) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(cx + size * 0.92 * Math.cos(a), cy + size * 0.92 * Math.sin(a)); } g.closePath(); g.fill(); g.stroke(); };
    g.fillStyle = "#1c242d"; g.strokeStyle = "#10151b"; g.lineWidth = size * 0.12;
    hex(0, 0); hex(w, 0); hex(w / 2, h / 2); hex(0, h); hex(w, h);
    return t;
  }
  let pattern = null, patternSize = 0;

  // 먹이: 색마다 빛 번짐 그림을 미리 만들어 두고 찍기
  const foodSprites = {};
  function foodSprite(hue) {
    if (foodSprites[hue]) return foodSprites[hue];
    const s = document.createElement("canvas"); s.width = s.height = 48;
    const g = s.getContext("2d"), grd = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grd.addColorStop(0, `hsla(${hue},100%,85%,1)`); grd.addColorStop(0.22, `hsla(${hue},100%,62%,.95)`); grd.addColorStop(0.5, `hsla(${hue},100%,55%,.25)`); grd.addColorStop(1, `hsla(${hue},100%,50%,0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 48, 48);
    return (foodSprites[hue] = s);
  }

  const sx = x => (x - cam.x) * cam.ppu + W / 2, sy = y => -(y - cam.y) * cam.ppu + H / 2;

  // 몸 구슬: 색마다 '가운데 밝고 가장자리 어두운' 둥근 그림을 미리 만들어 두고 찍기 (slither처럼 구슬을 겹친 입체 몸)
  const beads = {};
  function bead(hue, light) {
    const key = hue + "|" + light;
    if (beads[key]) return beads[key];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grd = g.createRadialGradient(26, 24, 2, 32, 32, 32);
    grd.addColorStop(0, `hsl(${hue},85%,${light + 22}%)`);
    grd.addColorStop(0.55, `hsl(${hue},80%,${light}%)`);
    grd.addColorStop(0.92, `hsl(${hue},75%,${Math.max(8, light - 22)}%)`);
    grd.addColorStop(1, `hsla(${hue},75%,${Math.max(5, light - 28)}%,0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(32, 32, 32, 0, TAU); g.fill();
    return (beads[key] = c);
  }
  const glows = {};
  function glow(hue) {
    if (glows[hue]) return glows[hue];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, `hsla(${hue},100%,70%,.28)`); grd.addColorStop(1, `hsla(${hue},100%,60%,0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return (glows[hue] = c);
  }

  function drawSnake(s, isMe) {
    const r = Math.max(2.5, radius(s.length) * cam.ppu);                 // 그리는 굵기 = 부딪힘 굵기
    const hx = sx(s.head[0]), hy = sy(s.head[1]);
    // 머리 → 꼬리 점들을 촘촘히 (구슬 사이가 벌어지지 않게 반지름의 0.45배 간격으로 채움)
    const chain = [[hx, hy], ...s.pts.map(p => [sx(p[0]), sy(p[1])])];
    const dots = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const [ax, ay] = chain[i], [bx, by] = chain[i + 1], d = Math.hypot(bx - ax, by - ay), m = Math.max(1, Math.ceil(d / (r * Q.gap)));
      for (let j = 0; j < m; j++) dots.push([ax + (bx - ax) * j / m, ay + (by - ay) * j / m, i]);
    }
    if (chain.length) dots.push([...chain[chain.length - 1], chain.length - 1]);
    if (s.prot) ctx.globalAlpha = 0.45 + 0.2 * Math.sin(performance.now() / 120);   // 보호 중: 반투명 깜빡임
    if (s.boosting) {                                                     // 부스트: 몸 주위 은은한 빛
      const gl = glow(s.hue), gr = r * 2.6;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < dots.length; i += 4) { const d = dots[i]; ctx.drawImage(gl, d[0] - gr, d[1] - gr, gr * 2, gr * 2); }
      ctx.globalCompositeOperation = "source-over";
    }
    const base = isMe ? 52 : 46, bA = bead(s.hue, base), bB = bead(s.hue, base - 9);   // 3마디마다 살짝 어두운 줄무늬
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];
      if (d[0] < -r || d[1] < -r || d[0] > W + r || d[1] > H + r) continue;
      ctx.drawImage(Math.floor(d[2] / 3) % 2 ? bB : bA, d[0] - r, d[1] - r, r * 2, r * 2);
    }
    ctx.drawImage(bead(s.hue, base + 4), hx - r * 1.08, hy - r * 1.08, r * 2.16, r * 2.16);
    // 눈: 크고 흰 눈 + 앞을 보는 검은 눈동자
    const fx = Math.cos(s.ang), fy = -Math.sin(s.ang), px = -fy, py = fx;
    for (const side of [-1, 1]) {
      const ex = hx + fx * r * 0.4 + px * side * r * 0.48, ey = hy + fy * r * 0.4 + py * side * r * 0.48;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, r * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = "#151515"; ctx.beginPath(); ctx.arc(ex + fx * r * 0.17, ey + fy * r * 0.17, r * 0.22, 0, TAU); ctx.fill();
    }
    // 이름
    ctx.font = `600 ${Math.max(11, Math.min(15, r * 0.9))}px "IBM Plex Sans KR", system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.fillStyle = isMe ? "#ffe9a8" : "rgba(230,236,234,.85)";
    ctx.fillText((s.helper ? "🧪 " : "") + s.name, hx, hy - r * 1.9);
    ctx.globalAlpha = 1;
  }

  // 2초 넘게 초당 40장 밑이면 한 단계 낮춤 (해상도 → 구슬 간격), 최대 4단계
  function adapt() {
    const now = performance.now(), dt = Q.lastT ? now - Q.lastT : 16; Q.lastT = now;
    if (dt > 250) return;                                                // 탭 전환 등은 빼고
    Q.ema += (dt - Q.ema) * 0.05;
    Q.low = Q.ema > 25 ? Q.low + 1 : 0;
    if (Q.low > 120) {
      Q.low = 0;
      if (Q.maxDpr > 1) { Q.maxDpr = Math.max(1, Q.maxDpr - 0.5); resize(); }
      else if (Q.gap < 0.9) Q.gap += 0.15;
    }
  }
  function frame(snakes, food, meId, camId = meId, zoneR = C.R_ARENA, tick = 0) {
    if (!W) resize();
    adapt();
    const me = snakes.find(s => s.id === meId), tgt = snakes.find(s => s.id === camId) || me;
    if (cam.whole || !tgt) { cam.x = 0; cam.y = 0; cam.ppu = Math.min(W, H) / (C.R_ARENA * 2 + 4); }
    else {
      const viewR = Math.min(60, 17 + 1.5 * (Math.sqrt(Math.max(10, tgt.length)) - Math.sqrt(10))) * cam.zoom;   // 길어질수록 멀리 보기 (10: 17, 100: 27, 318: 39, 1000: 59). 헬퍼 넓게 보기면 더
      const ppu = Math.sqrt(W * H) / (2 * viewR);                        // 세로 휴대폰에서도 너무 확대되지 않게 면적 기준
      cam.ppu += (ppu - cam.ppu) * 0.1;                                  // 확대 비율은 천천히
      if (tgt.alive) {                                                   // 머리는 이미 보간돼 부드러우니 거의 그대로 따라감 (관전 대상 바꿀 땐 미끄러지듯)
        const f = Math.hypot(tgt.head[0] - cam.x, tgt.head[1] - cam.y) > 6 ? 0.15 : 0.85;
        cam.x += (tgt.head[0] - cam.x) * f; cam.y += (tgt.head[1] - cam.y) * f;
      }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 바닥: 무늬는 한 번만 만들고 확대·축소는 변환으로 (크기가 바뀔 때마다 새로 만들면 끊김)
    if (!pattern) { pattern = ctx.createPattern(hexTile(28), "repeat"); patternSize = 28; }
    ctx.fillStyle = "#0b0e12"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.arc(sx(0), sy(0), C.R_ARENA * cam.ppu, 0, TAU); ctx.clip();
    const k20 = cam.ppu / 20;                                            // 무늬 28px = 게임 1.4칸
    ctx.translate(-cam.x * cam.ppu + W / 2, cam.y * cam.ppu + H / 2); ctx.scale(k20, k20);
    ctx.fillStyle = pattern; ctx.fillRect(-C.R_ARENA * 20 - 60, -C.R_ARENA * 20 - 60, C.R_ARENA * 40 + 120, C.R_ARENA * 40 + 120);
    ctx.restore();
    // 경계 (붉은 띠). 배틀로얄로 줄어든 경기장이면 바깥을 붉게 어둡게 + 줄어든 경계를 깜빡이는 띠로
    if (zoneR < C.R_ARENA - 0.3) {
      ctx.save(); ctx.beginPath(); ctx.arc(sx(0), sy(0), C.R_ARENA * cam.ppu, 0, TAU); ctx.arc(sx(0), sy(0), zoneR * cam.ppu, 0, TAU, true);
      ctx.fillStyle = "rgba(120,10,25,.45)"; ctx.fill("evenodd"); ctx.restore();
      ctx.strokeStyle = `rgba(255,70,90,${0.6 + 0.3 * Math.sin(performance.now() / 200)})`; ctx.lineWidth = Math.max(4, cam.ppu * 0.6);
      ctx.beginPath(); ctx.arc(sx(0), sy(0), zoneR * cam.ppu, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,60,80,.55)"; ctx.lineWidth = Math.max(3, cam.ppu * 0.5);
    ctx.beginPath(); ctx.arc(sx(0), sy(0), C.R_ARENA * cam.ppu, 0, TAU); ctx.stroke();
    // 먹이 (반짝임)
    // 크기는 값에 따라: 보통 +1 작게, 죽은 지렁이가 남긴 큰 먹이는 크고 밝게 (실제 게임처럼 몸 자리에 촘촘히)
    const t = performance.now() / 300, fs = Math.max(10, cam.ppu * 1.5);
    for (let i = 0; i < food.length; i++) {
      const f = food[i]; if (!f) continue;
      const x = sx(f[0]), y = sy(f[1]), val = f[3] ?? 1, big = i >= C.N_NORM && val > 0.6;
      const left = f[4] ? (f[4] - tick) / 100 : 1;                         // 사라지기 5초(100틱) 전부터 줄어들며 흐려짐
      const size = fs * (big ? 1.3 + val * 1.4 : val < 0.6 ? 0.8 : 1) * Math.max(0.15, Math.min(1, left));
      if (x < -size || y < -size || x > W + size || y > H + size) continue;
      const k = size * (0.85 + 0.15 * Math.sin(t + i));
      ctx.drawImage(foodSprite(f[2] ?? 50), x - k / 2, y - k / 2, k, k);
    }
    // 지렁이 (내 것은 맨 위)
    for (const s of snakes) if (s.alive && s.id !== meId) drawSnake(s, false);
    if (me && me.alive) drawSnake(me, true);
    drawMini(snakes, meId, zoneR);
  }

  function drawMini(snakes, meId, zoneR) {
    const m = mini.width, c = m / 2, k = (m / 2 - 3) / C.R_ARENA;
    mctx.clearRect(0, 0, m, m);
    mctx.fillStyle = "rgba(20,26,32,.75)"; mctx.beginPath(); mctx.arc(c, c, m / 2 - 1, 0, TAU); mctx.fill();
    mctx.strokeStyle = "rgba(255,255,255,.25)"; mctx.lineWidth = 1; mctx.stroke();
    if (zoneR < C.R_ARENA - 0.3) { mctx.strokeStyle = "rgba(255,70,90,.9)"; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(c, c, zoneR * k, 0, TAU); mctx.stroke(); }
    for (const s of snakes) {
      if (!s.alive) continue;
      const me = s.id === meId;
      mctx.fillStyle = me ? "#ffe9a8" : `hsla(${s.hue},70%,60%,.85)`;
      for (let i = 0; i < s.pts.length; i += 4) { const p = s.pts[i]; mctx.fillRect(c + p[0] * k - 1, c - p[1] * k - 1, 2, 2); }
      mctx.beginPath(); mctx.arc(c + s.head[0] * k, c - s.head[1] * k, me ? 3.5 : 2.2, 0, TAU); mctx.fill();
    }
  }

  // 화면 좌표 ↔ 게임 좌표 (헬퍼·입력이 씀)
  const toWorld = (clientX, clientY) => { const r = cv.getBoundingClientRect(); const x = clientX - r.left, y = clientY - r.top; return [(x - W / 2) / cam.ppu + cam.x, -(y - H / 2) / cam.ppu + cam.y]; };
  const toScreen = p => [sx(p[0]), sy(p[1])];
  return { frame, resize, cam, toWorld, toScreen, canvas: cv, get size() { return { W, H }; }, get quality() { return { dpr: DPR, gap: Q.gap, ms: Math.round(Q.ema) }; } };
})();

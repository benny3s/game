/* 지렁이 대결 — 그리기: 내 지렁이를 따라가는 카메라, 육각 바닥, 빛나는 먹이, 눈 달린 지렁이, 미니맵·순위표 */
const RND = (() => {
  const { C, TAU, radius } = SNK;
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const mini = document.getElementById("mini"), mctx = mini.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const cam = { x: 0, y: 0, ppu: 20, follow: null, whole: false };   // ppu = 화면 픽셀 / 게임 1칸

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
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

  function drawSnake(s, isMe) {
    const r = Math.max(2.5, radius(s.length) * cam.ppu * 1.05);
    const pts = s.pts;
    const hx = sx(s.head[0]), hy = sy(s.head[1]);
    const sat = isMe ? 85 : 65;
    // 몸: 이어진 관 (진한 테두리 → 본색 → 가운데 밝은 줄 = 입체감) + 3마디마다 줄무늬
    const path = () => { ctx.beginPath(); ctx.moveTo(hx, hy); for (const p of pts) ctx.lineTo(sx(p[0]), sy(p[1])); };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (s.boosting) { ctx.shadowColor = `hsl(${s.hue},100%,60%)`; ctx.shadowBlur = r * 1.8; }
    path(); ctx.strokeStyle = `hsl(${s.hue},${sat}%,30%)`; ctx.lineWidth = r * 2.1; ctx.stroke();
    ctx.shadowBlur = 0;
    path(); ctx.strokeStyle = `hsl(${s.hue},${sat}%,48%)`; ctx.lineWidth = r * 1.8; ctx.stroke();
    ctx.fillStyle = `hsl(${s.hue},${sat}%,40%)`;
    for (let i = 2; i < pts.length; i += 6) { const p = pts[i]; ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r * 0.85, 0, TAU); ctx.fill(); }
    path(); ctx.strokeStyle = `hsla(${s.hue},${sat}%,72%,.45)`; ctx.lineWidth = r * 0.55; ctx.stroke();
    ctx.fillStyle = `hsl(${s.hue},${sat}%,52%)`;
    ctx.beginPath(); ctx.arc(hx, hy, r * 1.1, 0, TAU); ctx.fill();
    // 눈: 머리가 향하는 쪽
    const fx = Math.cos(s.ang), fy = -Math.sin(s.ang), px = -fy, py = fx;
    for (const side of [-1, 1]) {
      const ex = hx + fx * r * 0.45 + px * side * r * 0.5, ey = hy + fy * r * 0.45 + py * side * r * 0.5;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, r * 0.38, 0, TAU); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex + fx * r * 0.14, ey + fy * r * 0.14, r * 0.2, 0, TAU); ctx.fill();
    }
    // 이름
    ctx.font = `600 ${Math.max(11, Math.min(15, r * 0.9))}px "IBM Plex Sans KR", system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.fillStyle = isMe ? "#ffe9a8" : "rgba(230,236,234,.85)";
    ctx.fillText((s.helper ? "🧪 " : "") + s.name, hx, hy - r * 1.9);
  }

  function frame(snakes, food, meId) {
    if (!W) resize();
    const me = snakes.find(s => s.id === meId);
    if (cam.whole || !me) { cam.x = 0; cam.y = 0; cam.ppu = Math.min(W, H) / (C.R_ARENA * 2 + 4); }
    else {
      const viewR = Math.min(30, 17 + me.length * 0.06);                 // 길어질수록 조금씩 멀리 보기
      cam.ppu = Math.sqrt(W * H) / (2 * viewR);                          // 세로 휴대폰에서도 너무 확대되지 않게 면적 기준
      if (me.alive) { cam.x += (me.head[0] - cam.x) * 0.35; cam.y += (me.head[1] - cam.y) * 0.35; }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // 바닥
    const tileSize = Math.max(8, cam.ppu * 1.4);
    if (!pattern || Math.abs(patternSize - tileSize) > 0.5) { pattern = ctx.createPattern(hexTile(tileSize), "repeat"); patternSize = tileSize; }
    ctx.fillStyle = "#0b0e12"; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.arc(sx(0), sy(0), C.R_ARENA * cam.ppu, 0, TAU); ctx.clip();
    ctx.translate(-cam.x * cam.ppu + W / 2, cam.y * cam.ppu + H / 2); ctx.fillStyle = pattern; ctx.fillRect(-C.R_ARENA * cam.ppu - tileSize * 4, -C.R_ARENA * cam.ppu - tileSize * 4, C.R_ARENA * cam.ppu * 2 + tileSize * 8, C.R_ARENA * cam.ppu * 2 + tileSize * 8);
    ctx.restore();
    // 경계 (붉은 띠)
    ctx.strokeStyle = "rgba(255,60,80,.55)"; ctx.lineWidth = Math.max(3, cam.ppu * 0.5);
    ctx.beginPath(); ctx.arc(sx(0), sy(0), C.R_ARENA * cam.ppu, 0, TAU); ctx.stroke();
    // 먹이 (반짝임)
    const t = performance.now() / 300, fs = Math.max(10, cam.ppu * 1.5);
    for (let i = 0; i < food.length; i++) {
      const f = food[i], x = sx(f[0]), y = sy(f[1]);
      if (x < -fs || y < -fs || x > W + fs || y > H + fs) continue;
      const k = fs * (0.85 + 0.15 * Math.sin(t + i));
      ctx.drawImage(foodSprite(f[2] ?? 50), x - k / 2, y - k / 2, k, k);
    }
    // 지렁이 (내 것은 맨 위)
    for (const s of snakes) if (s.alive && s.id !== meId) drawSnake(s, false);
    if (me && me.alive) drawSnake(me, true);
    drawMini(snakes, meId);
  }

  function drawMini(snakes, meId) {
    const m = mini.width, c = m / 2, k = (m / 2 - 3) / C.R_ARENA;
    mctx.clearRect(0, 0, m, m);
    mctx.fillStyle = "rgba(20,26,32,.75)"; mctx.beginPath(); mctx.arc(c, c, m / 2 - 1, 0, TAU); mctx.fill();
    mctx.strokeStyle = "rgba(255,255,255,.25)"; mctx.lineWidth = 1; mctx.stroke();
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
  return { frame, resize, cam, toWorld, toScreen, canvas: cv, get size() { return { W, H }; } };
})();

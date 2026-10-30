/* 냥냥 배구 — 그림 (캔버스 2D). 코어 상태를 읽어 그리기만 함 (상태는 안 바꿈)
   - 배경(하늘·바다·모래·파라솔·야자수)은 크기가 바뀔 때만 따로 그려 두고, 매 프레임엔 붙인 뒤 구름·물결만 움직임
   - 세계 좌표: x 0~640 (벽~벽), y 모래(0)에서 위로 +. 고양이는 '발 가운데 기준 · 앞(그물 쪽)이 +x · 위가 +y' 로 그림
   - 효과(먼지·모래·반짝이·흔들림·표정)는 코어가 돌려준 일(events)을 보고 여기서 만듦
   VolleyArt.create(canvas) → { resize, setFurs, reset, events, draw } · VolleyArt.portrait(fur, px) → 작은 고양이 그림 */
(function (root) {
  'use strict';
  const V = root.Volley, C = V.C;
  const TAU = Math.PI * 2;
  const GROUND_D = 46, MIN_TOP = 380, PAD_X = 10;          // 모래 아래쪽 보이는 깊이 · 하늘 최소 높이 · 벽 바깥 여백
  const INK = '#5b4636';
  // 스매시 방향 힌트 화살표: 이름 → (앞쪽 성분, 위쪽 성분). 앞 = 그물 쪽
  const AIM_VEC = { power: [1, -0.3], drive: [1, 0], spike: [0.3, -1], dunk: [0.8, -0.8], lob: [0.25, 1], rise: [0.85, 0.55], back: [-1, 0.4], set: [-0.45, 1] };
  // 작은 화살표 (화면 좌표, 끝점 기준 · dx dy 는 단위 방향)
  function arrowTo(g, x, y, dx, dy, len, w, col) {
    const bx = x - dx * len, by = y - dy * len, hx = -dy, hy = dx, hl = w * 2.6;
    for (const halo of [true, false]) {                           // 흰 테두리 먼저 → 하늘색 배경에서도 보이게
      g.beginPath(); g.moveTo(bx, by); g.lineTo(x - dx * hl * 0.6, y - dy * hl * 0.6); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = halo ? 'rgba(255,255,255,.85)' : col; g.lineWidth = halo ? w + 3 : w; g.stroke();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - dx * hl + hx * hl * 0.62, y - dy * hl + hy * hl * 0.62); g.lineTo(x - dx * hl - hx * hl * 0.62, y - dy * hl - hy * hl * 0.62); g.closePath();
      if (halo) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.stroke(); } else { g.fillStyle = col; g.fill(); }
    }
  }

  // 털 색 (치즈 · 고등어 · 까망 · 삼색)
  const FURS = {
    cheese: { name: '치즈', base: '#ffc684', shade: '#f2a45e', stripe: '#ec9246', belly: '#fff3e0', ear: '#ffb3a3', nose: '#f2847c', eye: INK, line: '#6e4b33', pattern: 'tabby', paw: '#fff3e0', bean: '#ffa8a0', accent: '#ff9a5a' },
    mackerel: { name: '고등어', base: '#d2cac0', shade: '#b4a99c', stripe: '#8b8075', belly: '#f8f3ec', ear: '#f5b6ae', nose: '#ee9393', eye: INK, line: '#594a40', pattern: 'tabby', paw: '#f8f3ec', bean: '#f3a1a1', accent: '#9ec9f5' },
    black: { name: '까망', base: '#554a4b', shade: '#43393a', belly: '#6a5d5d', ear: '#d99a9e', nose: '#f0a0a8', eye: '#f4d064', pupil: '#2e2626', line: '#2e2525', pattern: 'none', slit: true, whisker: 'rgba(255,248,240,.7)', paw: '#554a4b', bean: '#e89aa2', accent: '#c7a8f0' },
    calico: { name: '삼색', base: '#fffaf2', shade: '#efe3d4', patchA: '#f6a95c', patchB: '#5e4a42', belly: '#ffffff', ear: '#ffb6ad', nose: '#f29a95', eye: INK, line: '#6b5244', pattern: 'calico', earFront: '#f6a95c', earBack: '#5e4a42', paw: '#ffffff', bean: '#ffa9a3', accent: '#7cc9b4' },
  };
  const FUR_IDS = ['cheese', 'mackerel', 'black', 'calico'];

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - (1 - t) * (1 - t) * (1 - t);
  // 그림용 난수 (화면 효과만 · 코어와 무관)
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function star(g, x, y, r, n, inner, rot) {
    g.beginPath();
    for (let k = 0; k < n * 2; k++) { const a = rot + k * Math.PI / n, q = k % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function heart(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.3, y, x - r * 0.9, y - r * 1.1, x, y - r * 0.4);
    g.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.3, y, x, y + r * 0.9); g.closePath();
  }

  // ── 카메라: 캔버스 크기 → 세계를 어떻게 보여 줄지 (너비에 맞추고, 너무 납작하면 높이에 맞춰 옆 풍경을 더 보여 줌)
  // reserve = 양옆에 비워 둘 너비(px, 폰 가로에서 엄지 단추 자리) → 코트가 단추 밑으로 들어가지 않게
  function camera(w, h, reserve) {
    const VW = C.W + PAD_X * 2;
    let s = w / VW;
    if (h / s < GROUND_D + MIN_TOP) s = h / (GROUND_D + MIN_TOP);
    if (reserve > 0 && w - 2 * reserve < VW * s) s = Math.max(s * 0.6, (w - 2 * reserve) / VW);   // 단추 자리는 비우되 너무 작아지진 않게
    const free = h / s - GROUND_D - MIN_TOP;
    const gd = GROUND_D + Math.max(0, Math.min(40, free * 0.3));   // 세로로 길면 앞쪽 모래도 조금 더
    const ox = w / 2 - (C.W / 2) * s, oy = h - gd * s;
    return { s, ox, oy, w, h, gd, top: oy / s, left: -ox / s, right: (w - ox) / s };
  }
  // 무대 칸에 맞는 캔버스 크기 (maxTop = 하늘을 최대 얼마나 보여 줄지)
  function sizeFor(w, h, maxTop) {
    const s = w / (C.W + PAD_X * 2);
    if (s * (GROUND_D + MIN_TOP) <= h) return { w: Math.floor(w), h: Math.floor(Math.min(h, s * (GROUND_D + 40 + (maxTop || 520)))) };
    const s2 = h / (GROUND_D + MIN_TOP);
    return { w: Math.floor(Math.min(w, s2 * (C.W + PAD_X * 2) * 1.6)), h: Math.floor(h) };
  }

  // ════════ 고양이 (제 발 기준 · 앞이 +x · 위가 +y) ════════
  function bodyPath(g) {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(22, 0, 36, 8, 36, 30);
    g.bezierCurveTo(36, 52, 32, 66, 24, 74);
    g.bezierCurveTo(16, 81, -16, 81, -24, 74);
    g.bezierCurveTo(-32, 66, -36, 52, -36, 30);
    g.bezierCurveTo(-36, 8, -22, 0, 0, 0);
    g.closePath();
  }
  function tri(g, a, b, c) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); }
  function earPair(g, fur, lw, ears) {
    ears.forEach((e, k) => {
      tri(g, e[0], e[1], e[2]);
      g.fillStyle = k === 0 ? (fur.earBack || fur.shade) : (fur.earFront || fur.base); g.fill();
      g.strokeStyle = fur.line; g.lineWidth = lw; g.stroke();
      const cx = (e[0][0] + e[1][0] + e[2][0]) / 3, cy = (e[0][1] + e[1][1] + e[2][1]) / 3;
      const sh = p => [cx + (p[0] - cx) * 0.52, cy + (p[1] - cy) * 0.52 - 1.5];
      tri(g, sh(e[0]), sh(e[1]), sh(e[2])); g.fillStyle = fur.ear; g.fill();
    });
  }
  function tailStroke(g, fur, lw, pts) {
    g.beginPath(); g.moveTo(pts[0], pts[1]); g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    g.strokeStyle = fur.line; g.lineWidth = 10 + lw * 2; g.stroke();
    g.strokeStyle = fur.pattern === 'calico' ? fur.patchB : fur.base; g.lineWidth = 10; g.stroke();
    if (fur.pattern === 'tabby') {                                    // 꼬리 줄무늬 두 개
      g.strokeStyle = fur.stripe; g.lineWidth = 3;
      for (const u of [0.55, 0.8]) {
        const x = bez(pts[0], pts[2], pts[4], pts[6], u), y = bez(pts[1], pts[3], pts[5], pts[7], u);
        line(g, x - 4.5, y - 1.5, x + 4.5, y + 1.5);
      }
    }
  }
  const bez = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
  function foot(g, fur, lw, x, y) { ell(g, x, y, 10, 5.5); g.fillStyle = fur.paw; g.fill(); g.strokeStyle = fur.line; g.lineWidth = lw; g.stroke(); }

  function bodyFill(g, fur, lw) {
    bodyPath(g); g.fillStyle = fur.base; g.fill();
    g.save(); bodyPath(g); g.clip();
    g.fillStyle = fur.shade; g.globalAlpha = 0.6; ell(g, -33, 22, 18, 40); g.fill(); g.globalAlpha = 1;   // 등 쪽 그늘
    if (fur.pattern === 'calico') {
      g.fillStyle = fur.patchA; ell(g, -18, 70, 21, 14, -0.3); g.fill();
      g.fillStyle = fur.patchB; ell(g, -30, 38, 13, 17, 0.2); g.fill();
      g.fillStyle = fur.patchA; ell(g, 30, 8, 9, 7); g.fill();
    }
    g.fillStyle = fur.belly; ell(g, 13, 22, 18, 19); g.fill();          // 배
    if (fur.pattern === 'tabby') {
      g.strokeStyle = fur.stripe; g.lineWidth = 3.2;
      for (const x of [5, 12, 19]) line(g, x - 1, 80, x + (x - 12) * 0.25, 71.5);   // 이마 줄무늬
      for (const y of [58, 45, 32]) { g.beginPath(); g.moveTo(-38, y); g.quadraticCurveTo(-30, y + 3, -24, y - 1); g.stroke(); }   // 등 줄무늬
    }
    g.fillStyle = 'rgba(255,255,255,.22)'; ell(g, 6, 66, 15, 7, -0.15); g.fill();   // 머리 위 빛
    g.restore();
    bodyPath(g); g.strokeStyle = fur.line; g.lineWidth = lw; g.stroke();
  }

  // 얼굴: P.eyes = open|blink|happy|dizzy|effort|sad · P.mouth = w|open|o|wavy|frown · P.look = [x, y] (-1~1)
  function face(g, fur, P, lw, ox, oy, k) {
    ox = ox || 0; oy = oy || 0; k = k || 1;
    const E = [[ox + 3 * k, oy + 55], [ox + 21 * k, oy + 55]];
    const mx = ox + 14 * k, my = oy;
    g.fillStyle = `rgba(255,120,120,${P.eyes === 'happy' ? 0.55 : 0.33})`;
    ell(g, ox - 3 * k, oy + 46.5, 4.6, 2.6); g.fill(); ell(g, ox + 27.5 * k, oy + 46.5, 4.2, 2.5); g.fill();
    g.strokeStyle = fur.whisker || 'rgba(91,70,54,.5)'; g.lineWidth = lw * 0.55;
    line(g, ox + 26 * k, oy + 48.5, ox + 37 * k, oy + 50.5); line(g, ox + 26 * k, oy + 46, ox + 37 * k, oy + 45);
    line(g, ox + 0, oy + 48.5, ox - 9 * k, oy + 50.5); line(g, ox + 0, oy + 46, ox - 9 * k, oy + 45);
    tri(g, [mx - 2.4, my + 50.6], [mx + 2.4, my + 50.6], [mx, my + 47.6]); g.fillStyle = fur.nose; g.fill();   // 코
    g.strokeStyle = fur.line; g.lineWidth = lw * 0.8;
    const m = P.mouth || 'w';
    if (m === 'open') {
      g.beginPath(); g.moveTo(mx - 4, my + 46.2); g.bezierCurveTo(mx - 3.5, my + 39.2, mx + 3.5, my + 39.2, mx + 4, my + 46.2); g.closePath();
      g.fillStyle = '#e46f73'; g.fill(); g.stroke(); g.fillStyle = '#ffa3a8'; ell(g, mx, my + 42, 2.3, 1.4); g.fill();
    } else if (m === 'o') { ell(g, mx, my + 43.4, 2.1, 2.5); g.fillStyle = '#e46f73'; g.fill(); g.stroke(); }
    else if (m === 'wavy') { g.beginPath(); g.moveTo(mx - 4.5, my + 44); g.quadraticCurveTo(mx - 2.2, my + 46.5, mx, my + 44); g.quadraticCurveTo(mx + 2.2, my + 41.5, mx + 4.5, my + 44); g.stroke(); }
    else if (m === 'frown') { g.beginPath(); g.moveTo(mx - 3.6, my + 42.5); g.quadraticCurveTo(mx, my + 46.5, mx + 3.6, my + 42.5); g.stroke(); }
    else { g.beginPath(); g.moveTo(mx - 3.6, my + 46.4); g.quadraticCurveTo(mx - 1.8, my + 43.6, mx, my + 46.2); g.quadraticCurveTo(mx + 1.8, my + 43.6, mx + 3.6, my + 46.4); g.stroke(); }
    // 눈
    const ey = P.eyes || 'open';
    g.lineWidth = lw * 0.95; g.strokeStyle = fur.slit ? '#2a2020' : fur.line;
    for (let i = 0; i < 2; i++) {
      const [ex, ey0] = E[i];
      if (ey === 'open') {
        const x = ex + P.look[0] * 1.5, y = ey0 + P.look[1] * 1.2;
        if (fur.slit) {
          ell(g, ex, ey0, 4.9, 5.7); g.fillStyle = fur.eye; g.fill(); g.lineWidth = lw * 0.6; g.stroke();
          ell(g, x + P.look[0] * 0.5, y, 1.8, 4.2); g.fillStyle = fur.pupil; g.fill();
        } else { ell(g, x, y, 4.4, 5.4); g.fillStyle = fur.eye; g.fill(); }
        g.fillStyle = '#fff'; circ(g, x + 1.5, y + 1.9, 1.75); g.fill(); circ(g, x - 1.3, y - 1.7, 0.8); g.fill();
        if (P.brows) { g.lineWidth = lw * 0.9; g.strokeStyle = fur.slit ? 'rgba(255,248,240,.75)' : fur.line; i === 0 ? line(g, ex - 4.2, ey0 + 9.2, ex + 3.4, ey0 + 7.2) : line(g, ex - 3.4, ey0 + 7.2, ex + 4.2, ey0 + 9.2); }
      } else if (ey === 'blink') { g.beginPath(); g.moveTo(ex - 4, ey0); g.quadraticCurveTo(ex, ey0 - 3, ex + 4, ey0); g.stroke(); }
      else if (ey === 'happy') { g.beginPath(); g.moveTo(ex - 4.2, ey0 - 1.6); g.quadraticCurveTo(ex, ey0 + 5.4, ex + 4.2, ey0 - 1.6); g.stroke(); }
      else if (ey === 'effort') { g.beginPath(); const d = i === 0 ? 1 : -1; g.moveTo(ex - 3.4 * d, ey0 + 3.2); g.lineTo(ex + 2.6 * d, ey0); g.lineTo(ex - 3.4 * d, ey0 - 3.2); g.stroke(); }
      else if (ey === 'sad') {
        g.beginPath(); g.moveTo(ex - 4, ey0 + 1.5); g.quadraticCurveTo(ex, ey0 - 2.5, ex + 4, ey0 + 1.5); g.stroke();
        g.fillStyle = '#9ed3f0'; g.beginPath(); g.moveTo(ex + 1, ey0 - 2); g.quadraticCurveTo(ex + 3.4, ey0 - 7, ex + 1, ey0 - 8.2); g.quadraticCurveTo(ex - 1.4, ey0 - 7, ex + 1, ey0 - 2); g.fill();
      } else if (ey === 'dizzy') {
        g.beginPath();
        for (let a = 0; a < 9.6; a += 0.35) { const r = 0.4 + a * 0.46, q = a + (P.spin || 0) * (i ? -1 : 1); g.lineTo(ex + Math.cos(q) * r, ey0 + Math.sin(q) * r); }
        g.stroke();
      }
    }
  }
  function paw(g, fur, lw, x, y, r, beans) {
    circ(g, x, y, r); g.fillStyle = fur.paw; g.fill(); g.strokeStyle = fur.line; g.lineWidth = lw; g.stroke();
    if (beans) {
      g.fillStyle = fur.bean; ell(g, x + 0.6, y - 1, r * 0.38, r * 0.3); g.fill();
      for (const [dx, dy] of [[-r * 0.45, r * 0.42], [r * 0.12, r * 0.6], [r * 0.62, r * 0.25]]) { circ(g, x + dx, y + dy, r * 0.17); g.fill(); }
    }
  }

  // 서 있는(뛰는) 고양이 한 마리
  function drawStand(g, fur, P, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    const w = P.tail;
    tailStroke(g, fur, lw, [-27, 13, -52, 10, -60 + w * 4, 36, -50 + w * 7, 54 + w * 2]);
    for (const [x0, ph] of [[-14, 0], [14, Math.PI]]) {              // 발 (달리면 번갈아)
      const x = x0 + Math.sin(P.run + ph) * P.stride, y = 3 + Math.max(0, Math.cos(P.run + ph)) * P.lift + P.tuck;
      foot(g, fur, lw, x, y);
    }
    const tw = P.ear || 0;
    earPair(g, fur, lw, [[[-29, 62], [-21 - tw, 93 + tw], [-6, 75]], [[4, 75], [22 + tw, 95 + tw], [29, 62]]]);
    // 앞발을 머리 위로 든 동안은 몸 뒤에 (얼굴을 가리지 않게), 앞으로 내리칠 때는 몸 앞에
    const back = P.arm != null && P.arm > 1.15;
    if (back) armDraw(g, fur, P, lw);
    bodyFill(g, fur, lw);
    face(g, fur, P, lw);
    if (P.arm != null && !back) armDraw(g, fur, P, lw);
  }
  function armDraw(g, fur, P, lw) {
    const sx = 16, sy = 46, L = P.armLen || 31, px = sx + Math.cos(P.arm) * L, py = sy + Math.sin(P.arm) * L;
    if (P.swoosh > 0.02) {
      g.beginPath(); g.arc(sx, sy, L + 10, Math.min(P.arm, P.arm0), Math.max(P.arm, P.arm0));
      g.strokeStyle = `rgba(255,255,255,${0.85 * P.swoosh})`; g.lineWidth = 7; g.stroke();
    }
    g.strokeStyle = fur.line; g.lineWidth = 11 + lw * 2; line(g, sx, sy, px, py);
    g.strokeStyle = fur.base; g.lineWidth = 11; line(g, sx, sy, px, py);
    paw(g, fur, lw, px, py, 8.2, true);
  }

  // 몸 날려 받기 (가로로 누운 모양)
  // 몸 날려 받기: 배를 깔고 앞으로 쭉 (앞쪽이 둥근 머리)
  function diveBody(g) {
    g.beginPath();
    g.moveTo(-34, 20);
    g.bezierCurveTo(-34, 4, -16, 1, 4, 1);
    g.bezierCurveTo(30, 1, 49, 8, 49, 27);
    g.bezierCurveTo(49, 45, 39, 54, 26, 54);
    g.bezierCurveTo(16, 54, 10, 48, 4, 43);
    g.bezierCurveTo(-12, 45, -34, 38, -34, 20);
    g.closePath();
  }
  function drawDive(g, fur, P, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    tailStroke(g, fur, lw, [-30, 24, -46, 26, -54, 38 + P.tail * 3, -66, 34 + P.tail * 5]);
    foot(g, fur, lw, -35, 8); foot(g, fur, lw, -39, 18);
    earPair(g, fur, lw, [[[12, 48], [2, 64], [24, 53]], [[24, 54], [24, 70], [40, 50]]]);
    diveBody(g); g.fillStyle = fur.base; g.fill();
    g.save(); diveBody(g); g.clip();
    g.fillStyle = fur.shade; g.globalAlpha = 0.55; ell(g, -14, 44, 34, 11); g.fill(); g.globalAlpha = 1;
    if (fur.pattern === 'calico') { g.fillStyle = fur.patchA; ell(g, 22, 52, 15, 8); g.fill(); g.fillStyle = fur.patchB; ell(g, -22, 30, 11, 12); g.fill(); }
    g.fillStyle = fur.belly; ell(g, 8, 3, 32, 10); g.fill();
    if (fur.pattern === 'tabby') { g.strokeStyle = fur.stripe; g.lineWidth = 3.2; for (const x of [-22, -11, 0]) line(g, x, 46, x + 3, 37); for (const x of [22, 29]) line(g, x, 55, x + 1, 47); }
    g.fillStyle = 'rgba(255,255,255,.2)'; ell(g, 22, 47, 12, 5); g.fill();
    g.restore();
    diveBody(g); g.strokeStyle = fur.line; g.lineWidth = lw; g.stroke();
    face(g, fur, P, lw, 21, -22, 1);
    // 앞발: 모래 위로 쭉 뻗음 (얼굴 아래)
    for (const [y0, x1, y1, beans] of [[6, 60, 5, true], [12, 63, 13, false]]) {
      g.strokeStyle = fur.line; g.lineWidth = 9 + lw * 2; line(g, 30, y0, x1, y1);
      g.strokeStyle = fur.base; g.lineWidth = 9; line(g, 30, y0, x1, y1);
      paw(g, fur, lw, x1, y1, 6.4, beans);
    }
  }

  // ════════ 공 ════════
  const PANEL = ['#ffb194', '#fff6e8', '#a8dfcf'];
  function drawBall(g, x, y, r, spin, sq, sqAng, lw) {
    g.save(); g.translate(x, y);
    if (sq > 0.01) { g.rotate(sqAng); g.scale(1 + sq, 1 - sq * 0.8); g.rotate(-sqAng); }
    circ(g, 0, 0, r); g.fillStyle = '#fffaf0'; g.fill();
    g.save(); circ(g, 0, 0, r); g.clip(); g.rotate(spin);
    for (let k = 0; k < 3; k++) {                                    // 휘감긴 판 세 장
      const a0 = k * TAU / 3, a1 = a0 + TAU / 3;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(a0 + 0.9) * r * 0.75, Math.sin(a0 + 0.9) * r * 0.75, Math.cos(a0) * r * 1.05, Math.sin(a0) * r * 1.05);
      g.arc(0, 0, r * 1.05, a0, a1);
      g.quadraticCurveTo(Math.cos(a1 + 0.9) * r * 0.75, Math.sin(a1 + 0.9) * r * 0.75, 0, 0);
      g.fillStyle = PANEL[k]; g.fill();
    }
    g.strokeStyle = 'rgba(176,132,96,.55)'; g.lineWidth = Math.max(0.8, r * 0.07);
    for (let k = 0; k < 3; k++) {
      const a0 = k * TAU / 3;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a0 + 0.9) * r * 0.75, Math.sin(a0 + 0.9) * r * 0.75, Math.cos(a0) * r, Math.sin(a0) * r); g.stroke();
    }
    g.restore();
    const hl = g.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.05, -r * 0.2, -r * 0.2, r * 1.15);
    hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(0.35, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(140,98,70,.28)');
    circ(g, 0, 0, r); g.fillStyle = hl; g.fill();
    g.strokeStyle = INK; g.lineWidth = lw; g.stroke();
    g.restore();
  }

  // ════════ 배경 ════════
  function drawBackground(g, cam) {
    const { s, w, h } = cam, X = x => cam.ox + x * s, Y = y => cam.oy - y * s;
    const hor = Y(150), shore = Y(68);
    let gr = g.createLinearGradient(0, 0, 0, hor);
    gr.addColorStop(0, '#ffd9c8'); gr.addColorStop(0.55, '#ffe9da'); gr.addColorStop(1, '#fff5e8');
    g.fillStyle = gr; g.fillRect(0, 0, w, hor + 1);
    // 해
    const sx = X(505), sy = Y(318);
    gr = g.createRadialGradient(sx, sy, 0, sx, sy, 95 * s);
    gr.addColorStop(0, 'rgba(255,236,170,.9)'); gr.addColorStop(0.35, 'rgba(255,232,170,.45)'); gr.addColorStop(1, 'rgba(255,232,170,0)');
    g.fillStyle = gr; g.fillRect(sx - 100 * s, sy - 100 * s, 200 * s, 200 * s);
    circ(g, sx, sy, 27 * s); g.fillStyle = '#ffe7a0'; g.fill();
    circ(g, sx, sy, 27 * s); g.strokeStyle = 'rgba(255,205,120,.6)'; g.lineWidth = 2 * s; g.stroke();
    // 바다
    gr = g.createLinearGradient(0, hor, 0, shore);
    gr.addColorStop(0, '#c6ecdf'); gr.addColorStop(1, '#93d5c3');
    g.fillStyle = gr; g.fillRect(0, hor, w, shore - hor + 1);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, hor - 0.5, w, Math.max(1, 1.2 * s));
    // 먼 섬
    const ix = X(120), iy = hor;
    g.fillStyle = '#addcc6';
    g.beginPath(); g.moveTo(ix - 70 * s, iy); g.quadraticCurveTo(ix - 30 * s, iy - 16 * s, ix + 10 * s, iy - 12 * s); g.quadraticCurveTo(ix + 50 * s, iy - 10 * s, ix + 70 * s, iy); g.closePath(); g.fill();
    g.strokeStyle = '#9ccfb8'; g.lineWidth = 2 * s;
    g.beginPath(); g.moveTo(ix - 6 * s, iy - 13 * s); g.quadraticCurveTo(ix - 4 * s, iy - 26 * s, ix + 2 * s, iy - 33 * s); g.stroke();
    g.fillStyle = '#9ccfb8';
    for (const a of [-2.6, -1.9, -1.2, -0.5]) { ell(g, ix + 2 * s + Math.cos(a) * 7 * s, iy - 33 * s + Math.sin(a) * 4 * s, 7 * s, 2.2 * s, a); g.fill(); }
    // 모래
    gr = g.createLinearGradient(0, shore, 0, h);
    gr.addColorStop(0, '#f8e2bd'); gr.addColorStop(0.25, '#fbe8c8'); gr.addColorStop(1, '#f5d6a6');
    g.fillStyle = gr; g.fillRect(0, shore, w, h - shore);
    g.fillStyle = 'rgba(222,184,128,.25)'; g.fillRect(0, shore, w, 6 * s);          // 젖은 모래 띠
    seed = 777;
    for (let i = 0; i < 190; i++) {                                    // 모래 알갱이
      const x = rr(cam.left, cam.right), y = rr(-cam.gd, 64);
      g.fillStyle = rnd() < 0.6 ? 'rgba(214,170,110,.35)' : 'rgba(255,248,232,.8)';
      circ(g, X(x), Y(y), rr(0.8, 1.9) * s); g.fill();
    }
    // 먼 모래사장: 파라솔 (왼쪽) · 야자수 (오른쪽)
    drawParasol(g, X, Y, s, 52, 66);
    drawPalm(g, X, Y, s, 612, 62);
    // 앞쪽 장식: 불가사리 · 조개 (모래가 깊으면 모래성도)
    drawStarfish(g, X(70), Y(-26), 9 * s, 0.3);
    drawShell(g, X(C.W - 64), Y(-30), 8 * s);
    drawStarfish(g, X(C.W + 70), Y(-20), 7 * s, -0.4);
    if (cam.gd > 72) { drawCastle(g, X(C.W - 150), Y(-58), s); drawBucket(g, X(150), Y(-60), s); }
    // 코트 끝 말뚝
    for (const x of [-5, C.W + 5]) {
      const px = X(x), w2 = 4 * s;
      ell(g, px, Y(-3), 9 * s, 2.6 * s); g.fillStyle = 'rgba(150,105,70,.15)'; g.fill();
      rrect(g, px - w2, Y(30), w2 * 2, 33 * s, w2); g.fillStyle = '#e2b386'; g.fill(); g.strokeStyle = '#a97a55'; g.lineWidth = 1.4 * s; g.stroke();
      rrect(g, px - w2, Y(30), w2 * 2, 7 * s, w2); g.fillStyle = '#ff9f7f'; g.fill();
    }
  }
  // 먼 모래사장 소품: 제자리(x0, y0)에서 위가 +y 인 작은 좌표로 그림
  function local(g, X, Y, x0, y0, sc) { g.save(); g.translate(X(x0), Y(y0)); g.scale(sc, -sc); g.lineJoin = 'round'; g.lineCap = 'round'; }
  function drawParasol(g, X, Y, s, x0, y0) {
    local(g, X, Y, x0, y0, s);
    ell(g, 16, -1, 46, 4); g.fillStyle = 'rgba(150,105,70,.10)'; g.fill();
    g.strokeStyle = '#a97a55'; g.lineWidth = 6; line(g, 0, 0, 12, 106);
    g.strokeStyle = '#d8aa7c'; g.lineWidth = 3.6; line(g, 0, 0, 12, 106);
    g.translate(12, 104); g.rotate(-0.1);
    const R = 62, H = 34, n = 6;
    const dome = () => {
      g.beginPath(); g.moveTo(-R, 0); g.bezierCurveTo(-R * 0.9, H * 1.25, R * 0.9, H * 1.25, R, 0);
      for (let k = n - 1; k >= 0; k--) { const xa = -R + k * 2 * R / n; g.quadraticCurveTo(xa + R / n, -7, xa, 0); }   // 아래 가장자리 물결
      g.closePath();
    };
    dome(); g.fillStyle = '#fff4e8'; g.fill();
    g.save(); dome(); g.clip();
    for (let k = 0; k < n; k += 2) {                                   // 줄무늬
      const xa = -R + k * 2 * R / n, xb = xa + 2 * R / n;
      g.beginPath(); g.moveTo(0, H * 1.05); g.lineTo(xa * 1.05, -8); g.lineTo(xb * 1.05, -8); g.closePath(); g.fillStyle = '#ffa486'; g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, -18, 22, 22, 7, 0.3); g.fill();
    g.restore();
    dome(); g.strokeStyle = '#d98466'; g.lineWidth = 1.8; g.stroke();
    circ(g, 0, H * 0.98, 3.6); g.fillStyle = '#ffd36e'; g.fill(); g.strokeStyle = '#d99f3c'; g.lineWidth = 1.2; g.stroke();
    g.restore();
  }
  function drawPalm(g, X, Y, s, x0, y0) {
    local(g, X, Y, x0, y0, s);
    const P = [0, 0, 8, 70, -2, 150, -20, 220];
    ell(g, -14, -1, 44, 4.5); g.fillStyle = 'rgba(150,105,70,.10)'; g.fill();
    g.beginPath(); g.moveTo(P[0], P[1]); g.bezierCurveTo(P[2], P[3], P[4], P[5], P[6], P[7]);
    g.strokeStyle = '#b98a5e'; g.lineWidth = 15; g.stroke();
    g.strokeStyle = '#dcb084'; g.lineWidth = 11; g.stroke();
    g.strokeStyle = 'rgba(160,115,75,.5)'; g.lineWidth = 2;
    for (let u = 0.07; u < 0.95; u += 0.1) { const x = bez(P[0], P[2], P[4], P[6], u), y = bez(P[1], P[3], P[5], P[7], u); line(g, x - 5, y - 1.5, x + 5, y + 1); }
    const cx = P[6], cy = P[7] + 2;
    const leaves = [[2.75, 70, '#86c8a0'], [2.25, 78, '#9ad4ae'], [1.6, 52, '#86c8a0'], [0.95, 76, '#9ad4ae'], [0.4, 72, '#86c8a0'], [-0.15, 58, '#9ad4ae'], [3.35, 56, '#9ad4ae']];
    for (const [a, Lf, col] of leaves) {
      const ex = cx + Math.cos(a) * Lf, ey = cy + Math.sin(a) * Lf * 0.5 - Lf * 0.28;     // 끝이 아래로 처짐
      const nx = -Math.sin(a), ny = Math.cos(a);
      const mx = cx + Math.cos(a) * Lf * 0.5 + nx * 2, my = cy + Math.sin(a) * Lf * 0.5 + 12;
      g.beginPath(); g.moveTo(cx, cy);
      g.quadraticCurveTo(mx + nx * 9, my + ny * 9, ex, ey);
      g.quadraticCurveTo(mx - nx * 7, my - ny * 7 - 6, cx, cy);
      g.fillStyle = col; g.fill(); g.strokeStyle = '#64a982'; g.lineWidth = 1.4; g.stroke();
    }
    g.fillStyle = '#a7774f';
    for (const [dx, dy] of [[-6, -3], [5, -4], [0, -9]]) { circ(g, cx + dx, cy + dy, 5.5); g.fill(); }
    g.restore();
  }
  function drawCastle(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#efcf9c'; g.strokeStyle = '#d2ab72'; g.lineWidth = 1.6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-26, 8); g.lineTo(-26, -10); for (let k = 0; k < 4; k++) { const x0 = -26 + k * 13; g.lineTo(x0, -16); g.lineTo(x0 + 6.5, -16); g.lineTo(x0 + 6.5, -10); g.lineTo(x0 + 13, -10); }
    g.lineTo(26, 8); g.closePath(); g.fill(); g.stroke();
    rrect(g, -9, -34, 18, 24, 2); g.fill(); g.stroke();
    g.fillStyle = '#c99a62'; rrect(g, -4, -4, 8, 12, 4); g.fill();
    g.strokeStyle = '#a97a55'; g.lineWidth = 1.4; line(g, 0, -34, 0, -48);
    g.fillStyle = '#ff9f7f'; g.beginPath(); g.moveTo(0, -48); g.lineTo(11, -44); g.lineTo(0, -40); g.closePath(); g.fill();
    g.restore();
  }
  function drawBucket(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
    g.strokeStyle = '#c98466'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(0, -12, 11, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, -12); g.lineTo(9, 8); g.lineTo(-9, 8); g.closePath();
    g.fillStyle = '#9edccb'; g.fill(); g.strokeStyle = '#6fb8a3'; g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(-11, -8, 22, 3);
    g.restore();
  }
  function drawStarfish(g, x, y, r, rot) {
    star(g, x, y, r, 5, 0.48, rot); g.fillStyle = '#ffab8f'; g.fill(); g.strokeStyle = '#e88a6c'; g.lineWidth = Math.max(1, r * 0.12); g.stroke();
    g.fillStyle = '#ffe1d3'; for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5; circ(g, x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.09); g.fill(); }
  }
  function drawShell(g, x, y, r) {
    g.beginPath(); g.moveTo(x - r, y + r * 0.4); g.quadraticCurveTo(x - r * 1.1, y - r * 0.9, x, y - r); g.quadraticCurveTo(x + r * 1.1, y - r * 0.9, x + r, y + r * 0.4); g.quadraticCurveTo(x, y + r * 0.8, x - r, y + r * 0.4); g.closePath();
    g.fillStyle = '#ffd6dc'; g.fill(); g.strokeStyle = '#e6a5b0'; g.lineWidth = Math.max(1, r * 0.13); g.stroke();
    for (const a of [-0.9, -0.3, 0.3, 0.9]) line(g, x, y + r * 0.45, x + Math.sin(a) * r * 0.85, y - Math.cos(a) * r * 0.8);
  }
  function cloud(g, x, y, k) {
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.beginPath();
    g.arc(x - 22 * k, y, 14 * k, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(x - 6 * k, y - 10 * k, 16 * k, Math.PI, Math.PI * 1.9);
    g.arc(x + 14 * k, y - 6 * k, 13 * k, Math.PI * 1.2, Math.PI * 2);
    g.arc(x + 26 * k, y + 2 * k, 10 * k, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(246,226,212,.7)'; ell(g, x + 2 * k, y + 9 * k, 28 * k, 3 * k); g.fill();
  }

  // 구름 [x, 높이, 크기, 흐르는 빠르기] — 높은 것은 하늘이 높게 보일 때(폰 세로)만 보임
  const CLOUDS = [[60, 330, 1.05, 4], [330, 372, 0.8, 6], [560, 300, 0.9, 3], [820, 352, 0.7, 5], [200, 610, 1.15, 3], [520, 700, 0.85, 5], [-40, 820, 1.0, 4], [380, 930, 0.75, 6], [700, 1060, 1.1, 3]];

  // ════════ 그림 담당 ════════
  function newAnim() {
    return { sq: 0, sqv: 0, hop: 0, hopv: 0, run: 0, blinkT: rr(1.5, 4), blink: 0, mood: '', moodT: 0, tail: rr(0, 6), lean: 0, hitAt: -9, ear: 0, rec: 0, recMax: 1 };
  }

  function create(canvas) {
    const g = canvas.getContext('2d');
    const bg = document.createElement('canvas'), bgg = bg.getContext('2d');
    let cam = camera(640, 400), dpr = 1, furs = ['cheese', 'mackerel'], tags = null;
    let A = [newAnim(), newAnim()];
    const ball = { spin: 0, sq: 0, sqAng: 0, trail: [], hot: 0, hotCol: '#ffb38f', heat: 0 };
    let parts = [], marks = [], time = 0, shake = 0, netWob = 0, serveGlow = 0;

    let topInset = 0;                                                  // 위에 점수판이 겹쳐 있으면 그만큼 (공 위치 표시를 그 아래에)
    function resize(w, h, ratio, reserve, inset) {
      dpr = ratio || 1; topInset = inset || 0;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      cam = camera(w, h, reserve || 0);
      bg.width = canvas.width; bg.height = canvas.height;
      bgg.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground(bgg, cam);
    }
    function setFurs(f, t) { furs = f.slice(); tags = t || null; }
    function reset() {
      A = furs.map(() => newAnim()); for (const a of A) a.sqv = -4.5;   // 새 경기: 모두 '뽀용' 하고 등장 (복식이면 넷)
      parts = []; marks = []; ball.trail = []; ball.hot = 0; ball.heat = 0; shake = 0; netWob = 0;
    }

    // ── 효과 만들기 (세계 좌표 · 초당 속도)
    function puff(x, y, n, spread, up, size) {
      for (let i = 0; i < n; i++) parts.push({ k: 'puff', x: x + rr(-spread, spread), y: y + rr(0, 6), vx: rr(-30, 30) + (spread > 20 ? rr(-40, 40) : 0), vy: rr(10, up), life: 0, max: rr(0.35, 0.6), r: rr(size * 0.6, size) });
    }
    function sandSplash(x, n, pow) {
      for (let i = 0; i < n; i++) parts.push({ k: 'grain', x: x + rr(-8, 8), y: 2, vx: rr(-140, 140) * pow, vy: rr(120, 330) * pow, life: 0, max: rr(0.45, 0.8), r: rr(1.6, 3.4), c: rnd() < 0.5 ? '#ecca94' : '#f6dcae' });
      puff(x, 0, Math.round(n / 3), 16, 60, 13 * pow + 4);
    }
    function sparks(x, y, n, cols, sp) {
      for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = rr(0.4, 1) * sp; parts.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rr(0.3, 0.55), r: rr(4, 7.5), c: cols[i % cols.length], rot: rnd() * TAU, vr: rr(-8, 8) }); }
    }
    function ring(x, y, r0, r1, col, max, w) { parts.push({ k: 'ring', x, y, r0, r1, c: col, life: 0, max, w: w || 3 }); }
    function hearts(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'heart', x: x + rr(-20, 20), y: y + rr(0, 10), vx: rr(-15, 15), vy: rr(45, 80), life: -i * 0.12, max: 1.1, r: rr(4.5, 6.5), ph: rnd() * TAU }); }

    // ── 코어 일 → 효과 (틱마다 부름). 돌려주는 값 = 멈칫(ms) 제안
    function events(evs, s) {
      let stop = 0;
      for (const e of evs) {
        const ci = e.cat != null ? e.cat : e.side;                     // 복식이면 고양이 번호(cat), 1:1 이면 편 = 고양이
        const c = ci != null ? s.cats[ci] : null, a = ci != null ? A[ci] : null;
        switch (e.t) {
          case 'jump': a.sqv -= 3.2; puff(c.x, 0, 3, 14, 40, 9); break;
          case 'land': a.sqv += clamp(e.v, 0, 20) * 0.16; if (e.v > 7 || e.dive) puff(c.x, 0, e.dive ? 7 : 4, 22, 50, 11); break;
          case 'dive': a.sqv += 1; puff(c.x, 0, 6, 18, 40, 11); break;
          case 'swing': a.ear = 3; break;
          case 'swipe': a.ear = 3; a.sqv += 0.6; break;                 // 방향 없이 땅에서 스매시: 제자리 헛손질 (살짝 움찔)
          case 'hit': {
            const sp = e.v || 8;
            ball.trail = [];                                          // 맞은 곳부터 새 꼬리
            if (e.kind === 'smash' && e.vx != null) parts.push({ k: 'arrow', x: e.x, y: e.y, ang: Math.atan2(e.vy, e.vx), life: 0, max: 0.55, c: e.perfect ? '#f5a623' : '#ff7a3d' });   // 날아가는 쪽으로 화살표
            if (e.kind === 'smash') {
              const col = (FURS[furs[ci]] || FURS.cheese).accent;
              ball.hot = 1; ball.hotCol = e.perfect ? '#ffcf5c' : col;
              ring(e.x, e.y, 10, e.perfect ? 70 : 52, e.perfect ? '#ffd36e' : '#ffffff', e.perfect ? 0.38 : 0.3, e.perfect ? 5 : 4);
              sparks(e.x, e.y, e.perfect ? 14 : 9, e.perfect ? ['#ffd36e', '#fff6d8', '#ffab8f'] : ['#ffffff', '#ffe0cf', col], e.perfect ? 260 : 200);
              shake = Math.max(shake, e.perfect ? 9 : 6); stop = Math.max(stop, e.perfect ? 120 : 75);
              a.hitAt = time;
              { const f = e.side === 0 ? 1 : -1, lx = (e.x - c.x) * f - 16, ly = e.y - c.y - 46;   // 어깨에서 공 쪽으로 (앞발이 공에 닿게 조금 늘어남)
                a.hitArm = clamp(Math.atan2(ly, lx), -0.6, 2.2); a.hitLen = clamp(Math.hypot(lx, ly) - 14, 26, 50); }
            } else if (e.kind === 'dig') {
              puff(e.x, e.y - 10, 6, 14, 60, 10); sparks(e.x, e.y, 6, ['#ffffff', '#bfeee0', '#ffe0cf'], 150);
              ring(e.x, e.y, 8, 34, '#ffffff', 0.25, 3);
            } else {
              a.sqv += 1.6 + sp * 0.05; sparks(e.x, e.y, 4, ['#ffffff', '#fff1c4'], 110 + sp * 6);
              if (sp > 12) ring(e.x, e.y, 6, 30, '#ffffff', 0.22, 2.5);
            }
            ball.sq = clamp(sp / 40, 0.08, 0.32); ball.sqAng = Math.atan2(-s.ball.vy, s.ball.vx);
            break;
          }
          case 'wall': puff(e.x < 320 ? 4 : C.W - 4, e.y, 3, 4, 30, 7); ball.sq = 0.18; ball.sqAng = 0; break;
          case 'net': netWob = Math.min(1.3, netWob + e.v / 10); ball.sq = 0.15; break;
          case 'floor':
            if (e.point) { sandSplash(e.x, 14, 1); marks.push({ x: e.x, life: 0, max: 2.4 }); shake = Math.max(shake, 3); }
            else if (e.v > 3) sandSplash(e.x, 5, 0.55);
            ball.sq = clamp(e.v / 30, 0.1, 0.35); ball.sqAng = Math.PI / 2;
            break;
          case 'serve': ring(s.ball.x, s.ball.y, 8, 40, '#ffffff', 0.35, 3); serveGlow = 0; ball.heat = 0; break;
          case 'heat': ball.heat = clamp(e.v / C.HEAT_MAX, 0, 1); if (e.n === C.HEAT_FROM + 1) ring(s.ball.x, s.ball.y, 10, 46, '#ff9f7f', 0.4, 4); break;
          case 'point': {
            for (let j = 0; j < A.length && j < s.cats.length; j++) {
              if ((j & 1) === e.w) { A[j].mood = 'happy'; A[j].moodT = 1.7; A[j].hopv = 0; hearts(s.cats[j].x, s.cats[j].y + 95, 3); }
              else { A[j].mood = 'dizzy'; A[j].moodT = 1.7; }
            }
            break;
          }
          case 'over':
            for (let j = 0; j < A.length && j < s.cats.length; j++) {
              const win = (j & 1) === e.w; A[j].mood = win ? 'happy' : 'sad'; A[j].moodT = 99;
              if (win) hearts(s.cats[j].x, s.cats[j].y + 95, 5);
            }
            break;
          case 'ready': for (const q of A) if (q.moodT < 50) { q.mood = ''; q.moodT = 0; } ball.trail = []; ball.hot = 0; ball.heat = 0; break;
        }
      }
      ball.spin += s.ball.vx / C.BALL_R * 0.9;
      const v2 = s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy;
      if (s.phase !== 'ready' && (v2 > 150 || ball.hot > 0.3)) ball.trail.push({ x: s.ball.x, y: s.ball.y });
      if (ball.trail.length > 9 || (ball.trail.length && v2 < 110 && ball.hot < 0.3)) ball.trail.shift();
      return stop;
    }

    // ── 매 프레임: 움직임 갱신 + 그리기. prev = 직전 틱 위치 (보간용), alpha 0~1
    function draw(s, prev, alpha, dt, opt) {
      opt = opt || {};
      time += dt;
      const { s: k, w, h } = cam;
      const X = x => cam.ox + x * k, Y = y => cam.oy - y * k;
      const ip = (a, b) => a + (b - a) * alpha;
      // 스프링 · 깜빡임 · 기분
      while (A.length < s.cats.length) A.push(newAnim());
      for (let i = 0; i < s.cats.length; i++) {
        const a = A[i], c = s.cats[i];
        for (let t = dt; t > 1e-6; t -= 1 / 60) {                      // 스프링은 잘게 나눠 (프레임이 길어도 튀지 않게)
          const h = Math.min(t, 1 / 60);
          a.sqv += (-260 * a.sq - 13 * a.sqv) * h; a.sq += a.sqv * h;
        }
        a.sq = clamp(a.sq, -0.35, 0.45);
        a.blinkT -= dt; if (a.blinkT < 0) { a.blink = 0.13; a.blinkT = rr(2, 5); }
        if (a.blink > 0) a.blink -= dt;
        if (a.moodT > 0) { a.moodT -= dt; if (a.moodT <= 0) a.mood = ''; }
        a.ear = Math.max(0, a.ear - dt * 12);
        if (c.ground && c.dive === 0) a.run += Math.abs(c.vx) * 60 * dt / 17; else a.run *= 0.9;
        a.tail += dt * (1.6 + Math.abs(c.vx) * 0.25);
        a.lean += ((c.vx * ((i & 1) === 0 ? 1 : -1)) * 0.022 - a.lean) * Math.min(1, dt * 12);
        // 이긴 고양이는 제자리에서 폴짝
        if (a.mood === 'happy' && c.ground && Math.abs(c.vx) < 0.5) { if (a.hop <= 0 && a.hopv <= 0) { a.hopv = 150; a.sqv -= 1.5; } }
        a.hopv -= 900 * dt; a.hop += a.hopv * dt; if (a.hop < 0) { if (a.hopv < -60) a.sqv += 1.2; a.hop = 0; a.hopv = 0; }
        if (c.rec > 0 && a.rec === 0) { a.recMax = c.rec; a.sqv += 2; }
        a.rec = c.rec;
      }
      ball.sq = Math.max(0, ball.sq - dt * 2.2); ball.hot = Math.max(0, ball.hot - dt * 1.4);
      netWob = Math.max(0, netWob - dt * 2.2); shake = shake > 0.2 ? shake * Math.pow(0.0008, dt) : 0;
      serveGlow += dt;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save();
      if (shake > 0) g.translate(rr(-shake, shake) * 0.6, rr(-shake, shake) * 0.6);
      g.drawImage(bg, 0, 0, w, h);
      // 구름 (천천히 흘러감)
      const span = cam.right - cam.left + 260;
      for (const [x0, y0, sz, sp] of CLOUDS) {
        const x = cam.left - 130 + ((x0 - cam.left + 130 + time * sp) % span + span) % span;
        if (Y(y0) > -40 * k) cloud(g, X(x), Y(y0), k * sz);
      }
      // 하늘이 높게 보이면 갈매기 몇 마리 (천천히 날갯짓)
      if (cam.top > 440) {
        g.strokeStyle = 'rgba(150,118,96,.5)'; g.lineWidth = Math.max(1.2, 1.7 * k); g.lineCap = 'round';
        for (const [x0, y0, sp, ph] of [[110, 470, 7, 0], [150, 492, 7, 1.4], [420, 540, -5, 2.2]]) {
          const x = cam.left - 40 + ((x0 - cam.left + 40 + time * sp) % span + span) % span, y = y0 + Math.sin(time * 0.7 + ph) * 6, fl = Math.sin(time * 5 + ph), r = 7 * k;
          if (Y(y) < 8) continue;
          const bxp = X(x), byp = Y(y);
          g.beginPath(); g.moveTo(bxp - r, byp + r * 0.25 * fl);
          g.quadraticCurveTo(bxp - r * 0.5, byp - r * (0.45 + 0.35 * fl), bxp, byp);
          g.quadraticCurveTo(bxp + r * 0.5, byp - r * (0.45 + 0.35 * fl), bxp + r, byp + r * 0.25 * fl); g.stroke();
        }
      }
      // 바다 반짝임 · 물결
      g.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const bx = cam.left + ((i * 97.3) % (cam.right - cam.left)), by = 80 + (i * 37) % 64;
        const al = 0.25 + 0.35 * Math.sin(time * 1.6 + i * 1.7);
        if (al <= 0.05) continue;
        g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = 2 * k;
        const xx = X(bx + Math.sin(time * 0.5 + i) * 8);
        line(g, xx - 7 * k, Y(by), xx + 7 * k, Y(by));
      }
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath();
      const fy = Y(68), wv = 22 * k, off = (time * 9 * k) % wv;
      g.moveTo(-wv, fy + 3 * k);
      for (let x = -wv - off; x < w + wv; x += wv) g.quadraticCurveTo(x + wv / 2, fy - 4 * k * (1 + 0.25 * Math.sin(time * 1.3 + x)), x + wv, fy + 1 * k);
      g.lineTo(w + wv, fy + 5 * k); g.lineTo(-wv, fy + 5 * k); g.closePath(); g.fill();

      // 모래 자국 (공이 떨어진 곳)
      for (let i = marks.length - 1; i >= 0; i--) {
        const m = marks[i]; m.life += dt; if (m.life > m.max) { marks.splice(i, 1); continue; }
        const al = 0.22 * (1 - m.life / m.max);
        ell(g, X(m.x), Y(-1), 20 * k, 4.5 * k); g.fillStyle = `rgba(190,140,90,${al})`; g.fill();
      }

      const cats = s.cats.map((c, i) => { const p = prev.c[i] || [c.x, c.y]; return { c, x: ip(p[0], c.x), y: ip(p[1], c.y) }; });
      const bx = ip(prev.b[0], s.ball.x), by = ip(prev.b[1], s.ball.y);
      // 그림자 (높을수록 작고 옅게)
      for (const q of cats) {
        const hh = clamp(q.y / 420, 0, 0.7), wide = q.c.dive > 0 ? 1.35 : 1;
        ell(g, X(q.x), Y(-1.5), 31 * k * (1 - hh) * wide, 6.5 * k * (1 - hh)); g.fillStyle = `rgba(150,105,70,${0.2 * (1 - hh)})`; g.fill();
      }
      { const hh = clamp(by / 520, 0, 0.75); ell(g, X(bx), Y(-1.5), 17 * k * (1 - hh), 4 * k * (1 - hh)); g.fillStyle = `rgba(150,105,70,${0.2 * (1 - hh)})`; g.fill(); }

      drawNet(g, X, Y, k);

      // 고양이
      const lwPx = 1.25 + 0.95 * k;
      for (let i = cats.length - 1; i >= 0; i--) drawCat(g, i, cats[i], s, bx, by, X, Y, k, lwPx, opt);   // 복식 짝(2·3)을 먼저 그려 뒤에

      // 서브 대기: 공 아래 반짝 고리
      if (s.phase === 'ready') {
        const r = (C.BALL_R + 6 + Math.sin(serveGlow * 5) * 3) * k;
        circ(g, X(bx), Y(by), r); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5 * k; g.stroke();
      }
      // 공 꼬리: 빠를수록 길게 (스매시는 친 고양이 색으로 한 겹 더)
      const tr = ball.trail;
      if (tr.length > 1) {
        g.lineCap = 'round';
        const pts = tr.concat([{ x: bx, y: by }]);
        for (let pass = ball.hot > 0.3 ? 0 : 1; pass < 2; pass++) {
          for (let i = 1; i < pts.length; i++) {
            const u = i / (pts.length - 1);
            g.strokeStyle = pass === 0 ? hexA(ball.hotCol, 0.45 * u * Math.min(1, ball.hot * 1.4)) : `rgba(255,${Math.round(255 - 70 * ball.heat)},${Math.round(255 - 130 * ball.heat)},${0.5 * u})`;
            g.lineWidth = C.BALL_R * 2 * k * (pass === 0 ? 0.95 : 0.6) * (0.25 + 0.75 * u);
            line(g, X(pts[i - 1].x), Y(pts[i - 1].y), X(pts[i].x), Y(pts[i].y));
          }
        }
      }
      if (ball.heat > 0 && s.phase !== 'ready') {                     // 랠리 열기: 공 둘레가 발그레 (길어질수록 진하게 · 살짝 일렁임)
        const r0 = C.BALL_R * k, gr = g.createRadialGradient(X(bx), Y(by), r0 * 0.7, X(bx), Y(by), r0 * (2 + 0.25 * Math.sin(time * 9)));
        gr.addColorStop(0, `rgba(255,150,100,${0.2 + 0.35 * ball.heat})`); gr.addColorStop(1, 'rgba(255,150,100,0)');
        circ(g, X(bx), Y(by), r0 * 2.3); g.fillStyle = gr; g.fill();
      }
      drawBall(g, X(bx), Y(by), C.BALL_R * k, ball.spin, ball.sq, ball.sqAng, lwPx);

      // 효과 알갱이
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        if (p.life < 0) continue;
        const u = p.life / p.max;
        if (p.k === 'grain') { p.vy -= 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < 0) { p.y = 0; p.vx *= 0.5; p.vy *= -0.2; } circ(g, X(p.x), Y(p.y), p.r * k); g.fillStyle = p.c; g.fill(); }
        else if (p.k === 'puff') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.93; const r = p.r * (1 + u * 1.3) * k; circ(g, X(p.x), Y(p.y), r); g.fillStyle = `rgba(255,250,240,${0.7 * (1 - u)})`; g.fill(); g.strokeStyle = `rgba(214,182,140,${0.45 * (1 - u)})`; g.lineWidth = 1.2 * k; g.stroke(); }
        else if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.rot += p.vr * dt; star(g, X(p.x), Y(p.y), p.r * k * (1 - u * 0.6), 4, 0.42, p.rot); g.fillStyle = hexA(p.c, 1 - u); g.fill(); }
        else if (p.k === 'ring') { const r = lerp(p.r0, p.r1, easeOut(u)) * k; circ(g, X(p.x), Y(p.y), r); g.strokeStyle = hexA(p.c, 0.9 * (1 - u)); g.lineWidth = p.w * k * (1 - u * 0.5); g.stroke(); }
        else if (p.k === 'arrow') { const dx = Math.cos(p.ang), dy = -Math.sin(p.ang), r = (34 + 40 * easeOut(u)) * k; g.save(); g.globalAlpha = 0.95 * (1 - u * u); arrowTo(g, X(p.x) + dx * r, Y(p.y) + dy * r, dx, dy, 30 * k, Math.max(3, 4.6 * k), p.c); g.restore(); }
        else if (p.k === 'heart') { p.x += p.vx * dt + Math.sin(time * 5 + p.ph) * 0.4; p.y += p.vy * dt; heart(g, X(p.x), Y(p.y), p.r * k * (u < 0.15 ? u / 0.15 : 1)); g.fillStyle = `rgba(255,128,150,${1 - u * u})`; g.fill(); }
      }
      // 스매시 방향 힌트: 휘두르는 동안 앞발 쪽에 지금 누른 방향을 작은 화살표로 (배우기 쉽게 · 옅게)
      for (let i = 0; i < cats.length; i++) {
        const q = cats[i], c = q.c;
        if (!(c.swing > 0) || c.dive > 0 || c.ground) continue;
        const f = (i & 1) === 0 ? 1 : -1, v = AIM_VEC[V.aimOf(c, i & 1)]; if (!v) continue;
        const vl = Math.hypot(v[0], v[1]), dx = v[0] * f / vl, dy = -v[1] / vl;     // 화면 좌표 방향 (y 는 아래가 +)
        const px = X(q.x + f * C.PAW_DX) + dx * 40 * k, py = Y(q.y + C.PAW_DY) + dy * 40 * k;
        g.save(); g.globalAlpha = 0.85 * clamp(c.swing / C.SWING_T + 0.4, 0, 1); arrowTo(g, px + dx * 14 * k, py + dy * 14 * k, dx, dy, 26 * k, Math.max(2.6, 4 * k), '#ff8a4c'); g.restore();
      }
      if (parts.length > 260) parts.splice(0, parts.length - 260);

      // 공이 화면 위로 나가면 위쪽 끝에 작은 표시
      if (by - C.BALL_R > cam.top) {
        const ax = clamp(X(bx), 16, w - 16), hgt = by - cam.top, sc = clamp(1 - hgt / 700, 0.55, 1);
        g.save(); g.translate(ax, topInset + 6 * k + 6); g.scale(sc, sc);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(11, 14); g.lineTo(-11, 14); g.closePath();
        g.fillStyle = 'rgba(255,148,102,.95)'; g.lineJoin = 'round'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke();
        circ(g, 0, 26, 8); g.fillStyle = '#fffaf0'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
        g.restore();
      }
      g.restore();
    }

    function drawNet(g, X, Y, k) {
      const x = X(C.NET_X), hw = C.NET_HW * k, top = Y(C.NET_H + C.NET_HW), wob = Math.sin(time * 34) * netWob * 2.4 * k;
      ell(g, x, Y(-1), 14 * k, 3.2 * k); g.fillStyle = 'rgba(150,105,70,.18)'; g.fill();
      // 그물 (기둥 옆으로 얇게)
      const mx0 = x - hw - 3 * k + wob, mx1 = x + hw + 3 * k + wob, my0 = Y(122), my1 = Y(48);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1.1 * k;
      for (let yy = my0; yy < my1; yy += 7 * k) line(g, mx0, yy, mx1, yy + 3.5 * k);
      g.strokeStyle = 'rgba(200,160,126,.9)'; g.lineWidth = 1.2 * k; g.strokeRect(mx0, my0, mx1 - mx0, my1 - my0);
      // 기둥
      rrect(g, x - hw * 0.7, top, hw * 1.4, Y(0) - top, hw * 0.7); g.fillStyle = '#e1b287'; g.fill(); g.strokeStyle = '#a97a55'; g.lineWidth = 1.4 * k; g.stroke();
      // 위 띠
      rrect(g, x - hw - 4 * k + wob * 0.5, top - 1 * k, (hw + 4 * k) * 2, 12 * k, 5 * k); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#d4a77f'; g.lineWidth = 1.3 * k; g.stroke();
      g.fillStyle = '#ff9f7f'; g.fillRect(x - hw - 2 * k + wob * 0.5, top + 4 * k, (hw + 2 * k) * 2, 3 * k);
    }

    // 고양이 한 마리 (자세·표정 고르고 그리기)
    function drawCat(g, i, q, s, bx, by, X, Y, k, lwPx, opt) {
      const c = q.c, a = A[i], fur = FURS[furs[i]] || FURS.cheese;
      const f = (i & 1) === 0 ? 1 : -1;
      const lw = lwPx / k;
      const P = { tail: Math.sin(a.tail), run: a.run, stride: 0, lift: 0, tuck: 0, look: [0, 0], eyes: 'open', mouth: 'w', brows: false, air: !c.ground, arm: null, arm0: 0, swoosh: 0, ear: a.ear, spin: time * 6 };
      // 공 쪽으로 눈동자
      const ex = q.x + f * 12, ey = q.y + 55, dx = bx - ex, dy = by - ey, dl = Math.hypot(dx, dy) || 1;
      P.look = [dx / dl * f, dy / dl];
      const moving = c.ground && Math.abs(c.vx) > 0.6;
      if (moving) { P.stride = clamp(Math.abs(c.vx) * 0.9, 0, 6); P.lift = 3; }
      if (!c.ground) P.tuck = 4;
      // 표정
      const inPlay = s.phase === 'play', mySide = (i & 1) === 0 ? bx < C.NET_X : bx > C.NET_X;
      if (a.mood === 'happy') { P.eyes = 'happy'; P.mouth = 'open'; }
      else if (a.mood === 'dizzy') { P.eyes = 'dizzy'; P.mouth = 'wavy'; }
      else if (a.mood === 'sad') { P.eyes = 'sad'; P.mouth = 'frown'; }
      else if (c.dive > 0 || (c.rec > 0 && c.rec > a.recMax * 0.5)) { P.eyes = 'effort'; P.mouth = 'o'; }
      else if (c.swing > 0 || time - a.hitAt < 0.25) { P.eyes = time - a.hitAt < 0.25 ? 'effort' : 'open'; P.mouth = 'o'; P.brows = true; }
      else {
        if (a.blink > 0) P.eyes = 'blink';
        P.brows = inPlay && mySide && by < 330;
        if (!c.ground && c.vy > 6) P.mouth = 'o';
      }
      // 휘두르기
      // 휘두르기: 머리 위로 들었다가(맞히는 순간은 머리 앞 위) 앞아래로 쓸어내림
      const since = time - a.hitAt;
      if (c.swing === 0 && since < 0.2 && a.hitArm != null) {          // 맞힌 순간(멈칫 동안)은 앞발이 공에 닿은 자세 → 앞아래로 쓸어내림
        const u = clamp((since - 0.045) / 0.15, 0, 1), e = easeOut(u);
        P.arm0 = a.hitArm; P.arm = lerp(a.hitArm, -0.5, e); P.armLen = lerp(a.hitLen, 31, e); P.swoosh = u > 0 ? 1 - u : 0;
      } else if (c.swing > 0) {
        const p = 1 - c.swing / C.SWING_T;
        P.arm0 = 1.95; P.arm = 1.95 - 2.45 * Math.pow(clamp(p, 0, 1), 0.8); P.swoosh = clamp(1 - p * 1.3, 0, 1);
      }
      // 찌그러짐·늘어남
      let sq = a.sq - (c.ground ? 0 : clamp(Math.abs(c.vy) / 90, 0, 0.1));
      if (c.rec > 0) sq += 0.18 * (c.rec / Math.max(1, a.recMax));
      const kx = 1 + sq * 0.55, ky = (1 - sq) * (1 + Math.sin(time * 3 + i) * 0.012);
      const hop = a.hop;
      g.save();
      if (c.dive > 0) {
        const d = c.diveDir;
        g.translate(X(q.x), Y(q.y));
        g.scale(d * k, -k);
        drawDive(g, fur, P, lw);
      } else {
        g.translate(X(q.x), Y(q.y + hop));
        g.rotate(f * clamp(a.lean, -0.16, 0.16) + (c.ground ? 0 : f * clamp(-c.vy * 0.004, -0.06, 0.06)));
        g.scale(f * k * kx, -k * ky);
        drawStand(g, fur, P, lw);
      }
      g.restore();
      // 어지러운 별
      if (a.mood === 'dizzy') {
        for (let n = 0; n < 3; n++) {
          const ang = time * 4.5 + n * TAU / 3, sx = X(q.x + Math.cos(ang) * 26), sy = Y(q.y + 96 + Math.sin(ang) * 6);
          star(g, sx, sy, 5.5 * k, 5, 0.45, time * 3 + n); g.fillStyle = '#ffd36e'; g.fill(); g.strokeStyle = '#e0a83a'; g.lineWidth = 1.1 * k; g.stroke();
        }
      }
      // 이름표 (서브 대기 때만): 1P · 2P · 나
      if (tags && tags[i] && s.phase === 'ready') {
        const tx = X(q.x), ty = Y(q.y + 112);
        const fs = Math.max(11, 15 * k);
        g.font = `${fs}px Jua, "Gowun Dodum", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const tw = g.measureText(tags[i]).width + fs;
        rrect(g, tx - tw / 2, ty - fs * 0.75, tw, fs * 1.5, fs * 0.75); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
        g.fillStyle = fur.accent; g.fillRect(tx - 3, ty + fs * 0.75, 6, 3 * k);
        g.fillStyle = INK; g.fillText(tags[i], tx, ty + 1);
      }
    }

    return { resize, setFurs, reset, events, draw, get cam() { return cam; }, get parts() { return parts.length; } };
  }

  function hexA(hex, a) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1).toFixed(3)})`;
  }

  // 작은 고양이 그림 (메뉴·점수판용) → canvas
  function portrait(furId, px, mood) {
    const cv = document.createElement('canvas'), r = Math.min(2, (root.devicePixelRatio || 1));
    cv.width = cv.height = Math.round(px * r);
    const g = cv.getContext('2d'), fur = FURS[furId] || FURS.cheese, k = px * r / 112;
    g.translate(px * r / 2 - 2 * k, px * r * 0.93);
    g.scale(k, -k);
    const P = { tail: 0.3, run: 0, stride: 0, lift: 0, tuck: 0, look: [0.25, -0.1], eyes: mood === 'happy' ? 'happy' : 'open', mouth: mood === 'happy' ? 'open' : 'w', brows: false, air: false, arm: null, ear: 0 };
    drawStand(g, fur, P, 2.6);
    return cv;
  }

  const API = { create, camera, sizeFor, portrait, FURS, FUR_IDS, GROUND_D, MIN_TOP };
  root.VolleyArt = API;
})(this);

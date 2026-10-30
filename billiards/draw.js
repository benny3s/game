/* 당구 — 캔버스 그리기 (draw.js)
   · 원목 레일 + 다이아몬드 + 녹색(또는 파란) 천, 포켓볼은 가죽 포켓
   · 공: 부드러운 그림자 · 반짝이는 빛 · 구르는 방향대로 도는 무늬(번호·줄무늬·점)
   · 세로 화면이면 당구대를 세워서(90° 돌려) 한 화면에 꽉 차게 */
(function (root) {
  'use strict';
  const B = root.Billiards;
  const TAU = Math.PI * 2;
  const POOL_COLORS = ['#f7f3e8', '#f2c418', '#1f4fc4', '#d42a26', '#5a2a9c', '#f07a12', '#13804a', '#7a1f1f', '#151515'];
  const CAROM_COLORS = ['#f8f5ec', '#f4c21b', '#d1142c', '#d1142c'];
  const CLOTH = { green: ['#1f8a4e', '#146b3a', '#0d4f2a'], blue: ['#2a6fc0', '#1d559c', '#123b70'] };

  function ballColor(mode, i) {
    if (mode === '8ball') return i === 0 ? POOL_COLORS[0] : POOL_COLORS[i > 8 ? i - 8 : i];
    return CAROM_COLORS[i];
  }
  function shade(hex, k) {           // k>0 밝게, k<0 어둡게
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  // 3×3 회전 (공 무늬 굴리기)
  function rotMul(M, ax, ay, az, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    const R = [t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay, t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax, t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c];
    const o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = R[i * 3] * M[j] + R[i * 3 + 1] * M[3 + j] + R[i * 3 + 2] * M[6 + j];
    return o;
  }

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
    const V = { tid: null, mode: null, portrait: false, s: 1, cx: 0, cy: 0, w: 0, h: 0, dpr: 1, cloth: 'green' };
    let orient = [];                                     // 공마다 회전 행렬
    let lastPos = [];

    function layout(tid, mode, w, h, cloth) {
      const T = B.TABLES[tid];
      V.tid = tid; V.mode = mode; V.w = w; V.h = h; V.cloth = cloth || V.cloth;
      V.dpr = Math.min(2.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * V.dpr); canvas.height = Math.round(h * V.dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      const OL = T.L + 2 * T.rail, OW = T.W + 2 * T.rail, pad = 4;
      V.portrait = h > w * 1.02;
      V.s = V.portrait ? Math.min((w - pad * 2) / OW, (h - pad * 2) / OL) : Math.min((w - pad * 2) / OL, (h - pad * 2) / OW);
      V.cx = w / 2; V.cy = h / 2;
      V.T = T;
      drawBg();
    }
    // 당구대 좌표 ↔ 화면
    function toS(x, y) {
      const T = V.T;
      return V.portrait ? [V.cx - (y - T.W / 2) * V.s, V.cy - (x - T.L / 2) * V.s] : [V.cx + (x - T.L / 2) * V.s, V.cy - (y - T.W / 2) * V.s];
    }
    function toW(sx, sy) {
      const T = V.T;
      return V.portrait ? [T.L / 2 - (sy - V.cy) / V.s, T.W / 2 - (sx - V.cx) / V.s] : [T.L / 2 + (sx - V.cx) / V.s, T.W / 2 - (sy - V.cy) / V.s];
    }
    // 당구대 방향 벡터 → 화면 방향
    function vecS(dx, dy) { return V.portrait ? [-dy, -dx] : [dx, -dy]; }

    function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    // 배경 (당구대) 한 번 그려 두기
    function drawBg() {
      const T = V.T, s = V.s, gm = B.geom(V.tid);
      bg.width = canvas.width; bg.height = canvas.height;
      const c = bgx; c.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); c.clearRect(0, 0, V.w, V.h);
      const p0 = toS(-T.rail, -T.rail), p1 = toS(T.L + T.rail, T.W + T.rail);
      const x0 = Math.min(p0[0], p1[0]), y0 = Math.min(p0[1], p1[1]), x1 = Math.max(p0[0], p1[0]), y1 = Math.max(p0[1], p1[1]);
      const q0 = toS(0, 0), q1 = toS(T.L, T.W);
      const fx0 = Math.min(q0[0], q1[0]), fy0 = Math.min(q0[1], q1[1]), fx1 = Math.max(q0[0], q1[0]), fy1 = Math.max(q0[1], q1[1]);
      const railPx = T.rail * s, cush = 0.045 * s;
      // 바닥 그림자
      c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
      rrect(c, x0, y0, x1 - x0, y1 - y0, railPx * 0.45); c.fillStyle = '#3a1f0e'; c.fill(); c.restore();
      // 원목 레일
      const wg = c.createLinearGradient(x0, y0, x1, y1);
      wg.addColorStop(0, '#6b3a1c'); wg.addColorStop(0.35, '#4a2511'); wg.addColorStop(0.7, '#5c3018'); wg.addColorStop(1, '#3a1c0b');
      rrect(c, x0, y0, x1 - x0, y1 - y0, railPx * 0.45); c.fillStyle = wg; c.fill();
      // 나뭇결
      c.save(); rrect(c, x0, y0, x1 - x0, y1 - y0, railPx * 0.45); c.clip();
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      c.globalAlpha = 0.16; c.lineWidth = 1;
      const horiz = (x1 - x0) > (y1 - y0);
      for (let i = 0; i < 70; i++) {
        c.strokeStyle = rnd() < 0.5 ? '#2a1205' : '#8a5530'; c.beginPath();
        if (horiz) { const yy = y0 + rnd() * (y1 - y0); c.moveTo(x0, yy); c.bezierCurveTo(x0 + (x1 - x0) * 0.3, yy + (rnd() - 0.5) * 6, x0 + (x1 - x0) * 0.7, yy + (rnd() - 0.5) * 6, x1, yy + (rnd() - 0.5) * 4); }
        else { const xx = x0 + rnd() * (x1 - x0); c.moveTo(xx, y0); c.bezierCurveTo(xx + (rnd() - 0.5) * 6, y0 + (y1 - y0) * 0.3, xx + (rnd() - 0.5) * 6, y0 + (y1 - y0) * 0.7, xx + (rnd() - 0.5) * 4, y1); }
        c.stroke();
      }
      c.restore();
      // 레일 윗면 반짝임 테두리
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,214,160,.28)'; rrect(c, x0 + 1.5, y0 + 1.5, x1 - x0 - 3, y1 - y0 - 3, railPx * 0.42); c.stroke();
      // 쿠션 (천으로 덮인 고무)
      const cl = CLOTH[V.cloth] || CLOTH.green;
      c.fillStyle = cl[2]; c.fillRect(fx0 - cush, fy0 - cush, fx1 - fx0 + 2 * cush, fy1 - fy0 + 2 * cush);
      // 천
      const fg = c.createRadialGradient((fx0 + fx1) / 2, (fy0 + fy1) / 2, 10, (fx0 + fx1) / 2, (fy0 + fy1) / 2, Math.max(fx1 - fx0, fy1 - fy0) * 0.65);
      fg.addColorStop(0, shade(cl[0], 0.08)); fg.addColorStop(0.6, cl[0]); fg.addColorStop(1, cl[1]);
      c.fillStyle = fg; c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      // 천 결 (잔 점)
      c.save(); c.beginPath(); c.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); c.clip();
      c.globalAlpha = 0.05;
      for (let i = 0; i < (fx1 - fx0) * (fy1 - fy0) / 40; i++) { c.fillStyle = rnd() < 0.5 ? '#000' : '#fff'; c.fillRect(fx0 + rnd() * (fx1 - fx0), fy0 + rnd() * (fy1 - fy0), 1, 1); }
      c.restore();
      // 쿠션 안쪽 그림자 (깊이감)
      c.save(); c.beginPath(); c.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); c.clip();
      c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 12; c.lineWidth = 12; c.strokeStyle = 'rgba(0,0,0,.6)';
      c.strokeRect(fx0 - 6, fy0 - 6, fx1 - fx0 + 12, fy1 - fy0 + 12); c.restore();
      // 쿠션 코 하이라이트
      c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = 1; c.strokeRect(fx0 - 0.5, fy0 - 0.5, fx1 - fx0 + 1, fy1 - fy0 + 1);
      // 다이아몬드 (자개)
      const dia = (x, y) => {
        const [sx, sy] = toS(x, y), r = Math.max(2.2, 0.011 * s);
        c.save(); c.translate(sx, sy); c.rotate(Math.PI / 4);
        const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, '#d8d2c8'); g.addColorStop(1, '#a9a196');
        c.fillStyle = g; c.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5); c.restore();
      };
      const mid = T.rail * 0.58 + 0.045 * 0.42;
      for (let i = 1; i < 8; i++) { if (gm.kind === 'pool' && i === 4) continue; dia(T.L * i / 8, -mid); dia(T.L * i / 8, T.W + mid); }
      for (let i = 1; i < 4; i++) { dia(-mid, T.W * i / 4); dia(T.L + mid, T.W * i / 4); }
      // 포켓
      if (gm.kind === 'pool') {
        gm.pockets.forEach((p, i) => {
          const [sx, sy] = toS(p.x, p.y), r = p.r * s;
          // 가죽 테
          c.fillStyle = '#1b1410'; c.beginPath(); c.arc(sx, sy, r * 1.22, 0, TAU); c.fill();
          const rg = c.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
          rg.addColorStop(0, '#000'); rg.addColorStop(0.75, '#050505'); rg.addColorStop(1, '#2a2622');
          c.fillStyle = rg; c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(200,160,110,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(sx, sy, r * 1.2, 0, TAU); c.stroke();
        });
        // 포켓 턱 (쿠션 끝을 둥글게 덮음)
        c.fillStyle = cl[2];
        gm.jaws.forEach(([x, y]) => { const [sx, sy] = toS(x, y); c.beginPath(); c.arc(sx, sy, 0.012 * s, 0, TAU); c.fill(); });
        // 헤드 스트링·풋 스폿
        const a = toS(T.L / 4, 0), b = toS(T.L / 4, T.W);
        c.strokeStyle = 'rgba(255,255,255,.13)'; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
      }
      const spot = (x, y) => { const [sx, sy] = toS(x, y); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(sx, sy, Math.max(1.4, 0.004 * s), 0, TAU); c.fill(); };
      spot(T.L / 4, T.W / 2); spot(3 * T.L / 4, T.W / 2); if (gm.kind !== 'pool') spot(T.L / 2, T.W / 2);
      // 위 조명 (은은한 빛 웅덩이)
      const lg = c.createRadialGradient(V.cx, V.cy, 0, V.cx, V.cy, Math.max(fx1 - fx0, fy1 - fy0) * 0.6);
      lg.addColorStop(0, 'rgba(255,250,220,.07)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = lg; c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      V.felt = [fx0, fy0, fx1, fy1];
    }

    function resetOrient(n) { orient = []; lastPos = []; for (let i = 0; i < n; i++) { orient.push([1, 0, 0, 0, 1, 0, 0, 0, 1]); lastPos.push(null); } }
    // 위치가 바뀐 만큼 공을 굴림
    function roll(pos) {
      const R = V.T.R;
      for (let i = 0; i < pos.length / 2; i++) {
        const x = pos[2 * i], y = pos[2 * i + 1];
        if (!orient[i]) { orient[i] = [1, 0, 0, 0, 1, 0, 0, 0, 1]; }
        const lp = lastPos[i];
        if (lp && !isNaN(x) && !isNaN(lp[0])) {
          const dx = x - lp[0], dy = y - lp[1], d = Math.hypot(dx, dy);
          if (d > 1e-6 && d < 0.5) orient[i] = rotMul(orient[i], -dy / d, dx / d, 0, d / R);
        }
        lastPos[i] = [x, y];
      }
    }

    // 공 하나
    function ball(i, x, y, alpha, scale) {
      const R = V.T.R * V.s * (scale || 1), [sx, sy] = toS(x, y), col = ballColor(V.mode, i);
      const c = ctx;
      c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
      // 몸통
      const g = c.createRadialGradient(sx - R * 0.35, sy - R * 0.4, R * 0.1, sx, sy, R * 1.05);
      g.addColorStop(0, shade(col, 0.45)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.55));
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, R, 0, TAU); c.fill();
      // 무늬
      const M = orient[i] || [1, 0, 0, 0, 1, 0, 0, 0, 1];
      c.save(); c.beginPath(); c.arc(sx, sy, R, 0, TAU); c.clip();
      const cap = (px, py, pz, cosc, fill) => {
        // 몸 좌표 극(p)에 중심을 둔 원 테두리를 화면에 비춤 (뒤로 넘어간 점은 가장자리로)
        const ux0 = Math.abs(pz) < 0.9 ? 0 : 1, uy0 = 0, uz0 = Math.abs(pz) < 0.9 ? 1 : 0;
        let ex = py * uz0 - pz * uy0, ey = pz * ux0 - px * uz0, ez = px * uy0 - py * ux0; const el = Math.hypot(ex, ey, ez); ex /= el; ey /= el; ez /= el;
        const fx = py * ez - pz * ey, fy = pz * ex - px * ez, fz = px * ey - py * ex;
        const sn = Math.sqrt(1 - cosc * cosc);
        c.beginPath();
        let vis = 0;
        for (let k = 0; k <= 28; k++) {
          const a = k / 28 * TAU, ca = Math.cos(a), sa = Math.sin(a);
          let qx = px * cosc + (ex * ca + fx * sa) * sn, qy = py * cosc + (ey * ca + fy * sa) * sn; const qz = pz * cosc + (ez * ca + fz * sa) * sn;
          if (qz < 0) { const l = Math.hypot(qx, qy) || 1; qx /= l; qy /= l; } else vis++;
          const [vx, vy] = vecS(qx, qy);
          if (k === 0) c.moveTo(sx + vx * R, sy + vy * R); else c.lineTo(sx + vx * R, sy + vy * R);
        }
        if (vis === 0 && pz < 0) return false;
        c.fillStyle = fill; c.fill();
        return true;
      };
      if (V.mode === '8ball' && i > 0) {
        if (i > 8) { cap(M[2], M[5], M[8], 0.62, '#f7f3e8'); cap(-M[2], -M[5], -M[8], 0.62, '#f7f3e8'); }
        // 번호 원
        const px = M[0], py = M[3], pz = M[6];
        if (pz > -0.2 && cap(px, py, pz, 0.88, '#fbf8ef') && pz > 0.3) {
          const [vx, vy] = vecS(px, py);
          c.save(); c.translate(sx + vx * R * 0.96, sy + vy * R * 0.96);
          const ang = Math.atan2(vy, vx); c.rotate(ang); c.scale(Math.max(0.35, pz), 1); c.rotate(-ang);
          c.fillStyle = '#111'; c.font = `800 ${Math.max(6, R * 0.62)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(i), 0, R * 0.04); c.restore();
        }
      } else if (V.mode !== '8ball' && i < 2) {
        // 캐롬 수구 점 (구르는 게 보이게)
        const dot = '#c8102e';
        cap(M[2], M[5], M[8], 0.97, dot); cap(-M[2], -M[5], -M[8], 0.97, dot);
        cap(M[0], M[3], M[6], 0.97, dot); cap(-M[0], -M[3], -M[6], 0.97, dot);
      }
      c.restore();
      // 반짝임
      const hg = c.createRadialGradient(sx - R * 0.38, sy - R * 0.42, 0, sx - R * 0.38, sy - R * 0.42, R * 0.55);
      hg.addColorStop(0, 'rgba(255,255,255,.95)'); hg.addColorStop(0.25, 'rgba(255,255,255,.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(sx, sy, R, 0, TAU); c.fill();
      // 아래쪽 반사광
      const rg2 = c.createRadialGradient(sx + R * 0.45, sy + R * 0.55, 0, sx + R * 0.45, sy + R * 0.55, R * 0.5);
      rg2.addColorStop(0, 'rgba(255,255,255,.16)'); rg2.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg2; c.beginPath(); c.arc(sx, sy, R, 0, TAU); c.fill();
      c.restore();
    }
    function shadow(x, y, scale) {
      const R = V.T.R * V.s * (scale || 1), [sx, sy] = toS(x, y);
      const g = ctx.createRadialGradient(sx + R * 0.28, sy + R * 0.38, R * 0.2, sx + R * 0.28, sy + R * 0.38, R * 1.35);
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx + R * 0.28, sy + R * 0.38, R * 1.35, 0, TAU); ctx.fill();
    }

    // 큐 (당점 · 당김)
    function cue(x, y, angle, pull, alpha) {
      const T = V.T, s = V.s, [sx, sy] = toS(x, y);
      const [dx, dy] = vecS(Math.cos(angle), Math.sin(angle));
      const back = T.R + 0.012 + pull, len = 1.45;
      const ax = sx - dx * back * s, ay = sy - dy * back * s;
      const c = ctx; c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
      c.translate(ax, ay); c.rotate(Math.atan2(dy, dx) + Math.PI);
      const L = len * s, w0 = 0.0065 * s, w1 = 0.0145 * s;
      const seg = (a, b, col) => { const wa = w0 + (w1 - w0) * a, wb = w0 + (w1 - w0) * b; c.beginPath(); c.moveTo(a * L, -wa); c.lineTo(b * L, -wb); c.lineTo(b * L, wb); c.lineTo(a * L, wa); c.closePath(); c.fillStyle = col; c.fill(); };
      c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 8; c.shadowOffsetX = 3; c.shadowOffsetY = 5;
      const sg = c.createLinearGradient(0, -w1, 0, w1); sg.addColorStop(0, '#f3dfb5'); sg.addColorStop(0.5, '#e2c48f'); sg.addColorStop(1, '#b8945c');
      seg(0.016, 0.66, sg);
      c.shadowColor = 'transparent';
      seg(0, 0.006, '#4a78b8');                    // 초크 묻은 팁
      seg(0.006, 0.018, '#f6f3ea');                // 페룰
      const bg2 = c.createLinearGradient(0, -w1, 0, w1); bg2.addColorStop(0, '#3a2414'); bg2.addColorStop(0.5, '#1d0f07'); bg2.addColorStop(1, '#0d0603');
      seg(0.66, 1, bg2);
      seg(0.66, 0.672, '#d9c27a'); seg(0.8, 0.83, '#2b2b2b'); seg(0.83, 0.835, '#d9c27a');
      c.restore();
    }

    function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bg, 0, 0); ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); }

    return { V, layout, toS, toW, vecS, clear, ball, shadow, cue, roll, resetOrient, get ctx() { return ctx; }, ballColor: i => ballColor(V.mode, i) };
  }

  // 당점 고르기 작은 그림 (수구 + 점)
  function drawSpinPad(cv, sx, sy, mode) {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1), w = cv.clientWidth || 80, h = cv.clientHeight || 80;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const r = Math.min(w, h) / 2 - 3, cx = w / 2, cy = h / 2;
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f1ede2'); g.addColorStop(1, '#a9a395');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.stroke();
    for (const k of [1 / 3, 2 / 3]) { c.beginPath(); c.arc(cx, cy, r * k, 0, TAU); c.stroke(); }
    const px = cx + sx * r * 0.82, py = cy - sy * r * 0.82;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(px + 1, py + 1.5, 6, 0, TAU); c.fill();
    c.fillStyle = '#e11d48'; c.beginPath(); c.arc(px, py, 5.5, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  }

  root.BilliardsDraw = { create, drawSpinPad, ballColor };
})(this);

/* 오목 판 그리기 (캔버스) — 나무판 · 줄 · 화점 · 좌표 · 광택 돌과 그림자 · 떨어져 앉는 움직임 · 마지막 수 · 수 번호 ·
   금수 ✕ · 미리 보기(흐린 돌 + 십자선) · 힌트 고리 · 이긴 줄 빛. 상태는 읽기만 하고(set 으로 받음), 움직일 때만 rAF 를 돌림
   나뭇결은 simplex-noise(MIT, 있으면) 로, 없으면 작은 값 잡음으로 한 번 만들어 둠 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const outBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const outCubic = t => 1 - Math.pow(1 - t, 3);
  const now = () => (root.performance ? performance.now() : Date.now());
  const STARS = [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]];
  const LETTERS = 'ABCDEFGHIJKLMNO';
  const COL = { line: 'rgba(96,62,34,.62)', star: 'rgba(86,54,28,.78)', coord: 'rgba(110,74,44,.62)', last: '#ff7a59', hint: '#45b897', forbid: '#e65f78', cross: 'rgba(232,140,70,.55)' };

  // 잡음: simplex-noise(2.4.0) 가 있으면 그걸, 없으면 부드러운 값 잡음
  function makeNoise(seed) {
    if (root.SimplexNoise) { const sn = new root.SimplexNoise(seed); return (x, y) => sn.noise2D(x, y); }
    let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = (x, y) => { let t = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ h; t = Math.imul(t ^ (t >>> 13), 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967296 * 2 - 1; };
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); return lerp(lerp(rnd(xi, yi), rnd(xi + 1, yi), fx), lerp(rnd(xi, yi + 1), rnd(xi + 1, yi + 1), fx), fy); };
  }
  // 밝은 꿀빛 나무판 (세로로 곧은 결 + 은은한 물결)
  function makeWood(px, seed) {
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d'), img = g.createImageData(px, px), d = img.data, nz = makeNoise(seed);
    for (let y = 0; y < px; y++) {
      const v = y / px;
      for (let x = 0; x < px; x++) {
        const u = x / px;
        const warp = nz(u * 1.6, v * 0.45) * 0.85 + nz(u * 5, v * 1.4) * 0.22;
        const ring = Math.sin((u * 21 + warp * 2.6) * Math.PI) * 0.5 + 0.5;
        const fine = nz(u * 70, v * 3.2) * 0.5 + 0.5;
        const blot = nz(u * 2.4 + 9, v * 2.4) * 0.5 + 0.5;
        const t = clamp(Math.pow(ring, 2.6) * 0.5 + fine * 0.16 + blot * 0.26, 0, 1);
        const i = (y * px + x) * 4;
        d[i] = lerp(250, 226, t); d[i + 1] = lerp(226, 186, t); d[i + 2] = lerp(178, 124, t); d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function OmokBoard(canvas, opt) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.N = 15; this.S = 0; this.dpr = 1; this.cell = 0; this.m = 0; this.R = 0;
    this.opt = Object.assign({ coords: false }, opt || {});
    this.stones = new Int8Array(225); this.nums = new Int16Array(225); this.showNums = false; this.last = -1;
    this.forbid = null; this.ghost = null; this.hint = -1; this.win = null; this.winAt = 0;
    this.anims = []; this.raf = 0; this.bg = null; this.spr = null; this.wood = null;
    this.frame = this.frame.bind(this);
  }
  const P = OmokBoard.prototype;
  let WOOD = null;
  OmokBoard.wood = () => WOOD || (WOOD = makeWood(640, 'omok-wood'));
  // 한가할 때 나무 무늬를 미리 (처음 판을 열 때 멈칫하지 않게)
  OmokBoard.prewarm = () => { const f = () => OmokBoard.wood(); if (root.requestIdleCallback) requestIdleCallback(f, { timeout: 1500 }); else setTimeout(f, 300); };

  // ── 크기 · 배경 · 돌 그림 미리 만들기 ──
  P.resize = function (css) {
    css = Math.max(120, Math.floor(css));
    const dpr = Math.min(3, root.devicePixelRatio || 1);
    if (css === this.S && dpr === this.dpr && this.bg) return;
    this.S = css; this.dpr = dpr;
    this.cv.style.width = this.cv.style.height = css + 'px';
    this.cv.width = this.cv.height = Math.round(css * dpr);
    this.layout(); this.build(); this.invalidate();
  };
  P.layout = function () {
    const k = this.opt.coords ? 1.22 : 0.8;
    this.cell = this.S / (this.N - 1 + 2 * k); this.m = k * this.cell; this.R = this.cell * 0.475;
  };
  P.setOptions = function (o) {
    const coords = !!o.coords !== !!this.opt.coords;
    Object.assign(this.opt, o);
    if (coords && this.S) { this.layout(); this.build(); }
    this.invalidate();
  };
  P.xy = function (i) { return [this.m + (i % this.N) * this.cell, this.m + Math.floor(i / this.N) * this.cell]; };
  P.build = function () {
    const S = this.S, dpr = this.dpr, W = Math.round(S * dpr);
    // 나무 무늬는 고정 해상도로 한 번만 (결이 부드러워 늘려 그려도 괜찮음 · 메뉴에서 미리 만들어 둠)
    this.wood = OmokBoard.wood();
    const bg = document.createElement('canvas'); bg.width = bg.height = W;
    const g = bg.getContext('2d');
    g.scale(dpr, dpr);
    const rad = Math.max(10, S * 0.045);
    g.save(); rrect(g, 0, 0, S, S, rad); g.clip();
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.wood, 0, 0, S, S);
    const vg = g.createRadialGradient(S * 0.45, S * 0.4, S * 0.15, S / 2, S / 2, S * 0.78);   // 가장자리 살짝 어둡게
    vg.addColorStop(0, 'rgba(255,248,230,.18)'); vg.addColorStop(1, 'rgba(120,70,30,.16)');
    g.fillStyle = vg; g.fillRect(0, 0, S, S);
    g.restore();
    g.strokeStyle = 'rgba(130,86,44,.28)'; g.lineWidth = 1.5; rrect(g, 0.75, 0.75, S - 1.5, S - 1.5, rad); g.stroke();
    // 줄: 기기 화소에 맞춰 또렷하게
    const N = this.N, m = this.m, c = this.cell, lw = Math.max(1, Math.round(S / 420 * dpr)) / dpr;
    const snap = v => (Math.round(v * dpr - (lw * dpr) / 2) + (lw * dpr) / 2) / dpr;
    g.strokeStyle = COL.line; g.lineWidth = lw; g.beginPath();
    for (let i = 0; i < N; i++) {
      const p = snap(m + i * c);
      g.moveTo(snap(m), p); g.lineTo(snap(m + (N - 1) * c), p);
      g.moveTo(p, snap(m)); g.lineTo(p, snap(m + (N - 1) * c));
    }
    g.stroke();
    g.strokeStyle = 'rgba(96,62,34,.75)'; g.lineWidth = lw * 1.8;    // 바깥 테두리 줄은 조금 굵게
    g.strokeRect(snap(m), snap(m), (N - 1) * c, (N - 1) * c);
    g.fillStyle = COL.star;
    for (const [x, y] of STARS) { g.beginPath(); g.arc(m + x * c, m + y * c, Math.max(2, c * 0.1), 0, TAU); g.fill(); }
    if (this.opt.coords) {
      g.fillStyle = COL.coord; g.font = `${Math.round(c * 0.4)}px Jua, "Gowun Dodum", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < N; i++) {
        g.fillText(LETTERS[i], m + i * c, S - m * 0.42);
        g.fillText(LETTERS[i], m + i * c, m * 0.42);
        g.fillText(String(N - i), m * 0.42, m + i * c);
        g.fillText(String(N - i), S - m * 0.42, m + i * c);
      }
    }
    this.bg = bg;
    this.spr = { 1: this.stoneSprite(1), 2: this.stoneSprite(2), sh: this.shadowSprite() };
  };
  // 돌 한 알 그림 (그림자 없이): 왼쪽 위에서 빛 → 광택 · 가장자리 어둡게
  P.stoneSprite = function (color) {
    const R = this.R, dpr = this.dpr, pad = 2, px = Math.ceil((R * 2 + pad * 2) * dpr);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(R + pad, R + pad);
    const gr = g.createRadialGradient(-R * 0.38, -R * 0.42, R * 0.05, 0, 0, R * 1.02);
    if (color === 1) { gr.addColorStop(0, '#80766f'); gr.addColorStop(0.28, '#433b37'); gr.addColorStop(0.72, '#1f1a18'); gr.addColorStop(1, '#100d0c'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, '#faf6ef'); gr.addColorStop(0.82, '#e6ddd1'); gr.addColorStop(1, '#cdc2b2'); }
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    if (color === 2) { g.strokeStyle = 'rgba(120,88,58,.28)'; g.lineWidth = Math.max(0.8, R * 0.06); g.stroke(); }
    // 반짝임
    g.save(); g.translate(-R * 0.34, -R * 0.4); g.rotate(-0.55); g.scale(1, 0.62);
    const hl = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    hl.addColorStop(0, color === 1 ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.95)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.beginPath(); g.arc(0, 0, R * 0.42, 0, TAU); g.fill(); g.restore();
    // 아래쪽 반사광 (둥근 느낌)
    const rf = g.createRadialGradient(R * 0.25, R * 0.55, 0, R * 0.25, R * 0.55, R * 0.55);
    rf.addColorStop(0, color === 1 ? 'rgba(160,140,125,.22)' : 'rgba(255,250,240,.0)'); rf.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rf; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    return { c, size: px / dpr, off: R + pad };
  };
  // 부드러운 그림자 (흐림 필터 없이 방사형 그라데이션)
  P.shadowSprite = function () {
    const R = this.R, dpr = this.dpr, ext = R * 1.45, px = Math.ceil(ext * 2 * dpr);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(ext, ext);
    const gr = g.createRadialGradient(0, 0, R * 0.55, 0, 0, ext);
    gr.addColorStop(0, 'rgba(70,40,14,.42)'); gr.addColorStop(0.55, 'rgba(70,40,14,.2)'); gr.addColorStop(1, 'rgba(70,40,14,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ext, 0, TAU); g.fill();
    return { c, size: px / dpr, off: ext };
  };

  // ── 상태 받기 (모두 다시 그리기만 예약) ──
  P.set = function (o) {
    if (o.stones) for (let i = 0; i < 225; i++) this.stones[i] = o.stones[i] | 0;
    if (o.nums) for (let i = 0; i < 225; i++) this.nums[i] = o.nums[i] | 0;
    if ('showNums' in o) this.showNums = !!o.showNums;
    if ('last' in o) this.last = o.last;
    this.invalidate();
  };
  P.setForbidden = function (mask) { this.forbid = mask; this.invalidate(); };
  P.setGhost = function (g) { this.ghost = g; this.invalidate(); };
  P.setHint = function (i) { this.hint = i; this.hintAt = now(); this.invalidate(); };
  P.setWin = function (lines) {
    const key = lines && lines.length ? JSON.stringify(lines) : '';
    if (key === (this.winKey || '')) return;                           // 같은 줄이면 다시 반짝이지 않음
    this.winKey = key;
    this.win = key ? lines : null; this.winAt = now();
    if (this.win) {
      const seen = new Set(); let k = 0;
      for (const l of this.win) for (const i of l) if (!seen.has(i)) { seen.add(i); this.anims.push({ type: 'hop', idx: i, t0: now() + 120 + k++ * 90, dur: 460 }); }
    }
    this.invalidate();
  };
  // 돌 놓기: 살짝 위에서 떨어져 통 튀고 앉음 + 나무에 퍼지는 물결
  P.drop = function (idx, color) {
    const t = now();
    this.anims = this.anims.filter(a => a.idx !== idx || a.type === 'ripple');
    this.anims.push({ type: 'drop', idx, color, t0: t, dur: 280 }, { type: 'ripple', idx, t0: t + 70, dur: 460 });
    this.invalidate();
  };
  // 무르기: 돌이 들려 올라가며 사라짐
  P.lift = function (idx, color) { this.anims.push({ type: 'lift', idx, color, t0: now(), dur: 220 }); this.invalidate(); };
  // 위협(사·열린 삼) 알림 고리
  P.pulse = function (idx, strong) { this.anims.push({ type: 'pulse', idx, strong: !!strong, t0: now() + 180, dur: 760 }); this.invalidate(); };
  P.clearFx = function () { this.anims = []; this.win = null; this.winKey = ''; this.hint = -1; this.ghost = null; this.invalidate(); };

  // 화면 좌표 → 칸 번호 (가장 가까운 교차점, 멀면 -1)
  P.idxAt = function (cx, cy) {
    const r = this.cv.getBoundingClientRect(), k = this.S / r.width;
    const px = (cx - r.left) * k, py = (cy - r.top) * k;
    const x = Math.round((px - this.m) / this.cell), y = Math.round((py - this.m) / this.cell);
    if (x < 0 || y < 0 || x >= this.N || y >= this.N) return -1;
    const dx = px - (this.m + x * this.cell), dy = py - (this.m + y * this.cell);
    if (dx * dx + dy * dy > Math.pow(this.cell * 0.72, 2)) return -1;
    return y * this.N + x;
  };

  // ── 그리기 ──
  P.invalidate = function () { if (!this.raf && this.S) this.raf = requestAnimationFrame(this.frame); };
  P.busy = function () {                                               // 이긴 줄은 4.5초만 반짝 (배터리) · 미리 보기는 빈칸일 때만
    return this.anims.length > 0 || this.hint >= 0 || !!(this.win && now() - this.winAt < 4500) || !!(this.ghost && this.ghost.kind === 'preview' && !this.stones[this.ghost.idx]);
  };
  P.frame = function () {
    this.raf = 0;
    const t = now();
    this.anims = this.anims.filter(a => t < a.t0 + a.dur);
    this.draw(t);
    if (this.busy()) this.raf = requestAnimationFrame(this.frame);
  };
  P.draw = function (t) {
    const ctx = this.ctx, dpr = this.dpr, S = this.S, c = this.cell, R = this.R, N = this.N;
    if (!this.bg) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const animOf = {};
    for (const a of this.anims) if (a.type === 'drop' || a.type === 'hop') { if (!animOf[a.idx] || a.type === 'drop') animOf[a.idx] = a; }

    // 이긴 줄 빛 (돌 아래)
    if (this.win) {
      const k = clamp((t - this.winAt) / 420, 0, 1), pul = 0.5 + 0.5 * Math.sin((t - this.winAt) / 260);
      ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,190,50,.95)'; ctx.shadowBlur = c * 0.9;
      ctx.strokeStyle = `rgba(255,203,84,${(0.6 + 0.2 * pul) * k})`; ctx.lineWidth = c * (0.92 + 0.06 * pul);
      for (const l of this.win) {
        const [x1, y1] = this.xy(l[0]), [x2, y2] = this.xy(l[l.length - 1]);
        const e = outCubic(k);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, e), lerp(y1, y2, e)); ctx.stroke();
      }
      ctx.restore();
    }
    // 금수 ✕
    if (this.forbid) {
      ctx.save(); ctx.strokeStyle = COL.forbid; ctx.globalAlpha = 0.82; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, c * 0.085);
      const h = c * 0.17;
      for (let i = 0; i < 225; i++) if (this.forbid[i] && !this.stones[i]) {
        const [x, y] = this.xy(i);
        ctx.beginPath(); ctx.moveTo(x - h, y - h); ctx.lineTo(x + h, y + h); ctx.moveTo(x + h, y - h); ctx.lineTo(x - h, y + h); ctx.stroke();
      }
      ctx.restore();
    }
    // 물결 (돌 아래, 나무 위)
    for (const a of this.anims) if (a.type === 'ripple' && t >= a.t0) {
      const k = (t - a.t0) / a.dur, [x, y] = this.xy(a.idx);
      ctx.strokeStyle = `rgba(150,96,48,${0.32 * (1 - k)})`; ctx.lineWidth = Math.max(0.8, 2.4 * (1 - k));
      ctx.beginPath(); ctx.arc(x, y, R * (1.02 + 0.85 * outCubic(k)), 0, TAU); ctx.stroke();
    }
    // 그림자 먼저, 그다음 돌
    const sh = this.spr.sh, sx = R * 0.1, sy = R * 0.16;
    for (let i = 0; i < 225; i++) {
      if (!this.stones[i]) continue;
      const [x, y] = this.xy(i), a = animOf[i];
      if (a && a.type === 'drop') {                                    // 높이 있을 땐 그림자가 멀고 크고 옅음
        const k = clamp((t - a.t0) / a.dur, 0, 1), f = clamp(k / 0.4, 0, 1), e = f * f;
        ctx.globalAlpha = 0.3 + 0.7 * e;
        const sc = 1.45 - 0.45 * e, z = sh.size * sc;
        ctx.drawImage(sh.c, x + sx * (1 + (1 - e) * 3) - z / 2, y + sy * (1 + (1 - e) * 3) - z / 2, z, z);
        ctx.globalAlpha = 1;
      } else ctx.drawImage(sh.c, x + sx - sh.off, y + sy - sh.off, sh.size, sh.size);
    }
    // 가만히 있는 돌 먼저, 움직이는 돌은 맨 위에 (이웃 돌에 가려지지 않게)
    const moving = [];
    for (let i = 0; i < 225; i++) {
      const col = this.stones[i]; if (!col) continue;
      const a = animOf[i];
      if (a && t >= a.t0) { moving.push(i); continue; }
      const [x, y] = this.xy(i), sp = this.spr[col];
      ctx.drawImage(sp.c, x - sp.off, y - sp.off, sp.size, sp.size);
    }
    for (const i of moving) {
      const [x, y] = this.xy(i), sp = this.spr[this.stones[i]], a = animOf[i];
      const k = clamp((t - a.t0) / a.dur, 0, 1);
      let dy = 0, s = 1, sqx = 1, sqy = 1;
      if (a.type === 'drop') {
        // 위에서 내려다본 판: 가까울수록 크게 → 점점 빨라지며 내려와(작아져) 닿는 순간 살짝 눌렸다 펴짐
        const fall = clamp(k / 0.4, 0, 1);
        s = 1.3 - 0.3 * fall * fall; dy = -(1 - fall) * c * 0.1;
        if (k > 0.4) { const b = (k - 0.4) / 0.6, w = Math.sin(b * Math.PI) * (1 - b); sqx = 1 + 0.08 * w; sqy = 1 - 0.08 * w; }
      } else { const w = Math.sin(k * Math.PI); dy = -w * c * 0.18; s = 1 + 0.12 * w; }   // 이긴 돌 깡충
      const zw = sp.size * s * sqx, zh = sp.size * s * sqy;
      ctx.drawImage(sp.c, x - zw / 2, y + dy - zh / 2, zw, zh);
    }
    // 이긴 돌 둘레 금빛 테
    if (this.win) {
      const k = clamp((t - this.winAt - 200) / 400, 0, 1);
      if (k > 0) {
        ctx.save(); ctx.strokeStyle = `rgba(245,185,66,${0.95 * k})`; ctx.lineWidth = Math.max(1.6, R * 0.13);
        const seen = new Set();
        for (const l of this.win) for (const i of l) if (!seen.has(i) && this.stones[i]) {
          seen.add(i);
          const a = animOf[i], [x, y] = this.xy(i);
          const w = a && a.type === 'hop' && t >= a.t0 ? Math.sin(clamp((t - a.t0) / a.dur, 0, 1) * Math.PI) : 0;   // 깡충 뛰는 돌을 따라감
          ctx.beginPath(); ctx.arc(x, y - w * c * 0.18, R * (1.08 + 0.12 * w), 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
    }
    // 무르기로 사라지는 돌
    for (const a of this.anims) if (a.type === 'lift') {
      const k = clamp((t - a.t0) / a.dur, 0, 1), [x, y] = this.xy(a.idx), sp = this.spr[a.color];
      ctx.globalAlpha = 1 - k; const z = sp.size * (1 + 0.18 * k);
      ctx.drawImage(sp.c, x - z / 2, y - z / 2 - k * c * 0.35, z, z); ctx.globalAlpha = 1;
    }
    // 수 번호 · 마지막 수 표시
    if (this.showNums) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 225; i++) {
        const n = this.nums[i]; if (!n || !this.stones[i] || (animOf[i] && animOf[i].type === 'drop')) continue;
        const [x, y] = this.xy(i);
        ctx.font = `${Math.round(c * (n >= 100 ? 0.34 : 0.42))}px Jua, "Gowun Dodum", sans-serif`;
        ctx.fillStyle = i === this.last ? COL.last : this.stones[i] === 1 ? 'rgba(255,250,240,.92)' : 'rgba(60,44,34,.9)';
        ctx.fillText(String(n), x, y + c * 0.03);
      }
    } else if (this.last >= 0 && this.stones[this.last]) {
      const a = animOf[this.last];
      const k = a && a.type === 'drop' ? clamp((t - a.t0 - a.dur * 0.55) / (a.dur * 0.45), 0, 1) : 1;
      if (k > 0) {                                                     // 산호색 점 + 하얀 테 (폰에서도 잘 보이게)
        const [x, y] = this.xy(this.last), r = R * 0.27 * outBack(k);
        ctx.fillStyle = COL.last; ctx.strokeStyle = this.stones[this.last] === 1 ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    // 위협 고리
    for (const a of this.anims) if (a.type === 'pulse' && t >= a.t0) {
      const k = (t - a.t0) / a.dur, [x, y] = this.xy(a.idx);
      ctx.strokeStyle = a.strong ? `rgba(242,100,126,${0.75 * (1 - k)})` : `rgba(240,160,90,${0.7 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(x, y, R * (1.05 + 0.9 * outCubic(k)), 0, TAU); ctx.stroke();
    }
    // 힌트 고리 (숨 쉬듯)
    if (this.hint >= 0) {
      const [x, y] = this.xy(this.hint), ph = (t - this.hintAt) / 1000, w = 0.5 + 0.5 * Math.sin(ph * 5.2);
      ctx.fillStyle = `rgba(124,201,180,${0.16 + 0.14 * w})`; ctx.beginPath(); ctx.arc(x, y, R * 1.1, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.hint; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R * (1.05 + 0.22 * w), 0, TAU); ctx.stroke();
    }
    // 미리 보기 · 마우스 올림 · 방향키 커서
    const gh = this.ghost;
    if (gh && gh.idx >= 0) {
      const [x, y] = this.xy(gh.idx);
      if (gh.kind !== 'hover') {                                           // 십자선: 손가락에 가려도 줄로 알 수 있게
        ctx.strokeStyle = gh.bad ? 'rgba(230,95,120,.5)' : COL.cross; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(this.m - c * 0.3, y); ctx.lineTo(this.m + (N - 1) * c + c * 0.3, y);
        ctx.moveTo(x, this.m - c * 0.3); ctx.lineTo(x, this.m + (N - 1) * c + c * 0.3); ctx.stroke();
      }
      if (gh.bad) {
        const h = c * 0.24; ctx.strokeStyle = COL.forbid; ctx.lineWidth = Math.max(2.2, c * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - h, y - h); ctx.lineTo(x + h, y + h); ctx.moveTo(x + h, y - h); ctx.lineTo(x - h, y + h); ctx.stroke();
      } else if (gh.color) {
        const sp = this.spr[gh.color];
        ctx.globalAlpha = gh.kind === 'hover' ? 0.38 : 0.62;
        ctx.drawImage(sp.c, x - sp.off, y - sp.off, sp.size, sp.size); ctx.globalAlpha = 1;
        if (gh.kind === 'preview' && gh.idx !== this.hint) {
          const w = 0.5 + 0.5 * Math.sin(t / 170);
          ctx.strokeStyle = `rgba(240,160,90,${0.55 + 0.35 * w})`; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(x, y, R * (1.12 + 0.08 * w), 0, TAU); ctx.stroke();
        } else if (gh.kind === 'cursor') {
          ctx.strokeStyle = 'rgba(240,160,90,.95)'; ctx.lineWidth = 2.2; rrect(ctx, x - R * 1.15, y - R * 1.15, R * 2.3, R * 2.3, R * 0.5); ctx.stroke();
        }
      }
    }
  };

  root.OmokBoard = OmokBoard;
})(this);

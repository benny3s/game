/* 땅따먹기 — 그림 재료: 동물 12마리와 크레파스 색, 동물 얼굴 그리기, 크레파스 결·종이 결 무늬
   · 얼굴은 반지름 1 기준으로 그림 (ctx 를 옮기고 키워서 씀) → 판 위 머리·메뉴 고르기 칸 모두 같은 그림
   · 결(무늬)은 simplex-noise(MIT, 있으면)로 이음매 없는 타일을 만듦. 못 불러오면 단순한 결로 대신 */
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  // 동물 · 크레파스 색 (cozy.css 파스텔과 어울리게, 서로 잘 구별되게)
  const ANIMALS = [
    { id: 'cat', name: '고양이', em: '🐱', color: '#f6c04f' },
    { id: 'dog', name: '강아지', em: '🐶', color: '#7db6ee' },
    { id: 'rabbit', name: '토끼', em: '🐰', color: '#b49cf0' },
    { id: 'bear', name: '곰돌이', em: '🐻', color: '#c39478' },
    { id: 'panda', name: '판다', em: '🐼', color: '#62c6a8' },
    { id: 'frog', name: '개구리', em: '🐸', color: '#9fd468' },
    { id: 'pig', name: '꿀꿀이', em: '🐷', color: '#f497b9' },
    { id: 'fox', name: '여우', em: '🦊', color: '#ff9866' },
    // 친구랑 12명까지: 4마리 더 (기존 8색과 겹치지 않는 회색 · 남색 · 자주 · 빨강)
    { id: 'koala', name: '코알라', em: '🐨', color: '#9eaabb' },
    { id: 'penguin', name: '펭귄', em: '🐧', color: '#5a78c8' },
    { id: 'mouse', name: '생쥐', em: '🐭', color: '#d27bd0' },
    { id: 'squirrel', name: '다람쥐', em: '🐿️', color: '#e2665e' },
  ];
  const INK = '#4a3426';

  // ── 색 도우미
  const hex2 = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function mix(a, b, t) { const x = hex2(a), y = hex2(b); return toHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t)); }
  const shade = (c, k) => k < 0 ? mix(c, INK, -k) : mix(c, '#ffffff', k);
  function rgba(c, a) { const x = hex2(c); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; }

  // 플레이어 색 묶음 (땅 · 선 · 테두리 · 머리)
  const PAL = ANIMALS.map(a => ({
    land: a.color,
    edge: shade(a.color, -0.3),
    trail: shade(a.color, -0.16),
    trailHi: shade(a.color, 0.42),
    head: a.id === 'panda' ? mix(a.color, '#ffffff', 0.8) : shade(a.color, 0.16),
    deep: shade(a.color, -0.12),
    mini: shade(a.color, 0.08),
    text: shade(a.color, -0.42),
  }));

  // ── 잡음 (simplex-noise 가 있으면 그것, 없으면 사인 섞기)
  function mulberry(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  let N2 = null, N4 = null;
  function noise() {
    if (N2) return;
    const lib = window.SimplexNoiseLib, r = mulberry(20261030);
    if (lib && lib.createNoise2D && lib.createNoise4D) { N2 = lib.createNoise2D(r); N4 = lib.createNoise4D(r); return; }
    N2 = (x, y) => (Math.sin(x * 1.7 + Math.sin(y * 1.3) * 1.9) * Math.cos(y * 1.9 + Math.sin(x * 0.8) * 1.4) + Math.sin((x + y) * 2.9) * 0.3) * 0.8;
    N4 = (a, b, c, d) => Math.sin(a * 2.1 + b * 3.3 + Math.sin(c * 1.7 - d * 2.3) * 2) * Math.cos(c * 2.9 - d * 1.3 + Math.sin(a * 1.1) * 1.5);
  }

  // ── 크레파스 결: 이음매 없는 타일 (가는 알갱이 + 비스듬한 결 + 종이 구멍)
  const TILE = 128;
  let grainA = null, grainS = null;
  function grain() {
    if (grainA) return;
    noise();
    const T = TILE;
    const ca = document.createElement('canvas'), cb = document.createElement('canvas');
    ca.width = ca.height = cb.width = cb.height = T;
    const ia = ca.getContext('2d').createImageData(T, T), ib = cb.getContext('2d').createImageData(T, T);
    const k = TAU / T;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const ax = x * k, ay = y * k, u = (x + y) * k, v = (x - y) * k;
      const g = N4(8 * Math.cos(ax), 8 * Math.sin(ax), 8 * Math.cos(ay), 8 * Math.sin(ay));            // 고운 알갱이
      const s = N4(0.9 * Math.cos(u), 0.9 * Math.sin(u), 5.5 * Math.cos(v), 5.5 * Math.sin(v));        // 비스듬한 결
      let a = 0.93 + 0.06 * s;
      if (g > 0.38) a -= (g - 0.38) * 0.95;
      a = Math.max(0.42, Math.min(1, a));
      const d = Math.max(0, Math.min(0.16, (s - 0.2) * 0.3));
      const i = (y * T + x) * 4;
      ia.data[i] = ia.data[i + 1] = ia.data[i + 2] = 0; ia.data[i + 3] = a * 255;
      ib.data[i] = 74; ib.data[i + 1] = 52; ib.data[i + 2] = 38; ib.data[i + 3] = d * 255;
    }
    ca.getContext('2d').putImageData(ia, 0, 0); cb.getContext('2d').putImageData(ib, 0, 0);
    grainA = ca; grainS = cb;
  }
  // 색 하나의 크레파스 타일
  const tiles = {};
  function crayon(color) {
    if (tiles[color]) return tiles[color];
    grain();
    const c = document.createElement('canvas'); c.width = c.height = TILE;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, TILE, TILE);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(grainA, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.drawImage(grainS, 0, 0);
    return (tiles[color] = c);
  }
  // 종이 결 (아주 옅게)
  let paperT = null;
  function paper() {
    if (paperT) return paperT;
    noise();
    const T = 160, c = document.createElement('canvas'); c.width = c.height = T;
    const g = c.getContext('2d'), im = g.createImageData(T, T), k = TAU / T, base = hex2('#fffaf1');
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const ax = x * k, ay = y * k;
      const n = N4(14 * Math.cos(ax), 14 * Math.sin(ax), 14 * Math.cos(ay), 14 * Math.sin(ay)) * 0.6 + N4(3 * Math.cos(ax) + 9, 3 * Math.sin(ax), 3 * Math.cos(ay), 3 * Math.sin(ay)) * 0.4;
      const d = n * 4.5, i = (y * T + x) * 4;
      im.data[i] = base[0] + d; im.data[i + 1] = base[1] + d; im.data[i + 2] = base[2] + d * 1.2; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return (paperT = c);
  }

  // ── 동물 얼굴: 반지름 1 기준 (x, y = 가운데, r = 반지름 px)
  //   o: look [x,y] 보는 쪽 · blink 0~1 · mood 0 보통 1 신남 2 놀람 · sx·sy 찌그러짐 · tilt · shadow
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function face(g, x, y, r, idx, o) {
    o = o || {};
    const A = ANIMALS[idx % ANIMALS.length], P = PAL[idx % ANIMALS.length], id = A.id;
    const lx = o.look ? o.look[0] : 0, ly = o.look ? o.look[1] : 0;
    const mood = o.mood || 0, blink = o.blink || 0;
    g.save();
    g.translate(x, y);
    if (o.shadow) { g.fillStyle = 'rgba(91,70,54,0.2)'; ell(g, 0, r * 0.86, r * 0.86, r * 0.3); g.fill(); }
    if (o.tilt) g.rotate(o.tilt);
    g.scale(r * (o.sx || 1), r * (o.sy || 1));
    g.lineJoin = 'round'; g.lineCap = 'round';
    const out = P.edge, lw = 0.1, headC = P.head, deep = P.deep;
    const stroke = (w, c) => { g.lineWidth = w || lw; g.strokeStyle = c || out; g.stroke(); };
    const fill = c => { g.fillStyle = c; g.fill(); };
    const pink = '#ff9fb4';
    // 1) 머리 뒤에 오는 귀
    if (id === 'cat' || id === 'fox' || id === 'squirrel') {
      const tall = id === 'fox' ? 0.14 : id === 'squirrel' ? 0.08 : 0;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 0.9, -0.22); g.quadraticCurveTo(s * 0.94, -1.0 - tall, s * 0.64, -1.08 - tall); g.quadraticCurveTo(s * 0.42, -0.98 - tall, s * 0.16, -0.84); g.closePath();
        fill(headC); stroke();
        g.beginPath(); g.moveTo(s * 0.74, -0.4); g.quadraticCurveTo(s * 0.78, -0.86 - tall, s * 0.62, -0.92 - tall); g.quadraticCurveTo(s * 0.48, -0.86 - tall, s * 0.34, -0.76); g.closePath();
        fill(id === 'cat' ? pink : shade(A.color, -0.32));
      }
    } else if (id === 'koala' || id === 'mouse') {                          // 크고 둥근 귀
      const ex = id === 'koala' ? 0.86 : 0.74, ey = id === 'koala' ? -0.52 : -0.74, er = id === 'koala' ? 0.44 : 0.4;
      for (const s of [-1, 1]) {
        ell(g, s * ex, ey, er, er * 0.95); fill(headC); stroke();
        ell(g, s * ex * 0.97, ey + 0.02, er * 0.55, er * 0.52); fill(id === 'koala' ? shade(A.color, 0.55) : pink);
      }
    } else if (id === 'rabbit') {
      for (const s of [-1, 1]) {
        ell(g, s * 0.36, -1.02, 0.23, 0.62, s * 0.15); fill(headC); stroke();
        ell(g, s * 0.36, -0.98, 0.11, 0.44, s * 0.15); fill(pink);
      }
    } else if (id === 'bear' || id === 'panda') {
      for (const s of [-1, 1]) {
        ell(g, s * 0.7, -0.7, 0.32, 0.32); fill(id === 'panda' ? '#4d4038' : headC); stroke(lw, id === 'panda' ? '#3b302a' : out);
        if (id === 'bear') { ell(g, s * 0.7, -0.7, 0.16, 0.16); fill(shade(A.color, 0.45)); }
      }
    } else if (id === 'pig') {
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 0.78, -0.5); g.quadraticCurveTo(s * 0.98, -0.98, s * 0.66, -1.0); g.quadraticCurveTo(s * 0.46, -0.9, s * 0.3, -0.8); g.closePath();
        fill(deep); stroke();
      }
    } else if (id === 'frog') {
      for (const s of [-1, 1]) { ell(g, s * 0.46, -0.7, 0.36, 0.34); fill(headC); stroke(); }
    }
    // 2) 머리
    if (id === 'frog') ell(g, 0, 0.04, 1.08, 0.92); else ell(g, 0, 0, 1, 0.97);
    fill(headC); stroke();
    // 볼·입 쪽 무늬
    const fx = lx * 0.1, fy = ly * 0.08;          // 보는 쪽으로 얼굴 부품이 살짝 쏠림 (돌아보는 느낌)
    if (id === 'fox') {
      g.save(); ell(g, 0, 0, 0.95, 0.92); g.clip();
      for (const s of [-1, 1]) { ell(g, s * 0.4 + fx, 0.5 + fy, 0.55, 0.42); fill('#fff6ea'); }
      g.restore();
    }
    if (id === 'penguin') {                                                 // 하얀 얼굴 (하트 모양 두 겹)
      g.save(); ell(g, 0, 0, 0.95, 0.92); g.clip();
      for (const s of [-1, 1]) { ell(g, s * 0.3 + fx, 0.16 + fy, 0.44, 0.6); fill('#fffaf3'); }
      g.restore();
    }
    if (id === 'dog' || id === 'bear' || id === 'squirrel') { ell(g, fx, 0.36 + fy, 0.4, 0.29); fill(shade(A.color, 0.55)); }
    if (id === 'panda') for (const s of [-1, 1]) { ell(g, s * 0.37 + fx, -0.02 + fy, 0.21, 0.27, s * -0.5); fill('#4d4038'); }
    // 3) 볼
    if (mood !== 2) for (const s of [-1, 1]) { ell(g, s * 0.6 + fx, 0.27 + fy, 0.17, 0.11); fill('rgba(255,112,124,0.32)'); }
    // 4) 눈
    const ex = 0.36, ey = id === 'frog' ? -0.7 : -0.05;
    for (const s of [-1, 1]) {
      const cx = s * (id === 'frog' ? 0.46 : ex) + fx * (id === 'frog' ? 0.5 : 1), cy = ey + fy * (id === 'frog' ? 0.5 : 1);
      if (mood === 1) {                                                     // 신남: ^ ^
        g.beginPath(); g.moveTo(cx - 0.12, cy + 0.05); g.quadraticCurveTo(cx, cy - 0.13, cx + 0.12, cy + 0.05);
        stroke(0.075, id === 'panda' ? '#fff' : INK); continue;
      }
      if (id === 'frog' || id === 'panda' || mood === 2) {                  // 흰자 + 눈동자
        const wr = mood === 2 ? 0.17 : id === 'frog' ? 0.2 : 0.12;
        ell(g, cx, cy, wr, wr * Math.max(0.12, 1 - blink)); fill('#ffffff');
        if (id !== 'panda') stroke(0.05, out);
        if (blink < 0.6) { ell(g, cx + lx * wr * 0.35, cy + ly * wr * 0.35, wr * 0.55, wr * 0.6 * Math.max(0.15, 1 - blink)); fill(INK); }
        if (blink < 0.5) { ell(g, cx + lx * wr * 0.35 - wr * 0.2, cy + ly * wr * 0.35 - wr * 0.25, wr * 0.18, wr * 0.18); fill('#ffffff'); }
      } else {
        ell(g, cx + lx * 0.04, cy + ly * 0.04, 0.12, 0.155 * Math.max(0.12, 1 - blink)); fill(INK);
        if (blink < 0.5) { ell(g, cx + lx * 0.04 - 0.035, cy + ly * 0.04 - 0.06, 0.045, 0.045); fill('#ffffff'); }
      }
    }
    // 5) 코 · 입
    const mx = fx, my = fy;
    if (id === 'pig') {
      ell(g, mx, 0.3 + my, 0.36, 0.26); fill(shade(A.color, -0.06)); stroke(0.07);
      for (const s of [-1, 1]) { ell(g, mx + s * 0.12, 0.3 + my, 0.055, 0.085); fill(shade(A.color, -0.45)); }
    } else if (id === 'koala') {                                            // 크고 까만 코
      ell(g, mx, 0.2 + my, 0.19, 0.24); fill(INK);
      ell(g, mx - 0.06, 0.12 + my, 0.05, 0.06); fill('rgba(255,255,255,0.45)');
    } else if (id === 'penguin') {                                          // 노란 부리
      g.beginPath(); g.moveTo(mx - 0.17, 0.2 + my); g.quadraticCurveTo(mx, 0.12 + my, mx + 0.17, 0.2 + my); g.quadraticCurveTo(mx, 0.42 + my, mx - 0.17, 0.2 + my); g.closePath();
      fill('#ffb547'); stroke(0.05, '#d98a2b');
    } else if (id === 'frog') {
      g.beginPath(); g.moveTo(mx - 0.42, 0.18 + my); g.quadraticCurveTo(mx, 0.52 + my, mx + 0.42, 0.18 + my); stroke(0.075, shade(A.color, -0.5));
    } else {
      const darkNose = id === 'dog' || id === 'bear' || id === 'panda' || id === 'fox' || id === 'squirrel';
      if (darkNose) { ell(g, mx, 0.2 + my, 0.11, 0.075); fill(INK); }
      else { g.beginPath(); g.moveTo(mx - 0.08, 0.15 + my); g.lineTo(mx + 0.08, 0.15 + my); g.lineTo(mx, 0.24 + my); g.closePath(); fill('#f2839a'); }
      if (mood === 2) { ell(g, mx, 0.42 + my, 0.08, 0.1); fill(INK); }
      else if (mood === 1) { g.beginPath(); g.moveTo(mx - 0.16, 0.3 + my); g.quadraticCurveTo(mx, 0.56 + my, mx + 0.16, 0.3 + my); g.closePath(); fill('#e86a7f'); }
      else { g.beginPath(); g.moveTo(mx - 0.15, 0.29 + my); g.quadraticCurveTo(mx - 0.075, 0.4 + my, mx, 0.3 + my); g.quadraticCurveTo(mx + 0.075, 0.4 + my, mx + 0.15, 0.29 + my); stroke(0.055, INK); }
    }
    // 6) 고양이·생쥐 수염
    if (id === 'cat' || id === 'mouse') {
      g.globalAlpha *= 0.55;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.52 + mx, 0.2 + my); g.lineTo(s * 0.95 + mx, 0.12 + my); g.moveTo(s * 0.52 + mx, 0.31 + my); g.lineTo(s * 0.94 + mx, 0.38 + my); stroke(0.035, INK); }
      g.globalAlpha /= 0.55;
    }
    // 7) 강아지 늘어진 귀 (머리 위에 덮음)
    if (id === 'dog') for (const s of [-1, 1]) { ell(g, s * 0.86, -0.12, 0.27, 0.56, s * -0.38); fill(deep); stroke(); }
    // 놀람: 땀방울
    if (mood === 2) {
      g.beginPath(); g.moveTo(0.74, -0.78); g.quadraticCurveTo(0.6, -0.5, 0.74, -0.42); g.quadraticCurveTo(0.88, -0.5, 0.74, -0.78); g.closePath();
      fill('#9fd3f7'); stroke(0.04, '#6aa9d6');
    }
    g.restore();
  }

  // 작은 캔버스에 얼굴 하나 (메뉴 고르기 칸 · 순위표)
  function faceCanvas(el, idx, size, o) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr); el.height = Math.round(size * dpr);
    el.style.width = size + 'px'; el.style.height = size + 'px';
    const g = el.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
    const r = size * (ANIMALS[idx].id === 'rabbit' ? 0.3 : 0.34);
    face(g, size / 2, size * (ANIMALS[idx].id === 'rabbit' ? 0.6 : 0.56), r, idx, o);
    return el;
  }

  window.LandArt = { ANIMALS, PAL, INK, mix, shade, rgba, face, faceCanvas, crayon, paper, grain, noise: () => (noise(), { n2: N2, n4: N4 }), TILE };
})();

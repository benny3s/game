/* 고스톱 패 그림 — 정통 화투 감성 SVG (외부 이미지 없이 선명한 다홍 테두리·검은 솔잎/공산·붉은 光 인장·홍단/청단/초단)
   · 진짜 화투처럼 선명한 다홍색(#c81e1e) 테두리와 깨끗한 한지/상아색(#fffdf7) 바탕, 강렬한 흑·적·황·청 대비
   · 광(光) 패에는 정통 화투의 붉은/금빛 '光' 인장을 선명하게 새김
   · 왼쪽 위 모서리: 월 숫자 배지 + 종류 표(광·끗·띠·쌍)로 손패가 겹쳐도 한눈에 식별 가능
   GostopArt.install() · GostopArt.use(id) · GostopArt.MONTH_COLOR */
(function (root) {
  'use strict';
  const f = n => Math.round(n * 10) / 10;
  const circle = (x, y, r, fill, o = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${o}/>`;
  const ell = (x, y, rx, ry, fill, rot = 0, o = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${rot ? ` transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ''}${o}/>`;
  const path = (d, fill, o = '') => `<path d="${d}" fill="${fill}"${o}/>`;
  const line = (d, color, w, o = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
  const g = (inner, tr) => `<g${tr ? ` transform="${tr}"` : ''}>${inner}</g>`;
  const text = (x, y, s, size, fill, o = '') => `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" font-family="Jua,'Gowun Dodum',sans-serif"${o}>${s}</text>`;

  function flower5(x, y, r, petal, center, rot = 0, stroke = '#2b1810') {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = (rot + i * 72 - 90) * Math.PI / 180;
      s += circle(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58, r * 0.5, petal, ` stroke="${stroke}" stroke-width="0.9"`);
    }
    return s + circle(x, y, r * 0.3, center);
  }
  function leaf(x, y, len, w, a, fill, stroke = '') {
    const r = a * Math.PI / 180, ex = x + Math.cos(r) * len, ey = y + Math.sin(r) * len;
    const nx = -Math.sin(r) * w, ny = Math.cos(r) * w, mx = (x + ex) / 2, my = (y + ey) / 2;
    return path(`M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`, fill, stroke ? ` stroke="${stroke}" stroke-width="0.8"` : '');
  }
  function maple(x, y, r, fill, rot = 0) {
    let d = '';
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.42 : r, a = (rot + i * 36 - 90) * Math.PI / 180; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); }
    return path(d + 'Z', fill, ' stroke="#6b1d0f" stroke-width="0.9" stroke-linejoin="round"') + line(`M${f(x)} ${f(y)}L${f(x)} ${f(y + r * 1.1)}`, '#5c190d', 1.4);
  }

  // 정통 화투 월별 포인트 색 & 배경 틴트
  const MONTH_COLOR = ['#15803d', '#be123c', '#db2777', '#334155', '#1d4ed8', '#9333ea', '#c2410c', '#b91c1c', '#d97706', '#dc2626', '#4d7c0f', '#0f766e'];
  const TINT = ['#f4fbf6', '#fff5f6', '#fff5fa', '#f6f7f9', '#f2f7ff', '#faf5ff', '#fff7f2', '#fff6f0', '#fffbeb', '#fff5f0', '#f7fee7', '#f0fdfa'];
  const INK = '#1c1512';
  const RED = '#d91c1c';
  const GOLD = '#f59e0b';

  // ── 띠 (홍단 · 청단 · 초단 · 비띠) ──
  const RIB_COL = {
    1: ['#dc2626', '#7f1d1d', '홍단', '#fef2f2'],
    2: ['#1d4ed8', '#1e3a8a', '청단', '#eff6ff'],
    3: ['#e11d48', '#881337', '초단', '#fff1f2'],
    4: ['#dc2626', '#7f1d1d', '', '#fef2f2'],
  };
  function ribbon(kind, rot = 9, cx = 52, cy = 74) {
    const [c, d, label] = RIB_COL[kind];
    let s = path('M39 28 L65 28 L63 108 L52 98 L41 108 Z', c, ` stroke="${d}" stroke-width="2" stroke-linejoin="round"`);
    s += path('M42 31 L62 31 L60.5 101 L52 93 L43.5 101 Z', 'none', ' stroke="#fde68a" stroke-width="1" opacity=".75"');
    if (kind === 4) s += line('M45 52 L59 50 M45 66 L59 64 M45 80 L58 78', '#fff', 2, ' opacity=".7"');
    if (label) {
      s += circle(52, 54, 9.5, '#fffdf7', ` stroke="${d}" stroke-width="1.2"`) + text(52, 54.5, label[0], 13.5, d);
      s += circle(52, 76, 9.5, '#fffdf7', ` stroke="${d}" stroke-width="1.2"`) + text(52, 76.5, label[1], 13.5, d);
    }
    return g(s, `rotate(${rot} ${cx} ${cy})`);
  }

  // ── 광(光) 전통 인장 ──
  function gwangSeal(x = 76, y = 26) {
    return circle(x, y, 14.5, '#facc15', ' opacity=".45"') +
      circle(x, y, 12, '#dc2626', ' stroke="#fef08a" stroke-width="2.2"') +
      circle(x, y, 9.5, 'none', ' stroke="#fca5a5" stroke-width="0.8"') +
      `<text x="${f(x)}" y="${f(y + 0.5)}" font-size="14" font-weight="900" fill="#fffbeb" text-anchor="middle" dominant-baseline="central" font-family="serif">光</text>`;
  }

  // ── 달마다 식물 (정통 화투의 묵직한 먹색·적색·록색 대비) ──
  const P = [];
  // 1월 송학: 검은 솔잎과 소나무 줄기
  P[0] = v => {
    const flip = v === 3;
    let s = path('M6 152 Q30 126 52 134 Q76 140 94 126 L94 154 L6 154 Z', '#14532d');
    const needles = (cx, cy, r) => {
      let n = ell(cx, cy, r, r * 0.55, '#111827');
      for (let i = -3; i <= 3; i++) n += line(`M${cx} ${cy + 3} L${cx + i * (r * 0.28)} ${cy - r * 0.45}`, '#22c55e', 1.3);
      return n;
    };
    const tree = line('M50 152 Q44 126 54 106 Q60 92 50 78', '#78350f', 7) +
      needles(34, 114, 21) + needles(66, 104, 23) + needles(50, 86, 19) +
      needles(28, 130, 17) + needles(72, 124, 17);
    s += flip ? g(tree, 'translate(100 0) scale(-1 1)') : tree;
    return s;
  };
  // 2월 매조: 고목 매화 가지와 붉은 매화꽃
  P[1] = v => {
    let s = line('M8 150 Q30 118 46 98 Q62 78 88 58', '#271c19', 6.5) + line('M46 98 Q60 108 76 102', '#271c19', 4.5) + line('M60 82 Q55 62 66 46', '#271c19', 4);
    const fl = [[86, 60], [74, 102], [65, 48], [28, 124], [52, 90], [40, 140], [78, 80]];
    fl.forEach(([x, y], i) => { if (v === 3 && i === 5) return; s += flower5(x, y, 9, i % 2 ? '#e11d48' : '#be123c', '#fde047', i * 17, '#4c0519'); });
    return s;
  };
  // 3월 벚꽃: 화려한 분홍/백색 벚꽃 송이
  P[2] = v => {
    let s = line('M94 24 Q68 38 58 64 Q50 84 26 96', '#271c19', 5.5) + line('M64 54 Q78 70 84 92', '#271c19', 4);
    const fl = [[58, 64], [28, 96], [84, 90], [74, 36], [44, 80], [88, 64], [20, 112]];
    fl.forEach(([x, y], i) => { if (v === 3 && i > 4) return; s += flower5(x, y, 10.5, i % 2 ? '#fbcfe8' : '#f472b6', '#dc2626', i * 23, '#831843'); });
    return s;
  };
  // 4월 흑싸리: 강렬한 검은 싸리 가지
  P[3] = v => {
    let s = line('M18 6 Q22 32 28 50 M50 6 Q48 28 54 44 M80 6 Q78 26 74 40', '#111827', 3);
    const drop = (x, y, n) => {
      let t = line(`M${x} ${y} L${x} ${y + n * 9}`, '#111827', 1.8);
      for (let i = 0; i < n; i++) t += ell(x + (i % 2 ? 6 : -6), y + i * 9, 6, 3.8, '#111827', i % 2 ? 28 : -28);
      return t + circle(x, y + n * 9, 3, '#dc2626');
    };
    s += v === 0 ? drop(28, 48, 5) + drop(54, 42, 4) + drop(74, 38, 5) : drop(28, 48, v === 3 ? 6 : 7) + drop(54, 42, 9) + drop(74, 38, v === 2 ? 6 : 8);
    return s;
  };
  // 5월 난초(창포): 짙은 녹색 창포 잎과 보라/노란 창포꽃
  P[4] = v => {
    let s = '';
    for (const [x, a] of [[20, -100], [30, -78], [42, -96], [60, -84], [72, -104], [82, -80]]) s += leaf(x, 154, 76 + (x % 3) * 8, 4, a, '#15803d', '#052e16');
    const iris = (x, y) => leaf(x, y, 15, 6.5, -150, '#4338ca', '#1e1b4b') + leaf(x, y, 15, 6.5, -30, '#4338ca', '#1e1b4b') + leaf(x, y, 16, 6.5, 90, '#312e81', '#1e1b4b') + leaf(x, y, 13, 5.5, -90, '#6366f1') + circle(x, y + 2, 3, '#facc15');
    s += iris(30, 84) + iris(66, 68);
    if (v !== 3) s += iris(48, 108);
    return s;
  };
  // 6월 모란: 탐스러운 진홍/자주 모란꽃
  P[5] = v => {
    let s = leaf(20, 142, 32, 10, -60, '#15803d', '#052e16') + leaf(78, 144, 32, 10, -120, '#15803d', '#052e16') + leaf(50, 152, 28, 9, -90, '#111827');
    const peony = (x, y, r) => circle(x, y, r, '#be123c', ' stroke="#4c0519" stroke-width="1.4"') +
      circle(x - r * 0.38, y - r * 0.2, r * 0.58, '#e11d48', ' stroke="#881337" stroke-width="1"') +
      circle(x + r * 0.38, y - r * 0.15, r * 0.56, '#f43f5e', ' stroke="#881337" stroke-width="1"') +
      circle(x, y + r * 0.24, r * 0.54, '#fb7185', ' stroke="#881337" stroke-width="1"') +
      circle(x, y - r * 0.05, r * 0.28, '#facc15', ' stroke="#78350f" stroke-width="1"');
    s += peony(50, 112, 21);
    if (v !== 3) s += peony(24, 88, 11.5);
    s += peony(78, 90, 12.5);
    return s;
  };
  // 7월 홍싸리: 붉은 꽃이 핀 싸리 가지
  P[6] = v => {
    let s = '';
    const br = (d, x0, y0, x1, y1, n) => {
      let t = line(d, '#271c19', 2.8);
      for (let i = 1; i <= n; i++) {
        const tt = i / (n + 1), x = x0 + (x1 - x0) * tt, y = y0 + (y1 - y0) * tt;
        t += leaf(x, y, 10, 3.8, -60 + (i % 2) * 120, '#15803d', '#052e16') +
          circle(x + 2.5, y - 4.5, 4, '#dc2626', ' stroke="#450a0a" stroke-width="0.8"') +
          circle(x - 3, y - 7, 2.8, '#fbbf24');
      }
      return t;
    };
    s += br('M10 150 Q30 90 70 38', 10, 150, 70, 38, 7) + br('M40 152 Q56 100 90 68', 40, 152, 90, 68, v === 3 ? 4 : 6) + (v !== 3 ? br('M70 152 Q76 120 92 104', 70, 152, 92, 104, 3) : '');
    return s;
  };
  // 8월 공산: 정통 화투의 상징! 둥근 검은 동산과 억새
  P[7] = v => {
    let s = path('M6 154 L6 102 Q50 58 94 102 L94 154 Z', '#18181b') +
      path('M6 154 L6 122 Q46 96 94 124 L94 154 Z', '#09090b');
    for (const x of [16, 30, 48, 68, 84]) {
      s += line(`M${x} 150 Q${x - 4} 132 ${x + 5} 116`, '#fde047', 1.8) +
        line(`M${x + 4} 150 Q${x + 9} 136 ${x + 2} 122`, '#facc15', 1.5);
    }
    return s;
  };
  // 9월 국화: 선명한 황금빛/붉은 국화
  P[8] = v => {
    let s = leaf(24, 150, 30, 9, -70, '#14532d', '#052e16') + leaf(74, 150, 30, 9, -110, '#14532d', '#052e16');
    const mum = (x, y, r, c1, c2) => {
      let t = '';
      for (let i = 0; i < 12; i++) { const a = i * 30; t += leaf(x, y, r, r * 0.25, a, i % 2 ? c1 : c2, '#78350f'); }
      return t + circle(x, y, r * 0.34, '#b91c1c', ' stroke="#fef08a" stroke-width="1.2"');
    };
    s += mum(52, 120, 18, '#facc15', '#eab308');
    if (v !== 3) s += mum(24, 96, 12, '#dc2626', '#f87171');
    s += mum(78, 92, 13, '#facc15', '#fde047');
    return s;
  };
  // 10월 단풍: 타오르는 듯한 진홍/주황 단풍잎
  P[9] = v => {
    let s = line('M90 10 Q70 34 58 60 Q48 82 20 100', '#271c19', 4.5) + line('M60 56 Q40 46 20 50', '#271c19', 3.5);
    const ms = [[22, 100, 13, '#dc2626'], [58, 64, 14, '#b91c1c'], [22, 50, 11, '#ea580c'], [82, 20, 11, '#dc2626'], [42, 122, 12, '#f59e0b'], [74, 44, 10, '#b91c1c']];
    ms.forEach(([x, y, r, c], i) => { if (v === 3 && i === 4) return; s += maple(x, y, r, c, i * 13); });
    return s;
  };
  // 11월 오동(똥): 묵직한 검은 오동잎과 보라 꽃송이
  P[10] = v => {
    let s = '';
    const lf = (x, y, r, c) => path(`M${x} ${y + r}C${x - r * 1.45} ${y + r * 0.2} ${x - r * 0.9} ${y - r} ${x} ${y - r * 0.5}C${x + r * 0.9} ${y - r} ${x + r * 1.45} ${y + r * 0.2} ${x} ${y + r}Z`, c, ' stroke="#09090b" stroke-width="1.2"') + line(`M${x} ${y + r}L${x} ${y - r * 0.4}`, '#fde047', 1.4);
    s += lf(26, 130, 17, '#18181b') + lf(72, 128, 19, '#111827') + lf(50, 110, 16, '#1f2937');
    s += line('M50 98 L50 66', '#4c1d95', 2.6) + circle(50, 64, 4.5, '#9333ea', ' stroke="#fef08a" stroke-width="1"') + circle(44, 73, 4, '#7e22ce') + circle(56, 75, 4, '#9333ea') + circle(50, 84, 3.8, '#6b21a8');
    return s;
  };
  // 12월 비: 세찬 빗줄기와 검은 수양버들
  P[11] = v => {
    let s = '';
    for (let i = 0; i < 14; i++) { const x = 10 + i * 6.4, y = 8 + (i % 3) * 6; s += line(`M${f(x)} ${y}L${f(x - 8)} ${y + 18}`, '#3b82f6', 1.5, ' opacity=".75"'); }
    s += line('M8 8 Q40 22 74 10', '#111827', 3.5);
    for (const [x, len] of [[14, 72], [24, 98], [36, 82], [50, 106], [62, 76], [74, 94]]) {
      s += line(`M${x} 12 Q${x - 6} ${12 + len / 2} ${x + 2} ${12 + len}`, '#14532d', 2.2);
      for (let k = 1; k < 5; k++) s += leaf(x - 2 + (k % 2) * 2, 12 + len * k / 5, 8, 2.5, 100 + (k % 2) * 30, '#15803d', '#052e16');
    }
    return s;
  };

  // ── 광·열끗 그림 ──
  const SPECIAL = {
    // 1월 송학 광: 강렬한 붉은 태양 + 백학 + 光 인장
    0: () => circle(68, 36, 19, '#dc2626', ' stroke="#fef08a" stroke-width="1.5"') +
      g(ell(40, 74, 19, 12.5, '#ffffff', 0, ' stroke="#111827" stroke-width="1.6"') +
        path('M22 72 Q14 80 20 90 Q30 85 32 78 Z', '#111827') +
        line('M50 68 Q58 50 52 38', '#111827', 8) + line('M50 68 Q58 50 52 38', '#ffffff', 5.5) +
        circle(52, 36, 7, '#ffffff', ' stroke="#111827" stroke-width="1.4"') +
        circle(53, 31, 3.6, '#dc2626') + path('M58 37 L69 39 L58 41 Z', '#f59e0b', ' stroke="#78350f" stroke-width="0.8"') +
        circle(54, 36, 1.5, INK) + line('M36 86 L34 104 M44 86 L46 104', '#dc2626', 2)) +
      gwangSeal(76, 128),
    // 2월 매조 열끗: 꾀꼬리(고도리)
    4: () => g(ell(40, 64, 16, 11.5, '#65a30d', 0, ' stroke="#1a2e05" stroke-width="1.5"') +
      ell(35, 66, 10, 6.5, '#3f6212', -15) +
      circle(52, 55, 8.5, '#84cc16', ' stroke="#1a2e05" stroke-width="1.4"') +
      circle(55, 53, 1.8, INK) + path('M59 55 L68 57 L59 60 Z', '#f59e0b', ' stroke="#78350f" stroke-width="0.8"') +
      path('M25 64 L12 71 L25 71 Z', '#1a2e05') + ell(44, 70, 7.5, 4.2, '#fef08a')),
    // 3월 벚꽃 광: 전통 적·청·흑 줄무늬 만막(장막) + 光 인장
    8: () => {
      let s = path('M8 100 Q30 92 50 100 Q70 108 92 100 L92 144 Q70 136 50 144 Q30 152 8 144 Z', '#fff1f2', ' stroke="#111827" stroke-width="1.6"');
      const cols = ['#dc2626', '#1d4ed8', '#111827', '#dc2626', '#1d4ed8'];
      [18, 34, 50, 66, 82].forEach((x, i) => { s += path(`M${x - 5} 100 L${x + 5} 100 L${x + 5} 142 L${x - 5} 142 Z`, cols[i], ' opacity=".88"'); });
      s += path('M8 100 Q30 92 50 100 Q70 108 92 100 L92 110 Q70 118 50 110 Q30 102 8 110 Z', '#dc2626', ' stroke="#111827" stroke-width="1.2"');
      for (const x of [16, 50, 84]) s += line(`M${x} 144 L${x} 153`, '#f59e0b', 2.5) + circle(x, 154, 2.5, '#dc2626');
      return s + gwangSeal(76, 30);
    },
    // 4월 흑싸리 열끗: 두견새(고도리) + 붉은 구름/초승달
    12: () => path('M68 16 A13 13 0 1 0 82 36 A10 10 0 1 1 68 16 Z', '#facc15', ' stroke="#b45309" stroke-width="1"') +
      g(path('M28 80 Q46 54 64 74 Q48 74 28 80 Z', '#1e293b', ' stroke="#0f172a" stroke-width="1.2"') +
        path('M38 74 Q18 52 12 66 Q26 70 38 74 Z', '#dc2626', ' stroke="#7f1d1d" stroke-width="1"') +
        path('M50 72 Q66 48 80 58 Q66 66 50 72 Z', '#334155', ' stroke="#0f172a" stroke-width="1"') +
        circle(64, 70, 6.5, '#1e293b') + circle(66, 69, 1.6, '#fef08a') +
        path('M69 71 L78 72 L69 75 Z', '#f59e0b') + path('M28 80 L15 89 L26 83 Z', '#0f172a'), 'translate(-7 34) scale(1.24)'),
    // 5월 난초 열끗: 붉은 팔각 다리(초다리)
    16: () => {
      let s = path('M6 118 L40 102 L60 114 L94 98 L94 112 L60 128 L40 116 L6 132 Z', '#dc2626', ' stroke="#450a0a" stroke-width="1.6"') +
        path('M6 130 L40 114 L60 126 L94 110 L94 116 L60 132 L40 120 L6 136 Z', '#f59e0b', ' stroke="#78350f" stroke-width="1.2"');
      for (const x of [14, 30, 48, 66, 84]) s += line(`M${x} ${x < 40 ? 128 - (x - 6) * 0.45 : x < 60 ? 116 + (x - 40) * 0.6 : 128 - (x - 60) * 0.47} l0 18`, '#111827', 3);
      return s;
    },
    // 6월 모란 열끗: 호랑나비 두 마리
    20: () => {
      const bf = (x, y, s, c, c2) => g(
        ell(-6, -4, 7.5, 9.5, c, -20, ' stroke="#111827" stroke-width="1.2"') +
        ell(6, -4, 7.5, 9.5, c, 20, ' stroke="#111827" stroke-width="1.2"') +
        ell(-5, 7, 5.5, 6.5, c2, 20, ' stroke="#111827" stroke-width="1.2"') +
        ell(5, 7, 5.5, 6.5, c2, -20, ' stroke="#111827" stroke-width="1.2"') +
        circle(-6, -5, 2.2, '#dc2626') + circle(6, -5, 2.2, '#dc2626') +
        ell(0, 1, 1.8, 9.5, '#111827') + line('M0 -8 L-5 -16 M0 -8 L5 -16', '#111827', 1.2),
        `translate(${x} ${y}) scale(${s})`);
      return bf(36, 46, 1.28, '#facc15', '#f59e0b') + bf(68, 62, 1.05, '#38bdf8', '#0284c7');
    },
    // 7월 홍싸리 열끗: 멧돼지
    24: () => g(ell(48, 70, 25, 16, '#451a03', 0, ' stroke="#111827" stroke-width="1.6"') +
      ell(48, 76, 18, 7, '#78350f') + circle(70, 64, 10.5, '#451a03', ' stroke="#111827" stroke-width="1.4"') +
      ell(80, 67, 5.5, 4.2, '#ef4444', 0, ' stroke="#7f1d1d" stroke-width="1"') +
      circle(78, 66, 1, INK) + circle(82, 66, 1, INK) +
      circle(70, 60, 2, '#facc15') + circle(70, 60, 1, INK) +
      path('M62 56 L57 46 L67 54 Z', '#451a03', ' stroke="#111827" stroke-width="1.2"') +
      path('M74 71 L82 69 L76 76 Z', '#ffffff', ' stroke="#111827" stroke-width="0.9"') +
      line('M34 82 L32 94 M44 84 L44 96 M56 84 L57 96 M64 82 L66 94', '#111827', 3.4)),
    // 8월 공산 광: 붉은 밤하늘 + 거대한 백색 보름달 + 光 인장
    28: () => `<rect x="6" y="6" width="88" height="106" rx="6" fill="#dc2626"/>` +
      path('M6 154 L6 100 Q50 56 94 100 L94 154 Z', '#111827') +
      circle(54, 48, 25, '#ffffff', ' stroke="#fef08a" stroke-width="2"') +
      gwangSeal(76, 128),
    // 8월 공산 열끗: 기러기 세 마리(고도리)
    29: () => {
      const gs = (x, y, s) => g(path('M-15 0 Q-6 -9 0 0 Q6 -9 15 0 Q6 -3 0 5 Q-6 -3 -15 0 Z', '#111827') +
        circle(2, -1, 2.8, '#dc2626') + path('M4 -1 L9 0 L4 2 Z', '#facc15'), `translate(${x} ${y}) scale(${s})`);
      return gs(34, 34, 1.35) + gs(64, 48, 1.2) + gs(44, 66, 1.05);
    },
    // 9월 국화 열끗(국진): 붉은 술잔 (목숨 수 壽)
    32: () => path('M26 62 L74 62 Q70 86 50 90 Q30 86 26 62 Z', '#dc2626', ' stroke="#450a0a" stroke-width="1.8"') +
      ell(50, 62, 24, 6, '#ef4444', 0, ' stroke="#450a0a" stroke-width="1.4"') +
      ell(50, 62, 19, 3.8, '#fde047') +
      path('M42 90 L58 90 L61 99 L39 99 Z', '#991b1b', ' stroke="#450a0a" stroke-width="1.4"') +
      `<text x="50" y="77" font-size="14" font-weight="900" fill="#fef08a" text-anchor="middle" dominant-baseline="central" font-family="serif">壽</text>`,
    // 10월 단풍 열끗: 사슴
    36: () => g(ell(46, 82, 21, 13, '#b45309', 0, ' stroke="#451a03" stroke-width="1.5"') +
      circle(65, 63, 8.5, '#b45309', ' stroke="#451a03" stroke-width="1.4"') +
      ell(72, 67, 5, 3.6, '#78350f') + circle(66, 61, 1.6, INK) + circle(75, 67, 1.3, INK) +
      line('M60 55 L55 40 M55 46 L48 41 M67 55 L72 40 M70 46 L77 41', '#111827', 2.4) +
      line('M58 72 L63 76', '#b45309', 6.5) +
      line('M34 92 L32 108 M42 93 L42 109 M52 93 L53 109 M60 91 L62 107', '#451a03', 3.2) +
      circle(38, 80, 2.4, '#fef08a') + circle(48, 76, 2.4, '#fef08a') + circle(52, 86, 2.2, '#fef08a')),
    // 11월 오동 광: 화려한 봉황 + 光 인장
    40: () => g(path('M30 40 Q18 18 36 12 Q34 28 44 34 Z', '#facc15', ' stroke="#78350f" stroke-width="1"') +
      path('M40 36 Q36 14 52 10 Q48 28 54 34 Z', '#dc2626', ' stroke="#450a0a" stroke-width="1"') +
      path('M52 36 Q56 16 72 16 Q60 30 60 38 Z', '#1d4ed8', ' stroke="#1e3a8a" stroke-width="1"') +
      circle(52, 50, 15, '#dc2626', ' stroke="#450a0a" stroke-width="1.5"') +
      circle(48, 48, 3.4, '#fff') + circle(48.5, 48, 1.8, INK) +
      path('M62 50 L76 54 L62 58 Z', '#facc15', ' stroke="#78350f" stroke-width="1"') +
      path('M40 60 Q22 72 16 94 Q34 80 44 66 Z', '#1d4ed8') +
      path('M50 64 Q44 84 48 102 Q56 84 56 64 Z', '#facc15') +
      path('M58 60 Q76 72 82 92 Q66 80 56 66 Z', '#9333ea')) +
      gwangSeal(76, 30),
    // 12월 비 광(비광): 우산 쓴 도령(냥이 도령)과 개구리 + 光 인장
    44: () => g(path('M22 52 Q50 20 78 52 Z', '#facc15', ' stroke="#78350f" stroke-width="1.6"') +
      path('M22 52 Q36 44 50 52 Q64 44 78 52', 'none', ' stroke="#dc2626" stroke-width="2"') +
      line('M50 30 L50 88', '#111827', 2.4) +
      ell(44, 100, 15, 17, '#dc2626', 0, ' stroke="#450a0a" stroke-width="1.6"') +
      circle(44, 76, 11.5, '#fffbeb', ' stroke="#111827" stroke-width="1.6"') +
      path('M35 70 L34 60 L41 67 Z', '#fffbeb', ' stroke="#111827" stroke-width="1.4" stroke-linejoin="round"') +
      path('M53 70 L54 60 L47 67 Z', '#fffbeb', ' stroke="#111827" stroke-width="1.4" stroke-linejoin="round"') +
      ell(40, 76, 1.6, 2.2, INK) + ell(48, 76, 1.6, 2.2, INK) +
      path('M43 80 L45 80 L44 82 Z', '#dc2626') +
      ell(76, 132, 9, 6.5, '#16a34a', 0, ' stroke="#052e16" stroke-width="1.2"') +
      circle(72, 126, 3.2, '#22c55e') + circle(80, 126, 3.2, '#22c55e') +
      circle(72, 126, 1.4, INK) + circle(80, 126, 1.4, INK)) +
      gwangSeal(24, 128),
    // 12월 비 열끗: 제비
    45: () => g(path('M22 70 Q40 54 56 64 Q72 48 86 38 Q76 62 60 72 Q48 80 34 76 Z', '#111827') +
      path('M34 76 Q18 90 10 94 Q22 82 28 74 Z', '#111827') +
      path('M34 76 Q24 98 20 106 Q30 90 36 78 Z', '#1e293b') +
      ell(46, 72, 9.5, 4.8, '#ffffff', -15) + circle(60, 64, 6.5, '#111827') +
      circle(62, 63, 1.5, '#fff') + path('M65 64 L72 65 L65 67 Z', '#facc15') + ell(58, 68, 3.5, 2.4, '#dc2626')),
  };

  // 쌍피 표시 그림
  const SSANG = {
    41: () => path('M6 128 L94 128 L94 154 L6 154 Z', '#facc15') + line('M6 128 L94 128', '#dc2626', 2.5),
    47: () => g(path('M24 46 Q22 28 38 28 Q44 16 58 22 Q74 18 76 34 Q88 38 82 52 L22 52 Q14 50 24 46 Z', '#1e293b') +
      path('M54 52 L42 76 L54 76 L44 102 L68 70 L56 70 L66 52 Z', '#facc15', ' stroke="#dc2626" stroke-width="1.6" stroke-linejoin="round"') +
      circle(28, 118, 14, '#dc2626', ' stroke="#fef08a" stroke-width="1.5"') + circle(28, 118, 8.5, '#facc15') + circle(28, 118, 3.5, '#111827')),
  };

  // ── 모서리 표 (월 숫자 + 종류) ──
  function corner(id, m, kind) {
    const G = root.Gostop;
    let s = circle(17, 17, 11, MONTH_COLOR[m], ' stroke="#ffffff" stroke-width="2"') +
      text(17, 17.5, String(m + 1), m >= 9 ? 12 : 14, '#ffffff');
    const tag = (bg, fg, label, size = 10) => circle(17, 39, 9.2, bg, ' stroke="#ffffff" stroke-width="1.8"') + text(17, 39.5, label, size, fg);
    if (kind === G.GW) s += tag('#dc2626', '#fef08a', '光', 11);
    else if (kind === G.YE) s += id === G.KOOK ? tag('#d97706', '#fff', '국', 9.5) : tag('#0d9488', '#fff', '끗', 9.5);
    else if (kind === G.TI) { const r = G.RIB[id]; s += tag(r === 2 ? '#1d4ed8' : '#dc2626', '#fff', '띠', 9.5); }
    else if (G.PIV[id] === 2) s += tag('#7c3aed', '#fff', '쌍', 9.5);
    return s;
  }

  // 정통 화투 프레임: 붉은 다홍 테두리(#c81e1e) + 검은 내선(#1c1917) + 한지 바탕
  function frame(m) {
    return `<rect x="1" y="1" width="98" height="158" rx="9" fill="#c81e1e" stroke="#7f1d1d" stroke-width="2"/>` +
      `<rect x="5.5" y="5.5" width="89" height="149" rx="5.5" fill="url(#hwbg${m})" stroke="#1c1917" stroke-width="1.6"/>`;
  }

  function face(id) {
    const G = root.Gostop;
    if (id >= 48) {   // 보너스 피 (황금 투구/도깨비 감성)
      const three = G.PIV[id] === 3;
      return `<rect x="1" y="1" width="98" height="158" rx="9" fill="#c81e1e" stroke="#7f1d1d" stroke-width="2"/>` +
        `<rect x="5.5" y="5.5" width="89" height="149" rx="5.5" fill="url(#hwbgB)" stroke="#b45309" stroke-width="1.8"/>` +
        path('M50 30 L59 52 L82 54 L64 69 L70 92 L50 79 L30 92 L36 69 L18 54 L41 52 Z', '#facc15', ' stroke="#b91c1c" stroke-width="2.2" stroke-linejoin="round"') +
        text(50, 112, '보너스', 15.5, '#b91c1c') + text(50, 132, three ? '쓰리피' : '쌍피', 14.5, INK) +
        circle(76, 24, 12.5, three ? '#dc2626' : '#7c3aed', ' stroke="#fef08a" stroke-width="2"') + text(76, 24.5, three ? '+3' : '+2', 11.5, '#fff');
    }
    const m = id >> 2, kind = G.KIND[id], k = id & 3;
    let s = frame(m) + P[m](k);
    if (SSANG[id]) s += SSANG[id]();
    if (SPECIAL[id]) s += SPECIAL[id]();
    if (kind === G.TI) s += ribbon(G.RIB[id], m % 2 ? -8 : 9);
    return s + corner(id, m, kind);
  }

  // 뒷면: 정통 다홍/진홍색 화투 뒷면 + 금장 테두리 + 복냥이 문장
  function back() {
    let s = `<rect x="1" y="1" width="98" height="158" rx="9" fill="url(#hwback)" stroke="#450a0a" stroke-width="2.2"/>` +
      `<rect x="8" y="8" width="84" height="144" rx="5" fill="none" stroke="#fde047" stroke-width="1.6" opacity=".65"/>` +
      `<rect x="12" y="12" width="76" height="136" rx="3" fill="none" stroke="#fca5a5" stroke-width="0.9" stroke-dasharray="3 3" opacity=".5"/>`;
    s += circle(50, 80, 24, '#7f1d1d', ' stroke="#fde047" stroke-width="1.8"') +
      circle(50, 80, 19, '#fffbeb') +
      path('M33 70 L32 52 L45 62 Z', '#fffbeb', ' stroke="#7f1d1d" stroke-width="1.2"') +
      path('M67 70 L68 52 L55 62 Z', '#fffbeb', ' stroke="#7f1d1d" stroke-width="1.2"') +
      ell(43, 80, 2.5, 3.2, '#1c1917') + ell(57, 80, 2.5, 3.2, '#1c1917') +
      path('M48 85 L52 85 L50 88 Z', '#dc2626') +
      line('M50 88 Q46 92 43 90 M50 88 Q54 92 57 90', '#1c1917', 1.4);
    const coin = (x, y) => circle(x, y, 5, 'none', ' stroke="#fde047" stroke-width="1.2" opacity=".65"') + `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="none" stroke="#fde047" stroke-width="1" opacity=".65"/>`;
    return s + coin(22, 24) + coin(78, 24) + coin(22, 136) + coin(78, 136);
  }

  let installed = false;
  function install() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    let defs = '<defs>';
    TINT.forEach((t, m) => { defs += `<linearGradient id="hwbg${m}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="#fffdf7"/></linearGradient>`; });
    defs += '<linearGradient id="hwbgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#fffbeb"/></linearGradient>';
    defs += '<linearGradient id="hwback" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dc2626"/><stop offset="0.5" stop-color="#b91c1c"/><stop offset="1" stop-color="#7f1d1d"/></linearGradient>';
    let sym = '';
    for (let id = 0; id < 51; id++) sym += `<symbol id="hw-${id}" viewBox="0 0 100 160">${face(id)}</symbol>`;
    sym += `<symbol id="hw-back" viewBox="0 0 100 160">${back()}</symbol>`;
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${defs}</defs>${sym}</svg>`;
    document.body.appendChild(wrap);
  }
  const use = (id, cls) => `<svg class="${cls || ''}" viewBox="0 0 100 160" aria-hidden="true"><use href="#hw-${id < 0 ? 'back' : id}"/></svg>`;

  root.GostopArt = { install, use, MONTH_COLOR, TINT };
})(this);

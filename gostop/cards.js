/* 고스톱 패 그림 — 직접 그린 포근한 화투 (SVG, 외부 그림 없음)
   · 달마다 식물과 그 달의 광·열끗·띠·피를 알아보기 쉽게, 파스텔 색 + 둥근 모양
   · 왼쪽 위 모서리: 월 숫자(달 색 동그라미) + 종류 표(광 · 끗 · 띠 · 쌍) → 손패가 겹쳐도 보임
   · 숨은 <svg> 안 <symbol id="hw-번호"> 로 한 번만 만들고, 패마다 <use href="#hw-12"> 로 씀 (글꼴 Jua 그대로)
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
  function flower5(x, y, r, petal, center, rot = 0) {
    let s = '';
    for (let i = 0; i < 5; i++) { const a = (rot + i * 72 - 90) * Math.PI / 180; s += circle(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58, r * 0.5, petal); }
    return s + circle(x, y, r * 0.28, center);
  }
  // 이파리 하나 (끝이 뾰족한 잎): (x,y) 에서 각도 a 로 길이 len
  function leaf(x, y, len, w, a, fill) {
    const r = a * Math.PI / 180, ex = x + Math.cos(r) * len, ey = y + Math.sin(r) * len;
    const nx = -Math.sin(r) * w, ny = Math.cos(r) * w, mx = (x + ex) / 2, my = (y + ey) / 2;
    return path(`M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`, fill);
  }
  function maple(x, y, r, fill, rot = 0) {
    let d = '';
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = (rot + i * 36 - 90) * Math.PI / 180; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); }
    return path(d + 'Z', fill, ' stroke-linejoin="round"') + line(`M${f(x)} ${f(y)}L${f(x)} ${f(y + r * 1.1)}`, fill, 1.4);
  }

  // 달 색 (월 동그라미·배경)
  const MONTH_COLOR = ['#5aaf7d', '#ec6c79', '#f294bd', '#7b8494', '#5e9fe6', '#b67ad5', '#c4865b', '#7f7fd4', '#eeb236', '#ef7a46', '#a5b648', '#45b3ad'];
  const TINT = ['#e9f6ee', '#fdedef', '#fdeef5', '#eef0f3', '#ebf3fd', '#f5eefb', '#f8efe8', '#ececfb', '#fdf5e1', '#fdefe7', '#f4f6e3', '#e5f5f4'];
  const INK = '#5b4636';

  // ── 띠 ──
  const RIB_COL = { 1: ['#ef6a6a', '#d94f52', '홍단'], 2: ['#5b8fe0', '#3f6fc4', '청단'], 3: ['#f08f7a', '#d9705c', '초단'], 4: ['#ef6a6a', '#d94f52', ''] };
  function ribbon(kind, rot = 9, cx = 52, cy = 74) {
    const [c, d, label] = RIB_COL[kind];
    let s = path('M41 30 L63 30 L61 104 L52 96 L43 104 Z', c, ` stroke="${d}" stroke-width="1.6" stroke-linejoin="round"`);
    s += path('M41 30 L63 30 L62.6 37 L41.4 37 Z', d, ' opacity=".55"');
    if (kind === 4) s += line('M45 52 L58 50 M45 66 L58 64 M45 80 L57 78', '#fff', 1.6, ' opacity=".55"');   // 비띠: 무늬만
    if (label) { s += text(52, 55, label[0], 15, '#fff'); s += text(52, 74, label[1], 15, '#fff'); }
    return g(s, `rotate(${rot} ${cx} ${cy})`);
  }

  // ── 달마다 식물 (v: 0~3 어느 패인지, 피 두 장은 살짝 다르게) ──
  const P = [];
  // 1월 송학: 소나무
  P[0] = v => {
    const flip = v === 3;
    let s = path('M6 150 Q30 128 52 136 Q76 142 94 128 L94 154 L6 154 Z', '#cfe9d8');
    const tree = line('M50 152 Q46 128 54 110 Q60 96 52 84', '#a8775a', 6) +
      ell(36, 112, 20, 11, '#5aae7e') + ell(64, 104, 22, 12, '#4f9f72') + ell(50, 88, 18, 10, '#5aae7e') +
      ell(30, 128, 16, 8, '#4f9f72') + ell(70, 124, 16, 8, '#5aae7e') +
      line('M24 112 L48 112 M54 104 L78 104 M40 88 L60 88', '#3f8f64', 1.4, ' opacity=".5"');
    s += flip ? g(tree, 'translate(100 0) scale(-1 1)') : tree;
    return s;
  };
  // 2월 매조: 매화 가지
  P[1] = v => {
    let s = line('M8 150 Q30 120 46 100 Q60 82 86 62', '#9a6a50', 6) + line('M46 100 Q58 108 72 104', '#9a6a50', 4) + line('M60 84 Q56 66 64 50', '#9a6a50', 3.5);
    const fl = [[86, 62], [72, 104], [64, 50], [30, 124], [52, 92], [40, 140], [78, 82]];
    fl.forEach(([x, y], i) => { if (v === 3 && i === 5) return; s += flower5(x, y, 8.5, i % 2 ? '#f59aa6' : '#ef7b8c', '#ffd36e', i * 17); });
    return s;
  };
  // 3월 벚꽃: 벚꽃 송이
  P[2] = v => {
    let s = line('M94 26 Q70 40 60 64 Q52 84 30 96', '#a07258', 5) + line('M64 56 Q78 70 84 92', '#a07258', 3.5);
    const fl = [[60, 64], [30, 96], [84, 92], [74, 38], [44, 80], [88, 66], [20, 110]];
    fl.forEach(([x, y], i) => { if (v === 3 && i > 4) return; s += flower5(x, y, 10, i % 2 ? '#ffc4d8' : '#f7a3c3', '#fff3c4', i * 23); });
    return s;
  };
  // 4월 흑싸리: 늘어진 검은 잎 송이
  P[3] = v => {
    let s = line('M14 6 Q20 30 26 46 M50 6 Q48 26 54 40 M82 6 Q80 24 76 36', '#4f5464', 2.4);
    const drop = (x, y, n) => { let t = ''; for (let i = 0; i < n; i++) t += ell(x + (i % 2 ? 5 : -5), y + i * 9, 5.5, 3.6, i % 3 === 1 ? '#6a7082' : '#575d6e', i % 2 ? 30 : -30); return t + circle(x, y + n * 9, 2.6, '#e46d6d'); };
    s += v === 0 ? drop(26, 46, 4) + drop(54, 40, 3) + drop(76, 36, 4) : drop(26, 46, v === 3 ? 6 : 7) + drop(54, 40, 9) + drop(76, 36, v === 2 ? 6 : 8);
    return s;
  };
  // 5월 난초: 붓꽃과 긴 잎
  P[4] = v => {
    let s = '';
    for (const [x, a] of [[22, -100], [30, -78], [42, -96], [60, -84], [72, -104], [82, -80]]) s += leaf(x, 152, 70 + (x % 3) * 8, 3.4, a, '#6cbd88');
    const iris = (x, y) => leaf(x, y, 14, 6, -150, '#6f86e3') + leaf(x, y, 14, 6, -30, '#6f86e3') + leaf(x, y, 15, 6, 90, '#5466c9') + leaf(x, y, 12, 5, -90, '#8ea0f0') + circle(x, y + 2, 2.6, '#ffd36e');
    s += iris(30, 86) + iris(64, 70);
    if (v !== 3) s += iris(46, 110);
    return s;
  };
  // 6월 모란: 큰 꽃과 잎
  P[5] = v => {
    let s = leaf(20, 140, 30, 9, -60, '#6fae7e') + leaf(78, 142, 30, 9, -120, '#6fae7e') + leaf(50, 150, 26, 8, -90, '#5e9e6e');
    const peony = (x, y, r) => circle(x, y, r, '#d977b5') + circle(x - r * 0.4, y - r * 0.2, r * 0.6, '#ee9bd0') + circle(x + r * 0.4, y - r * 0.15, r * 0.58, '#e48ac4') + circle(x, y + r * 0.25, r * 0.55, '#f2aedb') + circle(x, y - r * 0.05, r * 0.25, '#ffd36e');
    s += peony(50, 112, 20);
    if (v !== 3) s += peony(24, 90, 11);
    s += peony(78, 92, 12);
    return s;
  };
  // 7월 홍싸리: 붉은 싸리 가지
  P[6] = v => {
    let s = '';
    const br = (d, x0, y0, x1, y1, n) => { let t = line(d, '#8b6a4f', 2.4); for (let i = 1; i <= n; i++) { const tt = i / (n + 1), x = x0 + (x1 - x0) * tt, y = y0 + (y1 - y0) * tt; t += leaf(x, y, 9, 3.4, -60 + (i % 2) * 120, '#7fb07a') + circle(x + 2.5, y - 4.5, 3.6, i % 2 ? '#d8687e' : '#e9879a') + circle(x - 3, y - 7, 2.4, '#f0a3b2'); } return t; };
    s += br('M10 150 Q30 90 70 40', 10, 150, 70, 40, 7) + br('M40 152 Q56 100 90 70', 40, 152, 90, 70, v === 3 ? 4 : 6) + (v !== 3 ? br('M70 152 Q76 120 92 104', 70, 152, 92, 104, 3) : '');
    return s;
  };
  // 8월 공산: 둥근 언덕과 억새
  P[7] = v => {
    let s = path('M6 154 L6 108 Q30 82 54 104 Q74 120 94 96 L94 154 Z', '#8f8fd8') + path('M6 154 L6 128 Q36 112 62 128 Q80 138 94 124 L94 154 Z', '#7676c4');
    for (const x of [16, 30, 46, 70, 84]) s += line(`M${x} 150 Q${x - 3} 136 ${x + 4} 124`, '#c9c9f1', 1.6) + line(`M${x + 4} 150 Q${x + 8} 140 ${x + 2} 130`, '#c9c9f1', 1.4);
    return s;
  };
  // 9월 국화
  P[8] = v => {
    let s = leaf(24, 150, 28, 8, -70, '#7fb56e') + leaf(74, 150, 28, 8, -110, '#7fb56e');
    const mum = (x, y, r) => { let t = ''; for (let i = 0; i < 12; i++) { const a = i * 30; t += leaf(x, y, r, r * 0.22, a, i % 2 ? '#f3b93b' : '#f7cd5c'); } return t + circle(x, y, r * 0.32, '#e58a2b'); };
    s += mum(52, 120, 17);
    if (v !== 3) s += mum(24, 96, 11);
    s += mum(78, 92, 12);
    return s;
  };
  // 10월 단풍
  P[9] = v => {
    let s = line('M90 10 Q70 34 58 60 Q48 82 22 100', '#9a6a50', 4) + line('M60 56 Q40 46 22 50', '#9a6a50', 3);
    const ms = [[22, 100, 12, '#ef7a46'], [58, 64, 13, '#e65f3c'], [22, 50, 10, '#f39a45'], [84, 18, 10, '#ef7a46'], [40, 120, 11, '#f6a64a'], [74, 44, 9, '#e65f3c']];
    ms.forEach(([x, y, r, c], i) => { if (v === 3 && i === 4) return; s += maple(x, y, r, c, i * 13); });
    return s;
  };
  // 11월 오동: 큰 둥근 잎
  P[10] = v => {
    let s = '';
    const lf = (x, y, r, c) => path(`M${x} ${y + r}C${x - r * 1.4} ${y + r * 0.2} ${x - r * 0.9} ${y - r} ${x} ${y - r * 0.5}C${x + r * 0.9} ${y - r} ${x + r * 1.4} ${y + r * 0.2} ${x} ${y + r}Z`, c) + line(`M${x} ${y + r}L${x} ${y - r * 0.4}`, '#6b8128', 1.2);
    s += lf(28, 132, 16, '#9fb547') + lf(70, 130, 18, '#8aa33c') + lf(50, 112, 15, '#a9bf55');
    s += line('M50 100 L50 70', '#7a6a8f', 2) + circle(50, 68, 4, '#b39ad8') + circle(45, 76, 3.5, '#a98bd0') + circle(55, 78, 3.5, '#b39ad8') + circle(50, 86, 3.2, '#a98bd0');
    return s;
  };
  // 12월 비: 버드나무 + 빗줄기
  P[11] = v => {
    let s = '';
    for (let i = 0; i < 14; i++) { const x = 10 + i * 6.4, y = 8 + (i % 3) * 6; s += line(`M${f(x)} ${y}L${f(x - 8)} ${y + 14}`, '#9fd3e8', 1.3, ' opacity=".8"'); }
    s += line('M8 8 Q40 20 70 10', '#6b8b6a', 2.6);
    for (const [x, len] of [[14, 70], [24, 96], [36, 80], [50, 104], [62, 74], [74, 92]]) {
      s += line(`M${x} 12 Q${x - 6} ${12 + len / 2} ${x + 2} ${12 + len}`, '#5fb7a9', 2);
      for (let k = 1; k < 5; k++) s += leaf(x - 2 + (k % 2) * 2, 12 + len * k / 5, 7, 2.2, 100 + (k % 2) * 30, '#7ccbbd');
    }
    return s;
  };

  // ── 광·열끗 그림 ──
  const SPECIAL = {
    // 1월 광: 해와 학
    0: () => circle(70, 36, 17, '#ff917c') + circle(70, 36, 12, '#ffa48f', ' opacity=".7"') +
      g(ell(40, 74, 18, 12, '#fff') + path('M24 72 Q16 80 22 88 Q30 84 32 78 Z', '#3d3a44') + line('M50 68 Q58 52 52 40', '#fff', 6) + circle(52, 38, 6.5, '#fff') +
        circle(53, 33, 3, '#ef5a5a') + path('M57 39 L66 41 L57 42 Z', '#f0a640') + circle(54, 37.5, 1.2, INK) + line('M36 86 L34 102 M44 86 L46 102', '#e8a05a', 1.6) +
        path('M28 70 Q40 60 52 70', 'none', ` stroke="#e6e1d8" stroke-width="1.5"`), ''),
    // 2월 열끗: 꾀꼬리
    4: () => g(ell(40, 64, 15, 11, '#b8cf52') + ell(35, 66, 9, 6, '#8fa83b', -15) + circle(52, 56, 8, '#c6da62') + circle(55, 54, 1.6, INK) + path('M59 56 L66 58 L59 60 Z', '#f0a640') +
      path('M26 64 L14 70 L26 70 Z', '#8fa83b') + ell(44, 70, 7, 4, '#f4f1c6')),
    // 3월 광: 벚꽃 장막
    8: () => {
      let s = path('M8 104 Q30 96 50 104 Q70 112 92 104 L92 140 Q70 132 50 140 Q30 148 8 140 Z', '#fbd2df') + path('M8 104 Q30 96 50 104 Q70 112 92 104 L92 112 Q70 120 50 112 Q30 104 8 112 Z', '#ef6f8d');
      for (const x of [20, 36, 52, 68, 84]) s += line(`M${x} ${x % 32 === 4 ? 112 : 110} L${x} 140`, '#f39bb4', 3);
      s += path('M8 140 Q30 148 50 140 Q70 132 92 140 L92 146 Q70 140 50 146 Q30 154 8 146 Z', '#ef6f8d');
      for (const x of [14, 50, 86]) s += line(`M${x} 146 L${x} 154`, '#f5b942', 2.2) + circle(x, 155, 2.2, '#f5b942');
      return s;
    },
    // 4월 열끗: 두견새 + 초승달
    12: () => path('M70 18 A12 12 0 1 0 82 36 A9 9 0 1 1 70 18 Z', '#ffe08a') +
      g(path('M30 80 Q46 56 62 74 Q48 74 30 80 Z', '#7d8db0') + path('M38 74 Q20 54 14 66 Q26 70 38 74 Z', '#9aa8c8') + path('M50 72 Q66 50 78 58 Q66 66 50 72 Z', '#9aa8c8') +
        circle(64, 70, 6, '#7d8db0') + circle(66, 69, 1.4, '#fff') + path('M69 71 L76 72 L69 74 Z', '#f0a640') + path('M30 80 L18 88 L28 82 Z', '#66749a'), 'translate(-7 34) scale(1.24)'),
    // 5월 열끗: 나무 다리
    16: () => {
      let s = path('M6 120 L40 104 L60 116 L94 100 L94 112 L60 128 L40 116 L6 132 Z', '#eab765') + path('M6 132 L40 116 L60 128 L94 112 L94 116 L60 132 L40 120 L6 136 Z', '#c9934a');
      for (const x of [14, 30, 48, 66, 84]) s += line(`M${x} ${x < 40 ? 128 - (x - 6) * 0.45 : x < 60 ? 116 + (x - 40) * 0.6 : 128 - (x - 60) * 0.47} l0 16`, '#b58040', 2.4);
      return s;
    },
    // 6월 열끗: 나비 두 마리
    20: () => {
      const bf = (x, y, s, c) => g(ell(-6, -4, 7, 9, c, -20) + ell(6, -4, 7, 9, c, 20) + ell(-5, 7, 5, 6, c, 20) + ell(5, 7, 5, 6, c, -20) + circle(-6, -5, 2, '#fff', ' opacity=".7"') + circle(6, -5, 2, '#fff', ' opacity=".7"') + ell(0, 1, 1.6, 9, INK) + line('M0 -8 L-4 -15 M0 -8 L4 -15', INK, 1), `translate(${x} ${y}) scale(${s})`);
      return bf(36, 46, 1.25, '#ffc94d') + bf(68, 62, 1, '#9ad1f0');
    },
    // 7월 열끗: 멧돼지
    24: () => g(ell(48, 70, 24, 15, '#a9785a') + ell(48, 76, 18, 7, '#c49272') + circle(70, 64, 10, '#a9785a') + ell(79, 67, 5, 4, '#f2a7a0') + circle(77, 66, 0.9, INK) + circle(81, 66, 0.9, INK) +
      circle(70, 60, 1.6, INK) + path('M62 56 L58 48 L66 54 Z', '#8c5f44') + line('M75 72 Q78 76 74 78', '#fff', 1.6) + line('M34 82 L32 92 M44 84 L44 94 M56 84 L57 94 M64 82 L66 92', '#7c5440', 3) + path('M24 66 Q18 62 20 56', 'none', ' stroke="#7c5440" stroke-width="2" stroke-linecap="round"')),
    // 8월 광: 보름달
    28: () => circle(50, 48, 26, '#fff7d6', ' opacity=".5"') + circle(50, 48, 21, '#fff3c4') + circle(44, 42, 3.4, '#f3e3a6') + circle(57, 54, 2.6, '#f3e3a6'),
    // 8월 열끗: 기러기 세 마리
    29: () => {
      const gs = (x, y, s) => g(path('M-14 0 Q-6 -8 0 0 Q6 -8 14 0 Q6 -3 0 4 Q-6 -3 -14 0 Z', '#8a7a6a') + circle(2, -1, 2.4, '#8a7a6a') + path('M4 -1 L8 0 L4 1 Z', '#f0a640'), `translate(${x} ${y}) scale(${s})`);
      return gs(34, 34, 1.3) + gs(62, 48, 1.15) + gs(42, 64, 1);
    },
    // 9월 열끗(국진): 술잔
    32: () => path('M30 64 L70 64 Q68 84 50 88 Q32 84 30 64 Z', '#e5675e') + ell(50, 64, 20, 5, '#f08a80') + ell(50, 64, 16, 3, '#ffd36e') + path('M44 88 L56 88 L58 96 L42 96 Z', '#d4524a') +
      flower5(50, 76, 7, '#ffd36e', '#e58a2b'),
    // 10월 열끗: 사슴
    36: () => g(ell(46, 82, 20, 12, '#c8905e') + circle(64, 64, 8, '#c8905e') + ell(70, 68, 4.5, 3.4, '#b07a4c') + circle(65, 62, 1.4, INK) + circle(73, 68, 1.1, INK) +
      line('M60 56 L56 44 M56 48 L50 44 M66 56 L70 44 M69 48 L75 44', '#9a6a44', 2) + line('M58 72 L62 76', '#c8905e', 6) +
      line('M34 92 L32 106 M42 93 L42 107 M52 93 L53 107 M60 91 L62 105', '#a5744a', 3) + circle(38, 80, 2, '#fff1dc') + circle(48, 76, 2, '#fff1dc') + circle(52, 86, 1.8, '#fff1dc') + path('M26 78 Q22 74 26 72', 'none', ' stroke="#a5744a" stroke-width="2.4" stroke-linecap="round"')),
    // 11월 광: 봉황
    40: () => g(path('M30 40 Q20 20 36 14 Q34 28 44 34 Z', '#f5b942') + path('M40 36 Q36 16 52 12 Q48 28 54 34 Z', '#ef6b6b') + path('M52 36 Q56 18 70 18 Q60 30 60 38 Z', '#5aaf7d') +
      circle(52, 50, 14, '#ef6b6b') + circle(48, 48, 3, '#fff') + circle(48.5, 48, 1.6, INK) + path('M62 50 L74 54 L62 57 Z', '#f5b942') +
      path('M40 60 Q24 72 18 92 Q34 80 44 66 Z', '#5e9fe6') + path('M50 64 Q44 82 48 100 Q56 82 56 64 Z', '#f5b942') + path('M58 60 Q74 72 80 90 Q66 80 56 66 Z', '#b67ad5')),
    // 12월 광: 우산 쓴 고양이와 개구리
    44: () => g(path('M24 52 Q50 22 76 52 Z', '#ffd25e') + path('M24 52 Q37 44 50 52 Q63 44 76 52', 'none', ' stroke="#e9b840" stroke-width="1.6"') + line('M50 32 L50 88', '#9a6a50', 2) + line('M50 88 Q50 94 45 93', '#9a6a50', 2) +
      ell(44, 98, 14, 16, '#fff1dc', 0, ' stroke="#d9b48f" stroke-width="1.6"') + circle(44, 76, 11, '#fff1dc', ' stroke="#d9b48f" stroke-width="1.6"') + path('M35 70 L35 62 L41 68 Z', '#fff1dc', ' stroke="#d9b48f" stroke-width="1.4" stroke-linejoin="round"') + path('M53 70 L53 62 L47 68 Z', '#fff1dc', ' stroke="#d9b48f" stroke-width="1.4" stroke-linejoin="round"') + ell(44, 79, 9, 6.5, '#fff1dc') + path('M37 68 L37 64 L40 67 Z', '#f6b3a8') + path('M51 68 L51 64 L48 67 Z', '#f6b3a8') +
      ell(40, 76, 1.5, 2, INK) + ell(48, 76, 1.5, 2, INK) + path('M43 80 L45 80 L44 81.4 Z', '#f08a8a') + ell(36, 94, 6, 9, '#f5b37a', 20) + ell(50, 104, 5, 6, '#f5b37a', -10) + circle(44, 70, 3.2, '#f5b37a') + line('M56 108 Q66 104 63 94', '#d9b48f', 5.5) + line('M56 108 Q66 104 63 94', '#fff1dc', 3.6) +
      ell(76, 132, 8, 6, '#7cc68a') + circle(72, 127, 3, '#7cc68a') + circle(80, 127, 3, '#7cc68a') + circle(72, 127, 1.2, INK) + circle(80, 127, 1.2, INK)),
    // 12월 열끗: 제비
    45: () => g(path('M24 70 Q40 56 56 64 Q72 50 84 40 Q76 62 60 72 Q48 80 34 76 Z', '#3f5a8a') + path('M34 76 Q20 90 12 92 Q22 82 28 74 Z', '#3f5a8a') + path('M34 76 Q24 96 22 104 Q30 90 36 78 Z', '#2f4670') +
      ell(46, 72, 9, 4.5, '#fff', -15) + circle(60, 64, 6, '#3f5a8a') + circle(62, 63, 1.3, '#fff') + path('M65 64 L71 65 L65 67 Z', '#f0a640') + ell(58, 68, 3, 2, '#ef6b6b')),
  };
  // 쌍피 표시 그림
  const SSANG = {
    41: () => path('M6 132 L94 132 L94 154 L6 154 Z', '#f6d66b') + line('M6 132 L94 132', '#e7b93d', 2),            // 11월 쌍피: 노란 띠
    47: () => g(path('M24 46 Q22 30 38 30 Q44 18 58 24 Q74 20 76 36 Q88 40 82 52 L22 52 Q14 50 24 46 Z', '#a9b6c9') +
      path('M54 54 L44 76 L54 76 L46 100 L66 70 L56 70 L64 54 Z', '#ffd25e', ' stroke="#f0b43a" stroke-width="1.4" stroke-linejoin="round"') +
      circle(28, 118, 13, '#ef6b6b') + circle(28, 118, 8, '#f6a07a') + circle(28, 118, 3, '#ffd36e')),
  };

  // ── 모서리 표 ──
  function corner(id, m, kind) {
    const G = root.Gostop;
    let s = circle(16, 16, 10.5, MONTH_COLOR[m], ' stroke="#fff" stroke-width="2"') + text(16, 16.6, String(m + 1), m >= 9 ? 11.5 : 13.5, '#fff');
    const tag = (bg, fg, label, size = 10) => circle(16, 38, 9, bg, ' stroke="#fff" stroke-width="1.8"') + text(16, 38.6, label, size, fg);
    if (kind === G.GW) s += tag('#f5b942', '#fff', '광');
    else if (kind === G.YE) s += id === G.KOOK ? tag('#f2a65a', '#fff', '국', 9.5) : tag('#7cc9b4', '#fff', '끗', 9.5);
    else if (kind === G.TI) { const r = G.RIB[id]; s += tag(r === 2 ? '#5b8fe0' : '#ef6a6a', '#fff', '띠', 9.5); }
    else if (G.PIV[id] === 2) s += tag('#b67ad5', '#fff', '쌍', 9.5);
    return s;
  }
  function frame(m) {
    return `<rect x="1.5" y="1.5" width="97" height="157" rx="11" fill="#fffaf3" stroke="#ead7c3" stroke-width="2"/>` +
      `<rect x="6" y="6" width="88" height="148" rx="8" fill="url(#hwbg${m})"/>`;
  }
  function face(id) {
    const G = root.Gostop;
    if (id >= 48) {   // 보너스 피
      const three = G.PIV[id] === 3;
      return `<rect x="1.5" y="1.5" width="97" height="157" rx="11" fill="#fffaf3" stroke="#ead7c3" stroke-width="2"/><rect x="6" y="6" width="88" height="148" rx="8" fill="url(#hwbgB)"/>` +
        path('M50 34 L58 54 L80 55 L63 69 L69 90 L50 78 L31 90 L37 69 L20 55 L42 54 Z', '#ffd25e', ' stroke="#f0b43a" stroke-width="2" stroke-linejoin="round"') +
        text(50, 112, '보너스', 15, '#c9822f') + text(50, 132, three ? '쓰리피' : '쌍피', 14, INK) +
        circle(76, 24, 12, three ? '#ef7a46' : '#b67ad5', ' stroke="#fff" stroke-width="2"') + text(76, 24.6, three ? '+3' : '+2', 11, '#fff');
    }
    const m = id >> 2, kind = G.KIND[id], k = id & 3;
    let s = frame(m) + P[m](k);
    if (SSANG[id]) s += SSANG[id]();
    if (SPECIAL[id]) s += SPECIAL[id]();
    if (kind === G.TI) s += ribbon(G.RIB[id], m % 2 ? -8 : 9);
    if (kind === G.GW) s += circle(80, 140, 9, '#fff', ' opacity=".0"');
    return s + corner(id, m, kind);
  }
  // 뒷면: 산호색 + 고양이 얼굴
  function back() {
    let s = `<rect x="1.5" y="1.5" width="97" height="157" rx="11" fill="url(#hwback)" stroke="#d9654f" stroke-width="2"/>` +
      `<rect x="8" y="8" width="84" height="144" rx="8" fill="none" stroke="#ffe1d3" stroke-width="2.2" stroke-dasharray="1 5" stroke-linecap="round"/>`;
    s += circle(50, 80, 23, '#fff3ea') + path('M31 70 L30 50 L44 61 Z', '#fff3ea') + path('M69 70 L70 50 L56 61 Z', '#fff3ea') +
      path('M34 64 L33.5 55 L40 60.5 Z', '#f8b8a6') + path('M66 64 L66.5 55 L60 60.5 Z', '#f8b8a6') +
      ell(42, 80, 2.6, 3.4, '#8a5a48') + ell(58, 80, 2.6, 3.4, '#8a5a48') + path('M48 86 L52 86 L50 88.5 Z', '#f08a8a') +
      line('M50 88.5 Q47 92 44 90 M50 88.5 Q53 92 56 90', '#8a5a48', 1.3) + line('M36 86 L24 84 M36 89 L25 91 M64 86 L76 84 M64 89 L75 91', '#e9a594', 1.2);
    const paw = (x, y) => circle(x, y, 3.4, '#ffd3c2') + circle(x - 3.6, y - 4, 1.5, '#ffd3c2') + circle(x, y - 5.2, 1.5, '#ffd3c2') + circle(x + 3.6, y - 4, 1.5, '#ffd3c2');
    return s + paw(22, 26) + paw(78, 136) + paw(78, 28) + paw(22, 134);
  }

  let installed = false;
  function install() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    let defs = '<defs>';
    TINT.forEach((t, m) => { defs += `<linearGradient id="hwbg${m}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="#fffdf8"/></linearGradient>`; });
    defs += '<linearGradient id="hwbgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c9"/><stop offset="1" stop-color="#fffdf6"/></linearGradient>';
    defs += '<linearGradient id="hwback" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9f86"/><stop offset="1" stop-color="#ec7560"/></linearGradient>';
    let sym = '';
    for (let id = 0; id < 51; id++) sym += `<symbol id="hw-${id}" viewBox="0 0 100 160">${face(id)}</symbol>`;
    sym += `<symbol id="hw-back" viewBox="0 0 100 160">${back()}</symbol>`;
    const wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${defs}</defs>${sym}</svg>`;
    document.body.appendChild(wrap);
  }
  // 패 하나 그림 (<svg><use>)
  const use = (id, cls) => `<svg class="${cls || ''}" viewBox="0 0 100 160" aria-hidden="true"><use href="#hw-${id < 0 ? 'back' : id}"/></svg>`;

  root.GostopArt = { install, use, MONTH_COLOR, TINT };
})(this);

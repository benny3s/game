/* 원카드 카드 그림 — 직접 그린 인라인 SVG (외부 그림·글꼴 없음)
   · OneCardArt.install() 한 번 → 무늬·뒷면·조커 그림을 숨은 <svg> 묶음(symbol)으로 넣고, 카드마다 <use> 로 가져다 씀
   · OneCardArt.face(c) → 카드 앞면 SVG 글, back() → 뒷면, pip(무늬, 색) → 무늬 하나 (단추·알림용)
   · 모서리(왼쪽 위)에 숫자·무늬를 크게 — 손패가 겹쳐도 왼쪽 띠만 보면 알 수 있게 */
(function (root) {
  'use strict';
  const RED = '#d3213a', BLACK = '#17202d';
  const RANK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_PATH = [
    // ♠
    '<path d="M50 5C40 22 8 38 8 61c0 15 12 25 25 25 7 0 12-3 14-7l-5 17h16l-5-17c2 4 7 7 14 7 13 0 25-10 25-25C92 38 60 22 50 5z"/>',
    // ♥
    '<path d="M50 92C42 80 6 60 6 34 6 18 18 8 31 8c9 0 16 6 19 14 3-8 10-14 19-14 13 0 25 10 25 26 0 26-36 46-44 58z"/>',
    // ♦
    '<path d="M50 4c10 18 24 34 38 46-14 12-28 28-38 46C40 78 26 62 12 50 26 38 40 22 50 4z"/>',
    // ♣
    '<circle cx="50" cy="29" r="19"/><circle cx="28" cy="58" r="19"/><circle cx="72" cy="58" r="19"/><circle cx="50" cy="52" r="11"/><path d="M47 56c0 20-5 32-12 40h30c-7-8-12-20-12-40z"/>',
  ];
  const red = su => su === 1 || su === 2;
  // 별 (조커)
  function star(cx, cy, R, r, n) {
    n = n || 5; const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, d = i % 2 ? r : R; pts.push((cx + d * Math.cos(a)).toFixed(1) + ',' + (cy + d * Math.sin(a)).toFixed(1)); }
    return pts.join(' ');
  }
  function install() {
    if (typeof document === 'undefined' || document.getElementById('oc-sprite')) return;
    const svg = `<svg id="oc-sprite" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>
      ${SUIT_PATH.map((p, i) => `<symbol id="oc-s${i}" viewBox="0 0 100 100">${p}</symbol>`).join('')}
      <linearGradient id="oc-gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset=".35" stop-color="#f59e0b"/><stop offset=".65" stop-color="#22c55e"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
      <linearGradient id="oc-gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
      <linearGradient id="oc-gback" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2649a8"/><stop offset="1" stop-color="#16285e"/></linearGradient>
      <pattern id="oc-lat" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="none"/><path d="M0 0H12M0 0V12" stroke="#f6c453" stroke-opacity=".38" stroke-width="1.6"/></pattern>
      <symbol id="oc-back" viewBox="0 0 100 150">
        <rect x="1" y="1" width="98" height="148" rx="9" fill="#f8f3e8"/>
        <rect x="6" y="6" width="88" height="138" rx="6" fill="url(#oc-gback)"/>
        <rect x="6" y="6" width="88" height="138" rx="6" fill="url(#oc-lat)"/>
        <rect x="11" y="11" width="78" height="128" rx="4" fill="none" stroke="#f6c453" stroke-width="1.6" stroke-opacity=".8"/>
        <circle cx="50" cy="75" r="21" fill="#16285e" stroke="#f6c453" stroke-width="2.4"/>
        <path d="M45 66l9-6v31" fill="none" stroke="#fde68a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M43 91h16" stroke="#fde68a" stroke-width="5" stroke-linecap="round"/>
      </symbol>
      <symbol id="oc-crown" viewBox="0 0 100 70"><path d="M8 62L14 18l20 22L50 6l16 34 20-22 6 44z"/><circle cx="14" cy="14" r="6"/><circle cx="50" cy="6" r="6"/><circle cx="86" cy="14" r="6"/><rect x="8" y="58" width="84" height="10" rx="3"/></symbol>
      <symbol id="oc-tiara" viewBox="0 0 100 70"><path d="M10 64Q50 4 90 64z"/><circle cx="50" cy="16" r="8"/><circle cx="26" cy="34" r="6"/><circle cx="74" cy="34" r="6"/><rect x="8" y="58" width="84" height="10" rx="4"/></symbol>
      <symbol id="oc-shield" viewBox="0 0 100 100"><path d="M50 6l38 12v28c0 26-18 42-38 50C30 88 12 72 12 46V18z"/></symbol>
      <symbol id="oc-hat" viewBox="0 0 100 80"><path d="M50 62C40 44 24 26 6 22c10 12 14 28 14 44zM50 62C46 40 50 18 50 6c0 12 4 34 0 56zM50 62C60 44 76 26 94 22c-10 12-14 28-14 44z"/><rect x="16" y="60" width="68" height="14" rx="6"/><circle cx="6" cy="20" r="6"/><circle cx="50" cy="6" r="6"/><circle cx="94" cy="20" r="6"/></symbol>
    </defs></svg>`;
    const d = document.createElement('div'); d.innerHTML = svg;
    document.body.insertBefore(d.firstChild, document.body.firstChild);
  }
  const use = (id, x, y, w, h, fill, extra) => `<use href="#${id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra || ''}/>`;
  // 숫자 카드 무늬 자리 (100×150, 아래 절반은 거꾸로)
  const COLS = [35, 50, 65];
  const PIPS = {
    2: [[1, 30], [1, 120]], 3: [[1, 30], [1, 75], [1, 120]],
    4: [[0, 30], [2, 30], [0, 120], [2, 120]], 5: [[0, 30], [2, 30], [1, 75], [0, 120], [2, 120]],
    6: [[0, 30], [2, 30], [0, 75], [2, 75], [0, 120], [2, 120]], 7: [[0, 30], [2, 30], [1, 52], [0, 75], [2, 75], [0, 120], [2, 120]],
    8: [[0, 30], [2, 30], [1, 52], [0, 75], [2, 75], [1, 98], [0, 120], [2, 120]],
    9: [[0, 30], [2, 30], [0, 60], [2, 60], [1, 75], [0, 90], [2, 90], [0, 120], [2, 120]],
    10: [[0, 30], [2, 30], [1, 45], [0, 60], [2, 60], [0, 90], [2, 90], [1, 105], [0, 120], [2, 120]],
  };
  const cache = {};
  const frame = '<rect x="1" y="1" width="98" height="148" rx="9" fill="#fffdf7" stroke="#cbc3b6" stroke-width="1.6"/>';
  function corner(label, su, col, sz) {
    const fs = label.length > 1 ? 18 : 21;
    return `<text x="13" y="24" font-size="${fs}" font-weight="900" text-anchor="middle" fill="${col}" letter-spacing="${label.length > 1 ? -1.5 : 0}">${label}</text>` + (su >= 0 ? use('oc-s' + su, 5, 29, sz || 16, sz || 16, col) : '');
  }
  function face(c) {
    const b = c % 54;
    if (cache[b]) return cache[b];
    let s = `<svg class="cd" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${frame}`;
    if (b >= 52) {
      const color = b === 53, fill = color ? 'url(#oc-gc)' : 'url(#oc-gb)', ink = color ? RED : BLACK;
      const lab = (y0) => 'JOKER'.split('').map((ch, i) => `<text x="13" y="${y0 + i * 11}" font-size="11" font-weight="900" text-anchor="middle" fill="${ink}">${ch}</text>`).join('');
      s += `<polygon points="${star(13, 15, 9, 4)}" fill="${fill}"/>` + lab(36);
      s += `<g transform="rotate(180 50 75)"><polygon points="${star(13, 15, 9, 4)}" fill="${fill}"/>${lab(36)}</g>`;
      s += use('oc-hat', 26, 34, 48, 38, fill);
      s += `<polygon points="${star(50, 96, 22, 9)}" fill="${fill}" stroke="${color ? '#fde68a' : '#cbd5e1'}" stroke-width="1.5"/>`;
      s += `<text x="50" y="132" font-size="12" font-weight="900" text-anchor="middle" fill="${ink}" letter-spacing="1">${color ? '컬러' : '흑백'}</text>`;
    } else {
      const su = (b / 13) | 0, r = b % 13, col = red(su) ? RED : BLACK, lab = RANK[r];
      const cn = corner(lab, su, col);
      s += cn + `<g transform="rotate(180 50 75)">${cn}</g>`;
      if (r === 0) {
        if (su === 0) s += `<circle cx="50" cy="75" r="31" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="3 3"/>`;
        s += use('oc-s' + su, su === 0 ? 27 : 30, su === 0 ? 52 : 55, su === 0 ? 46 : 40, su === 0 ? 46 : 40, col);
      } else if (r >= 10) {
        const tint = red(su) ? '#fde2e4' : '#e2e8f0', sym = r === 12 ? 'oc-crown' : r === 11 ? 'oc-tiara' : 'oc-shield';
        s += `<rect x="25" y="24" width="50" height="102" rx="7" fill="${tint}" stroke="${col}" stroke-width="1.6"/>`;
        s += r === 10 ? use(sym, 34, 30, 32, 32, '#f2b33d', ` stroke="${col}" stroke-width="3"`) : use(sym, 32, 31, 36, 25, '#f2b33d', ` stroke="${col}" stroke-width="3"`);
        s += `<text x="50" y="98" font-size="40" font-weight="900" text-anchor="middle" fill="${col}">${lab}</text>`;
        s += use('oc-s' + su, 42, 104, 16, 16, col);
      } else {
        for (const [ci, y] of PIPS[r + 1]) {
          const x = COLS[ci], z = 15;
          s += y > 75 ? `<g transform="rotate(180 ${x} ${y})">${use('oc-s' + su, x - z / 2, y - z / 2, z, z, col)}</g>` : use('oc-s' + su, x - z / 2, y - z / 2, z, z, col);
        }
      }
    }
    s += '</svg>';
    return (cache[b] = s);
  }
  function back() { return '<svg class="cd back" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><use href="#oc-back" width="100" height="150"/></svg>'; }
  function pip(su, col) { return `<svg class="pip" viewBox="0 0 100 100" aria-hidden="true">${use('oc-s' + su, 0, 0, 100, 100, col || (red(su) ? RED : BLACK))}</svg>`; }
  root.OneCardArt = { install, face, back, pip, RED, BLACK };
})(this);

/* 고스톱 · 섯다 정통 화투패 렌더링 (GostopArt)
   · 실제 한국 정통 화투(송학·매조·벚꽃·흑싸리·난초·모란·홍싸리·공산·국화·단풍·오동·비) 48장 원본 벡터(SVG) 사용
   · 화투 특유의 다홍색(#c81e1e) 뒷면·테두리와 검은 내선, 겹친 손패에서도 월(1~12)이 한눈에 보이는 미니 배지 지원
   · 출처/라이선스: Wikimedia Commons Category:SVG_Hwatu / itsent-lab/hwatu (Marcus Richert, Spenĉjo, Louie Mantia Jr. — CC BY-SA 4.0 / MIT)
   GostopArt.install() · GostopArt.use(id) · GostopArt.MONTH_COLOR */
(function (root) {
  'use strict';

  const scriptEl = typeof document !== 'undefined' ? document.currentScript : null;
  const SVG_BASE = scriptEl && scriptEl.src ? new URL('svg/', scriptEl.src).href : 'svg/';

  const f = n => Math.round(n * 10) / 10;
  const circle = (x, y, r, fill, o = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${o}/>`;
  const path = (d, fill, o = '') => `<path d="${d}" fill="${fill}"${o}/>`;
  const text = (x, y, s, size, fill, o = '') =>
    `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="central" font-family="'Pretendard Variable',Pretendard,sans-serif"${o}>${s}</text>`;

  // 월별 포인트 색상 (1월~12월)
  const MONTH_COLOR = [
    '#15803d', '#be123c', '#db2777', '#334155',
    '#1d4ed8', '#9333ea', '#c2410c', '#b91c1c',
    '#d97706', '#dc2626', '#4d7c0f', '#0f766e'
  ];
  const TINT = [
    '#f4fbf6', '#fff5f6', '#fff5fa', '#f6f7f9',
    '#f2f7ff', '#faf5ff', '#fff7f2', '#fff6f0',
    '#fffbeb', '#fff5f0', '#f7fee7', '#f0fdfa'
  ];

  // 손패가 겹쳤을 때 왼쪽 위 모서리에서 월(1~12)만 깔끔하게 식별하는 초소형 배지 (원화를 가리지 않음)
  function cornerBadge(m) {
    return `<rect x="3.5" y="3.5" width="19" height="16" rx="5" fill="rgba(17,24,39,0.82)" stroke="rgba(255,255,255,0.85)" stroke-width="1.2"/>` +
      text(13, 11.8, String(m + 1), m >= 9 ? 10 : 11, '#fde047', ' font-weight="900"');
  }

  function bonusFace(id) {
    const G = root.Gostop;
    const three = G && G.PIV && G.PIV[id] === 3;
    return `<rect x="1" y="1" width="98" height="158" rx="9" fill="#c81e1e" stroke="#7f1d1d" stroke-width="2"/>` +
      `<rect x="6" y="6.8" width="88" height="146.4" rx="6" fill="url(#hwbgB)" stroke="#000" stroke-width="1.4"/>` +
      circle(50, 58, 26, '#dc2626', ' stroke="#111827" stroke-width="1.8"') +
      circle(50, 58, 21, 'none', ' stroke="#fde047" stroke-width="1.2" stroke-dasharray="3 2"') +
      `<text x="50" y="59" font-size="26" font-weight="900" fill="#fef08a" text-anchor="middle" dominant-baseline="central" font-family="serif">${three ? '三' : '雙'}</text>` +
      `<rect x="18" y="98" width="64" height="24" rx="6" fill="#111827" stroke="#fde047" stroke-width="1.2"/>` +
      text(50, 110.5, three ? '보너스 3피' : '보너스 쌍피', 11.5, '#fde047', ' font-weight="800"') +
      text(50, 136, three ? '피 3장 계산' : '피 2장 계산', 10.5, '#7f1d1d', ' font-weight="800"');
  }

  function face(id) {
    if (id >= 48) return bonusFace(id);
    const m = id >> 2;
    const k = (id & 3) + 1;
    const fn = `m${String(m + 1).padStart(2, '0')}-${String(k).padStart(2, '0')}.svg`;
    return `<rect x="1" y="1" width="98" height="158" rx="9" fill="#c81e1e" stroke="#7f1d1d" stroke-width="2"/>` +
      `<image href="${SVG_BASE}${fn}" x="0" y="0" width="100" height="160" preserveAspectRatio="none"/>` +
      cornerBadge(m);
  }

  // 뒷면: 정통 다홍/진홍색 화투 뒷면 + 금장 테두리 + 전통 금장 인장 문양
  function back() {
    let s = `<rect x="1" y="1" width="98" height="158" rx="9" fill="url(#hwback)" stroke="#450a0a" stroke-width="2.2"/>` +
      `<rect x="8" y="8" width="84" height="144" rx="5" fill="none" stroke="#fde047" stroke-width="1.6" opacity=".7"/>` +
      `<rect x="12" y="12" width="76" height="136" rx="3" fill="none" stroke="#fca5a5" stroke-width="0.9" stroke-dasharray="3 3" opacity=".5"/>`;
    s += circle(50, 80, 23, '#7f1d1d', ' stroke="#fde047" stroke-width="2"') +
      circle(50, 80, 17.5, 'none', ' stroke="#fde047" stroke-width="1" opacity=".75"') +
      path('M50 61 L55 74 L69 74 L58 82 L62 95 L50 87 L38 95 L42 82 L31 74 L45 74 Z', 'none', ' stroke="#fde047" stroke-width="1.4" opacity=".45"') +
      circle(50, 80, 11, '#991b1b', ' stroke="#fde047" stroke-width="1.5"') +
      `<text x="50" y="80.5" font-size="14" font-weight="900" fill="#fef08a" text-anchor="middle" dominant-baseline="central" font-family="serif">花</text>`;
    const coin = (x, y) =>
      circle(x, y, 5, 'none', ' stroke="#fde047" stroke-width="1.2" opacity=".65"') +
      `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="none" stroke="#fde047" stroke-width="1" opacity=".65"/>`;
    return s + coin(22, 24) + coin(78, 24) + coin(22, 136) + coin(78, 136);
  }

  let installed = false;
  function install() {
    if (installed || typeof document === 'undefined') return;
    installed = true;
    let defs = '<defs>';
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

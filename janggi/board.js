/* 장기판 화면 (DOM + SVG) — 나뭇결 판 · 9×10 줄 · 궁성 X · 팔각 기물(한자) · 움직임 · 누르기(넓은 칸) · 둘 곳 점 · 마지막 수 · 장군 · 추천 화살표
   new JanggiBoard(el, { canPick(sq), targets(sq) → [{ to, cap }], onMove(from, to), onPick(sq), glyph(type, side) })
   자리 sq = 줄 × 9 + 칸 (줄 0 = 위 · 한 쪽). flip 이면 180° 돌려 보임 (한이 아래) */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SIZE = { 1: 'k', 2: 's', 3: 'm', 4: 'm', 5: 'm', 6: 'm', 7: 's' };
  class JanggiBoard {
    constructor(el, o) {
      this.el = el; this.o = o || {}; this.flip = false; this.coords = true;
      this.pcs = new Map(); this.sel = -1; this.tg = []; this.marks = {}; this.arrow = null; this.locked = false;
      el.classList.add('jb');
      el.innerHTML = '<div class="jb-wood"></div><svg class="jb-lines" viewBox="0 0 90 100" preserveAspectRatio="none" aria-hidden="true"></svg><div class="jb-pcs"></div><div class="jb-mk"></div>' +
        '<svg class="jb-arw" viewBox="0 0 90 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="jbHead" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 Z" fill="var(--arrow)"/></marker><marker id="jbHead2" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 Z" fill="var(--arrow2,#d97706)"/></marker></defs><g></g></svg><div class="jb-fx" aria-live="polite"></div>';
      this.lines = el.children[1]; this.pcLayer = el.children[2]; this.mkLayer = el.children[3]; this.arw = el.children[4]; this.fx = el.children[5];
      this.drawLines();
      el.addEventListener('pointerdown', e => this.tap(e));
      el.addEventListener('contextmenu', e => e.preventDefault());
    }
    disp(sq) { const r = (sq / 9) | 0, f = sq % 9; return this.flip ? [8 - f, 9 - r] : [f, r]; }
    sqAt(x, y) { if (x < 0 || x > 8 || y < 0 || y > 9) return -1; const f = this.flip ? 8 - x : x, r = this.flip ? 9 - y : y; return r * 9 + f; }
    drawLines() {
      const P = (x, y) => `${x * 10 + 5},${y * 10 + 5}`;
      let d = '';
      for (let x = 0; x < 9; x++) d += `M${P(x, 0)}L${P(x, 9)}`;
      for (let y = 0; y < 10; y++) d += `M${P(0, y)}L${P(8, y)}`;
      d += `M${P(3, 0)}L${P(5, 2)}M${P(5, 0)}L${P(3, 2)}M${P(3, 7)}L${P(5, 9)}M${P(5, 7)}L${P(3, 9)}`;
      // 포 · 졸 자리 표시 (작은 꺾쇠)
      let mk = '';
      const spots = [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]];
      for (const [x, y] of spots) {
        const cx = x * 10 + 5, cy = y * 10 + 5, g = 1.3, l = 2.6;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          if ((x === 0 && sx < 0) || (x === 8 && sx > 0)) continue;
          mk += `M${cx + sx * g},${cy + sy * (g + l)}L${cx + sx * g},${cy + sy * g}L${cx + sx * (g + l)},${cy + sy * g}`;
        }
      }
      let lab = '';
      if (this.coords) {
        // 기물 팔각의 잘린 모서리에 들어가게: 칸 번호는 아래 오른쪽 귀, 줄 번호는 위 왼쪽 귀
        for (let x = 0; x < 9; x++) { const f = this.flip ? 8 - x : x; lab += `<text x="${x * 10 + 8.7}" y="99.4" class="jb-c">${f + 1}</text>`; }
        for (let y = 0; y < 10; y++) { const r = this.flip ? 9 - y : y; lab += `<text x="1.3" y="${y * 10 + 2.5}" class="jb-c">${(r + 1) % 10}</text>`; }
      }
      this.lines.innerHTML = `<rect x="5" y="5" width="80" height="90" class="jb-frame"/><path d="${d}" class="jb-grid"/><path d="${mk}" class="jb-spot"/>${lab}`;
    }
    setFlip(v) { if (this.flip === !!v) return; this.flip = !!v; this.drawLines(); for (const [sq, p] of this.pcs) this.place(p, sq); this.drawMarks(); this.drawArrow(); }
    setCoords(v) { this.coords = !!v; this.drawLines(); }
    place(p, sq) { const [x, y] = this.disp(sq); p.style.transform = `translate(${x * 100}%,${y * 100}%)`; }
    mk(x) {
      const p = document.createElement('div');
      p.className = `pc ${x.side ? 'han' : 'cho'} ${SIZE[x.type]}`;
      p.dataset.code = String(x.side * 8 + x.type);
      p.innerHTML = `<i class="o"><i class="i"><b>${this.o.glyph ? this.o.glyph(x.type, x.side) : '?'}</b></i></i>`;
      this.place(p, x.sq); this.pcLayer.appendChild(p);
      return p;
    }
    // 판 맞추기: arr = 90칸 [{ sq, type, side, tent } | null], mv = 방금 둔 수 { from, to } (움직임 보여 주기)
    set(arr, mv) {
      if (mv && mv.from != null && mv.to != null) {
        const p = this.pcs.get(mv.from);
        if (p && arr[mv.to] && p.dataset.code === String(arr[mv.to].side * 8 + arr[mv.to].type)) {
          const cap = this.pcs.get(mv.to);
          if (cap && cap !== p) { cap.classList.add('gone'); this.pcs.delete(mv.to); setTimeout(() => cap.remove(), 260); }
          this.pcs.delete(mv.from); this.pcs.set(mv.to, p); this.place(p, mv.to);
          p.classList.remove('land'); void p.offsetWidth; p.classList.add('land');
        }
      }
      for (let sq = 0; sq < 90; sq++) {
        const want = arr[sq], have = this.pcs.get(sq);
        if (have && (!want || have.dataset.code !== String(want.side * 8 + want.type))) { have.remove(); this.pcs.delete(sq); }
        if (want && !this.pcs.get(sq)) { const p = this.mk(want); if (mv) p.classList.add('popin'); this.pcs.set(sq, p); }
        const p = this.pcs.get(sq);
        if (p) p.classList.toggle('tent', !!(want && want.tent));
      }
      this.drawMarks();
    }
    restyle() { for (const [, p] of this.pcs) { const c = +p.dataset.code, b = p.querySelector('b'); if (b && this.o.glyph) b.textContent = this.o.glyph(c & 7, c >> 3); } }
    // 표시: { last: [from, to], check: sq, hint: [from, to] }
    setMarks(m) { this.marks = m || {}; this.drawMarks(); }
    drawMarks() {
      const m = this.marks || {}, html = [];
      const at = (sq, cls) => { const [x, y] = this.disp(sq); html.push(`<i class="${cls}" style="left:${(x + 0.5) * 100 / 9}%;top:${(y + 0.5) * 10}%"></i>`); };
      if (m.last && m.last[0] != null) at(m.last[0], 'lf');
      if (m.hint) { at(m.hint[0], 'hf'); at(m.hint[1], 'ht'); }
      if (this.sel >= 0) for (const t of this.tg) at(t.to, t.cap ? 'tc' : 'td');
      this.mkLayer.innerHTML = html.join('');
      for (const [sq, p] of this.pcs) {
        p.classList.toggle('last', !!(m.last && m.last[1] === sq));
        p.classList.toggle('chk', m.check === sq);
        p.classList.toggle('sel', this.sel === sq);
      }
    }
    // 화살표: a = 추천 수 [from, to] (초록) · real = 복기에서 실제로 둔 수 [from, to] (주황 점선, 없어도 됨)
    setArrow(a, real) { this.arrow = a; this.real = real || null; this.drawArrow(); }
    drawArrow() {
      const g = this.arw.querySelector('g'); g.innerHTML = '';
      const line = (a, cls, head) => {
        const [x1, y1] = this.disp(a[0]), [x2, y2] = this.disp(a[1]);
        const ax = x1 * 10 + 5, ay = y1 * 10 + 5, bx = x2 * 10 + 5, by = y2 * 10 + 5, len = Math.hypot(bx - ax, by - ay) || 1, k = (len - 4.2) / len;
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', ax); l.setAttribute('y1', ay); l.setAttribute('x2', ax + (bx - ax) * k); l.setAttribute('y2', ay + (by - ay) * k);
        l.setAttribute('class', cls); l.setAttribute('marker-end', `url(#${head})`);
        g.appendChild(l);
      };
      if (this.real) line(this.real, 'jb-a real', 'jbHead2');
      if (this.arrow) line(this.arrow, 'jb-a', 'jbHead');
    }
    clearSel() { this.sel = -1; this.tg = []; this.drawMarks(); }
    select(sq) { this.sel = sq; this.tg = this.o.targets ? this.o.targets(sq) : []; this.drawMarks(); }
    tap(e) {
      if (e.button != null && e.button > 0) return;
      const r = this.el.getBoundingClientRect(); if (!r.width) return;
      const x = Math.floor((e.clientX - r.left) / (r.width / 9)), y = Math.floor((e.clientY - r.top) / (r.height / 10));
      const sq = this.sqAt(x, y); if (sq < 0) return;
      e.preventDefault();
      if (this.sel >= 0 && this.tg.some(t => t.to === sq)) { const f = this.sel; this.clearSel(); if (this.o.onMove) this.o.onMove(f, sq); return; }
      if (this.sel === sq) { this.clearSel(); return; }
      if (this.o.canPick && this.o.canPick(sq)) { this.select(sq); if (this.o.onPick) this.o.onPick(sq); return; }
      if (this.o.onTap) this.o.onTap(sq);
      this.clearSel();
    }
    // 판 가운데 큰 글씨 ('장군!' · '멍군!' · '빅장!')
    banner(text, cls) {
      const d = document.createElement('div'); d.className = 'jb-bn ' + (cls || ''); d.textContent = text;
      this.fx.appendChild(d); setTimeout(() => d.remove(), 1300);
    }
  }
  window.JanggiBoard = JanggiBoard;
})();

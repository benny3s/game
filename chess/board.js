/* 체스판 화면 (DOM) — 칸 64개 · 기물(그림 SVG) · 움직임 · 끌어 두기/두 번 눌러 두기 · 둘 수 있는 자리 점 · 마지막 수 · 체크 · 추천 화살표 · 승진 고르기
   new ChessBoardView(el, { canMove(sq), legalFrom(sq) → [{ to, cap }], onMove(from, to), pieceUrl(code) })
   좌표는 'e4' 같은 이름. 위치는 percent 로 놓아서 판 크기가 바뀌어도 그대로 */
(() => {
  'use strict';
  const FILES = 'abcdefgh';
  const sqXY = sq => [sq.charCodeAt(0) - 97, sq.charCodeAt(1) - 49];      // [file, rank] 0..7
  const nameOf = (f, r) => FILES[f] + (r + 1);

  class ChessBoardView {
    constructor(el, o) {
      this.el = el; this.o = o || {}; this.flip = false;
      this.pcs = new Map();          // 칸 → 기물 요소
      this.sel = null; this.targets = []; this.drag = null; this.coords = true;
      el.classList.add('cb');
      el.innerHTML = '<div class="cb-sqs"></div><div class="cb-pcs"></div><svg class="cb-arw" viewBox="0 0 8 8" aria-hidden="true"><defs><marker id="cbHead" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 Z" fill="var(--arrow)"/></marker><marker id="cbHead2" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 Z" fill="var(--arrow2,#60a5fa)"/></marker><marker id="cbHead3" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 Z" fill="var(--arrow3,#fb923c)"/></marker></defs><g></g></svg><div class="cb-promo" hidden></div>';
      this.sqLayer = el.children[0]; this.pcLayer = el.children[1]; this.arw = el.children[2]; this.promo = el.children[3];
      this.sqEls = {};
      this.drawSquares();
      el.addEventListener('pointerdown', e => this.down(e));
      el.addEventListener('pointermove', e => this.move(e));
      el.addEventListener('pointerup', e => this.up(e));
      el.addEventListener('pointercancel', e => this.cancelDrag(e));
      el.addEventListener('contextmenu', e => e.preventDefault());
    }
    // 화면 위치 (0..7, 위에서부터)
    disp(sq) { const [f, r] = sqXY(sq); return this.flip ? [7 - f, r] : [f, 7 - r]; }
    drawSquares() {
      this.sqLayer.innerHTML = ''; this.sqEls = {};
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const f = this.flip ? 7 - x : x, r = this.flip ? y : 7 - y, sq = nameOf(f, r);
        const d = document.createElement('div');
        d.className = 'sq ' + ((f + r) % 2 ? 'l' : 'd');
        d.dataset.sq = sq;
        let lab = '';
        if (x === 0) lab += `<i class="rk">${r + 1}</i>`;
        if (y === 7) lab += `<i class="fl">${FILES[f]}</i>`;
        d.innerHTML = lab;
        this.sqLayer.appendChild(d); this.sqEls[sq] = d;
      }
      this.el.classList.toggle('nocoord', !this.coords);
    }
    setFlip(v) {
      if (this.flip === !!v) return;
      this.flip = !!v;
      const keep = this.marks || {};
      this.drawSquares();
      for (const [sq, p] of this.pcs) this.place(p, sq);
      this.setMarks(keep); this.redrawTargets(); this.drawArrow();
    }
    setCoords(v) { this.coords = !!v; this.el.classList.toggle('nocoord', !this.coords); }
    place(p, sq) { const [x, y] = this.disp(sq); p.style.transform = `translate(${x * 100}%,${y * 100}%)`; }
    mk(code, sq) {
      const p = document.createElement('div');
      p.className = 'pc'; p.dataset.code = code;
      p.style.backgroundImage = `url("${this.o.pieceUrl ? this.o.pieceUrl(code) : code + '.svg'}")`;
      this.place(p, sq); this.pcLayer.appendChild(p);
      return p;
    }
    // 판 전체 맞추기 (board: [{ sq, type, color } | null] 64칸). mv 를 주면 그 수를 움직임으로 보여 줌
    set(board, mv) {
      if (mv && mv.from) this.animate(mv);
      const want = new Map();
      for (const x of board) if (x) want.set(x.sq, x.color + x.type.toUpperCase());
      for (const [sq, p] of [...this.pcs]) { if (want.get(sq) !== p.dataset.code) { p.remove(); this.pcs.delete(sq); } else this.place(p, sq); }
      for (const [sq, code] of want) if (!this.pcs.has(sq)) { const p = this.mk(code, sq); this.pcs.set(sq, p); if (mv && mv.promotion && sq === mv.to) p.classList.add('popin'); }
    }
    animate(mv) {
      const take = sq => { const p = this.pcs.get(sq); if (p) { this.pcs.delete(sq); p.classList.add('gone'); setTimeout(() => p.remove(), 220); } };
      const mov = (a, b) => { const p = this.pcs.get(a); if (!p) return; this.pcs.delete(a); if (this.pcs.get(b)) take(b); this.pcs.set(b, p); this.place(p, b); };
      if (mv.ep && mv.epSq) take(mv.epSq);
      mov(mv.from, mv.to);
      if (mv.rook) mov(mv.rook[0], mv.rook[1]);
    }
    // 표시: { last: [a, b], check: 'e1', hint: [a, b] }
    setMarks(m) {
      this.marks = m || {};
      for (const sq in this.sqEls) this.sqEls[sq].classList.remove('last', 'check', 'hint');
      const add = (sq, c) => { if (sq && this.sqEls[sq]) this.sqEls[sq].classList.add(c); };
      if (this.marks.last) this.marks.last.forEach(s => add(s, 'last'));
      if (this.marks.check) add(this.marks.check, 'check');
      if (this.marks.hint) this.marks.hint.forEach(s => add(s, 'hint'));
    }
    // 화살표: a = 추천(초록), a2 = 복기에서 실제로 둔 수(파랑, 점선), a3 = 그 수가 다음에 노리는 수(주황, 가는 점선) — 모두 [from, to] 또는 null
    setArrow(a, a2, a3) { this.arrow = a || null; this.arrow2 = a2 || null; this.arrow3 = a3 || null; this.drawArrow(); }
    drawArrow() {
      const g = this.arw.querySelector('g'); g.innerHTML = '';
      const line = (a, col, head, dash, w = 0.2) => {
        const [x0, y0] = this.disp(a[0]), [x1, y1] = this.disp(a[1]);
        const ax = x0 + 0.5, ay = y0 + 0.5, bx = x1 + 0.5, by = y1 + 0.5, L = Math.hypot(bx - ax, by - ay) || 1;
        const ex = bx - (bx - ax) / L * 0.38, ey = by - (by - ay) / L * 0.38;
        return `<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''} marker-end="url(#${head})"/>`;
      };
      let h = '';
      if (this.arrow3) h += line(this.arrow3, 'var(--arrow3,#fb923c)', 'cbHead3', '.16 .14', 0.12);
      if (this.arrow2) h += line(this.arrow2, 'var(--arrow2,#60a5fa)', 'cbHead2', '.32 .2');
      if (this.arrow) h += line(this.arrow, 'var(--arrow)', 'cbHead', '');
      g.innerHTML = h;
    }
    // ── 고르기 · 둘 자리 점 ──
    select(sq) {
      this.sel = sq;
      this.targets = sq && this.o.legalFrom ? this.o.legalFrom(sq) : [];
      this.redrawTargets();
    }
    redrawTargets() {
      for (const sq in this.sqEls) this.sqEls[sq].classList.remove('sel', 'mv', 'cap', 'over');
      if (!this.sel) return;
      if (this.sqEls[this.sel]) this.sqEls[this.sel].classList.add('sel');
      for (const t of this.targets) if (this.sqEls[t.to]) this.sqEls[t.to].classList.add(t.cap ? 'cap' : 'mv');
    }
    clearSel() { this.select(null); }
    sqAt(e) {
      const r = this.el.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * 8), y = Math.floor((e.clientY - r.top) / r.height * 8);
      if (x < 0 || x > 7 || y < 0 || y > 7) return null;
      return this.flip ? nameOf(7 - x, y) : nameOf(x, 7 - y);
    }
    isTarget(sq) { return this.targets.some(t => t.to === sq); }
    down(e) {
      if (e.button > 0 || !this.promo.hidden) return;
      const sq = this.sqAt(e); if (!sq) return;
      e.preventDefault();
      if (this.sel && sq !== this.sel && this.isTarget(sq)) { const f = this.sel; this.clearSel(); this.o.onMove && this.o.onMove(f, sq, false); return; }
      if (this.o.canMove && this.o.canMove(sq)) {
        const was = this.sel === sq;
        this.select(sq);
        const p = this.pcs.get(sq);
        if (p) {
          const r = this.el.getBoundingClientRect();
          this.drag = { sq, p, id: e.pointerId, sx: e.clientX, sy: e.clientY, r, moved: false, was };
          try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
        }
        if (this.o.onPick) this.o.onPick(sq);
      } else if (this.sel) this.clearSel();
      else if (this.o.onTapEmpty) this.o.onTapEmpty(sq);
    }
    move(e) {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
      d.moved = true;
      const w = d.r.width / 8, x = e.clientX - d.r.left - w / 2, y = e.clientY - d.r.top - w / 2;
      d.p.classList.add('drag');
      d.p.style.transform = `translate(${x}px,${y}px) scale(1.12)`;
      const over = this.sqAt(e);
      for (const sq in this.sqEls) this.sqEls[sq].classList.toggle('over', sq === over && this.isTarget(sq));
    }
    up(e) {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      try { this.el.releasePointerCapture(e.pointerId); } catch (_) {}
      d.p.classList.remove('drag');
      if (!d.moved) { this.place(d.p, d.sq); if (d.was) this.clearSel(); return; }
      const to = this.sqAt(e);
      if (to && to !== d.sq && this.isTarget(to)) {
        d.p.classList.add('snap'); this.place(d.p, to);                 // 끌어 놓은 자리에 바로 (움직임 없이)
        setTimeout(() => d.p.classList.remove('snap'), 30);
        this.clearSel(); this.o.onMove && this.o.onMove(d.sq, to, true);
      } else { this.place(d.p, d.sq); for (const sq in this.sqEls) this.sqEls[sq].classList.remove('over'); }
    }
    cancelDrag() { const d = this.drag; if (!d) return; this.drag = null; d.p.classList.remove('drag'); this.place(d.p, d.sq); }
    // 승진 고르기 → Promise<'q'|'r'|'b'|'n'|null>
    pickPromotion(to, color) {
      return new Promise(res => {
        const [x, y] = this.disp(to), down = y === 0;
        const order = ['q', 'n', 'r', 'b'];
        this.promo.innerHTML = '<div class="cb-shade"></div>' + order.map((t, i) => {
          const yy = down ? i : 7 - i;
          return `<button class="cb-pp" data-t="${t}" style="left:${x * 12.5}%;top:${yy * 12.5}%;background-image:url('${this.o.pieceUrl(color + t.toUpperCase())}')" aria-label="${{ q: '퀸', n: '나이트', r: '룩', b: '비숍' }[t]}"></button>`;
        }).join('');
        this.promo.hidden = false;
        let armed = false;                                               // 판을 누른 그 손가락이 떼어질 때 바로 골라지지 않게
        const done = v => { this.promo.hidden = true; this.promo.innerHTML = ''; this.promo.onpointerup = this.promo.onpointerdown = null; res(v); };
        this.promo.onpointerup = ev => { if (ev.stopPropagation) ev.stopPropagation(); if (!armed && !ev.force) return; const b = ev.target.closest('.cb-pp'); done(b ? b.dataset.t : null); };
        this.promo.onpointerdown = ev => { ev.stopPropagation(); armed = true; };
      });
    }
    closePromo() { if (!this.promo.hidden && this.promo.onpointerup) this.promo.onpointerup({ target: this.promo, force: true }); }
  }
  window.ChessBoardView = ChessBoardView;
})();

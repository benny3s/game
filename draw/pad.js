/* 베니스트레이션 — 그림판(손가락·마우스로 그리기) · 그림 그려 보여 주기 · 공책을 이미지로 저장
   · 논리 크기 600×450 고정 (화면 크기에 CSS 로 늘이고 줄임). 점은 부드럽게(0.6 보간 + 중점 곡선) 모으고, 보낼 때만 core.js 가 줄여서 정수 배열로
   · DrawPad.render(canvas, enc, opt) = 어느 기기에서나 정수 배열 → 그림 / new DrawPad.Pad(canvas, opt) = 그리는 판 */
(() => {
  'use strict';
  const D = window.DrawCore;
  const { W, H, PAPER, COLORS } = D;
  const K = 2;                                                       // 그림판 안쪽 해상도 배율
  const FONT = '"Pretendard Variable","Pretendard",-apple-system,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';

  // 획 하나 그리기. pts: [[x,y]…] 논리 좌표, k = 크기 배율
  function stroke(ctx, pts, color, width, k) {
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width * k; ctx.lineCap = ctx.lineJoin = 'round';
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0] * k, pts[0][1] * k, width * k / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(pts[0][0] * k, pts[0][1] * k);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0] * k, pts[i][1] * k, (pts[i][0] + pts[i + 1][0]) / 2 * k, (pts[i][1] + pts[i + 1][1]) / 2 * k);
    const l = pts[pts.length - 1]; ctx.lineTo(l[0] * k, l[1] * k); ctx.stroke();
  }
  const colorOf = (c) => (c === D.ERASER ? PAPER : COLORS[c].hex);

  // 정수 배열(enc) → canvas. opt.w = 그릴 가로(px, 기본 600) · opt.blank = 빈 종이면 쓸 글
  function render(canvas, enc, opt) {
    opt = opt || {};
    const w = opt.w || W, k = w / W;
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round(H * k); }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const st of D.decode(enc)) stroke(ctx, st.pts, colorOf(st.c), st.w, k);
    if (D.isBlank(enc) && opt.blank !== false) {
      ctx.fillStyle = 'rgba(80,60,40,.45)'; ctx.font = `700 ${Math.round(28 * k)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(D.EMPTY_DRAW, canvas.width / 2, canvas.height / 2);
    }
    return canvas;
  }

  class Pad {
    constructor(canvas, o) {
      o = o || {};
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      canvas.width = W * K; canvas.height = H * K;                                 // 속은 2배로 (폰 화면 선명하게), 그리는 좌표는 늘 논리 600×450
      this.ctx.setTransform(K, 0, 0, K, 0, 0);
      this.strokes = []; this.cur = null; this.pid = null; this.sm = null;
      this.color = 0; this.size = 1; this.eraser = false; this.locked = false;
      this.onChange = o.onChange || null; this.onLimit = o.onLimit || null;
      this.redraw();
      const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / (r.width || W), (e.clientY - r.top) * H / (r.height || H)]; };
      const down = e => {
        if (this.locked || this.cur || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        this.pid = e.pointerId; this.begin(pos(e));
      };
      const move = e => {
        if (!this.cur || e.pointerId !== this.pid) return;
        e.preventDefault();
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const ev of evs.length ? evs : [e]) this.move(pos(ev));
      };
      const up = e => { if (!this.cur || e.pointerId !== this.pid) return; this.end(); };
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('lostpointercapture', up);
      canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    get c() { return this.eraser ? D.ERASER : this.color; }
    get width() { return (this.eraser ? D.ERASER_SIZES : D.SIZES)[this.size]; }
    begin(p) {
      if (this.strokes.length >= D.MAX_STROKES) { if (this.onLimit) this.onLimit(); return; }
      this.cur = { c: this.c, s: this.size, p: [p] }; this.sm = p; this.strokes.push(this.cur);
      stroke(this.ctx, [p], colorOf(this.cur.c), this.width, 1);                       // 점 하나 (콕 찍기)
    }
    move(raw) {
      const c = this.cur, pts = c.p, l = pts[pts.length - 1];
      if (pts.length > 1500) return;
      const q = [this.sm[0] + (raw[0] - this.sm[0]) * 0.6, this.sm[1] + (raw[1] - this.sm[1]) * 0.6]; this.sm = q;
      if (Math.hypot(q[0] - l[0], q[1] - l[1]) < 1.5) return;
      pts.push(q);
      const n = pts.length, ctx = this.ctx, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      ctx.strokeStyle = colorOf(c.c); ctx.lineWidth = this.cur.c === D.ERASER ? D.ERASER_SIZES[c.s] : D.SIZES[c.s]; ctx.lineCap = ctx.lineJoin = 'round';
      ctx.beginPath();
      if (n === 2) { const m = mid(pts[0], pts[1]); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(m[0], m[1]); }
      else { const a = mid(pts[n - 3], pts[n - 2]), b = mid(pts[n - 2], pts[n - 1]); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(pts[n - 2][0], pts[n - 2][1], b[0], b[1]); }
      ctx.stroke();
    }
    end() {
      const c = this.cur; this.cur = null; this.pid = null; if (!c) return;
      const pts = c.p;
      if (pts.length > 1) {                                                           // 마지막 중점 → 끝점
        const n = pts.length, a = [(pts[n - 2][0] + pts[n - 1][0]) / 2, (pts[n - 2][1] + pts[n - 1][1]) / 2], ctx = this.ctx;
        ctx.strokeStyle = colorOf(c.c); ctx.lineWidth = c.c === D.ERASER ? D.ERASER_SIZES[c.s] : D.SIZES[c.s]; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(pts[n - 1][0], pts[n - 1][1]); ctx.stroke();
      }
      if (this.onChange) this.onChange();
    }
    redraw() {
      const ctx = this.ctx; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
      for (const s of this.strokes) stroke(ctx, s.p, colorOf(s.c), (s.c === D.ERASER ? D.ERASER_SIZES : D.SIZES)[s.s], 1);
    }
    undo() { if (this.cur || !this.strokes.length) return false; this.strokes.pop(); this.redraw(); if (this.onChange) this.onChange(); return true; }
    clear() { if (this.cur) return; this.strokes = []; this.redraw(); if (this.onChange) this.onChange(); }
    get blank() { return !this.strokes.length || this.strokes.every(s => s.c === D.ERASER); }
    toEnc() { return this.blank ? [] : D.fit(this.strokes); }
    lock() { this.locked = true; if (this.cur) this.end(); }
  }

  // ── 공책을 한 장의 이미지로 (PNG) ───────────────────────────
  function wrapLines(ctx, text, maxW) {
    const lines = []; let line = '';
    for (const ch of Array.from(text)) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  // book: 쪽 배열 [{ k:'t'|'d', by, t | s }] · names: 이름 · title: 위 제목
  function notebookImage(book, names, title) {
    const pad = 28, cw = 600, gw = cw + pad * 2, IC = { p: '✏️', d: '🎨', g: '🤔' };
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `800 36px ${FONT}`;
    const blocks = book.map((pg, i) => {
      const kind = pg.k === 'd' ? 'd' : i === 0 ? 'p' : 'g';
      const label = `${IC[kind]} ${names[pg.by] || '?'} · ${D.KIND_NAME[kind]}`;
      if (pg.k === 'd') return { pg, label, h: 36 + Math.round(H * cw / W) + 14 };
      const lines = wrapLines(measure, pg.t, cw - 44);
      return { pg, label, lines, h: 36 + 24 + lines.length * 46 + 14 };
    });
    const head = 84, foot = 54, total = head + blocks.reduce((a, b) => a + b.h, 0) + foot;
    const cv = document.createElement('canvas'); cv.width = gw; cv.height = total;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#2a1f3d'; ctx.fillRect(0, 0, gw, total);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd98e'; ctx.font = `800 34px ${FONT}`; ctx.fillText(title, pad, 54);
    let y = head;
    for (const b of blocks) {
      ctx.fillStyle = '#c9bfe0'; ctx.font = `700 22px ${FONT}`; ctx.fillText(b.label, pad, y + 24);
      y += 36;
      if (b.pg.k === 'd') {
        const ph = Math.round(H * cw / W), t = document.createElement('canvas');
        render(t, b.pg.s, { w: cw });
        ctx.fillStyle = '#fff'; ctx.fillRect(pad - 3, y - 3, cw + 6, ph + 6);
        ctx.drawImage(t, pad, y, cw, ph);
        y += ph + 14;
      } else {
        const bh = 24 + b.lines.length * 46;
        ctx.fillStyle = '#fff4dc'; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pad, y, cw, bh, 18); else ctx.rect(pad, y, cw, bh);
        ctx.fill();
        ctx.fillStyle = '#3a2a1c'; ctx.font = `800 36px ${FONT}`; ctx.textAlign = 'center';
        b.lines.forEach((ln, i) => ctx.fillText(ln, gw / 2, y + 12 + 36 + i * 46 - 8));
        ctx.textAlign = 'left';
        y += bh + 14;
      }
    }
    ctx.fillStyle = '#8e84a6'; ctx.font = `600 20px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('🎨 베니스트레이션 · benny3s.github.io/game/draw', gw / 2, total - 20);
    return cv;
  }
  // 그림 한 장만 (오늘의 그림)
  function singleImage(enc, caption) {
    const pad = 28, cv = document.createElement('canvas'); cv.width = W + pad * 2; cv.height = H + pad * 2 + 90;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#2a1f3d'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#ffd98e'; ctx.font = `800 32px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('🏆 오늘의 그림', cv.width / 2, 46);
    const t = document.createElement('canvas'); render(t, enc, { w: W });
    ctx.fillStyle = '#fff'; ctx.fillRect(pad - 3, 64 - 3, W + 6, H + 6); ctx.drawImage(t, pad, 64);
    ctx.fillStyle = '#e8e1f5'; ctx.font = `700 26px ${FONT}`; ctx.fillText(caption || '', cv.width / 2, H + 64 + 44);
    ctx.fillStyle = '#8e84a6'; ctx.font = `600 18px ${FONT}`; ctx.fillText('🎨 베니스트레이션', cv.width / 2, cv.height - 14);
    return cv;
  }
  // 공유 창(폰) → 안 되면 내려받기. 결과 글을 돌려줌
  async function saveCanvas(cv, name) {
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (!blob) return '이미지를 못 만들었어요';
    const file = new File([blob], name, { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '베니스트레이션' }); return '공유했어요'; }
    } catch (e) { if (e && e.name === 'AbortError') return ''; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return '이미지를 저장했어요';
  }

  window.DrawPad = { Pad, render, notebookImage, singleImage, saveCanvas, FONT };
})();

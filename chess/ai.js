/* 체스 AI — 우리 엔진 (0x88 판 · 알파베타 PVS · 반복 심화 · 치환표 · 정지 탐색 · 널 무브 · LMR · 킬러/히스토리)
   규칙 확인용 chess.js 와 따로 움직이는 자체 수 생성기 (test/selftest.js 의 perft 로 서로 맞춰 봄)
   쓰는 법 (브라우저·워커: 전역 ChessAI, Node: require):
     ChessAI.think({ start: FEN, moves: ['e2e4', …] }, { tier: 'easy'|'normal'|'hard', seed, timeMs, nodes, explain })
       → { move: 'g1f3', score(지금 둘 쪽 기준 cp), mate(+n 이기는 수 / -n 지는 수), depth, nodes, ms, pv: [...], book, why? }
     ChessAI.explain(game, uci, res) → { kind, text } — AI 선생님 한 줄 까닭 ('나이트로 포크를 걸어요' …)
     ChessAI.intent(game, uci, { timeMs }) → 복기: 실제로 둔 수의 까닭 · 이 수 뒤 형세 · 다음 노림(널 무브)
     ChessAI.perft(fen, depth) · ChessAI.evaluate(fen) */
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.ChessAI = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // ── 기물: 종류 1~6 (폰 나이트 비숍 룩 퀸 킹), 흑은 +8 ──
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BL = 8;
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;
  const MATE = 30000, INF = 32000;
  const ND = [33, 31, 18, 14, -33, -31, -18, -14], KD = [1, -1, 16, -16, 17, 15, -17, -15];
  const BD = [17, 15, -17, -15], RD = [1, -1, 16, -16];
  const SEEV = [0, 100, 320, 330, 500, 900, 20000];
  const PH = [0, 0, 1, 1, 2, 4, 0];
  const sqName = s => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
  const parseSq = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16;
  const PCH = ' pnbrqk';

  // ── 값 표 (우리가 정한 값, 백 쪽에서 본 그림: 첫 줄 = 8단) ──
  const MAT_MG = [0, 90, 320, 335, 480, 960, 0], MAT_EG = [0, 110, 300, 320, 540, 980, 0];
  const T = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 12, 14, 22, 30, 30, 22, 14, 12, 6, 8, 12, 24, 24, 12, 8, 6,
      0, 2, 6, 20, 20, 6, 2, 0, 4, 0, -4, 4, 4, -6, 0, 4, 4, 8, 8, -18, -18, 8, 8, 4, 0, 0, 0, 0, 0, 0, 0, 0],
    Pe: [0, 0, 0, 0, 0, 0, 0, 0, 60, 60, 60, 60, 60, 60, 60, 60, 40, 40, 36, 32, 32, 36, 40, 40, 22, 20, 18, 14, 14, 18, 20, 22,
      12, 10, 8, 6, 6, 8, 10, 12, 4, 4, 2, 2, 2, 2, 4, 4, 2, 2, 2, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -38, -30, -28, -28, -30, -38, -50, -36, -18, 0, 4, 4, 0, -18, -36, -28, 4, 12, 16, 16, 12, 4, -28, -26, 6, 16, 22, 22, 16, 6, -26,
      -26, 2, 14, 20, 20, 14, 2, -26, -28, 4, 10, 12, 12, 10, 4, -28, -38, -18, 0, 4, 4, 0, -18, -38, -50, -34, -28, -26, -26, -28, -34, -50],
    B: [-18, -10, -10, -10, -10, -10, -10, -18, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 6, 10, 10, 6, 0, -10, -10, 6, 6, 10, 10, 6, 6, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 8, 8, 10, 10, -10, -10, 12, 0, 2, 2, 0, 12, -10, -18, -10, -14, -10, -10, -14, -10, -18],
    R: [4, 6, 8, 10, 10, 8, 6, 4, 16, 20, 20, 20, 20, 20, 20, 16, -4, 0, 0, 2, 2, 0, 0, -4, -6, 0, 0, 2, 2, 0, 0, -6,
      -6, 0, 0, 2, 2, 0, 0, -6, -6, 0, 0, 2, 2, 0, 0, -6, -8, -2, 0, 2, 2, 0, -2, -8, -4, 0, 4, 8, 8, 6, 0, -4],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      -5, 0, 5, 5, 5, 5, 0, -5, -10, 2, 5, 5, 5, 5, 0, -10, -10, 0, 2, 0, 0, 0, 0, -10, -20, -10, -10, -2, -5, -10, -10, -20],
    K: [-40, -45, -45, -50, -50, -45, -45, -40, -40, -45, -45, -50, -50, -45, -45, -40, -40, -45, -45, -50, -50, -45, -45, -40, -35, -40, -40, -45, -45, -40, -40, -35,
      -25, -30, -30, -40, -40, -30, -30, -25, -12, -20, -20, -24, -24, -20, -20, -12, 14, 14, -6, -10, -10, -6, 16, 14, 18, 28, 8, -4, 0, 6, 30, 20],
    Ke: [-50, -35, -25, -18, -18, -25, -35, -50, -30, -15, -5, 0, 0, -5, -15, -30, -25, -5, 15, 22, 22, 15, -5, -25, -25, -5, 22, 30, 30, 22, -5, -25,
      -25, -5, 22, 30, 30, 22, -5, -25, -25, -8, 12, 18, 18, 12, -8, -25, -30, -20, -2, 0, 0, -2, -20, -30, -50, -35, -28, -25, -25, -28, -35, -50],
  };
  const MG = [], EG = [];
  for (let p = 0; p < 15; p++) { MG.push(new Int32Array(128)); EG.push(new Int32Array(128)); }
  {
    const mgT = [null, T.P, T.N, T.B, T.R, T.Q, T.K], egT = [null, T.Pe, T.N.map(v => v >> 1), T.B.map(v => v >> 1), T.R.map(v => v >> 1), T.Q.map(v => v >> 1), T.Ke];
    for (let t = 1; t <= 6; t++) for (let s = 0; s < 128; s++) {
      if (s & 0x88) continue;
      const r = s >> 4, f = s & 7, wi = (7 - r) * 8 + f, bi = r * 8 + f;
      MG[t][s] = MAT_MG[t] + mgT[t][wi]; EG[t][s] = MAT_EG[t] + egT[t][wi];
      MG[t | BL][s] = MAT_MG[t] + mgT[t][bi]; EG[t | BL][s] = MAT_EG[t] + egT[t][bi];
    }
  }
  // ── 지문(조브리스트): 고정 씨앗이라 늘 같은 값 ──
  let zs = 0x9e3779b9 | 0;
  const zr = () => { zs ^= zs << 13; zs ^= zs >>> 17; zs ^= zs << 5; return zs | 0; };
  const ZL = [], ZH = [];
  for (let p = 0; p < 15; p++) { const a = new Int32Array(128), b = new Int32Array(128); for (let s = 0; s < 128; s++) { a[s] = zr(); b[s] = zr(); } ZL.push(a); ZH.push(b); }
  const ZSL = zr(), ZSH = zr();
  const ZCL = new Int32Array(16), ZCH = new Int32Array(16), ZEL = new Int32Array(8), ZEH = new Int32Array(8);
  for (let i = 0; i < 16; i++) { ZCL[i] = zr(); ZCH[i] = zr(); }
  for (let i = 0; i < 8; i++) { ZEL[i] = zr(); ZEH[i] = zr(); }
  const CMASK = new Int32Array(128).fill(15);
  CMASK[0] = 13; CMASK[4] = 12; CMASK[7] = 14; CMASK[0x70] = 7; CMASK[0x74] = 3; CMASK[0x77] = 11;

  // 씨앗 난수 (같은 씨앗이면 같은 선택)
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ════════ 판 ════════
  const MAXP = 1200;
  class Pos {
    constructor() {
      this.b = new Int8Array(128); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.ply = 0;
      this.kings = [0, 0]; this.hlo = 0; this.hhi = 0; this.mg = [0, 0]; this.eg = [0, 0]; this.phase = 0;
      this.uCap = new Int8Array(MAXP); this.uCastle = new Int8Array(MAXP); this.uEp = new Int16Array(MAXP); this.uHalf = new Int16Array(MAXP);
      this.uLo = new Int32Array(MAXP); this.uHi = new Int32Array(MAXP); this.uMg0 = new Int32Array(MAXP); this.uMg1 = new Int32Array(MAXP);
      this.uEg0 = new Int32Array(MAXP); this.uEg1 = new Int32Array(MAXP); this.uPh = new Int8Array(MAXP);
      this.hLo = new Int32Array(MAXP); this.hHi = new Int32Array(MAXP);
    }
    add(p, s) { this.b[s] = p; const c = p >> 3; this.mg[c] += MG[p][s]; this.eg[c] += EG[p][s]; this.phase += PH[p & 7]; this.hlo ^= ZL[p][s]; this.hhi ^= ZH[p][s]; if ((p & 7) === K) this.kings[c] = s; }
    del(s) { const p = this.b[s]; this.b[s] = 0; const c = p >> 3; this.mg[c] -= MG[p][s]; this.eg[c] -= EG[p][s]; this.phase -= PH[p & 7]; this.hlo ^= ZL[p][s]; this.hhi ^= ZH[p][s]; return p; }
    load(fen) {
      this.b.fill(0); this.mg = [0, 0]; this.eg = [0, 0]; this.phase = 0; this.hlo = 0; this.hhi = 0; this.ply = 0;
      const [pl, sd, cs, ep, hm] = fen.trim().split(/\s+/);
      let r = 7, f = 0;
      for (const ch of pl) {
        if (ch === '/') { r--; f = 0; continue; }
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        const t = PCH.indexOf(ch.toLowerCase());
        if (t > 0) this.add(t | (ch === ch.toLowerCase() ? BL : 0), r * 16 + f);
        f++;
      }
      this.side = sd === 'b' ? 1 : 0;
      this.castle = 0;
      if (cs && cs !== '-') { if (cs.includes('K')) this.castle |= 1; if (cs.includes('Q')) this.castle |= 2; if (cs.includes('k')) this.castle |= 4; if (cs.includes('q')) this.castle |= 8; }
      this.ep = ep && ep !== '-' ? parseSq(ep) : -1;
      this.half = +hm || 0;
      if (this.side) { this.hlo ^= ZSL; this.hhi ^= ZSH; }
      this.hlo ^= ZCL[this.castle]; this.hhi ^= ZCH[this.castle];
      if (this.ep >= 0) { this.hlo ^= ZEL[this.ep & 7]; this.hhi ^= ZEH[this.ep & 7]; }
      this.hLo[0] = this.hlo; this.hHi[0] = this.hhi;
      return this;
    }
    fen() {
      let s = '';
      for (let r = 7; r >= 0; r--) {
        let e = 0;
        for (let f = 0; f < 8; f++) { const p = this.b[r * 16 + f]; if (!p) { e++; continue; } if (e) { s += e; e = 0; } const ch = PCH[p & 7]; s += p & BL ? ch : ch.toUpperCase(); }
        if (e) s += e; if (r) s += '/';
      }
      let c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
      return `${s} ${this.side ? 'b' : 'w'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} 1`;
    }
    // sq 를 color 쪽이 공격하나
    attacked(s, c) {
      const b = this.b, cb = c ? BL : 0;
      if (c) { if (!((s + 15) & 0x88) && b[s + 15] === (P | BL)) return true; if (!((s + 17) & 0x88) && b[s + 17] === (P | BL)) return true; }
      else { if (!((s - 15) & 0x88) && b[s - 15] === P) return true; if (!((s - 17) & 0x88) && b[s - 17] === P) return true; }
      for (let i = 0; i < 8; i++) { const t = s + ND[i]; if (!(t & 0x88) && b[t] === (N | cb)) return true; }
      for (let i = 0; i < 8; i++) { const t = s + KD[i]; if (!(t & 0x88) && b[t] === (K | cb)) return true; }
      for (let i = 0; i < 4; i++) {
        const d = BD[i]; let t = s + d;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (B | cb) || p === (Q | cb)) return true; break; } t += d; }
      }
      for (let i = 0; i < 4; i++) {
        const d = RD[i]; let t = s + d;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (R | cb) || p === (Q | cb)) return true; break; } t += d; }
      }
      return false;
    }
    inCheck() { return this.attacked(this.kings[this.side], this.side ^ 1); }
    // 의사 합법 수 (킹이 걸리는지는 make 뒤에 확인). caps = 잡기·승진만
    gen(out, caps) {
      const b = this.b, us = this.side, ub = us ? BL : 0;
      let n = 0;
      const push = (f, t, fl, pr) => { out[n++] = f | (t << 7) | (pr << 14) | (fl << 17); };
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = b[s]; if (!p || (p & BL) !== ub) continue;
        const t = p & 7;
        if (t === P) {
          const dir = us ? -16 : 16, r = s >> 4, last = us ? 1 : 6, startR = us ? 6 : 1;
          const one = s + dir;
          if (!b[one]) {
            if (r === last) { for (const pr of [Q, N, R, B]) push(s, one, 0, pr); }
            else if (!caps) { push(s, one, 0, 0); if (r === startR && !b[one + dir]) push(s, one + dir, F_DOUBLE, 0); }
          }
          for (const dx of [-1, 1]) {
            const c = one + dx; if (c & 0x88) continue;
            const q = b[c];
            if (q && (q & BL) !== ub) { if (r === last) { for (const pr of [Q, N, R, B]) push(s, c, F_CAP, pr); } else push(s, c, F_CAP, 0); }
            else if (c === this.ep) push(s, c, F_CAP | F_EP, 0);
          }
        } else if (t === N || t === K) {
          const D = t === N ? ND : KD;
          for (let i = 0; i < 8; i++) {
            const to = s + D[i]; if (to & 0x88) continue;
            const q = b[to];
            if (!q) { if (!caps) push(s, to, 0, 0); } else if ((q & BL) !== ub) push(s, to, F_CAP, 0);
          }
          if (t === K && !caps) {
            const them = us ^ 1;
            if (us === 0 && s === 4) {
              if ((this.castle & 1) && !b[5] && !b[6] && b[7] === R && !this.attacked(4, them) && !this.attacked(5, them)) push(4, 6, F_CASTLE, 0);
              if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === R && !this.attacked(4, them) && !this.attacked(3, them)) push(4, 2, F_CASTLE, 0);
            } else if (us === 1 && s === 0x74) {
              if ((this.castle & 4) && !b[0x75] && !b[0x76] && b[0x77] === (R | BL) && !this.attacked(0x74, them) && !this.attacked(0x75, them)) push(0x74, 0x76, F_CASTLE, 0);
              if ((this.castle & 8) && !b[0x73] && !b[0x72] && !b[0x71] && b[0x70] === (R | BL) && !this.attacked(0x74, them) && !this.attacked(0x73, them)) push(0x74, 0x72, F_CASTLE, 0);
            }
          }
        } else {
          const D = t === B ? BD : t === R ? RD : KD;
          for (let i = 0; i < D.length; i++) {
            const d = D[i]; let to = s + d;
            while (!(to & 0x88)) {
              const q = b[to];
              if (!q) { if (!caps) push(s, to, 0, 0); }
              else { if ((q & BL) !== ub) push(s, to, F_CAP, 0); break; }
              to += d;
            }
          }
        }
      }
      return n;
    }
    make(m) {
      const from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >>> 17;
      const b = this.b, us = this.side, i = this.ply;
      this.uCastle[i] = this.castle; this.uEp[i] = this.ep; this.uHalf[i] = this.half; this.uLo[i] = this.hlo; this.uHi[i] = this.hhi;
      this.uMg0[i] = this.mg[0]; this.uMg1[i] = this.mg[1]; this.uEg0[i] = this.eg[0]; this.uEg1[i] = this.eg[1]; this.uPh[i] = this.phase;
      if (this.ep >= 0) { this.hlo ^= ZEL[this.ep & 7]; this.hhi ^= ZEH[this.ep & 7]; }
      let cap = 0;
      if (fl & F_EP) cap = this.del(to + (us ? 16 : -16));
      else if (b[to]) cap = this.del(to);
      this.uCap[i] = cap;
      const pc = this.del(from);
      this.add(pr ? (pr | (us ? BL : 0)) : pc, to);
      if (fl & F_CASTLE) { if (to > from) this.add(this.del(from + 3), from + 1); else this.add(this.del(from - 4), from - 1); }
      this.hlo ^= ZCL[this.castle]; this.hhi ^= ZCH[this.castle];
      this.castle &= CMASK[from] & CMASK[to];
      this.hlo ^= ZCL[this.castle]; this.hhi ^= ZCH[this.castle];
      this.ep = fl & F_DOUBLE ? (from + to) >> 1 : -1;
      if (this.ep >= 0) { this.hlo ^= ZEL[this.ep & 7]; this.hhi ^= ZEH[this.ep & 7]; }
      this.half = (pc & 7) === P || cap ? 0 : this.half + 1;
      this.side ^= 1; this.hlo ^= ZSL; this.hhi ^= ZSH;
      this.ply = i + 1; this.hLo[i + 1] = this.hlo; this.hHi[i + 1] = this.hhi;
    }
    unmake(m) {
      const from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >>> 17;
      const b = this.b, i = --this.ply, us = this.side ^= 1;
      const moved = b[to];
      b[from] = pr ? (P | (us ? BL : 0)) : moved; b[to] = 0;
      if ((moved & 7) === K) this.kings[us] = from;
      const cap = this.uCap[i];
      if (cap) b[fl & F_EP ? to + (us ? 16 : -16) : to] = cap;
      if (fl & F_CASTLE) { if (to > from) { b[from + 3] = b[from + 1]; b[from + 1] = 0; } else { b[from - 4] = b[from - 1]; b[from - 1] = 0; } }
      this.castle = this.uCastle[i]; this.ep = this.uEp[i]; this.half = this.uHalf[i]; this.hlo = this.uLo[i]; this.hhi = this.uHi[i];
      this.mg[0] = this.uMg0[i]; this.mg[1] = this.uMg1[i]; this.eg[0] = this.uEg0[i]; this.eg[1] = this.uEg1[i]; this.phase = this.uPh[i];
    }
    // 둔 쪽 킹이 안전하면 true, 아니면 되돌리고 false
    makeLegal(m) { this.make(m); if (this.attacked(this.kings[this.side ^ 1], this.side)) { this.unmake(m); return false; } return true; }
    makeNull() {
      const i = this.ply;
      this.uEp[i] = this.ep; this.uHalf[i] = this.half; this.uLo[i] = this.hlo; this.uHi[i] = this.hhi;
      if (this.ep >= 0) { this.hlo ^= ZEL[this.ep & 7]; this.hhi ^= ZEH[this.ep & 7]; }
      this.ep = -1; this.half++; this.side ^= 1; this.hlo ^= ZSL; this.hhi ^= ZSH;
      this.ply = i + 1; this.hLo[i + 1] = this.hlo; this.hHi[i + 1] = this.hhi;
    }
    unmakeNull() { const i = --this.ply; this.side ^= 1; this.ep = this.uEp[i]; this.half = this.uHalf[i]; this.hlo = this.uLo[i]; this.hhi = this.uHi[i]; }
    // 같은 국면이 앞에 있었나 (마지막으로 되돌릴 수 없는 수 뒤에서만)
    repeated() {
      const lo = this.hlo, hi = this.hhi, stop = Math.max(0, this.ply - this.half);
      for (let i = this.ply - 2; i >= stop; i -= 2) if (this.hLo[i] === lo && this.hHi[i] === hi) return true;
      return false;
    }
    legalMoves() {
      const buf = new Int32Array(256), n = this.gen(buf, false), out = [];
      for (let i = 0; i < n; i++) if (this.makeLegal(buf[i])) { this.unmake(buf[i]); out.push(buf[i]); }
      return out;
    }
    uci(m) { const pr = (m >> 14) & 7; return sqName(m & 127) + sqName((m >> 7) & 127) + (pr ? PCH[pr] : ''); }
    findUci(u) { const L = this.legalMoves(); for (const m of L) if (this.uci(m) === u) return m; return 0; }
    // 공격하는 쪽 기물들의 칸 (pawn·knight·king·미끄러지는 기물)
    attackers(s, c) {
      const b = this.b, cb = c ? BL : 0, out = [];
      if (c) { for (const d of [15, 17]) { const t = s + d; if (!(t & 0x88) && b[t] === (P | BL)) out.push(t); } }
      else { for (const d of [-15, -17]) { const t = s + d; if (!(t & 0x88) && b[t] === P) out.push(t); } }
      for (const d of ND) { const t = s + d; if (!(t & 0x88) && b[t] === (N | cb)) out.push(t); }
      for (const d of KD) { const t = s + d; if (!(t & 0x88) && b[t] === (K | cb)) out.push(t); }
      for (const d of BD) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (B | cb) || p === (Q | cb)) out.push(t); break; } t += d; } }
      for (const d of RD) { let t = s + d; while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === (R | cb) || p === (Q | cb)) out.push(t); break; } t += d; } }
      return out;
    }
    // 이 칸의 기물을 c 쪽이 먼저 잡기 시작하면 얻는 값 (정적 교환 계산)
    see(s, c) {
      const b = this.b; if (!b[s]) return 0;
      const removed = [], gain = [];
      let d = 0, side = c, occ = SEEV[b[s] & 7];
      const least = sd => { let best = -1, bv = 1e9; for (const t of this.attackers(s, sd)) { const v = SEEV[b[t] & 7]; if (v < bv) { bv = v; best = t; } } return best; };
      let a = least(side); if (a < 0) return 0;
      gain[0] = occ; occ = SEEV[b[a] & 7]; removed.push([a, b[a]]); b[a] = 0; side ^= 1;
      while (true) {
        d++; gain[d] = occ - gain[d - 1];
        a = least(side); if (a < 0) break;
        occ = SEEV[b[a] & 7]; removed.push([a, b[a]]); b[a] = 0; side ^= 1;
        if (d > 30) break;
      }
      while (--d > 0) gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
      for (const [t, p] of removed) b[t] = p;
      return gain[0];
    }
    // sq 의 기물이 공격하는 칸들
    attacksFrom(s) {
      const b = this.b, p = b[s], t = p & 7, out = [];
      if (!p) return out;
      if (t === P) { for (const d of (p & BL ? [-15, -17] : [15, 17])) { const x = s + d; if (!(x & 0x88)) out.push(x); } return out; }
      if (t === N || t === K) { for (const d of (t === N ? ND : KD)) { const x = s + d; if (!(x & 0x88)) out.push(x); } return out; }
      const D = t === B ? BD : t === R ? RD : KD;
      for (const d of D) { let x = s + d; while (!(x & 0x88)) { out.push(x); if (b[x]) break; x += d; } }
      return out;
    }
  }

  // ════════ 평가 (지금 둘 쪽 기준) ════════
  const PASSED_MG = [0, 5, 10, 15, 25, 40, 60, 0], PASSED_EG = [0, 10, 20, 35, 60, 95, 140, 0];
  const wFiles = new Int8Array(10), bFiles = new Int8Array(10);
  function evaluate(pos) {
    const b = pos.b;
    let mg = pos.mg[0] - pos.mg[1], eg = pos.eg[0] - pos.eg[1];
    wFiles.fill(0); bFiles.fill(0);
    let wb = 0, bb = 0, wnp = 0, bnp = 0, wp = 0, bp = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s]; if (!p) continue;
      const t = p & 7;
      if (t === P) { if (p & BL) { bFiles[(s & 7) + 1]++; bp++; } else { wFiles[(s & 7) + 1]++; wp++; } }
      else if (t !== K) { if (p & BL) { bnp += SEEV[t]; if (t === B) bb++; } else { wnp += SEEV[t]; if (t === B) wb++; } }
    }
    if (wb >= 2) { mg += 30; eg += 45; }
    if (bb >= 2) { mg -= 30; eg -= 45; }
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s]; if (!p) continue;
      const t = p & 7, f = (s & 7) + 1, r = s >> 4;
      if (t === P) {
        if (p & BL) {
          if (bFiles[f] > 1) { mg += 6; eg += 10; }
          if (!bFiles[f - 1] && !bFiles[f + 1]) { mg += 12; eg += 14; }
          let passed = true;
          for (let x = s - 16; x >= 0 && passed; x -= 16) for (const dx of [-1, 0, 1]) { const y = x + dx; if (!(y & 0x88) && b[y] === P) { passed = false; break; } }
          if (passed) { mg -= PASSED_MG[7 - r]; eg -= PASSED_EG[7 - r]; }
        } else {
          if (wFiles[f] > 1) { mg -= 6; eg -= 10; }
          if (!wFiles[f - 1] && !wFiles[f + 1]) { mg -= 12; eg -= 14; }
          let passed = true;
          for (let x = s + 16; x < 128 && passed; x += 16) for (const dx of [-1, 0, 1]) { const y = x + dx; if (!(y & 0x88) && b[y] === (P | BL)) { passed = false; break; } }
          if (passed) { mg += PASSED_MG[r]; eg += PASSED_EG[r]; }
        }
      } else if (t === R) {
        const sg = p & BL ? -1 : 1;
        if (!wFiles[f] && !bFiles[f]) { mg += 20 * sg; eg += 10 * sg; }
        else if (p & BL ? !bFiles[f] : !wFiles[f]) { mg += 10 * sg; eg += 5 * sg; }
      }
      if (t === B || t === R || t === Q) {        // 움직일 수 있는 칸 (가벼운 기동력)
        const D = t === B ? BD : t === R ? RD : KD; let mob = 0;
        for (const d of D) { let x = s + d; while (!(x & 0x88)) { const q = b[x]; if (q) { if ((q & BL) !== (p & BL)) mob++; break; } mob++; x += d; } }
        const w = t === Q ? 1 : 3, base = t === B ? 6 : t === R ? 6 : 12;
        const v = (mob - base) * w;
        if (p & BL) { mg -= v; eg -= v; } else { mg += v; eg += v; }
      }
    }
    // 킹 앞 폰 방패 (중반)
    for (const c of [0, 1]) {
      const k = pos.kings[c], dir = c ? -16 : 16, own = P | (c ? BL : 0);
      let sh = 0;
      for (const dx of [-1, 0, 1]) { const a = k + dir + dx, a2 = a + dir; if (!(a & 0x88) && b[a] === own) sh += 12; else if (!(a2 & 0x88) && b[a2] === own) sh += 6; }
      mg += c ? -sh : sh;
    }
    const ph = Math.min(24, pos.phase);
    let sc = ((mg * ph + eg * (24 - ph)) / 24) | 0;
    // 이길 수 없는 쪽 (폰 없고 가벼운 기물 하나 이하)은 0 쪽으로
    if (sc > 0 && !wp && wnp <= 330) sc = sc >> 4;
    if (sc < 0 && !bp && bnp <= 330) sc = sc >> 4;
    sc += pos.side ? -10 : 10;                     // 둘 차례 이점
    return pos.side ? -sc : sc;
  }

  // ════════ 탐색 ════════
  const TT_BITS = 19, TT_N = 1 << TT_BITS, TT_MASK = TT_N - 1;
  let ttKey = null, ttMove, ttScore, ttDepth, ttFlag;
  function ttInit() { if (!ttKey) { ttKey = new Int32Array(TT_N); ttMove = new Int32Array(TT_N); ttScore = new Int32Array(TT_N); ttDepth = new Int8Array(TT_N); ttFlag = new Int8Array(TT_N); } ttKey.fill(0); ttMove.fill(0); ttFlag.fill(0); }
  const MAXPLY = 96;
  const moveBuf = []; const scoreBuf = [];
  for (let i = 0; i < MAXPLY + 4; i++) { moveBuf.push(new Int32Array(256)); scoreBuf.push(new Int32Array(256)); }
  const pvT = new Int32Array(MAXPLY * MAXPLY), pvL = new Int32Array(MAXPLY);
  const killers = new Int32Array(MAXPLY * 2);
  const hist = new Int32Array(2 * 128 * 128);

  class Search {
    constructor(pos, o) { this.pos = pos; this.nodes = 0; this.stop = false; this.t0 = Date.now(); this.timeMs = o.timeMs || 1e9; this.maxNodes = o.nodes || 1e12; this.rootBest = 0; this.rootScore = 0; }
    check() { if (this.nodes >= this.maxNodes || (this.timeMs < 1e9 && Date.now() - this.t0 >= this.timeMs)) this.stop = true; }
    order(ply, n, ttm) {
      const ms = moveBuf[ply], sc = scoreBuf[ply], b = this.pos.b, k0 = killers[ply * 2], k1 = killers[ply * 2 + 1], sd = this.pos.side;
      for (let i = 0; i < n; i++) {
        const m = ms[i];
        if (m === ttm) { sc[i] = 1e7; continue; }
        const fl = m >>> 17, pr = (m >> 14) & 7, from = m & 127, to = (m >> 7) & 127;
        if (fl & F_CAP) { const v = fl & F_EP ? P : b[to] & 7; sc[i] = 1e6 + SEEV[v] * 10 - SEEV[b[from] & 7] / 10 + (pr === Q ? 5000 : 0); }
        else if (pr) sc[i] = pr === Q ? 9e5 : 1000;
        else if (m === k0) sc[i] = 8e5;
        else if (m === k1) sc[i] = 7e5;
        else sc[i] = hist[(sd * 128 + from) * 128 + to];
      }
    }
    pick(ply, i, n) {
      const ms = moveBuf[ply], sc = scoreBuf[ply];
      let bi = i;
      for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
      if (bi !== i) { const t = ms[i]; ms[i] = ms[bi]; ms[bi] = t; const u = sc[i]; sc[i] = sc[bi]; sc[bi] = u; }
      return ms[i];
    }
    qs(alpha, beta, ply) {
      const pos = this.pos;
      if ((++this.nodes & 1023) === 0) this.check();
      if (this.stop) return 0;
      const stand = evaluate(pos);
      if (ply >= MAXPLY - 1) return stand;
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      const n = pos.gen(moveBuf[ply], true);
      this.order(ply, n, 0);
      let best = stand;
      for (let i = 0; i < n; i++) {
        const m = this.pick(ply, i, n);
        const fl = m >>> 17, pr = (m >> 14) & 7;
        if (!pr && (fl & F_CAP)) {
          const v = fl & F_EP ? P : pos.b[(m >> 7) & 127] & 7;
          if (stand + SEEV[v] + 200 < alpha) continue;          // 잡아도 모자라면 건너뜀
        }
        if (!pos.makeLegal(m)) continue;
        const sc = -this.qs(-beta, -alpha, ply + 1);
        pos.unmake(m);
        if (this.stop) return 0;
        if (sc > best) { best = sc; if (sc > alpha) { alpha = sc; if (sc >= beta) break; } }
      }
      return best;
    }
    search(depth, alpha, beta, ply, nullOk) {
      const pos = this.pos;
      pvL[ply] = ply;
      if (ply > 0) {
        if ((this.nodes & 1023) === 0) this.check();
        if (this.stop) return 0;
        if (pos.half >= 100 || pos.repeated()) return 0;
        alpha = Math.max(alpha, -MATE + ply); beta = Math.min(beta, MATE - ply - 1);
        if (alpha >= beta) return alpha;
      }
      const inChk = pos.inCheck();
      if (inChk) depth++;
      if (depth <= 0) return this.qs(alpha, beta, ply);
      if (ply >= MAXPLY - 2) return evaluate(pos);
      this.nodes++;
      const pvNode = beta - alpha > 1;
      const idx = pos.hlo & TT_MASK;
      let ttm = 0;
      if (ttKey[idx] === pos.hhi && ttFlag[idx]) {
        ttm = ttMove[idx];
        if (ply > 0 && ttDepth[idx] >= depth && !pvNode) {
          let s = ttScore[idx];
          if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
          const f = ttFlag[idx];
          if (f === 1 || (f === 2 && s >= beta) || (f === 3 && s <= alpha)) return s;
        }
      }
      let ev = 0;
      if (!inChk && !pvNode) {
        ev = evaluate(pos);
        if (depth <= 3 && ev - 120 * depth >= beta && Math.abs(beta) < MATE - 500) return ev;   // 이미 넉넉하면 그만
        if (nullOk && depth >= 3 && ev >= beta && this.npm(pos.side)) {
          const Rr = depth >= 6 ? 3 : 2;
          pos.makeNull();
          const s = -this.search(depth - 1 - Rr, -beta, -beta + 1, ply + 1, false);
          pos.unmakeNull();
          if (this.stop) return 0;
          if (s >= beta) return s >= MATE - 500 ? beta : s;
        }
      }
      const n = pos.gen(moveBuf[ply], false);
      this.order(ply, n, ttm);
      let legal = 0, best = -INF, bestM = 0;
      const a0 = alpha;
      for (let i = 0; i < n; i++) {
        const m = this.pick(ply, i, n);
        const fl = m >>> 17, pr = (m >> 14) & 7, quiet = !(fl & F_CAP) && !pr;
        if (!pos.makeLegal(m)) continue;
        legal++;
        const gives = pos.inCheck();
        if (quiet && !inChk && !gives && !pvNode && legal > 1 && depth <= 2 && ev + 150 * depth <= alpha && best > -MATE + 500) { pos.unmake(m); continue; }   // 가망 없는 조용한 수 건너뛰기
        let sc;
        if (legal === 1) sc = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
        else {
          let red = 0;
          if (depth >= 3 && quiet && !inChk && !gives && legal > 3 && m !== killers[ply * 2] && m !== killers[ply * 2 + 1]) red = legal > 8 ? 2 : 1;
          sc = -this.search(depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
          if (sc > alpha && red) sc = -this.search(depth - 1, -alpha - 1, -alpha, ply + 1, true);
          if (sc > alpha && sc < beta) sc = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
        }
        pos.unmake(m);
        if (this.stop) return 0;
        if (sc > best) {
          best = sc; bestM = m;
          if (sc > alpha) {
            alpha = sc;
            const base = ply * MAXPLY;
            pvT[base + ply] = m;
            for (let j = ply + 1; j < pvL[ply + 1]; j++) pvT[base + j] = pvT[(ply + 1) * MAXPLY + j];
            pvL[ply] = Math.max(ply + 1, pvL[ply + 1]);
            if (ply === 0) { this.rootBest = m; this.rootScore = sc; }
            if (sc >= beta) {
              if (quiet) {
                if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
                const hi = (pos.side * 128 + (m & 127)) * 128 + ((m >> 7) & 127);
                hist[hi] += depth * depth; if (hist[hi] > 6e5) for (let j = 0; j < hist.length; j++) hist[j] >>= 1;
              }
              break;
            }
          }
        }
      }
      if (!legal) return inChk ? -MATE + ply : 0;
      let st = best;
      if (st > MATE - 500) st += ply; else if (st < -MATE + 500) st -= ply;
      ttKey[idx] = pos.hhi; ttMove[idx] = bestM; ttScore[idx] = st; ttDepth[idx] = depth;
      ttFlag[idx] = best >= beta ? 2 : best > a0 ? 1 : 3;
      return best;
    }
    npm(c) { const b = this.pos.b, cb = c ? BL : 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = b[s]; if (p && (p & BL) === cb) { const t = p & 7; if (t !== P && t !== K) return true; } } return false; }
  }

  // ── 첫 수 책 (잘 알려진 시작 몇 가지, 순서대로 둔 UCI) ──
  const BOOK_LINES = [
    'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7',
    'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6',
    'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8e7 e1g1 e8g8',
    'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6',
    'e2e4 e7e5 g1f3 d7d6 d2d4 g8f6 b1c3 b8d7',
    'e2e4 e7e5 b1c3 g8f6 g1f3 b8c6',
    'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
    'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5',
    'e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 a7a6',
    'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7',
    'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7',
    'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6',
    'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5',
    'e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6',
    'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6',
    'e2e4 g7g6 d2d4 f8g7 b1c3 d7d6',
    'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7',
    'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4',
    'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6',
    'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8',
    'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8',
    'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7',
    'd2d4 g8f6 g1f3 d7d5 c1f4 e7e6 e2e3 c7c5',
    'd2d4 f7f5 g2g3 g8f6 f1g2 e7e6',
    'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6',
    'c2c4 g8f6 b1c3 e7e6 e2e4 d7d5',
    'g1f3 d7d5 g2g3 g8f6 f1g2 e7e6 e1g1 f8e7',
  ];
  const BOOK = new Map();
  for (const line of BOOK_LINES) {
    const mv = line.split(' ');
    for (let i = 0; i < mv.length; i++) {
      const k = mv.slice(0, i).join(' ');
      const arr = BOOK.get(k) || []; if (!arr.includes(mv[i])) arr.push(mv[i]); BOOK.set(k, arr);
    }
  }

  // ── 난이도 ──
  const TIERS = {
    easy:   { mode: 'exact', depth: 1, noise: 110, blunder: 0.12, book: 0 },
    normal: { mode: 'exact', depth: 3, noise: 22, blunder: 0, book: 0.85, nodes: 400000 },
    hard:   { mode: 'id', depth: 40, timeMs: 1200, nodes: 4e6, book: 1 },
  };

  function setup(game) {
    const pos = new Pos().load((game && game.start) || START);
    for (const u of (game && game.moves) || []) { const m = pos.findUci(u); if (!m) break; pos.make(m); }
    return pos;
  }
  const mateOf = sc => Math.abs(sc) > MATE - 500 ? (sc > 0 ? Math.ceil((MATE - sc) / 2) : -Math.ceil((MATE + sc) / 2)) : 0;

  function think(game, o = {}) {
    const t0 = Date.now();
    const pos = setup(game);
    const cfg = Object.assign({}, TIERS[o.tier] || TIERS.normal, o.cfg || {});
    const R = rng(o.seed == null ? 12345 : o.seed);
    const legal = pos.legalMoves();
    if (!legal.length) return { move: null, score: 0, mate: 0, depth: 0, nodes: 0, ms: 0, pv: [] };
    // 책 (처음 시작 판에서만)
    const isStart = !game || !game.start || game.start.split(' ').slice(0, 4).join(' ') === START.split(' ').slice(0, 4).join(' ');
    if (isStart && cfg.book && !o.hint && R() < cfg.book) {
      const opts = BOOK.get(((game && game.moves) || []).join(' '));
      if (opts && opts.length) {
        const u = opts[Math.floor(R() * opts.length)];
        if (pos.findUci(u)) return finish({ move: u, score: 0, mate: 0, depth: 0, nodes: 0, pv: [u], book: true });
      }
    }
    ttInit(); killers.fill(0); hist.fill(0);
    if (legal.length === 1 && !o.hint && !o.explain) return finish({ move: pos.uci(legal[0]), score: 0, mate: 0, depth: 0, nodes: 0, pv: [pos.uci(legal[0])] });
    const S = new Search(pos, { timeMs: o.timeMs != null ? o.timeMs : cfg.timeMs, nodes: o.nodes != null ? o.nodes : cfg.nodes });
    let res;
    if (cfg.mode === 'exact') {
      // 첫 수마다 정확한 값을 내고, 난이도만큼 흔들어 고름 (초급·중급)
      const depth = o.depth || cfg.depth, list = [];
      for (const m of legal) {
        pos.make(m);
        const sc = -S.search(depth - 1, -INF, INF, 1, true);
        pos.unmake(m);
        if (S.stop) break;                                       // 다 못 본 수는 넣지 않음
        list.push({ m, sc });
      }
      if (!list.length) list.push({ m: legal[0], sc: 0 });
      for (const x of list) x.v = x.sc + (cfg.noise ? (R() + R() + R() - 1.5) * cfg.noise : 0);
      list.sort((a, b) => b.v - a.v);
      let pick = list[0];
      if (cfg.blunder && R() < cfg.blunder) pick = list[Math.floor(R() * list.length)];
      const best = list.reduce((a, b) => (b.sc > a.sc ? b : a), list[0]);
      res = { move: pos.uci(pick.m), score: pick.sc, mate: mateOf(pick.sc), depth, nodes: S.nodes, pv: [pos.uci(pick.m)], bestScore: best.sc };
    } else {
      // 반복 심화 (고급 · 선생님)
      let bestM = legal[0], bestS = 0, done = 0, pv = [];
      for (let d = 1; d <= (o.depth || cfg.depth); d++) {
        let a = -INF, bt = INF;
        if (d >= 4) { a = bestS - 45; bt = bestS + 45; }
        let sc = S.search(d, a, bt, 0, true);
        if (!S.stop && (sc <= a || sc >= bt)) sc = S.search(d, -INF, INF, 0, true);
        if (S.stop) { if (S.rootBest && d > 1) { bestM = S.rootBest; bestS = S.rootScore; } break; }
        bestM = S.rootBest || bestM; bestS = sc; done = d;
        pv = []; for (let j = 0; j < pvL[0]; j++) pv.push(pos.uci(pvT[j]));
        if (Math.abs(sc) > MATE - 500 && d >= 2 && MATE - Math.abs(sc) <= d) break;   // 외길 메이트를 찾음
        if (o.timeMs == null && cfg.timeMs && Date.now() - S.t0 > cfg.timeMs * 0.55) break;   // 다음 깊이는 못 끝낼 듯
        if (o.timeMs != null && o.timeMs < 1e9 && Date.now() - S.t0 > o.timeMs * 0.55) break;
      }
      if (!pv.length || pv[0] !== pos.uci(bestM)) pv = [pos.uci(bestM)];
      res = { move: pos.uci(bestM), score: bestS, mate: mateOf(bestS), depth: done, nodes: S.nodes, pv };
    }
    return finish(res);
    function finish(r) {
      r.ms = Date.now() - t0;
      if (o.explain && r.move) { try { r.why = explain(game, r.move, r); } catch (e) { r.why = null; } }
      return r;
    }
  }

  // ════════ AI 선생님: 왜 이 수인지 한 줄 ════════
  const KO = ['', '폰', '나이트', '비숍', '룩', '퀸', '킹'];
  const EUL = ['', '을', '를', '을', '을', '을', '을'];
  const RO = ['', '으로', '로', '으로', '로', '으로', '으로'];
  const GWA = ['', '과', '와', '과', '과', '과', '과'];
  const IGA = ['', '이', '가', '이', '이', '이', '이'];
  const joinKo = ts => ts.length === 1 ? KO[ts[0]] + EUL[ts[0]] : ts.slice(0, -1).map((t, i, a) => KO[t] + (i === a.length - 1 ? GWA[t] : ',')).join(' ') + ' ' + KO[ts[ts.length - 1]] + EUL[ts[ts.length - 1]];
  function hanging(pos, c) {           // c 쪽에서 공짜로 잃을 기물들 [칸, 종류]
    const out = [], b = pos.b, cb = c ? BL : 0;
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = b[s]; if (!p || (p & BL) !== cb || (p & 7) === K) continue; if (pos.see(s, c ^ 1) > 0) out.push([s, p & 7]); }
    return out;
  }
  function explain(game, uci, res) {
    const pos = setup(game);
    const m = pos.findUci(uci); if (!m) return null;
    const us = pos.side, them = us ^ 1, from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >>> 17;
    const pt = pos.b[from] & 7, ct = fl & F_EP ? P : (pos.b[to] & 7);
    const nPly = pos.ply + ((game && game.start && game.start.split(' ')[5] ? (+game.start.split(' ')[5] - 1) * 2 : 0));
    const escaping = pt !== K && pos.see(from, them) > 0;
    const hangBefore = hanging(pos, us).filter(([s]) => s !== from);
    const capGain = ct ? pos.see(to, us) : 0;                 // 이 칸에서 잡기를 시작하면 얻는 값 (대략)
    const defended = ct ? pos.attackers(to, them).length > 0 : false;
    pos.make(m);
    const mated = pos.legalMoves().length === 0 && pos.inCheck();
    const gives = pos.inCheck();
    const safe = pos.see(to, them) <= 0;
    const mover = pr || pt;
    const attacked = pos.attacksFrom(to).filter(s => pos.b[s] && (pos.b[s] & BL) === (them ? BL : 0));
    const forkT = attacked.filter(s => { const t = pos.b[s] & 7; return t === K || SEEV[t] > SEEV[mover] || (t !== P && pos.attackers(s, them).length === 0); }).map(s => pos.b[s] & 7);
    // 핀: 미끄러지는 기물 뒤에 더 값진 기물
    let pin = null;
    if (mover === B || mover === R || mover === Q) {
      const D = mover === B ? BD : mover === R ? RD : KD;
      for (const d of D) {
        let x = to + d, first = 0;
        while (!(x & 0x88)) {
          const q = pos.b[x];
          if (q) {
            if ((q & BL) !== (them ? BL : 0)) break;
            if (!first) { first = q & 7; if (first === K) break; }
            else { const t2 = q & 7; if (SEEV[t2] > SEEV[first] && first !== P) pin = [first, t2]; break; }
          }
          x += d;
        }
        if (pin) break;
      }
    }
    const threats = hanging(pos, them).filter(([s]) => attacked.includes(s)).map(([, t]) => t);
    const hangAfter = hanging(pos, us).filter(([s]) => s !== to);
    let passed = false;
    if (pt === P) { passed = true; const dir = us ? -16 : 16; for (let x = to + dir; !(x & 0x88) && passed; x += dir) for (const dx of [-1, 0, 1]) { const y = x + dx; if (!(y & 0x88) && pos.b[y] === (P | (them ? BL : 0))) { passed = false; break; } } }
    pos.unmake(m);
    const mate = res && res.mate;
    let kind = 'quiet', text = '';
    if (mated) { kind = 'mate'; text = '체크메이트! 이 수로 바로 이겨요'; }
    else if (mate > 1) { kind = 'mateIn'; text = `${mate}수 안에 체크메이트할 수 있어요. 그 첫 수예요`; }
    else if (pr) { kind = 'promote'; text = `폰을 ${KO[pr]}${RO[pr]} 승진시켜요!`; }
    else if (forkT.length >= 2 && safe) { kind = 'fork'; text = `${KO[mover]}${RO[mover]} 포크를 걸어요 (${joinKo(forkT.slice(0, 3))} 함께 노려요)`; }
    else if (ct && (capGain > 50 || !defended) && SEEV[ct] >= 100) { kind = 'win'; text = !defended ? `공짜 ${KO[ct]}${EUL[ct]} 잡아요` : `${KO[pt]}${RO[pt]} ${KO[ct]}${EUL[ct]} 잡아 이득을 봐요`; }
    else if (pin && safe) { kind = 'pin'; text = pin[1] === K ? `${KO[mover]}${RO[mover]} 핀을 걸어요 (${KO[pin[0]]}${IGA[pin[0]]} 킹 앞에서 꼼짝 못 해요)` : `${KO[mover]}${RO[mover]} 핀을 걸어요 (${KO[pin[0]]}${IGA[pin[0]]} 움직이면 ${KO[pin[1]]}${IGA[pin[1]]} 잡혀요)`; }
    else if (escaping && safe) { kind = 'escape'; text = `공격받는 ${KO[pt]}${EUL[pt]} 안전한 곳으로 피해요`; }
    else if (hangBefore.length > hangAfter.length) { const t = hangBefore.find(([s]) => !hangAfter.some(([s2]) => s2 === s)); kind = 'defend'; text = `위험한 ${KO[t ? t[1] : P]}${EUL[t ? t[1] : P]} 지켜요`; }
    else if (fl & F_CASTLE) { kind = 'castle'; text = '캐슬링으로 킹을 안전하게 숨기고 룩을 꺼내요'; }
    else if (threats.length && safe) { kind = 'threat'; text = `상대 ${KO[threats[0]]}${EUL[threats[0]]} 노려요`; }
    else if (gives && safe) { kind = 'check'; text = '체크! 상대 킹을 몰아붙여요'; }
    else if (ct) { kind = 'trade'; text = `${KO[ct]}${EUL[ct]} 맞바꿔요`; }
    else if ((pt === N || pt === B) && nPly < 24 && (from >> 4) === (us ? 7 : 0)) { kind = 'develop'; text = `${KO[pt]}${EUL[pt]} 전개해요 · 처음엔 기물을 빨리 꺼내는 게 좋아요`; }
    else if (pt === P && [0x33, 0x34, 0x43, 0x44].includes(to)) { kind = 'center'; text = '폰으로 중앙을 차지해요'; }
    else if (pt === P && passed && ((to >> 4) >= 4 || (us && (to >> 4) <= 3))) { kind = 'passed'; text = '막을 폰이 없는 폰을 앞으로 밀어요'; }
    else if (res && res.score < -250) { kind = 'hold'; text = '어려운 판이에요. 가장 오래 버티는 수예요'; }
    else { kind = 'quiet'; text = pt === K ? '킹 자리를 다지는 수예요' : `${KO[pt]} 자리를 좋게 다지는 수예요`; }
    return { kind, text };
  }

  // ════════ 복기 선생님: 실제로 둔 수가 노린 것 ════════
  // intent(game, uci, { timeMs }) → { score, mate: 둔 쪽 기준 이 수 뒤 형세(상대가 가장 잘 받았을 때), why: explain(실제 수), check,
  //   threat: { move, score, mate, why, fen } | null } — threat = 둔 쪽이 한 번 더 둔다면(널 무브) 가장 좋은 수 = '다음에 노리는 것'.
  //   이 수가 체크면 상대가 차례를 넘길 수 없으니 threat 없음. fen 은 그 '한 번 더' 국면 (SAN 만들기용)
  function intent(game, uci, o = {}) {
    const t = o.timeMs || 450, start = (game && game.start) || START, moves = ((game && game.moves) || []).slice();
    const pos = setup(game), m = pos.findUci(uci);
    if (!m) return null;
    const why = explain(game, uci, null);
    const st = start.split(' '), n = moves.length + 1, full = (+st[5] || 1) + Math.floor((n + (st[1] === 'b' ? 1 : 0)) / 2);
    pos.make(m);
    const check = pos.inCheck(), replies = pos.legalMoves().length;
    let score = 0, mate = 0;
    if (!replies) { if (check) { score = MATE - 1; mate = 1; } }
    else { const r = think({ start, moves: moves.concat(uci) }, { tier: 'hard', hint: true, timeMs: t, seed: 3 }); score = -r.score; mate = -r.mate || 0; }
    let threat = null;
    if (!check && replies) {
      pos.makeNull();
      const fen = pos.fen().replace(/ \d+$/, ' ' + full);
      const r = think({ start: fen, moves: [] }, { tier: 'hard', hint: true, explain: true, timeMs: t, seed: 5 });
      if (r.move) threat = { move: r.move, score: r.score, mate: r.mate, why: r.why || null, fen };
    }
    return { score, mate, why, check, threat };
  }

  function perft(fen, depth) {
    const pos = new Pos().load(fen);
    const go = d => {
      const buf = new Int32Array(256), n = pos.gen(buf, false);
      let c = 0;
      for (let i = 0; i < n; i++) { if (!pos.makeLegal(buf[i])) continue; c += d <= 1 ? 1 : go(d - 1); pos.unmake(buf[i]); }
      return c;
    };
    return depth ? go(depth) : 1;
  }
  const evalFen = fen => evaluate(new Pos().load(fen));

  return { think, explain, intent, perft, evaluate: evalFen, TIERS, BOOK_LINES, START, MATE, _Pos: Pos, _setup: setup };
});

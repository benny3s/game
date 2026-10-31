/* 냥스트레이션 — 규칙 코어 (브라우저·Node 공용, 화면은 이 함수들만 씀)
   · 상태 = JSON 으로 저장되는 평범한 객체. 난수·시계 없음 (필요한 말·씨앗은 부르는 쪽이 줌)
   · 공책 돌리기: 사람 n명, 공책 n권(주인 b = 0..n-1), 단계 step = 0..n-1
       단계 s 에 공책 b 를 들고 있는 사람 = (b + s) % n  ← 그래서 모든 사람이 모든 공책을 정확히 한 번 만짐
       단계 종류: 0 = 제시어('p', 주인이 씀) · 홀수 = 그리기('d', 앞 글을 봄) · 짝수(≥2) = 맞히기('g', 앞 그림만 봄)
       n단계가 끝나면 공책마다 n쪽 (글·그림·글·그림…) → 공개(reveal) → 투표(vote) → 결과(result)
   · 그림 = 굵기·색·점이 든 획의 모음. 저장·전송은 정수 배열 (한 획 = [머리, x0, y0, dx1, dy1, …])
       머리 = 색번호×3 + 굵기번호 (색 8 = 지우개), 좌표는 논리 600×450 을 2칸씩 묶은 300×225 격자, 둘째 점부터는 앞 점과의 차이
   · 투표: 자기 그림은 못 고름 · 빈 종이는 못 고름. 가장 많이 받은 사람(들)이 오늘의 그림 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DrawCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 600, H = 450;                       // 논리 그림판 크기
  const Q = 2, GW = W / Q, GH = H / Q;          // 전송 격자 (2칸 = 정수 1)
  const PAPER = '#fffaf0';                      // 종이색 (지우개도 이 색으로 칠함)
  const ERASER = 8;                             // 색번호 8 = 지우개
  const COLORS = [
    { name: '먹색', hex: '#242a36' }, { name: '빨강', hex: '#e5484d' }, { name: '주황', hex: '#f5841f' }, { name: '노랑', hex: '#f6c90e' },
    { name: '초록', hex: '#3fae5a' }, { name: '파랑', hex: '#3b82f6' }, { name: '보라', hex: '#8b5cf6' }, { name: '갈색', hex: '#8a5a3c' },
  ];
  const SIZES = [4, 10, 22];                    // 붓 굵기 (논리 px)
  const ERASER_SIZES = [14, 28, 56];            // 지우개는 더 굵게
  const MAX_STROKES = 300, MAX_NUMS = 12000, MAX_BYTES = 7000, MAX_RECV = 40000;   // 한 장 한도 (보내는 쪽 7KB 로 줄이고, 받는 쪽은 40KB 까지만 믿음)
  const TEXT_MAX = { p: 16, g: 20 };
  const EMPTY_GUESS = '???';
  const EMPTY_DRAW = '(빈 종이 🐾)';

  // ── 단계 · 공책 돌리기 ─────────────────────────────────────
  const kindOf = step => (step === 0 ? 'p' : step % 2 ? 'd' : 'g');
  const KIND_NAME = { p: '제시어', d: '그리기', g: '맞히기' };
  const stepCount = n => n;
  const holder = (b, step, n) => (b + step) % n;                           // 그 단계에 공책 b 를 든 사람
  const bookOf = (p, step, n) => (((p - step) % n) + n) % n;               // 그 단계에 사람 p 가 든 공책
  const plan = n => Array.from({ length: n }, (_, s) => kindOf(s));
  const drawsPerBook = n => Math.floor(n / 2);                             // 공책 한 권의 그림 수 (홀수 쪽: 1,3,5…≤ n-1)

  // ── 글 ──────────────────────────────────────────────────
  function cleanText(s, max) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    const a = Array.from(s);
    return a.length > max ? a.slice(0, max).join('').trim() : s;
  }

  // ── 그림 (획) ─────────────────────────────────────────────
  // 점 줄여 쓰기 (Ramer–Douglas–Peucker, 격자 단위)
  function rdp(pts, eps) {
    const n = pts.length;
    if (n <= 2) return pts.slice();
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    const e2 = eps * eps;
    while (stack.length) {
      const [a, b] = stack.pop();
      let mx = -1, mi = -1;
      const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, L = dx * dx + dy * dy;
      for (let i = a + 1; i < b; i++) {
        let d;
        if (L === 0) d = (pts[i][0] - ax) ** 2 + (pts[i][1] - ay) ** 2;
        else { const t = Math.max(0, Math.min(1, ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / L)); d = (pts[i][0] - ax - t * dx) ** 2 + (pts[i][1] - ay - t * dy) ** 2; }
        if (d > mx) { mx = d; mi = i; }
      }
      if (mx > e2) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // 획 목록 [{ c, s, p: [[x,y]…] }] (논리 좌표, 실수) → 전송용 정수 배열. eps 가 클수록 점이 적음
  function encode(strokes, eps) {
    eps = eps == null ? 0.8 : eps;
    const out = [];
    for (const st of strokes || []) {
      if (!st || !st.p || !st.p.length) continue;
      const c = clamp(st.c | 0, 0, ERASER), s = clamp(st.s | 0, 0, 2);
      let pts = [];
      for (const q of st.p) {
        const x = clamp(Math.round(q[0] / Q), 0, GW), y = clamp(Math.round(q[1] / Q), 0, GH);
        const l = pts[pts.length - 1];
        if (!l || l[0] !== x || l[1] !== y) pts.push([x, y]);
      }
      pts = rdp(pts, eps);
      const a = [c * 3 + s, pts[0][0], pts[0][1]];
      for (let i = 1; i < pts.length; i++) a.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      out.push(a);
    }
    return out;
  }
  // 한도(바이트) 안에 들 때까지 점을 더 줄여서 (그래도 크면 오래된 획부터 버림 — 거의 없음)
  function fit(strokes, maxBytes) {
    maxBytes = maxBytes || MAX_BYTES;
    let enc = [];
    for (const eps of [0.8, 1.2, 1.8, 2.7, 4, 6]) {
      enc = encode(strokes, eps);
      if (JSON.stringify(enc).length <= maxBytes) return enc;
    }
    while (enc.length > 1 && JSON.stringify(enc).length > maxBytes) enc.shift();
    return enc;
  }
  // 받은 것을 믿지 않고 다듬기: 모양·정수·범위·개수 한도. 잘못되면 [] (빈 종이)
  function clean(raw) {
    if (!Array.isArray(raw) || raw.length > MAX_STROKES) return [];
    let nums = 0;
    const out = [];
    for (const a of raw) {
      if (!Array.isArray(a) || a.length < 3 || (a.length - 3) % 2) continue;
      nums += a.length;
      if (nums > MAX_NUMS) break;
      const head = a[0] | 0;
      if (head < 0 || head > ERASER * 3 + 2) continue;
      let x = clamp(a[1] | 0, 0, GW), y = clamp(a[2] | 0, 0, GH);
      const b = [head, x, y];
      for (let i = 3; i < a.length; i += 2) {
        const nx = clamp(x + (a[i] | 0), 0, GW), ny = clamp(y + (a[i + 1] | 0), 0, GH);
        b.push(nx - x, ny - y); x = nx; y = ny;
      }
      out.push(b);
    }
    return out;
  }
  // 정수 배열 → 그릴 수 있는 획 [{ c, s, w(굵기 px), er(지우개), pts: [[x,y]…] }] (논리 좌표)
  function decode(enc) {
    const out = [];
    for (const a of enc || []) {
      const c = Math.floor(a[0] / 3), s = a[0] % 3;
      let x = a[1], y = a[2];
      const pts = [[x * Q, y * Q]];
      for (let i = 3; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; pts.push([x * Q, y * Q]); }
      out.push({ c, s, er: c === ERASER, w: (c === ERASER ? ERASER_SIZES : SIZES)[s], pts });
    }
    return out;
  }
  // 빈 종이: 획이 없거나 지우개 획뿐
  const isBlank = enc => !enc || !enc.length || enc.every(a => Math.floor(a[0] / 3) === ERASER);
  const jsonBytes = x => JSON.stringify(x).length;

  // ── 한 판 ────────────────────────────────────────────────
  // cfg: { draw: 그리기 초, guess: 맞히기 초, pick: 'pick' | 'write' }
  function create(n, cfg) {
    return { n, cfg: Object.assign({ draw: 60, guess: 25, pick: 'pick' }, cfg || {}), step: 0, phase: 'step',
      books: Array.from({ length: n }, () => []), cur: new Array(n).fill(null), votes: {} };
  }
  const kind = G => kindOf(G.step);
  // 이 단계에 사람 p 가 받을 일: 어느 공책 · 무엇을 보고 하는지(앞 쪽)
  function taskFor(G, p) {
    const b = bookOf(p, G.step, G.n), src = G.step ? G.books[b][G.step - 1] : null;
    return { step: G.step, kind: kindOf(G.step), book: b, src: src ? (src.k === 'd' ? { k: 'd', s: src.s, by: src.by } : { k: 't', t: src.t, by: src.by }) : null };
  }
  const submitted = (G, p) => !!G.cur[p];
  const missing = G => { const m = []; for (let p = 0; p < G.n; p++) if (!G.cur[p]) m.push(p); return m; };
  const allIn = G => missing(G).length === 0;
  // 사람 p 가 낸 것 (payload: { t } 또는 { s }). 이미 냈거나 때가 아니면 false
  function submit(G, p, payload, word) {
    if (G.phase !== 'step' || p < 0 || p >= G.n || G.cur[p]) return false;
    const k = kindOf(G.step); payload = payload || {};
    if (k === 'd') { G.cur[p] = { k: 'd', by: p, s: clean(payload.s) }; return true; }
    const t = cleanText(payload.t, TEXT_MAX[k]);
    if (!t) { fill(G, p, word); return true; }
    G.cur[p] = { k: 't', by: p, t };
    return true;
  }
  // 못 낸 사람 대신 빈 것 (제시어는 아무 말 하나, 그림은 빈 종이, 맞히기는 ???)
  function fill(G, p, word) {
    if (G.phase !== 'step' || G.cur[p]) return false;
    const k = kindOf(G.step);
    G.cur[p] = k === 'd' ? { k: 'd', by: p, s: [], e: 1 } : { k: 't', by: p, t: k === 'p' ? (word || '고양이') : EMPTY_GUESS, e: 1 };
    return true;
  }
  // 모두 냈으면 공책에 붙이고 다음 단계로 (마지막이면 공개)
  function advance(G, wordFn) {
    if (G.phase !== 'step') return G.phase;
    for (let p = 0; p < G.n; p++) if (!G.cur[p]) fill(G, p, wordFn && wordFn());
    for (let p = 0; p < G.n; p++) G.books[bookOf(p, G.step, G.n)].push(G.cur[p]);
    G.cur = new Array(G.n).fill(null);
    G.step++;
    if (G.step >= G.n) G.phase = 'reveal';
    return G.phase;
  }

  // ── 공개 (한 쪽씩) ─────────────────────────────────────────
  // 보고 있는 곳 = 공책 b 의 앞 p쪽. 끝 다음이면 null
  function revealNext(n, len, b, p) { if (p < len) return { b, p: p + 1 }; if (b < n - 1) return { b: b + 1, p: 1 }; return null; }
  function revealPrev(n, len, b, p) { if (p > 1) return { b, p: p - 1 }; if (b > 0) return { b: b - 1, p: len }; return { b, p }; }

  // ── 투표 ─────────────────────────────────────────────────
  // 모든 그림: [{ b, p, by(그린 사람), s, src(그리라고 한 글), blank }]
  function drawings(books) {
    const out = [];
    books.forEach((bk, b) => bk.forEach((pg, p) => { if (pg && pg.k === 'd') out.push({ b, p, by: pg.by, s: pg.s, src: p ? (bk[p - 1] && bk[p - 1].t) || '' : '', blank: isBlank(pg.s) }); }));
    return out;
  }
  const votable = (books, voter) => drawings(books).filter(d => !d.blank && d.by !== voter);
  function canVote(books, voter, b, p) {
    const pg = books[b] && books[b][p];
    return !!pg && pg.k === 'd' && !isBlank(pg.s) && pg.by !== voter;
  }
  // 한 표 (고쳐 찍기 불가). 되면 true
  function vote(G, voter, b, p) {
    if (voter < 0 || voter >= G.n || G.votes[voter] || !canVote(G.books, voter, b, p)) return false;
    G.votes[voter] = [b, p]; return true;
  }
  // 표 모으기: votes = { 투표한 사람: [b, p] }
  function tally(books, votes, n) {
    const per = {}, byPlayer = new Array(n).fill(0);
    let total = 0;
    for (const v of Object.keys(votes || {})) {
      const voter = +v, t = votes[v];
      if (!Array.isArray(t) || !canVote(books, voter, t[0], t[1])) continue;
      const pg = books[t[0]][t[1]], key = t[0] + ':' + t[1];
      per[key] = (per[key] || 0) + 1; byPlayer[pg.by]++; total++;
    }
    let max = 0; for (const c of byPlayer) if (c > max) max = c;
    const winners = max > 0 ? byPlayer.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0) : [];
    // 오늘의 그림 = 이긴 사람마다 가장 표 많이 받은 그림 하나
    const top = winners.map(w => {
      let best = null;
      for (const d of drawings(books)) if (d.by === w) { const c = per[d.b + ':' + d.p] || 0; if (!best || c > best.votes) best = { b: d.b, p: d.p, by: w, votes: c }; }
      return best;
    }).filter(Boolean);
    return { per, byPlayer, total, max, winners, top };
  }
  // 내 랭킹 기록: 가장 표 많은 사람(들)이면 w (동점은 모두 w) · 아니면 l. beat = 나보다 표 적은 사람 수. opp = 다른 사람마다 나와의 승패
  function rankInfo(T, me) {
    if (!T || !T.total || me < 0 || me >= T.byPlayer.length) return null;
    const mine = T.byPlayer[me], opp = [];
    let beat = 0;
    T.byPlayer.forEach((c, i) => { if (i === me) return; if (c < mine) beat++; opp.push({ idx: i, res: mine > c ? 'w' : mine < c ? 'l' : 'd' }); });
    return { res: mine === T.max ? 'w' : 'l', beat, score: mine, opp };
  }

  return {
    W, H, Q, GW, GH, PAPER, ERASER, COLORS, SIZES, ERASER_SIZES, MAX_STROKES, MAX_BYTES, MAX_RECV, TEXT_MAX, EMPTY_GUESS, EMPTY_DRAW, KIND_NAME,
    kindOf, stepCount, holder, bookOf, plan, drawsPerBook, cleanText,
    rdp, encode, fit, clean, decode, isBlank, jsonBytes,
    create, kind, taskFor, submitted, missing, allIn, submit, fill, advance,
    revealNext, revealPrev, drawings, votable, canVote, vote, tally, rankInfo,
  };
});

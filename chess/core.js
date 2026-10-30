/* 체스 규칙 — chess.js(BSD-2, vendor/chess.js) 위에 얇게: 수 두기 → 사건(events) · 끝 판정 · 기보 · 한글 표기 · 학습 입력
   결정적 (난수 없음). Node·브라우저·워커 공용: 브라우저는 전역 ChessCore, Node 는 require
   상태 s = { start: FEN, moves: ['e2e4', …], chess: Chess, over, winner: 'w'|'b'|null, reason, last }
   reason: checkmate · stalemate · threefold · fifty · insufficient · resign · time · agree */
(function (root, factory) {
  const lib = typeof module === 'object' && module && module.exports ? require('./vendor/chess.js') : root.ChessJS;
  const m = factory(lib);
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.ChessCore = m;
})(typeof self !== 'undefined' ? self : this, function (lib) {
  'use strict';
  const { Chess } = lib;
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KO = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };
  const KO_SHORT = { K: '킹', Q: '퀸', R: '룩', B: '비', N: '나' };
  const COLOR = { w: '백', b: '흑' };
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const REASON = { checkmate: '체크메이트', stalemate: '스테일메이트 (둘 곳 없음)', threefold: '같은 국면 세 번', fifty: '50수 규칙', insufficient: '기물 부족', resign: '기권', time: '시간 끝', agree: '합의' };

  function create(start) {
    const fen = start || START;
    const chess = new Chess(fen);
    return { start: fen, moves: [], chess, over: false, winner: null, reason: null, last: null, hist: [] };
  }
  const fen = s => s.chess.fen();
  const turn = s => s.chess.turn();
  const toJSON = s => ({ start: s.start, moves: s.moves.slice() });
  // uci 'e7e8q' → { from, to, promotion }
  const parseUci = u => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
  const uciOf = m => m.from + m.to + (m.promotion || '');

  // 지금 둘 수 있는 수 (from 을 주면 그 칸 기물만)
  function legal(s, from) {
    if (s.over) return [];
    return s.chess.moves({ verbose: true, square: from }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion, san: m.san, piece: m.piece, captured: m.captured, flags: m.flags, uci: uciOf(m) }));
  }
  function needsPromotion(s, from, to) {
    return legal(s, from).some(m => m.to === to && m.promotion);
  }
  function endCheck(s) {
    const c = s.chess;
    if (c.isCheckmate()) return end(s, c.turn() === 'w' ? 'b' : 'w', 'checkmate');
    if (c.isStalemate()) return end(s, null, 'stalemate');
    if (c.isInsufficientMaterial()) return end(s, null, 'insufficient');
    if (c.isThreefoldRepetition()) return end(s, null, 'threefold');
    if (c.isDrawByFiftyMoves()) return end(s, null, 'fifty');
    return null;
  }
  function end(s, winner, reason) { s.over = true; s.winner = winner; s.reason = reason; return { type: 'end', winner, reason }; }

  // 한 수 두기: 'e2e4' 나 { from, to, promotion } → 사건 목록 (첫 사건이 illegal 이면 아무것도 안 바뀜)
  function step(s, mv) {
    if (s.over) return [{ type: 'illegal', reason: 'over' }];
    const want = typeof mv === 'string' ? parseUci(mv) : mv;
    if (!want || !want.from || !want.to) return [{ type: 'illegal', reason: 'bad' }];
    const cand = s.chess.moves({ verbose: true, square: want.from }).filter(m => m.to === want.to);
    if (!cand.length) return [{ type: 'illegal', reason: 'illegal' }];
    let pick = cand[0];
    if (cand.length > 1 || pick.promotion) {
      pick = cand.find(m => m.promotion === (want.promotion || 'q'));
      if (!pick) return [{ type: 'illegal', reason: 'promotion' }];
    }
    const m = s.chess.move({ from: pick.from, to: pick.to, promotion: pick.promotion });
    const u = uciOf(m);
    s.moves.push(u);
    const f = m.flags;
    const info = { type: 'move', uci: u, san: m.san, from: m.from, to: m.to, color: m.color, piece: m.piece, captured: m.captured || null, promotion: m.promotion || null,
      castle: f.includes('k') ? 'k' : f.includes('q') ? 'q' : null, ep: f.includes('e'), check: s.chess.inCheck(), n: s.moves.length };
    if (info.castle) { const r = m.color === 'w' ? '1' : '8'; info.rook = info.castle === 'k' ? ['h' + r, 'f' + r] : ['a' + r, 'd' + r]; }
    if (info.ep) info.epSq = m.to[0] + m.from[1];
    s.last = info; s.hist.push(info);
    const ev = [info];
    if (info.check) ev.push({ type: 'check', color: s.chess.turn() });
    const e = endCheck(s); if (e) ev.push(e);
    return ev;
  }
  // 무르기 n 수 (끝난 판도 되살림)
  function undo(s, n = 1) {
    let k = 0;
    while (k < n && s.moves.length) { s.chess.undo(); s.moves.pop(); s.hist.pop(); k++; }
    s.over = false; s.winner = null; s.reason = null; s.last = s.hist[s.hist.length - 1] || null;
    endCheck(s);
    return k;
  }
  function resign(s, color) { if (s.over) return [{ type: 'illegal', reason: 'over' }]; return [end(s, color === 'w' ? 'b' : 'w', 'resign')]; }
  function agree(s) { if (s.over) return [{ type: 'illegal', reason: 'over' }]; return [end(s, null, 'agree')]; }
  // 시간 끝: 상대가 메이트할 기물이 없으면 무승부 (FIDE 6.9)
  function timeout(s, color) {
    if (s.over) return [{ type: 'illegal', reason: 'over' }];
    const other = color === 'w' ? 'b' : 'w';
    return [end(s, canMate(s, other) ? other : null, 'time')];
  }
  function canMate(s, color) {
    let minors = 0, others = 0;
    for (const row of s.chess.board()) for (const p of row) if (p && p.color === color && p.type !== 'k') { if (p.type === 'n' || p.type === 'b') minors++; else others++; }
    return others > 0 || minors >= 2;
  }
  // 잡은 기물 (승진도 맞게: 기보에서 셈) → { w: ['p','n'], b: [...] } (w = 백이 잡은 흑 기물) · 점수 차(백 기준)
  function captured(s) {
    const out = { w: [], b: [] };
    for (const h of s.hist) if (h.captured) out[h.color].push(h.captured);
    const ord = 'qrbnp';
    out.w.sort((a, b) => ord.indexOf(a) - ord.indexOf(b)); out.b.sort((a, b) => ord.indexOf(a) - ord.indexOf(b));
    let diff = 0;
    for (const row of s.chess.board()) for (const p of row) if (p) diff += (p.color === 'w' ? 1 : -1) * VAL[p.type];
    return Object.assign(out, { diff });
  }
  function kingSquare(s, color) {
    const sq = s.chess.findPiece({ type: 'k', color });
    return sq && sq[0] || null;
  }
  function board(s) {      // 64칸 [{ sq, type, color } | null], a8 부터
    const out = [];
    s.chess.board().forEach(row => row.forEach(p => out.push(p ? { sq: p.square, type: p.type, color: p.color } : null)));
    return out;
  }
  // 기보 글자: SAN 또는 한글 (Nf3 → 나f3, O-O 는 그대로)
  function sanKo(san) {
    if (!san) return '';
    return san.replace(/^[KQRBN]/, c => KO_SHORT[c]).replace(/=([QRBN])/, (_, c) => '=' + KO_SHORT[c]);
  }
  // '백 나이트가 f3로' 같은 한 줄
  function describe(mv) {
    if (!mv) return '';
    if (mv.castle) return `${COLOR[mv.color]} 캐슬링 (${mv.castle === 'k' ? '킹 쪽' : '퀸 쪽'})`;
    let t = `${COLOR[mv.color]} ${KO[mv.piece]} ${mv.from}→${mv.to}`;
    if (mv.captured) t += ` · ${KO[mv.captured]} 잡음`;
    if (mv.promotion) t += ` · ${KO[mv.promotion]} 승진`;
    if (mv.check) t += ' · 체크!';
    return t;
  }
  // 기보 한 줄로: 'FEN|e2e4 e7e5' (시작 판이면 FEN 자리를 비움)
  function encode(s) { return (s.start === START ? '' : s.start) + '|' + s.moves.join(' ') + (s.over && ['resign', 'time', 'agree'].includes(s.reason) ? `|${s.reason}:${s.winner || '-'}` : ''); }
  function decode(str) {
    if (typeof str !== 'string') return null;
    const [f, mv, tail] = str.split('|');
    let s;
    try { s = create(f || START); } catch (e) { return null; }
    for (const u of (mv || '').split(' ').filter(Boolean)) { if (step(s, u)[0].type === 'illegal') return null; }
    if (tail && !s.over) { const [r, w] = tail.split(':'); end(s, w === '-' ? null : w, r); }
    return s;
  }
  function fromJSON(j) { const s = create(j && j.start); for (const u of (j && j.moves) || []) if (step(s, u)[0].type === 'illegal') break; return s; }
  function pgn(s, tags) {
    const c = new Chess(s.start);
    for (const u of s.moves) c.move(parseUci(u));
    const T = Object.assign({ Event: '베니 체스', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.') }, tags || {});
    if (s.start !== START) { T.SetUp = '1'; T.FEN = s.start; }
    T.Result = !s.over ? '*' : s.winner === 'w' ? '1-0' : s.winner === 'b' ? '0-1' : '1/2-1/2';
    for (const k in T) c.setHeader(k, String(T[k]));
    return c.pgn();
  }
  // 수 목록을 SAN 으로 (선생님 예상 수순 보여 주기)
  function sanLine(s, ucis, n) {
    const c = new Chess(s.chess.fen()), out = [];
    for (const u of ucis.slice(0, n || 99)) { try { const m = c.move(parseUci(u)); out.push(m.san); } catch (e) { break; } }
    return out;
  }
  const status = s => ({ turn: turn(s), check: s.chess.inCheck(), over: s.over, winner: s.winner, reason: s.reason, n: s.moves.length });

  // ════════ 학습(RL)용 ════════
  // AlphaZero 식 입력: 8×8 × 18장 (내 기물 6 · 상대 기물 6 · 반복 1 · 내 캐슬 2 · 상대 캐슬 2 · 50수 1), 늘 '지금 둘 쪽'이 아래에 오게 뒤집음
  function planes(s) {
    const c = s.chess, me = c.turn(), flip = me === 'b';
    const P = new Float32Array(18 * 64), T = 'pnbrqk';
    c.board().forEach((row, r) => row.forEach((p, f) => {
      if (!p) return;
      const rr = flip ? r : 7 - r, ff = flip ? 7 - f : f;           // rr = 0 이 내 쪽 첫 줄
      const k = (p.color === me ? 0 : 6) + T.indexOf(p.type);
      P[k * 64 + rr * 8 + ff] = 1;
    }));
    const fill = (k, v) => { if (v) P.fill(v, k * 64, k * 64 + 64); };
    const cr = c.fen().split(' ')[2], half = +c.fen().split(' ')[4];
    fill(12, c.isThreefoldRepetition() ? 1 : 0);
    const mine = me === 'w' ? ['K', 'Q'] : ['k', 'q'], theirs = me === 'w' ? ['k', 'q'] : ['K', 'Q'];
    fill(13, cr.includes(mine[0]) ? 1 : 0); fill(14, cr.includes(mine[1]) ? 1 : 0);
    fill(15, cr.includes(theirs[0]) ? 1 : 0); fill(16, cr.includes(theirs[1]) ? 1 : 0);
    fill(17, Math.min(1, half / 100));
    return P;
  }
  // 수 → 0..4671 (8×8 출발 칸 × 73: 퀸 방향 56 · 나이트 8 · 덜 승진 9), 지금 둘 쪽 기준으로 뒤집음
  const QD = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const NDIR = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  function moveIndex(uci, color) {
    const fl = color === 'b';
    const cv = sq => { const f = sq.charCodeAt(0) - 97, r = sq.charCodeAt(1) - 49; return fl ? [7 - f, 7 - r] : [f, r]; };
    const [f0, r0] = cv(uci.slice(0, 2)), [f1, r1] = cv(uci.slice(2, 4)), pr = uci[4];
    const df = f1 - f0, dr = r1 - r0, from = r0 * 8 + f0;
    let plane = -1;
    if (pr && pr !== 'q') plane = 64 + 'nbr'.indexOf(pr) * 3 + (df + 1);
    else {
      const ni = NDIR.findIndex(([a, b]) => a === df && b === dr);
      if (ni >= 0) plane = 56 + ni;
      else { const dist = Math.max(Math.abs(df), Math.abs(dr)), d = QD.findIndex(([a, b]) => a === Math.sign(df) && b === Math.sign(dr)); plane = d * 7 + dist - 1; }
    }
    return from * 73 + plane;
  }
  function legalMask(s) { const m = new Uint8Array(4672), c = turn(s); for (const x of legal(s)) m[moveIndex(x.uci, c)] = 1; return m; }

  return { START, KO, COLOR, REASON, VAL, create, fen, turn, toJSON, fromJSON, legal, needsPromotion, step, undo, resign, agree, timeout, canMate,
    captured, kingSquare, board, sanKo, describe, encode, decode, pgn, sanLine, status, parseUci, uciOf, planes, moveIndex, legalMask };
});

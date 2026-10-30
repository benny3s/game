/* 오목 — 규칙 코어 (브라우저·Node 공용, 화면과 AI는 이 함수들만 씀)
   · 상태 = JSON 그대로 저장되는 평범한 객체. Math.random·Date 없음 (난수가 필요하면 상태 안 mulberry32: rand)
   · 규칙 3가지: standard(쌍삼 금지, 기본) · renju(렌주) · free(자유)
   · 칸 번호 idx = y*size + x (y=0 이 화면 맨 위). 흑 1, 백 2, 빈칸 0
   · 강화학습(RL.md)은 create · legalMask · step/play · undo · planes · symIdx · 기보(encode/decode)를 그대로 따라 하면 됨 */
(function (root) {
  'use strict';

  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const RESIGN = -1;                       // step() 에 넣으면 지금 둘 차례인 쪽이 기권
  const DX = [1, 0, 1, 1], DY = [0, 1, 1, -1];   // 가로 · 세로 · ↘ · ↗
  const MAX_REC = 8;                       // 거짓 삼 확인 재귀 한도 (실전에선 3~4단계면 끝남)
  const BAN_NAMES = ['', '33', '44', 'overline'];

  const RULES = {
    standard: { id: 'standard', name: '쌍삼 금지', desc: '흑백 모두 열린 삼 두 개를 한 번에 못 만들어요. 여섯 알 이상은 승리가 아니에요.' },
    renju: { id: 'renju', name: '렌주', desc: '흑만 삼삼·사사·장목이 금지예요. 백은 자유롭고 여섯 알 이상도 이겨요.' },
    free: { id: 'free', name: '자유', desc: '금지 없이 다섯 알 이상 이으면 이겨요.' },
  };
  const RULE_CH = { standard: 'S', renju: 'R', free: 'F' };
  const BAN_33 = { b33: true, b44: false, bOver: false };
  const BAN_ALL = { b33: true, b44: true, bOver: true };

  // 이 색은 '정확히 다섯'이어야 이기나 (쌍삼 금지: 둘 다 · 렌주: 흑만)
  function exactFive(rule, c) { return rule === 'standard' || (rule === 'renju' && c === BLACK); }
  // 이 색에 걸리는 금수 (없으면 null)
  function bans(rule, c) { return rule === 'standard' ? BAN_33 : (rule === 'renju' && c === BLACK) ? BAN_ALL : null; }
  function restricted(rule, c) { return !!bans(rule, c); }

  // ── 줄 계산 (b = 판 배열, N = 한 변) ──────────────────────────
  // (x,y) 를 지나는 d 방향 c 돌 연속 개수 ((x,y) 자신 포함, 그 칸에 c 가 놓였다고 봄)
  function runThrough(b, N, x, y, d, c) {
    const dx = DX[d], dy = DY[d];
    let n = 1, i = x + dx, j = y + dy;
    while (i >= 0 && j >= 0 && i < N && j < N && b[j * N + i] === c) { n++; i += dx; j += dy; }
    i = x - dx; j = y - dy;
    while (i >= 0 && j >= 0 && i < N && j < N && b[j * N + i] === c) { n++; i -= dx; j -= dy; }
    return n;
  }
  // d 방향에서 (x,y) 를 품은 다섯을 만드는 빈칸(완성점) 수. ks 에 거리(-4~4)를 담음
  function completions(b, N, x, y, d, c, exact, ks) {
    const dx = DX[d], dy = DY[d];
    let cnt = 0;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const ex = x + k * dx, ey = y + k * dy;
      if (ex < 0 || ey < 0 || ex >= N || ey >= N) continue;
      const e = ey * N + ex;
      if (b[e] !== EMPTY) continue;
      b[e] = c;
      const n = runThrough(b, N, x, y, d, c);
      b[e] = EMPTY;
      if (exact ? n === 5 : n >= 5) { if (ks) ks[cnt] = k; cnt++; }
    }
    return cnt;
  }
  const KS = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  // d 방향의 '사' 개수: 0 · 1 · 2(한 줄 안의 사사, 예: X.XXX.X). 열린 사(.XXXX.)는 하나로 셈
  function fourCount(b, N, x, y, d, c, exact) {
    const n = completions(b, N, x, y, d, c, exact, KS);
    if (n <= 1) return n;
    return (n === 2 && KS[1] - KS[0] === 5) ? 1 : 2;
  }
  // d 방향이 열린 사(양쪽 끝 어디를 둬도 다섯)인가
  function straightFour(b, N, x, y, d, c, exact) {
    return completions(b, N, x, y, d, c, exact, KS) === 2 && KS[1] - KS[0] === 5;
  }
  // d 방향이 '진짜 열린 삼'인가: 한 수 더 두면 열린 사가 되고, 그 한 수가 금수가 아니어야 함 (재귀)
  function openThree(b, N, x, y, d, c, rule, depth) {
    const dx = DX[d], dy = DY[d];
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const ex = x + k * dx, ey = y + k * dy;
      if (ex < 0 || ey < 0 || ex >= N || ey >= N) continue;
      const e = ey * N + ex;
      if (b[e] !== EMPTY) continue;
      b[e] = c;
      const st = straightFour(b, N, x, y, d, c, true);
      b[e] = EMPTY;
      if (!st) continue;
      if (depth >= MAX_REC || !forbiddenRec(b, N, e, c, rule, depth + 1)) return true;
    }
    return false;
  }
  // 빠른 거르기: 주변 줄에 내 돌이 거의 없으면 금수일 수 없음
  function mayBeForbidden(b, N, x, y, c) {
    let dirs2 = 0;
    for (let d = 0; d < 4; d++) {
      const dx = DX[d], dy = DY[d];
      let n = 0;
      for (let k = -5; k <= 5; k++) {
        if (!k) continue;
        const i = x + k * dx, j = y + k * dy;
        if (i >= 0 && j >= 0 && i < N && j < N && b[j * N + i] === c) n++;
      }
      if (n >= 4) return true;            // 한 줄 사사 · 장목 가능
      if (n >= 2 && ++dirs2 >= 2) return true;   // 두 방향에 삼·사 가능
    }
    return false;
  }
  // 빈칸 idx 에 c 를 두면 금수인가: 0 아님 · 1 삼삼 · 2 사사 · 3 장목. 정확히 다섯이 되면 금수보다 먼저 (승리)
  function forbiddenRec(b, N, idx, c, rule, depth) {
    const ban = bans(rule, c);
    if (!ban || b[idx] !== EMPTY) return 0;
    const x = idx % N, y = (idx - x) / N;
    if (!mayBeForbidden(b, N, x, y, c)) return 0;
    b[idx] = c;
    let res = 0, five = false, over = false;
    for (let d = 0; d < 4; d++) { const n = runThrough(b, N, x, y, d, c); if (n === 5) five = true; else if (n > 5) over = true; }
    if (!five) {
      if (ban.bOver && over) res = 3;
      else {
        let fours = 0, threes = 0;
        for (let d = 0; d < 4; d++) {
          const f = fourCount(b, N, x, y, d, c, true);
          if (f) { fours += f; continue; }          // 사가 있는 방향은 삼이 아님
          if (ban.b33 && threes < 2 && openThree(b, N, x, y, d, c, rule, depth)) threes++;
        }
        if (ban.b44 && fours >= 2) res = 2;
        else if (threes >= 2) res = 1;
      }
    }
    b[idx] = EMPTY;
    return res;
  }
  function forbiddenAt(b, N, idx, c, rule) { return forbiddenRec(b, N, idx, c, rule, 0); }

  // 방금 둔 idx 로 이겼으면 이긴 줄(칸 목록)들, 아니면 null
  function winLines(b, N, idx, c, rule) {
    const x = idx % N, y = (idx - x) / N, exact = exactFive(rule, c);
    let lines = null;
    for (let d = 0; d < 4; d++) {
      const n = runThrough(b, N, x, y, d, c);
      if (exact ? n !== 5 : n < 5) continue;
      let i = x, j = y;
      while (i - DX[d] >= 0 && j - DY[d] >= 0 && i - DX[d] < N && j - DY[d] < N && b[(j - DY[d]) * N + i - DX[d]] === c) { i -= DX[d]; j -= DY[d]; }
      const line = [];
      for (let k = 0; k < n; k++) line.push((j + k * DY[d]) * N + i + k * DX[d]);
      (lines || (lines = [])).push(line);
    }
    return lines;
  }
  // 방금 둔 수가 만든 위협 (화면 효과용): 'open4'(막을 수 없는 사) · 'four' · 'three' · null
  function threatKind(b, N, idx, c, rule) {
    const x = idx % N, y = (idx - x) / N, exact = exactFive(rule, c);
    let pts = 0, three = false;
    for (let d = 0; d < 4; d++) {
      const n = completions(b, N, x, y, d, c, exact, null);
      pts += n;
      if (n || three) continue;
      for (let k = -3; k <= 3 && !three; k++) {
        if (!k) continue;
        const ex = x + k * DX[d], ey = y + k * DY[d];
        if (ex < 0 || ey < 0 || ex >= N || ey >= N || b[ey * N + ex] !== EMPTY) continue;
        b[ey * N + ex] = c;
        three = straightFour(b, N, x, y, d, c, exact);
        b[ey * N + ex] = EMPTY;
      }
    }
    return pts >= 2 ? 'open4' : pts === 1 ? 'four' : three ? 'three' : null;
  }

  // ── 상태 ─────────────────────────────────────────────────
  function create(size, rule, seed) {
    size = size || 15;
    if (!RULES[rule]) rule = 'standard';
    return { v: 1, size, rule, board: new Array(size * size).fill(EMPTY), moves: [], turn: BLACK,
      over: false, winner: EMPTY, reason: '', winLines: [], rng: (seed == null ? 1 : seed) >>> 0 };
  }
  function clone(s) {
    return { v: s.v, size: s.size, rule: s.rule, board: s.board.slice(), moves: s.moves.slice(), turn: s.turn,
      over: s.over, winner: s.winner, reason: s.reason, winLines: s.winLines.map(l => l.slice()), rng: s.rng >>> 0 };
  }
  const toJSON = s => clone(s);
  function fromJSON(o) {
    const s = create(o.size, o.rule, o.rng);
    for (let i = 0; i < s.board.length; i++) s.board[i] = o.board[i] | 0;
    s.moves = Array.from(o.moves || [], v => v | 0); s.turn = o.turn === WHITE ? WHITE : BLACK;
    s.over = !!o.over; s.winner = o.winner | 0; s.reason = o.reason || ''; s.winLines = (o.winLines || []).map(l => Array.from(l, v => v | 0));
    return s;
  }
  // 상태 안 난수 (mulberry32) — 같은 씨앗이면 같은 수열
  function rand(s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function isForbidden(s, idx) { return s.board[idx] === EMPTY && forbiddenRec(s.board, s.size, idx, s.turn, s.rule, 0) > 0; }
  function forbiddenReason(s, idx) { return BAN_NAMES[s.board[idx] === EMPTY ? forbiddenRec(s.board, s.size, idx, s.turn, s.rule, 0) : 0] || null; }
  // 지금 둘 차례인 쪽의 금수 자리 (1 삼삼 · 2 사사 · 3 장목, 나머지 0)
  function forbiddenMask(s) {
    const NN = s.size * s.size, m = new Uint8Array(NN);
    if (s.over || !restricted(s.rule, s.turn)) return m;
    for (let i = 0; i < NN; i++) if (s.board[i] === EMPTY) m[i] = forbiddenRec(s.board, s.size, i, s.turn, s.rule, 0);
    return m;
  }
  function legalMask(s) {
    const NN = s.size * s.size, m = new Uint8Array(NN);
    if (s.over) return m;
    const r = restricted(s.rule, s.turn);
    for (let i = 0; i < NN; i++) if (s.board[i] === EMPTY && !(r && forbiddenRec(s.board, s.size, i, s.turn, s.rule, 0))) m[i] = 1;
    return m;
  }
  function legalMoves(s) { const m = legalMask(s), out = []; for (let i = 0; i < m.length; i++) if (m[i]) out.push(i); return out; }
  function hasLegal(s) {
    const r = restricted(s.rule, s.turn);
    for (let i = 0; i < s.board.length; i++) if (s.board[i] === EMPTY && !(r && forbiddenRec(s.board, s.size, i, s.turn, s.rule, 0))) return true;
    return false;
  }

  // 한 수 두기 (상태를 바꿈). 돌려주는 events 를 보고 화면이 소리·효과를 냄
  function play(s, idx) {
    const N = s.size, NN = N * N;
    if (s.over) return [{ type: 'illegal', idx, reason: 'over' }];
    if (!(idx >= 0 && idx < NN) || (idx | 0) !== idx) return [{ type: 'illegal', idx, reason: 'range' }];
    if (s.board[idx] !== EMPTY) return [{ type: 'illegal', idx, reason: 'occupied' }];
    const c = s.turn, ban = forbiddenRec(s.board, N, idx, c, s.rule, 0);
    if (ban) return [{ type: 'illegal', idx, reason: 'forbidden', ban: BAN_NAMES[ban] }];
    s.board[idx] = c; s.moves.push(idx);
    const ev = [{ type: 'place', idx, color: c, n: s.moves.length }];
    const lines = winLines(s.board, N, idx, c, s.rule);
    if (lines) {
      s.over = true; s.winner = c; s.reason = 'five'; s.winLines = lines;
      ev.push({ type: 'win', color: c, lines, reason: 'five' });
      return ev;
    }
    s.turn = 3 - c;
    const th = threatKind(s.board, N, idx, c, s.rule);
    if (th) ev.push({ type: 'threat', kind: th, color: c, idx });
    if (s.moves.length >= NN || (NN - s.moves.length <= 12 && !hasLegal(s))) {
      s.over = true; s.winner = EMPTY; s.reason = 'draw';
      ev.push({ type: 'draw' });
    }
    return ev;
  }
  // 행동 하나 = 칸 번호(0 ~ size²-1) 또는 RESIGN
  function step(s, a) { return a === RESIGN ? resign(s, s.turn) : play(s, a); }
  // 아무 때나 color 쪽이 기권 (상대 차례여도 됨: AI 가 생각 중일 때 · 나중에 온라인 상대)
  function resign(s, color) {
    if (s.over) return [{ type: 'illegal', idx: RESIGN, reason: 'over' }];
    if (color !== BLACK && color !== WHITE) color = s.turn;
    s.over = true; s.winner = 3 - color; s.reason = 'resign'; s.winLines = [];
    return [{ type: 'resign', color }, { type: 'win', color: 3 - color, lines: [], reason: 'resign' }];
  }
  // 한 수 무르기 (기권으로 끝났으면 기권만 취소)
  function undo(s) {
    if (s.over && s.reason === 'resign') { s.over = false; s.winner = EMPTY; s.reason = ''; return [{ type: 'unresign' }]; }
    if (!s.moves.length) return [];
    const idx = s.moves.pop(), c = s.board[idx];
    s.board[idx] = EMPTY; s.turn = c; s.over = false; s.winner = EMPTY; s.reason = ''; s.winLines = [];
    return [{ type: 'undo', idx, color: c, n: s.moves.length + 1 }];
  }
  const terminal = s => s.over;
  const lastMove = s => s.moves.length ? s.moves[s.moves.length - 1] : -1;
  const ACTIONS = s => s.size * s.size;      // 행동 수 (칸 번호 0 ~ size²-1, 기권 RESIGN 은 따로)
  // 둔 쪽 입장의 보상: 이기면 1 · 지면 -1 · 무승부·진행 중 0 (강화학습용)
  const reward = (s, color) => !s.over || !s.winner ? 0 : s.winner === color ? 1 : -1;

  // ── 학습용 입력 · 대칭 ───────────────────────────────────────
  // 4장 × size² : [0] 둘 차례 쪽 돌 · [1] 상대 돌 · [2] 흑 차례면 전부 1 · [3] 마지막 수 한 칸
  function planes(s) {
    const NN = s.size * s.size, out = new Float32Array(4 * NN), me = s.turn, op = 3 - me;
    for (let i = 0; i < NN; i++) { const v = s.board[i]; if (v === me) out[i] = 1; else if (v === op) out[NN + i] = 1; }
    if (me === BLACK) out.fill(1, 2 * NN, 3 * NN);
    const lm = lastMove(s); if (lm >= 0) out[3 * NN + lm] = 1;
    return out;
  }
  // 대칭 8가지: k&4 이면 좌우 뒤집고, 그다음 (k&3)번 90° 돌림
  function symXY(x, y, k, N) {
    if (k & 4) x = N - 1 - x;
    for (let r = k & 3; r > 0; r--) { const t = x; x = N - 1 - y; y = t; }
    return [x, y];
  }
  function symIdx(idx, k, N) { N = N || 15; const x = idx % N, p = symXY(x, (idx - x) / N, k, N); return p[1] * N + p[0]; }
  function symInv(k) { return k & 4 ? k : (4 - k) & 3; }   // 뒤집기가 든 변환은 자기 자신이 역변환
  // 칸 단위 배열(여러 장 이어 붙인 것도 됨)을 대칭 변환
  function symArray(arr, k, N) {
    N = N || 15; const NN = N * N, out = new arr.constructor(arr.length);
    const map = new Int32Array(NN); for (let i = 0; i < NN; i++) map[i] = symIdx(i, k, N);
    for (let p = 0; p + NN <= arr.length; p += NN) for (let i = 0; i < NN; i++) out[p + map[i]] = arr[p + i];
    return out;
  }

  // ── 기보 ──────────────────────────────────────────────────
  // 한 줄 형식: "<규칙 글자><크기>:<수들>[=<결과>]"   예) "S15:hhigjg=B5"
  //  규칙 글자 S 쌍삼 금지 · R 렌주 · F 자유. 수 하나 = x, y 를 a(0)부터 두 글자. 결과 = B/W/D + 5(다섯)·r(기권)·d(무승부)
  const LET = 'abcdefghijklmnopqrstuvwxyz';
  function encode(s) {
    let out = (RULE_CH[s.rule] || 'S') + s.size + ':';
    for (const m of s.moves) out += LET[m % s.size] + LET[(m / s.size) | 0];
    if (s.over) out += '=' + (s.winner === BLACK ? 'B' : s.winner === WHITE ? 'W' : 'D') + (s.reason === 'resign' ? 'r' : s.reason === 'draw' ? 'd' : '5');
    return out;
  }
  function decode(str) {
    const m = /^([SRF])(\d+):([a-z]*)(?:=([BWD])([5rd]))?$/.exec(String(str || '').trim());
    if (!m) return null;
    const size = +m[2], rule = { S: 'standard', R: 'renju', F: 'free' }[m[1]], moves = [];
    if (m[3].length % 2) return null;
    for (let i = 0; i < m[3].length; i += 2) {
      const x = LET.indexOf(m[3][i]), y = LET.indexOf(m[3][i + 1]);
      if (x >= size || y >= size) return null;
      moves.push(y * size + x);
    }
    return { rule, size, moves, winner: m[4] ? { B: BLACK, W: WHITE, D: EMPTY }[m[4]] : null, reason: m[5] ? { 5: 'five', r: 'resign', d: 'draw' }[m[5]] : null };
  }
  // 기보 → 상태 (수마다 규칙 검사, 틀린 기보면 null)
  function fromRecord(str) {
    const r = decode(str); if (!r) return null;
    const s = create(r.size, r.rule);
    for (const mv of r.moves) { const ev = play(s, mv); if (ev[0].type === 'illegal') return null; }
    if (r.reason === 'resign' && !s.over) resign(s, r.winner === BLACK ? WHITE : r.winner === WHITE ? BLACK : s.turn);
    return s;
  }
  // 사람이 읽는 좌표: 열 A~O, 줄 1~15 (아래가 1) — 가운데 = H8
  function coordName(idx, N) { N = N || 15; const x = idx % N, y = (idx - x) / N; return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[x] + (N - y); }

  // 상태 지문 (결정성 확인용 32비트 FNV-1a)
  function hash(s) {
    let h = 0x811c9dc5;
    const mix = v => { h ^= v & 0xff; h = Math.imul(h, 0x01000193); };
    for (let i = 0; i < s.board.length; i++) mix(s.board[i]);
    mix(s.turn); mix(s.over ? 1 : 0); mix(s.winner); mix(s.moves.length);
    for (const m of s.moves) { mix(m); mix(m >> 8); }
    for (let k = 0; k < 32; k += 8) mix(s.rng >>> k);
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  const API = {
    EMPTY, BLACK, WHITE, RESIGN, RULES, DX, DY,
    exactFive, restricted, bans,
    create, clone, toJSON, fromJSON, rand, hash,
    play, step, resign, undo, terminal, lastMove, ACTIONS, reward,
    legalMask, legalMoves, forbiddenMask, isForbidden, forbiddenReason, hasLegal,
    planes, obs: planes, symXY, symIdx, symInv, symArray,
    encode, decode, fromRecord, coordName,
    // 낮은 단계 (AI·시험용): 판 배열에 바로 씀
    forbiddenAt, winLines, runThrough, completions, fourCount, threatKind,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Omok = API;
})(this);

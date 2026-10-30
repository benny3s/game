/* 장기 규칙 (core.js) — 결정적 (난수 없음) · Node·브라우저·워커 공용 UMD (브라우저는 전역 JanggiCore)
   판: 9줄 × 10줄 = 90 자리, 자리 번호 sq = 줄(r) × 9 + 칸(f). r = 0 이 위(한의 끝줄), r = 9 가 아래(초의 끝줄)
   편: 0 = 초(楚, 먼저 둠, 아래) · 1 = 한(漢, 뒤, 위). 기물 = 종류 | 편 << 3  (궁1 사2 상3 마4 차5 포6 졸7)
   수 글자 (한국 기보식): 출발 '79' + 도착 '78' → '7978' (앞 숫자 = 위에서 몇째 줄(10째 줄은 0), 뒤 = 왼쪽에서 몇째 칸, 초 쪽에서 본 판)
     'pass' = 한수 쉼 · 'h=2' / 'c=0' = 한 / 초의 상차림 고르기 (판 시작 전, 한이 먼저)
   상태 s = { rules, b(Int8Array 90), turn, phase: 'setup'|'play', moves[], over, winner(0|1|null), reason, … }
   규칙 판단은 neil-armstrong-fig/janggi (MIT, engine/) 의 규칙 정리를 참고해 이 배열 구조로 새로 씀 — THIRD_PARTY.md */
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.JanggiCore = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const COLS = 9, ROWS = 10, NSQ = 90;
  const CHO = 0, HAN = 1;
  const K = 1, A = 2, E = 3, H = 4, R = 5, C = 6, P = 7;
  const SIDE = ['초', '한'];
  const NAME = ['', '궁', '사', '상', '마', '차', '포', '졸'];
  const VAL = [0, 0, 3, 3, 5, 13, 7, 2];            // 점수: 차13 포7 마5 상3 사3 졸2 (궁 0)
  const DEOM = 1.5;                                   // 한(후수)이 받는 덤
  const pieceName = (t, side) => (t === P && side === HAN ? '병' : NAME[t]);
  // 한자: 궁은 '將·帥'(기본) 또는 '楚·漢'
  const HANJA = ['', '', '士', '象', '馬', '車', '包', ''];
  const glyph = (t, side, style) => t === K ? (style === 'chohan' ? (side === HAN ? '漢' : '楚') : (side === HAN ? '帥' : '將')) : t === P ? (side === HAN ? '兵' : '卒') : HANJA[t];
  const sideOf = p => p >> 3, typeOf = p => p & 7, mk = (t, side) => t | (side << 3);
  const rowOf = s => (s / 9) | 0, colOf = s => s % 9;
  const inB = (r, f) => r >= 0 && r < ROWS && f >= 0 && f < COLS;

  // ════════ 판 모양 (미리 계산) ════════
  // 궁성: 한 = 위 0~2줄, 초 = 아래 7~9줄, 가운데 4~6칸(f 3~5). 대각선은 그어진 곳만 (가운데 4방향, 모서리 1방향, 변 가운데 없음)
  const PAL = new Int8Array(NSQ).fill(-1);
  for (let r = 0; r < 3; r++) for (let f = 3; f < 6; f++) PAL[r * 9 + f] = HAN;
  for (let r = 7; r < 10; r++) for (let f = 3; f < 6; f++) PAL[r * 9 + f] = CHO;
  const CENTER = [8 * 9 + 4, 1 * 9 + 4];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function diagSteps(s) {
    const pal = PAL[s]; if (pal < 0) return [];
    const c = CENTER[pal], dr = rowOf(s) - rowOf(c), df = colOf(s) - colOf(c);
    if (!dr && !df) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    if (!dr || !df) return [];
    return [[-dr, -df]];
  }
  const RAYS = [], KSTEP = [], HORSE = [], ELEPH = [], PAWN = [[], []];
  for (let s = 0; s < NSQ; s++) {
    const r = rowOf(s), f = colOf(s);
    const rays = [];
    for (const [dr, df] of ORTH) { const ray = []; for (let rr = r + dr, ff = f + df; inB(rr, ff); rr += dr, ff += df) ray.push(rr * 9 + ff); if (ray.length) rays.push(ray); }
    for (const [dr, df] of diagSteps(s)) { const ray = []; for (let rr = r + dr, ff = f + df; inB(rr, ff) && PAL[rr * 9 + ff] === PAL[s]; rr += dr, ff += df) ray.push(rr * 9 + ff); if (ray.length) rays.push(ray); }
    RAYS[s] = rays;
    const ks = [];
    if (PAL[s] >= 0) for (const [dr, df] of ORTH.concat(diagSteps(s))) { const rr = r + dr, ff = f + df; if (inB(rr, ff) && PAL[rr * 9 + ff] === PAL[s]) ks.push(rr * 9 + ff); }
    KSTEP[s] = ks;
    const hs = [], es = [];
    for (const [dr, df] of ORTH) {
      const lr = r + dr, lf = f + df; if (!inB(lr, lf)) continue;
      const diags = dr ? [[dr, -1], [dr, 1]] : [[-1, df], [1, df]];
      for (const [gr, gf] of diags) {
        if (inB(lr + gr, lf + gf)) hs.push([lr * 9 + lf, (lr + gr) * 9 + lf + gf]);
        if (inB(lr + 2 * gr, lf + 2 * gf)) es.push([lr * 9 + lf, (lr + gr) * 9 + lf + gf, (lr + 2 * gr) * 9 + lf + 2 * gf]);
      }
    }
    HORSE[s] = hs; ELEPH[s] = es;
    for (const side of [CHO, HAN]) {
      const fw = side === CHO ? -1 : 1, ps = [];
      for (const [dr, df] of [[fw, 0], [0, -1], [0, 1]]) if (inB(r + dr, f + df)) ps.push((r + dr) * 9 + f + df);
      if (PAL[s] === 1 - side) for (const [dr, df] of diagSteps(s)) if (dr === fw && inB(r + dr, f + df)) ps.push((r + dr) * 9 + f + df);
      PAWN[side][s] = ps;
    }
  }
  // 거꾸로 표 (공격 확인용): 이 자리를 노리는 마·상·졸이 설 수 있는 곳
  const HORSE_REV = [], ELEPH_REV = [], PAWN_REV = [[], []];
  for (let s = 0; s < NSQ; s++) { HORSE_REV[s] = []; ELEPH_REV[s] = []; PAWN_REV[0][s] = []; PAWN_REV[1][s] = []; }
  for (let s = 0; s < NSQ; s++) {
    for (const [leg, d] of HORSE[s]) HORSE_REV[d].push([s, leg]);
    for (const [l1, l2, d] of ELEPH[s]) ELEPH_REV[d].push([s, l1, l2]);
    for (const side of [CHO, HAN]) for (const d of PAWN[side][s]) PAWN_REV[side][d].push(s);
  }

  // ════════ 수 만들기 · 공격 ════════
  // 수 정수 m = 출발 << 7 | 도착
  function kingSq(b, side) {
    const k = mk(K, side), r0 = side === CHO ? 7 : 0;
    for (let r = r0; r < r0 + 3; r++) for (let f = 3; f < 6; f++) if (b[r * 9 + f] === k) return r * 9 + f;
    return -1;
  }
  // by 편이 자리 t 를 잡을 수 있나 (그 자리에 무엇이 있든 — 포는 포를 못 잡음)
  function attacked(b, t, by) {
    const rays = RAYS[t], tc = (b[t] & 7) === C, rk = mk(R, by), ck = mk(C, by);
    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i], n = ray.length;
      let j = 0, p = 0;
      for (; j < n; j++) { p = b[ray[j]]; if (p) break; }
      if (j === n) continue;
      if (p === rk) return true;
      if ((p & 7) === C || tc) continue;                 // 포는 다리가 될 수 없고, 포는 포를 못 잡음
      for (j++; j < n; j++) { p = b[ray[j]]; if (p) { if (p === ck) return true; break; } }
    }
    const hk = mk(H, by), hr = HORSE_REV[t];
    for (let i = 0; i < hr.length; i++) if (b[hr[i][0]] === hk && !b[hr[i][1]]) return true;
    const ek = mk(E, by), er = ELEPH_REV[t];
    for (let i = 0; i < er.length; i++) if (b[er[i][0]] === ek && !b[er[i][1]] && !b[er[i][2]]) return true;
    const pk = mk(P, by), pr = PAWN_REV[by][t];
    for (let i = 0; i < pr.length; i++) if (b[pr[i]] === pk) return true;
    if (PAL[t] === by) { const kk = mk(K, by), ak = mk(A, by), ks = KSTEP[t]; for (let i = 0; i < ks.length; i++) { const p = b[ks[i]]; if (p === kk || p === ak) return true; } }
    return false;
  }
  // by 편에서 t 를 노리는 기물 자리 모두 (선생님 · 쉬운 판단용)
  function attackers(b, t, by) {
    const out = [], rays = RAYS[t], tc = (b[t] & 7) === C, rk = mk(R, by), ck = mk(C, by);
    for (const ray of rays) {
      let j = 0, p = 0;
      for (; j < ray.length; j++) { p = b[ray[j]]; if (p) break; }
      if (j === ray.length) continue;
      if (p === rk) { out.push(ray[j]); continue; }
      if ((p & 7) === C || tc) continue;
      for (j++; j < ray.length; j++) { p = b[ray[j]]; if (p) { if (p === ck) out.push(ray[j]); break; } }
    }
    for (const [s, leg] of HORSE_REV[t]) if (b[s] === mk(H, by) && !b[leg]) out.push(s);
    for (const [s, l1, l2] of ELEPH_REV[t]) if (b[s] === mk(E, by) && !b[l1] && !b[l2]) out.push(s);
    for (const s of PAWN_REV[by][t]) if (b[s] === mk(P, by)) out.push(s);
    if (PAL[t] === by) for (const s of KSTEP[t]) if (b[s] === mk(K, by) || b[s] === mk(A, by)) out.push(s);
    return out;
  }
  const inCheck = (b, side) => { const k = kingSq(b, side); return k >= 0 && attacked(b, k, side ^ 1); };
  // 기물 규칙만 본 수 (내 궁이 위험해지는지는 안 봄). caps = 잡는 수만
  function genPseudo(b, side, out, caps) {
    for (let s = 0; s < NSQ; s++) {
      const p = b[s]; if (!p || (p >> 3) !== side) continue;
      const fr = s << 7;
      switch (p & 7) {
        case K: case A: { const ks = KSTEP[s]; for (let i = 0; i < ks.length; i++) { const q = b[ks[i]]; if (q ? (q >> 3) !== side : !caps) out.push(fr | ks[i]); } break; }
        case P: { const ps = PAWN[side][s]; for (let i = 0; i < ps.length; i++) { const q = b[ps[i]]; if (q ? (q >> 3) !== side : !caps) out.push(fr | ps[i]); } break; }
        case H: { const hs = HORSE[s]; for (let i = 0; i < hs.length; i++) { if (b[hs[i][0]]) continue; const d = hs[i][1], q = b[d]; if (q ? (q >> 3) !== side : !caps) out.push(fr | d); } break; }
        case E: { const es = ELEPH[s]; for (let i = 0; i < es.length; i++) { const e = es[i]; if (b[e[0]] || b[e[1]]) continue; const q = b[e[2]]; if (q ? (q >> 3) !== side : !caps) out.push(fr | e[2]); } break; }
        case R: { const rays = RAYS[s]; for (let i = 0; i < rays.length; i++) { const ray = rays[i]; for (let j = 0; j < ray.length; j++) { const q = b[ray[j]]; if (!q) { if (!caps) out.push(fr | ray[j]); continue; } if ((q >> 3) !== side) out.push(fr | ray[j]); break; } } break; }
        case C: {
          const rays = RAYS[s];
          for (let i = 0; i < rays.length; i++) {
            const ray = rays[i]; let j = 0;
            for (; j < ray.length; j++) if (b[ray[j]]) break;
            if (j === ray.length || (b[ray[j]] & 7) === C) continue;      // 넘을 다리가 없거나 다리가 포
            for (j++; j < ray.length; j++) {
              const q = b[ray[j]];
              if (!q) { if (!caps) out.push(fr | ray[j]); continue; }
              if ((q >> 3) !== side && (q & 7) !== C) out.push(fr | ray[j]);
              break;
            }
          }
          break;
        }
      }
    }
    return out;
  }
  // 둔 뒤 내 궁이 공격받지 않는 수만
  function genLegal(b, side, caps) {
    const ps = genPseudo(b, side, [], caps), out = [], k = kingSq(b, side);
    for (let i = 0; i < ps.length; i++) {
      const m = ps[i], f = m >> 7, t = m & 127, cap = b[t];
      b[t] = b[f]; b[f] = 0;
      const ks = (b[t] & 7) === K ? t : k;
      if (ks < 0 || !attacked(b, ks, side ^ 1)) out.push(m);
      b[f] = b[t]; b[t] = cap;
    }
    return out;
  }
  // 빅장: 두 궁이 한 줄에서 사이에 아무것도 없이 마주 봄
  function facing(b) {
    const kc = kingSq(b, CHO), kh = kingSq(b, HAN);
    if (kc < 0 || kh < 0 || kc % 9 !== kh % 9) return false;
    for (let s = kh + 9; s < kc; s += 9) if (b[s]) return false;
    return true;
  }
  function material(b, side) { let v = 0; for (let s = 0; s < NSQ; s++) { const p = b[s]; if (p && (p >> 3) === side) v += VAL[p & 7]; } return v; }

  // ════════ 지문 (같은 국면 찾기) — 정해진 씨앗의 난수표 ════════
  const ZL = new Int32Array(16 * NSQ), ZH = new Int32Array(16 * NSQ);
  (function () { let a = 0x2545F491; const nx = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (t ^ (t >>> 14)) | 0; }; for (let i = 0; i < ZL.length; i++) { ZL[i] = nx(); ZH[i] = nx(); } })();
  const ZSL = 0x5bd1e995 | 0, ZSH = 0x1b873593 | 0;
  function hashOf(b, turn) {
    let lo = turn ? ZSL : 0, hi = turn ? ZSH : 0;
    for (let s = 0; s < NSQ; s++) { const p = b[s]; if (p) { lo ^= ZL[p * NSQ + s]; hi ^= ZH[p * NSQ + s]; } }
    return (hi & 0xfffff) * 4294967296 + (lo >>> 0);
  }

  // ════════ 상차림 ════════
  // 이름은 그 사람 자리에서 왼쪽부터 (b·c·g·h 칸): 마상마상 · 상마상마 · 마상상마 · 상마마상
  const SETUPS = [
    { id: 0, name: '마상마상', desc: '왼쪽은 마가, 오른쪽은 상이 바깥 — 한쪽으로 힘을 모아요' },
    { id: 1, name: '상마상마', desc: '왼쪽은 상이, 오른쪽은 마가 바깥 — 마상마상의 거울' },
    { id: 2, name: '마상상마', desc: '마 둘이 바깥, 상 둘이 궁성 옆 — 마가 빨리 나가요' },
    { id: 3, name: '상마마상', desc: '상 둘이 바깥, 마 둘이 궁성 옆 — 궁성을 단단히 지켜요' },
  ];
  const DEFAULT_SETUP = 2;
  function placeSetup(b, side, idx) {
    const nm = SETUPS[idx].name, t = ch => (ch === '마' ? H : E);
    const files = side === CHO ? [1, 2, 6, 7] : [7, 6, 2, 1], r = side === CHO ? 9 : 0;
    for (let i = 0; i < 4; i++) b[r * 9 + files[i]] = mk(t(nm[i]), side);
  }
  function startBoard(sc, sh) {
    const b = new Int8Array(NSQ);
    for (const side of [CHO, HAN]) {
      const back = side === CHO ? 9 : 0, pal = side === CHO ? 8 : 1, can = side === CHO ? 7 : 2, sol = side === CHO ? 6 : 3;
      b[back * 9 + 0] = b[back * 9 + 8] = mk(R, side);
      b[back * 9 + 3] = b[back * 9 + 5] = mk(A, side);
      b[pal * 9 + 4] = mk(K, side);
      b[can * 9 + 1] = b[can * 9 + 7] = mk(C, side);
      for (const f of [0, 2, 4, 6, 8]) b[sol * 9 + f] = mk(P, side);
    }
    placeSetup(b, CHO, sc); placeSetup(b, HAN, sh);
    return b;
  }

  // ════════ 규칙 고르기 ════════
  const RULE_DEFS = [
    { k: 'bik', name: '빅장', t: 'opt', d: 'points', opts: [['points', '점수로 승패'], ['draw', '무승부'], ['off', '없음']], help: '두 궁이 마주 보면(빅장) 상대가 풀어야 해요. 못 풀면 판이 끝나요' },
    { k: 'pass', name: '한수 쉼', t: 'bool', d: true, opts: [[true, '언제나'], [false, '둘 곳 없을 때만']], help: '장군이 아닐 때 한 번 쉬어요. 둘 다 연달아 쉬면 점수로 끝나요' },
    { k: 'limit', name: '수 제한', t: 'opt', d: 200, opts: [[150, '150수'], [200, '200수'], [300, '300수']], help: '이만큼 두면 점수로 승패를 가려요' },
  ];
  function normRules(x) {
    const r = {}; x = x && typeof x === 'object' ? x : {};
    for (const d of RULE_DEFS) {
      const v = x[d.k];
      if (d.t === 'bool') r[d.k] = v == null ? d.d : !(v === false || v === 'false' || v === 0 || v === '0');
      else { const hit = d.opts.find(o => String(o[0]) === String(v)); r[d.k] = hit ? hit[0] : d.d; }
    }
    return r;
  }
  const ruleText = r => { r = normRules(r); return `빅장 ${RULE_DEFS[0].opts.find(o => o[0] === r.bik)[1]} · 한수 쉼 ${r.pass ? '언제나' : '둘 곳 없을 때만'} · ${r.limit}수 제한`; };

  // ════════ 글자 ════════
  const sqName = s => `${(rowOf(s) + 1) % 10}${colOf(s) + 1}`;
  function parseSq(t) { if (!/^[0-9][1-9]$/.test(t)) return -1; const r = t[0] === '0' ? 9 : +t[0] - 1; return r * 9 + (+t[1] - 1); }
  const uciOf = m => sqName(m >> 7) + sqName(m & 127);
  function parseMove(u) { if (typeof u !== 'string' || u.length !== 4) return -1; const f = parseSq(u.slice(0, 2)), t = parseSq(u.slice(2)); return f < 0 || t < 0 ? -1 : (f << 7) | t; }
  // FEN 비슷한 판 글자: 위(한 끝줄)부터 '/' 로, 숫자 = 빈칸, 대문자 초 · 소문자 한 (K A E H R C P), 끝에 ' c' / ' h' (둘 차례)
  const FL = ' KAEHRCP';
  function toFen(b, turn) {
    const rows = [];
    for (let r = 0; r < ROWS; r++) { let t = '', e = 0; for (let f = 0; f < COLS; f++) { const p = b[r * 9 + f]; if (!p) { e++; continue; } if (e) { t += e; e = 0; } const ch = FL[p & 7]; t += (p >> 3) ? ch.toLowerCase() : ch; } if (e) t += e; rows.push(t); }
    return rows.join('/') + ' ' + (turn ? 'h' : 'c');
  }
  function fromFen(fen) {
    const [board, side] = String(fen).trim().split(/\s+/), rows = board.split('/');
    if (rows.length !== ROWS) throw new Error('fen rows');
    const b = new Int8Array(NSQ);
    rows.forEach((row, r) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) { f += +ch; continue; } const t = FL.indexOf(ch.toUpperCase()); if (t < 1 || f >= COLS) throw new Error('fen piece ' + ch); b[r * 9 + f] = mk(t, ch === ch.toUpperCase() ? CHO : HAN); f++; } if (f !== COLS) throw new Error('fen cols ' + r); });
    return { b, turn: side === 'h' ? HAN : CHO };
  }

  // ════════ 대국 ════════
  // create({ rules, setup: [초, 한] (주면 바로 시작), fen (시험·문제용 판) })
  function create(o) {
    o = o || {};
    const s = { rules: normRules(o.rules), fen: o.fen || null, setup: [-1, -1], b: null, turn: HAN, phase: 'setup', moves: [], hist: [], keys: [],
      passes: 0, bik: false, plies: 0, over: false, winner: null, reason: null, last: null, check: false };
    if (o.fen) { const x = fromFen(o.fen); s.b = x.b; s.turn = x.turn; s.phase = 'play'; s.setup = [-2, -2]; s.keys.push(hashOf(s.b, s.turn)); s.check = inCheck(s.b, s.turn); }
    else {
      s.b = startBoard(DEFAULT_SETUP, DEFAULT_SETUP);
      if (o.setup) { step(s, 'h=' + (o.setup[1] | 0)); step(s, 'c=' + (o.setup[0] | 0)); }
    }
    return s;
  }
  const turn = s => s.turn;
  function legalInts(s) {
    if (s.over || s.phase !== 'play') return [];
    return genLegal(s.b, s.turn);
  }
  const canPass = (s, L) => !s.over && s.phase === 'play' && !s.check && (s.rules.pass || !(L || genLegal(s.b, s.turn)).length);
  // 둘 수 있는 것 (from 을 주면 그 자리 기물만): [{ uci, from, to, piece, captured }] · 상차림 [{ uci:'h=0', setup:0 }] · 한수 쉼 { uci:'pass', pass:true }
  function legal(s, from) {
    if (s.over) return [];
    if (s.phase === 'setup') return from != null ? [] : SETUPS.map(x => ({ uci: (s.turn === HAN ? 'h=' : 'c=') + x.id, setup: x.id }));
    const fs = typeof from === 'string' ? parseSq(from) : from;
    const L = genLegal(s.b, s.turn), out = [];
    for (const m of L) { const f = m >> 7, t = m & 127; if (fs != null && f !== fs) continue; out.push({ uci: uciOf(m), from: f, to: t, piece: s.b[f] & 7, captured: s.b[t] & 7 }); }
    if (fs == null && canPass(s, L)) out.push({ uci: 'pass', pass: true });
    return out;
  }
  function end(s, winner, reason) {
    s.over = true; s.winner = winner; s.reason = reason;
    return { type: 'end', winner, reason, score: score(s) };
  }
  function score(s) { return { cho: material(s.b, CHO), han: material(s.b, HAN) + DEOM }; }
  const pointsWinner = s => { const sc = score(s); return sc.cho > sc.han ? CHO : HAN; };
  function endByPoints(s, reason) { return end(s, pointsWinner(s), reason); }

  // 한 수: 'rfrf' · 'pass' · 'h=2' → 사건 목록 (첫 사건이 illegal 이면 아무것도 안 바뀜)
  function step(s, mv) {
    if (s.over) return [{ type: 'illegal', reason: 'over' }];
    if (typeof mv !== 'string') return [{ type: 'illegal', reason: 'bad' }];
    const ev = [];
    if (s.phase === 'setup') {
      const m = /^([ch])=([0-3])$/.exec(mv);
      if (!m || (m[1] === 'h' ? HAN : CHO) !== s.turn) return [{ type: 'illegal', reason: 'setup' }];
      const side = s.turn, idx = +m[2];
      s.setup[side] = idx; placeSetup(s.b, side, idx);
      s.moves.push(mv);
      const info = { type: 'setup', side, idx, uci: mv, n: s.moves.length };
      s.hist.push(info); ev.push(info);
      if (side === HAN) s.turn = CHO;
      else { s.phase = 'play'; s.turn = CHO; s.keys.push(hashOf(s.b, s.turn)); s.check = inCheck(s.b, s.turn); ev.push({ type: 'start' }); }
      return ev;
    }
    const side = s.turn, b = s.b, wasCheck = s.check;
    let info;
    if (mv === 'pass') {
      if (!canPass(s)) return [{ type: 'illegal', reason: 'pass' }];
      s.passes++;
      info = { type: 'move', uci: 'pass', pass: true, side, n: s.moves.length + 1 };
    } else {
      const m = parseMove(mv);
      if (m < 0 || !genLegal(b, side).includes(m)) return [{ type: 'illegal', reason: 'illegal' }];
      const f = m >> 7, t = m & 127, piece = b[f] & 7, cap = b[t] & 7;
      b[t] = b[f]; b[f] = 0;
      s.passes = 0;
      info = { type: 'move', uci: mv, from: f, to: t, side, piece, captured: cap, n: s.moves.length + 1 };
    }
    s.moves.push(mv); s.plies++;
    s.turn = side ^ 1;
    s.check = inCheck(b, s.turn);
    info.check = s.check; info.escaped = wasCheck;
    s.last = info; s.hist.push(info); ev.push(info);
    if (s.check) ev.push({ type: 'check', side: s.turn });
    const key = hashOf(b, s.turn); s.keys.push(key);
    // 끝 판정: 외통 → 빅장 → 같은 국면 세 번 → 서로 한수 쉼 → 수 제한
    if (s.check && !genLegal(b, s.turn).length) { ev.push(end(s, side, 'mate')); return ev; }
    if (s.rules.bik !== 'off') {
      const fc = info.pass ? (s.bik && facing(b)) : facing(b);
      if (s.bik && fc) { ev.push(s.rules.bik === 'draw' ? end(s, null, 'bikjang') : endByPoints(s, 'bikjang')); return ev; }
      s.bik = fc;
      if (fc) { info.bik = true; ev.push({ type: 'bikjang', by: side }); }
    }
    let rep = 0; for (let i = 0; i < s.keys.length; i++) if (s.keys[i] === key) rep++;
    if (rep >= 3) { ev.push(endByPoints(s, 'repeat')); return ev; }
    if (s.passes >= 2) { ev.push(endByPoints(s, 'pass2')); return ev; }
    if (s.rules.limit && s.plies >= s.rules.limit) { ev.push(endByPoints(s, 'limit')); return ev; }
    return ev;
  }
  function resign(s, side) { if (s.over) return [{ type: 'illegal', reason: 'over' }]; return [end(s, side ^ 1, 'resign')]; }
  // 무르기 n 수 (처음부터 다시 둬서 만듦 — 판이 짧아 충분히 빠름)
  function undo(s, n = 1) {
    const k = Math.min(n, s.moves.length), t = fromJSON({ rules: s.rules, fen: s.fen, moves: s.moves.slice(0, s.moves.length - k) });
    Object.assign(s, t);
    return k;
  }
  const toJSON = s => ({ rules: s.rules, fen: s.fen || undefined, moves: s.moves.slice(), end: s.over && s.reason === 'resign' ? { winner: s.winner, reason: s.reason } : undefined });
  function fromJSON(j) {
    j = j || {};
    const s = create({ rules: j.rules, fen: j.fen || null });
    for (const u of j.moves || []) if (step(s, u)[0].type === 'illegal') break;
    if (j.end && !s.over && j.end.reason === 'resign') end(s, j.end.winner, 'resign');
    return s;
  }
  function fastClone(s) {
    return Object.assign({}, s, { b: s.b.slice(), setup: s.setup.slice(), moves: s.moves.slice(), hist: s.hist.slice(), keys: s.keys.slice() });
  }
  // 화면용 판 90칸: { sq, type, side, tent(상차림 고르는 중이라 아직 안 정해짐) } | null
  function board(s) {
    const out = [];
    for (let sq = 0; sq < NSQ; sq++) {
      const p = s.b[sq];
      if (!p) { out.push(null); continue; }
      const side = p >> 3, t = p & 7, r = rowOf(sq), f = colOf(sq);
      const tent = s.phase === 'setup' && s.setup[side] < 0 && (t === H || t === E) && r === (side === CHO ? 9 : 0);
      out.push({ sq, type: t, side, tent });
    }
    return out;
  }
  // 상차림 미리 보기 (고르는 사람 화면에서만): side 의 상차림을 idx 로 바꾼 판
  function previewBoard(s, side, idx) { const t = fastClone(s); placeSetup(t.b, side, idx); t.setup[side] = idx; return board(t); }
  const status = s => ({ turn: s.turn, phase: s.phase, check: s.check, over: s.over, winner: s.winner, reason: s.reason, bik: s.bik, passes: s.passes, plies: s.plies, score: score(s) });
  const REASON = { mate: '외통', resign: '기권', bikjang: '빅장', repeat: '같은 국면 세 번', pass2: '서로 한수 쉼', limit: '수 제한' };
  // 기보 글자: '79졸78' · '한수 쉼' · '상차림 마상상마'
  function notation(h) {
    if (!h) return '';
    if (h.type === 'setup') return `상차림 ${SETUPS[h.idx].name}`;
    if (h.pass) return '한수 쉼';
    return sqName(h.from) + pieceName(h.piece, h.side) + sqName(h.to);
  }
  const JOSA = { 궁: 1, 상: 1, 졸: 1, 병: 1 };
  const eul = n => n + (JOSA[n] ? '을' : '를');
  function describe(h) {
    if (!h) return '';
    if (h.type === 'setup') return `${SIDE[h.side]} 상차림: ${SETUPS[h.idx].name}`;
    if (h.pass) return `${SIDE[h.side]} 한수 쉼`;
    let t = `${SIDE[h.side]} ${pieceName(h.piece, h.side)} ${sqName(h.from)}→${sqName(h.to)}`;
    if (h.captured) t += ` · ${eul(pieceName(h.captured, h.side ^ 1))} 잡음`;
    if (h.check) t += ' · 장군!';
    if (h.bik) t += ' · 빅장!';
    return t;
  }
  // 잡은 기물 { 0: [초가 잡은 한 기물 종류…], 1: [...] }
  function captured(s) {
    const out = [[], []];
    for (const h of s.hist) if (h.type === 'move' && h.captured) out[h.side].push(h.captured);
    const ord = [R, C, H, E, A, P];
    out[0].sort((a, b) => ord.indexOf(a) - ord.indexOf(b)); out[1].sort((a, b) => ord.indexOf(a) - ord.indexOf(b));
    return out;
  }
  // 친구에게 보여 줄 기보 글
  function kiboText(s, names) {
    const L = [`[장기 · ${new Date().toISOString().slice(0, 10)}]`, `초: ${(names && names[0]) || ''} · 한: ${(names && names[1]) || ''}`, ruleText(s.rules)];
    let n = 0;
    for (const h of s.hist) { if (h.type === 'setup') L.push(`${SIDE[h.side]} 상차림 ${SETUPS[h.idx].name}`); else L.push(`${++n}. ${SIDE[h.side]} ${notation(h)}${h.check ? ' 장군' : ''}`); }
    if (s.over) { const sc = score(s); L.push(`결과: ${s.winner == null ? '무승부' : SIDE[s.winner] + ' 승'} (${REASON[s.reason] || s.reason}) · 점수 초 ${sc.cho} : 한 ${sc.han}`); }
    return L.join('\n');
  }
  // 남에게 보여 줄 판 (장기는 숨긴 것이 없음 — 그대로)
  function view(s) {
    return { board: Array.from(s.b), turn: s.turn, phase: s.phase, setup: s.setup.slice(), moves: s.moves.slice(), rules: s.rules, check: s.check, bik: s.bik, passes: s.passes,
      plies: s.plies, over: s.over, winner: s.winner, reason: s.reason, score: score(s), fen: toFen(s.b, s.turn) };
  }

  // ════════ 학습(RL)용 ════════
  // 관찰: 90칸 × 18장 (내 기물 7 · 상대 기물 7 · 빅장 걸림 · 한수 쉼 셈 · 같은 국면 셈 · 수 진행), 늘 '지금 둘 쪽'이 아래(한 차례면 180° 돌림)
  const OBS_PLANES = 18, OBS_LEN = OBS_PLANES * NSQ;
  const flipSq = (sq, side) => (side === HAN ? NSQ - 1 - sq : sq);
  function obs(s) {
    const o = new Float32Array(OBS_LEN), me = s.turn;
    for (let sq = 0; sq < NSQ; sq++) { const p = s.b[sq]; if (!p) continue; const k = ((p >> 3) === me ? 0 : 7) + (p & 7) - 1; o[k * NSQ + flipSq(sq, me)] = 1; }
    const fill = (k, v) => { if (v) o.fill(v, k * NSQ, k * NSQ + NSQ); };
    fill(14, s.bik ? 1 : 0); fill(15, Math.min(1, s.passes / 2));
    const key = s.keys[s.keys.length - 1]; let rep = 0; for (const x of s.keys) if (x === key) rep++;
    fill(16, Math.min(1, (rep - 1) / 2)); fill(17, Math.min(1, s.plies / (s.rules.limit || 200)));
    return o;
  }
  // 행동 번호: 출발(90) × 도착(90) = 0..8099 (둘 쪽 기준으로 돌림) · 8100 한수 쉼 · 8101..8104 상차림
  const A_PASS = 8100, A_SETUP = 8101, N_ACTIONS = 8105;
  function moveIndex(uci, side) {
    if (uci === 'pass') return A_PASS;
    const m = /^[ch]=([0-3])$/.exec(uci); if (m) return A_SETUP + +m[1];
    const x = parseMove(uci); return flipSq(x >> 7, side) * NSQ + flipSq(x & 127, side);
  }
  function legalMask(s) { const m = new Uint8Array(N_ACTIONS); for (const x of legal(s)) m[moveIndex(x.uci, s.turn)] = 1; return m; }

  return {
    COLS, ROWS, NSQ, CHO, HAN, K, A, E, H, R, C, P, SIDE, NAME, VAL, DEOM, SETUPS, DEFAULT_SETUP, RULE_DEFS, REASON,
    pieceName, glyph, sideOf, typeOf, mk, rowOf, colOf, sqName, parseSq, uciOf, parseMove, toFen, fromFen,
    normRules, ruleText, create, turn, legal, step, resign, undo, toJSON, fromJSON, fastClone, board, previewBoard, status, score, pointsWinner,
    notation, describe, captured, kiboText, view, obs, OBS_PLANES, OBS_LEN, moveIndex, legalMask, A_PASS, A_SETUP, N_ACTIONS,
    // 엔진·시험용 낮은 층
    lo: { PAL, CENTER, RAYS, KSTEP, HORSE, ELEPH, PAWN, HORSE_REV, ELEPH_REV, PAWN_REV, kingSq, attacked, attackers, inCheck, genPseudo, genLegal, facing, material, hashOf, ZL, ZH, ZSL, ZSH, startBoard, placeSetup, diagSteps },
  };
});

/* 베니 서바이벌 · 3층 오목 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 X · 데스매치 (1:1) — 방송 규칙 설명 화면(웨이브 공식 클립)과 대조해 만듦
   · 육각 격자 판: 세로선 · 두 대각선이 만나는 점이 칸. 점 85개 (한 변 6점인 큰 육각형에서 여섯 꼭짓점을 뺀 모양)
   · 돌 25개씩. 기본 배치: 선공 1개 → 후공 2개 → 선공 2개 → 후공 1개. 정중앙과 내 돌에 이웃한 칸은 못 놓음
   · 선공부터 번갈아 한 번에 하나: ① 돌 놓기(빈 칸) ② 돌 이동(내 돌 중 맨 위 한 개를 이웃 칸으로 — 다른 돌 위에 쌓을 수 있음,
     3층까지, 원래 있던 칸보다 더 높이 쌓인 칸으로는 못 감)
   · 승리 셋 (위에서 본 모습 = 칸의 맨 위 돌 색깔): 오목(내 돌 5개 일직선, 6개 이상 이어지면 인정 안 됨) ·
     내 돌 5개가 3층 · 서로 이웃한 내 돌 3개가 3층. 동시에 이루면 그 턴을 둔 사람이 이김
   · 2라운드부터 선후공은 앞 라운드에서 진 쪽이 정함
   방송과 다른 점 · 우리가 정한 것 (방송 글에 없는 것)
   · 3판 2선승 (방송은 2라운드까지 보임 — 1:1 이라 2승이면 끝, 1:1 이면 3라운드) · 무승부 판은 다시 함 (최대 5판)
   · 턴 제한시간 없음 (방송은 30초 경고가 보임)
   · 움직일 돌이 하나도 없으면 그 판은 짐 · 150수가 지나도 못 가리면 무승부
   · 판 모양은 영상 화면의 선 · 점을 세어서 정함 (85칸) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).omok3 = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MEN = 25, CAPPLY = 150, WINV = 100000;

  // ── 판 모양 ───────────────────────────────────────────────
  // 칸 좌표 (q, y): q = 세로선 번호(−5~5), y = 위아래 반 칸 단위(아래로 +, 이웃한 세로선과는 ±1, 같은 선 이웃은 ±2)
  const PTS = [];
  for (let y = -10; y <= 10; y++) for (let q = -5; q <= 5; q++) {
    if ((((y % 2) + 2) % 2) !== (Math.abs(q) % 2)) continue;
    const aq = Math.abs(q), ay = Math.abs(y);
    if (Math.max(aq, (aq + ay) / 2) > 5) continue;
    if ((q === 0 && ay === 10) || (aq === 5 && ay === 5)) continue;          // 여섯 꼭짓점은 없음
    PTS.push([q, y]);
  }
  const NP = PTS.length;
  const IDX = {};
  PTS.forEach(([q, y], i) => { IDX[q + "," + y] = i; });
  const at = (q, y) => { const v = IDX[q + "," + y]; return v === undefined ? -1 : v; };
  const NB = PTS.map(([q, y]) => [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]].map(([dq, dy]) => at(q + dq, y + dy)).filter(i => i >= 0));
  const CENTER = at(0, 0);
  const DIRS = [[0, 2], [1, 1], [1, -1]];
  const LINES = [];                                                          // 길이 5 이상인 곧은 줄 (끝에서 끝까지)
  for (let i = 0; i < NP; i++) for (const [dq, dy] of DIRS) {
    const [q, y] = PTS[i];
    if (at(q - dq, y - dy) >= 0) continue;
    const L = [];
    for (let k = 0, j = i; j >= 0; k++, j = at(q + dq * k, y + dy * k)) L.push(j);
    if (L.length >= 5) LINES.push(L);
  }
  const WIN5 = [];                                                           // 5칸 창 (점수 계산용)
  for (const L of LINES) for (let k = 0; k + 5 <= L.length; k++) WIN5.push(L.slice(k, k + 5));
  const TRIS = [];                                                           // 서로 이웃한 세 칸
  for (let i = 0; i < NP; i++) for (const j of NB[i]) if (j > i) for (const k of NB[i]) if (k > j && NB[j].includes(k)) TRIS.push([i, j, k]);
  const dist = (a, b) => { const dq = Math.abs(PTS[a][0] - PTS[b][0]), dy = Math.abs(PTS[a][1] - PTS[b][1]); return Math.max(dq, (dq + dy) / 2); };
  const NEAR2 = PTS.map((_, i) => { const o = []; for (let j = 0; j < NP; j++) if (j !== i && dist(i, j) <= 2) o.push(j); return o; });
  // 칸 이름: 가로 A~K(왼쪽부터) + 그 세로선 맨 아래가 1
  const LBL = PTS.map(([q, y]) => { let bot = -99; for (const [q2, y2] of PTS) if (q2 === q && y2 > bot) bot = y2; return "ABCDEFGHIJK"[q + 5] + ((bot - y) / 2 + 1); });

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 200) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const isP = x => Number.isInteger(x) && x >= 0 && x < NP;

  // ── 판 계산 (타입 배열 — 규칙 · 읽기 공용) ───────────────────
  // 칸마다 h(쌓인 수) · sl(아래부터 3칸, 1=검정 2=하양) · tp(맨 위 색)
  function boardOf(stk, hand) {
    const B = { h: new Int8Array(NP), sl: new Int8Array(NP * 3), tp: new Int8Array(NP), hand: hand ? hand.slice() : [0, 0], nodes: 0, limit: 1e9, stop: 0 };
    for (let i = 0; i < NP; i++) { const a = stk[i]; B.h[i] = a.length; for (let k = 0; k < a.length; k++) B.sl[i * 3 + k] = a[k] + 1; B.tp[i] = a.length ? a[a.length - 1] + 1 : 0; }
    return B;
  }
  // 이긴 사람 표시 (비트 1 = 검정 · 2 = 하양) — kinds 를 주면 어떤 방식인지도 채움
  function winFull(B, kinds) {
    let m = 0;
    const tp = B.tp;
    for (const L of LINES) {
      let run = 0, c = 0;
      for (let k = 0; k <= L.length; k++) {
        const t = k < L.length ? tp[L[k]] : 0;
        if (t && t === c) run++;
        else { if (c && run === 5) { m |= c; if (kinds) kinds[c].line = true; } c = t; run = t ? 1 : 0; }
      }
    }
    const n3 = [0, 0, 0];
    for (let i = 0; i < NP; i++) if (B.h[i] === 3) n3[tp[i]]++;
    for (const c of [1, 2]) if (n3[c] >= 5) { m |= c; if (kinds) kinds[c].tower5 = true; }
    for (const [a, b, d] of TRIS) {
      if (B.h[a] === 3 && B.h[b] === 3 && B.h[d] === 3 && tp[a] === tp[b] && tp[a] === tp[d]) { m |= tp[a]; if (kinds) kinds[tp[a]].tri3 = true; }
    }
    return m;
  }
  // 이긴 칸들 (화면에서 반짝이게): 색마다 오목 줄 · 3층 돌 · 이웃 세 칸에 든 칸
  function winStones(B) {
    const out = [null, new Set(), new Set()], tp = B.tp;
    for (const L of LINES) {
      let run = 0, c = 0;
      for (let k = 0; k <= L.length; k++) {
        const t = k < L.length ? tp[L[k]] : 0;
        if (t && t === c) run++;
        else { if (c && run === 5) for (let q = k - 5; q < k; q++) out[c].add(L[q]); c = t; run = t ? 1 : 0; }
      }
    }
    const t3 = [[], [], []];
    for (let i = 0; i < NP; i++) if (B.h[i] === 3) t3[tp[i]].push(i);
    for (const c of [1, 2]) if (t3[c].length >= 5) t3[c].forEach(i => out[c].add(i));
    for (const [a, b, d] of TRIS) if (B.h[a] === 3 && B.h[b] === 3 && B.h[d] === 3 && tp[a] === tp[b] && tp[a] === tp[d]) { out[tp[a]].add(a); out[tp[a]].add(b); out[tp[a]].add(d); }
    return out;
  }
  const kindOf = k => k.line ? "line5" : k.tri3 ? "tri3" : "tower5";
  const newKinds = () => [null, {}, {}];

  // 한 번의 놓기 · 이동 = [from, to] (놓기는 from = -1)
  function genMoves(B, s, near) {
    const out = [], col = s + 1;
    if (B.hand[s] > 0) {
      if (near) {
        const seen = new Uint8Array(NP);
        for (let i = 0; i < NP; i++) if (B.h[i]) for (const j of NEAR2[i]) if (!B.h[j] && !seen[j]) { seen[j] = 1; out.push([-1, j]); }
        for (const j of NB[CENTER]) if (!B.h[j] && !seen[j]) { seen[j] = 1; out.push([-1, j]); }
      } else for (let j = 0; j < NP; j++) if (!B.h[j]) out.push([-1, j]);
    }
    for (let f = 0; f < NP; f++) if (B.tp[f] === col) for (const t of NB[f]) if (B.h[t] <= B.h[f] && B.h[t] < 3) out.push([f, t]);
    return out;
  }
  function make(B, m, s) {
    const [f, t] = m, col = s + 1;
    if (f < 0) B.hand[s]--;
    else { B.h[f]--; B.tp[f] = B.h[f] ? B.sl[f * 3 + B.h[f] - 1] : 0; }
    B.sl[t * 3 + B.h[t]] = col; B.h[t]++; B.tp[t] = col;
  }
  function unmake(B, m, s) {
    const [f, t] = m, col = s + 1;
    B.h[t]--; B.tp[t] = B.h[t] ? B.sl[t * 3 + B.h[t] - 1] : 0;
    if (f < 0) B.hand[s]++;
    else { B.sl[f * 3 + B.h[f]] = col; B.h[f]++; B.tp[f] = col; }
  }
  const toAct = ([f, t]) => f < 0 ? { t: "place", to: t } : { t: "move", from: f, to: t };
  const toMove = a => a.t === "place" ? [-1, a.to] : [a.from, a.to];

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const bo = cfg && +cfg.bo === 1 ? 1 : 3;
    const st = { n: 2, rs: (seed >>> 0) || 1, bo, maxR: bo === 3 ? 5 : 3, round: 0, wins: [0, 0], first0: 0, first: 0, hist: [], log: [], seq: 0, over: false, phase: "setup", res: null, chooser: -1, lastW: -2 };
    st.first0 = rnd(st) < 0.5 ? 0 : 1;
    startRound(st, st.first0);
    return st;
  }
  function startRound(st, first) {
    st.round++; st.phase = "setup"; st.res = null; st.first = first; st.chooser = -1;
    st.stk = Array.from({ length: NP }, () => []);
    st.hand = [MEN, MEN];
    st.setup = { seq: [first, 1 - first, 1 - first, first, first, 1 - first], i: 0 };
    st.turn = first; st.ply = 0; st.last = null;
    push(st, { k: "start", r: st.round, first });
  }
  const needs = st => st.over ? [] : st.phase === "order" ? [st.chooser] : st.phase === "setup" ? [st.setup.seq[st.setup.i]] : st.phase === "play" ? [st.turn] : [];
  const over = st => !!st.over;
  function ranks(st) { return st.wins[0] === st.wins[1] ? [0, 0] : st.wins[0] > st.wins[1] ? [0, 1] : [1, 0]; }

  function setupCells(st, seat) {
    const out = [];
    for (let i = 0; i < NP; i++) {
      if (st.stk[i].length || i === CENTER) continue;
      if (NB[i].some(j => st.stk[j].length && st.stk[j][0] === seat)) continue;
      out.push(i);
    }
    return out;
  }
  function legal(st, seat) {
    if (st.over || !needs(st).includes(seat)) return [];
    if (st.phase === "order") return [{ t: "order", first: true }, { t: "order", first: false }];
    if (st.phase === "setup") return setupCells(st, seat).map(to => ({ t: "place", to }));
    return genMoves(boardOf(st.stk, st.hand), seat, false).map(toAct);
  }
  function endRound(st, w, why, kind) {
    st.res = { r: st.round, w, why, kind: kind || "", ply: st.ply, first: st.first };
    st.hist.push(Object.assign({}, st.res));
    if (w >= 0) st.wins[w]++;
    st.lastW = w;
    push(st, { k: "round", r: st.round, w, why, kind: kind || "" });
    st.phase = "between";
    const need = st.bo === 3 ? 2 : 1;
    if (st.wins.some(x => x >= need) || st.round >= st.maxR) { st.over = true; st.phase = "end"; push(st, { k: "end", wins: st.wins.slice() }); }
  }
  function apply(st, seat, a) {
    if (st.over || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "order") {
      if (a.t !== "order" || typeof a.first !== "boolean") return { ok: false, err: "먼저 할지 나중에 할지 골라 주세요" };
      push(st, { k: "order", s: seat, first: a.first });
      startRound(st, a.first ? seat : 1 - seat);
      return { ok: true };
    }
    if (st.phase === "setup") {
      if (a.t !== "place") return { ok: false, err: "기본 배치 — 돌을 놓아 주세요" };
      if (!isP(a.to)) return { ok: false, err: "칸을 골라 주세요" };
      if (st.stk[a.to].length) return { ok: false, err: "빈 칸이 아니에요" };
      if (a.to === CENTER) return { ok: false, err: "기본 배치에서는 정중앙 칸에 못 놓아요" };
      if (NB[a.to].some(j => st.stk[j].length && st.stk[j][0] === seat)) return { ok: false, err: "기본 배치에서는 내 돌과 이웃한 칸에 못 놓아요" };
      st.stk[a.to].push(seat); st.hand[seat]--;
      push(st, { k: "setup", s: seat, to: a.to });
      st.setup.i++;
      if (st.setup.i >= st.setup.seq.length) { st.phase = "play"; st.turn = st.first; push(st, { k: "go", first: st.first }); }
      return { ok: true };
    }
    // play
    let f, t;
    if (a.t === "place") {
      if (st.hand[seat] <= 0) return { ok: false, err: "돌을 다 놓았어요 — 판 위 내 돌을 옮겨요" };
      f = -1; t = a.to;
      if (!isP(t)) return { ok: false, err: "칸을 골라 주세요" };
      if (st.stk[t].length) return { ok: false, err: "빈 칸에만 새로 놓을 수 있어요 (쌓으려면 내 돌을 옮겨요)" };
    } else if (a.t === "move") {
      f = a.from; t = a.to;
      if (!isP(f) || !isP(t)) return { ok: false, err: "칸을 골라 주세요" };
      const sf = st.stk[f];
      if (!sf.length || sf[sf.length - 1] !== seat) return { ok: false, err: "맨 위가 내 돌인 칸을 골라 주세요" };
      if (!NB[f].includes(t)) return { ok: false, err: "이웃한 칸으로 한 칸만 옮겨요" };
      if (st.stk[t].length > sf.length) return { ok: false, err: "원래 있던 칸보다 더 높이 쌓인 칸으로는 못 가요" };
      if (st.stk[t].length >= 3) return { ok: false, err: "3층까지만 쌓을 수 있어요" };
    } else return { ok: false, err: "모르는 행동이에요" };
    let under = -1;
    if (f >= 0) { st.stk[f].pop(); under = st.stk[f].length ? st.stk[f][st.stk[f].length - 1] : -1; } else st.hand[seat]--;
    const covered = st.stk[t].length ? st.stk[t][st.stk[t].length - 1] : -1;
    st.stk[t].push(seat); st.ply++;
    st.last = { s: seat, f, t, fl: st.stk[t].length, cov: covered, un: under };
    push(st, f < 0 ? { k: "pl", s: seat, to: t } : { k: "mv", s: seat, from: f, to: t, fl: st.stk[t].length, cov: covered });
    const B = boardOf(st.stk, st.hand), kinds = newKinds(), wm = winFull(B, kinds), me = seat + 1, op = 3 - me;
    if (wm) {
      // 동시에 이루면 그 턴을 둔 사람이 이김 (내 돌을 치워 상대 줄이 드러나 상대만 이루면 상대가 이김)
      const w = wm & me ? seat : 1 - seat;
      endRound(st, w, "win", kindOf(kinds[w + 1])); return { ok: true };
    }
    if (st.ply >= CAPPLY) { endRound(st, -1, "cap"); return { ok: true }; }
    st.turn = 1 - seat;
    if (!genMoves(B, st.turn, false).length) endRound(st, seat, "block");
    return { ok: true };
  }
  const auto = st => st.phase === "between" && !st.over ? 2800 : null;
  function advance(st) {
    if (st.phase !== "between" || st.over) return;
    if (st.lastW >= 0) { st.phase = "order"; st.chooser = 1 - st.lastW; push(st, { k: "choose", s: st.chooser }); }
    else startRound(st, 1 - st.first);
  }

  // ── 보이는 것 (전부 공개) ──────────────────────────────────
  function view(st, seat) {
    const tops = st.stk.map(a => a.length ? a[a.length - 1] : -1);
    const pubObj = { s: st.stk.map(a => a.join("")).join("|"), h: st.hand, t: st.turn, r: st.round, w: st.wins, p: st.phase, o: st.over, f: st.first, c: st.chooser };
    return {
      n: 2, bo: st.bo, round: st.round, maxR: st.maxR, wins: st.wins.slice(), first: st.first, phase: st.phase, turn: st.turn, chooser: st.chooser,
      stk: st.stk.map(a => a.slice()), tops, hand: st.hand.slice(), setup: st.phase === "setup" ? { seq: st.setup.seq.slice(), i: st.setup.i } : null,
      ply: st.ply, CAPPLY, last: st.last ? Object.assign({}, st.last) : null,
      res: st.res ? Object.assign({}, st.res) : null, hist: st.hist.map(h => Object.assign({}, h)),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.wins.slice(),
      log: st.log.slice(), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 읽기 (AI · 선생님) ─────────────────────────────────────
  // 점수 (한 칸 = 1점 단위): 5칸 창 · 이웃 세 칸 · 3층 · 높이
  const LW = [0, 2, 10, 60, 380, 0], TW = [0, 150, 55, 22, 9, 4, 2], HB = [0, 0, 5, 14], T5W = [0, 6, 16, 40, 120, 0];
  function evalE(B) {
    const E = [0, 0, 0], tp = B.tp, h = B.h;
    for (const w of WIN5) {
      let a = 0, b = 0;
      for (let k = 0; k < 5; k++) { const t = tp[w[k]]; if (t === 1) a++; else if (t === 2) b++; }
      if (a && !b) E[1] += LW[a]; else if (b && !a) E[2] += LW[b];
    }
    for (const tr of TRIS) {
      let n1 = 0, n2 = 0, k1 = 0, k2 = 0;
      for (let k = 0; k < 3; k++) {
        const i = tr[k], hh = h[i], t = tp[i];
        if (hh === 3) { if (t === 1) k2 = 1; else k1 = 1; } else { n1 += 3 - hh; n2 += 3 - hh; }
      }
      if (!k1 && n1 <= 6) E[1] += TW[n1];
      if (!k2 && n2 <= 6) E[2] += TW[n2];
    }
    const n3 = [0, 0, 0];
    for (let i = 0; i < NP; i++) { const hh = h[i]; if (hh >= 2) { E[tp[i]] += HB[hh]; if (hh === 3) n3[tp[i]]++; } }
    E[1] += T5W[Math.min(5, n3[1])]; E[2] += T5W[Math.min(5, n3[2])];
    return E;
  }
  const evalS = (B, s) => { const E = evalE(B); return s ? E[2] - E[1] : E[1] - E[2]; };

  // 수 하나를 둔 값 (둔 쪽에서 본 점수) — 이기면 WINV, 상대 줄이 드러나 지면 -WINV
  function afterVal(B, m, s, ply) {
    make(B, m, s);
    const wm = winFull(B);
    let v;
    if (wm) v = wm & (s + 1) ? WINV - ply : -(WINV - ply);
    else if (ply >= CAPPLY) v = 0;                      // 150수에 닿으면 무승부 (판 규칙과 같음)
    else v = evalS(B, s);
    unmake(B, m, s);
    return v;
  }
  function ranked(B, s, ply, near) {
    const mv = genMoves(B, s, near), out = [];
    for (const m of mv) out.push([afterVal(B, m, s, ply), m]);
    B.nodes += out.length;
    out.sort((x, y) => y[0] - x[0]);
    return out;
  }
  // depth = 앞으로 읽을 수 (1 = 내 수 하나 + 정적 점수) · beam[d] = d 번째 수에서 살펴볼 후보 수
  function search(B, depth, s, alpha, beta, ply, beam) {
    if (B.stop) return 0;
    if (B.nodes > B.limit) { B.stop = 1; return 0; }
    const rk = ranked(B, s, ply + 1, true);
    if (!rk.length) return -(WINV - ply);
    if (depth <= 1 || rk[0][0] >= WINV - 200) return rk[0][0];
    let best = -Infinity;
    const k = Math.min(rk.length, beam[depth] || 6);
    for (let i = 0; i < k; i++) {
      const [sv, m] = rk[i];
      let v;
      if (sv >= WINV - 200 || sv <= -(WINV - 200)) v = sv;
      else { make(B, m, s); v = -search(B, depth - 1, 1 - s, -beta, -alpha, ply + 1, beam); unmake(B, m, s); }
      if (B.stop) return 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  // 단계: depth · root(처음 수 후보) · beam · nodes(읽는 양 한도) · noise(점수 흔들림) · rand(아무 수나 둘 확률) · slack
  const TIER = {
    easy: { depth: 1, root: 0, beam: [0, 0], nodes: 4000, noise: 70, rand: 0.3, slack: 0 },
    normal: { depth: 3, root: 8, beam: [0, 0, 5, 5], nodes: 8000, noise: 10, rand: 0.04, slack: 0 },
    hard: { depth: 5, root: 8, beam: [0, 0, 4, 5, 5, 5], nodes: 60000, noise: 1, rand: 0, slack: 2 },
    coach: { depth: 5, root: 12, beam: [0, 0, 5, 6, 6, 6], nodes: 100000, noise: 0, rand: 0, slack: 45 },
  };
  // 지금 차례의 수들과 값 [[수, 값, 정확한가]] (큰 값부터). include = 꼭 같이 볼 수(들)
  function scoreRoot(x, s, cfg, include) {
    const B = boardOf(x.stk, x.hand);
    B.limit = cfg.nodes * 6;
    const ply = x.ply || 0;
    const rk = ranked(B, s, ply + 1, false);
    if (!rk.length) return null;
    if (cfg.depth <= 1) return rk.map(([v, m]) => [m, v, true]);
    const keep = new Set(rk.slice(0, cfg.root || rk.length).map(z => z[1]));
    if (include) for (const [, m] of rk) if (include(m)) keep.add(m);
    const out = [];
    for (const [sv, m] of rk) {
      if (!keep.has(m)) { out.push([m, sv, false]); continue; }
      if (sv >= WINV - 200 || sv <= -(WINV - 200)) { out.push([m, sv, true]); continue; }
      make(B, m, s);
      B.stop = 0;
      const v = -search(B, cfg.depth - 1, 1 - s, -Infinity, Infinity, ply + 1, cfg.beam);
      unmake(B, m, s);
      out.push([m, B.stop ? sv : v, !B.stop]);
    }
    return out.sort((a, b) => b[1] - a[1]);
  }
  function pickMove(x, s, tier, r) {
    const cfg = TIER[tier] || TIER.normal;
    if (cfg.rand && r() < cfg.rand) { const mv = genMoves(boardOf(x.stk, x.hand), s, true); if (mv.length) return mv[Math.floor(r() * mv.length)]; }
    const sc = scoreRoot(x, s, cfg);
    if (!sc) return null;
    let bm = sc[0][0], bv = -Infinity;
    for (const [m, v, ex] of sc) { const z = (ex ? v : v - 5) + r() * cfg.noise; if (z > bv) { bv = z; bm = m; } }
    return bm;
  }
  // 기본 배치 · 선후공 고르기 (읽기가 아니라 방송 해설대로: 서로 한 칸씩 띄우고, 가운데 주변에)
  function setupPick(V, seat, tier, r) {
    const st = { stk: V.stk, setup: V.setup };
    const cells = [];
    for (let i = 0; i < NP; i++) {
      if (V.stk[i].length || i === CENTER) continue;
      if (NB[i].some(j => V.stk[j].length && V.stk[j][0] === seat)) continue;
      cells.push(i);
    }
    if (!cells.length) return null;
    if (tier === "easy") return cells[Math.floor(r() * cells.length)];
    let best = cells[0], bv = -Infinity;
    for (const i of cells) {
      const dc = dist(i, CENTER);
      let v = -Math.abs(dc - 2.5) * 3;
      for (let j = 0; j < NP; j++) if (V.stk[j].length) { const d = dist(i, j); if (V.stk[j][0] === seat) v += d === 2 ? 3 : d === 3 ? 1.5 : 0; else v += d === 1 ? -4 : d === 2 ? 1 : 0; }
      v += r() * (tier === "normal" ? 3 : 1);
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }
  function ai(V, seat, tier, r) {
    r = r || Math.random;
    if (V.over || !V.needs.includes(seat)) return null;
    if (V.phase === "order") return { t: "order", first: true };
    if (V.phase === "setup") { const to = setupPick(V, seat, tier, r); return to === null ? null : { t: "place", to }; }
    const m = pickMove(V, seat, tier, r);
    return m ? toAct(m) : null;
  }

  // ── 선생님이 쓰는 보조 ─────────────────────────────────────
  // seat 이 지금 바로 이길 수 있는 수 (차례가 아니어도 '내 차례라면')
  function winMoves(B, seat) {
    const out = [];
    for (const m of genMoves(B, seat, false)) {
      make(B, m, seat);
      const kinds = newKinds(), wm = winFull(B, kinds);
      unmake(B, m, seat);
      if (wm & (seat + 1)) out.push({ m, kind: kindOf(kinds[seat + 1]) });
    }
    return out;
  }
  const winCells = list => [...new Set(list.map(z => z.m[1]))].sort((a, b) => a - b);
  // 5칸 창에서 내 맨 위 돌이 몇 개까지 모였나 (상대 맨 위 돌이 없는 창) · 이웃 세 칸 3층까지 남은 돌 수
  function bestLine(B, s) {
    const col = s + 1; let best = 0;
    for (const w of WIN5) { let a = 0, b = 0; for (const i of w) { if (B.tp[i] === col) a++; else if (B.tp[i]) b++; } if (!b && a > best) best = a; }
    return best;
  }
  function triNeed(B, s) {
    const col = s + 1; let best = 9;
    for (const tr of TRIS) { let n = 0, bad = false; for (const i of tr) { if (B.h[i] === 3) { if (B.tp[i] !== col) bad = true; } else n += 3 - B.h[i]; } if (!bad && n < best) best = n; }
    return best;
  }
  function stats(V, s) {
    const B = boardOf(V.stk, V.hand), col = s + 1, f = [0, 0, 0, 0];
    let stones = 0;
    for (let i = 0; i < NP; i++) { for (let k = 0; k < B.h[i]; k++) if (B.sl[i * 3 + k] === col) stones++; if (B.tp[i] === col) f[B.h[i]]++; }
    return { stones, hand: V.hand[s], f1: f[1], f2: f[2], f3: f[3], line: bestLine(B, s), tri: triNeed(B, s) };
  }
  // 한 수의 뜻: win · block / noBlock / cantBlock · cover(상대 돌 위로) · climb(올라타기) · line3 / line4 · breakLine · tri(3층 이웃 셋에 가까워짐) · tower(3층 돌) · reveal
  function explain(V, me, a) {
    const B = boardOf(V.stk, V.hand), opp = 1 - me, tags = [];
    const m = toMove(a), f = m[0], t = m[1];
    const oppWin0 = winMoves(B, opp), oc0 = winCells(oppWin0);
    const line0 = bestLine(B, me), oline0 = bestLine(B, opp), tri0 = triNeed(B, me), n30 = [...Array(NP).keys()].filter(i => B.h[i] === 3 && B.tp[i] === me + 1).length;
    const tgtTop = B.tp[t], tgtH = B.h[t], srcH = f >= 0 ? B.h[f] : 0;
    const under = f >= 0 && B.h[f] >= 2 ? B.sl[f * 3 + B.h[f] - 2] : 0;
    make(B, m, me);
    const kinds = newKinds(), wm = winFull(B, kinds);
    const lose = !!wm && !(wm & (me + 1));                                 // 내 돌을 치워 밑의 상대 줄이 드러나 상대만 이룸
    if (wm & (me + 1)) tags.push("win");
    if (lose) tags.push("lose");
    const oppWin1 = wm ? [] : winMoves(B, opp), oc1 = winCells(oppWin1);
    if (oc0.length && !lose) tags.push(!oc1.length ? "block" : oc1.length < oc0.length ? "halfBlock" : "noBlock");
    if (tgtTop === opp + 1) tags.push("cover");
    if (f >= 0 && tgtH + 1 >= 2 && tgtH + 1 > srcH) tags.push("climb");
    const line1 = bestLine(B, me), oline1 = bestLine(B, opp), tri1 = triNeed(B, me), n31 = [...Array(NP).keys()].filter(i => B.h[i] === 3 && B.tp[i] === me + 1).length;
    if (line1 > line0 && line1 >= 3) tags.push(line1 >= 4 ? "line4" : "line3");
    if (oline1 < oline0 && oline0 >= 3) tags.push("breakLine");
    if (tri1 < tri0 && tri1 <= 3) tags.push("tri");
    if (n31 > n30) tags.push("tower");
    if (f >= 0 && under === opp + 1) tags.push("reveal");
    const mine1 = wm ? [] : winMoves(B, me), mc1 = winCells(mine1);
    unmake(B, m, me);
    return { tags, kind: wm & (me + 1) ? kindOf(kinds[me + 1]) : "", oppBefore: oc0, oppAfter: oc1, mineAfter: mc1, line: [line0, line1], tri: [tri0, tri1], floor: tgtH + 1 };
  }
  function recommend(V, me) {
    if (V.over || V.phase !== "play" || V.turn !== me) return null;
    const sc = scoreRoot(V, me, TIER.coach);
    if (!sc || !sc.length) return null;
    const a = toAct(sc[0][0]);
    return Object.assign({ a, v: sc[0][1] }, explain(V, me, a));
  }
  // 복기: 내 수 · 고급 AI 수의 값 (같은 깊이로 읽은 값, 칸 하나 영향 = 10점쯤)
  function judge(V, seat, a, b) {
    if (V.over || V.phase !== "play" || V.turn !== seat || !a || !b) return null;
    const ma = toMove(a), mb = toMove(b), same = (m, z) => m[0] === z[0] && m[1] === z[1];
    const sc = scoreRoot(V, seat, Object.assign({}, TIER.coach), m => same(m, ma) || same(m, mb));
    if (!sc || !sc.length) return null;
    const val = z => { for (const [m, v, ex] of sc) if (same(m, z)) return { v, ex }; return null; };
    const my = val(ma), bs = val(mb);
    return { my: my ? my.v : null, best: bs ? bs.v : null, exact: !!(my && bs && my.ex && bs.ex), top: sc[0][1], WINV };
  }
  function analyze(V, me) {
    const B = boardOf(V.stk, V.hand), opp = 1 - me, play = V.phase === "play" && !V.over;
    const ow = play ? winCells(winMoves(B, opp)) : [], mw = play ? winCells(winMoves(B, me)) : [];
    return { opp: ow, me: mw, rec: recommend(V, me), st: [stats(V, me), stats(V, opp)] };
  }

  return {
    id: "omok3", NP, MEN, CAPPLY, PTS, NB, CENTER, LINES, TRIS, LBL, WINV, DIRS,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    boardOf, winFull, winStones, genMoves, winMoves, winCells, bestLine, triNeed, stats, explain, recommend, analyze, judge, setupCells, scoreRoot, evalS, TIER, toAct, toMove,
  };
});

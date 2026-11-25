/* 베니 서바이벌 · 흑과 백 II — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 (블랙가넷) 1화 1회전 데스매치 (신아영 vs 권주리) · 더 지니어스 외전 (장동민 vs 홍지연) — 방송 규칙 설명 그래픽 확인
   · 1:1 데스매치. 두 사람이 각각 99포인트로 시작해 9라운드를 해요 (원작 흑과 백의 0~8 타일이 포인트로 바뀜)
   · 라운드마다 선 플레이어가 먼저 쓸 포인트를 정하면 한 자릿수(0~9)는 검정(흑) · 두 자릿수(10~99)는 흰색(백)으로만 공개 — 정확한 수는 비밀
   · 후 플레이어가 정하면 더 많이 쓴 쪽이 승점 1 (같으면 승점 없음). 쓴 포인트는 소멸
   · 남은 포인트는 5단계 표시등(80~99 · 60~79 · 40~59 · 20~39 · 0~19)으로만 공개 — 입력한 순간 적용돼서, 선이 단계를 낮추면 후가 정하기 전에 꺼진 표시등이 보여요. 마지막(0~19) 표시등은 0 이어도 안 꺼져요
   · 승점 5점을 먼저 얻으면 즉시 승리 · 9라운드가 끝나면 승점이 높은 쪽 승리
   · 라운드 승자가 다음 라운드의 선 (무승부면 선 그대로) — 영상 확인(승자가 선) · 무승부는 문서 기준
   · 9라운드 뒤에도 승점이 같으면 33포인트를 새로 받아 3라운드 연장 (문서 기준 · 영상 미확인, 우리 판은 최대 3번까지 되풀이하고 그래도 같으면 무승부)
   재현 약속: Math.random · 시계를 안 써요. 1라운드 선은 씨앗 동전 (cfg.first 로 고정 가능).
   숨은 정보: view 에는 내 남은 포인트 · 내가 낸 수만 정확히 실리고, 상대 것은 표시등(공개)과 흑/백뿐이에요. 끝나면(over) 두 사람이 낸 수를 모두 공개해요. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-bw2"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const START = 99, ROUNDS = 9, GOAL = 5, EXT_PTS = 33, EXT_ROUNDS = 3, EXT_MAX = 3;
  const lite = p => (p >= 80 ? 5 : p >= 60 ? 4 : p >= 40 ? 3 : p >= 20 ? 2 : 1);   // 켜진 표시등 칸 수 (마지막 칸은 0 이어도 안 꺼짐)
  const loOf = L => (L <= 1 ? 0 : 20 * (L - 1));                                   // 표시등 L 칸일 때 남은 포인트의 아래쪽
  const hiOf = (L, T) => Math.min(T, L >= 5 ? T : 20 * L - 1);                    // 위쪽 (T = 이 구간에서 받은 포인트 99 또는 33)
  const colOf = n => (n >= 10 ? "W" : "B");                                         // 백(흰색) · 흑(검정)
  const RANGE = L => `${loOf(L)}~${L >= 5 ? 99 : 20 * L - 1}`;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 시작 · 라운드 ─────────────────────────────────────────
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    const st = { n: 2, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), pts: [START, START], seg: START, score: [0, 0], round: 0, cap: ROUNDS, ext: 0, first: 0, sun: 0, nextSun: 0, phase: "", cur: [null, null], liteStart: [5, 5], drop: false, skip: 0, hist: [], log: [], seq: 0, fin: false, over: false };
    st.first = cfg.first === 0 || cfg.first === 1 ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    st.nextSun = st.first;
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.sun = st.nextSun; st.cur = [null, null]; st.drop = false; st.fin = false; st.skip = 0;
    st.liteStart = [lite(st.pts[0]), lite(st.pts[1])]; st.phase = "sun";
    push(st, { k: "round", r: st.round, s: st.sun, ext: st.ext });
  }
  const needs = st => (st.over ? [] : st.phase === "sun" ? [st.sun] : st.phase === "hu" ? [1 - st.sun] : []);
  function apply(st, seat, a) {
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a.t !== "bid" || typeof a.n !== "number" || !Number.isInteger(a.n)) return { ok: false, err: "쓸 포인트를 숫자로 정해요" };
    if (a.n < 0 || a.n > st.pts[seat]) return { ok: false, err: `0 ~ ${st.pts[seat]} 포인트 중에서 정해요` };
    const n = a.n;
    if (st.phase === "sun") {
      const before = lite(st.pts[seat]);
      st.pts[seat] -= n; st.cur[seat] = n;
      st.drop = lite(st.pts[seat]) < before;
      push(st, { k: "sun", r: st.round, s: seat, col: colOf(n), drop: st.drop, lite: lite(st.pts[seat]) });
      st.phase = "hu";
      return { ok: true };
    }
    st.pts[seat] -= n; st.cur[seat] = n;
    resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const s = st.sun, h = 1 - s, ns = st.cur[s], nh = st.cur[h];
    const w = ns > nh ? s : nh > ns ? h : -1;
    if (w >= 0) st.score[w]++;
    const e = { r: st.round, ext: st.ext, sun: s, n: st.cur.slice(), col: st.cur.map(colOf), w, lite: [lite(st.pts[0]), lite(st.pts[1])], drop: st.drop, sc: st.score.slice() };
    st.hist.push(e);
    push(st, { k: "res", r: st.round, w, col: e.col.slice(), lite: e.lite.slice(), sc: st.score.slice() });
    st.nextSun = w >= 0 ? w : s;
    st.fin = st.score[0] >= GOAL || st.score[1] >= GOAL || (st.round >= st.cap && (st.score[0] !== st.score[1] || st.ext >= EXT_MAX));
    // 둘 다 포인트가 0 이면 남은 라운드는 전부 무승부 — 의미 없는 라운드를 건너뛰어요 (우리 판만의 줄임 · diff 에 적음)
    if (!st.fin && st.pts[0] === 0 && st.pts[1] === 0 && st.round < st.cap) {
      const skip = st.cap - st.round; st.skip = skip; st.round = st.cap;
      st.fin = st.score[0] !== st.score[1] || st.ext >= EXT_MAX;
      push(st, { k: "dead", skip });
    }
    st.phase = "show";
  }
  const auto = st => (st.phase === "show" ? (st.fin ? 4200 : 3600) : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    if (st.fin) { st.over = true; st.phase = "end"; push(st, { k: "end", sc: st.score.slice() }); return; }
    if (st.round >= st.cap) {   // 동점으로 9라운드(또는 연장 3라운드)가 끝남 → 33포인트 3라운드 연장
      st.ext++; st.cap += EXT_ROUNDS; st.pts = [EXT_PTS, EXT_PTS]; st.seg = EXT_PTS;
      push(st, { k: "ext", n: st.ext, pts: EXT_PTS });
    }
    startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => st.score.map(c => st.score.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const P = st.pts[seat], set = new Set([0, Math.min(P, 10), P, Math.min(P, 1)]);
    return [...set].sort((a, b) => a - b).map(n => ({ t: "bid", n }));
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 정확한 포인트(내 남은 것 · 내가 낸 수)는 내 view 에만 · 상대 것은 끝난 뒤(over) 또는 'all' 에서만. 표시등 · 흑/백 · 승패는 모두 공개.
  function view(st, seat) {
    const all = seat === "all", s = seat === 0 || seat === 1 ? seat : -1, rev = all || st.over, open = i => rev || i === s;
    const placed = st.cur.map(x => x !== null), col = st.cur.map(x => (x === null ? null : colOf(x)));
    const hist = st.hist.map(e => ({ r: e.r, ext: e.ext, sun: e.sun, n: e.n.map((x, i) => (open(i) ? x : null)), col: e.col.slice(), w: e.w, lite: e.lite.slice(), drop: e.drop, sc: e.sc.slice() }));
    const pubObj = { r: st.round, p: st.phase, sc: st.score, s: st.sun, pl: placed, c: col, d: st.drop, l: [lite(st.pts[0]), lite(st.pts[1])], ls: st.liteStart, sk: st.skip, h: st.hist.map(e => [e.w, e.col, e.lite, e.sun]), e: st.ext, f: st.fin, ov: st.over };
    return {
      n: 2, goal: GOAL, phase: st.phase, round: st.round, cap: st.cap, ext: st.ext, seg: st.seg, first: st.first, sun: st.sun, hu: 1 - st.sun, nextSun: st.nextSun, fin: st.fin,
      score: st.score.slice(), pts: st.pts.map((p, i) => (open(i) ? p : null)), lite: [lite(st.pts[0]), lite(st.pts[1])], liteStart: st.liteStart.slice(), drop: st.drop, skip: st.skip,
      placed, col, cur: st.cur.map((x, i) => (open(i) ? x : null)), mine: s >= 0 ? st.cur[s] !== null : false,
      hist, needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, log: st.log.slice(-40).map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 상대 읽기 · 값 어림 (AI · 선생님 · 복기가 같이 씀 — 모두 그 자리 view 만 써요) ──
  // 상대가 이 구간에서 지금까지 쓴 합의 범위: 흑 = 0~9 · 백 = 10 이상 · 내가 이겼으면 내 수보다 작게 · 졌으면 크게 · 비겼으면 같게
  // 지금 남은 포인트 = 표시등 범위 ∩ (받은 포인트 − 쓴 합)
  function infer(V, me) {
    const opp = 1 - me, T = V.seg;
    let sLo = 0, sHi = 0, nW = 0, nB = 0;
    for (const e of V.hist) {
      if (e.ext !== V.ext) continue;
      let lo = e.col[opp] === "W" ? 10 : 0, hi = e.col[opp] === "W" ? T : 9;
      const mine = e.n[me];
      if (typeof mine === "number") {
        if (e.w === me) hi = Math.min(hi, mine - 1);
        else if (e.w === opp) lo = Math.max(lo, mine + 1);
        else { lo = Math.max(lo, mine); hi = Math.min(hi, mine); }
      }
      if (hi < lo) hi = lo;
      sLo += lo; sHi += Math.min(hi, T); if (e.col[opp] === "W") nW++; else nB++;
    }
    const L = V.phase === "show" || V.phase === "end" ? V.lite[opp] : V.liteStart[opp];   // 결과 단계의 hist 에는 이번 라운드가 이미 들어 있어서 지금 표시등으로 맞춰요
    let qLo = Math.max(loOf(L), T - sHi), qHi = Math.min(hiOf(L, T), T - sLo);
    if (qHi < qLo) { qLo = loOf(L); qHi = hiOf(L, T); }   // 서로 안 맞으면(있을 수 없음) 표시등만 믿어요
    return { qLo, qHi, nW, nB, L, T };
  }
  // 선이 낸 수의 가능한 범위 (후가 보는 정보: 색 · 표시등 변화 · 선의 직전 남은 포인트 범위)
  function sunRange(V, inf, c, Lq) {
    const T = inf.T, postLo = Lq == null ? 0 : loOf(Lq), postHi = Lq == null ? T : hiOf(Lq, T);   // Lq 가 null 이면 선의 표시등 변화를 안 읽어요
    let lo = Infinity, hi = -1;
    for (let q = inf.qLo; q <= inf.qHi; q++) {
      const a = Math.max(c === "W" ? 10 : 0, q - postHi), b = Math.min(c === "W" ? q : 9, q - postLo, q);
      if (b >= a) { if (a < lo) lo = a; if (b > hi) hi = b; }
    }
    if (hi < 0) { lo = c === "W" ? 10 : 0; hi = c === "W" ? Math.min(T, inf.qHi) : 9; }
    return { lo, hi };
  }
  const sig = x => 1 / (1 + Math.exp(-x));
  const ROLE = 0.3;   // 다음 라운드에 선이 되는 쪽이 조금 불리해요 (후는 선의 표시등 · 색을 보고 정함)
  // 상태 가치 (내가 끝내 이길 확률의 어림): 승점 차 + 남은 라운드 × (포인트 점유율 − 1/2)
  function Hval(sMe, sOp, P, Q, m, sunMe) {
    if (sMe >= GOAL) return 1;
    if (sOp >= GOAL) return 0;
    if (m <= 0) return sMe > sOp ? 1 : sMe < sOp ? 0 : 0.5;
    const sh = (P + 12) / (P + Q + 24);
    const d = (sMe - sOp) + m * (2 * sh - 1) - (sunMe ? ROLE : -ROLE) * Math.min(1, m);
    return sig(1.7 * d / (0.55 * Math.sqrt(m) + 0.45));
  }
  // 값을 어림할 때 쓰는 성향 (단계마다 달라요)
  //  lights: 상대 표시등에서 범위를 읽는가 · tau: 고르는 온도(작을수록 가장 좋아 보이는 수만) · conc: 선이 0 을 낼 확률 가중 · kappa: 상대가 덤빌 예산 배율
  const PROF = {
    easy:   { kind: "rand", spend: 2.6, zero: 0.18, read: 0.45 },
    normal: { kind: "ev", lights: 1, tau: 0.045, conc: 1.6, kappa: 1.0, trim: 0.5, sloppy: 0.35, habit: 0.5 },
    hard:   { kind: "ev", lights: 1, tau: 0.01, conc: 1.6, kappa: 1.0, trim: 1, sloppy: 0, habit: 1 },
  };

  // 상대의 버릇: 지난 라운드마다 상대가 낸 수의 구간 (색 + 내 수와 견준 승패, 내가 아는 것만) — 여러 번 비슷하게 냈으면 그 구간이 좁혀져요
  function habitRows(V, me, T) {
    const opp = 1 - me, rows = [];
    for (const e of V.hist) {
      if (e.ext !== V.ext) continue;
      let lo = e.col[opp] === "W" ? 10 : 0, hi = e.col[opp] === "W" ? T : 9;
      const mine = e.n[me];
      if (typeof mine === "number") { if (e.w === me) hi = Math.min(hi, mine - 1); else if (e.w === opp) lo = Math.max(lo, mine + 1); else { lo = Math.max(lo, mine); hi = Math.min(hi, mine); } }
      hi = Math.min(hi, T); if (hi >= lo) rows.push({ lo, hi, c: e.col[opp] });
    }
    return rows;
  }
  // 버릇으로 본 상대 수의 분포 (rows 가 모자라면 null) — 구간들이 겹치면 겹친 곳(좁음), 아니면 최근 네 번의 평균
  function habitDist(rows, T, scale) {
    if (!rows.length || !scale) return null;
    const d = new Float64Array(T + 3);
    let iLo = 0, iHi = T; for (const r of rows) { iLo = Math.max(iLo, r.lo); iHi = Math.min(iHi, r.hi); }
    let w;
    if (rows.length >= 2 && iLo <= iHi) { for (let x = iLo; x <= iHi; x++) d[x] = 1 / (iHi - iLo + 1); w = Math.min(0.6, 0.2 + 0.1 * rows.length); }
    else { const rr = rows.slice(-4); for (const r of rr) for (let x = r.lo; x <= r.hi; x++) d[x] += 1 / (r.hi - r.lo + 1) / rr.length; w = Math.min(0.35, 0.1 * rows.length); }
    return { d, w: w * scale };
  }

  function candidates(V, me, P, inf, sureHint) {
    const pts = V.pts[me], L = lite(pts), set = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 19, 20, 21, 25, 30, 35, 40, 45, 50, 60]);
    for (let k = 1; k <= 4; k++) { const x = pts - 20 * k; set.add(x + 1); set.add(x); set.add(x + 2); }   // 표시등이 막 꺼지는 경계
    if (sureHint != null) { set.add(sureHint); set.add(sureHint + 1); set.add(sureHint - 1); }
    if (inf) { set.add(inf.qHi + 1); set.add(Math.min(pts, inf.qHi)); set.add(Math.round((inf.qLo + inf.qHi) / 2)); }
    set.add(pts); set.add(Math.round(pts / 2)); set.add(Math.round(pts / 3));
    return [...set].filter(x => Number.isInteger(x) && x >= 0 && x <= pts).sort((a, b) => a - b);
  }

  // 지금 내 차례의 모든 수를 값 매김 — 후일 때는 선이 낸 수의 분포로, 선일 때는 후의 반응 모델로
  function makeEval(V, me, P) {
    P = P || PROF.hard;
    const opp = 1 - me, T = V.seg, inf = infer(V, me), pts = V.pts[me], m1 = V.cap - V.round;
    const sMe = V.score[me], sOp = V.score[opp], aOp = V.goal - sOp, mNow = V.cap - V.round + 1;
    const Qm = (inf.qLo + inf.qHi) / 2, isSun = V.sun === me, HR = P.habit ? habitRows(V, me, T) : [];
    let dist = null, bR = null;
    if (!isSun) {
      // 선(상대)이 낸 수의 분포: 색 · 표시등 변화로 좁혀진 범위 안에서 균등 (표시등을 안 읽는 단계는 색만)
      const Lq = V.lite[opp], c = V.col[opp] || "B";
      const infU = P.lights ? inf : { qLo: 0, qHi: T, T, L: inf.L };
      const wide = sunRangeInf(V, infU, c, P.lights ? Lq : null);
      bR = wide;
      dist = new Float64Array(T + 2);
      let tot = 0;
      for (let q = infU.qLo; q <= infU.qHi; q++) {
        const postLo = P.lights ? loOf(Lq) : 0, postHi = P.lights ? hiOf(Lq, T) : T;
        const a = Math.max(c === "W" ? 10 : 0, q - postHi), b = Math.min(c === "W" ? q : 9, q - postLo, q);
        if (b < a) continue;
        const wq = 1 / (b - a + 1);
        for (let x = a; x <= b; x++) { dist[x] += wq; tot += wq; }
      }
      if (!tot) { for (let x = bR.lo; x <= bR.hi; x++) { dist[x] = 1; tot++; } }
      if (c === "B" && P.conc > 1) { tot += dist[0] * (P.conc - 1); dist[0] *= P.conc; }
      for (let x = 0; x <= T; x++) dist[x] /= tot;
      const hb = habitDist(HR.filter(r => r.c === c), T, P.habit);   // 같은 색을 냈던 때의 버릇
      if (hb) {
        let m = 0; for (let x = bR.lo; x <= Math.min(T, bR.hi); x++) m += hb.d[x];
        if (m > 1e-9) { const w = hb.w; for (let x = 0; x <= T; x++) dist[x] = (1 - w) * dist[x] + w * ((x >= bR.lo && x <= bR.hi) ? hb.d[x] / m : 0); }
      }
    }
    const cum = dist ? (() => { const a = new Float64Array(T + 3); for (let x = 0; x <= T; x++) a[x + 1] = a[x] + dist[x]; return a; })() : null;   // cum[y] = P(선의 수 < y)
    const meanB = dist ? (() => { let s = 0; for (let x = 0; x <= T; x++) s += x * dist[x]; return s; })() : 0;

    const HRall = isSun ? habitDist(HR, T, P.habit) : null;
    // 선일 때: 후(상대)의 반응
    function react(x) {
      const L0 = V.liteStart[me], Lq = lite(pts - x), c = colOf(x);
      const q0lo = loOf(L0), q0hi = hiOf(L0, T), postLo = loOf(Lq), postHi = hiOf(Lq, T);
      let bLo = Math.max(c === "W" ? 10 : 0, q0lo - postHi), bHi = Math.min(c === "W" ? q0hi : 9, q0hi - postLo);
      if (bHi < bLo) bHi = bLo;
      const bud = Qm / Math.max(1, aOp), sure = Math.min(bHi + 1, Math.max(1, inf.qHi)), afford = inf.qHi >= bHi + 1;
      let pc = sig((P.kappa * bud - (bHi + 1)) / (0.3 * bud + 3));
      if (aOp >= mNow) pc = Math.max(pc, 0.85);
      if (!afford) pc *= 0.6;
      const d = new Float64Array(T + 3), qCap = Math.max(0, Math.min(T, inf.qHi));
      // 덤빌 때: 확실한 값 55% · 범위 안에서 도박 45% / 포기할 때: 대부분 0
      const gam = Math.max(1, bHi - bLo + 1);
      d[Math.min(sure, qCap)] += pc * 0.55;
      for (let y = bLo + 1; y <= bHi + 1 && y <= qCap; y++) d[y] += pc * 0.45 / gam;
      if (pc > 0 && !(d.some(v => v > 0))) d[0] += pc;
      d[0] += (1 - pc) * 0.85; d[Math.min(2, qCap)] += (1 - pc) * 0.15;
      let t = 0; for (let y = 0; y <= T; y++) t += d[y]; for (let y = 0; y <= T; y++) d[y] /= t;
      const hb = HRall;
      if (hb) {
        let m = 0; for (let y = 0; y <= Math.min(T, qCap); y++) m += hb.d[y];
        if (m > 1e-9) { const w = hb.w * 0.8; for (let y = 0; y <= T; y++) d[y] = (1 - w) * d[y] + w * (y <= qCap ? hb.d[y] / m : 0); }
      }
      return { d, bLo, bHi, sure: bHi + 1, pc, bud };
    }
    function evalX(x) {
      if (!Number.isInteger(x) || x < 0 || x > pts) return null;
      const Pn = pts - x, c = colOf(x), Lq = lite(Pn), drop = Lq < lite(pts);
      let pw, pt, Eo, extra = {};
      if (!isSun) {
        pw = cum[Math.min(x, T + 1)]; pt = x <= T ? dist[x] : 0; Eo = meanB;
        extra = { bLo: bR.lo, bHi: bR.hi, sure: bR.hi + 1 };
      } else {
        const R = react(x); let w = 0, t = 0, e = 0;
        for (let y = 0; y <= T; y++) { const p = R.d[y]; if (!p) continue; e += y * p; if (y < x) w += p; else if (y === x) t += p; }
        pw = w; pt = t; Eo = e; extra = { bLo: R.bLo, bHi: R.bHi, sure: R.sure, pc: R.pc, bud: R.bud };
      }
      pw = Math.min(1, Math.max(0, pw)); pt = Math.min(1 - pw, Math.max(0, pt));
      const pl = Math.max(0, 1 - pw - pt), Qn = Math.max(0, Qm - Eo), sunNextTie = V.sun === me;
      const vW = Hval(sMe + 1, sOp, Pn, Qn, m1, true), vT = Hval(sMe, sOp, Pn, Qn, m1, sunNextTie), vL = Hval(sMe, sOp + 1, Pn, Qn, m1, false);
      const ev = Math.min(1, Math.max(0, pw * vW + pt * vT + pl * vL));
      return Object.assign({ x, pw, pt, pl, ev, Pn, Qn, drop, lite: Lq, col: c }, extra);
    }
    function options() {
      const cs = candidates(V, me, P, inf, !isSun && bR ? bR.hi + 1 : null);
      return cs.map(evalX).filter(Boolean);
    }
    return { inf, isSun, evalX, options, dist, bR, Qm, pts };
  }
  // 표시등을 안 읽는(색만 보는) 단계용 · 읽는 단계용 범위
  function sunRangeInf(V, inf, c, Lq) { return sunRange(V, inf, c, Lq); }

  // 선생님 · 복기가 쓰는 추천 (난수 없음: 가장 값이 큰 수, 같으면 작은 수)
  function recommend(V, me) {
    const E = makeEval(V, me, PROF.hard), opts = E.options();
    let best = null;
    for (const o of opts) if (!best || o.ev > best.ev + 1e-9) best = o;
    return { E, opts, best, inf: E.inf };
  }
  const evalBid = (V, me, n) => makeEval(V, me, PROF.hard).evalX(n);

  // ── AI ────────────────────────────────────────────────────
  function randBid(V, me, P, r) {
    const pts = V.pts[me], left = V.cap - V.round + 1, isSun = V.sun === me;
    const base = Math.min(pts, Math.round(P.spend * pts / Math.max(1, left)) + 2);
    if (!isSun && V.col[V.sun] === "B" && r() < P.read) return Math.min(pts, 10);
    if (!isSun && V.col[V.sun] === "W" && r() < P.read) return Math.min(pts, 12 + Math.floor(r() * 18));
    if (r() < P.zero) return 0;
    return Math.min(pts, Math.floor(Math.pow(r(), 1.3) * (base + 1)));
  }
  function aiWith(V, me, P, r) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    if (P.kind === "rand") return { t: "bid", n: randBid(V, me, P, r) };
    const E = makeEval(V, me, P), opts = E.options();
    if (!opts.length) return { t: "bid", n: 0 };
    let mx = -1; for (const o of opts) if (o.ev > mx) mx = o.ev;
    const ws = opts.map(o => Math.exp((o.ev - mx) / Math.max(1e-6, P.tau)));
    let tot = 0; for (const w of ws) tot += w;
    let x = r() * tot, k = 0; for (; k < ws.length - 1; k++) { x -= ws[k]; if (x <= 0) break; }
    let n = opts[k].x;
    if (P.sloppy && r() < P.sloppy * 0.25) n = Math.max(0, Math.min(V.pts[me], n + Math.round((r() - 0.5) * 6)));   // 보통 단계의 어림 실수
    return { t: "bid", n };
  }
  function ai(V, me, tier, r) { return aiWith(V, me, PROF[tier] || PROF.normal, r); }

  // ── AI 선생님 (보이는 것만 읽음) ──────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const CN = { B: "흑(검정)", W: "백(흰색)" };
  const lit = L => `${L}칸 (${RANGE(L)})`;
  const sunTxt = (V, i, nm) => (V.sun === i ? `${nm(i)}${eun(nm(i))} 선` : `${nm(i)}${eun(nm(i))} 후`);
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`, opp = 1 - me, who = nm(opp), S = V.score, T = V.seg;
    const inf = infer(V, me), left = V.cap - V.round + 1, a = V.goal - S[me], ao = V.goal - S[opp];
    const myP = V.pts[me], oppStat = `${who} 표시등 ${lit(V.lite[opp])}`;
    const hist = V.hist.filter(e => e.ext === V.ext);
    const nW = hist.filter(e => e.col[opp] === "W").length, nB = hist.length - nW, win = hist.filter(e => e.w === opp).length;
    const scoreTxt = `승점 나 ${S[me]} : ${who} ${S[opp]} (먼저 ${V.goal}점)`;
    const spent = T - myP;
    if (V.over) {
      const r0 = S[me] > S[opp] ? "내가 이겼어요" : S[me] < S[opp] ? "아쉽지만 졌어요" : "끝까지 비겼어요";
      const rows = V.hist.map(e => e.n), tot = [0, 1].map(i => rows.reduce((s, n) => s + (typeof n[i] === "number" ? n[i] : 0), 0));
      return { opp: `승부가 끝났어요. ${who}${eun(who)} 백(두 자릿수) ${V.hist.filter(e => e.col[opp] === "W").length}번 · 흑 ${V.hist.filter(e => e.col[opp] === "B").length}번을 냈고, 정확한 수는 이제 복기에서 다 볼 수 있어요.`, mine: `${scoreTxt} → ${r0} · ${V.hist.length}라운드${V.ext ? ` (연장 ${V.ext}번)` : ""}`, rec: "한 판 더 해 봐요!", why: `총 ${tot[me]}포인트를 쓴 나와 ${tot[opp]}포인트를 쓴 ${who} — 흑과 백 II 는 '적은 차이로 이기고 큰 차이로 지는' 것이 핵심이에요 (이긴 ${V.hist.filter(e => e.w === me).length}라운드 · 진 ${V.hist.filter(e => e.w === opp).length}라운드).` };
    }
    const oppTxt = hist.length
      ? `${who}${eun(who)} 지금까지 백 ${nW}번 · 흑 ${nB}번, 나를 이긴 라운드 ${win}번. ${oppStat} → 남은 포인트는 ${inf.qLo === inf.qHi ? inf.qLo : `${inf.qLo}~${inf.qHi}`}쯤이에요.`
      : `첫 라운드예요. 둘 다 ${T}포인트 · ${oppStat}. 상대 포인트는 표시등으로만 볼 수 있어요.`;
    const mineTxt = `${scoreTxt} · 내 남은 ${myP}포인트 (표시등 ${lit(lite(myP))}) · 남은 ${left}라운드 · 이기려면 ${a}승 더 → 한 번 이길 때 평균 ${Math.round(myP / Math.max(1, a))}포인트까지 쓸 수 있어요`;
    if (V.phase === "show") {
      const e = V.hist[V.hist.length - 1];
      if (!e) return { opp: oppTxt, mine: mineTxt, rec: "다음 라운드를 준비해요", why: "" };
      const t = e.w === me ? "내가 승점 1점을 얻었어요" : e.w === opp ? `${who}${iga(who)} 승점 1점을 얻었어요` : "같은 포인트라 승점은 없어요";
      return {
        opp: `${e.r}라운드: ${nm(e.sun)}${eun(nm(e.sun))} 선으로 ${CN[e.col[e.sun]]}, ${nm(1 - e.sun)}${eun(nm(1 - e.sun))} ${CN[e.col[1 - e.sun]]}을 냈어요. ${who} 표시등은 이제 ${lit(e.lite[opp])}.`,
        mine: `${t} · ${scoreTxt}`, rec: V.fin ? "곧 결과가 나와요" : e.w >= 0 ? `다음 라운드는 ${nm(e.w)}${iga(nm(e.w))} 선이에요` : `무승부라 ${nm(e.sun)}${iga(nm(e.sun))} 계속 선이에요`,
        why: typeof e.n[me] === "number" ? `내가 쓴 ${e.n[me]}포인트는 소멸됐어요 (남은 ${V.pts[me]}). 상대가 쓴 정확한 수는 끝나기 전까진 안 보여요 — 흑/백과 승패, 표시등으로 짐작해요.` : "",
      };
    }
    if (V.sun !== me && V.phase === "sun") {
      return { opp: `${who}${iga(who)} 선으로 포인트를 정하는 중이에요. ${oppTxt}`, mine: mineTxt, rec: "상대 선택을 기다려요", why: `${who}${iga(who)} 정하면 색(흑/백)과 표시등 변화가 먼저 보여요 — 그걸로 상대가 낸 수의 범위를 좁혀서 내 수를 정해요.` };
    }
    if (V.sun === me && V.phase === "hu") return { opp: `${who}${iga(who)} 후로 정하는 중이에요 (내 색과 표시등을 보고 있어요).`, mine: mineTxt, rec: "상대 선택을 기다려요", why: "" };
    const R = recommend(V, me), b = R.best;
    if (!b) return { opp: oppTxt, mine: mineTxt, rec: "—", why: "" };
    if (V.sun === opp) {   // 내가 후: 선의 색 · 표시등 변화를 봄
      const c = V.col[opp], dropped = V.lite[opp] < V.liteStart[opp];
      const bR = R.E.bR, sure = bR.hi + 1;
      const opp1 = `${who}(선)${iga(who)} ${CN[c]}을 냈고 표시등이 ${dropped ? `${V.liteStart[opp]}칸 → ${V.lite[opp]}칸으로 꺼졌어요` : "그대로예요"} → 낸 수는 ${bR.lo === bR.hi ? bR.lo : `${bR.lo}~${bR.hi}`}로 읽혀요. (${oppStat})`;
      return {
        opp: opp1, mine: mineTxt,
        rec: `${b.x}포인트 (${b.col === "W" ? "백" : "흑"})`,
        why: `${b.x}${eul(String(b.x))} 내면 이번 라운드 이길 확률 약 ${pc(b.pw)}${b.pt > 0.005 ? ` (비길 확률 ${pc(b.pt)})` : ""} · ${sure <= myP ? `확실히 이기려면 ${sure}포인트` : `내 포인트가 모자라 확실히 이길 수는 없어요`} · 쓰면 남는 ${b.Pn}포인트 (표시등 ${b.lite}칸${b.drop ? ", 하나 꺼져요 — 다음에 상대가 읽어요" : ""}) · 승점 ${S[me]}→${S[me] + 1} 이면 다음 라운드엔 내가 선이에요.`,
      };
    }
    // 내가 선
    const opp1 = `${who}${eun(who)} 후라서 내 색과 표시등을 보고 정해요. 내가 ${b.col === "W" ? "백" : "흑"}을 내면 ${who}${iga(who)} 확실히 이기려면 ${b.sure}포인트가 필요하다고 읽어요 (${oppStat} · 남은 ${inf.qLo}~${inf.qHi}쯤).`;
    return {
      opp: opp1, mine: mineTxt, rec: `${b.x}포인트 (${b.col === "W" ? "백" : "흑"})`,
      why: `${b.x}${eul(String(b.x))} 내면 ${b.drop ? `표시등이 ${lite(myP)}칸 → ${b.lite}칸으로 꺼져서 상대가 먼저 알아채요` : "표시등은 그대로예요"} · ${who}${iga(who)} 덤빌 확률 약 ${pc(b.pc || 0)} → 내가 이길 확률 약 ${pc(b.pw)}${b.pt > 0.005 ? ` (비길 확률 ${pc(b.pt)})` : ""} · 남는 ${b.Pn}포인트로 ${left - 1}라운드를 더 해야 해요. 0 을 내면 거의 100% 져도 포인트를 아껴요.`,
    };
  }

  return { id: "gn-bw2", START, ROUNDS, GOAL, EXT_PTS, EXT_ROUNDS, EXT_MAX, PROF, ROLE, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, coach, recommend, evalBid, makeEval, infer, sunRange, Hval, lite, loOf, hiOf, colOf, RANGE, candidates };
});

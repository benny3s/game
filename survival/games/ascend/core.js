/* 베니 서바이벌 · 오름차순 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌2 · 오름차순 (머니챌린지 2일차)
   · 준비물: 사람마다 10칸 시트, 숫자 1~10
   · 한 라운드: ① 딜러가 사람마다 1~10 무작위 숫자 1개를 내 시트 아무 칸에 적어 줘요 (나만 봄)
     ② 순번대로 한 명씩 1~10 중 숫자 하나를 소리쳐요 (같은 숫자를 또 불러도 됨) → 모두가 그 숫자를 동시에 자기 시트의 빈칸 하나에 적어요
     시트 10칸이 다 차면 끝 (소리치기 9번)
   · 점수: 시트에서 오름차순으로 이어진 칸 수 (같은 숫자가 이어져도 오름차순으로 침). 여러 구간이면 가장 긴 구간
     라운드마다 쌓은 점수 합이 가장 높은 사람이 우승, 같으면 공동
   방송과 다른 점(우리가 정함):
     ① 방송은 9명이 한 번씩 소리침 → 우리는 2~6명이라 순번을 돌려 9번 소리침 (시트는 10칸 그대로)
     ② 순서 입찰은 없음 — 라운드마다 소리치기 시작 순번을 한 칸씩 돌림
     ③ 딜러 숫자가 들어갈 칸은 무작위 · 점수는 '가장 긴 구간 칸 수'를 라운드마다 더함 · 라운드는 2번 (옵션 3번)
     ④ 남의 시트는 라운드가 끝나야 보여요 (그 라운드의 점수도 그때 확정) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).ascend = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 10, DECL = N - 1;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 100) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 가장 긴 오름차순(같아도 이어짐) 구간 — 빈칸에서는 끊김
  function runOf(sh) {
    let best = { len: 0, from: 0 }, len = 0, from = 0;
    for (let j = 0; j < sh.length; j++) {
      if (sh[j] == null) { len = 0; continue; }
      if (len > 0 && sh[j] >= sh[j - 1]) len++; else { len = 1; from = j; }
      if (len > best.len) best = { len, from };
    }
    return best;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(6, n | 0));
    const st = { n, rs: (seed >>> 0) || 1, R: cfg && +cfg.rounds === 3 ? 3 : 2, round: 0, first: 0, start: 0, sheets: [], said: [], cur: 0, put: [], phase: "", turn: -1, totals: Array(n).fill(0), hist: [], log: [], seq: 0, over: false, res: null };
    st.first = Math.floor(rnd(st) * n);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.start = (st.first + st.round - 1) % st.n;
    st.sheets = Array.from({ length: st.n }, () => {
      const sh = Array(N).fill(null);
      sh[Math.floor(rnd(st) * N)] = 1 + Math.floor(rnd(st) * 10);   // 딜러 숫자
      return sh;
    });
    st.said = []; st.cur = 0; st.put = Array(st.n).fill(false); st.res = null;
    st.phase = "say"; st.turn = st.start;
    push(st, { k: "round", r: st.round, start: st.start });
  }
  function endRound(st) {
    const runs = st.sheets.map(runOf);
    runs.forEach((x, i) => { st.totals[i] += x.len; });
    const rec = { r: st.round, sheets: st.sheets.map(s => s.slice()), runs: runs.map(x => x.len), froms: runs.map(x => x.from), said: st.said.slice() };
    st.hist.push(rec); st.res = rec;
    push(st, { k: "end", r: st.round, runs: rec.runs });
    st.turn = -1;
    if (st.round >= st.R) { st.over = true; st.phase = "end"; } else st.phase = "show";
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "say") return [st.turn];
    if (st.phase === "put") return st.put.map((p, i) => (p ? -1 : i)).filter(i => i >= 0);
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "say") {
      if (a.t !== "say" || !Number.isInteger(a.v) || a.v < 1 || a.v > 10) return { ok: false, err: "1~10 중에서 불러 주세요" };
      st.cur = a.v; st.said.push(a.v); st.put = Array(st.n).fill(false); st.phase = "put";
      push(st, { k: "say", s: seat, v: a.v });
      return { ok: true };
    }
    if (a.t !== "put" || !Number.isInteger(a.c) || a.c < 0 || a.c >= N) return { ok: false, err: "적을 칸을 골라 주세요" };
    if (st.sheets[seat][a.c] != null) return { ok: false, err: "이미 숫자가 적힌 칸이에요" };
    st.sheets[seat][a.c] = st.cur; st.put[seat] = true;
    push(st, { k: "put", s: seat });
    if (st.put.every(Boolean)) {
      if (st.said.length >= DECL) endRound(st);
      else { st.phase = "say"; st.turn = (st.start + st.said.length) % st.n; }
    }
    return { ok: true };
  }
  const auto = st => (st.phase === "show" && !st.over ? 4500 : null);
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  const ranks = st => st.totals.map(t => st.totals.filter(x => x > t).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "say") return Array.from({ length: 10 }, (_, k) => ({ t: "say", v: k + 1 }));
    return st.sheets[seat].map((x, c) => (x == null ? { t: "put", c } : null)).filter(Boolean);
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", reveal = st.phase === "show" || st.over;
    const sheets = st.sheets.map((sh, i) => (all || i === seat || reveal ? sh.slice() : null));
    const pubObj = { r: st.round, p: st.phase, t: st.turn, s: st.said, c: st.cur, d: st.put, o: st.totals, h: st.hist.map(x => x.runs), sh: reveal ? st.sheets : null, ov: st.over };
    return {
      n: st.n, R: st.R, round: st.round, phase: st.phase, turn: st.turn, start: st.start, said: st.said.slice(), cur: st.cur, left: DECL - st.said.length,
      done: st.phase === "put" ? st.put.slice() : Array(st.n).fill(false),
      sheet: typeof seat === "number" && seat >= 0 ? sheets[seat] : null, sheets, totals: st.totals.slice(),
      hist: st.hist.map(x => ({ r: x.r, sheets: x.sheets.map(s => s.slice()), runs: x.runs.slice(), froms: x.froms.slice(), said: x.said.slice() })),
      res: st.res && (st.phase === "show" || st.over) ? { r: st.res.r, runs: st.res.runs.slice(), froms: st.res.froms.slice() } : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.totals.slice(),
      log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 자리 어울림 (보이는 것만) ───────────────────────────────
  // 칸마다 '이 숫자를 여기 적으면 얼마나 어색한가' (0 = 딱 맞음, 8 이상 = 이어 붙일 수 없음)
  function costs(sh, v) {
    const L = sh.length, lf = new Array(L), rt = new Array(L), out = new Array(L);
    let p = -1;
    for (let j = 0; j < L; j++) { lf[j] = p; if (sh[j] != null) p = j; }
    p = L;
    for (let j = L - 1; j >= 0; j--) { rt[j] = p; if (sh[j] != null) p = j; }
    for (let j = 0; j < L; j++) {
      if (sh[j] != null) { out[j] = Infinity; continue; }
      const pl = lf[j], pr = rt[j], a = pl >= 0 ? sh[pl] : 1, b = pr < L ? sh[pr] : 10;
      if (v < a || v > b) { out[j] = 8 + Math.min(j, L - 1 - j) * 0.5; continue; }
      const g = pr - pl - 1, i = j - pl - 1;
      out[j] = b > a ? Math.abs(i - ((v - a) / (b - a)) * (g - 1)) : 0;
    }
    return out;
  }
  function bestCell(sh, v) {
    const c = costs(sh, v); let b = -1, bc = Infinity;
    for (let j = 0; j < c.length; j++) if (c[j] < bc - 1e-9) { bc = c[j]; b = j; }
    return b;
  }
  const emptyOf = sh => sh.map((x, j) => (x == null ? j : -1)).filter(j => j >= 0);
  // 남은 칸을 sq 의 숫자로 (어울리는 칸에) 채워 보았을 때 가장 긴 구간
  function roll(sh, sq) {
    const s = sh.slice(); let k = 0;
    for (let e = s.length - s.filter(x => x != null).length; e > 0; e--) { const v = sq[k++]; s[bestCell(s, v)] = v; }
    return runOf(s).len;
  }
  function seqs(r, S, len) { return Array.from({ length: S }, () => Array.from({ length: len }, () => 1 + Math.floor(r() * 10))); }
  // 숫자 v 를 적을 칸마다 기대 점수 (남은 칸에 1~10 이 고르게 온다고 보고 S 번 돌려 봄) → [{c, ev}] 큰 순
  function evalPut(sh, v, sq, top) {
    const cs = costs(sh, v);
    const cand = emptyOf(sh).sort((a, b) => cs[a] - cs[b]).slice(0, top || N);
    return cand.map(c => { const s = sh.slice(); s[c] = v; let t = 0; for (const q of sq) t += roll(s, q); return { c, ev: t / sq.length }; }).sort((a, b) => b.ev - a.ev);
  }
  // 내가 소리칠 숫자마다 기대 점수 → [{v, c, ev}] 큰 순
  function evalSay(sh, S, r, top) {
    const sq = seqs(r, S, emptyOf(sh).length);
    return Array.from({ length: 10 }, (_, k) => { const e = evalPut(sh, k + 1, sq, top || 2)[0]; return { v: k + 1, c: e.c, ev: e.ev }; }).sort((a, b) => b.ev - a.ev);
  }
  const SAMPLES = 36;
  function pickRand(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function ai(V, me, tier, r) {
    const sh = V.sheet;
    if (V.phase === "say") {
      if (tier === "easy") return { t: "say", v: 1 + Math.floor(r() * 10) };
      if (tier === "normal") {
        const sc = Array.from({ length: 10 }, (_, k) => Math.min(...costs(sh, k + 1)));
        const m = Math.min(...sc), good = sc.map((c, k) => (c <= m + 0.3 ? k + 1 : 0)).filter(Boolean);
        return { t: "say", v: pickRand(r, good) };
      }
      const L = evalSay(sh, SAMPLES, r), best = L[0].ev;
      return { t: "say", v: pickRand(r, L.filter(x => x.ev >= best - 0.03)).v };
    }
    if (V.phase === "put") {
      const v = V.cur, e = emptyOf(sh);
      if (tier === "easy") return { t: "put", c: r() < 0.3 ? bestCell(sh, v) : pickRand(r, e) };
      if (tier === "normal") return { t: "put", c: r() < 0.12 ? pickRand(r, e) : bestCell(sh, v) };
      const L = evalPut(sh, v, seqs(r, SAMPLES + 24, e.length), 5), best = L[0].ev;
      return { t: "put", c: pickRand(r, L.filter(x => x.ev >= best - 0.02)).c };
    }
    return null;
  }

  return {
    id: "ascend", N, DECL,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    runOf, costs, bestCell, evalPut, evalSay, seqs,
  };
});

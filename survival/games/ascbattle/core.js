/* 베니 서바이벌 · 배틀 오름차순 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌2 · 배틀 오름차순 (데스매치 10일차, 1:1)
   · 준비물: 사람마다 시트, 숫자 카드 1~10
   · 차례대로 한 명씩 카드 2장을 무작위로 뽑아요 (두 숫자는 상대에게도 공개). 뽑은 사람이 한 장을 골라 내 시트 원하는 칸에 적고,
     고르지 않은 한 장은 상대에게 넘어가 상대가 자기 시트 원하는 칸에 적어요. 모든 칸이 찰 때까지 되풀이
   · 점수: 오름차순으로 이어진 칸 수의 최대 (같은 숫자가 이어져도 인정). 높은 쪽이 이겨요
   방송과 다른 점(우리가 정함): 시트는 8칸 · 카드는 뽑을 때마다 1~10 무작위(장수 제한 없음) · 뽑는 순서는 첫 턴만 무작위, 그 뒤엔 번갈아 · 같으면 공동 1등
   한 기기로도 할 수 있어요 (시트가 모두 공개라 숨길 것이 없음) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).ascbattle = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 8;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 100) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const card = st => 1 + Math.floor(rnd(st) * 10);

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
  function init({ seed }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, sheets: [Array(N).fill(null), Array(N).fill(null)], first: 0, turn: 0, drawer: 0, pair: [0, 0], kept: -1, gift: 0, phase: "keep", log: [], seq: 0, over: false };
    st.first = Math.floor(rnd(st) * 2); st.drawer = st.first;
    deal(st);
    return st;
  }
  function deal(st) {
    st.pair = [card(st), card(st)]; st.kept = -1; st.gift = 0; st.phase = "keep";
    push(st, { k: "deal", t: st.turn, s: st.drawer, a: st.pair[0], b: st.pair[1] });
  }
  const needs = st => (st.over ? [] : st.phase === "keep" ? [st.drawer] : [1 - st.drawer]);
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a.t === "keep" && st.phase === "keep") {
      if (a.k !== 0 && a.k !== 1) return { ok: false, err: "두 카드 중 하나를 골라요" };
      if (!Number.isInteger(a.c) || a.c < 0 || a.c >= N) return { ok: false, err: "적을 칸을 골라 주세요" };
      if (st.sheets[seat][a.c] != null) return { ok: false, err: "이미 숫자가 적힌 칸이에요" };
      st.sheets[seat][a.c] = st.pair[a.k]; st.kept = a.k; st.gift = st.pair[1 - a.k]; st.phase = "put";
      push(st, { k: "keep", s: seat, v: st.pair[a.k], c: a.c, gift: st.gift });
      return { ok: true };
    }
    if (a.t === "put" && st.phase === "put") {
      if (!Number.isInteger(a.c) || a.c < 0 || a.c >= N) return { ok: false, err: "적을 칸을 골라 주세요" };
      if (st.sheets[seat][a.c] != null) return { ok: false, err: "이미 숫자가 적힌 칸이에요" };
      st.sheets[seat][a.c] = st.gift;
      push(st, { k: "put", s: seat, v: st.gift, c: a.c });
      st.turn++;
      if (st.turn >= N) { st.over = true; st.phase = "end"; push(st, { k: "end", runs: st.sheets.map(s => runOf(s).len) }); }
      else { st.drawer = 1 - st.drawer; deal(st); }
      return { ok: true };
    }
    return { ok: false, err: st.phase === "keep" ? "카드 한 장과 칸을 골라요" : "넘어온 카드를 적을 칸을 골라요" };
  }
  const auto = () => null;
  const advance = () => {};
  const over = st => !!st.over;
  const ranks = st => { const r = st.sheets.map(s => runOf(s).len); return r.map(t => r.filter(x => x > t).length); };
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const e = st.sheets[seat].map((x, c) => (x == null ? c : -1)).filter(c => c >= 0);
    if (st.phase === "put") return e.map(c => ({ t: "put", c }));
    const L = []; for (const k of [0, 1]) for (const c of e) L.push({ t: "keep", k, c });
    return L;
  }

  // ── 보이는 것 (모두 공개) ──────────────────────────────────
  function view(st, seat) {
    const runs = st.sheets.map(runOf);
    const pubObj = { s: st.sheets, d: st.drawer, p: st.pair, k: st.kept, g: st.gift, ph: st.phase, t: st.turn, ov: st.over };
    return {
      n: 2, N, turn: st.turn, drawer: st.drawer, first: st.first, phase: st.phase, pair: st.pair.slice(), kept: st.kept, gift: st.gift,
      sheets: st.sheets.map(s => s.slice()), runs: runs.map(x => x.len), froms: runs.map(x => x.from),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: runs.map(x => x.len),
      log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 자리 어울림 · 시뮬레이션 (보이는 것만) ───────────────────
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
  const minOf = a => a.reduce((m, x) => (x < m ? x : m), Infinity);
  // 뽑은 카드 두 장 중 무엇을 어디에 적을지 (내 어색함은 작게, 상대에게 넘기는 카드는 상대가 어색하게)
  function polKeep(shs, d, pair, w) {
    let best = null;
    for (const k of [0, 1]) {
      const mine = costs(shs[d], pair[k]), theirs = minOf(costs(shs[1 - d], pair[1 - k]));
      for (let c = 0; c < mine.length; c++) {
        if (mine[c] === Infinity) continue;
        const sc = mine[c] - (w == null ? 0.6 : w) * theirs;
        if (!best || sc < best.sc - 1e-9) best = { k, c, sc };
      }
    }
    return best;
  }
  const cmp = (a, b) => (a > b ? 1 : a === b ? 0.5 : 0);
  // d 가 t 번째 턴부터 끝까지 (pairs[x] = 이후 턴에 뽑을 카드 쌍) → [내 0 번 점수, 1 번 점수]
  function sim(shs, d, t, pairs) {
    const s = [shs[0].slice(), shs[1].slice()];
    for (let x = 0; t < N; t++, d = 1 - d, x++) {
      const p = pairs[x], { k, c } = polKeep(s, d, p);
      s[d][c] = p[k]; const g = p[1 - k]; s[1 - d][bestCell(s[1 - d], g)] = g;
    }
    return [runOf(s[0]).len, runOf(s[1]).len];
  }
  const pairsOf = (r, S, len) => Array.from({ length: S }, () => Array.from({ length: len }, () => [1 + Math.floor(r() * 10), 1 + Math.floor(r() * 10)]));
  const emptyOf = sh => sh.map((x, j) => (x == null ? j : -1)).filter(j => j >= 0);
  // 지금 뽑은 카드로 (카드 k, 칸 c) 마다 이길 확률 → [{k, c, p}] 큰 순 (상대는 어울리는 칸에 적는다고 보고 S 번 돌려 봄)
  function evalKeep(V, me, S, r, top) {
    const pr = pairsOf(r, S, N - V.turn - 1), out = [];
    for (const k of [0, 1]) {
      const cs = costs(V.sheets[me], V.pair[k]), cand = emptyOf(V.sheets[me]).sort((a, b) => cs[a] - cs[b]).slice(0, top || N);
      for (const c of cand) {
        const shs = V.sheets.map(s => s.slice()); shs[me][c] = V.pair[k];
        const g = V.pair[1 - k]; shs[1 - me][bestCell(shs[1 - me], g)] = g;
        let w = 0; for (const q of pr) { const x = sim(shs, 1 - me, V.turn + 1, q); w += cmp(x[me], x[1 - me]); }
        out.push({ k, c, p: w / S });
      }
    }
    return out.sort((a, b) => b.p - a.p);
  }
  // 넘어온 카드를 칸마다 적었을 때 이길 확률 → [{c, p}] 큰 순
  function evalPut(V, me, S, r) {
    const pr = pairsOf(r, S, N - V.turn - 1);
    return emptyOf(V.sheets[me]).map(c => {
      const shs = V.sheets.map(s => s.slice()); shs[me][c] = V.gift;
      let w = 0; for (const q of pr) { const x = sim(shs, me, V.turn + 1, q); w += cmp(x[me], x[1 - me]); }
      return { c, p: w / S };
    }).sort((a, b) => b.p - a.p);
  }
  // 지금 형세에서 내가 이길 확률 (둘 다 어울리는 칸에 적는다고 보고)
  function winProb(V, me, S, r) {
    const pr = pairsOf(r, S, Math.max(0, N - V.turn - 1)); let w = 0;
    for (const q of pr) {
      const shs = V.sheets.map(s => s.slice()); let d = V.drawer, t = V.turn;
      if (V.over) { w += cmp(V.runs[me], V.runs[1 - me]); continue; }
      if (V.phase === "put") { const g = V.gift, o = 1 - d; shs[o][bestCell(shs[o], g)] = g; }
      else { const { k, c } = polKeep(shs, d, V.pair); shs[d][c] = V.pair[k]; const g = V.pair[1 - k]; shs[1 - d][bestCell(shs[1 - d], g)] = g; }
      t++; d = 1 - d;
      const x = t >= N ? [runOf(shs[0]).len, runOf(shs[1]).len] : sim(shs, d, t, q);
      w += cmp(x[me], x[1 - me]);
    }
    return w / S;
  }
  const SAMPLES = 60;
  const pickRand = (r, arr) => arr[Math.floor(r() * arr.length)];
  function ai(V, me, tier, r) {
    const mine = V.sheets[me], e = emptyOf(mine);
    if (V.phase === "keep") {
      if (tier === "easy" && r() < 0.7) return { t: "keep", k: r() < 0.5 ? 0 : 1, c: pickRand(r, e) };
      if (tier === "easy" || tier === "normal") {
        if (tier === "normal" && r() < 0.1) return { t: "keep", k: r() < 0.5 ? 0 : 1, c: pickRand(r, e) };
        const b = polKeep(V.sheets, me, V.pair, tier === "easy" ? 0 : 0.6); return { t: "keep", k: b.k, c: b.c };
      }
      const L = evalKeep(V, me, SAMPLES, r, 4), best = L[0].p, pick = pickRand(r, L.filter(x => x.p >= best - 0.01));
      return { t: "keep", k: pick.k, c: pick.c };
    }
    if (V.phase === "put") {
      if (tier === "easy") return { t: "put", c: r() < 0.4 ? bestCell(mine, V.gift) : pickRand(r, e) };
      if (tier === "normal") return { t: "put", c: r() < 0.06 ? pickRand(r, e) : bestCell(mine, V.gift) };
      const L = evalPut(V, me, SAMPLES, r), best = L[0].p;
      return { t: "put", c: pickRand(r, L.filter(x => x.p >= best - 0.01)).c };
    }
    return null;
  }

  return {
    id: "ascbattle", N,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    runOf, costs, bestCell, polKeep, evalKeep, evalPut, winProb,
  };
});

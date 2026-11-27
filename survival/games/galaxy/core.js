/* 베니 서바이벌 · 프로젝트 갤럭시 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 X · 7일차 프로젝트 갤럭시 (10명) — 나무위키 '피의 게임X/7일차' 룰 확인
   · 둥근 우주 16구역에 숨은 천체 16개: 별 1 · 행성 1 · 위성 2 · 혜성 3 · 쌍둥이 구름 4 · 왜소행성 2 · 우주먼지 3. 10라운드, 코인 30개
   · 라운드마다 구역 하나를 비밀로 골라 한꺼번에 공개 → 고른 구역의 천체대로 점수. 1라운드는 아무 데나, 2라운드부터는 이전 구역 바로 옆이 무료
     (더 멀면 칸마다 코인 1개). 라운드마다 관측(코인) 으로 '연속 8구역 안에 이 천체가 몇 개?' 를 물을 수 있고, 홀수 라운드마다 모두에게 힌트 한 줄
   · 블랙홀은 구역 1 에서 시작해 라운드마다 한 칸씩 → 블랙홀 구역과 양옆(3구역)에서 얻은 점수는 부호가 뒤집혀요
   · 점수: 별 +5 (세 번 고르면 초신성 → 이후 −5) · 행성/위성 다수 쪽 +3 소수 쪽 −3 · 혜성 혼자 +5 · 둘 +2 · 셋 +1 · 쌍둥이 구름 점유한 구름 수만큼(넷 다 −3) · 왜소행성 −2 · 우주먼지 0
   방송과 다른 점 · 우리가 정한 것은 ui.js 의 DIFF.
   재현 약속: 시계 · Math.random 을 안 써요 (판은 씨앗에서, AI 는 받은 rnd 만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).galaxy = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SEC = 16, ROUNDS = 10, COINS = 30, WIN = 8;
  const S = 0, P = 1, M = 2, C = 3, W = 4, D = 5, U = 6;
  const TN = ["별", "행성", "위성", "혜성", "쌍둥이 구름", "왜소행성", "우주먼지"];
  const TE = ["⭐", "🪐", "🌙", "☄️", "☁️", "🌑", "✨"];
  const NEED = [1, 1, 2, 3, 4, 2, 3];
  // 관측 · 힌트로 묻는 종류 (6가지): 별 / 행성계(행성+위성) / 혜성 / 쌍둥이 구름 / 왜소행성 / 우주먼지(별도 먼지로 보여요)
  const QN = ["별", "행성 · 위성", "혜성", "쌍둥이 구름", "왜소행성", "우주먼지"];
  const QE = ["⭐", "🪐", "☄️", "☁️", "🌑", "✨"];
  const NQ = 6;
  const OPTS = {};

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 200) st.log.shift(); }
  const dist = (a, b) => { const d = Math.abs(a - b) % SEC; return Math.min(d, SEC - d); };
  const pickCost = (prev, s) => (prev < 0 ? 0 : Math.max(0, dist(prev, s) - 1));
  const obsCost = round => Math.max(1, 11 - round);
  const bhCenter = round => (round - 1) % SEC;
  const inBH = (round, s) => dist(bhCenter(round), s) <= 1;
  const obsWin = (rs, round) => (round <= 8 ? Math.floor(mix(rs, 77, round) * SEC) : -1);   // 1~8라운드는 고정 구간 (모두 같음), 9~10라운드는 자유

  // q 종류 → 이 칸의 천체가 해당되는가
  const qHit = (t, q) => (q === 0 ? t === S : q === 1 ? t === P || t === M : q === 2 ? t === C : q === 3 ? t === W : q === 4 ? t === D : t === U || t === S);
  function qCount(map, q, w) { let c = 0; for (let k = 0; k < WIN; k++) if (qHit(map[(w + k) % SEC], q)) c++; return c; }

  // ── 판 만들기 ──  fixed = 이미 드러난 칸(-1 = 모름). 규칙: 혜성은 짝수 구역(인덱스 홀수)만 · 행성+위성은 연속 8구역 안 · 구름은 이웃한 둘씩 · 별은 왜소행성 옆 아님
  function genMap(r, fixed) {
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    for (let tries = 0; tries < 80; tries++) {
      const m = fixed ? fixed.slice() : Array(SEC).fill(-1);
      const have = Array(7).fill(0); for (const t of m) if (t >= 0) have[t]++;
      const freeOf = f => { const o = []; for (let c = 0; c < SEC; c++) if (m[c] < 0 && (!f || f(c))) o.push(c); return o; };
      const nb = c => [(c + 1) % SEC, (c + SEC - 1) % SEC];
      // 행성계
      const fixedPS = []; for (let c = 0; c < SEC; c++) if (m[c] === P || m[c] === M) fixedPS.push(c);
      const wins = [];
      for (let w = 0; w < SEC; w++) if (fixedPS.every(c => ((c - w + SEC) % SEC) < WIN)) wins.push(w);
      if (!wins.length) continue;
      const w0 = wins[Math.floor(r() * wins.length)], cells = shuffle(Array.from({ length: WIN }, (_, k) => (w0 + k) % SEC).filter(c => m[c] < 0));
      const np = 1 - have[P], nm = 2 - have[M];
      if (cells.length < np + nm) continue;
      for (let k = 0; k < np; k++) m[cells.pop()] = P;
      for (let k = 0; k < nm; k++) m[cells.pop()] = M;
      // 쌍둥이 구름 (이웃한 둘씩)
      const cl = []; for (let c = 0; c < SEC; c++) if (m[c] === W) cl.push(c);
      const matched = new Set(); let bad = false;
      for (const c of cl) {
        if (matched.has(c)) continue;
        const mate = shuffle(nb(c)).find(v => !matched.has(v) && (m[v] === W || m[v] < 0));
        if (mate == null) { bad = true; break; }
        if (m[mate] < 0) m[mate] = W;
        matched.add(c); matched.add(mate);
      }
      if (bad) continue;
      let wc = 0; for (let c = 0; c < SEC; c++) if (m[c] === W) wc++;
      while (wc < 4) {
        const f = shuffle(freeOf(c => m[(c + 1) % SEC] < 0));
        if (!f.length) { bad = true; break; }
        m[f[0]] = W; m[(f[0] + 1) % SEC] = W; wc += 2;
      }
      if (bad || wc !== 4) continue;
      // 혜성 (짝수 구역 = 인덱스 홀수)
      const cf = shuffle(freeOf(c => c % 2 === 1)), nc = 3 - have[C];
      if (cf.length < nc) continue;
      for (let k = 0; k < nc; k++) m[cf.pop()] = C;
      // 별 · 왜소행성 (별은 왜소행성 옆이 아님)
      const dw = () => { const o = []; for (let c = 0; c < SEC; c++) if (m[c] === D) o.push(c); return o; };
      if (have[S] === 0) {
        const nd = dw(), sf = freeOf(c => !nb(c).some(v => nd.includes(v)));
        if (!sf.length) continue;
        m[sf[Math.floor(r() * sf.length)]] = S;
      }
      const star = m.indexOf(S);
      const df = shuffle(freeOf(c => !nb(c).includes(star))), ndw = 2 - have[D];
      if (df.length < ndw) continue;
      for (let k = 0; k < ndw; k++) m[df.pop()] = D;
      const rest = freeOf();
      if (rest.length !== NEED[U] - have[U]) continue;
      for (const c of rest) m[c] = U;
      if (!valid(m)) continue;
      return m;
    }
    return null;
  }
  function valid(m) {
    const cnt = Array(7).fill(0); for (const t of m) cnt[t]++;
    if (cnt.some((x, i) => x !== NEED[i])) return false;
    const star = m.indexOf(S);
    for (const c of [(star + 1) % SEC, (star + SEC - 1) % SEC]) if (m[c] === D) return false;
    for (let c = 0; c < SEC; c += 2) if (m[c] === C) return false;
    let okWin = false;
    for (let w = 0; w < SEC && !okWin; w++) { let g = true; for (let c = 0; c < SEC; c++) if ((m[c] === P || m[c] === M) && ((c - w + SEC) % SEC) >= WIN) g = false; if (g) okWin = true; }
    if (!okWin) return false;
    const cl = []; for (let c = 0; c < SEC; c++) if (m[c] === W) cl.push(c);
    let start = 0; while (m[start] === W) start++;     // 구름 아닌 칸에서 시작해 둘레를 돌며, 이어진 구름 덩어리의 길이가 모두 짝수여야 이웃한 둘씩 짝이 지어져요
    let run = 0;
    for (let k = 1; k <= SEC; k++) { if (m[(start + k) % SEC] === W) run++; else { if (run % 2) return false; run = 0; } }
    return true;
  }

  // ── 한 라운드 점수 ── picks[i] = 자리 i 가 고른 구역
  function scoreRound(map, picks, round, energy) {
    const by = Array.from({ length: SEC }, () => []);
    picks.forEach((s, i) => by[s].push(i));
    const sd = Array(SEC).fill(0), sup = energy >= 3;
    let cloudOcc = 0, pc = 0, mc = 0;
    for (let s = 0; s < SEC; s++) if (by[s].length && map[s] === W) cloudOcc++;
    for (let s = 0; s < SEC; s++) {
      const k = by[s].length; if (!k) continue;
      const t = map[s];
      if (t === S) sd[s] = sup ? -5 : 5;
      else if (t === P) pc = k;
      else if (t === M) mc += k;
      else if (t === C) sd[s] = k === 1 ? 5 : k === 2 ? 2 : k === 3 ? 1 : 0;
      else if (t === W) sd[s] = cloudOcc >= 4 ? -3 : cloudOcc;
      else if (t === D) sd[s] = -2;
    }
    let pv = 0, mv = 0;
    if (pc && mc) { if (pc > mc) { pv = 3; mv = -3; } else if (pc < mc) { pv = -3; mv = 3; } else { pv = -3; mv = -3; } } else if (pc) pv = 3; else if (mc) mv = 3;
    for (let s = 0; s < SEC; s++) { if (map[s] === P) sd[s] = pv; else if (map[s] === M && by[s].length) sd[s] = mv; }
    const flip = Array(SEC).fill(false);
    for (let s = 0; s < SEC; s++) if (inBH(round, s)) { flip[s] = true; sd[s] = -sd[s] || 0; }
    const starSec = map.indexOf(S);
    return { sd, flip, delta: picks.map(s => sd[s]), by, starHit: by[starSec].length > 0 && !sup };
  }

  // ── 진행 ──
  function startRound(st) {
    st.phase = "obs"; st.obsDone = Array(st.n).fill(false); st.pick = Array(st.n).fill(null); st.pend = Array(st.n).fill(0); st.res = null;
    if (st.round % 2 === 1) {      // 홀수 라운드 = 모두에게 힌트
      const q = Math.floor(mix(st.rs, 5, st.round) * NQ), w = Math.floor(mix(st.rs, 6, st.round) * SEC);
      st.hints.push({ r: st.round, q, w, c: qCount(st.map, q, w) });
      push(st, { k: "hint", r: st.round });
    }
    push(st, { k: "round", r: st.round });
  }
  function init({ n, seed, cfg }) {
    const nn = Math.max(4, Math.min(8, n | 0 || 5)), rs = (seed >>> 0) || 1;
    const r = seeded(rs ^ 0x51ED), map = genMap(r, null) || genMap(seeded(rs ^ 0xA5A5), null);
    const st = { n: nn, rs, cfg: Object.assign({}, cfg || {}), round: 1, phase: "obs", map, coins: Array(nn).fill(COINS), score: Array(nn).fill(0),
      obsDone: [], pick: [], pend: [], prev: Array(nn).fill(-1), know: Array.from({ length: nn }, () => []), hints: [], rev: Array(SEC).fill(-1), energy: 0, hist: [], res: null,
      over: false, log: [], seq: 0 };
    startRound(st);
    return st;
  }
  function needs(st) {
    if (st.over) return [];
    const o = [];
    if (st.phase === "obs") { for (let i = 0; i < st.n; i++) if (!st.obsDone[i]) o.push(i); }
    else if (st.phase === "pick") { for (let i = 0; i < st.n; i++) if (st.pick[i] == null) o.push(i); }
    return o;
  }
  const over = st => !!st.over;
  function ranks(st) {
    if (!st.over) return st.score.map(() => 0);
    const above = (a, b) => (st.score[a] !== st.score[b] ? st.score[a] > st.score[b] : st.coins[a] > st.coins[b]);
    return st.score.map((_, i) => st.score.filter((_, j) => above(j, i)).length);
  }
  function resolve(st) {
    const R = scoreRound(st.map, st.pick, st.round, st.energy);
    const before = st.score.slice();
    for (let i = 0; i < st.n; i++) st.coins[i] -= st.pend[i];
    for (let i = 0; i < st.n; i++) st.score[i] += R.delta[i];
    const types = {}; const sup = st.energy >= 3;
    for (const s of st.pick) { st.rev[s] = st.map[s]; types[s] = st.map[s]; }
    if (R.starHit) st.energy++;
    const rec = { r: st.round, picks: st.pick.slice(), delta: R.delta.slice(), sd: R.sd.slice(), flip: R.flip.slice(), bh: bhCenter(st.round), sup, total: st.score.slice(), before, types, energy: st.energy };
    st.hist.push(rec); st.res = rec;
    for (let i = 0; i < st.n; i++) st.prev[i] = st.pick[i];
    push(st, { k: "res", r: st.round });
    if (st.round >= ROUNDS) { st.over = true; st.phase = "end"; push(st, { k: "end" }); } else st.phase = "show";
  }
  const auto = st => (!st.over && st.phase === "show" ? 6500 : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    st.round++; startRound(st);
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!a || typeof a !== "object" || !needs(st).includes(seat)) return { ok: false, err: "지금은 할 차례가 아니에요" };
    if (st.phase === "obs") {
      if (a.t === "skip") { st.obsDone[seat] = true; push(st, { k: "skip", s: seat }); }
      else if (a.t === "obs") {
        if (!Number.isInteger(a.q) || a.q < 0 || a.q >= NQ) return { ok: false, err: "관측할 천체를 골라요" };
        const cost = obsCost(st.round);
        if (st.coins[seat] < cost) return { ok: false, err: "코인이 모자라요" };
        let w = obsWin(st.rs, st.round);
        if (w < 0) { if (!Number.isInteger(a.w) || a.w < 0 || a.w >= SEC) return { ok: false, err: "관측할 구간의 시작 구역을 골라요" }; w = a.w; }
        st.coins[seat] -= cost;
        st.know[seat].push({ r: st.round, q: a.q, w, c: qCount(st.map, a.q, w) });
        st.obsDone[seat] = true; push(st, { k: "obs", s: seat, cost });
      } else return { ok: false, err: "관측하거나 건너뛰어요" };
      if (st.obsDone.every(Boolean)) { st.phase = "pick"; push(st, { k: "phase", ph: "pick" }); }
      return { ok: true };
    }
    if (a.t !== "pick" || !Number.isInteger(a.s) || a.s < 0 || a.s >= SEC) return { ok: false, err: "구역 하나를 골라요" };
    const cost = pickCost(st.prev[seat], a.s);
    if (cost > st.coins[seat]) return { ok: false, err: "코인이 모자라 그 구역까지 못 가요" };
    st.pend[seat] = cost; st.pick[seat] = a.s;      // 코인은 공개 때 한꺼번에 빼요 (먼저 빼면 남의 코인으로 고른 구역이 새요)
    push(st, { k: "pick", s: seat });
    if (st.pick.every(x => x != null)) resolve(st);
    return { ok: true };
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "obs") {
      const L = [{ t: "skip" }], cost = obsCost(st.round);
      if (st.coins[seat] >= cost) for (let q = 0; q < NQ; q++) { if (st.round <= 8) L.push({ t: "obs", q }); else for (let w = 0; w < SEC; w++) L.push({ t: "obs", q, w }); }
      return L;
    }
    const L = []; for (let s = 0; s < SEC; s++) if (pickCost(st.prev[seat], s) <= st.coins[seat]) L.push({ t: "pick", s });
    return L;
  }

  // ── 보이는 것 ──
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const hist = st.hist.map(h => ({ ...h, picks: h.picks.slice(), delta: h.delta.slice(), sd: h.sd.slice(), flip: h.flip.slice(), total: h.total.slice(), before: h.before.slice(), types: { ...h.types } }));
    const know = all ? st.know.map(k => k.map(x => ({ ...x }))) : me >= 0 ? st.know.map((k, i) => (i === me ? k.map(x => ({ ...x })) : [])) : st.know.map(() => []);
    const pubObj = { r: st.round, p: st.phase, c: st.coins, s: st.score, pk: st.pick.map(x => x != null), od: st.obsDone, rev: st.rev, e: st.energy, h: st.hints, hl: st.hist.length, pv: st.prev };
    return {
      n: st.n, rounds: ROUNDS, round: st.round, phase: st.phase, coins: st.coins.slice(), score: st.score.slice(), prev: st.prev.slice(),
      picked: st.pick.map(x => x != null), obsDone: st.obsDone.slice(), mine: me >= 0 ? st.pick[me] : null,
      rev: st.rev.slice(), energy: st.energy, sup: st.energy >= 3, hints: st.hints.map(h => ({ ...h })), ow: obsWin(st.rs, st.round), bh: bhCenter(st.round), oc: obsCost(st.round),
      hist, know, res: st.res && (st.phase === "show" || st.over) ? hist[hist.length - 1] : null, map: all ? st.map.slice() : null, picks: all ? st.pick.slice() : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, log: st.log.slice(-60).map(e => ({ ...e })), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 믿음 (보이는 것만): 드러난 구역은 고정, 힌트 · 내 관측과 어긋나면 무게를 크게 깎음 ──
  function constraints(V, me) {
    const L = V.hints.map(h => ({ q: h.q, w: h.w, c: h.c }));
    if (me >= 0 && V.know && V.know[me]) for (const k of V.know[me]) L.push({ q: k.q, w: k.w, c: k.c });
    return L;
  }
  function sampleMaps(V, me, K, r, extra) {
    const fixed = V.rev.slice(), cons = constraints(V, me).concat(extra || []), out = [];
    for (let k = 0; k < K; k++) {
      const m = genMap(r, fixed); if (!m) continue;
      let w = 1; for (const c of cons) if (qCount(m, c.q, c.w) !== c.c) w *= 0.03;
      out.push({ m, w });
    }
    return out;
  }
  const afford = (V, me) => { const L = []; for (let s = 0; s < SEC; s++) if (pickCost(V.prev[me], s) <= V.coins[me]) L.push(s); return L; };
  // 고를 구역마다 기대 점수 (표본 K 개). crowd=true 면 남들은 이전 구역 옆(80%) 또는 아무 데나 고른다고 보고 같이 셈
  function evalPick(V, me, K, r, crowd, coinsLeft) {
    const cand = afford(V, me).filter(s => pickCost(V.prev[me], s) <= (coinsLeft == null ? V.coins[me] : coinsLeft)), smp = sampleMaps(V, me, K, r);
    const ev = Array(SEC).fill(null), tw = smp.reduce((a, x) => a + x.w, 0) || 1, rows = [];
    for (const s of cand) ev[s] = 0;
    for (const x of smp) {
      const row = Array(SEC).fill(null), picks = Array(V.n).fill(0);
      if (crowd) for (let j = 0; j < V.n; j++) if (j !== me) picks[j] = V.prev[j] < 0 || r() < 0.2 ? Math.floor(r() * SEC) : (V.prev[j] + Math.floor(r() * 3) + SEC - 1) % SEC;
      for (const s of cand) {
        let d;
        if (crowd) { picks[me] = s; d = scoreRound(x.m, picks, V.round, V.energy).delta[me]; } else d = scoreRound(x.m, [s], V.round, V.energy).delta[0];
        row[s] = d; ev[s] += x.w * d;
      }
      rows.push({ row, w: x.w, m: x.m });
    }
    for (const s of cand) ev[s] = ev[s] / tw - 0.4 * pickCost(V.prev[me], s);
    return { ev, cand, smp: rows, tw };
  }
  const best = (ev, cand) => { let b = cand[0]; for (const s of cand) if (ev[s] > ev[b]) b = s; return b; };
  // 관측의 값 (관측 뒤 최선을 고르는 기대 − 지금 최선) — 모든 (종류 · 구간) 후보
  function evalObs(V, me, K, r) {
    const cost = V.oc, left = V.coins[me] - cost, E = evalPick(V, me, K, r, true, Math.max(0, left)), res = [];
    if (!E.cand.length || V.coins[me] < cost) return { opts: [], base: 0, cost };
    const base = (() => { const e0 = E.cand.map(s => E.smp.reduce((a, x) => a + x.w * (x.row[s] - 0.4 * pickCost(V.prev[me], s)), 0) / E.tw); return Math.max(...e0); })();
    const wins = V.ow >= 0 ? [V.ow] : Array.from({ length: SEC }, (_, i) => i);
    for (let q = 0; q < NQ; q++) for (const w of wins) {
      const g = {};
      for (const x of E.smp) { const c = qCount(x.m, q, w); (g[c] = g[c] || []).push(x); }
      let tot = 0;
      for (const c of Object.keys(g)) {
        let bv = -1e9;
        for (const s of E.cand) { const v = g[c].reduce((a, x) => a + x.w * (x.row[s] - 0.4 * pickCost(V.prev[me], s)), 0) / E.tw; if (v > bv) bv = v; }
        tot += bv;
      }
      res.push({ q, w, voi: tot - base });
    }
    res.sort((a, b) => b.voi - a.voi);
    return { opts: res, base, cost };
  }
  const SAMPLES = { easy: 0, normal: 90, hard: 260 };
  const LAMBDA = 0.5;
  function ai(V, me, tier, r) {
    if (V.phase === "obs") {
      const cost = V.oc;
      if (V.coins[me] < cost) return { t: "skip" };
      if (tier === "easy") return r() < 0.12 && cost <= 4 ? { t: "obs", q: Math.floor(r() * NQ), ...(V.ow < 0 ? { w: Math.floor(r() * SEC) } : {}) } : { t: "skip" };
      if (tier === "normal") {
        if (cost > 4 || V.coins[me] - cost < 6) return { t: "skip" };
        const q = [0, 2, 3, 4][Math.floor(r() * 4)];
        return { t: "obs", q, ...(V.ow < 0 ? { w: Math.floor(r() * SEC) } : {}) };
      }
      const E = evalObs(V, me, SAMPLES.hard, r), top = E.opts[0];
      if (top && top.voi > LAMBDA * cost && V.coins[me] - cost >= 2) return { t: "obs", q: top.q, ...(V.ow < 0 ? { w: top.w } : {}) };
      return { t: "skip" };
    }
    if (V.phase === "pick") {
      const cand = afford(V, me);
      if (tier === "easy") { const near = cand.filter(s => pickCost(V.prev[me], s) === 0); const pool = near.length && r() < 0.8 ? near : cand; return { t: "pick", s: pool[Math.floor(r() * pool.length)] }; }
      const E = evalPick(V, me, SAMPLES[tier] || SAMPLES.normal, r, tier === "hard"), b = E.ev[best(E.ev, E.cand)];
      const top = E.cand.filter(s => E.ev[s] >= b - 0.05);
      return { t: "pick", s: top[Math.floor(r() * top.length)] };
    }
    return null;
  }
  const recRnd = (V, me) => seeded(parseInt(hash(JSON.stringify([V.round, V.phase, V.hints, V.know[me], V.rev, V.prev, V.coins, V.score, me])), 36) >>> 0);
  function recommend(V, me) {
    const a = ai(V, me, "hard", recRnd(V, me));
    if (!a) return null;
    if (V.phase === "obs") { const E = a.t === "obs" ? evalObs(V, me, SAMPLES.hard, recRnd(V, me)) : null; return { a, E }; }
    return { a, E: evalPick(V, me, SAMPLES.hard, recRnd(V, me), true) };
  }

  return {
    id: "galaxy", SEC, ROUNDS, COINS, WIN, TN, TE, QN, QE, NQ, OPTS, S, P, M, C, W, D, U, NEED,
    genMap, valid, qCount, qHit, scoreRound, pickCost, obsCost, bhCenter, inBH, obsWin, dist, mix, seeded, hash,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, recRnd, evalPick, evalObs, sampleMaps, constraints, afford, best,
  };
});

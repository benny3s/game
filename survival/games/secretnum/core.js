/* 베니 서바이벌 · 시크릿 넘버 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 시즌 1 · 3일차 메인 매치 (11명). 나무위키 3일차 문서(룰 · 티켓 4종 · 점수 · 결과표)를 읽고 우리 말로 옮김.
   · 모두 1~100 번호 카드 한 장을 받음 — 본인을 포함해 아무도 안 보여 줌. 번호는 서로 달라요.
   · 두 사람이 콘택트룸에서 만나 같은 종류의 티켓을 한 장씩 내면 둘이 같은 힌트를 받음:
       ➕ 더하기: 두 번호의 합 (합이 20 이하면 '3~20 사이', 180 이상이면 '180~199 사이'로만) · ✖️ 곱하기: 곱의 일의 자리
       ➗ 나누기: 큰 수 ÷ 작은 수의 몫 (나머지 버림) · 0️⃣ 영: 두 번호 사이(두 수 제외)의 0 의 개수
     시작할 때 티켓 한 세트(네 종 각 1장) · 쓰면 사라짐 (세트를 더 사려면 피스 1개).
   · 끝나면 답안지에 본인을 포함한 모두의 번호를 적음 (빈칸 허용).
     내 번호 맞춤 +5 · 틀림 −5 / 남의 번호 맞춤 +1 · 틀림 −1 · 빈칸 0 / 전부 맞추면 +5 / 내 번호를 맞힌 사람 1명당 −1.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 4~8명 (방송 11명) · 번호 범위 1~(10×인원) · 더하기 '범위만 알려 주는 끝' 도 같은 비율로 (인원 × 2 이하 · 인원 × 18 이상 자리)
     ② 방송은 2시간 자유 만남 + 대화 · 우리는 라운드(기본 8)마다 짝을 무작위로 정해 공개 — 둘이 동시에 티켓을 고름. 같으면 힌트, 다르면
        서로 뭘 냈는지 보고 한 번 더 (두 번째도 다르면 둘 다 낸 티켓만 잃고 힌트 없음) · 만나기 싫으면 '건너뛰기' (잃는 것 없음)
     ③ 대화 · 협상 · 거짓말 · 감옥 수감자 베팅 · 피스 증감은 없음 · 피스로 티켓 세트를 사는 대신 처음부터 2세트 (옵션으로 방송대로 1세트) · 라운드 기본 8
   숨은 정보: 모든 번호 · 남의 티켓 종류 · 남과 남이 얻은 힌트 · 낸 답안지(끝날 때까지). 누가 누구와 만났고 성사됐는지(성사 · 불발 · 건너뜀)는 공개 —
     어떤 티켓이었는지 · 힌트 값은 두 사람만 안다. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).secretnum = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const KINDS = ["add", "mul", "div", "zero"];
  const KN = { add: { nm: "더하기", em: "➕" }, mul: { nm: "곱하기", em: "✖️" }, div: { nm: "나누기", em: "➗" }, zero: { nm: "영(0)", em: "0️⃣" } };
  const MINN = 4, MAXN = 8;
  const OPTS = { rounds: [6, 8, 10], sets: [1, 2] };
  const optsOf = cfg => { cfg = cfg || {}; return { rounds: OPTS.rounds.includes(+cfg.rounds) ? +cfg.rounds : 8, sets: OPTS.sets.includes(+cfg.sets) ? +cfg.sets : 2 }; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const rangeOf = n => 10 * n;
  const cuts = R => ({ lo: Math.round(R * 0.2), hi: Math.round(R * 1.8) });

  // ── 티켓 계산 (방송 그대로) ──
  const ZP = {};
  function zpre(R) {
    if (ZP[R]) return ZP[R];
    const P = new Int32Array(R + 2);
    for (let x = 1; x <= R + 1; x++) P[x] = P[x - 1] + (String(x).match(/0/g) || []).length;
    return (ZP[R] = P);
  }
  function calc(k, a, b, R) {
    if (k === "add") { const s = a + b, c = cuts(R); if (s <= c.lo) return { lo: 3, hi: c.lo }; if (s >= c.hi) return { lo: c.hi, hi: 2 * R - 1 }; return { v: s }; }
    if (k === "mul") return { v: (a * b) % 10 };
    if (k === "div") return { v: Math.floor(Math.max(a, b) / Math.min(a, b)) };
    const P = zpre(R), lo = Math.min(a, b), hi = Math.max(a, b);
    return { v: hi - 1 > lo ? P[hi - 1] - P[lo] : 0 };
  }
  const match = (f, a, b, R) => { const c = calc(f.k, a, b, R); return f.v != null ? c.v === f.v : c.lo === f.lo && c.hi === f.hi; };
  const mkFact = (r, w, k, c) => (c.v != null ? { r, w, k, v: c.v } : { r, w, k, v: null, lo: c.lo, hi: c.hi });

  // ── 추리 (내 힌트만으로 내 번호 · 만난 사람 번호의 확률) ──
  const CC = new Map();
  function consFor(list, R) {
    const key = R + "|" + list.map(f => f.k + ":" + (f.v != null ? f.v : f.lo + "~" + f.hi)).join(",");
    let o = CC.get(key); if (o) return o;
    const W = R + 1, M = new Uint8Array(W * W), c = new Int32Array(W);
    for (let x = 1; x <= R; x++) for (let y = 1; y <= R; y++) if (y !== x && list.every(f => match(f, x, y, R))) { M[x * W + y] = 1; c[x]++; }
    o = { M, c }; if (CC.size > 400) CC.clear(); CC.set(key, o); return o;
  }
  function posterior(facts, R) {
    const by = {}; for (const f of facts) (by[f.w] = by[f.w] || []).push(f);
    const js = Object.keys(by).map(Number), W = R + 1, cs = {};
    for (const j of js) cs[j] = consFor(by[j], R);
    const w = new Float64Array(W); let tot = 0;
    for (let x = 1; x <= R; x++) { let p = 1; for (const j of js) p *= cs[j].c[x]; w[x] = p; tot += p; }
    if (!tot) { for (let x = 1; x <= R; x++) { w[x] = 1; tot++; } }
    const px = new Float64Array(W); for (let x = 1; x <= R; x++) px[x] = w[x] / tot;
    const py = {};
    for (const j of js) {
      const arr = new Float64Array(W), { M, c } = cs[j]; let s = 0;
      for (let x = 1; x <= R; x++) if (px[x] > 0 && c[x] > 0) { const q = w[x] / c[x]; for (let y = 1; y <= R; y++) if (M[x * W + y]) arr[y] += q; }
      for (let y = 1; y <= R; y++) s += arr[y];
      if (s > 0) for (let y = 1; y <= R; y++) arr[y] /= s;
      else for (let y = 1; y <= R; y++) arr[y] = 1 / R;
      py[j] = arr;
    }
    return { px, py, js };
  }
  const ent = (p, R) => { let h = 0; for (let x = 1; x <= R; x++) if (p[x] > 0) h -= p[x] * Math.log(p[x]); return h; };
  const effOf = (p, R) => Math.exp(ent(p, R));
  function sumOf(p, R) {
    let cnt = 0, lo = 0, hi = 0, top = 0, topP = 0;
    for (let x = 1; x <= R; x++) if (p[x] > 1e-12) { cnt++; if (!lo) lo = x; hi = x; if (p[x] > topP + 1e-12) { topP = p[x]; top = x; } }
    return { cnt, lo, hi, top, p: topP, eff: effOf(p, R) };
  }
  function sampleOf(p, R, u) { let a = 0; for (let x = 1; x <= R; x++) { a += p[x]; if (u < a) return x; } for (let x = R; x >= 1; x--) if (p[x] > 0) return x; return 1; }

  // ── 상태 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {}; n = Math.max(MINN, Math.min(MAXN, n | 0 || 5));
    const o = optsOf(cfg), rs = (seed >>> 0) || 1, R = rangeOf(n), rng = seeded(hash(`num|${rs}`));
    const pool = Array.from({ length: R }, (_, i) => i + 1);
    for (let i = 0; i < n; i++) { const j = i + Math.floor(rng() * (R - i)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const num = pool.slice(0, n);
    const st = { n, R, rs, cfg: Object.assign({}, cfg), opt: o, num, tk: Array.from({ length: n }, () => ({ add: o.sets, mul: o.sets, div: o.sets, zero: o.sets })),
      round: 0, phase: "meet", pairs: [], sit: -1, met: Array.from({ length: n }, () => Array(n).fill(0)), sat: Array(n).fill(0), facts: Array.from({ length: n }, () => []),
      sheets: Array(n).fill(null), over: false, end: "", score: Array(n).fill(0), detail: [], log: [], seq: 0 };
    st.log.push({ i: st.seq++, k: "start", n, R, rounds: o.rounds, sets: o.sets });
    startRound(st);
    return st;
  }
  const totalTk = t => KINDS.reduce((a, k) => a + t[k], 0);
  function makePairs(st) {
    const n = st.n, rng = seeded(hash(`pair|${st.rs}|${st.round}`)); let best = null, bc = 1e9;
    for (let t = 0; t < 60; t++) {
      const ord = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = ord[i]; ord[i] = ord[j]; ord[j] = x; }
      let sit = -1; if (n % 2) sit = ord.pop();
      const pairs = []; for (let i = 0; i < ord.length; i += 2) pairs.push([ord[i], ord[i + 1]].sort((a, b) => a - b));
      let c = rng() * 0.1; for (const p of pairs) c += st.met[p[0]][p[1]] * 10 + (totalTk(st.tk[p[0]]) && totalTk(st.tk[p[1]]) ? 0 : 4);
      if (sit >= 0) c += st.sat[sit] * 6;
      if (c < bc) { bc = c; best = { pairs, sit }; }
    }
    best.pairs.sort((a, b) => a[0] - b[0]);
    return best;
  }
  function startRound(st) {
    st.round++;
    if (st.round > st.opt.rounds || st.tk.filter(t => totalTk(t)).length < 2) return toSheet(st);
    const { pairs, sit } = makePairs(st);
    st.sit = sit; if (sit >= 0) st.sat[sit]++;
    st.pairs = pairs.map(([a, b]) => { st.met[a][b]++; st.met[b][a]++; return { a, b, t: 1, sub: [null, null], seen: [null, null], first: [null, null], res: null }; });
    st.phase = "meet";
    st.log.push({ i: st.seq++, k: "round", r: st.round, pairs: pairs.map(p => p.slice()), sit });
    settle(st);
  }
  function toSheet(st) { st.phase = "sheet"; st.pairs = []; st.sit = -1; st.log.push({ i: st.seq++, k: "sheet" }); }
  // 티켓이 없는 자리는 저절로 건너뛰기 · 둘 다 정했으면 처리 · 모두 끝났으면 결과 단계
  function settle(st) {
    if (st.phase !== "meet") return;
    for (let guard = 0; guard < 10; guard++) {
      let moved = false;
      for (const p of st.pairs) {
        if (p.res) continue;
        [p.a, p.b].forEach((s, x) => { if (p.sub[x] == null && !totalTk(st.tk[s])) { p.sub[x] = "pass"; moved = true; } });
        if (p.sub[0] != null && p.sub[1] != null) { resolvePair(st, p); moved = true; }
      }
      if (!moved) break;
    }
    if (st.pairs.every(p => p.res)) st.phase = "show";
  }
  function resolvePair(st, p) {
    const [x, y] = p.sub, a = p.a, b = p.b;
    const e = { i: st.seq++, k: "meet", r: st.round, a, b, t: p.t, picks: [x, y] };
    if (x === "pass" || y === "pass") { p.res = "skip"; e.res = "skip"; }
    else if (x === y) {
      const c = calc(x, st.num[a], st.num[b], st.R);
      st.tk[a][x]--; st.tk[b][x]--;
      st.facts[a].push(mkFact(st.round, b, x, c)); st.facts[b].push(mkFact(st.round, a, x, c));
      p.res = "ok"; e.res = "ok"; e.tk = x; e.hint = c;
    } else if (p.t === 1) {
      p.seen = [y, x]; p.first = [x, y]; p.sub = [null, null]; p.t = 2;
      st.log.push({ i: st.seq++, k: "miss", r: st.round, a, b, picks: [x, y] });
      return;
    } else { st.tk[a][x]--; st.tk[b][y]--; p.res = "fail"; e.res = "fail"; }
    st.log.push(e);
  }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "sheet") return st.sheets.map((x, s) => (x ? -1 : s)).filter(s => s >= 0);
    if (st.phase !== "meet") return [];
    const o = []; for (const p of st.pairs) if (!p.res) { if (p.sub[0] == null) o.push(p.a); if (p.sub[1] == null) o.push(p.b); }
    return o.sort((a, b) => a - b);
  };
  const over = st => !!st.over;
  const pairOf = (st, s) => st.pairs.find(p => p.a === s || p.b === s) || null;
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "sheet") return [{ t: "sheet", g: Array(st.n).fill(null) }];
    return KINDS.filter(k => st.tk[seat][k] > 0).map(k => ({ t: "pick", k })).concat([{ t: "pick", k: "pass" }]);
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 낼 수 없어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동이 이상해요" };
    if (st.phase === "sheet") {
      if (a.t !== "sheet" || !Array.isArray(a.g) || a.g.length !== st.n) return { ok: false, err: "답안지를 채워요" };
      for (const v of a.g) if (v != null && !(Number.isInteger(v) && v >= 1 && v <= st.R)) return { ok: false, err: `번호는 1~${st.R} 사이예요` };
      st.sheets[seat] = a.g.map(v => (v == null ? null : v));
      if (st.sheets.every(x => x)) finish(st);
      return { ok: true };
    }
    if (a.t !== "pick" || !(a.k === "pass" || KINDS.includes(a.k))) return { ok: false, err: "티켓을 골라요" };
    if (a.k !== "pass" && !(st.tk[seat][a.k] > 0)) return { ok: false, err: "그 티켓이 없어요" };
    const p = pairOf(st, seat); if (!p || p.res) return { ok: false, err: "이번 라운드는 쉬어요" };
    const x = p.a === seat ? 0 : 1; if (p.sub[x] != null) return { ok: false, err: "이미 냈어요" };
    p.sub[x] = a.k; settle(st);
    return { ok: true };
  }
  function scoreSheets(st) {
    const n = st.n, det = [];
    for (let i = 0; i < n; i++) {
      let own = 0, oth = 0, hits = 0;
      for (let j = 0; j < n; j++) { const g = st.sheets[i][j]; if (g == null) continue; const hit = g === st.num[j]; if (hit) hits++; if (j === i) own = hit ? 5 : -5; else oth += hit ? 1 : -1; }
      const bonus = hits === n ? 5 : 0; let pen = 0; for (let j = 0; j < n; j++) if (j !== i && st.sheets[j][i] === st.num[i]) pen++;
      det.push({ own, oth, bonus, pen, hits, total: own + oth + bonus - pen });
    }
    return det;
  }
  function finish(st) {
    st.detail = scoreSheets(st); st.score = st.detail.map(d => d.total);
    st.over = true; st.phase = "end"; st.end = "sheet";
    st.log.push({ i: st.seq++, k: "end", num: st.num.slice(), sheets: clone(st.sheets), detail: clone(st.detail) });
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 4200 : null);
  function advance(st) { if (st.over || st.phase !== "show") return; startRound(st); }
  const ranks = st => (st.over ? st.score.map(x => st.score.filter(y => y > x).length) : Array(st.n).fill(0));

  // ── 보이는 것 ──
  const hintText = c => (c.v != null ? String(c.v) : `${c.lo}~${c.hi}`);
  function pubLog(e, me, full) {
    if (e.k === "meet") {
      const mine = e.a === me || e.b === me;
      if (full || mine) return clone(e);
      return { i: e.i, k: "meet", r: e.r, a: e.a, b: e.b, res: e.res };
    }
    if (e.k === "miss") return full || e.a === me || e.b === me ? clone(e) : { i: e.i, k: "miss", r: e.r, a: e.a, b: e.b };
    return clone(e);
  }
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all", full = isAll || st.over;
    const pairs = st.pairs.map(p => ({ a: p.a, b: p.b, t: p.t, res: p.res, sub: [p.sub[0] != null, p.sub[1] != null] }));
    const subbed = st.sheets.map(x => !!x);
    const pubObj = { r: st.round, p: st.phase, pr: pairs, sit: st.sit, sb: subbed, ov: st.over };
    const V = { n: st.n, R: st.R, rounds: st.opt.rounds, sets: st.opt.sets, round: st.round, phase: st.phase, seat: me, pairs, sit: st.sit, subbed,
      needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), score: st.over ? st.score.slice() : Array(st.n).fill(0), cuts: cuts(st.R),
      log: st.log.map(e => pubLog(e, me, full)), pub: hash(JSON.stringify(pubObj)).toString(36), mine: null, mySheet: null, nums: null, sheets: null, detail: null, all: null };
    if (me >= 0) {
      const p = pairOf(st, me), x = p ? (p.a === me ? 0 : 1) : -1;
      V.mine = { tk: Object.assign({}, st.tk[me]), facts: clone(st.facts[me]), mate: p ? (x === 0 ? p.b : p.a) : -1, pick: p && !p.res ? p.sub[x] : null, seen: p && !p.res ? p.seen[x] : null, first: p && !p.res ? p.first[x] : null, t: p ? p.t : 0, res: p ? p.res : null };
      V.mySheet = st.sheets[me] ? st.sheets[me].slice() : null;
    }
    if (full) { V.nums = st.num.slice(); V.sheets = clone(st.sheets); V.detail = st.over ? clone(st.detail) : null; }
    if (isAll) V.all = { tk: clone(st.tk), facts: clone(st.facts), picks: st.pairs.map(p => p.sub.slice()) };
    return V;
  }

  // ── AI (보이는 것만으로: 내 힌트 → 내 번호 · 만난 사람 번호의 확률) ──
  const PROF = {
    easy: { samples: 0, thr: 0, thrO: 0 },
    normal: { samples: 3, thr: 0.2, thrO: 0.2, noise: 1.2 },
    hard: { samples: 10, thr: 0.5, thrO: 0.5, noise: 0 },
  };
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.phase, V.mine && V.mine.facts, V.mine && V.mine.tk, V.mine && V.mine.seen, V.mine && V.mine.t, V.mine && V.mine.mate]));
  const availKinds = V => KINDS.filter(k => V.mine.tk[k] > 0);
  // 티켓마다 '이 티켓을 쓰면 내 번호 후보가 평균 몇 개 남나' (같은 가상 표본으로 모두 비교)
  function pickRows(V, S, rr) {
    const me = V.seat, m = V.mine, R = V.R, base = posterior(m.facts, R), mate = m.mate, ks = availKinds(V);
    const py = mate >= 0 && base.py[mate] ? base.py[mate] : null, W = R + 1, uni = new Float64Array(W).fill(1 / R); uni[0] = 0;
    const smp = [];
    for (let i = 0; i < S; i++) { const x = sampleOf(base.px, R, rr()); let y = sampleOf(py || uni, R, rr()); if (y === x) y = x % R + 1; smp.push([x, y]); }
    const rows = ks.map(k => {
      let tot = 0;
      for (const [x, y] of smp) { const f = mkFact(V.round, mate, k, calc(k, x, y, R)); tot += effOf(posterior(m.facts.concat([f]), R).px, R); }
      return { k, eff: tot / smp.length };
    });
    return { rows, cur: sumOf(base.px, R), mate };
  }
  function aiPick(V, s, P, rnd) {
    const m = V.mine, ks = availKinds(V);
    if (!ks.length || m.mate < 0) return { t: "pick", k: "pass" };
    const R0 = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (m.t === 2 && m.seen) {            // 서로 다른 티켓을 냈음 — 한쪽이 맞춰 줘야 함: 종류 순서(더하기 · 곱하기 · 나누기 · 영)가 앞선 티켓을 낸 쪽은 그대로, 뒤선 쪽이 맞춰 줌
      const keep = m.first, theirs = m.seen, mineFirst = KINDS.indexOf(keep) < KINDS.indexOf(theirs);
      if (P === PROF.easy) return { t: "pick", k: R0() < 0.5 && m.tk[theirs] > 0 ? theirs : ks[Math.floor(R0() * ks.length)] };
      if (!mineFirst && m.tk[theirs] > 0) return { t: "pick", k: theirs };
      if (P === PROF.normal && R0() < 0.3 && m.tk[theirs] > 0) return { t: "pick", k: theirs };
      return { t: "pick", k: ks.includes(keep) ? keep : ks[0] };
    }
    if (!P.samples) { if (R0() < 0.1) return { t: "pick", k: "pass" }; return { t: "pick", k: ks[Math.floor(R0() * ks.length)] }; }
    const { rows } = pickRows(V, P.samples, seeded(keyV(V, s) ^ 0x5bd1));
    if (P.noise) for (const r of rows) r.eff *= 1 + (R0() - 0.5) * 2 * P.noise;
    rows.sort((a, b) => a.eff - b.eff || KINDS.indexOf(a.k) - KINDS.indexOf(b.k));
    return { t: "pick", k: rows[0].k };
  }
  // 답안지: 확률이 문턱 이상인 칸만 적고 나머지는 비움
  function sheetRows(V, s) {
    const R = V.R, n = V.n, post = posterior(V.mine.facts, R), rows = [];
    for (let j = 0; j < n; j++) {
      const p = j === s ? post.px : post.py[j];
      if (!p) { rows.push({ j, top: 0, p: 0, cnt: R }); continue; }
      const sm = sumOf(p, R); rows.push({ j, top: sm.top, p: sm.p, cnt: sm.cnt });
    }
    return rows;
  }
  function aiSheet(V, s, P, rnd) {
    const R0 = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s) ^ 0x77) : rnd, n = V.n, R = V.R, g = Array(n).fill(null);
    if (!P.samples) { g[s] = 1 + Math.floor(R0() * R); for (let j = 0; j < n; j++) if (j !== s && R0() < 0.5) g[j] = 1 + Math.floor(R0() * R); return { t: "sheet", g }; }
    const rows = sheetRows(V, s);
    for (const r of rows) { const thr = r.j === s ? P.thr : P.thrO; if (r.top && r.p >= thr) g[r.j] = r.top; }
    return { t: "sheet", g };
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s) || !V.mine) return null;
    return V.phase === "sheet" ? aiSheet(V, s, P, rnd) : aiPick(V, s, P, rnd);
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s) || !V.mine) return null;
    const a = ai(V, s, "hard");
    if (V.phase === "sheet") return { a, rows: sheetRows(V, s), cur: sumOf(posterior(V.mine.facts, V.R).px, V.R) };
    const R = pickRows(V, PROF.hard.samples, seeded(keyV(V, s) ^ 0x5bd1));
    return { a, rows: R.rows.slice().sort((x, y) => x.eff - y.eff), cur: R.cur };
  }
  // 복기 · 📒: 내 수와 고급 AI 수의 값 (티켓 = 내 번호 후보 평균 수, 답안지 = 기대 점수)
  function expScore(V, s, g) {
    const post = posterior(V.mine.facts, V.R); let e = 0;
    for (let j = 0; j < V.n; j++) {
      const v = g[j]; if (v == null) continue; const p = j === s ? post.px : post.py[j], pr = p ? p[v] || 0 : 1 / V.R;
      e += (j === s ? 5 : 1) * (2 * pr - 1);
    }
    return e;
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA || !V.mine) return null;
    if (V.phase === "sheet") return myA.t === "sheet" && bestA.t === "sheet" ? { my: expScore(V, s, myA.g), best: expScore(V, s, bestA.g), kind: "sheet" } : null;
    const R = recommend(V, s); if (!R) return null;
    const f = a => { const r = R.rows.find(x => x.k === a.k); return r ? r.eff : a.k === "pass" ? R.cur.eff : null; };
    const my = f(myA), best = f(bestA); return my == null || best == null ? null : { my, best, cur: R.cur.eff, kind: "pick" };
  }

  return { id: "secretnum", KINDS, KN, OPTS, PROF, optsOf, rangeOf, cuts, calc, match, mkFact, hintText, posterior, sumOf, effOf, ent, pickRows, sheetRows, expScore, scoreSheets, totalTk,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge };
});

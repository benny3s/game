/* 베니 서바이벌 · 수식 신호등 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 7일차 결승 3회전 '수식 신호등' (나무위키 '룰' 절 기준, 2인)
   · 각자 9칸짜리 수식 1개를 비공개로 만들어 냄. 숫자 0-9 · 기호 + - × ÷ = ^ 를 중복해서 쓸 수 있고, 올바르게 성립해야 함.
     기호끼리 이웃할 수 없고 (= 옆에도 숫자만), 곱셈 생략 없음, ^ 뒤에는 숫자, 두 자리 이상 수는 0 으로 시작 못 함.
   · 라운드마다 둘이 동시에 상대 수식을 9칸으로 추측 (성립하지 않아도 됨) → 칸마다 색 힌트:
     빨강 = 정답에 없음 / 노랑 = 있지만 자리가 다름 / 초록 = 그 자리 맞음.
     정답에 1개만 있는 글자를 추측에서 2개 이상 썼으면 그중 하나만 노랑·초록, 나머지는 빨강.
   · 상대 수식을 먼저 맞힌 쪽이 승리.
   확인 못 한 점(우리가 정함): ① 시간 제한 없음 ② 같은 라운드에 둘 다 맞히면 무승부, 20라운드까지 아무도 못 맞혀도 무승부
     ③ 계산 순서는 ^ → × ÷ → + - (나누기는 분수까지 정확히 계산), 수는 천만 미만 · 지수는 24 이하 (계산 중간값에도 적용), 0^0 은 안 됨
     ④ '앞자리 0 금지' 는 두 자리 이상 수에만 (0 한 글자는 가능) ⑤ = 는 정확히 하나, 양쪽 모두 식 가능(3+4=2+5 같은 꼴도 됨) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).eqlight = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LEN = 9, MAXR = 20, BOUND = 1e7;
  const DIG = "0123456789", OPS = "+-×÷^", ALPHA = DIG + OPS + "=";
  const isD = c => c >= "0" && c <= "9", isO = c => OPS.indexOf(c) >= 0;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function mkr(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 수식 계산 (분수까지 정확히) ─────────────────────────────
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  const frac = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const big = f => Math.abs(f[0]) >= BOUND || f[1] >= BOUND;
  const fmt = f => (f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);
  const TOOBIG = "수가 너무 커요 (천만 미만)";

  // 한쪽 식: 성공 → [분자, 분모], 실패 → 오류 글
  function evalSide(s) {
    if (!s.length) return "식이 비어 있어요";
    const nums = [], ops = [];
    let i = 0;
    while (i < s.length) {
      if (!isD(s[i])) return s[i] === "=" ? "= 옆에는 숫자만 올 수 있어요" : i === 0 ? "숫자로 시작해야 해요" : "기호는 이웃해서 쓸 수 없어요";
      let j = i; while (j < s.length && isD(s[j])) j++;
      const t = s.slice(i, j);
      if (t.length > 1 && t[0] === "0") return "두 자리 이상 수는 0 으로 시작할 수 없어요";
      const v = +t; if (v >= BOUND) return TOOBIG;
      nums.push(v); i = j;
      if (i < s.length) {
        if (!isO(s[i])) return "기호는 이웃해서 쓸 수 없어요";
        ops.push(s[i]); i++;
        if (i >= s.length) return "숫자로 끝나야 해요";
      }
    }
    // ^ (오른쪽 결합) 먼저
    const terms = [], tops = [];
    let k = 0;
    while (k < nums.length) {
      let e = k; while (e < ops.length && ops[e] === "^") e++;
      let v = nums[e];
      for (let m = e - 1; m >= k; m--) {
        if (v < 0 || v > 24) return "지수가 너무 커요 (24 이하)";
        if (nums[m] === 0 && v === 0) return "0^0 은 쓸 수 없어요";
        v = Math.pow(nums[m], v); if (v >= BOUND) return TOOBIG;
      }
      terms.push(v); if (e < ops.length) tops.push(ops[e]);
      k = e + 1;
    }
    // × ÷ 다음 + -
    const vals = [], vops = [];
    let acc = [terms[0], 1];
    for (let m = 0; m < tops.length; m++) {
      const o = tops[m], x = terms[m + 1];
      if (o === "+" || o === "-") { vals.push(acc); vops.push(o); acc = [x, 1]; continue; }
      if (o === "×") acc = frac(acc[0] * x, acc[1]);
      else { if (x === 0) return "0 으로 나눌 수 없어요"; acc = frac(acc[0], acc[1] * x); }
      if (big(acc)) return TOOBIG;
    }
    vals.push(acc);
    let r = vals[0];
    for (let m = 0; m < vops.length; m++) {
      const y = vals[m + 1];
      r = vops[m] === "+" ? frac(r[0] * y[1] + y[0] * r[1], r[1] * y[1]) : frac(r[0] * y[1] - y[0] * r[1], r[1] * y[1]);
      if (big(r)) return TOOBIG;
    }
    return r;
  }
  // 9칸 수식이 규칙에 맞는지
  function checkEq(s) {
    if (typeof s !== "string" || s.length !== LEN) return { ok: false, err: "9칸을 모두 채워요" };
    for (let i = 0; i < LEN; i++) if (ALPHA.indexOf(s[i]) < 0) return { ok: false, err: "쓸 수 없는 글자가 있어요" };
    const p = s.indexOf("=");
    if (p < 0) return { ok: false, err: "= 가 하나 있어야 해요" };
    if (s.indexOf("=", p + 1) >= 0) return { ok: false, err: "= 는 하나만 쓸 수 있어요" };
    const L = evalSide(s.slice(0, p)), R = evalSide(s.slice(p + 1));
    if (typeof L === "string") return { ok: false, err: "= 왼쪽: " + L };
    if (typeof R === "string") return { ok: false, err: "= 오른쪽: " + R };
    if (L[0] * R[1] !== R[0] * L[1]) return { ok: false, err: `양쪽이 달라요 (${fmt(L)} ≠ ${fmt(R)})` };
    return { ok: true, p, v: fmt(L) };
  }
  const validGuess = g => typeof g === "string" && g.length === LEN && [...g].every(c => ALPHA.indexOf(c) >= 0);

  // 색 힌트: g 초록 · y 노랑 · r 빨강 (같은 글자가 정답에 모자라면 남는 것은 빨강)
  function feedback(g, s) {
    const f = Array(LEN).fill("r"), left = {};
    for (let i = 0; i < LEN; i++) { if (g[i] === s[i]) f[i] = "g"; else left[s[i]] = (left[s[i]] || 0) + 1; }
    for (let i = 0; i < LEN; i++) if (f[i] !== "g" && left[g[i]] > 0) { f[i] = "y"; left[g[i]]--; }
    return f.join("");
  }

  // ── 상태 ────────────────────────────────────────────────────
  function init({ seed }) {
    return { n: 2, rs: (seed >>> 0) || 1, log: [], seq: 0, over: false, final: null, phase: "set", round: 0,
      secret: [null, null], guesses: [[], []], pend: [null, null], res: null };
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "set") return [0, 1].filter(s => !st.secret[s]);
    if (st.phase === "guess") return [0, 1].filter(s => !st.pend[s]);
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "set") {
      if (a.t !== "set") return { ok: false, err: "수식을 만들어 내요" };
      const c = checkEq(a.eq);
      if (!c.ok) return { ok: false, err: c.err };
      st.secret[seat] = a.eq; push(st, { k: "set", s: seat });
      if (st.secret[0] && st.secret[1]) { st.phase = "guess"; st.round = 1; push(st, { k: "round", r: 1 }); }
      return { ok: true };
    }
    if (a.t !== "guess") return { ok: false, err: "추측을 적어 내요" };
    if (!validGuess(a.g)) return { ok: false, err: "9칸을 모두 채워요" };
    st.pend[seat] = a.g; push(st, { k: "sent", s: seat });
    if (st.pend[0] && st.pend[1]) resolve(st);
    return { ok: true };
  }
  function resolve(st) {
    const hit = [false, false], recs = [];
    for (let s = 0; s < 2; s++) {
      const g = st.pend[s], f = feedback(g, st.secret[1 - s]);
      hit[s] = f === "ggggggggg";
      const rec = { g, f, r: st.round };
      st.guesses[s].push(rec); recs.push(rec);
      push(st, { k: "guess", s, g, f, r: st.round });
    }
    st.pend = [null, null];
    st.res = { r: st.round, hit };
    if (hit[0] || hit[1]) return finish(st, hit[0] && hit[1] ? -1 : hit[0] ? 0 : 1, hit[0] && hit[1] ? "both" : "solved");
    if (st.round >= MAXR) return finish(st, -1, "cap");
    st.round++; push(st, { k: "round", r: st.round });
  }
  function finish(st, winner, why) {
    st.final = { winner, why, ranks: winner < 0 ? [0, 0] : winner === 0 ? [0, 1] : [1, 0] };
    st.over = true; st.phase = "end"; push(st, { k: "over", winner, why });
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : [0, 0]);
  const auto = () => null;
  function advance() { /* 자동으로 넘길 것 없음 */ }

  // ── 보이는 것 ───────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || seat === -1 || seat === undefined || seat === null, me = all ? -1 : seat;
    const pubObj = { ph: st.phase, r: st.round, set: st.secret.map(Boolean), sent: st.pend.map(Boolean), g: st.guesses, sec: st.over ? st.secret : null };
    return {
      n: 2, phase: st.phase, round: st.round, maxRound: MAXR,
      secretSet: st.secret.map(Boolean), mine: me >= 0 ? st.secret[me] : null,
      sent: st.pend.map(Boolean), mySent: me >= 0 ? st.pend[me] : null,
      guesses: st.guesses.map(a => a.map(x => ({ ...x }))),
      secrets: st.over ? st.secret.slice() : null,
      res: st.res ? { r: st.res.r, hit: st.res.hit.slice() } : null,
      needs: needs(st), over: st.over, ranks: st.final ? st.final.ranks.slice() : null,
      winner: st.final ? st.final.winner : null, why: st.final ? st.final.why : null,
      score: [0, 0], log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 수식 만들기 · 후보 찾기 (AI · 선생님 · 예시) ────────────────
  const pick = (a, r) => a[Math.floor(r() * a.length)];
  // 제약: 지금까지 힌트(hist = [{g, f}])를 한 번에 쓸 수 있게 정리
  function cons(hist) {
    const fix = Array(LEN).fill(null), ban = Array.from({ length: LEN }, () => new Set()), min = {}, max = {};
    for (const { g, f } of hist) {
      const cnt = {}, red = {};
      for (let i = 0; i < LEN; i++) {
        const c = g[i];
        if (f[i] === "g") { fix[i] = c; cnt[c] = (cnt[c] || 0) + 1; }
        else if (f[i] === "y") { ban[i].add(c); cnt[c] = (cnt[c] || 0) + 1; }
        else { ban[i].add(c); red[c] = true; }
      }
      for (const c in cnt) min[c] = Math.max(min[c] || 0, cnt[c]);
      for (const c in red) max[c] = Math.min(max[c] === undefined ? 99 : max[c], cnt[c] || 0);
    }
    return { fix, ban, min, max, eqAt: fix.indexOf("=") };
  }
  const consistent = (s, hist) => { for (const h of hist) if (feedback(h.g, s) !== h.f) return false; return true; };
  const mismatch = (s, hist) => { let m = 0; for (const h of hist) { const f = feedback(h.g, s); for (let i = 0; i < LEN; i++) if (f[i] !== h.f[i]) m++; } return m; };

  // 숫자·기호가 번갈아 나오는 식 한 덩어리를 무작위로 짓기 (제약 K 가 있으면 지키며)
  function walkExpr(len, p0, K, r, o, cnt) {
    const ops = (o && o.ops) || OPS, maxNum = (o && o.maxNum) || 6;
    let s = "", prev = 0, numLen = 0, zero = false;
    for (let k = 0; k < len; k++) {
      const p = p0 + k, last = k === len - 1;
      const okc = c => {
        if (!K) return true;
        if (K.fix[p] && K.fix[p] !== c) return false;
        if (K.ban[p].has(c)) return false;
        const mx = K.max[c]; if (mx !== undefined && (cnt[c] || 0) >= mx) return false;
        return true;
      };
      const ds = [], os = [];
      if (!(prev === 1 && (zero || numLen >= maxNum))) for (const c of DIG) if (okc(c)) ds.push(c);
      if (prev === 1 && !last) for (const c of ops) if (okc(c)) os.push(c);
      if (!ds.length && !os.length) return null;
      let pool = ds.length && os.length ? (r() < 0.34 ? os : ds) : ds.length ? ds : os;
      if (K && r() < 0.55) {
        const nd = pool.filter(c => K.min[c] > (cnt[c] || 0));
        if (nd.length) pool = nd; else { const all = ds.concat(os).filter(c => K.min[c] > (cnt[c] || 0)); if (all.length) pool = all; }
      }
      const c = pick(pool, r);
      cnt[c] = (cnt[c] || 0) + 1;
      if (isD(c)) { if (prev === 1) numLen++; else { numLen = 1; zero = c === "0"; } prev = 1; } else prev = 2;
      s += c;
    }
    return s;
  }
  // 한 번 시도: "식=숫자" · "숫자=식" 꼴(대부분) 또는 양쪽 식(가끔)
  function tryGen(K, r, o) {
    const cnt = { "=": 1 };
    if (r() < 0.2) {                                            // 양쪽 모두 식: 왼쪽을 먼저 짓고, 같은 값이 나오는 오른쪽을 여러 번 찾아봄
      const lens = []; for (let p = 3; p <= 5; p++) if (!K || ((!K.fix[p] || K.fix[p] === "=") && !K.ban[p].has("=") && (K.eqAt < 0 || K.eqAt === p))) lens.push(p);
      if (!lens.length) return null;
      const p = pick(lens, r), cnt0 = { ...cnt };
      const A = walkExpr(p, 0, K, r, o, cnt0); if (A === null) return null;
      const x = evalSide(A); if (typeof x === "string") return null;
      for (let t = 0; t < 10; t++) {
        const c2 = { ...cnt0 };
        const B = walkExpr(8 - p, p + 1, K, r, o, c2); if (B === null) return null;
        const y = evalSide(B);
        if (typeof y !== "string" && x[0] * y[1] === y[0] * x[1]) return A + "=" + B;
      }
      return null;
    }
    const left = r() < 0.5;                                      // true: 식=숫자
    const lens = [];
    for (let lE = 3; lE <= 7; lE++) {
      const p = left ? lE : 8 - lE;
      if (K && !((!K.fix[p] || K.fix[p] === "=") && !K.ban[p].has("=") && (K.eqAt < 0 || K.eqAt === p))) continue;
      lens.push(lE);
    }
    if (!lens.length) return null;
    const lE = pick(lens, r), m = 8 - lE;
    const E = walkExpr(lE, left ? 0 : m + 1, K, r, o, cnt); if (E === null) return null;
    const v = evalSide(E);
    if (typeof v === "string" || v[1] !== 1 || v[0] < 0) return null;
    const N = String(v[0]); if (N.length !== m) return null;
    return left ? E + "=" + N : N + "=" + E;
  }
  const O_SECRET = { easy: { ops: "+-×", maxNum: 2 }, normal: { ops: "+-×÷", maxNum: 3 }, hard: { ops: OPS, maxNum: 4 } };
  const O_FIND = { ops: OPS, maxNum: 6 };
  const distinct = s => new Set(s).size;
  // 성립하는 9칸 수식 하나 (tier 가 높을수록 ÷ ^ · 여러 글자가 섞인 것을 고름)
  function sample(r, tier) {
    const o = O_SECRET[tier] || O_SECRET.normal, tries = tier === "hard" ? 10 : tier === "normal" ? 4 : 1;
    let best = null, bs = -1;
    for (let t = 0; t < tries; t++) {
      let s = null;
      for (let a = 0; a < 4000 && !s; a++) s = tryGen(null, r, o);
      if (!s) continue;
      const sc = distinct(s) + (/[÷^]/.test(s) ? 1.5 : 0) + r() * 0.5;
      if (sc > bs) { bs = sc; best = s; }
    }
    return best || pick(["12+3×4=24", "9×8-7=65", "81÷9+5=14", "6×7+8=50", "2^5+4=36"].filter(x => x.length === LEN).concat(["12+3×4=24"]), r);
  }
  // 지금까지 힌트를 모두 만족하는 수식 후보 (최대 want 개, 시도 횟수 attempts)
  function findCands(hist, r, want, attempts) {
    const K = hist.length ? cons(hist) : null, out = [], seen = new Set();
    for (let a = 0; a < attempts && out.length < want; a++) {
      const s = tryGen(K, r, O_FIND);
      if (s && !seen.has(s) && (!K || consistent(s, hist))) { seen.add(s); out.push(s); }
    }
    return out;
  }
  // 후보가 하나도 없을 때(양쪽 식 같은 드문 꼴): 힌트와 가장 덜 어긋나는 수식
  function bestEffort(hist, r) {
    let best = null, bm = 1e9;
    for (let a = 0; a < 500; a++) {
      const s = tryGen(null, r, O_FIND); if (!s) continue;
      const m = mismatch(s, hist) + r() * 0.1; if (m < bm) { bm = m; best = s; }
    }
    return best || sample(r, "normal");
  }
  function bestSplit(c, r, pool) {
    if (c.length <= 2) return pick(c, r);
    // 후보들을 가장 잘게 가르는 추측 — 같은 힌트로 묶이는 후보 수의 제곱합이 작을수록 좋음 (맞을 가능성이 있는 후보는 약간 가산)
    const P = pool || c;
    let best = null, bs = Infinity;
    for (const x of c) {
      const m = new Map();
      for (const y of P) { const f = feedback(x, y); m.set(f, (m.get(f) || 0) + 1); }
      let ss = 0; for (const v of m.values()) ss += v * v;
      const sc = ss / P.length - (P.includes(x) ? 0.5 : 0) + r() * 0.01;
      if (sc < bs) { bs = sc; best = x; }
    }
    return best;
  }
  function nextGuess(hist, r, tier) {
    if (!hist.length) {                                          // 첫 추측: 글자가 골고루 섞인 수식
      if (tier === "hard") {                                     // 후보 40개를 가장 잘게 가르는 첫 추측
        const pool = []; for (let t = 0; t < 40; t++) { const s = tryGenN(r); if (s) pool.push(s); }
        if (pool.length > 4) return { g: bestSplit(pool, r, pool), n: 0, why: "first" };
      }
      const k = tier === "hard" ? 12 : tier === "normal" ? 5 : 1; let best = null, bs = -1;
      for (let t = 0; t < k; t++) { const s = tryGenN(r); if (!s) continue; const sc = distinct(s) + r() * 0.3; if (sc > bs) { bs = sc; best = s; } }
      return { g: best || sample(r, "normal"), n: 0, why: "first" };
    }
    const use = tier === "easy" ? hist.slice(-2) : hist;
    const want = tier === "hard" ? 30 : 1, att = tier === "hard" ? 8000 : tier === "normal" ? 45000 : 12000;
    const c = findCands(use, r, want, att);
    if (!c.length) return { g: bestEffort(use, r), n: 0, why: "none" };
    return { g: want > 1 ? bestSplit(c, r) : c[0], n: c.length, why: "cand" };
  }
  function tryGenN(r) { for (let a = 0; a < 4000; a++) { const s = tryGen(null, r, O_FIND); if (s) return s; } return null; }

  function ai(V, me, tier, r) {
    if (V.phase === "set") return { t: "set", eq: sample(r, tier) };
    if (V.phase !== "guess" || V.mySent) return null;
    return { t: "guess", g: nextGuess(V.guesses[me], r, tier).g };
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const r = mkr(st.rs + seat * 977 + st.round * 31 + st.log.length);
    const out = [];
    for (let i = 0; i < 3; i++) out.push(st.phase === "set" ? { t: "set", eq: sample(r, "normal") } : { t: "guess", g: sample(r, "normal") });
    return out;
  }

  // ── AI 선생님 ───────────────────────────────────────────────
  let nextCache = { key: "", val: null };                          // 선생님이 화면을 그릴 때마다 다시 계산하지 않게 마지막 답을 기억
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const raw = i => String((names && names[i]) || `${i + 1}번`);
    const nm = i => esc(raw(i));
    const jo = (i, a, b) => { const s = raw(i), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? ((c - 0xAC00) % 28 ? a : b) : `${a}(${b})`; };
    const you = 1 - me;
    const mine = me >= 0 ? V.guesses[me] : [], theirs = me >= 0 ? V.guesses[you] : [];
    const greens = a => a.reduce((m, x) => Math.max(m, [...x.f].filter(c => c === "g").length), 0);
    const opp = V.phase === "set" ? `${nm(you)}${V.secretSet[you] ? `${jo(you, "은", "는")} 수식을 다 만들었어요` : `${jo(you, "이", "가")} 수식을 만드는 중이에요`}.`
      : `${nm(you)}${jo(you, "은", "는")} ${theirs.length}번 추측했고, 가장 가까운 추측은 초록 ${greens(theirs)}칸이에요${theirs.length && V.over ? "" : " (내 수식에 대한 힌트)"}.`;
    if (V.over) {
      const w = V.winner;
      return { opp, mine: `내 추측 ${mine.length}번 · 가장 좋았던 건 초록 ${greens(mine)}칸`, rec: w < 0 ? "🤝 무승부예요" : w === me ? "🏆 상대 수식을 먼저 맞혔어요!" : "아쉽게 졌어요", why: "" };
    }
    const r = mkr(7 + V.round * 13 + me * 5 + mine.length);
    if (V.phase === "set") {
      const s = sample(r, "hard");
      return { opp, mine: "내 수식을 상대가 맞혀야 해요. 성립해야 제출돼요.", rec: V.needs.includes(me) ? `예: ${s}` : "상대를 기다려요",
        why: "÷ · ^ 가 들어가고 서로 다른 글자가 많을수록 맞히기 어려워요. 계산 순서는 ^ → × ÷ → + - 예요." };
    }
    const K = cons(mine);
    const pat = [...Array(LEN).keys()].map(i => K.fix[i] || "·").join(" ");
    const absent = Object.keys(K.max).filter(c => K.max[c] === 0).join(" "), there = Object.keys(K.min).filter(c => K.min[c] > 0 && !K.fix.includes(c)).join(" ");
    const info = mine.length ? `확정 칸: ${pat}${absent ? ` · 없는 글자: ${absent}` : ""}${there ? ` · 자리만 모르는 글자: ${there}` : ""}` : "아직 힌트가 없어요. 첫 추측으로 글자를 골고루 확인해 봐요.";
    if (!V.needs.includes(me)) return { opp, mine: info, rec: "상대를 기다려요", why: "" };
    const ckey = me + "|" + mine.map(x => x.g + x.f).join("|");
    const c = nextCache.key === ckey ? nextCache.val : (nextCache = { key: ckey, val: nextGuess(mine, r, "hard") }).val;
    const why = c.why === "first" ? "성립하는 수식 중 서로 다른 숫자 · 기호가 많은 것이 첫 힌트를 가장 많이 줘요."
      : c.why === "cand" ? `지금까지 힌트를 모두 만족하는 수식이에요 (찾아본 후보 중 힌트를 가장 잘 가르는 것). 🟩은 그대로, 🟨은 다른 칸으로, 🟥 글자는 빼요.`
        : "힌트를 모두 만족하는 수식을 못 찾았어요. 가장 덜 어긋나는 수식이에요 — 상대 수식이 = 양쪽에 계산이 있는 꼴일 수 있어요.";
    return { opp, mine: info, rec: c.g, why };
  }

  return { id: "eqlight", LEN, MAXR, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, checkEq, feedback, evalSide, sample, findCands, nextGuess, cons, consistent, validGuess, mkr };
});

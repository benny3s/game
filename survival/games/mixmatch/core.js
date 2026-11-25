/* 베니 서바이벌 · 믹스 앤 매치 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌 3 · 파이널 매치 3라운드 '믹스 앤 매치' (3명) — 영상 자막 · 화면으로 확인
   · 디지털(7획) 숫자 두 개의 합을 맞히는 게임. 숫자는 최대 두 자릿수(십의 자리 · 일의 자리)
   · 매 라운드 노란 선이 그려진 카드가 3초 간격으로 한 장씩 모두 6장 (한 장은 이전 장이 사라진 뒤에 나옴)
   · 1 · 3 · 5번째 카드가 같은 숫자(첫째), 2 · 4 · 6번째 카드가 다른 숫자(둘째)를 이룸 — 세 장을 겹치면 그 숫자가 나타남
   · 두 숫자를 다 알아낸 플레이어는 '정답'을 외치고 두 숫자의 합을 말함. 맞으면 1점(그 라운드 끝), 틀리면 10초 동안 정답을 못 말함
   · 5라운드 뒤 승점이 더 높은 플레이어가 승리 (같으면 연장)
   화면 영상 분석: 카드 한 장 = 7칸 × 6칸 격자. 숫자 한 개 = 가로 2칸 · 세로 4칸, 획(a~g) 하나가 칸 변 2개 길이 →
     카드마다 '칸 변 한 개(반 획)' 단위로 점등, 세 장의 합집합 = 숫자 전체 (예: 방송 1라운드 26 + 93 = 119 를 화면에서 읽어 맞춤)
   우리 판 다듬기 (방송과 다른 점 · 방송 글에 없는 것):
   · 2~4명 (방송 3명) · 점수는 같고 · 5라운드(짧게 3라운드도 고를 수 있음) · 동점이면 연장 라운드(최대 5번, 그래도 같으면 공동)
   · 카드는 '반 획' 단위로 무작위로 나눔(방송 확률은 알 수 없음, 화면에서 센 평균 겹침 1.3장에 맞춤) · 숫자는 1~99
   · 시계는 카드 한 장(3초)마다 한 번씩 '말할래요? 기다려요' 로 끊어 처리 — 같은 3초 안에 여럿이 말하면 눌린 시각(0.1초)이 빠른 순서
   · 카드가 6장 나온 뒤에도 3초씩 더 지켜봄(최대 30초) — 아무도 못 맞히면 그 라운드는 점수 없음
   · 시계는 화면(UI)이 잼: 카드 3초가 지나도 안 말하면 화면이 '기다려요' 를 대신 내고, '정답!' 을 누른 시각(0.1초)이 행동의 ms 로 들어옴
     (core 는 시계가 없어 같은 씨앗 · 같은 행동이면 같은 판 — 복기 가능). 연장 라운드는 모두 참가 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).mixmatch = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 5, CARDS = 6, STAGE = 3000, LOCK = 10000, TAIL = 10, MAXSTAGE = CARDS + TAIL, PI = 0.27, XMAX = 5;
  const SEGS = "abcdefg";
  const DIG = ["abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"];
  const DM = DIG.map(s => { let m = 0; for (const ch of s) m |= 1 << SEGS.indexOf(ch); return m; });
  const NU = 28;                                           // 카드 한 장의 칸 변 자리: 숫자 2개 × 7획 × 반 획 2
  // 칸 변 번호 = d*14 + si*2 + u  (d 0=십의 자리 · 1=일의 자리, si = a~g, u 0·1 = 반 획)
  const uid = (d, si, u) => d * 14 + si * 2 + u;
  function digitUnits(dig, d) { const o = []; for (let si = 0; si < 7; si++) if (DM[dig] >> si & 1) for (let u = 0; u < 2; u++) o.push(uid(d, si, u)); return o; }
  function unitsOf(n) { return (n >= 10 ? digitUnits(Math.floor(n / 10), 0) : []).concat(digitUnits(n % 10, 1)); }
  const MASK = new Array(100).fill(0);
  for (let n = 1; n <= 99; n++) { let m = 0; for (const i of unitsOf(n)) m |= 1 << i; MASK[n] = m; }
  const pc = x => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
  // 격자 좌표(칸 줄 번호): 가로 0~7 · 세로 0~6. 숫자 d 는 가로 L=1+3d ~ L+2, 세로 1~5
  function geom(i) {
    const d = i < 14 ? 0 : 1, r = i - d * 14, si = r >> 1, u = r & 1, L = 1 + 3 * d;
    if (si === 0) return [L + u, 1, L + u + 1, 1];            // a 위
    if (si === 3) return [L + u, 5, L + u + 1, 5];            // d 아래
    if (si === 6) return [L + u, 3, L + u + 1, 3];            // g 가운데
    if (si === 5) return [L, 1 + u, L, 2 + u];                // f 왼쪽 위
    if (si === 1) return [L + 2, 1 + u, L + 2, 2 + u];        // b 오른쪽 위
    if (si === 4) return [L, 3 + u, L, 4 + u];                // e 왼쪽 아래
    return [L + 2, 3 + u, L + 2, 4 + u];                      // c 오른쪽 아래
  }

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

  function pickNum(st) { return rnd(st) < 0.2 ? 1 + Math.floor(rnd(st) * 9) : 10 + Math.floor(rnd(st) * 90); }
  function genRound(st) {
    st.A = pickNum(st); st.B = pickNum(st);
    const cards = Array.from({ length: CARDS }, () => []);
    [st.A, st.B].forEach((n, w) => {
      for (const id of unitsOf(n)) {
        let m = 0, t = 0;
        do { m = 0; for (let j = 0; j < 3; j++) if (rnd(st) < PI) m |= 1 << j; } while (!m && ++t < 60);
        if (!m) m = 1 << Math.floor(rnd(st) * 3);
        for (let j = 0; j < 3; j++) if (m >> j & 1) cards[2 * j + w].push(id);
      }
    });
    cards.forEach(c => c.sort((x, y) => x - y));
    st.cards = cards;
  }

  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(4, (n | 0) || 3));
    const c = Object.assign({ rounds: ROUNDS, aid: 0 }, cfg || {});
    const sd = (seed == null ? 1 : seed) >>> 0;
    const st = { id: "mixmatch", n, seed: sd, cfg: c, rs: (Math.imul(sd, 2654435761) ^ 0x9E3779B9) >>> 0, round: 0, rounds: c.rounds === 3 ? 3 : ROUNDS, extra: 0,
      phase: "run", score: new Array(n).fill(0), hist: [], log: [], res: null };
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.stage = 1; st.phase = "run"; st.res = null;
    genRound(st);
    const order = Array.from({ length: st.n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    st.tb = new Array(st.n); order.forEach((s, k) => { st.tb[s] = k; });
    st.brn = Array.from({ length: st.n }, () => Math.round(rnd(st) * 1000) / 1000);
    st.lockT = new Array(st.n).fill(0); st.acted = new Array(st.n).fill(0); st.sub = [];
  }
  const T0 = st => STAGE * (st.stage - 1);
  function needs(st) {
    if (st.phase !== "run") return [];
    const t = T0(st), o = [];
    for (let s = 0; s < st.n; s++) if (!st.acted[s] && st.lockT[s] < t + STAGE) o.push(s);
    return o;
  }
  const lg = (st, o) => { st.log.push(Object.assign({ i: st.log.length }, o)); };

  function apply(st, seat, a) {
    if (st.phase !== "run") return { ok: false, err: "지금은 말할 때가 아니에요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "이번 카드에서는 말할 수 없어요" };
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (a.t === "wait") st.acted[seat] = 1;
    else if (a.t === "ans") {
      if (!Number.isInteger(a.sum) || a.sum < 0 || a.sum > 198) return { ok: false, err: "합은 0~198 사이예요" };
      let ms = Number.isFinite(a.ms) ? Math.floor(a.ms) : 0;
      ms = Math.floor(Math.max(0, Math.min(STAGE - 1, ms)) / 100) * 100;                 // 0.1초 단위
      ms = Math.max(ms, st.lockT[seat] - T0(st));
      st.acted[seat] = 1; st.sub.push({ s: seat, sum: a.sum, ms });
    } else return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).length) resolveStage(st);
    return { ok: true };
  }
  function resolveStage(st) {
    const t = T0(st), target = st.A + st.B;
    const sorted = st.sub.slice().sort((x, y) => x.ms - y.ms || st.tb[x.s] - st.tb[y.s]);
    let w = -1;
    for (const e of sorted) {
      const ok = e.sum === target;
      lg(st, { k: "ans", r: st.round, stage: st.stage, s: e.s, sum: e.sum, ok, ms: e.ms });
      if (ok) { w = e.s; break; }
      st.lockT[e.s] = t + e.ms + LOCK;
    }
    if (w >= 0) { st.score[w]++; endRound(st, w); return; }
    if (st.stage >= MAXSTAGE) { endRound(st, -1); return; }
    st.stage++; st.acted = new Array(st.n).fill(0); st.sub = [];
  }
  function endRound(st, w) {
    const res = { r: st.round, w, A: st.A, B: st.B, sum: st.A + st.B, stage: st.stage, extra: st.round > st.rounds };
    st.res = res; st.hist.push(res); st.phase = "between";
    lg(st, { k: "round", r: st.round, w, A: st.A, B: st.B });
  }
  function advance(st) {
    if (st.phase === "run") { if (!needs(st).length) resolveStage(st); return; }
    if (st.phase !== "between") return;
    const total = st.rounds + st.extra;
    if (st.round >= total) {
      const top = Math.max(...st.score), tied = st.score.filter(x => x === top).length > 1;
      if (tied && st.extra < XMAX) { st.extra++; startRound(st); return; }
      st.phase = "over"; return;
    }
    startRound(st);
  }
  const auto = st => (st.phase === "run" && !needs(st).length ? STAGE : st.phase === "between" ? 2800 : null);
  const over = st => st.phase === "over";
  function ranks(st) { return st.score.map(x => st.score.filter(y => y > x).length); }
  const legal = (st, seat) => (needs(st).includes(seat) ? [{ t: "wait" }] : []);
  const nvis = st => Math.min(st.stage, CARDS);

  function view(st, seat) {
    const all = seat === "all", t = T0(st);
    const run = st.phase === "run";
    const vis = run ? nvis(st) : CARDS;
    const V = {
      id: "mixmatch", seat, n: st.n, phase: st.phase, round: st.round, rounds: st.rounds, extra: st.extra, total: st.rounds + st.extra,
      stage: st.stage, maxStage: MAXSTAGE, stageMs: STAGE, lockMs: LOCK, nvis: vis,
      cards: st.cards.slice(0, vis).map(c => c.slice()), score: st.score.slice(),
      lockLeft: st.lockT.map(x => x - t), acted: st.acted.slice(), brn: st.brn.slice(),
      hist: st.hist.map(h => Object.assign({}, h)), last: st.res ? Object.assign({}, st.res) : null,
      needs: needs(st), over: over(st), aid: st.cfg.aid ? 1 : 0,
      log: st.log.map(e => Object.assign({}, e)),
    };
    if (run && all) { V.A = st.A; V.B = st.B; V.cards = st.cards.map(c => c.slice()); V.nvis = CARDS; }
    if (over(st)) V.ranks = ranks(st);
    V.pub = hash(JSON.stringify([V.phase, V.round, V.stage, V.score, V.lockLeft, V.acted, V.nvis, V.hist.length, V.log.length, V.over, V.cards.length]));
    return V;
  }

  // ── 단서로 숫자를 가려내기 (AI · 선생님 공용) — 보이는 카드만 씀 ──
  // 한 숫자: 켜진 칸 변 집합 L 을 본 카드 j 장(0~3)으로 알 때, 후보 a 는 L ⊆ 후보 모양 이어야 하고 아직 안 켜진 칸 변마다 F[j] 만큼 덜 그럴듯
  const Q = 1 - PI, ZZ = 1 - Q * Q * Q;
  const F = [1, Q * (1 - Q * Q) / ZZ, Q * Q * (1 - Q) / ZZ, 0];
  function postOne(L, j) {
    const w = new Array(100).fill(0); let tot = 0;
    for (let a = 1; a <= 99; a++) {
      const m = MASK[a];
      if (L & ~m) continue;
      const extra = pc(m & ~L);
      const x = (a < 10 ? 0.2 / 9 : 0.8 / 90) * (extra === 0 ? 1 : Math.pow(F[j], extra));
      w[a] = x; tot += x;
    }
    if (tot > 0) for (let a = 1; a <= 99; a++) w[a] /= tot;
    return w;
  }
  const wrongSums = V => ((V && V.log) || []).filter(e => e.k === "ans" && e.r === V.round && !e.ok).map(e => e.sum);   // 이번 라운드에 이미 틀린 합(공개)
  function analyze(cards, nc, excl) {
    nc = Math.max(0, Math.min(CARDS, nc == null ? cards.length : nc, cards.length));
    let LA = 0, LB = 0, jA = 0, jB = 0;
    for (let k = 0; k < nc; k++) {
      let m = 0; for (const i of cards[k]) m |= 1 << i;
      if (k % 2 === 0) { LA |= m; jA++; } else { LB |= m; jB++; }
    }
    const pa = postOne(LA, jA), pb = postOne(LB, jB), ps = new Array(199).fill(0);
    for (let a = 1; a <= 99; a++) if (pa[a] > 0) for (let b = 1; b <= 99; b++) if (pb[b] > 0) ps[a + b] += pa[a] * pb[b];
    if (excl) for (const x of excl) if (x >= 0 && x < 199) ps[x] = 0;                     // 틀린 것으로 밝혀진 합은 정답이 아님
    let tot = 0; for (let s = 0; s < 199; s++) tot += ps[s];
    if (tot > 0) for (let s = 0; s < 199; s++) ps[s] /= tot;
    let best = 0; for (let s = 1; s < 199; s++) if (ps[s] > ps[best]) best = s;
    const list = p => { const o = []; for (let a = 1; a <= 99; a++) if (p[a] > 1e-9) o.push({ a, p: p[a] }); return o.sort((x, y) => y.p - x.p || x.a - y.a); };
    return { nc, jA, jB, LA, LB, pa, pb, ps, best, p: ps[best], candA: list(pa), candB: list(pb) };
  }

  // ── AI (보이는 것만): 카드가 모일 때 합이 얼마나 확실한지 보고, 확신 서면 읽는 시간만큼 뒤에 말함 ──
  const TIER = {
    easy: { thr: 0.97, minStage: 6, d0: 5000, d1: 12000, err: 0.12 },
    normal: { thr: 0.9, minStage: 5, d0: 3500, d1: 8000, err: 0.04 },
    hard: { thr: 0.55, minStage: 4, d0: 1800, d1: 4500, err: 0.01 },
    coach: { thr: 0.6, minStage: 4, d0: 2500, d1: 2500, err: 0, fixed: true },
  };
  function ai(V, seat, tier, rnd0) {
    if (!V || !V.needs || !V.needs.includes(seat)) return null;
    const T = TIER[tier] || TIER.normal, s = V.stage, t0 = STAGE * (s - 1);
    const lockLeft = Math.max(0, (V.lockLeft && V.lockLeft[seat]) || 0);
    let first = -1;
    for (let k = T.minStage; k <= s; k++) { const an = analyze(V.cards, Math.min(k, CARDS)); if (an.p >= T.thr) { first = k; break; } }
    if (first < 0) return { t: "wait" };
    const br = T.fixed ? 0.5 : (V.brn && V.brn[seat] != null ? V.brn[seat] : 0.5);
    const ready = STAGE * (first - 1) + T.d0 + (T.d1 - T.d0) * br;
    if (ready >= t0 + STAGE) return { t: "wait" };
    const ms = Math.max(lockLeft, Math.floor(ready - t0), 0);
    if (ms >= STAGE) return { t: "wait" };
    const best = analyze(V.cards, Math.min(s, CARDS), wrongSums(V)).best;
    let sum = best;
    if (T.err && rnd0 && rnd0() < T.err) { const d = (rnd0() < 0.5 ? 1 : -1) * (rnd0() < 0.5 ? 1 : 10); sum = Math.max(0, Math.min(198, best + d)); if (sum === best) sum = best >= 198 ? 197 : best + 1; }
    return { t: "ans", sum, ms: Math.floor(ms / 100) * 100 };
  }

  return {
    id: "mixmatch", ROUNDS, CARDS, STAGE, LOCK, MAXSTAGE, XMAX, PI, NU, SEGS, DIG, MASK, TIER,
    init, needs, apply, view, over, ranks, ai, legal, auto, advance,
    unitsOf, geom, analyze, wrongSums, pc, uid,
  };
});

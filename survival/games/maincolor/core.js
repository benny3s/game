/* 베니 서바이벌 · 메인 컬러 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌 2 · 9일차 메인 매치 (7명). 나무위키 피의 게임2/9일차 문서(룰 5가지 · 각주 · 5라운드 기록)를 읽고 우리 말로 옮김.
   · 5라운드. 라운드마다 카드 뽑기 → 메인 컬러 투표 → 카드 제출. 모두 검정 · 하양 · 회색 중 무작위 8장을 비공개로 받음.
   · 투표: 각자 비밀로 색 하나. 가장 많이 받은 색이 메인 컬러, 동점이면 동점인 색 모두 메인 컬러.
   · 제출: 메인 컬러 카드를 내고 1장당 1점. 회색이 메인이면 검정 1장 + 하양 1장을 같이 내 회색 1장으로 칠 수 있음 (점수만 — 실제로 낸 카드는 2장).
   · 낸 뒤 남은 카드가 가장 적은 사람(= 메인 컬러를 가장 많이 낸 사람)은 그 라운드 0점. 같은 사람이 여럿이면 모두 0점 (각주). 라운드가 끝나면 카드는 모두 거둠 (교환 · 양도 불가).
   · 5라운드 합계가 가장 높은 사람이 승리.
   방송과 다른 점 (폰 · 인원 때문에 우리가 정함 — 목록 '방송과 다른 점' 에도 적음):
     ① 3~7명 (방송 7명). 짧게 3라운드 옵션.
     ② 카드 8장은 한 장마다 검정 · 하양 · 회색이 같은 확률 (방송은 딜러가 뽑는 덱 구성 비공개).
     ③ 아무도 카드를 안 내도 라운드는 끝 (모두 0점). 낼 카드가 없는 사람도 '0장 내기' 를 눌러야 함 (낼 카드가 있는지 없는지가 남에게 안 보이게).
     ④ 투표가 끝나면 색별 득표 수는 공개, 누가 무엇을 골랐는지는 비공개. 제출은 모두 정한 뒤 한꺼번에 공개 (낸 카드 색 · 장수).
     ⑤ 총점이 같으면 공동 순위. 피 · 개인자금 아이템 (추가 투표 · 카드 색 바꾸기) 없음. 협상 · 대화 없음.
   숨은 정보: 남의 손패 · 투표 · 제출 (공개 전까지). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).maincolor = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLS = ["검정", "하양", "회색"], CARDS = 8;
  const OPTS = { rounds: [5, 3] };
  function optsOf(cfg) { const v = cfg && cfg.rounds !== undefined ? +cfg.rounds : 5; return { rounds: OPTS.rounds.includes(v) ? v : 5 }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clone = o => JSON.parse(JSON.stringify(o));
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 400) st.log.shift(); }

  function init({ n, seed, cfg }) {
    cfg = cfg || {}; n = Math.max(3, Math.min(7, n | 0 || 5));
    const o = optsOf(cfg), rs = (seed >>> 0) || 1;
    const st = { n, rs, cfg: Object.assign({}, cfg), opt: o, rounds: o.rounds, round: 0, phase: "vote", hands: [], vote: Array(n).fill(null), main: [], tally: null, sub: Array(n).fill(null),
      score: Array(n).fill(0), hist: [], res: null, log: [], seq: 0, over: false, end: "" };
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    const R = seeded(hash(`deal|${st.rs}|${st.round}`));
    st.hands = Array.from({ length: st.n }, () => { const h = [0, 0, 0]; for (let k = 0; k < CARDS; k++) h[Math.min(2, Math.floor(R() * 3))]++; return h; });
    st.vote = Array(st.n).fill(null); st.main = []; st.tally = null; st.sub = Array(st.n).fill(null); st.res = null; st.phase = "vote";
    push(st, { k: "deal", r: st.round });
  }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "vote") return st.vote.map((x, s) => (x === null ? s : -1)).filter(s => s >= 0);
    if (st.phase === "sub") return st.sub.map((x, s) => (x === null ? s : -1)).filter(s => s >= 0);
    return [];
  };
  const over = st => !!st.over;
  // 낸 카드 → 점수 · 실제 장수
  const physOf = a => a.b + a.w + a.g + 2 * a.p;
  const ptsOf = (a, main) => (main.includes(0) ? a.b : 0) + (main.includes(1) ? a.w : 0) + (main.includes(2) ? a.g + a.p : 0);
  function checkSub(st, seat, a) {
    if (!a || a.t !== "sub") return "낼 카드를 골라요";
    const h = st.hands[seat], M = st.main;
    for (const k of ["b", "w", "g", "p"]) if (!Number.isInteger(a[k]) || a[k] < 0) return "장수는 0 이상 정수";
    if (a.b > 0 && !M.includes(0)) return "검정은 메인 컬러가 아니에요";
    if (a.w > 0 && !M.includes(1)) return "하양은 메인 컬러가 아니에요";
    if (a.g > 0 && !M.includes(2)) return "회색은 메인 컬러가 아니에요";
    if (a.p > 0 && !M.includes(2)) return "검정 + 하양 짝은 회색이 메인일 때만 회색으로 쳐요";
    if (a.b + a.p > h[0] || a.w + a.p > h[1] || a.g > h[2]) return "가진 카드보다 많이 낼 수 없어요";
    return "";
  }
  const maxPhys = (h, M) => { let n = 0; if (M.includes(0)) n += h[0]; if (M.includes(1)) n += h[1]; if (M.includes(2)) n += h[2]; if (M.includes(2)) { const left = [M.includes(0) ? 0 : h[0], M.includes(1) ? 0 : h[1]]; n += 2 * Math.min(left[0], left[1]); } return n; };
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "vote") {
      if (!a || a.t !== "vote" || !Number.isInteger(a.c) || a.c < 0 || a.c > 2) return { ok: false, err: "검정 · 하양 · 회색 중에서 골라요" };
      st.vote[seat] = a.c;
      if (st.vote.every(x => x !== null)) tallyVotes(st);
      return { ok: true };
    }
    const e = checkSub(st, seat, a); if (e) return { ok: false, err: e };
    st.sub[seat] = { b: a.b, w: a.w, g: a.g, p: a.p };
    if (st.sub.every(x => x)) resolve(st);
    return { ok: true };
  }
  function tallyVotes(st) {
    const t = [0, 0, 0]; for (const c of st.vote) t[c]++;
    const mx = Math.max(...t); st.tally = t; st.main = [0, 1, 2].filter(c => t[c] === mx);
    push(st, { k: "vote", tally: t.slice(), main: st.main.slice() });
    st.phase = "sub";
  }
  function resolve(st) {
    const M = st.main, rows = st.sub.map((a, s) => ({ s, b: a.b, w: a.w, g: a.g, p: a.p, phys: physOf(a), pts: ptsOf(a, M), left: CARDS - physOf(a), zero: false }));
    const most = Math.max(...rows.map(r => r.phys));
    for (const r of rows) if (r.phys === most) { r.zero = true; }
    if (most === 0) for (const r of rows) r.zero = true;
    for (const r of rows) { r.got = r.zero ? 0 : r.pts; st.score[r.s] += r.got; }
    const rec = { r: st.round, main: M.slice(), tally: st.tally.slice(), rows };
    st.hist.push(clone(rec)); st.res = clone(rec);
    push(st, { k: "result", r: st.round, main: M.slice(), tally: st.tally.slice(), rows: rows.map(x => ({ s: x.s, b: x.b, w: x.w, g: x.g, p: x.p, phys: x.phys, pts: x.pts, got: x.got, zero: x.zero })) });
    st.phase = "show";
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 6000 : null);
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    if (st.round >= st.rounds) { st.over = true; st.phase = "end"; st.end = "rounds"; push(st, { k: "end", score: st.score.slice() }); return; }
    startRound(st);
  }
  const ranks = st => st.score.map(x => st.score.filter(y => y > x).length);
  function comps(h, M) {   // 낼 수 있는 모든 조합
    const out = [], mb = M.includes(0), mw = M.includes(1), mg = M.includes(2);
    for (let b = 0; b <= (mb ? h[0] : 0); b++) for (let w = 0; w <= (mw ? h[1] : 0); w++) for (let g = 0; g <= (mg ? h[2] : 0); g++)
      for (let p = 0; p <= (mg ? Math.min(h[0] - b, h[1] - w) : 0); p++) out.push({ t: "sub", b, w, g, p });
    return out;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "vote") return [0, 1, 2].map(c => ({ t: "vote", c }));
    return comps(st.hands[seat], st.main);
  }
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, isAll = seat === "all";
    const pubObj = { r: st.round, p: st.phase, v: st.vote.map(x => x !== null), t: st.tally, m: st.main, s: st.sub.map((x, i) => !!x), sc: st.score, h: st.hist.length };
    const V = {
      n: st.n, round: st.round, rounds: st.rounds, phase: st.phase, seat: me, hand: me >= 0 ? st.hands[me].slice() : [], score: st.score.slice(),
      voted: st.vote.map(x => x !== null), myVote: me >= 0 ? st.vote[me] : null, main: st.main.slice(), tally: st.tally ? st.tally.slice() : null,
      subbed: st.sub.map((x, i) => !!x), mySub: me >= 0 && st.sub[me] ? Object.assign({}, st.sub[me]) : null, res: st.res ? clone(st.res) : null, hist: clone(st.hist),
      needs: needs(st), over: st.over, end: st.end, ranks: ranks(st), log: st.log.map(e => clone(e)), pub: hash(JSON.stringify(pubObj)).toString(36),
    };
    if (isAll) { V.hands = st.hands.map(h => h.slice()); V.votes = st.vote.slice(); V.subs = st.sub.map(x => (x ? Object.assign({}, x) : null)); }
    return V;
  }

  // ── AI ──
  // 상대가 낼 법한 카드 장수 (표본: 손패는 같은 확률로 무작위, 대부분 낼 수 있는 만큼 · 가끔 1~2장 아낌)
  function sampleHand(R) { const h = [0, 0, 0]; for (let k = 0; k < CARDS; k++) h[Math.min(2, Math.floor(R() * 3))]++; return h; }
  function oppPhys(h, M, R, hold) {
    let n = 0; if (M.includes(0)) n += h[0]; if (M.includes(1)) n += h[1]; if (M.includes(2)) n += h[2];
    if (M.includes(2) && R() < 0.5) n += 2 * Math.min(M.includes(0) ? 0 : h[0], M.includes(1) ? 0 : h[1]);
    if (n > 0 && R() < hold) n -= 1 + (R() < 0.35 ? 1 : 0);
    return Math.max(0, n);
  }
  const PROF = {
    easy: { samples: 0 },
    normal: { samples: 14, hold: 0.25, noise: 0.5 },
    hard: { samples: 40, hold: 0.3, noise: 0 },
  };
  const keyV = (V, s) => hash(JSON.stringify([s, V.round, V.hand, V.main, V.tally, V.score, V.hist.length]));
  // 내가 phys 장을 냈을 때 점수 (표본 상대들의 장수 oph)
  const outcome = (c, oph) => { const mx = Math.max(c.phys, ...oph); return c.phys === mx ? 0 : c.pts; };
  function bestSub(h, M, ops, ev) {
    const cs = comps(h, M).map(a => ({ a, phys: physOf(a), pts: ptsOf(a, M) }));
    // 같은 (장수, 점수) 조합은 하나로
    const seen = new Map(); for (const c of cs) { const k = c.phys + "," + c.pts; if (!seen.has(k) || c.a.p < seen.get(k).a.p) seen.set(k, c); }
    let best = null;
    for (const c of seen.values()) { let u = 0; for (const oph of ops) u += outcome(c, oph); u /= ops.length; if (ev) ev.push({ a: c.a, u, phys: c.phys, pts: c.pts }); if (!best || u > best.u + 1e-9 || (Math.abs(u - best.u) < 1e-9 && c.pts > best.pts)) best = { a: c.a, u, phys: c.phys, pts: c.pts }; }
    return best;
  }
  function sampleOps(V, me, M, P, R) {
    const ops = [];
    for (let k = 0; k < P.samples; k++) { const oph = []; for (let s = 0; s < V.n; s++) if (s !== me) oph.push(oppPhys(sampleHand(R), M, R, P.hold)); ops.push(oph); }
    return ops;
  }
  function voteEval(V, me, P, R) {
    const h = V.hand, out = [0, 0, 0].map(() => ({ u: 0 })), N = P.samples;
    const samples = [];
    for (let k = 0; k < N; k++) {   // 상대 투표: 각자 자기 손패에서 가장 많은 색 (같으면 무작위)
      const vs = [];
      for (let s = 0; s < V.n; s++) if (s !== me) { const hh = sampleHand(R), mx = Math.max(...hh), cs = [0, 1, 2].filter(c => hh[c] === mx); vs.push(cs[Math.floor(R() * cs.length)]); }
      samples.push(vs);
    }
    for (let c = 0; c < 3; c++) {
      const buckets = new Map();
      for (const vs of samples) {
        const t = [0, 0, 0]; t[c]++; for (const x of vs) t[x]++;
        const mx = Math.max(...t), M = [0, 1, 2].filter(x => t[x] === mx), key = M.join("");
        if (!buckets.has(key)) buckets.set(key, { M, n: 0 }); buckets.get(key).n++;
      }
      let u = 0;
      for (const b of buckets.values()) {
        const ops = sampleOps(V, me, b.M, P, R), best = bestSub(h, b.M, ops);
        u += (b.n / N) * best.u;
      }
      out[c].u = u;
    }
    return out;
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    if (V.phase === "vote") {
      if (!P.samples) return { t: "vote", c: Math.floor(R() * 3) };
      const ev = voteEval(V, s, P, R); let best = 0;
      ev.forEach((x, c) => { x.u += (R() - 0.5) * (P.noise || 0); if (x.u > ev[best].u) best = c; });
      return { t: "vote", c: best };
    }
    const cs = comps(V.hand, V.main);
    if (!P.samples) {   // 쉬움: 낼 수 있는 만큼 거의 다 (그래서 자주 0점)
      const full = cs.filter(a => ptsOf(a, V.main) === Math.max(...cs.map(x => ptsOf(x, V.main))));
      return R() < 0.7 ? full[Math.floor(R() * full.length)] : cs[Math.floor(R() * cs.length)];
    }
    const ops = sampleOps(V, s, V.main, P, R), ev = [], best = bestSub(V.hand, V.main, ops, ev);
    if (P.noise) { let top = null; for (const x of ev) { const u = x.u + (R() - 0.5) * P.noise; if (!top || u > top.u) top = { u, a: x.a }; } return top.a; }
    return best.a;
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  // 선생님 · 복기: 후보별 기대 점수
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, R = seeded(keyV(V, s));
    if (V.phase === "vote") { const ev = voteEval(V, s, P, R); return { a: ai(V, s, "hard"), vote: ev.map(x => x.u) }; }
    const ops = sampleOps(V, s, V.main, P, R), ev = [], best = bestSub(V.hand, V.main, ops, ev);
    ev.sort((x, y) => y.u - x.u);
    // 상대 중 가장 많이 낼 장수 분포 (선생님 글용)
    const mx = ops.map(o => Math.max(0, ...o)), avg = mx.reduce((a, b) => a + b, 0) / mx.length;
    return { a: best.a, best, rows: ev.slice(0, 4), oppMax: avg, ops };
  }
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA) return null;
    const P = PROF.hard, R = seeded(keyV(V, s));
    if (V.phase === "vote") { const ev = voteEval(V, s, P, R); return { kind: "vote", my: ev[myA.c].u, best: ev[bestA.c].u }; }
    const ops = sampleOps(V, s, V.main, P, R), M = V.main;
    const u = a => { const c = { phys: physOf(a), pts: ptsOf(a, M) }; return ops.reduce((x, o) => x + outcome(c, o), 0) / ops.length; };
    const gap = a => { const c = { phys: physOf(a) }; return ops.reduce((x, o) => x + (c.phys === Math.max(c.phys, ...o) ? 1 : 0), 0) / ops.length; };
    return { kind: "sub", my: u(myA), best: u(bestA), myTop: gap(myA), bestTop: gap(bestA), myPhys: physOf(myA), bestPhys: physOf(bestA) };
  }

  return { id: "maincolor", COLS, CARDS, OPTS, PROF, optsOf, comps, physOf, ptsOf, maxPhys, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, voteEval };
});

/* 베니 서바이벌 · 하나 빼기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 1일차 감옥 매치 '하나 빼기' (7명)
   · 사람마다 숫자 카드 1~8 각 1장 (8장). 라운드마다 2장을 왼쪽 · 오른쪽 칸에 한 장씩 냄 → 모두 내면 2장씩 공개
   · 그다음 각자 둘 중 쓸 카드 1장을 몰래 정함 (마커) → 공개. 같은 숫자는 빼고, 남은 것 중 가장 낮은 숫자를 낸 사람이 승리
     → 그 숫자만큼 승점 + 승리의 표식 1개
   · 쓴 카드는 버림. 안 쓴 카드는 임시 보관 — 바로 다음 라운드에만 못 씀
   · 18라운드. 6 · 12라운드가 끝나면 카드 리셋 (8장 다시)
   · 3 · 6 · 9 · 12 · 18라운드가 끝나면 정산: 표식 1개당 1점을 더해 점수가 가장 높은 1명이 생존 (게임에서 빠짐)
     동점이면 표식이 많은 쪽 → 그래도 같으면 가장 최근 라운드에 이긴 쪽. 남은 사람 승점은 0 으로 (표식은 그대로)
   · 3명이 남으면 13~18라운드를 하고 상위 2명 생존, 1명 탈락
   우리 판 다듬기 (방송과 다른 점 · 방송 글에 없는 것):
   · 3~8명 (방송 7명). 3명보다 많으면 3라운드마다 1명 생존, 3명 남으면 6라운드 뒤 2명 생존 — 7명이면 방송과 같은 3·6·9·12·18
   · 하나뿐인 숫자가 없으면 그 라운드는 승자 없음 · 정산에서 셋 다 같고 둘 다 이긴 적이 없으면 추첨
   · 남은 카드 · 임시 보관 · 승점 · 표식은 모두 화면에 보임 (방송은 카드를 기억해야 함)
   · 낼 수 있는 카드가 딱 2장이면 저절로 냄 · 왼쪽 · 오른쪽 칸은 규칙에 차이가 없음 (보여 주기만)
   · 순위: 먼저 생존한 사람이 위 → 마지막 정산은 그 순서 → 탈락이 맨 아래 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).minusone = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NC = 8, FULL = 0x1FE, CYCLE = 6, GAP = 3, FGAP = 6, MARKV = 1.5;
  const bit = c => 1 << c;
  const cardsOf = m => { const a = []; for (let c = 1; c <= NC; c++) if (m & bit(c)) a.push(c); return a; };
  const maskOf = a => a.reduce((m, c) => m | bit(c), 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function mul(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 정산 일정 [{ r: 라운드, k: 그때 살아남는 사람 수 }] — 3명보다 많으면 3라운드마다 1명, 3명 남으면 6라운드 뒤 2명
  function schedule(n) {
    const out = []; let r = 0, a = n;
    while (a > 3) { r += GAP; out.push({ r, k: 1 }); a--; }
    r += FGAP; out.push({ r, k: a - 1 });
    return out;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed }) {
    n = Math.max(3, Math.min(8, (n | 0) || 7));
    const sch = schedule(n);
    const st = {
      n, rs: (seed >>> 0) || 1, seq: 0, log: [], round: 0, R: sch[sch.length - 1].r, sch, si: 0, phase: "", over: false,
      hand: Array(n).fill(FULL), hold: Array(n).fill(0), sub: Array(n).fill(null), pick: Array(n).fill(null),
      score: Array(n).fill(0), marks: Array(n).fill(0), wins: Array(n).fill(0), lastWin: Array(n).fill(0),
      alive: Array(n).fill(true), safe: [], elim: -1, res: null, hist: [], setl: [],
    };
    startRound(st);
    return st;
  }
  const usable = (st, s) => st.hand[s] & ~(st.hold[s] ? bit(st.hold[s]) : 0);
  const aliveList = st => st.alive.map((a, s) => (a ? s : -1)).filter(s => s >= 0);

  function startRound(st) {
    st.round++; st.phase = "sub"; st.res = null;
    st.sub = Array(st.n).fill(null); st.pick = Array(st.n).fill(null);
    push(st, { k: "round", r: st.round });
    for (const s of aliveList(st)) {                      // 낼 수 있는 카드가 2장뿐이면 저절로 냄
      const u = cardsOf(usable(st, s));
      if (u.length <= 2) { st.sub[s] = u.slice(); push(st, { k: "forced", s, c: u.slice() }); }
    }
    if (!needs(st).length) openSubs(st);
  }
  function openSubs(st) { st.phase = "pick"; push(st, { k: "open", r: st.round, sub: st.sub.map(x => (x ? x.slice() : null)) }); }

  const needs = st => {
    if (st.over) return [];
    if (st.phase === "sub") return aliveList(st).filter(s => !st.sub[s]);
    if (st.phase === "pick") return aliveList(st).filter(s => st.pick[s] == null);
    return [];
  };
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "sub") {
      if (a.t !== "sub" || !Array.isArray(a.c) || a.c.length !== 2) return { ok: false, err: "카드 2장을 골라요" };
      const [x, y] = a.c, u = usable(st, seat);
      if (!Number.isInteger(x) || !Number.isInteger(y) || x === y || x < 1 || x > NC || y < 1 || y > NC || !(u & bit(x)) || !(u & bit(y)))
        return { ok: false, err: "낼 수 있는 카드 2장을 골라요" };
      st.sub[seat] = [x, y]; push(st, { k: "lock", s: seat });
      if (!needs(st).length) openSubs(st);
      return { ok: true };
    }
    if (st.phase === "pick") {
      if (a.t !== "pick" || !st.sub[seat].includes(a.c)) return { ok: false, err: "낸 2장 중 쓸 카드 1장을 골라요" };
      st.pick[seat] = a.c; push(st, { k: "mark", s: seat });
      if (!needs(st).length) resolve(st);
      return { ok: true };
    }
    return { ok: false, err: "결과를 보여 주는 중이에요" };
  }

  // 같은 숫자는 빼고 가장 낮은 숫자 → { c, w } (없으면 c 0 · w -1)
  function winnerOf(pick, alive) {
    const cnt = Array(NC + 1).fill(0);
    for (let s = 0; s < pick.length; s++) if (alive[s] && pick[s]) cnt[pick[s]]++;
    for (let c = 1; c <= NC; c++) if (cnt[c] === 1) { for (let s = 0; s < pick.length; s++) if (alive[s] && pick[s] === c) return { c, w: s, cnt }; }
    return { c: 0, w: -1, cnt };
  }
  function resolve(st) {
    const W = winnerOf(st.pick, st.alive);
    const rec = { r: st.round, sub: st.sub.map(x => (x ? x.slice() : null)), pick: st.pick.slice(), w: W.w, c: W.c, dup: [] };
    for (let c = 1; c <= NC; c++) if (W.cnt[c] > 1) rec.dup.push(c);
    for (const s of aliveList(st)) {
      const used = st.pick[s], other = st.sub[s][0] === used ? st.sub[s][1] : st.sub[s][0];
      st.hand[s] &= ~bit(used); st.hold[s] = other;
    }
    if (W.w >= 0) { st.score[W.w] += W.c; st.marks[W.w]++; st.wins[W.w]++; st.lastWin[W.w] = st.round; }
    push(st, { k: "res", r: st.round, pick: st.pick.slice(), w: W.w, c: W.c, dup: rec.dup.slice() });
    st.hist.push(rec); if (st.hist.length > 30) st.hist.shift();
    st.res = Object.assign({}, rec, { settle: null, reset: false });
    const S = st.sch[st.si];
    if (S && S.r === st.round) { st.res.settle = settle(st, S); st.si++; }
    if (!st.over && st.round % CYCLE === 0) {
      for (let s = 0; s < st.n; s++) { st.hand[s] = FULL; st.hold[s] = 0; }
      st.res.reset = true; push(st, { k: "reset", r: st.round });
    }
    st.phase = st.over ? "end" : "show";
  }
  // 정산 순서: (승점 + 표식) → 표식 → 가장 최근에 이긴 라운드 → 추첨
  function orderRows(rows) { return rows.sort((a, b) => b.t - a.t || b.m - a.m || b.l - a.l || a.z - b.z); }
  function tieWhy(a, b) { return !b ? "" : a.t !== b.t ? "" : a.m !== b.m ? "marks" : a.l !== b.l ? "recent" : "lot"; }
  function settle(st, S) {
    const rows = orderRows(aliveList(st).map(s => ({ s, sc: st.score[s], m: st.marks[s], t: st.score[s] + st.marks[s], l: st.lastWin[s], z: rnd(st) })));
    const surv = rows.slice(0, S.k).map(x => x.s), fin = S.k > 1;
    const why = tieWhy(rows[S.k - 1], rows[S.k]);
    for (const s of surv) { st.alive[s] = false; st.safe.push(s); }
    const out = { r: st.round, fin, surv, rows: rows.map(x => ({ s: x.s, sc: x.sc, m: x.m, t: x.t, l: x.l })), why, why0: fin ? tieWhy(rows[0], rows[1]) : "", elim: -1 };
    if (fin) { out.elim = rows[rows.length - 1].s; st.elim = out.elim; st.alive[out.elim] = false; st.over = true; }
    st.score = st.score.map(() => 0);                    // 남은 사람 승점은 0 으로 (표식은 그대로)
    st.setl.push(out);
    push(st, { k: "settle", r: st.round, surv: surv.slice(), elim: out.elim, why, fin });
    if (fin) push(st, { k: "end" });
    return out;
  }
  const auto = st => (st.phase === "show" ? (st.res && st.res.settle ? 5600 : st.res && st.res.reset ? 4200 : 3400) : null);
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  // 등수: 먼저 생존한 순서 → 탈락이 맨 아래 (끝나기 전엔 남은 사람이 생존자 다음 같은 등수)
  function ranks(st) {
    const r = Array(st.n).fill(st.safe.length);
    st.safe.forEach((s, k) => { r[s] = k; });
    if (st.elim >= 0) r[st.elim] = st.n - 1;
    return r;
  }
  function pairsOf(cs) { const out = []; for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) out.push([cs[i], cs[j]]); return out; }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "sub") return pairsOf(cardsOf(usable(st, seat))).map(c => ({ t: "sub", c }));
    return st.sub[seat].map(c => ({ t: "pick", c }));
  }

  // ── 보이는 것: 내 카드 · 남은 카드 · 보관 · 점수는 모두 공개. 숨는 것 = 아직 다 안 낸 2장 · 아직 공개 안 된 마커 ───
  function view(st, seat) {
    const all = seat === "all", me = Number.isInteger(seat) && seat >= 0 && seat < st.n ? seat : -1;
    const open = st.phase !== "sub", shown = st.phase === "show" || st.phase === "end";
    const sub = st.sub.map((x, s) => (!x ? null : all || open || s === me ? x.slice() : null));
    const pick = st.pick.map((x, s) => (x == null ? null : all || shown || s === me ? x : null));
    const nx = st.sch[st.si] || null;
    const pubObj = { r: st.round, p: st.phase, h: st.hand, hd: st.hold, sc: st.score, m: st.marks, lw: st.lastWin, al: st.alive, sf: st.safe, e: st.elim,
      sb: st.sub.map(x => !!x), pk: st.pick.map(x => x != null), os: open ? st.sub : null, op: shown ? st.pick : null, si: st.si, ov: st.over, res: st.res };
    return {
      n: st.n, R: st.R, sch: st.sch.map(x => ({ r: x.r, k: x.k })), si: st.si, next: nx ? { r: nx.r, k: nx.k } : null, round: st.round, phase: st.phase,
      reset: Math.ceil(Math.max(1, st.round) / CYCLE) * CYCLE,
      hand: st.hand.map(cardsOf), hold: st.hold.slice(), usable: st.hand.map((_, s) => cardsOf(usable(st, s))),
      sub, pick, subbed: st.sub.map(x => !!x), picked: st.pick.map(x => x != null),
      score: st.score.slice(), marks: st.marks.slice(), wins: st.wins.slice(), lastWin: st.lastWin.slice(),
      alive: st.alive.slice(), safe: st.safe.slice(), elim: st.elim,
      res: st.res ? JSON.parse(JSON.stringify(st.res)) : null, hist: st.hist.map(h => JSON.parse(JSON.stringify(h))), setl: JSON.parse(JSON.stringify(st.setl)),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (보이는 것만) ────────────────────────────────────────
  // 판 흉내: 보이는 것만으로 만든 가벼운 판
  function simFrom(V) {
    return { n: V.n, round: V.round, hand: V.hand.map(maskOf), hold: V.hold.slice(), score: V.score.slice(), marks: V.marks.slice(), lastWin: V.lastWin.slice(),
      alive: V.alive.slice(), safeN: V.safe.length, si: V.si, sch: V.sch, pos: Array(V.n).fill(-1), elim: -1 };
  }
  const cloneS = S => ({ n: S.n, round: S.round, hand: S.hand.slice(), hold: S.hold.slice(), score: S.score.slice(), marks: S.marks.slice(), lastWin: S.lastWin.slice(),
    alive: S.alive.slice(), safeN: S.safeN, si: S.si, sch: S.sch, pos: S.pos.slice(), elim: S.elim });
  const usableS = (S, s) => S.hand[s] & ~(S.hold[s] ? bit(S.hold[s]) : 0);

  // i 가 c 를 쓸 때 이길 확률 (Q[j][v] = j 가 v 를 쓸 확률, 사람끼리는 따로따로라고 봄)
  function winP(Q, alive, i, c) {
    let p = 1;
    for (let j = 0; j < alive.length; j++) if (j !== i && alive[j]) p *= 1 - Q[j][c];
    if (p <= 0) return 0;
    for (let v = 1; v < c; v++) {
      let p0 = 1, p1 = 0;
      for (let j = 0; j < alive.length; j++) if (j !== i && alive[j]) { const q = Q[j][v]; if (q) { p1 = p1 * (1 - q) + p0 * q; p0 *= 1 - q; } }
      p *= 1 - p1;
      if (p <= 0) return 0;
    }
    return p;
  }
  // 낸 2장이 다 보일 때 정확히: 남들이 각자 둘 중 하나를 반반 쓴다고 보고 모든 경우를 셈 (남이 많으면 위의 근사)
  function winExact(subs, alive, i, c) {
    const oth = []; for (let j = 0; j < alive.length; j++) if (j !== i && alive[j] && subs[j]) oth.push(subs[j]);
    if (oth.length > 6) return winP(pairQ({ n: alive.length, alive }, subs), alive, i, c);
    const cnt = new Int8Array(NC + 1); let win = 0;
    for (let m = 0; m < 1 << oth.length; m++) {
      cnt.fill(0); cnt[c] = 1;
      for (let k = 0; k < oth.length; k++) cnt[oth[k][(m >> k) & 1]]++;
      let w = 0; for (let v = 1; v <= NC; v++) if (cnt[v] === 1) { w = v; break; }
      if (w === c) win++;
    }
    return win / (1 << oth.length);
  }
  // 아직 안 낸 사람: 낼 수 있는 카드 중 하나를 고르게 쓴다고 봄
  function priorQ(S) {
    const Q = [];
    for (let j = 0; j < S.n; j++) {
      const q = new Float64Array(NC + 1);
      if (S.alive[j]) { const cs = cardsOf(usableS(S, j)); for (const c of cs) q[c] = 1 / cs.length; }
      Q.push(q);
    }
    return Q;
  }
  // 낸 2장이 보일 때: 둘 중 하나를 반반
  function pairQ(S, subs) {
    const Q = [];
    for (let j = 0; j < S.n; j++) {
      const q = new Float64Array(NC + 1);
      if (S.alive[j] && subs[j]) { q[subs[j][0]] += 0.5; q[subs[j][1]] += 0.5; }
      Q.push(q);
    }
    return Q;
  }
  const NOISE = { easy: 99, normal: 0.6, hard: 0.15, roll: 0.35 };
  function gumbel(r) { return -Math.log(-Math.log(Math.max(1e-12, r()))); }
  // 2장 고르기 (휴리스틱): 카드마다 '이길 확률 × (숫자 + 표식 값)' → 큰 값 + 작은 값의 0.35
  function subPolicy(S, i, Q, r, noise) {
    const cs = cardsOf(usableS(S, i));
    if (cs.length <= 2) return cs.slice();
    if (noise >= 99) { const a = Math.floor(r() * cs.length); let b = Math.floor(r() * (cs.length - 1)); if (b >= a) b++; return [cs[a], cs[b]].sort((x, y) => x - y); }
    let best = null, bv = -1e9;
    for (const [p, v0] of pairScores(S, i, Q, cs)) { const v = v0 + noise * gumbel(r); if (v > bv) { bv = v; best = p; } }
    return best;
  }
  function pairScores(S, i, Q, cs) {
    const val = {}, out = [];
    for (const c of cs) val[c] = winP(Q, S.alive, i, c) * (c + MARKV);
    for (let x = 0; x < cs.length; x++) for (let y = x + 1; y < cs.length; y++) {
      const a = val[cs[x]], b = val[cs[y]];
      out.push([[cs[x], cs[y]], Math.max(a, b) + 0.35 * Math.min(a, b)]);
    }
    return out;
  }
  function pickPolicy(S, i, subs, Q, r, noise) {
    const [a, b] = subs[i];
    if (noise >= 99) return r() < 0.5 ? a : b;
    const few = S.alive.filter(Boolean).length <= 5, w = c => (few ? winExact(subs, S.alive, i, c) : winP(Q, S.alive, i, c));
    const va = w(a) * (a + MARKV) + noise * gumbel(r), vb = w(b) * (b + MARKV) + noise * gumbel(r);
    return va >= vb ? a : b;
  }
  // 흉내 판 한 라운드 끝내기 → 정산이 있었으면 true
  function simResolve(S, subs, picks, r) {
    const W = winnerOf(picks, S.alive);
    for (let s = 0; s < S.n; s++) if (S.alive[s]) { const u = picks[s], o = subs[s][0] === u ? subs[s][1] : subs[s][0]; S.hand[s] &= ~bit(u); S.hold[s] = o; }
    if (W.w >= 0) { S.score[W.w] += W.c; S.marks[W.w]++; S.lastWin[W.w] = S.round; }
    let did = false;
    const X = S.sch[S.si];
    if (X && X.r === S.round) {
      did = true; S.si++;
      const rows = orderRows(S.alive.map((a, s) => (a ? { s, t: S.score[s] + S.marks[s], m: S.marks[s], l: S.lastWin[s], z: r() } : null)).filter(Boolean));
      for (let k = 0; k < X.k; k++) { const s = rows[k].s; S.alive[s] = false; S.pos[s] = S.safeN++; }
      if (X.k > 1) { const e = rows[rows.length - 1].s; S.alive[e] = false; S.elim = e; S.pos[e] = S.n - 1; }
      for (let s = 0; s < S.n; s++) S.score[s] = 0;
    }
    if (S.round % CYCLE === 0) for (let s = 0; s < S.n; s++) { S.hand[s] = FULL; S.hold[s] = 0; }
    return did;
  }
  // 정산 뒤 내 값: 생존 순서가 빠를수록 1 에 가깝고 탈락은 0. 아직 남았으면 남은 자리 평균 + 표식이 남보다 많은 만큼 조금
  function leafU(S, me) {
    const D = S.n - 1;
    if (S.pos[me] >= 0) return (D - S.pos[me]) / D;
    let avg = 0, m = 0, mk = 0;
    for (let s = 0; s < S.n; s++) if (S.alive[s]) { m++; mk += S.marks[s]; }
    for (let k = S.safeN; k < S.safeN + m; k++) avg += (D - k) / D;
    return avg / m + 0.03 * (S.marks[me] - mk / m);
  }
  // 한 번 굴려 보기: 이번 라운드는 fix 대로 (내 2장 또는 내 마커), 나머지는 휴리스틱으로 다음 정산까지
  // 사람마다 '아무렇게나 고르는 편'일 확률 — 지난 라운드 마커가 셈한 쪽(이길 확률 × 값이 큰 쪽)과 맞았나로 짐작 (공개 기록만)
  //   아무렇게나면 반쯤 맞고, 셈하는 사람은 85% 쯤 맞는다고 보고 베이즈로 갱신 (처음엔 반반)
  function mixOf(V) {
    const lr = Array(V.n).fill(0);
    for (const h of V.hist || []) {
      const al = h.sub.map(x => !!x), Q = pairQ({ n: V.n, alive: al }, h.sub);
      for (let j = 0; j < V.n; j++) {
        if (!al[j] || h.pick[j] == null || h.sub[j][0] === h.sub[j][1]) continue;
        const [a, b] = h.sub[j], va = winP(Q, al, j, a) * (a + MARKV), vb = winP(Q, al, j, b) * (b + MARKV);
        if (Math.abs(va - vb) < 0.05) continue;            // 거의 같으면 판단 안 함
        const agree = h.pick[j] === (va > vb ? a : b);
        lr[j] += agree ? Math.log(0.5 / 0.85) : Math.log(0.5 / 0.15);
      }
    }
    return lr.map(x => 1 / (1 + Math.exp(-x)));
  }
  function rollout(S0, V, me, act, r, mix) {
    const S = cloneS(S0), n = S.n;
    let first = true, surv = 0;
    const nz = Array(n).fill(NOISE.roll);                 // 남은 사람마다 이번 굴림에서 '아무렇게나' 둘지 '셈해서' 둘지
    for (let s = 0; s < n; s++) if (s !== me && r() < mix[s]) nz[s] = NOISE.easy;
    for (let guard = 0; guard < 12; guard++) {
      let subs;
      if (first && V.phase === "pick") subs = V.sub.map(x => (x ? x.slice() : null));
      else {
        const Q = priorQ(S); subs = Array(n).fill(null);
        for (let s = 0; s < n; s++) if (S.alive[s]) subs[s] = first && s === me ? act.c.slice() : subPolicy(S, s, Q, r, nz[s]);
      }
      const Q2 = pairQ(S, subs), picks = Array(n).fill(0);
      for (let s = 0; s < n; s++) if (S.alive[s]) picks[s] = first && s === me ? (act.t === "pick" ? act.c : pickPolicy(S, s, subs, Q2, r, 0)) : pickPolicy(S, s, subs, Q2, r, nz[s]);
      const did = simResolve(S, subs, picks, r);
      first = false;
      if (did) { surv = S.pos[me] >= 0 && S.pos[me] !== n - 1 ? 1 : 0; return { u: leafU(S, me), surv }; }
      S.round++;
    }
    return { u: leafU(S, me), surv };
  }
  // 몬테카를로: 후보마다 같은 씨앗 묶음으로 굴려 평균 (많으면 반을 먼저 굴려 위 6개만 더)
  function mcScore(V, me, cands, B, r, top) {
    const S0 = simFrom(V), base = (r() * 4294967296) >>> 0, mix = mixOf(V);
    if (top && cands.length > top && V.phase === "sub") {   // 먼저 휴리스틱으로 후보를 줄임
      const sc = new Map(pairScores(S0, me, priorQ(S0), V.usable[me]).map(([p, v]) => [p.join(","), v]));
      cands = cands.slice().sort((x, y) => (sc.get(y.c.join(",")) || 0) - (sc.get(x.c.join(",")) || 0)).slice(0, top);
    }
    const seedAt = k => (base ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0;
    const pool = cands.map(a => ({ a, u: 0, sv: 0, k: 0 }));
    const runN = (p, from, cnt) => { for (let k = from; k < from + cnt; k++) { const o = rollout(S0, V, me, p.a, mul(seedAt(k)), mix); p.u += o.u; p.sv += o.surv; p.k++; } };
    if (pool.length <= 2) { const per = Math.max(8, Math.floor(B / pool.length)); for (const p of pool) runN(p, 0, per); }
    else {
      const per1 = Math.max(6, Math.floor((B * 0.5) / pool.length));
      for (const p of pool) runN(p, 0, per1);
      pool.sort((x, y) => y.u / y.k - x.u / x.k);
      const top = pool.slice(0, Math.min(6, pool.length)), per2 = Math.max(8, Math.floor((B - per1 * pool.length) / top.length));
      for (const p of top) runN(p, per1, per2);
    }
    return pool.map(p => ({ a: p.a, v: p.u / p.k, surv: p.sv / p.k, k: p.k })).sort((x, y) => y.k - x.k || y.v - x.v);
  }
  const ENV = k => (typeof process !== "undefined" && process.env && process.env[k]) || 0;
  const TIER = { normal: { B: 0 }, hard: { B: +ENV("MO_B") || 600, top: +ENV("MO_TOP") || 10 }, coach: { B: 650, top: 10 } };   // 선생님 = 고급과 같은 셈 (폰에서도 한 번에 0.5초 안쪽)
  function candsOf(V, me) {
    if (V.phase === "sub") return pairsOf(V.usable[me]).map(c => ({ t: "sub", c }));
    if (V.phase === "pick" && V.sub[me]) return V.sub[me].map(c => ({ t: "pick", c }));
    return [];
  }
  function heur(V, me, r, noise) {
    const S = simFrom(V);
    if (V.phase === "sub") return { t: "sub", c: subPolicy(S, me, priorQ(S), r, noise) };
    return { t: "pick", c: pickPolicy(S, me, V.sub, pairQ(S, V.sub), r, noise) };
  }
  function decide(V, me, tier, r) {
    const cands = candsOf(V, me);
    if (!cands.length) return null;
    if (cands.length === 1) return { a: cands[0], list: [{ a: cands[0], v: 0, surv: 0, k: 0 }] };
    const T = TIER[tier] || TIER.hard, B0 = Math.max(T.B, Math.min(T.B * 2.4, Math.round((T.B * 7) / V.alive.filter(Boolean).length)));   // 사람이 적으면 굴림이 싸니 더 많이
    const list = mcScore(V, me, cands, V.phase === "pick" ? Math.round(B0 * 0.6) : B0, r, T.top);
    return { a: list[0].a, list };
  }
  function ai(V, me, tier, r) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    if (V.phase !== "sub" && V.phase !== "pick") return null;
    if (tier === "easy") return r() < 0.25 ? heur(V, me, r, NOISE.normal) : heur(V, me, r, NOISE.easy);
    if (tier === "normal") return heur(V, me, r, NOISE.normal);
    const d = decide(V, me, "hard", r);
    return d ? d.a : null;
  }
  // 복기 · 선생님: 두 행동을 같은 씨앗으로 견줌 → { my, best: {v, surv} }
  function judge(V, me, a, b, r) {
    const key = x => JSON.stringify(x);
    const cands = key(a) === key(b) ? [a] : [a, b];
    const list = mcScore(V, me, cands, cands.length === 1 ? 200 : 500, r || mul(V.round * 7919 + me));
    const f = x => list.find(p => key(p.a) === key(x));
    return { my: f(a), best: f(b) };
  }
  // 이 카드를 쓰면 이길 확률 (지금 보이는 것만, 남은 사람은 반반 · 아직 안 냈으면 고르게)
  function chances(V, me) {
    const S = simFrom(V), out = {};
    if (V.phase === "pick" && V.sub[me]) { for (const c of V.sub[me]) out[c] = winExact(V.sub, S.alive, me, c); }
    else { const Q = priorQ(S); for (const c of V.usable[me] || []) out[c] = winP(Q, S.alive, me, c); }
    return out;
  }

  return {
    id: "minusone", NC, CYCLE, GAP, FGAP, MARKV, schedule, cardsOf, maskOf, winnerOf, pairsOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    simFrom, winP, winExact, priorQ, pairQ, mixOf, subPolicy, pickPolicy, rollout, mcScore, decide, judge, chances, heur, TIER,
  };
});

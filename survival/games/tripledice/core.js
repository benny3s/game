/* 베니 서바이벌 · 트리플 다이스 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 4일차 감옥 매치 (4명)
   · 4라운드. 라운드마다 각자 흰 주사위 9개(모두에게 공개) + 빨강 · 파랑 주사위 1개씩(히든 — 나만 봄)을 굴림
   · 이번 라운드에 얻을 승점을 예측해 몰래 냄: ZERO = 0점 · MIN = 0 초과 7 미만 · MORE = 7 이상 10 이하 · MAX = 10 초과
   · 제출 3번: 선부터 차례로 주사위 3개를 냄 (히든 주사위는 색 마커로 내고, 모두 낸 뒤 공개)
     조합: 트리플(같은 수 3) > 스트레이트(이어진 3, 6과 1은 안 이어짐) > 더블(같은 수 2) > 싱글
     같은 등급이면 조합을 이루는 수가 높은 쪽 → 그다음 남은 수 → 완전히 같으면 동률
     순위 승점 1위 6 · 2위 3 · 3위 1 · 4위 0 (동률은 그 순위 점수의 평균)
     다음 제출의 선 = 방금 가장 높았던 사람 (동률이면 누적 승점이 높은 사람). 3번 내면 남은 2개는 버림
   · 라운드 끝: 예측이 맞으면 그 라운드 승점 2배, ZERO 가 맞으면 승점 40 추가
   · 4라운드 뒤 승점 순위 (방송: 단독 1위는 피스 1개 · 꼴찌 탈락)
   방송과 다른 점: 2~4명 (빈 자리는 AI) · 3명이면 6 · 3 · 0, 2명이면 6 · 0 (꼴찌는 늘 0점이라 ZERO 가 가능) ·
     1라운드 선은 무작위 (방송은 주사위로 정함) · 동률 선이 누적 승점까지 같으면 앞 순서 · 라운드 수 옵션 (4 · 2)
   다음 라운드 선 = 지난 라운드 마지막 제출 1위 (방송 진행 그대로: 2라운드 세븐하이 · 3라운드 티노)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 또는 장면에서 만든 씨앗만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).tripledice = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const PREDS = ["ZERO", "MIN", "MORE", "MAX"];
  const PTS = { 2: [6, 0], 3: [6, 3, 0], 4: [6, 3, 1, 0] };
  const KINDS = ["w", "w", "w", "w", "w", "w", "w", "w", "w", "r", "b"];   // 흰 9 · 빨강 · 파랑
  const CAT = ["싱글", "더블", "스트레이트", "트리플"];
  const OPTS = { rounds: [4, 2] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 400) st.log.shift(); }

  // ── 조합 ──
  // 비교 값 (클수록 셈): 등급 · 조합 수 · 남은 수
  function keyOf(vs) {
    const a = vs.slice().sort((x, y) => y - x);
    if (a[0] === a[2]) return 3e6 + a[0] * 1e4;
    if (a[0] - a[1] === 1 && a[1] - a[2] === 1) return 2e6 + a[0] * 1e4;
    if (a[0] === a[1]) return 1e6 + a[0] * 1e4 + a[2] * 100;
    if (a[1] === a[2]) return 1e6 + a[1] * 1e4 + a[0] * 100;
    return a[0] * 1e4 + a[1] * 100 + a[2];
  }
  const catOf = k => Math.floor(k / 1e6);
  function nameOf(vs) {
    const k = keyOf(vs), c = catOf(k), a = vs.slice().sort((x, y) => y - x);
    if (c === 3) return `${a[0]} 트리플`;
    if (c === 2) return `${a[0]} 스트레이트`;
    if (c === 1) { const p = a[0] === a[1] ? a[0] : a[1]; return `${p} 더블`; }
    return `${a.join("·")} 싱글`;
  }
  // 순위 점수 (동률은 평균) — keys[s] 가 null 이면 빠짐
  function rankPts(keys, n) {
    const P = PTS[n] || PTS[4], out = Array(keys.length).fill(0), idx = keys.map((k, s) => s).filter(s => keys[s] != null);
    idx.sort((x, y) => keys[y] - keys[x]);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && keys[idx[j + 1]] === keys[idx[i]]) j++;
      let sum = 0; for (let r = i; r <= j; r++) sum += P[r] || 0;
      for (let r = i; r <= j; r++) out[idx[r]] = sum / (j - i + 1);
      i = j + 1;
    }
    return out;
  }
  const predOk = (p, x) => (p === 0 ? x === 0 : p === 1 ? x > 0 && x < 7 : p === 2 ? x >= 7 && x <= 10 : p === 3 ? x > 10 : false);
  const gainOf = (p, x) => (predOk(p, x) ? (p === 0 ? 40 : x * 2) : x);
  const C3 = m => { const o = []; for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) for (let c = b + 1; c < m.length; c++) o.push([m[a], m[b], m[c]]); return o; };

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(2, Math.min(4, n | 0 || 4));
    const o = optsOf(cfg);
    const st = { n, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, R: o.rounds, round: 0, phase: "pred",
      dice: [], used: [], rev: [], pred: [], first: Math.floor(mix(seed, 3) * n) % n, trick: 0, order: [], ti: 0, subs: [], rp: Array(n).fill(0), tot: Array(n).fill(0),
      tricks: [], hist: [], log: [], seq: 0, over: false, res: null, top: -1 };
    startRound(st);
    return st;
  }
  const orderFrom = (n, f) => Array.from({ length: n }, (_, i) => (f + i) % n);
  function startRound(st) {
    st.round++;
    st.dice = []; st.used = []; st.rev = [];
    for (let s = 0; s < st.n; s++) {
      st.dice.push(KINDS.map((k, i) => 1 + Math.floor(mix(st.rs, st.round, s, i, 11) * 6)));
      st.used.push(Array(11).fill(false)); st.rev.push(Array(11).fill(false));
    }
    if (st.round > 1 && st.top >= 0) st.first = st.top;
    st.pred = Array(st.n).fill(-1); st.rp = Array(st.n).fill(0); st.tricks = []; st.trick = 0; st.subs = Array(st.n).fill(null);
    st.order = orderFrom(st.n, st.first); st.ti = 0;
    st.phase = "pred";
    push(st, { k: "round", r: st.round, first: st.first });
  }
  function startTrick(st) {
    st.trick++; st.subs = Array(st.n).fill(null); st.order = orderFrom(st.n, st.first); st.ti = 0; st.phase = "play";
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "pred") return st.order.filter(s => st.pred[s] < 0);
    if (st.phase === "play") return [st.order[st.ti]];
    return [];
  }
  const over = st => !!st.over;
  function ranks(st) { return st.tot.map(p => st.tot.filter(q => q > p + 1e-9).length); }

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: st.phase === "pred" || st.phase === "play" ? "지금은 차례가 아니에요" : "잠깐 — 결과를 보는 중이에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "pred") {
      if (a.t !== "pred" || !Number.isInteger(a.p) || a.p < 0 || a.p > 3) return { ok: false, err: "예측 카드(ZERO · MIN · MORE · MAX)를 골라요" };
      st.pred[seat] = a.p;
      push(st, { k: "act", r: st.round, s: seat, a: { t: "pred" } });            // 예측은 라운드 끝까지 비밀
      if (st.pred.every(p => p >= 0)) startTrick(st);
      return { ok: true };
    }
    if (a.t !== "sub" || !Array.isArray(a.d) || a.d.length !== 3) return { ok: false, err: "주사위 3개를 골라요" };
    const d = a.d.slice();
    if (d.some(i => !Number.isInteger(i) || i < 0 || i > 10) || new Set(d).size !== 3) return { ok: false, err: "주사위 3개를 골라요" };
    if (d.some(i => st.used[seat][i])) return { ok: false, err: "이미 낸 주사위예요" };
    d.sort((x, y) => x - y);
    for (const i of d) st.used[seat][i] = true;
    st.subs[seat] = d;
    push(st, { k: "act", r: st.round, t: st.trick, s: seat, a: { t: "sub", d: d.slice() } });
    st.ti++;
    if (st.ti >= st.n) endTrick(st);
    return { ok: true };
  }
  function endTrick(st) {
    const keys = st.subs.map((d, s) => keyOf(d.map(i => st.dice[s][i])));
    const pts = rankPts(keys, st.n);
    for (let s = 0; s < st.n; s++) { st.rp[s] += pts[s]; for (const i of st.subs[s]) st.rev[s][i] = true; }
    // 다음 선: 가장 높은 조합 → 동률이면 누적 승점(지금까지 + 이번 라운드) → 그래도 같으면 앞 순서
    const best = Math.max(...keys);
    let cand = st.order.filter(s => keys[s] === best);
    if (cand.length > 1) { const sc = s => st.tot[s] + st.rp[s]; const m = Math.max(...cand.map(sc)); cand = cand.filter(s => sc(s) === m); }
    st.top = cand[0]; st.first = st.top;
    st.tricks.push({ t: st.trick, order: st.order.slice(), subs: st.subs.map((d, s) => ({ d: d.slice(), v: d.map(i => st.dice[s][i]), k: d.map(i => KINDS[i]) })), keys, pts, top: st.top });
    push(st, { k: "trick", r: st.round, t: st.trick, pts: pts.slice(), top: st.top });
    st.phase = "trick";
  }
  function endRound(st) {
    const gain = st.rp.map((x, s) => gainOf(st.pred[s], x));
    for (let s = 0; s < st.n; s++) st.tot[s] += gain[s];
    st.hist.push({ r: st.round, pred: st.pred.slice(), rp: st.rp.slice(), gain, ok: st.rp.map((x, s) => predOk(st.pred[s], x)), tot: st.tot.slice(), tricks: st.tricks.map(t => JSON.parse(JSON.stringify(t))), dice: st.dice.map(x => x.slice()), rev: st.rev.map(x => x.slice()) });
    push(st, { k: "rend", r: st.round, gain: gain.slice(), pred: st.pred.slice() });
    st.phase = "rend";
  }
  const auto = st => (st.over ? null : st.phase === "trick" ? 3200 : st.phase === "rend" ? 5200 : null);
  function advance(st) {
    if (st.over) return;
    if (st.phase === "trick") { if (st.trick < 3) startTrick(st); else endRound(st); return; }
    if (st.phase === "rend") { if (st.round >= st.R) finish(st); else startRound(st); }
  }
  function finish(st) {
    st.over = true; st.phase = "end";
    const best = Math.max(...st.tot);
    st.res = { tot: st.tot.slice(), w: st.tot.map((p, i) => i).filter(i => Math.abs(st.tot[i] - best) < 1e-9) };
    push(st, { k: "end", tot: st.tot.slice() });
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "pred") return [0, 1, 2, 3].map(p => ({ t: "pred", p }));
    return C3([...Array(11).keys()].filter(i => !st.used[seat][i])).map(d => ({ t: "sub", d }));
  }

  // ── 보이는 것 ──
  //  흰 주사위 · 낸 주사위 · 점수는 모두 공개. 남의 히든(빨강 · 파랑)은 그 제출이 끝나야 공개, 예측은 라운드 끝까지 비밀
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, all = seat === "all";
    const seeV = (s, i) => all || s === me || KINDS[i] === "w" || st.rev[s][i];
    const showPred = st.phase === "rend" || st.phase === "end";
    const dice = st.dice.map((ds, s) => ds.map((v, i) => ({ v: seeV(s, i) ? v : null, k: KINDS[i], u: st.used[s][i] })));
    const subs = st.subs.map((d, s) => (d ? d.map(i => ({ i, v: seeV(s, i) ? st.dice[s][i] : null, k: KINDS[i] })) : null));
    const pubObj = { r: st.round, p: st.phase, t: st.trick, o: st.order, ti: st.ti, w: st.dice.map(ds => ds.slice(0, 9)), u: st.used, rv: st.rev.map((x, s) => x.map((b, i) => (b ? st.dice[s][i] : 0))),
      sb: st.subs, pd: st.pred.map(p => p >= 0), rp: st.rp, tot: st.tot, h: st.hist.length, sp: showPred ? st.pred : 0 };
    return {
      n: st.n, R: st.R, opt: Object.assign({}, st.opt), round: st.round, phase: st.phase, trick: st.trick, order: st.order.slice(), ti: st.ti, first: st.first,
      cur: st.phase === "play" && !st.over ? st.order[st.ti] : -1, dice, subs,
      pred: st.pred.map((p, s) => (all || s === me || showPred ? p : -1)), predDone: st.pred.map(p => p >= 0),
      rp: st.rp.slice(), tot: st.tot.slice(),
      tricks: st.tricks.map(t => JSON.parse(JSON.stringify(t))),
      hist: st.hist.map(h => { const c = JSON.parse(JSON.stringify(h)); c.dice = c.dice.map((ds, s) => ds.map((v, i) => (all || s === me || st.over || KINDS[i] === "w" || h.rev[s][i] ? v : null))); delete c.rev; return c; }),
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? { tot: st.res.tot.slice(), w: st.res.w.slice() } : null,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)).toString(36),
    };
  }

  // ── AI ──
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // 보기 → 굴려 볼 판 (모르는 히든 주사위는 R 로 채움)
  function simFrom(V, me, R) {
    const n = V.n, dice = [], used = [];
    for (let s = 0; s < n; s++) { dice.push(V.dice[s].map(d => (d.v == null ? 1 + Math.floor(R() * 6) : d.v))); used.push(V.dice[s].map(d => d.u)); }
    const subs = V.subs.map(d => (d ? d.map(x => x.i) : null)), known = V.subs.map(d => !d || d.every(x => x.v != null));
    return { n, dice, used, subs, known, real: false, rp: V.rp.slice(), tot: V.tot.slice(), order: V.order.slice(), ti: V.ti, trick: V.trick, first: V.first, plan: Array(n).fill(1) };
  }
  // 주사위 값으로 본 힘: 가장 좋은 세 묶음 (겹치지 않게, 욕심껏)
  function bestSets(vals, idx) {
    let left = idx.slice(); const out = [];
    for (let t = 0; t < 3 && left.length >= 3; t++) {
      let best = null, bk = -1;
      for (const c of C3(left)) { const k = keyOf(c.map(i => vals[i])); if (k > bk) { bk = k; best = c; } }
      out.push({ d: best, k: bk }); left = left.filter(i => !best.includes(i));
    }
    return out;
  }
  // 예측 짐작 (남의 것): 흰 주사위 + 모르는 히든은 굴려 둔 값으로 센 트리플 수
  function guessPlan(vals, idx) {
    const b = bestSets(vals, idx), tri = b.filter(x => catOf(x.k) === 3).length, strong = b.filter(x => x.k >= 3e6 + 4e4).length;
    if (strong >= 2) return 3; if (tri >= 2 || strong >= 1) return 2; if (b.length && b[0].k < 2e6) return 0; return 1;
  }
  // 기본 수 고르기 (굴려 보기 안의 모든 사람 · 보통 AI): 계획(예측)에 맞춰 이기러 가거나 버림
  function wantWin(plan, rp, left) {
    if (plan === 0) return false;
    if (plan === 3) return true;
    if (plan === 2) return rp < 7;                     // MORE: 7점이 되면 그다음은 버림 (10 넘지 않게)
    return rp === 0;                                      // MIN: 한 번 점수를 얻으면 그다음은 버림
  }
  function defaultPick(sim, s, R, noise) {
    const idx = []; for (let i = 0; i < 11; i++) if (!sim.used[s][i]) idx.push(i);
    const vals = sim.dice[s], cs = C3(idx).map(d => ({ d, k: keyOf(d.map(i => vals[i])) }));
    cs.sort((a, b) => a.k - b.k);
    if (noise && R() < noise) return cs[Math.floor(R() * cs.length)].d;
    const pos = sim.ti, last = pos === sim.n - 1, left = 4 - sim.trick;
    let shown = -1; for (let j = 0; j < pos; j++) { const o = sim.order[j], d = sim.subs[o]; if (d && (!sim.real || sim.known[o])) shown = Math.max(shown, keyOf(d.map(i => sim.dice[o][i]))); }
    if (!wantWin(sim.plan[s], sim.rp[s], left)) return cs[0].d;                  // 가장 약한 것 버리기
    const sets = bestSets(vals, idx);
    if (last) { const w = cs.find(c => c.k > shown); return w ? w.d : cs[0].d; }   // 마지막이면 이기는 것 중 가장 싼 것
    // 앞이면: 이번에 쓸 묶음 = 가장 좋은 묶음 (남은 제출 수만큼 좋은 묶음이 있으면 아끼지 않음)
    const top = sets[0]; if (top.k > shown) return top.d;
    const w = cs.find(c => c.k > shown); return w ? w.d : cs[0].d;
  }
  function simTrickEnd(sim) {
    const keys = sim.subs.map((d, s) => keyOf(d.map(i => sim.dice[s][i])));
    const pts = rankPts(keys, sim.n);
    for (let s = 0; s < sim.n; s++) sim.rp[s] += pts[s];
    const best = Math.max(...keys); let cand = sim.order.filter(s => keys[s] === best);
    if (cand.length > 1) { const sc = s => sim.tot[s] + sim.rp[s]; const m = Math.max(...cand.map(sc)); cand = cand.filter(s => sc(s) === m); }
    sim.first = cand[0];
  }
  // 지금 장면부터 라운드 끝까지 (첫 수 a0 는 me 가 지금 냄)
  function rollout(sim, me, a0, R, noise) {
    let first = true;
    while (sim.trick <= 3) {
      while (sim.ti < sim.n) {
        const s = sim.order[sim.ti];
        const d = first && s === me && a0 ? a0 : defaultPick(sim, s, R, s === me ? 0 : noise);
        first = false;
        for (const i of d) sim.used[s][i] = true;
        sim.subs[s] = d; sim.ti++;
      }
      simTrickEnd(sim);
      if (sim.trick === 3) break;
      sim.trick++; sim.subs = Array(sim.n).fill(null); sim.order = orderFrom(sim.n, sim.first); sim.ti = 0;
    }
    return sim.rp;
  }
  const PROF = {
    easy:   { predSims: 0, subSims: 0, noise: 0.35, predNoise: 0.45 },
    normal: { predSims: 10, subSims: 0, noise: 0.08, predNoise: 0.1 },
    hard:   { predSims: 36, subSims: 24, noise: 0, predNoise: 0, cands: 12, scale: 2.2 },
  };
  // 굴려 보는 횟수는 인원이 늘수록 한 번이 비싸므로 인원에 맞춰 줄임 (이 PC 에서 ai() 150ms 안 — 폰은 3~4배 느림)
  const simsFor = (P, V, k) => (P.scale ? Math.max(8, Math.min(P[k], Math.round(P[k] * P.scale / V.n))) : P[k]);
  // 예측: 계획마다 굴려 보고 기대 승점이 가장 큰 것
  function predRows(V, s, P, seed) {
    const rows = [];
    for (let p = 0; p < 4; p++) {
      let ev = 0, ok = 0; const R = seeded(seed), NS = simsFor(P, V, "predSims");
      for (let k = 0; k < NS; k++) {
        const sim = simFrom(V, s, R);
        for (let o = 0; o < V.n; o++) sim.plan[o] = o === s ? p : guessPlan(sim.dice[o], [...Array(11).keys()]);
        sim.trick = 1; sim.ti = 0; sim.order = orderFrom(V.n, V.first); sim.subs = Array(V.n).fill(null);
        const x = rollout(sim, s, null, R, 0.05)[s];
        ev += gainOf(p, x); if (predOk(p, x)) ok++;
      }
      rows.push({ p, ev: ev / NS, ok: ok / NS });
    }
    rows.sort((a, b) => b.ev - a.ev || a.p - b.p);
    return rows;
  }
  function quickPred(V, s, R, noise) {
    const vals = V.dice[s].map(d => d.v), b = bestSets(vals, [...Array(11).keys()]);
    const tri = b.filter(x => catOf(x.k) === 3).length, hi = b.filter(x => x.k >= 3e6 + 4e4).length;
    let p = hi >= 2 ? 3 : tri >= 1 ? 2 : b[0].k < 2e6 ? 0 : 1;
    if (R() < noise) p = Math.floor(R() * 4);
    return p;
  }
  // 제출: 후보마다 라운드 끝까지 굴려 보고 (내 예측 기준) 기대 승점
  function subRows(V, s, P, seed) {
    const R = seeded(seed ^ 0x51ED);
    const idx = []; for (let i = 0; i < 11; i++) if (!V.dice[s][i].u) idx.push(i);
    const vals = V.dice[s].map(d => d.v);
    const all = C3(idx).map(d => ({ d, k: keyOf(d.map(i => vals[i])) })).sort((a, b) => a.k - b.k);
    // 후보: 가장 약한 것 · 가장 센 것 · 기본 수 · 등급별 대표 (중복 없이)
    const seen = new Set(), cands = [];
    const add = c => { const key = c.d.join(","); if (!seen.has(key)) { seen.add(key); cands.push(c); } };
    add(all[0]); add(all[all.length - 1]);
    const base = simFrom(V, s, R); for (let o = 0; o < V.n; o++) base.plan[o] = o === s ? V.pred[s] : guessPlan(base.dice[o], [...Array(11).keys()]);
    const dp = defaultPick(base, s, R, 0); add({ d: dp, k: keyOf(dp.map(i => vals[i])) });
    // 앞사람이 낸 것 중 보이는 가장 높은 조합을 이기는 가장 싼 것
    let shown = -1; for (let j = 0; j < V.ti; j++) { const o = V.order[j], d = V.subs[o]; if (d && d.every(x => x.v != null)) shown = Math.max(shown, keyOf(d.map(x => x.v))); }
    const w = all.find(c => c.k > shown); if (w) add(w);
    for (const c of bestSets(vals, idx)) add(c);
    const step = Math.max(1, Math.floor(all.length / 6)); for (let j = 0; j < all.length; j += step) add(all[j]);
    const top = cands.slice(0, P.cands || 12);
    for (const c of top) { const e = evalSub(V, s, c.d, simsFor(P, V, "subSims"), seed); c.ev = e.ev; c.ok = e.ok; }
    top.sort((a, b) => b.ev - a.ev || a.k - b.k);
    return top;
  }
  // 내 수 하나를 라운드 끝까지 굴려 본 값 (같은 씨앗이면 같은 표본 — 후보끼리 · 복기에서 공정하게 견줌)
  function evalSub(V, s, d, sims, seed) {
    const R = seeded(seed), p = V.pred[s]; let ev = 0, ok = 0;
    for (let k = 0; k < sims; k++) {
      const sim = simFrom(V, s, R);
      for (let o = 0; o < V.n; o++) sim.plan[o] = o === s ? p : guessPlan(sim.dice[o], [...Array(11).keys()]);
      const x = rollout(sim, s, d, R, 0.05)[s];
      ev += gainOf(p, x); if (predOk(p, x)) ok++;
    }
    return { ev: ev / sims, ok: ok / sims };
  }
  const keyV = (V, s) => hash(JSON.stringify([V.round, V.trick, V.ti, V.dice[s], V.subs, V.rp, V.tot, V.pred[s], s]));
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const seed = keyV(V, s), R = P === PROF.hard || typeof rnd !== "function" ? seeded(seed) : rnd;
    if (V.phase === "pred") {
      if (!P.predSims) return { t: "pred", p: quickPred(V, s, R, P.predNoise) };
      const rows = predRows(V, s, P, P === PROF.hard ? seed : (R() * 4294967296) >>> 0);
      if (P.predNoise && R() < P.predNoise) return { t: "pred", p: rows[Math.min(rows.length - 1, 1)].p };
      return { t: "pred", p: rows[0].p };
    }
    if (V.phase === "play") {
      if (P.subSims) return { t: "sub", d: subRows(V, s, P, seed)[0].d.slice() };
      const sim = simFrom(V, s, R);
      sim.plan[s] = V.pred[s]; sim.real = true;                       // 실제 수: 앞사람의 안 보이는 히든은 모르는 채로
      return { t: "sub", d: defaultPick(sim, s, R, P.noise).slice() };
    }
    return null;
  }
  function ai(V, s, tier, rnd) { return aiWith(V, s, PROF[tier] || PROF.normal, rnd); }
  // 추천 = 고급 AI 의 수 그대로 + 굴려 본 숫자
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, seed = keyV(V, s);
    if (V.phase === "pred") { const rows = predRows(V, s, P, seed); return { a: { t: "pred", p: rows[0].p }, rows }; }
    const rows = subRows(V, s, P, seed); return { a: { t: "sub", d: rows[0].d.slice() }, rows };
  }
  // 복기: 내 수 · 고급 AI 수를 같은 표본으로 (예측은 네 장 모두, 제출은 둘만)
  function judge(V, s, myA, bestA) {
    if (!V || !myA || !bestA || V.phase !== (myA.t === "pred" ? "pred" : "play")) return null;
    const P = PROF.hard, seed = keyV(V, s);
    if (myA.t === "pred") { const rows = predRows(V, s, P, seed), f = p => rows.find(r => r.p === p); return { my: f(myA.p), best: f(bestA.p), rows }; }
    const sims = simsFor(P, V, "subSims") * 2;
    return { my: evalSub(V, s, myA.d, sims, seed), best: evalSub(V, s, bestA.d, sims, seed) };
  }

  return {
    id: "tripledice", PREDS, PTS, KINDS, CAT, OPTS, PROF, optsOf, keyOf, catOf, nameOf, rankPts, predOk, gainOf, C3,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, predRows, subRows, evalSub, simFrom, defaultPick, bestSets,
  };
});

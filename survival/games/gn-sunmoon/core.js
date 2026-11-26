/* 베니 서바이벌 · 해 달 별 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 2 (룰 브레이커) 2화 · 4화 데스매치 (나무위키 회차 문서 기준)
   · 두 사람, 칩 4개씩. 매 라운드 관전 플레이어 1명이 해 · 달 · 별 중 하나를 숨김 — 그 표식이 정답
   · 선 · 후가 매 라운드 바뀜. 선이 먼저 건다: 합계 0 ~ 상대 칩의 절반(소수 버림). 후는 선 합계의 2배 이상(칩이 모자라면 올인)
   · 칩은 해 · 달 · 별 세 칸에 나눠 걸 수 있음. 맞힌 칸은 3배로 돌려받고 틀린 칸은 잃음
   · 10라운드(4화는 8라운드)가 끝났을 때 칩이 많은 쪽 승리. 도중에 칩이 0이 되면 바로 탈락
   우리 판 다듬기: 관전 플레이어는 AI 가 맡고, 대화 대신 두 사람에게 따로 한 줄 귀띔(맞을 확률 50%)을 줌
   · 1라운드 선은 동전 던지기 (방송은 가넷이 많은 쪽이 고름) · 선 베팅은 칸별로 후에게 보임 (방송 문서에 명시는 없음, 후가 보고 따라 거는 장면이 있음) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-sunmoon"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // 조사 고르기: 끝 글자 받침으로 (숫자는 읽는 소리 — 0 영 · 1 일 · 3 삼 · 6 육 · 7 칠 · 8 팔 · 10 십 은 받침, 영문 L R M N 도 받침) · t = 은 · 을 · 와 · 로 (로 는 으로/로)
  const ja = (w, t) => { let s = String(w).replace(/<[^>]*>/g, "").trim(), b = 0; if (!/%$/.test(s)) { s = s.replace(/[)\]\s]+$/, ""); const c = s.slice(-1);
    if (/[가-힣]/.test(c)) { const k = (c.charCodeAt(0) - 44032) % 28; b = k === 0 ? 0 : k === 8 ? 2 : 1; }
    else if (/\d/.test(c)) b = c === "0" ? 1 : ({ 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 })[c] || 0;
    else if (/[A-Za-z]/.test(c)) b = /[lr]/i.test(c) ? 2 : /[mn]/i.test(c) ? 1 : 0; }
    return t === "로" ? (b === 1 ? "으로" : "로") : ({ 이: "가이", 은: "는은", 을: "를을", 와: "와과" })[t][b ? 1 : 0]; };
  const MARKS = ["해", "달", "별"], EM = ["☀️", "🌙", "⭐"];
  const START = 4, TRUTH = 0.5;
  const WIT = ["하나", "두리", "세나", "네리", "다솜", "여름", "이든", "온새", "지음", "라온", "보람", "아라"];
  const sum = b => b[0] + b[1] + b[2];

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed, cfg }) {
    const R = Math.max(1, Math.min(12, (cfg && +cfg.rounds) || 10));
    const st = { n: 2, rs: (seed >>> 0) || 1, R, round: 0, chips: [START, START], first: 0, phase: "", bets: [null, null], mark: -1, hint: [-1, -1], wit: "", log: [], seq: 0, over: false, res: null, hist: [], cfg: cfg || {} };
    st.first = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    st.firstR1 = st.first;
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.first = (st.firstR1 + st.round - 1) % 2;
    const c = st.cfg || {};
    const mk = c.marks && c.marks[st.round - 1] != null ? c.marks[st.round - 1] : Math.floor(rnd(st) * 3);
    st.mark = mk;
    st.hint = [0, 1].map(i => {
      if (c.hints && c.hints[st.round - 1] && c.hints[st.round - 1][i] != null) return c.hints[st.round - 1][i];
      if (rnd(st) < TRUTH) return mk;
      const o = [0, 1, 2].filter(k => k !== mk); return o[Math.floor(rnd(st) * 2)];
    });
    st.wit = WIT[(st.round - 1) % WIT.length];
    st.bets = [null, null]; st.res = null; st.phase = "first";
    push(st, { k: "round", r: st.round, f: st.first });
  }
  const second = st => 1 - st.first;
  const limitFirst = st => Math.min(st.chips[st.first], Math.floor(st.chips[second(st)] / 2));
  const rangeSecond = st => { const x = sum(st.bets[st.first]), C = st.chips[second(st)]; return { min: Math.min(2 * x, C), max: C }; };

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "first") return [st.first];
    if (st.phase === "second") return [second(st)];
    return [];
  }
  function validBet(b) { return Array.isArray(b) && b.length === 3 && b.every(x => Number.isInteger(x) && x >= 0); }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a.t !== "bet" || !validBet(a.b)) return { ok: false, err: "해 · 달 · 별에 건 칩을 정해 주세요" };
    const b = a.b.slice(), tot = sum(b);
    if (st.phase === "first") {
      const L = limitFirst(st);
      if (tot > L) return { ok: false, err: `선은 ${L}칩까지만 걸 수 있어요 (상대 칩의 절반)` };
    } else {
      const g = rangeSecond(st);
      if (tot < g.min) return { ok: false, err: tot === 0 ? "후는 선이 건 칩의 2배 이상 걸어야 해요" : `후는 ${g.min}칩 이상 걸어야 해요 (선의 2배, 모자라면 올인)` };
      if (tot > g.max) return { ok: false, err: "가진 칩보다 많이 못 걸어요" };
    }
    st.bets[seat] = b;
    st.chips[seat] -= tot;
    push(st, { k: "bet", s: seat, b: st.phase === "first" ? b : null, x: tot });
    if (st.phase === "first") { st.phase = "second"; return { ok: true }; }
    reveal(st);
    return { ok: true };
  }
  function reveal(st) {
    const gain = [0, 0];
    for (const i of [0, 1]) { gain[i] = 3 * st.bets[i][st.mark]; st.chips[i] += gain[i]; }
    const row = { r: st.round, f: st.first, mark: st.mark, bets: st.bets.map(b => b.slice()), gain, chips: st.chips.slice(), wit: st.wit, hint: st.hint.slice() };
    st.res = row; st.hist.push(row);
    st.phase = "reveal";
    push(st, { k: "reveal", r: st.round, mark: st.mark, gain: gain.slice() });
    if (st.chips[0] <= 0 || st.chips[1] <= 0 || st.round >= st.R) { st.over = true; st.phase = "end"; push(st, { k: "end" }); }
  }
  const auto = st => (st.phase === "reveal" ? 3200 : null);
  function advance(st) { if (st.phase === "reveal") startRound(st); }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);

  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "first") return [{ t: "bet", b: [0, 0, 0] }];
    const g = rangeSecond(st), b = [0, 0, 0]; b[st.hint[seat] >= 0 ? st.hint[seat] : 0] = g.min;
    return [{ t: "bet", b }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", reveal = st.phase === "reveal" || st.phase === "end";
    const seeBet = i => reveal || i === st.first && st.phase === "second" || all || i === seat;
    const bets = st.bets.map((b, i) => (b && (reveal || seeBet(i)) ? b.slice() : null));
    const hint = st.hint.map((h, i) => (all || i === seat ? h : -2));
    const pubObj = { r: st.round, p: st.phase, c: st.chips, f: st.first, b: st.phase === "first" ? 0 : (reveal ? st.bets : st.bets[st.first]), m: reveal ? st.mark : -1, ov: st.over };
    return {
      n: 2, R: st.R, round: st.round, phase: st.phase, chips: st.chips.slice(), first: st.first, second: second(st), bets, mark: reveal ? st.mark : -1,
      hint, wit: st.wit, lim: st.phase === "first" ? limitFirst(st) : 0, range: st.phase === "second" ? rangeSecond(st) : null,
      res: st.res && !all ? Object.assign({}, st.res, { hint: st.res.hint.map((h, i) => (i === seat ? h : -2)) }) : st.res, hist: st.hist.map(h => ({ r: h.r, f: h.f, mark: h.mark, gain: h.gain, chips: h.chips, bets: h.bets })),
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(),
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · AI ─────────────────────────────────────────────
  // 내 귀띔 + (내가 후라면) 선이 건 모양으로 정답 확률을 어림
  function posterior(V, me, tier) {
    const p = [1, 1, 1], h = V.hint[me];
    if (h >= 0) for (let k = 0; k < 3; k++) p[k] *= k === h ? TRUTH : (1 - TRUTH) / 2;
    const strength = tier === "hard" ? 1 : tier === "normal" ? 0.55 : 0;
    const ob = V.phase === "second" && V.second === me ? V.bets[V.first] : null;
    if (ob && sum(ob) > 0 && strength) {
      const t = sum(ob);
      for (let k = 0; k < 3; k++) {
        let L = 0; for (let g = 0; g < 3; g++) L += (g === k ? TRUTH : (1 - TRUTH) / 2) * (ob[g] / t);
        p[k] *= Math.pow(L + 0.02, strength);
      }
    }
    const s = p[0] + p[1] + p[2]; return p.map(x => x / s);
  }
  function split(total, p, gamma) {
    const w = p.map(x => Math.pow(x, gamma)), s = w[0] + w[1] + w[2];
    const raw = w.map(x => x / s * total), b = raw.map(Math.floor);
    let left = total - sum(b);
    const ord = [0, 1, 2].sort((x, y) => (raw[y] - b[y]) - (raw[x] - b[x]));
    for (let k = 0; left > 0; k = (k + 1) % 3, left--) b[ord[k]]++;
    return b;
  }
  const maxOf = p => Math.max(p[0], p[1], p[2]);
  function planHeur(V, me, tier, r) {   // 보통 · 초급 (초급은 '귀띔 믿고 한 칸에 몰아 거는' 초보자)
    const C = V.chips[me], O = V.chips[1 - me], p = posterior(V, me, tier), mp = maxOf(p);
    if (tier === "easy") {
      const lo = V.phase === "first" ? 0 : V.range.min, hi = V.phase === "first" ? V.lim : V.range.max;
      const total = Math.min(hi, Math.max(lo, Math.round(lo + (hi - lo) * (0.4 + 0.6 * r()))));
      const k = V.hint[me] >= 0 ? V.hint[me] : Math.floor(r() * 3), b = [0, 0, 0]; b[k] = total;
      return { b, total, p, mp, why: "hint" };
    }
    const last = V.round >= V.R, gamma = 1.6;
    let total, why;
    if (V.phase === "first") {
      const lim = V.lim, lead = C >= O * 2.2 && !last;
      if (lead) { total = 0; why = "lead"; }
      else { const frac = mp >= 0.5 ? 0.8 : 0.5; total = Math.min(lim, Math.round(lim * frac)); why = mp >= 0.5 ? "hint" : "weak"; }
    } else {
      const g = V.range, behind = O > C * 1.8;
      const want = (mp >= 0.62 || (behind && last)) ? C : mp >= 0.48 ? C * 0.75 : C * 0.4;
      total = Math.max(g.min, Math.min(g.max, Math.round(want))); why = mp >= 0.5 ? "hint" : "weak";
    }
    return { b: split(total, p, gamma), total, p, mp, why };
  }
  // 고급: 가능한 베팅 몇 가지를 끝까지 여러 번 돌려 보고(몬테카를로) 이길 확률이 가장 높은 것을 골라요.
  // 내 귀띔 · 선의 베팅으로 정한 정답 확률로 정답을 뽑고, 앞으로의 라운드는 양쪽이 '보통'처럼 둔다고 봐요 (상대 숨은 귀띔은 쓰지 않음).
  const mrng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const synV = (st, seat, phase) => {
    const hint = [-2, -2]; hint[seat] = st.hint[seat];
    return { n: 2, R: st.R, round: st.round, phase, chips: st.chips.slice(), first: st.first, second: 1 - st.first, bets: st.bets, hint,
      lim: phase === "first" ? Math.min(st.chips[st.first], Math.floor(st.chips[1 - st.first] / 2)) : 0,
      range: phase === "second" ? { min: Math.min(2 * sum(st.bets[st.first]), st.chips[1 - st.first]), max: st.chips[1 - st.first] } : null };
  };
  const drawHint = (rr, m) => (rr() < TRUTH ? m : [0, 1, 2].filter(k => k !== m)[Math.floor(rr() * 2)]);
  function candBets(p, lo, hi) {
    const ts = new Set([lo, hi]); for (const f of [0.25, 0.5, 0.75]) ts.add(lo + Math.round((hi - lo) * f));
    const out = [], seen = new Set(), ord = [0, 1, 2].sort((a, b) => p[b] - p[a]);
    const add = b => { const key = b.join(","); if (!seen.has(key)) { seen.add(key); out.push(b); } };
    for (const t of [...ts].filter(x => x >= lo && x <= hi).sort((a, b) => a - b)) {
      if (t === 0) { add([0, 0, 0]); continue; }
      const top = [0, 0, 0]; top[ord[0]] = t; add(top);
      for (const g of [2.4, 1.2]) add(split(t, p, g));
      if (t >= 2) { const t2 = [0, 0, 0]; t2[ord[0]] = Math.ceil(t * 0.67); t2[ord[1]] = t - t2[ord[0]]; add(t2); }
    }
    return out;
  }
  // 상대가 지금까지 늘 한 칸에만 몰아 걸었다면(초보 습관) 앞으로도 그렇게 건다고 보고 맞서요
  const lumpyOpp = (V, opp) => { const past = (V.hist || []).map(h => h.bets[opp]).filter(b => b && sum(b) > 0); return past.length >= 2 && past.filter(b => Math.max(...b) >= 0.9 * sum(b)).length >= 0.75 * past.length; };
  // 내 베팅 b 하나를 끝까지 K 번 가상으로 두어 이긴 횟수(동점 0.5)와 마지막 칩 차(나 − 상대)의 합을 돌려줘요.
  // 표본 i 의 난수는 base 와 i 로만 정해져서, 같은 base 로 부르면 여러 베팅을 같은 난수(공통 난수)로 견줄 수 있어요.
  function simBet(V, me, b, p, base, K, oTier) {
    const opp = 1 - me, iFirst = V.first === me, sTier = "normal";
    let win = 0, dchip = 0;
    for (let i = 0; i < K; i++) {
      const rr = mrng(base + i * 7919 + 13);
      const st = { R: V.R, round: V.round, chips: V.chips.slice(), first: V.first, bets: [null, null], mark: 0, hint: [-1, -1] };
      const u = rr(); st.mark = u < p[0] ? 0 : u < p[0] + p[1] ? 1 : 2;
      st.bets[me] = b; st.chips[me] -= sum(b);
      if (iFirst) { st.hint[opp] = drawHint(rr, st.mark); const ob = planHeur(synV(st, opp, "second"), opp, oTier, rr).b; st.bets[opp] = ob; st.chips[opp] -= sum(ob); }
      else st.bets[opp] = V.bets[V.first].slice();
      st.chips[0] += 3 * st.bets[0][st.mark]; st.chips[1] += 3 * st.bets[1][st.mark];
      let dead = st.chips[0] <= 0 || st.chips[1] <= 0, rd = V.round;
      while (!dead && rd < V.R) {
        rd++; st.round = rd; st.first = (V.first + rd - V.round) % 2; st.bets = [null, null];
        st.mark = Math.floor(rr() * 3); st.hint = [drawHint(rr, st.mark), drawHint(rr, st.mark)];
        const f = st.first, sc = 1 - f, bf = planHeur(synV(st, f, "first"), f, f === me ? sTier : oTier, rr).b; st.chips[f] -= sum(bf); st.bets[f] = bf;
        const bs = planHeur(synV(st, sc, "second"), sc, sc === me ? sTier : oTier, rr).b; st.chips[sc] -= sum(bs); st.bets[sc] = bs;
        st.chips[0] += 3 * st.bets[0][st.mark]; st.chips[1] += 3 * st.bets[1][st.mark];
        if (st.chips[0] <= 0 || st.chips[1] <= 0) dead = true;
      }
      win += st.chips[me] > st.chips[opp] ? 1 : st.chips[me] === st.chips[opp] ? 0.5 : 0;
      dchip += st.chips[me] - st.chips[opp];
    }
    return { win, dchip };
  }
  function planMC(V, me, r, K) {
    const opp = 1 - me, p = posterior(V, me, "hard"), iFirst = V.first === me;
    const cands = candBets(p, iFirst ? 0 : V.range.min, iFirst ? V.lim : V.range.max);
    const base = Math.floor(r() * 1e9), oTier = lumpyOpp(V, opp) ? "easy" : "normal";
    let best = null, bw = -1;
    for (const b of cands) {
      const win = simBet(V, me, b, p, base, K, oTier).win;
      if (win > bw) { bw = win; best = b; }
    }
    const total = sum(best), pp = posterior(V, me, "hard");
    return { b: best, total, p: pp, mp: maxOf(pp), why: total === 0 ? "lead" : maxOf(pp) >= 0.5 ? "hint" : "weak", win: bw / K };
  }
  // 복기용: 두 베팅(내 수 · 고급 AI 의 수)을 같은 난수로 K 번씩 끝까지 둬 보고 이길 확률 · 마지막 칩 차 · 이번 라운드 기대 칩을 돌려줘요.
  // 고르는 것은 하지 않고 받은 view 를 바꾸지 않아요. seed(정수)로 난수가 정해져 같은 장면은 늘 같은 값이에요.
  function compareBets(V, me, bA, bB, seed, K) {
    K = K || 120;
    const p = posterior(V, me, "hard"), base = Math.floor(mrng((seed >>> 0) || 1)() * 1e9), oTier = lumpyOpp(V, 1 - me) ? "easy" : "normal";
    return [bA, bB].map(b => {
      const s = simBet(V, me, b, p, base, K, oTier);
      return { b: b.slice(), total: sum(b), win: s.win / K, dchip: s.dchip / K, ev: 3 * (p[0] * b[0] + p[1] * b[1] + p[2] * b[2]) - sum(b) };
    });
  }
  function plan(V, me, tier, r) { return tier === "hard" ? planMC(V, me, r, 48) : planHeur(V, me, tier, r); }
  function ai(V, me, tier, r) {
    if (V.phase !== "first" && V.phase !== "second") return null;
    const pl = plan(V, me, tier, r);
    return { t: "bet", b: pl.b };
  }

  // ── AI 선생님 (내게 보이는 것만 읽음) ──────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const sg = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);                              // 정수 부호 (0 은 부호 없이)
  const sg1 = x => (x >= 0.05 ? "+" : x <= -0.05 ? "−" : "") + Math.abs(x).toFixed(1);        // 소수 한 자리 부호
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), ira = w => (hasFinal(w) ? "이라" : "라");
  const rg = (a, b) => (a === b ? `${a}칩` : `${a}~${b}칩`);   // 범위 글 (같으면 한 값)
  const bTxt = b => b ? MARKS.map((m, k) => b[k] ? `${EM[k]}${b[k]}` : "").filter(Boolean).join(" ") || "0칩" : "";
  // 상대가 지난 라운드들에서 어떻게 걸었는지 — 공개된 기록만
  function oppHabit(V, opp) {
    let n = 0, lump = 0, tot = 0, plus = 0, net = 0;
    for (const h of V.hist || []) { const b = h.bets && h.bets[opp]; if (!b) continue; const t = sum(b); n++; tot += t; net += h.gain[opp] - t; if (t > 0) { if (Math.max(...b) >= 0.9 * t) lump++; if (h.gain[opp] > t) plus++; } }
    return { n, lump, tot, plus, net };
  }
  const habitTxt = (H, who) => (H.n ? ` 지난 ${H.n}라운드 동안 ${who}${eun(who)} 평균 ${(H.tot / H.n).toFixed(1)}칩을 걸었고 한 칸 몰아 걸기 ${H.lump}번 · 플러스 라운드 ${H.plus}번 (칩 ${sg(H.net)}).` : " 첫 라운드라 상대의 습관을 볼 기록은 아직 없어요 (귀띔이 맞을 확률은 모두 50%).");
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`;
    const opp = 1 - me, hist = V.hist || [], last = hist[hist.length - 1], C = V.chips[me], O = V.chips[opp], who = nm(opp), H = oppHabit(V, opp);
    if (V.over) {
      let bigW = null, bigL = null;
      for (const h of hist) { const net = h.gain[me] - sum(h.bets[me]); if (!bigW || net > bigW.net) bigW = { r: h.r, net }; if (!bigL || net < bigL.net) bigL = { r: h.r, net }; }
      const d = C - O, res = d > 0 ? "내가 앞서요" : d < 0 ? "아쉽지만 뒤졌어요" : "비겼어요";
      const parts = [bigW && bigW.net > 0 ? `가장 크게 번 라운드는 ${bigW.r}라운드(${sg(bigW.net)}칩)` : "", bigL && bigL.net < 0 ? `가장 크게 잃은 라운드는 ${bigL.r}라운드(${sg(bigL.net)}칩)` : ""].filter(Boolean);
      const swing = parts.length ? parts.join(" · ") + "." : "내 칩이 늘거나 줄어든 라운드가 없었어요.";
      return { opp: `승부가 끝났어요. ${who}${eun(who)} ${hist.length}라운드 동안 칩 ${sg(H.net)}, 한 칸 몰아 걸기 ${H.lump}번이었어요.`, mine: `내 칩 ${C} · 상대 ${O} (차 ${sg(d)}) → ${res}`, rec: "한 판 더 해 봐요!", why: `${swing} 맞힌 칸은 3배라서 큰 베팅 한두 번이 판을 가르는 게임이에요.`.trim() };
    }
    // 👀 상대 흐름
    const first = V.first === me, limOpp = Math.min(O, Math.floor(C / 2));
    let o;
    if (V.phase === "second" && !first && V.bets[opp]) {
      const b = V.bets[opp], t = sum(b), before = O + t, top = [0, 1, 2].sort((x, y) => b[y] - b[x])[0], mk = MARKS[top];
      o = t === 0 ? `${who}(선)이 한 칩도 안 걸었어요 (한도 ${Math.min(before, Math.floor(C / 2))}칩 중 0) → 확실한 정보가 없거나 칩을 지키는 중.` :
        b.filter(x => x > 0).length === 1 ? `${who}(선)이 ${EM[top]}${mk}에만 ${t}칩 (가진 ${before}칩의 ${Math.round(t / before * 100)}%) → 귀띔이 ${mk}${ira(mk)} 믿는 듯해요. 귀띔이 맞을 확률은 50%라 상대 베팅만 보면 이 칸이 정답일 확률도 약 50%예요.` :
          `${who}(선)이 ${bTxt(b)}${ja(bTxt(b),"로")} 나눠 걸었어요 (모두 ${t}칩, 가진 ${before}칩의 ${Math.round(t / before * 100)}%) → 확신이 약해 보여요.`;
      o += habitTxt(H, who);
    } else if (V.phase === "first" && first) {
      o = (V.lim > 0 ? `${who}${eun(who)} 아직 안 걸었어요. 내가 선이라 0~${V.lim}칩(상대 칩 ${O}의 절반)을 걸 수 있고, 내가 ${V.lim}칩 걸면 상대는 최소 ${Math.min(2 * V.lim, O)}칩을 걸어야 해요.` : `${who}${eun(who)} 아직 안 걸었어요. 상대 칩이 ${O}개뿐이라 내가 걸 수 있는 칩은 0개예요.`) + habitTxt(H, who);
    } else if (V.phase === "first") {
      o = `${who}(선)이 거는 중이에요. 상대가 걸 수 있는 한도는 0~${limOpp}칩(내 칩 ${C}의 절반) — 많이 걸수록 정답을 확신한다는 신호예요.` + habitTxt(H, who);
    } else if (V.phase === "second" && first) {
      const mt = sum(V.bets[me] || [0, 0, 0]);
      o = `${who}(후)가 내 베팅(${bTxt(V.bets[me]) || "0칩"})을 보고 거는 중이에요. ${Math.min(2 * mt, O) === O ? `내 ${mt}칩의 2배 이상이라 가진 ${O}칩을 모두(올인) 걸어야 해요.` : `내 ${mt}칩의 2배 이상 — ${rg(Math.min(2 * mt, O), O)}을 걸 수 있어요.`}` + habitTxt(H, who);
    } else if (last && V.phase === "reveal") {
      const ob = last.bets[opp], t = sum(ob), net = last.gain[opp] - t;
      o = `이번 ${last.r}라운드 정답은 ${EM[last.mark]}${MARKS[last.mark]} — ${who}${eun(who)} ${bTxt(ob)} 걸어 ${sg(net)}칩 (지금 ${O}칩).` + habitTxt(H, who);
    } else o = `${who}의 칩은 ${O}개예요.` + habitTxt(H, who);
    // 📊 내 흐름
    const mp = posterior(V, me, "hard"), h0 = V.hint[me], d = C - O;
    let mine = `${V.round}/${V.R}라운드(남은 ${V.R - V.round}) · 칩 나 ${C} : 상대 ${O} (차 ${sg(d)})`;
    if (V.mark >= 0) mine += ` · 내 귀띔 ${h0 >= 0 ? EM[h0] + MARKS[h0] : "없음"} → ${h0 === V.mark ? "맞았어요" : "틀렸어요"} (귀띔은 50%만 맞아요)`;
    else mine += ` · 내 귀띔 ${h0 >= 0 ? EM[h0] + MARKS[h0] : "없음"} → 정답 확률 ☀️${pc(mp[0])} 🌙${pc(mp[1])} ⭐${pc(mp[2])}`;
    if (V.needs.includes(me)) { const lim = V.phase === "first" ? { min: 0, max: V.lim } : V.range; mine += ` · 걸 수 있는 칩 ${rg(lim.min, lim.max)}`; }
    // 💡 추천 + 👉
    const topK = [0, 1, 2].sort((x, y) => mp[y] - mp[x])[0], ev1 = 3 * mp[topK] - 1;   // 한 칸에 칩 1개를 걸 때의 기대 (정답 확률 × 3배 − 1)
    let rec, why;
    if (V.needs.includes(me)) {
      const pl = plan(V, me, "hard", () => 0.5);
      rec = pl.total === 0 ? "한 칩도 걸지 않기" : `${bTxt(pl.b)} (모두 ${pl.total}칩)`;
      const winTxt = pl.win !== undefined ? ` 이 베팅으로 끝까지 둬 보면(시뮬레이션) 이길 확률은 약 ${pc(pl.win)}예요.` : "";
      if (V.phase === "first") {
        why = pl.why === "lead" ? `칩이 2배 넘게 앞서요 (${C} : ${O}). 선일 때 0칩으로 지키면 후는 위험을 혼자 떠안아요 (상한은 상대 칩의 절반 = ${V.lim}칩).` + winTxt :
          `선은 ${V.lim}칩까지만 걸 수 있어요. 맞히면 3배! ${MARKS[topK]}에 칩 1개를 걸면 기대 ${sg1(ev1)}칩 (정답 확률 ${pc(mp[topK])} × 3배 − 1) — 단, 후가 내 베팅을 보고 따라 걸 수 있어요.` + winTxt;
      } else {
        why = `후는 최소 ${V.range.min}칩 (선의 2배). 선 베팅과 내 귀띔을 합치면 가장 높은 칸 ${MARKS[topK]}${iga(MARKS[topK])} ${pc(mp[topK])}예요 (칩 1개당 기대 ${sg1(ev1)}칩) — ${mp[topK] >= 0.62 ? "확신이 크니 올인으로 3배를 노려요." : "나눠 걸면 잃어도 덜 아파요."}` + winTxt;
      }
    } else if (V.phase === "reveal" && last) {
      const net = last.gain[me] - sum(last.bets[me]), nf = 1 - V.first === me;
      rec = `결과를 보고 다음 라운드를 준비해요 — 이번 라운드 나 ${sg(net)}칩 (칩 ${C} : ${O})`;
      why = `정답은 ${EM[last.mark]}${MARKS[last.mark]}${last.hint && last.hint[me] >= 0 ? `, 내 귀띔(${EM[last.hint[me]]})은 ${last.hint[me] === last.mark ? "맞았어요" : "틀렸어요"}` : ""}. ${V.round >= V.R ? "이번이 마지막 라운드였어요." : `남은 ${V.R - V.round}라운드 · `}${V.round >= V.R ? "" : nf ? `다음엔 내가 선이라 한도 ${Math.min(C, Math.floor(O / 2))}칩` : `다음엔 상대가 선이라 나는 후 (상대 한도 ${Math.min(O, Math.floor(C / 2))}칩 → 나는 최대 ${Math.min(2 * Math.min(O, Math.floor(C / 2)), C)}칩 맞춰야 할 수 있어요)`}.`;
    } else if (V.phase === "first") {   // 내가 후, 상대(선)가 아직 안 걸었어요
      rec = `상대가 먼저 걸어요 — 상대는 0~${limOpp}칩, 내가 걸어야 할 최소 칩은 0~${Math.min(2 * limOpp, C)}칩 (상대 베팅의 2배)`;
      why = `나는 후라 상대가 칸별로 건 칩을 보고 따라 걸 수 있어요. 지금 정답 확률은 내 귀띔만으로 가장 높은 칸 ${MARKS[topK]}${iga(MARKS[topK])} ${pc(mp[topK])} — 상대가 한 칸에 몰아 걸면 그 칸의 확률이 올라가요 (상대 귀띔이 맞을 확률 50%).`;
    } else {   // 내가 선, 상대(후)가 거는 중
      const mt = sum(V.bets[me] || [0, 0, 0]), evb = V.bets[me] ? 3 * (mp[0] * V.bets[me][0] + mp[1] * V.bets[me][1] + mp[2] * V.bets[me][2]) - mt : 0;
      rec = `상대(후)가 거는 중이에요 — 내가 건 ${mt}칩의 2배 이상이라 ${Math.min(2 * mt, O) === O ? `상대는 ${O}칩 올인` : rg(Math.min(2 * mt, O), O)}`;
      why = `내 베팅(${bTxt(V.bets[me]) || "0칩"})은 정답이 나오면 3배예요. 지금 확률로 이번 라운드 기대 ${sg1(evb)}칩 (맞는 칸 확률 × 3배 − 건 칩). 상대는 내 베팅 칸을 보고 따라 걸 수 있어요.`;
    }
    return { opp: o, mine, rec, why };
  }

  return { id: "gn-sunmoon", MARKS, EM, START, TRUTH, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, posterior, plan, compareBets, limitFirst, rangeSecond, sum };
});

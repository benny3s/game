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
  function plan(V, me, tier, r) {
    const C = V.chips[me], O = V.chips[1 - me], p = posterior(V, me, tier), mp = maxOf(p);
    const last = V.round >= V.R, gamma = tier === "hard" ? 2.4 : tier === "normal" ? 1.6 : 1;
    let total, why;
    if (V.phase === "first") {
      const lim = V.lim;
      const lead = C >= O * 2.2 && !last;
      if (lead && tier !== "easy") { total = 0; why = "lead"; }
      else {
        const frac = tier === "easy" ? 0.2 + 0.6 * r() : tier === "normal" ? (mp >= 0.5 ? 0.8 : 0.5) : (mp >= 0.5 ? 1 : 0.55);
        total = Math.min(lim, Math.round(lim * frac)); why = mp >= 0.5 ? "hint" : "weak";
      }
    } else {
      const g = V.range, behind = O > C * 1.8;
      const want = tier === "easy" ? C * (0.3 + 0.5 * r()) : (mp >= 0.62 || (behind && last)) ? C : mp >= 0.48 ? C * 0.75 : C * 0.4;
      total = Math.max(g.min, Math.min(g.max, Math.round(want))); why = mp >= 0.5 ? "hint" : "weak";
    }
    const b = split(total, p, gamma);
    return { b, total, p, mp, why };
  }
  function ai(V, me, tier, r) {
    if (V.phase !== "first" && V.phase !== "second") return null;
    const pl = plan(V, me, tier, r);
    return { t: "bet", b: pl.b };
  }

  // ── AI 선생님 (내게 보이는 것만 읽음) ──────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const bTxt = b => b ? MARKS.map((m, k) => b[k] ? `${EM[k]}${b[k]}` : "").filter(Boolean).join(" ") || "0칩" : "";
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    if (V.over) return { opp: "승부가 끝났어요.", mine: `내 칩 ${V.chips[me]} · 상대 ${V.chips[1 - me]} → ${V.ranks[me] === 0 ? "내가 앞서요" : "아쉽지만 뒤졌어요"}`, rec: "한 판 더 해 봐요!", why: "" };
    const opp = 1 - me, last = V.hist[V.hist.length - 1];
    // 👀 상대 흐름
    let o;
    if (V.phase === "second" && V.first === opp && V.bets[opp]) {
      const b = V.bets[opp], t = sum(b), top = [0, 1, 2].sort((x, y) => b[y] - b[x])[0];
      o = t === 0 ? `${nm(opp)}(선)이 한 칩도 안 걸었어요 → 확실한 정보가 없거나 칩을 지키는 중.` :
        b.filter(x => x > 0).length === 1 ? `${nm(opp)}(선)이 ${EM[top]}${MARKS[top]}에만 ${t}칩 → 귀띔이 ${MARKS[top]}이라 믿는 듯 (귀띔이 맞을 확률은 50%라 허세일 수도).` :
          `${nm(opp)}(선)이 ${bTxt(b)} 로 나눠 걸었어요 → 확신이 약해 보여요.`;
    } else if (last && last.r === V.round - 1 || last && V.phase === "end") {
      const ob = last.bets[opp];
      o = `지난 ${last.r}라운드 정답 ${EM[last.mark]}${MARKS[last.mark]} — ${nm(opp)}은 ${bTxt(ob)} 걸어 ${last.gain[opp] > sum(ob) ? "+" + (last.gain[opp] - sum(ob)) : "−" + (sum(ob) - last.gain[opp])}칩.`;
    } else o = "아직 상대 움직임이 없어요. 이번 라운드는 " + (V.first === me ? "내가 먼저 걸어요." : `${nm(opp)}이 먼저 걸어요.`);
    // 📊 내 흐름
    const mp = posterior(V, me, "hard");
    const mine = `${V.round}/${V.R}라운드 · 칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} · 내 귀띔 ${V.hint[me] >= 0 ? EM[V.hint[me]] + MARKS[V.hint[me]] : "없음"} → 정답 확률 ☀️${pc(mp[0])} 🌙${pc(mp[1])} ⭐${pc(mp[2])}`;
    // 💡 추천 + 👉
    let rec = "상대 차례를 기다려요", why = "";
    if (V.needs.includes(me)) {
      const pl = plan(V, me, "hard", () => 0.5);
      rec = pl.total === 0 ? "한 칩도 걸지 않기" : `${bTxt(pl.b)} (모두 ${pl.total}칩)`;
      if (V.phase === "first") {
        why = pl.why === "lead" ? `칩이 2배 넘게 앞서요. 선일 때 0칩으로 지키면 후는 위험을 혼자 떠안아요 (상한은 상대 칩의 절반 = ${V.lim}칩).` :
          `선은 ${V.lim}칩까지만 걸 수 있어요. 맞히면 3배! 귀띔이 맞을 확률이 50%라 기대값이 높은 ${MARKS[[0, 1, 2].sort((x, y) => mp[y] - mp[x])[0]]}에 몰아요 — 단, 후가 내 베팅을 보고 따라 걸 수 있어요.`;
      } else {
        why = `후는 최소 ${V.range.min}칩 (선의 2배). 선 베팅과 내 귀띔을 합치면 가장 높은 칸이 ${pc(maxOf(mp))}예요 — ${maxOf(mp) >= 0.62 ? "확신이 크니 올인으로 3배를 노려요." : "나눠 걸면 잃어도 덜 아파요."}`;
      }
    } else if (V.phase === "reveal") { rec = "결과를 보고 다음 라운드를 준비해요"; }
    return { opp: o, mine, rec, why };
  }

  return { id: "gn-sunmoon", MARKS, EM, START, TRUTH, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, posterior, plan, limitFirst, rangeSecond, sum };
});

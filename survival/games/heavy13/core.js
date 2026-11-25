/* 베니 서바이벌 · 무거운 13 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 1일차 감옥 매치 '무거운 13' (나무위키 '룰' 절 기준)
   · 사람마다 바위 카드 0~6 (7장) + 색 칩 빨강 · 초록 · 파랑 각 2개 + 무지개 칩 1개. 받침대는 빨강 · 초록 · 파랑 3개 (처음엔 비어 있음).
   · 라운드마다 모두가 동시에 비공개로 카드 1장 + 칩 1개를 냄 → 칩 먼저, 카드 나중에 공개. 칩 색 = 올릴 받침대 (무지개는 놓을 때 고름). 카드 숫자 = 바위 무게.
   · 놓는 순서: 무지개를 낸 사람 먼저 → 그다음 큰 숫자 먼저 → 같으면 선 표식에서 시계방향.
     자기 차례에 (라운드마다 한 번) 패스할 수 있음: 패스한 바위는 다른 사람이 다 놓은 뒤에 놓고, 패스한 사람이 여럿이면 패스한 순서의 역순.
   · 바위를 놓은 받침대의 합이 13 이상이 되면, 놓기 전에 받침대에 있던 바위를 모두 수거하고 그 사람이 수거한 개수만큼 벌점. 마지막으로 벌점을 받은 사람이 다음 선.
   · 7라운드가 지나면 같은 구성(카드 7장 · 칩 7개)을 다시 받고 받침대는 그대로 → 14라운드까지. 벌점이 많은 사람이 아래.
     벌점이 같으면 더 최근에 벌점을 받은 사람이 아래.
   확인 못 한 점(우리가 정함): ① 13 이상이 된 뒤 방금 놓은 바위는 비워진 받침대에 남음 (젝스님트처럼) ② 마지막 놓을 사람은 패스 의미가 없어 패스 불가
     ③ 첫 선은 무작위, 놓을 길이 하나뿐인 차례는 자동으로 놓음 ④ 인원 3~7 (방송은 7명) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).heavy13 = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 14, PER = 7, CAPW = 13;
  const SUM = a => a.reduce((x, y) => x + y, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed }) {
    n = Math.max(3, Math.min(7, n | 0 || 5));
    const st = { n, rs: (seed >>> 0) || 1, log: [], seq: 0, over: false, final: null, round: 0, phase: "choose" };
    st.lead = Math.floor(rnd(st) * n);
    st.ped = [[], [], []];
    st.pen = Array(n).fill(0); st.lastPen = Array(n).fill(-1); st.penSeq = 0; st.lastHit = -1;
    st.res = null;
    newSet(st); startRound(st);
    return st;
  }
  function newSet(st) {
    st.cards = Array.from({ length: st.n }, () => Array(PER).fill(true));     // 아직 안 쓴 카드
    st.chips = Array.from({ length: st.n }, () => [2, 2, 2, 1]);               // 빨 · 초 · 파 · 무지개 남은 수
  }
  function startRound(st) {
    st.round++;
    if (st.round === PER + 1) newSet(st);
    st.phase = "choose"; st.sel = Array(st.n).fill(null);
    st.order = []; st.q = []; st.passQ = []; st.passOrder = []; st.cur = -1; st.passed = Array(st.n).fill(false); st.placed = Array(st.n).fill(false);
    st.picks = null; st.res = null; st.puts = [];
    push(st, { k: "round", r: st.round, lead: st.lead });
  }

  const canPass = (st, s) => st.phase === "place" && st.cur === s && !st.passed[s] && st.q.length > 0;
  const forced = st => st.phase === "place" && st.cur >= 0 && st.picks[st.cur].chip !== 3 && !canPass(st, st.cur);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "choose") return [...Array(st.n).keys()].filter(s => !st.sel[s]);
    if (st.phase === "place") return forced(st) ? [] : [st.cur];
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "choose") {
      if (a.t !== "pick") return { ok: false, err: "카드와 칩을 골라요" };
      if (!Number.isInteger(a.card) || a.card < 0 || a.card >= PER || !st.cards[seat][a.card]) return { ok: false, err: "쓸 수 없는 카드예요" };
      if (!Number.isInteger(a.chip) || a.chip < 0 || a.chip > 3 || !st.chips[seat][a.chip]) return { ok: false, err: "쓸 수 없는 칩이에요" };
      st.sel[seat] = { card: a.card, chip: a.chip };
      push(st, { k: "picked", s: seat });
      if (st.sel.every(Boolean)) reveal(st);
      return { ok: true };
    }
    if (st.phase === "place") {
      if (a.t === "pass") {
        if (!canPass(st, seat)) return { ok: false, err: "지금은 패스할 수 없어요" };
        st.passed[seat] = true; st.passQ.push(seat); st.passOrder.push(seat);
        push(st, { k: "pass", s: seat });
        nextCur(st);
        return { ok: true };
      }
      if (a.t !== "put") return { ok: false, err: "놓거나 패스해요" };
      const chip = st.picks[seat].chip;
      let ped = chip;
      if (chip === 3) { if (!Number.isInteger(a.ped) || a.ped < 0 || a.ped > 2) return { ok: false, err: "무지개 칩은 받침대를 골라요" }; ped = a.ped; }
      doPut(st, seat, ped);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  function reveal(st) {
    st.picks = st.sel.map(x => ({ card: x.card, chip: x.chip }));
    const n = st.n;
    for (let s = 0; s < n; s++) { st.cards[s][st.picks[s].card] = false; st.chips[s][st.picks[s].chip]--; }
    const key = s => [st.picks[s].chip === 3 ? 0 : 1, -st.picks[s].card, (s - st.lead + n) % n];
    st.order = [...Array(n).keys()].sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    st.q = st.order.slice(); st.passQ = []; st.passOrder = []; st.passed = Array(n).fill(false); st.placed = Array(n).fill(false); st.puts = [];
    st.phase = "place";
    push(st, { k: "reveal", picks: st.picks.map((p, s) => ({ s, card: p.card, chip: p.chip })), order: st.order.slice() });
    nextCur(st);
  }
  function nextCur(st) {
    if (st.q.length) st.cur = st.q.shift();
    else if (st.passQ.length) st.cur = st.passQ.pop();
    else { st.cur = -1; endRound(st); }
  }
  function doPut(st, s, ped) {
    const w = st.picks[s].card, P = st.ped[ped], before = SUM(P), after = before + w;
    let got = 0;
    if (after >= CAPW) { got = P.length; st.ped[ped] = [w]; st.pen[s] += got; st.lastPen[s] = st.penSeq++; st.lastHit = s; }
    else P.push(w);
    st.placed[s] = true;
    const rec = { s, card: w, chip: st.picks[s].chip, ped, before, after, over: after >= CAPW, got, late: st.passed[s] };
    st.puts.push(rec);
    push(st, { k: "put", ...rec });
    nextCur(st);
  }
  function endRound(st) {
    const gain = Array(st.n).fill(0); for (const p of st.puts) gain[p.s] += p.got;
    let next = st.lead; for (const p of st.puts) if (p.got > 0) next = p.s;          // 이번 라운드 마지막 벌점자가 다음 선
    st.res = { r: st.round, puts: st.puts.map(p => ({ ...p })), gain, lead: st.lead, next };
    st.lead = next;
    st.phase = "show";
    push(st, { k: "end", r: st.round, gain: gain.slice(), next });
  }
  const auto = st => (st.over ? null : st.phase === "show" ? 3800 : forced(st) ? 1000 : null);
  function advance(st) {
    if (st.phase === "place" && forced(st)) { const s = st.cur; doPut(st, s, st.picks[s].chip); return; }
    if (st.phase === "show") {
      if (st.round >= ROUNDS) { finish(st); return; }
      startRound(st);
    }
  }
  function rankOf(st) {
    const idx = [...Array(st.n).keys()].sort((a, b) => st.pen[a] - st.pen[b] || st.lastPen[a] - st.lastPen[b]);
    const r = Array(st.n).fill(0);
    idx.forEach((s, k) => { r[s] = k > 0 && st.pen[s] === st.pen[idx[k - 1]] && st.lastPen[s] === st.lastPen[idx[k - 1]] ? r[idx[k - 1]] : k; });
    return r;
  }
  function finish(st) { st.final = { ranks: rankOf(st) }; st.over = true; st.phase = "end"; push(st, { k: "over" }); }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : Array(st.n).fill(0));
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const L = [];
    if (st.phase === "choose") {
      for (let c = 0; c < PER; c++) if (st.cards[seat][c]) for (let k = 0; k < 4; k++) if (st.chips[seat][k]) L.push({ t: "pick", card: c, chip: k });
      return L;
    }
    if (st.picks[seat].chip === 3) for (let p = 0; p < 3; p++) L.push({ t: "put", ped: p }); else L.push({ t: "put" });
    if (canPass(st, seat)) L.push({ t: "pass" });
    return L;
  }

  // ── 보이는 것 ───────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = all ? -1 : seat, n = st.n;
    const revealed = st.phase === "place" || st.phase === "show" || st.phase === "end";
    const pubObj = { ph: st.phase, r: st.round, p: st.ped, c: st.cards, h: st.chips, pen: st.pen, l: st.lead, cur: st.cur, o: st.order, pk: revealed ? st.picks : null, sd: st.sel.map(Boolean), ps: st.passed, po: st.passOrder, pl: st.placed, ov: st.over };
    return {
      n, phase: st.phase, round: st.round, rounds: ROUNDS, set: st.round <= PER ? 1 : 2, per: PER,
      ped: st.ped.map(p => p.slice()), pedSum: st.ped.map(SUM),
      cards: st.cards.map(c => c.slice()), chips: st.chips.map(c => c.slice()),
      picked: st.sel.map(Boolean), mine: me >= 0 && st.sel[me] ? { ...st.sel[me] } : null, sel: all ? st.sel.map(x => (x ? { ...x } : null)) : null,
      picks: revealed ? st.picks.map(p => ({ ...p })) : null, order: st.order.slice(), cur: st.cur, passed: st.passed.slice(), placed: st.placed.slice(), passOrder: st.passOrder.slice(),
      canPass: me >= 0 ? canPass(st, me) : false, forced: forced(st),
      pen: st.pen.slice(), lastPen: st.lastPen.slice(), lead: st.lead, res: st.res ? { ...st.res, puts: st.res.puts.map(p => ({ ...p })), gain: st.res.gain.slice() } : null, puts: st.puts.map(p => ({ ...p })),
      needs: needs(st), over: st.over, ranks: st.final ? st.final.ranks.slice() : null,
      score: st.pen.map(p => -p), log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI ──────────────────────────────────────────────────────
  // 받침대 · 순서 · 낸 것만으로 이번 라운드를 흉내 (남들은 욕심 부리지 않고 벌점이 적은 쪽으로)
  function orderOf(n, lead, picks) {
    const key = s => [picks[s].chip === 3 ? 0 : 1, -picks[s].card, (s - lead + n) % n];
    return [...Array(n).keys()].sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  }
  // sim: { n, ped, q, passQ, passed, picks, pen, cur } — 현재 차례(cur)부터 끝까지, forcedAct 가 있으면 cur 의 첫 행동으로 씀
  function simRest(sim, first) {
    let cur = sim.cur, pen = sim.pen.slice(), ped = sim.ped.map(p => p.slice()), q = sim.q.slice(), passQ = sim.passQ.slice(), passed = sim.passed.slice();
    let act = first, guard = 0;
    while (cur >= 0 && guard++ < 40) {
      const w = sim.picks[cur].card, chip = sim.picks[cur].chip, can = !passed[cur] && q.length > 0;
      let a = act; act = null;
      if (!a) a = greedyAct(ped, w, chip, can);
      if (a.t === "pass") { passed[cur] = true; passQ.push(cur); }
      else {
        const pi = chip === 3 ? a.ped : chip, P = ped[pi], after = SUM(P) + w;
        if (after >= CAPW) { pen[cur] += P.length; ped[pi] = [w]; } else P.push(w);
      }
      cur = q.length ? q.shift() : passQ.length ? passQ.pop() : -1;
    }
    return { pen, ped };
  }
  function greedyAct(ped, w, chip, can) {
    const cost = pi => { const P = ped[pi], after = SUM(P) + w; return after >= CAPW ? P.length : 0; };
    let best = null;
    const cand = chip === 3 ? [0, 1, 2] : [chip];
    for (const pi of cand) {
      const c = cost(pi), after = SUM(ped[pi]) + w;
      const sc = c * 10 + (c ? 0 : after * 0.05);
      if (!best || sc < best.sc) best = { sc, pi, c };
    }
    if (best.c >= 2 && can) return { t: "pass" };
    return { t: "put", ped: best.pi };
  }
  function sampleOpp(V, s, r) {
    const cs = []; for (let c = 0; c < V.per; c++) if (V.cards[s][c]) cs.push(c);
    const ks = []; for (let k = 0; k < 4; k++) for (let j = 0; j < V.chips[s][k]; j++) ks.push(k);
    return { card: cs[Math.floor(r() * cs.length)], chip: ks[Math.floor(r() * ks.length)] };
  }
  const holdCost = (V, me, o) => {
    const left = V.per - ((V.round - 1) % V.per);                       // 이 세트에 남은 라운드 수
    return (o.chip === 3 ? 0.22 * (left / V.per) : 0) + 0.015 * o.card;
  };
  // 낼 카드 · 칩 고르기: 남들이 남은 카드 · 칩에서 무작위로 낸다고 보고 기대 벌점이 가장 낮은 것
  function evalChoose(V, me, S, r) {
    const n = V.n, opts = [];
    for (let c = 0; c < V.per; c++) if (V.cards[me][c]) for (let k = 0; k < 4; k++) if (V.chips[me][k]) opts.push({ card: c, chip: k, e: 0 });
    for (let t = 0; t < S; t++) {
      const picks = []; for (let s = 0; s < n; s++) picks[s] = s === me ? null : sampleOpp(V, s, r);
      for (const o of opts) {
        picks[me] = { card: o.card, chip: o.chip };
        const order = orderOf(n, V.lead, picks), q = order.slice(), cur = q.shift();
        const res = simRest({ n, ped: V.ped, q, passQ: [], passed: Array(n).fill(false), picks, pen: Array(n).fill(0), cur }, null);
        o.e += res.pen[me];
      }
    }
    for (const o of opts) { o.e /= S; o.sc = o.e + holdCost(V, me, o) + r() * 0.01; }
    opts.sort((a, b) => a.sc - b.sc);
    return opts;
  }
  // 놓을 때: 놓기(받침대) · 패스를 끝까지 흉내 내서 내 벌점이 가장 적은 쪽
  function evalPlace(V, me) {
    const n = V.n, picks = V.picks, chip = picks[me].chip, w = picks[me].card;
    const mainLeft = V.order.filter(s => !V.placed[s] && !V.passed[s] && s !== me);          // 내 뒤에 아직 놓을 사람 (놓는 순서대로)
    const late = V.passOrder.filter(s => !V.placed[s] && s !== me);                          // 패스해서 나중에 놓을 사람 (패스한 순서)
    const inMain = !V.passed[me], opts = [];
    const base = { n, ped: V.ped, passed: V.passed.slice(), picks, pen: Array(n).fill(0), cur: me };
    for (const pi of (chip === 3 ? [0, 1, 2] : [chip])) {
      const after = SUM(V.ped[pi]) + w, now = after >= CAPW ? V.ped[pi].length : 0;
      const res = simRest({ ...base, q: inMain ? mainLeft.slice() : [], passQ: late.slice() }, { t: "put", ped: pi });
      opts.push({ a: chip === 3 ? { t: "put", ped: pi } : { t: "put" }, e: res.pen[me], now, after, pi, kind: "put" });
    }
    if (V.canPass) {
      const res = simRest({ ...base, q: mainLeft.slice(), passQ: late.slice() }, { t: "pass" });
      opts.push({ a: { t: "pass" }, e: res.pen[me] + 0.02, now: 0, after: 0, pi: -1, kind: "pass" });
    }
    for (const o of opts) o.sc = o.e + (o.kind === "put" && !o.now ? o.after * 0.004 : 0);
    opts.sort((x, y) => x.sc - y.sc);
    return opts;
  }
  function ai(V, me, tier, r) {
    if (V.phase === "choose") {
      if (tier === "easy") {
        const opts = []; for (let c = 0; c < V.per; c++) if (V.cards[me][c]) for (let k = 0; k < 4; k++) if (V.chips[me][k]) opts.push({ card: c, chip: k });
        // 병아리: 무지개는 아끼고 카드는 대충
        const nr = opts.filter(o => o.chip !== 3), pool = nr.length && r() < 0.85 ? nr : opts;
        const o = pool[Math.floor(r() * pool.length)];
        return { t: "pick", card: o.card, chip: o.chip };
      }
      const L = evalChoose(V, me, tier === "hard" ? 60 : 16, r);
      const o = tier === "normal" && L.length > 1 && r() < 0.3 ? L[1 + Math.floor(r() * Math.min(2, L.length - 1))] : L[0];     // 중급: 가끔 차선 · 3순위
      return { t: "pick", card: o.card, chip: o.chip };
    }
    if (V.phase !== "place") return null;
    const opts = evalPlace(V, me);
    if (tier === "easy" && r() < 0.4) { const o = opts[Math.floor(r() * opts.length)]; return o.a; }
    if (tier === "normal" && opts.length > 1 && r() < 0.12) return opts[1].a;
    return opts[0].a;
  }

  // ── AI 선생님 ───────────────────────────────────────────────
  const PN = ["빨강", "초록", "파랑"], CN = ["빨강", "초록", "파랑", "무지개"];
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) return { opp: "14라운드가 끝났어요.", mine: `내 벌점 ${V.pen[me]}점`, rec: V.ranks[me] === 0 ? "🏆 벌점이 가장 적어요!" : "다음 판엔 큰 바위 순서를 더 아껴 봐요", why: "" };
    const hot = V.pedSum.map((s, p) => `${PN[p]} 합 ${s}(${V.ped[p].length}개)`).join(" · ");
    const risk = V.pedSum.map((s, p) => (13 - s <= 3 ? `${PN[p]}(${13 - s} 남음)` : null)).filter(Boolean);
    const opp = `받침대: ${hot}${risk.length ? ` — 곧 넘칠 곳: ${risk.join(", ")}` : ""}. ${V.round}/${V.rounds}라운드, 선은 ${nm(V.lead)}.`;
    const mine = `내 벌점 ${V.pen[me]}점 · 남은 카드 ${V.cards[me].map((a, c) => (a ? c : null)).filter(x => x !== null).join(" ")} · 칩 빨${V.chips[me][0]} 초${V.chips[me][1]} 파${V.chips[me][2]} 무지개${V.chips[me][3]}`;
    const r = (() => { let a = 77 + V.round * 31 + me * 5; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    if (V.phase === "choose" && V.needs.includes(me)) {
      const o = evalChoose(V, me, 70, r), b = o[0], w = o[o.length - 1];
      return { opp, mine, rec: `카드 ${b.card} + ${CN[b.chip]} 칩`, why: `남들이 남은 카드 · 칩을 무작위로 낸다고 보면 이 조합의 예상 벌점은 약 ${b.e.toFixed(2)}점이에요 (가장 나쁜 조합은 ${w.e.toFixed(2)}점). 합이 13 이상이면 그 받침대 바위를 전부 떠안으니, 큰 바위는 받침대가 비었을 때 올리고 ${b.chip === 3 ? "무지개는 급할 때를 위해 아끼는 게 좋아요" : "무지개 칩은 꼭 필요할 때만 써요"}.` };
    }
    if (V.phase === "place" && V.needs.includes(me)) {
      const o = evalPlace(V, me), b = o[0];
      const txt = b.kind === "pass" ? "패스" : V.picks[me].chip === 3 ? `${PN[b.pi]} 받침대에 놓기` : "놓기";
      return { opp, mine, rec: txt, why: b.kind === "pass" ? "지금 놓으면 벌점이 크고, 뒤에 놓는 사람들이 받침대를 먼저 넘치게 할 수 있어요 — 패스하면 가장 나중에 놓아요." : `이 선택이면 이번 라운드 예상 벌점은 약 ${b.e.toFixed(1)}점이에요${b.now ? ` (놓자마자 넘쳐서 ${b.now}개를 받아요)` : ""}.` };
    }
    return { opp, mine, rec: "다른 사람을 기다려요", why: "" };
  }

  return { id: "heavy13", ROUNDS, PER, CAPW, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, evalChoose, evalPlace, orderOf, rankOf };
});

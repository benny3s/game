/* 베니 서바이벌 · 베팅 가위바위보 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 (블랙가넷) 2 · 6화 데스매치 · 시즌 4 (그랜드 파이널) 3화 (나무위키 회차 문서 기준)
   · 두 사람, 시작 칩 1개씩. 판마다 '증인'의 숨은 표식(가위·바위·보)이 있고, 한 사람은 그 표식과 가위바위보(승부), 다른 사람은 그 결과에 베팅
   · 선이 '승부'와 '베팅' 중 하나를 고르면 상대는 남은 쪽. 승부하는 사람은 손을 비밀로 정하고, 베팅하는 사람은 '이긴다 / 진다'에 칩을 1개 이상 걸음 (칩이 없으면 못 걸고 지나감)
   · 승부에서 이기면 그 판 보상 칩(후반일수록 큼) · 베팅은 맞히면 건 칩만큼 더 받고(2배 환급), 틀리면 건 칩을 잃고, 무승부면 돌려받음
   · 그랜드 파이널 판은 '무승부' 베팅도 가능 (맞히면 3배 환급, 틀리면 잃음)
   · 모든 판이 끝났을 때 칩이 많은 쪽 승리
   · 판마다 증인의 표식은 두 사람에게 '귀띔'으로 전해짐 (우리 판: 각자 따로, 맞을 확률 50%) · 가상 플레이어 판은 표식이 처음부터 공개
   우리 판 다듬기(방송 문서에 없음): 증인은 AI · 귀띔은 각자 독립 · 동점이면 표식을 공개한 연장 2판(보상 1칩) 뒤에도 같으면 무승부 · 선은 첫 판 동전, 이후 번갈아 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-betrps"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const HAND = ["가위", "바위", "보"], EM = ["✌️", "✊", "✋"];
  // 판 표: a = 블랙가넷 2화(10판) · b = 블랙가넷 6화(12판, 가상 플레이어 6판) · d = 그랜드 파이널 3화(11판, 무승부 베팅)
  const VERS = {
    a: { R: 10, rewards: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3], virt: {}, drawBet: false },
    b: { R: 12, rewards: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4], virt: { 2: -1, 3: -1, 6: -1, 7: -1, 10: -1, 11: -1 }, drawBet: false },
    d: { R: 11, rewards: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4], virt: { 4: 0, 8: 1 }, drawBet: true },   // R4 가위 · R8 바위 (공개)
  };
  const OT_MAX = 2;
  const res3 = (a, m) => (a === m ? 0 : (a - m + 3) % 3 === 1 ? 1 : -1);   // 손 a 가 표식 m 에 이기면 1 / 비기면 0 / 지면 -1 (0 가위 · 1 바위 · 2 보)
  const beatH = m => (m + 1) % 3, loseH = m => (m + 2) % 3;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  function init({ n, seed, cfg }) {
    const ver = cfg && VERS[cfg.ver] ? cfg.ver : "a", T = VERS[ver];
    const st = { n: 2, rs: (seed >>> 0) || 1, ver, R: T.R, rewards: T.rewards.slice(), drawBet: T.drawBet, virt: {}, chips: [1, 1], round: 0, ot: 0, phase: "", duel: -1, mark: 0, hints: [-1, -1], virtual: false, act: [null, null], res: null, hist: [], log: [], seq: 0, over: false, cfg: cfg || {} };
    st.first0 = cfg && (cfg.first === 0 || cfg.first === 1) ? cfg.first : (rnd(st) < 0.5 ? 0 : 1);
    for (const r of Object.keys(T.virt)) st.virt[r] = T.virt[r] >= 0 ? T.virt[r] : Math.floor(rnd(st) * 3);
    startRound(st);
    return st;
  }
  const rewardOf = (st, r) => (r > st.R ? 1 : st.rewards[r - 1]);
  function startRound(st) {
    st.round++;
    const c = st.cfg || {};
    st.first = (st.first0 + st.round - 1) % 2;
    st.virtual = st.round > st.R || st.virt[st.round] !== undefined;
    if (c.marks && c.marks[st.round - 1] !== undefined) st.mark = c.marks[st.round - 1];
    else st.mark = st.round <= st.R && st.virt[st.round] !== undefined ? st.virt[st.round] : Math.floor(rnd(st) * 3);
    // 귀띔: 각자 독립, 맞을 확률 1/2 (틀리면 나머지 둘 중 하나)
    if (st.virtual) st.hints = [st.mark, st.mark];
    else if (c.hints && c.hints[st.round - 1]) st.hints = c.hints[st.round - 1].slice();
    else st.hints = [0, 1].map(() => (rnd(st) < 0.5 ? st.mark : (st.mark + 1 + Math.floor(rnd(st) * 2)) % 3));
    st.duel = -1; st.act = [null, null]; st.res = null; st.phase = "role";
    push(st, { k: "round", r: st.round, f: st.first, v: st.virtual ? 1 : 0 });
  }
  const betterOf = st => (st.duel < 0 ? -1 : 1 - st.duel);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "role") return [st.first];
    if (st.phase === "play") return [0, 1].filter(i => st.act[i] === null);
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "role") {
      if (a.t !== "role" || (a.role !== "duel" && a.role !== "bet")) return { ok: false, err: "승부 · 베팅 중에서 골라요" };
      st.duel = a.role === "duel" ? seat : 1 - seat;
      push(st, { k: "role", s: seat, role: a.role });
      st.phase = "play";
      const b = betterOf(st);
      if (st.chips[b] <= 0) st.act[b] = { t: "pass" };   // 칩이 없는 베팅 역할은 지나감
      if (needs(st).length === 0) resolve(st);
      return { ok: true };
    }
    if (st.phase === "play") {
      if (seat === st.duel) {
        if (a.t !== "hand" || ![0, 1, 2].includes(a.h)) return { ok: false, err: "가위 · 바위 · 보 중에서 골라요" };
        st.act[seat] = { t: "hand", h: a.h };
      } else {
        const kinds = st.drawBet ? ["win", "lose", "draw"] : ["win", "lose"];
        const nn = a.n | 0;
        if (a.t !== "bet" || !kinds.includes(a.kind)) return { ok: false, err: st.drawBet ? "이긴다 · 진다 · 비긴다 중에서 골라요" : "이긴다 · 진다 중에서 골라요" };
        if (nn < 1 || nn > st.chips[seat]) return { ok: false, err: `칩 1 ~ ${st.chips[seat]}개를 걸어요` };
        st.act[seat] = { t: "bet", kind: a.kind, n: nn };
      }
      push(st, { k: "done", s: seat });
      if (needs(st).length === 0) resolve(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  function resolve(st) {
    const D = st.duel, B = 1 - D, h = st.act[D].h, bet = st.act[B] && st.act[B].t === "bet" ? st.act[B] : null;
    const r = res3(h, st.mark), reward = rewardOf(st, st.round);
    const before = st.chips.slice();
    if (r === 1) st.chips[D] += reward;
    let bd = 0;
    if (bet) {
      if (bet.kind === "draw") bd = r === 0 ? 2 * bet.n : -bet.n;
      else if (r === 0) bd = 0;
      else bd = (bet.kind === "win") === (r === 1) ? bet.n : -bet.n;
      st.chips[B] += bd;
    }
    const R = { r: st.round, duel: D, better: B, mark: st.mark, hand: h, result: r, reward: r === 1 ? reward : 0, rewardMax: reward, bet: bet ? { kind: bet.kind, n: bet.n, d: bd } : null, virtual: st.virtual, hints: st.hints.slice(), before, after: st.chips.slice(), first: st.first };
    st.res = R;
    st.hist.push({ r: R.r, duel: D, mark: R.mark, hand: h, result: r, reward: R.reward, bet: R.bet, virtual: st.virtual, after: R.after });
    push(st, { k: "res", r: st.round, d: D, res: r });
    st.phase = "reveal";
  }
  const auto = st => (st.phase === "reveal" ? 4200 : null);
  function advance(st) {
    if (st.phase !== "reveal") return;
    if (st.round >= st.R) {
      if (st.chips[0] !== st.chips[1] || st.ot >= OT_MAX) { st.over = true; st.phase = "end"; return; }
      st.ot++;
    }
    startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "role") return [{ t: "role", role: "duel" }, { t: "role", role: "bet" }];
    if (seat === st.duel) return [0, 1, 2].map(h => ({ t: "hand", h }));
    const L = [{ t: "bet", kind: "win", n: 1 }, { t: "bet", kind: "lose", n: 1 }];
    if (st.drawBet) L.push({ t: "bet", kind: "draw", n: 1 });
    return L;
  }

  // ── 보이는 것: 증인의 표식은 가상 판만 공개 · 귀띔은 내 것만 · 상대의 선택은 공개 뒤에 ──────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), rev = st.phase === "reveal" || st.phase === "end";
    const pubObj = { r: st.round, p: st.phase, c: st.chips, du: st.duel, v: st.virtual ? st.mark : -1, d: st.act.map(a => (a ? 1 : 0)), res: rev && st.res ? [st.res.result, st.res.mark, st.res.hand, st.res.bet ? [st.res.bet.kind, st.res.bet.n] : 0] : 0, ov: st.over };
    const T = VERS[st.ver];
    return {
      n: 2, ver: st.ver, round: st.round, R: st.R, ot: st.ot, total: st.R + st.ot, phase: st.phase, chips: st.chips.slice(), first: st.first, duel: st.duel, better: betterOf(st),
      virtual: st.virtual, mark: st.virtual || rev || all ? st.mark : -1, hint: all ? st.hints.slice() : seat >= 0 && !st.virtual ? st.hints[seat] : -1,
      reward: rewardOf(st, st.round), rewards: st.rewards.slice(), virt: Object.fromEntries(Object.keys(st.virt).map(r => [r, all || st.ver === "d" || +r <= st.round ? st.virt[r] : -1])), drawBet: st.drawBet, kinds: T.drawBet ? 3 : 2,
      done: st.act.map(a => !!a), mine: all ? null : seat >= 0 && st.act[seat] ? Object.assign({}, st.act[seat]) : null, acts: all ? st.act.map(a => (a ? Object.assign({}, a) : null)) : null,
      res: rev ? st.res : null, hist: st.hist.slice(-12), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.chips.slice(), log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · AI (내 귀띔만 안다) ─────────────────────────────
  // 내 귀띔 h → 표식 분포: 맞을 확률 1/2, 나머지 둘 각 1/4 (가상 판은 확정)
  function markPost(V) {
    if (V.virtual) { const p = [0, 0, 0]; p[V.mark] = 1; return p; }
    const p = [0.25, 0.25, 0.25]; p[V.hint] = 0.5; return p;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // 상대가 승부 역할일 때 그 손이 (이김 · 비김 · 짐) 일 확률 — 상대 모델: 귀띔을 이기는 손(1 − d − t) · 일부러 지기(d) · 같은 손으로 비기기(t)
  function duelOutcome(V, me, model) {
    const post = markPost(V), P = { win: 0, draw: 0, lose: 0 }, add = (r, w) => { if (r === 1) P.win += w; else if (r === 0) P.draw += w; else P.lose += w; };
    for (let m = 0; m < 3; m++) {
      if (!post[m]) continue;
      for (let ho = 0; ho < 3; ho++) {
        const ph = V.virtual ? (ho === m ? 1 : 0) : (ho === m ? 0.5 : 0.25);
        if (!ph) continue;
        const w = post[m] * ph;
        add(res3(beatH(ho), m), w * (1 - model.d - model.t)); add(res3(loseH(ho), m), w * model.d); add(res3(ho, m), w * model.t);
      }
    }
    return P;
  }
  // 내가 손 a 를 낼 때 (이김 · 비김 · 짐)
  function myOutcome(V, a) {
    const post = markPost(V), P = { win: 0, draw: 0, lose: 0 };
    for (let m = 0; m < 3; m++) { const r = res3(a, m); if (r === 1) P.win += post[m]; else if (r === 0) P.draw += post[m]; else P.lose += post[m]; }
    return P;
  }
  const lead = (V, me) => V.chips[me] - V.chips[1 - me];
  const rem = V => Math.max(0, V.R - V.round + 1);
  const TIER = { easy: { d: 0, t: 0, kf: 1, tau: 3 }, normal: { d: 0.1, t: 0.1, kf: 1.6, tau: 0.8 }, hard: { d: 0.18, t: 0.15, kf: 2.2, tau: 0.45 } };
  function betPlan(V, me, tier) {
    const T = TIER[tier], oppLead = -lead(V, me);
    const model = { d: T.d, t: lead(V, 1 - me) > 2 ? Math.min(0.6, T.t * 3 + 0.1) : T.t };
    const P = duelOutcome(V, me, model);
    const e = { win: P.win - P.lose, lose: P.lose - P.win };
    if (V.drawBet) e.draw = 3 * P.draw - 1;
    let kind = "win", best = -9;
    for (const k of Object.keys(e)) if (e[k] > best) { best = e[k]; kind = k; }
    const chips = V.chips[me];
    let n = best <= 0.02 ? 1 : clamp(Math.round(chips * best * T.kf), 1, chips);
    if (lead(V, me) > 3 && rem(V) <= 3) n = Math.min(n, Math.max(1, Math.floor(chips / 4)));   // 앞서 있으면 소액
    if (oppLead > 2 && rem(V) <= 2 && best > 0.1) n = chips;   // 뒤지고 막판이면 승부수
    return { kind, n, edge: best, P, e };
  }
  function handPlan(V, me, tier, r) {
    const T = TIER[tier], chipsB = V.chips[1 - me], cbar = chipsB > 0 ? Math.min(chipsB, Math.max(1, Math.round(chipsB * 0.4))) : 0;
    const qw = V.drawBet ? 0.55 : 0.65, ql = V.drawBet ? 0.35 : 0.35, qd = V.drawBet ? 0.1 : 0;
    const L = lead(V, me), prog = V.round / Math.max(1, V.R), lam = L > 0 ? L * prog * 0.6 : 0;
    const U = [0, 1, 2].map(a => {
      const P = myOutcome(V, a);
      return V.reward * P.win + cbar * (qw * (P.lose - P.win) + ql * (P.win - P.lose) + qd * (1 - 3 * P.draw)) + lam * P.draw;
    });
    const mx = Math.max(...U), w = U.map(u => Math.exp((u - mx) / T.tau)), s = w.reduce((a, b) => a + b, 0);
    let x = r() * s, a = 0; for (; a < 2; a++) { x -= w[a]; if (x <= 0) break; }
    return { h: a, U, w: w.map(z => z / s) };
  }
  function rolePlan(V, me, tier, r) {
    const T = TIER[tier];
    if (V.chips[me] <= 0) return { role: "duel", why: "noChips" };
    if (V.chips[1 - me] <= 0) return { role: "duel", why: "oppNoChips" };
    const hp = handPlan(V, me, "hard", () => 0.5), Uduel = Math.max(...hp.U);
    const bp = betPlan(V, me, tier), P = bp.P;
    const cbar = Math.min(V.chips[me], Math.max(1, Math.round(V.chips[me] * 0.4)));
    const Vbet = bp.edge * cbar - V.reward * P.win;
    const pDuel = 1 / (1 + Math.exp(-(Uduel - Vbet) / (T.tau + 0.5)));
    return { role: r() < pDuel ? "duel" : "bet", pDuel, Uduel, Vbet, why: "score" };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "role") return { t: "role", role: rolePlan(V, me, tier, r).role };
    if (V.phase !== "play") return null;
    if (V.duel === me) return { t: "hand", h: handPlan(V, me, tier, r).h };
    const bp = betPlan(V, me, tier);
    return { t: "bet", kind: bp.kind, n: bp.n };
  }

  // ── 복기 · 선생님용 평가 (ai 와 같은 handPlan · betPlan · rolePlan 식을 그대로 재사용 · 내 귀띔만 씀 · view 를 안 바꿈 · 난수 없음) ──
  // 한 수의 '상대와의 칩 차이 기대 변화' (ev) + p(이길 · 맞힐 확률). 역할 고르기 = 승부(가장 좋은 손의 값) 대 베팅(기대 이득 − 상대가 받을 보상)
  function evalAct(V, me, a) {
    if (!V || !a || typeof a !== "object" || !V.needs || !V.needs.includes(me)) return null;
    if (V.phase === "role" && a.t === "role") {
      const hp = handPlan(V, me, "hard", () => 0.5), bp = betPlan(V, me, "hard"), P = bp.P;
      const best = hp.U.indexOf(Math.max(...hp.U)), cbar = Math.min(V.chips[me], Math.max(1, Math.round(V.chips[me] * 0.4)));
      if (a.role === "duel") return { kind: "duel", ev: Math.max(...hp.U), p: myOutcome(V, best).win, hand: best };
      if (a.role === "bet") return { kind: "bet", ev: bp.edge * cbar - V.reward * P.win, p: P.win, pb: bp.kind, noChips: V.chips[me] <= 0 };
      return null;
    }
    if (V.phase !== "play") return null;
    if (a.t === "hand" && V.duel === me && [0, 1, 2].includes(a.h)) {
      const hp = handPlan(V, me, "hard", () => 0.5), o = myOutcome(V, a.h);
      return { kind: "hand", ev: hp.U[a.h], p: o.win, pd: o.draw, h: a.h };
    }
    if (a.t === "bet" && V.duel !== me && V.duel >= 0 && (a.kind === "win" || a.kind === "lose" || (a.kind === "draw" && V.drawBet))) {
      const n = Math.max(1, a.n | 0), bp = betPlan(V, me, "hard"), P = bp.P;
      return { kind: "betk", ev: bp.e[a.kind] * n, p: a.kind === "win" ? P.win : a.kind === "lose" ? P.lose : P.draw, k: a.kind, n };
    }
    return null;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const sgn = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
  const KIND = { win: "이긴다", lose: "진다", draw: "비긴다" };
  function coach(V, me, since, names) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    if (me !== 0 && me !== 1) me = 0;
    const opp = 1 - me;
    if (V.over) {
      const h = V.hist || [], duelN = h.filter(x => x.duel === me).length, duelW = h.filter(x => x.duel === me && x.result === 1).length;
      const bets = h.filter(x => x.duel !== me && x.bet), betW = bets.filter(x => x.bet.d > 0).length, gain = bets.reduce((s, x) => s + x.bet.d, 0), df = V.chips[me] - V.chips[opp];
      return {
        opp: `승부가 끝났어요. 총 ${V.total}판${V.ot ? ` (연장 ${V.ot}판 포함)` : ""} · 상대 칩 ${V.chips[opp]}개.`,
        mine: `내 칩 ${V.chips[me]} : 상대 ${V.chips[opp]} (${df > 0 ? `${df}칩 앞섬` : df < 0 ? `${-df}칩 뒤짐` : "같음"})`,
        rec: V.ranks[me] === 0 && V.ranks[opp] === 0 ? "무승부예요" : V.ranks[me] === 0 ? "이겼어요! 한 판 더?" : "아쉬워요 — 뒤쪽 큰 보상 판이 승부처예요",
        why: `마지막 ${h.length}판 기록: 내가 승부한 ${duelN}판 중 ${duelW}판 이겼고, 베팅한 ${bets.length}판 중 ${betW}판 맞혀 ${gain >= 0 ? "+" : "−"}${Math.abs(gain)}칩이었어요.`,
      };
    }
    if (V.phase === "reveal") {
      const r = V.res, d = i => (r.after[i] - r.before[i]);
      return {
        opp: r ? `${nm(r.duel)}의 손 ${EM[r.hand]}${HAND[r.hand]} vs 표식 ${EM[r.mark]}${HAND[r.mark]} → ${r.result === 1 ? "승" : r.result === 0 ? "무" : "패"}${r.bet ? ` · 베팅 ${KIND[r.bet.kind]} ${r.bet.n}칩 (${r.bet.d >= 0 ? "+" : ""}${r.bet.d})` : ""}` : "",
        mine: `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]}`, rec: "결과를 보고 다음 판을 준비해요",
        why: r ? `이번 판 칩 변화: 나 ${r.before[me]}→${r.after[me]} (${d(me) >= 0 ? "+" : "−"}${Math.abs(d(me))}) · 상대 ${r.before[opp]}→${r.after[opp]} (${d(opp) >= 0 ? "+" : "−"}${Math.abs(d(opp))}). 승부 보상 ${r.reward}칩${r.bet ? ` · 베팅 정산 ${r.bet.d >= 0 ? "+" : "−"}${Math.abs(r.bet.d)}칩` : ""}.` : `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]}.`,
      };
    }
    const hintTxt = V.virtual ? `이번 판은 가상 플레이어 — 표식이 ${EM[V.mark]}${HAND[V.mark]}로 공개돼 있어요` : `증인이 나에게 ${EM[V.hint]}${HAND[V.hint]}라고 귀띔했어요 (맞을 확률 50%, 아니면 나머지 둘 중 하나)`;
    const L = lead(V, me), stage = rem(V) <= 3 ? "막판" : V.round <= 3 ? "초반" : "중반";
    const oppTxt = `${hintTxt}. 상대도 자기만의 귀띔을 받았고, 서로 상대의 귀띔은 몰라요. 보상은 이번 판 ${V.reward}칩 (${stage}).`;
    const mineTxt = `칩 나 ${V.chips[me]} : 상대 ${V.chips[opp]} (${L > 0 ? `${L}칩 앞서요` : L < 0 ? `${-L}칩 뒤져요` : "같아요"}) · ${V.round}/${V.R}판${V.ot ? ` (연장 ${V.ot})` : ""}`;
    const mp = markPost(V), mpTxt = `표식 추정 — ${[0, 1, 2].map(h => `${HAND[h]} ${pc(mp[h])}`).join(" · ")}`;
    let rec = "상대 선택을 기다려요", why = `${V.phase === "role" ? "상대가 승부 · 베팅 중 하나를 고르는 중이에요" : "상대가 고르는 중이에요"}. ${mpTxt}. 상대가 고르면 이 추정으로 손이나 베팅을 정해요.`;
    if (V.needs.includes(me)) {
      if (V.phase === "role") {
        const p = rolePlan(V, me, "hard", () => 0.5);
        rec = p.role === "duel" ? "승부 (내가 가위바위보)" : "베팅 (상대 승부에 걸기)";
        why = p.why === "noChips" ? "칩이 없으면 베팅은 못 해요 — 승부로 보상을 노려요." : p.why === "oppNoChips" ? "상대 칩이 없어 내가 승부하면 베팅 손해 없이 보상만 받아요." : `승부는 보상 ${V.reward}칩이 걸려 있지만 상대가 내 손을 읽고 베팅할 수 있어요. 베팅은 귀띔 하나로 상대 손을 짐작해야 해요. (기대 칩 차이: 승부 ${sgn(p.Uduel)} · 베팅 ${sgn(p.Vbet)})`;
      } else if (V.duel === me) {
        const hp = handPlan(V, me, "hard", () => 0.5), best = hp.U.indexOf(Math.max(...hp.U)), P = myOutcome(V, best);
        rec = `${EM[best]} ${HAND[best]}`;
        why = `표식 추정으로 이길 확률 ${pc(P.win)} · 비길 확률 ${pc(P.draw)} (기대 칩 차이 ${sgn(hp.U[best])}). ${V.chips[opp] > 0 ? "상대가 '이긴다'에 걸 거라 예상되면 일부러 져서 칩을 태우는 수도 있어요." : "상대 칩이 없어 걱정 없이 이기러 가요."}${L > 2 ? " 앞서 있으면 표식과 같은 손(비김)으로 굳히는 방법도!" : ""}`;
      } else {
        const bp = betPlan(V, me, "hard");
        rec = `${KIND[bp.kind]}에 ${bp.n}칩`;
        why = `상대는 자기 귀띔을 이기는 손을 낼 가능성이 높아요. 내 귀띔으로 보면 '${KIND[bp.kind]}' 쪽이 유리해요 (맞힐 확률 ${pc(bp.kind === "win" ? bp.P.win : bp.kind === "lose" ? bp.P.lose : bp.P.draw)} · 이득 ${bp.edge >= 0 ? "+" : ""}${bp.edge.toFixed(2)}칩/1칩 → 기대 ${sgn(bp.edge * bp.n)}칩). 일부러 지는 수에 당하지 않게 앞서 있으면 소액으로!`;
      }
    }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-betrps", VERS, HAND, EM, OT_MAX, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, evalAct, res3, beatH, loseH, markPost, duelOutcome, myOutcome, betPlan, handPlan, rolePlan, rewardOf };
});

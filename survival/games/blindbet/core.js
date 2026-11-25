/* 베니 서바이벌 · 블라인드 베팅 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌3 · 블라인드 베팅 (5~6일차 데스매치 1:1)
   · 준비물: 오픈 카드 1~10 (사람마다 한 세트) · 블라인드 카드 1~12 두 세트(24장) · 칩 30개씩
   · 한 턴: 딜러가 둘에게 블라인드 카드를 한 장씩 — 내 것은 못 보고 상대 것만 보임. 지난 턴 승자가 먼저 베팅 (첫 턴은 무작위).
     기본 베팅 1칩씩 낸 뒤 레이즈 / 콜 / 폴드 (체크는 콜). 상대 남은 칩보다 많이는 레이즈 못 함.
     베팅이 맞으면 각자 남은 오픈 카드 1장을 동시에 숨겨 냄 → 블라인드 + 오픈 합이 큰 쪽이 그 턴 칩을 가져감
   · 폴드하면 상대가 칩을 가져감. 폴드한 사람의 블라인드가 11 또는 12면 칩 10개를 더 내야 함.
     오픈 카드 1 또는 2 로 이기면 상대에게서 칩 10개를 더 가져감 (칩이 모자라면 있는 만큼)
   · 오픈 카드 10장을 다 쓰면 라운드 끝 (폴드한 턴은 오픈 카드를 안 씀). 2라운드 뒤 칩이 많은 쪽 승. 상대 칩이 다 없어지면 바로 승
   방송과 다른 점 (우리가 정함): ① 합이 같으면 오픈 카드가 큰 쪽 승 (원문 각주 추정), 오픈도 같으면 판돈을 다음 턴으로 이월
     ② 칩은 두 라운드에 걸쳐 이어짐 · 라운드마다 오픈 카드 1~10 을 새로 받고 블라인드 24장을 새로 섞음 (한 턴에 2장씩, 모자라면 라운드 끝)
     ③ 한 턴 레이즈는 4번까지 · 걸린 칩이 없을 땐 폴드 못 하고 체크 ④ 구경꾼은 두 블라인드를 다 봄 (둘 다 모르는 건 방송 시청자와 같음)
     ⑤ 필기 없음 (써 둘 수 없으니 쓴 블라인드 · 오픈 카드는 화면에 기록으로 보여 줌) ⑥ 한 기기로는 못 함, 2명 고정 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).blindbet = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const START = 30, ROUNDS = 2, OPENN = 10, BMAX = 12, MAXRAISE = 4, EXTRA = 10, BIGB = 11, LOWOPEN = 2;
  const range = n => Array.from({ length: n }, (_, k) => k + 1);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    const st = { n: 2, rs: (seed >>> 0) || 1, R: ROUNDS, chips: [START, START], round: 0, turn: 0, left: [[], []], deck: [], seen: [], blind: [0, 0], bet: [0, 0], pot: 0, carry: 0, cur: 0, cap: 0, raises: 0, acted: [false, false], bt: -1, first: 0, pick: [null, null], phase: "", over: false, res: null, acts: [], hist: [], log: [], seq: 0 };
    st.first = rnd(st) < 0.5 ? 0 : 1;
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.deck = shuffle(() => rnd(st), range(BMAX).concat(range(BMAX)));
    st.left = [range(OPENN), range(OPENN)]; st.seen = [];
    push(st, { k: "round", r: st.round });
    startTurn(st);
  }
  function finish(st) {
    if (st.pot > 0) { const h = Math.floor(st.pot / 2); st.chips[0] += h; st.chips[1] += st.pot - h; st.pot = 0; }   // 이월된 판돈은 반씩 돌려줌
    st.over = true; st.phase = "end"; st.bt = -1; st.blind = [0, 0]; st.pick = [null, null];
    push(st, { k: "end", chips: st.chips.slice() });
  }
  function startTurn(st) {
    if (st.pot === 0 && st.chips.some(c => c <= 0)) return finish(st);                  // 칩이 다 없어지면 바로 끝
    if (!st.left[0].length || st.deck.length < 2) return st.round >= ROUNDS ? finish(st) : startRound(st);
    st.turn++;
    st.blind = [st.deck.pop(), st.deck.pop()];
    const ante = Math.min(1, st.chips[0], st.chips[1]);
    st.carry = st.pot;
    for (let s = 0; s < 2; s++) st.chips[s] -= ante;
    st.pot += 2 * ante; st.bet = [ante, ante]; st.pick = [null, null]; st.res = null; st.acts = [];
    push(st, { k: "turn", t: st.turn, r: st.round, first: st.first, carry: st.carry });
    startBet(st);
  }
  function startBet(st) {
    st.phase = "bet"; st.cur = st.bet[0]; st.raises = 0; st.acted = [false, false];
    st.cap = Math.min(st.chips[0] + st.bet[0], st.chips[1] + st.bet[1]);     // 한 사람이 이 턴에 걸 수 있는 가장 큰 합계
    st.bt = st.first;
    if (st.cap <= st.cur) afterBet(st);
  }
  function afterBet(st) { st.bt = -1; st.phase = "pick"; st.pick = [null, null]; }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "bet") return st.bt >= 0 ? [st.bt] : [];
    if (st.phase === "pick") return [0, 1].filter(s => st.pick[s] == null);
    return [];
  };
  function record(st, rec) { st.res = rec; st.hist.push({ t: st.turn, r: st.round, blind: rec.blind.slice(), open: rec.open ? rec.open.slice() : null, w: rec.w, fold: !!rec.fold, folder: rec.folder, gain: rec.gain, bonus: rec.bonus }); if (st.hist.length > 40) st.hist.shift(); }
  function foldTurn(st, folder) {
    const w = 1 - folder, pot = st.pot;
    st.chips[w] += pot; st.pot = 0;
    const pen = st.blind[folder] >= BIGB ? Math.min(EXTRA, st.chips[folder]) : 0;
    st.chips[folder] -= pen; st.chips[w] += pen;
    st.seen.push(st.blind[0], st.blind[1]);
    record(st, { fold: true, folder, w, blind: st.blind.slice(), open: null, sums: null, gain: pot, bonus: pen, bonusKind: pen ? "blind" : null, chips: st.chips.slice() });
    push(st, { k: "show", fold: true, w, folder, blind: st.blind.slice(), gain: pot, bonus: pen });
    st.first = w; st.phase = "show"; st.bt = -1;
  }
  function showdown(st) {
    const o = st.pick.slice(), b = st.blind, sums = [b[0] + o[0], b[1] + o[1]];
    const w = sums[0] > sums[1] ? 0 : sums[1] > sums[0] ? 1 : o[0] > o[1] ? 0 : o[1] > o[0] ? 1 : -1;
    for (let s = 0; s < 2; s++) st.left[s] = st.left[s].filter(x => x !== o[s]);
    st.seen.push(b[0], b[1]);
    let gain = 0, bonus = 0;
    if (w >= 0) {
      gain = st.pot; st.chips[w] += st.pot; st.pot = 0;
      if (o[w] <= LOWOPEN) { bonus = Math.min(EXTRA, st.chips[1 - w]); st.chips[1 - w] -= bonus; st.chips[w] += bonus; }
      st.first = w;
    }
    record(st, { fold: false, w, tie: w < 0, blind: b.slice(), open: o, sums, gain, bonus, bonusKind: bonus ? "low" : null, carried: w < 0 ? st.pot : 0, chips: st.chips.slice() });
    push(st, { k: "show", fold: false, w, blind: b.slice(), open: o, sums, gain, bonus });
    st.phase = "show"; st.pick = [null, null];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "bet") {
      const toCall = st.cur - st.bet[seat], opp = 1 - seat;
      const pay = x => { st.chips[seat] -= x; st.bet[seat] += x; st.pot += x; };
      if (a.t === "call") { if (toCall > 0) pay(toCall); st.acts.push({ s: seat, a: toCall > 0 ? "call" : "check", to: st.cur }); push(st, { k: "bet", s: seat, a: toCall > 0 ? "call" : "check", to: st.cur }); }
      else if (a.t === "raise") {
        const to = a.to;
        if (!Number.isInteger(to)) return { ok: false, err: "걸 칩을 숫자로 골라요" };
        if (st.raises >= MAXRAISE) return { ok: false, err: "이번 턴은 레이즈를 다 썼어요" };
        if (to <= st.cur || to > st.cap) return { ok: false, err: st.cap > st.cur ? `${st.cur + 1}~${st.cap}칩까지만 걸 수 있어요` : "더 걸 수 없어요" };
        pay(to - st.bet[seat]); st.cur = to; st.raises++; st.acted[opp] = false;
        st.acts.push({ s: seat, a: "raise", to }); push(st, { k: "bet", s: seat, a: "raise", to });
      } else if (a.t === "fold") {
        if (toCall <= 0) return { ok: false, err: "걸린 칩이 없어요 — 콜(체크)하면 돼요" };
        st.acts.push({ s: seat, a: "fold", to: st.cur }); push(st, { k: "bet", s: seat, a: "fold", to: st.cur });
        foldTurn(st, seat); return { ok: true };
      } else return { ok: false, err: "콜 · 레이즈 · 폴드 중에서 골라요" };
      st.acted[seat] = true;
      if (st.acted[opp] && st.bet[0] === st.bet[1]) afterBet(st); else st.bt = opp;
      return { ok: true };
    }
    if (st.phase === "pick") {
      if (a.t !== "open" || !st.left[seat].includes(a.v)) return { ok: false, err: "남은 오픈 카드 중에서 골라요" };
      st.pick[seat] = a.v; push(st, { k: "lock", s: seat });
      if (!needs(st).length) showdown(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  const auto = st => (st.phase === "show" ? (st.res && st.res.fold ? 2600 : 4200) : null);
  function advance(st) { if (st.phase === "show") startTurn(st); }
  const over = st => !!st.over;
  const ranks = st => st.chips.map(c => st.chips.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "bet") {
      const L = [], toCall = st.cur - st.bet[seat];
      if (toCall > 0) L.push({ t: "fold" });
      L.push({ t: "call" });
      if (st.raises < MAXRAISE && st.cap > st.cur) { L.push({ t: "raise", to: st.cur + 1 }); if (st.cap > st.cur + 1) L.push({ t: "raise", to: st.cap }); }
      return L;
    }
    return st.left[seat].map(v => ({ t: "open", v }));
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 숨은 것 = 내 블라인드 (상대 것은 내가 봄) · 이번 턴 상대가 낸 오픈 카드 (공개 전). 쓴 카드 · 칩 · 베팅은 모두 공개.
  function view(st, seat) {
    const all = seat === "all", ps = seat === 0 || seat === 1;
    const reveal = st.phase === "show";
    const blind = [0, 1].map(s => (st.over ? null : (!ps || all || s !== seat || reveal ? st.blind[s] : null)));
    const pubObj = { r: st.round, t: st.turn, p: st.phase, c: st.chips, b: st.bet, pot: st.pot, cur: st.cur, bt: st.bt, pk: st.pick.map(x => x != null), l: st.left.map(x => x.length), ov: st.over, rs: reveal && st.res ? [st.res.w, st.res.blind, st.res.open] : null, a: st.acts.length };
    return {
      n: 2, R: ROUNDS, round: st.round, tno: st.turn, phase: st.phase, chips: st.chips.slice(), score: st.chips.slice(),
      pot: st.pot, carry: st.carry, bet: st.bet.slice(), cur: st.cur, cap: st.cap, raises: st.raises, maxRaise: MAXRAISE, turn: st.bt, first: st.first,
      left: st.left.map(x => x.slice()), deckLeft: st.deck.length, seen: st.seen.slice(), blind,
      picked: st.pick.map(x => x != null), mine: ps && st.pick[seat] != null ? st.pick[seat] : null, picks: all ? st.pick.slice() : null,
      acts: st.acts.map(x => ({ s: x.s, a: x.a, to: x.to })), hist: st.hist.map(h => Object.assign({}, h)),
      res: reveal || st.over ? st.res : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-40), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 계산 (보이는 것만) ─────────────────────────────────────
  // 내 블라인드가 무엇일지: 이번 라운드에 아직 안 나온 카드 중 하나 (상대 블라인드는 이미 보임). bayes = 상대가 레이즈했으면 내 블라인드가 낮았을 쪽에 무게
  function blindWeights(V, me, bayes) {
    const opp = 1 - me, cnt = Array(BMAX + 1).fill(2); cnt[0] = 0;
    for (const v of V.seen) cnt[v]--;
    const bo = V.blind[opp]; if (bo) cnt[bo]--;
    const nr = Math.min(2, V.acts.filter(x => x.s === opp && x.a === "raise").length);
    const w = cnt.map((c, v) => (v ? Math.max(0, c) * (bayes && nr ? Math.pow(0.55 + 0.9 * (BMAX - v) / (BMAX - 1), nr) : 1) : 0));
    const t = w.reduce((a, b) => a + b, 0) || 1;
    return w.map(x => x / t);
  }
  // 둘 다 T 칩을 건 상태로 내가 x · 상대가 y 를 냈을 때 내 칩 변화 (이 턴 시작 전 기준)
  function net(V, me, B, x, y, T) {
    const opp = 1 - me, bo = V.blind[opp], sm = B + x, so = bo + y, C = V.carry / 2;
    if (sm === so && x === y) return 0;
    const win = sm > so || (sm === so && x > y);
    if (win) return T + C + (x <= LOWOPEN ? Math.min(EXTRA, V.chips[opp] - (T - V.bet[opp])) : 0);
    return -(T + C) - (y <= LOWOPEN ? Math.min(EXTRA, V.chips[me] - (T - V.bet[me])) : 0);
  }
  function matrix(V, me, wts, T) {
    const X = V.left[me], Y = V.left[1 - me];
    return { X, Y, M: X.map(x => Y.map(y => { let e = 0; for (let B = 1; B <= BMAX; B++) if (wts[B]) e += wts[B] * net(V, me, B, x, y, T); return e; })) };
  }
  function solveGame(M, iters) {
    const n = M.length, m = M[0].length, cr = Array(n).fill(0), rs = Array(n).fill(0), cs = Array(m).fill(0);
    let i = 0, j = 0;
    for (let t = 0; t < (iters || 300); t++) {
      cr[i]++; for (let c = 0; c < m; c++) cs[c] += M[i][c];
      let bj = 0; for (let c = 1; c < m; c++) if (cs[c] < cs[bj]) bj = c; j = bj;
      for (let r = 0; r < n; r++) rs[r] += M[r][j];
      let bi = 0; for (let r = 1; r < n; r++) if (rs[r] > rs[bi]) bi = r; i = bi;
    }
    const tot = cr.reduce((a, b) => a + b, 0);
    return cr.map(x => x / tot);
  }
  // 오픈 카드를 낸 뒤의 기대 칩. mixed = 섞어 내는 전략으로 (고급), 아니면 상대가 고르게 낸다고 보고 가장 좋은 한 장
  function showEV(V, me, wts, T, mixed) {
    const { X, Y, M } = matrix(V, me, wts, T);
    const rowMean = M.map(r => r.reduce((a, b) => a + b, 0) / r.length);
    let bi = 0; rowMean.forEach((v, k) => { if (v > rowMean[bi]) bi = k; });
    if (!mixed) return { ev: rowMean[bi], x: X[bi], X, M, rowMean };
    const mix = solveGame(M);
    let worst = Infinity; for (let j = 0; j < Y.length; j++) { let s = 0; for (let i = 0; i < X.length; i++) s += mix[i] * M[i][j]; if (s < worst) worst = s; }
    return { ev: rowMean[bi] * 0.5 + worst * 0.5, x: X[bi], X, M, rowMean, mix };   // 상대가 고르게 낼 때와 가장 아픈 응수일 때의 중간
  }
  const foldPenaltyP = (V, me, wts) => { let p = 0; for (let B = BIGB; B <= BMAX; B++) p += wts[B]; return p * Math.min(EXTRA, V.chips[me]); };
  // 선택지마다 기대 칩: 폴드 · 콜 · 레이즈(몇 칩까지)
  // 위험 보정 (켈리식): 한 번에 건 칩이 클수록 이긴다 해도 판 전체를 잃을 위험이 커서 기대 칩에서 k·T²/(2·내 칩) 만큼 덜어 냄
  //   → 이길 확률이 높을수록 더 걸고, 첫 턴에 칩을 다 거는(올인) 수는 안 두게 됨 (없으면 중급 · 고급이 첫 턴에 칩을 다 걸어 한두 턴 만에 끝남)
  const KR = { normal: 4, hard: 1.5 };
  const risk = (V, me, T, k) => k * T * T / (2 * Math.max(4, V.chips[me] + V.bet[me]));
  function options(V, me, wts, mixed, k = KR.hard) {
    const opp = 1 - me, toCall = V.cur - V.bet[me], C = V.carry / 2, out = [];
    if (toCall > 0) out.push({ a: { t: "fold" }, ev: -V.bet[me] - C - foldPenaltyP(V, me, wts) });
    out.push({ a: { t: "call" }, ev: showEV(V, me, wts, V.cur, mixed).ev - risk(V, me, V.cur, k) });
    if (V.raises < V.maxRaise && V.cap > V.cur) {
      const bo = V.blind[opp], oppPen = bo >= BIGB ? Math.min(EXTRA, V.chips[opp]) : 0;
      const Rs = [...new Set([V.cur + 1, V.cur + 2, V.cur + 4, V.cap].filter(R => R > V.cur && R <= V.cap))];
      for (const R of Rs) {
        const pf = Math.min(0.55, 0.12 + 0.06 * (R - V.cur)), gainIfFold = V.bet[opp] + C + oppPen;
        out.push({ a: { t: "raise", to: R }, ev: pf * gainIfFold + (1 - pf) * (showEV(V, me, wts, R, mixed).ev - risk(V, me, R, k)) });
      }
    }
    return out;
  }
  // 선생님용: 이길 확률 · 오픈 카드마다 이득 · 선택지별 기대 칩 (보이는 것만)
  function chances(V, me) {
    const opp = 1 - me, wts = blindWeights(V, me, true), T = V.phase === "bet" ? V.cur : Math.max(V.bet[0], V.bet[1]);
    const { X, Y, M } = matrix(V, me, wts, T), bo = V.blind[opp];
    const rows = X.map((x, k) => {
      let pw = 0, pt = 0;
      for (const y of Y) for (let B = 1; B <= BMAX; B++) { if (!wts[B]) continue; const sm = B + x, so = bo + y; if (sm > so || (sm === so && x > y)) pw += wts[B] / Y.length; else if (sm === so && x === y) pt += wts[B] / Y.length; }
      return { x, pWin: pw, pTie: pt, ev: M[k].reduce((a, b) => a + b, 0) / M[k].length };
    }).sort((a, b) => b.ev - a.ev);
    const opts = V.phase === "bet" && V.needs.includes(me) ? options(V, me, wts, true) : [];
    let pBig = 0; for (let B = BIGB; B <= BMAX; B++) pBig += wts[B];
    return { wts, rows, best: rows[0] || null, p: rows[0] ? rows[0].pWin + rows[0].pTie / 2 : 0, pBig, opts, bo };
  }

  // ── AI (보이는 것만) ──────────────────────────────────────
  function ai(V, me, tier, rnd) {
    const opp = 1 - me, pickIn = a => a[Math.floor(rnd() * a.length)];
    if (V.phase === "bet") {
      const toCall = V.cur - V.bet[me], canRaise = V.raises < V.maxRaise && V.cap > V.cur;
      if (tier === "easy") {
        const x = rnd();
        if (toCall > 0) return toCall >= 2 && x < 0.2 ? { t: "fold" } : x > 0.88 && canRaise ? { t: "raise", to: Math.min(V.cap, V.cur + 1) } : { t: "call" };
        return x < 0.2 && canRaise ? { t: "raise", to: Math.min(V.cap, V.cur + 1) } : { t: "call" };
      }
      const hard = tier === "hard", wts = blindWeights(V, me, hard), opts = options(V, me, wts, hard, hard ? KR.hard : KR.normal);
      const noise = hard ? 0 : 0.7;
      let best = null, bv = -Infinity;
      for (const o of opts) { const v = o.ev + (rnd() - 0.5) * 2 * noise; if (v > bv) { bv = v; best = o; } }
      if (hard && best.a.t === "call" && canRaise && rnd() < 0.06) return { t: "raise", to: Math.min(V.cap, V.cur + 1) };   // 가끔 허세
      return best.a;
    }
    if (V.phase === "pick") {
      if (tier === "easy") return { t: "open", v: pickIn(V.left[me]) };
      const hard = tier === "hard", wts = blindWeights(V, me, hard), r = showEV(V, me, wts, Math.max(V.bet[0], V.bet[1]), hard);
      if (hard) { let x = rnd(), k = 0; while (k < r.mix.length - 1 && (x -= r.mix[k]) > 0) k++; return { t: "open", v: r.X[k] }; }
      if (rnd() < 0.2) return { t: "open", v: pickIn(V.left[me]) };
      return { t: "open", v: r.x };
    }
    return null;
  }

  return {
    id: "blindbet", START, ROUNDS, OPENN, BMAX, MAXRAISE, EXTRA, BIGB, LOWOPEN,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    chances, blindWeights, options, showEV,
  };
});

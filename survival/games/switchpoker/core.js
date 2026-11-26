/* 베니 서바이벌 · 스위치 포커 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 3 1일차 데스매치 (2:2 — 탈락 후보가 주 플레이어, 함께 앉는 사람이 조력자)
   · 숫자 카드 1~15 한 벌. 라운드마다 섞어 한 사람에 2장, 남은 7장 중 1장을 오픈 카드로 공개
   · 칩 20개씩, 라운드 시작 때 기본 베팅 1개 (팟이 이월된 라운드는 기본 베팅 없음) · 7라운드
   · 턴 순서: 1라운드 선공 팀은 랜덤(방송), 이후 번갈아 · 팀 안에서는 조력자 → 주 플레이어
   · 내 턴에 넷 중 하나
       ① 오픈 카드 변경 — 더미에서 한 장을 뒤집어 오픈 카드를 바꿈 (먼저 카드는 버린 카드로)
       ② 카드 교환 — 파트너에게 1장을 건네면 파트너가 받은 카드를 보고 3장 중 1장을 돌려줌 (받은 카드를 그대로 돌려줘도 됨)
       ③ 카드 버리기 — 더미에서 1장을 가져와 3장 중 1장을 공개로 버림 (가져온 카드를 바로 버려도 됨)
       ④ 패스
   · 네 사람 턴이 끝나면 같은 순서로 베팅: 콜(지금까지 가장 많이 건 만큼) · 레이즈(더) · 폴드
   · 베팅에 남은 사람은 2장을 공개 — 합이 가장 낮은 한 사람이 오픈 카드를 더해 3장 합 (가장 낮은 사람이 여럿이면 아무도 못 받음)
   · 합이 가장 큰 사람이 팟을 모두 가져감, 가장 큰 합이 같으면 팟은 다음 라운드로 이월
   · 누구든 칩이 0이 되면 그 팀이 짐 (우리는 그 라운드 팟 정산 뒤에 봄) · 7라운드가 끝나면 주 플레이어 칩이 많은 팀 승
   방송과 다른 점(우리가 정함):
     ① 자리 옵션 — 맞대결(기본): 0 = A팀 주 · 1 = B팀 주 · 2 = A팀 조력자 · 3 = B팀 조력자 (친구 둘이면 주끼리 맞붙고 조력자는 AI)
        · 한 팀: 0 · 1 = A팀 주 · 조력자 · 내가 조력자: 0 = A팀 조력자 · 1 = A팀 주
     ② 베팅을 처음 여는 사람은 1개 이상 더 걸거나 폴드 (방송 '추가 배팅 또는 포기') · 한 번에 올리는 칩은 1~10개
        · 베팅에 남은 사람 중 칩(이번 라운드에 건 것 포함)이 가장 적은 사람의 칩까지만 걸 수 있음 (사이드 팟 없음 — 방송 7라운드 칩 기록과 맞음)
     ③ 교환한 카드는 두 사람만 앎 (상대 팀은 교환했다는 것만 봄) · 교환 상대는 파트너만 (행동 설명 장면이 편집 — 인터뷰 '파트너와 교환' · 방송 교환이 모두 팀 안) · 폴드한 사람 카드는 공개 안 함 · 혼자 남으면 공개 없이 팟 · 버린 카드가 방금 가져온 카드인지는 안 보임
     ④ 둘이 함께 칩 0이 되면 주 플레이어 칩 → 팀 칩 합으로, 7라운드 끝 동점도 같게, 그래도 같으면 무승부 · 마지막에 남은 이월 팟은 사라짐
     ⑤ 팀원끼리 말하기 없음 (방송은 팀원이 귓속말 · 눈치) — 교환으로 건네는 카드가 신호 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).switchpoker = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 4, CHIPS = 20, ANTE = 1, ROUNDS = 7, RCAP = 10, TOP = 15;
  const LAM = 0.5, BIG = 40;                              // AI: 조력자 칩의 무게 · 칩 0(팀 패배)의 무게(칩 개수로)
  const MAPS = {
    vs: { tm: [0, 1, 0, 1], mn: [1, 1, 0, 0] },
    co: { tm: [0, 0, 1, 1], mn: [1, 0, 1, 0] },
    help: { tm: [0, 0, 1, 1], mn: [0, 1, 1, 0] },
  };
  function roles(map) {
    const M = MAPS[map] || MAPS.vs, tm = M.tm.slice(), mn = M.mn.map(x => !!x);
    const mate = tm.map((t, s) => tm.findIndex((u, j) => u === t && j !== s));
    const mainOf = [0, 1].map(t => tm.findIndex((u, j) => u === t && mn[j]));
    const partOf = [0, 1].map(t => tm.findIndex((u, j) => u === t && !mn[j]));
    return { tm, mn, mate, mainOf, partOf };
  }

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 240) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const sum2 = h => h[0] + h[1];

  // ── 진행 ─────────────────────────────────────────────────
  function init({ seed, cfg } = {}) {
    const c = cfg || {}, R = +c.rounds === 3 ? 3 : ROUNDS, map = MAPS[c.seat] ? c.seat : "vs", ro = roles(map);
    const st = {
      n: N, rs: (seed >>> 0) || 1, R, map, tm: ro.tm, mn: ro.mn, mt: ro.mate, mo: ro.mainOf, po: ro.partOf,
      round: 0, first: 0, chips: Array(N).fill(CHIPS), bet: Array(N).fill(0), carry: 0,
      phase: "act", over: false, hands: [], open: 0, deck: [], disc: [], order: [], k: 0, cur: 0,
      give: null, kn: [[], [], [], []], swaps: [], fold: Array(N).fill(false), todo: [], base: 0, acts: Array(N).fill(""),
      res: null, hist: [], win: -1, why: "", log: [], seq: 0,
    };
    for (let i = 0; i < 3; i++) rnd(st);
    st.first = Math.floor(rnd(st) * 2);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    if (st.round > 1) st.first = 1 - st.first;
    const F = st.first;
    st.order = [st.po[F], st.mo[F], st.po[1 - F], st.mo[1 - F]];
    const d = shuffle(() => rnd(st), Array.from({ length: TOP }, (_, i) => i + 1));
    st.hands = Array.from({ length: N }, () => []);
    for (let k = 0; k < 2; k++) for (const s of st.order) st.hands[s].push(d.pop());
    st.open = d.pop(); st.deck = d; st.disc = [];
    st.bet = Array(N).fill(0); st.fold = Array(N).fill(false); st.acts = Array(N).fill("");
    st.kn = [[], [], [], []]; st.give = null; st.res = null; st.todo = [];
    const ante = st.carry > 0 ? 0 : ANTE;
    for (let s = 0; s < N; s++) { const a = Math.min(ante, st.chips[s]); st.bet[s] = a; st.chips[s] -= a; }
    st.base = ante; st.k = 0; st.cur = st.order[0]; st.phase = "act";
    push(st, { k: "round", r: st.round, first: F, open: st.open, ante, carry: st.carry });
  }
  function needs(st) { return !st.over && (st.phase === "act" || st.phase === "drop" || st.phase === "reply" || st.phase === "bet") ? [st.cur] : []; }
  const ERR = m => ({ ok: false, err: m });
  const level = st => Math.max(...st.bet);
  const active = st => [0, 1, 2, 3].filter(s => !st.fold[s]);
  const capOf = st => Math.min(...active(st).map(s => st.chips[s] + st.bet[s]));
  function roundAt(st) { let i = st.log.length - 1; while (i >= 0 && !(st.log[i].k === "round" && st.log[i].r === st.round)) i--; return Math.max(0, i); }   // 이번 라운드 시작 (view 로그는 적어도 여기부터)
  function syncKn(st) { for (let s = 0; s < N; s++) st.kn[s] = st.kn[s].filter(c => st.hands[st.mt[s]].includes(c)); }
  function nextAct(st) {
    st.k++;
    if (st.k < N) { st.cur = st.order[st.k]; st.phase = "act"; return; }
    st.phase = "bet"; st.todo = st.order.slice(); st.cur = st.todo[0];
    push(st, { k: "betstart", lv: level(st) });
  }
  function apply(st, seat, a) {
    if (st.over) return ERR("끝난 판이에요");
    if (!a || typeof a !== "object") return ERR("잘못된 행동");
    if (!needs(st).includes(seat)) return ERR("차례가 아니에요");
    const h = st.hands[seat];
    if (st.phase === "act") {
      if (a.t === "pass") { st.acts[seat] = "pass"; push(st, { k: "act", s: seat, t: "pass" }); nextAct(st); return { ok: true }; }
      if (a.t === "open") {
        if (!st.deck.length) return ERR("더미가 비었어요");
        const old = st.open; st.disc.push({ c: old, s: seat, o: 1 }); st.open = st.deck.pop();
        st.acts[seat] = "open"; push(st, { k: "act", s: seat, t: "open", old, c: st.open }); nextAct(st); return { ok: true };
      }
      if (a.t === "draw") {
        if (!st.deck.length) return ERR("더미가 비었어요");
        st.give = { s: seat, c: st.deck.pop(), t: "draw" }; h.push(st.give.c); st.phase = "drop";
        st.acts[seat] = "draw"; push(st, { k: "act", s: seat, t: "draw" }); return { ok: true };
      }
      if (a.t === "swap") {
        if (typeof a.c !== "number" || !h.includes(a.c)) return ERR("건넬 카드를 골라요");
        const m = st.mt[seat];
        h.splice(h.indexOf(a.c), 1); st.give = { s: seat, c: a.c, t: "swap" }; st.hands[m].push(a.c); syncKn(st);
        st.phase = "reply"; st.cur = m; st.acts[seat] = "swap";
        push(st, { k: "act", s: seat, t: "swap" });
        return { ok: true };
      }
      return ERR("패스 · 오픈 카드 변경 · 교환 · 버리기 중에서 골라요");
    }
    if (st.phase === "drop") {
      if (a.t !== "drop" || typeof a.c !== "number" || !h.includes(a.c)) return ERR("버릴 카드를 골라요");
      h.splice(h.indexOf(a.c), 1); st.disc.push({ c: a.c, s: seat }); st.give = null;
      push(st, { k: "drop", s: seat, c: a.c });
      syncKn(st); nextAct(st); return { ok: true };
    }
    if (st.phase === "reply") {
      if (a.t !== "back" || typeof a.c !== "number" || !h.includes(a.c)) return ERR("돌려줄 카드를 골라요");
      const g = st.give, from = g.s;
      h.splice(h.indexOf(a.c), 1); st.hands[from].push(a.c);
      // 두 사람이 아는 것: 건넨 카드 · 돌려받은 카드가 지금 누구 손에 있는지
      if (a.c !== g.c) st.kn[from].push(g.c);
      st.kn[seat].push(a.c);
      st.swaps.push({ r: st.round, a: from, m: seat, x: g.c, y: a.c });
      st.give = null; syncKn(st);
      push(st, { k: "back", s: seat, a: from });
      st.cur = from; nextAct(st); return { ok: true };
    }
    if (st.phase === "bet") {
      const L = level(st), cap = capOf(st), need = L - st.bet[seat], opened = L > st.base;
      if (a.t === "fold") { st.fold[seat] = true; push(st, { k: "bet", s: seat, t: "fold", lv: L, b: st.bet[seat] }); }
      else if (a.t === "call") {
        if (!opened && L < cap) return ERR("처음 여는 사람은 1개 이상 걸거나 폴드해요");
        if (need > st.chips[seat]) return ERR("칩이 모자라요");
        st.chips[seat] -= need; st.bet[seat] = L; push(st, { k: "bet", s: seat, t: need ? "call" : "check", lv: L, b: L });
      } else if (a.t === "raise") {
        const r = a.r;
        if (!Number.isInteger(r) || r < 1 || r > RCAP) return ERR(`1~${RCAP}개를 더 걸어요`);
        if (L + r > cap) return ERR(`이번 판은 ${cap}개까지만 걸 수 있어요`);
        const pay = L + r - st.bet[seat]; if (pay > st.chips[seat]) return ERR("칩이 모자라요");
        st.chips[seat] -= pay; st.bet[seat] = L + r;
        push(st, { k: "bet", s: seat, t: opened ? "raise" : "open", r, lv: L + r, b: L + r });
        const at = st.order.indexOf(seat); st.todo = [seat];
        for (let k = 1; k < N; k++) { const j = st.order[(at + k) % N]; if (!st.fold[j]) st.todo.push(j); }
      } else return ERR("콜 · 레이즈 · 폴드 중에서 골라요");
      st.todo.shift();
      st.todo = st.todo.filter(j => !st.fold[j]);
      if (active(st).length <= 1 || !st.todo.length) showdown(st);
      else st.cur = st.todo[0];
      return { ok: true };
    }
    return ERR("지금은 할 수 없어요");
  }
  // 승부: 참가자 act 에서 오픈 카드 규칙 → 이긴 자리 (−1 = 가장 큰 합이 같음)
  function judge(hs, act, open) {
    if (act.length === 1) return act[0];
    let lo = 99, loN = 0, loS = -1;
    for (const s of act) { const v = hs[s][0] + hs[s][1]; if (v < lo) { lo = v; loN = 1; loS = s; } else if (v === lo) loN++; }
    let hi = -1, hiN = 0, hiS = -1;
    for (const s of act) { const v = hs[s][0] + hs[s][1] + (loN === 1 && s === loS ? open : 0); if (v > hi) { hi = v; hiN = 1; hiS = s; } else if (v === hi) hiN++; }
    return hiN === 1 ? hiS : -1;
  }
  function showdown(st) {
    const act = active(st), pot = st.carry + st.bet.reduce((x, y) => x + y, 0);
    const sums = Array(N).fill(null), base = Array(N).fill(null);
    let getOpen = -1, win = -1;
    if (act.length === 1) win = act[0];
    else {
      for (const s of act) base[s] = sum2(st.hands[s]);
      const lo = Math.min(...act.map(s => base[s])), los = act.filter(s => base[s] === lo);
      if (los.length === 1) getOpen = los[0];
      for (const s of act) sums[s] = base[s] + (s === getOpen ? st.open : 0);
      win = judge(st.hands, act, st.open);
    }
    const before = st.chips.map((c, s) => c + st.bet[s]);
    if (win >= 0) { st.chips[win] += pot; st.carry = 0; } else st.carry = pot;
    const shown = act.length > 1;
    st.res = { r: st.round, act, pot, win, tie: win < 0, getOpen, open: st.open, base, sums, bets: st.bet.slice(),
      hands: st.hands.map((h, s) => (shown && act.includes(s) ? h.slice() : null)), all: st.hands.map(h => h.slice()), before, chips: st.chips.slice(), carry: st.carry };
    st.hist.push(st.res);
    push(st, { k: "show", win, tie: win < 0, pot, getOpen, sums: sums.slice() });
    st.phase = "show"; st.cur = -1;
    const zero = [0, 1, 2, 3].filter(s => st.chips[s] <= 0);
    if (zero.length || st.round >= st.R) {
      const zt = [...new Set(zero.map(s => st.tm[s]))];
      if (zt.length === 1) { st.win = 1 - zt[0]; st.why = "zero"; }
      else {
        const m0 = st.chips[st.mo[0]], m1 = st.chips[st.mo[1]], t0 = m0 + st.chips[st.po[0]], t1 = m1 + st.chips[st.po[1]];
        if (m0 !== m1) { st.win = m0 > m1 ? 0 : 1; st.why = "main"; }
        else if (t0 !== t1) { st.win = t0 > t1 ? 0 : 1; st.why = "team"; }
        else { st.win = -1; st.why = "draw"; }
        if (zt.length === 2) st.why += "0";
      }
      st.over = true; st.phase = "end";
      push(st, { k: "end", win: st.win, why: st.why });
    }
  }
  function auto(st) { return st.phase === "show" && !st.over ? 5200 : null; }
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  function ranks(st) { return [0, 1, 2, 3].map(s => (st.win < 0 ? 0 : st.tm[s] === st.win ? 0 : 2)); }
  function betLegal(L, cap, opened, chips, bet) {
    const out = [{ t: "fold" }];
    if ((opened || L >= cap) && L - bet <= chips) out.push({ t: "call" });
    for (let r = 1; r <= RCAP && L + r <= cap && L + r - bet <= chips; r++) out.push({ t: "raise", r });
    return out;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const h = st.hands[seat], L = [];
    if (st.phase === "act") { L.push({ t: "pass" }); if (st.deck.length) L.push({ t: "open" }, { t: "draw" }); for (const c of h) L.push({ t: "swap", c }); }
    else if (st.phase === "drop") for (const c of h) L.push({ t: "drop", c });
    else if (st.phase === "reply") for (const c of h) L.push({ t: "back", c });
    else if (st.phase === "bet") return betLegal(level(st), capOf(st), level(st) > st.base, st.chips[seat], st.bet[seat]);
    return L;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 && seat < N ? seat : -1;
    const open = st.phase === "show" || st.over, R = st.res;
    const g = st.give, give = !g ? null : all || me === g.s || (g.t === "swap" && me === st.mt[g.s]) ? { s: g.s, t: g.t, c: g.c } : { s: g.s, t: g.t, c: null };
    const pubObj = { r: st.round, p: st.phase, c: st.cur, k: st.k, ch: st.chips, b: st.bet, f: st.fold, o: st.open, d: st.disc, dn: st.deck.length, ca: st.carry, a: st.acts, h: st.hist.length, ov: st.over, g: g ? g.s : -1, gt: g ? g.t : "" };
    const pubRes = r => (r ? Object.assign({}, r, { all: all ? r.all : null }) : null);
    const v = {
      n: N, R: st.R, map: st.map, tm: st.tm, mn: st.mn, mate: st.mt, mainOf: st.mo, partOf: st.po,
      round: st.round, phase: st.phase, over: st.over, first: st.first, order: st.order, k: st.k, cur: st.cur,
      chips: st.chips, bet: st.bet, fold: st.fold, carry: st.carry, pot: st.carry + st.bet.reduce((x, y) => x + y, 0),
      level: level(st), cap: capOf(st), base: st.base, opened: level(st) > st.base, todo: st.phase === "bet" ? st.todo : [],
      open: st.open, deckN: st.deck.length, disc: st.disc, acts: st.acts, give,
      hand: me >= 0 ? st.hands[me] : null, handN: st.hands.map(h => h.length),
      kn: me >= 0 ? st.kn[me] : null, swaps: st.swaps.filter(x => all || x.a === me || x.m === me),
      hands: all ? st.hands : null, deck: all ? st.deck : null,
      res: open ? pubRes(R) : null, hist: st.hist.map(pubRes),
      win: st.over ? st.win : -1, why: st.over ? st.why : "",
      needs: needs(st), ranks: st.over ? ranks(st) : null, log: st.log.slice(Math.max(0, Math.min(st.log.length - 120, roundAt(st)))), seat,
      score: st.chips, pub: hash(JSON.stringify(pubObj)),
    };
    return JSON.parse(JSON.stringify(v));                // 깊은 복사: 화면 · 선생님 · AI가 V를 건드려도 판은 그대로
  }

  // ── AI (보이는 것만) ─────────────────────────────────────────
  // 자리 값: 내 팀 주 +1 · 내 팀 조력자 +LAM · 상대 주 −1 · 상대 조력자 −LAM (칩이 그 자리로 갈 때의 무게)
  const valSeat = (V, me, s) => (s < 0 ? 0 : (V.tm[s] === V.tm[me] ? 1 : -1) * (V.mn[s] ? 1 : LAM));
  // 이번 라운드 공개 단서: 버린 카드 · 레이즈 · 레이즈에 콜 · 교환한 팀 · 파트너 손패의 범위
  function clues(V, me) {
    let i = V.log.length - 1; while (i >= 0 && !(V.log[i].k === "round" && V.log[i].r === V.round)) i--;
    const D = [[], [], [], []], RZ = [0, 0, 0, 0], CL = [0, 0, 0, 0], SW = [0, 0];
    let raised = false;
    for (let k = i + 1; k < V.log.length; k++) {
      const e = V.log[k];
      if (e.k === "drop") D[e.s].push(e.c);
      else if (e.k === "act" && e.t === "swap") SW[V.tm[e.s]] = 1;
      else if (e.k === "bet") { if (e.t === "raise" || e.t === "open") { RZ[e.s]++; raised = true; } else if (e.t === "call" && raised) CL[e.s]++; }
    }
    // 교환 약속: 조력자는 가장 높은 카드를 건네고(받으면 3장 중 가장 높은 걸 돌려줌) · 주는 가장 낮은 카드를 건넴(받으면 가장 낮은 걸 돌려줌)
    const mt = V.mate[me]; let lo = 0, hi = 99;
    if (V.phase === "reply" && V.give && V.give.s === mt && V.give.c != null) { if (V.mn[mt]) lo = V.give.c; else hi = V.give.c; }
    const sw = V.swaps.filter(x => x.r === V.round), last = sw[sw.length - 1];
    if (last && (last.a === me || last.m === me)) {
      const ref = last.a === me ? last.y : last.x;
      if (V.mn[mt]) lo = Math.max(lo, ref); else hi = Math.min(hi, ref);
    }
    return { D, RZ, CL, SW, lo, hi, mt };
  }
  // 모르는 카드: 1~15 − 내 손패 − 오픈 − 버린 카드 − 파트너 손에 있다고 아는 카드
  function pool(V, me) {
    const seen = new Uint8Array(TOP + 2);
    for (const c of V.hand) seen[c] = 1; seen[V.open] = 1;
    for (const d of V.disc) seen[d.c] = 1;
    for (const c of V.kn) seen[c] = 1;
    const p = []; for (let c = 1; c <= TOP; c++) if (!seen[c]) p.push(c);
    return p;
  }
  // 표본 무게: 단서와 어긋나는 손패일수록 가볍게
  function weight(V, me, C, hs) {
    let w = 1;
    for (let s = 0; s < N; s++) {
      if (s === me) continue;
      const h = hs[s], sm = h.length === 2 ? h[0] + h[1] : 0;
      for (const d of C.D[s]) for (const c of h) if (c < d) w *= 0.6;
      if (h.length === 2) {
        if (C.RZ[s] && sm < 19) w *= C.RZ[s] > 1 ? 0.3 : 0.5;
        if (C.CL[s] && sm < 15) w *= 0.7;
        if (C.SW[V.tm[s]] && V.mn[s] && V.tm[s] !== V.tm[me] && sm < 16) w *= 0.7;
      }
      if (s === C.mt) for (const c of h) if (!V.kn.includes(c) && (c < C.lo || c > C.hi)) w *= 0.3;
    }
    return w;
  }
  function dealOthers(V, me, C, bag, base) {
    let bp = 0;
    for (let s = 0; s < N; s++) {
      if (s === me) { base[s] = V.hand.slice(); continue; }
      const h = s === C.mt ? V.kn.slice() : [];
      while (h.length < V.handN[s]) h.push(bag[bp++]);
      base[s] = h;
    }
    return bp;
  }
  // 뒤에 둘 사람들의 단순한 수 (표본 안에서): 조력자는 주가 뒤에 있으면 가장 높은 카드를 건넴(주는 가장 낮은 걸 돌려줌) · 합 19 미만이면 더미에서 한 장 → 높은 2장
  function later(V, me, k0, hs, bag, bp, inclMe) {
    for (let k = k0 + 1; k < N; k++) {
      const j = V.order[k]; if (j === me && !inclMe) continue;
      const h = hs[j], m = V.mate[j];
      if (!V.mn[j] && V.order.indexOf(m) > k) {
        const hm = hs[m], g = h[0] > h[1] ? h[0] : h[1], lo = hm[0] < hm[1] ? hm[0] : hm[1];
        if (g > lo) { hs[m] = [hm[0] + hm[1] - lo, g]; hs[j] = [h[0] + h[1] - g, lo]; continue; }
      }
      if (h[0] + h[1] < 19 && bp < bag.length) { const x = bag[bp++], t = [h[0], h[1], x].sort((a, b) => b - a); hs[j] = [t[0], t[1]]; }
    }
  }
  const ALL = [0, 1, 2, 3];
  // 카드 단계(턴 · 버리기 · 돌려주기)의 후보 평가: 같은 표본으로 후보마다 끝 손패를 만들어 누가 가장 큰지 (팀 값 v · 우리 팀이 가장 클 확률 p)
  function cardEval(V, me, opts, S, r) {
    const C = clues(V, me), P = pool(V, me), out = opts.map(() => ({ w: 0, v: 0, p: 0 })), base = [null, null, null, null];
    for (let q = 0; q < S; q++) {
      const bag = shuffle(r, P.slice()), bp = dealOthers(V, me, C, bag, base), w = weight(V, me, C, base);
      if (!(w > 0)) continue;
      for (let o = 0; o < opts.length; o++) {
        const A = opts[o], hs = base.map(h => h.slice()); let open = V.open, b = bp;
        if (A.t === "open") { if (b < bag.length) open = bag[b++]; }
        else if (A.t === "draw") { const x = bag[b++], t = hs[me].concat([x]).sort((a, c) => c - a); hs[me] = [t[0], t[1]]; }
        else if (A.t === "swap") { const m = C.mt, hm = hs[m].concat([A.c]), y = V.mn[m] ? Math.min(...hm) : Math.max(...hm); hs[me] = hs[me].filter(c => c !== A.c).concat([y]); hs[m] = hm.filter(c => c !== y); }
        else if (A.t === "drop") hs[me] = hs[me].filter(c => c !== A.c);
        else if (A.t === "back") { hs[me] = hs[me].filter(c => c !== A.c); hs[C.mt] = hs[C.mt].concat([A.c]); }
        later(V, me, V.k, hs, bag, b, A.t === "back");
        const x = judge(hs, ALL, open);
        out[o].w += w; out[o].v += w * valSeat(V, me, x); if (x >= 0 && V.tm[x] === V.tm[me]) out[o].p += w;
      }
    }
    return opts.map((a, o) => ({ a, v: out[o].w ? out[o].v / out[o].w : 0, p: out[o].w ? out[o].p / out[o].w : 0 }));
  }
  function cardOpts(V, me) {
    const h = V.hand, L = [];
    if (V.phase === "act") { L.push({ t: "pass" }); if (V.deckN) L.push({ t: "open" }, { t: "draw" }); for (const c of h) L.push({ t: "swap", c }); }
    else if (V.phase === "drop") for (const c of h) L.push({ t: "drop", c });
    else if (V.phase === "reply") for (const c of h) L.push({ t: "back", c });
    return L;
  }
  // 베팅 (고급): 남 손패를 단서 무게로 뽑아 '지금 남은 사람이 모두 끝까지 가면' 누가 이기나 → 칩 기대값(팀 기준)으로 콜 · 폴드,
  //   이길 확률이 높으면 그만큼 레이즈 (칩 0이 될 레이즈는 아주 셀 때만) — 남이 겁먹고 접는다는 셈은 하지 않음 (헛 레이즈 없음)
  const FOLD_M = 1.2;                                     // 콜은 폴드보다 칩 1.2개 이상 나을 때만 (단서 무게가 어림이라 아슬아슬하면 접음 — 보통 AI와 900판씩 재서 고름)
  function betEval(V, me, S, r) {
    const C = clues(V, me), P = pool(V, me), act = ALL.filter(s => !V.fold[s]), others = act.filter(s => s !== me);
    const L = V.level, pot = V.pot, need = L - V.bet[me], chips = V.chips[me];
    const pW = [0, 0, 0, 0], pF = [0, 0, 0, 0]; let W = 0, tie = 0;
    const base = [null, null, null, null];
    for (let q = 0; q < S; q++) {
      const bag = shuffle(r, P.slice()); dealOthers(V, me, C, bag, base);
      const w = weight(V, me, C, base); if (!(w > 0)) continue;
      W += w;
      const x = judge(base, act, V.open); if (x >= 0) pW[x] += w; else tie += w;
      const y = others.length ? judge(base, others, V.open) : -1; if (y >= 0) pF[y] += w;
    }
    for (let s = 0; s < N; s++) { pW[s] = W ? pW[s] / W : 0; pF[s] = W ? pF[s] / W : 0; }
    const pTie = W ? tie / W : 0, pM = pW[me], pT = pW[me] + pW[V.mate[me]];
    const lose = 1 - pT;                                              // 우리 팀이 못 가져갈 몫 (동점 이월 포함)
    const evIn = c => { let e = -valSeat(V, me, me) * c; for (let s = 0; s < N; s++) e += pW[s] * valSeat(V, me, s) * (pot + c); return e + (chips - c <= 0 ? -BIG * (1 - pW[me]) : 0); };
    let EVf = 0; for (let s = 0; s < N; s++) EVf += pF[s] * valSeat(V, me, s) * pot;
    if (chips <= 0) EVf -= BIG;                                       // 칩 0으로 폴드 = 팀 패배
    const opts = betLegal(L, V.cap, V.opened, chips, V.bet[me]), can = t => opts.some(a => a.t === t);
    const rs = opts.filter(a => a.t === "raise").map(a => a.r);
    const EVc = evIn(can("call") ? need : need + 1);                 // 처음 여는 사람은 1개는 더 걸어야 함
    let a, rr = 0, why = "ev";
    const mt = V.mate[me], keep = V.R - V.round + 2;                     // 조력자는 남은 라운드 기본 베팅 + 1은 남김
    let r0 = V.log.length - 1; while (r0 >= 0 && !(V.log[r0].k === "round" && V.log[r0].r === V.round)) r0--;
    const lastR = V.log.slice(r0 + 1).reverse().find(e => e.k === "bet" && (e.t === "raise" || e.t === "open") && e.lv === L);   // 이번 라운드 것만
    if (others.length === 1 && others[0] === mt) {
      // 팀원 둘만 남음: 조력자 칩을 주 플레이어에게 옮기기 (방송 3라운드처럼) — 조력자가 올리면 주가 1개 더 올리고, 조력자는 접어서 팟을 넘김
      why = "move";
      if (!V.mn[me]) {
        const room = rs.filter(x => chips - need - x >= keep);
        a = lastR && lastR.s === mt && need > 0 ? { t: "fold" } : room.length ? { t: "raise", r: room[room.length - 1] } : { t: "fold" };
      } else a = need > 0 && rs.length && chips - need - 1 > 0 ? { t: "raise", r: 1 } : can("call") ? { t: "call" } : rs.length ? { t: "raise", r: 1 } : { t: "fold" };
    } else if (EVc < EVf + FOLD_M || (!can("call") && !rs.length)) a = { t: "fold" };
    else {
      a = can("call") ? { t: "call" } : { t: "raise", r: rs[0] };
      const mateLed = lastR && lastR.s === mt && !(V.mn[me] && pM >= 0.7);      // 파트너가 올린 판은 다시 올리지 않음 (주가 아주 셀 때만)
      if (pM >= 0.55 && rs.length && !mateLed) {
        rr = Math.max(1, Math.round((pM - 0.45) * 12 + (pot >= 12 ? 1 : 0)));
        const safe = rs.filter(x => (V.mn[me] ? chips - need - x > 0 || pM >= 0.8 : chips - need - x >= keep));
        rr = safe.length ? Math.min(rr, safe[safe.length - 1]) : 0;
        if (rr > 0) { a = { t: "raise", r: rr }; why = "value"; }
      }
    }
    return { a, pW, pF, pM, pT, pTie, lose, EVc, EVf, need, pot, rr, why, keep };
  }
  const S_CARD = 240, S_BET = 360;
  function hardPick(V, me, r) {
    if (V.phase === "bet") { const B = betEval(V, me, S_BET, r); return { a: B.a, B }; }
    // 교환 약속 (신호): 조력자는 가장 높은 카드를 건네고, 받으면 3장 중 가장 높은 걸 돌려줌 · 주는 받으면 가장 낮은 걸 돌려줌
    //   → 받은 카드만 보고 파트너 손패를 짐작할 수 있게 늘 같은 꼴로 (주가 먼저 건네는 교환은 하지 않음)
    const O = cardEval(V, me, cardOpts(V, me), S_CARD, r);
    if (V.phase === "reply") return { a: { t: "back", c: V.mn[me] ? Math.min(...V.hand) : Math.max(...V.hand) }, O, rule: "reply" };
    if (V.phase === "act" && !V.mn[me] && V.order.indexOf(V.mate[me]) > V.k) return { a: { t: "swap", c: Math.max(...V.hand) }, O, rule: "give" };
    let best = null; for (const x of O) if (!(V.phase === "act" && V.mn[me] && x.a.t === "swap") && (!best || x.v > best.v + 1e-9)) best = x;
    return { a: best.a, O };
  }
  function ai(V, me, tier, r) {
    if (!V || V.over || !V.needs || !V.needs.includes(me) || !V.hand) return null;
    if (tier === "hard") return hardPick(V, me, r).a;
    const h = V.hand, s = h.length === 2 ? sum2(h) : 0, isM = V.mn[me], mt = V.mate[me];
    if (V.phase === "act") {
      if (tier === "easy") { const L = cardOpts(V, me); return L[Math.floor(r() * L.length)]; }
      if (!isM && V.order.indexOf(mt) > V.k) return { t: "swap", c: Math.max(...h) };      // 조력자: 주가 뒤면 가장 높은 카드를 건넴
      return (isM ? s < 20 : s < 15) && V.deckN ? { t: "draw" } : { t: "pass" };
    }
    if (V.phase === "drop") return tier === "easy" && r() < 0.5 ? { t: "drop", c: h[Math.floor(r() * h.length)] } : { t: "drop", c: Math.min(...h) };
    if (V.phase === "reply") return tier === "easy" ? { t: "back", c: h[Math.floor(r() * h.length)] } : { t: "back", c: isM ? Math.min(...h) : Math.max(...h) };
    if (V.phase === "bet") {
      const L = betLegal(V.level, V.cap, V.opened, V.chips[me], V.bet[me]), can = t => L.some(a => a.t === t), rs = L.filter(a => a.t === "raise");
      if (tier === "easy") { const x = r(); if (x < 0.3) return { t: "fold" }; if (x < 0.85 && can("call")) return { t: "call" }; return rs.length ? rs[Math.floor(r() * Math.min(4, rs.length))] : can("call") ? { t: "call" } : { t: "fold" }; }
      const est = s + (s <= 9 ? V.open : 0), need = V.level - V.bet[me];
      if (!V.opened && !can("call")) return est >= 18 && rs.length ? rs[Math.min(1, rs.length - 1)] : { t: "fold" };
      if (est >= 24 && rs.length) return rs[Math.min(1, rs.length - 1)];
      if (est >= 18 || need === 0) return can("call") ? { t: "call" } : { t: "fold" };
      return { t: "fold" };
    }
    return null;
  }
  function recRnd(V, me) {
    let a = (parseInt(hash(JSON.stringify([V.round, V.phase, V.k, V.hand, V.open, V.disc, V.kn, V.bet, V.fold, V.level, me])), 36) >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function recommend(V, me) { return hardPick(V, me, recRnd(V, me)); }

  return {
    id: "switchpoker", N, CHIPS, ANTE, ROUNDS, RCAP, TOP, LAM, BIG, MAPS, S_CARD, S_BET, roles,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, recRnd,
    judge, pool, clues, FOLD_M, cardEval, cardOpts, betEval, betLegal, hardPick, valSeat,
  };
});

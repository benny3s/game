/* 베니 서바이벌 · 커트라인 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌3 · 커트라인 (11~12일차 파이널 인 스테이지 1차, 8인 개인전 · 1·2위 파이널 직행)
   · 준비물: 사람마다 색으로 나뉜 숫자 카드 1~6 두 세트(12장) + 코인 20개
   · 3라운드. 라운드마다 슬롯 A~D 네 개 — 슬롯마다 '최대 카드 수'와 'LIMIT(등록된 숫자 합의 상한)'이 정해져 있어요
       1R A 8장/24 · B 7/21 · C 6/18 · D 5/15   2R A 8/22 · B 7/19 · C 5/14 · D 5/12   3R A 8/26 · B 7/20 · C 6/12 · D 4/9
   · 라운드 진행: ① 순서 결정권 입찰 (코인을 비공개로 냄, 가장 많이 낸 사람이 1차 제출 순서를 정함 · 아무도 안 내면 추첨 · 낸 코인은 사라짐)
       ② 규칙 카드 A~H 를 한 장씩 무작위로 받음  ③ 1차 제출: 순서대로 숫자 카드 1장을 뒷면으로 원하는 슬롯에
       ④ 2차 제출: 1차의 역순으로 2장. 숫자 카드를 낼 때 원하는 슬롯에 코인과 함께 규칙 카드를 낼 수 있음
         (한 슬롯에 규칙이 여럿이면 코인을 가장 많이 낸 사람 것만 적용, 나머지는 코인과 함께 사라짐 · 누구 규칙인지는 공개, 코인 수는 비공개)
       ⑤ 공개 · 등록: 슬롯마다 숫자가 높은 카드부터 등록, 같은 숫자는 먼저 놓은 카드 먼저, LIMIT을 넘기게 되는 카드는 버리고 다음으로 낮은 카드
   · 규칙 카드: A LIMIT −3 · B LIMIT +3 · C 최대 카드 수 −1 · D 낮은 숫자부터 등록 · E 처음 낸 6 카드를 1로 · F 처음 낸 카드 버림
       · G 처음 낸 6 카드 버림 · H 규칙 카드 낸 사람의 첫 카드를 먼저 등록
   · 점수: 등록된 카드 숫자별 — 1→1점 · 2→4점 · 3→5점 · 4→6점 · 5→3점 · 6→2점. 3라운드 합이 높은 순 (1·2위 파이널 직행)
   · 동점: 방송은 1위 3명 이상 · 2위 2명 이상 동점이면 남은 코인 1개 = 1점
   방송과 다른 점(우리가 정함):
     ① 3~8명 (방송 8명) — 8명보다 적으면 슬롯의 최대 카드 수 · LIMIT을 (인원 ÷ 8) 배로 줄이고 올림 (slotsFor)
     ② 입찰 동점은 추첨 (방송은 투표룸에 먼저 들어간 사람) · 규칙 카드 코인 동점은 먼저 낸 규칙 카드
     ③ 규칙 카드는 코인 1개 이상과 함께 · 라운드에 한 장 (안 쓰면 그 라운드 끝에 사라짐) · 놓인 규칙 카드는 공개 때까지 안 보임
     ④ 남의 코인 수는 판이 끝날 때까지 비공개 · 동점은 모든 등수에서 남은 코인으로 가르고 그래도 같으면 공동
     ⑤ 슬롯 카드는 뒷면(누구 카드인지 · 몇 번째인지만 보임), 공개된 숫자로 남의 남은 카드를 셀 수 있어요
     ⑥ 그 라운드 슬롯 표는 1차 제출이 시작되면 모두에게 공개 (방송은 제출하러 방에 들어가 확인 — 입찰 때는 모름)
   · 순서 입찰에 낸 코인은 진 사람 것도 사라짐 (방송 코인 기록이 그렇게 맞음)
   · 방송 구조: 1·2위 파이널 직행, 나머지 6명은 2차 게임 메모리 카운트로 2명 더, 못 간 4명은 바로 탈락 — 우리는 커트라인 한 게임 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).cutline = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 3, COINS = 20, LETTERS = "ABCDEFGH", SLOTN = 4;
  const BASE = [                                       // 라운드별 슬롯 A~D [최대 카드 수, LIMIT] (방송 8명)
    [[8, 24], [7, 21], [6, 18], [5, 15]],
    [[8, 22], [7, 19], [5, 14], [5, 12]],
    [[8, 26], [7, 20], [6, 12], [4, 9]],
  ];
  const PTS = [0, 1, 4, 5, 6, 3, 2];                   // 숫자별 점수 (1~6)
  const RULE_TXT = { A: "LIMIT −3", B: "LIMIT +3", C: "최대 카드 수 −1", D: "낮은 숫자부터 등록", E: "처음 낸 6 → 1", F: "처음 낸 카드 버림", G: "처음 낸 6 버림", H: "낸 사람의 첫 카드 먼저 등록" };
  const SL = "ABCD";

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 160) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const clampN = n => Math.max(3, Math.min(8, n | 0 || 8));

  // 인원에 맞춘 슬롯 표 (8명 = 방송 그대로, 적으면 ×(인원/8) 올림)
  function slotsFor(n, r) {
    return BASE[r - 1].map(([m, l]) => (n >= 8 ? { max: m, lim: l } : { max: Math.ceil(m * n / 8), lim: Math.ceil(l * n / 8) }));
  }

  // ── 슬롯 하나 등록 (순수 함수 — 시험 · AI · 화면 공용) ───────────────
  // cards = [{p, v}] 놓은 순서대로, rule = {p, r} | null, def = {max, lim}
  // → { lim, max, low, val[], gone[], reg[], sum, order[] }  (val = 규칙 E 로 바뀐 숫자, gone = 규칙 F·G 로 버림, reg = 등록)
  function resolveSlot(cards, rule, def) {
    let lim = def.lim, max = def.max, low = false, first = -1;
    const val = cards.map(c => c.v), gone = cards.map(() => false), R = rule ? rule.r : "";
    if (R === "A") lim -= 3;
    else if (R === "B") lim += 3;
    else if (R === "C") max -= 1;
    else if (R === "D") low = true;
    else if (R === "E") { const i = val.indexOf(6); if (i >= 0) val[i] = 1; }
    else if (R === "F") { if (cards.length) gone[0] = true; }
    else if (R === "G") { const i = val.indexOf(6); if (i >= 0) gone[i] = true; }
    else if (R === "H") first = cards.findIndex(c => c.p === rule.p);
    const order = cards.map((_, i) => i).filter(i => !gone[i]);
    order.sort((a, b) => (low ? val[a] - val[b] : val[b] - val[a]) || a - b);
    if (first >= 0) { order.splice(order.indexOf(first), 1); order.unshift(first); }
    const reg = cards.map(() => false); let sum = 0, cnt = 0;
    for (const i of order) if (cnt < max && sum + val[i] <= lim) { reg[i] = true; sum += val[i]; cnt++; }
    return { lim, max, low, val, gone, reg, sum, cnt, order };
  }
  // 슬롯 하나의 규칙 카드들 → 적용될 한 장 (코인 많은 것 · 같으면 먼저 낸 것)
  function ruleWinner(rules) {
    let best = null;
    for (const x of rules) if (!best || x.c > best.c || (x.c === best.c && x.k < best.k)) best = x;
    return best;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed }) {
    n = clampN(n);
    const st = {
      n, rs: (seed >>> 0) || 1, R: ROUNDS, round: 0, phase: "", over: false,
      coins: Array(n).fill(COINS), hand: Array.from({ length: n }, () => [0, 2, 2, 2, 2, 2, 2]), used: Array.from({ length: n }, () => []),
      score: Array(n).fill(0), rsc: Array.from({ length: n }, () => []),
      bids: [], win: -1, ord: [], ti: 0, letters: [], ruleUsed: [], board: [], rules: [], k: 0, defs: [], res: null, hist: [],
      log: [], seq: 0,
    };
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.defs = slotsFor(st.n, st.round);
    st.bids = Array(st.n).fill(null); st.win = -1; st.ord = []; st.ti = 0;
    st.letters = Array(st.n).fill(null); st.ruleUsed = Array(st.n).fill(false);
    st.board = [[], [], [], []]; st.rules = [[], [], [], []]; st.res = null; st.phase = "bid";
    push(st, { k: "round", r: st.round });
  }
  const turnSeat = st => (st.ti < st.n ? st.ord[st.ti] : st.ord[2 * st.n - 1 - st.ti]);
  const cardsNow = st => (st.ti < st.n ? 1 : 2);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "bid") return st.bids.map((b, i) => (b == null ? i : -1)).filter(i => i >= 0);
    if (st.phase === "order") return [st.win];
    if (st.phase === "place") return [turnSeat(st)];
    return [];
  }
  function dealRules(st) {
    const L = shuffle(() => rnd(st), LETTERS.split(""));
    for (let i = 0; i < st.n; i++) st.letters[i] = L[i];
    st.phase = "place"; st.ti = 0;
  }

  function apply(st, seat, a) {
    if (!a || typeof a !== "object" || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "bid") {
      if (a.t !== "bid" || !Number.isInteger(a.c) || a.c < 0 || a.c > st.coins[seat]) return { ok: false, err: `코인 0~${st.coins[seat]}개 중에서 입찰해요` };
      st.bids[seat] = a.c;
      push(st, { k: "bid", s: seat });
      if (st.bids.every(b => b != null)) {
        for (let i = 0; i < st.n; i++) st.coins[i] -= st.bids[i];
        const top = Math.max(...st.bids);
        if (top <= 0) {
          st.ord = shuffle(() => rnd(st), Array.from({ length: st.n }, (_, i) => i));
          push(st, { k: "win", w: -1, ord: st.ord.slice() });
          dealRules(st);
        } else {
          const tied = st.bids.map((b, i) => (b === top ? i : -1)).filter(i => i >= 0);
          st.win = tied[Math.floor(rnd(st) * tied.length)];
          st.phase = "order";
          push(st, { k: "win", w: st.win });     // 입찰 동점이었는지는 남기지 않음 (입찰액 비공개)
        }
      }
      return { ok: true };
    }
    if (st.phase === "order") {
      const o = a.ord;
      if (a.t !== "order" || !Array.isArray(o) || o.length !== st.n || !o.every(x => Number.isInteger(x) && x >= 0 && x < st.n) || new Set(o).size !== st.n)
        return { ok: false, err: "모든 사람의 1차 제출 순서를 정해요" };
      st.ord = o.slice();
      push(st, { k: "order", w: seat, ord: st.ord.slice() });
      dealRules(st);
      return { ok: true };
    }
    if (st.phase === "place") {
      const need = cardsNow(st), cs = a.cards, h = st.hand[seat];
      if (a.t !== "place" || !Array.isArray(cs) || cs.length !== need) return { ok: false, err: `숫자 카드 ${need}장을 슬롯에 놓아요` };
      const cnt = [0, 0, 0, 0, 0, 0, 0], fill = st.board.map(b => b.length);
      for (const c of cs) {
        if (!c || !Number.isInteger(c.v) || c.v < 1 || c.v > 6 || !Number.isInteger(c.s) || c.s < 0 || c.s >= SLOTN) return { ok: false, err: "숫자 카드와 슬롯을 골라요" };
        if (++cnt[c.v] > h[c.v]) return { ok: false, err: `숫자 ${c.v} 카드가 없어요` };
        if (++fill[c.s] > st.defs[c.s].max) return { ok: false, err: `${SL[c.s]} 슬롯은 꽉 찼어요 (최대 ${st.defs[c.s].max}장)` };
      }
      const ru = a.rule || null;            // 규칙 카드 없음 = null · false · 빈 값
      if (ru != null) {
        if (!st.letters[seat] || st.ruleUsed[seat]) return { ok: false, err: "규칙 카드는 이번 라운드에 이미 냈어요" };
        if (!Number.isInteger(ru.s) || ru.s < 0 || ru.s >= SLOTN) return { ok: false, err: "규칙 카드를 놓을 슬롯을 골라요" };
        if (!Number.isInteger(ru.c) || ru.c < 1 || ru.c > st.coins[seat]) return { ok: false, err: `규칙 카드에는 코인 1~${st.coins[seat]}개를 같이 내요` };
      }
      for (const c of cs) { h[c.v]--; st.board[c.s].push({ p: seat, v: c.v, k: st.k++ }); }
      if (ru != null) { st.coins[seat] -= ru.c; st.ruleUsed[seat] = true; st.rules[ru.s].push({ p: seat, r: st.letters[seat], c: ru.c, k: st.k++ }); }
      push(st, { k: "place", s: seat, sl: cs.map(c => c.s), sec: st.ti < st.n ? 1 : 2 });
      if (++st.ti >= 2 * st.n) resolveRound(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 둘 수 없어요" };
  }

  function resolveRound(st) {
    const gain = Array(st.n).fill(0), slots = [];
    for (let s = 0; s < SLOTN; s++) {
      const cards = st.board[s], w = ruleWinner(st.rules[s]);
      const R = resolveSlot(cards, w ? { p: w.p, r: w.r } : null, st.defs[s]);
      cards.forEach((c, i) => { if (R.reg[i]) gain[c.p] += PTS[R.val[i]]; st.used[c.p].push(c.v); });
      slots.push({
        s, max: st.defs[s].max, lim: st.defs[s].lim, effLim: R.lim, effMax: R.max, low: R.low,
        rule: w ? { p: w.p, r: w.r } : null, lost: st.rules[s].length - (w ? 1 : 0),
        cards: cards.map((c, i) => ({ p: c.p, v: c.v, val: R.val[i], reg: R.reg[i], gone: R.gone[i], pts: R.reg[i] ? PTS[R.val[i]] : 0 })), sum: R.sum,
      });
    }
    for (let i = 0; i < st.n; i++) { st.score[i] += gain[i]; st.rsc[i].push(gain[i]); }
    const rec = { r: st.round, gain, slots, ord: st.ord.slice(), win: st.win };
    st.hist.push(rec); st.res = rec;
    push(st, { k: "reveal", r: st.round, gain: gain.slice() });
    if (st.round >= st.R) { st.over = true; st.phase = "end"; push(st, { k: "end" }); }
    else st.phase = "show";
  }
  const auto = st => (st.phase === "show" && !st.over ? 6500 : null);
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  function ranks(st) {
    const above = (a, b) => (st.score[a] !== st.score[b] ? st.score[a] > st.score[b] : st.coins[a] > st.coins[b]);
    return st.score.map((_, i) => st.score.filter((_, j) => above(j, i)).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "bid") return [{ t: "bid", c: 0 }];
    if (st.phase === "order") return [{ t: "order", ord: Array.from({ length: st.n }, (_, i) => i) }];
    if (st.phase === "place") {
      const h = st.hand[seat], L = [], free = st.defs.map((d, s) => d.max - st.board[s].length);
      if (cardsNow(st) === 1) { for (let v = 1; v <= 6; v++) if (h[v]) for (let s = 0; s < SLOTN; s++) if (free[s] > 0) L.push({ t: "place", cards: [{ v, s }], rule: null }); }
      else for (const x of pairs(h, free)) L.push({ t: "place", cards: x, rule: null });
      return L;
    }
    return [];
  }
  // 2장 고르기 후보 (숫자 · 슬롯 짝, 순서 없이) — h = 숫자별 장수, free = 슬롯별 빈 칸
  function pairs(h, free) {
    const one = [];
    for (let v = 6; v >= 1; v--) if (h[v]) for (let s = 0; s < SLOTN; s++) if (free[s] > 0) one.push({ v, s });
    const out = [];
    for (let i = 0; i < one.length; i++) for (let j = i; j < one.length; j++) {
      const a = one[i], b = one[j];
      if (a.v === b.v && h[a.v] < 2) continue;
      if (a.s === b.s && free[a.s] < 2) continue;
      out.push([{ v: a.v, s: a.s }, { v: b.v, s: b.s }]);
    }
    return out;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1;
    const open = st.phase === "show" || st.over;
    const board = st.board.map(b => b.map(c => ({ p: c.p, v: all || open || c.p === me ? c.v : null })));
    const myRule = me >= 0 ? (() => { for (let s = 0; s < SLOTN; s++) for (const x of st.rules[s]) if (x.p === me) return { s, c: x.c, r: x.r }; return null; })() : null;
    const rulesAll = all ? st.rules.map(rs => rs.map(x => ({ p: x.p, r: x.r, c: x.c }))) : null;
    const placed = Array(st.n).fill(0); for (const b of st.board) for (const c of b) placed[c.p]++;
    // 남이 아직 안 낸(또는 이번 라운드에 뒷면으로 낸) 카드 — 공개된 숫자를 12장에서 뺀 것 (누구나 셀 수 있음)
    const left = st.used.map(u => { const c = [0, 2, 2, 2, 2, 2, 2]; for (const v of u) c[v]--; return c; });
    const turn = st.phase === "place" && !st.over ? turnSeat(st) : st.phase === "order" ? st.win : -1;
    const hist = st.hist.map(h => ({ r: h.r, gain: h.gain.slice(), ord: h.ord.slice(), win: h.win, slots: h.slots.map(x => ({ ...x, rule: x.rule ? { ...x.rule } : null, cards: x.cards.map(c => ({ ...c })) })) }));
    const pubObj = { r: st.round, p: st.phase, b: board.map(x => x.map(c => [c.p, open ? c.v : 0])), bd: st.bids.map(b => b != null), w: st.win, o: st.ord, t: st.ti, sc: st.score, h: st.hist.length, ov: st.over, u: st.used };
    const v = {
      n: st.n, R: st.R, round: st.round, phase: st.phase, over: st.over,
      // 그 라운드 슬롯 표는 1차 제출이 시작될 때 공개 (방송: 게임판 구성은 미리 알리지 않고 1차 숫자 카드 제출 때 확인) — 입찰 · 순서 정하기 동안은 null
      defs: all || (st.phase !== "bid" && st.phase !== "order") ? st.defs.map(d => ({ ...d })) : null,
      board, placed, left, turn, ti: st.ti, sec: st.phase === "place" ? (st.ti < st.n ? 1 : 2) : 0, need: st.phase === "place" ? cardsNow(st) : 0,
      bidDone: st.bids.map(b => b != null), myBid: me >= 0 ? st.bids[me] : null, win: st.win, ord: st.ord.slice(),
      hand: me >= 0 ? st.hand[me].slice() : null, coins: st.coins.map((c, i) => (all || i === me || st.over ? c : null)),
      letter: me >= 0 ? st.letters[me] : null, ruleUsed: me >= 0 ? st.ruleUsed[me] : null, myRule,
      letters: all ? st.letters.slice() : null, rulesAll, hands: all ? st.hand.map(h => h.slice()) : null, bids: all ? st.bids.slice() : null,
      used: st.used.map(u => u.slice()), score: st.score.slice(), rsc: st.rsc.map(x => x.slice()),
      res: open && st.res ? hist[hist.length - 1] : null, hist,
      needs: needs(st), ranks: st.over ? ranks(st) : null, log: st.log.slice(-80), seat, pub: hash(JSON.stringify(pubObj)),
    };
    // 깊은 복사: 화면 · 선생님 · AI가 V 를 건드려도 판 상태는 그대로 (복기 · 친구랑이 어긋나지 않게)
    return JSON.parse(JSON.stringify(v));
  }

  // ── AI (보이는 것만) ─────────────────────────────────────────
  const pickRand = (r, arr) => arr[Math.floor(r() * arr.length)];
  const expand = c => { const o = []; for (let v = 1; v <= 6; v++) for (let k = 0; k < c[v]; k++) o.push(v); return o; };
  const COIN_COST = [0, 0.3, 0.22, 0.06];              // 라운드별 코인 1개의 값 (뒤 라운드 규칙 카드 · 동점)
  // 표본 S 개: 남이 뒷면으로 낸 카드의 숫자 · 앞으로 낼 카드(남은 숫자 · 슬롯 고르는 난수) · 남의 규칙 카드 (반쯤은 이번에 씀)
  function makeSamples(V, me, S, r, fit) {
    const n = V.n, smp = [], my = expand(V.hand), turns = [];
    for (let t = V.ti + 1; t < 2 * n; t++) turns.push({ p: t < n ? V.ord[t] : V.ord[2 * n - 1 - t], k: t < n ? 1 : 2 });
    const others = []; for (let j = 0; j < n; j++) if (j !== me) others.push(j);
    const freeLet = LETTERS.split("").filter(x => x !== V.letter);
    for (let q = 0; q < S; q++) {
      const bags = [], ptr = Array(n).fill(0);
      for (const j of others) bags[j] = shuffle(r, expand(V.left[j]));
      const fill = V.board.map(b => b.map(c => (c.v != null ? c.v : bags[c.p][ptr[c.p]++] || 1))), owner = V.board.map(b => b.map(c => c.p));
      const fut = [];
      for (const T of turns) for (let k = 0; k < T.k; k++) fut.push({ p: T.p, v: T.p === me ? -1 : bags[T.p][ptr[T.p]++] || 1, u: r() });
      const myOrder = shuffle(r, my.slice());
      const lets = shuffle(r, freeLet.slice()), orule = [];
      others.forEach((j, x) => { if (r() < 0.5) orule.push({ p: j, r: lets[x % lets.length], c: 1 + Math.floor(r() * 7), u: r() }); });
      smp.push({ fill, owner, fut, myOrder, orule, fit: fit || 1 });
    }
    return smp;
  }
  // 빠른 등록 (표본용, resolveSlot 과 같은 규칙) — 결과는 VAL · REG 에
  const ORD = new Int32Array(24), VAL = new Int32Array(24), REG = new Uint8Array(24);
  function fastSlot(ps, vs, len, rr, rp, def) {
    let lim = def.lim, max = def.max, low = false, first = -1, gone = -1;
    for (let i = 0; i < len; i++) { VAL[i] = vs[i]; REG[i] = 0; }
    if (rr === "A") lim -= 3;
    else if (rr === "B") lim += 3;
    else if (rr === "C") max--;
    else if (rr === "D") low = true;
    else if (rr === "E") { for (let i = 0; i < len; i++) if (VAL[i] === 6) { VAL[i] = 1; break; } }
    else if (rr === "F") { if (len) gone = 0; }
    else if (rr === "G") { for (let i = 0; i < len; i++) if (VAL[i] === 6) { gone = i; break; } }
    else if (rr === "H") { for (let i = 0; i < len; i++) if (ps[i] === rp) { first = i; break; } }
    let m = 0;
    if (first >= 0) ORD[m++] = first;
    const st0 = m;
    for (let i = 0; i < len; i++) {
      if (i === gone || i === first) continue;
      let j = m++;
      while (j > st0 && (low ? VAL[ORD[j - 1]] > VAL[i] : VAL[ORD[j - 1]] < VAL[i])) { ORD[j] = ORD[j - 1]; j--; }
      ORD[j] = i;
    }
    let sum = 0, cnt = 0;
    for (let k = 0; k < m; k++) { const i = ORD[k]; if (cnt < max && sum + VAL[i] <= lim) { REG[i] = 1; sum += VAL[i]; cnt++; } }
  }
  const PS = [0, 1, 2, 3].map(() => new Int32Array(24)), VS = [0, 1, 2, 3].map(() => new Int32Array(24)), LEN = new Int32Array(4), FREE = new Int32Array(4), MYIDX = new Int32Array(4);
  const WR = ["", "", "", ""], WP = [-1, -1, -1, -1], WC = [0, 0, 0, 0], SKIP = new Int32Array(7), SUM = new Int32Array(4), WT = new Float64Array(4);
  // 표본 하나에서 내 행동 act → 내 점수 (hit[c] += 이번에 낸 c번째 카드가 등록됐으면 1)
  function simulate(V, me, sm, act, hit) {
    for (let s = 0; s < SLOTN; s++) { const f = sm.fill[s], o = sm.owner[s]; LEN[s] = f.length; for (let i = 0; i < f.length; i++) { PS[s][i] = o[i]; VS[s][i] = f[i]; } FREE[s] = V.defs[s].max - f.length; }
    const cards = act.cards;
    SKIP.fill(0);
    for (let c = 0; c < cards.length; c++) { const s = cards[c].s, i = LEN[s]++; PS[s][i] = me; VS[s][i] = cards[c].v; FREE[s]--; MYIDX[c] = s * 32 + i; SKIP[cards[c].v]++; }
    let mi = 0;
    for (let s = 0; s < SLOTN; s++) { let t = 0; for (let i = 0; i < LEN[s]; i++) t += VS[s][i]; SUM[s] = t; }
    for (const f of sm.fut) {
      let v = f.v;
      if (v < 0) { v = 1; while (mi < sm.myOrder.length) { const x = sm.myOrder[mi++]; if (SKIP[x] > 0) { SKIP[x]--; continue; } v = x; break; } }
      // 슬롯 고르기: 빈 칸 수만큼 (fit > 1이면 LIMIT 안에 들어갈 것 같은 슬롯을 그만큼 더 고름 — 사람처럼)
      let tot = 0;
      for (let s = 0; s < SLOTN; s++) { WT[s] = FREE[s] > 0 ? FREE[s] * (SUM[s] + v <= V.defs[s].lim ? sm.fit : 1) : 0; tot += WT[s]; }
      if (tot <= 0) break;
      let x = f.u * tot, s = 0;
      for (; s < SLOTN; s++) { if (WT[s] <= 0) continue; if (x < WT[s]) break; x -= WT[s]; }
      if (s >= SLOTN) { s = SLOTN - 1; while (s > 0 && FREE[s] <= 0) s--; }
      const i = LEN[s]++; PS[s][i] = f.p; VS[s][i] = v; FREE[s]--; SUM[s] += v;
    }
    for (let s = 0; s < SLOTN; s++) { WR[s] = ""; WP[s] = -1; WC[s] = 0; }
    for (const o of sm.orule) {
      let cnt = 0;
      for (let s = 0; s < SLOTN; s++) { let has = false; for (let i = 0; i < LEN[s]; i++) if (PS[s][i] === o.p) { has = true; break; } if (has) cnt++; }
      if (!cnt) continue;
      let pick = Math.floor(o.u * cnt), s = 0;
      for (; s < SLOTN; s++) { let has = false; for (let i = 0; i < LEN[s]; i++) if (PS[s][i] === o.p) { has = true; break; } if (has) { if (pick === 0) break; pick--; } }
      if (s < SLOTN && o.c > WC[s]) { WC[s] = o.c; WR[s] = o.r; WP[s] = o.p; }
    }
    const mr = act.rule ? { s: act.rule.s, c: act.rule.c, r: V.letter } : V.myRule;
    if (mr && mr.c > WC[mr.s]) { WC[mr.s] = mr.c; WR[mr.s] = mr.r; WP[mr.s] = me; }
    let pts = 0;
    for (let s = 0; s < SLOTN; s++) {
      fastSlot(PS[s], VS[s], LEN[s], WR[s], WP[s], V.defs[s]);
      for (let i = 0; i < LEN[s]; i++) if (PS[s][i] === me && REG[i]) pts += PTS[VAL[i]];
      if (hit) for (let c = 0; c < cards.length; c++) if ((MYIDX[c] >> 5) === s && REG[MYIDX[c] & 31]) hit[c]++;
    }
    return pts;
  }
  // 행동들을 같은 표본으로 평가 → [{a, ev, pts, preg[]}]  (ev = 기대 점수 − 규칙 카드 코인 값)
  function evalActs(V, me, acts, S, r, fit) {
    const smp = makeSamples(V, me, S, r, fit), cost = COIN_COST[V.round] || 0.1;
    return acts.map(a => {
      let tot = 0; const hit = a.cards.map(() => 0);
      for (const sm of smp) tot += simulate(V, me, sm, a, hit);
      const pts = tot / smp.length;
      return { a, ev: pts - (a.rule ? a.rule.c * cost : 0), pts, preg: hit.map(x => x / smp.length) };
    });
  }
  function cardActs(V) {
    const h = V.hand, free = V.defs.map((d, s) => d.max - V.board[s].length), L = [];
    if (V.need === 1) { for (let v = 6; v >= 1; v--) if (h[v]) for (let s = 0; s < SLOTN; s++) if (free[s] > 0) L.push({ t: "place", cards: [{ v, s }], rule: null }); }
    else for (const x of pairs(h, free)) L.push({ t: "place", cards: x, rule: null });
    return L;
  }
  const S_HARD = 48, S_NORM = 4, FIT = 10;   // 고급의 남 수 예측: LIMIT 안에 들어갈 슬롯을 10배 더 고른다고 봄 (1 = 아무 데나 · 벤치에서 중급 상대 69→71%)
  // 규칙 카드에 낼 코인 후보 (뒤 라운드일수록 많이)
  function coinOpts(V, me) {
    const c = V.coins[me] | 0; if (c <= 0) return [];
    const base = V.round === 3 ? [c, Math.ceil(c / 2)] : V.round === 2 ? [Math.ceil(c / 2), Math.round(c / 4)] : [Math.round(c / 3), Math.round(c / 6)];
    return [...new Set(base.map(x => Math.max(1, Math.min(c, x))))];
  }
  // 고급: 카드 후보 전부 → 위 3개에 규칙 카드(슬롯 4 × 코인 후보)를 붙인 것과 같은 표본에서 비교 → 가장 좋은 것
  function hardPick(V, me, r) {
    const L = evalActs(V, me, cardActs(V), S_HARD, r, FIT).sort((x, y) => y.ev - x.ev);
    let best = L[0], ruled = null;
    if (V.letter && !V.ruleUsed && (V.coins[me] | 0) > 0) {
      const top = L.slice(0, 3).map(t => t.a), vars = [];
      for (const a of top) for (let s = 0; s < SLOTN; s++) for (const c of coinOpts(V, me)) vars.push({ t: "place", cards: a.cards, rule: { s, c } });
      const E = evalActs(V, me, top.concat(vars), S_HARD, r, FIT);
      const base = E.slice(0, top.length).reduce((x, y) => (y.ev > x.ev ? y : x));
      const rb = E.slice(top.length).reduce((x, y) => (y.ev > x.ev ? y : x));
      const need = V.sec === 1 ? 1.2 : 0.25;          // 1차에선 나중에 정보가 더 많아 웬만하면 아껴 둠
      if (rb.ev > base.ev + need) { best = rb; ruled = { gain: rb.ev - base.ev, base }; }
    }
    return { a: { t: "place", cards: best.a.cards.map(c => ({ v: c.v, s: c.s })), rule: best.a.rule ? { s: best.a.rule.s, c: best.a.rule.c } : null }, L, best, ruled };
  }
  function bidPick(V, me, tier, r) {
    const c = V.coins[me] | 0;
    if (tier === "easy") return r() < 0.45 ? Math.min(c, 1 + Math.floor(r() * 3)) : 0;
    if (tier === "normal") return r() < 0.25 ? Math.min(c, 1 + Math.floor(r() * 2)) : 0;
    return 0;                                        // 고급: 순서 결정권에 코인을 안 씀 (규칙 카드에 쓰는 편이 점수에 더 남 — 벤치)
  }
  // 순서 정하기: 나는 POS 자리(1차 순서 중), 나머지는 섞음
  function orderPick(V, me, tier, r) {
    const n = V.n, rest = shuffle(r, Array.from({ length: n }, (_, i) => i).filter(i => i !== me));
    // 자리 시험 (고급 1 + 중급, 160판): 8명은 6번째(+1.5), 4명은 3~4번째가 가장 좋음 → 순서의 약 70% 지점
    const pos = tier === "easy" ? Math.floor(r() * n) : Math.max(0, Math.round(n * 0.7) - 1);
    rest.splice(pos, 0, me);
    return rest;
  }
  function ai(V, me, tier, r) {
    if (V.phase === "bid") return { t: "bid", c: bidPick(V, me, tier, r) };
    if (V.phase === "order") return { t: "order", ord: orderPick(V, me, tier, r) };
    if (V.phase !== "place") return null;
    if (tier === "hard") return hardPick(V, me, r).a;
    const acts = cardActs(V);
    if (tier === "easy") {
      const a = pickRand(r, acts);
      const rule = V.letter && !V.ruleUsed && V.coins[me] > 0 && r() < (V.sec === 2 ? 0.45 : 0.15) ? { s: Math.floor(r() * SLOTN), c: Math.min(V.coins[me], 1 + Math.floor(r() * 4)) } : null;
      return { t: "place", cards: a.cards.map(c => ({ v: c.v, s: c.s })), rule };
    }
    // 중급: 적은 표본으로 카드만 재고 위 세 개 중 하나 · 규칙 카드는 2차 때 내 카드가 있는 슬롯에
    const L = evalActs(V, me, acts.length > 60 ? shuffle(r, acts.slice()).slice(0, 60) : acts, S_NORM, r).sort((x, y) => y.ev - x.ev);
    const a = L[Math.min(L.length - 1, Math.floor(r() * Math.min(3, L.length)))].a;
    let rule = null;
    if (V.letter && !V.ruleUsed && V.coins[me] > 0 && V.sec === 2 && r() < 0.6) rule = { s: a.cards[0].s, c: Math.min(V.coins[me], 2 + Math.floor(r() * 4)) };
    return { t: "place", cards: a.cards.map(c => ({ v: c.v, s: c.s })), rule };
  }

  // 💡 추천 = 고급 AI의 수 그대로 (보이는 것으로 정한 고정 난수)
  const recRnd = (V, me) => { let a = parseInt(hash(JSON.stringify([V.round, V.phase, V.ti, V.board, V.hand, V.letter, V.myRule, V.coins[me], me])), 36) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  function recommend(V, me) {
    const r = recRnd(V, me);
    if (V.phase === "place") { const H = hardPick(V, me, r); return H; }
    return { a: ai(V, me, "hard", r) };
  }

  return {
    id: "cutline", ROUNDS, COINS, BASE, PTS, LETTERS, RULE_TXT, SL,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, recommend, recRnd,
    slotsFor, resolveSlot, ruleWinner, evalActs, cardActs, hardPick, pairs, FIT,
  };
});

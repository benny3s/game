/* 베니 서바이벌 · 보석 암시장 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 3일차 메인 매치 '보석 암시장' (나무위키 '룰' 절 + 방송 해설 영상 두 편 대조 — 숫자 · 순서는 방송 그대로)
   · 카드 13장: 다이아 5·6 / 금 4·5 / 은 2·3·4 / 동 1·1·2·2 + 폭탄 −6 · −4. 3라운드.
   · 라운드마다 카드를 새로 섞어 사람마다 1장(뒷면) · 판 가운데에 구매자 칸 3개(뒷면) + 휴지통 1칸. 남는 카드는 버림. 내 카드는 처음 한 번, 그 뒤엔 내 차례에만 볼 수 있음.
   · 교환 = 내 차례에 내 카드를 (다른 사람 카드 | 구매자 칸 카드 | 휴지통 카드) 와 맞바꿈 — 꼭 해야 함. 내 카드가 폭탄이면 구매자 칸 · 휴지통에는 못 넣고 사람과만 바꿈.
     순서: 선부터 한 바퀴 정순(1번째 → 마지막), 이어서 한 바퀴 역순 → 선은 첫 교환과 마지막 교환을 모두 함, 맨 끝 자리는 연달아 두 번.
   · 누가 내 폭탄을 가져가면(그 사람이 나와 교환하면서 내 폭탄을 받으면) 나는 그 자리에서 +3점.
   · 라운드 끝 정산: 내 보석 종류와 같은 구매자 칸마다 (카드 숫자) 점수 (같은 종류 구매자가 2칸이면 2배) · 폭탄을 들고 있으면 그 숫자만큼 −점. 점수는 라운드가 끝나야 공개.
   · 다음 라운드 선 = −6 폭탄을 든 사람 > −4 폭탄을 든 사람 > 그대로.
   · 마니또: 사람들이 한 바퀴로 이어져 있고 각자 마니또가 한 명씩 있음. 내 최종 점수 = 내 점수 × 내 마니또의 점수. 나는 '내가 누구의 마니또인지'만 앎. 최종 점수가 높은 순서가 순위.
   우리가 정한 것: ① 4~9명 (방송 9명 · 모자라는 자리는 AI · 카드가 남으면 버림) ② 피스가 없어 구매자 · 휴지통 카드 몰래 보기는 게임 중 한 번 공짜 ③ 3분 제한 · 대화 없음 ④ 첫 선은 무작위
     ⑤ 최종 점수가 같으면 내 점수가 높은 쪽 → 그래도 같으면 공동 순위 ⑥ 교환 때 내가 받은 카드는 바로 보지 못하고 내 다음 차례 시작 때 봄 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).gemmarket = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CARDS = [
    { k: "d", v: 5 }, { k: "d", v: 6 }, { k: "g", v: 4 }, { k: "g", v: 5 }, { k: "s", v: 2 }, { k: "s", v: 3 }, { k: "s", v: 4 },
    { k: "c", v: 1 }, { k: "c", v: 1 }, { k: "c", v: 2 }, { k: "c", v: 2 }, { k: "b", v: -6 }, { k: "b", v: -4 },
  ];
  const KN = { d: "다이아", g: "금", s: "은", c: "동", b: "폭탄" };
  const ROUNDS = 3, MINN = 4, MAXN = 9, STEAL = 3;
  // 교환 대상 번호: 0~2 = 구매자 칸, 3 = 휴지통, 4+p = p번 사람
  const TO_TRASH = 3, TO_P = 4;
  const SUMV = a => a.reduce((x, y) => x + y, 0);
  const isBomb = c => CARDS[c].k === "b";

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(st, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 정산 (카드 배치 → 사람마다 이번 라운드 점수). buyers = 구매자 칸 카드의 종류별 개수
  function buyerCount(slots) { const b = { d: 0, g: 0, s: 0, c: 0 }; for (const c of slots) { const k = CARDS[c].k; if (k !== "b") b[k]++; } return b; }
  function gainOf(card, buyers) { const C = CARDS[card]; return C.k === "b" ? C.v : C.v * buyers[C.k]; }

  // ── 판 만들기 ───────────────────────────────────────────────
  function init({ n, seed }) {
    n = Math.max(MINN, Math.min(MAXN, n | 0));
    const st = {
      n, rs: (seed >>> 0) || 1, round: 1, phase: "swap", step: 0, over: false, seq: 0, log: [],
      score: Array(n).fill(0), peeked: Array(n).fill(false), hist: [], final: null, res: null, lead: 0, manito: [],
    };
    st.lead = Math.floor(rnd(st) * n);
    const order = shuffle(st, Array.from({ length: n }, (_, i) => i));        // 사람들을 한 바퀴로 이음: order[k] 의 마니또 = order[k+1]
    st.manito = Array(n).fill(0);
    order.forEach((p, k) => { st.manito[p] = order[(k + 1) % n]; });
    startRound(st);
    return st;
  }
  function startRound(st) {
    const n = st.n, deck = shuffle(st, Array.from({ length: CARDS.length }, (_, i) => i));
    st.hands = deck.slice(0, n); st.slots = deck.slice(n, n + 3); st.trash = deck[n + 3]; st.out = deck.slice(n + 4);
    const fwd = Array.from({ length: n }, (_, k) => (st.lead + k) % n);
    st.order = fwd.concat(fwd.slice().reverse());
    st.step = 0; st.swaps = []; st.bonus = Array(n).fill(0); st.res = null; st.phase = "swap";
    st.kn = Array.from({ length: n }, (_, i) => [{ st: -1, k: "see", c: st.hands[i] }]);
    beginTurn(st);
    push(st, { k: "round", r: st.round, lead: st.lead });
  }
  function beginTurn(st) { const s = st.order[st.step]; st.kn[s].push({ st: st.step, k: "see", c: st.hands[s] }); }

  const needs = st => (st.over || st.phase !== "swap" ? [] : [st.order[st.step]]);
  function checkTo(st, seat, to) {
    if (!Number.isInteger(to) || to < 0 || to >= TO_P + st.n) return "교환할 곳을 골라요";
    if (to >= TO_P && to - TO_P === seat) return "나와는 바꿀 수 없어요";
    if (isBomb(st.hands[seat]) && to < TO_P) return "폭탄은 구매자 칸 · 휴지통에 못 넣어요 — 사람과 바꿔야 해요";
    return null;
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a.t === "peek") {
      if (st.peeked[seat]) return { ok: false, err: "몰래 보기는 게임 중 한 번뿐이에요" };
      if (!Number.isInteger(a.loc) || a.loc < 0 || a.loc > 3) return { ok: false, err: "구매자 칸이나 휴지통을 골라요" };
      const c = a.loc < 3 ? st.slots[a.loc] : st.trash;
      st.peeked[seat] = true; st.kn[seat].push({ st: st.step, k: "peek", loc: a.loc, c });
      push(st, { k: "peek", s: seat });
      return { ok: true };
    }
    if (a.t !== "swap") return { ok: false, err: "교환할 곳을 골라요" };
    const err = checkTo(st, seat, a.to);
    if (err) return { ok: false, err };
    const mine = st.hands[seat], to = a.to; let other;
    if (to < 3) { other = st.slots[to]; st.slots[to] = mine; }
    else if (to === TO_TRASH) { other = st.trash; st.trash = mine; }
    else { const p = to - TO_P; other = st.hands[p]; st.hands[p] = mine; if (isBomb(other)) st.bonus[p] += STEAL; }
    st.hands[seat] = other;
    st.swaps.push({ step: st.step, s: seat, to });
    push(st, { k: "swap", s: seat, to, n: st.step });
    st.step++;
    if (st.step >= st.order.length) resolve(st); else beginTurn(st);
    return { ok: true };
  }
  function resolve(st) {
    const buyers = buyerCount(st.slots);
    const base = st.hands.map(c => gainOf(c, buyers)), gains = base.map((g, i) => g + st.bonus[i]);
    gains.forEach((g, i) => { st.score[i] += g; });
    st.res = { r: st.round, hands: st.hands.slice(), slots: st.slots.slice(), trash: st.trash, out: st.out.slice(), buyers, base, bonus: st.bonus.slice(), gains, lead: st.lead, swaps: st.swaps.map(x => ({ ...x })) };
    st.hist.push(st.res);
    st.phase = "show";
    push(st, { k: "res", r: st.round, gains: gains.slice() });
  }
  function nextLead(st) {
    const h6 = st.hands.indexOf(11), h4 = st.hands.indexOf(12);
    return h6 >= 0 ? h6 : h4 >= 0 ? h4 : st.lead;
  }
  function finish(st) {
    const n = st.n, fin = st.score.map((s, i) => s * st.score[st.manito[i]]);
    const better = (a, b) => (fin[a] !== fin[b] ? fin[a] > fin[b] : st.score[a] > st.score[b]);
    const ranks = fin.map((_, i) => { let r = 0; for (let j = 0; j < n; j++) if (j !== i && better(j, i)) r++; return r; });
    st.final = { fin, ranks, score: st.score.slice(), manito: st.manito.slice() };
    st.over = true; st.phase = "end";
    push(st, { k: "end" });
  }
  const auto = st => (st.phase === "show" ? 6500 : null);
  function advance(st) {
    if (st.phase !== "show") return;
    if (st.round >= ROUNDS) { finish(st); return; }
    st.lead = nextLead(st); st.round++; startRound(st);
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : Array(st.n).fill(0));
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const L = [];
    for (let to = 0; to < TO_P + st.n; to++) if (!checkTo(st, seat, to)) L.push({ t: "swap", to });
    return L;
  }

  // ── 보이는 것 ───────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = all ? -1 : seat, turn = st.phase === "swap" ? st.order[st.step] : -1;
    const lastSee = me >= 0 ? [...st.kn[me]].reverse().find(e => e.k === "see") : null;
    const V = {
      n: st.n, round: st.round, rounds: ROUNDS, phase: st.phase, step: st.step, total: st.order.length, order: st.order.slice(), turn, lead: st.lead,
      score: st.score.slice(), swaps: st.swaps.map(x => ({ ...x })),
      mine: me >= 0 && turn === me ? st.hands[me] : null,
      bombLock: me >= 0 && turn === me ? isBomb(st.hands[me]) : false,
      seen: lastSee ? { c: lastSee.c, st: lastSee.st } : null,
      kn: me >= 0 ? st.kn[me].map(e => ({ ...e })) : [],
      peeked: me >= 0 ? st.peeked[me] : false, forWho: me >= 0 ? st.manito.indexOf(me) : -1,
      outN: st.out.length,
      hist: st.hist.map(h => ({ ...h, hands: h.hands.slice(), slots: h.slots.slice(), out: h.out.slice(), buyers: { ...h.buyers }, base: h.base.slice(), bonus: h.bonus.slice(), gains: h.gains.slice(), swaps: h.swaps.map(x => ({ ...x })) })),
      res: (st.phase === "show" || st.over) && st.res ? JSON.parse(JSON.stringify(st.res)) : null,
      needs: needs(st), over: st.over,
      final: st.final ? { fin: st.final.fin.slice(), ranks: st.final.ranks.slice(), score: st.final.score.slice(), manito: st.final.manito.slice() } : null,
      ranks: st.final ? st.final.ranks.slice() : null,
      log: st.log.slice(-60), seat,
    };
    V.pub = hash(JSON.stringify({ r: st.round, p: st.phase, s: st.step, sw: st.swaps.length, sc: st.score, o: st.over }));
    if (all) V.sec = { hands: st.hands.slice(), slots: st.slots.slice(), trash: st.trash, out: st.out.slice(), manito: st.manito.slice(), bonus: st.bonus.slice(), peeked: st.peeked.slice(), kn: st.kn.map(a => a.map(e => ({ ...e }))) };
    return V;
  }

  // ── AI (보이는 것만) ────────────────────────────────────────
  // 내가 본 것 + 누가 누구와 바꿨는지(공개)로 '있을 수 있는 카드 배치'를 뽑아, 각 교환을 끝까지 돌려 내 기대 점수를 잼 (남은 사람은 아무 데나 바꾼다고 가정)
  function samples(V, me, S, r) {
    const n = V.n, NP = CARDS.length, LOC = i => i;           // 위치: 0..n-1 사람 · n..n+2 구매자 · n+3 휴지통 · 그 뒤 버린 카드
    const cur = Array.from({ length: NP }, (_, i) => i);      // 지금 위치 → 처음(나눠 줄 때) 위치
    const fixed = new Map(), noBomb = [];
    const ev = V.kn.slice().sort((a, b) => a.st - b.st);
    let ei = 0;
    const resolveEv = t => {
      while (ei < ev.length && ev[ei].st <= t) {
        const e = ev[ei++];
        if (e.k === "see") fixed.set(cur[me], e.c);
        else if (e.k === "peek") fixed.set(cur[n + (e.loc < 3 ? e.loc : 3)], e.c);
      }
    };
    for (const sw of V.swaps) {
      resolveEv(sw.step);
      const a = sw.s, b = sw.to < 3 ? n + sw.to : sw.to === TO_TRASH ? n + 3 : sw.to - TO_P;
      if (sw.to < TO_P) noBomb.push(cur[a]);
      [cur[a], cur[b]] = [cur[b], cur[a]];
    }
    resolveEv(1e9);
    const used = new Set(), A0 = Array(NP).fill(-1);
    for (const [pos, c] of fixed) {
      let id = -1;
      for (let k = 0; k < NP; k++) if (!used.has(k) && CARDS[k].k === CARDS[c].k && CARDS[k].v === CARDS[c].v) { id = k; break; }
      if (id < 0 || A0[pos] >= 0) continue;
      used.add(id); A0[pos] = id;
    }
    const free = [], pool = [];
    for (let p = 0; p < NP; p++) if (A0[p] < 0) free.push(p);
    for (let k = 0; k < NP; k++) if (!used.has(k)) pool.push(k);
    const out = [];
    for (let t = 0, tries = 0; out.length < S && tries < S * 6; tries++) {
      const pl = pool.slice();
      for (let i = pl.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pl[i], pl[j]] = [pl[j], pl[i]]; }
      const A = A0.slice(); free.forEach((p, i) => { A[p] = pl[i]; });
      if (noBomb.some(p => isBomb(A[p]))) continue;
      // 공개된 교환을 처음부터 다시 돌려 지금 배치와 +3 을 구함
      const hands = A.slice(0, n), slots = A.slice(n, n + 3); let trash = A[n + 3]; const bonus = Array(n).fill(0);
      for (const sw of V.swaps) {
        const mine = hands[sw.s]; let other;
        if (sw.to < 3) { other = slots[sw.to]; slots[sw.to] = mine; } else if (sw.to === TO_TRASH) { other = trash; trash = mine; }
        else { const p = sw.to - TO_P; other = hands[p]; hands[p] = mine; if (isBomb(other)) bonus[p] += STEAL; }
        hands[sw.s] = other;
      }
      out.push({ hands, slots, trash, bonus }); t++;
    }
    return out;
  }
  // 남은 교환을 무작위로 끝까지 돌린 뒤 내 점수 (u = 미리 뽑아 둔 난수 — 후보끼리 같은 난수를 써서 비교가 흔들리지 않게)
  function rollout(L, V, me, firstTo, u) {
    const n = V.n, hands = L.hands.slice(), slots = L.slots.slice(), bonus = L.bonus.slice(); let trash = L.trash, ui = 0;
    for (let k = V.step; k < V.total; k++) {
      const s = V.order[k]; let to;
      if (k === V.step) to = firstTo;
      else {
        const lo = isBomb(hands[s]) ? TO_P : 0, hi = TO_P + n;                // 폭탄이면 사람만
        do { to = lo + Math.floor(u[ui++ % u.length] * (hi - lo)); } while (to === TO_P + s);
      }
      const mine = hands[s]; let other;
      if (to < 3) { other = slots[to]; slots[to] = mine; } else if (to === TO_TRASH) { other = trash; trash = mine; }
      else { const p = to - TO_P; other = hands[p]; hands[p] = mine; if (isBomb(other)) bonus[p] += STEAL; }
      hands[s] = other;
    }
    return gainOf(hands[me], buyerCount(slots)) + bonus[me];
  }
  function evalMoves(V, me, S, r) {
    const n = V.n, L = samples(V, me, S, r), myCard = V.mine;
    const cand = []; for (let to = 0; to < TO_P + n; to++) { if (to === TO_P + me) continue; if (myCard != null && isBomb(myCard) && to < TO_P) continue; cand.push(to); }
    const us = L.map(() => Array.from({ length: 64 }, () => r()));
    return cand.map(to => {
      let sum = 0; for (let i = 0; i < L.length; i++) sum += rollout(L[i], V, me, to, us[i]);
      return { to, ev: L.length ? sum / L.length : 0 };
    }).sort((a, b) => b.ev - a.ev || a.to - b.to);
  }
  // ── 고급: 최종 순위로 재는 평가 ──────────────────────────────────
  // 최종 점수 = 내 점수 × 마니또 점수 라서 내 점수만 올리는 것이 순위를 올리지 않을 수 있음 (마니또 점수가 음수면 반대 — 방송의 '마이너스 전략').
  // 보이는 것만 씀: 라운드 끝마다 공개되는 모두의 점수(V.score) · 내가 누구의 마니또인지(V.forWho) · 공개된 교환 기록.
  // 마니또는 한 바퀴로 이어져 있고 그 사람(forWho)의 마니또가 나이므로, 내 마니또는 '나 · 그 사람을 뺀 나머지' 중 한 명 (누군지는 몰라 → 같은 확률로 뽑아 봄).
  // 남은 교환 · 남은 라운드는 모두 무작위로 둔다고 보고 끝까지 돌려, 최종 순위에서 남을 이긴 몫(win)을 잼. 고르는 값 ev = win + 내 이번 라운드 점수 × RANK_PTS/10
  // (순위 지표만으로는 표본이 흔들려, 큰 인원에서 '내 점수 올리기' 쪽을 섞음 — 가중치 0.5 는 고급 vs 초급 6000판 벤치로 정함).
  const RANK_PTS = 0.5;
  function cycleSample(n, me, X, r) {
    const m = Array(n).fill(-1), others = [];
    for (let i = 0; i < n; i++) if (i !== me && i !== X) others.push(i);
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    m[X] = me; let prev = me; for (const o of others) { m[prev] = o; prev = o; } m[prev] = X;    // X → 나 → … → X (m[p] = p 점수에 곱해지는 사람)
    return m;
  }
  function futureGains(n, rounds, r) {                          // 남은 라운드를 모두 무작위로 둔다고 보고 사람마다 얻을 점수
    const f = Array(n).fill(0);
    for (let k = 0; k < rounds; k++) {
      const deck = Array.from({ length: CARDS.length }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      const hands = deck.slice(0, n), slots = deck.slice(n, n + 3), bonus = Array(n).fill(0); let trash = deck[n + 3];
      const lead = Math.floor(r() * n), fwd = Array.from({ length: n }, (_, i) => (lead + i) % n);
      for (const s of fwd.concat(fwd.slice().reverse())) {
        const lo = isBomb(hands[s]) ? TO_P : 0, hi = TO_P + n; let to;
        do { to = lo + Math.floor(r() * (hi - lo)); } while (to === TO_P + s);
        const mine = hands[s]; let other;
        if (to < 3) { other = slots[to]; slots[to] = mine; } else if (to === TO_TRASH) { other = trash; trash = mine; }
        else { const p = to - TO_P; other = hands[p]; hands[p] = mine; if (isBomb(other)) bonus[p] += STEAL; }
        hands[s] = other;
      }
      const b = buyerCount(slots); hands.forEach((c, i) => { f[i] += gainOf(c, b) + bonus[i]; });
    }
    return f;
  }
  function rolloutAll(L, V, firstTo, u) {                       // rollout 과 같되 사람마다 이번 라운드 점수를 돌려줌
    const n = V.n, hands = L.hands.slice(), slots = L.slots.slice(), bonus = L.bonus.slice(); let trash = L.trash, ui = 0;
    for (let k = V.step; k < V.total; k++) {
      const s = V.order[k]; let to;
      if (k === V.step) to = firstTo;
      else { const lo = isBomb(hands[s]) ? TO_P : 0, hi = TO_P + n; do { to = lo + Math.floor(u[ui++ % u.length] * (hi - lo)); } while (to === TO_P + s); }
      const mine = hands[s]; let other;
      if (to < 3) { other = slots[to]; slots[to] = mine; } else if (to === TO_TRASH) { other = trash; trash = mine; }
      else { const p = to - TO_P; other = hands[p]; hands[p] = mine; if (isBomb(other)) bonus[p] += STEAL; }
      hands[s] = other;
    }
    const b = buyerCount(slots); return hands.map((c, i) => gainOf(c, b) + bonus[i]);
  }
  // → [{ to, ev, win, pts }] ev 높은 순. win = 최종 순위로 남을 이길 몫(0~1) · pts = 이번 라운드 내 점수 기대값
  function evalRank(V, me, S, r) {
    if (!(V.forWho >= 0 && V.forWho < V.n) || V.forWho === me) return [];      // 구경 보기('all') 처럼 내 자리가 없으면 평가하지 않음 (ai 는 무작위 합법 수로 넘어감)
    const n = V.n, L = samples(V, me, S, r), myCard = V.mine, X = V.forWho, left = Math.max(0, V.rounds - V.round);
    const cand = []; for (let to = 0; to < TO_P + n; to++) { if (to === TO_P + me) continue; if (myCard != null && isBomb(myCard) && to < TO_P) continue; cand.push(to); }
    const us = L.map(() => Array.from({ length: 64 }, () => r()));
    const M = L.map(() => cycleSample(n, me, X, r)), F = L.map(() => futureGains(n, left, r));      // 후보끼리 같은 난수 · 같은 마니또 · 같은 남은 라운드 (비교가 흔들리지 않게)
    const k = L.length || 1;
    return cand.map(to => {
      let sum = 0, pts = 0;
      for (let i = 0; i < L.length; i++) {
        const G = rolloutAll(L[i], V, to, us[i]), tot = G.map((g, j) => V.score[j] + g + F[i][j]), fin = tot.map((t, j) => t * tot[M[i][j]]);
        let w = 0;
        for (let j = 0; j < n; j++) if (j !== me) w += fin[me] > fin[j] ? 1 : fin[me] < fin[j] ? 0 : tot[me] > tot[j] ? 1 : tot[me] < tot[j] ? 0 : 0.5;
        sum += w / (n - 1); pts += G[me];
      }
      const win = sum / k, p = pts / k;
      return { to, ev: win + RANK_PTS * p / 10, win, pts: p };
    }).sort((a, b) => b.ev - a.ev || a.to - b.to);
  }
  const TIER = { easy: 0, normal: 14, hard: 120 };
  function peekPick(V, me, r) {
    // 가장 모르는 칸 = 후보 배치 안에서 종류가 가장 고르게 나뉘는 구매자 칸
    const L = samples(V, me, 40, r), n = V.n; let best = 0, bs = -1;
    for (let k = 0; k < 3; k++) { const m = {}; L.forEach(x => { const kk = CARDS[x.slots[k]].k; m[kk] = (m[kk] || 0) + 1; }); let h = 0; for (const key in m) { const p = m[key] / (L.length || 1); h -= p * Math.log(p); } if (h > bs) { bs = h; best = k; } }
    void n; return best;
  }
  function ai(V, me, tier, r) {
    if (V.phase !== "swap" || !V.needs.includes(me)) return null;
    const bomb = V.mine != null && isBomb(V.mine), n = V.n;
    const randTo = () => { const c = []; for (let to = 0; to < TO_P + n; to++) if (to !== TO_P + me && !(bomb && to < TO_P)) c.push(to); return c[Math.floor(r() * c.length)]; };
    if (tier === "easy") return r() < 0.12 && !V.peeked ? { t: "peek", loc: Math.floor(r() * 4) } : { t: "swap", to: randTo() };
    if (!V.peeked && V.step < n && tier === "hard" && r() < 0.8) return { t: "peek", loc: peekPick(V, me, r) };
    if (tier === "normal" && r() < 0.15) return { t: "swap", to: randTo() };
    const S = TIER[tier] || TIER.normal, L = (tier === "hard" ? evalRank : evalMoves)(V, me, S, r);
    if (!L.length) return { t: "swap", to: randTo() };
    // 거의 같은 값이면 무작위로 (사람처럼 보이게 · 읽히지 않게) — 고급은 순위 몫(0~1) 단위라 문턱이 더 좁음
    const top = L.filter(x => x.ev >= L[0].ev - (tier === "hard" ? 0.002 : 0.12));
    return { t: "swap", to: top[Math.floor(r() * top.length)].to };
  }

  // ── AI 선생님 (보이는 것만) ────────────────────────────────────
  function toText(to, names, V) {
    const nm = i => (names && names[i]) || `${i + 1}번`;
    return to < 3 ? `구매자 ${to + 1}칸` : to === TO_TRASH ? "휴지통" : nm(to - TO_P);
  }
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    const nmr = i => (names && names[i]) || `${i + 1}번`;
    const cn = c => (c == null ? "?" : `${KN[CARDS[c].k]} ${Math.abs(CARDS[c].v)}${CARDS[c].k === "b" ? "(폭탄 " + CARDS[c].v + ")" : ""}`);
    if (V.over) { const f = V.final; if (me < 0) return { opp: "3라운드가 끝났어요.", mine: "", rec: "", why: "" }; return { opp: "3라운드가 끝났어요.", mine: `내 점수 ${f.score[me]} × 마니또 ${f.score[f.manito[me]]} = ${f.fin[me]} → ${V.ranks[me] + 1}등`, rec: "한 판 더 해 봐요!", why: "" }; }
    // 👀 상대 흐름
    const recent = V.swaps.slice(-3).map(x => `${nm(x.s)} ↔ ${esc(toText(x.to, names))}`);
    let opp = V.phase === "show" && V.res ? `라운드 결과 — 구매자 칸: ${V.res.slots.map(c => KN[CARDS[c].k]).join(" · ")}` : recent.length ? `최근 교환 · ${recent.join(" · ")} (카드 내용은 안 보여요)` : `이번 라운드 첫 교환이에요 · 선은 ${nm(V.lead)}`;
    if (V.phase === "swap" && V.swaps.length) opp += ` / 선 ${nm(V.lead)}`;
    // 📊 내 흐름
    const total = V.total, who = V.forWho >= 0 ? nm(V.forWho) : "";
    let mine = `${V.round}/${V.rounds}라운드 · 교환 ${Math.min(V.step + 1, total)}/${total}번째 · 지금 내 점수 ${V.score[me]}${who ? ` · 내 점수가 곱해지는 사람: ${who}` : ""}`;
    if (V.mine != null) mine += ` · 내 카드: ${cn(V.mine)}`;
    else if (V.seen) mine += ` · 마지막으로 본 내 카드: ${cn(V.seen.c)} (그 뒤 바뀌었을 수 있어요)`;
    let rec = "상대 차례를 기다려요", why = "";
    if (V.phase === "swap" && V.needs.includes(me)) {
      const r = (() => { let a = 4242 + V.round * 31 + V.step * 7 + me; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
      const L = evalRank(V, me, 120, r), best = L[0];
      if (best) {
        rec = `${esc(toText(best.to, names))} 와 교환`;
        const sg = x => (x >= 0 ? "+" : "") + x.toFixed(1);
        const top3 = L.slice(0, 3).map(x => `${esc(toText(x.to, names))} ${Math.round(x.win * 100)}% (이번 라운드 ${sg(x.pts)}점)`).join(" · ");
        const known = V.forWho >= 0 ? `나 · 내가 마니또인 ${who} 를 뺀 사람 중 한 명을 같은 확률로 가정` : "누가 마니또인지 모르니 모두 같은 확률로 가정";
        why = `최종 순위에서 남을 이길 몫(괄호는 이번 라운드 내 점수 기대값): ${top3}. 내 마니또는 모르니 ${known}하고, 남은 교환 ${total - V.step - 1}번과 다음 라운드는 무작위로 가정했어요.${V.bombLock ? " 폭탄은 사람에게만 넘길 수 있어요 — 이미 폭탄을 든 사람이면 그쪽이 +3 을 받아요." : ""}${V.peeked ? "" : " 몰래 보기(한 번)로 구매자 칸을 먼저 확인할 수도 있어요."}`;
      }
    } else if (V.phase === "show") rec = "결과를 확인하고 다음 라운드를 준비해요";
    return { opp, mine, rec, why };
  }

  return {
    id: "gemmarket", CARDS, KN, ROUNDS, TO_TRASH, TO_P, STEAL,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach,
    buyerCount, gainOf, checkTo, samples, evalMoves, evalRank, cycleSample, toText, peekPick,
  };
});

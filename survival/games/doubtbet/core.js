/* 베니 서바이벌 · 의심 베팅 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 6일차 메인 매치 (5명). 나무위키 6일차 문서의 룰 · 진행표를 읽고 우리 말로 옮김. 모티브는 페루도.
   · 카드 60장: 빨강 · 노랑 · 초록 · 파랑 · 보라 · 레인보우 각 10장. 레인보우는 선언한 색으로 침.
   · 각자 슬롯 5개 · 슬롯칩 4개로 시작 (마지막 슬롯은 칩이 없어 베팅 못 함). 라운드마다 섞어서 슬롯마다 카드 1장.
   · 선부터 '어떤 색이 모두 몇 장 이상' (1~20장, 레인보우로는 선언 못 함)을 선언하며 피스 또는 슬롯칩을 1개 이상 베팅.
   · 다음 사람은 '인정' 또는 '의심'.
     인정: 앞사람 베팅을 돌려주고, 인정한 사람이 더 많은 장수로 새로 선언 (색은 자유) + 베팅.
     의심: 의심한 사람부터 앞사람 베팅에 콜 또는 레이즈 → 레이즈를 받으면 콜 · 레이즈 · 포기. 포기하면 남은 사람이 판돈을 다 가짐 (카드 안 깜).
     모두 콜하면 카드 공개: 그 색 + 레인보우가 선언보다 적으면 의심한 사람 승, 같거나 많으면 선언한 사람 승. 이긴 사람이 판돈을 다 가짐.
   · 슬롯칩을 잃으면 슬롯이 하나 줄어 카드도 한 장 덜 받음. 베팅에서 얻은 슬롯칩은 피스 1개로 침. 피스 1개로 슬롯 1개를 살 수 있음 (최대 5).
   · 다음 라운드 선 = 의심에서 진 사람. 15라운드부터 5라운드마다 피스 1개를 냄. 10라운드마다 자리 추첨.
   · 3명이 남을 때까지. 끝나면 남은 슬롯 1개당 피스 1개 → 피스가 가장 많은 사람이 1위.
   방송과 다른 점 (폰 · AI 때문에 우리가 정함 — 화면 '방송과 다른 점' 한 줄로도 알림):
     ① 3~6명 (방송 5명), 시작 피스는 모두 같게 (기본 5개, 방송은 그때까지 모은 피스).
     ② 베팅은 피스부터 쓰고 모자라면 슬롯칩 (방송은 골라 냄 — 둘 다 끝에 1점이라 피스부터가 늘 낫거나 같음).
     ③ 탈락: 피스 · 슬롯칩이 모두 없어 베팅할 수 없게 되거나, 낼 피스(없으면 칩)가 없을 때. '몇 명 남을 때까지' = 인원 − 2 (최소 2명).
     ④ 슬롯 사기는 라운드 시작 전에만. 40라운드가 지나면 그때 끝 (짧게 20라운드 옵션). 3분 시계 없음.
   숨은 정보: 남의 카드 (라운드 공개 · 포기 때는 안 깜). view 는 내 카드만 싣고, 공개된 라운드의 카드는 last 에. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).doubtbet = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLS = ["빨강", "노랑", "초록", "파랑", "보라"], RB = 5, PER = 10, DECK = 60, MAXCNT = 20, MAXSLOT = 5, CHIP0 = 4;
  const OPTS = { pieces: [5, 8], rounds: [40, 20] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }
  const mix = (...a) => { let x = 0x9E3779B9; for (const v of a) { x ^= (v | 0) + 0x7F4A7C15 + (x << 6) + (x >>> 2); x = Math.imul(x ^ (x >>> 16), 0x85EBCA6B) >>> 0; } return (x >>> 0) / 4294967296; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 500) st.log.shift(); }
  const alive = (st, s) => !st.out[s];
  const slotsOf = (st, s) => st.chips[s] + 1;
  const purse = (st, s) => st.pc[s] + st.chips[s];          // 베팅할 수 있는 양
  // 자리 순서(seat 배열)에서 s 다음 살아 있는 사람
  function nextAlive(st, s) { const o = st.seat, i = o.indexOf(s); for (let k = 1; k <= o.length; k++) { const x = o[(i + k) % o.length]; if (alive(st, x)) return x; } return s; }
  const nAlive = st => st.out.filter(x => !x).length;

  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(3, Math.min(6, n | 0 || 5));
    const o = optsOf(cfg), rs = (seed >>> 0) || 1;
    const st = { n, rs, cfg: Object.assign({}, cfg), opt: o, pc: Array(n).fill(o.pieces), chips: Array(n).fill(CHIP0), out: Array(n).fill(false), outAt: Array(n).fill(0),
      seat: [], round: 0, starter: 0, phase: "buy", hands: [], bid: null, prev: [], duel: null, buy: Array(n).fill(null), last: null, hist: [], log: [], seq: 0,
      over: false, end: "", goal: Math.max(2, n - 2) };
    const R = seeded(hash(`seat|${rs}`));
    st.seat = shuffle(Array.from({ length: n }, (_, i) => i), R);
    st.starter = st.seat[Math.floor(mix(rs, 11) * n) % n];
    push(st, { k: "start", seat: st.seat.slice(), starter: st.starter });
    startRound(st);
    return st;
  }
  function shuffle(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // 라운드 시작: (10라운드마다 자리 추첨) → 슬롯 사기 단계 (살 수 있는 사람이 있으면) → 카드 나눔
  function startRound(st) {
    st.round++;
    if (st.round > 1 && (st.round - 1) % 10 === 0) {
      const R = seeded(hash(`reseat|${st.rs}|${st.round}`)), al = st.seat.filter(s => alive(st, s));
      st.seat = shuffle(al.slice(), R).concat(st.seat.filter(s => !alive(st, s)));
      push(st, { k: "reseat", seat: st.seat.slice() });
    }
    st.bid = null; st.prev = []; st.duel = null; st.hands = Array.from({ length: st.n }, () => []);
    st.buy = st.out.map((o, s) => (!o && st.pc[s] >= 1 && slotsOf(st, s) < MAXSLOT ? null : 0));
    if (st.buy.some(x => x === null)) { st.phase = "buy"; return; }
    deal(st);
  }
  function deal(st) {
    const R = seeded(hash(`deal|${st.rs}|${st.round}`));
    const deck = []; for (let c = 0; c <= RB; c++) for (let k = 0; k < PER; k++) deck.push(c);
    shuffle(deck, R);
    let p = 0;
    for (const s of st.seat) if (alive(st, s)) { st.hands[s] = deck.slice(p, p + slotsOf(st, s)).sort((a, b) => a - b); p += slotsOf(st, s); }
    st.phase = "bid"; st.cur = st.starter;
    push(st, { k: "deal", r: st.round, slots: st.seat.map(s => (alive(st, s) ? slotsOf(st, s) : 0)) });
  }
  const needs = st => {
    if (st.over) return [];
    if (st.phase === "buy") return st.buy.map((x, s) => (x === null ? s : -1)).filter(s => s >= 0);
    if (st.phase === "bid" || st.phase === "resp") return [st.cur];
    if (st.phase === "duel") return [st.duel.turn];
    return [];
  };
  const over = st => !!st.over;
  // 베팅 떼기: 피스부터, 모자라면 슬롯칩 → {p, c}
  function take(st, s, amt) { const p = Math.min(st.pc[s], amt), c = amt - p; st.pc[s] -= p; st.chips[s] -= c; return { p, c }; }
  function giveBack(st, s, t) { st.pc[s] += t.p; st.chips[s] += t.c; }

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "모르는 행동이에요" };
    if (st.phase === "buy") {
      if (a.t !== "buy") return { ok: false, err: "슬롯을 살지 정해요" };
      const k = a.k | 0, max = Math.min(st.pc[seat], MAXSLOT - slotsOf(st, seat));
      if (k < 0 || k > max) return { ok: false, err: `0~${max}개만 살 수 있어요` };
      st.buy[seat] = k;   // 모두 정하면 한꺼번에 반영 (먼저 정한 사람의 선택이 남에게 안 보이게)
      if (st.buy.every(x => x !== null)) {
        for (const s of st.seat) if (st.buy[s] > 0) { st.pc[s] -= st.buy[s]; st.chips[s] += st.buy[s]; push(st, { k: "buy", s, n: st.buy[s] }); }
        deal(st);
      }
      return { ok: true };
    }
    if (st.phase === "bid" || st.phase === "resp") {
      if (a.t === "doubt") {
        if (st.phase !== "resp") return { ok: false, err: "처음 선언은 의심할 수 없어요" };
        const B = st.bid.s;
        st.duel = { b: B, d: seat, put: { [B]: st.bid.amt, [seat]: 0 }, stake: { [B]: st.bid.stake, [seat]: { p: 0, c: 0 } }, turn: seat, first: true, acts: [] };
        st.phase = "duel";
        push(st, { k: "doubt", s: seat, on: B });
        return { ok: true };
      }
      if (a.t !== "bid") return { ok: false, err: "선언하거나 의심해요" };
      const c = a.c, cnt = a.cnt, amt = a.amt;
      if (!Number.isInteger(c) || c < 0 || c >= RB) return { ok: false, err: "레인보우로는 선언할 수 없어요" };
      const lo = st.bid ? st.bid.cnt + 1 : 1;
      if (!Number.isInteger(cnt) || cnt < lo || cnt > MAXCNT) return { ok: false, err: `${lo}~${MAXCNT}장으로 선언해요` };
      if (!Number.isInteger(amt) || amt < 1 || amt > purse(st, seat)) return { ok: false, err: "베팅은 1개 이상, 가진 만큼" };
      if (st.bid) { giveBack(st, st.bid.s, st.bid.stake); st.prev.push({ s: st.bid.s, c: st.bid.c, cnt: st.bid.cnt, amt: st.bid.amt }); }
      const stake = take(st, seat, amt);
      st.bid = { s: seat, c, cnt, amt, stake };
      push(st, { k: "bid", s: seat, c, cnt, amt, acc: st.phase === "resp" });
      st.phase = "resp"; st.cur = nextAlive(st, seat);
      return { ok: true };
    }
    if (st.phase === "duel") {
      const D = st.duel, me = seat, op = seat === D.b ? D.d : D.b;
      const need = D.put[op] - D.put[me];
      if (a.t === "fold") {
        if (D.first && me === D.d) return { ok: false, err: "의심한 사람은 먼저 콜이나 레이즈를 해요" };
        D.acts.push({ s: me, t: "fold" }); push(st, { k: "fold", s: me });
        return settle(st, op, true);
      }
      if (a.t === "call") {
        if (need > purse(st, me)) return { ok: false, err: "콜할 만큼이 없어요 — 가진 만큼 올인하거나 포기" };
        addStake(D, me, take(st, me, need)); D.put[me] += need; D.acts.push({ s: me, t: "call", amt: need });
        push(st, { k: "call", s: me, amt: need });
        return reveal(st);
      }
      if (a.t === "raise") {
        const to = a.to;   // 내가 넣을 총액
        if (!Number.isInteger(to) || to <= D.put[op] || to - D.put[me] > purse(st, me)) return { ok: false, err: "상대보다 많이, 가진 만큼" };
        const add = to - D.put[me];
        addStake(D, me, take(st, me, add)); D.put[me] = to; D.acts.push({ s: me, t: "raise", to }); D.first = false;
        push(st, { k: "raise", s: me, to });
        // 상대가 더 낼 수 없으면 (올인) 바로 공개 — 상대가 넣은 만큼만 겨룸, 남는 것은 돌려줌
        if (purse(st, op) === 0) return reveal(st);
        D.turn = op;
        return { ok: true };
      }
      if (a.t === "allin") {   // 콜할 만큼이 없을 때: 가진 것 다 넣고 공개
        const have = purse(st, me); if (!(need > have) || have <= 0) return { ok: false, err: "올인은 콜할 만큼이 없을 때만" };
        addStake(D, me, take(st, me, have)); D.put[me] += have; D.acts.push({ s: me, t: "allin", amt: have });
        push(st, { k: "allin", s: me, amt: have });
        return reveal(st);
      }
      return { ok: false, err: "콜 · 레이즈 · 포기 중에서" };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  function addStake(D, s, t) { D.stake[s] = { p: D.stake[s].p + t.p, c: D.stake[s].c + t.c }; }
  const countOf = (st, c) => st.hands.reduce((k, h) => k + h.filter(x => x === c || x === RB).length, 0);
  function reveal(st) {
    const D = st.duel, B = st.bid, have = countOf(st, B.c), win = have >= B.cnt ? D.b : D.d;
    return settle(st, win, false, have);
  }
  // 판돈 정리: 짝이 안 맞는 몫(올인보다 더 낸 것)은 돌려주고, 진 사람이 넣은 만큼 이긴 사람에게 (칩은 피스로)
  function settle(st, win, fold, have) {
    const D = st.duel, lose = win === D.b ? D.d : D.b;
    let m = Math.min(D.put[win], D.put[lose]);
    if (fold) m = D.put[lose];
    // 이긴 사람: 자기 몫 그대로 돌려받음
    giveBack(st, win, D.stake[win]);
    // 진 사람: 겨룬 만큼(m) 잃고, 넘친 몫은 돌려받음 (칩부터 돌려줌 — 슬롯을 덜 잃게)
    const L = D.stake[lose], over = D.put[lose] - m, backC = Math.min(L.c, over), backP = over - backC;
    st.chips[lose] += backC; st.pc[lose] += backP;
    const lostC = L.c - backC, lostP = L.p - backP;
    st.pc[win] += m;   // 얻은 칩은 피스로
    const cards = fold ? null : st.hands.map(h => h.slice());
    st.last = { round: st.round, bid: { s: st.bid.s, c: st.bid.c, cnt: st.bid.cnt }, prev: st.prev.slice(), b: D.b, d: D.d, win, lose, fold, have: fold ? null : have, m, lostP, lostC, acts: D.acts.slice(), cards };
    st.hist.push({ round: st.round, b: D.b, d: D.d, c: st.bid.c, cnt: st.bid.cnt, win, m, fold, have: fold ? null : have });
    push(st, { k: "settle", win, lose, m, fold, have: fold ? null : have, cards: cards ? cards.map(h => h.join("")).join("|") : "" });
    st.phase = "show"; st.duel = null; st.starter = lose;
    // 탈락: 베팅할 것이 하나도 없음
    for (let s = 0; s < st.n; s++) if (alive(st, s) && purse(st, s) <= 0) eliminate(st, s, "빈손");
    return { ok: true };
  }
  function eliminate(st, s, why) {
    st.out[s] = true; st.outAt[s] = st.round; push(st, { k: "out", s, why });
    if (st.starter === s) st.starter = prevAlive(st, s);
  }
  function prevAlive(st, s) { const o = st.seat, i = o.indexOf(s); for (let k = 1; k <= o.length; k++) { const x = o[(i - k + o.length * 2) % o.length]; if (alive(st, x)) return x; } return s; }
  const auto = st => (st.over ? null : st.phase === "show" ? 5600 : null);   // 공개된 카드를 볼 시간
  function advance(st) {
    if (st.over || st.phase !== "show") return;
    // 15라운드부터 5라운드마다 피스 1개 (없으면 슬롯칩, 그것도 없으면 탈락)
    if (st.round >= 15 && st.round % 5 === 0) {
      let paid = 0;
      for (const s of st.seat) if (alive(st, s)) {
        if (st.pc[s] > 0) st.pc[s]--; else if (st.chips[s] > 0) st.chips[s]--; else { eliminate(st, s, "낼 피스 없음"); continue; }
        paid++;
        if (purse(st, s) <= 0) eliminate(st, s, "빈손");
      }
      push(st, { k: "fee", r: st.round, n: paid });
    }
    if (nAlive(st) <= st.goal) return finish(st, "left");
    if (st.round >= st.opt.rounds) return finish(st, "rounds");
    if (!alive(st, st.starter)) st.starter = nextAlive(st, st.starter);
    startRound(st);
  }
  const scoreOf = (st, s) => st.pc[s] + slotsOf(st, s);
  function finish(st, why) {
    st.over = true; st.phase = "end"; st.end = why;
    st.final = Array.from({ length: st.n }, (_, s) => (st.out[s] ? -1 : scoreOf(st, s)));
    push(st, { k: "end", why, final: st.final.slice() });
  }
  // 순위: 남은 사람은 최종 피스(피스 + 슬롯) 순, 탈락한 사람은 늦게 떨어질수록 위
  function ranks(st) {
    const key = s => (st.out[s] ? -1000 + st.outAt[s] : scoreOf(st, s));
    const k = Array.from({ length: st.n }, (_, s) => key(s));
    return k.map(x => k.filter(y => y > x).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "buy") { const o = []; for (let k = 0; k <= Math.min(st.pc[seat], MAXSLOT - slotsOf(st, seat)); k++) o.push({ t: "buy", k }); return o; }
    if (st.phase === "bid" || st.phase === "resp") {
      const o = st.phase === "resp" ? [{ t: "doubt" }] : [], lo = st.bid ? st.bid.cnt + 1 : 1, P = purse(st, seat);
      for (let c = 0; c < RB; c++) for (let cnt = lo; cnt <= MAXCNT; cnt++) for (const amt of [...new Set([1, 2, 3, P])]) if (amt >= 1 && amt <= P) o.push({ t: "bid", c, cnt, amt });
      return o;
    }
    if (st.phase === "duel") {
      const D = st.duel, op = seat === D.b ? D.d : D.b, need = D.put[op] - D.put[seat], P = purse(st, seat), o = [];
      if (need <= P) o.push({ t: "call" }); else if (P > 0) o.push({ t: "allin" });
      if (!(D.first && seat === D.d)) o.push({ t: "fold" });
      for (let to = D.put[op] + 1; to - D.put[seat] <= P; to++) o.push({ t: "raise", to });
      return o;
    }
    return [];
  }

  // ── 보이는 것: 내 카드만 (공개된 라운드 카드는 last) ──
  function view(st, seat) {
    const me = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1;
    const isAll = seat === "all";     // 'all' = AI 구경(다 보기) · -1 = 친구랑 구경꾼(공개된 것만)
    const pubObj = { r: st.round, p: st.phase, b: st.bid && [st.bid.s, st.bid.c, st.bid.cnt, st.bid.amt], d: st.duel && [st.duel.put, st.duel.turn], pc: st.pc, ch: st.chips, o: st.out, bu: st.buy.map(x => (x === null ? 0 : 1)), cur: st.cur };
    const D = st.duel;
    const V = {
      n: st.n, opt: Object.assign({}, st.opt), round: st.round, phase: st.phase, seat: me, order: st.seat.slice(), starter: st.starter, cur: st.cur,
      pc: st.pc.slice(), chips: st.chips.slice(), slots: st.chips.map(c => c + 1), out: st.out.slice(), outAt: st.outAt.slice(),
      hand: me >= 0 && st.hands[me] ? st.hands[me].slice() : [], total: st.phase === "buy" ? 0 : st.hands.reduce((k, h) => k + h.length, 0),
      bid: st.bid ? { s: st.bid.s, c: st.bid.c, cnt: st.bid.cnt, amt: st.bid.amt } : null, prev: st.prev.map(x => Object.assign({}, x)),
      duel: D ? { b: D.b, d: D.d, put: Object.assign({}, D.put), turn: D.turn, first: D.first, acts: D.acts.map(x => Object.assign({}, x)) } : null,
      // 사기 단계 중 남의 선택은 '정함(-1)'만
      buy: st.buy.map((x, s) => (x === null || s === me || st.phase !== "buy" || isAll ? x : -1)), last: st.last ? JSON.parse(JSON.stringify(st.last)) : null, hist: st.hist.map(h => Object.assign({}, h)),
      needs: needs(st), over: st.over, end: st.end, final: st.final ? st.final.slice() : null, ranks: ranks(st), goal: st.goal,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), pub: hash(JSON.stringify(pubObj)).toString(36),
    };
    if (isAll) V.hands = st.hands.map(h => h.slice());
    return V;
  }

  // ── AI: 내 카드로 남은 덱의 초기하 분포 → 선언이 맞을 확률. 고급은 앞사람들의 선언 색을 '그 사람이 그 색을 들고 있을 것'으로 조금 반영 ──
  const lnF = (() => { const a = [0]; for (let i = 1; i <= 80; i++) a[i] = a[i - 1] + Math.log(i); return a; })();
  const lnC = (n, k) => (k < 0 || k > n ? -Infinity : lnF[n] - lnF[k] - lnF[n - k]);
  // 모르는 카드 U장 (남은 덱 N장 중 맞는 카드 K장)에서 x장 이상 맞을 확률
  function tail(N, K, U, x) {
    if (x <= 0) return 1; if (x > U || x > K) return 0;
    let p = 0; for (let j = x; j <= Math.min(U, K); j++) p += Math.exp(lnC(K, j) + lnC(N - K, U - j) - lnC(N, U));
    return Math.min(1, p);
  }
  // noise: 판단 흔들림 · push: 선언할 때 '맞을 확률 push 이상' 중 가장 높은 장수 (0 = 가장 안전한 것)
  // ev: 의심 / 인정을 기대값으로 고름 (아니면 '맞을 확률이 반 아래면 의심') · rnd: 엉뚱한 선언 · stake: 확실할 때 크게 거는지
  // (앞사람 선언 색을 '그 색이 더 있다'로 읽는 것도 재 봤는데 1장만 더해도 고급이 약해져서 뺌 — 시험 기록 selftest 7)
  const PROF = {
    easy: { noise: 0.2, push: 0, ev: false, rnd: 0.3, stake: false },
    normal: { noise: 0.15, push: 0.6, ev: false, rnd: 0.12, stake: false },
    hard: { noise: 0, push: 0.72, ev: true, rnd: 0, stake: true },
  };
  // 색 c (+ 레인보우) 가 테이블 전체에 cnt 장 이상일 확률: 내 손은 알고, 남의 카드 U장은 남은 덱에서 무작위로 본 초기하 분포
  function infoOf(V, c) {
    const hand = V.hand, mine = hand.filter(x => x === c || x === RB).length;
    const U = V.total - hand.length, N = DECK - hand.length, K = 2 * PER - mine;
    return { mine, U, N, K, exp: mine + (N ? U * K / N : 0) };
  }
  function probOf(V, s, c, cnt) { const I = infoOf(V, c); return tail(I.N, I.K, I.U, cnt - I.mine); }
  // 이번 라운드에 색 c 를 부른 다른 사람 수 (선생님 글에만 — 수 계산에는 안 씀)
  function readOf(V, s, c) {
    const seen = new Set();
    for (const b of V.prev.concat(V.bid ? [V.bid] : [])) if (b.s !== s && b.c === c) seen.add(b.s);
    return seen.size;
  }
  const keyV = (V, s) => hash(`${V.pub}|${s}|${V.round}`);
  function bidChoice(V, s, P) {
    const lo = V.bid ? V.bid.cnt + 1 : 1, rows = [];
    for (let c = 0; c < RB; c++) for (let cnt = lo; cnt <= MAXCNT; cnt++) {
      const p = probOf(V, s, c, cnt);
      if (p < 0.02 && cnt > lo) break;
      rows.push({ c, cnt, p });
    }
    rows.sort((a, b) => b.p - a.p || a.cnt - b.cnt || a.c - b.c);
    return rows;
  }
  // 선언 고르기: push 가 있으면 '맞을 확률 push 이상' 중 가장 높은 장수 (다음 사람을 더 어렵게), 없으면 가장 안전한 것
  function pickBid(rows, P) {
    if (!rows.length) return null;
    if (!P.push) return rows[0];
    let pick = null;
    for (const r of rows) if (r.p >= P.push && (!pick || r.cnt > pick.cnt || (r.cnt === pick.cnt && r.p > pick.p))) pick = r;
    return pick || rows[0];
  }
  function stakeFor(V, s, p, P) {
    const have = V.pc[s] + V.chips[s];
    if (have <= 1) return have;
    // 확실할수록 크게 — 피스 안에서 (슬롯칩은 마지막에)
    const amt = !P.stake ? 1 : p > 0.85 ? 3 : p > 0.72 ? 2 : 1;
    return Math.max(1, Math.min(amt, V.pc[s] > 0 ? V.pc[s] : have));
  }
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = P === PROF.hard || typeof rnd !== "function" ? seeded(keyV(V, s)) : rnd;
    const jit = () => (P.noise ? (R() - 0.5) * P.noise * 2 : 0);
    if (V.phase === "buy") {
      // 슬롯이 적으면 카드를 덜 봐서 읽기가 흐려짐: 피스가 넉넉하면(4개 이상) 하나 삼
      const can = Math.min(V.pc[s], MAXSLOT - V.slots[s]);
      return { t: "buy", k: can > 0 && V.pc[s] >= 4 ? 1 : 0 };
    }
    if (V.phase === "bid" || V.phase === "resp") {
      const rows = bidChoice(V, s, P);
      let pick = pickBid(rows, P);
      if (P.rnd && R() < P.rnd && rows.length > 1) pick = rows[Math.min(rows.length - 1, 1 + Math.floor(R() * 4))];
      if (V.phase === "resp") {
        const q = Math.max(0, Math.min(1, 1 - probOf(V, s, V.bid.c, V.bid.cnt) + jit()));   // 의심하면 이길 확률
        let doubt;
        if (!pick) doubt = true;
        else if (P.ev) {
          // 의심: 앞사람 베팅만큼 (2q−1) · 인정: 다음 사람이 의심할 때만 위험 (반쯤) × 내 베팅
          const evD = (2 * q - 1) * V.bid.amt, evB = 0.5 * (2 * pick.p - 1) * stakeFor(V, s, pick.p, P);
          doubt = evD > evB;
        } else doubt = q > 0.5 && pick.p < 0.6 || q > 0.75;
        if (doubt) return { t: "doubt" };
      }
      if (!pick) return null;
      return { t: "bid", c: pick.c, cnt: pick.cnt, amt: stakeFor(V, s, pick.p, P) };
    }
    if (V.phase === "duel") {
      const D = V.duel, op = s === D.b ? D.d : D.b, need = D.put[op] - D.put[s], have = V.pc[s] + V.chips[s];
      const p = probOf(V, s, V.bid.c, V.bid.cnt);            // 선언이 맞을 확률
      const pw = Math.max(0, Math.min(1, (s === D.b ? p : 1 - p) + jit()));   // 내가 이길 확률
      const canFold = !(D.first && s === D.d);
      if (pw > 0.8 && have > need && D.put[op] < 6) { const to = Math.min(D.put[op] + (pw > 0.92 ? 2 : 1), D.put[s] + have); if (to > D.put[op]) return { t: "raise", to }; }
      if (need > have) return pw > 0.4 || !canFold ? { t: "allin" } : { t: "fold" };
      // 콜: 이기면 상대 몫 +, 지면 내 몫 전부 − · 포기: 이미 낸 내 몫만 −
      const evCall = pw * D.put[op] - (1 - pw) * (D.put[s] + need), evFold = -D.put[s];
      if (canFold && evCall < evFold) return { t: "fold" };
      return { t: "call" };
    }
    return null;
  }
  const ai = (V, s, tier, rnd) => aiWith(V, s, PROF[tier] || PROF.normal, rnd);
  // 추천 = 고급 AI 의 수 + 선생님 글에 쓸 숫자 (보이는 정보만)
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = PROF.hard, a = aiWith(V, s, P);
    const out = { a };
    if (V.phase === "bid" || V.phase === "resp") { const rows = bidChoice(V, s, P); out.rows = rows.slice(0, 4); out.pick = pickBid(rows, P); }
    if (V.bid) { out.pBid = probOf(V, s, V.bid.c, V.bid.cnt); out.info = infoOf(V, V.bid.c); out.callers = readOf(V, s, V.bid.c); }
    if (a && a.t === "bid") { out.pMine = probOf(V, s, a.c, a.cnt); out.infoMine = infoOf(V, a.c); }
    return out;
  }
  // 복기: 내 판단과 추천의 '이길 확률' (선언 = 선언이 맞을 확률, 의심 = 선언이 틀릴 확률) · 승부 중이면 내가 이길 확률
  function judge(V, s, myA, bestA) {
    if (!V || V.over || !myA || !bestA) return null;
    if (V.phase === "resp" || V.phase === "bid") {
      const pv = a => (a.t === "doubt" ? 1 - probOf(V, s, V.bid.c, V.bid.cnt) : a.t === "bid" ? probOf(V, s, a.c, a.cnt) : 0);
      return { kind: "bid", my: pv(myA), best: pv(bestA) };
    }
    if (V.phase === "duel") { const p = probOf(V, s, V.bid.c, V.bid.cnt), D = V.duel, op = s === D.b ? D.d : D.b; return { kind: "duel", pw: s === D.b ? p : 1 - p, mine: D.put[s], theirs: D.put[op] }; }
    if (V.phase === "buy") return { kind: "buy" };
    return null;
  }

  return {
    id: "doubtbet", COLS, RB, PER, DECK, MAXCNT, MAXSLOT, OPTS, PROF, optsOf, tail, probOf, infoOf, readOf, bidChoice, pickBid,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, judge, countOf: (st, c) => countOf(st, c), scoreOf,
  };
});

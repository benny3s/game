/* 베니 서바이벌 · 오픈, 패스 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 1 게임의 법칙 7화 메인 매치 — 카드 20장을 뒷면으로 깔고, 한 장씩 오픈 또는 패스해서 10칸 수식판을 채워요
   · 기본 카드 20장 (숫자 0~9 각 1장 · 기호 − 3 · ÷ 3 · × 2 · + 2). 가넷으로 추가 팩 구입 (1가넷 검정 · 2가넷 빨강 · 3가넷 파랑 — 팩마다 숫자 10장 + 기호 10장)
   · 가진 카드 중 20장을 골라 내면 섞여서 뒷면으로 깔려요. 앞면은 오픈하기 전엔 몰라요 (뒷면 색만 보여요)
   · 카드마다 오픈(수식판에 들어감) 또는 패스(수식에서 제외, 최대 10장). 수식판 10칸이 차면 끝 — 남은 카드는 안 써요
   · 놓는 방향 (방송 영상 확인): 연 카드는 수식판의 등호(=) 바로 옆 오른쪽 끝(1번 칸)부터 왼쪽으로 채워요 — 첫 번째 카드가 1번 칸, 열 번째가 맨 왼쪽(10번 칸).
     그래서 st.boards[s] 는 '화면에 보이는 왼쪽 → 오른쪽 순서'(맨 앞 = 가장 나중에 연 카드)이고, 연 순서는 st.tr · 로그 · 덱 위치로 알아요
   · 계산: 왼쪽에서 오른쪽으로 읽되 숫자가 연달아 있으면 맨 왼쪽 숫자만(= 나중에 연 카드가 남고 앞서 연 카드는 버려져요), 기호가 연달아 있으면 맨 왼쪽 기호만 유효 ·
     등호 바로 왼쪽(맨 끝 = 첫 번째로 연) 카드가 기호면 그 기호는 무효 · 맨 왼쪽(= 열 번째로 연) 카드가 기호면 그 앞에 0 이 있는 것으로 계산 · 곱셈 · 나눗셈 먼저
   · 값이 가장 큰 사람이 우승, 가장 작은 사람이 탈락 후보 (방송 기록: 10×8×8×8×7 = 35,840 · 9+7×8+9×7 = 128 …)
   우리 판 다듬기(방송 문서에 없음): 시작 가넷은 모두 같은 값(옵션) · 카드 나눠 쓰기(공동 구입)와 뒷면 방향 요령은 없음 · 순서는 무작위(방송은 가넷이 적은 사람부터) ·
   0 으로 나누면 그 항은 0 · 소수는 그대로 비교 · 값이 같으면 같은 등수 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-openpass"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DECK = 20, SLOTS = 10, MAXPASS = 10;
  const SYM = ["+", "-", "*", "/"];
  const BACKS = ["b", "r", "u"], BACK_NAME = { b: "검정", r: "빨강", u: "파랑" };
  const BASE = { b: "b", nums: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], sym: { "-": 3, "/": 3, "*": 2, "+": 2 } };
  const PACKS = [
    { price: 1, b: "b", nums: [0, 0, 1, 1, 2, 2, 3, 3, 7, 8], sym: { "-": 3, "/": 3, "*": 2, "+": 2 } },
    { price: 2, b: "r", nums: [4, 4, 4, 5, 5, 5, 6, 6, 6, 9], sym: { "-": 2, "+": 2, "*": 3, "/": 3 } },
    { price: 3, b: "u", nums: [7, 7, 7, 8, 8, 8, 9, 9, 9, 10], sym: { "-": 2, "/": 2, "*": 3, "+": 3 } },
  ];
  const MAXBUY = 6;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ── 카드 · 풀 ────────────────────────────────────────────
  const gkey = (b, f) => b + f;
  const faceRank = f => (typeof f === "number" ? f : 100 + SYM.indexOf(f));
  const symTxt = f => ({ "+": "+", "-": "−", "*": "×", "/": "÷" }[f] || String(f));
  function addPack(pool, pk) {
    for (const n of pk.nums) pool[gkey(pk.b, n)] = (pool[gkey(pk.b, n)] || 0) + 1;
    for (const s of SYM) if (pk.sym[s]) pool[gkey(pk.b, s)] = (pool[gkey(pk.b, s)] || 0) + pk.sym[s];
  }
  function poolOf(buy) {   // buy = [1가넷 팩 수, 2가넷 팩 수, 3가넷 팩 수]
    const pool = {}; addPack(pool, BASE);
    (buy || [0, 0, 0]).forEach((c, i) => { for (let k = 0; k < c; k++) addPack(pool, PACKS[i]); });
    return pool;
  }
  const poolSize = pool => Object.values(pool).reduce((s, x) => s + x, 0);
  const faceOfKey = k => { const f = k.slice(1); return SYM.includes(f) ? f : +f; };
  const backOfKey = k => k[0];
  function groupList(pool) {   // 화면 · AI 용 목록 (뒷면 색 → 숫자 → 기호)
    return Object.keys(pool).map(k => ({ key: k, b: backOfKey(k), f: faceOfKey(k), n: pool[k] }))
      .sort((a, b) => BACKS.indexOf(a.b) - BACKS.indexOf(b.b) || faceRank(a.f) - faceRank(b.f));
  }
  const buyCost = buy => buy.reduce((s, c, i) => s + c * PACKS[i].price, 0);

  // ── 수식 계산 ────────────────────────────────────────────
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  const fr = (p, q) => { if (q < 0) { p = -p; q = -q; } const g = gcd(p, q); return { p: p / g, q: q / g }; };
  // board = 화면에 보이는 왼쪽 → 오른쪽 순서 (맨 오른쪽 = 등호 옆 = 첫 번째로 연 카드)
  function keepRaw(board) {   // 연속 숫자 · 연속 기호는 맨 왼쪽만, 맨 왼쪽이 기호면 앞에 0 (끝 기호는 남겨 둠)
    const seq = [];
    if (board.length && typeof board[0] === "string") seq.push(0);
    for (const f of board) { const last = seq[seq.length - 1]; if (last !== undefined && (typeof last === typeof f)) continue; seq.push(f); }
    return seq;
  }
  function keepSeq(board) { const s = keepRaw(board); if (s.length && typeof s[s.length - 1] === "string") s.pop(); return s; }
  function evalBoard(board) { return evalSeq(keepSeq(board)); }   // → { p, q } 분수 (칸이 비면 0)
  function evalSeq(s) {
    if (!s.length) return fr(0, 1);
    let sum = fr(0, 1), cur = fr(s[0], 1), sign = 1;
    for (let i = 1; i < s.length; i += 2) {
      const op = s[i], num = s[i + 1];
      if (op === "*") cur = fr(cur.p * num, cur.q);
      else if (op === "/") cur = num === 0 ? fr(0, 1) : fr(cur.p, cur.q * num);   // 0 으로 나누면 그 항은 0
      else { sum = fr(sum.p * cur.q + sign * cur.p * sum.q, sum.q * cur.q); sign = op === "+" ? 1 : -1; cur = fr(num, 1); }
    }
    return fr(sum.p * cur.q + sign * cur.p * sum.q, sum.q * cur.q);
  }
  const num = f => f.p / f.q;
  const cmpF = (a, b) => { const d = a.p * b.q - b.p * a.q; return d > 0 ? 1 : d < 0 ? -1 : 0; };
  function showVal(f) {
    if (f.q === 1) return String(f.p).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const x = f.p / f.q; return (Math.round(x * 100) / 100).toString();
  }
  function exprText(board) {   // 화면용: 유효한 식 (끝 기호 · 겹친 카드는 빠짐)
    const s = keepSeq(board);
    return s.map(f => (typeof f === "number" ? String(f) : symTxt(f))).join(" ");
  }

  // ── 판 ──────────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    n = Math.max(2, Math.min(7, n | 0 || 4));
    const c = cfg || {}, gar = c.gar === undefined ? 4 : Math.max(0, c.gar | 0);
    const st = { n, rs: (seed >>> 0) || 1, cfg: c, gar, phase: "buy", order: [], buys: Array(n).fill(null), subs: Array(n).fill(null), decks: Array(n).fill(null), cur: 0, pos: Array(n).fill(0), passes: Array(n).fill(0), boards: Array.from({ length: n }, () => []), okeys: Array.from({ length: n }, () => []), tr: Array.from({ length: n }, () => []), vf: Array(n).fill(null), over: false, ranks: null, score: Array(n).fill(0), log: [], seq: 0 };
    st.order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [st.order[i], st.order[j]] = [st.order[j], st.order[i]]; }
    if (c.order) st.order = c.order.slice();   // 시험용
    push(st, { k: "start", order: st.order.slice() });
    if (gar === 0) { for (let i = 0; i < n; i++) { st.buys[i] = [0, 0, 0]; st.subs[i] = Object.assign({}, poolOf([0, 0, 0])); } startPlay(st); }
    return st;
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "buy") return [...Array(st.n).keys()].filter(i => !st.buys[i]);
    if (st.phase === "submit") return [...Array(st.n).keys()].filter(i => !st.subs[i]);
    return [st.order[st.cur]];
  }
  function startPlay(st) {
    for (let i = 0; i < st.n; i++) {   // 제출한 20장을 섞어서 뒷면으로 깔아요
      const cards = [];
      for (const k of Object.keys(st.subs[i])) for (let c = 0; c < st.subs[i][k]; c++) cards.push({ f: faceOfKey(k), b: backOfKey(k) });
      for (let a = cards.length - 1; a > 0; a--) { const b = Math.floor(rnd(st) * (a + 1)); [cards[a], cards[b]] = [cards[b], cards[a]]; }
      st.decks[i] = cards;
    }
    st.phase = "play"; st.cur = 0;
    push(st, { k: "play", first: st.order[0] });
  }
  function finishSeat(st, s) {
    st.vf[s] = evalBoard(st.boards[s]);
    push(st, { k: "done", s, v: showVal(st.vf[s]) });
    st.cur++;
    if (st.cur >= st.n) {
      st.over = true; st.phase = "over";
      st.ranks = st.vf.map(a => st.vf.filter(b => cmpF(b, a) > 0).length);
      st.score = st.vf.map(num);
      push(st, { k: "end" });
    }
  }
  function openCard(st, s, forced) {
    const c = st.decks[s][st.pos[s]++];
    st.boards[s].unshift(c.f); st.okeys[s].push(gkey(c.b, c.f)); st.tr[s].push("o");   // 새 카드는 맨 왼쪽에 (첫 카드가 등호 옆 1번 칸)
    push(st, { k: "open", s, f: c.f, b: c.b, forced: !!forced, slot: st.boards[s].length });   // slot = 놓인 칸 번호 (등호 옆이 1번)
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a) return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "buy") {
      if (a.t !== "buy") return { ok: false, err: "추가 팩을 살지 정해요 (안 사도 돼요)" };
      if (st.buys[seat]) return { ok: false, err: "이미 정했어요 — 다른 사람을 기다려요" };
      const p = a.p;
      if (!Array.isArray(p) || p.length !== 3 || !p.every(x => Number.isInteger(x) && x >= 0 && x <= MAXBUY)) return { ok: false, err: "팩 수를 다시 골라요" };
      if (buyCost(p) > st.gar) return { ok: false, err: `가넷 ${st.gar}개 안에서 살 수 있어요 (지금 ${buyCost(p)}개)` };
      st.buys[seat] = p.slice();
      if (st.buys.every(Boolean)) {
        for (let i = 0; i < st.n; i++) if (poolSize(poolOf(st.buys[i])) === DECK) st.subs[i] = poolOf(st.buys[i]);   // 안 샀으면 기본 20장 그대로
        push(st, { k: "buys", buys: st.buys.map(b => b.slice()) });
        if (st.subs.every(Boolean)) startPlay(st); else st.phase = "submit";
      }
      return { ok: true };
    }
    if (st.phase === "submit") {
      if (a.t !== "submit") return { ok: false, err: "낼 카드 20장을 골라요" };
      if (st.subs[seat]) return { ok: false, err: "이미 냈어요 — 다른 사람을 기다려요" };
      const sel = a.sel, pool = poolOf(st.buys[seat]);
      if (!sel || typeof sel !== "object") return { ok: false, err: "낼 카드 20장을 골라요" };
      let tot = 0; const clean = {};
      for (const k of Object.keys(sel)) {
        const c = sel[k];
        if (!Object.prototype.hasOwnProperty.call(pool, k) || !Number.isInteger(c) || c < 0 || c > pool[k]) return { ok: false, err: "가진 카드 안에서만 골라요" };
        if (c > 0) clean[k] = c; tot += c;
      }
      if (tot !== DECK) return { ok: false, err: `카드는 정확히 ${DECK}장이에요 (지금 ${tot}장)` };
      st.subs[seat] = clean;
      if (st.subs.every(Boolean)) startPlay(st);
      return { ok: true };
    }
    // 플레이
    if (seat !== st.order[st.cur]) return { ok: false, err: "지금은 내 차례가 아니에요" };
    if (a.t !== "open" && a.t !== "pass") return { ok: false, err: "오픈 · 패스 중에서 골라요" };
    if (a.t === "pass") {
      if (st.passes[seat] >= MAXPASS) return { ok: false, err: `패스는 최대 ${MAXPASS}장이에요` };
      st.passes[seat]++; st.pos[seat]++; st.tr[seat].push("p");
      push(st, { k: "pass", s: seat });
    } else openCard(st, seat, false);
    if (st.passes[seat] >= MAXPASS) while (st.boards[seat].length < SLOTS && st.pos[seat] < DECK) openCard(st, seat, true);   // 패스를 다 썼으면 나머지는 자동 오픈
    if (st.boards[seat].length >= SLOTS || st.pos[seat] >= DECK) finishSeat(st, seat);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) {
    if (st.over) return [];
    if (st.phase === "buy") return st.buys[seat] ? [] : [{ t: "buy", p: [0, 0, 0] }];
    if (st.phase === "submit") {
      if (st.subs[seat]) return [];
      const sel = autoPick(poolOf(st.buys[seat]));
      return [{ t: "submit", sel }];
    }
    return seat === st.order[st.cur] ? [{ t: "open" }] : [];
  }
  function autoPick(pool) {   // 앞에서부터 20장 (대체용)
    const sel = {}; let left = DECK;
    for (const g of groupList(pool)) { const c = Math.min(g.n, left); if (c > 0) sel[g.key] = c; left -= c; if (!left) break; }
    return sel;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const reveal = st.over || all;
    const playing = st.phase === "play" || st.phase === "over";
    const cur = st.phase === "play" ? st.order[st.cur] : -1;
    const pubBuys = st.phase === "buy" && !reveal ? Array(st.n).fill(null) : st.buys.map(b => (b ? b.slice() : null));
    const backs = playing ? st.decks.map(d => d.map(c => c.b)) : null;
    // 내가 모르는 카드 (낸 20장 − 오픈한 카드) — 패스한 카드는 앞면을 몰라요
    let unk = null;
    if (me >= 0 && playing && st.subs[me]) { unk = Object.assign({}, st.subs[me]); for (const k of st.okeys[me]) unk[k]--; for (const k of Object.keys(unk)) if (unk[k] <= 0) delete unk[k]; }
    const pubObj = { ph: st.phase, o: st.order, b: pubBuys, sd: st.subs.map(s => (s ? 1 : 0)), bk: backs, bd: st.boards, tr: st.tr.map(t => t.join("")), ps: st.passes, pos: st.pos, vf: st.vf.map(f => (f ? [f.p, f.q] : null)), ov: st.over };
    const v = {
      n: st.n, seat, phase: st.phase, gar: st.gar, order: st.order.slice(), cur, buys: pubBuys, buyDone: st.buys.map(Boolean), subDone: st.subs.map(Boolean),
      mineBuy: me >= 0 && st.buys[me] ? st.buys[me].slice() : null, mineSub: me >= 0 && st.subs[me] ? Object.assign({}, st.subs[me]) : null,
      pool: me >= 0 && st.buys[me] ? groupList(poolOf(st.buys[me])) : null,
      backs, tr: st.tr.map(t => t.join("")), boards: st.boards.map(b => b.slice()), passes: st.passes.slice(), pos: st.pos.slice(),
      vals: st.vf.map(f => (f ? { p: f.p, q: f.q } : null)), unk, needs: needs(st), over: st.over,
      ranks: st.over ? st.ranks.slice() : null, score: st.over ? st.score.slice() : Array(st.n).fill(0),
      decks: reveal && playing ? st.decks.map(d => d.map(c => ({ f: c.f, b: c.b }))) : null,
      log: st.log.slice(-40), pub: hash(JSON.stringify(pubObj)),
    };
    return v;
  }
  // ── AI (내가 보는 것만) ─────────────────────────────────────
  // 오픈할지 정하는 기본 규칙(휴리스틱). 새 카드는 맨 왼쪽(board[0] 의 왼쪽)에 놓여요 — 그래서 '맨 왼쪽 카드(front)' 를 보고 정해요:
  //  · 연속 숫자 · 연속 기호는 새 카드만 남고 앞 카드는 버려지니 칸만 쓰므로 패스 · 맨 왼쪽이 기호(× · +)면 그 왼쪽에 놓을 숫자만 열어요 (× 왼쪽엔 2 이상, + 왼쪽엔 큰 숫자)
  //  · 기호는 왼쪽에 숫자가 더 올 자리(칸 2 이상)가 있을 때만 — 마지막 칸의 기호는 맨 앞 기호(앞에 0)가 돼서 위험해요
  const TH = {
    easy: { first: 3, mul: 1, add: 3, plus: 0.6, times: 0.6, loose: 0 },
    normal: { first: 6, mul: 2, add: 6, plus: 1, times: 1, loose: 1, addVal: 60 },
    hard: { first: 6, mul: 2, add: 6, plus: 1, times: 1, loose: 1, addVal: 60 },
  };
  function frontVal(board) {   // 맨 왼쪽에 아직 숫자가 안 온 기호는 빼고 계산한 지금까지의 값 (곱할지 정할 때)
    let i = 0; while (i < board.length && typeof board[i] === "string") i++;
    return num(evalBoard(i ? board.slice(i) : board));
  }
  function want(board, f, th, c) {
    if (c.passesLeft <= 0) return true;
    const front = board[0], loose = c.passesLeft <= th.loose;
    if (typeof f === "number") {
      if (front === undefined) return f >= th.first - (loose ? 4 : 0);   // 첫 카드 = 등호 옆 (맨 오른쪽) 숫자
      if (typeof front === "number") return loose || (c.slotsLeft <= 1 && f >= front);   // 연속 숫자는 새 숫자만 남아요 — 마지막 칸이면 더 큰 숫자로 갈아 끼워요
      if (front === "*") return f >= th.mul - (loose ? 1 : 0) && frontVal(board) > 0;
      if (front === "+") return f >= th.add - (loose ? 4 : 0);
      return loose;                                                // − · ÷ 왼쪽은 값이 줄어요
    }
    if (front === undefined || typeof front === "string") return false;   // 첫 기호(끝 기호는 무효) · 연속 기호는 낭비
    if (f === "*") return frontVal(board) > 0 && c.slotsLeft >= 2 && th.times > 0;
    if (f === "+") return th.plus > 0 && c.slotsLeft >= 2 && frontVal(board) < (th.addVal || 40);
    return false;
  }
  // 모르는 카드(unk)와 뒷면 색만 보고 정하는 기본 규칙 — 같은 색의 남은 카드 중 '열고 싶은 카드'가 절반을 넘으면 열어요
  function blindOpen(board, unk, col, c, th) {
    if (c.passesLeft <= 0) return true;
    let ok = 0, all = 0;
    for (const k of Object.keys(unk)) if (unk[k] > 0 && backOfKey(k) === col) { all += unk[k]; if (want(board, faceOfKey(k), th, c)) ok += unk[k]; }
    return all > 0 && ok / all > 0.5;
  }
  function playRest(board, passes, pos, faces, backs, unk0, th) {   // 남은 카드를 (앞면을 모르는 채로) 기본 규칙으로 끝까지 → 최종 값
    const b = board.slice(), unk = Object.assign({}, unk0); let ps = passes;
    for (let i = pos; i < DECK && b.length < SLOTS; i++) {
      const c = { passesLeft: MAXPASS - ps, cardsLeft: DECK - i, slotsLeft: SLOTS - b.length };
      if (ps >= MAXPASS || blindOpen(b, unk, backs[i], c, th)) { b.unshift(faces[i]); const k = gkey(backs[i], faces[i]); if (unk[k] > 0) unk[k]--; } else ps++;
    }
    return num(evalBoard(b));
  }
  function sampleFaces(unk, backs, pos, r) {   // 모르는 카드를 뒷면 색별로 섞어 남은 자리(pos~)에 나눠요 (패스한 자리는 남는 카드가 받아요)
    const byColor = {};
    for (const k of Object.keys(unk)) for (let c = 0; c < unk[k]; c++) (byColor[backOfKey(k)] = byColor[backOfKey(k)] || []).push(faceOfKey(k));
    for (const b of Object.keys(byColor)) { const a = byColor[b]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
    const idx = {}, faces = Array(DECK).fill(0);
    for (let i = pos; i < DECK; i++) { const b = backs[i]; idx[b] = idx[b] || 0; faces[i] = (byColor[b] || [])[idx[b]++]; if (faces[i] === undefined) faces[i] = 0; }
    return faces;
  }
  const lg = x => Math.log10(Math.max(1, x));   // 처음 차례는 비교할 상대가 없어서 '크기(자릿수)'의 평균으로 견줘요
  function bestOther(V) { let t = null; for (const f of V.vals) if (f && (t === null || cmpF(f, t) > 0)) t = f; return t; }
  function judgePlay(V, me, tier, r, trials) {   // 오픈 / 패스 기대값 (같은 표본으로 비교)
    const th = TH[tier] || TH.normal, pos = V.pos[me], board = V.boards[me], ps = V.passes[me];
    const T = bestOther(V), Tn = T ? num(T) : null;
    let eo = 0, ep = 0;
    for (let t = 0; t < trials; t++) {
      const faces = sampleFaces(V.unk, V.backs[me], pos, r);
      const unkO = Object.assign({}, V.unk), ko = gkey(V.backs[me][pos], faces[pos]); if (unkO[ko] > 0) unkO[ko]--;
      const vo = playRest([faces[pos]].concat(board), ps, pos + 1, faces, V.backs[me], unkO, th);
      const vp = ps < MAXPASS ? playRest(board, ps + 1, pos + 1, faces, V.backs[me], V.unk, th) : -Infinity;
      if (Tn !== null) { eo += vo > Tn ? 1 : 0; ep += vp > Tn ? 1 : 0; } else { eo += lg(vo); ep += vp === -Infinity ? -1e9 : lg(vp); }
    }
    return { open: eo / trials, pass: ep / trials, win: Tn !== null };
  }
  function actPlay(V, me, tier, r) {
    const p = V.pos[me], col = V.backs[me][p], ps = V.passes[me];
    if (ps >= MAXPASS) return { t: "open" };
    if (tier === "hard") { const j = judgePlay(V, me, tier, r, 70); return { t: j.open >= j.pass ? "open" : "pass", j }; }
    if (tier === "easy") return { t: r() < 0.62 ? "open" : "pass" };
    const c = { passesLeft: MAXPASS - ps, cardsLeft: DECK - p, slotsLeft: SLOTS - V.boards[me].length };
    return { t: blindOpen(V.boards[me], V.unk, col, c, TH.normal) ? "open" : "pass" };
  }
  // 덱 고르기: 숫자 k 장(큰 것부터) + 기호 (× → + → − → ÷ 순)
  const SYMPRI = ["*", "+", "-", "/"];
  function pickDeck(pool, k) {
    const gl = groupList(pool), sel = {};
    const nums = gl.filter(g => typeof g.f === "number").sort((a, b) => b.f - a.f), syms = [];
    for (const s of SYMPRI) for (const g of gl) if (g.f === s) syms.push(g);
    let left = DECK, kk = k;
    for (const g of nums) { const c = Math.min(g.n, kk); if (c > 0) { sel[g.key] = c; kk -= c; left -= c; } if (kk <= 0) break; }
    for (const g of syms) { const c = Math.min(g.n, left); if (c > 0) { sel[g.key] = (sel[g.key] || 0) + c; left -= c; } if (left <= 0) break; }
    for (const g of nums) { if (left <= 0) break; const have = sel[g.key] || 0, c = Math.min(g.n - have, left); if (c > 0) { sel[g.key] = have + c; left -= c; } }
    return sel;
  }
  function simDeck(sel, trials, r, th) {   // 이 덱을 섞어서 (앞면을 모르는 채로) 해 본 평균 값
    const cards = []; for (const k of Object.keys(sel)) for (let c = 0; c < sel[k]; c++) cards.push(k);
    let sum = 0;
    for (let t = 0; t < trials; t++) {
      const a = cards.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      sum += lg(playRest([], 0, 0, a.map(faceOfKey), a.map(backOfKey), sel, th));
    }
    return sum / trials;
  }
  function bestDeck(pool, r, tier, trials) {
    const th = TH[tier] || TH.normal; let best = null, bv = -Infinity;
    for (const k of tier === "hard" ? [7, 8, 9, 10, 11, 12] : [10]) { const sel = pickDeck(pool, k), v = tier === "hard" ? simDeck(sel, trials, r, th) : 0; if (v > bv) { bv = v; best = sel; } }
    return { sel: best, v: bv };
  }
  function allBuys(gar) {
    const out = [];
    for (let c3 = 0; c3 <= Math.min(MAXBUY, Math.floor(gar / 3)); c3++) for (let c2 = 0; c2 <= Math.min(MAXBUY, Math.floor((gar - 3 * c3) / 2)); c2++) for (let c1 = 0; c1 <= Math.min(MAXBUY, gar - 3 * c3 - 2 * c2); c1++) out.push([c1, c2, c3]);
    return out;
  }
  function actBuy(V, tier, r) {
    const gar = V.gar;
    if (tier === "easy") { const all = allBuys(gar); return { t: "buy", p: all[Math.floor(r() * all.length)] }; }
    if (tier === "normal") { const p = [0, 0, 0]; let g = gar; for (const i of [2, 1, 0]) while (g >= PACKS[i].price && p[i] < 2) { p[i]++; g -= PACKS[i].price; } return { t: "buy", p }; }
    let best = null, bv = -Infinity;
    for (const p of allBuys(gar)) { const v = bestDeck(poolOf(p), r, "hard", 25).v; if (v > bv + 1e-9) { bv = v; best = p; } }
    return { t: "buy", p: best || [0, 0, 0] };
  }
  function actSubmit(V, tier, r) {
    const pool = {}; for (const g of V.pool) pool[g.key] = g.n;
    if (tier === "easy") {
      const cards = []; for (const k of Object.keys(pool)) for (let c = 0; c < pool[k]; c++) cards.push(k);
      for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
      const sel = {}; for (const k of cards.slice(0, DECK)) sel[k] = (sel[k] || 0) + 1;
      return { t: "submit", sel };
    }
    return { t: "submit", sel: bestDeck(pool, r, tier, 60).sel };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (V.phase === "buy") return actBuy(V, tier, r);
    if (V.phase === "submit") return actSubmit(V, tier, r);
    const a = actPlay(V, me, tier, r); return { t: a.t };
  }

  // ── 복기 · 선생님이 같이 쓰는 평가 (AI 의 선택은 바꾸지 않아요 — 두 수를 같은 표본 · 같은 잣대로 재기만 해요) ──
  const meanOf = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const sortedNum = a => a.slice().sort((x, y) => x - y);
  function cdfBelow(sorted, x) {   // 정렬된 목록에서 x 보다 작을 몫 (같으면 반)
    let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < x) lo = m + 1; else hi = m; }
    let lo2 = lo, hi2 = sorted.length; while (lo2 < hi2) { const m = (lo2 + hi2) >> 1; if (sorted[m] <= x) lo2 = m + 1; else hi2 = m; }
    return (lo + 0.5 * (lo2 - lo)) / Math.max(1, sorted.length);
  }
  const beatProb = (A, B) => { const sb = sortedNum(B); return meanOf(A.map(x => cdfBelow(sb, x))); };   // 서로 독립으로 한 판씩 했을 때 A 가 이길 확률
  const iyo = s => (/[013678]$/.test(String(s).replace(/[^0-9]/g, "")) ? "이에요" : "예요");   // 숫자 뒤 이에요/예요 (읽는 소리 받침 기준)
  const lgShow = x => Math.round(Math.pow(10, x)).toLocaleString("ko-KR");   // 자릿수 평균 → 사람이 읽는 값 (대표 값)
  function deckOutcomes(sel, trials, r, th) {   // 이 20장을 섞어서 끝까지 해 본 최종 값(자릿수)의 목록 — 앞면을 모르는 채로, 기본 규칙으로
    const cards = []; for (const k of Object.keys(sel)) for (let c = 0; c < sel[k]; c++) cards.push(k);
    const out = [];
    for (let t = 0; t < trials; t++) {
      const a = cards.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      out.push(lg(playRest([], 0, 0, a.map(faceOfKey), a.map(backOfKey), sel, th || TH.hard)));
    }
    return out;
  }
  // 덱 하나(20장) 평가: 끝까지 해 본 값들과 대표 값(자릿수 평균)
  function evalDeck(sel, seed, trials) { const out = deckOutcomes(sel, trials || 800, sampler(seed), TH.hard); return { out, v: meanOf(out) }; }
  // 구입 평가: 그 구입으로 가장 좋게 고른 20장(고급 AI 가 고르는 방식)을 끝까지 해 본 값들
  function evalBuy(p, seed, trials) {
    const pool = poolOf(p), sel = bestDeck(pool, sampler(seed), "hard", 60).sel, d = evalDeck(sel, seed + 7, trials);
    return { sel, out: d.out, v: d.v };
  }
  // 이번 오픈 / 패스 평가 (내 차례): judgePlay 와 같은 표본 뽑기로 두 수를 재되, 값이 아니라 '이길 확률' 로 바꿔요
  //  · 먼저 끝낸 사람이 있으면 → 지금 최고를 넘길 확률 · 내가 첫 차례면 → 상대도 내 덱과 비슷하다고 보고 다 이길 확률
  function evalPlay(V, me, seed, trials) {
    if (!V || V.phase !== "play" || V.cur !== me || !V.unk || !V.backs || !V.backs[me]) return null;
    const r = sampler(seed), th = TH.hard, pos = V.pos[me], board = V.boards[me], ps = V.passes[me], backs = V.backs[me], canPass = ps < MAXPASS;
    const T = bestOther(V), Tn = T ? num(T) : null, vo = [], vp = [];
    for (let t = 0; t < trials; t++) {
      const faces = sampleFaces(V.unk, backs, pos, r);
      const unkO = Object.assign({}, V.unk), ko = gkey(backs[pos], faces[pos]); if (unkO[ko] > 0) unkO[ko]--;
      vo.push(playRest([faces[pos]].concat(board), ps, pos + 1, faces, backs, unkO, th));
      vp.push(canPass ? playRest(board, ps + 1, pos + 1, faces, backs, V.unk, th) : null);
    }
    const res = { win: Tn !== null, T, nOpp: Math.max(1, V.n - 1), canPass, vOpen: lgShow(meanOf(vo.map(lg))), vPass: canPass ? lgShow(meanOf(vp.map(lg))) : null };
    if (Tn !== null) {
      res.open = meanOf(vo.map(x => (x > Tn ? 1 : 0)));
      res.pass = canPass ? meanOf(vp.map(x => (x > Tn ? 1 : 0))) : null;
    } else {
      const F = V.mineSub ? sortedNum(deckOutcomes(V.mineSub, 300, sampler(seed + 99), th)) : null;
      if (!F) return null;
      const k = res.nOpp, win = x => Math.pow(cdfBelow(F, lg(x)), k);
      res.open = meanOf(vo.map(win));
      res.pass = canPass ? meanOf(vp.map(win)) : null;
    }
    return res;
  }
  // 아직 앞면을 모르는 내 카드 요약 (낸 20장 − 오픈한 카드, 패스한 카드 포함)
  function unkInfo(V) {
    const u = V && V.unk; if (!u) return null;
    const o = { tot: 0, nums: 0, syms: 0, "+": 0, "-": 0, "*": 0, "/": 0 };
    for (const k of Object.keys(u)) { const f = faceOfKey(k), c = u[k]; o.tot += c; if (typeof f === "number") o.nums += c; else { o.syms += c; o[f] += c; } }
    return o;
  }
  const unkTxt = u => (u ? `아직 앞면을 모르는 내 카드 ${u.tot}장 (숫자 ${u.nums}장 · 기호 ${u.syms}장: ×${u["*"]} +${u["+"]} −${u["-"]} ÷${u["/"]})` : "");

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const packTxt = p => (p.some(Boolean) ? [p[0] ? `검정 팩 ${p[0]}` : "", p[1] ? `빨강 팩 ${p[1]}` : "", p[2] ? `파랑 팩 ${p[2]}` : ""].filter(Boolean).join(" · ") : "추가 팩 없음");
  const selTxt = sel => {
    const gl = groupList(sel), nums = gl.filter(g => typeof g.f === "number"), syms = gl.filter(g => typeof g.f === "string");
    const cnt = a => a.reduce((s, g) => s + g.n, 0);
    return `숫자 ${cnt(nums)}장 · 기호 ${cnt(syms)}장 (${SYMPRI.map(s => { const c = syms.filter(g => g.f === s).reduce((x, g) => x + g.n, 0); return c ? `${symTxt(s)}${c}` : ""; }).filter(Boolean).join(" ")})`;
  };
  const pct = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const inSeat = Number.isInteger(me) && me >= 0 && me < V.n && V.seat === me;
    const who = i => (i === me ? "나" : nm(names, i));
    const done = V.order.filter(s => V.vals[s]);
    if (V.over) {
      const first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0), tf = V.vals[first[0]];
      const res = `결과: ${V.order.map(s => `${who(s)} ${showVal(V.vals[s])}`).join(" · ")}`;
      if (!inSeat) { const low = V.vals.reduce((m, f) => (cmpF(f, m) < 0 ? f : m), V.vals[0]); return { opp: res, mine: `우승 ${first.map(who).join("·")} (${showVal(tf)}) · 가장 작은 값 ${showVal(low)}`, rec: "구경 중이에요", why: `${V.n}명 중 가장 큰 값 ${showVal(tf)} — 곱셈이 이어질수록 값이 크게 자라요. 패스는 사람마다 ${V.passes.join(" · ")}장 썼어요.` }; }
      const b = V.boards[me], valid = keepSeq(b).length, muls = keepSeq(b).filter(f => f === "*").length, ratio = num(tf) > 0 && num(V.vals[me]) > 0 ? num(tf) / num(V.vals[me]) : null;
      return { opp: res, mine: `내 수식: ${exprText(b) || "(없음)"} = ${showVal(V.vals[me])} · ${V.n}명 중 ${V.ranks[me] + 1}위 · 오픈 ${b.length}칸 · 패스 ${V.passes[me]}장`, rec: first.includes(me) ? "우승이에요!" : `값이 가장 큰 사람이 우승이에요${ratio ? ` — 1위(${showVal(tf)})는 내 값의 약 ${ratio >= 10 ? Math.round(ratio).toLocaleString("ko-KR") : ratio.toFixed(1)}배예요` : ""}`, why: `곱셈이 이어질수록 값이 크게 자라요. 내 수식은 쓰인 카드 ${valid}장 중 곱셈 ${muls}개, 겹쳐서 버려진 카드 ${b.length - valid}장이에요. 큰 숫자와 × 카드를 많이 넣고, 연속된 숫자 · 기호는 칸만 낭비한다는 점이 핵심이에요.` };
    }
    if (V.phase === "buy") {
      const a = actBuy(V, "hard", sampler(V.n * 31 + me + 5)), dn = V.buyDone.filter(Boolean).length, vr = evalBuy(a.p, 21, 400).v, v0 = a.p.some(Boolean) ? evalBuy([0, 0, 0], 21, 400).v : vr;
      return { opp: `다른 ${V.n - 1}명도 모두 가넷 ${V.gar}개로 팩을 정하는 중이에요 (지금 ${dn}/${V.n}명 정했고, 구입은 모두 정한 뒤 공개돼요). 순서: ` + V.order.map(who).join(" → "), mine: `가넷 ${V.gar}개 · 팩 가격 검정 1 · 빨강 2 · 파랑 3 · 기본 카드 20장 (숫자 10장 · 기호 10장)`, rec: packTxt(a.p), why: `파랑 팩에는 7·8·9 가 세 장씩과 × 3장, 10 도 들어 있어요. 큰 숫자와 ×(곱셈)가 많을수록 수식이 크게 자라요. 검정 팩은 작은 숫자 위주라 가넷이 남을 때만 사요. 끝까지 해 봤을 때 대표 값(자릿수 평균)은 이 구입이면 약 ${lgShow(vr)}${a.p.some(Boolean) ? ` · 안 사면 약 ${lgShow(v0)}` : ""}${iyo(a.p.some(Boolean) ? lgShow(v0) : lgShow(vr))}.` };
    }
    if (V.phase === "submit") {
      const dn = V.subDone.filter(Boolean).length;
      if (!V.pool) return { opp: `다른 사람이 낼 카드는 비밀이에요 (뒷면만 보여요) — 지금 ${dn}/${V.n}명이 냈어요.`, mine: inSeat ? "구입 결과를 기다려요" : "구경 중이에요", rec: "기다려요", why: `낼 카드는 사람마다 20장이에요 (기본 카드 20장 + 산 팩 중에서 고름). ${V.n}명이 모두 내면 시작해요.` };
      const pool = Object.fromEntries(V.pool.map(g => [g.key, g.n])), a = actSubmit(V, "hard", sampler(V.n * 17 + me + 3)), sel = a.sel, dr = evalDeck(sel, 31, 400), da = evalDeck(autoPick(pool), 31, 400);
      return { opp: `다른 사람이 낼 카드는 비밀이에요 (뒷면만 보여요) — 지금 ${dn}/${V.n}명이 냈어요.`, mine: `가진 카드 ${poolSize(pool)}장 중 20장을 골라요`, rec: selTxt(sel), why: `수식은 숫자 · 기호가 번갈아야 해서 숫자 8~10장 · 기호 10~12장 정도가 좋아요. × 를 가장 먼저, 그다음 + 를 넣고 − · ÷ 는 마지막에 넣어요 (값을 줄이니까요). 끝까지 해 봤을 때 대표 값(자릿수 평균)은 이 20장이면 약 ${lgShow(dr.v)}, 앞에서부터 20장을 그냥 고르면 약 ${lgShow(da.v)}${iyo(lgShow(da.v))}.` };
    }
    const cur = V.cur, T = bestOther(V), u = inSeat ? unkInfo(V) : null;
    const finished = done.map(s => `${who(s)} ${showVal(V.vals[s])}`).join(" · ") || "아직 없음";
    const opp = `순서 ${V.order.map(who).join(" → ")} · 끝난 사람 ${done.length}/${V.n}명: ${finished}${T ? ` · 지금 최고 ${showVal(T)}` : ""}`;
    if (cur !== me) {
      const wait = inSeat && !V.vals[me] ? V.order.indexOf(me) - V.order.indexOf(cur) : -1;
      const mineTxt = `${who(cur)} 차례예요 · 수식 ${exprText(V.boards[cur]) || "(비어 있음)"} (${V.boards[cur].length}/${SLOTS}칸 · 패스 ${V.passes[cur]}/${MAXPASS})${inSeat ? (V.vals[me] ? ` · 내 수식은 끝났어요 = ${showVal(V.vals[me])}` : ` · 내 차례까지 ${wait}명 · ${unkTxt(u)}`) : ""}`;
      return { opp, mine: mineTxt, rec: "기다려요", why: `다른 사람이 오픈 · 패스를 고르는 중이에요. ${T ? `지금 최고는 ${showVal(T)} — 내 수식이 이 값을 넘어야 이겨요.` : `아직 끝낸 사람이 없어요 (0/${V.n}명) — 내 수식은 나중에 이 중 가장 큰 값을 넘어야 이겨요.`}` };
    }
    const p = V.pos[me], col = V.backs[me][p];
    const mineTxt = `${V.boards[me].length}/${SLOTS}칸 · 패스 ${V.passes[me]}/${MAXPASS} · 수식 ${exprText(V.boards[me]) || "(비어 있음)"} = ${showVal(evalBoard(V.boards[me]))} · ${unkTxt(u)}`;
    if (V.passes[me] >= MAXPASS) return { opp, mine: mineTxt, rec: "오픈 (패스를 다 썼어요)", why: `패스를 ${MAXPASS}장 다 써서 남은 카드 ${DECK - p}장은 자동으로 열려요.` };
    const ev = evalPlay(V, me, p * 131 + V.passes[me] * 17 + me + 11, 500);
    const front = V.boards[me][0];   // 새 카드는 맨 왼쪽에 놓여요 (첫 카드는 등호 옆 1번 칸)
    const tip = front === undefined ? "첫 카드는 등호 옆 맨 오른쪽 칸에 놓여요 — 큰 숫자가 좋아요 (기호가 먼저 나오면 끝 기호라 무효예요)." : typeof front === "number" ? "맨 왼쪽 숫자 왼쪽에는 기호(특히 ×)가 필요해요 — 숫자가 또 나오면 새 숫자만 남고 앞 숫자는 버려져요." : "맨 왼쪽 기호 왼쪽에는 숫자가 필요해요 — 기호가 또 나오면 새 기호만 남고, 마지막 칸의 기호는 앞에 0 이 붙어요.";
    if (!ev) return { opp, mine: mineTxt, rec: "오픈", why: `${BACK_NAME[col]} 뒷면 카드예요. ${tip}` };
    const rec = ev.open >= ev.pass ? "오픈" : "패스";
    const why = `${BACK_NAME[col]} 뒷면 카드예요 — ${ev.win ? `지금 최고(${showVal(ev.T)})를 넘길 확률이 오픈 ${pct(ev.open)} · 패스 ${pct(ev.pass)}` : `이길 확률(상대 ${ev.nOpp}명도 내 덱과 비슷하다고 볼 때)이 오픈 ${pct(ev.open)} · 패스 ${pct(ev.pass)}`}예요 (끝까지 해 봤을 때 대표 값 오픈 약 ${ev.vOpen} · 패스 약 ${ev.vPass}). ${tip}`;
    return { opp, mine: mineTxt, rec, why };
  }

  return { id: "gn-openpass", TH, want, playRest, sampleFaces, judgePlay, pickDeck, simDeck, bestDeck, allBuys, ai, coach, packTxt, selTxt, bestOther, DECK, SLOTS, MAXPASS, MAXBUY, SYM, BACKS, BACK_NAME, BASE, PACKS, init, needs, apply, view, over, ranks, legal, auto, advance, poolOf, poolSize, groupList, buyCost, faceOfKey, backOfKey, gkey, keepRaw, keepSeq, evalBoard, evalSeq, frontVal, num, cmpF, showVal, exprText, symTxt, sampler, hash, autoPick, deckOutcomes, evalDeck, evalBuy, evalPlay, beatProb, lgShow, unkInfo, unkTxt };
});

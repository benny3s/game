/* 베니 서바이벌 · 수식 경매 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 1 (게임의 법칙) 9화 메인 매치 「수식경매」 — 규칙 설명 그래픽 · 경매 순서표 · 경매 장면 확인
   · 5명. 모두 1~10 숫자큐브 10개를 받고, 24번의 경매에서 숫자 · 기호 타일을 사 모아요. 가장 먼저 답이 10 인 수식을 완성하면 우승
   · 경매 순서(방송 순서표): 1~6회 숫자 1~6 · 7~10회 기호 + × − ÷ · 11회 6 · 12회 7 · 13회 특별경매 · 14~22회 숫자 + 기호 묶음(1× 2× 3+ 4+ 8÷ 9÷ 10÷ 6− 7−) · 23회 + · 24회 10
   · 타일이 공개되면 숫자큐브 한 장을 내서 입찰해요. 더 높은 큐브가 안 나오면 낙찰. 한 경매에 여러 번 낼 수 있지만 낸 큐브는 (이긴 사람 것도) 전부 버려져요
   · 같은 큐브가 나오면 그 경매는 무효 (낙찰방해) — 낸 큐브도 타일도 버려져요
   · 13회 특별경매: 가넷으로 응찰해 숫자큐브 11(절대큐브)을 사요. 낙찰받지 못한 사람의 가넷은 돌려받아요
   · 가진 타일을 모두 써서 숫자 → 기호 → 숫자 … 순서로 놓은 수식이 10 이면 그 자리에서 우승 (곱셈 · 나눗셈 먼저, 정확한 분수로 계산)
   · 먼저 10 을 만들면 그 사람만 우승 · 나머지는 공동 최하위. 24회까지 아무도 못 만들면 10 에 가장 가까운 수식이 우승 · 가장 먼 수식이 탈락후보 (차이가 같으면 높은 숫자가 우세)
   우리 판 다듬기(방송과 다른 점): 5초 동안 손을 드는 경쟁을 '창' 으로 바꿨어요 — 창마다 모두가 동시에 (넘기기 · 큐브 한 장) 을 고르고, 같은 창에서 낸 큐브는 가장 큰 것이 이겨요
   (가장 큰 것이 둘 이상이거나 서 있는 입찰과 같으면 낙찰방해) · 협상 · 가넷 주고받기는 뺐고 가넷은 13회에만 써요
   재현 약속: 시계 · Math.random 을 안 써요. 난수는 st 안 씨앗 난수뿐이고, AI 의 흔들림 난수는 창마다 미리 뽑아 그 자리 view 에만(rd) 실려요 (상대 것은 안 보임) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-formulaauction"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const TARGET = 10, NLOT = 24, SPECIAL = 13, ABS = 11, MIN_N = 3, MAX_N = 5, SEARCH_CAP = 90000;
  const GARNETS = [7, 14, 15, 11, 7];            // 방송 시작 가넷 (김경란 · 박은지 · 성규 · 이상민 · 홍진호 순서가 아니라 값만 — 자리는 씨앗으로 섞어요)
  // 경매 순서표 (방송 그래픽): n = 숫자 타일 · o = 기호 타일 · sp = 특별경매
  const LOTS = [
    { n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }, { n: 6 },
    { o: "+" }, { o: "×" }, { o: "−" }, { o: "÷" },
    { n: 6 }, { n: 7 }, { sp: 1 },
    { n: 1, o: "×" }, { n: 2, o: "×" }, { n: 3, o: "+" }, { n: 4, o: "+" }, { n: 8, o: "÷" }, { n: 9, o: "÷" }, { n: 10, o: "÷" }, { n: 6, o: "−" }, { n: 7, o: "−" },
    { o: "+" }, { n: 10 },
  ];
  const RESTS = { 6: 1, 12: 1, 18: 1 };          // 작전타임 (방송: 6 · 12 · 18회가 끝날 때마다 10분) — 우리 판은 안내 문구만

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rndA(st) {                      // AI 흔들림 전용 난수 (추첨에 쓰는 st.rs 와 줄기가 달라서, 내 rd 로 추첨 결과를 거꾸로 알아낼 수 없어요)
    const a = (st.ra = (st.ra + 0x9E3779B9) >>> 0);
    let t = Math.imul(a ^ (a >>> 16), 0x85EBCA6B); t = Math.imul(t ^ (t >>> 13), 0xC2B2AE35); t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const asc = (a, b) => a - b;
  const tileOf = lot => (lot >= 1 && lot <= NLOT ? LOTS[lot - 1] : {});

  // ── 수식 (정확한 분수 · 곱셈 나눗셈 먼저) ──────────────────────
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  function evalSeq(ns, os) {                       // → [분자, 분모] (분모 > 0, 기약)
    let sp = 0, sq = 1, sign = 1, tp = ns[0], tq = 1;
    for (let i = 0; i < os.length; i++) {
      const o = os[i], x = ns[i + 1];
      if (o === "×") tp *= x; else if (o === "÷") tq *= x;
      else {
        const g = gcd(tp, tq); tp /= g; tq /= g;
        sp = sp * tq + sign * tp * sq; sq *= tq;
        const h = gcd(sp, sq); sp /= h; sq /= h;
        sign = o === "+" ? 1 : -1; tp = x; tq = 1;
      }
    }
    const g = gcd(tp, tq); tp /= g; tq /= g;
    sp = sp * tq + sign * tp * sq; sq *= tq;
    const h = gcd(sp, sq); return [sp / h, sq / h];
  }
  const exprOf = (ns, os) => ns.map((x, i) => (i < os.length ? `${x} ${os[i]}` : String(x))).join(" ");
  const fmt = v => (v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`);
  const fmtV = v => (v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]} (≈${(v[0] / v[1]).toFixed(2)})`);   // 화면 · 선생님 글용 (분수 + 소수 어림)
  const validSize = (nums, ops) => nums.length >= 2 && nums.length === ops.length + 1;
  const keyOf = (nums, ops) => nums.slice().sort(asc).join(",") + "|" + ops.slice().sort().join("");
  // 타일을 모두 쓴 모든 배열(숫자 → 기호 → 숫자 …)을 훑어요. visit 이 true 를 돌려주면 멈춤. 같은 타일끼리의 겹치는 배열은 한 번만. 상한을 넘으면 거기서 멈춤(AI 가 아주 많이 모았을 때)
  function arrangements(nums, ops, visit) {
    const k = nums.length, nv = [...new Set(nums)].sort(asc), nc = nv.map(v => nums.filter(x => x === v).length);
    const ov = [...new Set(ops)].sort(), oc = ov.map(v => ops.filter(x => x === v).length), ns = new Array(k), os = new Array(k - 1);
    let stop = false, budget = SEARCH_CAP;
    const rec = i => {
      for (let a = 0; a < nv.length && !stop; a++) {
        if (!nc[a]) continue;
        nc[a]--; ns[i] = nv[a];
        if (i === k - 1) { if (visit(ns, os) || --budget <= 0) stop = true; }
        else for (let b = 0; b < ov.length && !stop; b++) { if (!oc[b]) continue; oc[b]--; os[i] = ov[b]; rec(i + 1); oc[b]++; }
        nc[a]++;
      }
    };
    rec(0);
  }
  const C10 = new Map(), CB = new Map();
  // 10 이 되는 배열이 있는가 → 식 문자열("" = 없음)
  function hit10(nums, ops) {
    if (!validSize(nums, ops)) return "";
    const key = keyOf(nums, ops); let r = C10.get(key);
    if (r !== undefined) return r;
    r = "";
    arrangements(nums, ops, (ns, os) => { const v = evalSeq(ns, os); if (v[1] === 1 && v[0] === TARGET) { r = exprOf(ns, os); return true; } return false; });
    if (C10.size > 150000) C10.clear();
    C10.set(key, r); return r;
  }
  const reach10 = (nums, ops) => hit10(nums, ops) !== "";
  const farther = (a, b) => a[0] * b[1] > b[0] * a[1];                       // 분수 a > b
  // 10 에 가장 가까운 배열 (차이가 같으면 큰 값) → { v, d, expr } | null
  function bestOf(nums, ops) {
    if (!validSize(nums, ops)) return null;
    const key = keyOf(nums, ops); let r = CB.get(key);
    if (r !== undefined) return r;
    let best = null;
    arrangements(nums, ops, (ns, os) => {
      const v = evalSeq(ns, os), df = [Math.abs(v[0] - TARGET * v[1]), v[1]];
      if (!best || farther(best.d, df) || (!farther(df, best.d) && farther(v, best.v))) best = { v, d: df, expr: exprOf(ns, os) };
      return false;
    });
    if (CB.size > 60000) CB.clear();
    CB.set(key, best || null); return best || null;
  }
  // 두 결과 중 앞선 쪽 (가까운 쪽 → 같으면 높은 숫자) 이면 음수, 같으면 0
  function cmpForm(a, b) {
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;
    const x = a.d[0] * b.d[1], y = b.d[0] * a.d[1];
    if (x !== y) return x < y ? -1 : 1;
    const p = a.v[0] * b.v[1], q = b.v[0] * a.v[1];
    return p === q ? 0 : p > q ? -1 : 1;
  }

  // ── 시작 · 단계 ───────────────────────────────────────────
  const optsOf = cfg => ({ limit: [0, 5, 10].includes(+cfg.limit) ? +cfg.limit : 10 });
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(MIN_N, Math.min(MAX_N, (n | 0) || MAX_N));
    const st = { n, rs: (seed >>> 0) || 1, ra: ((seed >>> 0) ^ 0xA5A5F00D) >>> 0, seq: 0, log: [], cfg: Object.assign({}, cfg), opt: optsOf(cfg), lot: 0, phase: "", hi: null, win: 0, pend: [], burn: [], rd: [], last: null, hist: [], over: false, winner: -1, endBy: "", fin: null };
    const gs = Array.isArray(cfg.gar) && cfg.gar.length >= n ? cfg.gar.slice(0, n).map(x => Math.max(0, x | 0)) : shuffle(st, GARNETS.slice()).slice(0, n);
    st.gar = gs;
    st.cubes = Array.from({ length: n }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    st.nums = Array.from({ length: n }, () => []); st.ops = Array.from({ length: n }, () => []);
    st.pend = Array(n).fill(null); st.rd = Array.from({ length: n }, () => [0.5, 0.5, 0.5]);
    push(st, { k: "start", n });
    startLot(st);
    return st;
  }
  function startLot(st) {
    st.lot++; st.hi = null; st.win = 0; st.burn = [];
    st.phase = st.lot === SPECIAL ? "gbid" : "bid";
    push(st, { k: "lot", lot: st.lot });
    openWindow(st);
  }
  const minCube = st => (st.hi ? st.hi.c : 1);
  function eligible(st, s) {
    if (st.hi && st.hi.s === s) return false;                     // 서 있는 입찰자는 다른 사람이 반응하길 기다려요
    if (st.phase === "gbid") return st.gar[s] > (st.hi ? st.hi.g : 0);
    const m = minCube(st); return st.cubes[s].some(c => c >= m);
  }
  function openWindow(st) {
    st.win++;
    for (let s = 0; s < st.n; s++) { st.pend[s] = eligible(st, s) ? null : { t: "auto" }; st.rd[s] = [rndA(st), rndA(st), rndA(st)]; }
    if (!needs(st).length) resolveWindow(st);
  }
  function endLot(st, last) {
    last.lot = st.lot; last.burn = st.burn.map(b => ({ s: b.s, c: b.c })); last.tile = [tileOf(st.lot).n || 0, tileOf(st.lot).o || ""];
    st.last = last; st.hist.push(Object.assign({}, last)); st.hi = null; st.phase = "show";
    push(st, Object.assign({ k: last.k }, last.s !== undefined ? { s: last.s } : {}, last.c !== undefined ? { c: last.c } : {}, last.g !== undefined ? { g: last.g } : {}, last.by ? { by: last.by.slice() } : {}, { lot: st.lot }));
  }
  function awardCube(st) {
    const s = st.hi.s, c = st.hi.c, t = tileOf(st.lot);
    if (t.n) st.nums[s].push(t.n);
    if (t.o) st.ops[s].push(t.o);
    const expr = hit10(st.nums[s], st.ops[s]);
    endLot(st, { k: "win", s, c, hit: expr ? 1 : 0 });
    if (expr) { st.over = true; st.phase = "end"; st.winner = s; st.endBy = "ten"; st.fin = finals(st); push(st, { k: "ten", s, expr }); }
  }
  function awardGarnet(st) {
    const s = st.hi.s, g = st.hi.g;
    st.gar[s] -= g; st.cubes[s].push(ABS); st.cubes[s].sort(asc);
    endLot(st, { k: "gwin", s, g });
  }
  function resolveWindow(st) {
    if (st.phase === "gbid") {
      const bids = [];
      for (let s = 0; s < st.n; s++) if (st.pend[s] && st.pend[s].t === "gbid") bids.push({ s, g: st.pend[s].g });
      if (!bids.length) { if (st.hi) awardGarnet(st); else endLot(st, { k: "gnone" }); return; }
      const M = Math.max.apply(null, bids.map(b => b.g)), tops = bids.filter(b => b.g === M);
      const pick = tops.length === 1 ? tops[0] : tops[Math.floor(rnd(st) * tops.length)];
      push(st, { k: "gbids", lot: st.lot, w: st.win, b: bids.map(b => [b.s, b.g]), tie: tops.length > 1 ? 1 : 0 });
      st.hi = { s: pick.s, g: M };
      openWindow(st); return;
    }
    const bids = [];
    for (let s = 0; s < st.n; s++) if (st.pend[s] && st.pend[s].t === "bid") bids.push({ s, c: st.pend[s].c });
    if (!bids.length) { if (st.hi) awardCube(st); else endLot(st, { k: "none" }); return; }
    for (const b of bids) { const i = st.cubes[b.s].indexOf(b.c); if (i >= 0) st.cubes[b.s].splice(i, 1); st.burn.push({ s: b.s, c: b.c, w: st.win }); }
    push(st, { k: "bids", lot: st.lot, w: st.win, b: bids.map(b => [b.s, b.c]) });
    const M = Math.max.apply(null, bids.map(b => b.c)), tops = bids.filter(b => b.c === M);
    const block = !!(st.hi && st.hi.c === M);
    if (block || tops.length > 1) { const by = tops.map(t => t.s); if (block) by.unshift(st.hi.s); endLot(st, { k: "void", c: M, by, block: block ? 1 : 0 }); return; }
    st.hi = { s: tops[0].s, c: M };
    openWindow(st);
  }
  function finals(st) { return st.nums.map((nn, s) => bestOf(nn, st.ops[s])); }
  function finish(st) {
    st.over = true; st.phase = "end"; st.endBy = "last"; st.fin = finals(st);
    push(st, { k: "end" });
  }

  function needs(st) {
    if (st.over || (st.phase !== "bid" && st.phase !== "gbid")) return [];
    const o = []; for (let s = 0; s < st.n; s++) if (st.pend[s] === null) o.push(s);
    return o;
  }
  function apply(st, seat, a) {
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "bid") {
      if (a.t === "pass") st.pend[seat] = { t: "pass" };
      else if (a.t === "bid") {
        if (!Number.isInteger(a.c) || !st.cubes[seat].includes(a.c)) return { ok: false, err: "그 큐브는 없어요" };
        if (a.c < minCube(st)) return { ok: false, err: `지금 입찰(${st.hi.c})보다 낮은 큐브는 못 내요` };
        st.pend[seat] = { t: "bid", c: a.c };
      } else return { ok: false, err: "큐브를 내거나 넘겨요" };
    } else {
      if (a.t === "pass") st.pend[seat] = { t: "pass" };
      else if (a.t === "gbid") {
        const lo = st.hi ? st.hi.g : 0;
        if (!Number.isInteger(a.g) || a.g <= lo || a.g > st.gar[seat]) return { ok: false, err: `가넷은 ${lo + 1}개 ~ ${st.gar[seat]}개 사이로 불러요` };
        st.pend[seat] = { t: "gbid", g: a.g };
      } else return { ok: false, err: "가넷을 부르거나 넘겨요" };
    }
    if (!needs(st).length) resolveWindow(st);
    return { ok: true };
  }
  const auto = st => (st.phase === "show" ? (st.last && (st.last.hit || st.lot >= NLOT) ? 3600 : st.last && st.last.k === "win" ? 2600 : 2200) : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    if (st.lot >= NLOT) { finish(st); return; }
    startLot(st);
  }
  const over = st => !!st.over;
  function ranks(st) {
    if (st.endBy === "ten") return st.nums.map((_, s) => (s === st.winner ? 0 : 1));
    const f = st.fin || finals(st);
    return f.map(a => f.filter(b => cmpForm(b, a) < 0).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const out = [{ t: "pass" }];
    if (st.phase === "bid") { const m = minCube(st); for (const c of st.cubes[seat]) if (c >= m) out.push({ t: "bid", c }); }
    else for (let g = (st.hi ? st.hi.g : 0) + 1; g <= st.gar[seat]; g++) out.push({ t: "gbid", g });
    return out;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 큐브 · 가넷 · 타일 · 지난 입찰은 모두 공개 (방송처럼 책상 위에 놓임). 이번 창에서 아직 안 밝혀진 선택(pend)은 그 자리에만 보여요
  function view(st, seat) {
    const all = seat === "all", s = typeof seat === "number" && seat >= 0 && seat < st.n ? seat : -1, L = st.last;
    const ans = st.pend.map(x => !!x), t = tileOf(st.lot);
    const pubObj = { l: st.lot, p: st.phase, hi: st.hi, w: st.win, cb: st.cubes, g: st.gar, n: st.nums, o: st.ops, a: ans, b: st.burn.map(x => [x.s, x.c]), ls: L ? [L.lot, L.k, L.s, L.c, L.g, L.by] : 0, ov: st.over, wn: st.winner };
    return {
      n: st.n, lot: st.lot, nlot: NLOT, phase: st.phase, special: st.lot === SPECIAL, tile: { n: t.n || 0, o: t.o || "", sp: t.sp ? 1 : 0 }, cfg: Object.assign({}, st.opt),
      hi: st.hi ? Object.assign({}, st.hi) : null, win: st.win, cubes: st.cubes.map(c => c.slice()), gar: st.gar.slice(), nums: st.nums.map(a => a.slice()), ops: st.ops.map(a => a.slice()),
      burn: st.burn.map(b => ({ s: b.s, c: b.c, w: b.w })), ans, mine: s >= 0 && st.pend[s] ? Object.assign({}, st.pend[s]) : null,
      pend: all ? st.pend.map(x => (x ? Object.assign({}, x) : null)) : null,
      last: L ? Object.assign({}, L, { burn: L.burn.map(b => Object.assign({}, b)), by: L.by ? L.by.slice() : undefined }) : null,
      hist: st.hist.map(h => Object.assign({}, h, { by: h.by ? h.by.slice() : undefined })),
      needs: needs(st), over: st.over, endBy: st.endBy, winner: st.winner,
      fin: st.fin ? st.fin.map(f => (f ? { v: f.v.slice(), d: f.d.slice(), expr: f.expr } : null)) : null,
      ranks: st.over ? ranks(st) : null, score: st.over ? scoreOf(st) : st.nums.map((a, i) => a.length + st.ops[i].length),
      log: st.log.slice(-40).map(e => Object.assign({}, e)), seat, pub: hash(JSON.stringify(pubObj)),
      rd: s >= 0 ? st.rd[s].slice() : null,
    };
  }
  function scoreOf(st) {
    return (st.fin || finals(st)).map((f, i) => (st.endBy === "ten" && i === st.winner ? 10 : f ? Math.max(0, Math.round((TARGET - f.d[0] / f.d[1]) * 100) / 100) : 0));
  }

  // ── 형세 (AI · 선생님 · 복기가 같이 씀) ───────────────────
  // 앞으로 나올 경매(지금 것은 빼고)에서 몇 번 더 사면 10 을 만들 수 있나: d = 0(이미 10) · 1 · 2 · 3(그 이상), w = 그 방법의 가짓수
  const DCACHE = new Map();
  const futureLots = lot => LOTS.slice(lot).filter(x => !x.sp);
  const add = (nums, ops, x) => [x.n ? nums.concat(x.n) : nums, x.o ? ops.concat(x.o) : ops];
  function distInfo(nums, ops, lot) {
    const key = lot + ":" + keyOf(nums, ops); let r = DCACHE.get(key);
    if (r) return r;
    if (reach10(nums, ops)) r = { d: 0, w: 1 };
    else {
      const rem = futureLots(lot); let w1 = 0, w2 = 0;
      for (const x of rem) { const [a, b] = add(nums, ops, x); if (reach10(a, b)) w1++; }
      if (w1) r = { d: 1, w: w1 };
      else {
        for (let i = 0; i < rem.length; i++) { const [a, b] = add(nums, ops, rem[i]); for (let j = i + 1; j < rem.length; j++) { const [c, d] = add(a, b, rem[j]); if (reach10(c, d)) w2++; } }
        r = w2 ? { d: 2, w: w2 } : { d: 3, w: 0 };
      }
    }
    if (DCACHE.size > 60000) DCACHE.clear();
    DCACHE.set(key, r); return r;
  }
  const imbOf = (nums, ops) => Math.abs(nums.length - ops.length - 1);
  // d>=3 이면 10 은 멀어요 — 24회까지 못 끝날 때를 위해 '10 에 가까운 수식을 갖고 있나' 를 (끝이 가까울수록 더) 쳐 줘요
  function phi(di, nums, ops, lot) {
    if (di.d === 0) return 2;
    if (di.d === 1) return 0.7 + 0.04 * Math.min(di.w, 4);
    if (di.d === 2) return 0.28 + 0.02 * Math.min(Math.log2(1 + di.w), 4);
    const b = bestOf(nums, ops), cl = b ? Math.max(0, 1 - b.d[0] / b.d[1] / 10) : 0;
    return 0.04 - 0.01 * Math.min(imbOf(nums, ops), 3) + 0.5 * (lot / NLOT) * cl;
  }
  const stateVal = (nums, ops, lot) => phi(distInfo(nums, ops, lot), nums, ops, lot);
  // 이 경매의 타일이 j 에게 얼마나 보탬이 되나 (형세 점수 차이)
  function gainOf(V, j) {
    const t = V.tile, a = V.nums[j], b = V.ops[j];
    const [a2, b2] = add(a, b, t);
    return stateVal(a2, b2, V.lot) - stateVal(a, b, V.lot);
  }
  const PRICE = 0.1;                                 // 큐브 1 칸어치 값
  const maxOf = a => (a.length ? a[a.length - 1] : 0);

  // ── AI ────────────────────────────────────────────────────
  // react = 내가 낸 값보다 높게 받아칠 수 있는 상대가 실제로 받아칠 거라고 보는 정도 · blk = 같은 큐브로 막아 올 거라고 보는 정도 · defW = 내가 가져가서 상대가 못 가지는 몫을 쳐 주는 정도
  // block = 방해(같은 큐브)를 쓰는가 (0 이면 안 씀, 1 이면 상대가 곧 10 을 만들 때만, 2 면 늘) · noise = 상대가 낼 최대 큐브를 가늠하는 오차 · pm = 큐브 값어치 흔들림
  const PROF = {
    easy:   { react: 0.3, blk: 0, defW: 0, block: 0, noise: 3, pm: 0.7, pass: 0.45, rand: 1, tol: 0, mix: 0, pr: 1, dn: 0.5 },
    normal: { react: 0.5, blk: 0.1, defW: 0.5, block: 1, noise: 2, pm: 0.3, pass: 0.08, rand: 0, tol: 0.25, mix: 0.6, pr: 0.7, dn: 0.4 },
    hard:   { react: 0.9, blk: 0.25, defW: 1.5, block: 2, noise: 0, pm: 0, pass: 0, rand: 0, tol: 0.15, mix: 0.3, pr: 0.3, dn: 0.8 },
  };
  const threatW = g => (g >= 0.95 ? 1 : 0.4);        // 이 경매로 상대가 10 을 만들 정도면 반드시 막을 만큼 무겁게
  // 상대 j 가 내려고 할 최대 큐브 (타일이 j 에게 주는 값 / 큐브 값어치, 가진 큐브 안에서)
  function reachOf(V, j, g, noise, rd) {
    const mx = maxOf(V.cubes[j]); if (!mx) return 0;
    let w = Math.floor(g / PRICE + 1e-9); if (noise) w += Math.round(((rd ? rd[j % 3] : 0.5) - 0.5) * 2 * noise);
    return Math.max(0, Math.min(mx, w));
  }
  const canBeat = (V, j, c, reach) => reach > c && V.cubes[j].some(x => x > c && x <= reach);
  function planBid(V, me, P) {
    const cur = V.hi, m = cur ? cur.c : 1, G = [], R = [], rd = V.rd || [0.5, 0.5, 0.5];
    for (let j = 0; j < V.n; j++) G[j] = gainOf(V, j);
    for (let j = 0; j < V.n; j++) R[j] = j === me ? 0 : reachOf(V, j, G[j], P.noise, rd);
    const pm = 1 + (P.pm ? (rd[1] - 0.5) * 2 * P.pm : 0), price = c => PRICE * c * pm * (P.pr || 1);
    // 내가 가져가면 상대 한 명이 못 가져가는 몫 (가져갈 사람은 한 명이니 합이 아니라 가장 큰 쪽 · 곧 10 을 만들 상대면 통째로, 아니면 절반)
    const defense = () => { let d = 0, mx = 0; for (let j = 0; j < V.n; j++) if (j !== me && G[j] > 0) { d = Math.max(d, threatW(G[j]) * G[j]); mx = Math.max(mx, G[j]); } return mx >= 0.95 ? d : d * (P.dn == null ? 0.5 : P.dn); };
    const D = defense(), out = [{ a: { t: "pass" }, u: 0, why: "넘겨요", g: G[me] }];
    for (const c of V.cubes[me]) {
      if (c < m) continue;
      if (cur && c === cur.c) {                                       // 방해: 같은 큐브로 이 경매를 무효로
        if (!P.block) continue;
        const gh = G[cur.s], thr = threatW(gh) * Math.max(0, gh);
        if (P.block === 1 && gh < 0.95) continue;
        out.push({ a: { t: "bid", c }, u: thr - price(c), why: `낙찰방해 — ${cur.s + 1}번이 얻는 값 ${gh.toFixed(2)} 를 막아요`, block: 1, g: gh });
        continue;
      }
      let pw = 1;
      for (let j = 0; j < V.n; j++) {
        if (j === me) continue;
        if (canBeat(V, j, c, R[j])) pw *= 1 - P.react;
        else if (P.blk && V.cubes[j].includes(c) && G[me] >= 0.95) pw *= 1 - P.blk;
      }
      out.push({ a: { t: "bid", c }, u: pw * (G[me] + P.defW * D) - price(c), why: `승산 ${Math.round(pw * 100)}% · 내가 얻는 값 ${G[me].toFixed(2)}`, pw, g: G[me] });
    }
    return { cands: out, G, R, D, m };
  }
  function planGarnet(V, me, P) {
    const cur = V.hi ? V.hi.g : 0, mine = V.gar[me], out = [{ a: { t: "pass" }, u: 0, why: "넘겨요" }];
    if (mine <= cur) return { cands: out };
    let rv = 0; for (let j = 0; j < V.n; j++) if (j !== me) rv = Math.max(rv, V.gar[j]);
    const rd = V.rd || [0.5, 0.5, 0.5];
    let g = Math.min(mine, rv + 1);
    if (P.rand) g = Math.min(mine, 1 + Math.floor(rd[0] * Math.max(1, Math.ceil(mine / 2))));
    else if (P.noise) g = Math.max(cur + 1, Math.min(mine, g - Math.floor(rd[2] * 3)));
    if (g > cur) out.push({ a: { t: "gbid", g }, u: 0.1, why: `가진 가넷 ${mine}개 · 상대 가장 많은 ${rv}개 → ${g}개면 이길 수 있어요`, g });
    return { cands: out };
  }
  function planFor(V, me, tier) {
    const P = PROF[tier] || PROF.normal;
    return V.phase === "gbid" ? planGarnet(V, me, P) : planBid(V, me, P);
  }
  function aiWith(V, me, P) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    const rd = V.rd || [0.5, 0.5, 0.5];
    const pl = V.phase === "gbid" ? planGarnet(V, me, P) : planBid(V, me, P), c = pl.cands;
    if (P.rand) {                                                  // 초급: 큐브를 되는 대로 (낮은 것부터 아껴 쓰지 않음)
      if (rd[0] < P.pass) return { t: "pass" };
      const bids = c.filter(x => x.a.t !== "pass");
      return bids.length ? bids[Math.floor(rd[2] * bids.length) % bids.length].a : { t: "pass" };
    }
    let best = c[0];
    for (const x of c) if (x.u > best.u + 1e-9) best = x;
    if (best.a.t === "bid" && !best.block && P.pass && ((rd[0] * 7.31) % 1) < P.pass) return { t: "pass" };   // 가끔 놓침 (중급)
    if (best.a.t === "bid" && !best.block) {
      // 같은 타일을 비슷하게 원하는 상대가 있으면 모두가 같은 큐브를 내서 낙찰방해로 끝나기 쉬워요 → 비슷하게 좋은 수 가운데 씨앗 난수로 하나, 경쟁자가 많으면 가끔 상대에게 양보
      let k = 0; for (let j = 0; j < V.n; j++) if (j !== me && pl.G[j] > 0.1 && pl.G[j] >= 0.6 * pl.G[me]) k++;
      if (k && P.mix && pl.G[me] < 0.95 && rd[0] > 1 / (1 + P.mix * k)) return { t: "pass" };
      if (P.tol) {
        const near = c.filter(x => x.a.t === "bid" && !x.block && x.u > 0 && x.u >= best.u - P.tol - 0.05 * k);
        if (near.length > 1) return near[Math.floor(rd[2] * near.length) % near.length].a;
      }
    }
    return best.a;
  }
  function ai(V, me, tier) { return aiWith(V, me, PROF[tier] || PROF.normal); }

  // ── AI 선생님 (보이는 것만 읽음) ──────────────────────────
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const tileTxt = t => (t.n && t.o ? `${t.n} ${t.o}` : t.n ? String(t.n) : t.o || "");
  const tilesOf = (V, j) => V.nums[j].slice().sort(asc).concat(V.ops[j]).join(" ") || "없음";
  function formTxt(V, j) {
    const b = bestOf(V.nums[j], V.ops[j]);
    if (b) return `${b.expr} = ${fmtV(b.v)}`;
    const dn = V.nums[j].length - V.ops[j].length - 1;
    return V.nums[j].length + V.ops[j].length === 0 ? "아직 타일이 없어요" : dn > 0 ? `숫자가 ${dn}개 남아요 (기호가 필요)` : dn < 0 ? `기호가 ${-dn}개 남아요 (숫자가 필요)` : "아직 식이 안 돼요";
  }
  const stepTxt = (V, j) => { const di = distInfo(V.nums[j], V.ops[j], V.lot), x = di.d === 0 ? "이미 10!" : di.d === 3 ? "3번 이상 더 사야 해요" : `앞으로 ${di.d}번 더 사면 10 (${di.w}가지)`; return x; };
  const actTxt = a => (a.t === "pass" ? "이번 창은 넘겨요" : a.t === "bid" ? `큐브 ${a.c} 를 내요` : `가넷 ${a.g}개를 불러요`);
  function coach(V, me, since, names) {
    me = me >= 0 && me < V.n ? me : (V.seat >= 0 && V.seat < V.n ? V.seat : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`, rivals = []; for (let j = 0; j < V.n; j++) if (j !== me) rivals.push(j);
    const tt = V.tile.sp ? "특별경매(숫자큐브 11)" : `타일 「${tileTxt(V.tile)}」`;
    const stat = `나 ${tilesOf(V, me)} · 큐브 ${V.cubes[me].length}장(${V.cubes[me].join(" ")})`;
    const dangerous = rivals.slice().sort((a, b) => distInfo(V.nums[a], V.ops[a], V.lot).d - distInfo(V.nums[b], V.ops[b], V.lot).d)[0];
    const who = dangerous === undefined ? "" : `${nm(dangerous)}${eun(nm(dangerous))} 타일 ${tilesOf(V, dangerous)} — ${stepTxt(V, dangerous)}`;
    if (V.over) {
      const w = V.winner;
      return { opp: w >= 0 ? `${nm(w)}${iga(nm(w))} ${V.fin[w].expr} = 10 을 완성했어요.` : `24회가 끝났어요 — 10 에 가장 가까운 수식이 우승이에요.`, mine: `${stat} · ${formTxt(V, me)}`, rec: V.ranks[me] === 0 ? "우승이에요!" : "다음 판엔 큐브를 아껴 가며 필요한 타일만 노려 봐요", why: "한 번 낸 큐브는 이긴 사람 것도 사라져요 — 처음부터 높은 큐브로 한 번에 끝내면 적게 써요. 상대가 곧 10 을 만들 때는 같은 큐브로 막는 낙찰방해가 가장 싸요." };
    }
    if (V.phase === "show") {
      const L = V.last;
      if (!L) return { opp: "다음 경매를 기다려요", mine: stat, rec: "—", why: "" };
      const res = L.k === "win" ? `${nm(L.s)}${iga(nm(L.s))} 큐브 ${L.c} 로 낙찰` : L.k === "void" ? `같은 큐브(${L.c})가 나와 낙찰방해 — 타일은 버려졌어요` : L.k === "gwin" ? `${nm(L.s)}${iga(nm(L.s))} 가넷 ${L.g}개로 절대큐브 11 을 얻었어요` : "아무도 입찰하지 않아 타일이 버려졌어요";
      return { opp: `${V.lot}회 결과: ${res}.${who ? " " + who : ""}`, mine: `${stat} · ${formTxt(V, me)}`, rec: "다음 경매를 기다려요", why: `${V.lot}회까지 끝났어요${RESTS[V.lot] ? " (방송에선 작전타임 10분)" : ""}. 남은 경매 ${NLOT - V.lot}번 · 큐브는 쓰는 만큼 사라져요.` };
    }
    const mt = V.needs.includes(me), pl = mt ? planFor(V, me, "hard") : null, best = pl ? pl.cands.slice().sort((a, b) => b.u - a.u)[0] : null;
    if (V.phase === "gbid") {
      const rv = rivals.reduce((m, j) => Math.max(m, V.gar[j]), 0);
      return { opp: `가넷은 나 ${V.gar[me]}개 · ${rivals.map(j => `${nm(j)} ${V.gar[j]}개`).join(" · ")} — 졌을 땐 가넷을 돌려받아요.${V.hi ? ` 지금 ${nm(V.hi.s)}${iga(nm(V.hi.s))} ${V.hi.g}개를 불렀어요.` : ""}`, mine: `${stat} · 가넷 ${V.gar[me]}개`, rec: mt ? actTxt(best.a) : "다른 사람들이 고르는 중이에요", why: `숫자큐브 11 은 어떤 경매에서든 이겨요(한 번). 낙찰받으면 부른 가넷이 사라지고, 못 받으면 그대로예요 — 가장 많이 가진 상대가 ${rv}개라서 ${Math.min(V.gar[me], rv + 1)}개면 이길 수 있는 선이에요.` };
    }
    const g = pl ? pl.G[me] : 0, others = pl ? rivals.map(j => `${nm(j)} +${pl.G[j].toFixed(2)}`).join(" · ") : "";
    const gTxt = pl ? `이 타일이 나에게 주는 값 ${g.toFixed(2)} (상대: ${others})` : "";
    return { opp: `${V.lot}회 ${tt}${V.hi ? ` — 지금 ${nm(V.hi.s)}${iga(nm(V.hi.s))} 큐브 ${V.hi.c} 로 서 있어요` : " — 아직 입찰이 없어요"}. ${who}`, mine: `${stat} · ${formTxt(V, me)} · ${stepTxt(V, me)}`, rec: mt ? actTxt(best.a) : "다른 사람들의 선택을 기다려요", why: mt ? `${gTxt}. ${best.why}${best.block ? " (같은 큐브를 내면 낸 큐브는 둘 다 버려져요)" : ""}` : `이번 창엔 내가 고를 게 없어요(${V.hi && V.hi.s === me ? "내가 서 있는 입찰자예요" : "낼 수 있는 큐브가 없어요"}).` };
  }

  return { id: "gn-formulaauction", TARGET, NLOT, SPECIAL, ABS, MIN_N, MAX_N, GARNETS, LOTS, RESTS, PROF, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, coach, planFor, gainOf, distInfo, stateVal, evalSeq, hit10, reach10, bestOf, cmpForm, fmt, fmtV, exprOf, validSize, keyOf, finals, scoreOf, tileOf, tileTxt, tilesOf, formTxt, stepTxt, actTxt };
});

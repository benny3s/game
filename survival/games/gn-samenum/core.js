/* 베니 서바이벌 · 같은 숫자 찾기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 결승 2라운드 (장동민 vs 오현민) · 시즌 4 그랜드 파이널 4화 데스매치 (오현민 vs 임윤선) — 방송 규칙 설명 그래픽 확인
   · 1:1 데스매치. 4×4 = 16칸. 칸마다 알파벳(ALIE / YOUM / STNR / HDGK)이 앞면, 뒷면에 숫자 1~12 + 연산기호 4개
     시즌 3: + − × ÷ 각 1개 · 시즌 4: − 대신 특수 칸 √x+√y (+ × ÷ 와 함께)
   · 시작 전 5초 동안 모든 뒷면을 보여 줘서 외우게 하고, 이후엔 가려요 (판은 한 판 내내 그대로, 호명으로 공개된 칸만 알게 됨)
   · 라운드마다 딜러가 타깃넘버(판의 숫자 · 기호로 만들 수 있는 자연수, 이미 쓴 타깃은 안 나옴 — 시즌 3 은 56가지)를 공개
   · 먼저 버저를 누른 사람이 5초 안에 수식을 불러요: 알파벳 3개를 숫자 → 연산기호 → 숫자 순서로 호명(같은 칸 중복 불가), 그 칸의 뒷면이 순서대로 공개
     타깃과 같으면 승점 1 · 틀리거나 5초를 넘기면 상대에게 기회(그 뒤로는 버저 없이 바로 호명, 번갈아) — 정답이 나올 때까지
   · 먼저 10점을 얻으면 승리
   재현 약속: 시계 · Math.random 을 안 써요. 버저 시각은 행동 {t:"buzz", ms} 로 실려 오고(사람 = UI 가 잰 값, AI = ai() 가 정한 값), 5초 제한은 {t:"timeout"} 행동으로 와요.
   AI 의 기억 · 반응 · 실수 난수는 라운드마다 씨앗 난수로 미리 뽑아 두고, 그 자리 view 에만(mem · rd) 실려요 (상대 것은 안 보임) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-samenum"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LET = "ALIEYOUMSTNRHDGK".split("");
  const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const OPS = { 3: ["+", "−", "×", "÷"], 4: ["+", "×", "÷", "√"] };
  const NO_BUZZ = 99999, MAXCALLS = 24, MEMPOOL = 12, MIN_MS = 800;   // AI 는 0.8초보다 빨리는 안 눌러요
  const HMIN = (typeof window !== "undefined" && window.SVHuman && window.SVHuman.MIN) || 120;
  const isOp = v => typeof v === "string", isNum = v => typeof v === "number";

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ── 식 ────────────────────────────────────────────────────
  // 정확한 값 (정수로 떨어질 때만 숫자, 아니면 null) — 호명 판정 · 확률 계산에 써요
  function ev(a, op, b) {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 && a % b === 0 ? a / b : null;
      case "√": { const x = Math.sqrt(a), y = Math.sqrt(b); return Number.isInteger(x) && Number.isInteger(y) ? x + y : null; }
      default: return null;
    }
  }
  // 화면에 보여 줄 값 (소수도 보여 줌)
  function evShow(a, op, b) {
    const v = ev(a, op, b); if (v !== null) return v;
    if (op === "÷" && b !== 0) return Math.round(a / b * 100) / 100;
    if (op === "√") return Math.round((Math.sqrt(a) + Math.sqrt(b)) * 100) / 100;
    return null;
  }
  const legalCache = {};
  function legalTargets(season) {
    season = season === 4 ? 4 : 3;
    if (!legalCache[season]) {
      const set = new Set();
      for (const a of NUMS) for (const b of NUMS) if (a !== b) for (const op of OPS[season]) { const v = ev(a, op, b); if (v !== null && v >= 1) set.add(v); }
      legalCache[season] = [...set].sort((x, y) => x - y);
    }
    return legalCache[season].slice();
  }
  // 호명 c = [i,j,k] 의 판정: 숫자 → 기호 → 숫자 순서가 아니면 valid=false
  function judge(vals, target) {
    const [a, o, b] = vals, valid = isNum(a) && isOp(o) && isNum(b);
    if (!valid) return { valid: false, val: null, hit: false };
    const v = ev(a, o, b);
    return { valid: true, val: evShow(a, o, b), hit: v !== null && v === target };
  }

  // ── 시작 · 단계 ───────────────────────────────────────────
  const optsOf = cfg => ({
    goal: [5, 7, 10].includes(+cfg.goal) ? +cfg.goal : 10,
    season: +cfg.season === 4 ? 4 : 3,
    look: [5, 10, 15].includes(+cfg.look) ? +cfg.look : 5,
    limit: +cfg.limit === 0 ? 0 : [5, 10].includes(+cfg.limit) ? +cfg.limit : 5,
    aid: cfg.aid === 0 || cfg.aid === "0" ? 0 : 1,
  });
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    const o = optsOf(cfg);
    const st = { n: 2, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, season: o.season, goal: o.goal, back: [], rev: Array(16).fill(false), mem: [], phase: "look", rdy: [false, false], round: 0, tq: [], tqi: 0, target: 0, score: [0, 0], bz: [null, null], bzMs: null, rd: [[0, 0, 0], [0, 0, 0]], caller: -1, calls: 0, first: -1, last: null, hist: [], log: [], seq: 0, over: false };
    const vals = NUMS.concat(OPS[o.season]);
    const fixed = Array.isArray(cfg.board) && cfg.board.length === 16 && cfg.board.map(v => typeof v + ":" + v).sort().join() === vals.map(v => typeof v + ":" + v).sort().join();
    st.back = fixed ? cfg.board.slice() : shuffle(st, vals.slice());
    st.mem = [shuffle(st, Array.from({ length: 16 }, (_, i) => i)), shuffle(st, Array.from({ length: 16 }, (_, i) => i))];
    const given = Array.isArray(cfg.targets) ? cfg.targets.map(Number).filter(t => Number.isInteger(t) && t >= 1) : [];   // 시험용 고정 타깃 (옵션에는 없음)
    st.tq = given.length ? given : shuffle(st, legalTargets(o.season));
    push(st, { k: "look" });
    return st;
  }
  function startRound(st) {
    if (st.tqi >= st.tq.length) { st.over = true; st.phase = "end"; push(st, { k: "end" }); return; }
    st.round++;
    st.target = st.tq[st.tqi++];
    st.rd = [0, 1].map(() => [rnd(st), rnd(st), rnd(st)]);
    st.bz = [null, null]; st.bzMs = null; st.caller = -1; st.calls = 0; st.first = -1; st.last = null; st.phase = "buzz";
    push(st, { k: "round", r: st.round, t: st.target });
  }
  function resolveBuzz(st) {
    const [m0, m1] = st.bz;
    let w, forced = false;
    if (m0 >= NO_BUZZ && m1 >= NO_BUZZ) { w = rnd(st) < 0.5 ? 0 : 1; forced = true; }
    else if (m0 < m1) w = 0; else if (m1 < m0) w = 1; else w = rnd(st) < 0.5 ? 0 : 1;
    st.caller = w; st.first = w; st.calls = 0; st.bzMs = [m0, m1]; st.phase = "call";
    push(st, { k: "buzz", r: st.round, w, ms: [m0, m1], forced });
  }
  function endRound(st, winner, f) {
    st.hist.push({ r: st.round, t: st.target, w: winner, calls: st.calls, bz: st.bzMs ? st.bzMs.slice() : null, first: st.first, f: f || "" });
  }
  const dispOf = v => (v === undefined || v === null ? "?" : v);

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "look") return [0, 1].filter(i => !st.rdy[i]);
    if (st.phase === "buzz") return [0, 1].filter(i => st.bz[i] === null);
    if (st.phase === "call") return [st.caller];
    return [];
  }
  function validCall(c) {
    return Array.isArray(c) && c.length === 3 && c.every(x => Number.isInteger(x) && x >= 0 && x < 16) && c[0] !== c[1] && c[0] !== c[2] && c[1] !== c[2];
  }
  function apply(st, seat, a) {
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "look") {
      if (a.t !== "ready") return { ok: false, err: "다 외웠으면 '준비'를 눌러요" };
      st.rdy[seat] = true;
      if (st.rdy[0] && st.rdy[1]) { push(st, { k: "hide" }); startRound(st); }
      return { ok: true };
    }
    if (st.phase === "buzz") {
      if (a.t !== "buzz" || typeof a.ms !== "number" || !Number.isFinite(a.ms)) return { ok: false, err: "버저를 눌러요" };
      const r = Math.round(+a.ms);                                  // 사람 반응 바닥(셸 SVHuman.MIN, 120ms) — 손님 기기가 0 을 보내도 늘 먼저가 되지 않게 · NO_BUZZ(안 누름)는 그대로
      st.bz[seat] = r >= NO_BUZZ ? NO_BUZZ : Math.max(HMIN, Math.min(NO_BUZZ, r));
      if (st.bz[0] !== null && st.bz[1] !== null) resolveBuzz(st);
      return { ok: true };
    }
    if (st.phase === "call") {
      if (a.t === "timeout") {
        st.calls++;
        st.last = { s: seat, c: null, v: null, valid: false, val: null, hit: false, tmo: true, r: st.round, n: st.calls, newc: 0, void: st.calls >= MAXCALLS };
        push(st, { k: "call", r: st.round, s: seat, tmo: 1, n: st.calls });
        if (st.last.void) endRound(st, -1, "");
        st.phase = "show";
        return { ok: true };
      }
      if (a.t !== "call" || !validCall(a.c)) return { ok: false, err: "서로 다른 칸 3개를 골라요" };
      const c = a.c.slice(), vals = c.map(i => st.back[i]), newc = c.filter(i => !st.rev[i]).length;
      for (const i of c) st.rev[i] = true;
      const j = judge(vals, st.target);
      st.calls++;
      st.last = { s: seat, c, v: vals.slice(), valid: j.valid, val: j.val, hit: j.hit, tmo: false, r: st.round, n: st.calls, newc, void: !j.hit && st.calls >= MAXCALLS };
      push(st, { k: "call", r: st.round, s: seat, c, hit: j.hit, n: st.calls });
      if (j.hit) {
        st.score[seat]++;
        endRound(st, seat, `${vals[0]} ${vals[1]} ${vals[2]}`);
        if (st.score[seat] >= st.goal) { st.over = true; st.phase = "end"; push(st, { k: "end" }); }
        else st.phase = "show";
      } else {
        if (st.last.void) endRound(st, -1, "");
        st.phase = "show";
      }
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = st => (st.phase === "show" ? (st.last && st.last.hit ? 3400 : 2800) : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    const L = st.last;
    if (L.hit || L.void) { startRound(st); return; }
    st.caller = 1 - L.s; st.phase = "call";
  }
  const over = st => !!st.over;
  const ranks = st => st.score.map(c => st.score.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "look") return [{ t: "ready" }];
    if (st.phase === "buzz") return [{ t: "buzz", ms: NO_BUZZ }];
    return [{ t: "call", c: [0, 1, 2] }, { t: "call", c: [3, 4, 5] }, { t: "call", c: [6, 7, 8] }, { t: "timeout" }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // back: 지금 그 자리가 값을 아는 칸 (look 단계엔 전부 · 이후엔 호명으로 공개된 칸만 · 'all' 은 전부)
  // mem: 그 자리가 외운 칸 (기억 풀 12칸의 [칸, 값] — 앞에서부터 단계별로 쓰는 만큼만 AI 가 씀) · rd: 그 자리 AI 의 반응 · 실수 난수 — 둘 다 상대 것은 안 실림
  function view(st, seat) {
    const all = seat === "all", s = seat === 0 || seat === 1 ? seat : -1, look = st.phase === "look";
    const back = st.back.map((v, i) => (all || look || st.rev[i] ? v : null));
    const L = st.last;
    const pubObj = { r: st.round, p: st.phase, sc: st.score, rv: st.rev.map((x, i) => (x ? st.back[i] : 0)), c: st.caller, k: st.calls, t: st.target, rdy: st.rdy, l: L ? [L.s, L.n, L.hit ? 1 : 0, L.c] : 0, w: st.phase === "call" || st.phase === "show" ? st.log.filter(e => e.k === "buzz" && e.r === st.round).map(e => e.w) : 0, ov: st.over };
    return {
      n: 2, goal: st.goal, season: st.season, cfg: Object.assign({}, st.opt), phase: st.phase, round: st.round, target: look ? 0 : st.target, score: st.score.slice(),
      back, rev: st.rev.slice(), rdy: st.rdy.slice(), caller: st.caller, calls: st.calls, first: st.first, last: L ? Object.assign({}, L, { c: L.c ? L.c.slice() : null, v: L.v ? L.v.slice() : null }) : null,
      mine: s >= 0 ? st.bz[s] !== null : false,
      mem: s >= 0 ? st.mem[s].slice(0, MEMPOOL).map(c => ({ c, v: st.back[c] })) : null,
      rd: s >= 0 ? st.rd[s].slice() : null,
      hist: st.hist.map(h => Object.assign({}, h, { bz: h.bz ? h.bz.slice() : null })), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-30).map(e => Object.assign({}, e)), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 확률 · 풀이 찾기 (AI · 선생님 · 복기가 같이 씀) ────────
  // known[i] = 값 (모르면 undefined). 남은 값(아직 어디 있는지 모르는 값)은 모르는 칸에 무작위로 놓였다고 봐요.
  const CODE = { "+": 13, "−": 14, "×": 15, "÷": 16, "√": 17 };
  const code = v => (v === undefined ? 0 : typeof v === "number" ? v : CODE[v]);
  function makeProb(known, season, target) {
    const all = NUMS.concat(OPS[season]), kset = new Set(); for (const v of known) if (v !== undefined) kset.add(v);
    const rem = all.filter(v => !kset.has(v)), memo = new Float64Array(18 * 18 * 18).fill(-1);
    const hit3 = (a, o, b) => isNum(a) && isOp(o) && isNum(b) && ev(a, o, b) === target;
    return (i, j, k) => {
      const vi = known[i], vj = known[j], vk = known[k], key = (code(vi) * 18 + code(vj)) * 18 + code(vk);
      if (memo[key] >= 0) return memo[key];
      const vv = [vi, vj, vk], pos = []; for (let q = 0; q < 3; q++) if (vv[q] === undefined) pos.push(q);
      let cnt = 0, tot = 0;
      const rec = (d, used) => {
        if (d === pos.length) { tot++; if (hit3(vv[0], vv[1], vv[2])) cnt++; return; }
        for (let x = 0; x < rem.length; x++) { if (used & (1 << x)) continue; vv[pos[d]] = rem[x]; rec(d + 1, used | (1 << x)); }
        vv[pos[d]] = undefined;
      };
      rec(0, 0);
      return (memo[key] = tot ? cnt / tot : 0);
    };
  }
  const trip = (i, j, k) => ((Math.imul(i + 1, 73856093) ^ Math.imul(j + 1, 19349663) ^ Math.imul(k + 1, 83492791)) >>> 0);
  // 가장 정답 확률이 높은 호명. 같으면 새로 공개되는 칸이 적은 것(상대에게 정보를 덜 줌) → 그래도 같으면 salt 로 섞은 고정 순서.
  // lam = 새로 공개되는 칸 하나당 깎는 값 (0 이면 확률만 봄). nSure = 정답 확률 100% 인 호명의 수 (풀이가 얼마나 흔한지)
  function bestCall(known, rev, season, target, salt, lam) {
    const prob = makeProb(known, season, target);
    let best = null, nSure = 0;
    for (let i = 0; i < 16; i++) {
      if (isOp(known[i])) continue;                       // 첫 칸은 숫자여야 해서, 기호로 아는 칸은 건너뜀
      for (let j = 0; j < 16; j++) {
        if (j === i || isNum(known[j])) continue;
        for (let k = 0; k < 16; k++) {
          if (k === i || k === j || isOp(known[k])) continue;
          const p = prob(i, j, k);
          if (p >= 0.999999) nSure++;
          const alive = p > 1e-12;                             // 정답 확률이 0 인 호명(이미 틀린 식)은 맞힐 가능성이 있는 호명이 하나라도 있으면 고르지 않음
          if (best && best.alive && !alive) continue;
          const newc = (rev[i] ? 0 : 1) + (rev[j] ? 0 : 1) + (rev[k] ? 0 : 1), sc = p - (lam || 0) * newc, tk = (trip(i, j, k) ^ salt) >>> 0;
          if (!best || (alive && !best.alive) || sc > best.sc + 1e-9 || (Math.abs(sc - best.sc) <= 1e-9 && (newc < best.newc || (newc === best.newc && tk > best.tk)))) best = { c: [i, j, k], p, newc, sc, tk, alive };
        }
      }
    }
    if (best) best.nSure = nSure;
    return best;
  }
  // 풀이가 확실한 호명들 (정답 확률 100%) — 선생님이 예시로 보여 줌
  function sureCalls(known, season, target, max) {
    const prob = makeProb(known, season, target), out = [];
    for (let i = 0; i < 16; i++) { if (!isNum(known[i])) continue; for (let j = 0; j < 16; j++) { if (j === i || !isOp(known[j])) continue; for (let k = 0; k < 16; k++) {
      if (k === i || k === j || !isNum(known[k])) continue;
      if (prob(i, j, k) >= 0.999999) { out.push([i, j, k]); if (out.length >= (max || 3)) return out; }
    } } }
    return out;
  }
  const callProb = (known, season, target, c) => makeProb(known, season, target)(c[0], c[1], c[2]);
  // view → (알려진 칸) — 공개된 칸 + 기억 k 칸
  function knowFrom(V, k) {
    const known = new Array(16).fill(undefined);
    for (let i = 0; i < 16; i++) if ((V.rev[i] || V.phase === "look") && V.back[i] !== null && V.back[i] !== undefined) known[i] = V.back[i];   // 'all' view 라도 공개된 칸만 '아는' 것으로 침
    if (k > 0 && Array.isArray(V.mem)) for (let q = 0; q < Math.min(k, V.mem.length); q++) known[V.mem[q].c] = V.mem[q].v;
    return known;
  }

  // ── AI ────────────────────────────────────────────────────
  // mem = 외운 칸 수 · ms 구간 = 버저 반응 시간 · thr = 이 확률 이상일 때만 누름 · miss = 아는 답도 못 누를 확률 · rash = 모르는데 누를 확률 ·
  // err = 호명 실수(칸 하나를 다른 칸으로) · wild = 뻔한 실수(아무 칸 3개) · lam = 새로 공개되는 칸을 꺼리는 정도
  const PROF = {
    easy:   { mem: 4,  msLo: 3200, msHi: 5600, thr: 0.34, miss: 0.25, rash: 0.2,  err: 0.12, wild: 0.2,  lam: 0 },
    normal: { mem: 8,  msLo: 1500, msHi: 3000, thr: 0.6,  miss: 0.05, rash: 0,    err: 0.05, wild: 0,    lam: 0.01 },
    hard:   { mem: 12, msLo: 950,  msHi: 2700, thr: 0.5,  miss: 0,    rash: 0,    err: 0.03, wild: 0,    lam: 0.03 },
    human:  { mem: 10, msLo: 1000, msHi: 2200, thr: 1,    miss: 0.08, rash: 0,    err: 0.04, wild: 0,    lam: 0.01 },   // 시험용 사람 대역 (암기 50~70% · 풀이를 알 때 1.0~2.2초 · 풀이를 못 찾는 라운드 8%)
  };
  const frac = x => x - Math.floor(x);
  const saltOf = V => (Math.imul(V.round + 1, 2654435761) ^ Math.imul(V.calls + 7, 40503)) >>> 0;   // 확률이 같은 호명 가운데 고르는 고정 순서 (선생님 추천과 고급 AI 가 같게)
  function aiWith(V, me, P, r) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    if (V.phase === "look") return { t: "ready" };
    const rd = V.rd || [0.5, 0.5, 0.5], known = knowFrom(V, P.mem), salt = saltOf(V);
    if (V.phase === "buzz") {
      const bp = bestCall(known, V.rev, V.season, V.target, salt, P.lam);
      let press = bp.p >= P.thr;
      if (press && bp.p >= 0.999999 && rd[1] < P.miss) press = false;
      if (!press && P.rash && frac(rd[1] * 7.31) < P.rash) press = true;
      if (!press) return { t: "buzz", ms: NO_BUZZ };
      // 풀이가 드물수록(곱 하나뿐인 큰 수 등) 찾는 데 오래 걸리고, 추측으로 누르면 더 늦어요
      const sure = bp.p >= 0.999999, mult = sure ? 0.85 + 0.5 / (1 + bp.nSure / 4) : 1, lag = sure ? 0 : 700;
      return { t: "buzz", ms: Math.max(MIN_MS, Math.round((P.msLo + (P.msHi - P.msLo) * rd[0]) * mult + lag)) };
    }
    if (V.phase !== "call") return null;
    const u = frac(rd[2] * 977.13 + V.calls * 0.6180339), u2 = frac(rd[0] * 331.7 + V.calls * 0.4142135);
    const pick = (q, ex) => { const o = []; for (let i = 0; i < 16; i++) if (!ex.includes(i)) o.push(i); return o[Math.floor(frac(q) * o.length)]; };
    if (P.wild && u < P.wild) {      // 뻔한 실수: 순서를 따지지 않고 아무 칸 3개
      const a = pick(u2 * 13.7, []), b = pick(u2 * 29.3 + 0.37, [a]), c = pick(u2 * 41.9 + 0.71, [a, b]);
      return { t: "call", c: [a, b, c] };
    }
    const bp = bestCall(known, V.rev, V.season, V.target, salt, P.lam), c = bp.c.slice();
    if (P.err && u < P.err + (P.wild || 0)) {      // 슬립: 칸 하나를 다른 칸으로 (또는 앞뒤를 바꿈)
      if (u2 < 0.5) { const t = c[0]; c[0] = c[2]; c[2] = t; }
      else { const q = Math.floor(u2 * 6) % 3; c[q] = pick(u * 53.1, c); }
    }
    return { t: "call", c };
  }
  function ai(V, me, tier, r) { return aiWith(V, me, PROF[tier] || PROF.normal, r); }

  // ── 선생님 · 복기가 쓰는 '공개된 칸만으로' 본 추천 ─────────
  // 외운 칸은 core 가 모르니(사람의 머릿속) 화면에 공개된 칸만 쓰고, 고급 AI 와 같은 확률 · 공개 정보 기준으로 골라요.
  function recommend(V) {
    const known = knowFrom(V, 0), bp = bestCall(known, V.rev, V.season, V.target, saltOf(V), PROF.hard.lam), sure = sureCalls(known, V.season, V.target, 3);
    return { known, best: bp, sure };
  }

  // ── AI 선생님 (보이는 것만 읽음) ──────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const sec = ms => (ms >= NO_BUZZ ? "안 누름" : (ms / 1000).toFixed(1) + "초");
  const cellTxt = (i, known) => `${LET[i]}${known && known[i] !== undefined ? `(${known[i]})` : ""}`;
  const callTxt = (c, known) => c.map(i => cellTxt(i, known)).join(" → ");
  const formulaOf = (c, known) => (c.every(i => known[i] !== undefined) ? c.map(i => known[i]).join(" ") : "");
  function buzzStats(V, opp) {
    let n = 0, pressed = 0, first = 0, tot = 0;
    for (const h of V.hist || []) { if (!h.bz) continue; n++; if (h.bz[opp] < NO_BUZZ) { pressed++; tot += h.bz[opp]; } if (h.first === opp && !(h.bz[0] >= NO_BUZZ && h.bz[1] >= NO_BUZZ)) first++; }
    return { n, pressed, first, avg: pressed ? tot / pressed : 0 };
  }
  // opt.full 이 아니면 💡 는 단계 힌트 — 정답 식(칸 · 값)은 가리고 '있다 · 쓰는 기호' 만, '한 번 더' 를 눌러야 전체 (opt.full)
  function coach(V, me, since, names, opt) {
    const full = !!(opt && opt.full);
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`;
    const opp = 1 - me, who = nm(opp), S = V.score, goal = V.goal;
    const known = knowFrom(V, 0), nRev = known.filter(x => x !== undefined).length, B = buzzStats(V, opp);
    const scoreTxt = `점수 나 ${S[me]} : ${who} ${S[opp]} (먼저 ${goal}점)`;
    const stat = B.n ? ` 지난 ${B.n}라운드 동안 ${who}${eun(who)} 버저를 ${B.pressed}번 눌렀고(평균 ${(B.avg / 1000).toFixed(1)}초) 먼저 누른 건 ${B.first}번이에요.` : " 첫 라운드라 상대의 버저 기록은 아직 없어요 (누른 시간은 둘 다 누른 뒤에 알 수 있어요).";
    if (V.over) {
      const voids = (V.hist || []).filter(h => h.w < 0).length, myW = (V.hist || []).filter(h => h.w === me).length;
      return { opp: `승부가 끝났어요.${stat}`, mine: `${scoreTxt} → ${S[me] > S[opp] ? "내가 이겼어요" : S[me] < S[opp] ? "아쉽지만 졌어요" : "비겼어요"}`, rec: "한 판 더 해 봐요!", why: `내가 맞힌 라운드 ${myW}번 · 무효 ${voids}번. 이 게임은 외운 칸이 많을수록 풀이를 빨리 찾아 버저를 먼저 누르고, 틀린 호명은 두 사람 모두에게 칸을 알려 줘요.` };
    }
    const L = V.last;
    if (V.phase === "look") {
      return { opp: `${who}도 지금 같은 판을 외우는 중이에요 — 두 사람이 똑같이 ${V.cfg.look || 5}초 동안 모든 뒷면을 봐요.`, mine: `외울 칸 16개 (숫자 12 · 기호 4) · ${scoreTxt}`, rec: "기호 4칸의 위치와 큰 수(9 이상)가 어디 있는지부터 외워요", why: "한 번 공개된 칸은 둘 다 알게 되니까, 처음에 외운 칸은 첫 몇 라운드에서만 큰 무기예요. 기호 칸을 모르면 어떤 식도 못 만들어요." };
    }
    if (V.phase === "buzz") {
      const rc = recommend(V), nSure = rc.sure.length, T = V.target;
      const opp1 = `${who}도 타깃 ${T}${eul(T)} 보고 있어요.${stat}`;
      const opS = nSure ? rc.known[rc.sure[0][1]] : "", hint1 = nSure ? `공개된 칸만으로 만들 수 있어요 (쓰는 기호는 ${opS})` : `공개된 칸만으로는 확실한 식이 아직 없어요`;
      const mine = `${scoreTxt} · 공개된 칸 ${nRev}/16 · 타깃 ${T}${nSure ? `${iga(T)} ${full ? `공개된 칸만으로 ${rc.sure.map(c => formulaOf(c, rc.known)).join(" / ")} 처럼 만들어져요` : "공개된 칸만으로 만들어져요"}` : `${iga(T)} 공개된 칸만으로는 아직 못 만들어요`}`;
      if (V.mine) return { opp: opp1, mine, rec: "버저를 눌렀어요 — 상대가 누른 시간과 견주는 중이에요", why: `누른 시간이 더 빠른 쪽이 5초 안에 호명할 기회를 얻어요 (같으면 딜러가 정해요).` };
      if (nSure) return full ? { opp: opp1, mine, rec: `지금 바로 버저! 호명 ${callTxt(rc.sure[0], rc.known)}`, why: `정답 확률 100% (공개된 칸의 식 ${formulaOf(rc.sure[0], rc.known)} = ${T}) · 새로 공개되는 칸 ${rc.sure[0].filter(i => !V.rev[i]).length}개 → 상대에게 줄 정보도 없어요.` }
        : { opp: opp1, mine, rec: `${hint1} — 풀이가 보이면 바로 버저!`, why: `식이 떠오르면 눌러요. 전체 풀이(칸 · 식)는 '한 번 더' 로 볼 수 있어요.`, more: true };
      const b = rc.best;
      return { opp: opp1, mine, rec: `외운 칸으로 풀이가 떠오르면 버저, 아니면 넘기기${full ? ` (추측이라면 ${callTxt(b.c, rc.known)})` : ""}`, why: `공개된 칸만 보면 가장 높은 호명도 정답 확률 약 ${pc(b.p)}예요 · 새로 공개되는 칸 ${b.newc}개 → 틀리면 상대가 그 칸을 보고 호명해요. 둘 다 안 누르면 딜러가 순서를 정해요.${full ? "" : " 추측할 호명은 '한 번 더' 로 볼 수 있어요."}`, more: !full };
    }
    if (V.phase === "call") {
      const mineTurn = V.caller === me, T = V.target;
      const last = L && !L.tmo ? ` 방금 ${nm(L.s)}${eun(nm(L.s))} ${callTxt(L.c, known)} → ${L.valid ? `${L.v.join(" ")} = ${L.val}` : "식이 안 됐어요"}.` : L && L.tmo ? ` 방금 ${nm(L.s)}${eun(nm(L.s))} 시간 안에 못 불렀어요.` : "";
      const buzzLog = (V.log || []).slice().reverse().find(e => e.k === "buzz" && e.r === V.round);
      const first = buzzLog && V.calls === 0 ? ` 버저는 ${nm(buzzLog.w)}${iga(nm(buzzLog.w))} ${buzzLog.forced ? "딜러가 정해서" : `먼저 눌렀어요(${sec(buzzLog.ms[buzzLog.w])} · 상대 ${sec(buzzLog.ms[1 - buzzLog.w])})`}.` : "";
      const opp1 = mineTurn ? `${who}${eun(who)} 호명을 기다리는 중이에요.${first}${last}` : `${who}${iga(who)} 호명하는 중이에요 — ${V.calls}번째 기회예요.${first}${last}`;
      const rc = recommend(V), nSure = rc.sure.length;
      const mine = `${scoreTxt} · 공개된 칸 ${nRev}/16 · 이번 라운드 호명 ${V.calls}번째 (24번째 호명까지 못 맞히면 무효)`;
      if (!mineTurn) return { opp: opp1, mine, rec: "상대가 호명하는 동안 방금 공개된 칸을 다시 외워요", why: `틀리면 내 차례예요. 지금 공개된 칸 ${nRev}개로 타깃 ${T}${eul(T)} 만드는 식: ${nSure ? (full ? rc.sure.map(c => formulaOf(c, rc.known)).join(" / ") : `있어요 (쓰는 기호 ${rc.known[rc.sure[0][1]]}) — 식은 '한 번 더' 로`) : "아직 없어요"}.`, more: !!nSure && !full };
      if (nSure) return full ? { opp: opp1, mine, rec: `${callTxt(rc.sure[0], rc.known)} (숫자 → 기호 → 숫자)`, why: `정답 확률 100% (${formulaOf(rc.sure[0], rc.known)} = ${T}) · 새로 공개되는 칸 ${rc.sure[0].filter(i => !V.rev[i]).length}개.` }
        : { opp: opp1, mine, rec: `공개된 칸만으로 확실한 식이 있어요 (쓰는 기호는 ${rc.known[rc.sure[0][1]]}) — 숫자 → 기호 → 숫자로 불러요`, why: `정답 확률 100% · 새로 공개되는 칸 ${rc.sure[0].filter(i => !V.rev[i]).length}개. 어느 칸인지는 '한 번 더' 로 볼 수 있어요.`, more: true };
      const b = rc.best;
      return { opp: opp1, mine, rec: full ? `${callTxt(b.c, rc.known)} (숫자 → 기호 → 숫자)` : `정답이 확실한 식은 없어요 — 가장 그럴듯한 호명을 '한 번 더' 로 볼 수 있어요`, why: `공개된 칸 기준 가장 높은 확률 ${pc(b.p)} · 새로 공개되는 칸 ${b.newc}개 — 틀려도 상대에게 주는 정보는 이 칸들이에요. 외운 칸으로 아는 식이 있으면 그걸 우선!`, more: !full };
    }
    // show: 방금 호명의 결과
    const T = V.target;
    if (L) {
      const who2 = nm(L.s);
      const op = L.tmo ? `${who2}${iga(who2)} 시간 안에 호명하지 못해 기회가 넘어가요.` : `${who2}${iga(who2)} ${callTxt(L.c, known)} 를 불러 ${L.valid ? `${L.v.join(" ")} = ${L.val}` : `${L.v.join(" · ")} (숫자 → 기호 → 숫자가 아니라 식이 안 돼요)`} → ${L.hit ? "정답!" : `타깃 ${T}${eun(T)} 아니에요.`}`;
      const next = L.hit ? "다음 라운드에서 새 타깃이 나와요." : L.void ? "호명이 24번을 넘어 이번 라운드는 무효예요." : `${nm(1 - L.s)}에게 기회가 넘어가요.`;
      return { opp: op, mine: `${scoreTxt} · 공개된 칸 ${nRev}/16`, rec: next, why: L.hit ? `${nm(L.s)}${eun(nm(L.s))} 이제 ${S[L.s]}/${goal}점이에요.` : `이제 공개된 칸이 ${nRev}개라 정답을 찾을 확률이 올라가요 — 공개된 칸에서 타깃 ${T}${eul(T)} 만드는 식을 찾아 두세요.` };
    }
    return { opp: `${who}의 점수는 ${S[opp]}점이에요.`, mine: scoreTxt, rec: "다음 라운드를 준비해요", why: "" };
  }

  return { id: "gn-samenum", LET, NUMS, OPS, PROF, NO_BUZZ, MAXCALLS, MEMPOOL, MIN_MS, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, coach, recommend, legalTargets, judge, ev, makeProb, bestCall, sureCalls, callProb, knowFrom, validCall, isOp, isNum };
});

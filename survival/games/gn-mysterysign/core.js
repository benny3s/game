/* 베니 서바이벌 · 미스터리 사인 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 그랜드 파이널 12화 결승 2회전 (장동민 vs 김경훈) — tvN Joy 「Finals Round 2 Mystery Sign Rules Video」 · tvN D ENT 「결승매치 미스터리 사인」 규칙 설명 · 경기 화면 확인
   · 1:1 · 11라운드. 라운드마다 두 숫자와 미스터리 사인(❓)으로 된 문제 한 개 (예 22 ❓ 7 = ?). 숨은 규칙은 두 숫자를 넣어 정답을 만드는 하나의 식
   · 문제가 열리면 두 사람이 0을 뺀 숫자를 하나씩 내요 → 같은 규칙에 [선 플레이어의 숫자 = 앞, 후 플레이어의 숫자 = 뒤] 를 넣은 결과가 힌트
     (선은 힌트마다 번갈아요 · 후 플레이어는 선이 낸 숫자를 보고 정해요)
   · 힌트가 열리면 1분 — 규칙을 찾은 사람이 먼저 버저. 먼저 누른 사람이 정답을 대요: 맞으면 +1 (라운드 끝) · 틀리면 −1 하고 기회가 상대에게 넘어가요
     1분 안에 아무도 못 맞히면 새 숫자로 다음 힌트. 힌트 16개까지 아무도 못 맞히면 다음 문제 (그 라운드는 무효)
   · 아이템 (한 번씩): 더블 스코어 (라운드 시작 때 쓰면 그 라운드 정답의 승점을 2배) · 시크릿 (그 라운드 첫 힌트에서 내가 낸 숫자를 상대에게 감춤) · 무감점 (그 라운드 오답에 감점 없음)
   · 11라운드 뒤 승점이 더 높은 사람이 승리
   재현 약속: 시계 · Math.random 을 안 써요. 버저 시각은 행동 {t:"buzz", ms} 로 실려 오고(사람 = UI 가 잰 값, AI = ai() 가 정한 값), 시간 제한은 {t:"timeout"} 행동으로 와요.
   AI 의 반응 · 규칙 지식 · 아이템 계획 난수는 라운드(또는 판) 시작에 씨앗 난수로 미리 뽑아 두고 그 자리 view 에만 실려요 (상대 것은 안 보임).
   숫자는 모두 문자열로 st 에 두고(복기 지문 · JSON 호환) 계산에만 BigInt 를 써요. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-mysterysign"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NO_BUZZ = 99999, WINDOW = 60000, MAXH = 16, MAXN = 9999999, RDN = 3 * 16 + 8;
  const ITEMS = ["double", "safe", "secret"];
  const ITEM_NAME = { double: "더블 스코어", safe: "무감점", secret: "시크릿" };

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ── 숨은 규칙 (방송 11개 + 방송 규칙 영상의 예시 + 문제 종류를 늘리려고 더한 것) ──────────────
  const abs = x => (x < 0n ? -x : x);
  const ds = x => abs(x).toString();
  const dsum = s => { let t = 0; for (let i = 0; i < s.length; i++) t += s.charCodeAt(i) - 48; return t; };
  const gcdB = (a, b) => { a = abs(a); b = abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  const HOLE = [1, 0, 0, 0, 0, 0, 1, 0, 2, 1];                      // 0 · 6 · 9 = 구멍 1개, 8 = 2개 (4 는 열린 모양으로 0개 — 영상 힌트 74 ❓ 51 = 0 으로 확인)
  let PR = null;                                                    // 소수표 (처음 쓸 때 한 번만 · 1천만 이하)
  function primes() {
    if (PR) return PR;
    const N = 10000000, s = new Uint8Array(N + 1), out = [];
    for (let i = 2; i <= N; i++) { if (!s[i]) { out.push(i); if (i * i <= N) for (let j = i * i; j <= N; j += i) s[j] = 1; } }
    return (PR = Int32Array.from(out));
  }
  function piOf(x) { const P = primes(); let lo = 0, hi = P.length; while (lo < hi) { const m = (lo + hi) >> 1; if (P[m] <= x) lo = m + 1; else hi = m; } return lo; }
  const mn = (a, b) => (a < b ? a : b), mx = (a, b) => (a > b ? a : b);
  const rev = x => BigInt(ds(x).split("").reverse().join(""));
  const RULES = [
    // 방송 1~11라운드 (tv = 라운드 번호)
    { id: "dblsub", tv: 1, kind: "식 만들기", name: "앞 수의 2배 − 뒤 수", txt: "앞 수의 두 배에서 뒤 수를 뺀 값", f: (a, b) => 2n * a - b },
    { id: "sumdiff", tv: 2, kind: "이어 쓰기", name: "합 · 차 이어 쓰기", txt: "(두 수의 합)과 (두 수의 차)를 이어 쓴 수", f: (a, b) => BigInt(String(a + b) + String(abs(a - b))) },
    { id: "modbig", tv: 3, kind: "나머지", name: "큰 수 ÷ 작은 수의 나머지", txt: "큰 수를 작은 수로 나눈 나머지", f: (a, b) => (a >= b ? a % b : b % a) },
    { id: "dsumprod", tv: 4, kind: "자릿수", name: "(자리 합) × (자리 합)", txt: "(앞 수의 각 자리 수의 합) × (뒤 수의 각 자리 수의 합)", f: (a, b) => BigInt(dsum(ds(a)) * dsum(ds(b))) },
    { id: "countsay", tv: 5, kind: "이어 쓰기", name: "숫자 + 개수 세어 쓰기", txt: "두 수를 이어 쓴 숫자들을 처음 나온 순서대로 '숫자 + 그 숫자의 개수' 로 이어 쓴 수", f: (a, b) => { const s = ds(a) + ds(b), cnt = {}, ord = []; for (const c of s) { if (!cnt[c]) ord.push(c); cnt[c] = (cnt[c] || 0) + 1; } return BigInt(ord.map(c => c + cnt[c]).join("")); } },
    { id: "dsumall", tv: 6, kind: "자릿수", name: "모든 자리 수의 합", txt: "두 수의 모든 자리 수를 더한 값", f: (a, b) => BigInt(dsum(ds(a) + ds(b))) },
    { id: "clock12", tv: 7, kind: "나머지", name: "합 ÷ 12 의 나머지 (시계)", txt: "(두 수의 합) ÷ 12 의 나머지 값 (시계 문제)", f: (a, b) => (a + b) % 12n },
    { id: "holes", tv: 8, kind: "모양", name: "구멍 개수", txt: "두 수에 들어 있는 숫자의 구멍 개수를 모두 더한 값 (0 · 6 · 9 는 1개, 8 은 2개)", f: (a, b) => { let t = 0; for (const c of ds(a) + ds(b)) t += HOLE[+c]; return BigInt(t); } },
    { id: "sumtimesb", tv: 9, kind: "식 만들기", name: "(합) × 뒤 수", txt: "(두 수의 합) × 뒤 수", f: (a, b) => (a + b) * b },
    { id: "gcd", tv: 10, kind: "약수", name: "최대공약수", txt: "두 수의 최대공약수", f: (a, b) => gcdB(a, b) },
    { id: "primesbetween", tv: 11, kind: "약수", name: "사이 소수 개수", txt: "두 수 사이(두 수는 빼고)에 있는 소수의 개수", f: (a, b) => { const lo = Number(mn(a, b)), hi = Number(mx(a, b)); return hi - lo < 2 ? 0n : BigInt(piOf(hi - 1) - piOf(lo)); } },
    // 방송 규칙 영상의 예시 + 더한 규칙 (tv = 0)
    { id: "sqsum", tv: 0, kind: "식 만들기", name: "제곱의 합", txt: "두 수를 각각 제곱해서 더한 값", f: (a, b) => a * a + b * b },
    { id: "dsumofprod", tv: 0, kind: "자릿수", name: "곱의 자리 합", txt: "두 수의 곱의 각 자리 수를 더한 값", f: (a, b) => BigInt(dsum(ds(a * b))) },
    { id: "quotbig", tv: 0, kind: "나머지", name: "큰 수 ÷ 작은 수의 몫", txt: "큰 수를 작은 수로 나눈 몫", f: (a, b) => (a >= b ? a / b : b / a) },
    { id: "lcm", tv: 0, kind: "약수", name: "최소공배수", txt: "두 수의 최소공배수", f: (a, b) => (a / gcdB(a, b)) * b },
    { id: "concat", tv: 0, kind: "이어 쓰기", name: "이어 붙이기", txt: "앞 수 뒤에 뒤 수를 이어 붙인 수", f: (a, b) => BigInt(ds(a) + ds(b)) },
    { id: "digrange", tv: 0, kind: "자릿수", name: "가장 큰 자리 − 가장 작은 자리", txt: "두 수의 모든 자리 수 중 가장 큰 수에서 가장 작은 수를 뺀 값", f: (a, b) => { const s = ds(a) + ds(b); let hi = 0, lo = 9; for (const c of s) { hi = Math.max(hi, +c); lo = Math.min(lo, +c); } return BigInt(hi - lo); } },
    { id: "prodmod7", tv: 0, kind: "나머지", name: "곱 ÷ 7 의 나머지", txt: "(두 수의 곱) ÷ 7 의 나머지 값", f: (a, b) => (a * b) % 7n },
    { id: "sqminus", tv: 0, kind: "식 만들기", name: "앞 수 제곱 − 뒤 수", txt: "앞 수를 제곱한 값에서 뒤 수를 뺀 값", f: (a, b) => a * a - b },
    { id: "mult3", tv: 0, kind: "약수", name: "사이 3의 배수 개수", txt: "두 수 사이(두 수는 빼고)에 있는 3의 배수의 개수", f: (a, b) => { const lo = mn(a, b), hi = mx(a, b); return hi - lo < 2n ? 0n : (hi - 1n) / 3n - lo / 3n; } },
    { id: "odddigs", tv: 0, kind: "모양", name: "홀수 숫자 개수", txt: "두 수에 들어 있는 홀수 숫자(1 · 3 · 5 · 7 · 9)의 개수", f: (a, b) => { let t = 0; for (const c of ds(a) + ds(b)) if ((+c) % 2) t++; return BigInt(t); } },
    { id: "revsum", tv: 0, kind: "자릿수", name: "뒤집어 더하기", txt: "두 수를 각각 거꾸로 뒤집어서 더한 값", f: (a, b) => rev(a) + rev(b) },
    { id: "threetwo", tv: 0, kind: "식 만들기", name: "3×앞 + 2×뒤", txt: "앞 수의 3배와 뒤 수의 2배를 더한 값", f: (a, b) => 3n * a + 2n * b },
  ];
  const NR = RULES.length, IDX = {}; RULES.forEach((r, i) => { IDX[r.id] = i; });
  const ALL = RULES.map((_, i) => i);
  const TV = [[22, 7], [16, 9], [4, 19], [21, 15], [11, 14], [17, 23], [18, 13], [8, 10], [7, 4], [16, 24], [27, 2]];   // 방송 1~11라운드 문제

  // 규칙 값 (같은 입력은 한 번만 계산 · 결과는 문자열)
  const cache = new Map();
  function ruleVal(i, a, b) {
    const key = i + "|" + a + "|" + b, c = cache.get(key);
    if (c !== undefined) return c;
    const v = RULES[i].f(BigInt(a), BigInt(b)).toString();
    if (cache.size > 400000) cache.clear();
    cache.set(key, v); return v;
  }
  const normNum = x => { const s = typeof x === "number" && Number.isInteger(x) ? String(x) : typeof x === "string" ? x : ""; return /^[1-9]\d{0,6}$/.test(s) ? s : null; };
  const normAns = x => { const s = typeof x === "number" && Number.isInteger(x) ? String(x) : typeof x === "string" ? x.trim() : ""; if (!/^-?\d{1,30}$/.test(s)) return null; return BigInt(s).toString(); };

  // ── 시작 · 단계 ───────────────────────────────────────────
  const optsOf = cfg => ({
    problems: cfg.problems === "new" ? "new" : "tv",
    rounds: [5, 7, 11].includes(+cfg.rounds) ? +cfg.rounds : 11,
    items: cfg.items === "eq" || cfg.items === "none" ? cfg.items : "tv",
  });
  const hasItem = it => !!(it.double || it.safe || it.secret);
  function buildSched(st, o, cfg) {
    if (Array.isArray(cfg.sched) && cfg.sched.length) return cfg.sched.map(s => ({ rule: IDX[s.rule], a: normNum(s.a), b: normNum(s.b) })).filter(s => s.rule !== undefined && s.a && s.b);
    if (o.problems === "tv") return TV.slice(0, o.rounds).map((p, i) => ({ rule: i, a: String(p[0]), b: String(p[1]) }));
    const ids = shuffle(st, ALL.slice()), out = [];
    for (let k = 0; k < o.rounds; k++) {
      const rule = ids[k], a = 2 + Math.floor(rnd(st) * 29);
      let b = 2 + Math.floor(rnd(st) * 29); if (b === a) b = a + 1 + Math.floor(rnd(st) * 5);
      out.push({ rule, a: String(a), b: String(b) });
    }
    return out;
  }
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    const o = optsOf(cfg);
    const st = { n: 2, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, round: 0, rounds: o.rounds, sched: [], score: [0, 0], phase: "", over: false,
      first0: 0, first: 0, items: [{ double: 0, safe: 0, secret: 0 }, { double: 0, safe: 0, secret: 0 }], ri: { double: [0, 0], safe: [0, 0], secret: [0, 0] }, dec: [true, true],
      kn: [], plan: [], rd: [[], []], cur: null, hints: [], hintNo: 0, front: 0, pend: null, bz: [null, null], bzMs: null, caller: -1, tries: 0, wrong: [], last: null, hist: [], log: [], seq: 0 };
    st.first0 = cfg.first0 === 0 || cfg.first0 === 1 ? cfg.first0 : (rnd(st) < 0.5 ? 0 : 1);
    const own = cfg.owner === 0 || cfg.owner === 1 ? cfg.owner : (rnd(st) < 0.5 ? 0 : 1);
    if (o.items === "tv") { st.items[own] = { double: 1, safe: 1, secret: 0 }; st.items[1 - own] = { double: 0, safe: 0, secret: 1 }; }
    else if (o.items === "eq") st.items = [{ double: 1, safe: 1, secret: 1 }, { double: 1, safe: 1, secret: 1 }];
    st.sched = buildSched(st, o, cfg);
    st.rounds = Math.min(st.rounds, st.sched.length);
    st.kn = [shuffle(st, ALL.slice()), shuffle(st, ALL.slice())];
    const R = st.rounds;
    st.plan = [0, 1].map(() => ({ double: Math.ceil(0.35 * R) + Math.floor(rnd(st) * (R - Math.ceil(0.35 * R) + 1)), safe: Math.ceil(0.25 * R) + Math.floor(rnd(st) * (R - Math.ceil(0.25 * R) + 1)), secret: 1 + Math.floor(rnd(st) * R) }));
    startRound(st);
    return st;
  }
  function startRound(st) {
    if (st.round >= st.rounds) { st.over = true; st.phase = "end"; push(st, { k: "end" }); return; }
    st.round++;
    const S = st.sched[st.round - 1];
    st.cur = { rule: S.rule, a: S.a, b: S.b, ans: ruleVal(S.rule, S.a, S.b) };
    st.first = (st.first0 + st.round - 1) % 2;
    st.hints = []; st.hintNo = 0; st.wrong = []; st.ri = { double: [0, 0], safe: [0, 0], secret: [0, 0] }; st.caller = -1; st.last = null; st.pend = null;
    st.rd = [0, 1].map(() => Array.from({ length: RDN }, () => rnd(st)));
    st.dec = [0, 1].map(s => !hasItem(st.items[s]));
    push(st, { k: "round", r: st.round, a: S.a, b: S.b });
    if (st.dec[0] && st.dec[1]) startHint(st); else st.phase = "item";
  }
  function startHint(st) {
    st.hintNo++; st.front = (st.first + st.hintNo - 1) % 2; st.pend = null; st.bz = [null, null]; st.bzMs = null; st.caller = -1; st.tries = 0; st.phase = "pick";
    push(st, { k: "hint", r: st.round, h: st.hintNo, f: st.front });
  }
  function endRoundHist(st, w, extra) {
    st.hist.push(Object.assign({ r: st.round, rule: st.cur.rule, a: st.cur.a, b: st.cur.b, ans: st.cur.ans, w, h: st.hintNo, dbl: st.ri.double.slice(), safe: st.ri.safe.slice(), sec: st.ri.secret.slice() }, extra || {}));
  }
  function endHint(st) {
    if (st.hintNo >= MAXH) {
      endRoundHist(st, -1);
      st.last = { end: true, void: true, s: -1, hit: false, r: st.round, rule: st.cur.rule, ans: st.cur.ans, gain: 0, h: st.hintNo };
      push(st, { k: "void", r: st.round });
      st.phase = "show"; return;
    }
    startHint(st);
  }
  function resolveBuzz(st) {
    const [m0, m1] = st.bz;
    let w;
    if (m0 >= NO_BUZZ && m1 >= NO_BUZZ) { push(st, { k: "buzz", r: st.round, h: st.hintNo, w: -1, ms: [m0, m1] }); st.bzMs = [m0, m1]; endHint(st); return; }
    if (m0 < m1) w = 0; else if (m1 < m0) w = 1; else w = rnd(st) < 0.5 ? 0 : 1;
    st.bzMs = [m0, m1]; st.caller = w; st.tries = 0; st.phase = "ans";
    push(st, { k: "buzz", r: st.round, h: st.hintNo, w, ms: [m0, m1] });
  }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "item") return [0, 1].filter(i => !st.dec[i]);
    if (st.phase === "pick") return [st.pend ? 1 - st.front : st.front];
    if (st.phase === "buzz") return [0, 1].filter(i => st.bz[i] === null);
    if (st.phase === "ans" || st.phase === "ans2") return [st.caller];
    return [];
  }
  function apply(st, seat, a) {
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "item") {
      if (a.t !== "item" || !Array.isArray(a.use)) return { ok: false, err: "아이템을 골라요 (안 쓰면 비워 두고 시작)" };
      const use = [...new Set(a.use)];
      if (!use.every(k => ITEMS.includes(k) && st.items[seat][k])) return { ok: false, err: "없는 아이템이에요" };
      for (const k of use) st.ri[k][seat] = 1;       // 아이템 수는 둘 다 고른 뒤에 줄여요 (먼저 고른 쪽의 선택이 view · pub 로 새지 않게)
      st.dec[seat] = true;
      if (st.dec[0] && st.dec[1]) {
        for (const s of [0, 1]) { const u = ITEMS.filter(k => st.ri[k][s]); for (const k of u) st.items[s][k] = 0; if (u.length) push(st, { k: "item", r: st.round, s, use: u }); }
        startHint(st);
      }
      return { ok: true };
    }
    if (st.phase === "pick") {
      if (a.t !== "num") return { ok: false, err: "숫자를 하나 내요" };
      const n = normNum(a.n);
      if (!n) return { ok: false, err: `0 을 뺀 1 ~ ${MAXN} 의 자연수를 내요` };
      if (!st.pend) { st.pend = { s: seat, n }; return { ok: true }; }
      const fa = st.pend.n, ba = n, f = st.front, hintNo = st.hintNo;
      const sec = [st.ri.secret[0] && hintNo === 1 ? 1 : 0, st.ri.secret[1] && hintNo === 1 ? 1 : 0];
      const v = ruleVal(st.cur.rule, fa, ba);
      st.hints.push({ i: hintNo, f, a: fa, b: ba, v, sec });
      st.pend = null; st.bz = [null, null]; st.phase = "buzz";
      push(st, { k: "hintv", r: st.round, h: hintNo, f, v });
      return { ok: true };
    }
    if (st.phase === "buzz") {
      if (a.t !== "buzz" || typeof a.ms !== "number" || !Number.isFinite(a.ms)) return { ok: false, err: "버저를 눌러요 (모르면 넘기기)" };
      const ms = Math.max(0, Math.round(a.ms));
      st.bz[seat] = ms >= WINDOW ? NO_BUZZ : ms;
      if (st.bz[0] !== null && st.bz[1] !== null) resolveBuzz(st);
      return { ok: true };
    }
    if (st.phase === "ans" || st.phase === "ans2") {
      if (a.t === "timeout" && st.phase === "ans2") a = { t: "pass" };      // 상대 기회에서 시간이 지나면 넘긴 것과 같아요 (감점 없음)
      if (a.t === "pass") {
        if (st.phase !== "ans2") return { ok: false, err: "버저를 눌렀으면 정답을 대야 해요" };
        push(st, { k: "pass", r: st.round, h: st.hintNo, s: seat });
        endHint(st); return { ok: true };
      }
      let n = null;
      if (a.t === "ans") { n = normAns(a.n); if (n === null) return { ok: false, err: "정답은 숫자로 써요" }; }
      else if (a.t !== "timeout") return { ok: false, err: "정답을 대요" };
      const stage = st.phase === "ans" ? 1 : 2, hit = n !== null && n === st.cur.ans;
      if (hit) {
        const mult = st.ri.double[seat] ? 2 : 1;
        st.score[seat] += mult;
        st.last = { end: true, void: false, s: seat, n, hit: true, tmo: false, stage, r: st.round, h: st.hintNo, rule: st.cur.rule, ans: st.cur.ans, gain: mult, mult };
        endRoundHist(st, seat, { mult });
        push(st, { k: "ans", r: st.round, h: st.hintNo, s: seat, hit: true, n, gain: mult });
      } else {
        const loss = st.ri.safe[seat] ? 0 : 1;
        st.score[seat] -= loss;
        if (n !== null) st.wrong.push(n);
        st.last = { end: false, void: false, s: seat, n, hit: false, tmo: n === null, stage, r: st.round, h: st.hintNo, gain: -loss, safe: !!st.ri.safe[seat] };
        push(st, { k: "ans", r: st.round, h: st.hintNo, s: seat, hit: false, n, gain: -loss });
      }
      st.phase = "show";
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = st => (st.phase === "show" ? (st.last && st.last.end ? 4200 : 2600) : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    const L = st.last;
    if (L.end) { startRound(st); return; }
    if (L.stage === 1) { st.caller = 1 - L.s; st.tries = 1; st.phase = "ans2"; return; }
    endHint(st);
  }
  const over = st => !!st.over;
  const ranks = st => st.score.map(c => st.score.filter(x => x > c).length);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "item") return [{ t: "item", use: [] }];
    if (st.phase === "pick") return [{ t: "num", n: "7" }, { t: "num", n: "12" }, { t: "num", n: "25" }];
    if (st.phase === "buzz") return [{ t: "buzz", ms: NO_BUZZ }];
    if (st.phase === "ans") return [{ t: "timeout" }];
    return [{ t: "pass" }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 시크릿으로 감춘 숫자는 상대의 view 에서 null. rd · kn · plan 은 그 자리 것만 (AI 용 · 상대 것은 안 실림). 'all' 은 구경 · 복기용으로 모두 보임.
  function view(st, seat) {
    const all = seat === "all", s = seat === 0 || seat === 1 ? seat : -1;
    const hints = st.hints.map(h => ({ i: h.i, f: h.f, a: !all && h.sec[h.f] && h.f !== s ? null : h.a, b: !all && h.sec[1 - h.f] && 1 - h.f !== s ? null : h.b, v: h.v, sec: h.sec.slice() }));
    let pend = null;
    if (st.pend) { const hide = !all && st.hintNo === 1 && st.ri.secret[st.pend.s] && st.pend.s !== s; pend = { s: st.pend.s, n: hide ? null : st.pend.n }; }
    const itemPhase = st.phase === "item";
    const ri = {}; for (const k of ITEMS) ri[k] = st.ri[k].map((x, i) => (itemPhase && !all && i !== s ? 0 : x));
    const L = st.last;
    const pubObj = { r: st.round, p: st.phase, h: st.hintNo, sc: st.score, f: st.front, c: st.caller, hv: st.hints.map(h => h.v), pn: st.pend ? 1 : 0, w: st.wrong, bz: st.bz.map(x => (x === null ? 0 : 1)), it: st.items, nd: itemPhase ? st.dec.map(x => (x ? 1 : 0)) : 0, ri: itemPhase ? 0 : st.ri, l: L ? [L.s, L.hit ? 1 : 0, L.n, L.stage] : 0, ov: st.over };
    const cur = st.cur;
    return {
      n: 2, cfg: Object.assign({}, st.opt), phase: st.phase, round: st.round, rounds: st.rounds, score: st.score.slice(), first: st.first, front: st.front,
      problem: cur ? { a: cur.a, b: cur.b } : null, hintNo: st.hintNo, maxHints: MAXH, hints, pend, wrong: st.wrong.slice(),
      items: st.items.map(o => Object.assign({}, o)), ri, caller: st.caller, tries: st.tries,
      mine: s >= 0 ? st.bz[s] !== null : false, last: L ? Object.assign({}, L) : null,
      kn: s >= 0 ? st.kn[s].slice() : null, plan: s >= 0 ? Object.assign({}, st.plan[s]) : null, rd: s >= 0 ? st.rd[s].slice() : null,
      rule: all && cur ? { id: RULES[cur.rule].id, name: RULES[cur.rule].name, txt: RULES[cur.rule].txt, ans: cur.ans } : null,
      hist: st.hist.map(h => Object.assign({}, h, { dbl: h.dbl.slice(), safe: h.safe.slice(), sec: h.sec.slice() })), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-40).map(e => Object.assign({}, e)), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 후보 규칙 찾기 (AI · 선생님 · 복기가 같이 씀 — view 만 읽어요) ────────
  const visibleHints = V => V.hints.filter(h => h.a !== null && h.b !== null);
  // ids 중 보이는 힌트와 모두 맞는 규칙들 → 문제의 답이 같은 것끼리 묶음 (이번 라운드에 이미 틀린 답은 뺌)
  function candInfo(V, ids) {
    const H = visibleHints(V), pa = V.problem.a, pb = V.problem.b;
    const cands = ids.filter(i => H.every(h => ruleVal(i, h.a, h.b) === h.v));
    const map = new Map();
    for (const i of cands) {
      const ans = ruleVal(i, pa, pb);
      if (V.wrong && V.wrong.includes(ans)) continue;
      let g = map.get(ans); if (!g) { g = { ans, ids: [] }; map.set(ans, g); }
      g.ids.push(i);
    }
    const groups = [...map.values()].sort((x, y) => y.ids.length - x.ids.length || (x.ans < y.ans ? -1 : 1));
    const total = groups.reduce((t, g) => t + g.ids.length, 0);
    return { cands, groups, total, best: groups[0] || null, conf: groups[0] ? groups[0].ids.length / total : 0, sure: groups.length === 1 };
  }
  const POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 23, 24, 25, 27, 29, 31, 36, 37, 42, 48, 51, 56, 64, 67, 72, 79, 85, 89, 91, 98, 99, 105, 128, 360, 1001];
  // 숫자 고르기: 내 숫자를 넣었을 때 후보들이 서로 다른 결과로 잘 갈라지고, 그 뒤에도 남는 '문제의 답' 가짓수가 적은 수
  //  (후 플레이어는 선이 낸 숫자를 알면 그 숫자로, 모르면 · 선이면 짝이 될 숫자 두 개를 추정해서 평균)
  function pickYs(V, me, rd) { return V.front !== me && V.pend && V.pend.n !== null ? [+V.pend.n] : [POOL[Math.floor(rd[0] * POOL.length)], POOL[Math.floor(rd[1] * POOL.length)]]; }
  function numScore(V, me, info, x, rd) {
    const ys = pickYs(V, me, rd), front = V.front === me, pa = V.problem.a, pb = V.problem.b;
    let exp = 0, cls = 0;
    for (const y of ys) {
      const a = front ? String(x) : String(y), b = front ? String(y) : String(x), m = new Map();
      for (const i of info.cands) { const o = ruleVal(i, a, b); let g = m.get(o); if (!g) { g = { n: 0, ans: new Set() }; m.set(o, g); } g.n++; g.ans.add(ruleVal(i, pa, pb)); }
      let e = 0; for (const g of m.values()) e += g.n * g.ans.size;
      exp += e / Math.max(1, info.cands.length); cls += m.size;
    }
    return { exp: exp / ys.length, cls: cls / ys.length };
  }
  function bestNum(V, me, ids, rd) {
    const info = candInfo(V, ids), use = info.cands.length ? info : { cands: ids, groups: [], total: 0 };
    let best = null;
    for (let q = 0; q < POOL.length; q++) {
      const x = POOL[(q + Math.floor(rd[2] * POOL.length)) % POOL.length], r = numScore(V, me, use, x, rd);
      if (!best || r.exp < best.exp - 1e-9 || (Math.abs(r.exp - best.exp) <= 1e-9 && r.cls > best.cls)) best = { x, exp: r.exp, cls: r.cls };
    }
    return { n: String(best.x), exp: best.exp, cls: best.cls, info };
  }

  // ── AI ────────────────────────────────────────────────────
  // K = 아는 규칙 수(그 자리 view 의 kn 순서 앞에서부터) · thr = 이 확률(후보 규칙 중 같은 답의 비율) 이상일 때만 · miss = 아는 답도 못 누를 확률 · rash = 모르는데 누를 확률 ·
  // nz = 숫자를 아무렇게나 고를 확률 · ms = 버저까지 걸리는 시간 구간
  const PROF = {
    easy:   { K: 11, minH: 4, thr: 0.6,  msLo: 26000, msHi: 56000, miss: 0.25, rash: 0.16, nz: 0.4 },
    normal: { K: 16, minH: 3, thr: 0.75, msLo: 14000, msHi: 42000, miss: 0.08, rash: 0,    nz: 0.12 },
    hard:   { K: 21, minH: 3, thr: 0.75, msLo: 8000,  msHi: 32000, miss: 0.03, rash: 0,    nz: 0.03 },
    human:  { K: 19, minH: 3, thr: 0.8,  msLo: 10000, msHi: 38000, miss: 0.1,  rash: 0,    nz: 0.1 },   // 시험용 사람 대역 (규칙 19가지쯤 떠올리고, 힌트를 셋 이상 본 뒤 확실할 때만 누르고, 10~38초에 누름)
  };
  const knownIds = (kn, K) => (Array.isArray(kn) ? kn.slice(0, K) : ALL.slice(0, K));
  const frac = x => x - Math.floor(x);
  function aiWith(V, me, P) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    const rd = V.rd || Array.from({ length: RDN }, (_, i) => frac(Math.sin(i * 12.9898 + 4.1) * 43758.5453)), h = Math.min(V.hintNo, 15);
    const rr = k => rd[(h * 3 + k) % RDN];
    if (V.phase === "item") {
      const it = V.items[me], pl = V.plan || { double: 1, safe: 1, secret: 1 }, last = V.round >= V.rounds - 1, use = [];
      for (const k of ITEMS) if (it[k] && (V.round >= pl[k] || last)) use.push(k);
      return { t: "item", use };
    }
    const ids = knownIds(V.kn, P.K);
    if (V.phase === "pick") return { t: "num", n: rr(2) < P.nz ? String(POOL[Math.floor(rr(0) * 14)]) : bestNum(V, me, ids, [rr(0), rr(1), rr(2)]).n };
    const info = candInfo(V, ids), safeOn = !!V.ri.safe[me], lastHint = V.hintNo >= V.maxHints;
    if (V.phase === "buzz") {
      let thr = safeOn ? 0.34 : lastHint ? P.thr - 0.2 : P.thr, press = !!info.best && info.conf >= thr && (V.hintNo >= P.minH || safeOn);
      if (press && info.sure && rr(1) < P.miss) press = false;
      if (!press && P.rash && rr(1) < P.rash) press = true;
      if (!press) return { t: "buzz", ms: NO_BUZZ };
      const lag = info.best && info.conf >= 0.999999 ? 0 : 5000, spread = info.cands.length ? 0.7 + 0.3 * Math.min(1, info.cands.length / 6) : 1;
      return { t: "buzz", ms: Math.min(WINDOW - 2000, Math.max(1500, Math.round((P.msLo + (P.msHi - P.msLo) * rr(0)) * spread + lag))) };
    }
    if (V.phase === "ans" || V.phase === "ans2") {
      const thr = V.phase === "ans2" ? (safeOn ? 0 : Math.max(0.3, P.thr - 0.15)) : 0;
      if (info.best && info.conf >= thr) return { t: "ans", n: info.best.ans };
      if (V.phase === "ans" && P.rash) return { t: "ans", n: String(1 + Math.floor(rr(2) * 40)) };
      return V.phase === "ans" ? { t: "timeout" } : { t: "pass" };
    }
    return null;
  }
  function ai(V, me, tier, r) { return aiWith(V, me, PROF[tier] || PROF.normal); }

  // ── AI 선생님 (보이는 것만 읽음 · 규칙 23가지를 다 아는 선생님) ────────
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const sec = ms => (ms >= NO_BUZZ ? "안 누름" : (ms / 1000).toFixed(1) + "초");
  const shownN = x => (x === null || x === undefined ? "?" : x);
  const hintTxt = h => `${shownN(h.a)} ❓ ${shownN(h.b)} = ${h.v}`;
  const ruleNames = (ids, k) => ids.slice(0, k || 3).map(i => RULES[i].name).join(" · ");
  function buzzStats(V, opp) {
    const L = V.log.filter(e => e.k === "buzz" && e.w !== -1 && e.ms);
    let n = 0, first = 0, tot = 0; for (const e of L) { if (e.ms[opp] < NO_BUZZ) { n++; tot += e.ms[opp]; } if (e.w === opp) first++; }
    return { n, first, avg: n ? tot / n : 0, rounds: L.length };
  }
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`, opp = 1 - me, who = nm(opp), S = V.score;
    const scoreTxt = `점수 나 ${S[me]} : ${who} ${S[opp]} (${V.round}/${V.rounds}라운드)`;
    const B = buzzStats(V, opp);
    const stat = B.n ? ` 지금까지 ${who}${eun(who)} 버저를 ${B.n}번 눌렀고(평균 ${(B.avg / 1000).toFixed(0)}초) 먼저 눌러 답한 건 ${B.first}번이에요.` : " 아직 상대의 버저 기록이 없어요.";
    if (V.over) {
      const myW = V.hist.filter(h => h.w === me).length, voids = V.hist.filter(h => h.w < 0).length;
      return { opp: `승부가 끝났어요.${stat}`, mine: `${scoreTxt} → ${S[me] > S[opp] ? "내가 이겼어요" : S[me] < S[opp] ? "아쉽지만 졌어요" : "비겼어요"}`, rec: "한 판 더 해 봐요!", why: `내가 맞힌 라운드 ${myW}번 · 아무도 못 맞힌 라운드 ${voids}번. 숨은 규칙은 종류가 정해져 있어요 — 힌트 숫자를 골고루(작은 수 · 큰 수 · 자릿수가 다른 수) 내면 후보가 빨리 줄어요.` };
    }
    const info = candInfo(V, ALL), L = V.last;
    const nC = info.cands.length, usable = visibleHints(V).length;
    const cand = nC ? `후보 규칙 ${nC}가지 (전체 ${NR}가지 중) · 후보들이 내는 답 ${info.groups.length}종류${info.best ? ` (가장 많은 답 ${info.best.ans} = ${info.best.ids.length}/${info.total}가지)` : ""}` : "보이는 힌트에 맞는 규칙이 아직 안 떠올라요";
    const hid = V.hints.length - usable;
    const mine = `${scoreTxt} · 힌트 ${V.hints.length}/${V.maxHints}개 · ${cand}${hid ? ` · 감춰진 숫자 힌트 ${hid}개는 계산에서 뺐어요` : ""}`;
    const it = V.items, itTxt = i => ITEMS.filter(k => it[i][k]).map(k => ITEM_NAME[k]).join(" · ") || "없음";
    if (V.phase === "item") {
      const my = V.items[me], hasAny = ITEMS.some(k => my[k]);
      return { opp: `${who}의 남은 아이템: ${itTxt(opp)}.${stat}`, mine: `${scoreTxt} · 내 아이템: ${itTxt(me)}`, rec: hasAny ? "이번 라운드에 쓸 아이템만 골라요 (안 쓰면 그대로 시작)" : "쓸 아이템이 없어요", why: `더블 스코어는 정답을 거의 확신할 라운드에, 무감점은 힌트를 다 못 풀어도 찍어 볼 라운드에, 시크릿은 첫 힌트에 내 숫자를 감추고 싶을 때 써요 · 아이템은 한 판에 한 번씩이에요.` };
    }
    if (V.phase === "pick") {
      const front = V.front === me, ids = ALL, rec = bestNum(V, me, ids, [0.31, 0.62, 0.13]), pendTxt = !front && V.pend ? (V.pend.n === null ? `${who}${iga(who)} 숫자를 감췄어요(시크릿)` : `${who}의 숫자는 ${V.pend.n}`) : "";
      const o1 = front ? `${who}${eun(who)} 내가 낸 숫자를 보고 자기 숫자를 정해요.${stat}` : `${who}${iga(who)} 먼저 숫자를 냈어요${pendTxt ? ` — ${pendTxt}` : ""}.${stat}`;
      return { opp: o1, mine, rec: `${rec.n} 처럼 규칙이 다른 후보를 갈라 줄 숫자 (${front ? "앞" : "뒤"}에 들어가요)`, why: nC ? `이 숫자를 넣으면 후보 ${rec.info.cands.length}가지가 약 ${rec.cls.toFixed(1)}가지 결과로 갈라지고, 그 뒤에 남는 '문제의 답' 가짓수는 평균 ${rec.exp.toFixed(1)}개로 줄어요.` : "맞는 후보가 없으면 아주 작은 수 · 두 자리 수 · 큰 수를 섞어 새로 시작해 봐요." };
    }
    if (V.phase === "buzz") {
      const o1 = `${who}${eun(who)} 같은 힌트를 보고 있어요.${stat}`;
      if (V.mine) return { opp: o1, mine, rec: "버저를 눌렀어요 — 상대 시간과 견주는 중이에요", why: "먼저 누른 쪽(ms 가 작은 쪽)이 정답을 댈 기회를 얻어요." };
      if (info.best && info.sure) return { opp: o1, mine, rec: `지금 버저! 정답은 ${info.best.ans}`, why: `후보 규칙 ${nC}가지(${ruleNames(info.best.ids, 3)})가 모두 같은 답 ${info.best.ans} 을(를) 내요 → 정답 확률 100% · 틀리면 −1 이지만 맞히면 라운드가 끝나요.` };
      if (info.best) return { opp: o1, mine, rec: info.conf >= 0.7 ? `${info.best.ans} 이(가) 유력해요 — 버저를 눌러 볼 만해요` : "아직 답이 갈려요 — 넘기고 다음 힌트를 봐요", why: `답 ${info.best.ans} 은 후보 ${info.best.ids.length}/${info.total}가지 (${Math.round(info.conf * 100)}%) · 틀리면 −1 에다 상대에게 기회가 넘어가요.` };
      return { opp: o1, mine, rec: "넘기고 다음 힌트를 봐요", why: "후보가 없으면 힌트를 더 모아야 규칙이 보여요 (최대 16개까지 나와요)." };
    }
    if (V.phase === "ans" || V.phase === "ans2") {
      const myTurn = V.caller === me, wr = V.wrong.length ? ` 이번 라운드에서 이미 틀린 답: ${V.wrong.join(" · ")}.` : "";
      const o1 = myTurn ? `${who}${eun(who)} 내 답을 기다려요.${wr}` : `${who}${iga(who)} 답을 쓰는 중이에요${V.phase === "ans2" ? " (기회가 넘어왔어요)" : ""}.${wr}`;
      if (!myTurn) return { opp: o1, mine, rec: "상대가 답하는 동안 후보를 다시 따져 봐요", why: V.phase === "ans" ? "틀리면 기회가 나에게 넘어와요 — 틀린 답은 후보에서 빠져서 남은 답이 더 분명해져요." : "이 답도 틀리면 다음 힌트로 넘어가요." };
      if (info.best) return { opp: o1, mine, rec: `${info.best.ans} 을(를) 써요`, why: `후보 규칙 ${info.total}가지 중 ${info.best.ids.length}가지(${Math.round(info.conf * 100)}%)가 ${info.best.ans} 이에요${V.phase === "ans2" ? " · 자신 없으면 넘겨도 감점이 없어요" : ""}.` };
      return { opp: o1, mine, rec: V.phase === "ans2" ? "자신 없으면 넘겨요 (감점 없음)" : "후보가 없어요 — 짐작으로 써야 해요", why: "버저를 누른 뒤엔 답을 내야 하고, 틀리면 −1 이에요 (무감점 아이템이면 0)." };
    }
    if (L) {
      const w2 = L.s >= 0 ? nm(L.s) : "";
      const txt = L.void ? "힌트를 16개까지 열었지만 아무도 못 맞혔어요 — 이번 라운드는 무효예요."
        : L.tmo ? `${w2}${iga(w2)} 시간 안에 답을 못 썼어요 → ${L.gain ? `${L.gain}점` : "감점 없음"}.`
          : L.hit ? `${w2}${iga(w2)} ${L.n} 으로 정답! +${L.gain}점${L.mult === 2 ? " (더블 스코어)" : ""}.`
            : `${w2}${iga(w2)} ${L.n} 로 오답 → ${L.gain ? `${L.gain}점` : "감점 없음(무감점)"}.`;
      const rule = L.end && L.rule !== undefined ? ` 숨은 규칙은 "${RULES[L.rule].txt}" 이었어요 (답 ${L.ans}).` : "";
      return { opp: txt + rule, mine, rec: L.end ? "다음 라운드를 준비해요" : L.stage === 1 ? `${nm(1 - L.s)}에게 기회가 넘어가요` : "다음 힌트로 넘어가요", why: L.end ? `힌트 ${L.h}개에서 끝났어요.` : `틀린 답 ${L.n === null ? "" : L.n + " "}은(는) 후보에서 빠져요.` };
    }
    return { opp: `${who}의 점수는 ${S[opp]}점이에요.`, mine, rec: "다음 라운드를 준비해요", why: "" };
  }

  return { id: "gn-mysterysign", RULES, ITEMS, ITEM_NAME, TV, NO_BUZZ, WINDOW, MAXH, MAXN, POOL, PROF, init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, coach, ruleVal, normNum, normAns, candInfo, bestNum, numScore, visibleHints, knownIds, hintTxt, ruleNames, ALL };
});

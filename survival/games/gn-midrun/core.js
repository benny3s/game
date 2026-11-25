/* 베니 서바이벌 · 중간 달리기 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 3화 · 9화 메인 매치 — 출발점 + 30칸 + 결승점(31칸), 이동 카드 1·2·3·4 한 장씩 한 세트(4장 다 쓰면 새 세트),
   캐릭터마다 다른 능력 · 번호 순서로 한 명씩 · 골인한 사람은 능력 소멸 · 지목은 같은 대상을 연속으로 못 해요 · '중간' 으로 골인한 사람이 우승 (1등과 꼴찌는 불리)
   우리 판 (3~5명, 능력 5개): ① 그래비티 — 카드 1장을 공개해 버리고 이동 포기, 지목한 사람을 내 앞 1칸 / 뒤 1칸으로 끌어와요
     ③ 푸시 — 이동한 뒤 같은 칸에 다른 사람이 있으면 그 사람을 앞 / 뒤 1칸 밀 수 있어요 (출발점 제외)
     ⑤ 위드 — 마지막 남은 카드 1장을 쓸 때 1명을 지목해 같이 이동 ⑥ 유니온 — 이동한 뒤 내 1칸 앞에 있는 사람을 모두 내 칸으로 (출발점 제외)
     ⑩ 사일런스 — 내 차례 카드를 내기 전에 1명을 지목해 다음 내 차례까지 그 능력을 막아요
   방송 문서에 없는 것은 다듬었어요: 손패 · 낸 카드는 모두 공개 (손패는 4장 세트에서 낸 카드를 빼면 되므로 사실상 공개) · 연쇄가 생기는 능력(리셋 · 딜리트 · 미러 · 점프 · 퀵 · 원)은 뺐어요 ·
   위드 동시 골인은 이동 전 결승에 가까웠던 사람 → 같으면 캐릭터 번호 순 · 푸시로 골인시킬 수 없어요 · 골인하려면 31칸 이상 (넘쳐도 골인) ·
   중간 승리: 3명 = 2등 · 4명 = 2·3등 공동 · 5명 = 3등 — 마지막 승자 순위가 골인하는 순간 끝나요 (아직 골인 못 한 사람은 앞선 칸 순으로 다음 순위) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-midrun"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const GOAL = 31, SETC = [1, 2, 3, 4];
  const KEYS = ["grav", "push", "with", "union", "sil"];
  const AB = {
    grav: { no: 1, name: "그래비티", em: "🧲", d: "카드를 공개해 버리고 이동 대신, 나보다 앞선 사람은 내 앞 1칸으로, 뒤처진 사람은 내 뒤 1칸으로 끌어와요" },
    push: { no: 3, name: "푸시", em: "👊", d: "이동한 뒤 같은 칸의 한 명을 앞 / 뒤 1칸 밀 수 있어요" },
    with: { no: 5, name: "위드", em: "🤝", d: "마지막 카드를 쓸 때 한 명을 지목하면 같은 칸 수만큼 같이 이동해요" },
    union: { no: 6, name: "유니온", em: "🧩", d: "이동한 뒤 내 1칸 앞에 있는 사람을 모두 내 칸으로 끌어와요" },
    sil: { no: 10, name: "사일런스", em: "🔇", d: "카드를 내기 전 한 명을 지목해 다음 내 차례까지 능력을 막아요" },
  };
  const WIN = { 3: [2], 4: [2, 3], 5: [3] }, NEED = { 3: 2, 4: 3, 5: 3 };
  const MAXTURN = 500;

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clone = o => JSON.parse(JSON.stringify(o));
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i);

  // ── 판 ──────────────────────────────────────────────────
  function init({ n, seed, cfg } = {}) {
    n = Math.max(3, Math.min(5, n | 0 || 4));
    const c = cfg || {};
    const st = { n, rs: (seed >>> 0) || 1, cfg: c, ab: [], tord: [], ti: 0, phase: "card", pos: Array(n).fill(0), hand: Array.from({ length: n }, () => SETC.slice()), fin: Array(n).fill(-1), finOrder: [], silTg: null, silLast: null, lastTg: { grav: null, with: null }, pend: null, round: 0, turnNo: 0, over: false, places: null, ranks: null, log: [], seq: 0 };
    const keys = KEYS.slice(); for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }   // 제비뽑기
    const okAb = Array.isArray(c.ab) && c.ab.length === n && c.ab.every((k, i) => KEYS.includes(k) && c.ab.indexOf(k) === i);
    st.ab = okAb ? c.ab.slice() : keys.slice(0, n);
    st.tord = [...Array(n).keys()].sort((a, b) => AB[st.ab[a]].no - AB[st.ab[b]].no);
    push(st, { k: "start", ab: st.ab.slice() });
    beginTurn(st);
    return st;
  }
  const cur = st => st.tord[st.ti];
  const silenced = (st, s) => st.silTg === s && st.ab[s] !== "sil";
  const alive = (st, s) => st.fin[s] < 0;
  const silTargets = (st, s) => [...Array(st.n).keys()].filter(t => t !== s && alive(st, t) && t !== st.silLast);
  const gravTargets = (st, s) => [...Array(st.n).keys()].filter(t => t !== s && alive(st, t) && st.pos[t] !== st.pos[s] && t !== st.lastTg.grav);
  const withTargets = (st, s) => [...Array(st.n).keys()].filter(t => t !== s && alive(st, t) && t !== st.lastTg.with);

  function beginTurn(st) {
    if (checkEnd(st)) return;
    let g = 0; while (!alive(st, cur(st)) && g++ < 12) { st.ti = (st.ti + 1) % st.n; if (st.ti === 0) st.round++; }
    const s = cur(st);
    st.pend = null; st.phase = "card";
    if (st.ab[s] === "sil") {   // 사일런스는 '다음 내 차례까지' — 내 차례가 오면 풀려요
      st.silTg = null;
      if (silTargets(st, s).length) st.phase = "sil"; else st.silLast = null;   // 지목할 사람이 없어 쉬면 연속이 끊겨요
    }
    push(st, { k: "turn", s, r: st.round });
  }
  function endTurn(st) {
    st.turnNo++;
    if (checkEnd(st)) return;
    st.ti = (st.ti + 1) % st.n; if (st.ti === 0) st.round++;
    beginTurn(st);
  }
  function checkEnd(st) {
    if (st.over) return true;
    if (st.finOrder.length < NEED[st.n] && st.turnNo < MAXTURN) return false;
    const rest = [...Array(st.n).keys()].filter(s => alive(st, s)).sort((a, b) => st.pos[b] - st.pos[a] || AB[st.ab[a]].no - AB[st.ab[b]].no);
    st.places = st.finOrder.concat(rest);   // places[0] = 1등
    const W = WIN[st.n]; st.ranks = Array(st.n).fill(0);
    st.places.forEach((s, i) => { st.ranks[s] = Math.min(...W.map(w => Math.abs(i + 1 - w))); });
    st.over = true; st.phase = "over"; st.pend = null;
    push(st, { k: "end" });
    return true;
  }
  function finish(st, s) { st.fin[s] = st.finOrder.length; st.finOrder.push(s); st.pos[s] = GOAL; if (st.ab[s] === "sil" || st.silTg === s) st.silTg = null; push(st, { k: "goal", s, place: st.finOrder.length }); }
  function resolveMoves(st, moves) {   // 동시에 골인하면 이동 전 결승에 가까웠던 사람 → 같으면 캐릭터 번호 순
    const before = st.pos.slice(), goalers = [];
    for (const m of moves) { const np = before[m.s] + m.amt; if (np >= GOAL) goalers.push(m.s); else st.pos[m.s] = np; }
    goalers.sort((a, b) => before[b] - before[a] || AB[st.ab[a]].no - AB[st.ab[b]].no);
    for (const s of goalers) finish(st, s);
  }
  function consume(st, s, c) {
    const h = st.hand[s]; h.splice(h.indexOf(c), 1);
    if (!h.length) st.hand[s] = SETC.slice();
  }
  function afterMove(st, s) {
    if (!alive(st, s)) { endTurn(st); return; }
    if (st.ab[s] === "push" && !silenced(st, s) && st.pos[s] > 0) {
      const cands = [...Array(st.n).keys()].filter(t => t !== s && alive(st, t) && st.pos[t] === st.pos[s]);
      if (cands.length) { st.phase = "push"; st.pend = { s, tile: st.pos[s], cands }; return; }
    }
    if (st.ab[s] === "union" && !silenced(st, s) && st.pos[s] > 0) {
      const pulled = [...Array(st.n).keys()].filter(t => t !== s && alive(st, t) && st.pos[t] === st.pos[s] + 1);
      if (pulled.length) { for (const t of pulled) st.pos[t] = st.pos[s]; push(st, { k: "union", s, pulled }); }
    }
    endTurn(st);
  }

  function needs(st) { return st.over ? [] : [cur(st)]; }
  function actions(st) {   // 지금 차례인 사람이 할 수 있는 모든 행동 (AI · 시험용)
    const s = cur(st), out = [];
    if (st.over) return out;
    if (st.phase === "sil") { for (const t of silTargets(st, s)) out.push({ t: "sil", tg: t }); return out; }
    if (st.phase === "push") {
      out.push({ t: "skip" });
      for (const c of st.pend.cands) { if (st.pend.tile + 1 < GOAL) out.push({ t: "push", tg: c, dir: 1 }); out.push({ t: "push", tg: c, dir: -1 }); }
      return out;
    }
    const last = st.hand[s].length === 1, wt = st.ab[s] === "with" && !silenced(st, s) && last ? withTargets(st, s) : null;
    for (const c of uniq(st.hand[s])) { out.push({ t: "card", c }); if (wt) for (const tg of wt) out.push({ t: "card", c, w: tg }); }
    if (st.ab[s] === "grav" && !silenced(st, s)) for (const c of uniq(st.hand[s])) for (const tg of gravTargets(st, s)) out.push({ t: "grav", c, tg });
    return out;
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    const s = cur(st);
    if (seat !== s) return { ok: false, err: "지금은 내 차례가 아니에요" };
    if (st.phase === "sil") {
      if (a.t !== "sil") return { ok: false, err: "능력을 막을 사람을 골라요" };
      if (!silTargets(st, s).includes(a.tg)) return { ok: false, err: "그 사람은 지목할 수 없어요 (같은 사람을 연속으로 못 해요)" };
      st.silTg = a.tg; st.silLast = a.tg; st.phase = "card";
      push(st, { k: "sil", s, tg: a.tg });
      return { ok: true };
    }
    if (st.phase === "push") {
      if (a.t === "skip") { push(st, { k: "nopush", s }); endTurn(st); return { ok: true }; }
      if (a.t !== "push") return { ok: false, err: "밀거나 넘어가요" };
      if (!st.pend.cands.includes(a.tg) || (a.dir !== 1 && a.dir !== -1)) return { ok: false, err: "밀 수 없어요" };
      if (a.dir === 1 && st.pend.tile + 1 >= GOAL) return { ok: false, err: "밀어서 골인시킬 수는 없어요" };
      st.pos[a.tg] += a.dir; push(st, { k: "push", s, tg: a.tg, dir: a.dir });
      endTurn(st); return { ok: true };
    }
    if (a.t === "grav") {
      if (st.ab[s] !== "grav" || silenced(st, s)) return { ok: false, err: "지금은 그래비티를 쓸 수 없어요" };
      if (!st.hand[s].includes(a.c)) return { ok: false, err: "그 카드는 없어요" };
      if (!gravTargets(st, s).includes(a.tg)) return { ok: false, err: "그 사람은 끌어올 수 없어요 (같은 칸이거나 연속 지목)" };
      const t = a.tg, to = st.pos[t] > st.pos[s] ? st.pos[s] + 1 : st.pos[s] - 1;
      consume(st, s, a.c); st.pos[t] = to; st.lastTg.grav = t;
      push(st, { k: "grav", s, c: a.c, tg: t, to });
      endTurn(st); return { ok: true };
    }
    if (a.t !== "card") return { ok: false, err: "카드를 골라요" };
    if (!st.hand[s].includes(a.c)) return { ok: false, err: "그 카드는 없어요" };
    const last = st.hand[s].length === 1; let w = null;
    if (a.w !== undefined && a.w !== null) {
      if (st.ab[s] !== "with" || silenced(st, s) || !last) return { ok: false, err: "위드는 마지막 카드 1장을 쓸 때만 쓸 수 있어요" };
      if (!withTargets(st, s).includes(a.w)) return { ok: false, err: "그 사람은 지목할 수 없어요" };
      w = a.w;
    }
    consume(st, s, a.c);
    push(st, { k: "card", s, c: a.c, w });
    const moves = [{ s, amt: a.c }]; if (w !== null) { moves.push({ s: w, amt: a.c }); st.lastTg.with = w; }
    resolveMoves(st, moves);
    afterMove(st, s);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) { return seat === cur(st) && !st.over ? actions(st) : []; }

  // ── 보이는 것 (손패 · 낸 카드 · 능력 모두 공개) ─────────────
  function snap(st) { return { n: st.n, ab: st.ab.slice(), tord: st.tord.slice(), ti: st.ti, phase: st.phase, pos: st.pos.slice(), hand: st.hand.map(h => h.slice()), fin: st.fin.slice(), finOrder: st.finOrder.slice(), silTg: st.silTg, silLast: st.silLast, lastTg: Object.assign({}, st.lastTg), pend: st.pend ? { s: st.pend.s, tile: st.pend.tile, cands: st.pend.cands.slice() } : null, round: st.round, turnNo: st.turnNo, over: st.over }; }
  function view(st, seat) {
    const sn = snap(st);
    return Object.assign({ seat, cur: st.over ? -1 : cur(st), needs: needs(st), W: WIN[st.n], need: NEED[st.n], ranks: st.ranks ? st.ranks.slice() : null, places: st.places ? st.places.slice() : null, log: st.log.slice(-30), pub: hash(JSON.stringify(sn)), st: sn }, sn);
  }
  const fromView = V => Object.assign(clone(V.st), { rs: 1, cfg: {}, places: null, ranks: null, log: [], seq: 0 });

  // ── AI (보이는 것만 — 모두 공개라 그대로 계산해요) ──────────────
  const reward = (st, me) => (st.ranks ? 1 / (1 + st.ranks[me]) : 0);
  function rollout(st0, me, r) {   // 남은 사람은 아무 수나 두며 끝까지 → 내 보상
    const st = clone(st0); let g = 0;
    while (!st.over && g++ < 2000) { const acts = actions(st); if (!acts.length) break; apply(st, cur(st), acts[Math.floor(r() * acts.length)]); }
    if (!st.over) { st.turnNo = MAXTURN; checkEnd(st); }
    return reward(st, me);
  }
  function evalActions(V, me, r, trials) {
    const st = fromView(V), acts = actions(st), res = [];
    for (const a of acts) {
      let sum = 0, wins = 0;
      for (let i = 0; i < trials; i++) { const s2 = clone(st); apply(s2, me, a); const x = s2.over ? reward(s2, me) : rollout(s2, me, r); sum += x; if (x > 0.999) wins++; }
      res.push({ a, v: sum / trials, wp: wins / trials });
    }
    return res;
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const st = fromView(V), acts = actions(st);
    if (!acts.length) return null;
    if (tier === "easy") return acts[Math.floor(r() * acts.length)];
    const res = evalActions(V, me, r, tier === "hard" ? 36 : 10);
    let m = -1; for (const x of res) if (x.v > m) m = x.v;
    const best = res.filter(x => x.v >= m - 1e-9);
    return best[Math.floor(r() * best.length)].a;
  }

  // ── 글 도우미 (받침에 맞춰 이/가 · 을/를 · 은/는 · 와/과 · 로/으로) ──
  const jong = t => { t = String(t == null ? "" : t); const ch = t.charAt(t.length - 1), c = ch ? ch.charCodeAt(0) : 0; if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28; if (ch >= "0" && ch <= "9") return [21, 8, 0, 16, 0, 0, 1, 8, 8, 0][+ch]; return 0; };
  const eul = t => t + (jong(t) ? "을" : "를"), wa = t => t + (jong(t) ? "과" : "와");
  const canon = a => (a && typeof a === "object" ? [a.t, a.c, a.tg, a.w, a.dir].map(x => (x === undefined || x === null ? "" : x)).join("|") : "");

  // ── AI 선생님 ───────────────────────────────────────────────
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  // 행동 한 줄 글 — V(그 수를 두기 전 view)가 있으면 칸 이동까지 보여 줘요. 없어도(null) 돼요.
  function actText(a, who, V) {
    if (!a || typeof a !== "object") return "—";
    const s = V && typeof V.cur === "number" ? V.cur : -1, hasV = !!(V && Array.isArray(V.pos) && s >= 0);
    const P = i => (hasV && V.pos[i] !== undefined ? V.pos[i] : null);
    const to = (i, d) => { const p = P(i); if (p === null) return ""; const q = Math.max(0, p + d); return ` (${p}칸 → ${q >= GOAL ? "🏁 골인" : `${q}칸`})`; };
    if (a.t === "sil") return `🔇 ${who(a.tg)}의 능력을 막아요${hasV && V.ab && V.ab[a.tg] && P(a.tg) !== null ? ` (${AB[V.ab[a.tg]].name} · ${P(a.tg)}칸)` : ""}`;
    if (a.t === "skip") return "밀지 않고 넘어가요";
    if (a.t === "push") return `👊 ${eul(who(a.tg))} ${a.dir > 0 ? "앞으로" : "뒤로"} 1칸 밀어요${to(a.tg, a.dir > 0 ? 1 : -1)}`;
    if (a.t === "grav") {
      const ps = P(s), pt = P(a.tg), t2 = ps !== null && pt !== null ? Math.max(0, pt > ps ? ps + 1 : ps - 1) : null;
      return `🧲 ${a.c} 카드를 버리고 ${eul(who(a.tg))} 끌어와요${t2 !== null ? ` (${pt}칸 → ${t2}칸)` : ""}`;
    }
    if (a.t === "card" && a.c !== undefined) return `카드 ${a.c}${to(s, a.c)}${a.w !== undefined && a.w !== null ? ` + 🤝 ${wa(who(a.w))} 같이 이동${to(a.w, a.c)}` : ""}`;
    return "—";
  }
  // 🎞️ 복기용 — 고른 두 수(내 수 · 고급 AI 수)를 '같은 표본'(고정 씨앗)으로 끝까지 해 봐서 우승 순위 확률 · 기대 보상을 같은 잣대로 재요.
  //   보이는 것만 쓰고(모두 공개), V 는 바꾸지 않아요. 반환: { my:{v,wp}, best:{v,wp}, dV(고급−내), dWp, se(차이의 표준오차) } | null(비교 못 함)
  function compareActs(V, me, myA, bestA, seed, trials) {
    if (!V || !V.st || V.over || V.cur !== me || !myA || !bestA) return null;
    const st = fromView(V), legalK = actions(st).map(canon), km = canon(myA), kb = canon(bestA);
    if (km === kb || !legalK.includes(km) || !legalK.includes(kb)) return null;
    const T = Math.max(20, trials | 0 || 300), run = a => {
      const xs = [];
      for (let i = 0; i < T; i++) {
        const r = sampler(((seed >>> 0) + Math.imul(i + 1, 0x9e3779b1)) >>> 0), s2 = clone(st);
        apply(s2, me, clone(a));
        xs.push(s2.over ? reward(s2, me) : rollout(s2, me, r));
      }
      return xs;
    };
    const xm = run(myA), xb = run(bestA), mean = xs => xs.reduce((p, q) => p + q, 0) / xs.length, wp = xs => xs.filter(x => x > 0.999).length / xs.length;
    const d = xb.map((x, i) => x - xm[i]), md = mean(d), sd = Math.sqrt(d.reduce((p, q) => p + (q - md) * (q - md), 0) / Math.max(1, d.length - 1));
    return { my: { v: mean(xm), wp: wp(xm) }, best: { v: mean(xb), wp: wp(xb) }, dV: md, dWp: wp(xb) - wp(xm), se: sd / Math.sqrt(d.length), trials: T };
  }
  function coach(V, me, since, names) {
    const who = i => (i === me ? "나" : nm(names, i));
    const placeNow = s => 1 + V.pos.filter(p => p > V.pos[s]).length;
    const lineOf = s => `${who(s)}(${AB[V.ab[s]].em}${AB[V.ab[s]].name}) ${V.fin[s] >= 0 ? `${V.fin[s] + 1}등 골인` : `${V.pos[s]}칸 · 카드 ${V.hand[s].join("·")}`}`;
    if (!(me >= 0 && me < V.n)) return { opp: `구경 중이에요 — 지금 ${V.finOrder.length}명이 골인했어요`, mine: "-", rec: "-", why: `자리에 앉은 사람에게만 추천이 나와요. (우승 순위는 ${V.W.map(w => `${w}등`).join("·")})` };
    const opp = V.tord.filter(s => s !== me).map(lineOf).join(" / ");
    const wTxt = V.W.map(w => `${w}등`).join("·");
    if (V.over) return { opp, mine: lineOf(me), rec: V.ranks[me] === 0 ? "중간으로 골인했어요!" : `${V.W[0]}등 근처가 우승이었어요`, why: `최종 순위: ${V.places.map((s, i) => `${i + 1}등 ${who(s)}`).join(" · ")}. 너무 앞서도 너무 뒤처져도 안 되고, 우승 순위(${wTxt})로 골인하는 게 목표예요.` };
    const mine = `${lineOf(me)} · 지금 ${placeNow(me)}위 · 목표: ${wTxt}으로 골인`;
    if (V.cur !== me) {
      const c = V.cur, pc = V.pos[c], hc = V.hand[c], lo = Math.min(...hc), hi = Math.max(...hc), gap = pc - V.pos[me];
      if (V.fin[me] >= 0) return { opp, mine, rec: "기다려요", why: `나는 ${V.fin[me] + 1}등으로 골인했어요 (우승 ${wTxt}). 지금 ${who(c)} 차례 — ${pc}칸 · 카드 ${hc.join("·")}라서 다음엔 ${pc + lo >= GOAL ? "골인" : `${pc + lo}칸`}~${pc + hi >= GOAL ? "골인" : `${pc + hi}칸`}이 돼요. 게임은 ${V.need}명이 골인하면 끝나요 (지금 ${V.finOrder.length}명).` };
      return { opp, mine, rec: "기다려요", why: `${who(c)} 차례 (${AB[V.ab[c]].name}) — ${pc}칸에서 ${eul(`카드 ${hc.join("·")}`)} 가져서 다음엔 ${pc + lo >= GOAL ? "골인" : `${pc + lo}칸`}~${pc + hi >= GOAL ? "골인" : `${pc + hi}칸`}이 돼요. 나와는 ${gap > 0 ? `${gap}칸 앞` : gap < 0 ? `${-gap}칸 뒤` : "같은 칸"}이고 내 순위는 ${placeNow(me)}위 (우승 ${wTxt}). 상대 카드는 모두 공개라 다음 이동을 짐작할 수 있어요.` };
    }
    const res = evalActions(V, me, sampler(V.turnNo * 17 + me * 5 + V.pos[me] + 1), 40).sort((x, y) => (y.wp - x.wp) || (y.v - x.v));
    const top = res[0], second = res[1];
    return { opp, mine, rec: actText(top.a, who, V), why: `이 수로 끝까지 해 보면 우승 순위로 골인할 가능성이 약 ${Math.round(top.wp * 100)}%${second ? ` (다음 후보 ${actText(second.a, who)} ${Math.round(second.wp * 100)}%)` : ""}예요. 결승 31칸까지 ${GOAL - V.pos[me]}칸 남았고, 이미 골인한 사람은 ${V.finOrder.length}명이에요 — 우승은 1등이 아니라 ${wTxt}이라, 빨리 가는 것보다 순위를 맞추는 게 중요해요.` };
  }

  return { id: "gn-midrun", GOAL, SETC, KEYS, AB, WIN, NEED, init, needs, apply, view, over, ranks, legal, auto, advance, actions, fromView, ai, coach, rollout, evalActions, compareActs, actText, canon, sampler, hash, cur, silenced, silTargets, gravTargets, withTargets };
});

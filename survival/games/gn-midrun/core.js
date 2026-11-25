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
    if (isVer(c.ver)) return initN(n, seed, c);   // 방송 판(3화 · 9화) — 아래 새 엔진. ver 가 없으면 옛 규칙 그대로
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

  function needs(st) { return st.over ? [] : [st.ver ? curSeatN(st) : cur(st)]; }
  function actions(st) {   // 지금 차례인 사람이 할 수 있는 모든 행동 (AI · 시험용)
    if (st.ver) return actionsN(st);
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
    if (st.ver) return applyN(st, seat, a);
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
  function legal(st, seat) { return seat === (st.ver ? curSeatN(st) : cur(st)) && !st.over ? actions(st) : []; }

  // ── 보이는 것 (손패 · 낸 카드 · 능력 모두 공개) ─────────────
  function snap(st) { return { n: st.n, ab: st.ab.slice(), tord: st.tord.slice(), ti: st.ti, phase: st.phase, pos: st.pos.slice(), hand: st.hand.map(h => h.slice()), fin: st.fin.slice(), finOrder: st.finOrder.slice(), silTg: st.silTg, silLast: st.silLast, lastTg: Object.assign({}, st.lastTg), pend: st.pend ? { s: st.pend.s, tile: st.pend.tile, cands: st.pend.cands.slice() } : null, round: st.round, turnNo: st.turnNo, over: st.over }; }
  function view(st, seat) {
    if (st.ver) return viewN(st, seat);
    const sn = snap(st);
    return Object.assign({ seat, cur: st.over ? -1 : cur(st), needs: needs(st), W: WIN[st.n], need: NEED[st.n], ranks: st.ranks ? st.ranks.slice() : null, places: st.places ? st.places.slice() : null, log: st.log.slice(-30), pub: hash(JSON.stringify(sn)), st: sn }, sn);
  }
  const fromView = (V, r) => (V && V.ver ? fromViewN(V, r) : Object.assign(clone(V.st), { rs: 1, cfg: {}, places: null, ranks: null, log: [], seq: 0 }));

  // ── AI (보이는 것만 — 모두 공개라 그대로 계산해요) ──────────────
  const reward = (st, me) => (st.ranks ? 1 / (1 + st.ranks[me]) : 0);
  function rollout(st0, me, r) {   // 남은 사람은 아무 수나 두며 끝까지 → 내 보상
    const st = clone(st0); let g = 0;
    while (!st.over && g++ < 2000) { const acts = actions(st); if (!acts.length) break; apply(st, cur(st), acts[Math.floor(r() * acts.length)]); }
    if (!st.over) { st.turnNo = MAXTURN; checkEnd(st); }
    return reward(st, me);
  }
  function evalActions(V, me, r, trials) {
    if (V.ver) return evalN(V, me, r, trials);
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
    if (V.ver) return aiN(V, me, tier, r);
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
  const canon = a => (a && typeof a === "object" ? [a.t, a.c, a.tg, a.w, a.dir].concat(a.d !== undefined || a.u !== undefined ? [a.d, a.u] : []).map(x => (x === undefined || x === null ? "" : x)).join("|") : "");

  // ── AI 선생님 ───────────────────────────────────────────────
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  // 행동 한 줄 글 — V(그 수를 두기 전 view)가 있으면 칸 이동까지 보여 줘요. 없어도(null) 돼요.
  function actText(a, who, V) {
    if (!a || typeof a !== "object") return "—";
    if (V && V.ver) return actTextN(a, who, V);
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
    if (V.ver) return compareN(V, me, myA, bestA, seed, trials);
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
    if (V && V.ver) return coachN(V, me, since, names);
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

  // ═══════════════════════════════════════════════════════════════════════
  //  방송 판 — cfg.ver "r3"(3화: 11캐릭터 · 1등과 꼴찌만 탈락) · "r9"(9화: 10캐릭터 · 5·6등 우승)
  //  말(piece) 단위 엔진. 한 자리가 말을 여럿 굴릴 수 있어요(9화는 플레이어 + 게스트 = 한 팀 말 2개).
  //  처리 순서(우리 정리): 한 능력으로 여러 말이 움직이면 캐릭터 번호 순 · 그 이동으로 다른 능력이 발동하면 그것부터 끝내고 다음 말 ·
  //   모든 이동이 끝나면 푸시 → (유니온) → 카드 리셋(오퍼 → 카피) 순. 손패는 비공개 — 낸 카드 · 장수만 공개, 딜리트로 본 사람만 알아요.
  // ═══════════════════════════════════════════════════════════════════════
  const ROST = {
    r3: ["grav", "reset", "push", "del", "with", "union", "one", "mirror", "jump", "sil", "quick"],
    r9: ["grav", "push", "del", "offer", "with", "union", "mirror", "copy", "reset", "sil"],
  };
  const NAB = {
    grav: { name: "그래비티", em: "🧲", d: "카드 1장을 공개해 버리고 이동을 포기해요 — 지목한 말이 내 앞이면 내 1칸 앞으로, 뒤면 내 1칸 뒤로 끌어와요" },
    reset: { name: "리셋", em: "♻️", d: "내 말이 뒤로 이동할 때마다 1명을 지목해 그 말의 이동카드를 리셋해요" },
    push: { name: "푸시", em: "👊", d: "다른 말과 같은 칸에 있게 되면 그 말을 앞이나 뒤로 1칸 밀어내요 (출발점에선 안 돼요)" },
    del: { name: "딜리트", em: "🗑️", d: "다른 캐릭터의 능력으로 내가 이동하면 1명을 지목해 그 말의 이동카드를 보고, 1장만 남기고 없애요" },
    with: { name: "위드", em: "🤝", d: "마지막 남은 카드 1장을 쓸 때 1명을 지목하면 같은 칸 수만큼 같이 이동해요" },
    union: { name: "유니온", em: "🧩", d: "이동한 뒤 내 1칸 앞에 있는 말을 모두 내 칸으로 끌어와요 (3화는 무조건, 9화는 선택)" },
    one: { name: "원", em: "☝️", d: "다른 말이 카드 1을 내면, 그 말이 움직이기 전에 내가 앞이나 뒤로 1칸 움직여요" },
    mirror: { name: "미러", em: "🪞", d: "다른 캐릭터의 능력으로 내가 이동하면 1명을 지목해 같은 칸 수만큼 반대 방향으로 이동시켜요" },
    jump: { name: "점프", em: "🦘", d: "이동카드 0~4 다섯 장 · 내 카드로 움직일 때 다른 말이 있는 칸은 건너뛰어요" },
    sil: { name: "사일런스", em: "🔇", d: "카드를 내기 전 1명을 지목해 다음 내 차례까지 능력을 막아요" },
    quick: { name: "퀵", em: "⚡", d: "카드를 2배로 써요 — 한 세트 4장 중 앞으로는 2장까지만, 나머지는 뒤로 가요" },
    offer: { name: "오퍼", em: "🎁", d: "내 카드가 리셋될 때마다 새 카드 중 1장을 다른 말에게 줘요" },
    copy: { name: "카피", em: "📋", d: "내 카드가 리셋될 때마다 1명을 지목해 그 능력을 다음 리셋까지 복사해요" },
  };
  const isVer = v => v === "r3" || v === "r9";
  const cl = o => { if (o === null || typeof o !== "object") return o; if (Array.isArray(o)) { const n = new Array(o.length); for (let i = 0; i < o.length; i++) n[i] = cl(o[i]); return n; } const n = {}; for (const k in o) n[k] = cl(o[k]); return n; };   // 깊은 복사 (JSON 보다 빠름)
  const fullSet = k => (k === "jump" ? [0, 1, 2, 3, 4] : [1, 2, 3, 4]);
  const numN = (st, p) => ROST[st.ver].indexOf(st.ab[p]) + 1;
  const pushN = (st, e) => { if (st.nl) return; e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); };
  const curPN = st => st.tord[st.ti];
  const topJ = st => st.stk[st.stk.length - 1];
  const curSeatN = st => (st.over ? -1 : st.phase === "res" ? st.ow[topJ(st).p] : st.ow[curPN(st)]);
  const silencedN = (st, p) => st.sil.indexOf(p) >= 0 && st.sil.some((t, i) => t === p && st.fin[i] < 0);
  const effN = (st, p) => (st.fin[p] >= 0 || silencedN(st, p) ? null : st.ab[p] === "copy" ? st.cp[p] : st.ab[p]);
  const KEYOF = { mir: "mirror", rst: "reset", del: "del", off: "offer", cpy: "copy" };
  const DEC = { push: 1, uni: 1, onc: 1, mir: 1, rst: 1, del: 1, dk: 1, off: 1, cpy: 1 };
  const winPlaces = st => (st.ver === "r9" ? [st.n, st.n + 1] : Array.from({ length: st.P - 2 }, (_, i) => i + 2));
  const needFin = st => (st.ver === "r9" ? st.n + 1 : st.P - 1);
  function tgN(st, p, key, ok) {   // 지목 가능한 말 (골인한 말 · 나 · 직전에 지목한 말은 못 해요)
    const L = st.lt[p][key], out = [];
    for (let q = 0; q < st.P; q++) if (q !== p && st.fin[q] < 0 && q !== L && (!ok || ok(q))) out.push(q);
    return out;
  }
  const silT = (st, p) => tgN(st, p, "sil");
  const gravT = (st, p) => tgN(st, p, "grav", q => st.pos[q] !== st.pos[p]);
  const withT = (st, p) => tgN(st, p, "with");
  const copyable = (st, q) => st.fin[q] < 0 && !silencedN(st, q) && (st.ab[q] === "copy" ? st.cp[q] : st.ab[q]) != null;

  function initN(n, seed, c) {
    n = Math.max(3, Math.min(5, n | 0 || 4));
    const ver = c.ver, ros = ROST[ver], P = ver === "r9" ? 2 * n : n;
    const st = { ver, n, P, rs: (seed >>> 0) || 1, cfg: c, ow: [], ab: [], pos: Array(P).fill(0), hand: [], fin: Array(P).fill(-1), finOrder: [], hk: [], sup: [], vis: [], cp: Array(P).fill(null), qf: Array(P).fill(0), sil: Array(P).fill(null), lt: Array.from({ length: P }, () => ({})), tord: [], ti: 0, phase: "card", stk: [], pg: 0, round: 0, turnNo: 0, over: false, places: null, ranks: null, log: [], seq: 0 };
    const keys = ros.slice(); for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }   // 제비뽑기
    const okAb = Array.isArray(c.ab) && c.ab.length === P && c.ab.every((k, i) => ros.includes(k) && c.ab.indexOf(k) === i);
    st.ab = okAb ? c.ab.slice() : keys.slice(0, P);
    st.ow = st.ab.map((_, i) => (ver === "r9" ? i >> 1 : i));
    for (let p = 0; p < P; p++) { const h = fullSet(st.ab[p]); st.hand.push(h.slice()); st.hk.push(h.slice()); st.sup.push(h.slice()); st.vis.push([]); }
    st.tord = [...Array(P).keys()].sort((a, b) => numN(st, a) - numN(st, b));
    pushN(st, { k: "start", ab: st.ab.slice(), ow: st.ow.slice() });
    beginTurnN(st);
    return st;
  }
  function beginTurnN(st) {
    if (checkEndN(st)) return;
    let g = 0; while (st.fin[curPN(st)] >= 0 && g++ < 40) { st.ti = (st.ti + 1) % st.P; if (st.ti === 0) st.round++; }
    const p = curPN(st);
    st.stk = []; st.phase = "card"; st.pg = 0;
    if (effN(st, p) === "sil") {   // 사일런스는 '다음 내 차례까지' — 내 차례가 오면 풀려요
      st.sil[p] = null;
      if (silT(st, p).length) st.phase = "sil"; else st.lt[p].sil = null;
    }
    pushN(st, { k: "turn", p, s: st.ow[p], r: st.round });
  }
  function endTurnN(st) {
    st.turnNo++;
    if (checkEndN(st)) return;
    st.ti = (st.ti + 1) % st.P; if (st.ti === 0) st.round++;
    beginTurnN(st);
  }
  function checkEndN(st) {
    if (st.over) return true;
    if (st.finOrder.length < needFin(st) && st.turnNo < MAXTURN) return false;
    const rest = [...Array(st.P).keys()].filter(p => st.fin[p] < 0).sort((a, b) => st.pos[b] - st.pos[a] || numN(st, a) - numN(st, b));
    st.places = st.finOrder.concat(rest);   // places[0] = 1등 (말 번호)
    const W = winPlaces(st);
    st.ranks = Array(st.n).fill(99);
    st.places.forEach((p, i) => { const d = Math.min(...W.map(w => Math.abs(i + 1 - w))), s = st.ow[p]; if (d < st.ranks[s]) st.ranks[s] = d; });
    st.over = true; st.phase = "over"; st.stk = [];
    pushN(st, { k: "end" });
    return true;
  }
  function finishN(st, p) {
    st.fin[p] = st.finOrder.length; st.finOrder.push(p); st.pos[p] = GOAL; st.sil[p] = null;
    for (let i = 0; i < st.P; i++) if (st.sil[i] === p) st.sil[i] = null;
    pushN(st, { k: "goal", p, place: st.finOrder.length });
  }
  function freshN(st, p) { const h = fullSet(st.ab[p]); st.hand[p] = h.slice(); st.hk[p] = h.slice(); st.sup[p] = h.slice(); st.vis[p] = []; st.qf[p] = 0; }
  function consumeN(st, p, c) {
    const h = st.hand[p]; h.splice(h.indexOf(c), 1);
    if (st.hk[p]) { const i = st.hk[p].indexOf(c); if (i >= 0) st.hk[p].splice(i, 1); } else { const i = st.sup[p].indexOf(c); if (i >= 0) st.sup[p].splice(i, 1); }
  }
  function jumpTo(st, p, c) {   // 점프: 다른 말이 있는 칸은 세지 않고 건너뛰어요
    let t = st.pos[p], k = c;
    while (k > 0) { t++; if (t >= GOAL) return GOAL; let occ = false; for (let q = 0; q < st.P; q++) if (q !== p && st.fin[q] < 0 && st.pos[q] === t) { occ = true; break; } if (!occ) k--; }
    return t;
  }
  function displaceN(st, p, to, by) {   // 말 하나가 움직이면 거기서 터지는 능력은 스택 맨 위에 쌓아 바로 처리해요
    const from = st.pos[p]; to = Math.max(0, Math.min(GOAL - 1, to));
    if (to === from) return;
    st.pos[p] = to;
    const d = to - from, e = effN(st, p);
    if (by === "ab") { if (e === "del") st.stk.push({ k: "del", p }); else if (e === "mirror") st.stk.push({ k: "mir", p, d }); }
    if (d < 0 && e === "reset") st.stk.push({ k: "rst", p });
  }
  function jobActs(st, j) {
    const p = j.p, out = [];
    switch (j.k) {
      case "push": { const t = st.pos[j.q]; if (t + 1 < GOAL) out.push({ t: "push", tg: j.q, dir: 1 }); if (t > 0) out.push({ t: "push", tg: j.q, dir: -1 }); break; }
      case "uni": out.push({ t: "uni", u: 1 }, { t: "uni", u: 0 }); break;
      case "onc": if (st.pos[p] + 1 < GOAL) out.push({ t: "onc", dir: 1 }); if (st.pos[p] > 0) out.push({ t: "onc", dir: -1 }); break;
      case "mir": for (const q of tgN(st, p, "mirror")) out.push({ t: "mir", tg: q }); break;
      case "rst": for (const q of tgN(st, p, "reset")) out.push({ t: "rst", tg: q }); break;
      case "del": for (const q of tgN(st, p, "del")) out.push({ t: "del", tg: q }); break;
      case "dk": for (const c of uniq(st.hand[j.q])) out.push({ t: "dk", c }); break;
      case "off": for (const q of tgN(st, p, "offer")) for (const c of uniq(st.hand[p])) out.push({ t: "off", c, tg: q }); break;
      case "cpy": for (const q of tgN(st, p, "copy", q2 => copyable(st, q2))) out.push({ t: "cpy", tg: q }); break;
    }
    return out;
  }
  function pullUnion(st, p) {
    const c = [];
    for (const q of st.tord) if (q !== p && st.fin[q] < 0 && st.pos[q] === st.pos[p] + 1) c.push(q);
    if (!c.length) return;
    pushN(st, { k: "uni", p, pulled: c.slice() });
    st.stk.push({ k: "mv", it: c.map(q => ({ p: q, to: st.pos[p], by: "ab" })), i: 0 });
  }
  function runN(st) {   // 스택의 일을 차례로 — 사람 입력이 필요한 곳에서 멈춰요
    const S = st.stk; let g = 0;
    while (g++ < 4000) {
      if (st.over) return;
      const j = S[S.length - 1];
      if (!j) { endTurnN(st); return; }
      if (DEC[j.k]) {
        if (jobActs(st, j).length) { st.phase = "res"; return; }
        S.pop(); const key = KEYOF[j.k]; if (key) st.lt[j.p][key] = null;   // 지목할 수 있는 말이 없으면 연속이 끊겨요
        continue;
      }
      S.pop();
      switch (j.k) {
        case "mv": {
          if (j.i >= j.it.length) { S.push({ k: "pchk" }); break; }
          const it = j.it[j.i]; S.push({ k: "mv", it: j.it, i: j.i + 1 });
          if (st.fin[it.p] < 0) displaceN(st, it.p, it.to !== undefined ? it.to : st.pos[it.p] + it.rel, it.by);
          break;
        }
        case "pchk": {   // 푸시: 다른 말과 같은 칸에 있으면 (출발점 제외) 밀어내요
          if (++st.pg > 40) break;
          for (const p of st.tord) {
            if ((st.ab[p] !== "push" && st.ab[p] !== "copy") || effN(st, p) !== "push" || st.pos[p] <= 0) continue;
            const q = st.tord.find(x => x !== p && st.fin[x] < 0 && st.pos[x] === st.pos[p]);
            if (q !== undefined) { S.push({ k: "push", p, q }); break; }
          }
          break;
        }
        case "uchk": if (effN(st, j.p) === "union" && st.pos[j.p] > 0) { if (st.ver === "r3") pullUnion(st, j.p); else if (st.tord.some(q => q !== j.p && st.fin[q] < 0 && st.pos[q] === st.pos[j.p] + 1)) S.push({ k: "uni", p: j.p }); } break;
        case "rsx": if (st.fin[j.p] < 0 && st.hand[j.p].length === 0) { freshN(st, j.p); pushN(st, { k: "rs", p: j.p }); S.push({ k: "rev", p: j.p }); } break;
        case "rev": {   // 카드가 리셋되면: 오퍼 → 카피 순
          const p = j.p; if (st.fin[p] >= 0) break;
          const e = effN(st, p);
          if (st.ab[p] === "copy" && !silencedN(st, p)) S.push({ k: "cpy", p });
          if (e === "offer") S.push({ k: "off", p });
          break;
        }
        case "cmv": {   // 카드로 이동 (위드 짝 · 점프 · 퀵 포함) — 동시에 골인하면 이동 전 결승에 가까웠던 말 → 같으면 캐릭터 번호 순
          const p = j.p, c = j.c, e = effN(st, p), before = st.pos.slice(), its = [];
          let to;
          if (st.ab[p] === "quick" && e === "quick") to = Math.max(0, st.pos[p] + (j.d > 0 ? 2 * c : -2 * c));
          else if (e === "jump") to = jumpTo(st, p, c);
          else to = st.pos[p] + c;
          its.push({ p, to, by: "self" });
          if (j.w !== undefined && j.w !== null && st.fin[j.w] < 0) its.push({ p: j.w, to: st.pos[j.w] + c, by: "ab" });
          its.sort((x, y) => numN(st, x.p) - numN(st, y.p));
          for (const x of its.filter(y => y.to >= GOAL).sort((x, y) => before[y.p] - before[x.p] || numN(st, x.p) - numN(st, y.p))) finishN(st, x.p);
          const rest = its.filter(x => x.to < GOAL);
          if (rest.length) S.push({ k: "mv", it: rest, i: 0 });
          break;
        }
      }
    }
    st.stk = []; endTurnN(st);   // (안전장치)
  }

  function actionsN(st) {
    if (st.over) return [];
    if (st.phase === "res") return jobActs(st, topJ(st));
    const p = curPN(st);
    if (st.phase === "sil") return silT(st, p).map(tg => ({ t: "sil", tg }));
    const e = effN(st, p), hand = st.hand[p], U = uniq(hand), out = [];
    const wt = e === "with" && hand.length === 1 ? withT(st, p) : null;
    for (const c of U) {
      if (st.ab[p] === "quick" && e === "quick") { if (st.qf[p] < 2) out.push({ t: "card", c, d: 1 }); out.push({ t: "card", c, d: -1 }); }
      else { out.push({ t: "card", c }); if (wt) for (const w of wt) out.push({ t: "card", c, w }); }
    }
    if (e === "grav") for (const c of U) for (const tg of gravT(st, p)) out.push({ t: "grav", c, tg });
    return out;
  }
  function applyN(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (seat !== curSeatN(st)) return { ok: false, err: "지금은 내 차례가 아니에요" };
    const k = canon(a);
    if (!actionsN(st).some(x => canon(x) === k)) return { ok: false, err: st.phase === "res" ? "지금 해야 하는 선택이 아니에요 (같은 사람을 연속으로 지목하는 것은 안 돼요)" : "그 행동은 할 수 없어요" };
    applyT(st, seat, a);
    return { ok: true };
  }
  function applyT(st, seat, a) {   // 검사 없이 적용 (actionsN 에서 나온 행동만)
    const S = st.stk;
    if (st.phase === "sil") {
      const p = curPN(st), q = a.tg;
      st.sil[p] = q; st.lt[p].sil = q; st.phase = "card";
      if (st.ab[q] === "copy") st.cp[q] = null;   // 사일런스에 걸린 카피는 복사한 능력도 잃어요
      pushN(st, { k: "sil", p, tg: q });
      return;
    }
    if (st.phase === "res") { const j = S.pop(); decideN(st, j, a); runN(st); return; }
    const p = curPN(st);
    if (a.t === "grav") {
      const t = a.tg, to = st.pos[t] > st.pos[p] ? st.pos[p] + 1 : st.pos[p] - 1;
      consumeN(st, p, a.c); st.lt[p].grav = t;
      pushN(st, { k: "grav", p, c: a.c, tg: t, to });
      S.push({ k: "rsx", p }); S.push({ k: "mv", it: [{ p: t, to, by: "ab" }], i: 0 });
    } else {
      const c = a.c, w = a.w !== undefined ? a.w : null;
      consumeN(st, p, c);
      if (st.ab[p] === "quick" && (a.d > 0 || effN(st, p) !== "quick")) st.qf[p]++;   // 앞으로 쓴 카드 수 (사일런스에 걸리면 앞으로만, 그것도 셈)
      if (w !== null) st.lt[p].with = w;
      pushN(st, { k: "card", p, c, w, d: a.d });
      S.push({ k: "rsx", p }); S.push({ k: "uchk", p }); S.push({ k: "cmv", p, c, w, d: a.d });
      if (c === 1) { const q = st.tord.find(x => x !== p && st.fin[x] < 0 && (st.ab[x] === "one" || st.ab[x] === "copy") && effN(st, x) === "one"); if (q !== undefined) S.push({ k: "onc", p: q }); }
    }
    runN(st);
  }
  function decideN(st, j, a) {
    const S = st.stk, p = j.p, seat = st.ow[p];
    switch (j.k) {
      case "push": { const t = st.pos[j.q] + a.dir; pushN(st, { k: "push", p, tg: j.q, dir: a.dir }); S.push({ k: "mv", it: [{ p: j.q, to: t, by: "ab" }], i: 0 }); break; }
      case "uni": if (a.u) pullUnion(st, p); else pushN(st, { k: "nouni", p }); break;
      case "onc": pushN(st, { k: "one", p, dir: a.dir }); S.push({ k: "mv", it: [{ p, to: st.pos[p] + a.dir, by: "self" }], i: 0 }); break;
      case "mir": st.lt[p].mirror = a.tg; pushN(st, { k: "mir", p, tg: a.tg, d: j.d }); S.push({ k: "mv", it: [{ p: a.tg, rel: -j.d, by: "ab" }], i: 0 }); break;
      case "rst": st.lt[p].reset = a.tg; pushN(st, { k: "rst", p, tg: a.tg }); freshN(st, a.tg); S.push({ k: "rev", p: a.tg }); break;
      case "del": {
        const q = a.tg; st.lt[p].del = q; pushN(st, { k: "del", p, tg: q });
        if (!st.vis[q].includes(seat)) st.vis[q].push(seat);   // 딜리트한 사람은 그 말의 카드를 봐요
        if (st.hand[q].length > 1) S.push({ k: "dk", p, q });
        break;
      }
      case "dk": {
        const q = j.q, n0 = st.hand[q].length;
        st.sup[q] = st.hk[q] ? st.hk[q].slice() : st.sup[q].slice(); st.hk[q] = null; st.hand[q] = [a.c]; st.vis[q] = [seat];
        pushN(st, { k: "dk", p, q, n: n0 - 1 });
        break;
      }
      case "off": {
        const q = a.tg, sg = seat, known = st.hk[q] !== null || st.vis[q].includes(sg);
        consumeOffer(st, p, q, a.c); st.lt[p].offer = q;
        st.vis[q] = known ? [sg] : [];
        pushN(st, { k: "off", p, tg: q });
        break;
      }
      case "cpy": {
        const q = a.tg, was = st.cp[p], ab2 = st.ab[q] === "copy" ? st.cp[q] : st.ab[q];
        st.cp[p] = ab2; st.lt[p].copy = q; if (was === "sil") st.sil[p] = null;
        pushN(st, { k: "cpy", p, tg: q, ab: ab2 });
        break;
      }
    }
  }
  function consumeOffer(st, p, q, c) {   // 오퍼: 카드 1장을 내 손에서 상대 손으로 — 남들은 어떤 카드인지 몰라요
    const h = st.hand[p]; h.splice(h.indexOf(c), 1);
    st.sup[p] = st.hk[p] ? st.hk[p].slice() : st.sup[p].slice(); st.hk[p] = null; st.vis[p] = [];
    st.sup[q] = (st.hk[q] ? st.hk[q] : st.sup[q]).concat([1, 2, 3, 4]); st.hk[q] = null;
    st.hand[q].push(c); st.hand[q].sort((x, y) => x - y);
  }

  // ── 보이는 것 (그 자리 시점 — 남의 손패는 몰라요, 'all' 은 복기용 전부 공개) ──
  function viewN(st, seat) {
    const all = seat === "all", S = all ? -2 : seat;
    // 남은 손패는 비밀 (방송대로): 내 말 · 딜리트로 본 말만 손패가 보여요. hk = '낸 카드를 지워 가면 알 수 있는 손패' 라서 AI 는 sup(가능한 카드)으로만 알고 화면엔 안 보여요
    const knows = p => all || st.ow[p] === S || (st.vis[p] || []).includes(S);
    const hand = st.hand.map((h, p) => (knows(p) ? h.slice() : null));
    const sup = st.hand.map((h, p) => (knows(p) ? null : (st.hk[p] || st.sup[p]).slice()));
    const cnt = st.hand.map(h => h.length), pubK = st.hk.map(h => (h ? h.slice() : null));
    const sn = { ver: st.ver, n: st.n, P: st.P, ow: st.ow.slice(), ab: st.ab.slice(), tord: st.tord.slice(), ti: st.ti, phase: st.phase, pos: st.pos.slice(), fin: st.fin.slice(), finOrder: st.finOrder.slice(), cnt, hand, sup, cp: st.cp.slice(), sil: st.sil.slice(), lt: cl(st.lt), qf: st.qf.slice(), stk: cl(st.stk), round: st.round, turnNo: st.turnNo, over: st.over };
    const curP = st.over ? -1 : st.phase === "res" ? topJ(st).p : curPN(st);
    return Object.assign({ seat, cur: curSeatN(st), curP, needs: st.over ? [] : [curSeatN(st)], W: winPlaces(st), need: needFin(st), ranks: st.ranks ? st.ranks.slice() : null, places: st.places ? st.places.slice() : null, log: st.log.slice(-30), pub: hash(JSON.stringify([st.pos, st.fin, cnt, pubK, st.phase, st.ti, st.stk, st.seq, st.sil, st.cp])), job: st.phase === "res" ? cl(topJ(st)) : null, st: sn }, sn);
  }
  function fromViewN(V, r) {   // AI · 선생님용 — 모르는 손패는 공개된 범위 안에서 뽑아 채워요 (r 이 없으면 앞에서부터)
    const st = cl(V.st);
    st.rs = 1; st.cfg = { ver: V.ver }; st.places = null; st.ranks = null; st.log = []; st.seq = 0; st.pg = 0;
    st.hk = st.hand.map(h => (h ? h.slice() : null)); st.vis = st.hand.map(() => []);
    st.hand = st.hand.map((h, p) => {
      if (h) return h.slice();
      const pool = (st.sup[p] || []).slice(), k = st.cnt[p], out = [];
      while (out.length < k && pool.length) out.push(pool.splice(r ? Math.floor(r() * pool.length) : 0, 1)[0]);
      while (out.length < k) out.push(1 + (r ? Math.floor(r() * 4) : 0));
      return out.sort((x, y) => x - y);
    });
    st.sup = st.sup.map((s, p) => (s || st.hand[p].slice()));
    delete st.cnt; return st;
  }

  // ── AI (보이는 것만 + 모르는 손패는 표본으로) ─────────────────────────
  const BUDGET = { hard: { r3: 200, r9: 40 }, normal: { r3: 50, r9: 16 }, min: 3 };
  function settledN(st, me) {   // 내 말들의 최종 순위가 이미 정해졌으면 그 보상 — 아니면 -1 (끝까지 안 돌려도 되는 때)
    const W = winPlaces(st); let best = 99, open = false;
    for (let p = 0; p < st.P; p++) if (st.ow[p] === me) {
      if (st.fin[p] < 0) { open = true; continue; }
      const pl = st.fin[p] + 1; for (const w of W) { const d = Math.abs(pl - w); if (d < best) best = d; }
    }
    return best === 0 || !open ? 1 / (1 + best) : -1;
  }
  const WORK = { n: 0 };   // 일 단위(행동 한 번 = 1) 세기 — 시간 대신 일의 양으로 예산을 잘라 같은 판이면 언제나 같은 수가 나와요
  function rolloutN(st0, me, r) {
    const st = st0; st.nl = 1; let g = 0, nf = -1;
    while (!st.over && g++ < 4000) {
      WORK.n++;
      if (st.finOrder.length !== nf) { nf = st.finOrder.length; const x = settledN(st, me); if (x >= 0) return x; }
      const acts = actionsN(st); if (!acts.length) break; applyT(st, curSeatN(st), acts[Math.floor(r() * acts.length)]);
    }
    if (!st.over) { st.turnNo = MAXTURN; checkEndN(st); }
    return reward(st, me);
  }
  function trialN(base, me, a, sd) {
    WORK.n += 40;
    const s2 = cl(base); s2.nl = 1; applyT(s2, me, a);
    if (s2.over) return reward(s2, me);
    const x = settledN(s2, me);
    return x >= 0 ? x : rolloutN(s2, me, sampler((sd ^ 0x5bd1e995) >>> 0));
  }
  // 일의 양 상한 (행동 수 단위 · 이 PC 에서 일 1 ≈ 0.0035ms): AI 한 번 ≈ 90ms · 선생님 한 번 ≈ 140ms 안 — 시계가 아니라 일의 양으로 잘라 같은 판이면 언제나 같은 수예요
  const WCAP = { hard: 15000, normal: 8000, coach: 28000 };
  function evalN(V, me, r, trials, cap) {
    const acts = actionsN(fromViewN(V)), res = acts.map(a => ({ a, v: 0, wp: 0 })), w0 = WORK.n; let done = 0;
    for (let i = 0; i < trials; i++) {
      if (i >= 6 && cap && WORK.n - w0 > cap) break;   // 표본을 6번은 모아야 비교가 돼요
      const sd = Math.floor(r() * 4294967296) >>> 0, base = fromViewN(V, sampler(sd)); WORK.n += 40;
      for (const x of res) { const v = trialN(base, me, x.a, sd); x.v += v; if (v > 0.999) x.wp++; }
      done++;
    }
    for (const x of res) { x.v /= Math.max(1, done); x.wp /= Math.max(1, done); }
    return res;
  }
  function aiN(V, me, tier, r) {   // 좋아 보이는 수를 남기며 표본을 모아요 (반씩 줄이기) — 모르는 손패는 표본으로
    const acts = actionsN(fromViewN(V));
    if (!acts.length) return null;
    if (acts.length === 1 || tier === "easy") return acts[Math.floor(r() * acts.length)];
    const hard = tier === "hard", bud = BUDGET[hard ? "hard" : "normal"][V.ver];
    let alive = acts.map(a => ({ a, v: 0, n: 0 }));
    const w0 = WORK.n, cap = WCAP[hard ? "hard" : "normal"];
    const rounds = Math.max(1, Math.ceil(Math.log2(alive.length)));
    for (let rd = 0; rd < rounds; rd++) {
      const t = Math.max(BUDGET.min, Math.round(bud / rounds / alive.length));
      for (let i = 0; i < t; i++) {
        if (i >= 1 && WORK.n - w0 > cap) break;   // 일의 양 상한 — 후보마다 표본 1번은 모아요
        const sd = Math.floor(r() * 4294967296) >>> 0, base = fromViewN(V, sampler(sd)); WORK.n += 40;
        for (const x of alive) { x.v += trialN(base, me, x.a, sd); x.n++; }
      }
      if (rd === rounds - 1 || alive.length === 1) break;
      alive.sort((x, y) => y.v / y.n - x.v / x.n);
      alive = alive.slice(0, Math.ceil(alive.length / 2));
    }
    const sc = x => x.v / x.n; let m = -1; for (const x of alive) if (sc(x) > m) m = sc(x);
    const best = alive.filter(x => sc(x) >= m - 1e-9);
    return best[Math.floor(r() * best.length)].a;
  }
  function compareN(V, me, myA, bestA, seed, trials) {
    const st0 = fromViewN(V), legalK = actionsN(st0).map(canon), km = canon(myA), kb = canon(bestA);
    if (km === kb || !legalK.includes(km) || !legalK.includes(kb)) return null;
    const T = Math.max(20, trials | 0 || 300), xm = [], xb = [];
    for (let i = 0; i < T; i++) {
      const sd = ((seed >>> 0) + Math.imul(i + 1, 0x9e3779b1)) >>> 0, base = fromViewN(V, sampler(sd));
      for (const [a, xs] of [[myA, xm], [bestA, xb]]) {
        xs.push(trialN(base, me, cl(a), sd));
      }
    }
    const mean = xs => xs.reduce((p, q) => p + q, 0) / xs.length, wp = xs => xs.filter(x => x > 0.999).length / xs.length;
    const d = xb.map((x, i) => x - xm[i]), md = mean(d), sd2 = Math.sqrt(d.reduce((p, q) => p + (q - md) * (q - md), 0) / Math.max(1, d.length - 1));
    return { my: { v: mean(xm), wp: wp(xm) }, best: { v: mean(xb), wp: wp(xb) }, dV: md, dWp: wp(xb) - wp(xm), se: sd2 / Math.sqrt(d.length), trials: T };
  }

  // ── 글 (행동 한 줄 · AI 선생님) ───────────────────────────────────────
  const abN = (V, p) => { const k = V && V.ab ? V.ab[p] : null; return k ? NAB[k] : null; };
  function pLabel(V, p, who) {   // 말 이름 — 3화는 "나(🧲그래비티)" · 9화(자리마다 말 2개)는 "🧲그래비티(나)"
    const b = abN(V, p); if (!b) return `말 ${p + 1}번`;
    if (!who) return `${b.em}${b.name}`;
    return V.ver === "r9" ? `${b.em}${b.name}(${who(V.ow[p])})` : `${who(V.ow[p])}(${b.em}${b.name})`;
  }
  function actTextN(a, who, V) {
    if (!a || typeof a !== "object") return "—";
    const L = p => pLabel(V, p, who), P = i => (V.pos[i] !== undefined ? V.pos[i] : null);
    const cp = V.curP >= 0 ? V.curP : null, job = V.job;
    const mv = (p, d) => { const x = P(p); if (x === null) return ""; const q = Math.max(0, Math.min(GOAL, x + d)); return ` (${x}칸 → ${q >= GOAL ? "🏁 골인" : `${q}칸`})`; };
    switch (a.t) {
      case "sil": return `🔇 ${L(a.tg)}의 능력을 막아요`;
      case "push": return `👊 ${L(a.tg)}${jong(L(a.tg)) ? "을" : "를"} ${a.dir > 0 ? "앞으로" : "뒤로"} 1칸 밀어요${mv(a.tg, a.dir)}`;
      case "uni": return a.u ? "🧩 앞 칸의 말들을 끌어와요" : "끌어오지 않고 넘어가요";
      case "onc": return `☝️ ${a.dir > 0 ? "앞으로" : "뒤로"} 1칸 움직여요${cp !== null ? mv(cp, a.dir) : ""}`;
      case "mir": return `🪞 ${L(a.tg)}${jong(L(a.tg)) ? "을" : "를"} 반대로 ${job && job.d ? Math.abs(job.d) + "칸 " : ""}이동시켜요`;
      case "rst": return `♻️ ${L(a.tg)}의 이동카드를 리셋해요`;
      case "del": return `🗑️ ${L(a.tg)}의 이동카드를 확인해요`;
      case "dk": return `🗑️ 카드 ${a.c}만 남기고 없애요`;
      case "off": return `🎁 카드 ${a.c}${jong(String(a.c)) ? "을" : "를"} ${L(a.tg)}에게 줘요`;
      case "cpy": return `📋 ${L(a.tg)}의 능력을 복사해요`;
      case "grav": { const ps = cp !== null ? P(cp) : null, pt = P(a.tg), t2 = ps !== null && pt !== null ? (pt > ps ? ps + 1 : ps - 1) : null; return `🧲 ${a.c} 카드를 버리고 ${L(a.tg)}${jong(L(a.tg)) ? "을" : "를"} 끌어와요${t2 !== null ? ` (${pt}칸 → ${t2}칸)` : ""}`; }
      case "card": {
        if (a.c === undefined) return "—";
        const b = cp !== null ? V.ab[cp] : null, qk = b === "quick", p0 = cp !== null ? P(cp) : null;
        let s = `카드 ${a.c}`;
        if (qk && a.d) s = `⚡ 카드 ${a.c} × 2 ${a.d > 0 ? "앞으로" : "뒤로"}${p0 !== null ? mv(cp, a.d * 2 * a.c) : ""}`;
        else if (cp !== null) s += b === "jump" ? mv(cp, jumpTo(V, cp, a.c) - V.pos[cp]) : mv(cp, a.c);
        if (a.w !== undefined && a.w !== null) s += ` + 🤝 ${L(a.w)} 같이 이동${mv(a.w, a.c)}`;
        return s;
      }
    }
    return "—";
  }
  function coachN(V, me, since, names) {
    const who = i => (i === me ? "나" : nm(names, i)), wTxt = V.W.map(w => `${w}등`).join("·");
    const mineP = [...Array(V.P).keys()].filter(p => V.ow[p] === me);
    const line = p => `${pLabel(V, p, who)} ${V.fin[p] >= 0 ? `${V.fin[p] + 1}등 골인` : `${V.pos[p]}칸 · 카드 ${V.hand[p] ? V.hand[p].join("·") : `${V.cnt[p]}장`}`}`;
    const placeNow = p => 1 + V.pos.filter((x, q) => q !== p && (V.fin[q] >= 0 ? V.fin[q] < (V.fin[p] >= 0 ? V.fin[p] : 99) : V.fin[p] < 0 && x > V.pos[p])).length;
    if (!(me >= 0 && me < V.n)) return { opp: `구경 중이에요 — 지금 ${V.finOrder.length}개 말이 골인했어요`, mine: "-", rec: "-", why: `자리에 앉은 사람에게만 추천이 나와요. (우승 순위는 ${wTxt})` };
    const opp = V.tord.filter(p => V.ow[p] !== me).map(line).join(" / ");
    const mine = mineP.map(line).join(" / ");
    if (V.over) { const win = V.ranks[me] === 0; return { opp, mine, rec: win ? "우승했어요!" : `${wTxt}으로 골인한 말이 우승이었어요`, why: `최종 순위: ${V.places.map((p, i) => `${i + 1}등 ${pLabel(V, p, who)}`).join(" · ")}. 우승 순위는 ${wTxt}이에요 — 1등으로 달리는 게 아니라 순위를 맞추는 게임이에요.` }; }
    if (V.cur !== me) {
      const p = V.curP, hc = V.hand[p], c = V.cnt[p], x = V.pos[p];
      const guess = hc ? `카드 ${hc.join("·")}라서 다음엔 ${x + Math.min(...hc) >= GOAL ? "골인" : `${x + Math.min(...hc)}칸`}~${x + Math.max(...hc) >= GOAL ? "골인" : `${x + Math.max(...hc)}칸`}이 돼요` : `카드 ${c}장 중 ${V.sup[p].join("·")} 중에서 나올 거예요 (남의 손패는 비밀이라 낸 카드로 짐작해요)`;
      return { opp, mine, rec: "기다려요", why: `${pLabel(V, p, who)}(${V.job ? V.job.k : "차례"}) — ${x}칸에서 ${guess}. 내 말은 ${mineP.map(m => `${V.fin[m] >= 0 ? `${V.fin[m] + 1}등 골인` : `${V.pos[m]}칸`}`).join(" · ")}예요. 우승 순위는 ${wTxt} · 지금 ${V.finOrder.length}개 말이 골인했고 ${V.need}번째가 골인하면 끝나요.` };
    }
    const res = evalN(V, me, sampler(V.turnNo * 17 + me * 5 + V.pos.reduce((x, y) => x + y, 0) + 1), 24, WCAP.coach).sort((x, y) => (y.wp - x.wp) || (y.v - x.v));
    const top = res[0], second = res[1];
    return { opp, mine, rec: actTextN(top.a, who, V), why: `이 수로 끝까지 해 보면 우승 순위로 끝날 가능성이 약 ${Math.round(top.wp * 100)}%${second ? ` (다음 후보 ${actTextN(second.a, who, V)} ${Math.round(second.wp * 100)}%)` : ""}예요 — 상대 손패는 비밀이라 짐작한 표본으로 재요. 우승은 1등이 아니라 ${wTxt}이고, 지금 ${V.finOrder.length}개 말이 골인했어요.` };
  }

  return { id: "gn-midrun", WORK, WCAP, BUDGET, GOAL, SETC, KEYS, AB, WIN, NEED, ROST, NAB, winPlaces, numN, effN, silencedN, jumpTo, init, needs, apply, view, over, ranks, legal, auto, advance, actions, fromView, ai, coach, rollout, evalActions, compareActs, actText, canon, sampler, hash, cur, silenced, silTargets, gravTargets, withTargets };
});

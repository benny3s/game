/* 베니 서바이벌 · 하이 앤 로우 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 피의 게임 시즌X · 하이 앤 로우 (데스매치 6일차, 4명)
   · 준비물: 사람마다 숫자 카드 1~10 (뒷면 1~5 파랑 · 6~10 노랑) + 특수 카드 노멀 · 리버스. 점수 카드 10장 = 2 · 4 · 6 · 8 · 10 · −1 · −3 · −5 · −7 · −9,
     시작 전 무작위 1장을 빼고 9장 (한 장씩 공개)
   · 9라운드. 라운드마다 점수 카드 1장이 공개되면 ① 모두 숫자 카드 1장 + 특수 카드 1장을 겹쳐 숨겨 내요
     ② 낸 리버스 카드가 홀수 개면 '낮은 숫자가 우위', 아니면 '높은 숫자가 우위' ③ 숫자 카드 뒷면(파랑/노랑)이 모두 공개돼요
     ④ 선 플레이어부터 차례로 앞면을 공개해요. 한 라운드에 1명은 공개를 포기할 수 있고, 선 플레이어와 지난 라운드에 포기한 사람은 반드시 공개해요
   · 우위가 가장 높은 카드를 낸 사람이 점수 카드를 가져가요. 그 카드를 낸 사람이 여럿이면 그다음 우위 카드를 혼자 낸 사람이 가져가요. 가져갈 사람이 없으면 다음 라운드로 넘어가
     그 라운드 승자가 같이 가져가요
   · 마이너스 점수 카드: 공개를 포기한 사람이 있으면 그 사람이 가져가요. 그때 같은 숫자 카드를 낸 사람이 있으면 가져간 사람이 그중 1명에게 넘길 수 있어요
   · 9라운드 뒤 점수 합이 높은 순서. 상위 2명 생존 (같으면 더 높은 점수 카드를 가진 쪽)
   방송과 다른 점(우리가 정함):
     ① 특수 카드는 노멀 8장 + 리버스 1장 (9라운드에 맞춤) · 숫자 카드 10장 중 1장은 안 쓰고 남아요
     ② 리버스를 몇 개 냈는지는 안 밝히고, 방향(높은 쪽 / 낮은 쪽)만 공개해요 · 누가 냈는지는 끝까지 비밀
     ③ 이월된 더미는 합이 음수면 마이너스 점수 카드로 봐요 · 마지막 라운드에 남은 더미는 아무도 못 가져가요
     ④ 포기한 사람의 카드는 우위 비교에서 빠지고 끝까지 비밀 · 포기는 내 공개 차례가 와서 고름 · '혼자 낸 사람'은 우위가 높은 숫자부터 내려가며 처음 나오는 한 명
     ⑤ 마이너스 더미를 포기한 사람이 가져가면 그 사람에게 '넘기기' 선택이 늘 와요 (같은 숫자를 낸 사람이 없으면 가질 수밖에 없음 — 있는지 없는지가 새지 않게)
     ⑥ 순위는 점수 → 같으면 가진 점수 카드 중 가장 높은 것 → 그래도 같으면 공동
   4명 고정 · 한 기기로는 못 해요 (숨겨 내기) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).hilo = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ROUNDS = 9, NORMALS = 8, SCORES = [2, 4, 6, 8, 10, -1, -3, -5, -7, -9];
  const colorOf = n => (n <= 5 ? "B" : "Y");   // 파랑 · 노랑
  const sum = a => a.reduce((x, y) => x + y, 0);
  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 가장 우위인 숫자를 '혼자' 낸 사람 (여럿이 낸 숫자는 건너뜀) — 없으면 -1.  nums: 자리별 숫자 (포기 · 모름 = null)
  function winnerOf(nums, dir) {
    const g = {};
    nums.forEach((x, i) => { if (x != null) (g[x] = g[x] || []).push(i); });
    const ks = Object.keys(g).map(Number).sort((a, b) => (dir === "low" ? a - b : b - a));
    for (const k of ks) if (g[k].length === 1) return g[k][0];
    return -1;
  }

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ seed }) {
    const st = {
      n: 4, rs: (seed >>> 0) || 1, R: ROUNDS, round: 0, first: 0, deck: [], removed: 0,
      hand: Array.from({ length: 4 }, () => ({ nums: ALL.slice(), norm: NORMALS, rev: true, revAt: 0 })),
      took: [[], [], [], []], used: [[], [], [], []], hid: [0, 0, 0, 0], carry: [], hist: [], lastQuit: -1,
      log: [], seq: 0, phase: "", over: false, res: null, cur: 0, leader: 0, sub: [], dir: null, col: null, shown: [], quit: -1, order: [], ri: 0,
    };
    const d = shuffle(() => rnd(st), SCORES.slice());
    st.removed = d.pop(); st.deck = d;
    st.first = Math.floor(rnd(st) * 4);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.cur = st.deck[st.round - 1];
    st.leader = (st.first + st.round - 1) % 4;
    st.sub = [null, null, null, null]; st.dir = null; st.col = null; st.shown = [null, null, null, null]; st.quit = -1;
    st.order = [0, 1, 2, 3].map(k => (st.leader + k) % 4); st.ri = 0; st.res = null; st.phase = "play";
    push(st, { k: "round", r: st.round, cur: st.cur, carry: st.carry.slice(), leader: st.leader });
  }
  const canQuit = (st, seat) => st.phase === "reveal" && st.quit < 0 && seat !== st.leader && seat !== st.lastQuit;
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "play") return [0, 1, 2, 3].filter(i => !st.sub[i]);
    if (st.phase === "reveal") return [st.order[st.ri]];
    if (st.phase === "pass") return [st.quit];
    return [];
  }
  const passOpts = st => (st.quit < 0 ? [] : [0, 1, 2, 3].filter(i => i !== st.quit && st.shown[i] != null && st.shown[i] === st.sub[st.quit].n));

  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "play") {
      const h = st.hand[seat];
      if (a.t !== "play" || !Number.isInteger(a.n) || !h.nums.includes(a.n)) return { ok: false, err: "아직 안 쓴 숫자 카드를 골라요" };
      if (a.s !== "N" && a.s !== "R") return { ok: false, err: "특수 카드(노멀 · 리버스)를 골라요" };
      if (a.s === "N" && h.norm <= 0) return { ok: false, err: "노멀 카드가 없어요 — 리버스를 내야 해요" };
      if (a.s === "R" && !h.rev) return { ok: false, err: "리버스는 이미 썼어요" };
      h.nums.splice(h.nums.indexOf(a.n), 1);
      if (a.s === "N") h.norm--; else { h.rev = false; h.revAt = st.round; }
      st.sub[seat] = { n: a.n, s: a.s };
      push(st, { k: "played", s: seat });
      if (st.sub.every(Boolean)) {
        const odd = st.sub.filter(x => x.s === "R").length % 2;
        st.dir = odd ? "low" : "high"; st.col = st.sub.map(x => colorOf(x.n)); st.phase = "reveal"; st.ri = 0;
        push(st, { k: "dir", dir: st.dir, col: st.col.slice() });
      }
      return { ok: true };
    }
    if (st.phase === "reveal") {
      if (a.t === "show") { st.shown[seat] = st.sub[seat].n; st.used[seat].push(st.sub[seat].n); push(st, { k: "show", s: seat, n: st.shown[seat] }); }
      else if (a.t === "quit") {
        if (!canQuit(st, seat)) return { ok: false, err: seat === st.leader ? "선 플레이어는 꼭 공개해야 해요" : seat === st.lastQuit ? "지난 라운드에 포기했으면 꼭 공개해야 해요" : "이번 라운드 포기는 이미 나왔어요" };
        st.quit = seat; st.hid[seat]++; push(st, { k: "quit", s: seat });
      } else return { ok: false, err: "공개하거나 포기하거나 둘 중에서 골라요" };
      if (++st.ri >= 4) resolve(st);
      return { ok: true };
    }
    // 넘기기 선택
    if (a.t !== "pass" || !(a.to === -1 || passOpts(st).includes(a.to))) return { ok: false, err: "같은 숫자를 낸 사람에게만 넘길 수 있어요" };
    take(st, a.to >= 0 ? a.to : st.quit, a.to >= 0 ? st.quit : -1);
    return { ok: true };
  }
  function resolve(st) {
    const pile = st.carry.concat([st.cur]);
    if (sum(pile) < 0 && st.quit >= 0) { st.phase = "pass"; return; }
    take(st, winnerOf(st.shown, st.dir), -1);
  }
  // 점수 카드 더미를 taker 가 가져감 (-1 = 이월). from = 포기하고 넘긴 사람
  function take(st, taker, from) {
    const pile = st.carry.concat([st.cur]), total = sum(pile);
    const rec = { r: st.round, cur: st.cur, carry: st.carry.slice(), pile, total, dir: st.dir, col: st.col.slice(), shown: st.shown.slice(), quit: st.quit, taker, from, best: winnerOf(st.shown, st.dir), carried: taker < 0 };
    if (taker >= 0) { st.took[taker].push(...pile); st.carry = []; } else st.carry = pile;
    st.hist.push(rec); st.res = rec; st.lastQuit = st.quit;
    push(st, { k: "take", r: st.round, taker, from, total, pile });
    if (st.round >= st.R) { st.over = true; st.phase = "end"; push(st, { k: "end" }); } else st.phase = "show";
  }
  const auto = st => (st.phase === "show" && !st.over ? 4200 : null);
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  function ranks(st) {
    const tot = st.took.map(sum), top = st.took.map(t => (t.length ? Math.max(...t) : -99));
    const above = (a, b) => (tot[a] !== tot[b] ? tot[a] > tot[b] : top[a] > top[b]);
    return tot.map((_, i) => tot.filter((_, j) => above(j, i)).length);
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "play") {
      const h = st.hand[seat], L = [];
      for (const n of h.nums) { if (h.norm > 0) L.push({ t: "play", n, s: "N" }); if (h.rev) L.push({ t: "play", n, s: "R" }); }
      return L;
    }
    if (st.phase === "reveal") return [{ t: "show" }].concat(canQuit(st, seat) ? [{ t: "quit" }] : []);
    return [{ t: "pass", to: -1 }].concat(passOpts(st).map(to => ({ t: "pass", to })));
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const hands = st.hand.map((h, i) => (all || i === me ? { nums: h.nums.slice(), norm: h.norm, rev: h.rev, revAt: h.revAt, sub: st.sub[i] ? { n: st.sub[i].n, s: st.sub[i].s } : null } : null));
    const pile = st.over && st.res ? st.res.pile.slice() : st.carry.concat([st.cur]);
    const turn = st.phase === "reveal" ? st.order[st.ri] : st.phase === "pass" ? st.quit : -1;
    const hist = st.hist.map(h => ({ ...h, carry: h.carry.slice(), pile: h.pile.slice(), col: h.col.slice(), shown: h.shown.slice() }));
    const pubObj = { r: st.round, p: st.phase, l: st.leader, c: st.cur, cy: st.carry, pl: st.sub.map(Boolean), d: st.dir, co: st.col, t: turn, sh: st.shown, q: st.quit, lq: st.lastQuit, u: st.used, hd: st.hid, tk: st.took, h: st.hist, ov: st.over };
    return {
      n: 4, R: st.R, round: st.round, phase: st.phase, leader: st.leader, cur: st.cur, carry: st.carry.slice(), pile, left: st.R - st.round,
      played: st.sub.map(Boolean), dir: st.dir, col: st.col ? st.col.slice() : null, order: st.order.slice(), turn, canQuit: turn >= 0 && canQuit(st, turn),
      shown: st.shown.slice(), quit: st.quit, lastQuit: st.lastQuit, used: st.used.map(u => u.slice()), hid: st.hid.slice(), took: st.took.map(t => t.slice()),
      hands, passOpts: st.phase === "pass" && (all || me === st.quit) ? passOpts(st) : null, hist, res: st.res && (st.phase === "show" || st.over) ? { ...st.res, pile: st.res.pile.slice(), shown: st.res.shown.slice() } : null,
      needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null, score: st.took.map(sum),
      log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 믿음 · 확률 (보이는 것만) ───────────────────────────────
  // 자리마다 아직 가졌을 수 있는 숫자 (공개된 것은 뺌 · 포기해서 숨긴 카드는 알 수 없어 그대로 둠). byCol = 뒷면 색까지 맞춤
  function pools(V, me, byCol) {
    return V.used.map((u, j) => (j === me ? [] : ALL.filter(n => !u.includes(n) && (!byCol || !V.col || colorOf(n) === V.col[j]))));
  }
  // 상대마다 '이번 라운드에 리버스를 낼' 확률 — 상대가 리버스를 쓸 라운드를 1~9 중 고르게 골랐다고 보고,
  // 지난 라운드마다 공개된 방향(리버스 개수의 홀짝)과 맞는 경우만 남겨서 셈
  function revPost(V, me) {
    const opps = [0, 1, 2, 3].filter(j => j !== me), t = V.round, my = V.hands[me].revAt;
    const par = []; for (const h of V.hist) par[h.r] = h.dir === "low" ? 1 : 0;
    const w = [0, 0, 0, 0]; let tot = 0;
    for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) for (let c = 1; c <= 9; c++) {
      const u = [a, b, c]; let good = true;
      for (let k = 1; k < t && good; k++) { let cnt = my === k ? 1 : 0; for (const x of u) if (x === k) cnt++; if ((cnt & 1) !== par[k]) good = false; }
      if (!good) continue;
      tot++; u.forEach((x, i) => { if (x === t) w[opps[i]]++; });
    }
    return w.map(x => (tot ? x / tot : 1 / 9));
  }
  // 앞으로 나올 수 있는 점수 카드 (이미 공개된 것 뺀 나머지 — 뺀 1장도 섞여 있음) 중 양수 평균
  function meanPos(V) {
    const seen = V.hist.map(h => h.cur).concat([V.cur]);
    const rest = SCORES.filter(x => !seen.includes(x) && x > 0);
    return rest.length ? sum(rest) / rest.length : 0;
  }
  const SAVE = 0.5, RCOST = 0.4;
  // 낼 카드(숫자 · 특수)마다 → 내가 이 더미를 가져갈 확률 p 와 기대값 ev (상대는 남은 숫자 중 아무거나 낸다고 보고 S 번 돌려 봄)
  function evalPlay(V, me, S, r) {
    const h = V.hands[me], pile = sum(V.pile), post = revPost(V, me), pool = pools(V, me), mp = meanPos(V);
    const opps = [0, 1, 2, 3].filter(j => j !== me);
    const smp = Array.from({ length: S }, () => opps.map(j => ({ j, n: pool[j][Math.floor(r() * pool[j].length)], rv: r() < post[j] ? 1 : 0 })));
    const out = [];
    for (const n of h.nums) for (const s of [h.norm > 0 ? "N" : null, h.rev ? "R" : null]) {
      if (!s) continue;
      let w = 0;
      for (const sm of smp) {
        let rv = s === "R" ? 1 : 0; const nums = [null, null, null, null]; nums[me] = n;
        for (const o of sm) { nums[o.j] = o.n; rv += o.rv; }
        if (winnerOf(nums, rv & 1 ? "low" : "high") === me) w++;
      }
      const p = w / S;
      out.push({ n, s, p, ev: p * (pile - SAVE * mp) - (s === "R" ? RCOST : 0) });
    }
    return out.sort((a, b) => b.ev - a.ev);
  }
  // 공개할 차례: 공개하면 → 내가 가져갈 확률(pShow) · 기대 점수(evShow), 포기하면(마이너스 더미만 뜻이 있음) → evQuit
  function evalReveal(V, me, S, r) {
    const mine = V.hands[me].sub.n, pile = sum(V.pile), pool = pools(V, me, true);
    let w = 0, sh = 0;
    for (let k = 0; k < S; k++) {
      const nums = V.shown.slice(); nums[me] = mine;
      for (let j = 0; j < 4; j++) {
        if (j === me) continue;
        if (V.quit === j) nums[j] = null;
        else if (V.shown[j] == null) nums[j] = pool[j][Math.floor(r() * pool[j].length)];
      }
      if (winnerOf(nums, V.dir) === me) w++;
      if (nums.some((x, j) => j !== me && x === mine)) sh++;
    }
    const pShow = w / S, pShare = sh / S;
    return { pShow, pShare, evShow: pile * pShow, evQuit: V.canQuit ? (pile < 0 ? pile * (1 - pShare) : 0) : -Infinity };
  }
  const SAMPLES = { easy: 0, normal: 0, hard: 200 };
  const pickRand = (r, arr) => arr[Math.floor(r() * arr.length)];
  function ai(V, me, tier, r) {
    const h = V.hands[me];
    if (V.phase === "play") {
      if (tier === "hard") {
        const L = evalPlay(V, me, SAMPLES.hard, r), best = L[0].ev, pick = pickRand(r, L.filter(x => x.ev >= best - 0.03));
        return { t: "play", n: pick.n, s: pick.s };
      }
      const s = h.norm <= 0 ? "R" : h.rev && r() < 1 / (V.R - V.round + 1) ? "R" : "N";
      if (tier === "easy") return { t: "play", n: pickRand(r, h.nums), s };
      const nums = h.nums.slice().sort((a, b) => a - b), pile = sum(V.pile);
      const q = pile > 0 ? Math.min(1, pile / 10) : 0.35;
      const idx = Math.max(0, Math.min(nums.length - 1, Math.round(q * (nums.length - 1) + (r() < 0.5 ? -1 : 1) * (r() < 0.4 ? 1 : 0))));
      return { t: "play", n: nums[idx], s };
    }
    if (V.phase === "reveal") {
      const pile = sum(V.pile), mine = h.sub.n;
      if (tier === "hard") { const e = evalReveal(V, me, SAMPLES.hard, r); return { t: e.evQuit > e.evShow + 0.05 ? "quit" : "show" }; }
      if (tier === "normal" && V.canQuit && pile < 0 && V.shown.some((x, j) => j !== me && x === mine)) return { t: "quit" };
      return { t: "show" };
    }
    if (V.phase === "pass") {
      const o = V.passOpts || [];
      if (!o.length) return { t: "pass", to: -1 };
      if (tier === "easy") return r() < 0.3 ? { t: "pass", to: -1 } : { t: "pass", to: pickRand(r, o) };
      const top = Math.max(...o.map(j => V.score[j]));
      return { t: "pass", to: pickRand(r, o.filter(j => V.score[j] === top)) };
    }
    return null;
  }

  return {
    id: "hilo", ROUNDS, NORMALS, SCORES, colorOf,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai,
    winnerOf, revPost, meanPos, evalPlay, evalReveal, pools,
  };
});

/* 베니 서바이벌 · 베팅! 흑과 백 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 (블랙가넷) 11화 · 11회전 데스매치 「베팅! 흑과백」 오현민 vs 최연승 — 딜러 규칙 낭독 · 규칙 그래픽 확인 (디글 클래식 · 디글 클립) + 나무위키 '흑과 백(더 지니어스)'
   · 1:1. 가운데 가림막이 놓인 채 각자 숫자 타일 10개(0~9, 짝수 0 2 4 6 8 = 흑 · 홀수 1 3 5 7 9 = 백)와 칩 30개를 받아요
   · 시작하면 10개 타일의 대결 순서를 미리 정해 뒷면으로 놓고, 칩 30개를 10개 타일에 나눠 걸어요 (타일마다 최소 1칩 · 30칩 모두 · 승부가 시작되면 바꾸기 · 추가 베팅 불가)
   · 가림막을 치우면 서로의 타일 색(흑/백)과 걸린 칩 수가 보여요 (숫자는 안 보임). 첫 번째 타일부터 차례로 승부
   · 건 칩이 다르면 칩을 적게 건 쪽이 고름 — 추가 베팅(상대와 같아지게 칩을 보태 → 두 타일 공개, 높은 숫자가 걸린 칩을 가져감) 또는 포기(숫자 공개 없이 걸린 칩을 상대가 가져감).
     보태는 칩은 손에 있는 칩(딴 칩)부터, 모자라면 자기 다른 타일에 걸린 칩을 빼서 써요(타일마다 1칩은 남겨야 함). 같은 칩을 걸었으면 바로 오픈. 같은 숫자면 각자 자기 칩을 가져가요(나무위키 기준)
   · 10개 타일이 모두 끝났을 때 칩이 더 많은 쪽 승리 (60칩 중 31칩 이상). 30 : 30 이면 무승부
   재현 약속: 규칙에는 난수가 없어요 (비밀 배치와 베팅 · 선택 모두 행동으로 들어옴). AI 의 배치는 ai() 가 받은 rnd 로만 뽑아요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-betbw"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NT = 10, CH = 30, WIN_AT = 31;
  const NUM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const CNAME = ["흑", "백"];
  const colOf = x => x % 2;                                  // 0 = 흑(짝수) · 1 = 백(홀수)
  const sum = a => a.reduce((x, y) => x + y, 0);
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const isPerm = o => Array.isArray(o) && o.length === NT && o.every(x => Number.isInteger(x) && x >= 0 && x < NT) && new Set(o).size === NT;
  const okBets = b => Array.isArray(b) && b.length === NT && b.every(x => Number.isInteger(x) && x >= 1) && sum(b) === CH;

  // ── 시작 · 단계 ───────────────────────────────────────────
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    const opt = { aid: cfg.aid === 0 || cfg.aid === "0" ? 0 : 1 };
    const st = { n: 2, seed: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt, phase: "setup", pos: 0, order: [null, null], init: [null, null], cur: [null, null], hand: [0, 0], rdy: [false, false], low: -1, res: [], last: null, log: [], seq: 0, over: false };
    push(st, { k: "setup" });
    return st;
  }
  const chipsOf = (st, i) => st.hand[i] + (st.cur[i] ? sum(st.cur[i]) : CH);   // 손 + 판 위 (정산이 안 끝난 타일에 걸린 칩도 내 칩)
  function startPos(st) {
    const p = st.pos, a0 = st.cur[0][p], a1 = st.cur[1][p];
    st.low = a0 === a1 ? -1 : a0 < a1 ? 0 : 1;
    push(st, { k: "pos", p, a: [a0, a1] });
    if (st.low < 0) open(st, "equal", 0, [], [a0, a1]); else st.phase = "decide";
  }
  // 두 타일을 열어 정산 (같은 칩 · 추가 베팅 뒤) — a = 맞추기 전 걸린 칩
  function open(st, act, hu, pull, a) {
    const p = st.pos, m = st.cur[0][p], x0 = st.order[0][p], x1 = st.order[1][p];
    const w = x0 > x1 ? 0 : x1 > x0 ? 1 : -1;
    if (w < 0) { st.hand[0] += m; st.hand[1] += m; } else st.hand[w] += 2 * m;
    st.cur[0][p] = 0; st.cur[1][p] = 0;
    const d = w < 0 ? [0, 0] : w === 0 ? [m, -m] : [-m, m];
    finish(st, { p, a: a.slice(), low: st.low, act, m, hu, pull: pull.map(x => x.slice()), num: [x0, x1], w, d });
  }
  function finish(st, R) {
    R.hand = st.hand.slice(); R.ch = [chipsOf(st, 0), chipsOf(st, 1)];
    st.res.push(R); st.last = R; st.low = -1; st.phase = "show";
    push(st, { k: "res", p: R.p, act: R.act, w: R.w });
  }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "setup") return [0, 1].filter(i => !st.rdy[i]);
    if (st.phase === "decide") return [st.low];
    return [];
  }
  // 맞추려면: 모자란 칩 need = (상대가 건 칩 − 내 칩) · 손에서 hu · 다른 타일에서 ex · 가져올 수 있는 칩 avail
  function matchInfo(st, seat) {
    const p = st.pos, h = st.cur[1 - seat][p], l = st.cur[seat][p], need = Math.max(0, h - l), hu = Math.min(st.hand[seat], need), ex = need - hu;
    let avail = 0; for (let j = p + 1; j < NT; j++) avail += st.cur[seat][j] - 1;
    return { l, h, need, hu, ex, avail, can: ex <= avail };
  }
  function apply(st, seat, a) {
    if (!a || typeof a !== "object") return { ok: false, err: "그렇게는 못 해요" };
    if (!needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "setup") {
      if (a.t !== "setup") return { ok: false, err: "순서와 칩을 정해요" };
      if (!isPerm(a.order)) return { ok: false, err: "타일 0~9를 한 번씩 놓아요" };
      if (!okBets(a.bets)) return { ok: false, err: `칩 ${CH}개를 10곳에 나눠 걸어요 (곳마다 1칩 이상 · 모두 써요)` };
      st.order[seat] = a.order.slice(); st.init[seat] = a.bets.slice(); st.cur[seat] = a.bets.slice(); st.rdy[seat] = true;
      push(st, { k: "ready", s: seat });
      if (st.rdy[0] && st.rdy[1]) { push(st, { k: "curtain" }); st.pos = 0; startPos(st); }
      return { ok: true };
    }
    if (st.phase === "decide") {
      const p = st.pos, M = matchInfo(st, seat), a0 = [st.cur[0][p], st.cur[1][p]];
      if (a.t === "fold") {
        const H = 1 - seat, l = st.cur[seat][p], h = st.cur[H][p];
        st.hand[H] += l + h; st.cur[0][p] = 0; st.cur[1][p] = 0;
        push(st, { k: "decide", s: seat, act: "fold" });
        finish(st, { p, a: a0, low: seat, act: "fold", m: l, hu: 0, pull: [], num: null, w: H, d: H === 0 ? [l, -l] : [-l, l] });
        return { ok: true };
      }
      if (a.t !== "match") return { ok: false, err: "추가 베팅 · 포기 중에서 골라요" };
      if (!M.can) return { ok: false, err: "칩이 모자라서 맞출 수 없어요 — 포기만 할 수 있어요" };
      const take = Array.isArray(a.take) ? a.take : a.take == null ? [] : null;
      if (take === null) return { ok: false, err: "가져올 칩을 알려 줘요" };
      const tk = new Array(NT).fill(0);
      for (const t of take) {
        if (!Array.isArray(t) || t.length !== 2 || !Number.isInteger(t[0]) || !Number.isInteger(t[1]) || t[0] <= p || t[0] >= NT || t[1] < 1) return { ok: false, err: "지나간 타일에서는 칩을 못 가져와요" };
        tk[t[0]] += t[1];
      }
      if (sum(tk) !== M.ex) return { ok: false, err: M.ex ? `다른 타일에서 칩 ${M.ex}개를 가져와요` : "손에 있는 칩으로 충분해요" };
      for (let j = p + 1; j < NT; j++) if (st.cur[seat][j] - tk[j] < 1) return { ok: false, err: `${j + 1}번째 타일은 칩이 1개는 남아야 해요` };
      st.hand[seat] -= M.hu; st.cur[seat][p] = M.h;
      const pull = []; for (let j = p + 1; j < NT; j++) if (tk[j]) { st.cur[seat][j] -= tk[j]; pull.push([j, tk[j]]); }
      push(st, { k: "decide", s: seat, act: "match", need: M.need });
      open(st, "match", M.hu, pull, a0);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = st => (st.phase === "show" ? (st.last && st.last.act === "fold" ? 2800 : 3800) : null);
  function advance(st) {
    if (st.phase !== "show" || st.over) return;
    if (st.pos >= NT - 1) { st.over = true; st.phase = "end"; push(st, { k: "end" }); return; }
    st.pos++; startPos(st);
  }
  const over = st => !!st.over;
  const ranks = st => { const c = [0, 1].map(i => chipsOf(st, i)); return c.map(x => c.filter(y => y > x).length); };
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "setup") return [{ t: "setup", order: NUM.slice(), bets: new Array(NT).fill(3) }];
    const M = matchInfo(st, seat), L = [{ t: "fold" }];
    if (M.can) L.push({ t: "match", take: tailTake(st.cur[seat], st.pos, M.ex) });
    return L;
  }
  function tailTake(cur, p, ex) {                              // 뒤쪽 타일부터 한 개씩 (합법인 가장 단순한 가져오기)
    const out = []; let left = ex;
    for (let j = NT - 1; j > p && left > 0; j--) { const t = Math.min(left, cur[j] - 1); if (t > 0) { out.push([j, t]); left -= t; } }
    return out;
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // p[i].col / init / cur : 가림막이 치워진 뒤(둘 다 정한 뒤)엔 모두 보임 · 그 전엔 자기 것만 (구경꾼 · 'all' 은 다)
  // p[i].num : 내 숫자는 다 (정한 뒤) · 상대 숫자는 공개된 칸만 · 'all' 은 다.  res[].num 은 열린 타일 (포기한 타일은 null)
  function view(st, seat) {
    const all = seat === "all", s = seat === 0 || seat === 1 ? seat : -1;      // -1(구경꾼)은 공개된 것만
    const both = st.rdy[0] && st.rdy[1];
    const rv = [new Array(NT).fill(null), new Array(NT).fill(null)];
    for (const R of st.res) if (R.num) { rv[0][R.p] = R.num[0]; rv[1][R.p] = R.num[1]; }
    const P = [0, 1].map(i => {
      const ownSee = (all || i === s) && st.rdy[i], see = (all || both || ownSee) && st.rdy[i];
      return {
        done: st.rdy[i], hand: st.hand[i], chips: chipsOf(st, i),
        num: ownSee ? st.order[i].slice() : both ? rv[i].slice() : new Array(NT).fill(null),
        col: see && st.order[i] ? st.order[i].map(colOf) : null,
        init: see && st.init[i] ? st.init[i].slice() : null,
        cur: see && st.cur[i] ? st.cur[i].slice() : null,
      };
    });
    let dec = null;
    if (st.phase === "decide") { const M = matchInfo(st, st.low); dec = { low: st.low, hi: 1 - st.low, l: M.l, h: M.h, need: M.need, hu: M.hu, ex: M.ex, avail: M.avail, can: M.can }; }
    const pubObj = { p: st.phase, pos: st.pos, rdy: st.rdy, hand: st.hand, cur: both ? st.cur : 0, col: both ? st.order.map(o => o.map(colOf)) : 0, res: st.res.map(R => [R.p, R.act, R.m, R.w, R.num]), ov: st.over };
    const chips = [chipsOf(st, 0), chipsOf(st, 1)];
    return {
      n: 2, cfg: Object.assign({}, st.opt), phase: st.phase, pos: st.pos, p: P, dec, both, done: st.rdy.slice(),
      res: st.res.map(R => Object.assign({}, R, { a: R.a.slice(), pull: R.pull.map(x => x.slice()), num: R.num ? R.num.slice() : null, d: R.d.slice(), hand: R.hand.slice(), ch: R.ch.slice() })),
      last: st.last ? Object.assign({}, st.last, { a: st.last.a.slice(), pull: st.last.pull.map(x => x.slice()), num: st.last.num ? st.last.num.slice() : null, d: st.last.d.slice(), hand: st.last.hand.slice(), ch: st.last.ch.slice() }) : null,
      chips, score: chips.slice(), needs: needs(st), over: st.over, ranks: st.over ? ranks(st) : null,
      log: st.log.slice(-30).map(e => Object.assign({}, e)), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 상대 숫자 추정 (내가 아는 것만) ───────────────────────
  // 공개된 숫자를 뺀 색별 남은 숫자를 그 색의 남은 자리에 놓는 모든 경우를 세요 (≤ 5! 가지).
  // 상대가 센 숫자에 칩을 몰았을 거라는 가정(kap) · 포기한 자리는 약한 숫자였을 거라는 가정(lam) 으로 가중치를 줘요.
  function oppDist(V, me, kap, lam) {
    const o = 1 - me, Q = V.p[o], rev = new Array(NT).fill(null), foldSet = new Set(), used = new Set();
    for (const R of V.res) { if (R.num) { rev[R.p] = R.num[o]; used.add(R.num[o]); } else if (R.low === o) foldSet.add(R.p); }
    const dist = new Array(NT).fill(null);
    for (let c = 0; c < 2; c++) {
      const pos = [], nums = [];
      for (let j = 0; j < NT; j++) if (Q.col[j] === c && rev[j] === null) pos.push(j);
      for (let x = c; x < NT; x += 2) if (!used.has(x)) nums.push(x);
      const k = pos.length; if (!k || nums.length !== k) continue;
      const marg = pos.map(() => new Array(NT).fill(0)), usedN = new Array(k).fill(false), asg = new Array(k);
      let Z = 0;
      const rec = (d, lw) => {
        if (d === k) { const w = Math.exp(lw); Z += w; for (let i = 0; i < k; i++) marg[i][asg[i]] += w; return; }
        for (let u = 0; u < k; u++) {
          if (usedN[u]) continue; usedN[u] = true; asg[d] = nums[u];
          rec(d + 1, lw + kap * Q.init[pos[d]] * nums[u] - (foldSet.has(pos[d]) ? lam * nums[u] : 0));
          usedN[u] = false;
        }
      };
      rec(0, 0);
      for (let i = 0; i < k; i++) dist[pos[i]] = marg[i].map(z => z / Z);
    }
    for (let j = 0; j < NT; j++) if (rev[j] !== null) { const a = new Array(NT).fill(0); a[rev[j]] = 1; dist[j] = a; }
    return dist;
  }
  function winProb(x, d) {
    let pw = 0, pt = 0, pl = 0;
    if (!d) return { pw: 0.5, pt: 0, pl: 0.5 };
    for (let y = 0; y < NT; y++) { if (y < x) pw += d[y]; else if (y === x) pt += d[y]; else pl += d[y]; }
    return { pw, pt, pl };
  }

  // ── 맞출까 · 포기할까 (보이는 것만, AI · 선생님 · 복기가 같은 식을 씀) ──
  // 맞추면 기대 칩 = (건 칩 h) × (이길 확률 − 질 확률) − (다른 타일에서 가져오는 칩이 원래 벌어 줄 기대값) · 포기하면 −(내가 건 칩 l)
  const PROF = {
    easy:   { kap: 0, lam: 0, thr: 0 },
    normal: { kap: 0.015, lam: 0.1, thr: 0.4, flip: 0.06 },
    hard:   { kap: 0.035, lam: 0.25, thr: 0 },
  };
  // 가져올 칩: 이길 만한 정도(이길 확률 − 질 확률)가 가장 낮은 타일에서 한 개씩 (같으면 뒤쪽 타일부터) — 타일마다 1칩은 남겨요
  function pickTake(V, me, ex, dist) {
    const cur = V.p[me].cur, oc = V.p[1 - me].cur, pos = V.pos, tk = new Array(NT).fill(0);
    const val = j => { const w = winProb(V.p[me].num[j], dist[j]), e = w.pw - w.pl; return e * (cur[j] >= oc[j] ? 1 : 0.5); };
    let cost = 0;
    for (let q = 0; q < ex; q++) {
      let bj = -1, bv = Infinity;
      for (let j = NT - 1; j > pos; j--) {
        if (cur[j] - tk[j] < 2) continue;
        const v = val(j); if (v < bv) { bv = v; bj = j; }
      }
      if (bj < 0) break;
      tk[bj]++; cost += val(bj);
    }
    const take = []; for (let j = pos + 1; j < NT; j++) if (tk[j]) take.push([j, tk[j]]);
    return { take, cost };
  }
  function decideEval(V, me, prof, rnd) {
    const D = V && V.dec; if (!D || D.low !== me || V.phase !== "decide") return null;
    prof = prof || PROF.hard;
    const dist = oppDist(V, me, prof.kap, prof.lam), x = V.p[me].num[V.pos], w = winProb(x, dist[V.pos]);
    const pt = D.can ? pickTake(V, me, D.ex, dist) : { take: [], cost: 0 };
    const evMatch = D.h * (w.pw - w.pl) - pt.cost, evFold = -D.l;
    return { pos: V.pos, x, l: D.l, h: D.h, need: D.need, hu: D.hu, ex: D.ex, can: D.can, pw: w.pw, pt: w.pt, pl: w.pl, take: pt.take, cost: pt.cost, evMatch, evFold, gain: evMatch - evFold, dist };
  }
  // 고른 수(맞추기 · 포기)의 기대 칩 — 복기용
  function evalAct(V, me, a) {
    if (!a || typeof a !== "object") return null;
    const E = decideEval(V, me, PROF.hard); if (!E) return null;
    if (a.t === "fold") return Object.assign({ kind: "fold", ev: E.evFold }, E);
    if (a.t === "match") {
      if (!E.can) return null;
      let cost = E.cost;
      if (Array.isArray(a.take)) { const dd = E.dist; cost = 0; for (const t of a.take) { const w = winProb(V.p[me].num[t[0]], dd[t[0]]); cost += (w.pw - w.pl) * (V.p[me].cur[t[0]] >= V.p[1 - me].cur[t[0]] ? 1 : 0.5) * t[1]; } }
      return Object.assign({}, E, { kind: "match", ev: E.h * (E.pw - E.pl) - cost, cost });
    }
    return null;
  }

  // ── 배치 만들기 (AI) ──────────────────────────────────────
  function allocate(w, total) {                              // 각 곳 1칩 + 나머지를 가중치대로 (가장 큰 나머지 순)
    const n = w.length, out = new Array(n).fill(1); let left = total - n;
    const sw = sum(w) || 1, raw = w.map(x => x / sw * left), fl = raw.map(Math.floor);
    for (let i = 0; i < n; i++) out[i] += fl[i];
    left -= sum(fl);
    const rem = raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; k < left; k++) out[rem[k][1]]++;
    return out;
  }
  function makeSetup(tier, r) {
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    let order = shuffle(NUM.slice()), bets;
    if (tier === "easy") bets = allocate(order.map(() => 0.4 + r()), CH);                         // 숫자와 상관없이 거의 고르게
    else if (tier === "normal") bets = allocate(order.map(x => Math.pow(x + 1, 1.4) * (0.6 + 0.8 * r())), CH);
    else {
      const u = r(), byNum = new Array(NT).fill(1);
      const fillRest = (nums, left) => { let g = 0; while (left > 0 && g++ < 200) { const x = nums[Math.floor(r() * nums.length)]; byNum[x]++; left--; } };
      if (u < 0.4) {                                          // 집중형: 9 · 8 · 7 에 몰고 약한 타일은 1칩
        byNum[9] = ri(11, 13); byNum[8] = ri(6, 8); byNum[7] = ri(3, 5);
        fillRest([4, 5, 6, 3], CH - sum(byNum));
      } else if (u < 0.6) {                                   // 방송형: 앞 4곳에 9 · 8 · 7 · 6 (12 · 4 · 4 · 4) 나머지 6곳은 1칩
        byNum[9] = ri(11, 13); byNum[8] = ri(3, 5); byNum[7] = ri(3, 5); byNum[6] = ri(3, 5);
        fillRest([9, 8, 7, 6, 5], CH - sum(byNum));
        const head = shuffle([9, 8, 7, 6]), tail = shuffle([0, 1, 2, 3, 4, 5]); order = head.concat(tail);
      } else if (u < 0.75) {                                  // 속임수형: 약한 타일에 큰 칩을 걸어 상대의 눈을 속임
        const bait = ri(0, 2); byNum[bait] = ri(7, 9); byNum[9] = ri(5, 7); byNum[8] = ri(3, 4);
        fillRest([7, 6, 9, 8], CH - sum(byNum));
      } else {                                                // 고른형: 센 숫자일수록 조금 더
        const al = allocate(NUM.map(x => Math.pow(x + 1, 1.15) * (0.8 + 0.4 * r())), CH); for (let x = 0; x < NT; x++) byNum[x] = al[x];
      }
      let tot = sum(byNum); while (tot > CH) { const m = byNum.indexOf(Math.max(...byNum)); byNum[m]--; tot--; }
      while (tot < CH) { byNum[9]++; tot++; }
      bets = order.map(x => byNum[x]);
    }
    return { t: "setup", order, bets };
  }

  // ── AI ────────────────────────────────────────────────────
  function ai(V, me, tier, r) {
    if (!V || !V.needs || !V.needs.includes(me)) return null;
    r = typeof r === "function" ? r : () => 0.5;
    if (V.phase === "setup") return makeSetup(tier === "hard" || tier === "normal" ? tier : "easy", r);
    if (V.phase !== "decide") return null;
    const P = PROF[tier] || PROF.normal, D = V.dec;
    if (!D.can) return { t: "fold" };
    if (tier === "easy") {                                    // 초급: 자기 숫자만 보고 (센 숫자면 대체로 맞춤) 칩 크기 · 상대 칩은 안 따짐, 가져올 타일도 아무거나
      const x = V.p[me].num[V.pos], pm = x >= 7 ? 0.85 : x >= 5 ? 0.6 : x >= 3 ? 0.3 : 0.12;
      if (r() >= pm) return { t: "fold" };
      const cur = V.p[me].cur, tk = new Array(NT).fill(0);
      for (let q = 0; q < D.ex; q++) { const c = []; for (let j = V.pos + 1; j < NT; j++) if (cur[j] - tk[j] >= 2) c.push(j); if (!c.length) return { t: "fold" }; tk[c[Math.floor(r() * c.length)]]++; }
      const take = []; for (let j = 0; j < NT; j++) if (tk[j]) take.push([j, tk[j]]);
      return { t: "match", take };
    }
    const E = decideEval(V, me, P);
    let match = E.can && E.gain > P.thr;
    if (V.p[me].hand >= WIN_AT) match = false;               // 이미 31칩 이상 손에 있으면 이긴 거예요 — 더 걸 이유가 없음
    if (P.flip && r() < P.flip) match = !match && E.can;
    return match ? { t: "match", take: E.take } : { t: "fold" };
  }

  // ── 배치 평가 · 복기용 (보이는 것만 · 숫자 근거) ──────────
  // 한 판 전체를 모의하지 않고, 무엇에 칩을 몰았는지만 봐요 (상대는 모르는 임의 숫자)
  function setupInfo(order, bets) {
    const at = x => order.indexOf(x);
    const top3 = bets[at(9)] + bets[at(8)] + bets[at(7)], weak6 = [0, 1, 2, 3, 4, 5].reduce((a, x) => a + bets[at(x)], 0);
    const mx = Math.max(...bets), mp = bets.indexOf(mx), mxNum = order[mp];
    return { top3, weak6, max: mx, maxPos: mp, maxNum: mxNum, ones: bets.filter(b => b === 1).length, edge: bets.reduce((a, b, i) => a + b * (2 * order[i] - 9) / 9, 0) };
  }

  // ── AI 선생님 (보이는 것만 읽음) ──────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  const hasFinal = w => { const s = String(w || ""), ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0; return "013678".includes(ch) && ch !== ""; };
  const eun = w => (hasFinal(w) ? "은" : "는"), iga = w => (hasFinal(w) ? "이" : "가"), eul = w => (hasFinal(w) ? "을" : "를");
  const sg = x => (x >= 0 ? "+" : "−") + Math.abs(Math.round(x * 10) / 10);
  const left = (V, o) => { const used = new Set(); for (const R of V.res) if (R.num) used.add(R.num[o]); return NUM.filter(x => !used.has(x)); };
  function coach(V, me, since, names) {
    me = me === 1 ? 1 : me === 0 ? 0 : (V.seat === 1 ? 1 : 0);
    const nm = i => (names && names[i]) || `${i + 1}번`, o = 1 - me, who = nm(o), C = V.chips;
    const tally = `칩 나 ${C[me]} : ${who} ${C[o]} (31칩 이상이면 이겨요)`;
    if (V.phase === "setup") {
      const dn = V.done[me];
      return {
        opp: `${who}도 지금 가림막 뒤에서 타일 순서와 칩을 정하는 중이에요. 서로 상대 숫자는 모르고, 가림막이 치워지면 상대 타일의 색(흑/백)과 걸린 칩 수만 보여요.`,
        mine: `타일 10개 (흑 0·2·4·6·8 / 백 1·3·5·7·9) · 칩 30개 — 곳마다 1칩 이상, 모두 걸어야 해요. 총 60칩 중 31칩 이상이면 이겨요.${dn ? " 배치를 확정했어요." : ""}`,
        rec: "센 타일(9·8·7)에 칩을 몰고 약한 타일은 1칩씩",
        why: "숫자 9는 상대 타일이 9가 아니면(90%) 이기고, 7은 70%, 2는 20%예요. 약한 타일 6곳에 1칩씩 걸면 다 져도 6칩만 잃고 나머지 24칩을 센 타일에 걸 수 있어요 — 단, 칩 수가 상대에게 보여서 센 타일이 들켜요.",
      };
    }
    const L = V.last, hist = V.res, myW = hist.filter(R => R.w === me).length, myF = hist.filter(R => R.act === "fold" && R.low === me).length, opF = hist.filter(R => R.act === "fold" && R.low === o).length;
    const oppBig = (() => { let bj = -1, bv = 0; const c = V.p[o].init; if (c) for (let j = 0; j < NT; j++) if (c[j] > bv) { bv = c[j]; bj = j; } return bj < 0 ? "" : `${bj + 1}번째 타일(${CNAME[V.p[o].col[bj]]}색)에 ${bv}칩`; })();
    const stat = hist.length ? ` 지금까지 ${who}${eun(who)} ${hist.filter(R => R.act === "match" && R.low === o).length}번 맞췄고 ${opF}번 포기했어요.` : "";
    if (V.over) {
      return { opp: `승부가 끝났어요.${stat}`, mine: `${tally} → ${C[me] > C[o] ? "내가 이겼어요" : C[me] < C[o] ? "아쉽지만 졌어요" : "비겼어요"}`, rec: "한 판 더 해 봐요!", why: `내가 이긴 타일 ${myW}개 · 내가 포기한 타일 ${myF}개. 칩이 많이 걸린 타일을 이겼는지, 약한 타일을 얼마에 포기했는지가 승부를 갈라요.` };
    }
    if (V.phase === "show" && L) {
      const t = L.p + 1, d = L.d[me];
      const op = L.act === "fold" ? `${nm(L.low)}${iga(nm(L.low))} ${t}번째 타일을 포기했어요 — 숫자는 공개되지 않고 걸린 칩 ${L.m}개는 ${nm(L.w)}${iga(nm(L.w))} 가져가요.` : `${t}번째 타일: 나 ${L.num[me]} vs ${who} ${L.num[o]} → ${L.w < 0 ? "같은 숫자라 각자 칩을 돌려받아요" : `${L.w === me ? "내가" : who + iga(who)} 이겨 ${L.m}칩을 가져가요`}.`;
      return { opp: op, mine: `${tally} · 내 손 ${V.p[me].hand}칩`, rec: "결과를 보고 다음 타일을 준비해요", why: `이번 타일 칩 변화: ${sg(d)}칩 (나 ${L.ch[me]} · ${who} ${L.ch[o]}).${L.act === "match" && L.pull.length ? ` 맞추려고 ${L.pull.map(x => `${x[0] + 1}번째`).join(" · ")} 타일에서 칩을 가져왔어요.` : ""}` };
    }
    // decide
    const D = V.dec, t = V.pos + 1, mineNum = V.p[me].num[V.pos];
    const oppTxt = `${t}번째 타일 — ${who}${eun(who)} ${D.hi === o ? D.h : D.l}칩을 걸었고 타일은 ${CNAME[V.p[o].col[V.pos]]}색이에요. ${oppBig ? `${who}의 가장 큰 베팅: ${oppBig}.` : ""}${stat}`;
    const mineBase = `${tally} · 내 손 ${V.p[me].hand}칩 · ${t}번째 내 타일 ${mineNum}`;
    if (D.low !== me) {
      const dist = oppDist(V, me, PROF.hard.kap, PROF.hard.lam), w = winProb(mineNum, dist[V.pos]);
      return { opp: oppTxt, mine: `${mineBase} (${D.l}칩 · 상대보다 많이 걸었어요)`, rec: `${who}${iga(who)} 맞출지 포기할지 고르는 중이에요`, why: `내 ${mineNum}${iga(mineNum)} 이길 확률 ${pc(w.pw)} · 질 확률 ${pc(w.pl)} (공개된 숫자를 뺀 ${CNAME[V.p[o].col[V.pos]]}색 후보 ${left(V, o).filter(x => colOf(x) === V.p[o].col[V.pos]).join("·")} 기준). ${who}${iga(who)} 포기하면 내가 ${D.l}칩을 가져가요.` };
    }
    const E = decideEval(V, me, PROF.hard), cand = left(V, o).filter(x => colOf(x) === V.p[o].col[V.pos]);
    const need = E.can ? `맞추려면 ${E.need}칩을 더 걸어야 해요 (손 ${E.hu}칩${E.ex ? ` + 다른 타일에서 ${E.ex}칩` : ""})` : `맞추려면 ${E.need}칩이 필요한데 칩이 모자라 포기만 할 수 있어요`;
    const mine = `${mineBase} (${D.l}칩) · ${need}`;
    if (!E.can) return { opp: oppTxt, mine, rec: "포기", why: `포기하면 ${D.l}칩을 잃어요. 칩이 모자라 맞출 수 없어요.` };
    const match = E.gain > 0 && V.p[me].hand < WIN_AT;
    return { opp: oppTxt, mine, rec: match ? `추가 베팅 (+${E.need}칩)` : "포기", why: `내 ${mineNum}${iga(mineNum)} 이길 확률 ${pc(E.pw)} · 비길 ${pc(E.pt)} · 질 ${pc(E.pl)} (상대 ${CNAME[V.p[o].col[V.pos]]}색 후보 ${cand.join("·")}). 맞추면 기대 ${sg(E.evMatch)}칩 (이기면 +${E.h} · 지면 −${E.h}${E.cost ? ` · 다른 타일에서 가져온 칩 효과 ${sg(-E.cost)}` : ""}), 포기하면 −${E.l}칩.` };
  }

  return { id: "gn-betbw", NT, CH, WIN_AT, NUM, CNAME, colOf, PROF, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, oppDist, winProb, decideEval, evalAct, makeSetup, setupInfo, allocate, matchInfo, isPerm, okBets, tailTake, pickTake, chipsOf };
});

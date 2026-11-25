/* 베니 서바이벌 · 별자리 게임 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 3 블랙가넷 7화 (규칙 설명 화면 · 나무위키 회차 문서 기준)
   · 숫자 카드 1~5 (매 라운드 5장으로 다시 시작). 테이블에는 별 N개(방송 7) + 폭탄 1개
   · 주머니(방송): 빨강 · 노랑 · 파랑 · 초록 별 각 25개 + 흰 별 5개 = 105개 → 무작위로 뽑아 공개 (남은 별은 그대로 두고 빠진 만큼 채움)
   · 전원이 카드 1장을 비밀로 내고 동시에 공개 → 같은 숫자를 낸 사람은 이번 라운드 선택에서 전부 제외
   · 남은 사람이 낮은 숫자부터 차례로 '그 숫자만큼' 테이블에서 별/폭탄을 골라 가져감 (모자라면 남은 것 전부)
   · 별자리: 양자리(빨강 3개 → 2점) 화살자리(노랑 4개 → 3점) 카시오페아(파랑 5개 → 5점) 거문고자리(초록 6개 → 7점), 같은 별자리는 한 번만
   · 흰 별 = 원하는 별자리 어디든 자유롭게 쓰는 특수별 (별자리 판의 아무 자리에 놓을 수 있고 놓은 자리를 언제든 바꿀 수 있어요)
   · 같은 색 별 3개 = 원하는 색 별 1개 (언제든, 플레이어끼리 주고받기는 불가)
   · 즉시 종료: 폭탄 3개 → 그 사람 탈락, 승점 최고자 우승 / 별자리 3개 완성 → 승점 최고자 우승, 최저자 탈락 / 별이 바닥나면 승점 비교
   · 우승은 별자리 개수가 아니라 승점 합계
   우리 판 다듬기: 별자리는 별이 모이면 자동 완성 (흰 별은 점수가 가장 높아지는 별자리에 자동으로 써요 — 별자리 판에 직접 놓지 않아요)
   · 별자리 묶음은 점수가 가장 높은 쪽으로 정해요 (별자리 3개 10점보다 2개 12점이 높으면 3개로 끝나지 않아요)
   · 흰 별은 같은 색 3개 교환에는 못 써요 (방송 규칙 화면 · 문서에 흰 별 교환 얘기가 없어서 우리가 정한 처리)
   · 화면은 4 ~ 7명 (core 는 시험용으로 3명도 받아요), 별 수는 인원만큼(방송 7명=7개) · 라운드 30 넘으면 승점 비교 (탈락 없이 끝)
   · cfg.white = 주머니에 더하는 흰 별 수 (방송 5 · 새 판은 5 가 기본). cfg 에 white 가 없으면 흰 별이 없는 옛 규칙 그대로라 옛 복기가 같은 판으로 재생돼요 (흰 별 없는 판은 st 에 흰 별 칸을 만들지도 않아요)
   · take(가져가기) 배열 = [빨강, 노랑, 파랑, 초록, 폭탄] (+ 흰 별 판은 6번째에 흰 별, 5칸으로 보내도 흰 별 0 으로 받아요) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-stars"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NEED = [3, 4, 5, 6], CP = [2, 3, 5, 7], CN = ["양자리", "화살자리", "카시오페아", "거문고자리"], COL = ["빨강", "노랑", "파랑", "초록"], CEM = ["🔴", "🟡", "🔵", "🟢"];
  const PERCOL = 25, WHITE = 5, MAX_ROUNDS = 30, PEN = [0, 0.6, 2, 14];
  const sum = a => a.reduce((s, x) => s + x, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 60) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // ── 별자리 · 흰 별 계산 (w = 그 사람이 가진 흰 별 수, 없으면 0 = 옛 규칙 그대로) ──
  // 흰 별은 별자리 판의 아무 자리에나 놓을 수 있어서, 점수가 가장 높아지는 별자리 묶음에 자동으로 써요 (같으면 별자리가 많은 쪽 → 흰 별을 덜 쓰는 쪽)
  function plan(h, w) {
    let best = null;
    for (let m = 0; m < 16; m++) {
      let cost = 0, p = 0, k = 0;
      for (let c = 0; c < 4; c++) if (m & (1 << c)) { cost += h[c] >= NEED[c] ? 0 : NEED[c] - h[c]; p += CP[c]; k++; }
      if (cost > w) continue;
      if (!best || p > best.p || (p === best.p && (k > best.k || (k === best.k && cost < best.cost)))) best = { m, p, k, cost };
    }
    return best;
  }
  const ptsOf = (h, w) => {
    if (w > 0) return plan(h, w).p;
    let p = 0; for (let c = 0; c < 4; c++) if (h[c] >= NEED[c]) p += CP[c]; return p;
  };
  const consOf = (h, w) => {
    if (w > 0) return plan(h, w).k;
    let k = 0; for (let c = 0; c < 4; c++) if (h[c] >= NEED[c]) k++; return k;
  };
  // 별자리마다 쓰는 흰 별 수 [u0..u3] (완성에 모자란 만큼) — 화면 · 선생님 설명용
  function useOf(h, w) {
    const u = [0, 0, 0, 0]; if (!(w > 0)) return u;
    const pl = plan(h, w);
    for (let c = 0; c < 4; c++) if ((pl.m & (1 << c)) && h[c] < NEED[c]) u[c] = NEED[c] - h[c];
    return u;
  }
  const wh = (st, i) => (st.hw ? st.hw[i] : 0);           // 그 자리가 가진 흰 별
  const itemsOf = st => (st.white ? [...st.table, st.tbomb, st.tw] : [...st.table, st.tbomb]);   // 테이블 위: 색 4 · 폭탄 · (흰 별)

  function draw(st) {
    const bw = st.bw | 0, tot = sum(st.bag) + bw; if (tot <= 0) return -1;
    let r = Math.floor(rnd(st) * tot);
    for (let c = 0; c < 4; c++) { if (r < st.bag[c]) { st.bag[c]--; return c; } r -= st.bag[c]; }
    if (bw > 0) { st.bw--; return 4; }   // 4 = 흰 별
    return -1;
  }
  function refill(st) {
    while (sum(st.table) + (st.tw | 0) < st.n) { const c = draw(st); if (c < 0) break; if (c === 4) st.tw++; else st.table[c]++; }
    if (st.tbomb < 1) st.tbomb = 1;
  }
  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(7, n | 0 || 7));
    const st = { n, rs: (seed >>> 0) || 1, bag: Array(4).fill(PERCOL), table: [0, 0, 0, 0], tbomb: 0, hold: Array.from({ length: n }, () => [0, 0, 0, 0]), bombs: Array(n).fill(0), round: 0, phase: "card", cards: Array(n).fill(null), rev: null, hist: [], queue: [], qi: 0, picker: -1, pickK: 0, over: false, why: "", loser: -1, log: [], seq: 0, cfg: cfg || {} };
    const W = cfg ? (cfg.white === true ? WHITE : Math.max(0, Math.min(9, +cfg.white | 0))) : 0;
    if (W > 0) { st.white = W; st.bw = W; st.tw = 0; st.hw = Array(n).fill(0); }   // 흰 별 판일 때만 칸을 만들어요 (옛 판의 st 는 그대로)
    if (cfg && cfg.table) { st.table = cfg.table.slice(0, 4); st.tbomb = cfg.bomb | 0; for (let c = 0; c < 4; c++) st.bag[c] -= st.table[c]; if (W > 0) { st.tw = Math.max(0, Math.min(W, cfg.tw | 0)); st.bw -= st.tw; } }   // 시험용: 테이블을 직접 정함
    else refill(st);
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.cards = Array(st.n).fill(null); st.phase = "card"; st.rev = null; st.queue = []; st.qi = 0; st.picker = -1; st.pickK = 0;
    push(st, { k: "round", r: st.round });
  }
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "card") return [...Array(st.n).keys()].filter(i => st.cards[i] === null);
    if (st.phase === "pick") return [st.picker];
    return [];
  }
  // 별 3개 → 별 1개 교환 (사본에 적용)
  // 이미 완성한 별자리의 별은 교환에 쓸 수 없어요 (남는 별만 교환) · 흰 별을 써서 완성한 별자리도 색 별 자리는 잠겨요
  const freeOf = (h, c, w) => {
    if (w > 0) { const pl = plan(h, w); return (pl.m & (1 << c)) ? Math.max(0, h[c] - NEED[c]) : h[c]; }
    return h[c] - (h[c] >= NEED[c] ? NEED[c] : 0);
  };
  function doSwaps(h, bag, swaps, w) {
    if (swaps != null && !Array.isArray(swaps)) return "교환할 색을 다시 골라요";
    for (const s of swaps || []) {
      if (!s || !Number.isInteger(s.from) || !Number.isInteger(s.to) || s.from < 0 || s.from > 3 || s.to < 0 || s.to > 3 || s.from === s.to) return "교환할 색을 다시 골라요";
      if (freeOf(h, s.from, w) < 3) return `${COL[s.from]} 별이 3개 더 있어야 바꿀 수 있어요 (완성한 별자리 별은 못 바꿔요)`;
      if (bag[s.to] < 1) return `${COL[s.to]} 별이 남아 있지 않아요`;
      h[s.from] -= 3; bag[s.from] += 3; h[s.to]++; bag[s.to]--;
    }
    return null;
  }
  function endGame(st, why, loser) {
    if (loser < 0) {   // 폭탄이 아닌 종료: 승점 최저자가 한 명이면 탈락 후보
      const p = st.hold.map((h, i) => ptsOf(h, wh(st, i))), mn = Math.min(...p), who = p.map((x, i) => (x === mn ? i : -1)).filter(i => i >= 0);
      loser = who.length === 1 ? who[0] : -1;
    }
    st.over = true; st.why = why; st.loser = loser; st.phase = "end";
    if (st.rev && !st.rev.done) { st.rev.done = true; st.hist.push(st.rev); }
    push(st, { k: "end", why, loser });
  }
  function checkEnd(st) {
    if (st.over) return true;
    for (let i = 0; i < st.n; i++) if (st.bombs[i] >= 3) { endGame(st, "bomb", i); return true; }
    for (let i = 0; i < st.n; i++) if (consOf(st.hold[i], wh(st, i)) >= 3) { endGame(st, "cons", -1); return true; }
    return false;
  }
  function doTake(st, s, take) {
    for (let c = 0; c < 4; c++) { st.table[c] -= take[c]; st.hold[s][c] += take[c]; }
    st.tbomb -= take[4]; st.bombs[s] += take[4];
    if (st.white) { st.tw -= take[5] | 0; st.hw[s] += take[5] | 0; }
    st.rev.takes.push({ s, k: st.cards[s], take: take.slice() });
    push(st, { k: "take", s, take: take.slice() });
  }
  function resolveCards(st) {
    const cnt = Array(6).fill(0); for (const c of st.cards) cnt[c]++;
    const elim = st.cards.map(c => cnt[c] > 1);
    const order = [...Array(st.n).keys()].filter(i => !elim[i]).sort((a, b) => st.cards[a] - st.cards[b]);
    st.rev = { r: st.round, cards: st.cards.slice(), elim, order, takes: [], done: false };
    st.queue = order; st.qi = 0;
    push(st, { k: "rev", r: st.round, cards: st.cards.slice() });
    advancePicks(st);
  }
  function advancePicks(st) {
    while (st.qi < st.queue.length) {
      const s = st.queue[st.qi], it = itemsOf(st), tot = sum(it), k = Math.min(st.cards[s], tot);
      if (k === 0) { st.rev.takes.push({ s, k: st.cards[s], take: it.map(() => 0) }); st.qi++; continue; }
      const types = it.filter(x => x > 0).length;
      if (k >= tot || types <= 1) {
        let take;
        if (k >= tot) take = it;
        else { take = it.map(() => 0); const t = it.findIndex(x => x > 0); take[t] = k; }
        doTake(st, s, take); st.qi++;
        if (checkEnd(st)) return;
        continue;
      }
      st.phase = "pick"; st.picker = s; st.pickK = k; return;
    }
    st.rev.done = true; st.hist.push(st.rev);
    if (st.round >= MAX_ROUNDS || (sum(st.table) === 0 && (st.tw | 0) === 0 && sum(st.bag) === 0 && (st.bw | 0) === 0)) { endGame(st, "out", -1); return; }
    st.phase = "rev"; st.picker = -1; st.pickK = 0;
  }
  function apply(st, seat, a) {
    if (!a || st.over || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    const h = st.hold[seat].slice(), bag = st.bag.slice(), w = wh(st, seat);
    if (a.t === "swap") {
      const err = doSwaps(h, bag, [a], w); if (err) return { ok: false, err };
      st.hold[seat] = h; st.bag = bag; push(st, { k: "swap", s: seat, from: a.from, to: a.to });
      checkEnd(st); return { ok: true };
    }
    if (st.phase === "card") {
      if (a.t !== "card" || !Number.isInteger(a.c) || a.c < 1 || a.c > 5) return { ok: false, err: "1 ~ 5 카드를 골라요" };
      const err = doSwaps(h, bag, a.swaps, w); if (err) return { ok: false, err };
      if (a.swaps && a.swaps.length) { st.hold[seat] = h; st.bag = bag; for (const s of a.swaps) push(st, { k: "swap", s: seat, from: s.from, to: s.to }); if (checkEnd(st)) return { ok: true }; }
      st.cards[seat] = a.c; push(st, { k: "card", s: seat });
      if (needs(st).length === 0) resolveCards(st);
      return { ok: true };
    }
    if (st.phase === "pick") {
      const t0 = a.take, L = st.white ? 6 : 5;
      if (a.t !== "take" || !Array.isArray(t0) || !(t0.length === L || (L === 6 && t0.length === 5)) || !t0.every(x => Number.isInteger(x) && x >= 0)) return { ok: false, err: "가져갈 것을 골라요" };
      const t = t0.length === L ? t0 : [...t0, 0];   // 흰 별 판에서 5칸으로 오면 흰 별 0
      if (sum(t) !== st.pickK) return { ok: false, err: `${st.pickK}개를 골라야 해요` };
      for (let c = 0; c < 4; c++) if (t[c] > st.table[c]) return { ok: false, err: `${COL[c]} 별이 모자라요` };
      if (t[4] > st.tbomb) return { ok: false, err: "폭탄이 모자라요" };
      if (L === 6 && t[5] > st.tw) return { ok: false, err: "흰 별이 모자라요" };
      for (let c = 0; c < 4; c++) h[c] += t[c];
      const err = doSwaps(h, bag, a.swaps, w + (L === 6 ? t[5] : 0)); if (err) return { ok: false, err };
      doTake(st, seat, t);
      st.hold[seat] = h; st.bag = bag; for (const s of a.swaps || []) push(st, { k: "swap", s: seat, from: s.from, to: s.to });
      st.qi++;
      if (checkEnd(st)) return { ok: true };
      advancePicks(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 할 수 없어요" };
  }
  const auto = st => (st.phase === "rev" && !st.over ? 4600 : null);
  function advance(st) {
    if (st.phase !== "rev" || st.over) return;
    refill(st); startRound(st);
  }
  const over = st => !!st.over;
  function ranks(st) {
    const p = st.hold.map((h, i) => ptsOf(h, wh(st, i))), loser = st.loser;
    return p.map((x, i) => (i === loser ? st.n - 1 : p.filter((y, j) => j !== loser && y > x).length));
  }
  // ── AI 쪽 계산 (보이는 것만) ─────────────────────────────────
  function fc(c, x) { const nd = NEED[c], p = CP[c]; return x >= nd ? p + 0.15 * (x - nd) : p * 0.7 * Math.pow(x / nd, 1.2); }
  // 별자리 진행도 환산 점수. 흰 별 w 개는 별자리마다 나눠 쓰는 가장 좋은 방법으로 (완성에 모자란 만큼만 쓸모 있어요)
  function Vh(h, w) {
    if (!(w > 0)) return fc(0, h[0]) + fc(1, h[1]) + fc(2, h[2]) + fc(3, h[3]);
    let dp = Array(w + 1).fill(0);
    for (let c = 0; c < 4; c++) {
      const dmax = Math.min(w, h[c] >= NEED[c] ? 0 : NEED[c] - h[c]), nd = Array(w + 1);
      for (let j = 0; j <= w; j++) { let b = -1e9; for (let u = 0; u <= Math.min(j, dmax); u++) { const v = dp[j - u] + fc(c, h[c] + u); if (v > b) b = v; } nd[j] = b; }
      dp = nd;
    }
    return dp[w];
  }
  const util = (h, b, w) => Vh(h, w) - PEN[Math.min(3, b)];
  // tab = [색 4 · 폭탄] 또는 [색 4 · 폭탄 · 흰 별] — h · w = 가져가는 사람의 별 · 흰 별
  function greedyTake(tab, h, k, w) {
    w = w | 0;
    const t = tab.slice(), hh = h.slice(), take = tab.map(() => 0), hasW = tab.length > 5; let ww = w;
    for (let i = 0; i < k; i++) {
      let best = -1, bg = -1e9;
      const v0 = ww > 0 || (hasW && t[5] > 0) ? Vh(hh, ww) : 0;
      for (let c = 0; c < 4; c++) if (t[c] > 0) {
        const g = (ww > 0 ? Vh(hh.map((v, q) => (q === c ? v + 1 : v)), ww) - v0 : fc(c, hh[c] + 1) - fc(c, hh[c])) + t[c] * 1e-4;
        if (g > bg) { bg = g; best = c; }
      }
      if (hasW && t[5] > 0) { const g = Vh(hh, ww + 1) - v0 + 1e-3 + t[5] * 1e-4; if (g > bg) { bg = g; best = 5; } }   // 같은 값이면 어디든 쓰는 흰 별이 더 유연해서 먼저
      if (best < 0) { if (t[4] > 0) best = 4; else break; }
      t[best]--; take[best]++; if (best < 4) hh[best]++; else if (best === 5) ww++;
    }
    return take;
  }
  // 교환: 점수 · 진행도가 오르는 것만 (같은 색 3개 → 1개)
  function planSwaps(hold, bag, tier, w) {
    w = w | 0;
    const h = hold.slice(), b = bag.slice(), out = [];
    for (let it = 0; it < 4; it++) {
      let best = null, bg = tier === "easy" ? 0.5 : 0.05;
      for (let x = 0; x < 4; x++) if (freeOf(h, x, w) >= 3) for (let y = 0; y < 4; y++) if (y !== x && b[y] >= 1) {
        const g = Vh(h.map((v, c) => (c === x ? v - 3 : c === y ? v + 1 : v)), w) - Vh(h, w);
        if (g > bg) { bg = g; best = { from: x, to: y }; }
      }
      if (!best) break;
      h[best.from] -= 3; b[best.from] += 3; h[best.to]++; b[best.to]--; out.push(best);
    }
    return { swaps: out, hold: h, bag: b };
  }
  const hwOf = (V, i) => (V.hw ? V.hw[i] | 0 : 0);
  const tabOf = V => (V.white ? [...V.table, V.tbomb, V.tw] : [...V.table, V.tbomb]);
  const TIER = { easy: { K: 8, temp: 2, rnd: 0.35, hist: false, rot: false }, normal: { K: 40, temp: 0.9, rnd: 0.12, hist: true, rot: false }, hard: { K: 140, temp: 0.06, rnd: 0, hist: true, rot: true } };
  function oppDist(V, j, T) {
    const w = [1, 1, 1, 1, 1];
    if (T.hist) {
      const H = V.hist.filter(x => x.cards[j]); let wt = 1;
      for (let a = H.length - 1; a >= 0; a--) { w[H[a].cards[j] - 1] += wt; wt *= 0.82; }
      if (T.rot && H.length >= 3) {
        const c3 = H.slice(-3).map(x => x.cards[j]), nx = x => (x % 5) + 1;
        if (nx(c3[0]) === c3[1] && nx(c3[1]) === c3[2]) w[nx(c3[2]) - 1] += 5;
      }
    }
    const s = sum(w); return w.map(x => x / s);
  }
  const pick = (d, r) => { let u = r(); for (let i = 0; i < d.length; i++) { u -= d[i]; if (u <= 0) return i + 1; } return d.length; };
  // 내가 낼 수 있는 카드 5장의 기대 이득 (남의 카드는 지난 기록으로 추정)
  function evalCards(V, me, T, r) {
    const n = V.n, tab = tabOf(V), h0 = V.hold[me], w0 = hwOf(V, me), u0 = util(h0, V.bombs[me], w0);
    const others = [...Array(n).keys()].filter(j => j !== me), dist = others.map(j => oppDist(V, j, T));
    const op = V.points.filter((_, j) => j !== me), omax = Math.max(0, ...op), omin = Math.min(...op, 99);
    const ev = Array(6).fill(0), col = Array(6).fill(0);
    for (let k = 0; k < T.K; k++) {
      const oc = Array(n).fill(0), cnt = Array(6).fill(0);
      others.forEach((j, a) => { oc[j] = pick(dist[a], r); cnt[oc[j]]++; });
      for (let c = 1; c <= 5; c++) {
        if (cnt[c] > 0) { col[c]++; continue; }
        const order = others.filter(j => cnt[oc[j]] === 1 && oc[j] < c).sort((a, b) => oc[a] - oc[b]);
        let tt = tab.slice();
        for (const s of order) { const kk = Math.min(oc[s], sum(tt)), tk = greedyTake(tt, V.hold[s], kk, hwOf(V, s)); for (let q = 0; q < tt.length; q++) tt[q] -= tk[q]; }
        const kk = Math.min(c, sum(tt)), tk = greedyTake(tt, h0, kk, w0), h1 = h0.map((v, q) => v + tk[q]), b1 = V.bombs[me] + tk[4], w1 = w0 + (tk[5] | 0);
        let d = util(h1, b1, w1) - u0;
        if (consOf(h1, w1) >= 3) { const mp = ptsOf(h1, w1); d += mp > omax ? 9 : mp <= omin ? -5 : -1; }
        ev[c] += d;
      }
    }
    for (let c = 1; c <= 5; c++) { ev[c] /= T.K; col[c] /= T.K; }
    return { ev, col };
  }
  function cardPlan(V, me, tier, r) {
    const T = TIER[tier], { ev, col } = evalCards(V, me, T, r);
    let c;
    if (r() < T.rnd) c = 1 + Math.floor(r() * 5);
    else {
      const mx = Math.max(...ev.slice(1)), w = ev.slice(1).map(x => Math.exp((x - mx) / T.temp)), s = sum(w);
      let u = r() * s; c = 5; for (let i = 0; i < 5; i++) { u -= w[i]; if (u <= 0) { c = i + 1; break; } }
    }
    const bestC = ev.indexOf(Math.max(...ev.slice(1)), 1);
    return { c, ev, col, bestC };
  }
  function pickTake(V, me) { return greedyTake(tabOf(V), V.hold[me], V.pickK, hwOf(V, me)); }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const T = TIER[tier] ? tier : "normal";
    if (V.phase === "card") {
      const sp = T === "easy" && r() < 0.5 ? { swaps: [], hold: V.hold[me].slice(), bag: V.bag.slice() } : planSwaps(V.hold[me], V.bag, T, hwOf(V, me)), V2 = Object.assign({}, V, { hold: V.hold.map((x, i) => (i === me ? sp.hold : x)) });
      const a = { t: "card", c: cardPlan(V2, me, T, r).c }; if (sp.swaps.length) a.swaps = sp.swaps; return a;
    }
    if (V.phase === "pick") {
      let take = pickTake(V, me);
      if (T === "easy" && r() < 0.4) { const t = tabOf(V), tk = t.map(() => 0); for (let i = 0; i < V.pickK; i++) { const av = t.map((_, q) => q).filter(q => t[q] > 0); const q = av[Math.floor(r() * av.length)]; t[q]--; tk[q]++; } take = tk; }
      const h = V.hold[me].map((v, c) => v + take[c]), sp = planSwaps(h, V.bag, T, hwOf(V, me) + (take[5] | 0)), a = { t: "take", take };
      if (sp.swaps.length) a.swaps = sp.swaps; return a;
    }
    return null;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "card") return [{ t: "card", c: 1 }];
    return [{ t: "take", take: greedyTake(itemsOf(st), st.hold[seat], st.pickK, wh(st, seat)) }];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const shown = st.rev && (st.phase === "pick" || st.phase === "rev" || st.phase === "end") ? st.rev : null;
    const pts = st.hold.map((h, i) => ptsOf(h, wh(st, i)));
    const pubObj = { r: st.round, p: st.phase, t: st.table, tb: st.tbomb, h: st.hold, b: st.bombs, d: st.cards.map(c => (c === null ? 0 : 1)), rev: shown ? [shown.cards, shown.takes] : 0, pk: st.picker, o: st.over, bag: st.bag };
    if (st.white) { pubObj.tw = st.tw; pubObj.hw = st.hw; pubObj.bw = st.bw; }
    return {
      n: st.n, seat, round: st.round, maxRounds: MAX_ROUNDS, phase: st.phase, table: st.table.slice(), tbomb: st.tbomb, bag: st.bag.slice(),
      white: st.white | 0, tw: st.tw | 0, bw: st.bw | 0, hw: st.hold.map((_, i) => wh(st, i)), use: st.hold.map((h, i) => useOf(h, wh(st, i))),
      hold: st.hold.map(h => h.slice()), bombs: st.bombs.slice(), points: pts, cons: st.hold.map((h, i) => consOf(h, wh(st, i))),
      done: st.cards.map(c => c !== null), mine: me >= 0 ? st.cards[me] : null, cards: all ? st.cards.slice() : null,
      rev: shown ? { r: shown.r, cards: shown.cards.slice(), elim: shown.elim.slice(), order: shown.order.slice(), takes: shown.takes.map(t => ({ s: t.s, k: t.k, take: t.take.slice() })) } : null,
      hist: st.hist.slice(-12).map(x => ({ r: x.r, cards: x.cards.slice(), elim: x.elim.slice(), order: x.order.slice(), takes: x.takes.map(t => ({ s: t.s, k: t.k, take: t.take.slice() })) })),
      picker: st.picker, pickK: st.pickK, needs: needs(st), over: st.over, why: st.why, loser: st.loser, ranks: st.over ? ranks(st) : null, score: pts, log: st.log.slice(-30), pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── 복기 · 선생님용 평가 (ai() 가 쓰는 evalCards · util · greedyTake 를 그대로 재사용 · 고정 씨앗 · 받은 view 는 안 바꿈) ──
  // 단위 = util (별자리 진행도 환산 점수 − 폭탄 벌점, ≈ 승점). 별 1개 ≈ +0.4 ~ +1.1 · 폭탄 1개 −0.6 · 2개째 −1.4 · 3개째 −12
  // 흰 별 1개 = 별자리 어디든 쓰는 별이라 가장 모자란 별자리를 채우는 값 (별자리를 완성시키면 그 별자리 점수까지)
  // 가져가기: 가져간 뒤 util 변화 (+ 별자리 3개가 되어 끝나면 승점 순위 보정). 카드: 상대 카드 추정 · 겹침까지 넣은 기대값
  function takeGain(V, me, take, swaps) {
    if (!Array.isArray(take) || !(take.length === 5 || (V.white && take.length === 6))) return null;
    const w0 = hwOf(V, me), wn = V.white ? take[5] | 0 : 0, w1 = w0 + wn;
    const h = V.hold[me].slice(), bag = V.bag.slice(), b0 = V.bombs[me], b1 = b0 + take[4];
    for (let c = 0; c < 4; c++) h[c] += take[c];
    if (doSwaps(h, bag, swaps, w1)) return null;
    const prog = Vh(h, w1) - Vh(V.hold[me], w0), pen = PEN[Math.min(3, b1)] - PEN[Math.min(3, b0)];
    let end = 0;
    if (consOf(h, w1) >= 3) { const op = V.points.filter((_, j) => j !== me), omax = Math.max(0, ...op), omin = Math.min(...op, 99), mp = ptsOf(h, w1); end = mp > omax ? 9 : mp <= omin ? -5 : -1; }
    return { ev: prog - pen + end, prog, pen, end, b1, wn };
  }
  // acts = 같은 자리에서 견줄 행동들 (card · take · swap) → 같은 순서의 [{kind, ev, ...}|null]
  function evalActs(V, me, acts, seed) {
    const T = TIER.hard, cache = {}, out = [], w0 = hwOf(V, me);
    for (const a of acts) {
      if (!a || typeof a !== "object" || !V.needs || !V.needs.includes(me)) { out.push(null); continue; }
      if (a.t === "swap") {
        const h = V.hold[me].slice(), bag = V.bag.slice();
        if (doSwaps(h, bag, [a], w0)) { out.push(null); continue; }
        out.push({ kind: "swap", ev: Vh(h, w0) - Vh(V.hold[me], w0), from: Vh(V.hold[me], w0), to: Vh(h, w0) });
      } else if (a.t === "card" && V.phase === "card" && Number.isInteger(a.c) && a.c >= 1 && a.c <= 5) {
        const h = V.hold[me].slice(), bag = V.bag.slice();
        if (doSwaps(h, bag, a.swaps, w0)) { out.push(null); continue; }
        const key = JSON.stringify(a.swaps || []);
        if (!cache[key]) cache[key] = evalCards(Object.assign({}, V, { hold: V.hold.map((x, i) => (i === me ? h : x)) }), me, T, sampler(seed));
        const E = cache[key], sw = util(h, V.bombs[me], w0) - util(V.hold[me], V.bombs[me], w0);
        out.push({ kind: "card", ev: E.ev[a.c] + sw, col: E.col[a.c], swapGain: sw, c: a.c });
      } else if (a.t === "take" && V.phase === "pick" && V.picker === me) {
        const g = takeGain(V, me, a.take, a.swaps);
        out.push(g ? Object.assign({ kind: "take" }, g) : null);
      } else out.push(null);
    }
    return out;
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const nm = (names, i) => (names && names[i]) || `${i + 1}번`;
  const itemTxt = take => take.map((x, i) => (x > 0 ? `${i < 4 ? CEM[i] : i === 4 ? "💣" : "⚪"}${x}` : "")).filter(Boolean).join(" ") || "없음";
  // 이름 뒤 조사: '나' → 내가 · 받침 있으면 이 / 없으면 가
  const iga = s => { s = String(s); if (s === "나") return "내가"; const c = s.charCodeAt(s.length - 1); const bat = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : "0136780".includes(s[s.length - 1]) && /[0-9]/.test(s[s.length - 1]); return s + (bat ? "이" : "가"); };
  const sgn = x => ((x = Math.round(x * 10) / 10) >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
  // 흰 별 가진 자리 한 줄: "흰 별 2개 (양자리에 1개 · 남은 1개)"
  function whiteTxt(V, i) {
    const w = hwOf(V, i); if (!V.white || w <= 0) return "";
    const u = V.use ? V.use[i] : [0, 0, 0, 0], used = sum(u), parts = [0, 1, 2, 3].filter(c => u[c] > 0).map(c => `${CN[c]}에 ${u[c]}개`);
    if (w > used) parts.push(`남은 ${w - used}개`);
    return `⚪${w}개 (${parts.join(" · ")})`;
  }
  function coach(V, me, since, names) {
    if (!(me >= 0 && me < V.n)) me = 0;
    const who = i => (i === me ? "나" : nm(names, i));
    if (V.over) {
      const why = V.why === "bomb" ? `${iga(who(V.loser))} 폭탄 3개를 받아 끝났어요` : V.why === "cons" ? "누군가 별자리 3개를 완성해 끝났어요" : "별을 다 나눠서 끝났어요";
      const top = Math.max(...V.points);
      return { opp: `${why}. 승점이 가장 높은 쪽이 우승이에요.${V.why !== "bomb" && V.loser >= 0 ? ` 승점이 가장 낮은 ${iga(who(V.loser))} 탈락 후보예요.` : ""} (${V.round}라운드)`, mine: `내 승점 ${V.points[me]} · 완성한 별자리 ${V.cons[me]}개 · 폭탄 ${V.bombs[me]}개${V.white && hwOf(V, me) ? ` · 흰 별 ${hwOf(V, me)}개` : ""}`, rec: V.ranks && V.ranks[me] === 0 ? "우승이에요!" : "승점 합계가 승부예요", why: `최종 승점 ${[...Array(V.n).keys()].map(i => `${who(i)} ${V.points[i]}`).join(" · ")} — 1등과 내 차이 ${top - V.points[me]}점. 별자리 개수보다 승점 합계로 우승이 가려져요 (3개 10점보다 2개 12점이 이길 수 있어요).` };
    }
    const danger = [];
    for (let i = 0; i < V.n; i++) {
      if (i === me) continue;
      if (V.bombs[i] >= 2) danger.push(`${who(i)} 폭탄 ${V.bombs[i]}개(하나 더 받으면 탈락)`);
      if (V.cons[i] >= 2) danger.push(`${who(i)} 별자리 ${V.cons[i]}개(하나 더 완성하면 끝)`);
      else if (V.white && hwOf(V, i) > 0) danger.push(`${who(i)} 흰 별 ${hwOf(V, i)}개(어느 별자리에나 쓸 수 있어요)`);
    }
    const last = V.hist[V.hist.length - 1];
    const left = sum(V.bag) + (V.bw | 0), tabN = sum(V.table) + (V.tw | 0);
    const oppTxt = `${last ? `지난 라운드 카드: ${[...Array(V.n).keys()].map(i => `${who(i)} ${last.cards[i]}${last.elim[i] ? "(겹침)" : ""}`).join(" · ")}. ` : ""}${danger.length ? `주의: ${danger.join(", ")}.` : `아직 끝이 가까운 사람은 없어요 (남은 별 ${left}개 · 테이블 별 ${tabN}개 + 폭탄 ${V.tbomb}개).`}`;
    const need3 = [0, 1, 2, 3].map(c => `${CEM[c]}${V.hold[me][c]}/${NEED[c]}`).join(" ");
    const mineTxt = `승점 ${V.points[me]} · 별자리 ${V.cons[me]}개 · 폭탄 ${V.bombs[me]}개 · 내 별 ${need3}${whiteTxt(V, me) ? ` · 흰 별 ${whiteTxt(V, me)}` : ""}`;
    const tabTxt = `별 ${tabN}개${V.white && V.tw ? `(흰 별 ${V.tw}개 포함)` : ""}와 폭탄 ${V.tbomb}개`;
    if (V.phase === "rev") {
      const mt = V.rev && V.rev.takes.find(t => t.s === me), pts = V.points.map((p, i) => `${who(i)} ${p}`).join(" · ");
      return { opp: oppTxt, mine: mineTxt, rec: "결과를 확인해요", why: `이번 라운드 내 카드 ${V.rev ? V.rev.cards[me] : "?"}번 → ${V.rev && V.rev.elim[me] ? "다른 사람과 겹쳐 아무것도 못 가져갔어요" : mt ? `${itemTxt(mt.take)} 가져갔어요` : "가져간 것이 없어요"}. 승점 ${pts} · 남은 별 ${left}개로 곧 다음 라운드가 시작돼요.` };
    }
    let rec = "기다려요", why = "";
    if (V.phase === "card" && V.needs.includes(me)) {
      const sp = planSwaps(V.hold[me], V.bag, "hard", hwOf(V, me)), V2 = Object.assign({}, V, { hold: V.hold.map((x, i) => (i === me ? sp.hold : x)) });
      const pl = cardPlan(V2, me, "hard", sampler(V.round * 7919 + me * 31 + V.hist.length)), c = pl.bestC, tot = pl.ev[c] + util(sp.hold, V.bombs[me], hwOf(V, me)) - util(V.hold[me], V.bombs[me], hwOf(V, me));
      rec = `${c}번 카드 내기`; why = `다른 사람이 같은 숫자를 낼 확률은 약 ${Math.round(pl.col[c] * 100)}%예요 (겹치면 이번 라운드는 아무것도 못 가져가요) · 기대 승점 변화 ${sgn(tot)}. 1~3은 폭탄을 피하기 쉽고, 4~5는 남은 것이 폭탄뿐일 위험이 커요.${V.white && V.tw ? ` 테이블의 흰 별 ${V.tw}개는 어느 별자리에나 쓸 수 있어서 가장 값져요.` : ""}${sp.swaps.length ? ` 먼저 ${sp.swaps.map(s => `${CEM[s.from]}3개→${CEM[s.to]}1개`).join(", ")} 교환하면 별자리에 가까워져요.` : ""}`;
    } else if (V.phase === "card") {
      rec = "다른 사람을 기다려요";
      const col = V.mine ? evalCards(V, me, TIER.hard, sampler(V.round * 7919 + me * 31 + V.hist.length)).col[V.mine] : null;
      why = `카드는 모두가 낸 뒤 동시에 공개돼요 (${V.done.filter(Boolean).length}/${V.n}명 제출).${col != null ? ` 내가 낸 ${V.mine}번이 다른 사람과 겹칠 확률은 약 ${Math.round(col * 100)}%예요.` : ""} 테이블에는 ${tabTxt}가 있어요.`;
    }
    else if (V.phase === "pick" && V.picker === me) {
      const tk = pickTake(V, me), g = takeGain(V, me, tk, []);
      rec = `${itemTxt(tk)} 가져가기`;
      why = `${V.white ? "흰 별은 어느 별자리에나 쓸 수 있으니 먼저, 그다음 " : ""}별자리를 빨리 채울 별부터, 폭탄은 마지막에 가져가요. 폭탄 3개를 받으면 바로 탈락이에요.${g ? ` 이렇게 가져가면 별자리 진행 ${sgn(g.prog)}점${g.wn ? `(흰 별 ${g.wn}개 포함)` : ""}${g.pen ? ` · 폭탄 벌점 −${g.pen.toFixed(1)}점` : ""} → 합계 ${sgn(g.ev)}점이고 폭탄은 ${g.b1}개가 돼요.` : ""}`;
    }
    else if (V.phase === "pick") { rec = `${iga(who(V.picker))} 고르는 중`; why = `${V.pickK}개를 가져가요 (테이블에 ${V.white ? tabTxt : `별 ${tabN}개 · 폭탄 ${V.tbomb}개`}). 내 카드는 ${V.rev && V.rev.elim[me] ? "겹쳐서 제외됐어요" : "순서를 기다려요"}.`; }
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return { id: "gn-stars", NEED, CP, CN, COL, CEM, PERCOL, WHITE, MAX_ROUNDS, TIER, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, cardPlan, evalCards, evalActs, takeGain, greedyTake, planSwaps, ptsOf, consOf, util, doSwaps, freeOf, plan, useOf, Vh };
});

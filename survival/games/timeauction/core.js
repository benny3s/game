/* 베니 서바이벌 · 시간 경매 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데스룸 (시즌 2) · 2일차 감옥 매치 '시간 경매' (6명)
   · 사람마다 시간 통장 10분 (600초), 0.1초 단위. 경매는 모두 19번
   · 경매마다 모두 가려진 버튼을 누르고 기다림 → 5초 카운트다운. 그 안에 손을 떼면 이번 경매는 포기 (시간 안 듦)
   · 카운트다운이 끝나면 버튼을 쥔 사람 모두 시간이 줄어듦. 원하는 때 손을 떼면 그만큼 씀 (져도 쓴 시간은 안 돌아옴)
   · 마지막까지 쥔 사람이 낙찰 → 승리 표식 1개. 가장 오래 쥔 사람이 0.1초까지 같으면 유찰 (아무도 표식 없음)
   · 남은 시간을 다 쓰면 버튼이 저절로 풀림 (남은 시간보다 오래 쥘 수 없음)
   · 보이는 것: 경매가 끝나면 낙찰자와 경매 시간(= 가장 오래 쥔 시간)만. 누가 참가했는지 · 남의 남은 시간은 비밀
   · 19번이 끝나면 표식이 가장 많은 사람이 피스 1개 (표식이 같으면 남은 시간이 많은 쪽, 그것도 같으면 피스 없음)
     표식이 가장 적은 사람 탈락 (표식이 같으면 남은 시간이 적은 쪽)
   우리 판 다듬기 (방송과 다른 점 · 방송 글에 없는 것):
   · 3~8명 (방송 6명) — 시간 통장 · 경매 수는 그대로
   · 내 남은 시간은 화면에 보여 줌 (방송은 기억해야 함) · 게임이 끝나면 모두의 남은 시간과 쥔 시간을 공개
   · 탈락 후보가 표식 · 남은 시간까지 같으면 추첨 (방송 글에 없음)
   · 행동은 '몇 초 쥐었나' 하나 (0 = 포기). 화면은 진짜로 꾹 누르는 단추, 시계 빠르기는 고를 수 있음 (보기만 빨라짐) */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).timeauction = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const BANK = 6000, R = 19, CD = 5, P0 = 500;        // 단위 0.1초 · 카운트다운 5초 (화면만) · 첫 시세 50초

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function mul(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const fmt = d => { d = Math.max(0, d | 0); const m = Math.floor(d / 600), s = ((d % 600) / 10).toFixed(1); return m ? `${m}:${s.padStart(4, "0")}` : `${s}초`; };

  // ── 판 진행 ───────────────────────────────────────────────
  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(8, (n | 0) || 6));
    const spd = [1, 2, 4].includes(+(cfg && cfg.spd)) ? +cfg.spd : 1;
    const st = {
      n, rs: (seed >>> 0) || 1, seq: 0, log: [], round: 0, R, spd, phase: "", over: false,
      bank: Array(n).fill(BANK), marks: Array(n).fill(0), winR: Array.from({ length: n }, () => []),
      bid: Array(n).fill(null), res: null, hist: [], fin: null,
    };
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++; st.phase = "bid"; st.res = null;
    st.bid = st.bank.map(b => (b > 0 ? null : 0));      // 남은 시간이 0 이면 저절로 포기
    push(st, { k: "round", r: st.round });
    if (!needs(st).length) resolve(st);
  }
  const needs = st => (st.over || st.phase !== "bid" ? [] : st.bid.map((d, s) => (d == null ? s : -1)).filter(s => s >= 0));
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a.t !== "bid" || !Number.isInteger(a.d) || a.d < 0 || a.d > BANK) return { ok: false, err: "쥔 시간(0.1초 단위)을 내요" };
    st.bid[seat] = Math.min(a.d, st.bank[seat]);        // 남은 시간을 넘으면 버튼이 저절로 풀림
    if (!needs(st).length) resolve(st);
    return { ok: true };
  }
  // 가장 오래 쥔 사람 → { t, w (없으면 -1), tie }
  function topOf(bids) {
    let t = 0, k = 0, w = -1;
    for (let s = 0; s < bids.length; s++) { const d = bids[s] || 0; if (d > t) { t = d; k = 1; w = s; } else if (d === t && d > 0) k++; }
    return { t, w: k === 1 ? w : -1, tie: k > 1 };
  }
  function resolve(st) {
    const T = topOf(st.bid), bids = st.bid.map(d => d || 0);
    for (let s = 0; s < st.n; s++) st.bank[s] -= bids[s];
    if (T.w >= 0) { st.marks[T.w]++; st.winR[T.w].push(st.round); }
    const rec = { r: st.round, w: T.w, t: T.t, tie: T.tie, bids };
    st.hist.push(rec);
    st.res = JSON.parse(JSON.stringify(rec));
    push(st, { k: "res", r: st.round, w: T.w, t: T.t, tie: T.tie });
    if (st.round >= st.R) finish(st); else st.phase = "show";
  }
  // 끝: 표식 → 남은 시간 → (탈락 후보만) 추첨
  function finish(st) {
    const rows = st.marks.map((m, s) => ({ s, m, b: st.bank[s], z: rnd(st) })).sort((a, b) => b.m - a.m || b.b - a.b || a.z - b.z);
    const same = (a, b) => a.m === b.m && a.b === b.b;
    const n = rows.length, top = rows[0], sec = rows[1], last = rows[n - 1], prev = rows[n - 2];
    const piece = same(top, sec) ? -1 : top.s, pieceWhy = same(top, sec) ? "tie" : top.m === sec.m ? "time" : "";
    const elimWhy = same(last, prev) ? "lot" : last.m === prev.m ? "time" : "";
    st.fin = { rows: rows.map(x => ({ s: x.s, m: x.m, b: x.b })), piece, pieceWhy, elim: last.s, elimWhy };
    st.phase = "end"; st.over = true;
    push(st, { k: "end", piece, elim: last.s });
  }
  const auto = st => (st.phase === "show" ? (st.res && st.res.w < 0 ? 3600 : 3000) : null);
  function advance(st) { if (st.phase === "show" && !st.over) startRound(st); }
  const over = st => !!st.over;
  // 등수: 표식 → 남은 시간 (완전히 같으면 같은 등수, 탈락은 맨 아래). 끝나기 전엔 표식만
  function ranks(st) {
    const r = Array(st.n).fill(0);
    if (!st.fin) { for (let s = 0; s < st.n; s++) r[s] = st.marks.filter(m => m > st.marks[s]).length; return r; }
    const rows = st.fin.rows;
    rows.forEach((x, k) => { r[x.s] = k > 0 && x.m === rows[k - 1].m && x.b === rows[k - 1].b ? r[rows[k - 1].s] : k; });
    r[st.fin.elim] = st.n - 1;
    return r;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    const b = st.bank[seat], out = [{ t: "bid", d: 0 }];
    for (const d of [1, 10, 50, 100, 200, 300, 600, 900, 1200, 1800]) if (d <= b) out.push({ t: "bid", d });
    if (b > 0 && !out.some(x => x.d === b)) out.push({ t: "bid", d: b });
    return out;
  }

  // ── 보이는 것: 표식 · 낙찰자 · 낙찰 시간은 공개. 숨는 것 = 남의 남은 시간 · 남이 쥔 시간 · 누가 참가했는지 (끝나면 모두 공개) ───
  const pubRec = h => ({ r: h.r, w: h.w, t: h.t, tie: h.tie });
  function view(st, seat) {
    const all = seat === "all", me = Number.isInteger(seat) && seat >= 0 && seat < st.n ? seat : -1, open = all || st.over;
    const known = Array(st.n).fill(0);                   // 낙찰에 쓴 시간 (모두가 앎) = 적어도 이만큼은 씀
    for (const h of st.hist) if (h.w >= 0) known[h.w] += h.t;
    const pubObj = { r: st.round, p: st.phase, m: st.marks, h: st.hist.map(pubRec), ov: st.over, f: st.fin };   // 누가 냈는지(손을 뗐는지)는 넣지 않음
    return {
      n: st.n, R: st.R, round: st.round, phase: st.phase, spd: st.spd, BANK, CD,
      bank: st.bank.map((b, s) => (open || s === me ? b : null)),
      bid: st.bid.map((d, s) => (d == null ? null : open || s === me ? d : null)),
      marks: st.marks.slice(), winR: st.winR.map(a => a.slice()), known,
      hist: st.hist.map(h => Object.assign(pubRec(h), { my: me >= 0 ? h.bids[me] : null, bids: open ? h.bids.slice() : null })),
      res: st.res ? Object.assign(pubRec(st.res), { my: me >= 0 ? st.res.bids[me] : null, bids: open ? st.res.bids.slice() : null }) : null,
      price: priceOf(st.hist), fin: st.fin ? JSON.parse(JSON.stringify(st.fin)) : null,
      needs: all ? needs(st) : needs(st).filter(s => s === me) /* 남이 아직 쥐고 있는지 · 저절로 포기했는지는 비밀 */, over: st.over, ranks: st.over ? ranks(st) : null, log: st.log.slice(-60), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI (보이는 것만) ────────────────────────────────────────
  // 시세: 지금까지의 낙찰 시간을 최근 쪽에 무게를 두고 섞음 (아무도 안 사면 내려감)
  function stepPrice(p, t) { return t > 0 ? Math.round(p * 0.65 + t * 0.35) : Math.round(p * 0.8); }
  function priceOf(hist) { let p = P0; for (const h of hist) p = stepPrice(p, h.t); return p; }
  function gauss(r) { let u = r(); if (u < 1e-9) u = 1e-9; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const NZ = { normal: { sd: 0.45, sn: 1 }, self: { sd: 0.3, sn: 0.6 } };

  // 초급: 남은 시간 ÷ 남은 경매를 기준으로 아무렇게나 (판세 · 시세는 안 봄)
  function easyBid(S, s, r) {
    const b = S.bank[s]; if (b <= 0 || r() < 0.35) return 0;
    const L = S.R - S.round + 1;
    return clamp(Math.round((b / L) * 1.4 * Math.exp(gauss(r) * 0.8)), 1, b);
  }
  // 중급 (그리고 굴려 볼 때 모두의 기본 수): 판세 · 시세 · 남은 시간을 보고
  function heurBid(S, s, r, nz) {
    const b = S.bank[s]; if (b <= 0) return 0;
    const L = S.R - S.round + 1, m = S.marks[s], price = Math.max(20, S.price);
    let minO = 99, maxO = -1;
    for (let j = 0; j < S.n; j++) if (j !== s) { if (S.marks[j] < minO) minO = S.marks[j]; if (S.marks[j] > maxO) maxO = S.marks[j]; }
    const lead = m - minO;                                // 0 이하면 꼴찌 쪽
    if (L === 1) {                                        // 마지막 경매: 위험하면 다 걸고, 아니면 아껴서 남은 시간으로 앞섬
      if (lead <= 0) return b;
      if (m + 1 >= maxO && r() < 0.5) return clamp(Math.round(price * 1.6), 1, b);
      return 0;
    }
    const budget = b / L;
    let p = 0.4 + 0.2 * Math.min(2, (budget * 2.2) / price) - 0.12 * Math.max(0, lead - 1) + 0.2 * Math.max(0, 1 - lead);
    if (L <= 3 && lead <= 0) p += 0.25;
    if (r() > clamp(p, 0.08, 0.95)) return 0;
    if (r() < 0.14 * nz.sn) return 1 + Math.floor(r() * 25);   // 아무도 안 누르길 바라고 조금만
    const mult = Math.exp(gauss(r) * nz.sd) * (0.85 + 0.25 * Math.max(0, 1 - lead));
    const cap = Math.round(budget * (2.5 + 1.5 * Math.max(0, 1 - lead) + (L <= 3 && lead <= 0 ? 3 : 0)));
    return clamp(Math.min(Math.round(price * mult), cap), 1, b);
  }

  // 남의 남은 시간을 짐작: 지난 경매를 그 사람 성향(초급 · 중급 꼴)으로 다시 두되 결과(낙찰자 · 낙찰 시간)와 맞게
  function sampleWorld(V, me, r, wE) {
    const n = V.n, types = [], bank = Array(n).fill(BANK), marks = Array(n).fill(0);
    for (let j = 0; j < n; j++) types.push(j === me ? "s" : r() < wE ? "e" : "n");
    let price = P0;
    for (let k = 0; k < V.hist.length; k++) {
      const h = V.hist[k], S = { n, R: V.R, round: h.r, bank, marks, price };
      for (let j = 0; j < n; j++) {
        if (j === me) { bank[j] -= h.my || 0; continue; }
        let d;
        if (h.w === j) d = h.t;
        else if (h.t === 0) d = 0;
        else {
          d = -1;
          for (let tr = 0; tr < 3 && d < 0; tr++) { const x = types[j] === "e" ? easyBid(S, j, r) : heurBid(S, j, r, NZ.normal); if (x < h.t || (h.tie && x === h.t)) d = x; }
          if (d < 0) d = r() < 0.5 ? 0 : Math.floor(r() * h.t);
        }
        bank[j] = Math.max(0, bank[j] - Math.min(d, bank[j]));
      }
      if (h.w >= 0) marks[h.w]++;
      price = stepPrice(price, h.t);
    }
    if (me >= 0 && V.bank[me] != null) bank[me] = V.bank[me];
    return { n, R: V.R, round: V.round, bank, marks: V.marks.slice(), price, types };
  }
  const cloneW = W => ({ n: W.n, R: W.R, round: W.round, bank: W.bank.slice(), marks: W.marks.slice(), price: W.price, types: W.types });
  function bidOf(W, j, r) { return W.types[j] === "e" ? easyBid(W, j, r) : heurBid(W, j, r, W.types[j] === "s" ? NZ.self : NZ.normal); }
  // 끝까지 굴려 보기 → 내 몫 (나보다 아래인 사람 비율: 표식 → 남은 시간)
  function rollout(W, me, d0, r) {
    const S = cloneW(W), n = S.n; let win0 = 0;
    for (; S.round <= S.R; S.round++) {
      const bids = Array(n);
      for (let j = 0; j < n; j++) bids[j] = Math.min(S.bank[j], j === me && S.round === W.round ? d0 : bidOf(S, j, r));
      const T = topOf(bids);
      for (let j = 0; j < n; j++) S.bank[j] -= bids[j];
      if (T.w >= 0) S.marks[T.w]++;
      if (S.round === W.round) win0 = T.w === me ? 1 : 0;
      S.price = stepPrice(S.price, T.t);
    }
    let below = 0;
    for (let j = 0; j < n; j++) if (j !== me && (S.marks[j] < S.marks[me] || (S.marks[j] === S.marks[me] && S.bank[j] < S.bank[me]))) below++;
    return { u: below / (n - 1), win0 };
  }
  // 성향 짐작: 낙찰 시간이 시세와 동떨어질수록 '아무렇게나' 쪽이 많다고 봄 (공개 기록만)
  function mixOf(V) {
    let lo = 0, k = 0, p = P0;
    for (const h of V.hist) { if (h.t > 0) { const q = Math.abs(Math.log(h.t / Math.max(20, p))); lo += q; k++; } p = stepPrice(p, h.t); }
    if (!k) return 0.5;
    return clamp(0.25 + 0.35 * (lo / k), 0.2, 0.8);
  }
  // 이번에 쥘 후보 시간: 포기 · 0.1초 · 남들 최댓값 분포의 몇몇 지점 바로 위 · 다 걸기
  function candsOf(V, me, worlds, r) {
    const b = V.bank[me], out = new Set([0]);
    if (b <= 0) return [0];
    out.add(1);
    const mx = worlds.map(W => { let t = 0; for (let j = 0; j < V.n; j++) if (j !== me) t = Math.max(t, Math.min(W.bank[j], bidOf(W, j, r))); return t; }).sort((a, b) => a - b);
    for (const q of [0.3, 0.45, 0.6, 0.7, 0.8, 0.88, 0.94]) out.add(mx[Math.min(mx.length - 1, Math.floor(q * mx.length))] + 1);
    if (V.R - V.round < 3) out.add(b);
    return [...out].map(d => Math.min(d, b)).filter((d, i, a) => a.indexOf(d) === i).sort((x, y) => x - y);
  }
  // 같은 씨앗으로 후보마다 굴려 봄 (반씩 걸러 냄) → [{ d, v, win, k }] (좋은 순)
  function mcScore(V, me, cands, B, r) {
    const wE = mixOf(V), M = Math.max(16, Math.round(B / 4)), seeds = [];
    for (let k = 0; k < M; k++) seeds.push((r() * 4294967296) >>> 0);
    const worlds = seeds.map(sd => sampleWorld(V, me, mul(sd), wE));
    let list = cands.map(d => ({ d, a: { t: "bid", d }, sum: 0, win: 0, k: 0 }));
    let per = Math.max(4, Math.round(B / Math.max(1, list.length))), from = 0;
    while (true) {
      for (const c of list) for (let k = from; k < from + per; k++) { const o = rollout(worlds[k % M], me, c.d, mul(seeds[k % M] ^ (k * 2654435761))); c.sum += o.u; c.win += o.win0; c.k++; }
      from += per;
      list.forEach(c => { c.v = c.sum / c.k; });
      list.sort((a, b) => b.v - a.v || a.d - b.d);
      if (list.length <= 2 || from >= B) break;
      list = list.slice(0, Math.ceil(list.length / 2)); per *= 2;
    }
    return list.map(c => ({ d: c.d, a: c.a, v: c.v, win: c.win / c.k, k: c.k }));
  }
  const ENV = k => (typeof process !== "undefined" && process.env && process.env[k]) || "";
  const TIER = { hard: { B: +ENV("TA_B") || 800 }, coach: { B: 900 } };
  function decide(V, me, tier, r) {
    if (!V || V.phase !== "bid" || !V.needs.includes(me)) return null;
    const T = TIER[tier] || TIER.hard, wE = mixOf(V);
    const worlds = []; for (let k = 0; k < 160; k++) worlds.push(sampleWorld(V, me, r, wE));
    const cands = candsOf(V, me, worlds, r);
    if (cands.length === 1) return { a: { t: "bid", d: cands[0] }, list: [{ d: cands[0], a: { t: "bid", d: cands[0] }, v: 0, win: 0, k: 0 }] };
    const list = mcScore(V, me, cands, T.B, r);
    return { a: list[0].a, list };
  }
  function ai(V, me, tier, r) {
    if (!V || !V.needs || !V.needs.includes(me) || V.phase !== "bid") return null;
    const S = { n: V.n, R: V.R, round: V.round, bank: V.bank.map(b => (b == null ? BANK : b)), marks: V.marks, price: V.price };
    if (tier === "easy") return { t: "bid", d: easyBid(S, me, r) };
    if (tier === "normal") return { t: "bid", d: heurBid(S, me, r, NZ.normal) };
    const d = decide(V, me, "hard", r);
    return d ? d.a : { t: "bid", d: 0 };
  }
  // 복기 · 선생님: 두 행동을 같은 씨앗으로 견줌 → { my, best: { d, v, win } }
  function judge(V, me, a, b, r) {
    if (!a || !b) return null;
    const ds = a.d === b.d ? [a.d] : [a.d, b.d];
    const list = mcScore(V, me, ds, ds.length === 1 ? 300 : 800, r || mul(V.round * 7919 + me));
    const f = d => list.find(x => x.d === d);
    return { my: f(a.d), best: f(b.d) };
  }
  // 이번 경매에서 남들 가운데 가장 오래 쥘 시간의 분포 (짐작) → 정렬된 표본 · 아무도 안 쥘 확률
  function market(V, me, r, K) {
    const wE = mixOf(V), mx = [];
    for (let k = 0; k < (K || 300); k++) {
      const W = sampleWorld(V, me, r, wE); let t = 0;
      for (let j = 0; j < V.n; j++) if (j !== me) t = Math.max(t, Math.min(W.bank[j], bidOf(W, j, r)));
      mx.push(t);
    }
    mx.sort((a, b) => a - b);
    return { mx, none: mx.filter(x => x === 0).length / mx.length, pWin: d => (d <= 0 ? 0 : mx.filter(x => x < d).length / mx.length) };
  }
  // 남은 시간 짐작 (낙찰로 쓴 시간만 확실, 나머지는 굴려 본 평균)
  function guessBanks(V, me, r, K) {
    const wE = mixOf(V), sum = Array(V.n).fill(0); K = K || 120;
    for (let k = 0; k < K; k++) { const W = sampleWorld(V, me, r, wE); for (let j = 0; j < V.n; j++) sum[j] += W.bank[j]; }
    return sum.map(x => Math.round(x / K));
  }

  return {
    id: "timeauction", BANK, R, CD, P0, fmt,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, topOf,
    priceOf, stepPrice, easyBid, heurBid, sampleWorld, rollout, mixOf, candsOf, mcScore, decide, judge, market, guessBanks, TIER,
  };
});

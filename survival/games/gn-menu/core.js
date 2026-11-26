/* 베니 서바이벌 · 오늘의 메뉴 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 그랜드 파이널 3화 메인 매치 — 11명, 4라운드
   · 짜장면 · 짬뽕 · 볶음밥 중 하나를 카드박스에 몰래 넣고, '나와 같은 메뉴를 고른 사람이 나 포함 몇 명일지' 예측 칸(5칸)에 박스를 올려요
   · 모두 올린 뒤 예측 변경 1분: 다른 사람의 예측을 보고 박스를 옮길 수 있어요 (메뉴 카드는 못 바꿈)
   · 모든 박스를 열어서 예측이 맞은 사람만 승점 — 1명 5 · 2~3명 3 · 4~6명 2 · 7~10명 1 · 11명(전원) 4
   · 4라운드 합계 승점 1위 우승 · 최하위 탈락후보 · 전원 승점이 같으면 승점을 지우고 1라운드부터 다시
   우리 판 다듬기: 3~11명 (빈 자리는 AI) · 예측 칸은 인원 비율로 줄여요(11명이면 방송 그대로) · 정보 교환 · 담합(대화)이 없어요 ·
   예측 변경은 동시에 한 번 (방송은 1분 동안 계속 옮길 수 있음) · 다시 시작은 최대 2번까지, 그래도 같으면 무승부 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-menu"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const jo = (w, a, b) => { const s = String(w), k = s.charCodeAt(s.length - 1); return s + (k >= 0xAC00 && k <= 0xD7A3 && (k - 0xAC00) % 28 !== 0 ? a : b); };   // 받침 맞춰 조사 (이/가 · 을/를 · 이라고/라고)
  const ro = w => { const s = String(w), k = s.charCodeAt(s.length - 1), t = (k - 0xAC00) % 28; return s + (k >= 0xAC00 && k <= 0xD7A3 && t !== 0 && t !== 8 ? "으로" : "로"); };   // (으)로: 받침 없거나 ㄹ 이면 '로'

  const MENUS = [{ n: "짜장면", e: "🍜" }, { n: "짬뽕", e: "🌶️" }, { n: "볶음밥", e: "🍚" }], ROUNDS = 4, MAXRESET = 2;
  const PTS = [5, 3, 2, 1, 4];   // 1명 · 2~3명 · 4~6명 · 7~10명 · 전원
  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  void rnd;
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 40) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 예측 칸: 11명이면 1 | 2~3 | 4~6 | 7~10 | 11. 적은 인원은 비율로 줄이고, 빈 칸은 없애요
  function bands(n) {
    const b1 = Math.min(n - 1, Math.max(2, Math.round(3 * n / 11))), b2 = Math.min(n - 1, Math.max(b1, Math.round(6 * n / 11)));
    const raw = [[1, 1, 0], [2, b1, 1], [b1 + 1, b2, 2], [b2 + 1, n - 1, 3], [n, n, 4]], out = [];
    for (const [lo, hi, r] of raw) if (lo <= hi) out.push({ lo, hi, pts: PTS[r], role: r });
    return out;
  }
  const bandOf = (B, k) => B.findIndex(b => k >= b.lo && k <= b.hi);
  const bandLabel = (B, i) => { const b = B[i]; return b.lo === b.hi ? (b.lo === B[B.length - 1].hi && b.role === 4 ? `${b.lo}명 전원` : `${b.lo}명`) : `${b.lo}~${b.hi}명`; };

  function init({ n, seed, cfg }) {
    n = Math.max(3, Math.min(11, n | 0 || 11));
    const c = cfg || {}, st = { n, rs: (seed >>> 0) || 1, cfg: c, rounds: c.rounds || ROUNDS, B: bands(n), round: 0, phase: "pick", pick: Array(n).fill(null), adj: Array(n).fill(null), pts: Array(n).fill(0), hist: [], resets: 0, over: false, ranks: null, draw: false, score: Array(n).fill(0), log: [], seq: 0 };
    push(st, { k: "start" });
    return st;
  }
  function needs(st) {
    if (st.over) return [];
    const arr = st.phase === "pick" ? st.pick : st.adj;
    return [...Array(st.n).keys()].filter(i => !arr[i]);
  }
  function resolve(st) {
    const n = st.n, B = st.B, menus = st.pick.map(p => p.m), cnt = [0, 0, 0];
    menus.forEach(m => cnt[m]++);
    const size = menus.map(m => cnt[m]), p1 = st.pick.map(p => p.b), p2 = st.adj.map(a => a.b);
    const gain = p2.map((b, i) => (bandOf(B, size[i]) === b ? B[b].pts : 0));
    gain.forEach((g, i) => { st.pts[i] += g; });
    st.hist.push({ r: st.round, series: st.resets, menus, size, p1, p2, gain, cnt });
    push(st, { k: "round", r: st.round });
    st.round++; st.pick = Array(n).fill(null); st.adj = Array(n).fill(null); st.phase = "pick";
    if (st.round >= st.rounds) {
      const mx = Math.max(...st.pts), mn = Math.min(...st.pts);
      if (mx === mn) {
        if (st.resets < MAXRESET) { st.resets++; st.pts = Array(n).fill(0); st.round = 0; push(st, { k: "reset", n: st.resets }); }
        else { st.over = true; st.draw = true; }
      } else st.over = true;
      if (st.over) {
        st.ranks = st.draw ? Array(n).fill(0) : st.pts.map(x => st.pts.filter(y => y > x).length);
        st.score = st.pts.slice(); st.phase = "over";
        const lo = Math.min(...st.pts);
        st.losers = st.draw ? [] : st.pts.map((x, i) => (x === lo ? i : -1)).filter(i => i >= 0);
        push(st, { k: "end" });
      }
    }
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a) return { ok: false, err: "행동을 골라요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.phase === "pick") {
      if (a.t !== "pick") return { ok: false, err: "메뉴를 고르고 예측 칸을 정해요" };
      if (st.pick[seat]) return { ok: false, err: "이미 올렸어요 — 다른 사람을 기다려요" };
      if (!Number.isInteger(a.m) || a.m < 0 || a.m > 2) return { ok: false, err: "메뉴를 골라요" };
      if (!Number.isInteger(a.b) || a.b < 0 || a.b >= st.B.length) return { ok: false, err: "예측 칸을 골라요" };
      st.pick[seat] = { m: a.m, b: a.b };
      if (!needs(st).length) { st.phase = "adjust"; push(st, { k: "boxes" }); }
      return { ok: true };
    }
    if (a.t !== "adj") return { ok: false, err: "예측을 바꾸거나 그대로 둬요" };
    if (st.adj[seat]) return { ok: false, err: "이미 정했어요 — 다른 사람을 기다려요" };
    if (!Number.isInteger(a.b) || a.b < 0 || a.b >= st.B.length) return { ok: false, err: "예측 칸을 골라요" };
    st.adj[seat] = { b: a.b };
    if (!needs(st).length) resolve(st);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  function legal(st, seat) {
    if (st.over) return [];
    if (st.phase === "pick") return !st.pick[seat] ? [{ t: "pick", m: 0, b: Math.min(2, st.B.length - 1) }] : [];
    return !st.adj[seat] ? [{ t: "adj", b: st.pick[seat].b }] : [];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  function viewRaw(st, seat) {
    const all = seat === "all" || (typeof seat === "number" && seat < 0), me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const adjusting = st.phase === "adjust";
    // 박스를 올린 자리 (메뉴는 비공개) — 변경 단계에서는 모두의 첫 예측 칸이 공개 (그 칸에 올려진 박스)
    const boxes = adjusting || st.over ? st.pick.map(p => (p ? p.b : null)) : null;
    const hist = st.hist.map(h => ({ r: h.r, series: h.series, menus: h.menus.slice(), size: h.size.slice(), p1: h.p1.slice(), p2: h.p2.slice(), gain: h.gain.slice(), cnt: h.cnt.slice() }));
    const pub = { r: st.round, ph: st.phase, bx: adjusting ? boxes : null, h: st.hist.map(h => [h.menus, h.p1, h.p2]), sub: needs(st), ov: st.over, rs: st.resets };
    const v = {
      n: st.n, seat, round: st.round, rounds: st.rounds, phase: st.phase, B: st.B.map(b => Object.assign({}, b)), resets: st.resets,
      myMenu: me >= 0 && st.pick[me] ? st.pick[me].m : -1, myBox: me >= 0 && st.pick[me] ? st.pick[me].b : -1, myAdj: me >= 0 && st.adj[me] ? st.adj[me].b : -1,
      boxes: all && !st.over && !adjusting ? null : boxes, hist, pts: st.pts.slice(), done: st.phase === "pick" ? st.pick.map(p => !!p) : st.adj.map(a => !!a),
      needs: needs(st), over: st.over, draw: !!st.draw, ranks: st.over ? st.ranks.slice() : null, losers: st.over ? st.losers.slice() : [], score: st.over ? st.score.slice() : Array(st.n).fill(0),
      log: st.log.slice(-30), pub: hash(JSON.stringify(pub)),
    };
    if (seat === "all") { v.curMenus = st.pick.map(p => (p ? p.m : -1)); v.curAdj = st.adj.map(a => (a ? a.b : -1)); }
    return v;
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 지난 라운드에서 드러난 다른 사람들의 메뉴 비율 (라플라스 평활)
  function menuShare(V, me) {
    const c = [3, 3, 3]; let t = 9;
    for (const h of V.hist) h.menus.forEach((m, i) => { if (i === me) return; c[m]++; t++; });
    return c.map(x => x / t);
  }
  // 나 말고 n-1명이 각자 p 확률로 같은 메뉴를 고를 때, 내 모임 크기(나 포함)의 확률 분포
  function sizeDist(n, p) {
    let d = [1];
    for (let i = 0; i < n - 1; i++) { const nd = Array(d.length + 1).fill(0); d.forEach((x, k) => { nd[k] += x * (1 - p); nd[k + 1] += x * p; }); d = nd; }
    const out = Array(n + 1).fill(0); d.forEach((x, k) => { out[k + 1] = x; });
    return out;
  }
  const bandProbs = (B, dist) => B.map(b => { let s = 0; for (let k = b.lo; k <= b.hi; k++) s += dist[k] || 0; return s; });
  // 메뉴마다 칸별 기대 승점 (첫 예측 · 정보 없음)
  function pickTable(V, me) {
    const sh = menuShare(V, me);
    return sh.map((p, m) => { const pr = bandProbs(V.B, sizeDist(V.n, p)); return { m, p, pr, ev: pr.map((x, b) => x * V.B[b].pts) }; });
  }
  const argmax = a => a.reduce((bi, x, i) => (x > a[bi] ? i : bi), 0);
  function bestPick(V, me, r) {
    const T = pickTable(V, me);
    const best = Math.max(...T.map(t => Math.max(...t.ev)));
    const cands = T.filter(t => Math.max(...t.ev) >= best * 0.97);
    const t = cands[Math.floor(r() * cands.length) % cands.length];
    return { m: t.m, b: argmax(t.ev), T, tbl: t };
  }
  // 예측 변경 단계: 다른 사람의 첫 예측 칸을 증거로, 내 모임 크기의 분포를 몬테카를로로 어림 (결정적: 시드 난수로 고정 횟수)
  function adjustModel(V, me, r) {
    const n = V.n, B = V.B, sh = menuShare(V, me), S = 240, q = 0.4;
    const w = Array(n + 1).fill(0), mine = V.myMenu;
    for (let s = 0; s < S; s++) {
      const mn = []; for (let j = 0; j < n; j++) { if (j === me) { mn.push(mine); continue; } const u = r(); mn.push(u < sh[0] ? 0 : u < sh[0] + sh[1] ? 1 : 2); }
      const cnt = [0, 0, 0]; mn.forEach(m => cnt[m]++);
      let wt = 1;
      for (let j = 0; j < n; j++) { if (j === me) continue; const hit = bandOf(B, cnt[mn[j]]) === V.boxes[j]; wt *= hit ? q : (1 - q) / Math.max(1, B.length - 1) * 0.5; }
      w[cnt[mine]] += wt;
    }
    const tot = w.reduce((a, b) => a + b, 0) || 1, dist = w.map(x => x / tot), pr = bandProbs(B, dist);
    return { dist, pr, ev: pr.map((x, b) => x * B[b].pts) };
  }
  const TIER_KEEP = { easy: 1, normal: 1 };
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    const B = V.B;
    if (V.phase === "pick") {
      if (tier === "easy") return { t: "pick", m: Math.floor(r() * 3) % 3, b: Math.floor(r() * B.length) % B.length };
      if (tier === "normal") {
        // 모두 고르게 고를 거라 보고 가장 흔한 크기(≈ n/3)가 있는 칸을 노려요
        const k = Math.max(1, Math.round(V.n / 3)); let b = bandOf(B, k); if (b < 0) b = 0;
        if (r() < 0.5) b = Math.floor(r() * B.length) % B.length;   // 반은 흔들려요
        return { t: "pick", m: Math.floor(r() * 3) % 3, b };
      }
      const bp = bestPick(V, me, r); return { t: "pick", m: bp.m, b: bp.b };
    }
    if (TIER_KEEP[tier]) return { t: "adj", b: V.myBox };
    const M = adjustModel(V, me, r), cur = M.ev[V.myBox], bi = argmax(M.ev);
    return { t: "adj", b: M.ev[bi] > cur * 1.12 + 0.05 ? bi : V.myBox };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const pct = x => Math.round(x * 100) + "%";
  const f1 = x => x.toFixed(2).replace(/\.?0+$/, "") || "0";
  function topMenu(V, me) { const sh = menuShare(V, me), i = argmax(sh); return { i, p: sh[i], sh }; }
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`), mn = m => MENUS[m].e + MENUS[m].n;
    const seated = typeof V.seat === "number" && V.seat >= 0 && V.seat === me;
    const B = V.B, bl = i => bandLabel(B, i);
    const lastRound = V.hist.length ? V.hist[V.hist.length - 1] : null;
    if (V.over) {
      const pts = V.score, mx = Math.max(...pts), mnp = Math.min(...pts), first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      let alone = 0, same = 0; for (const h of V.hist) { h.gain.forEach((g, i) => { if (g === 5) alone++; }); if (h.cnt.some(c => c === V.n)) same++; }
      return {
        opp: (V.draw ? "모두 승점이 같아 무승부예요." : `최하위: ${V.losers.map(nm).join(" · ")}`) + ` · 승점 ${pts.map((x, i) => `${nm(i)} ${x}`).join(" / ")}`,
        mine: seated ? `내 승점 ${pts[me]} · ${V.draw ? "무승부" : `${V.ranks[me] + 1}위 (1위와 ${mx - pts[me]}점 · 최하위와 ${pts[me] - mnp}점 차이)`}` : `1위 승점 ${mx} · 최하위 ${mnp}`,
        rec: V.draw ? "무승부" : seated && first.includes(me) ? "이겼어요!" : "아깝네요",
        why: `'혼자 고른 메뉴 + 1명 칸' 성공이 ${alone}번 나왔고, 전원이 같은 메뉴였던 라운드는 ${same}번이었어요. 방송에서도 대부분 중간 크기(4~6명) 칸에서 점수가 났어요.`,
      };
    }
    if (!seated) return { opp: "구경 중이에요 — 같은 메뉴를 고른 사람 수를 맞히면 승점을 받아요.", mine: `${V.round + 1}/${V.rounds} 라운드 · ${V.phase === "pick" ? "메뉴·예측 올리기" : "예측 변경"}`, rec: "자리에 앉으면 내 차례마다 알려 드려요", why: `승점표: ${B.map((b, i) => `${bl(i)} ${b.pts}점`).join(" · ")}` };
    const th = topMenu(V, me), sc = V.pts[me], bestOther = Math.max(...V.pts.filter((_, i) => i !== me));
    const opp = V.hist.length
      ? `지난 ${V.hist.length}번 공개된 메뉴: ${[0, 1, 2].map(m => `${MENUS[m].e} ${pct(th.sh[m])}`).join(" · ")}${lastRound ? ` · 지난 라운드 모임 크기 ${lastRound.cnt.map((c, m) => `${MENUS[m].e}${c}`).join(" ")}` : ""}${V.phase === "adjust" ? ` · 이번 박스: ${B.map((b, i) => `${bl(i)} ${V.boxes.filter(x => x === i).length}개`).join(" ")}` : ""}`
      : V.phase === "adjust" ? `첫 라운드예요 — 이번 박스: ${B.map((b, i) => `${bl(i)} ${V.boxes.filter(x => x === i).length}개`).join(" · ")}` : "첫 라운드예요 — 다들 비슷하게 고르면 한 메뉴에 약 1/3씩 모일 거예요.";
    const mine = `${V.round + 1}/${V.rounds} 라운드${V.resets ? ` (다시 시작 ${V.resets}번째)` : ""} · 내 승점 ${sc}${bestOther > sc ? ` (다른 사람 최고 ${bestOther} — ${bestOther - sc}점 뒤)` : bestOther < sc ? ` (다른 사람 최고 ${bestOther} — ${sc - bestOther}점 앞)` : " (다른 사람 최고와 같음)"}`;
    if (!V.needs.includes(me)) return { opp, mine, rec: "다른 사람을 기다려요", why: "이미 정했어요." };
    if (V.phase === "pick") {
      const bp = bestPick(V, me, sampler(V.round * 31 + me * 7 + V.hist.length + 3)), T = bp.tbl;
      const rows = V.B.map((b, i) => `${bl(i)} ${pct(T.pr[i])}×${b.pts}점=${f1(T.ev[i])}`).join(" / ");
      return { opp, mine, rec: `${mn(bp.m)} · 예측 ${bl(bp.b)}`, why: `${jo(mn(bp.m), "을", "를")} 고르는 사람이 나 말고 ${V.n - 1}명 중 각각 약 ${pct(T.p)}라고 보면, 내 모임 크기별 기대 승점은 ${rows} → ${jo(bl(bp.b), "이", "가")} 가장 커요. 메뉴는 정보가 없어서 비슷한 값끼리 무작위로 골라요 — 다 같은 메뉴만 고르면 모임이 몰려요.` };
    }
    const M = adjustModel(V, me, sampler(V.round * 17 + me * 5 + V.hist.length + 9)), a = ai(V, me, "hard", sampler(V.round * 17 + me * 5 + V.hist.length + 9));
    const rows = B.map((b, i) => `${bl(i)} ${pct(M.pr[i])}×${b.pts}점=${f1(M.ev[i])}`).join(" / ");
    return { opp, mine, rec: a.b === V.myBox ? `${bl(V.myBox)} 그대로 두기` : `${bl(V.myBox)} → ${ro(bl(a.b))} 옮기기`, why: `내 메뉴(${mn(V.myMenu)})와 다른 사람의 박스 위치(그 칸이 맞았을 모임 크기)를 함께 따져 본 내 모임 크기: ${rows} — ${a.b === V.myBox ? "지금 칸이 가장 높거나 옮겨서 얻는 게 뚜렷하지 않아요" : "옮기면 기대 승점이 뚜렷하게 늘어요"}. 다른 사람의 박스는 그 사람이 믿는 모임 크기일 뿐이라 정답은 아니에요.` };
  }
  // 복기용: 받은 view 를 바꾸지 않는 순수 평가
  function evalPick(V, me, mA) { const T = pickTable(V, me); return T[mA.m]; }
  function evalAdjust(V, me, seed) { return adjustModel(V, me, sampler(seed)); }

  // 판 상태(st)의 배열 · 객체를 그대로 넘기지 않게 깊은 복사본으로 (화면 · 다른 코드가 V 를 고쳐도 판이 안 바뀜)
  const view = (st, seat) => JSON.parse(JSON.stringify(viewRaw(st, seat)));

  return { id: "gn-menu", MENUS, ROUNDS, PTS, bands, bandOf, bandLabel, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, menuShare, sizeDist, bandProbs, pickTable, bestPick, adjustModel, evalPick, evalAdjust, sampler, MAXRESET };
});

/* 베니 서바이벌 · 가넷도둑 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 그랜드 파이널 6화 메인 매치 — 8명, 8라운드, 라운드마다 주최 측이 가넷 4개를 걸어요
   · 마피아 · 카르텔 · 경찰 · 거지 중 하나를 비공개로 고르고, 선 플레이어부터 순서대로 '내가 고른 것'을 모두가 듣게 말해요 (거짓말 가능)
   · 마지막에 고른 사람부터 역순으로 정체 공개
   · 마피아 · 카르텔 중 더 많이 고른 조직이 4개를 똑같이 나눔 (남는 가넷은 못 가져감) · 두 조직 수가 같거나 둘 다 0명이면 경찰이 나눔 ·
     나누고 남은 가넷은 거지가 똑같이 나눔 · 그래도 남으면 주최 측이 회수
   · 이번 라운드에 가넷을 한 개도 못 받은 사람이 거짓으로 말했다면 벌칙으로 가넷 1개 반납 (없으면 안 냄)
   · 8라운드 뒤 가넷이 가장 많으면 우승 · 가장 적으면 탈락후보
   우리 판 다듬기: 4~8명 · 선 플레이어는 1번부터 돌아가며(4명이면 두 바퀴) · 시작 가넷은 모두 5개(방송은 4~8개로 달랐음) ·
   3 · 7라운드 가넷 양도(연합 요소)는 뺐어요 · 동점은 공동 순위, 전원 같으면 무승부 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-garnetthief"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const jo = (w, a, b) => { const s = String(w), k = s.charCodeAt(s.length - 1); return s + (k >= 0xAC00 && k <= 0xD7A3 && (k - 0xAC00) % 28 !== 0 ? a : b); };   // 받침 맞춰 조사 (이/가 · 을/를 · 이라고/라고)
  const ro = w => { const s = String(w), k = s.charCodeAt(s.length - 1), t = (k - 0xAC00) % 28; return s + (k >= 0xAC00 && k <= 0xD7A3 && t !== 0 && t !== 8 ? "으로" : "로"); };   // (으)로: 받침 없거나 ㄹ 이면 '로'

  const CHARS = [{ n: "마피아", e: "🔫" }, { n: "카르텔", e: "🧳" }, { n: "경찰", e: "👮" }, { n: "거지", e: "🥣" }], ROUNDS = 8, START = 5, POT = 4;
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 40) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const orderOf = (n, r) => Array.from({ length: n }, (_, k) => (r + k) % n);

  // 캐릭터별 한 명이 받는 가넷 — counts = 캐릭터별 선택 인원
  function payout(counts) {
    const g = [0, 0, 0, 0], [m, c, p, b] = counts; let pool = POT, win = -1;
    if (m !== c) win = m > c ? 0 : 1; else if (p > 0) win = 2;
    if (win >= 0 && counts[win] > 0) { const sh = Math.floor(pool / counts[win]); g[win] = sh; pool -= sh * counts[win]; }
    if (b > 0 && pool > 0) g[3] = Math.floor(pool / b);
    return g;
  }
  function init({ n, seed, cfg }) {
    n = Math.max(4, Math.min(8, n | 0 || 8));
    const c = cfg || {}, st = { n, rs: (seed >>> 0) || 1, cfg: c, rounds: c.rounds || ROUNDS, round: 0, order: orderOf(n, 0), pos: 0, real: Array(n).fill(null), decl: Array(n).fill(null), gar: Array(n).fill(c.start === undefined ? START : c.start), hist: [], over: false, ranks: null, draw: false, score: Array(n).fill(0), log: [], seq: 0 };
    push(st, { k: "start" });
    return st;
  }
  const needs = st => (st.over ? [] : [st.order[st.pos]]);
  function resolve(st) {
    const n = st.n, counts = [0, 0, 0, 0]; st.real.forEach(x => counts[x]++);
    const per = payout(counts), gain = st.real.map(x => per[x]), pen = st.decl.map((d, i) => (gain[i] === 0 && d !== st.real[i] && st.gar[i] > 0 ? 1 : 0));
    const before = st.gar.slice();
    for (let i = 0; i < n; i++) st.gar[i] += gain[i] - pen[i];
    const m = counts[0], c = counts[1], win = m !== c ? (m > c ? 0 : 1) : counts[2] > 0 ? 2 : -1;
    st.hist.push({ r: st.round, leader: st.order[0], order: st.order.slice(), real: st.real.slice(), decl: st.decl.slice(), gain, pen, counts, win, before, after: st.gar.slice(), liars: st.decl.map((d, i) => (d !== st.real[i] ? i : -1)).filter(i => i >= 0) });
    push(st, { k: "round", r: st.round });
    st.round++; st.real = Array(n).fill(null); st.decl = Array(n).fill(null); st.pos = 0; st.order = orderOf(n, st.round);
    if (st.round >= st.rounds) {
      st.over = true;
      const mx = Math.max(...st.gar), mn = Math.min(...st.gar);
      st.draw = mx === mn; st.ranks = st.draw ? Array(n).fill(0) : st.gar.map(x => st.gar.filter(y => y > x).length);
      st.score = st.gar.slice(); st.losers = st.draw ? [] : st.gar.map((x, i) => (x === mn ? i : -1)).filter(i => i >= 0);
      push(st, { k: "end" });
    }
  }
  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a || a.t !== "pick") return { ok: false, err: "캐릭터를 고르고 말해요" };
    if (!Number.isInteger(seat) || seat < 0 || seat >= st.n) return { ok: false, err: "자리가 없어요" };
    if (st.order[st.pos] !== seat) return { ok: false, err: "내 차례가 아니에요" };
    const d = a.d === undefined || a.d === null ? a.c : a.d;
    if (!Number.isInteger(a.c) || a.c < 0 || a.c > 3 || !Number.isInteger(d) || d < 0 || d > 3) return { ok: false, err: "캐릭터를 골라요" };
    st.real[seat] = a.c; st.decl[seat] = d; st.pos++;
    push(st, { k: "say", s: seat, d });
    if (st.pos >= st.n) resolve(st);
    return { ok: true };
  }
  const auto = () => null, advance = () => {}, over = st => !!st.over;
  const ranks = st => (st.ranks ? st.ranks.slice() : null);
  const legal = (st, seat) => (st.over || st.order[st.pos] !== seat ? [] : [{ t: "pick", c: 3, d: 3 }]);

  // ── 보이는 것 ─────────────────────────────────────────────
  function viewRaw(st, seat) {
    const everything = seat === "all", me = typeof seat === "number" && seat >= 0 ? seat : -1;
    const hist = st.hist.map(h => ({ r: h.r, leader: h.leader, order: h.order.slice(), real: h.real.slice(), decl: h.decl.slice(), gain: h.gain.slice(), pen: h.pen.slice(), counts: h.counts.slice(), win: h.win, before: h.before.slice(), after: h.after.slice(), liars: h.liars.slice() }));
    const pub = { r: st.round, pos: st.pos, d: st.decl, g: st.gar, h: st.hist.map(h => [h.real, h.decl]), ov: st.over };
    const v = {
      n: st.n, seat, round: st.round, rounds: st.rounds, order: st.order.slice(), pos: st.pos, decl: st.decl.slice(), gar: st.gar.slice(),
      myReal: me >= 0 ? st.real[me] : null, hist, needs: needs(st), over: st.over, draw: !!st.draw,
      ranks: st.over ? st.ranks.slice() : null, losers: st.over ? st.losers.slice() : [], score: st.over ? st.score.slice() : Array(st.n).fill(0), log: st.log.slice(-30), pub: hash(JSON.stringify(pub)),
    };
    if (everything) v.curReal = st.real.slice();
    return v;
  }

  // ── AI (내가 보는 것만) ─────────────────────────────────────
  function sampler(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 공개된 지난 라운드에서 본 각 자리의 정직도 · 고르는 비율
  function profile(V, me) {
    const n = V.n, t = Array(n).fill(0), T = Array(n).fill(0), f = Array.from({ length: n }, () => [1.5, 1.5, 1.5, 1.5]);
    for (const h of V.hist) for (let j = 0; j < n; j++) { T[j]++; if (h.decl[j] === h.real[j]) t[j]++; f[j][h.real[j]]++; }
    return { honest: t.map((x, j) => (x + 1.2) / (T[j] + 2)), lies: T.map((x, j) => T[j] - t[j]), seen: T, freq: f.map(a => { const s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); }) };
  }
  // 말한 것을 모두 믿는다고 보고, 내가 캐릭터 x 를 고르면 받을 가넷이 가장 큰 x
  function bestResponse(K) { let bx = 0, bg = -1; for (let x = 0; x < 4; x++) { const c = K.slice(); c[x]++; const g = payout(c)[x]; if (g > bg) { bg = g; bx = x; } } return bx; }
  const WBR = 0.35;   // 늦게 고르는 사람이 앞의 말을 따라 최선을 고를 가능성 어림
  function drawFrom(dist, u) { let s = 0; for (let k = 0; k < 4; k++) { s += dist[k]; if (u < s) return k; } return 3; }
  // 내가 (진짜 c, 말 d) 를 고를 때의 기대 가넷 (벌칙 포함) — 4×4 표
  function evTable(V, me, r, S) {
    S = S || 120;
    const n = V.n, P = profile(V, me), mypos = V.order.indexOf(me), before = V.order.slice(0, mypos), after = V.order.slice(mypos + 1);
    const ev = Array.from({ length: 4 }, () => Array(4).fill(0));
    const U = []; for (let s = 0; s < S; s++) { const row = []; for (let k = 0; k < n; k++) row.push([r(), r()]); U.push(row); }
    for (let d = 0; d < 4; d++) {
      // 말해진 것(앞사람 + 나)을 센 값으로 뒤 사람의 반응을 어림
      const K = [0, 0, 0, 0]; before.forEach(j => K[V.decl[j]]++); K[d]++;
      const br = bestResponse(K);
      for (let s = 0; s < S; s++) {
        const base = [0, 0, 0, 0];
        for (const j of before) { const dj = V.decl[j]; const x = U[s][j][0] < P.honest[j] ? dj : [0, 1, 2, 3].filter(y => y !== dj)[Math.floor(U[s][j][1] * 3) % 3]; base[x]++; }
        for (const j of after) {
          const f = P.freq[j], dist = f.map((p, k) => (1 - WBR) * p + (k === br ? WBR : 0));
          base[drawFrom(dist, U[s][j][0])]++;
        }
        for (let c = 0; c < 4; c++) {
          const cnt = base.slice(); cnt[c]++; const g = payout(cnt)[c];
          ev[c][d] += g - (g === 0 && d !== c && V.gar[me] > 0 ? 1 : 0);
        }
      }
    }
    for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) ev[c][d] /= S;
    return { ev, P, before, after };
  }
  function ai(V, me, tier, r) {
    if (!V.needs.includes(me)) return null;
    if (tier === "easy") { const c = Math.floor(r() * 4) % 4; return { t: "pick", c, d: r() < 0.6 ? c : Math.floor(r() * 4) % 4 }; }
    const mypos = V.order.indexOf(me), K = [0, 0, 0, 0]; V.order.slice(0, mypos).forEach(j => K[V.decl[j]]++);
    if (tier === "normal") { let c = bestResponse(K); if (r() < 0.25) c = Math.floor(r() * 4) % 4; return { t: "pick", c, d: c }; }
    const T = evTable(V, me, r, 120); let bc = 0, bd = 0, be = -9;
    for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) { const e = T.ev[c][d] + (d === c ? 0.001 : 0) + r() * 0.0005; if (e > be) { be = e; bc = c; bd = d; } }
    return { t: "pick", c: bc, d: bd };
  }

  // ── AI 선생님 (보이는 것만) ─────────────────────────────────
  const f2 = x => (Math.abs(x) < 0.005 ? "0" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(/0$/, ""));
  const cn = c => CHARS[c].e + CHARS[c].n;
  function coach(V, me, since, names) {
    const nm = i => (i === me ? "나" : (names && names[i]) || `${i + 1}번`);
    const seated = typeof V.seat === "number" && V.seat >= 0 && V.seat === me;
    if (V.over) {
      const g = V.score, mx = Math.max(...g), mn = Math.min(...g), first = V.ranks.map((x, i) => (x === 0 ? i : -1)).filter(i => i >= 0);
      let liePen = 0, lieAll = 0; for (const h of V.hist) { lieAll += h.liars.length; liePen += h.pen.reduce((a, b) => a + b, 0); }
      return {
        opp: (V.draw ? "모두 가넷이 같아 무승부예요." : `최하위: ${V.losers.map(nm).join(" · ")}`) + ` · 가넷 ${g.map((x, i) => `${nm(i)} ${x}`).join(" / ")}`,
        mine: seated ? `내 가넷 ${g[me]} · ${V.draw ? "무승부" : `${V.ranks[me] + 1}위 (1위와 ${mx - g[me]}개 · 최하위와 ${g[me] - mn}개 차이)`}` : `1위 ${mx}개 · 최하위 ${mn}개`,
        rec: V.draw ? "무승부" : seated && first.includes(me) ? "이겼어요!" : "아깝네요",
        why: `${V.rounds}라운드 동안 거짓 선언이 ${lieAll}번 나왔고 그중 ${liePen}번은 가넷을 못 받아 벌칙으로 1개씩 냈어요. 거짓말은 가넷을 못 받을 때만 값을 치러요.`,
      };
    }
    const lead = V.order[0], said = V.order.slice(0, V.pos).map(j => `${nm(j)} ${cn(V.decl[j])}`);
    if (!seated) return { opp: `${V.round + 1}라운드 선은 ${nm(lead)} · 말한 순서: ${said.join(" → ") || "아직 없음"}`, mine: "구경 중", rec: "자리에 앉으면 내 차례마다 알려 드려요", why: "마피아 · 카르텔 중 더 많이 고른 쪽이 가넷 4개를 나눠요. 같으면 경찰, 남으면 거지." };
    const P = profile(V, me), liars = P.lies.map((x, i) => (x > 0 && i !== me ? `${nm(i)} ${x}/${P.seen[i]}번` : null)).filter(Boolean);
    const opp = `${V.round + 1}라운드 선은 ${nm(lead)} · 지금까지 말한 것: ${said.join(" → ") || "내가 첫 번째예요"}${V.hist.length ? ` · 지난 거짓 선언(거짓/본 횟수): ${liars.length ? liars.join(" · ") : "아직 없음"}` : ""}`;
    const sorted = V.gar.map((x, i) => [x, i]).filter(x => x[1] !== me).sort((a, b) => b[0] - a[0]), top = sorted[0];
    const mine = `${V.round + 1}/${V.rounds} 라운드 · 내 가넷 ${V.gar[me]}${top ? ` (다른 사람 최고 ${top[0]} — ${top[0] > V.gar[me] ? `${top[0] - V.gar[me]}개 앞섬` : top[0] < V.gar[me] ? `${V.gar[me] - top[0]}개 뒤` : "같음"})` : ""} · 내 순서 ${V.order.indexOf(me) + 1}/${V.n}`;
    if (!V.needs.includes(me)) return { opp, mine, rec: "다른 사람 차례예요", why: "기다려요." };
    const sd = V.round * 131 + V.pos * 17 + me * 7 + V.hist.length * 3 + 5, a = ai(V, me, "hard", sampler(sd)), T = evTable(V, me, sampler(sd), 120), best = T.ev[a.c][a.d];
    const alt = [0, 1, 2, 3].map(c => `${cn(c)} 진실 ${f2(T.ev[c][c])}`).join(" / ");
    const trust = T.before.length ? `앞의 ${T.before.length}명이 한 말은 사람마다 정직도(과거 기록, 처음엔 약 60%)만큼 믿어요 · ` : "내가 첫 번째라 믿을 말이 없어요 · ";
    return {
      opp, mine, rec: a.d === a.c ? `${cn(a.c)} 선택 · 사실대로 말하기` : `${cn(a.c)} 선택 · ${CHARS[a.d].e}${jo(CHARS[a.d].n, "이라고", "라고")} 말하기`,
      why: `${trust}뒤 ${T.after.length}명은 내 말과 앞의 말을 보고 따라 고를 수 있다고 어림했어요. 내가 받을 가넷 기대값: ${alt} → 고른 수 ${f2(best)}. 거짓말은 이번에 가넷을 못 받을 때만 벌칙 1개라 ${a.d === a.c ? "사실대로 말해도 손해가 없어요" : "뒤 사람을 속여서 얻는 몫이 벌칙 위험보다 커요"}.`,
    };
  }
  function evalMove(V, me, seed) { return evTable(V, me, sampler(seed), 120); }

  // 판 상태(st)의 배열 · 객체를 그대로 넘기지 않게 깊은 복사본으로 (화면 · 다른 코드가 V 를 고쳐도 판이 안 바뀜)
  const view = (st, seat) => JSON.parse(JSON.stringify(viewRaw(st, seat)));

  return { id: "gn-garnetthief", CHARS, ROUNDS, START, POT, payout, orderOf, init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach, profile, bestResponse, evTable, evalMove, sampler };
});

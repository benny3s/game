/* 베니 서바이벌 · 그라데이션 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜: 데드 어게인 6일차 감옥 매치 '그라데이션' (나무위키 '룰' 절 기준)
   · 3명. 사람마다 숫자 큐브 20개(0~9 가 각 2개)와 큐브 통 7개(왼쪽 → 오른쪽 어두운 색 → 밝은 색 = 큰 수 쪽).
   · 1:1 대결 한 번 = 7라운드. 대결 시작 때 두 사람이 큐브 7개를 골라 통에 비공개로 넣음 (통마다 1개 · 합계 30 이하 · 왼쪽에서 오른쪽으로 갈수록 커짐).
   · 라운드: 선 플레이어가 통 1개를 냄 → (통의 색 = 자리는 상대가 봄, 큐브 숫자는 안 보임) 상대도 통 1개 → 숫자 공개, 큰 쪽이 1점, 같으면 무승부(점수 변동 없음)
     직전 라운드 승자가 선, 무승부면 선 그대로. 7라운드에 통을 한 번씩 다 씀.
   · 7라운드 뒤 점수가 더 높은 쪽이 그 대결의 승자. 같으면 재대결(큐브를 다시 넣음).
   · 대결에서 이긴 사람은 쉬고 있던 한 명과 다시 대결하고, 직전 대결 승자가 다음 대결 첫 라운드의 선.
     2연승(연속 두 대결 승리)한 사람이 결승 진출 = 1등, 나머지 두 명은 탈락.
   확인 못 한 점(우리가 정함): ① 오름차순은 같은 수가 이어져도 됨(큐브가 2개씩이라) ② 처음 대결 두 사람과 첫 선은 무작위 ③ 재대결은 새로 큐브를 넣음
     ④ 등수는 1등 한 명 + 나머지 둘 공동 2등 ⑤ 대결이 아주 길어지면 12번째 대결에서 끝내고 대결 승수 → 득점 순으로 가림 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).gradation = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SLOTS = 7, MAXSUM = 30, MAXMATCH = 12;
  const SUMV = a => a.reduce((x, y) => x + y, 0);

  function rnd(st) {
    const a = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // 큐브 7개가 규칙에 맞는지 (0~9 각 2개까지 · 합 30 이하) → 오류 글 또는 null
  function checkSetup(v) {
    if (!Array.isArray(v) || v.length !== SLOTS) return "큐브 7개를 골라요";
    const cnt = Array(10).fill(0);
    for (const x of v) { if (!Number.isInteger(x) || x < 0 || x > 9) return "0~9 큐브만 있어요"; if (++cnt[x] > 2) return `${x} 큐브는 2개뿐이에요`; }
    if (SUMV(v) > MAXSUM) return `합이 ${MAXSUM}을 넘으면 안 돼요 (지금 ${SUMV(v)})`;
    return null;
  }
  const sorted = v => v.slice().sort((a, b) => a - b);

  function init({ n, seed }) {
    const st = { n: 3, rs: (seed >>> 0) || 1, log: [], seq: 0, over: false, final: null, matchNo: 0, streak: -1, wins: [0, 0, 0], total: [0, 0, 0], hist: [], arr: [null, null, null] };
    const sit = Math.floor(rnd(st) * 3);
    st.sit = sit; st.duel = [0, 1, 2].filter(i => i !== sit);
    st.lead = st.duel[Math.floor(rnd(st) * 2)];
    startMatch(st);
    return st;
  }
  function startMatch(st) {
    st.matchNo++;
    st.phase = "setup"; st.arr = [null, null, null];
    st.used = [Array(SLOTS).fill(false), Array(SLOTS).fill(false), Array(SLOTS).fill(false)];
    st.rev = [Array(SLOTS).fill(null), Array(SLOTS).fill(null), Array(SLOTS).fill(null)];
    st.pts = [0, 0, 0]; st.round = 0; st.sub = [-1, -1, -1]; st.res = null; st.mres = null;
    push(st, { k: "match", m: st.matchNo, a: st.duel[0], b: st.duel[1], sit: st.sit });
  }
  const other = (st, s) => (st.duel[0] === s ? st.duel[1] : st.duel[0]);
  function needs(st) {
    if (st.over) return [];
    if (st.phase === "setup") return st.duel.filter(i => !st.arr[i]);
    if (st.phase === "play") { const L = st.lead, F = other(st, L); return st.sub[L] < 0 ? [L] : st.sub[F] < 0 ? [F] : []; }
    return [];
  }
  function apply(st, seat, a) {
    if (!a || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "setup") {
      if (a.t !== "setup") return { ok: false, err: "큐브를 넣어 주세요" };
      const err = checkSetup(a.v); if (err) return { ok: false, err };
      st.arr[seat] = sorted(a.v);
      push(st, { k: "setup", s: seat });
      if (st.duel.every(i => st.arr[i])) { st.phase = "play"; st.round = 1; push(st, { k: "round", r: 1, lead: st.lead }); }
      return { ok: true };
    }
    if (st.phase === "play") {
      if (a.t !== "play" || !Number.isInteger(a.k) || a.k < 0 || a.k >= SLOTS) return { ok: false, err: "통을 골라요" };
      if (st.used[seat][a.k]) return { ok: false, err: "이미 쓴 통이에요" };
      st.sub[seat] = a.k;
      push(st, { k: "play", s: seat, pos: a.k, lead: seat === st.lead });
      if (!needs(st).length) reveal(st);
      return { ok: true };
    }
    return { ok: false, err: "지금은 기다리는 중이에요" };
  }
  function reveal(st) {
    const L = st.lead, F = other(st, L);
    const pl = st.sub[L], pf = st.sub[F], vl = st.arr[L][pl], vf = st.arr[F][pf];
    st.used[L][pl] = true; st.used[F][pf] = true; st.rev[L][pl] = vl; st.rev[F][pf] = vf;
    let w = -1;
    if (vl > vf) w = L; else if (vf > vl) w = F;
    if (w >= 0) { st.pts[w]++; st.total[w]++; }
    st.res = { r: st.round, lead: L, foll: F, pl, pf, vl, vf, win: w };
    push(st, { k: "res", r: st.round, win: w, vl, vf, lead: L });
    st.phase = "show";
  }
  const auto = st => (st.phase === "show" ? 2600 : st.phase === "mshow" ? 3600 : null);
  function advance(st) {
    if (st.phase === "show") {
      const w = st.res.win;
      if (w >= 0) st.lead = w;
      if (st.round >= SLOTS) { endMatch(st); return; }
      st.round++; st.sub = [-1, -1, -1]; st.phase = "play"; st.res = null;
      push(st, { k: "round", r: st.round, lead: st.lead });
    } else if (st.phase === "mshow") {
      const m = st.mres;
      if (m.over) { finish(st); return; }
      if (m.rematch) { startMatch(st); return; }
      st.duel = [m.winner, st.sit]; st.sit = m.loser; st.lead = m.winner; st.streak = m.winner;
      startMatch(st);
    }
  }
  function endMatch(st) {
    const [a, b] = st.duel, d = st.pts[a] - st.pts[b];
    const rec = { m: st.matchNo, a, b, pa: st.pts[a], pb: st.pts[b], winner: -1, loser: -1, rematch: false, over: false };
    if (d === 0) rec.rematch = true;
    else { rec.winner = d > 0 ? a : b; rec.loser = d > 0 ? b : a; st.wins[rec.winner]++; }
    if (rec.winner >= 0 && rec.winner === st.streak) rec.over = true;     // 연속 두 대결 승리
    if (!rec.over && st.matchNo >= MAXMATCH) {                              // 너무 길어지면 대결 승수 → 득점 → 자리 순으로 1등을 가림 (쉬는 사람도 후보)
      const sc = i => st.wins[i] * 1000 + st.total[i], best = [0, 1, 2].reduce((x, y) => (sc(y) > sc(x) ? y : x), 0);
      rec.over = true; rec.forced = true; rec.rematch = false; rec.winner = best; rec.loser = rec.loser >= 0 && rec.loser !== best ? rec.loser : (best === a ? b : a);
    }
    st.hist.push(rec); st.mres = rec; st.phase = "mshow";
    push(st, { k: "mres", m: rec.m, w: rec.winner, over: rec.over, rematch: rec.rematch });
  }
  function finish(st) {
    let w = st.mres.winner;
    if (st.matchNo >= MAXMATCH && w < 0) w = 0;
    st.final = { winner: w, ranks: [0, 1, 2].map(i => (i === w ? 0 : 1)) };
    st.over = true; st.phase = "end"; push(st, { k: "end", w });
  }
  const over = st => !!st.over;
  const ranks = st => (st.final ? st.final.ranks.slice() : [0, 0, 0]);
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "setup") return [{ t: "setup", v: defaultSetup() }];
    const L = []; for (let k = 0; k < SLOTS; k++) if (!st.used[seat][k]) L.push({ t: "play", k });
    return L;
  }
  const defaultSetup = () => [0, 1, 2, 3, 4, 5, 9];

  // ── 보이는 것 ───────────────────────────────────────────────
  function view(st, seat) {
    const all = seat === "all", me = all ? -1 : seat;
    const lead = st.lead, F = other(st, lead);
    const playing = st.phase === "play" || st.phase === "show";
    const sub = st.sub.map((p, i) => (i === lead && p >= 0 ? p : (st.phase === "show" || st.phase === "mshow" ? p : null)));
    const pubObj = { ph: st.phase, mt: st.matchNo, rd: st.round, d: st.duel, l: st.lead, p: st.pts, u: st.used, rv: st.rev, s: sub, sd: st.arr.map(Boolean), w: st.wins, h: st.hist.length, ov: st.over };
    return {
      n: 3, phase: st.phase, match: st.matchNo, round: st.round, rounds: SLOTS, duel: st.duel.slice(), sit: st.sit, lead, foll: F,
      pts: st.pts.slice(), wins: st.wins.slice(), total: st.total.slice(), streak: st.streak, hist: st.hist.map(h => ({ ...h })),
      setupDone: st.arr.map(Boolean), used: st.used.map(u => u.slice()), rev: st.rev.map(r => r.slice()),
      sub: sub.map(x => (x == null ? -1 : x)), subDone: st.sub.map(x => x >= 0),
      mine: me >= 0 && st.arr[me] ? st.arr[me].slice() : null,
      all: all ? st.arr.map(a => (a ? a.slice() : null)) : null,
      res: st.res ? { ...st.res } : null, mres: st.mres ? { ...st.mres } : null,
      needs: needs(st), over: st.over, ranks: st.final ? st.final.ranks.slice() : null,
      score: st.wins.map((w, i) => w * 100 + st.total[i]),
      log: st.log.slice(-40), seat, pub: hash(JSON.stringify(pubObj)), playing,
    };
  }

  // ── AI ──────────────────────────────────────────────────────
  // 상대 큐브 배치를 보이는 것(이미 공개된 값 · 오름차순 · 합 30 이하 · 각 숫자 2개까지)에 맞춰 무작위로 뽑음
  function sampleOpp(known, r) {
    const out = [];
    for (let tries = 0; tries < 80; tries++) {
      const cnt = Array(10).fill(0); let sum = 0, prev = 0, ok = true;
      const a = Array(SLOTS).fill(0);
      for (let k = 0; k < SLOTS && ok; k++) {
        if (known[k] != null) { const v = known[k]; if (v < prev || cnt[v] >= 2) { ok = false; break; } a[k] = v; cnt[v]++; sum += v; prev = v; continue; }
        // 다음 알려진 칸 값 이하여야 오름차순
        let hi = 9; for (let j = k + 1; j < SLOTS; j++) if (known[j] != null) { hi = known[j]; break; }
        const cand = []; for (let v = prev; v <= hi; v++) if (cnt[v] < 2) cand.push(v);
        if (!cand.length) { ok = false; break; }
        // 작은 칸에는 작은 수가 오기 쉽게 (합 30 안에 7개)
        const room = MAXSUM - sum, left = SLOTS - k - 1, wgt = cand.map(v => (v * (left + 1) <= room + 0 ? 1 : 0.2) * (1 + (k >= 4 ? v : 9 - v) * 0.3 + 0.2));
        let tot = wgt.reduce((x, y) => x + y, 0), pick = r() * tot, ix = 0;
        for (; ix < cand.length; ix++) { pick -= wgt[ix]; if (pick <= 0) break; }
        const v = cand[Math.min(ix, cand.length - 1)];
        a[k] = v; cnt[v]++; sum += v; prev = v;
      }
      if (ok && sum <= MAXSUM) { out.push(a); break; }
    }
    return out[0] || [0, 1, 2, 3, 4, 5, 9];
  }
  function randomSetup(r, strong) {
    for (let tries = 0; tries < 400; tries++) {
      const pool = []; for (let v = 0; v <= 9; v++) pool.push(v, v);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      const v = pool.slice(0, SLOTS).sort((a, b) => a - b);
      const s = SUMV(v);
      if (s > MAXSUM) continue;
      if (strong && (v[SLOTS - 1] < 9 || s < 24)) continue;
      return v;
    }
    return [0, 1, 2, 3, 4, 5, 9];
  }
  // 대결 한 번을 빠르게 흉내 (후공이 선공 숫자를 보고 가장 싸게 이김)
  function simMatch(A, B, r) {
    const ua = Array(SLOTS).fill(false), ub = Array(SLOTS).fill(false);
    let pa = 0, pb = 0, leadA = r() < 0.5;
    for (let k = 0; k < SLOTS; k++) {
      const L = leadA ? A : B, uL = leadA ? ua : ub, F = leadA ? B : A, uF = leadA ? ub : ua;
      const idxL = []; for (let i = 0; i < SLOTS; i++) if (!uL[i]) idxL.push(i);
      const li = idxL[Math.floor(r() * idxL.length)];
      const vl = L[li];
      let fi = -1;
      for (let i = 0; i < SLOTS; i++) if (!uF[i] && F[i] > vl && (fi < 0 || F[i] < F[fi])) fi = i;
      if (fi < 0) for (let i = 0; i < SLOTS; i++) if (!uF[i] && (fi < 0 || F[i] < F[fi])) fi = i;
      uL[li] = true; uF[fi] = true;
      const vf = F[fi];
      if (vl > vf) { if (leadA) pa++; else pb++; }                         // 선이 이기면 선 그대로
      else if (vf > vl) { if (leadA) pb++; else pa++; leadA = !leadA; }    // 후공이 이기면 다음 선이 됨
    }
    return pa > pb ? 1 : pa < pb ? 0 : 0.5;
  }
  function chooseSetup(tier, r) {
    if (tier === "easy") return randomSetup(r, false);
    if (tier === "normal") return randomSetup(r, true);
    let best = null;
    const cands = []; for (let i = 0; i < 24; i++) cands.push(randomSetup(r, true));
    const foes = []; for (let i = 0; i < 24; i++) foes.push(randomSetup(r, i % 3 !== 0));
    for (const c of cands) {
      let sc = 0; for (const f of foes) sc += simMatch(c, f, r);
      if (!best || sc > best.sc) best = { sc, c };
    }
    return best.c;
  }
  function ai(V, me, tier, r) {
    if (V.phase === "setup") return { t: "setup", v: chooseSetup(tier, r) };
    if (V.phase !== "play") return null;
    return { t: "play", k: choosePlay(V, me, tier, r).k };
  }
  function choosePlay(V, me, tier, r) {
    const opp = V.duel.find(x => x !== me), mine = V.mine, free = [];
    for (let k = 0; k < SLOTS; k++) if (!V.used[me][k]) free.push(k);
    const follow = V.lead !== me, oppPos = follow ? V.sub[opp] : -1;
    if (tier === "easy") return { k: free[Math.floor(r() * free.length)], why: "" };
    const S = tier === "hard" ? 140 : 50;
    const samples = []; for (let s = 0; s < S; s++) samples.push(sampleOpp(V.rev[opp], r));
    const freeOpp = []; for (let k = 0; k < SLOTS; k++) if (!V.used[opp][k]) freeOpp.push(k);
    const needRound = V.rounds - V.round;
    let best = null;
    for (const k of free) {
      const v = mine[k], rank = free.filter(x => mine[x] < v).length;       // 더 작은 내 통이 몇 개 남았나
      let win = 0, lose = 0;
      for (const A of samples) {
        if (follow) { const o = A[oppPos]; if (v > o) win++; else if (v < o) lose++; }
        else {
          // 내가 선: 상대는 가장 싸게 이기는 통을 낸다고 봄
          let beat = false; for (const j of freeOpp) if (A[j] > v) { beat = true; break; }
          let tie = false; for (const j of freeOpp) if (A[j] === v) tie = true;
          if (!beat) { if (tie) win += 0.5; else win++; } else lose++;
        }
      }
      const pw = win / S, pl = lose / S;
      const cost = (rank / Math.max(1, free.length)) * 0.35 + (mine[k] / 9) * 0.15 * (needRound > 0 ? 1 : 0);
      // 앞서고 있는지에 따라 이기는 값을 조금 더 / 덜
      const behind = V.pts[opp] - V.pts[me];
      const sc = (pw - pl) * (1 + 0.1 * behind) - cost + r() * 0.01;
      if (!best || sc > best.sc) best = { sc, k, pw, pl, v };
    }
    best.follow = follow; best.oppPos = oppPos;
    return best;
  }

  // ── AI 선생님 ───────────────────────────────────────────────
  const pc = x => Math.round(x * 100) + "%";
  function coach(V, me, since, names) {
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    const nm = i => esc((names && names[i]) || `${i + 1}번`);
    if (V.over) return { opp: "결승 진출자가 가려졌어요.", mine: `대결 승 ${V.wins[me]}번`, rec: V.ranks[me] === 0 ? "🏆 2연승!" : "한 번 더 도전해 봐요!", why: "" };
    if (!V.duel.includes(me)) return { opp: `${nm(V.duel[0])} 와 ${nm(V.duel[1])} 가 대결 중이에요.`, mine: `나는 쉬는 중 — 이긴 사람과 다음에 겨뤄요 (대결 승 ${V.wins[me]})`, rec: "두 사람의 큐브 값이 어떻게 나오는지 눈여겨봐요.", why: "공개되는 값으로 상대 배치를 짐작하는 연습이 돼요." };
    const opp = V.duel.find(x => x !== me);
    const r = (() => { let a = 99 + V.match * 13 + V.round * 7 + me; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    const revs = V.rev[opp].map((v, k) => (v == null ? null : `${k + 1}번 통=${v}`)).filter(Boolean);
    const lastRes = V.res || null;
    let oppTxt = `${nm(opp)} 의 공개된 값: ${revs.length ? revs.join(" · ") : "아직 없어요"}`;
    if (V.phase === "play" && V.lead === opp && V.sub[opp] >= 0) oppTxt = `${nm(opp)} 가 ${V.sub[opp] + 1}번째 통(색)을 냈어요 — ${V.sub[opp] <= 1 ? "아주 어두워서 작은 수일 거예요" : V.sub[opp] >= 5 ? "아주 밝아서 큰 수일 거예요" : "중간 색이에요"}. ` + oppTxt;
    if (lastRes) oppTxt = `방금: 선 ${nm(lastRes.lead)} ${lastRes.vl} vs ${lastRes.vf} → ${lastRes.win < 0 ? "무승부" : nm(lastRes.win) + " 승"}. ` + oppTxt;
    const usedMine = V.used[me].filter(Boolean).length;
    const mineTxt = V.mine ? `이번 대결 ${V.pts[me]} : ${V.pts[opp]} (${V.round}/7라운드) · 내 남은 통 ${V.mine.map((v, k) => (V.used[me][k] ? null : `${k + 1}번=${v}`)).filter(Boolean).join(" ")}` : "큐브를 고르는 중";
    let rec = "상대를 기다려요", why = "";
    if (V.phase === "setup" && V.needs.includes(me)) {
      const v = chooseSetup("hard", r);
      rec = `큐브 ${v.join(" ")} (합 ${SUMV(v)})`;
      why = "9 한 개는 거의 지지 않아요. 남은 6개에 합 21 안쪽을 어떻게 나누느냐가 관건이에요 — 작은 수를 넉넉히 두면 큰 수에 쓸 합이 생겨요.";
    } else if (V.phase === "play" && V.needs.includes(me)) {
      const p = choosePlay(V, me, "hard", r);
      rec = `${p.k + 1}번째 통 (숫자 ${p.v})`;
      why = p.follow ? `상대 ${p.oppPos + 1}번 통은 보통 이 정도 값이고, 내 ${p.k + 1}번이 이길 확률 ${pc(p.pw)} · 질 확률 ${pc(p.pl)}예요. 이길 수 있는 가장 작은 통으로 이기고, 질 것 같으면 가장 작은 통을 버려요.` : `내가 선이라 상대가 내 통 색을 보고 가장 싸게 이기려 할 거예요. 이 통은 상대가 못 이길 확률 ${pc(p.pw)}.`;
    }
    void usedMine;
    return { opp: oppTxt, mine: mineTxt, rec, why };
  }

  return {
    id: "gradation", SLOTS, MAXSUM, checkSetup,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, coach,
    sampleOpp, randomSetup, chooseSetup, choosePlay, simMatch, defaultSetup,
  };
});

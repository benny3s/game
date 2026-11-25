/* 베니 서바이벌 · 4인 3목 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 데블스 플랜 (시즌 1) · 6일차 상금 매치 (4명)
   · 4×4 판(16칸, A1~D4). 빨강 · 노랑 · 초록 · 파랑 말 5개씩
   · 차례마다 둘 중 하나: '새 말 놓기' = 한 칸에 새 말을 1~3개 (한 칸은 3층까지) · '말 옮기기' = 맨 위에 있는 내 말 1개를 이웃 8칸 중 하나로
     (어떤 행동으로도 4층은 안 됨). 할 수 있는 게 없으면 패스
   · 위에서 볼 때(칸마다 맨 위 말) 같은 색 3개가 가로 · 세로 · 대각선으로 이어지면 그 사람이 라운드 승리 → 피스 3개
     한 수로 두 사람 이상이 동시에 3목이면 아무도 못 받음
   · 4라운드, 라운드마다 순서가 바뀜 (방송 1R ABCD · 2R CDAB · 3R DABC · 4R BCDA) · 피스 많은 사람이 이김
   방송과 다른 점 (폰 · AI 때문): 스페셜 게스트 · 상금 미션(3명 협력)은 없고 모두 각자 · 2~4명 (빈 자리는 AI) ·
     '넘기기' 단추 (방송은 90초를 넘기면 패스) · 모두 연달아 넘기거나 한 라운드 80수가 넘으면 그 라운드는 승자 없음 ·
     끝에 피스가 같으면 같은 순위 (방송은 동점자 연장전) · 시작 피스는 0 (방송은 그때까지 모은 피스)
   재현 약속: 시계 · Math.random 을 안 써요 (AI 는 받은 rnd 만). */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {}).four3 = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const COLS = ["빨강", "노랑", "초록", "파랑"], HAND = 5, H = 3, ROUNDS = 4, CAP = 80;
  const cellName = i => "ABCD"[i % 4] + (Math.floor(i / 4) + 1);
  const NB = [];                       // 이웃 8칸
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4), c = i % 4, a = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 4 && cc >= 0 && cc < 4) a.push(rr * 4 + cc);
    }
    NB.push(a);
  }
  const LINES = [];                    // 세 칸 줄 24개
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (r2 >= 0 && r2 < 4 && c2 >= 0 && c2 < 4) LINES.push([r * 4 + c, (r + dr) * 4 + c + dc, r2 * 4 + c2]);
    }
  }
  const LINES_AT = Array.from({ length: 16 }, (_, i) => LINES.map((L, k) => k).filter(k => LINES[k].includes(i)));
  // 라운드 순서 (자리 번호 = 색). 4명이면 방송 그대로, 아니면 한 칸씩 돌림
  const ORD4 = [[0, 1, 2, 3], [2, 3, 0, 1], [3, 0, 1, 2], [1, 2, 3, 0]];
  function orderOf(n, r) {
    if (n === 4) return ORD4[(r - 1) % 4].slice();
    const s = (r - 1) % n; return Array.from({ length: n }, (_, i) => (s + i) % n);
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 120) st.log.shift(); }
  const topOf = bd => bd.map(s => (s.length ? s[s.length - 1] : -1));
  function winnersOf(top) {
    const w = new Set();
    for (const L of LINES) { const a = top[L[0]]; if (a >= 0 && a === top[L[1]] && a === top[L[2]]) w.add(a); }
    return [...w].sort((x, y) => x - y);
  }

  // ── 옵션 ──
  const OPTS = { timer: [0, 90], rounds: [4, 2] };
  function optsOf(cfg) {
    const o = {};
    for (const k in OPTS) { const v = cfg && cfg[k] !== undefined ? +cfg[k] : OPTS[k][0]; o[k] = OPTS[k].includes(v) ? v : OPTS[k][0]; }
    return o;
  }

  // ── 진행 ──
  function init({ n, seed, cfg }) {
    cfg = cfg || {};
    n = Math.max(2, Math.min(4, n | 0 || 4));
    const o = optsOf(cfg);
    const st = { n, rs: (seed >>> 0) || 1, cfg: Object.assign({}, cfg), opt: o, R: o.rounds, round: 0, phase: "play", bd: [], hand: [], order: [], ti: 0, moves: 0, passes: 0,
      pc: Array(n).fill(0), wins: Array(n).fill(0), last: null, hist: [], log: [], seq: 0, over: false, res: null, rw: null };
    startRound(st);
    return st;
  }
  function startRound(st) {
    st.round++;
    st.bd = Array.from({ length: 16 }, () => []);
    st.hand = Array(st.n).fill(HAND);
    st.order = orderOf(st.n, st.round);
    st.ti = 0; st.moves = 0; st.passes = 0; st.last = null; st.rw = null;
    st.phase = "play";
    push(st, { k: "round", r: st.round, order: st.order.slice() });
  }
  const cur = st => st.order[st.ti];
  function endRound(st, w, why) {
    st.phase = "roundend";
    if (w.length === 1) { st.pc[w[0]] += 3; st.wins[w[0]]++; }
    st.rw = { w: w.slice(), why };
    st.hist.push({ r: st.round, w: w.slice(), why, bd: st.bd.map(s => s.slice()), moves: st.moves, order: st.order.slice(), pc: st.pc.slice() });
    push(st, { k: "rend", r: st.round, w: w.slice(), why });
  }
  function finish(st) {
    st.over = true; st.phase = "end";
    const best = Math.max(...st.pc);
    st.res = { pc: st.pc.slice(), w: st.pc.map((p, i) => i).filter(i => st.pc[i] === best), wins: st.wins.slice() };
    push(st, { k: "end", pc: st.pc.slice() });
  }
  function needs(st) { return st.over || st.phase !== "play" ? [] : [cur(st)]; }
  const over = st => !!st.over;
  function ranks(st) { return st.pc.map(p => st.pc.filter(q => q > p).length); }

  // 행동 확인 (판 · 손 말 · 자리만으로)
  function check(bd, hand, s, a) {
    if (!a || typeof a !== "object") return "모르는 행동이에요";
    if (a.t === "pass") return "";
    if (a.t === "place") {
      const i = a.cell, k = a.k == null ? 1 : a.k;
      if (!Number.isInteger(i) || i < 0 || i > 15) return "칸을 골라요";
      if (!Number.isInteger(k) || k < 1 || k > 3) return "말은 1~3개";
      if (k > hand[s]) return `남은 말이 ${hand[s]}개예요`;
      if (bd[i].length + k > H) return "한 칸은 3층까지예요";
      return "";
    }
    if (a.t === "move") {
      const f = a.from, t = a.to;
      if (!Number.isInteger(f) || f < 0 || f > 15 || !Number.isInteger(t) || t < 0 || t > 15) return "칸을 골라요";
      const sf = bd[f];
      if (!sf.length || sf[sf.length - 1] !== s) return "맨 위에 있는 내 말만 옮겨요";
      if (!NB[f].includes(t)) return "이웃한 8칸으로만 옮겨요";
      if (bd[t].length >= H) return "한 칸은 3층까지예요";
      return "";
    }
    return "모르는 행동이에요";
  }
  function legalOf(bd, hand, s) {
    const out = [];
    for (let i = 0; i < 16; i++) for (let k = 1; k <= Math.min(hand[s], H - bd[i].length); k++) out.push({ t: "place", cell: i, k });
    for (let f = 0; f < 16; f++) { const sf = bd[f]; if (sf.length && sf[sf.length - 1] === s) for (const t of NB[f]) if (bd[t].length < H) out.push({ t: "move", from: f, to: t }); }
    out.push({ t: "pass" });
    return out;
  }
  function legal(st, seat) { return needs(st).includes(seat) ? legalOf(st.bd, st.hand, seat) : []; }
  // 판에 행동 하나 (되돌리기 정보 돌려줌) — AI 가 한 판에서 넣고 빼며 씀
  function doAct(bd, hand, s, a) {
    if (a.t === "place") { for (let j = 0; j < a.k; j++) bd[a.cell].push(s); hand[s] -= a.k; }
    else if (a.t === "move") bd[a.to].push(bd[a.from].pop());
  }
  function undoAct(bd, hand, s, a) {
    if (a.t === "place") { for (let j = 0; j < a.k; j++) bd[a.cell].pop(); hand[s] += a.k; }
    else if (a.t === "move") bd[a.from].push(bd[a.to].pop());
  }

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "게임이 끝났어요" };
    if (st.phase !== "play") return { ok: false, err: "잠깐 — 라운드 결과를 보는 중이에요" };
    if (seat !== cur(st)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (a && a.t === "place" && a.k == null) a = Object.assign({}, a, { k: 1 });
    const err = check(st.bd, st.hand, seat, a);
    if (err) return { ok: false, err };
    const act = a.t === "place" ? { t: "place", cell: a.cell, k: a.k } : a.t === "move" ? { t: "move", from: a.from, to: a.to } : { t: "pass" };
    doAct(st.bd, st.hand, seat, act);
    st.moves++;
    st.passes = act.t === "pass" ? st.passes + 1 : 0;
    st.last = Object.assign({ s: seat, n: st.moves }, act);
    push(st, { k: "act", r: st.round, s: seat, a: Object.assign({}, act) });
    const w = winnersOf(topOf(st.bd));
    if (w.length) endRound(st, w, w.length === 1 ? "line" : "multi");
    else if (st.passes >= st.n) endRound(st, [], "pass");
    else if (st.moves >= CAP) endRound(st, [], "cap");
    else st.ti = (st.ti + 1) % st.n;
    return { ok: true };
  }
  const auto = st => (st.over ? null : st.phase === "roundend" ? 3600 : null);
  function advance(st) {
    if (st.over || st.phase !== "roundend") return;
    if (st.round >= st.R) finish(st); else startRound(st);
  }

  // ── 보이는 것 (숨은 정보 없음) ──
  function view(st, seat) {
    const pubObj = { r: st.round, p: st.phase, bd: st.bd, h: st.hand, t: st.ti, pc: st.pc, o: st.over, m: st.moves, ps: st.passes };
    return {
      n: st.n, R: st.R, opt: Object.assign({}, st.opt), round: st.round, phase: st.phase,
      bd: st.bd.map(s => s.slice()), top: topOf(st.bd), hand: st.hand.slice(), order: st.order.slice(), ti: st.ti, cur: st.phase === "play" && !st.over ? cur(st) : -1,
      moves: st.moves, passes: st.passes, pc: st.pc.slice(), wins: st.wins.slice(), last: st.last ? Object.assign({}, st.last) : null, rw: st.rw ? { w: st.rw.w.slice(), why: st.rw.why } : null,
      hist: st.hist.map(h => ({ r: h.r, w: h.w.slice(), why: h.why, bd: h.bd.map(s => s.slice()), moves: h.moves, order: h.order.slice(), pc: h.pc.slice() })),
      needs: needs(st), over: st.over, ranks: ranks(st), res: st.res ? { pc: st.res.pc.slice(), w: st.res.w.slice(), wins: st.res.wins.slice() } : null,
      log: st.log.map(e => JSON.parse(JSON.stringify(e))), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }

  // ── AI ──
  // 다음 차례 사람들 (나 다음부터 한 바퀴)
  function nextsOf(V, s) { const o = V.order, i = o.indexOf(s); return o.slice(i + 1).concat(o.slice(0, i)); }
  // p 가 지금 판에서 바로 혼자 3목을 만드는 수
  function winMoves(bd, hand, p, stopAt1) {
    const out = [];
    const tryA = a => { doAct(bd, hand, p, a); const w = winnersOf(topOf(bd)); undoAct(bd, hand, p, a); if (w.length === 1 && w[0] === p) out.push(a); return stopAt1 && out.length; };
    if (hand[p] > 0) for (let i = 0; i < 16; i++) if (bd[i].length < H && tryA({ t: "place", cell: i, k: 1 })) return out;
    for (let f = 0; f < 16; f++) { const sf = bd[f]; if (sf.length && sf[sf.length - 1] === p) for (const t of NB[f]) if (bd[t].length < H && tryA({ t: "move", from: f, to: t })) return out; }
    return out;
  }
  // 판 모양 점수 (s 기준): 두 개 이은 줄 · 높이 · 묻힌 말 · 남은 말
  function shape(bd, hand, s, n) {
    const top = topOf(bd);
    let v = 0;
    for (const L of LINES) {
      let m = 0, o = 0, oc = -1, cover = true;
      for (const i of L) { if (top[i] === s) m++; else if (top[i] >= 0) { o++; oc = top[i]; } }
      if (o === 0) { if (m === 2) v += 7; else if (m === 1) v += 1; }
      else if (m === 2 && o === 1) { const third = L.find(i => top[i] !== s); cover = bd[third].length < H; v += cover ? 3 : 0; }
      // 상대 둘이 같은 색으로 이은 줄 (남은 칸이 비었거나 덮을 수 있으면 위험)
      if (m === 0 && o === 2) { const cs = L.map(i => top[i]).filter(x => x >= 0); if (cs[0] === cs[1]) { const third = L.find(i => top[i] < 0); v -= third !== undefined ? 4 : 1; } }
      if (m === 1 && o === 2) { const cs = L.filter(i => top[i] !== s).map(i => top[i]); if (cs[0] === cs[1]) v -= 1.5; }
      void oc;
    }
    for (let i = 0; i < 16; i++) {
      const sk = bd[i];
      for (let j = 0; j < sk.length; j++) {
        if (sk[j] !== s) continue;
        if (j === sk.length - 1) v += 0.6 * sk.length + (sk.length === H ? 1.4 : 0);   // 높을수록 덮기 어려움
        else v -= 1.3;                                                                    // 남의 말 밑에 묻힘
      }
    }
    v += 0.7 * hand[s];
    void n;
    return v;
  }
  const PROF = {
    easy:   { look: 0, noise: 7,   winP: 0.7, blockP: 0.25 },
    normal: { look: 1, noise: 2.5, winP: 1,   blockP: 0.8 },
    hard:   { look: 3, noise: 0.4, winP: 1,   blockP: 1, oth: 0.35, thr: 35, mc: 12, top: 10 },   // 후보 10개를 12번씩 끝까지 굴려 봄
  };
  const PEN = [900, 260, 130];
  // 한 수 평가 (높을수록 좋음) — {v, tag, why}
  function evalAct(V, s, a, P) {
    const bd = V.bd.map(x => x.slice()), hand = V.hand.slice();
    doAct(bd, hand, s, a);
    const w = winnersOf(topOf(bd));
    if (w.length === 1 && w[0] === s) return { v: 10000, tag: "win" };
    if (w.length === 1) return { v: -9000, tag: "give", who: w[0] };
    if (w.length > 1) return { v: w.includes(s) ? -300 : -250, tag: "multi", who: w };
    let v = 0, tag = "", danger = [];
    const nx = nextsOf(V, s);
    for (let j = 0; j < Math.min(P.look, nx.length); j++) {
      const wm = winMoves(bd, hand, nx[j], true);
      if (wm.length) { v -= PEN[j] * (j === 0 ? 1 : P.blockP); danger.push(nx[j]); if (j === 0) break; }
    }
    const mine = winMoves(bd, hand, s, false).length;
    v += Math.min(mine, 3) * (P.thr == null ? 35 : P.thr);
    let sh = shape(bd, hand, s, V.n);
    if (P.oth) for (const q of nx) sh -= P.oth * shape(bd, hand, q, V.n);
    v += sh;
    if (a.t === "pass") v -= 2;
    return { v, tag: danger.length ? "danger" : mine ? "threat" : tag, danger, mine };
  }
  function rankActs(V, s, P) {
    const acts = legalOf(V.bd, V.hand, s);
    return acts.map(a => Object.assign({ a }, evalAct(V, s, a, P)));
  }
  // 굴려 보기: 남은 라운드를 가벼운 정책(3목 되면 둠 · 다음 사람에게 3목 길을 안 내주게 몇 번 고름 · 나머지 무작위)으로 끝까지
  function rollout(bd, hand, order, ti, me, R, maxSteps) {
    const n = order.length;
    for (let step = 0; step < maxSteps; step++) {
      const s = order[ti], nx = order[(ti + 1) % n];
      const wm = winMoves(bd, hand, s, true);
      let a = null;
      if (wm.length) a = wm[0];
      else {
        const acts = legalOf(bd, hand, s).filter(x => x.t !== "pass");
        for (let k = 0; k < 5 && acts.length; k++) {
          const c = acts[Math.floor(R() * acts.length)];
          doAct(bd, hand, s, c);
          const w = winnersOf(topOf(bd)), bad = (w.length && !(w.length === 1 && w[0] === s)) || winMoves(bd, hand, nx, true).length;
          undoAct(bd, hand, s, c);
          if (!a) a = c;
          if (!bad) { a = c; break; }
        }
        if (!a) a = { t: "pass" };
      }
      doAct(bd, hand, s, a);
      const w = winnersOf(topOf(bd));
      if (w.length === 1) return w[0] === me ? 1 : -1;
      if (w.length > 1) return 0;
      ti = (ti + 1) % n;
    }
    return 0;
  }
  // 후보마다 라운드를 이길 확률 · 남이 이길 확률 (굴려 본 값)
  function mcRows(V, s, P, R) {
    const rows = rankActs(V, s, P).sort((x, y) => y.v - x.v);
    const cand = rows.filter(r => r.tag !== "give").slice(0, P.top);
    const ti = V.order.indexOf(s);
    for (const r of cand) {
      let w = 0, l = 0;
      for (let k = 0; k < P.mc; k++) {
        const bd = V.bd.map(x => x.slice()), hand = V.hand.slice();
        doAct(bd, hand, s, r.a);
        const ww = winnersOf(topOf(bd));
        const o = ww.length ? (ww.length === 1 && ww[0] === s ? 1 : ww.length === 1 ? -1 : 0) : rollout(bd, hand, V.order, (ti + 1) % V.n, s, R, 24);
        if (o > 0) w++; else if (o < 0) l++;
      }
      r.pw = w / P.mc; r.pl = l / P.mc; r.mv = r.pw - 0.45 * r.pl + r.v * 0.0005;
    }
    cand.sort((x, y) => y.mv - x.mv);
    return { cand, rows };
  }
  const seeded = x => () => { x = (x + 0x6D2B79F5) >>> 0; let t = Math.imul(x ^ (x >>> 15), x | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function aiWith(V, s, P, rnd) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const R = typeof rnd === "function" ? rnd : seeded((V.moves + 1) * 7919 + V.round * 131 + s);
    if (P.mc) {
      const { cand, rows } = mcRows(V, s, P, R);
      const win = rows.find(r => r.tag === "win");
      return win ? win.a : (cand[0] || rows[0]).a;
    }
    const rows = rankActs(V, s, P);
    const win = rows.filter(r => r.tag === "win");
    if (win.length && R() < P.winP) return win[Math.floor(R() * win.length)].a;
    let best = null, bv = -Infinity;
    for (const r of rows) {
      let v = r.tag === "win" ? -50 : r.v;                 // 놓친 3목은 쉬움만
      v += (R() - 0.5) * 2 * P.noise;
      if (v > bv) { bv = v; best = r; }
    }
    return best.a;
  }
  function ai(V, s, tier, rnd) { return aiWith(V, s, PROF[tier] || PROF.normal, rnd); }
  // 추천 = 고급 AI (흔들림 없이) + 까닭
  //  (같은 장면이면 같은 답: 판 모양으로 씨앗을 정하고, 굴려 보기를 조금 더 많이)
  let recLast = null;                                        // 같은 장면을 코치 · 복기가 또 물으면 다시 굴리지 않음 (답은 어차피 같음)
  function recommend(V, s) {
    if (!V || V.over || !V.needs || !V.needs.includes(s)) return null;
    const P = Object.assign({}, PROF.hard, { mc: 20 });
    const key = JSON.stringify([V.bd, V.hand, V.ti, V.round, V.order, V.passes, V.moves, s]);
    if (recLast && recLast.key === key) return recLast.out;
    let x = 2166136261; for (let i = 0; i < key.length; i++) { x ^= key.charCodeAt(i); x = Math.imul(x, 16777619); }
    const { cand, rows } = mcRows(V, s, P, seeded(x >>> 0));
    const win = rows.find(r => r.tag === "win");
    const top = win || cand[0] || rows[0];
    const out = Object.assign({}, top, { n: rows.length, rows, cand });
    recLast = { key, out };
    return out;
  }
  // 위협: 누가 어디에 두면 바로 3목인지 (선생님용, 모두 보이는 판)
  function threats(V) {
    const bd = V.bd.map(x => x.slice()), hand = V.hand.slice(), out = [];
    for (let p = 0; p < V.n; p++) { const wm = winMoves(bd, hand, p, false); if (wm.length) out.push({ p, acts: wm }); }
    return out;
  }

  return {
    id: "four3", COLS, HAND, H, ROUNDS, CAP, NB, LINES, LINES_AT, ORD4, PROF, cellName, orderOf, winnersOf, topOf, optsOf, legalOf, check,
    init, needs, apply, view, over, ranks, legal, auto, advance, ai, aiWith, recommend, evalAct, rankActs, threats, winMoves, shape, nextsOf,
  };
});

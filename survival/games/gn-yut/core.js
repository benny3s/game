/* 베니 서바이벌 · 전략 윷놀이 — 규칙 (결정적, Node · 브라우저 공용)
   방송: 더 지니어스 시즌 4 그랜드 파이널 2화 데스매치 (임요환 · 홍진호 vs 최연승 · 장동민) · 시즌 1(게임의 법칙) 3 · 4 · 10화 2:2 데스매치
   · 2:2 팀전. 탈락후보 두 명이 각자 파트너 1명을 골라 4명이 해요. 4명 모두 말 2개씩 — 탈락후보의 말 2개가 먼저 모두 들어오는 쪽이 승리 (파트너 말은 돕는 데만 쓰이고 먼저 들어와도 승패에 영향 없음)
   · 일반 윷놀이와 다른 점 세 가지: ① 한 명이 윷 4개를 던지지 않아요 ② 4명이 각자 '앞면만 있는 윷'과 '뒷면만 있는 윷' 한 개씩을 가지고,
     매 턴 4명이 각각 앞/뒷면 중 하나를 비밀로 골라 함께 던져요 — 합친 결과대로 말을 움직여요 (앞면 4=윷 · 3=걸 · 2=개 · 1=도 · 0=모)
     ③ 도는 모두 뒷도 (한 칸 뒤로) — 뒷도로 출발점에 들어가도(첫 칸의 말이 뒤로 가 출발점에 닿아도) 한 바퀴 돈 것으로 인정
   · 그 외 규칙은 일반 윷놀이와 같아요: 29점 십자 말판(둘레 20칸 + 가운데 + 대각 지름길, 출발=도착은 오른쪽 아래 모서리) · 모서리와 가운데에 멈추면 지름길 ·
     같은 사람의 말은 업어서 한꺼번에 이동 · 상대 말이 있는 칸에 닿으면 잡아서 처음 자리로 + 한 번 더 · 윷 · 모는 한 번 더
   · 차례: 탈락후보A → 파트너B → 탈락후보B → 파트너A … (4명이 앉은 순서). 윷은 4명이 모두 고르고, 말을 움직이는 것은 차례인 사람
   우리 판 다듬기(방송 설명에 없는 것): 아직 판에 안 들어온 말은 뒷도로 못 움직여요 (움직일 말이 없으면 그 차례는 넘어가요) · 업기는 같은 사람의 말끼리만 (같은 편 다른 사람의 말과는 한 칸에 같이 있어도 따로 움직이고
     서로 잡지 않아요) · 던진 결과는 쌓지 않고 바로 움직여요 · 한 번 더는 같은 사람이 4명 선택을 다시 해요 · 말이 모두 들어온 파트너는 차례를 건너뛰어요 ·
     지름길은 모서리(오른쪽 위 · 왼쪽 위)와 가운데에 정확히 멈춘 말만 타요 — 그냥 지나가는 말은 가던 길을 그대로 가요 (오른쪽 위 모서리에서 가운데에 멈추면 곧장 도착 쪽, 지나치면 왼쪽 아래 모서리 쪽 대각선 그대로) ·
     선 · 후: 시작할 때 방장 팀이 고르고 (방송에도 고르는 단계가 있어요), AI 는 AI 끼리 1만 2천 판에서 먼저 던진 쪽이 51.6% 라 선을 골라요 */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else (root.SVCores = root.SVCores || {})["gn-yut"] = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // ── 말판 (29점) ────────────────────────────────────────────
  // 바깥 길 1~19 (출발점 0 = 도착점, 반시계), 5 · 10 · 15 = 모서리, 20 · 21 = 첫째 모서리(5)에서 가운데로, 22 = 가운데,
  // 23 · 24 = 가운데에서 셋째 모서리(15)로, 25 · 26 = 둘째 모서리(10)에서 가운데로, 27 · 28 = 가운데에서 도착점으로
  // 말이 가는 길 4가지 (말은 길 R 위의 자리 i 를 코드 R*20+i 로 가짐 · 집 = -1 · 들어옴 = 100)
  const R0 = []; for (let i = 1; i <= 19; i++) R0.push(i);
  const ROUTE = [R0, [1, 2, 3, 4, 5, 20, 21, 22, 23, 24, 15, 16, 17, 18, 19], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 26, 22, 27, 28], [1, 2, 3, 4, 5, 20, 21, 22, 27, 28]];
  const LEN = ROUTE.map(r => r.length);
  const HOME = -1, DONE = 100, NPIECE = 2;
  const nodeOf = c => ROUTE[(c / 20) | 0][c % 20];
  // 멈춘 자리를 길에 맞게 바로잡기: 모서리 · 가운데에 멈추면 지름길 쪽 길, 모서리 앞(바깥 길)으로 되돌아오면 바깥 길
  function fix(r, i) {
    if (r === 3 && i <= 6) r = 1;
    if (r === 1) { if (i <= 3) r = 0; else if (i === 7) r = 3; }
    if (r === 2 && i <= 8) r = 0;
    if (r === 0) { if (i === 4) r = 1; else if (i === 9) r = 2; }
    return r * 20 + i;
  }
  function stepFwd(c, k) {
    let r, i;
    if (c === HOME) { r = 0; i = k - 1; } else { r = (c / 20) | 0; i = (c % 20) + k; }
    if (i >= LEN[r]) return DONE;
    return fix(r, i);
  }
  function stepBack(c) {                 // 뒷도: 한 칸 뒤로 (출발점 첫 칸의 말이면 곧바로 도착 = 한 바퀴 인정)
    const r = (c / 20) | 0, i = (c % 20) - 1;
    if (i < 0) return DONE;
    return fix(r, i);
  }
  const stepOf = (c, k) => (k < 0 ? stepBack(c) : stepFwd(c, k));
  const dist = c => (c === HOME ? 20 : c === DONE ? 0 : ((c / 20) | 0) === 0 ? 19 - (c % 20) : ((c / 20) | 0) === 3 ? 10 - (c % 20) : 15 - (c % 20));   // 도착까지 남은 칸 (길을 그대로 갈 때)

  // ── 윷 결과: 앞면 개수 t ─────────────────────────────────
  const RES = [{ n: "모", k: 5, ex: true }, { n: "뒷도", k: -1, ex: false }, { n: "개", k: 2, ex: false }, { n: "걸", k: 3, ex: false }, { n: "윷", k: 4, ex: true }];
  const P5 = [1, 4, 6, 4, 1].map(x => x / 16);
  const kName = k => (k === 5 ? "모" : k === -1 ? "뒷도" : k === 2 ? "개" : k === 3 ? "걸" : "윷");

  // ── 자리 · 팀 ─────────────────────────────────────────────
  // mate 3 (기본): 팀 {0, 3} 대 {1, 2} — 차례 0→1→2→3 (탈락후보 0 · 상대 파트너 1 · 상대 탈락후보 2 · 내 파트너 3)
  // mate 1: 팀 {0, 1} 대 {2, 3} — 차례 0→3→2→1 (친구랑에서 방장과 두 번째 사람이 한 팀)
  function roles(mate) {
    return mate === 1 ? { team: [0, 0, 1, 1], cand: [0, 2], ordA: [0, 3, 2, 1] } : { team: [0, 1, 1, 0], cand: [0, 2], ordA: [0, 1, 2, 3] };
  }
  const partnerOf = (team, s) => { for (let j = 0; j < 4; j++) if (j !== s && team[j] === team[s]) return j; return s; };

  function push(st, e) { e.i = st.seq++; st.log.push(e); if (st.log.length > 80) st.log.shift(); }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ── 이동 규칙 (말판 위의 계산 · st 와 view 와 AI 가 같이 씀) ───────────
  // S = { pc: 8칸 (자리*2 + 말번호), team, cand, ord, mover }
  function unitOf(pc, seat, p) {         // 같이 움직이는 말 (업은 말)
    const c = pc[seat * 2 + p];
    if (c === HOME || c === DONE) return [p];
    const c2 = pc[seat * 2 + 1 - p];
    return (c2 !== HOME && c2 !== DONE && nodeOf(c2) === nodeOf(c)) ? [0, 1] : [p];
  }
  function legalMoves(pc, seat, k) {     // 움직일 수 있는 말 번호 (같은 말 · 업은 말은 한 번만)
    const out = [];
    for (let p = 0; p < NPIECE; p++) {
      const c = pc[seat * 2 + p];
      if (c === DONE) continue;
      if (c === HOME && k < 0) continue;
      if (p === 1 && out.length) {
        const c0 = pc[seat * 2];
        if (c0 === HOME && c === HOME) continue;
        if (c0 !== DONE && c0 !== HOME && c !== HOME && nodeOf(c0) === nodeOf(c)) continue;
      }
      out.push(p);
    }
    return out;
  }
  // 말 하나(업은 말이면 같이)를 k 칸 움직이고, 닿은 칸의 상대 말을 잡고, 같은 사람의 말과는 업어요 — S 를 바꿈
  function doMove(S, seat, p, k) {
    const pc = S.pc, unit = unitOf(pc, seat, p), c0 = pc[seat * 2 + p];
    const from = c0 === HOME ? -1 : nodeOf(c0), nc = stepOf(c0, k), cap = [];
    for (const q of unit) pc[seat * 2 + q] = nc;
    let to = -2, carry = 0;
    if (nc !== DONE) {
      to = nodeOf(nc);
      for (let s = 0; s < 4; s++) for (let q = 0; q < NPIECE; q++) {
        const i = s * 2 + q;
        if (s === seat && unit.indexOf(q) >= 0) continue;
        const c = pc[i];
        if (c === HOME || c === DONE || nodeOf(c) !== to) continue;
        if (s === seat) { pc[i] = nc; carry++; }                                   // 업기
        else if (S.team[s] !== S.team[seat]) { pc[i] = HOME; cap.push(i); }         // 잡기
      }
    }
    return { from, to, nc, cap, unit, carry, done: nc === DONE ? unit.length : 0 };
  }
  const wonBy = (pc, cand, t) => pc[cand[t] * 2] === DONE && pc[cand[t] * 2 + 1] === DONE;
  const canPlay = (pc, s) => pc[s * 2] !== DONE || pc[s * 2 + 1] !== DONE;
  function nextSeat(S, seat) {
    const o = S.ord; let i = o.indexOf(seat);
    for (let n = 0; n < 4; n++) { i = (i + 1) % 4; if (canPlay(S.pc, o[i])) return o[i]; }
    return seat;
  }

  // ── 판 (규칙 상태) ────────────────────────────────────────
  function init({ n, seed, cfg } = {}) {
    const c = cfg || {}, mate = +c.mate === 1 ? 1 : 3, R = roles(mate);
    const st = {
      n: 4, rs: (seed >>> 0) || 1, cfg: c, mate, team: R.team.slice(), cand: R.cand.slice(), ordA: R.ordA.slice(), ord: R.ordA.slice(), firstTeam: -1,
      phase: "first", pc: Array(8).fill(HOME), tix: 0, mover: R.ordA[0], picks: [null, null, null, null], res: null, extra: false, turn: 0,
      last: null, hist: [], fr: [0, 0, 0, 0], nth: 0, stat: { cap: [0, 0], throws: 0 }, log: [], seq: 0, over: false, win: -1,
    };
    if (c.first === 0 || c.first === 1) setFirst(st, c.first);
    return st;
  }
  function setFirst(st, v) {             // v 0 = 방장 팀이 선(먼저) · 1 = 후
    st.firstTeam = v === 0 ? 0 : 1;
    const a = st.ordA;
    st.ord = st.firstTeam === 0 ? a.slice() : [a[2], a[3], a[0], a[1]];
    st.tix = 0; st.mover = st.ord[0];
    push(st, { k: "first", t: st.firstTeam, v });
    startThrow(st);
  }
  function startThrow(st) { st.picks = [null, null, null, null]; st.res = null; st.phase = "stick"; st.turn++; }

  function needs(st) {
    if (st.over) return [];
    if (st.phase === "first") return [st.cand[0]];
    if (st.phase === "stick") return [0, 1, 2, 3].filter(s => st.picks[s] === null);
    if (st.phase === "move") return [st.mover];
    return [];
  }
  const curMoves = st => (st.res ? legalMoves(st.pc, st.mover, st.res.k) : []);

  function apply(st, seat, a) {
    if (st.over) return { ok: false, err: "끝난 판이에요" };
    if (!a || typeof a !== "object") return { ok: false, err: "행동을 골라 주세요" };
    if (!Number.isInteger(seat) || seat < 0 || seat > 3 || !needs(st).includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
    if (st.phase === "first") {
      if (a.t !== "first" || (a.v !== 0 && a.v !== 1)) return { ok: false, err: "선 · 후 중에 골라 주세요" };
      setFirst(st, a.v); return { ok: true };
    }
    if (st.phase === "stick") {
      if (a.t !== "stick" || (a.f !== 0 && a.f !== 1)) return { ok: false, err: "앞면 · 뒷면 중에 골라 주세요" };
      st.picks[seat] = a.f;
      push(st, { k: "pick", s: seat });
      if (st.picks.every(x => x !== null)) reveal(st);
      return { ok: true };
    }
    if (st.phase === "move") {
      if (a.t !== "move" || !Number.isInteger(a.p) || !curMoves(st).includes(a.p)) return { ok: false, err: "움직일 수 있는 말을 골라 주세요" };
      playMove(st, a.p); return { ok: true };
    }
    return { ok: false, err: "지금은 차례가 아니에요" };
  }
  function reveal(st) {
    const t = st.picks[0] + st.picks[1] + st.picks[2] + st.picks[3], R = RES[t];
    st.res = { t, k: R.k, n: R.n, ex: !!R.ex, picks: st.picks.slice(), mover: st.mover };
    for (let s = 0; s < 4; s++) st.fr[s] += st.picks[s];
    st.nth++; st.stat.throws++;
    st.hist.push({ m: st.mover, t, picks: st.picks.slice() }); if (st.hist.length > 40) st.hist.shift();
    st.phase = "reveal";
    push(st, { k: "throw", s: st.mover, t, picks: st.picks.slice() });
  }
  function playMove(st, p) {
    const seat = st.mover, k = st.res.k, r = doMove(st, seat, p, k);
    const tm = st.team[seat], ex = st.res.ex || r.cap.length > 0;
    st.stat.cap[tm] += r.cap.length;
    st.extra = ex;
    st.last = { s: seat, p, t: st.res.t, k, from: r.from, to: r.to, cap: r.cap.slice(), unit: r.unit.slice(), carry: r.carry, done: r.done, ex };
    push(st, { k: "move", s: seat, p, from: r.from, to: r.to, cap: r.cap.length, done: r.done, ex });
    for (const t of [0, 1]) if (wonBy(st.pc, st.cand, t)) { st.over = true; st.win = t; st.phase = "end"; push(st, { k: "end", win: t }); return; }
    st.phase = "moved";
  }
  function advance(st) {
    if (st.over) return;
    if (st.phase === "reveal") {
      const mv = curMoves(st);
      if (mv.length === 0) {             // 움직일 말이 없으면 그 차례는 넘어가요
        st.extra = false; st.last = { s: st.mover, t: st.res.t, k: st.res.k, pass: 1, ex: false };
        push(st, { k: "pass", s: st.mover }); st.phase = "moved"; return;
      }
      if (mv.length === 1) { playMove(st, mv[0]); return; }
      st.phase = "move"; return;
    }
    if (st.phase === "moved") {
      if (!(st.extra && canPlay(st.pc, st.mover))) {
        let i = st.tix;
        for (let n = 0; n < 4; n++) { i = (i + 1) % 4; if (canPlay(st.pc, st.ord[i])) break; }
        st.tix = i; st.mover = st.ord[i];
      }
      st.extra = false;
      startThrow(st);
    }
  }
  const auto = st => (st.over ? null : st.phase === "reveal" ? 1900 : st.phase === "moved" ? 1200 : null);
  const over = st => !!st.over;
  // 등수: 이긴 팀 탈락후보 0 · 이긴 팀 파트너 1 · 진 팀 파트너 2 · 진 팀 탈락후보(탈락) 3
  function ranks(st) {
    const r = [0, 0, 0, 0];
    if (!st.over) return r;
    const w = st.win, l = 1 - w;
    for (let s = 0; s < 4; s++) r[s] = st.team[s] === w ? (st.cand[w] === s ? 0 : 1) : (st.cand[l] === s ? 3 : 2);
    return r;
  }
  function legal(st, seat) {
    if (!needs(st).includes(seat)) return [];
    if (st.phase === "first") return [{ t: "first", v: 1 }, { t: "first", v: 0 }];
    if (st.phase === "stick") return [{ t: "stick", f: 1 }, { t: "stick", f: 0 }];
    if (st.phase === "move") return curMoves(st).map(p => ({ t: "move", p }));
    return [];
  }

  // ── 보이는 것 ─────────────────────────────────────────────
  // 4명의 앞/뒷면 선택은 모두 고르기 전엔 남에게 안 보여요 (picks: null = 아직 안 고름 · -1 = 골랐지만 안 보임 · 0/1 = 보임)
  function view(st, seat) {
    const all = seat === "all", shown = st.phase !== "first" && st.phase !== "stick";
    const picks = st.picks.map((f, i) => (f === null ? null : (shown || all || i === seat ? f : -1)));
    const score = [0, 1, 2, 3].map(s => (st.pc[s * 2] === DONE ? 1 : 0) + (st.pc[s * 2 + 1] === DONE ? 1 : 0));
    const pubObj = { p: st.phase, pc: st.pc, m: st.mover, tn: st.turn, pk: st.picks.map(x => x !== null), r: shown && st.res ? st.res.t : -1, o: st.over };
    return {
      n: 4, mate: st.mate, team: st.team, cand: st.cand, ord: st.ord, firstTeam: st.firstTeam, phase: st.phase, mover: st.mover, tix: st.tix,
      pc: st.pc.slice(), picks, picked: st.picks.map(x => x !== null), res: shown && st.res ? clone(st.res) : null, extra: shown ? st.extra : false,
      turn: st.turn, last: st.last ? clone(st.last) : null, hist: st.hist.slice(-12).map(h => ({ m: h.m, t: h.t, picks: h.picks.slice() })), fr: st.fr.slice(), nth: st.nth, stat: clone(st.stat),
      needs: needs(st), over: st.over, win: st.over ? st.win : -1, ranks: st.over ? ranks(st) : null, score,
      log: st.log.slice(-30), seat, pub: hash(JSON.stringify(pubObj)),
    };
  }
  const moveList = V => (V.res && (V.phase === "move" || V.phase === "reveal") ? legalMoves(V.pc, V.mover, V.res.k) : []);

  // ── 평가식 (AI · 선생님이 같이 씀 · 보이는 것만) ───────────────────────
  const WP = 0.08, TAU = 0.5, CAPX = 1.8, XB = 1.6, TW = [1, 0.55, 0.4, 0.3], WIN = 1000;
  const PK = { 2: 0.375, 3: 0.25, 4: 0.0625, 5: 0.0625 };
  function hubBonus(r, i) {              // 곧 모서리 · 가운데에 멈출 가능성 (지름길로 아끼는 칸 × 그 칸이 나올 확률)
    let d, save;
    if (r === 0) { if (i < 4) { d = 4 - i; save = 4; } else if (i >= 5 && i < 9) { d = 9 - i; save = 4; } else return 0; }
    else if (r === 1 && i >= 4 && i < 7) { d = 7 - i; save = 5; }
    else return 0;
    return (PK[d] || 0) * save;
  }
  function pieceVal(c) {
    if (c === HOME) return 0;
    if (c === DONE) return 22;
    const r = (c / 20) | 0, i = c % 20;
    return 20 - dist(c) + hubBonus(r, i);
  }
  function prog(S, t) {
    let sc = 0;
    for (let s = 0; s < 4; s++) if (S.team[s] === t) { const w = S.cand[t] === s ? 1 : WP; sc += w * (pieceVal(S.pc[s * 2]) + pieceVal(S.pc[s * 2 + 1])); }
    return sc;
  }
  // 팀 t 가 다음 던지기들에서 상대 말을 잡을 수 있는 기대 이익 (지금 차례에서 먼 사람일수록 덜 쳐 줌)
  function threat(S, t) {
    const pos = S.pc, mi = S.ord.indexOf(S.mover);
    let tot = 0;
    for (let s = 0; s < 4; s++) {
      if (S.team[s] !== t) continue;
      const w = TW[(S.ord.indexOf(s) - mi + 4) % 4];
      for (let t2 = 0; t2 < 5; t2++) {
        const k = RES[t2].k, mv = legalMoves(pos, s, k);
        for (let a = 0; a < mv.length; a++) {
          const c = pos[s * 2 + mv[a]], nc = stepOf(c, k);
          if (nc === DONE) continue;
          const nd = nodeOf(nc);
          let g = 0;
          for (let o = 0; o < 8; o++) {
            const so = o >> 1, co = pos[o];
            if (S.team[so] === t || co === HOME || co === DONE || nodeOf(co) !== nd) continue;
            g += (S.cand[1 - t] === so ? 1 : WP) * pieceVal(co);
          }
          if (g > 0) tot += w * P5[t2] * (g + CAPX);
        }
      }
    }
    return tot;
  }
  function evalS(S, t, simple) {
    if (wonBy(S.pc, S.cand, t)) return WIN;
    if (wonBy(S.pc, S.cand, 1 - t)) return -WIN;
    const base = prog(S, t) - prog(S, 1 - t);
    return simple ? base : base + TAU * (threat(S, t) - threat(S, 1 - t));
  }
  const cloneS = S => ({ pc: S.pc.slice(), team: S.team, cand: S.cand, ord: S.ord, mover: S.mover });
  const fromView = V => ({ pc: V.pc.slice(), team: V.team, cand: V.cand, ord: V.ord, mover: V.mover });

  function posValue(S, seat, extra, depth, simple) {   // 움직인 뒤 모습의 값 (seat 팀 쪽에서 본)
    const tm = S.team[seat];
    S.mover = extra && canPlay(S.pc, seat) ? seat : nextSeat(S, seat);
    if (depth <= 1) return evalS(S, tm, simple) + (extra && canPlay(S.pc, seat) ? XB : 0);   // 말이 다 들어온 사람은 한 번 더를 못 받음
    const nx = S.mover; let ev = 0;
    for (let t2 = 0; t2 < 5; t2++) { const r = bestMove(S, nx, RES[t2].k, depth - 1, simple); ev += P5[t2] * (S.team[nx] === tm ? r.val : -r.val); }
    return ev;
  }
  // seat 가 결과 k 로 둘 수 있는 가장 좋은 이동 (depth = 몇 번 앞까지 볼지) → { val: seat 팀 쪽에서 본 값, p }
  function bestMove(S, seat, k, depth, simple) {
    const tm = S.team[seat], mv = legalMoves(S.pc, seat, k), exK = k === 5 || k === 4;
    if (!mv.length) return { val: posValue(cloneS(S), seat, false, depth, simple), p: -1, vals: [] };
    let best = -Infinity, bp = mv[0]; const vals = [];
    for (let a = 0; a < mv.length; a++) {
      const S2 = cloneS(S), r = doMove(S2, seat, mv[a], k);
      const v = wonBy(S2.pc, S2.cand, tm) ? WIN : posValue(S2, seat, exK || r.cap.length > 0, depth, simple);
      vals.push({ p: mv[a], v });
      if (v > best + 1e-9) { best = v; bp = mv[a]; }
    }
    return { val: best, p: bp, vals };
  }

  // ── AI ───────────────────────────────────────────────────
  const FIRST_PICK = 0;                  // AI 가 고르는 선/후 (선 = 0) — 방송은 선이 불리하다는 평이지만 우리 판은 AI 끼리 1만 2천 판에서 먼저 던진 쪽이 51.6% 라 선을 골라요 (selftest 가 다시 재요)
  function conv3(q) {                    // 다른 3명 중 앞면을 낸 사람 수의 분포
    let d = [1];
    for (const x of q) { const n = Array(d.length + 1).fill(0); for (let i = 0; i < d.length; i++) { n[i] += d[i] * (1 - x); n[i + 1] += d[i] * x; } d = n; }
    return d;
  }
  // 단계별 설정: sd = 윷 고를 때 몇 번 앞까지 · md = 말 고를 때 · simple = 잡힐 위험을 안 따짐 · learn = 상대의 앞/뒷면 습관을 읽음 · tau = 선택이 흔들리는 폭
  const TIERCFG = { normal: { sd: 1, md: 1, simple: true, learn: false, tau: 1.6 }, hard: { sd: 2, md: 3, simple: false, learn: true, tau: 0.9 } };
  // 앞면(1) · 뒷면(0) 을 냈을 때 내 팀 쪽에서 본 기대값 (나머지 3명이 앞면을 낼 확률 q 로)
  function stickEval(V, seat, tier) {
    const C = TIERCFG[tier] || TIERCFG.normal;
    const S = fromView(V), mover = V.mover, tm = V.team[seat], sign = V.team[mover] === tm ? 1 : -1;
    const val = [0, 1, 2, 3, 4].map(t => sign * bestMove(cloneS(S), mover, RES[t].k, C.sd, C.simple).val);
    const others = [0, 1, 2, 3].filter(s => s !== seat);
    let q = [0.5, 0.5, 0.5];
    const ev = Q => [0, 1].map(f => { let e = 0; for (let s = 0; s < Q.length; s++) e += Q[s] * val[f + s]; return e; });
    let e = ev(conv3(q));
    if (C.learn) {
      const d = e[1] - e[0], push = Math.tanh(d / 1.5), n = V.nth || 0;
      q = others.map(j => { const emp = ((V.fr && V.fr[j]) + 6) / (n + 12), s = V.team[j] === tm ? 1 : -1; return Math.max(0.12, Math.min(0.88, emp + 0.06 * s * push)); });
      e = ev(conv3(q));
    }
    return { ev: e, val, q, sign };
  }
  function ai(V, seat, tier, r) {
    r = r || Math.random;
    if (V.over || !V.needs || !V.needs.includes(seat)) return null;
    if (V.phase === "first") return { t: "first", v: tier === "easy" ? (r() < 0.5 ? 0 : 1) : FIRST_PICK };
    if (V.phase === "stick") {
      if (tier === "easy") return { t: "stick", f: r() < 0.6 ? 1 : 0 };           // 초급은 앞면을 좋아해요
      const e = stickEval(V, seat, tier).ev, tau = (TIERCFG[tier] || TIERCFG.normal).tau;   // 비밀 동시 선택이라 늘 같은 쪽만 내면 읽혀요 → 차이가 클수록 그쪽을 더 자주
      return { t: "stick", f: r() < 0.5 + 0.5 * Math.tanh((e[1] - e[0]) / tau) ? 1 : 0 };
    }
    if (V.phase === "move") {
      const mv = moveList(V); if (!mv.length) return null;
      if (mv.length === 1) return { t: "move", p: mv[0] };
      if (tier === "easy") {
        if (r() < 0.35) return { t: "move", p: mv[Math.floor(r() * mv.length)] };         // 뻔한 실수는 초급만
        return { t: "move", p: bestMove(fromView(V), seat, V.res.k, 1, true).p };
      }
      const C = TIERCFG[tier] || TIERCFG.normal;
      return { t: "move", p: bestMove(fromView(V), seat, V.res.k, C.md, C.simple).p };
    }
    return null;
  }

  // ── 글 도우미 (조사는 받침에 맞춰요) ──────────────────────────
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function hasFinal(w) {
    const t = String(w).replace(/[^가-힣0-9A-Za-z]+$/, ""); if (!t) return false;
    const c = t[t.length - 1], code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 !== 0;
    if (c >= "0" && c <= "9") return "013678".indexOf(c) >= 0;
    return "lmnrLMNR".indexOf(c) >= 0;
  }
  const pct = x => Math.round(x * 100) + "%";
  const cl = x => Math.max(-40, Math.min(40, x));
  const sg = x => (x >= 0 ? "+" : "−") + Math.abs(cl(x)).toFixed(1);
  const NODEN = { 0: "출발점", 5: "오른쪽 위 모서리", 10: "왼쪽 위 모서리", 15: "왼쪽 아래 모서리", 22: "가운데" };
  const FIRST_WIN = 0.516;               // AI 끼리 1만 2천 판에서 먼저 던진 쪽이 이긴 비율 (test/gn-yut_selftest.js 가 작은 표본으로 다시 확인)

  // ── 선생님 · 복기 도우미 (보이는 것만 씀 — 남의 비밀 선택은 view 에 없어요) ───────────
  const P3 = [1, 3, 3, 1].map(x => x / 8);
  const progOf = c => (c === HOME ? 0 : 20 - dist(c));
  function outcomesFor(S, seat) {        // 앞면 수 t 마다 seat 이 둘 수 있는 것: 잡기 · 들어옴 · 움직일 말 없음
    const out = [];
    for (let t = 0; t < 5; t++) {
      const k = RES[t].k, mv = legalMoves(S.pc, seat, k);
      let cap = 0, done = 0;
      for (const p of mv) { const r = doMove(cloneS(S), seat, p, k); if (r.cap.length > cap) cap = r.cap.length; if (r.done > done) done = r.done; }
      out.push({ t, k, cap, done, none: mv.length === 0, ex: !!RES[t].ex });
    }
    return out;
  }
  function riskOn(S, atk, defTeam) {     // atk 이 한 번 던져서 defTeam 의 말을 잡을 위험 → { any, list:[{i, prob, prog}] }
    const hit = {}; let any = 0;
    for (let t = 0; t < 5; t++) {
      const k = RES[t].k, got = new Set();
      for (const p of legalMoves(S.pc, atk, k)) for (const i of doMove(cloneS(S), atk, p, k).cap) if (S.team[(i / 2) | 0] === defTeam) got.add(i);
      if (got.size) any += P5[t];
      for (const i of got) hit[i] = (hit[i] || 0) + P5[t];
    }
    const list = Object.keys(hit).map(i => ({ i: +i, prob: hit[i], prog: progOf(S.pc[+i]) })).sort((a, b) => b.prob * b.prog - a.prob * a.prog);
    return { any, list };
  }
  function nextOf(V, from, pred) {
    const o = V.ord; let i = o.indexOf(from);
    for (let n = 0; n < 4; n++) { i = (i + 1) % 4; if (canPlay(V.pc, o[i]) && pred(o[i])) return o[i]; }
    return -1;
  }
  function distF(f) { const d = [0, 0, 0, 0, 0]; for (let s = 0; s < 4; s++) d[f + s] += P3[s]; return d; }
  // 앞면(1) · 뒷면(0) 을 낼 때: 나머지 셋이 50:50 이라고 보고 결과 분포 · 잡기 · 한 번 더 · 뒷도 확률
  function stickFacts(V, seat, tier) {
    const S = fromView(V), mover = V.mover, oc = outcomesFor(S, mover), se = stickEval(V, seat, tier || "hard");
    const f = [0, 1].map(fv => {
      const d = distF(fv); let cap = 0, extra = 0, back = 0, k = 0, fin = 0;
      for (let t = 0; t < 5; t++) { if (oc[t].cap) cap += d[t]; if (oc[t].done) fin += d[t]; if (RES[t].ex) extra += d[t]; if (t === 1) back += d[t]; k += d[t] * (oc[t].none ? 0 : RES[t].k); }      // 움직일 말이 없으면 0칸
      return { d, cap, extra, back, k, fin, ev: se.ev[fv] };
    });
    return { f, mover, oc, mine: V.team[mover] === V.team[seat], se };
  }
  // 말 p 를 움직이면 어떻게 되나 (view 의 결과 V.res 로)
  function moveFacts(V, seat, p) {
    const S = fromView(V), k = V.res.k, c0 = S.pc[seat * 2 + p], S2 = cloneS(S), r = doMove(S2, seat, p, k);
    const r0 = c0 === HOME ? 0 : (c0 / 20) | 0, r1 = r.nc === DONE ? -1 : (r.nc / 20) | 0;
    const tags = [];
    if (r.cap.length) tags.push(`상대 말 ${r.cap.length}개 잡기`);
    if (r.done) tags.push(`${r.done}개 들어와요`);
    if (r.carry) tags.push("같은 사람의 말을 업어요");
    if (r.nc !== DONE && r0 === 0 && (r1 === 1 || r1 === 2) && (r.to === 5 || r.to === 10)) tags.push("모서리에 멈춰 지름길을 타요");
    else if (r.nc !== DONE && r1 === 3 && r.to === 22 && r0 !== 3) tags.push("가운데에 멈춰 곧장 도착 쪽으로 가요");
    if (V.res.k < 0 && r.nc === DONE) tags.push("뒷도로 한 바퀴를 채워요");
    let risk = 0;                        // 바로 다음 던지기에서 움직인 말이 잡힐 확률 (한 번 더 받으면 곧바로 상대 차례가 아니라 안 셈)
    if (r.nc !== DONE && !r.cap.length && !V.res.ex) {
      const nx = nextSeat(S2, seat);
      if (S2.team[nx] !== S2.team[seat]) for (const x of riskOn(S2, nx, S2.team[seat]).list) if (r.unit.some(u => x.i === seat * 2 + u)) risk = Math.max(risk, x.prob);
    }
    return { p, c0, from: r.from, to: r.to, nc: r.nc, cap: r.cap.length, done: r.done, carry: r.carry, tags, risk, k };
  }
  const moveLine = (V, seat, p, mf) => `${p + 1}번 말 · ${mf.tags.length ? mf.tags.join(" · ") : mf.nc === DONE ? "들어와요" : `${mf.k < 0 ? "한 칸 뒤로" : `${mf.k}칸 앞으로`}${NODEN[mf.to] ? ` (${NODEN[mf.to]})` : ""}`}${mf.risk > 0.005 ? ` · 잡힐 위험 ${pct(mf.risk)}` : ""}`;

  function coach(V, me, since, names) {
    names = Array.isArray(names) ? names : [];
    const nm = s => (s === me ? "나" : (names[s] || `${s + 1}번`));
    const W = (s, j) => {
      if (s === me) return { eun: "나는", iga: "내가", eul: "나를", wa: "나와", ui: "내" }[j];
      const n = names[s] || `${s + 1}번`, f = hasFinal(n);
      return esc(n) + { eun: f ? "은" : "는", iga: f ? "이" : "가", eul: f ? "을" : "를", wa: f ? "과" : "와", ui: "의" }[j];
    };
    const myT = V.team[me], opT = 1 - myT, S = fromView(V), ph = V.phase;
    const remain = s => dist(V.pc[s * 2]) + dist(V.pc[s * 2 + 1]);
    const home = s => (V.pc[s * 2] === DONE ? 1 : 0) + (V.pc[s * 2 + 1] === DONE ? 1 : 0);
    const mateOf = s => partnerOf(V.team, s);
    const seatTxt = s => `${esc(nm(s))}(들어온 ${home(s)}/2 · 남은 ${remain(s)}칸)`;
    const myC = V.cand[myT], opC = V.cand[opT], gap = remain(opC) - remain(myC);
    const label = i => `${W((i / 2) | 0, "ui")} ${(i % 2) + 1}번 말`;
    // 👀 상대 흐름
    const opSeats = [0, 1, 2, 3].filter(s => V.team[s] === opT);
    const op = [`상대 팀 후보 ${seatTxt(opC)} · 짝 ${seatTxt(mateOf(opC))}`];
    if (V.nth >= 3) op.push(`지금까지 앞면을 낸 비율 ${opSeats.map(s => `${esc(nm(s))} ${pct(V.fr[s] / V.nth)}`).join(" · ")} (${V.nth}번 중)`);
    // 다음에 던지는 사람: 지금 윷을 고르는 중이면 차례인 사람, 이미 던졌으면(공개 · 말 고르기 · 이동 뒤) 한 번 더를 받을 때만 같은 사람, 아니면 다음 순서
    const again = ph === "stick" || (ph === "moved" ? V.extra : !!(V.res && V.res.ex)), th = V.over ? -1 : (again && canPlay(V.pc, V.mover) ? V.mover : nextOf(V, V.mover, () => true));
    const ts = th < 0 ? -1 : (V.team[th] !== myT ? th : nextOf(V, th, s => V.team[s] !== myT));
    let rk = null;
    if (ts >= 0) {
      rk = riskOn(S, ts, myT);
      const w = rk.list[0];
      op.push(w ? `${ph === "stick" && ts === V.mover ? "이번에" : "다음에"} ${W(ts, "iga")} 던져서 우리 말을 잡을 확률 ${pct(rk.any)} — 가장 아까운 건 ${label(w.i)}(${w.prog}칸 진행, ${pct(w.prob)})` : "지금은 상대가 한 번 던져서 우리 말을 잡을 수 있는 자리가 없어요 (0%)");
    }
    // 📊 내 흐름
    const mn = [`우리 팀 후보 ${seatTxt(myC)} · 짝 ${seatTxt(mateOf(myC))} — 상대 후보와 견주면 ${gap > 0 ? `${gap}칸 앞서요` : gap < 0 ? `${-gap}칸 뒤져요` : "똑같아요"}`];
    if (me !== myC) mn.push(`나는 짝이에요 — 승패는 ${W(myC, "ui")} 말 둘이 먼저 들어오느냐로 정해져요 (내 말은 돕는 데 써요)`);
    const as = th < 0 ? -1 : (V.team[th] === myT ? th : nextOf(V, th, s => V.team[s] === myT));
    if (as >= 0) { const o = outcomesFor(S, as); const pcap = o.reduce((a, x) => a + (x.cap ? P5[x.t] : 0), 0); mn.push(pcap > 0 ? `${ph === "stick" && as === V.mover ? "이번에" : "다음에"} ${W(as, "iga")} 던져서 상대 말을 잡을 확률 ${pct(pcap)}` : "지금은 우리가 한 번 던져서 상대 말을 잡을 수 있는 자리가 없어요 (0%)"); }
    const base = { opp: op.join(" · "), mine: mn.join(" · ") };
    // 💡 추천 · 👉 이 수의 의미
    if (V.over) {
      const won = V.win === myT;
      return { opp: base.opp, mine: base.mine, rec: won ? "이겼어요! 🎉 후보의 말 둘이 먼저 들어왔어요" : "졌어요 — 상대 후보의 말 둘이 먼저 들어왔어요", why: `잡기: 우리 팀 ${V.stat.cap[myT]}번 · 상대 팀 ${V.stat.cap[opT]}번 · 던진 횟수 ${V.stat.throws}번` };
    }
    if (ph === "first") {
      const ch = V.needs.includes(me);
      if (!ch) return { opp: base.opp, mine: base.mine, rec: `${W(V.needs[0] || 0, "iga")} 선 · 후를 고르고 있어요 — 기다려요`, why: `AI 끼리 시험하니 먼저 던지는 쪽이 약 ${pct(FIRST_WIN)} 이겼어요 (거의 반반)` };
      return { opp: base.opp, mine: base.mine, rec: FIRST_WIN >= 0.5 ? "선(먼저 던지기)을 골라요 — 아주 조금 유리해요" : "후(나중에 던지기)를 골라요 — 아주 조금 유리해요",
        why: `우리 판에서 AI 끼리 1만 2천 판을 돌려 보니 먼저 던진 쪽이 약 ${pct(FIRST_WIN)} 이겼어요 — 방송에서는 선이 불리하다는 말이 있었지만 우리 판은 거의 반반이에요 (아주 조금 선이 나아요)` };
    }
    if (ph === "stick") {
      const sf = stickFacts(V, me), e = [sf.f[0].ev, sf.f[1].ev], best = e[1] >= e[0] ? 1 : 0, gp = Math.abs(e[1] - e[0]);
      const mvNm = sf.mover === me ? "내가" : sf.mine ? `우리 쪽 ${W(sf.mover, "iga")}` : `상대 쪽 ${W(sf.mover, "iga")}`;
      const picked = V.picked[me];
      const fa = (f, tag) => `${tag}이면 말 잡기 ${pct(sf.f[f].cap)} · 한 번 더(모·윷) ${pct(sf.f[f].extra)} · 뒷도 ${pct(sf.f[f].back)} · 평균 ${sf.f[f].k.toFixed(1)}칸`;
      const why = `${mvNm} 말을 움직여요. (확률은 나머지 셋이 반반으로 낸다고 본 값) ${fa(1, "앞면")} / ${fa(0, "뒷면")}${sf.mine ? " (우리 쪽 차례니 잡기 · 한 번 더가 클수록 좋아요)" : " (상대 쪽 차례니 잡기 · 한 번 더가 작을수록 좋아요)"}`;
      if (picked) return { opp: base.opp, mine: base.mine, rec: `내 선택은 골랐어요 (숨겨져 있어요) — 나머지가 고르면 던져져요 · 던진 뒤 말판 점수 기대값: 앞면 ${sg(e[1])} · 뒷면 ${sg(e[0])} (우리 − 상대, 칸 환산)`, why };
      const rec = gp < 0.4 ? `앞면 ${sg(e[1])} · 뒷면 ${sg(e[0])} (던진 뒤 말판 점수 기대값, 칸 환산) — 차이 ${gp.toFixed(1)}칸이라 거의 같아요. 늘 같은 쪽만 내면 읽히니 가끔 섞어요`
        : `${best ? "앞면" : "뒷면"}을 내요 — 반대쪽보다 기대 ${gp.toFixed(1)}칸 어치 나아요 (말판 점수 ${best ? "앞면" : "뒷면"} ${sg(e[best])} · ${best ? "뒷면" : "앞면"} ${sg(e[1 - best])}, 칸 환산)`;
      return { opp: base.opp, mine: base.mine, rec, why };
    }
    if (ph === "reveal" || ph === "moved") {
      const r = V.res, lt = V.last, who = W(V.mover, "iga");
      const front = [0, 1, 2, 3].filter(s => V.picks[s] === 1).map(s => esc(nm(s))), back = [0, 1, 2, 3].filter(s => V.picks[s] === 0).map(s => esc(nm(s)));
      const tx = r ? `앞면 ${r.t}개(${front.join("·") || "없음"}) · 뒷면 ${4 - r.t}개(${back.join("·") || "없음"}) → ${r.n}` : "";
      if (ph === "reveal") return { opp: base.opp, mine: base.mine, rec: moveList(V).length ? `${who} 곧 말을 움직여요 — 잠깐만 기다려요` : `${who} 움직일 말이 없어 이번 차례는 넘어가요`, why: tx };
      const what = !lt ? "" : lt.pass ? "움직일 말이 없어 넘어갔어요" : lt.cap && lt.cap.length ? `상대 말 ${lt.cap.length}개를 잡았어요 (한 번 더)` : lt.done ? `${lt.done}개가 들어왔어요` : "말을 옮겼어요";
      return { opp: base.opp, mine: base.mine, rec: `${V.extra ? `${who} 한 번 더 던져요` : "곧 다음 차례예요"} — 기다려요`, why: `${tx}${what ? ` · ${esc(nm(V.mover))}: ${what}` : ""}` };
    }
    if (ph === "move") {
      const mv = moveList(V);
      if (V.mover !== me || !V.needs.includes(me)) return { opp: base.opp, mine: base.mine, rec: `${W(V.mover, "iga")} 어느 말을 움직일지 고르고 있어요 — 기다려요`, why: `던진 결과는 ${V.res.n}(${V.res.k < 0 ? "한 칸 뒤로" : `${V.res.k}칸`})${V.res.ex ? " · 한 번 더" : ""}예요` };
      const br = bestMove(S, me, V.res.k, TIERCFG.hard.md, false), fs = mv.map(p => ({ p, v: (br.vals.find(x => x.p === p) || { v: -Infinity }).v, mf: moveFacts(V, me, p) }));
      fs.sort((a, b) => b.v - a.v);
      const top = fs[0], rest = fs.slice(1);
      return { opp: base.opp, mine: base.mine,
        rec: `${top.p + 1}번 말을 움직여요 — ${top.mf.tags.length ? top.mf.tags.join(" · ") : `${V.res.k < 0 ? "한 칸 뒤로" : `${V.res.k}칸 앞으로`}`} (던진 뒤 말판 점수 기대값 ${sg(top.v)}${rest.length ? ` · 다른 말 ${sg(rest[0].v)}` : ""}, 칸 환산)`,
        why: `${V.res.n}(${V.res.k < 0 ? "한 칸 뒤로" : `${V.res.k}칸`})${V.res.ex ? " · 한 번 더" : ""} — ${fs.map(x => moveLine(V, me, x.p, x.mf)).join(" / ")}` };
    }
    return { opp: base.opp, mine: base.mine, rec: "잠깐만 기다려요", why: "" };
  }

  // 🎞️ 복기: 행동 한 줄 글 · 두 수 견주기
  function actText(a, V, names) {
    if (!a || typeof a !== "object") return "—";
    if (a.t === "first") return a.v === 0 ? "선 고르기 (먼저 던지기)" : a.v === 1 ? "후 고르기 (나중에 던지기)" : "—";
    if (a.t === "stick") return a.f === 1 ? "앞면 내기" : a.f === 0 ? "뒷면 내기" : "—";
    if (a.t === "move" && Number.isInteger(a.p) && a.p >= 0 && a.p < NPIECE) {
      let tail = "";
      try {
        if (V && V.res && V.pc && typeof V.mover === "number" && V.phase === "move") { const mf = moveFacts(V, V.mover, a.p); tail = ` · ${V.res.n}${mf.tags.length ? " · " + mf.tags.join(" · ") : ""}`; }
      } catch (e) { tail = ""; }
      return `${a.p + 1}번 말 움직이기${tail}`;
    }
    return "—";
  }
  // 내 수와 고급 AI 수의 기대 점수 차 (칸 환산) → ui.review 가 글로 만들어요
  function compareActs(V, seat, myA, bestA) {
    if (!V || !myA || !bestA || myA.t !== bestA.t || V.over) return null;
    if (myA.t === "stick" && V.phase === "stick") {
      const sf = stickFacts(V, seat, "hard"), f = a => (a.f === 1 ? 1 : 0);
      return { kind: "stick", mine: sf.f[f(myA)].ev, best: sf.f[f(bestA)].ev, sf, fm: f(myA), fb: f(bestA) };
    }
    if (myA.t === "move" && V.phase === "move" && V.res && Number.isInteger(myA.p) && Number.isInteger(bestA.p)) {
      const r = bestMove(fromView(V), seat, V.res.k, TIERCFG.hard.md, false), pv = p => { const x = r.vals.find(y => y.p === p); return x ? x.v : null; };
      const m = pv(myA.p), b = pv(bestA.p); if (m === null || b === null) return null;
      return { kind: "move", mine: m, best: b, mf: moveFacts(V, seat, myA.p), bf: moveFacts(V, seat, bestA.p) };
    }
    return null;
  }

  return { id: "gn-yut", ROUTE, LEN, HOME, DONE, RES, P5, nodeOf, stepFwd, stepBack, stepOf, dist, kName, roles, partnerOf, unitOf, legalMoves, doMove, wonBy, canPlay, nextSeat,
    init, needs, apply, view, over, ranks, legal, auto, advance, moveList, ai, TIERCFG, stickEval, bestMove, evalS, fromView, cloneS, pieceVal, threat, prog, hash, clone, FIRST_PICK,
    coach, actText, compareActs, stickFacts, moveFacts, outcomesFor, riskOn, hasFinal, esc, pct, sg, cl, NODEN, FIRST_WIN };
});

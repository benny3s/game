/* 바둑 친구랑·AI 선생님 — 자리 정하기 · 구경꾼 · 상태 묶음(늦게 온 사람용) · 추천 수 까닭. 화면과 상관없는 순수 함수 (Node 시험도 같은 코드)
   두는 사람 = 방장 + 가장 먼저 들어온 친구 (들어온 시각 t 순), 나머지는 모두 구경 */
(function (root) {
  "use strict";
  // 들어온 순서 (방장이 맨 앞, 나머지는 t → uid)
  function order(players, host) {
    return Object.keys(players || {}).sort((a, b) => (b === host) - (a === host) || ((players[a] || {}).t || 0) - ((players[b] || {}).t || 0) || (a < b ? -1 : a > b ? 1 : 0));
  }
  // 처음 자리: 방장 돌 hostColor(1 흑 · 2 백), 상대는 가장 먼저 온 친구 (구경만 원한 사람(watch) 은 빼고)
  function seatsFrom(players, host, hostColor = 1) {
    const hc = hostColor === 2 ? 2 : 1;
    const other = order(players, host).find(u => u !== host && !(players[u] || {}).watch) || null;
    return { [hc]: players && players[host] ? host : null, [3 - hc]: other };
  }
  // 한 판 더: 둘 다 있으면 돌 색을 바꾸고, 빠진 자리는 가장 먼저 온 구경꾼이 채움
  function nextSeats(seats, players, host) {
    const s = { 1: seats[2], 2: seats[1] };
    for (const c of [1, 2]) if (!s[c] || !players[s[c]]) s[c] = null;
    for (const c of [1, 2]) {
      if (s[c]) continue;
      const u = order(players, host).find(x => x !== s[1] && x !== s[2] && !(players[x] || {}).watch);
      s[c] = u || null;
    }
    return s;
  }
  // 한 판 더 자리 (방장이 고름): 색 바꾸기 · 남은 사람(오고 있거나 AI 가 대신 앉은 사람)은 그대로 · 빈자리는 '끼고 싶어요'(opt.pick) 한 구경꾼만, 들어온 순서대로
  //   opt = { sub: { uid: true } AI 가 대신 앉은 사람, pick: { uid: true } 끼고 싶은 구경꾼 }
  function nextSeatsPick(seats, players, host, opt) {
    opt = opt || {};
    const here = u => !!u && (!!(players && players[u]) || !!(opt.sub && opt.sub[u]));
    const s = { 1: seats[2], 2: seats[1] };
    for (const c of [1, 2]) if (!here(s[c])) s[c] = null;
    for (const c of [1, 2]) {
      if (s[c]) continue;
      const u = order(players, host).find(x => x !== s[1] && x !== s[2] && opt.pick && opt.pick[x]);
      s[c] = u || null;
    }
    return s;
  }
  // 빈자리 수: 다음 판에 구경꾼이 앉을 수 있는 자리 (나간 사람 자리)
  function freeSeats(seats, players, sub) {
    const here = u => !!u && (!!(players && players[u]) || !!(sub && sub[u]));
    return [1, 2].filter(c => !here(seats && seats[c])).length;
  }
  const seatOf = (seats, uid) => (uid && seats && seats[1] === uid ? 1 : uid && seats && seats[2] === uid ? 2 : 0);
  const full = seats => !!(seats && seats[1] && seats[2]);
  // 구경꾼 목록 (들어온 순)
  function spectators(players, seats, host) {
    return order(players, host).filter(u => !seatOf(seats, u)).map(u => ({ uid: u, name: (players[u] || {}).name || "?" }));
  }
  // 이 사람이 지금 둘 수 있나 (방장이 친구의 수를 받을 때 확인)
  function canMove(seats, uid, st) { return !!(st && !st.over && seatOf(seats, uid) === st.toPlay); }
  // 수 메시지 확인: 차례인 사람 · 수 번호가 맞아야 (중복·늦은 메시지는 버림)
  function validMove(B, seats, uid, st, m) {
    return !!(m && canMove(seats, uid, st) && m.n === st.moves.length && Number.isInteger(m.a) && (m.a === st.size * st.size || B.isLegal(st, m.a)));
  }
  // 늦게 온 사람에게 보낼 묶음 / 되살리기
  function snap(B, g) {
    return { t: "snap", g: g.g, st: B.toJSON(g.st), phase: g.phase, dead: g.dead ? Array.from(g.dead) : null, seats: { 1: g.seats[1] || null, 2: g.seats[2] || null }, names: { 1: (g.names || {})[1] || "", 2: (g.names || {})[2] || "" } };
  }
  function restore(B, s) {
    return { g: s.g, st: B.fromJSON(s.st), phase: s.phase || "play", dead: s.dead ? Uint8Array.from(s.dead) : null, seats: s.seats || { 1: null, 2: null }, names: s.names || {} };
  }
  // 두는 두 사람 이름
  function names(players, seats) { return { 1: ((players || {})[seats[1]] || {}).name || "흑", 2: ((players || {})[seats[2]] || {}).name || "백" }; }

  // 추천 수의 까닭 한 줄 (그 수를 두면 생기는 일로) — AI 선생님 창
  //   opt.threat = { t, lab, sharp } 상대가 방금 수로 노리는 곳 (내가 손 빼면 둘 곳) · opt.own = 지금 판 소유 지도 (흑 +1 ~ 백 −1)
  const FX_TIP = { cap: n => `상대 돌 ${n}개를 따낼 수 있어요`, save: () => "단수에 걸린 내 돌을 살리는 자리예요", atari: () => "상대 돌을 단수로 몰아요 (숨구멍 하나)",
    cut: () => "상대 돌 사이를 끊어 약한 쪽을 노려요", connect: () => "떨어진 내 돌을 이어 튼튼하게 해요", eyeTake: () => "상대 눈 자리를 빼앗아 사활을 노려요",
    eyeMake: () => "눈을 만들어 내 돌을 살려요", press: () => "상대 돌 숨구멍을 줄여 몰아붙여요" };
  function coachWhy(B, st, a, opt = {}) {
    const N = st.size, th = opt.threat;
    if (a === N * N) return "더 둘 곳이 마땅치 않아요. 상대도 패스하면 집을 세요";
    if (th && th.t === a) return th.sharp ? `상대 노림(${th.lab})을 먼저 막는 자리예요` : "상대도 다음에 노리는 곳이에요 — 먼저 차지해요";
    const near = th && Math.abs(a % N - th.t % N) + Math.abs(((a / N) | 0) - ((th.t / N) | 0)) <= 2;   // 노림 바로 옆 = 받는 수
    const fx = moveFx(B, st, a, opt.own || null).filter(f => f.k !== "self");
    if (fx.length) return FX_TIP[fx[0].k](fx[0].n) + (th && th.sharp && !near ? ` — 상대 노림(${th.lab})보다 급해요` : "");
    if (th && th.sharp) return near ? `상대 노림(${th.lab}) 바로 옆을 먼저 지켜요` : `상대 노림(${th.lab})보다 이곳이 더 커요 — 받지 않고 손 빼도 돼요`;
    if (st.moves.length < N) return "판 초반엔 귀·변의 넓은 곳부터 차지해요";
    if (opt.own) {
      const oc = opt.own[a] * (st.toPlay === B.BLACK ? 1 : -1);
      return oc >= 0.45 ? "내 집 경계를 단단히 지키는 자리예요" : oc <= -0.45 ? "상대 집을 줄이는 자리예요" : "아직 주인 없는 큰 곳이에요 (자리 잡기)";
    }
    return "내 돌을 튼튼하게 잇고 집을 넓히는 자리예요";
  }

  // ── 🤔 노린 것 (복기): 실제로 둔 수가 바로 한 일 + 같은 쪽이 한 번 더 둔다면(상대가 손 뺀다면) 둘 곳(노림)
  //    판 위 사실(활로·사슬·눈 모양)로만 말함. 못 알아보면 소유 지도(own: 흑 +1 ~ 백 −1)로 집 지키기·줄이기·큰 곳
  // st 에서 둘 차례(c)가 a 를 두면 생기는 일 (중요한 순) — [{ k: "cap"|"save"|"atari"|"self"|"cut"|"connect"|"eyeTake"|"eyeMake"|"press", n }]
  function moveFx(B, st, a, own) {
    const N = st.size, c = st.toPlay, o = 3 - c, out = [];
    if (!(a >= 0 && a < N * N) || st.board[a] || !B.isLegal(st, a)) return out;
    const b = B.toBoard(st), i = b.ix(a), r = B.play(st, a), s1 = r.state, ev = r.events || [];
    const b1 = B.toBoard(s1);
    // 무리가 약한가: 소유 지도가 있으면 그 무리 평균이 덜 기울었을 때, 없으면 활로가 적을 때
    const weak = (bd, h, col) => {
      if (own) { let s = 0, n = 0; for (const j of bd.chain(h)) { s += own[bd.pt(j)] * (col === B.BLACK ? 1 : -1); n++; } return s / n < 0.55; }
      return bd.libs(h, 4) <= 3;
    };
    const cap = ev.find(e => e.type === "capture");
    if (cap) out.push({ k: "cap", n: cap.points.length });
    const inAt = B.ataris(st)[c];
    if (inAt.length) { const after = new Set(B.ataris(s1)[c]); const n = inAt.filter(p => s1.board[p] === c && !after.has(p)).length; if (n) out.push({ k: "save", n }); }
    const at = ev.find(e => e.type === "atari");
    if (at) out.push({ k: "atari", n: at.points.length });
    if (!cap && b1.libs(b1.head[b1.ix(a)], 2) === 1) out.push({ k: "self", n: b1.sz[b1.head[b1.ix(a)]] });
    const mine = new Set(), theirs = new Set();
    for (const d of b.adj) { const j = i + d; if (b.c[j] === c) mine.add(b.head[j]); else if (b.c[j] === o) theirs.add(b.head[j]); }
    let alive = 0; for (const h of theirs) if (s1.board[b.pt(h)] === o) alive++;
    if (alive >= 2) out.push({ k: "cut" });
    if (mine.size >= 2) out.push({ k: "connect" });
    // 눈: a 옆 빈칸이 a 때문에 내 눈이 됨(약한 내 무리) · a 만 빼면 사방이 상대 돌이던 빈칸(약한 상대 무리의 눈 자리)을 망침
    let eyeMake = 0, eyeTake = 0;
    for (const d of b.adj) {
      const j = i + d; if (b.c[j] !== B.EMPTY) continue;
      if (!b.isEye(j, c) && b1.isEye(j, c) && weak(b1, b1.head[b1.ix(a)], c)) eyeMake++;
      let ring = true, h = -1;
      for (const e of b.adj) { const v = b.c[j + e]; if (j + e === i || v === B.WALL) continue; if (v !== o) { ring = false; break; } h = b.head[j + e]; }
      if (ring && h >= 0 && s1.board[b.pt(h)] === o && weak(b1, b1.head[b1.ix(b.pt(h))], o)) eyeTake++;
    }
    if (eyeTake) out.push({ k: "eyeTake" });
    if (eyeMake) out.push({ k: "eyeMake" });
    for (const h of theirs) { const p = b.pt(h); if (s1.board[p] === o && b1.libs(b1.head[b1.ix(p)], 3) === 2 && b.libs(h, 3) > 2) { out.push({ k: "press" }); break; } }
    return out;
  }
  const FX_DONE = { cap: n => `상대 돌 ${n}점을 따냈어요`, save: () => "단수 걸린 내 돌을 살렸어요", atari: n => `상대 돌 ${n}점을 단수로 몰았어요`,
    self: () => "내 돌이 단수에 걸려 위험해요", cut: () => "상대 돌 사이를 끊었어요", connect: () => "떨어진 내 돌을 이었어요",
    eyeTake: () => "상대 눈 자리를 빼앗았어요 (사활)", eyeMake: () => "눈을 만들었어요 (사활)", press: () => "상대 돌 숨구멍을 둘로 줄였어요" };
  const FX_NEXT = { cap: n => `${n}점 따내기`, save: () => "내 돌 살리기", atari: () => "단수", cut: () => "끊기", connect: () => "잇기",
    eyeTake: () => "눈 빼앗기 (사활)", eyeMake: () => "눈 만들기 (사활)", press: () => "숨구멍 줄이기" };
  // 상대가 둔 수를 내 쪽에서 읽을 때 (opt.opp): '상대 돌' = 내 돌
  const FX_DONE_OPP = { cap: n => `내 돌 ${n}점을 따냈어요`, save: () => "단수 걸린 자기 돌을 살렸어요", atari: n => `내 돌 ${n}점을 단수로 몰았어요`,
    self: () => "자기 돌이 단수에 걸렸어요 (따낼 기회!)", cut: () => "내 돌 사이를 끊었어요", connect: () => "떨어진 자기 돌을 이었어요",
    eyeTake: () => "내 눈 자리를 빼앗았어요 (사활)", eyeMake: () => "자기 눈을 만들었어요 (사활)", press: () => "내 돌 숨구멍을 둘로 줄였어요" };
  const FX_NEXT_OPP = { cap: n => `내 돌 ${n}점 따내기`, save: () => "자기 돌 살리기", atari: () => "단수", cut: () => "끊기", connect: () => "잇기",
    eyeTake: () => "내 눈 빼앗기 (사활)", eyeMake: () => "자기 눈 만들기 (사활)", press: () => "내 숨구멍 줄이기" };
  // 한 줄로: st(실제 수 전) · a 실제 수 · t 노림(같은 쪽이 한 번 더 둔다면, 없으면 -1) · opt { own: 노림 판의 소유 지도, gain: 안 받으면 몇 집, name: 점 → 이름, opp: 상대 수를 내 쪽에서 읽음 }
  // → { done, next, text, lab, sharp }  (text 는 HTML 아님 · 이름은 name 이 준 그대로 · lab = 노림 이름, sharp = 판 위 사실로 알아본 노림)
  function aimWhy(B, st, a, t, opt = {}) {
    const N = st.size, c = st.toPlay, name = opt.name || (p => String(p));
    const DONE = opt.opp ? FX_DONE_OPP : FX_DONE, NEXT = opt.opp ? FX_NEXT_OPP : FX_NEXT;
    if (a === N * N) return { done: "패스했어요", next: "", text: "패스했어요", lab: "", sharp: false };
    const top = moveFx(B, st, a, null)[0];
    const ax = a % N, ay = (a / N) | 0, edge = Math.min(ax, ay, N - 1 - ax, N - 1 - ay);   // 판 끝에서 몇 줄 안쪽 (0 = 1선)
    let done = top ? DONE[top.k](top.n) : st.moves.length >= N || edge <= 1 ? ""
      : edge >= 4 || (N <= 7 && edge >= 3) ? "가운데 큰 곳을 차지했어요" : Math.max(ax, N - 1 - ax) >= N - 4 && Math.max(ay, N - 1 - ay) >= N - 4 ? "귀를 차지했어요" : "변의 넓은 곳을 차지했어요";
    let next = "", lab = "", sharp = false;                             // sharp = 판 위 사실로 알아본 노림 (따냄·단수·끊기·사활 …)
    const r = B.play(st, a), s1 = r.state;
    if (t >= 0 && t < N * N && !s1.over) {
      const sn = B.play(s1, N * N).state;                                // 상대가 손 뺐다고 보고 (패스) 같은 쪽 차례
      const ft = sn.over ? [] : moveFx(B, sn, t, opt.own).filter(f => f.k !== "self");
      if (ft.length) { lab = NEXT[ft[0].k](ft[0].n); sharp = true; }
      else {
        const oc = opt.own ? opt.own[t] * (c === B.BLACK ? 1 : -1) : 0;
        const x = t % N, y = (t / N) | 0;
        let nearMine = false;
        for (let dy = -2; dy <= 2 && !nearMine; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N && s1.board[Y * N + X] === c && Math.abs(dx) + Math.abs(dy) <= 2) { nearMine = true; break; } }
        lab = !opt.own ? (nearMine ? "모양 넓히기" : "큰 곳 (자리 잡기)") : oc >= 0.45 ? (opt.opp ? "자기 집 지키기" : "집 지키기") : oc <= -0.45 ? (opt.opp ? "내 집 줄이기" : "상대 집 줄이기") : nearMine ? "집 넓히기" : "큰 곳 (자리 잡기)";
      }
      next = `다음 ${name(t)} ${lab}`;
      if (sharp && opt.gain >= 3) next += ` (안 받으면 ${Math.round(opt.gain)}집쯤)`;   // 그냥 큰 곳은 한 수 값이 늘 커서 말하지 않음
    } else if (!s1.over) next = "다음에 급한 노림은 없어 보여요";
    return { done, next, text: [done, next].filter(Boolean).join(" · "), lab, sharp };
  }

  const API = { coachWhy, moveFx, aimWhy, order, seatsFrom, nextSeats, nextSeatsPick, freeSeats, seatOf, full, spectators, canMove, validMove, snap, restore, names };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.BadukRoom = API;
})(typeof window !== "undefined" ? window : globalThis);

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
  function coachWhy(B, st, a) {
    const N = st.size;
    if (a === N * N) return "더 둘 곳이 마땅치 않아요. 상대도 패스하면 집을 세요";
    const r = B.play(st, a), ev = r.events || [];
    const cap = ev.find(e => e.type === "capture"), at = ev.find(e => e.type === "atari");
    if (cap) return `상대 돌 ${cap.points.length}개를 따낼 수 있어요`;
    const me = st.toPlay, inAt = B.ataris(st)[me];
    if (inAt.length && r.state !== st) { const after = B.ataris(r.state)[me]; if (inAt.some(p => r.state.board[p] === me && !after.includes(p))) return "단수에 걸린 내 돌을 살리는 자리예요"; }
    if (at) return "상대 돌을 단수로 몰아요 (숨구멍 하나)";
    if (st.moves.length < N) return "판 초반엔 귀·변의 넓은 곳부터 차지해요";
    return "내 돌을 튼튼하게 잇고 집을 넓히는 자리예요";
  }

  const API = { coachWhy, order, seatsFrom, nextSeats, nextSeatsPick, freeSeats, seatOf, full, spectators, canMove, validMove, snap, restore, names };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.BadukRoom = API;
})(typeof window !== "undefined" ? window : globalThis);

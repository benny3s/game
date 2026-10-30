/* 친구랑 오목 — 자리 정하기 (화면 없음, node 시험에서도 씀)
   방장 먼저, 그다음 들어온 순서(t). 보통은 앞의 2명이 두고 나머지는 구경.
   상담(팀) 모드: 앞의 4명이 2:2 — 방장 팀 [1번째, 3번째] · 상대 팀 [2번째, 4번째], 같은 색끼리 번갈아 둠.
   seats = { 1: [흑 uid…], 2: [백 uid…], view: [구경 uid…] } */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OmokSeats = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 들어온 순서 (방장 먼저 · 같은 시각이면 uid 순)
  function order(players, host) {
    const pl = players || {};
    return Object.keys(pl).sort((a, b) => (b === host) - (a === host) || ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0) || (a < b ? -1 : a > b ? 1 : 0));
  }
  // 첫 판 자리
  function seat(players, host, hostColor, team) {
    const o = order(players, host), hc = hostColor === 2 ? 2 : 1, oc = 3 - hc;
    const n = team ? 4 : 2;
    const A = [], B = [];
    o.slice(0, n).forEach((u, i) => (i % 2 ? B : A).push(u));
    return { [hc]: A, [oc]: B, view: o.slice(n) };
  }
  // 지금 둘 사람: 색마다 자기 수 번호로 번갈아 (흑 k번째 수 = moves 2k, 백 = 2k+1 → floor(n/2) 가 그 색의 수 번호)
  function mover(seats, color, nMoves) {
    const l = seats && seats[color];
    return l && l.length ? l[Math.floor(nMoves / 2) % l.length] : null;
  }
  const colorOf = (seats, uid) => seats && seats[1] && seats[1].includes(uid) ? 1 : seats && seats[2] && seats[2].includes(uid) ? 2 : 0;
  const canMove = (seats, uid, s) => !!(s && !s.over && uid && mover(seats, s.turn, s.moves.length) === uid);
  // 나간 사람 빼기 → { seats, empty: 비어 버린 색(0 이면 없음) }
  function remove(seats, uid) {
    const out = { 1: seats[1].filter(u => u !== uid), 2: seats[2].filter(u => u !== uid), view: (seats.view || []).filter(u => u !== uid) };
    const empty = seats[1].includes(uid) && !out[1].length ? 1 : seats[2].includes(uid) && !out[2].length ? 2 : 0;
    return { seats: out, empty };
  }
  // 다음 판: 색을 바꾸고, 남아 있는 사람은 그대로, 빈자리는 구경하던 사람이 들어온 순서대로
  function reseat(prev, players, host, team) {
    const here = u => !!(players && players[u]);
    const s1 = (prev[2] || []).filter(here), s2 = (prev[1] || []).filter(here);   // 색 바꾸기
    const want = team ? 2 : 1;
    while (s1.length > want) s1.pop();
    while (s2.length > want) s2.pop();
    const q = order(players, host).filter(u => !s1.includes(u) && !s2.includes(u));
    while (q.length && (s1.length < want || s2.length < want)) (s1.length <= s2.length && s1.length < want ? s1 : s2).push(q.shift());
    return { 1: s1, 2: s2, view: q };
  }
  // 한 판 더 자리 (방장이 정함): 색 바꾸기 · 남은 사람(오고 있거나 AI 가 대신 앉은 사람)은 그대로 · 빈자리는 '끼고 싶어요'(opt.pick) 한 구경꾼만, 들어온 순서대로
  //   opt = { sub: { uid: true } AI 가 대신 앉은 사람, pick: { uid: true } 끼고 싶은 구경꾼 }
  function next(prev, players, host, team, opt) {
    opt = opt || {};
    const here = u => !!(players && players[u]) || !!(opt.sub && opt.sub[u]);
    const s1 = (prev[2] || []).filter(here), s2 = (prev[1] || []).filter(here);
    const want = team ? 2 : 1;
    while (s1.length > want) s1.pop();
    while (s2.length > want) s2.pop();
    const all = order(players, host).filter(u => !s1.includes(u) && !s2.includes(u));
    const q = all.filter(u => opt.pick && opt.pick[u]);
    while (q.length && (s1.length < want || s2.length < want)) (s1.length <= s2.length && s1.length < want ? s1 : s2).push(q.shift());
    const placed = new Set([...s1, ...s2]);
    return { 1: s1, 2: s2, view: all.filter(u => !placed.has(u)) };
  }
  // 빈자리 수: 다음 판에 구경꾼이 앉을 수 있는 자리 (나간 사람 자리 + 팀 빼기)
  function free(prev, players, team, sub) {
    const want = team ? 2 : 1, here = u => !!(players && players[u]) || !!(sub && sub[u]);
    return Math.max(0, want * 2 - [...(prev[1] || []), ...(prev[2] || [])].filter(here).length);
  }
  // 대기실 한 줄 설명
  function describe(n, team) {
    if (team) return n >= 4 ? `2:2 상담${n > 4 ? ` · ${n - 4}명 구경` : ''}` : n === 3 ? '3명이면 2:1 상담 (4명이면 2:2)' : '4명이면 2:2 상담';
    return n <= 2 ? '2명이 대국해요' : `2명 대국 · ${n - 2}명 구경`;
  }
  return { order, seat, mover, colorOf, canMove, remove, reseat, next, free, describe };
});

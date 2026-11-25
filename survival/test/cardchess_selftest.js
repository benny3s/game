// 카드 체스 규칙 시험 (node survival/test/cardchess_selftest.js)
'use strict';
const C = require('../games/cardchess/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clone = x => JSON.parse(JSON.stringify(x));
const J = JSON.stringify;
const ROOK = 0, BISHOP = 1, ATTACKER = 2, KNIGHT = 3, JUMPER = 4, QUEEN = 5;
const mvA = (slot, from, to) => ({ t: 'mv', slot, from, to });
// 빈 판 — 말 · 카드를 손으로 놓고 시험 (카드: 내 앞 두 장 · 상대 앞 두 장 · 대기)
function blank(hands = [[ROOK, BISHOP], [ATTACKER, KNIGHT]], wait = JUMPER, turn = 0, sets = 1) {
  const st = C.init({ n: 2, seed: 1, cfg: { sets } });
  st.cells.fill(0); st.face.fill(0); st.hand = [hands[0].slice(), hands[1].slice()]; st.wait = wait; st.turn = st.first = turn; st.tc = 0;
  return st;
}
const put = (st, cell, seat, face) => { st.cells[cell] = seat + 1; st.face[cell] = face || (seat === 0 ? -1 : 1); return st; };
const dests = (st, seat, slot, from) => C.legal(st, seat).filter(a => a.slot === slot && a.from === from).map(a => a.to).sort((a, b) => a - b);
const D = (...x) => J(x);

// 1) 시작
{
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const st = C.init({ n: 2, seed });
    ok(st.cells.slice(20).every(c => c === 1) && st.cells.slice(0, 5).every(c => c === 2) && st.cells.slice(5, 20).every(c => c === 0), '말 5개씩 첫 줄에 가득');
    ok(st.face.slice(20).every(f => f === -1) && st.face.slice(0, 5).every(f => f === 1), '서로 상대 쪽을 봄');
    ok(C.CASTLE[0] === 22 && C.CASTLE[1] === 2, '성 = 첫 줄 가운데');
    ok(st.turn === 0 && st.first === 0 && C.needs(st)[0] === 0, '선공 = 백(자리 0)');
    const all = [...st.hand[0], ...st.hand[1], st.wait].sort();
    ok(J(all) === D(0, 1, 2, 3, 4), '카드 5장이 앞 2 · 앞 2 · 대기 1 로 나뉨');
    seen.add(J([st.hand, st.wait]));
    ok(C.legal(st, 0).length > 0 && C.legal(st, 1).length === 0, '선공만 수가 있음');
  }
  ok(seen.size > 20, '씨앗마다 카드 배정이 다름');
  ok(J(C.init({ n: 2, seed: 5 })) === J(C.init({ n: 2, seed: 5 })), '같은 seed 는 같은 판');
  const V = C.view(C.init({ n: 2, seed: 2 }), 0);
  ok(V.counts[0] === 5 && V.counts[1] === 5 && V.set === 1 && V.sets === 1 && V.log[0].k === 'start', 'view 기본');
}

// 2) 카드별 이동
{
  const st = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(st, 12, 0); put(st, 0, 1);
  ok(D(...dests(st, 0, 0, 12)) === D(7, 11, 13, 17), '룩 = 상하좌우 1칸');
  ok(D(...dests(st, 0, 1, 12)) === D(6, 8, 16, 18), '비숍 = 대각선 1칸');
  put(st, 13, 0);
  ok(D(...dests(st, 0, 0, 12)) === D(7, 11, 17), '내 말 칸으로는 못 감');
  put(st, 13, 1);
  ok(D(...dests(st, 0, 0, 12)) === D(7, 11, 13, 17), '상대 말 칸으로는 감 (제거)');
  const e = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(e, 0, 0);
  ok(D(...dests(e, 0, 0, 0)) === D(1, 5) && D(...dests(e, 0, 1, 0)) === D(6), '모서리에서 판 밖으로 안 나감');

  // 어태커: 보는 쪽 직진 최대 2칸 + 앞 대각선 1칸
  const a = blank([[ATTACKER, ROOK], [BISHOP, KNIGHT]], JUMPER); put(a, 12, 0); put(a, 4, 1);
  ok(D(...dests(a, 0, 0, 12)) === D(2, 6, 7, 8), '어태커(위를 봄) = 직진 1~2칸 + 앞 대각선');
  put(a, 7, 0);
  ok(D(...dests(a, 0, 0, 12)) === D(6, 8), '앞 칸이 내 말이면 직진 못 하고 뛰어넘지도 못함');
  put(a, 7, 1);
  ok(D(...dests(a, 0, 0, 12)) === D(6, 7, 8), '앞 칸이 상대 말이면 그 말을 잡을 수만 있고 뛰어넘진 못함');
  const a2 = blank([[ATTACKER, ROOK], [BISHOP, KNIGHT]], JUMPER); put(a2, 12, 0); put(a2, 2, 0);
  ok(D(...dests(a2, 0, 0, 12)) === D(6, 7, 8), '두 칸 앞이 내 말이면 한 칸만');
  const a3 = blank([[ATTACKER, ROOK], [BISHOP, KNIGHT]], JUMPER); put(a3, 12, 0); put(a3, 2, 1); put(a3, 6, 0); put(a3, 8, 1);
  ok(D(...dests(a3, 0, 0, 12)) === D(2, 7, 8), '두 칸 앞 상대 말 잡기 · 앞 대각선에 내 말은 못 · 상대 말은 잡음');
  ok(!dests(a, 0, 0, 12).includes(17) && !dests(a, 0, 0, 12).includes(11), '어태커는 뒤나 옆으로 못 감');
  const a4 = blank([[BISHOP, ROOK], [ATTACKER, KNIGHT]], JUMPER, 1); put(a4, 12, 1); put(a4, 0, 0);
  ok(D(...dests(a4, 1, 0, 12)) === D(16, 17, 18, 22), '흑 어태커(아래를 봄)');
  const a5 = blank([[ATTACKER, ROOK], [BISHOP, KNIGHT]], JUMPER); put(a5, 7, 0); put(a5, 0, 1);
  ok(D(...dests(a5, 0, 0, 7)) === D(1, 2, 3), '위 끝 한 줄 앞이면 직진은 한 칸');
  const a6 = blank([[ATTACKER, ROOK], [BISHOP, KNIGHT]], JUMPER); put(a6, 2, 0, 1); put(a6, 24, 1);
  ok(D(...dests(a6, 0, 0, 2)) === D(6, 7, 8, 12), '돌아선 말(아래를 봄)의 어태커');

  // 나이트: 뛰어넘음
  const n = blank([[KNIGHT, ROOK], [BISHOP, ATTACKER]], JUMPER); put(n, 12, 0); put(n, 7, 1); put(n, 11, 0); put(n, 13, 1);
  ok(D(...dests(n, 0, 0, 12)) === D(1, 3, 5, 9, 15, 19, 21, 23), '나이트 = 2칸 직진 뒤 수직 1칸 (사이에 말이 있어도 뛰어넘음)');
  const n2 = blank([[KNIGHT, ROOK], [BISHOP, ATTACKER]], JUMPER); put(n2, 0, 0);
  ok(D(...dests(n2, 0, 0, 0)) === D(7, 11), '모서리 나이트');
  const n3 = blank([[KNIGHT, ROOK], [BISHOP, ATTACKER]], JUMPER); put(n3, 12, 0); put(n3, 1, 0); put(n3, 3, 1);
  ok(!dests(n3, 0, 0, 12).includes(1) && dests(n3, 0, 0, 12).includes(3), '나이트도 내 말 칸은 못 가고 상대 말은 잡음');

  // 점퍼: 붙어 있는 말을 뛰어넘어 바로 뒤 칸에
  const j = blank([[JUMPER, ROOK], [BISHOP, ATTACKER]], KNIGHT); put(j, 12, 0); put(j, 24, 1); put(j, 20, 0);
  ok(dests(j, 0, 0, 12).length === 0, '붙어 있는 말이 없으면 점퍼는 못 움직임');
  put(j, 7, 1);
  ok(D(...dests(j, 0, 0, 12)) === D(2), '위 칸 말을 뛰어넘어 2');
  put(j, 13, 0); put(j, 6, 1);
  ok(D(...dests(j, 0, 0, 12)) === D(0, 2, 14), '내 말 · 상대 말 가리지 않고 뛰어넘음 (대각선 포함)');
  put(j, 14, 0);
  ok(D(...dests(j, 0, 0, 12)) === D(0, 2), '착지 칸이 내 말이면 못 감');
  const j2 = blank([[JUMPER, ROOK], [BISHOP, ATTACKER]], KNIGHT); put(j2, 12, 0); put(j2, 7, 0); put(j2, 2, 1);
  ok(D(...dests(j2, 0, 0, 12)) === D(2), '착지 칸에 상대 말이 있으면 잡음');
  const jm = blank([[JUMPER, ROOK], [BISHOP, ATTACKER]], KNIGHT); put(jm, 12, 0); put(jm, 7, 1); put(jm, 2, 1);
  ok(C.apply(jm, 0, mvA(0, 12, 2)).ok && jm.cells[7] === 2 && jm.cells[2] === 1 && jm.cells[12] === 0, '뛰어넘은 말은 안 없어지고 착지 칸 말만 제거');
  const j3 = blank([[JUMPER, ROOK], [BISHOP, ATTACKER]], KNIGHT); put(j3, 6, 0); put(j3, 0, 1); put(j3, 24, 1); put(j3, 20, 0);
  ok(dests(j3, 0, 0, 6).length === 0, '뛰어넘으면 판 밖이면 못 감');
  // 퀸 변환: 판 위 말이 2개만 남으면 점퍼가 퀸이 됨
  const q = blank([[JUMPER, ROOK], [BISHOP, ATTACKER]], KNIGHT); put(q, 12, 0); put(q, 0, 1);
  ok(C.view(q, 0).hand[0][0] === 5 && D(...dests(q, 0, 0, 12)) === D(6, 7, 8, 11, 13, 16, 17, 18), '말이 2개면 점퍼 = 퀸(8방향 1칸), 카드도 퀸으로 보임');
  put(q, 24, 1);
  ok(C.view(q, 0).hand[0][0] === 4 && dests(q, 0, 0, 12).length === 0, '말이 3개면 아직 점퍼');
  const qw = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(qw, 12, 0); put(qw, 0, 1);
  ok(C.view(qw, 0).wait === 5, '대기 존의 점퍼도 퀸으로 보임');
}

// 3) 카드 돌리기 · 잡기 · 방향 돌리기
{
  const st = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(st, 12, 0); put(st, 3, 0); put(st, 24, 1); put(st, 0, 1);
  ok(C.apply(st, 0, mvA(0, 12, 13)).ok, '룩으로 이동');
  ok(J(st.hand) === J([[JUMPER, BISHOP], [ATTACKER, KNIGHT]]) && st.wait === ROOK, '쓴 룩은 대기 존으로, 대기 중이던 점퍼가 내 앞으로 · 상대 카드는 그대로');
  ok(st.cells[13] === 1 && st.cells[12] === 0 && st.turn === 1, '말이 옮겨지고 차례가 넘어감');
  ok(C.apply(st, 1, mvA(1, 24, 18)).ok === false, '24 에서 나이트로 18 은 못 감 (나이트 이동이 아님)');
  const t =blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(t, 12, 0); put(t, 7, 1); put(t, 20, 1);
  const before = C.view(t, 0).counts;
  ok(C.apply(t, 0, mvA(0, 12, 7)).ok && t.cells[7] === 1 && C.view(t, 0).counts[1] === before[1] - 1, '상대 말이 있는 칸으로 가면 제거');
  ok(t.log[t.log.length - 1].cap === true && t.last.cap === true, '기록에 잡음이 남음');
  // 내 말 칸 · 내 카드 아님 · 상대 말 · 빈 칸
  const u = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(u, 12, 0); put(u, 13, 0); put(u, 0, 1);
  ok(!C.apply(u, 0, mvA(0, 12, 13)).ok, '내 말 칸으로 못 감');
  ok(!C.apply(u, 0, mvA(0, 0, 1)).ok, '상대 말은 못 움직임');
  ok(!C.apply(u, 0, mvA(0, 5, 6)).ok, '빈 칸에서 못 움직임');
  ok(!C.apply(u, 0, mvA(1, 12, 11)).ok && C.apply(u, 0, mvA(0, 12, 11)).ok, '카드 규칙에 맞는 곳만');
  ok(!C.apply(u, 0, mvA(0, 11, 10)).ok, '내 차례가 아님');
  // 방향 돌리기 (보는 쪽 끝 줄에 닿으면)
  const f = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(f, 5, 0); put(f, 24, 1); put(f, 14, 1, 1);
  ok(f.face[5] === -1, '백은 위를 봄');
  ok(C.apply(f, 0, mvA(0, 5, 0)).ok && f.face[0] === 1, '위 끝 줄에 닿으면 반대(아래)를 봄');
  ok(C.apply(f, 1, mvA(0, 14, 19)).ok && f.face[19] === 1, '끝 줄이 아니면 방향 그대로');
  ok(C.apply(f, 0, mvA(1, 0, 6)).ok && f.face[6] === 1, '돌아선 뒤 내려가는 중엔 그대로');
  const g2 = blank([[ATTACKER, KNIGHT], [ROOK, BISHOP]], JUMPER, 1); put(g2, 19, 1); put(g2, 0, 0);
  ok(C.apply(g2, 1, mvA(0, 19, 24)).ok && g2.face[24] === -1, '흑이 아래 끝 줄에 닿으면 위를 봄');
  // 돌아선 말이 되돌아가 반대편 끝 줄에 닿으면 또 돌아봄
  const g3 = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(g3, 14, 0, 1); put(g3, 0, 1);
  ok(C.apply(g3, 0, mvA(0, 14, 19)).ok && g3.face[19] === 1, '끝 줄 직전에서는 그대로');
  const g4 = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER); put(g4, 19, 0, 1); put(g4, 0, 1);
  ok(C.apply(g4, 0, mvA(0, 19, 24)).ok && g4.face[24] === -1, '돌아선 말이 아래 끝 줄에 닿으면 다시 위를 봄');
}

// 5) 승패
{
  const hand = [[ROOK, BISHOP], [ATTACKER, KNIGHT]];
  // 전멸
  const w = blank(hand, JUMPER); put(w, 12, 0); put(w, 13, 1);
  ok(C.apply(w, 0, mvA(0, 12, 13)).ok && w.over && w.res.w === 0 && w.res.why === 'wipe' && J(C.ranks(w)) === D(0, 1) && C.needs(w).length === 0, '상대 말을 모두 없애면 승 (1세트)');
  const w2 = blank(hand, JUMPER, 1); put(w2, 12, 0); put(w2, 13, 1); w2.hand = [[ATTACKER, KNIGHT], [ROOK, BISHOP]];
  ok(C.apply(w2, 1, mvA(0, 13, 12)).ok && w2.over && w2.res.w === 1 && J(C.ranks(w2)) === D(1, 0), '흑이 이겨도 마찬가지');
  // 성에 올리고 한 턴 버팀: 상대가 못 없애면 승
  const c = blank(hand, JUMPER); put(c, 7, 0); put(c, 24, 1); put(c, 20, 1);
  ok(C.apply(c, 0, mvA(0, 7, 2)).ok && !c.over && c.cells[2] === 1 && c.turn === 1, '상대 성에 올림 — 아직 승 아님 · 상대 차례');
  ok(!C.legal(c, 1).some(a => a.to === 2), '(상대는 성의 말을 잡을 수 없는 배치)');
  const L = C.legal(c, 1); ok(L.length > 0 && C.apply(c, 1, L[0]).ok, '상대가 다른 수를 둠');
  ok(c.over && c.res.w === 0 && c.res.why === 'castle' && J(C.ranks(c)) === D(0, 1), '못 없앴으니 성 점령 승');
  // 없애면 계속
  const d = blank([[ATTACKER, BISHOP], [ROOK, KNIGHT]], JUMPER); put(d, 12, 0); put(d, 20, 0); put(d, 1, 1); put(d, 24, 1);
  ok(C.apply(d, 0, mvA(0, 12, 2)).ok && !d.over && d.cells[2] === 1, '어태커 두 칸 직진으로 성에 오름');
  const cap = C.legal(d, 1).find(a => a.to === 2);
  ok(cap && C.apply(d, 1, cap).ok && !d.over && d.cells[2] === 2, '상대가 성의 말을 잡으면 판은 계속');
  // 상대가 못 움직여 넘기면 그대로 승 (넘겨도 버틴 것)
  const s2 = blank([[ROOK, BISHOP], [ATTACKER, JUMPER]], KNIGHT); put(s2, 7, 0); put(s2, 14, 0); put(s2, 24, 1, 1);
  ok(C.legal(s2, 1).length === 0, '흑은 어디로도 못 움직임 (어태커는 벽 · 점퍼는 붙은 말 없음)');
  ok(C.apply(s2, 0, mvA(0, 7, 2)).ok && s2.log.some(e => e.k === 'pass' && e.s === 1) && s2.over && s2.res.why === 'castle' && s2.res.w === 0, '상대가 넘겨도 성 점령 승');
  // 내 성에 내 말이 있는 건 상관없음
  const s3 = blank(hand, JUMPER); put(s3, 22, 0); put(s3, 0, 1); put(s3, 6, 0);
  ok(C.apply(s3, 0, mvA(0, 6, 7)).ok && !s3.over, '내 성에 내 말이 있는 건 상관없음');
  // 맞불: 내가 먼저 올렸으면 상대가 내 성에 올려도 내가 먼저 이김
  const s4 = blank([[ROOK, BISHOP], [ROOK, KNIGHT]], JUMPER); put(s4, 7, 0); put(s4, 17, 1); put(s4, 12, 0);
  C.apply(s4, 0, mvA(0, 7, 2)); C.apply(s4, 1, mvA(0, 17, 22));
  ok(s4.over && s4.res.w === 0, '상대가 맞불로 내 성에 올려도 내 말이 먼저 버텼으니 내가 승');
  // 성 점령은 상대 성만: 내 말이 내 성에 서 있어도 승 아님 (위 s3) · 상대 말이 내 성에 서면 상대가 내 턴 뒤 승
  const s5 = blank([[ROOK, BISHOP], [ROOK, KNIGHT]], JUMPER, 1); put(s5, 17, 1); put(s5, 12, 0); put(s5, 0, 0);
  C.apply(s5, 1, mvA(0, 17, 22));
  ok(!s5.over && s5.cells[22] === 2, '흑이 백의 성에 올림');
  C.apply(s5, 0, C.legal(s5, 0).find(a => a.to !== 22));
  ok(s5.over && s5.res.w === 1, '백이 못 없애면 흑 승');
}

// 6) 60턴 · 넘김
{
  const hand = [[ROOK, BISHOP], [ATTACKER, KNIGHT]];
  const a = blank(hand, JUMPER); put(a, 12, 0); put(a, 13, 0); put(a, 0, 1); a.tc = 59;
  ok(C.apply(a, 0, mvA(0, 12, 11)).ok && a.over && a.res.w === 0 && a.res.why === 'turns' && J(C.ranks(a)) === D(0, 1), '60턴 · 말이 많은 쪽 승');
  const b = blank(hand, JUMPER); put(b, 12, 0); put(b, 0, 1); b.tc = 59;
  ok(C.apply(b, 0, mvA(0, 12, 11)).ok && b.over && b.res.w === -1 && J(C.ranks(b)) === D(0, 0), '60턴 · 말 수가 같으면 무승부 (공동 1등)');
  const c = blank(hand, JUMPER); put(c, 12, 0); put(c, 0, 1); c.tc = 40;
  C.apply(c, 0, mvA(0, 12, 11)); ok(c.tc === 41 && !c.over, '턴 수를 셈');
  // 넘김도 한 턴으로 셈
  const p = blank([[ROOK, BISHOP], [ATTACKER, JUMPER]], KNIGHT); put(p, 12, 0); put(p, 20, 0); put(p, 24, 1, 1);
  ok(C.legal(p, 1).length === 0, '흑이 못 움직이는 판');
  ok(C.apply(p, 0, mvA(0, 12, 13)).ok && p.turn === 0 && p.tc === 2 && p.log.some(e => e.k === 'pass'), '못 움직이면 넘기고 다시 내 차례');
  // 둘 다 못 움직임 → 말 수로 판가름 (같으면 무승부)
  const q = blank([[ROOK, JUMPER], [JUMPER, JUMPER]], JUMPER); put(q, 12, 0); put(q, 20, 0); put(q, 0, 1); put(q, 4, 1);
  ok(C.apply(q, 0, mvA(0, 12, 13)).ok && q.over && q.res.why === 'turns' && q.res.w === -1 && q.log.some(e => e.k === 'pass'), '둘 다 못 움직이면 말 수로 (같아서 무승부)');
  const q2 = blank([[ROOK, JUMPER], [JUMPER, JUMPER]], JUMPER); put(q2, 12, 0); put(q2, 20, 0); put(q2, 24, 0); put(q2, 4, 1);
  ok(C.apply(q2, 0, mvA(0, 12, 13)).ok && q2.over && q2.res.w === 0, '둘 다 못 움직이면 말이 더 많은 쪽 승');
}

// 7) 세트 (3세트 · 먼저 2승)
{
  const quickWin = (st, w) => {   // 판을 직접 정리해 w 가 이기게 하는 한 수
    const o = 1 - w;
    st.cells.fill(0); st.face.fill(0); st.hand[w] = [ROOK, BISHOP]; st.hand[o] = [ATTACKER, KNIGHT]; st.wait = JUMPER;
    put(st, 12, w); put(st, 13, o); st.turn = w;
    return C.apply(st, w, mvA(0, 12, 13));
  };
  const st = C.init({ n: 2, seed: 4, cfg: { sets: 3 } });
  ok(st.sets === 3 && st.set === 1 && C.auto(st) === null, '3세트 시작');
  ok(quickWin(st, 0).ok && !st.over && st.phase === 'between' && J(st.wins) === D(1, 0), '1세트 백 승 → 세트 사이');
  ok(J(C.needs(st)) === D() && C.auto(st) > 0 && C.view(st, 0).phase === 'between' && C.view(st, 0).res.w === 0, '세트 사이엔 입력이 없고 자동으로 넘어감');
  ok(C.apply(st, 0, mvA(0, 20, 15)).ok === false, '세트 사이엔 수를 못 둠');
  C.advance(st);
  ok(st.set === 2 && st.phase === 'play' && st.first === 1 && st.turn === 1 && st.cells.slice(0, 5).every(c => c === 2) && st.log.filter(e => e.k === 'start').length === 2, '2세트: 진 쪽(흑)이 선공 · 판이 새로');
  ok(quickWin(st, 1).ok && J(st.wins) === D(1, 1) && !st.over, '2세트 흑 승 → 1:1');
  C.advance(st);
  ok(st.set === 3 && st.first === 0, '3세트: 진 쪽(백)이 선공');
  ok(quickWin(st, 0).ok && st.over && J(st.wins) === D(2, 1) && J(C.ranks(st)) === D(0, 1) && st.phase === 'end', '먼저 2승이면 끝');
  ok(C.auto(st) === null && J(C.needs(st)) === D(), '끝나면 자동 단계 없음');
  C.advance(st); ok(st.set === 3, '끝난 뒤 advance 는 아무 일 없음');
  // 2:0 이면 3세트 없이 끝
  const t = C.init({ n: 2, seed: 9, cfg: { sets: 3 } }); quickWin(t, 0); C.advance(t); quickWin(t, 0);
  ok(t.over && J(t.wins) === D(2, 0), '2:0 이면 거기서 끝');
  // 비긴 세트는 다시 · 최대 5세트
  const d = C.init({ n: 2, seed: 3, cfg: { sets: 3 } }), firsts = [];
  for (let k = 0; k < 5; k++) {
    ok(d.set === k + 1 && !d.over, '비긴 세트 뒤 다음 세트 ' + (k + 1));
    firsts.push(d.first); d.tc = 59;
    const L = C.legal(d, d.turn).find(a => !d.cells[a.to]); ok(C.apply(d, d.turn, L).ok, '비기는 수');
    if (k < 4) C.advance(d);
  }
  ok(d.over && J(d.wins) === D(0, 0) && J(C.ranks(d)) === D(0, 0), '5세트 모두 비기면 공동 1등');
  ok(J(firsts) === D(0, 1, 0, 1, 0), '비기면 선공을 바꿈: ' + firsts);
  // 1세트 비김 = 바로 끝
  const e = C.init({ n: 2, seed: 3 }); e.tc = 59; C.apply(e, 0, C.legal(e, 0).find(a => !e.cells[a.to]));
  ok(e.over && J(C.ranks(e)) === D(0, 0), '1세트 무승부는 공동 1등으로 끝');
}

// 8) 잘못된 입력
{
  const st = blank(); put(st, 12, 0); put(st, 0, 1); const before = J(C.view(st, 0));
  const bad = [null, undefined, 0, 'x', [], {}, { t: 'mv' }, { t: 'mv', slot: 2, from: 12, to: 11 }, { t: 'mv', slot: -1, from: 12, to: 11 }, { t: 'mv', slot: '0', from: 12, to: 11 }, { t: 'mv', slot: 0, from: '12', to: 11 },
    { t: 'mv', slot: 0, from: 12.5, to: 11 }, { t: 'mv', slot: 0, from: 12, to: 11.5 }, { t: 'mv', slot: 0, from: 12, to: 25 }, { t: 'mv', slot: 0, from: -1, to: 11 }, { t: 'mv', slot: 0, from: 12 }, { t: 'mv', slot: 0, to: 11 },
    { t: 'move', slot: 0, from: 12, to: 11 }, { t: 'mv', slot: 0, from: 12, to: NaN }, { t: 'pass' }];
  for (const a of bad) { let r; try { r = C.apply(st, 0, a); } catch (e) { r = { ok: 'throw ' + e.message }; } ok(r && r.ok === false, '잘못된 입력 거부: ' + J(a)); }
  for (const s of [-1, 1, 2, 'x', null, undefined]) ok(C.apply(st, s, mvA(0, 12, 11)).ok === false, '잘못된 자리 ' + s);
  ok(J(C.view(st, 0)) === before, '거부된 입력은 판을 바꾸지 않음');
  ok(C.apply(st, 0, mvA(0, 12, 11)).ok, '바른 수는 됨');
}

// 9) 보이는 것
{
  const st = C.init({ n: 2, seed: 8 }), r = mul(2);
  for (let k = 0; k < 7; k++) { const L = C.legal(st, st.turn); C.apply(st, st.turn, L[Math.floor(r() * L.length)]); }
  const vs = [0, 1, -1, 'all'].map(s => C.view(st, s));
  ok(new Set(vs.map(v => v.pub)).size === 1, '공개 지문이 같음');
  ok(new Set(vs.map(v => J(Object.assign({}, v, { seat: 0 })))).size === 1, '전부 공개 · 자리마다 내용이 같음');
  ok(vs[2].seat === -1 && vs[3].seat === 'all', '구경꾼 · all');
  const v = vs[0]; v.cells[0] = 9; v.hand[0][0] = 9; v.log.length = 0;
  ok(st.cells[0] !== 9 && st.hand[0][0] !== 9 && st.log.length > 0, 'view 는 복사본');
  ok(C.view(st, 0).log.filter(e => e.k === 'mv').length === 7 && C.view(st, 0).last && C.view(st, 0).tc === 7, '수 기록 (복기용)');
}

// 10) 끝까지 (AI 끼리) · 불변식 · 기록으로 다시 두기 (규칙 시험이라 고급은 읽는 양을 줄여 빨리 돌림 — 실력 · 시간은 12 에서 원래 값으로)
const FULL = C.TIER.hard.nodes; C.TIER.hard.nodes = 2500;
function replay(st) {
  const cells = Array(25).fill(0), face = Array(25).fill(0);
  for (let c = 0; c < 5; c++) { cells[20 + c] = 1; face[20 + c] = -1; cells[c] = 2; face[c] = 1; }
  for (const e of st.log) if (e.k === 'mv') {
    const fc = face[e.from], row = (e.to / 5) | 0;
    cells[e.to] = cells[e.from]; cells[e.from] = 0; face[e.from] = 0; face[e.to] = (fc > 0 && row === 4) || (fc < 0 && row === 0) ? -fc : fc;
  }
  return { cells, face };
}
function inv(st) {
  const n0 = st.cells.filter(c => c === 1).length, n1 = st.cells.filter(c => c === 2).length;
  ok(n0 <= 5 && n1 <= 5 && n0 + n1 >= 1, '말은 5개 이하');
  ok(J([...st.hand[0], ...st.hand[1], st.wait].sort()) === D(0, 1, 2, 3, 4), '카드는 늘 5장 (앞 2 · 앞 2 · 대기 1)');
  for (let i = 0; i < 25; i++) if (st.cells[i]) ok(st.face[i] === 1 || st.face[i] === -1, '말에는 방향이 있음');
}
function playOut(seed, tiers, sets) {
  const st = C.init({ n: 2, seed, cfg: { sets: sets || 1 } }), r = mul(seed * 17 + 3); let steps = 0;
  while (!C.over(st) && steps++ < 1200) {
    if (st.phase === 'between') { ok(C.auto(st) > 0, '세트 사이엔 auto'); C.advance(st); continue; }
    const s = C.needs(st)[0]; ok(s !== undefined, '입력 자리가 있음');
    const L = C.legal(st, s); ok(L.length > 0, '둘 수 있는 수가 있음');
    if (steps % 5 === 0) for (const a of L) ok(C.apply(clone(st), s, a).ok, 'legal 수는 apply 가 받음 ' + J(a));
    const a = C.ai(C.view(st, s), s, tiers[s], r);
    ok(L.some(x => J(x) === J(a)), `AI(${tiers[s]}) 수가 legal 안에 있음 ${J(a)}`);
    const res = C.apply(st, s, a); if (!res.ok) { ok(false, 'AI 가 규칙을 어김 ' + res.err); break; }
    ok(C.apply(clone(st), 1 - s, mvA(0, 99, 0)).ok === false, '이상한 수 거부');
    inv(st);
    ok(st.tc <= C.MAXTURN, '한 세트는 60턴 안쪽');
  }
  ok(C.over(st), `판이 끝남 (seed ${seed}, ${steps}번)`);
  ok(C.ranks(st).includes(0), '등수');
  return st;
}
const tierSets = [['easy', 'easy'], ['normal', 'normal'], ['easy', 'normal'], ['normal', 'hard'], ['hard', 'hard']];
for (let k = 0; k < 300; k++) { const st = playOut(1000 + k, tierSets[k % 4], k % 7 === 0 ? 3 : 1); if (st.sets === 1) { const rp = replay(st); ok(J(rp.cells) === J(st.cells) && J(rp.face) === J(st.face), '기록대로 다시 두면 같은 판 (복기)'); } }
for (let k = 0; k < 8; k++) playOut(5000 + k, tierSets[4], k % 2 ? 3 : 1);
{ const a = playOut(777, ['hard', 'normal']), b = playOut(777, ['hard', 'normal']); ok(J(a) === J(b), '같은 seed 는 같은 결과'); }

// 11) 선생님 보조
{
  const st = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER, 0); put(st, 12, 0); put(st, 8, 1); put(st, 20, 0); put(st, 3, 1);
  const V = C.view(st, 0);
  ok(D(...C.attacked(V, 0)) === D(12, 20) || D(...C.attacked(V, 0)) === D(20, 12) || J(C.attacked(V, 0)) === D(12), '상대 앞 카드(어태커 · 나이트)로 잡힐 내 말: ' + C.attacked(V, 0));
  ok(C.attacked(V, 1).includes(8), '내 앞 카드로 잡을 수 있는 상대 말');
  const ex = C.explain(V, 0, mvA(1, 12, 8));
  ok(ex.tags.includes('capture'), '잡는 수 태그: ' + ex.tags);
  const rc = C.recommend(V, 0);
  ok(rc && C.legal(st, 0).some(a => J(a) === J(rc.a)), '추천은 legal');
  const win = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER, 0); put(win, 12, 0); put(win, 13, 1);
  const rw = C.recommend(C.view(win, 0), 0);
  ok(J(rw.a) === J(mvA(0, 12, 13)) && rw.tags.includes('win'), '이기는 수를 추천');
  const cs = blank([[ROOK, BISHOP], [ATTACKER, KNIGHT]], JUMPER, 0); put(cs, 7, 0); put(cs, 20, 0); put(cs, 24, 1);
  ok(C.explain(C.view(cs, 0), 0, mvA(0, 7, 2)).tags.includes('castle'), '상대 성에 오르는 수 태그');
  const an = C.analyze(V, 0);
  ok(an.counts[0] === 2 && an.hanging.includes(12) && an.targets.includes(8) && an.rec && C.analyze(V, 1).rec === null, '분석 묶음');
}

// 12) 단계별 실력 · 시간 (고급은 원래 값)
C.TIER.hard.nodes = FULL;
{
  const duel = (A, B, n) => {
    const w = { a: 0, b: 0, d: 0 };
    for (let k = 0; k < n; k++) {
      const tiers = k % 2 ? [B, A] : [A, B], seed = 20000 + k, st = C.init({ n: 2, seed }), r = mul(seed * 13 + 1);
      for (let g = 0; g < 300 && !C.over(st); g++) { const s = C.needs(st)[0]; if (!C.apply(st, s, C.ai(C.view(st, s), s, tiers[s], r)).ok) { ok(false, '규칙 어김'); break; } }
      const R = C.ranks(st); if (R[0] === R[1]) w.d++; else if (tiers[R[0] === 0 ? 0 : 1] === A) w.a++; else w.b++;
    }
    return w;
  };
  C.TIER.hard.nodes = 6000;   // 200판은 읽는 양을 줄여서 (그래도 초급을 크게 이김), 원래 값은 아래 중급전 · 시간에서
  const he = duel('hard', 'easy', 200);
  C.TIER.hard.nodes = FULL;
  const ne = duel('normal', 'easy', 120), hn = duel('hard', 'normal', 24);
  console.log(`고급 대 초급 ${he.a}승 ${he.b}패 ${he.d}무 · 중급 대 초급 ${ne.a}승 ${ne.b}패 ${ne.d}무 · 고급 대 중급 ${hn.a}승 ${hn.b}패 ${hn.d}무`);
  ok(he.a / 200 > 0.6, `고급이 초급을 이김 (승률 ${(he.a / 2).toFixed(0)}%)`);
  ok(ne.a > ne.b && ne.a / 120 > 0.55, `중급이 초급보다 강함 (${ne.a}승 ${ne.b}패)`);
  ok(hn.a > hn.b, `고급이 중급보다 강함 (${hn.a}승 ${hn.b}패)`);
  let mx = 0, tot = 0, cnt = 0;
  for (let k = 0; k < 8; k++) {
    const st = C.init({ n: 2, seed: 30000 + k }), r = mul(k + 1);
    while (!C.over(st)) { const s = C.needs(st)[0], V = C.view(st, s), t0 = process.hrtime.bigint(), a = C.ai(V, s, 'hard', r), ms = Number(process.hrtime.bigint() - t0) / 1e6; mx = Math.max(mx, ms); tot += ms; cnt++; C.apply(st, s, a); }
  }
  console.log(`고급 한 수 평균 ${(tot / cnt).toFixed(0)}ms · 가장 오래 ${mx.toFixed(0)}ms`);
  ok(mx < 300, '고급 한 수가 300ms 안쪽');
}

console.log(`카드 체스 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

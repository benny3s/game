// 숫자 경매 규칙 시험 (node survival/test/numauction_selftest.js)
'use strict';
const N = require('../games/numauction/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const same = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' → ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
const B = N.BLOCKS, FULL = (1 << B.length) - 1;
const bi = v => B.indexOf(v);                       // 블록 숫자 → 번호
const D = (n, order, first) => N.deal(N.init({ n, seed: 7 }), order, first);
const A = (st, seat, a, m) => { const r = N.apply(st, seat, a); ok(r.ok, (m || '') + ' 적용 ' + JSON.stringify(a) + ' ' + (r.err || '') + ' @' + new Error().stack.split('\n')[2].replace(/.*[\\/]/, '')); return r; };
const bad = (st, seat, a, m) => { const r = N.apply(st, seat, a); ok(!r.ok && r.err, m); };
const bid = (...vs) => ({ t: 'bid', c: vs.map(bi) });
const PASS = { t: 'pass' };
const hv = (st, i) => N.view(st, i).haveSum[i];
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };

// 1) 점수 계산 (합 → GOOD 2배 → −5 → 절반)
{
  const S = N.scoreOf, G = 10, M5 = 13, H = 14;
  ok(S([2, 4]) === 8, '3 + 5 = 8');
  ok(S([2, 4, G]) === 16 && S([2, 4, G, G + 1]) === 32 && S([2, 4, G, G + 1, G + 2]) === 64, 'GOOD 마다 2배');
  ok(S([2, 4, G, M5]) === 11, '(8×2) − 5 = 11 (GOOD 먼저, 그다음 −5)');
  ok(S([2, 4, G, M5, H]) === 5.5, '둘 다 있으면 −5 먼저, 절반은 마지막 = 5.5');
  ok(S([2, 4, M5, H]) === 1.5 && S([M5]) === -5 && S([M5, H]) === -2.5 && S([]) === 0, '경계 값');
  ok(S([2], 3) === 6 && S([2, G], 3) === 12, '앞으로 받을 점수(기대) 더하기');
}

// 2) 일반 라운드: 차례 · 합 넘기기 · 낙찰 · 낸 블록
{
  const st = D(3, [4, 0, 1, 2], 0);                   // 첫 카드 5점 매물, 첫 순서 0
  ok(st.card === 4 && N.needs(st).join() === '0' && st.phase === 'bid', '시작 차례');
  bad(st, 1, bid(1), '차례 아닌 자리');
  bad(st, 0, { t: 'bid', c: [] }, '빈 입찰');
  bad(st, 0, { t: 'bid', c: [11] }, '없는 블록 번호');
  bad(st, 0, { t: 'bid', c: [2, 2] }, '같은 블록 두 번');
  bad(st, 0, { t: 'bid', c: [1.5] }, '정수 아님');
  bad(st, 0, null, 'null');
  bad(st, 0, { t: 'zzz' }, '모르는 행동');
  A(st, 0, bid(3));
  ok(st.top === 3 && st.topSeat === 0 && N.needs(st).join() === '1', '0 이 3 을 냄 → 1 차례');
  bad(st, 1, bid(2), '3 을 못 넘김');
  bad(st, 1, bid(3), '같은 합 (넘겨야 함)');
  A(st, 1, bid(4));
  A(st, 2, PASS);
  ok(N.needs(st).join() === '0' && !st.active[2], '패스한 사람은 건너뜀');
  bad(st, 0, bid(1), '더 얹어도 4 는 못 넘김 (3+1)');
  bad(st, 0, bid(3), '이미 낸 블록은 못 얹음');
  A(st, 0, bid(2), '3+2=5');
  ok(st.top === 5 && pileSumOf(st, 0) === 5, '내 더미 5');
  A(st, 1, PASS);
  ok(st.phase === 'show' && st.res.w === 0 && st.res.paid === 5 && st.first === 0, '0 낙찰, 낸 5 사라짐');
  ok(hv(st, 0) === 101 && hv(st, 1) === 106 && hv(st, 2) === 106, '낙찰자만 블록 감소 (패스한 사람은 돌려받음)');
  same(st.won[0], [4], '낙찰 카드');
  ok(N.needs(st).length === 0 && N.auto(st) > 0, '결과 단계는 자동으로 넘어감');
  bad(st, 0, bid(1), '결과 단계에서는 입력 안 됨');
  N.advance(st);
  ok(st.round === 2 && st.card === 0 && st.turn === 0 && st.phase === 'bid', '다음 라운드: 직전 낙찰자가 먼저');
  function pileSumOf(s, i) { return N.view(s, i).pileSum[i]; }
}
// 낙찰자가 달라지면 다음 첫 순서도 달라짐
{
  const st = D(3, [0, 1], 0);
  A(st, 0, bid(1)); A(st, 1, bid(2)); A(st, 2, PASS); A(st, 0, PASS);
  ok(st.res.w === 1 && st.first === 1 && hv(st, 1) === 104 && hv(st, 0) === 106, '1 낙찰 → 다음 첫 순서 1');
  N.advance(st); ok(st.turn === 1, '다음 라운드 첫 차례 = 1');
}
// 모두 패스 → 마지막 한 명이 아무것도 안 내고 낙찰
{
  const st = D(4, [5], 1);
  A(st, 1, PASS); A(st, 2, PASS); A(st, 3, PASS);
  ok(st.phase === 'show' && st.res.w === 0 && st.res.paid === 0 && hv(st, 0) === 106, '전원 패스 → 남은 사람 공짜 낙찰');
  same(st.won[0], [5], '공짜로 받음');
}
// 즉시 패스한 첫 사람 · 한 명이 입찰 후 나머지 패스
{
  const st = D(3, [9], 0);
  A(st, 0, PASS); A(st, 1, bid(25)); A(st, 2, PASS);
  ok(st.res.w === 1 && st.res.paid === 25 && hv(st, 1) === 81, '첫 사람이 바로 패스해도 진행');
}
// 합을 못 넘기면 저절로 패스
{
  const st = D(3, [5, 6], 0);
  st.have[1] = 1;                                     // 1 은 블록 1 하나뿐
  A(st, 0, bid(3));
  ok(!st.active[1] && st.turn === 2, '1 은 3 을 못 넘겨서 저절로 패스, 차례 2');
  ok(st.log.some(e => e.k === 'pass' && e.s === 1 && e.forced === 1), '강제 패스 기록');
  A(st, 2, PASS);
  ok(st.phase === 'show' && st.res.w === 0, '남은 한 명(0) 낙찰');
}
// 블록을 다 써서 다음 라운드 첫 차례도 저절로 패스
{
  const st = D(3, [0, 1, 2], 0);
  A(st, 0, { t: 'bid', c: [...Array(11).keys()] });
  ok(st.phase === 'show' && st.log.filter(e => e.k === 'pass' && e.forced === 1).length === 2, '106 을 내면 남들은 못 넘겨서 저절로 패스');
  ok(st.res.w === 0 && st.res.paid === 106 && hv(st, 0) === 0, '106 을 다 냄');
  N.advance(st);
  ok(st.round === 2 && !st.active[0] && st.turn === 1 && st.log.some(e => e.k === 'pass' && e.s === 0 && e.forced === 1 && e.i > 3), '블록 없는 첫 사람은 저절로 패스');
  A(st, 1, bid(1)); A(st, 2, PASS);
  ok(st.res.w === 1, '2 라운드 1 낙찰');
}
// 더미에 계속 얹기 (이미 낸 블록 위에)
{
  const st = D(3, [3], 0);
  A(st, 0, bid(1)); A(st, 1, bid(2)); A(st, 2, bid(3)); A(st, 0, bid(4));
  ok(N.view(st, 0).pileSum[0] === 5 && st.top === 5, '1+4 = 5 로 넘김');
  A(st, 1, PASS); A(st, 2, PASS);
  ok(st.res.w === 0 && st.res.paid === 5 && st.res.blocks.length === 2, '5 낙찰');
}

// 3) BAD 카드 (거꾸로)
{
  let st = D(3, [13, 14, 15, 0], 0);                   // 첫 라운드 = −5점
  A(st, 0, PASS);
  ok(st.phase === 'show' && st.res.w === 0 && st.res.paid === 0 && hv(st, 0) === 106, '바로 패스한 첫 사람이 받음 (블록은 안 잃음)');
  same(st.won[0], [13], '−5 카드');
  ok(N.view(st, 0).score[0] === -5, '점수 −5');
  st = D(3, [13], 0);
  A(st, 0, bid(8)); A(st, 1, bid(10)); A(st, 2, PASS);
  ok(st.res.w === 2 && st.res.paid === 0 && hv(st, 0) === 106 && hv(st, 1) === 106, '먼저 패스한 2 가 받음, 낸 블록은 모두 돌려받음');
  st = D(3, [13], 0);
  A(st, 0, bid(6)); A(st, 1, bid(8)); A(st, 2, bid(10)); A(st, 0, PASS);
  ok(st.res.w === 0 && st.res.paid === 6 && hv(st, 0) === 100 && hv(st, 1) === 106 && hv(st, 2) === 106, '먼저 패스한 0 은 낸 6 이 사라짐, 나머지는 돌려받음');
  ok(st.log.some(e => e.k === 'pass' && e.s === 0 && e.lose === 6), '잃은 블록 기록');
  st = D(3, [14], 1);
  st.have[2] = bitsOf([bi(1)]);                         // 2 는 블록 1 하나뿐 → 3 을 낼 수 없음
  A(st, 1, bid(3));
  ok(st.phase === 'show' && st.res.w === 2, 'BAD: 합을 못 넘기는 사람이 강제로 받음');
  same(st.won[2], [14], '절반 카드');
  function bitsOf(l) { return l.reduce((m, k) => m | (1 << k), 0); }
}

// 4) 매물 반납
{
  let st = D(3, [0, 1, 15, 2, 3], 0);
  A(st, 0, bid(1)); A(st, 1, PASS); A(st, 2, PASS);
  N.advance(st);
  A(st, 0, bid(2)); A(st, 1, PASS); A(st, 2, PASS);
  same(st.won[0], [0, 1], '매물 2장');
  N.advance(st);                                       // 3 라운드: 반납 카드, 첫 순서 0
  A(st, 0, PASS);
  ok(st.phase === 'ret' && N.needs(st).join() === '0', '받으면 바로 반납 고르기');
  same(N.legal(st, 0), [{ t: 'ret', c: 0 }, { t: 'ret', c: 1 }], '반납 후보');
  bad(st, 1, { t: 'ret', c: 0 }, '남이 고를 수 없음');
  bad(st, 0, { t: 'ret', c: 5 }, '없는 카드');
  bad(st, 0, { t: 'ret', c: 13 }, '매물이 아닌 카드');
  bad(st, 0, PASS, '반납 단계에선 패스 없음');
  const v = N.view(st, 2); ok(v.phase === 'ret' && v.needs.join() === '0', '구경도 반납 단계가 보임');
  A(st, 0, { t: 'ret', c: 1 });
  same(st.won[0], [0], '골라서 반납'); same(st.gone, [1], '반납한 카드는 게임에서 빠짐');
  ok(st.phase === 'show' && st.res.ret === 1, '결과');
  N.advance(st);
  ok(st.round === 4 && st.card === 2, '다음 라운드');
  // 가진 게 없으면 다음에 받는 매물을 반납
  st = D(3, [15, 3, 4], 0);
  A(st, 0, PASS);
  ok(st.phase === 'show' && st.debt[0] === 1 && st.res.debt === true, '가진 게 없으면 빚으로');
  N.advance(st);
  A(st, 0, bid(1)); A(st, 1, PASS); A(st, 2, PASS);
  ok(st.won[0].length === 0 && st.debt[0] === 0 && st.res.back === 3 && st.gone.includes(3), '다음 매물은 바로 반납');
  N.advance(st);
  A(st, 0, bid(2)); A(st, 1, PASS); A(st, 2, PASS);
  same(st.won[0], [4], '빚을 갚은 뒤엔 정상');
  // GOOD 도 반납 후보
  st = D(3, [10, 15, 11], 0);
  A(st, 0, PASS); A(st, 1, PASS);                      // 2 가 GOOD 을 공짜로
  ok(st.res.w === 2, 'GOOD 2 가 받음');
  N.advance(st);
  A(st, 2, PASS);                                      // 첫 순서 2, 바로 패스 → 2 가 반납 카드를 받음
  ok(st.phase === 'ret' && N.legal(st, 2).length === 1 && N.legal(st, 2)[0].c === 10, 'GOOD 도 반납 후보');
  A(st, 2, { t: 'ret', c: 10 });
  ok(st.won[2].length === 0 && st.aw[10], '반납해도 낙찰된 걸로 셈');
}

// 5) 끝 조건 · 순위
{
  let st = D(3, [10, 11, 12, 14, 0, 1], 0);
  const passAll = () => { let g = 0; while (st.phase === 'bid' && g++ < 20) A(st, N.needs(st)[0], PASS); };
  passAll(); N.advance(st); passAll(); N.advance(st); passAll(); N.advance(st);
  ok(!st.over && st.round === 4 && st.card === 14, 'GOOD 3장만으로는 안 끝남');
  passAll(); ok(st.phase === 'show' && !st.over, '마지막 카드 결과 단계');
  N.advance(st);
  ok(st.over && st.phase === 'end' && N.needs(st).length === 0 && st.final && st.round === 4, 'GOOD 3 + 절반 낙찰 → 끝');
  bad(st, 0, PASS, '끝난 판은 입력 안 됨');
  st = D(3, [0, 1, 2], 0);
  for (let k = 0; k < 3; k++) { let g = 0; while (st.phase === 'bid' && g++ < 20) A(st, N.needs(st)[0], PASS); N.advance(st); }
  ok(st.over && st.round === 3, '카드 소진 → 끝');
  ok(N.view(st, -1).ranks.length === 3 && N.view(st, 0).final.score.length === 3, '끝나면 등수');
}
{
  const maskFor = sum => { for (let m = 0; m <= FULL; m++) if (sumOf(m) === sum) return m; return -1; };
  const sumOf = m => { let s = 0; for (let k = 0; k < B.length; k++) if (m & (1 << k)) s += B[k]; return s; };
  const mk = (n, wons, rems) => { const st = N.init({ n, seed: 3 }); st.won = wons; st.have = rems.map(maskFor); return st; };
  let s = N.standings(mk(4, [[9], [7], [7], [2]], [50, 40, 60, 30]));
  same(s.ranks, [0, 2, 1, 3], '점수 → 같으면 남은 블록이 많은 쪽'); same(s.out, [3], '꼴찌 탈락'); ok(s.dq === -1, '자격 박탈 없음');
  s = N.standings(mk(4, [[9], [7], [7], [2]], [20, 40, 60, 30]));
  ok(s.dq === 0, '점수 1등인데 남은 블록이 혼자 제일 적으면 박탈'); same(s.ranks, [1, 2, 0, 3], '박탈 → 차순위가 1등, 박탈된 사람은 2등');
  s = N.standings(mk(4, [[9], [7], [7], [2]], [20, 20, 60, 30]));
  ok(s.dq === -1 && s.ranks[0] === 0, '제일 적은 값이 겹치면 박탈 아님');
  s = N.standings(mk(3, [[4], [4], [4]], [30, 30, 30]));
  same(s.ranks, [0, 0, 0], '완전 동점은 공동 1등'); same(s.out, [], '모두 같으면 탈락 없음');
  s = N.standings(mk(3, [[9], [9], [1]], [10, 10, 40]));
  ok(s.dq === -1 && s.ranks[0] === 0 && s.ranks[1] === 0 && s.ranks[2] === 2, '1등 공동이면 박탈 없음 (꼴찌 2)');
  s = N.standings(mk(3, [[9], [3], [8]], [5, 6, 7]));
  ok(s.dq === 0 && s.ranks[2] === 0 && s.ranks[0] === 1 && s.ranks[1] === 2, '3명: 박탈 → 2등');
  s = N.standings(mk(3, [[9, 10], [3], [8]], [90, 6, 7]));   // GOOD 낀 점수
  ok(s.score[0] === 20 && s.ranks[0] === 0, 'GOOD 낀 점수 20');
}

// 6) 숨은 정보 · 구경 · 공개 지문
function snap(st) { return JSON.parse(JSON.stringify(st)); }
{
  const st = N.init({ n: 4, seed: 99 }), r = lcg(5);
  let g = 0;
  while (!N.over(st) && g++ < 400) {
    const need = N.needs(st);
    if (!need.length) { N.advance(st); continue; }
    const seats = [-1, 'all', 0, 1, 2, 3];
    const pubs = new Set(seats.map(s => N.view(st, s).pub));
    ok(pubs.size === 1, '공개 지문이 자리마다 다름');
    const st2 = snap(st); for (let k = st2.deck.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [st2.deck[k], st2.deck[j]] = [st2.deck[j], st2.deck[k]]; }
    st2.rs = 12345;
    for (const s of seats) { const a = N.view(st, s), b = N.view(st2, s); same(a, b, '안 열린 카드 순서만 다른 두 판의 보기 (' + s + ')'); }
    const V0 = N.view(st, 0); ok(!('deck' in V0) && !JSON.stringify(V0).includes('"rs"'), '덱 · 난수 상태는 보기에 없음');
    ok(V0.left.every((c, k, a) => !k || a[k - 1] <= c) && V0.left.length === st.deck.length, '안 열린 카드는 정렬한 묶음으로만');
    N.apply(st, need[0], N.ai(N.view(st, need[0]), need[0], 'normal', r));
  }
  ok(N.over(st), '구경용 판이 끝남');
  const vo = N.view(st, -1); ok(vo.over && vo.final && vo.ranks.length === 4 && N.view(st, 'all').ranks.join() === vo.ranks.join(), '구경 · 전체 보기 등수');
}

// 7) AI 끼리 끝까지 (보존 · 규칙 · 결정성)
function playOut(n, seed, tiers) {
  const st = N.init({ n, seed }), r = lcg(seed * 7 + 1);
  let steps = 0, paid = 0, rounds = 0;
  const prevHave = st.have.slice();
  while (!N.over(st) && steps < 6000) {
    const need = N.needs(st);
    if (!need.length) {
      if (st.res && st.phase === 'show') { paid += st.res.paid; rounds++; }
      ok(N.auto(st) != null, '입력이 없는데 자동으로도 안 넘어감 ' + st.phase);
      N.advance(st); steps++;
      st.have.forEach((m, i) => { ok((m & ~prevHave[i]) === 0, '블록이 늘어남'); prevHave[i] = m; });
      continue;
    }
    const seat = need[0], V = N.view(st, seat), L = N.legal(st, seat);
    ok(L.length > 0, '고를 수 있는 행동이 없음 ' + st.phase);
    const a = N.ai(V, seat, tiers[seat % tiers.length], r);
    const res = N.apply(st, seat, a);
    if (!res.ok) { ok(false, `AI 가 규칙을 어김 ${JSON.stringify(a)} → ${res.err}`); N.apply(st, seat, L[0]); }
    steps++;
  }
  ok(N.over(st), `${n}명 판이 끝남 (seed ${seed}, ${steps}번)`);
  const total = st.have.reduce((a, m) => a + B.reduce((s, v, k) => s + (m & (1 << k) ? v : 0), 0), 0);
  ok(n * 106 - total === paid, `쓴 블록 = 낙찰 때 사라진 합 (${n * 106 - total} / ${paid})`);
  const placed = st.won.reduce((a, w) => a + w.length, 0) + st.gone.length + (st.seen.includes(15) ? 1 : 0);
  ok(placed === st.seen.length, `열린 카드는 모두 어딘가에 있음 (${placed}/${st.seen.length})`);
  ok(new Set(st.seen).size === st.seen.length, '같은 카드가 두 번 열림');
  const R = N.ranks(st);
  ok(R.length === n && R.includes(0), '등수');
  ok(allDoneOrEmpty(st), '끝난 까닭');
  return st;
}
function allDoneOrEmpty(st) { return st.deck.length === 0 || (st.aw[10] && st.aw[11] && st.aw[12] && st.aw[14]); }
for (let n = 3; n <= 6; n++) for (let k = 0; k < 25; k++) playOut(n, 2000 + n * 31 + k, [['easy', 'normal', 'hard'][k % 3], 'normal', 'hard', 'easy', 'normal', 'hard']);
{
  const a = JSON.stringify(playOut(5, 4242, ['hard', 'normal', 'easy'])), b = JSON.stringify(playOut(5, 4242, ['hard', 'normal', 'easy']));
  ok(a === b, '같은 seed 는 같은 결과');
  ok(a !== JSON.stringify(playOut(5, 4243, ['hard', 'normal', 'easy'])), '다른 seed 는 다른 결과');
}

// 8) 고급이 초급을 이기는지 (1 명 고급 + 나머지 초급, 자리 돌려 가며)
function arena(n, tiersOf, games, seed0) {
  const rows = { avg: 0, pair: 0, wins: 0, pairN: 0 };
  for (let g = 0; g < games; g++) {
    const t = tiersOf(g), st = N.init({ n, seed: seed0 + g }), r = lcg(seed0 * 3 + g);
    let steps = 0;
    while (!N.over(st) && steps++ < 6000) {
      const need = N.needs(st);
      if (!need.length) { N.advance(st); continue; }
      const seat = need[0], a = N.ai(N.view(st, seat), seat, t[seat], r);
      if (!N.apply(st, seat, a).ok) N.apply(st, seat, N.legal(st, seat)[0]);
    }
    const R = N.ranks(st), h = g % n;
    rows.avg += R[h]; if (R[h] === 0) rows.wins++;
    for (let j = 0; j < n; j++) if (j !== h) { rows.pairN++; rows.pair += R[h] < R[j] ? 1 : R[h] === R[j] ? 0.5 : 0; }
  }
  rows.avg /= games; rows.pair /= rows.pairN; rows.wins /= games;
  return rows;
}
for (let n = 3; n <= 6; n++) {
  const games = n * 60;
  const r = arena(n, g => Array.from({ length: n }, (_, i) => (i === g % n ? 'hard' : 'easy')), games, 50000 + n * 1000);
  console.log(`  [고급 1 : 초급 ${n - 1}] ${games}판 · 고급 평균 등수 ${r.avg.toFixed(2)} (기준 ${((n - 1) / 2).toFixed(2)}) · 1등 ${(r.wins * 100).toFixed(0)}% (기준 ${(100 / n).toFixed(0)}%) · 초급 한 명 상대 이긴 비율 ${(r.pair * 100).toFixed(0)}%`);
  ok(r.pair > 0.55, `${n}명: 고급이 초급 상대 승률 > 55% (${(r.pair * 100).toFixed(1)}%)`);
  ok(r.avg < (n - 1) / 2 - 0.1, `${n}명: 고급 평균 등수가 기준보다 좋음 (${r.avg.toFixed(2)})`);
}
{
  const r = arena(4, g => Array.from({ length: 4 }, (_, i) => (i === g % 4 ? 'hard' : 'normal')), 240, 90000);
  console.log(`  [고급 1 : 중급 3] 240판 · 고급 평균 등수 ${r.avg.toFixed(2)} · 중급 상대 이긴 비율 ${(r.pair * 100).toFixed(0)}%`);
  const q = arena(4, g => Array.from({ length: 4 }, (_, i) => (i === g % 4 ? 'normal' : 'easy')), 240, 95000);
  console.log(`  [중급 1 : 초급 3] 240판 · 중급 평균 등수 ${q.avg.toFixed(2)} · 초급 상대 이긴 비율 ${(q.pair * 100).toFixed(0)}%`);
  ok(q.pair > 0.5, '중급이 초급보다 낫거나 비슷함');
}

console.log(`숫자 경매 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

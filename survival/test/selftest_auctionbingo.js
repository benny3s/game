// 경매 빙고 규칙 시험 (node survival/test/selftest_auctionbingo.js)
'use strict';
const A = require('../games/auctionbingo/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');

// 1) 판 모양: 칸 9개 = ○4 △3 ☆2
{
  const c = [0, 0, 0]; A.BOARD.forEach(s => c[s]++);
  eq(c, [4, 3, 2], '판에 ○4 △3 ☆2 칸');
  eq(A.COINS.reduce((a, b) => a + b, 0), 30, '코인 합 30원');
  ok(A.LINES.length === 8, '빙고 줄 8개');
}

// 2) 자동 배치
{
  eq([A.place([4, 3, 2]).lines, A.place([4, 3, 2]).fill], [8, 9], '전부 모으면 9칸 · 8줄');
  eq(A.place([0, 0, 0]).lines, 0, '타일 없음 0줄');
  eq(A.place([4, 0, 0]).lines, 0, '○만으로는 줄 없음');
  eq(A.place([2, 0, 1]).lines, 1, '○2 + ☆1 = 가운데 가로 1줄 (○☆○)');
  eq(A.place([6, 0, 0]).thrown, [2, 0, 0], '넘친 타일은 버림');
  ok(A.place([2, 3, 0]).lines >= 1, '○2 △3 으로 위 가로줄 (△○△)');
  // 무엇이든 최대 줄 수 = 전수 확인
  let bad = 0;
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 3; b++) for (let c = 0; c <= 2; c++) {
    const p = A.place([a, b, c]);
    if (p.fill !== a + b + c) bad++;
    // 독립 계산: 칸 부분집합 전수
    let best = 0;
    for (let m = 0; m < 512; m++) {
      const cnt = [0, 0, 0]; let okm = true;
      for (let x = 0; x < 9; x++) if (m & (1 << x)) { const s = A.BOARD[x]; if (++cnt[s] > [a, b, c][s]) { okm = false; break; } }
      if (!okm) continue;
      const ln = A.LINES.filter(L => L.every(x => m & (1 << x))).length;
      if (ln > best) best = ln;
    }
    if (best !== p.lines) { bad++; console.error('줄 수 불일치', a, b, c, best, p.lines); }
  }
  ok(bad === 0, '자동 배치 = 전수 계산 (타일 모든 조합)');
}

// 3) 한 라운드 손으로: 4명
{
  const st = A.init({ n: 4, seed: 5 });
  eq(A.needs(st).length, 1, '선택은 한 명씩');
  const seq = st.order.slice();
  const pickOf = [0, 0, 1, 2];   // 자리 0,1 = ○ / 2 = △ / 3 = ☆
  ok(!A.apply(st, (seq[0] + 1) % 4, { t: 'pick', s: 0 }).ok, '내 차례가 아니면 못 고름');
  for (const s of seq) ok(A.apply(st, s, { t: 'pick', s: pickOf[s] }).ok, '선택 ' + s);
  eq(st.phase, 'bid', '선택이 끝나면 입찰');
  eq(A.needs(st).slice().sort(), [0, 1, 2, 3], '입찰은 모두 동시에');
  // 자리 0: 코인 3개(1원짜리 둘 + 2원 = 4원), 자리 1: 10원 → 1이 낙찰 (○ 2장)
  ok(!A.apply(st, 0, { t: 'bid', c: [] }).ok, '빈 입찰 거절');
  ok(!A.apply(st, 0, { t: 'bid', c: [0, 0] }).ok, '같은 코인 두 번 거절');
  ok(!A.apply(st, 0, { t: 'bid', c: [0, 1, 2, 3, 4, 5, 6] }).ok, '7개 내면 나머지 라운드를 못 내서 거절');
  ok(A.apply(st, 0, { t: 'bid', c: [0, 1, 3] }).ok, '자리 0 입찰');
  ok(A.apply(st, 1, { t: 'bid', c: [9] }).ok, '자리 1 입찰 10원');
  ok(A.apply(st, 2, { t: 'bid', c: [8] }).ok, '자리 2 입찰 5원 (혼자)');
  ok(!A.apply(st, 0, { t: 'bid', c: [2] }).ok, '두 번 입찰 거절');
  ok(A.apply(st, 3, { t: 'bid', c: [5] }).ok, '자리 3 입찰 2원 (혼자)');
  eq(st.phase, 'show', '결과 보기');
  eq(st.tiles[1], [2, 0, 0], '10원이 ○ 타일 2개');
  eq(st.tiles[0], [0, 0, 0], '진 사람은 못 받음');
  eq(st.tiles[2], [0, 1, 0], '혼자 △ 1개');
  eq(st.tiles[3], [0, 0, 1], '혼자 ☆ 1개');
  eq(st.res.price, [10, 5, 2], '낙찰가');
  eq(st.res.secret, [true, false, false], '가장 높은 ○ 가 시크릿');
  const V0 = A.view(st, 0);
  eq(V0.res.price, [null, 5, 2], '공개 낙찰가에서 시크릿은 가려짐');
  ok(!('tiles' in V0) && !V0.sec, '내 눈에는 남의 타일이 안 보임');
  eq(V0.mine[0].won, null, '시크릿 도형이라 이겼는지 모름 (짐작 null)');
  eq(A.view(st, 2).mine[0].won, true, '혼자 들어간 도형은 이긴 걸 앎');
}

// 4) 동률 · 나누기 · 버림 (5명: ○ 3명 같은 값)
{
  const st = A.init({ n: 5, seed: 9 });
  const pk = [0, 0, 0, 1, 1];
  for (const s of st.order) A.apply(st, s, { t: 'pick', s: pk[s] });
  A.apply(st, 0, { t: 'bid', c: [3] }); A.apply(st, 1, { t: 'bid', c: [4] }); A.apply(st, 2, { t: 'bid', c: [0] });   // ○: 2원 2원 1원
  A.apply(st, 3, { t: 'bid', c: [6] }); A.apply(st, 4, { t: 'bid', c: [7] });                                      // △: 3원 3원
  eq(st.tiles.map(t => t[0]), [1, 1, 0, 0, 0], '○ 타일 3개를 둘이 나누면 1개씩, 나머지는 버림');
  eq(st.tiles.map(t => t[1]), [0, 0, 0, 1, 1], '△ 타일 2개를 둘이 나누면 1개씩');
  eq(st.res.price, [2, 3, -1], '아무도 안 고른 ☆ 는 낙찰가 없음');
  eq(st.res.secret, [false, true, false], '가장 높은 △ 시크릿');
}

// 5) 끝까지 (AI 끼리) + 불변식 + 숨김 확인
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function playOut(n, seed, tiers, hook) {
  const st = A.init({ n, seed }), r = rngOf(seed ^ 77);
  let guard = 0, rounds = 0;
  while (!A.over(st) && guard++ < 5000) {
    const need = A.needs(st);
    if (!need.length) { ok(A.auto(st) != null, '입력도 자동도 없으면 멈춤'); A.advance(st); if (st.phase === 'pick') rounds++; continue; }
    for (const s of need.slice()) {
      const V = A.view(st, s);
      const a = A.ai(V, s, tiers[s % tiers.length], r);
      const res = A.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${tiers[s % tiers.length]}, 자리 ${s}, ${JSON.stringify(a)}): ${res.err}`); return st; }
      if (hook) hook(st, s);
    }
  }
  ok(A.over(st), `끝남 (n=${n} seed=${seed})`);
  return st;
}
const TIERS = [['easy'], ['normal'], ['hard'], ['easy', 'normal', 'hard']];
for (let n = 3; n <= 8; n++) for (let k = 0; k < 4; k++) {
  const st = playOut(n, 100 + n * 10 + k, TIERS[k]);
  const T = st.tiles.reduce((a, t) => a + t[0] + t[1] + t[2], 0);
  ok(T <= n * 7, `받은 타일 합 ≤ 인원×7 (${T} ≤ ${n * 7})`);
  st.coins.forEach((c, i) => { ok(c.filter(Boolean).length >= 0 && st.myr[i].length === 7, `자리 ${i}: 7번 모두 냄`); });
  st.myr.forEach(m => m.forEach(x => ok(x.c.length >= 1, '매 라운드 1개 이상')));
  ok(A.ranks(st).some(x => x === 0), '1등이 있음');
  ok(A.ranks(st).every(x => x >= 0 && x < n), '등수 범위');
  // 순위 키 확인
  const rows = st.final.rows;
  rows.forEach(x => rows.forEach(y => { if ((x.lines * 10000 + x.fill * 100 + x.coins) > (y.lines * 10000 + y.fill * 100 + y.coins)) ok(st.final.ranks[x.i] < st.final.ranks[y.i], '빙고 → 칸 → 코인 순'); }));
}

// 6) 숨김: 남의 숨은 것(코인 · 타일 · 입찰값)을 바꿔도 내 눈에 보이는 것 · 선생님 글 · AI 수가 같아야 함
{
  let leaks = 0, checks = 0;
  for (let k = 0; k < 10; k++) {
    const n = 3 + (k % 5), st = A.init({ n, seed: 400 + k }), r = rngOf(k + 5);
    let steps = 0;
    while (!A.over(st) && steps++ < 800) {
      const need = A.needs(st);
      if (!need.length) { A.advance(st); continue; }
      for (const s of need.slice()) {
        // 지금 s 에게 보이는 것과, 남의 숨은 것을 바꾼 판에서 보이는 것을 비교
        if (steps % 2 === 0) {
          const alt = JSON.parse(JSON.stringify(st));
          for (let o = 0; o < n; o++) {
            if (o === s) continue;
            alt.tiles[o] = [(alt.tiles[o][0] + 1) % 5, (alt.tiles[o][1] + 2) % 4, (alt.tiles[o][2] + 1) % 3];
            const have = alt.coins[o].map((x, i) => (x ? i : -1)).filter(i => i >= 0);
            alt.coins[o] = alt.coins[o].slice().reverse().map((x, i, a) => a[i]);   // 같은 개수, 다른 코인
            if (alt.bids[o]) alt.bids[o] = alt.bids[o].slice().reverse();
            alt.myr[o] = alt.myr[o].map(m => ({ ...m, v: m.v + 7, c: [] }));
          }
          alt.rounds.forEach(h => { h.vals = h.vals.map(v => v + 3); h.win = h.win.map(() => 9); });
          const v1 = A.view(st, s), v2 = A.view(alt, s);
          // 같은 개수 보존을 확인 (공개 정보)
          const cnt1 = JSON.stringify(v1.coinCnt), cnt2 = JSON.stringify(v2.coinCnt);
          checks++;
          if (cnt1 === cnt2 && JSON.stringify(v1) !== JSON.stringify(v2)) { leaks++; if (leaks < 4) console.error('누출 의심: 자리', s, 'n', n); }
          if (cnt1 === cnt2) {
            const c1 = A.coach(v1, s, -1, null), c2 = A.coach(v2, s, -1, null);
            if (JSON.stringify(c1) !== JSON.stringify(c2)) { leaks++; if (leaks < 4) console.error('선생님 글이 숨은 것에 따라 달라짐', s); }
            const a1 = A.ai(v1, s, 'hard', rngOf(1)), a2 = A.ai(v2, s, 'hard', rngOf(1));
            if (JSON.stringify(a1) !== JSON.stringify(a2)) { leaks++; if (leaks < 4) console.error('AI 수가 숨은 것에 따라 달라짐', s); }
          }
        }
        const a = A.ai(A.view(st, s), s, 'normal', r);
        ok(A.apply(st, s, a).ok, '숨김 시험 진행');
      }
    }
  }
  ok(checks > 20, '숨김 비교 횟수 ' + checks);
  ok(leaks === 0, '남의 숨은 것이 내 화면 · 선생님 · AI 에 새지 않음 (누출 ' + leaks + ')');
}

// 7) 공개 지문 = 모든 자리가 같아야 함
{
  const st = A.init({ n: 5, seed: 3 }), r = rngOf(3);
  let steps = 0;
  while (!A.over(st) && steps++ < 600) {
    const need = A.needs(st);
    if (!need.length) { A.advance(st); continue; }
    const pubs = new Set([...Array(5).keys()].map(i => A.view(st, i).pub).concat(A.view(st, 'all').pub));
    ok(pubs.size === 1, '모든 자리의 pub 지문이 같음');
    const s = need[0]; A.apply(st, s, A.ai(A.view(st, s), s, 'normal', r));
  }
}

// 낙찰가 = 내 입찰값이어도 같은 도형을 고른 사람이 여럿이면 동률 가능 → 확실한 타일은 1개뿐 (리뷰 지적)
{
  const hist = [{ r: 1, picks: [0, 0, 1], cnt: [2, 1, 0], price: [3, 2, null], secret: [false, false, false] }];
  const a = A.inferMine([{ r: 1, sh: 0, v: 3 }], hist)[0];
  ok(a.won === true && a.sure === 1 && a.maybe === 1, '동률 가능: 확실 1 · 더 받았을 수 있는 것 1 (' + JSON.stringify(a) + ')');
  const b = A.inferMine([{ r: 1, sh: 0, v: 2 }], hist)[0];
  ok(b.won === false && b.sure === 0 && b.maybe === 0, '낙찰가보다 낮게 냈으면 못 받음');
  const c2 = A.inferMine([{ r: 1, sh: 1, v: 1 }], hist)[0];
  ok(c2.won === true && c2.sure === 1 && c2.maybe === 0, '혼자 골랐으면 1개 확실');
  const d = A.inferMine([{ r: 1, sh: 0, v: 5 }], [{ r: 1, picks: [0, 0], cnt: [2, 0, 0], price: [null, null, null], secret: [true, false, false] }])[0];
  ok(d.won === null && d.sure === 0 && d.maybe === 2, '시크릿이면 이겼는지부터 모름');
}

console.log(`경매 빙고 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

// 블라인드 경매 규칙 시험 (node survival/test/blindauction_selftest.js [--quick])
'use strict';
const C = require('../games/blindauction/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const sum = a => a.reduce((x, y) => x + y, 0);
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// 덱 맨 앞 자리(칸 번호)를 내가 정한 카드로 — 시험용
const tokOf = (k, x) => C.TOKENS.findIndex(t => (k === 'item' ? t.k === 'item' && t.id === x : t.e === x));
function setup(n, order, seed) {
  const st = C.init({ n, seed: seed || 1 }); st.lead = 0;
  const used = new Set(), deck = []; for (const [k, x] of order) { const i = tokOf(k, x); used.add(i); deck.push(i); }
  const rest = st.deck.filter(i => !used.has(i)); st.deck = deck.concat(rest); return st;
}
const must = (st, s, a, m) => { const r = C.apply(st, s, a); ok(r.ok, `${m || ''} ${J(a)} → ${r.err}`); return r; };
const bad = (st, s, a, m) => { const r = C.apply(st, s, a); ok(!r.ok, `${m} 가 막혀야 함`); };

// 1) 방송 값 · 구성
ok(C.ITEMS.length === 22, '물품 22장');
ok(C.TOTAL === 18187000, `물품 총액 1,818억 7,000만 원 (${C.TOTAL})`);
ok(C.TOKENS.length === 30 && C.NCARD === 30, '매물 카드 30장');
ok(C.TOKENS.filter(t => t.k === 'gain').length === 4 && C.TOKENS.filter(t => t.k === 'loss').length === 4, '이익 4 · 손해 4');
ok(J(C.CUBES) === J([1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25]) && sum(C.CUBES) === 106, '큐브 11개');
const val = nm => C.ITEMS.find(x => x.nm.includes(nm)).v;
ok(val('마이클 잭슨') === 49000 && val('파텍') === 2655000 && val('우주여행') === 65000 && val('코비') === 1015000 && val('버핏') === 2753000 && val('아크로') === 2900000 && val('오타니') === 435000, '방송 표 7장 값 그대로');
{ const st = C.init({ n: 4, seed: 5 }); ok(st.hand.every(h => J(h) === J(C.CUBES)), '모두 큐브 11개'); ok(new Set(st.deck).size === 30, '덱 30장 섞임'); ok(J(C.needs(st)) === J([st.lead]), '선이 카드를 고름'); }
for (const n of [3, 4, 5]) { const st = C.init({ n, seed: n }); ok(st.n === n, `인원 ${n}`); }

// 2) 가려진 정보
{
  const st = setup(3, [['item', 1], ['item', 0]]);
  must(st, 0, { t: 'card', pos: 0 }, '카드');
  const V0 = C.view(st, 0), V1 = C.view(st, 1), Vw = C.view(st, -1);
  ok(V0.bid && V0.bid.id === 1, '물품 이름은 모두에게 공개');
  must(st, 0, { t: 'bid', cubes: [20] }, '입찰'); must(st, 1, { t: 'pass' }); must(st, 2, { t: 'pass' });
  ok(st.phase === 'show' && st.items[0].length === 1, '낙찰');
  ok(!st.hand[0].includes(20) && st.hand[0].length === 10, '낙찰자 큐브는 사라짐');
  const a = C.view(st, 0), b = C.view(st, 1), w = C.view(st, -1);
  ok(a.items[0][0].v === val('파텍'), '낙찰자는 값을 앎');
  ok(b.items[0][0].v === undefined && w.items[0][0].v === undefined && !J(b).includes('2655000'), '남에게는 값이 안 보임');
  ok(b.items[0][0].nm.includes('파텍'), '이름은 보임');
  ok(C.view(st, 'all').items[0][0].v === val('파텍'), '전체 보기는 값 보임');
  ok(J(C.view(st, 1).hand) === J(st.hand[1]), '내 큐브');
}

// 3) 공개 입찰 규칙
{
  const st = setup(3, [['item', 3], ['item', 4], ['item', 5]]);
  must(st, 0, { t: 'card', pos: 0 }); ok(st.bid.cur === 0, '선부터 입찰');
  bad(st, 1, { t: 'bid', cubes: [3] }, '차례 아닌 입찰');
  bad(st, 0, { t: 'bid', cubes: [5] }, '없는 큐브'); bad(st, 0, { t: 'bid', cubes: [3, 3] }, '같은 큐브 두 번'); bad(st, 0, { t: 'bid', cubes: [] }, '빈 입찰');
  must(st, 0, { t: 'bid', cubes: [3, 4] });                      // 합 7
  ok(st.bid.high === 7 && st.bid.hi === 0 && st.bid.cur === 1, '합 7 · 다음 사람');
  bad(st, 1, { t: 'bid', cubes: [6] }, '최고 이하 입찰'); bad(st, 1, { t: 'bid', cubes: [4] }, '같은 값'); must(st, 1, { t: 'bid', cubes: [8] });
  ok(st.bid.high === 8, '8 로 올림');
  must(st, 2, { t: 'pass' }); ok(st.bid.cur === 0, '포기한 사람은 건너뜀');
}
{
  const st = setup(3, [['item', 3]]); must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'bid', cubes: [3, 4] }); must(st, 1, { t: 'bid', cubes: [8] }); must(st, 2, { t: 'pass' });
  bad(st, 0, { t: 'bid', cubes: [1] }, '내 합 7+1=8 은 최고 8 과 같아 안 됨');
  must(st, 0, { t: 'bid', cubes: [2] }); ok(st.bid.high === 9 && st.bid.tab[0].join() === '2,3,4', '전에 낸 큐브 + 새로 낸 큐브');
  must(st, 1, { t: 'pass' }); ok(st.phase === 'show' && st.res.w === 0, '한 명 남으면 낙찰');
  ok(J(st.hand[1]) === J(C.CUBES), '포기한 사람은 낸 큐브를 돌려받음 (8 환원)');
  ok(J(st.hand[0]) === J(C.CUBES.filter(c => ![2, 3, 4].includes(c))), '낙찰자는 낸 큐브 소멸');
  ok(st.lead === 0, '낙찰자가 다음 선');
}
{ // 아무도 안 부르면 마지막 사람이 가장 작은 큐브 1개로
  const st = setup(3, [['item', 3]]); must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'pass' }); must(st, 1, { t: 'pass' });
  ok(st.phase === 'show' && st.res.w === 2 && st.res.free && st.res.spent[0] === 1, '남은 한 명이 큐브 1 로 가져감');
  ok(!st.hand[2].includes(1), '그 큐브는 소멸');
}
{ // 더 높게 못 부르면 자동 포기
  const st = setup(3, [['item', 3]]); must(st, 0, { t: 'card', pos: 0 });
  st.hand[1] = [1, 2]; must(st, 0, { t: 'bid', cubes: [25, 20] });
  ok(st.bid.pass[1] === true, '내 큐브 합(3)으로 45를 못 넘으면 자동 포기');
}

// 4) 특수 카드 — 비공개 입찰
{
  const st = setup(3, [['gain', 'steal'], ['item', 0], ['item', 1]]);
  // 먼저 다른 사람에게 물품을 줌
  st.items[1].push({ id: 5, h: 0 }); st.items[2].push({ id: 2, h: 0 });
  must(st, 0, { t: 'card', pos: 0 }); ok(st.phase === 'sbid' && st.spec === 1 && st.sb.e === 'steal', '특수 카드 → 비공개 입찰');
  ok(J(C.needs(st)) === J([0, 1, 2]), '모두 동시에 입찰');
  bad(st, 0, { t: 'sbid', cubes: [] }, '큐브 0개 입찰'); bad(st, 0, { t: 'sbid', cubes: [99] }, '없는 큐브');
  must(st, 0, { t: 'sbid', cubes: [20] }); must(st, 1, { t: 'sbid', cubes: [8, 4] });
  const V1 = C.view(st, 1), V2 = C.view(st, 2);
  ok(V1.sb.got[0] === true && !J(V2.sb).includes('20') && V2.sb.mine === null, '남의 입찰 큐브는 안 보임 (냈는지만)');
  ok([...V1.sb.mine].sort((a, b) => a - b).join() === '4,8', '내 입찰은 내게 보임');
  must(st, 2, { t: 'sbid', cubes: [1] });
  ok(st.phase === 'swap' && st.sw.s === 0 && st.sw.e === 'steal', '이익 = 가장 크게 낸 0번이 강탈');
  ok(!st.hand[0].includes(20) && !st.hand[1].includes(8) && !st.hand[2].includes(1), '입찰한 큐브는 모두 소멸');
  ok(C.view(st, 2).hid[0] === 1 && C.view(st, 2).hid[1] === 2, '몰래 쓴 큐브 개수는 공개');
  bad(st, 0, { t: 'steal', from: 0, theirs: 0 }, '자기 물품 강탈'); bad(st, 0, { t: 'steal', from: 1, theirs: 3 }, '없는 물품');
  must(st, 0, { t: 'steal', from: 1, theirs: 0 });
  ok(st.items[0].length === 1 && st.items[0][0].id === 5 && st.items[1].length === 0, '강탈 성공'); ok(st.phase === 'show' && st.lead === 0, '이익 받은 사람이 선');
}
{ // 교환권: 내 물품이 없으면 쓸 수 없음 · 동률 재입찰 · 이익 사라짐
  const st = setup(3, [['gain', 'swap']]); st.items[1].push({ id: 5, h: 0 });
  must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'sbid', cubes: [12] }); must(st, 1, { t: 'sbid', cubes: [12] }); must(st, 2, { t: 'sbid', cubes: [3] });
  ok(st.phase === 'sbid' && st.sb.tries === 2 && J(st.sb.who) === J([0, 1]), '동률은 그 사람끼리 다시 입찰');
  ok(J(C.needs(st)) === J([0, 1]), '재입찰은 동률인 사람만');
  must(st, 0, { t: 'sbid', cubes: [4] }); must(st, 1, { t: 'sbid', cubes: [4, 0 + 6] }); // 6+4 = 10
  ok(st.phase === 'show' && st.res.sw === false && st.res.unused, '내 물품이 없어 교환권은 쓸 수 없고 지나감');
}
{ // 동률이 또 나오면 이익은 사라짐
  const st = setup(3, [['gain', 'steal']]); st.items[1].push({ id: 5, h: 0 });
  must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'sbid', cubes: [12] }); must(st, 1, { t: 'sbid', cubes: [12] }); must(st, 2, { t: 'sbid', cubes: [3] });
  must(st, 0, { t: 'sbid', cubes: [4] }); must(st, 1, { t: 'sbid', cubes: [4] });
  ok(st.phase === 'show' && st.res.tied && st.items[0].length === 0 && st.items[1].length === 1, '또 같으면 이익은 사라짐');
}
{ // 손해: 가장 작게 → 받음 · 동률이 또 나오면 모두
  const st = setup(3, [['loss', 'half']]); st.items[0].push({ id: 5, h: 0 }); st.items[1].push({ id: 6, h: 0 });
  must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'sbid', cubes: [10] }); must(st, 1, { t: 'sbid', cubes: [8] }); must(st, 2, { t: 'sbid', cubes: [2] });
  ok(st.phase === 'show' && st.res.win.join() === '2' && st.items[0][0].h === 0, '가장 작게 낸 2번만 손해 (물품 없음)');
  const t = setup(3, [['loss', 'half']]); t.items[0].push({ id: 5, h: 0 }); t.items[1].push({ id: 6, h: 0 });
  must(t, 0, { t: 'card', pos: 0 }); must(t, 0, { t: 'sbid', cubes: [10] }); must(t, 1, { t: 'sbid', cubes: [2] }); must(t, 2, { t: 'sbid', cubes: [2] });
  must(t, 1, { t: 'sbid', cubes: [3] }); must(t, 2, { t: 'sbid', cubes: [3] });
  ok(t.res.win.length === 3 && t.items[0][0].h === 1 && t.items[1][0].h === 1, '재입찰도 같으면 손해는 모두에게');
  ok(C.view(t, 0).items[0][0].v === val(C.ITEMS[5].nm) / 2, '50% 삭감 = 값 절반');
}
{ // 최고가 반납
  const st = setup(3, [['loss', 'drop'], ['item', 0]]); st.items[0].push({ id: 5, h: 0 }, { id: 0, h: 0 });
  must(st, 0, { t: 'card', pos: 0 });
  must(st, 0, { t: 'sbid', cubes: [1] }); must(st, 1, { t: 'sbid', cubes: [5 + 0 + 4 - 4 + 6 - 5] }); must(st, 2, { t: 'sbid', cubes: [12] });
  ok(st.res.win[0] === 0 && st.items[0].length === 1 && st.items[0][0].id === 0, '가장 비싼 물품(아크로)이 사라짐');
  const p = setup(3, [['loss', 'drop'], ['item', 4]]); // 물품이 없으면 다음에 얻는 물품에 바로
  must(p, 0, { t: 'card', pos: 0 }); must(p, 0, { t: 'sbid', cubes: [1] }); must(p, 1, { t: 'sbid', cubes: [3] }); must(p, 2, { t: 'sbid', cubes: [3] });
  ok(p.pend[0] === 1 && p.lead === 0, '반납 대기');
  p.advance = null; C.advance(p); must(p, 0, { t: 'card', pos: 1 }); must(p, 0, { t: 'bid', cubes: [2] }); must(p, 1, { t: 'pass' }); must(p, 2, { t: 'pass' });
  ok(p.items[0].length === 0 && p.pend[0] === 0 && p.res.lost === 4, '얻자마자 반납으로 사라짐');
}

// 5) 끝 · 점수
{
  const st = setup(4, [['gain', 'steal'], ['loss', 'half'], ['loss', 'drop'], ['item', 0]]);
  for (let i = 0; i < 2; i++) { must(st, st.lead, { t: 'card', pos: i }); for (let s = 0; s < 4; s++) must(st, s, { t: 'sbid', cubes: [C.CUBES[s + 3 * i]] }); C.advance(st); }
  ok(st.spec === 2 && st.rankInfo && st.rankInfo.order.length === 4, '2번째 특수 카드 뒤 물품 총액 순위 공개');
  while (st.phase !== 'pick' && !C.over(st)) C.advance(st);
  must(st, st.lead, { t: 'card', pos: 2 });
  ok(st.phase === 'show' && st.res.k === 'end3', '3번째 특수 카드 → 경매 없이 끝');
  C.advance(st); ok(C.over(st) && st.end === 'special', '끝');
}
{ // 점수: 큐브 합 최저는 절반 · 큐브 없음은 꼴찌 · 동률은 큐브 많은 쪽
  const st = C.init({ n: 3, seed: 1 });
  st.items = [[{ id: 5, h: 0 }], [{ id: 5, h: 0 }], [{ id: 1, h: 0 }]]; st.hand = [[10, 5], [20], [12, 6]];
  const f = C.finalScores(st);
  ok(f[0].half && !f[1].half && !f[2].half, '남은 큐브 합이 가장 작은 사람만 절반'); ok(f[0].total === val('아크로') / 2 && f[1].total === val('아크로'), '절반 계산');
  const r = C.ranks(st); ok(r[1] === 0 && r[2] === 1 && r[0] === 2 || r[1] < r[0], `순위 ${r}`);
  st.hand[1] = []; const f2 = C.finalScores(st); ok(f2[1].out, '큐브를 다 쓰면 꼴찌 표시'); ok(C.ranks(st)[1] === 2, '큐브 다 쓴 사람은 꼴찌');
  st.hand = [[10, 5], [10, 5], [12, 6]]; st.items = [[{ id: 5, h: 0 }], [{ id: 5, h: 0 }], [{ id: 5, h: 0 }]];
  const r2 = C.ranks(st); ok(r2[2] === 0, '값이 같으면 큐브 합이 많은 쪽'); ok(r2[0] === 1 && r2[1] === 1, '모두 같으면 공동 순위 (절반이 된 두 명)');
}
{ // 큐브 다 쓰면 끝
  const st = setup(3, [['item', 0]]); st.hand = [[], [], []]; must(st, 0, { t: 'card', pos: 0 });
  ok(st.phase === 'show', '아무도 큐브 없음'); C.advance(st); ok(C.over(st), '모두 큐브가 없으면 끝');
}

// 6) AI 가 늘 합법인가 · 끝까지 · 숨은 정보 · 결정성 · 판당 길이
function playAI(seed, tiers, check) {
  const n = tiers.length, st = C.init({ n, seed }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 4000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a); if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
const T = ['easy', 'normal', 'hard'];
const N = QUICK ? 24 : 120; let items = 0, rounds = 0, ends = {};
for (let g = 0; g < N; g++) {
  const n = 3 + g % 3, tiers = Array.from({ length: n }, (_, i) => T[(i + g) % 3]);
  let st;
  try { st = playAI(g + 1, tiers, (st, s, V, V0, a) => { ok(J(C.view(st, s)) === V0, 'view 가 상태를 바꿈'); ok(!J(V).includes('"v":') || V.items.every((arr, x) => arr.every(it => it.v === undefined || x === s)), `남의 물품 값이 view 에 보임 (seat ${s})`); }); }
  catch (e) { ok(false, `판 ${g + 1} n${n}: ${e.message}`); continue; }
  ok(st.spec >= 0, '끝'); rounds += st.round; items += st.itemsSeen.length; ends[st.end] = (ends[st.end] || 0) + 1;
  const rk = C.ranks(st); ok(rk.length === n && Math.min(...rk) === 0, '순위'); ok(sum(st.items.map(a => a.length)) <= st.itemsSeen.length, '물품 수');
  const total = sum(st.items.flat().map(it => 0 + 1)); void total;
  ok(sum(C.view(st, 'all').fin.map(f => f.items)) <= C.TOTAL, '물품 합이 총액을 못 넘음');
}
ok(rounds / N > 6 && rounds / N < 26, `판당 카드 ${(rounds / N).toFixed(1)}장`);
{ const a = playAI(7, ['hard', 'hard', 'hard', 'hard'], null), b = playAI(7, ['hard', 'hard', 'hard', 'hard'], null); ok(J(a.log) === J(b.log), '고급 AI 는 결정적'); }

// 7) AI 단계가 정말 다른가 (큰 시험은 tier_bench)
function win(a, b, G) { let w = 0, c = 0; for (let g = 0; g < G; g++) { const n = 4, tiers = Array.from({ length: n }, (_, s) => ((s + g) % n === 0 ? a : b)), me = (n - g % n) % n, st = playAI(g + 1, tiers, null), rk = C.ranks(st); for (let s = 0; s < n; s++) if (s !== me) { c++; w += rk[me] < rk[s] ? 1 : rk[me] === rk[s] ? 0.5 : 0; } } return w / c; }
{ const G = QUICK ? 60 : 200, he = win('hard', 'easy', G), hn = win('hard', 'normal', G); ok(he > 0.53, `고급이 초급보다 낫다 (${he.toFixed(2)})`); ok(hn > 0.5, `고급이 보통보다 낫다 (${hn.toFixed(2)})`); }
// 8) 시간
{ const t = Date.now(); playAI(11, ['hard', 'hard', 'hard', 'hard', 'hard'], null); ok(Date.now() - t < 1500, `고급 AI 5명 한 판 ${Date.now() - t}ms`); }
console.log(`blindauction selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

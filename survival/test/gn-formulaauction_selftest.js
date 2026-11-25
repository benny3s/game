// 수식 경매 규칙 시험 (node survival/test/gn-formulaauction_selftest.js)
// 방송 장면 그대로: 1회 성규 1 · 3 · 5 vs 김경란 2 · 4 (낸 큐브 모두 버려짐) · 6회 박은지 1 vs 김경란 1 (낙찰방해) · 13회 절대큐브 · 20회 성규 1 + 「10 ÷」 = 10 (즉시 종료) ·
// 순서표 24회 · 수식 판정(곱셈 먼저 · 분수 · 타일 모두 사용) · 24회 뒤 10 에 가까운 순서(9 와 11 이면 11) · 숨은 정보 · 재현 · AI 무작위 판
'use strict';
const G = require('../games/gn-formulaauction/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const clone = v => JSON.parse(JSON.stringify(v));
const fpOf = st => JSON.stringify(st);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mk = (n, seed, cfg) => G.init({ n, seed: seed || 1, cfg: Object.assign({}, cfg) });
const P = { t: 'pass' }, B = c => ({ t: 'bid', c });
const allPass = st => { for (const s of G.needs(st).slice()) G.apply(st, s, P); };
const toLot = (st, lot) => { let g = 0; while (st.lot < lot && !st.over && g++ < 600) { if (G.needs(st).length) allPass(st); else G.advance(st); } };
const settle = st => { let g = 0; while (G.needs(st).length && g++ < 100) allPass(st); };   // 남은 창을 모두 넘기기로 끝냄 (낙찰)

// 1) 수식 판정
{
  const ev = (n, o) => G.fmt(G.evalSeq(n, o));
  ok(ev([10, 1], ['÷']) === '10', '10 ÷ 1 = 10 (성규 우승 수식)');
  ok(ev([2, 6, 2], ['×', '−']) === '10', '2 × 6 − 2 = 10 (박은지 계획)');
  ok(ev([2, 3, 4], ['+', '×']) === '14' && ev([2, 3, 4], ['×', '+']) === '10', '곱셈 먼저: 2 + 3 × 4 = 14 · 2 × 3 + 4 = 10');
  ok(ev([8, 2, 2], ['÷', '×']) === '8' && ev([8, 2, 2], ['×', '÷']) === '8', '곱셈 · 나눗셈은 왼쪽부터: 8 ÷ 2 × 2 = 8');
  ok(ev([1, 2], ['÷']) === '1/2' && ev([1, 3, 3], ['÷', '×']) === '1' && ev([7, 2], ['÷']) === '7/2', '분수는 정확하게 (소수 오차 없음)');
  ok(ev([1, 3, 4], ['−', '−']) === '-6' && ev([5, 8], ['−']) === '-3', '음수도 계산');
  ok(G.hit10([1, 10], ['÷']) === '10 ÷ 1' && G.hit10([1, 10], ['×']) !== '' && G.hit10([5, 5], ['+']) === '5 + 5', '타일 순서는 내가 정함: 1 · 10 · ÷ 로 10 ÷ 1');
  ok(G.hit10([2, 6, 2], ['×', '−']) !== '' && G.hit10([2, 2, 6], ['−', '×']) !== '', '2 · 2 · 6 · × · − 도 10');
  ok(G.hit10([1, 2], ['+']) === '' && G.hit10([5], []) === '' && G.hit10([5, 5], []) === '' && G.hit10([5, 5, 5], ['+']) === '', '개수가 안 맞거나(숫자 = 기호 + 1) 한 장뿐이면 식이 안 됨');
  ok(G.hit10([1, 2, 3, 4], ['+', '+', '+']) !== '' && G.hit10([1, 1, 1, 1], ['+', '+', '+']) === '', '타일을 모두 써야 해요: 1+2+3+4 = 10 · 1+1+1+1 ≠ 10');
  ok(G.hit10([3, 3], ['÷']) === '' && G.hit10([2, 5], ['×']) === '2 × 5' && G.hit10([2, 4, 5], ['×', '+']) === '' && G.hit10([5, 4, 2], ['×', '÷']) !== '', '3 ÷ 3 = 1 이라 10 이 아님 · 2 × 5 · 5 × 4 ÷ 2');
  // 10 에 가장 가까운 수식 (같은 거리면 높은 숫자)
  const bo = (n, o) => G.bestOf(n, o);
  ok(G.fmt(bo([2, 6], ['×']).v) === '12' && G.fmt(bo([9, 3], ['÷']).v) === '3' && G.fmt(bo([1, 8], ['+']).v) === '9' && G.fmt(bo([7, 3], ['−']).v) === '4', '방송 예: 2×6=12 · 9÷3=3 · 1+8=9 · 7−3=4');
  ok(G.fmt(bo([5, 6], ['+']).v) === '11' && bo([5, 6], ['+']).expr === '5 + 6', '5 + 6 = 11');
  const x = bo([1, 9, 2], ['+', '÷']);   // 가능한 값: 1+9÷2 = 5.5 · 9+1÷2 = 9.5 · 1÷2+9 = 9.5 · 2+9÷1... (기호는 + ÷ 하나씩)
  ok(x && G.fmt(x.v) === '19/2', `분수 값도 비교: 9.5 가 가장 가까움 (${x && G.fmt(x.v)})`);
  ok(G.cmpForm(bo([5, 6], ['+']), bo([2, 7], ['+'])) < 0, '11(거리 1) 이 9(거리 1) 보다 앞서요 — 같은 거리면 높은 숫자');
  ok(G.cmpForm(bo([1, 8], ['+']), bo([2, 6], ['×'])) < 0 && G.cmpForm(null, bo([2, 6], ['×'])) > 0 && G.cmpForm(null, null) === 0, '9 가 12 보다 가까움 · 수식 없음은 맨 뒤');
}

// 2) 순서표 · 처음 상태
{
  ok(G.LOTS.length === 24 && G.LOTS[12].sp === 1, '경매 24회 · 13회가 특별경매');
  const nums = [], ops = [];
  G.LOTS.forEach((l, i) => { if (l.sp) return; if (l.n) nums.push(l.n); if (l.o) ops.push(l.o); });
  ok(nums.length === 18 && ops.length === 14, `숫자 타일 18개 · 기호 타일 14개 (${nums.length} · ${ops.length})`);
  const cnt = (a, v) => a.filter(x => x === v).length;
  ok([1, 2, 3, 4].every(v => cnt(nums, v) === 2) && cnt(nums, 5) === 1 && cnt(nums, 6) === 3 && cnt(nums, 7) === 2 && cnt(nums, 8) === 1 && cnt(nums, 9) === 1 && cnt(nums, 10) === 2, '숫자 타일 구성: 1~4 각 2 · 5 하나 · 6 셋 · 7 둘 · 8 · 9 하나 · 10 둘');
  ok(cnt(ops, '+') === 4 && cnt(ops, '×') === 3 && cnt(ops, '−') === 3 && cnt(ops, '÷') === 4, '기호 타일: + 4 · × 3 · − 3 · ÷ 4');
  ok(G.LOTS.slice(0, 6).every((l, i) => l.n === i + 1 && !l.o) && ['+', '×', '−', '÷'].every((o, i) => G.LOTS[6 + i].o === o && !G.LOTS[6 + i].n), '1~6회 숫자 1~6 · 7~10회 + × − ÷');
  ok(G.LOTS[10].n === 6 && G.LOTS[11].n === 7 && G.LOTS[22].o === '+' && G.LOTS[23].n === 10 && !G.LOTS[23].o, '11회 6 · 12회 7 · 23회 + · 24회 10');
  const bun = G.LOTS.slice(13, 22).map(l => `${l.n}${l.o}`).join(' ');
  ok(bun === '1× 2× 3+ 4+ 8÷ 9÷ 10÷ 6− 7−', `14~22회 묶음 (${bun})`);
  const st = mk(5, 7);
  ok(st.n === 5 && st.lot === 1 && st.phase === 'bid' && G.needs(st).join() === '0,1,2,3,4', '5명 · 1회 · 모두 입찰 단계');
  ok(st.cubes.every(c => c.join() === '1,2,3,4,5,6,7,8,9,10'), '모두 숫자큐브 1~10');
  ok(st.gar.slice().sort((a, b) => a - b).join() === '7,7,11,14,15', `가넷 7 · 14 · 15 · 11 · 7 (${st.gar})`);
  ok(mk(3, 7).n === 3 && mk(3, 7).gar.length === 3 && mk(9, 7).n === 5 && mk(1, 7).n === 3, '3~5명');
  ok(mk(5, 7, { gar: [1, 2, 3, 4, 5] }).gar.join() === '1,2,3,4,5', '시험용 가넷 지정');
}

// 3) 방송 1회: 성규(0) 1 → 3 → 5, 김경란(1) 2 → 4 · 낸 큐브는 이긴 쪽 것도 모두 버려짐
{
  const st = mk(3, 11);
  ok(G.apply(st, 0, B(1)).ok && G.apply(st, 1, B(2)).ok && G.apply(st, 2, P).ok, '창 1: 동시에 1 · 2 · 넘김');
  ok(st.hi && st.hi.s === 1 && st.hi.c === 2 && G.needs(st).join() === '0,2', '더 큰 2 가 서고, 서 있는 사람은 기다림');
  ok(st.cubes[0].join() === '2,3,4,5,6,7,8,9,10' && st.cubes[1].join() === '1,3,4,5,6,7,8,9,10', '낸 큐브는 곧바로 버려져요 (진 1 도)');
  ok(G.apply(st, 0, B(3)).ok && G.apply(st, 2, P).ok && st.hi.s === 0 && st.hi.c === 3, '창 2: 성규 3');
  ok(G.apply(st, 1, B(4)).ok && G.apply(st, 2, P).ok && st.hi.s === 1 && st.hi.c === 4, '창 3: 김경란 4');
  ok(G.apply(st, 0, B(5)).ok && G.apply(st, 2, P).ok && st.hi.s === 0 && st.hi.c === 5, '창 4: 성규 5');
  ok(G.apply(st, 1, P).ok && G.apply(st, 2, P).ok, '창 5: 모두 넘김 → 낙찰');
  ok(st.phase === 'show' && st.last.k === 'win' && st.last.s === 0 && st.last.c === 5 && st.nums[0].join() === '1', '성규 낙찰 · 숫자 타일 1');
  ok(st.cubes[0].join() === '2,4,6,7,8,9,10', `성규 큐브 1 · 3 · 5 가 사라져 2 4 6 7 8 9 10 (방송 트레이) — ${st.cubes[0]}`);
  ok(st.cubes[1].join() === '1,3,5,6,7,8,9,10' && st.cubes[2].length === 10, '김경란 2 · 4 사라짐 · 넘긴 사람은 그대로');
  ok(st.last.burn.map(b => `${b.s}:${b.c}`).join() === '0:1,1:2,0:3,1:4,0:5', '버려진 큐브 기록');
  ok(G.auto(st) > 0 && G.needs(st).length === 0, '결과를 잠깐 보여 준 뒤 자동으로 다음 경매');
  G.advance(st);
  ok(st.lot === 2 && st.phase === 'bid' && G.needs(st).length === 3 && st.burn.length === 0, '다음 경매(2회) 시작');
}

// 4) 낙찰방해: 6회 박은지 1 · 김경란 1 → 무효 · 큐브 · 타일 모두 버려짐
{
  const st = mk(3, 12);
  toLot(st, 6);
  ok(st.lot === 6 && G.needs(st).length === 3, '6회까지 모두 넘김(입찰 없음)');
  ok(st.hist.slice(0, 5).every(h => h.k === 'none') && st.nums.every(a => a.length === 0), '입찰 없는 경매는 타일이 버려져요 (나무위키 기준)');
  G.apply(st, 0, B(1)); G.apply(st, 1, P); G.apply(st, 2, P);
  ok(st.hi.s === 0 && st.hi.c === 1, '박은지 1');
  ok(!G.apply(st, 1, B(0)).ok && !G.apply(st, 1, B(11)).ok && !G.apply(st, 0, B(2)).ok, '큐브 없는 값 거절 · 서 있는 사람은 차례가 아님');
  const L = G.legal(st, 1);
  ok(L.some(a => a.t === 'bid' && a.c === 1) && L.some(a => a.t === 'pass') && L.length === 11, '받아칠 때 낼 수 있는 큐브: 같은 1(방해)부터 10까지 + 넘기기');
  ok(G.apply(st, 1, B(1)).ok && G.apply(st, 2, P).ok, '김경란 1 (같은 큐브)');
  ok(st.phase === 'show' && st.last.k === 'void' && st.last.c === 1 && st.last.block === 1 && st.last.by.join() === '0,1', '낙찰방해 → 경매 무효');
  ok(st.nums.every(a => a.length === 0) && st.ops.every(a => a.length === 0), '타일은 아무도 못 가져가요');
  ok(st.cubes[0].join() === '2,3,4,5,6,7,8,9,10' && st.cubes[1].join() === '2,3,4,5,6,7,8,9,10' && st.cubes[2].length === 10, '둘 다 큐브 1 이 사라짐');
  // 더 높은 큐브를 받아친 뒤에는 낮은 큐브가 못 나옴
  const s2 = mk(3, 12);
  G.apply(s2, 0, B(5)); G.apply(s2, 1, P); G.apply(s2, 2, P);
  const L2 = G.legal(s2, 1).filter(a => a.t === 'bid').map(a => a.c).join();
  ok(L2 === '5,6,7,8,9,10' && !G.apply(s2, 1, B(4)).ok, '서 있는 5 보다 낮은 큐브는 못 냄 (같거나 높게만)');
  // 같은 창에서 가장 큰 큐브가 둘 → 무효
  const s3 = mk(3, 12);
  G.apply(s3, 0, B(7)); G.apply(s3, 1, B(7)); G.apply(s3, 2, B(3));
  ok(s3.last.k === 'void' && s3.last.by.join() === '0,1' && s3.cubes[2].length === 9, '같은 창에서 가장 큰 큐브가 같으면 낙찰방해 (낮게 낸 3 도 버려짐)');
  // 같은 창에서 큰 쪽이 이김, 졌어도 큐브는 버려짐
  const s4 = mk(3, 12);
  G.apply(s4, 0, B(7)); G.apply(s4, 1, B(9)); G.apply(s4, 2, B(7));
  ok(s4.hi && s4.hi.s === 1 && s4.hi.c === 9 && s4.cubes[0].length === 9 && s4.cubes[2].length === 9, '같은 창: 9 가 서고 7 · 7 은 버려짐(7 이 둘이어도 최고가 아니면 무효 아님)');
  ok(G.needs(s4).join() === '0,2' && G.view(s4, 1).hi.c === 9, '서 있는 9 에 7 을 낸 두 사람이 다시 받아칠 수 있음');
}

// 5) 즉시 승리: 1회 성규 1 → 20회 「10 ÷」 → 10 ÷ 1 = 10
{
  const st = mk(3, 13);
  G.apply(st, 0, B(1)); allPass(st); allPass(st);
  ok(st.nums[0].join() === '1' && st.lot === 1 && st.phase === 'show', '성규: 1 낙찰');
  G.advance(st);
  toLot(st, 13);
  ok(st.lot === 13 && st.phase === 'gbid', '13회는 가넷 경매');
  allPass(st); G.advance(st);
  toLot(st, 20);
  ok(st.lot === 20 && st.tile === undefined && G.LOTS[19].n === 10 && G.LOTS[19].o === '÷', '20회 = 10 ÷');
  G.apply(st, 0, B(2)); allPass(st); allPass(st);
  ok(st.over && st.endBy === 'ten' && st.winner === 0 && st.phase === 'end', '10 완성 → 그 자리에서 종료');
  ok(st.nums[0].slice().sort((a, b) => a - b).join() === '1,10' && st.ops[0].join() === '÷' && st.fin[0].expr === '10 ÷ 1', '성규의 우승 수식 10 ÷ 1');
  ok(G.ranks(st).join() === '0,1,1' && G.needs(st).length === 0 && G.over(st), '우승 0 · 나머지 공동 최하위(1)');
  ok(G.view(st, 1).score[0] === 10 && G.view(st, 0).ranks.join() === '0,1,1', 'view.score · ranks');
  ok(G.advance(st) === undefined && st.over, '끝난 뒤 advance 는 아무 일도 안 함');
  // 타일이 모자라거나 남아도 안 끝남: 숫자만 둘이면(기호 없음) 식이 아님
  const s2 = mk(3, 13);
  s2.nums[0] = [5, 5]; s2.ops[0] = [];
  ok(!G.reach10(s2.nums[0], s2.ops[0]), '숫자만 둘이면 식이 아님');
}

// 6) 13회 특별경매: 가넷 · 절대큐브 11
{
  const st = mk(3, 14, { gar: [7, 14, 15] });
  toLot(st, 13);
  ok(st.phase === 'gbid' && G.needs(st).join() === '0,1,2' && G.view(st, 0).special && G.view(st, 0).tile.sp === 1, '13회: 모두 가넷을 걸 수 있음');
  ok(!G.apply(st, 0, B(3)).ok && !G.apply(st, 0, { t: 'gbid', g: 0 }).ok && !G.apply(st, 0, { t: 'gbid', g: 8 }).ok && !G.apply(st, 0, { t: 'gbid', g: 1.5 }).ok, '큐브 입찰 · 0개 · 가진 것보다 많이 · 소수는 거절');
  ok(G.apply(st, 0, { t: 'gbid', g: 5 }).ok && G.apply(st, 1, { t: 'gbid', g: 9 }).ok && G.apply(st, 2, P).ok, '창 1: 5개 · 9개 · 넘김');
  ok(st.hi.s === 1 && st.hi.g === 9 && G.needs(st).join() === '2', '9개가 서면 가넷 7개인 사람은 이길 수 없어 자동으로 넘어가고 15개 가진 사람만 받아침');
  ok(!G.apply(st, 0, { t: 'gbid', g: 10 }).ok && !G.apply(st, 2, { t: 'gbid', g: 9 }).ok && !G.apply(st, 2, { t: 'gbid', g: 16 }).ok, '서 있는 9 이하 · 가진 것보다 많이는 거절');
  ok(G.needs(st).join() === '2', '거절된 뒤에도 그 자리가 기다림');
  const lg = G.legal(st, 2).filter(a => a.t === 'gbid').map(a => a.g).join();
  ok(lg === '10,11,12,13,14,15', `부를 수 있는 가넷 10~15개 (${lg})`);
  G.apply(st, 2, { t: 'gbid', g: 10 });
  ok(st.hi.s === 2 && st.hi.g === 10 && G.needs(st).join() === '1', '15 가넷 가진 사람이 10개 → 14개 가진 사람만 받아칠 수 있음');
  G.apply(st, 1, { t: 'gbid', g: 14 });
  ok(st.hi.s === 1 && st.hi.g === 14 && G.needs(st).join() === '2', '14개 (가진 전부) → 15개 가진 사람이 다시 받아칠 수 있음');
  allPass(st);
  ok(st.last.k === 'gwin' && st.last.s === 1 && st.last.g === 14, '14개로 김경란 낙찰');
  ok(st.gar.join() === '7,0,15' && st.cubes[1].join() === '1,2,3,4,5,6,7,8,9,10,11' && st.cubes[0].length === 10, '낙찰한 사람만 가넷이 사라지고(14 → 0) 절대큐브 11 · 못 이긴 사람은 가넷 그대로(돌려줌)');
  G.advance(st);
  // 절대큐브는 어떤 경매에서든 이겨요 — 11 이 서면 받아칠 큐브가 없어 바로 낙찰
  ok(st.lot === 14, '14회로');
  ok(G.apply(st, 0, B(10)).ok && G.apply(st, 1, B(11)).ok && G.apply(st, 2, P).ok, '14회: 10 · 11 · 넘김');
  ok(st.phase === 'show' && st.last.k === 'win' && st.last.s === 1 && st.last.c === 11, '11 은 어떤 큐브에도 이겨요 → 서 있는 11 에 받아칠 사람이 없어 바로 낙찰');
  ok(st.nums[1].join() === '1' && st.ops[1].join() === '×' && st.cubes[1].indexOf(11) < 0, '14회 「1 ×」 묶음 = 숫자 + 기호 · 11 은 한 번 쓰면 사라짐');
  // 가넷을 못 거는 사람(0개)은 자동으로 넘어감
  const s2 = mk(3, 15, { gar: [0, 3, 1] });
  toLot(s2, 13);
  ok(G.needs(s2).join() === '1,2', '가넷 0개인 사람은 응찰 칸이 없음(자동 넘김)');
  allPass(s2);
  ok(s2.last.k === 'gnone' && s2.cubes.every(c => c.length === 10), '아무도 안 부르면 절대큐브가 사라짐');
  // 같은 가넷이 겹치면 추첨 (같은 씨앗이면 같은 결과)
  const mkTie = () => { const s = mk(3, 21, { gar: [4, 4, 4] }); toLot(s, 13); G.apply(s, 0, { t: 'gbid', g: 3 }); G.apply(s, 1, { t: 'gbid', g: 3 }); G.apply(s, 2, P); allPass(s); return s; };
  ok(mkTie().last.s === mkTie().last.s && [0, 1].includes(mkTie().last.s) && mkTie().last.g === 3, '같은 가넷 3 개 → 씨앗 추첨 (같은 씨앗이면 같은 사람)');
}

// 7) 24회까지 아무도 못 만들면: 10 에 가까운 순서 (같은 거리면 높은 숫자)
{
  const st = mk(5, 16);
  toLot(st, 24); allPass(st);
  ok(st.phase === 'show' && st.lot === 24, '24회까지 아무도 입찰 안 함');
  G.advance(st);
  ok(st.over && st.endBy === 'last' && st.winner === -1 && G.ranks(st).every(r => r === 0), '모두 수식이 없으면 모두 같은 등수 (무승부)');
  // 흰 상자 시험: 방송 예 (2×6=12 · 7−3=4 · 9÷3=3 · 1+8=9)
  const s2 = mk(4, 17);
  s2.nums = [[2, 6], [7, 3], [9, 3], [1, 8]]; s2.ops = [['×'], ['−'], ['÷'], ['+']];
  s2.over = true; s2.endBy = 'last'; s2.fin = G.finals(s2);
  ok(G.ranks(s2).join() === '1,2,3,0', `9 우승 · 12 · 4 · 3 순 (${G.ranks(s2)})`);
  const s3 = mk(3, 17);
  s3.nums = [[2, 7], [5, 6], [4, 6]]; s3.ops = [['+'], ['+'], ['+']];   // 9 · 11 · 10(→ 정답이라 따로)
  s3.over = true; s3.endBy = 'last'; s3.fin = G.finals(s3);
  ok(G.ranks(s3).join() === '2,1,0', `10 이 가장 앞 · 11 이 9 보다 앞 (${G.ranks(s3)})`);
  const s4 = mk(3, 17);
  s4.nums = [[2, 7], [5, 6], [3]]; s4.ops = [['+'], ['+'], []];
  s4.over = true; s4.endBy = 'last'; s4.fin = G.finals(s4);
  ok(G.ranks(s4).join() === '1,0,2', `거리가 같으면 높은 숫자: 11 이 1위 · 9 가 2위 · 수식 없는 사람(3 한 장)은 맨 뒤 (${G.ranks(s4)})`);
  const s5 = mk(3, 17);
  s5.nums = [[2, 7], [4, 5], []]; s5.ops = [['+'], ['+'], []];   // 9 · 9 → 공동 1등
  s5.over = true; s5.endBy = 'last'; s5.fin = G.finals(s5);
  ok(G.ranks(s5).join() === '0,0,2', `같은 값이면 공동 (${G.ranks(s5)})`);
}

// 8) 숨은 정보 · view 순수성 · 창 안의 선택은 밝혀지기 전엔 안 보임
{
  const st = mk(4, 18);
  G.apply(st, 1, B(6));
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all'), vs = G.view(st, -1);
  ok(v1.mine && v1.mine.t === 'bid' && v1.mine.c === 6 && v0.mine === null && vs.mine === null, '내가 고른 것은 내 view 에만');
  ok(JSON.stringify(v0).indexOf('"c":6') < 0 && v0.burn.length === 0, '다른 사람이 낸 큐브는 창이 끝나기 전엔 안 보임');
  ok(v0.ans[1] === true && v0.ans[0] === false && v0.ans[2] === false, '누가 골랐는지(고른 사람 표시)는 공개');
  ok(va.pend && va.pend[1] && va.pend[1].c === 6 && v0.pend === null, "'all' 은 모두의 선택까지 보임");
  ok(v0.pub === v1.pub && v1.pub === vs.pub && vs.pub === va.pub, '공개 지문(pub)은 누구에게나 같음');
  const f0 = fpOf(st); G.view(st, 0); G.view(st, 1); G.view(st, 'all'); G.coach(clone(v0), 0, 0, null);
  ok(f0 === fpOf(st), 'view · coach 는 st 를 안 바꿈');
  ok(v0.rd.length === 3 && v1.rd.length === 3 && vs.rd === null && v0.rd.join() !== v1.rd.join(), 'AI 난수(rd)는 그 자리 view 에만');
  G.apply(st, 0, P); G.apply(st, 2, P); G.apply(st, 3, P);
  const v2 = G.view(st, 0);
  ok(v2.hi && v2.hi.s === 1 && v2.log.some(e => e.k === 'bids' && e.b.some(x => x[1] === 6)), '창이 끝나면 낸 큐브가 공개 기록에 남음');
  ok(v2.cubes.every(c => Array.isArray(c)) && v2.cubes[1].indexOf(6) < 0 && v2.cubes[1].length === 9, '큐브 · 타일 · 가넷은 모두에게 공개 (방송처럼 책상 위)');
  ok(!G.apply(st, 0, B(2)).ok && !G.apply(st, 1, B(8)).ok, '차례 아닌 자리 거절');
  const b = fpOf(st);
  for (const x of [null, 5, 'a', { t: 'zzz' }, { t: 'bid' }, { t: 'bid', c: '7' }, { t: 'bid', c: 7.5 }, { t: 'gbid', g: 3 }]) G.apply(st, 0, x);
  ok(b === fpOf(st), '안 먹은 행동은 st 를 안 바꿈');
}

// 9) 재현 · 씨앗 · 로그
{
  const run = (seed, tiers) => {
    const st = mk(5, seed), r = mulberry(seed); let g = 0; const acts = [];
    while (!G.over(st) && g++ < 4000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); acts.push({ adv: 1 }); continue; }
      for (const s of need) { if (!G.needs(st).includes(s)) continue; const a = G.ai(G.view(st, s), s, tiers[s], r); G.apply(st, s, a); acts.push({ s, a }); }
    }
    return { st, acts };
  };
  const A = run(31, ['hard', 'normal', 'easy', 'hard', 'normal']), B2 = run(31, ['hard', 'normal', 'easy', 'hard', 'normal']);
  ok(fpOf(A.st) === fpOf(B2.st) && A.acts.length === B2.acts.length, '같은 씨앗 · 같은 AI 면 같은 판');
  // 행동 기록만으로 재생
  const st = mk(5, 31); let okAll = true;
  for (const e of A.acts) { if (e.adv) G.advance(st); else if (!G.apply(st, e.s, clone(e.a)).ok) { okAll = false; break; } }
  ok(okAll && fpOf(st) === fpOf(A.st) && JSON.stringify(G.ranks(st)) === JSON.stringify(G.ranks(A.st)), '행동 기록으로 다시 돌리면 끝 상태가 같음');
  ok(fpOf(mk(5, 31)) !== fpOf(mk(5, 32)), '씨앗이 다르면 다른 판 (가넷 배분)');
  ok(A.st.log.length <= 80 && A.st.log.every(e => typeof e.i === 'number'), '로그 번호 · 길이 제한');
}

// 10) AI: 단계별로 늘 합법수 · view 안 바꿈 · 3~5명 무작위 판 · 단계 차이
{
  let bad = 0, games = 0, steps = 0, ends = 0;
  for (const n of [3, 4, 5]) for (let i = 0; i < 12; i++) {
    const seed = 400 + i * 7 + n, r = mulberry(seed), tiers = Array.from({ length: n }, (_, k) => ['easy', 'normal', 'hard'][(k + i) % 3]);
    const st = mk(n, seed); let g = 0;
    while (!G.over(st) && g++ < 4000) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const s of need) {
        if (!G.needs(st).includes(s)) continue;
        const V = G.view(st, s), vs = JSON.stringify(V), a = G.ai(V, s, tiers[s], r);
        if (JSON.stringify(V) !== vs) bad++;
        const res = a ? G.apply(st, s, a) : { ok: false };
        if (!res.ok) { bad++; const L = G.legal(st, s); if (L.length) G.apply(st, s, L[0]); }
        steps++;
      }
    }
    games++; if (G.over(st)) ends++;
    if (!G.over(st) || G.ranks(st).length !== n || !G.ranks(st).includes(0)) bad++;
  }
  ok(bad === 0 && ends === games, `AI 무작위 ${games}판(3~5명 · 초 중 고급 섞음) ${steps}수: 모두 합법 · 끝남 · view 안 바꿈 (이상 ${bad})`);
  ok(G.ai(G.view(mk(3, 5), 0), 2, 'hard') !== undefined && G.ai({ needs: [] }, 0, 'hard') === null && G.ai(null, 0, 'hard') === null, '차례가 아니면 AI 는 null');
  // 고급은 초급을 이김 (한 명 vs 나머지 · 쌍별 이김)
  const bench = (A, Bt, n, runs) => {
    let pair = 0, games2 = 0;
    for (let i = 0; i < runs; i++) {
      const seed = 101 + i * 13, hs = i % n, tiers = Array(n).fill(Bt), r = mulberry(seed); tiers[hs] = A;
      const st = mk(n, seed); let g = 0;
      while (!G.over(st) && g++ < 4000) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } for (const s of need) { if (!G.needs(st).includes(s)) continue; G.apply(st, s, G.ai(G.view(st, s), s, tiers[s], r)); } }
      const R = G.ranks(st), mine = R[hs]; games2++;
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += R[j] > mine ? 1 : R[j] === mine ? 0.5 : 0; pair += p / (n - 1);
    }
    return pair / games2;
  };
  const he5 = bench('hard', 'easy', 5, 80), he3 = bench('hard', 'easy', 3, 80), ne = bench('normal', 'easy', 5, 80), hn = bench('hard', 'normal', 5, 80);
  ok(he5 >= 0.65 && he3 >= 0.65, `고급이 초급을 쌍별로 65% 이상 이김 (5명 ${(he5 * 100) | 0}% · 3명 ${(he3 * 100) | 0}%)`);
  ok(ne > 0.6 && hn > 0.5, `중급도 초급을 이기고(${(ne * 100) | 0}%) 고급이 중급을 이김(${(hn * 100) | 0}%)`);
}

// 11) AI 선생님: 단계마다 👀📊💡👉 · 보이는 것만
{
  const st = mk(4, 41, { gar: [3, 9, 5, 2] });
  const names = ['나', '김경란', '박은지', '성규'];
  const txtOk = c => c && ['opp', 'mine', 'rec', 'why'].every(k => typeof c[k] === 'string') && c.opp.length > 4 && c.mine.length > 4 && c.rec.length > 1;
  ok(txtOk(G.coach(G.view(st, 0), 0, 0, names)), '1회 입찰 단계 선생님');
  const c0 = G.coach(G.view(st, 0), 0, 0, names);
  ok(/큐브|넘겨/.test(c0.rec) && /타일/.test(c0.opp + c0.mine), `선생님 추천에 큐브 · 타일이 나옴 (${c0.rec})`);
  G.apply(st, 1, B(4)); G.apply(st, 2, P); G.apply(st, 3, P); G.apply(st, 0, P);
  const c1 = G.coach(G.view(st, 0), 0, 0, names);
  ok(txtOk(c1) && /서 있어요|큐브 4/.test(c1.opp), '서 있는 입찰이 있을 때 선생님');
  const cw = G.coach(G.view(st, 1), 1, 0, names);
  ok(txtOk(cw) && /내가 서 있어요|고르는 게|기다려요/.test(cw.why + cw.rec), `내가 서 있을 땐 기다린다고 말해요 (${cw.rec})`);
  allPass(st);
  ok(txtOk(G.coach(G.view(st, 0), 0, 0, names)) && st.phase === 'show', '결과 단계 선생님');
  G.advance(st); toLot(st, 13);
  const cg = G.coach(G.view(st, 0), 0, 0, names);
  ok(txtOk(cg) && /가넷/.test(cg.opp + cg.why), `특별경매 선생님 (${cg.rec})`);
  // 관전자(−1) · 'all' · 이름 없이도 안 터짐
  ok(txtOk(G.coach(G.view(st, -1), -1, 0)) && txtOk(G.coach(G.view(st, 'all'), 0, 0)), '구경꾼 · 이름 없이도 문장이 나옴');
  const fin = mk(3, 42); G.apply(fin, 0, B(1)); allPass(fin); allPass(fin); G.advance(fin); toLot(fin, 24); allPass(fin); G.advance(fin);
  ok(fin.over && txtOk(G.coach(G.view(fin, 0), 0, 0, names)), '끝난 뒤 선생님');
  // 선생님 추천은 고급 AI 의 수와 같음
  const sa = mk(5, 43), V = G.view(sa, 2), pl = G.planFor(V, 2, 'hard'), best = pl.cands.slice().sort((a, b) => b.u - a.u)[0];
  ok(best && best.a.t, '고급 AI 계획에 후보가 있음 (넘기기 포함)');
}

console.log(`\n수식 경매 selftest — ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);

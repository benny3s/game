// 모임 칩 은행(common/bank.js) 정산 계산 · 장부 계산 자체 시험
// 실행: node seotda/test/bank-selftest.js
const B = require('../../common/bank.js');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }
const sum = a => a.reduce((x, y) => x + y, 0);
// 보낸 뒤 모두 0 이 되는지 (송금 줄이 맞는지)
function applyLines(nets, lines) {
  const left = Object.assign({}, nets);
  for (const l of lines) { left[l.from] = (left[l.from] || 0) + l.won; left[l.to] = (left[l.to] || 0) - l.won; }
  return Object.values(left).every(v => v === 0);
}
// 정답 확인용: 송금 최소 횟수를 전부 찾아보기 (작은 n)
function bruteMin(vals) {
  const v = vals.filter(x => x !== 0);
  const n = v.length;
  if (!n) return 0;
  let best = 0;
  // 합 0 인 묶음으로 가장 많이 나누기 (모든 분할을 재귀로)
  function rec(rest, groups) {
    if (!rest.length) { best = Math.max(best, groups); return; }
    const [first, ...others] = rest;
    const m = others.length;
    for (let mask = 0; mask < (1 << m); mask++) {
      const pick = [first], left = [];
      others.forEach((x, i) => (mask & (1 << i) ? pick : left).push(x));
      if (sum(pick) === 0) rec(left, groups + 1);
    }
  }
  rec(v, 0);
  return n - best;
}

// 1) 장부 계산
{
  let m = B.norm({ name: '철수' });
  ok(m.balance === 0 && m.borrowed === 0, '처음은 0');
  m = B.loan(m, 1000);
  ok(m.balance === 1000 && m.borrowed === 1000, '빌리기 = 잔액·빌림 같이 +1000');
  m = B.delta(m, -350);
  ok(m.balance === 650 && m.borrowed === 1000, '판 결과 = 잔액만 −350');
  m = B.delta(m, 1200.4);
  ok(m.balance === 1850, '판 결과는 정수로 (1200.4 → 1200)');
  m = B.loan(m, 1000);
  ok(m.balance === 2850 && m.borrowed === 2000, '두 번째 빌리기');
  ok(m.balance - m.borrowed === 850, '손익 = 잔액 − 빌림');
  const r = B.reset(m);
  ok(r.balance === 0 && r.borrowed === 0 && r.name === '철수', '새 회차 = 0, 이름 유지');
  ok(B.norm({ balance: 'x', borrowed: NaN }).balance === 0, '이상한 값은 0');
  ok(B.norm({ balance: Infinity }).balance === 0, '무한대는 0');
}

// 2) 기본 정산: 셋, 한 사람만 땀
{
  const members = {
    a: { name: '철수', borrowed: 1000, balance: 1300 },   // +300칩
    b: { name: '영희', borrowed: 1000, balance: 800 },    // −200
    c: { name: '민수', borrowed: 1000, balance: 900 },    // −100
  };
  const res = B.settle(members, 10);
  ok(res.total === 0, '합 0');
  ok(res.residualChips === 0 && res.split === '', '남는 몫 없음');
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(by.a === 3000 && by.b === -2000 && by.c === -1000, '원 = 칩 × 10');
  ok(res.lines.length === 2, '송금 2번');
  ok(applyLines(by, res.lines), '보내고 나면 모두 0');
  ok(res.lines.every(l => l.to === 'a'), '모두 철수에게');
  ok(res.lines.some(l => l.fn === '영희' && l.tn === '철수' && l.won === 2000), '이름 붙음');
  const txt = B.text(res, { name: '금요 모임' }, new Date(2026, 9, 30, 23, 5).getTime());
  ok(txt.includes('금요 모임 정산 (10/30 23:05)'), '카톡 글 제목');
  ok(txt.includes('영희 → 철수 2,000원'), '카톡 글 송금 줄');
  ok(txt.includes('철수 +3,000원'), '카톡 글 손익');
}

// 3) 송금 횟수 최소: 짝이 맞는 둘씩 → 욕심법(4번 가능)보다 적게 2번
{
  const members = {
    p1: { name: 'A', borrowed: 0, balance: 500 }, p2: { name: 'B', borrowed: 0, balance: -500 },
    p3: { name: 'C', borrowed: 0, balance: 300 }, p4: { name: 'D', borrowed: 0, balance: -300 },
    p5: { name: 'E', borrowed: 0, balance: 7 }, p6: { name: 'F', borrowed: 0, balance: -7 },
  };
  const res = B.settle(members, 1);
  ok(res.lines.length === 3, '짝 3쌍이면 송금 3번 (' + res.lines.length + ')');
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(applyLines(by, res.lines), '짝 정산 0');
  // 욕심법이 지는 경우: 6,4 / −5,−5 / 3,−3 … 묶음 찾기
  const tricky = [[ 'a', 6 ], [ 'b', 4 ], [ 'c', -5 ], [ 'd', -5 ], [ 'e', 3 ], [ 'f', -3 ]].map(([pid, won]) => ({ pid, won }));
  const lines = B.minTransfers(tricky);
  ok(lines.length === bruteMin(tricky.map(x => x.won)), '까다로운 경우 최소 (' + lines.length + ')');
}

// 4) 무작위: 최소 횟수 = 전수 조사, 합 0, 보내면 모두 0
{
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let allMin = true, allZero = true, allLE = true;
  for (let t = 0; t < 300; t++) {
    const n = 2 + Math.floor(rnd() * 6);
    const vals = Array.from({ length: n - 1 }, () => Math.round((rnd() - 0.5) * 20) * 100);
    vals.push(-sum(vals));
    const list = vals.map((won, i) => ({ pid: 'q' + i, won }));
    const lines = B.minTransfers(list);
    const nets = Object.fromEntries(list.map(x => [x.pid, x.won]));
    if (!applyLines(nets, lines)) allZero = false;
    if (lines.length !== bruteMin(vals)) allMin = false;
    if (lines.length > Math.max(0, vals.filter(v => v).length - 1)) allLE = false;
    if (lines.some(l => !(l.won > 0))) allZero = false;
  }
  ok(allZero, '무작위 300번: 보내면 모두 0, 금액은 양수');
  ok(allMin, '무작위 300번: 송금 횟수 = 전수 조사 최소');
  ok(allLE, '무작위 300번: 사람 수 − 1 번 이하');
  // 17명 이상은 욕심법이어도 0 이 되어야 함
  const big = Array.from({ length: 20 }, (_, i) => ({ pid: 'z' + String(i).padStart(2, '0'), won: (i % 2 ? -1 : 1) * (i + 1) * 10 }));
  big.push({ pid: 'zz', won: -sum(big.map(x => x.won)) });
  const bl = B.minTransfers(big);
  ok(applyLines(Object.fromEntries(big.map(x => [x.pid, x.won])), bl) && bl.length <= 20, '21명 욕심법도 0');
}

// 5) 원 반올림: 1칩 = 0.5원·3.3원처럼 소수여도 합 0
{
  const r1 = B.roundZeroSum([1.5, -0.5, -1], 1);
  ok(sum(r1) === 0 && r1.every(Number.isInteger), '반올림 합 0 (' + r1 + ')');
  const r2 = B.roundZeroSum([1001.7, -333.3, -333.3, -335.1], 10);
  ok(sum(r2) === 0 && r2.every(v => v % 10 === 0), '10원 단위 합 0 (' + r2 + ')');
  const members = {
    a: { name: 'A', borrowed: 1000, balance: 1333 }, b: { name: 'B', borrowed: 1000, balance: 889 }, c: { name: 'C', borrowed: 1000, balance: 778 },
  };
  const res = B.settle(members, 3.3);
  ok(res.total === 0 && res.rows.every(r => Number.isInteger(r.won)), '1칩 3.3원 정산 합 0');
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(applyLines(by, res.lines), '1칩 3.3원 송금 맞음');
  ok(Math.abs(by.a - 333 * 3.3) < 1, '반올림은 1원 안쪽');
  const resU = B.settle(members, 3.3, { unit: 100 });
  ok(resU.total === 0 && resU.rows.every(r => r.won % 100 === 0), '100원 단위 옵션 합 0');
}

// 6) AI 와 한 판: 사람 칩 합이 0 이 아니면 그 몫을 똑같이 나눠 합 0
{
  const members = {
    a: { name: '철수', borrowed: 1000, balance: 1500 },   // +500
    b: { name: '영희', borrowed: 1000, balance: 600 },    // −400 (AI 에게 300 잃음 포함)
    c: { name: '민수', borrowed: 1000, balance: 600 },    // −400
    d: { name: '안 옴', borrowed: 0, balance: 0 },        // 판에 안 낌 → 나눔에서 빠짐
  };
  const res = B.settle(members, 10);
  ok(res.residualChips === -300 && res.split === 'split', '남는 몫 −300칩');
  ok(res.total === 0, 'AI 몫 나눈 뒤 합 0');
  ok(res.rows.length === 3, '안 낀 사람은 빠짐');
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(by.a === 6000 && by.b === -3000 && by.c === -3000, 'AI 몫 −3,000원을 셋이 1,000원씩');
  ok(applyLines(by, res.lines), 'AI 몫 송금 맞음');
  ok(B.text(res, { name: 'x' }).includes('AI·조정 몫'), '카톡 글에 AI 몫 안내');
  const resB = B.settle(members, 10, { residual: 'bank' });
  ok(resB.total === 0 && resB.rows.some(r => r.pid === '_bank' && r.won === 3000), '은행 자리 옵션: 은행이 3,000원 받음');
  // 나눠 떨어지지 않을 때 (−100칩 / 3명 × 1원)
  const res3 = B.settle({ a: { name: 'A', borrowed: 0, balance: 50 }, b: { name: 'B', borrowed: 0, balance: -75 }, c: { name: 'C', borrowed: 0, balance: -75 } }, 1);
  ok(res3.total === 0 && res3.rows.every(r => Number.isInteger(r.won)), '나눠 떨어지지 않아도 합 0');
}

// 6b) AI 와 한 판 묶음(pools): 그 판에 앉은 사람끼리만 나눔 — 안 앉은 사람은 영향 없음
{
  const members = {
    a: { name: '철수', borrowed: 1000, balance: 1500 },   // +500 (홀덤에서 AI 에게 딴 것 포함)
    b: { name: '영희', borrowed: 1000, balance: 800 },    // −200
    c: { name: '민수', borrowed: 1000, balance: 1000 },   // 0 (홀덤에 없었음)
  };
  // 장부: 섯다(사람끼리) … 새 회차 … 홀덤에서 AI 가 300 잃음(amount −300) → 사람 쪽 +300
  const ledger = [
    { type: 'ai', amount: 999, pids: 'a,c' },            // 새 회차 전 → 무시
    { type: 'reset' },
    { type: 'game', pid: 'a', amount: 100 },
    { type: 'ai', amount: -300, pids: 'a,b' },
    { type: 'loan', pid: 'b', amount: 1000 },
  ];
  const pools = B.poolsFromLedger(ledger);
  ok(pools.length === 1 && pools[0].chips === 300 && pools[0].pids.join() === 'a,b', '장부 → AI 묶음 (새 회차 뒤만)');
  const res = B.settle(members, 10, { pools });
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(res.total === 0, '묶음 정산 합 0');
  ok(by.a === 3500 && by.b === -3500 && by.c === 0, '안 앉은 민수는 0, 철수·영희가 AI 몫을 반씩 (' + JSON.stringify(by) + ')');
  ok(res.lines.length === 1 && res.lines[0].from === 'b' && res.lines[0].to === 'a' && res.lines[0].won === 3500, '영희 → 철수 3,500원');
  // 묶음 + 칩 조정 나머지: 남는 50칩은 모두에게
  const m2 = Object.assign({}, members, { c: { name: '민수', borrowed: 1000, balance: 1050 } });
  const res2 = B.settle(m2, 10, { pools });
  const by2 = Object.fromEntries(res2.rows.map(r => [r.pid, r.won]));
  ok(res2.total === 0 && res2.rows.every(r => Number.isInteger(r.won)), '묶음 + 조정 나머지 합 0 (' + JSON.stringify(by2) + ')');
  ok(Math.abs(by2.c - (500 - 500 / 3)) <= 1, '조정 50칩(500원)은 셋이 나눔');
  // 회원이 아닌 pid 만 있는 묶음은 무시하고 모두에게
  const res3 = B.settle(members, 10, { pools: [{ pids: ['zz'], chips: 300 }] });
  ok(res3.total === 0 && res3.rows.find(r => r.pid === 'c').won === -1000, '모르는 묶음은 모두에게 (민수 −1,000원)');
}

// 7) 아무도 없음 / 모두 본전
{
  ok(B.settle({}, 10).lines.length === 0, '빈 모임');
  const res = B.settle({ a: { name: 'A', borrowed: 1000, balance: 1000 }, b: { name: 'B', borrowed: 2000, balance: 2000 } }, 10);
  ok(res.lines.length === 0 && res.total === 0, '모두 본전이면 송금 없음');
  ok(B.text(res, { name: 'x' }).includes('보낼 돈이 없어요'), '본전 카톡 글');
}

// 8) 장부 흐름 흉내: 빌리기 → 판 4번 → 정산 → 칩 합은 늘 (빌린 칩 합) 과 같음
{
  const mem = { a: B.norm({ name: '방장' }), b: B.norm({ name: '철수' }), c: B.norm({ name: '영희' }) };
  for (const k of Object.keys(mem)) mem[k] = B.loan(mem[k], 1000);
  const hands = [{ a: 120, b: -60, c: -60 }, { a: -300, b: 400, c: -100 }, { a: 50, b: -25, c: -25 }, { a: 0, b: -900, c: 900 }];
  for (const h of hands) for (const k of Object.keys(h)) mem[k] = B.delta(mem[k], h[k]);
  mem.b = B.loan(mem.b, 1000);
  const totB = sum(Object.values(mem).map(m => m.balance)), totL = sum(Object.values(mem).map(m => m.borrowed));
  ok(totB === totL, '칩 합 = 빌린 칩 합 (' + totB + ' / ' + totL + ')');
  const res = B.settle(mem, 10);
  ok(res.total === 0 && res.residualChips === 0, '사람끼리만 한 판은 남는 몫 0');
  const by = Object.fromEntries(res.rows.map(r => [r.pid, r.won]));
  ok(by.a === -1300 && by.b === -5850 && by.c === 7150, '정산 금액 (' + JSON.stringify(by) + ')');
  ok(res.lines.length === 2 && applyLines(by, res.lines), '송금 2번');
}

console.log(`bank selftest: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

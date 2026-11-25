// 수식 신호등 규칙 시험: node survival/test/selftest_eqlight.js
'use strict';
const E = require('../games/eqlight/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (기대 ${JSON.stringify(b)}, 실제 ${JSON.stringify(a)})`);

// 1) 수식이 규칙에 맞는지 (모두 9칸)
const GOOD = ['12+3×4=24', '2^3+4=3×4', '9÷2×4=2×9', '2^3^2=512', '5+3=2×4+0', '0+0+0=0+0', '0-5+68=63', '6÷4×2=3+0', '8^5=32768', '1÷3×3=1+0', '1+2×3=7+0', '9-4-3=1+1'];
const BAD = [['12+3×4=60', '계산 순서를 무시한 값'], ['12+3×4=25', '값이 다름'], ['05+2×3=11', '앞자리 0'], ['12++3×4=2', '기호 이웃'], ['1+2=3=3+0', '= 둘'], ['7÷0+1=1×1', '0 으로 나눔'],
  ['0^0+1=1+0', '0^0'], ['=2+3=5+11', '= 가 맨 앞'], ['12+3×4=2+', '기호로 끝'], ['12+3×4+24', '= 없음'], ['12+3×4=2', '8칸'], ['12+3×4=245', '10칸'],
  ['2^25=2^25', '지수 24 초과'], ['5×+3=2×40', '기호 이웃'], ['9-4-3=8+0', '왼쪽부터 계산해야 함'], ['2^3^2=8×8', '^ 는 오른쪽부터'], ['12+3×4=2x', '쓸 수 없는 글자']];
for (const s of GOOD) ok(s.length === 9 && E.checkEq(s).ok, `성립해야 함: ${s} → ${E.checkEq(s).err}`);
for (const [s, w] of BAD) { const c = E.checkEq(s); ok(!c.ok && !!c.err, `안 되어야 함(${w}): ${s}`); }
ok(!E.checkEq(12345).ok && !E.checkEq(null).ok && !E.checkEq(undefined).ok, '문자열이 아니면 거절');
ok(E.checkEq('12+3×4=25').err.includes('달라요'), '값이 다르면 양쪽 값을 알려 줌');
ok(typeof E.evalSide('10^7') === 'string' && typeof E.evalSide('9999999×9') === 'string', '천만 이상은 거절');
ok(typeof E.evalSide('2^25') === 'string', '지수 25 는 거절');
eq(E.evalSide('9÷2×4'), [18, 1], '9÷2×4 = 18 (분수 정확히)');
eq(E.evalSide('2+3×4^2'), [50, 1], '^ → × → + 순서');
eq(E.evalSide('0-5+68'), [63, 1], '음수 중간값');

// 2) 색 힌트
eq(E.feedback('12+3×4=24', '12+3×4=24'), 'ggggggggg', '정답이면 모두 초록');
eq(E.feedback('111111111', '12+3×4=24'), 'grrrrrrrr', '정답에 1 이 하나뿐이면 하나만 초록, 나머지 빨강');
eq(E.feedback('211111111', '12+3×4=24'), 'yyrrrrrrr', '초록이 없으면 앞에서부터 노랑 (2 는 그 자리 아님, 1 은 하나만)');
eq(E.feedback('13+2×4=24', '12+3×4=24'), 'gygyggggg', '3 · 2 자리만 바뀜 → 노랑 둘');
eq(E.feedback('22+2×2=22', '12+3×4=24'), 'rggrgrggr', '초록이 있는 2 는 노랑으로 중복 계산 안 함');
{ const g = '22222+222', f = E.feedback(g, '12+3×4=24'); eq([...f].filter((c, i) => g[i] === '2' && c !== 'r').length, 2, '2 가 둘뿐이면 2 의 노랑 · 초록 합쳐 2 개'); }
{ const g = '44444+444', f = E.feedback(g, '12+3×4=24'); eq([...f].filter((c, i) => g[i] === '4' && c !== 'r').length, 2, '4 도 둘뿐'); }
{ const f = E.feedback('+++++++++', '12+3×4=24'); eq([...f].filter(c => c === 'g').length, 1, '+ 는 하나뿐 · 위치 맞으면 그것만 초록'); eq(f[2], 'g', '+ 의 자리는 3번째'); }

// 3) 흐름
function start(a, b, seed = 7) {
  const st = E.init({ n: 2, seed });
  ok(E.apply(st, 0, { t: 'set', eq: a }).ok && E.apply(st, 1, { t: 'set', eq: b }).ok, '수식 둘 내기');
  return st;
}
{
  const st = E.init({ n: 2, seed: 3 });
  eq(E.needs(st), [0, 1], '처음엔 둘 다 수식을 내야 함');
  ok(!E.apply(st, 0, { t: 'guess', g: '123456789' }).ok, '수식 내기 전엔 추측 불가');
  ok(!E.apply(st, 0, { t: 'set', eq: '12+3×4=60' }).ok, '틀린 수식은 못 냄');
  ok(!E.apply(st, 0, { t: 'set' }).ok && !E.apply(st, 0, null).ok, '빈 동작 거절');
  ok(E.apply(st, 0, { t: 'set', eq: '12+3×4=24' }).ok, '0번 제출');
  eq(E.needs(st), [1], '0번 뒤엔 1번만');
  ok(!E.apply(st, 0, { t: 'set', eq: '5+3=2×4+0' }).ok, '두 번 제출 불가');
  ok(E.apply(st, 1, { t: 'set', eq: '2^3+4=3×4' }).ok, '1번 제출');
  eq(E.view(st, 0).phase, 'guess', '둘 다 내면 추측 시작');
  eq(E.view(st, 0).round, 1, '1라운드');
}
{
  const st = start('12+3×4=24', '2^3+4=3×4');
  ok(!E.apply(st, 0, { t: 'guess', g: '12+3×4=2' }).ok, '8칸 추측 거절');
  ok(!E.apply(st, 0, { t: 'guess', g: '12+3×4=2z' }).ok, '쓸 수 없는 글자 거절');
  ok(E.apply(st, 0, { t: 'guess', g: '+++++++++' }).ok, '성립하지 않는 추측도 괜찮음');
  eq(E.needs(st), [1], '0번이 내면 1번만 기다림');
  ok(!E.apply(st, 0, { t: 'guess', g: '123456789' }).ok, '한 라운드에 한 번');
  ok(!JSON.stringify(E.view(st, 1)).includes('+++++++++'), '상대가 낸 추측은 라운드가 끝나기 전엔 안 보임');
  ok(E.view(st, 0).mySent === '+++++++++', '내가 낸 추측은 내게 보임');
  ok(E.apply(st, 1, { t: 'guess', g: '1+2+3=6+0' }).ok, '1번 추측');
  const V = E.view(st, 0);
  eq(V.round, 2, '둘 다 내면 다음 라운드');
  eq(V.guesses[0][0].f, E.feedback('+++++++++', '2^3+4=3×4'), '내 추측의 힌트는 상대 수식과 비교');
  eq(V.guesses[1][0].f, E.feedback('1+2+3=6+0', '12+3×4=24'), '상대 추측의 힌트는 내 수식과 비교');
  ok(!V.over && V.mySent === null, '아직 안 끝남 · 새 라운드엔 낸 추측 없음');
}
{ // 한쪽만 맞히면 승리
  const st = start('12+3×4=24', '2^3+4=3×4');
  E.apply(st, 0, { t: 'guess', g: '2^3+4=3×4' }); E.apply(st, 1, { t: 'guess', g: '000000000' });
  ok(E.over(st), '맞히면 끝'); eq(E.ranks(st), [0, 1], '0번 1등'); eq(E.view(st, 1).winner, 0, '승자 0');
  eq(E.view(st, 1).secrets, ['12+3×4=24', '2^3+4=3×4'], '끝나면 두 수식 모두 공개');
  ok(!E.apply(st, 0, { t: 'guess', g: '000000000' }).ok, '끝난 뒤엔 못 냄');
}
{ // 둘 다 맞히면 무승부
  const st = start('12+3×4=24', '2^3+4=3×4');
  E.apply(st, 0, { t: 'guess', g: '2^3+4=3×4' }); E.apply(st, 1, { t: 'guess', g: '12+3×4=24' });
  ok(E.over(st), '끝'); eq(E.ranks(st), [0, 0], '무승부'); eq(E.view(st, 0).winner, -1, '무승부 표시'); eq(E.view(st, 0).why, 'both', '둘 다 맞힘');
}
{ // 20라운드 상한
  const st = start('12+3×4=24', '2^3+4=3×4');
  for (let r = 1; r <= E.MAXR; r++) { ok(!E.over(st), `${r}라운드 전엔 안 끝남`); E.apply(st, 0, { t: 'guess', g: '000000000' }); E.apply(st, 1, { t: 'guess', g: '000000000' }); }
  ok(E.over(st), '20라운드 뒤엔 끝'); eq(E.ranks(st), [0, 0], '무승부'); eq(E.view(st, 0).why, 'cap', '상한으로 끝남');
}

// 4) 새어 나가는 정보
{
  const a = start('12+3×4=24', '2^3+4=3×4', 11);
  ok(!JSON.stringify(E.view(a, 0)).includes('2^3+4=3×4'), '0번 화면에 1번 수식이 없음');
  ok(!JSON.stringify(E.view(a, 1)).includes('12+3×4=24'), '1번 화면에 0번 수식이 없음');
  ok(E.view(a, 0).mine === '12+3×4=24' && E.view(a, 1).mine === '2^3+4=3×4', '내 수식은 내게만');
  ok(E.view(a, 'all').mine === null && E.view(a, -1).mine === null, '관전 화면엔 수식 없음');
  const pubs = [E.view(a, 0).pub, E.view(a, 1).pub, E.view(a, 'all').pub];
  ok(pubs[0] === pubs[1] && pubs[1] === pubs[2], '공개 요약(pub)은 자리마다 같음');
  // 상대 수식만 바꿨을 때 0번 화면은 (추측 전) 똑같아야 함
  const c = start('12+3×4=24', '5+3=2×4+0', 11);
  const v1 = JSON.stringify({ ...E.view(a, 0), pub: 0, log: 0 }), v2 = JSON.stringify({ ...E.view(c, 0), pub: 0, log: 0 });
  ok(v1 === v2, '상대 수식이 달라도 0번 화면은 (추측 전) 똑같음');
  // 추측 뒤: 힌트만 상대 수식에서 나옴
  const d = start('12+3×4=24', '2^3+4=3×4', 11); E.apply(d, 0, { t: 'guess', g: '+++++++++' }); E.apply(d, 1, { t: 'guess', g: '000000000' });
  const e = start('12+3×4=24', '5+3=2×4+0', 11); E.apply(e, 0, { t: 'guess', g: '+++++++++' }); E.apply(e, 1, { t: 'guess', g: '000000000' });
  eq(E.view(d, 0).guesses[0][0].f, E.feedback('+++++++++', '2^3+4=3×4'), '힌트는 상대 수식에서만 나옴 (1)');
  eq(E.view(e, 0).guesses[0][0].f, E.feedback('+++++++++', '5+3=2×4+0'), '힌트는 상대 수식에서만 나옴 (2)');
  ok(!JSON.stringify(E.view(d, 0)).includes('2^3+4=3×4'), '추측 뒤에도 1번 수식 글자는 안 나옴');
}

// 5) AI: 수식 만들기 · 추측
for (const tier of ['easy', 'normal', 'hard']) {
  const r = E.mkr(41 + tier.length);
  let allOk = true; const uniq = new Set();
  for (let i = 0; i < 60; i++) { const s = E.sample(r, tier); const c = E.checkEq(s); if (!c.ok || s.length !== 9) allOk = false; uniq.add(s); }
  ok(allOk, `${tier}: 만든 수식이 모두 규칙에 맞음`); ok(uniq.size > 30, `${tier}: 수식이 다양함 (${uniq.size}/60)`);
}
{
  const r = E.mkr(9), sec = '12+3×4=24', hist = [];
  for (const g of ['1+2+3=6+0', '5+3=2×4+0', '9÷2×4=2×9']) hist.push({ g, f: E.feedback(g, sec) });
  const c = E.findCands(hist, r, 6, 30000);
  ok(c.length > 0 && c.every(x => E.checkEq(x).ok && E.consistent(x, hist)), `후보가 모두 규칙에 맞고 힌트와 일치 (${c.length}개)`);
}
eq(E.nextGuess([], E.mkr(5), 'hard').g, E.nextGuess([], E.mkr(5), 'hard').g, 'AI 첫 추측이 씨앗에 따라 같음 (결정적)');
const TIERS = ['easy', 'normal', 'hard'];
for (const t0 of TIERS) for (const t1 of TIERS) {
  const st = E.init({ n: 2, seed: 100 + TIERS.indexOf(t0) * 7 + TIERS.indexOf(t1) }), rr = E.mkr(200 + TIERS.indexOf(t0) * 3 + TIERS.indexOf(t1)), tiers = [t0, t1];
  let steps = 0, bad = '';
  while (!E.over(st) && steps++ < 60 && !bad) {
    for (const s of E.needs(st)) {
      const V = E.view(st, s), a = E.ai(V, s, tiers[s], rr);
      if (!a) { bad = `AI 가 동작을 안 냄 (${s}, ${V.phase})`; break; }
      const res = E.apply(st, s, a); if (!res.ok) { bad = `AI 가 규칙을 어김 ${JSON.stringify(a)} → ${res.err}`; break; }
    }
  }
  ok(!bad, `${t0} vs ${t1}: ${bad}`); ok(E.over(st), `${t0} vs ${t1}: 한 판이 끝남 (${steps}단계, ${st.round}라운드)`);
  const V = E.view(st, 0); ok(Array.isArray(V.ranks) && V.ranks.length === 2, `${t0} vs ${t1}: ranks`);
}
{ // 보통 AI 는 12번 안에 대부분 맞힘
  let solved = 0, total = 0;
  for (let i = 0; i < 6; i++) {
    const sec = E.sample(E.mkr(500 + i), 'normal'), hist = [], rr = E.mkr(900 + i); total++;
    for (let k = 0; k < 12; k++) { const g = E.nextGuess(hist, rr, 'normal').g, f = E.feedback(g, sec); hist.push({ g, f }); if (f === 'ggggggggg') { solved++; break; } }
  }
  ok(solved >= 5, `normal AI 가 12번 안에 맞힘 (${solved}/${total})`);
}
{ // = 양쪽이 식인 수식도 풀어 냄
  let solved = 0;
  for (const sec of ['2^3+4=3×4', '9÷2×4=2×9', '5+3=2×4+0', '1+2×3=7+0', '8-3=7-2+0', '2×6=3×4+0', '1÷2=3÷6+0']) {
    const hist = [], rr = E.mkr(33);
    for (let k = 0; k < 14; k++) { const g = E.nextGuess(hist, rr, 'normal').g, f = E.feedback(g, sec); hist.push({ g, f }); if (f === 'ggggggggg') { solved++; break; } }
  }
  ok(solved >= 5, `양쪽이 식인 수식도 풀어 냄 (${solved}/7)`);
}

// 6) legal · 선생님
{
  const st = E.init({ n: 2, seed: 5 });
  const L = E.legal(st, 0); ok(L.length > 0 && L.every(a => E.apply(JSON.parse(JSON.stringify(st)), 0, a).ok), 'legal 이 낸 수식이 모두 통과');
  eq(E.legal(st, 0), E.legal(st, 0), 'legal 은 같은 상태에서 항상 같음');
  const before = JSON.stringify(st); E.legal(st, 1); eq(JSON.stringify(st), before, 'legal 이 상태를 바꾸지 않음');
  { const c = E.coach(E.view(st, 0), 0, -1, ['<b>나</b>', '<i>상대</i>']); ok(c && c.rec && !/undefined|NaN/.test(JSON.stringify(c)) && !/<i>|<b>/.test(JSON.stringify(c)), '선생님: 수식 만들기 단계 (이름 이스케이프)'); }
  const g = start('12+3×4=24', '2^3+4=3×4');
  for (const me of [0, 1]) { const c = E.coach(E.view(g, me), me, -1, ['<i>가</i>', '<b>나</b>']); ok(c && E.validGuess(c.rec) && !/undefined|NaN/.test(JSON.stringify(c)) && !/<i>|<b>/.test(JSON.stringify(c)), `선생님: 첫 추측 (${me})`); }
  E.apply(g, 0, { t: 'guess', g: '1+2+3=6+0' }); E.apply(g, 1, { t: 'guess', g: '000000000' });
  const c0 = E.coach(E.view(g, 0), 0, -1, ['나', '상대']);
  ok(E.validGuess(c0.rec) && (E.consistent(c0.rec, E.view(g, 0).guesses[0]) || c0.why.includes('못 찾았어요')), '선생님 추천이 힌트와 맞음');
  ok(c0.mine.includes('확정 칸'), '선생님: 확정 칸 요약');
  E.apply(g, 0, { t: 'guess', g: '2^3+4=3×4' }); E.apply(g, 1, { t: 'guess', g: '000000000' });
  const co = E.coach(E.view(g, 0), 0, -1, ['나', '상대']); ok(co.rec.includes('먼저 맞혔'), '끝난 뒤 선생님: 이겼어요');
}
{ // 같은 동작 → 같은 상태
  const A = start('12+3×4=24', '2^3+4=3×4', 9), B = start('12+3×4=24', '2^3+4=3×4', 9);
  for (const st of [A, B]) { E.apply(st, 0, { t: 'guess', g: '1+2+3=6+0' }); E.apply(st, 1, { t: 'guess', g: '000000000' }); }
  eq(E.view(A, 0).pub, E.view(B, 0).pub, '같은 동작이면 공개 요약도 같음');
}

console.log(`수식 신호등 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

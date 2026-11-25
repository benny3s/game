// 피라미드 넘버 규칙 시험 (node survival/test/pyramid_selftest.js)
'use strict';
const G = require('../games/pyramid/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a).slice(0, 160) + ' vs ' + JSON.stringify(b).slice(0, 160) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clone = o => JSON.parse(JSON.stringify(o));
const val = (rpn, ops) => { const r = G.evalRpn(rpn, ops); return r.ok ? (r.v[1] === 1 ? r.v[0] : r.v.join('/')) : null; };

// 1) 수식 검사 · 값
{
  const ops = [3, 5, 8];
  eq(val(['2', '1', '0', '-', '*'], ops), 16, '8 × (5 − 3) = 16 (방송 1라운드 예시)');
  eq(G.infix(['2', '1', '0', '-', '*'], ops), '8 × (5 − 3)', '보통 식 글');
  eq(val(['0', '1', '+', '2', '+'], ops), 16, '3 + 5 + 8 = 16');
  eq(val(['0', '1', '/', '2', '+'], ops), '43/5', '분수 중간값: 3 ÷ 5 + 8 = 43/5');
  eq(val(['0', '1', '2', '*', '*'], ops), 120, '3 × 5 × 8');
    ok(!G.evalRpn(['0', '1', '+', 'r', '2', '*'], ops).ok, '루트는 제곱수에만');
  eq(val(['0', '0', '+', 'r', '2', '1', '*', '*'], ops), null, '연산용 숫자를 두 번 쓰면 거절');
  ok(!G.evalRpn(['0', '1', '+'], ops).ok, '숫자 셋을 다 안 쓰면 거절');
  ok(!G.evalRpn(['0', '1', '2', '+'], ops).ok, '값이 둘 남으면 거절');
  ok(!G.evalRpn(['0', '1', '0', '-', '2', '*'], ops).ok, '같은 숫자 두 번');
  ok(!G.evalRpn(['0', '+', '1', '2', '*'], ops).ok, '쌓인 값이 모자란 연산 거절');
  ok(!G.evalRpn(['0', '1', '-', 's', '2', '*', 's'], ops).ok, '제곱 · 세제곱 · 루트는 식 전체에서 한 번만');
  ok(!G.evalRpn(['0', '1', '+', '2', '9'], ops).ok && !G.evalRpn(['0', '1', '2', 'x', '+'], ops).ok && !G.evalRpn(null, ops).ok && !G.evalRpn('abc', ops).ok && !G.evalRpn([0, 1, 2, '+', '+'], ops).ok, '이상한 입력 거절');
    // 0 나누기
  ok(!G.evalRpn(['0', '0', '-', '0', '/', '1', '2', '+', '+'], [3, 5, 8]).ok, '같은 숫자 두 번 + 0 나누기 거절');
  eq(val(['1', '1', '-', '0', '*', '2', '+'], [3, 5, 8]), null, '(5 − 5) 는 같은 숫자 두 번이라 거절');
  eq(val(['0', '1', '-', '2', '/', 'r'], [3, 7, 8]), null, '4/8 이 제곱수 아님 → 루트 거절 (1/2)'); // (3−7)/8 = −1/2 음수
  eq(val(['0', '1', '+', '2', '/', 'r'], [4, 12, 8]), null, '8/8... (4+12)/8 = 2 는 제곱수 아님');
    eq(val(['0', '1', '+', '2', '*', 'r'], [1, 7, 2]), 4, '(1 + 7) × 2 = 16 → √16 = 4');
  eq(val(['0', 's', '1', '+', '2', '+'], [3, 5, 8]), 22, '3² + 5 + 8 = 22');
  eq(val(['0', 'c', '1', '-', '2', '-'], [3, 5, 8]), 14, '3³ − 5 − 8 = 14');
  eq(G.infix(['0', 's', '1', '+', '2', '+'], [3, 5, 8]), '3² + 5 + 8', '제곱 식 글');
  eq(G.infix(['0', '1', '+', 's', '2', '*'], [3, 5, 8]), '(3 + 5)² × 8', '제곱 식 괄호');
  eq(G.infix(['0', '1', '2', '-', '-'], [3, 5, 8]), '3 − (5 − 8)', '빼기 오른쪽 괄호');
  eq(G.infix(['0', '1', '2', '+', '*'], [3, 5, 8]), '3 × (5 + 8)', '곱하기 괄호');
  eq(G.infix(['0', '1', '2', '*', '+'], [3, 5, 8]), '3 + 5 × 8', '괄호 없이');
  eq(G.infix(['0', '1', '/', '2', '/'], [3, 5, 8]), '3 ÷ 5 ÷ 8', '나눗셈 왼쪽 묶음');
  eq(G.infix(['0', '1', '2', '/', '/'], [3, 5, 8]), '3 ÷ (5 ÷ 8)', '나눗셈 오른쪽 괄호');
  eq(G.infix(['0', '1', '+', '2', '+', 'r'], [4, 5, 7]), '√(4 + 5 + 7)', '루트 괄호');
  eq(G.infix(['0', 'r', '1', '+', '2', '+'], [4, 5, 7]), '√4 + 5 + 7', '루트 숫자');
  // 만들 수 있는 값 목록 (3, 5, 8)
  const E = G.enumerate([3, 5, 8]);
  ok(E.has(16) && !E.has(15) && !E.has(120 + 1), '358 은 16 을 만들 수 있고 15 는 못 만듦 (방송 4층 15 · 20 은 아무도 못 만든 숫자)');
  for (const [v, e] of E) eq(val(e.rpn, [3, 5, 8]), v, `enumerate 식이 맞음 ${v}`);
  ok(E.size >= 20, `358 으로 만들 수 있는 값 ${E.size}개`);
  ok(G.diffOf(2.2) === 0 && G.diffOf(3.5) === 1 && G.diffOf(4.4) === 2, '난이도 구분');
}

// 2) 라운드 만들기 (200 판 × 10 라운드)
{
  let zero = 0, tot = 0, cnt = {}, floorsOk = 0, firstSeats = [0, 0], ksum = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} });
    eq(st.rounds, 10, '라운드 10 (기본)');
    for (let r = 0; r < 10; r++) {
      eq(st.ops.length, 3, '연산용 숫자 3개'); ok(new Set(st.ops).size === 3 && st.ops.every(x => x >= 1 && x <= 9 && Number.isInteger(x)), `연산용 숫자 1~9 · 서로 다름 (${st.ops})`);
      ok(st.ops[0] < st.ops[1] && st.ops[1] < st.ops[2], '연산용 숫자는 작은 순');
      eq(st.rows.map(x => x.length), [2, 3, 4, 5], '4층 2 · 3층 3 · 2층 4 · 1층 5');
      const all = st.rows.flat(); ok(all.length === 14 && new Set(all).size === 14 && all.every(x => x >= 1 && x <= 60), `목표 14개 · 겹침 없음 · 1~60 (${all})`);
      const E = G.enumerate(st.ops), reachable = all.filter(v => E.has(v)), keys = Object.keys(st.sol).map(Number).sort((a, b) => a - b);
      eq(keys, reachable.slice().sort((a, b) => a - b), '정답 목록 = 만들 수 있는 목표 전부');
      for (const k of keys) { const s = st.sol[k]; eq(val(s.rpn, st.ops), k, `정답 식이 목표와 같음 ${k}`); eq(s.f, G.floorOf(st.rows, k), '층 맞음'); }
      // 어려운 것일수록 높은 층 (만들 수 있는 것끼리)
      const rs = keys.map(k => st.sol[k]).sort((a, b) => b.f - a.f); let mono = true;
      for (let i = 1; i < rs.length; i++) if (rs[i - 1].f > rs[i].f && rs[i - 1].cost < rs[i].cost - 1e-9) mono = false;
      if (mono) floorsOk++;
      const k = keys.length; cnt[k] = (cnt[k] || 0) + 1; ksum += k; if (!k) zero++; tot++;
      if (r === 0) firstSeats[st.hold]++;
      // 이 라운드를 넘기면 다음 라운드 (둘 다 넘김)
      ok(G.apply(st, st.hold, { t: 'pass' }).ok && G.apply(st, st.hold, { t: 'pass' }).ok, '둘 다 넘김');
      eq(st.phase, 'show', '둘 다 넘기면 끝'); G.advance(st);
    }
    ok(st.over, '10라운드 뒤 끝'); eq(st.pts, [0, 0], '다 넘기면 0:0');
  }
  ok(floorsOk === tot, `어려운 목표일수록 높은 층 (${floorsOk}/${tot})`);
  ok(zero / tot > 0.06 && zero / tot < 0.2, `만들 수 있는 목표가 하나도 없는 라운드 ${(zero / tot * 100).toFixed(0)}% (6~20%)`);
  ok(ksum / tot > 3 && ksum / tot < 6, `평균 만들 수 있는 목표 수 ${(ksum / tot).toFixed(2)}`);
  ok(Math.max(...Object.keys(cnt).map(Number)) >= 8, '많은 라운드는 8개 이상도 나옴');
  ok(firstSeats[0] > 60 && firstSeats[1] > 60, `먼저 차례가 무작위 ${firstSeats}`);
  eq(clone(G.init({ n: 2, seed: 77, cfg: {} })), clone(G.init({ n: 2, seed: 77, cfg: {} })), '같은 seed 같은 판');
  eq(G.init({ n: 2, seed: 1, cfg: { rounds: 5 } }).rounds, 5, '5라운드 옵션'); eq(G.init({ n: 2, seed: 1, cfg: { rounds: 7 } }).rounds, 10, '이상한 값은 10');
}

// 도우미: 지금 라운드의 만들 수 있는 목표 (높은 층 먼저)
const sols = st => Object.keys(st.sol).map(Number).sort((a, b) => st.sol[b].f - st.sol[a].f || st.sol[a].cost - st.sol[b].cost);
const ans = (st, v) => ({ t: 'ans', rpn: st.sol[v].rpn.slice(), tv: v });
// 만들 수 있는 목표가 특정 모양인 판 찾기
function findSeed(pred, max = 4000) { for (let s = 1; s <= max; s++) { const st = G.init({ n: 2, seed: s, cfg: {} }); if (pred(st)) return st; } return null; }
const wrongRpn = st => { // 목표에 없는 값의 식
  const all = st.rows.flat();
  for (const rpn of [['0', '1', '+', '2', '+'], ['0', '1', '2', '+', '+'], ['0', '1', '*', '2', '+'], ['0', '1', '-', '2', '-'], ['0', '1', '2', '*', '-']]) { const r = G.evalRpn(rpn, st.ops); if (r.ok && !(r.v[1] === 1 && all.includes(r.v[0]))) return rpn; }
  return null;
};

// 3) 정답 → 도전 시간 → 점수
{
  const st = findSeed(s => { const k = sols(s); return k.length >= 2 && s.sol[k[0]].f < 4 && s.sol[k[k.length - 1]].f < s.sol[k[0]].f; });
  ok(st, '시험용 판 찾음');
  const k = sols(st), hi = k[0], lo = k[k.length - 1], h = st.hold;
  eq(G.needs(st), [h], '먼저 차례만 입력'); eq(st.phase, 'open', '처음엔 열린 단계');
  ok(!G.apply(st, 1 - h, { t: 'pass' }).ok, '차례 아닌 쪽 거절'); ok(!G.apply(st, h, null).ok, '빈 입력 거절'); ok(!G.apply(st, h, { t: 'x' }).ok, '모르는 행동 거절');
  ok(!G.apply(st, h, { t: 'ans', rpn: ['0', '1'] }).ok, '이상한 식은 거절 (감점 없음)'); eq(st.pts, [0, 0], '거절된 식은 점수 그대로');
  ok(!G.apply(st, h, { t: 'ans', rpn: st.sol[lo].rpn, tv: lo + 1 }).ok, '말한 값과 식의 값이 다르면 거절');
  const before = clone(st);
  // 낮은 층을 먼저 답함 → 상대 도전
  ok(G.apply(st, h, ans(st, lo)).ok, '낮은 층 정답');
  eq(st.phase, 'raise', '정답이면 상대에게 도전 시간'); eq(st.floor, st.sol[lo].f, '지금 층'); eq(G.needs(st), [1 - h], '도전하는 쪽'); eq(st.lead, h, '앞선 쪽');
  ok(!G.apply(st, h, { t: 'pass' }).ok, '도전 중엔 내 차례 아님');
  ok(!G.apply(st, 1 - h, { t: 'imp' }).ok, '도전 중엔 불가능 선언 못 함');
  // 같거나 낮은 층 시도: 감점 없이 횟수만
  const same = sols(st).find(v => st.sol[v].f <= st.sol[lo].f && v !== lo) || lo;
  ok(G.apply(st, 1 - h, ans(st, same)).ok, '같은 층 이하 시도');
  eq(st.tries, 1, '틀린 시도 1'); eq(st.pts, [0, 0], '도전 중 오답은 감점 없음'); eq(st.phase, 'raise', '아직 도전 중');
  const wr = wrongRpn(st); if (wr) { ok(G.apply(st, 1 - h, { t: 'ans', rpn: wr }).ok, '목표에 없는 수식도 시도 가능'); eq(st.pts, [0, 0], '감점 없음'); eq(st.tries, 2, '틀린 시도 2'); }
  // 더 높은 층 성공 → 이어서 처음 사람에게 도전
  ok(G.apply(st, 1 - h, ans(st, hi)).ok, '더 높은 층 성공');
  eq(st.lead, 1 - h, '앞선 쪽 바뀜'); eq(st.floor, st.sol[hi].f, '층 올라감'); eq(st.tries, 0, '시도 횟수 새로');
  if (st.phase === 'raise') {
    eq(G.needs(st), [h], '이번엔 처음 사람이 도전');
    ok(G.apply(st, h, { t: 'pass' }).ok, '포기');
  }
  eq(st.phase, 'show', '라운드 끝'); const rec = st.hist[0];
  eq(rec.kind, 'raise', '기록: 층 도전'); eq(rec.win, 1 - h, '이긴 쪽'); eq(rec.f, st.sol[hi].f, '이긴 층'); const dd = [0, 0]; dd[1 - h] = st.sol[hi].f; eq(st.pts, dd, '점수 = 층 수'); eq(rec.d, dd, '기록의 점수 변화');
  ok(rec.sol.length === Object.keys(st.sol).length && rec.trace.length >= 3, '기록에 정답 목록 · 선언 흐름');
  eq(G.needs(st), [], '보여 주는 단계는 입력 없음'); ok(G.auto(st) > 0, '보여 주기 뒤 자동으로 넘어감');
  G.advance(st); eq(st.round, 1, '다음 라운드'); eq(st.phase, 'open', '새 라운드는 열린 단계'); eq(st.hold, (st.first + 1) % 2, '먼저 차례 번갈아');
  void before;
}

// 4) 4층을 만들면 바로 끝 · 오답 −1 · 두 번째 차례 · 둘 다 오답
{
  const st = findSeed(s => sols(s).some(v => s.sol[v].f === 4) && wrongRpn(s));
  ok(st, '4층 판 찾음'); const top = sols(st).find(v => st.sol[v].f === 4), h = st.hold;
  const wr = wrongRpn(st);
  ok(G.apply(st, h, { t: 'ans', rpn: wr }).ok, '목표에 없는 식 선언'); const pen = [0, 0]; pen[h] = -1; eq(st.pts, pen, '오답 −1점');
  eq(st.phase, 'open', '라운드는 계속'); eq(st.hold, 1 - h, '상대 차례'); eq(st.step, 1, '두 번째 차례');
  ok(G.apply(st, 1 - h, ans(st, top)).ok, '4층 정답'); eq(st.phase, 'show', '4층이면 도전 시간 없이 바로 끝');
  const e = [0, 0]; e[h] = -1; e[1 - h] += 4; eq(st.pts, e, '4점 − 상대 −1점'); eq(st.hist[0].win, 1 - h, '이긴 쪽');
  // 둘 다 오답 → 점수 없이 끝 (각 −1)
  const s2 = G.init({ n: 2, seed: st.rs ? 1 : 1, cfg: {} }); s2.sol = {}; const w2 = wrongRpn(s2);
  if (w2) { const h2 = s2.hold; ok(G.apply(s2, h2, { t: 'ans', rpn: w2 }).ok && G.apply(s2, 1 - h2, { t: 'ans', rpn: w2 }).ok, '둘 다 오답'); eq(s2.pts, [-1, -1], '둘 다 −1점'); eq(s2.hist[0].kind, 'none', '아무도 못 맞힘'); }
}

// 5) 불가능 선언
{
  const st = findSeed(s => Object.keys(s.sol).length === 0);
  ok(st, '만들 수 있는 목표가 없는 판 찾음'); const h = st.hold;
  ok(G.apply(st, h, { t: 'imp' }).ok, '불가능 선언'); eq(st.phase, 'imp', '선언 단계'); eq(st.decl, h, '선언한 쪽'); eq(G.needs(st), [1 - h], '상대가 1분 동안 도전');
  ok(!G.apply(st, h, { t: 'pass' }).ok, '선언한 쪽은 입력 없음');
  const wr = wrongRpn(st);
  if (wr) for (let i = 0; i < 3; i++) { ok(G.apply(st, 1 - h, { t: 'ans', rpn: wr }).ok, '틀린 시도'); eq(st.phase, 'imp', '아직 도전 중'); eq(st.pts, [0, 0], '도전 중 오답은 감점 없음'); }
  ok(G.apply(st, 1 - h, { t: 'pass' }).ok, '포기'); const e = [0, 0]; e[h] = 5; eq(st.pts, e, '불가능 성공 +5점'); eq(st.hist[0].kind, 'imp', '기록: 불가능'); eq(st.hist[0].win, h, '이긴 쪽');
  // 틀린 시도 4번이면 시간 끝 → 선언 성공
  const s2 = findSeed(s => Object.keys(s.sol).length === 0 && wrongRpn(s)); const h2 = s2.hold; G.apply(s2, h2, { t: 'imp' });
  for (let i = 0; i < 4; i++) { if (s2.phase !== 'imp') break; G.apply(s2, 1 - h2, { t: 'ans', rpn: wrongRpn(s2) }); }
  eq(s2.phase, 'show', '틀린 시도 4번이면 도전 끝'); const e2 = [0, 0]; e2[h2] = 5; eq(s2.pts, e2, '+5점');
  // 불가능이라 했는데 상대가 만듦 → 선언한 쪽 −3, 만든 쪽 층 점수
  const s3 = findSeed(s => sols(s).length >= 1); const h3 = s3.hold, v3 = sols(s3)[0];
  ok(G.apply(s3, h3, { t: 'imp' }).ok && G.apply(s3, 1 - h3, ans(s3, v3)).ok, '불가능 선언 → 상대가 찾음'); const e3 = [0, 0]; e3[h3] = -3; e3[1 - h3] = s3.sol[v3].f; eq(s3.pts, e3, '선언한 쪽 −3 · 찾은 쪽 층 점수'); eq(s3.phase, 'show', '라운드 끝'); eq(s3.hist[0].win, 1 - h3, '찾은 쪽 승'); eq(s3.hist[0].f, s3.sol[v3].f, '기록의 층');
  // 선언은 정답 선언이 나오기 전, 첫 차례에서만
  const s4 = findSeed(s => sols(s).length >= 1); const h4 = s4.hold; G.apply(s4, h4, ans(s4, sols(s4).find(v => s4.sol[v].f < 4) || sols(s4)[0]));
  if (s4.phase === 'raise') ok(!G.apply(s4, 1 - s4.hold, { t: 'imp' }).ok, '정답 선언이 나온 뒤에는 불가능 선언 못 함');
  // 넘긴 다음 상대가 불가능 선언
  const s5 = G.init({ n: 2, seed: 4, cfg: {} }); const h5 = s5.hold; G.apply(s5, h5, { t: 'pass' }); eq(s5.hold, 1 - h5, '넘기면 상대 차례'); ok(G.apply(s5, 1 - h5, { t: 'imp' }).ok, '두 번째 차례에도 불가능 선언 가능'); eq(s5.decl, 1 - h5, '선언한 쪽');
}

// 6) 끝 · 순위 · 점수 합
{
  const st = G.init({ n: 2, seed: 3, cfg: { rounds: 5 } }); let guard = 0;
  while (!G.over(st) && guard++ < 200) { const need = G.needs(st); if (!need.length) { G.advance(st); continue; } ok(G.apply(st, need[0], G.ai(G.view(st, need[0]), need[0], 'hard', rngOf(guard))).ok, 'AI 수가 받아들여짐'); }
  ok(G.over(st), '5라운드 끝'); eq(st.hist.length, 5, '기록 5개'); eq(st.hist.reduce((s, h) => s + h.d[0], 0), st.pts[0], '라운드 점수 합 = 총점 (0번)'); eq(st.hist.reduce((s, h) => s + h.d[1], 0), st.pts[1], '라운드 점수 합 = 총점 (1번)');
  const rk = G.ranks(st); ok(rk.includes(0), '1등이 있음'); eq(G.view(st, 0).ranks, rk, 'view.ranks');
  eq(G.ranks({ pts: [3, 3] }), [0, 0], '동점은 공동 1등'); eq(G.ranks({ pts: [-2, 4] }), [1, 0], '순위');
  eq(G.needs(st), [], '끝나면 입력 없음'); ok(!G.apply(st, 0, { t: 'pass' }).ok, '끝난 뒤 행동 거절');
}

// 7) 보이는 것 · 안 바뀜 · AI
{
  for (let seed = 1; seed <= 40; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); const rs = rngOf(seed + 9); let steps = 0;
    while (!G.over(st) && steps++ < 400) {
      const need = G.needs(st);
      for (const s of [0, 1, -1, 'all']) {
        const V = G.view(st, s), js = JSON.stringify(V);
        ok(!('sol' in V), 'view 맨 위에 정답 목록이 없음');
        if (!['show', 'end'].includes(st.phase)) {
          ok(V.res === null, '라운드 중에는 res 없음');
          const alt = clone(st); for (const k of Object.keys(alt.sol)) { alt.sol[k].rpn = ['0', '1', '2', '+', '+']; alt.sol[k].cost += 1; alt.sol[k].f = 1; }
          eq(JSON.stringify(G.view(alt, s)), js, '정답 목록(숨은 것)을 바꿔도 view 가 같음 (라운드 중)');
        }
      }
      eq(G.view(st, 0).pub, G.view(st, 1).pub, 'pub 은 둘 다 같음'); eq(G.view(st, 0).pub, G.view(st, -1).pub, '구경꾼도 같은 pub');
      // view · 안 먹는 apply 가 st 를 안 바꿈
      const snap = JSON.stringify(st); G.view(st, 0); G.view(st, 'all'); eq(JSON.stringify(st), snap, 'view 가 st 를 바꾸지 않음');
      if (!need.length) { G.advance(st); continue; }
      const seat = need[0], V = G.view(st, seat); const vsnap = JSON.stringify(V); const tier = ['easy', 'normal', 'hard'][(seed + seat) % 3];
      const a = G.ai(V, seat, tier, rs); eq(JSON.stringify(V), vsnap, 'ai 가 view 를 바꾸지 않음');
      ok(a && G.apply(st, seat, a).ok, `AI 수가 규칙에 맞음 (${tier} ${a && a.t})`);
      const nn = G.needs(st), off = [0, 1].find(x => !nn.includes(x)), bad = clone(st);
      if (off != null) { G.apply(bad, off, { t: 'pass' }); ok(JSON.stringify(bad) === JSON.stringify(st), '차례 아닌 apply 는 st 를 안 바꿈'); }
      if (nn.length) { const bad2 = clone(st); G.apply(bad2, nn[0], { t: 'ans', rpn: ['0', '0'] }); ok(JSON.stringify(bad2) === JSON.stringify(st), '거절된 식은 st 를 안 바꿈'); }
    }
    ok(G.over(st), '한 판이 끝남');
  }
  // AI 는 틀린 답을 안 냄: 낸 식은 늘 목표를 만든다 (open 단계에서 −1 이 한 번도 없어야)
  let wrong = 0, passes = 0, imps = 0, fakeImp = 0, ansN = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const st = G.init({ n: 2, seed, cfg: {} }); const rs = rngOf(seed); let steps = 0;
    while (!G.over(st) && steps++ < 400) {
      const need = G.needs(st); if (!need.length) { G.advance(st); continue; }
      const seat = need[0], a = G.ai(G.view(st, seat), seat, ['easy', 'normal', 'hard'][seed % 3], rs), before = st.pts.slice();
      if (a.t === 'pass') passes++; if (a.t === 'imp') { imps++; if (Object.keys(st.sol).length) fakeImp++; } if (a.t === 'ans') ansN++;
      G.apply(st, seat, a); if (a.t === 'ans' && st.pts[seat] < before[seat]) wrong++;
    }
  }
  eq(wrong, 0, 'AI 는 틀린 식을 안 냄'); ok(ansN > 100 && passes > 10 && imps > 5, `AI 가 정답 · 넘기기 · 불가능을 골고루 (정답 ${ansN} · 넘김 ${passes} · 불가능 ${imps}, 그중 사실은 만들 수 있었던 ${fakeImp})`);
  // 같은 view + 같은 난수 = 같은 수
  const st = G.init({ n: 2, seed: 8, cfg: {} }), V = G.view(st, st.hold); eq(G.ai(clone(V), st.hold, 'hard', rngOf(5)), G.ai(clone(V), st.hold, 'hard', rngOf(5)), 'AI 는 같은 입력에 같은 수');
  // 단계가 올라갈수록 더 많이 찾음
  const cntF = {}; for (const tier of ['easy', 'normal', 'hard']) { let f = 0, n = 0; for (let seed = 1; seed <= 150; seed++) { const s = G.init({ n: 2, seed, cfg: {} }), V = G.view(s, 0); n += Object.keys(s.sol).length; f += G.found(V, 0, tier, G.table(V)).length; } cntF[tier] = f / Math.max(1, n); }
  ok(cntF.easy < cntF.normal && cntF.normal < cntF.hard && cntF.hard > 0.8 && cntF.easy < 0.45, `찾는 비율 초급 ${cntF.easy.toFixed(2)} < 중급 ${cntF.normal.toFixed(2)} < 고급 ${cntF.hard.toFixed(2)}`);
  eq(G.canon({ t: 'ans', rpn: ['0', '1', '2', '+', '+'], tv: 16 }), G.canon({ t: 'ans', rpn: ['2', '1', '0', '-', '*'], tv: 16 }), '같은 목표를 고르면 같은 수 (canon)');
  ok(G.canon({ t: 'pass' }) !== G.canon({ t: 'imp' }), '넘기기 ≠ 불가능');
  eq(G.legal(G.init({ n: 2, seed: 1, cfg: {} }), 0).length + G.legal(G.init({ n: 2, seed: 1, cfg: {} }), 1).length, 2, 'legal: 먼저 차례만 (넘기기 · 불가능)');
}

console.log(`피라미드 넘버 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

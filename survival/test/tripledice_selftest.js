// 트리플 다이스 규칙 시험 (node survival/test/tripledice_selftest.js [--quick])
'use strict';
const C = require('../games/tripledice/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const K = C.keyOf;
// 장면: 주사위를 직접 정함 (dice[s] = 11개, 흰 9 · 빨강 · 파랑)
function scene(n, dice, first, cfg) {
  const st = C.init({ n, seed: 5, cfg });
  st.dice = dice.map(d => d.slice()); st.first = first || 0; st.order = Array.from({ length: n }, (_, i) => (st.first + i) % n);
  return st;
}
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 4000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 조합 순위
{
  ok(K([6, 6, 6]) > K([4, 5, 6]) && K([1, 1, 1]) > K([4, 5, 6]), '트리플 > 스트레이트');
  ok(K([1, 2, 3]) > K([6, 6, 5]) && K([1, 2, 3]) > K([6, 6, 1]), '스트레이트 > 더블');
  ok(K([1, 1, 2]) > K([6, 5, 3]), '더블 > 싱글');
  ok(C.catOf(K([6, 1, 2])) === 0 && C.catOf(K([5, 6, 1])) === 0 && C.catOf(K([3, 2, 1])) === 2, '6-1 은 안 이어짐');
  ok(K([3, 3, 1]) > K([2, 2, 6]) && K([4, 4, 2]) > K([4, 4, 1]) && K([4, 4, 2]) === K([2, 4, 4]), '더블: 짝 숫자 → 남은 숫자 · 순서 무관');
  ok(K([5, 4, 6]) > K([3, 4, 5]) && K([6, 5, 3]) > K([6, 4, 3]) && K([6, 5, 3]) === K([3, 6, 5]), '스트레이트 · 싱글 높은 숫자');
  ok(C.nameOf([3, 1, 3]) === '3 더블' && C.nameOf([4, 6, 5]) === '6 스트레이트' && C.nameOf([2, 2, 2]) === '2 트리플' && C.nameOf([1, 4, 6]) === '6·4·1 싱글', '조합 이름');
}
// 2) 순위 점수 · 예측
{
  ok(J(C.rankPts([30, 20, 10, 0], 4)) === J([6, 3, 1, 0]), '4명 6 · 3 · 1 · 0');
  ok(J(C.rankPts([9, 9, 3, 1], 4)) === J([4.5, 4.5, 1, 0]) && J(C.rankPts([5, 1, 1, 1], 4)) === J([6, 4 / 3, 4 / 3, 4 / 3]), '동률은 평균 (4.5 · 1⅓)');
  ok(J(C.rankPts([5, 5, 5, 5], 4)) === J([2.5, 2.5, 2.5, 2.5]), '넷 다 같으면 2.5');
  ok(J(C.rankPts([3, 9, 1], 3)) === J([3, 6, 0]) && J(C.rankPts([1, 2], 2)) === J([0, 6]), '3명 6 · 3 · 0 · 2명 6 · 0');
  ok(C.predOk(0, 0) && !C.predOk(0, 0.5) && C.predOk(1, 0.5) && C.predOk(1, 6.5) && !C.predOk(1, 7) && !C.predOk(1, 0), 'ZERO · MIN 경계');
  ok(C.predOk(2, 7) && C.predOk(2, 10) && !C.predOk(2, 10.5) && C.predOk(3, 10.5) && !C.predOk(3, 10), 'MORE · MAX 경계');
  ok(C.gainOf(0, 0) === 40 && C.gainOf(2, 9) === 18 && C.gainOf(3, 9) === 9 && C.gainOf(0, 1) === 1, '맞으면 2배 · ZERO +40 · 틀리면 그대로');
}
// 3) 처음 상태 · 옵션
{
  const st = C.init({ n: 4, seed: 9 });
  ok(st.n === 4 && st.R === 4 && st.round === 1 && st.phase === 'pred' && st.dice.length === 4 && st.dice.every(d => d.length === 11 && d.every(v => v >= 1 && v <= 6 && Number.isInteger(v))), '4명 · 4라운드 · 주사위 11개 (1~6)');
  ok(J(C.needs(st).slice().sort()) === J([0, 1, 2, 3]) && st.first >= 0 && st.first < 4 && st.order[0] === st.first, '예측은 모두 한꺼번에 · 선');
  ok(C.init({ n: 7, seed: 1 }).n === 4 && C.init({ n: 1, seed: 1 }).n === 2, '인원 2~4');
  ok(C.init({ n: 3, seed: 1, cfg: { rounds: 2 } }).R === 2 && C.init({ n: 3, seed: 1, cfg: { rounds: 9 } }).R === 4, '라운드 옵션 4 · 2');
  const f = new Set(); for (let s = 1; s <= 40; s++) f.add(C.init({ n: 4, seed: s }).first);
  ok(f.size === 4, '1라운드 선은 씨앗마다 다름 ' + [...f]);
  const a = C.init({ n: 4, seed: 33 }), b = C.init({ n: 4, seed: 33 });
  ok(J(a.dice) === J(b.dice) && J(a.dice) !== J(C.init({ n: 4, seed: 34 }).dice), '같은 씨앗 = 같은 주사위');
}
// 4) 진행 · 오류
{
  const D = [
    [6, 6, 6, 5, 5, 5, 1, 2, 4, 6, 3],
    [4, 4, 4, 3, 3, 3, 2, 2, 1, 1, 5],
    [1, 2, 3, 6, 5, 4, 1, 1, 2, 2, 6],
    [1, 2, 4, 1, 2, 4, 1, 3, 5, 6, 6],
  ];
  const st = scene(4, D, 1);
  ok(!C.apply(st, 0, { t: 'sub', d: [0, 1, 2] }).ok, '예측 전에 내기 거절');
  ok(!C.apply(st, 0, { t: 'pred', p: 4 }).ok && !C.apply(st, 0, { t: 'pred', p: 1.5 }).ok, '없는 예측 거절');
  C.apply(st, 0, { t: 'pred', p: 3 }); C.apply(st, 1, { t: 'pred', p: 2 }); C.apply(st, 2, { t: 'pred', p: 1 });
  ok(!C.apply(st, 0, { t: 'pred', p: 2 }).ok, '예측은 한 번만');
  ok(st.phase === 'pred', '모두 낼 때까지 예측');
  C.apply(st, 3, { t: 'pred', p: 0 });
  ok(st.phase === 'play' && st.trick === 1 && J(C.needs(st)) === J([1]), '예측 끝 → 선(1번)부터 제출');
  ok(!C.apply(st, 0, { t: 'sub', d: [0, 1, 2] }).ok, '차례 아님 거절');
  ok(!C.apply(st, 1, { t: 'sub', d: [0, 0, 1] }).ok && !C.apply(st, 1, { t: 'sub', d: [0, 1] }).ok && !C.apply(st, 1, { t: 'sub', d: [0, 1, 11] }).ok, '같은 주사위 · 2개 · 없는 주사위 거절');
  ok(C.apply(st, 1, { t: 'sub', d: [2, 1, 0] }).ok && J(st.subs[1]) === J([0, 1, 2]), '1번 4 트리플');
  C.apply(st, 2, { t: 'sub', d: [3, 4, 5] });           // 6 스트레이트
  C.apply(st, 3, { t: 'sub', d: [0, 1, 2] });           // 4·2·1 싱글
  C.apply(st, 0, { t: 'sub', d: [0, 1, 9] });           // 6 트리플 (빨강 포함)
  ok(st.phase === 'trick' && J(st.rp) === J([6, 3, 1, 0]) && st.top === 0 && st.first === 0, '첫 제출: 6 트리플 1위 · 4 트리플 2위 · 스트레이트 3위 · 싱글 0 ' + J(st.rp));
  ok(C.auto(st) > 0, '결과 보기 시간');
  C.advance(st);
  ok(st.phase === 'play' && st.trick === 2 && J(st.order) === J([0, 1, 2, 3]), '1위(0번)가 다음 선');
  ok(!C.apply(st, 0, { t: 'sub', d: [0, 3, 4] }).ok, '이미 낸 주사위 거절');
  // 둘째: 0번 5 트리플 · 1번 3 트리플 · 2번 1 더블 · 3번 1 더블(남은 숫자 2 vs 2 같음?)
  C.apply(st, 0, { t: 'sub', d: [3, 4, 5] });
  C.apply(st, 1, { t: 'sub', d: [3, 4, 5] });
  C.apply(st, 2, { t: 'sub', d: [6, 7, 8] });           // 1 1 2 → 1 더블 (2)
  C.apply(st, 3, { t: 'sub', d: [3, 4, 6] });           // 1 2 1 → 1 더블 (2)
  ok(J(st.rp) === J([12, 6, 1.5, 0.5]) && st.first === 0, '동률 3위 → 1 · 0 평균 0.5씩 ' + J(st.rp));
  C.advance(st);
  // 셋째: 0번과 1번이 같은 조합으로 공동 1위 → 누적 승점이 높은 0번이 선... 여기선 1번이 더 낮음 → 0번
  const D3 = st.dice;
  D3[0][6] = 2; D3[0][7] = 2; D3[0][8] = 2; D3[1][6] = 2; D3[1][7] = 2; D3[1][8] = 2;
  C.apply(st, 0, { t: 'sub', d: [6, 7, 8] });
  C.apply(st, 1, { t: 'sub', d: [6, 7, 8] });
  C.apply(st, 2, { t: 'sub', d: [0, 1, 2] });
  C.apply(st, 3, { t: 'sub', d: [7, 8, 9] });
  ok(st.rp[0] === 16.5 && st.rp[1] === 10.5 && st.top === 0, '공동 1위 4.5씩 · 누적 승점 높은 0번이 선 ' + J(st.rp));
  C.advance(st);
  ok(st.phase === 'rend' && J(st.hist[0].gain) === J([33, 10.5, 5, 0.5]) && J(st.hist[0].ok) === J([true, false, true, false]), '라운드 끝: MAX 16.5 → 33 · MORE 10.5 넘침 · MIN 2.5 → 5 · ZERO 0.5 깨짐 ' + J(st.hist[0].gain));
  C.advance(st);
  ok(st.round === 2 && st.phase === 'pred' && st.first === 0 && st.order[0] === 0, '다음 라운드 선 = 마지막 제출 1위');
}
// 5) 누적 승점으로 선 · ZERO +40
{
  const D = [[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], [1, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2], [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]];
  const st = scene(4, D, 0);
  st.tot = [0, 5, 0, 0];
  for (let s = 0; s < 4; s++) C.apply(st, s, { t: 'pred', p: s === 2 ? 0 : 1 });
  for (const s of [0, 1, 2, 3]) C.apply(st, s, { t: 'sub', d: [0, 1, 2] });
  ok(st.top === 1 && st.first === 1, '공동 1위면 누적 승점 높은 사람이 선 (1번)');
  C.advance(st);
  for (const s of [1, 2, 3, 0]) C.apply(st, s, { t: 'sub', d: [3, 4, 5] });
  C.advance(st);
  for (const s of [1, 2, 3, 0]) C.apply(st, s, { t: 'sub', d: [6, 7, 8] });
  ok(st.rp[2] === 0, '1·2·4 는 단독 꼴찌 0점');
  C.advance(st);
  ok(st.hist[0].gain[2] === 40 && st.tot[2] === 40, 'ZERO 성공 +40');
  // 같은 꼴찌가 있으면 깨짐
  const st2 = scene(4, [[6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6], [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], [1, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2], [1, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2]], 0);
  for (let s = 0; s < 4; s++) C.apply(st2, s, { t: 'pred', p: s >= 2 ? 0 : 3 });
  for (const s of [0, 1, 2, 3]) C.apply(st2, s, { t: 'sub', d: [0, 1, 2] });
  ok(st2.rp[2] === 0.5 && st2.rp[3] === 0.5, '같은 꼴찌 → 0.5씩 (ZERO 깨짐)');
  // 2명: 6 · 0
  const st3 = scene(2, [[6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6], [1, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2]], 0);
  C.apply(st3, 0, { t: 'pred', p: 3 }); C.apply(st3, 1, { t: 'pred', p: 0 });
  for (let t = 0; t < 3; t++) { for (const s of st3.order) C.apply(st3, s, { t: 'sub', d: [t * 3, t * 3 + 1, t * 3 + 2] }); C.advance(st3); }
  ok(J(st3.hist[0].gain) === J([36, 40]) && st3.phase === 'rend', '2명: MAX 18 → 36 · ZERO +40');
}
// 6) 보기: 히든 · 예측 가림, 공개 해시 같음, 보기 · 거절이 상태를 안 바꿈
{
  const st = C.init({ n: 4, seed: 21 }); const r = mul(5);
  let leaks = 0, pubBad = 0, mut = 0, checks = 0;
  while (!C.over(st)) {
    const nd = C.needs(st);
    const Vs = [0, 1, 2, 3].map(s => C.view(st, s)), Vw = C.view(st, -1);
    for (const V of Vs.concat([Vw])) { if (V.pub !== Vs[0].pub) pubBad++; }
    for (let s = 0; s < 4; s++) for (let o = 0; o < 4; o++) {
      if (s === o) continue;
      for (const i of [9, 10]) { const v = Vs[s].dice[o][i].v; if (v != null && !st.rev[o][i]) leaks++; }
      if (Vs[s].pred[o] >= 0 && !(st.phase === 'rend' || st.phase === 'end')) leaks++;
      const sub = Vs[s].subs[o]; if (sub) for (const x of sub) if (x.v != null && KIND(x.i) !== 'w' && !st.rev[o][x.i]) leaks++;
      for (const H of Vs[s].hist) for (const i of [9, 10]) if (H.dice[o][i] != null && !st.over && !H.tricks.some(t => t.subs[o].d.includes(i))) leaks++;
    }
    for (const e of Vw.log) if (e.a && e.a.t === 'pred' && e.a.p !== undefined) leaks++;
    checks++;
    if (!nd.length) { C.advance(st); continue; }
    for (const s of nd) {
      const before = J(st), V = C.view(st, s);
      C.apply(st, s, { t: 'zz' }); C.apply(st, (s + 1) % 4 === s ? s : (s + 1) % 4, { t: 'pred', p: 9 });
      if (J(st) !== before) mut++;
      const V0 = J(V), a = C.ai(V, s, 'hard', r); if (J(V) !== V0) mut++;
      C.apply(st, s, a);
    }
  }
  function KIND(i) { return C.KINDS[i]; }
  ok(checks > 40 && !leaks, `남의 히든 · 예측이 보기에 안 나옴 (${checks}장면, 샘 ${leaks})`);
  ok(!pubBad, '공개 해시는 모든 자리 · 구경꾼이 같음 ' + pubBad);
  ok(!mut, '보기 · 거절된 행동 · AI 가 상태 · 보기를 안 바꿈 ' + mut);
  const Vend = C.view(st, 1);
  ok(Vend.hist.every(H => H.dice.every(ds => ds.every(v => v != null))), '끝나면 지난 히든도 모두 공개');
  ok(J(Vend.ranks) === J(C.ranks(st)) && Vend.res && Vend.res.w.length >= 1, '끝 순위 · 승자');
}
// 7) AI: 규칙 지키기 · 고급은 결정적 · 추천 = 고급 수
{
  let games = 0, recSame = 0, recN = 0, det = 0;
  const seeds = QUICK ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
  for (const seed of seeds) for (const tiers of [['hard', 'normal', 'easy', 'hard'], ['easy', 'hard'], ['normal', 'easy', 'hard']]) {
    playAI(seed, tiers, {}, (st, s, V, V0, a) => {
      if (tiers[s] === 'hard' && recN < 60) { recN++; const R = C.recommend(V, s); if (J(R.a) === J(a)) recSame++; if (J(C.ai(V, s, 'hard', mul(99))) === J(a)) det++; }
    });
    games++;
  }
  ok(games === seeds.length * 3, `AI 끼리 ${games}판 규칙 안 어김`);
  ok(recSame === recN && det === recN && recN > 20, `추천 = 고급 AI 수 · 고급은 rnd 와 상관없음 (${recSame}/${det}/${recN})`);
  const st = playAI(7, ['hard', 'easy', 'easy', 'easy'], { rounds: 2 });
  ok(st.R === 2 && st.hist.length === 2, '2라운드 옵션 끝까지');
}
// 8) 실력: 고급 1 vs 초급 (4명 · 2명)
{
  const N = QUICK ? 24 : 60;
  let w4 = 0, beat = 0, w2 = 0;
  for (let i = 0; i < N; i++) {
    const h = i % 4, tiers = ['easy', 'easy', 'easy', 'easy']; tiers[h] = 'hard';
    const st = playAI(500 + i, tiers);
    const top = Math.max(...st.tot), ws = st.tot.filter(t => t === top).length;
    if (st.tot[h] === top) w4 += 1 / ws;
    beat += st.tot.filter((t, s) => s !== h && st.tot[h] > t).length / 3;
    const t2 = i % 2 ? ['hard', 'easy'] : ['easy', 'hard'], s2 = playAI(900 + i, t2), hh = t2.indexOf('hard');
    w2 += s2.tot[hh] > s2.tot[1 - hh] ? 1 : s2.tot[hh] === s2.tot[1 - hh] ? 0.5 : 0;
  }
  ok(beat / N >= 0.75, `4명: 고급이 초급 한 명 한 명을 이긴 비율 ${(beat / N * 100).toFixed(0)}% (1등 ${(w4 / N * 100).toFixed(0)}%)`);
  ok(w2 / N >= 0.7, `2명: 고급 승률 ${(w2 / N * 100).toFixed(0)}%`);
  console.log(`· 실력: 4명 상대 이김 ${(beat / N * 100).toFixed(0)}% · 1등 ${(w4 / N * 100).toFixed(0)}% · 2명 ${(w2 / N * 100).toFixed(0)}%`);
}
// 9) 화면 글 (node 에서 ui.js)
{
  global.window = { SVCores: { tripledice: C } }; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  require('../games/tripledice/ui.js');
  const U = window.SVUI.tripledice;
  ok(U && U.min === 2 && U.max === 4 && U.defN === 4 && U.howto.length >= 7 && /방송/.test(U.src) && U.tutorial().length === 6 && U.tutorial().filter(s => s.interactive).length === 1, 'UI 틀 · 규칙 줄 · 1분 규칙 6단계 (직접 1)');
  const names = ['나', 'AI1', 'AI2', 'AI3'];
  let bad = 0, n = 0, recs = 0, revs = 0, revBad = 0;
  const st = C.init({ n: 4, seed: 44 }); const r = mul(3);
  while (!C.over(st)) {
    const nd = C.needs(st);
    const V0 = C.view(st, 0), co = U.coach(V0, 0, -1, names), txt = J(co);
    n++; if (/undefined|NaN|null|\[object/.test(txt) || !co.opp || !/\d/.test(co.mine)) { bad++; if (bad < 3) console.error(txt); }
    if (nd.includes(0)) { recs++; if (!/[\d]/.test(co.why) || !co.rec) bad++; }
    if (!nd.length) { C.advance(st); continue; }
    for (const s of nd) {
      const V = C.view(st, s), a = C.ai(V, s, s === 0 ? 'easy' : 'normal', r);
      if (s === 0 && revs < 8) {
        const best = C.recommend(V, 0).a;
        if (J(best) !== J(a)) { revs++; const rv = U.review(V, 0, a, best); if (!(rv.sev >= 0 && rv.sev <= 100) || !/고급 AI/.test(rv.why) || /undefined|NaN/.test(J(rv))) { revBad++; console.error(J(rv)); } }
        const t = U.actText(a, V); if (!t || /undefined|NaN|null/.test(t)) bad++;
        if (/undefined|NaN/.test(U.actText(a, null))) bad++;
      }
      C.apply(st, s, a);
    }
  }
  ok(!bad && n > 40 && recs > 10, `선생님 · 행동 글 깨끗함 (${n}번, 내 차례 ${recs}번)`);
  ok(revs >= 3 && !revBad, `복기 글 (${revs}번)`);
  const res = U.result(C.view(st, 0), 0);
  ok(/위/.test(res) && /점/.test(res) && !/undefined|NaN/.test(res) && (res.match(/1R/g) || []).length === 4, '결과 글: ' + res.replace(/<[^>]+>/g, ' ').slice(0, 160));
  // 선생님: 예측 숫자 근거 · 제출 추천 = 고급 수
  const s1 = C.init({ n: 4, seed: 12 });
  const c1 = U.coach(C.view(s1, 0), 0, -1, names);
  ok(/예측 (ZERO|MIN|MORE|MAX)/.test(c1.rec) && /36번/.test(c1.why) && (c1.why.match(/맞을 \d+%/g) || []).length === 4, '예측 추천 근거 ' + c1.rec + ' / ' + c1.why);
  // ZERO 의심 글
  const D = [[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], [6, 6, 6, 5, 5, 5, 4, 4, 4, 6, 6], [1, 2, 4, 1, 2, 4, 1, 2, 4, 1, 2], [2, 2, 2, 5, 5, 5, 6, 6, 6, 1, 1]];
  const s2 = scene(4, D, 1);
  for (let s = 0; s < 4; s++) C.apply(s2, s, { t: 'pred', p: s === 2 ? 0 : 2 });
  for (const s of [1, 2, 3, 0]) C.apply(s2, s, { t: 'sub', d: [0, 1, 2] });
  C.advance(s2);
  const c2 = U.coach(C.view(s2, 0), 0, -1, names);
  ok(/AI2/.test(c2.opp) && /ZERO/.test(c2.opp) && /직전 제출/.test(c2.opp), 'ZERO 의심 · 직전 제출 ' + c2.opp);
  ok(/MORE/.test(c2.mine) && /남은 제출/.test(c2.mine), '내 예측 필요 점수 ' + c2.mine);
  const b2 = C.recommend(C.view(s2, 1), 1);
  ok(b2 && b2.a.t === 'sub' && b2.rows.length >= 3 && b2.rows.every(x => x.ev >= 0 && x.ok >= 0 && x.ok <= 1), '제출 추천 후보 ' + b2.rows.length);
  ok(/^예측 MAX/.test(U.actText({ t: 'pred', p: 3 }, null)) && /흰 2 · 빨강/.test(U.actText({ t: 'sub', d: [0, 1, 9] }, null)), '행동 글 (보기 없이)');
  ok(U.chip(C.view(s2, 0), 1).t === '6점' || /점$/.test(U.chip(C.view(s2, 0), 1).t), '칩 글');
}

console.log(`tripledice selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

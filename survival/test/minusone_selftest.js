// 하나 빼기 규칙 시험 (node survival/test/minusone_selftest.js [--quick])
'use strict';
const C = require('../games/minusone/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const sub = (a, b) => ({ t: 'sub', c: [a, b] }), pk = c => ({ t: 'pick', c });
// 한 라운드: subs[s] = [a,b] (저절로 낸 자리는 건너뜀) → picks[s]
function round(st, subs, picks) {
  for (let s = 0; s < st.n; s++) if (st.alive[s] && !st.sub[s]) { const r = C.apply(st, s, sub(...subs[s])); if (!r.ok) throw new Error(`sub ${s} ${subs[s]} ${r.err}`); }
  for (let s = 0; s < st.n; s++) if (st.alive[s]) { const r = C.apply(st, s, pk(picks[s])); if (!r.ok) throw new Error(`pick ${s} ${picks[s]} ${r.err}`); }
}
const next = st => { if (C.auto(st) != null) C.advance(st); };
function playAI(n, seed, tiers, r) {
  const st = C.init({ n, seed }); let guard = 0;
  while (!C.over(st) && guard++ < 4000) {
    const need = C.needs(st);
    if (!need.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of need) { const a = C.ai(C.view(st, s), s, tiers[s], r); const res = C.apply(st, s, a); if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`); }
  }
  return st;
}

// 1) 정산 일정
{
  const sc = n => C.schedule(n).map(x => `${x.r}:${x.k}`).join(',');
  ok(sc(7) === '3:1,6:1,9:1,12:1,18:2', `7명 = 방송과 같은 3·6·9·12·18 (${sc(7)})`);
  ok(sc(3) === '6:2', '3명 = 6라운드 뒤 2명 생존');
  ok(sc(4) === '3:1,9:2', '4명 = 3라운드 1명 → 3명 남아 9라운드 2명');
  ok(sc(8) === '3:1,6:1,9:1,12:1,15:1,21:2', '8명 = 21라운드');
  const st = C.init({ n: 7, seed: 1 });
  ok(st.R === 18 && st.round === 1 && st.phase === 'sub', '7명 18라운드 · 1라운드 2장 내기부터');
  ok(J(C.needs(st)) === J([0, 1, 2, 3, 4, 5, 6]), '모두 동시에 냄');
  ok(st.hand.every(m => J(C.cardsOf(m)) === J([1, 2, 3, 4, 5, 6, 7, 8])), '사람마다 1~8 각 1장');
  ok(C.init({ n: 2, seed: 1 }).n === 3 && C.init({ n: 12, seed: 1 }).n === 8, '인원은 3~8명');
}

// 2) 내기 · 공개 · 숨김
{
  const st = C.init({ n: 4, seed: 3 });
  ok(!C.apply(st, 0, { t: 'sub', c: [1] }).ok, '1장만 내면 안 됨');
  ok(!C.apply(st, 0, sub(3, 3)).ok, '같은 카드 2장 안 됨');
  ok(!C.apply(st, 0, sub(0, 9)).ok, '1~8 밖 안 됨');
  ok(!C.apply(st, 0, pk(3)).ok, '내기 단계에 고르기 안 됨');
  ok(C.apply(st, 0, sub(5, 2)).ok, '2장 냄');
  ok(!C.apply(st, 0, sub(1, 2)).ok, '이미 냈으면 또 못 냄');
  const V1 = C.view(st, 1), V0 = C.view(st, 0), Vw = C.view(st, -1);
  ok(V1.sub[0] === null && V1.subbed[0] === true, '남이 낸 2장은 공개 전엔 안 보임 (낸 것만 보임)');
  ok(J(V0.sub[0]) === J([5, 2]), '내가 낸 2장은 보임 (왼쪽 5 · 오른쪽 2)');
  ok(V0.pub === V1.pub && V1.pub === Vw.pub, '공개 지문은 모두 같음');
  ok(!J(V1.log).includes('[5,2]') && !J(V1.log).includes('"c":[5'), '기록에 남의 카드가 새지 않음');
  C.apply(st, 1, sub(1, 3)); C.apply(st, 2, sub(1, 4)); C.apply(st, 3, sub(6, 7));
  ok(st.phase === 'pick', '모두 내면 공개 → 고르기');
  const P = C.view(st, 2);
  ok(J(P.sub) === J([[5, 2], [1, 3], [1, 4], [6, 7]]), '공개 뒤엔 모두의 2장이 보임');
  ok(!C.apply(st, 0, pk(1)).ok, '낸 2장 밖의 카드는 못 씀');
  C.apply(st, 0, pk(2));
  ok(C.view(st, 1).pick[0] === null && C.view(st, 1).picked[0] && C.view(st, 0).pick[0] === 2, '쓸 카드는 결과 전까지 나만 봄');
  ok(C.view(st, 1).pub === C.view(st, 0).pub, '고르는 중에도 공개 지문 같음');
  C.apply(st, 1, pk(1)); C.apply(st, 2, pk(1)); C.apply(st, 3, pk(6));
  // 쓴 카드 2 · 1 · 1 · 6 → 1 겹침 → 2 가 가장 낮은 하나뿐 → 0번 승리 +2
  ok(st.phase === 'show' && st.res.w === 0 && st.res.c === 2 && J(st.res.dup) === J([1]), '겹친 1 은 빠지고 2 가 승리');
  ok(st.score[0] === 2 && st.marks[0] === 1 && st.lastWin[0] === 1, '이긴 숫자만큼 승점 + 표식 1개');
  ok(J(C.view(st, 3).pick) === J([2, 1, 1, 6]), '결과 때는 쓴 카드 모두 공개');
  ok(!(st.hand[0] & (1 << 2)) && st.hold[0] === 5, '쓴 카드는 버리고 안 쓴 카드는 보관');
  ok(C.auto(st) > 0 && !C.needs(st).length, '결과는 잠깐 보여 주고 넘어감');
  next(st);
  ok(st.round === 2 && st.phase === 'sub', '2라운드');
  ok(!C.apply(st, 0, sub(5, 1)).ok, '보관 카드(5)는 바로 다음 라운드에 못 냄');
  ok(!C.apply(st, 0, sub(2, 1)).ok, '쓴 카드(2)는 다시 못 냄');
  ok(J(C.view(st, 0).usable[0]) === J([1, 3, 4, 6, 7, 8]), '낼 수 있는 카드 = 남은 것 − 보관');
  round(st, [[1, 3], [2, 4], [2, 3], [1, 2]], [3, 4, 2, 1]);
  ok(st.res.w === 3 && st.res.c === 1, '하나뿐인 1 이 가장 낮아 승리');
  ok(st.hold[0] === 1 && (st.hand[0] & (1 << 5)), '지난 보관 카드(5)는 다시 쓸 수 있게 돌아옴');
  next(st);
  // 아무도 혼자가 아님 → 승자 없음
  const s0 = st.score.slice();
  const u = s => C.cardsOf(st.hand[s] & ~(1 << st.hold[s]));
  const common = [6, 7, 8].filter(c => [0, 1, 2, 3].every(s => u(s).includes(c)));
  round(st, [0, 1, 2, 3].map(() => common.slice(0, 2)), [0, 1, 2, 3].map(() => common[0]));
  ok(st.res.w === -1 && st.res.c === 0, '모두 같은 숫자 → 승자 없음');
}

// 3) 정산 · 동점 규칙
function setup4() {      // 4명: 1라운드 0번 3 승 · 2라운드 1번 3 승 → 둘 다 3 + ★1
  const st = C.init({ n: 4, seed: 9 });
  round(st, [[3, 8], [1, 8], [1, 7], [1, 6]], [3, 1, 1, 1]); next(st);
  round(st, [[1, 2], [3, 4], [2, 4], [2, 5]], [2, 3, 2, 2]); next(st);
  return st;
}
const noWin = st => round(st, [0, 1, 2, 3].map(() => [6, 7]), [0, 1, 2, 3].map(() => 7));
{
  let st = setup4();
  ok(st.score[0] === 3 && st.score[1] === 3 && st.marks[0] === 1 && st.marks[1] === 1, '두 사람 승점 3 + ★1');
  noWin(st);
  const X = st.res.settle;
  ok(X && !X.fin && J(X.surv) === J([1]) && X.why === 'recent', `점수 · 표식 같음 → 더 최근에 이긴 1번 생존 (${J(X)})`);
  ok(!st.alive[1] && J(st.safe) === J([1]) && st.score.every(x => x === 0) && st.marks[0] === 1, '생존자는 빠지고 승점 0 · 표식은 그대로');
  next(st);
  ok(J(C.needs(st)) === J([0, 2, 3]), '생존자는 더 안 냄');
  ok(C.view(st, 0).next.r === 9 && C.view(st, 0).next.k === 2, '3명 남으면 6라운드 뒤 2명 생존');
  // 표식 많은 쪽
  st = setup4(); st.score = [4, 3, 0, 0]; st.marks = [1, 2, 0, 0];
  noWin(st);
  ok(J(st.res.settle.surv) === J([1]) && st.res.settle.why === 'marks', '점수+표식 같으면 표식 많은 쪽');
  // 점수가 높으면 그대로
  st = setup4(); st.score = [6, 3, 0, 0];
  noWin(st);
  ok(J(st.res.settle.surv) === J([0]) && st.res.settle.why === '' && st.res.settle.rows[0].t === 7, '승점 + 표식 = 7 로 1등 생존');
  // 모두 같으면 추첨 (같은 씨앗이면 같은 결과)
  const lot = () => { const s = setup4(); s.score = [2, 2, 0, 0]; s.lastWin = [0, 0, 0, 0]; noWin(s); return s.res.settle; };
  const L1 = lot(), L2 = lot();
  ok(L1.why === 'lot' && [0, 1].includes(L1.surv[0]) && J(L1) === J(L2), '셋 다 같으면 추첨 (씨앗이 같으면 같음)');
}

// 4) 저절로 내기 · 카드 리셋 · 마지막 정산 · 등수
{
  const st = C.init({ n: 3, seed: 4 }), r = mul(4);
  let forcedSeen = false, resetSeen = false;
  while (!C.over(st)) {
    if (st.phase === 'sub' && st.round % 6 === 0) {
      forcedSeen = st.alive.every((a, s) => !a || st.sub[s]) && st.phase === 'sub' ? true : forcedSeen;
    }
    if (st.phase === 'pick' && st.round % 6 === 0 && st.log.some(e => e.k === 'forced' && e.i > 0)) forcedSeen = true;
    const need = C.needs(st);
    if (!need.length) { if (st.res && st.res.reset) { resetSeen = st.hand.every(m => m === 0x1FE) && st.hold.every(h => h === 0); } C.advance(st); continue; }
    for (const s of need) C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r));
  }
  ok(forcedSeen, '6라운드엔 낼 카드가 2장뿐 → 저절로 냄');
  ok(st.round === 6 && st.over && st.setl.length === 1 && st.setl[0].fin, '3명: 6라운드 끝 마지막 정산');
  ok(st.safe.length === 2 && st.elim >= 0 && !st.safe.includes(st.elim), '2명 생존 · 1명 탈락');
  const rk = C.ranks(st);
  ok(rk[st.safe[0]] === 0 && rk[st.safe[1]] === 1 && rk[st.elim] === 2, '등수 = 생존 순서 · 탈락 맨 아래');
  const s7 = C.init({ n: 7, seed: 11 }), r7 = mul(11);
  let reset6 = false;
  while (!C.over(s7)) {
    const need = C.needs(s7);
    if (!need.length) { if (s7.res && s7.res.reset && s7.round === 6) reset6 = true; C.advance(s7); if (reset6 && s7.round === 7) ok(s7.hand.every(m => m === 0x1FE) && s7.hold.every(h => !h), '6라운드 뒤 카드 8장 리셋 · 보관 없음'); continue; }
    for (const s of need) C.apply(s7, s, C.ai(C.view(s7, s), s, 'easy', r7));
  }
  ok(reset6, '6라운드 끝 리셋 표시');
  ok(s7.round === 18 && J(s7.setl.map(x => x.r)) === J([3, 6, 9, 12, 18]) && s7.safe.length === 6, '7명: 3·6·9·12·18 정산, 6명 생존');
  const rk7 = C.ranks(s7);
  ok(J(rk7.slice().sort((a, b) => a - b)) === J([0, 1, 2, 3, 4, 5, 6]), '등수는 0~6 하나씩');
  ok(C.auto(s7) === null && !C.needs(s7).length, '끝나면 멈춤');
}

// 5) 재생 · view 가 판을 안 바꿈 · AI 는 늘 둘 수 있는 수
{
  const tiers = ['hard', 'easy', 'normal', 'easy', 'normal'];
  const a = playAI(5, 21, tiers, mul(5)), b = playAI(5, 21, tiers, mul(5));
  ok(J(a.log) === J(b.log) && J(C.ranks(a)) === J(C.ranks(b)), '같은 씨앗 · 같은 AI 난수 → 같은 판');
  const st = C.init({ n: 6, seed: 8 }), before = J(st);
  for (let s = 0; s < 6; s++) { const V = C.view(st, s); C.ai(V, s, 'hard', mul(s)); C.legal(st, s); C.view(st, 'all'); }
  ok(J(st) === before, 'view · ai · legal 은 판을 안 바꿈');
  ok(C.legal(st, 0).length === 28, '1라운드 낼 수 있는 짝 28개');
  let bad = 0, games = QUICK ? 6 : 24;
  for (let g = 0; g < games; g++) {
    const n = 3 + (g % 6), t = Array.from({ length: n }, (_, i) => ['easy', 'normal', 'hard'][(g + i) % 3]);
    try { const s = playAI(n, 100 + g, t, mul(g)); const rk = C.ranks(s); if (J(rk.slice().sort((x, y) => x - y)) !== J([...Array(n).keys()])) bad++; } catch (e) { bad++; console.error(e.message); }
  }
  ok(bad === 0, `AI 판 ${games}개 (3~8명) 모두 끝까지 · 등수 정상`);
}

// 마지막 정산 라운드 장면 (3명 · 6R · 모두 카드 2장 · 공개 뒤): 나 [3,8] · 1번 [1,4] · 2번 [2,5]
function final6() {
  const st = C.init({ n: 3, seed: 2 });
  st.round = 6; st.score = [1, 2, 6]; st.marks = [0, 0, 0]; st.hold = [0, 0, 0]; st.lastWin = [0, 0, 0];
  st.hand = [(1 << 3) | (1 << 8), (1 << 1) | (1 << 4), (1 << 2) | (1 << 5)];
  st.sub = [[3, 8], [1, 4], [2, 5]]; st.pick = [null, null, null]; st.phase = 'pick';
  return st;
}
// 6) AI 실력 · 속도
{
  const bench = (A, B, n, games, seed0) => {
    let beat = 0, tot = 0, tmax = 0;
    for (let g = 0; g < games; g++) {
      const seat = g % n, tiers = Array(n).fill(B); tiers[seat] = A;
      const st = C.init({ n, seed: seed0 + g }), r = mul(seed0 + g);
      while (!C.over(st)) {
        const need = C.needs(st);
        if (!need.length) { C.advance(st); continue; }
        for (const s of need) { const t0 = Date.now(); const a = C.ai(C.view(st, s), s, tiers[s], r); if (s === seat) tmax = Math.max(tmax, Date.now() - t0); C.apply(st, s, a); }
      }
      const rk = C.ranks(st); beat += rk.filter((x, i) => i !== seat && x > rk[seat]).length; tot += n - 1;
    }
    return { p: beat / tot, tmax };
  };
  const g = QUICK ? 14 : 42;
  const hv = bench('hard', 'easy', 7, g, 500), nv = bench('normal', 'easy', 7, QUICK ? 30 : 120, 700), hn = bench('hard', 'normal', 7, QUICK ? 7 : 28, 900);
  console.log(`· 고급 vs 초급 7명 ${(hv.p * 100).toFixed(1)}% · 중급 vs 초급 ${(nv.p * 100).toFixed(1)}% · 고급 vs 중급 ${(hn.p * 100).toFixed(1)}% · 고급 한 수 최대 ${hv.tmax}ms`);
  ok(hv.p >= (QUICK ? 0.55 : 0.62), `고급이 초급보다 확실히 셈 (${(hv.p * 100).toFixed(1)}%)`);
  ok(nv.p >= 0.5, `중급이 초급보다 나음 (${(nv.p * 100).toFixed(1)}%)`);
  ok(hn.p >= (QUICK ? 0.5 : 0.58), `고급이 중급보다 나음 (${(hn.p * 100).toFixed(1)}%)`);
  ok(hv.tmax < 1500, `고급 한 수 1.5초 안 (${hv.tmax}ms)`);
  // 둘이 1·2 를 같이 들면: 같은 숫자를 쓰면 겹쳐 빠지니 내 3 도 8 도 반반 → 점수가 큰 8 이 나음
  const sA = C.init({ n: 3, seed: 2 }); C.apply(sA, 0, sub(3, 8)); C.apply(sA, 1, sub(1, 2)); C.apply(sA, 2, sub(1, 2));
  const chA = C.chances(C.view(sA, 0), 0);
  ok(chA[3] === 0.5 && chA[8] === 0.5, `이길 확률 정확히 셈: 남 둘이 1·2 → 3 · 8 모두 50% (${J(chA)})`);
  ok(C.ai(C.view(sA, 0), 0, 'hard', mul(3)).c === 8, '이길 확률이 같으면 점수가 큰 8');
  // 남이 1·4 · 2·5 → 둘이 늘 다른 숫자라 8 은 절대 못 이기고, 3 은 둘이 4 · 5 를 쓸 때(25%) 이김
  const st = C.init({ n: 3, seed: 2 });
  C.apply(st, 0, sub(3, 8)); C.apply(st, 1, sub(1, 4)); C.apply(st, 2, sub(2, 5));
  const ch = C.chances(C.view(st, 0), 0);
  ok(ch[3] === 0.25 && ch[8] === 0, `이길 확률: 3 = 25%, 8 = 0 (${J(ch)})`);
  ok(C.ai(C.view(st, 0), 0, 'hard', mul(3)).c === 8, '1라운드엔 못 이길 8 을 버리고 낮은 3 을 아낌 (굴려 보면 더 나음)');
  // 마지막 정산 라운드(3명 · 6R): 나 1점 · 1번 2점 · 2번 6점 → 내가 이겨야만 2등 안 → 25% 라도 3 을 써야 함
  const s6 = final6();
  const a = C.ai(C.view(s6, 0), 0, 'hard', mul(3));
  ok(a.t === 'pick' && a.c === 3, `이겨야만 사는 마지막 라운드엔 3 (${J(a)})`);
}

// 7) 화면 글 (Node 에서 ui.js)
{
  global.window = { SVCores: { minusone: C } };
  global.document = { createElement: () => ({}), head: { appendChild() {} } };
  require('../games/minusone/ui.js');
  const U = global.window.SVUI.minusone, names = ['나', 'AI1', 'AI2', 'AI3', 'AI4', 'AI5', 'AI6'];
  ok(U.min === 3 && U.max === 8 && U.defN === 7 && !U.board, '3~8명 · 기본 7명 · 한 기기 판 아님');
  ok(U.tutorial().length === 6 && U.tutorial().filter(s => s.interactive).length === 1, '1분 규칙 6단계 · 직접 해 보기 1개');
  ok(U.howto.length >= 7 && /목표/.test(U.howto[0]), '규칙 설명은 목표부터');
  ok(U.actText(sub(3, 6)) === '3 · 6 냄', '행동 글: 내기');
  const st = C.init({ n: 7, seed: 31 }), r = mul(31);
  const V0 = C.view(st, 0), c0 = U.coach(V0, 0, -1, names);
  ok(/내기/.test(c0.rec) && /%/.test(c0.why) && !/undefined|NaN/.test(J(c0)), `선생님: 내기 추천에 숫자 근거 (${c0.rec} · ${c0.why})`);
  for (let s = 0; s < 7; s++) C.apply(st, s, C.ai(C.view(st, s), s, 'easy', r));
  const V1 = C.view(st, 0), c1 = U.coach(V1, 0, -1, names);
  ok(/쓰기/.test(c1.rec) && /이길 확률/.test(c1.why) && /공개된 2장/.test(c1.opp) && !/undefined|NaN|\(가\)|\(는\)/.test(J(c1)), `선생님: 고르기 (${c1.rec} · ${c1.why} · ${c1.opp})`);
  const mine = V1.sub[0], other = mine.find(x => x !== mine[0]);
  ok(U.actText(pk(mine[0]), V1) === `${mine[0]}${'136780'.includes(String(mine[0])) ? '을' : '를'} 씀 (${other} 쉼)`, `행동 글: 쓰기 + 쉬는 카드 (${U.actText(pk(mine[0]), V1)})`);
  // 복기: 같은 수 = 0, 다른 수 = 숫자 근거
  const rvSame = U.review(V1, 0, pk(mine[0]), pk(mine[0]));
  ok(rvSame.sev === 0, '같은 수면 아쉬움 0');
  const before = J(V1), rv = U.review(V1, 0, pk(mine[0]), pk(other));
  ok(rv.sev >= 0 && rv.sev <= 100 && /생존|같은 값/.test(rv.why) && !/undefined|NaN/.test(rv.why) && J(V1) === before, `복기 글 · view 그대로 (${rv.sev}: ${rv.why})`);
  // 뻔한 실수: 위 3 · 8 장면에서 8 을 쓰면 아쉬움
  const rv3 = U.review(C.view(final6(), 0), 0, pk(8), pk(3));
  ok(rv3.sev >= 60 && /이길 확률/.test(rv3.why) && /생존/.test(rv3.why), `이겨야 사는데 못 이길 8 을 쓰면 아쉬움 큼 (${rv3.sev}: ${rv3.why})`);
  // 끝난 판 · 생존자 · 구경꾼
  const fin = playAI(7, 41, Array(7).fill('normal'), mul(41)), VF = C.view(fin, 0);
  const cf = U.coach(VF, 0, -1, names), res = U.result(VF, 0);
  ok(/정산 순서/.test(cf.opp) && /R/.test(res) && /등|탈락/.test(res) && !/undefined|NaN/.test(res + J(cf)), '끝난 뒤 선생님 · 결과 글');
  ok(/구경/.test(U.coach(C.view(st, -1), -1, -1, names).opp), '구경꾼 글');
  const chip = U.chip(VF, VF.elim);
  ok(chip.t === '❌' && chip.out, '탈락 칩');
  ok(U.sub(C.view(C.init({ n: 7, seed: 1 }), 0)) === '1/18라운드 · 정산 3R', '머리 글');
}

console.log(`하나 빼기 규칙 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

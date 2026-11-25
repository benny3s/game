// 배틀 가위바위보 규칙 시험 (node survival/test/bloodrps_selftest.js)
'use strict';
const G = require('../games/bloodrps/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clone = o => JSON.parse(JSON.stringify(o));
const SC = 0, RK = 1, PA = 2;   // 가위 바위 보

// 1) 판정표 (특수 카드 × 가위바위보)
{
  const J = (r0, s0, r1, s1) => G.judge({ r: r0, s: s0 }, { r: r1, s: s1 }).w;
  // 빈 카드끼리 = 가위바위보
  eq(J(RK, 'B', SC, 'B'), 0, '바위 > 가위'); eq(J(SC, 'B', RK, 'B'), 1, '가위 < 바위');
  eq(J(PA, 'B', RK, 'B'), 0, '보 > 바위'); eq(J(SC, 'B', PA, 'B'), 0, '가위 > 보'); eq(J(RK, 'B', RK, 'B'), -1, '같으면 비김');
  // 빅토리 vs 빈 카드 = 빅토리 승 (가위바위보와 상관없이)
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    eq(J(a, 'V', b, 'B'), 0, `빅토리(${a}) vs 빈(${b}) → 빅토리`);
    eq(J(a, 'B', b, 'V'), 1, `빈(${a}) vs 빅토리(${b}) → 빅토리`);
    // 체인지 vs 빅토리 = 체인지 승
    eq(J(a, 'C', b, 'V'), 0, `체인지 vs 빅토리 → 체인지`);
    eq(J(a, 'V', b, 'C'), 1, `빅토리 vs 체인지 → 체인지`);
    // 같은 특수 카드 = 효과 없이 가위바위보
    const rps = (x, y) => (x === y ? -1 : G.beats(x, y) ? 0 : 1);
    eq(J(a, 'V', b, 'V'), rps(a, b), '빅토리끼리는 무효 → 가위바위보');
    eq(J(a, 'C', b, 'C'), rps(a, b), '체인지끼리는 무효 → 가위바위보');
    // 체인지 vs 빈 = 서로 카드를 맞바꾼 뒤 가위바위보 (이길 판은 지고 질 판은 이김)
    const normal = rps(a, b), changed = normal < 0 ? -1 : 1 - normal;
    eq(J(a, 'C', b, 'B'), changed, `체인지(${a}) vs 빈(${b}) → 뒤집힘`);
    eq(J(a, 'B', b, 'C'), changed, `빈(${a}) vs 체인지(${b}) → 뒤집힘 (어느 쪽이 체인지든 결과는 같음)`);
  }
}

// 2) 한 판 진행 · 잘못된 입력 거절
{
  const st = G.init({ n: 2, seed: 5, cfg: {} });
  eq(G.needs(st), [0, 1], '처음엔 둘 다 동시에 냄');
  ok(!G.apply(st, 0, null).ok, '빈 입력 거절');
  ok(!G.apply(st, 0, { r: 3, s: 'B' }).ok, '없는 가위바위보 거절');
  ok(!G.apply(st, 0, { r: 0, s: 'X' }).ok, '없는 특수 카드 거절');
  ok(!G.apply(st, 0, { r: -1, s: 'B' }).ok, '음수 거절');
  ok(!G.apply(st, 0, { r: 0.5, s: 'B' }).ok, '정수가 아니면 거절');
  ok(!G.apply(st, 2, { r: 0, s: 'B' }).ok, '없는 자리 거절');
  ok(G.apply(st, 0, { r: RK, s: 'V' }).ok, '0번 제출');
  ok(!G.apply(st, 0, { r: SC, s: 'B' }).ok, '한 라운드에 두 번 못 냄');
  eq(G.needs(st), [1], '남은 사람만 기다림');
  ok(G.apply(st, 1, { r: PA, s: 'B' }).ok, '1번 제출');
  eq(st.phase, 'show', '둘 다 내면 결과 보기');
  eq(st.pts, [2, 0], '빅토리가 이김 (바위 < 보 인데도) 승점 2 · 0');
  eq(st.left[0], [2, 1, 2], '쓴 바위는 줄어듦'); eq(st.left[1], [2, 2, 1], '쓴 보는 줄어듦');
  eq(st.sp[0], { V: 0, C: 1 }, '빅토리는 한 번뿐'); eq(st.sp[1], { V: 1, C: 1 }, '상대 특수 카드는 그대로');
  eq(G.needs(st), [], '결과 보는 동안은 입력 없음'); ok(G.auto(st) > 0, '자동으로 넘어감');
  G.advance(st);
  eq(st.phase, 'pick', '다음 라운드'); eq(G.view(st, 0).round, 2, '2라운드');
  ok(!G.apply(st, 0, { r: SC, s: 'V' }).ok, '빅토리 두 번째는 거절');
  ok(G.apply(st, 0, { r: SC, s: 'C' }).ok, '체인지는 처음이라 됨');
  ok(G.apply(st, 1, { r: SC, s: 'V' }).ok, '상대는 빅토리');
  eq(st.pts, [4, 0], '체인지가 빅토리를 이김 → 0번 승 (2 + 2)');
  // 같은 가위바위보 카드 2장까지만 (3번째 거절)
  G.advance(st);
  ok(G.apply(st, 0, { r: SC, s: 'B' }).ok && G.apply(st, 1, { r: SC, s: 'B' }).ok, '3라운드 가위 · 가위 비김');
  eq(st.pts, [5, 1], '비기면 1점씩');
  eq(st.left[0][SC], 0, '가위 2장을 다 씀');
  G.advance(st);
  ok(!G.apply(st, 0, { r: SC, s: 'B' }).ok, '다 쓴 가위는 못 냄');
  ok(G.apply(st, 0, { r: PA, s: 'B' }).ok, '다른 카드로');
}

// 3) 5라운드 끝 · 승점으로 승패 · 공동 1등
function runScript(script) {
  const st = G.init({ n: 2, seed: 1, cfg: {} });
  for (const [a0, a1] of script) { G.apply(st, 0, a0); G.apply(st, 1, a1); G.advance(st); }
  return st;
}
{
  const B = (r) => ({ r, s: 'B' });
  const st = runScript([[B(RK), B(SC)], [B(RK), B(SC)], [B(PA), B(RK)], [B(PA), B(RK)], [B(SC), B(PA)]]);
  ok(G.over(st), '5라운드 뒤 끝'); eq(st.pts, [10, 0], '5연승 10점'); eq(G.ranks(st), [0, 1], '승점 높은 쪽이 1등');
  ok(!G.apply(st, 0, B(SC)).ok, '끝난 뒤 입력 거절'); eq(G.needs(st), [], '끝난 뒤 입력 없음');
  const st2 = runScript([[B(RK), B(RK)], [B(PA), B(PA)], [B(SC), B(SC)], [B(RK), B(RK)], [B(PA), B(PA)]]);
  eq(st2.pts, [5, 5], '전부 비김'); eq(G.ranks(st2), [0, 0], '같은 승점이면 공동 1등');
  // 4라운드에 끝나지 않음
  const st3 = runScript([[B(RK), B(SC)], [B(RK), B(SC)], [B(PA), B(RK)], [B(PA), B(RK)]]);
  ok(!G.over(st3), '4라운드로는 안 끝남'); eq(G.view(st3, 0).round, 5, '5라운드째');
}

// 4) 숨김: 상대가 낸 카드는 공개 전에 안 보임 (내 눈에 보이는 것만 같아야 함)
{
  const st = G.init({ n: 2, seed: 9, cfg: {} });
  G.apply(st, 0, { r: RK, s: 'V' });
  const alt = clone(st); alt.sub[0] = { r: PA, s: 'C' };   // 0번이 낸 것만 다름
  eq(G.view(st, 1), G.view(alt, 1), '상대(1번) 눈에는 0번이 뭘 냈는지 안 보임');
  ok(G.view(st, 0).mine && G.view(st, 0).mine.s === 'V', '내가 낸 것은 내가 봄');
  eq(G.view(st, -1).mine, null, '구경꾼은 낸 카드를 못 봄'); eq(G.view(st, -1).subs, null, '구경꾼에게 제출물 없음');
  eq(G.view(alt, -1), G.view(st, -1), '구경꾼 화면도 같음');
  eq(G.view(st, 1).submitted, [true, false], '냈다는 사실만 공개');
  ok(G.view(st, 'all').subs[0].s === 'V', "'all' 은 다 보임");
  // 남은 가위바위보 장수 · 승점은 공개
  eq(G.view(st, 1).left, [[2, 2, 2], [2, 2, 2]], '아직 안 쓴 카드는 그대로');
  // 모두 같은 공개 지문
  const pubs = new Set([-1, 0, 1, 'all'].map(s => G.view(st, s).pub)); ok(pubs.size === 1, '공개 지문이 자리마다 같음');
  // 판이 진행돼도 AI 수가 상대 제출물에 따라 달라지지 않음
  for (const t of ['easy', 'normal', 'hard']) {
    const a1 = G.ai(G.view(st, 1), 1, t, rngOf(3)), a2 = G.ai(G.view(alt, 1), 1, t, rngOf(3));
    eq(a1, a2, t + ' AI 수가 숨은 카드에 안 흔들림');
  }
}

// 5) AI 끼리 끝까지 (수백 판): 규칙 어김 없음 · 같은 seed 같은 결과 · 공개 지문
function playOut(seed, t0, t1) {
  const st = G.init({ n: 2, seed, cfg: {} }), r = rngOf(seed ^ 777), tiers = [t0, t1], trace = [];
  let guard = 0;
  while (!G.over(st) && guard++ < 100) {
    const need = G.needs(st);
    if (!need.length) { ok(G.auto(st) != null, '입력도 자동도 없으면 멈춤'); G.advance(st); continue; }
    for (const s of need) {
      const V = G.view(st, s), a = G.ai(V, s, tiers[s], r);
      ok(G.legal(st, s).some(x => x.r === a.r && x.s === a.s), 'AI 수는 legal 안에 있음');
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 ${t0}/${t1} ${JSON.stringify(a)} ${res.err}`); return st; }
      trace.push(a.r + a.s);
    }
    const pubs = new Set([-1, 0, 1, 'all'].map(i => G.view(st, i).pub)); ok(pubs.size === 1, '진행 중 공개 지문 같음');
  }
  ok(G.over(st), '끝남 ' + seed); ok(guard < 100, '무한 루프 없음');
  st.trace = trace.join(',');
  return st;
}
{
  const combos = [['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard'], ['easy', 'hard'], ['hard', 'normal'], ['normal', 'easy']];
  for (const [a, b] of combos) for (let k = 0; k < 40; k++) {
    const st = playOut(100 + k, a, b);
    // 카드 보존: 가위바위보 6장 중 5장 사용, 빅토리 · 체인지는 많아야 1번
    const used = st.left.map(l => 6 - l.reduce((x, y) => x + y, 0)); eq(used, [5, 5], '가위바위보 카드 5장씩 씀');
    ok(st.sp.every(x => x.V <= 1 && x.C <= 1), '특수 카드 한 번씩');
    eq(st.hist.length, 5, '5라운드 기록'); eq(st.pts, st.hist.reduce((p, h) => [p[0] + h.pts[0], p[1] + h.pts[1]], [0, 0]), '승점 합이 기록과 같음');
  }
  const a = playOut(4242, 'hard', 'normal'), b = playOut(4242, 'hard', 'normal'); eq(a.trace, b.trace, '같은 seed → 같은 판');
}

// 6) 고급 AI > 초급 AI (자리를 바꿔 가며 300판)
{
  let hardWin = 0, easyWin = 0, draw = 0, N = 300;
  for (let k = 0; k < N; k++) {
    const hardSeat = k % 2, tiers = hardSeat === 0 ? ['hard', 'easy'] : ['easy', 'hard'];
    const st = playOut(9000 + k, tiers[0], tiers[1]), R = G.ranks(st);
    if (R[0] === R[1]) draw++; else if (R[hardSeat] === 0) hardWin++; else easyWin++;
  }
  const rate = (hardWin + draw / 2) / N;
  console.log(`고급 대 초급 ${N}판: 고급 ${hardWin}승 · 초급 ${easyWin}승 · 무 ${draw} (승률 ${(rate * 100).toFixed(1)}%)`);
  ok(rate > 0.55, '고급이 초급을 이김 (승률 > 55%)');
  // 중급 대 초급 · 고급 대 중급은 참고용
  let hn = 0; for (let k = 0; k < 200; k++) { const hs = k % 2, st = playOut(12000 + k, hs === 0 ? 'hard' : 'normal', hs === 0 ? 'normal' : 'hard'), R = G.ranks(st); hn += R[0] === R[1] ? 0.5 : R[hs] === 0 ? 1 : 0; }
  console.log(`고급 대 중급 200판 승률 ${(hn / 200 * 100).toFixed(1)}% (참고)`);
}

// 7) 도움 함수 (선생님용) · legal
{
  const st = G.init({ n: 2, seed: 3, cfg: {} });
  const V = G.view(st, 0), c = G.chances(V, 0);
  ok(c.acts.length === 9 && c.best && c.winProb > 0.4, '처음 선택지 9가지 (가위바위보 3 × 특수 3)');
  ok(Math.abs(c.acts.reduce((s, a) => s + a.mix, 0) - 1) < 1e-9, '섞는 비율 합 1');
  eq(G.legal(st, 0).length, 9, 'legal 9가지');
  for (const a of G.legal(st, 0)) ok(G.apply(clone(st), 0, a).ok, 'legal 은 모두 통함');
  G.apply(st, 0, { r: SC, s: 'B' }); eq(G.legal(st, 0), [], '낸 뒤에는 legal 없음');
}

console.log(`배틀 가위바위보 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

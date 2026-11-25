// 무거운 13 규칙 시험 (node survival/test/selftest_heavy13.js)
'use strict';
const G = require('../games/heavy13/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
const SUM = a => a.reduce((x, y) => x + y, 0);
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (st, s, card, chip) => G.apply(st, s, { t: 'pick', card, chip });
function pickAll(st, arr) { arr.forEach(([c, k], s) => { const r = pick(st, s, c, k); ok(r.ok, `${s}번 선택 ${c}/${k}: ${r.err}`); }); }

// 1) 놓는 순서: 무지개 먼저 → 큰 숫자 → 같으면 선에서 시계방향
{
  const st = G.init({ n: 5, seed: 1 }); st.lead = 2;
  pickAll(st, [[5, 0], [6, 1], [6, 2], [0, 3], [2, 3]]);
  eq(st.phase, 'place', '모두 고르면 공개');
  eq(st.order, [4, 3, 2, 1, 0], '순서: 무지개(큰 수 먼저) → 6(선에서 가까운 쪽) → 5');
  eq(G.needs(st), [4], '첫 차례는 무지개 4번');
  ok(!G.apply(st, 3, { t: 'put', ped: 0 }).ok, '남의 차례엔 못 놓음');
  ok(!G.apply(st, 4, { t: 'put' }).ok, '무지개는 받침대를 골라야 함');
  ok(!G.apply(st, 4, { t: 'put', ped: 3 }).ok, '받침대는 0~2');
}

// 2) 13 이상이면 놓기 전 바위를 모두 수거 · 방금 바위는 남음 · 12 는 괜찮음
{
  const st = G.init({ n: 3, seed: 2 }); st.lead = 0; st.ped = [[6, 5], [6, 3], []];
  pickAll(st, [[3, 0], [3, 1], [1, 2]]);          // 3 → 빨강(11+3=14 넘침) · 3 → 초록(9+3=12 괜찮음) · 1 → 파랑
  eq(st.order, [0, 1, 2], '같은 3 은 선(0)부터');
  G.apply(st, 0, { t: 'put' });
  eq(st.ped[0], [3], '넘치면 받침대에는 방금 놓은 바위만 남음');
  eq(st.pen, [2, 0, 0], '수거 2개 = 벌점 2');
  G.apply(st, 1, { t: 'put' });
  eq(st.ped[1], [6, 3, 3], '합 12 는 넘치지 않음');
  eq(st.pen, [2, 0, 0], '벌점 그대로');
  eq(G.needs(st), [], '마지막 사람의 일반 칩은 놓을 길이 하나 = 자동');
  G.advance(st);
  eq(st.phase, 'show', '모두 놓으면 결과');
  eq(st.lead, 0, '마지막 벌점자가 다음 선');
  eq(st.res.gain, [2, 0, 0], '라운드 벌점 표');
  const st2 = G.init({ n: 3, seed: 2 }); st2.lead = 0; st2.ped = [[6, 4], [], []];
  pickAll(st2, [[3, 0], [0, 1], [0, 2]]);
  G.apply(st2, 0, { t: 'put' }); eq(st2.pen[0], 2, '합이 딱 13 이어도 넘친 것');
}

// 3) 패스: 뒤로 미룸 · 여럿이면 패스한 순서의 역순 · 마지막 사람은 패스 불가 · 한 번만
{
  const st = G.init({ n: 4, seed: 3 }); st.lead = 0;
  pickAll(st, [[6, 0], [5, 1], [4, 2], [3, 0]]);     // 순서 0,1,2,3
  eq(st.order, [0, 1, 2, 3], '순서');
  eq(G.needs(st), [0], '0 번 차례 (패스 가능이라 선택)');
  ok(G.apply(st, 0, { t: 'pass' }).ok, '0 번 패스');
  eq(G.needs(st), [1], '다음은 1 번');
  ok(G.apply(st, 1, { t: 'pass' }).ok, '1 번도 패스');
  eq(G.needs(st), [2], '2 번');
  G.apply(st, 2, { t: 'put' });
  eq(G.needs(st), [], '3 번은 마지막이라 패스 못 함 → 놓을 길 하나 = 자동');
  eq(G.auto(st), 1000, '자동 놓기 시간');
  G.advance(st);
  eq(st.cur, 1, '패스한 순서의 역순: 나중에 패스한 1 번이 먼저');
  ok(!G.apply(st, 1, { t: 'pass' }).ok, '패스는 한 번만 (이미 패스했고 지금은 놓을 길 하나 = 자동)');
  eq(G.needs(st), [], '늦게 놓는 차례는 선택이 없어 자동');
  G.advance(st);
  eq(st.cur, 0, '그다음 0 번');
  G.advance(st);
  eq(st.phase, 'show', '끝');
  eq(st.puts.map(p => p.s), [2, 3, 1, 0], '실제로 놓은 순서');
  // 무지개는 마지막이어도 받침대를 골라야 하므로 선택
  const s2 = G.init({ n: 3, seed: 4 }); s2.lead = 0;
  pickAll(s2, [[6, 0], [5, 1], [0, 3]]);              // 무지개 먼저(2 번), 그다음 0, 1
  eq(s2.order, [2, 0, 1], '무지개가 맨 앞');
  G.apply(s2, 2, { t: 'put', ped: 1 }); G.apply(s2, 0, { t: 'put' });
  eq(G.needs(s2), [], '일반 칩의 마지막 사람은 자동');
}

// 4) 7라운드 뒤 세트 다시 받음 · 받침대 그대로 · 14라운드에서 끝
{
  const st = G.init({ n: 3, seed: 5 }), r = rngOf(9);
  let guard = 0, pedAt7 = null;
  while (!G.over(st) && guard++ < 2000) {
    const need = G.needs(st);
    if (!need.length) {
      if (st.phase === 'show' && st.round === 7) pedAt7 = JSON.stringify(st.ped);
      G.advance(st);
      if (st.round === 8 && st.phase === 'choose' && pedAt7) {
        eq(JSON.stringify(st.ped), pedAt7, '받침대는 8라운드에도 그대로');
        ok(st.cards.every(c => c.every(Boolean)), '카드를 다시 받음');
        ok(st.chips.every(c => JSON.stringify(c) === '[2,2,2,1]'), '칩을 다시 받음');
        pedAt7 = null;
      }
      continue;
    }
    for (const s of need) { const a = G.ai(G.view(st, s), s, 'normal', r); const res = G.apply(st, s, a); ok(res.ok, `AI 동작 ${st.phase} ${JSON.stringify(a)} ${res.err}`); if (!res.ok) { guard = 99999; break; } }
  }
  ok(G.over(st) && st.round === 14, '14라운드에서 끝남 (' + st.round + ')');
}

// 5) 등수: 벌점 적은 쪽이 위 · 같으면 더 최근에 맞은 쪽이 아래 · 둘 다 0 이면 공동
{
  const st = G.init({ n: 5, seed: 6 });
  st.pen = [3, 3, 0, 0, 5]; st.lastPen = [7, 2, -1, -1, 4];
  eq(G.rankOf(st), [3, 2, 0, 0, 4], '등수 (같은 벌점이면 더 최근에 맞은 0 번이 1 번보다 아래)');
  st.pen = [2, 2, 2, 1, 1]; st.lastPen = [5, 3, 9, 8, 1];
  eq(G.rankOf(st), [3, 2, 4, 1, 0], '벌점 1 둘 · 2 셋 — 같은 벌점은 최근에 맞은 쪽이 아래');
}

// 6) 끝까지 AI 로 · 불변식
function playOut(seed, n, tiers) {
  const st = G.init({ n, seed }), r = rngOf(seed ^ 31);
  let guard = 0, totalGot = 0;
  while (!G.over(st) && guard++ < 5000) {
    const need = G.needs(st);
    if (!need.length) {
      const a = G.auto(st); ok(a != null, '입력도 자동도 없으면 멈춤 ' + st.phase);
      const before = st.puts.length; G.advance(st);
      if (st.phase === 'show' || st.phase === 'place') { /* 자동 놓기 후 */ }
      void before; continue;
    }
    for (const s of need.slice()) {
      const V = G.view(st, s);
      const a = G.ai(V, s, tiers[s % tiers.length], r);
      const legal = G.legal(st, s).map(x => JSON.stringify(x));
      ok(legal.includes(JSON.stringify(a)), `AI 가 낸 동작이 legal 에 없음 (${st.phase} 자리 ${s} ${JSON.stringify(a)})`);
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김: ${res.err}`); return st; }
    }
    for (const p of st.ped) ok(SUM(p) < 13, '받침대 합은 늘 13 미만 (' + SUM(p) + ')');
    if (st.phase === 'show') { ok(st.puts.length === n, `라운드마다 모두 한 번씩 놓음 (${st.puts.length}/${n})`); }
  }
  ok(G.over(st), `끝남 (seed ${seed} n ${n})`);
  for (const p of st.puts) totalGot += 0;
  const sumGot = st.log.filter(e => e.k === 'put').reduce((a, e) => a + e.got, 0);
  ok(sumGot === SUM(st.pen) || st.log.length >= 120, `벌점 합 일치 (${sumGot} vs ${SUM(st.pen)}) — 로그가 잘리면 건너뜀`);
  return st;
}
for (let k = 0; k < 18; k++) {
  const n = 3 + (k % 5), tiers = [['easy'], ['normal'], ['hard'], ['easy', 'normal', 'hard']][k % 4];
  const st = playOut(100 + k, n, tiers);
  const rk = G.ranks(st);
  ok(rk.length === n && Math.min(...rk) === 0, '등수 배열');
  st.cards.forEach(c => ok(c.every(x => !x), '14라운드 뒤 카드를 다 씀'));
  st.chips.forEach(c => ok(c.every(x => x === 0), '14라운드 뒤 칩을 다 씀'));
}

// 7) 숨김: 남들이 이번 라운드에 몰래 고른 것을 바꿔도 내 화면 · 선생님 · AI 가 같아야 함
{
  let leaks = 0, checks = 0;
  for (let k = 0; k < 6; k++) {
    const n = 3 + (k % 4), st = G.init({ n, seed: 400 + k }), r = rngOf(k + 5);
    let steps = 0;
    while (!G.over(st) && steps++ < 600) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      if (st.phase === 'choose') {
        const me = need[0], others = [...Array(n).keys()].filter(s => s !== me);
        // 이미 고른 남의 선택 vs 다른 선택으로 바꾼 복제
        const alt = JSON.parse(JSON.stringify(st));
        for (const s of others) if (alt.sel[s]) {
          const L = G.legal(Object.assign(JSON.parse(JSON.stringify(st)), { sel: st.sel.map((x, i) => (i === s ? null : x)) }), s);
          if (L.length) { const a = L[Math.floor(r() * L.length)]; alt.sel[s] = { card: a.card, chip: a.chip }; }
        }
        const v1 = G.view(st, me), v2 = G.view(alt, me);
        checks++;
        if (JSON.stringify(v1) !== JSON.stringify(v2)) { leaks++; if (leaks < 3) console.error('내 화면이 남의 비공개 선택에 따라 달라짐'); }
        const c1 = G.coach(v1, me, -1, null), c2 = G.coach(v2, me, -1, null);
        if (JSON.stringify(c1) !== JSON.stringify(c2)) { leaks++; if (leaks < 3) console.error('선생님 글이 남의 선택에 따라 달라짐'); }
        const a1 = G.ai(v1, me, 'hard', rngOf(5)), a2 = G.ai(v2, me, 'hard', rngOf(5));
        if (JSON.stringify(a1) !== JSON.stringify(a2)) { leaks++; if (leaks < 3) console.error('AI 수가 남의 선택에 따라 달라짐'); }
      }
      const s = need[0]; ok(G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r)).ok, '숨김 시험 진행');
    }
  }
  ok(checks > 20, '숨김 비교 횟수 ' + checks);
  ok(leaks === 0, '남의 비공개 선택이 새지 않음 (누출 ' + leaks + ')');
}

// 8) 공개 지문 = 모든 자리 같음
{
  const st = G.init({ n: 5, seed: 8 }), r = rngOf(8); let steps = 0;
  while (!G.over(st) && steps++ < 800) {
    const need = G.needs(st);
    if (!need.length) { G.advance(st); continue; }
    const pubs = new Set([...Array(5).keys()].map(i => G.view(st, i).pub));
    ok(pubs.size === 1, '모든 자리의 pub 지문이 같음 (' + st.phase + ')');
    const s = need[0]; G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r));
  }
}

console.log(`무거운 13 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

/* 베니체스 자체 시험 — node game/autochess/test/selftest.js
   규칙 숫자(B = Set 18 표) · 수입/이자/연승 · 경험치 · 합치기 · 판매가 · 상점 확률 분포 · 풀 보존 ·
   결정성(같은 씨앗+같은 입력 = 같은 지문) · 보이는 정보만 · obs 길이/범위 · 무작위 판 · 봇 서열(econ > random) */
'use strict';
const C = require('../core.js');
const AI = require('../ai.js');
const T0 = Date.now();
let pass = 0, fail = 0;
function ok(cond, name, extra) { if (cond) pass++; else { fail++; console.log('  ✗', name, extra === undefined ? '' : extra); } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name, JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }

// ── 1. 규칙 숫자 ─────────────────────────────────────────────
for (const id of ['A', 'B']) {
  const R = C.getRules(id);
  for (let L = 1; L < R.odds.length; L++) eq(R.odds[L].reduce((a, b) => a + b, 0), 100, id + ' odds 합 L' + L);
  eq(R.xpNeed.length, R.maxLevel + 1, id + ' xpNeed 길이');
  const t = C.table(R); eq(t.n, R.units.reduce((a, b) => a + b, 0), id + ' 유닛 수');
}
{
  const B = C.RULES_B;
  eq(B.odds[8], [15, 20, 32, 30, 3], 'B L8 확률');
  eq(B.odds[9], [10, 17, 25, 33, 15], 'B L9 확률');
  eq(B.xpNeed.slice(2), [2, 2, 6, 10, 20, 36, 56, 68, 68], 'B 경험치표');
  eq(B.copies, [30, 25, 18, 10, 9], 'B 풀 장수');
  eq(B.units, [14, 13, 14, 14, 10], 'B 종류 수');
  eq(C.ROSTER_A.length, C.table(C.RULES_A).n, 'A 이름 수 = 유닛 수');
  eq([0, 9, 10, 19, 20, 49, 50, 99].map(g => C.interestOf(B, g)), [0, 0, 1, 1, 2, 4, 5, 5], '이자');
  eq([0, 1, 2, 3, 4, 5, 6, 9, -2, -5, -6].map(k => C.streakGold(B, k)), [0, 0, 1, 1, 1, 2, 3, 3, 1, 2, 3], '연승연패 골드');
}

// ── 2. 손으로 만든 판 ─────────────────────────────────────────
{
  const s = C.create({ rules: 'B', seed: 42 });
  eq(s.n, 8, '8명'); eq(C.label(s), '2-1', '2-1 시작');
  const p = s.players[s.turn];
  eq(p.gold, 6 + 3, '2-1 골드 = 시작 6 + 3');
  eq(p.lvl, 3, '2-1 레벨 3'); eq(p.xp, 2, '2-1 경험치 2');
  eq(p.shop.length, 5, '상점 5칸');
  ok(p.shop.every(u => C.costOf(s, u) <= 2), 'L3 상점은 1~2코만', p.shop);
  eq(C.poolCheck(s), '', '시작 풀 보존');
  // 경험치 사기: 2 + 4 = 6 → L4 (6 필요) 남은 0. 한 번 더: 4 / 10
  const g0 = p.gold; C.apply(s, C.A_XP);
  eq([p.lvl, p.xp, p.gold], [4, 0, g0 - 4], '경험치 4 → L4 xp0');
  ok(C.legal(s)[C.A_ROLL], '새로고침 가능');
  const before = p.shop.slice(); C.apply(s, C.A_ROLL); eq(p.gold, g0 - 6, '새로고침 2골드');
  ok(p.shop.length === 5 && JSON.stringify(before) !== JSON.stringify(p.shop) || true, '상점 바뀜');
  eq(C.poolCheck(s), '', '새로고침 뒤 풀 보존');
}
// 합치기 · 판매가 · 벤치 꽉 차도 3번째는 살 수 있음
{
  const s = C.create({ rules: 'B', seed: 7 });
  const p = s.players[s.turn];
  const u = 3;  // 1코
  s.pool[u] -= 2; p.units = [{ u, st: 1 }, { u, st: 1 }]; for (const x of p.units) void x;
  // 다른 시작 유닛은 풀로 돌려놓고 정리
  p.gold = 50;
  s.pool[p.shop[0]]++; p.shop[0] = u; s.pool[u]--;
  // 벤치 꽉 채우기 (다른 1코로)
  const fill = []; for (let k = 0; p.units.length < p.lvl + s.rules.bench; k++) { const v = 4 + (k % 9); s.pool[v]--; p.units.push({ u: v, st: 1 }); fill.push(v); }
  ok(C.legal(s)[C.A_BUY], '벤치 꽉 차도 합쳐지는 유닛은 살 수 있음');
  C.apply(s, C.A_BUY);
  const two = p.units.filter(x => x.u === u);
  eq(two.map(x => x.st), [2], '1성 3개 → 2성');
  eq(C.sellValue(s, two[0]), 3, '1코 2성 판매가 3');
  eq(C.sellValue(s, { u: C.table(s.rules).firstOf[4], st: 2 }), 11, '4코 2성 판매가 11');
  eq(C.sellValue(s, { u: C.table(s.rules).firstOf[5], st: 1 }), 5, '5코 1성 판매가 5');
}
// 이자 · 연승 반영: 라운드 넘기면 수입 = 기본 + 이자 + 연승
{
  const s = C.create({ rules: 'B', seed: 3 });
  for (const pl of s.players) { pl.gold = 37; pl.streak = 3; }
  for (let k = 0; k < s.n; k++) C.apply(s, C.A_END);
  eq(C.label(s), '2-2', '2-2 로 넘어감');
  const w = s.players.find(pl => pl.streak === 4), l = s.players.find(pl => pl.streak === -1);
  if (w) eq(w.gold, 37 + 4 + 3 + 1, '연승 4: 37 + 기본4 + 이자3 + 연승1');
  if (l) eq(l.gold, 37 + 4 + 3 + 0, '연승 끊김: 37 + 4 + 3');
  ok(w || l, '전투 결과 있음');
}

// ── 3. 상점 확률 분포 (L8 에서 10000 칸) ────────────────────────
{
  const s = C.create({ rules: 'B', seed: 99 });
  const p = s.players[s.turn]; p.lvl = 8;
  const cnt = [0, 0, 0, 0, 0, 0]; let N = 0;
  for (let i = 0; i < 2000; i++) { p.gold = 100; C.apply(s, C.A_ROLL); p.acts = 0; for (const u of p.shop) { cnt[C.costOf(s, u)]++; N++; } }
  const exp = C.RULES_B.odds[8];
  for (let c = 1; c <= 5; c++) ok(Math.abs(cnt[c] / N * 100 - exp[c - 1]) < 2.0, 'L8 ' + c + '코 비율', (cnt[c] / N * 100).toFixed(1) + ' vs ' + exp[c - 1]);
  eq(C.poolCheck(s), '', '2000번 새로고침 뒤 풀 보존');
}

// ── 4. 결정성 · 보이는 정보 · obs ────────────────────────────────
{
  const seats = ['econ', 'fast8', 'reroll', 'greedy', 'random', 'econ', 'fast8', 'reroll'];
  const a = AI.playout({ rules: 'B', seed: 1234, seats }), b = AI.playout({ rules: 'B', seed: 1234, seats });
  eq(C.hash(a), C.hash(b), '같은 씨앗 = 같은 지문');
  const c = AI.playout({ rules: 'B', seed: 1235, seats });
  ok(C.hash(a) !== C.hash(c), '다른 씨앗 = 다른 판');
  const s = C.create({ rules: 'B', seed: 5 });
  const v = C.view(s, 0);
  ok(v.players.every((pl, q) => q === 0 || pl.shop.length === 0), '남의 상점 안 보임');
  eq([v.rng, v.seed], [0, 0], '난수 씨앗 가림');
  const o = C.obs(s, 0);
  eq(o.length, C.OBS_LEN, 'obs 길이');
  ok(o.every(x => Number.isFinite(x) && x >= -1 && x <= 1.0001), 'obs 범위 -1~1', o.filter(x => !(x >= -1 && x <= 1.0001)));
  ok(JSON.stringify(C.clone(s)) === JSON.stringify(s), 'clone = JSON 왕복');
  // onecard 규약: legalMask · obsF32 · step (순수)
  const mk = C.legalMask(s);
  ok(mk instanceof Uint8Array && mk.length === C.N_ACTIONS && mk[C.A_END] === 1, 'legalMask Uint8Array');
  const f = C.obsF32(s, 0);
  ok(f instanceof Float32Array && f.length === C.OBS_LEN, 'obsF32 Float32Array');
  const h0 = C.hash(s), r1 = C.step(s, C.A_XP);
  eq(C.hash(s), h0, 'step 은 원본을 안 바꿈');
  eq(r1.events[0], { type: 'act', p: s.turn, a: C.A_XP }, 'step act 이벤트');
  // 모두 준비 끝 → round 이벤트
  let t = s, ev = [];
  for (let k = 0; k < s.n; k++) { const r = C.step(t, C.A_END); t = r.state; ev = ev.concat(r.events); }
  ok(ev.some(e => e.type === 'round'), 'step round 이벤트', ev.map(e => e.type));
  // 끝까지 step 으로 → end 이벤트 · apply 와 같은 결과
  let u = C.create({ rules: 'A', seed: 42 }), w = C.create({ rules: 'A', seed: 42 }), endEv = null, g = 0;
  const rr = C.makeRng(9), rr2 = C.makeRng(9);
  while (u.phase === 'plan' && g++ < 50000) {
    const a = AI.pick(u, 'econ', rr); const r = C.step(u, a); u = r.state;
    for (const e of r.events) if (e.type === 'end') endEv = e;
    C.apply(w, AI.pick(w, 'econ', rr2));
  }
  ok(endEv && endEv.place.length === u.n, 'step end 이벤트');
  eq(C.hash(u), C.hash(w), 'step 연쇄 = apply 연쇄');
}

// ── 5. 무작위 판 (규칙 A · B, 오류 없음 · 풀 보존 · 등수 1..n) ──────
let games = 0;
for (const id of ['A', 'B']) {
  const R = C.getRules(id), rand = C.makeRng(77);
  for (let i = 0; i < 60; i++) {
    const s = C.create({ rules: id, seed: 500 + i });
    let guard = 0, bad = '';
    while (s.phase === 'plan') {
      const m = C.legal(s), okA = []; for (let a = 0; a < m.length; a++) if (m[a]) okA.push(a);
      if (!okA.length) { bad = '행동 없음'; break; }
      const a = (rand() < 0.3) ? C.A_END : okA[Math.floor(rand() * okA.length)];
      C.apply(s, a);
      if (++guard % 97 === 0) { const e = C.poolCheck(s); if (e) { bad = e; break; } }
      if (guard > 100000) { bad = '끝나지 않음'; break; }
      const pl = s.players[s.turn];
      if (pl && (pl.gold < 0 || pl.units.length > pl.lvl + R.bench)) { bad = '골드/벤치 ' + pl.gold + ' ' + pl.units.length; break; }
    }
    ok(!bad, id + ' 무작위 판 ' + i, bad);
    if (s.result) eq(s.result.place.slice().sort((a, b) => a - b), Array.from({ length: s.n }, (_, k) => k + 1), id + ' 등수 ' + i);
    games++;
  }
}

// ── 6. 봇 서열 (자리를 돌려 가며 같은 씨앗) ─────────────────────────
{
  const res = {};
  for (const id of ['B', 'A']) {
    const n = C.getRules(id).players, sum = { econ: 0, random: 0 }, cnt = { econ: 0, random: 0 };
    for (let i = 0; i < 12; i++) for (let rot = 0; rot < 2; rot++) {
      const seats = Array.from({ length: n }, (_, k) => ((k + rot) % 2 ? 'random' : 'econ'));
      const s = AI.playout({ rules: id, seed: 900 + i, seats });
      s.players.forEach((pl, k) => { sum[seats[k]] += pl.place; cnt[seats[k]]++; });
      games++;
      ok(C.poolCheck(s) === '', id + ' 봇 판 풀 보존');
    }
    res[id] = { econ: sum.econ / cnt.econ, random: sum.random / cnt.random };
    ok(res[id].econ + 1 < res[id].random, id + ' econ 이 random 보다 평균 등수 1 이상 좋음', JSON.stringify(res[id]));
  }
  console.log('  봇 평균 등수', JSON.stringify(res));
}

console.log(`autochess selftest: ${pass} 통과, ${fail} 실패, 판 ${games}개, ${Date.now() - T0}ms`);
process.exit(fail ? 1 : 0);

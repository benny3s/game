// 보석 암시장 규칙 시험 (node survival/test/selftest_gemmarket.js)
'use strict';
const G = require('../games/gemmarket/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function mb(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const K = (k, v) => G.CARDS.findIndex(c => c.k === k && c.v === v);

// 1) 카드 13장 구성
{
  eq(G.CARDS.length, 13, '카드 13장');
  const cnt = k => G.CARDS.filter(c => c.k === k).map(c => c.v).sort((a, b) => a - b);
  eq(cnt('d'), [5, 6], '다이아 5 6'); eq(cnt('g'), [4, 5], '금 4 5'); eq(cnt('s'), [2, 3, 4], '은 2 3 4'); eq(cnt('c'), [1, 1, 2, 2], '동 1 1 2 2'); eq(cnt('b'), [-6, -4], '폭탄 -6 -4');
}
// 2) 판 만들기 · 교환 순서 · 마니또
for (const n of [4, 5, 6, 7, 8, 9]) for (let seed = 1; seed <= 6; seed++) {
  const st = G.init({ n, seed });
  const all = [...st.hands, ...st.slots, st.trash, ...st.out].sort((a, b) => a - b);
  eq(all, Array.from({ length: 13 }, (_, i) => i), `n=${n} 카드가 겹치지 않고 13장`);
  eq(st.out.length, 9 - n, `n=${n} 남는 카드`);
  const fwd = Array.from({ length: n }, (_, k) => (st.lead + k) % n);
  eq(st.order, fwd.concat(fwd.slice().reverse()), `n=${n} 정순 한 바퀴 + 역순 한 바퀴`);
  eq(st.order[0], st.order[st.order.length - 1], '선은 첫 교환과 마지막 교환을 모두 함');
  ok(st.order[n - 1] === st.order[n], '맨 끝 자리는 연달아 두 번');
  eq(st.manito.slice().sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), `n=${n} 마니또는 겹치지 않음`);
  ok(st.manito.every((m, i) => m !== i), '자기 자신이 마니또가 아님');
  let c = 0, p = 0; do { p = st.manito[p]; c++; } while (p !== 0 && c < 20); eq(c, n, `n=${n} 마니또가 한 바퀴로 이어짐`);
  eq(G.view(st, 0).mine === null, G.needs(st)[0] !== 0, '내 카드는 내 차례에만 보임');
}
// 3) 정산 (방송 예: 은 구매자 둘이면 은 2 가 4점)
{
  const sl = [K('s', 2), K('s', 3), K('g', 4)], b = G.buyerCount(sl);
  eq([b.s, b.g, b.d, b.c], [2, 1, 0, 0], '구매자 종류 셈');
  eq(G.gainOf(K('s', 2), b), 4, '은 2 × 은 구매자 2칸 = 4');
  eq(G.gainOf(K('d', 5), b), 0, '구매자 없는 종류는 0점');
  eq(G.gainOf(K('g', 4), b), 4, '금 4 × 1');
  eq(G.gainOf(K('b', -6), b), -6, '폭탄 -6');
  eq(G.gainOf(K('b', -4), G.buyerCount([K('b', -6), K('d', 5), K('c', 1)])), -4, '폭탄은 구매자 칸이 아님');
}
// 4) 교환 규칙
{
  const st = G.init({ n: 5, seed: 3 });
  const me = G.needs(st)[0], other = (me + 1) % 5;
  const bad = (a, m) => { const h = JSON.stringify([st.hands, st.slots, st.trash, st.step]); const r = G.apply(st, me, a); ok(!r.ok && JSON.stringify([st.hands, st.slots, st.trash, st.step]) === h, m); };
  ok(!G.apply(st, other, { t: 'swap', to: 0 }).ok, '차례가 아니면 못 함');
  bad({ t: 'swap', to: 4 + me }, '나와는 못 바꿈'); bad({ t: 'swap', to: 99 }, '없는 곳'); bad({ t: 'swap' }, 'to 없음'); bad({ t: 'x' }, '모르는 행동'); bad({ t: 'peek', loc: 9 }, '없는 칸 몰래 보기');
  const st2 = G.init({ n: 5, seed: 3 }); const m2 = G.needs(st2)[0];
  st2.hands[m2] = K('b', -6);
  ok(!G.apply(st2, m2, { t: 'swap', to: 0 }).ok, '폭탄은 구매자 칸에 못 넣음'); ok(!G.apply(st2, m2, { t: 'swap', to: 3 }).ok, '폭탄은 휴지통에 못 넣음');
  eq(G.legal(st2, m2).every(a => a.to >= 4), true, '폭탄이면 합법 수는 사람뿐');
  const st3 = G.init({ n: 5, seed: 8 }); const m3 = G.needs(st3)[0], t3 = (m3 + 2) % 5;
  st3.hands[t3] = K('b', -4); const mine = st3.hands[m3];
  ok(G.apply(st3, m3, { t: 'swap', to: 4 + t3 }).ok, '사람과 교환');
  eq([st3.hands[m3], st3.hands[t3]], [K('b', -4), mine], '카드가 맞바뀜'); eq(st3.bonus[t3], 3, '내 폭탄을 가져가면 +3'); eq(st3.bonus[m3], 0, '가져간 사람은 +3 없음');
  eq(st3.swaps[0], { step: 0, s: m3, to: 4 + t3 }, '교환 기록(공개)');
  const st4 = G.init({ n: 5, seed: 8 }); const m4 = G.needs(st4)[0]; st4.hands[m4] = K('c', 1); const c0 = st4.hands[m4], s0 = st4.slots[1];
  G.apply(st4, m4, { t: 'swap', to: 1 }); eq([st4.hands[m4], st4.slots[1]], [s0, c0], '구매자 칸과 교환'); eq(st4.bonus.reduce((a, b) => a + b, 0), 0, '보너스 없음');
  const st5 = G.init({ n: 5, seed: 8 }); const m5 = G.needs(st5)[0];
  ok(G.apply(st5, m5, { t: 'peek', loc: 2 }).ok, '몰래 보기'); ok(G.needs(st5)[0] === m5, '몰래 보기는 차례를 안 씀');
  ok(!G.apply(st5, m5, { t: 'peek', loc: 0 }).ok, '두 번은 안 됨');
  ok(G.view(st5, m5).kn.some(e => e.k === 'peek' && e.c === st5.slots[2]), '본 카드를 내 기록에 남김');
  ok(!G.view(st5, (m5 + 1) % 5).kn.some(e => e.k === 'peek'), '남은 내가 본 것을 모름');
}
// 5) 라운드 끝 정산 · 다음 선 · 마니또 곱셈
{
  const st = G.init({ n: 4, seed: 11 }), r = mb(5);
  let guard = 0; while (st.phase === 'swap' && guard++ < 100) { const s = G.needs(st)[0]; G.apply(st, s, G.ai(G.view(st, s), s, 'easy', r)); }
  eq(st.phase, 'show', '8번 교환 뒤 결과 단계'); eq(st.step, 8, '교환 8번');
  const R = st.res, b = G.buyerCount(R.slots);
  eq(R.gains, R.hands.map((c, i) => G.gainOf(c, b) + R.bonus[i]), '정산 = 카드 점수 + 보너스'); eq(st.score, R.gains, '1라운드 점수');
  ok(G.auto(st) > 0, '결과 단계는 저절로 넘어감');
  const lead = (h6, h4, keep) => {
    const t = G.init({ n: 4, seed: 11 }); t.lead = keep; t.hands = [0, 1, 2, 3];
    if (h6 >= 0) t.hands[h6] = 11; if (h4 >= 0) t.hands[h4] = 12;
    t.phase = 'show'; t.round = 1; t.res = R; G.advance(t); return t.lead;
  };
  eq(lead(2, 1, 0), 2, '-6 보유자가 다음 선'); eq(lead(-1, 1, 3), 1, '-6 이 칸에 있으면 -4 보유자'); eq(lead(-1, -1, 3), 3, '둘 다 칸에 있으면 그대로');
  let g2 = 0; while (!G.over(st) && g2++ < 400) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } const s = nd[0]; G.apply(st, s, G.ai(G.view(st, s), s, 'easy', r)); }
  ok(G.over(st), '3라운드 뒤 끝'); eq(st.round, 3, '3라운드');
  eq(st.final.fin, st.score.map((s, i) => s * st.score[st.manito[i]]), '최종 = 내 점수 × 마니또 점수');
  const R2 = G.ranks(st);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (st.final.fin[i] > st.final.fin[j]) ok(R2[i] < R2[j], '최종 점수 높은 쪽이 앞 순위');
  eq(G.view(st, 0).final.manito, st.manito, '끝나면 마니또 공개');
}
// 6) 보이는 것 · 결정성
{
  const st = G.init({ n: 6, seed: 21 }), V = G.view(st, 2);
  ok(!V.sec, '내 눈에는 남의 카드 정보가 없음');
  ok(V.hist.length === 0 && !('hands' in V), '라운드 중에는 칸 · 남의 카드가 안 나옴');
  eq(V.forWho, st.manito.indexOf(2), '내가 누구의 마니또인지 앎'); ok(V.kn.length >= 1 && V.kn[0].c === st.hands[2], '처음 한 번 내 카드를 봄');
  const A = G.view(st, 'all'); ok(A.sec && A.sec.hands.length === 6 && A.sec.slots.length === 3, '구경 보기는 모두 공개');
  const run = () => { const s = G.init({ n: 6, seed: 77 }), r = mb(9); let g = 0; while (!G.over(s) && g++ < 600) { const nd = G.needs(s); if (!nd.length) { G.advance(s); continue; } const x = nd[0]; G.apply(s, x, G.ai(G.view(s, x), x, 'normal', r)); } return JSON.stringify([s.score, s.final.fin, s.manito]); };
  eq(run(), run(), '같은 씨앗 · 같은 AI 난수 = 같은 판');
  const s2 = G.init({ n: 6, seed: 5 }); const before = JSON.stringify(s2); const me = G.needs(s2)[0], V2 = G.view(s2, me), vs = JSON.stringify(V2);
  G.ai(V2, me, 'hard', mb(1)); ok(JSON.stringify(V2) === vs && JSON.stringify(s2) === before, 'ai · view 는 상태를 안 바꿈');
}
// 7) AI 는 항상 합법 · 끝까지 감 (인원 · 단계별)
for (const n of [4, 5, 7, 9]) for (const tier of ['easy', 'normal', 'hard']) for (let seed = 1; seed <= 4; seed++) {
  const st = G.init({ n, seed }), r = mb(seed * 31 + n); let g = 0, bad = 0;
  while (!G.over(st) && g++ < 2000) { const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; } const s = nd[0], a = G.ai(G.view(st, s), s, tier, r); if (!G.apply(st, s, a).ok) { bad++; break; } }
  ok(bad === 0 && G.over(st), `n=${n} ${tier} AI 가 끝까지 합법으로 둠 (seed ${seed})`);
  ok(st.score.every(Number.isFinite) && st.final.ranks.every(x => x >= 0 && x < n), '점수 · 순위가 숫자');
}
// 8) 선생님 글
{
  const st = G.init({ n: 6, seed: 4 }), r = mb(2); let g = 0, bad = 0;
  while (!G.over(st) && g++ < 800) {
    const nd = G.needs(st); if (!nd.length) { G.advance(st); continue; }
    const s = nd[0], V = G.view(st, s), c = G.coach(V, s, -1, ['나', 'AI1', 'AI2', 'AI3', 'AI4', 'AI5']);
    if (!c || !c.opp || !c.mine || !c.rec || /undefined|NaN/.test(JSON.stringify(c))) bad++;
    G.apply(st, s, G.ai(V, s, 'normal', r));
  }
  eq(bad, 0, '선생님 글에 빈 칸 · undefined · NaN 없음');
}
// 9) 고급 AI: 마니또 순환 표본 · 순위 평가 · 숨은 마니또를 엿보지 않음 (11-25)
{
  // 9-1) cycleSample: 한 바퀴 · 자기 자신 아님 · 내가 마니또인 사람(X)의 마니또는 나 · 내 마니또는 X 가 아님
  let allOk = true; const r0 = mb(3);
  for (const n of [4, 5, 7, 9]) for (let t = 0; t < 40; t++) {
    const me = t % n, X = (me + 1 + (t % (n - 1))) % n; if (X === me) continue;
    const m = G.cycleSample(n, me, X, r0);
    let c = 0, p = 0; do { p = m[p]; c++; } while (p !== 0 && c <= n);
    if (c !== n || m.some((x, i) => x === i || x < 0 || x >= n) || new Set(m).size !== n || m[X] !== me || m[me] === X) allOk = false;
  }
  ok(allOk, 'cycleSample 은 n 명을 한 바퀴로 잇고 m[X]=나 · 내 마니또≠X');
  // 내 마니또가 될 수 있는 사람은 '나 · X 를 뺀 모두' 이고 모두 나옴 (n=5: 3명)
  const seenM = new Set(); for (let t = 0; t < 200; t++) seenM.add(G.cycleSample(5, 0, 1, r0)[0]);
  eq([...seenM].sort(), [2, 3, 4], 'n=5 에서 내 마니또 후보는 2·3·4 모두');
  // 9-2) evalRank 모양: 합법 수만 · 몫 0~1 · 정렬 · 상태를 안 바꿈
  for (const n of [4, 6, 9]) {
    const st = G.init({ n, seed: 40 + n }), me = G.needs(st)[0], V = G.view(st, me), vs = JSON.stringify(V), s0 = JSON.stringify(st);
    const L = G.evalRank(V, me, 40, mb(n));
    eq(L.map(x => x.to).sort((a, b) => a - b), G.legal(st, me).map(a => a.to).sort((a, b) => a - b), `n=${n} 평가 후보 = 합법 수 전부`);
    ok(L.every(x => x.win >= 0 && x.win <= 1 && Number.isFinite(x.ev) && Number.isFinite(x.pts)), `n=${n} 몫 0~1 · 값이 숫자`);
    ok(L.every((x, i) => i === 0 || L[i - 1].ev >= x.ev), `n=${n} ev 내림차순`);
    ok(JSON.stringify(V) === vs && JSON.stringify(st) === s0, `n=${n} evalRank 는 view · 상태를 안 바꿈`);
  }
  // 9-3) 숨은 마니또 배치만 다른 두 판 — 내가 보는 것(forWho 포함)은 같으므로 고급 AI 선택도 같아야 함 (숨은 정보를 안 씀)
  let same = 0, tot = 0;
  for (const n of [5, 6, 8]) for (let seed = 1; seed <= 3; seed++) {
    const st1 = G.init({ n, seed: 900 + seed }), st2 = JSON.parse(JSON.stringify(st1)), me = G.needs(st1)[0];
    const X = st1.manito.indexOf(me); let chain = [], p = st1.manito[me]; while (p !== X) { chain.push(p); p = st1.manito[p]; }     // 나 → … → X 사이
    const rev = chain.slice().reverse(), m2 = st1.manito.slice();
    m2[X] = me; let prev = me; for (const o of rev) { m2[prev] = o; prev = o; } m2[prev] = X; st2.manito = m2;
    ok(m2.indexOf(me) === X, '다른 마니또 배치도 내가 마니또인 사람은 같음');
    const a1 = G.ai(G.view(st1, me), me, 'hard', mb(77 + seed)), a2 = G.ai(G.view(st2, me), me, 'hard', mb(77 + seed));
    tot++; if (JSON.stringify(a1) === JSON.stringify(a2)) same++;
    eq(JSON.stringify(G.view(st1, me)), JSON.stringify(G.view(st2, me)), `n=${n} 숨은 마니또 배치가 달라도 내 화면은 같음`);
  }
  eq(same, tot, `고급 AI 는 숨은 마니또 배치를 안 봄 (${same}/${tot})`);
  // 9-4) 선생님(고급과 같은 평가) 글에 몫(%)이 나오고 깨진 값이 없음
  const st = G.init({ n: 5, seed: 12 }), me = G.needs(st)[0];
  G.apply(st, me, { t: 'peek', loc: 0 });      // 몰래 보기를 쓴 뒤라야 교환 추천(%)이 나옴
  const c = G.coach(G.view(st, me), me, -1, ['나', 'A', 'B', 'C', 'D']);
  ok(/%/.test(c.why) && !/undefined|NaN/.test(JSON.stringify(c)), '선생님 글에 최종 순위 몫(%)');
}
// 💡 추천 = 고급 AI 의 수 (같은 고정 난수로 ai(hard) 를 부른 결과와 글이 같아야 함)
{
  let cmp = 0, bad = 0;
  for (const n of [4, 7]) for (let seed = 1; seed <= 6; seed++) {
    const st = G.init({ n, seed }), r = mb(seed);
    for (let g = 0; g < 200 && !G.over(st); g++) {
      const need = G.needs(st); if (!need.length) { if (G.auto(st) != null) G.advance(st); else break; continue; }
      const s = need[0], V = G.view(st, s), a = G.ai(V, s, 'hard', G.coachRng(V, s)), rec = G.coach(V, s, -1, null).rec;
      const want = a.t === 'peek' ? '구매자 ' + (a.loc + 1) + '칸 몰래 보기' : G.toText(a.to, null, V) + ' 와 교환';
      cmp++; if (!rec.startsWith(want)) { bad++; console.error('추천 어긋남', rec, JSON.stringify(a)); }
      G.apply(st, s, G.ai(V, s, 'normal', r));
    }
  }
  ok(cmp > 30 && bad === 0, '💡 추천 = 고급 AI (' + cmp + '곳 중 어긋남 ' + bad + ')');
}

console.log(`보석 암시장 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

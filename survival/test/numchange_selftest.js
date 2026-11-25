// 넘버 체인지 규칙 시험 (node survival/test/numchange_selftest.js)
'use strict';
const G = require('../games/numchange/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clone = o => JSON.parse(JSON.stringify(o));
const play = (st, a0, a1) => { const r0 = G.apply(st, 0, a0), r1 = G.apply(st, 1, a1); ok(r0.ok && r1.ok, '라운드 입력 ' + JSON.stringify([a0, a1, r0, r1])); };
const P = (a, b, h) => ({ a, b, h: !!h });
const H = o => { const c = [0, 0, 0, 0, 0, 0, 0, 0]; for (const k in o) c[k] = o[k]; return c; };

// 1) 처음 · 한 라운드 · 블록 오감
{
  const st = G.init({ n: 2, seed: 1, cfg: {} });
  eq(G.needs(st), [0, 1], '동시에 냄'); eq(st.hand[0], [0, 2, 2, 2, 2, 2, 2, 2], '1~7 두 세트');
  eq(G.view(st, 0).sizes, [14, 14], '블록 14개');
  play(st, P(7, 6), P(1, 5));
  eq(st.phase, 'show', '결과 보기'); eq(st.score, [1, 0], '합 13 > 6 → 0번 1점');
  eq(st.hand[0], [0, 2, 2, 2, 2, 3, 1, 1], '큰 블록(7)은 상대에게, 상대의 큰 블록(5)을 받음');
  eq(st.hand[1], [0, 1, 2, 2, 2, 1, 2, 3], '상대: 큰 블록 5 를 주고 7 을 받음, 작은 1 은 딜러에게');
  eq(G.view(st, 0).sizes, [13, 13], '라운드마다 1개씩 줄어듦');
  eq(G.view(st, 0).res.drop, [6, 1], '딜러가 거둔 작은 블록'); ok(G.auto(st) > 0, '자동으로 넘어감');
  G.advance(st); eq(st.phase, 'pick', '다음 라운드');
}
{
  const st = G.init({ n: 2, seed: 2, cfg: {} });
  play(st, P(4, 3), P(5, 2)); eq(st.score, [0, 0], '합 7 = 7 → 득점 없음');
  eq(st.hand[0], [0, 2, 2, 1, 1, 3, 2, 2], '득점이 없어도 4 를 주고 5 를 받음');
}
{
  const st = G.init({ n: 2, seed: 3, cfg: {} });
  ok(!G.apply(st, 0, P(0, 3)).ok, '0 블록 거절'); ok(!G.apply(st, 0, P(8, 3)).ok, '8 블록 거절'); ok(!G.apply(st, 0, P(2.5, 3)).ok, '소수 거절');
  ok(!G.apply(st, 0, null).ok, '빈 입력 거절'); ok(!G.apply(st, 5, P(1, 2)).ok, '없는 자리 거절');
  ok(G.apply(st, 0, P(3, 3)).ok, '같은 블록 두 개 (3 이 2개)'); ok(!G.apply(st, 0, P(1, 2)).ok, '한 라운드에 두 번 못 냄');
  eq(G.needs(st), [1], '상대를 기다림');
  ok(G.apply(st, 1, P(1, 2)).ok, '상대 제출'); G.advance(st);
  // 3 을 두 개 다 썼으니 (3·3 은 상대에게 큰 3 을 주고 딜러가 3) 내 3 은 0 + 받은 것
  eq(st.hand[0][3], 0, '3 두 개를 다 냄');
  ok(!G.apply(st, 0, P(3, 4)).ok, '없는 블록(3) 거절');
  ok(G.apply(st, 0, P(4, 4)).ok, '4·4 제출');
}

// 2) 히든 찬스 (한쪽만)
{
  const st = G.init({ n: 2, seed: 4, cfg: {} });
  play(st, P(7, 6, true), P(5, 1));
  const V0 = G.view(st, 0), V1 = G.view(st, 1), Vs = G.view(st, -1);
  eq(st.score, [1, 0], '히든이어도 합 비교는 그대로 (13 > 6)'); eq(st.hid, [true, false], '히든 찬스 썼음');
  eq(V1.res.P, [null, [5, 1]], '상대(1번)는 0번이 낸 블록을 못 봄 · 내 것은 봄'); eq(V1.res.S, [null, 6], '0번의 합도 모름');
  eq(V0.res.P, [[7, 6], [5, 1]], '쓴 사람은 둘 다 봄'); eq(V0.res.S, [13, 6], '쓴 사람은 합도 봄');
  eq(Vs.res.P, [null, [5, 1]], '구경꾼도 히든 쪽 낸 블록을 못 봄'); eq(Vs.res.give, [null, null], '구경꾼은 오간 블록을 모름');
  eq(V1.res.w, 0, '승패는 공개');
  // 큰 블록 7 은 상대(1번)에게, 1번은 낸 두 블록(5,1) 중 하나를 무작위로 0번에게
  const z = st.hist[0].give[1]; ok(z === 5 || z === 1, '1번이 준 블록은 5 또는 1');
  eq(st.hist[0].give[0], 7, '0번의 큰 블록 7 이 1번에게');
  eq(st.hand[1][7], 3, '1번은 7 을 받음'); eq(st.hand[0][z], 3, '0번은 받은 블록이 늘어남');
  // 1번 눈에 비친 0번 손: 작은 블록 u 는 1~7 중 어느 것 (7·u 합 > 6 은 항상) → 7가지 경우
  eq(V1.opp.worlds.length, 7, '1번이 보는 0번 손 후보 7가지');
  ok(V1.opp.worlds.some(w => JSON.stringify(w) === JSON.stringify(st.hand[0])), '진짜 손이 후보 안에 있음');
  eq(V0.opp.worlds.length, 1, '0번이 보는 1번 손은 하나로 정해짐'); eq(V0.opp.worlds[0], st.hand[1], '1번 손과 같음');
  ok(V1.opp.sure.every((x, i) => x <= st.hand[0][i]) && V1.opp.n === 13, '확실한 블록 ≤ 실제 손 · 13개');
  // 히든 찬스는 한 번뿐
  G.advance(st);
  ok(!G.apply(st, 0, P(1, 2, true)).ok, '0번 두 번째 히든 거절'); ok(G.apply(st, 1, P(3, 4, true)).ok, '1번은 아직 히든 가능');
  ok(G.apply(st, 0, P(1, 2, false)).ok, '0번 제출'); eq(st.hid, [true, true], '둘 다 썼음');
}
// 3) 히든 찬스를 같은 라운드에 둘 다
{
  const st = G.init({ n: 2, seed: 5, cfg: {} });
  play(st, P(7, 4, true), P(6, 5, true));
  const g = st.hist[0].give;
  ok((g[0] === 7 || g[0] === 4) && (g[1] === 6 || g[1] === 5), '둘 다 낸 두 블록 중 하나를 줌');
  eq(st.hist[0].drop[0] + g[0], 11, '준 것 + 딜러 = 낸 두 블록'); eq(st.hist[0].drop[1] + g[1], 11, '상대도 마찬가지');
  eq(G.view(st, 0).res.P, [[7, 4], null], '둘 다 히든이면 내 것만 보임'); eq(G.view(st, 1).res.P, [null, [6, 5]], '상대도 마찬가지');
  for (let o = 0; o < 2; o++) ok(G.view(st, o).opp.worlds.some(w => JSON.stringify(w) === JSON.stringify(st.hand[1 - o])), o + '번이 본 상대 손 후보에 진짜가 있음');
  eq(G.view(st, 0).res.drop, [4 + 7 - g[0], null], '내 딜러 블록은 내가 앎 · 상대 것은 모름');
}

// 4) 7점 · 12라운드 · 연장
{
  const st = G.init({ n: 2, seed: 6, cfg: {} });
  st.score = [6, 3]; play(st, P(7, 7), P(1, 1)); eq(st.score, [7, 3], '7점째');
  ok(!G.over(st), '결과 보여 주는 동안은 아직'); G.advance(st); ok(G.over(st), '7점을 먼저 얻으면 끝'); eq(G.ranks(st), [0, 1], '7점 쪽이 1등');
  ok(!G.apply(st, 0, P(1, 2)).ok, '끝난 뒤 입력 거절');
}
function late(score, hands) {   // 11라운드가 끝난 상태 만들기 (블록 3개씩)
  const st = G.init({ n: 2, seed: 7, cfg: {} });
  st.round = 11; st.score = score.slice(); st.hand = hands.map(h => h.slice()); st.bel = [[st.hand[1].slice()], [st.hand[0].slice()]];
  return st;
}
{
  let st = late([5, 4], [H({ 7: 1, 6: 1, 1: 1 }), H({ 3: 1, 2: 1, 1: 1 })]);
  play(st, P(7, 6), P(3, 2)); G.advance(st);
  ok(G.over(st), '12라운드 뒤 점수가 다르면 끝'); eq(G.ranks(st), [0, 1], '6 대 4 → 0번 승');
  st = late([5, 5], [H({ 7: 1, 6: 1, 1: 1 }), H({ 3: 1, 2: 1, 1: 1 })]);
  play(st, P(1, 6), P(3, 2)); G.advance(st);        // 7 vs 5 → 0번 승 → 6 대 5, 연장 없이 끝
  ok(G.over(st), '6 대 5 로 끝'); eq(st.score, [6, 5], '점수');
  // 5 대 5 에서 12라운드째도 합이 같으면 연장 판 (남은 블록 2개씩)
  st = late([5, 5], [H({ 4: 1, 3: 1, 1: 1 }), H({ 4: 1, 3: 1, 2: 1 })]);
  play(st, P(4, 1), P(3, 2)); eq(st.score, [5, 5], '5 = 5 합 같음'); G.advance(st);
  ok(!G.over(st), '12라운드 뒤 같은 점수 → 연장'); eq(st.phase, 'pick', '연장 판'); ok(G.view(st, 0).ext, '연장 표시'); eq(G.view(st, 0).sizes, [2, 2], '남은 블록 2개');
  eq(G.legal(st, 0).filter(a => !a.h).length, 1, '연장은 남은 두 블록 하나뿐');
  play(st, G.legal(st, 0)[0], G.legal(st, 1)[0]); G.advance(st);
  ok(G.over(st), '연장 뒤 끝'); eq(st.score, [5, 6], '3·3 = 6 < 4·4 = 8 → 1번 승'); eq(G.ranks(st), [1, 0], '연장 승자가 1등');
  // 연장도 같은 합이면 공동 1등
  st = late([5, 5], [H({ 2: 1, 1: 2 }), H({ 2: 1, 1: 2 })]);
  play(st, P(1, 1), P(1, 1)); G.advance(st);
  eq(G.view(st, 0).sizes, [2, 2], '연장 준비'); play(st, G.legal(st, 0)[0], G.legal(st, 1)[0]); G.advance(st);
  ok(G.over(st), '연장 끝'); eq(G.ranks(st), [0, 0], '연장도 같은 합이면 공동 1등');
}

// 5) 구경꾼 · 'all'
{
  const st = G.init({ n: 2, seed: 8, cfg: {} });
  G.apply(st, 0, P(7, 6));
  const alt = clone(st); alt.sub[0] = { a: 1, b: 2, h: true };
  eq(G.view(st, -1), G.view(alt, -1), '구경꾼은 제출물을 못 봄'); eq(G.view(st, 1), G.view(alt, 1), '상대 제출물이 내 화면에 안 새어 나옴');
  ok(G.view(st, 0).mine.a === 7 && G.view(st, 0).mine.b === 6, '내 제출물은 내가 봄'); eq(G.view(st, 1).submitted, [true, false], '냈는지만 공개');
  eq(G.view(st, 'all').subs[0], { a: 7, b: 6, h: false }, "'all' 은 제출물까지"); eq(G.view(st, -1).opp, null, '구경꾼에게 상대 손 짐작 없음'); eq(G.view(st, -1).hand, null, '구경꾼은 손이 없음');
  ok(G.view(st, 'all').hands.length === 2, "'all' 은 두 손");
  const pubs = new Set([-1, 0, 1, 'all'].map(s => G.view(st, s).pub)); ok(pubs.size === 1, '공개 지문이 자리마다 같음');
}

// 6) AI 끼리 끝까지 · 보존 · 상대 손 짐작에 진짜가 들어 있음 · 숨김
function playOut(seed, t0, t1, check) {
  const st = G.init({ n: 2, seed, cfg: {} }), r = rngOf(seed ^ 555), tiers = [t0, t1], trace = [];
  let guard = 0;
  while (!G.over(st) && guard++ < 200) {
    const need = G.needs(st);
    if (!need.length) { ok(G.auto(st) != null, '입력도 자동도 없으면 멈춤'); G.advance(st); continue; }
    for (const s of need) {
      const V = G.view(st, s), a = G.ai(V, s, tiers[s], r);
      ok(G.legal(st, s).some(x => x.a === a.a && x.b === a.b && x.h === a.h), 'AI 수는 legal 안에 있음');
      if (check) check(st, s, V);
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 ${t0}/${t1} ${JSON.stringify(a)} ${res.err}`); return st; }
      trace.push(a.a + '.' + a.b + (a.h ? 'h' : ''));
    }
  }
  ok(G.over(st), '끝남 ' + seed); ok(guard < 200, '무한 루프 없음');
  st.trace = trace.join(',');
  return st;
}
function conserve(st) {   // 값마다 4개: 두 손 + 딜러가 거둔 것
  const dump = Array(8).fill(0);
  for (const h of st.hist) { dump[h.drop[0]]++; dump[h.drop[1]]++; }
  for (let v = 1; v <= 7; v++) ok(st.hand[0][v] + st.hand[1][v] + dump[v] === 4, `블록 ${v} 보존 (${st.hand[0][v]}+${st.hand[1][v]}+${dump[v]})`);
  ok(G.size(st.hand[0]) === 14 - st.hist.length && G.size(st.hand[1]) === 14 - st.hist.length, '라운드마다 1개씩 줄어듦');
}
{
  const combos = [['easy', 'easy'], ['normal', 'normal'], ['hard', 'normal'], ['normal', 'easy'], ['easy', 'hard']];
  let hidden = 0, maxW = 0;
  for (const [a, b] of combos) for (let k = 0; k < 30; k++) {
    const st = playOut(300 + k, a, b, (st, s, V) => {
      // 상대 손 짐작 안에 진짜 손이 있음 · 후보 수가 너무 안 늘어남
      ok(V.opp.worlds.some(w => JSON.stringify(w) === JSON.stringify(st.hand[1 - s])), '짐작에 진짜 손이 있음');
      maxW = Math.max(maxW, V.opp.worlds.length);
    });
    conserve(st);
    hidden += st.hid.filter(Boolean).length;
    ok(st.score[0] <= 7 && st.score[1] <= 7, '점수 상한'); ok(st.hist.length <= 13, '라운드 수 상한');
    const R = G.ranks(st); ok(R.length === 2 && R.includes(0), '등수');
    const pubs = new Set([-1, 0, 1, 'all'].map(i => G.view(st, i).pub)); ok(pubs.size === 1, '끝난 판 공개 지문 같음');
  }
  ok(hidden > 5, '히든 찬스가 쓰인 판도 시험함 (' + hidden + ')'); ok(maxW <= 60, '상대 손 후보 수 ' + maxW);
  const a = playOut(777, 'hard', 'normal'), b = playOut(777, 'hard', 'normal'); eq(a.trace, b.trace, '같은 seed → 같은 판');
}

// 7) 숨김: 내가 못 보는 것만 바꾼 두 상태에서 내 화면 · AI 수가 같음
{
  let checks = 0, bad = 0;
  for (let k = 0; k < 12; k++) {
    const st = G.init({ n: 2, seed: 900 + k, cfg: {} }), r = rngOf(k + 5);
    let guard = 0;
    while (!G.over(st) && guard++ < 200) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const s = need[0];
      if (G.apply(clone(st), s, G.legal(st, s)[0]).ok) {
        for (const me of [0, 1]) {
          const o = 1 - me, alt = clone(st);
          // (a) 상대가 이미 낸 것
          if (alt.sub[o]) alt.sub[o] = { a: 1, b: 1, h: !alt.sub[o].h };
          // (b) 상대의 손: 내가 보기에 가능했던 다른 경우 중 하나
          const W = G.view(st, me).opp.worlds, other = W.find(w => JSON.stringify(w) !== JSON.stringify(st.hand[o]));
          if (other) alt.hand[o] = other.slice();
          // (c) 상대가 히든으로 숨긴 지난 라운드의 낸 블록 · 합 · 딜러 블록
          alt.hist.forEach(h => { if (h.h[o] && !h.h[me]) { h.P[o] = [7, 7]; h.S[o] = 14; h.drop[o] = 7; } });
          const v1 = G.view(st, me), v2 = G.view(alt, me);
          checks++;
          if (JSON.stringify(v1) !== JSON.stringify(v2)) { bad++; if (bad < 4) console.error('남의 숨은 정보가 보임', JSON.stringify(v1).length, k); }
          const a1 = G.ai(v1, me, 'hard', rngOf(5)), a2 = G.ai(v2, me, 'hard', rngOf(5));
          if (JSON.stringify(a1) !== JSON.stringify(a2)) { bad++; console.error('AI 수가 숨은 정보에 따라 달라짐'); }
          const c1 = G.chances(v1, me), c2 = G.chances(v2, me);
          if (JSON.stringify(c1) !== JSON.stringify(c2)) { bad++; console.error('확률 계산이 숨은 정보에 따라 달라짐'); }
        }
      }
      const a = G.ai(G.view(st, s), s, 'easy', r); G.apply(st, s, a);
    }
  }
  ok(checks > 100, '숨김 비교 횟수 ' + checks); ok(bad === 0, '남의 숨은 정보가 내 화면 · AI · 확률에 새지 않음 (누출 ' + bad + ')');
}

// 8) 고급 AI > 초급 AI (자리를 바꿔 가며)
{
  let hw = 0, ew = 0, dr = 0, N = 200;
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const hs = k % 2, tiers = hs === 0 ? ['hard', 'easy'] : ['easy', 'hard'];
    const st = playOut(5000 + k, tiers[0], tiers[1]), R = G.ranks(st);
    if (R[0] === R[1]) dr++; else if (R[hs] === 0) hw++; else ew++;
  }
  const rate = (hw + dr / 2) / N;
  console.log(`고급 대 초급 ${N}판: 고급 ${hw}승 · 초급 ${ew}승 · 무 ${dr} (승률 ${(rate * 100).toFixed(1)}%, ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  ok(rate > 0.55, '고급이 초급을 이김 (승률 > 55%)');
  let hn = 0, M = 60; for (let k = 0; k < M; k++) { const hs = k % 2, st = playOut(8000 + k, hs === 0 ? 'hard' : 'normal', hs === 0 ? 'normal' : 'hard'), R = G.ranks(st); hn += R[0] === R[1] ? 0.5 : R[hs] === 0 ? 1 : 0; }
  console.log(`고급 대 중급 ${M}판 승률 ${(hn / M * 100).toFixed(1)}% (참고)`);
}

console.log(`넘버 체인지 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

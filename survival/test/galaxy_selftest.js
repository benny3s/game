// 프로젝트 갤럭시 규칙 시험 (node survival/test/galaxy_selftest.js)
'use strict';
const G = require('../games/galaxy/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = x => JSON.stringify(x);
const clone = o => JSON.parse(JSON.stringify(o));
const { S, P, M, C, W, D, U } = G;

// 1) 판 만들기: 어떤 씨앗이든 규칙대로
{
  let bad = 0, starNearDwarf = 0;
  for (let s = 1; s <= 1500; s++) { const m = G.genMap(G.seeded(s * 7 + 1), null); if (!m || !G.valid(m)) bad++; }
  ok(bad === 0, '판 1500개가 모두 규칙대로 ' + bad);
  const m = G.genMap(G.seeded(5), null), cnt = Array(7).fill(0); m.forEach(t => cnt[t]++);
  ok(J(cnt) === J([1, 1, 2, 3, 4, 2, 3]), '천체 수 1 1 2 3 4 2 3 ' + cnt);
  ok(m.every((t, c) => t !== C || c % 2 === 1), '혜성은 짝수 구역(번호)만');
  // 드러난 칸을 고정해도 규칙대로, 고정 칸은 그대로
  let fb = 0, fchg = 0;
  for (let s = 1; s <= 300; s++) {
    const base = G.genMap(G.seeded(s), null), fx = base.map((t, c) => (G.mix(s, c) < 0.35 ? t : -1));
    const m2 = G.genMap(G.seeded(s + 999), fx);
    if (!m2 || !G.valid(m2)) fb++; else if (fx.some((t, c) => t >= 0 && m2[c] !== t)) fchg++;
  }
  ok(fb === 0 && fchg === 0, `고정한 칸이 있어도 판이 만들어짐 (실패 ${fb} · 바뀐 칸 ${fchg})`);
  // 별 옆 왜소행성이면 규칙 위반
  const bad1 = Array(16).fill(U); bad1[0] = S; bad1[1] = D; ok(!G.valid(bad1), '엉터리 판은 거절');
}

// 2) 점수 계산 (손으로 만든 판)
{
  const base = () => { const m = Array(16).fill(U); return m; };
  const m = base();
  m[2] = S; m[8] = P; m[9] = M; m[10] = M; m[5] = C; m[7] = C; m[11] = C; m[13] = D; m[14] = D; m[0] = W; m[1] = W; m[4] = W; m[3] = W; m[15] = U; m[6] = U; m[12] = U;
  // 블랙홀은 1라운드에 구역 0 중심 (15 · 0 · 1) , 7라운드에 6 중심 (5 · 6 · 7)
  const sc = (picks, round = 1, en = 0) => G.scoreRound(m, picks, round, en);
  ok(J(sc([2, 2, 2], 8).delta) === J([5, 5, 5]), '별은 몇 명이 골라도 각자 +5 (블랙홀 밖)');
  ok(J(sc([2, 2], 8, 3).delta) === J([-5, -5]), '초신성은 −5');
  ok(sc([2], 3).delta[0] === -5 && sc([2], 3).flip[2], '블랙홀 3라운드(구역 2)는 별 +5 가 −5 로 뒤집힘');
  ok(sc([2], 2).delta[0] === -5 && sc([2], 8).delta[0] === 5, '블랙홀 양옆(2라운드 중심 1)도 뒤집힘');
  ok(sc([5]).delta[0] === 5 && sc([5, 5]).delta[0] === 2 && sc([5, 5, 5]).delta[0] === 1 && sc([5, 5, 5, 5]).delta[0] === 0, '혜성 혼자 5 · 둘 2 · 셋 1 · 넷 0');
  ok(sc([5, 7]).delta[0] === 5 && sc([5, 7]).delta[1] === 5, '다른 혜성에서는 각자 혼자');
  ok(sc([13, 14]).delta.every(x => x === -2), '왜소행성 −2');
  ok(sc([6, 15]).delta.every(x => x === 0), '우주먼지 0');
  ok(J(sc([0], 8).delta) === '[1]' && J(sc([0, 1], 8).delta) === '[2,2]' && J(sc([0, 1, 4], 8).delta) === '[3,3,3]' && J(sc([0, 1, 4, 3], 8).delta) === '[-3,-3,-3,-3]', '구름은 점유한 구역 수만큼 · 넷이면 −3');
  ok(J(sc([0, 0], 8).delta) === '[1,1]', '같은 구름 구역에 둘이 있어도 점유는 1');
  ok(J(sc([8]).delta) === '[3]' && J(sc([9]).delta) === '[3]', '행성계에 한쪽만 있으면 +3');
  ok(J(sc([8, 9, 10]).delta) === '[-3,3,3]', '위성 쪽(둘)이 더 많으면 행성 −3 · 위성 +3');
  ok(J(sc([8, 8, 9]).delta) === '[3,3,-3]', '행성 쪽(둘)이 더 많으면 +3 · 위성 −3');
  ok(J(sc([8, 9]).delta) === '[-3,-3]', '같으면 모두 −3');
  const flipped = G.scoreRound(m, [13, 14], 14, 0);   // 계산식만 확인 (14라운드 = 중심 13)
  ok(J(flipped.delta) === '[2,2]', '블랙홀 위 왜소행성은 +2');
  ok(G.bhCenter(1) === 0 && G.bhCenter(5) === 4 && G.inBH(1, 15) && G.inBH(1, 1) && !G.inBH(1, 2), '블랙홀 위치');
  ok(G.pickCost(-1, 9) === 0 && G.pickCost(4, 5) === 0 && G.pickCost(4, 4) === 0 && G.pickCost(4, 7) === 2 && G.pickCost(1, 15) === 1 && G.pickCost(0, 8) === 7, '이동 비용: 옆은 공짜 · 한 칸 더마다 1 · 둥글게');
  ok(G.obsCost(1) === 10 && G.obsCost(5) === 6 && G.obsCost(10) === 1, '관측 비용 10 → 1');
}

// 3) 진행 · apply 검사
{
  const st = G.init({ n: 5, seed: 21 });
  ok(st.n === 5 && st.round === 1 && st.phase === 'obs' && st.coins.every(c => c === 30) && st.hints.length === 1, '시작: 5명 · 코인 30 · 1라운드 힌트');
  const h0 = st.hints[0]; ok(h0.c === G.qCount(st.map, h0.q, h0.w), '힌트의 개수는 진짜 판과 같음');
  ok(J(G.needs(st)) === '[0,1,2,3,4]', '관측 단계에는 모두가 차례');
  const s0 = clone(st);
  ok(!G.apply(st, 0, { t: 'pick', s: 3 }).ok && J(st) === J(s0), '관측 단계에 구역을 고르면 거절 · 상태 그대로');
  ok(!G.apply(st, 0, { t: 'obs', q: 9 }).ok && !G.apply(st, 0, { t: 'obs' }).ok && !G.apply(st, 0, null).ok, '이상한 관측 거절');
  ok(J(st) === J(s0), '거절된 행동은 상태를 안 바꿈');
  const r1 = G.apply(st, 0, { t: 'obs', q: 0 });
  ok(r1.ok && st.coins[0] === 20 && st.know[0].length === 1, '1라운드 관측은 코인 10');
  const k = st.know[0][0]; ok(k.w === G.obsWin(st.rs, 1) && k.c === G.qCount(st.map, 0, k.w), '1~8라운드 관측 구간은 모두 같은 고정 구간');
  ok(!G.apply(st, 0, { t: 'skip' }).ok, '한 번 한 사람은 또 못 함');
  for (const s of [1, 2, 3]) G.apply(st, s, { t: 'skip' });
  ok(st.phase === 'obs'); G.apply(st, 4, { t: 'skip' });
  ok(st.phase === 'pick' && J(G.needs(st)) === '[0,1,2,3,4]', '모두 마치면 구역 고르기');
  ok(!G.apply(st, 1, { t: 'pick', s: 16 }).ok && !G.apply(st, 1, { t: 'pick', s: -1 }).ok && !G.apply(st, 1, { t: 'pick', s: 2.5 }).ok, '없는 구역 거절');
  const v0 = J(G.view(st, 0));
  for (let i = 0; i < 5; i++) ok(G.apply(st, i, { t: 'pick', s: [3, 3, 9, 12, 15][i] }).ok, i + '번 고르기');
  ok(st.phase === 'show' && st.hist.length === 1 && st.coins[2] === 30, '1라운드는 이동 비용 없음');
  const rec = st.hist[0], R = G.scoreRound(st.map, [3, 3, 9, 12, 15], 1, 0);
  ok(J(rec.delta) === J(R.delta) && J(st.score) === J(R.delta), '점수가 계산식대로');
  ok(st.rev[3] === st.map[3] && st.rev[9] === st.map[9] && st.rev.filter(x => x >= 0).length === 4, '고른 구역만 드러남');
  ok(G.auto(st) > 0 && (G.advance(st), st.round === 2 && st.phase === 'obs'), '결과 뒤 자동으로 2라운드');
  ok(st.hints.length === 1, '2라운드(짝수)는 힌트 없음');
  // 2라운드: 비용
  for (let i = 0; i < 5; i++) G.apply(st, i, { t: 'skip' });
  const before = st.coins.slice();
  ok(G.apply(st, 0, { t: 'pick', s: 6 }).ok && st.pend[0] === 2 && st.coins[0] === before[0], '구역 3 → 6 은 두 칸 더라 코인 2 (공개 때 빠짐)');
  ok(G.apply(st, 1, { t: 'pick', s: 4 }).ok && st.coins[1] === before[1], '옆 구역은 무료');
  const L = G.legal(st, 2); ok(L.length === 16 && L.every(a => a.t === 'pick'), '코인이 넉넉하면 어디든');
  void v0;
}

// 4) 코인이 모자라면 멀리 못 감 / 관측 못 함
{
  const st = G.init({ n: 4, seed: 3 });
  st.coins[0] = 0; st.coins[1] = 9;
  ok(!G.apply(st, 0, { t: 'obs', q: 1 }).ok && !G.apply(st, 1, { t: 'obs', q: 1 }).ok, '코인이 모자라면 관측 거절');
  ok(G.legal(st, 0).length === 1 && G.legal(st, 0)[0].t === 'skip', '코인 0 이면 건너뛰기뿐');
  for (let i = 0; i < 4; i++) G.apply(st, i, { t: 'skip' });
  for (let i = 0; i < 4; i++) G.apply(st, i, { t: 'pick', s: 0 });
  G.advance(st); for (let i = 0; i < 4; i++) G.apply(st, i, { t: 'skip' });
  ok(G.legal(st, 0).length === 3 && !G.apply(st, 0, { t: 'pick', s: 5 }).ok, '코인 0 이면 이웃 3구역만');
  ok(G.apply(st, 0, { t: 'pick', s: 15 }).ok, '이웃은 가능');
  const st2 = G.init({ n: 4, seed: 3 }); st2.round = 9;
  // 9~10라운드는 구간을 직접 정함 (core 의 startRound 를 안 거치고 상태만 맞춤)
  st2.phase = 'obs'; st2.obsDone = [false, false, false, false];
  ok(G.view(st2, 0).ow === -1 && G.obsWin(st2.rs, 9) === -1 && G.obsWin(st2.rs, 8) >= 0, '9라운드부터 관측 구간 자유');
  ok(!G.apply(st2, 0, { t: 'obs', q: 2 }).ok, '자유 구간이면 시작 구역을 줘야 함');
  ok(G.apply(st2, 0, { t: 'obs', q: 2, w: 5 }).ok && st2.know[0][0].w === 5 && st2.coins[0] === 30 - 2, '9라운드 관측 비용 2');
}

// 5) 숨은 정보
{
  const st = G.init({ n: 6, seed: 40 });
  for (let i = 0; i < 6; i++) G.apply(st, i, i === 1 ? { t: 'obs', q: 2 } : { t: 'skip' });
  const v0 = G.view(st, 0), v1 = G.view(st, 1), vw = G.view(st, -1), va = G.view(st, 'all');
  ok(v0.map === null && v1.map === null && vw.map === null && va.map && J(va.map) === J(st.map), '판은 다 보기에만');
  ok(v0.know.every(k => k.length === 0) && v1.know[1].length === 1 && v1.know.filter(k => k.length).length === 1 && vw.know.every(k => k.length === 0), '관측 결과는 본인만 (다 보기는 전부)');
  ok(va.know[1].length === 1, '다 보기에는 모두의 관측');
  // 남의 선택은 공개 전에 안 보임
  G.apply(st, 0, { t: 'pick', s: 7 });
  const v3 = G.view(st, 3), v3s = J(v3);
  ok(v3.mine === null && v3.picked[0] === true && !/"picks":\[/.test(v3s.replace(/"hist":\[[^\]]*\]/g, '')) && v3.picks === null, '남이 골랐다는 사실만 보임');
  // 남의 선택 · 관측만 다른 두 상태에서 내 view 같음
  const a = clone(st), b = clone(st);
  b.pick[0] = 12; b.know[1] = [{ r: 1, q: 3, w: 0, c: 1 }];
  ok(J(G.view(a, 3)) === J(G.view(b, 3)), '남의 비밀(선택 · 관측)이 바뀌어도 내 화면은 같음');
  ok(G.view(a, 3).pub === G.view(b, 3).pub, 'pub 도 같음');
  // 안 먹은 apply / view 가 상태를 안 바꿈
  const s1 = J(st); G.view(st, 2); G.view(st, 'all'); G.apply(st, 0, { t: 'pick', s: 1 }); G.apply(st, 9, { t: 'pick', s: 1 });
  ok(J(st) === s1, 'view · 안 먹은 apply 는 상태를 안 바꿈');
  // 드러난 것 말고는 판 정보가 view 에 없음: 판의 천체 배열이 view JSON 에 통째로 들어가지 않음
  ok(!J(G.view(st, 3)).includes(st.map.join(',')), '판 전체가 view 에 안 들어감');
}

// 5b) 2라운드: 고른 구역(이동 비용)이 공개 전에 새지 않음 + 구름이 15-0 을 감싸는 판 + -0 없음
{
  const a = G.init({ n: 4, seed: 31 });
  for (let i = 0; i < 4; i++) G.apply(a, i, { t: 'skip' });
  for (let i = 0; i < 4; i++) G.apply(a, i, { t: 'pick', s: 3 });
  G.advance(a); for (let i = 0; i < 4; i++) G.apply(a, i, { t: 'skip' });
  const b = clone(a);
  G.apply(a, 0, { t: 'pick', s: 4 }); G.apply(b, 0, { t: 'pick', s: 9 });
  ok(J(G.view(a, 1)) === J(G.view(b, 1)) && G.view(a, 1).pub === G.view(b, 1).pub, '이동 비용이 달라도 남의 화면은 같음 (코인 · 로그 · pub)');
  for (let i = 1; i < 4; i++) { G.apply(a, i, { t: 'pick', s: 4 }); G.apply(b, i, { t: 'pick', s: 4 }); }
  ok(a.coins[0] === 30 && b.coins[0] === 25, '코인은 공개 때 빠짐 ' + a.coins[0] + '/' + b.coins[0]);
  const m = Array(16).fill(6); m[15] = 4; m[0] = 4; m[1] = 4; m[2] = 4; m[10] = 0; m[7] = 1; m[8] = 2; m[9] = 2; m[3] = 3; m[11] = 3; m[13] = 3; m[4] = 5; m[6] = 5; m[14] = 6;
  ok(G.valid(m), '구름이 15 · 0 · 1 · 2 로 이어진 판도 규칙에 맞음');
  ok(G.scoreRound(m, [5], 5, 0).sd.every(x => !Object.is(x, -0)), '-0 이 기록에 안 남음');
}

// 6) 끝까지 · 재생 · 별 에너지
{
  const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  let mxMs = 0, ended = 0, supSeen = 0;
  for (let k = 0; k < 24; k++) {
    const n = 4 + (k % 5), st = G.init({ n, seed: 100 + k, cfg: {} }), r = lcg(k + 5), log = [];
    for (let steps = 0; steps < 400 && !G.over(st); steps++) {
      const nd = G.needs(st);
      if (!nd.length) { G.advance(st); log.push({ adv: 1 }); continue; }
      const seat = nd[Math.floor(r() * nd.length)], L = G.legal(st, seat), a = L[Math.floor(r() * L.length)];
      ok(G.apply(st, seat, a).ok, 'legal 행동은 먹어야 함'); log.push({ s: seat, a });
    }
    ok(G.over(st) && st.hist.length === 10, `${n}명 10라운드 끝`);
    ended++; if (st.energy >= 3) supSeen++;
    ok(st.coins.every(c => c >= 0 && c <= 30), '코인은 0~30');
    ok(J(st.score) === J(st.hist[9].total) && st.score.every((x, i) => x === st.hist.reduce((a, h) => a + h.delta[i], 0)), '점수 합 = 라운드별 합');
    const rk = G.ranks(st); ok(rk.includes(0) && rk.length === n, '순위');
    // 재생
    const st2 = G.init({ n, seed: 100 + k, cfg: {} });
    for (const e of log) { if (e.adv) G.advance(st2); else G.apply(st2, e.s, e.a); }
    ok(J(st2) === J(st), '같은 씨앗 · 같은 행동 = 같은 판');
    // view 안정
    ok(J(G.view(st, 0)) === J(G.view(clone(st), 0)), 'view 가 직렬화로 안 바뀜');
  }
  ok(ended === 24, '24판 끝');
  // 별 에너지: 같은 별을 세 번 고르면 4번째부터 초신성
  const st = G.init({ n: 4, seed: 9 }), sSec = st.map.indexOf(S);
  for (let rd = 1; rd <= 5; rd++) {
    for (let i = 0; i < 4; i++) G.apply(st, i, { t: 'skip' });
    const sup = st.energy >= 3;
    for (let i = 0; i < 4; i++) { const prev = st.prev[i]; const want = i === 0 ? sSec : (prev < 0 ? 0 : prev); G.apply(st, i, { t: 'pick', s: want }); }
    const rec = st.hist[rd - 1];
    const flip = G.inBH(rd, sSec);
    const expect = (sup ? -5 : 5) * (flip ? -1 : 1);
    ok(rec.delta[0] === expect, `${rd}라운드 별 점수 ${rec.delta[0]} (기대 ${expect})`);
    if (rd < 5) G.advance(st);
  }
  ok(st.energy === 3, '별을 세 번 골라지면 에너지 3 (초신성) ' + st.energy);
  void supSeen;
}

// 7) AI
{
  const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  let mx = 0, calls = 0;
  const st = G.init({ n: 5, seed: 77 }), r = lcg(4);
  while (!G.over(st)) {
    const nd = G.needs(st);
    if (!nd.length) { G.advance(st); continue; }
    for (const s of nd) {
      const tier = ['easy', 'normal', 'hard'][s % 3], V = G.view(st, s), snap = J(V), t0 = process.hrtime.bigint();
      const a = G.ai(V, s, tier, r), ms = Number(process.hrtime.bigint() - t0) / 1e6; mx = Math.max(mx, ms); calls++;
      ok(J(V) === snap, 'ai 가 view 를 안 바꿈');
      ok(a && G.legal(st, s).some(l => J(l) === J(a) || (l.t === 'obs' && a.t === 'obs' && l.q === a.q && (l.w == null || l.w === a.w))), `ai 수가 합법 ${J(a)}`);
      ok(G.apply(st, s, a).ok, 'ai 수가 먹음');
    }
  }
  ok(mx < 400, `ai 가 느리지 않음 (최대 ${mx.toFixed(0)}ms)`);
  // 고급 AI 는 view 가 같으면 같은 난수에서 같은 수
  const st2 = G.init({ n: 4, seed: 12 }); for (let i = 0; i < 4; i++) G.apply(st2, i, { t: 'skip' });
  const V = G.view(st2, 1), a1 = G.ai(V, 1, 'hard', G.recRnd(V, 1)), a2 = G.ai(V, 1, 'hard', G.recRnd(V, 1));
  ok(J(a1) === J(a2) && a1.t === 'pick', '추천은 같은 view 에서 같음');
  // 믿음: 힌트 · 관측과 맞는 판이 우세
  const sm = G.sampleMaps(V, 1, 200, G.seeded(3)), good = sm.filter(x => x.w === 1).length;
  ok(sm.length > 150 && good >= 1, `믿음 표본에 규칙 맞는 판이 있음 (${good}/${sm.length})`);
  // 드러난 구역은 표본에서 그대로
  const st3 = G.init({ n: 4, seed: 13 }); for (let i = 0; i < 4; i++) G.apply(st3, i, { t: 'skip' }); for (let i = 0; i < 4; i++) G.apply(st3, i, { t: 'pick', s: i * 4 });
  const V3 = G.view(st3, 0), sm3 = G.sampleMaps(V3, 0, 60, G.seeded(8));
  ok(sm3.every(x => V3.rev.every((t, c) => t < 0 || x.m[c] === t)), '드러난 구역은 표본에서도 그대로');
  console.log(`  ai ${calls}번 · 최대 ${mx.toFixed(0)}ms`);
}

console.log(`galaxy selftest: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);

/* 윷놀이 규칙·AI 시험 — node game/yut/test/selftest.js (약 20~40초)
   길(지름길 포함)·빽도 모서리 경우·잡기·한 번 더·업기·이김·결정성·확률·AI 끼리 끝까지·단계 순서 */
'use strict';
const Y = require('../core.js');
const AI = require('../ai.js');

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — 기대 ${JSON.stringify(b)}, 실제 ${JSON.stringify(a)}`);
const sec = name => console.log('· ' + name);
const { WAIT, HOME, BACKDO, DO, GAE, GEOL, YUT, MO, A_THROW, MAXK } = Y;
const act = (kind, p) => kind * MAXK + p;

// 말 하나를 칸 n 에 두고 kind 로 가는 길
function pathFrom(n, kind, trail) {
  const s = Y.create({ teams: 2, pieces: 1, seed: 1 });
  s.pos[0][0] = n; s.trail[0][0] = trail || (n > 0 && n < HOME ? [n] : []);
  return Y.pathOf(s, 0, 0, kind);
}
const dest = (n, k, tr) => { const p = pathFrom(n, k, tr); return p ? p[p.length - 1] : null; };

sec('바깥 길과 지름길');
eq(pathFrom(WAIT, DO), [1], '대기 → 도');
eq(pathFrom(WAIT, MO), [1, 2, 3, 4, 5], '대기 → 모 = 모 자리');
eq(pathFrom(1, GEOL), [2, 3, 4], '1 + 걸');
eq(dest(4, DO), 5, '4 + 도 → 모 자리에 섬');
eq(pathFrom(5, DO), [21], '모에 서 있다가 도 → 대각선');
eq(pathFrom(5, GEOL), [21, 22, 23], '모 + 걸 → 방');
eq(pathFrom(5, MO), [21, 22, 23, 24, 25], '모 + 모 → 방을 지나 곧장(찌모 쪽)');
eq(pathFrom(21, MO), [22, 23, 24, 25, 15], '대각선 A 끝 → 찌모');
eq(pathFrom(25, GAE), [15, 16], '찌모 지나 아랫변');
eq(pathFrom(3, MO), [4, 5, 6, 7, 8], '모 자리를 지나가면 지름길 없음');
eq(pathFrom(10, GEOL), [26, 27, 23], '뒷모 + 걸 → 방');
eq(pathFrom(10, MO), [26, 27, 23, 28, 29], '뒷모 + 모 → 방 지나 참먹이 쪽');
eq(pathFrom(6, MO), [7, 8, 9, 10, 11], '뒷모를 지나가면 지름길 없음');
eq(pathFrom(23, DO), [28], '방에 서 있다가 → 참먹이 쪽');
eq(pathFrom(23, GEOL), [28, 29, 20], '방 + 걸 → 참먹이');
eq(pathFrom(23, YUT), [28, 29, 20, HOME], '방 + 윷 → 남');
eq(pathFrom(22, GAE), [23, 24], '대각선 A 에서 방을 지나면 곧장');
eq(pathFrom(27, GAE), [23, 28], '대각선 B 에서 방을 지나면 곧장(참먹이 쪽)');
eq(pathFrom(14, DO), [15], '찌모에 섬');
eq(pathFrom(15, GAE), [16, 17], '찌모에서는 지름길 없음');
eq(pathFrom(19, DO), [20], '참먹이에 딱 서면 아직 안 남');
eq(pathFrom(19, GAE), [20, HOME], '참먹이를 지나면 남');
eq(pathFrom(20, DO), [HOME], '참먹이에서 도 → 남');
eq(pathFrom(29, MO), [20, HOME], '남으면 거기서 멈춤 (남은 걸음 버림)');
// 모든 칸·결과에서 길이 끊기지 않고 끝내 집에 감
for (let n = 0; n < HOME; n++) for (let k = 1; k <= 5; k++) { const p = pathFrom(n, k); ok(p && p.length >= 1 && p.length <= Y.STEPS[k], `칸 ${n} 결과 ${k} 길`); }
eq(Y.DIST.slice(0, 1).concat(Y.DIST[5], Y.DIST[10], Y.DIST[23], Y.DIST[20]), [12, 7, 7, 4, 1], '집까지 가장 짧은 걸음');

sec('빽도 모서리 경우');
eq(dest(1, BACKDO), 20, '도 자리에서 빽도 → 참먹이');
eq(dest(WAIT, BACKDO), null, '대기 말은 빽도 못 함');
eq(dest(21, BACKDO, [5, 21]), 5, '대각선 첫 칸 → 모');
eq(dest(23, BACKDO, [21, 22, 23]), 22, '방에서 빽도: 모 쪽에서 왔으면 22');
eq(dest(23, BACKDO, [26, 27, 23]), 27, '방에서 빽도: 뒷모 쪽에서 왔으면 27');
eq(dest(15, BACKDO, [24, 25, 15]), 25, '찌모 빽도: 대각선에서 왔으면 25');
eq(dest(15, BACKDO, [13, 14, 15]), 14, '찌모 빽도: 바깥에서 왔으면 14');
eq(dest(20, BACKDO, [28, 29, 20]), 29, '참먹이 빽도: 대각선에서 왔으면 29');
eq(dest(20, BACKDO, [18, 19, 20]), 19, '참먹이 빽도: 바깥에서 왔으면 19');
eq(dest(5, BACKDO, [4, 5]), 4, '모 자리 빽도 → 4');
{
  // 진짜 진행: 도 → 빽도(참먹이) → 아무거나로 남
  let s = Y.create({ teams: 2, pieces: 1, seed: 3 });
  Y.forceThrow(s, DO); Y.apply(s, act(DO, 0));
  ok(s.pos[0][0] === 1 && s.turn === 1, '도로 1번 칸');
  Y.forceThrow(s, GAE); Y.apply(s, act(GAE, 0));        // 상대 차례
  Y.forceThrow(s, BACKDO); Y.apply(s, act(BACKDO, 0));
  ok(s.pos[0][0] === 20 && s.turn === 1, '빽도로 참먹이');
  Y.forceThrow(s, DO); Y.apply(s, act(DO, 0));        // 상대 차례
  Y.forceThrow(s, DO); Y.apply(s, act(DO, 0));
  ok(s.phase === 'end' && s.winner === 0, '참먹이에서 도 → 나서 이김 (말 1개)');
}
{
  // 판에 말이 없을 때 빽도 → 그냥 넘어감
  const s = Y.create({ teams: 2, pieces: 2, seed: 5 });
  const ev = Y.forceThrow(s, BACKDO);
  ok(ev.some(e => e.type === 'forfeit') && s.turn === 1 && s.phase === 'throw', '말이 없으면 빽도는 버리고 차례 넘김');
  // 윷 뒤 빽도: 윷으로 말을 낸 다음 빽도를 쓸 수 있음
  const t = Y.create({ teams: 2, pieces: 2, seed: 5 });
  Y.forceThrow(t, YUT); Y.forceThrow(t, BACKDO);
  ok(t.phase === 'move' && Y.legalActions(t).every(a => Math.floor(a / MAXK) === YUT), '윷+빽도: 처음엔 윷만 쓸 수 있음');
  Y.apply(t, act(YUT, 0));
  ok(t.phase === 'move' && Y.isLegal(t, act(BACKDO, 0)), '윷을 쓰고 나면 빽도를 그 말에');
  Y.apply(t, act(BACKDO, 0));
  ok(t.pos[0][0] === 3 && t.turn === 1, '4 → 빽도 → 3');
}
{
  // 빽도 끔: 수많이 던져도 빽도 없음, 켬: 가끔 나옴
  const s = Y.create({ teams: 2, pieces: 4, backdo: false, seed: 9 });
  let bd = 0; for (let i = 0; i < 4000; i++) { const st = [0, 1, 2, 3].map(() => (Y.rnd(s) < 0.6 ? 1 : 0)); if (Y.kindOfSticks(st, false) === BACKDO) bd++; }
  ok(bd === 0, '빽도 끔이면 빽도 안 나옴');
  ok(Y.kindOfSticks([1, 0, 0, 0], true) === BACKDO && Y.kindOfSticks([0, 1, 0, 0], true) === DO && Y.kindOfSticks([1, 0, 0, 0], false) === DO, '표시 가락 하나만 배 = 빽도');
}

sec('잡기 · 한 번 더 · 업기');
{
  const s = Y.create({ teams: 2, pieces: 2, seed: 11 });
  s.pos[0][0] = 3; s.trail[0][0] = [1, 2, 3];
  s.turn = 1; s.pos[1][0] = 1; s.trail[1][0] = [1];
  Y.forceThrow(s, GAE);
  const ev = Y.apply(s, act(GAE, 0));
  ok(ev.some(e => e.type === 'capture' && e.victim === 0), '개로 잡음');
  ok(s.pos[0][0] === WAIT && s.trail[0][0].length === 0, '잡힌 말은 대기로');
  ok(s.turn === 1 && s.phase === 'throw' && s.extra === 1, '잡으면 한 번 더 던짐');
  ok(s.stat.caps[1] === 1 && s.stat.lost[0] === 1, '잡은 수 기록');
}
{
  // 업은 말(2개)을 한꺼번에 잡기
  const s = Y.create({ teams: 2, pieces: 2, seed: 12 });
  s.pos[0] = [4, 4]; s.trail[0] = [[4], [4]];
  s.turn = 1; s.pos[1][0] = 2; s.trail[1][0] = [2];
  Y.forceThrow(s, GAE); const ev = Y.apply(s, act(GAE, 0));
  const c = ev.find(e => e.type === 'capture');
  ok(c && c.pieces.length === 2 && s.pos[0].every(x => x === WAIT), '업힌 말은 같이 잡힘');
}
{
  const s = Y.create({ teams: 2, pieces: 3, seed: 13 });
  Y.forceThrow(s, YUT);
  ok(s.phase === 'throw' && s.extra === 1 && s.pool.length === 1, '윷 → 한 번 더');
  Y.forceThrow(s, MO);
  ok(s.phase === 'throw' && s.pool.join() === '4,5', '모 → 또 한 번 더');
  Y.forceThrow(s, GEOL);
  ok(s.phase === 'move' && s.pool.join() === '4,5,3', '걸에서 멈추고 옮기기 (결과 3개)');
  // 걸 먼저, 그다음 모(같은 말 업기 확인을 위해 다른 말)
  Y.apply(s, act(GEOL, 0));                    // 말0 → 3
  ok(s.pos[0][0] === 3 && s.phase === 'move', '결과를 원하는 순서로');
  ok(Y.legalActions(s).includes(act(YUT, 1)) && !Y.legalActions(s).includes(act(YUT, 2)), '대기 말은 대표(가장 작은 번호) 하나만');
  // 말1 을 도 칸… 윷(4) 으로 4, 모(5) 로 5
  Y.apply(s, act(YUT, 0));                     // 말0 → 7
  const ev = Y.apply(s, act(MO, 1));           // 말1 → 5
  ok(s.pos[0][1] === 5 && s.turn === 1, '모로 모 자리, 차례 넘김');
  void ev;
  // 업기
  const t = Y.create({ teams: 2, pieces: 3, seed: 14 });
  t.pos[0] = [2, 4, WAIT]; t.trail[0] = [[1, 2], [4], []];
  Y.forceThrow(t, GAE); const e2 = Y.apply(t, act(GAE, 0));
  ok(e2.some(e => e.type === 'stack') && t.pos[0][0] === 4 && t.pos[0][1] === 4, '내 말 위에 내려앉으면 업음');
  ok(!Y.isRep(t, 0, 1) && Y.isRep(t, 0, 0), '업힌 묶음의 대표는 가장 작은 번호');
  t.turn = 0; t.phase = 'throw'; t.extra = 1;
  Y.forceThrow(t, DO); const e3 = Y.apply(t, act(DO, 0));
  const mv = e3.find(e => e.type === 'move');
  ok(mv.pieces.length === 2 && t.pos[0][0] === 5 && t.pos[0][1] === 5, '업은 말은 같이 움직임');
  t.turn = 0; t.phase = 'throw'; t.extra = 1;
  Y.forceThrow(t, DO); Y.apply(t, act(DO, 0));
  ok(t.pos[0][0] === 21 && t.pos[0][1] === 21, '업은 말도 모 자리에서 지름길');
  eq(t.trail[0][1], t.trail[0][0], '업힌 말의 지나온 길도 같음');
}
{
  // 남은 결과로 둘 수 없으면 버림: 마지막 말이 남고 나면 남은 결과는 쓸 데 없음 → 이김
  const s = Y.create({ teams: 2, pieces: 2, seed: 15 });
  s.pos[0] = [HOME, 19]; s.trail[0] = [[], [19]];
  Y.forceThrow(s, YUT); Y.forceThrow(s, GAE);
  const ev = Y.apply(s, act(YUT, 1));
  ok(ev.some(e => e.type === 'home') && ev.some(e => e.type === 'win') && s.phase === 'end' && s.winner === 0, '말이 모두 나면 이김');
  ok(Y.legalActions(s).length === 0 && Y.reward(s, 0) === 1 && Y.reward(s, 1) === -1, '끝난 판: 행동 없음 · 보상');
  // 결과가 남았지만 쓸 데 없음 (빽도 + 판에 말 없음)
  const t = Y.create({ teams: 3, pieces: 2, seed: 16 });
  t.pos[0] = [HOME, 18]; t.trail[0] = [[], [18]];
  Y.forceThrow(t, YUT); Y.forceThrow(t, BACKDO);
  Y.apply(t, act(BACKDO, 1));                  // 18 → 17
  ok(t.pos[0][1] === 17 && t.phase === 'move' && t.pool.join() === '4', '빽도 먼저 써도 됨');
  Y.apply(t, act(YUT, 1));                     // 17 → 18,19,20,HOME
  ok(t.phase === 'end', '윷으로 남');
}

sec('사람 여럿 돌아가며 · 팀 차례');
{
  const s = Y.create({ teams: 3, pieces: 2, seed: 21, members: [2, 1, 3] });
  const seen = [];
  for (let i = 0; i < 9; i++) { seen.push(s.turn + ':' + s.mi[s.turn]); Y.forceThrow(s, BACKDO); }   // 판에 말이 없어 빽도는 바로 넘어감
  eq(seen, ['0:0', '1:0', '2:0', '0:1', '1:0', '2:1', '0:0', '1:0', '2:2'], '팀은 0→1→2, 팀 안 사람은 차례마다 돌아감');
}

sec('결정성 · 숨김 · 관찰');
function playGame(opt, tiers, aiSeed) {
  let s = Y.create(opt), n = 0;
  const log = [];
  while (s.phase !== 'end' && n < 3000) {
    const legal = Y.legalActions(s);
    const a = AI.choose(s, tiers[s.turn], { seed: aiSeed + n });
    if (!legal.includes(a)) throw new Error('AI 가 할 수 없는 행동 ' + a);
    log.push(a);
    s = Y.step(s, a).state; n++;
  }
  return { s, log, n };
}
{
  const a = playGame({ teams: 3, pieces: 3, seed: 777 }, ['easy', 'normal', 'hard'], 5);
  const b = playGame({ teams: 3, pieces: 3, seed: 777 }, ['easy', 'normal', 'hard'], 5);
  eq(b.log, a.log, '같은 씨앗 → 같은 행동');
  ok(JSON.stringify(a.s) === JSON.stringify(b.s), '같은 씨앗 → 같은 끝 상태');
  const c = playGame({ teams: 3, pieces: 3, seed: 778 }, ['easy', 'normal', 'hard'], 5);
  ok(JSON.stringify(c.log) !== JSON.stringify(a.log), '다른 씨앗 → 다른 판');
  const s0 = Y.create({ teams: 2, seed: 99 });
  const { state } = Y.step(s0, A_THROW);
  ok(s0.pool.length === 0 && state.throwNo === 1, 'step 은 원래 상태를 안 바꿈');
  ok(Y.view(state).rng === 0 && state.rng !== 0, 'view 는 난수 상태를 가림');
  { // 남에게 보내는 view 로 앞으로 나올 윷을 미리 계산할 수 없어야 함 (mulberry32 는 상태 = 씨앗 + 부른 횟수×상수 → 씨앗 + 던진 횟수를 알면 다음 윷이 나옴)
    const C0 = 0x6D2B79F5, kinds = [];
    let bonus = null;                                                 // 윷·모가 나와 한 번 더 던지는 상태 (던진 횟수 > 0 인 던지기 차례)
    for (let sd = 1; sd < 400 && !bonus; sd++) { const r = Y.step(Y.create({ teams: 2, seed: 20241100 + sd }), A_THROW); if (r.state.phase === 'throw' && r.state.throwNo === 1) bonus = r.state; }
    for (const g of [Y.create({ teams: 2, seed: 20241101 }), bonus]) {
      if (!g) { ok(false, '(시험 조건) 한 번 더 던지는 상태를 못 찾음'); continue; }
      const v = Y.view(g);
      const attack = Object.assign(JSON.parse(JSON.stringify(v)), { rng: (v.seed + 4 * v.throwNo * C0) | 0 });   // 구경하는 쪽이 아는 것만으로 난수 상태를 복원
      ok(v.seed !== g.seed && JSON.stringify(v).indexOf(String(g.seed)) < 0, 'view 에는 씨앗이 없음 (던진 횟수 ' + g.throwNo + ', 실제 씨앗 ' + g.seed + ')');
      const real = Y.step(g, A_THROW).events.find(e => e.type === 'throw'), guess = Y.step(attack, A_THROW).events.find(e => e.type === 'throw');
      ok(JSON.stringify(real.sticks) !== JSON.stringify(guess.sticks), 'view 만으로는 다음 윷(막대 4개)을 맞힐 수 없음 (던진 횟수 ' + g.throwNo + ': 실제 ' + real.sticks + ' · 짐작 ' + guess.sticks + ')');
    }
  }
  ok(JSON.parse(JSON.stringify(state)).pos[0].length === 4, '상태는 JSON 그대로');
  const o = Y.obs(state, 1);
  ok(o.length === Y.OBS_LEN && o instanceof Float32Array, '관찰 길이 ' + Y.OBS_LEN);
  ok(Math.abs(o[0] - 1) < 1e-6 && Math.abs(o[31] - 1) < 1e-6, '관찰: 나부터 (대기 말 4/4)');
  const m = Y.legalMask(state);
  ok(m.length === Y.N_ACTIONS && m.reduce((x, y) => x + y, 0) === Y.legalActions(state).length, 'legalMask');
}

sec('확률');
{
  const N = 200000, cnt = [0, 0, 0, 0, 0, 0];
  const s = Y.create({ teams: 2, seed: 4321 });
  for (let i = 0; i < N; i++) { const st = [0, 1, 2, 3].map(() => (Y.rnd(s) < 0.6 ? 1 : 0)); cnt[Y.kindOfSticks(st, true)]++; }
  const P = Y.probs(0.6, true);
  ok(Math.abs(P.reduce((x, y) => x + y, 0) - 1) < 1e-9, '확률 합 1');
  for (let k = 0; k < 6; k++) ok(Math.abs(cnt[k] / N - P[k]) < 0.006, `${Y.NAMES[k]} ${(cnt[k] / N * 100).toFixed(1)}% ≈ ${(P[k] * 100).toFixed(1)}%`);
  ok(P[GAE] > P[DO] && P[GEOL] > P[YUT] && P[YUT] > P[MO], '개·걸이 흔하고 모가 드묾');
  const Q = Y.probs(0.5, true);
  ok(Math.abs(Q[GAE] - 0.375) < 1e-9 && Math.abs(Q[MO] - 0.0625) < 1e-9, '치우침 0.5 → 동전 던지기');
}

sec('AI 끼리 끝까지');
{
  let games = 0, maxN = 0, t0 = Date.now();
  for (const teams of [2, 3, 4]) for (const pieces of [2, 3, 4]) for (const bd of [true, false]) {
    const tiers = ['easy', 'normal', 'hard', 'normal'].slice(0, teams);
    const r = playGame({ teams, pieces, backdo: bd, seed: 1000 + teams * 10 + pieces + (bd ? 0 : 5) }, tiers, teams);
    ok(r.s.phase === 'end' && r.s.winner >= 0, `${teams}팀 말${pieces} 빽도${bd ? '켬' : '끔'} 끝남`);
    ok(r.s.pos[r.s.winner].every(x => x === HOME), '이긴 팀은 말이 모두 집에');
    games++; maxN = Math.max(maxN, r.n);
  }
  console.log(`  ${games}판 · 가장 긴 판 ${maxN}행동 · ${Date.now() - t0}ms`);
  // AI 선생님 까닭
  const s = Y.create({ teams: 2, pieces: 2, seed: 50 });
  s.pos[1][0] = 3; s.trail[1][0] = [1, 2, 3];
  Y.forceThrow(s, GEOL);
  const sg = AI.suggest(s, ['토끼팀', '곰돌이팀']);
  ok(sg && sg.dest === 3 && /잡/.test(sg.reason), 'AI 선생님: 잡을 수 있으면 잡으라고 함 — ' + (sg && sg.reason));
  const s2 = Y.create({ teams: 2, pieces: 2, seed: 51 });
  s2.pos[0][0] = 2; s2.trail[0][0] = [1, 2];
  Y.forceThrow(s2, GEOL);
  const sg2 = AI.suggest(s2);
  ok(sg2 && sg2.dest === 5 && /지름길/.test(sg2.reason), 'AI 선생님: 모 자리에 세우기 — ' + (sg2 && sg2.reason));
  ok(AI.suggest(Y.create({ teams: 2, seed: 1 })).throw, 'AI 선생님: 던질 때는 던지라고');
}

sec('AI 단계 순서 (🐣 < 🐱 < 🐯)');
function duel(a, b, N) {
  let wa = 0;
  for (let i = 0; i < N; i++) {
    const r = playGame({ teams: 2, pieces: 4, seed: 50000 + i * 7, first: i % 2 }, [a, b], i * 13);
    if (r.s.winner === 0) wa++;
  }
  return wa / N;
}
{
  const N = +process.env.DUEL || 240, t0 = Date.now();
  const ne = duel('normal', 'easy', N), hn = duel('hard', 'normal', N);
  console.log(`  🐱 vs 🐣 ${(ne * 100).toFixed(1)}% · 🐯 vs 🐱 ${(hn * 100).toFixed(1)}% (${N}판씩, 선은 번갈아) ${Date.now() - t0}ms`);
  ok(ne > 0.58, '🐱 이 🐣 를 이김');
  ok(hn > 0.54, '🐯 가 🐱 를 이김');
}

console.log(`\n${fail ? '❌' : '✅'} 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

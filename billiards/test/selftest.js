// 당구 자체 시험: 물리 성질 · 규칙(4구·3쿠션·8볼) · 결정성 · 속도 · AI
// 실행: node billiards/test/selftest.js   (약 20~40초)
const B = require('../core.js');
const AI = require('../ai.js');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }
const section = t => console.log('·', t);

// 공 배치 도우미: 쓰지 않는 공은 구석으로 치움
function setup(mode, pos, extra) {
  const s = B.create(Object.assign({ mode, seed: 1 }, extra || {}));
  const T = B.TABLES[s.table];
  s.balls.forEach((b, i) => { if (pos[i]) { b.x = pos[i][0]; b.y = pos[i][1]; b.on = true; } else if (pos[i] === null) b.on = false; });
  return { s, T };
}
const rngT = B.makeRng(2026);

// 1) 에너지는 늘지 않음 (움직임 + 회전 전체)
section('에너지');
{
  let worst = 0;
  for (const mode of ['3c', '4gu', '8ball']) {
    for (let k = 0; k < 12; k++) {
      const s = B.create({ mode, seed: 50 + k });
      const act = { angle: rngT() * 6.283, power: 0.2 + rngT() * 0.8, spinX: rngT() * 2 - 1, spinY: rngT() * 2 - 1 };
      if (mode === '8ball') act.place = [0.5, s.balls[0].y + (rngT() - 0.5) * 0.4];
      const sim = B.simulate(s, act, { energy: true });
      const E = sim.energy;
      for (let i = 1; i < E.length; i++) { const d = E[i] - E[i - 1]; if (d > worst) worst = d; }
      ok(E[E.length - 1] <= 1e-9, `${mode} 마지막엔 멈춤 (E=${E[E.length - 1]})`);
    }
  }
  ok(worst < 1e-9, `에너지가 늘어난 프레임 없음 (최대 증가 ${worst})`);
}

// 2) 최대 힘에서도 뚫고 지나가지 않음
section('터널링');
{
  let outside = 0, overlap = 0, missed = 0;
  for (let k = 0; k < 30; k++) {
    const mode = k % 3 === 0 ? '8ball' : k % 3 === 1 ? '3c' : '4gu';
    const s = B.create({ mode, seed: 900 + k });
    const T = B.TABLES[s.table], R = T.R;
    const act = { angle: rngT() * 6.283, power: 1, spinX: rngT() * 2 - 1, spinY: rngT() * 2 - 1 };
    if (mode === '8ball') act.place = [0.45, T.W / 2];
    const sim = B.simulate(s, act);
    for (const f of sim.frames) {
      for (let i = 0; i < sim.n; i++) {
        const x = f[2 * i], y = f[2 * i + 1]; if (isNaN(x)) continue;
        if (mode !== '8ball' && (x < R - 0.004 || x > T.L - R + 0.004 || y < R - 0.004 || y > T.W - R + 0.004)) outside++;
        for (let j = i + 1; j < sim.n; j++) { const x2 = f[2 * j], y2 = f[2 * j + 1]; if (!isNaN(x2) && Math.hypot(x - x2, y - y2) < 2 * R * 0.8) overlap++; }
      }
    }
  }
  // 멀리 있는 공을 최대 힘으로 정면: 반드시 맞음
  for (let k = 0; k < 10; k++) {
    const { s, T } = setup('3c', [[0.2, 0.3 + k * 0.08], null, [2.6, 1.1 - k * 0.05]]);
    const c = s.balls[0], o = s.balls[2];
    const sim = B.simulate(s, { angle: Math.atan2(o.y - c.y, o.x - c.x), power: 1, spinX: 0, spinY: 0 });
    if (!sim.events.some(e => e.k === 'b')) missed++;
  }
  ok(outside === 0, `캐롬 공이 당구대 밖으로 안 나감 (${outside})`);
  ok(overlap === 0, `공끼리 깊게 겹치지 않음 (${overlap})`);
  ok(missed === 0, `최대 힘 정면 샷은 반드시 맞음 (놓침 ${missed})`);
}

// 3) 쿠션 각도
section('쿠션 각도');
function railOut(sx, ang, from) {
  const { s } = setup('3c', [from || [1.2, 1.3], null, null]);
  const sim = B.simulate(s, { angle: ang, power: 0.25, spinX: sx, spinY: 0 });
  const ce = sim.events.find(e => e.k === 'c'), f = ce.f;
  const a = sim.frames[f + 1], b = sim.frames[Math.min(sim.frames.length - 1, f + 8)];
  return { deg: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, rail: ce.b };
}
{
  // 위 쿠션(y=W) 바로 앞에서 45° 로 (거의 미끄러지는 공)
  const plain = railOut(0, Math.PI / 4), run = railOut(0.8, Math.PI / 4), rev = railOut(-0.8, Math.PI / 4);
  ok(plain.rail === 2, '위 쿠션에 맞음');
  const a0 = -plain.deg, a1 = -run.deg, a2 = -rev.deg;   // 쿠션에서 잰 반사각 (작을수록 길게)
  ok(a0 > 30 && a0 < 50, `회전 없는 45° 입사 → 반사 30~50° (${a0.toFixed(1)}°)`);
  ok(a1 < a0 - 3, `순회전(러닝)은 각이 길어짐 (${a1.toFixed(1)}° < ${a0.toFixed(1)}°)`);
  ok(a2 > a0 + 1, `역회전은 각이 짧아짐 (${a2.toFixed(1)}° > ${a0.toFixed(1)}°)`);
  // 정면으로 들어가면 정면으로 나옴
  const st = railOut(0, Math.PI / 2, [1.2, 1.2]);
  ok(Math.abs(st.deg + 90) < 1, `정면 입사 → 정면 반사 (${st.deg.toFixed(2)}°)`);
  // 밀어치기·끌어치기: 정면 충돌 뒤 수구가 앞으로 / 뒤로
  const hit = sy => { const { s } = setup('3c', [[1.0, 0.7], null, [1.4, 0.7]]); return B.simulate(s, { angle: 0, power: 0.45, spinX: 0, spinY: sy }).final[0].x; };
  const fo = hit(0.9), stn = hit(-0.25), dr = hit(-0.9);
  ok(fo > 1.45, `밀어치기 → 수구가 따라감 (${fo.toFixed(2)})`);
  ok(dr < 1.3, `끌어치기 → 수구가 돌아옴 (${dr.toFixed(2)})`);
  ok(fo > stn && stn > dr, '밀기 > 약한 끌기 > 강한 끌기 순서');
}

// 4) 결정성
section('결정성');
{
  const s = B.create({ mode: '8ball', seed: 77 });
  const act = { angle: 0.003, power: 1, spinX: 0.1, spinY: -0.2, place: [0.5, s.balls[0].y] };
  const h1 = B.hashFrames(B.simulate(s, act)), h2 = B.hashFrames(B.simulate(s, act));
  ok(h1 === h2, `같은 샷 = 같은 궤적 (${h1})`);
  const r1 = B.applyShot(s, act), r2 = B.applyShot(s, act);
  ok(JSON.stringify(r1.state) === JSON.stringify(r2.state), '같은 샷 = 같은 다음 상태');
  ok(JSON.stringify(B.create({ mode: '8ball', seed: 5 }).balls) === JSON.stringify(B.create({ mode: '8ball', seed: 5 }).balls), '같은 씨앗 = 같은 랙');
  ok(JSON.stringify(B.create({ mode: '8ball', seed: 5 }).balls) !== JSON.stringify(B.create({ mode: '8ball', seed: 6 }).balls), '다른 씨앗 = 다른 랙');
  // 랙: 8번은 셋째 줄 가운데, 뒷줄 양 끝은 단색·줄무늬 하나씩
  const rk = B.create({ mode: '8ball', seed: 9 }).balls;
  const back = rk.map((b, i) => [i, b]).filter(([i, b]) => i && Math.abs(b.x - Math.max(...rk.slice(1).map(q => q.x))) < 1e-6).map(([i]) => i);
  const ends = back.sort((a, b) => rk[a].y - rk[b].y); const e1 = ends[0], e2 = ends[ends.length - 1];
  ok(B.groupOf(e1) !== B.groupOf(e2) && B.groupOf(e1) && B.groupOf(e2), '뒷줄 양 끝은 단색 하나 · 줄무늬 하나');
  // 전송용 묶기 → 풀기
  const sim = B.simulate(s, act), pk = B.packTraj(sim), un = B.unpackTraj(JSON.parse(JSON.stringify(pk)));
  const last = sim.frames[sim.frames.length - 1], ul = un.frames[un.frames.length - 1];
  let md = 0; for (let j = 0; j < last.length; j++) { if (isNaN(last[j])) { if (!isNaN(ul[j])) md = 9; } else md = Math.max(md, Math.abs(last[j] - ul[j])); }
  ok(md <= 0.0006, `궤적 묶기/풀기 오차 1mm 이내 (${(md * 1000).toFixed(2)}mm)`);
  ok(un.events.length === sim.events.length, '사건 수 그대로');
  console.log(`  궤적 전송 크기 ${(JSON.stringify(pk).length / 1024).toFixed(1)}KB (${sim.frameCount}프레임)`);
}

// 5) 속도 (한 샷 계산)
section('속도');
{
  let worst = 0, sum = 0, cnt = 0;
  for (let k = 0; k < 40; k++) {
    const mode = ['3c', '4gu', '8ball'][k % 3];
    const s = B.create({ mode, seed: 300 + k });
    const act = { angle: k % 3 === 2 ? 0.002 : rngT() * 6.283, power: 1, spinX: rngT() - 0.5, spinY: rngT() - 0.5 };
    if (mode === '8ball') act.place = [0.5, s.balls[0].y];
    const t0 = process.hrtime.bigint(); B.applyShot(s, act); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (k > 2) { worst = Math.max(worst, ms); sum += ms; cnt++; }
  }
  console.log(`  최대 힘 샷 계산: 평균 ${(sum / cnt).toFixed(1)}ms · 최악 ${worst.toFixed(1)}ms`);
  ok(worst < 60, `한 샷 계산이 충분히 빠름 (PC 최악 ${worst.toFixed(1)}ms < 60ms → 폰에서도 100ms 아래)`);
}

// 6) 규칙: 가짜 사건으로
section('규칙');
const fake = (s, cue, events) => ({ cue, events: events.map((e, i) => Object.assign({ f: i, v: 1 }, e)), final: s.balls.map(b => ({ x: b.x, y: b.y, on: b.on })) });
const judge = (s, cue, ev, edit) => { const t = B.clone(s); const sim = fake(t, cue, ev); if (edit) edit(sim.final); const r = B.judgeSim(t, sim, null); return { s: t, r }; };
{
  // 4구
  const s = B.create({ mode: '4gu', players: 2, target: 30, seed: 1 });
  ok(B.needPoints(s) === 3, '4구 30다마 = 3점');
  let j = judge(s, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 1 }, { k: 'b', a: 0, b: 3 }]);
  ok(j.r.score === 1 && j.s.scores[0] === 1 && j.s.turn === 0, '4구: 빨간 공 둘 → 득점·계속');
  j = judge(s, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'b', a: 0, b: 1 }, { k: 'b', a: 0, b: 3 }]);
  ok(j.r.foul && j.s.turn === 1 && j.s.scores[0] === 0, '4구: 상대 공 건드리면 파울·차례 넘김');
  const s2 = B.clone(s); s2.scores[0] = 2;
  j = judge(s2, 0, [{ k: 'b', a: 0, b: 1 }]);
  ok(j.s.scores[0] === 1, '4구: 감점 −1점(−10다마)');
  j = judge(s, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 0 }]);
  ok(j.r.score === 0 && j.s.turn === 1 && !j.r.foul, '4구: 빨간 공 하나 → 차례 넘김');
  j = judge(s, 0, []);
  ok(j.s.turn === 1 && !j.r.foul, '4구: 헛치기 → 감점 없이 넘김');
  const s3 = B.clone(s); s3.turn = 1; s3.scores = [0, 2];
  j = judge(s3, 1, [{ k: 'b', a: 1, b: 3 }, { k: 'b', a: 2, b: 1 }]);
  ok(j.s.phase === 'end' && j.s.winner === 1, '4구: 노란 공(둘째 사람)도 마지막 점수로 승리');
  // 마무리 쓰리쿠션
  const s4 = B.create({ mode: '4gu', players: 2, target: 30, seed: 1, finish3c: true }); s4.scores[0] = 2;
  j = judge(s4, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'b', a: 0, b: 3 }]);
  ok(j.r.score === 0 && j.s.phase === 'play', '4구 마무리: 쿠션 없이는 마지막 점수 안 됨');
  j = judge(s4, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 2 }, { k: 'b', a: 0, b: 3 }]);
  ok(j.s.phase === 'end' && j.s.winner === 0, '4구 마무리: 쓰리쿠션으로 승리');

  // 3쿠션
  const c = B.create({ mode: '3c', players: 2, target: 2, seed: 1 });
  j = judge(c, 0, [{ k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 2 }, { k: 'b', a: 0, b: 1 }, { k: 'b', a: 0, b: 2 }]);
  ok(j.r.score === 1 && j.s.turn === 0, '3쿠션: 쿠션 3번 먼저(빈 쿠션) → 득점');
  j = judge(c, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'b', a: 0, b: 1 }]);
  ok(j.r.score === 0 && j.s.turn === 1, '3쿠션: 두 번째 공 전 쿠션 2번 → 실패');
  j = judge(c, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 3 }, { k: 'b', a: 0, b: 1 }]);
  ok(j.r.score === 1, '3쿠션: 첫 공 뒤 쿠션 3번 → 득점');
  j = judge(c, 0, [{ k: 'c', a: 0, b: 0 }, { k: 'b', a: 0, b: 2 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 2 }, { k: 'b', a: 0, b: 1 }, { k: 'c', a: 0, b: 3 }]);
  ok(j.r.score === 1 && j.r.cushions === 3, '3쿠션: 첫 공 앞뒤 쿠션을 합쳐 셈 · 두 번째 공 뒤 쿠션은 안 셈');
  j = judge(c, 0, [{ k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 2 }, { k: 'b', a: 0, b: 2 }, { k: 'b', a: 2, b: 1 }]);
  ok(j.r.score === 0, '3쿠션: 목적구끼리 맞은 건 수구 접촉이 아님');
  const c2 = B.clone(c); c2.scores[0] = 1;
  j = judge(c2, 0, [{ k: 'c', a: 0, b: 0 }, { k: 'c', a: 0, b: 1 }, { k: 'c', a: 0, b: 2 }, { k: 'b', a: 0, b: 1 }, { k: 'b', a: 0, b: 2 }]);
  ok(j.s.phase === 'end' && j.s.winner === 0, '3쿠션: 목표 점수 → 승리');
  // 이닝: 둘째 사람 차례가 오면 이닝 +1
  j = judge(c, 0, []);
  ok(j.s.innings[1] === 1 && j.s.turn === 1, '3쿠션: 차례 넘기면 상대 이닝 시작');

  // 8볼
  const p = B.create({ mode: '8ball', players: 2, seed: 4 });
  ok(p.ballInHand && p.kitchen && p.breakShot, '8볼: 첫 샷은 키친 프리볼 브레이크');
  j = judge(p, 0, [{ k: 'b', a: 0, b: 1 }, { k: 'p', a: 3, b: 0 }, { k: 'c', a: 5, b: 1 }], f => { f[3].on = false; });
  ok(j.r.cont && j.s.turn === 0 && j.s.groups[0] == null && !j.s.breakShot, '8볼: 브레이크로 넣으면 계속 · 아직 오픈 테이블');
  j = judge(p, 0, [{ k: 'b', a: 0, b: 1 }, { k: 'p', a: 0, b: 2 }], f => { f[0].on = false; });
  ok(j.r.foul && j.s.turn === 1 && j.s.ballInHand && j.s.balls[0].on, '8볼: 브레이크 스크래치 → 상대 프리볼');
  j = judge(p, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'p', a: 8, b: 3 }], f => { f[8].on = false; });
  ok(j.s.phase === 'play' && j.s.balls[8].on, '8볼: 브레이크에 8번 → 다시 놓고 계속');
  const q = B.clone(p); q.breakShot = false; q.ballInHand = false; q.kitchen = false;
  j = judge(q, 0, [{ k: 'b', a: 0, b: 11 }, { k: 'p', a: 11, b: 0 }], f => { f[11].on = false; });
  ok(j.s.groups[0] === 'stripe' && j.s.groups[1] === 'solid' && j.s.turn === 0, '8볼: 오픈에서 줄무늬 넣으면 내 공 = 줄무늬');
  const q2 = B.clone(q); q2.groups = ['solid', 'stripe'];
  j = judge(q2, 0, [{ k: 'b', a: 0, b: 12 }, { k: 'c', a: 12, b: 1 }]);
  ok(j.r.foul && j.s.turn === 1 && j.s.ballInHand, '8볼: 남의 공 먼저 맞히면 반칙 → 프리볼');
  j = judge(q2, 0, [{ k: 'b', a: 0, b: 2 }]);
  ok(j.r.foul, '8볼: 맞힌 뒤 쿠션에 닿은 공 없으면 반칙');
  j = judge(q2, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'c', a: 2, b: 1 }]);
  ok(!j.r.foul && j.s.turn === 1, '8볼: 내 공 맞히고 쿠션 → 반칙 아님, 못 넣었으니 넘김');
  j = judge(q2, 0, [{ k: 'b', a: 0, b: 2 }, { k: 'p', a: 2, b: 0 }, { k: 'p', a: 9, b: 1 }], f => { f[2].on = false; f[9].on = false; });
  ok(j.r.cont && j.s.turn === 0, '8볼: 내 공 넣으면(상대 공도 같이 들어가도) 계속');
  j = judge(q2, 0, [{ k: 'b', a: 0, b: 8 }, { k: 'p', a: 8, b: 0 }], f => { f[8].on = false; });
  ok(j.s.phase === 'end' && j.s.winTeam === 1, '8볼: 내 공 남았는데 8번 넣으면 패배');
  const q3 = B.clone(q2); for (let i = 1; i <= 7; i++) q3.balls[i].on = false;
  j = judge(q3, 0, [{ k: 'b', a: 0, b: 8 }, { k: 'p', a: 8, b: 2 }], f => { f[8].on = false; });
  ok(j.s.phase === 'end' && j.s.winTeam === 0 && j.s.winner === 0, '8볼: 내 공 다 넣고 8번 → 승리');
  j = judge(q3, 0, [{ k: 'b', a: 0, b: 8 }, { k: 'p', a: 8, b: 2 }, { k: 'p', a: 0, b: 3 }], f => { f[8].on = false; f[0].on = false; });
  ok(j.s.phase === 'end' && j.s.winTeam === 1, '8볼: 8번 넣고 스크래치 → 패배');
  j = judge(q3, 0, [{ k: 'b', a: 0, b: 12 }, { k: 'c', a: 12, b: 1 }]);
  ok(j.r.foul, '8볼: 8번 차례에 다른 공 먼저 → 반칙');
  // 4명 = 2:2 팀
  const t4 = B.create({ mode: '8ball', players: 4, seed: 4 }); t4.breakShot = false; t4.ballInHand = false; t4.kitchen = false; t4.turn = 2;
  j = judge(t4, 0, [{ k: 'b', a: 0, b: 3 }, { k: 'p', a: 3, b: 0 }], f => { f[3].on = false; });
  ok(j.s.groups[0] === 'solid' && B.teamOf(j.s, 2) === 0, '8볼 4명: 3번 사람은 1번 사람과 같은 팀');
  // 프리볼 자리
  ok(!B.validPlace(p, B.TABLES.pool.L * 0.6, 0.6), '키친 밖에는 브레이크 수구를 못 놓음');
  ok(B.validPlace(p, 0.4, 0.6), '키친 안에는 놓을 수 있음');
  const fp = B.fixPlace(p, p.balls[1].x, p.balls[1].y);
  ok(B.validPlace(p, fp[0], fp[1]), '놓을 수 없는 곳은 가까운 빈자리로');
}

// 7) 관측 (RL)
section('관측');
{
  const s = B.create({ mode: '3c', seed: 3 });
  const o0 = B.obs(s, 0), o1 = B.obs(s, 1);
  ok(o0.length === B.OBS_LEN && o0.every(v => v >= 0 && v <= 1.0001), `obs 길이 ${B.OBS_LEN}, 값 0~1`);
  ok(Math.abs(o0[1] - o1[4]) < 1e-6 && Math.abs(o0[4] - o1[1]) < 1e-6, 'obs: 수구는 늘 0번 칸 (노란 공 차례면 바꿔 줌)');
}

// 8) AI
section('AI');
function randomCarom(mode, seed) {
  const s = B.create({ mode, seed }), T = B.TABLES[s.table], r = B.makeRng(seed * 31 + 7);
  for (let k = 0; k < 200; k++) {
    s.balls.forEach(b => { b.x = T.R + 0.06 + r() * (T.L - 2 * T.R - 0.12); b.y = T.R + 0.06 + r() * (T.W - 2 * T.R - 0.12); });
    let okp = true; for (let i = 0; i < s.balls.length; i++) for (let j = i + 1; j < s.balls.length; j++) if (Math.hypot(s.balls[i].x - s.balls[j].x, s.balls[i].y - s.balls[j].y) < 0.15) okp = false;
    if (okp) break;
  }
  return s;
}
{
  const res = {};
  const N = 16;
  for (const mode of ['3c', '4gu']) {
    for (const tier of ['easy', 'hard']) {
      let score = 0, legal = 0, ms = 0;
      for (let k = 0; k < N; k++) {
        const s = randomCarom(mode, 500 + k);
        const t0 = Date.now(); const a = AI.choose(s, tier, { seed: k }); ms += Date.now() - t0;
        if ([a.angle, a.power, a.spinX, a.spinY].every(Number.isFinite) && a.power > 0 && a.power <= 1 && Math.hypot(a.spinX, a.spinY) <= 1.5) legal++;
        if (B.applyShot(s, a).result.score > 0) score++;
      }
      res[mode + tier] = score;
      ok(legal === N, `${mode} ${tier}: 모든 샷이 올바른 값`);
      console.log(`  ${mode} ${AI.TIERS[tier].em}${AI.TIERS[tier].name}: ${score}/${N} 득점 · 평균 ${(ms / N).toFixed(0)}ms`);
    }
    ok(res[mode + 'hard'] > res[mode + 'easy'], `${mode}: 고급이 초급보다 많이 득점 (${res[mode + 'hard']} > ${res[mode + 'easy']})`);
  }
  // 8볼: 브레이크 → 이어서 몇 번, 반칙 적고 프리볼 자리는 올바름
  let fouls = 0, shots = 0, pots = 0;
  for (let g = 0; g < 4; g++) {
    let s = B.create({ mode: '8ball', seed: 40 + g });
    for (let k = 0; k < 6 && s.phase === 'play'; k++) {
      const a = AI.choose(s, 'hard', { seed: g * 10 + k });
      if (a.place) ok(B.validPlace(s, a.place[0], a.place[1]), '8볼 AI 프리볼 자리 올바름');
      const r = B.applyShot(s, a); shots++; if (r.result.foul) fouls++; if (r.result.cont) pots++;
      s = r.state;
    }
  }
  console.log(`  8볼 🐯고급: ${shots}샷 중 계속 ${pots} · 반칙 ${fouls}`);
  ok(fouls <= shots * 0.25, `8볼 고급 AI 반칙이 적음 (${fouls}/${shots})`);
  // AI 선생님 설명 재료
  const cs = randomCarom('3c', 777), ex = AI.coach(cs);
  ok(ex && ex.action && typeof ex.rate === 'number' && Array.isArray(ex.rails), 'AI 선생님: 샷 · 성공률 · 쿠션 순서');
}

// 9) 복기: 기록(처음 상태 + 친 값, JSON 으로 저장했다 꺼냄)에서 다시 치면 상태가 똑같이 나옴
section('복기 재현');
{
  for (const mode of ['3c', '4gu', '8ball']) {
    let s = B.create({ mode, players: 2, seed: 4040 + mode.length, target: mode === '4gu' ? 200 : 40 });
    const start = JSON.stringify(s), shots = [], after = [];
    for (let k = 0; k < 24 && s.phase === 'play'; k++) {
      const a = AI.choose(s, k % 2 ? 'easy' : 'normal', { seed: 77 + k });
      const r = B.applyShot(s, a);
      shots.push(JSON.parse(JSON.stringify(a))); after.push(JSON.stringify(r.state)); s = r.state;
    }
    let st = JSON.parse(start), same = 0;
    const saved = JSON.parse(JSON.stringify(shots));
    for (let k = 0; k < saved.length; k++) { st = B.applyShot(st, saved[k], { record: false }).state; if (JSON.stringify(st) === after[k]) same++; }
    ok(same === shots.length, `${mode}: 기록 ${shots.length}샷을 다시 쳐도 상태가 그대로 (${same}/${shots.length})`);
  }
}

console.log(`\n${fail ? '❌' : '✅'} ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);

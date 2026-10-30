/* 냥냥 배구 자체 시험: node game/volley/test/selftest.js
   1) 규칙 단위 시험  2) 결정성(같은 씨앗·입력 → 같은 해시)  3) 봇끼리 경기 통계(승률·랠리 길이·멈춤 감지) */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'core.js'));
const B = require(path.join(__dirname, '..', 'bots.js'));
const { C, IN } = V;
const T0 = Date.now();
let pass = 0, fail = 0;
function ok(cond, name, info) {
  if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + JSON.stringify(info) : '')); }
}
function section(t) { console.log('\n■ ' + t); }
// 공을 원하는 자리에 놓고 경기 중 상태로
function playState(opts) {
  const s = V.create(Object.assign({ server: 0 }, opts || {}), 42);
  s.phase = 'play'; s.phaseT = 0;
  return s;
}
const run = (s, n, a, b) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...V.step(s, a || 0, b || 0)); return ev; };

// ─────────────────────────────────────────────
section('규칙');
{
  const s = V.create({ target: 7 }, 1234);
  ok(s.phase === 'ready' && s.score[0] === 0 && s.score[1] === 0, '새 경기는 서브 대기·0:0');
  ok(s.server === 0 || s.server === 1, '첫 서버는 씨앗으로 정해짐');
  ok(JSON.stringify(V.clone(s)) === JSON.stringify(s), 'JSON 그대로 복사됨');
  const f = s.server === 0 ? 1 : -1;
  ok(Math.abs(s.ball.x - (V.homeX(s.server) + f * C.SERVE_DX)) < 1e-9 && s.ball.y === C.SERVE_Y, '공은 서버 머리 위(그물 쪽으로 살짝)');
  const b0 = { ...s.ball }; run(s, 10, IN.RIGHT | IN.SMASH, IN.LEFT | IN.SMASH);
  ok(s.ball.x === b0.x && s.ball.y === b0.y, '서브 대기 중엔 공이 떠 있음');
  ok(s.cats.every(c => c.dive === 0), '서브 대기 중엔 다이빙 안 됨');
  const ev = run(s, C.READY_T0);
  ok(ev.some(e => e.t === 'serve') && s.phase !== 'ready', '대기 시간이 지나면 서브');
}
{ // 바닥: 떨어진 쪽의 상대가 점수, 득점한 쪽이 다음 서브
  for (const side of [0, 1]) {
    const s = playState({ server: 1 - side });
    s.ball = { x: side === 0 ? 100 : 540, y: 60, vx: 0, vy: -5 };
    s.cats[0].x = 250; s.cats[1].x = 390;
    const ev = run(s, 20);
    const p = ev.find(e => e.t === 'point');
    ok(p && p.w === 1 - side && s.score[1 - side] === 1 && s.score[side] === 0, `${side ? '오른' : '왼'}쪽 바닥 → 상대 득점`, p);
    ok(s.server === 1 - side, '득점한 쪽이 서브');
    run(s, C.POINT_T + 2);
    ok(s.phase === 'ready' && s.ball.y === C.SERVE_Y, '쉬는 시간 뒤 다시 서브 대기');
  }
}
{ // 목표 점수에서 경기 끝
  const s = playState({ target: 3 }); s.score = [2, 0];
  s.ball = { x: 500, y: 40, vx: 0, vy: -4 }; s.cats[1].x = 620;
  const ev = run(s, 20);
  ok(ev.some(e => e.t === 'point' && e.final) && s.winner === 0, '마지막 점수에 final 표시');
  const ev2 = run(s, C.POINT_T + 2);
  ok(s.phase === 'over' && ev2.some(e => e.t === 'over' && e.w === 0), '경기 끝 → over');
  const sc = s.score.slice(); run(s, 200, IN.RIGHT | IN.JUMP, IN.LEFT | IN.JUMP);
  ok(s.score[0] === sc[0] && s.score[1] === sc[1] && s.phase === 'over', '끝난 뒤엔 그대로');
}
{ // 고양이는 제 코트 밖으로 못 감
  const s = playState(); s.ball.y = 5000;
  run(s, 120, IN.RIGHT, IN.LEFT);
  ok(s.cats[0].x <= C.NET_X - C.NET_HW - C.CAT_HW + 1e-9 && s.cats[1].x >= C.NET_X + C.NET_HW + C.CAT_HW - 1e-9, '그물 못 넘음', [s.cats[0].x, s.cats[1].x]);
  run(s, 200, IN.LEFT, IN.RIGHT);
  ok(s.cats[0].x >= C.CAT_HW - 1e-9 && s.cats[1].x <= C.W - C.CAT_HW + 1e-9, '벽 못 넘음');
}
{ // 벽·그물 튕김
  const s = playState(); s.cats[0].x = 250; s.cats[1].x = 600;
  s.ball = { x: 60, y: 300, vx: -10, vy: 0 };
  const ev = run(s, 8);
  ok(ev.some(e => e.t === 'wall') && s.ball.vx > 0, '벽에서 튕김');
  const s2 = playState(); s2.cats[0].x = 60; s2.cats[1].x = 600;
  s2.ball = { x: 250, y: 80, vx: 12, vy: 2 };
  const ev2 = run(s2, 10);
  ok(ev2.some(e => e.t === 'net') && s2.ball.x < C.NET_X && s2.ball.vx < 0, '그물 아래쪽은 못 지나감');
  let maxV = 0; const s3 = playState(); s3.cats[0].x = 60; s3.cats[1].x = 600;
  for (let k = 0; k < 400; k++) { s3.ball = { x: 280 + (k % 7), y: 40 + (k * 13) % 100, vx: 23.9, vy: (k % 5) - 2 }; V.step(s3, 0, 0); if (s3.ball.x > C.NET_X && s3.ball.y < C.NET_H) maxV++; }
  ok(maxV === 0, '아주 빠른 공도 그물을 뚫지 않음', maxV);
  const s4 = playState(); s4.cats[0].x = 60; s4.cats[1].x = 600;
  s4.ball = { x: C.NET_X, y: C.NET_H + 60, vx: 0, vy: 0 };
  ok(run(s4, 300).some(e => e.t === 'point'), '그물 꼭대기에 공이 얹혀 멈추지 않음');
}
{ // 서브: 가만히 있어도 공이 상대 쪽으로 넘어감
  for (const sv of [0, 1]) {
    const s = V.create({ server: sv }, 9);
    let crossed = false;
    for (let t = 0; t < 300 && s.phase !== 'point'; t++) { V.step(s, 0, 0); if (s.crosses > 0) crossed = true; }
    ok(crossed, `가만히 서 있는 서브도 넘어감 (${sv ? '오른' : '왼'}쪽)`);
  }
}
{ // 몸으로 받기: 공이 위로 튀고, 상대 쪽으로 살짝 밀림
  const s = playState(); s.cats[0].x = 150; s.cats[1].x = 600;
  s.ball = { x: 150, y: 140, vx: 0, vy: -6 };
  const ev = run(s, 12);
  const h = ev.find(e => e.t === 'hit');
  ok(h && h.kind === 'bump' && s.ball.vy > 0 && s.ball.vx > 0, '정수리에 맞으면 위로 톡 (살짝 앞으로)', s.ball);
  const s2 = playState(); s2.cats[0].x = 150; s2.cats[1].x = 600;
  s2.ball = { x: 180, y: 140, vx: 0, vy: -6 };
  run(s2, 12);
  const s3 = playState(); s3.cats[0].x = 150; s3.cats[1].x = 600;
  s3.ball = { x: 120, y: 140, vx: 0, vy: -6 };
  run(s3, 12);
  ok(s2.ball.vx > s.ball.vx && s3.ball.vx < s.ball.vx, '공 뒤에 서면 앞으로, 앞에 서면 뒤로', [s3.ball.vx, s.ball.vx, s2.ball.vx]);
}
{ // 터치 제한: 같은 고양이가 네 번째로 닿으면 상대 점수
  const s = playState({ maxTouches: 3 }); s.cats[0].x = 150; s.cats[1].x = 600;
  let fault = null;
  for (let k = 0; k < 4 && !fault; k++) {
    s.ball = { x: 150, y: 140, vx: 0, vy: -6 }; s.tick += 20;
    for (const e of run(s, 10)) if (e.t === 'fault') fault = e;
  }
  ok(fault && fault.side === 0 && s.score[1] === 1, '네 번째 터치 → 상대 득점', s.touches);
  const s2 = playState({ maxTouches: 0 }); s2.cats[0].x = 150; s2.cats[1].x = 600;
  for (let k = 0; k < 6; k++) { s2.ball = { x: 150, y: 140, vx: 0, vy: -6 }; s2.tick += 20; run(s2, 10); }
  ok(s2.score[1] === 0 && s2.touches[0] === 6, 'maxTouches 0 = 제한 없음');
  const s3 = playState(); s3.cats[0].x = 150; s3.cats[1].x = 600;
  s3.ball = { x: 150, y: 140, vx: 0, vy: -6 }; run(s3, 2); run(s3, 2); run(s3, 2);
  ok(s3.touches[0] === 1, '연달아 붙어 있는 접촉은 한 번으로');
}
{ // 공중 스매시: 세 가지 방향, 너무 빠른 공은 스매시 안 됨
  const shots = {};
  for (const [name, held] of [['spike', 0], ['drive', IN.RIGHT], ['lob', IN.LEFT]]) {
    const s = playState(); s.cats[1].x = 600; s.ball.y = 9999;
    s.cats[0].x = 240;
    run(s, 1, IN.JUMP);
    for (let k = 0; k < 9; k++) V.step(s, IN.JUMP, 0);
    const c = s.cats[0];
    s.ball = { x: c.x + C.PAW_DX + 10, y: c.y + C.PAW_DY + 25, vx: 0, vy: -1 };
    const ev = V.step(s, IN.JUMP | IN.SMASH | held, 0);
    const h = ev.find(e => e.t === 'hit');
    shots[name] = { h, vx: s.ball.vx, vy: s.ball.vy, land: V.predictLanding(s.ball) };
  }
  ok(['spike', 'drive', 'lob'].every(n => shots[n].h && shots[n].h.kind === 'smash' && shots[n].h.aim === n), '스매시 방향: 그냥=내리꽂기·앞=강타·뒤=살짝 넘기기', Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v.h && v.h.aim])));
  ok(shots.spike.h.perfect, '공이 오자마자 휘두르면 퍼펙트');
  ok(Object.values(shots).every(v => v.land.x > C.NET_X), '세 스매시 모두 상대 코트로', Object.values(shots).map(v => Math.round(v.land.x)));
  ok(shots.spike.vy < shots.drive.vy && shots.lob.vy > 0 && Math.abs(shots.drive.vx) > Math.abs(shots.spike.vx), '내리꽂기가 가장 가파르고 강타가 가장 빠름');
  ok(shots.lob.land.t > shots.spike.land.t * 2 && shots.lob.land.x < shots.drive.land.x, '살짝 넘기기는 느리고 짧게');
  const s = playState(); s.cats[1].x = 600; s.cats[0].x = 240; s.ball.y = 9999;
  run(s, 10, IN.JUMP);
  const c = s.cats[0];
  s.ball = { x: c.x + C.PAW_DX + 10, y: c.y + C.PAW_DY + 25, vx: -19, vy: -4 };
  const ev = V.step(s, IN.JUMP | IN.SMASH, 0);
  ok(!ev.some(e => e.t === 'hit' && e.kind === 'smash'), '스매시처럼 빠른 공은 받아칠 수 없음 (막거나 받기만)');
}
{ // 스매시가 어디로 가나: 그물 앞 높은 곳에서 내리꽂으면 그물 바로 뒤로 · 너무 낮으면 살짝 넘기기로 바뀌어 넘어감
  const shot = (x, y, aim, side) => { const b = { x, y, vx: 0, vy: 0 }; const used = V.shoot(b, side, aim, false); return { used, b, L: V.predictLanding(b, 400) }; };
  const near = shot(C.NET_X - 30, 250, 'spike', 0);
  ok(near.used === 'spike' && near.L.x > C.NET_X && near.L.x - C.NET_X < 110 && near.L.t < 16, '그물 앞에서 내리꽂기 → 그물 바로 뒤에 빠르게', [Math.round(near.L.x), near.L.t]);
  let allOver = true, fell = 0, n = 0;
  for (const side of [0, 1]) for (let d = 30; d <= 260; d += 23) for (let y = 60; y <= 300; y += 20) for (const aim of ['spike', 'drive', 'lob']) {
    const x = side === 0 ? C.NET_X - d : C.NET_X + d, r = shot(x, y, aim, side);
    const over = side === 0 ? r.L.x > C.NET_X : r.L.x < C.NET_X;
    n++; if (!over) allOver = false; if (r.used !== aim) fell++;
  }
  ok(allOver, '그물에서 30 넘게 떨어진 곳이면 (모래에 닿기 직전 말고) 어떤 높이·방향으로 쳐도 상대 코트로 넘어감 (제 코트에 꽂지 않음)', n);
  ok(fell > 0 && shot(C.NET_X - 120, 60, 'spike', 0).used === 'lob', '그물보다 낮은 곳의 스매시는 살짝 넘기기로 바뀜');
  const lobN = shot(C.NET_X - 30, 220, 'lob', 0), lobF = shot(C.NET_X - 230, 220, 'lob', 0);
  ok(lobN.L.x - C.NET_X < lobF.L.x - C.NET_X - 50, '살짝 넘기기: 그물 앞에서 치면 짧게, 뒤에서 치면 길게', [Math.round(lobN.L.x), Math.round(lobF.L.x)]);
  // 랠리 열기: 넘김이 많아지면 스매시가 빨라짐 (상한 있음) · 알림 일
  const s = playState(); s.crosses = C.HEAT_FROM + 10;
  const h = V.heat(s), b0 = { x: 200, y: 260, vx: 0, vy: 0 }, b1 = { ...b0 };
  V.shoot(b0, 0, 'drive', false, 0); V.shoot(b1, 0, 'drive', false, h);
  ok(h > 0 && h <= C.HEAT_MAX && Math.hypot(b1.vx, b1.vy) > Math.hypot(b0.vx, b0.vy) * 1.1, '긴 랠리에선 스매시가 더 빨라짐', h);
  s.crosses = 999; ok(V.heat(s) === C.HEAT_MAX, '빨라지는 데는 상한이 있음');
  s.crosses = C.HEAT_FROM; s.ballSide = 0; s.cats[0].x = 60; s.cats[1].x = 600; s.ball = { x: 300, y: 300, vx: 6, vy: 0 };
  ok(run(s, 8).some(e => e.t === 'heat'), '열기가 오르면 heat 일을 알려 줌');
  // 빠른 공(스매시)을 몸으로 받으면 상대 쪽으로 밀어 주지 않음 → 한 번 더 쳐야 넘어감
  const f1 = playState(); f1.cats[0].x = 150; f1.cats[1].x = 600; f1.ball = { x: 150, y: 140, vx: 0, vy: -18 };
  const f2 = playState(); f2.cats[0].x = 150; f2.cats[1].x = 600; f2.ball = { x: 150, y: 140, vx: 0, vy: -8 };
  run(f1, 10); run(f2, 10);
  ok(Math.abs(f1.ball.vx) < 0.3 && f2.ball.vx > 1, '빠른 공 받기는 앞으로 안 밀림 · 느린 공은 살짝 앞으로', [f1.ball.vx, f2.ball.vx]);
}
{ // 땅 스매시 = 다이빙: 빨리 미끄러지고, 일어나는 동안 조작 안 됨
  const s = playState(); s.ball.y = 9999; s.cats[0].x = 100;
  const ev = run(s, 1, IN.SMASH | IN.RIGHT);
  ok(ev.some(e => e.t === 'dive' && e.dir === 1) && s.cats[0].dive > 0, '땅에서 스매시 → 다이빙');
  run(s, C.DIVE_T, IN.RIGHT);
  const moved = s.cats[0].x - 100;
  ok(moved > 70 && moved < 140, '다이빙은 멀리(코트 반의 1/3쯤) 미끄러짐', moved);
  ok(s.cats[0].rec > 0, '다이빙 뒤엔 일어나는 시간');
  const x1 = s.cats[0].x; run(s, 3, IN.LEFT | IN.JUMP);
  ok(s.cats[0].x >= x1 && s.cats[0].y === 0 && s.cats[0].ground, '일어나는 동안엔 못 움직이고 못 뜀 (미끄러지던 것만 마저 멈춤)');
  run(s, C.REC_T, 0); run(s, 6, IN.LEFT);
  ok(s.cats[0].x < x1 - 5, '다 일어나면 다시 움직임');
  const s2 = playState(); s2.ball.y = 9999; s2.cats[1].x = 500;
  run(s2, 1, 0, IN.SMASH);
  ok(s2.cats[1].diveDir === -1, '방향 없이 다이빙하면 그물 쪽으로');
  const s3 = playState(); s3.cats[0].x = 100; s3.cats[1].x = 600;
  run(s3, 1, IN.SMASH | IN.RIGHT);
  for (let k = 0; k < 5; k++) V.step(s3, 0, 0);
  const c = s3.cats[0];
  s3.ball = { x: c.x + 40, y: 60, vx: 0, vy: -6 };
  const ev3 = run(s3, 4);
  ok(ev3.some(e => e.t === 'hit' && e.kind === 'dig') && s3.ball.vy > 8, '다이빙으로 받으면 높이 떠오름');
}
{ // 점프: 누르고 있으면 높이, 일찍 떼면 낮게
  const s = playState(); s.ball.y = 9999;
  let top = 0; V.step(s, IN.JUMP, 0); while (!s.cats[0].ground) { V.step(s, IN.JUMP, 0); top = Math.max(top, s.cats[0].y); }
  const s2 = playState(); s2.ball.y = 9999;
  let top2 = 0; V.step(s2, IN.JUMP, 0); while (!s2.cats[0].ground) { V.step(s2, 0, 0); top2 = Math.max(top2, s2.cats[0].y); }
  ok(top > 110 && top2 < top * 0.7, '점프 높이 조절', [Math.round(top), Math.round(top2)]);
}

{ // 기본 규칙값 · 입력 도우미 · 저장 되살리기
  const s = V.create({}, 3);
  ok(s.target === 11 && s.maxTouches === 0, '기본: 11점 · 터치 제한 없음 (가족용)', [s.target, s.maxTouches]);
  ok(V.create({ target: 7, maxTouches: 3 }, 3).maxTouches === 3, '터치 제한은 옵션으로 켤 수 있음');
  let rt = true;
  for (let n = 0; n < 16; n++) if (V.bits(V.unbits(n)) !== n) rt = false;
  ok(rt && V.bits({ left: true, smash: true }) === (IN.LEFT | IN.SMASH), 'bits ↔ unbits');
  run(s, 200, IN.RIGHT | IN.JUMP, IN.LEFT);
  const back = V.fromJSON(JSON.stringify(s));
  ok(back && V.hash(back) === V.hash(s), 'JSON 문자열로 저장했다 되살려도 같은 상태');
  ok(V.fromJSON('{"v":2}') === null && V.fromJSON('깨진 글') === null, '모양이 다른 저장값은 거절');
}
{ // 쉬는 시간 · 서브 대기 중 위치 되돌림 · 끝난 경기는 입력 무시
  const s = playState(); s.ball = { x: 500, y: 40, vx: 0, vy: -4 }; s.cats[0].x = 250;
  run(s, 20);
  ok(s.phase === 'point', '점수 뒤 쉬는 시간');
  let at = null;
  for (let k = 0; k < C.POINT_T + 5 && !at; k++) if (V.step(s, IN.LEFT, IN.RIGHT).some(e => e.t === 'ready')) at = [s.cats[0].x, s.cats[1].x];
  ok(at && at[0] === V.homeX(0) && at[1] === V.homeX(1), '다음 서브 전엔 둘 다 제자리로', at);
}

// ─────────────────────────────────────────────
section('학습용 함수 (obs · 행동표 · 좌우 뒤집기)');
{
  ok(V.ACTIONS.length === 12, '행동 12가지');
  let rt = true;
  for (let a = 0; a < 12; a++) for (const side of [0, 1]) if (V.inputToAction(V.actionToInput(a, side), side) !== a) rt = false;
  ok(rt, '행동 → 입력 → 행동 되돌리기');
  ok(V.actionToInput(8, 0) === IN.RIGHT && V.actionToInput(8, 1) === IN.LEFT, "'앞' 은 오른쪽 고양이에겐 왼쪽");
  const s = V.create({}, 77);
  const rng = (() => { let a = 99; return () => (a = (a * 1103515245 + 12345) >>> 0) / 4294967296; })();
  let allFinite = true, mirrorOk = true, rangeOk = true, worst = 0;
  for (let t = 0; t < 3000; t++) {
    V.step(s, Math.floor(rng() * 16), Math.floor(rng() * 16));
    for (const side of [0, 1]) {
      const o = V.obs(s, side);
      if (o.length !== V.OBS_N) allFinite = false;
      for (const v of o) { if (!Number.isFinite(v)) allFinite = false; if (Math.abs(v) > 3) rangeOk = false; worst = Math.max(worst, Math.abs(v)); }
    }
    if (t % 37 === 0) {
      const m = V.mirror(s), a = V.obs(s, 0), b = V.obs(m, 1), c2 = V.obs(s, 1), d = V.obs(m, 0);
      for (let i = 0; i < V.OBS_N; i++) if (Math.abs(a[i] - b[i]) > 1e-5 || Math.abs(c2[i] - d[i]) > 1e-5) mirrorOk = false;
    }
    if (s.phase === 'over') break;
  }
  ok(allFinite, `obs 길이 ${V.OBS_N}·모두 유한한 값`);
  ok(rangeOk, 'obs 값이 대략 -3~3 안', worst);
  ok(mirrorOk, '좌우 뒤집은 상태의 반대편 obs = 원래 obs');
  // 뒤집은 상태를 뒤집은 입력으로 굴리면 계속 거울상
  const s1 = V.create({ server: 0 }, 5), s2 = V.mirror(s1);
  const sw = i => (i & ~3) | ((i & 1) << 1) | ((i & 2) >> 1);
  let mirrorRun = true;
  for (let t = 0; t < 1500; t++) {
    const a = Math.floor(rng() * 16), b = Math.floor(rng() * 16);
    V.step(s1, a, b); V.step(s2, sw(b), sw(a));
    if (s1.phase === 'play' && s2.phase === 'play' && Math.abs(s1.ball.x - (C.W - s2.ball.x)) > 1e-6) { mirrorRun = false; break; }
  }
  ok(mirrorRun, '거울 대칭으로 굴려도 같은 경기 (좌우 치우침 없음)');
  // 학습한 정책 끼우는 자리: 작은 MLP(JSON) → obs → 행동 → 입력 비트. 거울 상태에선 거울 입력
  let r = 7; const w = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296 - 0.5);
  const layer = (n, m, act) => ({ W: Array.from({ length: n }, () => Array.from({ length: m }, w)), b: Array.from({ length: n }, w), act });
  const brain = { layers: [layer(16, V.OBS_N, 'tanh'), layer(12, 16, 'linear')] };
  const pa = B.policy(brain, 0), pb = B.policy(brain, 1);
  const s3 = V.create({}, 5); let okBits = true, mirrorPol = true;
  for (let t = 0; t < 600; t++) {
    const a = pa.act(s3), b = pb.act(s3);
    if (a < 0 || a > 15 || b < 0 || b > 15) okBits = false;
    if (t % 25 === 0 && pb.act(V.mirror(s3)) !== sw(a)) mirrorPol = false;
    V.step(s3, a, b);
  }
  ok(okBits, '정책(MLP JSON) 자리: obs → 행동 → 입력 비트');
  ok(mirrorPol, '같은 정책을 오른쪽에 쓰면 거울처럼 움직임 (셀프플레이 가능)');
}

// ─────────────────────────────────────────────
section('결정성');
{
  const play = (seed, n, cut) => {
    const s = V.create({ target: 15 }, seed);
    let r = seed >>> 0 || 1;
    const rnd = () => { r = (r + 0x6D2B79F5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let st = s, evCount = 0;
    for (let t = 0; t < n; t++) {
      if (cut && t === cut) st = V.clone(st);                       // 중간에 JSON 으로 저장했다 불러와도 이어짐
      evCount += V.step(st, Math.floor(rnd() * 16), Math.floor(rnd() * 16)).length;
    }
    return V.hash(st) + ':' + evCount;
  };
  const seeds = [1, 2, 3, 2026, 99999];
  let same = true, cloneSame = true;
  const hashes = new Set();
  for (const sd of seeds) {
    const h1 = play(sd, 6000), h2 = play(sd, 6000), h3 = play(sd, 6000, 2345);
    if (h1 !== h2) same = false;
    if (h1 !== h3) cloneSame = false;
    hashes.add(h1);
  }
  ok(same, '같은 씨앗·입력 → 같은 해시');
  ok(cloneSame, '중간에 JSON 복사해도 같은 결과');
  ok(hashes.size === seeds.length, '씨앗이 다르면 다른 경기');
  // 봇끼리도 (봇 씨앗까지 같으면) 같은 경기
  const botGame = () => { const s = V.create({ target: 5 }, 31); const a = B.create('hard', 0, 1), b = B.create('normal', 1, 2); while (s.phase !== 'over' && s.tick < 30000) V.step(s, a.act(s), b.act(s)); return V.hash(s); };
  ok(botGame() === botGame(), '봇 경기도 씨앗이 같으면 똑같이 재현');
}

// ─────────────────────────────────────────────
section('봇끼리 경기');
function match(tA, tB, seed, target) {
  const s = V.create({ target: target || 11 }, seed);
  const bots = [B.create(tA, 0, seed * 3 + 1), B.create(tB, 1, seed * 7 + 2)];
  const st = { crosses: [], rallyTicks: 0, maxRally: 0, smash: 0, dig: 0, faults: 0, stuck: [0, 0], jitter: [0, 0], lastDir: [0, 0], lastFlip: [-99, -99], groundTicks: [0, 0] };
  while (s.phase !== 'over' && s.tick < 60 * 60 * 20) {
    const ins = [bots[0].act(s), bots[1].act(s)];
    for (let i = 0; i < 2; i++) {
      const c = s.cats[i], d = (ins[i] & IN.RIGHT ? 1 : 0) - (ins[i] & IN.LEFT ? 1 : 0);
      if (c.ground) {
        st.groundTicks[i]++;
        if (d && st.lastDir[i] && d !== st.lastDir[i]) { if (s.tick - st.lastFlip[i] < 6) st.jitter[i]++; st.lastFlip[i] = s.tick; }
        const lo = i === 0 ? C.CAT_HW : C.NET_X + C.NET_HW + C.CAT_HW, hi = i === 0 ? C.NET_X - C.NET_HW - C.CAT_HW : C.W - C.CAT_HW;
        if ((d < 0 && c.x <= lo + 0.01) || (d > 0 && c.x >= hi - 0.01)) st.stuck[i]++;
      }
      if (d) st.lastDir[i] = d;
    }
    const ev = V.step(s, ins[0], ins[1]);
    if (s.phase === 'play') st.rallyTicks++;
    for (const e of ev) {
      if (e.t === 'hit' && e.kind === 'smash') st.smash++;
      if (e.t === 'hit' && e.kind === 'dig') st.dig++;
      if (e.t === 'fault') st.faults++;
      if (e.t === 'point') { st.crosses.push(s.crosses); st.maxRally = Math.max(st.maxRally, st.rallyTicks); st.rallyTicks = 0; }
    }
  }
  return { s, st };
}
const pairs = [['easy', 'normal'], ['normal', 'hard'], ['easy', 'hard'], ['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard']];
const N = 16;
const table = [];
let worstStuck = 0, worstJitter = 0, worstRally = 0, unfinished = 0, sideWins = [0, 0];
for (const [x, y] of pairs) {
  let yw = 0, cr = 0, nr = 0, secs = 0, sm = 0, dg = 0, fl = 0;
  for (let k = 0; k < N; k++) {
    const swap = k % 2 === 1, seed = 1000 + k * 17 + x.length * 3 + y.length;
    const { s, st } = swap ? match(y, x, seed) : match(x, y, seed);
    if (s.phase !== 'over') unfinished++;
    if ((swap ? 0 : 1) === s.winner) yw++;
    if (x === y) sideWins[s.winner]++;
    cr += st.crosses.reduce((a, b) => a + b, 0); nr += st.crosses.length; secs += s.tick / 60; sm += st.smash; dg += st.dig; fl += st.faults;
    for (let i = 0; i < 2; i++) {
      const g = st.groundTicks[i] / 3600 || 1;
      worstStuck = Math.max(worstStuck, st.stuck[i] / st.groundTicks[i]);
      worstJitter = Math.max(worstJitter, st.jitter[i] / g);
    }
    worstRally = Math.max(worstRally, st.maxRally / 60);
  }
  table.push({ 대결: `${B.TIERS[x].label} vs ${B.TIERS[y].label}`, [`${B.TIERS[y].label} 승`]: `${yw}/${N}`, 승률: Math.round(yw / N * 100) + '%', '랠리(넘김)': +(cr / nr).toFixed(2), '경기(초)': Math.round(secs / N), '스매시/점': +(sm / nr).toFixed(2), '다이빙받기/점': +(dg / nr).toFixed(2), '터치범실%': Math.round(fl / nr * 100) });
  if (x === 'normal' && y === 'hard') ok(yw / N >= 0.7, '고급이 중급을 대부분 이김', `${yw}/${N}`);
  if (x === 'easy' && y === 'normal') ok(yw / N >= 0.7, '중급이 초급을 대부분 이김', `${yw}/${N}`);
  if (x === 'easy' && y === 'hard') ok(yw / N >= 0.85, '고급이 초급을 거의 다 이김', `${yw}/${N}`);
  if (x === y) ok(cr / nr > 1.5, `${B.TIERS[x].label}끼리도 랠리가 이어짐`, +(cr / nr).toFixed(2));
}
console.table(table);
ok(unfinished === 0, '모든 경기가 끝남 (멈춘 경기 없음)', unfinished);
ok(worstRally < 55, '한 랠리가 55초를 넘지 않음 (끝없는 랠리 없음)', +worstRally.toFixed(1));
ok(worstStuck < 0.05, '벽·그물에 대고 계속 미는 일 없음', +worstStuck.toFixed(3));
ok(worstJitter < 40, '땅에서 좌우로 덜덜 떠는 일 없음 (6틱 안 방향 뒤집기/분)', +worstJitter.toFixed(1));
console.log(`  같은 단계끼리 왼쪽 승 ${sideWins[0]} · 오른쪽 승 ${sideWins[1]} · 가장 긴 랠리 ${worstRally.toFixed(1)}초 · 떨림 최대 ${worstJitter.toFixed(1)}/분`);
ok(Math.abs(sideWins[0] - sideWins[1]) <= N * 3 * 0.35, '왼쪽·오른쪽 유불리 없음', sideWins);

// 휘두르면 실제로 맞히나 (헛스윙만 하는 AI 는 어색함) · 서브 스매시도
{
  const rate = {};
  for (const tier of ['normal', 'hard']) {
    let sw = 0, hit = 0, sws = 0, hits = 0;
    for (let g = 0; g < 6; g++) {
      const s = V.create({ target: 11 }, 700 + g), bots = [B.create(tier, 0, g + 1), B.create(tier, 1, g + 50)], open = [null, null];
      while (s.phase !== 'over' && s.tick < 60 * 60 * 15) {
        for (const e of V.step(s, bots[0].act(s), bots[1].act(s))) {
          if (e.t === 'swing') { open[e.side] = { t: s.tick, serve: s.hits === 0 }; sw++; if (s.hits === 0) sws++; }
          if (e.t === 'hit' && e.kind === 'smash' && open[e.side]) { hit++; if (open[e.side].serve) hits++; open[e.side] = null; }
        }
        for (let i = 0; i < 2; i++) if (open[i] && s.tick - open[i].t > C.SWING_T) open[i] = null;
      }
    }
    rate[tier] = { swing: Math.round(hit / sw * 100), serve: sws ? Math.round(hits / sws * 100) : -1 };
    ok(hit / sw > 0.85, `${B.TIERS[tier].label}: 휘두르면 대부분 맞힘`, rate[tier]);
    ok(!sws || hits / sws > 0.7, `${B.TIERS[tier].label}: 서브 스매시도 대부분 맞힘`, rate[tier]);
  }
}
// 초보 사람 흉내(늦고 부정확·스매시 안 함)와 초급 AI: 초급이 너무 세지 않은지 참고로
{
  B.TIERS.novice = Object.assign({}, B.TIERS.easy, { label: '초보 사람', delay: 21, delayVar: 8, noise: 42, smash: 0, dive: 0.1, step: 18, jumpBump: 0 });
  let nw = 0, pts = [0, 0];
  for (let g = 0; g < 10; g++) {
    const swap = g % 2 === 1, s = V.create({ target: 11 }, 4400 + g);
    const bots = swap ? [B.create('easy', 0, g + 3), B.create('novice', 1, g + 9)] : [B.create('novice', 0, g + 3), B.create('easy', 1, g + 9)];
    while (s.phase !== 'over' && s.tick < 60 * 60 * 20) V.step(s, bots[0].act(s), bots[1].act(s));
    const ni = swap ? 1 : 0;
    if (s.winner === ni) nw++;
    pts[0] += s.score[ni]; pts[1] += s.score[1 - ni];
  }
  delete B.TIERS.novice;
  console.log(`  참고: 초보 사람 흉내 vs 초급 AI → ${nw}/10 승, 점수 ${pts[0]} : ${pts[1]}`);
  ok(pts[0] >= pts[1] * 0.3, '초보 흉내도 초급 AI 에게 점수는 꽤 냄 (초급이 벽 같지 않게)', pts);
}
// 수비만 잘하는 사람(공 떨어질 곳으로만 가고 점프·스매시 안 함, 0.1초 늦게 봄) vs 고급: 랠리가 끝없이 길어지지 않음
//   (수비만으로 버티는 전략이 통하면 학습 AI 가 그쪽으로 빠짐 → 공격이 이길 수 있어야 함)
{
  const follower = lag => { const hist = []; return { act: s => { hist.push({ ...s.ball }); if (hist.length > 30) hist.shift(); const L = V.predictLanding(hist[Math.max(0, hist.length - 1 - lag)], 300), me = s.cats[0]; const tx = L.x < C.NET_X ? L.x - 10 : V.homeX(0), dx = tx - me.x; return Math.abs(dx) < 6 ? 0 : dx > 0 ? IN.RIGHT : IN.LEFT; } }; };
  let longest = 0, sum = 0, nr = 0, done = 0, botWins = 0;
  for (let k = 0; k < 8; k++) {
    const s = V.create({ target: 7 }, 9000 + k * 13), me = follower(6), bot = B.create('hard', 1, 9005 + k * 13);
    let rt = 0;
    while (s.phase !== 'over' && s.tick < 60 * 60 * 10) {
      for (const e of V.step(s, me.act(s), bot.act(s))) if (e.t === 'point') { longest = Math.max(longest, rt); sum += rt; nr++; rt = 0; }
      if (s.phase === 'play') rt++;
    }
    if (s.phase === 'over') done++;
    if (s.winner === 1) botWins++;
    longest = Math.max(longest, rt);
  }
  console.log(`  수비만 하는 사람 vs 고급: 고급 ${botWins}/8 승 · 평균 랠리 ${(sum / nr / 60).toFixed(1)}초 · 가장 긴 랠리 ${(longest / 60).toFixed(0)}초`);
  ok(done === 8 && botWins >= 7, '수비만으로는 고급을 못 버팀 (모든 경기가 끝나고 고급이 이김)', [done, botWins]);
  ok(sum / nr < 25 * 60 && longest < 120 * 60, '수비만 하는 상대와도 랠리가 끝없이 길어지지 않음', [+(sum / nr / 60).toFixed(1), +(longest / 60).toFixed(0)]);
}
// AI 한 번 생각하는 시간 (화면이 끊기지 않게 · 웹 워커 없이 돌려도 되는지)
//   벽시계 최대값은 GC·다른 프로그램에 흔들려서 99% 값으로 확인하고 최대값은 참고로만 보여 줌
{
  const s = V.create({ target: 15 }, 99), a = B.create('hard', 0, 1), b = B.create('hard', 1, 2);
  const ts = [];
  for (let w = 0; w < 300; w++) { a.act(s); b.act(s); V.step(s, 0, 0); }   // 데우기
  while (s.phase !== 'over' && ts.length < 20000) {
    const t0 = process.hrtime.bigint(); const x = a.act(s); const y = b.act(s);
    ts.push(Number(process.hrtime.bigint() - t0) / 1e6); V.step(s, x, y);
  }
  const sorted = ts.slice().sort((p, q) => p - q), p99 = sorted[Math.floor(sorted.length * 0.99)], avg = ts.reduce((p, q) => p + q, 0) / ts.length;
  console.log(`  AI 생각 시간: 평균 ${(avg * 1000).toFixed(0)}µs · 99% ${(p99 * 1000).toFixed(0)}µs · 최대 ${sorted[sorted.length - 1].toFixed(2)}ms (두 마리 한 틱)`);
  ok(p99 < 4, 'AI 가 거의 늘 한 틱에 4ms 안에 생각함 (99%)', +p99.toFixed(3));
}

console.log(`\n${fail ? '✗ 실패' : '✓ 통과'}: ${pass}개 통과, ${fail}개 실패 · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);

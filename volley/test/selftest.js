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

// ─────────────────────────────────────────────
section('2:2 복식');
const run4 = (s, n, ins) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...V.step(s, ins[0] || 0, ins[1] || 0, ins[2] || 0, ins[3] || 0)); return ev; };
function dblBots(seed, tA, tB) {
  const tl = {}, tr = {};
  return [0, 1, 2, 3].map(k => B.create((k & 1) ? tB : tA, k & 1, seed * 7 + k, { cat: k, team: (k & 1) ? tr : tl }));
}
{
  // 1:1 상태 모양은 그대로 (복식 필드 없음)
  const s1 = V.create({ target: 7 }, 5);
  ok(s1.cats.length === 2 && !('team' in s1) && !('rot' in s1), '1:1 상태에는 복식 필드가 없음 (예전 저장·학습 그대로)');
  const s = V.create({ target: 7, team: 2, server: 0 }, 5);
  ok(s.team === 2 && s.cats.length === 4 && s.serveCat === 0, '복식: 고양이 넷 · 첫 서브는 왼쪽 0번', [s.cats.length, s.serveCat]);
  ok(V.sideOf(0) === 0 && V.sideOf(2) === 0 && V.sideOf(1) === 1 && V.sideOf(3) === 1, '0·2 왼쪽 · 1·3 오른쪽');
  const xs = s.cats.map(c => c.x);
  ok(xs[0] < xs[2] && xs[2] < C.NET_X && xs[1] > C.NET_X && xs[3] > xs[1], '서브 편은 서버가 뒤 · 짝이 앞, 받는 편은 처음 서브를 가져올 때 앞(1번)이 돌아 뒤로 감', xs);
  ok(Math.abs(s.ball.x - (xs[0] + C.SERVE_DX)) < 1e-9, '공은 서버(뒤 고양이) 머리 위');
  // 그물·벽은 넷 모두에게
  const s2 = V.create({ team: 2, server: 0 }, 6);
  run4(s2, 150, [IN.RIGHT, IN.LEFT, IN.RIGHT, IN.LEFT]);
  ok(s2.cats.every((c, k) => (k & 1) ? c.x >= C.NET_X + C.NET_HW + C.CAT_HW - 1e-9 : c.x <= C.NET_X - C.NET_HW - C.CAT_HW + 1e-9), '넷 다 그물을 못 넘음', s2.cats.map(c => Math.round(c.x)));
  // 같은 편끼리 끼지 않음: 둘이 같은 쪽 벽으로 밀어 붙여도, 한쪽이 비켜 가면 바로 떨어짐
  const s3 = V.create({ team: 2, server: 0 }, 7); s3.phase = 'play'; s3.ball.y = 9999;
  run4(s3, 120, [IN.LEFT, 0, IN.LEFT, 0]);
  const gapWall = Math.abs(s3.cats[2].x - s3.cats[0].x);
  ok(s3.cats[0].x >= C.CAT_HW - 1e-9 && s3.cats[2].x >= C.CAT_HW - 1e-9, '벽에 몰려도 둘 다 코트 안');
  run4(s3, 40, [0, 0, IN.RIGHT, 0]);
  ok(Math.abs(s3.cats[2].x - s3.cats[0].x) > 150, '벽에 몰린 짝에서 비켜 가면 막힘 없이 떨어짐 (끼지 않음)', [gapWall, Math.round(s3.cats[2].x - s3.cats[0].x)]);
  // 서로 마주 달려도 겹친 채 멈추지 않고 밀려남, 위아래로 떨어져 있으면 지나감
  const s4 = V.create({ team: 2, server: 0 }, 8); s4.phase = 'play'; s4.ball.y = 9999;
  s4.cats[0].x = 150; s4.cats[2].x = 151;
  run4(s4, 60, [0, 0, 0, 0]);
  ok(Math.abs(s4.cats[2].x - s4.cats[0].x) >= C.TM_SEP - 1e-6, '딱 겹친 짝은 부드럽게 떼어 놓음', Math.round(s4.cats[2].x - s4.cats[0].x));
  const s5 = V.create({ team: 2, server: 0 }, 9); s5.phase = 'play'; s5.ball.y = 9999;
  s5.cats[0].x = 100; s5.cats[2].x = 200; s5.cats[2].y = 100; s5.cats[2].ground = false; s5.cats[2].vy = 0;
  const pushFree = (() => { const a = V.clone(s5); a.cats[2].y = 100; V.step(a, IN.RIGHT, 0, 0, 0); return a.cats[2].x; })();
  ok(Math.abs(pushFree - 200) < 1e-9, '위에 떠 있는 짝은 밀지 않음 (밑으로 지나갈 수 있음)', pushFree);
  // 터치: 같은 편 다른 고양이는 붙어 있어도 새 터치
  const s6 = V.create({ team: 2, server: 0, maxTouches: 3 }, 10); s6.phase = 'play';
  s6.cats[0].x = 120; s6.cats[2].x = 200;
  s6.ball = { x: 120, y: 120, vx: 0, vy: -2 };
  const ev6 = run4(s6, 6, [0, 0, 0, 0]);
  s6.ball = { x: 200, y: 120, vx: 0, vy: -2 };
  const ev7 = run4(s6, 6, [0, 0, 0, 0]);
  const h6 = ev6.find(e => e.t === 'hit'), h7 = ev7.find(e => e.t === 'hit');
  ok(h6 && h6.cat === 0 && h7 && h7.cat === 2 && s6.touches[0] === 2 && s6.lastCat === 2, '짝에게 넘기면 터치 2 (hit 이벤트에 cat 번호)', [h6 && h6.cat, h7 && h7.cat, s6.touches[0]]);
  // 서브 돌아가기: 서브를 되찾은 편은 다른 고양이가 서브 → 넷이 돌아가며
  const s7 = V.create({ team: 2, server: 0, target: 99 }, 11), order = [s7.serveCat];
  const win = w => { const land = 1 - w; s7.phase = 'play'; s7.ball = { x: land ? 500 : 140, y: C.BALL_R + 1, vx: 0, vy: -3 }; run4(s7, 1 + C.POINT_T + 2, [0, 0, 0, 0]); order.push(s7.serveCat); };
  win(1); win(0); win(1); win(0); win(0); win(1);
  ok(order.join('') === '0123001', '서브 차례: 0 → 1 → 2 → 3 → 0 (점수 낸 편이 계속 서브)', order.join(''));
  const s8 = V.create({ team: 2, server: 1 }, 12);
  ok(s8.serveCat === 1 && s8.cats[1].x > s8.cats[3].x, '오른쪽이 먼저 서브해도 1번이 뒤에서');
  // 거울·저장
  const m = V.mirror(s7);
  ok(m.cats.length === 4 && m.serveCat === (s7.serveCat ^ 1) && m.rot[0] === s7.rot[1] && Math.abs(m.cats[0].x - (C.W - s7.cats[1].x)) < 1e-9, '복식 거울 상태');
  const back = V.fromJSON(JSON.stringify(s7));
  ok(back && V.hash(back) === V.hash(s7), '복식 상태도 JSON 으로 저장·복원');
  // obsTeam
  const o = V.obsTeam(s7, 2);
  ok(o.length === V.OBS_N2 && Array.from(o).every(Number.isFinite), `복식 obs 길이 ${V.OBS_N2} · 모두 유한`);
  const om = V.obsTeam(V.mirror(s7), 3);
  ok(Array.from(o).every((v, i) => Math.abs(v - om[i]) < 1e-6), '복식 obs 도 거울 쪽과 같음');
}
// 결정성 · 봇끼리 복식
{
  const play = (seed, cut) => {
    let s = V.create({ target: 5, team: 2 }, seed); const bots = dblBots(seed, 'hard', 'normal'); let evN = 0;
    for (let t = 0; t < 6000 && s.phase !== 'over'; t++) {
      const ins = bots.map(b => b.act(s));
      evN += V.step(s, ins[0], ins[1], ins[2], ins[3]).length;
      if (cut && t === 2500) s = V.fromJSON(JSON.stringify(s));
    }
    return V.hash(s) + ':' + evN;
  };
  ok(play(3) === play(3) && play(3) === play(3, true), '복식도 같은 씨앗·봇 → 같은 해시 (중간 JSON 복사 포함)');
  const rows = [], touchBy = [0, 0, 0, 0];
  let games = 0, done = 0, longest = 0, maxStick = 0, serveSet = new Set(), coverOK = 0, coverN = 0, rallyCross = 0, points = 0;
  for (const [tA, tB] of [['hard', 'hard'], ['normal', 'normal'], ['normal', 'hard'], ['easy', 'normal']]) {
    let wA = 0;
    for (let g = 0; g < 4; g++) {
      const seed = 500 + games * 13, s = V.create({ target: 7, team: 2 }, seed), bots = dblBots(seed, tA, tB);
      const stick = [0, 0];
      while (s.phase !== 'over' && s.tick < 40000) {
        const ins = bots.map(b => b.act(s));
        const ev = V.step(s, ins[0], ins[1], ins[2], ins[3]);
        for (const e of ev) { if (e.t === 'hit' && e.cat != null) touchBy[e.cat]++; if (e.t === 'serve') serveSet.add(e.cat); if (e.t === 'point') { points++; } }
        for (const sd of [0, 1]) {
          const a = s.cats[sd], b = s.cats[sd + 2];
          stick[sd] = Math.abs(a.x - b.x) < 40 && Math.abs(a.y - b.y) < 40 ? stick[sd] + 1 : 0;
          if (stick[sd] > maxStick) maxStick = stick[sd];
          // 공이 내 편에 있을 때 둘 중 하나는 앞(그물 쪽 절반), 하나는 뒤에 있나 (역할 나누기)
          if (s.phase === 'play' && s.tick % 15 === 0 && (sd === 0 ? s.ball.x < C.NET_X : s.ball.x > C.NET_X)) {
            coverN++; const da = Math.abs(a.x - C.NET_X), db = Math.abs(b.x - C.NET_X);
            if (Math.abs(da - db) > 60) coverOK++;
          }
        }
      }
      games++; if (s.phase === 'over') done++; if (s.winner === 0) wA++;
      if (s.stats.longest > longest) longest = s.stats.longest;
      rallyCross += s.stats.longest;
    }
    rows.push({ 대결: `${tA} vs ${tB}`, 왼쪽승: `${wA}/4` });
  }
  console.table(rows);
  console.log(`  고양이별 터치 ${touchBy.join(' / ')} · 가장 긴 랠리 ${longest}번 넘김 · 같은 편 겹침 최대 ${maxStick}틱 · 앞뒤 나눔 ${(coverOK / coverN * 100).toFixed(0)}%`);
  ok(done === games, '봇 복식 경기가 모두 끝까지 감 (멈춤 없음)', [done, games]);
  ok(touchBy.every(n => n > 0.12 * touchBy.reduce((p, q) => p + q, 0)), '넷 모두 공을 고루 받음 (한 마리만 뛰지 않음 = 같이 함)', touchBy);
  ok(serveSet.size === 4, '네 고양이 모두 서브해 봄', [...serveSet]);
  ok(longest >= 8, '복식도 랠리가 이어짐 (공에 닿을 수 있음)', longest);
  ok(maxStick < 45, '같은 편 둘이 0.75초 넘게 겹쳐 있지 않음', maxStick);
  ok(coverOK / coverN > 0.6, '공이 내 편에 오면 대개 하나는 앞·하나는 뒤 (자리 나눔)', +(coverOK / coverN).toFixed(2));
  const hh = { w: 0 };
  for (let g = 0; g < 6; g++) { const seed = 900 + g, s = V.create({ target: 5, team: 2 }, seed), bots = dblBots(seed, 'hard', 'easy'); while (s.phase !== 'over' && s.tick < 40000) { const ins = bots.map(b => b.act(s)); V.step(s, ins[0], ins[1], ins[2], ins[3]); } if (s.winner === 0) hh.w++; }
  ok(hh.w >= 5, '복식에서도 고급 팀이 초급 팀을 이김', hh.w);
}

// ─────────────────────────────────────────────
section('한 기기 키 묶음 (keys.js)');
{
  const K = require(path.join(__dirname, '..', 'keys.js'));
  const { L, R, J, S } = K.BITS;
  let allOk = true, bad = null;
  for (let m = 1; m < 16; m++) {                                    // 사람 자리 조합 15가지 모두
    const hs = [0, 1, 2, 3].filter(k => m & (1 << k)), { map } = K.build(hs);
    for (const k of [0, 1, 2, 3]) {
      const bits = Object.values(map).filter(v => v[0] === k).reduce((a, v) => a | v[1], 0);
      const want = hs.includes(k) ? (L | R | J | S) : 0;
      if (bits !== want) { allOk = false; bad = { hs, k, bits }; }
    }
  }
  ok(allOk, '사람 자리 어떤 조합이든 자리마다 이동·점프·스매시 키가 다 있고, AI 자리엔 키가 없음 (한 키 = 한 자리)', bad);
  const old2 = { KeyA: [0, L], KeyD: [0, R], KeyW: [0, J], KeyF: [0, S], KeyS: [0, S], KeyG: [0, S], Space: [0, S], ArrowLeft: [1, L], ArrowRight: [1, R], ArrowUp: [1, J], Enter: [1, S], NumpadEnter: [1, S], Slash: [1, S], ArrowDown: [1, S] };
  const two = K.build([0, 1]).map;
  ok(JSON.stringify(Object.keys(old2).sort().map(c => [c, two[c]])) === JSON.stringify(Object.keys(old2).sort().map(c => [c, old2[c]])) && Object.keys(two).length === Object.keys(old2).length, '둘이서(왼쪽①·오른쪽①)는 예전 1P·2P 키 그대로');
  const four = K.build([0, 1, 2, 3]).map;
  ok(four.KeyF[0] === 2 && four.KeyG[0] === 2 && four.KeyS[0] === 0 && four.Numpad5[0] === 3 && four.KeyK[0] === 3, '넷이면 F·G 는 왼쪽② 몫, S 는 왼쪽① 스매시, 숫자판·IJKL 은 오른쪽②');
  // 사람 4명 복식이 한 판 끝까지 (사람 대신 봇 입력을 자리 키로 흉내)
  const s = V.create({ target: 3, team: 2 }, 77), tl = {}, tr = {};
  const bots = [0, 1, 2, 3].map(k => B.create('normal', k & 1, 70 + k, { cat: k, team: (k & 1) ? tr : tl }));
  const inv = {}; for (const [c, [k, b]] of Object.entries(four)) if (!(k + ':' + b in inv)) inv[k + ':' + b] = c;
  let okKeys = true;
  while (s.phase !== 'over' && s.tick < 30000) {
    const ins = bots.map(b => b.act(s));
    const down = new Set(); ins.forEach((v, k) => { for (const b of [L, R, J, S]) if (v & b) down.add(inv[k + ':' + b]); });
    const back = [0, 0, 0, 0]; for (const c of down) { const m = four[c]; back[m[0]] |= m[1]; }
    if (back.some((v, k) => v !== ins[k])) okKeys = false;
    V.step(s, back[0], back[1], back[2], back[3]);
  }
  ok(okKeys && s.phase === 'over', '키 4묶음으로 넷이 동시에 눌러도 서로 안 섞이고 한 판이 끝남', [okKeys, s.phase]);
}

console.log(`\n${fail ? '✗ 실패' : '✓ 통과'}: ${pass}개 통과, ${fail}개 실패 · ${((Date.now() - T0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);

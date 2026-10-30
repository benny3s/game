/* 땅따먹기 자체 점검 — node game/land/test/selftest.js
   1) 규칙 하나하나 (선·땅 먹기·주머니 여러 개·벽·내 선·끊기·머리 박기·포위·다시 태어나기·시간 끝)
   2) 결정성 (같은 씨앗·같은 입력 = 같은 해시, 저장했다 이어 해도 같음)
   3) 봇끼리 여러 판: 멈춤·오류 없음, 땅 나눔, 아웃 이유, 난이도 순서 (고급 > 중급 > 초급) */
'use strict';
const path = require('path');
const Land = require(path.join(__dirname, '..', 'core.js'));
const Bots = require(path.join(__dirname, '..', 'bots.js'));

let pass = 0, fail = 0;
const t0 = Date.now();
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (기대 ${b}, 실제 ${a})`); }
function section(name) { console.log('■ ' + name); }

// ── 시나리오 도우미: 빈 판에 땅·머리를 직접 놓기
function blank(n, size, mode) {
  const st = Land.create({ n, size, mode }, 7);
  st.owner.fill(0); st.trail.fill(0);
  for (const p of st.players) { p.area = 0; p.alive = false; p.wait = 1e9; p.trail = []; p.box = [0, 0, 0, 0]; }
  return st;
}
function land(st, pid, x0, y0, x1, y1) {
  const p = st.players[pid], W = st.W;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const c = y * W + x, o = st.owner[c];
    if (o === pid + 1) continue;
    if (o) st.players[o - 1].area--;
    st.owner[c] = pid + 1; p.area++;
  }
  if (!p.area || p.box[2] === 0 && p.box[3] === 0 && p.box[0] === 0) p.box = [x0, y0, x1, y1];
  p.box = [Math.min(p.box[0], x0), Math.min(p.box[1], y0), Math.max(p.box[2], x1), Math.max(p.box[3], y1)];
}
function head(st, pid, x, y, dir) { const p = st.players[pid]; p.x = x; p.y = y; p.dir = dir; p.alive = true; p.wait = 0; }
// 한 사람만 움직이게 (나머지는 KEEP), 절대 방향 문자열: U R D L, 숫자 = 그대로 몇 칸
function drive(st, pid, plan, others) {
  const evs = [];
  const A = { U: 3, R: 4, D: 5, L: 6 };
  for (const s of plan) {
    const m = /^([URDL]?)(\d+)$/.exec(s);
    const n = +m[2];
    for (let i = 0; i < n; i++) {
      const acts = new Array(st.n).fill(0);
      if (others) Object.assign(acts, others);
      acts[pid] = i === 0 && m[1] ? A[m[1]] : 0;
      evs.push(...Land.step(st, acts));
    }
  }
  return evs;
}
const at = (st, x, y) => st.owner[y * st.W + x];
const trailAt = (st, x, y) => st.trail[y * st.W + x];
function countOwner(st, k) { let n = 0; for (const o of st.owner) if (o === k) n++; return n; }

// ════════════════════════════════════════════════════════
section('규칙');
{
  // 처음 상태
  const st = Land.create({ n: 8 }, 123);
  eq(st.W, 72, '8명 판 크기');
  eq(st.players.length, 8, '인원');
  ok(st.players.every(p => p.area === 25 && p.alive), '모두 5x5 땅으로 시작');
  ok(st.players.every(p => countOwner(st, p.id + 1) === 25), '땅 칸 수 = area');
  const tot = st.players.reduce((s, p) => s + p.area, 0);
  eq(countOwner(st, 0), st.W * st.H - tot, '빈 칸 수');
}
{
  // 이동 · 돌기 · 되돌기 무시
  const st = blank(2, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 7, 7, 0);
  Land.step(st, [0, 0]); eq(st.players[0].y, 6, '한 틱에 한 칸 (위)');
  Land.step(st, [2, 0]); eq(st.players[0].dir, 1, '오른쪽으로 돌기'); eq(st.players[0].x, 8, '돈 방향으로 이동');
  Land.step(st, [6, 0]); eq(st.players[0].dir, 1, '절대 방향 180도 되돌기는 무시');
  Land.step(st, [1, 0]); eq(st.players[0].dir, 0, '왼쪽으로 돌기');
}
{
  // 선 긋고 네모로 돌아와 땅 먹기
  const st = blank(2, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 7, 7, 0);
  let ev = drive(st, 0, ['3']);                           // (7,6) (7,5) 안, (7,4) 밖
  eq(st.players[0].trail.length, 1, '내 땅을 나가면 선 시작');
  ok(ev.some(e => e.t === 'leave'), 'leave 이벤트');
  eq(st.players[0].exit, 5 * 20 + 7, '선 시작 칸 = 마지막 내 땅 칸');
  ev = drive(st, 0, ['2', 'R4', 'D4', 'L2']);            // (7,2)까지 → (11,2) → (11,6) → (9,6) 땅 도착
  const cap = ev.find(e => e.t === 'capture');
  ok(!!cap, '돌아오면 땅 먹기');
  eq(st.players[0].trail.length, 0, '땅 먹으면 선 없어짐');
  eq(cap.n, 12 + 7, '선 12칸 + 둘러싼 7칸');
  eq(st.players[0].area, 25 + 19, '넓이 늘어남');
  eq(countOwner(st, 1), st.players[0].area, 'area 장부 = 실제 칸 수');
  eq(at(st, 10, 3), 1, '둘러싼 칸이 내 땅');
  eq(at(st, 12, 3), 0, '바깥 칸은 그대로');
  ok(st.trail.every(t => t === 0), '선 칸 모두 지워짐');
}
{
  // 주머니 두 개를 한 번에
  const st = blank(2, 16);
  land(st, 0, 2, 2, 2, 8); land(st, 0, 2, 2, 5, 2); land(st, 0, 2, 5, 5, 5); land(st, 0, 2, 8, 5, 8);
  head(st, 0, 5, 2, 1);
  const before = st.players[0].area;
  const ev = drive(st, 0, ['1', 'D6', 'L1']);
  const cap = ev.find(e => e.t === 'capture');
  ok(!!cap, '빗 모양 땅에서 땅 먹기');
  eq(cap && cap.n, 7 + 12, '선 7칸 + 주머니 6칸 × 2');
  eq(st.players[0].area, before + 19, '두 주머니 다 채움');
  eq(at(st, 4, 3), 1, '위 주머니'); eq(at(st, 4, 7), 1, '아래 주머니');
}
{
  // 남의 땅도 둘러싸면 내 것
  const st = blank(3, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 7, 7, 0);
  land(st, 1, 9, 3, 10, 4); head(st, 1, 15, 15, 0); st.players[1].alive = true;   // 1번 땅 일부가 고리 안
  land(st, 1, 15, 14, 17, 17);
  const b1 = st.players[1].area;
  const ev = drive(st, 0, ['3', '2', 'R4', 'D4', 'L2'], { 1: 0 });
  const cap = ev.find(e => e.t === 'capture');
  ok(cap && cap.stolen === 4, '남의 땅 4칸 뺏음');
  eq(st.players[1].area, b1 - 4, '뺏긴 쪽 넓이 줄어듦');
  ok(st.players[1].alive, '땅이 남아 있으면 살아 있음');
}
{
  // 벽
  const st = blank(2, 20);
  land(st, 0, 0, 4, 3, 8); head(st, 0, 0, 6, 3);
  const ev = Land.step(st, [0, 0]);
  const d = ev.find(e => e.t === 'death');
  ok(d && d.cause === 'wall' && d.p === 0, '종이 밖으로 나가면 아웃');
  eq(countOwner(st, 1), 0, '아웃되면 땅이 사라짐');
  eq(st.players[0].area, 0, 'area 0');
}
{
  // 내 선 밟기
  const st = blank(2, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 7, 7, 0);
  const ev = drive(st, 0, ['5', 'R1', 'D1', 'L1']);   // (7,2) → (8,2) → (8,3) → (7,3)=내 선
  const d = ev.find(e => e.t === 'death');
  ok(d && d.cause === 'self', '내 선을 밟으면 아웃');
  ok(st.trail.every(t => t === 0), '선 지워짐');
}
{
  // 남이 내 선을 끊음 → 나만 아웃, 끊은 쪽 무사 + 킬
  const st = blank(2, 20);
  land(st, 0, 2, 2, 4, 4); head(st, 0, 4, 3, 1);
  land(st, 1, 10, 10, 12, 12); head(st, 1, 7, 8, 0);
  drive(st, 0, ['3']);                                  // 0번: (5,3)(6,3)(7,3) 선 · 1번: 위로 (7,5)
  Land.step(st, [0, 0]);                                // 0번 (8,3), 1번 (7,4)
  const ev2 = Land.step(st, [0, 0]);                   // 1번 (7,3) = 0번 선 → 0번 아웃
  const d = ev2.find(e => e.t === 'death');
  ok(d && d.p === 0 && d.cause === 'cut' && d.by === 1, '선을 밟힌 쪽이 아웃 (cut)');
  ok(st.players[1].alive, '밟은 쪽은 살아 있음');
  eq(st.players[1].kills, 1, '킬 1');
}
{
  // 머리끼리 같은 칸 (둘 다 땅 밖) → 둘 다 아웃
  const st = blank(2, 20);
  land(st, 0, 1, 1, 3, 3); land(st, 1, 15, 15, 17, 17);
  head(st, 0, 5, 9, 1); head(st, 1, 7, 9, 3);
  st.players[0].trail = [9 * 20 + 5]; st.trail[9 * 20 + 5] = 1; st.players[0].exit = 3 * 20 + 3;
  st.players[1].trail = [9 * 20 + 7]; st.trail[9 * 20 + 7] = 2; st.players[1].exit = 15 * 20 + 15;
  const e = Land.step(st, [0, 0]).filter(x => x.t === 'death');
  eq(e.length, 2, '머리끼리 박으면 둘 다 아웃');
  ok(e.every(x => x.cause === 'crash' && x.by === -1), '이유 crash, 공 없음');
}
{
  // 머리끼리 같은 칸인데 한 사람의 땅 → 땅 주인만 삶
  const st = blank(2, 20);
  land(st, 0, 1, 1, 3, 3); land(st, 1, 6, 6, 9, 12);
  head(st, 0, 4, 9, 1); head(st, 1, 7, 9, 3);         // (5,9)? 1번 땅은 x 6..9 → 같은 칸 (6,9)는 1번 땅
  st.players[0].trail = [9 * 20 + 4]; st.trail[9 * 20 + 4] = 1; st.players[0].exit = 3 * 20 + 3;
  Land.step(st, [0, 0]);                                 // 0번 (5,9), 1번 (6,9)
  const e = Land.step(st, [0, 0]).filter(x => x.t === 'death');   // 0번 (6,9), 1번 (5,9)? → 서로 자리 바꿈이 아니라 확인
  ok(e.length >= 1 && e.some(x => x.p === 0), '남의 땅에서 머리 박으면 내가 아웃');
}
{
  const st = blank(2, 20);
  land(st, 0, 1, 1, 3, 3); land(st, 1, 6, 6, 9, 12);
  head(st, 0, 4, 9, 1); head(st, 1, 7, 9, 3);
  st.players[0].trail = [9 * 20 + 4]; st.trail[9 * 20 + 4] = 1; st.players[0].exit = 3 * 20 + 3;
  st.players[1].x = 6; st.players[1].dir = 3;            // 1번은 (6,9) 땅 위에서 왼쪽으로 → (5,9), 0번도 (5,9)
  const e = Land.step(st, [0, 0]).filter(x => x.t === 'death');
  eq(e.length, 2, '빈 칸에서 같이 들어가면 둘 다 아웃');
  const st2 = blank(2, 20);
  land(st2, 0, 1, 1, 3, 3); land(st2, 1, 5, 6, 9, 12);
  head(st2, 0, 4, 9, 1); head(st2, 1, 6, 9, 3);         // 같은 칸 (5,9) = 1번 땅
  st2.players[0].trail = [9 * 20 + 4]; st2.trail[9 * 20 + 4] = 1; st2.players[0].exit = 3 * 20 + 3;
  const e2 = Land.step(st2, [0, 0]).filter(x => x.t === 'death');
  ok(e2.length === 1 && e2[0].p === 0 && e2[0].cause === 'crash' && e2[0].by === 1, '그 칸 땅 주인만 살아남음');
}
{
  // 둘 다 자기 땅 위에서 자리 바꾸기 → 밟은 선이 없으니 아무 일 없이 엇갈림 (둘 다 남의 칸으로 나가 선 시작)
  const st = blank(2, 20);
  land(st, 0, 1, 7, 5, 11); land(st, 1, 6, 7, 10, 11);
  head(st, 0, 5, 9, 1); head(st, 1, 6, 9, 3);
  const e = Land.step(st, [0, 0]);
  ok(!e.some(x => x.t === 'death'), '자기 땅 위에서 자리 바꾸면 아무도 아웃 안 됨');
  ok(st.players[0].x === 6 && st.players[1].x === 5, '엇갈려 지나감');
  ok(st.players[0].trail.length === 1 && st.players[1].trail.length === 1, '둘 다 남의 땅에 들어가 선 시작');
}
{
  // 처음 자리: 자리 번호와 상관없이 고르게 (0번만 늘 가운데면 안 됨)
  const sum = new Array(8).fill(0), G = 200;
  for (let s = 0; s < G; s++) {
    const st = Land.create({ n: 8 }, s * 7 + 1), c = (st.W - 1) / 2;
    st.players.forEach((p, i) => { sum[i] += Math.hypot(p.x - c, p.y - c); });
  }
  const others = sum.slice(1).reduce((a, b) => a + b, 0) / 7;
  ok(Math.abs(sum[0] - others) / others < 0.3, `0번 자리도 가운데에서 비슷하게 떨어짐 (0번 ${(sum[0] / G).toFixed(1)} · 나머지 ${(others / G).toFixed(1)}칸)`);
}
{
  // 서로 자리 바꾸기 (둘 다 밖) → crash 로 둘 다 아웃, 공 없음
  const st = blank(2, 20);
  land(st, 0, 1, 1, 3, 3); land(st, 1, 15, 15, 17, 17);
  head(st, 0, 5, 9, 1); head(st, 1, 6, 9, 3);
  st.players[0].trail = [9 * 20 + 5]; st.trail[9 * 20 + 5] = 1; st.players[0].exit = 3 * 20 + 3;
  st.players[1].trail = [9 * 20 + 6]; st.trail[9 * 20 + 6] = 2; st.players[1].exit = 15 * 20 + 15;
  const e = Land.step(st, [0, 0]).filter(x => x.t === 'death');
  ok(e.length === 2 && e.every(x => x.cause === 'crash' && x.by === -1), '마주 보고 엇갈리면 머리 박기');
  eq(st.players[0].kills + st.players[1].kills, 0, '킬 없음');
}
{
  // 포위: 새로 칠한 칸 위에 머리가 있으면 (자기 땅 위라도) 아웃
  const st = blank(2, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 11, 6, 3);
  st.players[0].trail = [];
  // 0번 선: (7,4)(7,3)(7,2)(8,2)(9,2)(10,2)(11,2)(11,3)(11,4)(11,5)(11,6) 이미 그어 둠, 다음 칸 (10,6) → (9,6) 땅
  const path = [[7, 4], [7, 3], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6]];
  for (const [x, y] of path) { st.trail[y * 20 + x] = 1; st.players[0].trail.push(y * 20 + x); }
  st.players[0].exit = 5 * 20 + 7;
  land(st, 1, 8, 3, 9, 4); head(st, 1, 9, 4, 3);         // 1번: 고리 안에 땅 + 머리, 왼쪽으로 가면 (8,4) 자기 땅
  land(st, 1, 15, 15, 16, 16);                           // 다른 곳에도 땅 (전멸 아님)
  Land.step(st, [0, 0]);                                 // 0번 (10,6), 1번 (8,4)
  const e = Land.step(st, [0, 2]).filter(x => x.t === 'death');   // 0번 (9,6) 땅 → 먹기. 1번은 위로 (8,3) 자기 땅
  ok(e.some(x => x.p === 1 && x.cause === 'trap' && x.by === 0), '둘러싸인 머리 = 포위 아웃');
  eq(st.players[0].kills, 1, '포위도 킬');
  ok(countOwner(st, 2) === 0, '포위당한 쪽 땅 모두 사라짐');
}
{
  // 땅 전멸: 상대 땅이 모두 고리 안 + 상대 머리는 밖에서 선 긋는 중
  const st = blank(2, 20);
  land(st, 0, 5, 5, 9, 9); head(st, 0, 11, 6, 3);
  const path = [[7, 4], [7, 3], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6]];
  for (const [x, y] of path) { st.trail[y * 20 + x] = 1; st.players[0].trail.push(y * 20 + x); }
  st.players[0].exit = 5 * 20 + 7;
  land(st, 1, 8, 3, 9, 3); head(st, 1, 16, 16, 0);
  st.players[1].trail = [16 * 20 + 16]; st.trail[16 * 20 + 16] = 2; st.players[1].exit = 3 * 20 + 9;
  Land.step(st, [0, 0]);
  const e = Land.step(st, [0, 0]).filter(x => x.t === 'death');
  ok(e.some(x => x.p === 1 && x.cause === 'wipe' && x.by === 0), '땅을 다 뺏기면 아웃 (wipe)');
}
{
  // 다시 태어나기 (클래식 2초) · 한 목숨은 그대로 · 마지막 한 명이면 끝
  const st = Land.create({ n: 3, mode: 'classic' }, 5);
  const p = st.players[0];
  p.x = 0; p.dir = 3;
  // 0번을 벽으로
  let died = -1, spawned = -1;
  for (let i = 0; i < 40 && spawned < 0; i++) {
    const evs = Land.step(st, [6, 0, 0]);
    for (const e of evs) { if (e.t === 'death' && e.p === 0 && died < 0) died = st.tick; if (e.t === 'spawn' && e.p === 0) spawned = st.tick; }
  }
  ok(died > 0, '벽으로 아웃');
  eq(spawned - died, Land.C.RESPAWN, '2초(16틱) 뒤 다시 태어남');
  eq(st.players[0].area, 25, '새 5x5 땅');
  const s2 = Land.create({ n: 2, mode: 'life' }, 5);
  s2.players[0].x = 0; s2.players[0].dir = 3;
  const evs = Land.step(s2, [6, 0]);
  ok(evs.some(e => e.t === 'end'), '한 목숨: 한 명 남으면 끝');
  eq(s2.results[0].id, 1, '살아남은 쪽이 1등');
  for (let i = 0; i < 30; i++) Land.step(s2, [0, 0]);
  ok(!s2.players[0].alive, '한 목숨은 다시 안 태어남');
}
{
  // 시간 끝 → 순위
  const st = Land.create({ n: 4, limitSec: 2 }, 9);
  let end = null;
  for (let i = 0; i < 40 && !end; i++) for (const e of Land.step(st, [0, 0, 0, 0])) if (e.t === 'end') end = e;
  ok(!!end, '시간이 다 되면 끝');
  eq(st.tick, 16, '2초 = 16틱');
  ok(end.results.every((r, i, a) => i === 0 || a[i - 1].area >= r.area), '땅 넓은 순서');
  eq(Land.step(st, [0, 0, 0, 0]).length, 0, '끝난 뒤엔 진행 안 함');
}
{
  // 관찰: 크기 · 앞쪽 머리 · 판 밖
  const st = blank(2, 30);
  land(st, 0, 0, 10, 4, 14); head(st, 0, 0, 12, 0);
  land(st, 1, 20, 20, 22, 22); head(st, 1, 0, 9, 2);      // 1번 머리: 0번 바로 앞 3칸
  const o = Land.obs(st, 0);
  const S = Land.C.OBS_S, A = S * S, R = Land.C.OBS_R;
  eq(o.length, Land.C.OBS_N, '관찰 길이');
  eq(o[4 * A + (R - 3) * S + R], 1, '앞 3칸 머리가 위쪽 3줄에 보임');
  eq(o[5 * A + R * S + (R - 1)], 1, '왼쪽 벽 밖 = 판 밖 채널');
  eq(o[0 * A + R * S + R], 1, '가운데 = 내 땅 위 내 머리');
  st.players[0].dir = 1;                                  // 오른쪽을 보면 위쪽(앞)이 +x
  const o2 = Land.obs(st, 0);
  eq(o2[5 * A + R * S + (R - 1)], 0, '돌리면 왼쪽(= 위 방향 y-1) 은 판 안');
  eq(o2[4 * A + R * S + (R - 3)], 1, '오른쪽을 보면 위쪽(y-3) 머리가 왼쪽 3칸');
  ok(Land.obs(st, 0, new Float32Array(Land.C.OBS_N)) instanceof Float32Array, '버퍼 다시 쓰기');
}
{
  // 저장 · 복원
  const st = Land.create({ n: 8 }, 77);
  const mems = st.players.map((p, i) => Bots.create(st, i, 'normal', 1000 + i));
  for (let i = 0; i < 200; i++) Land.step(st, st.players.map((p, j) => Bots.decide(st, j, mems[j])));
  const json = JSON.stringify(Land.toJSON(st));
  const back = Land.fromJSON(json);
  eq(Land.hash(back), Land.hash(st), '저장·복원 해시 같음');
  const acts = [0, 1, 2, 0, 1, 2, 0, 1];
  for (let i = 0; i < 50; i++) { Land.step(st, acts); Land.step(back, acts); }
  eq(Land.hash(back), Land.hash(st), '복원한 상태로 이어 해도 같음');
}

// ════════════════════════════════════════════════════════
section('결정성');
function runGame(seed, tiers, opts) {
  opts = opts || {};
  const st = Land.create({ n: tiers.length, mode: opts.mode || 'classic', limitSec: opts.limitSec || 180 }, seed);
  const mems = tiers.map((t, i) => Bots.create(st, i, t, seed * 31 + i * 7919 + 1));
  const deaths = {}, perTier = {};
  let ticks = 0, captures = 0, bigCap = 0;
  while (!st.over) {
    const acts = new Array(st.n);
    for (let i = 0; i < st.n; i++) acts[i] = Bots.decide(st, i, mems[i]);
    for (const e of Land.step(st, acts)) {
      if (e.t === 'death') deaths[e.cause] = (deaths[e.cause] || 0) + 1;
      if (e.t === 'capture') { captures++; if (e.n > bigCap) bigCap = e.n; }
    }
    if (++ticks > 100000) throw new Error('끝나지 않음');
  }
  return { st, deaths, ticks, captures, bigCap };
}
{
  const tiers = ['hard', 'normal', 'easy', 'hard', 'normal', 'easy', 'normal', 'hard'];
  const a = runGame(42, tiers), b = runGame(42, tiers), c = runGame(43, tiers);
  eq(Land.hash(a.st), Land.hash(b.st), '같은 씨앗 = 같은 결과 (봇 3분 한 판)');
  ok(Land.hash(a.st) !== Land.hash(c.st), '다른 씨앗 = 다른 결과');
  // 무작위 행동도 결정적
  const r1 = Land.create({ n: 8 }, 5), r2 = Land.create({ n: 8 }, 5);
  const rr = { rng: 99 };
  const seq = [];
  for (let i = 0; i < 600; i++) { const acts = []; for (let j = 0; j < 8; j++) acts.push(Math.floor(Land.rand(rr) * 3)); seq.push(acts); }
  for (const acts of seq) Land.step(r1, acts);
  for (const acts of seq) Land.step(r2, acts);
  eq(Land.hash(r1), Land.hash(r2), '같은 행동 열 = 같은 해시');
}

// ════════════════════════════════════════════════════════
section('강화학습 환경 (env.js) · 관찰 숫자');
{
  const Env = require(path.join(__dirname, '..', 'env.js'));
  const mk = () => Env.make({ n: 8, agents: [0, 3], tier: 'normal' });
  const e1 = mk(), e2 = mk();
  const o1 = e1.reset(2024), o2 = e2.reset(2024);
  eq(o1.length, 2, '에이전트 2명 → 관찰 2개');
  eq(o1[0].length, Land.C.OBS_N, '관찰 길이 = OBS_N');
  ok(Land.hash(e1.state) === Land.hash(e2.state), 'reset 같은 씨앗 = 같은 상태');
  const rr = { rng: 7 };
  let sum = [0, 0], kills = [0, 0], deaths = [0, 0], steps = 0, done = false;
  while (!done && steps < 2000) {
    const a = [Math.floor(Land.rand(rr) * 3), Math.floor(Land.rand(rr) * 3)];
    const r1 = e1.step(a), r2 = e2.step(a);
    if (r1.rewards[0] !== r2.rewards[0] || r1.rewards[1] !== r2.rewards[1]) { ok(false, '같은 행동 = 같은 보상'); break; }
    for (const ev of r1.info.events) if (ev.t === 'death') { if (ev.p === 0) deaths[0]++; if (ev.p === 3) deaths[1]++; if (ev.by === 0 && ev.p !== 0) kills[0]++; if (ev.by === 3 && ev.p !== 3) kills[1]++; }
    sum[0] += r1.rewards[0]; sum[1] += r1.rewards[1]; steps++; done = r1.done;
  }
  ok(done, `무작위 행동으로도 끝까지 (${steps}번 동작)`);
  eq(Land.hash(e1.state), Land.hash(e2.state), '같은 씨앗 + 같은 행동 = 같은 해시 (env)');
  // 보상 합 = (마지막 땅 − 처음 땅)/전체 × 100 + 킬·아웃 보너스
  const tot = e1.state.W * e1.state.H;
  [0, 3].forEach((pid, k) => {
    const want = (e1.state.players[pid].area - 25) / tot * 100 + kills[k] * 0.5 - deaths[k] * 0.5;
    ok(Math.abs(sum[k] - want) < 1e-6, `보상 합 장부 맞음 (에이전트 ${pid}: ${sum[k].toFixed(3)})`);
  });
  // 봇 자리에 다른 정책 끼우기
  const e3 = Env.make({ n: 4, agents: [0] });
  e3.reset(5);
  let called = 0;
  e3.setPolicy(2, (st, pid) => { called++; return Land.ACT.KEEP; });
  for (let i = 0; i < 20; i++) e3.step([0]);
  eq(called, 20, 'setPolicy 로 끼운 정책이 매 틱 불림');
  e3.reset(6); called = 0;
  for (let i = 0; i < 10; i++) e3.step([0]);
  eq(called, 10, 'setPolicy 정책이 reset 뒤에도 남음');
  e3.clearPolicy(2); called = 0;
  for (let i = 0; i < 5; i++) e3.step([0]);
  eq(called, 0, 'clearPolicy 뒤엔 다시 봇');
  const e4 = Env.make({ n: 4, agents: [0] });
  let c4 = 0;
  ok(e4.setPolicy(1, () => { c4++; return 0; }), 'reset 전에 setPolicy 해도 됨');
  e4.reset(3); for (let i = 0; i < 4; i++) e4.step([0]);
  eq(c4, 4, 'reset 전에 끼운 정책도 불림');
  ok(!e4.setPolicy(0, () => 0), '에이전트 자리엔 못 끼움');
  // 관찰 숫자: 남은 시간 줄어듦 · 선 길이 · 죽으면 0
  const st = Land.create({ n: 2, limitSec: 10 }, 3);
  const S0 = Land.C.OBS_S * Land.C.OBS_S * Land.C.OBS_CH;
  const a0 = Land.obs(st, 0);
  ok(Math.abs(a0[S0 + 2] - 1) < 1e-6 && a0[S0 + 7] === 1, '처음: 남은 시간 1 · 살아 있음 1');
  ok(Math.abs(a0[S0] - 25 / (st.W * st.H)) < 1e-6, '내 땅 비율');
  for (let i = 0; i < 4; i++) Land.step(st, [0, 0]);
  const a1 = Land.obs(st, 0);
  ok(a1[S0 + 2] < 1, '틱이 가면 남은 시간 줄어듦');
  ok(Math.abs(a1[S0 + 1] - st.players[0].trail.length / 64) < 1e-6, '선 길이 숫자');
  st.players[0].x = 0; st.players[0].dir = 3; Land.step(st, [0, 0]);
  const a2 = Land.obs(st, 0);
  ok(!st.players[0].alive && a2.every(v => v === 0), '아웃되면 관찰이 모두 0 (살아 있음 0)');
}

// ════════════════════════════════════════════════════════
section('봇끼리');
{
  const TIER_NAMES = ['easy', 'normal', 'hard'];
  const sum = { easy: [], normal: [], hard: [] }, rankSum = { easy: [], normal: [], hard: [] }, kills = { easy: 0, normal: 0, hard: 0 }, deathsT = { easy: 0, normal: 0, hard: 0 };
  const lifeRank = { easy: [], normal: [], hard: [] }, lifeWin = { easy: 0, normal: 0, hard: 0 };
  const causes = {};
  let games = 0, ticks = 0, caps = 0, bigCap = 0, leaderPct = [], ms = 0, lifeGames = 0, lifeEarly = 0;
  const N = 48;
  for (let g = 0; g < N; g++) {
    // 판마다 난이도 자리를 돌려서 섞음 (8자리: 3·3·2 를 돌아가며)
    const pattern = ['easy', 'normal', 'hard', 'easy', 'normal', 'hard', ['easy', 'normal', 'hard'][g % 3], ['hard', 'easy', 'normal'][g % 3]];
    const tiers = pattern.map((_, i) => pattern[(i + g) % 8]);
    const s = Date.now();
    const life = g % 4 === 3;
    const r = runGame(1000 + g, tiers, { mode: life ? 'life' : 'classic' });
    ms += Date.now() - s;
    games++; ticks += r.ticks; caps += r.captures; bigCap = Math.max(bigCap, r.bigCap);
    for (const k in r.deaths) causes[k] = (causes[k] || 0) + r.deaths[k];
    for (const res of r.st.results) {
      const t = tiers[res.id];
      sum[t].push(res.pct); rankSum[t].push(res.rank);
      kills[t] += res.kills; deathsT[t] += res.deaths;
      if (life) { lifeRank[t].push(res.rank); if (res.rank === 1) lifeWin[t]++; }
    }
    if (life) { lifeGames++; if (r.st.tick < r.st.limit) lifeEarly++; ok(r.st.players.filter(p => p.alive).length <= 1 || r.st.tick >= r.st.limit, `판 ${g}: 한 목숨은 한 명 남거나 시간 끝`); }
    leaderPct.push(r.st.results[0].pct);
    ok(r.st.players.every(p => p.area === 0 || p.alive), `판 ${g}: 아웃된 사람은 땅 0`);
    let tot = 0; for (const p of r.st.players) tot += p.area;
    let cnt = 0; for (const o of r.st.owner) if (o) cnt++;
    eq(cnt, tot, `판 ${g}: 땅 장부 일치`);
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log(`  ${games}판 · 평균 ${Math.round(ticks / games)}틱 · 판당 ${(ms / games).toFixed(0)}ms (틱당 ${(ms / ticks).toFixed(3)}ms) · 땅 먹기 ${caps}번 · 가장 큰 한 번 ${bigCap}칸`);
  for (const t of TIER_NAMES) console.log(`  ${t.padEnd(6)} 평균 땅 ${avg(sum[t]).toFixed(2)}% · 평균 순위 ${avg(rankSum[t]).toFixed(2)} · 킬/판 ${(kills[t] / sum[t].length).toFixed(2)} · 아웃/판 ${(deathsT[t] / sum[t].length).toFixed(2)}`);
  console.log(`  1등 평균 ${avg(leaderPct).toFixed(1)}% · 아웃 이유: ` + Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log(`  한 목숨 ${lifeGames}판 (시간 전에 끝 ${lifeEarly}판) · 평균 순위 ` + TIER_NAMES.map(t => `${t} ${avg(lifeRank[t]).toFixed(2)}`).join(' · ') + ' · 1등 ' + TIER_NAMES.map(t => `${t} ${lifeWin[t]}`).join(' · '));
  ok(avg(sum.hard) > avg(sum.normal) && avg(sum.normal) > avg(sum.easy), '난이도 순서: 고급 > 중급 > 초급 (평균 땅)');
  ok(avg(rankSum.hard) < avg(rankSum.normal) && avg(rankSum.normal) < avg(rankSum.easy), '난이도 순서: 평균 순위 고급 > 중급 > 초급');
  ok(avg(lifeRank.hard) < avg(lifeRank.easy), '한 목숨에서도 고급이 초급보다 오래 살아남음');
  ok(avg(leaderPct) > 6 && avg(leaderPct) < 60, '1등 땅이 너무 작지도 크지도 않음');
  ok(caps / games > 40, '판마다 땅 먹기가 충분히 일어남');
  ok((causes.wall || 0) < games * 4, '봇이 벽에 자주 박지 않음');
}
{
  // 봐주기: 남을 안 보는 초보 사람 흉내(0번) vs 봇 7 — 초급은 사람 선을 거의 안 끊고, 중급도 덜 끊어야 함
  const DX = Land.DX, DY = Land.DY;
  function beginner(seed) {
    const m = { rng: seed >>> 0 || 1, plan: null, leg: 0, cnt: 0 };
    const room = (st, p, d) => { let x = p.x, y = p.y, k = 0; for (;;) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= st.W || y >= st.H || k > 40) return k; k++; } };
    const rel = (p, d) => d === ((p.dir + 3) & 3) ? 1 : d === ((p.dir + 1) & 3) ? 2 : 0;
    return (st, pid) => {
      const p = st.players[pid]; if (!p.alive) { m.plan = null; return 0; }
      if (!p.trail.length) {
        m.plan = null;
        if (room(st, p, p.dir) < 9 || Land.rand(m) < 0.08) { const best = [p.dir, (p.dir + 3) & 3, (p.dir + 1) & 3].sort((a, b) => room(st, p, b) - room(st, p, a))[0]; return rel(p, best); }
        return 0;
      }
      if (!m.plan) { m.plan = { a: 3 + Math.floor(Land.rand(m) * 4), side: room(st, p, (p.dir + 3) & 3) > room(st, p, (p.dir + 1) & 3) ? 1 : 2 }; m.leg = 0; }
      const n = p.trail.length;
      if (m.leg === 0 && (n >= m.plan.a || room(st, p, p.dir) < 3)) { m.leg = 1; m.cnt = n; return m.plan.side; }
      if (m.leg === 1 && (n - m.cnt >= m.plan.a || room(st, p, p.dir) < 3)) { m.leg = 2; return m.plan.side; }
      if (m.leg === 2) { const h = Bots.bfsHome(st, pid, p.y * st.W + p.x, p.dir); if (h[1] >= 0) return rel(p, h[1]); }
      return 0;
    };
  }
  function vsBots(tier, gentle, G) {
    let cut = 0, rank = 0;
    for (let g = 0; g < G; g++) {
      const seed = 3000 + g, st = Land.create({ n: 8 }, seed), me = beginner(9000 + g);
      const mems = st.players.map((p, i) => i ? Bots.create(st, i, tier, seed * 31 + i * 7919 + 1, gentle ? { gentle: [0] } : null) : null);
      while (!st.over) {
        const acts = st.players.map((p, i) => i ? Bots.decide(st, i, mems[i]) : me(st, 0));
        for (const e of Land.step(st, acts)) if (e.t === 'death' && e.p === 0 && e.cause === 'cut') cut++;
      }
      rank += st.results.find(r => r.id === 0).rank;
      if (g === 0 && gentle) ok(JSON.stringify(mems[1]).includes('"gentle":[0]'), '봐주기는 봇 기억에 적힘 (JSON 저장 가능)');
    }
    return { cut: cut / G, rank: rank / G };
  }
  const G = 12, eN = vsBots('easy', false, G), eG = vsBots('easy', true, G), nN = vsBots('normal', false, G), nG = vsBots('normal', true, G);
  console.log(`  초보 흉내가 끊긴 횟수/판: 초급 ${eN.cut.toFixed(2)} → 봐주기 ${eG.cut.toFixed(2)} (순위 ${eN.rank.toFixed(1)} → ${eG.rank.toFixed(1)}) · 중급 ${nN.cut.toFixed(2)} → ${nG.cut.toFixed(2)} (순위 ${nN.rank.toFixed(1)} → ${nG.rank.toFixed(1)})`);
  ok(eG.cut <= 0.5 && eG.cut < eN.cut, '초급은 봐주는 사람 선을 거의 안 끊음');
  ok(nG.cut <= nN.cut, '중급은 봐주는 사람을 덜 끊음');
}
{
  // 같은 난이도끼리도 오래 돌려서 멈춤 없는지
  for (const t of ['easy', 'normal', 'hard']) {
    const r = runGame(777, new Array(8).fill(t));
    ok(r.st.over && r.captures > 30, `${t} 8명: 끝까지 진행, 땅 먹기 ${r.captures}번`);
  }
  // 2명 · 4명 · 12명 판도 문제없이
  for (const n of [2, 4, 12]) {
    const r = runGame(55, new Array(n).fill('normal'), { limitSec: 60 });
    ok(r.st.over && r.st.W === Land.sizeFor(n), `${n}명 판 (${r.st.W}x${r.st.W}) 진행`);
  }
}

console.log(`\n${fail ? '실패' : '통과'}: ${pass}개 통과, ${fail}개 실패 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);

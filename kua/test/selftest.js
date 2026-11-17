/* 베니 크아 핵심 시뮬레이션 단위 테스트 (node kua/test/selftest.js) */
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Rules = require("../rules.js");
const Maps = require("../maps.js");
const Core = require("../core.js");
const Bots = require("../bots.js");

let passed = 0;
function test(name, fn) {
  fn();
  console.log("  ✓ " + name);
  passed++;
}

console.log("💦 KuaCore selftest");

test("1. KR00967 캐릭터 9종 스탯 & 맵 3종(.txt 일치 + L자 스폰 탈출로) 검증", () => {
  assert.strictEqual(Rules.CHAR_ORDER.length, 9);
  assert.strictEqual(Rules.CHARS.dao.maxBombs, 10);
  assert.strictEqual(Rules.CHARS.bazzi.maxSpeed, 9);
  assert.strictEqual(Rules.CHARS.dizni.maxPower, 9);
  assert(Rules.CHARS.rodumani.trapDeathMs < Rules.TIMING.TRAP_DEATH_MS, "로두마니 갇힘 사망 더 빠름");

  for (const m of Maps.MAP_DEFS) {
    const txtPath = path.join(__dirname, "../skins/default/maps", `${m.id}.txt`);
    const fileAscii = fs.readFileSync(txtPath, "utf8").trim().replace(/\r\n/g, "\n");
    assert.strictEqual(fileAscii, m.ascii, `${m.id}.txt 내용과 maps.js 일치`);

    const parsed = Maps.getMap(m.id);
    assert.strictEqual(parsed.grid.length, 13);
    assert.strictEqual(parsed.grid[0].length, 15);
    assert.strictEqual(parsed.spawns.length, 8, `${m.id} 스폰 8자리`);

    for (const sp of parsed.spawns) {
      let hasL = false;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const c1 = sp.c + dx, r1 = sp.r + dy;
        if (c1 < 0 || c1 >= 15 || r1 < 0 || r1 >= 13 || parsed.grid[r1][c1] !== ".") continue;
        for (const [px, py] of dirs) {
          if (px === dx && py === dy) continue;
          if (px === -dx && py === -dy) continue;
          const c2 = c1 + px, r2 = r1 + py;
          if (c2 >= 0 && c2 < 15 && r2 >= 0 && r2 < 13 && parsed.grid[r2][c2] === ".") hasL = true;
        }
      }
      assert(hasL, `${m.id} 스폰 #${sp.slot}(${sp.c},${sp.r})에 2칸 L자 안전 탈출로 존재`);
    }
  }
});

test("2. 연속 이동 · 모서리 걸치기 자동 미끄러짐 & 물풍선 통과 유예 검증", () => {
  const sim = Core.createMatch({
    seed: 1,
    mapId: "village10",
    players: [
      { id: "p0", name: "A", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "B", kind: "human", charId: "bazzi", team: 1 },
    ],
  });
  // 빈 통로 만들고 (2, 1) 위치에 벽 세운 뒤, (1, 0)에서 y를 9px 아래로 걸친 상태로 오른쪽 이동 시도
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) sim.grid[r][c] = ".";
  sim.grid[1][2] = "#";
  const p = sim.players[0];
  p.x = 1 * 40 + 20;
  p.y = 0 * 40 + 20 + 9; // 아래쪽 벽 (2,1) 모서리에 걸침

  for (let i = 0; i < 12; i++) Core.step(sim, { p0: { dir: 2 } }, 1000 / 30);
  assert(p.x > 1 * 40 + 30, "모서리에 살짝 걸쳐도 0행 열린 통로로 자동 미끄러져 통과: x=" + p.x);

  // 물풍선 설치 후 탈출 유예: 놓은 자리에서 밖으로 나온 뒤엔 다시 못 들어감
  p.x = 20; p.y = 20;
  Core.step(sim, { p0: { bomb: true } }, 1000 / 30);
  assert.strictEqual(sim.bombs.length, 1);
  assert(p.graceBombs.includes(sim.bombs[0].id), "설치 직후 물풍선 통과 유예 부여");

  for (let i = 0; i < 20; i++) Core.step(sim, { p0: { dir: 2 } }, 1000 / 30);
  assert(p.x > 55, "물풍선 위에서 오른쪽으로 빠져나옴");
  assert.strictEqual(p.graceBombs.length, 0, "물풍선 밖으로 완전히 나가면 유예 해제");

  const xBeforeBack = p.x;
  for (let i = 0; i < 10; i++) Core.step(sim, { p0: { dir: 4 } }, 1000 / 30);
  assert(p.x >= 40 + 13 - 0.1, "유예 해제 후엔 물풍선 칸을 지나갈 수 없음: x=" + p.x);
});

test("3. 연쇄 폭발 + 블록 드랍 당일 보호 + 물방울 갇힘·구출·처치·바늘·로두마니 검증", () => {
  const sim = Core.createMatch({
    seed: 7,
    mapId: "village10",
    mode: "team",
    players: [
      { id: "p0", name: "다오", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "배찌", kind: "human", charId: "bazzi", team: 0 },
      { id: "p2", name: "로두", kind: "human", charId: "rodumani", team: 1 },
      { id: "p3", name: "디지", kind: "human", charId: "dizni", team: 1 },
    ],
  });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) sim.grid[r][c] = ".";

  // 연쇄 폭발 테스트: B1(1,1, fuse 50ms) -> B2(3,1, fuse 2000ms) -> B3(3,2, B블록 파괴)
  sim.grid[2][4] = "B";
  sim.bombs.push(
    { id: 101, owner: "p0", c: 1, r: 1, x: 60, y: 60, power: 3, fuseMs: 50, vx: 0, vy: 0, airMs: 0 },
    { id: 102, owner: "p0", c: 3, r: 1, x: 140, y: 60, power: 2, fuseMs: 2000, vx: 0, vy: 0, airMs: 0 }
  );
  sim.players[0].x = 220; sim.players[0].y = 220;
  sim.players[1].x = 220; sim.players[1].y = 260;
  sim.players[2].x = 140; sim.players[2].y = 100; // (3,2) 로두마니
  sim.players[3].x = 60;  sim.players[3].y = 100; // (1,2) 디지니

  Core.step(sim, {}, 60);
  Core.step(sim, {}, 20);
  assert.strictEqual(sim.bombs.length, 0, "B1 폭발 시 사거리 안의 B2도 즉시 연쇄 폭발");
  assert.strictEqual(sim.players[2].state, "trapped", "물줄기에 닿은 로두마니 갇힘");
  assert.strictEqual(sim.players[3].state, "trapped", "물줄기에 닿은 디지니 갇힘");

  // 바늘(Ctrl) 탈출 테스트
  sim.players[3].needles = 1;
  Core.step(sim, { p3: { needle: true } }, 33);
  assert.strictEqual(sim.players[3].state, "alive", "바늘 사용 시 즉시 구출 + 무적");
  assert(sim.players[3].invulnMs > 0);
  assert.strictEqual(sim.players[3].needles, 0);

  // 아군(p3)이 갇힌 로두마니(p2)와 28px 이내 접촉 -> 팀 구출!
  sim.players[3].x = sim.players[2].x;
  sim.players[3].y = sim.players[2].y;
  Core.step(sim, {}, 33);
  assert.strictEqual(sim.players[2].state, "alive", "같은 팀 접촉 시 물방울 구출");
  assert.strictEqual(sim.players[3].rescues, 1);

  // 아군(p3)이 다른 곳으로 물러난 뒤 적(p0) 물줄기에 갇혀 로두마니 빠른 사망 시간 검증
  sim.players[3].x = 20; sim.players[3].y = 20;
  sim.players[2].invulnMs = 0;
  sim.flames.push({ c: Math.floor(sim.players[2].x / 40), r: Math.floor(sim.players[2].y / 40), owner: "p0", kind: "c", dir: 0, ms: 300 });
  Core.step(sim, {}, 33);
  assert.strictEqual(sim.players[2].state, "trapped");
  // 로두마니는 4200ms만에 터지므로 4300ms 후 사망 (일반 6350ms보다 빠름)
  for (let i = 0; i < 45; i++) Core.step(sim, {}, 100);
  assert.strictEqual(sim.players[2].state, "dead", "로두마니 4.2초 경과 시 물방울 사망");
});

test("4. 신발(킥) · 장갑(던지기) · 밀 수 있는 블록(M) · 마귀 반전 검증", () => {
  const sim = Core.createMatch({
    seed: 9,
    mapId: "village10",
    players: [
      { id: "p0", name: "다오", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "배찌", kind: "human", charId: "bazzi", team: 1 },
    ],
  });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) sim.grid[r][c] = ".";
  const p = sim.players[0];
  p.x = 60; p.y = 60; // (1,1)
  p.canThrow = true;
  Core.step(sim, { p0: { dir: 2, bomb: true } }, 33); // (1,1)에 설치 + 오른쪽 봄
  assert.strictEqual(sim.bombs.length, 1);
  // 장갑 던지기 (같은 칸 풍선 위에서 다시 Space)
  p.x = 60; p.y = 60;
  Core.step(sim, { p0: { bomb: true } }, 33);
  assert.strictEqual(sim.bombs[0].c, 5, "장갑으로 오른쪽 4칸(1→5) 날려 던지기");
  assert(sim.bombs[0].airMs > 0);

  // 신발 킥 테스트
  p.canKick = true;
  sim.bombs.push({ id: 99, owner: "p1", c: 2, r: 1, x: 100, y: 60, power: 2, fuseMs: 2500, vx: 0, vy: 0, airMs: 0 });
  for (let i = 0; i < 20; i++) Core.step(sim, { p0: { dir: 2 } }, 33);
  const kicked = sim.bombs.find(b => b.id === 99);
  assert(kicked && kicked.c >= 3, "신발 킥으로 인접 물풍선이 오른쪽으로 굴러감: c=" + (kicked && kicked.c));

  // 밀 수 있는 블록 M 테스트
  sim.grid[3][3] = "M";
  p.x = 2 * 40 + 20; p.y = 3 * 40 + 20;
  for (let i = 0; i < 10; i++) Core.step(sim, { p0: { dir: 2 } }, 33);
  assert.strictEqual(sim.grid[3][3], ".", "밀 수 있는 블록 원래 자리 비워짐");
  assert.strictEqual(sim.grid[3][4], "M", "밀 수 있는 블록 오른쪽 1칸 이동");
});

test("5. BFS AI 봇 결정적 대전(4인 완주/안전 탈출/판 끝 복기 요약) 검증", () => {
  const sim = Core.createMatch({
    seed: 42,
    mapId: "patrit14",
    mode: "free",
    players: [
      { id: "b0", name: "AI0", kind: "ai", tier: "hard", charId: "dao", team: 0 },
      { id: "b1", name: "AI1", kind: "ai", tier: "hard", charId: "bazzi", team: 1 },
      { id: "b2", name: "AI2", kind: "ai", tier: "normal", charId: "dizni", team: 2 },
      { id: "b3", name: "AI3", kind: "ai", tier: "easy", charId: "uni", team: 3 },
    ],
  });
  for (let t = 0; t < 450; t++) {
    if (sim.winner) break;
    const ins = {};
    for (const p of sim.players) if (p.state !== "dead") ins[p.id] = Bots.decideBotInput(sim, p);
    Core.step(sim, ins, 1000 / 30);
  }
  const totalCratesBroken = sim.players.reduce((s, p) => s + p.crates, 0);
  assert(totalCratesBroken >= 2, "AI 봇들이 스스로 막히지 않고 블록을 파밍함: " + totalCratesBroken);
  const rev = Core.analyzeMatch(sim, "b0");
  assert(rev.oppFlow && rev.myFlow && rev.reason, "판 끝 AI 선생님 복기 3단 요약 생성");

  // 동시 틱 연쇄 폭발이 앞 풍선이 깬 상자 칸을 통과하지 않는지 검증 (brokenThisChain)
  const cs = Core.createMatch({ seed: 3, mapId: "village10", players: [{ id: "a", charId: "dao", team: 0 }, { id: "b", charId: "bazzi", team: 1 }] });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) cs.grid[r][c] = ".";
  cs.grid[1][3] = "B";
  cs.players[1].x = 4 * 40 + 20; cs.players[1].y = 1 * 40 + 20; // 상자(3,1) 바로 뒤 (4,1)
  cs.bombs.push(
    { id: 1, owner: "a", c: 1, r: 1, x: 60, y: 60, power: 4, fuseMs: 10, vx: 0, vy: 0, airMs: 0 },
    { id: 2, owner: "a", c: 2, r: 1, x: 100, y: 60, power: 4, fuseMs: 2000, vx: 0, vy: 0, airMs: 0 }
  );
  Core.step(cs, {}, 20);
  assert.strictEqual(cs.players[1].state, "alive", "같은 연쇄 틱에서 앞 풍선이 깬 상자(3,1) 뒤(4,1)는 물줄기가 관통하지 않음");
});

test("6. 60Hz · 집 타일(H) 충돌/차폐 · 2키 선입력 코너턴(chooseLookaheadDir) 검증", () => {
  assert.strictEqual(Rules.TIMING.TICK_HZ, 60, "기본 시뮬레이션 주파수 60Hz");

  const sim = Core.createMatch({
    seed: 12,
    mapId: "village10",
    players: [
      { id: "p0", name: "다오", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "배찌", kind: "human", charId: "bazzi", team: 1 },
    ],
  });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) sim.grid[r][c] = ".";
  // (1,1) 집(H), (3,0) 집(H) -> 오른쪽 이동 중 (2,1) 교차로 아래(3)를 미리 누른 상황 모사
  sim.grid[1][1] = "H";
  sim.grid[1][3] = "H";
  sim.grid[0][4] = "B";
  const p = sim.players[0];
  p.x = 1 * 40 + 20;
  p.y = 0 * 40 + 20;

  // 아직 (1,0)에 있어 (1,1) 집 때문에 아래(3) 진입 불가 -> 선입력 [2,3] 에서 보조키 2(오른쪽) 유지
  assert.strictEqual(Core.chooseLookaheadDir(sim, p, [2, 3]), 2, "아래가 막힌 상태에선 기존 오른쪽(2) 유지");

  // (2,0) 교차로 중심까지 이동하면 즉시 아래(3)로 코너 턴!
  for (let i = 0; i < 30; i++) {
    const d = Core.chooseLookaheadDir(sim, p, [2, 3]);
    Core.step(sim, { p0: { dir: d } }, 1000 / 60);
    if (p.y > 0 * 40 + 24) break;
  }
  assert(p.y > 24 && Math.abs(p.x - (2 * 40 + 20)) <= Rules.GRID.CORNER_ASSIST_PX + 1, "교차로 도달 즉시 아래쪽으로 자연 코너턴: x=" + p.x + ", y=" + p.y);

  // 집(H) 파괴 불가 & 물줄기 차폐 검증
  sim.bombs.push({ id: 55, owner: "p0", c: 2, r: 1, x: 100, y: 60, power: 4, fuseMs: 10, vx: 0, vy: 0, airMs: 0 });
  sim.players[1].x = 4 * 40 + 20; sim.players[1].y = 1 * 40 + 20; // (3,1) 집 뒤 (4,1)
  Core.step(sim, {}, 20);
  assert.strictEqual(sim.grid[1][3], "H", "집 타일(H)은 물풍선에 부서지지 않음");
  assert.strictEqual(sim.players[1].state, "alive", "집 타일(H) 뒤 플레이어는 물줄기 피격 안 됨");
});

test("7. 보급 비행기 공수 · 물줄기 끝단(tip) -> 중간(mid) 업그레이드 & 파괴 이벤트 검증", () => {
  const sim = Core.createMatch({
    seed: 21,
    mapId: "village10",
    players: [
      { id: "p0", name: "다오", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "배찌", kind: "human", charId: "bazzi", team: 1 },
    ],
  });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) sim.grid[r][c] = ".";
  sim.players[0].x = 20; sim.players[0].y = 20;
  sim.players[1].x = 20; sim.players[1].y = 180;

  // 블록 B 파괴 시 block 이벤트 발행 및 tip 물줄기 확인
  sim.grid[2][5] = "B";
  sim.bombs.push({ id: 77, owner: "p0", c: 3, r: 2, x: 140, y: 100, power: 2, fuseMs: 10, vx: 0, vy: 0, airMs: 0 });
  Core.step(sim, {}, 20);
  assert(sim.events.some(e => e.t === "block" && e.c === 5 && e.r === 2), "블록 파괴 이벤트 발행");
  const tipFlame = sim.flames.find(f => f.c === 1 && f.r === 2);
  assert(tipFlame && tipFlame.kind === "tip", "사거리 끝 칸은 tip 물줄기로 판정");

  // 보급 비행기 타임어 만료 시 비행기 스폰 + 비행 중 빈 칸에 아이템 공수
  sim.planeTimerMs = 10;
  Core.step(sim, {}, 20);
  assert(sim.planes.length >= 1, "보급 비행기 출격");
  const beforeItems = sim.items.length;
  for (let i = 0; i < 120; i++) Core.step(sim, {}, 25);
  assert(sim.items.length > beforeItems, "비행기 비행 후 빈 길에 아이템 자동 투하");

  // 봇 초반 8초 자폭 없음 + 물줄기 스침(18px) 억울한 피격 없음 확인
  assert.strictEqual(Rules.GRID.FLAME_HIT_PX, 17, "물줄기 피격 판정은 17px로 타일 경계 밖 억울한 스침 차단");
  const botMatch = Core.createMatch({
    seed: 99,
    mapId: "village10",
    mode: "free",
    players: [
      { id: "b0", name: "B0", kind: "ai", tier: "normal", charId: "dao", team: 0 },
      { id: "b1", name: "B1", kind: "ai", tier: "normal", charId: "bazzi", team: 1 },
      { id: "b2", name: "B2", kind: "ai", tier: "hard", charId: "dizni", team: 2 },
      { id: "b3", name: "B3", kind: "ai", tier: "hard", charId: "marid", team: 3 },
    ],
  });
  for (let t = 0; t < 480; t++) {
    if (botMatch.winner) break;
    const ins = {};
    for (const p of botMatch.players) if (p.state !== "dead") ins[p.id] = Bots.decideBotInput(botMatch, p);
    Core.step(botMatch, ins, 1000 / 60);
  }
  const aliveBots = botMatch.players.filter(p => p.state !== "dead").length;
  assert(aliveBots >= 3, "초반 8초 내 AI 봇 자폭 방지로 최소 3명 이상 생존: alive=" + aliveBots);
});

test("8. 벽돌 파괴 직후 드랍 아이템 즉시 진입 안전 & 잔상 피격 검증", () => {
  const hazMin = Rules.TIMING.FLAME_HAZARD_MIN_MS;
  assert(hazMin > 0, "FLAME_HAZARD_MIN_MS 설정 확인");

  // 실제 시나리오: (2,2)에 벽돌 B, (1,2)에 물풍선, 플레이어는 (2,1)에서 벽돌 깨지자마자 (2,2)로 즉시 돌진
  const sim = Core.createMatch({
    seed: 31,
    mapId: "village10",
    players: [
      { id: "p0", name: "다오", kind: "human", charId: "dao", team: 0 },
      { id: "p1", name: "배찌", kind: "human", charId: "bazzi", team: 1 },
    ],
  });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) sim.grid[r][c] = ".";
  sim.warmupMs = 0;
  sim.grid[2][2] = "B";
  sim.players[0].x = 2 * 40 + 20;
  sim.players[0].y = 1 * 40 + 20;
  sim.players[1].x = 12 * 40 + 20;
  sim.players[1].y = 10 * 40 + 20;
  sim.bombs.push({ id: 91, owner: "p1", c: 1, r: 2, x: 60, y: 100, power: 2, fuseMs: 10, vx: 0, vy: 0, airMs: 0 });
  Core.step(sim, {}, 20);
  assert.strictEqual(sim.grid[2][2], ".", "벽돌 B 정상 파괴");
  sim.items.push({ id: 999, kind: "roller", c: 2, r: 2, spawnTick: sim.tick });

  // 폭발 직후 0ms부터 곧바로 아래(dir=3)로 (2,2) 아이템을 먹으러 걸어가도 갇히지 않고 획득
  for (let f = 0; f < 16; f++) {
    Core.step(sim, { p0: { dir: 3 } }, 16);
    assert.strictEqual(sim.players[0].state, "alive", "벽돌 깨진 직후 아이템 진입 시 물줄기에 죽지 않음 (frame " + f + ")");
  }
  assert(sim.players[0].itemsPicked >= 1, "벽돌 자리 아이템 즉시 획득 완료");

  // 열린 길 활성 물줄기(ms > hazMin)는 정상 피격
  sim.flames.push({ c: 2, r: 3, kind: "c", dir: 0, ms: hazMin + 80, owner: "p1" });
  sim.players[0].x = 2 * 40 + 20;
  sim.players[0].y = 3 * 40 + 20;
  Core.step(sim, {}, 16);
  assert.strictEqual(sim.players[0].state, "trapped", "활성 물줄기(ms > FLAME_HAZARD_MIN_MS)에서는 정상 피격");
});

console.log(`✅ All ${passed} KuaCore tests passed!`);

/* 베니 크아 — 결정적 실시간 시뮬레이션 코어 (kua/core.js)
   · Node · 브라우저 공용 (UMD)
   · 연속 픽셀 이동(40px/칸) + 걸치기/모서리 미끄러짐(12px) + 물풍선 통과 유예 + 신발 킥 + 장갑 던지기 + 연쇄 폭발 + 갇힘/구출/처치/바늘 + 판 끝 복기 분석 */
((root, factory) => {
  const mod = factory(
    root.KuaRules || (typeof require === "function" ? require("./rules.js") : null),
    root.KuaMaps || (typeof require === "function" ? require("./maps.js") : null)
  );
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.KuaCore = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, (Rules, Maps) => {
  "use strict";

  const { GRID, TIMING, CHARS, DROP_CHANCE, DROP_WEIGHTS, speedPxPerSec } = Rules;
  const COLS = GRID.COLS;
  const ROWS = GRID.ROWS;
  const T = GRID.TILE_PX;
  const HALF = GRID.HALF_BOX_PX;
  const ASSIST = GRID.CORNER_ASSIST_PX;

  // dir: 0 없음 · 1 위 · 2 오른쪽 · 3 아래 · 4 왼쪽
  const DIR_DX = [0, 0, 1, 0, -1];
  const DIR_DY = [0, -1, 0, 1, 0];
  const OPP_DIR = [0, 3, 4, 1, 2];

  function mulberry32(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function cellOf(px) { return Math.floor(px / T); }
  function centerOf(idx) { return idx * T + T * 0.5; }
  const cKey = (c, r) => `${c},${r}`;

  function rollDrop(rng) {
    if (rng() > DROP_CHANCE) return null;
    const total = DROP_WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let pick = rng() * total;
    for (const [id, w] of DROP_WEIGHTS) {
      pick -= w;
      if (pick <= 0) return id;
    }
    return "bomb";
  }

  function makePlayer(cfg, spawn, idx) {
    const ch = CHARS[cfg.charId] || CHARS.dao;
    return {
      id: cfg.id || `p${idx}`,
      slot: idx,
      name: cfg.name || ch.name,
      kind: cfg.kind || "human", // "human" | "ai"
      tier: cfg.tier || "normal",
      team: cfg.team != null ? cfg.team : (idx % 2),
      charId: ch.id,
      x: centerOf(spawn.c),
      y: centerOf(spawn.r),
      dir: 0,
      faceDir: 3, // 기본 정면(아래)
      walkPhase: 0,
      state: "alive", // "alive" | "trapped" | "dead"
      trapMs: 0,
      trapDeathMs: ch.trapDeathMs || TIMING.TRAP_DEATH_MS,
      trapperId: null,
      invulnMs: 0,
      devilMs: 0,
      // 능력치
      maxBombs: ch.bombs,
      bombsCap: ch.maxBombs,
      power: ch.power,
      powerCap: ch.maxPower,
      speed: ch.speed,
      speedCap: ch.maxSpeed,
      canKick: false,
      canThrow: false,
      needles: 0,
      graceBombs: [],
      pushTarget: null,
      pushMs: 0,
      // 전적 · 복기 통계
      kills: 0,
      deaths: 0,
      rescues: 0,
      crates: 0,
      itemsPicked: 0,
      needlesUsed: 0,
      selfTraps: 0,
      aliveMs: 0,
    };
  }

  function createMatch(opts = {}) {
    const o = opts || {};
    const seed = o.seed != null ? o.seed : 12345;
    const rng = mulberry32(seed);
    const mapData = Maps.getMap(o.mapId || "village10");
    const mode = o.mode === "team" ? "team" : "free"; // "free"(개인전) | "team"(팀전)
    const roster = Array.isArray(o.players) && o.players.length >= 2
      ? o.players.slice(0, 8)
      : [
          { id: "p0", name: "나", kind: "human", charId: "dao", team: 0 },
          { id: "p1", name: "배찌 봇", kind: "ai", tier: "normal", charId: "bazzi", team: 1 },
        ];

    const spawns = mapData.spawns;
    const players = roster.map((cfg, idx) => {
      const sp = spawns[idx % spawns.length];
      return makePlayer(cfg, sp, idx);
    });

    return {
      seed,
      rngState: 0,
      _rng: rng,
      mapId: mapData.id,
      mapName: mapData.name,
      mode,
      grid: mapData.grid.map(row => row.slice()),
      players,
      bombs: [],
      flames: [],
      items: [],
      planes: [],
      planeTimerMs: TIMING.AIRPLANE_FIRST_MS || 22000,
      nextId: 1,
      tick: 0,
      elapsedMs: 0,
      timeLeftMs: o.matchMs || TIMING.MATCH_MS,
      warmupMs: o.warmupMs != null ? o.warmupMs : 0,
      winner: null, // null | { type: "player"|"team"|"draw", id, label }
      events: [],
      reviewLog: [],
    };
  }

  function isSolidTile(ch) {
    return ch === "#" || ch === "H" || ch === "B" || ch === "M";
  }

  function bombAt(sim, c, r) {
    return sim.bombs.find(b => b.airMs <= 0 && b.c === c && b.r === r) || null;
  }

  function rectsOverlap(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
    return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
  }

  function canStand(sim, p, nx, ny) {
    const x0 = nx - HALF, x1 = nx + HALF;
    const y0 = ny - HALF, y1 = ny + HALF;
    if (x0 < 0 || y0 < 0 || x1 > COLS * T || y1 > ROWS * T) return false;

    const cMin = cellOf(x0), cMax = cellOf(x1 - 0.001);
    const rMin = cellOf(y0), rMax = cellOf(y1 - 0.001);
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        if (isSolidTile(sim.grid[r][c])) return false;
      }
    }
    for (const b of sim.bombs) {
      if (b.airMs > 0) continue;
      if (p && p.graceBombs.includes(b.id)) continue;
      const bx0 = b.c * T, by0 = b.r * T;
      if (rectsOverlap(x0, y0, x1, y1, bx0, by0, bx0 + T, by0 + T)) return false;
    }
    return true;
  }

  function canEnterDir(sim, p, rawDir) {
    if (!p || p.state === "dead" || !rawDir) return false;
    const eff = p.devilMs > 0 ? OPP_DIR[rawDir] : rawDir;
    const dx = DIR_DX[eff], dy = DIR_DY[eff];
    const laneStep = T * 0.5 + 2; // 인접 타일 경계를 실제로 넘을 수 있는지 확인
    if (dx !== 0) {
      const probeX = centerOf(cellOf(p.x)) + dx * laneStep;
      if (canStand(sim, p, probeX, p.y)) return true;
      const baseR = cellOf(p.y);
      for (let dr = -1; dr <= 1; dr++) {
        const rr = baseR + dr;
        if (rr < 0 || rr >= ROWS) continue;
        const cy = centerOf(rr);
        if (Math.abs(p.y - cy) <= ASSIST && canStand(sim, p, probeX, cy)) return true;
      }
    } else if (dy !== 0) {
      const probeY = centerOf(cellOf(p.y)) + dy * laneStep;
      if (canStand(sim, p, p.x, probeY)) return true;
      const baseC = cellOf(p.x);
      for (let dc = -1; dc <= 1; dc++) {
        const cc = baseC + dc;
        if (cc < 0 || cc >= COLS) continue;
        const cx = centerOf(cc);
        if (Math.abs(p.x - cx) <= ASSIST && canStand(sim, p, cx, probeY)) return true;
      }
    }
    return false;
  }

  function chooseLookaheadDir(sim, p, dirs) {
    if (!dirs || !dirs.length) return 0;
    const primary = dirs[dirs.length - 1];
    if (dirs.length < 2 || !p || p.state !== "alive") return primary;
    if (canEnterDir(sim, p, primary)) return primary;
    for (let i = dirs.length - 2; i >= 0; i--) {
      if (canEnterDir(sim, p, dirs[i])) return dirs[i];
    }
    return primary;
  }

  function updateGraceBombs(sim, p) {
    if (!p.graceBombs.length) return;
    const x0 = p.x - HALF, x1 = p.x + HALF, y0 = p.y - HALF, y1 = p.y + HALF;
    p.graceBombs = p.graceBombs.filter(bid => {
      const b = sim.bombs.find(x => x.id === bid && x.airMs <= 0);
      if (!b) return false;
      const bx0 = b.c * T, by0 = b.r * T;
      return rectsOverlap(x0, y0, x1, y1, bx0, by0, bx0 + T, by0 + T);
    });
  }

  function tryKickOrPush(sim, p, dir, dtMs) {
    if (p.state !== "alive") { p.pushTarget = null; p.pushMs = 0; return; }
    const dx = DIR_DX[dir], dy = DIR_DY[dir];
    const pc = cellOf(p.x), pr = cellOf(p.y);
    const tc = pc + dx, tr = pr + dy;
    if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) {
      p.pushTarget = null; p.pushMs = 0; return;
    }

    // 1) 신발/붉은악마 물풍선 차기
    const b = bombAt(sim, tc, tr);
    if (b && !p.graceBombs.includes(b.id) && p.canKick && b.vx === 0 && b.vy === 0) {
      const aligned = dx !== 0 ? Math.abs(p.y - centerOf(tr)) <= 14 : Math.abs(p.x - centerOf(tc)) <= 14;
      if (aligned) {
        const nc = tc + dx, nr = tr + dy;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !isSolidTile(sim.grid[nr][nc]) && !bombAt(sim, nc, nr)) {
          b.vx = dx;
          b.vy = dy;
          sim.events.push({ t: "kick", pid: p.id, c: tc, r: tr });
        }
      }
      p.pushTarget = null; p.pushMs = 0;
      return;
    }

    // 2) 밀 수 있는 블록(M)
    if (sim.grid[tr][tc] === "M") {
      const aligned = dx !== 0 ? Math.abs(p.y - centerOf(tr)) <= 12 : Math.abs(p.x - centerOf(tc)) <= 12;
      if (!aligned) { p.pushTarget = null; p.pushMs = 0; return; }
      const nc = tc + dx, nr = tr + dy;
      const destEmpty = nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS &&
        sim.grid[nr][nc] === "." && !bombAt(sim, nc, nr) &&
        !sim.players.some(q => q.state !== "dead" && rectsOverlap(q.x - HALF, q.y - HALF, q.x + HALF, q.y + HALF, nc * T, nr * T, (nc + 1) * T, (nr + 1) * T));
      if (!destEmpty) { p.pushTarget = null; p.pushMs = 0; return; }

      const key = `${tc},${tr},${dir}`;
      if (p.pushTarget !== key) {
        p.pushTarget = key;
        p.pushMs = dtMs;
      } else {
        p.pushMs += dtMs;
      }
      if (p.pushMs >= TIMING.PUSH_HOLD_MS) {
        sim.grid[tr][tc] = ".";
        sim.grid[nr][nc] = "M";
        sim.items = sim.items.filter(it => !(it.c === nc && it.r === nr));
        p.pushTarget = null;
        p.pushMs = 0;
        sim.events.push({ t: "push", pid: p.id, c: nc, r: nr });
      }
      return;
    }

    p.pushTarget = null;
    p.pushMs = 0;
  }

  function movePlayer(sim, p, rawDir, dtMs) {
    if (p.state === "dead") return;
    let dir = rawDir | 0;
    if (dir < 0 || dir > 4) dir = 0;
    if (dir && p.devilMs > 0) dir = OPP_DIR[dir];
    p.dir = dir;
    if (!dir) { p.pushTarget = null; p.pushMs = 0; return; }
    p.faceDir = dir;

    const dt = dtMs / 1000;
    const spd = p.state === "trapped" ? TIMING.TRAPPED_SPEED_PX : speedPxPerSec(p.speed);
    const step = spd * dt;
    const prevX = p.x, prevY = p.y;

    const dx = DIR_DX[dir], dy = DIR_DY[dir];
    const nx = clamp(p.x + dx * step, HALF, COLS * T - HALF);
    const ny = clamp(p.y + dy * step, HALF, ROWS * T - HALF);

    if (canStand(sim, p, nx, ny)) {
      p.x = nx;
      p.y = ny;
      p.walkPhase += Math.hypot(p.x - prevX, p.y - prevY) * 0.16;
      p.pushTarget = null;
      p.pushMs = 0;
      return;
    }

    // 벽/풍선 앞 틈새 밀착: 남은 여유 거리만큼 경계면 직전까지 밀어줌
    if (dx !== 0) {
      const targetEdgeX = dx > 0
        ? Math.floor((nx + HALF - 0.01) / T) * T - HALF - 0.01
        : Math.ceil((nx - HALF + 0.01) / T) * T + HALF + 0.01;
      if ((dx > 0 ? targetEdgeX > p.x : targetEdgeX < p.x) && canStand(sim, p, targetEdgeX, p.y)) {
        p.x = targetEdgeX;
      }
    } else if (dy !== 0) {
      const targetEdgeY = dy > 0
        ? Math.floor((ny + HALF - 0.01) / T) * T - HALF - 0.01
        : Math.ceil((ny - HALF + 0.01) / T) * T + HALF + 0.01;
      if ((dy > 0 ? targetEdgeY > p.y : targetEdgeY < p.y) && canStand(sim, p, p.x, targetEdgeY)) {
        p.y = targetEdgeY;
      }
    }

    // 모서리 걸치기 자동 미끄러짐 (CORNER_ASSIST_PX)
    let slid = false;
    if (dx !== 0) {
      const baseR = cellOf(p.y);
      const candidates = [baseR - 1, baseR, baseR + 1].filter(r => r >= 0 && r < ROWS);
      let bestTargetY = null, bestDist = Infinity;
      for (const r of candidates) {
        const cy = centerOf(r);
        const dist = Math.abs(p.y - cy);
        if (dist > 0.01 && dist <= ASSIST + 8 && canStand(sim, p, nx, cy) && dist < bestDist) {
          bestDist = dist;
          bestTargetY = cy;
        }
      }
      if (bestTargetY !== null) {
        const nudge = Math.sign(bestTargetY - p.y) * Math.min(step, Math.abs(bestTargetY - p.y));
        const tryY = p.y + nudge;
        if (canStand(sim, p, p.x, tryY)) {
          p.y = tryY;
          if (canStand(sim, p, nx, p.y)) p.x = nx;
          slid = true;
        }
      }
    } else if (dy !== 0) {
      const baseC = cellOf(p.x);
      const candidates = [baseC - 1, baseC, baseC + 1].filter(c => c >= 0 && c < COLS);
      let bestTargetX = null, bestDist = Infinity;
      for (const c of candidates) {
        const cx = centerOf(c);
        const dist = Math.abs(p.x - cx);
        if (dist > 0.01 && dist <= ASSIST + 8 && canStand(sim, p, cx, ny) && dist < bestDist) {
          bestDist = dist;
          bestTargetX = cx;
        }
      }
      if (bestTargetX !== null) {
        const nudge = Math.sign(bestTargetX - p.x) * Math.min(step, Math.abs(bestTargetX - p.x));
        const tryX = p.x + nudge;
        if (canStand(sim, p, tryX, p.y)) {
          p.x = tryX;
          if (canStand(sim, p, p.x, ny)) p.y = ny;
          slid = true;
        }
      }
    }

    if (!slid) {
      tryKickOrPush(sim, p, dir, dtMs);
    } else {
      p.pushTarget = null;
      p.pushMs = 0;
    }
    const movedDist = Math.hypot(p.x - prevX, p.y - prevY);
    p.walkPhase += movedDist > 0.05 ? movedDist * 0.16 : dtMs * 0.007;
  }

  function placeOrThrowBomb(sim, p) {
    if (!p || p.state !== "alive") return false;
    const c = cellOf(p.x), r = cellOf(p.y);
    const onBomb = bombAt(sim, c, r);

    // 장갑 보유 시: 서 있는 물풍선을 전방으로 던지기 (공중 풍선 착지 칸도 중복 회피)
    const anyBombAt = (tc, tr) => sim.bombs.some(b => b.c === tc && b.r === tr);
    if (onBomb && p.canThrow) {
      const dir = p.faceDir || 3;
      const dx = DIR_DX[dir], dy = DIR_DY[dir];
      let landC = c + dx * TIMING.GLOVE_THROW_TILES;
      let landR = r + dy * TIMING.GLOVE_THROW_TILES;
      let found = null;
      for (let hop = 0; hop < Math.max(COLS, ROWS); hop++) {
        const tc = clamp(landC + dx * hop, 0, COLS - 1);
        const tr = clamp(landR + dy * hop, 0, ROWS - 1);
        if (!isSolidTile(sim.grid[tr][tc]) && !anyBombAt(tc, tr)) {
          found = { c: tc, r: tr };
          break;
        }
        if ((dx > 0 && tc === COLS - 1) || (dx < 0 && tc === 0) || (dy > 0 && tr === ROWS - 1) || (dy < 0 && tr === 0)) {
          break;
        }
      }
      if (!found) {
        for (let back = TIMING.GLOVE_THROW_TILES; back >= 1; back--) {
          const tc = clamp(c + dx * back, 0, COLS - 1);
          const tr = clamp(r + dy * back, 0, ROWS - 1);
          if (!isSolidTile(sim.grid[tr][tc]) && !anyBombAt(tc, tr)) {
            found = { c: tc, r: tr };
            break;
          }
        }
      }
      if (found) {
        onBomb.vx = 0; onBomb.vy = 0;
        onBomb.fromC = onBomb.c; onBomb.fromR = onBomb.r;
        onBomb.c = found.c; onBomb.r = found.r;
        onBomb.x = centerOf(found.c); onBomb.y = centerOf(found.r);
        onBomb.airMs = TIMING.THROW_AIR_MS;
        p.graceBombs = p.graceBombs.filter(id => id !== onBomb.id);
        sim.events.push({ t: "throw", pid: p.id, c: found.c, r: found.r });
        return true;
      }
      return false;
    }

    if (onBomb) return false;
    const ownedCount = sim.bombs.filter(b => b.owner === p.id).length;
    if (ownedCount >= p.maxBombs) return false;

    const id = sim.nextId++;
    const bomb = {
      id,
      owner: p.id,
      c, r,
      x: centerOf(c),
      y: centerOf(r),
      power: p.power,
      fuseMs: TIMING.FUSE_MS,
      vx: 0, vy: 0,
      airMs: 0,
      fromC: c, fromR: r,
    };
    sim.bombs.push(bomb);

    // 같은 칸에 겹쳐 있는 살아 있는 모든 플레이어에게 탈출 유예 부여 (KR R-107)
    const bx0 = c * T, by0 = r * T;
    for (const q of sim.players) {
      if (q.state !== "dead" && rectsOverlap(q.x - HALF, q.y - HALF, q.x + HALF, q.y + HALF, bx0, by0, bx0 + T, by0 + T)) {
        if (!q.graceBombs.includes(id)) q.graceBombs.push(id);
      }
    }
    sim.events.push({ t: "bomb", pid: p.id, c, r });
    return true;
  }

  function useNeedle(sim, p) {
    if (!p || p.state !== "trapped" || p.needles <= 0) return false;
    p.needles--;
    p.needlesUsed++;
    p.state = "alive";
    p.trapMs = 0;
    p.trapperId = null;
    p.invulnMs = TIMING.RESCUE_INVULN_MS;
    sim.events.push({ t: "needle", pid: p.id, c: cellOf(p.x), r: cellOf(p.y) });
    sim.reviewLog.push({ tick: sim.tick, kind: "needle", pid: p.id, name: p.name });
    return true;
  }

  function addFlame(sim, c, r, owner, kind, dir, msOverride = TIMING.FLAME_MS) {
    const existing = sim.flames.find(f => f.c === c && f.r === r);
    if (existing) {
      existing.ms = Math.max(existing.ms, msOverride);
      if (kind === "c") { existing.kind = "c"; existing.dir = 0; }
      else if (existing.kind === "tip" && kind === "mid") { existing.kind = "mid"; existing.dir = dir; }
      return;
    }
    sim.flames.push({ c, r, owner, kind, dir, ms: msOverride });
  }

  function grantCellGrace(sim, b) {
    const bx0 = b.c * T, by0 = b.r * T;
    for (const q of sim.players) {
      if (q.state !== "dead" && rectsOverlap(q.x - HALF, q.y - HALF, q.x + HALF, q.y + HALF, bx0, by0, bx0 + T, by0 + T)) {
        if (!q.graceBombs.includes(b.id)) q.graceBombs.push(b.id);
      }
    }
  }

  function detonateQueue(sim, seedBombs) {
    if (!seedBombs.length) return;
    const queue = seedBombs.slice();
    const popped = new Set(queue.map(b => b.id));
    const newlyDroppedCells = new Set();
    const brokenThisChain = new Set();

    while (queue.length) {
      const b = queue.shift();
      sim.bombs = sim.bombs.filter(x => x.id !== b.id);
      sim.events.push({ t: "pop", c: b.c, r: b.r, power: b.power });
      addFlame(sim, b.c, b.r, b.owner, "c", 0);

      for (let d = 1; d <= 4; d++) {
        const dx = DIR_DX[d], dy = DIR_DY[d];
        for (let dist = 1; dist <= b.power; dist++) {
          const nc = b.c + dx * dist;
          const nr = b.r + dy * dist;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
          const tile = sim.grid[nr][nc];
          if (tile === "#" || tile === "H") break;

          const key = cKey(nc, nr);
          // 같은 연쇄 폭발에서 방금 부서진 블록 자리면 뒤 풍선 물줄기도 여기서 정지 (순서 무관 일관성)
          if (brokenThisChain.has(key)) {
            addFlame(sim, nc, nr, b.owner, "tip", d);
            break;
          }

          // 파괴 가능한 블록 (B / M) -> 파괴 후 물줄기 정지
          if (tile === "B" || tile === "M") {
            sim.grid[nr][nc] = ".";
            brokenThisChain.add(key);
            sim.events.push({ t: "block", c: nc, r: nr, kind: tile });
            const ownerP = sim.players.find(p => p.id === b.owner);
            if (ownerP) ownerP.crates++;
            const drop = rollDrop(sim._rng);
            if (drop) {
              sim.items.push({ id: sim.nextId++, kind: drop, c: nc, r: nr, spawnTick: sim.tick });
              newlyDroppedCells.add(key);
            }
            // 방금 부서진 벽돌(B/M)은 물줄기를 흡수하므로 시각적 물보라 잔상만 표시해 아이템을 바로 먹어도 갇히지 않게 처리
            addFlame(sim, nc, nr, b.owner, "tip", d, TIMING.FLAME_HAZARD_MIN_MS);
            break;
          }

          // 풀숲(G) -> 타면서 사라지지만 물줄기는 통과
          if (tile === "G") {
            sim.grid[nr][nc] = ".";
          }

          // 기존 바닥 아이템은 소멸 (이번 틱에 블록 깨져 나온 건 보호)
          if (!newlyDroppedCells.has(cKey(nc, nr))) {
            sim.items = sim.items.filter(it => !(it.c === nc && it.r === nr));
          }

          // 연쇄 폭발: 다른 풍선에 닿으면 즉시 폭발 큐에 추가
          const hitBomb = bombAt(sim, nc, nr);
          if (hitBomb && !popped.has(hitBomb.id)) {
            popped.add(hitBomb.id);
            queue.push(hitBomb);
          }

          addFlame(sim, nc, nr, b.owner, dist === b.power ? "tip" : "mid", d);
        }
      }
    }
  }

  function stepSlidingBombs(sim, dtMs) {
    const dt = dtMs / 1000;
    for (const b of sim.bombs) {
      if (b.airMs > 0) {
        b.airMs = Math.max(0, b.airMs - dtMs);
        if (b.airMs === 0) grantCellGrace(sim, b);
        continue;
      }
      if (b.vx === 0 && b.vy === 0) continue;

      const step = TIMING.KICK_SPEED_PX * dt;
      const nx = b.x + b.vx * step;
      const ny = b.y + b.vy * step;
      const frontX = nx + b.vx * (T * 0.45);
      const frontY = ny + b.vy * (T * 0.45);
      const fc = cellOf(frontX), fr = cellOf(frontY);

      let blocked = fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS;
      if (!blocked && (fc !== b.c || fr !== b.r)) {
        if (isSolidTile(sim.grid[fr][fc])) blocked = true;
        else if (sim.bombs.some(o => o.id !== b.id && o.airMs <= 0 && o.c === fc && o.r === fr)) blocked = true;
        else if (sim.players.some(p => p.state !== "dead" && rectsOverlap(p.x - HALF, p.y - HALF, p.x + HALF, p.y + HALF, fc * T, fr * T, (fc + 1) * T, (fr + 1) * T))) blocked = true;
      }
      if (blocked) {
        b.x = centerOf(b.c);
        b.y = centerOf(b.r);
        b.vx = 0;
        b.vy = 0;
        grantCellGrace(sim, b);
      } else {
        b.x = clamp(nx, T * 0.5, COLS * T - T * 0.5);
        b.y = clamp(ny, T * 0.5, ROWS * T - T * 0.5);
        b.c = cellOf(b.x);
        b.r = cellOf(b.y);
      }
    }
  }

  function applyItem(sim, p, item) {
    p.itemsPicked++;
    switch (item.kind) {
      case "bomb": p.maxBombs = Math.min(p.bombsCap, p.maxBombs + 1); break;
      case "fluid": p.power = Math.min(p.powerCap, p.power + 1); break;
      case "ultra": p.power = p.powerCap; break;
      case "roller": p.speed = Math.min(p.speedCap, p.speed + 1); break;
      case "red_devil": p.speed = p.speedCap; p.canKick = true; break;
      case "shoe": p.canKick = true; break;
      case "glove": p.canThrow = true; break;
      case "needle": p.needles = Math.min(5, p.needles + 1); break;
      case "devil": p.devilMs = TIMING.DEVIL_MS; break;
      case "green_devil": {
        const drops = [];
        if (p.speed > (CHARS[p.charId]?.speed || 4)) { p.speed--; drops.push("roller"); }
        else if (p.power > (CHARS[p.charId]?.power || 1)) { p.power--; drops.push("fluid"); }
        else if (p.maxBombs > (CHARS[p.charId]?.bombs || 1)) { p.maxBombs--; drops.push("bomb"); }
        if (drops.length) {
          const dropK = drops[0];
          const pc = cellOf(p.x), pr = cellOf(p.y);
          // 뒤쪽 빈 칸에 떨구기
          for (let d = 1; d <= 4; d++) {
            const dc = pc + DIR_DX[d], dr = pr + DIR_DY[d];
            if (dc >= 0 && dc < COLS && dr >= 0 && dr < ROWS && !isSolidTile(sim.grid[dr][dc])) {
              sim.items.push({ id: sim.nextId++, kind: dropK, c: dc, r: dr, spawnTick: sim.tick });
              break;
            }
          }
        }
        break;
      }
    }
    sim.events.push({ t: "item", pid: p.id, kind: item.kind, c: item.c, r: item.r });
  }

  function checkWinner(sim) {
    if (sim.winner) return;
    const aliveOrTrapped = sim.players.filter(p => p.state !== "dead");
    if (sim.mode === "team") {
      const teams = new Set(aliveOrTrapped.map(p => p.team));
      if (teams.size === 1) {
        const tid = [...teams][0];
        sim.winner = { type: "team", id: tid, label: tid === 0 ? "블루팀 승리!" : "레드팀 승리!" };
      } else if (teams.size === 0) {
        sim.winner = { type: "draw", id: null, label: "무승부! (동시 탈락)" };
      } else if (sim.timeLeftMs <= 0) {
        const t0 = aliveOrTrapped.filter(p => p.team === 0).length;
        const t1 = aliveOrTrapped.filter(p => p.team === 1).length;
        if (t0 > t1) sim.winner = { type: "team", id: 0, label: "시간 종료 · 블루팀 승리!" };
        else if (t1 > t0) sim.winner = { type: "team", id: 1, label: "시간 종료 · 레드팀 승리!" };
        else sim.winner = { type: "draw", id: null, label: "시간 종료 · 무승부!" };
      }
      return;
    }

    if (aliveOrTrapped.length === 1) {
      const w = aliveOrTrapped[0];
      sim.winner = { type: "player", id: w.id, label: `${w.name} 최후 생존 승리!` };
    } else if (aliveOrTrapped.length === 0) {
      sim.winner = { type: "draw", id: null, label: "무승부! (동시 탈락)" };
    } else if (sim.timeLeftMs <= 0) {
      const sorted = aliveOrTrapped.slice().sort((a, b) => b.kills - a.kills);
      if (sorted.length >= 2 && sorted[0].kills === sorted[1].kills) {
        sim.winner = { type: "draw", id: null, label: "시간 종료 · 무승부!" };
      } else {
        sim.winner = { type: "player", id: sorted[0].id, label: `시간 종료 · ${sorted[0].name} 판정승!` };
      }
    }
  }

  function stepAirplanes(sim, dtMs) {
    sim.planeTimerMs -= dtMs;
    if (sim.planeTimerMs <= 0 && sim.timeLeftMs > 15000) {
      sim.planeTimerMs = TIMING.AIRPLANE_EVERY_MS || 25000;
      const candRows = [2, 4, 6, 8, 10];
      const r = candRows[Math.floor(sim._rng() * candRows.length)];
      const openCols = [];
      for (let c = 1; c < COLS - 1; c++) {
        if (sim.grid[r][c] === "." && !bombAt(sim, c, r) && !sim.items.some(i => i.c === c && i.r === r)) {
          openCols.push(c);
        }
      }
      if (openCols.length) {
        const pool = ["bomb", "fluid", "roller", "needle", "shoe", "glove", "ultra"];
        const drops = [];
        for (let i = 0; i < Math.min(3, openCols.length); i++) {
          const pickIdx = Math.floor(sim._rng() * openCols.length);
          const col = openCols.splice(pickIdx, 1)[0];
          const kind = pool[Math.floor(sim._rng() * pool.length)];
          drops.push({ c: col, kind, done: false });
        }
        sim.planes.push({ r, x: -T * 2, vx: 320, drops });
        sim.events.push({ t: "plane", r });
      }
    }
    const dt = dtMs / 1000;
    for (const pl of sim.planes) {
      pl.x += pl.vx * dt;
      for (const d of pl.drops) {
        if (!d.done && pl.x >= centerOf(d.c)) {
          d.done = true;
          if (sim.grid[pl.r][d.c] === "." && !bombAt(sim, d.c, pl.r) && !sim.items.some(i => i.c === d.c && i.r === pl.r)) {
            sim.items.push({ id: sim.nextId++, kind: d.kind, c: d.c, r: pl.r, spawnTick: sim.tick });
            sim.events.push({ t: "airdrop", c: d.c, r: pl.r, kind: d.kind });
          }
        }
      }
    }
    sim.planes = sim.planes.filter(pl => pl.x <= COLS * T + T * 3);
  }

  // 고정 틱 1회 전진 (inputs: { [pid]: { dir, bomb, needle } })
  function step(sim, inputs = {}, dtMs = 1000 / TIMING.TICK_HZ) {
    if (sim.winner) return sim;
    sim.events = [];
    sim.tick++;

    if (sim.warmupMs > 0) {
      sim.warmupMs = Math.max(0, sim.warmupMs - dtMs);
      if (sim.warmupMs === 0) sim.events.push({ t: "start" });
      return sim;
    }

    sim.elapsedMs += dtMs;
    sim.timeLeftMs = Math.max(0, sim.timeLeftMs - dtMs);
    stepAirplanes(sim, dtMs);

    // 1) 타이머 갱신 + 이동 + 액션 처리
    for (const p of sim.players) {
      if (p.state === "dead") continue;
      p.aliveMs += dtMs;
      if (p.invulnMs > 0) p.invulnMs = Math.max(0, p.invulnMs - dtMs);
      if (p.devilMs > 0) p.devilMs = Math.max(0, p.devilMs - dtMs);

      const inp = inputs[p.id] || {};
      if (inp.needle) useNeedle(sim, p);
      if (p.state === "alive") {
        movePlayer(sim, p, inp.dir || 0, dtMs);
        if (inp.bomb) placeOrThrowBomb(sim, p);
      } else if (p.state === "trapped") {
        movePlayer(sim, p, inp.dir || 0, dtMs);
      }
      updateGraceBombs(sim, p);
    }

    // 2) 미끄러지는 물풍선 + 퓨즈 카운트다운 + 연쇄 폭발
    stepSlidingBombs(sim, dtMs);
    for (const b of sim.bombs) {
      if (b.airMs <= 0) b.fuseMs -= dtMs;
    }
    const readyBombs = sim.bombs.filter(b => b.airMs <= 0 && b.fuseMs <= 0);
    if (readyBombs.length) detonateQueue(sim, readyBombs);

    // 3) 기존 물줄기 수명 감소 + 새로 놓였거나 굴러 들어온 폭탄 연쇄
    for (const f of sim.flames) f.ms -= dtMs;
    sim.flames = sim.flames.filter(f => f.ms > 0);
    const touchedBombs = sim.bombs.filter(b => b.airMs <= 0 && sim.flames.some(f => f.c === b.c && f.r === b.r));
    if (touchedBombs.length) detonateQueue(sim, touchedBombs);

    // 4) 아이템 줍기 (alive 만 가능, trapped 불가)
    for (const p of sim.players) {
      if (p.state !== "alive") continue;
      const pc = cellOf(p.x), pr = cellOf(p.y);
      const hitIdx = sim.items.findIndex(it => it.c === pc && it.r === pr && Math.abs(p.x - centerOf(it.c)) <= 24 && Math.abs(p.y - centerOf(it.r)) <= 24);
      if (hitIdx >= 0) {
        const it = sim.items.splice(hitIdx, 1)[0];
        applyItem(sim, p, it);
      }
    }

    // 5) 물줄기 피격 -> 물방울 갇힘 (사라지는 잔상 구간 ms <= FLAME_HAZARD_MIN_MS 은 피격 제외)
    const hazardMinMs = TIMING.FLAME_HAZARD_MIN_MS || 0;
    for (const p of sim.players) {
      if (p.state !== "alive" || p.invulnMs > 0) continue;
      const hitFlame = sim.flames.find(f =>
        f.ms > hazardMinMs &&
        Math.abs(p.x - centerOf(f.c)) < GRID.FLAME_HIT_PX &&
        Math.abs(p.y - centerOf(f.r)) < GRID.FLAME_HIT_PX
      );
      if (hitFlame) {
        p.state = "trapped";
        p.trapMs = p.trapDeathMs;
        p.trapperId = hitFlame.owner;
        if (hitFlame.owner === p.id) p.selfTraps++;
        sim.events.push({ t: "trap", pid: p.id, by: hitFlame.owner });
        sim.reviewLog.push({ tick: sim.tick, kind: "trap", pid: p.id, by: hitFlame.owner, self: hitFlame.owner === p.id });
      }
    }

    // 6) 물방울 갇힘 시간 만료 + 아군 구출 / 적군 터뜨리기 (적 접촉 우선 · 팀 오폭 킬 제외)
    for (const p of sim.players) {
      if (p.state !== "trapped") continue;
      p.trapMs -= dtMs;
      if (p.trapMs <= 0) {
        p.state = "dead";
        p.deaths++;
        const killer = sim.players.find(q => q.id === p.trapperId && q.id !== p.id);
        if (killer && (sim.mode !== "team" || killer.team !== p.team)) killer.kills++;
        sim.events.push({ t: "die", pid: p.id, by: p.trapperId });
        sim.reviewLog.push({ tick: sim.tick, kind: "die", pid: p.id, by: p.trapperId, cause: "timeout" });
        continue;
      }

      const touchers = sim.players.filter(other =>
        other.id !== p.id && other.state === "alive" && Math.hypot(other.x - p.x, other.y - p.y) <= GRID.TOUCH_DIST_PX
      );
      if (!touchers.length) continue;

      const foe = touchers.find(other => sim.mode !== "team" || other.team !== p.team);
      if (foe) {
        p.state = "dead";
        p.deaths++;
        foe.kills++;
        sim.events.push({ t: "die", pid: p.id, by: foe.id });
        sim.reviewLog.push({ tick: sim.tick, kind: "die", pid: p.id, by: foe.id, cause: "touch" });
      } else {
        const ally = touchers[0];
        p.state = "alive";
        p.trapMs = 0;
        p.trapperId = null;
        p.invulnMs = TIMING.RESCUE_INVULN_MS;
        ally.rescues++;
        sim.events.push({ t: "rescue", pid: p.id, by: ally.id });
        sim.reviewLog.push({ tick: sim.tick, kind: "rescue", pid: p.id, by: ally.id });
      }
    }

    checkWinner(sim);
    return sim;
  }

  // 판 끝난 뒤 AI 선생님 복기 분석 (게임 도중엔 쓰지 않음 — CONVENTIONS.md)
  function analyzeMatch(sim, focusId) {
    if (!sim) return { oppFlow: "", myFlow: "", reason: "" };
    const me = sim.players.find(p => p.id === focusId) || sim.players[0];
    const topKiller = sim.players.slice().sort((a, b) => b.kills - a.kills || b.itemsPicked - a.itemsPicked)[0];
    const oppFlow = topKiller && topKiller.id !== me.id
      ? `상대 에이스 [${topKiller.name}]: ${topKiller.kills}킬 · 아이템 ${topKiller.itemsPicked}개 · 블록 ${topKiller.crates}개 파괴`
      : `총 경기 시간 ${Math.round(sim.elapsedMs / 1000)}초 · ${sim.mapName} (${sim.mode === "team" ? "팀전" : "개인전"})`;

    const myFlow = `${me.name}: ${me.kills}킬 · 구출 ${me.rescues}회 · 블록 ${me.crates}개 · 아이템 ${me.itemsPicked}개 (풍선 ${me.maxBombs} / 줄기 ${me.power} / 속도 ${me.speed})`;

    const tips = [];
    if (me.selfTraps > 0) {
      tips.push(`내 물풍선에 ${me.selfTraps}번 스스로 갇혔어요! 설치 직후 곧바로 직각(L자) 골목으로 빠지는 습관이 중요해요.`);
    }
    if (me.needles > 0 && me.deaths > 0) {
      tips.push(`바늘을 ${me.needles}개 남긴 채 터졌어요! 갇히는 즉시 Ctrl(또는 바늘 버튼)으로 탈출하세요.`);
    }
    if (me.itemsPicked < 3 && me.crates < 4) {
      tips.push("초반 블록 파밍이 적었어요. 물약·롤러 2~3개를 먼저 먹은 뒤 중앙 교전에 합류하면 훨씬 유리해요.");
    }
    if (!tips.length) {
      tips.push(me.state !== "dead"
        ? "자폭 없이 안정적인 거리 유지와 파밍 밸런스가 아주 좋았어요!"
        : "물풍선 2개를 L자로 겹쳐 퇴로를 끊는(가두기) 연쇄 각을 노려 보세요.");
    }
    return { oppFlow, myFlow, reason: tips.join(" ") };
  }

  function exportSnapshot(sim) {
    return {
      t: sim.tick,
      w: sim.warmupMs,
      tm: Math.round(sim.timeLeftMs),
      g: sim.grid.map(r => r.join("")).join("\n"),
      p: sim.players.map(p => ({
        id: p.id, n: p.name, k: p.kind, tm: p.team, ch: p.charId,
        x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
        d: p.dir, f: p.faceDir, s: p.state, tp: Math.round(p.trapMs),
        tdm: p.trapDeathMs, iv: Math.round(p.invulnMs), dv: Math.round(p.devilMs),
        mb: p.maxBombs, pw: p.power, sp: p.speed, ck: p.canKick ? 1 : 0, ct: p.canThrow ? 1 : 0,
        nd: p.needles, kl: p.kills, rs: p.rescues,
      })),
      b: sim.bombs.map(b => ({
        id: b.id, o: b.owner, c: b.c, r: b.r, x: Math.round(b.x), y: Math.round(b.y),
        pw: b.power, fs: Math.round(b.fuseMs), air: Math.round(b.airMs), vx: b.vx, vy: b.vy,
      })),
      fl: sim.flames.map(f => ({ c: f.c, r: f.r, k: f.kind, d: f.dir, ms: Math.round(f.ms) })),
      it: sim.items.map(i => ({ id: i.id, k: i.kind, c: i.c, r: i.r })),
      pl: (sim.planes || []).map(pl => ({ r: pl.r, x: Math.round(pl.x) })),
      win: sim.winner,
      ev: sim.events,
    };
  }

  return {
    COLS, ROWS, T, DIR_DX, DIR_DY,
    mulberry32,
    createMatch,
    step,
    canStand,
    chooseLookaheadDir,
    placeOrThrowBomb,
    useNeedle,
    analyzeMatch,
    exportSnapshot,
  };
});

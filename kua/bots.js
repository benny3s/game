/* 베니 크아 — BFS 위험 회피 · 구출/처치 · 안전 폭파 AI 봇 (kua/bots.js)
   · Node · 브라우저 공용 (UMD) */
((root, factory) => {
  const mod = factory(
    root.KuaRules || (typeof require === "function" ? require("./rules.js") : null),
    root.KuaCore || (typeof require === "function" ? require("./core.js") : null)
  );
  if (typeof module === "object" && module.exports) module.exports = mod;
  root.KuaBots = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, (Rules, Core) => {
  "use strict";

  const { GRID, TIMING, ITEMS, speedPxPerSec } = Rules;
  const COLS = GRID.COLS;
  const ROWS = GRID.ROWS;
  const T = GRID.TILE_PX;
  const DX = Core.DIR_DX;
  const DY = Core.DIR_DY;

  const isWall = ch => ch === "#" || ch === "B" || ch === "M";

  function buildDangerGrid(sim, extraBomb = null) {
    const danger = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
    const flames = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    for (const f of sim.flames) flames[f.r][f.c] = true;

    const bombs = sim.bombs.map(b => ({ ...b, fuseMs: Math.max(0, b.fuseMs) + Math.max(0, b.airMs || 0) }));
    if (extraBomb) bombs.push(extraBomb);

    // 연쇄 폭발 전파로 각 풍선의 실질 폭발 시각 계산
    const effFuse = new Map(bombs.map(b => [b, b.fuseMs]));
    const blastOf = (b) => {
      const cells = [[b.c, b.r]];
      for (let d = 1; d <= 4; d++) {
        for (let k = 1; k <= b.power; k++) {
          const nc = b.c + DX[d] * k, nr = b.r + DY[d] * k;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
          if (sim.grid[nr][nc] === "#") break;
          cells.push([nc, nr]);
          if (sim.grid[nr][nc] === "B" || sim.grid[nr][nc] === "M") break;
        }
      }
      return cells;
    };

    const blasts = bombs.map(b => ({ b, cells: blastOf(b) }));
    for (let pass = 0; pass < bombs.length; pass++) {
      let changed = false;
      for (const { b, cells } of blasts) {
        const tA = effFuse.get(b);
        for (const [c, r] of cells) {
          for (const other of bombs) {
            if (other !== b && other.c === c && other.r === r) {
              const tB = effFuse.get(other);
              if (tA < tB) { effFuse.set(other, tA); changed = true; }
            }
          }
        }
      }
      if (!changed) break;
    }

    for (const { b, cells } of blasts) {
      const t = Math.max(0, effFuse.get(b));
      for (const [c, r] of cells) {
        if (t < danger[r][c]) danger[r][c] = t;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (flames[r][c]) danger[r][c] = 0;
      }
    }
    return { danger, flames };
  }

  function hasSafeEscape(sim, p, c, r) {
    const { danger } = buildDangerGrid(sim, {
      id: -1, owner: p.id, c, r, power: p.power, fuseMs: TIMING.FUSE_MS, vx: 0, vy: 0, airMs: 0,
    });
    const speedPx = speedPxPerSec(p.speed);
    const msPerTile = (T / speedPx) * 1000;
    const maxBudgetMs = TIMING.FUSE_MS - 360; // 안전 여유

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
    visited[r][c] = 0;
    const q = [[c, r, 0]];
    while (q.length) {
      const [cc, cr, tm] = q.shift();
      if (danger[cr][cc] === Infinity) return true;
      for (let d = 1; d <= 4; d++) {
        const nc = cc + DX[d], nr = cr + DY[d];
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        if (isWall(sim.grid[nr][nc])) continue;
        if (sim.bombs.some(b => b.airMs <= 0 && b.c === nc && b.r === nr && !(nc === c && nr === r))) continue;
        const ntm = tm + msPerTile;
        if (ntm >= danger[nr][nc] - 180 || ntm > maxBudgetMs) continue;
        if (ntm < visited[nr][nc]) {
          visited[nr][nc] = ntm;
          q.push([nc, nr, ntm]);
        }
      }
    }
    return false;
  }

  function bfsFirstDir(sim, p, startC, startR, goalFn, danger, avoidDanger = true) {
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    visited[startR][startC] = true;
    const msPerTile = (T / speedPxPerSec(p.speed)) * 1000;
    const q = [[startC, startR, 0, 0]]; // c, r, firstDir, dist
    const blockedBomb = (c, r) => sim.bombs.some(b => b.airMs <= 0 && b.c === c && b.r === r && !p.graceBombs.includes(b.id));

    while (q.length) {
      const [c, r, firstDir, dist] = q.shift();
      if (dist > 0 && goalFn(c, r, dist)) return { dir: firstDir, dist, c, r };
      for (let d = 1; d <= 4; d++) {
        const nc = c + DX[d], nr = r + DY[d];
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        if (visited[nr][nc]) continue;
        if (isWall(sim.grid[nr][nc])) continue;
        if (blockedBomb(nc, nr)) continue;
        if (danger[nr][nc] === 0) continue; // 불타는 물줄기 진입 금지
        if (avoidDanger) {
          if (danger[nr][nc] < Infinity) continue;
        } else {
          const arrivalMs = (dist + 1) * msPerTile;
          if (arrivalMs >= danger[nr][nc] - 160) continue;
        }
        visited[nr][nc] = true;
        q.push([nc, nr, firstDir || d, dist + 1]);
      }
    }
    return null;
  }

  // 칸 중심 레인 정렬: 고속에서도 왕복 진동 없도록 틱 이동량의 65% 여유 적용
  function alignStepToCell(p, targetDir) {
    if (!targetDir) return 0;
    const stepPerTick = speedPxPerSec(p.speed) / TIMING.TICK_HZ;
    const tol = Math.max(4.5, stepPerTick * 0.65);
    const pc = Math.floor(p.x / T), pr = Math.floor(p.y / T);
    const cx = pc * T + T * 0.5, cy = pr * T + T * 0.5;
    if (targetDir === 2 || targetDir === 4) {
      if (Math.abs(p.y - cy) > tol) return p.y < cy ? 3 : 1;
    } else {
      if (Math.abs(p.x - cx) > tol) return p.x < cx ? 2 : 4;
    }
    return targetDir;
  }

  function decideBotInput(sim, p) {
    if (!p || p.state === "dead") return { dir: 0, bomb: false, needle: false };
    const pc = Math.floor(p.x / T), pr = Math.floor(p.y / T);
    const tier = p.tier || "normal";
    const { danger } = buildDangerGrid(sim);

    const outDir = d => (p.devilMs > 0 && tier === "hard" ? [0, 3, 4, 1, 2][d] : d);

    // 갇힘 상태: 바늘 탈출 + 팀원(또는 적 회피) 방향으로 기어가기
    if (p.state === "trapped") {
      let useNd = false;
      if (p.needles > 0) {
        const enemyClose = sim.players.some(q =>
          q.id !== p.id && q.state === "alive" && (sim.mode === "free" || q.team !== p.team) &&
          Math.hypot(q.x - p.x, q.y - p.y) <= T * (tier === "hard" ? 3.2 : 2.2)
        );
        if (enemyClose || p.trapMs < (tier === "easy" ? 700 : 1800)) useNd = true;
      }
      let dir = 0;
      if (sim.mode === "team") {
        const ally = sim.players.find(q => q.id !== p.id && q.team === p.team && q.state === "alive");
        if (ally) {
          dir = Math.abs(ally.x - p.x) > Math.abs(ally.y - p.y)
            ? (ally.x > p.x ? 2 : 4)
            : (ally.y > p.y ? 3 : 1);
        }
      }
      if (!dir) {
        const foe = sim.players.find(q => q.id !== p.id && q.state === "alive" && (sim.mode === "free" || q.team !== p.team));
        if (foe) {
          dir = Math.abs(foe.x - p.x) > Math.abs(foe.y - p.y)
            ? (foe.x > p.x ? 4 : 2)
            : (foe.y > p.y ? 1 : 3);
        }
      }
      return { dir: outDir(dir), bomb: false, needle: useNd };
    }

    // 1순위: 현재 위험 타일 탈출!
    if (danger[pr][pc] < Infinity) {
      const esc = bfsFirstDir(sim, p, pc, pr, (c, r) => danger[r][c] === Infinity, danger, false);
      if (esc) {
        return { dir: outDir(alignStepToCell(p, esc.dir)), bomb: false, needle: false };
      }
    }

    // 2순위: 갇힌 아군 구출 / 갇힌 적 처치
    const trappedTarget = bfsFirstDir(sim, p, pc, pr, (c, r) =>
      sim.players.some(q => q.id !== p.id && q.state === "trapped" && Math.floor(q.x / T) === c && Math.floor(q.y / T) === r),
      danger, true
    );
    if (trappedTarget && trappedTarget.dist <= (tier === "hard" ? 10 : 6)) {
      return { dir: outDir(alignStepToCell(p, trappedTarget.dir)), bomb: false, needle: false };
    }

    // 3순위: 안전한 좋은 아이템 획득
    const badItems = tier === "easy" ? new Set() : new Set(["devil", "green_devil"]);
    const itemSeek = bfsFirstDir(sim, p, pc, pr, (c, r) =>
      sim.items.some(it => it.c === c && it.r === r && !badItems.has(it.kind) && (ITEMS[it.kind]?.good !== false || tier === "easy")),
      danger, true
    );
    if (itemSeek && itemSeek.dist <= (tier === "hard" ? 6 : 4)) {
      return { dir: outDir(alignStepToCell(p, itemSeek.dir)), bomb: false, needle: false };
    }

    // 4순위: 적 견제 또는 파괴 블록 옆이면 안전 탈출 가능할 때 물풍선 설치
    const ownedBombs = sim.bombs.filter(b => b.owner === p.id).length;
    if (ownedBombs < p.maxBombs && !sim.bombs.some(b => b.c === pc && b.r === pr)) {
      const nearCrate = [1, 2, 3, 4].some(d => {
        const nc = pc + DX[d], nr = pr + DY[d];
        return nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && (sim.grid[nr][nc] === "B" || sim.grid[nr][nc] === "M");
      });
      const nearEnemy = sim.players.some(q => {
        if (q.id === p.id || q.state !== "alive") return false;
        if (sim.mode === "team" && q.team === p.team) return false;
        const ec = Math.floor(q.x / T), er = Math.floor(q.y / T);
        return (ec === pc && Math.abs(er - pr) <= p.power) || (er === pr && Math.abs(ec - pc) <= p.power);
      });
      const chance = tier === "easy" ? ((sim.tick % 5) === 0) : true;
      if (chance && (nearCrate || nearEnemy) && hasSafeEscape(sim, p, pc, pr)) {
        return { dir: 0, bomb: true, needle: false };
      }
    }

    // 5순위: 적 또는 블록 근처로 전진
    let moveGoal = null;
    if (tier !== "easy") {
      moveGoal = bfsFirstDir(sim, p, pc, pr, (c, r) =>
        sim.players.some(q =>
          q.id !== p.id && q.state === "alive" && (sim.mode === "free" || q.team !== p.team) &&
          Math.abs(Math.floor(q.x / T) - c) + Math.abs(Math.floor(q.y / T) - r) <= 1
        ),
        danger, true
      );
    }
    if (!moveGoal || moveGoal.dist > (tier === "hard" ? 8 : 5)) {
      moveGoal = bfsFirstDir(sim, p, pc, pr, (c, r) =>
        [1, 2, 3, 4].some(d => {
          const nc = c + DX[d], nr = r + DY[d];
          return nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && (sim.grid[nr][nc] === "B" || sim.grid[nr][nc] === "M");
        }),
        danger, true
      );
    }

    const rawDir = moveGoal ? moveGoal.dir : ((Math.floor((sim.tick + p.slot * 7) / 14) % 4) + 1);
    return { dir: outDir(alignStepToCell(p, rawDir)), bomb: false, needle: false };
  }

  return {
    buildDangerGrid,
    hasSafeEscape,
    decideBotInput,
  };
});

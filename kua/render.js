/* 베니 크아 — 2.5D 깊이 정렬 캔버스 렌더러 (kua/render.js)
   · 바닥/아이템/물줄기 후 행(r = 0..ROWS-1) 단위 Painter's Algorithm으로 집(H)·나무(#)·블록(B/M)·풍선·캐릭터·풀숲(G) 순서 렌더
   · 최상단에 이름표·내 화살표(▼) 오버레이를 그려 지붕 뒤에서도 아군/내 위치 가시성 유지 */
((root) => {
  "use strict";
  const Rules = root.KuaRules;
  const Maps = root.KuaMaps;

  function renderMatch(ctx, snap, opts = {}) {
    if (!ctx || !snap) return;
    const skin = (root.KuaSkins && root.KuaSkins[opts.skinId || "default"]) || (root.KuaSkins && root.KuaSkins.default);
    if (!skin) return;

    const T = Rules.GRID.TILE_PX;
    const COLS = Rules.GRID.COLS;
    const ROWS = Rules.GRID.ROWS;
    const rows = typeof snap.g === "string" ? snap.g.split("\n").map(l => l.split("")) : snap.grid;
    const mapDef = Maps.getMap(opts.mapId || "village10");
    const themeId = mapDef.theme || "village";
    const theme = skin.getTheme(themeId);
    const nowMs = opts.nowMs || Date.now();
    const myId = opts.myId || "p0";
    const mode = opts.mode || "free";

    ctx.clearRect(0, 0, COLS * T, ROWS * T);

    // 1) 바닥
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        skin.drawFloorCell(ctx, theme, c, r, T, mapDef.id);
      }
    }

    // 2) 바닥 아이템 & 물줄기
    for (const it of (snap.it || snap.items || [])) {
      skin.drawItem(ctx, { id: it.id, kind: it.k || it.kind, c: it.c, r: it.r }, T, nowMs);
    }
    for (const f of (snap.fl || snap.flames || [])) {
      skin.drawFlame(ctx, {
        c: f.c, r: f.r,
        kind: f.k || f.kind, dir: f.d != null ? f.d : f.dir,
        ms: f.ms,
      }, T, Rules.TIMING.FLAME_MS);
    }

    // 3) 행 단위 깊이 정렬 준비
    const players = (snap.p || snap.players || []).map(p => ({
      id: p.id,
      name: p.n || p.name,
      team: p.tm != null ? p.tm : p.team,
      charId: p.ch || p.charId,
      x: p.x, y: p.y,
      dir: p.d != null ? p.d : p.dir,
      faceDir: p.f != null ? p.f : (p.faceDir || 3),
      walkPhase: p.wp != null ? p.wp : (p.walkPhase || nowMs * 0.015),
      state: p.s || p.state,
      trapMs: p.tp != null ? p.tp : p.trapMs,
      trapDeathMs: p.tdm != null ? p.tdm : (p.trapDeathMs || Rules.TIMING.TRAP_DEATH_MS),
      invulnMs: p.iv != null ? p.iv : (p.invulnMs || 0),
      devilMs: p.dv != null ? p.dv : (p.devilMs || 0),
    })).sort((a, b) => a.y - b.y);

    const me = players.find(p => p.id === myId);
    const playersByRow = Array.from({ length: ROWS }, () => []);
    for (const p of players) {
      const rr = Math.min(ROWS - 1, Math.max(0, Math.floor(p.y / T)));
      playersByRow[rr].push(p);
    }

    const bombsByRow = Array.from({ length: ROWS }, () => []);
    for (const b of (snap.b || snap.bombs || [])) {
      const rr = Math.min(ROWS - 1, Math.max(0, Math.floor(b.y / T)));
      bombsByRow[rr].push({
        x: b.x, y: b.y,
        fuseMs: b.fs != null ? b.fs : b.fuseMs,
        airMs: b.air != null ? b.air : (b.airMs || 0),
      });
    }

    // 4) 행별 Painter's Algorithm (블록 -> 물풍선 -> 캐릭터 -> 풀숲)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = rows[r][c];
        if (ch === "#" || ch === "H" || ch === "B" || ch === "M") {
          skin.drawBlock(ctx, theme, ch, c, r, T, themeId);
        }
      }
      for (const b of bombsByRow[r]) {
        skin.drawBomb(ctx, b, T, nowMs, Rules.TIMING.FUSE_MS);
      }
      for (const p of playersByRow[r]) {
        skin.drawCharacter(ctx, p, T, p.id === myId, mode, nowMs);
      }
      for (let c = 0; c < COLS; c++) {
        if (rows[r][c] === "G") {
          const dim = players.some(p =>
            p.state !== "dead" &&
            (p.id === myId || (mode === "team" && me && p.team === me.team)) &&
            Math.floor(p.x / T) === c && Math.floor(p.y / T) === r
          );
          skin.drawBush(ctx, theme, c, r, T, dim);
        }
      }
    }

    // 5) 이름표 & 내 캐릭터 화살표(▼) 오버레이
    if (skin.drawCharacterOverlay) {
      for (const p of players) {
        skin.drawCharacterOverlay(ctx, p, T, p.id === myId, mode, nowMs);
      }
    }

    // 6) 카운트다운 워밍업 표시
    const warm = snap.w != null ? snap.w : (snap.warmupMs || 0);
    if (warm > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 22, 52, 0.34)";
      ctx.fillRect(0, 0, COLS * T, ROWS * T);
      ctx.font = "900 46px 'Jua', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = warm > 360 ? "READY!" : "START!";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#082f49";
      ctx.strokeText(label, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.fillStyle = warm > 360 ? "#fde047" : "#38bdf8";
      ctx.fillText(label, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.restore();
    }
  }

  root.KuaRender = { renderMatch };
})(typeof window !== "undefined" ? window : globalThis);

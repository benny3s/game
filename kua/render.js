/* 베니 크아 — 캔버스 렌더러 (kua/render.js)
   · 스킨 훅(KuaSkins[skinId])으로 배경/블록/풀숲/물풍선/캐릭터를 계층 순서대로 렌더
   · 풀숲(G) 은 캐릭터/아이템 위 레이어에 그려 숨기 연출(같은 편 또는 인접 시 반투명) */
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
    const theme = skin.getTheme(mapDef.theme);
    const nowMs = opts.nowMs || Date.now();
    const myId = opts.myId || "p0";
    const mode = opts.mode || "free";

    ctx.clearRect(0, 0, COLS * T, ROWS * T);

    // 1) 바닥 + 풀숲 아래 바닥
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        skin.drawFloorCell(ctx, theme, c, r, T, mapDef.id);
      }
    }

    // 2) 아이템 + 물줄기 + 정적 블록
    for (const it of (snap.it || snap.items || [])) {
      skin.drawItem(ctx, { id: it.id, kind: it.k || it.kind, c: it.c, r: it.r }, T, nowMs);
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = rows[r][c];
        if (ch === "#" || ch === "B" || ch === "M") {
          skin.drawBlock(ctx, theme, ch, c, r, T);
        }
      }
    }

    // 3) 물풍선 & 물줄기
    for (const b of (snap.b || snap.bombs || [])) {
      skin.drawBomb(ctx, {
        x: b.x, y: b.y,
        fuseMs: b.fs != null ? b.fs : b.fuseMs,
        airMs: b.air != null ? b.air : (b.airMs || 0),
      }, T, nowMs, Rules.TIMING.FUSE_MS);
    }
    for (const f of (snap.fl || snap.flames || [])) {
      skin.drawFlame(ctx, {
        c: f.c, r: f.r,
        kind: f.k || f.kind, dir: f.d != null ? f.d : f.dir,
        ms: f.ms,
      }, T, Rules.TIMING.FLAME_MS);
    }

    // 4) 캐릭터 (Y 좌표 정렬로 원근감)
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

    for (const p of players) {
      skin.drawCharacter(ctx, p, T, p.id === myId, mode, nowMs);
    }

    // 5) 풀숲(G) 오버레이 — 캐릭터/풍선 위를 덮어 숨기 구현 (내/같은편 위치면 반투명)
    const me = players.find(p => p.id === myId);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (rows[r][c] === "G") {
          const meInside = me && me.state !== "dead" && Math.floor(me.x / T) === c && Math.floor(me.y / T) === r;
          skin.drawBush(ctx, theme, c, r, T, !!meInside);
        }
      }
    }

    // 6) 카운트다운 워밍업 표시
    const warm = snap.w != null ? snap.w : (snap.warmupMs || 0);
    if (warm > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 12, 22, 0.48)";
      ctx.fillRect(0, 0, COLS * T, ROWS * T);
      ctx.font = "900 44px 'Jua', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fde047";
      ctx.fillText(warm > 600 ? "READY..." : "START!", (COLS * T) / 2, (ROWS * T) / 2);
      ctx.restore();
    }
  }

  root.KuaRender = { renderMatch };
})(typeof window !== "undefined" ? window : globalThis);

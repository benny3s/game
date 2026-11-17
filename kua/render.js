/* 베니 크아 — 2.5D 깊이 정렬 · VFX 파티클 · 비행기 · 컷인 배너 렌더러 (kua/render.js) */
((root) => {
  "use strict";
  const Rules = root.KuaRules;
  const Maps = root.KuaMaps;

  const vfx = [];
  let shakeMs = 0;
  let lastStepMs = 0;

  function clearVfx() {
    vfx.length = 0;
    shakeMs = 0;
  }

  function pushEvents(events, stateLike) {
    if (!events || !events.length) return;
    const T = Rules.GRID.TILE_PX;
    const plist = stateLike ? (stateLike.p || stateLike.players || []) : [];

    for (const ev of events) {
      if (ev.t === "pop") {
        shakeMs = Math.max(shakeMs, 150);
        const cx = ev.c * T + T * 0.5, cy = ev.r * T + T * 0.5;
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const spd = 65 + Math.random() * 85;
          vfx.push({
            kind: "drop", x: cx, y: cy,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 35,
            r: 3 + Math.random() * 2.5, col: i % 2 ? "#7dd3fc" : "#e0f2fe",
            ms: 0, maxMs: 360 + Math.random() * 120,
          });
        }
      } else if (ev.t === "block") {
        const cx = ev.c * T + T * 0.5, cy = ev.r * T + T * 0.5;
        const alt = (ev.c + ev.r) % 2 === 0;
        const cMain = ev.kind === "M" ? "#facc15" : (alt ? "#f97316" : "#ef4444");
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
          const spd = 55 + Math.random() * 90;
          vfx.push({
            kind: "chunk", x: cx, y: cy,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 85,
            rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
            sz: 5 + Math.random() * 4, col: cMain,
            ms: 0, maxMs: 420 + Math.random() * 140,
          });
        }
      } else if (ev.t === "item" || ev.t === "airdrop") {
        const cx = ev.c * T + T * 0.5, cy = ev.r * T + T * 0.45;
        vfx.push({
          kind: "ring", x: cx, y: cy, r0: 6, r1: 24,
          col: ev.t === "airdrop" ? "#38bdf8" : "#fde047",
          ms: 0, maxMs: 320,
        });
      } else if (ev.t === "needle" || ev.t === "rescue") {
        const p = plist.find(q => q.id === ev.pid);
        const cx = p ? p.x : (ev.c * T + T * 0.5);
        const cy = p ? p.y : (ev.r * T + T * 0.5);
        vfx.push({ kind: "ring", x: cx, y: cy - 8, r0: 14, r1: 38, col: "#38bdf8", ms: 0, maxMs: 360 });
        vfx.push({
          kind: "text", x: cx, y: cy - 26, vy: -42,
          txt: ev.t === "needle" ? "바늘 탈출!" : "구출!",
          col: "#fde047", ms: 0, maxMs: 750,
        });
      } else if (ev.t === "die") {
        shakeMs = Math.max(shakeMs, 220);
        const p = plist.find(q => q.id === ev.pid);
        if (p) {
          vfx.push({ kind: "ring", x: p.x, y: p.y - 8, r0: 18, r1: 48, col: "#f87171", ms: 0, maxMs: 420 });
          vfx.push({
            kind: "ko", x: p.x, y: p.y - 10, vy: -210,
            vx: (Math.random() - 0.5) * 90, ch: p.ch || p.charId || "dao",
            ms: 0, maxMs: 950,
          });
          vfx.push({
            kind: "text", x: p.x, y: p.y - 32, vy: -38,
            txt: "POP!", col: "#fca5a5", ms: 0, maxMs: 800,
          });
        }
      }
    }
    if (vfx.length > 140) vfx.splice(0, vfx.length - 140);
  }

  function stepAndDrawVfx(ctx, skin, dtMs) {
    const dt = dtMs / 1000;
    for (let i = vfx.length - 1; i >= 0; i--) {
      const p = vfx[i];
      p.ms += dtMs;
      if (p.ms >= p.maxMs) { vfx.splice(i, 1); continue; }
      const t = p.ms / p.maxMs;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * t);

      if (p.kind === "drop") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - t * 0.4), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === "chunk") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt; p.rot += p.vr * dt;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.sz * 0.5, -p.sz * 0.5, p.sz, p.sz * 0.8);
      } else if (p.kind === "ring") {
        const rad = p.r0 + (p.r1 - p.r0) * t;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 3.5 * (1 - t);
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === "text") {
        p.y += p.vy * dt;
        ctx.font = "900 14px 'Jua', sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3.5; ctx.strokeStyle = "#082f49";
        ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillStyle = p.col;
        ctx.fillText(p.txt, p.x, p.y);
      } else if (p.kind === "ko") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 7);
        ctx.scale(1 - t * 0.35, 1 - t * 0.35);
        ctx.fillStyle = "rgba(56, 189, 248, 0.72)";
        ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }

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
    const dtMs = lastStepMs ? Math.min(50, Math.max(0, nowMs - lastStepMs)) : 16;
    lastStepMs = nowMs;
    if (shakeMs > 0) shakeMs = Math.max(0, shakeMs - dtMs);

    const myId = opts.myId || "p0";
    const mode = opts.mode || "free";

    ctx.save();
    const cw = ctx.canvas ? ctx.canvas.width : COLS * T;
    const ch = ctx.canvas ? ctx.canvas.height : ROWS * T;
    const shAmt = shakeMs > 0 ? (shakeMs / 220) * 3.2 : 0;
    const shX = shAmt ? (Math.sin(nowMs * 0.14) * shAmt) : 0;
    const shY = shAmt ? (Math.cos(nowMs * 0.19) * shAmt) : 0;
    ctx.setTransform(cw / (COLS * T), 0, 0, ch / (ROWS * T), shX, shY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(-8, -8, COLS * T + 16, ROWS * T + 16);

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
      }, T, Rules.TIMING.FLAME_MS, nowMs);
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
        const chT = rows[r][c];
        if (chT === "#" || chT === "H" || chT === "B" || chT === "M") {
          skin.drawBlock(ctx, theme, chT, c, r, T, themeId);
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

    // 5) VFX 파티클 + 보급 비행기 + 이름표/내 화살표
    stepAndDrawVfx(ctx, skin, dtMs);
    if (skin.drawAirplane) {
      for (const pl of (snap.pl || snap.planes || [])) {
        skin.drawAirplane(ctx, pl, T, nowMs);
      }
    }
    if (skin.drawCharacterOverlay) {
      for (const p of players) {
        skin.drawCharacterOverlay(ctx, p, T, p.id === myId, mode, nowMs);
      }
    }

    // 6) 카운트다운 READY/START & 종료 컷인 배너
    const warm = snap.w != null ? snap.w : (snap.warmupMs || 0);
    if (warm > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 22, 52, 0.34)";
      ctx.fillRect(0, 0, COLS * T, ROWS * T);
      ctx.font = "900 48px 'Jua', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = warm > 360 ? "READY!" : "START!";
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#082f49";
      ctx.strokeText(label, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.fillStyle = warm > 360 ? "#fde047" : "#38bdf8";
      ctx.fillText(label, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.restore();
    } else if (opts.finishBanner) {
      ctx.save();
      ctx.fillStyle = "rgba(6, 18, 46, 0.42)";
      ctx.fillRect(0, (ROWS * T) * 0.36, COLS * T, (ROWS * T) * 0.28);
      ctx.font = "900 54px 'Jua', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 9;
      ctx.strokeStyle = "#082f49";
      ctx.strokeText(opts.finishBanner, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.fillStyle = opts.finishColor || "#fde047";
      ctx.fillText(opts.finishBanner, (COLS * T) / 2, (ROWS * T) / 2);
      ctx.restore();
    }
    ctx.restore();
  }

  root.KuaRender = { renderMatch, pushEvents, clearVfx };
})(typeof window !== "undefined" ? window : globalThis);

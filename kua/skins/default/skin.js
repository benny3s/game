/* 베니 크아 — 크레이지 아케이드 감성 2.5D 자체 스킨 팩 (kua/skins/default/skin.js)
   · 2.5D 지붕 집(H) · 풍성한 나무(#) · 4스터드 레고 블록(B/M) · 덤불(G) · 벡터 아이템 · SD 9종 캐릭터 */
((root) => {
  "use strict";
  const Skins = root.KuaSkins || (root.KuaSkins = {});
  const Rules = root.KuaRules;

  const THEMES = {
    village: {
      groundA: "#65bf3b", groundB: "#59b330", groundEdge: "#499924",
      roadA: "#7b8496", roadB: "#70798b", roadLine: "#eef2ff", curb: "#cbd5e1",
      treeLeaf: "#22c55e", treeDark: "#15803d", treeHi: "#86efac", trunk: "#6d4223",
      boxA: "#f97316", boxAFront: "#c2410c", boxB: "#ef4444", boxBFront: "#b91c1c",
      pushA: "#facc15", pushFront: "#b45309",
      bush: "#15803d", bushHi: "#4ade80", bushBerry: "#f43f5e",
    },
    pirate: {
      groundA: "#d8a462", groundB: "#c99452", groundEdge: "#a6753b",
      roadA: "#9e2a2b", roadB: "#8c2224", roadLine: "#fbbf24", curb: "#78350f",
      treeLeaf: "#14b8a6", treeDark: "#0f766e", treeHi: "#5eead4", trunk: "#7c2d12",
      boxA: "#d97706", boxAFront: "#92400e", boxB: "#b45309", boxBFront: "#78350f",
      pushA: "#fbbf24", pushFront: "#92400e",
      bush: "#0f766e", bushHi: "#2dd4bf", bushBerry: "#fde047",
    },
    camp: {
      groundA: "#458458", groundB: "#3d784f", groundEdge: "#2d5d3c",
      roadA: "#64748b", roadB: "#55647a", roadLine: "#e2e8f0", curb: "#475569",
      treeLeaf: "#16a34a", treeDark: "#14532d", treeHi: "#4ade80", trunk: "#5c3a21",
      boxA: "#ca8a04", boxAFront: "#854d0e", boxB: "#9a3412", boxBFront: "#7c2d12",
      pushA: "#60a5fa", pushFront: "#1d4ed8",
      bush: "#166534", bushHi: "#22c55e", bushBerry: "#fb923c",
    },
  };

  function getTheme(themeId) {
    return THEMES[themeId] || THEMES.village;
  }

  function drawFloorCell(ctx, theme, c, r, T, mapId) {
    const x = c * T, y = r * T;
    const alt = (c + r) % 2 === 0;
    const isVillageRoad = mapId === "village10" && (c === 7 || r === 6);
    const isPirateAisle = mapId === "patrit14" && (c === 7 || r === 6);
    const isCampTrail = mapId === "camp08" && (r === 6 || (c === 7 && r >= 2 && r <= 10));
    const isRoad = isVillageRoad || isPirateAisle || isCampTrail;

    ctx.fillStyle = isRoad ? (alt ? theme.roadA : theme.roadB) : (alt ? theme.groundA : theme.groundB);
    ctx.fillRect(x, y, T, T);

    if (mapId === "pirate" || mapId === "patrit14") {
      ctx.fillStyle = "rgba(69,26,3,0.16)";
      ctx.fillRect(x, y + T * 0.48, T, 1.5);
      ctx.fillRect(x, y + T - 1.5, T, 1.5);
      ctx.fillStyle = "rgba(255,248,220,0.12)";
      ctx.fillRect(x + 6, y + 8, 2.5, 2.5);
      ctx.fillRect(x + T - 9, y + T - 11, 2.5, 2.5);
    } else if (!isRoad) {
      // 크아 특유 레고 스터드 / 잔디 도트 감성
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.beginPath(); ctx.arc(x + T * 0.28, y + T * 0.3, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + T * 0.72, y + T * 0.72, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = theme.groundEdge;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, y + T - 1.5, T, 1.5);
      ctx.globalAlpha = 1;
    }

    if (isRoad) {
      ctx.fillStyle = theme.curb;
      if ((c === 7) && (r !== 6)) {
        ctx.fillRect(x, y, 3, T);
        ctx.fillRect(x + T - 3, y, 3, T);
      }
      if ((r === 6) && (c !== 7)) {
        ctx.fillRect(x, y, T, 3);
        ctx.fillRect(x, y + T - 3, T, 3);
      }
      ctx.fillStyle = theme.roadLine;
      ctx.globalAlpha = 0.75;
      if (c === 7 && r !== 6) ctx.fillRect(x + T / 2 - 2, y + 8, 4, T - 16);
      if (r === 6 && c !== 7) ctx.fillRect(x + 8, y + T / 2 - 2, T - 16, 4);
      if (c === 7 && r === 6) {
        ctx.fillRect(x + 12, y + 12, T - 24, T - 24);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawHouse25D(ctx, x, y, T, c, r, themeId) {
    const roofLift = r === 0 ? 3 : 14;
    const w = T - 2, lx = x + 1;
    const roofPalette = [
      { top: "#ef4444", dark: "#b91c1c", hi: "#fca5a5" },
      { top: "#2563eb", dark: "#1d4ed8", hi: "#93c5fd" },
      { top: "#eab308", dark: "#ca8a04", hi: "#fef08a" },
    ];
    const rp = themeId === "pirate"
      ? { top: "#7c2d12", dark: "#451a03", hi: "#d97706" }
      : themeId === "camp"
        ? ((c + r) % 2 === 0 ? { top: "#ea580c", dark: "#9a3412", hi: "#fdba74" } : { top: "#0284c7", dark: "#0369a1", hi: "#7dd3fc" })
        : roofPalette[(c * 3 + r * 5) % roofPalette.length];

    // 바닥 그림자
    ctx.fillStyle = "rgba(8,15,28,0.28)";
    ctx.beginPath(); ctx.roundRect(lx + 2, y + 6, w, T - 4, 6); ctx.fill();

    if (themeId === "camp") {
      // 캠프 삼각 텐트
      const topY = y - roofLift + 3;
      ctx.fillStyle = rp.dark;
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + T * 0.5, topY);
      ctx.lineTo(lx + w - 1, y + T - 3);
      ctx.lineTo(lx + 1, y + T - 3);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = rp.top;
      ctx.beginPath();
      ctx.moveTo(x + T * 0.5, topY);
      ctx.lineTo(x + T * 0.5, y + T - 3);
      ctx.lineTo(lx + 2, y + T - 3);
      ctx.closePath();
      ctx.fill();

      // 텐트 입구
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(x + T * 0.5, y + 10);
      ctx.lineTo(x + T * 0.5 + 8, y + T - 3);
      ctx.lineTo(x + T * 0.5 - 8, y + T - 3);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // 크림색 벽체
    const wallTop = y + 8;
    const wallH = T - 10;
    ctx.fillStyle = themeId === "pirate" ? "#b45309" : "#f8fafc";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(lx + 2, wallTop, w - 4, wallH, 4); ctx.fill(); ctx.stroke();

    // 벽 하단 그림자
    ctx.fillStyle = themeId === "pirate" ? "#78350f" : "#cbd5e1";
    ctx.fillRect(lx + 3, y + T - 9, w - 6, 6);

    // 문 & 창문
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath(); ctx.roundRect(x + T * 0.5 - 6, y + T - 19, 12, 16, [6, 6, 1, 1]); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(x + T * 0.5 + 3, y + T - 10, 1.5, 0, Math.PI * 2); ctx.fill();

    // 박공 지붕 (2.5D 위칸으로 자연스럽게 솟음)
    const rt = y - roofLift;
    ctx.fillStyle = rp.dark;
    ctx.beginPath();
    ctx.moveTo(lx, wallTop + 4);
    ctx.lineTo(x + T * 0.5, rt);
    ctx.lineTo(lx + w, wallTop + 4);
    ctx.lineTo(lx + w - 2, wallTop + 10);
    ctx.lineTo(lx + 2, wallTop + 10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = rp.top;
    ctx.beginPath();
    ctx.moveTo(lx + 1, wallTop + 3);
    ctx.lineTo(x + T * 0.5, rt + 1);
    ctx.lineTo(lx + w - 3, wallTop + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rp.hi;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(lx + 5, wallTop + 1);
    ctx.lineTo(x + T * 0.5, rt + 3);
    ctx.lineTo(x + T * 0.5 - 2, wallTop + 1);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTree25D(ctx, theme, x, y, T, c, r, themeId) {
    const cx = x + T * 0.5;
    const lift = r === 0 ? 2 : 13;

    // 그림자
    ctx.fillStyle = "rgba(8,15,28,0.28)";
    ctx.beginPath(); ctx.ellipse(cx, y + T - 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();

    if (themeId === "pirate") {
      // 해적 맵: 철제 대포/선박 기둥통
      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(x + 5, y + 6, T - 10, T - 9, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath(); ctx.ellipse(cx, y + 10, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(cx, y + 24, 4, 0, Math.PI * 2); ctx.fill();
      return;
    }

    // 갈색 나무 기둥
    ctx.fillStyle = theme.trunk;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx - 5, y + T - 17, 10, 14, 3); ctx.fill(); ctx.stroke();

    // 풍성한 2.5D 나뭇잎 (윗칸 살짝 겹침)
    const cy = y + 14 - lift * 0.45;
    ctx.fillStyle = theme.treeDark;
    ctx.beginPath(); ctx.arc(cx, cy + 4, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = theme.treeLeaf;
    ctx.beginPath(); ctx.arc(cx, cy, 15.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 8, cy + 3, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy + 3, 9.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = theme.treeHi;
    ctx.beginPath(); ctx.arc(cx - 5, cy - 6, 6.5, 0, Math.PI * 2); ctx.fill();

    // 빌리지 사과 포인트
    if (themeId === "village" && (c + r) % 2 === 0) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(cx + 6, cy - 2, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 6, cy + 4, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawLegoCrate(ctx, topCol, frontCol, x, y, T, pushable) {
    ctx.fillStyle = "rgba(8,15,28,0.26)";
    ctx.beginPath(); ctx.roundRect(x + 3, y + 6, T - 4, T - 4, 5); ctx.fill();

    // 3D 앞면
    ctx.fillStyle = frontCol;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, T - 4, T - 5, 5); ctx.fill(); ctx.stroke();

    // 윗면
    ctx.fillStyle = topCol;
    ctx.beginPath(); ctx.roundRect(x + 2, y + 1, T - 4, T - 12, 4); ctx.fill(); ctx.stroke();

    // 4개의 원형 레고 스터드 또는 밀기 X 띠
    if (pushable) {
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 7, y + 6, T - 14, T - 20);
      ctx.beginPath();
      ctx.moveTo(x + 9, y + 8); ctx.lineTo(x + T - 9, y + T - 16);
      ctx.moveTo(x + T - 9, y + 8); ctx.lineTo(x + 9, y + T - 16);
      ctx.stroke();
    } else {
      const studs = [[12, 9], [T - 12, 9], [12, 20], [T - 12, 20]];
      for (const [sx, sy] of studs) {
        ctx.fillStyle = frontCol;
        ctx.beginPath(); ctx.ellipse(x + sx, y + sy + 1.5, 4.2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.beginPath(); ctx.ellipse(x + sx, y + sy, 4.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawBlock(ctx, theme, tile, c, r, T, themeId = "village") {
    const x = c * T, y = r * T;
    if (tile === "H") {
      drawHouse25D(ctx, x, y, T, c, r, themeId);
      return;
    }
    if (tile === "#") {
      drawTree25D(ctx, theme, x, y, T, c, r, themeId);
      return;
    }
    if (tile === "B") {
      const alt = (c + r) % 2 === 0;
      drawLegoCrate(
        ctx,
        alt ? theme.boxA : theme.boxB,
        alt ? theme.boxAFront : theme.boxBFront,
        x, y, T, false
      );
      return;
    }
    if (tile === "M") {
      drawLegoCrate(ctx, theme.pushA, theme.pushFront, x, y, T, true);
    }
  }

  function drawBush(ctx, theme, c, r, T, dim = false) {
    const x = c * T + T * 0.5, y = r * T + T * 0.5;
    ctx.save();
    ctx.globalAlpha = dim ? 0.42 : 0.96;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(x, r * T + T - 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = theme.bush;
    ctx.strokeStyle = "#064e3b";
    ctx.lineWidth = 1.4;
    [[-9, 3, 11.5], [9, 3, 11.5], [0, -6, 13], [0, 7, 12]].forEach(([ox, oy, rad]) => {
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = theme.bushHi;
    [[-6, -4, 6], [6, -3, 5.5], [0, -9, 6]].forEach(([ox, oy, rad]) => {
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = theme.bushBerry;
    [[-6, 3], [7, -2], [2, 7]].forEach(([ox, oy]) => {
      ctx.beginPath(); ctx.arc(x + ox, y + oy, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawItemVector(ctx, kind) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (kind === "bomb") {
      // 파란 물풍선 + '+'
      ctx.fillStyle = "#0ea5e9";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 1, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath(); ctx.arc(-2.5, -2, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(-2.5, -8.5, 5, 2.5);
    } else if (kind === "fluid" || kind === "ultra") {
      const gold = kind === "ultra";
      ctx.fillStyle = gold ? "#facc15" : "#38bdf8";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-6.5, -2, 13, 10, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(-3, -6.5, 6, 4.5);
      ctx.strokeRect(-3, -6.5, 6, 4.5);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-2.5, -9, 5, 2.5);
      if (gold) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(0, 3, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === "roller") {
      // 분홍 롤러스케이트
      ctx.fillStyle = "#ec4899";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.roundRect(-7, -6, 9, 9, 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-7, 0, 14, 5, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(-4.5, 7, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(4.5, 7, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (kind === "shoe") {
      // 파란 킥 운동화
      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.roundRect(-7, -3, 14, 8, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-7, 3, 14, 3);
      ctx.strokeRect(-7, 3, 14, 3);
    } else if (kind === "glove") {
      // 빨간 복싱 글러브
      ctx.fillStyle = "#ef4444";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, -1, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-5, 4, 10, 4);
      ctx.strokeRect(-5, 4, 10, 4);
    } else if (kind === "needle") {
      // 바늘 (대각선 은색 바늘)
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(7, -7); ctx.stroke();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(7, -7); ctx.stroke();
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath(); ctx.arc(-6, 6, 2.8, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === "red_devil") {
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 1, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-9, -9); ctx.lineTo(-2, -5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(9, -9); ctx.lineTo(2, -5); ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-4, -1, 2.5, 2.5);
      ctx.fillRect(1.5, -1, 2.5, 2.5);
    } else if (kind === "green_devil") {
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 1, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath(); ctx.arc(-2.5, -1, 1.5, 0, Math.PI * 2); ctx.arc(2.5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(3, 2); ctx.stroke();
    } else {
      // 보라 악마 (devil)
      ctx.fillStyle = "#9333ea";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 1, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-8, -9); ctx.lineTo(-2, -5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(8, -9); ctx.lineTo(2, -5); ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-3.5, -1, 2, 2.5);
      ctx.fillRect(1.5, -1, 2, 2.5);
    }
  }

  function drawItem(ctx, it, T, nowMs) {
    const cx = it.c * T + T * 0.5;
    const bob = Math.sin(nowMs * 0.006 + it.id) * 2.4;
    const cy = it.r * T + T * 0.48 + bob;
    const meta = Rules.ITEMS[it.kind] || { good: true };

    ctx.save();
    ctx.fillStyle = "rgba(8,15,28,0.28)";
    ctx.beginPath(); ctx.ellipse(cx, it.r * T + T * 0.85, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 크아 스타일 노란/파란 정사각 둥근 타일 카드
    ctx.translate(cx, cy);
    ctx.fillStyle = meta.good ? "#fef9c3" : "#4c1d95";
    ctx.strokeStyle = meta.good ? "#0284c7" : "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-13.5, -13.5, 27, 27, 7); ctx.fill(); ctx.stroke();

    ctx.fillStyle = meta.good ? "#ffffff" : "#6d28d9";
    ctx.beginPath(); ctx.roundRect(-11, -11, 22, 11, 4); ctx.fill();

    drawItemVector(ctx, it.kind);
    ctx.restore();
  }

  function drawBomb(ctx, b, T, nowMs, fuseMax) {
    const ratio = Math.max(0, Math.min(1, b.fuseMs / fuseMax));
    const urgent = ratio < 0.28 && Math.floor(nowMs / 85) % 2 === 0;
    const wob = Math.sin(nowMs * (urgent ? 0.032 : 0.013));
    const sx = 1 + wob * 0.09;
    const sy = 1 - wob * 0.08;
    const cx = b.x;
    const cy = b.y - (b.airMs > 0 ? Math.sin((b.airMs / 260) * Math.PI) * 26 : 0);

    ctx.save();
    ctx.fillStyle = "rgba(8,15,28,0.32)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 13, 13.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(cx, cy);
    ctx.scale(sx, sy);

    // 풍선 매듭
    ctx.fillStyle = urgent ? "#dc2626" : "#0284c7";
    ctx.strokeStyle = "#082f49";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -14); ctx.lineTo(4, -14); ctx.lineTo(0, -18.5); ctx.closePath();
    ctx.fill(); ctx.stroke();

    const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 16);
    if (urgent) {
      grad.addColorStop(0, "#fff1f2");
      grad.addColorStop(0.5, "#f43f5e");
      grad.addColorStop(1, "#9f1239");
    } else {
      grad.addColorStop(0, "#f0f9ff");
      grad.addColorStop(0.45, "#38bdf8");
      grad.addColorStop(1, "#0369a1");
    }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, 15.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath(); ctx.ellipse(-5.5, -5.5, 4.8, 2.7, -0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, -1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFlame(ctx, f, T, flameMax) {
    const x = f.c * T, y = f.r * T;
    const alpha = Math.max(0.25, Math.min(1, f.ms / flameMax));
    ctx.save();
    ctx.globalAlpha = 0.92 * alpha;

    const pad = 3;
    const isH = f.dir === 2 || f.dir === 4;
    ctx.fillStyle = "#0284c7";
    if (f.kind === "c") {
      ctx.beginPath(); ctx.roundRect(x + 1, y + 1, T - 2, T - 2, 10); ctx.fill();
    } else if (isH) {
      ctx.fillRect(x, y + pad, T, T - pad * 2);
    } else {
      ctx.fillRect(x + pad, y, T - pad * 2, T);
    }

    ctx.fillStyle = "#38bdf8";
    if (f.kind === "c") {
      ctx.beginPath(); ctx.roundRect(x + 4, y + 4, T - 8, T - 8, 8); ctx.fill();
    } else if (isH) {
      ctx.fillRect(x, y + 7, T, T - 14);
    } else {
      ctx.fillRect(x + 7, y, T - 14, T);
    }

    ctx.fillStyle = "#e0f2fe";
    if (f.kind === "c") {
      ctx.beginPath(); ctx.arc(x + T * 0.5, y + T * 0.5, 11, 0, Math.PI * 2); ctx.fill();
    } else if (isH) {
      ctx.fillRect(x, y + 14, T, T - 28);
    } else {
      ctx.fillRect(x + 14, y, T - 28, T);
    }
    ctx.restore();
  }

  function drawHeadgear(ctx, ch, p) {
    const id = p.charId;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    if (id === "dao") {
      ctx.fillStyle = "#2563eb";
      ctx.beginPath(); ctx.arc(0, -12, 12.2, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.beginPath(); ctx.roundRect(-12, -13.5, 24, 3.8, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(0, -17.5, 3, 0, Math.PI * 2); ctx.fill();
    } else if (id === "bazzi") {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(0, -12, 12.5, Math.PI * 0.92, Math.PI * 2.08); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-9.5, -13, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(9.5, -13, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(-10, -13.5, 20, 3);
    } else if (id === "dizni") {
      ctx.fillStyle = "#ec4899";
      ctx.beginPath(); ctx.arc(-11.5, -15, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(11.5, -15, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -12.5, 11.8, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fbcfe8";
      ctx.fillRect(-11, -13.5, 22, 3);
    } else if (id === "rodumani") {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.moveTo(-14, -11); ctx.quadraticCurveTo(0, -25, 14, -11); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-11, -13.5, 22, 3);
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath(); ctx.arc(0, -16.5, 2.3, 0, Math.PI * 2); ctx.fill();
    } else if (id === "uni") {
      ctx.fillStyle = "#9333ea";
      ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(-8, -22); ctx.lineTo(-2, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11, -12); ctx.lineTo(8, -22); ctx.lineTo(2, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -12, 12, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(-11, -13.5, 22, 2.8);
    } else {
      ctx.fillStyle = ch.color;
      ctx.beginPath(); ctx.arc(0, -12, 12, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ch.trim;
      ctx.fillRect(-11.5, -13.5, 23, 3.2);
    }
  }

  function drawCharacter(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const ch = Rules.CHARS[p.charId] || Rules.CHARS.dao;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;

    const trapped = p.state === "trapped";
    const bob = trapped
      ? Math.sin(nowMs * 0.009) * 3.5
      : (p.dir ? Math.abs(Math.sin(p.walkPhase)) * -3.5 : 0);

    ctx.save();
    // 그림자
    ctx.fillStyle = "rgba(8,15,28,0.34)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 13.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    // 팀전 발밑 링
    if (mode === "team") {
      ctx.strokeStyle = p.team === 0 ? "#60a5fa" : "#f87171";
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 15, 6.2, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (isMe) {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 15, 6.2, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.translate(p.x, p.y + bob);

    // 발 & 2등신 몸통
    const swing = p.dir && !trapped ? Math.sin(p.walkPhase) * 3.2 : 0;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.roundRect(-8, 6 + swing * 0.4, 6, 6.5, 2.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(2, 6 - swing * 0.4, 6, 6.5, 2.5); ctx.fill();

    ctx.fillStyle = ch.color;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(-10.5, -2.5, 21, 12, 5.5); ctx.fill(); ctx.stroke();
    // 가슴 벨트 포인트
    ctx.fillStyle = ch.trim;
    ctx.fillRect(-7, 2.5, 14, 2.5);

    // SD 큰 머리
    ctx.fillStyle = ch.skinTone;
    ctx.beginPath(); ctx.arc(0, -10.5, 11.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 모자/헤어
    drawHeadgear(ctx, ch, p);

    // 4방향 얼굴 표정 (뒤돌면 뒷머리만)
    if (p.faceDir !== 1) {
      const lx = p.faceDir === 2 ? 3 : p.faceDir === 4 ? -3 : 0;
      ctx.fillStyle = "#0f172a";
      if (p.charId === "bazzi") {
        // 배찌 특유의 나른한 눈
        ctx.fillRect(-5.8 + lx * 0.6, -9.5, 4.2, 1.8);
        ctx.fillRect(1.6 + lx * 0.6, -9.5, 4.2, 1.8);
      } else {
        ctx.beginPath();
        ctx.ellipse(-4 + lx * 0.6, -9.5, 1.7, 2.3, 0, 0, Math.PI * 2);
        ctx.ellipse(4 + lx * 0.6, -9.5, 1.7, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-4.4 + lx * 0.6, -10.3, 0.7, 0, Math.PI * 2);
        ctx.arc(3.6 + lx * 0.6, -10.3, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.charId === "rodumani") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(1 + lx * 0.6, -12, 5.5, 4.2);
      }
      if (p.charId === "ethi") {
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-7 + lx * 0.6, -12, 5.5, 4.5);
        ctx.strokeRect(1.5 + lx * 0.6, -12, 5.5, 4.5);
      }
      // 발그레 볼
      ctx.fillStyle = "rgba(244,63,94,0.34)";
      ctx.beginPath(); ctx.ellipse(-6.5 + lx * 0.5, -6, 2.3, 1.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6.5 + lx * 0.5, -6, 2.3, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    }

    // 물방울 갇힘 버블
    if (trapped) {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      const opacity = 0.44 + (1 - remRatio) * 0.44;
      const dangerBlink = remRatio < 0.28 && Math.floor(nowMs / 95) % 2 === 0;
      const stretch = 1 + Math.sin(nowMs * 0.015) * 0.06;
      ctx.save();
      ctx.scale(stretch, 2 - stretch);
      ctx.fillStyle = dangerBlink
        ? `rgba(244, 63, 94, ${opacity})`
        : `rgba(56, 189, 248, ${opacity})`;
      ctx.strokeStyle = dangerBlink ? "#fecdd3" : "#e0f2fe";
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(0, -6, 20.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.beginPath(); ctx.ellipse(-7, -15, 5, 2.8, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCharacterOverlay(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;
    const trapped = p.state === "trapped";
    const bob = trapped
      ? Math.sin(nowMs * 0.009) * 3.5
      : (p.dir ? Math.abs(Math.sin(p.walkPhase)) * -3.5 : 0);

    ctx.save();
    const nearTop = p.y < 48;
    const nameY = nearTop ? 25 : -28;
    ctx.translate(p.x, p.y + bob);

    // 이름표 (맨 윗줄(row 0)에서는 잘리지 않게 발 아래로 배치)
    ctx.font = "bold 10.5px 'IBM Plex Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "rgba(8,12,22,0.9)";
    ctx.strokeText(p.name, 0, nameY);
    ctx.fillStyle = isMe ? "#fde047" : "#f8fafc";
    ctx.fillText(p.name, 0, nameY);

    // 내 캐릭터 크아 파란 화살표 (평소 머리 위 ▼, 맨 윗줄에서는 머리 옆 ◀)
    if (isMe) {
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (nearTop) {
        const ax = 17 + Math.sin(nowMs * 0.009) * 2;
        ctx.moveTo(ax, -9);
        ctx.lineTo(ax + 7, -14.5);
        ctx.lineTo(ax + 7, -11);
        ctx.lineTo(ax + 12, -11);
        ctx.lineTo(ax + 12, -7);
        ctx.lineTo(ax + 7, -7);
        ctx.lineTo(ax + 7, -3.5);
      } else {
        const arrowY = -43 + Math.sin(nowMs * 0.009) * 2.5;
        ctx.moveTo(0, arrowY + 8);
        ctx.lineTo(-6.5, arrowY);
        ctx.lineTo(-2.3, arrowY);
        ctx.lineTo(-2.3, arrowY - 6);
        ctx.lineTo(2.3, arrowY - 6);
        ctx.lineTo(2.3, arrowY);
        ctx.lineTo(6.5, arrowY);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    if (p.devilMs > 0) {
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(14, -22, 4.5, 0, Math.PI * 1.5); ctx.stroke();
    }
    if (trapped) {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      if (remRatio < 0.35) {
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#7f1d1d";
        ctx.lineWidth = 2.5;
        ctx.font = "900 13px sans-serif";
        ctx.strokeText("!", 0, -39);
        ctx.fillText("!", 0, -39);
      }
    }
    ctx.restore();
  }

  Skins.default = {
    id: "default",
    name: "베니 크아 기본 2.5D",
    getTheme,
    drawFloorCell,
    drawBlock,
    drawBush,
    drawItem,
    drawBomb,
    drawFlame,
    drawCharacter,
    drawCharacterOverlay,
  };
})(typeof window !== "undefined" ? window : globalThis);

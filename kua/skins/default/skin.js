/* 베니 크아 — 기본 자체 제작 스킨 팩 (kua/skins/default/skin.js)
   · kua/skins/<이름>/skin.js 교체로 캐릭터·타일·아이템·테마 그래픽을 통째로 갈아 끼울 수 있게 분리 */
((root) => {
  "use strict";
  const Skins = root.KuaSkins || (root.KuaSkins = {});
  const Rules = root.KuaRules;

  const THEMES = {
    village: {
      groundA: "#4b8b3b", groundB: "#437f35", roadA: "#7b8494", roadB: "#6e7786",
      solidBase: "#243b55", solidTop: "#dc2626", solidTrim: "#f8fafc",
      boxA: "#d97706", boxB: "#92400e", pushA: "#eab308", pushB: "#854d0e",
      bush: "#15803d", bushHi: "#22c55e",
    },
    pirate: {
      groundA: "#b48a5a", groundB: "#a57c4e", roadA: "#936c42", roadB: "#876139",
      solidBase: "#334155", solidTop: "#0f172a", solidTrim: "#fbbf24",
      boxA: "#c26d27", boxB: "#78350f", pushA: "#f59e0b", pushB: "#713f12",
      bush: "#115e59", bushHi: "#2dd4bf",
    },
    camp: {
      groundA: "#3b5249", groundB: "#33473f", roadA: "#475569", roadB: "#3e4a5c",
      solidBase: "#1e293b", solidTop: "#475569", solidTrim: "#94a3b8",
      boxA: "#a16207", boxB: "#713f12", pushA: "#ca8a04", pushB: "#422006",
      bush: "#166534", bushHi: "#4ade80",
    },
  };

  function getTheme(themeId) {
    return THEMES[themeId] || THEMES.village;
  }

  function drawFloorCell(ctx, theme, c, r, T, mapId) {
    const isRoad = mapId === "village10" && (c === 7 || r === 6);
    const alt = (c + r) % 2 === 0;
    ctx.fillStyle = isRoad ? (alt ? theme.roadA : theme.roadB) : (alt ? theme.groundA : theme.groundB);
    ctx.fillRect(c * T, r * T, T, T);
    if (isRoad) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      if (c === 7) ctx.fillRect(c * T + T / 2 - 2, r * T + 6, 4, T - 12);
      if (r === 6) ctx.fillRect(c * T + 6, r * T + T / 2 - 2, T - 12, 4);
    }
  }

  function drawBlock(ctx, theme, tile, c, r, T) {
    const x = c * T, y = r * T;
    if (tile === "#") {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + 2, y + 6, T - 4, T - 6);
      ctx.fillStyle = theme.solidBase;
      ctx.fillRect(x + 2, y + 4, T - 4, T - 6);
      ctx.fillStyle = theme.solidTop;
      ctx.fillRect(x + 2, y + 2, T - 4, 14);
      ctx.strokeStyle = theme.solidTrim;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 3.5, y + 3.5, T - 7, T - 8);
      return;
    }
    if (tile === "B") {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x + 3, y + 5, T - 5, T - 5);
      ctx.fillStyle = theme.boxA;
      ctx.fillRect(x + 2, y + 2, T - 4, T - 5);
      ctx.fillStyle = theme.boxB;
      ctx.fillRect(x + 2, y + T - 9, T - 4, 6);
      ctx.strokeStyle = "rgba(255,248,220,0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, y + 4, T - 8, T - 11);
      ctx.beginPath();
      ctx.moveTo(x + 6, y + T * 0.45); ctx.lineTo(x + T - 6, y + T * 0.45);
      ctx.stroke();
      return;
    }
    if (tile === "M") {
      // 밀 수 있는 블록: 황동 X자 버팀대 표시
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.fillRect(x + 3, y + 5, T - 5, T - 5);
      ctx.fillStyle = theme.pushA;
      ctx.fillRect(x + 2, y + 2, T - 4, T - 5);
      ctx.fillStyle = theme.pushB;
      ctx.fillRect(x + 2, y + T - 9, T - 4, 6);
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x + 5, y + 5, T - 10, T - 12);
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + T - 8, y + T - 11);
      ctx.moveTo(x + T - 8, y + 8); ctx.lineTo(x + 8, y + T - 11);
      ctx.stroke();
    }
  }

  function drawBush(ctx, theme, c, r, T, dim = false) {
    const x = c * T + T * 0.5, y = r * T + T * 0.52;
    ctx.save();
    ctx.globalAlpha = dim ? 0.42 : 0.94;
    ctx.fillStyle = theme.bush;
    [[-9, 3, 12], [9, 3, 12], [0, -5, 13], [0, 7, 13]].forEach(([ox, oy, rad]) => {
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = theme.bushHi;
    [[-6, -3, 6], [6, -2, 5.5], [0, -8, 6]].forEach(([ox, oy, rad]) => {
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function drawItem(ctx, it, T, nowMs) {
    const cx = it.c * T + T * 0.5;
    const bob = Math.sin(nowMs * 0.005 + it.id) * 2.5;
    const cy = it.r * T + T * 0.5 + bob;
    const meta = Rules.ITEMS[it.kind] || { icon: "❓", good: true };

    ctx.save();
    // 발판 글로우
    ctx.fillStyle = meta.good ? "rgba(56, 189, 248, 0.25)" : "rgba(244, 63, 94, 0.28)";
    ctx.beginPath(); ctx.ellipse(cx, it.r * T + T * 0.82, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 둥근 뱃지 배경
    ctx.fillStyle = meta.good ? "#0f172a" : "#450a0a";
    ctx.strokeStyle = meta.good ? "#38bdf8" : "#fb7185";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 13.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.icon, cx, cy + 1);
    ctx.restore();
  }

  function drawBomb(ctx, b, T, nowMs, fuseMax) {
    const ratio = Math.max(0, Math.min(1, b.fuseMs / fuseMax));
    const urgent = ratio < 0.3 && Math.floor(nowMs / 90) % 2 === 0;
    const pulse = 1 + Math.sin(nowMs * (urgent ? 0.028 : 0.012)) * 0.08;
    const cx = b.x;
    const cy = b.y - (b.airMs > 0 ? Math.sin((b.airMs / 260) * Math.PI) * 24 : 0);

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 13, 13, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(cx, cy);
    ctx.scale(pulse, 2 - pulse * 0.96);
    const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 16);
    if (urgent) {
      grad.addColorStop(0, "#fecaca");
      grad.addColorStop(0.55, "#ef4444");
      grad.addColorStop(1, "#991b1b");
    } else {
      grad.addColorStop(0, "#e0f2fe");
      grad.addColorStop(0.5, "#0ea5e9");
      grad.addColorStop(1, "#0369a1");
    }
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#082f49";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 물풍선 매듭 & 하이라이트
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath(); ctx.ellipse(-5, -5, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFlame(ctx, f, T, flameMax) {
    const x = f.c * T, y = f.r * T;
    const alpha = Math.max(0.2, Math.min(1, f.ms / flameMax));
    ctx.save();
    ctx.globalAlpha = 0.85 * alpha;
    ctx.fillStyle = f.kind === "c" ? "#7dd3fc" : "#38bdf8";
    const pad = 4;
    if (f.kind === "c") {
      ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    } else if (f.dir === 2 || f.dir === 4) {
      ctx.fillRect(x, y + pad, T, T - pad * 2);
    } else {
      ctx.fillRect(x + pad, y, T - pad * 2, T);
    }
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(x + 11, y + 11, T - 22, T - 22);
    ctx.restore();
  }

  function drawCharacter(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const ch = Rules.CHARS[p.charId] || Rules.CHARS.dao;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;

    const bob = p.state === "trapped"
      ? Math.sin(nowMs * 0.008) * 3
      : (p.dir ? Math.abs(Math.sin(p.walkPhase)) * -3 : 0);

    ctx.save();
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // 팀전일 때 발밑 링
    if (mode === "team") {
      ctx.strokeStyle = p.team === 0 ? "#60a5fa" : "#f87171";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (isMe) {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.translate(p.x, p.y + bob);

    // 몸통 + 머리 (자체 제작 캐릭터 실루엣)
    const swing = p.dir ? Math.sin(p.walkPhase) * 3 : 0;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-7, 6 + swing * 0.4, 5, 6);
    ctx.fillRect(2, 6 - swing * 0.4, 5, 6);

    ctx.fillStyle = ch.color;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(-10, -2, 20, 12, 5); ctx.fill(); ctx.stroke();

    // 머리 & 모자/테마
    ctx.fillStyle = ch.skinTone;
    ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ch.color;
    ctx.beginPath(); ctx.arc(0, -11, 10, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ch.trim;
    ctx.fillRect(-10, -12, 20, 3);

    // 4방향 시선 눈
    const lookX = p.faceDir === 2 ? 3 : p.faceDir === 4 ? -3 : 0;
    if (p.faceDir !== 1) {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-3.5 + lookX * 0.6, -7, 1.7, 0, Math.PI * 2);
      ctx.arc(3.5 + lookX * 0.6, -7, 1.7, 0, Math.PI * 2);
      ctx.fill();
      if (p.charId === "rodumani") {
        // 로두마니 해적 안대 포인트
        ctx.fillRect(1 + lookX * 0.6, -9.5, 5, 4);
      }
    }

    // 마귀(방향 반전) 표시
    if (p.devilMs > 0) {
      ctx.fillStyle = "#c084fc";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("😵", 0, -24);
    }

    // 물방울 갇힘 오버레이 (시간 지날수록 불투명 + 붉은 점멸)
    if (p.state === "trapped") {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      const opacity = 0.42 + (1 - remRatio) * 0.45;
      const dangerBlink = remRatio < 0.28 && Math.floor(nowMs / 100) % 2 === 0;
      ctx.fillStyle = dangerBlink
        ? `rgba(248, 113, 113, ${opacity})`
        : `rgba(56, 189, 248, ${opacity})`;
      ctx.strokeStyle = dangerBlink ? "#fecaca" : "#e0f2fe";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, -4, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath(); ctx.ellipse(-7, -12, 4.5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
      if (remRatio < 0.35) {
        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", 0, -25);
      }
    }

    // 이름표 (작고 선명하게)
    ctx.font = "bold 10px 'IBM Plex Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(8,12,20,0.85)";
    ctx.strokeText(p.name, 0, -23);
    ctx.fillStyle = isMe ? "#fde047" : "#f8fafc";
    ctx.fillText(p.name, 0, -23);

    ctx.restore();
  }

  Skins.default = {
    id: "default",
    name: "베니 기본 스킨",
    getTheme,
    drawFloorCell,
    drawBlock,
    drawBush,
    drawItem,
    drawBomb,
    drawFlame,
    drawCharacter,
  };
})(typeof window !== "undefined" ? window : globalThis);

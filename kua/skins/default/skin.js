/* 베니 크아 — 2x HiDPI 3D 프리렌더 PNG 스프라이트 스킨 팩 (kua/skins/default/skin.js)
   · 4x 슈퍼샘플링 3D 타일 + 3D 입체 집/나무/텐트/해적프롭/아이템 + 4방향 SD 캐릭터 PNG 렌더 */
((root) => {
  "use strict";
  const Skins = root.KuaSkins || (root.KuaSkins = {});
  const Rules = root.KuaRules;

  const ASSET_BASE = "skins/default/assets/";
  const IMG_CACHE = new Map();

  function getImg(name) {
    if (!name) return null;
    let rec = IMG_CACHE.get(name);
    if (!rec) {
      if (typeof Image === "undefined") return null;
      const img = new Image();
      rec = { img, ok: false };
      img.onload = () => { rec.ok = img.naturalWidth > 0; };
      img.src = ASSET_BASE + name;
      IMG_CACHE.set(name, rec);
    }
    return rec.ok ? rec.img : null;
  }

  // 주요 에셋 백그라운드 사전 로딩
  const PRELOAD_LIST = [
    "grass_a.png", "grass_b.png", "road_h.png", "road_v.png", "road_c.png",
    "brick_orange.png", "brick_red.png", "crate_push.png", "bush.png",
    "house_red.png", "house_blue.png", "house_yellow.png", "tree_village.png", "crate_wood_hero.png",
    "deck_a.png", "deck_b.png", "carpet_h.png", "carpet_v.png", "carpet_c.png",
    "pirate_barrel.png", "pirate_cannon.png", "pirate_box.png",
    "camp_a.png", "camp_b.png", "stone_h.png", "stone_v.png", "stone_c.png",
    "tent_orange.png", "tent_teal.png", "tree_camp.png", "camp_box.png", "crate_steel.png",
    "bomb_blue.png", "bomb_urgent.png", "flame_c.png", "flame_h.png", "flame_v.png",
    "bubble_trap.png", "bubble_urgent.png",
    "item_bomb.png", "item_fluid.png", "item_ultra.png", "item_roller.png", "item_shoe.png",
    "item_glove.png", "item_needle.png", "item_red_devil.png", "item_green_devil.png", "item_devil.png",
  ];
  if (Rules && Rules.CHAR_ORDER) {
    for (const id of Rules.CHAR_ORDER) {
      PRELOAD_LIST.push(`port_${id}.png`, `ch_${id}_d.png`, `ch_${id}_l.png`, `ch_${id}_u.png`);
    }
  }
  if (typeof Image !== "undefined") PRELOAD_LIST.forEach(getImg);

  const THEMES = {
    village: {
      groundA: "#70c62c", groundB: "#68bc27", roadA: "#808898", roadB: "#788090",
      boxA: "#f88018", boxB: "#ec4234", pushA: "#e5a93b", bush: "#187a34",
    },
    pirate: {
      groundA: "#d49e5c", groundB: "#c69050", roadA: "#a63034", roadB: "#96282c",
      boxA: "#d48430", boxB: "#b46a20", pushA: "#d49c3a", bush: "#127462",
    },
    camp: {
      groundA: "#488e56", groundB: "#40844e", roadA: "#707c8e", roadB: "#647082",
      boxA: "#ae8e30", boxB: "#967426", pushA: "#6088b8", bush: "#1b6a38",
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

    let sprite = null;
    if (isRoad) {
      const pfx = mapId === "patrit14" ? "carpet" : (mapId === "camp08" ? "stone" : "road");
      const kind = (c === 7 && r === 6) ? "c" : (c === 7 ? "v" : "h");
      sprite = getImg(`${pfx}_${kind}.png`);
    } else if (mapId === "patrit14") {
      sprite = getImg(alt ? "deck_a.png" : "deck_b.png");
    } else if (mapId === "camp08") {
      sprite = getImg(alt ? "camp_a.png" : "camp_b.png");
    } else {
      sprite = getImg(alt ? "grass_a.png" : "grass_b.png");
    }

    if (sprite) {
      ctx.drawImage(sprite, x, y, T, T);
    } else {
      ctx.fillStyle = isRoad ? (alt ? theme.roadA : theme.roadB) : (alt ? theme.groundA : theme.groundB);
      ctx.fillRect(x, y, T, T);
    }
  }

  function drawPropSprite(ctx, img, x, y, T, r, scaleW = 46, scaleH = 56) {
    // r === 0(맨 윗줄)에서는 지붕/나무 꼭대기가 캔버스 위로 잘리지 않게 높이 보정
    const h = r === 0 ? Math.min(scaleH, T + 2) : scaleH;
    const w = r === 0 ? Math.round(scaleW * (h / scaleH)) : scaleW;
    const dx = x + (T - w) * 0.5;
    const dy = y + T - h + 2;
    ctx.drawImage(img, dx, dy, w, h);
  }

  function drawBlock(ctx, theme, tile, c, r, T, themeId = "village") {
    const x = c * T, y = r * T;
    if (tile === "H") {
      const name = themeId === "pirate"
        ? "pirate_cannon.png"
        : themeId === "camp"
          ? ((c + r) % 2 === 0 ? "tent_orange.png" : "tent_teal.png")
          : ["house_red.png", "house_blue.png", "house_yellow.png"][(c * 3 + r * 5) % 3];
      const img = getImg(name);
      if (img) {
        drawPropSprite(ctx, img, x, y, T, r, 48, 56);
        return;
      }
      ctx.fillStyle = theme.pushA;
      ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
      return;
    }
    if (tile === "#") {
      const name = themeId === "pirate" ? "pirate_barrel.png" : (themeId === "camp" ? "tree_camp.png" : "tree_village.png");
      const img = getImg(name);
      if (img) {
        drawPropSprite(ctx, img, x, y, T, r, 46, 56);
        return;
      }
      ctx.fillStyle = theme.bush;
      ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
      return;
    }
    if (tile === "B") {
      const alt = (c + r) % 2 === 0;
      const name = themeId === "pirate" ? "pirate_box.png" : (themeId === "camp" ? "camp_box.png" : (alt ? "brick_orange.png" : "brick_red.png"));
      const img = getImg(name);
      if (img) {
        ctx.drawImage(img, x, y - 3, T, 44);
        return;
      }
      ctx.fillStyle = alt ? theme.boxA : theme.boxB;
      ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
      return;
    }
    if (tile === "M") {
      const name = themeId === "pirate" ? "crate_wood_hero.png" : (themeId === "camp" ? "crate_steel.png" : "crate_push.png");
      const img = getImg(name);
      if (img) {
        if (themeId === "village") ctx.drawImage(img, x, y - 3, T, 44);
        else ctx.drawImage(img, x - 2, y - 5, 44, 47);
        return;
      }
      ctx.fillStyle = theme.pushA;
      ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    }
  }

  function drawBush(ctx, theme, c, r, T, dim = false) {
    const img = getImg("bush.png");
    ctx.save();
    ctx.globalAlpha = dim ? 0.42 : 0.96;
    if (img) {
      ctx.drawImage(img, c * T - 2, r * T - 4, 44, 46);
    } else {
      ctx.fillStyle = theme.bush;
      ctx.beginPath(); ctx.arc(c * T + T * 0.5, r * T + T * 0.5, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawItem(ctx, it, T, nowMs) {
    const cx = it.c * T + T * 0.5;
    const bob = Math.sin(nowMs * 0.006 + it.id) * 2.5;
    const cy = it.r * T + T * 0.48 + bob;
    const meta = Rules.ITEMS[it.kind] || { good: true };

    ctx.save();
    // 발광 오라 (좋은 아이템=따뜻한 골드/아쿠아, 함정=보라)
    const aura = ctx.createRadialGradient(cx, it.r * T + T * 0.72, 2, cx, it.r * T + T * 0.72, 16);
    aura.addColorStop(0, meta.good ? "rgba(253, 224, 71, 0.55)" : "rgba(192, 132, 252, 0.65)");
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.ellipse(cx, it.r * T + T * 0.72, 15, 7, 0, 0, Math.PI * 2); ctx.fill();

    const img = getImg(`item_${it.kind}.png`);
    if (img) {
      ctx.drawImage(img, cx - 16, cy - 16, 32, 32);
    } else {
      ctx.fillStyle = meta.good ? "#38bdf8" : "#a855f7";
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    }
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
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const img = getImg(urgent ? "bomb_urgent.png" : "bomb_blue.png");
    if (img) {
      ctx.drawImage(img, -20, -21, 40, 42);
    } else {
      ctx.fillStyle = urgent ? "#ef4444" : "#0ea5e9";
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawFlame(ctx, f, T, flameMax) {
    const x = f.c * T, y = f.r * T;
    const alpha = Math.max(0.28, Math.min(1, f.ms / flameMax));
    const isH = f.dir === 2 || f.dir === 4;
    const img = getImg(f.kind === "c" ? "flame_c.png" : (isH ? "flame_h.png" : "flame_v.png"));
    ctx.save();
    ctx.globalAlpha = 0.94 * alpha;
    if (img) {
      ctx.drawImage(img, x, y, T, T);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(x + 4, y + 4, T - 8, T - 8);
    }
    ctx.restore();
  }

  function drawCharacter(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;

    const trapped = p.state === "trapped";
    const walking = !!p.dir && !trapped;
    const hop = trapped
      ? Math.sin(nowMs * 0.008) * 3.5
      : (walking ? Math.abs(Math.sin(p.walkPhase)) * -3.5 : 0);
    const tilt = walking ? Math.sin(p.walkPhase) * 0.055 : 0;

    ctx.save();
    // 그림자
    ctx.fillStyle = "rgba(8, 15, 28, 0.34)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 13.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    // 발밑 팀/플레이어 링
    if (mode === "team") {
      ctx.strokeStyle = p.team === 0 ? "#60a5fa" : "#f87171";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12.5, 15, 6, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (isMe) {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12.5, 15, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.translate(p.x, p.y + hop);

    // 4방향 PNG 스프라이트 선택 (trapped면 앞면)
    const id = Rules.CHARS[p.charId] ? p.charId : "dao";
    const dir = trapped ? 3 : (p.faceDir || 3);
    const suffix = dir === 1 ? "u" : (dir === 2 || dir === 4) ? "l" : "d";
    const flipX = !trapped && dir === 2;
    const sprite = getImg(`ch_${id}_${suffix}.png`) || getImg(`ch_${id}_d.png`);

    ctx.save();
    if (flipX) ctx.scale(-1, 1);
    if (tilt) ctx.rotate(tilt);
    if (sprite) {
      // 발바닥을 타일 하단에 맞추고, 맨 윗줄(row 0)에서는 모자 상단이 캔버스 위로 잘리지 않게 보정
      const dw = 44, dh = 50;
      const idealTop = -34;
      const topY = Math.max(idealTop, -(p.y + hop) + 1);
      ctx.drawImage(sprite, -dw * 0.5, topY, dw, dh);
    } else {
      const ch = Rules.CHARS[id] || Rules.CHARS.dao;
      ctx.fillStyle = ch.color;
      ctx.beginPath(); ctx.arc(0, -8, 13, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 물방울 갇힘 오버레이
    if (trapped) {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      const dangerBlink = remRatio < 0.28 && Math.floor(nowMs / 95) % 2 === 0;
      const stretch = 1 + Math.sin(nowMs * 0.015) * 0.06;
      const bImg = getImg(dangerBlink ? "bubble_urgent.png" : "bubble_trap.png");
      ctx.save();
      ctx.translate(0, -10);
      ctx.scale(stretch, 2 - stretch);
      if (bImg) {
        ctx.drawImage(bImg, -26, -26, 52, 52);
      } else {
        ctx.fillStyle = dangerBlink ? "rgba(244,63,94,0.55)" : "rgba(56,189,248,0.55)";
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCharacterOverlay(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;
    const trapped = p.state === "trapped";
    const hop = trapped
      ? Math.sin(nowMs * 0.008) * 3.5
      : (p.dir ? Math.abs(Math.sin(p.walkPhase)) * -3.5 : 0);

    ctx.save();
    const nearTop = p.y < 54;
    const nameY = nearTop ? 25 : -38;
    ctx.translate(p.x, p.y + hop);

    ctx.font = "bold 10.5px 'IBM Plex Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "rgba(8,12,22,0.92)";
    ctx.strokeText(p.name, 0, nameY);
    ctx.fillStyle = isMe ? "#fde047" : "#f8fafc";
    ctx.fillText(p.name, 0, nameY);

    if (isMe) {
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (nearTop) {
        const ax = 20 + Math.sin(nowMs * 0.009) * 2;
        ctx.moveTo(ax, -14);
        ctx.lineTo(ax + 7, -19.5);
        ctx.lineTo(ax + 7, -16);
        ctx.lineTo(ax + 12, -16);
        ctx.lineTo(ax + 12, -12);
        ctx.lineTo(ax + 7, -12);
        ctx.lineTo(ax + 7, -8.5);
      } else {
        const arrowY = -52 + Math.sin(nowMs * 0.009) * 2.5;
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
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(16, -28, 4.5, 0, Math.PI * 1.5); ctx.stroke();
    }
    if (trapped) {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      if (remRatio < 0.35) {
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#7f1d1d";
        ctx.lineWidth = 2.6;
        ctx.font = "900 13px sans-serif";
        ctx.strokeText("!", 0, -48);
        ctx.fillText("!", 0, -48);
      }
    }
    ctx.restore();
  }

  Skins.default = {
    id: "default",
    name: "베니 크아 3D 스프라이트",
    getTheme,
    getPortraitUrl: charId => `${ASSET_BASE}port_${charId || "dao"}.png`,
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

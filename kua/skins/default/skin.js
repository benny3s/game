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
  // 원작 스프라이트 시트 (orig/<char>_<color>.png, 64px 셀 24칸: pd0-4 · pl0-4 · pr0-4 · pu0-4 · t1-4)
  const ORIG_CHARS = { bazzi: 1, dao: 1, marid: 1, kepi: 1 };
  const ORIG_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "sky", "pink"];
  for (const cid in ORIG_CHARS) for (const cn of ORIG_COLORS) PRELOAD_LIST.push(`orig/${cid}_${cn}.png`);
  function origColor(p, mode) {
    if (mode === "team") return p.team === 0 ? "blue" : "red";
    const DEF = { bazzi: "red", dao: "blue", marid: "pink", kepi: "green" };
    if (DEF[p.charId]) return DEF[p.charId];
    let s = p.slot;
    if (s == null) { const m = /(\d+)/.exec(String(p.id || "")); s = m ? +m[1] : 0; }
    return ORIG_COLORS[((s % ORIG_COLORS.length) + ORIG_COLORS.length) % ORIG_COLORS.length];
  }
  function drawOrigCharacter(ctx, p, T, mode, nowMs, sheet) {
    const trapped = p.state === "trapped";
    const walking = !!p.dir && !trapped;
    const dir = p.faceDir || 3;
    let frame;
    if (trapped) {
      const remRatio = Math.max(0, Math.min(1, p.trapMs / (p.trapDeathMs || 6350)));
      frame = remRatio < 0.28 ? 20 + (Math.floor(nowMs / 90) % 2 ? 3 : 2) : 20 + Math.floor(nowMs / 220) % 3;
    } else {
      const base = dir === 1 ? 15 : dir === 2 ? 5 : dir === 4 ? 10 : 0;
      frame = base + (walking ? 1 + (Math.floor(p.walkPhase * 1.2) % 4 + 4) % 4 : 0);
    }
    const k = T / 40; // 원작: 타일 40px 기준 캐릭터 44x56
    const S = 64 * k;
    const footY = trapped ? T * 0.5 + 2 : T * 0.42;
    const topY = Math.max(-T * 0.18, p.y + footY - S); // 맨 윗줄에서 머리가 잘리지 않게
    ctx.drawImage(sheet, frame * 64, 0, 64, 64, p.x - S / 2, topY, S, S);
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
        ctx.drawImage(img, x, y - 1, T, 41);
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
        ctx.drawImage(img, x, y - 1, T, 41);
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

  function drawFlame(ctx, f, T, flameMax, nowMs = 0) {
    const x = f.c * T, y = f.r * T;
    const cx = x + T * 0.5, cy = y + T * 0.5;
    const hazMin = (Rules && Rules.TIMING && Rules.TIMING.FLAME_HAZARD_MIN_MS) || 0;
    const harmlessFade = f.ms <= hazMin;
    const fadeRatio = hazMin > 0 ? Math.max(0, Math.min(1, f.ms / hazMin)) : 1;
    const life = Math.max(0, Math.min(1, f.ms / flameMax));
    const swell = harmlessFade
      ? 0.55 + fadeRatio * 0.35
      : 0.88 + Math.sin((1 - life) * Math.PI) * 0.16;
    const pulse = 1 + Math.sin(nowMs * 0.055 + f.c * 0.7 + f.r) * 0.04;

    ctx.save();
    ctx.globalAlpha = harmlessFade
      ? Math.max(0.08, fadeRatio * 0.45)
      : Math.max(0.45, Math.min(1, life * 1.15));
    ctx.translate(cx, cy);

    if (f.kind === "c") {
      ctx.scale(swell * pulse, swell * pulse);
      const cImg = getImg("flame_c.png");
      if (cImg) ctx.drawImage(cImg, -T * 0.5, -T * 0.5, T, T);
      // 중앙 십자 물보라 하이라이트
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath(); ctx.ellipse(0, -10, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // 방향 회전 (기본 오른쪽 = dir 2 -> 0도 기준으로 그려서 회전)
    const rotMap = { 2: 0, 3: Math.PI * 0.5, 4: Math.PI, 1: -Math.PI * 0.5 };
    ctx.rotate(rotMap[f.dir] || 0);

    if (f.kind === "tip") {
      ctx.scale(swell, swell * pulse);
      const grad = ctx.createLinearGradient(-T * 0.5, 0, T * 0.45, 0);
      grad.addColorStop(0, "#0ea5e9");
      grad.addColorStop(0.6, "#38bdf8");
      grad.addColorStop(1, "#bae6fd");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-T * 0.5, -14);
      ctx.quadraticCurveTo(T * 0.45, -13, T * 0.46, 0);
      ctx.quadraticCurveTo(T * 0.45, 13, -T * 0.5, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(240, 249, 255, 0.85)";
      ctx.beginPath();
      ctx.ellipse(-2, 0, 12, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.scale(1, swell * pulse);
      const hImg = getImg("flame_h.png");
      if (hImg) {
        ctx.drawImage(hImg, -T * 0.5, -T * 0.5, T, T);
      } else {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-T * 0.5, -14, T, 28);
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
      ctx.fillRect(-T * 0.5, -4, T, 8);
    }
    ctx.restore();
  }

  function drawAirplane(ctx, pl, T, nowMs) {
    const py = pl.r * T + T * 0.45;
    const px = pl.x;
    ctx.save();
    // 지상 그림자
    ctx.fillStyle = "rgba(8, 18, 42, 0.28)";
    ctx.beginPath(); ctx.ellipse(px - 6, py + 24, 24, 9, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(px, py - 18 + Math.sin(nowMs * 0.012) * 3);
    // 프로펠러 보급 비행기
    ctx.fillStyle = "#0284c7";
    ctx.strokeStyle = "#082f49";
    ctx.lineWidth = 2;
    // 날개
    ctx.beginPath(); ctx.roundRect(-8, -28, 16, 56, 6); ctx.fill(); ctx.stroke();
    // 동체
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 조종석 유리
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath(); ctx.ellipse(6, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 프로펠러 블레이드 회전
    const ph = Math.abs(Math.sin(nowMs * 0.08)) * 14 + 2;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(25, -ph); ctx.lineTo(25, ph); ctx.stroke();
    ctx.restore();
  }

  function drawCharacter(ctx, p, T, isMe, mode, nowMs) {
    if (p.state === "dead") return;
    const blink = p.invulnMs > 0 && Math.floor(nowMs / 75) % 2 === 0;
    if (blink) return;

    const trapped = p.state === "trapped";
    const walking = !!p.dir && !trapped;
    const jitter = trapped && p.trapMs < 2400 ? Math.sin(nowMs * 0.05) * 1.8 : 0;
    const hop = trapped ? Math.sin(nowMs * 0.008) * 3.5 : 0;

    if (ORIG_CHARS[p.charId]) {
      const sheet = getImg(`orig/${p.charId}_${origColor(p, mode)}.png`);
      if (sheet) {
        ctx.save();
        ctx.fillStyle = "rgba(8, 15, 28, 0.28)";
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 10.5, 4, 0, 0, Math.PI * 2); ctx.fill();
        if (mode === "team") {
          ctx.strokeStyle = p.team === 0 ? "#60a5fa" : "#f87171";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 12, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
        }
        drawOrigCharacter(ctx, p, T, mode, nowMs, sheet);
        ctx.restore();
        return;
      }
    }

    ctx.save();
    // 발밑 작고 자연스러운 그림자 (통로 폭 안에 깔끔히 수납)
    ctx.fillStyle = "rgba(8, 15, 28, 0.28)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 10.5, 4, 0, 0, Math.PI * 2); ctx.fill();

    // 팀전일 때만 타일 내부에 얇은 구분 링 표시
    if (mode === "team") {
      ctx.strokeStyle = p.team === 0 ? "#60a5fa" : "#f87171";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 13, 12, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.translate(p.x + jitter, p.y + hop);

    // 4방향 PNG 스프라이트 선택 (trapped면 앞면)
    const id = Rules.CHARS[p.charId] ? p.charId : "dao";
    const dir = trapped ? 3 : (p.faceDir || 3);
    const suffix = dir === 1 ? "u" : (dir === 2 || dir === 4) ? "l" : "d";
    const flipX = !trapped && dir === 2;
    const sprite = getImg(`ch_${id}_${suffix}.png`) || getImg(`ch_${id}_d.png`);

    ctx.save();
    if (flipX) ctx.scale(-1, 1);
    if (sprite) {
      // 캐릭터 발을 p.y + 14 (타일 하단 6px 위)로 고정하고 상체는 고정, 걷기 시 하단 다리 영역만 살짝 교차
      const nearTop = (p.y + hop) < 26;
      const dw = nearTop ? 33 : 36;
      const dh = nearTop ? 35 : 39;
      const topY = nearTop ? Math.max(-23, -(p.y + hop) + 1) : -25;
      if (walking && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
        const sw = sprite.naturalWidth;
        const sh = sprite.naturalHeight;
        const splitSrc = Math.round(sh * 0.81);
        const splitDst = dh * 0.81;
        const halfW = Math.round(sw * 0.5);
        const halfDst = dw * 0.5;
        const stepOsc = Math.sin(p.walkPhase);
        const liftL = Math.max(0, stepOsc) * 1.8;
        const liftR = Math.max(0, -stepOsc) * 1.8;
        // 상체(머리+몸통+팔): 100% 고정 — 방방 뛰지 않음
        ctx.drawImage(sprite, 0, 0, sw, splitSrc, -dw * 0.5, topY, dw, splitDst);
        // 하체 좌/우 다리: 크아처럼 차분하게 왼발·오른발만 교차 스텝
        ctx.drawImage(
          sprite,
          0, Math.max(0, splitSrc - 2), halfW, sh - splitSrc + 2,
          -dw * 0.5, topY + splitDst - 0.8 - liftL, halfDst, dh - splitDst + 1
        );
        ctx.drawImage(
          sprite,
          halfW, Math.max(0, splitSrc - 2), sw - halfW, sh - splitSrc + 2,
          0, topY + splitDst - 0.8 - liftR, dw - halfDst, dh - splitDst + 1
        );
      } else {
        ctx.drawImage(sprite, -dw * 0.5, topY, dw, dh);
      }
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
    const hop = trapped ? Math.sin(nowMs * 0.008) * 3.5 : 0;

    ctx.save();
    const nearTop = p.y < 44;
    const nameY = nearTop ? 17 : -29;
    ctx.translate(p.x, p.y + hop);

    ctx.font = "bold 9.5px 'IBM Plex Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
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
        const ax = 17 + Math.sin(nowMs * 0.009) * 1.8;
        ctx.moveTo(ax, -10);
        ctx.lineTo(ax + 6, -15);
        ctx.lineTo(ax + 6, -12);
        ctx.lineTo(ax + 11, -12);
        ctx.lineTo(ax + 11, -8);
        ctx.lineTo(ax + 6, -8);
        ctx.lineTo(ax + 6, -5);
      } else {
        const arrowY = -48 + Math.sin(nowMs * 0.009) * 2.2;
        ctx.moveTo(0, arrowY + 7);
        ctx.lineTo(-6, arrowY);
        ctx.lineTo(-2, arrowY);
        ctx.lineTo(-2, arrowY - 5);
        ctx.lineTo(2, arrowY - 5);
        ctx.lineTo(2, arrowY);
        ctx.lineTo(6, arrowY);
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
    drawAirplane,
    drawCharacter,
    drawCharacterOverlay,
  };
})(typeof window !== "undefined" ? window : globalThis);

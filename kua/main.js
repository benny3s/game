/* 베니 크아 — 컨트롤러 · 키보드(2키 선입력 코너턴·Space 연속·Ctrl) · 60Hz 시뮬 · 친구랑(ArenaUI Host권위) · 판 끝 복기 (kua/main.js) */
(() => {
  "use strict";
  const Rules = window.KuaRules;
  const Maps = window.KuaMaps;
  const Core = window.KuaCore;
  const Bots = window.KuaBots;
  const Render = window.KuaRender;
  const Sound = window.KuaSound;
  const $ = id => document.getElementById(id);
  const esc = s => (window.Cozy && Cozy.esc ? Cozy.esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

  let playMode = "solo"; // "solo" | "friend" | "watch"
  let tier = Cozy.store("kua.tier", "normal");
  let selectedChar = Cozy.store("kua.char", "dao");
  let selectedMap = Cozy.store("kua.map", "village10");
  let gameMode = Cozy.store("kua.gmode", "free"); // "free" | "team"
  let botCount = Number(Cozy.store("kua.bots", "3")) || 3;

  let sim = null;
  let remoteSnap = null;
  let myId = "p0";
  let rafId = null;
  let lastFrameMs = 0;
  let accMs = 0;
  let resultShown = false;
  let finishCutAt = 0;
  let rankRecorded = false;
  let coach = null;

  // 온라인 친구랑 (ArenaUI)
  let arena = null;
  let arenaOffs = [];
  let isHost = false;
  let myUid = null;
  let lastCtx = null;
  let peerInputs = {};
  let peerChars = {};
  let lastSnapSentAt = 0;
  let finalSent = false;
  let pendingEvents = [];

  // 키보드 입력 (2키 선입력 코너턴 스택 + Space 연속 설치 + Ctrl 바늘 버퍼링)
  const dirStack = [];
  let touchDir = 0;
  let spaceHeld = false;
  let pendingBomb = false;
  let pendingNeedle = false;
  let lastNetSentDir = -1;
  let lastNetInputAt = 0;
  let lastHudHtml = "";
  let lastItemHtml = "";

  function activeDir() {
    if (touchDir) return touchDir;
    return dirStack.length ? dirStack[dirStack.length - 1] : 0;
  }

  function currentDirs() {
    if (touchDir) return [touchDir];
    return dirStack.slice();
  }

  function canSpaceHoldDrop(snap, pid) {
    if (!snap || !pid) return false;
    const plist = snap.p || snap.players || [];
    const me = plist.find(q => q.id === pid);
    if (!me || (me.s || me.state) !== "alive") return false;
    const pc = Math.floor(me.x / Core.T), pr = Math.floor(me.y / Core.T);
    const bombs = snap.b || snap.bombs || [];
    return !bombs.some(b => (b.air != null ? b.air : (b.airMs || 0)) <= 0 && b.c === pc && b.r === pr);
  }

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── 메뉴 UI (아쿠아 블루 대기실 · 3D 포트레이트 · 실시간 미니맵) ──
  const portSrc = id => `skins/default/assets/port_${id || "dao"}.png`;

  function statBarRow(lbl, val, cap) {
    let pips = "";
    for (let i = 1; i <= 10; i++) {
      const cls = i <= val ? "fill" : (i <= cap ? "cap" : "");
      pips += `<span class="k-pip ${cls}"></span>`;
    }
    return `<div class="k-pip-row"><span>${lbl}</span><div class="k-pips">${pips}</div><span>${val}/${cap}</span></div>`;
  }

  function renderLobbySlots() {
    const box = $("lobbySlots");
    if (!box) return;
    const myNm = (window.GME && GME.me && GME.me.name) || localStorage.getItem("game.arena.name") || "나";
    const aiPool = buildBotConfigs(botCount, 1, 1, selectedChar);
    const tierTxt = tier === "hard" ? "고급" : (tier === "easy" ? "초급" : "중급");
    const slots = [];
    for (let i = 0; i < 8; i++) {
      if (i === 0) {
        const tmCls = gameMode === "team" ? " team-b" : "";
        const tmBadge = gameMode === "team" ? `<span class="k-rslot-badge tb">BLUE</span>` : "";
        slots.push(`<button type="button" class="k-rslot host${tmCls}" data-slot="0" title="내 슬롯">
          <span class="k-rslot-badge">방장</span>${tmBadge}
          <img class="k-rslot-img" src="${portSrc(selectedChar)}" alt="${esc(myNm)}">
          <span class="k-rslot-name">${esc(myNm)}</span>
        </button>`);
      } else if (i <= botCount && aiPool[i - 1]) {
        const b = aiPool[i - 1];
        const tmCls = gameMode === "team" ? (b.team === 0 ? " team-b" : " team-r") : "";
        const tmBadge = gameMode === "team" ? `<span class="k-rslot-badge ${b.team === 0 ? "tb" : "tr"}">${b.team === 0 ? "BLUE" : "RED"}</span>` : "";
        slots.push(`<button type="button" class="k-rslot${tmCls}" data-slot="${i}" title="클릭하면 AI 인원 변경">
          <span class="k-rslot-badge com">${tierTxt}</span>${tmBadge}
          <img class="k-rslot-img" src="${portSrc(b.charId)}" alt="${esc(b.name)}">
          <span class="k-rslot-name">${esc(b.name)}</span>
        </button>`);
      } else {
        slots.push(`<button type="button" class="k-rslot empty" data-slot="${i}" title="클릭해서 AI 추가/변경">
          <span class="k-rslot-empty-ic">+</span>
          <span class="k-rslot-name">빈 자리</span>
        </button>`);
      }
    }
    box.innerHTML = slots.join("");
    box.querySelectorAll("[data-slot]").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.slot);
        if (idx === 0) return;
        const choices = [1, 3, 5, 7];
        const target = choices.find(n => n >= idx) || 1;
        botCount = (idx <= botCount && botCount > 1) ? Math.max(1, target - 2) : target;
        Cozy.save("kua.bots", String(botCount));
        $("botSeg").querySelectorAll("[data-b]").forEach(x => x.classList.toggle("active", Number(x.dataset.b) === botCount));
        renderLobbySlots();
      };
    });
  }

  function renderWatchCast() {
    const box = $("watchCast");
    if (!box) return;
    const cast = [
      { id: "dao", name: "다오(고수)" },
      { id: "bazzi", name: "배찌(고수)" },
      { id: "dizni", name: "디지니(고수)" },
      { id: "rodumani", name: "로두마니(고수)" },
    ];
    box.innerHTML = cast.map(c => `<div class="k-rslot">
      <span class="k-rslot-badge com">AI</span>
      <img class="k-rslot-img" src="${portSrc(c.id)}" alt="${esc(c.name)}">
      <span class="k-rslot-name">${esc(c.name)}</span>
    </div>`).join("");
  }

  function renderCharPickers() {
    const html = Rules.CHAR_ORDER.map(id => {
      const ch = Rules.CHARS[id];
      return `<button type="button" class="k-char-btn" data-ch="${id}" aria-pressed="${id === selectedChar}">
        <img src="${portSrc(id)}" alt="${esc(ch.name)}">
        <span>${esc(ch.name)}</span>
      </button>`;
    }).join("");
    ["charGrid", "fCharGrid"].forEach(gid => {
      const box = $(gid);
      if (!box) return;
      box.innerHTML = html;
      box.querySelectorAll("[data-ch]").forEach(b => {
        b.onclick = () => {
          selectedChar = b.dataset.ch;
          Cozy.save("kua.char", selectedChar);
          renderCharPickers();
          renderLobbySlots();
        };
      });
    });
    const cur = Rules.CHARS[selectedChar] || Rules.CHARS.dao;
    $("charStatBox").innerHTML = `<img class="k-stat-port" src="${portSrc(cur.id)}" alt="${esc(cur.name)}">
      <div>
        <div class="k-stat-name">${esc(cur.name)} <small style="color:#93c5fd">(${esc(cur.code)})</small></div>
        ${statBarRow("물풍선", cur.bombs, cur.maxBombs)}
        ${statBarRow("물줄기", cur.power, cur.maxPower)}
        ${statBarRow("속도", cur.speed, cur.maxSpeed)}
        <div class="k-stat-desc">${esc(cur.desc)}</div>
      </div>`;
  }

  function drawMinimap() {
    const cv = $("mapMiniCv");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const m = Maps.getMap(selectedMap);
    const cols = m.grid[0].length, rows = m.grid.length;
    const cw = cv.width / cols, ch = cv.height / rows;
    const bgA = m.theme === "pirate" ? "#c8904e" : (m.theme === "camp" ? "#438452" : "#67bd2a");
    const roadC = m.theme === "pirate" ? "#a23034" : "#788294";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = m.grid[r][c];
        const isRoad = (m.id === "village10" || m.id === "patrit14") ? (c === 7 || r === 6) : (r === 6 || (c === 7 && r >= 2 && r <= 10));
        ctx.fillStyle = isRoad ? roadC : bgA;
        ctx.fillRect(c * cw, r * ch, Math.ceil(cw), Math.ceil(ch));
        if (tile === "H") {
          ctx.fillStyle = m.theme === "camp" ? "#0ea5e9" : "#ef4444";
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        } else if (tile === "#") {
          ctx.fillStyle = m.theme === "pirate" ? "#78350f" : "#15803d";
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        } else if (tile === "B") {
          ctx.fillStyle = (c + r) % 2 === 0 ? "#f97316" : "#dc2626";
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        } else if (tile === "M") {
          ctx.fillStyle = "#facc15";
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        } else if (tile === "G") {
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        }
      }
    }
    const desc = $("mapDescBox");
    if (desc) desc.textContent = m.desc || "";
  }

  function renderMapSegs() {
    const html = Maps.MAP_DEFS.map(m =>
      `<button type="button" class="btn ${m.id === selectedMap ? "active" : ""}" data-mp="${m.id}">${esc(m.name)}</button>`
    ).join("");
    ["mapSeg", "wMapSeg"].forEach(sid => {
      const box = $(sid);
      if (!box) return;
      box.innerHTML = html;
      box.querySelectorAll("[data-mp]").forEach(b => {
        b.onclick = () => {
          selectedMap = b.dataset.mp;
          Cozy.save("kua.map", selectedMap);
          renderMapSegs();
        };
      });
    });
    drawMinimap();
  }

  function setTab(m) {
    playMode = m === "friend" || m === "watch" ? m : "solo";
    $("tabSolo").setAttribute("aria-pressed", String(playMode === "solo"));
    $("tabFriend").setAttribute("aria-pressed", String(playMode === "friend"));
    $("tabWatch").setAttribute("aria-pressed", String(playMode === "watch"));
    $("soloBox").hidden = playMode !== "solo";
    $("friendBox").hidden = playMode !== "friend";
    $("watchBox").hidden = playMode !== "watch";
    const cp = $("charPickerWrap");
    if (cp) cp.hidden = playMode === "watch";
    $("startBtn").textContent = playMode === "friend" ? "방 만들기 / 들어가기" : "GAME START!";
  }

  function initMenu() {
    Cozy.tierCards($("tiers"), [
      { id: "easy", emoji: "🐣", name: "초급", desc: "느긋한 물풍선 입문" },
      { id: "normal", emoji: "🐱", name: "중급", desc: "피하고 반격하는 표준 AI" },
      { id: "hard", emoji: "🐯", name: "고급", desc: "사냥·구출·연쇄 계산 AI" },
    ], id => {
      tier = id;
      Cozy.save("kua.tier", id);
      renderLobbySlots();
    }, { selected: tier });

    renderCharPickers();
    renderMapSegs();
    renderLobbySlots();
    renderWatchCast();

    $("modeSeg").querySelectorAll("[data-m]").forEach(b => {
      b.classList.toggle("active", b.dataset.m === gameMode);
      b.onclick = () => {
        gameMode = b.dataset.m;
        Cozy.save("kua.gmode", gameMode);
        $("modeSeg").querySelectorAll("[data-m]").forEach(x => x.classList.toggle("active", x === b));
        renderLobbySlots();
      };
    });

    $("botSeg").querySelectorAll("[data-b]").forEach(b => {
      b.classList.toggle("active", Number(b.dataset.b) === botCount);
      b.onclick = () => {
        botCount = Number(b.dataset.b);
        Cozy.save("kua.bots", String(botCount));
        $("botSeg").querySelectorAll("[data-b]").forEach(x => x.classList.toggle("active", x === b));
        renderLobbySlots();
      };
    });

    $("tabSolo").onclick = () => setTab("solo");
    $("tabFriend").onclick = () => setTab("friend");
    $("tabWatch").onclick = () => setTab("watch");
    $("startBtn").onclick = () => {
      if (playMode === "friend") openFriendLobby();
      else if (playMode === "watch") startWatch();
      else startSolo();
    };
    $("helpBtn").onclick = () => window.KuaTutorial && KuaTutorial.open(true);
    $("rankBtn").onclick = () => { if (window.GRank) GRank.open("kua"); };
    $("backBtn").onclick = leaveGame;
    $("resMenuBtn").onclick = leaveGame;
    $("resAgainBtn").onclick = () => {
      if (playMode === "friend") {
        if (isHost) hostStartMatch();
        return;
      }
      if (playMode === "watch") startWatch();
      else startSolo();
    };
    $("resCoachBtn").onclick = showPostMatchCoach;
    const syncBgmBtn = () => {
      const btn = $("bgmBtn");
      if (!btn) return;
      const on = Sound.isBgmEnabled && Sound.isBgmEnabled();
      btn.textContent = on ? "🎵 켬" : "🎵 끔";
      btn.classList.toggle("off", !on);
    };
    syncBgmBtn();
    if ($("bgmBtn")) {
      $("bgmBtn").onclick = () => {
        const next = !(Sound.isBgmEnabled && Sound.isBgmEnabled());
        if (Sound.setBgmEnabled) Sound.setBgmEnabled(next);
        syncBgmBtn();
        if (next && !Sound.isMuted() && !$("play").hidden && !resultShown) {
          const mDef = Maps.getMap(selectedMap);
          if (Sound.startBgm) Sound.startBgm(mDef.theme);
        }
      };
    }
    $("sndBtn").onclick = () => {
      Sound.setMuted(!Sound.isMuted());
      $("sndBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
      if (!Sound.isMuted() && Sound.isBgmEnabled && Sound.isBgmEnabled() && !$("play").hidden && !resultShown) {
        const mDef = Maps.getMap(selectedMap);
        if (Sound.startBgm) Sound.startBgm(mDef.theme);
      }
    };
  }

  // ── 게임 시작 / 종료 ──
  function enterPlay() {
    $("menu").hidden = true;
    $("play").hidden = false;
    $("resultOv").hidden = true;
    resultShown = false;
    finishCutAt = 0;
    rankRecorded = false;
    if (Render.clearVfx) Render.clearVfx();
    const mDef = Maps.getMap(selectedMap);
    if (Sound.startBgm) Sound.startBgm(mDef.theme);
    spaceHeld = false;
    pendingBomb = false;
    pendingNeedle = false;
    dirStack.length = 0;
    touchDir = 0;
    lastHudHtml = "";
    lastItemHtml = "";
    if (coach) { coach.destroy(); coach = null; }
    $("coachSlot").innerHTML = "";
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function leaveGame() {
    stopLoop();
    if (Sound.stopBgm) Sound.stopBgm();
    if (Render.clearVfx) Render.clearVfx();
    arenaOffs.forEach(f => { try { f(); } catch (e) {} });
    arenaOffs = [];
    const a = arena;
    arena = null;
    if (a) { try { a.leave(); } catch (e) {} }
    isHost = false;
    lastCtx = null;
    peerInputs = {};
    peerChars = {};
    lastNetSentDir = -1;
    finalSent = false;
    pendingEvents = [];
    sim = null;
    remoteSnap = null;
    if (coach) { coach.destroy(); coach = null; }
    $("play").hidden = true;
    $("menu").hidden = false;
  }

  function buildBotConfigs(count, startSlot, startTeam, excludeChar) {
    const pool = Rules.CHAR_ORDER.filter(id => id !== excludeChar);
    const out = [];
    for (let i = 0; i < count; i++) {
      const chId = pool[i % pool.length];
      const ch = Rules.CHARS[chId];
      out.push({
        id: `bot${i}`,
        name: `${ch.name}(AI)`,
        kind: "ai",
        tier: playMode === "watch" ? "hard" : tier,
        charId: chId,
        team: gameMode === "team" ? ((startSlot + i) % 2) : (startSlot + i),
      });
    }
    return out;
  }

  function startSolo() {
    const myNm = (window.GME && GME.me && GME.me.name) || localStorage.getItem("game.arena.name") || "나";
    const players = [
      { id: "p0", name: myNm, kind: "human", charId: selectedChar, team: 0 },
      ...buildBotConfigs(botCount, 1, 1, selectedChar),
    ];
    myId = "p0";
    sim = Core.createMatch({
      seed: Date.now(),
      mapId: selectedMap,
      mode: gameMode,
      players,
      warmupMs: Rules.TIMING.WARMUP_MS,
    });
    remoteSnap = null;
    enterPlay();
    startLoop();
  }

  function startWatch() {
    myId = "bot0";
    const players = [
      { id: "bot0", name: "다오(AI)", kind: "ai", tier: "hard", charId: "dao", team: 0 },
      { id: "bot1", name: "배찌(AI)", kind: "ai", tier: "hard", charId: "bazzi", team: 1 },
      { id: "bot2", name: "디지니(AI)", kind: "ai", tier: "hard", charId: "dizni", team: 0 },
      { id: "bot3", name: "로두마니(AI)", kind: "ai", tier: "hard", charId: "rodumani", team: 1 },
    ];
    sim = Core.createMatch({
      seed: Date.now(),
      mapId: selectedMap,
      mode: "free",
      players,
      warmupMs: Rules.TIMING.WARMUP_MS,
    });
    remoteSnap = null;
    enterPlay();
    startLoop();
  }

  // ── 60Hz 시뮬 + 렌더 루프 ──
  function startLoop() {
    stopLoop();
    lastFrameMs = performance.now();
    accMs = 0;
    const stepMs = 1000 / Rules.TIMING.TICK_HZ;

    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(80, Math.max(0, now - lastFrameMs));
      lastFrameMs = now;

      if (playMode === "friend" && !isHost) {
        // 게스트: 2키 선입력(d, d2) + Space 연속 설치 + 100ms keepalive
        const dirs = currentDirs();
        const d = dirs.length ? dirs[dirs.length - 1] : 0;
        const d2 = dirs.length >= 2 ? dirs[dirs.length - 2] : 0;
        const holdBomb = spaceHeld && canSpaceHoldDrop(remoteSnap, myId);
        const sendBomb = pendingBomb || holdBomb;
        const netKey = d + d2 * 10;
        const changed = netKey !== lastNetSentDir || sendBomb || pendingNeedle;
        const keepalive = d !== 0 && (now - lastNetInputAt >= 100);
        if (changed || keepalive) {
          lastNetSentDir = netKey;
          lastNetInputAt = now;
          if (arena) {
            arena.send({ t: "in", d, d2, b: sendBomb ? 1 : 0, n: pendingNeedle ? 1 : 0 }, d === 0 || sendBomb || pendingNeedle);
          }
          pendingBomb = false;
          pendingNeedle = false;
        }
        if (remoteSnap) drawAndHud(remoteSnap, now);
        return;
      }

      if (!sim) return;
      accMs += dt;
      let steps = 0;
      while (accMs >= stepMs && steps < 6) {
        accMs -= stepMs;
        steps++;
        if (sim.winner) break;

        const inputs = {};
        const onlinePlayers = (playMode === "friend" && arena && arena.players) ? arena.players : null;
        for (const p of sim.players) {
          if (p.state === "dead") continue;
          if (p.id === myId && playMode !== "watch") {
            const dirs = currentDirs();
            const dir = Core.chooseLookaheadDir(sim, p, dirs);
            const holdBomb = spaceHeld && canSpaceHoldDrop(sim, p.id);
            inputs[p.id] = { dir, bomb: pendingBomb || holdBomb, needle: pendingNeedle };
            pendingBomb = false;
            pendingNeedle = false;
          } else if (p.kind === "ai") {
            inputs[p.id] = Bots.decideBotInput(sim, p);
          } else if (onlinePlayers && !onlinePlayers[p.id]) {
            delete peerInputs[p.id];
            inputs[p.id] = { dir: 0, bomb: false, needle: false };
          } else if (peerInputs[p.id]) {
            const pi = peerInputs[p.id];
            const pDirs = pi.d2 ? [pi.d2, pi.dir || 0] : (pi.dir ? [pi.dir] : []);
            inputs[p.id] = {
              dir: Core.chooseLookaheadDir(sim, p, pDirs),
              bomb: !!pi.bomb,
              needle: !!pi.needle,
            };
            pi.bomb = false;
            pi.needle = false;
          }
        }
        Core.step(sim, inputs, stepMs);
        if (sim.events.length) {
          pendingEvents.push(...sim.events);
          playEvents(sim.events, sim);
        }
      }

      if (playMode === "friend" && isHost && arena) {
        if (sim.winner && !finalSent) {
          finalSent = true;
          const snap = Core.exportSnapshot(sim);
          snap.ev = pendingEvents;
          pendingEvents = [];
          lastSnapSentAt = now;
          arena.broadcast({ t: "snap", s: snap, mapId: sim.mapId, mode: sim.mode }, true);
        } else if (!sim.winner && (now - lastSnapSentAt >= 48 || pendingEvents.length)) {
          lastSnapSentAt = now;
          const snap = Core.exportSnapshot(sim);
          snap.ev = pendingEvents;
          pendingEvents = [];
          arena.broadcast({ t: "snap", s: snap, mapId: sim.mapId, mode: sim.mode }, false);
        }
      }

      drawAndHud(sim, now);
    };

    rafId = requestAnimationFrame(frame);
  }

  function playEvents(events, stateLike) {
    if (!events || !events.length) return;
    if (Render.pushEvents) Render.pushEvents(events, stateLike || sim || remoteSnap);
    for (const ev of events) {
      if (ev.t === "pop") Sound.play("pop");
      else if (ev.t === "start") Sound.play("start");
      else if (ev.t === "plane") Sound.play("plane");
      else if (ev.t === "bomb" && ev.pid === myId) Sound.play("bomb");
      else if (ev.t === "item" && ev.pid === myId) {
        Sound.play((ev.kind === "devil" || ev.kind === "green_devil") ? "devil" : "item");
      } else if (ev.t === "trap") Sound.play("trap");
      else if (ev.t === "needle" || ev.t === "rescue") Sound.play("needle");
      else if (ev.t === "kick" || ev.t === "throw" || ev.t === "push") Sound.play(ev.t);
      else if (ev.t === "die") Sound.play("die");
    }
  }

  function drawAndHud(stateLike, nowMs) {
    const cv = $("cv");
    const ctx = cv.getContext("2d");
    const mapId = stateLike.mapId || selectedMap;
    const mode = stateLike.mode || gameMode;
    const win = stateLike.win !== undefined ? stateLike.win : stateLike.winner;
    const plist = stateLike.p || stateLike.players || [];

    let finishBanner = null, finishColor = "#fde047";
    if (win && !resultShown) {
      if (!finishCutAt) {
        finishCutAt = nowMs;
        if (Sound.stopBgm) Sound.stopBgm();
        const meObj = plist.find(q => q.id === myId);
        const won = win.type === "player"
          ? win.id === myId
          : (win.type === "team" && meObj ? (meObj.tm != null ? meObj.tm : meObj.team) === win.id : false);
        if (playMode !== "watch") Sound.play(win.type === "draw" ? "lose" : (won ? "win" : "lose"));
        else Sound.play("win");
      }
      const meObj = plist.find(q => q.id === myId);
      const won = win.type === "player"
        ? win.id === myId
        : (win.type === "team" && meObj ? (meObj.tm != null ? meObj.tm : meObj.team) === win.id : false);
      finishBanner = win.type === "draw" ? "DRAW!" : (playMode === "watch" ? "FINISH!" : (won ? "WIN!" : "LOSE..."));
      finishColor = win.type === "draw" ? "#cbd5e1" : (won || playMode === "watch" ? "#fde047" : "#fca5a5");
    }

    Render.renderMatch(ctx, stateLike, { mapId, mode, myId, nowMs, finishBanner, finishColor });

    const leftMs = stateLike.tm != null ? stateLike.tm : stateLike.timeLeftMs;
    if (Sound.setHurry) Sound.setHurry(leftMs <= 30000);
    const mapName = (Maps.MAP_BY_ID[mapId] && Maps.MAP_BY_ID[mapId].name) || "빌리지 10";
    const tStr = fmtTime(leftMs);
    $("playTitle").textContent = mapName;
    $("playSub").textContent = `${tStr} · ${mode === "team" ? "팀전" : "개인전"}`;
    const timerVal = $("timerVal");
    const timerBox = $("timerBox");
    if (timerVal) timerVal.textContent = tStr;
    if (timerBox) timerBox.classList.toggle("urgent", leftMs <= 30000);
    const hudHtml = plist.map(p => {
      const id = p.id, nm = p.n || p.name, stt = p.s || p.state;
      const tm = p.tm != null ? p.tm : p.team;
      const chId = p.ch || p.charId || "dao";
      const ch = Rules.CHARS[chId] || Rules.CHARS.dao;
      const mb = p.mb != null ? p.mb : p.maxBombs;
      const pw = p.pw != null ? p.pw : p.power;
      const sp = p.sp != null ? p.sp : p.speed;
      const nd = p.nd != null ? p.nd : p.needles;
      const isMe = id === myId;
      const tCls = mode === "team" ? (tm === 0 ? " team-b" : " team-r") : "";
      const cls = `k-slot${isMe ? " me" : ""}${tCls}${stt === "dead" ? " dead" : stt === "trapped" ? " trapped" : ""}`;
      const tag = stt === "dead"
        ? `<span class="k-slot-tag ko">KO</span>`
        : stt === "trapped"
          ? `<span class="k-slot-tag trap">갇힘!</span>`
          : isMe
            ? `<span class="k-slot-tag">나</span>`
            : "";
      return `<div class="${cls}">
        <img class="k-av-img" src="skins/default/assets/port_${esc(ch.id)}.png" alt="${esc(ch.name)}">
        <div class="k-slot-info">
          <div class="k-slot-top"><span class="k-slot-name">${esc(nm)}</span>${tag}</div>
          <div class="k-slot-st">
            <span><img class="k-mini-ic" src="skins/default/assets/item_bomb.png" alt="">${mb}</span>
            <span><img class="k-mini-ic" src="skins/default/assets/item_fluid.png" alt="">${pw}</span>
            <span><img class="k-mini-ic" src="skins/default/assets/item_roller.png" alt="">${sp}</span>
            ${nd ? `<span><img class="k-mini-ic" src="skins/default/assets/item_needle.png" alt="">${nd}</span>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
    if (hudHtml !== lastHudHtml) {
      lastHudHtml = hudHtml;
      $("hudBar").innerHTML = hudHtml;
    }

    const ctrlBox = $("ctrlItemBox");
    if (ctrlBox) {
      const me = plist.find(p => p.id === myId) || plist[0];
      if (me) {
        const ch = Rules.CHARS[me.ch || me.charId || "dao"] || Rules.CHARS.dao;
        const mb = me.mb != null ? me.mb : me.maxBombs;
        const pw = me.pw != null ? me.pw : me.power;
        const sp = me.sp != null ? me.sp : me.speed;
        const nd = me.nd != null ? me.nd : me.needles;
        const ck = me.ck != null ? me.ck : me.canKick;
        const ct = me.ct != null ? me.ct : me.canThrow;
        const dv = me.dv != null ? me.dv : me.devilMs;
        const itemHtml = `<div class="k-item-row">
            <button type="button" class="k-needle-btn${nd > 0 ? " ready" : ""}" id="ctrlNeedleUse">
              <img src="skins/default/assets/item_needle.png" alt="">바늘 ×${nd}
            </button>
            <span class="k-keycap">Ctrl</span>
          </div>
          <div class="k-perk-row">
            <span><img class="k-mini-ic" src="skins/default/assets/item_bomb.png" alt="">${mb}/${ch.maxBombs}</span>
            <span><img class="k-mini-ic" src="skins/default/assets/item_fluid.png" alt="">${pw}/${ch.maxPower}</span>
            <span><img class="k-mini-ic" src="skins/default/assets/item_roller.png" alt="">${sp}/${ch.maxSpeed}</span>
            ${ck ? `<span><img class="k-mini-ic" src="skins/default/assets/item_shoe.png" alt="">킥</span>` : ""}
            ${ct ? `<span><img class="k-mini-ic" src="skins/default/assets/item_glove.png" alt="">던지기</span>` : ""}
            ${dv > 0 ? `<span style="color:#c084fc"><img class="k-mini-ic" src="skins/default/assets/item_devil.png" alt="">반전</span>` : ""}
          </div>`;
        if (itemHtml !== lastItemHtml) {
          lastItemHtml = itemHtml;
          ctrlBox.innerHTML = itemHtml;
        }
      }
    }

    if (win && !resultShown && finishCutAt && (nowMs - finishCutAt >= 850)) {
      resultShown = true;
      showResult(stateLike, win);
    }
  }

  function showResult(stateLike, win) {
    $("resTitle").textContent = win.label || "경기 종료!";
    const plist = (stateLike.p || stateLike.players || []).map(p => ({
      id: p.id, name: p.n || p.name, state: p.s || p.state,
      team: p.tm != null ? p.tm : p.team,
      kills: p.kl != null ? p.kl : p.kills, rescues: p.rs != null ? p.rs : p.rescues,
    }));
    const me = plist.find(p => p.id === myId);
    const won = win.type === "player"
      ? win.id === myId
      : (win.type === "team" && me ? me.team === win.id : false);
    if (won && window.Cozy && Cozy.confetti) Cozy.confetti();

    $("resSub").textContent = playMode === "watch" ? "AI 대전 관전이 끝났습니다." : (won ? "축하해요! 물풍선 대결에서 승리했어요!" : "아쉽지만 다음 판에 다시 도전해 보세요!");
    $("resTable").innerHTML = plist.map(p =>
      `<div class="k-res-row"><span>${p.state === "dead" ? "💀" : "🏆"} <b>${esc(p.name)}</b></span><span>${p.kills}킬 · 구출 ${p.rescues}회</span></div>`
    ).join("");
    $("resCoachBtn").hidden = !sim;
    $("resAgainBtn").hidden = playMode === "friend" && !isHost;
    $("resultOv").hidden = false;

    if (!rankRecorded && window.GRank && playMode !== "watch" && me) {
      rankRecorded = true;
      const opp = playMode === "friend"
        ? plist.filter(p => p.id !== myId && (sim ? sim.players.find(sp => sp.id === p.id)?.kind === "human" : !String(p.id).startsWith("bot")))
            .map(p => ({ uid: p.id, res: won ? "w" : (win.type === "draw" ? "d" : "l") }))
        : undefined;
      GRank.result("kua", {
        mode: playMode === "friend" ? "friend" : "ai",
        res: won ? "w" : (win.type === "draw" ? "d" : "l"),
        beat: won ? Math.max(1, plist.length - 1) : 0,
        score: me.kills * 100 + (won ? 300 : 0),
        tier: playMode === "solo" ? tier : null,
        opp,
      });
    }
  }

  function showPostMatchCoach() {
    if (!sim || !window.CoachPanel) return;
    if (coach) coach.destroy();
    coach = CoachPanel.create({ game: "kua", title: "AI 선생님 판 복기", startHidden: false });
    $("coachSlot").appendChild(coach.el);
    const rev = Core.analyzeMatch(sim, myId);
    coach.set(`<p><b>상대 흐름:</b> ${esc(rev.oppFlow)}</p><p><b>내 흐름:</b> ${esc(rev.myFlow)}</p><p class="coach-why">💡 ${esc(rev.reason)}</p>`);
    $("resultOv").hidden = true;
  }

  // ── 온라인 친구랑 (ArenaUI 2~8명) ──
  function friendOpts() {
    return {
      game: "kua",
      title: "💦 베니 크아 친구 대전",
      min: 2,
      max: 8,
      ai: true,
      settings: {
        defaults: { mapId: selectedMap, mode: gameMode },
        label(cfg) {
          const m = Maps.MAP_BY_ID[(cfg && cfg.mapId) || "village10"];
          return `${m ? m.name : "빌리지 10"} · ${cfg && cfg.mode === "team" ? "팀전" : "개인전"}`;
        },
        render(box, cfg, canEdit, update) {
          const curMap = (cfg && cfg.mapId) || "village10";
          const curMode = (cfg && cfg.mode) || "free";
          if (!canEdit) {
            const m = Maps.MAP_BY_ID[curMap];
            box.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(m ? m.name : curMap)} · ${curMode === "team" ? "팀전" : "개인전"}</p>`;
            return;
          }
          box.innerHTML = `
            <div class="optrow"><span class="small">맵</span><div class="seg" id="arKuaMap">
              ${Maps.MAP_DEFS.map(m => `<button type="button" class="btn ${m.id === curMap ? "active" : ""}" data-km="${m.id}">${esc(m.name)}</button>`).join("")}
            </div></div>
            <div class="optrow"><span class="small">방식</span><div class="seg" id="arKuaMode">
              <button type="button" class="btn ${curMode === "free" ? "active" : ""}" data-kd="free">개인전</button>
              <button type="button" class="btn ${curMode === "team" ? "active" : ""}" data-kd="team">팀전</button>
            </div></div>`;
          box.querySelectorAll("[data-km]").forEach(b => {
            b.onclick = () => {
              if (update) update({ mapId: b.dataset.km });
              box.querySelectorAll("[data-km]").forEach(x => x.classList.toggle("active", x === b));
            };
          });
          box.querySelectorAll("[data-kd]").forEach(b => {
            b.onclick = () => {
              if (update) update({ mode: b.dataset.kd });
              box.querySelectorAll("[data-kd]").forEach(x => x.classList.toggle("active", x === b));
            };
          });
        },
      },
      describe(n, cfg) {
        return `${n}명이 15×13 물풍선 아레나에서 ${cfg.mode === "team" ? "팀전" : "개인전"}을 벌여요`;
      },
      onStart(ctx) {
        playMode = "friend";
        arenaOffs.forEach(f => { try { f(); } catch (e) {} });
        arenaOffs = [];
        lastCtx = ctx;
        arena = ctx.net;
        isHost = ctx.role === "host";
        myUid = ctx.uid || arena.uid;
        myId = myUid;
        peerInputs = {};
        peerChars = { [myUid]: selectedChar };
        selectedMap = (ctx.cfg && ctx.cfg.mapId) || selectedMap;
        gameMode = (ctx.cfg && ctx.cfg.mode) || gameMode;

        const handleMsg = (from, msg) => {
          if (!msg || !msg.t) return;
          if (msg.t === "char" && isHost && from) {
            const chId = Rules.CHARS[msg.ch] ? msg.ch : "dao";
            peerChars[from] = chId;
            if (sim && sim.warmupMs > 0) {
              const target = sim.players.find(p => p.id === from);
              const ch = Rules.CHARS[chId];
              if (target && ch) {
                target.charId = ch.id;
                target.maxBombs = ch.bombs; target.bombsCap = ch.maxBombs;
                target.power = ch.power; target.powerCap = ch.maxPower;
                target.speed = ch.speed; target.speedCap = ch.maxSpeed;
                target.trapDeathMs = ch.trapDeathMs || Rules.TIMING.TRAP_DEATH_MS;
              }
            }
          } else if (msg.t === "in" && isHost && from) {
            const cur = peerInputs[from] || { dir: 0, d2: 0, bomb: false, needle: false };
            cur.dir = msg.d | 0;
            cur.d2 = msg.d2 | 0;
            if (msg.b) cur.bomb = true;
            if (msg.n) cur.needle = true;
            peerInputs[from] = cur;
          } else if (msg.t === "snap" && !isHost) {
            if (!msg.s.win && resultShown) {
              resultShown = false;
              finishCutAt = 0;
              rankRecorded = false;
              if (Render.clearVfx) Render.clearVfx();
              $("resultOv").hidden = true;
              if (coach) { coach.destroy(); coach = null; }
              $("coachSlot").innerHTML = "";
            }
            remoteSnap = msg.s;
            remoteSnap.mapId = msg.mapId;
            remoteSnap.mode = msg.mode;
            playEvents(msg.s.ev, msg.s);
          }
        };

        if (isHost) {
          arenaOffs.push(arena.on("msg", (from, msg) => handleMsg(from, msg)));
        } else {
          arenaOffs.push(arena.on("msg", msg => handleMsg(null, msg)));
        }

        enterPlay();
        if (isHost) {
          hostStartMatch(ctx);
        } else {
          arena.send({ t: "char", ch: selectedChar }, true);
          startLoop();
        }
      },
      onLeave() {
        leaveGame();
      },
    };
  }
  function openFriendLobby() {
    if (!window.ArenaUI) { Cozy.toast("온라인 모듈을 불러오지 못했어요"); return; }
    ArenaUI.open(friendOpts());
  }

  function hostStartMatch(ctx) {
    const useCtx = ctx || lastCtx || {};
    const pMap = useCtx.players || (arena && arena.players) || {};
    const hostUid = (arena && arena.meta && arena.meta.host) || myUid;
    const uids = Object.keys(pMap).sort((a, b) => (a === hostUid ? -1 : b === hostUid ? 1 : a.localeCompare(b)));
    const humans = uids.map((uid, i) => ({
      id: uid,
      name: (pMap[uid] && pMap[uid].name) || `친구 ${i + 1}`,
      kind: "human",
      charId: peerChars[uid] || Rules.CHAR_ORDER[i % Rules.CHAR_ORDER.length],
      team: gameMode === "team" ? (i % 2) : i,
    }));
    const fillAi = useCtx.fillAi && humans.length < 4
      ? buildBotConfigs(4 - humans.length, humans.length, 0, selectedChar)
      : [];
    sim = Core.createMatch({
      seed: Date.now(),
      mapId: selectedMap,
      mode: gameMode,
      players: [...humans, ...fillAi],
      warmupMs: Rules.TIMING.WARMUP_MS,
    });
    peerInputs = {};
    pendingEvents = [];
    finalSent = false;
    $("resultOv").hidden = true;
    resultShown = false;
    finishCutAt = 0;
    rankRecorded = false;
    if (Render.clearVfx) Render.clearVfx();
    const mDef = Maps.getMap(sim.mapId);
    if (Sound.startBgm) Sound.startBgm(mDef.theme);
    if (coach) { coach.destroy(); coach = null; }
    $("coachSlot").innerHTML = "";
    startLoop();
  }

  // ── 키보드 & 터치 바인딩 ──
  const KEY_DIR = {
    ArrowUp: 1, KeyW: 1,
    ArrowRight: 2, KeyD: 2,
    ArrowDown: 3, KeyS: 3,
    ArrowLeft: 4, KeyA: 4,
  };

  function bindControls() {
    window.addEventListener("keydown", e => {
      if ($("play").hidden || (sim && sim.winner)) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;

      const d = KEY_DIR[e.code];
      if (d) {
        e.preventDefault();
        if (!dirStack.includes(d)) dirStack.push(d);
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        spaceHeld = true;
        if (!e.repeat) pendingBomb = true;
        return;
      }
      if (e.key === "Control" || e.code === "ControlLeft" || e.code === "ControlRight" || e.code === "KeyZ") {
        e.preventDefault();
        if (!e.repeat) pendingNeedle = true;
      }
    });

    window.addEventListener("keyup", e => {
      if (e.code === "Space") { spaceHeld = false; return; }
      const d = KEY_DIR[e.code];
      if (d) {
        const i = dirStack.indexOf(d);
        if (i >= 0) dirStack.splice(i, 1);
      }
    });

    window.addEventListener("blur", () => { dirStack.length = 0; touchDir = 0; spaceHeld = false; });

    const ctrlBox = $("ctrlItemBox");
    if (ctrlBox) {
      ctrlBox.addEventListener("click", e => {
        if (e.target && e.target.closest("#ctrlNeedleUse")) pendingNeedle = true;
      });
    }

    $("touchPad").querySelectorAll("[data-dir]").forEach(btn => {
      const d = Number(btn.dataset.dir);
      btn.addEventListener("pointerdown", e => { e.preventDefault(); touchDir = d; });
      const stop = () => { if (touchDir === d) touchDir = 0; };
      btn.addEventListener("pointerup", stop);
      btn.addEventListener("pointercancel", stop);
      btn.addEventListener("pointerleave", stop);
    });
    $("padBombBtn").addEventListener("pointerdown", e => { e.preventDefault(); pendingBomb = true; });
    $("padNeedleBtn").addEventListener("pointerdown", e => { e.preventDefault(); pendingNeedle = true; });
  }

  window.__kua = {
    state: () => sim || remoteSnap,
    mode: () => playMode,
    setMuted: v => Sound.setMuted(v),
    setInput: (d, bomb, needle) => {
      dirStack.length = 0;
      if (d) dirStack.push(d);
      if (bomb) pendingBomb = true;
      if (needle) pendingNeedle = true;
    },
  };

  initMenu();
  bindControls();
  if (window.ArenaUI && ArenaUI.checkUrl) ArenaUI.checkUrl(friendOpts());
})();

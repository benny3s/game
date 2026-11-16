/* 베니 크아 — 컨트롤러 · 키보드(방향키·Space·Ctrl) · 30Hz 시뮬 · 친구랑(ArenaUI Host권위) · 판 끝 복기 (kua/main.js) */
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

  // 키보드 입력 (가장 최근 누른 방향키 우선 + 1틱 단위 Space/Ctrl 버퍼링)
  const dirStack = [];
  let touchDir = 0;
  let pendingBomb = false;
  let pendingNeedle = false;
  let lastNetSentDir = -1;
  let lastNetInputAt = 0;

  function activeDir() {
    if (touchDir) return touchDir;
    return dirStack.length ? dirStack[dirStack.length - 1] : 0;
  }

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── 메뉴 UI ──
  function renderCharPickers() {
    const html = Rules.CHAR_ORDER.map(id => {
      const ch = Rules.CHARS[id];
      return `<button type="button" class="k-char-btn" data-ch="${id}" aria-pressed="${id === selectedChar}">
        <span class="dot" style="background:${ch.color};border-color:${ch.trim}"></span>
        <b>${esc(ch.name)}</b>
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
        };
      });
    });
    const cur = Rules.CHARS[selectedChar] || Rules.CHARS.dao;
    $("charStatBox").innerHTML = `<b>${esc(cur.name)}</b> — 🎈 풍선 <b>${cur.bombs}/${cur.maxBombs}</b> · 🌊 물줄기 <b>${cur.power}/${cur.maxPower}</b> · 🛼 속도 <b>${cur.speed}/${cur.maxSpeed}</b><br><span style="color:#94a3b8">${esc(cur.desc)}</span>`;
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
  }

  function setTab(m) {
    playMode = m === "friend" || m === "watch" ? m : "solo";
    $("tabSolo").setAttribute("aria-pressed", String(playMode === "solo"));
    $("tabFriend").setAttribute("aria-pressed", String(playMode === "friend"));
    $("tabWatch").setAttribute("aria-pressed", String(playMode === "watch"));
    $("soloBox").hidden = playMode !== "solo";
    $("friendBox").hidden = playMode !== "friend";
    $("watchBox").hidden = playMode !== "watch";
    $("startBtn").textContent = playMode === "friend" ? "방 만들기 / 들어가기" : "시작!";
  }

  function initMenu() {
    Cozy.tierCards($("tiers"), [
      { id: "easy", emoji: "🐣", name: "초급", desc: "느긋한 물풍선 입문" },
      { id: "normal", emoji: "🐱", name: "중급", desc: "피하고 반격하는 표준 AI" },
      { id: "hard", emoji: "🐯", name: "고급", desc: "사냥·구출·연쇄 계산 AI" },
    ], id => {
      tier = id;
      Cozy.save("kua.tier", id);
    }, { selected: tier });

    renderCharPickers();
    renderMapSegs();

    $("modeSeg").querySelectorAll("[data-m]").forEach(b => {
      b.classList.toggle("active", b.dataset.m === gameMode);
      b.onclick = () => {
        gameMode = b.dataset.m;
        Cozy.save("kua.gmode", gameMode);
        $("modeSeg").querySelectorAll("[data-m]").forEach(x => x.classList.toggle("active", x === b));
      };
    });

    $("botSeg").querySelectorAll("[data-b]").forEach(b => {
      b.classList.toggle("active", Number(b.dataset.b) === botCount);
      b.onclick = () => {
        botCount = Number(b.dataset.b);
        Cozy.save("kua.bots", String(botCount));
        $("botSeg").querySelectorAll("[data-b]").forEach(x => x.classList.toggle("active", x === b));
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
    $("sndBtn").onclick = () => {
      Sound.setMuted(!Sound.isMuted());
      $("sndBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
    };
  }

  // ── 게임 시작 / 종료 ──
  function enterPlay() {
    $("menu").hidden = true;
    $("play").hidden = false;
    $("resultOv").hidden = true;
    resultShown = false;
    rankRecorded = false;
    pendingBomb = false;
    pendingNeedle = false;
    dirStack.length = 0;
    touchDir = 0;
    if (coach) { coach.destroy(); coach = null; }
    $("coachSlot").innerHTML = "";
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function leaveGame() {
    stopLoop();
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

  // ── 30Hz 시뮬 + 60fps 렌더 루프 ──
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
        // 게스트: 방향 전환 시 즉시 + 이동 중 100ms 주기 신뢰 재전송으로 패킷 유실 고착 방지
        const d = activeDir();
        const changed = d !== lastNetSentDir || pendingBomb || pendingNeedle;
        const keepalive = d !== 0 && (now - lastNetInputAt >= 100);
        if (changed || keepalive) {
          lastNetSentDir = d;
          lastNetInputAt = now;
          if (arena) {
            arena.send({ t: "in", d, b: pendingBomb ? 1 : 0, n: pendingNeedle ? 1 : 0 }, d === 0 || pendingBomb || pendingNeedle);
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
      while (accMs >= stepMs && steps < 4) {
        accMs -= stepMs;
        steps++;
        if (sim.winner) break;

        const inputs = {};
        const onlinePlayers = (playMode === "friend" && arena && arena.players) ? arena.players : null;
        for (const p of sim.players) {
          if (p.state === "dead") continue;
          if (p.id === myId && playMode !== "watch") {
            inputs[p.id] = { dir: activeDir(), bomb: pendingBomb, needle: pendingNeedle };
            pendingBomb = false;
            pendingNeedle = false;
          } else if (p.kind === "ai") {
            inputs[p.id] = Bots.decideBotInput(sim, p);
          } else if (onlinePlayers && !onlinePlayers[p.id]) {
            delete peerInputs[p.id];
            inputs[p.id] = { dir: 0, bomb: false, needle: false };
          } else if (peerInputs[p.id]) {
            const pi = peerInputs[p.id];
            inputs[p.id] = { dir: pi.dir || 0, bomb: !!pi.bomb, needle: !!pi.needle };
            pi.bomb = false;
            pi.needle = false;
          }
        }
        Core.step(sim, inputs, stepMs);
        if (sim.events.length) {
          pendingEvents.push(...sim.events);
          playEvents(sim.events);
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

  function playEvents(events) {
    if (!events || !events.length) return;
    for (const ev of events) {
      if (ev.t === "pop") Sound.play("pop");
      else if (ev.t === "bomb" && ev.pid === myId) Sound.play("bomb");
      else if (ev.t === "item" && ev.pid === myId) Sound.play("item");
      else if (ev.t === "trap") Sound.play("trap");
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
    Render.renderMatch(ctx, stateLike, { mapId, mode, myId, nowMs });

    const leftMs = stateLike.tm != null ? stateLike.tm : stateLike.timeLeftMs;
    const mapName = (Maps.MAP_BY_ID[mapId] && Maps.MAP_BY_ID[mapId].name) || "빌리지 10";
    $("playTitle").textContent = mapName;
    $("playSub").textContent = `${fmtTime(leftMs)} · ${mode === "team" ? "팀전" : "개인전"}`;

    const plist = stateLike.p || stateLike.players || [];
    $("hudBar").innerHTML = plist.map(p => {
      const id = p.id, nm = p.n || p.name, stt = p.s || p.state;
      const mb = p.mb != null ? p.mb : p.maxBombs;
      const pw = p.pw != null ? p.pw : p.power;
      const sp = p.sp != null ? p.sp : p.speed;
      const nd = p.nd != null ? p.nd : p.needles;
      const isMe = id === myId;
      const cls = `k-pill${isMe ? " me" : ""}${stt === "dead" ? " dead" : stt === "trapped" ? " trapped" : ""}`;
      return `<div class="${cls}"><b>${esc(nm)}</b><span class="k-st">🎈${mb} 🌊${pw} 🛼${sp}${nd ? ` 🪡${nd}` : ""}</span></div>`;
    }).join("");

    const win = stateLike.win !== undefined ? stateLike.win : stateLike.winner;
    if (win && !resultShown) {
      resultShown = true;
      showResult(stateLike, win);
    }
  }

  function showResult(stateLike, win) {
    Sound.play("win");
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
            const cur = peerInputs[from] || { dir: 0, bomb: false, needle: false };
            cur.dir = msg.d | 0;
            if (msg.b) cur.bomb = true;
            if (msg.n) cur.needle = true;
            peerInputs[from] = cur;
          } else if (msg.t === "snap" && !isHost) {
            if (!msg.s.win && resultShown) {
              resultShown = false;
              rankRecorded = false;
              $("resultOv").hidden = true;
              if (coach) { coach.destroy(); coach = null; }
              $("coachSlot").innerHTML = "";
            }
            remoteSnap = msg.s;
            remoteSnap.mapId = msg.mapId;
            remoteSnap.mode = msg.mode;
            playEvents(msg.s.ev);
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
    rankRecorded = false;
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
        if (!e.repeat) pendingBomb = true;
        return;
      }
      if (e.key === "Control" || e.code === "ControlLeft" || e.code === "ControlRight" || e.code === "KeyZ") {
        e.preventDefault();
        if (!e.repeat) pendingNeedle = true;
      }
    });

    window.addEventListener("keyup", e => {
      const d = KEY_DIR[e.code];
      if (d) {
        const i = dirStack.indexOf(d);
        if (i >= 0) dirStack.splice(i, 1);
      }
    });

    window.addEventListener("blur", () => { dirStack.length = 0; touchDir = 0; });

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

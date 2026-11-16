/* 비밀 서재 탈출 컨트롤러 (escape/main.js)
   · 4면 탐색 · 인벤토리 선택/조합 · 줌 퍼즐 · WebAudio 효과음 · 3단계 AI 선생님 · 자동 저장 */
(() => {
  "use strict";
  const E = window.EscapeCore;
  const $ = id => document.getElementById(id);
  const esc = s => (window.Cozy && Cozy.esc ? Cozy.esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  const curPid = () => (window.GME && GME.me && GME.me.pid) || "guest";
  const LS_SAVE = (pid = curPid()) => `benny.escape.ep1.${pid}`;
  const VALID_ZOOMS = new Set(["diary", "drawer", "bookshelf", "clock", "box", "slate", "safe", "door"]);

  let st = null;
  let muted = false;
  let actx = null;
  let noiseBuf = null;
  let coach = null;
  let coachBtnCtl = null;
  let hintLvl = 1;
  let combinePickA = null;
  let timerId = null;
  let sessionStart = Date.now();
  let activePid = curPid();
  let dialValsBox = [0, 0, 0, 0];
  let dialValsSafe = [0, 0, 0];

  function loadSave(pid = curPid()) {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SAVE(pid)) || "null");
      if (s && s.flags && Array.isArray(s.inv) && Array.isArray(s.bookSeq) && E.WALLS.includes(s.wall)) {
        const base = E.initialState(s.startedAt || Date.now());
        const inv = s.inv.filter(id => !!E.ITEMS[id]);
        const selected = s.selected && inv.includes(s.selected) ? s.selected : null;
        const bookSeq = s.bookSeq.filter(c => E.BOOK_TARGET.includes(c));
        const seenHints = Array.isArray(s.seenHints) ? s.seenHints.filter(x => typeof x === "string").slice(0, 64) : [];
        const flags = { ...base.flags, ...s.flags };
        // 구버전 세이브 호환: 이미 열린 보관함에서 획득한 물건 플래그 자동 보정
        if (flags.drawerOpen) {
          if (s.flags.magnetPicked === undefined && (inv.includes("magnet") || inv.includes("magnet_line") || flags.grateFished)) flags.magnetPicked = true;
          if (s.flags.uvOffPicked === undefined && (inv.includes("uv_off") || inv.includes("uv_on") || flags.uvClueSeen)) flags.uvOffPicked = true;
        }
        if (flags.shelfOpen) {
          if (s.flags.pendulumPicked === undefined && (inv.includes("pendulum") || flags.clockFixed)) flags.pendulumPicked = true;
          if (s.flags.batteryPicked === undefined && (inv.includes("battery") || inv.includes("uv_on") || flags.uvClueSeen)) flags.batteryPicked = true;
        }
        if (flags.clockFixed && s.flags.threadPicked === undefined && (inv.includes("thread") || inv.includes("magnet_line") || flags.grateFished)) flags.threadPicked = true;
        if (flags.boxOpen && s.flags.driverPicked === undefined && (inv.includes("driver") || flags.frameOpen)) flags.driverPicked = true;
        if (flags.safeOpen && s.flags.sealPicked === undefined && (inv.includes("seal") || flags.doorSealDone || flags.escaped)) flags.sealPicked = true;
        return {
          ...base,
          ...s,
          inv,
          selected,
          bookSeq,
          seenHints,
          zoom: VALID_ZOOMS.has(s.zoom) ? s.zoom : null,
          hintsUsed: Number.isFinite(+s.hintsUsed) ? Math.max(0, Math.round(+s.hintsUsed)) : 0,
          moves: Number.isFinite(+s.moves) ? Math.max(0, Math.round(+s.moves)) : 0,
          flags,
          elapsedMs: Number.isFinite(+s.elapsedMs) ? Math.max(0, +s.elapsedMs) : 0,
        };
      }
    } catch (e) {}
    return null;
  }
  function getElapsedMs() {
    if (!st) return 0;
    const base = Number.isFinite(+st.elapsedMs) ? st.elapsedMs : 0;
    if (st.flags.escaped) return base;
    return base + Math.max(0, Date.now() - sessionStart);
  }
  function flushElapsed() {
    if (!st || st.flags.escaped) return;
    st.elapsedMs = getElapsedMs();
    sessionStart = Date.now();
  }
  function saveState() {
    if (!st) return;
    try { localStorage.setItem(LS_SAVE(activePid), JSON.stringify(st)); } catch (e) {}
  }

  function ensureNoiseBuf(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return buf;
  }

  function sfx(kind) {
    if (muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const t = actx.currentTime;
      const nbuf = ensureNoiseBuf(actx);

      const noise = (dur, type, f0, f1, peak, delay = 0, q = 1.6) => {
        const src = actx.createBufferSource();
        src.buffer = nbuf;
        const flt = actx.createBiquadFilter();
        flt.type = type;
        flt.Q.value = q;
        flt.frequency.setValueAtTime(f0, t + delay);
        if (f1 && f1 !== f0) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + delay + dur);
        const g = actx.createGain();
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(peak, t + delay + Math.min(0.012, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        src.connect(flt); flt.connect(g); g.connect(actx.destination);
        src.start(t + delay); src.stop(t + delay + dur + 0.02);
      };
      const tone = (f0, f1, dur, type, peak, delay = 0) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t + delay);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + delay + dur);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(peak, t + delay + Math.min(0.015, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(t + delay); o.stop(t + delay + dur + 0.02);
      };

      if (kind === "click") {
        // 다이얼/책 톱니 물리 래칫 딸깍
        noise(0.018, "bandpass", 2100, 1400, 0.14, 0, 2.8);
        tone(240, 120, 0.026, "triangle", 0.08, 0);
      } else if (kind === "paper") {
        // 양피지 일지 팔락이는 질감
        noise(0.11, "highpass", 1300, 2400, 0.09, 0, 0.9);
        noise(0.09, "highpass", 1600, 2700, 0.07, 0.06, 1.0);
      } else if (kind === "unscrew") {
        // 일자 드라이버 금속 나사 3회 풀기 + 액자 내려놓는 나무 둔탁음
        [0, 0.085, 0.17].forEach(d => {
          noise(0.05, "bandpass", 2600, 1700, 0.11, d, 3.2);
          tone(920, 1280, 0.038, "triangle", 0.04, d);
        });
        noise(0.14, "lowpass", 300, 95, 0.16, 0.25, 0.8);
        tone(115, 52, 0.16, "sine", 0.14, 0.25);
      } else if (kind === "wood_open") {
        // 나무 서랍·책장 비밀판 미끄러지며 열리는 마찰음
        tone(210, 110, 0.045, "triangle", 0.09, 0);
        noise(0.26, "bandpass", 420, 190, 0.12, 0.02, 1.3);
      } else if (kind === "unlock") {
        // 황동 자물쇠 핀 물림 + 걸쇠 튕김
        noise(0.03, "bandpass", 2300, 1800, 0.14, 0, 3.0);
        tone(760, 520, 0.055, "triangle", 0.08, 0);
        noise(0.045, "bandpass", 2600, 1900, 0.16, 0.08, 2.5);
        tone(180, 95, 0.10, "sine", 0.10, 0.09);
      } else if (kind === "safe_open") {
        // 강철 금고 빗장 풀림 + 육중한 철문 회전
        noise(0.04, "bandpass", 1800, 1100, 0.16, 0, 3.5);
        tone(820, 410, 0.09, "triangle", 0.09, 0);
        noise(0.05, "bandpass", 1500, 900, 0.15, 0.10, 3.0);
        noise(0.36, "lowpass", 220, 75, 0.16, 0.16, 0.9);
        tone(125, 62, 0.34, "sine", 0.13, 0.16);
      } else if (kind === "clock") {
        // 괘종시계 째깍-째깍 + 묵직한 황동 종소리 배음
        noise(0.02, "bandpass", 1150, 900, 0.12, 0, 3.0);
        noise(0.02, "bandpass", 820, 680, 0.10, 0.34, 3.0);
        tone(293.7, 292, 1.15, "sine", 0.11, 0.12);
        tone(587.3, 585, 0.78, "sine", 0.055, 0.12);
        tone(880, 876, 0.45, "sine", 0.028, 0.12);
      } else if (kind === "magic") {
        // UV 손전등 스위치 딸깍 + 은은한 형광 발현
        noise(0.02, "bandpass", 2400, 1800, 0.11, 0, 2.5);
        tone(290, 460, 0.36, "sine", 0.075, 0.03);
        noise(0.32, "bandpass", 2600, 3200, 0.04, 0.04, 4.0);
      } else if (kind === "pickup" || kind === "combine") {
        // 소품 잡기 / 결합: 손에 쥐는 마찰음 + 작은 황동 울림
        noise(0.055, "bandpass", 1400, 900, 0.10, 0, 1.4);
        tone(960, 1180, 0.09, "triangle", kind === "combine" ? 0.065 : 0.045, 0.02);
      } else if (kind === "lock" || kind === "err") {
        // 잠긴 문고리 덜컹거림
        noise(0.04, "lowpass", 420, 200, 0.12, 0, 1.1);
        tone(125, 86, 0.075, "triangle", 0.10, 0);
        noise(0.04, "lowpass", 360, 180, 0.10, 0.085, 1.1);
        tone(110, 78, 0.07, "triangle", 0.085, 0.085);
      } else if (kind === "whoosh") {
        // 방면 회전 시 잔잔한 공기/옷깃 스침
        noise(0.12, "lowpass", 340, 160, 0.045, 0, 0.7);
      } else if (kind === "escape") {
        // 마지막 빗장 해제 → 묵직한 오크 문 삐걱 열림 → 따스한 서재 여운 화음
        noise(0.04, "bandpass", 2000, 1200, 0.15, 0, 2.8);
        noise(0.42, "bandpass", 240, 420, 0.10, 0.08, 3.2);
        tone(170, 255, 0.36, "sawtooth", 0.025, 0.10);
        [293.7, 370.0, 440.0, 587.3].forEach((f, i) => {
          tone(f, f, 0.95, "sine", 0.075, 0.42 + i * 0.07);
        });
      } else {
        // 기본 가벼운 손끝 터치
        noise(0.016, "bandpass", 820, 620, 0.055, 0, 1.8);
      }
    } catch (e) {}
  }

  function fmtSec(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function updateHomeBanner() {
    const sv = loadSave();
    const b = $("saveBanner"), rb = $("resetBtn"), sb = $("startBtn");
    if (sv && !sv.flags.escaped) {
      const doneCnt = Object.values(sv.flags).filter(Boolean).length;
      const totalCnt = Object.keys(sv.flags).length - 1;
      b.hidden = false;
      b.textContent = `💾 진행 중인 기록이 있어요 (진행 ${doneCnt}/${totalCnt} · 소지품 ${sv.inv.length}개)`;
      rb.hidden = false;
      sb.textContent = "이어서 탈출하기!";
    } else {
      b.hidden = true;
      rb.hidden = true;
      sb.textContent = "서재 들어가기!";
    }
  }

  function startGame(fresh = false) {
    const pid = curPid();
    const saved = !fresh && loadSave(pid);
    const useSaved = saved && !saved.flags.escaped;
    st = useSaved ? saved : E.initialState(Date.now());
    activePid = pid;
    sessionStart = Date.now();
    hintLvl = 1;
    combinePickA = null;
    if (!useSaved) {
      dialValsBox = [0, 0, 0, 0];
      dialValsSafe = [0, 0, 0];
    }
    $("home").closest(".wrap").hidden = true;
    $("play").hidden = false;
    setupCoach();
    startClockTick();
    renderAll();
  }

  function leaveGame() {
    flushElapsed();
    saveState();
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (coachBtnCtl) { coachBtnCtl.destroy(); coachBtnCtl = null; }
    if (coach) { coach.destroy(); coach = null; }
    $("closeupView").hidden = true;
    $("play").hidden = true;
    $("home").closest(".wrap").hidden = false;
    updateHomeBanner();
  }

  function startClockTick() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (!st || $("play").hidden) return;
      $("playSub").textContent = `${fmtSec(getElapsedMs())} · 힌트 ${st.hintsUsed}회`;
    }, 1000);
  }

  function setupCoach() {
    if (!window.CoachPanel) return;
    if (coachBtnCtl) { coachBtnCtl.destroy(); coachBtnCtl = null; }
    if (coach) coach.destroy();
    coach = CoachPanel.create({ game: "escape", title: "AI 선생님 (단계별 힌트)", startHidden: true });
    const slot = $("coachSlot");
    if (slot && coach.el) slot.appendChild(coach.el);
    coachBtnCtl = CoachPanel.button($("coachBtn"), coach, {
      remember: false,
      onToggle: on => { if (on) refreshCoach(true); },
    });
    refreshCoach(false);
  }

  function refreshCoach(countUse = false) {
    if (!coach || !st) return;
    const flagSig = Object.values(st.flags).map(v => v ? 1 : 0).join("");
    const hintKey = `${flagSig}:${hintLvl}`;
    if (!Array.isArray(st.seenHints)) st.seenHints = [];
    if (countUse && !st.seenHints.includes(hintKey)) {
      st.seenHints.push(hintKey);
      st.hintsUsed++;
      saveState();
    }
    const txt = E.getHint(st, hintLvl);
    coach.set(`
      <div><b>🔎 ${hintLvl}단계 힌트</b></div>
      <div style="margin:4px 0 8px">${esc(txt)}</div>
      <div style="display:flex;gap:6px">
        ${[1, 2, 3].map(l => `<button type="button" class="esc-tool-btn" data-hl="${l}" style="border-color:${l === hintLvl ? "var(--gold)" : ""}">${l}단계</button>`).join("")}
      </div>`);
    coach.body.querySelectorAll("[data-hl]").forEach(b => {
      b.onclick = () => {
        hintLvl = +b.dataset.hl;
        refreshCoach(true);
      };
    });
  }

  function applyResult(res) {
    const prevFlags = st ? Object.values(st.flags).map(v => v ? 1 : 0).join("") : "";
    const prevEscaped = st ? !!st.flags.escaped : false;
    const elapsedBefore = getElapsedMs();
    st = res.state;
    const nextFlags = Object.values(st.flags).map(v => v ? 1 : 0).join("");
    if (combinePickA && !st.inv.includes(combinePickA)) combinePickA = null;
    const justEscaped = !prevEscaped && st.flags.escaped;
    if (justEscaped) {
      st.elapsedMs = Math.max(0, elapsedBefore);
      const score = Math.max(100, Math.round(1000 - st.elapsedMs / 1000 - st.hintsUsed * 60));
      if (window.GRank) GRank.result("escape", { mode: "ai", res: "w", score, tier: "ep1" });
      if (window.Cozy && Cozy.confetti) Cozy.confetti();
    }
    if (res.msg) $("msgBox").textContent = res.msg;
    if (res.sfx) sfx(res.sfx);
    saveState();
    if (coach && coach.visible) {
      if (nextFlags !== prevFlags) hintLvl = 1;
      refreshCoach(false);
    }
    renderAll();
  }

  const WALL_IMG = {
    N: "assets/wall_north.jpg?v=2",
    E: "assets/wall_east.jpg",
    S: "assets/wall_south.jpg?v=2",
    W: "assets/wall_west.jpg",
  };

  function roomSrc(s) {
    if (s.wall === "N" && s.flags.clockFixed) return "assets/wall_north_fixed.jpg";
    if (s.wall === "S" && s.flags.silverPicked) return "assets/wall_south_nokey.jpg";
    if (s.wall === "W" && s.flags.safeOpen) return "assets/wall_west_safe_open.jpg";
    if (s.wall === "W" && s.flags.frameOpen) return "assets/wall_west_safe.jpg";
    return WALL_IMG[s.wall];
  }

  function renderAll() {
    if (!st) return;
    $("playTitle").textContent = E.WALL_NAMES[st.wall];
    $("playSub").textContent = `${fmtSec(getElapsedMs())} · 힌트 ${st.hintsUsed}회`;

    $("compass").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.w === st.wall));
    const img = $("roomImg");
    const targetSrc = roomSrc(st);
    if (img.getAttribute("src") !== targetSrc) img.setAttribute("src", targetSrc);

    renderOverlays();
    renderHotspots();
    renderInventory();
    renderZoom();
  }

  function renderOverlays() {
    const ov = $("visualOverlays");
    const f = st.flags;
    let html = "";
    if (st.wall === "E" && f.uvClueSeen) {
      html += `<div class="ov-uv-slate">☾ = 3<br>★ = 7<br>☀ = 9</div>`;
    }
    ov.innerHTML = html;
  }

  function renderHotspots() {
    const layer = $("hotspots");
    const spots = E.getHotspots(st, st.wall);
    layer.innerHTML = spots.map(sp => `
      <button type="button" class="esc-spot${sp.glint ? " glint" : ""}" data-spot="${sp.id}"
        aria-label="${esc(sp.label)}" title="${esc(sp.label)}"
        style="left:${sp.x}%;top:${sp.y}%;width:${sp.w}%;height:${sp.h}%"></button>`).join("");
    layer.querySelectorAll(".esc-spot").forEach(btn => {
      btn.onclick = () => {
        if (st.flags.escaped) return;
        applyResult(E.inspectSpot(st, btn.dataset.spot));
      };
    });
  }

  function renderInventory() {
    const list = $("invList");
    const combBtn = $("combineBtn");
    combBtn.setAttribute("aria-pressed", String(combinePickA !== null));
    $("inspectItemBtn").disabled = !st.selected;

    if (!st.inv.length) {
      list.innerHTML = `<div class="esc-inv-empty">가방이 비어 있어요 · 화면의 물건을 눌러 단서와 도구를 모으세요</div>`;
      return;
    }
    list.innerHTML = st.inv.map(id => {
      const it = E.ITEMS[id];
      const isSel = st.selected === id;
      const isComb = combinePickA === id;
      return `<button type="button" class="esc-slot${isSel ? " sel" : ""}${isComb ? " comb" : ""}" data-item="${id}">
        <span class="ic">${it.icon}</span>
        <span class="nm">${esc(it.name)}</span>
      </button>`;
    }).join("");

    list.querySelectorAll(".esc-slot").forEach(btn => {
      btn.onclick = () => {
        if (!st || st.flags.escaped) return;
        const id = btn.dataset.item;
        if (combinePickA !== null) {
          if (combinePickA === "") {
            combinePickA = id;
            $("msgBox").textContent = `${E.ITEMS[id].name} 선택됨 · 이제 합칠 두 번째 물건을 누르세요.`;
            renderInventory();
            return;
          }
          if (combinePickA === id) {
            combinePickA = null;
            renderInventory();
            return;
          }
          const first = combinePickA;
          combinePickA = null;
          applyResult(E.combineItems(st, first, id));
          return;
        }
        applyResult(E.selectItem(st, id));
      };
    });
  }

  function renderZoom() {
    const view = $("closeupView");
    const backBtn = $("zoomCloseBtn");
    const body = $("zoomBody");

    if (st.flags.escaped) {
      const el = getElapsedMs();
      const stars = st.hintsUsed === 0 ? "★★★" : st.hintsUsed <= 2 ? "★★☆" : "★☆☆";
      backBtn.hidden = true;
      body.innerHTML = `<div class="ez-scene-escaped">
        <div class="ez-parchment" style="text-align:center">
          <div style="font-size:28px;margin-bottom:4px">🗝️ 🚪 ✨</div>
          <div class="hd">서재 탈출 성공!</div>
          시계공 할아버지의 비밀 서재 문을 열고 밖으로 나왔습니다.<br><br>
          ⏱ 클리어 시간: <b>${fmtSec(el)}</b> &nbsp;·&nbsp; 🧑‍🏫 힌트 <b>${st.hintsUsed}회</b> (${stars})
        </div>
        <button type="button" class="btn primary" id="escReplayBtn">처음부터 다시 도전 ↺</button>
      </div>`;
      $("escReplayBtn").onclick = () => startGame(true);
      view.hidden = false;
      return;
    }

    if (!st.zoom) { view.hidden = true; body.innerHTML = ""; return; }
    backBtn.hidden = false;
    const z = st.zoom;

    const lootHtml = (ids, emptyTxt) => {
      const avail = ids.filter(id => {
        if (id === "magnet") return !st.flags.magnetPicked;
        if (id === "uv_off") return !st.flags.uvOffPicked;
        if (id === "pendulum") return !st.flags.pendulumPicked;
        if (id === "battery") return !st.flags.batteryPicked;
        if (id === "thread") return !st.flags.threadPicked;
        if (id === "driver") return !st.flags.driverPicked;
        if (id === "seal") return !st.flags.sealPicked;
        return false;
      });
      if (!avail.length) {
        return `<div class="ez-loot-empty">${esc(emptyTxt)}</div>
          <button type="button" class="ez-latch-btn" data-zclose="1">방으로 돌아가기 ↩</button>`;
      }
      return `<div class="ez-loot-tray">
        ${avail.map(id => {
          const it = E.ITEMS[id];
          return `<button type="button" class="ez-loot-item" data-take="${id}" aria-label="${esc(it.name)} 챙기기">
            <span class="ic">${it.icon}</span>
            <span class="nm">${esc(it.name)}</span>
            <span class="act">눌러서 챙기기</span>
          </button>`;
        }).join("")}
      </div>`;
    };

    if (z === "diary") {
      body.innerHTML = `<div class="ez-scene-diary"><div class="ez-parchment">
        <div class="hd">📜 시계공의 일지</div>
        <i>"내 모든 시간은 북쪽 시계에 멈춰 있소.<br>
        숨겨 둔 추를 찾으려면 서재의 책들을 아래 순서대로 누르시오."</i><br><br>
        1️⃣ 타오르는 <b>붉은 장미</b>의 장<br>
        2️⃣ 눈부신 <b>황금</b> 톱니바퀴의 장<br>
        3️⃣ 비취빛 <b>초록</b> 시계판의 장<br>
        4️⃣ 깊은 <b>푸른 밤</b>하늘의 장<br><br>
        <small style="opacity:.82">※ 빛이 닿지 않는 동쪽 석판은 보라빛 자외선 아래 진실을 드러낸다.</small>
      </div></div>`;
    } else if (z === "drawer") {
      body.innerHTML = `<div class="ez-scene-drawer">
        <div class="ez-lock-cap">열린 책상 서랍</div>
        ${lootHtml(["magnet", "uv_off"], "서랍 안의 물건을 모두 챙겼습니다.")}
      </div>`;
    } else if (z === "bookshelf") {
      if (st.flags.shelfOpen) {
        body.innerHTML = `<div class="ez-scene-shelf-open">
          <div class="ez-lock-cap">책장 뒤 비밀 공간</div>
          ${lootHtml(["pendulum", "battery"], "비밀 공간 안이 비어 있습니다.")}
        </div>`;
      } else {
        // 정답 순서(red->gold->green->blue)와 다르게 섞어 배치 + 책등 문양만 표현
        const books = [
          { k: "blue",  cls: "blue",  ic: "🌙", lbl: "푸른 밤하늘의 장" },
          { k: "",      cls: "deco",  ic: "❦",  lbl: "낡은 가죽 고서" },
          { k: "red",   cls: "red",   ic: "🌹", lbl: "붉은 장미의 장" },
          { k: "",      cls: "deco",  ic: "✦",  lbl: "두꺼운 필사본" },
          { k: "gold",  cls: "gold",  ic: "⚙",  lbl: "황금 톱니바퀴의 장" },
          { k: "green", cls: "green", ic: "🕰", lbl: "초록 시계판의 장" },
        ];
        body.innerHTML = `<div class="ez-scene-shelf">
          <div class="ez-shelf-row">
            ${books.map(b => b.k
              ? `<button type="button" class="ez-spine ${b.cls}${st.bookSeq.includes(b.k) ? " pushed" : ""}" data-bk="${b.k}" aria-label="${b.lbl}" title="${b.lbl}"><span class="mark">${b.ic}</span></button>`
              : `<div class="ez-spine deco" aria-hidden="true"><span class="mark">${b.ic}</span></div>`
            ).join("")}
          </div>
          <div class="ez-shelf-plank" aria-hidden="true">
            ${[0, 1, 2, 3].map(i => `<span class="ez-pin${i < st.bookSeq.length ? " lit" : ""}"></span>`).join("")}
          </div>
        </div>`;
        body.querySelectorAll("[data-bk]").forEach(b => {
          b.onclick = () => applyResult(E.pressBook(st, b.dataset.bk));
        });
      }
    } else if (z === "clock") {
      const threadOverlay = st.flags.clockFixed && !st.flags.threadPicked
        ? `<div class="ez-clock-tray">
            <button type="button" class="ez-loot-item compact" data-take="thread" aria-label="명주실 챙기기">
              <span class="ic">🧵</span>
              <span class="nm">명주실</span>
              <span class="act">아래 진자함에서 챙기기</span>
            </button>
          </div>`
        : "";
      body.innerHTML = `<div class="ez-scene-photo">
        <img src="assets/zoom_clock.jpg" class="ez-zoom-img" alt="03시 45분 괘종시계">
        ${threadOverlay}
      </div>`;
    } else if (z === "box") {
      if (st.flags.boxOpen) {
        body.innerHTML = `<div class="ez-scene-chest-open">
          <div class="ez-lock-cap">열린 나무 상자</div>
          ${lootHtml(["driver"], "나무 상자 안이 비어 있습니다.")}
        </div>`;
      } else {
        body.innerHTML = `<div class="ez-scene-chest">
          <div class="ez-lock-cap">나무 상자 황동 다이얼</div>
          <div class="ez-dials">
            ${dialValsBox.map((v, i) => `
              <div class="ez-dial">
                <button type="button" data-du="${i}">▲</button>
                <div class="val">${v}</div>
                <button type="button" data-dd="${i}">▼</button>
              </div>`).join("")}
          </div>
          <button type="button" class="ez-latch-btn" id="boxSubmitBtn">걸쇠 당기기 🔓</button>
        </div>`;
        body.querySelectorAll("[data-du]").forEach(b => {
          b.onclick = () => {
            const i = +b.dataset.du;
            dialValsBox[i] = (dialValsBox[i] + 1) % 10;
            sfx("click");
            b.parentElement.querySelector(".val").textContent = dialValsBox[i];
          };
        });
        body.querySelectorAll("[data-dd]").forEach(b => {
          b.onclick = () => {
            const i = +b.dataset.dd;
            dialValsBox[i] = (dialValsBox[i] + 9) % 10;
            sfx("click");
            b.parentElement.querySelector(".val").textContent = dialValsBox[i];
          };
        });
        $("boxSubmitBtn").onclick = () => applyResult(E.submitBoxCode(st, dialValsBox.join("")));
      }
    } else if (z === "slate") {
      body.innerHTML = `<div class="ez-scene-slate">
        <div class="ez-uv-txt">☾ = 3<br>★ = 7<br>☀ = 9</div>
      </div>`;
    } else if (z === "safe") {
      if (st.flags.safeOpen) {
        body.innerHTML = `<div class="ez-scene-safe-open">
          <div class="ez-lock-cap">열린 벽 금고 내부</div>
          ${lootHtml(["seal"], "금고 안이 비어 있습니다.")}
        </div>`;
      } else {
        const syms = ["☾", "★", "☀"];
        body.innerHTML = `<div class="ez-scene-safe">
          <div class="ez-lock-cap">숨겨진 강철 벽 금고</div>
          <div class="ez-dials">
            ${dialValsSafe.map((v, i) => `
              <div class="ez-dial">
                <div style="font-size:15px;color:#cbd5e1">${syms[i]}</div>
                <button type="button" data-su="${i}">▲</button>
                <div class="val">${v}</div>
                <button type="button" data-sd="${i}">▼</button>
              </div>`).join("")}
          </div>
          <button type="button" class="ez-latch-btn" id="safeSubmitBtn">금고 손잡이 돌리기 🔓</button>
        </div>`;
        body.querySelectorAll("[data-su]").forEach(b => {
          b.onclick = () => {
            const i = +b.dataset.su;
            dialValsSafe[i] = (dialValsSafe[i] + 1) % 10;
            sfx("click");
            b.parentElement.querySelector(".val").textContent = dialValsSafe[i];
          };
        });
        body.querySelectorAll("[data-sd]").forEach(b => {
          b.onclick = () => {
            const i = +b.dataset.sd;
            dialValsSafe[i] = (dialValsSafe[i] + 9) % 10;
            sfx("click");
            b.parentElement.querySelector(".val").textContent = dialValsSafe[i];
          };
        });
        $("safeSubmitBtn").onclick = () => applyResult(E.submitSafeCode(st, dialValsSafe.join("")));
      }
    } else if (z === "door") {
      body.innerHTML = `<div class="ez-scene-photo">
        <img src="assets/zoom_door.jpg" class="ez-zoom-img" alt="출구 참나무 문 잠금장치">
        <button type="button" class="ez-door-hot key${st.flags.doorKeyDone ? " done" : ""}" id="doorKeySlot"
          aria-label="${st.flags.doorKeyDone ? "열쇠 구멍 잠금 해제됨" : "열쇠 구멍"}"
          title="${st.flags.doorKeyDone ? "열쇠 구멍 잠금 해제됨" : "열쇠 구멍"}"></button>
        <button type="button" class="ez-door-hot seal${st.flags.doorSealDone ? " done" : ""}" id="doorSealSlot"
          aria-label="${st.flags.doorSealDone ? "인장 홈 장착됨" : "원형 인장 홈"}"
          title="${st.flags.doorSealDone ? "인장 홈 장착됨" : "원형 인장 홈"}"></button>
      </div>`;
      $("doorKeySlot").onclick = () => applyResult(E.useOnDoor(st, st.inv.includes("master_key") ? "master_key" : ""));
      $("doorSealSlot").onclick = () => applyResult(E.useOnDoor(st, st.inv.includes("seal") ? "seal" : ""));
    }

    body.querySelectorAll("[data-take]").forEach(b => {
      b.onclick = () => applyResult(E.takeItem(st, b.dataset.take));
    });
    body.querySelectorAll("[data-zclose]").forEach(b => {
      b.onclick = () => applyResult(E.closeZoom(st));
    });

    view.hidden = false;
  }

  function wireEvents() {
    $("startBtn").onclick = () => startGame(false);
    $("resetBtn").onclick = () => startGame(true);
    $("helpBtn").onclick = () => window.EscapeTutorial && EscapeTutorial.open(true);
    $("helpPlayBtn").onclick = () => window.EscapeTutorial && EscapeTutorial.open(true);
    $("gRankBtn").onclick = () => { if (window.GRank) GRank.open("escape"); };
    $("backBtn").onclick = leaveGame;
    $("sndBtn").onclick = () => {
      muted = !muted;
      $("sndBtn").textContent = muted ? "🔇" : "🔊";
    };
    $("turnLeftBtn").onclick = () => { if (st && !st.flags.escaped) applyResult(E.turnWall(st, -1)); };
    $("turnRightBtn").onclick = () => { if (st && !st.flags.escaped) applyResult(E.turnWall(st, 1)); };
    $("compass").querySelectorAll("button").forEach(b => {
      b.onclick = () => { if (st && !st.flags.escaped) applyResult(E.turnWall(st, b.dataset.w)); };
    });
    $("combineBtn").onclick = () => {
      if (!st || st.flags.escaped) return;
      if (combinePickA !== null) {
        combinePickA = null;
        $("msgBox").textContent = "합치기 모드를 껐습니다.";
      } else {
        combinePickA = "";
        $("msgBox").textContent = "🔗 합치기 모드: 서로 합칠 첫 번째 물건을 가방에서 고르세요.";
      }
      renderInventory();
    };
    $("inspectItemBtn").onclick = () => {
      if (!st || st.flags.escaped || !st.selected) return;
      const it = E.ITEMS[st.selected];
      $("msgBox").textContent = `${it.icon} [${it.name}] ${it.desc}`;
      sfx("tap");
    };
    $("zoomCloseBtn").onclick = () => { if (st && !st.flags.escaped) applyResult(E.closeZoom(st)); };
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && st && st.zoom && !st.flags.escaped) applyResult(E.closeZoom(st));
    });

    document.addEventListener("visibilitychange", () => {
      if (!st || $("play").hidden) return;
      if (document.hidden) { flushElapsed(); saveState(); }
      else { sessionStart = Date.now(); }
    });
    if (window.GME && GME.onChange) GME.onChange(() => {
      const nextPid = curPid();
      if (st && !$("play").hidden && nextPid !== activePid) leaveGame();
      else updateHomeBanner();
    });
    updateHomeBanner();
  }

  window.__escape = {
    state: () => st,
    apply: res => applyResult(res),
  };

  wireEvents();
})();

/* 비밀 서재 탈출 컨트롤러 (escape/main.js)
   · 4면 탐색 · 인벤토리 선택/조합 · 줌 퍼즐 · WebAudio 효과음 · 3단계 AI 선생님 · 자동 저장 */
(() => {
  "use strict";
  const E = window.EscapeCore;
  const $ = id => document.getElementById(id);
  const esc = s => (window.Cozy && Cozy.esc ? Cozy.esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  const curPid = () => (window.GME && GME.me && GME.me.pid) || "guest";
  const LS_SAVE = (pid = curPid()) => `benny.escape.ep1.${pid}`;
  const VALID_ZOOMS = new Set(["diary", "bookshelf", "clock", "box", "slate", "safe", "door"]);

  let st = null;
  let muted = false;
  let actx = null;
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
          flags: { ...base.flags, ...s.flags },
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

  function sfx(kind) {
    if (muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const t = actx.currentTime;
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);

      if (kind === "pickup" || kind === "combine") {
        o.type = "triangle"; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.14);
        g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.23);
      } else if (kind === "unlock") {
        o.type = "square"; o.frequency.setValueAtTime(340, t); o.frequency.setValueAtTime(510, t + 0.08);
        g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        o.start(t); o.stop(t + 0.25);
      } else if (kind === "escape") {
        [523, 659, 784, 1046].forEach((f, i) => {
          const oo = actx.createOscillator(), gg = actx.createGain();
          oo.connect(gg); gg.connect(actx.destination);
          oo.type = "triangle"; oo.frequency.setValueAtTime(f, t + i * 0.11);
          gg.gain.setValueAtTime(0.14, t + i * 0.11); gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.35);
          oo.start(t + i * 0.11); oo.stop(t + i * 0.11 + 0.36);
        });
      } else if (kind === "lock" || kind === "err") {
        o.type = "sawtooth"; o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(115, t + 0.12);
        g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.16);
      } else if (kind === "clock" || kind === "magic") {
        o.type = "sine"; o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(440, t + 0.28);
        g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        o.start(t); o.stop(t + 0.33);
      } else {
        o.type = "sine"; o.frequency.setValueAtTime(420, t);
        g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.start(t); o.stop(t + 0.07);
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
      b.hidden = false;
      b.textContent = `💾 진행 중인 기록이 있어요 (진행 ${doneCnt}/12 단계 · 소지품 ${sv.inv.length}개)`;
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
    } else if (z === "bookshelf") {
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
    } else if (z === "clock") {
      body.innerHTML = `<div class="ez-scene-photo">
        <img src="assets/zoom_clock.jpg" class="ez-zoom-img" alt="03시 45분 괘종시계">
      </div>`;
    } else if (z === "box") {
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
    } else if (z === "slate") {
      body.innerHTML = `<div class="ez-scene-slate">
        <div class="ez-uv-txt">☾ = 3<br>★ = 7<br>☀ = 9</div>
      </div>`;
    } else if (z === "safe") {
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

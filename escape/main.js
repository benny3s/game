/* 비밀 서재 탈출 컨트롤러 (escape/main.js)
   · 4면 탐색 · 인벤토리 선택/조합 · 줌 퍼즐 · WebAudio 효과음 · 3단계 AI 선생님 · 자동 저장 */
(() => {
  "use strict";
  const E = window.EscapeCore;
  const $ = id => document.getElementById(id);
  const esc = s => (window.Cozy && Cozy.esc ? Cozy.esc(s) : String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  const LS_SAVE = () => `benny.escape.ep1.${(window.GME && GME.me && GME.me.pid) || "guest"}`;

  let st = null;
  let muted = false;
  let actx = null;
  let coach = null;
  let coachBtnCtl = null;
  let hintLvl = 1;
  let seenHints = new Set();
  let combinePickA = null;
  let timerId = null;
  let sessionStart = Date.now();
  let activePid = (window.GME && GME.me && GME.me.pid) || "guest";
  let dialValsBox = [0, 0, 0, 0];
  let dialValsSafe = [0, 0, 0];

  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SAVE()) || "null");
      if (s && s.flags && Array.isArray(s.inv) && Array.isArray(s.bookSeq) && E.WALLS.includes(s.wall)) {
        const base = E.initialState(s.startedAt || Date.now());
        const inv = s.inv.filter(id => !!E.ITEMS[id]);
        const selected = s.selected && inv.includes(s.selected) ? s.selected : null;
        return {
          ...base,
          ...s,
          inv,
          selected,
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
    try { localStorage.setItem(LS_SAVE(), JSON.stringify(st)); } catch (e) {}
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
    const saved = !fresh && loadSave();
    const useSaved = saved && !saved.flags.escaped;
    st = useSaved ? saved : E.initialState(Date.now());
    activePid = (window.GME && GME.me && GME.me.pid) || "guest";
    sessionStart = Date.now();
    hintLvl = 1;
    seenHints = new Set();
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
    $("zoomModal").hidden = true;
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
    const hintKey = `${Object.values(st.flags).map(v => v ? 1 : 0).join("")}:${hintLvl}`;
    if (countUse && !seenHints.has(hintKey)) {
      seenHints.add(hintKey);
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
    const prevEscaped = st ? !!st.flags.escaped : false;
    st = res.state;
    const justEscaped = !prevEscaped && st.flags.escaped;
    if (justEscaped) {
      st.elapsedMs = Math.max(0, getElapsedMs());
      const score = Math.max(100, Math.round(1000 - st.elapsedMs / 1000 - st.hintsUsed * 60));
      if (window.GRank) GRank.result("escape", { mode: "ai", res: "w", score, tier: "ep1" });
      if (window.Cozy && Cozy.confetti) Cozy.confetti();
    }
    if (res.msg) $("msgBox").textContent = res.msg;
    if (res.sfx) sfx(res.sfx);
    saveState();
    if (coach && coach.visible) {
      hintLvl = 1;
      refreshCoach(false);
    }
    renderAll();
  }

  const WALL_IMG = {
    N: "assets/wall_north.jpg",
    E: "assets/wall_east.jpg",
    S: "assets/wall_south.jpg",
    W: "assets/wall_west.jpg",
  };

  function renderAll() {
    if (!st) return;
    $("playTitle").textContent = E.WALL_NAMES[st.wall];
    $("playSub").textContent = `${fmtSec(getElapsedMs())} · 힌트 ${st.hintsUsed}회`;

    $("compass").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.w === st.wall));
    const img = $("roomImg");
    if (img.getAttribute("src") !== WALL_IMG[st.wall]) img.setAttribute("src", WALL_IMG[st.wall]);

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
    if (st.wall === "W" && f.frameOpen) {
      html += `<div class="ov-safe-behind">${f.safeOpen ? "🔓 열린 금고" : "🔒 벽 금고"}</div>`;
    }
    if (st.wall === "N" && f.clockFixed) {
      html += `<div class="ov-clock-badge">03:45</div>`;
    }
    if (st.wall === "N" && (f.doorKeyDone || f.doorSealDone || f.escaped)) {
      html += `<div class="ov-door-status">${f.doorKeyDone ? "🔑✓" : "🔑✗"} ${f.doorSealDone ? "🪙✓" : "🪙✗"}</div>`;
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
    const modal = $("zoomModal");
    if (st.flags.escaped) {
      $("zoomTitle").textContent = "🎉 서재 탈출 성공!";
      const el = getElapsedMs();
      const stars = st.hintsUsed === 0 ? "★★★" : st.hintsUsed <= 2 ? "★★☆" : "★☆☆";
      $("zoomBody").innerHTML = `
        <div class="ez-parchment" style="text-align:center">
          <div style="font-size:32px;margin-bottom:6px">🗝️🚪✨</div>
          <b>시계공 할아버지의 비밀 서재에서 무사히 탈출했습니다!</b><br><br>
          ⏱ 클리어 시간: <b>${fmtSec(el)}</b><br>
          🧑‍🏫 사용 힌트: <b>${st.hintsUsed}회</b> (${stars})
        </div>
        <button type="button" class="btn primary big" id="escReplayBtn">처음부터 다시 도전 ↺</button>`;
      $("escReplayBtn").onclick = () => startGame(true);
      modal.hidden = false;
      return;
    }

    if (!st.zoom) { modal.hidden = true; return; }
    const z = st.zoom;
    const body = $("zoomBody");

    if (z === "diary") {
      $("zoomTitle").textContent = "📜 시계공의 일지";
      body.innerHTML = `<div class="ez-parchment">
        <i>"내 모든 시간은 북쪽 시계에 멈춰 있소.<br>
        숨겨 둔 추를 찾으려면 서재 책장을 아래 순서대로 누르시오."</i><br><br>
        1️⃣ 타오르는 <b>붉은 장미</b>의 장<br>
        2️⃣ 눈부신 <b>황금</b> 톱니바퀴의 장<br>
        3️⃣ 비취빛 <b>초록</b> 시계판의 장<br>
        4️⃣ 깊은 <b>푸른 밤</b>하늘의 장<br><br>
        <small>※ 빛이 닿지 않는 동쪽 석판은 보라빛 자외선 아래 진실을 드러낸다.</small>
      </div>`;
    } else if (z === "bookshelf") {
      $("zoomTitle").textContent = "📚 고서적 책장 (4색 책 누르기)";
      body.innerHTML = `
        <p style="margin:0;font-size:13px;color:var(--soft)">${st.flags.shelfOpen ? "비밀 칸이 열려 비어 있습니다." : `일지 순서대로 4권을 차례로 누르세요 (${st.bookSeq.length}/4)`}</p>
        <div class="ez-books">
          ${[["red", "빨강"], ["gold", "금색"], ["green", "초록"], ["blue", "파랑"]].map(([c, nm]) =>
            `<button type="button" class="ez-book ${c}${st.bookSeq.includes(c) || st.flags.shelfOpen ? " pushed" : ""}" data-bk="${c}">${nm}</button>`
          ).join("")}
        </div>`;
      body.querySelectorAll("[data-bk]").forEach(b => {
        b.onclick = () => applyResult(E.pressBook(st, b.dataset.bk));
      });
    } else if (z === "clock") {
      $("zoomTitle").textContent = "🕰️ 괘종시계";
      body.innerHTML = `
        <div style="text-align:center;padding:14px;border-radius:12px;background:#0f172a;border:1px solid var(--line)">
          <div style="font:900 32px monospace;color:${st.flags.clockFixed ? "var(--gold)" : "#64748b"}">${st.flags.clockFixed ? "03 : 45" : "-- : --"}</div>
          <p style="margin:8px 0 0;font-size:13px;color:#cbd5e1">${st.flags.clockFixed ? "황금 시계추가 걸려 3시 45분을 가리킨 채 종을 울렸습니다." : "시계추 고리가 비어 있습니다. 아래 가방에서 시계추를 선택해 클릭하거나 아래 버튼을 누르세요."}</p>
          ${!st.flags.clockFixed && st.inv.includes("pendulum") ? `<button type="button" class="btn primary" id="hangPendBtn" style="margin-top:10px">🕰️ 황금 시계추 걸기</button>` : ""}
        </div>`;
      if ($("hangPendBtn")) {
        $("hangPendBtn").onclick = () => {
          const s1 = E.selectItem({ ...st, selected: null }, "pendulum").state;
          applyResult(E.inspectSpot(s1, "clock"));
        };
      }
    } else if (z === "box") {
      $("zoomTitle").textContent = "🔒 4자리 숫자 상자";
      body.innerHTML = `
        <div class="ez-dials">
          ${dialValsBox.map((v, i) => `
            <div class="ez-dial">
              <button type="button" data-du="${i}">▲</button>
              <div class="val">${v}</div>
              <button type="button" data-dd="${i}">▼</button>
            </div>`).join("")}
        </div>
        <button type="button" class="btn primary" id="boxSubmitBtn">자물쇠 열기 🔓</button>`;
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
      $("zoomTitle").textContent = "⬛ 동쪽 벽 어두운 석판";
      const uv = st.flags.uvClueSeen;
      body.innerHTML = `
        <div class="ez-slate${uv ? " uv" : ""}">
          ${uv
            ? `<div class="ez-uv-txt">☾ = 3<br>★ = 7<br>☀ = 9</div>`
            : `<span style="color:#64748b">눈으로는 아무 무늬도 보이지 않는다.<br>특수 손전등을 켜서 비춰야 한다.</span>`}
        </div>
        ${!uv && st.inv.includes("uv_on") ? `<button type="button" class="btn primary" id="shineUvBtn">🟣 UV 손전등 비추기</button>` : ""}`;
      if ($("shineUvBtn")) {
        $("shineUvBtn").onclick = () => {
          const s1 = E.selectItem({ ...st, selected: null }, "uv_on").state;
          applyResult(E.inspectSpot(s1, "slate"));
        };
      }
    } else if (z === "safe") {
      $("zoomTitle").textContent = "🔐 벽 속 숨은 금고 (☾ · ★ · ☀)";
      const syms = ["☾", "★", "☀"];
      body.innerHTML = `
        <div class="ez-dials">
          ${dialValsSafe.map((v, i) => `
            <div class="ez-dial">
              <div style="font-size:15px;color:#cbd5e1">${syms[i]}</div>
              <button type="button" data-su="${i}">▲</button>
              <div class="val">${v}</div>
              <button type="button" data-sd="${i}">▼</button>
            </div>`).join("")}
        </div>
        <button type="button" class="btn primary" id="safeSubmitBtn">금고 열기 🔓</button>`;
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
      $("zoomTitle").textContent = "🚪 서재 출구 문";
      body.innerHTML = `
        <p style="margin:0;font-size:13px;color:var(--soft)">이중 잠금을 모두 풀면 서재에서 탈출할 수 있습니다.</p>
        <div class="ez-door-slots">
          <button type="button" class="ez-dslot${st.flags.doorKeyDone ? " done" : ""}" id="doorKeySlot">
            <span style="font-size:26px">🔑</span>
            <b>상단 열쇠 구멍</b>
            <small>${st.flags.doorKeyDone ? "잠금 해제됨 ✓" : (st.inv.includes("master_key") ? "클릭해 키 사용" : "마스터 키 필요")}</small>
          </button>
          <button type="button" class="ez-dslot${st.flags.doorSealDone ? " done" : ""}" id="doorSealSlot">
            <span style="font-size:26px">🪙</span>
            <b>중앙 원형 홈</b>
            <small>${st.flags.doorSealDone ? "인장 장착됨 ✓" : (st.inv.includes("seal") ? "클릭해 인장 끼우기" : "인장 메달 필요")}</small>
          </button>
        </div>`;
      $("doorKeySlot").onclick = () => applyResult(E.useOnDoor(st, st.inv.includes("master_key") ? "master_key" : ""));
      $("doorSealSlot").onclick = () => applyResult(E.useOnDoor(st, st.inv.includes("seal") ? "seal" : ""));
    }

    modal.hidden = false;
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
    $("zoomModal").onclick = e => {
      if (e.target === $("zoomModal") && st && !st.flags.escaped) applyResult(E.closeZoom(st));
    };

    document.addEventListener("visibilitychange", () => {
      if (!st) return;
      if (document.hidden) { flushElapsed(); saveState(); }
      else { sessionStart = Date.now(); }
    });
    if (window.GME && GME.onChange) GME.onChange(() => {
      const nextPid = (window.GME && GME.me && GME.me.pid) || "guest";
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

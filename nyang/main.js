/* 냥도쿠 — 화면·조작·혼자 하기·친구 대결 */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem("nyang." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem("nyang." + k, JSON.stringify(v)); } catch (e) {} } };
  const TIERS = [
    { id: "easy", em: "🐣", label: "쉬움", name: "🐣 쉬움", desc: "5×5 · 6×6" },
    { id: "normal", em: "🐱", label: "보통", name: "🐱 보통", desc: "7×7 · 8×8" },
    { id: "hard", em: "🐯", label: "어려움", name: "🐯 어려움", desc: "9×9 · 10×10" },
    { id: "master", em: "👑", label: "고수", name: "👑 고수", desc: "10×10 · 11×11 · 한 번 가정해 봐야" },
  ];
  const HINTS = [["on", "마음껏"], ["penalty", "쓰면 +10초"], ["off", "금지"]];
  const PENALTY = 10;                                      // 힌트 한 번(단계 하나)마다 대결 기록에 더하는 초
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };
  const toast = (m, ms = 2200) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), ms); };
  let bank = null;
  const bankP = fetch("puzzles.json?v=1").then(r => r.json()).then(b => (window.__nyBank = bank = b));

  // ── 기록 (관리자만 읽음)
  let glog = null;
  const logInit = () => { if (!glog && NET.db()) glog = GLOG(() => NET.db(), "nyang"); return glog; };

  // ── 화면 바꾸기
  const show = id => { for (const s of ["home", "lobby", "play"]) $(s).hidden = s !== id; document.body.classList.toggle("playing", id === "play"); if (id === "play") requestAnimationFrame(fitBoard); };
  // 판 크기 = 남은 공간(가로·세로 중 작은 쪽) — 휴대폰에서 위아래가 잘리지 않게
  function fitBoard() {
    const w = $("boardwrap"), b = $("board");
    if (!w || $("play").hidden) return;
    const s = Math.floor(Math.min(w.clientWidth, w.clientHeight, 600));
    b.style.setProperty("--bs", s + "px");
    if (G) b.style.setProperty("--gp", Math.max(2, Math.round(s / G.n * 0.07)) + "px");   // 칸 사이 간격도 판 크기에 맞게
  }
  addEventListener("resize", fitBoard);
  if (window.visualViewport) visualViewport.addEventListener("resize", fitBoard);

  // ── 판 그리기 · 조작 ───────────────────────────────────────
  let G = null;                 // 지금 판 (NY.Game)
  let ctx = null;               // { kind: "solo"|"vs", tier, idx, onEnd }
  let hint = null, hintStage = 0, hintKey = "";
  let tapMode = store.get("tap", "x");                     // x = 한 번 ✕ / 두 번 🐱, cat = 한 번 🐱
  let autoX = store.get("autoX", false);

  function cellsHtml() {
    const n = G.n;
    let h = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = G.reg[r][c], col = NY.COLORS[g % NY.COLORS.length][0];
      h += `<button class="c" data-k="${r * n + c}" style="background:${col}" aria-label="${r + 1}줄 ${c + 1}칸"></button>`;
    }
    return h;
  }  function drawBoard() {
    const b = $("board");
    b.className = "n" + G.n;
    b.style.setProperty("--n", G.n);
    b.style.gridTemplateColumns = `repeat(${G.n},minmax(0,1fr))`;
    b.style.gridTemplateRows = `repeat(${G.n},minmax(0,1fr))`;   // 칸이 늘 정사각형 (고양이가 든 줄만 커지지 않게)
    b.innerHTML = cellsHtml();
    paint();
  }
  function paint() {
    const look = new Set(hint && hintStage >= 1 ? hint.look : []), tgt = new Set(hint && hintStage >= 2 ? hint.target : []);
    for (const el of $("board").children) {
      const k = +el.dataset.k;
      const cat = G.cats.has(k), bad = G.bad.has(k), x = G.xs.has(k);
      el.innerHTML = cat ? '<span class="cat">🐱</span>' : (bad || x) ? '<span class="x">✕</span>' : "";
      el.classList.toggle("bad", bad);
      el.classList.toggle("look", look.has(k) && !tgt.has(k));
      el.classList.toggle("tgt", tgt.has(k));
    }
    $("fish").innerHTML = Array.from({ length: G.maxMistakes }, (_, i) => `<span class="${i < G.mistakes ? "gone" : ""}">🐟</span>`).join("");
    $("hintBadge").hidden = !G.hints; $("hintBadge").textContent = G.hints;
    // 색 묶음마다 동그라미: 그 묶음에 고양이를 놓으면 채워짐
    const doneReg = new Set([...G.cats].map(k => G.regionOf(k)));
    $("catStrip").innerHTML = Array.from({ length: G.n }, (_, g) => `<i class="${doneReg.has(g) ? "on" : ""}" style="background:${NY.COLORS[g % NY.COLORS.length][0]}"><span>🐱</span></i>`).join("");
  }
  const stateKey = () => [...G.cats].join(",") + "|" + [...G.xs].sort().join(",") + "|" + [...G.bad].join(",");

  function afterMove(res, k) {
    if (hint && stateKey() !== hintKey) closeHint();
    if (res === "miss" || res === "fail") { const el = $("board").children[k]; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); if (navigator.vibrate) navigator.vibrate(60); }
    paint(); progress();
    if (res === "win" || res === "fail") setTimeout(() => ctx.onEnd(res === "win"), 350);
  }
  // 누르기: ✕ 모드면 한 번 = ✕ 켜고 끔, 0.32초 안에 같은 칸 두 번 = 🐱 (앱과 같게). 누른 채 끌면 같은 방향으로 ✕ 칠하기
  let lastTap = { k: -1, t: 0 }, drag = null;
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest("#board .c"); };
  $("board").addEventListener("pointerdown", e => {
    if (!G || G.over) return;
    const el = cellAt(e.clientX, e.clientY); if (!el) return;
    e.preventDefault();
    const k = +el.dataset.k, t = performance.now();
    if (tapMode === "cat") { afterMove(G.place(k), k); return; }
    if (lastTap.k === k && t - lastTap.t < 320) {                            // 두 번 → 앞에서 바꾼 ✕를 되돌리고 고양이
      const prevX = lastTap.prevX;
      lastTap = { k: -1, t: 0 }; drag = null;
      if (G.xs.has(k) !== prevX) G.toggleX(k);
      afterMove(G.place(k), k); return;
    }
    const prevX = G.xs.has(k);
    G.toggleX(k);
    lastTap = { k, t, prevX };
    drag = { on: G.xs.has(k), seen: new Set([k]) };
    afterMove("x", k);
  });
  window.addEventListener("pointermove", e => {
    if (!drag || !G || G.over) return;
    const el = cellAt(e.clientX, e.clientY); if (!el) return;
    const k = +el.dataset.k; if (drag.seen.has(k)) return;
    drag.seen.add(k); lastTap = { k: -1, t: 0 };
    G.setX(k, drag.on); afterMove("x", k);
  });
  window.addEventListener("pointerup", () => { drag = null; });

  function setTapMode(m) { tapMode = m; store.set("tap", m); $("modeBtn").innerHTML = m === "x" ? '<span class="ic">✕</span><span>누르면 ✕</span>' : '<span class="ic">🐱</span><span>누르면 🐱</span>'; $("modeBtn").setAttribute("aria-pressed", m === "cat"); }
  $("modeBtn").onclick = () => setTapMode(tapMode === "x" ? "cat" : "x");
  function setAutoX(v) { autoX = v; store.set("autoX", v); $("autoX").setAttribute("aria-pressed", v); if (G) G.autoX = v; }
  $("autoX").onclick = () => setAutoX(!autoX);
  $("clearX").onclick = () => { if (!G || G.over) return; G.xs.clear(); closeHint(); paint(); };

  // ── 단계별 힌트: 1) 어디를 볼지 반짝 2) 이유 + 바꿀 칸 표시 3) 적용
  function closeHint() { hint = null; hintStage = 0; $("hintBox").hidden = true; if (G) paint(); }
  function useHint() { G.hints++; progress(); }
  $("hintBtn").onclick = () => {
    if (!G || G.over) return;
    if (ctx.hintRule === "off") { toast("이 방은 힌트 금지예요"); return; }
    if (hint && stateKey() === hintKey) { if (hintStage === 1) $("hintMore").click(); return; }
    hint = NY.nextHint(G); hintKey = stateKey();
    if (!hint) { toast("지금은 줄 힌트가 없어요"); return; }
    hintStage = 1; useHint();
    $("hintText").textContent = hint.kind === "wrongX" ? "반짝이는 칸을 다시 보세요. 뭔가 이상해요." : hint.kind === "clean" ? "반짝이는 고양이 주변을 보세요. 정리할 칸이 남았어요." : "반짝이는 곳을 보세요. 여기서 알 수 있는 게 있어요.";
    $("hintMore").hidden = false; $("hintApply").hidden = true; $("hintBox").hidden = false;
    paint();
  };
  $("hintMore").onclick = () => {
    if (!hint) return;
    hintStage = 2; useHint();
    $("hintText").textContent = hint.why;
    $("hintMore").hidden = true; $("hintApply").hidden = false;
    $("hintApply").textContent = hint.act === "cat" ? "🐱 놓기" : hint.act === "unx" ? "✕ 지우기" : `✕ ${hint.target.length}칸 표시`;
    paint();
  };
  $("hintApply").onclick = () => {
    if (!hint || G.over) return;
    useHint();
    const h = hint; closeHint();
    if (h.act === "cat") { afterMove(G.place(h.target[0]), h.target[0]); return; }
    for (const k of h.target) G.setX(k, h.act === "x");
    paint(); progress();
  };
  $("hintClose").onclick = closeHint;

  // ── 시간
  let timerT = null;
  function startTimer(from) {
    clearInterval(timerT);
    timerT = setInterval(() => {
      if (!G) return;
      const s = from ? (NET.now() - from) / 1000 : G.secs;
      $("timer").textContent = fmt(G.over ? (ctx.finalSecs ?? s) : s);
    }, 100);
  }

  // ── 판 시작 (혼자·대결 공통)
  function startPuzzle(p, c) {
    ctx = c; closeHint();
    G = new NY.Game(p, { autoX });
    drawBoard(); show("play");
    $("stLabel").textContent = c.label;
    $("hintBtn").disabled = c.hintRule === "off";
    $("restart").hidden = c.kind === "vs";
    $("opp").hidden = c.kind !== "vs";
    startTimer(c.startAt);
    progress();
  }
  function progress() { if (ctx && ctx.onProgress) ctx.onProgress(); }

  // ══ 혼자 하기: 난이도만 고르면 그 난이도 문제 중 랜덤 (안 푼 문제 먼저, 최근 10판은 피함) ══
  const solved = () => store.get("solved", {});                // { tier: [푼 문제 번호들] }
  const bests = () => store.get("bestT", {});                  // { tier: 가장 빠른 초 }
  function drawTiers() {
    const sv = solved(), bs = bests();
    $("tiers").innerHTML = TIERS.map(t => {
      const tot = bank[t.id].length, done = (sv[t.id] || []).length;
      return `<button class="tier t-${t.id}" data-t="${t.id}"><span class="em">${t.em}</span><b>${t.label}</b><span>${t.desc}</span><span>${done ? `푼 문제 ${done}/${tot}` : `${tot}문제`}${bs[t.id] ? ` · 최고 ${fmt(bs[t.id])}` : ""}</span></button>`;
    }).join("");
    for (const b of $("tiers").children) b.onclick = () => playSolo(b.dataset.t);
  }
  function pickRandom(tier) {
    const n = bank[tier].length, sv = new Set(solved()[tier] || []), recent = new Set(store.get("recent_" + tier, []));
    let pool = [...Array(n).keys()].filter(i => !sv.has(i) && !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()].filter(i => !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()];
    const i = pool[Math.floor(Math.random() * pool.length)];
    store.set("recent_" + tier, [i, ...recent].slice(0, Math.min(10, n - 1)));
    return i;
  }
  function playSolo(tier, idx) {
    const i = idx ?? pickRandom(tier), p = bank[tier][i], T = TIERS.find(t => t.id === tier);
    NET.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: store.get("name", "") }, NET.uid); if (lg) lg.matchStart({ mode: "solo", tier, puzzle: i, n: p.n }); }).catch(() => {});   // 기록은 뒤에서 (판은 바로 시작)
    startPuzzle(p, {
      kind: "solo", tier, idx: i, hintRule: "on", label: `${T.em} ${T.label} · ${p.n}×${p.n}`,
      onEnd(won) {
        const secs = G.secs; ctx.finalSecs = secs;
        if (glog) glog.matchEnd({ won, secs: Math.round(secs * 10) / 10, mistakes: G.mistakes, hints: G.hints });
        if (won) {
          const sv = solved(); const s = new Set(sv[tier] || []); s.add(i); sv[tier] = [...s]; store.set("solved", sv);
          const bs = bests(); const best = !G.hints && (!bs[tier] || secs < bs[tier]); if (best) { bs[tier] = secs; store.set("bestT", bs); }
          result("🎉 다 찾았어요!", `<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">실수 ${G.mistakes}번 · 힌트 ${G.hints}번${best ? " · <b style='color:var(--good)'>최고 기록!</b>" : ""}</p>`,
            [["한 판 더", () => playSolo(tier), "primary"], ["난이도 고르기", goHome]]);
        } else {
          result("😿 물고기를 다 잃었어요", `<p style="margin:0">고양이 ${G.cats.size}/${G.n}마리 찾았어요.</p><p class="small" style="margin:0">💡 힌트나 🪄 자동 ✕를 써 보세요.</p>`,
            [["다시 도전", () => playSolo(tier, i), "primary"], ["다른 문제", () => playSolo(tier)], ["난이도 고르기", goHome]]);
        }
      },
    });
  }
  // ← 단추: 실수로 나가지 않게 2초 안에 두 번
  let backAt = 0;
  $("giveUp").onclick = () => {
    if (!G) return;
    if (!G.over && performance.now() - backAt > 2000) { backAt = performance.now(); toast(ctx.kind === "solo" ? "한 번 더 누르면 나가요" : "한 번 더 누르면 이번 판을 포기해요"); return; }
    if (ctx.kind === "solo") { if (!G.over && glog) glog.matchEnd({ won: false, gaveUp: true, secs: Math.round(G.secs) }); G.over = true; goHome(); }
    else if (!G.over) { G.over = true; G.gaveUp = true; ctx.finalSecs = (NET.now() - ctx.startAt) / 1000; progress(); paint(); toast("이번 판은 포기했어요"); }
  };
  $("restart").onclick = () => {
    if (!G || ctx.kind !== "solo") { toast("대결 중에는 처음부터 할 수 없어요"); return; }
    if (!G.over && glog) glog.matchEnd({ won: false, restart: true, secs: Math.round(G.secs) });
    playSolo(ctx.tier, ctx.idx);
  };  function result(title, body, btns) {
    $("resTitle").textContent = title; $("resBody").innerHTML = body;
    $("resBtns").innerHTML = "";
    for (const b of btns.filter(Boolean)) { const el = document.createElement("button"); el.className = "btn " + (b[2] || ""); el.textContent = b[0]; el.onclick = () => { $("resBox").hidden = true; b[1](); }; $("resBtns").appendChild(el); }
    $("resBox").hidden = false;
  }
  function goHome() { G = null; clearInterval(timerT); $("resBox").hidden = true; show("home"); drawTiers(); }

  // ══ 친구 대결 ══════════════════════════════════════════════
  let R = null, isHost = false, meta = null, players = {}, prog = {}, myRound = 0, shownRound = 0;
  const myName = () => ($("name").value.trim() || "").slice(0, 12);
  $("name").value = store.get("name", "");
  $("name").oninput = () => { store.set("name", $("name").value.trim()); if (R && myName()) R.setMe({ name: myName() }); };
  const needName = () => { if (!myName()) { toast("이름을 먼저 적어 주세요"); $("name").focus(); return false; } return true; };

  async function drawRooms() {
    $("rooms").innerHTML = '<li class="none">불러오는 중…</li>';
    try {
      const rows = await NET.listRooms();
      $("rooms").innerHTML = rows.length ? rows.map(r => `<li class="${r.empty ? "empty" : ""}"><span class="cd">${esc(r.code)}</span><span class="inf"><b>${esc(r.h)}</b> <span class="small">${r.n}명 · ${esc((TIERS.find(t => t.id === r.tier) || {}).name || "")} · ${r.ph === "lobby" ? "대기 중" : "게임 중"}</span></span>${r.empty ? `<button class="btn danger" data-del="${esc(r.code)}">빈 방 지우기</button>` : `<button class="btn" data-join="${esc(r.code)}">들어가기</button>`}</li>`).join("") : '<li class="none">열린 방이 없어요. 방을 만들어 보세요.</li>';
      for (const b of $("rooms").querySelectorAll("[data-join]")) b.onclick = () => joinRoom(b.dataset.join);
      for (const b of $("rooms").querySelectorAll("[data-del]")) b.onclick = async () => { await NET.deleteRoom(b.dataset.del); drawRooms(); };
    } catch (e) { $("rooms").innerHTML = `<li class="none">방 목록을 못 불러왔어요 (${esc(e.message)})</li>`; }
  }
  $("refresh").onclick = drawRooms;
  function tab(which) {                                     // 시작 화면 탭: solo · vs · watch
    for (const [t, box] of [["Solo", "soloBox"], ["Vs", "vsBox"], ["Watch", "watchBox"]]) {
      const on = t.toLowerCase() === which;
      $("tab" + t).setAttribute("aria-pressed", on); $(box).hidden = !on;
    }
    if (which === "vs") drawRooms();
    if (window.NYWATCH) { if (which === "watch") NYWATCH.open(); else NYWATCH.close(); }
  }
  $("tabSolo").onclick = () => tab("solo");
  $("tabVs").onclick = () => tab("vs");
  $("tabWatch").onclick = () => tab("watch");

  const hooks = {
    meta(m) { meta = m; onMeta(); },
    players(v) {
      const before = new Set(Object.keys(players)); players = v; drawLobby(); drawOpp();
      if (isHost && glog) { for (const [u, p] of Object.entries(v)) if (!before.has(u)) glog.joined(u, { name: p.name, role: u === R.uid ? "방장" : "참가" }); for (const u of before) if (!v[u]) glog.left(u); }
      checkRoundEnd();
    },
    prog(v) { prog = v; drawOpp(); checkRoundEnd(); },
    chat(m) { const d = document.createElement("div"); d.innerHTML = `<b>${esc(m.n)}</b> ${esc(m.m)}`; $("chatLog").appendChild(d); $("chatLog").scrollTop = 1e9; if (isHost && glog) glog.chat(m); },
    conn(ok, why) { if (!ok && why) toast(why, 3000); },
    closed() { toast("방이 닫혔어요", 3000); leaveRoom(); },
  };
  async function makeRoom() {
    if (!needName()) return;
    try {
      await NET.init(); const lg = logInit();
      const cfg = store.get("cfg", { tier: "normal", hint: "penalty", rounds: 3 });
      const sid = lg ? lg.start({ kind: "대결", hostName: myName() }, NET.uid) : null;
      hooks.logSid = sid;
      isHost = true; R = await NET.host({ name: myName() }, cfg, hooks);
      if (lg) lg.info({ room: R.code });
      enterLobby();
    } catch (e) { toast("방을 못 만들었어요: " + e.message, 4000); }
  }
  async function joinRoom(code) {
    if (!needName()) return;
    code = String(code || "").toUpperCase().trim();
    if (code.length !== 4) { toast("방 코드는 4자리예요"); return; }
    if (R) { if (R.code === code && !isHost) { R.setMe({ name: myName() }); return; } R.leave(); R = null; }   // 이미 들어와 있으면 이름만 바꾸거나, 다른 방이면 먼저 나감
    try { isHost = false; R = await NET.join(code, { name: myName() }, hooks); enterLobby(); const lg = logInit(); if (lg && R.meta && R.meta.log) { lg.attach(R.meta.log); lg.net(R.uid, { name: myName(), role: "참가" }); } }
    catch (e) { toast(e.message, 4000); }
  }
  $("mkRoom").onclick = makeRoom;
  $("joinCode").onclick = () => joinRoom($("code").value);
  function enterLobby() {
    show("lobby"); $("lbCode").textContent = R.code; $("chatLog").innerHTML = "";
    history.replaceState(null, "", `?room=${R.code}${location.search.includes("guest") ? "&guest" : ""}`);
    drawLobby();
  }
  $("copyLink").onclick = async () => {
    const url = `${location.origin}${location.pathname}?room=${R.code}`;
    try { await navigator.clipboard.writeText(url); toast("초대 링크를 복사했어요"); } catch (e) { prompt("이 주소를 친구에게 보내세요", url); }
  };
  function leaveRoom() {
    if (R) { if (isHost && glog) glog.close(); R.leave(); }
    R = null; meta = null; players = {}; prog = {}; G = null; clearInterval(timerT);
    $("resBox").hidden = true; $("countBox").hidden = true;
    history.replaceState(null, "", location.pathname + (location.search.includes("guest") ? "?guest" : ""));
    show("home"); $("tabVs").click();
  }
  $("leave1").onclick = leaveRoom;
  $("chatSend").onclick = () => { const v = $("chatIn").value.trim(); if (v && R) { R.chat(v); $("chatIn").value = ""; } };
  $("chatIn").onkeydown = e => { if (e.key === "Enter") $("chatSend").click(); };

  function segBtns(el, items, cur, on) {
    el.innerHTML = items.map(([v, l]) => `<button class="btn" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("");
    for (const b of el.children) b.onclick = () => on(b.dataset.v);
  }
  function cfgText(c) { return `${(TIERS.find(t => t.id === c.tier) || {}).name} · 힌트 ${(HINTS.find(h => h[0] === c.hint) || [])[1]} · ${c.rounds}판`; }
  function drawLobby() {
    if (!R || !meta) return;
    const wins = meta.wins || {};
    $("lbPlayers").innerHTML = Object.entries(players).map(([u, p]) => `<li><span class="inf"><b>${esc(p.name)}</b> ${u === meta.host ? '<span class="small">방장</span>' : ""}${u === R.uid ? ' <span class="small">(나)</span>' : ""}</span><span class="small">승 ${wins[u] || 0}</span></li>`).join("");
    $("hostOpts").hidden = !isHost; $("guestWait").hidden = isHost;
    $("cfgView").textContent = cfgText(meta.cfg);
    if (isHost) {
      const c = meta.cfg, set = p => { const nc = { ...meta.cfg, ...p }; store.set("cfg", nc); R.setMeta({ cfg: nc }); };
      segBtns($("cfgTier"), TIERS.map(t => [t.id, t.name]), c.tier, v => set({ tier: v }));
      segBtns($("cfgHint"), HINTS, c.hint, v => set({ hint: v }));
      segBtns($("cfgRounds"), [[1, "1판"], [3, "3판"], [5, "5판"]], c.rounds, v => set({ rounds: +v }));
    }
  }
  // 방장: 새 판 시작 (같은 퍼즐을 모두에게, 3.5초 뒤 동시에)
  async function startRound(next) {
    if (!isHost) return;
    const list = bank[meta.cfg.tier];
    const used = new Set(meta.used || []);
    let pid = Math.floor(Math.random() * list.length), guard = 0;
    while (used.has(pid) && guard++ < 50) pid = Math.floor(Math.random() * list.length);
    used.add(pid);
    const round = next ? (meta.round || 0) + 1 : 1;
    await R.clearProg();
    if (glog) glog.matchStart({ mode: "vs", tier: meta.cfg.tier, round, n: list[pid].n, hint: meta.cfg.hint, people: Object.values(players).map(p => p.name).join(", ") });
    await R.setMeta({ phase: "play", round, pid, startAt: NET.now() + 3500, used: [...used].slice(-40), scored: 0, ...(next ? {} : { wins: {} }) });
  }
  $("startVs").onclick = () => startRound(false);

  function onMeta() {
    if (!meta) return;
    if (meta.phase === "lobby") { if (R) { G = null; myRound = 0; clearInterval(timerT); $("resBox").hidden = true; $("countBox").hidden = true; show("lobby"); } drawLobby(); return; }
    if (meta.phase === "play" && meta.round !== myRound) {
      myRound = meta.round; shownRound = 0;
      const p = bank[meta.cfg.tier][meta.pid];
      $("resBox").hidden = true;
      countdown(meta.startAt, () => {
        startPuzzle(p, {
          kind: "vs", hintRule: meta.cfg.hint, startAt: meta.startAt, label: `${meta.round}/${meta.cfg.rounds}판 · ${p.n}×${p.n}`,
          onProgress: sendProg, onEnd: won => { ctx.finalSecs = (NET.now() - meta.startAt) / 1000; sendProg(); toast(won ? "다 놓았어요! 다른 사람을 기다리는 중…" : "물고기를 다 잃었어요. 다른 사람을 기다리는 중…", 3000); },
        });
      });
    }
    drawOpp();
  }
  function countdown(at, go) {
    $("countBox").hidden = false;
    const tick = () => {
      const left = (at - NET.now()) / 1000;
      if (left <= 0) { $("countBox").hidden = true; go(); return; }
      $("count").textContent = Math.ceil(left); setTimeout(tick, 100);
    };
    tick();
  }
  function sendProg() {
    if (!R || !G || ctx.kind !== "vs") return;
    const done = G.won ? 1 : 0, failed = (!G.won && G.over) ? 1 : 0;
    const secs = G.over ? (ctx.finalSecs ?? (NET.now() - meta.startAt) / 1000) : null;
    R.prog({ round: meta.round, placed: G.cats.size, n: G.n, mistakes: G.mistakes, hints: G.hints, done, failed, gaveUp: G.gaveUp ? 1 : 0, secs: secs == null ? null : Math.round(secs * 10) / 10 });
  }
  const score = q => q.done ? (q.secs || 0) + (meta.cfg.hint === "penalty" ? (q.hints || 0) * PENALTY : 0) : null;
  function ranking() {
    return Object.entries(players).map(([u, p]) => ({ u, name: p.name, q: prog[u] && prog[u].round === meta.round ? prog[u] : null }))
      .sort((a, b) => {
        const sa = a.q && score(a.q), sb = b.q && score(b.q);
        if (sa != null && sb != null) return sa - sb; if (sa != null) return -1; if (sb != null) return 1;
        return ((b.q && b.q.placed) || 0) - ((a.q && a.q.placed) || 0);
      });
  }
  function drawOpp() {
    if (!meta || meta.phase !== "play" || !G) return;
    // 위쪽 얇은 줄: 사람마다 알약 하나 (나도 포함) — 진행 막대 · 남은 물고기 · 끝나면 기록
    $("opp").innerHTML = ranking().map(({ u, name, q }) => {
      const pct = q ? q.placed / q.n * 100 : 0;
      const st = !q ? "준비" : q.done ? `✔ ${fmt(score(q))}` : q.failed ? (q.gaveUp ? "포기" : "실패") : `🐟${3 - (q.mistakes || 0)}${q.hints ? " 💡" + q.hints : ""}`;
      const cls = [u === R.uid ? "me" : "", q && q.done ? "done" : "", q && q.failed ? "fail" : ""].join(" ");
      return `<div class="p ${cls}"><span class="av">${esc((name || "?").slice(0, 1))}</span><b>${esc(name)}</b><span class="pb"><i style="width:${pct}%"></i></span><span>${st}</span></div>`;
    }).join("");
    requestAnimationFrame(fitBoard);
  }
  function checkRoundEnd() {
    if (!meta || meta.phase !== "play" || shownRound === meta.round) return;
    const rk = ranking();
    if (!rk.length || !rk.every(r => r.q && (r.q.done || r.q.failed))) return;
    shownRound = meta.round;
    const winner = rk[0].q.done ? rk[0] : null;
    if (isHost && winner && meta.scored !== meta.round) {
      const wins = { ...(meta.wins || {}) }; wins[winner.u] = (wins[winner.u] || 0) + 1;
      R.setMeta({ wins, scored: meta.round });
      if (glog) glog.matchEnd({ winner: winner.name, results: rk.map(r => ({ n: r.name, done: r.q.done, secs: r.q.secs, mistakes: r.q.mistakes, hints: r.q.hints })) });
    }
    const wins = { ...(meta.wins || {}) }; if (winner && meta.scored !== meta.round) wins[winner.u] = (wins[winner.u] || 0) + 1;
    const body = `<table class="rank"><tr><th></th><th>이름</th><th>기록</th><th>실수</th><th>힌트</th><th>승</th></tr>${rk.map((r, i) =>
      `<tr><td>${r.q.done ? i + 1 : "-"}</td><td>${esc(r.name)}</td><td class="n">${r.q.done ? fmt(score(r.q)) : r.q.gaveUp ? "포기" : "실패"}</td><td class="n">${r.q.mistakes}</td><td class="n">${r.q.hints || 0}</td><td class="n">${wins[r.u] || 0}</td></tr>`).join("")}</table>
      ${meta.cfg.hint === "penalty" ? `<p class="small">힌트 한 번마다 +${PENALTY}초</p>` : ""}`;
    const last = meta.round >= meta.cfg.rounds;
    const title = winner ? `${winner.u === R.uid ? "🏆 내가 이겼어요!" : `🏆 ${winner.name} 승리`}` : "모두 실패했어요";
    result(last ? `${title} (마지막 판)` : title, body, isHost
      ? [last ? null : ["다음 판", () => startRound(true), "primary"], ["대기실로", () => R.setMeta({ phase: "lobby" })], ["방 나가기", leaveRoom]]
      : [["방 나가기", leaveRoom]]);
    if (!isHost) $("resBody").insertAdjacentHTML("beforeend", '<p class="small">방장이 다음 판을 시작하면 바로 넘어가요.</p>');
  }

  // ── 시작
  setTapMode(tapMode); setAutoX(autoX);
  bankP.then(() => {
    drawTiers();
    const q = new URLSearchParams(location.search).get("room");
    if (q) { $("tabVs").click(); $("code").value = q.toUpperCase(); if (myName()) joinRoom(q); else { toast("이름을 적고 '들어가기'를 눌러 주세요", 4000); $("name").focus(); } }
  }).catch(e => { $("tiers").textContent = "퍼즐을 못 불러왔어요: " + e.message; });
  window.__ny = { get G() { return G; }, get meta() { return meta; }, get prog() { return prog; }, NY };   // 점검용
})();

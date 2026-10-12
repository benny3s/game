/* 스타 대결 — 화면·조작·대기실·소리
   방장(localhost 페이지): 엔진 서버(/events 상태, /cmd 명령)와 친구들 사이를 이어 주고, 누가 어떤 유닛을 맡는지 정함
   친구(github.io 페이지): 방장이 보낸 상태를 그리고, 자기 유닛 명령만 보냄
   유닛 튜플: [id, 편(0 팀1·1 팀2), 종류, x, y, 체력, 보호막, 최대 체력, 최대 보호막, 방향, 공격 대기, 명령, 대상] */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // localhost 로 열면 브라우저가 IPv6(::1)부터 시도했다 실패해서 명령마다 0.3초 늦음 → 127.0.0.1 로 다시 열기
  if (location.hostname === "localhost" && location.port === "8810") { location.replace(location.href.replace("//localhost", "//127.0.0.1")); return; }
  const HOST = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "8810" && !new URLSearchParams(location.search).has("friend");   // 엔진 서버가 연 페이지만 방장
  const roomParam = (new URLSearchParams(location.search).get("room") || "").toUpperCase().slice(0, 4);
  const SCN = {
    corsair: { a: "저그 뮤탈리스크 12", b: "프로토스 커세어 7", note: "커세어는 사거리가 길고 여러 기를 한 번에 맞힘. 뮤탈은 뭉쳐서 한 대씩 집중 공격." },
    scourge: { a: "저그 뮤탈리스크 12", b: "저그 스커지 8", note: "스커지는 부딪혀 터지는 자폭 유닛. 뮤탈은 흩어지며 미리 쏴서 떨어뜨리기." },
    mirror: { a: "저그 뮤탈리스크 12", b: "저그 뮤탈리스크 12", note: "같은 유닛끼리. 컨트롤 싸움." },
  };
  const TNAME = { 43: "뮤탈리스크", 60: "커세어", 47: "스커지" };
  const MAPKO = { FightingSpirit: "파이팅 스피릿", Python: "파이썬", CircuitBreaker: "서킷브레이커", Destination: "데스티네이션", HeartbreakRidge: "하트브레이크 릿지",
    Benzene: "벤젠", Andromeda: "안드로메다", TauCross: "타우크로스", NeoMoonGlaive: "네오 문글레이브", ElectricCircuit: "일렉트릭 서킷", EmpireoftheSun: "엠파이어 오브 더 선",
    Icarus: "이카루스", Jade: "제이드", "LaMancha1.1": "라만차", Roadrunner: "로드러너", testmap1: "시험 맵" };
  const mapName = f => { if (!f) return "-"; const m = f.replace(/\.sc[mx]$/i, ""), n = (m.match(/^\((\d)\)/) || [])[1], k = m.replace(/^\(\d\)/, ""); return (MAPKO[k] || k) + (n ? ` (${n}인용)` : ""); };
  const COLORS = [[0, "빨강"], [215, "파랑"], [175, "청록"], [280, "보라"], [28, "주황"], [20, "갈색", 35], [0, "하양", 0], [55, "노랑"]];
  const colorOf = (h, l) => h === "w" ? "#e8e8e8" : `hsl(${h},75%,${l || 55}%)`;
  const S0 = { name: "", hue: 215 };
  try { S0.name = localStorage.getItem("sc-name") || localStorage.getItem("snake-name") || ""; const h = localStorage.getItem("sc-hue"); if (h) S0.hue = +h; } catch (e) {}

  // ── 소리: 직접 만든 합성음 (원래 게임 소리 파일은 친구에게 보낼 수 없어서 느낌만 비슷하게)
  let AC = null;
  const audio = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (AC && AC.state === "suspended") AC.resume(); return AC; };
  addEventListener("pointerdown", audio, { once: true }); addEventListener("keydown", audio, { once: true });
  function tone(f, d, type = "square", v = 0.06, at = 0, slide = 0) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SND = {
    join: () => { tone(660, 0.12, "triangle", 0.08); tone(990, 0.16, "triangle", 0.08, 0.1); },
    leave: () => { tone(800, 0.12, "triangle", 0.07); tone(500, 0.18, "triangle", 0.07, 0.1); },
    chat: () => tone(1250, 0.07, "square", 0.04),
    tick: () => tone(880, 0.09, "square", 0.05),
    go: () => { tone(523, 0.25, "sawtooth", 0.05); tone(659, 0.25, "sawtooth", 0.05, 0.05); tone(784, 0.4, "sawtooth", 0.05, 0.1); },
    sel: () => tone(1500, 0.03, "square", 0.025),
    cmd: () => tone(700, 0.04, "triangle", 0.04),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, "triangle", 0.07, i * 0.14)),
    lose: () => [440, 370, 311, 262].forEach((f, i) => tone(f, 0.35, "triangle", 0.07, i * 0.18)),
  };

  // ── 들어가기 화면
  $("name").value = S0.name;
  $("colors").innerHTML = COLORS.map(([h, n, l], i) => `<button class="sw" type="button" data-i="${i}" title="${n}" aria-label="${n}" style="background:${n === "하양" ? "#e8e8e8" : colorOf(h, l)}"></button>`).join("");
  const hueVal = i => COLORS[i][1] === "하양" ? "w" : COLORS[i][0];
  let myColor = Math.max(0, COLORS.findIndex(c => c[0] === S0.hue));
  const markColors = () => $("colors").querySelectorAll(".sw").forEach(b => b.setAttribute("aria-checked", String(+b.dataset.i === myColor)));
  $("colors").addEventListener("click", e => { const b = e.target.closest(".sw"); if (!b) return; myColor = +b.dataset.i; markColors(); try { localStorage.setItem("sc-hue", COLORS[myColor][0]); } catch (er) {} });
  markColors();
  if (HOST) {
    $("entryNote").textContent = "이 PC(방장)에서 엔진이 돌아요. 방을 만들고 친구에게 초대 링크를 보내세요. 이 화면은 이 PC에서만 열립니다.";
    $("enterBtn").textContent = "방 만들기"; $("enterBtn").disabled = false;
  } else if (roomParam) {
    $("entryNote").textContent = `방 ${roomParam}에 초대받았어요. 이름과 색을 고르고 들어가세요.`;
    $("enterBtn").textContent = "들어가기"; $("enterBtn").disabled = false;
  } else {
    $("entryNote").innerHTML = "초대 링크가 있어야 들어올 수 있어요. 방장이 PC에서 게임을 켜 둔 동안만 열립니다.";
    checkAdmin().then(ok => { if (ok) showLaunch(); });
  }
  // ── 관리자(포털과 같은 로그인)면: 포털에서 바로 PC 엔진 켜기 → 방장 화면으로
  function checkAdmin() {
    return new Promise(ok => {
      try {
        const FBC = { apiKey: "AIzaSyCSueePQfiHaRxUSZxoropiFjiq9arAaTs", authDomain: "benny-meeting.firebaseapp.com", projectId: "benny-meeting", appId: "1:925758544707:web:a0c55e596ae0b15e7fadf6" };
        const app = firebase.apps.find(a => a.name === "[DEFAULT]") || firebase.initializeApp(FBC);
        const t = setTimeout(() => ok(false), 5000);
        const off = app.auth().onAuthStateChanged(async u => { clearTimeout(t); off(); try { ok(!!u && (await u.getIdTokenResult()).claims.admin === 1); } catch (e) { ok(false); } });
      } catch (e) { ok(false); }
    });
  }
  function showLaunch() {
    $("entryNote").textContent = "관리자로 로그인돼 있어요.";
    ["name", "colors", "enterBtn"].forEach(id => $(id).closest(".row").style.display = "none");
    $("launch").style.display = "grid";
    let wanted = false, up = false;
    const probe = () => fetch("http://127.0.0.1:8810/ping", { cache: "no-store" }).then(r => r.ok, () => false).then(ok => {
      up = ok;
      $("engineSt").textContent = ok ? "엔진 켜져 있음 ✓ — ② 방장 화면 열기" : "엔진 꺼져 있음 — ① 을 누르세요 (처음 한 번은 브라우저가 '열기' 허락을 물어요)";
      if (ok && wanted) location.href = "http://127.0.0.1:8810/";
    });
    probe(); setInterval(probe, 2000);
    $("engineOn").onclick = () => { wanted = true; if (up) { location.href = "http://127.0.0.1:8810/"; return; } location.href = "benny-sc://start"; $("engineSt").textContent = "엔진 켜는 중… (검은 창이 뜨면 그대로 두세요)"; };
  }

  let ctl = null, isHost = false, meta = {}, players = {}, own = {}, chatLog = [], countdownT = null;
  const LOG = GLOG(() => NET.db(), "sc");                         // 관리자만 읽는 게임 기록
  let reconnects = 0;
  $("enterBtn").onclick = async () => {
    const n = $("name").value.trim();
    if (!n) { $("entryMsg").textContent = "이름을 넣어 주세요"; $("name").focus(); return; }
    try { localStorage.setItem("sc-name", n); } catch (e) {}
    $("enterBtn").disabled = true; $("entryMsg").textContent = "연결 중…";
    try {
      if (HOST) {
        isHost = true; ctl = await NET.host({ name: n, hue: hueVal(myColor), scn: $("scn").value }, hostHooks); startEngineLink();
        const sid = LOG.start({ room: ctl.code, hostName: n, kind: "친구랑" }, ctl.uid); ctl.setMeta({ log: sid });
        addEventListener("beforeunload", () => LOG.close());
      }
      else ctl = await NET.join(roomParam, { name: n, hue: hueVal(myColor), team: 1 }, clientHandlers);
      show("lobby"); renderLobby(); loadMaps();
    } catch (e) { $("entryMsg").textContent = e.message || String(e); $("enterBtn").disabled = false; }
  };
  function show(id) { for (const s of ["entry", "lobby"]) $(s).style.display = s === id ? "grid" : "none"; $("game").style.display = id === "game" ? "block" : "none"; if (id === "game") resize(); }

  // ── 대기실
  function renderLobby() {
    const code = ctl.code, hostId = isHost ? ctl.uid : meta.host;
    $("roomTitle").textContent = `대기실 · ${code}`;
    $("roomInfo").textContent = isHost ? "이 PC가 방장 (엔진)" : "방장이 시작하기를 기다리는 중";
    const sc = SCN[meta.scn || $("scn").value] || SCN.corsair;
    $("t0name").textContent = `(${sc.a})`; $("t1name").textContent = `(${sc.b})`;
    for (const t of [0, 1]) {
      const ps = Object.entries(players).filter(([, p]) => (p.team ?? 0) === t);
      $("team" + t).innerHTML = ps.length ? ps.map(([uid, p]) => `<div class="slot"><span class="c" style="background:${colorOf(colorMap[uid] ?? p.hue)}"></span><span>${esc(p.name)}${uid === ctl.uid ? " <span class='small'>(나)</span>" : ""}</span><span class="tag">${uid === hostId ? "방장" : ""}</span></div>`).join("")
        : `<div class="slot cpu"><span class="c" style="background:#555"></span><span>컴퓨터</span><span class="tag">AI</span></div>`;
    }
    $("scn").value = meta.scn || $("scn").value; $("scn").disabled = !isHost;
    if (!isHost) { $("mapSel").style.display = "none"; $("mapInfo").textContent = "맵: " + mapName(meta.map); }
    $("scnInfo").textContent = sc.note;
    const link = "https://benny3s.github.io/game/sc/?room=" + code;
    $("linkTxt").textContent = link; $("inviteRow").style.display = isHost ? "flex" : "none"; $("linkTxt").style.display = isHost ? "block" : "none";
    $("startBtn").style.display = isHost ? "" : "none";
    $("lobbyMsg").textContent = isHost ? `사람 ${Object.keys(players).length}명` : "";
  }
  $("copyLink").onclick = () => { const t = $("linkTxt").textContent; navigator.clipboard.writeText(t).then(() => { $("copyLink").textContent = "복사됨 ✓"; setTimeout(() => $("copyLink").textContent = "초대 링크 복사", 1500); }, () => {}); };
  $("toT0").onclick = () => ctl && ctl.setMe({ team: 0 });
  $("toT1").onclick = () => ctl && ctl.setMe({ team: 1 });
  $("scn").onchange = () => { if (isHost) ctl.setMeta({ scn: $("scn").value }); };
  // ── 맵 (방장): SSCAIT 대회 맵 묶음 15개 + 시험 맵. 바꾸면 엔진이 그 맵으로 다시 켜짐 (몇 초)
  async function loadMaps() {
    if (!isHost) return;
    try {
      const r = await (await fetch("/maps", { cache: "no-store" })).json();
      $("mapSel").innerHTML = r.list.map(f => `<option value="${esc(f)}"${f === r.cur ? " selected" : ""}>${esc(mapName(f))}</option>`).join("");
      $("mapSel").disabled = false; $("mapInfo").textContent = "실제 대회 맵 (SSCAIT 묶음). 유닛은 맵 한가운데에서 싸워요.";
      if (meta.map !== r.cur) { meta.map = r.cur; ctl.setMeta({ map: r.cur }); }
    } catch (e) { $("mapInfo").textContent = "맵 목록을 못 불러왔어요"; }
  }
  $("mapSel").onchange = async () => {
    const name = $("mapSel").value; $("mapSel").disabled = true; $("startBtn").disabled = true;
    $("mapInfo").textContent = "맵 바꾸는 중… (엔진 다시 켜는 중)";
    await fetch("/map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    for (let i = 0; i < 40; i++) { try { const r = await fetch("/maps", { cache: "no-store" }); if (r.ok && (await r.json()).cur === name) break; } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
    miniImg = null; $("startBtn").disabled = false; sysMsg(`맵을 ${mapName(name)}(으)로 바꿨어요`); await loadMaps();
  };
  $("leaveBtn").onclick = () => { if (ctl) ctl.leave(); location.href = location.pathname + (roomParam && !HOST ? "" : ""); };
  function onChat(m) {
    if (!m || !m.m) return;
    if (isHost) LOG.chat(m);
    chatLog.push(m); if (chatLog.length > 80) chatLog.shift();
    const hue = players[m.u] ? players[m.u].hue : 50;
    const line = `<b style="color:${colorOf(hue, 65)}">${esc(m.n)}</b>: ${esc(m.m)}`;
    const li = document.createElement("li"); li.innerHTML = line; $("lchat").appendChild(li); $("lchat").scrollTop = 1e9;
    if ($("game").style.display === "block") { const d = document.createElement("div"); d.innerHTML = line; $("msgs").appendChild(d); setTimeout(() => d.style.opacity = 0, 8000); setTimeout(() => d.remove(), 8700); }
    if (m.u !== (ctl && ctl.uid)) SND.chat();
  }
  const sysMsg = t => { const li = document.createElement("li"); li.className = "sys"; li.textContent = t; $("lchat").appendChild(li); $("lchat").scrollTop = 1e9; };
  let chatAt = 0;
  const sendChat = input => { const t = input.value.trim(); if (!t || !ctl || performance.now() - chatAt < 600) return; chatAt = performance.now(); input.value = ""; ctl.chat(t).catch(() => {}); };
  $("lchatForm").addEventListener("submit", e => { e.preventDefault(); sendChat($("lchatIn")); });
  let prevPlayers = {};
  function onPlayers(v) {
    for (const uid of Object.keys(v)) if (!prevPlayers[uid] && Object.keys(prevPlayers).length) { sysMsg(`${v[uid].name} 님이 들어왔어요`); SND.join(); }
    for (const uid of Object.keys(prevPlayers)) if (!v[uid]) { sysMsg(`${prevPlayers[uid].name} 님이 나갔어요`); SND.leave(); if (isHost) LOG.left(uid); }
    if (isHost) for (const [uid, p] of Object.entries(v)) { const o = prevPlayers[uid]; if (!o) LOG.joined(uid, { name: p.name, team: p.team ?? 0, role: uid === ctl.uid ? "방장" : "친구" }); else if (o.team !== p.team || o.name !== p.name) LOG.player(uid, { name: p.name, team: p.team ?? 0 }); }
    prevPlayers = v; players = v; recolor(); renderLobby();
    if (isHost && phase === "play") assignOwners();
  }
  // 카운트다운 (스타처럼 5초, 초마다 삑)
  function runCountdown(ms, done) {
    clearInterval(countdownT);
    const end = performance.now() + ms; let last = -1;
    const stepCd = () => { const left = Math.ceil((end - performance.now()) / 1000); if (left !== last) { last = left; if (left > 0) { $("cd").textContent = left; SND.tick(); } } if (left <= 0) { clearInterval(countdownT); $("cd").textContent = ""; done && done(); } };
    stepCd(); countdownT = setInterval(stepCd, 100);
  }
  $("startBtn").onclick = () => {
    if (!isHost) return;
    $("startBtn").disabled = true;
    ctl.setMeta({ phase: "countdown" }); ctl.sureAll({ t: "cd", ms: 5000 }); sysMsg("5초 뒤 시작합니다");
    runCountdown(5000, hostStartGame);
  };

  // ── 방장: 엔진 연결 + 친구 명령 검사
  let phase = "lobby", es = null;
  const hostHooks = {
    players: onPlayers, chat: onChat,
    join() {}, leave() {},
    conn(c) { if (!c) reconnects++; warn(c ? "" : "인터넷 연결이 끊겼어요 · 다시 연결하는 중…"); },
    msg(uid, m) {
      if (!m) return;
      if (m.t === "c") { const mineIds = new Set(own[uid] || []); const ids = (m.ids || []).filter(i => mineIds.has(i)); if (ids.length) engineCmd({ ...m, ids }); }
      else if (m.t === "p") ctl.sure(uid, { t: "q", c: m.c });
    },
  };
  function engineCmd(m) { fetch("/cmd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: m.ids, kind: m.kind, x: m.x | 0, y: m.y | 0, target: m.target ?? -1, q: !!m.q }) }).catch(() => {}); }
  function startEngineLink() {
    es = new EventSource("/events");
    es.onmessage = e => { if (phase !== "play") return; ctl.state('{"t":"s","d":' + e.data + "}"); onState(JSON.parse(e.data)); };
    es.onerror = () => warn("엔진 서버 연결이 끊겼어요 · 다시 붙는 중… (맵을 바꾸는 중이면 잠깐 기다리세요)");
    es.onopen = () => warn("");                                          // 다시 붙으면 알림 지움 (맵 바꾸면 엔진이 다시 켜짐)
  }
  function teamHumans(t) { return Object.entries(players).filter(([, p]) => (p.team ?? 0) === t).map(([uid]) => uid).sort(); }
  function assignOwners() {
    if (!cur) return;
    const next = {};
    for (const t of [0, 1]) {
      const hs = teamHumans(t), us = cur.u.filter(u => u[1] === t).map(u => u[0]).sort((a, b) => a - b);
      hs.forEach(h => next[h] = []);
      us.forEach((id, i) => { if (hs.length) next[hs[i % hs.length]].push(id); });
    }
    const ai = [teamHumans(0).length === 0, teamHumans(1).length === 0];
    if (JSON.stringify(ai) !== JSON.stringify(cur.ai)) fetch("/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ai }) });
    own = next; ctl.sureAll({ t: "o", own }); onOwn(own);
  }
  async function hostStartGame() {
    const ai = [teamHumans(0).length === 0, teamHumans(1).length === 0];
    await fetch("/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scn: meta.scn || $("scn").value, ai }) });
    cur = prev = null; phase = "play";
    setTimeout(() => { assignOwners(); ctl.setMeta({ phase: "play" }); }, 400);
    const names = t => teamHumans(t).map(u => players[u].name).join(", ") || "컴퓨터";
    LOG.matchEnd({ aborted: true }); LOG.matchStart({ scn: meta.scn || $("scn").value, team1: names(0), team2: names(1) });
    enterGame();
  }
  $("backLobby").onclick = () => { if (!isHost) return; LOG.matchEnd({ aborted: !resultShown }); phase = "lobby"; ctl.setMeta({ phase: "lobby" }); leaveGame(); };

  // ── 친구: 방장 메시지
  const clientHandlers = {
    players: onPlayers, chat: onChat, closed() { alert("방장이 방을 닫았어요"); location.reload(); },
    conn(c, why) { if (!c) reconnects++; warn(c ? "" : (why || "연결 끊김") + " · 다시 연결하는 중…"); },
    meta(v) {
      const was = meta.phase; meta = v; if (v.log) LOG.attach(v.log);
      if (v.phase === "play" && phase !== "play") { phase = "play"; cur = prev = null; enterGame(); }
      else if (v.phase === "lobby" && phase !== "lobby") { phase = "lobby"; leaveGame(); }
      else if (v.phase === "countdown" && was !== "countdown") { sysMsg("5초 뒤 시작합니다"); runCountdown(5000); }
      renderLobby();
    },
    msg(m) {
      if (m.t === "s") onState(m.d);
      else if (m.t === "o") onOwn(m.own);
      else if (m.t === "q") ping = ping ? ping * 0.7 + (performance.now() - m.c) * 0.3 : performance.now() - m.c;
    },
  };
  let ping = 0;
  setInterval(() => {
    if (!ctl) return;
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const jit = a => { if (a.length < 2) return null; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.round(Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length)); };
    if (isHost) {
      const ps = ctl.peers(); LOG.net(ctl.uid, { name: players[ctl.uid] ? players[ctl.uid].name : "", role: "방장", friends: ps.length, direct: ps.filter(p => p[1]).length, reconnects, react: avg(reacts) });
      if (phase === "play" && cur && LOG.inMatch) LOG.matchUpdate({ secs: Math.round(cur.f / 23.81), left1: cur.u.filter(u => u[1] === 0).length, left2: cur.u.filter(u => u[1] === 1).length });
    } else LOG.net(ctl.uid, { name: players[ctl.uid] ? players[ctl.uid].name : "", role: "친구", conn: ctl.p2p ? "직접" : "Firebase", ping: Math.round(ping) || null, gap: avg(stGaps), jitter: jit(stGaps), react: avg(reacts), reconnects });
  }, 10000);
  setInterval(() => { if (!isHost && ctl && phase === "play") ctl.ping({ t: "p", c: performance.now() }); }, 1000);
  let myUnits = new Set();
  function onOwn(o) { own = o; myUnits = new Set(o[ctl.uid] || []); for (const id of [...sel]) if (!myUnits.has(id)) sel.delete(id); }

  // ── 게임 화면
  const cv = $("cv"), ctx = cv.getContext("2d"), mainCtx = ctx, mini = $("mini"), mctx = mini.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  function resize() { DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; }
  addEventListener("resize", () => { resize(); camSent = ""; layoutConsole(); });
  const cam = { x: 2048, y: 2048, z: 1 };
  const ARENA = 900;                                                    // 미니맵에 보이는 범위 (중앙 ± 900)
  let cur = null, prev = null, curAt = 0, gap = 84, sel = new Set(), mode = null, drag = null, flashes = [], marks = [], groups = {}, lastGroupKey = { k: null, at: 0 };
  let stGaps = [], reacts = [], pend = null, resultShown = null;
  const S = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  const Wd = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
  let realOn = HOST, camSent = "", camT = 0;
  const classicScale = () => Math.max(0.5, Math.min(W / 640, H / 480));   // 640×480 기준 배율 (작은 창이면 줄임)
  function sendCam(force) {
    if (!isHost || !realOn || !W) return;
    const s = cam.z, vw = Math.ceil(W / s), vh = Math.ceil(H / s);
    const x = Math.round(cam.x - vw / 2), y = Math.round(cam.y - vh / 2), key = `${x},${y},${vw},${vh}`, now = performance.now();
    if (key === camSent || (!force && now - camT < 40)) return;
    camSent = key; camT = now;
    fetch("/cam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x, y, w: vw, h: vh }) }).catch(() => {});
  }
  function setReal(on) {
    realOn = on && isHost;
    $("game").classList.toggle("classic", realOn); resize(); cam.z = realOn ? classicScale() : 1; layoutConsole();
    const img = $("real"); img.style.display = realOn ? "block" : "none";
    if (realOn) { img.src = "/video?" + Date.now(); camSent = ""; sendCam(true); curCursor = ""; setCursor("arrow"); img.onerror = () => { if (realOn) setTimeout(() => { img.src = "/video?" + Date.now(); camSent = ""; }, 1000); }; }   // 엔진이 다시 켜지면 화면도 다시 붙음 else { img.removeAttribute("src"); cv.style.cursor = "crosshair"; }
  }
  // ── 원작 콘솔: 엔진 서버가 블리자드 데이터에서 꺼낸 저그 콘솔 그림 (친구 페이지엔 없음)
  let consoleImg = null;
  async function layoutConsole() {
    const g = $("game");
    if (!realOn) { g.style.removeProperty("--s"); return; }
    if (!consoleImg) {
      try { const r = await fetch("/asset?f=" + encodeURIComponent("game\\zconsole.pcx") + "&crop=1"); const top = +(r.headers.get("X-Top") || 290); consoleImg = { url: URL.createObjectURL(await r.blob()), top }; } catch (e) { consoleImg = { url: "", top: 330 }; }
    }
    const s = classicScale(), cw = 640 * s;
    g.style.setProperty("--s", s); g.style.setProperty("--ct", consoleImg.top + "px"); g.style.setProperty("--ch", (480 - consoleImg.top) + "px");
    g.style.setProperty("--cx", Math.round((g.clientWidth - cw) / 2) + "px"); g.style.setProperty("--cimg", `url(${consoleImg.url})`);
  }
  // ── 원작 소리: 선택하면 대사, 명령하면 대답, 공격·죽음 소리 (같은 소리 겹침은 제한)
  const SFX = {
    43: { what: ["Zerg\\Mutalid\\ZMuWht00", "Zerg\\Mutalid\\ZMuWht01", "Zerg\\Mutalid\\ZMuWht02", "Zerg\\Mutalid\\ZMuWht03"], yes: ["Zerg\\Mutalid\\ZMuYes00", "Zerg\\Mutalid\\ZMuYes01", "Zerg\\Mutalid\\ZMuYes02", "Zerg\\Mutalid\\ZMuYes03"], fire: ["Bullet\\zmuFir00"], die: ["Zerg\\Mutalid\\ZMuDth00"] },
    60: { what: ["Protoss\\Corsair\\PCoWht00", "Protoss\\Corsair\\PCoWht01"], yes: ["Protoss\\Corsair\\PCoYes00", "Protoss\\Corsair\\PCoYes01"], fire: ["Protoss\\Corsair\\PCorhit1", "Protoss\\Corsair\\PCorhit2"], die: ["Misc\\ExploMed"] },
    47: { what: ["Zerg\\AVENGER\\ZAvWht00", "Zerg\\AVENGER\\ZAvWht01"], yes: ["Zerg\\AVENGER\\ZAvYes00", "Zerg\\AVENGER\\ZAvYes01"], fire: ["Zerg\\AVENGER\\ZAvHit00"], die: ["Zerg\\AVENGER\\ZAvDth00"] },
  };
  const bufs = {}, playingAt = {};
  async function sfxBuf(name) {
    if (name in bufs) return bufs[name];
    bufs[name] = null; const a = audio(); if (!a) return null;
    for (const ext of [".wav", ".WAV"]) {
      try { const r = await fetch("/asset?f=" + encodeURIComponent("sound\\" + name + ext)); if (!r.ok) continue; bufs[name] = await a.decodeAudioData(await r.arrayBuffer()); return bufs[name]; } catch (e) {}
    }
    return null;
  }
  async function sfx(type, kind, vol = 0.7, minGap = 60) {
    if (!realOn) return;
    const set = SFX[type] && SFX[type][kind]; if (!set) return;
    const k = type + kind, now = performance.now(); if (now - (playingAt[k] || 0) < minGap) return; playingAt[k] = now;
    const b = await sfxBuf(set[Math.floor(Math.random() * set.length)]); const a = audio(); if (!b || !a) return;
    const src = a.createBufferSource(), g = a.createGain(); g.gain.value = vol; src.buffer = b; src.connect(g).connect(a.destination); src.start();
  }
  const imgCache = {};
  const grpImg = (f, frame, pal) => { const k = f + frame + pal; if (!imgCache[k]) { const im = new Image(); im.src = `/grp?f=${encodeURIComponent(f)}&frame=${frame}&pal=${pal}`; imgCache[k] = im; } return imgCache[k]; };
  function tinted(c, im, col) {                                          // 와이어프레임을 체력 색으로 (원작처럼)
    const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
    if (!im.complete || !im.naturalWidth) { im.onload = () => tinted(c, im, col); return; }
    g.globalCompositeOperation = "source-over"; g.drawImage(im, 0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over";
  }
  const cursors = {}; let curCursor = "";
  async function loadCursor(name) {
    const sc = Math.round(cam.z) || 1, k = name + sc;
    if (cursors[k] !== undefined) return cursors[k];
    cursors[k] = null;
    try {
      const r = await fetch(`/cursor?f=${name}&s=${sc}`); const [hx, hy] = (r.headers.get("X-Hot") || "0,0").split(",");
      const url = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); r.blob().then(b => fr.readAsDataURL(b)); });
      cursors[k] = `url(${url}) ${hx} ${hy}, auto`;
    } catch (e) { cursors[k] = ""; }
    return cursors[k];
  }
  async function setCursor(name) { if (!realOn) return; if (curCursor === name && cv.style.cursor.startsWith("url")) return; curCursor = name; const c = await loadCursor(name); if (curCursor === name && c) cv.style.cursor = c; }
  // 원작 소리 그대로 쓰는 버튼 소리
  async function buttonSound() { if (!HOST) return; const b = await sfxBuf("Misc\\Button"); const a = audio(); if (!b || !a) return; const s0 = a.createBufferSource(); s0.buffer = b; const g = a.createGain(); g.gain.value = 0.5; s0.connect(g).connect(a.destination); s0.start(); }
  document.addEventListener("click", e => { if (e.target.closest(".btn, #card button")) buttonSound(); }, true);
  const onScreen = (x, y) => { const [sx, sy] = S(x, y); return sx > -40 && sy > -40 && sx < W + 40 && sy < H + 40; };
  function enterGame() { show("game"); if (isHost) setReal(realOn || HOST); sel.clear(); resultShown = null; $("banner").textContent = ""; $("endBox").style.display = "none"; buildCard(); SND.go(); }
  function leaveGame() { if (isHost) $("real").removeAttribute("src"); show("lobby"); $("startBtn").disabled = false; renderLobby(); }
  function onState(s) {
    const now = performance.now();
    if (!cur) { cam.x = s.c[0] - (isTeam1() ? 0 : 0); cam.y = s.c[1]; }
    const sById = new Map(s.u.map(u => [u[0], u]));
    if (cur) {
      const g = now - curAt; stGaps.push(g); if (stGaps.length > 60) stGaps.shift(); gap = Math.max(40, Math.min(220, g));
      for (const u of s.u) { const o = cur.byId.get(u[0]); if (o && u[10] > o[10] + 3) { flashes.push({ a: u[0], t: u[12], at: now }); if (onScreen(u[3], u[4])) sfx(u[2], "fire", 0.35, 90); } }
      for (const o of cur.u) if (!sById.has(o[0]) && onScreen(o[3], o[4])) sfx(o[2], "die", 0.8, 120);
    }
    s.byId = new Map(s.u.map(u => [u[0], u])); prev = cur; cur = s; curAt = now;
    for (const id of [...sel]) if (!cur.byId.has(id)) sel.delete(id);
    // 명령 → 반응: 명령 보낸 유닛의 명령 번호나 대상이 바뀐 첫 상태까지 걸린 시간
    if (pend) { const u = cur.byId.get(pend.id); if (u && (u[11] !== pend.order || u[12] !== pend.target)) { reacts.push(now - pend.at); if (reacts.length > 20) reacts.shift(); pend = null; } else if (now - pend.at > 2000) pend = null; }
    if (s.r && resultShown !== s.r) {
      resultShown = s.r;
      if (isHost) LOG.matchEnd({ winner: s.r === "a" ? "팀1" : s.r === "b" ? "팀2" : "무승부", left1: s.u.filter(u => u[1] === 0).length, left2: s.u.filter(u => u[1] === 1).length, secs: Math.round(s.f / 23.81) }); const myTeam = players[ctl.uid] ? players[ctl.uid].team ?? 0 : 0;
      const win = (s.r === "a" && myTeam === 0) || (s.r === "b" && myTeam === 1);
      $("banner").textContent = s.r === "draw" ? "무승부" : win ? "승리!" : "패배"; (win ? SND.win : SND.lose)();
      $("endBox").style.display = "flex"; $("backLobby").style.display = isHost ? "" : "none";
    }
  }
  const isTeam1 = () => players[ctl && ctl.uid] && players[ctl.uid].team === 1;
  function sendCmd(kind, x = 0, y = 0, target = -1, q = false) {
    const ids = [...sel].filter(i => myUnits.has(i)); if (!ids.length) return;
    const u = cur && cur.byId.get(ids[0]); if (u) pend = { id: ids[0], order: u[11], target: u[12], at: performance.now() };
    const m = { t: "c", ids, kind, x: Math.round(x), y: Math.round(y), target, q };
    if (isHost) engineCmd(m); else ctl.send(m);
    if (realOn && u) sfx(u[2], "yes", 0.8, 700); else SND.cmd();
  }
  // 명령 버튼 (스타 콘솔 오른쪽 3×3)
  const CARD = [["move", "<u>M</u>이동", "m"], ["stop", "<u>S</u>정지", "s"], ["amove", "<u>A</u>공격", "a"], ["patrol", "<u>P</u>순찰", "p"], ["hold", "<u>H</u>그 자리", "h"]];
  const ICON = { move: 228, stop: 229, patrol: 254, hold: 255 }, WEAPON_ICON = { 43: 345, 60: 332, 47: 350 };
  const TIP = { move: "이동 (M)", stop: "정지 (S)", amove: "공격 (A)", patrol: "순찰 (P)", hold: "그 자리 (H)" };
  let cardType = -1;
  function buildCard() {
    if (realOn) {
      const first = [...sel].map(i => cur && cur.byId.get(i)).find(u => u && myUnits.has(u[0]));
      cardType = first ? first[2] : -1;
      if (!first) { $("card").innerHTML = ""; return; }                    // 원작처럼 내 유닛을 골라야 버튼이 나옴
      $("card").innerHTML = CARD.map(([k]) => `<button type="button" data-k="${k}" title="${TIP[k]}"><img alt="${TIP[k]}" src="/grp?f=${encodeURIComponent("unit\\cmdbtns\\cmdicons.grp")}&frame=${k === "amove" ? WEAPON_ICON[first[2]] || 230 : ICON[k]}&pal=yellow"></button>`).join("");
      markCard(); return;
    }
    $("card").innerHTML = CARD.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join("");
  }
  $("card").addEventListener("click", e => { const b = e.target.closest("button"); if (b) pressCmd(b.dataset.k); });
  function pressCmd(k) {
    if (!sel.size) return;
    if (k === "stop" || k === "hold") { sendCmd(k); return; }
    mode = k; cv.style.cursor = "cell"; markCard();
  }
  const markCard = () => { $("card").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.k === mode)); if (realOn) setCursor(mode ? "targg" : "arrow"); };
  // 마우스
  const unitAt = (wx, wy, pred) => { if (!cur) return null; let best = null, bd = 1e9; for (const u of cur.u) { if (pred && !pred(u)) continue; const d = Math.hypot(u[3] - wx, u[4] - wy); if (d < 22 / Math.min(1, cam.z) && d < bd) { bd = d; best = u; } } return best; };
  const myTeam = () => (players[ctl.uid] ? players[ctl.uid].team ?? 0 : 0);
  cv.addEventListener("contextmenu", e => e.preventDefault());
  let lastClick = { at: 0, id: null };
  cv.addEventListener("mousedown", e => {
    const [wx, wy] = Wd(e.offsetX, e.offsetY);
    if (e.button === 2) {                                              // 오른쪽 = 스마트 명령: 적이면 공격, 아니면 이동
      if (mode) { mode = null; cv.style.cursor = "crosshair"; markCard(); return; }
      const t = unitAt(wx, wy, u => u[1] !== myTeam());
      if (t) sendCmd("attack", 0, 0, t[0], e.shiftKey); else sendCmd("move", wx, wy, -1, e.shiftKey);
      marks.push({ x: wx, y: wy, at: performance.now(), c: t ? "#ff6b6b" : "#7bd88f" });
      return;
    }
    if (e.button !== 0) return;
    if (mode) {                                                        // 버튼·단축키로 고른 명령을 왼쪽 클릭으로 실행
      const t = unitAt(wx, wy, u => u[1] !== myTeam());
      if (mode === "amove" && t) sendCmd("attack", 0, 0, t[0], e.shiftKey); else sendCmd(mode, wx, wy, -1, e.shiftKey);
      marks.push({ x: wx, y: wy, at: performance.now(), c: mode === "amove" ? "#f4c95d" : "#7bd88f" });
      if (!e.shiftKey) { mode = null; cv.style.cursor = "crosshair"; markCard(); }
      return;
    }
    drag = { x0: e.offsetX, y0: e.offsetY, x1: e.offsetX, y1: e.offsetY, shift: e.shiftKey, ctrl: e.ctrlKey };
  });
  cv.addEventListener("mousemove", e => {
    if (drag) { drag.x1 = e.offsetX; drag.y1 = e.offsetY; } mouse = [e.offsetX, e.offsetY];
    if (realOn) { if (mode) setCursor("targg"); else { const [wx, wy] = Wd(e.offsetX, e.offsetY), u = unitAt(wx, wy); setCursor(!u ? "arrow" : u[1] === myTeam() ? "magg" : "magr"); } }
  });
  let mouse = null;
  cv.addEventListener("mouseleave", () => { mouse = null; });
  addEventListener("mouseup", () => {
    if (!drag || !cur) { drag = null; return; }
    const [ax, ay] = Wd(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1)), [bx, by] = Wd(Math.max(drag.x0, drag.x1), Math.max(drag.y0, drag.y1));
    const click = Math.abs(drag.x1 - drag.x0) < 5 && Math.abs(drag.y1 - drag.y0) < 5;
    if (!drag.shift) sel.clear();
    if (click) {
      const u = unitAt(ax, ay);
      if (u) {
        const now = performance.now(), dbl = lastClick.id === u[0] && now - lastClick.at < 350;
        lastClick = { at: now, id: u[0] };
        if ((dbl || drag.ctrl) && myUnits.has(u[0])) {                   // 더블클릭·Ctrl+클릭 = 화면 안 같은 종류 전부
          const [vx0, vy0] = Wd(0, 0), [vx1, vy1] = Wd(W, H);
          for (const v of cur.u) if (myUnits.has(v[0]) && v[2] === u[2] && v[3] > vx0 && v[3] < vx1 && v[4] > vy0 && v[4] < vy1) sel.add(v[0]);
        } else if (drag.shift && sel.has(u[0])) sel.delete(u[0]);
        else sel.add(u[0]);                                              // 적·편 유닛도 하나는 골라서 정보 보기
      }
    } else {
      for (const u of cur.u) if (myUnits.has(u[0]) && u[3] >= ax && u[3] <= bx && u[4] >= ay && u[4] <= by) { if (sel.size >= 12) break; sel.add(u[0]); }   // 스타처럼 한 번에 12기
    }
    if (sel.size) { SND.sel(); const u = cur.byId.get([...sel][0]); if (u && myUnits.has(u[0])) sfx(u[2], "what", 0.8, 900); }
    drag = null;
  });
  cv.addEventListener("wheel", e => { e.preventDefault(); if (realOn) return; cam.z = Math.max(0.5, Math.min(2, cam.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); }, { passive: false });
  // 미니맵: 누르면 화면 이동, 오른쪽은 이동 명령
  const miniW = (e) => { const r = mini.getBoundingClientRect(), k = (e.clientX - r.left) / r.width, j = (e.clientY - r.top) / r.height; if (realOn && cur && cur.mw) return [k * cur.mw[0], j * cur.mw[1]]; const c = cur ? cur.c : [2048, 2048]; return [c[0] - ARENA + k * 2 * ARENA, c[1] - ARENA + j * 2 * ARENA]; };
  let miniDrag = false;
  mini.addEventListener("contextmenu", e => e.preventDefault());
  mini.addEventListener("mousedown", e => { const [x, y] = miniW(e); if (e.button === 2) sendCmd("move", x, y, -1, e.shiftKey); else { miniDrag = true; cam.x = x; cam.y = y; } });
  addEventListener("mousemove", e => { if (miniDrag) { const [x, y] = miniW(e); cam.x = x; cam.y = y; } });
  addEventListener("mouseup", () => { miniDrag = false; });
  // 키보드 (스타 단축키)
  const keys = new Set();
  addEventListener("keydown", e => {
    if ($("game").style.display !== "block") return;
    if (e.target.tagName === "INPUT") { if (e.key === "Escape") { $("gchat").style.display = "none"; e.target.blur(); } return; }
    keys.add(e.key);
    const k = e.key.toLowerCase();
    if (e.key === "Enter") { $("gchat").style.display = "block"; $("gchatIn").focus(); e.preventDefault(); return; }
    if (e.key === "F10") { e.preventDefault(); if (confirmLeave()) return; }
    if (e.key === "Escape") { mode = null; cv.style.cursor = "crosshair"; markCard(); return; }
    if (/^[1-9]$/.test(e.key)) {
      if (e.ctrlKey) { groups[e.key] = [...sel]; e.preventDefault(); return; }                                // Ctrl+숫자 = 부대 지정
      if (e.shiftKey && groups[e.key]) { groups[e.key].forEach(i => sel.add(i)); return; }
      if (groups[e.key]) {
        sel = new Set(groups[e.key].filter(i => cur && cur.byId.has(i)));
        const now = performance.now();
        if (lastGroupKey.k === e.key && now - lastGroupKey.at < 400) centerOnSel();                             // 두 번 = 그 부대로 화면
        lastGroupKey = { k: e.key, at: now }; SND.sel();
      }
      return;
    }
    if (["m", "s", "a", "p", "h"].includes(k) && !e.ctrlKey) { pressCmd({ m: "move", s: "stop", a: "amove", p: "patrol", h: "hold" }[k]); e.preventDefault(); }
    if (e.key === " ") { centerOnSel(); e.preventDefault(); }
    if (e.key === "F2" && isHost) { setReal(!realOn); e.preventDefault(); }
  });
  addEventListener("keyup", e => keys.delete(e.key));
  function centerOnSel() { const us = [...sel].map(i => cur && cur.byId.get(i)).filter(Boolean); const src = us.length ? us : (cur ? cur.u.filter(u => myUnits.has(u[0])) : []); if (src.length) { cam.x = src.reduce((s, u) => s + u[3], 0) / src.length; cam.y = src.reduce((s, u) => s + u[4], 0) / src.length; } }
  $("gchat").addEventListener("submit", e => { e.preventDefault(); sendChat($("gchatIn")); $("gchat").style.display = "none"; $("gchatIn").blur(); });
  function confirmLeave() { if (isHost) { phase = "lobby"; ctl.setMeta({ phase: "lobby" }); leaveGame(); } else { ctl.leave(); location.reload(); } return true; }
  $("menuBtn").onclick = () => { if (isHost) { phase = "lobby"; ctl.setMeta({ phase: "lobby" }); leaveGame(); } else confirmLeave(); };
  $("quitBtn").onclick = () => { ctl.leave(); location.href = location.pathname; };
  function warn(t) { $("warn").style.display = t ? "block" : "none"; $("warn").textContent = t; }

  // ── 그리기: 직접 그린 모양 (뮤탈 = 박쥐 날개, 커세어 = 원반 + 날개, 스커지 = 작은 화살촉), 색 = 맡은 사람 색
  let colorMap = {}, aiColor = [0, 215];
  function recolor() {
    const used = new Set(), m = {};
    const ps = Object.entries(players).sort((a, b) => ((a[1].team ?? 0) - (b[1].team ?? 0)) || (a[0] < b[0] ? -1 : 1));
    const free = () => COLORS.map((c, i) => hueVal(i)).find(h => !used.has(String(h)));
    for (const [uid, p] of ps) { let h = p.hue; if (h == null || used.has(String(h))) h = free(); used.add(String(h)); m[uid] = h; }
    aiColor = [0, 1].map(t => { const pref = t ? 215 : 0; const h = used.has(String(pref)) ? free() : pref; used.add(String(h)); return h; });
    colorMap = m;
  }
  function ownerHue(u) { for (const [uid, ids] of Object.entries(own)) if (ids.includes(u[0])) return colorMap[uid] ?? (players[uid] ? players[uid].hue : null); return aiColor[u[1]]; }
  const ctxRef = { ctx: null };
  function shape(kind, col) {
    const ctx = ctxRef.ctx || mainCtx;
    ctx.fillStyle = col; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.lineWidth = 1.4; ctx.beginPath();
    if (kind === 60) { ctx.ellipse(0, 0, 12, 8, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-7, -16); ctx.lineTo(-2, 0); ctx.lineTo(-7, 16); ctx.closePath(); ctx.globalAlpha = .85; }
    else if (kind === 47) { ctx.moveTo(10, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath(); }
    else { ctx.moveTo(15, 0); ctx.quadraticCurveTo(0, -22, -14, -17); ctx.lineTo(-5, -3); ctx.lineTo(-15, 0); ctx.lineTo(-5, 3); ctx.lineTo(-14, 17); ctx.quadraticCurveTo(0, 22, 15, 0); }
    ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(6, 0, 2.2, 0, 7); ctx.fill();          // 눈·조종석
  }
  // 우주 바닥 별 (한 번 만들어 두고 반복)
  const stars = Array.from({ length: 260 }, () => [Math.random() * 4096, Math.random() * 4096, Math.random() * 1.4 + .3, Math.random()]);
  function draw() {
    requestAnimationFrame(draw);
    if ($("game").style.display !== "block" || !W) return;
    const now = performance.now();
    // 화면 이동: 방향키 · 화면 가장자리 (스타처럼)
    const sp = 14 / cam.z;
    if (keys.has("ArrowLeft") || (mouse && mouse[0] < 6)) cam.x -= sp; if (keys.has("ArrowRight") || (mouse && mouse[0] > W - 6)) cam.x += sp;
    if (keys.has("ArrowUp") || (mouse && mouse[1] < 6)) cam.y -= sp; if (keys.has("ArrowDown") || (mouse && mouse[1] > H - 6)) cam.y += sp;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (realOn) { cam.z = classicScale(); sendCam(); ctx.clearRect(0, 0, W, H); }
    else { ctx.fillStyle = "#04060a"; ctx.fillRect(0, 0, W, H); }
    if (!realOn) for (const [x, y, r, p] of stars) { const sx = ((x - cam.x * (0.3 + p * 0.3)) % 4096 + 4096) % 4096 * (W / 4096) * 2.2 % W, sy = ((y - cam.y * (0.3 + p * 0.3)) % 4096 + 4096) % 4096 * (H / 4096) * 2.2 % H; ctx.fillStyle = `rgba(200,220,255,${0.25 + p * 0.5})`; ctx.fillRect(sx, sy, r, r); }
    // 전장 바닥판 (우주 플랫폼 느낌의 큰 격자)
    if (cur && !realOn) {
      const [x0, y0] = S(cur.c[0] - ARENA, cur.c[1] - ARENA), sz = 2 * ARENA * cam.z;
      ctx.fillStyle = "rgba(40,55,70,.18)"; ctx.fillRect(x0, y0, sz, sz);
      ctx.strokeStyle = "rgba(110,140,170,.12)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 2 * ARENA; i += 128) { const [a] = S(cur.c[0] - ARENA + i, 0), [, b] = S(0, cur.c[1] - ARENA + i); ctx.moveTo(a, y0); ctx.lineTo(a, y0 + sz); ctx.moveTo(x0, b); ctx.lineTo(x0 + sz, b); }
      ctx.stroke(); ctx.strokeStyle = "rgba(216,178,90,.35)"; ctx.strokeRect(x0, y0, sz, sz);
    }
    if (!cur) { ctx.fillStyle = "#8796a5"; ctx.font = "16px system-ui"; ctx.textAlign = "center"; ctx.fillText("엔진에서 첫 화면을 받는 중…", W / 2, H / 2); return; }
    const t = Math.min(1.25, (now - curAt) / gap), pos = new Map();
    for (const u of cur.u) { const o = prev && prev.byId.get(u[0]); pos.set(u[0], o ? [o[3] + (u[3] - o[3]) * t, o[4] + (u[4] - o[4]) * t] : [u[3], u[4]]); }
    marks = marks.filter(m => now - m.at < 500);
    for (const m of marks) { const [x, y] = S(m.x, m.y), k = (now - m.at) / 500; ctx.strokeStyle = m.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 14 * (1 - k * .6), 7 * (1 - k * .6), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    // 선택 원 (내 것 초록, 같은 편 노랑, 적 빨강) — 스타처럼 유닛 아래 납작한 원
    for (const id of sel) { const u = cur.byId.get(id), p = pos.get(id); if (!u || !p) continue; const [x, y] = S(...p); ctx.strokeStyle = myUnits.has(id) ? "#3cff6a" : u[1] === myTeam() ? "#f4e05d" : "#ff4b4b"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 10 * cam.z, 17 * cam.z, 8 * cam.z, 0, 0, 7); ctx.stroke(); }
    flashes = flashes.filter(f => now - f.at < 160);
    if (!realOn) for (const f of flashes) { const a = pos.get(f.a), b = pos.get(f.t); if (!a || !b) continue; const [x1, y1] = S(...a), [x2, y2] = S(...b); const g = ctx.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, "rgba(160,255,140,0)"); g.addColorStop(1, "rgba(200,255,170,.95)"); ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.fillStyle = "rgba(230,255,200,.9)"; ctx.beginPath(); ctx.arc(x2, y2, 4, 0, 7); ctx.fill(); }
    // 그림자 → 유닛 (공중 유닛이라 그림자가 아래로 떨어져 보이게)
    if (!realOn) for (const u of cur.u) { const [x, y] = S(...pos.get(u[0])); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(x + 6 * cam.z, y + 22 * cam.z, 11 * cam.z, 5 * cam.z, 0, 0, 7); ctx.fill(); }
    for (const u of cur.u) {
      const [x, y] = S(...pos.get(u[0])), hue = ownerHue(u);
      if (!realOn) { ctx.save(); ctx.translate(x, y); ctx.scale(cam.z, cam.z); ctx.rotate(u[9]); shape(u[2], hue == null ? "#999" : colorOf(hue)); ctx.restore(); }
      if (sel.has(u[0]) || mouse && Math.hypot(mouse[0] - x, mouse[1] - y) < 20) {          // 체력 칸 (스타처럼 칸으로 나뉜 막대)
        const hp = u[5] / Math.max(1, u[7]), sh = u[8] ? u[6] / u[8] : 0, bw = 30 * cam.z, cells = 8, y0 = y + 20 * cam.z;
        for (let i = 0; i < cells; i++) { const on = (i + 1) / cells <= hp + 1e-6 || (i / cells < hp); ctx.fillStyle = on ? (hp > .66 ? "#2fd34f" : hp > .33 ? "#e6d23a" : "#e2412f") : "#202a20"; ctx.fillRect(x - bw / 2 + i * bw / cells, y0, bw / cells - 1, 3); }
        if (u[8]) { ctx.fillStyle = "#3a8cff"; ctx.fillRect(x - bw / 2, y0 - 4, bw * sh, 2); }
      }
    }
    if (drag) { ctx.strokeStyle = "#3cff6a"; ctx.lineWidth = 1; ctx.strokeRect(drag.x0, drag.y0, drag.x1 - drag.x0, drag.y1 - drag.y0); }
    drawMini(pos); drawSel(); drawTop();
  }
  let miniImg = null;
  function drawMini(pos) {
    if (realOn && cur.mw) return drawMiniWhole(pos);
    const m = mini.width, c = cur.c, k = m / (2 * ARENA);
    mctx.fillStyle = "#03060a"; mctx.fillRect(0, 0, m, m);
    if (realOn) { if (!miniImg) { miniImg = new Image(); miniImg.src = "/minimap"; } if (miniImg.complete && miniImg.naturalWidth) mctx.drawImage(miniImg, 0, 0, m, m); }   // 원작처럼 지형이 보이는 미니맵
    mctx.strokeStyle = "rgba(110,140,170,.25)"; mctx.strokeRect(1, 1, m - 2, m - 2);
    for (const u of cur.u) { const [x, y] = pos.get(u[0]), h = ownerHue(u); mctx.fillStyle = h == null ? "#999" : colorOf(h, 60); mctx.fillRect((x - c[0] + ARENA) * k - 3, (y - c[1] + ARENA) * k - 3, 6, 6); }
    const [vx0, vy0] = Wd(0, 0), [vx1, vy1] = Wd(W, H);
    mctx.strokeStyle = "#fff"; mctx.lineWidth = 2; mctx.strokeRect((vx0 - c[0] + ARENA) * k, (vy0 - c[1] + ARENA) * k, (vx1 - vx0) * k, (vy1 - vy0) * k);
  }
  function drawMiniWhole(pos) {
    const m = mini.width, [MW, MH] = cur.mw, kx = m / MW, ky = m / MH;
    mctx.fillStyle = "#000"; mctx.fillRect(0, 0, m, m);
    if (!miniImg) { miniImg = new Image(); miniImg.src = "/minimap?" + Date.now(); }
    if (miniImg.complete && miniImg.naturalWidth) mctx.drawImage(miniImg, 0, 0, m, m);
    for (const u of cur.u) { const [x, y] = pos.get(u[0]), h = ownerHue(u); mctx.fillStyle = h == null ? "#999" : colorOf(h, 55); mctx.fillRect(x * kx - 2, y * ky - 2, 4, 4); }
    const [vx0, vy0] = Wd(0, 0), [vx1, vy1] = Wd(W, H);
    mctx.strokeStyle = "#fff"; mctx.lineWidth = 2; mctx.strokeRect(vx0 * kx, vy0 * ky, (vx1 - vx0) * kx, (vy1 - vy0) * ky);
  }
  let selKey = "";
  function drawSel() {
    const us = [...sel].map(i => cur.byId.get(i)).filter(Boolean);
    const key = us.map(u => u[0] + ":" + u[5] + ":" + u[6]).join(",");
    if (key === selKey) return; selKey = key;
    const hpCol = u => { const r = (u[5] + u[6]) / Math.max(1, u[7] + u[8]); return r > .66 ? "#2fd34f" : r > .33 ? "#e6d23a" : "#e2412f"; };
    const icon = (u, s) => { const c = document.createElement("canvas"); c.width = c.height = s * 2; const g = c.getContext("2d"); g.scale(2, 2); g.translate(s / 2, s / 2); g.rotate(-Math.PI / 2); g.scale(s / 40, s / 40); const old = ctx; return [c, g]; };
    if (realOn) { drawSelClassic(us, hpCol); return; }
    if (!us.length) { $("selp").innerHTML = `<span class="small">유닛을 고르세요 · 드래그로 여러 기 · 더블클릭 = 같은 종류 · Ctrl+숫자 = 부대</span>`; return; }
    if (us.length === 1) {
      const u = us[0], name = TNAME[u[2]] || "유닛", own = myUnits.has(u[0]) ? "내 유닛" : u[1] === myTeam() ? "같은 편" : "적";
      $("selp").innerHTML = `<div class="big"><canvas class="w" id="bigIcon" width="128" height="128" style="width:64px;height:64px;background:#0a120c;border-color:${hpCol(u)}"></canvas><div><b>${name}</b> <span class="small">${own}</span><br><span style="color:${hpCol(u)}">${u[5]} / ${u[7]}</span>${u[8] ? ` · <span style="color:#3a8cff">보호막 ${u[6]} / ${u[8]}</span>` : ""}</div></div>`;
      paintIcon($("bigIcon"), u, hpCol(u));
      return;
    }
    $("selp").innerHTML = `<div class="grid">${us.slice(0, 12).map(u => `<canvas class="w" width="80" height="80" data-id="${u[0]}" title="${TNAME[u[2]] || ""} ${u[5]}/${u[7]}" style="background:#0a120c;border-color:${hpCol(u)}"></canvas>`).join("")}</div>`;
    $("selp").querySelectorAll("canvas[data-id]").forEach(c => paintIcon(c, cur.byId.get(+c.dataset.id), hpCol(cur.byId.get(+c.dataset.id))));
  }
  // 선택 칸 그림: 스타의 와이어프레임처럼 유닛 모양을 체력 색으로
  function paintIcon(c, u, col) {
    if (!c || !u) return;
    const g = c.getContext("2d"), z = c.width / 40, old = ctxRef.ctx;
    g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(c.width / 2, c.height / 2); g.scale(z * .9, z * .9); g.rotate(-Math.PI / 2);
    ctxRef.ctx = g; shape(u[2], col); ctxRef.ctx = old; g.restore();
  }
  let porType = -1;
  function drawSelClassic(us, hpCol) {
    const firstMine = us.find(u => myUnits.has(u[0]));
    if ((firstMine ? firstMine[2] : -1) !== cardType) buildCard();
    const pt = us.length ? us[0][2] : -1, pv = $("portrait");
    if (pt !== porType) { porType = pt; if (pt >= 0) { pv.src = "/portrait?u=" + pt; pv.removeAttribute("data-off"); pv.play().catch(() => {}); } else { pv.setAttribute("data-off", ""); pv.removeAttribute("src"); } }
    if (!us.length) { $("selp").innerHTML = ""; return; }
    const WF = "unit\\wirefram\\wirefram.grp", GW = "unit\\wirefram\\grpwire.grp";
    if (us.length === 1) {
      const u = us[0];
      $("selp").innerHTML = `<div class="ow"><canvas width="64" height="64"></canvas><div><b>${TNAME[u[2]] || "유닛"}</b><br><span style="color:${hpCol(u)}">${u[5]}/${u[7]}</span>${u[8] ? `<br><span style="color:#5aa0ff">${u[6]}/${u[8]}</span>` : ""}</div></div>`;
      tinted($("selp").querySelector("canvas"), grpImg(WF, u[2], "white"), hpCol(u));
      return;
    }
    $("selp").innerHTML = `<div class="og">${us.slice(0, 12).map(u => `<canvas width="32" height="32" data-id="${u[0]}" title="${TNAME[u[2]] || ""} ${u[5]}/${u[7]}"></canvas>`).join("")}</div>`;
    $("selp").querySelectorAll("canvas[data-id]").forEach(c => { const u = cur.byId.get(+c.dataset.id); tinted(c, grpImg(GW, u[2], "white"), hpCol(u)); });
  }
  $("selp").addEventListener("click", e => { const w = e.target.closest("[data-id]"); if (w) { sel = new Set([+w.dataset.id]); selKey = ""; } });
  let topAt = 0;
  function drawTop() {
    const now = performance.now(); if (now - topAt < 250) return; topAt = now;
    const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    const g = avg(stGaps), jit = stGaps.length ? Math.sqrt(avg(stGaps.map(x => (x - g) ** 2))) : 0;
    const a = cur.u.filter(u => u[1] === 0), b = cur.u.filter(u => u[1] === 1);
    const net = isHost ? `방장 · 친구 ${ctl.peers().length}명 (직접 ${ctl.peers().filter(p => p[1]).length})` : `${ctl.p2p ? "직접 연결" : "Firebase 경유"} · 핑 ${Math.round(ping)}ms`;
    $("top").innerHTML = `${Math.floor(cur.f / 23.81 / 60)}:${String(Math.floor(cur.f / 23.81) % 60).padStart(2, "0")} · 팀1 ${a.length} vs 팀2 ${b.length}<br>${net}<br>화면 받는 간격 ${Math.round(g)}±${Math.round(jit)}ms · 명령→반응 ${reacts.length ? Math.round(avg(reacts)) + "ms" : "-"}`;
  }
  requestAnimationFrame(draw);
  window.__sc = { frame: () => draw(), drawSel: () => { selKey = ""; drawSel(); }, get cur() { return cur; }, get phase() { return phase; }, get own() { return own; }, get sel() { return sel; }, sendCmd, get stats() { return { stGaps, reacts, ping }; } };   // 시험·점검용
})();

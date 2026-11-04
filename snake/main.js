/* 지렁이 대결 — 화면 연결: 메뉴, 혼자, 친구랑(common/arena-ui.js · 방장이 계산하고 손님은 받은 상태로 그림), 입력(PC·휴대폰), 순위표, 🏆 랭킹, 감지기 패널, 헬퍼, 그리고 헬퍼가 읽는 window.game */
(() => {
  const { C } = SNK;
  const $ = id => document.getElementById(id);
  let HZ = 14;                                                   // 1초에 게임 계산 횟수 (메뉴 '속도': 10 · 14 · 20). 규칙·AI는 같고 빠르기만 다름
  let tickMs = 1000 / 14;                                        // 참가자: 방장의 한 틱 길이
  let BRAINS = null, mode = "menu", sim = null, meId = "me", net = null, tickTimer = null, reportTimer = null;
  const input = { target: null, boost: false, turn: 0, respawn: 0, _own: false };
  let paused = false;
  const remote = { snakes: new Map(), food: [] };                 // 참가자 화면용
  let clientAC = null;
  const behaviors = new Map();                                   // 지렁이별 행동 감지 (혼자/방장이 계산)
  const settings = { ai: { level: "hard", count: 5 }, helper: "none", hue: 48, gameMode: "free", hz: 14 };
  const LOG = GLOG(() => NET.db(), "snake");                     // 관리자만 읽는 게임 기록
  const pingS = Samples(), gapS = Samples(); let reconnects = 0;
  const snapshot = () => sim ? sim.snakes.map(s => ({ n: s.name, k: s.kind, len: Math.floor(s.length), best: Math.floor(s.best || s.length), kills: s.kills, deaths: s.deaths, h: s.helper ? 1 : 0 })) : [];
  let roomCode = null, reportsFor = null, room = null;           // room = 이 방의 설정(방장이 대기실에서 고른 것)
  const matchInfo = () => { const a = mode === "solo" ? settings.ai : (room && room.ai) || {}; return { mode: sim ? sim.mode : settings.gameMode, hz: HZ, ai: `${a.level}×${a.count}`, people: sim ? sim.snakes.filter(s => s.kind === "human").map(s => s.name).join(", ") : "" }; };

  const brainsP = fetch("brains.json?v=v2a-2m").then(r => r.json()).then(b => { BRAINS = b; });

  // ── 이름 = 게임 사이트 공통 이름 (common/me.js, 프로필은 아케이드에서). 혼자 하기는 없어도 '나'로 되고, 처음 시작할 때 한 번 물음 (랭킹에 올라가게 · 친구랑은 ArenaUI 가 물음)
  const myName = () => ((window.GME && GME.me && GME.me.name) || "").slice(0, 12);
  const curName = () => myName() || (window.ArenaUI && ArenaUI.me && ArenaUI.me.name) || "나";
  async function askName() { await NET.init(); await GME.ensure(NET.db()); recLoad(); return myName(); }

  // ── 메뉴 선택지
  try { const h = localStorage.getItem("snake-hue"); if (h != null) settings.hue = Number(h); } catch (e) {}
  // 내 색 고르기 (기억해 둠)
  const HUES = [[48, "노랑"], [25, "주황"], [0, "빨강"], [330, "분홍"], [285, "보라"], [230, "파랑"], [195, "하늘"], [165, "청록"], [120, "초록"], [85, "연두"]];
  const swatches = attr => HUES.map(([h, n]) => `<button type="button" class="sw" role="radio" ${attr}="${h}" aria-label="${n}" title="${n}" aria-checked="${h === settings.hue}" style="background:radial-gradient(circle at 38% 35%, hsl(${h},85%,72%), hsl(${h},80%,50%) 55%, hsl(${h},75%,28%))"></button>`).join("");
  $("colors").innerHTML = swatches("data-h");
  const markColor = () => $("colors").querySelectorAll(".sw").forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.h) === settings.hue)));
  function setHue(h) { settings.hue = h; try { localStorage.setItem("snake-hue", settings.hue); } catch (e) {} markColor(); }
  $("colors").querySelectorAll(".sw").forEach(b => b.addEventListener("click", () => setHue(Number(b.dataset.h))));
  markColor();
  const seg = (id, key, cast = v => v) => $(id).querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => {
    $(id).querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    key(cast(b.dataset.v));
  }));
  seg("aiLevel", v => { settings.ai.level = v; recFill(); });
  seg("aiCount", v => settings.ai.count = v, Number);
  seg("helperSel", v => { settings.helper = v; markHelper(); });
  function markHelper() { $("helperSel").querySelectorAll("[data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === (settings.helper === "none" ? "none" : "on")))); }
  markHelper();
  const MODE_HELP = { free: "언제든 들어오고 나가는 기본 방식이에요.", round: "3분 동안 가장 길게 자란 지렁이가 1등. 죽어도 다시 시작할 수 있어요.",
    royale: "20초 뒤부터 경기장이 점점 줄어요(밖으로 나가면 탈락). 부활 없이 마지막까지 살아남으면 승리!" };
  seg("speedSel", v => settings.hz = v, Number);
  seg("gameMode", v => { settings.gameMode = v; $("modeHelp").textContent = MODE_HELP[v]; });
  const msg = t => { $("msg").textContent = t; };

  // ── 🏆 랭킹 (common/rank.js): 판·승패는 여기서만 읽음 — 못 읽으면 숫자 없이
  const recLine = t => { try { return window.GRank ? GRank.line("snake", t) : ""; } catch (e) { return ""; } };
  function recFill() {
    const all = recLine(), t = recLine(settings.ai.level);
    $("myRec").textContent = all ? `🏆 내 기록 ${all}${t ? ` · ${AI_NAME[settings.ai.level] || ""} 상대 ${t}` : ""}` : "";
  }
  const recLoad = () => { try { if (window.GRank) GRank.mine("snake").then(recFill, () => {}); } catch (e) {} };
  addEventListener("grank", e => { if (e.detail && e.detail.game === "snake") recFill(); });
  $("rankBtn").onclick = () => { if (window.GRank) try { GRank.open("snake"); } catch (e) {} };
  // 끝이 있는 판(라운드·배틀로얄)만, 판이 끝날 때 각자 한 번: 1등 = 승. 자유 모드 · 도중에 나간 판 · 구경 · 헬퍼 켠 판은 안 셈
  let rankedAt = null;
  function rankReport(g) {
    try {
      if (!window.GRank || g.mode === "free" || settings.helper !== "none") return;
      const res = g.res || [], rk = res.findIndex(r => r.id === meId);
      if (rk < 0) return;
      const key = mode === "solo" ? sim : `snake.rk.${roomCode}.${round}`;
      if (rankedAt === key) return; rankedAt = key;
      if (mode !== "solo") try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) {}   // 결과 창에서 새로 고침해도 한 번만
      const won = rk === 0, score = res[rk].len, pl = mode === "solo" ? {} : (net && net.players) || {};
      const opp = res.map((r, i) => r.id !== meId && pl[r.id] ? { uid: r.id, res: i > rk ? "w" : "l" } : null).filter(Boolean);   // 친구마다 '나'의 결과 (순위가 앞이면 승)
      if (opp.length) GRank.result("snake", { mode: "friend", res: won ? "w" : "l", beat: won ? opp.length : 0, score, opp });
      else if (res.length > 1) GRank.result("snake", { mode: "ai", tier: (mode === "solo" ? settings.ai : (room && room.ai) || {}).level, res: won ? "w" : "l", beat: won ? res.length - 1 : 0, score });
    } catch (e) {}
  }

  function aiList(ai) {
    const n = ai.count, lv = ai.level;
    const mix = ["hard", "mid", "rule", "easy", "raw", "hard", "rule", "mid"];
    return Array.from({ length: n }, (_, i) => lv === "mix" ? mix[i % mix.length] : lv);
  }
  function addAIs(s, ai) {
    aiList(ai).forEach((k, i) => { const K = SNK.AI_KINDS[k]; s.add("ai" + i, k, `${K.name} ${i + 1}`, (K.hue + i * 23) % 360); });
  }

  // ── 시작
  function enterGame() {
    $("menu").hidden = true; ["lb", "me", "topbtn"].forEach(id => $(id).hidden = false); document.body.classList.add("playing");
    $("boost").hidden = !matchMedia("(pointer: coarse)").matches;
    RND.resize();
    clientAC = AC.client(input);
    window.__ac = {                                                       // 시험용: 콘솔에서 감지 점수를 바로 읽는다
      get sig() { return clientAC.summary().sig; },
      get score() { const d = !!(settings.helper && settings.helper !== "none"); return AC.total(clientAC.summary().sig, { declared: d }); },
      get verdict() { return AC.verdict(this.score); },
      log: () => clientAC.summary().log
    };
    if (settings.helper !== "none") loadHelper(settings.helper === "on" ? "see" : settings.helper);
    NET.init().catch(() => {});
  }
  // 혼자 탭에서 고른 그대로 바로 시작
  function clickStart() {
    if (myName() || !window.Arena || Arena.mock) return startSolo();
    askName().catch(() => {}).then(() => { if (mode === "menu") startSolo(); });   // 처음이면 이름부터 (닫아도 '나'로 함)
  }
  function startSolo() {
    if (!BRAINS) return msg("AI 불러오는 중… 잠시 뒤 다시");
    msg("");
    mode = "solo"; meId = "me"; input.respawn = 0; respawnedAtDeaths = 0;
    HZ = settings.hz; sim = new SNK.Sim(BRAINS, settings.gameMode); sim.hz = HZ;
    const me = sim.add("me", "human", curName(), settings.hue); me.helper = settings.helper !== "none";
    sim.inputs.me = input;
    addAIs(sim, settings.ai); enterGame(); $("myAc").hidden = false;
    clearInterval(tickTimer); tickTimer = setInterval(stepSim, 1000 / HZ);
    startReports("solo");
    NET.init().then(() => { if (mode !== "solo" || !NET.db() || Arena.GUEST) return; LOG.start({ room: "solo", hostName: curName(), kind: "혼자" }, NET.uid); LOG.joined(NET.uid, { name: curName(), role: "혼자" }); LOG.matchStart(matchInfo()); }).catch(() => {});
  }

  // ── 친구랑: 방 목록·대기실·제목·비밀번호·채팅·초대 링크·인원·재접속은 ArenaUI (volley 와 같음)
  //    방장이 판을 계산해 상태를 보내고(stateMsg·syncMsg), 손님은 입력만 보냄. 8명까지, 들어온 사람 수로 시작 (늦게 온 사람도 바로 같이, 배틀로얄 20초 뒤는 구경 → 다음 판부터)
  const MODE_NAME = { free: "자유", round: "라운드 3분", royale: "배틀로얄" }, HZ_NAME = { 10: "느리게", 14: "보통", 20: "빠르게" };
  const AI_NAME = { raw: "학습 전", rule: "규칙 봇", easy: "초급", mid: "중급", hard: "상급", mix: "섞어서" };
  const cfg = () => ({ m: settings.gameMode, hz: settings.hz, ai: { level: settings.ai.level, count: settings.ai.count } });
  const cfgLabel = c => c ? `${MODE_NAME[c.m] || c.m} · ${HZ_NAME[c.hz] || c.hz} · AI ${c.ai && c.ai.count ? AI_NAME[c.ai.level] + " " + c.ai.count + "마리" : "없음"}` : "";
  const describe = (n, c) => { const a = c && c.ai && c.ai.count ? `AI ${c.ai.count}마리` : ""; return n <= 1 ? `혼자서도 시작돼요${a ? " (" + a + ")" : ""} · 시작한 뒤에 온 친구도 같이 해요` : `${n}명${a ? " + " + a : ""}`; };
  const myMe = () => ({ hue: settings.hue, helper: settings.helper !== "none" });
  function pushMe() { const n = window.ArenaUI && ArenaUI.net; if (n) Promise.resolve(n.setMe(myMe())).catch(() => {}); }
  let pushedTo = null;
  // 대기실 ⚙️ 칸: 방장 설정(속도·방식·AI — 손님은 보기만) + 내 색·헬퍼(각자)
  function friendSettings(el, c, canEdit, update) {
    const ai = c.ai || { level: "hard", count: 5 };
    const b = (on, k, v, t) => `<button type="button" class="arn-btn" data-${k}="${v}" ${canEdit ? "" : "disabled"} style="flex:1 1 ${k === "ain" ? 20 : 28}%;padding:9px 6px;font-size:14px;${on ? "background:var(--accent,#10b981);color:#fff" : ""}">${t}</button>`;
    const row = (label, html) => `<div class="arn-row" style="flex-wrap:wrap"><span class="arn-soft" style="flex:1 0 100%">${label}</span>${html}</div>`;
    el.innerHTML = row("속도", Object.entries(HZ_NAME).map(([v, t]) => b(+v === (c.hz || 14), "hz", v, t)).join(""))
      + row("게임 방식", Object.entries(MODE_NAME).map(([v, t]) => b(v === (c.m || "free"), "mode", v, t)).join(""))
      + row("AI 상대", Object.entries(AI_NAME).map(([v, t]) => b(v === ai.level, "ailv", v, t)).join(""))
      + row("AI 마리 수", [0, 3, 5, 8].map(v => b(v === (ai.count || 0), "ain", v, v)).join(""))
      + row("내 색 <span style=\"font-size:12px\">(각자 고름)</span>", `<div class="swatches">${swatches("data-myhue")}</div>`)
      + `<label class="arn-row" style="justify-content:space-between;font-size:14px;gap:10px"><span>🧪 헬퍼 켜기 <span class="arn-soft" style="font-size:12px">(각자 · 이름 앞에 🧪 · 랭킹에 안 셈)</span></span><input type="checkbox" data-myhelper ${settings.helper !== "none" ? "checked" : ""} style="width:22px;height:22px;flex:none"></label>`;
    el.onclick = e => {
      const x = e.target.closest("button"); if (!x) return;
      if (x.dataset.myhue != null) { setHue(Number(x.dataset.myhue)); el.querySelectorAll("[data-myhue]").forEach(s => s.setAttribute("aria-checked", String(Number(s.dataset.myhue) === settings.hue))); pushMe(); return; }
      if (!canEdit) return;
      if (x.dataset.hz) update({ hz: +x.dataset.hz });
      else if (x.dataset.mode) update({ m: x.dataset.mode });
      else if (x.dataset.ailv) update({ ai: { ...ai, level: x.dataset.ailv } });
      else if (x.dataset.ain != null) update({ ai: { ...ai, count: +x.dataset.ain } });
    };
    el.onchange = e => { if (e.target.matches("[data-myhelper]")) { settings.helper = e.target.checked ? "on" : "none"; markHelper(); pushMe(); } };
    if (pushedTo !== ArenaUI.net) { pushedTo = ArenaUI.net; pushMe(); }   // 방에 들어오면 내 색·헬퍼를 방장에게 (ArenaUI 는 이름만 앎)
  }
  function openFriend() {
    if (!window.ArenaUI) return msg("친구랑 모듈을 불러오지 못했어요");
    ArenaUI.open({
      game: "snake", title: "🐍 지렁이 대결", max: 8, min: 1, describe,
      settings: { defaults: cfg(), label: cfgLabel, render: friendSettings },
      onStart: ctx => startOnline(ctx),
      onLobby: () => stopOnline(),
      onLeave: () => { if (mode === "host" || mode === "client") return backToMenu(); LOG.close(); logRoom = null; roomCode = null; releaseNet(); },
    });
  }
  $("tabFriend").onclick = openFriend;

  let netOffs = [], netN = 0, round = 0, frozen = false, logRoom = null, overSent = false;
  const ready = new Set(), prevHead = new Map();                 // ready = 판 사이 ✋ 준비한 사람
  const findSnake = id => sim && sim.snakes.find(s => s.id === id);
  function addGuest(s, uid, p) { const x = s.add(uid, "human", p.name || "친구", p.hue ?? 200); x.helper = !!p.helper; return x; }
  function releaseNet() { netOffs.splice(0).forEach(f => { try { f(); } catch (e) {} }); net = null; }
  function bindNet(n, role) {
    if (net === n) return;
    releaseNet();
    net = n; meId = n.uid; roomCode = n.code; round = 0; ready.clear(); reconnects = 0;
    const ON = (ev, fn) => { const off = n.on(ev, fn); if (typeof off === "function") netOffs.push(off); };
    ON("conn", (c, why) => { if (!c) reconnects++; connBanner(c ? "" : (role === "host" ? "인터넷 연결이 끊겼어요" : why || "연결이 끊겼어요") + " · 다시 연결하는 중…"); });
    if (role === "host") {
      ON("msg", onGuestMsg);
      ON("join", (uid, p) => { if (mode === "host" && sim && !sim.over && !findSnake(uid)) addGuest(sim, uid, p); });
      ON("leave", uid => { if (sim) { sim.remove(uid); delete sim.inputs[uid]; } behaviors.delete(uid); ready.delete(uid); });
      ON("players", v => {                                               // 대기실·게임 중에 바꾼 이름·색·헬퍼
        for (const [uid, p] of Object.entries(v || {})) { const s = uid !== meId && findSnake(uid); if (s) { s.helper = !!p.helper; if (p.name) s.name = p.name; if (p.hue != null) s.hue = p.hue; } }
        drawReady();
      });
    } else {
      ON("msg", onHostMsg);
      ON("meta", v => { if (v && v.log && NET.db()) LOG.attach(v.log); });
      ON("players", () => drawReady());
    }
  }
  async function startOnline(ctx) {
    bindNet(ctx.net, ctx.role);
    room = ctx.cfg || cfg();
    pushMe();
    if (ctx.role !== "host") return clientPlay();
    if (!BRAINS) await brainsP.catch(() => {});
    if (ArenaUI.net !== ctx.net || !ArenaUI.playing) return;
    if (!BRAINS) { ArenaUI.toLobby(); return; }
    hostStartGame();
  }
  // 방장: 이번 판 만들기 — 방에 있는 사람 모두 + AI (판마다 숫자 하나씩 올라감: 손님이 새 판을 알아챔)
  function makeRoundSim(simMode, inputs) {
    const next = new SNK.Sim(BRAINS, simMode), pl = net.players || {}; next.hz = HZ; next.inputs = inputs;
    inputs[meId] = input;
    const me = next.add(meId, "human", (pl[meId] && pl[meId].name) || curName(), settings.hue); me.helper = settings.helper !== "none";
    for (const [uid, p] of Object.entries(pl)) if (uid !== meId) addGuest(next, uid, p);
    addAIs(next, room.ai || settings.ai);
    round++; behaviors.clear(); respawnedAtDeaths = 0; ready.clear(); netN = 0; overSent = false; prevHead.clear();
    return next;
  }
  function hostStartGame() {
    mode = "host"; meId = net.uid; HZ = room.hz || 14; input.respawn = 0;
    sim = makeRoundSim(room.m || "free", {});
    logMatchStart();
    enterGame(); showRoom(roomCode, true);
    clearInterval(tickTimer); tickTimer = setInterval(stepSim, 1000 / HZ);
    if (reportsFor !== roomCode) startReports(roomCode);
    netTick();
  }
  // 방마다 기록 세션 하나: 판 결과·연결 품질 (참가자·채팅은 ArenaUI 공통 기록 세션에 있어 여기엔 안 씀 — 관리자 '사람' 표에 방이 두 번 세지지 않게)
  function logMatchStart() {
    if (!NET.db() || Arena.GUEST) return;
    try {
      if (logRoom !== roomCode) {
        logRoom = roomCode;
        const sid = LOG.start({ room: roomCode, hostName: curName(), kind: "친구랑" }, meId);
        Promise.resolve(net.setMeta({ log: sid })).catch(() => {});      // 손님이 연결 품질을 씀
      }
      LOG.matchStart(matchInfo());
    } catch (e) {}
  }
  // 방장: 같은 방에서 다음 판 (✋ 준비 뒤 · '안 기다리고' · 멈춤 창 '새 게임')
  function hostNextRound() {
    if (mode !== "host" || !sim) return;
    if (LOG.inMatch) LOG.matchEnd({ results: snapshot(), final: sim.results || null });
    sim = makeRoundSim(sim.mode, sim.inputs);
    stopSpectate(); $("results").hidden = true; $("dead").hidden = true;
    logMatchStart();
    netTick();
  }
  // 대기실로 (ArenaUI 가 모두를 대기실로 되돌림): 게임 화면 정리. 방에서는 안 나감
  function stopOnline() {
    if (LOG.inMatch) LOG.matchEnd({ results: snapshot(), final: sim && sim.results || null, aborted: !!sim && !sim.over && sim.mode !== "free" });
    clearInterval(tickTimer); clearInterval(reportTimer); reportsFor = null;
    mode = "menu"; sim = null; behaviors.clear(); paused = false; frozen = false;
    resetRemote(); hideGameHud(); connBanner(""); $("menu").hidden = false;
  }
  function clientPlay() {
    mode = "client"; meId = net.uid; input.respawn = 0; upLast = "";
    resetRemote();
    enterGame(); showRoom(roomCode, false);
    clearInterval(tickTimer); tickTimer = setInterval(() => { clientAC.onStep(performance.now()); sendInput(); }, 50);
    if (reportsFor !== roomCode) startReports(roomCode);
    net.send({ t: "hi" }, true);                                         // 지금 판을 바로 받음 (재접속·늦게 온 사람도)
  }
  function resetRemote() {
    stateK = -1; remote.snakes.clear(); remote.food = []; remote.g = null; respawnedAtDeaths = 0; lastStateAt = 0; lastHeardAt = 0;
    ready.clear(); stopSpectate(); $("results").hidden = true; $("dead").hidden = true;
  }

  // ── 보내는 것 (방장): 매 틱 상태(늦으면 버리는 빠른 통로) + 30틱마다 전체 맞춤(꼭 도착 통로)
  const r2 = v => Math.round(v * 100) / 100;
  function stateMsg(withFood = true) {
    const s = sim.snakes.map(x => { const a = prevHead.get(x.id) || x.head;
      return [x.id, r2(a[0]), r2(a[1]), r2(x.head[0]), r2(x.head[1]), r2(x.ang), Math.round(x.length * 10), x.alive ? 1 : 0, x.boosting ? 1 : 0, x.deaths, x.kills, x.prot ? 1 : 0]; });
    const fd = withFood ? [...sim.foodChanged].map(i => { const f = sim.food[i]; return f ? [i, r2(f[0]), r2(f[1]), f[2], f[3], f[4] || 0] : [i, null]; }) : [];
    if (withFood) sim.foodChanged.clear();
    const g = { m: sim.mode, hz: sim.hz || 20, R: r2(sim.R), tl: sim.timeLeft == null ? -1 : Math.ceil(sim.timeLeft), o: sim.over ? 1 : 0 };   // 게임 방식·경기장 크기·남은 시간·끝남
    if (sim.over) g.res = sim.results;
    return { t: "s", rd: round, k: sim.tick, s, fd, g };
  }
  function syncMsg() {
    return { t: "y", rd: round, k: sim.tick, b: Object.fromEntries(sim.snakes.map(x => [x.id, x.pts.filter((_, i) => i % 2 === 0).flatMap(p => [r2(p[0]), r2(p[1])])])),
      f: sim.food.map(f => f ? [r2(f[0]), r2(f[1]), f[2], f[3], f[4] || 0] : 0), info: Object.fromEntries(sim.snakes.map(x => [x.id, [x.kind, x.name, x.hue, x.helper ? 1 : 0]])) };
  }
  // 직접 연결된 친구: 매 틱 (Arena 통로 g = 순서 안 지킴·재전송 없음, 전체 맞춤은 통로 r) — 예전 net.js 와 같은 통로.
  // 직접 연결이 안 된 친구: 두 틱마다 RTDB down 에 (down 은 모두 같은 최신 값 하나라 한 명 몫만 씀). 전체 맞춤도 여기로 — 꼭 전할 줄(downq)에 넣으면 큰 덩어리가 쌓임
  function netTick() {
    if (!net || !sim) return;
    netN++;
    if (sim.over && overSent && netN % 10) return;                       // 판이 끝나면 결과만 가끔 (손실 대비)
    overSent = sim.over;
    const st = stateMsg(), sync = !sim.over && netN % 30 === 1 ? syncMsg() : null, open = new Map(net.peers());
    let relay = null;
    for (const uid of Object.keys(net.players || {})) {
      if (uid === meId) continue;
      if (open.get(uid)) { net.send(uid, st); if (sync) net.send(uid, sync, true); }
      else if (!relay) relay = uid;
    }
    if (relay) { if (sync) net.send(relay, sync); else if (netN % 2 === 0) net.send(relay, st); }
    for (const x of sim.snakes) prevHead.set(x.id, x.head);
  }
  const unpackInput = v => ({ target: v.tg ? [v.tg[0], v.tg[1]] : null, aim: v.a != null ? v.a : null, boost: !!v.b, turn: v.r || 0, respawn: v.rs || 0 });
  function onGuestMsg(uid, m) {
    if (!m || mode !== "host" || !sim) return;
    if (m.t === "i") sim.inputs[uid] = unpackInput(m);
    else if (m.t === "hi") {                                             // 새로 들어옴·새로 고침: 그 화면의 입력 세기는 처음부터 + 지금 판을 바로
      const s = findSnake(uid); if (s) s.respawnSeq = 0;
      sim.inputs[uid] = {};
      net.send(uid, stateMsg(false), true); net.send(uid, syncMsg(), true);
      if (ready.size) net.send(uid, { t: "rdyl", rd: round, uids: [...ready] }, true);
    } else if (m.t === "rdy") {                                          // 판이 끝난 뒤 '✋ 준비'
      if (m.rd !== round || !sim.over) return;
      ready.add(uid); net.broadcast({ t: "rdyl", rd: round, uids: [...ready] }, true); drawReady();
    }
  }
  function onHostMsg(m) {
    if (!m || mode !== "client") return;
    if (m.t === "s") onState(m);
    else if (m.t === "y") onSync(m);
    else if (m.t === "rdyl" && m.rd === round) { ready.clear(); (m.uids || []).forEach(u => ready.add(u)); drawReady(); }
  }
  // 손님 입력: 바뀌면 바로(50ms 마다 봄), 안 바뀌어도 직접 연결 0.2초 · 서버 경유 1초마다 (서버 경유 때 초당 15번 제한은 Arena 가 함)
  let upLast = "", upAt = 0;
  function sendInput() {
    if (!net) return;
    const v = { t: "i", tg: input.target ? [r2(input.target[0]), r2(input.target[1])] : null, a: input.aim != null ? r2(input.aim) : null, b: input.boost ? 1 : 0, r: input.turn || 0, rs: input.respawn || 0 };
    const key = JSON.stringify(v), now = performance.now();
    if (key === upLast && now - upAt < (net.p2p ? 200 : 1000)) return;
    upLast = key; upAt = now; net.send(v);
  }
  // 판 사이 준비 (volley 와 같은 약속): 손님 '✋ 준비' → 방장 '다음 판 시작' (다 준비 전엔 잠김 · '안 기다리고 시작')
  function drawReady() {
    if (mode === "solo" || mode === "menu" || !net || $("results").hidden) return;
    const pl = net.players || {}, hostId = (net.meta || {}).host, others = Object.keys(pl).filter(u => u !== hostId), who = u => esc((pl[u] && pl[u].name) || "친구") + (u === meId ? " (나)" : "");
    $("resReady").innerHTML = `<div class="rdy-row"><span class="ok">👑 ${who(hostId)}</span>${others.map(u => `<span class="${ready.has(u) ? "ok" : ""}">${ready.has(u) ? "✅" : "⏳"} ${who(u)}</span>`).join("")}</div>`;
    const a = $("again");
    if (mode === "host") {
      const n = others.filter(u => ready.has(u)).length, all = n === others.length;
      a.disabled = !all; a.textContent = all ? "다음 판 시작 ▶" : `다음 판 시작 (준비 ${n}/${others.length})`;
      $("resForce").hidden = all;
    } else { const on = ready.has(meId); a.disabled = on; a.textContent = on ? "✅ 준비 완료 · 방장을 기다려요" : "✋ 준비"; }
  }

  function hideGameHud() {
    ["lb", "me", "topbtn", "room", "boost", "dead", "pause", "admin", "myAc", "timer", "results", "spec"].forEach(id => $(id).hidden = true);
    stopSpectate(); if (window.__snakeHelper) window.__snakeHelper.off(); document.body.classList.remove("playing");
  }
  // 연결 끊김 알림 (화면 위 가운데)
  function connBanner(text) {
    let el = $("netWarn");
    if (!el) { el = document.createElement("div"); el.id = "netWarn"; el.className = "hud"; el.style.cssText = "left:50%;top:calc(env(safe-area-inset-top,0px) + 80px);transform:translateX(-50%);padding:8px 14px;border-radius:99px;background:rgba(160,30,40,.92);color:#fff;font:600 14px/1.3 var(--sans);z-index:20;text-align:center"; document.body.appendChild(el); }
    el.hidden = !text; el.textContent = text;
  }
  function showRoom(code, isHost) {
    const el = $("room"); el.hidden = false;
    el.innerHTML = `<span class="chip">방 ${code}${isHost ? " · 방장" : ""}</span><div class="small" id="netInfo" style="margin-top:4px"></div>`;
  }
  // 게임 중에 친구 부르기 (늦게 와도 바로 같이 함): 메뉴 창의 단추
  $("copyLink").onclick = () => { if (!roomCode) return; const link = Arena.inviteUrl(roomCode), b = $("copyLink"); navigator.clipboard.writeText(link).then(() => { b.textContent = "복사됨 ✓"; setTimeout(() => { b.textContent = "🔗 초대 링크 복사"; }, 1500); }, () => prompt("이 링크를 보내세요", link)); };
  function backToMenu() {
    if (LOG.inMatch && sim) LOG.matchEnd({ results: snapshot(), final: sim.results || null, aborted: !sim.over && sim.mode !== "free" });
    LOG.close(); logRoom = null;
    clearInterval(tickTimer); clearInterval(reportTimer);
    mode = "menu"; sim = null; behaviors.clear(); paused = false; frozen = false; respawnedAtDeaths = 0; stopSpectate(); remote.g = null;
    releaseNet();
    if (window.ArenaUI && ArenaUI.net) ArenaUI.leave();                  // 친구랑이면 방에서도 나감 (손님은 방장 쪽에서 빠지고, 방장이면 방이 닫힘)
    roomCode = null; reportsFor = null; connBanner("");
    $("menu").hidden = false; hideGameHud();
    msg(""); recLoad();
  }

  // ── 한 틱 (혼자·방장)
  let lastTickAt = 0, lastStateAt = 0, lastHeardAt = 0;
  function stepSim() {
    if (paused || frozen || !sim) return;                          // 11-01 혼자 판 시계가 도는 중 '방 만들기'(sim=null) → 오류로 멈추던 것
    const now = performance.now();
    lastTickAt = now;
    sim.step(now, {
      human(s, a, obsFn) {
        let b = behaviors.get(s.id); if (!b) { b = AC.behavior(); behaviors.set(s.id, b); }
        b.onStep(obsFn(), a, now);
        if (s.id === meId) clientAC.onStep(now);
      },
      death(s) { const b = behaviors.get(s.id); if (b) b.onDeath(); },
    });
    if (mode === "host") netTick();
  }

  // ── 참가자: 방장이 보낸 상태로 화면 만들기 (v2: 몸은 방장과 같은 '따라가는 몸' 계산을 머리 위치로 따라 함)
  function ensure(id) { let s = remote.snakes.get(id); if (!s) { s = { id, kind: "?", name: "", hue: 200, helper: false, body: [], head: [0, 0], ang: 0, length: 10, alive: true, boosting: false, deaths: 0, kills: 0, pts: [], prev: null }; remote.snakes.set(id, s); } return s; }
  const cutPts = s => s.body.slice(1, 1 + Math.floor(s.length));
  // 판 번호: 지난 판에서 늦게 온 건 버리고, 새 판이면 화면을 처음부터 (직접 연결은 순서가 바뀌어 올 수 있음)
  function sameRound(v) {
    const rd = v.rd || 0;
    if (rd < round) return false;
    if (rd > round) { round = rd; resetRemote(); }
    return true;
  }
  function onSync(v) {
    if (!sameRound(v)) return;
    if (v.f) remote.food = v.f.map(f => f && f.length ? f : null);
    for (const [id, inf] of Object.entries(v.info || {})) { const s = ensure(id); [s.kind, s.name, s.hue, s.helper] = [inf[0], inf[1], inf[2], !!inf[3]]; }
    for (const [id, flat] of Object.entries(v.b || {})) {                 // 두 마디에 하나씩 온 몸 → 사이를 채워 맞춤
      const s = ensure(id); if (!s.alive) continue;
      const half = []; for (let i = 0; i + 1 < (flat || []).length; i += 2) half.push([flat[i], flat[i + 1]]);
      if (!half.length) continue;
      const full = [s.head];
      for (let j = 0; j < half.length; j++) { const a = j ? half[j - 1] : s.head, b = half[j]; if (j) full.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); full.push(b); }
      const tail = full[full.length - 1], mine = s.body[full.length - 1];
      if (mine && Math.hypot(tail[0] - mine[0], tail[1] - mine[1]) < 1.2) continue;   // 거의 맞으면 그대로 (툭 바뀌어 보이지 않게)
      const last = full[full.length - 1], prev = full[full.length - 2] || s.head, dx = last[0] - prev[0], dy = last[1] - prev[1], d = Math.hypot(dx, dy) || 1;
      while (full.length < C.NMAX) { const t = full[full.length - 1]; full.push([t[0] + dx / d * C.SEG, t[1] + dy / d * C.SEG]); }
      s.body = full; s.pts = cutPts(s);
    }
    for (const id of [...remote.snakes.keys()]) if (v.info && !v.info[id]) remote.snakes.delete(id);
  }
  let stateK = -1, stateGap = 2;
  function onState(v) {
    if (!sameRound(v) || v.k < stateK) return;                              // 직접 연결은 순서가 바뀌어 올 수 있음 → 옛것 버림
    lastHeardAt = performance.now();
    if (v.g) { remote.g = v.g; if (v.g.hz) { tickMs = 1000 / v.g.hz; HZ = v.g.hz; } }   // 같은 틱이어도 받음: 판 끝 결과는 틱이 안 늘어나니 한 번 놓쳐도 다음 것으로
    if (v.k === stateK) return;
    stateGap = Math.max(1, Math.min(4, v.k - stateK)); stateK = v.k;
    { const t = performance.now(); if (lastStateAt) gapS.push(t - lastStateAt); lastStateAt = t; }
    for (const e of v.s || []) {
      const s = ensure(e[0]);
      let wasAlive = s.alive; const prevK = s.k ?? -9;
      if (wasAlive && s.body.length && Math.hypot(e[3] - s.head[0], e[4] - s.head[1]) > 6) wasAlive = false;   // 새 판에서 순간이동
      s.prev = wasAlive && s.body.length ? { head: s.head, pts: s.body.slice(1, Math.floor(s.length) + 4) } : null;
      s.ang = e[5]; s.length = e[6] / 10; s.alive = !!e[7]; s.boosting = !!e[8]; s.deaths = e[9]; s.kills = e[10]; s.prot = !!e[11];
      const sp = s.boosting ? C.BOOST : C.SPEED;
      if (s.alive && (!wasAlive || !s.body.length)) { s.body = SNK.straightBody([e[3], e[4]], s.ang, C.NMAX); s.prev = null; }   // 새로 태어남
      else if (s.alive) {
        if (v.k !== prevK + 1) SNK.follow(s.body, [e[1], e[2]], sp, Math.floor(s.length) + 8);   // 두 틱마다 오면 중간 머리부터
        SNK.follow(s.body, [e[3], e[4]], sp, Math.floor(s.length) + 8);
      }
      s.k = v.k;
      s.head = s.body[0] || [e[3], e[4]]; s.pts = s.alive ? cutPts(s) : [];
      if (s.id === meId) s.best = Math.max(s.best || 0, s.length);
    }
    for (const f of v.fd || []) remote.food[f[0]] = f[1] == null ? null : [f[1], f[2], f[3], f[4], f[5]];
  }

  // ── 내 지렁이 예측 (참가자): 방장이 보낸 최신 위치에서, 그 뒤 지난 시간만큼 내 입력으로 미리 움직여 그림
  //   매번 방장의 최신 위치에서 다시 계산하므로 오차가 쌓이지 않음. 길이·생사·먹기는 방장 판정 그대로
  function predicted(s, now) {
    const lat = (net && net.p2p ? (net.rtt || 40) / 2 : 120) + (now - lastStateAt);
    const n = Math.min(12, lat / tickMs), steps = Math.ceil(n), m = Math.floor(s.length) + 2;
    const body = s.body.slice(0, m + 1);
    let ang = s.ang;
    for (let i = 0; i < steps; i++) {
      let turn = input.turn || 0;
      const tr = SNK.turnRate(s.length);
      if (!turn && input.aim != null) { const d = ((input.aim - ang) % SNK.TAU + SNK.TAU * 1.5) % SNK.TAU - Math.PI; turn = Math.abs(d) < tr / 2 ? 0 : d > 0 ? 1 : -1; }
      ang += tr * turn;
      const v = (input.boost && s.length > C.L_MIN + 1 ? C.BOOST : C.SPEED) * (i === steps - 1 ? n - (steps - 1) : 1);
      SNK.follow(body, [body[0][0] + v * Math.cos(ang), body[0][1] + v * Math.sin(ang)], v, m);
    }
    return { head: body[0], body, ang };
  }

  // ── 화면 그리기 (초당 60번)
  const list = () => mode === "client" ? [...remote.snakes.values()] : (sim ? sim.snakes : []);
  const foods = () => mode === "client" ? remote.food : (sim ? sim.food : []);
  // 보간: 직전 계산과 이번 계산 사이를 비율만큼 섞어 그림 (혼자·방장은 한 틱, 참가자는 받는 간격만큼 늦게 → 끊김 없음)
  const smoothLen = new Map();
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function displayList(now) {
    const client = mode === "client";
    const t = client ? Math.min(1, (now - lastStateAt) / (tickMs * stateGap)) : Math.min(1, (now - lastTickAt) / (1000 / HZ));
    return list().map(s => {
      if (!s.alive || !s.body || !s.body.length) { smoothLen.delete(s.id); return s; }
      let head, body, ang = s.ang;
      if (client && s.id === meId) { const p = predicted(s, now); head = p.head; body = p.body; ang = p.ang; }   // 내 지렁이: 예측해서 앞서
      else if (s.prev) { head = mix(s.prev.head, s.head, t); body = [head, ...s.prev.pts.map((p, i) => s.body[i + 1] ? mix(p, s.body[i + 1], t) : p)]; }   // 꼬리 끝 마디까지 섞어서
      else { head = s.head; body = s.body.slice(0, Math.floor(s.length) + 2); }
      // 길이도 부드럽게: 보이는 길이가 실제 길이를 천천히 따라가고, 마지막 마디는 비율만큼
      // 다시 태어났으면(죽은 횟수가 바뀜, 또는 길이가 한 번에 크게 줄어듦) 예전 길이를 버림 — 탭을 다른 데 보고 있던 사이 죽고 살아나면
      // 예전 길이(예: 287)만큼 태어날 때의 일자 몸을 그려서 몸이 맵 밖에서 들어오는 것처럼 보였음
      const prevL = smoothLen.get(s.id), fresh = !prevL || prevL.d !== s.deaths || prevL.L - s.length > 20;
      const dl = fresh ? s.length : prevL.L, L = dl + (s.length - dl) * 0.12;
      smoothLen.set(s.id, { L, d: s.deaths });
      const n = Math.min(Math.floor(L), body.length - 1), frac = L - Math.floor(L);
      const pts = body.slice(1, 1 + n);
      if (frac > 0.02 && body[n + 1]) pts.push(mix(body[n], body[n + 1], frac));
      return { id: s.id, name: s.name, hue: s.hue, helper: s.helper, boosting: s.boosting, alive: true, length: s.length, ang, head, pts, prot: s.prot };
    });
  }
  function loop(t) {
    if (mode !== "menu") {
      RND.frame(displayList(t), foods(), meId, spectating && specId ? specId : meId, gs().R, mode === "client" ? stateK : (sim ? sim.tick : 0));
    } else RND.frame([], sim ? sim.food : demoFood, null);
    requestAnimationFrame(loop);
  }
  const demoFood = Array.from({ length: 300 }, () => { const r = (C.R_ARENA - 2) * Math.sqrt(Math.random()), a = Math.random() * 6.283; return [r * Math.cos(a), r * Math.sin(a), SNK.FOOD_HUES[Math.floor(Math.random() * 9)], 1]; });
  requestAnimationFrame(loop);
  setInterval(() => { if (mode !== "menu") hud(); }, 250);
  // 게임 방식 정보 (혼자·방장은 내 시뮬레이션, 참가자는 방장이 보낸 것)
  function gs() {
    if (mode === "client") { const g = remote.g || {}; return { mode: g.m || "free", R: g.R || C.R_ARENA, tl: g.tl ?? -1, over: !!g.o, res: g.res }; }
    if (!sim) return { mode: "free", R: C.R_ARENA, tl: -1, over: false };
    return { mode: sim.mode, R: sim.R, tl: sim.timeLeft == null ? -1 : Math.ceil(sim.timeLeft), over: sim.over, res: sim.results };
  }
  const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  function modeHud() {
    const g = gs(), el = $("timer");
    if (g.mode === "free") { el.hidden = true; } else {
      el.hidden = false;
      const alive = list().filter(s => s.alive).length;
      el.innerHTML = g.mode === "round" ? `라운드 · 남은 시간 <b style="color:var(--me)">${mmss(Math.max(0, g.tl))}</b>`
        : `배틀로얄 · 생존 <b style="color:var(--me)">${alive}</b>명 · ${g.R < C.R_ARENA - 0.5 ? "<span style='color:var(--danger)'>경기장 줄어드는 중</span>" : "곧 경기장이 줄어요"} · ${mmss(Math.max(0, g.tl))}`;
    }
    if (g.over && g.res) {
      if ($("results").hidden) {
        $("dead").hidden = true; stopSpectate();
        const win = g.res[0], online = mode !== "solo";
        $("resTitle").textContent = win ? (win.id === meId ? "🏆 우승!" : `🏆 ${win.name} 우승`) : "결과";
        $("resList").innerHTML = g.res.slice(0, 10).map(r => `<li style="${r.id === meId ? "color:var(--me);font-weight:700" : ""}">${esc(r.name)} <span class="small">길이 ${r.len} · 잡음 ${r.kills}${g.mode === "royale" ? (r.alive ? " · 생존" : " · 탈락") : ""}</span></li>`).join("");
        $("resLobby").hidden = mode !== "host"; $("resForce").hidden = true; $("resReady").hidden = !online; $("resMenu").textContent = online ? "나가기" : "메뉴로";
        if (!online) { $("again").disabled = false; $("again").innerHTML = '다시 하기 <span class="kbd">(Space · Enter)</span>'; }
        $("resNote").textContent = mode === "client" ? "방장이 다음 판을 시작하거나 대기실로 가면 따라가요." : g.mode === "round" ? "순위 = 라운드가 끝날 때 길이 (순위표와 같음)" : "순위 = 살아남은 순서";
        $("results").hidden = false;
        rankReport(g); drawReady();
      }
    } else $("results").hidden = true;
  }
  const isAdmin = () => !!(window.Gate && Gate.state && Gate.state.isAdmin === true);
  function hud() {
    modeHud();
    $("me").style.top = ($("lb").offsetTop + $("lb").offsetHeight + 6) + "px";   // 내 정보는 순위표 바로 아래
    const all = list().filter(s => s.alive).sort((a, b) => b.length - a.length);
    $("lb").querySelector("ol").innerHTML = all.slice(0, 10).map(s => `<li class="${s.id === meId ? "me" : ""}">${(s.helper ? "🧪" : "") + esc(s.name)} <span style="float:right">${Math.floor(s.length)}</span></li>`).join("");
    const me = list().find(s => s.id === meId);
    if (me) {
      const rank = all.indexOf(me) + 1;
      const boostTxt = input.boost ? (me.length > C.L_MIN + 1 ? " · <b style='color:var(--me);font-size:13px'>부스트</b>" : " · <span style='color:var(--danger)'>부스트 불가 (길이 7 이하)</span>") : "";
      const watching = mode === "client" && !me.alive && !me.deaths && gs().mode === "royale";   // 배틀로얄에 늦게 온 사람: 구경 (다음 판부터 같이)
      $("me").innerHTML = watching ? '<b>👀 구경 중</b><br><span class="small">다음 판부터 같이 해요</span>' : `내 길이 <b>${Math.floor(me.length)}</b> · 순위 ${rank || "-"}/${all.length}<br><span class="small">죽음 ${me.deaths} · 잡음 ${me.kills}${boostTxt}</span>`;
      if (coarse) $("boost").hidden = watching;
      if (spectating) { const t = list().find(x => x.id === specId); if (!t || !t.alive) cycleSpec(1); specHud(); }
      else if (watching && !gs().over) startSpectate();
      const showDead = !me.alive && me.deaths > respawnedAtDeaths && $("pause").hidden && !spectating && !gs().over;   // '새로 시작'을 누른 뒤 또 죽기 전까지는 안 띄움
      if (showDead && $("dead").hidden) {
        const royale = gs().mode === "royale";
        $("deadMsg").textContent = royale ? `탈락! 길이 ${Math.floor(me.length)} · 잡은 수 ${me.kills}. 관전하며 끝까지 볼 수 있어요.` : `최고 길이 ${Math.floor(me.best || me.length)} · 잡은 수 ${me.kills} · 죽은 횟수 ${me.deaths}`;
        $("respawn").hidden = royale; $("deadNote").hidden = royale;
      }
      $("dead").hidden = !showDead;
    }
    const adm = isAdmin();
    $("acBtn").hidden = !adm;
    if (!adm) $("admin").hidden = true;
    if (!$("admin").hidden) renderAdmin();
    // 연결 상태 표시: 직접 연결(WebRTC)인지, Firebase(싱가포르) 경유인지
    if (mode === "client" && lastHeardAt && net && net.connected) connBanner(performance.now() - lastHeardAt > 3000 ? "방장 화면 신호가 끊겼어요 · 기다리는 중…" : "");
    const info = $("netInfo");
    if (info) {
      if (mode === "client" && net) info.textContent = net.p2p ? `직접 연결 · ${Math.round(net.rtt || 0)}ms` : "Firebase 경유 (직접 연결 시도 중)";
      else if (mode === "host" && net) { const ps = net.peers(); info.textContent = ps.length ? `친구 ${ps.length}명 · 직접 연결 ${ps.filter(p => p[1]).length}명` : "친구를 기다리는 중"; }
    }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ── 입력: PC 마우스 / 휴대폰 손가락 / 키보드
  const cv = RND.canvas, coarse = matchMedia("(pointer: coarse)").matches;
  // 마우스·손가락은 '화면 가운데(=내 머리)에서 본 방향'으로 조준 (slither 방식). 바닥의 한 점을 노리면 그 점 주위를 빙빙 돎
  const aimFrom = e => { const r = cv.getBoundingClientRect(); return Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2)); };
  // 휴대폰: 누른 곳 쪽으로 머리가 돎 (마우스와 같이 화면 가운데=내 머리에서 본 방향). 누른 채 움직이면 따라 돌고, 떼도 그 방향으로 계속 감
  // 누른 자리에 작은 동그라미를 보여 줘서 어디를 가리키는지 알게
  let joy = null;
  const joyEl = $("joy");
  const showJoy = (x, y) => { if (!joyEl) return; joyEl.hidden = false; joyEl.style.left = x + "px"; joyEl.style.top = y + "px"; };
  cv.addEventListener("pointermove", e => {
    clientAC && clientAC.onEvent("move", e);
    if (e.pointerType === "mouse") { input.aim = aimFrom(e); input.target = null; return; }
    if (!joy || e.pointerId !== joy.id) return;
    input.aim = aimFrom(e); input.target = null; showJoy(e.clientX, e.clientY);
  });
  cv.addEventListener("pointerdown", e => {
    clientAC && clientAC.onEvent("down", e); input.target = null;
    if (e.pointerType === "mouse") { input.aim = aimFrom(e); input.boost = true; }
    else if (!joy) { joy = { id: e.pointerId }; input.aim = aimFrom(e); showJoy(e.clientX, e.clientY); }
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const joyEnd = e => { if (joy && e.pointerId === joy.id) { joy = null; if (joyEl) joyEl.hidden = true; } };   // 손을 떼도 그 방향으로 계속 감
  cv.addEventListener("pointerup", e => { clientAC && clientAC.onEvent("up", e); if (e.pointerType === "mouse") input.boost = false; joyEnd(e); });
  cv.addEventListener("pointercancel", joyEnd);
  const bb = $("boost");
  bb.addEventListener("pointerdown", e => { e.preventDefault(); input.boost = true; bb.classList.add("on"); clientAC && clientAC.onEvent("key", e); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => bb.addEventListener(t, () => { input.boost = false; bb.classList.remove("on"); }));
  bb.addEventListener("contextmenu", e => e.preventDefault());
  window.addEventListener("keydown", e => {
    if (mode === "menu" || e.target.tagName === "INPUT") return;
    if (!$("dead").hidden || !$("pause").hidden) return;                 // 창이 떠 있을 땐 Space/Enter가 창 버튼 몫
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) { clientAC && clientAC.onEvent("key", e); e.preventDefault(); }
    // 방향키를 쓰면 마우스 조준을 끔 → 키를 떼면 직진 (마우스를 다시 움직이면 마우스 조준)
    if (e.key === "ArrowLeft") { input.turn = 1; input.aim = null; input.target = null; }
    if (e.key === "ArrowRight") { input.turn = -1; input.aim = null; input.target = null; }
    if (e.key === " ") input.boost = true;
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { clientAC && clientAC.onEvent("key", e); input.turn = 0; }
    if (e.key === " ") input.boost = false;
  });

  setInterval(() => { if (mode === "client" && net && net.p2p && net.rtt) pingS.push(net.rtt); }, 1000);
  // ── 감지 기록: 5초마다 관리자 전용 위치에 (혼자: solo, 같이: 방 코드) — 자리 약속은 net.js
  function startReports(roomKey) {
    reportsFor = roomKey;
    clearInterval(reportTimer);
    reportTimer = setInterval(() => {
      if (!NET.ready || !NET.uid) return;
      if ((mode === "host" || mode === "solo") && sim && LOG.inMatch) {
        if (sim.over) LOG.matchEnd({ results: snapshot(), final: sim.results }); else LOG.matchUpdate({ results: snapshot() });
      }
      if (mode === "client" && net) LOG.net(NET.uid, { name: curName(), role: "친구", conn: net.p2p ? "직접" : "Firebase", ping: pingS.avg, pingMax: pingS.max, gap: gapS.avg, jitter: gapS.jitter, reconnects });
      if (mode === "host" && net) { const ps = net.peers(); LOG.net(NET.uid, { name: curName(), role: "방장", friends: ps.length, direct: ps.filter(p => p[1]).length, reconnects }); }
      const c = clientAC.summary(), declared = !!(settings.helper && settings.helper !== "none");
      NET.report(roomKey, NET.uid, "client", { name: curName(), mode, helperDeclared: settings.helper, score: AC.total(c.sig, { declared }), sig: c.sig.map(s => [s[0], s[1] ? 1 : 0, s[2]]) });
      if (mode !== "client" && sim) for (const s of sim.snakes) if (s.kind === "human") {
        const b = behaviors.get(s.id); if (!b) continue; const sm = b.summary();
        NET.report(roomKey, NET.uid, s.id === meId ? "host" : "peer/" + s.id, { name: s.name, score: AC.total(sm.sig), sig: sm.sig.map(x => [x[0], x[1] ? 1 : 0, x[2]]) });
      }
    }, 5000);
  }

  // ── 감지기 패널 (관리자만: 로그인은 아케이드 'BENNY ARCADE' 3번 한 곳, 여기선 Gate.state.isAdmin 만 봄)
  let adminWatching = false, adminReports = {}, adminRooms = {};
  async function openAdmin() {
    if (!isAdmin()) return;
    $("admin").hidden = !$("admin").hidden;
    if ($("admin").hidden) return;
    if (!adminWatching) { try { await NET.init(); } catch (e) {} adminWatching = true; NET.watchReports(v => { adminReports = v; renderAdmin(); }); NET.watchRooms(v => { adminRooms = v; renderAdmin(); }); }
    renderAdmin();
  }
  $("acBtn").onclick = openAdmin;

  function sigList(sig) { return `<ul>${(sig || []).map(s => `<li class="${s[1] ? "on" : ""}">${s[1] ? "●" : "○"} ${esc(s[0])} — ${esc(s[2])}</li>`).join("")}</ul>`; }
  function scoreHTML(n) { const v = AC.verdict(n); return `<span class="sc v-${v[1]}">${n}</span><span class="v-${v[1]}">${v[0]}</span>`; }
  function renderAdmin() {
    const el = $("admin"); if (el.hidden) return;
    let h = `<h2>🔎 헬퍼 감지기</h2><p class="small">플레이어 컴퓨터가 본 신호(가짜 입력·변조·주입)와, 게임을 계산하는 쪽이 본 행동 신호(반응 속도·회피율)를 합쳐 판단합니다. 플레이어에겐 안 보여요.</p>`;
    if (sim) {
      h += `<b>지금 이 판</b>`;
      for (const s of sim.snakes) if (s.kind === "human") {
        const b = behaviors.get(s.id), bs = b ? b.summary().sig : [];
        const cs = s.id === meId && clientAC ? clientAC.summary().sig : [];
        const all = cs.concat(bs);
        h += `<div class="acrow"><div class="top">${scoreHTML(AC.total(all))}<b>${(s.helper ? "🧪" : "") + esc(s.name)}</b>${s.id !== meId ? '<span class="small">(클라이언트 신호는 아래 기록에)</span>' : ""}</div>${sigList(all)}</div>`;
      }
    }
    const rooms = Object.entries(adminRooms || {});
    h += `<b>열린 방 ${rooms.length}개</b>` + rooms.map(([k, r]) => `<div class="small">${esc(k)} · ${esc(r.h || "?")}의 방 · 사람 ${r.n || 0}명 · ${esc(r.m || "")}</div>`).join("");
    const rep = adminReports || {};
    if (rep.__error) h += `<p class="small v-hot">기록 읽기 실패: ${esc(rep.__error)}</p>`;
    else {
      h += `<b>최근 기록</b>`;
      for (const [room, raw] of Object.entries(rep).reverse()) {
        const people = {};                                                // 방장이 본 친구 신호(방장 자리 아래 peer/친구)는 그 친구 줄에 합쳐 보여 줌
        for (const [uid, p] of Object.entries(raw || {})) { people[uid] = { ...people[uid], client: p.client, host: p.host || (people[uid] || {}).host }; for (const [f, x] of Object.entries(p.peer || {})) people[f] = { ...people[f], host: x }; }
        for (const [uid, p] of Object.entries(people)) {
          const cl = p.client || {}, ho = p.host || {}, sig = (cl.sig || []).concat(ho.sig || []);
          const n = Math.min(100, sig.reduce((a, s) => a + (s[1] ? ({ "가짜": 40, "입력": 35, "주입": 20, "반응": 25, "위험": 10 }[s[0].slice(0, 2)] || 15) : 0), 0));
          const when = Math.max(cl.t || 0, ho.t || 0);
          h += `<div class="acrow"><div class="top">${scoreHTML(n)}<b>${esc(cl.name || ho.name || uid.slice(0, 6))}</b><span class="small">${room === "solo" ? "혼자" : "방 " + esc(room)} · ${when ? new Date(when).toLocaleTimeString() : ""}${cl.helperDeclared && cl.helperDeclared !== "none" ? " · 🧪 헬퍼 켬(" + esc(cl.helperDeclared) + ")" : ""}</span></div>${sigList(sig)}</div>`;
        }
      }
      h += `<button class="btn" type="button" id="acClear">기록 모두 지우기</button>`;
    }
    el.innerHTML = h;
    const cb = $("acClear"); if (cb) cb.onclick = () => NET.clearReports();
  }

  // ── 혼자 연습할 때 내 감지기 (공부용)
  $("myAc").onclick = () => {
    if (!sim) return;
    const b = behaviors.get(meId), all = clientAC.summary().sig.concat(b ? b.summary().sig : []);
    const declared = !!(settings.helper && settings.helper !== "none");
    const n = AC.total(all, { declared }), v = AC.verdict(n);
    alert(`내 의심 점수 ${n} (${v[0]})${declared ? " · 헬퍼 선언됨(주입 신호 면제)" : ""}\n\n` + all.map(s => `${s[1] ? "●" : "○"} ${s[0]} — ${s[2]}`).join("\n") + "\n\n" + clientAC.summary().log.join("\n"));
  };

  // ── 헬퍼: 메뉴에서 고르면 바깥 스크립트를 붙임 (북마크로 붙이는 것과 같은 파일)
  function loadHelper(kind) {
    const P = {                                                          // 메뉴 고르기 → 헬퍼 패널 기본값 (패널에서 하나씩 더 켜고 끌 수 있음)
      see: { radar: true, path: true, food: true, arrow: true },
      guard: { radar: true, path: true, guard: true },
      auto: { radar: false, path: false, auto: true },
      zoom: { radar: true, path: false, zoom: true },
    }[kind] || {};
    window.__helperPreset = { radar: false, path: false, food: false, arrow: false, zoom: false, guard: false, auto: false, ...P, how: "var", human: false, declared: true };
    if (window.__snakeHelper) { window.__snakeHelper.apply(window.__helperPreset); return; }
    const s = document.createElement("script"); s.src = "helper.js?" + Date.now(); document.body.appendChild(s);
  }

  $("solo").onclick = clickStart;
  $("helpBtn").onclick = () => Cozy.howto("snake", "지렁이 대결 하는 법", [
    "PC: 마우스 쪽으로 머리가 돌고, 누르고 있으면 <b>부스트</b> · 방향키와 Space 도 돼요",
    "폰: 누른 곳 쪽으로 돌고, 손을 떼도 그 방향으로 가요. 오른쪽 아래 단추가 <b>부스트</b>",
    "먹이를 먹으면 길어져요. 부스트는 빠른 대신 몸이 줄고 먹이를 흘려요",
    "머리가 다른 지렁이 몸에 닿거나 벽 밖으로 나가면 죽어요. 죽으면 몸이 큰 먹이가 돼요",
    "<b>자유</b>: 끝없이 · <b>라운드 3분</b>: 끝날 때 가장 긴 지렁이가 1등 · <b>배틀로얄</b>: 20초 뒤부터 경기장이 줄고 부활 없이 마지막 생존자가 1등",
    "🏆 랭킹엔 라운드·배틀로얄만 올라가요 (1등 = 승, 헬퍼 켠 판은 안 셈)",
    "AI 는 셀프플레이로 배웠어요: 초급 50만 번 · 중급 200만 번 · 상급 1,000만 번 동작",
  ], { force: true });

  // ── 죽었을 때: 다시 태어날지 묻기 / ESC: 멈춤 메뉴
  let respawnedAtDeaths = 0, spectating = false, specId = null, specShown = "";
  // 죽은 상태에서 한 번만 받음 (부스트로 스페이스를 누르고 있다 죽으면 키 반복이 여러 번 눌러서 다음 죽음 때 저절로 살아나던 문제)
  function respawn() {
    const me = list().find(s => s.id === meId);
    if (!me || me.alive || me.deaths <= respawnedAtDeaths) return;
    input.respawn++; respawnedAtDeaths = me.deaths; input.boost = false;
    $("dead").hidden = true; stopSpectate();
  }
  function startSpectate() {
    spectating = true; $("dead").hidden = true;
    const alive = list().filter(s => s.alive && s.id !== meId).sort((a, b) => b.length - a.length);
    specId = alive.length ? alive[0].id : null; specHud();
  }
  function stopSpectate() { spectating = false; specId = null; $("spec").hidden = true; }
  function specHud() {
    const s = list().find(x => x.id === specId), royale = gs().mode === "royale", key = (s ? s.name : "-") + royale;
    if (key === specShown && !$("spec").hidden) return;                  // 이름이 늦게 오면 그때 다시 (단추를 자꾸 새로 만들지 않게)
    specShown = key; $("spec").hidden = false;
    $("spec").innerHTML = `관전 중: <b>${s ? esc(s.name) : "-"}</b> · ←→ 다른 지렁이${royale ? "" : ` · <button class="btn" type="button" id="specGo" style="padding:5px 9px;font-size:12px">새로 시작 (Space)</button>`}`;
    if ($("specGo")) $("specGo").onclick = respawn;
  }
  function cycleSpec(d) {
    const alive = list().filter(s => s.alive && s.id !== meId).sort((a, b) => b.length - a.length);
    if (!alive.length) return;
    const i = Math.max(0, alive.findIndex(s => s.id === specId));
    specId = alive[(i + d + alive.length) % alive.length].id; specHud();
  }
  $("respawn").onclick = respawn;
  $("spectate").onclick = startSpectate;
  $("deadMenu").onclick = backToMenu;
  function setPause(on) {
    if (mode === "menu") return;
    paused = on && mode === "solo";                                       // 친구랑 할 땐 다른 사람이 있어 멈추지 않음
    $("pause").hidden = !on;
    $("pauseTitle").textContent = mode === "solo" ? "잠깐 멈춤" : "메뉴";
    $("newGame").hidden = mode === "client"; $("toLobby").hidden = mode !== "host"; $("copyLink").hidden = mode === "solo";
    $("pauseNote").textContent = mode === "solo" ? "게임이 멈춰 있어요." : "친구들과 하는 중이라 게임은 계속 진행돼요.";
    if (on) $("dead").hidden = true;
  }
  $("toMenu").onclick = () => setPause(true);
  $("resume").onclick = () => setPause(false);
  $("quit").onclick = () => { setPause(false); backToMenu(); };
  // 새 판: 혼자는 처음부터, 방장은 같은 방에서 친구들 그대로 새 판 (라운드·배틀로얄 다시 하기)
  function newGame() {
    setPause(false); $("results").hidden = true;
    if (mode === "solo") { backToMenu(); startSolo(); return; }
    hostNextRound();
  }
  $("again").onclick = () => {
    if (mode !== "client") return newGame();
    if (!ready.has(meId)) { ready.add(meId); net.send({ t: "rdy", rd: round }, true); drawReady(); }   // 손님: ✋ 준비
  };
  $("resForce").onclick = () => newGame();
  $("resLobby").onclick = () => { $("results").hidden = true; ArenaUI.toLobby(); };
  $("toLobby").onclick = () => { setPause(false); ArenaUI.toLobby(); };
  $("resMenu").onclick = () => { $("results").hidden = true; backToMenu(); };
  $("newGame").onclick = newGame;
  // 친구랑·랭킹·이름·잠금 창이 떠 있으면 Space/Enter 는 그 창 몫
  const overlayUp = () => !!document.querySelector(".arn-ov:not([hidden]), .rk-ov, .gme-ov, #bennyGateOverlay:not([hidden])");
  window.addEventListener("keydown", e => {
    const ok = e.key === "Enter" || e.key === " ";
    if (overlayUp()) return;
    if (mode === "menu") {                                                // 첫 메뉴: Space/Enter = 혼자 시작
      if (ok && !document.querySelector(".overlay:not([hidden])") && !e.target.closest("button, a, input")) { e.preventDefault(); clickStart(); }
      return;
    }
    if (e.target.tagName === "INPUT") return;
    if (e.key === "Escape") { setPause($("pause").hidden); e.preventDefault(); return; }
    if (spectating && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { cycleSpec(e.key === "ArrowRight" ? 1 : -1); e.preventDefault(); return; }
    if (ok && (!$("dead").hidden || spectating)) { e.preventDefault(); if (!e.repeat) respawn(); return; }
    if (ok && !$("results").hidden) { e.preventDefault(); if (!e.repeat && !$("again").disabled) $("again").click(); return; }
    if (ok && !$("pause").hidden) { e.preventDefault(); if (mode === "solo") newGame(); else setPause(false); return; }
  });

  // ── 헬퍼가 읽는 공개 변수 (실제 slither.io 클라이언트가 상태를 전역 변수에 두던 것과 같은 구조)
  window.game = {
    get snakes() { return list(); }, get food() { return foods(); }, get me() { return list().find(s => s.id === meId); },
    input, consts: C,
    view: { canvas: RND.canvas, get scale() { return RND.cam.ppu; }, toScreen: RND.toScreen, toWorld: RND.toWorld, set zoom(z) { RND.cam.zoom = z; }, get zoom() { return RND.cam.zoom; } },
    get zoneR() { return gs().R; },
    get hz() { return HZ; },
  };
  // ── QA 점검용 손잡이 (test/qa/adapters/snake.js) — 게임 규칙은 안 바꿈: 읽기 + (혼자·방장만) 틱을 직접 더 돌리기 (라운드 3분·배틀로얄을 빨리 끝내 보려고) + 방장 틱 잠깐 멈추기 (친구랑 두 화면 비교)
  window.__snake = {
    get sim() { return sim; }, get mode() { return mode; },
    get round() { return round; }, get over() { return gs().over; }, get gmode() { return gs().mode; },
    get playing() { return mode === "client" ? stateK >= 0 && remote.snakes.size > 0 : mode !== "menu" && !!sim; },
    ff(n) { if (!sim || paused || (mode !== "solo" && mode !== "host")) return 0; let k = 0; while (k < n && !sim.over) { stepSim(); k++; } return k; },
    freeze(on) { frozen = !!on && mode === "host"; },
  };

  recLoad();
  if (window.ArenaUI) ArenaUI.checkUrl(() => openFriend());
})();

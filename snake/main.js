/* 지렁이 대결 — 화면 연결: 메뉴, 혼자/방장/참가, 입력(PC·휴대폰), 순위표, 관리자 패널, 헬퍼, 그리고 헬퍼가 읽는 window.game */
(() => {
  const { C } = SNK;
  const $ = id => document.getElementById(id);
  let HZ = 14;                                                   // 1초에 게임 계산 횟수 (메뉴 '속도': 10 · 14 · 20). 규칙·AI는 같고 빠르기만 다름
  let tickMs = 1000 / 14;                                        // 참가자: 방장의 한 틱 길이
  let BRAINS = null, mode = "menu", sim = null, meId = "me", hostCtl = null, joinCtl = null, tickTimer = null, reportTimer = null;
  const input = { target: null, boost: false, turn: 0, respawn: 0, _own: false };
  let paused = false;
  const remote = { snakes: new Map(), food: [] };                 // 참가자 화면용
  let clientAC = null;
  const behaviors = new Map();                                   // 지렁이별 행동 감지 (혼자/방장이 계산)
  const settings = { name: "", ai: { level: "hard", count: 5 }, helper: "none", hue: 48, gameMode: "free", hz: 14 };
  const hostPlayers = new Map();                                 // 방장: 들어온 친구들 (새 판 시작할 때 다시 넣기)

  fetch("brains.json?v=v2a-2m").then(r => r.json()).then(b => { BRAINS = b; });

  // ── 메뉴 선택지
  try { settings.name = localStorage.getItem("snake-name") || ""; const h = localStorage.getItem("snake-hue"); if (h != null) settings.hue = Number(h); } catch (e) {}
  $("name").value = settings.name;
  // 내 색 고르기 (기억해 둠)
  const HUES = [[48, "노랑"], [25, "주황"], [0, "빨강"], [330, "분홍"], [285, "보라"], [230, "파랑"], [195, "하늘"], [165, "청록"], [120, "초록"], [85, "연두"]];
  $("colors").innerHTML = HUES.map(([h, n]) => `<button type="button" class="sw" role="radio" data-h="${h}" aria-label="${n}" title="${n}" style="background:radial-gradient(circle at 38% 35%, hsl(${h},85%,72%), hsl(${h},80%,50%) 55%, hsl(${h},75%,28%))"></button>`).join("");
  const markColor = () => $("colors").querySelectorAll(".sw").forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.h) === settings.hue)));
  $("colors").querySelectorAll(".sw").forEach(b => b.addEventListener("click", () => { settings.hue = Number(b.dataset.h); try { localStorage.setItem("snake-hue", settings.hue); } catch (e) {} markColor(); }));
  markColor();
  const seg = (id, key, cast = v => v) => $(id).querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => {
    $(id).querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    key(cast(b.dataset.v));
  }));
  seg("aiLevel", v => settings.ai.level = v);
  seg("aiCount", v => settings.ai.count = v, Number);
  seg("helperSel", v => settings.helper = v);
  const MODE_HELP = { free: "언제든 들어오고 나가는 기본 방식이에요.", round: "3분 동안 가장 길게 자란 지렁이가 1등. 죽어도 다시 시작할 수 있어요.",
    royale: "20초 뒤부터 경기장이 점점 줄어요(밖으로 나가면 탈락). 부활 없이 마지막까지 살아남으면 승리!" };
  seg("speedSel", v => settings.hz = v, Number);
  seg("gameMode", v => { settings.gameMode = v; $("modeHelp").textContent = MODE_HELP[v]; });
  const roomParam = new URLSearchParams(location.search).get("room");
  if (roomParam) $("code").value = roomParam.toUpperCase();
  const msg = t => { $("msg").textContent = t; };

  function myName() { const n = ($("name").value || "").trim() || "나"; settings.name = n; try { localStorage.setItem("snake-name", n); } catch (e) {} return n; }
  function aiList() {
    const n = settings.ai.count, lv = settings.ai.level;
    const mix = ["hard", "mid", "rule", "easy", "raw", "hard", "rule", "mid"];
    return Array.from({ length: n }, (_, i) => lv === "mix" ? mix[i % mix.length] : lv);
  }
  function addAIs() {
    aiList().forEach((k, i) => { const K = SNK.AI_KINDS[k]; sim.add("ai" + i, k, `${K.name} ${i + 1}`, (K.hue + i * 23) % 360); });
  }

  // ── 시작
  function enterGame() {
    $("menu").hidden = true; ["lb", "me", "topbtn"].forEach(id => $(id).hidden = false);
    $("boost").hidden = !matchMedia("(pointer: coarse)").matches;
    RND.resize();
    clientAC = AC.client(input);
    if (settings.helper !== "none") loadHelper(settings.helper);
    NET.init().then(updateAdminButtons).catch(() => {});
  }
  function startSolo() {
    if (!BRAINS) return msg("AI 불러오는 중… 잠시 뒤 다시");
    mode = "solo"; meId = "me";
    HZ = settings.hz; sim = new SNK.Sim(BRAINS, settings.gameMode); sim.hz = HZ;
    const me = sim.add("me", "human", myName(), settings.hue); me.helper = settings.helper !== "none";
    sim.inputs.me = input;
    addAIs(); enterGame(); $("myAc").hidden = false;
    clearInterval(tickTimer); tickTimer = setInterval(stepSim, 1000 / HZ);
    startReports("solo");
  }
  async function startHost() {
    if (!BRAINS) return msg("AI 불러오는 중… 잠시 뒤 다시");
    msg("방 만드는 중…");
    try {
      await NET.init();
      mode = "host"; meId = NET.uid;
      HZ = settings.hz; sim = new SNK.Sim(BRAINS, settings.gameMode); sim.hz = HZ; hostPlayers.clear();
      const me = sim.add(meId, "human", myName(), settings.hue); me.helper = settings.helper !== "none";
      sim.inputs[meId] = input;
      addAIs();
      hostCtl = await NET.host({ name: settings.name, hue: settings.hue, helper: me.helper, ai: settings.ai }, sim, {
        join(uid, p) { hostPlayers.set(uid, p); if (!sim.snakes.find(s => s.id === uid)) { const s = sim.add(uid, "human", p.name || "친구", p.hue ?? 200); s.helper = !!p.helper; } },
        update(uid, p) { hostPlayers.set(uid, p); const s = sim.snakes.find(x => x.id === uid); if (s) s.helper = !!p.helper; },
        leave(uid) { hostPlayers.delete(uid); sim.remove(uid); behaviors.delete(uid); },
      });
      enterGame(); showRoom(hostCtl.code, true);
      clearInterval(tickTimer); tickTimer = setInterval(stepSim, 1000 / HZ);
      startReports(hostCtl.code);
    } catch (e) { msg("방을 못 만들었어요: " + (e.message || e)); }
  }
  async function startJoin() {
    const code = ($("code").value || "").trim().toUpperCase();
    if (code.length !== 4) return msg("방 코드 4자리를 넣어 주세요");
    msg("들어가는 중…");
    try {
      await NET.init();
      mode = "client"; meId = NET.uid; stateK = -1;
      remote.snakes.clear(); remote.food = [];
      joinCtl = await NET.join(code, { name: myName(), hue: settings.hue, helper: settings.helper !== "none" }, {
        state: onState, sync: onSync, closed() { alert("방장이 나가서 방이 끝났어요"); backToMenu(); },
      });
      enterGame(); showRoom(code, false);
      clearInterval(tickTimer); tickTimer = setInterval(() => { clientAC.onStep(performance.now()); joinCtl.sendInput(input); }, 50);
      startReports(code);
    } catch (e) { msg(e.message || String(e)); mode = "menu"; }
  }
  function showRoom(code, isHost) {
    const el = $("room"); el.hidden = false;
    const link = location.origin + location.pathname + "?room=" + code;
    el.innerHTML = `<span class="chip">방 ${code}${isHost ? " · 방장" : ""}</span> <button class="btn" type="button" style="padding:5px 8px;font-size:12px">링크 복사</button><div class="small" id="netInfo" style="margin-top:4px"></div>`;
    el.querySelector("button").onclick = () => navigator.clipboard.writeText(link).then(() => el.querySelector("button").textContent = "복사됨", () => prompt("이 링크를 보내세요", link));
  }
  function backToMenu() {
    clearInterval(tickTimer); clearInterval(reportTimer);
    if (hostCtl) { hostCtl.leave(); hostCtl = null; }
    if (joinCtl) { joinCtl.leave(); joinCtl = null; }
    mode = "menu"; sim = null; behaviors.clear(); paused = false; respawnedAtDeaths = 0; stopSpectate(); remote.g = null;
    $("menu").hidden = false; ["lb", "me", "topbtn", "room", "boost", "dead", "pause", "admin", "myAc", "timer", "results"].forEach(id => $(id).hidden = true);
    if (window.__snakeHelper) window.__snakeHelper.off();
    msg("");
  }

  // ── 한 틱 (혼자·방장)
  let lastTickAt = 0, lastStateAt = 0;
  function stepSim() {
    if (paused) return;
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
    if (hostCtl) hostCtl.tick();
  }

  // ── 참가자: 방장이 보낸 상태로 화면 만들기 (v2: 몸은 방장과 같은 '따라가는 몸' 계산을 머리 위치로 따라 함)
  function ensure(id) { let s = remote.snakes.get(id); if (!s) { s = { id, kind: "?", name: "", hue: 200, helper: false, body: [], head: [0, 0], ang: 0, length: 10, alive: true, boosting: false, deaths: 0, kills: 0, pts: [], prev: null }; remote.snakes.set(id, s); } return s; }
  const cutPts = s => s.body.slice(1, 1 + Math.floor(s.length));
  function onSync(v) {
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
    if (v.k <= stateK) return;                                              // 직접 연결은 순서가 바뀌어 올 수 있음 → 옛것 버림
    stateGap = Math.max(1, Math.min(4, v.k - stateK)); stateK = v.k;
    lastStateAt = performance.now();
    if (v.g) { remote.g = v.g; if (v.g.hz) tickMs = 1000 / v.g.hz; }
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
    const lat = (joinCtl && joinCtl.p2p ? (joinCtl.rtt || 40) / 2 : 120) + (now - lastStateAt);
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
  let hudAt = 0;
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
        const win = g.res[0];
        $("resTitle").textContent = win ? (win.id === meId ? "🏆 우승!" : `🏆 ${win.name} 우승`) : "결과";
        $("resList").innerHTML = g.res.slice(0, 10).map(r => `<li style="${r.id === meId ? "color:var(--me);font-weight:700" : ""}">${esc(r.name)} <span class="small">길이 ${r.len} · 잡음 ${r.kills}${g.mode === "royale" ? (r.alive ? " · 생존" : " · 탈락") : ""}</span></li>`).join("");
        $("again").hidden = mode === "client";
        $("resNote").textContent = mode === "client" ? "방장이 다시 시작하면 바로 이어져요." : g.mode === "round" ? "순위 = 라운드가 끝날 때 길이 (순위표와 같음)" : "순위 = 살아남은 순서";
        $("results").hidden = false;
      }
    } else $("results").hidden = true;
  }
  function hud() {
    modeHud();
    $("me").style.top = ($("lb").offsetTop + $("lb").offsetHeight + 6) + "px";   // 내 정보는 순위표 바로 아래
    const all = list().filter(s => s.alive).sort((a, b) => b.length - a.length);
    $("lb").querySelector("ol").innerHTML = all.slice(0, 10).map(s => `<li class="${s.id === meId ? "me" : ""}">${(s.helper ? "🧪" : "") + esc(s.name)} <span style="float:right">${Math.floor(s.length)}</span></li>`).join("");
    const me = list().find(s => s.id === meId);
    if (me) {
      const rank = all.indexOf(me) + 1;
      const boostTxt = input.boost ? (me.length > C.L_MIN + 1 ? " · <b style='color:var(--me);font-size:13px'>부스트</b>" : " · <span style='color:var(--danger)'>부스트 불가 (길이 7 이하)</span>") : "";
      $("me").innerHTML = `내 길이 <b>${Math.floor(me.length)}</b> · 순위 ${rank || "-"}/${all.length}<br><span class="small">죽음 ${me.deaths} · 잡음 ${me.kills}${boostTxt}</span>`;
      if (spectating) { const t = list().find(x => x.id === specId); if (!t || !t.alive) cycleSpec(1); }
      const showDead = !me.alive && me.deaths > respawnedAtDeaths && $("pause").hidden && !spectating && !gs().over;   // '새로 시작'을 누른 뒤 또 죽기 전까지는 안 띄움
      if (showDead && $("dead").hidden) {
        const royale = gs().mode === "royale";
        $("deadMsg").textContent = royale ? `탈락! 길이 ${Math.floor(me.length)} · 잡은 수 ${me.kills}. 관전하며 끝까지 볼 수 있어요.` : `최고 길이 ${Math.floor(me.best || me.length)} · 잡은 수 ${me.kills} · 죽은 횟수 ${me.deaths}`;
        $("respawn").hidden = royale; $("deadNote").hidden = royale;
      }
      $("dead").hidden = !showDead;
    }
    if (!$("admin").hidden) renderAdmin();
    // 연결 상태 표시: 직접 연결(WebRTC)인지, Firebase(싱가포르) 경유인지
    const net = $("netInfo");
    if (net) {
      if (mode === "client" && joinCtl) net.textContent = joinCtl.p2p ? `직접 연결 · ${Math.round(joinCtl.rtt || 0)}ms` : "Firebase 경유 (직접 연결 시도 중)";
      else if (mode === "host" && hostCtl) { const ps = hostCtl.peers(); net.textContent = ps.length ? `친구 ${ps.length}명 · 직접 연결 ${ps.filter(p => p[1]).length}명` : "친구를 기다리는 중"; }
    }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ── 입력: PC 마우스 / 휴대폰 손가락 / 키보드
  const cv = RND.canvas, coarse = matchMedia("(pointer: coarse)").matches;
  // 마우스·손가락은 '화면 가운데(=내 머리)에서 본 방향'으로 조준 (slither 방식). 바닥의 한 점을 노리면 그 점 주위를 빙빙 돎
  const aimFrom = e => { const r = cv.getBoundingClientRect(); return Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2)); };
  cv.addEventListener("pointermove", e => { clientAC && clientAC.onEvent("move", e); input.aim = aimFrom(e); input.target = null; });
  cv.addEventListener("pointerdown", e => {
    clientAC && clientAC.onEvent("down", e); input.aim = aimFrom(e); input.target = null;
    if (e.pointerType === "mouse") input.boost = true;                     // 휴대폰은 손가락이 늘 닿아 있으니 부스트는 버튼으로
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener("pointerup", e => { clientAC && clientAC.onEvent("up", e); if (e.pointerType === "mouse") input.boost = false; });
  const bb = $("boost");
  bb.addEventListener("pointerdown", e => { e.preventDefault(); input.boost = true; bb.classList.add("on"); clientAC && clientAC.onEvent("key", e); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => bb.addEventListener(t, () => { input.boost = false; bb.classList.remove("on"); }));
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

  // ── 감지 기록: 5초마다 관리자 전용 위치에 (혼자: solo, 같이: 방 코드)
  function startReports(roomKey) {
    clearInterval(reportTimer);
    reportTimer = setInterval(() => {
      if (!NET.ready || !NET.uid) return;
      const c = clientAC.summary();
      NET.report(roomKey, NET.uid, "client", { name: settings.name, mode, helperDeclared: settings.helper, score: AC.total(c.sig), sig: c.sig.map(s => [s[0], s[1] ? 1 : 0, s[2]]) });
      if (mode !== "client") for (const s of sim.snakes) if (s.kind === "human") {
        const b = behaviors.get(s.id); if (!b) continue; const sm = b.summary();
        const uid = s.id === "me" ? NET.uid : s.id;
        NET.report(roomKey, uid, "host", { name: s.name, score: AC.total(sm.sig), sig: sm.sig.map(x => [x[0], x[1] ? 1 : 0, x[2]]) });
      }
    }, 5000);
  }

  // ── 관리자
  function updateAdminButtons() { /* 로그인 상태는 패널 열 때 확인 */ }
  async function openAdmin() {
    try { await NET.init(); } catch (e) { return alert("Firebase 연결 실패: " + e.message); }
    if (!NET.isAdmin) { $("login").hidden = false; $("pw").value = ""; $("pw").focus(); return; }
    $("admin").hidden = !$("admin").hidden;
    if (!$("admin").hidden) { if (!adminWatching) { adminWatching = true; NET.watchReports(v => { adminReports = v; renderAdmin(); }); NET.watchRooms(v => { adminRooms = v; renderAdmin(); }); } renderAdmin(); }
  }
  let adminWatching = false, adminReports = {}, adminRooms = {};
  $("adminBtn").onclick = openAdmin; $("adminBtn2").onclick = openAdmin;
  $("loginCancel").onclick = () => { $("login").hidden = true; };
  $("loginGo").onclick = async () => {
    const pw = $("pw").value; if (!pw) return;
    $("loginMsg").textContent = "확인 중…";
    try { await NET.adminLogin(pw); $("pw").value = ""; $("login").hidden = true; openAdmin(); }
    catch (e) { $("loginMsg").textContent = (e && e.message) || "들어가지 못했어요"; }
  };
  $("pw").addEventListener("keydown", e => { if (e.key === "Enter") $("loginGo").click(); });

  function sigList(sig) { return `<ul>${(sig || []).map(s => `<li class="${s[1] ? "on" : ""}">${s[1] ? "●" : "○"} ${esc(s[0])} — ${esc(s[2])}</li>`).join("")}</ul>`; }
  function scoreHTML(n) { const v = AC.verdict(n); return `<span class="sc v-${v[1]}">${n}</span><span class="v-${v[1]}">${v[0]}</span>`; }
  function renderAdmin() {
    const el = $("admin"); if (el.hidden) return;
    let h = `<h2>관리자 · 헬퍼 감지기</h2><p class="small">플레이어 컴퓨터가 본 신호(가짜 입력·변조·주입)와, 게임을 계산하는 쪽이 본 행동 신호(반응 속도·회피율)를 합쳐 판단합니다. 플레이어에겐 안 보여요.</p>`;
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
    h += `<b>열린 방 ${rooms.length}개</b>` + rooms.map(([k, r]) => `<div class="small">${k} · 사람 ${Object.keys(r.players || {}).length}명 · AI ${r.meta && r.meta.ai ? r.meta.ai.count + "(" + r.meta.ai.level + ")" : "-"}</div>`).join("");
    const rep = adminReports || {};
    if (rep.__error) h += `<p class="small v-hot">기록 읽기 실패: ${esc(rep.__error)}</p>`;
    else {
      h += `<b>최근 기록</b>`;
      for (const [room, people] of Object.entries(rep).reverse()) for (const [uid, p] of Object.entries(people || {})) {
        const cl = p.client || {}, ho = p.host || {}, sig = (cl.sig || []).concat(ho.sig || []);
        const n = Math.min(100, sig.reduce((a, s) => a + (s[1] ? ({ "가짜": 40, "입력": 35, "주입": 20, "반응": 25, "위험": 10 }[s[0].slice(0, 2)] || 15) : 0), 0));
        const when = Math.max(cl.t || 0, ho.t || 0);
        h += `<div class="acrow"><div class="top">${scoreHTML(n)}<b>${esc(cl.name || ho.name || uid.slice(0, 6))}</b><span class="small">${room === "solo" ? "혼자" : "방 " + room} · ${when ? new Date(when).toLocaleTimeString() : ""}${cl.helperDeclared && cl.helperDeclared !== "none" ? " · 🧪 헬퍼 켬(" + esc(cl.helperDeclared) + ")" : ""}</span></div>${sigList(sig)}</div>`;
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
    const n = AC.total(all), v = AC.verdict(n);
    alert(`내 의심 점수 ${n} (${v[0]})\n\n` + all.map(s => `${s[1] ? "●" : "○"} ${s[0]} — ${s[2]}`).join("\n") + "\n\n" + clientAC.summary().log.join("\n"));
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

  $("solo").onclick = startSolo; $("hostBtn").onclick = startHost; $("joinBtn").onclick = startJoin;

  // ── 죽었을 때: 다시 태어날지 묻기 / ESC: 멈춤 메뉴
  let respawnedAtDeaths = 0, spectating = false, specId = null;
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
    const s = list().find(x => x.id === specId);
    $("spec").hidden = false;
    $("spec").innerHTML = `관전 중: <b>${s ? esc(s.name) : "-"}</b> · ←→ 다른 지렁이 · <button class="btn" type="button" id="specGo" style="padding:5px 9px;font-size:12px">새로 시작 (Space)</button>`;
    $("specGo").onclick = respawn;
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
    $("newGame").hidden = mode === "client";
    $("pauseNote").textContent = mode === "solo" ? "게임이 멈춰 있어요." : "친구들과 하는 중이라 게임은 계속 진행돼요.";
    if (on) $("dead").hidden = true;
  }
  $("toMenu").onclick = () => setPause(true);
  $("resume").onclick = () => setPause(false);
  $("quit").onclick = () => { setPause(false); backToMenu(); };
  $("pauseAdmin").onclick = () => { setPause(false); openAdmin(); };
  // 새 판: 혼자는 처음부터, 방장은 같은 방에서 친구들 그대로 새 판 (라운드·배틀로얄 다시 하기)
  function newGame() {
    setPause(false); $("results").hidden = true;
    if (mode === "solo") { backToMenu(); startSolo(); return; }
    if (mode !== "host") return;
    const old = sim, next = new SNK.Sim(BRAINS, old.mode); next.hz = HZ;
    next.inputs = old.inputs;
    const me = next.add(meId, "human", settings.name, settings.hue); me.helper = settings.helper !== "none";
    for (const [uid, p] of hostPlayers) { const s = next.add(uid, "human", p.name || "친구", p.hue ?? 200); s.helper = !!p.helper; }
    sim = next; addAIs(); behaviors.clear(); respawnedAtDeaths = 0; stopSpectate();
    hostCtl.setSim(next);
  }
  $("again").onclick = newGame;
  $("resMenu").onclick = () => { $("results").hidden = true; backToMenu(); };
  $("newGame").onclick = newGame;
  window.addEventListener("keydown", e => {
    const ok = e.key === "Enter" || e.key === " ";
    if (mode === "menu") {                                                // 첫 메뉴: Space/Enter = 혼자 연습 (이름 칸에서 Enter도)
      if (ok && $("login").hidden && (e.target.tagName !== "INPUT" || (e.key === "Enter" && e.target.id === "name"))) { e.preventDefault(); startSolo(); }
      return;
    }
    if (e.target.tagName === "INPUT") return;
    if (e.key === "Escape") { setPause($("pause").hidden); e.preventDefault(); return; }
    if (spectating && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { cycleSpec(e.key === "ArrowRight" ? 1 : -1); e.preventDefault(); return; }
    if (ok && (!$("dead").hidden || spectating)) { e.preventDefault(); if (!e.repeat) respawn(); return; }
    if (ok && !$("results").hidden) { e.preventDefault(); if (mode !== "client" && !e.repeat) newGame(); return; }
    if (ok && !$("pause").hidden) { e.preventDefault(); if (mode === "solo") newGame(); else setPause(false); }
  });

  // ── 헬퍼가 읽는 공개 변수 (실제 slither.io 클라이언트가 상태를 전역 변수에 두던 것과 같은 구조)
  window.game = {
    get snakes() { return list(); }, get food() { return foods(); }, get me() { return list().find(s => s.id === meId); },
    input, consts: C,
    view: { canvas: RND.canvas, get scale() { return RND.cam.ppu; }, toScreen: RND.toScreen, toWorld: RND.toWorld, set zoom(z) { RND.cam.zoom = z; }, get zoom() { return RND.cam.zoom; } },
    get zoneR() { return gs().R; },
    get hz() { return HZ; },
  };
})();

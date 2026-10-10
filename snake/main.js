/* 지렁이 대결 — 화면 연결: 메뉴, 혼자/방장/참가, 입력(PC·휴대폰), 순위표, 관리자 패널, 헬퍼, 그리고 헬퍼가 읽는 window.game */
(() => {
  const { C } = SNK;
  const $ = id => document.getElementById(id);
  const HZ = 20;
  let BRAINS = null, mode = "menu", sim = null, meId = "me", hostCtl = null, joinCtl = null, tickTimer = null, reportTimer = null;
  const input = { target: null, boost: false, turn: 0, respawn: 0, _own: false };
  let paused = false;
  const remote = { snakes: new Map(), food: [] };                 // 참가자 화면용
  let clientAC = null;
  const behaviors = new Map();                                   // 지렁이별 행동 감지 (혼자/방장이 계산)
  const settings = { name: "", ai: { level: "hard", count: 5 }, helper: "none", hue: 48 };

  fetch("brains.json").then(r => r.json()).then(b => { BRAINS = b; });

  // ── 메뉴 선택지
  try { settings.name = localStorage.getItem("snake-name") || ""; } catch (e) {}
  $("name").value = settings.name;
  const seg = (id, key, cast = v => v) => $(id).querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => {
    $(id).querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    key(cast(b.dataset.v));
  }));
  seg("aiLevel", v => settings.ai.level = v);
  seg("aiCount", v => settings.ai.count = v, Number);
  seg("helperSel", v => settings.helper = v);
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
    sim = new SNK.Sim(BRAINS);
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
      sim = new SNK.Sim(BRAINS);
      const me = sim.add(meId, "human", myName(), settings.hue); me.helper = settings.helper !== "none";
      sim.inputs[meId] = input;
      addAIs();
      hostCtl = await NET.host({ name: settings.name, hue: settings.hue, helper: me.helper, ai: settings.ai }, sim, {
        join(uid, p) { if (!sim.snakes.find(s => s.id === uid)) { const s = sim.add(uid, "human", p.name || "친구", p.hue ?? 200); s.helper = !!p.helper; } },
        update(uid, p) { const s = sim.snakes.find(x => x.id === uid); if (s) s.helper = !!p.helper; },
        leave(uid) { sim.remove(uid); behaviors.delete(uid); },
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
      mode = "client"; meId = NET.uid;
      remote.snakes.clear(); remote.food = [];
      joinCtl = await NET.join(code, { name: myName(), hue: (settings.hue + 137 * Math.random()) % 360, helper: settings.helper !== "none" }, {
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
    el.innerHTML = `<span class="chip">방 ${code}${isHost ? " · 방장" : ""}</span> <button class="btn" type="button" style="padding:5px 8px;font-size:12px">링크 복사</button>`;
    el.querySelector("button").onclick = () => navigator.clipboard.writeText(link).then(() => el.querySelector("button").textContent = "복사됨", () => prompt("이 링크를 보내세요", link));
  }
  function backToMenu() {
    clearInterval(tickTimer); clearInterval(reportTimer);
    if (hostCtl) { hostCtl.leave(); hostCtl = null; }
    if (joinCtl) { joinCtl.leave(); joinCtl = null; }
    mode = "menu"; sim = null; behaviors.clear(); paused = false; respawnedAtDeaths = 0;
    $("menu").hidden = false; ["lb", "me", "topbtn", "room", "boost", "dead", "pause", "admin", "myAc"].forEach(id => $(id).hidden = true);
    if (window.__snakeHelper) window.__snakeHelper.off();
    msg("");
  }

  // ── 한 틱 (혼자·방장)
  let lastTickAt = 0, lastStateAt = 0;
  function stepSim() {
    if (paused) return;
    const now = performance.now();
    lastTickAt = now;
    if (hostCtl) hostCtl.recordHeads();
    sim.step(now, {
      human(s, a, obsFn) {
        let b = behaviors.get(s.id); if (!b) { b = AC.behavior(); behaviors.set(s.id, b); }
        b.onStep(obsFn(), a, now);
        if (s.id === meId) clientAC.onStep(now);
      },
      death(s) { const b = behaviors.get(s.id); if (b) b.onDeath(); },
    });
    if (hostCtl) { hostCtl.recordHeads(); if (sim.tick % 2 === 0) hostCtl.broadcast(); }
  }

  // ── 참가자: 방장이 보낸 상태로 화면 만들기
  function ensure(id) { let s = remote.snakes.get(id); if (!s) { s = { id, kind: "?", name: "", hue: 200, helper: false, trail: [], head: [0, 0], ang: 0, length: 10, alive: true, boosting: false, deaths: 0, kills: 0, pts: [] }; remote.snakes.set(id, s); } return s; }
  function rebuildPts(s) { const n = Math.min(Math.floor(s.length), C.T_TRAIL / C.SPACING), pts = []; for (let i = 0; i < n; i++) { const p = s.trail[C.SPACING * (i + 1)]; if (!p) break; pts.push(p); } s.pts = pts; }
  function onSync(v) {
    if (v.f) remote.food = v.f;
    for (const [id, inf] of Object.entries(v.info || {})) { const s = ensure(id); [s.kind, s.name, s.hue, s.helper] = [inf[0], inf[1], inf[2], !!inf[3]]; }
    for (const [id, flat] of Object.entries(v.b || {})) {          // 4틱 간격 몸 마디 → 1틱 간격 자취로 채우기
      const s = ensure(id); const pts = []; for (let i = 0; i + 1 < (flat || []).length; i += 2) pts.push([flat[i], flat[i + 1]]);
      // 이미 자취가 충분하고 몸 끝이 거의 맞으면 그대로 둠 (1.5초마다 몸이 툭 바뀌어 보이는 것 방지)
      const need = Math.floor(s.length) * C.SPACING + 2, tail = pts[pts.length - 1], mine = s.trail[Math.min(s.trail.length - 1, 2 + 4 * (pts.length - 1))];
      if (s.trail.length >= need && tail && mine && Math.hypot(tail[0] - mine[0], tail[1] - mine[1]) < 1.5) continue;
      const tr = [s.head]; const marks = [[0, s.head], ...pts.map((p, j) => [2 + 4 * j, p])];
      for (let m = 1; m < marks.length; m++) { const [t0, a] = marks[m - 1], [t1, b] = marks[m]; for (let t = t0 + 1; t <= t1; t++) { const u = (t - t0) / (t1 - t0); tr[t] = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } }
      s.trail = tr; rebuildPts(s);
    }
    for (const id of [...remote.snakes.keys()]) if (v.info && !v.info[id]) remote.snakes.delete(id);
  }
  function onState(v) {
    lastStateAt = performance.now();
    for (const e of v.s || []) {
      const s = ensure(e[0]);
      const wasAlive = s.alive;
      s.ang = e[5]; s.length = e[6] / 10; s.alive = !!e[7]; s.boosting = !!e[8]; s.deaths = e[9]; s.kills = e[10];
      if (s.alive && !wasAlive) s.trail = [];
      s.trail.unshift([e[1], e[2]]); s.trail.unshift([e[3], e[4]]);
      if (s.trail.length > C.T_TRAIL) s.trail.length = C.T_TRAIL;
      s.head = s.trail[0]; rebuildPts(s);
      if (s.id === meId) s.best = Math.max(s.best || 0, s.length);
    }
    for (const f of v.fd || []) remote.food[f[0]] = [f[1], f[2], f[3]];
  }

  // ── 화면 그리기 (초당 60번)
  const list = () => mode === "client" ? [...remote.snakes.values()] : (sim ? sim.snakes : []);
  const foods = () => mode === "client" ? remote.food : (sim ? sim.food : []);
  // 보간: 게임 계산(초당 20번, 참가자는 받는 게 초당 10번) 사이를 자취 위에서 부드럽게 이어 그림
  //   혼자·방장: 한 틱(0.05초) 뒤를 그림 / 참가자: 세 틱(0.15초) 뒤를 그려 통신 흔들림까지 흡수
  function displayList(now) {
    const T = C.T_TRAIL, SP = C.SPACING, client = mode === "client";
    const k = client ? Math.max(0, Math.min(3, 3 - (now - lastStateAt) / 50)) : Math.max(0, Math.min(1, 1 - (now - lastTickAt) / (1000 / HZ)));
    const at = client ? (s, i) => s.trail[Math.min(i, s.trail.length - 1)] : (s, i) => s.trail[((s.ptr - i) % T + T) % T];
    const lerp = (s, x) => { const i = Math.floor(x), f = x - i, a = at(s, i), b = at(s, i + 1); if (!a) return null; if (!b || !f) return a; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
    return list().map(s => {
      if (!s.alive || !s.trail || !s.trail.length) return s;
      const head = lerp(s, k) || s.head, back = lerp(s, k + 1) || head;
      const n = Math.min(Math.floor(s.length), T / SP), pts = [];
      for (let i = 0; i < n; i++) { const p = lerp(s, k + SP * (i + 1)); if (!p) break; pts.push(p); }
      const ang = Math.hypot(head[0] - back[0], head[1] - back[1]) > 1e-6 ? Math.atan2(head[1] - back[1], head[0] - back[0]) : s.ang;
      return { id: s.id, name: s.name, hue: s.hue, helper: s.helper, boosting: s.boosting, alive: true, length: s.length, ang, head, pts };
    });
  }
  let hudAt = 0;
  function loop(t) {
    if (mode !== "menu") {
      RND.frame(displayList(t), foods(), meId);
    } else RND.frame([], sim ? sim.food : demoFood, null);
    requestAnimationFrame(loop);
  }
  const demoFood = Array.from({ length: 120 }, () => { const r = 38 * Math.sqrt(Math.random()), a = Math.random() * 6.283; return [r * Math.cos(a), r * Math.sin(a), SNK.FOOD_HUES[Math.floor(Math.random() * 9)]]; });
  requestAnimationFrame(loop);
  setInterval(() => { if (mode !== "menu") hud(); }, 250);
  function hud() {
    const all = list().filter(s => s.alive).sort((a, b) => b.length - a.length);
    $("lb").querySelector("ol").innerHTML = all.slice(0, 10).map(s => `<li class="${s.id === meId ? "me" : ""}">${(s.helper ? "🧪" : "") + esc(s.name)} <span style="float:right">${Math.floor(s.length)}</span></li>`).join("");
    const me = list().find(s => s.id === meId);
    if (me) {
      const rank = all.indexOf(me) + 1;
      const boostTxt = input.boost ? (me.length > C.L_MIN + 1 ? " · <b style='color:var(--me);font-size:13px'>부스트</b>" : " · <span style='color:var(--danger)'>부스트 불가 (길이 7 이하)</span>") : "";
      $("me").innerHTML = `내 길이 <b>${Math.floor(me.length)}</b> · 순위 ${rank || "-"}/${all.length}<br><span class="small">죽음 ${me.deaths} · 잡음 ${me.kills}${boostTxt}</span>`;
      const showDead = !me.alive && me.deaths > respawnedAtDeaths && $("pause").hidden;   // '다시 태어나기'를 누른 뒤 또 죽기 전까지는 안 띄움
      if (showDead && $("dead").hidden) $("deadMsg").textContent = `최고 길이 ${Math.floor(me.best || me.length)} · 잡은 수 ${me.kills} · 죽은 횟수 ${me.deaths}`;
      $("dead").hidden = !showDead;
    }
    if (!$("admin").hidden) renderAdmin();
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
    window.__helperPreset = { radar: true, arrow: true, guard: kind === "guard", auto: kind === "auto", how: "var", human: false, declared: true };
    if (window.__snakeHelper) { window.__snakeHelper.apply(window.__helperPreset); return; }
    const s = document.createElement("script"); s.src = "helper.js?" + Date.now(); document.body.appendChild(s);
  }

  $("solo").onclick = startSolo; $("hostBtn").onclick = startHost; $("joinBtn").onclick = startJoin;

  // ── 죽었을 때: 다시 태어날지 묻기 / ESC: 멈춤 메뉴
  let respawnedAtDeaths = 0;
  function respawn() { input.respawn++; const me = list().find(s => s.id === meId); respawnedAtDeaths = me ? me.deaths : 0; $("dead").hidden = true; }
  $("respawn").onclick = respawn;
  $("deadMenu").onclick = backToMenu;
  function setPause(on) {
    if (mode === "menu") return;
    paused = on && mode === "solo";                                       // 친구랑 할 땐 다른 사람이 있어 멈추지 않음
    $("pause").hidden = !on;
    $("pauseTitle").textContent = mode === "solo" ? "잠깐 멈춤" : "메뉴";
    $("newGame").hidden = mode !== "solo";
    $("pauseNote").textContent = mode === "solo" ? "게임이 멈춰 있어요." : "친구들과 하는 중이라 게임은 계속 진행돼요.";
    if (on) $("dead").hidden = true;
  }
  $("toMenu").onclick = () => setPause(true);
  $("resume").onclick = () => setPause(false);
  $("quit").onclick = () => { setPause(false); backToMenu(); };
  $("pauseAdmin").onclick = () => { setPause(false); openAdmin(); };
  function newGame() { const m = mode; setPause(false); if (m === "solo") { backToMenu(); startSolo(); } }
  $("newGame").onclick = newGame;
  window.addEventListener("keydown", e => {
    const ok = e.key === "Enter" || e.key === " ";
    if (mode === "menu") {                                                // 첫 메뉴: Space/Enter = 혼자 연습 (이름 칸에서 Enter도)
      if (ok && $("login").hidden && (e.target.tagName !== "INPUT" || (e.key === "Enter" && e.target.id === "name"))) { e.preventDefault(); startSolo(); }
      return;
    }
    if (e.target.tagName === "INPUT") return;
    if (e.key === "Escape") { setPause($("pause").hidden); e.preventDefault(); return; }
    if (ok && !$("dead").hidden) { respawn(); e.preventDefault(); return; }
    if (ok && !$("pause").hidden) { e.preventDefault(); if (mode === "solo") newGame(); else setPause(false); }
  });

  // ── 헬퍼가 읽는 공개 변수 (실제 slither.io 클라이언트가 상태를 전역 변수에 두던 것과 같은 구조)
  window.game = {
    get snakes() { return list(); }, get food() { return foods(); }, get me() { return list().find(s => s.id === meId); },
    input, consts: C,
    view: { canvas: RND.canvas, get scale() { return RND.cam.ppu; }, toScreen: RND.toScreen, toWorld: RND.toWorld },
    hz: HZ,
  };
})();

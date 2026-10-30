/* 바둑 — 화면·조작: 메뉴 · 판 그리기(캔버스) · 터치/마우스/키보드 · 계가 · AI 워커 연결
   규칙은 core.js(Baduk), AI 는 worker.js(신경망·수읽기). 화면은 상태와 play() 가 돌려준 events 만 읽음
   누가 두는지는 G.players[색] = "human" | "ai" (나중에 "remote" 를 끼우면 친구랑 대국) */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const B = window.Baduk, Z = window.Cozy, esc = Z.esc;
  const { BLACK, WHITE } = B;
  const store = (k, d) => Z.store("baduk." + k, d), save = (k, v) => Z.save("baduk." + k, v);
  const sfx = (n, o) => Z.sfx.play(n, o);
  const colorName = c => (c === BLACK ? "흑" : "백");
  const stoneEm = c => `<span class="st ${c === BLACK ? "b" : "w"} mini"></span>`;   // 이모지 대신 그린 돌 (기기마다 모양이 달라서)
  const fmtN = v => (Math.round(v * 10) / 10).toString();

  // ── 소리 (돌 '탁' · 따냄 · 패스 · 단수 · 힌트)
  Z.sfx.add("stone", (t, o, S) => {
    const k = o.pitch || 1;
    S.noise(t, 0.04, { vol: 0.6, type: "bandpass", f: 2400 * k, q: 3.2 });
    S.tone(t, 160 * k, 0.07, { vol: 0.3, f2: 92 });
    S.tone(t + 0.003, 1150 * k, 0.025, { type: "triangle", vol: 0.05 });
  });
  Z.sfx.add("cap", (t, o, S) => { const u = Math.pow(1.07, Math.min(8, o.i || 0)); S.tone(t, 880 * u, 0.1, { type: "triangle", vol: 0.1 }); S.noise(t, 0.025, { vol: 0.18, type: "highpass", f: 3200 }); });
  Z.sfx.add("passS", (t, o, S) => { S.noise(t, 0.2, { vol: 0.12, type: "bandpass", f: 600, f2: 1700, q: 0.8 }); S.tone(t + 0.03, 560, 0.14, { vol: 0.07, f2: 440 }); });
  Z.sfx.add("atari", (t, o, S) => { S.tone(t, 988, 0.08, { type: "triangle", vol: 0.08 }); S.tone(t + 0.11, 784, 0.13, { type: "triangle", vol: 0.08 }); });
  Z.sfx.add("hint", (t, o, S) => { [S.N.A5, S.N.E6].forEach((f, i) => S.tone(t + i * 0.07, f, 0.18, { vol: 0.09 })); });
  Z.sfx.add("toggle", (t, o, S) => S.tone(t, o.on ? 720 : 480, 0.07, { type: "triangle", vol: 0.09 }));

  // ── 설정
  const TIERS = {
    easy: { id: "easy", ...Z.TIERS.easy, desc: "처음 배우는 분께 · 실수도 해요" },
    normal: { id: "normal", ...Z.TIERS.normal, desc: "규칙을 알면 · 제법 둬요" },
    hard: { id: "hard", ...Z.TIERS.hard, desc: "진지하게 · 꽤 세요" },
  };
  const cfg = Object.assign({ tab: "solo", size: 9, tier: "easy", color: "black", handi: "k6.5", atari: true, wsize: 9, wb: "hard", ww: "normal", speed: "normal" }, store("cfg", {}));
  if (!TIERS[cfg.tier]) cfg.tier = "easy";
  const saveCfg = () => save("cfg", cfg);
  const HOWTO = [
    "흑부터 번갈아 한 수씩, <b>줄이 만나는 곳</b>에 돌을 놓아요",
    "상대 돌을 사방으로 꽉 둘러싸면 <b>따내요</b> (숨구멍이 하나 남으면 '단수')",
    "둘러싼 빈 곳이 내 <b>집</b>. 집 + 따낸 돌이 많으면 이겨요 (백은 덤 6.5집)",
    "<b>패</b>: 돌 하나를 따낸 자리를 바로 되따낼 수는 없어요. 다른 곳에 한 수 두고 나서요",
    "둘 다 <b>패스</b>하면 끝! 죽은 돌을 확인하고 집을 세요",
    "13·19줄은 한 번 눌러 자리를 보고, <b>같은 곳을 한 번 더</b> 눌러 놓아요",
  ];
  const howto = (force, onClose) => Z.howto("baduk", "바둑 두는 법", HOWTO, { force, onClose });

  /* ── 메뉴 ─────────────────────────────────────────────────── */
  function seg(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join("");
    el.onclick = e => { const b = e.target.closest("button"); if (!b) return; sfx("tap"); onPick(b.dataset.v); };
  }
  function handiItems(size) {
    const L = [["k6.5", "덤 6.5"], ["k0.5", "덤 0.5"]];
    if (size >= 13) for (const n of [2, 3, 4, 6, 9]) L.push(["h" + n, n + "점 접바둑"]);
    return L;
  }
  function drawMenu() {
    seg($("sizeSeg"), [[9, "9줄 · 처음이면"], [13, "13줄"], [19, "19줄"]], cfg.size, v => { cfg.size = +v; if (cfg.size < 13 && cfg.handi[0] === "h") cfg.handi = "k6.5"; saveCfg(); drawMenu(); });
    Z.tierCards($("tiers"), Object.values(TIERS), id => { cfg.tier = id; saveCfg(); drawMenu(); }, { selected: cfg.tier });
    seg($("colorSeg"), [["black", stoneEm(BLACK) + " 흑 (먼저 둠)"], ["white", stoneEm(WHITE) + " 백"], ["random", "🎲 랜덤"]], cfg.color, v => { cfg.color = v; saveCfg(); drawMenu(); });
    if (!handiItems(cfg.size).some(x => x[0] === cfg.handi)) cfg.handi = "k6.5";
    seg($("handiSeg"), handiItems(cfg.size), cfg.handi, v => { cfg.handi = v; saveCfg(); drawMenu(); });
    $("atariTog").setAttribute("aria-pressed", String(!!cfg.atari));
    const T = TIERS[cfg.tier];
    $("startBtn").textContent = `${T.em} ${T.name}이랑 한 판!`;
    seg($("wSizeSeg"), [[9, "9줄"], [13, "13줄"], [19, "19줄"]], cfg.wsize, v => { cfg.wsize = +v; saveCfg(); drawMenu(); });
    const tl = Object.values(TIERS).map(t => [t.id, `${t.em} ${t.name}`]);
    seg($("wBSeg"), tl, cfg.wb, v => { cfg.wb = v; saveCfg(); drawMenu(); });
    seg($("wWSeg"), tl, cfg.ww, v => { cfg.ww = v; saveCfg(); drawMenu(); });
    seg($("wSpeedSeg"), [["slow", "🐢 느리게"], ["normal", "보통"], ["fast", "🐇 빠르게"]], cfg.speed, v => { cfg.speed = v; saveCfg(); drawMenu(); });
    setTab(cfg.tab);
    drawResume();
  }
  function setTab(t) {
    cfg.tab = t;
    $("tabSolo").setAttribute("aria-pressed", String(t === "solo")); $("tabWatch").setAttribute("aria-pressed", String(t === "watch"));
    $("soloBox").hidden = t !== "solo"; $("watchBox").hidden = t !== "watch";
  }
  $("tabSolo").onclick = () => { sfx("tap"); setTab("solo"); saveCfg(); };
  $("tabWatch").onclick = () => { sfx("tap"); setTab("watch"); saveCfg(); };
  if ($("tabFriend")) $("tabFriend").onclick = () => { sfx("tap"); openFriendModal(); };
  $("atariTog").onclick = () => { cfg.atari = !cfg.atari; saveCfg(); sfx("toggle", { on: cfg.atari }); drawMenu(); };
  $("helpBtn").onclick = () => howto(true);
  $("startBtn").onclick = () => startSolo();
  $("duoBtn").onclick = () => startDuo();
  $("watchBtn").onclick = () => startWatch();
  $("recBtn").onclick = () => showRecords();

  function openFriendModal() {
    if (!window.ArenaUI) return Z.toast("온라인 모듈을 불러오지 못했어요");
    ArenaUI.open({
      game: "baduk", title: "바둑", max: 2, min: 2,
      buildConfig: (hostEl) => {
        const state = { size: cfg.size || 9, hostColor: 1 };
        hostEl.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
          <div class="opt"><span class="small">판 크기</span><div class="seg" id="fSizeSeg"></div></div>
          <div class="opt"><span class="small">방장 돌</span><div class="seg" id="fColSeg"></div></div>
        </div>`;
        const drawF = () => {
          seg(hostEl.querySelector("#fSizeSeg"), [[9, "9줄"], [13, "13줄"], [19, "19줄"]], state.size, v => { state.size = +v; drawF(); });
          seg(hostEl.querySelector("#fColSeg"), [[1, "⚫ 흑 (선)"], [2, "⚪ 백 (덤 6.5)"]], state.hostColor, v => { state.hostColor = +v; drawF(); });
        };
        drawF();
        return () => ({ size: state.size, hostColor: state.hostColor, komi: 6.5 });
      },
      renderConfig: (c) => `${(c && c.size) || 9}줄 · 덤 6.5 · 방장 ${(c && c.hostColor) === 2 ? "백" : "흑"}`,
      onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
    });
  }
  function startOnline({ net, role, cfg: c, players }) {
    const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p)).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
    const hostCol = (c && c.hostColor) === 2 ? WHITE : BLACK;
    const human = role === "host" ? hostCol : (3 - hostCol);
    const myPl = plist.find(p => p.uid === net.uid) || { name: "나" };
    const oppPl = plist.find(p => p.uid !== net.uid) || { name: "친구" };
    newGame({
      mode: "online", size: (c && c.size) || 9, komi: (c && c.komi) || 6.5, handicap: 0,
      human, players: { [human]: "human", [3 - human]: "remote" },
      names: { [human]: myPl.name || "나", [3 - human]: oppPl.name || "친구" },
      tiers: {}, net, role,
    });
    const onMsg = (m) => {
      if (!m || !G || G.mode !== "online") return;
      if (m.t === "move") play(m.a, "remote");
      else if (m.t === "resign") resign(m.who, true);
      else if (m.t === "dead") toggleDead(m.p, true);
      else if (m.t === "confirm") finish(true);
      else if (m.t === "again") {
        const nh = 3 - G.human;
        newGame({ mode: "online", size: G.st.size, komi: G.st.komi, handicap: 0, human: nh, players: { [nh]: "human", [3 - nh]: "remote" }, names: { [nh]: G.names[G.human], [3 - nh]: G.names[3 - G.human] }, tiers: {}, net: G.net, role: G.role });
      }
    };
    if (role === "host") net.on("msg", (_uid, m) => onMsg(m));
    else net.on("msg", m => onMsg(m));
  }

  function komiHandi() {
    if (cfg.handi[0] === "h" && cfg.size >= 13) return { handicap: +cfg.handi.slice(1), komi: 0.5 };
    return { handicap: 0, komi: +cfg.handi.slice(1) };
  }
  function startSolo() {
    const human = cfg.color === "white" ? WHITE : cfg.color === "black" ? BLACK : (Math.random() < 0.5 ? BLACK : WHITE);
    const { handicap, komi } = komiHandi();
    newGame({ mode: "solo", size: cfg.size, komi, handicap, human, players: { [human]: "human", [3 - human]: "ai" }, tiers: { [3 - human]: cfg.tier } });
  }
  function startDuo() {
    const { handicap, komi } = komiHandi();
    newGame({ mode: "duo", size: cfg.size, komi, handicap, human: null, players: { 1: "human", 2: "human" }, tiers: {} });
  }
  function startWatch() {
    newGame({ mode: "watch", size: cfg.wsize, komi: 6.5, handicap: 0, human: null, players: { 1: "ai", 2: "ai" }, tiers: { 1: cfg.wb, 2: cfg.ww }, speed: cfg.speed });
  }

  // 이어 하기 (혼자·둘이서 판은 수마다 저장)
  function drawResume() {
    const cur = store("cur", null), el = $("resume");
    if (!cur || !cur.st || cur.st.over) { el.hidden = true; return; }
    const who = cur.mode === "duo" ? "👫 둘이서" : `${TIERS[cur.tiers[3 - cur.human]].em} ${TIERS[cur.tiers[3 - cur.human]].name}`;
    el.innerHTML = `<span style="font-size:28px">⏳</span><div class="inf"><b>하던 판이 있어요</b><span class="small">${who} · ${cur.st.size}줄 · ${cur.st.moves.length}수</span></div><button class="btn mint" id="resumeGo">이어 하기</button>`;
    el.hidden = false;
    $("resumeGo").onclick = () => { sfx("tap"); resumeGame(cur); };
  }
  function autosave() {
    if (!G || G.mode === "watch" || G.mode === "online") return;
    if (G.st.over && G.phase === "done") { save("cur", null); return; }
    save("cur", { mode: G.mode, human: G.human, players: G.players, tiers: G.tiers, hints: G.hints, st: B.toJSON(G.st) });
  }

  /* ── AI 워커 ──────────────────────────────────────────────── */
  let worker = null, nnState = "loading", nnWasm = false, rid = 0;
  const pend = new Map();
  function startWorker() {
    try {
      worker = new Worker("worker.js?v=1");
      worker.onmessage = e => {
        const d = e.data || {};
        if (d.type === "ready") { nnState = d.nn ? "nn" : "mcts"; nnWasm = !!d.wasm; noteAI(); if (G) updateAll(); return; }
        const p = pend.get(d.id); if (!p) return;
        pend.delete(d.id);
        if (d.ok) p.res(d.res); else p.rej(new Error(d.err));
      };
      worker.onerror = e => { if (e && e.preventDefault) e.preventDefault(); dropWorker(); };
    } catch (e) { dropWorker(); }
  }
  function dropWorker() {
    if (worker) worker.terminate();
    worker = null; nnState = "mcts"; noteAI();
    for (const [, p] of pend) p.rej(new Error("worker"));
    pend.clear();
  }
  function noteAI() {
    $("aiNote").textContent = nnState === "nn" ? "AI 두뇌: KataGo 신경망(공개 가중치)을 이 기기에서 직접 돌려요"
      : nnState === "mcts" ? "AI: 몬테카를로 수읽기로 둬요 (신경망을 불러오지 못했어요)" : "AI 두뇌를 불러오는 중…";
  }
  function ask(kind, st, opt = {}) {
    if (!worker) return localAsk(kind, st, opt);
    return new Promise((res, rej) => { const id = ++rid; pend.set(id, { res, rej }); worker.postMessage({ id, kind, state: B.toJSON(st), opt }); });
  }
  // 워커가 안 될 때: 화면 쪽에서 가벼운 몬테카를로 (잠깐 멈출 수 있음)
  function localAsk(kind, st, opt) {
    return new Promise(res => setTimeout(() => {
      const AI = window.BadukAI;
      if (kind === "move") res(AI.chooseMove(st, { ...opt, noNN: true, playouts: opt.tier === "easy" ? 150 : 400, timeMs: 0 }));
      else if (kind === "hint") res(AI.mctsMove(st, { seed: 3, playouts: 600 }));
      else { const g = AI.guessDead(st, { noNN: true, playouts: 60 }); res({ dead: Array.from(g.dead), own: Array.from(g.analysis.own), leadB: g.analysis.leadB, winB: g.analysis.winB, top: [] }); }
    }, 30));
  }

  /* ── 게임 진행 ────────────────────────────────────────────── */
  let G = null;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const clearTimers = () => { for (const id of timers) clearTimeout(id); timers.clear(); };
  const SPEED = { solo: { min: 450, hard: 1500 }, slow: { min: 1400, hard: 1500 }, normal: { min: 700, hard: 1000 }, fast: { min: 160, hard: 450 } };

  function baseG(o, st) {
    return {
      ...o, st, gen: 0, phase: "play", hints: o.hints != null ? o.hints : (o.mode === "solo" ? 3 : 0),
      est: null, hintP: -1, pending: -1, hover: -1, cursor: -1, dead: null, score: null, thinking: false,
      paused: false, inFlight: { 1: 0, 2: 0 }, warned: 0, info: null,
    };
  }
  function newGame(o) {
    leaveGame();
    G = baseG(o, B.create({ size: o.size, komi: o.komi, handicap: o.handicap }));
    enterPlay();
    autosave();
    if (o.mode !== "watch") howto(false);                            // 처음 한 번 안내 (닫는 방법과 상관없이 판은 그대로 진행)
    later(afterMove, 350);
  }
  function resumeGame(cur) {
    leaveGame();
    let st;
    try { st = B.fromJSON(cur.st); } catch (e) { save("cur", null); drawMenu(); return; }
    G = baseG({ mode: cur.mode, size: st.size, human: cur.human, players: cur.players, tiers: cur.tiers, hints: cur.hints }, st);
    enterPlay();
    later(afterMove, 300);
  }
  function enterPlay() {
    show("play");
    for (const id of ["passBtn", "resignBtn"]) $(id).hidden = G.mode === "watch";
    $("undoBtn").hidden = G.mode === "watch" || G.mode === "online";
    $("hintBtn").hidden = G.mode !== "solo";
    $("pauseBtn").hidden = $("fastBtn").hidden = G.mode !== "watch";
    $("pauseBtn").setAttribute("aria-pressed", "false"); $("fastBtn").setAttribute("aria-pressed", String(G.speed === "fast"));
    $("estBtn").setAttribute("aria-pressed", "false");
    $("scoreBox").hidden = true; $("dock").hidden = false;
    // 내 칩은 판 아래, 상대 칩은 판 위 (둘이서·구경은 흑이 아래)
    const meBottom = (G.mode === "solo" || G.mode === "online") ? G.human : BLACK;
    $("rowBot").appendChild(meBottom === BLACK ? $("sideB") : $("sideW"));
    $("rowTop").appendChild(meBottom === BLACK ? $("sideW") : $("sideB"));
    R.key = ""; requestAnimationFrame(() => fit(true));
    updateAll();
  }
  function leaveGame() {
    clearTimers(); hideBubble(); hideLoupe();
    if (window.confetti && window.confetti.reset) window.confetti.reset();
    $("resBox").hidden = true;
    for (const el of flying) el.remove();
    flying.clear(); anims.length = 0;
    if (G) G.gen++;
    G = null; touch = null;
  }
  function exitToMenu() {
    if (G && G.net) { try { G.net.leave(); } catch (e) {} }
    if (G && G.phase !== "done") autosave();
    leaveGame(); show("home"); drawMenu();
  }
  Z.backGuard($("backBtn"), exitToMenu);

  const canHumanMove = () => !!(G && G.phase === "play" && !G.st.over && G.players[G.st.toPlay] === "human" && !G.thinking);

  function afterMove() {
    if (!G) return;
    updateAll();
    const st = G.st;
    if (st.over) {
      if (st.end.reason === "resign") later(finish, 600); else later(enterScoring, 500);
      return;
    }
    if (G.players[st.toPlay] === "ai" && !(G.mode === "watch" && G.paused)) aiTurn();
  }
  async function aiTurn() {
    const gen = ++G.gen, st = G.st, me = st.toPlay, tier = G.tiers[me] || "normal";
    const spd = G.mode === "watch" ? SPEED[G.speed] || SPEED.normal : SPEED.solo;
    G.thinking = true; updateAll();
    const t0 = performance.now();
    let r = null;
    try { r = await ask("move", st, { tier, seed: (Math.random() * 2147483647) | 0, timeMs: tier === "hard" ? spd.hard : undefined }); } catch (e) { r = null; }
    if (!G || gen !== G.gen) return;
    let mv = r && Number.isInteger(r.move) ? r.move : null;
    if (mv == null || !B.isLegal(st, mv)) mv = randomLegal(st);
    later(() => {
      if (!G || gen !== G.gen) return;
      G.thinking = false; G.info = r && r.info;
      play(mv, "ai");
    }, Math.max(0, spd.min - (performance.now() - t0)));
  }
  function randomLegal(st) {
    const m = B.legal(st), L = [];
    for (let p = 0; p < st.size * st.size; p++) if (m[p]) L.push(p);
    return L.length ? L[Math.floor(Math.random() * L.length)] : st.size * st.size;
  }
  function play(a, who) {
    const r = B.play(G.st, a);
    if (r.state === G.st) { if (who === "human") illegal(r.events[0]); return false; }
    if (G.mode === "online" && G.net && who === "human") {
      const m = { t: "move", a };
      if (G.role === "host") G.net.broadcast(m); else G.net.send(m);
    }
    G.st = r.state; G.est = null; G.hintP = -1; G.pending = -1;
    $("estBtn").setAttribute("aria-pressed", "false");
    effects(r.events);
    autosave();
    afterMove();
    return true;
  }
  function illegal(ev) {
    Z.vibrate(25);
    if (ev && ev.why === "ko") say("패예요! 바로 되따낼 수 없어요. 다른 곳에 한 수 두고 나서 따내요", 3200);
    else if (ev && ev.why === "suicide") say("거기는 놓을 수 없어요 (놓자마자 잡히는 자리)", 2600);
    sfx("bad");
  }
  function effects(evs) {
    const now = performance.now();
    for (const e of evs) {
      if (e.type === "place") { anims.push({ k: "drop", p: e.p, t0: now }, { k: "ripple", p: e.p, t0: now + 60 }); sfx("stone", { pitch: 0.94 + Math.random() * 0.12 }); Z.vibrate(8); }
      else if (e.type === "capture") flyCaptures(e.points, e.by);
      else if (e.type === "pass") { sfx("passS"); say(`${stoneEm(e.color)} ${sideName(e.color)} 패스!${G.st.over ? "" : passTip(e.color)}`, 2200); }
      else if (e.type === "atari" && cfg.atari && G.mode !== "watch" && G.players[e.color] === "human") {
        const t = Date.now();
        if (t - G.warned > 9000) { G.warned = t; say(G.mode === "duo" ? `🔔 ${colorName(e.color)} 돌이 단수예요!` : "🔔 단수! 빨간 돌이 위험해요", 2200); }
        sfx("atari");
      }
    }
    kick();
  }
  const passTip = c => (G.players[3 - c] === "human" && (G.mode === "solo" || G.mode === "online") ? " 더 둘 곳이 없으면 나도 패스해요" : "");
  function sideName(c) {
    if (!G) return colorName(c);
    if (G.mode === "online") return (G.names && G.names[c]) || colorName(c);
    if (G.mode === "solo") return G.players[c] === "human" ? "나" : `${TIERS[G.tiers[c]].em} ${TIERS[G.tiers[c]].name}`;
    if (G.mode === "watch") return `${TIERS[G.tiers[c]].em} ${TIERS[G.tiers[c]].name}`;
    return colorName(c);
  }

  // 따낸 돌이 점수 칩으로 날아감 (그동안 칩 숫자는 하나씩 올라감)
  const flying = new Set();
  function flyCaptures(points, by) {
    const cap = by === BLACK ? $("capB") : $("capW"), av = (by === BLACK ? $("sideB") : $("sideW")).querySelector(".av");
    const rect = canvas.getBoundingClientRect(), tr = av.getBoundingClientRect();
    const col = 3 - by, n = points.length, shown = points.slice(0, 12), d = Math.max(14, R.r * 2);
    G.inFlight[by] += n;
    shown.forEach((p, i) => {
      const [x, y] = ptXY(p), el = document.createElement("div");
      el.className = "fly st " + (col === BLACK ? "b" : "w");
      el.style.width = el.style.height = d + "px";
      const sx = rect.left + x - d / 2, sy = rect.top + y - d / 2, tx = tr.left + tr.width / 2 - d / 2, ty = tr.top + tr.height / 2 - d / 2;
      el.style.transform = `translate(${sx}px,${sy}px)`;
      document.body.appendChild(el); flying.add(el);
      const weight = i === shown.length - 1 ? n - (shown.length - 1) : 1;
      const done = () => {
        if (!flying.has(el)) return;
        flying.delete(el); el.remove();
        if (!G) return;
        G.inFlight[by] = Math.max(0, G.inFlight[by] - weight); setCaps();
        cap.classList.remove("bump"); void cap.offsetWidth; cap.classList.add("bump");
        if (i < 7) sfx("cap", { i });
      };
      if (el.animate) {
        const a = el.animate([
          { transform: `translate(${sx}px,${sy}px) scale(1)`, opacity: 1 },
          { transform: `translate(${(sx + tx) / 2}px,${Math.min(sy, ty) - 50}px) scale(1.12)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${tx}px,${ty}px) scale(${Math.max(0.35, 24 / d)})`, opacity: 0.85 },
        ], { duration: 640, delay: 140 + i * 60, easing: "cubic-bezier(.45,.05,.35,1)", fill: "both" });
        a.onfinish = done;
      } else later(done, 300);
    });
    if (n >= 3) comboPop(`${n}점 따냄!`);
  }
  function setCaps() {
    if (!G) return;
    $("capB").textContent = Math.max(0, G.st.caps[BLACK] - G.inFlight[BLACK]);
    $("capW").textContent = Math.max(0, G.st.caps[WHITE] - G.inFlight[WHITE]);
  }
  function comboPop(text) { const d = $("comboPop"); d.textContent = text; d.hidden = false; d.classList.remove("go"); void d.offsetWidth; d.classList.add("go"); later(() => { d.hidden = true; }, 1100); }

  // 말풍선
  let bubT = null;
  // 말풍선은 판 위쪽에 잠깐 (단추·점수 상자를 가리지 않게, 손가락은 통과)
  function say(html, ms = 2200) {
    const b = $("bubble"); b.innerHTML = html; b.hidden = false;
    if (!$("play").hidden) {
      const rc = canvas.getBoundingClientRect();
      b.style.top = Math.round(rc.top + Math.min(26, rc.height * 0.06)) + "px"; b.style.left = Math.round(rc.left + rc.width / 2) + "px"; b.style.bottom = "auto";
    } else { b.style.top = ""; b.style.left = ""; b.style.bottom = ""; }
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(bubT); bubT = setTimeout(() => { b.hidden = true; }, ms);
  }
  function hideBubble() { clearTimeout(bubT); $("bubble").hidden = true; }

  /* ── 상태줄 · 칩 · 단추 ───────────────────────────────────── */
  function label() {
    const N = G.st.size;
    if (G.mode === "online") return `👥 친구랑 (${G.net ? G.net.code : ""}) · ${N}줄`;
    if (G.mode === "solo") { const T = TIERS[G.tiers[3 - G.human]]; return `${T.em} ${T.name} · ${N}줄`; }
    if (G.mode === "watch") return `${TIERS[G.tiers[1]].em} vs ${TIERS[G.tiers[2]].em} · ${N}줄`;
    return `👫 둘이서 · ${N}줄`;
  }
  function statusText() {
    const st = G.st;
    if (G.phase === "score") return "죽은 돌을 확인해요";
    if (G.phase === "done") return "끝났어요";
    if (G.mode === "watch" && G.paused) return "⏸ 멈춤";
    if (G.thinking) {
      if (nnState === "loading") return "AI 깨우는 중";
      // 구경할 때만: 직전 수 기준 형세 한 줄 (흑 몇 집 앞섬)
      const lead = G.mode === "watch" && G.info && typeof G.info.leadB === "number" ? G.info.leadB : null;
      const head = lead == null ? "" : Math.abs(lead) < 1.5 ? "팽팽 · " : `${colorName(lead > 0 ? BLACK : WHITE)} ${Math.round(Math.abs(lead))}집 앞섬 · `;
      return `${head}${sideName(st.toPlay)} 생각 중`;
    }
    if ((G.mode === "solo" || G.mode === "online") && st.toPlay === G.human) {
      if (G.pending >= 0) return "같은 곳을 한 번 더 누르면 놓아요";
      return st.passes ? "상대가 패스했어요 · 내 차례" : `내 차례예요 (${stoneEm(G.human)})`;
    }
    return `${stoneEm(st.toPlay)} ${sideName(st.toPlay)} 차례${G.pending >= 0 ? " · 한 번 더 누르면 놓아요" : ""}`;
  }
  function updateAll() {
    if (!G) return;
    const st = G.st, playing = G.phase === "play" && !st.over;
    $("lbl").textContent = label();
    $("movePill").textContent = `${st.moves.length}수`;
    $("nameB").textContent = sideName(BLACK); $("nameW").textContent = sideName(WHITE);
    setCaps();
    for (const c of [BLACK, WHITE]) {
      const el = c === BLACK ? $("sideB") : $("sideW");
      el.classList.toggle("turn", playing && st.toPlay === c);
      el.classList.toggle("think", playing && G.thinking && st.toPlay === c);
    }
    const s = $("status"); s.innerHTML = statusText(); s.classList.toggle("thinking", !!(G.thinking && playing));
    const mine = canHumanMove();
    $("passBtn").disabled = !mine;
    $("resignBtn").disabled = !playing || G.mode === "solo" && !mine && !G.thinking;
    $("undoBtn").disabled = !(G.phase === "play" && st.moves.length > (G.mode === "solo" && G.players[B.first(st)] === "ai" ? 1 : 0));
    $("hintBtn").disabled = !mine || G.hints <= 0;
    $("hintBadge").textContent = G.hints; $("hintBadge").hidden = G.mode !== "solo";
    $("estBtn").disabled = G.phase !== "play";
    $("scoreBox").hidden = G.phase !== "score"; $("dock").hidden = G.phase === "score";
    canvas.classList.toggle("wait", !mine && G.phase !== "score");
    kick();
  }

  /* ── 단추 ─────────────────────────────────────────────────── */
  $("passBtn").onclick = () => {
    if (!canHumanMove()) return;
    const st = G.st, N = st.size;
    if (!st.passes && st.moves.length < N * N * 0.35) {
      Z.modal({ title: "패스할까요?", html: "<p style='margin:0'>아직 둘 곳이 많아 보여요.<br>패스하면 이번 차례를 건너뛰어요.</p>", buttons: [{ label: "계속 두기" }, { label: "패스", primary: true, onClick: () => { if (canHumanMove()) play(N * N, "human"); } }], dismiss: true });
      return;
    }
    play(N * N, "human");
  };
  $("undoBtn").onclick = () => {
    if (!G || G.phase !== "play") return;
    let s = G.st;
    if (G.mode === "duo") s = B.undo(s, 1);
    else {
      // AI 응수까지 함께 무르고, 내 수 하나를 무름 (AI 가 생각 중이면 그 생각은 버림)
      let removedMine = false;
      while (s.moves.length) {
        const mover = 3 - s.toPlay;
        s = B.undo(s, 1);
        if (G.players[mover] === "human") removedMine = true;
        if (removedMine && G.players[s.toPlay] === "human") break;
      }
      if (G.players[s.toPlay] !== "human") return;
    }
    if (s === G.st) return;
    G.gen++; G.thinking = false; G.st = s; G.est = null; G.hintP = -1; G.pending = -1;
    anims.length = 0; sfx("flip"); autosave(); afterMove();
  };
  $("hintBtn").onclick = async () => {
    if (!canHumanMove() || G.hints <= 0 || G.hinting) return;
    const key = G.st.moves.length, N = G.st.size, game = G;
    G.hinting = true; say("💡 생각해 볼게요…", 1400);
    let r = null; try { r = await ask("hint", G.st, { seed: 11 }); } catch (e) {}
    game.hinting = false;
    if (G !== game || G.st.moves.length !== key || !canHumanMove() || !r) return;
    G.hints--; sfx("hint");
    if (r.move === N * N) say("💡 지금은 패스해도 괜찮아 보여요", 2600);
    else {
      G.hintP = r.move; say("💡 반짝이는 곳 어때요?", 2400);
      const hp = r.move; later(() => { if (G && G.hintP === hp) { G.hintP = -1; kick(); } }, 8000);
    }
    updateAll();
  };
  $("estBtn").onclick = async () => {
    if (!G || G.phase !== "play") return;
    if (G.est || $("estBtn").getAttribute("aria-pressed") === "true") { G.est = null; $("estBtn").setAttribute("aria-pressed", "false"); kick(); return; }
    const key = G.st.moves.length, game = G;
    $("estBtn").setAttribute("aria-pressed", "true"); sfx("tap");
    let r = null; try { r = await ask("analyze", G.st, {}); } catch (e) {}
    if (G !== game || G.st.moves.length !== key || G.phase !== "play" || !r || $("estBtn").getAttribute("aria-pressed") !== "true") return;
    G.est = { own: Float32Array.from(r.own), leadB: r.leadB };
    say(estText(r.leadB), 3400); kick();
  };
  function estText(leadB) {
    const a = Math.abs(leadB), n = a < 10 ? fmtN(Math.round(a * 2) / 2) : Math.round(a);
    if (a < 1.5) return "⚖️ 비슷해요! 팽팽한 판이에요";
    const lead = leadB > 0 ? BLACK : WHITE;
    if (G.mode === "solo") return lead === G.human ? `⚖️ 내가 ${n}집쯤 앞서요 👍` : `⚖️ ${sideName(lead)}이 ${n}집쯤 앞서요`;
    return `⚖️ ${stoneEm(lead)} ${colorName(lead)}이 ${n}집쯤 앞서요`;
  }
  $("resignBtn").onclick = () => {
    if (!G || G.phase !== "play" || G.st.over) return;
    const who = (G.mode === "solo" || G.mode === "online") ? G.human : G.st.toPlay;
    Z.modal({ title: "기권할까요?", html: `<p style='margin:0'>${(G.mode === "solo" || G.mode === "online") ? "이번 판을 여기서 마쳐요." : `${stoneEm(who)} ${colorName(who)}이 기권해요.`}</p>`, buttons: [{ label: "계속 두기" }, { label: "기권", primary: true, onClick: () => resign(who) }], dismiss: true });
  };
  function resign(who, remote) {
    if (!G || G.phase !== "play" || G.st.over) return;
    if (G.mode === "online" && G.net && !remote) {
      const m = { t: "resign", who };
      if (G.role === "host") G.net.broadcast(m); else G.net.send(m);
    }
    G.gen++; G.thinking = false;
    const s = { ...G.st, toPlay: who };
    const r = B.play(s, -1); G.st = r.state; effects(r.events); autosave(); afterMove();
  }
  $("pauseBtn").onclick = () => { if (!G || G.mode !== "watch") return; setPaused(!G.paused); };
  function setPaused(v) {
    G.paused = v; $("pauseBtn").setAttribute("aria-pressed", String(v));
    $("pauseBtn").querySelector(".ic").textContent = v ? "▶" : "⏸"; $("pauseBtn").querySelector(".lab").textContent = v ? "계속" : "멈춤";
    updateAll();
    if (!v && G.phase === "play" && !G.thinking) afterMove();
  }
  $("fastBtn").onclick = () => { if (!G || G.mode !== "watch") return; G.speed = G.speed === "fast" ? (cfg.speed === "fast" ? "normal" : cfg.speed) : "fast"; $("fastBtn").setAttribute("aria-pressed", String(G.speed === "fast")); sfx("tap"); };
  Z.sfx.button($("sndBtn"));
  $("resumeBtn").onclick = () => resumePlay();
  $("confirmBtn").onclick = () => finish();

  /* ── 계가 ─────────────────────────────────────────────────── */
  async function enterScoring() {
    if (!G || G.phase !== "play") return;
    const N = G.st.size;
    G.phase = "score"; G.dead = new Uint8Array(N * N); G.score = null; G.est = null; G.hintP = -1;
    $("scoreLine").textContent = "죽은 돌을 살펴보는 중…"; $("scoreSub").textContent = ""; $("scoreBtns").hidden = true;
    updateAll(); requestAnimationFrame(() => fit(true));
    const gen = ++G.gen, game = G;
    let r = null; try { r = await ask("dead", G.st, {}); } catch (e) {}
    if (G !== game || gen !== G.gen) return;
    if (r && r.dead) G.dead = Uint8Array.from(r.dead);
    rescore();
    $("scoreBtns").hidden = G.mode === "watch";
    if (G.mode === "watch") later(finish, G.speed === "fast" ? 900 : 2200);
    else say("돌을 누르면 죽은 돌 ↔ 산 돌이 바뀌어요", 3000);
  }
  function rescore() {
    const sc = G.score = B.scoreKorean(G.st, G.dead);
    $("scoreLine").innerHTML = `${stoneEm(BLACK)}흑 ${sc.black}집 · ${stoneEm(WHITE)}백 ${sc.white}집 <span class="k">+ 덤 ${G.st.komi}</span>`;
    const res = sc.winner ? `${colorName(sc.winner)} ${fmtN(Math.abs(sc.margin))}집 승` : "무승부";
    $("scoreSub").innerHTML = `흑: 집 ${sc.terrB} + 따낸 돌 ${sc.capsB} · 백: 집 ${sc.terrW} + 따낸 돌 ${sc.capsW} → <b>${res}</b>`;
    kick();
  }
  function toggleDead(p, remote) {
    if (!G || G.phase !== "score" || !G.st.board[p] || !G.score) return;
    if (G.mode === "online" && G.net && !remote) {
      const m = { t: "dead", p };
      if (G.role === "host") G.net.broadcast(m); else G.net.send(m);
    }
    const reg = B.region(G.st, p), v = G.dead[p] ? 0 : 1;
    for (const q of reg) G.dead[q] = v;
    sfx("toggle", { on: !v }); rescore();
  }
  function resumePlay() {
    if (!G || G.phase !== "score") return;
    let s = B.undo(G.st, 1);
    if (G.mode === "solo") while (s.moves.length && G.players[s.toPlay] !== "human" && s.moves[s.moves.length - 1] === s.size * s.size) s = B.undo(s, 1);
    G.gen++; G.st = s; G.phase = "play"; G.dead = null; G.score = null;
    sfx("flip"); requestAnimationFrame(() => fit(true)); autosave(); afterMove();
  }

  /* ── 결과 ─────────────────────────────────────────────────── */
  function finish(remote) {
    if (!G || G.phase === "done") return;
    if (G.mode === "online" && G.net && !remote && !(G.st.end && G.st.end.reason === "resign")) {
      const m = { t: "confirm" };
      if (G.role === "host") G.net.broadcast(m); else G.net.send(m);
    }
    const st = G.st, game = G;
    let winner = 0, big, detail = "", sc = null;
    if (st.end && st.end.reason === "resign") { winner = st.end.winner; big = `${colorName(winner)} 불계승`; detail = `${colorName(st.end.loser)}(${sideName(st.end.loser)}) 기권`; }
    else {
      sc = G.score || B.scoreKorean(st, G.dead || []);
      winner = sc.winner;
      big = winner ? `${colorName(winner)} ${fmtN(Math.abs(sc.margin))}집 승` : "무승부";
      detail = `흑 ${sc.black}집 · 백 ${sc.white}집 + 덤 ${st.komi}`;
    }
    G.phase = "done"; G.gen++; hideBubble();
    updateAll();
    const humanWon = G.mode === "solo" ? winner === G.human : null;
    let title, cheer = "";
    if (G.mode === "solo") {
      const T = TIERS[G.tiers[3 - G.human]];
      title = humanWon ? "🎉 이겼어요!" : "😿 아쉽게 졌어요";
      if (humanWon) { const next = { easy: "normal", normal: "hard" }[T.id]; cheer = next ? `${T.em} ${T.name}을 이겼어요! <b>${TIERS[next].em} ${TIERS[next].name}</b>에도 도전해 볼까요?` : `${T.em} 고급을 이기다니, 대단해요!`; }
      else cheer = G.hints > 0 ? "💡 힌트와 ⚖️ 형세를 써 보면 도움이 돼요" : "다음 판은 더 잘할 수 있어요!";
    } else if (G.mode === "watch") title = winner ? `${stoneEm(winner)} ${sideName(winner)} 승` : "무승부";
    else title = winner ? `🎉 ${stoneEm(winner)} ${colorName(winner)} 승!` : "무승부";
    const result = big;
    // 기록 저장 (최대 200판)
    const rec = { t: Date.now(), mode: G.mode, size: st.size, komi: st.komi, handicap: st.handicap, human: G.human, tiers: G.tiers, result, winner, moves: st.moves.length, sgf: B.toSGF(st, { date: new Date().toISOString().slice(0, 10), black: sideName(BLACK), white: sideName(WHITE), result: sgfResult(winner, sc, st) }) };
    const recs = store("records", []); recs.unshift(rec); save("records", recs.slice(0, 200));
    save("cur", null);
    if (humanWon === false) sfx("lose"); else { sfx("win"); if (winner) Z.confetti(); }
    const chips = sc ? `<div class="reschips"><span>흑 집 ${sc.terrB} + 따냄 ${sc.capsB}</span><span>백 집 ${sc.terrW} + 따냄 ${sc.capsW} + 덤 ${st.komi}</span></div>` : "";
    later(() => {
      if (G !== game) return;
      showResult(title, `<div class="resbig${humanWon === false ? " lose" : ""}">${esc(big)}</div><p class="small" style="margin:0">${esc(detail)}</p>${chips}${cheer ? `<p class="cheer">${cheer}</p>` : ""}`,
        [["한 판 더", () => again(game), "primary"], ["기보 복사", () => copySGF(rec.sgf), ""], ["메뉴", exitToMenu, "ghost"]]);
    }, winner && humanWon !== false ? 700 : 300);
  }
  function sgfResult(w, sc, st) { if (!w) return "0"; if (st.end && st.end.reason === "resign") return (w === BLACK ? "B" : "W") + "+R"; return (w === BLACK ? "B+" : "W+") + fmtN(Math.abs(sc.margin)); }
  function again(game) {
    if (game.mode === "watch") startWatch();
    else if (game.mode === "duo") startDuo();
    else if (game.mode === "online" && game.net) {
      const m = { t: "again" };
      if (game.role === "host") game.net.broadcast(m); else game.net.send(m);
      const nh = 3 - game.human;
      newGame({ mode: "online", size: game.st.size, komi: game.st.komi, handicap: 0, human: nh, players: { [nh]: "human", [3 - nh]: "remote" }, names: { [nh]: game.names[game.human], [3 - nh]: game.names[3 - game.human] }, tiers: {}, net: game.net, role: game.role });
    } else {
      const human = cfg.color === "random" ? (Math.random() < 0.5 ? BLACK : WHITE) : game.human, tier = game.tiers[3 - game.human];
      newGame({ mode: "solo", size: game.st.size, komi: game.st.komi, handicap: game.st.handicap, human, players: { [human]: "human", [3 - human]: "ai" }, tiers: { [3 - human]: tier } });
    }
  }
  function showResult(title, body, btns) {
    $("resTitle").innerHTML = title; $("resBody").innerHTML = body;
    const row = $("resBtns"); row.innerHTML = "";
    for (const [label, fn, cls] of btns) {
      const b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = label;
      b.onclick = () => { if (label !== "기보 복사") $("resBox").hidden = true; fn(); };
      row.appendChild(b);
    }
    $("resBox").hidden = false;
  }
  async function copySGF(sgf) {
    try { await navigator.clipboard.writeText(sgf); Z.toast("기보(SGF)를 복사했어요"); }
    catch (e) { Z.modal({ title: "기보 (SGF)", html: `<textarea readonly style="width:100%;height:140px;font-size:12px;border-radius:12px;border:2px solid var(--line);padding:8px">${esc(sgf)}</textarea>`, dismiss: true }); }
  }
  function showRecords() {
    const recs = store("records", []);
    if (!recs.length) { Z.toast("아직 끝낸 대국이 없어요"); return; }
    const d = t => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`; };
    const who = r => r.mode === "duo" ? "👫 둘이서" : r.mode === "watch" ? "🤖 AI 구경" : (() => { const T = TIERS[r.tiers && r.tiers[3 - r.human]]; return T ? `${T.em} ${T.name}` : "혼자"; })();
    const html = `<ul class="list reclist">${recs.slice(0, 60).map((r, i) => `<li><div class="inf"><b>${esc(r.result)}${r.mode === "solo" ? (r.winner === r.human ? " · 🎉" : "") : ""}</b><span class="small">${d(r.t)} · ${who(r)} · ${r.size}줄 · ${r.moves}수</span></div><button class="btn" data-i="${i}">기보 복사</button></li>`).join("")}</ul><p class="small" style="margin:0">최근 ${Math.min(60, recs.length)}판 (전체 ${recs.length}판 저장)</p>`;
    Z.modal({ title: "📜 지난 대국", html, buttons: [{ label: "닫기", primary: true }], dismiss: true });
    const list = document.querySelector(".reclist");
    if (list) list.onclick = e => { const b = e.target.closest("button[data-i]"); if (b) copySGF(recs[+b.dataset.i].sgf); };
  }

  /* ── 화면 전환 · 크기 ─────────────────────────────────────── */
  function show(id) {
    $("home").hidden = id !== "home"; $("play").hidden = id !== "play";
    document.body.classList.toggle("playing", id === "play");
    document.querySelector(".wrap").hidden = id === "play";
    if (id === "play") requestAnimationFrame(() => fit(true));
  }
  const canvas = $("board"), ctx = canvas.getContext("2d");
  const R = { key: "", S: 0, dpr: 1, N: 9, cell: 0, o: 0, r: 0, bg: null, spr: null, lastW: 0, lastH: 0 };
  const ptXY = p => [R.o + (p % R.N) * R.cell, R.o + Math.floor(p / R.N) * R.cell];
  const wide = matchMedia("(orientation:landscape) and (max-height:560px)");
  function fit(force) {
    if (!G || $("play").hidden) return;
    // 세로 화면: 판 위아래 칩이 판에 붙게, 남는 높이는 위아래 스프링이 나눠 가짐 (판 = 너비와 남는 높이 중 작은 쪽)
    const st = $("stage"), land = wide.matches, sp = document.querySelectorAll(".play .spring");
    let w = st.clientWidth, h;
    if (land) { st.style.height = ""; h = st.clientHeight; }
    else { h = st.offsetHeight; for (const s of sp) h += s.offsetHeight; }
    if (!w || !h) return;
    // 주소창이 나타났다 사라질 때 판이 출렁이지 않게: 높이만 조금 바뀌면 그대로
    if (force !== true && w === R.lastW && Math.abs(h - R.lastH) < 70 && R.N === G.st.size && R.land === land) return;
    R.lastW = w; R.lastH = h; R.land = land;
    const S = Math.max(140, Math.floor(Math.min(w, h, 900))), dpr = Math.min(3, window.devicePixelRatio || 1), N = G.st.size;
    if (!land) st.style.height = S + "px";
    const key = S + ":" + dpr + ":" + N;
    if (key === R.key) return;
    R.key = key; R.S = S; R.dpr = dpr; R.N = N;
    canvas.style.width = canvas.style.height = S + "px";
    canvas.width = canvas.height = Math.round(S * dpr);
    const edge = N <= 9 ? 0.72 : 0.62;
    R.cell = S / (N - 1 + 2 * edge); R.o = R.cell * edge; R.r = R.cell * 0.482;
    R.bg = makeBg(); R.spr = { 1: makeStone(BLACK), 2: makeStone(WHITE) };
    draw();
  }
  addEventListener("resize", () => fit());
  if (window.visualViewport) visualViewport.addEventListener("resize", () => fit());

  /* ── 그리기 ───────────────────────────────────────────────── */
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function makeBg() {
    const c = document.createElement("canvas"), S = R.S, d = R.dpr;
    c.width = c.height = Math.round(S * d);
    const g = c.getContext("2d"); g.scale(d, d);
    roundRect(g, 0, 0, S, S, Math.min(18, S * 0.045)); g.clip();
    const lg = g.createLinearGradient(0, 0, S, S); lg.addColorStop(0, "#f8dfb2"); lg.addColorStop(0.55, "#f1d09a"); lg.addColorStop(1, "#e9c287");
    g.fillStyle = lg; g.fillRect(0, 0, S, S);
    // 나뭇결
    const rng = B.mulberry32(20261030);
    g.strokeStyle = "#a06a34";
    for (let i = 0; i < 30; i++) {
      const y0 = rng() * S * 1.1 - S * 0.05, amp = 2 + rng() * 5, fr = 60 + rng() * 90, ph = rng() * 6;
      g.globalAlpha = 0.035 + rng() * 0.05; g.lineWidth = 0.6 + rng() * 2.2;
      g.beginPath();
      for (let x = -4; x <= S + 4; x += 6) { const y = y0 + Math.sin(x / fr + ph) * amp + Math.sin(x / 17 + i) * 0.7; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
    const rg = g.createRadialGradient(S * 0.32, S * 0.28, S * 0.04, S * 0.5, S * 0.5, S * 0.78);
    rg.addColorStop(0, "rgba(255,250,235,.38)"); rg.addColorStop(1, "rgba(255,250,235,0)");
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    // 줄 (기기 화소에 맞춰 또렷하게)
    const N = R.N, o = R.o, cl = R.cell, end = o + (N - 1) * cl;
    const W1 = Math.max(1, Math.round((N >= 19 ? 0.9 : 1.1) * d)), W2 = Math.max(W1 + 1, Math.round(W1 * 1.8));
    const snap = (v, W) => (Math.round(v * d) + (W % 2 ? 0.5 : 0)) / d;
    g.strokeStyle = "rgba(92,58,30,.68)";
    for (let i = 0; i < N; i++) {
      const W = i === 0 || i === N - 1 ? W2 : W1, p = snap(o + i * cl, W);
      g.lineWidth = W / d;
      g.beginPath(); g.moveTo(snap(o, W2) - W2 / d / 2, p); g.lineTo(snap(end, W2) + W2 / d / 2, p); g.stroke();
      g.beginPath(); g.moveTo(p, snap(o, W2) - W2 / d / 2); g.lineTo(p, snap(end, W2) + W2 / d / 2); g.stroke();
    }
    g.fillStyle = "rgba(84,52,28,.82)";
    for (const sp of B.starPoints(N)) { const [x, y] = ptXY(sp); g.beginPath(); g.arc(snap(x, W1), snap(y, W1), Math.max(2.2, cl * 0.1), 0, 7); g.fill(); }
    return c;
  }
  function makeStone(col) {
    const r = R.r, d = R.dpr, pad = Math.ceil(r * 0.4 + 2), size = Math.ceil((r * 2 + pad * 2) * d);
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"); g.scale(d, d);
    const cx = r + pad, cy = r + pad;
    g.save(); g.shadowColor = "rgba(80,48,22,.42)"; g.shadowBlur = r * 0.32; g.shadowOffsetY = r * 0.14; g.shadowOffsetX = r * 0.05;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = col === BLACK ? "#2a2630" : "#f1ebe1"; g.fill(); g.restore();
    const gr = g.createRadialGradient(cx - r * 0.36, cy - r * 0.42, r * 0.06, cx, cy, r);
    if (col === BLACK) { gr.addColorStop(0, "#8e8898"); gr.addColorStop(0.32, "#423c48"); gr.addColorStop(1, "#1b181f"); }
    else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#faf6ee"); gr.addColorStop(1, "#d9cfbf"); }
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = gr; g.fill();
    const hx = cx - r * 0.36, hy = cy - r * 0.44, hl = g.createRadialGradient(hx, hy, 0, hx, hy, r * 0.5);
    hl.addColorStop(0, col === BLACK ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.95)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    if (col === WHITE) { g.strokeStyle = "rgba(150,126,100,.38)"; g.lineWidth = Math.max(0.7, r * 0.05); g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, 7); g.stroke(); }
    return { c, pad };
  }
  function stone(g, col, x, y, scale = 1, alpha = 1) {
    const s = R.spr[col], full = (R.r + s.pad) * 2;
    if (alpha !== 1) g.globalAlpha = alpha;
    g.drawImage(s.c, x - (R.r + s.pad) * scale, y - (R.r + s.pad) * scale, full * scale, full * scale);
    if (alpha !== 1) g.globalAlpha = 1;
  }
  const anims = [];
  let raf = 0;
  const kick = () => { if (!raf && G) raf = requestAnimationFrame(draw); };
  const easeBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  let atariSt = null, atariPts = null;
  function draw(now) {
    raf = 0;
    if (!G || !R.bg || $("play").hidden) return;
    now = now || performance.now();
    const g = ctx, d = R.dpr, st = G.st, N = st.size, NN = N * N, r = R.r, cl = R.cell;
    if (N !== R.N) { fit(true); return; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(R.bg, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);
    let live = false;
    // 형세: 소유 정도만큼 부드러운 네모
    if (G.est && G.phase === "play") {
      for (let p = 0; p < NN; p++) {
        const o = G.est.own[p], a = Math.abs(o); if (a < 0.18) continue;
        const own = o > 0 ? BLACK : WHITE; if (st.board[p] === own) continue;
        const [x, y] = ptXY(p), s = cl * (0.2 + 0.32 * a);
        g.fillStyle = own === BLACK ? `rgba(52,44,60,${0.25 + 0.45 * a})` : `rgba(255,255,255,${0.35 + 0.55 * a})`;
        roundRect(g, x - s / 2, y - s / 2, s, s, s * 0.28); g.fill();
      }
    }
    // 계가: 집 자리에 은은한 색 (흑 집 = 연보라, 백 집 = 우윳빛) — 돌 아래에
    if (G.phase !== "play" && G.score) {
      for (let p = 0; p < NN; p++) {
        const t = G.score.terr[p]; if (!t) continue;
        const [x, y] = ptXY(p);
        g.fillStyle = t > 0 ? "rgba(118,96,150,.2)" : "rgba(255,255,255,.42)";
        g.fillRect(x - cl / 2, y - cl / 2, cl, cl);
      }
    }
    // 돌
    const drops = new Map();
    for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; if (now - a.t0 > 700) anims.splice(i, 1); else if (a.k === "drop") drops.set(a.p, a); }
    const dead = G.phase !== "play" && G.dead ? G.dead : null;
    for (let p = 0; p < NN; p++) {
      const col = st.board[p]; if (!col) continue;
      const [x, y] = ptXY(p);
      const a = drops.get(p);
      if (a) {
        const t = Math.min(1, Math.max(0, (now - a.t0) / 240)), e = easeBack(t);
        if (t < 1) live = true;
        stone(g, col, x, y - r * 0.55 * (1 - e), 1.16 - 0.16 * e, Math.min(1, 0.35 + t * 1.6));
      } else if (dead && dead[p]) stone(g, col, x, y, 0.86, 0.5);
      else stone(g, col, x, y, 1, 1);
    }
    // 물결
    for (const a of anims) {
      if (a.k !== "ripple" || now < a.t0) { if (a.k === "ripple") live = true; continue; }
      const t = (now - a.t0) / 520; if (t >= 1) continue;
      live = true; const [x, y] = ptXY(a.p);
      g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - t)})`; g.lineWidth = 2.2 * (1 - t) + 0.5;
      g.beginPath(); g.arc(x, y, r * (1 + 0.9 * t), 0, 7); g.stroke();
    }
    // 마지막 수
    const last = st.moves.length ? st.moves[st.moves.length - 1] : -1;
    if (last >= 0 && last < NN && st.board[last] && G.phase === "play") {
      const [x, y] = ptXY(last);
      g.fillStyle = "#f2a25c"; g.beginPath(); g.arc(x, y, Math.max(3, r * 0.26), 0, 7); g.fill();
      g.strokeStyle = st.board[last] === BLACK ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.95)"; g.lineWidth = 1.2; g.stroke();
    }
    // 계가: 집 네모 · 사석 ✕
    if (G.phase !== "play" && G.score) {
      for (let p = 0; p < NN; p++) {
        const t = G.score.terr[p]; if (!t) continue;
        const [x, y] = ptXY(p), s = cl * 0.36;
        g.fillStyle = t > 0 ? "rgba(46,40,54,.82)" : "rgba(255,255,255,.95)";
        g.strokeStyle = t > 0 ? "rgba(255,255,255,.5)" : "rgba(130,105,80,.55)"; g.lineWidth = 1;
        roundRect(g, x - s / 2, y - s / 2, s, s, s * 0.25); g.fill(); g.stroke();
      }
      if (dead) for (let p = 0; p < NN; p++) {
        if (!dead[p] || !st.board[p]) continue;
        const [x, y] = ptXY(p), s = r * 0.42;
        g.strokeStyle = "rgba(242,100,126,.9)"; g.lineWidth = Math.max(1.6, r * 0.13); g.lineCap = "round";
        g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke();
      }
    }
    // 단수 알림: 둘 차례 돌 = 빨강(위험), 상대 돌 = 민트(잡을 수 있음)
    if (cfg.atari && G.phase === "play" && G.mode !== "watch" && !st.over) {
      if (atariSt !== st) { atariSt = st; atariPts = B.ataris(st); }   // 상태는 수마다 새 객체 → 객체가 같으면 다시 안 셈
      const pulse = 0.55 + 0.35 * Math.sin(now / 230);
      for (const c of [BLACK, WHITE]) {
        const pts = atariPts[c]; if (!pts.length) continue;
        const danger = c === st.toPlay;
        g.strokeStyle = danger ? `rgba(242,100,126,${pulse})` : `rgba(90,190,160,${pulse})`; g.lineWidth = Math.max(2, r * 0.16);
        for (const p of pts) { const [x, y] = ptXY(p); g.beginPath(); g.arc(x, y, r * 1.08, 0, 7); g.stroke(); }
        live = true;
      }
    }
    // 힌트
    if (G.hintP >= 0 && G.phase === "play") {
      const [x, y] = ptXY(G.hintP), t = now / 1000;
      g.fillStyle = `rgba(245,185,66,${0.28 + 0.14 * Math.sin(t * 5)})`; g.beginPath(); g.arc(x, y, r * (1.05 + 0.08 * Math.sin(t * 5)), 0, 7); g.fill();
      g.strokeStyle = "#f5b942"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r * 0.9, 0, 7); g.stroke();
      g.fillStyle = "#fff8de"; for (let k = 0; k < 3; k++) { const an = t * 2 + k * 2.1, rr = r * 1.15; g.beginPath(); g.arc(x + Math.cos(an) * rr, y + Math.sin(an) * rr, Math.max(1.5, r * 0.09), 0, 7); g.fill(); }
      live = true;
    }
    // 미리 놓기(13·19줄 확인) · 마우스 그림자 · 키보드 칸
    const me = st.toPlay;
    if (canHumanMove()) {
      if (G.pending >= 0 && !st.board[G.pending]) {
        const [x, y] = ptXY(G.pending), pl = 0.5 + 0.5 * Math.sin(now / 160);
        stone(g, me, x, y, 1, 0.62);
        g.strokeStyle = `rgba(242,162,92,${0.6 + 0.4 * pl})`; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r * (1.15 + 0.1 * pl), 0, 7); g.stroke();
        live = true;
      }
      if (G.hover >= 0 && G.hover !== G.pending && !st.board[G.hover]) { const [x, y] = ptXY(G.hover); stone(g, me, x, y, 1, 0.42); }
      if (G.cursor >= 0) {
        const [x, y] = ptXY(G.cursor), s = r * 1.1;
        if (!st.board[G.cursor]) stone(g, me, x, y, 1, 0.35);
        g.strokeStyle = "#f2a25c"; g.lineWidth = 2.5; roundRect(g, x - s, y - s, 2 * s, 2 * s, s * 0.3); g.stroke();
      }
    } else if (G.phase === "score" && G.cursor >= 0) {
      const [x, y] = ptXY(G.cursor), s = r * 1.1;
      g.strokeStyle = "#f2a25c"; g.lineWidth = 2.5; roundRect(g, x - s, y - s, 2 * s, 2 * s, s * 0.3); g.stroke();
    }
    if (loupeOn) drawLoupe();
    if (live || anims.length) kick();
  }

  /* ── 손가락·마우스·키보드 ────────────────────────────────── */
  function ptAt(cx, cy) {
    const rect = canvas.getBoundingClientRect(), x = cx - rect.left, y = cy - rect.top;
    const gx = Math.round((x - R.o) / R.cell), gy = Math.round((y - R.o) / R.cell);
    if (gx < 0 || gy < 0 || gx >= R.N || gy >= R.N) return -1;
    const dx = x - (R.o + gx * R.cell), dy = y - (R.o + gy * R.cell);
    return dx * dx + dy * dy > Math.pow(R.cell * 0.66, 2) ? -1 : gy * R.N + gx;
  }
  let touch = null;
  const needConfirm = () => G && G.st.size >= 13;
  canvas.addEventListener("pointerdown", e => {
    if (!G) return;
    e.preventDefault();
    if (G.phase === "score") { const p = ptAt(e.clientX, e.clientY); if (p >= 0 && G.st.board[p]) toggleDead(p); return; }
    if (!canHumanMove()) return;
    const p = ptAt(e.clientX, e.clientY);
    G.cursor = -1;
    if (e.pointerType === "mouse") { if (e.button === 0 && p >= 0) tapPoint(p, true); return; }
    if (touch) return;                                                // 두 번째 손가락은 무시 (첫 손가락이 끝날 때까지)
    touch = { id: e.pointerId, p };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    G.hover = p;
    if (needConfirm()) showLoupe(e.clientX, e.clientY);
    kick();
  });
  canvas.addEventListener("pointermove", e => {
    if (!G) return;
    if (e.pointerType === "mouse" && !touch) {
      const p = canHumanMove() ? ptAt(e.clientX, e.clientY) : -1;
      if (p !== G.hover) { G.hover = p; kick(); }
      return;
    }
    if (!touch || e.pointerId !== touch.id) return;
    const p = ptAt(e.clientX, e.clientY);
    touch.p = p; G.hover = p;
    if (loupeOn) moveLoupe(e.clientX, e.clientY);
    kick();
  });
  const endTouch = (e, cancel) => {
    if (!touch || e.pointerId !== touch.id) return;
    const p = touch.p; touch = null; hideLoupe();
    if (G) { G.hover = -1; if (!cancel && p >= 0) tapPoint(p, !needConfirm()); kick(); }
  };
  canvas.addEventListener("pointerup", e => endTouch(e, false));
  canvas.addEventListener("pointercancel", e => endTouch(e, true));
  canvas.addEventListener("lostpointercapture", e => endTouch(e, true));
  canvas.addEventListener("pointerleave", e => { if (G && e.pointerType === "mouse" && G.hover >= 0) { G.hover = -1; kick(); } });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  $("stage").addEventListener("touchmove", e => e.preventDefault(), { passive: false });

  function tapPoint(p, direct) {
    if (!canHumanMove() || p < 0) return;
    const st = G.st;
    if (st.board[p]) { if (G.pending >= 0) { G.pending = -1; updateAll(); } return; }
    if (!B.isLegal(st, p)) { illegal({ why: p === st.ko ? "ko" : "suicide" }); return; }
    if (!direct && G.pending !== p) { G.pending = p; sfx("tap"); updateAll(); return; }
    G.pending = -1;
    play(p, "human");
  }

  // 돋보기: 손가락 위쪽에 판 일부를 크게 (19줄에서 정확하게)
  const loupe = $("loupe"), lctx = loupe.getContext("2d");
  let loupeOn = false, lx = 0, ly = 0;
  function showLoupe(x, y) {
    const D = 132, dpr = R.dpr;
    if (loupe.width !== Math.round(D * dpr)) { loupe.width = loupe.height = Math.round(D * dpr); }
    loupeOn = true; loupe.hidden = false; moveLoupe(x, y);
  }
  function moveLoupe(x, y) {
    lx = x; ly = y;
    const D = 132, vw = innerWidth;
    let left = x - D / 2, top = y - D - 70;
    if (top < 8) top = y + 60;
    left = Math.max(8, Math.min(vw - D - 8, left));
    loupe.style.left = left + "px"; loupe.style.top = top + "px";
    kick();
  }
  function hideLoupe() { loupeOn = false; loupe.hidden = true; }
  // 돋보기는 그림을 늘리지 않고 그 자리만 크게 다시 그림 (또렷하게)
  function vecStone(g, col, x, y, r, alpha = 1) {
    g.globalAlpha = alpha;
    const gr = g.createRadialGradient(x - r * 0.36, y - r * 0.42, r * 0.06, x, y, r);
    if (col === BLACK) { gr.addColorStop(0, "#8e8898"); gr.addColorStop(0.32, "#423c48"); gr.addColorStop(1, "#1b181f"); }
    else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#faf6ee"); gr.addColorStop(1, "#d9cfbf"); }
    g.fillStyle = "rgba(80,48,22,.25)"; g.beginPath(); g.arc(x + r * 0.05, y + r * 0.14, r, 0, 7); g.fill();
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (col === WHITE) { g.strokeStyle = "rgba(150,126,100,.4)"; g.lineWidth = r * 0.05; g.stroke(); }
    g.globalAlpha = 1;
  }
  function drawLoupe() {
    const D = 132, dpr = R.dpr, Zm = R.N >= 19 ? 2.5 : 2.1, st = G.st, N = R.N, o = R.o, cl = R.cell, end = o + (N - 1) * cl, r = R.r;
    const rect = canvas.getBoundingClientRect();
    let cx = lx - rect.left, cy = ly - rect.top;
    if (G.hover >= 0) [cx, cy] = ptXY(G.hover);
    const g = lctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgG = g.createLinearGradient(0, 0, D, D); bgG.addColorStop(0, "#f6dbab"); bgG.addColorStop(1, "#edc78e");
    g.fillStyle = bgG; g.fillRect(0, 0, D, D);
    g.save(); g.translate(D / 2, D / 2); g.scale(Zm, Zm); g.translate(-cx, -cy);
    g.strokeStyle = "rgba(92,58,30,.7)";
    for (let i = 0; i < N; i++) {
      const p = o + i * cl; g.lineWidth = (i === 0 || i === N - 1 ? 1.8 : 1) / Zm * 1.3;
      g.beginPath(); g.moveTo(o, p); g.lineTo(end, p); g.moveTo(p, o); g.lineTo(p, end); g.stroke();
    }
    g.fillStyle = "rgba(84,52,28,.82)";
    for (const sp of B.starPoints(N)) { const [x, y] = ptXY(sp); g.beginPath(); g.arc(x, y, Math.max(2.2, cl * 0.1) * 0.8, 0, 7); g.fill(); }
    const half = D / Zm / 2 + cl;
    for (let p = 0; p < N * N; p++) {
      const col = st.board[p]; if (!col) continue;
      const [x, y] = ptXY(p); if (Math.abs(x - cx) > half || Math.abs(y - cy) > half) continue;
      vecStone(g, col, x, y, r);
    }
    if (G.hover >= 0 && !st.board[G.hover]) {
      const [x, y] = ptXY(G.hover);
      vecStone(g, st.toPlay, x, y, r, 0.55);
      g.strokeStyle = "rgba(242,162,92,.95)"; g.lineWidth = 2.4 / Zm; g.beginPath(); g.arc(x, y, r * 1.12, 0, 7); g.stroke();
    }
    g.restore();
    // 가운데 십자 (손가락이 가리는 곳)
    g.strokeStyle = "rgba(91,70,54,.25)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(D / 2 - 7, D / 2); g.lineTo(D / 2 + 7, D / 2); g.moveTo(D / 2, D / 2 - 7); g.lineTo(D / 2, D / 2 + 7); g.stroke();
  }

  addEventListener("keydown", e => {
    if (!G || $("play").hidden || !$("resBox").hidden || document.querySelector(".overlay:not(#resBox)")) return;
    const N = G.st.size, k = e.key;
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (mv) {
      e.preventDefault();
      if (G.cursor < 0) G.cursor = Math.floor(NN2() / 2);
      const x = Math.max(0, Math.min(N - 1, G.cursor % N + mv[0])), y = Math.max(0, Math.min(N - 1, Math.floor(G.cursor / N) + mv[1]));
      G.cursor = y * N + x; G.hover = -1; kick(); return;
    }
    if (k === "Enter" || k === " ") {
      if (G.cursor < 0) return;
      e.preventDefault();
      if (G.phase === "score") { if (G.st.board[G.cursor]) toggleDead(G.cursor); } else tapPoint(G.cursor, true);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) { if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "z") { e.preventDefault(); $("undoBtn").click(); } return; }
    const key = k.toLowerCase();
    if (key === "p") $("passBtn").click();
    else if (key === "u" || k === "Backspace") { e.preventDefault(); $("undoBtn").click(); }
    else if (key === "h") $("hintBtn").click();
    else if (key === "e") $("estBtn").click();
    else if (key === "m") $("sndBtn").click();
  });
  const NN2 = () => G.st.size * G.st.size;

  // 탭이 숨으면 AI 구경은 멈춤 (돌아오면 이어서)
  document.addEventListener("visibilitychange", () => {
    if (!G || G.mode !== "watch") return;
    if (document.hidden) { if (!G.paused) { G.autoPaused = true; setPaused(true); } }
    else if (G.autoPaused) { G.autoPaused = false; setPaused(false); }
  });

  // 시험용 손잡이 (자동 시험·디버그)
  window.__baduk = {
    get G() { return G; }, B,
    nn: () => nnState, wasm: () => nnWasm,
    state: () => G && B.toJSON(G.st),
    play: a => (G ? play(a, "human") : false),
    tap: p => tapPoint(p, true),
    ff(moves) { for (const a of moves) { const r = B.play(G.st, a); if (r.state === G.st) return false; G.st = r.state; } updateAll(); return true; },
    ask, fit: () => fit(true), cfg,
    geom: () => { const rc = canvas.getBoundingClientRect(); return { left: rc.left, top: rc.top, S: R.S, o: R.o, cell: R.cell, N: R.N }; },
    start: o => { Object.assign(cfg, o || {}); (o && o.mode === "duo") ? startDuo() : (o && o.mode === "watch") ? startWatch() : startSolo(); },
    finish: () => finish(), score: () => enterScoring(),
  };

  // 시작
  startWorker(); noteAI(); drawMenu(); show("home");
  if (window.ArenaUI) ArenaUI.checkUrl({
    game: "baduk", title: "바둑", max: 2, min: 2,
    renderConfig: (c) => `${(c && c.size) || 9}줄 · 덤 6.5 · 방장 ${(c && c.hostColor) === 2 ? "백" : "흑"}`,
    onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
  });
})();

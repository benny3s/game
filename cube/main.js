/* 베니큐브 화면 — 메뉴 · 게임 한 판 · AI 구경 (common/cozy.js + core.js + ai.js 위에서) */
(() => {
  "use strict";
  const { esc, store, save, toast, modal, confetti, sfx, backGuard, howto, tierCards, TIERS, vibrate } = window.Cozy;
  const $ = (id) => document.getElementById(id);
  const Cube = window.Cube, AI = window.CubeAI, Table = window.CubeTable;

  // ── 고르기 값 (저장해 둠) ───────────────────────────────
  const saved = store("cube.opt", {});
  const O = Object.assign({ ai: 1, tier: "normal", rule: "easy", wtier: "hard", wrule: "classic", lh: 2, lai: 0, ltier: "normal", lnames: [] }, saved && typeof saved === "object" ? saved : {});
  if (!Array.isArray(O.lnames)) O.lnames = [];
  const saveOpt = () => save("cube.opt", O);

  const TIER_ITEMS = [
    { id: "easy", em: "🌱", name: "입문자", desc: "가끔 실수해요", cls: "t-easy" },
    { id: "normal", em: "🀄", name: "숙련자", desc: "묶음을 잘 맞춰요", cls: "t-normal" },
    { id: "hard", em: "👑", name: "큐브 마스터", desc: "남의 타일까지 기억", cls: "t-hard" },
  ];
  const RULE_DESC = {
    easy: "★ 조커 타일 두 장이 만능이에요. 처음엔 이 규칙이 쉬워요.",
    classic: "표시 타일의 다음 숫자가 만능이에요 (13 다음은 1). ★ 타일은 그 만능 숫자 노릇만 해요.",
  };
  const HOWTO = [
    "받침대 14장을 모두 묶음으로 맞춘 뒤 한 장을 버리면 이겨요.",
    "묶음 = 같은 숫자 다른 색 3장 / 같은 색 이어진 숫자 3장",
    "차례마다 한 장 뽑고 한 장을 버려요. 앞사람이 버린 타일을 가져와도 돼요.",
    "끝낼 수 있으면 <b>베니!</b> 단추가 나타나요.",
    "빛나는 테두리(✦) 조커 타일은 아무 타일 대신 쓸 수 있는 만능이에요.",
  ];
  const BOT_NAMES = ["민수", "서연", "도윤", "지우"];
  const COLOR_NAMES = ["빨강", "민트", "노랑", "보라"];
  // 묶음 색 띠: [띠 색, 타일 바탕]
  const GROUPS = [
    ["#ffb59b", "#fff1e9"], ["#8fd8c5", "#eaf8f3"], ["#ffd777", "#fff8e2"],
    ["#b9a4e8", "#f3eefc"], ["#9ec9f5", "#eaf3fd"], ["#f7a9c4", "#fdeef4"],
  ];

  let G = null, tab = "solo", hsPick = null;
  const hsClose = () => { if (window.HotSeat && HotSeat.isOpen) { try { HotSeat.close(); } catch (e) {} } };
  const ruleName = (r) => (r === "classic" ? "전통" : "쉬움");

  // ── 작은 도우미 ─────────────────────────────────────────
  const rectOf = (el) => (el ? el.getBoundingClientRect() : null);
  const rackTileEl = (id) => $("rack").querySelector('.tile[data-id="' + id + '"]');
  const inRect = (r, x, y) => !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  function seg(el, items, cur, on) {
    el.innerHTML = items
      .map(([v, label]) => `<button class="btn" aria-pressed="${String(v) === String(cur)}" data-v="${v}">${label}</button>`)
      .join("");
    el.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      sfx.play("tap");
      on(b.dataset.v);
    };
  }

  // 타일 그리기 (화면 어디서나 같은 모양)
  function tileHtml(st, id, extra, style) {
    const t = Cube.tile(id);
    const wild = Cube.isWild(st, id);
    const cls = ["tile"];
    if (t.cat) cls.push("cat");
    if (wild) cls.push("wild");
    let c = t.c;
    if (t.cat && st.rule === "classic" && st.wildFace != null) c = Math.floor(st.wildFace / 26);
    if (c >= 0) cls.push("t" + c);
    if (extra) cls.push(extra);
    const face = t.cat ? "★" : String(t.v);
    const label = t.cat ? "조커" : (COLOR_NAMES[c] || "") + " " + t.v;
    return `<div class="${cls.join(" ")}" data-id="${id}" aria-label="${label}"${style ? ` style="${style}"` : ""}>` +
      `<b>${face}</b>${t.cat ? "" : '<i class="dot"></i>'}<i class="gb"></i></div>`;
  }
  function tileNode(st, id, extra) {
    const tmp = document.createElement("div");
    tmp.innerHTML = tileHtml(st, id, extra);
    return tmp.firstElementChild;
  }

  // 손패 정리 순서: 완성 묶음 먼저, 남은 타일은 얼굴 순서, 만능은 뒤
  function tidyOrder(st, ids) {
    const fk = (id) => { const f = AI.faceOf(st, id); return f < 0 ? 1000 : f; };
    const a = Cube.arrange(st, ids);
    const groups = a.groups.map((g) => g.slice().sort((x, y) => fk(x) - fk(y)));
    const minOf = (g) => { let v = 1000; for (const id of g) { const f = fk(id); if (f < v) v = f; } return v; };
    groups.sort((g1, g2) => minOf(g1) - minOf(g2));
    const rest = a.rest.slice().sort((x, y) => fk(x) - fk(y));
    const out = [];
    for (const g of groups) out.push(...g);
    out.push(...rest);
    return out;
  }

  // 묶음 띠가 줄바꿈을 넘지 않게 다듬기
  function fixJoins(root) {
    root.querySelectorAll(".tile.join-l, .tile.join-r").forEach((t) => {
      const sibs = [...t.parentElement.querySelectorAll(".tile")];
      const i = sibs.indexOf(t);
      if (t.classList.contains("join-l")) {
        const o = sibs[i - 1];
        if (!o || o.offsetTop !== t.offsetTop) t.classList.remove("join-l");
      }
      if (t.classList.contains("join-r")) {
        const o = sibs[i + 1];
        if (!o || o.offsetTop !== t.offsetTop) t.classList.remove("join-r");
      }
    });
  }

  // ── 메뉴 ───────────────────────────────────────────────
  function setTab(t) {
    tab = t;
    $("tabSolo").setAttribute("aria-pressed", String(t === "solo"));
    $("tabLocal").setAttribute("aria-pressed", String(t === "local"));
    $("tabWatch").setAttribute("aria-pressed", String(t === "watch"));
    $("soloBox").hidden = t !== "solo";
    $("localBox").hidden = t !== "local";
    $("watchBox").hidden = t !== "watch";
  }
  const LOCAL_AV = ["🐱", "🐶", "🐰", "🐻"];
  const localName = (i) => (O.lnames[i] || "").trim() || `${i + 1}번`;

  function drawMenu() {
    setTab(tab);
    seg($("aiCount"), [["1", "1명"], ["2", "2명"], ["3", "3명"]], O.ai, (v) => { O.ai = +v; saveOpt(); drawMenu(); });
    tierCards($("tiers"), TIER_ITEMS, (id) => { O.tier = id; saveOpt(); drawMenu(); }, { selected: O.tier });
    seg($("rules"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], O.rule, (v) => { O.rule = v; saveOpt(); drawMenu(); });
    $("ruleDesc").textContent = RULE_DESC[O.rule] || "";

    tierCards($("wTiers"), TIER_ITEMS, (id) => { O.wtier = id; saveOpt(); drawMenu(); }, { selected: O.wtier });
    seg($("wRules"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], O.wrule, (v) => { O.wrule = v; saveOpt(); drawMenu(); });
    $("wRuleDesc").textContent = RULE_DESC[O.wrule] || "";

    // 한 폰으로: 사람 2~4 + AI 채우기 (모두 합쳐 4명까지)
    O.lh = Math.min(4, Math.max(2, +O.lh || 2));
    O.lai = Math.max(0, Math.min(4 - O.lh, +O.lai || 0));
    seg($("lHumans"), [["2", "2명"], ["3", "3명"], ["4", "4명"]], O.lh, (v) => { O.lh = +v; saveOpt(); drawMenu(); });
    const aiOpts = [["0", "없음"]];
    for (let k = 1; k <= 4 - O.lh; k++) aiOpts.push([String(k), "+AI " + k + "명"]);
    seg($("lAi"), aiOpts, O.lai, (v) => { O.lai = +v; saveOpt(); drawMenu(); });
    $("lAi").closest(".field").hidden = O.lh >= 4;
    $("lTiers").hidden = !O.lai;
    tierCards($("lTiers"), TIER_ITEMS, (id) => { O.ltier = id; saveOpt(); drawMenu(); }, { selected: O.ltier });
    seg($("lRules"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], O.rule, (v) => { O.rule = v; saveOpt(); drawMenu(); });
    $("lNames").innerHTML = Array.from({ length: O.lh }, (_, i) =>
      `<label class="lname"><span>${LOCAL_AV[i]}</span><input type="text" maxlength="8" data-i="${i}" placeholder="${i + 1}번" value="${esc(O.lnames[i] || "")}"></label>`).join("");
    $("lNames").oninput = (e) => { const i = +e.target.dataset.i; if (i >= 0) { O.lnames[i] = e.target.value.slice(0, 8); saveOpt(); } };
    // 공용 자리 고르기(common/hotseat.js)가 있으면 그것으로 (자리마다 사람/AI) — 없으면 위의 기본 고르기
    if (window.HotSeat && !hsPick) {
      try { hsPick = HotSeat.setup($("lSeats"), { game: "cube", min: 2, max: 4, allowAI: true, tiers: ["easy", "normal", "hard"] }); } catch (e) { console.warn(e); hsPick = null; }
    }
    if (hsPick) {
      $("lSeats").hidden = false;
      for (const id of ["lHumansF", "lNames", "lTiers"]) $(id).hidden = true;
      $("lAi").closest(".field").hidden = true;
    }

    $("tabSolo").onclick = () => { setTab("solo"); sfx.play("tap"); };
    $("tabLocal").onclick = () => { setTab("local"); sfx.play("tap"); };
    $("localBtn").onclick = () => startGame("local");
    $("tabWatch").onclick = () => { setTab("watch"); sfx.play("tap"); };
    if ($("tabFriend")) $("tabFriend").onclick = () => { sfx.play("tap"); openFriendModal(); };
    $("startBtn").onclick = () => startGame("solo");
    $("watchBtn").onclick = () => startGame("watch");
    $("rulesBtn").onclick = () => howto("cube", "베니큐브 하는 법", HOWTO, { force: true });
  }

  const mySeat = () => (G && G.mySeat != null ? G.mySeat : 0);
  // 진동은 이 화면을 한 번이라도 누른 뒤에만 (안 누른 채 부르면 브라우저가 막고 오류를 남김)
  const buzz = (ms) => { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; } catch (e) {} vibrate(ms); };

  // ── 친구랑 (2~4명, 모인 사람 수대로 · 빈 자리는 AI 채우기) ──
  const hashStr = (s) => { let h = 2166136261; for (const ch of String(s || "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; };
  const FILL_ITEMS = [["0", "사람만"], ["3", "3명까지"], ["4", "4명까지"]];
  const ruleLabel = (r) => (r === "classic" ? "🀄 전통" : "★ 쉬움 (조커)");
  const curCfg = () => (window.ArenaUI && ArenaUI.net && ArenaUI.net.meta && ArenaUI.net.meta.cfg) || {};

  function openFriendModal() {
    if (!window.ArenaUI) return toast("온라인 모듈을 불러오지 못했어요");
    ArenaUI.open({
      game: "cube", title: "베니큐브", max: 4, min: 2, coach: true,
      describe: (n, c) => Table.describe(n, (c || curCfg()).fill),
      settings: {
        defaults: { rule: O.rule || "easy", fill: 0, tier: "normal", seed: (Date.now() ^ ((Math.random() * 2147483647) | 0)) | 0 },
        label: (c) => `${ruleLabel(c && c.rule)}${c && +c.fill ? ` · AI로 ${c.fill}명까지` : ""}`,
        render(el, c, canEdit, update) {
          c = c || {};
          el.innerHTML = `<div class="fset">
            <div class="field"><span class="small">규칙</span><div class="seg" data-k="rule"></div></div>
            <div class="field"><span class="small">빈 자리 AI 채우기</span><div class="seg" data-k="fill"></div></div>
            <div class="field" data-tierf><span class="small">AI 실력</span><div class="seg" data-k="tier"></div></div>
            ${canEdit ? "" : `<p class="small fnote">방장이 고르는 설정이에요</p>`}
          </div>`;
          const put = (k, items, cur) => {
            const box = el.querySelector(`[data-k="${k}"]`);
            box.innerHTML = items.map(([v, t]) => `<button class="btn" data-v="${v}" aria-pressed="${String(v) === String(cur)}"${canEdit ? "" : " disabled"}>${t}</button>`).join("");
            box.onclick = (e) => { const b = e.target.closest("button"); if (!b || !canEdit) return; sfx.play("tap"); update({ [k]: k === "fill" ? +b.dataset.v : b.dataset.v }); };
          };
          put("rule", [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], c.rule || "easy");
          put("fill", FILL_ITEMS, +c.fill || 0);
          put("tier", TIER_ITEMS.map((t) => [t.id, t.em + " " + t.name]), c.tier || "normal");
          el.querySelector("[data-tierf]").hidden = !+c.fill;
        },
      },
      onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c || {}, players }),
      onLeave: (why) => { if (G && G.mode === "online") { goMenu(); if (why) toast(why); } },
      onLobby: () => { if (G && G.mode === "online") goMenu(true); },   // 방장이 대기실로 (방은 그대로)
    });
  }

  // 판을 화면에 띄움 (온라인·혼자 공통)
  function showPlay(watch, spec) {
    document.body.classList.add("playing");
    const play = $("play");
    play.hidden = false;
    play.classList.toggle("watch", watch);
    play.classList.toggle("spec", !!spec);   // 친구랑 구경꾼: 내 받침대 없이 테이블만
    $("wstage").hidden = !watch;
    $("actbar").hidden = watch || !!spec;
    $("dock").hidden = watch || !!spec;
    $("wdock").hidden = !watch;
    $("coachBtn").hidden = true;   // 판이 시작되면 setupCoach 가 정함
    $("coachFb").hidden = true;
    window.scrollTo(0, 0);
  }

  function newG(o) {
    return Object.assign({
      mode: "solo", mySeat: 0, n: 2, levels: [], names: [], avs: [], rule: "easy",
      totals: [], roundBase: [], round: 0, st: null, log: [], mems: [], rack: [], racks: {},
      sel: null, winMode: false, hintId: null, hintedPile: null,
      over: false, finished: false, paused: false, speed: 1,
      thinking: -1, flashSeat: -1, lastMsg: "", lastWin: null,
      modalClose: null, drag: null, aiTimer: 0,
      coachOn: false, coach: null, coachKey: "", viewing: 0, cover: false,
      spec: false, subs: [], drops: [], baseNames: [], ready: new Set(), joinPick: {}, turnT: 0, turnKey: "", turnLeft: null, goneAsk: null, drawReady: null,
    }, o);
  }

  // 방장이 친구에게 보내는 판 전체 (늦게 받은 사람도 이걸로 맞춤). totals 는 이 판이 시작할 때 값 (끝난 판을 되감을 때 점수가 두 번 안 쌓이게)
  function goMsg() {
    return {
      t: "go", seats: G.seatUids, names: G.names, avs: G.avs,
      kinds: G.levels.map((l) => (l === "human" || l === "remote" ? "p" : "bot")), subs: G.subs,
      rule: G.rule, round: G.round, seed: G.roundSeed, log: G.log, totals: G.roundBase, coach: G.coachOn,
    };
  }

  // ── 친구랑: 점수판 · 구경 · 내 차례 30초 · 끊긴 자리 · 판 사이 준비 ──
  let TURN_SEC = 30;                       // 내 차례 한 번(뽑기 / 버리기)에 주는 시간 (시험에서만 바꿈)
  const SEAT_AV = ["🙋", "🦊", "🐼", "🐰"];
  const netPlayers = () => (G && G.net && G.net.players) || {};
  const watchersOf = () => Object.keys(netPlayers()).filter((u) => !G.seatUids.includes(u));
  const clearTurnT = (g) => { if (g && g.turnT) { clearInterval(g.turnT); g.turnT = 0; } if (g) { g.turnKey = ""; g.turnLeft = null; } };
  // 판(G)을 버릴 때 타이머를 모두 정리
  function dropG(g) {
    if (!g) return;
    clearTimeout(g.aiTimer); clearInterval(g.hiTimer); clearTurnT(g);
    if (g.goneAsk) { try { g.goneAsk.close(); } catch (e) {} g.goneAsk = null; }
    if (g.modalClose) { try { g.modalClose(); } catch (e) {} g.modalClose = null; }
  }

  // 한 줄 점수판: 자리마다 점수, 지금 차례는 금색, 끊긴 사람은 🔌, 구경 인원
  function scoreBarEl() {
    let el = $("scoreBar");
    if (!el) { el = document.createElement("div"); el.className = "scorebar"; el.id = "scoreBar"; el.hidden = true; const bar = document.querySelector("#play .bar"); bar.parentNode.insertBefore(el, bar.nextSibling); }
    return el;
  }
  function renderScore() {
    const el = scoreBarEl();
    if (!G || G.mode !== "online" || !G.st) { el.hidden = true; return; }
    const st = G.st, pl = netPlayers(), turnSeat = st.phase === "over" ? -1 : st.turn;
    el.hidden = false;
    el.innerHTML = G.names.map((nm, s) => {
      const u = G.seatUids[s], gone = !!u && !pl[u] && !G.subs[s];
      return `<span class="sbi${s === turnSeat ? " on" : ""}${gone || G.subs[s] ? " rest" : ""}"><b>${esc(s === G.mySeat && !G.spec ? "나" : nm)}</b> ${G.totals[s] || 0}점${gone ? " 🔌" : ""}</span>`;
    }).join("") + (() => { const k = watchersOf().length; return k ? `<span class="sbi">👀 구경 ${k}</span>` : ""; })();
  }

  // 내 차례 30초 (친구랑): 지나면 숙련자 AI 가 대신 둠. 10초 남으면 알림. 같은 차례(수 번호)면 다시 시작하지 않음
  function turnTimer() {
    const g = G;
    if (!g) return;
    const st = g.st, me = mySeat();
    if (g.mode !== "online" || g.spec || !st || st.phase === "over" || g.over || g.modalClose || st.turn !== me) { clearTurnT(g); return; }
    const key = g.round + ":" + g.log.length;
    if (g.turnKey === key && g.turnT) return;
    clearTurnT(g);
    g.turnKey = key;
    if (st.phase === "draw" || g.log.length === 0) { sfx.play("pop"); buzz(40); }   // 내 차례가 왔어요
    const end = Date.now() + TURN_SEC * 1000;
    g.turnLeft = TURN_SEC;
    g.turnT = setInterval(() => {
      if (G !== g || !g.st || g.over || g.st.phase === "over" || g.st.turn !== mySeat() || g.turnKey !== g.round + ":" + g.log.length) { clearTurnT(g); return; }
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left !== g.turnLeft) { g.turnLeft = left; if (left === 10) { toast("⏱ 10초 남았어요", 1500); buzz(30); } renderBar(); }
      if (left <= 0) {
        clearTurnT(g);
        toast("⏱ 30초가 지나서 AI 가 대신 뒀어요", 2000);
        autoTurn(g);
      }
    }, 250);
    renderBar();
  }
  // 시간이 다 되면: 지금 할 일을 숙련자 AI 가 대신 (뽑았다면 이어서 버리기까지 — 자리를 비운 사람이 판을 오래 막지 않게)
  function autoTurn(g) {
    if (G !== g || !g.st || g.over || g.st.phase === "over" || g.st.turn !== mySeat()) return;
    if (g.sel != null) g.sel = null;
    const a = AI.act(g.st, mySeat(), "normal", g.mems[mySeat()]);
    if (!a) return;
    const wasDraw = g.st.phase === "draw";
    applyAction(a, true);
    if (wasDraw) setTimeout(() => { if (G === g && g.st && !g.over && g.st.phase === "discard" && g.st.turn === mySeat()) autoTurn(g); }, 650);
  }

  function startOnline({ net, role, cfg: c, players }) {
    if (G) goMenuQuiet();
    const coachOn = !!c.coach;
    if (role !== "host") {
      // 친구: 방장에게 판을 받아서 시작 (늦게 들어와도 지금 판에 맞춰짐 — 자리가 없으면 구경)
      G = newG({ mode: "online", net, role, waiting: true, coachOn });
      showPlay(false);
      $("actMsg").textContent = "방장과 맞추는 중…";
      $("opps").innerHTML = ""; $("rack").innerHTML = "";
      const hi = () => { if (G && G.net === net && G.waiting) net.send({ t: "hi" }, true); };
      G.offs = [net.on("msg", (m) => onGuestMsg(net, m)), net.on("players", () => onPlayers(net))];
      hi(); G.hiTimer = setInterval(hi, 1500);
      return;
    }
    const uids = Table.seatOrder(players, (net.meta && net.meta.host) || net.uid);
    const seats = Table.lineup(uids.map((u) => ({ id: u, name: (players[u] && players[u].name) || "친구" })), +c.fill || 0, BOT_NAMES);
    const tier = TIERS[c.tier] ? c.tier : "normal";
    const n = seats.length;
    G = newG({
      mode: "online", net, role, n, coachOn, tierName: tier, fillN: +c.fill || 0,
      mySeat: Math.max(0, seats.findIndex((s) => s.id === net.uid)),
      seatUids: seats.map((s) => s.id),
      levels: seats.map((s) => (s.kind === "bot" ? tier : s.id === net.uid ? "human" : "remote")),
      baseNames: seats.map((s) => s.name),
      names: seats.map((s) => (s.kind === "bot" ? s.name + "(AI)" : s.name)),
      avs: seats.map((s, i) => (s.kind === "bot" ? "🀄" : SEAT_AV[i % SEAT_AV.length])),
      subs: seats.map(() => false), drops: seats.map(() => false),
      rule: c.rule === "classic" ? "classic" : "easy",
      baseSeed: ((c.seed | 0) ^ hashStr(net.code)) | 0,
      totals: new Array(n).fill(0),
    });
    G.offs = [
      net.on("msg", (uid, m) => onHostMsg(net, uid, m)),
      // 친구가 판 도중 나가면: 5초 안에 안 돌아오면 방장이 고름 (AI 가 대신 · 다음 판부터 빼기 · 처음부터 · 기다리기)
      net.on("leave", (uid) => {
        if (!G || G.net !== net) return;
        const s = G.seatUids.indexOf(uid);
        if (s < 0 || G.subs[s]) return;
        toast(`${G.baseNames[s]} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
        renderScore(); if (G.drawReady) G.drawReady();
        const g = G;
        setTimeout(() => { if (G !== g || g.net !== net || (net.players || {})[uid] || g.seatUids[s] !== uid || g.subs[s]) return; askGone(s); }, 5000);
      }),
      // 돌아오면 그 자리를 다시 줌
      net.on("join", (uid) => {
        if (!G || G.net !== net) return;
        const s = G.seatUids.indexOf(uid);
        if (s < 0) return;
        if (G.goneAsk && G.goneAsk.uid === uid) { try { G.goneAsk.close(); } catch (e) {} G.goneAsk = null; }
        if (G.subs[s]) restoreSeat(s);
      }),
      net.on("players", () => onPlayers(net)),
    ];
    showPlay(false);
    startRound(G.baseSeed);
    net.broadcast(goMsg(), true);
  }

  // 방 사람이 들고 나면: 점수판(구경 인원) · 준비 목록
  function onPlayers(net) {
    if (!G || G.net !== net) return;
    renderScore();
    if (G.drawReady) G.drawReady();
  }

  function onHostMsg(net, uid, m) {
    if (!m || !G || G.net !== net) return;
    const seat = G.seatUids.indexOf(uid);
    if (m.t === "hi") {
      net.send(uid, goMsg(), true);   // 자리가 없는 사람(구경)도 지금 판을 받음
      if (G.over) net.send(uid, { t: "rdyl", round: G.round, uids: [...G.ready], pick: G.joinPick }, true);   // 결과 창이면 준비 목록도
    } else if (m.t === "act") {
      // 차례인 사람의 다음 수만 받음 — 어긋나면 그 친구에게 판 전체를 다시 보냄
      const st = G.st;
      if (st && seat >= 0 && seat === st.turn && G.levels[seat] === "remote" && m.k === G.log.length && applyAction(m.a, false, false, true)) return;
      if (seat >= 0) net.send(uid, goMsg(), true);
    } else if (m.t === "rdy") {
      // 판 사이 준비 (구경꾼이 누르면 '다음 판에 낄래요')
      if (m.round !== G.round) return;
      G.ready.add(uid);
      if (seat < 0) G.joinPick[uid] = true;
      broadcastReady();
      if (G.drawReady) G.drawReady();
    }
  }
  function broadcastReady() {
    if (G && G.role === "host") G.net.broadcast({ t: "rdyl", round: G.round, uids: [...G.ready], pick: G.joinPick }, true);
  }

  function onGuestMsg(net, m) {
    if (!m || !G || G.net !== net) return;
    if (m.t === "go") {
      const me = (m.seats || []).indexOf(net.uid);
      const keep = { net, role: G.role, offs: G.offs, coachOn: !!m.coach };
      coachClose(G);
      dropG(G);
      const n = m.seats.length;
      G = newG(Object.assign(keep, {
        mode: "online", n, mySeat: me, spec: me < 0, seatUids: m.seats, names: m.names.slice(), avs: m.avs.slice(),
        levels: m.kinds.map((k, i) => (i === me ? "human" : "remote")), rule: m.rule, totals: (m.totals || []).slice(),
        subs: (m.subs || m.seats.map(() => false)).slice(),
      }));
      if (G.totals.length !== n) G.totals = new Array(n).fill(0);
      showPlay(false, G.spec);
      startRound(m.seed);
      G.round = m.round;
      for (const a of m.log || []) if (!applyAction(a, false, true, true)) break;
      render(); schedule();
    } else if (m.t === "act") {
      if (!G.st || G.waiting) return;
      if (m.k === G.log.length) applyAction(m.a, false, false, true);
      else if (m.k > G.log.length) net.send({ t: "hi" }, true);   // 빠진 수가 있으면 다시 받기
    } else if (m.t === "bot") {
      // 자리 주인이 바뀜: AI 가 대신 두는 중이거나(sub) 돌아옴
      if (G.names) { G.names[m.seat] = m.name; G.subs[m.seat] = !!m.sub; render(); }
    } else if (m.t === "rdyl") {
      if (m.round !== G.round) return;
      G.ready = new Set(m.uids || []); G.joinPick = m.pick || {};
      if (G.drawReady) G.drawReady();
    } else if (m.t === "full") {
      lateJoin();
    }
  }

  function lateJoin() {
    if (!G || G.lateShown) return;
    G.lateShown = true;
    clearInterval(G.hiTimer);
    modal({ title: "이미 시작한 판이에요", html: `<p class="resline">자리가 다 찼어요. 이번 판이 끝나고 방장이 새 방을 열면 같이 해요.</p>`, buttons: [{ label: "메뉴로", primary: true, onClick: () => goMenu() }] });
  }

  // 방장: 나간 사람 자리를 어떻게 할지 묻기
  function askGone(s) {
    if (!G || G.role !== "host" || G.goneAsk || G.subs[s] || G.over) return;
    const g = G, uid = g.seatUids[s];
    const canDrop = g.seatUids.filter((u, i) => i !== s && !g.drops[i]).length >= 2;
    const close = modal({
      title: `🔌 ${g.baseNames[s]} 님이 나갔어요`,
      html: `<p class="resline" style="font-size:15px">어떻게 할까요? AI 는 숙련자가 대신 해요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.</p>`,
      buttons: [{ label: "🤖 AI가 대신 해요", primary: true, onClick: () => subAI(s, false) }]
        .concat(canDrop ? [{ label: "👋 다음 판부터 빼기", onClick: () => subAI(s, true) }] : [])
        .concat([{ label: "🔄 처음부터 다시 (대기실로)", onClick: () => { if (window.ArenaUI && ArenaUI.net === g.net) { try { g.net.chat("🔄 방장이 처음부터 다시 하기로 했어요"); } catch (e) {} ArenaUI.toLobby(); } } }, { label: "⏳ 기다릴게요" }]),
      onClose: () => { if (g.goneAsk && g.goneAsk.close === close) g.goneAsk = null; },
    });
    g.goneAsk = { uid, close };
  }
  // 그 자리를 AI 가 대신 (drop 이면 다음 판부터 빠짐)
  function subAI(s, drop) {
    if (!G || G.role !== "host" || !G.seatUids[s]) return;
    G.subs[s] = true; G.drops[s] = !!drop; G.levels[s] = G.tierName; G.names[s] = G.baseNames[s] + "(AI)";
    G.net.broadcast({ t: "bot", seat: s, name: G.names[s], sub: true }, true);
    try { G.net.chat(drop ? `🤖 ${G.baseNames[s]} 님 자리는 이번 판만 AI 가 하고, 다음 판부터 빠져요` : `🤖 ${G.baseNames[s]} 님 자리는 AI 가 대신 해요 (돌아오면 다시 직접)`); } catch (e) {}
    render(); schedule();
    if (G.drawReady) G.drawReady();
  }
  function restoreSeat(s) {
    G.subs[s] = false; G.drops[s] = false; G.levels[s] = "remote"; G.names[s] = G.baseNames[s];
    G.net.broadcast({ t: "bot", seat: s, name: G.names[s], sub: false }, true);
    toast(`${G.baseNames[s]} 님이 돌아왔어요. 다시 직접 해요`, 2400);
    try { G.net.chat(`🙌 ${G.baseNames[s]} 님이 돌아와서 직접 해요`); } catch (e) {}
    clearTimeout(G.aiTimer);
    render(); schedule();
    if (G.drawReady) G.drawReady();
  }

  // 방장: 다음 판 자리 짜기 — 빼기로 한 사람은 빠지고, 구경하다 '낄래요' 한 사람은 4명까지 새로 앉음 (AI 자리는 사람에게 양보)
  function rebuildSeats() {
    const g = G, pl = netPlayers();
    const cur = g.seatUids.map((u, s) => ({ id: u, name: g.baseNames[s], av: g.avs[s], total: g.totals[s] || 0, sub: g.subs[s], drop: g.drops[s] }));
    const dropped = new Set(cur.filter((x) => x.drop && x.id).map((x) => x.id));
    const used = new Set(cur.filter((x) => !x.drop).map((x) => x.av));
    const fresh = Object.keys(pl).filter((u) => !g.seatUids.includes(u) && !dropped.has(u) && !(pl[u] && pl[u].watch) && g.joinPick[u])
      .sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0))
      .map((u) => { const av = SEAT_AV.find((x) => !used.has(x)) || "🙂"; used.add(av); return { id: u, name: (pl[u] && pl[u].name) || "친구", av }; });
    const next = Table.nextLineup(cur, fresh, g.fillN, BOT_NAMES);
    const added = next.filter((x) => x.id && !g.seatUids.includes(x.id));
    const gone = cur.filter((x) => x.drop && x.id).map((x) => x.name);
    g.seatUids = next.map((x) => x.id);
    g.baseNames = next.map((x) => x.name);
    g.avs = next.map((x) => x.av);
    g.subs = next.map((x) => !!x.sub);
    g.drops = next.map(() => false);
    g.totals = next.map((x) => x.total);
    g.names = next.map((x) => (x.bot || x.sub ? x.name + "(AI)" : x.name));
    g.levels = next.map((x) => (x.bot || x.sub ? g.tierName : x.id === g.net.uid ? "human" : "remote"));
    g.n = next.length;
    g.mySeat = Math.max(0, g.seatUids.indexOf(g.net.uid));
    for (const a of added) delete g.joinPick[a.id];
    if (added.length || gone.length) {
      const msg = [added.length ? `${added.map((x) => x.name).join(", ")} 님 합류` : "", gone.length ? `${gone.join(", ")} 님 빠짐` : ""].filter(Boolean).join(" · ");
      toast(`${msg} → ${g.n}명`, 2600);
      try { g.net.chat(`📣 ${msg} → 이번 판부터 ${g.n}명`); } catch (e) {}
    }
  }

  // 방장: 다음 판 (모두 같은 씨앗으로). 친구는 '준비'만 누르고 시작은 방장이
  function nextRound() {
    if (!G) return;
    if (G.modalClose) { try { G.modalClose(); } catch (e) {} G.modalClose = null; }
    if (G.mode !== "online" || !G.net) { startRound(); return; }
    if (G.role !== "host") return;
    rebuildSeats();
    const seed = (G.baseSeed + G.round * 0x9e3779b9) | 0;
    startRound(seed);
    G.net.broadcast(goMsg(), true);   // 새 판 + 바뀐 자리를 통째로
  }

  // ── 한 판 시작 ─────────────────────────────────────────
  function startGame(mode, seed) {
    if (G) goMenuQuiet();
    const watch = mode === "watch", local = mode === "local";
    const levels = [], names = [], avs = [];
    if (local && hsPick) {
      // 공용 자리 고르기: 자리 순서 그대로 (사람/AI 섞임)
      if (!hsPick.valid) { toast("2~4자리에 사람이 한 명 이상 있어야 해요"); return; }
      let b = 0;
      for (const s of hsPick.seats) {
        if (s.kind === "ai") { const t = TIERS[s.tier] ? s.tier : "normal"; levels.push(t); names.push(BOT_NAMES[b++ % BOT_NAMES.length] + "(AI)"); avs.push(s.emoji || TIERS[t].em); }
        else { levels.push("human"); names.push(String(s.name || "").slice(0, 8)); avs.push(s.emoji || "🙂"); }
      }
    } else if (local) {
      // 한 폰으로: 사람 lh 명 + AI lai 명 (합쳐 4명까지)
      const lh = Math.min(4, Math.max(2, +O.lh || 2)), lai = Math.max(0, Math.min(4 - lh, +O.lai || 0));
      for (let i = 0; i < lh; i++) { levels.push("human"); names.push(localName(i)); avs.push(LOCAL_AV[i]); }
      for (let i = 0; i < lai; i++) { levels.push(O.ltier); names.push(BOT_NAMES[i % BOT_NAMES.length] + "(AI)"); avs.push(TIERS[O.ltier].em); }
    } else {
      const tier = watch ? O.wtier : O.tier;
      const n = watch ? 4 : Math.min(4, Math.max(2, (+O.ai || 1) + 1));
      if (!watch) { levels.push("human"); names.push("나"); avs.push("🙋"); }
      const bots = watch ? 4 : n - 1;
      for (let i = 0; i < bots; i++) {
        levels.push(tier);
        names.push(BOT_NAMES[i % BOT_NAMES.length]);
        avs.push(TIERS[tier].em);
      }
    }
    const n = levels.length;
    G = newG({ mode, n, levels, names, avs, rule: watch ? O.wrule : O.rule, totals: new Array(n).fill(0) });
    showPlay(watch);
    $("pauseBtn").querySelector(".ic").textContent = "⏸";
    $("pauseBtn").querySelector(".ic + span").textContent = "멈춤";
    $("speedBtn").querySelector(".ic + span").textContent = "1배속";
    startRound(seed);
  }

  function startRound(seed) {
    if (!G) return;
    clearTimeout(G.aiTimer);
    if (seed == null) seed = (Date.now() ^ ((Math.random() * 2147483647) | 0)) | 0;
    const st = Cube.create({ players: G.n, rule: G.rule, seed });
    G.st = st; G.roundSeed = seed; G.log = []; G.waiting = false;
    G.mems = Array.from({ length: G.n }, (_, i) => AI.newMemory(seed + i * 131 + 7));
    G.round++;
    G.sel = null; G.winMode = false; G.hintId = null; G.hintedPile = null; G.coachKey = "";
    G.over = false; G.finished = false; G.paused = false; G.thinking = -1;
    G.flashSeat = -1; G.lastMsg = ""; G.lastWin = null; G.speed = 1;
    G.racks = {};
    G.roundBase = G.totals.slice();   // 이 판 시작 때 점수 (끝난 판을 되감아도 두 번 안 쌓이게)
    G.ready = new Set(); G.drawReady = null; clearTurnT(G);
    if (G.mode === "local") { G.mySeat = Math.max(0, G.levels.indexOf("human")); G.viewing = -1; G.cover = true; }
    G.rack = G.mode !== "watch" && !G.spec ? tidyOrder(st, st.hands[mySeat()]) : [];
    $("speedBtn").querySelector(".ic + span").textContent = "1배속";
    $("pauseBtn").querySelector(".ic").textContent = "⏸";
    $("pauseBtn").querySelector(".ic + span").textContent = "멈춤";
    render();
    if (!G.coachReady && coachAvail()) { setupCoach(); render(); }   // 받침대 자리가 정해진 뒤에 띄움
    else setupCoach();
    updateCover();
    schedule();
  }

  // 판 정리 (방은 그대로) — 새 판을 열기 전에
  function goMenuQuiet() {
    const g = G; G = null;
    if (!g) return g;
    dropG(g);
    if (g.offs) g.offs.forEach((f) => { try { f(); } catch (e) {} });
    coachClose(g);
    $("cover").hidden = true;
    $("scoreBar") && ($("scoreBar").hidden = true);
    hsClose();
    return g;
  }

  // keepNet: 방장이 모두를 대기실로 되돌렸을 때 — 방(연결)은 그대로 두고 화면만 메뉴로
  function goMenu(keepNet) {
    const g = goMenuQuiet();
    if (g && g.net && !keepNet) {
      if (window.ArenaUI && ArenaUI.net === g.net) ArenaUI.leave();   // 대기실 상태도 같이 정리
      else { try { g.net.leave(); } catch (e) {} }
    }
    document.body.classList.remove("playing");
    $("play").hidden = true;
    $("play").classList.remove("watch", "spec");
    $("wstage").hidden = true;
    drawMenu();
  }

  // ── 한 폰으로: 차례가 바뀌면 화면 가리기 ─────────────────
  function updateCover() {
    if (!G || G.mode !== "local" || !G.st) { $("cover").hidden = true; return; }
    const st = G.st;
    if (st.phase === "over") { G.cover = false; G.hsFor = ""; $("cover").hidden = true; hsClose(); return; }
    if (!G.cover && Table.needCover(G.levels, G.viewing, st)) { G.cover = true; G.viewing = -1; G.sel = null; G.winMode = false; }
    if (!G.cover) { $("cover").hidden = true; return; }
    const v = Table.viewerFor(G.levels, st);
    $("cover").hidden = false;   // 공용 가림막 아래에도 늘 깔아 둠 (AI 차례엔 이것만)
    if (v >= 0 && window.HotSeat) {
      // 공용 '차례 넘기기' 가림막 — 누르면 그 사람 화면
      const tag = G.round + ":" + G.log.length + ":" + v;
      if (G.hsFor !== tag) {
        G.hsFor = tag;
        const g = G;
        HotSeat.cover({ name: G.names[v], emoji: G.avs[v], button: "👀 내 타일 보기" }).then(() => { if (G === g && G.hsFor === tag) revealCover(); });
      }
    }
    if (v >= 0) {
      $("coverAv").textContent = G.avs[v];
      $("coverTitle").textContent = `${G.names[v]} 차례예요`;
      $("coverSub").textContent = "화면을 넘겨 주세요. 다른 사람은 보지 않기!";
      $("coverBtn").disabled = false;
      $("coverBtn").textContent = `${G.names[v]}, 내 타일 보기`;
    } else {
      $("coverAv").textContent = G.avs[st.turn];
      $("coverTitle").textContent = `${G.names[st.turn]} 두는 중…`;
      $("coverSub").textContent = "사람 차례가 오면 바로 알려 줄게요";
      $("coverBtn").disabled = true;
      $("coverBtn").textContent = "기다리는 중";
    }
  }
  function revealCover() {
    if (!G || G.mode !== "local" || !G.st) return;
    const v = Table.viewerFor(G.levels, G.st);
    if (v < 0) return;
    if (G.mySeat !== v) {
      G.racks[G.mySeat] = G.rack;
      G.mySeat = v;
      G.rack = G.racks[v] || tidyOrder(G.st, G.st.hands[v]);
      syncRack();
    }
    G.viewing = v; G.cover = false; G.hsFor = "";
    hsClose();
    sfx.play("flip");
    render();
    updateCover();
  }

  // ── AI 선생님 — 버튼 하나 (혼자·한 폰으로는 늘, 친구랑은 방장이 켰을 때만) ──
  const coachAvail = () => !!G && G.mode !== "watch" && !G.spec && (G.mode !== "online" || G.coachOn);
  // 처음 자리: 받침대 바로 위 빈 곳 (받침대·버리기 단추를 가리지 않게, 15장이면 3줄이라 3줄 기준)
  function coachBottom() {
    const rw = document.querySelector(".rackwrap"), tiles = [...$("rack").querySelectorAll(".tile")];
    const rows = new Set(tiles.map((t) => t.offsetTop)).size, th = tiles.length ? tiles[0].offsetHeight + 4 : 0;
    const top = rw ? rw.getBoundingClientRect().top - Math.max(0, 3 - rows) * th : 0;
    return top > 200 ? Math.round(window.innerHeight - top + 8) : 88;
  }
  function setupCoach() {
    const btn = $("coachBtn");
    btn.hidden = !coachAvail();
    if (!coachAvail() || G.coachReady) return;
    G.coachReady = true;
    if (window.CoachPanel && typeof CoachPanel.create === "function") {
      try {
        G.coach = CoachPanel.create({ game: "cube", title: "AI 선생님", bottom: coachBottom(), startHidden: !!(CoachPanel.isOff && CoachPanel.isOff("cube")) });
        G.coachBtn = CoachPanel.button(btn, G.coach);
        G.coachOff = G.coach.onChange ? G.coach.onChange(() => { if (G) { G.coachKey = ""; render(); } }) : null;
      } catch (e) { console.warn(e); G.coach = null; }
    }
    if (!G.coach) {
      // 공용 창이 없을 때: 오른쪽 위 작은 카드
      G.fbOn = store("cube.coachfb", 1) !== 0;
      btn.onclick = () => { if (!G) return; G.fbOn = !G.fbOn; save("cube.coachfb", G.fbOn ? 1 : 0); G.coachKey = ""; sfx.play("tap"); render(); };
    }
    G.coachKey = "";
  }
  function coachClose(g) {
    if (g) {
      if (g.coachBtn) { try { g.coachBtn.destroy(); } catch (e) {} }
      if (typeof g.coachOff === "function") { try { g.coachOff(); } catch (e) {} }
      if (g.coach) { try { g.coach.destroy(); } catch (e) {} }
      g.coach = g.coachBtn = g.coachOff = null; g.coachReady = false;
    }
    $("coachBtn").onclick = null;
    $("coachBtn").classList.remove("on");
    $("coachFb").hidden = true;
  }
  const coachOpen = () => (G.coach ? G.coach.visible && !G.coach.collapsed : !!G.fbOn && !$("coachFb").classList.contains("shut"));
  function coachSet(html) {
    if (G.coach) { G.coach.set(html); return; }
    $("coachFbBody").innerHTML = html;
  }
  // 그리기 전마다: 차례·수가 바뀌었을 때만 생각하고, 창이 열려 있을 때만 추천 타일을 반짝임
  function coachTick() {
    G.hintId = null; G.hintedPile = null;
    if (!G.coach) {
      $("coachFb").hidden = !(coachAvail() && G.fbOn);
      $("coachBtn").classList.toggle("on", !!G.fbOn);
      $("coachBtn").setAttribute("aria-pressed", String(!!G.fbOn));
    }
    if (!coachAvail() || !G.st || !coachOpen()) { G.coachKey = ""; return; }
    const st = G.st, me = mySeat();
    const hidden = G.mode === "local" && (G.cover || G.viewing !== me);   // 한 폰으로: 가림막을 걷은 사람에게만
    const key = [G.round, G.log.length, st.phase, me, hidden ? 1 : 0].join(":");
    if (key !== G.coachKey) {
      G.coachKey = key;
      G.advice = null;
      let html;
      if (st.phase === "over") html = st.winner === me && G.mode !== "local" ? "잘했어요! 🎉 다음 판도 같이 봐요" : "다음 판엔 만능을 아끼고 묶음을 먼저 모아 봐요";
      else if (hidden) html = "가림막을 걷으면 지금 차례인 사람을 도와줄게요";
      else if (st.turn !== me) html = `${esc(G.names[st.turn])} 차례예요. 내 차례가 오면 도와줄게요`;
      else {
        const a = AI.advise(st, me);
        G.advice = a;
        html = a ? `<b>${esc(a.text)}</b><br>${esc(a.why)}${a.kind === "win" || a.kind === "discard" ? "<br><small>✨ 반짝이는 타일</small>" : ""}` : "";
      }
      coachSet(html);
    }
    const a = G.advice;
    if (a && !hidden && st.turn === me) {
      if (a.kind === "draw") G.hintedPile = a.take ? "take" : "deck";
      else G.hintId = a.id;
    }
  }

  // ── 상태 다루기 ─────────────────────────────────────────
  function winIds() {
    const st = G && G.st;
    if (!st || st.turn !== mySeat() || st.phase !== "discard") return [];
    return Cube.legal(st).filter((a) => a.t === "win").map((a) => a.id);
  }

  function syncRack() {
    if (!G || G.mode === "watch" || G.spec || !G.st) return;
    const hand = G.st.hands[mySeat()];
    const set = new Set(hand);
    G.rack = G.rack.filter((id) => set.has(id));
    for (const id of hand) if (G.rack.indexOf(id) < 0) G.rack.push(id);
  }

  function schedule() {
    if (!G) return;
    clearTimeout(G.aiTimer);
    const st = G.st;
    turnTimer();   // 내 차례 30초 (친구랑)
    if (!st || G.over || st.phase === "over" || G.modalClose) return;
    if (G.paused) { G.thinking = -1; return; }
    const lv = G.levels[st.turn];
    if (lv === "human" || lv === "remote") { G.thinking = lv === "remote" ? st.turn : -1; render(); return; }
    G.thinking = st.turn;
    render();
    const base = G.mode === "watch" ? 620 : 780;
    const wait = (base + Math.random() * 260) / G.speed;
    G.aiTimer = setTimeout(aiStep, wait);
  }

  function aiStep() {
    if (!G || !G.st || G.over) return;
    const st = G.st;
    if (st.phase === "over") return;
    const lv = G.levels[st.turn];
    if (lv === "human" || lv === "remote") return;
    const p = st.turn;
    G.thinking = -1;
    const a = AI.act(st, p, lv, G.mems[p]);
    if (!a) return;
    applyAction(a, false);
  }

  function humanLabel(p) {
    return G.mode !== "watch" && p === mySeat() ? "" : G.names[p];
  }

  // action 을 두고 화면·소리·차례를 맞춤
  function applyAction(a, human, instant, remote) {
    if (!G || !G.st || G.over || G.st.phase === "over") return false;
    const st = G.st;
    let src = null;
    if (!instant) {
      if (a.t === "deck") src = rectOf($("deckBtn"));
      else if (a.t === "take") src = rectOf($("prevBtn"));
      else src = rectOf(rackTileEl(a.id));
    }
    let res;
    try {
      res = Cube.step(st, a);
    } catch (err) {
      console.error(err);
      if (!instant) toast("지금은 그렇게 둘 수 없어요");
      return false;
    }
    // 수 기록 (k = 몇 번째 수) — 방장은 모두에게, 친구는 자기 수만 방장에게
    const k = G.log.length;
    G.log.push(a);
    if (G.mode === "online" && G.net) {
      const m = { t: "act", a, k };
      if (G.role === "host") G.net.broadcast(m, true); else if (!remote && !instant) G.net.send(m, true);
    }
    G.st = res.state;
    G.sel = null; G.winMode = false; G.hintId = null; G.hintedPile = null; G.thinking = -1;
    if (G.mode !== "watch") syncRack();

    const evs = res.events || [];
    let drew = null, discarded = null;
    for (const e of evs) {
      if (e.type === "draw") {
        drew = e;
        const who = humanLabel(e.p);
        G.lastMsg = who ? `${who} 뽑았어요` : "타일을 뽑았어요";
      } else if (e.type === "discard") {
        discarded = e;
        G.flashSeat = e.p;
        const who = humanLabel(e.p);
        G.lastMsg = who ? `${who} 버렸어요` : "타일을 버렸어요";
      } else if (e.type === "win") {
        G.lastWin = e;
        G.lastMsg = `${G.names[e.p]} 베니!`;
      } else if (e.type === "nagari") {
        G.lastMsg = "더미가 비었어요";
      }
    }
    if (!instant) render();

    if (!instant) {
      const me = mySeat();
      if (drew && human) {
        const target = rackTileEl(drew.id);
        if (src && target) flyClone(drew.id, src, rectOf(target));
      }
      if (discarded && human && src) {
        const slot = rectOf($("mySlot"));
        if (slot) flyClone(discarded.id, src, slot);
      }
      if (drew) sfx.play("place");
      if (discarded) sfx.play("slap");
      if ((drew && drew.p === me) || (discarded && discarded.p === me)) vibrate(6);
      if (G.flashSeat >= 0) {
        const f = G.flashSeat;
        setTimeout(() => {
          if (G && G.flashSeat === f && !G.over) { G.flashSeat = -1; render(); }
        }, 520);
      }
    }
    if (G.mode === "local" && !instant) updateCover();
    if (G.st.phase === "over") { finishRound(); return true; }
    if (!instant) schedule();
    return true;
  }

  function doDiscard(id) {
    if (!G || !G.st || G.st.turn !== mySeat() || G.st.phase !== "discard") return;
    applyAction({ t: "discard", id }, true);
  }
  function doWin(id) {
    if (!G || !G.st || G.st.turn !== mySeat() || G.st.phase !== "discard") return;
    applyAction({ t: "win", id }, true);
  }
  function doDraw(from) {
    if (!G || !G.st || G.st.turn !== mySeat() || G.st.phase !== "draw") {
      toast("지금은 뽑을 차례가 아니에요");
      return;
    }
    applyAction({ t: from }, true);
  }

  // ── 끝났을 때 ──────────────────────────────────────────
  function finishRound() {
    if (!G || G.finished || !G.st) return;
    G.finished = true;
    G.over = true;
    clearTimeout(G.aiTimer);
    const st = G.st, me = mySeat();
    clearTurnT(G);
    G.totals = G.roundBase.slice();   // 이 판 시작 점수 + 이번 판 (되감기로 두 번 불려도 한 번만)
    if (st.winner >= 0) G.totals[st.winner] += st.points;
    render();
    if (G.mode === "watch" || G.mode === "local" || G.spec) {
      if (st.winner >= 0) { confetti({ zIndex: 10 }); sfx.play("win"); } else sfx.play("bad");
    } else if (st.winner === me) {
      confetti({ zIndex: 10 }); sfx.play("win"); vibrate([20, 40, 20]);
    } else if (st.winner >= 0) {
      sfx.play("lose");
    } else {
      sfx.play("bad");
    }
    setTimeout(() => { if (G && G.over) showResult(); }, 700);
  }

  function showResult() {
    if (!G || !G.st) return;
    const st = G.st, winner = st.winner, me = mySeat();
    const shared = G.mode === "watch" || G.mode === "local" || G.spec;   // 내 자리가 따로 없음
    const meWin = !shared && winner === me;
    let title;
    if (winner < 0) title = "🌫 나가리";
    else if (meWin) title = "🎉 베니!";
    else title = "🏆 " + G.names[winner] + (G.mode === "watch" ? "" : " 승리");
    if (G.mode === "local") $("cover").hidden = true;

    let html = "";
    if (winner < 0) {
      html += `<p class="resline">더미가 비었어요. 아무도 못 끝냈어요.</p>`;
    } else {
      const ev = G.lastWin || {};
      const wd = st.discards[winner][st.discards[winner].length - 1];
      html += `<p class="resbig">+${st.points}점</p>`;
      html += `<p class="resline">${ev.kind === "pairs" ? "일곱 쌍으로 완성!" : "묶음으로 완성!"}</p>`;
      if (ev.kind === "groups" && ev.groups) {
        html += `<div class="groups">` + ev.groups.map((g) => `<div class="grow">${g.map((id) => tileHtml(st, id)).join("")}</div>`).join("") + `</div>`;
      } else if (ev.kind === "pairs") {
        html += `<div class="groups"><div class="grow">${tidyOrder(st, st.hands[winner]).map((id) => tileHtml(st, id)).join("")}</div></div>`;
      }
      if (wd != null && Cube.isWild(st, wd)) html += `<p class="resnote">만능을 버려서 끝냈어요 — 점수 2배!</p>`;
    }

    const meSeat = mySeat();
    const order = Array.from({ length: st.n }, (_, p) => p)
      .sort((a, b) => (G.totals[b] - G.totals[a]) || (winner === a ? -1 : winner === b ? 1 : a - b));
    html += `<table class="rtable"><tbody>` + order.map((p) => {
      const me = !shared && p === meSeat;
      return `<tr class="${me ? "mine" : ""}"><td class="medal">${p === winner ? "🏆" : ""}</td>` +
        `<td>${G.avs[p]} ${esc(G.names[p])}</td>` +
        `<td class="n">${p === winner ? "+" + st.points : "+0"}</td>` +
        `<td class="n">${G.totals[p]}점</td></tr>`;
    }).join("") + `</tbody></table>`;
    if (!shared) html += `<p class="resnote">이번 판 ${st.points}점 · 모은 점수 ${G.totals[meSeat]}점</p>`;

    const online = G.mode === "online" && !!G.net, host = online && G.role === "host", g = G;
    let buttons;
    if (!online) {
      buttons = [{ label: "한 판 더", primary: true, onClick: () => { if (G) nextRound(); } }, { label: "메뉴", ghost: true, onClick: () => { goMenu(); } }];
    } else if (host) {   // 방장: 친구들이 준비하면 시작 (기다리기 싫으면 바로)
      buttons = [{ label: "다음 판 시작 ▶", primary: true, onClick: () => { if (G) nextRound(); } }, { label: "안 기다리고 시작", onClick: () => { if (G) nextRound(); } }, { label: "메뉴", ghost: true, onClick: () => { goMenu(); } }];
    } else {             // 친구·구경꾼: 준비만 누르고 시작은 방장이
      buttons = [{ label: "✋ 준비", primary: true, onClick: () => { if (G === g && !g.ready.has(g.net.uid)) { g.ready.add(g.net.uid); g.net.send({ t: "rdy", round: g.round }, true); g.drawReady && g.drawReady(); } return false; } }, { label: "메뉴", ghost: true, onClick: () => { goMenu(); } }];
    }
    if (online) html += `<div class="rdy" id="cubeRdy"></div>`;
    G.modalClose = modal({
      title: title,
      html: html,
      cls: "result",
      buttons,
      onClose: () => {
        if (g) { g.modalClose = null; g.drawReady = null; }
        if (G && G.st && !G.over) schedule();
      },
    });
    if (online) {
      const ov = [...document.querySelectorAll(".overlay.result")].pop(), bs = ov ? [...ov.querySelectorAll(".row .btn")] : [];
      g.drawReady = () => drawReady(g, bs[0], host ? bs[1] : null);
      g.drawReady();
    }
  }

  // 판 사이 준비 목록 (방장은 고르고, 친구는 보기만): 앉은 사람 ✅/⏳/🔌 · 구경꾼 (방장이 체크하면 다음 판부터 같이)
  function drawReady(g, goBtn, forceBtn) {
    const box = $("cubeRdy");
    if (G !== g || !box || !box.isConnected) return;
    const pl = netPlayers(), host = g.role === "host", me = g.net.uid;
    const canDrop = (s) => g.seatUids.filter((u, i) => i !== s && !g.drops[i]).length >= 2;
    const seated = g.seatUids.map((u, s) => ({ u, s })).filter((x) => x.u).map(({ u, s }) => {
      if (u === me && host) return `<span class="ok">👑 ${esc(g.names[s])}</span>`;
      const gone = !pl[u], ok = g.ready.has(u) || g.subs[s];
      const tools = host && gone && !g.subs[s] ? ` <button type="button" data-ai="${s}">🤖 AI</button>${canDrop(s) ? ` <button type="button" data-drop="${s}">👋 빼기</button>` : ""}` : "";
      return `<span class="${ok ? "ok" : gone ? "gone" : ""}">${ok ? "✅" : gone ? "🔌" : "⏳"} ${esc(g.names[s])}${tools}</span>`;
    });
    const ws = watchersOf();
    const wl = ws.map((u) => host
      ? `<label><input type="checkbox" data-join="${esc(u)}" ${g.joinPick[u] ? "checked" : ""}> ${esc((pl[u] && pl[u].name) || "친구")}${g.ready.has(u) ? " ✋" : ""}</label>`
      : `<span>${esc((pl[u] && pl[u].name) || "친구")}${g.ready.has(u) ? " ✋" : ""}</span>`).join("");
    box.innerHTML = `<div class="rdy-row">${seated.join("")}</div>${ws.length ? `<div class="rdy-w">👀 구경 ${ws.length}명${host ? " · 체크하면 다음 판부터 같이" : ""}: ${wl}</div>` : ""}`;
    if (host) {
      const need = g.seatUids.map((u, s) => ({ u, s })).filter((x) => x.u && x.u !== me && !g.subs[x.s]), k = need.filter((x) => g.ready.has(x.u)).length, all = k === need.length;
      if (goBtn) { goBtn.disabled = !all; goBtn.textContent = all ? "다음 판 시작 ▶" : `다음 판 시작 (준비 ${k}/${need.length})`; }
      if (forceBtn) forceBtn.hidden = all;
      box.querySelectorAll("[data-join]").forEach((c) => { c.onchange = () => { g.joinPick[c.dataset.join] = c.checked; }; });
      box.querySelectorAll("[data-ai]").forEach((b) => { b.onclick = () => subAI(+b.dataset.ai, false); });
      box.querySelectorAll("[data-drop]").forEach((b) => { b.onclick = () => subAI(+b.dataset.drop, true); });
    } else if (goBtn) {
      const on = g.ready.has(me);
      goBtn.disabled = on;
      goBtn.textContent = on ? "✅ 준비 완료 · 방장을 기다려요" : g.spec ? "✋ 다음 판에 낄래요" : "✋ 준비";
    }
  }

  // ── 그리기 ─────────────────────────────────────────────
  function render() {
    if (!G || !G.st) return;
    coachTick();
    renderBar();
    renderScore();
    if (G.mode === "watch") {
      renderWatch();
    } else if (G.spec) {
      renderSpec();
    } else {
      renderOpps();
      renderCenter();
      renderMe();
      renderRack();
      renderAct();
    }
  }

  function renderBar() {
    const st = G.st, me = mySeat();
    const lbl = $("turnLabel"), sub = $("turnSub"), pill = $("scorePill");
    if (G.mode === "watch") {
      if (st.phase === "over") lbl.textContent = st.winner >= 0 ? G.names[st.winner] + " 승리" : "나가리";
      else lbl.textContent = G.names[st.turn] + " 차례";
      sub.textContent = ruleName(st.rule) + " · " + G.round + "판";
      pill.textContent = "🎬 " + G.round + "판";
      return;
    }
    const mine = G.mode === "online" && !G.spec && st.phase !== "over" && st.turn === me && !G.modalClose;
    sub.classList.toggle("myturn", mine);   // 내 차례(친구랑): 금색으로 깜빡
    $("play").classList.toggle("myturn", mine);
    if (G.spec) {   // 구경꾼
      lbl.textContent = st.phase === "over" ? (st.winner >= 0 ? G.names[st.winner] + " 승리" : "나가리") : G.names[st.turn] + " 차례";
      sub.textContent = "👀 구경 중 · " + G.round + "판";
      pill.textContent = "👀 구경";
      return;
    }
    if (st.phase === "over") {
      lbl.textContent = st.winner === me ? "베니! 🎉" : st.winner >= 0 ? G.names[st.winner] + " 승리" : "나가리";
      sub.textContent = "";
    } else if (st.turn !== me) {
      lbl.textContent = G.names[st.turn] + " 차례";
      sub.textContent = "기다리는 중…";
    } else {
      lbl.textContent = G.mode === "local" ? G.names[me] + " 차례" : "내 차례";
      sub.textContent = (st.phase === "draw" ? "한 장 뽑아요" : winIds().length ? "끝낼 수 있어요!" : "한 장 버려요") + (mine && G.turnLeft != null ? ` · ⏱${G.turnLeft}` : "");
    }
    pill.textContent = "⭐ " + G.totals[me];
  }

  function oppHtml(st, p) {
    const pile = st.discards[p], top = pile[pile.length - 1];
    const turn = st.turn === p && st.phase !== "over";
    return `<div class="op${turn ? " turn" : ""}${G.thinking === p ? " thinking" : ""}${G.flashSeat === p ? " flash" : ""}${G.subs[p] ? " sub" : ""}">` +
      `<span class="av">${G.avs[p]}</span><span class="nm">${esc(G.names[p])}</span>` +
      `<span class="cnt">${st.hands[p].length}장</span>` +
      (top != null ? `<span class="mt">${tileHtml(st, top)}</span>` : "") +
      `</div>`;
  }
  function renderOpps() {
    const st = G.st, box = $("opps"), me = mySeat();
    let html = "";
    for (let k = 1; k < st.n; k++) html += oppHtml(st, (me + k) % st.n);
    box.innerHTML = html;
  }
  // 구경꾼: 모두의 이름·장수·마지막 버린 타일 + 더미 · 표시 타일 (남의 타일은 안 보여요)
  function renderSpec() {
    const st = G.st;
    let html = "";
    for (let p = 0; p < st.n; p++) html += oppHtml(st, p);
    $("opps").innerHTML = html;
    $("deckCount").textContent = st.deck.length;
    $("deckBtn").classList.remove("can", "hinted");
    const ind = $("indicator");
    ind.hidden = false;
    ind.innerHTML = indHtml(st);
    $("rack").innerHTML = "";
  }

  function indHtml(st) {
    if (st.rule === "classic" && st.wildFace != null) {
      return `<span>표시</span><div class="row2">${tileHtml(st, st.indicator)}<span class="arrow">→</span>${tileHtml(st, st.wildFace)}</div>`;
    }
    return `<span>만능</span><div class="row2">${tileHtml(st, 104)}</div>`;
  }

  function renderCenter() {
    const st = G.st, me = mySeat();
    $("deckCount").textContent = st.deck.length;
    const canDraw = st.turn === me && st.phase === "draw";
    const prevPile = st.discards[(me - 1 + st.n) % st.n];
    const pTop = prevPile[prevPile.length - 1];
    const mPile = st.discards[me];
    const mTop = mPile[mPile.length - 1];
    $("prevSlot").innerHTML = pTop != null ? tileHtml(st, pTop) : `<span class="empty">·</span>`;
    $("mySlot").innerHTML = mTop != null ? tileHtml(st, mTop) : `<span class="empty">·</span>`;
    $("deckBtn").classList.toggle("can", canDraw && st.deck.length > 0);
    $("prevBtn").classList.toggle("can", canDraw && prevPile.length > 0);
    $("deckBtn").classList.toggle("hinted", G.hintedPile === "deck");
    $("prevBtn").classList.toggle("hinted", G.hintedPile === "take");
    const myTurnDiscard = st.turn === me && st.phase === "discard";
    $("dropTray").classList.toggle("can", myTurnDiscard && G.sel != null);
    const ind = $("indicator");
    ind.hidden = false;
    ind.innerHTML = indHtml(st);
  }

  function renderMe() {
    const st = G.st, me = mySeat();
    const hand = st.hands[me];
    const a = Cube.arrange(st, hand);
    let used = 0;
    for (const g of a.groups) used += g.length;
    $("meCount").textContent = "내 타일 " + hand.length + "장";
    $("meGroups").textContent = a.groups.length ? "묶음 " + a.groups.length + "개 · " + used + "장" : "아직 묶음이 없어요";
  }

  function renderRack(flip) {
    const st = G.st;
    const rack = $("rack");
    if (!st) { rack.innerHTML = ""; return; }
    let old = null;
    if (flip) {
      old = new Map();
      for (const el of rack.children) old.set(el.dataset.id, el.getBoundingClientRect());
    }
    const arr = Cube.arrange(st, G.rack);
    const gmap = new Map();
    arr.groups.forEach((g, gi) => g.forEach((id) => gmap.set(id, gi)));
    const wins = G.winMode ? winIds() : [];
    let html = "";
    for (let i = 0; i < G.rack.length; i++) {
      const id = G.rack[i];
      const gi = gmap.has(id) ? gmap.get(id) : -1;
      const cls = [];
      if (gi >= 0) {
        cls.push("grp");
        if (i > 0 && gmap.get(G.rack[i - 1]) === gi) cls.push("join-l");
        if (i < G.rack.length - 1 && gmap.get(G.rack[i + 1]) === gi) cls.push("join-r");
      }
      if (id === G.sel) cls.push("sel");
      if (wins.indexOf(id) >= 0) cls.push("win");
      if (id === G.hintId) cls.push("hinted");
      if (G.drag && G.drag.active && G.drag.id === id) cls.push("dragsrc");
      const [gc, gt] = gi >= 0 ? GROUPS[gi % GROUPS.length] : ["", ""];
      html += tileHtml(st, id, cls.join(" "), gi >= 0 ? `--gc:${gc};--gt:${gt}` : "");
    }
    rack.innerHTML = html;
    fixJoins(rack);
    if (old) {
      for (const el of rack.children) {
        const r0 = old.get(el.dataset.id);
        if (!r0) continue;
        const r1 = el.getBoundingClientRect();
        const dx = r0.left - r1.left, dy = r0.top - r1.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px,${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform .22s cubic-bezier(.2,.8,.25,1)";
          el.style.transform = "";
          setTimeout(() => { el.style.transition = ""; }, 260);
        });
      }
    }
  }

  function renderWatch() {
    const st = G.st, box = $("wstage");
    let html = "";
    for (let p = 0; p < st.n; p++) {
      const hand = st.hands[p];
      const view = tidyOrder(st, hand);
      const arr = Cube.arrange(st, hand);
      const gmap = new Map();
      arr.groups.forEach((g, gi) => g.forEach((id) => gmap.set(id, gi)));
      const pile = st.discards[p], top = pile[pile.length - 1];
      const turn = st.turn === p && st.phase !== "over";
      const tiles = view.map((id, i) => {
        const gi = gmap.has(id) ? gmap.get(id) : -1;
        const cls = [];
        if (gi >= 0) {
          cls.push("grp");
          if (i > 0 && gmap.get(view[i - 1]) === gi) cls.push("join-l");
          if (i < view.length - 1 && gmap.get(view[i + 1]) === gi) cls.push("join-r");
        }
        const [gc, gt] = gi >= 0 ? GROUPS[gi % GROUPS.length] : ["", ""];
        return tileHtml(st, id, cls.join(" "), gi >= 0 ? `--gc:${gc};--gt:${gt}` : "");
      }).join("");
      const state = st.phase === "over"
        ? (st.winner === p ? "🏆 끝냈어요" : "")
        : turn ? (st.phase === "draw" ? "뽑는 차례" : "버리는 차례") : "";
      html += `<div class="wrow${turn ? " turn" : ""}${st.winner === p ? " done" : ""}${G.flashSeat === p ? " flash" : ""}">` +
        `<div class="wh"><span class="av">${G.avs[p]}</span><b>${esc(G.names[p])}</b>` +
        `<span class="st">${state}</span>` +
        (top != null ? `<span class="top">${tileHtml(st, top)}</span>` : "") +
        `<span class="pts">${G.totals[p]}점</span></div>` +
        `<div class="whand">${tiles}</div></div>`;
    }
    html += `<div class="wcenter"><span class="pill">🂠 ${st.deck.length}</span>` +
      `<div class="ind">${indHtml(st)}</div>` +
      `<span class="wmsg">${esc(G.lastMsg || "구경하는 중…")}</span></div>`;
    box.innerHTML = html;
    box.querySelectorAll(".whand").forEach((w) => fixJoins(w));
  }

  function renderAct() {
    const st = G.st, me = mySeat();
    const bar = $("actbar"), msg = $("actMsg");
    bar.querySelectorAll(".btn").forEach((b) => b.remove());
    let text = "";
    const buttons = [];
    if (st.phase === "over") {
      text = "";
    } else if (st.turn !== me) {
      text = `<b>${esc(G.names[st.turn])}</b>님이 두는 중…`;
    } else if (st.phase === "draw") {
      text = "한 장 뽑아요";
    } else {
      const wins = winIds();
      if (G.winMode) {
        text = "끝낼 타일을 골라 주세요";
        buttons.push(["취소", "ghost", () => { G.winMode = false; render(); }]);
      } else if (G.sel != null) {
        if (wins.indexOf(G.sel) >= 0) {
          text = "이 타일을 버리면 완성!";
          buttons.push(["베니!", "beni", () => doWin(G.sel)]);
        } else {
          text = "이 타일을 버릴까요?";
          buttons.push(["버리기", "primary", () => doDiscard(G.sel)]);
        }
      } else if (wins.length) {
        text = "끝낼 수 있어요!";
        buttons.push(["베니!", "beni", () => { G.winMode = true; render(); sfx.play("go"); }]);
      } else {
        text = "버릴 타일을 골라 주세요";
      }
    }
    msg.innerHTML = text;
    for (const [label, cls, fn] of buttons) {
      const b = document.createElement("button");
      b.className = "btn " + cls;
      b.textContent = label;
      b.onclick = fn;
      bar.appendChild(b);
    }
  }

  // ── 애니메이션 ─────────────────────────────────────────
  function flyClone(id, from, to) {
    if (!G || !G.st) return;
    const el = tileNode(G.st, id, "fly");
    if (!el || !from || !to) return;
    el.style.left = from.left + "px";
    el.style.top = from.top + "px";
    el.style.width = from.width + "px";
    el.style.height = from.height + "px";
    el.style.setProperty("--tw", from.width + "px");
    document.body.appendChild(el);
    const dx = to.left - from.left, dy = to.top - from.top;
    const s = from.width ? to.width / from.width : 1;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      el.style.opacity = "0";
    });
    setTimeout(() => el.remove(), 440);
  }

  // ── 손패 누르기 · 끌어 옮기기 ───────────────────────────
  function tapTile(id) {
    if (!G || !G.st || G.st.phase === "over") return;
    if (G.st.turn !== mySeat()) { toast("지금은 내 차례가 아니에요"); return; }
    if (G.winMode) {
      if (winIds().indexOf(id) >= 0) doWin(id);
      else badTile(id);
      return;
    }
    if (G.st.phase !== "discard") { toast("먼저 타일을 뽑아요"); return; }
    G.sel = G.sel === id ? null : id;
    sfx.play("tap");
    render();
  }

  function badTile(id) {
    const el = rackTileEl(id);
    if (el) {
      el.classList.add("bad");
      setTimeout(() => el.classList.remove("bad"), 400);
    }
    sfx.play("bad");
    toast("이 타일을 버리면 완성이 안 돼요");
  }

  function startGhost(d) {
    const el = rackTileEl(d.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const g = el.cloneNode(true);
    g.classList.remove("dragsrc", "sel", "win");
    g.classList.add("dragghost");
    g.style.width = r.width + "px";
    g.style.height = r.height + "px";
    g.style.left = r.left + "px";
    g.style.top = r.top + "px";
    g.style.setProperty("--tw", r.width + "px");
    document.body.appendChild(g);
    d.ghost = g;
    d.offX = d.x0 - r.left;
    d.offY = d.y0 - r.top;
    vibrate(8);
    sfx.play("flip");
  }

  function moveGhost(d) {
    if (!d.ghost) return;
    d.ghost.style.left = d.x - d.offX + "px";
    d.ghost.style.top = d.y - d.offY + "px";
  }

  function nearestRackTile(x, y, skipId) {
    const els = $("rack").querySelectorAll(".tile");
    let best = null, bd = Infinity;
    for (const el of els) {
      if (+el.dataset.id === skipId) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bd) { bd = d; best = el; }
    }
    return best;
  }

  function dragIndexAt(x, y, id) {
    const el = nearestRackTile(x, y, id);
    if (!el) return G.rack.indexOf(id);
    const idx = G.rack.indexOf(+el.dataset.id);
    const r = el.getBoundingClientRect();
    const after = x > r.left + r.width / 2;
    return after ? idx + 1 : idx;
  }

  function moveDrag(id, to) {
    const from = G.rack.indexOf(id);
    if (from < 0) return;
    let k = to;
    if (from < k) k--;
    k = Math.max(0, Math.min(G.rack.length - 1, k));
    if (k === from) return;
    G.rack.splice(from, 1);
    G.rack.splice(k, 0, id);
    renderRack();
  }

  function onRackDown(e) {
    if (!G || !G.st || G.st.phase === "over" || G.drag) return;
    if (e.button != null && e.button > 0) return;
    const el = e.target.closest(".tile");
    if (!el || el.dataset.id == null) return;
    G.drag = { id: +el.dataset.id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false, ghost: null };
    e.preventDefault();
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
    window.addEventListener("pointercancel", onDragUp);
  }

  function onDragMove(e) {
    const d = G && G.drag;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.active) {
      if (Math.abs(e.clientX - d.x0) + Math.abs(e.clientY - d.y0) < 8) return;
      d.active = true;
      startGhost(d);
    }
    moveGhost(d);
    const tray = rectOf($("dropTray"));
    const canDrop = G.st.turn === mySeat() && G.st.phase === "discard" && inRect(tray, e.clientX, e.clientY);
    $("dropTray").classList.toggle("hot", canDrop);
    if (canDrop) { renderRack(); return; }
    moveDrag(d.id, dragIndexAt(e.clientX, e.clientY, d.id));
  }

  function onDragUp(e) {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
    window.removeEventListener("pointercancel", onDragUp);
    const d = G && G.drag;
    $("dropTray").classList.remove("hot");
    if (d && d.ghost) d.ghost.remove();
    if (!d) return;
    const active = d.active;
    G.drag = null;
    if (active) {
      const tray = rectOf($("dropTray"));
      if (G.st && G.st.turn === mySeat() && G.st.phase === "discard" && inRect(tray, e.clientX, e.clientY)) {
        doDiscard(d.id);
        return;
      }
      renderRack();
    } else {
      tapTile(d.id);
    }
  }

  function sortByNumber() {
    if (!G || !G.st) return;
    const k = (id) => {
      const f = AI.faceOf(G.st, id);
      if (f < 0) return 1000;
      return (f % 13) * 10 + Math.floor(f / 13);
    };
    G.rack = G.rack.slice().sort((a, b) => k(a) - k(b));
    G.sel = null;
    renderRack(true);
    sfx.play("flip");
  }

  function arrangeRack() {
    if (!G || !G.st) return;
    G.rack = tidyOrder(G.st, G.rack);
    G.sel = null;
    G.hintId = null;
    renderRack(true);
    sfx.play("flip");
  }

  // ── 시험용 빠른 진행 ───────────────────────────────────
  function fastFwd(max) {
    if (!G || !G.st) return 0;
    max = max || 800;
    const wasPaused = G.paused;
    G.paused = true;
    clearTimeout(G.aiTimer);
    let n = 0;
    while (G && G.st && G.st.phase !== "over" && n < max) {
      const p = G.st.turn;
      if (G.levels[p] === "human" || G.levels[p] === "remote") break;   // 사람 차례에서 멈춤
      const a = AI.act(G.st, p, G.levels[p], G.mems[p]);
      if (!a) break;
      if (!applyAction(a, false, true)) break;
      n++;
    }
    if (G) {
      G.paused = wasPaused;
      if (G.st) render();
      updateCover();
      if (!G.paused && G.st && G.st.phase !== "over" && !G.over) schedule();
    }
    return n;
  }

  // ── 시작 ───────────────────────────────────────────────
  function init() {
    backGuard($("back"), () => goMenu());
    $("deckBtn").onclick = () => doDraw("deck");
    $("prevBtn").onclick = () => doDraw("take");
    $("dropTray").onclick = () => {
      if (G && G.st && G.st.turn === mySeat() && G.st.phase === "discard" && G.sel != null) doDiscard(G.sel);
      else toast("버릴 타일을 먼저 골라요");
    };
    $("rack").addEventListener("pointerdown", onRackDown);
    $("arrangeBtn").onclick = arrangeRack;
    $("sortBtn").onclick = sortByNumber;
    $("coverBtn").onclick = revealCover;
    $("coverMenu").onclick = () => goMenu();
    $("coachFbHead").onclick = () => {   // 작은 선생님 카드 접기·펴기
      const fb = $("coachFb"), shut = fb.classList.toggle("shut");
      $("coachFbHead").querySelector("span").textContent = shut ? "펴기" : "접기";
    };
    sfx.button($("sndBtn"));
    sfx.button($("sndBtn2"));
    $("pauseBtn").onclick = () => {
      if (!G || G.mode !== "watch") return;
      G.paused = !G.paused;
      $("pauseBtn").querySelector(".ic").textContent = G.paused ? "▶" : "⏸";
      $("pauseBtn").querySelector(".ic + span").textContent = G.paused ? "계속" : "멈춤";
      if (!G.paused) schedule();
    };
    $("speedBtn").onclick = () => {
      if (!G) return;
      G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : 1;
      $("speedBtn").querySelector(".ic + span").textContent = G.speed + "배속";
      if (!G.paused) schedule();
    };
    $("menuBtn").onclick = () => goMenu();

    let rzT = 0;
    window.addEventListener("resize", () => {
      clearTimeout(rzT);
      rzT = setTimeout(() => { if (G && G.st) render(); }, 150);
    });
    document.addEventListener("visibilitychange", () => {
      if (!G) return;
      if (document.hidden) clearTimeout(G.aiTimer);
      else if (!G.over && !G.paused) schedule();
    });

    drawMenu();
    if (window.ArenaUI) ArenaUI.checkUrl(() => openFriendModal());
  }

  window.__cube = {
    get G() { return G; },
    get state() { return G && G.st; },
    Cube: Cube, AI: AI,
    startGame: startGame, goMenu: goMenu,
    winIds: winIds, tidyOrder: tidyOrder, fastFwd: fastFwd,
    revealCover: revealCover, openFriend: openFriendModal, Table: Table,
    autoTurn: function () { return autoTurn(G); },          // 시험용: 내 차례를 AI 가 대신
    turnSec: function (n) { TURN_SEC = n; },                // 시험용: 차례 시간을 줄여서 보기
  };

  init();
})();

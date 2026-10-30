/* 베니큐브 화면 — 메뉴 · 게임 한 판 · AI 구경 (common/cozy.js + core.js + ai.js 위에서) */
(() => {
  "use strict";
  const { esc, store, save, toast, modal, confetti, sfx, backGuard, howto, tierCards, TIERS, vibrate } = window.Cozy;
  const $ = (id) => document.getElementById(id);
  const Cube = window.Cube, AI = window.CubeAI;

  // ── 고르기 값 (저장해 둠) ───────────────────────────────
  const saved = store("cube.opt", {});
  const O = Object.assign({ ai: 1, tier: "normal", rule: "easy", wtier: "hard", wrule: "classic" }, saved && typeof saved === "object" ? saved : {});
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

  let G = null, tab = "solo";
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
    $("tabWatch").setAttribute("aria-pressed", String(t !== "solo"));
    $("soloBox").hidden = t !== "solo";
    $("watchBox").hidden = t !== "watch";
  }

  function drawMenu() {
    setTab(tab);
    seg($("aiCount"), [["1", "1명"], ["2", "2명"], ["3", "3명"]], O.ai, (v) => { O.ai = +v; saveOpt(); drawMenu(); });
    tierCards($("tiers"), TIER_ITEMS, (id) => { O.tier = id; saveOpt(); drawMenu(); }, { selected: O.tier });
    seg($("rules"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], O.rule, (v) => { O.rule = v; saveOpt(); drawMenu(); });
    $("ruleDesc").textContent = RULE_DESC[O.rule] || "";

    tierCards($("wTiers"), TIER_ITEMS, (id) => { O.wtier = id; saveOpt(); drawMenu(); }, { selected: O.wtier });
    seg($("wRules"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], O.wrule, (v) => { O.wrule = v; saveOpt(); drawMenu(); });
    $("wRuleDesc").textContent = RULE_DESC[O.wrule] || "";

    $("tabSolo").onclick = () => { setTab("solo"); sfx.play("tap"); };
    $("tabWatch").onclick = () => { setTab("watch"); sfx.play("tap"); };
    if ($("tabFriend")) $("tabFriend").onclick = () => { sfx.play("tap"); openFriendModal(); };
    $("startBtn").onclick = () => startGame("solo");
    $("watchBtn").onclick = () => startGame("watch");
    $("rulesBtn").onclick = () => howto("cube", "베니큐브 하는 법", HOWTO, { force: true });
  }

  const mySeat = () => (G && G.mySeat != null ? G.mySeat : 0);

  function openFriendModal() {
    if (!window.ArenaUI) return toast("온라인 모듈을 불러오지 못했어요");
    ArenaUI.open({
      game: "cube", title: "베니큐브", max: 4, min: 2,
      buildConfig: (hostEl) => {
        const state = { rule: O.rule || "easy", bots: 0 };
        hostEl.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
          <div class="field"><span class="small">규칙</span><div class="seg" id="fRuleSeg"></div></div>
          <div class="field"><span class="small">AI 채우기</span><div class="seg" id="fBotSeg"></div></div>
        </div>`;
        const drawF = () => {
          seg(hostEl.querySelector("#fRuleSeg"), [["easy", "★ 쉬움 (조커)"], ["classic", "🀄 전통"]], state.rule, v => { state.rule = v; drawF(); });
          seg(hostEl.querySelector("#fBotSeg"), [[0, "사람만"], [1, "+AI 1명"], [2, "+AI 2명"]], state.bots, v => { state.bots = +v; drawF(); });
        };
        drawF();
        return () => ({ rule: state.rule, bots: state.bots, seed: (Date.now() ^ ((Math.random() * 2147483647) | 0)) | 0 });
      },
      renderConfig: (c) => `${(c && c.rule) === "classic" ? "🀄 전통" : "★ 쉬움 (조커)"} 규칙${c && c.bots ? ` · AI +${c.bots}` : ""}`,
      onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
    });
  }

  function startOnline({ net, role, cfg: c, players }) {
    const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p)).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
    const nHumans = Math.max(1, plist.length);
    const n = Math.min(4, Math.max(2, nHumans + ((c && c.bots) || 0)));
    const myIdx = Math.max(0, plist.findIndex(p => p.uid === net.uid));
    const levels = [], names = [], avs = [];
    const AV = ["🙋", "🦊", "🐼", "🐰"];
    for (let i = 0; i < n; i++) {
      const pl = plist[i];
      if (pl) {
        levels.push(i === myIdx ? "human" : "remote");
        names.push(i === myIdx ? (pl.name || "나") : (pl.name || `친구${i + 1}`));
        avs.push(AV[i % AV.length]);
      } else {
        levels.push(role === "host" ? "normal" : "remote");
        names.push(BOT_NAMES[i % BOT_NAMES.length] + "(AI)");
        avs.push("🀄");
      }
    }
    const baseSeed = (c && c.seed) || 12345;
    G = {
      mode: "online", mySeat: myIdx, net, role, baseSeed,
      n, levels, names, avs,
      rule: (c && c.rule) || "easy",
      totals: new Array(n).fill(0),
      round: 0, st: null,
      mems: [], rack: [],
      sel: null, winMode: false, hintId: null, hintedPile: null,
      over: false, finished: false, paused: false, speed: 1,
      thinking: -1, flashSeat: -1, lastMsg: "", lastWin: null,
      modalClose: null, drag: null, aiTimer: 0,
    };
    const onMsg = (m) => {
      if (!m || !G || G.mode !== "online") return;
      if (m.t === "act") {
        if (role === "host") net.broadcast(m);
        applyAction(m.a, false, false, true);
      } else if (m.t === "next") {
        if (role === "host") net.broadcast(m);
        if (G.modalClose) { try { G.modalClose(); } catch (e) {} G.modalClose = null; }
        startRound((baseSeed + m.round * 0x9e3779b9) | 0);
      }
    };
    if (role === "host") net.on("msg", (_uid, m) => onMsg(m));
    else net.on("msg", m => onMsg(m));

    document.body.classList.add("playing");
    const play = $("play");
    play.hidden = false;
    play.classList.remove("watch");
    $("wstage").hidden = true;
    $("actbar").hidden = false;
    $("dock").hidden = false;
    $("wdock").hidden = true;
    window.scrollTo(0, 0);
    startRound(baseSeed);
  }

  // ── 한 판 시작 ─────────────────────────────────────────
  function startGame(mode, seed) {
    const watch = mode === "watch";
    const tier = watch ? O.wtier : O.tier;
    const n = watch ? 4 : Math.min(4, Math.max(2, (+O.ai || 1) + 1));
    const levels = [], names = [], avs = [];
    if (!watch) { levels.push("human"); names.push("나"); avs.push("🙋"); }
    const bots = watch ? 4 : n - 1;
    for (let i = 0; i < bots; i++) {
      levels.push(tier);
      names.push(BOT_NAMES[i % BOT_NAMES.length]);
      avs.push(TIERS[tier].em);
    }

    G = {
      mode, mySeat: 0, n, levels, names, avs,
      rule: watch ? O.wrule : O.rule,
      totals: new Array(n).fill(0),
      round: 0, st: null,
      mems: [], rack: [],
      sel: null, winMode: false, hintId: null, hintedPile: null,
      over: false, finished: false, paused: false, speed: 1,
      thinking: -1, flashSeat: -1, lastMsg: "", lastWin: null,
      modalClose: null, drag: null, aiTimer: 0,
    };

    document.body.classList.add("playing");
    const play = $("play");
    play.hidden = false;
    play.classList.toggle("watch", watch);
    $("wstage").hidden = !watch;
    $("actbar").hidden = watch;
    $("dock").hidden = watch;
    $("wdock").hidden = !watch;
    $("pauseBtn").querySelector(".ic").textContent = "⏸";
    $("pauseBtn").querySelector(".ic + span").textContent = "멈춤";
    $("speedBtn").querySelector(".ic + span").textContent = "1배속";
    window.scrollTo(0, 0);
    startRound(seed);
  }

  function startRound(seed) {
    if (!G) return;
    clearTimeout(G.aiTimer);
    if (seed == null) seed = G.mode === "online" ? ((G.baseSeed + (G.round + 1) * 0x9e3779b9) | 0) : ((Date.now() ^ ((Math.random() * 2147483647) | 0)) | 0);
    const st = Cube.create({ players: G.n, rule: G.rule, seed });
    G.st = st;
    G.mems = Array.from({ length: G.n }, (_, i) => AI.newMemory(seed + i * 131 + 7));
    G.round++;
    G.sel = null; G.winMode = false; G.hintId = null; G.hintedPile = null;
    G.over = false; G.finished = false; G.paused = false; G.thinking = -1;
    G.flashSeat = -1; G.lastMsg = ""; G.lastWin = null; G.speed = 1;
    G.rack = G.mode !== "watch" ? tidyOrder(st, st.hands[mySeat()]) : [];
    $("speedBtn").querySelector(".ic + span").textContent = "1배속";
    $("pauseBtn").querySelector(".ic").textContent = "⏸";
    $("pauseBtn").querySelector(".ic + span").textContent = "멈춤";
    render();
    schedule();
  }

  function goMenu() {
    if (G && G.net) { try { G.net.leave(); } catch (e) {} }
    if (G) clearTimeout(G.aiTimer);
    if (G && G.modalClose) { try { G.modalClose(); } catch (e) {} G.modalClose = null; }
    G = null;
    document.body.classList.remove("playing");
    $("play").hidden = true;
    $("play").classList.remove("watch");
    $("wstage").hidden = true;
    drawMenu();
  }

  // ── 상태 다루기 ─────────────────────────────────────────
  function winIds() {
    const st = G && G.st;
    if (!st || st.turn !== mySeat() || st.phase !== "discard") return [];
    return Cube.legal(st).filter((a) => a.t === "win").map((a) => a.id);
  }

  function syncRack() {
    if (!G || G.mode === "watch" || !G.st) return;
    const hand = G.st.hands[mySeat()];
    const set = new Set(hand);
    G.rack = G.rack.filter((id) => set.has(id));
    for (const id of hand) if (G.rack.indexOf(id) < 0) G.rack.push(id);
  }

  function schedule() {
    if (!G) return;
    clearTimeout(G.aiTimer);
    const st = G.st;
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
    if (G.mode === "online" && G.net && !remote) {
      const m = { t: "act", a };
      if (G.role === "host") G.net.broadcast(m); else G.net.send(m);
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

  function doHint() {
    const me = mySeat();
    if (!G || !G.st || G.st.turn !== me || G.st.phase === "over") return;
    const st = G.st;
    const h = AI.hint(st, me);
    if (h.kind === "draw") {
      G.hintedPile = h.take ? "take" : "deck";
      toast(h.take ? "앞사람이 버린 타일이 좋겠어요" : "더미에서 뽑아 보세요");
    } else {
      G.hintId = h.id;
      G.hintedPile = null;
      toast("이 타일은 어때요?");
    }
    render();
    sfx.play("pop", { pitch: 1.3 });
    setTimeout(() => {
      if (!G) return;
      if (G.hintId === h.id && G.hintedPile === (h.take ? "take" : h.kind === "draw" ? "deck" : null)) {
        G.hintId = null; G.hintedPile = null; render();
      }
    }, 3600);
  }

  // ── 끝났을 때 ──────────────────────────────────────────
  function finishRound() {
    if (!G || G.finished || !G.st) return;
    G.finished = true;
    G.over = true;
    clearTimeout(G.aiTimer);
    const st = G.st, me = mySeat();
    if (st.winner >= 0) G.totals[st.winner] += st.points;
    render();
    if (G.mode === "watch") {
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
    const meWin = G.mode !== "watch" && winner === me;
    let title;
    if (winner < 0) title = "🌫 나가리";
    else if (meWin) title = "🎉 베니!";
    else title = "🏆 " + G.names[winner] + (G.mode === "watch" ? "" : " 승리");

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
      const me = G.mode !== "watch" && p === meSeat;
      return `<tr class="${me ? "mine" : ""}"><td class="medal">${p === winner ? "🏆" : ""}</td>` +
        `<td>${G.avs[p]} ${esc(G.names[p])}</td>` +
        `<td class="n">${p === winner ? "+" + st.points : "+0"}</td>` +
        `<td class="n">${G.totals[p]}점</td></tr>`;
    }).join("") + `</tbody></table>`;
    if (G.mode !== "watch") html += `<p class="resnote">이번 판 ${st.points}점 · 모은 점수 ${G.totals[meSeat]}점</p>`;

    G.modalClose = modal({
      title: title,
      html: html,
      cls: "result",
      buttons: [
        {
          label: "한 판 더",
          primary: true,
          onClick: () => {
            if (G && G.mode === "online" && G.net) {
              const msg = { t: "next", round: G.round };
              if (G.role === "host") {
                G.net.broadcast(msg);
                startRound((G.baseSeed + G.round * 0x9e3779b9) | 0);
              } else {
                G.net.send(msg);
              }
            } else {
              startRound();
            }
          },
        },
        { label: "메뉴", ghost: true, onClick: () => { goMenu(); } },
      ],
      onClose: () => {
        if (G) G.modalClose = null;
        if (G && G.st && !G.over) schedule();
      },
    });
  }

  // ── 그리기 ─────────────────────────────────────────────
  function render() {
    if (!G || !G.st) return;
    renderBar();
    if (G.mode === "watch") {
      renderWatch();
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
    if (st.phase === "over") {
      lbl.textContent = st.winner === me ? "베니! 🎉" : st.winner >= 0 ? G.names[st.winner] + " 승리" : "나가리";
      sub.textContent = "";
    } else if (st.turn !== me) {
      lbl.textContent = G.names[st.turn] + " 차례";
      sub.textContent = "기다리는 중…";
    } else {
      lbl.textContent = "내 차례";
      sub.textContent = st.phase === "draw" ? "한 장 뽑아요" : winIds().length ? "끝낼 수 있어요!" : "한 장 버려요";
    }
    pill.textContent = "⭐ " + G.totals[me];
  }

  function renderOpps() {
    const st = G.st, box = $("opps"), me = mySeat();
    let html = "";
    for (let k = 1; k < st.n; k++) {
      const p = (me + k) % st.n;
      const pile = st.discards[p], top = pile[pile.length - 1];
      const turn = st.turn === p && st.phase !== "over";
      html += `<div class="op${turn ? " turn" : ""}${G.thinking === p ? " thinking" : ""}${G.flashSeat === p ? " flash" : ""}">` +
        `<span class="av">${G.avs[p]}</span><span class="nm">${esc(G.names[p])}</span>` +
        `<span class="cnt">${st.hands[p].length}장</span>` +
        (top != null ? `<span class="mt">${tileHtml(st, top)}</span>` : "") +
        `</div>`;
    }
    box.innerHTML = html;
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
      if (G.mode === "solo" && G.st.turn === 0) break;
      const p = G.st.turn;
      const a = AI.act(G.st, p, G.levels[p], G.mems[p]);
      if (!a) break;
      if (!applyAction(a, false, true)) break;
      n++;
    }
    if (G) {
      G.paused = wasPaused;
      if (G.st) render();
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
    $("hintBtn").onclick = doHint;
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
  };

  init();
})();

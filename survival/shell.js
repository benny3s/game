/* 베니 서바이벌 — 공용 껍데기 (방송 칸 · 시즌 칸 · 종목 고르기 · 혼자 · 한 기기 · 친구랑 · AI 구경 · AI 선생님 · 결과 · 1분 규칙)
   첫 화면 = list/*.js (devil · devil-s3 · genius · blood) 값으로 그린 카드 → 고르면 games/<id>/core.js · ui.js 를 그때 불러옴 (README.md 에 목록 형식)
   종목마다 둘만 만들면 됨:
   ① games/<id>/core.js  (결정적 규칙, Node · 브라우저 공용 → window.SVCores[id])
      init({ n, seed, cfg }) → st            needs(st) → [자리…] 지금 입력할 자리 (동시 선택이면 여럿)
      apply(st, seat, a) → { ok, err }        view(st, seat) → 그 자리 눈에 보이는 것만 (-1 = 구경꾼, 'all' = 다 보기)
         view 에는 늘 { pub(공개 지문 — 모두 같아야 함), needs, over, ranks(끝나면), log(공개 기록 [{i, …}]) }
      over(st) · ranks(st) → 자리별 등수 (0 = 1등, 같으면 같은 등수)
      ai(view, seat, tier, rnd) → a (보이는 것만으로)   legal(st, seat) → [a…] (선택, AI 수가 막히면 대신)
      auto(st) → ms | null  사람 입력 없이 넘어가는 단계(결과 보여 주기 등)면 기다릴 시간 · advance(st) 로 넘김
   ② games/<id>/ui.js    (화면 → window.SVUI[id])
      name · emoji · short · min · max · board(한 기기 됨) · defN · opts [{ k, label, items: [[값, 글]], def }] · howto ['…']
      sub(V, me) · chip(V, i, me) → { t, on, out } · render(stage, V, ctx) · coach(V, me, since) → { opp, mine, rec, why }
      result(V, me) → html (선택) · tutorial() → 1분 규칙 단계들 · qa(V, me, rnd) → a (선택, 자동 시험이 내 차례에 둘 수)
   친구랑: 방장이 판(st)을 쥐고, 들어온 사람마다 그 사람 눈에 보이는 것(view)만 보냄 → 숨긴 패가 새지 않음
   시험 손잡이: window.__survival (fast · pause · pick · autoAct · probe · fp · round) */
(() => {
  "use strict";
  const C = window.Cozy, esc = C.esc;
  const $ = id => document.getElementById(id);
  const CORES = (window.SVCores = window.SVCores || {}), UIS = (window.SVUI = window.SVUI || {});   // 게임 파일이 나중에 여기에 등록함 (미리 만들어 둬야 같은 객체를 봄)
  const SITE = "survival";

  // ── 목록 (list/*.js) · 게임 불러오기 ────────────────────────────
  // 일꾼마다 list/<이름>.js 에 (window.SVList = window.SVList || []).push({ id, prog, season, title, emoji, v, … }) — 형식은 README.md
  // 첫 화면은 목록 값만으로 카드를 그리고, 게임은 고를 때 games/<id>/core.js · ui.js 를 불러옴 (파일 하나가 없어도 나머지는 그대로)
  const PROGS = [
    { id: "devil", name: "데블스 플랜", em: "😈" },
    { id: "genius", name: "더 지니어스", em: "🧠" },
    { id: "blood", name: "피의 게임", em: "🩸" },
  ];
  const LIST_FILES = ["devil", "devil-s3", "genius", "blood"];   // 이 순서가 시즌 칸 · 카드가 나오는 순서
  const LIST = [];
  const entryOf = id => LIST.find(e => e.id === id);
  const playable = () => LIST.filter(e => !e.link);
  const stamp = () => Math.floor(Date.now() / 600000);            // 목록은 10분 단위로 새로 받음 (게임 파일은 목록의 v 로)
  const loadScript = (src, ms = 8000) => new Promise(res => {
    const s = document.createElement("script"); let done = false, t = 0;
    const fin = ok => { if (done) return; done = true; clearTimeout(t); res(ok); };
    t = setTimeout(() => { s.remove(); fin(false); }, ms);
    s.src = src; s.async = true; s.onload = () => fin(true); s.onerror = () => { s.remove(); fin(false); };
    document.head.appendChild(s);
  });
  async function loadLists() {
    LIST.length = 0;
    for (const f of LIST_FILES) {
      window.SVList = [];
      await loadScript(`list/${f}.js?v=${stamp()}`);
      for (const e of window.SVList || []) {
        if (!e || typeof e !== "object" || !/^[A-Za-z0-9_-]{1,40}$/.test(e.id || "") || !e.title || !PROGS.some(p => p.id === e.prog) || LIST.some(x => x.id === e.id)) continue;
        e.season = e.season == null ? "" : String(e.season);
        LIST.push(e);
      }
    }
    window.SVList = LIST.slice();                                // 시간 초과 뒤 늦게 도착한 목록 파일은 이 사본에만 쌓여 무시됨
  }
  const loading = {};
  function ensure(id) {                                          // 게임 한 개의 core · ui 를 불러옴 → Promise<true | false>
    if (CORES[id] && UIS[id]) return Promise.resolve(true);
    const e = entryOf(id); if (!e || e.link) return Promise.resolve(false);
    if (loading[id]) return loading[id];
    const v = encodeURIComponent(e.v == null ? 1 : e.v);
    return (loading[id] = (async () => {
      const a = await loadScript(`games/${id}/core.js?v=${v}`);
      const b = a && await loadScript(`games/${id}/ui.js?v=${v}`);
      delete loading[id];
      return !!(b && CORES[id] && UIS[id]);
    })());
  }
  const metaOf = id => { const e = entryOf(id) || {}, u = UIS[id] || {}; return { emoji: u.emoji || e.emoji || "🎮", name: u.name || e.title || id }; };
  const TIERS = {
    easy: { em: "🐣", name: "초급", desc: "규칙 익히기", cls: "t-easy", names: ["삐약", "뽀송", "몽글", "말랑", "콩콩", "보들", "토실"] },
    normal: { em: "🐱", name: "중급", desc: "눈치 싸움", cls: "t-normal", names: ["나비", "치즈", "까망", "호떡", "망고", "두부", "고등어"] },
    hard: { em: "🐯", name: "고급", desc: "계산 고수", cls: "t-hard", names: ["범수", "백호", "먹호", "산군", "호령", "대호", "줄무늬"] },
  };
  let FAST = 0, PAUSE = false;
  const sfx = (n, o) => { try { C.sfx.play(n, o); } catch (e) {} };
  const rnd32 = () => (Math.random() * 4294967296) >>> 0;
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const myName = () => { try { return (window.GME && GME.me && GME.me.name) || localStorage.getItem("game.arena.name") || "나"; } catch (e) { return "나"; } };

  // ── 고른 것 (기억) ─────────────────────────────────────────
  const urlG = new URLSearchParams(location.search).get("g");
  const opt = {
    game: "",                                                   // 목록을 불러온 뒤 initPick() 이 정함
    prog: C.store("sv.prog", ""),
    season: C.store("sv.season", {}),
    tab: C.store("sv.tab", "solo"),
    tier: TIERS[C.store("sv.tier", "normal")] ? C.store("sv.tier", "normal") : "normal",
    n: C.store("sv.n", {}),
    wn: C.store("sv.wn", {}),
    speed: C.store("sv.speed", 750),
    go: C.store("sv.go", {}),
  };
  const saveOpt = k => C.save("sv." + k, opt[k]);
  const uiOf = id => UIS[id];
  const tabsOf = id => ["solo"].concat(uiOf(id).board ? ["local"] : [], ["friend", "watch"]);
  function gameOpts(id, src) {
    const ui = uiOf(id) || {}, o = {}, s = src || opt.go[id] || {};
    for (const it of ui.opts || []) o[it.k] = it.items.some(x => String(x[0]) === String(s[it.k])) ? s[it.k] : it.def;
    return o;
  }
  const soloN = id => { const ui = uiOf(id), v = opt.n[id] | 0; return Math.max(ui.min, Math.min(ui.max, v || ui.defN || ui.min)); };
  const watchN = id => { const ui = uiOf(id), v = opt.wn[id] | 0; return Math.max(ui.min, Math.min(ui.max, v || ui.defN || ui.min)); };

  // ── 홈 ────────────────────────────────────────────────────
  let hsPick = null;
  function segHtml(key, items, cur) {
    return `<div class="seg" data-seg="${esc(key)}">${items.map(([v, t]) => `<button type="button" class="btn${String(v) === String(cur) ? " active" : ""}" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join("")}</div>`;
  }
  function optRows(id, where) {
    const ui = uiOf(id), go = gameOpts(id);
    let h = "";
    if (where === "solo" && ui.max > 2) {
      const items = []; for (let k = ui.min; k <= ui.max; k++) items.push([k, `${k}명`]);
      h += `<div class="optrow"><span class="small">인원 (나 + AI)</span>${segHtml("n", items, soloN(id))}</div>`;
    }
    if (where === "watch" && ui.max > 2) {
      const items = []; for (let k = ui.min; k <= ui.max; k++) items.push([k, `${k}명`]);
      h += `<div class="optrow"><span class="small">AI 인원</span>${segHtml("wn", items, watchN(id))}</div>`;
    }
    for (const it of ui.opts || []) h += `<div class="optrow"><span class="small">${esc(it.label)}</span>${segHtml("go:" + it.k, it.items, go[it.k])}</div>`;
    if (where === "watch") h += `<div class="optrow"><span class="small">속도</span>${segHtml("speed", [[1300, "🐢 천천히"], [750, "⚡ 보통"], [300, "🚀 빠르게"]], opt.speed)}</div>`;
    return h;
  }
  function onSeg(box) {
    box.onclick = e => {
      const b = e.target.closest(".seg .btn"); if (!b) return;
      const key = b.closest(".seg").dataset.seg, v = b.dataset.v;
      sfx("tap");
      if (key === "n") { opt.n[opt.game] = +v; saveOpt("n"); }
      else if (key === "wn") { opt.wn[opt.game] = +v; saveOpt("wn"); }
      else if (key === "speed") { opt.speed = +v; saveOpt("speed"); }
      else if (key.startsWith("go:")) {
        const k = key.slice(3), it = (uiOf(opt.game).opts || []).find(x => x.k === k);
        const val = it && it.items.find(x => String(x[0]) === v); if (!val) return;
        opt.go[opt.game] = Object.assign({}, opt.go[opt.game] || {}, { [k]: val[0] }); saveOpt("go");
      }
      b.closest(".seg").querySelectorAll(".btn").forEach(x => { const on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on); });
    };
  }
  // 처음 보일 게임 · 방송 칸 · 시즌 칸 정하기 (주소 ?g= → 마지막에 본 것 → 첫 방송 칸의 첫 게임)
  function initPick() {
    const P = playable();
    let g = urlG && P.some(e => e.id === urlG) ? urlG : "";
    if (!g) { const s = C.store("sv.game", ""); if (P.some(e => e.id === s)) g = s; }
    if (!g) for (const p of PROGS) { const f = P.find(e => e.prog === p.id); if (f) { g = f.id; break; } }
    opt.game = g;
    if (!opt.season || typeof opt.season !== "object") opt.season = {};
    syncNav();
  }
  function syncNav() {
    const e = entryOf(opt.game);
    if (e) { opt.prog = e.prog; opt.season[e.prog] = e.season; }
    else if (!PROGS.some(p => p.id === opt.prog)) opt.prog = (PROGS.find(p => LIST.some(x => x.prog === p.id)) || PROGS[0]).id;
  }
  const seasonsOf = prog => { const out = []; for (const e of LIST) if (e.prog === prog && !out.some(s => s.k === e.season)) out.push({ k: e.season, name: e.seasonName || "" }); return out; };
  const cardsOf = prog => { const ss = seasonsOf(prog); let cur = (opt.season || {})[prog]; if (!ss.some(s => s.k === cur)) cur = ss[0] && ss[0].k; return { cur, list: LIST.filter(e => e.prog === prog && e.season === cur), ss }; };
  // 방송 칸 → 시즌 칸 → 카드 (목록 값만으로 그림 — ui.js 를 아직 안 불러와도 됨)
  function drawNav() {
    $("progTabs").innerHTML = PROGS.map(p => { const n = LIST.filter(e => e.prog === p.id).length; return `<button type="button" class="prog${p.id === opt.prog ? " active" : ""}" data-p="${p.id}" role="tab" aria-pressed="${p.id === opt.prog}"><span class="ic">${p.em}</span><b>${esc(p.name)}</b><small>${n ? `${n}종` : "준비 중"}</small></button>`; }).join("");
    const { cur, list, ss } = cardsOf(opt.prog);
    opt.season[opt.prog] = cur;
    $("seasonBar").hidden = ss.length < 1 || (ss.length === 1 && !ss[0].k && !ss[0].name);
    $("seasonBar").innerHTML = ss.map(s => `<button type="button" class="ssn${s.k === cur ? " active" : ""}" data-s="${esc(s.k)}" role="tab" aria-pressed="${s.k === cur}"><b>${esc(s.k)}</b>${s.name ? `<small>${esc(s.name)}</small>` : ""}</button>`).join("");
    $("gameCards").innerHTML = list.length ? list.map(e => `<button type="button" class="g-card${e.link ? " link" : ""}" data-g="${esc(e.id)}" role="radio" aria-checked="${e.id === opt.game}" aria-pressed="${e.id === opt.game}">
      <span class="ic">${esc(e.emoji || "🎮")}</span><b>${esc(e.title)}${e.link ? " ↗" : ""}</b><small>${esc(e.short || "")}</small></button>`).join("")
      : `<p class="sv-empty">${LIST.length ? "이 칸에는 아직 게임이 없어요 (준비 중)" : "게임 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."}</p>`;
  }
  // 방송 출처 · 방송과 다른 점: 목록 값 → ui.src · ui.diff · ui.show 순 (howto 안에 이미 적힌 같은 줄은 빼고 shell 이 한 번만 붙임)
  const noTag = s => String(s == null ? "" : s).replace(/<[^>]*>/g, "");
  const stripSrc = s => noTag(s).replace(/^\s*(📺\s*)?방송\s*[:：]\s*/, "").trim();
  const stripDiff = s => noTag(s).replace(/^\s*※?\s*방송과 다른 점\s*[:：]?\s*/, "").trim();
  function howtoHtml(e, ui) {
    const sh = ui.show && typeof ui.show === "object" ? ui.show : {};
    const src = stripSrc((e && e.src) || ui.src || sh.src), diff = stripDiff((e && e.diff) || ui.diff || sh.diff);
    const isSrc = s => /^\s*(📺\s*)?방송\s*[:：]/.test(noTag(s)), isDiff = s => /^\s*※?\s*방송과 다른 점/.test(noTag(s));
    const lines = (ui.howto || []).filter(s => !(src && isSrc(s)) && !(diff && isDiff(s)));
    return lines.map(s => `<li>${s}</li>`).join("") + (src ? `<li class="sv-src">📺 방송: ${esc(src)}</li>` : "") + (diff ? `<li class="sv-diff">※ 방송과 다른 점: ${esc(diff)}</li>` : "");
  }
  function drawHome() {
    drawNav();
    const id = opt.game, panel = $("panel");
    panel.hidden = true; $("ruleBtn").hidden = true;
    const load = $("gameLoad");
    if (!id || !entryOf(id)) { load.hidden = true; return; }
    if (!UIS[id] || !CORES[id]) {                               // 아직 안 불러온 게임 → 불러오고 다시 그림
      load.hidden = false; load.textContent = "게임을 불러오는 중이에요…";
      ensure(id).then(ok => {
        if (opt.game !== id || SES) return;
        if (ok) drawHome();
        else { load.innerHTML = `게임을 불러오지 못했어요 <button type="button" class="btn" id="loadRetry">다시 해 보기</button>`; $("loadRetry").onclick = () => drawHome(); }
      });
      return;
    }
    load.hidden = true; panel.hidden = false; $("ruleBtn").hidden = false;
    const ui = uiOf(id);
    const tabs = tabsOf(id);
    if (!tabs.includes(opt.tab)) opt.tab = "solo";
    for (const [t, el] of [["solo", "tabSolo"], ["local", "tabLocal"], ["friend", "tabFriend"], ["watch", "tabWatch"]]) {
      $(el).hidden = !tabs.includes(t);
      $(el).setAttribute("aria-pressed", opt.tab === t);
    }
    $("soloBox").hidden = opt.tab !== "solo";
    $("localBox").hidden = opt.tab !== "local";
    $("friendBox").hidden = opt.tab !== "friend";
    $("watchBox").hidden = opt.tab !== "watch";
    if (opt.tab === "solo") {
      C.tierCards($("tiers"), ["easy", "normal", "hard"].map(t => ({ id: t, em: TIERS[t].em, name: TIERS[t].name, desc: TIERS[t].desc, cls: TIERS[t].cls })), t => {
        opt.tier = t; saveOpt("tier");
        $("tiers").querySelectorAll(".tier").forEach(x => x.setAttribute("aria-pressed", x.dataset.id === t));
      }, { selected: opt.tier });
      $("soloOpts").innerHTML = optRows(id, "solo"); onSeg($("soloOpts"));
    }
    if (opt.tab === "local") {
      if (hsPick) { try { hsPick.destroy(); } catch (e) {} hsPick = null; }
      if (window.HotSeat) hsPick = HotSeat.setup($("hsBox"), { game: "survival-" + id, min: 2, max: 2, allowAI: true, tiers: ["easy", "normal", "hard"] });
      $("localOpts").innerHTML = optRows(id, "local"); onSeg($("localOpts"));
    }
    if (opt.tab === "friend") $("friendLede").innerHTML = `${ui.min === ui.max ? `${ui.max}명이 겨뤄요 (더 오면 구경)` : `${ui.min}~${ui.max}명 · 들어온 사람 수로 시작`} · 빈자리 AI 는 방장이 대기실에서 골라요. 초대 링크만 보내면 바로 들어와요.`;
    if (opt.tab === "watch") { $("watchOpts").innerHTML = optRows(id, "watch"); onSeg($("watchOpts")); }
    $("howto").innerHTML = howtoHtml(entryOf(id), ui);
    $("startBtn").textContent = opt.tab === "friend" ? "친구랑 시작" : "시작!";
  }
  const saveNav = () => { saveOpt("game"); saveOpt("prog"); saveOpt("season"); };
  // 방송 칸 · 시즌 칸을 바꾸면 그 칸의 첫 게임을 골라 둠 (게임 없는 칸이면 비움)
  function pickFirst() { const { list } = cardsOf(opt.prog); const f = list.find(e => !e.link); opt.game = f ? f.id : ""; }
  $("progTabs").onclick = e => {
    const b = e.target.closest(".prog"); if (!b || b.dataset.p === opt.prog) return;
    sfx("tap"); opt.prog = b.dataset.p; pickFirst(); saveNav(); drawHome();
  };
  $("seasonBar").onclick = e => {
    const b = e.target.closest(".ssn"); if (!b) return;
    sfx("tap"); opt.season[opt.prog] = b.dataset.s; pickFirst(); saveNav(); drawHome();
  };
  $("gameCards").onclick = e => {
    const b = e.target.closest(".g-card"); if (!b) return;
    const en = entryOf(b.dataset.g); if (!en) return;
    sfx("tap");
    if (en.link) { if (!/^\s*(javascript|data):/i.test(en.link)) location.href = en.link; return; }   // 다른 주소로 가는 카드 (예: ../genius/)
    opt.game = en.id; syncNav(); saveNav(); drawHome();
  };
  for (const [t, el] of [["solo", "tabSolo"], ["local", "tabLocal"], ["friend", "tabFriend"], ["watch", "tabWatch"]]) $(el).onclick = () => { sfx("tap"); opt.tab = t; saveOpt("tab"); drawHome(); };

  // ── 판 (혼자 · 한 기기 · 구경 · 친구랑 방장) ─────────────────
  // 판 하나. pre = 이미 둔 수들(연습 판 · 📒 에서 온 장면)을 조용히 먼저 되감아 그 자리에서 시작
  function makeTable(id, seats, cfg, seed, hooks, pre) {
    const core = CORES[id];
    const T = { id, core, seats, cfg, st: core.init({ n: seats.length, seed, cfg }), timers: new Map(), auto: 0, dead: false, r: mulberry(seed ^ 0x9e3779b9) };
    const clear = () => { for (const t of T.timers.values()) clearTimeout(t); T.timers.clear(); clearTimeout(T.auto); T.auto = 0; };
    // 🎞️ 복기 기록: st 를 바꾸는 길은 T.act(apply) 와 T.adv(advance) 둘뿐 — 여기서만 쌓음 (review.js 가 같은 seed 로 그대로 되감음)
    const en = entryOf(id) || {};
    T.rec = { v: 1, id, gv: en.v == null ? 1 : en.v, at: Date.now(), mode: "", n: seats.length, seed, cfg: JSON.parse(JSON.stringify(cfg || {})),
      seats: seats.map(s => ({ kind: s.kind === "ai" ? "ai" : "human", tier: s.tier || "", name: s.name, emoji: s.emoji })), me: -1, acts: [], fp: null, ranks: null };
    T.view = s => core.view(T.st, s);
    T.needs = () => core.needs(T.st);
    T.over = () => core.over(T.st);
    T.kill = () => { T.dead = true; clear(); };
    T.bot = s => { const x = T.seats[s]; return !!(x && (x.kind === "ai" || x.sub)); };
    T.adv = () => { T.rec.acts.push({ adv: 1 }); core.advance(T.st); };
    T.finish = () => {                                             // 판이 끝났을 때 한 번: 기록을 마무리해 이 기기에 저장
      if (T.rec.fp != null) return;
      const inf = hooks.info ? hooks.info() : {};
      T.rec.mode = inf.mode || ""; T.rec.me = inf.me == null ? -1 : inf.me; if (inf.drill) T.rec.drill = 1;
      try { T.rec.fp = window.SVReview ? SVReview.fp(T.st) : ""; T.rec.ranks = core.ranks(T.st); } catch (e) { T.rec.fp = ""; }
      if (window.SVReview && T.rec.acts.length && !T.rec.drill) SVReview.save(T.rec);          // 연습 판(📒)은 지난 판 목록에 안 쌓음
    };
    T.act = (seat, a) => {
      if (T.dead) return { ok: false, err: "끝난 판이에요" };
      if (!T.needs().includes(seat)) return { ok: false, err: "지금은 차례가 아니에요" };
      const copy = JSON.parse(JSON.stringify(a == null ? null : a));
      let r; try { r = core.apply(T.st, seat, a); } catch (e) { console.error("[survival]", e); r = { ok: false, err: "그렇게는 못 해요" }; }
      if (r && r.ok) { T.rec.acts.push({ s: seat, a: copy, h: T.bot(seat) ? 0 : 1 }); T.kick(); }
      return r || { ok: false };
    };
    for (const e of pre || []) {                                   // 연습 판: 그 장면 앞까지 조용히 되감음 (안 먹으면 규칙이 바뀐 것 → 던져서 알림)
      if (e.adv) { T.adv(); continue; }
      const a = JSON.parse(JSON.stringify(e.a)), r = core.apply(T.st, e.s, a);
      if (!r || !r.ok) throw new Error("replay");
      T.rec.acts.push({ s: e.s, a: JSON.parse(JSON.stringify(e.a)), h: e.h ? 1 : 0 });
    }
    function botMove(s) {
      T.timers.delete(s);
      if (T.dead || !T.needs().includes(s)) return;
      if (PAUSE) { schedule(); return; }
      const x = T.seats[s], tier = (x && x.tier) || "normal";
      let a = null; try { a = core.ai(core.view(T.st, s), s, tier, T.r); } catch (e) { console.error("[survival ai]", e); }
      const r = a != null ? T.act(s, a) : { ok: false };
      if (!r.ok && core.legal) { const L = core.legal(T.st, s); if (L.length) T.act(s, L[Math.floor(T.r() * L.length)]); }
    }
    function schedule() {
      clear();
      if (T.dead || T.over()) return;
      if (PAUSE) { T.auto = setTimeout(schedule, 250); return; }
      const need = T.needs();
      for (const s of need) if (T.bot(s)) T.timers.set(s, setTimeout(() => botMove(s), FAST ? 12 : (hooks.delay ? hooks.delay(s) : 600 + T.r() * 500)));
      if (!need.length && core.auto) {
        const ms = core.auto(T.st);
        if (ms != null) T.auto = setTimeout(() => { if (T.dead) return; if (PAUSE) { schedule(); return; } T.adv(); T.kick(); }, FAST ? 25 : ms);
      }
    }
    T.kick = () => { if (T.dead) return; hooks.update(); if (T.over()) { clear(); hooks.over(); return; } schedule(); };
    T.resched = schedule;
    return T;
  }

  // ── 세션 ──────────────────────────────────────────────────
  let SES = null;
  const coach = window.CoachPanel ? CoachPanel.create({ game: SITE, title: "AI 선생님", bottom: 80, icon: "🧑‍🏫", startHidden: true }) : null;
  let coachBtn = null;
  if (coach) { coachBtn = CoachPanel.button($("coachBtn"), coach); coach.onChange(() => { if (SES) render(); }); }

  function newSes(id, mode) {
    return { id, mode, T: null, V: null, me: 0, g: 0, seats: [], memo: {}, ranked: 0, resHidden: false, wait: false, on: null };
  }
  function endSession(keepNet) {
    if (!SES) return;
    if (SES.T) SES.T.kill();
    if (SES.on) { SES.on.offs.forEach(f => { try { f(); } catch (e) {} }); SES.on.offs = []; Object.values(SES.on.away || {}).forEach(t => clearTimeout(t)); }
    if (SES.on && !keepNet && window.ArenaUI && ArenaUI.net) { try { ArenaUI.leave(); } catch (e) {} }
    SES = null;
    if (coach) coach.hide();
    $("resOv").hidden = true;
  }
  function showPlay() {
    document.body.classList.add("playing");
    document.querySelector(".wrap").hidden = true;
    $("play").hidden = false;
  }
  function showHome() {
    document.body.classList.remove("playing");
    $("play").hidden = true;
    $("resOv").hidden = true;
    document.querySelector(".wrap").hidden = false;
    drawHome();
  }
  // 지금 이 기기가 두는 자리 (한 기기는 차례인 사람 자리)
  function curMe() {
    if (!SES) return -1;
    if (SES.mode === "local" && SES.T) { const n = SES.T.needs().filter(s => !SES.T.bot(s)); return n.length ? n[0] : -1; }
    return SES.me;
  }
  const viewSeat = () => (SES.mode === "watch" || SES.mode === "local") ? "all" : SES.me;
  function coachSeat() {
    if (!SES) return -1;
    if (SES.mode === "watch") { const n = SES.T ? SES.T.needs() : []; return n.length ? n[0] : 0; }
    if (SES.mode === "local") { const m = curMe(); if (m >= 0) return m; const h = SES.seats.findIndex(s => s.kind === "human"); return h < 0 ? 0 : h; }
    return SES.me;
  }
  function viewFor(seat) {
    if (!SES) return null;
    if (SES.T) return SES.T.view(seat);
    return seat === SES.me ? SES.V : null;
  }
  const lastSeq = V => (V && V.log && V.log.length ? V.log[V.log.length - 1].i : -1);

  function startLocal(mode) {
    const id = opt.game, ui = uiOf(id);
    endSession();
    SES = newSes(id, mode);
    let seats;
    if (mode === "solo") {
      const n = soloN(id), names = TIERS[opt.tier].names;
      seats = [{ kind: "human", name: myName(), emoji: "🙂" }];
      for (let k = 1; k < n; k++) seats.push({ kind: "ai", tier: opt.tier, name: names[(k - 1) % names.length], emoji: TIERS[opt.tier].em });
      SES.me = 0;
    } else if (mode === "watch") {
      const n = watchN(id), mix = ["hard", "normal", "hard", "easy", "normal", "hard", "normal", "easy"];
      seats = []; for (let k = 0; k < n; k++) { const t = ui.max <= 2 ? "hard" : mix[k]; seats.push({ kind: "ai", tier: t, name: TIERS[t].names[k % 7], emoji: TIERS[t].em }); }
      SES.me = -1;
    } else {
      if (!hsPick || !hsPick.valid) { C.toast("자리를 먼저 골라 주세요"); SES = null; return; }
      seats = hsPick.seats.map(s => s.kind === "ai" ? { kind: "ai", tier: s.tier, name: s.name, emoji: s.emoji } : { kind: "human", name: s.name, emoji: s.emoji });
      SES.me = -1;
    }
    SES.cfg = gameOpts(id);
    showPlay();
    startTable(seats, SES.cfg, rnd32());
  }
  function startTable(seats, cfg, seed, pre) {
    if (SES.T) SES.T.kill();
    SES.seats = seats; SES.cfg = cfg; SES.ranked = 0; SES.memo = {}; SES.resHidden = false; SES.wait = false;
    SES.g = (SES.g || 0) + (SES.mode === "online" ? 0 : 1);
    if (window.SVReview && SVReview.active) SVReview.close(true);   // 새 판이 시작되면 열려 있던 복기는 닫음
    SES.T = makeTable(SES.id, seats, cfg, seed, {
      update: onTableUpdate, over: onTableOver,
      delay: () => SES && SES.mode === "watch" ? opt.speed * (0.8 + Math.random() * 0.4) : 550 + Math.random() * 600,
      info: () => ({ mode: SES ? SES.mode : "", me: SES && SES.mode !== "local" && SES.mode !== "watch" ? SES.me : -1, drill: !!(SES && SES.drill) }),
    }, pre);
    SES.T.kick();
  }
  function onTableUpdate() {
    if (!SES || !SES.T) return;
    SES.V = SES.T.view(viewSeat());
    if (SES.mode === "online" && SES.on && SES.on.host) pushViews();
    render();
  }
  function onTableOver() {
    SES.T.finish();                                              // 🎞️ 기록 저장 (이 기기 최근 10판)
    onTableUpdate(); sfx("win");
    if (SES && SES.mode === "online" && SES.on && SES.on.host) pushRecs();
  }

  // ── 그리기 ────────────────────────────────────────────────
  function act(a) {
    if (!SES || !SES.V) return { ok: false };
    const me = curMe();
    if (me < 0) return { ok: false };
    if (SES.mode === "online" && !SES.on.host) {
      if (SES.wait) return { ok: false, err: "보내는 중" };
      SES.wait = true; SES.memo[me] = lastSeq(SES.V);
      SES.on.net.send({ t: "a", g: SES.g, a }, true);
      render();
      return { ok: true, sent: true };
    }
    const seqBefore = lastSeq(SES.T.view(me));
    const r = SES.T.act(me, a);
    if (!r.ok) { if (r.err) C.toast(r.err, 1600); return r; }
    SES.memo[me] = seqBefore;
    if (SES && SES.drill) drillCheck(a, me);
    return r;
  }
  function render() {
    if (!SES) return;
    if (SES.pend) { $("playSub").textContent = "게임 불러오는 중…"; $("stage").innerHTML = `<p class="sv-wait">방장이 고른 게임을 불러오는 중이에요…</p>`; return; }
    const ui = uiOf(SES.id), V = SES.V;
    $("playTitle").textContent = `${ui.emoji} ${ui.name}`;
    if (!V) { $("playSub").textContent = "연결 중…"; $("stage").innerHTML = `<p class="sv-wait">방장 화면과 맞추는 중이에요…</p>`; $("seatBar").innerHTML = ""; return; }
    const me = curMe();
    $("playSub").textContent = (SES.drill ? "🎯 연습 판 · " : "") + (ui.sub ? ui.sub(V, me) : "");
    $("seatBar").innerHTML = SES.seats.map((s, i) => {
      const c = ui.chip ? ui.chip(V, i, me) : {};
      const isMe = (SES.mode === "solo" || SES.mode === "online") && i === SES.me;
      return `<div class="sv-seat${c.on ? " on" : ""}${c.out ? " out" : ""}${isMe ? " me" : ""}"><span class="av">${esc(s.emoji || "🙂")}</span><span class="nm">${esc(s.name)}${s.sub ? "🤖" : ""}</span><span class="pt">${c.t || ""}</span></div>`;
    }).join("");
    const coachOn = !!(coach && coach.visible && !coach.collapsed);
    const canAct = me >= 0 && !!(V.needs && V.needs.includes(me)) && !SES.wait && !V.over;
    try {
      ui.render($("stage"), V, { me, act, canAct, seats: SES.seats, mode: SES.mode, fast: FAST, coachOn, g: SES.g, wait: SES.wait, sfx, toast: (m, ms) => C.toast(m, ms) });
    } catch (e) { console.error("[survival render]", e); }
    // 선생님 단추: 혼자 · 한 기기 · 구경 = 늘, 친구랑 = 방장이 켰을 때만
    const coachOk = SES.mode !== "online" || !!(SES.on && SES.on.cfg && SES.on.cfg.coach);
    $("coachBtn").hidden = !coachOk;
    if (coach && !coachOk && coach.visible) coach.hide();      // visible 확인 필수: hide → onChange → render 가 되풀이되면 무한 재귀 (친구랑 · 선생님 꺼짐)
    if (coach && coach.visible) updateCoach();
    fitStage();
    $("againBtn").hidden = SES.mode === "online";
    $("resBtn").hidden = !(V.over && SES.resHidden);
    if (V.over) onOverSeen();
    drawResult();
  }
  // 선생님 창이 판을 가리지 않게 (ui.fitCoach 가 true 인 게임만): 창이 스테이지 아래쪽에 걸치면 그만큼을 비우고
  //  (스테이지 padding-bottom + .sv-coachfit 클래스), 판이 쓸 수 있는 높이를 스테이지의 CSS 변수 --sv-sh 로 알려 줌.
  //  게임 CSS 는 `.sv-coachfit .판 { width: min(100%, calc(var(--sv-sh) - …)) }` 로 판을 줄이고 곁가지(안내 · 범례)는 숨김.
  //  사람이 창을 판과 상관없는 곳으로 끌어다 놓았으면(스테이지 아래쪽에 안 걸침) 건드리지 않음.
  //  stageEl · uiArg 를 주면 그 판(복기 화면 #revStage)에 대해 같은 일을 함. 안 주면 실제 판 화면 — 복기가 열려 있는 동안은 복기 쪽만 다시 맞춤.
  function fitStage(stageEl, uiArg) {
    if (!stageEl && window.SVReview && SVReview.active) { SVReview.refit(); return; }
    const st = stageEl || $("stage"); if (!st) return;
    const ui = uiArg || (SES && SES.V && !SES.pend && UIS[SES.id] ? UIS[SES.id] : null), fit = !!(ui && ui.fitCoach);
    document.body.classList.toggle("sv-fitcoach", fit);
    st.style.paddingBottom = "";
    if (!fit) { st.classList.remove("sv-coachfit"); st.style.removeProperty("--sv-sh"); return; }
    const sb = st.getBoundingClientRect(), cs = getComputedStyle(st);
    const pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    let res = 0;
    const el = coach && coach.visible && !coach.collapsed ? coach.el : null;
    if (el && !el.hidden) { const cb = el.getBoundingClientRect(); if (cb.height > 0 && cb.bottom >= sb.bottom - 8 && cb.top < sb.bottom) res = Math.ceil(sb.bottom - cb.top + 6); }
    if (res) st.style.paddingBottom = (pb + res) + "px";
    st.classList.toggle("sv-coachfit", res > 0);
    st.style.setProperty("--sv-sh", Math.max(100, Math.floor(sb.height - pt - pb - res)) + "px");
  }
  if (coach && coach.el && window.ResizeObserver) { try { new ResizeObserver(() => { if (SES) fitStage(); }).observe(coach.el); } catch (e) {} }
  addEventListener("resize", () => { if (SES) fitStage(); });
  function updateCoach() {
    if (window.SVReview && SVReview.active) return;               // 복기 중에는 선생님 창이 복기 글을 보여 줌
    const seat = coachSeat();
    if (seat < 0 || !SES || !SES.V) { coach.set(`<p>👀 구경 중이에요. 자리에 앉으면 내 차례마다 알려 드려요.</p>`); return; }
    const Vc = viewFor(seat); if (!Vc) return;
    let c = null;
    try { c = uiOf(SES.id).coach(Vc, seat, SES.memo[seat] == null ? -1 : SES.memo[seat], SES.seats.map(s => s.name)); } catch (e) { console.error("[survival coach]", e); }
    if (!c) { coach.set("<p>조금만 기다려 주세요…</p>"); return; }
    const who = SES.mode === "local" || SES.mode === "watch" ? `<p class="sv-cwho">${esc(SES.seats[seat] ? SES.seats[seat].name : "")} 자리에서 보면</p>` : "";
    coach.set(`${who}<p>👀 <b>상대 흐름</b> ${c.opp}</p><p>📊 <b>내 흐름</b> ${c.mine}</p><p>💡 <b>추천</b> ${c.rec}</p>${c.why ? `<p class="sv-why">👉 ${c.why}</p>` : ""}`);
  }

  // ── 결과 · 기록 ───────────────────────────────────────────
  function onOverSeen() {
    if (!SES || SES.ranked === SES.g) return;
    SES.ranked = SES.g;
    const V = SES.V, me = SES.mode === "solo" || SES.mode === "online" ? SES.me : -1;
    if (SES.mode === "watch" || SES.drill || !window.GRank || !V.ranks) return;     // 연습 판(📒)은 기록에 안 셈
    if (SES.mode === "local") return;                                               // 한 기기 판은 기록에 안 셈 (오목 등 다른 게임과 같게)
    if (me < 0) return;
    const R = V.ranks, mine = R[me], firsts = R.filter(x => x === 0).length;
    const res = mine === 0 ? (firsts > 1 ? "d" : "w") : "l";
    const beat = R.filter((x, i) => i !== me && x > mine).length;
    const rec = { mode: SES.mode === "online" ? "friend" : "ai", res, beat, score: V.score ? V.score[me] : undefined, tier: SES.mode === "solo" ? opt.tier : undefined };
    if (SES.mode === "online") rec.opp = SES.seats.map((s, i) => ({ s, i })).filter(x => x.i !== me && x.s.uid && !x.s.ai && x.s.kind !== "ai").map(x => ({ uid: x.s.uid, res: R[me] < R[x.i] ? "w" : R[me] > R[x.i] ? "l" : "d" }));
    try { GRank.result(SITE, rec); } catch (e) { console.warn("[rank]", e); }
  }
  function drawResult() {
    const ov = $("resOv"), V = SES && SES.V;
    if (!SES || !V || !V.over || SES.resHidden) { ov.hidden = true; return; }
    const ui = uiOf(SES.id), R = V.ranks || [], me = SES.mode === "local" || SES.mode === "watch" ? -1 : SES.me;
    const order = SES.seats.map((s, i) => i).sort((a, b) => (R[a] ?? 9) - (R[b] ?? 9));
    const medal = p => ["🥇", "🥈", "🥉"][p] || `${p + 1}등`;
    let head;
    if (me >= 0) head = R[me] === 0 ? (R.filter(x => x === 0).length > 1 ? "🤝 공동 1등!" : "🏆 1등!") : `${R[me] + 1}등이에요`;
    else { const w = order.filter(i => R[i] === 0).map(i => SES.seats[i].name); head = w.length > 1 ? `🤝 ${w.join(" · ")} 공동 1등` : `🏆 ${w[0] || ""} 승리!`; }
    const rows = order.map(i => `<li class="${i === me ? "me" : ""}"><span>${medal(R[i] ?? order.length)}</span><b>${esc(SES.seats[i].emoji)} ${esc(SES.seats[i].name)}</b><i>${(ui.chip && ui.chip(V, i, me).t) || ""}</i></li>`).join("");
    let extra = ""; try { extra = ui.result ? ui.result(V, me) : ""; } catch (e) {}
    let acts = "";
    if (SES.mode !== "online") acts = `<button class="btn primary big" data-r="again">↺ 한 판 더</button><div class="two">${revBtn()}<button class="btn" data-r="peek">👀 판 보기</button><button class="btn" data-r="home">종목 고르기</button></div>`;
    else acts = onlineActs();
    $("resBox").innerHTML = `<h2>${head}</h2><ol class="sv-rank">${rows}</ol>${extra ? `<div class="sv-resx">${extra}</div>` : ""}${acts}`;
    if (ov.hidden) { ov.hidden = false; if (me >= 0 && R[me] === 0) try { C.confetti(); } catch (e) {} }
  }
  // 🎞️ 복기: 방금 끝난 판의 기록 (방장 · 혼자 · 한 기기 · 구경 = 내 테이블, 손님 = 방장이 끝난 뒤 보내 준 것)
  function recNow() {
    if (!SES || !window.SVReview) return null;
    const T = SES.T;
    if (T && T.over() && T.rec && T.rec.fp != null && T.rec.acts.length) return T.rec;
    return SES.recIn && SES.recIn.g === SES.g && SES.recIn.id === SES.id ? SES.recIn.rec : null;
  }
  const revBtn = () => (recNow() ? `<button class="btn" data-r="review">🎞️ 복기</button>` : "");
  function openRev(rec, fromResult) {
    if (!window.SVReview) { C.toast("복기를 불러오지 못했어요"); return; }
    ensure(rec.id).then(ok => {
      if (!ok) { C.toast("이 게임을 불러오지 못했어요", 2400); return; }
      const opened = SVReview.open({
        rec, core: CORES[rec.id], ui: UIS[rec.id], coach, toast: (m, ms) => C.toast(m, ms), sfx, fitStage, Mistakes: window.Mistakes,
        onClose: () => { if (fromResult && SES) { SES.resHidden = false; render(); } },
      });
      if (opened && fromResult && SES) { SES.resHidden = true; render(); }
    });
  }
  $("resBox").onclick = e => {
    const b = e.target.closest("[data-r]"); if (!b || b.disabled || !SES) return;
    const r = b.dataset.r; sfx("tap");
    if (r === "review") { const rec = recNow(); if (rec) openRev(rec, true); }
    else if (r === "again") startLocal(SES.mode);
    else if (r === "home") { endSession(); showHome(); }
    else if (r === "peek") { SES.resHidden = true; render(); }
    else if (r === "next") hostNext();
    else if (r === "force") hostNext();
    else if (r === "lobby") { try { SES.on.net.chat && SES.on.net.chat("🔄 대기실로 돌아가요"); } catch (e) {} if (window.ArenaUI) ArenaUI.toLobby(); }
    else if (r === "rdy") guestReady();
    else if (r === "leave") { if (window.ArenaUI) ArenaUI.leave(); }
  };
  $("resBtn").onclick = () => { if (!SES) return; SES.resHidden = false; render(); };

  // ── 친구랑 ────────────────────────────────────────────────
  // 친구랑 방의 종목 고르기: 방송 칸 · 시즌 칸으로 묶은 선택 상자 (게임이 많아서 단추 줄 대신)
  let selTok = 0;
  function gameSelectHtml(cur) {
    const out = [];
    for (const p of PROGS) {
      const items = LIST.filter(e => e.prog === p.id && !e.link); if (!items.length) continue;
      const seasons = seasonsOf(p.id).filter(s => items.some(e => e.season === s.k));
      for (const s of seasons) out.push(`<optgroup label="${esc(p.name)}${s.k ? ` · ${esc(s.k)}` : ""}">${items.filter(e => e.season === s.k).map(e => `<option value="${esc(e.id)}"${e.id === cur ? " selected" : ""}>${esc(e.emoji || "🎮")} ${esc(e.title)}</option>`).join("")}</optgroup>`);
    }
    return out.join("");
  }
  function friendOpts() {
    const gid = cfg => (cfg && entryOf(cfg.game) && !entryOf(cfg.game).link) ? cfg.game : opt.game;       // 방이 고른 게임 (모르는 이름이면 내가 보던 것)
    const label = cfg => {
      const id = gid(cfg), m = metaOf(id), ui = UIS[id], fill = (cfg && cfg.fill) | 0;
      return `${m.emoji} ${m.name}${ui && fill > 0 && ui.max > 2 ? ` · AI로 ${fill}명까지` : ""}`;
    };
    return {
      game: SITE, title: "🎭 베니 서바이벌", min: 2, max: 8, coach: true,
      describe(n, cfg) {
        const id = gid(cfg);
        if (!UIS[id]) { ensure(id); const m = metaOf(id); return `${m.emoji} ${m.name}`; }       // 아직 안 불러온 게임 (손님) — 이름만
        const ui = uiOf(id), fill = Math.min(ui.max, (cfg && cfg.fill) | 0);
        const seated = Math.min(n, ui.max), tot = Math.max(seated, fill);
        if (tot < ui.min) return { text: `${ui.emoji} ${ui.name}는 ${ui.min}명부터예요`, ok: false };
        return `${ui.emoji} ${ui.name} · ${seated}명${tot > seated ? ` + AI ${tot - seated}` : ""}${n > ui.max ? ` · ${n - ui.max}명은 구경` : ""}`;
      },
      settings: {
        defaults: { game: opt.game, fill: 0, tier: "normal", o: gameOpts(opt.game) },
        label,
        render(el, cfg, canEdit, update) {
          const id = gid(cfg);
          if (!UIS[id]) {                                         // 아직 안 불러온 게임 → 불러온 뒤 한 번 더 그림
            const m = metaOf(id); el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(m.emoji)} ${esc(m.name)} · 불러오는 중…</p>`;
            ensure(id).then(ok => { if (ok) update({}); });
            return;
          }
          const ui = uiOf(id), fill = (cfg && cfg.fill) | 0, tier = TIERS[cfg && cfg.tier] ? cfg.tier : "normal";
          const go = gameOpts(id, cfg && cfg.o);
          if (!canEdit) {
            const parts = [`${ui.emoji} ${ui.name}`];
            for (const it of ui.opts || []) { const x = it.items.find(y => String(y[0]) === String(go[it.k])); if (x) parts.push(x[1]); }
            if (fill > 0 && ui.max > 2) parts.push(`빈자리 AI(${TIERS[tier].em})로 ${fill}명까지`);
            el.innerHTML = `<p class="arn-soft" style="text-align:center">${parts.map(esc).join(" · ")}</p>`;
            return;
          }
          let h = `<div class="optrow"><span class="small">종목</span><select class="sv-sel" data-sel="game" aria-label="종목">${gameSelectHtml(id)}</select></div>`;
          if (ui.max > 2) {
            const items = [[0, "온 사람끼리"]]; for (let k = Math.max(3, ui.min); k <= ui.max; k++) items.push([k, `AI로 ${k}명까지`]);
            h += `<div class="optrow"><span class="small">빈자리</span>${segHtml("fill", items.slice(0, 4), fill)}</div>`;
            if (fill > 0) h += `<div class="optrow"><span class="small">AI 실력</span>${segHtml("tier", ["easy", "normal", "hard"].map(t => [t, `${TIERS[t].em} ${TIERS[t].name}`]), tier)}</div>`;
          }
          for (const it of ui.opts || []) h += `<div class="optrow"><span class="small">${esc(it.label)}</span>${segHtml("go:" + it.k, it.items, go[it.k])}</div>`;
          el.innerHTML = h;
          el.onchange = e => {                                    // 종목 바꾸기: 그 게임을 불러온 뒤에 방 설정을 바꿈
            const s = e.target.closest("select[data-sel=game]"); if (!s) return;
            const v = s.value; if (!entryOf(v) || entryOf(v).link) return;
            const tok = (selTok = (selTok || 0) + 1);             // 빨리 연달아 고르면 마지막으로 고른 것만 반영
            ensure(v).then(ok => { if (tok !== selTok) return; if (!ok) { C.toast("게임을 불러오지 못했어요"); return; } opt.game = v; syncNav(); saveNav(); update({ game: v, o: gameOpts(v), fill: 0 }); });
          };
          el.onclick = e => {
            const b = e.target.closest(".seg .btn"); if (!b) return;
            const key = b.closest(".seg").dataset.seg, v = b.dataset.v;
            if (key === "fill") update({ fill: +v });
            else if (key === "tier") update({ tier: v });
            else if (key.startsWith("go:")) { const k = key.slice(3), it = (ui.opts || []).find(x => x.k === k), val = it && it.items.find(x => String(x[0]) === v); if (val) update({ o: Object.assign({}, go, { [k]: val[0] }) }); }
          };
        },
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => { if (SES && SES.mode === "online") { endSession(true); showHome(); } },
      onLeave: why => { if (SES && SES.mode === "online") { endSession(true); showHome(); if (why) C.toast(why, 2600); } },
    };
  }
  let onlineTok = 0;
  function startOnline(ctx) {
    const cfg0 = ctx.cfg || (ctx.net && ctx.net.meta && ctx.net.meta.cfg) || {};
    const known = id => !!(entryOf(id) && !entryOf(id).link);
    if (cfg0.game && !known(cfg0.game)) { C.toast("방장이 고른 게임을 목록에서 찾지 못했어요. 새로 고침해 주세요", 3200); return; }   // 다른 게임으로 바꿔 그리지 않음
    const want = cfg0.game || opt.game, tok = ++onlineTok;
    if (UIS[want] && CORES[want]) { startOnline2(ctx); return; }
    ensure(want).then(ok => {                                    // 손님은 방장이 고른 게임을 먼저 불러옴 (그 사이 나갔으면 그만둠)
      if (tok !== onlineTok || (window.ArenaUI && ArenaUI.net && ctx.net && ArenaUI.net !== ctx.net)) return;
      if (ok) startOnline2(ctx); else C.toast("게임을 불러오지 못했어요. 다시 들어와 주세요", 2800);
    });
  }
  function startOnline2(ctx) {
    endSession(true);
    const net = ctx.net, host = ctx.role === "host", cfg = ctx.cfg || (net.meta && net.meta.cfg) || {};
    const id = entryOf(cfg.game) && UIS[cfg.game] ? cfg.game : opt.game;
    SES = newSes(id, "online");
    SES.on = { net, host, uid: ctx.uid || net.uid, cfg, rdy: new Set(), pick: {}, offs: [], away: {} };
    showPlay();
    if (host) {
      SES.on.offs.push(net.on("msg", (u, m) => hostMsg(u, m)));
      SES.on.offs.push(net.on("players", () => hostPlayers()));
      hostNewGame(true);
    } else {
      SES.on.offs.push(net.on("msg", m => guestMsg(m)));
      render();
      net.send({ t: "hi" }, true);
      // 방장 답이 늦으면 한 번 더
      const again = setTimeout(() => { if (SES && SES.mode === "online" && !SES.V) net.send({ t: "hi" }, true); }, 2500);
      SES.on.offs.push(() => clearTimeout(again));
    }
  }
  function hostNewGame(first) {
    const on = SES.on, pl = on.net.players || {}, ui = uiOf(SES.id);
    const present = u => !!pl[u];
    let uids;
    if (first || !SES.T) {
      const seated = Object.keys(pl).filter(u => !(pl[u] && pl[u].watch) && u !== on.uid).sort();
      uids = [on.uid].concat(seated);
    } else {
      const R = (SES.V && SES.V.ranks) || [];
      const prev = SES.T.seats.map((s, i) => ({ s, i })).filter(x => x.s.kind !== "ai" && present(x.s.uid)).sort((a, b) => (R[a.i] ?? 9) - (R[b.i] ?? 9)).map(x => x.s.uid);
      const pickers = Object.keys(pl).filter(u => !prev.includes(u) && on.pick[u]);
      // 자리가 모자라면 이긴 사람이 남고 낮은 등수부터 구경꾼과 바꿈 (1:1 종목은 '이긴 사람 남기')
      uids = prev.slice(0, Math.max(1, ui.max - pickers.length)).concat(pickers);
    }
    uids = uids.slice(0, ui.max);
    const seats = uids.map(u => ({ kind: u === on.uid ? "human" : "remote", uid: u, name: (pl[u] && pl[u].name) || "친구", emoji: (pl[u] && pl[u].emoji) || "🙂" }));
    const fill = Math.min(ui.max, on.cfg.fill | 0), tier = TIERS[on.cfg.tier] ? on.cfg.tier : "normal";
    for (let k = 0; seats.length < fill || seats.length < ui.min; k++) seats.push({ kind: "ai", tier, name: TIERS[tier].names[k % 7], emoji: TIERS[tier].em, uid: "ai:" + seats.length });
    on.rdy = new Set(); on.pick = {};
    SES.g = (SES.g || 0) + 1;
    SES.me = seats.findIndex(s => s.uid === on.uid);
    startTable(seats, gameOpts(SES.id, on.cfg.o), rnd32());
  }
  function hostNext() { if (SES && SES.on && SES.on.host) { sfx("go"); hostNewGame(false); } }
  function seatInfo() { return SES.seats.map(s => ({ n: s.name, e: s.emoji, k: s.kind === "ai" ? "ai" : "human", s: s.sub ? 1 : 0, u: s.uid })); }
  function pushViews() {
    const on = SES.on, pl = on.net.players || {}, T = SES.T; if (!T) return;
    const seats = seatInfo();
    for (const u of Object.keys(pl)) {
      if (u === on.uid) continue;
      const s = T.seats.findIndex(x => x.uid === u);
      try { on.net.send(u, { t: "v", g: SES.g, id: SES.id, me: s, v: T.view(s), seats, rd: [...on.rdy], pk: Object.keys(on.pick), coach: !!on.cfg.coach }, true); } catch (e) {}
    }
  }
  // 🎞️ 판이 끝나면 방장이 손님마다 기록(rec)을 한 번 따로 보냄 (매 수 보내는 v 에 싣지 않음 — 크기 · 숨은 패). 손님은 자기 자리(me)로 맞춰서 받음.
  function pushRecs(only) {
    const on = SES && SES.on, T = SES && SES.T; if (!on || !on.host || !T || !T.over() || !T.rec || T.rec.fp == null) return;
    let size = 0; try { size = JSON.stringify(T.rec).length; } catch (e) { return; }
    if (size > 60000) return;
    const pl = on.net.players || {};
    for (const u of Object.keys(pl)) {
      if (u === on.uid || (only && u !== only)) continue;
      const s = T.seats.findIndex(x => x.uid === u);
      try { on.net.send(u, { t: "rec", g: SES.g, id: SES.id, rec: Object.assign({}, T.rec, { me: s, mode: "online" }) }, true); } catch (e) {}
    }
  }
  function hostMsg(u, m) {
    if (!m || !SES || SES.mode !== "online" || !SES.T) return;
    const on = SES.on;
    if (m.t === "hi") { comeBack(u); pushViews(); if (SES.T.over()) pushRecs(u); return; }
    if (m.t === "a") {
      if (m.g !== SES.g) { pushViews(); return; }
      const s = SES.T.seats.findIndex(x => x.uid === u);
      if (s < 0) return;
      const r = SES.T.act(s, m.a);
      if (!r.ok) { try { on.net.send(u, { t: "err", err: r.err || "그렇게는 못 해요" }, true); } catch (e) {} pushViews(); }
      return;
    }
    if (m.t === "rdy" && m.g === SES.g) { on.rdy.add(u); if (m.pick) on.pick[u] = 1; pushViews(); render(); }
  }
  function comeBack(u) {
    const on = SES.on; clearTimeout(on.away[u]); delete on.away[u];
    const s = SES.T ? SES.T.seats.find(x => x.uid === u) : null;
    if (s && s.sub) { s.sub = false; SES.T.resched(); }
  }
  function hostPlayers() {
    if (!SES || SES.mode !== "online" || !SES.T) return;
    const on = SES.on, pl = on.net.players || {};
    for (const s of SES.T.seats) {
      if (s.kind !== "remote") continue;
      if (pl[s.uid]) { if (on.away[s.uid] || s.sub) comeBack(s.uid); continue; }
      if (s.sub || on.away[s.uid]) continue;
      // 잠깐 끊긴 것(새로 고침)일 수 있어 6초 기다렸다가 AI 가 대신 둠
      on.away[s.uid] = setTimeout(() => {
        delete on.away[s.uid];
        if (!SES || !SES.T || (on.net.players || {})[s.uid]) return;
        s.sub = true; SES.T.kick();
      }, 6000);
    }
    pushViews(); render();
  }
  function guestMsg(m) {
    if (!m || !SES || SES.mode !== "online") return;
    if (m.t === "v") {
      if (!UIS[m.id] && !(entryOf(m.id) && !entryOf(m.id).link)) return;                    // 모르는 게임의 판은 그리지 않음
      const newG = m.g !== SES.g || m.id !== SES.id;
      if (UIS[m.id]) { SES.id = m.id; SES.pend = null; }
      else if (entryOf(m.id) && !entryOf(m.id).link) { SES.pend = m.id; ensure(m.id).then(ok => { if (ok && SES && SES.pend === m.id) { SES.id = m.id; SES.pend = null; render(); } }); }   // 방장이 종목을 바꿈 → 불러온 뒤 그림
      SES.g = m.g; SES.me = m.me; SES.V = m.v; SES.wait = false;
      SES.seats = (m.seats || []).map(x => ({ name: x.n, emoji: x.e, kind: x.k, sub: !!x.s, uid: x.u }));
      SES.on.rdy = new Set(m.rd || []); SES.on.pick = {}; (m.pk || []).forEach(u => { SES.on.pick[u] = 1; });
      SES.on.cfg = Object.assign({}, SES.on.cfg, { coach: !!m.coach });
      if (newG) { SES.ranked = 0; SES.memo = {}; SES.resHidden = false; SES.recIn = null; if (window.SVReview && SVReview.active) SVReview.close(true); }
      render();
    } else if (m.t === "rec") {                                  // 🎞️ 방장이 보낸 이 판의 기록 — 모양을 확인하고 이 기기에 저장
      const r0 = m.rec;
      if (!r0 || typeof r0 !== "object" || r0.id !== m.id || !Array.isArray(r0.acts) || r0.acts.length < 1 || r0.acts.length > 4000 || !Array.isArray(r0.seats) || r0.seats.length !== r0.n || !(r0.n >= 1 && r0.n <= 12) || typeof r0.seed !== "number" || typeof r0.fp !== "string" || !r0.fp) return;
      if (!entryOf(r0.id) || entryOf(r0.id).link) return;
      if (!r0.acts.every(e => e && typeof e === "object" && (e.adv === 1 || (Number.isInteger(e.s) && e.s >= 0 && e.s < r0.n && "a" in e)))) return;
      // 방장이 보낸 것을 그대로 쓰지 않고 모양을 다시 만들어 저장 (이름 · 이모지 길이 제한, 모르는 칸은 버림)
      const r = { v: 1, id: r0.id, gv: r0.gv, at: +r0.at || Date.now(), mode: "online", n: r0.n, seed: r0.seed, cfg: r0.cfg && typeof r0.cfg === "object" ? r0.cfg : {},
        seats: r0.seats.map(s => ({ kind: s && s.kind === "ai" ? "ai" : "human", tier: s && TIERS[s.tier] ? s.tier : "", name: String((s && s.name) || "").slice(0, 24), emoji: String((s && s.emoji) || "🙂").slice(0, 8) })),
        me: Number.isInteger(r0.me) && r0.me >= 0 && r0.me < r0.n ? r0.me : -1,
        acts: r0.acts.map(e => e.adv ? { adv: 1 } : { s: e.s, a: e.a, h: e.h ? 1 : 0 }), fp: r0.fp, ranks: Array.isArray(r0.ranks) ? r0.ranks.slice(0, 12) : null };
      SES.recIn = { g: m.g, id: m.id, rec: r };
      if (window.SVReview) SVReview.save(r);
      if (SES.V && SES.V.over) drawResult();
    } else if (m.t === "err") { SES.wait = false; C.toast(m.err || "그렇게는 못 해요", 1600); render(); }
  }
  function guestReady() {
    if (!SES || !SES.on || SES.on.host) return;
    const spec = SES.me < 0;
    SES.on.rdy.add(SES.on.uid); if (spec) SES.on.pick[SES.on.uid] = 1;
    SES.on.net.send({ t: "rdy", g: SES.g, pick: spec }, true);
    drawResult();
  }
  function onlineActs() {
    const on = SES.on, pl = on.net.players || {}, me = on.uid;
    const humans = SES.seats.filter(s => s.kind !== "ai" && s.uid);
    const wait = humans.filter(s => pl[s.uid] && s.uid !== hostUid()).map(s => s.uid);
    const joiners = Object.keys(pl).filter(u => !humans.some(s => s.uid === u) && on.pick[u]);
    const chips = humans.map(s => {
      const nm = esc(s.name);
      if (s.uid === hostUid()) return `<span class="ok">👑 ${nm}</span>`;
      if (!pl[s.uid]) return `<span>🔌 ${nm}</span>`;
      return `<span class="${on.rdy.has(s.uid) ? "ok" : ""}">${on.rdy.has(s.uid) ? "✅" : "⏳"} ${nm}</span>`;
    }).concat(joiners.map(u => `<span class="ok">🙋 ${esc((pl[u] && pl[u].name) || "친구")} (다음 판부터)</span>`));
    if (on.host) {
      const k = wait.filter(u => on.rdy.has(u)).length, all = k === wait.length;
      return `<div class="rdy">${chips.join("")}</div>
        <button class="btn primary big" data-r="next" ${all ? "" : "disabled"}>${all ? "다음 판 시작 ▶" : `다음 판 시작 (준비 ${k}/${wait.length})`}</button>
        <div class="two">${!all ? `<button class="btn" data-r="force">안 기다리고 시작</button>` : ""}${revBtn()}<button class="btn" data-r="lobby">대기실로</button><button class="btn" data-r="peek">👀 판 보기</button></div>`;
    }
    const spec = SES.me < 0, done = on.rdy.has(me) || (spec && on.pick[me]);
    return `<div class="rdy">${chips.join("")}</div>
      <button class="btn primary big" data-r="rdy" ${done ? "disabled" : ""}>${done ? "✅ 준비 완료 · 방장을 기다려요" : spec ? "✋ 다음 판에 낄래요" : "✋ 준비"}</button>
      <div class="two">${revBtn()}<button class="btn" data-r="peek">👀 판 보기</button><button class="btn" data-r="leave">나가기</button></div>`;
  }
  function hostUid() { const n = SES && SES.on && SES.on.net; return (n && n.meta && n.meta.host) || (SES.on.host ? SES.on.uid : (SES.seats[0] && SES.seats[0].uid)); }

  // ── 단추 ──────────────────────────────────────────────────
  function openTutorial(onStartGame) {
    const ui = uiOf(SES ? SES.id : opt.game);
    if (!window.Tutorial || !ui.tutorial) { C.toast("규칙 설명을 불러오지 못했어요"); return; }
    Tutorial.open({ id: "survival-" + (SES ? SES.id : opt.game), title: `${ui.emoji} ${ui.name} 1분 규칙`, steps: ui.tutorial(), startLabel: onStartGame ? "시작" : "", onStart: onStartGame || null });
  }
  $("startBtn").onclick = () => {
    sfx("pop");
    if (opt.tab === "friend") { if (!window.ArenaUI) { C.toast("온라인 모듈을 불러오지 못했어요"); return; } ArenaUI.open(friendOpts()); return; }
    startLocal(opt.tab);
  };
  $("ruleBtn").onclick = () => openTutorial(opt.tab === "friend" ? null : () => startLocal(opt.tab));
  $("ruleBtn2").onclick = () => openTutorial(null);
  $("rankBtn").onclick = () => { if (window.GRank && window.Arena) Arena.init().then(() => GRank.open(SITE)).catch(() => C.toast("랭킹을 불러오지 못했어요")); };
  $("revBtn").onclick = () => { sfx("tap"); if (!window.SVReview) { C.toast("복기를 불러오지 못했어요"); return; } SVReview.openList({ metaOf, onPick: r => openRev(r, false) }); };
  function mstSync() {                                           // 📒 아쉬운 장면: 이 종목 모음의 남은 개수 (없으면 숨김)
    const b = $("mstBtn"); if (!b) return;
    let n = 0; try { n = window.Mistakes ? Mistakes.count("survival") : 0; } catch (e) { n = 0; }
    b.hidden = !n; b.textContent = `📒 아쉬운 장면 ${n}`;
  }
  $("mstBtn").onclick = () => { sfx("tap"); if (window.Mistakes) Mistakes.open({ game: "survival" }); };
  if (window.Mistakes && Mistakes.onChange) Mistakes.onChange(mstSync);
  mstSync();

  // 📒 → 연습 판: 그 장면 바로 앞까지 되감아 놓고, 내 자리에서 다시 두게 함 (판 기록 · 랭킹에는 안 셈)
  async function startDrill(m) {
    const d = m.drill || {}, rec = d.rec;
    if (!rec || !Array.isArray(rec.acts) || !Array.isArray(rec.seats) || !(d.s >= 0 && d.s < rec.seats.length) || !entryOf(rec.id)) { C.toast("이 장면은 열 수 없어요", 2600); return; }
    if (!(await ensure(rec.id))) { C.toast("이 게임을 불러오지 못했어요", 2800); return; }
    endSession();
    SES = newSes(rec.id, "solo"); SES.me = d.s; SES.drill = { id: m.id, s: d.s, alts: Array.isArray(d.alts) ? d.alts : [], bestText: d.bestText || "", done: false };
    const seats = rec.seats.map((s, i) => i === d.s ? { kind: "human", name: myName(), emoji: "🙂" } : { kind: "ai", tier: TIERS[s.tier] ? s.tier : "normal", name: s.name, emoji: s.emoji });
    showPlay();
    try { startTable(seats, rec.cfg || {}, rec.seed, rec.acts); }
    catch (e) { console.warn("[survival drill]", e); endSession(); showHome(); C.toast("게임 규칙이 바뀌어 이 장면은 다시 열 수 없어요", 3200); return; }
    const need = SES.T.needs();
    if (!need.includes(d.s)) C.toast("이 장면의 자리가 달라서 처음 위치에서 시작해요", 2600);
    else C.toast(`🎯 연습 판 — 그 장면이에요. 다시 골라 보세요`, 2800);
  }
  // 연습 판에서 내가 처음 둔 수가 고급 AI 가 골랐던 수(들) 안에 있으면 ✅ (📒 에서 '해냄')
  function drillCheck(a, seat) {
    const D = SES && SES.drill; if (!D || D.done || seat !== D.s) return;
    D.done = true;
    let c = ""; try { c = SVReview.canon(a); } catch (e) {}
    if (D.alts.includes(c)) { try { Mistakes.solved(D.id); } catch (e) {} C.toast("✅ 고급 AI 와 같은 선택이에요! 📒 에서 '해냄'으로 옮겨 뒀어요", 3600); try { sfx("win"); } catch (e) {} }
    else C.toast(`🔸 이번엔 고급 AI 가 고른 쪽이 아니에요${D.bestText ? ` — AI 는 ${D.bestText}` : ""}. 틀린 건 아니에요, 한 번 더 해 볼까요?`, 4200);
  }
  $("againBtn").onclick = () => { if (!SES || SES.mode === "online") return; sfx("tap"); startLocal(SES.mode); };
  C.backGuard($("backBtn"), () => {
    sfx("tap");
    if (SES && SES.mode === "online" && window.ArenaUI && ArenaUI.net) { ArenaUI.leave(); return; }
    endSession(); showHome();
  });
  if (C.sfx && C.sfx.button) C.sfx.button($("sndBtn"));

  // ── 시험 손잡이 ───────────────────────────────────────────
  window.__survival = {
    get ORDER() { return playable().map(e => e.id); },
    get LIST() { return LIST; },
    ready: null,                                               // 목록을 다 불러오고 첫 화면이 그려지면 풀리는 Promise
    ensure,
    get ses() { return SES; },
    get V() { return SES && SES.V; },
    get mode() { return SES ? SES.mode : null; },
    get me() { return curMe(); },
    fast(v = 1) { FAST = v ? 1 : 0; },
    pause(v = true) { PAUSE = !!v; if (!PAUSE && SES && SES.T) SES.T.resched(); },
    // 종목(+탭)을 고름 — 게임 파일을 불러온 뒤 첫 화면을 다시 그림 (Promise<true|false>)
    async pick(id, tab) {
      const e = entryOf(id); if (!e || e.link) return false;
      const ok = await ensure(id); if (!ok) return false;
      opt.game = id; syncNav(); if (tab) opt.tab = tab; drawHome(); return true;
    },
    act: a => act(a),                                          // 내 수 두기 (시험용 — 화면에서 누르는 것과 같은 길)
    canAct() { const me = curMe(); return !!(SES && SES.V && me >= 0 && SES.V.needs && SES.V.needs.includes(me) && !SES.wait && !SES.V.over); },
    autoAct() {
      if (!SES || !SES.V || PAUSE || !window.__survival.canAct()) return false;
      const me = curMe(), V = viewFor(me) || SES.V, ui = uiOf(SES.id), core = CORES[SES.id];
      let a = null;
      try { a = ui.qa ? ui.qa(V, me, Math.random) : core.ai(V, me, "easy", Math.random); } catch (e) { console.error(e); }
      if (a == null) return false;
      return !!act(a).ok;
    },
    fp() { return SES && SES.V ? `${SES.id}|${SES.g}|${SES.V.pub}` : null; },
    round() { return SES ? SES.g : -1; },
    probe() {
      if (!SES) return { fp: "none", over: false, waiting: false, info: "세션 없음" };
      const V = SES.V; if (!V) return { fp: "wait", over: false, waiting: false, info: "연결 중" };
      return { fp: window.__survival.fp(), over: !!V.over && !$("resOv").hidden, waiting: window.__survival.canAct(), info: `${SES.id} ${SES.g}번째 판 · ${uiOf(SES.id).sub ? uiOf(SES.id).sub(V, curMe()) : ""}` };
    },
  };

  // 시작: 목록 읽기 → 처음 보일 게임 정하기 → 첫 화면 (목록 파일이 몇 개 없어도 나머지로 그림)
  window.__survival.ready = loadLists().catch(e => console.error("[survival list]", e)).then(async () => {
    initPick();
    drawHome();
    if (opt.game) await ensure(opt.game);                      // 처음 보일 게임은 미리 불러 둠
    if (SES == null) drawHome();
    const dm = window.Mistakes && Mistakes.fromUrl ? Mistakes.fromUrl("survival") : null;       // 📒 에서 온 연습 판 (?drill=)
    if (dm) await startDrill(dm);
    else if (window.ArenaUI && ArenaUI.checkUrl) ArenaUI.checkUrl(friendOpts());
    mstSync();
    return true;
  });
})();

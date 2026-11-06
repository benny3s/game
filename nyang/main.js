/* 냥도쿠 — 화면·조작·혼자 하기·친구 대결 (친구랑 = common/arena.js + ArenaUI) */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem("nyang." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem("nyang." + k, JSON.stringify(v)); } catch (e) {} } };
  const TIERS = [   // 화면에는 난이도 이름만 (문제 수·번호·판 크기는 안 보여 줌)
    { id: "easy", em: "🐣", label: "초급", name: "🐣 초급", desc: "가볍게 한 판" },
    { id: "normal", em: "🐱", label: "중급", name: "🐱 중급", desc: "조금 생각해 볼까" },
    { id: "hard", em: "🐯", label: "고급", name: "🐯 고급", desc: "집중이 필요해요" },
    { id: "master", em: "👑", label: "고수", name: "👑 고수", desc: "한 번 가정해 봐야 풀려요" },
  ];  const HINTS = [["on", "마음껏"], ["penalty", "쓰면 +10초"], ["off", "금지"]];
  const PENALTY = 10;                                      // 힌트 한 번(단계 하나)마다 대결 기록에 더하는 초
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };
  const toast = (m, ms = 2200) => Cozy.toast(m, ms);
  const now = () => Arena.now();                            // 서버 시계 (카운트다운·기록을 모두 같게)
  let bank = null;
  const bankP = fetch("puzzles.json?v=2").then(r => r.json()).then(b => (window.__nyBank = bank = b));

  // ── 기록 (관리자만 읽음)
  let glog = null;
  const logInit = () => { if (!glog && Arena.db()) glog = GLOG(() => Arena.db(), "nyang"); return glog; };

  // ── 화면 바꾸기
  const show = id => { for (const s of ["home", "play", "bplay"]) if ($(s)) $(s).hidden = s !== id; document.body.classList.toggle("playing", id === "play"); if (id === "play") requestAnimationFrame(() => fitBoard(true)); };
  // 판 크기 = 남은 공간(가로·세로 중 작은 쪽) — 휴대폰에서 위아래가 잘리지 않게
  // 휴대폰 주소창이 나타났다 사라지며 높이가 조금씩 바뀔 때마다 판이 출렁이지 않게: 판이 바뀌었거나, 너비가 바뀌었거나, 높이가 크게(80px+) 바뀔 때만 다시 맞춤
  let fitKey = "", fitW = 0, fitH = 0;
  function fitBoard(force) {
    const w = $("boardwrap"), b = $("board");
    if (!w || $("play").hidden) return;
    const cw = w.clientWidth, ch = w.clientHeight, key = G ? G.n + ":" + G.reg.join("|").length : "";
    if (force !== true && key === fitKey && cw === fitW && Math.abs(ch - fitH) < 80) return;
    fitKey = key; fitW = cw; fitH = ch;
    const s = Math.floor(Math.min(cw, ch, 600));
    b.style.setProperty("--bs", s + "px");
    if (G) b.style.setProperty("--gp", Math.max(2, Math.round(s / G.n * 0.07)) + "px");   // 칸 사이 간격도 판 크기에 맞게
  }
  addEventListener("resize", fitBoard);
  if (window.visualViewport) visualViewport.addEventListener("resize", fitBoard);

  // ── 판 그리기 · 조작 ───────────────────────────────────────
  let G = null;                 // 지금 판 (NY.Game)
  let ctx = null;               // { kind: "solo"|"vs", tier, idx, onEnd }
  let hint = null, hintStage = 0, hintKey = "";
  let autoX = store.get("autoX", false);
  // ✕는 글자 대신 그림으로 (아이폰에서 ✕ 글자가 가늘고 작게 나와서) — 칸 크기에 맞춰 늘 같은 굵기
  const XSVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 2.2L7.8 7.8M7.8 2.2L2.2 7.8"/></svg>';

  function cellsHtml() {
    const n = G.n;
    let h = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = G.reg[r][c], col = NY.COLORS[g % NY.COLORS.length][0];
      h += `<button class="c" data-k="${r * n + c}" style="background:${col}" aria-label="${r + 1}줄 ${c + 1}칸"><span class="x">${XSVG}</span><span class="cat">${skin()}</span></button>`;
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
      // 칸 안의 ✕·🐱는 미리 넣어 두고 보였다 숨겼다만 함 (✕를 끌어 칠할 때 다른 고양이가 다시 그려지며 깜빡이지 않게)
      el.classList.toggle("has-cat", cat);
      el.classList.toggle("has-x", !cat && (x || bad));
      el.classList.toggle("bad", bad);
      el.classList.toggle("look", look.has(k) && !tgt.has(k));
      el.classList.toggle("tgt", tgt.has(k));
    }
    $("fish").innerHTML = Array.from({ length: G.maxMistakes }, (_, i) => `<span class="${i < G.mistakes ? "gone" : ""}">🐟</span>`).join("");
    $("hintBadge").hidden = !G.hints; $("hintBadge").textContent = G.hints;
    // 색 묶음마다 동그라미: 그 묶음에 고양이를 놓으면 채워짐
    const doneReg = new Set([...G.cats].map(k => G.regionOf(k)));
    const left = G.n - G.cats.size;
    const face = on => mood === "sad" ? "😿" : G.won ? "😻" : on ? (left <= 2 ? "😸" : "😺") : "🐱";
    $("catStrip").innerHTML = Array.from({ length: G.n }, (_, g) => `<i class="${doneReg.has(g) ? "on" : ""}${mood === "sad" ? " sad" : ""}" style="background:${NY.COLORS[g % NY.COLORS.length][0]}"><span>${face(doneReg.has(g))}</span></i>`).join("");
  }
  const stateKey = () => [...G.cats].join(",") + "|" + [...G.xs].sort().join(",") + "|" + [...G.bad].join(",");

  const S = (name, opt) => window.NYSND && NYSND.play(name, opt);
  // 손맛: 실수 없이 8초 안에 연달아 찾으면 콤보(소리가 한 음씩 높아짐), 찾은 묶음이 반짝·고양이가 폴짝, 다 찾으면 고양이 춤 + 색종이
  let combo = 0, lastOkAt = 0, mood = null, moodT = null;
  function setMood(m, ms) { mood = m; clearTimeout(moodT); if (G) paint(); moodT = setTimeout(() => { mood = null; if (G) paint(); }, ms); }
  function bump(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function flashRegion(k) {
    const g = G.regionOf(k);
    for (const el of $("board").children) if (G.regionOf(+el.dataset.k) === g) bump(el, "flash");
    bump($("board").children[k], "hop");
  }
  function comboPop(text) { const d = $("comboPop"); d.textContent = text; d.hidden = false; bump(d, "go"); clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, 1100); }
  function celebrate() {
    [...G.cats].forEach((k, i) => setTimeout(() => { const el = $("board").children[k]; if (el) bump(el, "hop"); }, 80 + i * 90));
    const box = document.createElement("div"); box.className = "confetti-box";
    const cols = ["#ff9a7a", "#7cc9b4", "#f5b942", "#c7b0ee", "#a7c7f2", "#f4a6a6"];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("i");
      c.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-duration:${1.4 + Math.random() * 1.2}s;animation-delay:${Math.random() * .3}s;--dx:${(Math.random() - .5) * 160}px;--rot:${Math.random() * 720 - 360}deg`;
      box.appendChild(c);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3000);
  }
  function afterMove(res, k) {
    if (res === "ok" || res === "win") {
      const now = performance.now(); combo = now - lastOkAt < 8000 ? combo + 1 : 1; lastOkAt = now;
      flashRegion(k);
      if (combo >= 3 && res === "ok") comboPop(`🔥 ${combo}콤보!`);
    }
    if (res === "miss" || res === "fail") { combo = 0; setMood("sad", 1300); }
    if (res === "ok") S("cat", { combo });
    else if (res === "miss" || res === "fail") S(res);
    else if (res === "win") S(ctx.kind === "vs" || ctx.ta ? "start" : "win");   // 대결·타임어택은 끝낸 순간은 짧게 (팡파레는 결과 때)
    if (hint && stateKey() !== hintKey) closeHint();
    if (res === "miss" || res === "fail") { const el = $("board").children[k]; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); if (navigator.vibrate) navigator.vibrate(60); }
    paint(); progress();
    // 춤·색종이를 잠깐 보고 결과창. 그 사이 ‹ 로 나가거나 처음부터 눌러 판이 바뀌었으면(G 가 달라짐) 옛 판의 끝 처리는 건너뜀 (안 그러면 G 가 null 이라 G.secs 에서 오류 — QA 가 찾음)
    if (res === "win") { celebrate(); const g0 = G, c0 = ctx; setTimeout(() => { if (G === g0) c0.onEnd(true); }, ctx.ta ? 450 : 1150); }
    if (res === "fail") { const g0 = G, c0 = ctx; setTimeout(() => { if (G === g0) c0.onEnd(false); }, 350); }
  }
  // 누르기: 한 번 = ✕ 켜고 끔, 0.4초 안에 같은 칸 두 번 = 🐱 (앱과 같게). 누른 채 끌면 같은 방향으로 ✕ 칠하기
  let lastTap = { k: -1, t: 0 }, drag = null;
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest("#board .c"); };
  $("board").addEventListener("pointerdown", e => {
    if (!G || G.over || (ctx && ctx.spec)) return;
    const el = cellAt(e.clientX, e.clientY); if (!el) return;
    e.preventDefault();
    const k = +el.dataset.k, t = performance.now();
    if (lastTap.k === k && t - lastTap.t < 400) {                            // 두 번 → 앞에서 바꾼 ✕를 되돌리고 고양이
      const prevX = lastTap.prevX;
      lastTap = { k: -1, t: 0 }; drag = null;
      if (G.xs.has(k) !== prevX) G.toggleX(k);
      afterMove(G.place(k), k); return;
    }
    const prevX = G.xs.has(k);
    if (G.toggleX(k)) S(G.xs.has(k) ? "x" : "unx");
    lastTap = { k, t, prevX };
    drag = { on: G.xs.has(k), seen: new Set([k]) };
    afterMove("x", k);
  });
  window.addEventListener("pointermove", e => {
    if (!drag || !G || G.over) return;
    const el = cellAt(e.clientX, e.clientY); if (!el) return;
    const k = +el.dataset.k; if (drag.seen.has(k)) return;
    drag.seen.add(k); lastTap = { k: -1, t: 0 };
    const was = G.xs.has(k); G.setX(k, drag.on); if (G.xs.has(k) !== was) S(drag.on ? "x" : "unx");
    afterMove("x", k);
  });
  window.addEventListener("pointerup", () => { drag = null; });
  // 아이폰: 칸을 두 번 누르는 것이 화면 확대로 먹히지 않게 (판은 pointerdown 으로 받으니 click 은 안 씀)
  $("board").addEventListener("touchend", e => e.preventDefault(), { passive: false });

  function setAutoX(v) { autoX = v; store.set("autoX", v); $("autoX").setAttribute("aria-pressed", v); if (G) G.autoX = v; }
  $("autoX").onclick = () => setAutoX(!autoX);
  const drawSnd = () => { const on = !window.NYSND || NYSND.on; $("sndBtn").innerHTML = `<span class="ic">${on ? "🔊" : "🔇"}</span><span>소리 ${on ? "켬" : "끔"}</span>`; };
  $("sndBtn").onclick = () => { if (window.NYSND) NYSND.set(!NYSND.on); drawSnd(); };
  drawSnd();
  $("clearX").onclick = () => { if (!G || G.over) return; G.xs.clear(); closeHint(); paint(); progress(); };

  // ── 단계별 힌트: 1) 어디를 볼지 반짝 2) 이유 + 바꿀 칸 표시 3) 적용
  // 힌트 창은 아래 단추 줄 자리에 뜸 → 열고 닫을 때·글이 길어질 때 판 크기를 다시 맞춤
  function hintLayout(open) { $("hintBox").hidden = !open; $("dock").hidden = open; requestAnimationFrame(() => fitBoard(true)); }
  function closeHint() { const was = !$("hintBox").hidden; hint = null; hintStage = 0; if (was) hintLayout(false); if (G) paint(); }
  function useHint() {
    G.hints++;
    if (ctx.ta && ctx.hintRule === "penalty") { ctx.ta.endAt -= PENALTY * 1000; toast(`⏱ 힌트 -${PENALTY}초`, 1200); }   // 타임어택: 힌트 한 단계마다 내 남은 시간 -10초
    progress();
  }
  $("hintBtn").onclick = () => {
    if (!G || G.over) return;
    if (ctx.hintRule === "off") { toast("이 방은 힌트 금지예요"); return; }
    if (hint && stateKey() === hintKey) { if (hintStage === 1) $("hintMore").click(); return; }
    hint = NY.nextHint(G); hintKey = stateKey();
    if (!hint) { toast("지금은 줄 힌트가 없어요"); return; }
    hintStage = 1; useHint(); S("hint");
    $("hintText").textContent = hint.kind === "wrongX" ? "반짝이는 칸을 다시 보세요. 뭔가 이상해요." : hint.kind === "clean" ? "반짝이는 고양이 주변을 보세요. 정리할 칸이 남았어요." : "반짝이는 곳을 보세요. 여기서 알 수 있는 게 있어요.";
    $("hintMore").hidden = false; $("hintApply").hidden = true; hintLayout(true);
    paint();
  };
  $("hintMore").onclick = () => {
    if (!hint) return;
    hintStage = 2; useHint();
    $("hintText").textContent = hint.why; hintLayout(true);                 // 이유 글이 길면 판을 조금 더 줄임
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
  const fmtS = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function startTimer(from) {
    clearInterval(timerT);
    timerT = setInterval(() => {
      if (!G || !ctx) return;
      if (ctx.ta) {                                                          // 타임어택: 남은 시간 (10초 아래면 빨갛게)
        const ta = ctx.ta, left = (ta.endAt - ta.clock()) / 1000;
        $("timer").textContent = "⏱ " + fmtS(left); $("timer").classList.toggle("hurry", left < 10 && !ta.over);
        if (left <= 0 && !ta.over) endTA(ta);
        return;
      }
      $("timer").classList.remove("hurry");
      const s = from ? (now() - from) / 1000 : G.secs;
      $("timer").textContent = fmt(G.over ? (ctx.finalSecs ?? s) : s);
    }, 100);
  }

  // ── 판 시작 (혼자·대결 공통)
  function startPuzzle(p, c) {
    ctx = c; closeHint(); $("resPeek").hidden = true;
    $("spyBox").hidden = true; spyU = null;
    $("chatBtn").hidden = c.kind !== "vs";
    TA = c.ta || null; combo = 0; lastOkAt = 0; mood = null;
    G = new NY.Game(p, { autoX });
    if (c.coop) { G.maxMistakes = COOP_FISH; myOps = {}; coopLast = ""; coopInfo = null; }
    drawBoard(); show("play"); fitKey = "";
    $("stLabel").textContent = c.label;
    $("hintBtn").disabled = c.hintRule === "off";
    $("restart").hidden = c.kind === "vs" || !!c.ta;
    $("opp").hidden = c.kind !== "vs";
    startTimer(c.startAt);
    if (c.kind === "vs") restoreMine();                                      // 다시 들어온 사람: 빈 판을 올리기 전에 내 진행부터 되살림
    progress();
    if (c.kind === "solo" && !c.ta) S("start");                              // 대결은 카운트다운, 타임어택은 처음 한 번만
  }

  // ══ 타임어택: 정해진 시간 동안 몇 판 푸나. 다 풀거나 물고기를 다 잃으면 바로 다음 문제 ══
  // TA = { kind, tier, endAt, clock, solved, failed, i(몇 번째 문제), seq(대결: 모두 같은 순서), hintRule, over }
  let TA = null;
  const TA_SOLO_MIN = 3;
  function nextTA() {
    const ta = TA; if (!ta || ta.over) return;
    const T = TIERS.find(t => t.id === ta.tier), list = bank[ta.tier];
    const idx = ta.kind === "vs" ? ta.seq[ta.i % ta.seq.length] : pickRandom(ta.tier);
    ta.pi = ta.i;                                                            // 관전하는 친구가 같은 문제를 그리도록
    const label = () => `⏱ ${T.label} · ${ta.solved}개`;
    startPuzzle(NY.variant(list[idx], ta.kind === "vs" ? (ta.vs || 0) + ta.i + 1 : NY.rseed()), {   // 대결은 모두 같은 모양
      kind: ta.kind, tier: ta.tier, idx, ta, hintRule: ta.hintRule, label: label(),
      onProgress: ta.kind === "vs" ? sendProg : null,
      onEnd(won) {
        if (ta.over) return;
        if (won) ta.solved++; else ta.failed++;
        $("stLabel").textContent = label();
        if (ta.kind === "vs") sendProg();
        ta.i++;                                                              // 다음 문제 (대결은 모두 같은 순서)
        if (won) toast(`🐱 ${ta.solved}개째!`, 900);
        setTimeout(() => { if (TA === ta && !ta.over) nextTA(); }, won ? 600 : 1000);
      },
    });
  }
  // ── 공용 랭킹 내 기록 (rank/nyang · common/rank.js) — 판·승·패·승점 숫자는 전부 여기서 (11-01 베니 님: 기록은 메인 한 곳)
  //   푼 문제 = 혼자(AI) 판 이긴 수 · 대결 = 친구 판. nyang/rec 는 시간·타임어택·단계 별·배지 같은 퍼즐 기록만 (판 수 숫자는 안 보여 줌)
  let gm = null;
  const solvedN = () => (gm && gm.a && gm.a.w) || 0;
  async function loadGM() {
    if (!window.GRank) return gm = null;
    try { await Arena.init(); gm = await GRank.mine("nyang"); } catch (e) { gm = null; }
    return gm;
  }
  addEventListener("grank", e => {
    if (e.detail && e.detail.game && e.detail.game !== "nyang") return;
    loadGM().then(() => {
      const c = document.getElementById("cheerLn"); if (c) c.innerHTML = cheerHtml();
      drawMe(); drawSoloProg(); checkBadges();
    });
  });
  // 결과창 격려 한 줄: "🧩 24판째! 😺 길냥이까지 6판" (칭호가 바뀌면 축하)
  // 판 수는 공용 랭킹(rank/nyang) 숫자 — 방금 끝난 혼자 판은 랭킹에 올라간 뒤('grank' 알림) 채움 (wait)
  function cheerHtml() {
    const sv = solvedN(); if (!sv) return "";
    const lv = level(sv), nx = LEVELS.find(l => l[0] > sv);
    const up = lv[0] === sv && sv > 0;
    return `${up ? `🎉 새 칭호! ${lv[1]} <b>${lv[2]}</b>` : `🧩 ${sv}판째!`}${nx ? ` · ${nx[1]} ${nx[2]}까지 ${nx[0] - sv}판` : ""}`;
  }
  const cheerLine = wait => `<p class="cheer" id="cheerLn">${wait ? "" : cheerHtml()}</p>`;
  function playTA(tier) {
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: "ta", tier, mins: TA_SOLO_MIN }); }).catch(() => {});
    TA = { kind: "solo", tier, endAt: Date.now() + TA_SOLO_MIN * 60000, clock: () => Date.now(), solved: 0, failed: 0, i: 0, hintRule: "penalty", over: false };
    S("start"); nextTA();
  }
  function endTA(ta) {
    if (ta.over) return;
    ta.over = true;
    if (G) { G.over = true; closeHint(); paint(); }
    S("go");
    if (ta.kind === "solo") {
      const bs = store.get("taBest", {}), best = ta.solved > (bs[ta.tier] || 0);
      if (best) { bs[ta.tier] = ta.solved; store.set("taBest", bs); }
      if (glog) glog.matchEnd({ mode: "ta", solved: ta.solved, failed: ta.failed });
      REC.ta(ta.tier, TA_SOLO_MIN, ta.solved); REC.solved(ta.solved); setTimeout(checkBadges, 1200);
      result("⏱ 시간 끝!", `<p class="round big-num">${ta.solved}개</p><p class="small" style="margin:0">${TA_SOLO_MIN}분 동안 푼 문제${ta.failed ? ` · 실패 ${ta.failed}` : ""}${best && ta.solved ? " · <b style='color:var(--good)'>최고 기록!</b>" : bs[ta.tier] ? ` · 최고 ${bs[ta.tier]}개` : ""}</p>${cheerLine()}`,
        [["한 번 더", () => playTA(ta.tier), "primary"], ["난이도 고르기", goHome]]);
    } else { sendProg(); toast("⏱ 시간 끝! 다른 사람을 기다리는 중…", 3000); checkRoundEnd(); }
  }
  function progress() { if (ctx && ctx.onProgress) ctx.onProgress(); }

  // ══ 별 3개: 실수 0 · 힌트 0 · 목표 시간 안 — 하나씩 빠질 때마다 별 하나 (다 풀면 최소 1개) ══
  const parSecs = g => Math.round(g.n * g.n * (g.tech >= 3 ? 1.5 : 1.0));
  const starsOf = (g, secs) => Math.max(1, 3 - (g.mistakes ? 1 : 0) - (g.hints ? 1 : 0) - (secs > parSecs(g) ? 1 : 0));
  // ⏱ 내 기준선 (11-06 벤치마킹: NYT Mini · LinkedIn '내 평균' — 하루 수십 판 하는 지민 님은 판마다 비교가 생김): 난이도별 최근 30판 평균 · 오늘 몇 판째
  function baseline(tier, secs) {
    const all = store.get("avg", {}), a = Array.isArray(all[tier]) ? all[tier] : [], prev = a.length >= 3 ? a.reduce((x, y) => x + y, 0) / a.length : null;
    all[tier] = [...a, Math.round(secs * 10) / 10].slice(-30); store.set("avg", all);
    const day = kstDay(), td = store.get("today", {}), n = (td[day] || 0) + 1; store.set("today", { [day]: n });
    return { prev, n };
  }
  function baseLine(b, secs, T) {
    const d = b.prev == null ? 0 : b.prev - secs;
    const avg = b.prev == null ? "" : `${T.label} 평균 ${fmt(b.prev)}`;
    const vs = b.prev == null ? "" : Math.abs(d) < 0.5 ? `⏱ 딱 평소만큼 (${avg})` : d > 0 ? `⏱ 평소(${avg})보다 <b style="color:var(--good)">${d.toFixed(1)}초 빨라요</b>` : `⏱ 평소(${avg})보다 ${(-d).toFixed(1)}초 느려요`;
    return `<p class="small baseln" style="margin:0">${vs}${vs ? " · " : ""}오늘 ${b.n}판째</p>`;
  }
  const starWhy = (g, secs) => [g.mistakes ? `실수 ${g.mistakes}번` : "실수 0 ✓", g.hints ? `힌트 ${g.hints}번` : "힌트 0 ✓", secs > parSecs(g) ? `목표 ${fmt(parSecs(g))} 넘음` : `목표 ${fmt(parSecs(g))} 안 ✓`].join(" · ");

  // ══ 단계 지도: 1단계부터 차례로 (1~20 초급 · 21~50 중급 · 51~90 고급 · 91~ 고수). 단계마다 정해진 문제·모양이라 친구랑 같은 단계면 같은 판 ══
  const stageTier = k => k <= 20 ? "easy" : k <= 50 ? "normal" : k <= 90 ? "hard" : "master";
  const stageBase = { easy: 0, normal: 20, hard: 50, master: 90 };
  function stageInfo(k) { const tier = stageTier(k), list = bank[tier], j = k - stageBase[tier] - 1; return { tier, idx: (j * 7919 + 101) % list.length, vs: k * 7919 + 13 }; }
  const SKINS = [[0, "🐱"], [10, "🐈"], [20, "🐈‍⬛"], [35, "😺"], [50, "🐯"], [70, "🦁"], [90, "🐆"], [120, "😻"]];
  const localStars = () => store.get("stageStars", {});
  function stageStars() {                                                    // 폰에 저장 + 서버 기록 중 높은 쪽
    const m = myRec(), loc = localStars(), out = { ...loc };
    if (m && m.st) for (const [k0, v] of Object.entries(m.st)) { const k = String(k0).replace(/^s/, ""); if (v) out[k] = Math.max(out[k] || 0, v); }   // 서버 키는 s1, s2 … (숫자 키는 배열이 돼서)
    return out;
  }
  const maxStage = () => Math.max(0, ...Object.keys(stageStars()).map(Number));
  const skin = () => { const sk = store.get("skin", "🐱"), ok = SKINS.filter(x => x[0] <= maxStage()).map(x => x[1]); return ok.includes(sk) ? sk : "🐱"; };
  function playStage(k) {
    if (k > maxStage() + 1) { toast("앞 단계를 먼저 깨 주세요"); return; }
    const s = stageInfo(k); playSolo(s.tier, s.idx, s.vs, k);
  }
  function drawStages() {
    const st = stageStars(), top = maxStage(), cur = top + 1;
    const from = Math.max(1, cur - 5), to = cur + 6;
    let h = `<div class="stage-path" id="stagePath">`;
    for (let k = to; k >= from; k--) {                                       // 위가 앞으로 갈 길 (아래에서 위로 올라감)
      const s = st[k] || 0, lock = k > cur, side = ["l", "c", "r", "c"][k % 4];
      const mark = k === stageBase[stageTier(k)] + 1 && k > 1 ? `<div class="stage-mark">${TIERS.find(t => t.id === stageTier(k)).name} 시작!</div>` : "";
      const gift = SKINS.find(x => x[0] === k);
      h += `<div class="stage-row ${side}"><button class="stg ${lock ? "lock" : ""} ${k === cur ? "cur" : ""} ${s && k !== cur ? "done" : ""}" data-k="${k}"${lock ? " disabled" : ""}>${lock ? "🔒" : k}${gift ? `<i class="gift">${k <= top ? gift[1] : "🎁"}</i>` : ""}</button><span class="st">${s ? "⭐".repeat(s) + "☆".repeat(3 - s) : ""}</span></div>${mark}`;
    }
    h += `</div>`;
    const ok = SKINS.filter(x => x[0] <= top), next = SKINS.find(x => x[0] > top);
    h += `<div class="skins"><span class="small">내 고양이</span>${ok.map(x => `<button class="${skin() === x[1] ? "on" : ""}" data-sk="${x[1]}">${x[1]}</button>`).join("")}${next ? `<span class="small">🎁 ${next[0]}단계에 새 고양이</span>` : ""}</div>`;
    const total = Object.values(st).reduce((a, b) => a + b, 0);
    h += `<p class="small" style="margin:0;text-align:center">모은 별 ⭐ ${total}개 · 별 3개 = 실수 0 · 힌트 0 · 목표 시간 안</p>`;
    $("stageBox").innerHTML = h;
    for (const b of $("stageBox").querySelectorAll(".stg")) b.onclick = () => playStage(+b.dataset.k);
    const path = $("stagePath"), curEl = path.querySelector(".cur");            // 지금 단계가 보이게 (길은 안에서만 굴림)
    if (curEl) path.scrollTop = curEl.offsetTop - (path.clientHeight - curEl.offsetHeight) / 2;
    for (const b of $("stageBox").querySelectorAll("[data-sk]")) b.onclick = () => { store.set("skin", b.dataset.sk); drawStages(); };
  }

  // ══ 📅 오늘의 퍼즐 (11-06 — LinkedIn Queens · NYT 처럼 하루 한 판): 모두 같은 판, 월(쉬움) → 일(고수) 로 어려워짐 ══
  //   기록 = nyang/rec/{pid}/day/{YYYY-MM-DD} {s 초, m 실수, h 힌트, k 몇 번째 만에} — 그날 처음 성공한 판만 (다시 풀어도 안 바뀜)
  //   가족 오늘 기록(같은 판이라 시간을 바로 비교, 힌트 한 번 = +10초) · 🔥 연속 일수 · 이번 주 칸 · 자랑 글. 하루는 한국 시각 0시에 바뀜
  const DAY_TIER = ["master", "easy", "easy", "normal", "normal", "hard", "hard"];   // 일 월 화 수 목 금 토
  const WD = "일월화수목금토";
  const kstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
  const dayShift = (key, d) => new Date(Date.parse(key + "T00:00:00Z") + d * 86400e3).toISOString().slice(0, 10);
  const dayMD = key => `${+key.slice(5, 7)}/${+key.slice(8)}`;
  function dailyInfo(key = kstDay()) {
    const n = Math.round(Date.parse(key + "T00:00:00Z") / 86400e3), wd = new Date(key + "T00:00:00Z").getUTCDay(), tier = DAY_TIER[wd];
    let h = Math.imul(n + 977, 2654435761) >>> 0; h = (h ^ (h >>> 15)) >>> 0;
    return { key, wd, tier, idx: h % bank[tier].length, vs: ((n * 7919 + 4099) >>> 0) || 1, bseed: (Math.imul(n + 31337, 2246822519) >>> 0) || 1 };   // bseed = 🌗 오늘의 반반
  }
  const dayVal = v => v.s + (v.h || 0) * PENALTY;
  function myDays() {                                                       // 폰에 저장 + 서버 기록 (둘 중 있는 것)
    const out = { ...store.get("day", {}) }, m = myRec();
    if (m && m.day) for (const [k, v] of Object.entries(m.day)) if (v && v.s && !out[k]) out[k] = v;
    return out;
  }
  function streakOf(days, today = kstDay()) {                               // 오늘(아직이면 어제)까지 이어진 날 수
    let k = days[today] ? today : dayShift(today, -1), n = 0;
    while (days[k]) { n++; k = dayShift(k, -1); }
    return n;
  }
  function bestStreak(days) {
    let best = 0, run = 0, prev = null;
    for (const k of Object.keys(days).sort()) { run = prev && dayShift(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
    return best;
  }
  function dayBoard(key, f = "day") {                                       // 그날 푼 사람들 (빠른 순) · f = day 냥도쿠 · bday 🌗 반반
    const R = (rkData && rkData.rec) || {}, N = (rkData && rkData.names) || {}, me = GME.me && GME.me.pid;
    const rows = Object.entries(R).map(([pid, r]) => ({ pid, name: N[pid] || "?", v: r && r[f] && r[f][key] })).filter(x => x.v && x.v.s);
    const mine = store.get(f, {})[key];
    if (mine && !rows.some(x => x.pid === (me || "me"))) rows.push({ pid: me || "me", name: myName() || "나", v: mine });   // 서버에 아직 안 올라간 내 기록
    return rows.sort((a, b) => dayVal(a.v) - dayVal(b.v));
  }
  function dayTops() {                                                      // 가족 1등 한 날 수 (둘 이상 푼 날만)
    const R = (rkData && rkData.rec) || {}, me = GME.me && GME.me.pid; if (!me) return 0;
    const keys = new Set(); for (const r of Object.values(R)) for (const k of Object.keys((r && r.day) || {})) keys.add(k);
    let n = 0; for (const k of keys) { const b = dayBoard(k); if (b.length >= 2 && b[0].pid === me) n++; }
    return n;
  }
  const MEDAL = ["🥇", "🥈", "🥉"];
  const boardHtml = (board, n = 5) => board.length ? `<ol class="dc-board">${board.slice(0, n).map((x, i) => `<li class="${x.pid === ((GME.me && GME.me.pid) || "me") ? "me" : ""}"><span class="md">${MEDAL[i] || i + 1}</span><b>${esc(x.name)}</b><span class="tm">${fmt(dayVal(x.v))}</span></li>`).join("")}</ol>` : "";
  function drawDay() {
    const box = $("dayBox"); if (!box || !bank) return;
    const d = dailyInfo(), T = TIERS.find(t => t.id === d.tier), days = myDays(), mine = days[d.key], st = streakOf(days);
    const mon = dayShift(d.key, -((d.wd + 6) % 7));
    const wk = [...Array(7).keys()].map(i => { const k = dayShift(mon, i); return { k, w: WD[(i + 1) % 7], on: !!days[k], today: k === d.key, fut: k > d.key }; });
    const board = dayBoard(d.key);
    box.innerHTML = `<div class="daycard${mine ? " done" : ""}">
      <div class="dc-top"><b>📅 오늘의 퍼즐</b><span class="small">${dayMD(d.key)} ${WD[d.wd]}요일 · ${T.em} ${T.label}</span>${st ? `<span class="dc-fire">🔥 ${st}일 연속</span>` : ""}</div>
      <div class="dc-week">${wk.map(x => `<span class="${x.on ? "on" : ""}${x.today ? " today" : ""}${x.fut ? " fut" : ""}"><i>${x.w}</i><em>${x.on ? "🐱" : x.fut ? "" : "·"}</em></span>`).join("")}</div>
      ${mine ? `<p class="dc-mine">✅ 오늘 <b>${fmt(mine.s)}</b> · 실수 ${mine.m || 0} · 힌트 ${mine.h || 0}${mine.k > 1 ? ` · ${mine.k}번째 만에` : ""}</p>` : `<p class="small dc-sub">모두 같은 판 · 가족끼리 오늘 시간 겨루기 (힌트 한 번 = +${PENALTY}초)</p>`}
      ${boardHtml(board) || `<p class="small dc-sub">아직 아무도 안 풀었어요 — 첫 번째가 돼 보세요!</p>`}
      ${mine ? `<div class="dc-foot"><span class="small">다시 풀어도 오늘 기록은 그대로 · 내일 0시에 새 판</span><button class="btn mint" id="dayShare">📤 자랑</button></div>` : ""}
    </div>${bbDayHtml(d)}`;
    const sb = $("dayShare"); if (sb) sb.onclick = () => shareDay(d, mine, st, board);
    const bb = $("dayBB"); if (bb) bb.onclick = () => playBB(d.tier, d);
  }
  // 🌗 오늘의 반반: 같은 요일 난이도 · 모두 같은 판 · 가족 기록 (냥도쿠 오늘의 퍼즐 아래 작은 카드)
  function myBDays() { const out = { ...store.get("bday", {}) }, m = myRec(); if (m && m.bday) for (const [k, v] of Object.entries(m.bday)) if (v && v.s && !out[k]) out[k] = v; return out; }
  function bbDayHtml(d) {
    if (!window.NYB) return "";
    const L = NYB.LEVELS[d.tier], mine = myBDays()[d.key], board = dayBoard(d.key, "bday");
    return `<div class="daycard bbcard${mine ? " done" : ""}">
      <div class="dc-top"><b>🌗 오늘의 반반</b><span class="small">${L.N}×${L.N} · 🐈 치즈냥 🐈‍⬛ 까망냥</span>${mine ? `<span class="dc-fire" style="color:var(--good)">✅ ${fmt(mine.s)}</span>` : ""}</div>
      ${boardHtml(board, 3)}
      <button class="btn${mine ? "" : " mint"}" id="dayBB" type="button">${mine ? "다시 풀기 (기록은 그대로)" : "🌗 반반 풀기"}</button>
    </div>`;
  }
  function playDaily() {
    const d = dailyInfo(), tries = store.get("dayTry", {});
    tries[d.key] = (tries[d.key] || 0) + 1;
    store.set("dayTry", Object.fromEntries(Object.entries(tries).filter(([k]) => k >= dayShift(d.key, -7))));
    playSolo(d.tier, d.idx, d.vs, null, d);
  }
  function shareDay(d, v, st, board) {
    const me = (GME.me && GME.me.pid) || "me", rk = board.findIndex(x => x.pid === me);
    shareText(`🐱 냥도쿠 오늘의 퍼즐 ${dayMD(d.key)}(${WD[d.wd]}) ⏱ ${fmt(v.s)} · 실수 ${v.m || 0}${st > 1 ? ` · 🔥 ${st}일 연속` : ""}${board.length > 1 && rk >= 0 ? ` · 가족 ${rk + 1}등` : ""}`);
  }

  // ══ 도전 과제 배지 ══
  const ACHS = [
    ["first", "🐾", "첫 판", "아무 판이나 하나 깨기", s => s.sv >= 1],
    ["sv10", "🧩", "10판", "10판 깨기", s => s.sv >= 10],
    ["sv50", "🎖", "50판", "50판 깨기", s => s.sv >= 50],
    ["sv100", "🏅", "100판", "100판 깨기", s => s.sv >= 100],
    ["nh3", "🧠", "혼자 힘으로", "힌트 없이 중급 이상 3판", s => s.nhNormal >= 3],
    ["perf", "✨", "완벽", "실수 없이 고급 이상 1판", s => s.perfHard >= 1],
    ["star10", "⭐", "별 수집가", "별 3개 10번", s => s.star3 >= 10],
    ["ta10", "⏱", "번개손", "타임어택 한 번에 10개", s => s.taMax >= 10],
    ["vs1", "🏆", "첫 승", "대결에서 이기기", s => s.wins >= 1],
    ["coop", "🤝", "단짝", "협동 성공", s => s.coopWin >= 1],
    ["st10", "🗺", "모험 시작", "10단계 깨기", s => s.stage >= 10],
    ["st30", "🧭", "탐험가", "30단계 깨기", s => s.stage >= 30],
    ["st100", "👑", "냥도쿠 정복", "100단계 깨기", s => s.stage >= 100],
    ["day1", "📅", "오늘의 퍼즐", "오늘의 퍼즐 처음 풀기", s => s.days >= 1],
    ["day7", "🔥", "일주일 개근", "오늘의 퍼즐 7일 연속", s => s.dayRun >= 7],
    ["dayTop", "🥇", "오늘의 1등", "오늘의 퍼즐 가족 1등 (2명 이상 푼 날)", s => s.dayTop >= 1],
    ["bb1", "🌗", "반반 입문", "치즈냥·까망냥 반반 처음 깨기", s => s.bb >= 1],
  ];
  function myStats() {
    const m = myRec() || {}, c = m.cnt || {}, days = myDays();
    return { sv: solvedN(), wins: (gm && gm.f && gm.f.w) || 0, nhNormal: c.nhNormal || 0, perfHard: c.perfHard || 0, star3: c.star3 || 0, coopWin: c.coopWin || 0,
      taMax: Math.max(0, ...Object.values(m.ta || {})), stage: maxStage(), days: Object.keys(days).length, dayRun: bestStreak(days), dayTop: dayTops(), bb: c.bb || 0 };
  }
  function checkBadges() {
    const m = myRec(); if (!m) return;
    const have = m.ach || {}, s = myStats(), got = ACHS.filter(a => !have[a[0]] && a[4](s));
    if (!got.length) return;
    m.ach = { ...have }; for (const a of got) { m.ach[a[0]] = Date.now(); REC.ach(a[0]); }
    S("badge");
    got.forEach((a, i) => setTimeout(() => toast(`🏅 배지: ${a[1]} ${a[2]}!`, 2600), i * 1400));
    drawSoloProg();
  }
  function showBadges() {
    const have = (myRec() || {}).ach || {};
    result(`🏅 배지 ${Object.keys(have).length}/${ACHS.length}`, `<div class="badges">${ACHS.map(a => `<div class="${have[a[0]] ? "on" : ""}"><span>${have[a[0]] ? a[1] : "🔒"}</span><b>${a[2]}</b><i>${a[3]}</i></div>`).join("")}</div>`, [["닫기", () => {}, "primary"]]);
  }

  // ══ 혼자 하기: 난이도만 고르면 그 난이도 문제 중 랜덤 (안 푼 문제 먼저, 최근 10판은 피함) ══
  const solved = () => store.get("solved", {});                // { tier: [푼 문제 번호들] }
  const bests = () => store.get("bestT", {});                  // { tier: 가장 빠른 초 }
  let soloMode = store.get("soloMode2", "map");                 // map = 단계 지도 · one = 한 판 · ta = 타임어택
  let soloTier = store.get("soloTier", "easy");                 // 한 판·타임어택에서 고른 난이도
  // 혼자 화면 맨 위: 몇 판 깼는지 · 다음 칭호까지 · 친구 중 몇 등 · 자랑하기
  async function drawSoloProg(force) {
    const el = $("soloProg");
    if (!myName()) {
      el.innerHTML = '<button class="pc-name" id="pcName">👤 이름을 정하면 몇 판 깼는지 쌓여요</button>';
      $("pcName").onclick = () => { const db = Arena.db(); if (db) GME.ensure(db).then(() => drawSoloProg(true)).catch(() => {}); };
      return;
    }
    await Promise.all([loadRec(force).catch(() => {}), loadGM()]);                  // 퍼즐 기록(배지·단계)을 못 읽어도 공용 랭킹 숫자는 보여 줌
    const sv = solvedN(), lv = level(sv), nx = LEVELS.find(l => l[0] > sv);       // 판 수 = 공용 랭킹 (친구와 비교는 🏆 랭킹 탭)
    const pct = nx ? Math.round((sv - lv[0]) / (nx[0] - lv[0]) * 100) : 100;
    const cheer = !sv ? "첫 판을 깨 보세요!" : "";
    el.innerHTML = `<div class="pc-top"><span class="lv">${lv[1]}</span><div class="pc-mid"><b class="round">${sv}판 깼어요</b><span class="small">${lv[2]}${nx ? ` · ${nx[1]} ${nx[2]}까지 ${nx[0] - sv}판` : " · 최고 칭호!"}</span></div><button class="btn mint" id="shareBtn">📤 자랑</button></div>
      <div class="pc-bar"><i style="width:${pct}%"></i></div>${cheer ? `<div class="small pc-cheer">${cheer}</div>` : ""}
      <button class="pc-badges" id="badgeBtn">🏅 배지 ${Object.keys((myRec() || {}).ach || {}).length}/${ACHS.length} <span>${ACHS.filter(a => ((myRec() || {}).ach || {})[a[0]]).map(a => a[1]).join("")}</span></button>`;
    $("shareBtn").onclick = () => shareMe(sv, lv);
    $("badgeBtn").onclick = showBadges;
    if (soloMode === "map" && !$("soloBox").hidden) drawStages();              // 서버 기록이 늦게 오면 지도도 다시
    if (soloMode === "day" && !$("soloBox").hidden) drawDay();                 // 가족 오늘 기록도
    drawDayDot();
  }
  const shareMe = (sv, lv) => shareText(`🐱 냥도쿠 ${sv}판 깼어요! (${lv[1]} ${lv[2]}) 나랑 같이 해요`);
  async function shareText(text) {
    const url = location.origin + location.pathname;
    try { if (navigator.share) { await navigator.share({ title: "냥도쿠", text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast("자랑 글을 복사했어요. 카톡에 붙여 넣으세요"); } catch (e) { prompt("이 글을 친구에게 보내세요", `${text} ${url}`); }
  }
  // 오늘의 퍼즐을 아직 안 풀었으면 '📅 오늘' 단추에 점
  function drawDayDot() { const b = $("soloMode").querySelector('[data-v="day"]'); if (b) b.classList.toggle("dot", !!bank && !myDays()[kstDay()]); }
  function drawTiers() {
    drawSoloProg();
    const bs = bests(), tb = store.get("taBest", {}), ta = soloMode === "ta";
    segBtns($("soloMode"), [["day", "📅 오늘"], ["map", "🗺 단계"], ["one", "🧩 한 판"], ["ta", `⏱ 타임어택`]], soloMode, v => { soloMode = v; store.set("soloMode2", v); drawTiers(); });
    drawDayDot();
    const pick = soloMode === "map" || soloMode === "day", bbOn = soloMode === "one" && bbKind === "b";
    $("tiers").hidden = pick; $("stageBox").hidden = soloMode !== "map"; $("dayBox").hidden = soloMode !== "day"; $("howto").hidden = pick || bbOn; $("howtoB").hidden = !bbOn;
    $("kindSeg").hidden = soloMode !== "one";
    if (soloMode === "one") segBtns($("kindSeg"), [["q", "🐱 냥도쿠"], ["b", "🌗 반반 (새로)"]], bbKind, v => { bbKind = v; store.set("kind", v); drawTiers(); });
    if (soloMode === "map") { $("soloDesc").hidden = true; drawStages(); return; }
    if (soloMode === "day") { $("soloDesc").hidden = true; drawDay(); return; }
    $("soloDesc").textContent = ta ? `${TA_SOLO_MIN}분 동안 몇 개 풀 수 있을까요? 다 풀거나 🐟를 다 잃으면 바로 다음 문제. 힌트는 한 번에 -${PENALTY}초` : "";
    $("soloDesc").hidden = !ta;
    const bb = bbOn ? store.get("bbBest", {}) : null;
    $("tiers").innerHTML = TIERS.map(t => {
      const rec = bbOn ? (bb[t.id] ? `최고 ${fmt(bb[t.id])}` : "") : ta ? (tb[t.id] ? `최고 ${tb[t.id]}개` : "") : (bs[t.id] ? `최고 ${fmt(bs[t.id])}` : "");
      return `<button class="tier t-${t.id}" data-t="${t.id}" aria-pressed="${t.id === soloTier}"><span class="em">${t.em}</span><b>${t.label}</b><span>${bbOn ? BB_DESC[t.id] : t.desc}</span>${rec ? `<span>${rec}</span>` : ""}</button>`;
    }).join("");
    for (const b of $("tiers").children) b.onclick = () => { soloTier = b.dataset.t; store.set("soloTier", soloTier); for (const o of $("tiers").children) o.setAttribute("aria-pressed", o === b); };
  }
  $("startBtn").onclick = () => { if (!bank) return; if (soloMode === "map") playStage(maxStage() + 1); else if (soloMode === "day") playDaily(); else if (soloMode === "ta") playTA(soloTier); else if (bbKind === "b") playBB(soloTier); else playSolo(soloTier); };

  // ══ 🌗 치즈냥·까망냥 반반 (11-06 — 벤치마킹: LinkedIn Tango · 지민 님 새 퍼즐, 엔진 banban.js · 판 화면 banban-ui.js) ══
  //   한 판(난이도 넷) · 오늘의 반반(📅 오늘 아래, nyang/rec/{pid}/bday). 별 = ⭐ 깸 · +⭐ 힌트 없이 · +⭐ 목표 시간 안 (물고기·실패 없음)
  const BB_DESC = { easy: "6×6 · 가볍게", normal: "6×6 · 처음 칸 적게", hard: "8×8 · 줄 전체 따지기", master: "8×8 · 표시 적게" };
  let bbKind = store.get("kind", "q");
  function playBB(tier, daily) {
    if (!window.NYB || !window.NYBUI) return toast("반반을 못 불러왔어요. 새로 고침해 주세요");
    const seed = daily ? daily.bseed : NY.rseed(), pz = NYB.make(seed, tier), T = TIERS.find(t => t.id === tier);
    if (daily) { const tr = store.get("bdayTry", {}); tr[daily.key] = (tr[daily.key] || 0) + 1; store.set("bdayTry", Object.fromEntries(Object.entries(tr).filter(([k]) => k >= dayShift(daily.key, -7)))); }
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: daily ? "bday" : "bb", tier, seed, n: pz.N }); }).catch(() => {});
    NYBUI.start({ pz, label: daily ? `🌗 오늘의 반반 · ${pz.N}×${pz.N}` : `🌗 반반 · ${T.label} ${pz.N}×${pz.N}`,
      onExit: () => { if (glog) glog.matchEnd({ won: false, gaveUp: true }); goHome(); },
      onWin: w => bbEnd(w, tier, pz, daily) });
  }
  function bbEnd(w, tier, pz, daily) {
    const T = TIERS.find(t => t.id === tier), secs = w.secs;
    if (glog) glog.matchEnd({ won: true, bb: 1, secs: Math.round(secs * 10) / 10, hints: w.hints });
    if (window.GRank) try { GRank.result("nyang", { mode: "ai", res: "w", beat: 1, tier: "bb" }); } catch (e) {}
    REC.solved(1); REC.cnt("bb");
    const st = Math.max(1, 3 - (w.hints ? 1 : 0) - (secs > pz.par ? 1 : 0));
    const stars = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div>
      <p class="small" style="margin:0">${[w.hints ? `힌트 ${w.hints}번` : "힌트 0 ✓", secs > pz.par ? `목표 ${fmt(pz.par)} 넘음` : `목표 ${fmt(pz.par)} 안 ✓`].join(" · ")}</p>`;
    [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
    const bst = store.get("bbBest", {}), best = !w.hints && (!bst[tier] || secs < bst[tier]); if (best) { bst[tier] = Math.round(secs * 10) / 10; store.set("bbBest", bst); }
    const bl = baseLine(baseline("bb_" + tier, secs), secs, { label: `반반 ${T.label}` });
    let fam = "", title = "🎉 다 맞혔어요!";
    if (daily) {
      const before = myBDays()[daily.key], tries = store.get("bdayTry", {})[daily.key] || 1;
      if (!before) REC.bday(daily.key, { s: Math.round(secs * 10) / 10, h: w.hints, k: tries }, pz.N);
      const board = dayBoard(daily.key, "bday");
      title = before ? "✅ 다시 풀었어요" : "🎉 오늘의 반반 성공!";
      fam = (before ? `<p class="small" style="margin:0">오늘 기록은 처음 성공한 <b>${fmt(before.s)}</b> 그대로예요</p>` : "") + (board.length > 1 ? `<p class="small" style="margin:0">오늘 가족 기록</p>${boardHtml(board, 4)}` : "");
    }
    result(title, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">🌗 ${pz.N}×${pz.N} ${T.label}${best ? " · <b style='color:var(--good)'>최고 기록!</b>" : ""}</p>${bl}${fam}${cheerLine(true)}`,
      daily ? [["닫기", goHome, "primary"]] : [["한 판 더", () => playBB(tier), "primary"], ["난이도 고르기", goHome]]);
    setTimeout(checkBadges, 1200);
  }
  function pickRandom(tier) {
    const n = bank[tier].length, sv = new Set(solved()[tier] || []), recent = new Set(store.get("recent_" + tier, []));
    let pool = [...Array(n).keys()].filter(i => !sv.has(i) && !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()].filter(i => !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()];
    const i = pool[Math.floor(Math.random() * pool.length)];
    store.set("recent_" + tier, [i, ...recent].slice(0, Math.min(60, n - 1)));   // 최근 60판은 다시 안 나옴
    return i;
  }
  function playSolo(tier, idx, vs, stage, daily) {
    vs = vs ?? NY.rseed();                                                   // 같은 문제도 돌리고 뒤집고 색을 바꿔서 (다시 도전은 같은 모양)
    const i = idx ?? pickRandom(tier), p = NY.variant(bank[tier][i], vs), T = TIERS.find(t => t.id === tier);
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: daily ? "day" : "solo", tier, puzzle: i, n: p.n }); }).catch(() => {});   // 기록은 뒤에서 (판은 바로 시작)
    startPuzzle(p, {
      kind: "solo", tier, idx: i, vs, stage, daily, hintRule: "on", label: daily ? `📅 오늘의 퍼즐 · ${T.label}` : stage ? `🗺 ${stage}단계 · ${T.label}` : `${T.em} ${T.label}`,
      onEnd(won) {
        if (daily) return dailyEnd(won, daily);
        const secs = G.secs; ctx.finalSecs = secs;
        if (glog) glog.matchEnd({ won, secs: Math.round(secs * 10) / 10, mistakes: G.mistakes, hints: G.hints });
        if (window.GRank) try { GRank.result("nyang", { mode: "ai", res: won ? "w" : "l", beat: won ? 1 : 0, tier }); } catch (e) {}   // 🏆 공용 랭킹: 혼자 퍼즐 (포기·처음부터는 안 셈)
        if (won) {
          REC.solved(1); if (!G.hints) REC.best(tier, secs, G.n);
          const st = starsOf(G, secs);
          if (st === 3) REC.cnt("star3");
          if (!G.hints && tier !== "easy") REC.cnt("nhNormal");
          if (!G.mistakes && (tier === "hard" || tier === "master")) REC.cnt("perfHard");
          const sv = solved(); const s = new Set(sv[tier] || []); s.add(i); sv[tier] = [...s]; store.set("solved", sv);
          const bs = bests(); const best = !G.hints && (!bs[tier] || secs < bs[tier]); if (best) { bs[tier] = secs; store.set("bestT", bs); }
          let extra = "", gift = "";
          if (stage) { const before = maxStage(); REC.stage(stage, st); if (stage > before) { const sk = SKINS.find(x => x[0] === stage); if (sk) gift = `<p class="cheer">🎁 새 고양이 <b style="font-size:22px">${sk[1]}</b> 를 얻었어요! (단계 지도에서 바꿀 수 있어요)</p>`; } }
          extra = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div>
            <p class="small" style="margin:0">${starWhy(G, secs)}</p>`;
          [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
          const bl = baseLine(baseline(tier, secs), secs, T);
          result(stage ? `🎉 ${stage}단계 성공!` : "🎉 다 찾았어요!", `${extra}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">실수 ${G.mistakes}번 · 힌트 ${G.hints}번${best ? " · <b style='color:var(--good)'>최고 기록!</b>" : ""}</p>${bl}${gift}${cheerLine(true)}`,
            stage ? [["다음 단계 ▶", () => playStage(stage + 1), "primary"], ["다시 (⭐ 더 받기)", () => playStage(stage)], ["지도", goHome]]
                  : [["한 판 더", () => playSolo(tier), "primary"], ["난이도 고르기", goHome]]);
          if (gift) setTimeout(() => S("badge"), 900);
          setTimeout(checkBadges, 1200);
        } else {
          result("😿 물고기를 다 잃었어요", `<p style="margin:0">고양이 ${G.cats.size}/${G.n}마리 찾았어요.</p><p class="small" style="margin:0">💡 힌트나 🪄 자동 ✕를 써 보세요.</p>`,
            stage ? [["다시 도전", () => playStage(stage), "primary"], ["지도", goHome]]
                  : [["다시 도전", () => playSolo(tier, i, vs), "primary"], ["다른 문제", () => playSolo(tier)], ["난이도 고르기", goHome]]);
        }
      },
    });
  }
  // 📅 오늘의 퍼즐 한 판 끝: 그날 처음 성공한 판만 기록 · 가족 오늘 순위 · 연속 일수
  function dailyEnd(won, d) {
    const secs = G.secs, T = TIERS.find(t => t.id === d.tier); ctx.finalSecs = secs;
    if (glog) glog.matchEnd({ won, daily: d.key, secs: Math.round(secs * 10) / 10, mistakes: G.mistakes, hints: G.hints });
    if (window.GRank) try { GRank.result("nyang", { mode: "ai", res: won ? "w" : "l", beat: won ? 1 : 0, tier: d.tier }); } catch (e) {}
    if (!won) {
      result("😿 물고기를 다 잃었어요", `<p style="margin:0">고양이 ${G.cats.size}/${G.n}마리 찾았어요.</p><p class="small" style="margin:0">오늘의 퍼즐은 성공할 때까지 몇 번이든 다시 할 수 있어요. 처음 성공한 기록이 남아요.</p>`,
        [["다시 도전", playDaily, "primary"], ["닫기", goHome]]);
      return;
    }
    REC.solved(1); if (!G.hints) REC.best(d.tier, secs, G.n);
    const before = myDays()[d.key], tries = store.get("dayTry", {})[d.key] || 1, st = starsOf(G, secs);
    if (st === 3) REC.cnt("star3");
    if (!G.hints && d.tier !== "easy") REC.cnt("nhNormal");
    if (!G.mistakes && (d.tier === "hard" || d.tier === "master")) REC.cnt("perfHard");
    if (!before) REC.day(d.key, { s: Math.round(secs * 10) / 10, m: G.mistakes, h: G.hints, k: tries }, G.n);
    const days = myDays(), run = streakOf(days), board = dayBoard(d.key), me = (GME.me && GME.me.pid) || "me", rk = board.findIndex(x => x.pid === me);
    const stars = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div><p class="small" style="margin:0">${starWhy(G, secs)}</p>`;
    [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
    const head = before ? `<p class="small" style="margin:0">오늘 기록은 처음 성공한 <b>${fmt(before.s)}</b> 그대로예요</p>`
      : `${run > 1 ? `<p class="cheer">🔥 <b>${run}일 연속</b> 오늘의 퍼즐!</p>` : `<p class="cheer">📅 오늘의 퍼즐 성공! 내일 또 만나요</p>`}`;
    const fam = board.length > 1 ? `<p class="small" style="margin:0">오늘 가족 기록 ${rk >= 0 ? `· 나는 <b>${rk + 1}등</b>` : ""}</p>${boardHtml(board, 4)}` : "";
    const bl = baseLine(baseline(d.tier, secs), secs, T);
    result(before ? "✅ 다시 풀었어요" : `🎉 오늘의 퍼즐 성공!`, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">${T.em} ${T.label} · 실수 ${G.mistakes}번 · 힌트 ${G.hints}번${tries > 1 && !before ? ` · ${tries}번째 만에` : ""}</p>${bl}${head}${fam}`,
      [["📤 자랑", () => { shareDay(d, myDays()[d.key], run, board); goHome(); }, "primary"], ["닫기", goHome]]);
    setTimeout(checkBadges, 1200);
  }
  // ← 단추: 실수로 나가지 않게 2초 안에 두 번
  let backAt = 0;
  $("giveUp").onclick = () => {
    if (!G) return;
    const finished = ctx.ta ? ctx.ta.over : G.over;
    if (!finished && !ctx.spec && performance.now() - backAt > 2000) { backAt = performance.now(); toast(ctx.kind === "solo" ? "한 번 더 누르면 나가요" : ctx.ta ? "한 번 더 누르면 타임어택을 여기서 끝내요" : "한 번 더 누르면 이번 판을 포기해요"); return; }
    if (ctx.kind === "solo") { if (!G.over && glog) glog.matchEnd({ won: false, gaveUp: true, secs: Math.round(G.secs) }); G.over = true; goHome(); }
    else if (finished || ctx.spec) { if (roundRes && meta && shownRound === meta.round) roundRes(); else askLeave(); }   // 끝난 판·구경: 결과 다시 보기, 결과가 아직이면 방 나가기를 물음
    else if (ctx.ta) endTA(ctx.ta);
    else { G.over = true; G.gaveUp = true; ctx.finalSecs = (now() - ctx.startAt) / 1000; progress(); paint(); toast("이번 판은 포기했어요"); }
  };
  $("restart").onclick = () => {
    if (!G || ctx.kind !== "solo") { toast("대결 중에는 처음부터 할 수 없어요"); return; }
    if (!G.over && glog) glog.matchEnd({ won: false, restart: true, secs: Math.round(G.secs) });
    if (ctx.daily) playDaily(); else playSolo(ctx.tier, ctx.idx, ctx.vs, ctx.stage);
  };  function result(title, body, btns) {
    $("resTitle").textContent = title; $("resBody").innerHTML = body;
    $("resBtns").innerHTML = "";
    for (const b of btns.filter(Boolean)) { const el = document.createElement("button"); el.className = "btn " + (b[2] || ""); el.textContent = b[0]; el.onclick = () => { $("resBox").hidden = true; b[1](); syncPeek(); }; $("resBtns").appendChild(el); }
    $("resBox").hidden = false; syncPeek();
  }
  // 대결 결과창을 닫고 판을 보는 동안: 판 아래에 '결과 다시 보기' 단추 (다음 판이 시작되면 사라짐)
  function syncPeek() {
    $("resPeek").hidden = !($("resBox").hidden && ctx && ctx.kind === "vs" && G && G.over && meta && meta.phase === "play" && shownRound === meta.round && roundRes);
  }
  function goHome() { G = null; TA = null; clearInterval(timerT); $("resBox").hidden = true; show("home"); drawTiers(); }

  // ══ 친구 대결 (common/arena.js + ArenaUI) ═════════════════════
  // 방 만들기·코드·열린 방·대기실·설정 칸·채팅은 ArenaUI, 방은 arena/nyang/rooms/{코드}. 퍼즐은 각자 화면에서 풀고 '진행'(놓은 고양이 수·실수·끝난 시간·판 모양)만 주고받음
  //   meta(방장만): round · pid · vs · startAt · who(이번 판 하는 사람) · seq·endAt(타임어택) · wins · scored
  //   진행: 손님 → 방장 {t:"q",q} → 모두 {t:"q",u,q} · 늦게 온 사람·다시 들어온 사람: {t:"hi"} → 방장 {t:"s",prog} (지금까지의 진행 전부)
  const MAXP = 8;                                            // 한 방 최대 인원 (휴대폰 이름표 줄·결과표에 들어가는 만큼)
  let R = null, isHost = false, meta = null, players = {}, prog = {}, myRound = 0, shownRound = 0;
  let boundOffs = [], sReady = Promise.resolve(), sDone = () => {}, bornAt = 0;
  // 이름 = 게임 사이트 공통 이름 (common/me.js)
  const myName = () => ((GME.me && GME.me.name) || "").slice(0, 12);

  function tab(which) {                                     // 시작 화면 탭: solo · watch (친구랑은 ArenaUI 창)
    for (const [t, box] of [["Solo", "soloBox"], ["Watch", "watchBox"]]) {
      const on = t.toLowerCase() === which;
      $("tab" + t).setAttribute("aria-pressed", on); $(box).hidden = !on;
    }
    if (window.NYWATCH) { if (which === "watch") NYWATCH.open(); else NYWATCH.close(); }
  }
  $("tabSolo").onclick = () => tab("solo");
  $("tabWatch").onclick = () => tab("watch");
  $("tabFriend").onclick = () => openFriend();
  $("helpBtn").onclick = () => Cozy.howto("nyang", "냥도쿠 하는 법", [...$("howto").children].map(li => li.textContent).concat(["💡 힌트는 어디를 볼지 → 이유 → 적용 순서로 알려 줘요", "🪄 자동 ✕ 를 켜면 고양이 둘레를 저절로 ✕ 해 줘요"]), { force: true });
  $("rankBtn").onclick = () => { $("rankBox").hidden = false; drawRank(); };
  $("rankClose").onclick = () => { $("rankBox").hidden = true; };
  $("gRankBtn").onclick = () => { if (window.GRank) Arena.init().then(() => GRank.open("nyang")).catch(() => {}); };   // 🏆 전체 게임 공용 랭킹

  function openFriend() {
    if (!window.ArenaUI) { toast("친구랑 모듈을 불러오지 못했어요"); return; }
    ArenaUI.open({ ownMatchLog: true,
      game: "nyang", title: "냥도쿠", max: MAXP, min: 2,
      describe: lobbyLine,
      settings: { defaults: store.get("cfg", { tier: "normal", hint: "penalty", rounds: 3 }), label: cfgText, render: friendSettings },
      onStart: onlineStart,
      onLobby: onlineLobby,
      onLeave: onlineLeave,
    });
  }
  // 방 하나에 붙기 (판이 바뀌어도 유지)
  function bindNet(net) {
    if (R === net) return;
    unbindNet();
    R = net; isHost = !!net.isHost; meta = net.meta || null; players = net.players || {}; prog = {}; myRound = 0; shownRound = 0; restored = 0; roundRes = null; bornAt = performance.now();
    if (isHost) { sReady = Promise.resolve(); const lg = logInit(); if (lg) { if (ArenaUI.logSid) lg.use(ArenaUI.logSid); else lg.start({ kind: "대결", hostName: myName(), room: net.code }, net.uid); } }
    else sReady = new Promise(ok => { sDone = ok; setTimeout(ok, 2500); });   // 다시 들어온 사람은 지금까지의 진행을 받고 시작 (못 받아도 2.5초 뒤엔)
    const ON = (ev, fn) => { const off = net.on(ev, (...a) => { if (R === net) fn(...a); }); if (typeof off === "function") boundOffs.push(off); };
    ON("players", v => { players = v || {}; drawOpp(); checkRoundEnd(); });
    ON("meta", m => { if (m) { meta = m; onMeta(); } });
    ON("conn", (ok, why) => { if (!ok) toast(why || "인터넷 연결이 끊겼어요", 3000); });
    ON("chat", m => {                                        // 말풍선·기록은 ArenaUI, 여기선 💬 배지와 소리만
      if (!m || m.u === net.uid || ArenaUI.chatOpen || $("play").hidden || performance.now() - bornAt < 1500) return;
      $("chatBadge").hidden = false; S("count");
    });
    if (isHost) ON("msg", (uid, m) => {
      if (!m) return;
      if (m.t === "hi") net.send(uid, { t: "s", prog }, true);
      else if (m.t === "q" && m.q) { prog[uid] = m.q; net.broadcast({ t: "q", u: uid, q: m.q }, true); onProg(); }
    });
    else ON("msg", m => {
      if (!m) return;
      if (m.t === "s") { prog = m.prog || {}; sDone(); onProg(); }
      else if (m.t === "q" && m.u !== net.uid) { prog[m.u] = m.q; onProg(); }
    });
  }
  function unbindNet() { boundOffs.splice(0).forEach(f => { try { f(); } catch (e) {} }); }
  function onlineStart({ net }) {
    bindNet(net);
    bankP.then(() => {
      if (R !== net) return;
      if (isHost) startRound(false); else net.send({ t: "hi" }, true);
    });
  }
  // 대기실로: 모두 판 화면을 닫음 (대기실 창은 ArenaUI). 방장은 판 번호를 지워서 옛 판이 저절로 다시 안 시작되게
  function clearRoundScreen() {
    G = null; TA = null; myRound = 0; shownRound = 0; restored = 0; roundRes = null; clearInterval(timerT); clearTimeout(qT); qT = null; qPend = null;
    for (const id of ["resBox", "countBox", "spyBox", "resPeek"]) $(id).hidden = true;
    spyU = null; closeHint();
  }
  function onlineLobby() {
    clearRoundScreen(); prog = {}; show("home"); drawTiers();
    if (isHost && R) R.setMeta({ round: 0 });
  }
  // 방을 나감 (방장이 닫음 · 내보내짐 포함): 창 없이 첫 화면으로
  function onlineLeave() {
    if (!R) return;                                          // 방에 안 들어가고 창만 닫음
    if (isHost && glog) glog.close();
    unbindNet(); clearRoundScreen();
    R = null; meta = null; players = {}; prog = {};
    goHome();
  }
  const leaveRoom = () => { if (window.ArenaUI && ArenaUI.net) ArenaUI.leave(); };

  function segBtns(el, items, cur, on) {
    el.innerHTML = items.map(([v, l]) => `<button class="btn" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("");
    for (const b of el.children) b.onclick = () => on(b.dataset.v);
  }
  // 대결 모드: race = 같은 문제 빨리 풀기 · ta = 타임어택 (같은 순서의 문제를 정해진 시간 동안) · coop = 판 하나를 다 같이
  const MODES = [["race", "🏁 빨리 풀기"], ["ta", "⏱ 타임어택"], ["coop", "🤝 협동"]];
  const MODE_DESC = {
    race: "같은 문제를 누가 먼저 다 푸나 겨뤄요.",
    ta: "정해진 시간 동안 모두 같은 순서의 문제를 풀어요. 많이 푼 사람이 이겨요. 🐟를 다 잃으면 다음 문제로.",
    coop: "판 하나를 다 같이 풀어요. 누가 놓은 ✕·🐱든 모두에게 보이고, 🐟 5마리를 같이 써요.",
  };
  const COOP_FISH = 5;
  const MODE = () => (meta && meta.cfg && meta.cfg.mode) || "race";
  const hintLabel = (h, m) => h === "penalty" && m === "ta" ? `쓰면 시간 -${PENALTY}초` : (HINTS.find(x => x[0] === h) || [])[1];
  function cfgText(c) {
    const m = c.mode || "race";
    return `${(MODES.find(x => x[0] === m) || [])[1]}${m === "ta" ? ` ${c.mins || 3}분` : ""} · ${(TIERS.find(t => t.id === c.tier) || {}).name} · 힌트 ${hintLabel(c.hint, m)} · ${c.rounds}판`;
  }
  // 대기실 한 줄: 지금 방식 설명 + 지난 대결 승수
  function lobbyLine(n, c) {
    const m = ArenaUI.net && ArenaUI.net.meta, wins = (m && m.wins) || {}, pl = (ArenaUI.net && ArenaUI.net.players) || {};
    const w = Object.entries(wins).filter(([u, v]) => v && pl[u]).sort((a, b) => b[1] - a[1]).map(([u, v]) => `${pl[u].name} ${v}승`).join(" · ");
    return MODE_DESC[(c && c.mode) || "race"] + (w ? ` 🏆 ${w}` : "");
  }
  function friendSettings(el, c, canEdit, update) {
    if (!canEdit) { el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(cfgText(c))}</p>`; return; }
    const m = c.mode || "race", set = p => { store.set("cfg", { ...c, ...p }); update(p); };
    el.innerHTML = `<div class="cfgs">
      <div class="optrow"><span class="small">방식</span><div class="seg" id="cfgMode"></div></div>
      ${m === "ta" ? '<div class="optrow"><span class="small">시간</span><div class="seg" id="cfgMins"></div></div>' : ""}
      <div class="optrow"><span class="small">난이도</span><div class="seg" id="cfgTier"></div></div>
      <div class="optrow"><span class="small">힌트</span><div class="seg" id="cfgHint"></div></div>
      <div class="optrow"><span class="small">판 수</span><div class="seg" id="cfgRounds"></div></div>
    </div>`;
    const q = id => el.querySelector("#" + id);
    segBtns(q("cfgMode"), MODES, m, v => set({ mode: v }));
    if (m === "ta") segBtns(q("cfgMins"), [[2, "2분"], [3, "3분"], [5, "5분"]], c.mins || 3, v => set({ mins: +v }));
    segBtns(q("cfgTier"), TIERS.map(t => [t.id, t.name]), c.tier, v => set({ tier: v }));
    segBtns(q("cfgHint"), HINTS.map(([h]) => [h, hintLabel(h, m)]), c.hint, v => set({ hint: v }));
    segBtns(q("cfgRounds"), [[1, "1판"], [3, "3판"], [5, "5판"]], c.rounds, v => set({ rounds: +v }));
  }
  // 방장: 새 판 시작 (같은 퍼즐을 모두에게, 3.5초 뒤 동시에)
  function startRound(next) {
    if (!isHost) return;
    const list = bank[meta.cfg.tier];
    const used = new Set(meta.used || []);
    let pid = Math.floor(Math.random() * list.length), guard = 0;
    while (used.has(pid) && guard++ < 50) pid = Math.floor(Math.random() * list.length);
    used.add(pid);
    const round = next ? (meta.round || 0) + 1 : 1, mode = MODE(), startAt = now() + 3500;
    const extra = {};
    if (mode === "ta") {                                                     // 타임어택: 모두 같은 순서 (섞은 문제 40개)
      extra.seq = [...Array(list.length).keys()].map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, 40);
      extra.endAt = startAt + (meta.cfg.mins || 3) * 60000;
    }
    prog = {};
    players = R.players || players;
    const who = Object.keys(players).filter(u => !players[u].watch);         // 이번 판에 하는 사람 (판 도중에 들어온 사람은 구경 → 다음 판부터)
    if (glog) glog.matchStart({ mode: "vs-" + mode, tier: meta.cfg.tier, round, n: list[pid].n, hint: meta.cfg.hint, people: who.map(u => players[u].name).join(", ") });
    R.setMeta({ round, pid, vs: NY.rseed(), startAt, used: [...used].slice(-40), scored: 0, who, ...extra, ...(next ? {} : { wins: {} }) });
  }

  function onMeta() {
    if (!meta || meta.phase !== "play") return;
    if (meta.round && meta.round !== myRound) {
      myRound = meta.round; shownRound = 0; roundRes = null; restored = 0;
      for (const u of Object.keys(prog)) if (!prog[u] || prog[u].round !== meta.round) delete prog[u];
      G = null; TA = null; clearInterval(timerT);
      const p = NY.variant(bank[meta.cfg.tier][meta.pid], meta.vs), r0 = myRound, n0 = R;
      $("resBox").hidden = true; $("spyBox").hidden = true; $("resPeek").hidden = true; spyU = null;
      const mode = MODE(), tierName = (TIERS.find(t => t.id === meta.cfg.tier) || {}).name || "";
      const alive = () => R === n0 && myRound === r0;                        // 카운트다운 사이 방을 나갔거나 대기실로 돌아갔으면 시작 안 함
      countdown(meta.startAt, alive, () => sReady.then(() => {
        if (!alive() || G) return;
        if (isSpec()) {                                                      // 판 도중에 들어옴: 이번 판은 구경 (판 끝 기다림에 안 들어감), 친구 판을 바로 보여 줌
          startPuzzle(p, { kind: "vs", spec: true, coop: mode === "coop", hintRule: "off", startAt: meta.startAt, label: "👀 구경 중", onProgress: () => {}, onEnd: () => {} });
          if (mode === "coop") coopMerge();
          const first = ranking()[0]; if (first && mode !== "coop") spyOpen(first.u);
          toast("판 도중에 들어와서 이번 판은 구경해요. 다음 판부터 같이 해요", 3500);
          drawOpp(); checkRoundEnd();
          return;
        }
        if (mode === "ta") {
          TA = { kind: "vs", tier: meta.cfg.tier, seq: meta.seq, vs: meta.vs, endAt: meta.endAt, clock: () => now(), solved: 0, failed: 0, i: 0, hintRule: meta.cfg.hint, over: false };
          nextTA();
          const r = meta.round; setTimeout(() => { if (meta && meta.round === r) checkRoundEnd(); }, Math.max(0, meta.endAt - now()) + 5000);   // 연결이 끊긴 사람이 있어도 결과가 뜨게
        } else startPuzzle(p, {
          kind: "vs", coop: mode === "coop", hintRule: meta.cfg.hint, startAt: meta.startAt, label: `${mode === "coop" ? "🤝 " : ""}${tierName} · ${meta.round}/${meta.cfg.rounds}판`,
          onProgress: sendProg,
          onEnd: won => {
            sendProg();
            if (!ctx.coop) toast((won ? "다 놓았어요!" : "물고기를 다 잃었어요.") + " 위쪽 친구 이름을 누르면 친구 판을 볼 수 있어요", 4000);
          },
        });
        onProg();
      }));
    }
    drawOpp();
  }
  function countdown(at, alive, go) {
    if (at - now() <= 0) { go(); return; }                                  // 이미 시작한 판 (다시 들어옴·구경)
    $("countBox").hidden = false;
    let said = null;
    const tick = () => {
      if (!alive()) { $("countBox").hidden = true; return; }
      const left = (at - now()) / 1000;
      if (left <= 0) { $("countBox").hidden = true; S("go"); go(); return; }
      const c = Math.ceil(left); if (c !== said && c <= 3) { said = c; S("count"); }
      $("count").textContent = c; setTimeout(tick, 100);
    };
    tick();
  }
  // b = 판 모양 한 줄 (관전·협동용): 0 빈칸 · x ✕ · c 고양이 · b 틀린 칸
  const boardStr = () => Array.from({ length: G.n * G.n }, (_, k) => G.cats.has(k) ? "c" : G.bad.has(k) ? "b" : G.xs.has(k) ? "x" : "0").join("");
  function sendProg() {
    if (!R || !G || ctx.kind !== "vs" || ctx.spec) return;              // 구경꾼은 진행을 안 올림 (판 끝 기다림에 안 들어감)
    const b = boardStr();
    if (ctx.ta) {
      const ta = ctx.ta;
      putQ({ round: meta.round, ta: 1, solved: ta.solved, failed: ta.failed, pi: ta.pi || 0, placed: G.cats.size, n: G.n, mistakes: G.mistakes, hints: G.hints, end: ta.over ? 1 : 0, b });
      return;
    }
    if (ctx.coop) {
      coopCommit(b);
      const mine = Object.values(myOps).filter(v => v[0] === "c").length;
      putQ({ round: meta.round, coop: 1, ops: myOps, mine, hints: G.hints });
      return;
    }
    const done = G.won ? 1 : 0, failed = (!G.won && G.over) ? 1 : 0;
    if (G.over && ctx.finalSecs == null) ctx.finalSecs = (now() - meta.startAt) / 1000;
    const secs = G.over ? ctx.finalSecs : null;
    putQ({ round: meta.round, placed: G.cats.size, n: G.n, mistakes: G.mistakes, hints: G.hints, done, failed, gaveUp: G.gaveUp ? 1 : 0, secs: secs == null ? null : Math.round(secs * 10) / 10, b });
  }
  // 내 진행: 내 화면엔 바로, 다른 사람에겐 0.15초에 한 번까지 (✕ 끌어 칠할 때 쏟아지지 않게 · 끝난 소식은 바로)
  let qPend = null, qT = null, qAt = 0;
  function putQ(q) {
    q = JSON.parse(JSON.stringify(q));
    prog[R.uid] = q; qPend = q;
    const t = performance.now();
    if (q.done || q.failed || q.end || t - qAt > 150) flushQ();
    else if (!qT) qT = setTimeout(flushQ, 150 - (t - qAt));
    onProg();
  }
  function flushQ() {
    clearTimeout(qT); qT = null;
    if (!qPend || !R) return;
    const q = qPend; qPend = null; qAt = performance.now();
    if (isHost) R.broadcast({ t: "q", u: R.uid, q }, true); else R.send({ t: "q", q }, true);
  }
  const onProg = () => { coopMerge(); rivalAlerts(); drawOpp(); spyDraw(); checkRoundEnd(); };
  // 새로 고침·재접속: 방장이 들고 있던 내 진행으로 판을 되살림 (고양이·✕·실수·힌트, 타임어택은 푼 개수·문제 번호, 협동은 내가 한 칸들)
  let restored = 0;
  function restoreMine() {
    if (!R || !meta || !G || !ctx || ctx.kind !== "vs" || ctx.spec || restored === meta.round) return;
    restored = meta.round;                                                   // 이 판 첫 시작 때 한 번만 (타임어택은 문제마다 startPuzzle 이 불림)
    const q = prog[R.uid]; if (!q || q.round !== meta.round) return;
    if (ctx.coop) { myOps = { ...(q.ops || {}) }; G.hints = q.hints || 0; coopMerge(); return; }
    if (ctx.ta) {
      const ta = ctx.ta; ta.solved = q.solved || 0; ta.failed = q.failed || 0;
      if ((q.pi || 0) !== ta.i) { ta.i = q.pi || 0; nextTA(); }
      else $("stLabel").textContent = ctx.label = `⏱ ${TIERS.find(t => t.id === ta.tier).label} · ${ta.solved}개`;
    }
    [...(q.b || "")].forEach((ch, k) => { if (ch === "c") G.cats.add(k); else if (ch === "b") G.bad.add(k); else if (ch === "x") G.xs.add(k); });
    G.mistakes = q.mistakes || 0; G.hints = q.hints || 0;
    if (ctx.ta) { if (q.end) { ctx.ta.over = true; G.over = true; } }
    else if (q.done || q.failed) { G.over = true; G.won = !!q.done; G.gaveUp = !!q.gaveUp; ctx.finalSecs = q.secs; }
    paint();
  }
  // ── 협동: 각자 자기가 바꾼 칸만 '칸 → 상태+시각'으로 올리고(prog.ops), 모두의 것을 합쳐 같은 판을 만듦
  //    한 칸에 여러 사람이 손대면 🐱 > 틀린 칸 > (✕/빈칸은 나중에 한 쪽). 실수 = 틀린 칸 수 (🐟 같이 씀)
  let myOps = {}, coopLast = "", coopInfo = null;
  function coopCommit(b) {
    const t = now();
    for (let k = 0; k < b.length; k++) if (b[k] !== (coopLast[k] || "0")) myOps["k" + k] = b[k] + t;
    coopLast = b;
  }
  function coopMerge() {
    if (!G || !ctx || !ctx.coop || !meta || !R) return;
    const best = {};
    const add = (u, ops) => {
      for (const [kk, v] of Object.entries(ops || {})) {
        const k = +kk.slice(1), s = v[0], t = +v.slice(1), r = s === "c" ? 3 : s === "b" ? 2 : 1, cur = best[k];
        if (!cur || r > cur.r || (r === cur.r && r === 1 && t > cur.t) || (r === cur.r && r > 1 && t < cur.t)) best[k] = { s, t, r, u };
      }
    };
    for (const [u, q] of Object.entries(prog)) if (q && q.round === meta.round && u !== R.uid) add(u, q.ops);
    add(R.uid, myOps);                                                       // 내 것은 방금 바꾼 것까지
    G.cats.clear(); G.bad.clear(); G.xs.clear();
    for (const [k, o] of Object.entries(best)) (o.s === "c" ? G.cats : o.s === "b" ? G.bad : o.s === "x" ? G.xs : new Set()).add(+k);
    G.mistakes = G.bad.size;
    coopLast = boardStr(); coopInfo = { best };
    if (!G.over && G.cats.size === G.n) { G.over = true; G.won = true; }
    else if (!G.over && G.mistakes >= G.maxMistakes) G.over = true;
    if (hint && stateKey() !== hintKey) closeHint();
    paint();
  }
  const iFinished = () => (ctx && ctx.spec) || (MODE() === "ta" ? !!(TA && TA.over) : !!(G && G.over));
  const isSpec = () => !!(meta && Array.isArray(meta.who) && R && !meta.who.includes(R.uid));
  const score = q => q.done ? (q.secs || 0) + (meta.cfg.hint === "penalty" ? (q.hints || 0) * PENALTY : 0) : null;
  function ranking() {
    const inRound = u => !Array.isArray(meta.who) || meta.who.includes(u) || (prog[u] && prog[u].round === meta.round);
    const rows = Object.entries(players).filter(([u]) => inRound(u)).map(([u, p]) => ({ u, name: p.name, q: prog[u] && prog[u].round === meta.round ? prog[u] : null }));
    const mode = MODE();
    if (mode === "ta") return rows.sort((a, b) => ((b.q && b.q.solved) || 0) - ((a.q && a.q.solved) || 0) || ((b.q && b.q.placed) || 0) - ((a.q && a.q.placed) || 0));
    if (mode === "coop") return rows.sort((a, b) => ((b.q && b.q.mine) || 0) - ((a.q && a.q.mine) || 0));
    return rows
      .sort((a, b) => {
        const sa = a.q && score(a.q), sb = b.q && score(b.q);
        if (sa != null && sb != null) return sa - sb; if (sa != null) return -1; if (sb != null) return 1;
        return ((b.q && b.q.placed) || 0) - ((a.q && a.q.placed) || 0);
      });
  }
  // ── 게임 중 채팅: 💬 단추 → ArenaUI 채팅창 (빠른 말 + 입력), 받은 말은 ArenaUI 말풍선 + 💬 배지. 왼쪽 손잡이는 판을 가려서 게임 중엔 숨김 (style.css)
  $("chatBtn").onclick = () => { const t = document.querySelector(".arn-ctab"); if (t) t.click(); $("chatBadge").hidden = true; };

  // ── 관전: 내 판이 끝나면 친구 이름표를 눌러 그 친구 판을 실시간으로 (판 모양은 prog.b)
  let spyU = null, spyKey = "";
  function spyOpen(u) { spyU = u; spyKey = ""; $("spyBox").hidden = false; spyDraw(); }
  function spyDraw() {
    if (!spyU || !G || !meta) return;
    const others = ranking().filter(r => r.u !== R.uid), q = prog[spyU];
    const p = players[spyU];
    if (!p) { $("spyBox").hidden = true; spyU = null; return; }
    // 판(색 묶음): 빨리 풀기는 내 판과 같은 문제, 타임어택은 그 친구가 지금 푸는 문제 (같은 순서 seq[pi])
    let n = G.n, reg = G.reg, key = "me:" + G.n;
    if (MODE() === "ta" && meta.seq && q && q.round === meta.round) { const pid = meta.seq[(q.pi || 0) % meta.seq.length]; ({ n, reg } = NY.decode(NY.variant(bank[meta.cfg.tier][pid], (meta.vs || 0) + (q.pi || 0) + 1))); key = "ta:" + pid; }
    if (spyKey !== key) {
      spyKey = key; let h = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) h += `<div class="c" style="background:${NY.COLORS[reg[r][c] % NY.COLORS.length][0]}"><span class="x">${XSVG}</span><span class="cat">🐱</span></div>`;
      $("spyBoard").innerHTML = h; $("spyBoard").style.cssText = `--n:${n};grid-template-columns:repeat(${n},minmax(0,1fr));grid-template-rows:repeat(${n},minmax(0,1fr))`;
    }
    const b = (q && q.round === meta.round && q.b) || "";
    [...$("spyBoard").children].forEach((el, k) => {
      const ch = b[k] || "0";
      el.classList.toggle("has-cat", ch === "c"); el.classList.toggle("has-x", ch === "x" || ch === "b"); el.classList.toggle("bad", ch === "b");
    });
    const qq = q && q.round === meta.round ? q : null;
    $("spyName").textContent = `👀 ${p.name}`;
    $("spyStat").textContent = !qq ? "준비 중" : qq.ta ? `🧩 ${qq.solved}개 풀었어요 · 지금 🐱 ${qq.placed}/${qq.n}${qq.end ? " · 끝" : ""}` : qq.done ? `✔ 다 찾음 · ${fmt(score(qq))}` : qq.failed ? (qq.gaveUp ? "포기" : "실패") : `🐱 ${qq.placed}/${qq.n} · 🐟 ${3 - (qq.mistakes || 0)}`;
    $("spyPrev").hidden = $("spyNext").hidden = others.length < 2;
  }
  const spyStep = d => { const o = ranking().filter(r => r.u !== R.uid); if (!o.length) return; const i = o.findIndex(r => r.u === spyU); spyOpen(o[(i + d + o.length) % o.length].u); };
  $("spyPrev").onclick = () => spyStep(-1);
  $("spyNext").onclick = () => spyStep(1);
  $("spyClose").onclick = () => { $("spyBox").hidden = true; spyU = null; };
  $("opp").addEventListener("click", e => {
    const el = e.target.closest(".p[data-u]"); if (!el || !G) return;
    if (el.dataset.u === R.uid || MODE() === "coop") return;
    if (!iFinished()) { toast(MODE() === "ta" ? "시간이 끝나면 친구 판을 볼 수 있어요" : "내 판을 끝내면 친구 판을 볼 수 있어요"); return; }
    spyOpen(el.dataset.u);
  });

  // 빨리 풀기에서 상대 소식: 3마리 남으면 경고(테두리 깜빡 + 삑삑), 다 풀거나 실패하면 알림
  let rivalSeen = {};
  function rivalAlerts() {
    if (!R || !meta || meta.phase !== "play" || MODE() !== "race" || !G || myRound !== meta.round) return;
    const key = meta.round + ":" + meta.startAt; if (rivalSeen._k !== key) rivalSeen = { _k: key };
    for (const [u, q] of Object.entries(prog)) {
      if (u === R.uid || !q || q.round !== meta.round || !players[u]) continue;
      const seen = rivalSeen[u] || (rivalSeen[u] = {}), name = players[u].name;
      if (q.done && !seen.done) { seen.done = 1; S("rival"); toast(`🏁 ${name} 다 풀었어요! ${fmt(score(q))}`, 3000); pulse(u); }
      else if (q.failed && !seen.done) { seen.done = 1; toast(q.gaveUp ? `🏳 ${name} 포기했어요` : `😿 ${name} 물고기를 다 잃었어요`, 2500); }
      else if (!q.done && !q.failed && q.n >= 6 && q.n - q.placed <= 3 && q.n - q.placed > 0 && !seen.three && !G.over) {
        seen.three = 1; S("alert"); toast(`⚠️ ${name} ${q.n - q.placed}마리 남았어요!`, 2500);
        bump($("play"), "warn"); pulse(u);
      }
    }
  }
  function pulse(u) { setTimeout(() => { const el = $("opp").querySelector(`.p[data-u="${CSS.escape(u)}"]`); if (el) bump(el, "pulse"); }, 50); }
  function drawOpp() {
    if (!R || !meta || meta.phase !== "play" || !G) return;               // 방을 나간 뒤 늦게 온 알림은 무시
    // 위쪽 얇은 줄: 사람마다 알약 하나 (나도 포함) — 진행 막대 · 남은 물고기 · 끝나면 기록
    const mode = MODE(), can = iFinished() && mode !== "coop";
    $("opp").innerHTML = ranking().map(({ u, name, q }) => {
      const pct = mode === "coop" ? G.cats.size / G.n * 100 : q ? q.placed / q.n * 100 : 0;
      const st = mode === "ta" ? (!q ? "준비" : q.end ? `✔ ${q.solved}개` : `🧩${q.solved}`)
        : mode === "coop" ? (!q ? "준비" : `🐱${q.mine || 0}`)
        : !q ? "준비" : q.done ? `✔ ${fmt(score(q))}` : q.failed ? (q.gaveUp ? "포기" : "실패") : `🐟${3 - (q.mistakes || 0)}${q.hints ? " 💡" + q.hints : ""}`;
      const cls = [u === R.uid ? "me" : "", q && (q.done || q.end) ? "done" : "", q && q.failed && mode === "race" ? "fail" : ""].join(" ");
      return `<div class="p ${cls}${can && u !== R.uid ? " can" : ""}" data-u="${esc(u)}"><span class="av">${esc((name || "?").slice(0, 1))}</span><b>${esc(name)}</b><span class="pb"><i style="width:${pct}%"></i></span><span>${st}</span></div>`;
    }).join("");
  }
  function checkRoundEnd() {
    if (!R || !meta || meta.phase !== "play" || shownRound === meta.round) return;
    const mode = MODE();
    if (mode === "coop") return coopEnd();
    const rk = ranking();
    if (mode === "ta") {
      const late = now() > (meta.endAt || 0) + 4000;                    // 시간이 지났는데 안 끝난 사람(연결 끊김)은 기다리지 않음
      if (!rk.length || !(late || rk.every(r => r.q && r.q.end))) return;
    } else if (!rk.length || !rk.every(r => r.q && (r.q.done || r.q.failed))) return;
    shownRound = meta.round;
    try { recordRound(mode, rk); } catch (e) {}
    const winner = mode === "ta" ? (rk[0].q && rk[0].q.solved > 0 && !(rk[1] && rk[1].q && rk[1].q.solved === rk[0].q.solved && rk[1].q.placed === rk[0].q.placed) ? rk[0] : null) : rk[0].q.done ? rk[0] : null;
    if (isHost && winner && meta.scored !== meta.round) {
      const wins = { ...(meta.wins || {}) }; wins[winner.u] = (wins[winner.u] || 0) + 1;
      R.setMeta({ wins, scored: meta.round });
      try {                                                                  // 기록 실패가 결과창을 막지 않게
        if (glog) glog.matchEnd({ winner: winner.name, results: rk.map(r => { const q = r.q || {}; return mode === "ta" ? { n: r.name, solved: q.solved || 0, failed: q.failed || 0 } : { n: r.name, done: q.done || 0, secs: q.secs ?? null, mistakes: q.mistakes || 0, hints: q.hints || 0 }; }) });
      } catch (e) {}
    }
    const wins = { ...(meta.wins || {}) }; if (winner && meta.scored !== meta.round) wins[winner.u] = (wins[winner.u] || 0) + 1;
    const body = mode === "ta"
      ? `<table class="rank"><tr><th></th><th>이름</th><th>푼 문제</th><th>실패</th><th>승</th></tr>${rk.map((r, i) => {
          const q = r.q || {}; return `<tr><td>${q.solved ? i + 1 : "-"}</td><td>${esc(r.name)}</td><td class="n"><b>${q.solved || 0}</b>개</td><td class="n">${q.failed || 0}</td><td class="n">${wins[r.u] || 0}</td></tr>`; }).join("")}</table>
        <p class="small">${meta.cfg.mins || 3}분 타임어택 · 같은 개수면 마지막 문제를 더 많이 푼 사람이 앞</p>`
      : `<table class="rank"><tr><th></th><th>이름</th><th>기록</th><th>실수</th><th>힌트</th><th>승</th></tr>${rk.map((r, i) =>
      `<tr><td>${r.q.done ? i + 1 : "-"}</td><td>${esc(r.name)}</td><td class="n">${r.q.done ? fmt(score(r.q)) : r.q.gaveUp ? "포기" : "실패"}</td><td class="n">${r.q.mistakes}</td><td class="n">${r.q.hints || 0}</td><td class="n">${wins[r.u] || 0}</td></tr>`).join("")}</table>
      ${meta.cfg.hint === "penalty" ? `<p class="small">힌트 한 번마다 +${PENALTY}초</p>` : ""}`;
    const title = winner ? `${winner.u === R.uid ? "🏆 내가 이겼어요!" : `🏆 ${winner.name} 승리`}` : mode === "ta" ? (rk[0].q && rk[0].q.solved ? "🤝 비겼어요" : "아무도 못 풀었어요") : "모두 실패했어요";
    showRoundRes(title, body);
    S(winner && winner.u === R.uid ? "win" : "lose");
  }
  function showRoundRes(title, body) {
    const last = meta.round >= meta.cfg.rounds;
    const guestNote = isHost ? "" : '<p class="small">방장이 다음 판을 시작하면 바로 넘어가요.</p>';
    roundRes = () => result(last ? `${title} (마지막 판)` : title, body + guestNote, isHost
      ? [last ? null : ["다음 판", () => startRound(true), "primary"], ["대기실로", () => ArenaUI.toLobby()], ["판 보기", () => {}], ["방 나가기", askLeave, "ghost"]]
      : [["판 보기", () => {}, "primary"], ["방 나가기", askLeave, "ghost"]]);
    roundRes();
  }
  // 협동 끝: 같이 다 찾았거나 🐟를 다 썼을 때. 누가 몇 마리 찾았는지(🐱)·몇 번 틀렸는지
  function coopEnd() {
    if (!G || !ctx || !ctx.coop || !G.over || myRound !== meta.round) return;
    shownRound = meta.round;
    const best = (coopInfo && coopInfo.best) || {}, by = {};
    let lastT = 0;
    for (const o of Object.values(best)) if (o.s === "c" || o.s === "b") { const b = by[o.u] || (by[o.u] = { c: 0, b: 0 }); b[o.s]++; lastT = Math.max(lastT, o.t); }
    const hintsAll = Object.values(prog).filter(q => q && q.round === meta.round).reduce((a, q) => a + (q.hints || 0), 0);
    const secs = Math.max(0, ((lastT || now()) - meta.startAt) / 1000) + (meta.cfg.hint === "penalty" ? hintsAll * PENALTY : 0);
    ctx.finalSecs = secs;
    const rows = Object.entries(players).map(([u, p]) => ({ u, name: p.name, c: (by[u] || {}).c || 0, b: (by[u] || {}).b || 0 })).sort((a, b) => b.c - a.c || a.b - b.b);
    const body = `${G.won ? `<p class="round big-num">${fmt(secs)}</p>${hintsAll && meta.cfg.hint === "penalty" ? `<p class="small" style="margin:0">힌트 ${hintsAll}번 · +${hintsAll * PENALTY}초 포함</p>` : ""}` : `<p style="margin:0">고양이 ${G.cats.size}/${G.n}마리까지 찾았어요</p>`}
      <table class="rank"><tr><th>이름</th><th>찾은 🐱</th><th>실수</th></tr>${rows.map(r => `<tr><td>${esc(r.name)}${r.u === R.uid ? " (나)" : ""}</td><td class="n">${r.c}</td><td class="n">${r.b}</td></tr>`).join("")}</table>`;
    if (isHost && glog) try { glog.matchEnd({ mode: "coop", won: G.won, secs: Math.round(secs * 10) / 10, results: rows.map(r => ({ n: r.name, cats: r.c, mistakes: r.b })) }); } catch (e) {}
    const key = `${R.code}:${meta.round}:${meta.startAt}`;
    if (!isCounted(key) && !ctx.spec) { markCounted(key); REC.match(G.won ? 1 : 0, false);   // 구경꾼은 기록 안 함
      // 🏆 공용 랭킹: 협동 (같이 이기고 지는 판이라 상대 전적 없음)
      if (window.GRank && rows.length > 1) try { GRank.result("nyang", { mode: "friend", res: G.won ? "w" : "l", beat: 0 }); } catch (e) {}
      if (G.won) { REC.solved(1); REC.cnt("coopWin"); REC.coop(meta.cfg.tier, secs, G.n); } setTimeout(checkBadges, 1500); }
    showRoundRes(G.won ? "🎉 같이 다 찾았어요!" : "😿 물고기를 다 썼어요", body);
    S(G.won ? "win" : "fail");
  }
  // 판이 끝난 뒤 '방 나가기'는 한 번 더 물어봄 (결과 화면에서 실수로 누르기 쉬워서)
  let roundRes = null;
  $("resPeek").onclick = () => roundRes && roundRes();
  function askLeave() {
    result("방을 나갈까요?", `<p style="margin:0">${isHost ? "방장이 나가면 방이 닫히고 친구들도 모두 나가게 돼요." : "나가면 다시 들어오려면 방 코드가 필요해요."}</p>`,
      [["계속 있기", () => { if (roundRes && meta && shownRound === meta.round) roundRes(); }, "primary"], ["나가기", leaveRoom]]);
  }

  // ══ 기록 · 랭킹 ════════════════════════════════════════════
  // nyang/rec/{pid}: tb/{난이도}=최고 시간(힌트 안 쓴 판) · ta/{난이도_분}=타임어택 최고 개수 · co/{난이도}=협동 최고 시간
  //   sv=푼 문제 수 · pts=대결 승점(이긴 사람 수만큼, 협동 성공 +1) · games · wins · w/{그 주 월요일}/{같은 것} = 이번 주
  // 말이 안 되게 빠른 기록(칸 수 × 0.8초 미만)은 안 남김. ?guest 시험은 test/ 아래로
  const weekKey = (t = Date.now()) => { const d = new Date(t + 9 * 3600e3); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
  const tooFast = (secs, n) => !(secs >= n * 0.8);
  const LEVELS = [[0, "🐣", "아기 고양이"], [10, "🐱", "꼬마 고양이"], [30, "😺", "길냥이"], [60, "😼", "골목대장"], [120, "🐯", "동네 보스"], [250, "🦁", "고양이 왕"], [500, "👑", "전설의 냥"]];
  const GRADES = [[0, "🐾"], [5, "🥉"], [15, "🥈"], [30, "🥇"], [60, "💎"], [100, "👑"]];
  const level = sv => LEVELS.filter(l => (sv || 0) >= l[0]).pop();
  const grade = pts => GRADES.filter(g => (pts || 0) >= g[0]).pop()[1];
  const recRef = () => GME.me && Arena.db() ? Arena.db().ref(`${GME.P}nyang/rec/${GME.me.pid}`) : null;
  const tx = (ref, path, f) => ref.child(path).transaction(f).catch(() => {});
  const minTx = (ref, path, v) => tx(ref, path, cur => cur == null || v < cur ? Math.round(v * 10) / 10 : undefined);
  const maxTx = (ref, path, v) => tx(ref, path, cur => cur == null || v > cur ? v : undefined);
  const addTx = (ref, path, v) => v ? tx(ref, path, cur => (cur || 0) + v) : null;
  const REC = {
    both(f) { const r = recRef(); if (!r) return; const w = weekKey(); f(r, ""); f(r, `w/${w}/`); },
    best(tier, secs, n) { if (tooFast(secs, n)) return; this.both((r, p) => minTx(r, `${p}tb/${tier}`, secs)); },
    ta(tier, mins, cnt) { if (!cnt) return; this.both((r, p) => maxTx(r, `${p}ta/${tier}_${mins}`, cnt)); const m = myRec(); if (m) { m.ta = m.ta || {}; m.ta[`${tier}_${mins}`] = Math.max(m.ta[`${tier}_${mins}`] || 0, cnt); } },
    coop(tier, secs, n) { if (tooFast(secs, n)) return; this.both((r, p) => minTx(r, `${p}co/${tier}`, secs)); },
    solved(k) { if (!k) return; this.both((r, p) => addTx(r, `${p}sv`, k)); const m = myRec(); if (m) m.sv = (m.sv || 0) + k; },   // 화면엔 바로 반영
    match(pts, won) { this.both((r, p) => { addTx(r, `${p}pts`, pts); addTx(r, `${p}games`, 1); addTx(r, `${p}wins`, won ? 1 : 0); }); const m = myRec(); if (m) { m.pts = (m.pts || 0) + pts; m.games = (m.games || 0) + 1; m.wins = (m.wins || 0) + (won ? 1 : 0); } },
    stage(k, st) {
      const loc = localStars(); if ((loc[k] || 0) < st) { loc[k] = st; store.set("stageStars", loc); }
      const r = recRef(); if (r) maxTx(r, `st/s${k}`, st);
      const m = myRec(); if (m) { m.st = m.st || {}; m.st["s" + k] = Math.max(m.st["s" + k] || 0, st); }
    },
    cnt(key) { const r = recRef(); if (r) addTx(r, `cnt/${key}`, 1); const m = myRec(); if (m) { m.cnt = m.cnt || {}; m.cnt[key] = (m.cnt[key] || 0) + 1; } },
    ach(id) { const r = recRef(); if (r) r.child(`ach/${id}`).set(firebase.database.ServerValue.TIMESTAMP).catch(() => {}); },
    day(key, v, n) {                                                         // 📅 오늘의 퍼즐: 그날 처음 성공한 판만 (폰에 먼저, 서버는 말이 안 되게 빠른 기록 빼고)
      const loc = store.get("day", {});
      if (!loc[key]) { loc[key] = v; store.set("day", Object.fromEntries(Object.entries(loc).sort().slice(-400))); }
      const m = myRec(); if (m) { m.day = m.day || {}; if (!m.day[key]) m.day[key] = v; }
      const r = recRef(); if (r && !tooFast(v.s, n)) tx(r, `day/${key}`, cur => cur && cur.s ? undefined : v);
    },
    bday(key, v, n) {                                                        // 🌗 오늘의 반반 (같은 모양)
      const loc = store.get("bday", {});
      if (!loc[key]) { loc[key] = v; store.set("bday", Object.fromEntries(Object.entries(loc).sort().slice(-400))); }
      const m = myRec(); if (m) { m.bday = m.bday || {}; if (!m.bday[key]) m.bday[key] = v; }
      const r = recRef(); if (r && !(v.s >= n * n * 0.25)) return;            // 말이 안 되게 빠른 기록은 폰에만
      if (r) tx(r, `bday/${key}`, cur => cur && cur.s ? undefined : v);
    },
  };
  // 대결 한 판 끝: 내가 이긴 사람 수만큼 승점 (같은 판을 두 번 세지 않게)
  const counted = new Set((() => { try { return JSON.parse(sessionStorage.getItem("nyang.counted") || "[]"); } catch (e) { return []; } })());
  const isCounted = k => counted.has(k);
  const markCounted = k => { counted.add(k); try { sessionStorage.setItem("nyang.counted", JSON.stringify([...counted].slice(-30))); } catch (e) {} };
  function recordRound(mode, rk) {
    const key = `${R.code}:${meta.round}:${meta.startAt}`; if (isCounted(key)) return; markCounted(key);
    const tier = meta.cfg.tier, mine = rk.find(r => r.u === R.uid), q = mine && mine.q;
    if (!q) return;
    let beat = 0;
    if (mode === "ta") beat = rk.filter(r => r.u !== R.uid && ((r.q && r.q.solved) || 0) < (q.solved || 0)).length;
    else if (q.done) beat = rk.length - 1 - rk.indexOf(mine);
    REC.match(beat, beat > 0 && beat === rk.length - 1);
    if (window.GRank && rk.length > 1) try {                                 // 🏆 공용 랭킹: 사람끼리 한 판 (둘 이상일 때만)
      const dn = r => !!(r.q && r.q.done), sv = r => (r.q && r.q.solved) || 0, pl = r => (r.q && r.q.placed) || 0, mi = rk.indexOf(mine);
      const vs = o => mode === "ta"
        ? (sv(mine) === sv(o) ? (sv(mine) ? (pl(mine) === pl(o) ? "d" : pl(mine) > pl(o) ? "w" : "l") : "d") : sv(mine) > sv(o) ? "w" : "l")
        : (dn(mine) && !dn(o) ? "w" : !dn(mine) && dn(o) ? "l" : dn(mine) ? (mi < rk.indexOf(o) ? "w" : "l") : "d");
      const opp = rk.filter(r => r.u !== R.uid).map(r => ({ pid: (players[r.u] || {}).pid, uid: r.u, res: vs(r) }));
      const res = opp.every(o => o.res === "w") && (mode === "ta" ? sv(mine) > 0 : dn(mine)) ? "w" : opp.some(o => o.res === "l") ? "l" : "d";
      GRank.result("nyang", { mode: "friend", res, beat: res === "w" ? opp.length : beat, score: mode === "ta" ? sv(mine) : undefined, opp: opp.filter(o => o.pid) });
    } catch (e) {}
    if (mode === "ta") { REC.ta(tier, meta.cfg.mins || 3, q.solved || 0); REC.solved(q.solved || 0); }
    else if (q.done) { REC.solved(1); if (!q.hints) REC.best(tier, q.secs, q.n); }
    setTimeout(checkBadges, 1500);
  }

  // 🏆 랭킹 탭: 위는 공용 랭킹(GRank.mount — 판·승패·승점·친구/AI 판·상대 전적, 11-01 베니 님 "기록은 메인 한 곳") ·
  //   아래는 공용 랭킹에 없는 퍼즐 기록(⏱ 타임어택 최고 개수 · 🏁 최고 시간)만 따로 — 판 수 숫자가 아니라 퍼즐 기록
  const RK = Object.assign({ kind: "ta", period: "week", tier: "easy", mins: 3 }, store.get("rk2", {}));
  if (RK.kind !== "ta" && RK.kind !== "tb") RK.kind = "ta";                  // 예전 저장값(sv·pts)은 공용 랭킹으로 옮겼음
  const RK_KINDS = [["ta", "⏱", "타임어택 최고"], ["tb", "🏁", "최고 시간"]];
  let rkData = null, rkAdmin = false;
  async function loadRec(force) {
    if (rkData && !force) return rkData;
    await Arena.init();
    const db = Arena.db(); if (!db) throw new Error("랭킹은 인터넷에 연결된 실제 사이트에서 보여요");
    const [rec, people] = await Promise.all([db.ref(`${GME.P}nyang/rec`).get(), GME.loadAll(db)]);
    return (rkData = { rec: rec.val() || {}, names: Object.fromEntries(people.map(p => [p.pid, p.n])) });
  }
  const myRec = () => (rkData && GME.me && (rkData.rec[GME.me.pid] || (rkData.rec[GME.me.pid] = {}))) || null;
  const rkSet = p => { Object.assign(RK, p); store.set("rk2", RK); drawRank(false); };
  async function drawRank(reload = true) {
    drawMe(); loadGM().then(drawMe);
    if (reload && window.GRank) Arena.init().then(() => GRank.mount($("rkShared"), "nyang")).catch(() => {});   // 탭에 들어올 때마다 새로
    $("rkKind").innerHTML = RK_KINDS.map(([v, ic, l]) => `<button data-v="${v}" aria-pressed="${RK.kind === v}"><i>${ic}</i>${l}</button>`).join("");
    for (const b of $("rkKind").children) b.onclick = () => rkSet({ kind: b.dataset.v });
    if (reload || !rkData) {
      $("rkList").innerHTML = '<li class="none">불러오는 중…</li>';
      try { await loadRec(true); rkAdmin = !!Arena.isAdmin; }
      catch (e) { $("rkList").innerHTML = `<li class="none">${esc(Arena.db() ? "못 불러왔어요 (" + e.message + ")" : e.message)}</li>`; return; }
    }
    // 타임어택 시간(2·3·5분): 이 난이도에 3분 말고 다른 시간 기록이 있을 때만 고르게
    const minsHave = new Set([3]);
    if (RK.kind === "ta") for (const r0 of Object.values(rkData.rec)) for (const k of Object.keys(r0.ta || {})) { const [t, m] = k.split("_"); if (t === RK.tier) minsHave.add(+m); }
    if (!minsHave.has(RK.mins)) RK.mins = 3;
    const chips = (el, items, cur, key) => { $(el).innerHTML = items.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join(""); for (const b of $(el).children) b.onclick = () => rkSet({ [key]: key === "mins" ? +b.dataset.v : b.dataset.v }); };
    chips("rkTier", TIERS.map(t => [t.id, t.name]), RK.tier, "tier");
    chips("rkMins", RK.kind === "ta" && minsHave.size > 1 ? [...minsHave].sort().map(m => [m, m + "분"]) : [], RK.mins, "mins");
    const rows = [];
    for (const [pid, r] of Object.entries(rkData.rec)) {
      const name = rkData.names[pid]; if (!name) continue;
      const v = RK.kind === "ta" ? (r.ta || {})[`${RK.tier}_${RK.mins}`] : (r.tb || {})[RK.tier];
      if (v == null || v === 0) continue;
      rows.push({ pid, name, v });
    }
    rows.sort((a, b) => RK.kind === "tb" ? a.v - b.v : b.v - a.v);
    const fmtV = v => RK.kind === "tb" ? fmt(v) : `${v}개`;
    const myPid = GME.me && GME.me.pid, top = rows.slice(0, 20), meI = rows.findIndex(r => r.pid === myPid);
    const li = (r, i) => `<li class="${r.pid === myPid ? "me" : ""}"><span class="rkn">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span><span class="inf"><b>${esc(r.name)}</b></span><b class="rkv">${fmtV(r.v)}</b>${rkAdmin ? `<button class="del" data-del="${esc(r.pid)}" title="퍼즐 기록 지우기 (관리자)">🗑</button>` : ""}</li>`;
    $("rkList").innerHTML = rows.length ? top.map(li).join("") + (meI >= 20 ? `<li class="none">…</li>${li(rows[meI], meI)}` : "")
      : '<li class="none">아직 기록이 없어요. 첫 기록을 남겨 보세요!</li>';
    $("rkNote").textContent = { ta: "타임어택으로 한 번에 푼 가장 많은 문제 수 (판 수·승패와는 별개)", tb: "힌트 없이 다 푼 가장 빠른 시간 (판 수·승패와는 별개)" }[RK.kind];
    for (const b of $("rkList").querySelectorAll("[data-del]")) b.onclick = async () => {
      const n = rkData.names[b.dataset.del]; if (!confirm(`${n} 의 냥도쿠 퍼즐 기록(시간·타임어택·배지)을 모두 지울까요? (공용 랭킹 판·승패는 그대로)`)) return;
      await Arena.db().ref(`${GME.P}nyang/rec/${b.dataset.del}`).remove(); toast("지웠어요"); drawRank();
    };
  }
  // 내 정보 한 줄 (랭킹 창 위). 판·승은 공용 랭킹 숫자. 이름 바꾸기는 아케이드 프로필에서
  function drawMe() {
    const n = myName();
    if (!n) { $("meCard").innerHTML = '<span>이름을 정하면 랭킹에 올라가요</span>'; return; }
    const sv = solvedN(), lv = level(sv), nx = LEVELS.find(l => l[0] > sv), a = gm && gm.all;
    $("meCard").innerHTML = `<span class="lv">${lv[1]}</span><span><b>${esc(n)}</b> · ${lv[2]}${nx ? ` <span class="small">(다음 칭호까지 ${nx[0] - sv}판)</span>` : ""}</span><span style="margin-left:auto;white-space:nowrap">${a ? `${grade(gm.f.p)} ${a.n}판 ${a.w}승` : ""}</span>`;
  }

  // ── 시작
  setAutoX(autoX);
  Arena.init().then(() => { const db = Arena.db(); return db ? GME.ensure(db) : null; }).then(() => { drawMe(); drawSoloProg(true); }).catch(() => {});   // 처음 오면 이름부터 (시험 화면은 건너뜀)
  bankP.then(() => {
    drawTiers();
    if (window.ArenaUI) ArenaUI.checkUrl(() => openFriend());
  }).catch(e => { $("tiers").textContent = "퍼즐을 못 불러왔어요: " + e.message; });
  window.__ny = { get G() { return G; }, get TA() { return TA; }, get meta() { return meta; }, get prog() { return prog; }, get myRound() { return myRound; }, NY,   // 점검용
    dailyInfo, kstDay, dayBoard, dayTops, streakOf, bestStreak, setRk: d => { rkData = d; if (soloMode === "day") drawDay(); } };
})();

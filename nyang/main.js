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
  // 판 묶음 더하기 (11-08 지민 님 단계 973 — 고수 1,000판이 1,091단계에서 한 바퀴): bank/{난이도}-{c}.json 에 1,000판씩,
  //   bank/index.json = 묶음 몇 개 (nyang/tools/bank_topup.py 가 제일 앞선 사람 단계를 보고 모자라면 저절로 더 만들어 올림).
  //   번호는 이어 붙임 (c×1000 + i) → 폰에 저장된 '푼 판 번호'가 그대로 맞음. 오늘의 퍼즐 · 친구 방은 0번 묶음만 (모두 같은 판 · 옛 화면과도 같게)
  const CHUNK = 1000, chunkP = {};
  let bankIdx = {};
  const bankIdxP = fetch("bank/index.json?d=" + new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)).then(r => r.ok ? r.json() : {}).then(j => (bankIdx = (j && j.tiers) || {})).catch(() => {});
  const chunksOf = tier => 1 + (+bankIdx[tier] || 0);
  function loadChunks(tier, upto) {   // 1..upto 번 묶음을 차례로 bank[tier] 뒤에 붙임 (못 받으면 있는 판으로)
    let p = bankP;
    for (let c = 1; c <= Math.min(upto, chunksOf(tier) - 1); c++) {
      p = p.then(() => chunkP[tier + c] || (chunkP[tier + c] = fetch(`bank/${tier}-${c}.json?v=1`).then(r => r.json()).then(a => { if (bank[tier].length === c * CHUNK && a.length === CHUNK) bank[tier].push(...a); })));
    }
    return p.catch(() => {});
  }

  // ── 기록 (관리자만 읽음)
  let glog = null;
  const logInit = () => { if (!glog && Arena.db()) glog = GLOG(() => Arena.db(), "nyang"); return glog; };

  // ── 화면 바꾸기
  // 11-11 지민 님 아이폰 터치 어긋남: #home 을 아래로 스크롤해 [시작!] 을 누른 뒤 position:fixed(.play) + overflow:hidden 으로 바뀔 때
  //   scrollY 가 남아 있으면 iOS 사파리(WebKit)에서 화면에 보이는 판과 터치 판정 좌표가 위아래로 밀림 → playing 전환 전후로 스크롤 0 고정
  const resetScroll = () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); document.documentElement.scrollTop = document.body.scrollTop = 0; };
  const show = id => {
    if (id !== "home") resetScroll();
    for (const s of ["home", "play", "bplay", "zplay"]) if ($(s)) $(s).hidden = s !== id;
    document.body.classList.toggle("playing", id === "play");
    if (id === "play") { resetScroll(); requestAnimationFrame(() => { resetScroll(); fitBoard(true); }); }
  };
  // 판 크기 = 남은 공간(가로·세로 중 작은 쪽) — 휴대폰에서 위아래가 잘리지 않게
  // 휴대폰 주소창이 나타났다 사라지며 높이가 조금씩 바뀔 때마다 판이 출렁이지 않게: 판이 바뀌었거나, 너비가 바뀌었거나, 높이가 크게(80px+) 바뀔 때만 다시 맞춤
  let fitKey = "", fitW = 0, fitH = 0, fitGp = 6;
  function fitBoard(force) {
    const w = $("boardwrap"), b = $("board");
    if (!w || $("play").hidden) return;
    const cw = w.clientWidth, ch = w.clientHeight, key = G ? G.n + ":" + G.reg.join("|").length : "";
    if (force !== true && key === fitKey && cw === fitW && Math.abs(ch - fitH) < 80) return;
    fitKey = key; fitW = cw; fitH = ch;
    const s = Math.floor(Math.min(cw, ch, 600));
    b.style.setProperty("--bs", s + "px");
    if (G) { fitGp = Math.max(2, Math.round(s / G.n * 0.07)); b.style.setProperty("--gp", fitGp + "px"); }   // 칸 사이 간격도 판 크기에 맞게
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
    drag = dragLast = null; lastTap = { k: -1, t: 0 };   // 옛 판의 끌기 · 두 번 톡 상태를 새 판에 들고 가지 않음
    paint();
  }
  function paint() {
    const look = new Set(hint && hintStage >= 1 ? (hintStage >= 2 && hint.look2 ? hint.look2 : hint.look) : []), tgt = new Set(hint && hintStage >= 2 ? hint.target : []);
    const ghost = hint && hintStage >= 2 && hint.ghost ? hint.ghost : [];                 // 가정해 보기: 놓게 되는 칸에 ①②③
    for (const el of $("board").children) {
      const k = +el.dataset.k;
      const cat = G.cats.has(k), bad = G.bad.has(k), x = G.xs.has(k);
      // 칸 안의 ✕·🐱는 미리 넣어 두고 보였다 숨겼다만 함 (✕를 끌어 칠할 때 다른 고양이가 다시 그려지며 깜빡이지 않게)
      el.classList.toggle("has-cat", cat);
      el.classList.toggle("has-x", !cat && (x || bad));
      el.classList.toggle("bad", bad);
      el.classList.toggle("look", look.has(k) && !tgt.has(k));
      el.classList.toggle("tgt", tgt.has(k));
      const gi = ghost.indexOf(k), gv = gi >= 0 ? "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"[gi] || "" : "";
      if ((el.dataset.g || "") !== gv) { if (gv) el.dataset.g = gv; else delete el.dataset.g; }
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
  // 누르기: 한 번 = ✕ 켜고 끔, 0.4초 안에 같은 칸 같은 자리 두 번 = 🐱 (앱과 같게). 누른 채 끌면 같은 방향으로 ✕ 칠하기
  // 11-08 지민 님 아이폰 '옆 칸이 눌림 · 두 번 안 눌렀는데 🐱' + 11-11 '실제로 누르는 곳과 다른 데가 눌림':
  //   1) elementFromPoint 대신 #board 사각형 대비 상대좌표로 판정 → 3~4px 틈(gap)·둥근 모서리 무반응 구간 제거 & WebKit 뷰포트 오차 방지
  //   2) 손가락 터치(touch)는 손톱 아래 살이 닿고 칸 아래 3px 입체 그림자가 있어 시선보다 아래(+Y)로 찍힘 → 약 3px 위쪽으로 보정
  //   3) 경계선 근처에서 빠르게(0.32초 안) 두 번 톡톡 누를 때 두 번째 탭이 1~2px 옆 칸으로 넘어가도 아주 가까우면(8.5px·칸 0.25 안) 첫 칸 🐱 로 연결
  let lastTap = { k: -1, t: 0 }, drag = null, dragLast = null;
  // 화면 좌표 → 칸 { k, r, c, el, fx, fy }. fx·fy = 그 칸 안에서의 위치 (0~1, 틈에 닿으면 0 아래나 1 위)
  function boardAt(x, y, isTouch) {
    if (!G) return null;
    const b = $("board"), br = b.getBoundingClientRect(), n = G.n;
    if (!br.width || x < br.left || x > br.right || y < br.top || y > br.bottom) return null;
    const gp = fitGp || 6, pitch = (br.width - gp) / n, cs = pitch - gp;
    const dy = Math.min(3, cs * .085, gp * .5 + 1.2);
    const ty = isTouch ? Math.max(br.top + gp * .5 + 1, y - dy) : y;
    const uc = (x - br.left - gp * .5) / pitch, ur = (ty - br.top - gp * .5) / pitch;
    const c = Math.max(0, Math.min(n - 1, Math.floor(uc))), r = Math.max(0, Math.min(n - 1, Math.floor(ur)));
    const el = b.children[r * n + c];
    if (!el || +el.dataset.k !== r * n + c) return null;
    return { k: r * n + c, r, c, el, fx: (x - (br.left + gp + c * pitch)) / cs, fy: (ty - (br.top + gp + r * pitch)) / cs };
  }
  const inB = (f, m) => f > m && f < 1 - m;
  const evT = e => { const now = performance.now(), s = e && e.timeStamp; return s > 0 && s <= now + 5 && now - s < 2000 ? s : now; };   // 손가락이 닿은 때 (값이 이상한 브라우저는 지금 시각)
  function boardPick(x, y, isTouch, inner) { const p = boardAt(x, y, isTouch); return p && (!inner || (inB(p.fx, .2) && inB(p.fy, .2))) ? p.el : null; }
  $("board").addEventListener("pointerdown", e => {
    if (!G || G.over || (ctx && ctx.spec)) return;
    if (drag && !e.isPrimary) return;                                           // 누르고 있는 손가락 말고 다른 손가락(손바닥)
    const p0 = boardAt(e.clientX, e.clientY, e.pointerType === "touch"); if (!p0) return;
    let el = p0.el;
    e.preventDefault();
    let k = +el.dataset.k;
    const t = evT(e), cs = el.getBoundingClientRect().width || 32, dt = t - lastTap.t;
    // 끌다가 손가락이 잠깐 떨어졌다 바로(0.25초 안) 뗀 자리 근처에 다시 닿으면: 새로 누른 게 아니라 끌기를 이어 감
    //   (안 그러면 방금 친 ✕가 지워지고, 이어서 끄는 동안 ✕를 지우는 쪽으로 뒤집힘)
    if (dragLast && t - dragLast.t < 250 && Math.hypot(e.clientX - dragLast.x, e.clientY - dragLast.y) < cs * .7) {
      const d0 = dragLast, prevX = G.xs.has(k); dragLast = null;
      drag = { id: e.pointerId, on: d0.on, seen: d0.seen, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, cs, moved: true, last: k, ax: d0.ax, hops: 0, vx: 0, vy: 0 };
      if (!drag.seen.has(k)) { drag.seen.add(k); G.setX(k, drag.on); if (G.xs.has(k) !== prevX) S(drag.on ? "x" : "unx"); }
      lastTap = { k, t, prevX, x: e.clientX, y: e.clientY };                    // 그 자리를 바로 한 번 더 누르면 🐱 는 그대로
      afterMove("x", k); return;
    }
    dragLast = null;
    const dist = lastTap.k >= 0 ? Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) : 1e9;
    const adj = lastTap.k >= 0 && Math.abs(Math.floor(lastTap.k / G.n) - Math.floor(k / G.n)) <= 1 && Math.abs(lastTap.k % G.n - k % G.n) <= 1;
    if (k !== lastTap.k && adj && dt < 340 && dist < (fitGp || 4) + Math.min(9, cs * .24) && !G.cats.has(lastTap.k) && !G.bad.has(lastTap.k)) {
      k = lastTap.k; el = $("board").children[k] || el;
    }
    // 두 번 → 앞에서 바꾼 ✕를 되돌리고 고양이. 11-12 지민 님 아이폰 '두 번 눌러도 ✕ 가 풀렸다 됐다만 함':
    //   ① 예전엔 두 번째가 첫 번째에서 14px(칸 0.45) 넘게 떨어지면 따로 누른 것으로 봄 → 엄지로 빠르게 두 번이면 자주 넘음.
    //      이제 같은 칸 안쪽(가장자리 18% 뺀 곳)에 닿으면 거리와 상관없이 두 번으로 침. 맨 가장자리(옆 칸을 누르려던 것)만 거리로 가름 (11-08)
    //   ② 시간은 폰이 처리한 때가 아니라 손가락이 닿은 때로 잼 (evT) — 폰이 잠깐 바쁘면 0.4초를 넘기던 것
    if (lastTap.k === k && dt < 400 && (dist < Math.max(14, cs * .45) || (p0.k === k && inB(p0.fx, .18) && inB(p0.fy, .18)))) {
      const prevX = lastTap.prevX;
      lastTap = { k: -1, t: 0 }; drag = null;
      if (G.xs.has(k) !== prevX) G.toggleX(k);
      afterMove(G.place(k), k); return;
    }
    const prevX = G.xs.has(k);
    if (G.toggleX(k)) S(G.xs.has(k) ? "x" : "unx");
    lastTap = { k, t, prevX, x: e.clientX, y: e.clientY };
    drag = { id: e.pointerId, on: G.xs.has(k), seen: new Set([k]), x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, cs, moved: false, last: k, ax: null, hops: 0, vx: 0, vy: 0 };
    afterMove("x", k);
  });
  // 끌기 한 점 (11-12 베니 님 '✕ 치려고 쭉 끌면 종종 끊겨서 표시됨'). 예전엔 손가락이 칸 가운데(60%)에 찍힌 순간만 ✕ 를 쳐서
  //   빠르게 끌면 칸을 건너뛰고, 줄 가장자리로 살짝 흘러가면 그 구간이 통째로 빠졌음. 지금은
  //   1) 앞 점과 지금 점 사이를 칸 0.3 간격으로 채워서 봄 → 빠르게 끌어도 안 빠짐
  //   2) 가로·세로로 끄는 중이면 옆줄 가장자리(30%)에 걸쳐도 끌던 줄에 침. 옆줄 안쪽까지 들어와야 줄을 바꿈
  //   3) 끄는 방향으로는 그대로 칸 안쪽(가운데 60%)에 들어와야 침 — 톡 하다 옆 칸으로 살짝 밀린 것과 가름 (11-08)
  function dragStep(x, y, isTouch) {
    const p = boardAt(x, y, isTouch); if (!p) return false;
    const n = G.n, lr = Math.floor(drag.last / n), lc = drag.last % n;
    let k = p.k;
    const flat = Math.abs(drag.vy) < Math.abs(drag.vx) * .7, steep = Math.abs(drag.vx) < Math.abs(drag.vy) * .7;   // 지금 손가락이 가는 쪽 (가로 · 세로)
    if (drag.ax === "h") {
      if (!inB(p.fx, .2)) return false;
      if (Math.abs(p.r - lr) === 1 && (p.r > lr ? p.fy < .3 : p.fy > .7)) { if (!flat) return false; k = lr * n + p.c; }   // 옆줄의 이쪽 가장자리: 가로로 가는 중이면 끌던 줄, 꺾는 중이면 더 들어올 때까지 기다림
    } else if (drag.ax === "v") {
      if (!inB(p.fy, .2)) return false;
      if (Math.abs(p.c - lc) === 1 && (p.c > lc ? p.fx < .3 : p.fx > .7)) { if (!steep) return false; k = p.r * n + lc; }
    }
    else if (!inB(p.fx, .2) || !inB(p.fy, .2)) return false;
    if (k === drag.last) return false;
    const r = Math.floor(k / n), c = k % n;
    drag.ax = r === lr ? "h" : c === lc ? "v" : null; drag.last = k; drag.hops++;
    if (drag.seen.has(k)) return false;
    drag.seen.add(k); lastTap = { k: -1, t: 0 };
    const was = G.xs.has(k); G.setX(k, drag.on); if (G.xs.has(k) !== was) S(drag.on ? "x" : "unx");
    return true;
  }
  window.addEventListener("pointermove", e => {
    if (!drag || !G || G.over || e.pointerId !== drag.id) return;
    const isT = e.pointerType === "touch";
    let evs = [e]; try { const ce = e.getCoalescedEvents && e.getCoalescedEvents(); if (ce && ce.length) evs = ce; } catch (err) {}   // 브라우저가 한 번에 묶어 준 중간 점들
    let hit = -1;
    for (const ev of evs) {
      const x = ev.clientX, y = ev.clientY;
      if (!drag.moved) {
        const dx = x - drag.x, dy = y - drag.y;
        if (Math.hypot(dx, dy) < drag.cs * .5) continue;
        drag.moved = true; drag.ax = Math.abs(dx) >= Math.abs(dy) * 1.5 ? "h" : Math.abs(dy) >= Math.abs(dx) * 1.5 ? "v" : null;
      }
      drag.vx = drag.vx * .5 + (x - drag.px) * .5; drag.vy = drag.vy * .5 + (y - drag.py) * .5;
      const steps = Math.max(1, Math.ceil(Math.hypot(x - drag.px, y - drag.py) / (drag.cs * .3)));
      for (let i = 1; i <= steps; i++) if (dragStep(drag.px + (x - drag.px) * i / steps, drag.py + (y - drag.py) * i / steps, isT)) hit = drag.last;
      drag.px = x; drag.py = y;
    }
    if (hit >= 0) afterMove("x", hit);
  });
  const dragEnd = e => {
    if (!drag || e.pointerId !== drag.id) return;
    dragLast = drag.hops ? { t: evT(e), k: drag.last, on: drag.on, seen: drag.seen, ax: drag.ax, x: drag.px, y: drag.py } : null;
    drag = null;
  };
  window.addEventListener("pointerup", dragEnd);
  window.addEventListener("pointercancel", dragEnd);
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
    $("hintText").textContent = hint.ask || "반짝이는 곳을 보세요. 여기서 알 수 있는 게 있어요.";   // 1단계: 답 대신 스스로 찾아보게 하는 물음
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
  let gm = store.get("gm", null);
  const solvedN = () => (gm && gm.a && gm.a.w) || 0;
  async function loadGM() {
    if (!window.GRank) return gm;
    try {
      if (typeof navigator === "undefined" || navigator.onLine !== false) {
        await Promise.race([Arena.init(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))]).catch(() => {});
      }
      const m = await GRank.mine("nyang");
      if (m) { gm = m; store.set("gm", { all: m.all, f: m.f, a: m.a }); }
    } catch (e) {}
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
      result("⏱ 시간 끝!", `<p class="round big-num">${ta.solved}개</p><p class="small" style="margin:0">${TA_SOLO_MIN}분 동안 푼 문제${ta.failed ? ` · 실패 ${ta.failed}` : ""}${best && ta.solved ? " · <b style='color:var(--good)'>최고 기록!</b>" : bs[ta.tier] ? ` · 최고 ${bs[ta.tier]}개` : ""}</p><div id="resRank">${taResRank(ta.tier)}</div>${cheerLine()}`,
        [["한 번 더", () => playTA(ta.tier), "primary"], ["난이도 고르기", goHome]]);
      if (myName()) setTimeout(() => loadRec(true).then(() => { const e = $("resRank"); if (e && !$("resBox").hidden) e.innerHTML = taResRank(ta.tier); }).catch(() => {}), 1500);   // 친구 새 기록까지 (내 기록이 서버에 올라간 뒤)
    } else { sendProg(); toast("⏱ 시간 끝! 다른 사람을 기다리는 중…", 3000); checkRoundEnd(); }
  }
  // 타임어택 결과창: 이번 주 친구 순위 (나 몇 등 · 1등과 몇 개 차이)
  function taResRank(tier) {
    const rows = taRows(tier), me = rows.findIndex(x => x.pid === myPid()), T = TIERS.find(t => t.id === tier);
    if (!rows.length || !myName()) return "";
    const gap = me > 0 ? rows[0].v - rows[me].v : 0;
    const head = me === 0 ? (rows.length > 1 ? `🥇 이번 주 <b>1등</b>! (2등 ${esc(rows[1].name)} ${rows[1].v}개)` : "🥇 이번 주 첫 기록!") : me > 0 ? `이번 주 <b>${me + 1}등</b> · 1등 ${esc(rows[0].name)}까지 ${gap + 1}개 더` : "";
    return `<p class="cheer" style="margin:0">${head}</p><p class="small" style="margin:0">🏆 이번 주 친구 순위 · ${T.em} ${T.label} ${TA_SOLO_MIN}분</p>${rankList(rows, taVal, 4)}`;
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
  function stageInfo(k) {   // 1,000단계마다 다음 묶음 (0번 묶음 안은 예전과 같은 판), 묶음이 모자라면 처음 묶음부터 다시 (모양은 단계마다 다름)
    const tier = stageTier(k), j = k - stageBase[tier] - 1, c = Math.floor(j / CHUNK) % chunksOf(tier);
    return { tier, chunk: c, idx: c * CHUNK + (j % CHUNK * 7919 + 101) % Math.min(CHUNK, bank[tier].length), vs: k * 7919 + 13 };
  }
  const SKINS = [[0, "🐱"], [10, "🐈"], [20, "🐈‍⬛"], [35, "😺"], [50, "🐯"], [70, "🦁"], [90, "🐆"], [120, "😻"]];
  const localStars = () => store.get("stageStars", {});
  function stageStars() {                                                    // 폰에 저장 + 서버 기록 중 높은 쪽
    const m = myRec(), loc = localStars(), out = { ...loc };
    if (m && m.st) for (const [k0, v] of Object.entries(m.st)) { const k = String(k0).replace(/^s/, ""); if (v) out[k] = Math.max(out[k] || 0, v); }   // 서버 키는 s1, s2 … (숫자 키는 배열이 돼서)
    return out;
  }
  const maxStage = () => Math.max(0, ...Object.keys(stageStars()).map(Number));
  const skin = () => { const sk = store.get("skin", "🐱"), ok = SKINS.filter(x => x[0] <= maxStage()).map(x => x[1]); return ok.includes(sk) ? sk : "🐱"; };
  // 🎁 보너스 판 (11-06 베니 님 '게임 중간중간' — 벤치마킹: Candy Crush · Two Dots 특별 판): 5단계마다 🌗 반반 · 🐾 산책 번갈아
  //   그 단계를 깨면 열림 · 단계마다 정해진 판(씨앗) · 별은 store bonus{b5|z10: 별} · 안 해도 진행은 그대로
  const bonusOf = k => (k % 5 ? null : k % 10 === 5 ? "b" : "z");
  function playBonus(k) {
    const t = bonusOf(k), ex = { bonus: k, seed: (Math.imul(k + 2027, 2654435761) >>> 0) || 1 }, tier = stageTier(k);
    if (t === "b") playBB(tier, null, ex); else playZZ(tier, null, ex);
  }
  function bonusEnd(t, k, st, body) {
    const all = store.get("bonus", {}), key = t + k, before = all[key] || 0;
    if (st > before) { all[key] = st; store.set("bonus", all); }
    REC.cnt("bonus");
    result(`🎁 ${k}단계 보너스 성공!`, `${body}${st > before && before ? `<p class="cheer">⭐ 별이 ${before}개 → ${st}개</p>` : !before ? `<p class="cheer">🎁 보너스 별 ${st}개를 모았어요</p>` : ""}`,
      [["🗺 지도", goHome, "primary"], ["다시 (⭐ 더 받기)", () => playBonus(k)]]);
    setTimeout(checkBadges, 1200);
  }
  function playStage(k) {
    if (k > maxStage() + 1) { toast("앞 단계를 먼저 깨 주세요"); return; }
    const j = k - stageBase[stageTier(k)] - 1;
    if (j < CHUNK) { const s = stageInfo(k); playSolo(s.tier, s.idx, s.vs, k); return; }
    bankIdxP.then(() => { const s = stageInfo(k); return loadChunks(s.tier, s.chunk).then(() => { if (bank[s.tier][s.idx]) playSolo(s.tier, s.idx, s.vs, k); else toast("판을 못 받았어요 — 인터넷을 확인해 주세요"); }); });
  }
  function drawStages() {
    const st = stageStars(), top = maxStage(), cur = top + 1;
    const from = Math.max(1, cur - 5), to = cur + 6;
    let h = `<div class="stage-path" id="stagePath">`;
    for (let k = to; k >= from; k--) {                                       // 위가 앞으로 갈 길 (아래에서 위로 올라감)
      const s = st[k] || 0, lock = k > cur, side = ["l", "c", "r", "c"][k % 4];
      const mark = k === stageBase[stageTier(k)] + 1 && k > 1 ? `<div class="stage-mark">${TIERS.find(t => t.id === stageTier(k)).name} 시작!</div>` : "";
      const gift = SKINS.find(x => x[0] === k), bt = bonusOf(k), bs = bt ? (store.get("bonus", {})[bt + k] || 0) : 0;
      const bonus = bt ? `<button type="button" class="bonus${k <= top ? "" : " lock"}${bs ? " done" : ""}" data-bk="${k}" data-bt="${bt}" aria-label="${k}단계 보너스"${k <= top ? "" : " disabled"}>${bt === "b" ? "🌗" : "🐾"}<small>${bs ? "⭐".repeat(bs) : k <= top ? "보너스" : "🔒"}</small></button>` : "";   // 잠긴 보너스는 잠긴 단계처럼 못 누름
      h += `<div class="stage-row ${side}"><button class="stg ${lock ? "lock" : ""} ${k === cur ? "cur" : ""} ${s && k !== cur ? "done" : ""}" data-k="${k}"${lock ? " disabled" : ""}>${lock ? "🔒" : k}${gift ? `<i class="gift">${k <= top ? gift[1] : "🎁"}</i>` : ""}</button><span class="st">${s ? "⭐".repeat(s) + "☆".repeat(3 - s) : ""}</span>${bonus}</div>${mark}`;
    }
    h += `</div>`;
    const ok = SKINS.filter(x => x[0] <= top), next = SKINS.find(x => x[0] > top);
    h += `<div class="skins"><span class="small">내 고양이</span>${ok.map(x => `<button class="${skin() === x[1] ? "on" : ""}" data-sk="${x[1]}">${x[1]}</button>`).join("")}${next ? `<span class="small">🎁 ${next[0]}단계에 새 고양이</span>` : ""}</div>`;
    const total = Object.values(st).reduce((a, b) => a + b, 0);
    h += `<p class="small" style="margin:0;text-align:center">모은 별 ⭐ ${total}개 · 별 3개 = 실수 0 · 힌트 0 · 목표 시간 안</p>`;
    $("stageBox").innerHTML = h;
    for (const b of $("stageBox").querySelectorAll(".stg")) b.onclick = () => playStage(+b.dataset.k);
    for (const b of $("stageBox").querySelectorAll(".bonus")) b.onclick = () => { const k = +b.dataset.bk; if (k > maxStage()) { toast(`${k}단계를 깨면 열려요`); return; } playBonus(k); };
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
    return { key, wd, tier, idx: h % Math.min(CHUNK, bank[tier].length), vs: ((n * 7919 + 4099) >>> 0) || 1, bseed: (Math.imul(n + 31337, 2246822519) >>> 0) || 1, zseed: (Math.imul(n + 7331, 3266489917) >>> 0) || 1 };   // bseed = 🌗 오늘의 반반 · zseed = 🐾 오늘의 산책
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
  const hm = t => { const d = new Date(t + 9 * 3600e3); return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };   // 푼 시각 (한국 시각) — 누가 먼저 풀었는지도 보이게 (11-08 '선착순')
  const myPid = () => (GME.me && GME.me.pid) || "me";
  // 줄 세운 목록 한 장 (오늘 순위 · 타임어택 순위 같이 씀): 나는 n 등 밖이어도 마지막에 한 줄
  function rankList(rows, val, n = 5, at) {
    if (!rows.length) return "";
    const me = rows.findIndex(x => x.pid === myPid()), li = (x, i) => `<li class="${i === me ? "me" : ""}"><span class="md">${MEDAL[i] || i + 1}</span><b>${esc(x.name)}</b>${at && at(x) ? `<span class="at">${at(x)}</span>` : ""}<span class="tm">${val(x)}</span></li>`;
    return `<ol class="dc-board">${rows.slice(0, n).map(li).join("")}${me >= n ? li(rows[me], me) : ""}</ol>`;
  }
  const boardHtml = (board, n = 5) => rankList(board, x => fmt(dayVal(x.v)), n, x => x.v.at ? hm(x.v.at) : "");
  // ⏱ 타임어택 친구 순위 (11-08 베니 님 '친구끼리 경쟁하는 게 좋은 듯, 랭킹 잘 보이게 — 자꾸 나한테 물어봐'): 혼자 3분 기록 · 이번 주(월요일부터) 또는 역대
  function taRows(tier, period = "week") {
    const R = (rkData && rkData.rec) || {}, N = (rkData && rkData.names) || {}, wk = weekKey(), key = `${tier}_${TA_SOLO_MIN}`, me = myPid();
    const rows = Object.entries(R).map(([pid, r]) => ({ pid, name: N[pid] || "", v: period === "week" ? (((r && r.w && r.w[wk]) || {}).ta || {})[key] : ((r && r.ta) || {})[key] })).filter(x => x.v > 0 && x.name);
    const lw = store.get("taW", {}), loc = period === "week" ? (lw.wk === wk ? (lw.v || {})[key] : 0) : store.get("taBest", {})[tier];   // 서버에 아직 안 올라간 내 기록
    const mine = rows.find(x => x.pid === me);
    if (loc > 0 && myName()) { if (mine) mine.v = Math.max(mine.v, loc); else rows.push({ pid: me, name: myName(), v: loc }); }
    return rows.sort((a, b) => b.v - a.v);
  }
  // 순위 띠에 올릴 타임어택 난이도: 이번 주 기록이 가장 많은 난이도 (같으면 어려운 쪽), 아무도 없으면 고른 난이도
  function taTierNow() {
    let best = soloTier, bn = 0;
    for (const t of TIERS) { const n = taRows(t.id).length; if (n >= bn && n) { best = t.id; bn = n; } }
    return best;
  }
  const taVal = x => `${x.v}개`;
  // 🏆 혼자 화면 맨 위 순위 띠: 📅 오늘의 퍼즐 · ⏱ 이번 주 타임어택 1~3등 + 나 (누르면 그 화면으로) — 그 화면에 있으면 그 줄은 숨김 (아래 카드에 다 있음)
  function drawRankStrip() {
    const el = $("rankStrip"); if (!el) return;
    if (!rkData || !bank) { el.innerHTML = ""; return; }
    const top3 = (rows, v) => rows.slice(0, 3).map((x, i) => `<span class="${x.pid === myPid() ? "me" : ""}">${MEDAL[i]} ${esc(x.name)} <b>${v(x)}</b></span>`).join("");
    const d = dailyInfo(), T = TIERS.find(t => t.id === d.tier), db = dayBoard(d.key), dMe = db.findIndex(x => x.pid === myPid());
    const tt = taTierNow(), TT = TIERS.find(t => t.id === tt), tb = taRows(tt), tMe = tb.findIndex(x => x.pid === myPid());
    const rows = [];
    if (soloMode !== "day") rows.push(`<button type="button" class="rs-row" data-go="day"><span class="rs-h">📅 오늘의 퍼즐 순위 <i>${T.em} ${T.label}</i></span><span class="rs-l">${db.length ? top3(db, x => fmt(dayVal(x.v))) : "<span>아직 아무도 안 풀었어요 — 1등 기회!</span>"}</span><span class="rs-me">${dMe >= 0 ? `나 ${dMe + 1}등` : "나는 아직 ›"}</span></button>`);
    if (soloMode !== "ta") rows.push(`<button type="button" class="rs-row" data-go="ta" data-t="${tt}"><span class="rs-h">⏱ 이번 주 타임어택 순위 <i>${TT.em} ${TT.label} ${TA_SOLO_MIN}분</i></span><span class="rs-l">${tb.length ? top3(tb, taVal) : "<span>이번 주 기록이 아직 없어요</span>"}</span><span class="rs-me">${tMe >= 0 ? `나 ${tMe + 1}등` : "도전 ›"}</span></button>`);
    el.innerHTML = rows.length ? `<div class="rkstrip">${rows.join("")}</div>` : "";
    for (const b of el.querySelectorAll("[data-go]")) b.onclick = () => { soloMode = b.dataset.go; store.set("soloMode2", soloMode); if (b.dataset.t) { soloTier = b.dataset.t; store.set("soloTier", soloTier); } drawTiers(); };
  }
  let taPeriod = "week";
  function drawTABoard() {
    const el = $("taBoard"); if (!el) return;
    const T = TIERS.find(t => t.id === soloTier), rows = taRows(soloTier, taPeriod);
    el.innerHTML = `<div class="taboard"><div class="tb-top"><b>🏆 친구 순위 · ${T.em} ${T.label} ${TA_SOLO_MIN}분</b><span class="seg">${[["week", "이번 주"], ["all", "역대"]].map(([v, l]) => `<button type="button" class="btn" data-p="${v}" aria-pressed="${taPeriod === v}">${l}</button>`).join("")}</span></div>
      ${rankList(rows, taVal, 5) || `<p class="small dc-sub">${rkData ? (taPeriod === "week" ? "이번 주 기록이 아직 없어요 — 첫 기록을 남겨 보세요!" : "아직 기록이 없어요") : "이름을 정하면 친구 순위가 보여요"}</p>`}</div>`;
    for (const b of el.querySelectorAll("[data-p]")) b.onclick = () => { taPeriod = b.dataset.p; drawTABoard(); };
  }
  function drawDay() {
    const box = $("dayBox"); if (!box || !bank) return;
    const d = dailyInfo(), T = TIERS.find(t => t.id === d.tier), days = myDays(), mine = days[d.key], st = streakOf(days);
    const mon = dayShift(d.key, -((d.wd + 6) % 7));
    const wk = [...Array(7).keys()].map(i => { const k = dayShift(mon, i); return { k, w: WD[(i + 1) % 7], on: !!days[k], today: k === d.key, fut: k > d.key }; });
    const board = dayBoard(d.key);
    box.innerHTML = `<div class="daycard${mine ? " done" : ""}">
      <div class="dc-top"><b>📅 오늘의 퍼즐</b><span class="small">${dayMD(d.key)} ${WD[d.wd]}요일 · ${T.em} ${T.label}</span>${st ? `<span class="dc-fire">🔥 ${st}일 연속</span>` : ""}</div>
      <div class="dc-week">${wk.map(x => `<span class="${x.on ? "on" : ""}${x.today ? " today" : ""}${x.fut ? " fut" : ""}"><i>${x.w}</i><em>${x.on ? "🐱" : x.fut ? "" : "·"}</em></span>`).join("")}</div>
      <button type="button" class="dc-cal" id="dayCal">📅 ${+d.key.slice(5, 7)}월 달력 · ${monthCount(d.key.slice(0, 7))}일${store.get("monthTrophy", {})[d.key.slice(0, 7)] ? " 🏆" : ""} ›</button>
      ${mine ? `<p class="dc-mine">✅ 오늘 <b>${fmt(mine.s)}</b> · 실수 ${mine.m || 0} · 힌트 ${mine.h || 0}${mine.k > 1 ? ` · ${mine.k}번째 만에` : ""}</p>` : `<p class="small dc-sub">모두 같은 판 · 가족끼리 오늘 시간 겨루기 (힌트 한 번 = +${PENALTY}초)</p>`}
      ${board.length ? `<p class="dc-rk">🏆 오늘 순위${board.length > 1 ? " <span class='small'>(빠른 순 · 옆 시각 = 푼 때)</span>" : ""}</p>${boardHtml(board)}` : `<p class="small dc-sub">아직 아무도 안 풀었어요 — 첫 번째가 돼 보세요!</p>`}
      ${mine ? `<div class="dc-foot"><span class="small">다시 풀어도 오늘 기록은 그대로 · 내일 0시에 새 판</span><button class="btn mint" id="dayShare">📤 자랑</button></div>` : ""}
    </div>`;
    const sb = $("dayShare"); if (sb) sb.onclick = () => shareDay(d, mine, st, board);
    const cb = $("dayCal"); if (cb) cb.onclick = () => openCalendar();
  }
  // 🌗 오늘의 반반 · 🐾 오늘의 산책 카드는 🧩 한 판에서 그 퍼즐을 고르면 위에 (11-08 '냥도쿠 화면 너무 복잡' — 📅 오늘엔 냥도쿠 한 판만)
  function drawKindDay(kind) {
    const el = $("kindDay"); if (!el) return;
    el.hidden = kind !== "b" && kind !== "z";
    if (el.hidden || !bank) { el.innerHTML = ""; return; }
    const d = dailyInfo();
    el.innerHTML = kind === "b" ? bbDayHtml(d) : zzDayHtml(d);
    const bb = $("dayBB"); if (bb) bb.onclick = () => playBB(d.tier, d);
    const zb = $("dayZZ"); if (zb) zb.onclick = () => playZZ(d.tier, d);
  }
  const monthCount = ym => { const a = myDays(), b = store.get("dayArc", {}); return new Set([...Object.keys(a), ...Object.keys(b)].filter(k => k.startsWith(ym))).size; };
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
  // 🐾 오늘의 산책: 같은 모양 (zday)
  function myZDays() { const out = { ...store.get("zday", {}) }, m = myRec(); if (m && m.zday) for (const [k, v] of Object.entries(m.zday)) if (v && v.s && !out[k]) out[k] = v; return out; }
  function zzDayHtml(d) {
    if (!window.NYZ) return "";
    const L = NYZ.LEVELS[d.tier], mine = myZDays()[d.key], board = dayBoard(d.key, "zday");
    return `<div class="daycard bbcard zzcard${mine ? " done" : ""}">
      <div class="dc-top"><b>🐾 오늘의 산책</b><span class="small">${L.N}×${L.N} · 번호 순서대로 한붓그리기</span>${mine ? `<span class="dc-fire" style="color:var(--good)">✅ ${fmt(mine.s)}</span>` : ""}</div>
      ${boardHtml(board, 3)}
      <button class="btn${mine ? "" : " mint"}" id="dayZZ" type="button">${mine ? "다시 풀기 (기록은 그대로)" : "🐾 산책 풀기"}</button>
    </div>`;
  }
  // key = 지난 날 (📅 달력에서 고름) — 그날 판 그대로, 기록은 이 폰 dayArc 에만 (연속 일수 · 가족 기록엔 안 셈, NYT 지난 판처럼)
  function playDaily(key) {
    const today = kstDay(), d = dailyInfo(key && key < today ? key : today);
    d.archive = d.key !== today;
    if (!d.archive) {
      const tries = store.get("dayTry", {});
      tries[d.key] = (tries[d.key] || 0) + 1;
      store.set("dayTry", Object.fromEntries(Object.entries(tries).filter(([k]) => k >= dayShift(d.key, -7))));
    }
    playSolo(d.tier, d.idx, d.vs, null, d);
  }
  // 📅 이번 달 달력 (11-06 벤치마킹: Sudoku.com · Nonogram.com 월 달력 + 트로피): 푼 날 🐱 · 지난 판으로 채운 날 🐾 · 한 달을 다 채우면 🏆
  const monthDone = (ym, days, arc) => { const last = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate(); for (let i = 1; i <= last; i++) { const k = `${ym}-${String(i).padStart(2, "0")}`; if (!days[k] && !arc[k]) return false; } return true; };
  function checkMonth(ym) {
    if (!monthDone(ym, myDays(), store.get("dayArc", {}))) return false;
    const tr = store.get("monthTrophy", {}); if (tr[ym]) return false;
    tr[ym] = Date.now(); store.set("monthTrophy", tr);
    setTimeout(() => { toast(`🏆 ${+ym.slice(5)}월 오늘의 퍼즐 개근!`, 3000); S("badge"); }, 900);
    return true;
  }
  function openCalendar(ym0) {
    const today = kstDay(), ym = ym0 || today.slice(0, 7), y = +ym.slice(0, 4), mo = +ym.slice(5, 7);
    const days = myDays(), arc = store.get("dayArc", {}), last = new Date(Date.UTC(y, mo, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    let got = 0, cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="cl-e"></span>`;
    for (let i = 1; i <= last; i++) {
      const k = `${ym}-${String(i).padStart(2, "0")}`, fut = k > today, on = days[k], a = !on && arc[k];
      if (on || a) got++;
      cells += `<button type="button" class="cl-d${on ? " on" : a ? " arc" : ""}${k === today ? " today" : ""}${fut ? " fut" : ""}" data-k="${k}"${fut ? " disabled" : ""}><b>${i}</b><em>${on ? "🐱" : a ? "🐾" : ""}</em></button>`;
    }
    const tr = store.get("monthTrophy", {})[ym], prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
    const close = Cozy.modal({
      title: `📅 ${y}년 ${mo}월 오늘의 퍼즐`, dismiss: true,
      html: `<div class="cal"><div class="cl-nav"><button type="button" class="btn ghost" data-m="${prev}">‹</button><span>${tr ? "🏆 개근!" : `${got}/${last}일`}</span><button type="button" class="btn ghost" data-m="${next}"${next > today.slice(0, 7) ? " disabled" : ""}>›</button></div>
        <div class="cl-grid">${"월화수목금토일".split("").map(w => `<i>${w}</i>`).join("")}${cells}</div>
        <p class="small" style="margin:6px 0 0">🐱 그날 푼 판 · 🐾 지난 판으로 채움 (연속 일수엔 안 셈) · 날짜를 누르면 그날 판 · 한 달을 다 채우면 🏆</p></div>`,
      buttons: [{ label: "닫기", primary: true }],
    });
    const ov = [...document.querySelectorAll(".overlay")].pop();
    if (!ov) return;
    ov.querySelectorAll(".cl-d:not([disabled])").forEach(b => b.onclick = () => { close(); playDaily(b.dataset.k); });
    ov.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { if (b.disabled) return; close(); openCalendar(b.dataset.m); });
  }
  function shareDay(d, v, st, board) {
    const me = (GME.me && GME.me.pid) || "me", rk = board.findIndex(x => x.pid === me);
    shareText(`🐱 냥도쿠 오늘의 퍼즐 ${dayMD(d.key)}(${WD[d.wd]}) ⏱ ${fmt(v.s)} · 실수 ${v.m || 0}${st > 1 ? ` · 🔥 ${st}일 연속` : ""}${board.length > 1 && rk >= 0 ? ` · 가족 ${rk + 1}등` : ""}`);
  }

  // ══ 도전 과제 배지 ══
  const EXTRA_KINDS = /[?&]kinds=1(&|$)/.test(location.search);                          // 반반 · 산책 (11-12 화면에서 뺌, 아래 bbKind 설명)
  const achList = have => ACHS.filter(a => EXTRA_KINDS || (a[0] !== "bb1" && a[0] !== "zz1") || (have && have[a[0]]));   // 반반 · 산책 배지는 이미 딴 사람에게만 보임
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
    ["zz1", "🐾", "산책 입문", "냥산책 처음 깨기", s => s.zz >= 1],
    ["month1", "🏆", "한 달 개근", "오늘의 퍼즐로 달력 한 달 채우기", s => s.months >= 1],
    ["fam1", "👨‍👩", "우리 집 목표", "이번 주 가족 목표 달성", s => s.fam >= 1],
  ];
  function myStats() {
    const m = myRec() || {}, c = m.cnt || {}, days = myDays();
    return { sv: solvedN(), wins: (gm && gm.f && gm.f.w) || 0, nhNormal: c.nhNormal || 0, perfHard: c.perfHard || 0, star3: c.star3 || 0, coopWin: c.coopWin || 0,
      taMax: Math.max(0, ...Object.values(m.ta || {})), stage: maxStage(), days: Object.keys(days).length, dayRun: bestStreak(days), dayTop: dayTops(), bb: c.bb || 0, zz: c.zz || 0, months: Object.keys(store.get("monthTrophy", {})).length, fam: Object.keys(store.get("famDone", {})).length };
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
    result(`🏅 배지 ${Object.keys(have).length}/${achList(have).length}`, `<div class="badges">${achList(have).map(a => `<div class="${have[a[0]] ? "on" : ""}"><span>${have[a[0]] ? a[1] : "🔒"}</span><b>${a[2]}</b><i>${a[3]}</i></div>`).join("")}</div>`, [["닫기", () => {}, "primary"]]);
  }

  // ══ 혼자 하기: 난이도만 고르면 그 난이도 문제 중 랜덤 (안 푼 문제 먼저, 최근 10판은 피함) ══
  const solved = () => store.get("solved", {});                // { tier: [푼 문제 번호들] }
  const bests = () => store.get("bestT", {});                  // { tier: 가장 빠른 초 }
  let soloMode = store.get("soloMode2", "map");                 // map = 단계 지도 · one = 한 판 · ta = 타임어택
  let soloTier = store.get("soloTier", "easy");                 // 한 판·타임어택에서 고른 난이도
  // 혼자 화면 맨 위: 몇 판 깼는지 · 다음 칭호까지 · 친구 중 몇 등 · 자랑하기
  function paintSoloProg(el) {
    const sv = solvedN(), lv = level(sv), nx = LEVELS.find(l => l[0] > sv);       // 판 수 = 공용 랭킹 (친구와 비교는 🏆 랭킹 탭)
    const pct = nx ? Math.round((sv - lv[0]) / (nx[0] - lv[0]) * 100) : 100;
    const cheer = !sv ? "첫 판을 깨 보세요!" : "";
    // 11-08 '화면이 너무 복잡' — 배지는 위 줄 작은 단추로 (모은 배지 그림은 배지 창에서)
    el.innerHTML = `<div class="pc-top"><span class="lv">${lv[1]}</span><div class="pc-mid"><b class="round">${sv.toLocaleString()}판 깼어요</b><span class="small">${lv[2]}${nx ? ` · ${nx[1]} ${nx[2]}까지 ${nx[0] - sv}판` : " · 최고 칭호!"}</span></div><button class="btn mint" id="shareBtn">📤 자랑</button></div>
      <div class="pc-barrow"><div class="pc-bar"><i style="width:${pct}%"></i></div><button class="pc-badges" id="badgeBtn" aria-label="배지">🏅 배지 ${Object.keys((myRec() || {}).ach || {}).length}/${achList((myRec() || {}).ach).length}</button></div>${cheer ? `<div class="small pc-cheer">${cheer}</div>` : ""}${famHtml()}`;
    $("shareBtn").onclick = () => shareMe(sv, lv);
    $("badgeBtn").onclick = showBadges;
  }
  async function drawSoloProg(force) {
    const el = $("soloProg");
    if (!myName()) {
      el.innerHTML = '<button class="pc-name" id="pcName">👤 이름을 정하면 몇 판 깼는지 쌓이고 친구 순위에 올라가요</button>';
      $("pcName").onclick = () => { const db = Arena.db(); if (db) GME.ensure(db).then(() => drawSoloProg(true)).catch(() => {}); };
      loadRec(force).then(() => { drawRankStrip(); if (soloMode === "day" && !$("soloBox").hidden) drawDay(); if (soloMode === "ta" && !$("soloBox").hidden) drawTABoard(); }).catch(() => {});   // 이름이 없어도 순위는 보여 줌
      return;
    }
    paintSoloProg(el);                                                            // 오프라인·느린 망에서도 캐시된 판 수·칭호를 먼저 바로 그림
    await Promise.all([loadRec(force).catch(() => {}), loadGM(), loadFam(force).catch(() => {})]);   // 퍼즐 기록(배지·단계)을 못 읽어도 공용 랭킹 숫자는 보여 줌
    paintSoloProg(el);
    if (soloMode === "map" && !$("soloBox").hidden) drawStages();              // 서버 기록이 늦게 오면 지도도 다시
    if (soloMode === "day" && !$("soloBox").hidden) drawDay();                 // 가족 오늘 기록도
    if (soloMode === "ta" && !$("soloBox").hidden) drawTABoard();
    drawRankStrip(); drawDayDot();
  }
  // 👨‍👩 이번 주 가족 목표 (11-06 벤치마킹: Duolingo Friends Quest — 둘이 합쳐 채우는 목표, 지는 사람 없이)
  //   공용 랭킹 하루 판 수 rank_days/{날짜}/nyang/{pid} 를 이번 주(월요일부터) 다 더함 · 목표 = 지난주 합 × 1.1 (10판 단위, 최소 100) · 달성하면 그 주 도장
  let fam = null, famAt = 0;
  async function loadFam(force) {
    if (!force && fam && Date.now() - famAt < 300000) return fam;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return fam;
    const db = Arena.db(); if (!db) return null;
    const mon = weekKey(), today = kstDay(), days = [...Array(14).keys()].map(i => dayShift(mon, i - 7));
    const vals = await Promise.race([
      Promise.all(days.map(d => (d > today ? Promise.resolve({}) : db.ref(`${GME.P}rank_days/${d}/nyang`).get().then(s => s.val() || {}, () => ({}))))),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]).catch(() => null);
    if (!vals) return fam;
    const cur = {}; let last = 0;
    days.forEach((d, i) => { const v = vals[i] || {}; if (i < 7) last += Object.values(v).reduce((a, b) => a + (+b || 0), 0); else for (const [pid, n] of Object.entries(v)) cur[pid] = (cur[pid] || 0) + (+n || 0); });
    fam = { cur, last, week: mon }; famAt = Date.now();
    return fam;
  }
  function famHtml() {
    if (!fam) return "";
    const total = Object.values(fam.cur).reduce((a, b) => a + b, 0), goal = Math.max(100, Math.round(fam.last * 1.1 / 10) * 10);
    const N = (rkData && rkData.names) || {}, who = Object.entries(fam.cur).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([pid, n]) => `${esc(N[pid] || "?")} ${n}`).join(" · ");
    const ok = total >= goal, pct = Math.min(100, Math.round(total / goal * 100));
    if (ok) { const fd = store.get("famDone", {}); if (!fd[fam.week]) { fd[fam.week] = 1; store.set("famDone", fd); setTimeout(() => { toast("🎉 이번 주 가족 목표 달성! 🐾 도장 하나", 2800); S("badge"); }, 400); } }
    const stamps = Object.keys(store.get("famDone", {})).length;
    return `<div class="pc-fam${ok ? " ok" : ""}"><div class="pf-top"><b>👨‍👩 이번 주 가족 목표</b><span>${ok ? "🎉 달성!" : `같이 ${total}/${goal}판`}${stamps ? ` · 🐾 ${stamps}` : ""}</span></div><div class="pc-bar"><i style="width:${pct}%"></i></div>${who ? `<span class="small">${who}</span>` : ""}</div>`;
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
    const pick = soloMode === "map" || soloMode === "day", bbOn = soloMode === "one" && bbKind === "b", zzOn = soloMode === "one" && bbKind === "z";
    $("tiers").hidden = pick; $("stageBox").hidden = soloMode !== "map"; $("dayBox").hidden = soloMode !== "day"; $("howto").hidden = pick || bbOn || zzOn || ta; $("howtoB").hidden = !bbOn; $("howtoZ").hidden = !zzOn;
    $("kindSeg").hidden = soloMode !== "one" || !EXTRA_KINDS;
    if (soloMode === "one") segBtns($("kindSeg"), [["q", "🐱 냥도쿠"], ["b", "🌗 반반"], ["z", "🐾 산책"]], bbKind, v => { bbKind = v; store.set("kind", v); drawTiers(); });
    drawKindDay(soloMode === "one" ? bbKind : null);
    $("taBoard").hidden = !ta; if (ta) drawTABoard();
    drawRankStrip();
    if (soloMode === "map") { $("soloDesc").hidden = true; drawStages(); return; }
    if (soloMode === "day") { $("soloDesc").hidden = true; drawDay(); return; }
    $("soloDesc").textContent = ta ? `${TA_SOLO_MIN}분 동안 몇 개 풀 수 있을까요? 다 풀거나 🐟를 다 잃으면 바로 다음 문제. 힌트는 한 번에 -${PENALTY}초` : "";
    $("soloDesc").hidden = !ta;
    const bb = bbOn ? store.get("bbBest", {}) : zzOn ? store.get("zzBest", {}) : null;
    $("tiers").innerHTML = TIERS.map(t => {
      const rec = bb ? (bb[t.id] ? `최고 ${fmt(bb[t.id])}` : "") : ta ? (tb[t.id] ? `최고 ${tb[t.id]}개` : "") : (bs[t.id] ? `최고 ${fmt(bs[t.id])}` : "");
      const top = ta && rkData ? taRows(t.id)[0] : null;   // 이번 주 친구 1등 (어느 난이도에서 겨루는지 보이게)
      return `<button class="tier t-${t.id}" data-t="${t.id}" aria-pressed="${t.id === soloTier}"><span class="em">${t.em}</span><b>${t.label}</b><span>${bbOn ? BB_DESC[t.id] : zzOn ? ZZ_DESC[t.id] : t.desc}</span>${rec ? `<span>${rec}</span>` : ""}${top ? `<span class="tw">🥇 이번 주 ${esc(top.name)} ${top.v}개</span>` : ""}</button>`;
    }).join("");
    for (const b of $("tiers").children) b.onclick = () => { soloTier = b.dataset.t; store.set("soloTier", soloTier); for (const o of $("tiers").children) o.setAttribute("aria-pressed", o === b); if (soloMode === "ta") drawTABoard(); };
  }
  $("startBtn").onclick = () => { if (!bank) return; if (soloMode === "map") playStage(maxStage() + 1); else if (soloMode === "day") playDaily(); else if (soloMode === "ta") playTA(soloTier); else if (bbKind === "b") playBB(soloTier); else if (bbKind === "z") playZZ(soloTier); else playSolo(soloTier); };

  // ══ 🌗 치즈냥·까망냥 반반 (11-06 — 벤치마킹: LinkedIn Tango · 지민 님 새 퍼즐, 엔진 banban.js · 판 화면 banban-ui.js) ══
  //   한 판(난이도 넷) · 오늘의 반반(📅 오늘 아래, nyang/rec/{pid}/bday). 별 = ⭐ 깸 · +⭐ 힌트 없이 · +⭐ 목표 시간 안 (물고기·실패 없음)
  const BB_DESC = { easy: "6×6 · 가볍게", normal: "6×6 · 처음 칸 적게", hard: "8×8 · 줄 전체 따지기", master: "8×8 · 표시 적게" };
  // 11-12 베니 님 '다른 게임 합쳐 놓은 건 분리하든 빼든': 반반 · 산책은 한 달 동안 모두 합쳐 5판(지민 님 0판) → 냥도쿠 화면에서 뺌.
  //   코드 · 기록 · 배지는 그대로 두고 고르는 줄만 숨김. 주소 끝에 ?kinds=1 을 붙이면 다시 보임 (따로 게임으로 낼 때 쓸 수 있게)
  let bbKind = EXTRA_KINDS ? store.get("kind", "q") : "q";
  function playBB(tier, daily, ex) {
    if (!window.NYB || !window.NYBUI) return toast("반반을 못 불러왔어요. 새로 고침해 주세요");
    const seed = ex ? ex.seed : daily ? daily.bseed : NY.rseed(), pz = NYB.make(seed, tier), T = TIERS.find(t => t.id === tier);
    if (daily) { const tr = store.get("bdayTry", {}); tr[daily.key] = (tr[daily.key] || 0) + 1; store.set("bdayTry", Object.fromEntries(Object.entries(tr).filter(([k]) => k >= dayShift(daily.key, -7)))); }
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: daily ? "bday" : "bb", tier, seed, n: pz.N }); }).catch(() => {});
    NYBUI.start({ pz, label: ex ? `🎁 ${ex.bonus}단계 보너스 · 🌗 ${pz.N}×${pz.N}` : daily ? `🌗 오늘의 반반 · ${pz.N}×${pz.N}` : `🌗 반반 · ${T.label} ${pz.N}×${pz.N}`,
      onExit: () => { if (glog) glog.matchEnd({ won: false, gaveUp: true }); goHome(); },
      onWin: w => bbEnd(w, tier, pz, daily, ex) });
  }
  function bbEnd(w, tier, pz, daily, ex) {
    const T = TIERS.find(t => t.id === tier), secs = w.secs;
    if (glog) glog.matchEnd({ won: true, bb: 1, secs: Math.round(secs * 10) / 10, hints: w.hints });
    if (window.GRank) try { GRank.result("nyang", { mode: "ai", res: "w", beat: 1, tier: "bb" }); } catch (e) {}
    REC.solved(1); REC.cnt("bb");
    const st = Math.max(1, 3 - (w.hints ? 1 : 0) - (secs > pz.par ? 1 : 0));
    const stars = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div>
      <p class="small" style="margin:0">${[w.hints ? `힌트 ${w.hints}번` : "힌트 0 ✓", secs > pz.par ? `목표 ${fmt(pz.par)} 넘음` : `목표 ${fmt(pz.par)} 안 ✓`].join(" · ")}</p>`;
    [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
    if (ex) return bonusEnd("b", ex.bonus, st, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">🌗 ${pz.N}×${pz.N} ${T.label}</p>`);
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
  // ══ 🐾 냥산책 (11-06 — 벤치마킹: LinkedIn Zip, 지민 님 세 번째 퍼즐, 엔진 zip.js · 판 화면 zip-ui.js) ══
  //   한 판(5×5 · 6×6 · 7×7) · 오늘의 산책(📅 오늘, nyang/rec/{pid}/zday). 별 = ⭐ 깸 · +⭐ 힌트 없이 · +⭐ 목표 시간 안
  const ZZ_DESC = { easy: "5×5 · 번호 많이", normal: "6×6", hard: "6×6 · 번호 적게", master: "7×7" };
  function playZZ(tier, daily, ex) {
    if (!window.NYZ || !window.NYZUI) return toast("산책을 못 불러왔어요. 새로 고침해 주세요");
    const seed = ex ? ex.seed : daily ? daily.zseed : NY.rseed(), pz = NYZ.make(seed, tier), T = TIERS.find(t => t.id === tier);
    if (daily) { const tr = store.get("zdayTry", {}); tr[daily.key] = (tr[daily.key] || 0) + 1; store.set("zdayTry", Object.fromEntries(Object.entries(tr).filter(([k]) => k >= dayShift(daily.key, -7)))); }
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: daily ? "zday" : "zz", tier, seed, n: pz.N }); }).catch(() => {});
    NYZUI.start({ pz, label: ex ? `🎁 ${ex.bonus}단계 보너스 · 🐾 ${pz.N}×${pz.N}` : daily ? `🐾 오늘의 산책 · ${pz.N}×${pz.N}` : `🐾 산책 · ${T.label} ${pz.N}×${pz.N}`,
      onExit: () => { if (glog) glog.matchEnd({ won: false, gaveUp: true }); goHome(); },
      onWin: w => zzEnd(w, tier, pz, daily, ex) });
  }
  function zzEnd(w, tier, pz, daily, ex) {
    const T = TIERS.find(t => t.id === tier), secs = w.secs;
    if (glog) glog.matchEnd({ won: true, zz: 1, secs: Math.round(secs * 10) / 10, hints: w.hints });
    if (window.GRank) try { GRank.result("nyang", { mode: "ai", res: "w", beat: 1, tier: "zz" }); } catch (e) {}
    REC.solved(1); REC.cnt("zz");
    const st = Math.max(1, 3 - (w.hints ? 1 : 0) - (secs > pz.par ? 1 : 0));
    const stars = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div>
      <p class="small" style="margin:0">${[w.hints ? `힌트 ${w.hints}번` : "힌트 0 ✓", secs > pz.par ? `목표 ${fmt(pz.par)} 넘음` : `목표 ${fmt(pz.par)} 안 ✓`].join(" · ")}</p>`;
    [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
    if (ex) return bonusEnd("z", ex.bonus, st, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">🐾 ${pz.N}×${pz.N} ${T.label}</p>`);
    const bst = store.get("zzBest", {}), best = !w.hints && (!bst[tier] || secs < bst[tier]); if (best) { bst[tier] = Math.round(secs * 10) / 10; store.set("zzBest", bst); }
    const bl = baseLine(baseline("zz_" + tier, secs), secs, { label: `산책 ${T.label}` });
    let fam = "", title = "🎉 산책 끝!";
    if (daily) {
      const before = myZDays()[daily.key], tries = store.get("zdayTry", {})[daily.key] || 1;
      if (!before) REC.kday("zday", daily.key, { s: Math.round(secs * 10) / 10, h: w.hints, k: tries }, pz.N);
      const board = dayBoard(daily.key, "zday");
      title = before ? "✅ 다시 풀었어요" : "🎉 오늘의 산책 성공!";
      fam = (before ? `<p class="small" style="margin:0">오늘 기록은 처음 성공한 <b>${fmt(before.s)}</b> 그대로예요</p>` : "") + (board.length > 1 ? `<p class="small" style="margin:0">오늘 가족 기록</p>${boardHtml(board, 4)}` : "");
    }
    result(title, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">🐾 ${pz.N}×${pz.N} ${T.label}${best ? " · <b style='color:var(--good)'>최고 기록!</b>" : ""}</p>${bl}${fam}${cheerLine(true)}`,
      daily ? [["닫기", goHome, "primary"]] : [["한 판 더", () => playZZ(tier), "primary"], ["난이도 고르기", goHome]]);
    setTimeout(checkBadges, 1200);
  }
  function pickRandom(tier) {
    const n = bank[tier].length, sv = new Set(solved()[tier] || []), recent = new Set(store.get("recent_" + tier, []));
    let pool = [...Array(n).keys()].filter(i => !sv.has(i) && !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()].filter(i => !recent.has(i));
    if (!pool.length) pool = [...Array(n).keys()];
    const i = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length < 100) bankIdxP.then(() => loadChunks(tier, Math.floor(n / CHUNK)));   // 안 푼 판이 얼마 안 남으면 다음 묶음을 미리 받아 둠
    store.set("recent_" + tier, [i, ...recent].slice(0, Math.min(60, n - 1)));   // 최근 60판은 다시 안 나옴
    return i;
  }
  function playSolo(tier, idx, vs, stage, daily) {
    vs = vs ?? NY.rseed();                                                   // 같은 문제도 돌리고 뒤집고 색을 바꿔서 (다시 도전은 같은 모양)
    const i = idx ?? pickRandom(tier), p = NY.variant(bank[tier][i], vs), T = TIERS.find(t => t.id === tier);
    Arena.init().then(() => { const lg = logInit(); if (lg && !lg.sid) lg.start({ kind: "혼자", hostName: myName() }, Arena.uid); if (lg) lg.matchStart({ mode: daily ? "day" : "solo", tier, puzzle: i, n: p.n }); }).catch(() => {});   // 기록은 뒤에서 (판은 바로 시작)
    startPuzzle(p, {
      kind: "solo", tier, idx: i, vs, stage, daily, hintRule: "on", label: daily ? (daily.archive ? `📅 ${dayMD(daily.key)} 퍼즐 · ${T.label}` : `📅 오늘의 퍼즐 · ${T.label}`) : stage ? `🗺 ${stage}단계 · ${T.label}` : `${T.em} ${T.label}`,
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
      result("😿 물고기를 다 잃었어요", `<p style="margin:0">고양이 ${G.cats.size}/${G.n}마리 찾았어요.</p><p class="small" style="margin:0">${d.archive ? "지난 판도" : "오늘의 퍼즐은"} 성공할 때까지 몇 번이든 다시 할 수 있어요. 처음 성공한 기록이 남아요.</p>`,
        [["다시 도전", () => playDaily(d.archive ? d.key : null), "primary"], ["닫기", goHome]]);
      return;
    }
    if (d.archive) {                                                        // 📅 지난 판: 달력만 채움 (연속 일수 · 가족 기록엔 안 셈)
      REC.solved(1);
      const arc = store.get("dayArc", {}), first = !arc[d.key] && !myDays()[d.key];
      if (first) { arc[d.key] = { s: Math.round(secs * 10) / 10, m: G.mistakes, h: G.hints }; store.set("dayArc", arc); }
      const trophy = checkMonth(d.key.slice(0, 7));
      result(`🎉 ${dayMD(d.key)} 퍼즐 성공!`, `<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">${T.em} ${T.label} · 실수 ${G.mistakes}번 · 힌트 ${G.hints}번</p>
        <p class="cheer">${first ? `🐾 달력에 ${dayMD(d.key)} 를 채웠어요 · ${+d.key.slice(5, 7)}월 ${monthCount(d.key.slice(0, 7))}일` : "이미 채운 날이에요"}${trophy ? ` · 🏆 ${+d.key.slice(5, 7)}월 개근!` : ""}</p>`,
        [["📅 달력", () => { goHome(); openCalendar(d.key.slice(0, 7)); }, "primary"], ["닫기", goHome]]);
      setTimeout(checkBadges, 1200);
      return;
    }
    REC.solved(1); if (!G.hints) REC.best(d.tier, secs, G.n);
    const before = myDays()[d.key], tries = store.get("dayTry", {})[d.key] || 1, st = starsOf(G, secs);
    if (st === 3) REC.cnt("star3");
    if (!G.hints && d.tier !== "easy") REC.cnt("nhNormal");
    if (!G.mistakes && (d.tier === "hard" || d.tier === "master")) REC.cnt("perfHard");
    if (!before) REC.day(d.key, { s: Math.round(secs * 10) / 10, m: G.mistakes, h: G.hints, k: tries, at: Date.now() }, G.n);
    if (!before) checkMonth(d.key.slice(0, 7));
    const days = myDays(), run = streakOf(days), board = dayBoard(d.key), me = (GME.me && GME.me.pid) || "me", rk = board.findIndex(x => x.pid === me);
    const stars = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? "on" : ""}" style="animation-delay:${.15 + j * .25}s">⭐</span>`).join("")}</div><p class="small" style="margin:0">${starWhy(G, secs)}</p>`;
    [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => S("star", { i: j }), 200 + j * 250));
    const head = before ? `<p class="small" style="margin:0">오늘 기록은 처음 성공한 <b>${fmt(before.s)}</b> 그대로예요</p>`
      : `${run > 1 ? `<p class="cheer">🔥 <b>${run}일 연속</b> 오늘의 퍼즐!</p>` : `<p class="cheer">📅 오늘의 퍼즐 성공! 내일 또 만나요</p>`}`;
    const famOf = b => { const r = b.findIndex(x => x.pid === me); return b.length > 1 ? `<p class="small" style="margin:0">🏆 오늘 순위 ${r >= 0 ? `· 나는 <b>${r + 1}등</b>` : ""}</p>${boardHtml(b, 4)}` : ""; };
    const bl = baseLine(baseline(d.tier, secs), secs, T);
    result(before ? "✅ 다시 풀었어요" : `🎉 오늘의 퍼즐 성공!`, `${stars}<p style="font-size:22px;margin:0" class="round">${fmt(secs)}</p><p class="small" style="margin:0">${T.em} ${T.label} · 실수 ${G.mistakes}번 · 힌트 ${G.hints}번${tries > 1 && !before ? ` · ${tries}번째 만에` : ""}</p>${bl}${head}<div id="resRank">${famOf(board)}</div>`,
      [["📤 자랑", () => { shareDay(d, myDays()[d.key], run, dayBoard(d.key)); goHome(); }, "primary"], ["닫기", goHome]]);
    if (myName()) setTimeout(() => loadRec(true).then(() => { const e = $("resRank"); if (e && !$("resBox").hidden) e.innerHTML = famOf(dayBoard(d.key)); }).catch(() => {}), 1500);   // 방금 푼 친구 기록까지
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
    if (ctx.daily) playDaily(ctx.daily.archive ? ctx.daily.key : null); else playSolo(ctx.tier, ctx.idx, ctx.vs, ctx.stage);
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
  if ($("offBtn")) $("offBtn").onclick = () => openOfflineModal();

  // ══ ✈️ 비행기 · 오프라인 완전 다운로드 (6,090단계 + 실행 파일 캐시 + 홈 화면 앱 이어주기) ══
  const OFFLINE_VER = 4, OFFLINE_CACHE = "benny-arcade-v" + OFFLINE_VER;
  const OFFLINE_FILES = [
    "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon.svg",
    "./style.css", "./core.js", "./banban.js", "./banban-ui.js", "./zip.js", "./zip-ui.js",
    "./sound.js", "./main.js", "./watch.js", "./puzzles.json",
    "./bank/index.json", "./bank/master-1.json", "./bank/master-2.json", "./bank/master-3.json", "./bank/master-4.json", "./bank/master-5.json",
    "../", "../index.html", "../games.json",
    "../common/cozy.css", "../common/cozy.js", "../common/fit.js", "../common/backnav.js",
    "../common/glog.js", "../common/me.js", "../common/gate.js", "../common/rank.js",
    "../common/arena-mock.js", "../common/arena.js", "../common/arena-ui.js",
  ];
  let deferredInstall = null;
  if (typeof addEventListener === "function") addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
  const isStandalone = () => !!(navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches));
  function updateOffBtn() {
    const b = $("offBtn"); if (!b) return;
    const r = store.get("offlineReady", null);
    b.textContent = r && r.v === OFFLINE_VER ? "✈️ 준비됨 ✓" : "✈️ 비행기용";
  }
  function syncShareHash(force) {
    try {
      if (!force && /[?&](mock|guest)\b/.test(location.search)) return;
      const me = window.GME && GME.me && GME.me.pid ? { pid: GME.me.pid, name: GME.me.name } : null;
      let pass = null; try { pass = JSON.parse(localStorage.getItem("game.gate.pass.v1") || "null"); } catch (e) {}
      const top = maxStage();
      if (!me && !pass && !top) return;
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify({ m: me, p: pass, t: top, k: skin() }))));
      if (location.hash !== "#s=" + b64) history.replaceState(history.state, "", location.pathname + location.search + "#s=" + b64);
    } catch (e) {}
  }
  async function prepareOffline(onStep) {
    const total = OFFLINE_FILES.length;
    let done = 0, okCount = 0;
    const step = () => { if (onStep) try { onStep(done, total, okCount); } catch (e) {} };
    try {
      if ("serviceWorker" in navigator && !/[?&](mock|guest)\b/.test(location.search)) {
        await navigator.serviceWorker.register("../sw.js").catch(() => {});
      }
    } catch (e) {}
    const hasCache = typeof caches !== "undefined" && !!caches.open;
    const cache = hasCache ? await caches.open(OFFLINE_CACHE).catch(() => null) : null;
    const queue = [...OFFLINE_FILES];
    const worker = async () => {
      while (queue.length) {
        const rel = queue.shift();
        const abs = new URL(rel, location.href.split("#")[0]).href;
        let ok = false;
        if (isOn()) {
          try {
            const res = await fetch(abs, { cache: "no-cache" });
            if (res && res.ok) { ok = true; if (cache) await cache.put(abs, res.clone()); }
          } catch (e) {}
        }
        if (!ok && cache) {
          try { const m = (await cache.match(abs)) || (await cache.match(abs, { ignoreSearch: true })); if (m) ok = true; } catch (e) {}
        }
        done++; if (ok) okCount++; step();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
    if (isOn()) {
      await Promise.all([
        bankIdxP.then(() => loadChunks("master", 5)).catch(() => {}),
        loadRec(true).catch(() => {}),
        loadGM().catch(() => {}),
      ]);
    }
    const ready = { v: OFFLINE_VER, at: Date.now(), files: okCount, total, stages: 6090 };
    if (okCount >= total - 3) store.set("offlineReady", ready);
    syncShareHash(true);
    updateOffBtn();
    return { ok: okCount >= total - 3, okCount, total, stages: 6090, at: ready.at };
  }
  function openOfflineModal() {
    syncShareHash(true);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    const close = Cozy.modal({
      title: "✈️ 비행기 · 오프라인 준비",
      dismiss: true,
      html: `<div id="offModalBody" style="display:grid;gap:10px;text-align:left;font-size:14px;line-height:1.5">
        <div id="offProgWrap" style="background:rgba(15,23,42,.06);border-radius:12px;padding:12px;display:grid;gap:6px">
          <b id="offHead">⏳ 퍼즐 6,090단계와 게임 파일을 폰에 저장하는 중…</b>
          <div class="pc-bar" style="height:8px"><i id="offBar" style="width:8%;transition:width .15s"></i></div>
          <span class="small" id="offSub">잠시만 기다려 주세요 (약 1~2초)</span>
        </div>
        <div style="background:rgba(15,23,42,.04);border:1px solid rgba(15,23,42,.1);border-radius:12px;padding:12px;display:grid;gap:8px">
          <b>${isStandalone() ? "📱 홈 화면 앱으로 실행 중이에요!" : "🛫 비행기에서 안전하게 켜는 2가지 방법"}</b>
          ${isStandalone()
            ? `<p style="margin:0" class="small">바탕화면의 <b>🐱 냥도쿠</b> 아이콘을 누르면 인터넷이 없어도 언제든 바로 켜져요. 비행기에서 내리면 기록이 저절로 동기화됩니다.</p>`
            : `<div class="small" style="display:grid;gap:6px">
                <div><b>① 이 탭 그대로 두기 (가장 간단)</b><br>지금 열린 이 화면을 닫지 말고 비행기에서 그대로 열면 바로 플레이돼요.</div>
                <div><b>② 홈 화면에 🐱 앱 아이콘 추가 (탭이 닫혀도 안심 · 추천)</b><br>${isIOS
                  ? `사파리 아래 공유 단추(<b>⬆️</b>) → <b>[홈 화면에 추가]</b>를 누른 뒤, <b>비행기 타기 전에 바탕화면의 🐱 냥도쿠 앱을 한 번만 눌러 열어 두세요.</b> (내 이름·허용 권한·단계 기록이 앱으로 자동 복사됩니다)`
                  : `브라우저 메뉴(<b>⋮</b>) → <b>[홈 화면에 추가 / 앱 설치]</b>를 누른 뒤, 비행기 타기 전에 바탕화면의 🐱 냥도쿠 아이콘을 한 번 열어 두세요.`}</div>
              </div>`}
          <button type="button" class="btn primary" id="offInstallBtn" ${deferredInstall && !isStandalone() ? "" : "hidden"}>📲 홈 화면에 냥도쿠 앱 설치</button>
        </div>
      </div>`,
      buttons: [
        { label: "🔄 다시 받기", onClick: () => { close(); openOfflineModal(); } },
        { label: "확인", primary: true },
      ],
    });
    const instBtn = $("offInstallBtn");
    if (instBtn) instBtn.onclick = async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) {}
      deferredInstall = null; instBtn.hidden = true;
    };
    prepareOffline((done, total) => {
      const bar = $("offBar"), sub = $("offSub");
      if (bar) bar.style.width = Math.round(done / total * 100) + "%";
      if (sub) sub.textContent = `파일 확인 및 저장 중… (${done} / ${total})`;
    }).then(r => {
      const head = $("offHead"), bar = $("offBar"), sub = $("offSub"), wrap = $("offProgWrap");
      if (!head) return;
      if (bar) bar.style.width = "100%";
      const who = myName() ? `👤 <b>${esc(myName())}</b> · ${maxStage()}단계` : "👤 손님 모드";
      if (r.ok) {
        if (wrap) wrap.style.background = "rgba(16,185,129,.12)";
        head.innerHTML = "✅ 비행기 모드 준비 완료!";
        sub.innerHTML = `${who} · 퍼즐 <b>6,090단계</b> + 오늘의 퍼즐·반반·산책이 이 폰에 모두 저장되었어요.<br>비행기에서 깬 판 수·별·배지는 비행기 모드를 끄면 자동으로 올라가요.`;
      } else {
        head.innerHTML = "⚠️ 일부 파일을 아직 다 못 받았어요";
        sub.innerHTML = `인터넷이 연결된 상태에서 [🔄 다시 받기]를 한 번 눌러 주세요. (${r.okCount}/${r.total})`;
      }
    });
  }

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
    const LN = Math.min(CHUNK, list.length);   // 친구 방은 0번 묶음만 (옛 화면을 연 친구도 같은 판)
    let pid = Math.floor(Math.random() * LN), guard = 0;
    while (used.has(pid) && guard++ < 50) pid = Math.floor(Math.random() * LN);
    used.add(pid);
    const round = next ? (meta.round || 0) + 1 : 1, mode = MODE(), startAt = now() + 3500;
    const extra = {};
    if (mode === "ta") {                                                     // 타임어택: 모두 같은 순서 (섞은 문제 40개)
      extra.seq = [...Array(Math.min(CHUNK, list.length)).keys()].map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, 40);
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
  const isOn = () => typeof navigator === "undefined" || navigator.onLine !== false;
  const recRef = () => isOn() && GME.me && Arena.db() ? Arena.db().ref(`${GME.P}nyang/rec/${GME.me.pid}`) : null;
  const tx = (ref, path, f) => ref.child(path).transaction(f).catch(() => {});
  const minTx = (ref, path, v) => tx(ref, path, cur => cur == null || v < cur ? Math.round(v * 10) / 10 : undefined);
  const maxTx = (ref, path, v) => tx(ref, path, cur => cur == null || v > cur ? v : undefined);
  const addTx = (ref, path, v) => v ? tx(ref, path, cur => (cur || 0) + v) : null;
  let localMyRec = store.get("myRec", {});
  const saveMyRec = () => { const m = myRec(); if (m) store.set("myRec", m); };
  const REC = {
    both(f) { const r = recRef(); if (!r) return; const w = weekKey(); f(r, ""); f(r, `w/${w}/`); },
    best(tier, secs, n) { if (tooFast(secs, n)) return; this.both((r, p) => minTx(r, `${p}tb/${tier}`, secs)); const m = myRec(); if (m) { m.tb = m.tb || {}; if (!m.tb[tier] || secs < m.tb[tier]) m.tb[tier] = Math.round(secs * 10) / 10; saveMyRec(); } },
    ta(tier, mins, cnt) {
      if (!cnt) return; const key = `${tier}_${mins}`, wk = weekKey();
      this.both((r, p) => maxTx(r, `${p}ta/${key}`, cnt));
      const m = myRec(); if (m) { m.ta = m.ta || {}; m.ta[key] = Math.max(m.ta[key] || 0, cnt); m.w = m.w || {}; const w = (m.w[wk] = m.w[wk] || {}); w.ta = w.ta || {}; w.ta[key] = Math.max(w.ta[key] || 0, cnt); saveMyRec(); }
      const lw = store.get("taW", {}), v = lw.wk === wk ? { ...(lw.v || {}) } : {}; v[key] = Math.max(v[key] || 0, cnt); store.set("taW", { wk, v });   // 이번 주 순위에 바로 (서버 다시 읽기 전)
    },
    coop(tier, secs, n) { if (tooFast(secs, n)) return; this.both((r, p) => minTx(r, `${p}co/${tier}`, secs)); },
    solved(k) {
      if (!k) return;
      const r = recRef(), wk = weekKey();
      if (r) { addTx(r, "sv", k); addTx(r, `w/${wk}/sv`, k); }
      else { const p = store.get("recPend", {}); p.sv = (p.sv || 0) + k; p.w = p.w || {}; p.w[wk] = (p.w[wk] || 0) + k; store.set("recPend", p); }
      const m = myRec(); if (m) { m.sv = (m.sv || 0) + k; saveMyRec(); }
    },
    match(pts, won) { this.both((r, p) => { addTx(r, `${p}pts`, pts); addTx(r, `${p}games`, 1); addTx(r, `${p}wins`, won ? 1 : 0); }); const m = myRec(); if (m) { m.pts = (m.pts || 0) + pts; m.games = (m.games || 0) + 1; m.wins = (m.wins || 0) + (won ? 1 : 0); saveMyRec(); } },
    stage(k, st) {
      const loc = localStars(); if ((loc[k] || 0) < st) { loc[k] = st; store.set("stageStars", loc); }
      const r = recRef(); if (r) maxTx(r, `st/s${k}`, st);
      const m = myRec(); if (m) { m.st = m.st || {}; m.st["s" + k] = Math.max(m.st["s" + k] || 0, st); saveMyRec(); }
    },
    cnt(key) {
      const r = recRef();
      if (r) addTx(r, `cnt/${key}`, 1);
      else { const p = store.get("recPend", {}); p.cnt = p.cnt || {}; p.cnt[key] = (p.cnt[key] || 0) + 1; store.set("recPend", p); }
      const m = myRec(); if (m) { m.cnt = m.cnt || {}; m.cnt[key] = (m.cnt[key] || 0) + 1; saveMyRec(); }
    },
    ach(id) { const r = recRef(); if (r) r.child(`ach/${id}`).set(firebase.database.ServerValue.TIMESTAMP).catch(() => {}); saveMyRec(); },
    day(key, v, n) {                                                         // 📅 오늘의 퍼즐: 그날 처음 성공한 판만 (폰에 먼저, 서버는 말이 안 되게 빠른 기록 빼고)
      const loc = store.get("day", {});
      if (!loc[key]) { loc[key] = v; store.set("day", Object.fromEntries(Object.entries(loc).sort().slice(-400))); }
      const m = myRec(); if (m) { m.day = m.day || {}; if (!m.day[key]) m.day[key] = v; saveMyRec(); }
      const r = recRef(); if (r && !tooFast(v.s, n)) tx(r, `day/${key}`, cur => cur && cur.s ? undefined : v);
    },
    bday(key, v, n) { this.kday("bday", key, v, n); },                       // 🌗 오늘의 반반
    kday(f, key, v, n) {                                                     // 🌗 bday · 🐾 zday: 오늘의 판 (같은 모양, 처음 성공만)
      const loc = store.get(f, {});
      if (!loc[key]) { loc[key] = v; store.set(f, Object.fromEntries(Object.entries(loc).sort().slice(-400))); }
      const m = myRec(); if (m) { m[f] = m[f] || {}; if (!m[f][key]) m[f][key] = v; saveMyRec(); }
      const r = recRef(); if (r && !(v.s >= n * n * 0.25)) return;            // 말이 안 되게 빠른 기록은 폰에만
      if (r) tx(r, `${f}/${key}`, cur => cur && cur.s ? undefined : v);
    },
  };
  // 비행기 모드·오프라인에서 쌓인 내 퍼즐 기록(단계 별·오늘의 퍼즐·최고 시간·타임어택·배지·푼 수)을 온라인 복귀 때 서버로 자동 동기화
  function syncLocalToServer(srvRec) {
    const r = recRef(); if (!r) return;
    const srv = srvRec || {};
    const pend = store.get("recPend", null);
    if (pend) {
      store.set("recPend", null);
      if (pend.sv) addTx(r, "sv", pend.sv);
      for (const [wk, v] of Object.entries(pend.w || {})) addTx(r, `w/${wk}/sv`, v);
      for (const [k, v] of Object.entries(pend.cnt || {})) addTx(r, `cnt/${k}`, v);
    }
    const locSt = localStars(), srvSt = srv.st || {};
    for (const [k, st] of Object.entries(locSt)) if ((srvSt["s" + k] || 0) < st) maxTx(r, `st/s${k}`, st);
    const locBt = store.get("bestT", {}), srvTb = srv.tb || {};
    for (const [tier, secs] of Object.entries(locBt)) {
      const T = TIERS.find(t => t.id === tier);
      if (T && !tooFast(secs, T.n) && (srvTb[tier] == null || secs < srvTb[tier])) minTx(r, `tb/${tier}`, secs);
    }
    const locTa = store.get("taBest", {}), srvTa = srv.ta || {};
    for (const [tier, cnt] of Object.entries(locTa)) { const key = `${tier}_${TA_SOLO_MIN}`; if (cnt > (srvTa[key] || 0)) maxTx(r, `ta/${key}`, cnt); }
    const lw = store.get("taW", {});
    if (lw && lw.wk && lw.v) {
      const srvW = ((srv.w || {})[lw.wk] || {}).ta || {};
      for (const [key, cnt] of Object.entries(lw.v)) {
        if (cnt > (srvW[key] || 0)) maxTx(r, `w/${lw.wk}/ta/${key}`, cnt);
        if (cnt > (srvTa[key] || 0)) maxTx(r, `ta/${key}`, cnt);
      }
    }
    for (const f of ["day", "bday", "zday"]) {
      const locD = store.get(f, {}), srvD = srv[f] || {};
      for (const [key, v] of Object.entries(locD)) {
        if (!v || !v.s || (srvD[key] && srvD[key].s)) continue;
        if (f === "day") { const d = dailyInfo(key), T = TIERS.find(t => t.id === d.tier); if (T && tooFast(v.s, T.n)) continue; }
        tx(r, `${f}/${key}`, cur => cur && cur.s ? undefined : v);
      }
    }
    const locAch = (localMyRec && localMyRec.ach) || {}, srvAch = srv.ach || {};
    for (const [id, ts] of Object.entries(locAch)) if (!srvAch[id]) r.child(`ach/${id}`).set(ts || firebase.database.ServerValue.TIMESTAMP).catch(() => {});
  }
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
    if (!isOn()) { if (rkData) return rkData; throw new Error("오프라인 모드예요 — 내 기록은 폰에 저장되고 인터넷이 연결되면 자동으로 올라가요"); }
    await Arena.init();
    const db = Arena.db(); if (!db) throw new Error("랭킹은 인터넷에 연결된 실제 사이트에서 보여요");
    const [rec, people] = await Promise.race([
      Promise.all([db.ref(`${GME.P}nyang/rec`).get(), GME.loadAll(db)]),
      new Promise((_, rej) => setTimeout(() => rej(new Error("연결 시간 초과")), 3500))
    ]);
    const recVal = rec.val() || {};
    if (GME.me && GME.me.pid) {
      const srv = recVal[GME.me.pid] || {};
      syncLocalToServer(srv);
      localMyRec = Object.assign({}, localMyRec, srv, {
        st: Object.assign({}, localMyRec.st, srv.st),
        ach: Object.assign({}, localMyRec.ach, srv.ach),
        cnt: Object.assign({}, localMyRec.cnt, srv.cnt),
        ta: Object.assign({}, localMyRec.ta, srv.ta),
        tb: Object.assign({}, localMyRec.tb, srv.tb),
      });
      recVal[GME.me.pid] = localMyRec;
      store.set("myRec", localMyRec);
    }
    return (rkData = { rec: recVal, names: Object.fromEntries(people.map(p => [p.pid, p.n])) });
  }
  const myRec = () => (rkData && GME.me && (rkData.rec[GME.me.pid] || (rkData.rec[GME.me.pid] = localMyRec))) || (GME.me ? localMyRec : null);
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
  updateOffBtn();
  if (typeof addEventListener === "function") addEventListener("online", () => {
    if (window.GRank && GRank.flush) GRank.flush();
    drawSoloProg(true);
  });
  Arena.init().then(() => { const db = Arena.db(); return db ? GME.ensure(db) : null; }).then(() => { drawMe(); return drawSoloProg(true); }).then(() => { syncShareHash(); }).catch(() => { drawMe(); drawSoloProg(false); syncShareHash(); });   // 처음 오면 이름부터 (시험 화면은 건너뜀)
  bankP.then(() => {
    drawTiers();
    if (window.ArenaUI) ArenaUI.checkUrl(() => openFriend());
    bankIdxP.then(() => {
      const s = stageInfo(maxStage() + 1);
      if (s.chunk > 0) loadChunks(s.tier, s.chunk);
      if (maxStage() >= 800) loadChunks("master", s.chunk + 1);
      const offR = store.get("offlineReady", null);
      if (isStandalone() && !offR) {
        prepareOffline().then(r => { if (r.ok) toast("✈️ 홈 화면 앱 오프라인 준비 완료! (6,090단계)", 3200); }).catch(() => {});
      } else if (offR && offR.v < OFFLINE_VER && isOn() && !/[?&](mock|guest)\b/.test(location.search)) {
        prepareOffline().catch(() => {});   // 캐시 버전이 올라갔으면 온라인일 때 조용히 최신 파일로 다시 채움
      }
    }).catch(() => {});
  }).catch(e => { $("tiers").textContent = "퍼즐을 못 불러왔어요: " + e.message; });
  window.__ny = { get G() { return G; }, get TA() { return TA; }, get meta() { return meta; }, get prog() { return prog; }, get myRound() { return myRound; }, NY,   // 점검용
    dailyInfo, kstDay, dayBoard, dayTops, streakOf, bestStreak, setRk: d => { rkData = d; if (soloMode === "day") drawDay(); if (d) { drawRankStrip(); if (soloMode === "ta") drawTABoard(); } },
    setFam: d => { fam = d; famAt = Date.now(); return drawSoloProg(); }, openCalendar, myDays, syncLocalToServer, prepareOffline, openOfflineModal, syncShareHash,
    stageInfo, playStage, loadChunks, bankIdxP, get bankIdx() { return bankIdx; }, weekKey, bankAt: (t, i) => bank[t][i] };
})();

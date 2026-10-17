/* 냥도쿠 — AI 구경: 잘하는 AI(🧠 사람식 추론)가 푸는 모습을 한 수씩 (이유를 말하며)
   힌트 엔진(core.js nextHint)을 그대로 — 정답 칸만 놓으니 실수 0. 난이도만 고르고, 문제 번호·개수는 안 보여 줌
   판은 처음 한 번만 그리고 칸 안의 ✕·🐱를 보였다 숨겼다 (크기 안 바뀜) */
(() => {
  const $ = id => document.getElementById(id);

  function* reasoner(p) {
    const g = new NY.Game(p, { autoX: false });
    let steps = 0;
    yield { cats: new Set(), xs: new Set(), say: "어디부터 볼까요…", steps };
    while (!g.over) {
      const h = NY.nextHint(g);
      if (!h) { yield { cats: new Set(g.cats), xs: new Set(g.xs), say: "더 생각할 수 있는 게 없어요", steps, done: true }; return; }
      if (h.act === "cat") g.place(h.target[0]);
      else for (const k of h.target) g.setX(k, h.act === "x");
      steps++;
      yield { cats: new Set(g.cats), xs: new Set(g.xs), focus: h.target, look: h.look, say: h.why, steps, n: g.n, done: g.won };
    }
  }
  const SPEEDS = [["느리게", 1], ["보통", 3], ["빠르게", 10]];

  let run = null, timer = null, tier = "easy", speed = 3;
  const bank = () => window.__nyBank;
  const recent = [];
  function boardHtml(p) {
    const { n, reg } = NY.decode(p);
    let h = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = reg[r][c];
      h += `<div class="c" data-k="${r * n + c}" style="background:${NY.COLORS[g % NY.COLORS.length][0]}"><span class="x">✕</span><span class="cat">🐱</span></div>`;
    }
    return `<div class="wboard" style="--n:${n};grid-template-columns:repeat(${n},minmax(0,1fr));grid-template-rows:repeat(${n},minmax(0,1fr))">${h}</div>`;
  }
  function paint() {
    const st = run.last; if (!st) return;
    const focus = new Set(st.focus || []), look = new Set(st.look || []);
    for (const el of run.cells) {
      const k = +el.dataset.k;
      el.classList.toggle("has-cat", st.cats.has(k));
      el.classList.toggle("has-x", st.xs.has(k) && !st.cats.has(k));
      el.classList.toggle("tgt", focus.has(k));
      el.classList.toggle("look", look.has(k) && !focus.has(k));
    }
    $("wSay").textContent = st.say || "";
    $("wCats").textContent = `🐱 ${st.cats.size}`;
    $("wSteps").textContent = `${st.steps}수`;
  }
  function step() {
    if (!run || run.finished) return;
    const r = run.it.next();
    if (r.done) { run.finished = true; finish(); return; }
    run.last = r.value; paint();
    if (r.value.done) { run.finished = true; finish(); }
  }
  function finish() {
    pause();
    $("wSay").textContent = `다 풀었어요! ${run.last.steps}수 만에, 실수 없이. 🎉`;
    $("wPlay").textContent = "↺ 다시 보기";
  }
  function pause() { clearInterval(timer); timer = null; if (run && !run.finished) $("wPlay").textContent = "▶ 이어 보기"; }
  function play() { clearInterval(timer); timer = setInterval(step, 1000 / speed); $("wPlay").textContent = "⏸ 멈춤"; }
  function pickIndex() {
    const n = bank()[tier].length;
    let i, guard = 0;
    do { i = Math.floor(Math.random() * n); } while (recent.includes(tier + i) && guard++ < 30);
    recent.unshift(tier + i); recent.length = Math.min(recent.length, 8);
    return i;
  }
  function setup(sameIdx) {
    pause();
    if (!bank()) return;
    const i = sameIdx ?? pickIndex(), p = bank()[tier][i];
    $("wStage").innerHTML = boardHtml(p);
    run = { i, it: reasoner(p), cells: [...$("wStage").querySelectorAll(".c")], last: null, finished: false };
    step();
    $("wPlay").textContent = "▶ 보기";
  }
  function segSpeed() {
    $("wSpeed").innerHTML = SPEEDS.map(([l, v]) => `<button class="btn" data-v="${v}" aria-pressed="${v === speed}">${l}</button>`).join("");
    for (const b of $("wSpeed").children) b.onclick = () => { speed = +b.dataset.v; segSpeed(); if (timer) play(); };
  }
  window.NYWATCH = { open() { if (!run) { segSpeed(); setup(); } }, close() { pause(); } };
  $("wTier").onchange = () => { tier = $("wTier").value; setup(); };
  $("wNew").onclick = () => setup();
  $("wPlay").onclick = () => { if (timer) pause(); else if (run && run.finished) { setup(run.i); play(); } else play(); };
  $("wStep").onclick = () => { pause(); if (run && run.finished) setup(run.i); else step(); };
})();

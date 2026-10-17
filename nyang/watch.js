/* 냥도쿠 — AI 구경: 같은 판을 AI 들이 푸는 모습을 나란히 (문제는 번호로 고름, 속도·한 걸음씩)
   🧠 사람식 추론: 힌트 엔진(core.js nextHint)을 그대로 — 한 수마다 이유를 말함, 정답 칸만 놓으니 실수 0
   🎲 되돌아가기: 위 줄부터 '놓을 수 있는 칸'에 일단 놓아 보고, 막히면 되돌림 — 앱이었으면 정답 아닌 칸에 놓을 때마다 실수
   판은 처음 한 번만 그리고 칸 내용만 바꿈 (크기가 출렁이지 않게) */
(() => {
  const $ = id => document.getElementById(id);

  // ── AI 들: 한 걸음씩 내보내는 생성기. 걸음 = { cats:Set, xs:Set, focus:[], look:[], say, steps|tries, wrong, done }
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
      yield { cats: new Set(g.cats), xs: new Set(g.xs), focus: h.target, look: h.look, say: h.why, steps, done: g.won };
    }
  }
  function* backtracker(p) {
    const { n, reg, ans } = NY.decode(p);
    const cols = Array(n).fill(-1), usedC = new Set(), usedR = new Set();
    let tries = 0, wrong = 0;
    const cats = () => new Set(cols.map((c, r) => c >= 0 ? r * n + c : -1).filter(k => k >= 0));
    yield { cats: new Set(), say: "1번째 줄부터 놓아 볼게요", tries, wrong };
    function* rec(r) {
      if (r === n) return true;
      for (let c = 0; c < n; c++) {
        const g = reg[r][c];
        if (usedC.has(c) || usedR.has(g) || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
        cols[r] = c; usedC.add(c); usedR.add(g); tries++;
        if (ans[r] !== c) wrong++;
        yield { cats: cats(), focus: [r * n + c], say: `${r + 1}번째 줄 ${c + 1}번째 칸에 놓아 봐요`, tries, wrong };
        if (yield* rec(r + 1)) return true;
        cols[r] = -1; usedC.delete(c); usedR.delete(g);
        yield { cats: cats(), back: r * n + c, say: `더 갈 데가 없어요 → ${r + 1}번째 줄 고양이를 빼요`, tries, wrong };
      }
      return false;
    }
    yield* rec(0);
    yield { cats: cats(), say: "다 놓았어요!", tries, wrong, done: true };
  }
  const AIS = [
    { id: "reason", name: "🧠 사람식 추론", desc: "지워 가며 생각 · 정답 칸만 놓음", make: reasoner },
    { id: "back", name: "🎲 되돌아가기", desc: "일단 놓아 보고 막히면 되돌림", make: backtracker },
  ];
  const SPEEDS = [["slow", "느리게", 1.5], ["mid", "보통", 5], ["fast", "빠르게", 25]];

  // ── 화면
  let runs = [], timer = null, tier = "easy", idx = 0, speed = 5;
  const bank = () => window.__nyBank;
  function boardHtml(p) {
    const { n, reg } = NY.decode(p);
    let h = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = reg[r][c];
      h += `<div class="c" data-k="${r * n + c}" style="background:${NY.COLORS[g % NY.COLORS.length][0]}"><span class="x">✕</span><span class="cat">🐱</span></div>`;
    }
    return `<div class="wboard" style="--n:${n};grid-template-columns:repeat(${n},minmax(0,1fr));grid-template-rows:repeat(${n},minmax(0,1fr))">${h}</div>`;
  }
  function paintRun(run) {
    const st = run.last; if (!st) return;
    const xs = st.xs || new Set(), focus = new Set(st.focus || []), look = new Set(st.look || []);
    for (const el of run.cells) {
      const k = +el.dataset.k;
      el.classList.toggle("has-cat", st.cats.has(k));
      el.classList.toggle("has-x", xs.has(k) && !st.cats.has(k));
      el.classList.toggle("tgt", focus.has(k));
      el.classList.toggle("look", look.has(k) && !focus.has(k));
      el.classList.toggle("back", st.back === k);
    }
    run.say.textContent = st.say || "";
    run.stat.innerHTML = run.ai.id === "reason"
      ? `<span><i>걸음</i><b>${st.steps || 0}</b></span><span><i>실수</i><b>0</b></span>`
      : `<span><i>놓아 봄</i><b>${st.tries || 0}</b></span><span><i>앱이면 실수</i><b class="badn">${st.wrong || 0}</b></span>`;
    run.el.classList.toggle("finished", !!st.done);
  }
  function stepAll() {
    for (const run of runs) {
      if (run.finished) continue;
      const r = run.it.next();
      if (r.done) { run.finished = true; continue; }
      run.last = r.value;
      if (r.value.done) run.finished = true;
      paintRun(run);
    }
    if (runs.length && runs.every(r => r.finished)) { pause(); summary(); }
  }
  function summary() {
    const a = runs[0].last, b = runs[1].last;
    $("wSum").hidden = false;
    $("wSum").innerHTML = `🧠 <b>${a.steps}</b>걸음 · 실수 0 &nbsp;vs&nbsp; 🎲 <b>${b.tries}</b>번 놓아 봄 · 앱이었으면 실수 <b class="badn">${b.wrong}</b>`;
    $("wPlay").textContent = "↺ 처음부터";
  }
  function pause() { clearInterval(timer); timer = null; if (!runs.every(r => r.finished)) $("wPlay").textContent = "▶ 이어 보기"; }
  function play() { clearInterval(timer); timer = setInterval(stepAll, 1000 / speed); $("wPlay").textContent = "⏸ 멈춤"; }
  function setup() {
    pause();
    const list = bank() && bank()[tier]; if (!list) return;
    idx = Math.max(0, Math.min(idx, list.length - 1));
    const p = list[idx];
    $("wNo").textContent = `${idx + 1} / ${list.length}`;
    $("wInfo").textContent = `${p.n}×${p.n}`;
    $("wSum").hidden = true;
    $("wRuns").innerHTML = AIS.map(a => `<div class="wrun" data-ai="${a.id}"><div class="whead"><b>${a.name}</b><span class="small">${a.desc}</span></div>${boardHtml(p)}<div class="wstat"></div><div class="wsay"></div></div>`).join("");
    runs = AIS.map(ai => {
      const el = $("wRuns").querySelector(`[data-ai="${ai.id}"]`);
      const run = { ai, it: ai.make(p), el, cells: [...el.querySelectorAll(".c")], say: el.querySelector(".wsay"), stat: el.querySelector(".wstat"), last: null, finished: false };
      const first = run.it.next(); run.last = first.value; paintRun(run);
      return run;
    });
    $("wPlay").textContent = "▶ 보기";
  }
  function segSpeed() {
    $("wSpeed").innerHTML = SPEEDS.map(([id, l, v]) => `<button class="btn" data-v="${v}" aria-pressed="${v === speed}">${l}</button>`).join("");
    for (const b of $("wSpeed").children) b.onclick = () => { speed = +b.dataset.v; segSpeed(); if (timer) play(); };
  }
  window.NYWATCH = { open() { if (!runs.length) { segSpeed(); setup(); } }, close() { pause(); } };
  $("wTier").onchange = () => { tier = $("wTier").value; idx = 0; setup(); };
  $("wPrev").onclick = () => { idx--; setup(); };
  $("wNext").onclick = () => { idx++; setup(); };
  $("wPlay").onclick = () => { if (timer) pause(); else if (runs.length && runs.every(r => r.finished)) { setup(); play(); } else play(); };
  $("wStep").onclick = () => { pause(); if (runs.length && runs.every(r => r.finished)) setup(); else stepAll(); };
})();

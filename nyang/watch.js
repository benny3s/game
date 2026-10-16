/* 냥도쿠 — AI 구경: 같은 판을 AI 들이 푸는 모습을 나란히 (속도 조절)
   🧠 사람식 추론: 힌트 엔진(core.js nextHint)을 그대로 — 한 수마다 이유를 말함, 정답 칸만 놓으니 실수 0
   🎲 되돌아가기: 위 줄부터 '놓을 수 있는 칸'에 일단 놓아 보고, 막히면 되돌림 — 앱이었으면 정답 아닌 칸에 놓을 때마다 실수
   (학습한 모델 — 작은 신경망 PPO · 언어모델 — 은 학습이 끝나면 여기에 추가) */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ── AI 들: 한 걸음씩 내보내는 생성기. 걸음 = { cats:Set, xs:Set, tent:Set(되돌릴 수 있는 고양이), focus:[], say, done, wrong }
  function* reasoner(p) {
    const g = new NY.Game(p, { autoX: false });
    let steps = 0;
    while (!g.over) {
      const h = NY.nextHint(g);
      if (!h) { yield { g, say: "더 생각할 수 있는 게 없어요", stuck: true }; return; }
      if (h.act === "cat") g.place(h.target[0]);
      else for (const k of h.target) g.setX(k, h.act === "x");
      steps++;
      yield { g, focus: h.target, look: h.look, say: h.why, steps, kind: h.kind };
    }
  }
  function* backtracker(p) {
    const { n, reg, ans } = NY.decode(p);
    const cols = Array(n).fill(-1), usedC = new Set(), usedR = new Set();
    let tries = 0, wrong = 0;
    const view = () => ({ cats: new Set(cols.map((c, r) => c >= 0 ? r * n + c : -1).filter(k => k >= 0)), n });
    function* rec(r) {
      if (r === n) return true;
      for (let c = 0; c < n; c++) {
        const g = reg[r][c];
        if (usedC.has(c) || usedR.has(g) || (r > 0 && Math.abs(cols[r - 1] - c) <= 1)) continue;
        cols[r] = c; usedC.add(c); usedR.add(g); tries++;
        if (ans[r] !== c) wrong++;
        yield { ...view(), focus: [r * n + c], say: `${r + 1}번째 줄 ${c + 1}번째 칸에 놓아 봐요`, tries, wrong };
        if (yield* rec(r + 1)) return true;
        cols[r] = -1; usedC.delete(c); usedR.delete(g);
        yield { ...view(), focus: [r * n + c], say: `막혔어요 → ${r + 1}번째 줄 고양이를 빼고 다음 칸으로`, tries, wrong, back: true };
      }
      return false;
    }
    yield* rec(0);
    yield { ...view(), say: "다 놓았어요", tries, wrong, done: true };
  }
  const AIS = [
    { id: "reason", name: "🧠 사람식 추론", desc: "사람이 푸는 순서대로 지워 가며 · 정답 칸만 놓음", make: reasoner },
    { id: "back", name: "🎲 되돌아가기", desc: "일단 놓아 보고 막히면 되돌림 · 생각은 안 함", make: backtracker },
  ];

  // ── 화면
  let runs = [], timer = null, puzzle = null, speed = 4;
  function boardHtml(p) {
    const { n, reg } = NY.decode(p);
    let h = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const g = reg[r][c], col = NY.COLORS[g % NY.COLORS.length][0];
      const bt = r > 0 && reg[r - 1][c] !== g ? " bt" : "", bl = c > 0 && reg[r][c - 1] !== g ? " bl" : "";
      h += `<div class="c${bt}${bl}" data-k="${r * n + c}" style="background:${col}"></div>`;
    }
    return `<div class="wboard n${n}" style="grid-template-columns:repeat(${n},1fr)">${h}</div>`;
  }
  function paintRun(run) {
    const st = run.last; if (!st) return;
    const cats = st.g ? st.g.cats : st.cats, xs = st.g ? st.g.xs : new Set();
    const focus = new Set(st.focus || []), look = new Set(st.look || []);
    for (const el of run.el.querySelectorAll(".c")) {
      const k = +el.dataset.k;
      el.innerHTML = cats.has(k) ? '<span class="cat">🐱</span>' : xs.has(k) ? '<span class="x">✕</span>' : "";
      el.classList.toggle("tgt", focus.has(k));
      el.classList.toggle("look", look.has(k) && !focus.has(k));
    }
    const done = st.done || (st.g && st.g.won);
    run.el.querySelector(".wsay").textContent = st.say || "";
    run.el.querySelector(".wstat").innerHTML = run.ai.id === "reason"
      ? `걸음 <b>${st.steps || 0}</b> · 실수 <b>0</b>${done ? ' · <b style="color:var(--good)">다 풂</b>' : ""}`
      : `놓아 본 횟수 <b>${st.tries || 0}</b> · 앱이었으면 실수 <b style="color:var(--bad)">${st.wrong || 0}</b>${done ? ' · <b style="color:var(--good)">다 풂</b>' : ""}`;
  }
  function tick() {
    let alive = false;
    for (const run of runs) {
      if (run.finished) continue;
      const r = run.it.next();
      if (r.done) { run.finished = true; continue; }
      run.last = r.value; alive = true;
      if (r.value.done || (r.value.g && r.value.g.over) || r.value.stuck) run.finished = true;
      paintRun(run);
    }
    if (!alive || runs.every(r => r.finished)) stop();
  }
  function stop() { clearInterval(timer); timer = null; $("wPlay").textContent = "▶ 다시 보기"; }
  function start() {
    if (!puzzle) return;
    stop();
    $("wRuns").innerHTML = AIS.map(a => `<div class="wrun panel" data-ai="${a.id}"><div><b>${a.name}</b> <span class="small">${a.desc}</span></div>${boardHtml(puzzle)}<div class="wstat small"></div><div class="wsay"></div></div>`).join("");
    runs = AIS.map(ai => ({ ai, it: ai.make(puzzle), el: $("wRuns").querySelector(`[data-ai="${ai.id}"]`), last: null, finished: false }));
    timer = setInterval(tick, 1000 / speed);
    $("wPlay").textContent = "⏸ 멈춤";
  }
  function pick() {
    const tier = $("wTier").value, list = window.__nyBank && window.__nyBank[tier];
    if (!list) return;
    const i = Math.floor(Math.random() * list.length);
    puzzle = list[i];
    $("wInfo").textContent = `${$("wTier").selectedOptions[0].textContent} · ${i + 1}단계 · ${puzzle.n}×${puzzle.n}`;
    start();
  }
  window.NYWATCH = {
    open() { if (!puzzle) pick(); },
    close() { stop(); },
  };
  $("wNew").onclick = pick;
  $("wTier").onchange = pick;
  $("wPlay").onclick = () => { if (timer) { stop(); $("wPlay").textContent = "▶ 이어 보기"; } else if (runs.length && !runs.every(r => r.finished)) { timer = setInterval(tick, 1000 / speed); $("wPlay").textContent = "⏸ 멈춤"; } else start(); };
  $("wSpeed").oninput = () => { speed = +$("wSpeed").value; $("wSpeedV").textContent = speed + "걸음/초"; if (timer) { clearInterval(timer); timer = setInterval(tick, 1000 / speed); } };
})();

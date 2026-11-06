/* 🌗 반반 판 화면 (11-06) — 엔진은 banban.js(NYB). 냥도쿠 판과 같은 모양(위 줄 · 판 · 아래 단추), 따로 그리는 판
   누르면 빈칸 → 🐈 치즈냥 → 🐈‍⬛ 까망냥 → 빈칸. 규칙에 어긋나면 그 칸·표시가 빨개짐(LinkedIn Tango 처럼 벌점·물고기 없음)
   💡 힌트 = 틀린 칸부터, 아니면 사람이 푸는 순서의 다음 한 걸음 (까닭 + 적용) · ↶ 되돌리기 · 🧽 처음부터
   NYBUI.start({ pz, label, onWin({ secs, hints, undo }), onExit() }) · NYBUI.close() */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const CAT = ["🐈", "🐈‍⬛"], NAME = ["치즈냥", "까망냥"];
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };
  const snd = (n, o) => window.NYSND && NYSND.play(n, o);
  let P = null, cells = null, undo = [], hints = 0, t0 = 0, timerT = 0, over = false, hint = null, opt = null, backAt = 0;

  function ensure() {
    if ($("bplay")) return;
    const s = document.createElement("section");
    s.className = "play bplay"; s.id = "bplay"; s.hidden = true;
    s.innerHTML = `<div class="bar"><button class="iconbtn" id="bBack" aria-label="나가기">‹</button><div class="mid"><span class="lbl" id="bLabel"></span><span class="t" id="bTimer">0:00</span></div><span class="pill" id="bCount"></span></div>
      <p class="small bb-rule">줄·열마다 🐈 치즈냥 · 🐈‍⬛ 까망냥 반반 · 셋 연속은 안 돼요 · <b>=</b> 같은 고양이 · <b>×</b> 다른 고양이</p>
      <div class="boardwrap"><div id="bboard" class="bboard"></div></div>
      <div class="hintbox" id="bHint" hidden><p id="bHintText"></p><div class="row"><button class="btn primary" id="bHintApply">적용</button><button class="btn ghost" id="bHintClose">닫기</button></div></div>
      <div class="dock" id="bDock">
        <button id="bHintBtn"><span class="ic">💡</span><span>힌트</span></button>
        <button id="bUndo"><span class="ic">↶</span><span>되돌리기</span></button>
        <button id="bClear"><span class="ic">🧽</span><span>처음부터</span></button>
      </div>`;
    document.body.appendChild(s);
    $("bBack").onclick = () => {
      if (!over && performance.now() - backAt > 2000) { backAt = performance.now(); if (window.Cozy) Cozy.toast("한 번 더 누르면 나가요"); return; }
      close(); if (opt && opt.onExit) opt.onExit();
    };
    $("bHintBtn").onclick = useHint;
    $("bHintApply").onclick = applyHint;
    $("bHintClose").onclick = () => { hint = null; $("bHint").hidden = true; paint(); };
    $("bUndo").onclick = () => { if (over || !undo.length) return; const [k, v] = undo.pop(); cells[k] = v; snd("unx"); paint(); };
    $("bClear").onclick = () => { if (over) return; for (let k = 0; k < cells.length; k++) if (P.given[k] < 0 && cells[k] >= 0) { undo.push([k, cells[k]]); cells[k] = -1; } paint(); };
    $("bboard").addEventListener("click", e => { const b = e.target.closest(".bc"); if (b) tap(+b.dataset.k); });
  }

  function start(o) {
    ensure();
    opt = o; P = o.pz; cells = Array.from(P.given); undo = []; hints = 0; over = false; hint = null;
    for (const id of ["home", "play"]) if ($(id)) $(id).hidden = true;
    $("bplay").hidden = false; document.body.classList.add("playing");
    $("bLabel").textContent = o.label || "🌗 반반"; $("bHint").hidden = true;
    build(); paint();
    t0 = performance.now(); clearInterval(timerT);
    timerT = setInterval(() => { if (!over) $("bTimer").textContent = fmt((performance.now() - t0) / 1000); }, 100);
    snd("start");
  }
  function close() { clearInterval(timerT); over = true; if ($("bplay")) $("bplay").hidden = true; document.body.classList.remove("playing"); }

  // 판: 칸 N×N + 칸 사이 표시 (=·×) 를 칸 경계 위에
  function build() {
    const N = P.N, el = $("bboard");
    el.style.setProperty("--n", N);
    let h = "";
    for (let k = 0; k < N * N; k++) h += `<button type="button" class="bc${P.given[k] >= 0 ? " g" : ""}" data-k="${k}" aria-label="${Math.floor(k / N) + 1}줄 ${k % N + 1}칸"><span></span></button>`;
    for (const [a, b, s] of NYB.signs(P)) {
      const r = Math.floor(a / N), c = a % N, horiz = b === a + 1;
      const x = horiz ? (c + 1) / N * 100 : (c + 0.5) / N * 100, y = horiz ? (r + 0.5) / N * 100 : (r + 1) / N * 100;
      h += `<i class="bs" data-s="${a}-${b}" style="left:${x}%;top:${y}%">${s === 1 ? "=" : "×"}</i>`;
    }
    el.innerHTML = h;
  }
  function paint() {
    const el = $("bboard"), cf = NYB.conflicts(P, cells), three = new Set(cf.three), N = P.N;
    const overCells = new Set();
    for (const ln of NYB.lines(P)) if (cf.over.includes(ln.kind + ln.i)) ln.cells.forEach(k => overCells.add(k));
    const hk = hint ? hint.k : -1, hf = new Set(hint ? hint.from : []);
    el.querySelectorAll(".bc").forEach(b => {
      const k = +b.dataset.k, v = cells[k];
      b.classList.toggle("z", v === 0); b.classList.toggle("o", v === 1);
      b.classList.toggle("bad", three.has(k)); b.classList.toggle("over", overCells.has(k));
      b.classList.toggle("hint", k === hk); b.classList.toggle("hfrom", hf.has(k));
      b.firstChild.textContent = v >= 0 ? CAT[v] : "";
    });
    const bad = new Set(cf.badSign);
    el.querySelectorAll(".bs").forEach(s => s.classList.toggle("bad", bad.has(s.dataset.s)));
    const filled = cells.filter(v => v >= 0).length;
    $("bCount").textContent = `${filled}/${N * N}`;
  }
  function tap(k) {
    if (over || P.given[k] >= 0) return;
    const v = cells[k], nv = v < 0 ? 0 : v === 0 ? 1 : -1;
    undo.push([k, v]); cells[k] = nv;
    if (hint) { hint = null; $("bHint").hidden = true; }
    snd(nv < 0 ? "unx" : "cat");
    paint();
    if (cells.every(x => x >= 0)) {
      if (NYB.done(P, cells)) win();
      else if (!NYB.conflicts(P, cells).any) { if (window.Cozy) Cozy.toast("다 채웠는데 어딘가 달라요 — 💡 힌트로 틀린 칸을 찾아봐요", 2600); }
    }
  }
  function win() {
    over = true; clearInterval(timerT);
    const secs = (performance.now() - t0) / 1000;
    $("bTimer").textContent = fmt(secs);
    $("bboard").classList.add("won"); setTimeout(() => $("bboard").classList.remove("won"), 1200);
    snd("win"); if (window.Cozy) setTimeout(() => Cozy.confetti(), 150);
    setTimeout(() => { if (opt && opt.onWin) opt.onWin({ secs, hints, n: P.N, undo: undo.length }); }, 700);
  }

  // 💡 힌트: 까닭 글 + 적용 (힌트 한 번 = 한 번으로 셈)
  function why(h) {
    const ln = h.line ? (h.line.kind === "row" ? `${h.line.i + 1}번째 줄` : `${h.line.i + 1}번째 열`) : "", nm = v => NAME[v];
    switch (h.why) {
      case "wrong": return "이 칸이 틀렸어요. 지우고 다시 생각해 봐요";
      case "eq": return `<b>=</b> 표시: 붙은 칸과 같은 고양이 → 여기는 ${CAT[h.v]} ${nm(h.v)}`;
      case "ne": return `<b>×</b> 표시: 붙은 칸과 다른 고양이 → 여기는 ${CAT[h.v]} ${nm(h.v)}`;
      case "pair": return `${ln}: 같은 고양이 둘이 붙어 있으면 바로 옆은 다른 고양이 (셋 연속은 안 돼요) → ${CAT[h.v]} ${nm(h.v)}`;
      case "gap": return `${ln}: 같은 고양이 둘 사이에 낀 칸은 다른 고양이 (셋 연속은 안 돼요) → ${CAT[h.v]} ${nm(h.v)}`;
      case "full": return `${ln}에 ${nm(1 - h.v)}가 벌써 ${P.N / 2}마리 — 나머지 칸은 ${CAT[h.v]} ${nm(h.v)}`;
      case "line": return `${ln}에 들어갈 수 있는 배치를 다 따져 보면(${h.n}가지) 여기는 늘 ${CAT[h.v]} ${nm(h.v)}`;
      default: return `여기는 ${CAT[h.v]} ${nm(h.v)}`;
    }
  }
  function useHint() {
    if (over) return;
    const h = NYB.hint(P, cells); if (!h) return;
    hints++; hint = h;
    $("bHintText").innerHTML = "💡 " + why(h);
    $("bHintApply").textContent = h.why === "wrong" ? "지우기" : "적용";
    $("bHint").hidden = false; snd("hint");
    paint();
  }
  function applyHint() {
    if (!hint || over) return;
    const h = hint; hint = null; $("bHint").hidden = true;
    undo.push([h.k, cells[h.k]]); cells[h.k] = h.why === "wrong" ? -1 : h.v;
    paint();
    if (cells.every(x => x >= 0) && NYB.done(P, cells)) win();
  }

  window.NYBUI = { start, close, get cells() { return cells; }, get pz() { return P; }, get hints() { return hints; }, tap, get over() { return over; } };
})();

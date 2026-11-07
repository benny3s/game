/* 🐾 냥산책 판 화면 (11-06) — 엔진은 zip.js(NYZ). 냥도쿠 판과 같은 모양(위 줄 · 판 · 아래 단추)
   1번 칸에서 손가락을 대고 끌면 길이 이어짐 (위아래 · 옆으로만, 번호는 순서대로만). 지나온 칸으로 되돌아가면 거기까지 지워짐 · 길 위 칸을 누르면 거기까지
   💡 힌트 = 답과 처음 달라진 곳(그 칸부터 지움) 또는 다음 칸 · ↶ 한 칸 지우기 · 🧽 처음부터. 물고기·실패 없음
   NYZUI.start({ pz, label, onWin({ secs, hints }), onExit() }) · NYZUI.close() */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)}`; };
  const snd = (n, o) => window.NYSND && NYSND.play(n, o);
  const toast = (m, ms) => window.Cozy && Cozy.toast(m, ms || 1600);
  let P = null, path = [], hints = 0, t0 = 0, timerT = 0, over = false, hint = null, opt = null, backAt = 0, drag = false, dragId = -1;

  function ensure() {
    if ($("zplay")) return;
    const s = document.createElement("section");
    s.className = "play zplay"; s.id = "zplay"; s.hidden = true;
    s.innerHTML = `<div class="bar"><button class="iconbtn" id="zBack" aria-label="나가기">‹</button><div class="mid"><span class="lbl" id="zLabel"></span><span class="t" id="zTimer">0:00</span></div><span class="pill" id="zCount"></span></div>
      <p class="small bb-rule">1에서 시작해 <b>번호 순서대로</b> 지나며 <b>모든 칸</b>을 한 번씩 — 손가락으로 끌어요 (위아래 · 옆으로만)</p>
      <div class="boardwrap"><div id="zboard" class="zboard"></div></div>
      <div class="hintbox" id="zHint" hidden><p id="zHintText"></p><div class="row"><button class="btn primary" id="zHintApply">적용</button><button class="btn ghost" id="zHintClose">닫기</button></div></div>
      <div class="dock">
        <button id="zHintBtn"><span class="ic">💡</span><span>힌트</span></button>
        <button id="zUndo"><span class="ic">↶</span><span>한 칸 지우기</span></button>
        <button id="zClear"><span class="ic">🧽</span><span>처음부터</span></button>
      </div>`;
    document.body.appendChild(s);
    $("zBack").onclick = () => {
      if (!over && performance.now() - backAt > 2000) { backAt = performance.now(); toast("한 번 더 누르면 나가요"); return; }
      close(); if (opt && opt.onExit) opt.onExit();
    };
    $("zHintBtn").onclick = useHint;
    $("zHintApply").onclick = applyHint;
    $("zHintClose").onclick = () => { hint = null; $("zHint").hidden = true; paint(); };
    $("zUndo").onclick = () => { if (over || !path.length) return; path.pop(); snd("unx"); paint(); };
    $("zClear").onclick = () => { if (over) return; path = []; paint(); };
    const el = $("zboard");
    // 끌 때는 칸 안쪽(가장자리 20% 뺌)에 들어간 칸만 — 아이폰에서 손가락이 옆 칸 가장자리를 스치면 길이 붙거나 지워지던 것 (11-08 지민 님)
    const cellAt = (e, inner) => {
      const t = document.elementFromPoint(e.clientX, e.clientY), c = t && t.closest && t.closest(".zc"); if (!c || !el.contains(c)) return -1;
      if (inner) { const r = c.getBoundingClientRect(), mx = r.width * .2, my = r.height * .2; if (e.clientX <= r.left + mx || e.clientX >= r.right - mx || e.clientY <= r.top + my || e.clientY >= r.bottom - my) return -1; }
      return +c.dataset.k;
    };
    el.addEventListener("pointerdown", e => { if (over || (drag && !e.isPrimary)) return; e.preventDefault(); drag = true; dragId = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (x) {} const k = cellAt(e); if (k >= 0) step(k, true); });
    el.addEventListener("pointermove", e => { if (!drag || over || e.pointerId !== dragId) return; const k = cellAt(e, true); if (k >= 0) step(k, false); });
    const up = e => { if (e.pointerId === dragId) drag = false; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
  }

  function start(o) {
    ensure();
    opt = o; P = o.pz; path = []; hints = 0; over = false; hint = null; drag = false;
    for (const id of ["home", "play", "bplay"]) if ($(id)) $(id).hidden = true;
    $("zplay").hidden = false; document.body.classList.add("playing");
    $("zLabel").textContent = o.label || "🐾 냥산책"; $("zHint").hidden = true;
    build(); paint();
    t0 = performance.now(); clearInterval(timerT);
    timerT = setInterval(() => { if (!over) $("zTimer").textContent = fmt((performance.now() - t0) / 1000); }, 100);
    snd("start");
  }
  function close() { clearInterval(timerT); over = true; drag = false; if ($("zplay")) $("zplay").hidden = true; document.body.classList.remove("playing"); }

  function build() {
    const N = P.N, el = $("zboard");
    el.style.setProperty("--n", N);
    let h = "";
    for (let k = 0; k < N * N; k++) h += `<div class="zc" data-k="${k}">${P.clue[k] ? `<b class="zn">${P.clue[k]}</b>` : ""}<i class="zh"></i></div>`;
    h += `<svg class="zline" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none" aria-hidden="true"><polyline id="zPoly" points="" /></svg>`;
    el.innerHTML = h;
  }
  const nextNum = () => { let n = 1; for (const k of path) if (P.clue[k]) n++; return n; };
  function paint() {
    const N = P.N, el = $("zboard"), idx = new Map(path.map((k, i) => [k, i])), head = path[path.length - 1], L = N * N;
    const hk = hint ? hint.k : -1;
    el.querySelectorAll(".zc").forEach(c => {
      const k = +c.dataset.k, i = idx.get(k);
      c.classList.toggle("p", i != null); c.classList.toggle("head", k === head && !over); c.classList.toggle("hint", k === hk);
      c.style.background = i != null ? `hsl(${Math.round(28 + (i / Math.max(1, L - 1)) * 250)}, 85%, 89%)` : "";
      c.lastChild.textContent = k === head && !over ? "🐈" : "";
    });
    $("zPoly").setAttribute("points", path.map(k => `${k % N + 0.5},${Math.floor(k / N) + 0.5}`).join(" "));
    $("zCount").textContent = `${path.length}/${L}`;
  }
  function step(k, tap) {
    const L = P.N * P.N;
    if (!path.length) { if (P.clue[k] === 1) { path = [k]; snd("x"); paint(); } else if (tap) toast("1번 칸에서 시작해요"); return; }
    const i = path.indexOf(k);
    if (i >= 0) { if (i < path.length - 1) { path = path.slice(0, i + 1); snd("unx"); clearHint(); paint(); } return; }
    const head = path[path.length - 1];
    if (!NYZ.adj(P.N, head, k)) return;
    const cl = P.clue[k], nx = nextNum();
    if (cl && cl !== nx) { if (tap || !step._warn || performance.now() - step._warn > 900) { step._warn = performance.now(); toast(`${nx}번을 먼저 지나야 해요`); } return; }
    path.push(k); clearHint();
    snd(cl ? "cat" : "x", cl ? { combo: Math.min(9, cl) } : undefined);
    paint();
    if (path.length === L) { if (NYZ.check(P, path).done) win(); else toast("모든 칸을 지났는데 마지막 번호에서 끝나야 해요 — 💡 힌트", 2400); }
  }
  const clearHint = () => { if (hint) { hint = null; $("zHint").hidden = true; } };
  function win() {
    over = true; drag = false; clearInterval(timerT);
    const secs = (performance.now() - t0) / 1000;
    $("zTimer").textContent = fmt(secs); paint();
    $("zboard").classList.add("won"); setTimeout(() => $("zboard").classList.remove("won"), 1200);
    snd("win"); if (window.Cozy) setTimeout(() => Cozy.confetti(), 150);
    setTimeout(() => { if (opt && opt.onWin) opt.onWin({ secs, hints, n: P.N }); }, 700);
  }
  function useHint() {
    if (over) return;
    const h = NYZ.hint(P, path); if (!h) return;
    hints++; hint = h;
    $("zHintText").innerHTML = "💡 " + (h.why === "wrong" ? `${h.at + 1}번째 칸부터 길이 달라요. 거기부터 지우고 다시 가 봐요` : path.length ? `다음은 반짝이는 칸이에요 (${h.at + 1}번째 칸)` : "1번 칸에서 시작해요");
    $("zHintApply").textContent = h.why === "wrong" ? "거기부터 지우기" : "적용";
    $("zHint").hidden = false; snd("hint"); paint();
  }
  function applyHint() {
    if (!hint || over) return;
    const h = hint; hint = null; $("zHint").hidden = true;
    if (h.why === "wrong") path = path.slice(0, h.at); else path = path.concat([h.k]);
    paint();
    if (path.length === P.N * P.N && NYZ.check(P, path).done) win();
  }
  window.NYZUI = { start, close, get pz() { return P; }, get path() { return path.slice(); }, step, get hints() { return hints; }, get over() { return over; } };
})();

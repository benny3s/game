/* 더 지니어스 스타일 '움직이는 룰 브리핑' 공용 모듈 (common/tutorial.js)
   · 영상(.mp4) 대신 가벼운 DOM 애니메이션 · 효과음(Cozy.sfx) · 선택형 음성(TTS) · 직접 해보기 체험 스텝을 결합
   · 쓰는 법:
     Tutorial.open({
       id: "nyang",
       title: "🐱 냥도쿠 규칙 브리핑",
       steps: [
         {
           tag: "STEP 1 · 목표",
           title: "가로 · 세로 · 색 땅마다 한 마리씩!",
           body: "설명은 HTML 지원...",
           say: "음성 안내용 짧은 문장",
           duration: 4500,                   // 자동재생 대기(ms)
           boardHtml: "...",                 // 무대 HTML (선택)
           render(stage, ctrl) {},           // 직접 무대 그리기 · 인터랙티브 이벤트(ctrl.complete() 호출)
           actions: [{ label: "다시 보기", onClick() {} }],
         }
       ],
       actions: [{ label: "▶ AI 풀이 구경", primary: false, onClick(close) {} }],
       startLabel: "지금 바로 해보기!",
       onStart() {}
     }) */
(() => {
  if (window.Tutorial) return;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = `
.tut-ov{position:fixed;inset:0;z-index:95;background:rgba(4,8,16,.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 10px);
  font:15px/1.5 var(--text,"Pretendard",system-ui,sans-serif);color:#f8fafc;-webkit-tap-highlight-color:transparent;touch-action:manipulation;animation:tut-in .18s ease-out}
@keyframes tut-in{from{opacity:0}to{opacity:1}}
.tut-box{width:min(540px,100%);max-height:calc(100dvh - 20px);display:flex;flex-direction:column;overflow:hidden;
  background:radial-gradient(120% 90% at 50% 0%,#1d2b44 0%,#0b1220 72%);border:1.5px solid rgba(251,191,36,.35);
  border-radius:22px;box-shadow:0 24px 64px rgba(0,0,0,.78);position:relative}
.tut-hd{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.09);flex:none}
.tut-hd h2{margin:0;flex:1;min-width:0;font:800 17px/1.2 var(--round,inherit);color:#fde68a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tut-icon{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#e2e8f0;border-radius:9px;height:32px;padding:0 10px;
  font:700 12.5px/1 var(--round,inherit);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.tut-icon[aria-pressed="true"]{background:rgba(251,191,36,.22);border-color:#fbbf24;color:#fde68a}
.tut-x{width:32px;height:32px;padding:0;justify-content:center;font-size:16px}
.tut-prog{display:grid;grid-auto-flow:column;gap:5px;padding:8px 14px 4px;flex:none}
.tut-prog i{height:4px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;position:relative;display:block;cursor:pointer}
.tut-prog i.done{background:#fbbf24}
.tut-prog i.cur{background:rgba(251,191,36,.35)}
.tut-prog i.cur>b{display:block;height:100%;background:#fbbf24;width:var(--p,100%);transition:width .1s linear}
.tut-body{padding:8px 14px 10px;overflow:auto;display:grid;gap:10px;min-height:0;flex:1;align-content:start}
.tut-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.tut-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font:800 12px var(--round,inherit);
  background:rgba(251,191,36,.16);color:#fde68a;border:1px solid rgba(251,191,36,.35)}
.tut-cnt{font:700 12px var(--round,inherit);color:#94a3b8}
.tut-title{margin:0;font:900 20px/1.25 var(--round,inherit);color:#fff;word-break:keep-all}
.tut-stage{position:relative;background:radial-gradient(circle at 50% 40%,rgba(59,130,246,.12),rgba(3,7,18,.65));
  border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px;min-height:178px;display:grid;place-items:center;overflow:hidden}
.tut-sub{background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px 12px;
  font-size:14px;line-height:1.55;color:#e2e8f0;word-break:keep-all}
.tut-sub b{color:#fde68a}
.tut-sub .tut-em{color:#6ee7b7;font-weight:800}
.tut-sub .tut-bad{color:#fca5a5;font-weight:800}
.tut-try{display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:12px;font:700 13px var(--round,inherit);
  background:rgba(16,185,129,.14);border:1px dashed rgba(52,211,153,.55);color:#a7f3d0}
.tut-try.ok{background:rgba(16,185,129,.25);border-style:solid;border-color:#34d399;color:#fff}
.tut-ft{display:grid;gap:8px;padding:10px 14px 12px;border-top:1px solid rgba(255,255,255,.09);background:rgba(6,10,20,.6);flex:none}
.tut-nav{display:flex;align-items:center;gap:8px}
.tut-nav .tut-btn{flex:1;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);
  color:#f8fafc;font:700 14px/1 var(--round,inherit);cursor:pointer;text-align:center}
.tut-nav .tut-btn:disabled{opacity:.35;cursor:default}
.tut-nav .tut-btn.pri{background:linear-gradient(135deg,#f59e0b,#d97706);border-color:rgba(255,255,255,.25);color:#fff}
.tut-nav .tut-btn.tplay{flex:0 0 auto;min-width:74px;background:rgba(59,130,246,.2);border-color:rgba(96,165,250,.4)}
.tut-acts{display:flex;gap:8px;flex-wrap:wrap}
.tut-acts .tut-btn{flex:1 1 120px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);
  color:#e2e8f0;font:700 13.5px/1.1 var(--round,inherit);cursor:pointer}
.tut-acts .tut-btn.go{background:linear-gradient(135deg,#10b981,#047857);border-color:rgba(255,255,255,.22);color:#fff}
/* 미니 무대 공용 애니메이션 유틸 */
.tut-hi{outline:3px solid #fbbf24 !important;outline-offset:-2px;box-shadow:0 0 18px rgba(251,191,36,.65) !important;animation:tut-pulse 1.1s ease-in-out infinite}
.tut-bad-cell{outline:2.5px solid #ef4444 !important;outline-offset:-2px;background:rgba(239,68,68,.26) !important}
.tut-finger{position:absolute;font-size:24px;pointer-events:none;z-index:5;filter:drop-shadow(0 3px 6px rgba(0,0,0,.6));animation:tut-tap 1.1s ease-in-out infinite}
@keyframes tut-pulse{50%{transform:scale(1.04)}}
@keyframes tut-tap{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-2px,3px) scale(.86)}}
`;
  let styled = false;
  const ensureStyle = () => {
    if (styled) return; styled = true;
    const s = document.createElement("style"); s.id = "tut-style"; s.textContent = css; document.head.appendChild(s);
  };
  const sfx = (n, o) => { try { if (window.NYSND && window.NYSND.play && /^(cat|x|unx|hint|win|miss)$/.test(n)) window.NYSND.play(n, o); else if (window.Cozy && Cozy.sfx) Cozy.sfx.play(n, o); } catch (e) {} };

  const stripHtml = s => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  let koVoices = [];
  function loadVoices() {
    try {
      if (!window.speechSynthesis) return;
      koVoices = (window.speechSynthesis.getVoices() || []).filter(v => /^ko/i.test(v.lang));
    } catch (e) {}
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    loadVoices();
    try { window.speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch (e) {}
  }
  function pickKoVoice() {
    if (!koVoices.length) loadVoices();
    return koVoices.find(v => /Natural|Neural|Google|Online|Sora|Yuna|SunHi|InJoon/i.test(v.name)) || koVoices[0] || null;
  }

  function speak(text, on) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const plain = stripHtml(text);
      if (!on || !plain) return;
      const u = new SpeechSynthesisUtterance(plain);
      const v = pickKoVoice();
      if (v) u.voice = v;
      u.lang = "ko-KR"; u.rate = 0.96; u.pitch = 1.03;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  let activeClose = null;

  function open(opts = {}) {
    ensureStyle();
    if (activeClose) { try { activeClose(); } catch (e) {} activeClose = null; }
    const steps = (opts.steps || []).filter(Boolean);
    if (!steps.length) return () => {};
    let idx = Math.max(0, Math.min(steps.length - 1, opts.startAt || 0));
    let playing = opts.autoplay !== false;
    let voice = false;
    let closed = false;
    let timers = [];
    let tickRAF = 0;
    let stepStartedAt = 0;
    let pausedElapsed = 0;
    let interDone = false;

    const clearStepTimers = () => {
      timers.forEach(t => { clearTimeout(t); clearInterval(t); });
      timers = [];
      cancelAnimationFrame(tickRAF);
    };

    const ov = document.createElement("div");
    ov.className = "tut-ov";
    ov.innerHTML = `<div class="tut-box" role="dialog" aria-modal="true" aria-label="${esc(opts.title || "게임 설명")}">
      <div class="tut-hd">
        <h2>🎬 ${esc(opts.title || "게임 설명")}</h2>
        ${"speechSynthesis" in window ? `<button type="button" class="tut-icon" id="tutVoice" aria-pressed="false" title="음성 설명 켜기/끄기">🔈 음성</button>` : ""}
        <button type="button" class="tut-icon tut-x" data-x aria-label="닫기">✕</button>
      </div>
      <div class="tut-prog" id="tutProg"></div>
      <div class="tut-body">
        <div class="tut-meta"><span class="tut-tag" id="tutTag"></span><span class="tut-cnt" id="tutCnt"></span></div>
        <h3 class="tut-title" id="tutTitle"></h3>
        <div class="tut-stage" id="tutStage"></div>
        <div class="tut-try" id="tutTry" hidden></div>
        <div class="tut-sub" id="tutSub"></div>
      </div>
      <div class="tut-ft">
        <div class="tut-nav">
          <button type="button" class="tut-btn" id="tutPrev">◀ 이전</button>
          <button type="button" class="tut-btn tplay" id="tutPlay">⏸ 멈춤</button>
          <button type="button" class="tut-btn pri" id="tutNext">다음 ▶</button>
        </div>
        <div class="tut-acts" id="tutActs" hidden></div>
      </div>
    </div>`;

    const q = sel => ov.querySelector(sel);
    const close = () => {
      if (closed) return;
      closed = true;
      if (activeClose === close) activeClose = null;
      clearStepTimers();
      speak("", false);
      document.removeEventListener("keydown", onKey, true);
      ov.remove();
      if (opts.id) try { localStorage.setItem("tut.seen." + opts.id, "1"); } catch (e) {}
      if (opts.onClose) try { opts.onClose(); } catch (e) {}
    };
    activeClose = close;

    function renderProg(pct = 0) {
      q("#tutProg").innerHTML = steps.map((_, i) =>
        i < idx ? `<i class="done" data-step="${i}"></i>`
        : i === idx ? `<i class="cur" data-step="${i}"><b style="width:${pct}%"></b></i>`
        : `<i data-step="${i}"></i>`
      ).join("");
    }

    function syncNav() {
      q("#tutPrev").disabled = idx === 0;
      const last = idx >= steps.length - 1;
      q("#tutNext").textContent = last ? (opts.startLabel ? "🚀 시작하기" : "✅ 이해했어요") : "다음 ▶";
      q("#tutPlay").textContent = playing ? "⏸ 멈춤" : "▶ 재생";
      const actBox = q("#tutActs");
      const list = (steps[idx].actions || []).concat(last && opts.actions ? opts.actions : []);
      if (list.length) {
        actBox.hidden = false;
        actBox.innerHTML = "";
        list.forEach(a => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "tut-btn" + (a.primary ? " go" : "");
          b.textContent = a.label;
          b.onclick = () => { sfx("tap"); if (a.onClick) a.onClick(close); };
          actBox.appendChild(b);
        });
      } else {
        actBox.hidden = true;
        actBox.innerHTML = "";
      }
    }

    function drawStep(i) {
      clearStepTimers();
      idx = Math.max(0, Math.min(steps.length - 1, i));
      const st = steps[idx];
      interDone = !st.interactive;
      q("#tutTag").textContent = st.tag || `STEP ${idx + 1}`;
      q("#tutCnt").textContent = `${idx + 1} / ${steps.length}`;
      q("#tutTitle").textContent = st.title || "";
      const bodyHtml = st.body || st.text || (st.tts && st.say) || "";
      q("#tutSub").innerHTML = bodyHtml;
      const tryEl = q("#tutTry");
      if (st.interactive) {
        const iHint = typeof st.interactive === "object" ? st.interactive.hint : st.hint;
        tryEl.hidden = false;
        tryEl.classList.remove("ok");
        tryEl.textContent = iHint || "👆 화면을 직접 눌러 체험해 보세요!";
      } else {
        tryEl.hidden = true;
      }

      const stage = q("#tutStage");
      stage.innerHTML = st.boardHtml || "";
      const laterFn = (fn, ms) => { const id = setTimeout(() => { if (!closed) fn(); }, ms); timers.push(id); return id; };
      const ctrl = {
        later: laterFn,
        after: laterFn,
        every(fn, ms) { const id = setInterval(() => { if (!closed) fn(); }, ms); timers.push(id); return id; },
        sfx,
        complete(msg) {
          if (interDone) return;
          interDone = true;
          tryEl.classList.add("ok");
          const doneMsg = typeof st.interactive === "object" ? st.interactive.doneText : st.doneText;
          tryEl.textContent = msg || doneMsg || "✅ 잘했어요!";
          sfx("good");
          if (playing && idx < steps.length - 1) {
            const id = setTimeout(() => { if (!closed && playing) drawStep(idx + 1); }, 1300);
            timers.push(id);
          }
        },
        next() { drawStep(idx + 1); },
      };

      try {
        if (st.render) st.render(stage, ctrl);
        if (st.onEnter) st.onEnter(stage, ctrl);
      } catch (e) { console.error("[tutorial]", e); }

      const voiceTxt = st.tts || (st.body ? st.say : "") || q("#tutSub").textContent;
      speak(voiceTxt, voice);
      syncNav();
      pausedElapsed = 0;
      stepStartedAt = performance.now();
      renderProg(st.interactive ? 100 : 0);

      const dur = st.duration || st.ms || 4600;
      if (playing && !st.interactive && idx < steps.length - 1) {
        const tick = () => {
          if (closed || !playing) return;
          const pct = Math.min(100, (performance.now() - stepStartedAt) / dur * 100);
          const bar = q("#tutProg i.cur > b");
          if (bar) bar.style.width = pct + "%";
          if (pct >= 100) { drawStep(idx + 1); return; }
          tickRAF = requestAnimationFrame(tick);
        };
        tickRAF = requestAnimationFrame(tick);
      } else {
        renderProg(100);
      }
    }

    q("[data-x]").onclick = close;
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    q("#tutProg").onclick = e => { const it = e.target.closest("[data-step]"); if (it) { sfx("tap"); drawStep(+it.dataset.step); } };
    q("#tutPrev").onclick = () => { if (idx > 0) { sfx("tap"); drawStep(idx - 1); } };
    q("#tutNext").onclick = () => {
      sfx("tap");
      if (idx < steps.length - 1) drawStep(idx + 1);
      else { close(); if (opts.onStart) opts.onStart(); }
    };
    q("#tutPlay").onclick = () => {
      playing = !playing; sfx("tap");
      if (!playing) {
        pausedElapsed = performance.now() - stepStartedAt;
        cancelAnimationFrame(tickRAF);
        syncNav();
        return;
      }
      if (idx >= steps.length - 1) { drawStep(0); return; }
      syncNav();
      if (!steps[idx].interactive) {
        stepStartedAt = performance.now() - pausedElapsed;
        const dur = steps[idx].duration || 4600;
        const tick = () => {
          if (closed || !playing) return;
          const pct = Math.min(100, (performance.now() - stepStartedAt) / dur * 100);
          const bar = q("#tutProg i.cur > b"); if (bar) bar.style.width = pct + "%";
          if (pct >= 100) { drawStep(idx + 1); return; }
          tickRAF = requestAnimationFrame(tick);
        };
        tickRAF = requestAnimationFrame(tick);
      }
    };
    const vBtn = q("#tutVoice");
    if (vBtn) {
      vBtn.onclick = () => {
        voice = !voice;
        vBtn.setAttribute("aria-pressed", String(voice));
        vBtn.textContent = voice ? "🔊 음성 켜짐" : "🔈 음성";
        speak(voice ? (steps[idx].say || q("#tutSub").textContent) : "", voice);
      };
    }

    const onKey = e => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      else if (e.key === "ArrowLeft" && idx > 0) { e.stopPropagation(); drawStep(idx - 1); }
      else if (e.key === "ArrowRight") { e.stopPropagation(); q("#tutNext").click(); }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(ov);
    drawStep(idx);
    return close;
  }

  const seen = id => { try { return !!localStorage.getItem("tut.seen." + id); } catch (e) { return false; } };
  window.Tutorial = { open, seen };
})();

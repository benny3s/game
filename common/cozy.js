/* 게임 공통 '포근한' 도우미 (냥도쿠에서 뽑음, common/cozy.css 와 짝) — 저장·알림·창·색종이·소리·두 번 눌러 나가기·처음 안내
   쓰는 법:
     Cozy.store("volley.best", 0) / Cozy.save("volley.best", 12)        — localStorage (막혀도 안 터짐)
     Cozy.toast("저장했어요")                                          — 아래 알림 2초
     Cozy.modal({ title, html, buttons: [{ label, primary, onClick }], dismiss: true }) → 닫기 함수
     Cozy.confetti()                                                   — canvas-confetti(ISC, 페이지에 넣었으면) 아니면 CSS 색종이
     Cozy.sfx.play("pop") · Cozy.sfx.add("name", (t, o, S) => …) · Cozy.sfx.on / set(bool) · Cozy.sfx.button(el)
     Cozy.backGuard(btn, () => 나가기)                                 — 두 번 눌러야 나감 (2초 안)
     Cozy.howto("volley", "냥냥 배구 하는 법", ["…", "…"])             — 처음 한 번만 자동, Cozy.howto(..., { force: true }) 로 다시
     Cozy.tierCards(el, [{ id, em, name, desc, cls }], id => …)       — 🐣 초급 같은 고르기 카드
     Cozy.vibrate(15)                                                  — 진동 (되는 폰만) */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let toastT = null, toastEl = null;
  function toast(msg, ms = 2000) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.hidden = false;
    toastEl.style.animation = "none"; void toastEl.offsetWidth; toastEl.style.animation = "";
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, ms);
  }

  // 창: 버튼을 누르면 닫히고 onClick 실행 (onClick 이 false 를 돌려주면 안 닫힘)
  function modal({ title = "", html = "", buttons = [{ label: "확인", primary: true }], dismiss = false, cls = "" } = {}) {
    const ov = document.createElement("div"); ov.className = "overlay " + cls;
    ov.innerHTML = `<div role="dialog" aria-modal="true">${title ? `<h2>${esc(title)}</h2>` : ""}<div class="mbody">${html}</div><div class="row"></div></div>`;
    const row = ov.querySelector(".row");
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
    buttons.forEach(b => {
      const el = document.createElement("button"); el.className = "btn" + (b.primary ? " primary" : b.ghost ? " ghost" : "");
      el.textContent = b.label; el.onclick = () => { if (b.onClick && b.onClick(el) === false) return; close(); };
      row.appendChild(el);
    });
    const onKey = e => { if (e.key === "Escape" && dismiss) close(); if (e.key === "Enter") { const p = row.querySelector(".primary"); if (p) { e.preventDefault(); p.click(); } } };
    document.addEventListener("keydown", onKey);
    if (dismiss) ov.addEventListener("click", e => { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    const first = row.querySelector(".primary") || row.querySelector("button");
    if (first && matchMedia("(hover: hover)").matches) setTimeout(() => first.focus({ preventScroll: true }), 30);   // 키보드 쓰는 PC 만 (폰은 테두리가 거슬림)
    return close;
  }

  const COLORS = ["#ff9a7a", "#7cc9b4", "#f5b942", "#f2647e", "#9ec9f5", "#c7a8f0", "#ffd36e"];
  function confetti(opt = {}) {
    if (typeof window.confetti === "function") {                              // canvas-confetti (ISC) — 더 예쁨
      const o = { particleCount: 120, spread: 80, startVelocity: 42, origin: { y: 0.65 }, colors: COLORS, scalar: 1.05, ...opt };
      window.confetti(o); setTimeout(() => window.confetti({ ...o, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } }), 180);
      setTimeout(() => window.confetti({ ...o, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } }), 260);
      return;
    }
    const box = document.createElement("div"); box.className = "confetti-box";
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw"; p.style.background = COLORS[i % COLORS.length];
      p.style.setProperty("--dx", (Math.random() * 40 - 20) + "vw"); p.style.setProperty("--rot", (Math.random() * 900 - 450) + "deg");
      p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s"; p.style.animationDelay = Math.random() * 0.4 + "s";
      box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
  }

  // ── 소리: 파일 없이 Web Audio 로 (냥도쿠 sound.js 와 같은 방식). 아이폰은 첫 터치 때 깨워야 함
  const sfx = (() => {
    let ac = null, master = null, noiseBuf = null;
    const key = "cozy.sound";
    let on = store(key, true) !== false;
    function ctx() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ac = new AC(); master = ac.createGain(); master.gain.value = 1.6; master.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    const unlock = () => { const a = ctx(); if (!a) return; const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource(); s.buffer = b; s.connect(master); s.start(0); };
    for (const ev of ["pointerdown", "touchend", "keydown"]) addEventListener(ev, unlock, { capture: true, passive: true });
    // 짧은 음 하나
    function tone(t, f, dur, { type = "sine", vol = 0.2, f2 = null, attack = 0.008 } = {}) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
    }
    // 잡음 한 번 (탁·쉭·짝): 필터 종류·주파수로 소리 결을 바꿈
    function noise(t, dur, { vol = 0.25, type = "bandpass", f = 1800, q = 1, f2 = null } = {}) {
      if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G4: 392 };
    const S = { tone, noise, N, get ac() { return ac; } };
    const SOUNDS = {
      tap(t) { tone(t, 1250, 0.05, { type: "triangle", vol: 0.1 }); },
      pop(t, o) { tone(t, 600 * (o.pitch || 1), 0.09, { type: "sine", vol: 0.2, f2: 1100 * (o.pitch || 1) }); },
      good(t) { [N.E5, N.A5].forEach((f, i) => tone(t + i * 0.07, f, 0.16, { type: "triangle", vol: 0.12 })); },
      bad(t) { tone(t, 220, 0.2, { type: "square", vol: 0.05, f2: 150 }); tone(t, 330, 0.18, { type: "triangle", vol: 0.08, f2: 220 }); },
      count(t) { tone(t, 660, 0.12, { type: "triangle", vol: 0.14 }); },
      go(t) { tone(t, 990, 0.25, { type: "triangle", vol: 0.16 }); },
      win(t) { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(t + i * 0.1, f, 0.22, { type: "triangle", vol: 0.15 })); tone(t + 0.4, N.E6, 0.45, { vol: 0.08 }); },
      lose(t) { [N.G5, N.E5, N.C5].forEach((f, i) => tone(t + i * 0.14, f, 0.22, { type: "triangle", vol: 0.11 })); },
      place(t) { noise(t, 0.05, { vol: 0.5, type: "bandpass", f: 2600, q: 2.5 }); tone(t, 180, 0.06, { type: "sine", vol: 0.25, f2: 120 }); },   // 돌·패 '탁'
      slap(t) { noise(t, 0.09, { vol: 0.55, type: "lowpass", f: 3200, f2: 900 }); tone(t, 140, 0.07, { vol: 0.2, f2: 90 }); },                  // 화투 '짝'
      flip(t) { noise(t, 0.06, { vol: 0.25, type: "highpass", f: 2500 }); },
      whoosh(t) { noise(t, 0.25, { vol: 0.18, type: "bandpass", f: 500, f2: 2400, q: 0.8 }); },
      coin(t) { tone(t, N.B5, 0.08, { type: "square", vol: 0.05 }); tone(t + 0.07, N.E6, 0.25, { type: "square", vol: 0.05 }); },
      tick(t) { tone(t, 1600, 0.03, { type: "square", vol: 0.04 }); },
    };
    let lastAt = {};
    return {
      get on() { return on; },
      set(v) { on = !!v; save(key, on); if (on) this.play("good"); },
      toggle() { this.set(!on); return on; },
      add(name, fn) { SOUNDS[name] = fn; },
      play(name, opt) {
        if (!on || !SOUNDS[name]) return;
        const a = ctx(); if (!a) return;
        const now = a.currentTime;
        if (lastAt[name] != null && now - lastAt[name] < 0.03) return;            // 같은 소리가 한꺼번에 겹치지 않게
        lastAt[name] = now;
        try { SOUNDS[name](now + 0.01, opt || {}, S); } catch (e) {}
      },
      // 단추 하나를 소리 켬/끔 단추로 (.ic 안 그림·글자도 바꿈)
      button(el) {
        const draw = () => { const ic = el.querySelector(".ic"), lb = el.querySelector(".ic + span"); if (ic) ic.textContent = on ? "🔊" : "🔇"; else el.textContent = on ? "🔊" : "🔇"; if (lb) lb.textContent = on ? "소리 켬" : "소리 끔"; el.setAttribute("aria-pressed", String(!on)); };
        el.addEventListener("click", () => { this.toggle(); draw(); }); draw();
      },
    };
  })();

  // 나가기 단추: 실수로 눌러도 바로 안 나가게 두 번 (2초 안)
  function backGuard(btn, onLeave, msg = "한 번 더 누르면 나가요") {
    let armed = 0;
    btn.addEventListener("click", () => { const now = Date.now(); if (now - armed < 2000) { armed = 0; onLeave(); } else { armed = now; toast(msg, 1800); } });
  }

  // 처음 안내: 게임마다 한 번 자동 (다시 보기는 force)
  function howto(id, title, items, { force = false, onClose } = {}) {
    const k = "cozy.howto." + id;
    if (!force && store(k, false)) return false;
    save(k, true);
    modal({ title, html: `<ul class="howto" style="text-align:left;font-size:15px;color:var(--ink)">${items.map(s => `<li>${s}</li>`).join("")}</ul>`, buttons: [{ label: "알겠어요", primary: true, onClick: () => { onClose && onClose(); } }], dismiss: true });
    return true;
  }

  // 고르기 카드 그리기 (난이도·모드)
  function tierCards(el, items, onPick, { selected = null } = {}) {
    el.innerHTML = items.map(x => `<button class="tier ${x.cls || "t-plain"}" data-id="${esc(x.id)}" ${selected === x.id ? 'aria-pressed="true"' : ""}><span class="em">${x.em || ""}</span><b>${esc(x.name)}</b>${x.desc ? `<span>${esc(x.desc)}</span>` : ""}</button>`).join("");
    el.onclick = e => { const b = e.target.closest(".tier"); if (!b) return; sfx.play("tap"); onPick(b.dataset.id); };
  }
  const TIERS = { easy: { em: "🐣", name: "초급", cls: "t-easy" }, normal: { em: "🐱", name: "중급", cls: "t-normal" }, hard: { em: "🐯", name: "고급", cls: "t-hard" }, master: { em: "👑", name: "고수", cls: "t-master" } };

  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  window.Cozy = { esc, store, save, toast, modal, confetti, sfx, backGuard, howto, tierCards, TIERS, vibrate };
})();

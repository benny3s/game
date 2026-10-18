/* 냥도쿠 소리 — 파일 없이 Web Audio로 직접 만듦 (야옹·톡·팡파레). NYSND.play("cat") 처럼 씀
   아이폰은 처음 손가락을 댈 때 소리 장치를 깨워야 해서, 첫 터치에서 unlock */
(() => {
  let ac = null, master = null;
  let on = (() => { try { return localStorage.getItem("nyang.sound") !== "0"; } catch (e) { return true; } })();
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC(); master = ac.createGain(); master.gain.value = 2.2; master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  const unlock = () => { const a = ctx(); if (!a) return; const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource(); s.buffer = b; s.connect(master); s.start(0); };
  for (const ev of ["pointerdown", "touchend", "keydown"]) addEventListener(ev, unlock, { capture: true, passive: true });

  // 짧은 음 하나 (톡·띵)
  function tone(t, f, dur, { type = "sine", vol = 0.2, f2 = null } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // 야옹: 음높이가 올라갔다 내려오고(미-야-옹), 입 모양처럼 필터가 열렸다 닫힘
  function mew(t, { base = 720, dur = 0.3, vol = 0.22, up = 1.4, end = 0.9 } = {}) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), g2 = ac.createGain();
    o.type = "sawtooth"; o2.type = "sine";
    for (const [osc, m] of [[o, 1], [o2, 2]]) {
      osc.frequency.setValueAtTime(base * 0.85 * m, t);
      osc.frequency.linearRampToValueAtTime(base * up * m, t + dur * 0.35);
      osc.frequency.exponentialRampToValueAtTime(base * end * m, t + dur);
    }
    f.type = "bandpass"; f.Q.value = 3;
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2400, t + dur * 0.35); f.frequency.exponentialRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.value = 0.35;
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(master);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392 };

  const SOUNDS = {
    x(t) { tone(t, 1250, 0.05, { type: "triangle", vol: 0.12 }); },                         // ✕ 표시: 톡
    unx(t) { tone(t, 800, 0.05, { type: "triangle", vol: 0.09 }); },                        // ✕ 지움: 낮은 톡
    cat(t) { mew(t, { base: 820, dur: 0.26, vol: 0.2 }); tone(t + 0.02, N.E6, 0.12, { vol: 0.05 }); },   // 고양이 찾음: 짧은 미야
    miss(t) { mew(t, { base: 420, dur: 0.38, vol: 0.2, up: 1.1, end: 0.7 }); tone(t, 220, 0.18, { type: "square", vol: 0.04, f2: 160 }); },   // 틀림: 낮은 므르
    hint(t) { [N.A5, N.E6].forEach((f, i) => tone(t + i * 0.07, f, 0.18, { vol: 0.09 })); },   // 힌트: 반짝
    start(t) { [N.C5, N.E5, N.G5].forEach((f, i) => tone(t + i * 0.08, f, 0.16, { type: "triangle", vol: 0.13 })); mew(t + 0.26, { base: 900, dur: 0.24, vol: 0.16 }); },   // 시작: 도미솔 + 냥
    count(t) { tone(t, 660, 0.12, { type: "triangle", vol: 0.14 }); },                     // 대결 3·2·1
    go(t) { tone(t, 990, 0.25, { type: "triangle", vol: 0.16 }); mew(t + 0.05, { base: 950, dur: 0.22, vol: 0.14 }); },
    win(t) {                                                                                 // 다 찾음: 팡파레 + 기쁜 야옹 두 번
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(t + i * 0.1, f, 0.22, { type: "triangle", vol: 0.15 }));
      tone(t + 0.4, N.E6, 0.4, { vol: 0.08 });
      mew(t + 0.48, { base: 880, dur: 0.24, vol: 0.18 }); mew(t + 0.76, { base: 1000, dur: 0.32, vol: 0.18, up: 1.5 });
    },
    fail(t) {                                                                               // 실패: 내려가는 음 + 시무룩 야옹
      [N.G5, N.E5, N.C5].forEach((f, i) => tone(t + i * 0.14, f, 0.2, { type: "triangle", vol: 0.11 }));
      mew(t + 0.45, { base: 520, dur: 0.6, vol: 0.18, up: 1.15, end: 0.62 });
    },
    lose(t) { [N.E5, N.C5].forEach((f, i) => tone(t + i * 0.12, f, 0.2, { type: "triangle", vol: 0.11 })); },   // 대결 결과(내가 진 판)
  };
  let lastAt = {};
  window.NYSND = {
    get on() { return on; },
    set(v) { on = !!v; try { localStorage.setItem("nyang.sound", on ? "1" : "0"); } catch (e) {} if (on) this.play("cat"); },
    play(name) {
      if (!on || !SOUNDS[name]) return;
      const a = ctx(); if (!a) return;
      const now = a.currentTime;
      if ((name === "x" || name === "unx") && lastAt[name] != null && now - lastAt[name] < 0.035) return;   // ✕ 끌어 칠할 때 너무 겹치지 않게
      lastAt[name] = now;
      try { SOUNDS[name](now + 0.01); } catch (e) {}
    },
  };
})();

/* 베니 크아 — 경쾌한 물풍선/아케이드 효과음 (kua/sound.js) */
((root) => {
  "use strict";
  let muted = false;
  let actx = null;

  function setMuted(v) { muted = !!v; }
  function isMuted() { return muted; }

  function play(kind) {
    if (muted) return;
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const t = actx.currentTime;
      const tone = (f0, f1, dur, type = "sine", peak = 0.09, delay = 0) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t + delay);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + delay + dur);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(peak, t + delay + Math.min(0.012, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(t + delay); o.stop(t + delay + dur + 0.02);
      };

      if (kind === "bomb") {
        tone(220, 420, 0.08, "sine", 0.08);
      } else if (kind === "pop") {
        tone(280, 68, 0.19, "triangle", 0.14);
        tone(160, 45, 0.22, "sine", 0.11, 0.02);
      } else if (kind === "item") {
        tone(587, 880, 0.09, "triangle", 0.08);
        tone(880, 1174, 0.10, "triangle", 0.07, 0.06);
      } else if (kind === "trap") {
        tone(420, 260, 0.18, "sine", 0.09);
      } else if (kind === "needle" || kind === "rescue") {
        tone(520, 1040, 0.14, "triangle", 0.11);
      } else if (kind === "kick" || kind === "throw" || kind === "push") {
        tone(240, 390, 0.07, "triangle", 0.07);
      } else if (kind === "die") {
        tone(330, 110, 0.28, "sawtooth", 0.06);
      } else if (kind === "win") {
        [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.26, "triangle", 0.09, i * 0.09));
      }
    } catch (e) {}
  }

  root.KuaSound = { play, setMuted, isMuted };
})(typeof window !== "undefined" ? window : globalThis);

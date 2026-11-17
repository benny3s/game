/* 베니 크아 — 레이어드 물풍선 SFX + 아케이드 루프 BGM (kua/sound.js) */
((root) => {
  "use strict";
  let muted = false;
  let actx = null;
  let noiseBuf = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmTheme = "village";
  let bgmHurry = false;

  function ensureCtx() {
    if (muted) return null;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    if (!actx) actx = new AC();
    if (actx.state === "suspended") actx.resume().catch(() => {});
    if (!noiseBuf && actx) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return actx;
  }

  function setMuted(v) {
    muted = !!v;
    if (muted) stopBgm();
  }
  function isMuted() { return muted; }

  function tone(ctx, f0, f1, dur, type = "sine", peak = 0.09, delay = 0) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.025);
  }

  function noiseBurst(ctx, freq, q, dur, peak = 0.08, delay = 0) {
    if (!noiseBuf) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.setValueAtTime(freq, t);
    flt.Q.setValueAtTime(q, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function play(kind) {
    if (muted) return;
    try {
      const ctx = ensureCtx();
      if (!ctx) return;

      if (kind === "bomb") {
        // 탄력 있는 "퐁!" 물풍선 설치
        tone(ctx, 180, 510, 0.075, "sine", 0.11);
        tone(ctx, 420, 660, 0.05, "triangle", 0.06, 0.02);
      } else if (kind === "pop") {
        // 시원한 "BA-SPLASH!" 물폭탄 폭발 (저음 펀치 + 물보라 노이즈)
        tone(ctx, 260, 48, 0.22, "triangle", 0.16);
        tone(ctx, 140, 42, 0.24, "sine", 0.13, 0.01);
        noiseBurst(ctx, 1100, 1.1, 0.21, 0.12);
        noiseBurst(ctx, 2600, 1.8, 0.14, 0.06, 0.03);
      } else if (kind === "item") {
        tone(ctx, 587, 784, 0.07, "triangle", 0.09);
        tone(ctx, 880, 1175, 0.11, "triangle", 0.09, 0.05);
      } else if (kind === "devil") {
        tone(ctx, 390, 210, 0.15, "sawtooth", 0.05);
        tone(ctx, 240, 150, 0.18, "sawtooth", 0.04, 0.08);
      } else if (kind === "trap") {
        // 뽀글뽀글 물방울 갇힘
        tone(ctx, 360, 620, 0.08, "sine", 0.09);
        tone(ctx, 460, 310, 0.12, "sine", 0.08, 0.07);
        tone(ctx, 330, 520, 0.10, "sine", 0.07, 0.14);
      } else if (kind === "needle" || kind === "rescue") {
        tone(ctx, 540, 1180, 0.12, "triangle", 0.12);
        tone(ctx, 1046, 1568, 0.14, "sine", 0.08, 0.06);
        noiseBurst(ctx, 3200, 2.5, 0.06, 0.07);
      } else if (kind === "kick" || kind === "throw" || kind === "push") {
        tone(ctx, 210, 480, 0.08, "triangle", 0.08);
      } else if (kind === "plane") {
        noiseBurst(ctx, 320, 2.2, 0.36, 0.05);
        tone(ctx, 110, 132, 0.34, "sawtooth", 0.025);
      } else if (kind === "start") {
        [523, 659, 784].forEach((f, i) => tone(ctx, f, f, 0.11, "triangle", 0.08, i * 0.08));
      } else if (kind === "die") {
        tone(ctx, 520, 110, 0.30, "sawtooth", 0.07);
        noiseBurst(ctx, 2200, 1.8, 0.09, 0.09);
      } else if (kind === "win") {
        [523, 659, 784, 659, 1046].forEach((f, i) => tone(ctx, f, f, 0.24, "triangle", 0.095, i * 0.09));
      } else if (kind === "lose") {
        [440, 392, 349, 262].forEach((f, i) => tone(ctx, f, f * 0.94, 0.22, "triangle", 0.075, i * 0.11));
      }
    } catch (e) {}
  }

  // 맵별 경쾌한 크아 스타일 BGM 루프
  const PATTERNS = {
    village: {
      lead: [523, 0, 659, 587, 523, 0, 784, 659, 698, 0, 880, 784, 659, 587, 523, 0],
      bass: [131, 262, 131, 262, 165, 330, 165, 330, 175, 349, 175, 349, 196, 392, 196, 131],
    },
    pirate: {
      lead: [392, 494, 587, 0, 659, 587, 494, 392, 440, 523, 659, 0, 587, 494, 440, 392],
      bass: [196, 294, 196, 294, 165, 247, 165, 247, 175, 262, 175, 262, 147, 220, 196, 147],
    },
    camp: {
      lead: [587, 0, 740, 880, 784, 0, 659, 587, 659, 740, 880, 0, 988, 880, 740, 587],
      bass: [147, 294, 147, 294, 196, 392, 196, 392, 165, 330, 165, 330, 220, 440, 147, 220],
    },
  };

  function tickBgm() {
    if (muted) { stopBgm(); return; }
    try {
      const ctx = ensureCtx();
      if (!ctx) return;
      const pat = PATTERNS[bgmTheme] || PATTERNS.village;
      const idx = bgmStep % pat.lead.length;
      const l = pat.lead[idx], b = pat.bass[idx];
      if (l) tone(ctx, l, l, 0.13, "triangle", 0.022);
      if (b) tone(ctx, b, b, 0.14, "sine", 0.026);
      bgmStep++;
    } catch (e) {}
    const stepMs = bgmHurry ? 168 : 210;
    bgmTimer = root.setTimeout(tickBgm, stepMs);
  }

  function startBgm(theme = "village") {
    bgmTheme = PATTERNS[theme] ? theme : "village";
    bgmHurry = false;
    stopBgm();
    if (muted) return;
    bgmStep = 0;
    bgmTimer = root.setTimeout(tickBgm, 180);
  }

  function setHurry(h) {
    bgmHurry = !!h;
  }

  function stopBgm() {
    if (bgmTimer) {
      root.clearTimeout(bgmTimer);
      bgmTimer = null;
    }
  }

  root.KuaSound = { play, setMuted, isMuted, startBgm, stopBgm, setHurry };
})(typeof window !== "undefined" ? window : globalThis);

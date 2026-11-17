/* 베니 크아 — 깔끔한 물풍선 폴리 SFX + 선택형 소프트 BGM (kua/sound.js) */
((root) => {
  "use strict";
  const BGM_KEY = "kua_bgm_on";
  let muted = false;
  let bgmEnabled = (() => {
    try { return root.localStorage && root.localStorage.getItem(BGM_KEY) === "1"; } catch (e) { return false; }
  })();
  let actx = null;
  let master = null;
  let noiseBuf = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmTheme = "village";
  let bgmHurry = false;

  function ensureCtx() {
    if (muted) return null;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    if (!actx) {
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.85;
      master.connect(actx.destination);
    }
    if (actx.state === "suspended") actx.resume().catch(() => {});
    if (!noiseBuf && actx) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
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

  function isBgmEnabled() { return bgmEnabled; }
  function setBgmEnabled(v) {
    bgmEnabled = !!v;
    try { if (root.localStorage) root.localStorage.setItem(BGM_KEY, bgmEnabled ? "1" : "0"); } catch (e) {}
    if (!bgmEnabled) stopBgm();
  }

  function tone(ctx, f0, f1, dur, type = "sine", peak = 0.08, delay = 0, cutoff = 2400) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const flt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(36, f1), t + dur);
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(cutoff, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(flt); flt.connect(g); g.connect(master || ctx.destination);
    o.start(t); o.stop(t + dur + 0.025);
  }

  function noiseBurst(ctx, freq, q, dur, peak = 0.06, delay = 0) {
    if (!noiseBuf) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.setValueAtTime(freq, t);
    flt.Q.setValueAtTime(q, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master || ctx.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function play(kind) {
    if (muted) return;
    try {
      const ctx = ensureCtx();
      if (!ctx) return;

      if (kind === "bomb") {
        // 말랑한 고무 물풍선 안착 ("폭-퐁")
        tone(ctx, 185, 92, 0.06, "sine", 0.12, 0, 1200);
        tone(ctx, 290, 460, 0.055, "sine", 0.075, 0.025, 1800);
      } else if (kind === "pop") {
        // 물풍선 폭발 ("풍-솨아!") — 저음 펀치 + 물보라 노이즈
        tone(ctx, 195, 44, 0.18, "sine", 0.17, 0, 720);
        noiseBurst(ctx, 760, 1.1, 0.17, 0.11);
        noiseBurst(ctx, 1750, 1.8, 0.13, 0.055, 0.02);
      } else if (kind === "item") {
        // 맑은 크리스탈 벨 획득음
        tone(ctx, 784, 784, 0.11, "sine", 0.075, 0, 3200);
        tone(ctx, 1175, 1175, 0.16, "sine", 0.07, 0.045, 3600);
      } else if (kind === "devil") {
        tone(ctx, 240, 145, 0.14, "sine", 0.085, 0, 900);
        tone(ctx, 180, 115, 0.18, "sine", 0.075, 0.075, 800);
      } else if (kind === "trap") {
        // 보글보글 물방울 감싸짐
        noiseBurst(ctx, 640, 2.5, 0.16, 0.06);
        tone(ctx, 320, 480, 0.09, "sine", 0.085, 0, 1400);
        tone(ctx, 410, 620, 0.11, "sine", 0.075, 0.07, 1600);
      } else if (kind === "needle" || kind === "rescue") {
        // 톡! 터지는 바늘 탈출 + 산뜻한 상승 화음
        noiseBurst(ctx, 2600, 2.2, 0.045, 0.09);
        tone(ctx, 587, 587, 0.11, "sine", 0.08, 0.01, 2800);
        tone(ctx, 880, 880, 0.15, "sine", 0.075, 0.055, 3200);
      } else if (kind === "kick" || kind === "throw" || kind === "push") {
        noiseBurst(ctx, 520, 1.6, 0.055, 0.055);
        tone(ctx, 220, 360, 0.06, "sine", 0.07, 0, 1400);
      } else if (kind === "plane") {
        noiseBurst(ctx, 310, 2.2, 0.34, 0.04);
      } else if (kind === "start") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, f, f, 0.18, "sine", 0.065, i * 0.065, 2400));
      } else if (kind === "die") {
        noiseBurst(ctx, 2100, 1.8, 0.065, 0.085);
        tone(ctx, 480, 115, 0.24, "sine", 0.10, 0.015, 1600);
      } else if (kind === "win") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, f, f, 0.28, "sine", 0.07, i * 0.08, 2800));
      } else if (kind === "lose") {
        [392.0, 349.23, 329.63, 261.63].forEach((f, i) => tone(ctx, f, f * 0.98, 0.24, "sine", 0.07, i * 0.11, 1400));
      }
    } catch (e) {}
  }

  // 선택형 배경음 (기본 끔): 로우패스 로즈 코드 패드 + 부드러운 서브베이스 그루브 (촌스러운 8비트 리드멜로디 제거)
  const CHORD_GROOVES = {
    village: [
      { root: 130.81, chord: [261.63, 329.63, 392.0, 493.88] }, // Cmaj7
      { root: 146.83, chord: [293.66, 349.23, 440.0, 523.25] }, // Dm7
      { root: 123.47, chord: [246.94, 329.63, 392.0, 493.88] }, // Em7/B
      { root: 196.00, chord: [293.66, 349.23, 440.0, 493.88] }, // G6/9
    ],
    pirate: [
      { root: 110.00, chord: [220.00, 261.63, 329.63, 392.00] }, // Am7
      { root: 174.61, chord: [261.63, 329.63, 392.00, 440.00] }, // Fmaj9
      { root: 146.83, chord: [220.00, 293.66, 349.23, 440.00] }, // Dm7
      { root: 164.81, chord: [246.94, 329.63, 392.00, 493.88] }, // Em7
    ],
    camp: [
      { root: 146.83, chord: [293.66, 369.99, 440.00, 554.37] }, // Dmaj7
      { root: 123.47, chord: [246.94, 293.66, 369.99, 440.00] }, // Bm7
      { root: 196.00, chord: [293.66, 392.00, 493.88, 554.37] }, // Gmaj7#11
      { root: 164.81, chord: [246.94, 329.63, 440.00, 493.88] }, // A9sus4
    ],
  };

  function tickBgm() {
    if (muted || !bgmEnabled) { stopBgm(); return; }
    try {
      const ctx = ensureCtx();
      if (!ctx) return;
      const bars = CHORD_GROOVES[bgmTheme] || CHORD_GROOVES.village;
      const stepInBar = bgmStep % 8;
      const bar = bars[Math.floor(bgmStep / 8) % bars.length];

      if (stepInBar === 0) {
        // 따뜻한 일렉트릭 피아노 4성부 패드
        bar.chord.forEach((f, idx) => tone(ctx, f, f, 1.35, "sine", 0.015, idx * 0.018, 1200));
        tone(ctx, bar.root, bar.root, 0.42, "sine", 0.032, 0, 420);
      } else if (stepInBar === 3 || stepInBar === 6) {
        tone(ctx, bar.root * (stepInBar === 6 ? 1.5 : 1), bar.root, 0.22, "sine", 0.022, 0, 400);
      }
      if (stepInBar % 2 === 1) {
        noiseBurst(ctx, 4800, 3.2, 0.022, 0.007);
      }
      bgmStep++;
    } catch (e) {}
    const stepMs = bgmHurry ? 185 : 230;
    bgmTimer = root.setTimeout(tickBgm, stepMs);
  }

  function startBgm(theme = "village") {
    bgmTheme = CHORD_GROOVES[theme] ? theme : "village";
    bgmHurry = false;
    stopBgm();
    if (muted || !bgmEnabled) return;
    bgmStep = 0;
    bgmTimer = root.setTimeout(tickBgm, 160);
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

  root.KuaSound = {
    play, setMuted, isMuted, isBgmEnabled, setBgmEnabled, startBgm, stopBgm, setHurry,
  };
})(typeof window !== "undefined" ? window : globalThis);

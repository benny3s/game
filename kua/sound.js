/* 베니 크아 — 140BPM 크아풍 폴리포닉 BGM + 레이어드 물풍선 SFX (kua/sound.js) */
((root) => {
  "use strict";
  let muted = false;
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

  function tone(ctx, f0, f1, dur, type = "sine", peak = 0.08, delay = 0, cutoff = 3200) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const flt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(cutoff, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.01, dur * 0.2));
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
    g.gain.setValueAtTime(peak, t);
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
        // 말랑한 물풍선 놓기 ("퐁-뿟!")
        tone(ctx, 210, 490, 0.065, "sine", 0.12, 0, 2200);
        tone(ctx, 480, 320, 0.055, "triangle", 0.07, 0.035, 1800);
      } else if (kind === "pop") {
        // 맑고 시원한 물폭탄 터짐 ("풍-솨아!")
        tone(ctx, 240, 56, 0.18, "sine", 0.16, 0, 900);
        tone(ctx, 420, 140, 0.13, "triangle", 0.09, 0.01, 1800);
        noiseBurst(ctx, 950, 1.4, 0.16, 0.09);
        noiseBurst(ctx, 2100, 2.2, 0.12, 0.04, 0.025);
      } else if (kind === "item") {
        tone(ctx, 659, 659, 0.07, "sine", 0.09, 0, 4000);
        tone(ctx, 880, 880, 0.07, "sine", 0.09, 0.045, 4000);
        tone(ctx, 1318, 1318, 0.13, "triangle", 0.09, 0.09, 4200);
      } else if (kind === "devil") {
        tone(ctx, 370, 195, 0.16, "triangle", 0.08, 0, 1400);
        tone(ctx, 260, 155, 0.18, "sine", 0.07, 0.08, 1200);
      } else if (kind === "trap") {
        // 보글보글 물방울 갇힘
        tone(ctx, 340, 560, 0.07, "sine", 0.10, 0, 1800);
        tone(ctx, 420, 680, 0.07, "sine", 0.09, 0.06, 2000);
        tone(ctx, 510, 790, 0.09, "sine", 0.08, 0.12, 2200);
      } else if (kind === "needle" || kind === "rescue") {
        tone(ctx, 587, 1175, 0.10, "sine", 0.11, 0, 3600);
        tone(ctx, 1046, 1568, 0.15, "triangle", 0.09, 0.055, 4000);
      } else if (kind === "kick" || kind === "throw" || kind === "push") {
        tone(ctx, 240, 460, 0.065, "sine", 0.08, 0, 2000);
      } else if (kind === "plane") {
        noiseBurst(ctx, 280, 2.5, 0.34, 0.035);
        tone(ctx, 145, 165, 0.30, "triangle", 0.03, 0, 500);
      } else if (kind === "start") {
        [523, 659, 784, 1046].forEach((f, i) => tone(ctx, f, f, 0.12, "triangle", 0.085, i * 0.07, 3200));
      } else if (kind === "die") {
        tone(ctx, 580, 130, 0.25, "sine", 0.11, 0, 2400);
        noiseBurst(ctx, 2000, 2.0, 0.07, 0.07);
      } else if (kind === "win") {
        [523, 659, 784, 1046, 880, 1046].forEach((f, i) => tone(ctx, f, f, 0.20, "triangle", 0.09, i * 0.085, 3400));
      } else if (kind === "lose") {
        [440, 392, 349, 262].forEach((f, i) => tone(ctx, f, f * 0.96, 0.20, "sine", 0.08, i * 0.10, 1800));
      }
    } catch (e) {}
  }

  // 140BPM 32스텝 경쾌한 스타카토 아케이드 멜로디 (C/F/G 다이아토닉 진행)
  const TRACKS = {
    village: {
      // C - G - Am - F - C - G - F - G7 느낌의 통통 튀는 빌리지 32스텝 8분음표 루프
      lead: [
        523, 659, 784, 659, 880, 784, 659, 523,
        587, 659, 698, 587, 659, 523, 392, 0,
        523, 659, 784, 1046, 880, 784, 698, 659,
        587, 698, 659, 587, 523, 0, 523, 0,
      ],
      bass: [
        131, 262, 196, 262, 196, 392, 247, 392,
        147, 294, 220, 294, 175, 349, 196, 392,
        131, 262, 196, 262, 220, 440, 175, 349,
        147, 294, 196, 392, 131, 262, 131, 0,
      ],
    },
    pirate: {
      lead: [
        440, 523, 659, 523, 784, 659, 587, 523,
        494, 587, 659, 494, 440, 392, 330, 0,
        440, 523, 659, 880, 784, 659, 587, 523,
        587, 659, 494, 392, 440, 0, 440, 0,
      ],
      bass: [
        220, 330, 220, 330, 196, 294, 196, 294,
        175, 262, 175, 262, 165, 247, 165, 247,
        220, 330, 220, 330, 196, 294, 175, 262,
        147, 220, 165, 247, 220, 330, 220, 0,
      ],
    },
    camp: {
      lead: [
        587, 740, 880, 740, 988, 880, 740, 587,
        659, 740, 784, 659, 587, 494, 440, 0,
        587, 740, 880, 1175, 988, 880, 784, 740,
        659, 784, 740, 659, 587, 0, 587, 0,
      ],
      bass: [
        147, 294, 220, 294, 196, 392, 147, 294,
        165, 330, 196, 392, 220, 440, 147, 294,
        147, 294, 220, 294, 196, 392, 165, 330,
        220, 440, 147, 294, 147, 294, 147, 0,
      ],
    },
  };

  function tickBgm() {
    if (muted) { stopBgm(); return; }
    try {
      const ctx = ensureCtx();
      if (!ctx) return;
      const pat = TRACKS[bgmTheme] || TRACKS.village;
      const idx = bgmStep % pat.lead.length;
      const l = pat.lead[idx], b = pat.bass[idx];
      if (l) {
        // 스타카토 마림바/플럭 멜로디 (따뜻한 로우패스 + 하모닉)
        tone(ctx, l, l, 0.11, "triangle", 0.026, 0, 2400);
        tone(ctx, l * 2, l * 2, 0.05, "sine", 0.008, 0, 3000);
      }
      if (b) tone(ctx, b, b, 0.12, "sine", 0.032, 0, 700);
      if (idx % 2 === 1) noiseBurst(ctx, 5200, 3.0, 0.028, 0.009);
      bgmStep++;
    } catch (e) {}
    const stepMs = bgmHurry ? 148 : 190;
    bgmTimer = root.setTimeout(tickBgm, stepMs);
  }

  function startBgm(theme = "village") {
    bgmTheme = TRACKS[theme] ? theme : "village";
    bgmHurry = false;
    stopBgm();
    if (muted) return;
    bgmStep = 0;
    bgmTimer = root.setTimeout(tickBgm, 140);
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

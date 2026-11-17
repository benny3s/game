/* 베니 크아 — 아케이드 멀티트랙 WebAudio 엔진 + 로컬 원작 음원(IndexedDB) 오버라이드 (kua/sound.js) */
((root) => {
  "use strict";
  const BGM_KEY = "kua_bgm_v2";
  const DB_NAME = "kua_custom_audio_v1";
  const STORE_NAME = "clips";

  const CUSTOM_SLOTS = [
    { id: "bgm_village", label: "빌리지 10 BGM", keys: ["village", "boomhill", "빌리지", "붐힐"], isBgm: true },
    { id: "bgm_pirate",  label: "패트릿 14 BGM", keys: ["pirate", "patrit", "패트릿", "해적"], isBgm: true },
    { id: "bgm_camp",    label: "캠프 08 BGM",   keys: ["camp", "캠프"], isBgm: true },
    { id: "bgm_lobby",   label: "대기실 BGM",    keys: ["lobby", "room", "대기실", "로비"], isBgm: true },
    { id: "bomb",        label: "물풍선 놓기",   keys: ["bomb_set", "bubble_set", "setbomb", "drop", "bomb", "놓기", "설치"], isBgm: false },
    { id: "pop",         label: "물풍선 터짐",   keys: ["bomb_pop", "explode", "burst", "wave", "pop", "터짐", "폭발"], isBgm: false },
    { id: "item",        label: "아이템 획득",   keys: ["item", "eat", "get", "아이템"], isBgm: false },
    { id: "trap",        label: "물방울 갇힘",   keys: ["trap", "bubble", "갇힘", "물방울"], isBgm: false },
    { id: "needle",      label: "바늘 · 구출",   keys: ["needle", "pin", "rescue", "바늘", "구출"], isBgm: false },
    { id: "kick",        label: "발차기 · 던지기", keys: ["kick", "throw", "push", "발차기", "던지기"], isBgm: false },
    { id: "start",       label: "경기 시작",     keys: ["start", "ready", "시작"], isBgm: false },
    { id: "win",         label: "승리 팡파레",   keys: ["win", "victory", "승리"], isBgm: false },
    { id: "lose",        label: "패배",          keys: ["lose", "fail", "defeat", "패배"], isBgm: false },
    { id: "die",         label: "처치 · 탈락",   keys: ["die", "dead", "death", "사망", "처치"], isBgm: false },
  ];

  let muted = false;
  let bgmEnabled = (() => {
    try { return !root.localStorage || root.localStorage.getItem(BGM_KEY) !== "0"; } catch (e) { return true; }
  })();

  let actx = null;
  let comp = null;
  let master = null;
  let sfxBus = null;
  let bgmBus = null;
  let revSend = null;
  let noiseBuf = null;

  let bgmTimer = null;
  let bgmStep = 0;
  let bgmNextTime = 0;
  let bgmTheme = "village";
  let bgmHurry = false;
  let bgmSource = null;

  const customRaw = new Map(); // id -> { id, name, type, buf: ArrayBuffer }
  const customBufs = new Map(); // id -> AudioBuffer
  let dbReadyPromise = null;

  function openDb() {
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
  }

  function loadAllFromDb() {
    if (dbReadyPromise) return dbReadyPromise;
    dbReadyPromise = openDb().then(db => {
      if (!db) return 0;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            list.forEach(item => {
              if (item && item.id && item.buf) customRaw.set(item.id, item);
            });
            resolve(list.length);
          };
          req.onerror = () => resolve(0);
        } catch (e) { resolve(0); }
      });
    });
    return dbReadyPromise;
  }

  // 부팅 시 조용히 IndexedDB 메타/바이너리 로딩
  loadAllFromDb();

  function buildImpulse(ctx) {
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 2.4);
        data[i] = (Math.random() * 2 - 1) * env * 0.45;
      }
    }
    return buf;
  }

  function ensureCtx(forceForPreview = false) {
    if (muted && !forceForPreview) return null;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    if (!actx) {
      actx = new AC();
      comp = actx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 4.5;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;

      master = actx.createGain();
      master.gain.value = 0.88;
      comp.connect(master);
      master.connect(actx.destination);

      sfxBus = actx.createGain();
      sfxBus.gain.value = 0.92;
      sfxBus.connect(comp);

      bgmBus = actx.createGain();
      bgmBus.gain.value = 0.42;
      bgmBus.connect(comp);

      try {
        const conv = actx.createConvolver();
        conv.buffer = buildImpulse(actx);
        revSend = actx.createGain();
        revSend.gain.value = 0.16;
        revSend.connect(conv);
        conv.connect(comp);
      } catch (e) { revSend = null; }
    }
    if (actx.state === "suspended") actx.resume().catch(() => {});
    if (!noiseBuf && actx) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.6, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return actx;
  }

  async function decodeSlotBuffer(slotId, ctx) {
    if (customBufs.has(slotId)) return customBufs.get(slotId);
    const rec = customRaw.get(slotId);
    if (!rec || !rec.buf || !ctx) return null;
    try {
      const copy = rec.buf.slice(0);
      const decoded = await ctx.decodeAudioData(copy);
      customBufs.set(slotId, decoded);
      return decoded;
    } catch (e) { return null; }
  }

  function playCustomBuffer(ctx, buf, isBgm = false) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (isBgm) {
      src.loop = true;
      src.playbackRate.value = bgmHurry ? 1.12 : 1.0;
      src.connect(bgmBus || master || ctx.destination);
    } else {
      src.connect(sfxBus || master || ctx.destination);
    }
    src.start(ctx.currentTime);
    return src;
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

  // ── WebAudio 기본 합성 유틸리티 ──
  function synthVoice(ctx, when, f0, f1, dur, {
    type = "sine", peak = 0.09, cutoff0 = 3200, cutoff1 = 900,
    attack = 0.008, detuneCents = 0, wet = true, bus = null,
  } = {}) {
    const out = bus || sfxBus || ctx.destination;
    const g = ctx.createGain();
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.Q.value = 1.1;
    flt.frequency.setValueAtTime(Math.max(120, cutoff0), when);
    if (cutoff1 && cutoff1 !== cutoff0) {
      flt.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff1), when + dur);
    }

    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + Math.min(attack, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    const oscs = detuneCents ? [-detuneCents, detuneCents] : [0];
    oscs.forEach(d => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, when);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(32, f1), when + dur);
      if (d) o.detune.value = d;
      o.connect(flt);
      o.start(when);
      o.stop(when + dur + 0.03);
    });

    flt.connect(g);
    g.connect(out);
    if (wet && revSend) {
      const wg = ctx.createGain();
      wg.gain.value = 0.32;
      g.connect(wg);
      wg.connect(revSend);
    }
  }

  function noiseHit(ctx, when, freq, q, dur, peak = 0.08, { filterType = "bandpass", bus = null, wet = false } = {}) {
    if (!noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(freq, when);
    flt.Q.setValueAtTime(q, when);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + Math.min(0.006, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(flt); flt.connect(g);
    g.connect(bus || sfxBus || ctx.destination);
    if (wet && revSend) g.connect(revSend);
    src.start(when);
    src.stop(when + dur + 0.025);
  }

  function synthSfx(ctx, kind) {
    const t = ctx.currentTime;

    if (kind === "bomb") {
      // 말랑한 고무 물풍선 안착 ("뽁-뿝!")
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const flt = ctx.createBiquadFilter();
      o.type = "sine";
      o.frequency.setValueAtTime(165, t);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.024);
      o.frequency.exponentialRampToValueAtTime(135, t + 0.085);
      flt.type = "lowpass"; flt.frequency.setValueAtTime(1800, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(flt); flt.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + 0.11);
      noiseHit(ctx, t, 880, 2.2, 0.045, 0.045);
    } else if (kind === "pop") {
      // 크아 물폭탄 폭발 ("풍!! 솨아-또르륵")
      synthVoice(ctx, t, 155, 36, 0.22, { type: "sine", peak: 0.24, cutoff0: 520, cutoff1: 180, attack: 0.004, wet: true });
      synthVoice(ctx, t + 0.005, 290, 68, 0.15, { type: "triangle", peak: 0.12, cutoff0: 1400, cutoff1: 350, attack: 0.004 });
      noiseHit(ctx, t, 680, 0.85, 0.20, 0.17, { wet: true });
      noiseHit(ctx, t + 0.014, 2150, 1.4, 0.15, 0.085, { wet: true });
      // 뒤이어 튀는 미세 물방울 3개
      [1150, 1620, 2050].forEach((f, idx) => {
        synthVoice(ctx, t + 0.032 + idx * 0.028, f, f * 1.45, 0.045, { type: "sine", peak: 0.042, cutoff0: 3600, attack: 0.003 });
      });
    } else if (kind === "item") {
      // 상쾌한 크리스탈 벨 2단 획득음 ("띠-링!")
      const notes = [783.99, 1046.5, 1567.98];
      notes.forEach((f, i) => {
        synthVoice(ctx, t + i * 0.042, f, f, 0.15, { type: "triangle", peak: 0.085, cutoff0: 4400, cutoff1: 1800, detuneCents: 5, wet: true });
        synthVoice(ctx, t + i * 0.042, f * 2, f * 2, 0.09, { type: "sine", peak: 0.035, cutoff0: 5500, wet: true });
      });
    } else if (kind === "devil") {
      synthVoice(ctx, t, 330, 175, 0.14, { type: "sawtooth", peak: 0.065, cutoff0: 1400, cutoff1: 500, detuneCents: 6 });
      synthVoice(ctx, t + 0.085, 240, 118, 0.19, { type: "sawtooth", peak: 0.065, cutoff0: 1100, cutoff1: 420, detuneCents: 6 });
    } else if (kind === "trap") {
      // 실제 LFO 물속 보글보글 갇힘음
      const o = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const flt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(340, t);
      o.frequency.linearRampToValueAtTime(520, t + 0.24);
      lfo.type = "sine";
      lfo.frequency.value = 19;
      lfoGain.gain.value = 68;
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      flt.type = "bandpass"; flt.frequency.value = 680; flt.Q.value = 1.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(flt); flt.connect(g); g.connect(sfxBus);
      o.start(t); lfo.start(t);
      o.stop(t + 0.30); lfo.stop(t + 0.30);
      noiseHit(ctx, t + 0.02, 740, 2.5, 0.16, 0.065, { wet: true });
    } else if (kind === "needle" || kind === "rescue") {
      // 바늘 터짐 ("톡!") + 상쾌한 3화음
      noiseHit(ctx, t, 3600, 1.4, 0.042, 0.14);
      synthVoice(ctx, t, 680, 1650, 0.05, { type: "sine", peak: 0.11, cutoff0: 4000 });
      [587.33, 880.0, 1174.66].forEach((f, i) => {
        synthVoice(ctx, t + 0.015 + i * 0.036, f, f, 0.16, { type: "triangle", peak: 0.075, cutoff0: 3600, detuneCents: 4, wet: true });
      });
    } else if (kind === "kick" || kind === "throw" || kind === "push") {
      synthVoice(ctx, t, 175, 58, 0.08, { type: "sine", peak: 0.14, cutoff0: 900, attack: 0.004 });
      noiseHit(ctx, t + 0.01, 1100, 1.3, 0.06, 0.06);
    } else if (kind === "plane") {
      synthVoice(ctx, t, 82, 88, 0.34, { type: "sawtooth", peak: 0.04, cutoff0: 280, cutoff1: 220 });
      noiseHit(ctx, t, 340, 1.8, 0.36, 0.045);
    } else if (kind === "start") {
      // 아케이드 레디~고 브라스 팡파레
      [
        { f: 523.25, d: 0.11, w: 0.00 },
        { f: 659.25, d: 0.11, w: 0.09 },
        { f: 783.99, d: 0.11, w: 0.18 },
        { f: 1046.5, d: 0.28, w: 0.28 },
      ].forEach(n => {
        synthVoice(ctx, t + n.w, n.f, n.f, n.d, { type: "sawtooth", peak: 0.068, cutoff0: 2800, cutoff1: 1400, detuneCents: 6, wet: true });
        synthVoice(ctx, t + n.w, n.f * 0.5, n.f * 0.5, n.d, { type: "triangle", peak: 0.05, cutoff0: 1600 });
      });
    } else if (kind === "die") {
      noiseHit(ctx, t, 2400, 1.8, 0.07, 0.12);
      synthVoice(ctx, t + 0.015, 540, 110, 0.28, { type: "triangle", peak: 0.12, cutoff0: 2400, cutoff1: 500, wet: true });
    } else if (kind === "win") {
      [
        { f: 523.25, d: 0.12, w: 0.00 },
        { f: 659.25, d: 0.12, w: 0.09 },
        { f: 783.99, d: 0.12, w: 0.18 },
        { f: 1046.5, d: 0.20, w: 0.27 },
        { f: 880.00, d: 0.14, w: 0.44 },
        { f: 1046.5, d: 0.42, w: 0.56 },
      ].forEach(n => {
        synthVoice(ctx, t + n.w, n.f, n.f, n.d, { type: "sawtooth", peak: 0.065, cutoff0: 3000, cutoff1: 1500, detuneCents: 7, wet: true });
      });
    } else if (kind === "lose") {
      [392.0, 369.99, 349.23, 261.63].forEach((f, i) => {
        synthVoice(ctx, t + i * 0.13, f, f * 0.96, 0.24, { type: "triangle", peak: 0.075, cutoff0: 1600, cutoff1: 700, detuneCents: 4, wet: true });
      });
    }
  }

  function play(kind, forcePreview = false) {
    if (muted && !forcePreview) return;
    try {
      const ctx = ensureCtx(forceForPreview);
      if (!ctx) return;

      const resolved = kind === "rescue" ? (customRaw.has("rescue") ? "rescue" : "needle")
        : (kind === "throw" || kind === "push") ? (customRaw.has(kind) ? kind : "kick")
        : kind;

      if (customRaw.has(resolved)) {
        const cached = customBufs.get(resolved);
        if (cached) { playCustomBuffer(ctx, cached, false); return; }
        decodeSlotBuffer(resolved, ctx).then(buf => {
          if (buf && (!muted || forcePreview)) playCustomBuffer(ctx, buf, false);
        });
        return;
      }
      synthSfx(ctx, kind);
    } catch (e) {}
  }

  // ── 16분음표 룩어헤드 아케이드 드럼 + 신스 BGM (촌스럽지 않은 4트랙 사운드) ──
  // MIDI -> Hz 헬퍼
  const m2f = m => 440 * Math.pow(2, (m - 69) / 12);

  const BGM_SONGS = {
    // 132 BPM C 메이저 빌리지 스타일 경쾌한 팝 아케이드 그루브 (32스텝 = 2마디 루프 × 변주)
    village: {
      bpm: 132,
      lead: [
        79, 0, 76, 79, 84, 0, 81, 79, 76, 0, 74, 76, 72, 0, 67, 0,
        74, 0, 76, 77, 79, 0, 81, 0, 79, 77, 76, 74, 76, 0, 0, 0,
        79, 0, 81, 83, 84, 0, 88, 84, 81, 0, 79, 77, 76, 0, 72, 0,
        77, 0, 76, 74, 79, 0, 74, 0, 72, 0, 72, 0, 0, 0, 0, 0,
      ],
      bass: [
        48, 0, 60, 0, 48, 0, 55, 0, 45, 0, 57, 0, 43, 0, 55, 0,
        41, 0, 53, 0, 48, 0, 60, 0, 43, 0, 55, 0, 43, 47, 50, 55,
        48, 0, 60, 0, 47, 0, 59, 0, 45, 0, 57, 0, 43, 0, 55, 0,
        41, 0, 53, 0, 43, 0, 55, 0, 48, 0, 48, 0, 43, 47, 55, 0,
      ],
      chords: [
        [60, 64, 67], 0, 0, 0, [60, 64, 67], 0, [60, 64, 67], 0,
        [57, 60, 64], 0, 0, 0, [55, 59, 62], 0, [55, 59, 62], 0,
        [53, 57, 60], 0, 0, 0, [60, 64, 67], 0, 0, 0,
        [55, 59, 62, 65], 0, 0, 0, [55, 59, 62], 0, 0, 0,
        [60, 64, 67], 0, 0, 0, [59, 62, 67], 0, 0, 0,
        [57, 60, 64], 0, 0, 0, [55, 60, 64], 0, 0, 0,
        [53, 57, 60], 0, 0, 0, [55, 59, 62], 0, 0, 0,
        [60, 64, 67], 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    // 136 BPM A 마이너 패트릿 해적 어드벤처 그루브
    pirate: {
      bpm: 136,
      lead: [
        69, 0, 72, 76, 81, 0, 79, 76, 77, 0, 76, 74, 76, 0, 69, 0,
        72, 0, 74, 76, 79, 0, 77, 76, 74, 0, 72, 71, 76, 0, 0, 0,
        81, 0, 79, 77, 76, 0, 74, 72, 74, 0, 76, 77, 79, 0, 76, 0,
        77, 0, 76, 74, 72, 71, 69, 0, 69, 0, 69, 0, 0, 0, 0, 0,
      ],
      bass: [
        45, 0, 57, 0, 45, 0, 52, 0, 41, 0, 53, 0, 40, 0, 52, 0,
        48, 0, 60, 0, 43, 0, 55, 0, 40, 0, 52, 0, 40, 44, 47, 52,
        45, 0, 57, 0, 48, 0, 60, 0, 41, 0, 53, 0, 43, 0, 55, 0,
        41, 0, 53, 0, 40, 0, 52, 0, 45, 0, 45, 0, 52, 48, 45, 0,
      ],
      chords: [
        [57, 60, 64], 0, 0, 0, [57, 60, 64], 0, 0, 0,
        [53, 57, 60], 0, 0, 0, [52, 56, 59], 0, 0, 0,
        [60, 64, 67], 0, 0, 0, [55, 59, 62], 0, 0, 0,
        [52, 56, 59], 0, 0, 0, [52, 56, 59], 0, 0, 0,
        [57, 60, 64], 0, 0, 0, [60, 64, 67], 0, 0, 0,
        [53, 57, 60], 0, 0, 0, [55, 59, 62], 0, 0, 0,
        [53, 57, 60], 0, 0, 0, [52, 56, 59], 0, 0, 0,
        [57, 60, 64], 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    // 128 BPM D 메이저 캠프 그루브
    camp: {
      bpm: 128,
      lead: [
        74, 0, 78, 81, 86, 0, 83, 81, 79, 0, 78, 76, 78, 0, 74, 0,
        76, 0, 78, 79, 81, 0, 83, 0, 81, 79, 78, 76, 74, 0, 0, 0,
        86, 0, 85, 83, 81, 0, 78, 74, 79, 0, 81, 83, 81, 0, 76, 0,
        79, 0, 78, 76, 81, 0, 76, 0, 74, 0, 74, 0, 0, 0, 0, 0,
      ],
      bass: [
        50, 0, 62, 0, 50, 0, 57, 0, 47, 0, 59, 0, 45, 0, 57, 0,
        43, 0, 55, 0, 50, 0, 62, 0, 45, 0, 57, 0, 50, 0, 45, 0,
        50, 0, 62, 0, 47, 0, 59, 0, 43, 0, 55, 0, 45, 0, 57, 0,
        43, 0, 55, 0, 45, 0, 57, 0, 50, 0, 50, 0, 45, 49, 50, 0,
      ],
      chords: [
        [62, 66, 69], 0, 0, 0, [62, 66, 69], 0, 0, 0,
        [59, 62, 66], 0, 0, 0, [57, 61, 64], 0, 0, 0,
        [55, 59, 62], 0, 0, 0, [62, 66, 69], 0, 0, 0,
        [57, 61, 64], 0, 0, 0, [62, 66, 69], 0, 0, 0,
        [62, 66, 69], 0, 0, 0, [59, 62, 66], 0, 0, 0,
        [55, 59, 62], 0, 0, 0, [57, 61, 64], 0, 0, 0,
        [55, 59, 62], 0, 0, 0, [57, 61, 64], 0, 0, 0,
        [62, 66, 69], 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    // 116 BPM 경쾌한 대기실 브리즈 그루브
    lobby: {
      bpm: 116,
      lead: [
        72, 0, 76, 0, 79, 0, 76, 74, 72, 0, 0, 69, 71, 0, 74, 0,
        76, 0, 79, 0, 84, 0, 81, 79, 74, 0, 0, 76, 72, 0, 0, 0,
      ],
      bass: [
        48, 0, 0, 60, 48, 0, 55, 0, 45, 0, 0, 57, 43, 0, 55, 0,
        41, 0, 0, 53, 48, 0, 55, 0, 43, 0, 55, 0, 48, 0, 0, 0,
      ],
      chords: [
        [60, 64, 67, 71], 0, 0, 0, [60, 64, 67, 71], 0, 0, 0,
        [57, 60, 64, 67], 0, 0, 0, [55, 59, 62, 65], 0, 0, 0,
        [53, 57, 60, 64], 0, 0, 0, [60, 64, 67, 71], 0, 0, 0,
        [55, 59, 62, 65], 0, 0, 0, [60, 64, 67], 0, 0, 0,
      ],
    },
  };

  function scheduleDrumStep(ctx, when, sInBar) {
    // 킥: 0, 4, 8, 12 (+ 10 싱코페이션)
    if (sInBar % 4 === 0 || sInBar === 10) {
      synthVoice(ctx, when, 132, 42, 0.095, { type: "sine", peak: 0.24, cutoff0: 320, cutoff1: 120, attack: 0.002, wet: false, bus: bgmBus });
      noiseHit(ctx, when, 1400, 1.2, 0.015, 0.03, { bus: bgmBus });
    }
    // 스네어: 4, 12
    if (sInBar === 4 || sInBar === 12) {
      synthVoice(ctx, when, 195, 115, 0.065, { type: "triangle", peak: 0.10, cutoff0: 900, attack: 0.002, wet: false, bus: bgmBus });
      noiseHit(ctx, when, 2900, 0.75, 0.085, 0.095, { filterType: "highpass", bus: bgmBus, wet: true });
    }
    // 하이햇: 짝수 오프비트 및 오픈햇
    if (sInBar % 2 === 1) {
      const open = sInBar === 14;
      noiseHit(ctx, when, 7600, 1.1, open ? 0.075 : 0.028, open ? 0.045 : 0.03, { filterType: "highpass", bus: bgmBus });
    }
  }

  function scheduleBgmStep(ctx, song, stepIdx, when, stepDur) {
    const len = song.lead.length;
    const i = stepIdx % len;
    const sInBar = i % 16;

    scheduleDrumStep(ctx, when, sInBar);

    const leadMidi = song.lead[i];
    if (leadMidi) {
      const freq = m2f(leadMidi);
      // 따뜻한 2000년대 아케이드 브라스/신스 플럭 (듀얼 디튠 + 로우패스 스윕)
      synthVoice(ctx, when, freq, freq, stepDur * 1.45, {
        type: "sawtooth", peak: 0.055, cutoff0: 2900, cutoff1: 1100, attack: 0.008, detuneCents: 6, wet: true, bus: bgmBus,
      });
      synthVoice(ctx, when, freq, freq, stepDur * 1.15, {
        type: "triangle", peak: 0.045, cutoff0: 3600, attack: 0.006, wet: false, bus: bgmBus,
      });
    }

    const bassMidi = song.bass[i];
    if (bassMidi) {
      const bf = m2f(bassMidi);
      synthVoice(ctx, when, bf, bf, stepDur * 1.35, {
        type: "sawtooth", peak: 0.09, cutoff0: 780, cutoff1: 240, attack: 0.004, wet: false, bus: bgmBus,
      });
    }

    const chord = song.chords[i];
    if (chord && Array.isArray(chord)) {
      chord.forEach((m, cIdx) => {
        synthVoice(ctx, when + cIdx * 0.005, m2f(m), m2f(m), stepDur * 2.4, {
          type: "triangle", peak: 0.032, cutoff0: 1900, cutoff1: 850, attack: 0.012, wet: true, bus: bgmBus,
        });
      });
    }
  }

  function pumpBgm() {
    if (muted || !bgmEnabled) { stopBgm(); return; }
    try {
      const ctx = ensureCtx();
      if (!ctx) return;
      const song = BGM_SONGS[bgmTheme] || BGM_SONGS.village;
      const bpm = song.bpm * (bgmHurry ? 1.12 : 1.0);
      const stepDur = 60 / bpm / 4; // 16분음표 1스텝
      const horizon = ctx.currentTime + 0.14;
      if (bgmNextTime < ctx.currentTime) bgmNextTime = ctx.currentTime + 0.03;
      while (bgmNextTime < horizon) {
        scheduleBgmStep(ctx, song, bgmStep, bgmNextTime, stepDur);
        bgmNextTime += stepDur;
        bgmStep++;
      }
    } catch (e) {}
    bgmTimer = root.setTimeout(pumpBgm, 45);
  }

  function startBgm(theme = "village") {
    bgmTheme = BGM_SONGS[theme] ? theme : "village";
    bgmHurry = false;
    stopBgm();
    if (muted || !bgmEnabled) return;
    const ctx = ensureCtx();
    if (!ctx) return;

    const customKey = "bgm_" + bgmTheme;
    if (customRaw.has(customKey)) {
      const playCustomBgm = async () => {
        const buf = await decodeSlotBuffer(customKey, ctx);
        if (buf && !muted && bgmEnabled && bgmTheme === theme) {
          stopBgm();
          bgmSource = playCustomBuffer(ctx, buf, true);
          return;
        }
        if (!muted && bgmEnabled && !bgmSource && !bgmTimer) {
          bgmStep = 0;
          bgmNextTime = ctx.currentTime + 0.06;
          pumpBgm();
        }
      };
      playCustomBgm();
      return;
    }

    bgmStep = 0;
    bgmNextTime = ctx.currentTime + 0.06;
    pumpBgm();
  }

  function setHurry(h) {
    const next = !!h;
    if (bgmHurry === next) return;
    bgmHurry = next;
    if (bgmSource && actx) {
      try { bgmSource.playbackRate.setTargetAtTime(bgmHurry ? 1.12 : 1.0, actx.currentTime, 0.08); } catch (e) {}
    }
  }

  function stopBgm() {
    if (bgmTimer) {
      root.clearTimeout(bgmTimer);
      bgmTimer = null;
    }
    if (bgmSource) {
      try { bgmSource.stop(); } catch (e) {}
      try { bgmSource.disconnect(); } catch (e) {}
      bgmSource = null;
    }
  }

  // ── 로컬 원작 음원(IndexedDB) 관리 API ──
  async function setCustomSlot(slotId, file) {
    if (!file) return false;
    const buf = await file.arrayBuffer();
    const rec = { id: slotId, name: file.name, type: file.type || "audio/mpeg", buf };
    customRaw.set(slotId, rec);
    customBufs.delete(slotId);
    const db = await openDb();
    if (db) {
      await new Promise(res => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(rec);
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    }
    return true;
  }

  const MATCH_RULES = CUSTOM_SLOTS
    .flatMap(slot => slot.keys.map(key => ({ id: slot.id, key })))
    .sort((a, b) => b.key.length - a.key.length);

  function matchSlotByName(filename) {
    const lower = String(filename || "").toLowerCase();
    for (const r of MATCH_RULES) {
      if (lower.includes(r.key)) return r.id;
    }
    return null;
  }

  async function importCustomFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(f.name) || (f.type && f.type.startsWith("audio/")));
    const matched = [];
    const unmatched = [];
    for (const f of files) {
      const slotId = matchSlotByName(f.name);
      if (slotId) {
        await setCustomSlot(slotId, f);
        matched.push({ slotId, file: f.name });
      } else {
        unmatched.push(f.name);
      }
    }
    return { total: files.length, matched, unmatched };
  }

  async function clearCustomSlot(slotId) {
    customRaw.delete(slotId);
    customBufs.delete(slotId);
    const db = await openDb();
    if (db) {
      await new Promise(res => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(slotId);
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    }
  }

  async function clearAllCustom() {
    customRaw.clear();
    customBufs.clear();
    const db = await openDb();
    if (db) {
      await new Promise(res => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    }
  }

  function getCustomStatus() {
    return CUSTOM_SLOTS.map(s => {
      const rec = customRaw.get(s.id);
      return { ...s, fileName: rec ? rec.name : null };
    });
  }

  function getCustomCount() {
    return customRaw.size;
  }

  async function testSlot(slotId) {
    const ctx = ensureCtx(true);
    if (!ctx) return;
    if (slotId.startsWith("bgm_")) {
      const th = slotId.slice(4);
      if (customRaw.has(slotId)) {
        const buf = await decodeSlotBuffer(slotId, ctx);
        if (buf) {
          stopBgm();
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(bgmBus || master || ctx.destination);
          src.start(ctx.currentTime);
          src.stop(ctx.currentTime + Math.min(4.5, buf.duration || 4.5));
          bgmSource = src;
        }
      } else {
        const prev = bgmEnabled;
        bgmEnabled = true;
        startBgm(th);
        root.setTimeout(() => { stopBgm(); bgmEnabled = prev; }, 2800);
      }
      return;
    }
    play(slotId, true);
  }

  root.KuaSound = {
    play,
    setMuted,
    isMuted,
    isBgmEnabled,
    setBgmEnabled,
    startBgm,
    stopBgm,
    setHurry,
    ready: loadAllFromDb,
    CUSTOM_SLOTS,
    setCustomSlot,
    importCustomFiles,
    clearCustomSlot,
    clearAllCustom,
    getCustomStatus,
    getCustomCount,
    testSlot,
  };
})(typeof window !== "undefined" ? window : globalThis);

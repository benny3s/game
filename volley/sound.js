/* 냥냥 배구 소리 — 파일 없이 Web Audio 로 (Cozy.sfx 에 더해서 켬/끔·한 장치를 같이 씀)
   통통(몸으로 받기) · 퍽(스매시) · 휙(휘두르기) · 슥(몸 날리기) · 폭(모래) · 호루라기 · 와아(환호) · 야옹
   야옹 소리는 냥도쿠 sound.js 의 mew 를 그대로 옮겨 씀 */
(() => {
  const sfx = Cozy.sfx;
  // 직접 만든 소리 줄기 (Cozy 의 master 와 같은 크기로)
  const buses = new WeakMap();
  function bus(S) {
    let b = buses.get(S.ac);
    if (!b) { b = S.ac.createGain(); b.gain.value = 1.6; b.connect(S.ac.destination); buses.set(S.ac, b); }
    return b;
  }
  // 야옹: 음높이가 올라갔다 내려오고(미-야-옹), 입 모양처럼 필터가 열렸다 닫힘
  function mew(S, t, { base = 720, dur = 0.3, vol = 0.2, up = 1.4, end = 0.9 } = {}) {
    const ac = S.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), g2 = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'sine';
    for (const [osc, m] of [[o, 1], [o2, 2]]) {
      osc.frequency.setValueAtTime(base * 0.85 * m, t);
      osc.frequency.linearRampToValueAtTime(base * up * m, t + dur * 0.35);
      osc.frequency.exponentialRampToValueAtTime(base * end * m, t + dur);
    }
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2400, t + dur * 0.35); f.frequency.exponentialRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.value = 0.35;
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(bus(S));
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  // 통! 하고 떨리는 고무공 소리 (높이 p 0~1)
  function boing(S, t, p, vol) {
    const ac = S.ac, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    const f0 = 230 + p * 150, d = 0.26;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.05, t + 0.04); o.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + d);
    lfo.frequency.value = 15; lg.gain.setValueAtTime(f0 * 0.1, t); lg.gain.exponentialRampToValueAtTime(1, t + d);
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(bus(S)); o.start(t); lfo.start(t); o.stop(t + d + 0.02); lfo.stop(t + d + 0.02);
  }
  // 호루라기: 높은 음이 빠르게 떨림 (삐익)
  function whistle(S, t, dur, vol) {
    const ac = S.ac, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(2350, t); o.frequency.linearRampToValueAtTime(2500, t + dur);
    lfo.type = 'square'; lfo.frequency.value = 34; lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.setValueAtTime(vol, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(bus(S)); o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }
  // 와아: 걸러 낸 잡음이 부풀었다 가라앉음 + 작은 '우-' 몇 개
  function cheer(S, t, vol) {
    S.noise(t, 1.1, { vol: vol, type: 'bandpass', f: 700, f2: 1300, q: 0.6 });
    S.noise(t + 0.05, 0.9, { vol: vol * 0.6, type: 'bandpass', f: 1800, f2: 2600, q: 1.2 });
    for (let i = 0; i < 4; i++) S.tone(t + 0.04 + i * 0.07, 420 + i * 70, 0.5, { type: 'triangle', vol: 0.025, f2: 700 + i * 90, attack: 0.08 });
  }
  const N = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
  const SOUNDS = {
    boing(t, o, S) { const p = o.p || 0; boing(S, t, p, 0.14 + p * 0.08); S.noise(t, 0.03, { vol: 0.16, type: 'lowpass', f: 2200 }); },
    thwack(t, o, S) {
      S.noise(t, 0.1, { vol: 0.6, type: 'bandpass', f: 1500, f2: 420, q: 0.9 });
      S.tone(t, 160, 0.13, { type: 'sine', vol: 0.4, f2: 55 });
      S.tone(t, 820, 0.05, { type: 'triangle', vol: 0.08, f2: 380 });
      if (o.perfect) { S.tone(t + 0.04, N.G6, 0.2, { type: 'triangle', vol: 0.1 }); S.tone(t + 0.09, N.C6 * 2, 0.24, { vol: 0.07 }); }
    },
    dig(t, o, S) { S.noise(t, 0.12, { vol: 0.35, type: 'lowpass', f: 900, f2: 300 }); boing(S, t + 0.02, 0.5, 0.12); },
    hop(t, o, S) { S.tone(t, 360, 0.09, { type: 'sine', vol: 0.06, f2: 620 }); },
    swish(t, o, S) { S.noise(t, 0.13, { vol: 0.16, type: 'bandpass', f: 800, f2: 3200, q: 1.3 }); },
    dive(t, o, S) { S.noise(t, 0.22, { vol: 0.22, type: 'bandpass', f: 600, f2: 1900, q: 0.7 }); S.noise(t + 0.06, 0.24, { vol: 0.07, type: 'highpass', f: 3200 }); },
    thud(t, o, S) { S.noise(t, 0.07, { vol: 0.22, type: 'lowpass', f: 480 }); S.tone(t, 110, 0.08, { vol: 0.13, f2: 70 }); },
    sand(t, o, S) {
      const big = !!o.big;
      S.noise(t, big ? 0.2 : 0.1, { vol: big ? 0.5 : 0.2, type: 'lowpass', f: 1300, f2: 300 });
      S.tone(t, 95, big ? 0.15 : 0.08, { vol: big ? 0.28 : 0.1, f2: 50 });
    },
    net(t, o, S) { S.noise(t, 0.12, { vol: 0.26, type: 'bandpass', f: 2200, q: 3 }); S.tone(t, 330, 0.26, { type: 'triangle', vol: 0.07, f2: 290 }); },
    knock(t, o, S) { S.tone(t, 520, 0.06, { type: 'triangle', vol: 0.09, f2: 360 }); S.noise(t, 0.03, { vol: 0.12, type: 'bandpass', f: 1800, q: 2 }); },
    whistle(t, o, S) { whistle(S, t, 0.16, 0.09); },
    // 랠리 열기: 따뜻하게 올라가는 반짝 세 음
    heat(t, o, S) { [N.E5, N.A5, N.E6].forEach((f, i) => S.tone(t + i * 0.06, f, 0.16, { type: 'triangle', vol: 0.06 })); S.noise(t, 0.25, { vol: 0.05, type: 'highpass', f: 3500 }); },
    // 점수: 삐익 + (이긴 쪽이 사람이면) 와아 + 기쁜 야옹
    point(t, o, S) {
      whistle(S, t, 0.2, 0.09); whistle(S, t + 0.26, 0.32, 0.09);
      if (o.cheer) cheer(S, t + 0.1, 0.13);
      mew(S, t + 0.45, { base: 880, dur: 0.26, vol: 0.17, up: 1.5 });
    },
    // 상대 점수 (사람이 졌을 때): 삐익 + 시무룩 므르
    pointLost(t, o, S) {
      whistle(S, t, 0.2, 0.08); whistle(S, t + 0.26, 0.3, 0.08);
      mew(S, t + 0.5, { base: 470, dur: 0.42, vol: 0.16, up: 1.1, end: 0.7 });
    },
    matchWin(t, o, S) {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => S.tone(t + i * 0.1, f, 0.22, { type: 'triangle', vol: 0.15 }));
      S.tone(t + 0.4, N.E6, 0.45, { vol: 0.08 });
      cheer(S, t + 0.05, 0.16);
      mew(S, t + 0.5, { base: 880, dur: 0.24, vol: 0.18 }); mew(S, t + 0.8, { base: 1000, dur: 0.32, vol: 0.18, up: 1.5 });
    },
    matchLose(t, o, S) {
      [N.G5, N.E5, N.C5].forEach((f, i) => S.tone(t + i * 0.14, f, 0.2, { type: 'triangle', vol: 0.11 }));
      mew(S, t + 0.45, { base: 520, dur: 0.6, vol: 0.17, up: 1.15, end: 0.62 });
    },
    start(t, o, S) { [N.C5, N.E5, N.G5].forEach((f, i) => S.tone(t + i * 0.08, f, 0.16, { type: 'triangle', vol: 0.12 })); mew(S, t + 0.26, { base: 900, dur: 0.24, vol: 0.15 }); },
    meow(t, o, S) { mew(S, t, { base: o.base || 880, dur: 0.26, vol: 0.17, up: 1.5 }); },
  };
  for (const [k, fn] of Object.entries(SOUNDS)) sfx.add('vb_' + k, fn);

  // 코어 일 → 소리. human = 사람이 조종하는 쪽 [true, false] (AI 구경이면 둘 다 false)
  function onEvents(evs, human) {
    const P = (n, o) => sfx.play('vb_' + n, o);
    for (const e of evs) {
      switch (e.t) {
        case 'hit': if (e.kind === 'smash') P('thwack', { perfect: e.perfect }); else if (e.kind === 'dig') P('dig'); else P('boing', { p: Math.min(1, (e.v || 8) / 16) }); break;
        case 'jump': P('hop'); break;
        case 'swing': P('swish'); break;
        case 'dive': P('dive'); break;
        case 'land': if (e.v > 10 && !e.dive) P('thud'); break;
        case 'wall': if (e.v > 2) P('knock'); break;
        case 'net': if (e.v > 1.5) P('net'); break;
        case 'floor': P('sand', { big: !!e.point }); break;
        case 'serve': P('whistle'); break;
        case 'heat': if (e.n === window.Volley.C.HEAT_FROM + 1) P('heat'); break;
        case 'point': {
          const any = human[0] || human[1];
          if (!any || human[e.w]) P('point', { cheer: true }); else P('pointLost');
          break;
        }
      }
    }
  }
  window.VolleySound = { onEvents, play: (n, o) => sfx.play('vb_' + n, o), SOUNDS };
})();

/* 땅따먹기 소리 — 공통 Cozy.sfx 에 이 게임 소리를 더함 (파일 없이 Web Audio 로 만듦)
   쓰기: Cozy.sfx.play('land-cap', { pct: 3.4 }) · 켬/끔은 Cozy.sfx 하나로 사이트 전체가 같이 */
(function () {
  'use strict';
  if (!window.Cozy || !Cozy.sfx) return;
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  const st = semi => Math.pow(2, semi / 12);
  const add = (n, f) => Cozy.sfx.add(n, f);

  // 땅 먹기: 클수록 높게 시작하고 음이 많아짐 (도레미솔라 사다리)
  add('land-cap', (t, o, S) => {
    const pct = o.pct || 0.5;
    const lift = Math.min(12, Math.log2(1 + pct * 3) * 3.2);
    const base = 523.25 * st(Math.round(lift));
    const n = Math.min(6, 2 + Math.floor(Math.log2(1 + pct * 1.5)));
    for (let i = 0; i < n; i++) S.tone(t + i * 0.055, base * st(PENTA[i]), 0.2, { type: 'triangle', vol: 0.085 - i * 0.006 });
    S.tone(t + n * 0.055, base * st(PENTA[n] + 12), 0.3, { vol: 0.035 });
    if (pct >= 4) for (const s2 of [0, 4, 7]) S.tone(t + 0.02, base * st(s2 - 12), 0.5, { vol: 0.03, attack: 0.03 });
  });
  // 다른 친구 땅 먹기 (가까울 때 작은 톡)
  add('land-pop', (t, o, S) => { S.tone(t, 660, 0.08, { type: 'triangle', vol: 0.025 }); S.tone(t + 0.05, 880, 0.08, { type: 'triangle', vol: 0.02 }); });
  add('land-leave', (t, o, S) => { S.tone(t, 430, 0.07, { vol: 0.035, f2: 300 }); });
  add('land-splat', (t, o, S) => {
    const v = o.vol || 0.2;
    S.noise(t, 0.26, { vol: v, type: 'lowpass', f: 2200, f2: 260, q: 1.2 });
    S.tone(t, 170, 0.2, { vol: v * 0.6, f2: 55 });
  });
  // 내가 남의 선을 끊음: 반짝 두 음 + 철퍽
  add('land-kill', (t, o, S) => {
    S.tone(t, 784, 0.12, { type: 'square', vol: 0.035 }); S.tone(t + 0.07, 1175, 0.18, { type: 'square', vol: 0.035 });
    S.tone(t + 0.07, 1568, 0.25, { vol: 0.03 });
    S.noise(t, 0.24, { vol: 0.2, type: 'lowpass', f: 2200, f2: 260, q: 1.2 });
  });
  // 내가 아웃: 피유~ + 철퍽
  add('land-die', (t, o, S) => {
    S.tone(t, 760, 0.5, { type: 'triangle', vol: 0.08, f2: 160 });
    S.tone(t + 0.02, 380, 0.5, { vol: 0.05, f2: 90 });
    S.noise(t + 0.04, 0.3, { vol: 0.26, type: 'lowpass', f: 2200, f2: 240, q: 1.2 });
  });
  add('land-spawn', (t, o, S) => { S.tone(t, 330, 0.26, { vol: 0.06, f2: 990 }); S.tone(t + 0.18, 1318.5, 0.18, { type: 'triangle', vol: 0.04 }); });
  add('land-danger', (t, o, S) => { S.tone(t, 1046.5, 0.07, { type: 'square', vol: 0.022 }); S.tone(t + 0.11, 1046.5, 0.07, { type: 'square', vol: 0.022 }); });
  // 시간 끝: 호루라기 두 번
  add('land-whistle', (t, o, S) => { for (const d of [0, 0.22]) { S.tone(t + d, 2093, 0.16, { vol: 0.06 }); S.tone(t + d, 2140, 0.16, { vol: 0.035 }); } });
  add('land-win', (t, o, S) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => S.tone(t + i * 0.11, f, 0.26, { type: 'triangle', vol: 0.09 }));
    for (const f of [523.25, 659.25, 783.99]) S.tone(t + 0.46, f * 2, 0.7, { vol: 0.03, attack: 0.02 });
    S.tone(t + 0.46, 1046.5, 0.8, { type: 'triangle', vol: 0.055 });
  });
})();

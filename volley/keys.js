/* 냥냥 배구 — 한 기기(PC 키보드) 여럿이 할 때 자리별 키 묶음
   자리 = 고양이 번호 (0·2 왼쪽 편, 1·3 오른쪽 편). 키보드 위치도 왼쪽 편은 왼손 쪽, 오른쪽 편은 오른손 쪽
     고양이 0 (왼쪽 ①) W A D + S 스매시      (사람이 이 자리만 쓰면 F·G·Space 도 스매시)
     고양이 2 (왼쪽 ②) T F H + G 스매시
     고양이 3 (오른쪽 ②) I J L + K 스매시 · 숫자판 8 4 6 + 5 도 같음
     고양이 1 (오른쪽 ①) ↑ ← → + ↓ / Enter 스매시
   멀리 떨어진 묶음끼리라 키보드 고스팅(동시에 여러 키가 안 먹는 것)이 덜함 — 같은 묶음 안 3키 + 다른 묶음 동시는 대부분 키보드에서 됨
   VolleyKeys.build(humanCats) → { map: { 'KeyW': [cat, bit] … }, sets: { cat: { label, keys: [이동왼,이동오,점프,스매시] } } } (화면 없이 Node 에서도 씀) */
(function (root) {
  'use strict';
  const L = 1, R = 2, J = 4, S = 8;
  const SETS = {
    0: { label: 'WASD', show: ['A', 'D', 'W', 'S'], keys: { KeyA: L, KeyD: R, KeyW: J, KeyS: S }, extra: { KeyF: S, KeyG: S, Space: S } },
    2: { label: 'TFGH', show: ['F', 'H', 'T', 'G'], keys: { KeyF: L, KeyH: R, KeyT: J, KeyG: S }, extra: {} },
    3: { label: 'IJKL', show: ['J', 'L', 'I', 'K'], keys: { KeyJ: L, KeyL: R, KeyI: J, KeyK: S, Numpad4: L, Numpad6: R, Numpad8: J, Numpad5: S }, extra: {} },
    1: { label: '방향키', show: ['←', '→', '↑', '↓'], keys: { ArrowLeft: L, ArrowRight: R, ArrowUp: J, ArrowDown: S, Enter: S, NumpadEnter: S }, extra: { Slash: S } },
  };
  // 사람 자리들 → 키 표. 남는 키(extra)는 다른 사람 자리와 안 겹칠 때만
  function build(humanCats) {
    const map = {}, sets = {};
    for (const k of humanCats) { const st = SETS[k]; if (!st) continue; sets[k] = st; for (const c in st.keys) map[c] = [k, st.keys[c]]; }
    for (const k of humanCats) { const st = SETS[k]; if (!st) continue; for (const c in st.extra) if (!map[c]) map[c] = [k, st.extra[c]]; }
    return { map, sets };
  }
  const API = { SETS, build, BITS: { L, R, J, S } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VolleyKeys = API;
})(this);

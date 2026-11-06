/* 고스톱 AI 일꾼 — 무거운 🐯 계산(끝까지 둬 보기)을 화면 밖에서 해서 화면이 멈추지 않게
   받는 것: { id, view, tier, seed, ms, style(타짜 이름), peek } (view = 그 AI 에게 보이는 것만 · peek 이면 👹 반칙 보스가 몰래 본 온전한 상태) → 돌려줌: { id, a } */
importScripts('core.js?v=16', 'ai.js?v=11');
self.onmessage = e => {
  const { id, view, tier, seed, ms, style, peek } = e.data || {};
  let a = -1;
  try { a = self.GostopAI.choose(view, tier, { seed, ms, style, peek }); } catch (err) { a = -1; }
  self.postMessage({ id, a });
};

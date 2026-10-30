/* 고스톱 AI 일꾼 — 무거운 🐯 계산(끝까지 둬 보기)을 화면 밖에서 해서 화면이 멈추지 않게
   받는 것: { id, view, tier, seed, ms } (view = 그 AI 에게 보이는 것만) → 돌려줌: { id, a } */
importScripts('core.js?v=5', 'ai.js?v=5');
self.onmessage = e => {
  const { id, view, tier, seed, ms } = e.data || {};
  let a = -1;
  try { a = self.GostopAI.choose(view, tier, { seed, ms }); } catch (err) { a = -1; }
  self.postMessage({ id, a });
};

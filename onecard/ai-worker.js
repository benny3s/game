/* 원카드 AI 일꾼 — 무거운 🐯 계산(숨은 카드 섞어 끝까지 둬 보기)을 화면 밖에서 해서 화면이 멈추지 않게
   받는 것: { id, view, tier, seed, ms } (view = 그 AI 에게 보이는 것만) → 돌려줌: { id, a } (tier 'coach' 면 a = { a, base, gain, n }) */
importScripts('core.js?v=3', 'ai.js?v=4');
self.onmessage = e => {
  const { id, view, tier, seed, ms } = e.data || {};
  let a = -1;
  try {
    if (tier === 'coach') a = self.OneCardAI.chooseHard(view, { seed, ms: ms || 260, samples: 3000, detail: true, z: 2 });   // 선생님: 자세한 결과
    else a = self.OneCardAI.choose(view, tier, { seed, ms: ms || 320, samples: 2000 });
  } catch (err) { a = -1; }
  self.postMessage({ id, a });
};

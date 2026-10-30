/* 오목 AI 워커 — 수 읽기는 여기서 (화면이 멈추지 않게). 받는 것 { id, state, opts } → 보내는 것 { id, res } */
importScripts('core.js?v=1', 'ai.js?v=1');
self.onmessage = e => {
  const { id, state, opts } = e.data || {};
  let res;
  try { res = OmokAI.think(state, opts || {}); } catch (err) { res = { move: -1, kind: 'error', error: String(err && err.message || err) }; }
  self.postMessage({ id, res });
};

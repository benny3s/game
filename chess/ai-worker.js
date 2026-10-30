/* 체스 AI 워커 — 수 읽기는 여기서 (화면이 멈추지 않게). 받는 것 { id, game: { start, moves }, opts } → 보내는 것 { id, res } */
importScripts('ai.js?v=1');
self.onmessage = e => {
  const { id, game, opts } = e.data || {};
  let res;
  try { res = ChessAI.think(game, opts || {}); } catch (err) { res = { move: null, error: String(err && err.message || err) }; }
  self.postMessage({ id, res });
};

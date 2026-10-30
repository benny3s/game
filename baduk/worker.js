/* 바둑 AI 워커: 신경망(KataGo b6c96)·수읽기를 화면과 따로 돌려 화면이 멈추지 않게
   받는 것: { id, kind: "move"|"hint"|"analyze"|"dead", state(toJSON), opt }  →  보냄: { id, ok, res } · 처음 { type:"ready", nn } */
importScripts("vendor/goscorer.js?v=1", "core.js?v=2", "nn.js?v=2", "ai.js?v=1");
let wasm = false;
const ready = (async () => {
  try {
    const r = await fetch("model/b6c96.bkn?v=1");
    if (!r.ok) throw new Error("모델 " + r.status);
    const m = BadukNN.loadModel(await r.arrayBuffer());
    wasm = !!m.wasm;
    BadukAI.setModel(m);
    return true;
  } catch (e) { return false; }
})();
ready.then(nn => postMessage({ type: "ready", nn, wasm }));
onmessage = async e => {
  const { id, kind, state, opt = {} } = e.data || {};
  if (kind == null) return;
  await ready;
  try {
    const st = Baduk.fromJSON(state);
    let res;
    if (kind === "move") res = BadukAI.chooseMove(st, opt);
    else if (kind === "hint") res = BadukAI.hint(st, opt);
    else if (kind === "analyze" || kind === "dead") {
      const g = BadukAI.guessDead(st, opt), a = g.analysis;
      res = { dead: Array.from(g.dead), own: Array.from(a.own), leadB: a.leadB, winB: a.winB, top: a.top, source: a.source };
    }
    postMessage({ id, ok: true, res });
  } catch (err) { postMessage({ id, ok: false, err: String(err && err.stack || err) }); }
};

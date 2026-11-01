/* 체스 AI 선생님 '상대 수 읽기' — 화면과 상관없는 순수 함수 (Node 시험도 같은 코드: 브라우저는 전역 ChessRead, Node 는 require)
   대국 중 내 차례에 상대가 방금 둔 수를, 복기 '🤔 노린 것'과 같은 계산(ChessAI.intent)으로 읽어 말로 바꿈:
     formLine   📊 형세 한 줄 (선생님이 읽은 값 → '내가 폰 1.2개만큼 앞서요' + 지난 차례와 달라진 점)
     oppRead    👀 intent 결과 → { 한 일(과거), 다음 노림(있으면), 체크 여부 }
     threatNote 👉 추천 수가 그 노림을 막는지 · 받지 않고 더 급한 일을 하는지 한 줄 */
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else root.ChessRead = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MATE_CP = 20000;
  const CNAME = { w: '백', b: '흑' };
  // 뚜렷한 노림으로 칠 수 (main.js 복기의 TACTIC 과 같게) · 추천이 이런 수면 '노림보다 급해요' 라고 말할 수 있음
  const TACTIC = new Set(['mate', 'mateIn', 'promote', 'fork', 'win', 'pin', 'check', 'threat']);
  const SHARP = new Set(['win', 'fork', 'promote', 'pin', 'check']);

  // 📊 형세: r = { score(지금 둘 쪽 기준 cp), mate(+n 이기는 수 / -n 지는 수) }, c = 지금 둘 쪽 'w'|'b'
  //   o.duo = 둘이서 (내/상대 대신 백·흑) · o.prev = 내 지난 차례 때의 { score, mate } (있으면 달라진 폭을 덧붙임)
  function formLine(r, c, o) {
    o = o || {};
    const me = o.duo ? `${CNAME[c]}이` : '내가', foe = o.duo ? `${CNAME[c === 'w' ? 'b' : 'w']}이` : '상대가';
    if (r.mate) return r.mate > 0 ? `${me} ${r.mate}수 안에 메이트할 수 있어요!` : `${foe} ${-r.mate}수 안에 메이트할 수 있어요 — 조심!`;
    const w = r.score, a = Math.abs(w);
    let t = a < 35 ? '팽팽해요 (비슷해요)' : `${me} 폰 ${(a / 100).toFixed(1)}개만큼 ${a >= 300 ? '크게 ' : ''}${w > 0 ? '앞서요' : '뒤져요'}`;
    const p = o.prev;
    if (p && !p.mate && Math.abs(p.score) < MATE_CP && a < MATE_CP) {
      const d = (w - p.score) / 100;
      if (Math.abs(d) >= 0.6) t += ` (지난 차례 ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)})`;
    }
    return t;
  }

  // 👀 it = ChessAI.intent(상대가 두기 전 판, 상대 수, { my, skipScore, reply }) 결과 · r = 선생님 추천 { move, score, mate }
  //   sanOf(fen, uci) = 그 판에서 그 수의 기보 글자 (ChessCore.sanLine 으로)
  //   → { done: 방금 한 일, threat: { from, to, san, text, kind, mate, after } | null, check } | null (읽지 못함)
  //   다음 노림은 뚜렷할 때만: 메이트 위협이거나, 한 번 더 두면 내 최선보다 1점(폰 하나) 넘게 나아지는 전술 (그저 자리 좋은 수는 말하지 않음)
  function oppRead(it, r, sanOf) {
    if (!it || it.error || !it.why || !it.why.opp || !it.why.opp.done) return null;
    const th = it.threat, base = -r.score;
    let threat = null;
    if (th && th.move && !(r.mate > 0) && (th.mate > 0 || (th.why && TACTIC.has(th.why.kind) && th.score - base >= 100))) {
      const text = th.mate > 0 ? '메이트 위협' : th.why && th.why.opp && th.why.opp.next;
      if (text) {
        let san = th.move; try { san = (sanOf && sanOf(th.fen, th.move)) || th.move; } catch (e) {}
        threat = { from: th.move.slice(0, 2), to: th.move.slice(2, 4), san, text, kind: th.why ? th.why.kind : '', mate: th.mate || 0, after: th.after || null };
      }
    }
    return { done: it.why.opp.done, threat, check: !!it.check };
  }

  // 👉 추천 수(r = { move, why }) 와 상대 노림(T) 사이: 막는 수 · 피하는 수 · 노림을 하려던 기물을 잡는 수 · 받지 않고 더 급한 일 · (해당 없으면 '')
  //   T.after = 내가 추천 수를 둔 뒤에도 그 노림이 통하나 (판 위 사실로만 확인 — ChessAI.intent 의 reply)
  function threatNote(r, T, lab) {
    if (!T || !r || !r.move) return '';
    const nm = `상대 노림(${lab ? lab(T.san) : T.san})`, f = r.move.slice(0, 2), t = r.move.slice(2, 4), a = T.after;
    if (t === T.from) return `${nm}을 하려던 기물을 바로 잡아요`;
    if (!a) return '';
    if (a.legal && T.mate > 1) return '';                              // 둘 수 넘게 걸리는 메이트 위협은 판 위 사실만으론 못 가림
    const dead = !a.legal || (T.mate === 1 ? a.kind !== 'mate' : !TACTIC.has(a.kind));
    if (dead) return f === T.to ? `${nm}에 걸린 기물을 피하는 수예요` : `${nm}을 막는 수예요`;
    return r.why && SHARP.has(r.why.kind) ? `${nm}보다 이 수가 더 급해요` : '';
  }

  // 추천 까닭이 이미 '피해요·지켜요' 라면 막는 수 한 줄과 겹침 → 그땐 한 줄로 (창이 길어지지 않게)
  const overlaps = r => !!(r && r.why && (r.why.kind === 'escape' || r.why.kind === 'defend'));

  return { formLine, oppRead, threatNote, overlaps, TACTIC, SHARP };
});

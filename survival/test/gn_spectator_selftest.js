// 더 지니어스 구경꾼 view(-1) 시험 — 숨은 패 · 고른 것 · 비밀 코드를 못 봐야 함 (node survival/test/gn_spectator_selftest.js)
'use strict';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mk = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// AI 가 끝까지 두는 동안 매 결정 직전에 구경꾼 view(-1) 를 검사
function walk(id, init, check, seeds) {
  const G = require(`../games/${id}/core.js`);
  let steps = 0;
  for (const seed of seeds || [3, 8]) {
    const st = G.init(Object.assign({ seed }, init)), rr = mk(seed * 7 + 1);
    let guard = 0;
    while (!G.over(st) && guard++ < 4000) {
      const nd = G.needs(st);
      if (!nd.length) { G.advance(st); continue; }
      const V = G.view(st, -1), A = G.view(st, 'all');
      let msg = null; try { msg = check(V, st, A); } catch (e) { msg = 'throw ' + e.message; }
      if (msg) { ok(false, `${id} 구경꾼 view(-1): ${msg}`); return; }
      steps++;
      const s = nd[0], a = G.ai(G.view(st, s), s, 'normal', rr);
      const r = G.apply(st, s, a); if (!r.ok) G.apply(st, s, G.legal(st, s)[0]);
    }
    if (check.final) { const m = check.final(G.view(st, -1), st); if (m) { ok(false, `${id} 끝난 뒤: ${m}`); return; } }
  }
  ok(steps > 20, `${id} 구경꾼 시험이 충분히 돌았어요 (${steps})`);
  ok(true, id);
}
const nn = x => x === null || x === undefined;
walk('gn-betrps', { n: 2 }, (V, st) => (!nn(V.acts) ? 'acts 보임' : !nn(V.mine) ? 'mine' : V.hint !== -1 ? 'hint 보임' : !V.virtual && V.phase !== 'reveal' && V.phase !== 'end' && V.mark !== -1 ? '표식 보임' : null));
walk('gn-howmuch', { n: 3 }, (V, st) => (!nn(V.priv) ? 'priv(내 정보 답) 보임' : !nn(V.bids) ? 'bids 보임' : !nn(V.prices) ? 'prices 보임' : null));
walk('gn-miner', { n: 9 }, (V, st) => (!nn(V.bids) ? 'bids 보임' : V.phase === 'bid' && V.mineBid !== null ? 'mineBid' : null));
walk('gn-openpass', { n: 3, cfg: { gar: 4 } }, (V, st) => (V.phase === 'buy' && V.buys.some(b => b !== null) ? 'buys 보임' : !nn(V.mineSub) || !nn(V.mineBuy) ? '내 제출 보임' : (!nn(V.decks) && !st.over) ? 'decks 보임' : null));
walk('gn-stars', { n: 4 }, (V, st) => (!nn(V.cards) ? 'cards 보임' : !nn(V.mine) ? 'mine' : null));
walk('gn-truth', { n: 2 }, (V, st) => (!st.over && !nn(V.codes) ? '비밀 코드 보임' : !nn(V.myCode) ? 'myCode' : null));
walk('gn-holdem', { n: 2 }, (V, st) => (V.phase === 'bet' && V.cards.some(c => c !== -1) ? '카드 보임' : null));
walk('gn-indian', { n: 2 }, (V, st) => (V.phase === 'bet' && V.cards.some(c => c !== -1) ? '카드 보임' : null));
walk('gn-quattro', { n: 2 }, (V, st) => (!st.over && !nn(V.hands) ? 'hands 보임' : (V.mine.concat(V.opp)).some(x => !x.o && x.c !== null) ? '안 연 카드 보임' : null));
walk('gn-twoface', { n: 2 }, (V, st) => {
  if (V.phase === 'bet') { for (const c of V.cards) if (c.f !== -1 || c.b !== -1) return '카드 면 보임'; }
  return null;
});
console.log(`gn 구경꾼 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

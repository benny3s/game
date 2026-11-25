// 진실탐지기 규칙 시험 (node survival/test/gn-truth_selftest.js)
// 질문 계산 · 거짓 답 규칙 · 진실 페널티(숫자 공개) · 아이템 4종(선 · 면제 · 더블 턴 · 무효화) · 정답 시도 · 숨은 정보 · 후보 추리 · AI 무작위 판
'use strict';
const G = require('../games/gn-truth/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
const P = G.parse;
const R = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 8) / 16777216; }; };
const mk = (c0, c1, cfg) => { const st = G.init({ n: 2, seed: 5, cfg: Object.assign({ first: 0 }, cfg || {}) }); ap(st, 0, { t: 'code', code: c0 }); ap(st, 1, { t: 'code', code: c1 }); return st; };

// 1) 질문 계산 (방송 값: 이상민 1928 · 임요환 5841)
{
  const a = P('1928'), b = P('5841'), c = P('1111');
  const E = (q, x) => G.evalQ(q, x);
  ok(E({ k: 'sum' }, a) === 20 && E({ k: 'sum' }, b) === 18, '합: 1928 = 20 · 5841 = 18');
  ok(E({ k: 'max' }, a) === 9 && E({ k: 'min' }, a) === 1 && E({ k: 'max' }, b) === 8 && E({ k: 'min' }, b) === 1, '가장 큰 · 작은 숫자');
  ok(E({ k: 'par', i: 0 }, a) === false && E({ k: 'par', i: 2 }, a) === true, '짝수 질문');
  ok(E({ k: 'has', d: 9 }, a) === true && E({ k: 'has', d: 5 }, a) === false, '포함 질문');
  ok(E({ k: 'cnt', d: 1 }, c) === 4 && E({ k: 'cnt', d: 9 }, a) === 1 && E({ k: 'cnt', d: 0 }, a) === 0, '몇 번 나오나');
  ok(E({ k: 'dist' }, a) === 4 && E({ k: 'dist' }, c) === 1 && E({ k: 'ev' }, a) === 2 && E({ k: 'ev' }, b) === 2, '서로 다른 숫자 · 짝수 개수');
  ok(E({ k: 'pair', i: 0, j: 3 }, a) === 9 && E({ k: 'digit', i: 3 }, a) === 8, '두 자리의 합 · 자리 숫자');
  ok(E({ k: 'cmp', i: 1, j: 0 }, a) === true && E({ k: 'cmp', i: 0, j: 1 }, a) === false && E({ k: 'eq', i: 0, j: 1 }, c) === true && E({ k: 'eq', i: 0, j: 1 }, a) === false, '크기 비교 · 같은지');
  ok(E({ k: 'gt', i: 1, d: 8 }, a) === true && E({ k: 'gt', i: 1, d: 8 }, b) === false && E({ k: 'sumge', t: 20 }, a) === true && E({ k: 'sumge', t: 21 }, a) === false, '보다 큰가 · 합이 이상인가');
  ok(!G.qValid({ k: 'digit', i: 4 }) && !G.qValid({ k: 'pair', i: 2, j: 1 }) && !G.qValid({ k: 'cmp', i: 1, j: 1 }) && !G.qValid({ k: 'gt', i: 0, d: 9 }) && !G.qValid({ k: 'sumge', t: 0 }) && !G.qValid({ k: 'zzz' }) && !G.qValid(null), '잘못된 질문은 거절');
  ok(G.QLIST.every(G.qValid), '질문 목록이 전부 올바른 질문');
  ok(G.QLIST.every(q => G.qText(q).length > 3), '질문 글이 전부 있어요');
}
// 2) 시작 · 코드 입력 · 선 (판 a: 선 + 면제 vs 더블 + 무효화)
{
  const st = G.init({ n: 2, seed: 5, cfg: { first: 0 } });
  ok(G.needs(st).join() === '0,1' && st.phase === 'code', '처음엔 둘 다 패스워드를 정해요');
  ok(!G.apply(st, 0, { t: 'code', code: '12a4' }).ok && !G.apply(st, 0, { t: 'code', code: '123' }).ok, '4자리 숫자가 아니면 거절');
  ok(ap(st, 0, { t: 'code', code: '5841' }).ok, '0번 5841');
  ok(G.needs(st).join() === '1', '1번만 남음');
  const V0 = G.view(st, 1); ok(V0.myCode === null && V0.codes === null, '상대 패스워드는 안 보여요');
  ok(ap(st, 1, { t: 'code', code: '1928' }).ok && st.phase === 'ask' && st.turn === 0, '둘 다 정하면 선 플레이어(0번)부터');
  const V = G.view(st, 0);
  ok(V.items.first === 0 && V.items.ex[0] === 1 && V.items.dbl[1] === 1 && V.items.nul[1] === 1 && V.items.dbl[0] === 0, '판 a: 0번 = 선 + 면제 · 1번 = 더블 + 무효화');
  ok(V.myCode === '5841' && V.codes === null, '내 패스워드만 보여요');
  const b = mk('5841', '1928', { ver: 'b' });
  ok(b.have.ex.every(x => !x) && b.have.dbl.every(x => !x) && b.have.nul.every(x => !x), '판 b: 아이템 없음');
}
// 3) 질문 → 거짓 답 · 진실 페널티 (숫자 공개)
{
  const st = mk('5841', '1928');
  ok(ap(st, 0, { t: 'ask', q: { k: 'par', i: 1 } }).ok && st.phase === 'answer' && G.needs(st).join() === '1', '0번이 질문 → 1번이 답해요');
  ok(!G.apply(st, 0, { t: 'ask', q: { k: 'sum' } }).ok, '질문한 사람은 답 차례가 아니에요');
  ok(!G.apply(st, 1, { t: 'answer', v: 3 }).ok, '예 / 아니오 질문에 숫자로는 못 답해요');
  // 1928 의 2번째 숫자 9 는 짝수가 아님(사실 = 아니오) → '예' 가 거짓
  ok(ap(st, 1, { t: 'answer', v: true }).ok, '거짓으로 답함 (예)');
  const e = st.hist[0];
  ok(e.rang === false && e.rev === null, '탐지기가 안 울리고 공개도 없어요');
  ok(st.turn === 1 && st.phase === 'ask', '답이 끝나면 턴이 넘어가요');
  // 1번이 질문, 0번이 진실로 답함 (5841 의 합 = 18, 거짓이 아닌 18 로 답)
  ap(st, 1, { t: 'ask', q: { k: 'sum' } });
  ok(!G.apply(st, 0, { t: 'answer', v: 40 }).ok, '범위 밖의 답은 거절');
  ap(st, 0, { t: 'answer', v: 18 });
  ok(G.view(st, 1).hist[1].rang === true, '진실을 말하면 탐지기가 울려요');
  ok(st.phase === 'nul' && G.needs(st).join() === '1', '0번은 면제가 있고 1번은 무효화가 있어서 → 1번이 무효화를 쓸지 정해요');
  ap(st, 1, { t: 'nullify', use: false });
  ok(st.used.ex[0] === 1 && st.hist[1].exu === true && st.hist[1].rev === null, '무효화를 안 쓰면 면제가 쓰여서 숫자 공개 없음');
  ok(st.turn === 0 && st.phase === 'ask', '그 뒤 턴이 넘어감');
  // 진실 페널티 (면제는 이미 씀) → 숫자 공개
  ap(st, 0, { t: 'ask', q: { k: 'max' } });
  ap(st, 1, { t: 'answer', v: 9 });   // 1928 의 최대는 9 = 진실
  const e2 = st.hist[2];
  ok(e2.rang === true && e2.rev !== null && ![1, 9, 2, 8].includes(e2.rev), `1번의 패스워드에 안 쓰인 숫자(${e2.rev}) 하나가 0번에게 공개`);
  ok(st.known[1].join() === String(e2.rev) && G.view(st, 0).known[1].includes(e2.rev), '공개된 숫자는 기록에 남아요');
  // 이미 공개된 숫자는 다음 진실 페널티에서 또 나오지 않아요
  const st2 = mk('5841', '1111', { ver: 'b' });
  const seen = [];
  for (let t = 0; t < 6; t++) {
    ap(st2, 0, { t: 'ask', q: { k: 'max' } }); ap(st2, 1, { t: 'answer', v: 1 });      // 진실 (1111 의 최대 = 1)
    seen.push(st2.hist[st2.hist.length - 1].rev);
    ap(st2, 1, { t: 'ask', q: { k: 'max' } }); ap(st2, 0, { t: 'answer', v: 0 });      // 거짓 (5841 의 최대는 8)
  }
  ok(seen.every(d => d !== null && d !== 1) && new Set(seen).size === 6, `공개된 숫자 6개가 모두 다름 (${seen.join(',')})`);
}
// 4) 무효화 사용 · 면제 무력화
{
  const st = mk('5841', '1928');
  ap(st, 0, { t: 'ask', q: { k: 'digit', i: 0 } }); ap(st, 1, { t: 'answer', v: 3 });   // 1 이 아님 = 거짓
  ap(st, 1, { t: 'ask', q: { k: 'sum' } }); ap(st, 0, { t: 'answer', v: 18 });          // 진실 → 무효화 차례
  ok(st.phase === 'nul', '무효화 차례');
  ap(st, 1, { t: 'nullify', use: true });
  ok(st.used.nul[1] === 1 && st.used.ex[0] === 1 && st.hist[1].nul === true, '무효화 사용 → 면제도 소모');
  ok(st.hist[1].rev !== null && ![5, 8, 4, 1].includes(st.hist[1].rev), '면제가 무효화돼서 숫자 하나 공개');
  ok(st.turn === 0, '턴이 넘어감');
  ok(!G.apply(st, 1, { t: 'item', item: 'double' }).ok, '남의 턴엔 아이템을 못 써요');
}
// 5) 더블 턴 (질문 2개 · 질문 + 정답) · 면제 아이템이 없는 쪽은 못 씀
{
  const st = mk('5841', '1928');
  ok(!G.apply(st, 0, { t: 'item', item: 'double' }).ok, '더블 턴이 없으면 못 써요');
  ap(st, 0, { t: 'ask', q: { k: 'par', i: 0 } }); ap(st, 1, { t: 'answer', v: true });   // 1928 의 첫 자리 1 은 홀수 → '예' 는 거짓
  ok(st.turn === 1 && st.acts === 1, '1번 턴 시작');
  ok(ap(st, 1, { t: 'item', item: 'double' }).ok, '더블 턴 선언 (0번은 무효화가 없어서 바로 적용)');
  ok(st.acts === 2 && st.doubled && st.used.dbl[1] === 1, '이번 턴 질문 2개');
  ok(!G.apply(st, 1, { t: 'item', item: 'double' }).ok, '한 번뿐');
  ap(st, 1, { t: 'ask', q: { k: 'has', d: 4 } }); ap(st, 0, { t: 'answer', v: false });   // 5841 에는 4 가 있음 → '아니오' 는 거짓
  ok(st.turn === 1 && st.phase === 'ask' && st.acts === 1, '첫 질문이 끝나도 같은 턴 (두 번째 질문)');
  ap(st, 1, { t: 'guess', code: '0000' });
  ok(st.turn === 0 && !st.over && st.hist[st.hist.length - 1].ok === false, '틀린 정답 시도 → 턴 종료 (페널티 없음)');
  ok(st.acts === 1 && !st.doubled, '새 턴은 질문 1번');
  ap(st, 0, { t: 'guess', code: '1928' });
  ok(st.over && st.winner === 0 && G.ranks(st).join() === '0,1', '정확히 맞히면 승리');
  ok(G.view(st, 1).codes.join() === '5841,1928', '끝나면 두 패스워드가 공개');
  ok(!G.apply(st, 1, { t: 'ask', q: { k: 'sum' } }).ok, '끝난 뒤엔 못 해요');
}
// 6) 판 b · 총 행동 상한 · 정답 시도 입력 검증
{
  const st = mk('5841', '1928', { ver: 'b' });
  ok(st.turn === 0, '판 b 선은 cfg 선');
  ok(!G.apply(st, 0, { t: 'guess', code: '58' }).ok && !G.apply(st, 0, { t: 'guess', code: 'abcd' }).ok, '정답 시도도 4자리 숫자');
  for (let i = 0; i < G.LIMIT; i++) { if (st.over) break; ap(st, st.turn, { t: 'guess', code: i % 2 ? '0001' : '0002' }); }
  ok(st.over && st.draw && G.ranks(st).join() === '0,0', '행동이 상한을 넘으면 무승부');
}
// 7) 숨은 정보: 상대 패스워드가 달라도 내 시점 · AI · 선생님은 같아요
{
  const a = mk('5841', '1928'), b = mk('5841', '0000');
  ok(G.view(a, 0).pub === G.view(b, 0).pub, '상대 패스워드가 달라도 공개 지문이 같아요');
  for (const tier of ['easy', 'normal', 'hard']) {
    const x = G.ai(G.view(a, 0), 0, tier, R(9)), y = G.ai(G.view(b, 0), 0, tier, R(9));
    ok(JSON.stringify(x) === JSON.stringify(y), `${tier} AI 는 상대 패스워드를 몰라요`);
  }
  ok(JSON.stringify(G.coach(G.view(a, 0), 0, 0, null)) === JSON.stringify(G.coach(G.view(b, 0), 0, 0, null)), '선생님도 상대 패스워드를 몰라요');
  const c = G.coach(G.view(a, 0), 0, 0, null); ok(c.opp.length > 2 && c.mine.length > 2 && c.rec.length > 2, '선생님 말이 비어 있지 않아요');
  // 답하는 쪽 선생님: 내 패스워드로 진실을 알려 줘요
  ap(a, 0, { t: 'ask', q: { k: 'has', d: 9 } });
  const ca = G.coach(G.view(a, 1), 1, 0, null);
  ok(ca.rec.includes('아니오') && ca.why.includes('예'), `답하는 쪽 선생님: 9 가 들어 있어서(진실 예) → "아니오"라고 거짓말 (${ca.rec})`);
}
// 8) 후보 추리: 거짓 답 규칙대로 좁혀도 진짜 패스워드는 항상 후보에 남아요
{
  let bad = 0, steps = 0, shrink = 0;
  for (let g = 0; g < 14; g++) {
    const rr = R(g * 3 + 1), st = G.init({ n: 2, seed: 70 + g, cfg: { ver: g % 2 ? 'a' : 'b' } });
    let guard = 0;
    while (!G.over(st) && guard++ < 500) {
      const nd = G.needs(st);
      for (const seat of nd.slice()) {
        if (!G.needs(st).includes(seat)) continue;
        const V = G.view(st, seat), a = G.ai(V, seat, ['easy', 'normal', 'hard'][(seat + g) % 3], rr);
        const r = G.apply(st, seat, a || G.legal(st, seat)[0]); if (!r.ok) { ok(false, `AI 거절 ${JSON.stringify(a)}`); }
        if (st.phase !== 'code' && st.codes[0] !== null && st.codes[1] !== null) {
          for (const me of [0, 1]) { const C = G.candidates(G.view(st, me), me); steps++; if (!C.some(c => c.join('') === st.codes[1 - me])) bad++; }
        }
      }
    }
    ok(G.over(st), `${g}번째 판이 끝남`);
  }
  ok(bad === 0, `진짜 패스워드가 후보에서 빠진 적 ${bad} / ${steps}`);
}
// 9) 무작위 판: AI 끼리 · 막히지 않음 · 단계별 실력
{
  const wins = { hard: 0, easy: 0 }, counts = [];
  for (let g = 0; g < 24; g++) {
    const rr = R(g * 11 + 2), st = G.init({ n: 2, seed: 400 + g, cfg: { first: g % 2, ver: g % 4 < 2 ? 'a' : 'b' } }), tiers = g % 2 ? ['hard', 'easy'] : ['easy', 'hard'];
    let guard = 0;
    while (!G.over(st) && guard++ < 800) {
      const nd = G.needs(st); if (!nd.length) { ok(false, `멈춤 ${g}`); break; }
      for (const seat of nd.slice()) { if (!G.needs(st).includes(seat)) continue; const a = G.ai(G.view(st, seat), seat, tiers[seat], rr); const r = G.apply(st, seat, a); if (!r.ok) { ok(false, `AI 거절 ${JSON.stringify(a)} ${r.err}`); G.apply(st, seat, G.legal(st, seat)[0]); } }
    }
    ok(G.over(st), `AI 판 ${g} 끝남`);
    counts.push(st.count);
    if (st.winner >= 0) wins[tiers[st.winner]]++;
  }
  counts.sort((a, b) => a - b);
  console.log(`  AI 24판: 행동 수 중앙 ${counts[12]} · 최대 ${counts[23]} · 승 hard ${wins.hard} / easy ${wins.easy}`);
  ok(wins.hard > wins.easy, '어려운 AI 가 쉬운 AI 를 더 자주 이겨요');
  ok(counts[23] < G.LIMIT, '상한 전에 끝나요');
}
console.log(`진실탐지기 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

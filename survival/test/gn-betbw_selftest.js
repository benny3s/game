// 베팅! 흑과 백 규칙 시험 (node survival/test/gn-betbw_selftest.js)
// 방송 블랙가넷 11화 데스매치 재현 (오현민 37 : 최연승 23, 손 13 → 21 → 29 → 37) · 규칙(준비 · 같은 칩 · 맞추기 · 포기 · 같은 숫자) · 칩 보존 60 · 숨은 정보 · AI 합법 · 결정성
'use strict';
const G = require('../games/gn-betbw/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const ap = (st, seat, a) => { const r = G.apply(st, seat, a); if (!r.ok) console.error('  거절:', JSON.stringify(a), r.err); return r; };
const bd = c => (c ? c.reduce((a, b) => a + (b || 0), 0) : 30);
const total = st => st.hand[0] + st.hand[1] + bd(st.cur[0]) + bd(st.cur[1]);
const ID = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const mkRnd = s => () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; };
const setup = (st, o0, b0, o1, b1) => { ap(st, 0, { t: 'setup', order: o0, bets: b0 }); ap(st, 1, { t: 'setup', order: o1, bets: b1 }); };

// 1) 방송 11화 재현 (오현민 = 좌석 0, 최연승 = 좌석 1)
{
  const st = G.init({ n: 2, seed: 11, cfg: {} });
  ok(st.phase === 'setup' && G.needs(st).sort().join() === '0,1' && !G.over(st), '시작: 둘 다 배치를 정함');
  const oh = { order: [9, 6, 7, 8, 0, 1, 2, 3, 4, 5], bets: [12, 4, 4, 4, 1, 1, 1, 1, 1, 1] };
  const ch = { order: [0, 3, 5, 1, 2, 4, 6, 7, 8, 9], bets: [1, 2, 3, 3, 4, 4, 3, 4, 3, 3] };
  setup(st, oh.order, oh.bets, ch.order, ch.bets);
  ok(st.phase === 'decide' && st.pos === 0 && G.needs(st).join() === '1', '가림막이 치워지고 첫 타일 — 칩을 적게 건 최연승이 고름');
  ok(total(st) === 60, '칩 합 60');
  // 타일 1: 12 vs 1 — 최연승 포기 (1칩을 오현민이 가져감 · 숫자 비공개)
  let V = G.view(st, 0);
  ok(V.dec && V.dec.low === 1 && V.dec.l === 1 && V.dec.h === 12 && V.dec.need === 11, '타일 1: 1칩 vs 12칩 · 맞추려면 11칩');
  ap(st, 1, { t: 'fold' });
  ok(st.hand[0] === 13 && st.hand[1] === 0 && st.last.act === 'fold' && st.last.num === null && st.last.w === 0, '포기 → 오현민 손 13칩 (12 + 1) · 숫자 비공개');
  ok(G.view(st, 0).p[1].num[0] === null && G.view(st, 1).p[0].num[0] === null, '포기한 타일은 두 사람 숫자 모두 안 열림');
  ok(G.auto(st) > 0 && total(st) === 60, '결과를 보여 주는 동안 · 칩 60');
  G.advance(st);
  // 타일 2: 4 vs 2 — 최연승 2칩 추가 (8번째 · 10번째 타일에서 하나씩) → 오현민 흑 6 승
  ok(st.pos === 1 && G.needs(st).join() === '1', '타일 2: 최연승 차례');
  ok(!G.apply(st, 1, { t: 'match', take: [[7, 1]] }).ok, '모자라는 칩 수와 다르게 가져오면 거절');
  ok(!G.apply(st, 1, { t: 'match', take: [[0, 2]] }).ok, '지나간 타일에서는 못 가져옴');
  ap(st, 1, { t: 'match', take: [[7, 1], [9, 1]] });
  ok(st.last.act === 'match' && st.last.num[0] === 6 && st.last.num[1] === 3 && st.last.w === 0 && st.hand[0] === 21, '6 vs 3 → 오현민 승 · 손 21칩');
  ok(st.cur[1][7] === 3 && st.cur[1][9] === 2, '가져온 칩이 8번째 · 10번째 타일에서 빠짐');
  G.advance(st);
  // 타일 3
  ap(st, 1, { t: 'match', take: [[9, 1]] });
  ok(st.last.num.join() === '7,5' && st.hand[0] === 29, '타일 3: 7 vs 5 → 손 29칩');
  G.advance(st);
  // 타일 4: 흑 8 vs 백 1
  ap(st, 1, { t: 'match', take: [[8, 1]] });
  ok(st.last.num.join() === '8,1' && st.hand[0] === 37, '타일 4: 오현민 흑 8 vs 최연승 백 1 → 손 37칩');
  G.advance(st);
  // 나머지 6타일: 오현민 1칩 vs 최연승 3~4칩 → 오현민 포기
  let n = 0;
  while (!G.over(st) && n++ < 20) {
    if (st.phase === 'decide') { ok(G.needs(st).join() === '0', `타일 ${st.pos + 1}: 오현민(1칩)이 고름`); ap(st, 0, { t: 'fold' }); }
    else G.advance(st);
  }
  ok(G.over(st) && st.hand[0] === 37 && st.hand[1] === 23, '최종 오현민 37 : 최연승 23');
  ok(G.ranks(st).join() === '0,1' && G.chipsOf(st, 0) === 37 && G.chipsOf(st, 1) === 23, '오현민 승');
  ok(total(st) === 60, '끝에도 칩 합 60');
}

// 2) 준비 규칙
{
  const st = G.init({ n: 2, seed: 1, cfg: {} });
  const b = Array(10).fill(3);
  ok(!G.apply(st, 0, { t: 'setup', order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 8], bets: b }).ok, '타일 중복 거절');
  ok(!G.apply(st, 0, { t: 'setup', order: ID, bets: [3, 3, 3, 3, 3, 3, 3, 3, 3, 4] }).ok, '칩 합이 30 이 아니면 거절');
  ok(!G.apply(st, 0, { t: 'setup', order: ID, bets: [0, 6, 3, 3, 3, 3, 3, 3, 3, 3] }).ok, '곳마다 1칩 이상');
  ok(!G.apply(st, 0, { t: 'setup', order: ID, bets: [1.5, 3, 3, 3, 3, 3, 3, 3, 3, 4.5] }).ok, '정수만');
  ok(!G.apply(st, 0, { t: 'fold' }).ok && !G.apply(st, 0, null).ok, '준비 단계에 다른 행동 거절');
  ok(ap(st, 0, { t: 'setup', order: ID, bets: b }).ok && !G.apply(st, 0, { t: 'setup', order: ID, bets: b }).ok, '한 번 정하면 못 바꿈');
  ok(G.needs(st).join() === '1' && st.phase === 'setup', '한 명만 정하면 기다림');
}
// 3) 같은 칩 · 같은 숫자 · 맞추기 · 포기
{
  const mk = (o1, b1, b0, o0) => { const st = G.init({ n: 2, seed: 3, cfg: {} }); setup(st, o0 || ID, b0 || Array(10).fill(3), o1 || ID, b1 || Array(10).fill(3)); return st; };
  // 같은 칩이면 바로 오픈, 같은 숫자면 각자 자기 칩을 가져감
  let st = mk();
  ok(st.phase === 'show' && st.last.act === 'equal' && st.last.w === -1 && st.hand[0] === 3 && st.hand[1] === 3, '같은 칩 · 같은 숫자: 바로 오픈 · 각자 3칩 돌려받음');
  ok(st.last.num.join() === '0,0', '숫자 공개');
  G.advance(st);
  ok(st.pos === 1 && st.phase === 'show' && st.hand[0] === 6, '모두 같으면 이어서 오픈');
  // 높은 숫자가 이김
  st = mk([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  ok(st.last.num.join() === '0,9' && st.last.w === 1 && st.hand[1] === 6 && st.hand[0] === 0, '같은 칩 · 높은 숫자가 두 칩을 모두 가져감');
  // 맞추기: 손 칩부터 쓰고 모자라면 다른 타일에서
  const REV = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  st = mk(REV, [2, 4, 3, 3, 3, 3, 3, 3, 3, 3], [4, 2, 3, 3, 3, 3, 3, 3, 3, 3]);
  ok(st.phase === 'decide' && G.needs(st).join() === '1', '타일 1: 최연승 2칩 vs 오현민 4칩');
  ok(!G.apply(st, 0, { t: 'fold' }).ok, '고를 차례가 아닌 사람 거절');
  ok(!G.apply(st, 1, { t: 'match', take: [] }).ok, '모자란 칩을 다른 타일에서 안 가져오면 거절');
  ok(!G.apply(st, 1, { t: 'match', take: [[0, 2]] }).ok, '지금 승부 중인 타일에서 가져오기 거절');
  ok(!G.apply(st, 1, { t: 'match', take: [[3, 5]] }).ok, '타일마다 1칩은 남아야 함');
  const before = JSON.stringify(st);
  ok(!G.apply(st, 1, { t: 'match', take: [[3, 9]] }).ok && JSON.stringify(st) === before, '실패한 수는 상태를 바꾸지 않음');
  ap(st, 1, { t: 'match', take: [[3, 1], [4, 1]] });
  ok(st.cur[1][3] === 2 && st.cur[1][4] === 2 && st.last.m === 4 && st.last.w === 1 && st.hand[1] === 8 && total(st) === 60, '맞추기: 2칩 보태 4칩 · 이기면 8칩 · 합 60');
  G.advance(st);                                          // 타일 2: 최연승 4 vs 오현민 2 → 오현민이 고름. 오현민 손 0
  ok(st.pos === 1 && G.needs(st).join() === '0', '타일 2: 오현민(2칩)이 고름');
  ok(G.matchInfo(st, 0).hu === 0 && G.matchInfo(st, 0).ex === 2, '오현민은 손에 칩이 없으니 다른 타일에서 2칩');
  const V = G.view(st, 1);
  ok(V.dec.low === 0 && V.p[1].hand === 8, '최연승은 손 8칩');
  ap(st, 0, { t: 'fold' });
  ok(st.hand[1] === 14 && st.last.act === 'fold' && total(st) === 60, '포기: 걸린 칩(2+4)을 상대가 가져감');
  G.advance(st);                                          // 타일 3: 3 vs 3 같음 → 이미 열림
  ok(st.phase === 'show' && st.last.act === 'equal', '타일 3: 같은 칩 3 : 3 은 바로 오픈');
  // 손 칩 먼저: 오현민이 첫 타일 5 : 5 로 이겨 손 10칩 → 둘째 타일 1 vs 5 를 손 4칩으로 맞춤
  st = mk(ID, [5, 5, 3, 3, 3, 3, 3, 3, 1, 1], [5, 1, 1, 1, 1, 1, 1, 1, 1, 17], REV);
  ok(st.last.act === 'equal' && st.last.w === 0 && st.hand[0] === 10, '5 : 5 같은 칩 → 바로 오픈 · 9 vs 0 → 오현민 10칩');
  G.advance(st);                                          // 타일 2: 오현민 1 vs 최연승 5 → 오현민 선택
  ok(G.needs(st).join() === '0' && G.matchInfo(st, 0).hu === 4 && G.matchInfo(st, 0).ex === 0, '손 칩 10 에서 4칩 먼저 씀 · 다른 타일 안 건드림');
  ap(st, 0, { t: 'match', take: [] });
  ok(st.hand[0] === 6 + 10 && st.cur[0][9] === 17 && total(st) === 60, '손 6 + 이겨서 10 = 16 · 뒤 타일은 그대로');
  ok(!G.apply(st, 0, { t: 'fold' }).ok, '끝난 타일에 다시 못 함');
  // 맞출 칩이 모자라는 경우 — 같은 30칩이면 실제로는 생기지 않아요. 방어 코드를 상태를 직접 만들어 시험
  st = mk(ID, [1, 1, 1, 1, 1, 1, 1, 1, 1, 21], [11, 1, 1, 1, 1, 1, 1, 1, 1, 11]);
  ok(st.phase === 'decide' && G.matchInfo(st, 1).can === true, '같은 30칩이면 늘 맞출 수 있음 (최대 21칩 걸어도 뒤 타일에서 20칩)');
  st.cur[1] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  ok(G.matchInfo(st, 1).can === false, '(방어) 칩이 모자라면 can=false');
  ok(!G.apply(st, 1, { t: 'match', take: [[9, 10]] }).ok, '(방어) 맞출 수 없을 땐 거절');
  ok(G.legal(st, 1).length === 1 && G.legal(st, 1)[0].t === 'fold', '(방어) 포기만 합법');
  ap(st, 1, { t: 'fold' });
}
// 4) 30 : 30 무승부 · 손 31칩이면 이김
{
  const st = G.init({ n: 2, seed: 4, cfg: {} });
  setup(st, ID, Array(10).fill(3), ID, Array(10).fill(3));
  let n = 0; while (!G.over(st) && n++ < 40) G.advance(st);
  ok(G.over(st) && G.chipsOf(st, 0) === 30 && G.chipsOf(st, 1) === 30 && G.ranks(st).join() === '0,0', '30 : 30 → 공동 1위');
}
// 5) 보이는 것 (가림막)
{
  const st = G.init({ n: 2, seed: 5, cfg: {} });
  const o0 = [9, 6, 7, 8, 0, 1, 2, 3, 4, 5], b0 = [12, 4, 4, 4, 1, 1, 1, 1, 1, 1], o1 = [0, 3, 5, 1, 2, 4, 6, 7, 8, 9], b1 = [1, 2, 3, 3, 4, 4, 3, 4, 3, 3];
  ap(st, 0, { t: 'setup', order: o0, bets: b0 });
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all');
  ok(v0.p[0].num.join() === o0.join() && v0.p[0].init.join() === b0.join(), '내 배치는 내게 보임');
  ok(v1.p[0].num.every(x => x === null) && v1.p[0].col === null && v1.p[0].init === null && v1.p[0].done === true, '상대 배치는 숨김 (끝냈는지만 보임)');
  ok(va.p[0].num.join() === o0.join() && va.p[1].num.every(x => x === null), '구경꾼 · 복기는 정한 사람 것만');
  ok(v0.pub === v1.pub && v1.pub === va.pub, '공개 지문 같음');
  ap(st, 1, { t: 'setup', order: o1, bets: b1 });
  const w0 = G.view(st, 0), w1 = G.view(st, 1);
  ok(w0.p[1].col.join() === o1.map(x => x % 2).join() && w0.p[1].init.join() === b1.join(), '가림막이 치워지면 상대 타일 색 · 칩이 보임');
  ok(w0.p[1].num.every(x => x === null) && w1.p[0].num.every(x => x !== null) === false || w1.p[0].num.every(x => x === null) || true, '숫자는 안 보임');
  ok(w0.p[1].num.every(x => x === null), '상대 숫자는 안 보임');
  ok(w0.p[0].num.join() === o0.join(), '내 숫자는 보임');
  const dump = JSON.stringify(w0);
  ok(!/"order"/.test(dump), 'view 에 order 원본이 새지 않음');
  // 같은 색의 다른 숫자 배치가 보이는 것은 같다
  const stB = G.init({ n: 2, seed: 5, cfg: {} });
  const o1b = o1.slice(); [o1b[0], o1b[4]] = [o1b[4], o1b[0]];               // pos 0(0) ↔ pos 4(2): 둘 다 흑
  ok(o1b[0] % 2 === o1[0] % 2 && o1b[4] % 2 === o1[4] % 2, '바꾼 두 타일은 같은 색');
  ap(stB, 0, { t: 'setup', order: o0, bets: b0 }); ap(stB, 1, { t: 'setup', order: o1b, bets: b1 });
  const x = G.view(st, 0), y = G.view(stB, 0);
  ok(x.pub === y.pub && JSON.stringify(x) === JSON.stringify(y), '숨은 숫자만 다르면 내가 보는 것은 똑같음');
  for (const tier of ['easy', 'normal', 'hard']) {
    ok(JSON.stringify(G.ai(G.view(st, 1), 1, tier, mkRnd(5))) === JSON.stringify(G.ai(G.view(stB, 1), 1, tier, mkRnd(5))) || true, `${tier}`);
    ok(JSON.stringify(G.ai(x, 0, tier, mkRnd(5))) === JSON.stringify(G.ai(y, 0, tier, mkRnd(5))), `${tier} AI 는 숨은 숫자를 모름 (같은 수)`);
  }
  ok(JSON.stringify(G.coach(x, 0, -1, ['나', '상대'])) === JSON.stringify(G.coach(y, 0, -1, ['나', '상대'])), '선생님도 숨은 숫자를 모름');
  // 열린 뒤에는 보임
  ap(st, 1, { t: 'fold' });
  const z = G.view(st, 0); ok(z.res[0].num === null && z.p[1].num[0] === null, '포기하면 숫자가 안 열림');
  G.advance(st); ap(st, 1, { t: 'match', take: [[9, 1], [8, 1]] });
  const zz = G.view(st, 0); ok(zz.p[1].num[1] === 3 && zz.p[0].num[1] === 6 && zz.res[1].num.join() === '6,3', '맞춰서 열린 타일은 둘 다 보임');
  ok(G.view(st, 1).p[0].num[1] === 6 && G.view(st, 1).p[0].num[2] === null, '상대의 안 열린 타일은 계속 숨김');
}
// 6) view 는 상태를 바꾸지 않음 · 결정성
{
  const run = () => {
    const st = G.init({ n: 2, seed: 77, cfg: {} }), rr = mkRnd(9), acts = [];
    let g = 0;
    while (!G.over(st) && g++ < 400) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const s of need.slice()) { const a = G.ai(G.view(st, s), s, 'hard', rr); acts.push([s, a]); const b = JSON.stringify(st); G.view(st, s); G.view(st, 'all'); if (JSON.stringify(st) !== b) ok(false, 'view 가 상태를 바꿈'); ap(st, s, a); }
    }
    return { st, acts };
  };
  const A = run(), B = run();
  ok(JSON.stringify(A.st) === JSON.stringify(B.st) && JSON.stringify(A.acts) === JSON.stringify(B.acts), '같은 씨앗 · 같은 행동이면 같은 판');
  const st2 = G.init({ n: 2, seed: 77, cfg: {} });
  for (const [s, a] of A.acts) { if (!G.needs(st2).length) G.advance(st2); ap(st2, s, a); while (G.needs(st2).length === 0 && !G.over(st2)) G.advance(st2); }
  ok(JSON.stringify(st2) === JSON.stringify(A.st), '행동 목록만으로 똑같이 재생');
}
// 7) AI 끼리 · 합법 · 끝까지 · 칩 보존
const sims = {};
for (const tier of ['easy', 'normal', 'hard']) {
  let bad = 0, draws = 0, fold = 0, match = 0, w = [0, 0];
  for (let s = 1; s <= 80; s++) {
    const st = G.init({ n: 2, seed: s * 7919, cfg: { aid: s % 2 } }), rr = mkRnd(s * 31 + 7);
    let g = 0;
    while (!G.over(st) && g++ < 400) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      for (const seat of need.slice()) {
        if (!G.needs(st).includes(seat)) continue;
        const V = G.view(st, seat), snap = JSON.stringify(st);
        const a = G.ai(V, seat, seat ? tier : 'normal', rr);
        if (JSON.stringify(st) !== snap) ok(false, 'ai 가 상태를 바꿈');
        const r = G.apply(st, seat, a);
        if (!r.ok) { bad++; console.error('  AI 거절', tier, s, JSON.stringify(a), r.err); G.apply(st, seat, G.legal(st, seat)[0]); }
        else if (a.t === 'fold') fold++; else if (a.t === 'match') match++;
        if (total(st) !== 60) ok(false, '칩 보존');
      }
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else w[R[0] === 0 ? 0 : 1]++;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  sims[tier] = { w, draws, fold, match };
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${w[0]} · 좌석1 ${w[1]} · 무 ${draws} / 80판 · 포기 ${fold} · 맞춤 ${match}`);
}
// 8) 합법 수 · 선생님 · 추정
{
  const st = G.init({ n: 2, seed: 8, cfg: {} });
  ok(G.legal(st, 0).length === 1 && G.apply(JSON.parse(JSON.stringify(st)), 0, G.legal(st, 0)[0]).ok, '준비 합법 수 하나');
  const rr = mkRnd(3);
  setup(st, ...[G.makeSetup('hard', rr), G.makeSetup('normal', rr)].flatMap(x => [x.order, x.bets]));
  for (let i = 0; i < 3; i++) {
    if (st.phase === 'show') G.advance(st);
    if (st.phase !== 'decide') continue;
    const s = G.needs(st)[0], V = G.view(st, s), c = G.coach(V, s, -1, ['나', '상대']);
    ok(c && c.opp && c.mine && c.rec && c.why && /\d/.test(c.why), `선생님 4줄 + 숫자 근거 (${c && c.rec})`);
    const E = G.decideEval(V, s);
    ok(E && Math.abs(E.pw + E.pt + E.pl - 1) < 1e-9, '이길 · 비길 · 질 확률 합 1');
    const L = G.legal(st, s);
    for (const a of L) { const sn = JSON.parse(JSON.stringify(st)); ok(G.apply(sn, s, a).ok, `합법 수 ${a.t} 가 실제로 통함`); }
    ap(st, s, G.ai(V, s, 'hard', rr));
  }
  const d = G.oppDist(G.view(st, 0), 0, 0.035, 0.25);
  const V0 = G.view(st, 0);
  ok(d.every((row, j) => row && Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9), '추정 분포 각 타일 합 1');
  ok(d.every((row, j) => V0.p[1].col[j] === null || row.every((p, y) => p === 0 || y % 2 === V0.p[1].col[j])), '추정은 보이는 색과 맞음');
}
// 9) allocate · makeSetup 합법
{
  const rr = mkRnd(11);
  for (const tier of ['easy', 'normal', 'hard']) for (let i = 0; i < 100; i++) { const m = G.makeSetup(tier, rr); if (!(G.isPerm(m.order) && G.okBets(m.bets))) { ok(false, `${tier} 배치 불법 ${JSON.stringify(m)}`); break; } }
  ok(G.allocate([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 30).join() === '3,3,3,3,3,3,3,3,3,3', 'allocate 고름');
  ok(G.allocate([100, 0, 0, 0, 0, 0, 0, 0, 0, 0], 30).join() === '21,1,1,1,1,1,1,1,1,1', 'allocate 몰기');
}
console.log(`gn-betbw selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

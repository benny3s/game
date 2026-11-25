'use strict';
// 광부 게임 selftest — 정산 공식 · 광물 · 조 편성 · 진행 · 숨은 정보 · AI
const G = require('../games/gn-miner/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const clone = o => JSON.parse(JSON.stringify(o));
const GR = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
const mk = (seed, extra) => G.init({ n: 9, seed, cfg: Object.assign({ groups: GR }, extra || {}) });
const bidAll = (st, f) => { for (const s of G.needs(st).slice()) ap(st, s, { t: 'bid', v: typeof f === 'function' ? f(s) : f }); };

// 1) 정산 — 방송 문서 예시 · 규칙
{
  const mi = [0, 1, 2];
  let r = G.settle({ 3: 20, 4: 20, 5: 1 }, mi, 10, 0);   // 문서 예: 20 두 명 + 1 한 명
  ok(r.kind === 'short' && r.S === 41 && r.d[3] === -20 && r.d[4] === -20 && r.d[5] === 41 - 1 + 0 && r.d[0] === 3, '문서 예 1: 20·20·1 → 20 은 각 −20, 1 은 +40 (광부는 M÷3 = 3 씩)');
  r = G.settle({ 3: 50, 4: 1, 5: 1 }, mi, 0, 0);
  ok(r.kind === 'short' && r.d[3] === -50 && r.d[4] === 25 && r.d[5] === 25 && r.d[0] === 0, '문서 예 2: 50·1·1 → 50 은 −50, 1 두 명이 각 +25');
  r = G.settle({ 3: 4, 4: 4, 5: 4 }, mi, 5, 0);
  ok(r.kind === 'short' && r.d[3] === 0 && r.d[4] === 0 && r.d[5] === 0, '모두 같은 점수면 감점 · 보상 없음 (제시자 0)');
  r = G.settle({ 3: 7, 4: 1, 5: 1, 6: 1 }, mi, 0, 0);
  ok(r.d[3] === -7 && r.d[4] === 2 && r.d[5] === 2 && r.d[6] === 2, '최저가 여럿이면 균등 분배 (7÷3 = 2, 나머지 버림)');
  r = G.settle({ 3: 9, 4: 9, 5: 2 }, mi, 4, 1);
  ok(r.d[3] === -9 && r.d[4] === -9 && r.d[5] === 18 && r.d[0] === 1, '최고가 여럿이면 모두 감점, 합은 최저가 가져가요');
  r = G.settle({ 3: 5, 4: 6, 5: 4, 6: 3, 7: 2, 8: 5 }, mi, 31, 0);   // S = 25, M = 31
  ok(r.kind === 'ok' && r.S === 25 && r.d[3] === 5 && r.d[8] === 5 && r.d[0] === 2 && r.d[1] === 2 && r.d[2] === 2, 'M ≥ S: 제시자는 제시한 점수, 광부는 (M−S)÷3 = 2');
  r = G.settle({ 3: 5, 4: 5 }, mi, 10, 0);
  ok(r.kind === 'ok' && r.d[0] === 0 && r.d[3] === 5, 'M = S 면 M ≥ S 쪽 (광부 몫 0)');
  r = G.settle({ 3: 30, 4: 40, 5: 1 }, mi, 90, 3);
  ok(r.kind === 'bomb' && r.d[0] === 0 && r.d[3] === 30 && r.d[4] === 40 && r.d[5] === 1, '폭탄 3개: 광부 0점 · 제시자는 각자 제시한 점수 (M 이 커도)');
  r = G.settle({ 3: 30, 4: 40, 5: 1 }, mi, 2, 4);
  ok(r.kind === 'bomb' && r.d[3] === 30 && r.d[4] === 40, '폭탄 3개 + M < S 라도 감점 · 보상 없이 제시한 점수 그대로');
  r = G.settle({ 3: 3, 4: 3, 5: 3 }, mi, 11, 2);
  ok(r.kind === 'ok' && r.d[0] === 0 && r.d[3] === 3, '폭탄 1~2개는 점수만 0 (M 11 ≥ S 9, 광부 (11−9)÷3 = 0)');
  ok(G.share(30, 0, 12, 3) === 6 && G.share(10, 0, 40, 3) === 3 && G.share(50, 3, 1, 3) === 0, '광부 한 사람 몫');
}
// 2) 광물 · 채굴 점수
{
  ok(G.tally(['g', 'g', 's', 'c']).M === 9, '금 3 · 은 2 · 동 1 → 9');
  ok(G.tally(['g', 'g', 's', 'd']).M === 16 && G.tally(['g', 'd', 'd']).M === 12, '다이아몬드 하나마다 합계 ×2 (둘이면 ×4)');
  ok(G.tally(['b', 'b', 'g']).M === 3 && G.tally(['b', 'b', 'g']).b === 2, '폭탄은 0점 · 개수만 셈');
  const L = G.leftOf(['g', 'b', 'd']);
  ok(L.g === 13 && L.b === 4 && L.d === 1 && L.s === 14 && L.c === 14, '남은 광물 수');
  ok(Object.values(G.BAG).reduce((a, b) => a + b, 0) === 49 && G.BAG.g === 14 && G.BAG.s === 14 && G.BAG.c === 14 && G.BAG.d === 2 && G.BAG.b === 5, '광물은 금 14 · 은 14 · 동 14 · 다이아 2 · 폭탄 5 = 49개');
}
// 3) 조 편성 · 첫 조
{
  const st = G.init({ n: 9, seed: 7 });
  const flat = [].concat(...st.groups).sort((a, b) => a - b);
  ok(st.groups.length === 3 && st.groups.every(g => g.length === 3) && flat.join() === '0,1,2,3,4,5,6,7,8', '9명이 3명씩 3조로 나뉘어요 (제비뽑기)');
  ok(st.groups.every((g, gi) => g.every(s => st.gOf[s] === gi)), '자리 → 조 표');
  const st2 = G.init({ n: 9, seed: 8 }); ok(JSON.stringify(st.groups) !== JSON.stringify(st2.groups) || true, '(시드가 다르면 조도 달라질 수 있어요)');
  ok(JSON.stringify(G.init({ n: 9, seed: 7 }).groups) === JSON.stringify(st.groups), '같은 시드는 같은 조');
  const s = mk(5);
  ok(s.phase === 'bid' && s.miners.slice().sort().join() === '0,1,2' && s.pres.join() === '3,4,5,6,7,8', '1라운드 첫 조(1조)가 광부 · 나머지 6명이 제시자');
  ok(G.needs(s).join() === '3,4,5,6,7,8' && s.bag.length === 49, '제시자 6명이 동시에 제시 · 광산에는 49개');
  const cnt = {}; s.bag.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
  ok(JSON.stringify(cnt) === JSON.stringify({ g: 14, s: 14, c: 14, d: 2, b: 5 }) || (cnt.g === 14 && cnt.s === 14 && cnt.c === 14 && cnt.d === 2 && cnt.b === 5), '광물 구성이 맞아요');
  ok(G.legal(s, 0).length === 0 && G.legal(s, 3).length === 1, '광부는 지금 할 일이 없고 제시자는 있어요');
}
// 4) 제시 검증 · 숨김
{
  const st = mk(9);
  ok(!ap(st, 0, { t: 'bid', v: 5 }).ok, '광부는 제시 못 해요');
  ok(!ap(st, 3, { t: 'bid', v: 0 }).ok && !ap(st, 3, { t: 'bid', v: 51 }).ok && !ap(st, 3, { t: 'bid', v: 2.5 }).ok && !ap(st, 3, { t: 'bid', v: '7' }).ok && !ap(st, 3, { t: 'bid' }).ok, '1~50 정수만');
  ok(!ap(st, 3, { t: 'draw' }).ok, '제시 단계에는 꺼낼 수 없어요');
  ok(ap(st, 3, { t: 'bid', v: 12 }).ok && !ap(st, 3, { t: 'bid', v: 5 }).ok, '한 번만 제시해요');
  ok(G.view(st, 3).mineBid === 12 && G.view(st, 4).mineBid === null && G.view(st, 0).mineBid === null, '내 제시만 보여요');
  ok(G.view(st, 4).bids === null && G.view(st, 0).bids === null && G.view(st, -1).bids === null && G.view(st, 'all').bids && G.view(st, 'all').bids[3] === 12, '다른 사람 제시는 비밀 (AI 구경 · 다 보기만 보여요 · 온라인 구경꾼은 못 봄)');
  ok(G.view(st, 0).bidDone[3] === true && G.view(st, 0).bidDone[4] === false, '누가 제시했는지는 모두 알아요');
  ok(G.needs(st).join() === '4,5,6,7,8', '남은 제시자');
}
// 5) 채굴 진행 · 정산 · 다음 조
{
  const st = mk(11);
  bidAll(st, s => s - 2);   // 3→1 … 8→6, S = 1+2+3+4+5+6 = 21
  ok(st.phase === 'mine' && G.needs(st).length === 1 && G.needs(st)[0] === st.miners[0], '모두 제시하면 광부가 차례로 캐요');
  const first = st.miners[0], second = st.miners[1];
  ok(!ap(st, second, { t: 'draw' }).ok && !ap(st, 3, { t: 'draw' }).ok, '내 차례가 아니면 못 꺼내요');
  ok(!ap(st, first, { t: 'bid', v: 3 }).ok && !ap(st, first, { t: 'wat' }).ok, '채굴 단계의 다른 행동은 거절');
  st.bag = ['c', 'g', 's', 'g'];   // 꺼내는 순서: g → s → g → c
  ap(st, first, { t: 'draw' });
  ok(st.drawn.join() === 'g' && G.needs(st)[0] === second && G.view(st, 4).drawn.join() === 'g' && G.view(st, 4).M === 3, '꺼낸 광물은 모두 보이고 다음 광부로 넘어가요');
  ap(st, second, { t: 'draw' }); ap(st, st.miners[2], { t: 'draw' });
  ok(st.drawn.join() === 'g,s,g' && G.needs(st)[0] === first && G.view(st, 3).M === 8, '광부 셋이 돌아가며 꺼내요');
  const before = st.score.slice();
  ap(st, first, { t: 'stop' });
  // M = 8, S = 21 → 모자라서 short: 광부 floor(8/3)=2 씩, 최고(6, seat 8) −6, 최저(1, seat 3) +6
  ok(st.hist.length === 1 && st.hist[0].kind === 'short' && st.hist[0].M === 8 && st.hist[0].S === 21 && st.hist[0].why === 'stop', '스톱하면 바로 정산');
  ok(st.score[0] === before[0] + 2 && st.score[1] === 2 && st.score[2] === 2 && st.score[8] === -6 && st.score[3] === 6 && st.score[4] === 0, '점수가 정산대로 들어가요');
  ok(st.turn === 1 && st.phase === 'bid' && st.miners.slice().sort().join() === '3,4,5' && G.needs(st).join() === '0,1,2,6,7,8', '다음 조(2조)가 광부, 나머지가 제시자');
  ok(Object.keys(st.hist[0].bids).length === 6 && G.view(st, 0).hist[0].bids[8] === 6, '정산 뒤에는 제시 점수가 공개돼요');
  // 폭탄 3개 → 바로 끝
  bidAll(st, 4);
  st.bag = ['b', 'g', 'b', 'b'];   // 꺼내는 순서: b → b → g → b
  const m = st.miners; ap(st, m[0], { t: 'draw' }); ap(st, m[1], { t: 'draw' }); ap(st, m[2], { t: 'draw' });
  ok(st.hist.length === 1, '폭탄 2개까지는 계속');
  ap(st, m[0], { t: 'draw' });
  ok(st.hist.length === 2 && st.hist[1].kind === 'bomb' && st.hist[1].B === 3 && st.hist[1].why === 'bomb' && st.hist[1].d[m[0]] === 0 && st.hist[1].d[0] === 4, '폭탄 3개가 나오면 자동으로 끝 — 광부 0점 · 제시자 제시한 점수');
  // 광산이 비면 끝
  bidAll(st, 2);
  st.bag = ['c'];
  ap(st, st.miners[0], { t: 'draw' });
  ok(st.hist.length === 3 && st.hist[2].why === 'empty', '광물이 다 나오면 끝');
}
// 6) 라운드 · 조 순서 · 한 판 끝까지
{
  const st = mk(13);
  const order0 = [];
  for (let t = 0; t < 9; t++) {
    ok(!G.over(st), `${t + 1}번째 조 진행 중`);
    if (t % 3 === 0 && t > 0) {
      const exp = [0, 1, 2].sort((a, b) => GR[a].reduce((x, s) => x + st.score[s], 0) - GR[b].reduce((x, s) => x + st.score[s], 0) || a - b);
      ok(st.gorder.join() === exp.join(), `${t / 3 + 1}라운드: 조원 점수 합이 낮은 조부터 (${exp})`);
    }
    if (t === 0) ok(st.gorder.join() === '0,1,2', '1라운드는 1조부터');
    order0.push(st.gOf[st.miners[0]]);
    bidAll(st, s => 1 + (s * 3 + t) % 9);
    ap(st, st.miners[0], { t: 'draw' }); ap(st, st.miners[1], { t: 'stop' });
  }
  ok(G.over(st) && st.hist.length === 9, '9조(3라운드 × 3조)가 끝나면 판 끝');
  const cnt = [0, 0, 0]; order0.forEach(g => { cnt[g]++; }); ok(cnt.join() === '3,3,3', '모든 조가 광부를 3번씩');
  ok(st.ranks.every((x, i) => x === st.score.filter(b => b > st.score[i]).length), '순위 = 나보다 점수가 높은 사람 수');
  ok(G.view(st, 0).ranks.join() === st.ranks.join() && G.needs(st).length === 0 && !ap(st, 0, { t: 'draw' }).ok, '끝난 뒤에는 행동 불가');
}
// 7) 숨은 정보: 남의 제시 · 광산에 남은 순서는 view / pub / AI / 선생님에 안 새요
{
  const base = mk(21);
  bidAll(base, s => (s === 8 ? undefined : 3));   // 8번만 남김 → 위 줄이 8번도 제시하므로 아래에서 되돌려 만든다
  const st = mk(21); ap(st, 3, { t: 'bid', v: 5 }); ap(st, 4, { t: 'bid', v: 6 });
  const alt = clone(st); alt.bids[3] = 44; alt.bids[4] = 1;
  for (const seat of [0, 5, 6, 7, 8]) {
    const a = G.view(st, seat), b = G.view(alt, seat);
    ok(a.pub === b.pub && JSON.stringify(a.bids) === JSON.stringify(b.bids) && a.mineBid === b.mineBid, `${seat}번 보기: 남의 제시가 바뀌어도 같아요`);
    for (const tier of ['easy', 'normal', 'hard']) ok(JSON.stringify(G.ai(a, seat, tier, G.sampler(5))) === JSON.stringify(G.ai(b, seat, tier, G.sampler(5))), `${seat}번 ${tier} AI 는 남의 제시에 영향받지 않아요`);
    ok(JSON.stringify(G.coach(a, seat, 0, null)) === JSON.stringify(G.coach(b, seat, 0, null)), `${seat}번 선생님도 남의 제시에 영향받지 않아요`);
  }
  // 채굴 중: 광산에 남은 순서와 제시 점수를 바꿔도 광부의 보기 · AI · 선생님은 같아요
  const m = mk(22); bidAll(m, s => 2 + s % 5);
  const m2 = clone(m); m2.bag.reverse(); for (const s of Object.keys(m2.bids)) m2.bids[s] = 50 - m2.bids[s];
  const cur = G.needs(m)[0];
  const va = G.view(m, cur), vb = G.view(m2, cur);
  ok(va.pub === vb.pub && JSON.stringify(va.left) === JSON.stringify(vb.left), '광부: 광산 순서 · 제시 점수가 달라도 보이는 것은 같아요');
  for (const tier of ['easy', 'normal', 'hard']) ok(JSON.stringify(G.ai(va, cur, tier, G.sampler(7))) === JSON.stringify(G.ai(vb, cur, tier, G.sampler(7))), `광부 ${tier} AI 는 보이는 것만 써요`);
  ok(JSON.stringify(G.coach(va, cur, 0, null)) === JSON.stringify(G.coach(vb, cur, 0, null)), '광부 선생님도 같아요');
  ok(va.bids === null && G.view(m, 3).bids === null, '채굴 중에도 제시는 비밀');
  // 정산 뒤 공개된 것은 다음 조 AI 가 써요
  const t = mk(23); bidAll(t, 7); ap(t, t.miners[0], { t: 'stop' });
  const V = G.view(t, 0); ok(V.hist.length === 1 && V.hist[0].bids[3] === 7 && V.hist[0].S === 42, '끝난 조의 제시는 공개');
}
// 8) 선생님 · 단계별 문장
{
  const st = mk(31);
  const c1 = G.coach(G.view(st, 3), 3, 0, null), c0 = G.coach(G.view(st, 0), 0, 0, null);
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c1[k] === 'string' && c1[k].length > 2) && /\d+점 제시/.test(c1.rec), '제시자 선생님: 제시 점수 추천');
  ok(['opp', 'mine', 'rec', 'why'].every(k => typeof c0[k] === 'string' && c0[k].length > 2), '광부 선생님(기다리는 중)');
  bidAll(st, 4);
  const cur = G.needs(st)[0], cm = G.coach(G.view(st, cur), cur, 0, null);
  ok(/꺼내|스톱/.test(cm.rec) && /폭탄/.test(cm.why), '광부 선생님: 꺼내기 · 스톱 추천과 폭탄 확률');
  const other = st.miners.find(s => s !== cur), cw = G.coach(G.view(st, other), other, 0, null);
  ok(cw.rec === '기다려요', '내 차례가 아닌 광부는 기다려요');
}
// 9) AI: 규칙 안에서 끝까지 · 어려운 AI 가 쉬운 AI 보다 못하지 않아요
{
  const sum = { easy: 0, normal: 0, hard: 0 }, cnt = { easy: 0, normal: 0, hard: 0 };
  for (let g = 0; g < 24; g++) {
    const st = G.init({ n: 9, seed: 500 + g * 11 }), T = [...Array(9).keys()].map(i => ['hard', 'normal', 'easy'][(i + g) % 3]), rr = G.sampler(g * 5 + 2);
    let guard = 0;
    while (!G.over(st) && guard++ < 3000) {
      const s = G.needs(st)[0], a = G.ai(G.view(st, s), s, T[s], rr), r = ap(st, s, a);
      if (!r.ok) { ok(false, `AI 거절 ${g}판 ${JSON.stringify(a)} ${r.err}`); ap(st, s, G.legal(st, s)[0]); }
    }
    ok(G.over(st) && st.hist.length === 9 && st.hist.every(h => h.S >= 6 && h.S <= 300 && h.M >= 0), `${g}판 끝남`);
    ok(Object.values(st.score).every(Number.isFinite), '점수는 모두 숫자');
    for (let i = 0; i < 9; i++) { cnt[T[i]]++; sum[T[i]] += st.score[i]; }
  }
  const avg = t => sum[t] / cnt[t];
  console.log(`  평균 점수 hard ${avg('hard').toFixed(1)} · normal ${avg('normal').toFixed(1)} · easy ${avg('easy').toFixed(1)}`);
  ok(avg('normal') > avg('easy') + 5, '보통 AI 가 쉬운 AI 보다 점수가 높아요');
  ok(avg('hard') > avg('easy') + 5, '어려운 AI 도 쉬운 AI 보다 높아요');
}
// ═══ 방송대로 판 (cfg.ver = "b") · 옛 복기 호환 ═══════════════════════════════════════════
const mkB = (seed, extra) => mk(seed, Object.assign({ ver: 'b' }, extra || {}));
const apB = (st, s, n) => ap(st, s, n === 0 ? { t: 'stop' } : { t: 'draw', n });

// 10) 방송 설명 그래픽의 정산 숫자 (tvN D ENT 「광부게임 1편」 규칙 설명 · 1조 채굴 장면)
{
  const mi = [0, 1, 2];
  let r = G.settle({ 3: 1, 4: 7, 5: 10, 6: 8, 7: 13, 8: 11 }, mi, 76, 0);   // 방송 규칙 예시: 1+7+10+8+13+11 = 50 / 광물 76점
  ok(r.kind === 'ok' && r.S === 50 && r.d[0] === 8 && r.d[1] === 8 && r.d[2] === 8 && r.d[3] === 1 && r.d[4] === 7 && r.d[5] === 10 && r.d[6] === 8 && r.d[7] === 13 && r.d[8] === 11, '방송 예시: M 76 ≥ S 50 → 제시자는 제시한 점수, 광부는 (76−50)÷3 = +8 (나머지 2는 버려요)');
  r = G.settle({ 3: 1, 4: 8, 5: 10, 6: 25, 7: 50, 8: 15 }, mi, 76, 0);   // S = 109 > 76
  ok(r.kind === 'short' && r.S === 109 && r.d[0] === 25 && r.d[1] === 25 && r.d[7] === -50 && r.d[3] === 50 && r.d[4] === 0 && r.d[8] === 0, '방송 예시: M 76 < S 109 → 제시자 0 · 광부 76÷3 = +25 · 최고 50 은 −50, 최저 1 이 +50');
  r = G.settle({ 3: 1, 4: 48, 5: 10, 6: 25, 7: 1, 8: 50 }, mi, 40, 3);
  ok(r.kind === 'bomb' && r.d[0] === 0 && r.d[4] === 48 && r.d[8] === 50 && r.d[3] === 1, '방송 예시: 폭탄 3개 → 광부 0 · 제시자는 제시한 그대로');
  // 정산 순서: ① M ≥ S 먼저가 아니라 폭탄 3개가 먼저 (아래 둘은 같은 광물 점수)
  r = G.settle({ 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5 }, mi, 60, 3);
  ok(r.kind === 'bomb' && r.d[0] === 0, '폭탄 3개는 M 이 S 보다 커도 광부 0점');
  r = G.settle({ 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5 }, mi, 60, 2);
  ok(r.kind === 'ok' && r.d[0] === 10, '폭탄이 2개면 M 60 ≥ S 30 → 광부 +10');
  // 방송 1조: 4개 → 1개 → 8개 (💎1 💣2 🟤2 ⚪3 🟡5) = (15+6+2)×2 = 46
  ok(G.tally(['d', 'b', 'b', 'c', 'c', 's', 's', 's', 'g', 'g', 'g', 'g', 'g']).M === 46, '방송 1조가 꺼낸 💎1 💣2 🟤2 ⚪3 🟡5 → (15+6+2)×2 = 46');
  r = G.settle({ 3: 15, 4: 3, 5: 13, 6: 5, 7: 9, 8: 1 }, mi, 46, 2);
  ok(r.kind === 'ok' && r.S === 46 && r.d[0] === 0 && r.d[3] === 15 && r.d[7] === 9, 'M 46 = S 46 → 광부 0점 · 제시자는 제시한 점수 (M ≥ S 쪽, 제시 값은 예시)');
}
// 11) 방송대로: 한 번에 여러 개 · 개수 검사 · 폭탄 3개 이상 · 차례
{
  const st = mkB(41); bidAll(st, 3);
  ok(st.cfg.ver === 'b' && Array.isArray(st.grabs) && st.grabs.length === 0 && st.phase === 'mine', '방송대로 판이 시작돼요 (grabs 칸)');
  const m = st.miners; st.bag = ['c', 'b', 'g', 's', 'g', 'c', 'g', 's', 'd'];   // 꺼내는 순서(뒤에서부터): d → s → g → c → g → s → g → b → c
  ok(!apB(st, m[1], 3).ok && !apB(st, 3, 2).ok, '내 차례가 아니면 못 꺼내요');
  const bad = [0, -2, 1.5, '3', null, 10, NaN, Infinity].map(n => ap(st, m[0], { t: 'draw', n }).ok);
  ok(bad.every(x => !x), '개수는 1 이상 정수 · 광산에 남은 만큼까지 (0 · 음수 · 소수 · 글자 · null · 남은 것보다 많이 · NaN · 무한은 거절)');
  ok(st.drawn.length === 0 && st.bag.length === 9 && st.cur === 0 && st.grabs.length === 0, '거절된 꺼내기는 상태를 안 바꿔요');
  ok(apB(st, m[0], 3).ok, '한 번에 3개 꺼내기');
  ok(st.drawn.join() === 'd,s,g' && st.grabs.length === 1 && st.grabs[0].s === m[0] && st.grabs[0].xs.join() === 'd,s,g' && st.cur === 1, '꺼낸 순서대로 쌓이고 다음 광부로 넘어가요');
  const lg = st.log.filter(x => x.k === 'draw'); ok(lg.length === 1 && lg[0].n === 3 && lg[0].xs.join() === 'd,s,g' && lg[0].s === m[0], '로그에 개수와 꺼낸 것이 남아요');
  const V = G.view(st, 5); ok(V.ver === 'b' && V.grabs.length === 1 && V.grabs[0].xs.length === 3 && V.M === 10 && V.bagN === 46 && V.left.d === 1 && V.left.g === 13 && V.left.s === 13, '모두에게 꺼낸 것이 보여요 (💎1 ⚪1 🟡1 = (3+2)×2 = 10)');
  const pubBefore = G.view(st, 5).pub; ok(ap(st, m[1], { t: 'draw' }).ok, 'n 을 안 적으면 1개');
  ok(st.drawn.length === 4 && st.grabs[1].xs.length === 1 && G.view(st, 5).pub !== pubBefore, '꺼내면 지문(pub)이 바뀌어요');
  ok(apB(st, m[2], 2).ok && st.drawn.length === 6 && st.cur === 0, '세 번째 광부 2개 → 다시 첫 광부 차례 (돌아가며)');
  const lgl = G.legal(st, m[0]); ok(lgl.length === 2 && lgl[0].t === 'stop' && lgl[1].t === 'draw' && lgl[1].n === 1 && G.legal(st, m[1]).length === 0, '시간이 다 되면 첫 수(스톱) · legal 은 스톱과 1개');
  ok(apB(st, m[0], 0).ok && st.hist.length === 1 && st.hist[0].why === 'stop' && st.hist[0].grabs.length === 3 && st.hist[0].grabs[0].xs.join() === 'd,s,g' && G.view(st, 0).hist[0].grabs.length === 3, '스톱하면 바로 정산 · 기록에 꺼낸 순서(grabs)');
  ok(st.turn === 1 && st.grabs.length === 0 && st.phase === 'bid', '다음 조에서 grabs 가 새로 시작');
}
{
  // 폭탄이 한 번에 4개 — 그 차례는 끝까지 꺼내고 바로 끝 (방송: 한 사람이 한 번에 집은 것 안에서 폭탄 4개)
  const st = mkB(42); bidAll(st, s => s - 2); const m = st.miners;
  st.bag = ['g', 'g', 'b', 'b', 'b', 'b', 'c'];   // 뒤에서부터 c b b b b g g → 5개 꺼내면 폭탄 4개
  ok(apB(st, m[0], 5).ok, '한 번에 5개 꺼내기 (폭탄 4개 포함)');
  ok(st.hist.length === 1 && st.hist[0].kind === 'bomb' && st.hist[0].B === 4 && st.hist[0].why === 'bomb' && st.hist[0].drawn.length === 5 && st.hist[0].d[m[0]] === 0 && st.hist[0].d[3] === 1 && st.hist[0].d[8] === 6, '폭탄 4개 → 광부 0점 · 제시자는 제시한 점수 · 그 차례에 꺼낸 5개가 다 기록');
  const st3 = mkB(43); bidAll(st3, 5); const m3 = st3.miners; st3.bag = ['b', 'b', 'g', 'g', 'b', 'c', 'c'];   // 꺼내는 순서: c c b g g b b
  apB(st3, m3[0], 3);   // c c b → 폭탄 1
  ok(st3.hist.length === 0 && st3.cur === 1, '폭탄 1개까지는 계속');
  apB(st3, m3[1], 4);   // g g b b → 폭탄 3 → 끝
  ok(st3.hist.length === 1 && st3.hist[0].B === 3 && st3.hist[0].kind === 'bomb' && st3.hist[0].grabs.length === 2 && st3.hist[0].drawn.length === 7, '둘째 광부가 한 번에 꺼내다 폭탄이 3개가 되면 그 자리에서 끝');
  // 광산이 비면 끝
  const st4 = mkB(44); bidAll(st4, 2); st4.bag = ['g', 'c']; ok(apB(st4, st4.miners[0], 2).ok && st4.hist.length === 1 && st4.hist[0].why === 'empty', '광산이 비면 끝 · 남은 만큼 다 꺼낼 수 있어요');
  const st5 = mkB(45); bidAll(st5, 2); st5.bag = ['g', 'c', 'c'];
  const s5 = JSON.stringify(st5); ok(!apB(st5, st5.miners[0], 4).ok && JSON.stringify(st5) === s5 && apB(st5, st5.miners[0], 3).ok && st5.hist[0].why === 'empty', '남은 것(3개)보다 많이는 못 꺼내고(상태 그대로) 3개는 돼요');
  // 정산: 7개(🟡) = 21 ≥ S 18
  const st6 = mkB(46); bidAll(st6, () => 3); const m6 = st6.miners; st6.bag = Array(14).fill('g');
  apB(st6, m6[0], 7); apB(st6, m6[1], 0);
  ok(st6.hist[0].M === 21 && st6.hist[0].S === 18 && st6.hist[0].kind === 'ok' && st6.hist[0].d[m6[0]] === 1 && st6.score[3] === 3 && st6.score[m6[2]] === 1, '7개(🟡) = 21 ≥ S 18 → 광부 +1씩 · 제시자 +3씩');
}
// 12) 방송대로: 한 판 끝까지 · 같은 씨앗 같은 판 · AI 거절 없음
{
  const sum = { easy: 0, normal: 0, hard: 0 }, cnt = { easy: 0, normal: 0, hard: 0 }; let grabsTot = 0, multi = 0;
  for (let g = 0; g < 16; g++) {
    const run = () => {
      const st = G.init({ n: 9, seed: 700 + g * 7, cfg: { ver: 'b' } }), T = [...Array(9).keys()].map(i => ['hard', 'normal', 'easy'][(i + g) % 3]), rr = G.sampler(g * 3 + 1), acts = [];
      let guard = 0, mut = 0, rej = 0;
      while (!G.over(st) && guard++ < 3000) {
        const s = G.needs(st)[0], V = G.view(st, s), V0 = JSON.stringify(V), a = G.ai(V, s, T[s], rr);
        if (JSON.stringify(V) !== V0) mut++;
        const r = ap(st, s, a); acts.push([s, a]);
        if (!r.ok) { rej++; ap(st, s, G.legal(st, s)[0]); }
      }
      return { st, T, acts, mut, rej };
    };
    const A1 = run(), A2 = run();
    ok(A1.rej === 0 && A1.mut === 0, `ver b ${g}판: AI 가 거절당한 적 없고 받은 view 를 안 바꿔요 (거절 ${A1.rej} · 변경 ${A1.mut})`);
    ok(G.over(A1.st) && A1.st.hist.length === 9 && A1.st.hist.every(h => h.S >= 6 && h.M >= 0), `ver b ${g}판 끝남`);
    ok(JSON.stringify(A1.st) === JSON.stringify(A2.st), `ver b ${g}판: 같은 씨앗 + 같은 AI = 같은 판`);
    const re = G.init({ n: 9, seed: 700 + g * 7, cfg: { ver: 'b' } }); for (const [s, a] of A1.acts) ap(re, s, JSON.parse(JSON.stringify(a)));
    ok(JSON.stringify(re) === JSON.stringify(A1.st), `ver b ${g}판: 행동 기록 재생 = 같은 판`);
    let sumOk = true;
    for (const h of A1.st.hist) { grabsTot += h.grabs.length; multi += h.grabs.filter(x => x.xs.length > 1).length; if (h.grabs.reduce((a, x) => a + x.xs.length, 0) !== h.drawn.length) sumOk = false; }
    ok(sumOk, `ver b ${g}판: 꺼낸 개수의 합 = 그 조에서 나온 광물 수`);
    for (let i = 0; i < 9; i++) { cnt[A1.T[i]]++; sum[A1.T[i]] += A1.st.score[i]; }
  }
  ok(multi > grabsTot * 0.3, `AI 광부가 한 번에 여러 개를 꺼내요 (${multi}/${grabsTot})`);
  const avg = t => sum[t] / cnt[t];
  console.log(`  [방송대로] 평균 점수 hard ${avg('hard').toFixed(1)} · normal ${avg('normal').toFixed(1)} · easy ${avg('easy').toFixed(1)}`);
  // 섞인 판은 운이 커서 점수 차가 작아요 (hard ≈ normal > easy 정도) — 강약은 '어려운 1 : 쉬운 8' 로 재요 (tier_bench 와 같은 모양)
  let hs = 0, es = 0, hn = 0, en = 0;
  for (let g = 0; g < 24; g++) {
    const st = G.init({ n: 9, seed: 1300 + g * 17, cfg: { ver: 'b' } }), hard = g % 9, rr = G.sampler(g + 4); let guard = 0;
    while (!G.over(st) && guard++ < 3000) { const s = G.needs(st)[0]; ap(st, s, G.ai(G.view(st, s), s, s === hard ? 'hard' : 'easy', rr)); }
    for (let i = 0; i < 9; i++) { if (i === hard) { hs += st.score[i]; hn++; } else { es += st.score[i]; en++; } }
  }
  console.log(`  [방송대로] 어려운 1 : 쉬운 8 평균 점수 ${(hs / hn).toFixed(1)} : ${(es / en).toFixed(1)}`);
  ok(hs / hn > es / en + 20, '방송대로: 어려운 AI 1명이 쉬운 AI 8명보다 훨씬 높아요');
}
{
  // 숨은 정보: 남의 제시 · 광산에 남은 순서를 바꿔도 보이는 것 · AI · 선생님 · 복기 비교가 같아요
  const base = mkB(53); bidAll(base, s => 2 + s % 5); apB(base, base.miners[0], 3);
  ok(base.phase === 'mine' && base.hist.length === 0, '(숨은 정보 시험 준비: 아직 채굴 중)');
  const pres = 4, alt = clone(base); alt.bag.reverse(); for (const s of Object.keys(alt.bids)) if (+s !== pres) alt.bids[s] = 50 - alt.bids[s];
  const cur = G.needs(base)[0], va = G.view(base, cur), vb = G.view(alt, cur);
  ok(va.pub === vb.pub && JSON.stringify(va.left) === JSON.stringify(vb.left) && va.bids === null && vb.bids === null, '방송대로 광부: 광산 순서 · 제시 점수가 달라도 보이는 것은 같아요');
  for (const tier of ['easy', 'normal', 'hard']) ok(JSON.stringify(G.ai(va, cur, tier, G.sampler(9))) === JSON.stringify(G.ai(vb, cur, tier, G.sampler(9))), `방송대로 광부 ${tier} AI 는 보이는 것만 써요`);
  ok(JSON.stringify(G.coach(va, cur, 0, null)) === JSON.stringify(G.coach(vb, cur, 0, null)), '방송대로 광부 선생님도 같아요');
  const wait = base.miners.find(s => s !== cur);
  for (const seat of [wait, pres]) ok(JSON.stringify(G.coach(G.view(base, seat), seat, 0, null)) === JSON.stringify(G.coach(G.view(alt, seat), seat, 0, null)), `${seat}번 선생님(기다림)도 남의 제시 · 광산 순서에 영향받지 않아요`);
  const cmpA = G.compareMineB(va, cur, { t: 'draw', n: 5 }, { t: 'stop' }, 77, 300), cmpB = G.compareMineB(vb, cur, { t: 'draw', n: 5 }, { t: 'stop' }, 77, 300);
  ok(cmpA && JSON.stringify(cmpA) === JSON.stringify(cmpB), '복기 비교(5개 vs 스톱)도 보이는 것만 써요');
  ok(G.compareMineB(va, cur, { t: 'draw', n: 2 }, { t: 'draw', n: 2 }, 1, 100) === null && G.compareMineB(va, cur, { t: 'draw', n: 99 }, { t: 'stop' }, 1, 100) === null && G.compareMineB(va, cur, { t: 'bid', v: 3 }, { t: 'stop' }, 1, 100) === null && G.compareMineB(G.view(base, wait), wait, { t: 'draw', n: 2 }, { t: 'stop' }, 1, 100) === null, '같은 수 · 못 두는 수 · 내 차례 아님은 null');
  ok(G.pBust(49, 5, 1, 3) === 0 && Math.abs(G.pBust(49, 5, 49, 3) - 1) < 1e-9 && Math.abs(G.pBust(10, 3, 1, 1) - 0.3) < 1e-9 && G.pBust(49, 5, 3, 3) > 0.0005 && G.pBust(49, 5, 3, 3) < 0.0015, '폭탄이 3개 이상 될 확률(초기하분포) 계산');
  // 선생님: 내 차례 추천은 'N개 꺼내요' 또는 스톱 + 폭탄 확률
  const cc = G.coach(va, cur, 0, null); ok(/꺼내|스톱/.test(cc.rec) && /폭탄/.test(cc.why) && /득실/.test(cc.why), '방송대로 선생님: 추천 · 폭탄 확률 · 득실');
  ok(/꺼냈어요|꺼냈/.test(cc.opp), '방송대로 선생님: 방금 꺼낸 것을 보여줘요');
}
// 13) 옛 복기 호환 — cfg 에 ver 가 없으면 옛 core 와 같은 seed · 같은 행동으로 같은 판 (상태 전체 JSON 같음)
{
  const Old = require('./gn-miner_legacy_core.js');
  const strip = st => JSON.stringify(st, (k, v) => (k === 'cfg' ? undefined : v));
  let steps = 0, aiSame = 0, coachSame = 0, games = 0;
  for (const [label, cfgOld, cfgNew, exact] of [['cfg 없음', undefined, undefined, true], ['cfg {}', {}, {}, true], ['cfg groups', { groups: GR }, { groups: GR }, true], ['ver "a"', { groups: GR }, { groups: GR, ver: 'a' }, false], ['ver 다른 값', {}, { ver: 'x' }, false]]) {
    for (let g = 0; g < 8; g++) {
      const seed = 300 + g * 31, stO = Old.init({ n: 9, seed, cfg: cfgOld ? clone(cfgOld) : cfgOld }), stN = G.init({ n: 9, seed, cfg: cfgNew ? clone(cfgNew) : cfgNew });
      const T = [...Array(9).keys()].map(i => ['hard', 'normal', 'easy'][(i + g) % 3]), rr = Old.sampler(g * 7 + 3);
      const same = () => (exact ? JSON.stringify(stO) === JSON.stringify(stN) : strip(stO) === strip(stN));
      let bad = '', guard = 0;
      if (!same()) bad = '처음 상태가 달라요';
      while (!bad && !Old.over(stO) && guard++ < 3000) {
        if (JSON.stringify(Old.needs(stO)) !== JSON.stringify(G.needs(stN))) { bad = 'needs 다름'; break; }
        const s = Old.needs(stO)[0], VO = Old.view(stO, s), VN = G.view(stN, s);
        if (VO.pub !== VN.pub) { bad = 'pub 지문이 달라요'; break; }
        if (JSON.stringify(Old.legal(stO, s)) !== JSON.stringify(G.legal(stN, s))) { bad = 'legal 다름'; break; }
        if (guard % 4 === 0) for (const tier of ['easy', 'normal']) { const ao = Old.ai(VO, s, tier, Old.sampler(guard + g)), an = G.ai(VN, s, tier, G.sampler(guard + g)); if (JSON.stringify(ao) !== JSON.stringify(an)) bad = `${tier} AI 가 옛 core 와 달라요`; else aiSame++; }
        if (guard % 9 === 0) { const ao = Old.ai(VO, s, 'hard', Old.sampler(guard * 3 + g)), an = G.ai(VN, s, 'hard', G.sampler(guard * 3 + g)); if (JSON.stringify(ao) !== JSON.stringify(an)) bad = 'hard AI 가 옛 core 와 달라요'; else aiSame++; }
        if (guard % 11 === 0) { const co = JSON.stringify(Old.coach(VO, s, 0, null)), cn = JSON.stringify(G.coach(VN, s, 0, null)); if (co !== cn) bad = '선생님 글이 옛 core 와 달라요'; else coachSame++; }
        if (bad) break;
        // 엉뚱한 행동(거절)도 결과 · 상태가 같아요
        for (const wrong of [{ t: 'draw', n: 3 }, { t: 'bid', v: 99 }, { t: 'stop' }, { t: 'wat' }, null]) {
          const snap = JSON.stringify(stN), ro = Old.apply(stO, (s + 4) % 9, wrong), rn = G.apply(stN, (s + 4) % 9, wrong);
          if (JSON.stringify(ro) !== JSON.stringify(rn)) { bad = `엉뚱한 행동 결과 달라요 ${JSON.stringify(wrong)}`; break; }
          if (!same()) { bad = '엉뚱한 행동 뒤 상태가 달라요'; break; }
          if (!ro.ok && JSON.stringify(stN) !== snap) { bad = '거절된 행동이 상태를 바꿨어요'; break; }
        }
        if (bad) break;
        const a = Old.ai(VO, s, T[s], rr), ro = Old.apply(stO, s, JSON.parse(JSON.stringify(a))), rn = G.apply(stN, s, JSON.parse(JSON.stringify(a)));
        steps++;
        if (JSON.stringify(ro) !== JSON.stringify(rn)) { bad = `apply 결과가 달라요 ${JSON.stringify(a)}`; break; }
        if (!same()) { bad = `${steps}수 뒤 상태가 달라요`; break; }
      }
      ok(!bad && G.over(stN) && Old.over(stO) && JSON.stringify(Old.ranks(stO)) === JSON.stringify(G.ranks(stN)) && same(), `${label} ${g}판: 옛 core 와 같은 판 (${bad || '끝 상태 · 순위까지'})`);
      games++;
    }
  }
  console.log(`  [옛 복기 호환] ${games}판 · ${steps}수 같음 · AI ${aiSame}번 같음 · 선생님 ${coachSame}번 같음`);
  const sN = G.init({ n: 9, seed: 5, cfg: {} }); ok(!('grabs' in sN) && G.view(sN, 0).ver === 'a' && G.view(sN, 0).grabs.length === 0, 'ver 가 없는 판은 상태에 새 칸이 없고 view 는 a(예전)로 알려요');
  const sB = G.init({ n: 9, seed: 5, cfg: { ver: 'b' } }); ok(G.view(sB, 0).ver === 'b' && JSON.stringify(sB.groups) === JSON.stringify(sN.groups) && JSON.stringify(sB.bag) === JSON.stringify(sN.bag), '같은 seed 는 판 번호만 다르고 조 편성 · 광산 순서는 같아요');
  // 옛 판에는 n 이 들어가도 한 개씩 (복기에 n 이 없으니 같은 행동이면 같은 판)
  const sA = mk(61); bidAll(sA, 3); const before = sA.bag.length; ap(sA, sA.miners[0], { t: 'draw', n: 5 }); ok(sA.bag.length === before - 1, 'ver 없는 옛 판에서는 draw 가 n 과 상관없이 1개');
}
console.log(`gn-miner selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

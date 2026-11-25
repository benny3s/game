// 의심 베팅 규칙 시험 (node survival/test/doubtbet_selftest.js [--quick])
'use strict';
const C = require('../games/doubtbet/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 30000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
const tot = st => st.pc.reduce((a, b) => a + b, 0) + st.chips.reduce((a, b) => a + b, 0);
// 정해진 손으로 라운드 만들기 (hands: 자리별 카드)
function rig(st, hands) { st.hands = hands.map(h => h.slice()); }

// 1) 시작
{
  const st = C.init({ n: 5, seed: 7 });
  ok(st.n === 5 && st.round === 1 && st.phase === 'bid' && st.pc.every(x => x === 5) && st.chips.every(x => x === 4), '5명 · 피스 5 · 슬롯칩 4 · 바로 선언');
  ok(st.hands.every(h => h.length === 5) && C.view(st, -1).total === 25, '슬롯 5개마다 카드 1장 · 테이블 25장');
  const all = st.hands.flat(); ok(all.every(x => x >= 0 && x <= 5) && [0, 1, 2, 3, 4, 5].every(c => all.filter(x => x === c).length <= 10), '카드 6색 · 색마다 10장 이하');
  ok(st.cur === st.starter && C.needs(st).length === 1 && C.needs(st)[0] === st.starter, '선부터');
  ok(C.init({ n: 9, seed: 1 }).n === 6 && C.init({ n: 2, seed: 1 }).n === 3, '인원 3~6');
  ok(C.init({ n: 4, seed: 1, cfg: { pieces: 8 } }).pc[0] === 8 && C.init({ n: 4, seed: 1, cfg: { pieces: 3 } }).pc[0] === 5, '시작 피스 옵션');
  ok(C.init({ n: 5, seed: 1 }).goal === 3 && C.init({ n: 3, seed: 1 }).goal === 2 && C.init({ n: 6, seed: 1 }).goal === 4, '남을 인원 = 인원 − 2 (최소 2)');
  ok(J(C.init({ n: 5, seed: 7 }).hands) === J(st.hands) && J(C.init({ n: 5, seed: 8 }).hands) !== J(st.hands), '씨앗 결정적');
}
// 2) 보기 · 숨김
{
  const st = C.init({ n: 4, seed: 3 });
  const V0 = C.view(st, 0), V1 = C.view(st, 1), W = C.view(st, -1);
  ok(J(V0.hand) === J(st.hands[0]) && J(V1.hand) === J(st.hands[1]) && W.hand.length === 0, '내 카드만');
  ok(!('hands' in V0) && !J(V0).includes('"hands"'), '남의 카드 안 실림');
  ok(V0.pub === V1.pub && V1.pub === W.pub, '자리마다 같은 pub');
  const s0 = J(st), b = st.starter, o = (b + 1) % 4;
  ok(!C.apply(st, o === b ? 0 : o, { t: 'bid', c: 0, cnt: 3, amt: 1 }).ok && J(st) === s0, '차례 아닌 사람 막고 그대로');
  ok(!C.apply(st, b, { t: 'bid', c: 5, cnt: 3, amt: 1 }).ok && !C.apply(st, b, { t: 'bid', c: 0, cnt: 0, amt: 1 }).ok && !C.apply(st, b, { t: 'bid', c: 0, cnt: 21, amt: 1 }).ok, '레인보우 · 0장 · 21장 선언 막음');
  ok(!C.apply(st, b, { t: 'bid', c: 0, cnt: 3, amt: 0 }).ok && !C.apply(st, b, { t: 'bid', c: 0, cnt: 3, amt: 10 }).ok && !C.apply(st, b, { t: 'doubt' }).ok && J(st) === s0, '베팅 0 · 가진 것보다 많이 · 첫 선언 의심 막음');
}
// 3) 선언 · 인정 (앞사람 베팅 돌려줌) · 의심 → 콜 → 공개
{
  const st = C.init({ n: 3, seed: 5 }), o = st.seat, a = st.starter, b = C.view(st, -1).order[(o.indexOf(a) + 1) % 3], c = o[(o.indexOf(a) + 2) % 3];
  rig(st, [[0, 0, 5, 1, 2], [0, 3, 4, 4, 1], [5, 2, 2, 3, 0]].map((h, i) => h));   // 빨강(0)+🌈(5) = 6장
  ok(C.apply(st, a, { t: 'bid', c: 0, cnt: 4, amt: 2 }).ok && st.pc[a] === 3 && st.cur === b, '선언 · 베팅 2 떼고 다음 사람');
  ok(!C.apply(st, b, { t: 'bid', c: 1, cnt: 4, amt: 1 }).ok, '인정하면 더 많은 장수만');
  ok(C.apply(st, b, { t: 'bid', c: 0, cnt: 6, amt: 1 }).ok && st.pc[a] === 5 && st.pc[b] === 4 && st.prev.length === 1, '인정 → 앞사람 베팅 돌려줌');
  ok(C.apply(st, c, { t: 'doubt' }).ok && st.phase === 'duel' && C.needs(st)[0] === c, '의심 → 의심한 사람부터');
  ok(!C.apply(st, c, { t: 'fold' }).ok, '의심한 사람은 처음에 포기 못 함');
  const before = tot(st) + 1;   // b 의 베팅 1 은 판돈에
  ok(C.apply(st, c, { t: 'call' }).ok && st.phase === 'show', '콜 → 공개');
  ok(st.last.have === 6 && st.last.win === b && st.last.lose === c && !st.last.fold && st.last.cards.length === 3, '빨강 + 🌈 = 6 ≥ 6 → 선언한 사람 승');
  ok(st.pc[b] === 6 && st.pc[c] === 4 && tot(st) === before, '판돈 1 이동 · 합 그대로');
  ok(C.view(st, a).last.cards && C.needs(st).length === 0 && C.auto(st) > 0, '공개 카드는 모두에게 · 잠깐 뒤 다음 라운드');
  C.advance(st);
  ok(st.round === 2 && st.starter === c && st.cur === c && st.phase === 'bid', '다음 라운드 선 = 의심에서 진 사람');
}
// 4) 선언이 틀림 → 의심한 사람 승 · 슬롯칩을 잃으면 슬롯이 줄고, 얻은 칩은 피스로
{
  const st = C.init({ n: 3, seed: 9 }), o = st.seat, a = st.starter, b = o[(o.indexOf(a) + 1) % 3];
  st.pc[a] = 1;   // 피스 1 + 슬롯칩 4
  rig(st, [[1, 1, 1, 1, 1], [1, 1, 2, 2, 2], [3, 3, 3, 4, 4]]);
  ok(C.apply(st, a, { t: 'bid', c: 0, cnt: 2, amt: 3 }).ok && st.pc[a] === 0 && st.chips[a] === 2, '피스부터 쓰고 모자라면 슬롯칩');
  ok(C.apply(st, b, { t: 'doubt' }).ok && C.apply(st, b, { t: 'call' }).ok, '의심 · 콜');
  ok(st.last.have === 0 && st.last.win === b && st.last.lostC === 2 && st.last.lostP === 1, '빨강 0장 < 2 → 의심 승');
  ok(st.chips[a] === 2 && st.pc[b] === 5 - 3 + 3 + 3 && st.chips[b] === 4, '진 사람 슬롯칩 4 → 2 · 이긴 사람은 칩을 피스로 (+3)');
  C.advance(st);
  ok(st.phase === 'bid' && st.hands[a].length === 3 && st.starter === a, '슬롯 3개 → 카드 3장 (피스가 없어 사기 단계 없음) · 진 사람이 선');
}
// 5) 슬롯 사기
{
  const st = C.init({ n: 3, seed: 11 }), s = st.seat[0];
  st.chips[s] = 1; st.pc[s] = 2; st.phase = 'show'; st.duel = null; st.starter = s;
  C.advance(st);
  ok(st.phase === 'buy' && J(C.needs(st)) === J([s]), '슬롯이 5개 아래이고 피스가 있으면 사기 단계');
  ok(!C.apply(st, s, { t: 'buy', k: 3 }).ok && C.apply(st, s, { t: 'buy', k: 2 }).ok, '가진 피스만큼만');
  ok(st.pc[s] === 0 && st.chips[s] === 3 && st.hands[s].length === 4 && st.phase === 'bid', '피스 2 → 슬롯 2 · 카드 4장');
  // 둘이 같이 정할 때: 먼저 정한 사람의 선택은 남에게 안 보이고, 모두 정하면 한꺼번에 반영
  const s2 = C.init({ n: 3, seed: 12 }), [x, y] = s2.seat;
  s2.chips[x] = 2; s2.chips[y] = 3; s2.phase = 'show'; s2.duel = null; C.advance(s2);
  ok(s2.phase === 'buy' && C.needs(s2).length === 2, '둘 다 사기 차례');
  const pub0 = C.view(s2, y).pub;
  C.apply(s2, x, { t: 'buy', k: 2 });
  const Vy = C.view(s2, y);
  ok(Vy.buy[x] === -1 && Vy.pc[x] === 5 && Vy.chips[x] === 2 && C.view(s2, x).buy[x] === 2 && Vy.pub === C.view(s2, x).pub, '먼저 정한 선택 숨김 (정함만)');
  ok(Vy.pub !== pub0, '정함 여부는 pub 에');
  C.apply(s2, y, { t: 'buy', k: 0 });
  ok(s2.phase === 'bid' && s2.pc[x] === 3 && s2.chips[x] === 4 && s2.hands[x].length === 5 && C.view(s2, y).buy[x] === 2, '모두 정하면 반영 · 카드 나눔');
}
// 6) 레이즈 → 포기 (카드 안 깜) · 올인
{
  const st = C.init({ n: 3, seed: 13 }), o = st.seat, a = st.starter, b = o[(o.indexOf(a) + 1) % 3];
  C.apply(st, a, { t: 'bid', c: 2, cnt: 5, amt: 1 }); C.apply(st, b, { t: 'doubt' });
  ok(C.apply(st, b, { t: 'raise', to: 3 }).ok && C.needs(st)[0] === a && st.pc[b] === 2, '의심한 사람 레이즈 3');
  ok(!C.apply(st, a, { t: 'raise', to: 3 }).ok, '레이즈는 상대보다 많이');
  ok(C.apply(st, a, { t: 'fold' }).ok && st.last.fold && st.last.cards === null && st.last.win === b && st.last.m === 1, '포기 → 카드 안 깜 · 낸 1만 잃음');
  ok(st.pc[a] === 4 && st.pc[b] === 6, '피스 이동 (선언 −1 · 의심 +1)');
  const s2 = C.init({ n: 3, seed: 17 }), a2 = s2.starter, b2 = s2.seat[(s2.seat.indexOf(a2) + 1) % 3];
  s2.pc[b2] = 0; s2.chips[b2] = 1;   // 의심한 사람: 칩 1개뿐
  C.apply(s2, a2, { t: 'bid', c: 0, cnt: 3, amt: 4 }); C.apply(s2, b2, { t: 'doubt' });
  ok(!C.apply(s2, b2, { t: 'call' }).ok && C.apply(s2, b2, { t: 'allin' }).ok && s2.phase === 'show' && s2.last.m === 1, '콜할 만큼 없으면 올인 → 넣은 만큼만 겨룸');
  ok(s2.pc[a2] + s2.chips[a2] === (s2.last.win === a2 ? 10 : 8), '올인: 넘친 몫은 돌려줌');
}
// 7) 탈락 · 선 넘김 · 피스 내기 · 자리 추첨 · 끝
{
  const st = C.init({ n: 4, seed: 21 }), o = st.seat, a = st.starter, b = o[(o.indexOf(a) + 1) % 4];
  st.pc[b] = 0; st.chips[b] = 1;
  rig(st, [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]);
  C.apply(st, a, { t: 'bid', c: 0, cnt: 20, amt: 1 }); C.apply(st, b, { t: 'doubt' }); C.apply(st, b, { t: 'call' });
  ok(st.out[b] && st.outAt[b] === 1 && st.starter === a, '빈손 → 탈락 · 선은 탈락한 사람 직전 순서');
  C.advance(st);
  ok(!C.needs(st).includes(b) && st.hands[b].length === 0 && C.view(st, -1).total === 15, '탈락한 사람은 카드 없음');
  // 피스 내기 (15라운드)
  const s2 = C.init({ n: 3, seed: 23 }); s2.round = 15; s2.phase = 'show'; const p0 = s2.pc.slice();
  C.advance(s2);
  ok(J(s2.pc) === J(p0.map(x => x - 1)) && s2.round === 16, '15라운드 끝에 피스 1개씩');
  const s3 = C.init({ n: 3, seed: 23 }); s3.round = 16; s3.phase = 'show'; const p3 = s3.pc.slice(); C.advance(s3);
  ok(J(s3.pc) === J(p3), '16라운드는 안 냄');
  const s4 = C.init({ n: 5, seed: 29 }); s4.round = 10; s4.phase = 'show'; const seat0 = J(s4.seat); C.advance(s4);
  ok(s4.round === 11 && J(s4.seat) !== seat0 && s4.log.some(e => e.k === 'reseat'), '10라운드마다 자리 추첨');
  // 끝: 인원 − 2 남으면
  const s5 = C.init({ n: 5, seed: 31 }); s5.out[0] = s5.out[1] = true; s5.phase = 'show'; C.advance(s5);
  ok(s5.over && s5.end === 'left' && s5.final[0] === -1 && s5.final[2] === s5.pc[2] + s5.chips[2] + 1, '3명 남으면 끝 · 최종 = 피스 + 슬롯');
  const R = C.ranks(s5); ok(R[0] > R[2] && R[1] > R[2], '탈락한 사람은 아래');
  const s6 = C.init({ n: 3, seed: 1, cfg: { rounds: 20 } }); s6.round = 20; s6.phase = 'show'; C.advance(s6);
  ok(s6.over && s6.end === 'rounds', '라운드 상한');
  ok(!C.apply(s6, 0, { t: 'buy', k: 0 }).ok && C.needs(s6).length === 0, '끝나면 막음');
}
// 8) AI · 보기 그대로 · 추천 = 고급 · 합법 · 결정적
{
  const seeds = QUICK ? [1, 2] : [1, 2, 3, 4, 5];
  for (const sd of seeds) {
    const n = 3 + (sd % 4), tiers = Array.from({ length: n }, (_, i) => ['hard', 'normal', 'easy'][(i + sd) % 3]);
    let chk = 0;
    const st = playAI(sd, tiers, sd % 2 ? { rounds: 20 } : {}, (s, seat, V, V0, a) => {
      ok(J(V) === V0, '보기 자체 그대로');
      if (chk++ % 7) return;
      ok(C.legal(s, seat).some(x => J(x) === J(a)) || (a.t === 'raise' && C.legal(s, seat).some(x => x.t === 'raise' && x.to === a.to)), `AI 수가 합법 목록에 ${J(a)}`);
      if (tiers[seat] === 'hard') {
        const R = C.recommend(V, seat);
        ok(J(C.ai(V, seat, 'hard', mul(9))) === J(a) && R && J(R.a) === J(a), '고급 rnd 무시 · 추천 = 고급');
        const Jd = C.judge(V, seat, a, a); ok(Jd && (Jd.kind !== 'bid' || Math.abs(Jd.my - Jd.best) < 1e-9), '복기 판정');
      }
    });
    const st2 = playAI(sd, tiers, sd % 2 ? { rounds: 20 } : {});
    ok(J(st.pc) === J(st2.pc) && st.round === st2.round, `씨앗 ${sd} 결정적 · ${st.round}라운드 · ${n}명`);
    // 피스 + 슬롯칩 합 = 시작 합 − 낸 피스 (판돈은 옮기기만 하고, 슬롯 사기는 피스 → 칩)
    const paid = st.log.filter(e => e.k === 'fee').reduce((a, e) => a + (e.n || 0), 0);
    ok(tot(st) === n * 9 - paid, `합 = 시작 합 − 낸 피스 ${tot(st)} / ${n * 9} − ${paid}`);
  }
}
// 9) 확률: 초기하 꼬리
{
  ok(Math.abs(C.tail(55, 20, 10, 0) - 1) < 1e-12 && C.tail(55, 20, 10, 11) === 0, '꼬리 끝값');
  let e = 0; for (let x = 1; x <= 10; x++) e += C.tail(55, 20, 10, x);
  ok(Math.abs(e - 10 * 20 / 55) < 1e-9, '기대값 = U·K/N ' + e.toFixed(4));
  const V = { hand: [1, 1, 5, 0, 2], total: 25, prev: [], bid: null };
  ok(C.probOf(V, 0, 1, 3) === 1 && C.probOf(V, 0, 1, 4) < 1 && C.infoOf(V, 1).mine === 3, '내 손 노랑 2 + 🌈 1 = 3장은 확실');
}
// 10) 실력: 고급 > 보통 > 쉬움 (짝 비교, tier_bench 와 같은 셈)
{
  const N = QUICK ? 30 : 90;
  for (const [A, B, need] of [['hard', 'easy', 0.65]].concat(QUICK ? [] : [['hard', 'normal', 0.5], ['normal', 'easy', 0.5]])) {
    let pair = 0;
    for (let g = 0; g < N; g++) {
      const n = 5, hs = g % n, T = Array(n).fill(B); T[hs] = A;
      const st = playAI(101 + g * 13, T, {}), R = C.ranks(st);
      let p = 0; for (let j = 0; j < n; j++) if (j !== hs) p += R[j] > R[hs] ? 1 : R[j] === R[hs] ? 0.5 : 0;
      pair += p / (n - 1);
    }
    console.log(`· ${A} vs ${B} 5명 짝 승률 ${(pair / N * 100).toFixed(0)}% (${N}판)`);
    ok(pair / N >= need, `${A} 이 ${B} 를 이김 ${(pair / N).toFixed(2)}`);
  }
}
console.log(`doubtbet selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

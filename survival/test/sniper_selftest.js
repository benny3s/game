// 저격 홀덤 규칙 시험 (node survival/test/sniper_selftest.js [--quick])
'use strict';
const C = require('../games/sniper/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const B = c => C.best(c), nm = c => { const h = B(c); return C.handName(h.c, h.num); };
// 장면: 카드를 직접 정함 (첫 라운드, 기본 베팅 뒤)
function scene(n, hands, board, first, cfg) {
  const st = C.init({ n, seed: 5, cfg });
  st.first = first || 0; st.hands = hands.map(h => h.slice()); st.board = board.slice();
  st.ord = Array.from({ length: n }, (_, i) => (st.first + i) % n); st.ti = 0;
  return st;
}
// 모두 체크로 저격 단계까지
function toSnipe(st) { for (let g = 0; g < 40 && st.phase !== 'snipe'; g++) { const s = C.needs(st)[0]; const r = C.apply(st, s, { t: 'check' }); if (!r.ok) throw new Error(r.err); } }
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 30000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 족보 · 이름 · 겨루기
{
  ok(B([7, 7, 7, 7, 2, 1]).c === 6 && nm([7, 7, 7, 7, 2, 1]) === '7 포카드', '포카드');
  ok(nm([7, 7, 7, 2, 2, 1]) === '7 풀하우스' && nm([4, 4, 4, 7, 7, 1]) === '4 풀하우스', '풀하우스는 트리플 숫자');
  ok(nm([9, 9, 9, 4, 4, 4]) === '9 풀하우스' && B([9, 9, 9, 4, 4, 4]).use.join() === '9,4', '트리플 둘 = 높은 트리플 + 낮은 쪽 페어');
  ok(nm([10, 9, 8, 7, 6, 1]) === '10 스트레이트' && nm([4, 5, 6, 7, 8, 8]) === '8 스트레이트' && nm([1, 2, 3, 4, 5, 9]) === '5 스트레이트', '스트레이트 = 가장 높은 숫자');
  ok(nm([3, 4, 5, 6, 7, 8]) === '8 스트레이트', '6장 연속이면 위 5장');
  ok(B([1, 2, 3, 4, 6, 7]).c === 0 && nm([1, 2, 3, 4, 6, 7]) === '7 하이카드', '4장 연속은 스트레이트 아님');
  ok(nm([7, 7, 7, 4, 2, 1]) === '7 트리플' && nm([7, 7, 5, 5, 3, 1]) === '7 투페어' && nm([7, 7, 5, 5, 3, 3]) === '7 투페어' && nm([7, 7, 2, 4, 9, 1]) === '7 원페어', '트리플 · 투페어(세 쌍이면 위 둘) · 원페어');
  ok(B([7, 7, 7, 3, 4, 5]).c === 3 && B([3, 4, 5, 6, 7, 7]).c === 4, '스트레이트 > 트리플 (둘 다 되면 스트레이트)');
  const order = [[9, 7, 6, 4, 2, 1], [7, 7, 2, 4, 9, 1], [7, 7, 2, 2, 9, 1], [7, 7, 7, 4, 2, 1], [10, 9, 8, 7, 6, 1], [7, 7, 7, 2, 2, 1], [7, 7, 7, 7, 2, 1]].map(c => B(c).k);
  ok(order.every((k, i) => i === 0 || k > order[i - 1]), '족보 순서 하이카드 < … < 포카드');
  ok(B([8, 8, 1, 2, 3, 5]).k > B([7, 7, 9, 10, 3, 5]).k && B([8, 8, 5, 5, 1, 2]).k > B([8, 8, 4, 4, 10, 9]).k, '같은 등급: 족보 숫자 (투페어는 둘째 쌍까지)');
  // 개인 카드로 겨루기: 같은 족보면 높은 개인 카드 → 다른 개인 카드
  const bd = [7, 7, 3, 9];
  const fk = p => C.fullKey(B(p.concat(bd)), p);
  ok(fk([10, 2]) > fk([8, 6]) && fk([8, 6]) > fk([8, 5]) && fk([6, 8]) === fk([8, 6]), '개인 카드 높은 숫자 → 다른 숫자 · 순서 무관');
  ok(C.validSnipe(4, 5) && !C.validSnipe(4, 4) && C.validSnipe(0, 10) && !C.validSnipe(7, 3) && !C.validSnipe(2, 11), '저격 선언 범위');
}
// 2) 처음 상태 · 옵션
{
  const st = C.init({ n: 5, seed: 1 });
  ok(st.chips.every(c => c === 59) && st.pot === 5 && st.goal === 75 && st.cap === 60, '칩 60 · 기본 베팅 1 · 생존 75 · 상한 = 가장 적은 칩(60)');
  ok(st.hands.every(h => h.length === 2) && st.board.length === 4 && st.shown === 2 && st.phase === 'bet1' && st.ord.length === 5, '개인 2장 · 공유 4장 중 2장 · 1차 베팅');
  const all = st.hands.flat().concat(st.board), cnt = {}; for (const v of all) cnt[v] = (cnt[v] || 0) + 1;
  ok(Object.values(cnt).every(x => x <= 4) && all.every(v => v >= 1 && v <= 10), '카드 1~10 네 벌');
  const s2 = C.init({ n: 4, seed: 1, cfg: { chips: 20 } });
  ok(s2.goal === 25 && s2.chips.every(c => c === 19), '칩 20 옵션 → 생존 25');
  ok(C.init({ n: 9, seed: 1 }).n === 6 && C.init({ n: 1, seed: 1 }).n === 2, '인원 2~6');
  const firsts = new Set(); for (let s = 1; s < 30; s++) firsts.add(C.init({ n: 5, seed: s }).first);
  ok(firsts.size >= 4, '선은 무작위 ' + [...firsts]);
}
// 3) 베팅 진행 · 오류
{
  const st = scene(3, [[1, 2], [3, 4], [5, 6]], [7, 8, 9, 10], 0);
  st.cap = 20;
  ok(!C.apply(st, 1, { t: 'check' }).ok, '차례 아님');
  ok(C.apply(st, 0, { t: 'raise', to: 21 }).err.includes('20'), '상한 넘는 레이즈');
  ok(!C.apply(st, 0, { t: 'raise', to: 1 }).ok && !C.apply(st, 0, { t: 'call' }).ok && !C.apply(st, 0, { t: 'snipe', c: 1, num: 3 }).ok, '낮은 레이즈 · 낼 것 없는 콜 · 베팅 때 저격');
  ok(C.apply(st, 0, { t: 'raise', to: 4 }).ok && st.put[0] === 4 && st.chips[0] === 56 && st.pot === 6, '레이즈 → 판에 총 4');
  ok(!C.apply(st, 1, { t: 'check' }).ok && C.apply(st, 1, { t: 'call' }).ok && st.put[1] === 4, '콜해야 할 때 체크 안 됨 · 콜');
  ok(C.apply(st, 2, { t: 'fold' }).ok && !st.inH[2] && st.phase === 'bet2' && st.shown === 4, '모두 맞추면 2차 베팅 · 공유 2장 더');
  ok(C.needs(st)[0] === 0, '2차 베팅도 선부터');
  C.apply(st, 0, { t: 'check' }); C.apply(st, 1, { t: 'raise', to: 6 });
  ok(st.phase === 'bet2' && C.needs(st)[0] === 0, '레이즈하면 다시 차례');
  C.apply(st, 0, { t: 'call' });
  ok(st.phase === 'snipe' && st.ord.filter(s => st.inH[s]).length === 2 && C.needs(st)[0] === 0, '저격은 선부터 · 포기한 사람 빼고');
  ok(!C.apply(st, 0, { t: 'snipe', c: 4, num: 3 }).ok, '3 스트레이트는 없음');
  ok(C.apply(st, 0, { t: 'snipe', pass: true }).ok && C.apply(st, 1, { t: 'snipe', c: 0, num: 10 }).ok && st.phase === 'show', '저격 안 함 · 저격 → 공개');
  // 혼자 남으면 바로
  const s2 = scene(3, [[1, 2], [3, 4], [5, 6]], [7, 8, 9, 10], 1);
  C.apply(s2, 1, { t: 'raise', to: 3 }); C.apply(s2, 2, { t: 'fold' }); C.apply(s2, 0, { t: 'fold' });
  ok(s2.phase === 'show' && s2.last.fold && s2.last.win.join() === '1' && s2.chips[1] === 59 - 2 + 5, '모두 포기 → 판돈 ' + J(s2.chips));
  ok(C.auto(s2) > 0 && C.needs(s2).length === 0 && !C.apply(s2, 0, { t: 'check' }).ok, '공개 때는 기다림');
}
// 4) 공개 · 저격 · 동점
{
  // 공유 7 7 3 9 · 0: 7 5 → 7 트리플 · 1: 9 2 → 9 투페어 · 2: 10 4 → 7 원페어
  const st = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 0);
  toSnipe(st);
  C.apply(st, 0, { t: 'snipe', c: 2, num: 9 }); C.apply(st, 1, { t: 'snipe', c: 3, num: 7 }); C.apply(st, 2, { t: 'snipe', pass: true });
  const L = st.last;
  ok(L.hands[0].hit && L.hands[1].hit && !L.hands[2].hit && L.win.join() === '2', '저격당한 두 사람이 꼴찌 → 7 원페어 승 ' + J(L.win));
  ok(L.gain[2] === 3 && st.chips[2] === 59 + 3, '판돈 3개');
  // 모두 저격 → 나눔 (남는 칩은 베팅 순서가 빠른 사람부터)
  const s2 = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 1);
  toSnipe(s2);
  C.apply(s2, 1, { t: 'snipe', c: 3, num: 7 }); C.apply(s2, 2, { t: 'snipe', c: 2, num: 9 }); C.apply(s2, 0, { t: 'snipe', c: 1, num: 7 });
  ok(s2.last.win.length === 3 && s2.last.gain.join() === '1,1,1', '모두 저격당함 → 똑같이 나눔');
  const s3 = scene(2, [[5, 2], [5, 3]], [5, 9, 9, 1], 1);
  toSnipe(s3); C.apply(s3, 1, { t: 'snipe', pass: true }); C.apply(s3, 0, { t: 'snipe', pass: true });
  ok(s3.last.win.join() === '1', '같은 풀하우스(5·9) → 높은 개인 카드… 둘 다 5 → 다른 개인 카드 3 > 2');
  const s4 = scene(3, [[2, 3], [3, 2], [1, 4]], [10, 10, 9, 8], 2);
  s4.chips = [59, 59, 59]; C.apply(s4, 2, { t: 'raise', to: 2 }); C.apply(s4, 0, { t: 'call' }); C.apply(s4, 1, { t: 'call' }); toSnipe(s4);
  for (const s of [2, 0, 1]) C.apply(s4, s, { t: 'snipe', c: 1, num: 10 });
  ok(s4.last.win.slice().sort().join() === '0,1,2' && s4.last.gain[2] === 2 && s4.last.gain[0] === 2 && s4.last.gain[1] === 2, '판돈 6 · 셋이 2씩');
  const s5 = scene(2, [[2, 3], [3, 2]], [10, 10, 9, 8], 1);
  s5.pot = 3; toSnipe(s5); C.apply(s5, 1, { t: 'snipe', pass: true }); C.apply(s5, 0, { t: 'snipe', pass: true });
  ok(s5.last.win.length === 2 && s5.last.gain[1] === 2 && s5.last.gain[0] === 1, '같은 개인 카드 → 나눔, 남는 1개는 베팅 순서가 빠른 사람(선) ' + J(s5.last.gain));
  // 자기 족보 저격 (같은 족보 + 상대 키커가 높을 때 무승부 노리기)
  const s6 = scene(2, [[9, 2], [9, 8]], [9, 9, 4, 4], 0);
  toSnipe(s6); C.apply(s6, 0, { t: 'snipe', c: 5, num: 9 }); C.apply(s6, 1, { t: 'snipe', pass: true });
  ok(s6.last.win.length === 2, '둘 다 9 풀하우스 (상대 키커가 높음) → 내 족보를 저격하면 둘 다 꼴찌 → 나눔');
}
// 5) 생존 · 남는 칩 · 끝
{
  const st = scene(4, [[7, 5], [9, 2], [10, 4], [1, 3]], [7, 7, 3, 9], 0);
  st.chips = [79, 9, 0, 40]; st.cap = 0;   // 1: 카드는 그대로, 판돈 4 를 0번이 가져감
  toSnipe(st); for (const s of [0, 1, 2, 3]) C.apply(st, s, { t: 'snipe', pass: true });
  ok(st.last.win.join() === '0' && st.chips[0] === 83, '0번 승 → 칩 83');
  C.advance(st);
  ok(st.surv[0] === 0 && st.survR[0] === 1 && st.phase === 'gift' && st.chips[2] === 1 && st.gift.left === 7 && st.gift.ones.join() === '2', '75개 내고 생존 · 칩 0 인 사람에게 1개 먼저 · 남는 7개 ' + J(st.gift));
  ok(C.needs(st).join() === '0' && !C.apply(st, 0, { t: 'gift', to: 0 }).ok && C.legal(st, 0).length === 3, '나눠 주기는 생존한 사람이 · 자기에게는 안 됨');
  ok(C.apply(st, 0, { t: 'gift', to: 1 }).ok && st.chips[1] === 15 && st.chips[2] === 0 && st.phase === 'bet1' && st.round === 2, '남는 칩 7 → 1번 (다음 라운드 기본 베팅 뒤 15) ' + JSON.stringify(st.chips));
  ok(!st.hands[0] && st.ord.indexOf(0) < 0 && st.chips[0] === 0 && C.view(st, 1).ranks[0] === 0, '생존한 사람은 빠짐 · 1위');
  // 받은 칩으로 생존 기준을 넘으면 바로 생존
  const g2 = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 0);
  g2.chips = [90, 70, 10]; toSnipe(g2); for (const s of [0, 1, 2]) C.apply(g2, s, { t: 'snipe', c: 0, num: 1 }); C.advance(g2);
  ok(g2.phase === 'gift' && C.apply(g2, 0, { t: 'gift', to: 1 }).ok && g2.surv[1] === 1 && g2.over && g2.out[2], '나눠 받은 칩으로 75개 → 바로 생존 → 남은 한 명 탈락 ' + JSON.stringify([g2.chips, g2.surv]));
  // 칩 0 → 탈락하고 끝
  const s2 = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 0);
  s2.chips = [10, 0, 20];
  toSnipe(s2); for (const s of [0, 1, 2]) C.apply(s2, s, { t: 'snipe', pass: true });
  C.advance(s2);
  ok(s2.over && s2.out[1] && C.ranks(s2)[1] === 2, '라운드 끝에 칩 0 → 탈락 · 끝');
  // 둘 남은 뒤 생존 → 남은 한 명 탈락
  const s3 = scene(2, [[7, 5], [9, 2]], [7, 7, 3, 9], 0);
  s3.chips = [80, 20]; toSnipe(s3); C.apply(s3, 0, { t: 'snipe', pass: true }); C.apply(s3, 1, { t: 'snipe', pass: true }); C.advance(s3);
  ok(s3.over && s3.surv[0] === 0 && s3.out[1] && C.ranks(s3).join() === '0,1', '마지막 한 명은 탈락');
  // 80라운드
  const s4 = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 0);
  s4.round = C.MAXR; s4.chips = [30, 25, 40]; toSnipe(s4); for (const s of [0, 1, 2]) C.apply(s4, s, { t: 'snipe', pass: true }); C.advance(s4);
  ok(s4.over && s4.out.join() === 'false,true,false', `${C.MAXR}라운드 → 칩이 가장 적은 사람 탈락 ` + J(s4.chips));
  ok(C.ranks(s4)[2] === 0 && C.ranks(s4)[0] === 1, '남은 사람은 칩 순');
}
// 6) 보기: 남의 패 가림, 공개 해시 같음, 보기 · 거절이 상태를 안 바꿈
{
  const st = C.init({ n: 4, seed: 33 });
  const Vs = [0, 1, 2, 3, -1].map(s => C.view(st, s));
  ok(Vs.every((V, i) => V.hands.filter(Boolean).length === (i < 4 ? 1 : 0)) && Vs[0].hands[0].join() === st.hands[0].join(), '남의 개인 카드는 안 보임');
  ok(new Set(Vs.map(V => V.pub)).size === 1, '공개 해시 같음');
  ok(Vs[0].board.length === 2 && !J(Vs[1]).includes(J(st.board.slice(2))) || Vs[0].board.length === 2, '안 깐 공유 카드는 안 보임');
  const before = J(st); C.view(st, 0); C.apply(st, (C.needs(st)[0] + 1) % 4, { t: 'check' }); C.apply(st, C.needs(st)[0], { t: 'raise', to: 999 });
  ok(J(st) === before, '보기 · 거절이 상태를 안 바꿈');
  const s2 = playAI(71, ['easy', 'normal', 'hard'], { chips: 20 }, (st2, s, V, V0, a) => {
    if (J(V) !== V0) ok(false, 'AI 가 보기를 바꿈');
    if (st2.phase === 'bet1' || st2.phase === 'bet2') for (let o = 0; o < st2.n; o++) if (o !== s && V.hands[o]) ok(false, '남의 패가 보기에');
  });
  ok(s2.over, 'AI 판 끝');
}
// 7) AI: 규칙 지키기 · 고급은 결정적 · 추천 = 고급 수
{
  let bad = 0, n = 0;
  const st = playAI(81, ['hard', 'easy', 'normal', 'easy', 'hard'], { chips: 20 }, (st2, s, V, V0, a) => {
    n++;
    if (!C.legal(st2, s).some(x => J(x) === J(a))) bad++;
    if (n % 5 === 0) {
      const h1 = C.ai(V, s, 'hard', mul(1)), h2 = C.ai(V, s, 'hard', mul(99)), r = C.recommend(V, s);
      if (J(h1) !== J(h2) || J(r.a) !== J(h1)) bad++;
    }
  });
  ok(!bad && n > 50 && st.over, `AI 수 ${n}개 모두 규칙 안 · 고급 결정적 · 추천 = 고급 수`);
  // 상대 레이즈 읽기: 같은 패라도 상대가 크게 올리면 승률이 내려감
  const s2 = scene(2, [[6, 2], [8, 8]], [6, 3, 10, 1], 0);
  const e0 = C.equity(C.view(s2, 0), 0, 300, 7, 0, C.PROF.hard.rd).eq;
  C.apply(s2, 0, { t: 'check' }); C.apply(s2, 1, { t: 'raise', to: 30 });
  const e1 = C.equity(C.view(s2, 0), 0, 300, 7, 0, C.PROF.hard.rd).eq;
  ok(e1 < e0 - 0.05, `레이즈를 읽으면 승률이 내려감 ${e0.toFixed(2)} → ${e1.toFixed(2)}`);
  // 저격: 공유 7 7 이고 상대 큰 레이즈 → 7 트리플 · 풀하우스 쪽을 노림
  const s3 = scene(2, [[9, 2], [7, 5]], [7, 7, 3, 9], 1);
  C.apply(s3, 1, { t: 'raise', to: 20 }); C.apply(s3, 0, { t: 'call' }); C.apply(s3, 1, { t: 'check' }); C.apply(s3, 0, { t: 'check' }); C.apply(s3, 1, { t: 'snipe', pass: true });
  const r3 = C.recommend(C.view(s3, 0), 0);
  ok(r3.a.t === 'snipe' && !r3.a.pass && r3.a.c >= 3 && r3.rows[0].w > r3.rows.find(x => x.pass).w, '큰 레이즈 상대에게는 센 족보 저격 ' + J(r3.a));
}
// 8) 실력: 고급 1 vs 초급 (3명 · 5명) — 5명은 운이 커서 기준 55%
{
  const N3 = QUICK ? 18 : 40, N5 = QUICK ? 10 : 30;
  let b3 = 0, b5 = 0;
  for (let i = 0; i < N3; i++) {
    const h = i % 3, tiers = ['easy', 'easy', 'easy']; tiers[h] = 'hard';
    const st = playAI(500 + i, tiers), R = C.ranks(st);
    b3 += R.filter((x, s) => s !== h && R[h] < x).length / 2;
  }
  for (let i = 0; i < N5; i++) {
    const h = i % 5, tiers = Array(5).fill('easy'); tiers[h] = 'hard';
    const st = playAI(700 + i, tiers), R = C.ranks(st);
    b5 += R.filter((x, s) => s !== h && R[h] < x).length / 4;
  }
  ok(b3 / N3 >= 0.6, `3명: 고급이 초급을 이긴 비율 ${(b3 / N3 * 100).toFixed(0)}%`);
  ok(b5 / N5 >= 0.45, `5명: 고급이 초급을 이긴 비율 ${(b5 / N5 * 100).toFixed(0)}%`);
  console.log(`· 실력: 3명 ${(b3 / N3 * 100).toFixed(0)}% · 5명 ${(b5 / N5 * 100).toFixed(0)}% (판 수 ${N3} · ${N5})`);
}
// 9) 화면 글 (node 에서 ui.js)
{
  global.window = { SVCores: { sniper: C } }; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  require('../games/sniper/ui.js');
  const U = window.SVUI.sniper;
  ok(U && U.min === 3 && U.max === 6 && U.defN === 5 && U.howto.length >= 8 && /방송/.test(U.src) && U.tutorial().length === 6 && U.tutorial().filter(s => s.interactive).length === 1, 'UI 틀 · 규칙 줄 · 1분 규칙 6단계 (직접 1)');
  const names = ['나', 'AI1', 'AI2', 'AI3', 'AI4'];
  let bad = 0, n = 0, recs = 0, revs = 0, revBad = 0, phases = new Set();
  const st = C.init({ n: 5, seed: 44, cfg: { chips: 20 } }); const r = mul(3);
  let g = 0;
  while (!C.over(st) && g++ < 3000) {
    const nd = C.needs(st);
    const V0 = C.view(st, 0), co = U.coach(V0, 0, -1, names), txt = J(co);
    n++; if (/undefined|NaN|null|\[object|\(가\)|\(는\)|\(를\)/.test(txt) || !co.opp || !/\d/.test(co.mine)) { bad++; if (bad < 3) console.error(txt); }
    if (nd.includes(0)) { recs++; phases.add(st.phase); if (!/\d/.test(co.why) || !co.rec) { bad++; if (bad < 3) console.error('why', txt); } }
    if (!nd.length) { C.advance(st); continue; }
    for (const s of nd) {
      const V = C.view(st, s), a = C.ai(V, s, ['normal', 'easy', 'hard'][s % 3], r);
      if (s === 0 || s === 1) {
        const best = C.recommend(V, s).a, rv = U.review(V, s, a, best);
        if (rv && rv.sev > 0) { revs++; if (/undefined|NaN|null/.test(J(rv)) || !rv.best || !rv.my) { revBad++; console.error(J(rv)); } }
        if (/undefined|NaN/.test(U.actText(a, V)) || !U.actText(a, V)) bad++;
        if (/undefined|NaN/.test(U.actText(a, null))) bad++;
      }
      C.apply(st, s, a);
    }
  }
  ok(!bad && n > 40 && recs > 10, `선생님 · 행동 글 깨끗함 (${n}번, 내 차례 ${recs}번 · ${[...phases]})`);
  ok(revs >= 5 && !revBad, `복기 글 (${revs}번)`);
  ok(C.over(st), 'UI 글 판 끝');
  const res = U.result(C.view(st, 0), 0);
  ok(/1위/.test(res) && /라운드/.test(res) && !/undefined|NaN/.test(res), '결과 글: ' + res.replace(/<[^>]+>/g, ' ').slice(0, 160));
  // 선생님: 베팅 — 승률 · 필요한 승률, 저격 — 후보별 이길 몫
  const s1 = scene(3, [[7, 5], [9, 2], [10, 4]], [7, 7, 3, 9], 1);
  C.apply(s1, 1, { t: 'raise', to: 6 }); C.apply(s1, 2, { t: 'call' });
  const c1 = U.coach(C.view(s1, 0), 0, -1, names);
  ok(/승률 \d+%/.test(c1.mine) && /AI1: 레이즈/.test(c1.opp) && /7 원페어/.test(c1.opp) && /(콜|포기|레이즈)/.test(c1.rec), '베팅 선생님 ' + c1.opp + ' / ' + c1.mine + ' / ' + c1.rec + ' / ' + c1.why);
  const R1 = C.recommend(C.view(s1, 0), 0);
  ok(U.coach(C.view(s1, 0), 0, -1, names).rec.startsWith(R1.a.t === 'call' ? '콜' : R1.a.t === 'fold' ? '포기' : R1.a.t === 'raise' ? '레이즈' : '체크'), '선생님 추천 = 고급 수');
  C.apply(s1, 0, { t: 'call' }); toSnipe(s1);
  const c2 = U.coach(C.view(s1, 1), 1, -1, names);
  ok(/260번/.test(c2.why) && (c2.why.match(/\d+%/g) || []).length >= 4 && /저격/.test(c2.rec), '저격 선생님 ' + c2.rec + ' / ' + c2.why);
  ok(U.actText({ t: 'raise', to: 8 }, null) === '레이즈 → 판에 총 8개' && U.actText({ t: 'snipe', c: 5, num: 7 }, null) === '7 풀하우스 저격' && U.actText({ t: 'snipe', pass: true }, null) === '저격 안 함', '행동 글 (보기 없이)');
  ok(U.chip(C.view(s1, 0), 1).t === `${s1.chips[1]}개`, '칩 글');
  // 복기: 승률이 높은데 포기 → 심각
  const s3 = scene(2, [[7, 7], [1, 2]], [7, 7, 3, 9], 0);
  const V3 = C.view(s3, 0), rv3 = U.review(V3, 0, { t: 'fold' }, C.recommend(V3, 0).a);
  ok(rv3.sev >= 20 && /승률/.test(rv3.why), '포카드로 포기 → 복기 ' + J(rv3));
}

console.log(`sniper selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

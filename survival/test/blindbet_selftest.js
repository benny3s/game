// 블라인드 베팅 규칙 시험 (node survival/test/blindbet_selftest.js)
'use strict';
const G = require('../games/blindbet/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clone = o => JSON.parse(JSON.stringify(o));
const total = st => st.chips[0] + st.chips[1] + st.pot;
// 판을 손으로 꾸림: 블라인드 · 먼저 베팅할 사람을 정하고 베팅 시작 상태로
function rig(blind, first, seed) {
  const st = G.init({ n: 2, seed: seed || 1, cfg: {} });
  st.blind = blind.slice(); st.first = first; st.bt = first;
  return st;
}
const chk = (st) => { const s = G.needs(st)[0]; return G.apply(st, s, { t: 'call' }); };

// 1) 처음: 칩 30 · 기본 베팅 1칩씩 · 블라인드 보임/숨김
{
  const st = G.init({ n: 2, seed: 5, cfg: {} });
  eq(st.chips, [29, 29], '칩 30 에서 기본 베팅 1칩씩'); eq(st.pot, 2, '판돈 2'); eq(st.bet, [1, 1], '각자 1칩'); eq(st.phase, 'bet', '베팅부터');
  ok(st.first === 0 || st.first === 1, '첫 베팅 자리'); eq(G.needs(st), [st.first], '먼저 베팅할 사람만');
  eq(G.view(st, 0).left, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], '오픈 카드 1~10');
  eq(G.view(st, 0).deckLeft, 22, '블라인드 24장 중 2장 나눠 줌');
  const v0 = G.view(st, 0), v1 = G.view(st, 1), vs = G.view(st, -1), va = G.view(st, 'all');
  eq(v0.blind, [null, st.blind[1]], '내 블라인드는 못 보고 상대 것은 봄'); eq(v1.blind, [st.blind[0], null], '상대 눈에도 마찬가지');
  eq(vs.blind, st.blind, '구경꾼은 둘 다 봄'); eq(va.blind, st.blind, "'all' 은 둘 다 봄");
  ok(st.blind.every(b => b >= 1 && b <= 12), '블라인드 1~12');
  const pubs = new Set([-1, 0, 1, 'all'].map(s => G.view(st, s).pub)); ok(pubs.size === 1, '공개 지문이 자리마다 같음');
}

// 2) 베팅 규칙
{
  const st = rig([4, 6], 0);
  ok(!G.apply(st, 1, { t: 'call' }).ok, '차례 아닌 사람 거절');
  ok(!G.apply(st, 0, { t: 'fold' }).ok, '걸린 칩이 없으면 폴드 거절 (체크 하면 됨)');
  ok(!G.apply(st, 0, { t: 'raise', to: 1 }).ok, '지금과 같은 레이즈 거절'); ok(!G.apply(st, 0, { t: 'raise', to: 0 }).ok, '낮은 레이즈 거절');
  ok(!G.apply(st, 0, { t: 'raise', to: 2.5 }).ok, '소수 레이즈 거절'); ok(!G.apply(st, 0, { t: 'raise', to: 31 }).ok, '남은 칩보다 많이는 거절');
  ok(!G.apply(st, 0, { t: 'dance' }).ok, '모르는 행동 거절'); ok(!G.apply(st, 0, null).ok, '빈 입력 거절');
  ok(G.apply(st, 0, { t: 'raise', to: 4 }).ok, '4칩까지 레이즈'); eq(st.chips, [26, 29], '내 칩 3개 더'); eq(st.pot, 5, '판돈'); eq(G.needs(st), [1], '상대 차례');
  ok(G.apply(st, 1, { t: 'raise', to: 6 }).ok, '다시 레이즈'); eq(st.cur, 6, '현재 6');
  ok(G.apply(st, 0, { t: 'raise', to: 7 }).ok, '3번째'); ok(G.apply(st, 1, { t: 'raise', to: 8 }).ok, '4번째 레이즈');
  ok(!G.apply(st, 0, { t: 'raise', to: 9 }).ok, '한 턴 레이즈는 4번까지'); eq(G.view(st, 0).raises, 4, '레이즈 횟수');
  ok(G.apply(st, 0, { t: 'call' }).ok, '콜'); eq(st.phase, 'pick', '베팅이 맞으면 오픈 카드 고르기'); eq(st.bet, [8, 8], '각자 8칩'); eq(G.needs(st), [0, 1], '오픈 카드는 동시에');
  eq(total(st), 60, '칩 합 60');
}
{   // 상대 남은 칩보다 많이는 레이즈 못 함
  const st = rig([4, 6], 0); st.chips = [50, 4]; st.pot = 6; st.cap = Math.min(st.chips[0] + st.bet[0], st.chips[1] + st.bet[1]);
  eq(st.cap, 5, '상대 칩 4 + 낸 1 = 최대 5'); ok(!G.apply(st, 0, { t: 'raise', to: 6 }).ok, '6칩은 상대가 못 받아서 거절'); ok(G.apply(st, 0, { t: 'raise', to: 5 }).ok, '5칩까지');
  ok(G.apply(st, 1, { t: 'call' }).ok, '콜 (올인)'); eq(st.chips[1], 0, '상대 칩 0'); eq(st.phase, 'pick', '오픈 카드');
}
{   // 둘 다 체크 → 오픈 카드
  const st = rig([4, 6], 1); chk(st); eq(G.needs(st), [0], '체크하면 상대 차례'); chk(st); eq(st.phase, 'pick', '둘 다 체크하면 오픈 카드');
}

// 3) 오픈 카드 · 승패 · 보너스
function showOf(blind, o, chips) {
  const st = rig(blind, 0); if (chips) { st.chips = chips.slice(); st.pot = 2; }
  chk(st); chk(st);
  ok(G.apply(st, 0, { t: 'open', v: o[0] }).ok, '0번 오픈 ' + o[0]);
  ok(!G.apply(st, 0, { t: 'open', v: o[0] }).ok, '두 번 못 냄');
  ok(!G.apply(st, 1, { t: 'open', v: 11 }).ok, '없는 카드 거절'); ok(!G.apply(st, 1, { t: 'open', v: 0 }).ok, '0 거절'); ok(!G.apply(st, 1, { t: 'open', v: 3.5 }).ok, '소수 거절');
  eq(G.view(st, 1).picked, [true, false], '냈다는 사실만 공개');
  ok(G.apply(st, 1, { t: 'open', v: o[1] }).ok, '1번 오픈 ' + o[1]);
  return st;
}
{
  let st = showOf([4, 5], [3, 6]);   // 7 vs 11 → 1번 승
  eq(st.phase, 'show', '결과 보기'); eq(st.res.w, 1, '합이 큰 쪽 승'); eq(st.chips, [29, 31], '판돈 2 를 가져감'); eq(st.res.sums, [7, 11], '합');
  eq(st.left[0], [1, 2, 4, 5, 6, 7, 8, 9, 10], '쓴 오픈 카드는 빠짐'); eq(G.view(st, 0).res.blind, [4, 5], '결과에서 내 블라인드도 공개'); eq(G.view(st, 0).blind, [4, 5], '결과 단계에서는 블라인드가 다 보임');
  eq(st.first, 1, '이긴 사람이 다음 턴 먼저');
  st = showOf([4, 5], [8, 7]);       // 12 vs 12 → 오픈 큰 쪽 (0번 8)
  eq(st.res.w, 0, '합이 같으면 오픈 카드가 큰 쪽 승'); eq(st.chips, [31, 29], '0번이 가져감');
  st = showOf([5, 5], [6, 6]);       // 합도 오픈도 같음 → 이월
  eq(st.res.w, -1, '오픈도 같으면 비김'); eq(st.pot, 2, '판돈은 다음 턴으로 이월'); eq(st.chips, [29, 29], '칩 변화 없음');
  G.advance(st); eq(st.carry, 2, '이월된 판돈 표시'); eq(st.pot, 4, '새 기본 베팅이 더해짐'); eq(st.phase, 'bet', '다음 턴'); eq(st.first, 0, '먼저 베팅은 그대로'); eq(G.view(st, 0).carry, 2, '보기에도 이월 표시');
  // 오픈 카드 1 · 2 로 이기면 10칩 더
  st = showOf([12, 1], [1, 10]);     // 13 vs 11 → 0번이 오픈 1 로 이김
  eq(st.res.w, 0, '오픈 1 로 이김'); eq(st.res.bonus, 10, '보너스 10칩'); eq(st.chips, [29 + 2 + 10, 29 - 10], '상대에게서 10칩 더');
  st = showOf([1, 12], [2, 1]);      // 3 vs 13 → 1번 승, 오픈 1 → 0번에서 10칩 더
  eq(st.res.w, 1, '1번 승'); eq(st.chips, [29 - 10, 29 + 2 + 10], '오픈 1 로 이긴 쪽이 10칩 더 가져감');
  st = showOf([10, 2], [2, 9], [55, 3]);   // 0번: 12 vs 11 → 오픈 2 로 이김, 상대 칩은 3 뿐
  eq(st.res.bonus, 3, '상대 칩이 모자라면 있는 만큼만'); eq(st.chips, [60, 0], '상대 칩 0');
  eq(total(st), 60, '칩 합 60');
  st = showOf([3, 4], [9, 10]);      // 오픈 9 · 10 으로 이기면 보너스 없음
  eq(st.res.bonus, 0, '오픈 9 이상은 보너스 없음');
}

// 4) 폴드
{
  let st = rig([3, 8], 0);
  G.apply(st, 0, { t: 'raise', to: 4 }); ok(G.apply(st, 1, { t: 'fold' }).ok, '폴드');
  eq(st.phase, 'show', '폴드하면 바로 결과'); eq(st.res.fold, true, '폴드 기록'); eq(st.chips, [29 - 3 + 5, 29], '레이즈한 쪽이 판돈 5 를 가져감 (' + st.chips + ')');
  eq(st.left, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], '폴드한 턴은 오픈 카드를 안 씀'); eq(st.first, 0, '이긴 쪽이 다음 턴 먼저');
  eq(G.view(st, 0).blind, [3, 8], '폴드 뒤 블라인드 공개');
  // 폴드한 사람의 블라인드가 11 · 12 면 칩 10개 더
  st = rig([3, 11], 0); G.apply(st, 0, { t: 'raise', to: 2 }); G.apply(st, 1, { t: 'fold' });
  eq(st.res.bonus, 10, '블라인드 11 로 폴드 → 10칩 더'); eq(st.chips, [29 - 1 + 3 + 10, 29 - 10], '칩 이동');
  st = rig([12, 7], 0); G.apply(st, 0, { t: 'call' }); G.apply(st, 1, { t: 'raise', to: 2 }); G.apply(st, 0, { t: 'fold' });
  eq(st.res.bonus, 10, '블라인드 12 로 폴드도 10칩 더'); eq(st.res.w, 1, '상대 승');
  st = rig([10, 7], 0); G.apply(st, 0, { t: 'raise', to: 2 }); G.apply(st, 1, { t: 'fold' });
  eq(st.res.bonus, 0, '블라인드 10 이하로 폴드는 보너스 없음'); eq(total(st), 60, '칩 합 60');
  st = rig([2, 12], 0); st.chips = [29, 3]; st.pot = 28; st.cap = Math.min(st.chips[0] + 1, st.chips[1] + 1); G.apply(st, 0, { t: 'raise', to: 2 }); G.apply(st, 1, { t: 'fold' });
  eq(st.res.bonus, 3, '칩이 모자라면 있는 만큼'); eq(st.chips[1], 0, '다 냄');
  // 폴드 뒤 다음 턴
  st = rig([3, 8], 0); G.apply(st, 0, { t: 'raise', to: 4 }); G.apply(st, 1, { t: 'fold' }); G.advance(st);
  eq(st.phase, 'bet', '다음 턴'); eq(G.view(st, 0).deckLeft, 20, '블라인드 2장 더 나눠 줌'); eq(st.pot, 2, '이월 없음'); eq(st.carry, 0, '이월 0');
}

// 5) 한 라운드 끝 · 두 번째 라운드 · 즉시 승
{
  const st = G.init({ n: 2, seed: 77, cfg: {} }); let used = 0, guard = 0;
  while (!G.over(st) && st.round === 1 && guard++ < 100) {
    const need = G.needs(st);
    if (!need.length) { const before = st.round; G.advance(st); continue; }
    for (const s of need) { const a = st.phase === 'bet' ? { t: 'call' } : { t: 'open', v: st.left[s][0] }; if (st.phase === 'pick') used++; G.apply(st, s, a); }
    if (st.left[0].length === 0 && st.phase === 'show') { eq(used, 20, '오픈 카드 10장씩 다 씀'); }
  }
  eq(st.round, 2, '오픈 카드를 다 쓰면 2라운드'); eq(G.view(st, 0).left[0].length, 10, '2라운드는 오픈 카드 새로 10장'); ok(G.view(st, 0).seen.length <= 2, '지난 라운드에 나온 블라인드 기록은 비움');
  ok(G.view(st, 0).deckLeft <= 22, '블라인드 새로 섞음');
}
{   // 칩이 다 없어지면 즉시 승
  const st = rig([5, 9], 0); st.chips = [54, 4]; st.pot = 2; st.cap = 5;
  G.apply(st, 0, { t: 'raise', to: 5 }); G.apply(st, 1, { t: 'call' });
  G.apply(st, 0, { t: 'open', v: 9 }); G.apply(st, 1, { t: 'open', v: 1 });   // 14 vs 10
  eq(st.chips, [60, 0], '0번이 판돈을 다 가져감'); ok(!G.over(st), '결과를 보여 주는 동안은 아직'); G.advance(st);
  ok(G.over(st), '칩이 없어지면 바로 끝'); eq(G.ranks(st), [0, 1], '남은 쪽 승'); eq(G.needs(st), [], '끝난 뒤 입력 없음'); ok(!G.apply(st, 0, { t: 'call' }).ok, '끝난 뒤 입력 거절');
  eq(G.view(st, 0).blind, [null, null], '끝나면 블라인드 없음');
}
{   // 이월된 판돈이 있으면 칩이 0 이어도 이어감 · 끝날 때 반씩 돌려줌
  const st = rig([5, 5], 0); st.chips = [0, 56]; st.pot = 4; st.cap = 0; st.cur = 0; st.bet = [0, 0];
  st.phase = 'pick'; st.bt = -1; st.pick = [null, null];
  G.apply(st, 0, { t: 'open', v: 4 }); G.apply(st, 1, { t: 'open', v: 4 });   // 합도 오픈도 같음 → 이월
  eq(st.res.w, -1, '비김'); eq(st.pot, 4, '이월'); G.advance(st); ok(!G.over(st), '판돈이 남아 있으면 이어감'); eq(st.phase, 'pick', '기본 베팅 못 내도 오픈 카드는 고름');
}

// 6) AI 끼리 끝까지 · 칩 보존 · 규칙 어김 없음
function playOut(seed, t0, t1, check) {
  const st = G.init({ n: 2, seed, cfg: {} }), r = rngOf(seed ^ 321), tiers = [t0, t1], trace = [];
  let guard = 0;
  while (!G.over(st) && guard++ < 600) {
    const need = G.needs(st);
    if (!need.length) { ok(G.auto(st) != null, '입력도 자동도 없으면 멈춤 ' + st.phase); G.advance(st); ok(total(st) === 60, '칩 합 60 (넘길 때)'); continue; }
    for (const s of need) {
      if (!G.needs(st).includes(s)) continue;
      const V = G.view(st, s), a = G.ai(V, s, tiers[s], r);
      if (check) check(st, s, V);
      const res = G.apply(st, s, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 ${t0}/${t1} ${st.phase} ${JSON.stringify(a)} ${res.err}`); return st; }
      trace.push(s + JSON.stringify(a));
      if (total(st) !== 60 || st.chips.some(c => c < 0)) { ok(false, '칩이 어긋남 ' + JSON.stringify(st.chips) + st.pot); return st; }
    }
    const pubs = new Set([-1, 0, 1, 'all'].map(i => G.view(st, i).pub)); ok(pubs.size === 1, '진행 중 공개 지문 같음');
  }
  ok(G.over(st), '끝남 ' + seed + ' ' + st.phase); ok(guard < 600, '무한 루프 없음');
  st.trace = trace.join('|');
  return st;
}
{
  const combos = [['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard'], ['easy', 'hard'], ['hard', 'normal'], ['normal', 'easy']];
  let folds = 0, bonus = 0, ties = 0, tr = 0;
  for (const [a, b] of combos) for (let k = 0; k < 30; k++) {
    const st = playOut(400 + k, a, b);
    ok(st.chips[0] + st.chips[1] === 60 && st.pot === 0, '끝났을 때 칩 합 60 · 판돈 0'); tr += st.turn;
    ok(st.round <= 2, '2라운드 안에 끝'); const R = G.ranks(st); ok(R.length === 2 && R.includes(0), '등수');
    ok((R[0] === R[1]) === (st.chips[0] === st.chips[1]), '칩이 같으면 공동 1등');
    for (const h of st.hist) { if (h.fold) folds++; if (h.bonus) bonus++; if (h.w < 0) ties++; }
  }
  ok(folds > 20 && bonus > 5, `폴드 ${folds} · 보너스 ${bonus} · 비김 ${ties} 가 시험에 나옴 (평균 ${(tr / 180).toFixed(1)}턴)`);
  const a = playOut(2024, 'hard', 'normal'), b = playOut(2024, 'hard', 'normal'); eq(a.trace, b.trace, '같은 seed → 같은 판');
}

// 7) 숨김: 내가 못 보는 것(내 블라인드 · 남은 블라인드 더미 · 상대가 낸 오픈 카드)만 바꾼 두 상태에서 내 화면 · AI 수 · 선생님 계산이 같음
{
  let checks = 0, bad = 0;
  for (let k = 0; k < 24; k++) {
    const st = G.init({ n: 2, seed: 800 + k, cfg: {} }), r = rngOf(k + 1);
    let guard = 0;
    while (!G.over(st) && guard++ < 400) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const s = need[0];
      if (st.phase !== 'show' && guard % 2 === 0) {
        for (const me of [0, 1]) {
          const o = 1 - me, alt = clone(st);
          alt.blind[me] = (st.blind[me] % 12) + 1;                 // 내 블라인드
          alt.deck = alt.deck.map(x => (x % 12) + 1).reverse();    // 아직 안 나눈 블라인드
          alt.rs = (alt.rs + 12345) >>> 0;                         // 앞으로의 무작위
          if (alt.pick[o] != null) { const rest = alt.left[o].filter(v => v !== alt.pick[o]); if (rest.length) alt.pick[o] = rest[0]; }   // 상대가 낸 오픈 카드
          const v1 = G.view(st, me), v2 = G.view(alt, me);
          checks++;
          if (JSON.stringify(v1) !== JSON.stringify(v2)) { bad++; if (bad < 4) console.error('남의 숨은 정보가 보임', st.phase, me, k); }
          if (!(v1.needs || []).includes(me)) continue;
          for (const tier of ['normal', 'hard']) { const a1 = G.ai(v1, me, tier, rngOf(9)), a2 = G.ai(v2, me, tier, rngOf(9)); if (JSON.stringify(a1) !== JSON.stringify(a2)) { bad++; console.error('AI 수가 숨은 정보에 따라 달라짐', tier); } }
          if (JSON.stringify(G.chances(v1, me)) !== JSON.stringify(G.chances(v2, me))) { bad++; console.error('선생님 계산이 숨은 정보에 따라 달라짐'); }
        }
      }
      G.apply(st, s, G.ai(G.view(st, s), s, 'normal', r));
    }
  }
  ok(checks > 80, '숨김 비교 횟수 ' + checks); ok(bad === 0, '남의 숨은 정보가 내 화면 · AI · 선생님에 새지 않음 (누출 ' + bad + ')');
}

// 8) 고급 AI > 초급 AI (자리를 바꿔 가며 300판)
{
  let hw = 0, ew = 0, dr = 0, N = 300, hc = 0;
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const hs = k % 2, tiers = hs === 0 ? ['hard', 'easy'] : ['easy', 'hard'];
    const st = playOut(6000 + k, tiers[0], tiers[1]), R = G.ranks(st);
    hc += st.chips[hs] - 30;
    if (R[0] === R[1]) dr++; else if (R[hs] === 0) hw++; else ew++;
  }
  const rate = (hw + dr / 2) / N;
  console.log(`고급 대 초급 ${N}판: 고급 ${hw}승 · 초급 ${ew}승 · 무 ${dr} (승률 ${(rate * 100).toFixed(1)}%, 고급 평균 칩 ${(30 + hc / N).toFixed(1)}, ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  ok(rate > 0.55, '고급이 초급을 이김 (승률 > 55%)');
  let hn = 0, M = 150; for (let k = 0; k < M; k++) { const hs = k % 2, st = playOut(9000 + k, hs === 0 ? 'hard' : 'normal', hs === 0 ? 'normal' : 'hard'), R = G.ranks(st); hn += R[0] === R[1] ? 0.5 : R[hs] === 0 ? 1 : 0; }
  let nn = 0; for (let k = 0; k < M; k++) { const hs = k % 2, st = playOut(11000 + k, hs === 0 ? 'normal' : 'easy', hs === 0 ? 'easy' : 'normal'), R = G.ranks(st); nn += R[0] === R[1] ? 0.5 : R[hs] === 0 ? 1 : 0; }
  console.log(`고급 대 중급 ${M}판 승률 ${(hn / M * 100).toFixed(1)}% · 중급 대 초급 ${M}판 승률 ${(nn / M * 100).toFixed(1)}% (참고)`);
}

// 9) 선생님용 계산이 돈다 · 구경꾼 · 'all'
{
  const st = rig([6, 9], 0);
  const V = G.view(st, 0), c = G.chances(V, 0);
  ok(c.rows.length === 10 && c.best && c.p >= 0 && c.p <= 1, '오픈 카드마다 이길 확률'); ok(Math.abs(c.wts.reduce((a, b) => a + b, 0) - 1) < 1e-9, '내 블라인드 가능성 합 1');
  ok(c.opts.length >= 2, '선택지별 기대 칩 (콜 · 레이즈…)'); eq(c.bo, 9, '상대 블라인드');
  ok(G.view(st, -1).mine === null && G.view(st, -1).picks === null, '구경꾼은 낸 카드를 못 봄');
  G.apply(st, 0, { t: 'call' }); G.apply(st, 1, { t: 'call' }); G.apply(st, 0, { t: 'open', v: 7 });
  eq(G.view(st, 1).picked, [true, false], '냈는지만 공개'); eq(G.view(st, 'all').picks, [7, null], "'all' 은 낸 카드까지"); eq(G.view(st, 1).mine, null, '상대 카드는 내 화면에 없음');
  for (const a of G.legal(st, 1)) ok(G.apply(clone(st), 1, a).ok, 'legal 은 모두 통함');
}

console.log(`블라인드 베팅 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

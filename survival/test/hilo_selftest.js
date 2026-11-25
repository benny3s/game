// 하이 앤 로우 규칙 시험 (node survival/test/hilo_selftest.js)
'use strict';
const H = require('../games/hilo/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const clone = o => JSON.parse(JSON.stringify(o));
const J = x => JSON.stringify(x);
const sum = a => a.reduce((x, y) => x + y, 0);
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 한 라운드 진행: plays[i] = [숫자, 'N'|'R'] (자리 순) → 공개 차례대로 reveals ('show' | 'quit')
function playRound(st, plays) {
  for (let i = 0; i < 4; i++) ok(H.apply(st, i, { t: 'play', n: plays[i][0], s: plays[i][1] || 'N' }).ok, `${i}번 카드 내기`);
}
function reveal(st, acts) {
  for (const x of acts) { const s = H.needs(st)[0]; const r = H.apply(st, s, { t: x }); ok(r.ok, `${s}번 ${x} → ${r.err || ''}`); }
}
// 선 · 포기 자리를 순서(order)에 맞춰 숫자를 줌: byOrder[k] = order[k] 자리가 낼 숫자
function byOrder(st, nums, specials) { const p = [0, 1, 2, 3].map(() => null); st.order.forEach((s, k) => { p[s] = [nums[k], (specials && specials[k]) || 'N']; }); return p; }

// 1) 시작 상태
for (let seed = 1; seed <= 20; seed++) {
  const st = H.init({ n: 4, seed });
  ok(st.n === 4 && st.hand.length === 4 && st.round === 1 && st.phase === 'play', '4명 · 1라운드');
  ok(st.deck.length === 9 && new Set(st.deck).size === 9 && st.deck.every(c => H.SCORES.includes(c)), '점수 카드 9장 (중복 없음)');
  ok(J(st.deck.concat([st.removed]).sort((a, b) => a - b)) === J(H.SCORES.slice().sort((a, b) => a - b)), '빼 둔 1장 + 9장 = 10장');
  ok(st.hand.every(h => J(h.nums) === J(ALL) && h.norm === 8 && h.rev), '숫자 1~10 · 노멀 8 · 리버스 1');
  ok(st.cur === st.deck[0] && st.leader === st.first && J(H.needs(st)) === '[0,1,2,3]', '처음엔 4명 모두 동시에 냄');
}
ok(H.init({ n: 2, seed: 5 }).n === 4, '4명 고정');
{
  const seen = new Set(); for (let s = 1; s < 60; s++) seen.add(H.init({ seed: s }).removed);
  ok(seen.size > 5, '빼는 카드가 무작위');
}

// 2) 잘못된 입력 거부
{
  const st = H.init({ seed: 7 });
  for (const bad of [null, {}, { t: 'play' }, { t: 'play', n: 0, s: 'N' }, { t: 'play', n: 11, s: 'N' }, { t: 'play', n: 3.5, s: 'N' }, { t: 'play', n: 3, s: 'X' }, { t: 'play', n: 3 }, { t: 'show' }, { t: 'pass', to: -1 }])
    ok(!H.apply(st, 0, bad).ok, '잘못된 내기 거부 ' + J(bad));
  ok(H.apply(st, 0, { t: 'play', n: 3, s: 'N' }).ok, '내기');
  ok(!H.apply(st, 0, { t: 'play', n: 4, s: 'N' }).ok, '같은 라운드에 두 번 못 냄');
  ok(J(H.needs(st)) === '[1,2,3]', '낸 사람은 빠짐');
  ok(!H.apply(st, 1, { t: 'play', n: 3 + 20, s: 'N' }).ok, '없는 숫자');
  // 리버스는 1번뿐 · 쓴 숫자는 다시 못 씀
  const st2 = H.init({ seed: 8 });
  playRound(st2, [[1, 'R'], [2], [3], [4]]);
  ok(st2.phase === 'reveal', '모두 내면 공개 단계');
  reveal(st2, ['show', 'show', 'show', 'show']);
  H.advance(st2);
  ok(!H.apply(st2, 0, { t: 'play', n: 1, s: 'N' }).ok, '쓴 숫자는 다시 못 씀');
  ok(!H.apply(st2, 0, { t: 'play', n: 5, s: 'R' }).ok, '리버스는 한 번뿐');
  ok(H.apply(st2, 0, { t: 'play', n: 5, s: 'N' }).ok, '노멀은 계속');
  ok(!H.apply(st2, 1, { t: 'show' }).ok, '내기 단계에 공개 거부');
  // 노멀을 다 쓰면 리버스만 낼 수 있음
  const st3 = H.init({ seed: 9 });
  st3.hand[0].norm = 0;
  ok(!H.apply(st3, 0, { t: 'play', n: 2, s: 'N' }).ok && H.apply(st3, 0, { t: 'play', n: 2, s: 'R' }).ok, '노멀이 없으면 리버스만');
  ok(J(H.legal(H.init({ seed: 3 }), 0)) !== '[]' && H.legal(H.init({ seed: 3 }), 0).length === 20, '처음 낼 수 있는 수 = 숫자 10 × 특수 2');
}

// 3) 방향 (리버스 홀수 → 낮은 쪽) · 뒷면 색
{
  const cases = [[[], 'high'], [[0], 'low'], [[0, 1], 'high'], [[0, 1, 2], 'low'], [[0, 1, 2, 3], 'high']];
  for (const [rev, want] of cases) {
    const st = H.init({ seed: 100 });
    playRound(st, [0, 1, 2, 3].map(i => [i * 3 + 1, rev.includes(i) ? 'R' : 'N']));   // 1 4 7 10
    ok(st.dir === want, `리버스 ${rev.length}개 → ${want} (실제 ${st.dir})`);
    ok(J(st.col) === J(['B', 'B', 'Y', 'Y']), '뒷면 색 1~5 파랑 · 6~10 노랑 ' + J(st.col));
    const V = H.view(st, 2);
    ok(V.dir === want && J(V.col) === J(st.col) && V.phase === 'reveal', '방향 · 색은 모두 공개');
  }
}

// 4) 공개 순서 · 선 · 포기 규칙
{
  const st = H.init({ seed: 11 });
  const L = st.leader;
  playRound(st, byOrder(st, [1, 2, 3, 4]));
  ok(J(st.order) === J([0, 1, 2, 3].map(k => (L + k) % 4)), '선부터 차례로 공개');
  ok(J(H.needs(st)) === J([L]) && !H.apply(st, (L + 1) % 4, { t: 'show' }).ok, '공개 차례 한 명씩');
  ok(!H.apply(st, L, { t: 'quit' }).ok, '선 플레이어는 포기 못 함');
  ok(J(H.legal(st, L)) === J([{ t: 'show' }]) && H.view(st, L).canQuit === false, '선은 공개만');
  ok(H.apply(st, L, { t: 'show' }).ok && st.shown[L] === 1, '선 공개');
  const q = (L + 1) % 4;
  ok(H.view(st, q).canQuit === true && H.legal(st, q).length === 2, '다음 사람은 포기할 수 있음');
  ok(H.apply(st, q, { t: 'quit' }).ok && st.quit === q && st.shown[q] === null, '포기하면 숫자는 안 보임');
  ok(!H.apply(st, (L + 2) % 4, { t: 'quit' }).ok && H.legal(st, (L + 2) % 4).length === 1, '한 라운드에 포기는 1명뿐');
  reveal(st, ['show', 'show']);
  ok(st.phase === 'show' && st.lastQuit === q, '라운드 끝 · 포기한 사람 기록');
  H.advance(st);
  ok(st.round === 2 && st.leader === (L + 1) % 4, '선이 한 칸 돌아감');
  // 2라운드: 지난 라운드에 포기한 q 는 꼭 공개
  const p2 = [0, 1, 2, 3].map(i => [st.hand[i].nums[0], 'N']);
  playRound(st, p2);
  let guard = 0;
  while (H.needs(st)[0] !== q && guard++ < 5) H.apply(st, H.needs(st)[0], { t: 'show' });
  ok(H.needs(st)[0] === q && !H.apply(st, q, { t: 'quit' }).ok && H.legal(st, q).length === 1, '지난 라운드에 포기한 사람은 이번엔 꼭 공개');
  ok(H.apply(st, q, { t: 'show' }).ok, '공개');
}

// 5) 누가 가져가나 — 우위 · 동률 · 이월
{
  const run = (nums, specials, cur, carry) => {
    const st = H.init({ seed: 21 }); st.cur = cur; st.carry = carry || [];
    playRound(st, nums.map((n, i) => [n, specials ? specials[i] : 'N'])); reveal(st, [1, 2, 3, 4].map(() => 'show'));
    return st;
  };
  let st = run([9, 9, 5, 3], null, 6);
  ok(st.dir === 'high' && J(st.took[2]) === '[6]' && st.took.every((t, i) => i === 2 || !t.length), '높은 쪽: 9 가 둘이면 건너뛰고 5 가 가져감');
  st = run([9, 8, 5, 3], null, 4); ok(J(st.took[1]) === '[]' && J(st.took[0]) === '[4]', '높은 쪽 9 승');
  st = run([1, 1, 2, 7], ['R', 'N', 'N', 'N'], 10); ok(st.dir === 'low' && J(st.took[2]) === '[10]', '낮은 쪽: 1 이 둘이면 건너뛰고 2 가 가져감');
  st = run([7, 9, 3, 4], ['R', 'R', 'N', 'N'], 8); ok(st.dir === 'high' && J(st.took[1]) === '[8]', '리버스 둘 = 다시 높은 쪽');
  st = run([7, 9, 3, 4], ['R', 'R', 'R', 'N'], 8); ok(st.dir === 'low' && J(st.took[2]) === '[8]', '리버스 셋 = 낮은 쪽');
  st = run([5, 5, 6, 6], null, 4);
  ok(J(st.took.map(t => t.length)) === '[0,0,0,0]' && J(st.carry) === '[4]' && st.res.carried && st.res.taker === -1, '가져갈 사람이 없으면 이월');
  H.advance(st); ok(st.round === 2 && J(H.view(st, 0).carry) === '[4]' && J(H.view(st, 0).pile) === J([4, st.cur]), '이월 더미가 다음 라운드 더미에 붙음');
  st.cur = 6;
  playRound(st, [[1], [2], [3], [4]]); reveal(st, [1, 2, 3, 4].map(() => 'show'));
  ok(J(st.took[3]) === '[4,6]' && st.carry.length === 0, '다음 라운드 승자가 이월 카드까지 가져감');
  st = run([4, 4, 4, 4], null, 2); ok(J(st.carry) === '[2]', '모두 같으면 이월');
  st = run([4, 4, 4, 5], null, 2); ok(J(st.took[3]) === '[2]', '혼자 다른 숫자');
  // 마이너스 — 포기한 사람이 없으면 우위 승자가 그대로 가져감
  st = run([9, 5, 4, 1], null, -3); ok(J(st.took[0]) === '[-3]', '마이너스도 가장 우위인 사람이 가져감');
  st = run([5, 5, 4, 4], null, -3); ok(st.carry[0] === -3 && st.carry.length === 1, '마이너스도 이월');
  // 이월로 합이 음수가 되면 마이너스 더미
  const st5 = H.init({ seed: 22 }); st5.carry = [-5]; st5.cur = 4;
  playRound(st5, byOrder(st5, [8, 7, 6, 5]));
  const qq = st5.order[1];
  reveal(st5, ['show', 'quit']);
  ok(st5.phase === 'reveal', '아직 공개 차례 남음');
  reveal(st5, ['show', 'show']);
  ok(st5.phase === 'pass' && J(H.needs(st5)) === J([qq]), '이월 합 −1 은 마이너스 더미 → 포기한 사람이 넘기기 선택');
  ok(H.apply(st5, qq, { t: 'pass', to: -1 }).ok && J(st5.took[qq]) === '[-5,4]', '넘기지 않으면 포기한 사람이 가져감');
}

// 6) 마이너스 점수 카드 + 포기 → 포기한 사람이 가져가고, 같은 숫자를 낸 사람에게 넘길 수 있음
{
  const mk = () => {
    const st = H.init({ seed: 31 }); st.cur = -5;
    const [L, q, o2, o3] = st.order;
    playRound(st, byOrder(st, [9, 7, 7, 2]));
    reveal(st, ['show', 'quit', 'show', 'show']);
    return { st, L, q, o2, o3 };
  };
  let { st, L, q, o2, o3 } = mk();
  ok(st.phase === 'pass' && J(H.needs(st)) === J([q]), '마이너스 + 포기 → 포기한 사람의 선택');
  ok(J(H.view(st, q).passOpts) === J([o2]) && H.view(st, L).passOpts === null && J(H.view(st, 'all').passOpts) === J([o2]), '넘길 수 있는 사람 = 같은 숫자(7)를 공개한 사람 (포기한 사람 눈에만)');
  ok(J(H.legal(st, q)) === J([{ t: 'pass', to: -1 }, { t: 'pass', to: o2 }]), 'legal');
  for (const bad of [{ t: 'pass', to: o3 }, { t: 'pass', to: L }, { t: 'pass', to: q }, { t: 'pass', to: 7 }, { t: 'pass' }, { t: 'show' }]) ok(!H.apply(st, q, bad).ok, '넘길 수 없는 선택 거부 ' + J(bad));
  ok(!H.apply(st, L, { t: 'pass', to: -1 }).ok, '다른 사람은 못 고름');
  ok(H.apply(st, q, { t: 'pass', to: o2 }).ok, '같은 숫자를 낸 사람에게 넘김');
  ok(J(st.took[o2]) === '[-5]' && !st.took[q].length && st.res.from === q && st.res.taker === o2 && st.phase === 'show', '넘겨 받은 사람이 가져감');
  ({ st, q, o2 } = mk());
  ok(H.apply(st, q, { t: 'pass', to: -1 }).ok && J(st.took[q]) === '[-5]', '넘기지 않으면 포기한 사람이 가져감 (최고 우위 9 가 있어도)');
  // 같은 숫자를 낸 사람이 없어도 선택 단계는 늘 옴 (있는지 없는지 안 새게)
  const s2 = H.init({ seed: 32 }); s2.cur = -1;
  playRound(s2, byOrder(s2, [9, 6, 3, 2])); reveal(s2, ['show', 'quit', 'show', 'show']);
  ok(s2.phase === 'pass' && J(H.view(s2, s2.quit).passOpts) === '[]' && J(H.legal(s2, s2.quit)) === J([{ t: 'pass', to: -1 }]), '넘길 사람이 없어도 선택 단계가 옴');
  // 플러스 더미는 포기해도 아무 일 없음 (포기한 카드는 비교에서 빠짐)
  const s3 = H.init({ seed: 33 }); s3.cur = 8;
  playRound(s3, byOrder(s3, [4, 10, 6, 5])); reveal(s3, ['show', 'quit', 'show', 'show']);
  ok(s3.phase === 'show' && J(s3.took[s3.order[2]]) === '[8]', '플러스 더미: 포기한 10 은 빠지고 6 이 가져감');
  ok(s3.res.shown[s3.order[1]] === null, '포기한 카드는 끝까지 비밀');
}

// 7) 끝 · 순위 · 점수 보존
function play(seed, tiers) {
  const st = H.init({ seed }), r = lcg(seed * 7 + 3);
  let steps = 0;
  while (!H.over(st) && steps < 2000) {
    const need = H.needs(st);
    if (!need.length) { ok(H.auto(st) != null, '사람 입력이 없는데 자동으로도 안 넘어감 ' + st.phase); H.advance(st); steps++; continue; }
    for (const seat of need) {
      if (!H.needs(st).includes(seat)) continue;
      const V = H.view(st, seat);
      ok(V.needs.includes(seat) && V.hands[seat] && V.hands.every((h, i) => i === seat || h === null), '내 패만 보임');
      const a = H.ai(V, seat, tiers[seat % tiers.length], r), res = H.apply(st, seat, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase}) ${J(a)} → ${res.err}`); H.apply(st, seat, H.legal(st, seat)[0]); }
      steps++;
    }
  }
  ok(H.over(st) && st.round === 9, `판이 끝남 (seed ${seed}, ${steps}번)`);
  const R = H.ranks(st);
  ok(R.length === 4 && R.includes(0), '등수');
  const left = st.carry.length ? sum(st.carry) : 0;
  ok(sum(st.took.map(sum)) + left === sum(H.SCORES) - st.removed, '점수 카드 합이 맞음 (가져간 것 + 못 가져간 것 = 쓴 카드 9장)');
  ok(st.hist.length === 9 && st.hand.every(h => h.nums.length === 1 && h.norm === 0 && !h.rev), '9라운드 · 특수 카드를 다 씀 · 숫자 1장 남음');
  ok(new Set([-1, 'all', 0, 1, 2, 3].map(i => H.view(st, i).pub)).size === 1, '공개 지문이 자리마다 다름');
  ok(H.view(st, 0).ranks && J(H.view(st, 0).score) === J(st.took.map(sum)), '끝난 판 등수 · 점수');
  return st;
}
const T0 = Date.now();
{
  const mix = [['easy', 'easy', 'easy', 'easy'], ['normal', 'normal', 'normal', 'normal'], ['hard', 'hard', 'hard', 'hard'], ['hard', 'easy', 'normal', 'easy'], ['easy', 'hard', 'easy', 'normal']];
  for (let k = 0; k < 60; k++) play(100 + k, mix[k % mix.length]);
}
for (let k = 0; k < 60; k++) {   // 무작위 합법 수
  const st = H.init({ seed: 700 + k }), r = lcg(k + 1);
  let steps = 0;
  while (!H.over(st) && steps++ < 2000) {
    const need = H.needs(st);
    if (!need.length) { H.advance(st); continue; }
    const s = need[Math.floor(r() * need.length)], L = H.legal(st, s);
    ok(L.length > 0, 'legal 이 비어 있음 ' + st.phase);
    ok(H.apply(st, s, L[Math.floor(r() * L.length)]).ok, 'legal 수가 거부됨');
  }
  ok(H.over(st), '무작위 합법 수로 끝남');
}
{
  const st = H.init({ seed: 1 });
  st.took = [[10], [6, 4], [2], [2]];
  ok(J(H.ranks(st)) === J([0, 1, 2, 2]), '점수 같으면 높은 카드 가진 쪽 · 그래도 같으면 공동 ' + J(H.ranks(st)));
  st.took = [[6], [6], [], [6]];
  ok(J(H.ranks(st)) === J([0, 0, 3, 0]), '같은 점수 · 같은 최고 카드 = 공동 ' + J(H.ranks(st)));
  st.took = [[2, 4], [4, 2], [], [6]];
  ok(J(H.ranks(st)) === J([1, 1, 3, 0]), '같은 점수 · 최고 카드가 다르면 높은 쪽이 위 ' + J(H.ranks(st)));
  st.took = [[-1], [-9], [2], []];
  ok(J(H.ranks(st)) === J([2, 3, 0, 1]), '마이너스 순위 ' + J(H.ranks(st)));
}

// 8) 같은 seed → 같은 결과
{
  const a = play(4242, ['hard', 'normal', 'easy', 'normal']), b = play(4242, ['hard', 'normal', 'easy', 'normal']), c = play(4243, ['hard', 'normal', 'easy', 'normal']);
  ok(J(a.hist) === J(b.hist) && J(a.log) === J(b.log), '같은 seed 는 같은 판');
  ok(J(a.hist) !== J(c.hist), '다른 seed 는 다른 판');
}

// 9) 숨은 정보 — 내가 못 보는 것(남의 낸 카드 · 남의 남은 카드 · 남의 리버스 · 안 뽑은 점수 카드 · 난수)만 바꾼 두 상태에서 내 view 가 같아야 함
function mutateHidden(st, s, r) {
  const st2 = clone(st);
  st2.rs = (st2.rs ^ 0xabcdef) >>> 0;
  const fut = st2.deck.slice(st2.round).concat([st2.removed]);
  for (let i = fut.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fut[i], fut[j]] = [fut[j], fut[i]]; }
  st2.removed = fut.pop(); st2.deck = st2.deck.slice(0, st2.round).concat(fut);
  let changed = false;
  for (let j = 0; j < 4; j++) {
    if (j === s) continue;
    const h = st2.hand[j], sub = st2.sub[j], used = st2.used[j];
    const hasSub = !!sub, shown = st2.shown[j] != null;
    const need = h.nums.length;
    const fixedColor = st2.phase !== 'play';
    let n2 = hasSub ? sub.n : null;
    if (hasSub && !shown) {
      const cand = ALL.filter(x => !used.includes(x) && (!fixedColor || H.colorOf(x) === st2.col[j]));
      n2 = cand[Math.floor(r() * cand.length)];
      if (n2 !== sub.n) changed = true;
      sub.n = n2;
      if (!fixedColor) {   // 내기 단계에서는 특수 카드도 바꿔 볼 수 있음
        if (sub.s === 'N' && h.rev) { sub.s = 'R'; h.rev = false; h.norm++; h.revAt = st2.round; changed = true; }
        else if (sub.s === 'R' && h.norm > 0) { sub.s = 'N'; h.rev = true; h.norm--; h.revAt = 0; changed = true; }
      }
    }
    const rest = ALL.filter(x => !used.includes(x) && x !== n2);
    for (let i = rest.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [rest[i], rest[k]] = [rest[k], rest[i]]; }
    const nn = rest.slice(0, need).sort((a, b) => a - b);
    if (J(nn) !== J(h.nums)) changed = true;
    h.nums = nn;
  }
  return { st2, changed };
}
{
  let tested = 0, mutated = 0, phases = new Set();
  for (let g = 0; g < 40; g++) {
    const st = H.init({ seed: 5000 + g }), r = lcg(g + 9), r2 = lcg(g * 5 + 2), tiers = ['easy', 'normal', 'easy', 'normal'];
    let steps = 0;
    while (!H.over(st) && steps++ < 400) {
      const need = H.needs(st);
      // 매 걸음마다 검사
      for (const s of [-1, 0, 1, 2, 3]) {
        const { st2, changed } = mutateHidden(st, s, r2);
        const a = H.view(st, s), b = H.view(st2, s);
        ok(J(a) === J(b), `숨은 정보가 ${s} 자리 보기에 새어 나옴 (${st.phase}, 라운드 ${st.round})`);
        if (changed) mutated++;
        tested++; phases.add(st.phase);
      }
      if (!need.length) { H.advance(st); continue; }
      const seat = need[Math.floor(r() * need.length)];
      H.apply(st, seat, H.ai(H.view(st, seat), seat, tiers[seat], r));
    }
  }
  ok(tested > 5000 && mutated > 2000, `새어 나옴 시험 ${tested}번 (바뀐 경우 ${mutated})`);
  ok(['play', 'reveal', 'pass', 'show'].every(p => phases.has(p)), '모든 단계를 시험함 ' + [...phases]);
  // 시험이 진짜인지: 내 보기는 내 카드가 바뀌면 달라져야 함
  const st = H.init({ seed: 6 }); playRound(st, [[1], [2], [3], [4]]);
  const st2 = clone(st); st2.sub[0].n = 9;
  ok(J(H.view(st, 0)) !== J(H.view(st2, 0)), '내 카드는 내 보기에 보임');
  ok(J(H.view(st, 1)) === J(H.view(st2, 1)), '내 카드는 남의 보기에 안 보임 (공개 전)');
  const Va = H.view(st, 'all'); ok(Va.hands.every(h => h && h.sub), "'all' 보기는 모두의 패가 보임");
  ok(H.view(st, -1).hands.every(h => h === null), '구경꾼은 패가 안 보임');
}

// 10) 구경꾼 · 포기한 카드는 끝까지 비밀
{
  const st = H.init({ seed: 41 }); st.cur = 6;
  playRound(st, byOrder(st, [4, 10, 6, 5])); reveal(st, ['show', 'quit', 'show', 'show']);
  const q = st.order[1], V = H.view(st, (q + 1) % 4), Vq = H.view(st, q);
  ok(V.shown[q] === null && V.hid[q] === 1 && !V.used[q].length, '남에게는 포기한 카드가 없는 것으로 보임');
  ok(!J(V).includes('"n":10'), '포기한 숫자 10 은 남의 보기 어디에도 없음');
  ok(Vq.hands[q].sub.n === 10, '나는 내 카드를 앎');
}

// 11) 세기: hard > easy (4명 — 평균 등수, 0 = 1등, 같은 실력이면 약 1.5 보다 약간 낮음)
function match(tA, tB, games) {
  let rank = 0, top2 = 0, win = 0, score = 0;
  for (let g = 0; g < games; g++) {
    const me = g % 4, tiers = [0, 1, 2, 3].map(i => (i === me ? tA : tB)), st = play(40000 + g * 11, tiers), R = H.ranks(st);
    rank += R[me]; top2 += R[me] <= 1 ? 1 : 0; win += R[me] === 0 ? 1 : 0; score += st.took.map(sum)[me] - sum(st.took.map(sum)) / 4;
  }
  return { rank: rank / games, top2: top2 / games, win: win / games, score: score / games };
}
{
  const he = match('hard', 'easy', 240), ne = match('normal', 'easy', 240), hn = match('hard', 'normal', 240);
  const f = x => `평균 등수 ${x.rank.toFixed(2)} · 상위 2명(생존) ${(x.top2 * 100).toFixed(0)}% · 1등 ${(x.win * 100).toFixed(0)}% · 점수 차 ${x.score.toFixed(1)}`;
  console.log(`  hard 1명 vs easy 3명: ${f(he)}`);
  console.log(`  normal 1명 vs easy 3명: ${f(ne)}`);
  console.log(`  hard 1명 vs normal 3명: ${f(hn)}`);
  ok(he.rank < 1.2 && he.top2 > 0.62, 'hard 가 easy 를 이김 ' + f(he));
  ok(ne.rank < 1.45, 'normal 도 easy 보다 낫다 ' + f(ne));
  ok(hn.rank < 1.45, 'hard 가 normal 보다 낫다 ' + f(hn));
}
console.log(`  걸린 시간 ${((Date.now() - T0) / 1000).toFixed(1)}초`);

console.log(`하이 앤 로우 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

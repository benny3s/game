// HIT, STAY 규칙 시험 (node survival/test/selftest_hitstay.js)
'use strict';
const H = require('../games/hitstay/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')');
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 1) 덱: 35장, 값별 장수
{
  const cnt = {}; H.DECK.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
  eq(H.DECK.length, 35, '카드 35장');
  eq([cnt[7], cnt[6], cnt[5], cnt[4], cnt[3], cnt[2], cnt[1], cnt[-1]], [1, 2, 3, 4, 5, 6, 7, 7], '7→1장 … 1→7장, −1→7장');
  eq([H.anteOf(1), H.anteOf(10), H.anteOf(11), H.anteOf(21)], [1, 1, 2, 3], '기본 베팅은 10라운드마다 1칩 증가');
}

// 2) 손으로 한 라운드 (3명): 카드 · 한계 · 승패를 정해 놓고 확인
function rig(n, hands, L, chips) {
  const st = H.init({ n, seed: 11, cfg: { chips: 30 } });
  // 새 판을 직접 꾸림 (규칙 흐름은 그대로, 카드 · 한계만 정함)
  st.L = L;
  hands.forEach((h, i) => { st.cards[i].hand = h.slice(); });
  if (chips) st.chips = chips.slice();
  return st;
}
{
  const st = rig(3, [[4, 3, 2], [5, 5, 1], [6, 2, -1]], 10);
  eq(st.phase, 'reveal', '공개 카드 고르기부터');
  eq(H.needs(st).slice().sort(), [0, 1, 2], '공개는 모두 동시에');
  ok(!H.apply(st, 0, { t: 'reveal', k: 3 }).ok, '없는 카드 번호 거절');
  H.apply(st, 0, { t: 'reveal', k: 0 }); H.apply(st, 1, { t: 'reveal', k: 1 }); H.apply(st, 2, { t: 'reveal', k: 2 });
  eq(st.phase, 'bet1', '공개가 끝나면 1차 베팅');
  const V = H.view(st, 0);
  eq(V.hands[0].open, [4], '내가 고른 카드는 공개 (4)');
  eq(V.hands[0].hid.slice().sort(), [2, 3], '내 숨은 카드 2장은 나만 봄');
  eq(V.hands[1].hid, [null, null], '남의 숨은 카드는 안 보임');
  eq(V.hands[1].open, [5], '남의 공개 카드는 보임');
  // 베팅 없이 체크
  for (let g = 0; g < 6 && st.phase === 'bet1'; g++) { const s = H.needs(st)[0]; ok(H.apply(st, s, { t: 'check' }).ok, '1차 체크'); }
  eq(st.phase, 'hit', '1차 베팅 뒤 HIT/STAY');
  // 선부터 STAY, STAY, HIT(6 2 -1 합 7 → +? 다음 카드)
  const first = H.needs(st)[0];
  eq(first, st.dealer, 'HIT 은 선부터');
  H.apply(st, first, { t: 'stay' });
  const second = H.needs(st)[0];
  ok(second !== first, '다음 사람');
  H.apply(st, second, { t: 'stay' });
  const third = H.needs(st)[0];
  ok(third !== first && third !== second, '세 번째 사람');
  const top = st.deck[st.deck.length - 1];
  H.apply(st, third, { t: 'hit' });
  eq(st.cards[third].extra, [top], '뽑은 카드는 맨 위 카드');
  eq(H.view(st, (third + 1) % 3).hands[third].open.slice(-1)[0], top, '뽑은 카드는 모두에게 공개');
  H.apply(st, third, { t: 'stay' });   // 한 번 HIT 한 사람이 다시 차례가 오면 STAY
  eq(st.phase, 'bet2', '모두 STAY 면 2차 베팅');
}

// 3) 승패 판정 (직접 showdown): 한계 10
function showdownOf(hands, L, extra) {
  const st = rig(hands.length, hands, L);
  hands.forEach((h, i) => { st.cards[i].open = [h[0]]; st.cards[i].hid = h.slice(1); st.cards[i].extra = (extra && extra[i]) || []; st.revealed[i] = true; });
  st.pot = 12; st.chips = Array(hands.length).fill(10);
  st.phase = 'bet2'; st.cap = 0; st.cur = 0; st.bet = Array(hands.length).fill(0); st.acted = Array(hands.length).fill(false);
  // 베팅 없이 곧바로 공개: 모두 체크
  st.turn = st.dealer; st.cap = 1;
  for (let g = 0; g < 10 && st.phase === 'bet2'; g++) H.apply(st, H.needs(st)[0], { t: 'check' });
  return st;
}
{
  let st = showdownOf([[4, 3, 2], [5, 5, 1], [6, 2, -1]], 10);   // 9 · 11(bust) · 7
  eq(st.res.win, [0], '한계에 가장 가까운 9 가 이김, 11 은 bust');
  eq(st.chips[0], 10 + 12, '승자가 판돈 12 를 가져감');
  ok(st.res.rows.find(r => r.i === 1).bust, '11 > 10 은 bust');
  st = showdownOf([[4, 3, 3], [5, 3, 2], [6, 2, -1]], 10);        // 10 · 10 · 7 → 같은 합: 카드 수가 같아서 무승부
  eq(st.res.win.slice().sort(), [0, 1], '합이 같고 카드 수도 같으면 무승부');
  eq(st.res.gain.reduce((a, g) => a + g[1], 0), 12, '무승부 분배 합 = 판돈');
  st = showdownOf([[4, 3, 1], [5, 3, 1], [3, 1, 1]], 10, [[], [], [2, 1]]);   // 8 · 9 · 5+3=8? 3+1+1+2+1 = 8
  eq(st.res.win, [1], '9 가 이김');
  st = showdownOf([[3, 3, 2], [4, 2, 2]], 8, [[], [-1, 1]]);       // 8 (3장) vs 8 (5장 = 4+2+2-1+1) → 카드 수 많은 쪽
  eq(st.res.win, [1], '합이 같으면 카드가 많은 쪽 승');
  st = showdownOf([[7, 6, 5], [6, 6, 6]], 10);                    // 18 · 18 모두 bust → 덜 넘은 쪽 (둘 다 18 → 무승부)
  eq(st.res.win.slice().sort(), [0, 1], '모두 bust 이고 같으면 무승부');
  st = showdownOf([[7, 6, 5], [6, 6, 4]], 10);                    // 18 vs 16
  eq(st.res.win, [1], '모두 bust 면 덜 넘은 쪽 승');
  // 홀수 칩 분배: 판돈 13, 둘이 무승부 → 6 · 6 + 1 은 선에 가까운 쪽
  const s2 = rig(2, [[4, 3, 3], [5, 3, 2]], 10);
  [0, 1].forEach(i => { const h = s2.cards[i].hand; s2.cards[i].open = [h[0]]; s2.cards[i].hid = h.slice(1); s2.cards[i].extra = []; s2.revealed[i] = true; });
  s2.pot = 13; s2.chips = [10, 10]; s2.phase = 'bet2'; s2.cur = 0; s2.bet = [0, 0]; s2.acted = [false, false]; s2.cap = 1; s2.turn = s2.dealer;
  for (let g = 0; g < 5 && s2.phase === 'bet2'; g++) H.apply(s2, H.needs(s2)[0], { t: 'check' });
  const nearDealer = s2.dealer;   // 선 자신이 거리 0 → 가장 가까움
  eq(s2.chips[nearDealer], 10 + 7, '남는 칩은 선에 가까운 쪽');
}

// 4) 베팅: 상한 = 칩이 가장 적은 사람의 칩 수
{
  const st = rig(3, [[4, 3, 2], [5, 5, 1], [6, 2, -1]], 10, [30, 5, 30]);
  [0, 1, 2].forEach(i => H.apply(st, i, { t: 'reveal', k: 0 }));
  eq(st.cap, 5 - 0, '상한 = 가장 적은 칩 (기본 베팅 낸 뒤) ' + st.cap);
  const s = H.needs(st)[0];
  ok(!H.apply(st, s, { t: 'raise', to: st.cap + 1 }).ok, '상한 넘는 레이즈 거절');
  ok(H.apply(st, s, { t: 'raise', to: 2 }).ok, '상한 안 레이즈');
  const t = H.needs(st)[0];
  ok(!H.apply(st, t, { t: 'check' }).ok, '건 사람이 있으면 체크 거절');
  ok(H.apply(st, t, { t: 'fold' }).ok, '폴드');
}

// 5) 끝까지 (AI 끼리) + 칩 보존 + 규칙 어김 없음
function playOut(n, seed, tiers, chips) {
  const st = H.init({ n, seed, cfg: { chips } }), r = rngOf(seed ^ 99);
  let guard = 0;
  while (!H.over(st) && guard++ < 60000) {
    const need = H.needs(st);
    if (!need.length) { ok(H.auto(st) != null, '입력도 자동도 없으면 멈춤 (' + st.phase + ')'); H.advance(st); continue; }
    const s = need[0];
    const total = st.chips.reduce((a, b) => a + b, 0) + st.pot;
    const a = H.ai(H.view(st, s), s, tiers[s % tiers.length], r);
    const res = H.apply(st, s, a);
    if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${tiers[s % tiers.length]} ${st.phase} 자리 ${s} ${JSON.stringify(a)}): ${res.err}`); return st; }
    const total2 = st.chips.reduce((a, b) => a + b, 0) + st.pot;
    if (total !== total2) { ok(false, '칩이 늘거나 줄었어요'); return st; }
  }
  ok(H.over(st), `끝남 (n=${n} seed=${seed} 손 ${st.hand})`);
  return st;
}
for (const [n, seed, tiers, chips] of [[2, 1, ['hard'], 15], [3, 2, ['normal'], 15], [4, 3, ['easy', 'normal', 'hard'], 15], [5, 4, ['hard', 'normal'], 15], [6, 5, ['normal'], 15], [4, 6, ['hard'], 30], [5, 7, ['easy', 'hard'], 30], [3, 8, ['easy'], 30]]) {
  const st = playOut(n, seed, tiers, chips);
  const rk = H.ranks(st);
  ok(rk.filter(x => x === 0).length === 1, '1등은 한 명 (' + rk + ')');
  ok(rk.every(x => x >= 0 && x < n), '등수 범위');
  eq(st.chips.reduce((a, b) => a + b, 0), n * chips, '끝났을 때 칩 합 = 처음 합');
}

// 6) 숨김: 남의 숨은 카드를 바꿔도 내 화면 · 선생님 글 · AI 수가 같아야 함
{
  let leaks = 0, checks = 0;
  for (let k = 0; k < 8; k++) {
    const n = 3 + (k % 3), st = H.init({ n, seed: 600 + k, cfg: { chips: 15 } }), r = rngOf(k + 9);
    let steps = 0;
    while (!H.over(st) && steps++ < 1500) {
      const need = H.needs(st);
      if (!need.length) { H.advance(st); continue; }
      const s = need[0];
      if (steps % 3 === 0 && st.phase !== 'reveal') {
        const alt = JSON.parse(JSON.stringify(st));
        for (let o = 0; o < n; o++) {
          if (o === s || !alt.cards[o] || !alt.cards[o].hid) continue;
          alt.cards[o].hid = alt.cards[o].hid.map(v => (v === 4 ? 3 : 4));   // 숨은 카드만 바꿈 (공개 카드 · 덱은 그대로)
          alt.cards[o].hand = alt.cards[o].open.concat(alt.cards[o].hid);
        }
        const v1 = H.view(st, s), v2 = H.view(alt, s);
        checks++;
        if (JSON.stringify(v1.hands.map(h => h && h.open)) !== JSON.stringify(v2.hands.map(h => h && h.open))) { leaks++; }
        if (JSON.stringify(v1.hands.map((h, i) => (i === s ? 0 : h && h.hid))) !== JSON.stringify(v2.hands.map((h, i) => (i === s ? 0 : h && h.hid)))) { leaks++; console.error('남의 숨은 카드가 보임'); }
        if (v1.pub !== v2.pub) { leaks++; console.error('pub 지문이 숨은 카드에 따라 달라짐'); }
        const c1 = H.coach(v1, s, -1, null), c2 = H.coach(v2, s, -1, null);
        if (JSON.stringify(c1) !== JSON.stringify(c2)) { leaks++; if (leaks < 4) console.error('선생님 글이 숨은 카드에 따라 달라짐', st.phase); }
        const a1 = H.ai(v1, s, 'hard', rngOf(5)), a2 = H.ai(v2, s, 'hard', rngOf(5));
        if (JSON.stringify(a1) !== JSON.stringify(a2)) { leaks++; if (leaks < 4) console.error('AI 수가 숨은 카드에 따라 달라짐'); }
      }
      const a = H.ai(H.view(st, s), s, 'normal', r);
      ok(H.apply(st, s, a).ok, '숨김 시험 진행');
    }
  }
  ok(checks > 20, '숨김 비교 횟수 ' + checks);
  ok(leaks === 0, '남의 숨은 카드가 내 화면 · 선생님 · AI 에 새지 않음 (누출 ' + leaks + ')');
}

// 7) 공개 지문: 모든 자리 같음
{
  const st = H.init({ n: 4, seed: 21, cfg: { chips: 15 } }), r = rngOf(3);
  let steps = 0;
  while (!H.over(st) && steps++ < 400) {
    const need = H.needs(st);
    if (!need.length) { H.advance(st); continue; }
    const pubs = new Set([0, 1, 2, 3].map(i => H.view(st, i).pub).concat(H.view(st, 'all').pub));
    ok(pubs.size === 1, '모든 자리의 pub 지문이 같음');
    const s = need[0]; H.apply(st, s, H.ai(H.view(st, s), s, 'normal', r));
  }
}

// 8) 동시 공개: 먼저 고른 사람 카드가 둘째 · 구경꾼에게 안 보임 (view · log · pub), 둘 다 고른 뒤 함께 공개
{
  const st = H.init({ n: 3, seed: 5, cfg: { chips: 30 } });
  ok(st.phase === 'reveal', '공개 단계');
  const need = H.needs(st).slice();
  const first = need[0], second = need[1];
  H.apply(st, first, { t: 'reveal', k: 1 });
  for (const s of [second, -1]) {
    const v = H.view(st, s);
    eq(v.hands[first].open, [], '먼저 고른 카드는 view(' + s + ') 에 안 보임');
    ok(v.hands[first].first === undefined, 'first 도 숨김');
    ok(!v.log.some(e => e.k === 'reveal'), '로그에도 아직 없음 (view ' + s + ')');
  }
  eq(H.view(st, first).hands[first].open.length, 1, '내가 고른 카드는 나에게 보임');
  ok(H.view(st, second).pub === H.view(st, -1).pub && H.view(st, second).pub === H.view(st, first).pub, 'pub 지문에도 안 실림');
  for (const s of need.slice(1)) H.apply(st, s, { t: 'reveal', k: 0 });
  ok(st.phase === 'bet1', '모두 고르면 베팅');
  const v = H.view(st, -1);
  ok(v.hands.every(h => !h || h.open.length === 1), '둘 다 고른 뒤에는 모두에게 공개');
  eq(v.log.filter(e => e.k === 'reveal').length, 3, '로그에 한꺼번에 올라감');
}

// 9) 추천 = 고급 AI (같은 고정 난수)
{
  let cmp = 0, bad = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const st = H.init({ n: 4, seed, cfg: { chips: 15 } }), r = rngOf(seed); let steps = 0;
    while (!H.over(st) && steps++ < 300) {
      const need = H.needs(st); if (!need.length) { H.advance(st); continue; }
      const s = need[0], V = H.view(st, s);
      const c = H.coach(V, s, -1, null), a = H.ai(V, s, 'hard', H.coachRng(V, s)), rec = c.rec;
      const want = a.t === 'reveal' ? new RegExp('^' + V.hands[s].raw[a.k] + ' 공개') : a.t === 'hit' ? /^HIT/ : a.t === 'stay' ? /^STAY/ : a.t === 'fold' ? /^폴드/ : a.t === 'call' ? /^콜/ : a.t === 'check' ? /^체크/ : new RegExp('레이즈 → ' + a.to + '칩');
      cmp++; if (!want.test(rec)) { bad++; console.error('추천 어긋남', rec, JSON.stringify(a)); }
      H.apply(st, s, H.ai(V, s, 'normal', r));
    }
  }
  ok(cmp > 50 && bad === 0, '💡 추천 = 고급 AI (' + cmp + '곳 중 어긋남 ' + bad + ')');
}

console.log(`HIT, STAY 시험: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

// 빅 스몰 규칙 시험 (node survival/test/bigsmall_selftest.js [--quick])
'use strict';
const C = require('../games/bigsmall/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mask = a => a.reduce((m, v) => m | (1 << v), 0);
const card = v => ({ t: 'card', v }), bet = (side, amt) => ({ t: 'bet', side, amt });
// 장면 만들기: r 라운드 · duel 이 대결 · 딜러 D 공개 (first 는 r · duel 에 맞춰)
function scene({ r, duel, D, hand, dset, chips }) {
  const st = C.init({ n: 2, seed: 1 });
  st.r = r; st.first = ((duel - (r - 1)) % 2 + 2) % 2; st.duel = duel; st.D = D;
  st.hand = hand.map(mask); st.dset = dset.map(mask); st.chips = chips.slice();
  st.phase = 'duel'; st.P = -1; st.bet = null; st.hist = []; st.over = false; st.res = null;
  return st;
}
function playAI(seed, tiers, r) {
  const st = C.init({ n: 2, seed }); let guard = 0;
  while (!C.over(st) && guard++ < 200) {
    const need = C.needs(st);
    if (!need.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    const s = need[0], a = C.ai(C.view(st, s), s, tiers[s], r), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
  }
  return st;
}

// 1) 처음 상태
{
  const st = C.init({ n: 2, seed: 7 });
  ok(st.r === 1 && st.phase === 'duel' && J(st.chips) === '[10,10]', '1라운드 · 칩 10개씩 · 카드 내기부터');
  ok(C.bits(st.hand[0]).length === 11 && J(C.bits(st.hand[1])) === J([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), '손패 0~10 11장');
  ok(st.duel === st.first && J(C.needs(st)) === J([st.duel]), '1라운드 대결 = 처음 정한 사람');
  ok(st.D >= 1 && st.D <= 9 && !(st.dset[st.duel] >> st.D & 1) && C.bits(st.dset[st.duel]).length === 8 && C.bits(st.dset[1 - st.duel]).length === 9, '딜러 카드는 대결하는 사람 몫(1~9)에서 한 장');
  const firsts = new Set(); for (let s = 1; s < 40; s++) firsts.add(C.init({ n: 2, seed: s }).first);
  ok(firsts.size === 2, '1라운드 역할은 판마다 무작위');
  ok(C.init({ n: 5, seed: 1 }).n === 2, '언제나 2명');
}

// 2) 정산
{
  ok(J(C.settle(7, 3, 'B', 2)) === '[4,2]', '7 > 3: 대결 +4 · 빅 맞음 +2');
  ok(J(C.settle(7, 3, 'S', 2)) === '[4,-2]', '7 > 3: 스몰 틀림 −2');
  ok(J(C.settle(2, 5, 'S', 3)) === '[0,3]', '2 < 5: 대결 0 · 스몰 맞음 +3');
  ok(J(C.settle(2, 5, 'B', 3)) === '[0,-3]', '2 < 5: 빅 틀림 −3');
  ok(J(C.settle(5, 5, 'B', 4)) === '[0,0]' && J(C.settle(5, 5, 'S', 4)) === '[0,0]', '같으면 대결 0 · 베팅 돌려받음');
  ok(J(C.settle(10, 1, 'B', 1)) === '[9,1]', '10 vs 1 → +9');
}

// 3) 잘못된 행동
{
  const st = C.init({ n: 2, seed: 3 }), d = st.duel, b = 1 - d;
  ok(!C.apply(st, b, card(5)).ok, '대결 아닌 사람은 카드를 못 냄');
  ok(!C.apply(st, d, bet('B', 1)).ok, '카드 내기 전엔 베팅 못 함');
  ok(!C.apply(st, d, card(11)).ok && !C.apply(st, d, card(-1)).ok && !C.apply(st, d, card(2.5)).ok, '0~10 밖 · 소수 안 됨');
  ok(!C.apply(st, d, null).ok && !C.apply(st, d, { t: 'x' }).ok, '모르는 행동');
  ok(C.apply(st, d, card(6)).ok && st.phase === 'bet', '카드 냄 → 베팅');
  ok(!C.apply(st, d, card(7)).ok, '한 라운드에 카드 한 장');
  ok(!C.apply(st, d, bet('B', 1)).ok, '대결한 사람은 베팅 못 함');
  ok(!C.apply(st, b, bet('X', 1)).ok && !C.apply(st, b, bet('B', 0)).ok && !C.apply(st, b, bet('B', 11)).ok && !C.apply(st, b, bet('B', 1.5)).ok, '쪽 · 칩 수 확인 (1~가진 칩)');
  ok(J(C.legal(st, b).map(a => a.amt).filter((x, i, a) => a.indexOf(x) === i)) === J([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) && C.legal(st, b).length === 20, '베팅 후보 = 빅 · 스몰 × 1~10');
  ok(C.legal(st, d).length === 0, '대결한 사람은 할 것 없음');
  ok(C.apply(st, b, bet('B', 10)).ok, '가진 칩 전부 걸기 됨');
  ok(st.phase === 'show' || st.over, '결과');
  ok(!C.apply(st, d, card(1)).ok && !C.apply(st, b, bet('B', 1)).ok, '결과 중엔 아무것도 못 함');
  ok(C.bits(st.hand[d]).indexOf(6) < 0, '낸 카드는 버림');
}

// 4) 숨김: 낸 카드는 베팅이 끝날 때까지 낸 사람만
{
  const st = C.init({ n: 2, seed: 11 }), d = st.duel, b = 1 - d;
  const pubs = () => [C.view(st, 0).pub, C.view(st, 1).pub, C.view(st, -1).pub];
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (카드 내기 전)');
  C.apply(st, d, card(8));
  const Vd = C.view(st, d), Vb = C.view(st, b), Vw = C.view(st, -1), Va = C.view(st, 'all');
  ok(Vd.P === 8 && Vb.P === -1 && Vw.P === -1 && Va.P === 8, '낸 카드는 낸 사람만 봄');
  ok(Vb.hand[d] >> 8 & 1 && Vb.handOwn[d] >> 8 & 1, '상대 손패에서 낸 카드가 빠지지 않은 것처럼 (빠진 카드로 드러나지 않게)');
  ok(!(Vd.handOwn[d] >> 8 & 1) && Vd.hand[d] >> 8 & 1, '내 진짜 손패(handOwn)엔 빠짐 · 공개 손패엔 있음');
  ok(Vb.sent === true && Vb.phase === 'bet', '냈다는 것만 보임');
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (베팅 중)');
  ok(!J(Vb.log).includes('"v":8') && !J(Vb.log).includes('"P":8'), '기록에 낸 카드가 새지 않음');
  C.apply(st, b, bet('S', 2));
  ok(C.view(st, b).P === 8 && C.view(st, -1).P === 8, '베팅 뒤엔 모두 봄');
  ok(new Set(pubs()).size === 1, '공개 지문 같음 (결과)');
}

// 5) 한 라운드 · 역할 바뀜 · 다음 라운드
{
  const st = scene({ r: 1, duel: 0, D: 3, hand: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], dset: [[1, 2, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9]], chips: [10, 10] });
  C.apply(st, 0, card(7)); C.apply(st, 1, bet('S', 2));
  ok(J(st.chips) === '[14,8]', '7 vs 3 → 대결 +4 · 스몰 틀림 −2');
  ok(st.hist.length === 1 && J(st.hist[0]) === J({ r: 1, duel: 0, D: 3, P: 7, side: 'S', amt: 2, g: 4, b: -2, chips: [14, 8] }), '기록');
  ok(st.phase === 'show' && C.auto(st) === 2600 && !C.needs(st).length, '결과를 잠깐 보여 줌');
  const V = C.view(st, 1);
  ok(V.last && V.last.P === 7 && V.bet.side === 'S', '보기에 지난 결과');
  C.advance(st);
  ok(st.r === 2 && st.duel === 1 && st.phase === 'duel' && J(C.needs(st)) === '[1]', '2라운드는 역할이 바뀜');
  ok(C.bits(st.dset[1]).length === 8 && C.bits(st.dset[0]).length === 8, '딜러 카드는 대결하는 사람 몫에서');
  C.apply(st, 1, card(4)); C.apply(st, 0, bet('B', 3));
  ok(J(st.chips) === J([14 + (st.D < 4 ? 3 : st.D > 4 ? -3 : 0), 8 + Math.max(0, 4 - st.D)]), '2라운드 정산 (딜러 ' + st.D + ')');
}

// 6) 18라운드 한 판: 대결 9번씩 · 딜러 카드 다 씀 · 손패 2장 남음 · 칩 합 확인
{
  const r = mul(9); let bad = 0, games = 0;
  for (let s = 0; s < (QUICK ? 15 : 60); s++) {
    const st = C.init({ n: 2, seed: 100 + s }), duels = [0, 0];
    let chipsOk = true;
    while (!C.over(st)) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const q = need[0];
      if (st.phase === 'duel') duels[q]++;
      const before = st.chips[0] + st.chips[1];
      const a = C.ai(C.view(st, q), q, ['easy', 'normal', 'hard'][s % 3], r);
      if (!C.apply(st, q, a).ok) { bad++; break; }
      if (st.phase === 'show' || st.over) { const h = st.hist[st.hist.length - 1]; if (st.chips[0] + st.chips[1] !== before + h.g + h.b) chipsOk = false; }
    }
    games++;
    if (!chipsOk) bad++;
    if (st.res.why === 'end') {
      if (st.r !== 18 || duels[0] !== 9 || duels[1] !== 9 || st.dset[0] || st.dset[1] || C.bits(st.hand[0]).length !== 2 || C.bits(st.hand[1]).length !== 2) { bad++; if (bad < 3) console.error(J({ r: st.r, duels, ds: st.dset, h: st.hand })); }
    } else if (st.res.why !== 'zero' || st.chips[1 - st.res.w] > 0) bad++;
  }
  ok(!bad && games > 10, `한 판 끝까지 (${games}판, 문제 ${bad})`);
}

// 7) 칩 0개 → 바로 끝
{
  const st = scene({ r: 4, duel: 0, D: 5, hand: [[0, 2, 6, 7, 8, 9, 10], [0, 1, 2, 3, 4, 5, 6, 8, 9, 10]], dset: [[1, 2, 3, 4, 6, 7], [1, 2, 3, 4, 5, 6, 7]], chips: [16, 2] });
  C.apply(st, 0, card(9)); C.apply(st, 1, bet('S', 2));
  ok(st.over && st.res.w === 0 && st.res.why === 'zero' && st.chips[1] === 0 && J(C.ranks(st)) === '[0,1]', '베팅으로 칩 0개 → 대결한 사람 바로 승');
  ok(C.auto(st) === null && !C.needs(st).length, '끝나면 멈춤');
  const s2 = scene({ r: 4, duel: 1, D: 5, hand: [[0, 2, 6, 7, 8, 9, 10], [0, 1, 2, 3, 4, 5, 6, 8, 9, 10]], dset: [[1, 2, 3, 4, 6, 7], [1, 2, 3, 4, 5, 6, 7]], chips: [3, 14] });
  C.apply(s2, 1, card(5)); C.apply(s2, 0, bet('B', 3));
  ok(!s2.over && s2.chips[0] === 3, '같은 숫자면 돌려받아 0개가 안 됨');
}

// 8) 18라운드 끝: 칩 비교 · 같으면 무승부
{
  const mk = chips => scene({ r: 18, duel: 1, D: 4, hand: [[3, 9], [1, 8]], dset: [[], [4]], chips });
  let st = mk([9, 10]); C.apply(st, 1, card(1)); C.apply(st, 0, bet('S', 1));
  ok(st.over && st.res.why === 'end' && J(st.chips) === '[10,10]' && st.res.w === -1 && J(C.ranks(st)) === '[0,0]', '칩이 같으면 무승부');
  st = mk([9, 10]); C.apply(st, 1, card(8)); C.apply(st, 0, bet('S', 1));
  ok(st.over && J(st.chips) === '[8,14]' && st.res.w === 1 && J(C.ranks(st)) === '[1,0]', '칩 많은 사람 승');
  st = mk([12, 10]); C.apply(st, 1, card(1)); C.apply(st, 0, bet('S', 1));
  ok(st.res.w === 0 && J(C.ranks(st)) === '[0,1]', '0번 승');
}

// 9) 같은 씨앗 → 같은 판 · 보기는 상태를 안 바꿈
{
  const a = playAI(77, ['hard', 'normal'], mul(3)), b = playAI(77, ['hard', 'normal'], mul(3));
  ok(J(a.hist) === J(b.hist) && J(a.res) === J(b.res), '같은 씨앗 · 같은 AI → 같은 판');
  const st = C.init({ n: 2, seed: 5 }), s0 = J(st);
  C.view(st, 0); C.view(st, 1); C.view(st, -1); C.view(st, 'all'); C.legal(st, st.duel);
  ok(J(st) === s0, '보기 · 후보는 상태를 안 바꿈');
}

// 10) AI: 모든 단계가 규칙 안 · 고급이 쉬움을 이김
{
  let bad = 0;
  for (let s = 0; s < (QUICK ? 6 : 18); s++) {
    try { playAI(300 + s, [['easy', 'normal', 'hard'][s % 3], ['hard', 'easy', 'normal'][s % 3]], mul(s + 1)); } catch (e) { bad++; console.error(e.message); }
  }
  ok(!bad, 'AI 수는 늘 규칙 안');
  let w = 0, games = QUICK ? 30 : 80;
  for (let s = 0; s < games; s++) {
    const hs = s % 2, st = playAI(500 + s, hs ? ['easy', 'hard'] : ['hard', 'easy'], mul(900 + s));
    const rk = C.ranks(st); w += rk[hs] < rk[1 - hs] ? 1 : rk[hs] === rk[1 - hs] ? 0.5 : 0;
  }
  ok(w / games >= 0.7, `고급 vs 쉬움 ${(w / games * 100).toFixed(0)}% (70% 이상)`);
}

// 11) 선생님 · 복기 보조
{
  // 틀릴 수 없는 베팅: 상대 손패가 모두 딜러보다 작음 → 스몰에 전부
  const st = scene({ r: 16, duel: 0, D: 7, hand: [[0, 2, 5], [1, 4, 9]], dset: [[3], [6]], chips: [10, 6] });
  C.apply(st, 0, card(5));
  const V = C.view(st, 1), Bc = C.betChoice(V), Rc = C.recommend(V, 1);
  ok(Bc.sure && Bc.side === 'S' && Bc.a.amt === 6 && Bc.pl < 0.01, '틀릴 수 없으면 스몰에 전부 ' + J(Bc.a));
  ok(Rc && J(Rc.a) === J(Bc.a) && C.ai(V, 1, 'hard', mul(1)).amt === 6, '추천 = 고급 AI 수');
  const Jg = C.judge(V, 1, bet('B', 6), Bc.a);
  ok(Jg && Jg.best - Jg.my > 0.3, `복기: 반대로 걸면 크게 손해 (${Jg && Jg.best.toFixed(2)} vs ${Jg && Jg.my.toFixed(2)})`);
  // 대결: 추천은 손패 안 · 섞는 비율 합 1
  const s2 = C.init({ n: 2, seed: 41 }), d = s2.duel, R2 = C.recommend(C.view(s2, d), d);
  ok(R2 && C.bits(s2.hand[d]).includes(R2.a.v) && Math.abs(R2.pB + R2.pS + R2.pT - 1) < 1e-6 && R2.mix.length >= 1, '대결 추천 ' + J(R2.a) + ' 섞기 ' + J(R2.mix.map(z => z[0])));
  ok(C.recommend(C.view(s2, 1 - d), 1 - d) === null, '내 차례가 아니면 추천 없음');
  // 0 · 10: 0 은 늘 스몰, 10 은 늘 빅
  const s3 = scene({ r: 3, duel: 1, D: 9, hand: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 10]], dset: [[1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8]], chips: [10, 10] });
  C.apply(s3, 1, card(10));
  const B3 = C.betChoice(C.view(s3, 0));
  ok(B3.side === 'B' || B3.side === 'S', '0 · 10 만 남은 손패 베팅 ' + J(B3.a));
}

// 12) 화면 글 (Node 안에서)
{
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  window.SVCores = { bigsmall: C }; require('../games/bigsmall/ui.js');
  const U = window.SVUI.bigsmall;
  ok(U && U.name === '빅 스몰' && U.min === 2 && U.max === 2 && U.board === false && typeof U.render === 'function', 'UI 등록');
  const tut = U.tutorial();
  ok(tut.length >= 5 && tut.filter(t => t.interactive).length === 1, '1분 규칙: 대화형 한 단계');
  ok(tut.every(t => !/undefined|null|NaN/.test((t.body || '') + (t.boardHtml || ''))), '1분 규칙 글이 깨끗함');
  ok(U.howto.length >= 5 && /18라운드/.test(U.howto.join('')) && /0~10/.test(U.howto.join('')), '규칙 글');
  const st = C.init({ n: 2, seed: 21 }); const r = mul(5);
  let bad = 0, n = 0, recs = 0;
  for (let i = 0; i < 80 && !C.over(st); i++) {
    const need = C.needs(st);
    if (!need.length) { C.advance(st); continue; }
    const q = need[0];
    for (const me of [0, 1]) {
      const V = C.view(st, me), co = U.coach(V, me, -1);
      const txt = co.opp + co.mine + co.rec + co.why + U.sub(V) + J(U.chip(V, me));
      if (/undefined|null|NaN|\[object|Infinity/.test(txt)) { bad++; if (bad < 3) console.error(txt); }
      if (V.needs.includes(me)) { recs++; if (!/%|틀릴 수 없/.test(co.why)) { bad++; if (bad < 3) console.error('근거 숫자 없음', co.why); } }
      n++;
    }
    const V = C.view(st, q), a = C.ai(V, q, i % 3 ? 'easy' : 'hard', r);
    const t = U.actText(a, V); if (!t || /undefined/.test(t)) bad++;
    // 복기 고리
    const best = C.recommend(V, q).a, rv = U.review(V, q, a, best);
    if (!(rv.sev >= 0 && rv.sev <= 100) || /undefined|NaN/.test(rv.why + rv.my + rv.best)) { bad++; if (bad < 3) console.error(J(rv)); }
    C.apply(st, q, a);
  }
  ok(!bad && n > 50 && recs > 20, `선생님 · 글 깨끗함 (${n}번, 추천 ${recs}번)`);
  // 복기: 틀릴 수 없는 판에서 반대로 건 수
  const s2 = scene({ r: 16, duel: 0, D: 7, hand: [[0, 2, 5], [1, 4, 9]], dset: [[3], [6]], chips: [10, 6] });
  C.apply(s2, 0, card(5));
  const Vb = C.view(s2, 1), best = C.recommend(Vb, 1).a;
  const rv = U.review(Vb, 1, bet('B', 6), best);
  ok(rv.sev >= 75 && /고급 AI/.test(rv.why) && /스몰/.test(rv.why), `복기 심각도 ${rv.sev}: ${rv.why}`);
  const rv2 = U.review(Vb, 1, best, best);
  ok(rv2.sev <= 5, '같은 수면 낮음 ' + rv2.sev);
  ok(U.actText(card(7), null) === '카드 7 내기' && U.actText(bet('B', 2), null) === '빅에 2칩', '판 없이도 글');
  const co = U.coach(Vb, 1, -1);
  ok(/틀릴 수 없/.test(co.why) && /스몰에 6칩/.test(co.rec), '선생님: 확실한 베팅 ' + co.rec + ' / ' + co.why);
  // 끝 글
  const e = scene({ r: 18, duel: 1, D: 4, hand: [[3, 9], [1, 8]], dset: [[], [4]], chips: [9, 10] });
  C.apply(e, 1, card(8)); C.apply(e, 0, bet('S', 1));
  const res = U.result(C.view(e, 0), 0);
  ok(/상대 승/.test(res) && /14 : 8/.test(res) && !/undefined/.test(res), '결과 글: ' + res.replace(/<[^>]+>/g, ' '));
  const z = scene({ r: 4, duel: 0, D: 5, hand: [[0, 2, 6, 7, 8, 9, 10], [0, 1, 2, 3, 4, 5, 6, 8, 9, 10]], dset: [[1, 2, 3, 4, 6, 7], [1, 2, 3, 4, 5, 6, 7]], chips: [16, 2] });
  C.apply(z, 0, card(9)); C.apply(z, 1, bet('S', 2));
  ok(/0개/.test(U.result(C.view(z, 0), 0)) && /🏆/.test(U.result(C.view(z, 0), 0)), '칩 0개 결과 글');
}

console.log(`bigsmall selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// 스위치 포커 규칙 시험: node survival/test/switchpoker_selftest.js
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'games', 'switchpoker', 'core.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, clone = o => JSON.parse(J(o));
const lcg = s => { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const t0 = Date.now();
const need = st => C.needs(st)[0];
const act = (st, s, a, m) => { const r = C.apply(st, s, a); ok(r.ok, `${m || ''} 자리 ${s} ${J(a)} → ${r.err || ''}`); return r.ok; };
// 라운드 손패 · 오픈 · 더미를 방송대로 깔기 (더미는 뒤에서부터 뽑힘)
function deal(st, hands, open, deck) {
  const used = new Set([].concat(...hands, [open], deck));
  ok(used.size === 15 && [...used].every(c => c >= 1 && c <= 15), `깐 카드가 1~15 한 벌 (${[...used].length})`);
  st.hands = hands.map(h => h.slice()); st.open = open; st.deck = deck.slice();
}

// 1) 방송 7라운드 (나무위키 피의 게임3/1일차 · 공식 영상 자막): 자리 옵션 '한 팀' = 0 홍진호(낙원 주) · 1 최혜선(낙원 조력자) · 2 김영광(저택 주) · 3 임현서(저택 조력자)
//    1라운드 선공 = 낙원 (최혜선 → 홍진호 → 임현서 → 김영광), 이후 번갈아. 방송에 없는 손패 · 행동(편집된 자리)은 끝 칩이 맞게 채움 — 6 · 7라운드 세부는 방송이 편집
{
  const HJ = 0, CH = 1, KY = 2, IH = 3;
  const st = C.init({ seed: 77, cfg: { seat: 'co' } });
  ok(J(st.tm) === '[0,0,1,1]' && st.mn[0] && !st.mn[1] && st.mn[2] && !st.mn[3], '한 팀 자리: 0·1 = A팀(주 · 조력자), 2·3 = B팀');
  // 1라운드 선공을 낙원으로
  st.first = 0; st.order = [CH, HJ, IH, KY]; st.cur = CH;
  const chk = (want, m) => ok(J(st.chips) === J(want), `${m}: 칩 ${J(st.chips)} = 방송 ${J(want)}`);
  // ── 1R (오픈 15 → 12): 최혜선 오픈 카드 변경 · 홍진호 6 버림(10 뽑음) · 임현서 13↔3 교환 · 김영광 9 버림(14 뽑음)
  deal(st, [[6, 11], [4, 8], [3, 9], [7, 13]], 15, [5, 2, 1, 14, 10, 12]);
  act(st, CH, { t: 'open' }, '1R'); ok(st.open === 12 && st.disc.some(d => d.c === 15 && d.o), '1R 오픈 15 → 12 (15 는 버린 카드로)');
  act(st, HJ, { t: 'draw' }); ok(st.hands[HJ].includes(10) && st.phase === 'drop', '1R 홍진호 10 뽑음');
  act(st, HJ, { t: 'drop', c: 6 });
  act(st, IH, { t: 'swap', c: 13 }); ok(st.phase === 'reply' && need(st) === KY && st.hands[KY].length === 3, '1R 임현서가 13을 건넴 → 김영광 차례 (3장)');
  act(st, KY, { t: 'back', c: 3 }); ok(J(st.hands[IH].slice().sort((a, b) => a - b)) === '[3,7]' && st.kn[IH].includes(13) && st.kn[KY].includes(3), '1R 13↔3 · 서로 아는 카드');
  ok(need(st) === KY && st.phase === 'act', '1R 교환은 임현서 턴 — 이제 김영광 턴');
  act(st, KY, { t: 'draw' }); act(st, KY, { t: 'drop', c: 9 }); ok(J(st.hands[KY].slice().sort((a, b) => a - b)) === '[13,14]', '1R 김영광 13·14');
  ok(st.phase === 'bet' && need(st) === CH, '1R 베팅은 최혜선부터');
  ok(!C.apply(st, CH, { t: 'call' }).ok, '처음 여는 사람은 콜(체크) 못 함');
  act(st, CH, { t: 'raise', r: 1 }); act(st, HJ, { t: 'call' }); act(st, IH, { t: 'raise', r: 2 }); act(st, KY, { t: 'raise', r: 2 });
  act(st, CH, { t: 'fold' }); act(st, HJ, { t: 'fold' }); act(st, IH, { t: 'call' });
  ok(st.phase === 'show' && st.res.win === KY && st.res.sums[KY] === 27 && st.res.sums[IH] === 22 && st.res.getOpen === IH && st.res.pot === 16, `1R 김영광 27 승 · 임현서 3+7+오픈 12 = 22 · 팟 16 (${J(st.res.sums)})`);
  chk([18, 18, 30, 14], '1R');
  ok(st.res.hands[CH] === null && st.res.hands[HJ] === null && J(st.res.hands[KY]) !== 'null', '폴드한 사람 손패는 결과에 안 나옴');
  // ── 2R (오픈 1, 저택 선공): 김영광 3 버림(15 뽑음) · 4Raise(6Bet) · 나머지 폴드
  C.advance(st); ok(st.round === 2 && st.first === 1 && J(st.order) === J([IH, KY, CH, HJ]), '2R 선공 = 저택 (임현서 → 김영광 → 최혜선 → 홍진호)');
  ok(J(st.bet) === '[1,1,1,1]' && J(st.chips) === '[17,17,29,13]', '2R 기본 베팅 1');
  deal(st, [[4, 10], [2, 7], [3, 12], [5, 9]], 1, [6, 8, 11, 13, 14, 15]);
  act(st, IH, { t: 'pass' }); act(st, KY, { t: 'draw' }); act(st, KY, { t: 'drop', c: 3 }); act(st, CH, { t: 'pass' }); act(st, HJ, { t: 'pass' });
  act(st, IH, { t: 'raise', r: 1 }); act(st, KY, { t: 'raise', r: 4 }); act(st, CH, { t: 'fold' }); act(st, HJ, { t: 'fold' }); act(st, IH, { t: 'fold' });
  ok(st.res.win === KY && st.res.act.length === 1 && st.res.hands.every(h => h === null), '2R 김영광 혼자 남아 승 (공개 없음)');
  chk([17, 17, 34, 12], '2R');
  // ── 3R (오픈 11, 낙원 선공): 최혜선 14↔5 · 홍진호 12 버림(13 뽑음) · 최혜선 1Bet → 5Raise → 콜 / 홍진호 2Raise → 4Raise
  C.advance(st); deal(st, [[5, 12], [2, 14], [8, 10], [1, 6]], 11, [3, 4, 7, 9, 15, 13]);
  act(st, CH, { t: 'swap', c: 14 }); act(st, HJ, { t: 'back', c: 5 }); ok(J(st.hands[HJ].slice().sort((a, b) => a - b)) === '[12,14]', '3R 홍진호 12·14');
  act(st, HJ, { t: 'draw' }); act(st, HJ, { t: 'drop', c: 12 }); act(st, IH, { t: 'pass' }); act(st, KY, { t: 'pass' });
  act(st, CH, { t: 'raise', r: 1 }); act(st, HJ, { t: 'raise', r: 2 }); act(st, IH, { t: 'fold' }); act(st, KY, { t: 'fold' });
  act(st, CH, { t: 'raise', r: 5 }); act(st, HJ, { t: 'raise', r: 4 }); act(st, CH, { t: 'call' });
  ok(st.res.win === HJ && st.res.sums[HJ] === 27 && st.res.sums[CH] === 18 && st.res.pot === 28, `3R 홍진호 27 승 · 최혜선 2+5+11 = 18 · 팟 28`);
  chk([32, 4, 33, 11], '3R');
  // ── 4R (오픈 2, 저택 선공): 임현서 12↔3 · 홍진호 9 뽑아 그대로 버림 · 김영광 15Bet · 홍진호 15Bet → 27 : 27 → 팟 34 이월
  C.advance(st); deal(st, [[13, 14], [1, 4], [3, 15], [6, 12]], 2, [5, 7, 8, 10, 11, 9]);
  act(st, IH, { t: 'swap', c: 12 }); act(st, KY, { t: 'back', c: 3 }); act(st, KY, { t: 'pass' }); act(st, CH, { t: 'pass' });
  act(st, HJ, { t: 'draw' }); act(st, HJ, { t: 'drop', c: 9 }); ok(J(st.hands[HJ].slice().sort((a, b) => a - b)) === '[13,14]', '4R 가져온 9를 그대로 버림');
  act(st, IH, { t: 'raise', r: 2 }); act(st, KY, { t: 'call' });           // 4R 베팅 순서는 끝 칩(임현서 3개 · 둘이 15개)이 맞게 채움
  ok(st.chips[CH] + st.bet[CH] === 4 && !C.apply(st, CH, { t: 'raise', r: 2 }).ok, '4R 최혜선 칩 4 → 이번 판은 4개까지만 (사이드 팟 없음)');
  act(st, CH, { t: 'fold' });
  ok(!C.apply(st, HJ, { t: 'raise', r: 9 }).ok && C.legal(st, HJ).filter(a => a.t === 'raise').length === 8, '4R 최혜선 폴드 뒤 상한 = 임현서 11');
  act(st, HJ, { t: 'raise', r: 2 }); act(st, IH, { t: 'fold' }); act(st, KY, { t: 'raise', r: 10 }); act(st, HJ, { t: 'call' });
  ok(st.res.win === -1 && st.res.tie && st.res.getOpen === -1 && st.carry === 34 && st.res.sums[HJ] === 27 && st.res.sums[KY] === 27, '4R 27 : 27 — 가장 낮은 사람도 둘이라 오픈 카드는 아무도 못 받고 팟 34 이월');
  chk([17, 3, 18, 8], '4R');
  // ── 5R (오픈 10, 기본 베팅 없음): 홍진호 7 버림(15 뽑음) · 임현서 8↔8 · 김영광 패스 · 최혜선 폴드 · 홍진호 1Bet · 둘 콜 → 홍진호 26
  C.advance(st); ok(st.base === 0 && J(st.bet) === '[0,0,0,0]' && J(st.chips) === '[17,3,18,8]', '5R 이월 라운드는 기본 베팅 없음');
  deal(st, [[7, 11], [2, 9], [1, 6], [5, 8]], 10, [3, 4, 12, 13, 14, 15]);
  act(st, CH, { t: 'pass' }); act(st, HJ, { t: 'draw' }); act(st, HJ, { t: 'drop', c: 7 });
  act(st, IH, { t: 'swap', c: 8 }); act(st, KY, { t: 'back', c: 8 }); ok(J(st.hands[IH].slice().sort((a, b) => a - b)) === '[5,8]' && st.kn[KY].includes(8) && !st.kn[IH].includes(8), '5R 8↔8 — 받은 카드를 그대로 돌려줌');
  act(st, KY, { t: 'pass' });
  ok(!C.apply(st, CH, { t: 'call' }).ok, '5R 첫 베팅도 체크 없음');
  act(st, CH, { t: 'fold' }); act(st, HJ, { t: 'raise', r: 1 }); act(st, IH, { t: 'call' }); act(st, KY, { t: 'call' });
  ok(st.res.win === HJ && st.res.sums[HJ] === 26 && st.res.getOpen === KY && st.res.sums[KY] === 17 && st.res.pot === 37 && st.carry === 0, `5R 홍진호 26 승 · 김영광 1+6+10 = 17 · 팟 37 (${J(st.res.sums)})`);
  chk([53, 3, 17, 7], '5R');
  // ── 6R (오픈 6, 저택 선공) — 방송 편집: 홍진호 12·13 = 25 승만 나옴. 끝 칩이 맞게: 임현서 2Raise · 김영광 콜 · 최혜선 폴드 · 홍진호 콜
  C.advance(st); deal(st, [[12, 13], [3, 7], [2, 8], [4, 9]], 6, [1, 5, 10, 11, 14, 15]);
  for (const s of [IH, KY, CH, HJ]) act(st, s, { t: 'pass' });
  act(st, IH, { t: 'raise', r: 2 }); act(st, KY, { t: 'call' }); act(st, CH, { t: 'fold' }); act(st, HJ, { t: 'call' });
  ok(st.res.win === HJ && st.res.sums[HJ] === 25, '6R 홍진호 12+13 = 25 승');
  chk([60, 2, 14, 4], '6R');
  // ── 7R (오픈 14, 낙원 선공): 최혜선 1·8 — 칩 2 라 모두 2개까지 · 넷 다 콜 → 1+8+14 = 23 으로 역전승
  C.advance(st); deal(st, [[10, 12], [1, 8], [5, 13], [3, 11]], 14, [2, 4, 6, 7, 9, 15]);
  for (const s of [CH, HJ, IH, KY]) act(st, s, { t: 'pass' });
  ok(C.legal(st, CH).filter(a => a.t === 'raise').length === 1, '7R 최혜선 칩 2 → 1개만 더 걸 수 있음');
  act(st, CH, { t: 'raise', r: 1 }); act(st, HJ, { t: 'call' }); act(st, IH, { t: 'call' }); act(st, KY, { t: 'call' });
  ok(st.res.win === CH && st.res.sums[CH] === 23 && st.res.getOpen === CH, '7R 최혜선 1+8+오픈 14 = 23 승');
  chk([58, 8, 12, 2], '7R (방송 끝: 홍진호 58 · 최혜선 8 · 김영광 12 · 임현서 2)');
  ok(C.over(st) && st.win === 0 && st.why === 'main' && J(C.ranks(st)) === '[0,0,2,2]', '7라운드 끝 — 주 플레이어 칩 58 : 12 로 낙원 승');
  ok(C.auto(st) === null && C.needs(st).length === 0, '끝난 판은 기다릴 것 없음');
}

// 2) 규칙 낱낱
{
  // 자리 · 순서
  for (const [map, tm, mn] of [['vs', [0, 1, 0, 1], [1, 1, 0, 0]], ['co', [0, 0, 1, 1], [1, 0, 1, 0]], ['help', [0, 0, 1, 1], [0, 1, 1, 0]]]) {
    const st = C.init({ seed: 5, cfg: { seat: map } });
    ok(J(st.tm) === J(tm) && J(st.mn.map(Number)) === J(mn), `자리 옵션 ${map}`);
    const F = st.first; ok(J(st.order) === J([st.po[F], st.mo[F], st.po[1 - F], st.mo[1 - F]]), `${map} 순서: 선공 팀 조력자 → 주 → 다른 팀 조력자 → 주`);
    ok(st.mt.every((m, s) => st.tm[m] === st.tm[s] && m !== s), `${map} 파트너`);
  }
  const firsts = new Set(); for (let sd = 1; sd < 40; sd++) firsts.add(C.init({ seed: sd }).first); ok(firsts.size === 2, '1라운드 선공 팀은 추첨');
  const st0 = C.init({ seed: 9 });
  ok(st0.R === 7 && C.init({ seed: 9, cfg: { rounds: 3 } }).R === 3, '7라운드 (짧게 3라운드 옵션)');
  ok(st0.chips.every(c => c === 19) && st0.bet.every(b => b === 1) && st0.hands.every(h => h.length === 2) && st0.deck.length === 6, '칩 20 · 기본 베팅 1 · 2장씩 · 더미 6');
  // 잘못된 행동은 판을 바꾸지 않음
  {
    const st = C.init({ seed: 12 }), s = need(st), other = (s + 1) % 4, before = J(st);
    const bad = [[other, { t: 'pass' }], [s, null], [s, { t: 'swap', c: 99 }], [s, { t: 'drop', c: st.hands[s][0] }], [s, { t: 'raise', r: 2 }], [s, { t: 'zzz' }]];
    for (const [q, a] of bad) ok(!C.apply(st, q, a).ok, '잘못된 행동 거절 ' + J(a));
    ok(J(st) === before, '거절된 행동은 상태를 안 바꿈');
  }
  // 베팅 규칙: 1~10개 · 정수 · 상한
  {
    const st = C.init({ seed: 21 }); for (let k = 0; k < 4; k++) act(st, need(st), { t: 'pass' });
    const s = need(st);
    ok(!C.apply(st, s, { t: 'raise', r: 11 }).ok && !C.apply(st, s, { t: 'raise', r: 0 }).ok && !C.apply(st, s, { t: 'raise', r: 1.5 }).ok, '레이즈는 1~10개 정수');
    act(st, s, { t: 'raise', r: 10 }); ok(st.bet[s] === 11 && st.chips[s] === 9, '레이즈 10 → 11개');
    const s2 = need(st); ok(C.legal(st, s2).some(a => a.t === 'call') && C.legal(st, s2).filter(a => a.t === 'raise').length === 9, '상한 20 → 9개까지 더');
  }
  // 동점: 가장 낮은 합이 둘이면 오픈 카드 없음 · 가장 큰 합이 둘이면 이월 · 한 사람만 남으면 공개 없이 승
  {
    const st = C.init({ seed: 3, cfg: { seat: 'co' } }); st.first = 0; st.order = [1, 0, 3, 2]; st.cur = 1;
    deal(st, [[1, 5], [2, 4], [3, 9], [7, 8]], 15, [6, 10, 11, 12, 13, 14]);
    for (const s of [1, 0, 3, 2]) act(st, s, { t: 'pass' });
    act(st, 1, { t: 'raise', r: 1 }); for (const s of [0, 3, 2]) act(st, s, { t: 'call' });
    ok(st.res.getOpen === -1 && st.res.sums[0] === 6 && st.res.sums[1] === 6 && st.res.win === 3 && st.res.sums[3] === 15, '가장 낮은 6이 둘 → 오픈 15 아무도 못 받음 · 15 승');
  }
  {
    const st = C.init({ seed: 3, cfg: { seat: 'co' } }); st.first = 0; st.order = [1, 0, 3, 2]; st.cur = 1;
    deal(st, [[1, 2], [9, 10], [4, 12], [5, 6]], 13, [3, 7, 8, 11, 14, 15]);
    for (const s of [1, 0, 3, 2]) act(st, s, { t: 'pass' });
    act(st, 1, { t: 'raise', r: 1 }); for (const s of [0, 3, 2]) act(st, s, { t: 'call' });
    ok(st.res.getOpen === 0 && st.res.sums[0] === 16 && st.res.win === 1 && st.res.sums[1] === 19, '1+2 = 3 이 혼자 가장 낮음 → 오픈 13 더해 16 (그래도 19 가 이김)');
  }
  // 칩 0 → 그 팀 바로 패배 · 둘 다 0 → 주 칩
  {
    const st = C.init({ seed: 4, cfg: { seat: 'co' } }); st.first = 0; st.order = [1, 0, 3, 2]; st.cur = 1;
    st.chips = [19, 2, 19, 19]; deal(st, [[1, 2], [3, 4], [14, 15], [5, 6]], 7, [8, 9, 10, 11, 12, 13]);
    for (const s of [1, 0, 3, 2]) act(st, s, { t: 'pass' });
    act(st, 1, { t: 'raise', r: 2 }); act(st, 0, { t: 'fold' }); act(st, 3, { t: 'fold' }); act(st, 2, { t: 'call' });
    ok(st.chips[1] === 0 && C.over(st) && st.win === 1 && st.why === 'zero' && st.round === 1, '조력자 칩 0 → 그 팀(A) 바로 패배 (1라운드에)');
  }
  {
    const st = C.init({ seed: 4, cfg: { seat: 'co' } }); st.first = 0; st.order = [1, 0, 3, 2]; st.cur = 1;
    st.chips = [19, 2, 19, 2]; deal(st, [[14, 15], [1, 2], [12, 13], [3, 4]], 5, [6, 7, 8, 9, 10, 11]);
    for (const s of [1, 0, 3, 2]) act(st, s, { t: 'pass' });
    act(st, 1, { t: 'raise', r: 2 }); act(st, 0, { t: 'call' }); act(st, 3, { t: 'call' }); act(st, 2, { t: 'call' });
    ok(st.chips[1] === 0 && st.chips[3] === 0 && C.over(st) && st.win === 0 && st.why === 'main0', `두 팀 다 칩 0 → 주 플레이어 칩으로 (${st.chips})`);
  }
  // 오픈 변경 · 버리기 · 교환의 아는 것
  {
    const st = C.init({ seed: 31, cfg: { seat: 'vs' } }); const s = need(st), m = st.mt[s], d0 = st.deck.length, o0 = st.open;
    act(st, s, { t: 'open' }); ok(st.deck.length === d0 - 1 && st.open !== o0 && st.disc[0].c === o0, '오픈 카드 변경: 먼저 카드는 버린 카드로');
    const s2 = need(st), m2 = st.mt[s2], g = st.hands[s2][0];
    act(st, s2, { t: 'swap', c: g }); ok(need(st) === m2 && st.hands[m2].length === 3 && st.hands[s2].length === 1, '교환: 파트너가 3장 들고 돌려줄 카드를 고름');
    const y = st.hands[m2].find(c => c !== g); act(st, m2, { t: 'back', c: y });
    ok(st.kn[s2].includes(g) && st.kn[m2].includes(y) && st.swaps.length === 1 && st.swaps[0].x === g && st.swaps[0].y === y, '교환 뒤 두 사람만 서로 아는 카드');
    ok(m === st.mt[s], '파트너 짝');
  }
  // 한 라운드에 두 번 교환: 돌아온 카드는 더 이상 '파트너가 든 카드'가 아님 (리뷰 지적)
  {
    const st = C.init({ seed: 77, cfg: { seat: 'vs' } }); const P = need(st), M = st.mt[P];
    ok(st.order[0] === P && st.order[1] === M, '조력자 → 주 순서');
    const g = st.hands[P][0]; act(st, P, { t: 'swap', c: g }); const y = st.hands[M].find(c => c !== g); act(st, M, { t: 'back', c: y });
    ok(need(st) === M && st.kn[P].includes(g), '첫 교환 뒤 조력자는 주가 든 카드를 앎');
    act(st, M, { t: 'swap', c: g });
    ok(need(st) === P && st.hands[P].includes(g) && !st.kn[P].includes(g) && !C.view(st, P).kn.includes(g), '같은 카드가 되돌아오면 아는 카드에서 빠짐 (돌려주기 단계에도)');
    ok(st.kn[M].includes(y) && st.hands[P].includes(y), '주는 여전히 조력자가 든 카드를 앎');
    act(st, P, { t: 'back', c: y }); ok(st.kn[P].length === 0 || st.kn[P].every(c => st.hands[M].includes(c)), '아는 카드 = 파트너 손에 실제로 있는 카드');
  }
}

// 3) 숨은 정보 · view 깊은 복사 · 공개 해시
{
  const st = C.init({ seed: 55, cfg: { seat: 'vs' } }), r = lcg(4);
  let steps = 0, seenGive = 0, seenSwap = 0, seenRes = 0;
  while (!C.over(st) && steps++ < 600) {
    const nd = C.needs(st);
    for (let s = 0; s < 4; s++) {
      const V = C.view(st, s);
      ok(J(V.hand) === J(st.hands[s]) && V.hands === null && V.deck === null, '내 손패만 · 남 손패 · 더미 순서 없음');
      if (V.give) { const inS = V.give.s === s || (V.give.t === 'swap' && st.mt[V.give.s] === s); ok(inS ? V.give.c === st.give.c : V.give.c === null, '건넨 · 뽑은 카드는 당사자만'); if (!inS) seenGive++; }
      ok(V.swaps.every(x => x.a === s || x.m === s), '교환 기록은 두 사람만'); if (st.swaps.length && V.swaps.length < st.swaps.length) seenSwap++;
      if (V.res) { ok(V.res.all === null && V.res.hands.every((h, j) => h === null || V.res.act.includes(j)), '결과: 끝까지 간 사람 손패만'); seenRes++; }
      ok(J(V.kn) === J(st.kn[s]), '아는 카드는 내 것만');
    }
    const Vp = C.view(st, -1), Va = C.view(st, 'all');
    ok(Vp.hand === null && Vp.kn === null && Vp.swaps.length === 0 && (!Vp.give || Vp.give.c === null), '구경(−1)은 공개만');
    ok(J(Va.hands) === J(st.hands) && J(Va.deck) === J(st.deck), "'all' 은 다 보임");
    ok(new Set([0, 1, 2, 3, -1, 'all'].map(x => C.view(st, x).pub)).size === 1, '공개 해시는 누가 봐도 같음');
    // 깊은 복사: view 를 마구 바꿔도 판은 그대로
    const before = J(st);
    for (const x of [0, 1, 2, 3, -1, 'all']) {
      const V = C.view(st, x);
      const scr = o => { if (Array.isArray(o)) { o.forEach(scr); o.push(99); } else if (o && typeof o === 'object') for (const k in o) { if (o[k] && typeof o[k] === 'object') scr(o[k]); else o[k] = 77; } };
      scr(V);
    }
    ok(J(st) === before, 'view 를 바꿔도 판 상태는 그대로 (깊은 복사)');
    if (!nd.length) { C.advance(st); continue; }
    const s = nd[0], V = C.view(st, s), V0 = J(V);
    const a = C.ai(V, s, ['easy', 'normal', 'hard'][steps % 3], r);
    ok(J(V) === V0, 'AI 가 view 를 안 바꿈');
    ok(C.apply(st, s, a).ok, 'AI 수가 규칙에 맞음 ' + J(a));
  }
  ok(C.over(st) && seenGive > 0 && seenSwap > 0 && seenRes > 0, `숨은 정보 시험이 고루 돎 (give ${seenGive} · swap ${seenSwap} · res ${seenRes})`);
}

// 4) AI: 여러 판 · 세 단계 · 세 자리 옵션 — 규칙에 맞고 끝남, 결정적, 시간
{
  let games = 0, maxH = 0, slow = [], why = {};
  for (let g = 0; g < 36; g++) {
    const map = ['vs', 'co', 'help'][g % 3], st = C.init({ seed: 900 + g, cfg: { seat: map, rounds: g % 4 === 3 ? 3 : 7 } }), r = lcg(g + 1);
    const tiers = [0, 1, 2, 3].map(k => ['easy', 'normal', 'hard'][(g + k) % 3]);
    let steps = 0;
    while (!C.over(st) && steps++ < 3000) {
      const nd = C.needs(st); if (!nd.length) { ok(C.auto(st) > 0, 'needs 가 비면 auto'); C.advance(st); continue; }
      const s = nd[0], V = C.view(st, s);
      let t1 = process.hrtime.bigint(); const a = C.ai(V, s, tiers[s], r); let ms = Number(process.hrtime.bigint() - t1) / 1e6;
      if (tiers[s] === 'hard' && ms > 150) { t1 = process.hrtime.bigint(); C.ai(V, s, 'hard', lcg(3)); ms = Number(process.hrtime.bigint() - t1) / 1e6; if (ms > 150) slow.push(ms.toFixed(0)); }
      if (tiers[s] === 'hard') maxH = Math.max(maxH, ms);
      const res = C.apply(st, s, a); if (!res.ok) { ok(false, `AI 수 거절 ${J(a)} ${res.err}`); break; }
    }
    ok(C.over(st), `판이 끝남 (${map})`); games++; why[st.why] = (why[st.why] || 0) + 1;
    const R = C.ranks(st); ok(R.every((x, s) => x === R[st.mt[s]]) && (st.win < 0 ? R.every(x => x === 0) : R.filter(x => x === 0).length === 2), '순위: 팀원끼리 같음');
  }
  ok(!slow.length, `고급 AI 150ms 넘음: ${slow.join(', ')}`);
  // 결정적: 같은 view · 같은 씨앗 → 같은 수 · recommend = hard(recRnd)
  const st = C.init({ seed: 444 }); let same = 0, tot = 0;
  for (let k = 0; k < 200 && !C.over(st); k++) {
    const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
    const s = nd[0], V = C.view(st, s);
    const a1 = C.ai(V, s, 'hard', lcg(k)), a2 = C.ai(clone(V), s, 'hard', lcg(k)), rc = C.recommend(V, s).a, h = C.ai(V, s, 'hard', C.recRnd(V, s));
    tot++; if (J(a1) === J(a2) && J(rc) === J(h)) same++;
    C.apply(st, s, C.ai(V, s, 'normal', lcg(k + 7)));
  }
  ok(same === tot && tot > 20, `결정적 · 추천 = 고급 AI (${same}/${tot})`);
  console.log(`  AI ${games}판 (끝난 까닭 ${J(why)}) · 고급 AI 가장 오래 ${maxH.toFixed(1)}ms`);
}

// 5) 교환 약속 (신호): 고급 조력자는 가장 높은 카드를 건네고, 고급 주는 3장 중 가장 낮은 카드를 돌려줌
{
  let give = 0, back = 0, n1 = 0, n2 = 0;
  for (let g = 0; g < 30; g++) {
    const st = C.init({ seed: 300 + g }), r = lcg(g);
    while (!C.over(st) && st.round < 3) {
      const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
      const s = nd[0], V = C.view(st, s), a = C.ai(V, s, 'hard', r);
      if (V.phase === 'act' && !V.mn[s]) { n1++; if (a.t === 'swap' && a.c === Math.max(...V.hand)) give++; }
      if (V.phase === 'reply') { n2++; if (a.c === (V.mn[s] ? Math.min(...V.hand) : Math.max(...V.hand))) back++; }
      C.apply(st, s, a);
    }
  }
  ok(give === n1 && back === n2 && n1 > 20, `교환 약속 지킴 (건넴 ${give}/${n1} · 돌려줌 ${back}/${n2})`);
}

console.log(`switchpoker selftest: ${pass} 통과 · ${fail} 실패 (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
process.exit(fail ? 1 : 0);

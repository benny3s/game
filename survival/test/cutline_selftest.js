// 커트라인 규칙 시험 (node survival/test/cutline_selftest.js)
//  · 방송(피의 게임3 11~12일차 1차 게임) 8명 한 판을 그대로 넣어 라운드별 점수 · 누적 · 코인 · 등록 결과가 문서와 같은지
//  · 규칙 카드 A~H · 슬롯 표(인원별) · 잘못된 입력 · 숨은 정보(구경꾼 · 상대) · AI 는 보이는 것만 · 💡 = 고급 AI · 시간
'use strict';
const C = require('../games/cutline/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = x => JSON.stringify(x);
const clone = o => JSON.parse(JSON.stringify(o));
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const T0 = Date.now();

// 1) 시작 상태 · 슬롯 표
{
  const st = C.init({ n: 8, seed: 3 });
  ok(st.n === 8 && st.round === 1 && st.phase === 'bid' && J(C.needs(st)) === J([0, 1, 2, 3, 4, 5, 6, 7]), '8명 · 1라운드 · 모두 입찰');
  ok(st.coins.every(c => c === 20) && st.hand.every(h => J(h) === J([0, 2, 2, 2, 2, 2, 2])), '코인 20 · 1~6 두 벌');
  ok(J(C.slotsFor(8, 1)) === J([{ max: 8, lim: 24 }, { max: 7, lim: 21 }, { max: 6, lim: 18 }, { max: 5, lim: 15 }]), '1R 슬롯 = 방송');
  ok(J(C.slotsFor(8, 2)) === J([{ max: 8, lim: 22 }, { max: 7, lim: 19 }, { max: 5, lim: 14 }, { max: 5, lim: 12 }]), '2R 슬롯 = 방송');
  ok(J(C.slotsFor(8, 3)) === J([{ max: 8, lim: 26 }, { max: 7, lim: 20 }, { max: 6, lim: 12 }, { max: 4, lim: 9 }]), '3R 슬롯 = 방송');
  ok(J(C.slotsFor(4, 1)) === J([{ max: 4, lim: 12 }, { max: 4, lim: 11 }, { max: 3, lim: 9 }, { max: 3, lim: 8 }]), '4명 1R 슬롯 = ×1/2 올림');
  for (let n = 3; n <= 8; n++) for (let r = 1; r <= 3; r++) {
    const d = C.slotsFor(n, r);
    ok(d.reduce((a, x) => a + x.max, 0) >= 3 * n, `${n}명 ${r}R 칸 수가 낼 카드 수(${3 * n}) 이상`);
  }
  ok(C.init({ n: 2, seed: 1 }).n === 3 && C.init({ n: 12, seed: 1 }).n === 8, '3~8명');
}

// 2) 규칙 카드 A~H (슬롯 하나)
{
  const R = (cards, r, def) => C.resolveSlot(cards.map(([p, v]) => ({ p, v })), r, def);
  const regOf = x => x.reg.map(b => (b ? 1 : 0)).join('');
  const base = [[0, 6], [1, 4], [2, 4], [3, 2], [1, 6]];
  const d = { max: 5, lim: 14 };
  // 높은 숫자부터: 6(0) 6(4) = 12 → 4 → 16 ✘, 4 ✘, 2 → 14 ✓
  {
    const x = R(base, null, d);
    ok(x.reg[0] && !x.reg[1] && !x.reg[2] && x.reg[3] && x.reg[4] && x.sum === 14, '높은 숫자부터 · LIMIT 넘으면 버리고 다음 카드 ' + regOf(x));
  }
  { const x = R(base, { p: 9, r: 'A' }, d); ok(x.lim === 11 && regOf(x) === '11000' && x.sum === 10, 'A: LIMIT −3 → 6 · 4 = 10 ' + regOf(x)); }
  { const x = R(base, { p: 9, r: 'B' }, d); ok(x.lim === 17 && x.reg[0] && x.reg[4] && x.reg[1] && !x.reg[2] && !x.reg[3] && x.sum === 16, 'B: LIMIT +3 ' + regOf(x)); }
  { const x = R([[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]], { p: 9, r: 'C' }, d); ok(x.cnt === 4 && !x.reg[4], 'C: 최대 카드 수 −1 (같은 숫자면 늦게 낸 것이 빠짐)'); }
  { const x = R(base, { p: 9, r: 'D' }, d); ok(x.reg[3] && x.reg[1] && x.reg[2] && !x.reg[0] && !x.reg[4] && x.sum === 10, 'D: 낮은 숫자부터 ' + regOf(x)); }
  { const x = R(base, { p: 9, r: 'E' }, d); ok(x.val[0] === 1 && x.val[4] === 6 && regOf(x) === '01101' && x.sum === 14, 'E: 처음 낸 6 → 1 (6 · 4 · 4 = 14, 1 은 넘침) ' + regOf(x)); }
  { const x = R(base, { p: 9, r: 'F' }, d); ok(x.gone[0] && regOf(x) === '01101' && x.sum === 14, 'F: 처음 낸 카드 버림 → 6 · 4 · 4 ' + regOf(x)); }
  { const x = R([[1, 4], [0, 6], [2, 6]], { p: 9, r: 'G' }, d); ok(x.gone[1] && !x.gone[2] && x.reg[2] && x.reg[0], 'G: 처음 낸 6 버림'); }
  { const x = R([[1, 4], [0, 6]], { p: 9, r: 'G' }, { max: 5, lim: 4 }); ok(x.gone[1] && x.reg[0], 'G: 6 이 사라지면 4 가 들어감'); }
  { const x = R([[1, 4], [0, 2], [2, 6], [0, 5]], { p: 0, r: 'H' }, { max: 5, lim: 9 }); ok(x.order[0] === 1 && x.reg[1] && x.reg[2] && !x.reg[3] && !x.reg[0], 'H: 낸 사람의 첫 카드(2)를 먼저 → 2 · 6 = 8 ' + regOf(x)); }
  { const x = R([[1, 4]], { p: 0, r: 'H' }, d); ok(x.reg[0], 'H: 낸 사람 카드가 슬롯에 없으면 효과 없음'); }
  { const x = R([[1, 3], [2, 3]], null, { max: 5, lim: 4 }); ok(x.reg[0] && !x.reg[1], '같은 숫자는 먼저 놓은 카드 먼저'); }
  ok(C.ruleWinner([{ p: 1, c: 3, k: 5 }, { p: 2, c: 7, k: 9 }, { p: 3, c: 7, k: 12 }]).p === 2, '규칙 여럿: 코인 최다 · 같으면 먼저 낸 것');
}

// 3) 방송 한 판 그대로 (나무위키 '피의 게임3/11-12일차' 1차 게임 커트라인 기록)
//    자리: 0 장동민 · 1 홍진호 · 2 김민아 · 3 악어 · 4 서출구 · 5 주언규 · 6 허성범 · 7 스티브예
{
  const NM = ['장동민', '홍진호', '김민아', '악어', '서출구', '주언규', '허성범', '스티브예'], ix = Object.fromEntries(NM.map((x, i) => [x, i]));
  const SI = { A: 0, B: 1, C: 2, D: 3 };
  // 라운드마다: 1차 순서 · 규칙 글자 · 1차 [슬롯 숫자] · 2차 [[슬롯 숫자] ×2] · 규칙 {사람: [슬롯, 코인, '1'|'2' (어느 차례에 냈나)]}
  const ROUNDS = [
    { bids: {}, ord: ['장동민', '홍진호', '김민아', '악어', '서출구', '주언규', '허성범', '스티브예'],
      let: { 장동민: 'H', 홍진호: 'C', 김민아: 'F', 악어: 'A', 서출구: 'E', 주언규: 'G', 허성범: 'B', 스티브예: 'D' },
      p1: { 장동민: 'D4', 홍진호: 'C2', 김민아: 'A5', 악어: 'C3', 서출구: 'D5', 주언규: 'B2', 허성범: 'D4', 스티브예: 'B4' },
      p2: { 스티브예: ['C4', 'C3'], 허성범: ['D2', 'D2'], 주언규: ['C2', 'C3'], 서출구: ['A4', 'A4'], 악어: ['A4', 'A4'], 김민아: ['A2', 'B6'], 홍진호: ['B6', 'B6'], 장동민: ['B1', 'B2'] },
      rule: { 장동민: ['D', 7, 1], 홍진호: ['C', 3, 1], 악어: ['C', 10, 1], 서출구: ['A', 7, 2], 주언규: ['C', 4, 2], 허성범: ['D', 9, 1], 스티브예: ['C', 6, 2] },
      gain: [7, 8, 9, 17, 15, 9, 14, 11], coins: [13, 17, 20, 10, 13, 16, 11, 14],
      reg: { A: '111111', B: '1011110', C: '111101', D: '11111' }, applied: { A: 'E서출구', B: '', C: 'A악어', D: 'B허성범' } },
    { bids: {}, ord: ['주언규', '서출구', '홍진호', '김민아', '장동민', '악어', '스티브예', '허성범'],
      let: { 주언규: 'E', 서출구: 'H', 홍진호: 'D', 김민아: 'G', 장동민: 'C', 악어: 'B', 스티브예: 'F', 허성범: 'A' },
      p1: { 주언규: 'D4', 서출구: 'C3', 홍진호: 'A4', 김민아: 'C4', 장동민: 'A5', 악어: 'D5', 스티브예: 'C3', 허성범: 'C4' },
      p2: { 허성범: ['A3', 'A3'], 스티브예: ['C2', 'B5'], 악어: ['A6', 'B5'], 장동민: ['A4', 'A3'], 김민아: ['B4', 'B3'], 홍진호: ['B4', 'B3'], 서출구: ['A6', 'B5'], 주언규: ['D3', 'D1'] },
      rule: { 주언규: ['D', 8, 2], 서출구: ['C', 8, 1], 홍진호: ['B', 11, 2], 악어: ['A', 10, 2], 스티브예: ['C', 4, 2] },
      gain: [9, 17, 17, 5, 7, 11, 6, 8], coins: [13, 6, 20, 0, 5, 8, 11, 10],
      reg: { A: '11001101', B: '1011110', C: '11110', D: '1110' }, applied: { A: 'B악어', B: 'D홍진호', C: 'H서출구', D: 'E주언규' } },
    { bids: { 장동민: 13, 홍진호: 6, 허성범: 3 }, ord: ['주언규', '서출구', '악어', '홍진호', '김민아', '장동민', '스티브예', '허성범'],
      let: { 주언규: 'C', 서출구: 'G', 악어: 'F', 홍진호: 'D', 김민아: 'E', 장동민: 'B', 스티브예: 'H', 허성범: 'A' },
      p1: { 주언규: 'D4', 서출구: 'A3', 악어: 'B2', 홍진호: 'A3', 김민아: 'A5', 장동민: 'C3', 스티브예: 'A2', 허성범: 'A6' },
      p2: { 허성범: ['B5', 'B6'], 스티브예: ['A6', 'A5'], 장동민: ['B5', 'C2'], 김민아: ['C3', 'C2'], 홍진호: ['C5', 'C5'], 악어: ['D6', 'D3'], 서출구: ['B2', 'B2'], 주언규: ['D5', 'B6'] },
      rule: { 서출구: ['A', 5, 1], 스티브예: ['A', 10, 1] },
      gain: [4, 6, 3, 11, 0, 2, 7, 9], coins: [0, 0, 20, 0, 0, 8, 8, 0],
      reg: { A: '0011111', B: '1110001', C: '010011', D: '0110' }, applied: { A: 'H스티브예', B: '', C: '', D: '' } },
  ];
  const st = C.init({ n: 8, seed: 77 });
  const cum = Array(8).fill(0);
  ROUNDS.forEach((R, ri) => {
    for (let i = 0; i < 8; i++) ok(C.apply(st, i, { t: 'bid', c: R.bids[NM[i]] || 0 }).ok, `${ri + 1}R ${NM[i]} 입찰`);
    if (Object.keys(R.bids).length) {
      ok(st.phase === 'order' && st.win === ix['장동민'], `${ri + 1}R 순서 결정권 = 장동민 (13코인)`);
      ok(C.apply(st, st.win, { t: 'order', ord: R.ord.map(x => ix[x]) }).ok, `${ri + 1}R 장동민이 순서를 정함`);
    } else {
      ok(st.phase === 'place' && st.win === -1, `${ri + 1}R 아무도 입찰 안 함 → 추첨`);
      st.ord = R.ord.map(x => ix[x]);                       // 방송의 추첨 결과로 바꿔 끼움
    }
    for (const nm of NM) st.letters[ix[nm]] = R.let[nm];   // 방송에서 받은 규칙 카드
    const turn = (nm, cardsTxt, sec) => {
      const cards = cardsTxt.map(t => ({ s: SI[t[0]], v: +t[1] }));
      const ru = R.rule[nm] && R.rule[nm][2] === sec ? { s: SI[R.rule[nm][0]], c: R.rule[nm][1] } : null;
      ok(C.needs(st)[0] === ix[nm], `${ri + 1}R ${sec}차 차례 = ${nm} (실제 ${NM[C.needs(st)[0]]})`);
      const res = C.apply(st, ix[nm], { t: 'place', cards, rule: ru });
      ok(res.ok, `${ri + 1}R ${nm} ${sec}차 ${cardsTxt} → ${res.err || ''}`);
    };
    for (const nm of R.ord) turn(nm, [R.p1[nm]], 1);
    for (const nm of R.ord.slice().reverse()) turn(nm, R.p2[nm], 2);
    ok(st.phase === (ri < 2 ? 'show' : 'end'), `${ri + 1}R 끝 → 공개`);
    const res = st.hist[ri];
    ok(J(res.gain) === J(R.gain), `${ri + 1}R 점수 ${J(res.gain)} = 방송 ${J(R.gain)}`);
    R.gain.forEach((g, i) => { cum[i] += g; });
    ok(J(st.score) === J(cum), `${ri + 1}R 누적 ${J(st.score)} = 방송 ${J(cum)}`);
    ok(J(st.coins) === J(R.coins), `${ri + 1}R 뒤 코인 ${J(st.coins)} = 방송 ${J(R.coins)} (주언규 1R 규칙 코인은 문서에 '?' → 4 로 둠)`);
    for (const s of 'ABCD') {
      const x = res.slots[SI[s]];
      ok(x.cards.map(c => (c.reg ? 1 : 0)).join('') === R.reg[s], `${ri + 1}R ${s} 슬롯 등록 ${x.cards.map(c => (c.reg ? 1 : 0)).join('')} = 방송 ${R.reg[s]}`);
      ok((x.rule ? x.rule.r + NM[x.rule.p] : '') === R.applied[s], `${ri + 1}R ${s} 슬롯 적용 규칙 ${x.rule ? x.rule.r + NM[x.rule.p] : '없음'} = 방송 ${R.applied[s] || '없음'}`);
    }
    const Vs = C.view(st, -1);
    ok(Vs.res && Vs.res.slots.every(x => x.cards.every(c => c.v != null)), `${ri + 1}R 공개 단계엔 구경꾼도 숫자를 봄`);
    if (ri < 2) { ok(C.auto(st) > 0, '공개 단계는 자동으로 넘어감'); C.advance(st); ok(st.round === ri + 2 && st.phase === 'bid', '다음 라운드 입찰'); }
  });
  ok(C.over(st), '3라운드 뒤 끝');
  ok(J(st.score) === J([20, 31, 29, 33, 22, 22, 27, 28]), '최종 점수 = 방송 (악어 33 · 홍진호 31 · 김민아 29 · 스티브예 28 · 허성범 27 · 서출구 22 · 주언규 22 · 장동민 20)');
  const rk = C.ranks(st);
  ok(rk[ix['악어']] === 0 && rk[ix['홍진호']] === 1, '1·2위 = 악어 · 홍진호 (파이널 직행)');
  ok(rk[ix['주언규']] === 5 && rk[ix['서출구']] === 6 && rk[ix['장동민']] === 7, '22점 동점은 남은 코인(주언규 8 > 서출구 0)으로 가름');
  const Vend = C.view(st, 0);
  ok(Vend.coins.every(c => c != null) && Vend.ranks.length === 8, '끝나면 코인 공개');
}

// 4) 잘못된 입력 · 슬롯 꽉 참 · 규칙 카드 한 번
{
  const st = C.init({ n: 3, seed: 11 });
  for (const bad of [null, {}, { t: 'bid' }, { t: 'bid', c: -1 }, { t: 'bid', c: 21 }, { t: 'bid', c: 1.5 }, { t: 'place', cards: [] }]) ok(!C.apply(st, 0, bad).ok, '입찰 거부 ' + J(bad));
  ok(C.apply(st, 0, { t: 'bid', c: 2 }).ok && !C.apply(st, 0, { t: 'bid', c: 1 }).ok, '입찰은 한 번');
  ok(C.apply(st, 1, { t: 'bid', c: 2 }).ok && C.apply(st, 2, { t: 'bid', c: 0 }).ok, '입찰');
  ok(st.phase === 'order' && [0, 1].includes(st.win) && st.coins[0] === 18 && st.coins[1] === 18 && st.coins[2] === 20, '동점 최다는 추첨 · 낸 코인은 모두 사라짐');
  const w = st.win;
  ok(!C.apply(st, w, { t: 'order', ord: [0, 0, 1] }).ok && !C.apply(st, w, { t: 'order', ord: [0, 1] }).ok, '순서는 모두 한 번씩');
  ok(!C.apply(st, 3 - w - 2 >= 0 ? 2 : 2, { t: 'order', ord: [0, 1, 2] }).ok, '결정권 없는 사람은 순서 못 정함');
  ok(C.apply(st, w, { t: 'order', ord: [2, 1, 0] }).ok && st.phase === 'place' && C.needs(st)[0] === 2, '정한 순서대로 1차');
  ok(st.letters.every(Boolean) && new Set(st.letters).size === 3, '규칙 카드 서로 다른 글자 한 장씩');
  ok(!C.apply(st, 2, { t: 'place', cards: [{ v: 3, s: 0 }, { v: 4, s: 0 }] }).ok, '1차는 1장');
  ok(!C.apply(st, 2, { t: 'place', cards: [{ v: 7, s: 0 }] }).ok && !C.apply(st, 2, { t: 'place', cards: [{ v: 3, s: 4 }] }).ok, '없는 숫자 · 슬롯');
  ok(!C.apply(st, 2, { t: 'place', cards: [{ v: 3, s: 0 }], rule: { s: 0, c: 0 } }).ok && !C.apply(st, 2, { t: 'place', cards: [{ v: 3, s: 0 }], rule: { s: 0, c: 99 } }).ok, '규칙 카드 코인 1~가진 만큼');
  ok(C.apply(st, 2, { t: 'place', cards: [{ v: 3, s: 3 }], rule: { s: 3, c: 5 } }).ok && st.coins[2] === 15 && st.ruleUsed[2], '규칙 카드 + 코인 5');
  ok(C.apply(st, 1, { t: 'place', cards: [{ v: 6, s: 3 }] }).ok, '1차 2번째');
  ok(st.defs[3].max === 2, '3명 1R D 슬롯 최대 2장');
  ok(!C.apply(st, 0, { t: 'place', cards: [{ v: 1, s: 3 }] }).ok, 'D 슬롯 꽉 참');
  ok(C.apply(st, 0, { t: 'place', cards: [{ v: 1, s: 2 }] }).ok, '다른 슬롯');
  ok(C.needs(st)[0] === 0, '2차는 역순 — 1차 마지막이 바로 2장');
  ok(!C.apply(st, 0, { t: 'place', cards: [{ v: 1, s: 2 }] }).ok, '2차는 2장');
  ok(!C.apply(st, 0, { t: 'place', cards: [{ v: 1, s: 2 }, { v: 1, s: 2 }] }).ok, '같은 숫자 두 장이 없으면 못 냄 (1 은 하나 남음)');
  ok(C.apply(st, 0, { t: 'place', cards: [{ v: 2, s: 2 }, { v: 2, s: 0 }] }).ok, '2차 2장');
  ok(!C.apply(st, 2, { t: 'place', cards: [{ v: 1, s: 0 }, { v: 1, s: 1 }], rule: { s: 0, c: 1 } }).ok, '규칙 카드는 라운드에 한 장');
  const V2 = C.view(st, 1);
  ok(V2.board[3][0].v === null && V2.board[3][1].v === 6 && V2.board[2][0].v === null, '남의 뒷면 카드는 숫자를 못 봄 · 내 카드는 봄');
  ok(V2.coins[2] === null && V2.coins[1] === 18 && V2.letter === st.letters[1] && V2.letters === null && V2.myRule === null, '남의 코인 · 규칙 카드 안 보임');
  const Vs = C.view(st, -1);
  ok(Vs.board.every(b => b.every(c => c.v === null)) && Vs.hand === null && Vs.coins.every(c => c === null) && Vs.letter === null && Vs.rulesAll === null && Vs.bids === null, '구경꾼: 숫자 · 손패 · 코인 · 규칙 카드 · 입찰액을 못 봄');
  ok(J(Vs.placed) === J(V2.placed) && Vs.pub === V2.pub, '구경꾼과 자리의 공개 지문이 같음');
  const Va = C.view(st, 'all');
  ok(Va.board[3][0].v === 3 && Va.letters.length === 3 && Va.rulesAll[3].length === 1, "'all' 은 다 봄");
}

// 5) 동시 입찰은 모두 낼 때까지 숨김 · 순서 결정권은 코인 액수를 밝히지 않음
{
  const st = C.init({ n: 4, seed: 5 });
  C.apply(st, 0, { t: 'bid', c: 7 });
  const V1 = C.view(st, 1), Vs = C.view(st, -1);
  ok(V1.myBid === null && V1.bids === null && V1.bidDone[0] && !J(V1.log).includes('"c":7') && V1.coins[0] === null, '입찰액은 남에게 안 보임');
  ok(Vs.bids === null && !J(Vs).includes('"c":7'), '구경꾼도 입찰액 못 봄');
  ['1', '2', '3'].forEach(s => C.apply(st, +s, { t: 'bid', c: 1 }));
  ok(st.win === 0 && !J(C.view(st, 2).log).includes('"c":7'), '결정권만 공개');
}

// 6) AI 는 보이는 것만: 남의 숨은 것(손패 · 뒷면 숫자 · 규칙 카드 · 코인 · 입찰액)만 바꾼 판에서 view 가 같고 → AI 수도 같음
{
  let same = 0, tot = 0, recN = 0;
  for (let k = 0; k < 10; k++) {
    const n = 3 + (k % 6), st = C.init({ n, seed: 300 + k }), r = lcg(k + 5);
    for (let steps = 0; steps < 400 && !C.over(st); steps++) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const s = need[0];
      if (st.phase === 'place' && steps % 3 === 0) {
        const st2 = clone(st), rr = lcg(steps + 1);
        for (let j = 0; j < n; j++) if (j !== s) {
          // 남의 이번 라운드 뒷면 카드 숫자와 손패를 맞바꿈 (공개 숫자 합계 · 장수는 그대로)
          for (const b of st2.board) for (const c of b) if (c.p === j) { const alt = [1, 2, 3, 4, 5, 6].filter(v => st2.hand[j][v] > 0 && v !== c.v); if (alt.length) { const v = alt[Math.floor(rr() * alt.length)]; st2.hand[j][v]--; st2.hand[j][c.v]++; c.v = v; } }
          st2.coins[j] = Math.floor(rr() * 20); st2.letters[j] = 'ABCDEFGH'[Math.floor(rr() * 8)];
        }
        for (const rs of st2.rules) for (const x of rs) if (x.p !== s) x.c = 1 + Math.floor(rr() * 9);
        st2.rs = (st.rs ^ 0x5bd1e995) >>> 0;
        const v1 = C.view(st, s), v2 = C.view(st2, s);
        ok(J(v1) === J(v2), `숨은 것만 바꾼 판에서 view 가 달라짐 (자리 ${s}, ${st.round}R)`);
        const a1 = C.ai(v1, s, 'hard', lcg(9)), a2 = C.ai(v2, s, 'hard', lcg(9));
        tot++; if (J(a1) === J(a2)) same++;
        // 💡 추천 = 고급 AI (같은 고정 난수)
        const rec = C.recommend(v1, s), ha = C.ai(v1, s, 'hard', C.recRnd(v1, s)); recN++;
        ok(J(rec.a) === J(ha), `추천 ≠ 고급 AI ${J(rec.a)} vs ${J(ha)}`);
        const vv = clone(v1); C.ai(vv, s, 'hard', lcg(3)); ok(J(vv) === J(v1), 'ai 가 view 를 바꿈');
      }
      const a = C.ai(C.view(st, s), s, ['easy', 'normal', 'hard'][s % 3], r);
      const res = C.apply(st, s, a);
      ok(res.ok, `AI 수가 규칙에 맞음 ${J(a)} ${res.err || ''}`);
    }
    ok(C.over(st), `${n}명 AI 판이 끝남`);
  }
  ok(tot > 20 && same === tot, `AI 수가 숨은 정보로 바뀌지 않음 ${same}/${tot}`);
  ok(recN > 20, '추천 시험 횟수 ' + recN);
}

// 7) 시간: 고급 AI 한 번 150 ms 안 · 추천(선생님) 200 ms 안 (8명 · 2차 첫 차례가 가장 무거움)
{
  let worst = 0, worstRec = 0;
  for (let k = 0; k < 6; k++) {
    const st = C.init({ n: 8, seed: 900 + k }), r = lcg(k);
    while (!C.over(st)) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      for (const s of need) {
        const V = C.view(st, s);
        const t0 = Date.now(); const a = C.ai(V, s, 'hard', r); worst = Math.max(worst, Date.now() - t0);
        if (st.phase === 'place' && k < 2) { const t1 = Date.now(); C.recommend(V, s); worstRec = Math.max(worstRec, Date.now() - t1); }
        C.apply(st, s, a);
      }
    }
  }
  ok(worst <= 150, `고급 AI 최대 ${worst}ms ≤ 150`);
  ok(worstRec <= 200, `추천 최대 ${worstRec}ms ≤ 200`);
  console.log(`  고급 AI 최대 ${worst}ms · 추천 최대 ${worstRec}ms`);
}

// 8) 결정적 (같은 씨앗 · 같은 수 = 같은 판)
{
  const play = seed => { const st = C.init({ n: 5, seed }), r = lcg(seed); while (!C.over(st)) { const need = C.needs(st); if (!need.length) { C.advance(st); continue; } for (const s of need) C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r)); } return J(st); };
  ok(play(42) === play(42), '같은 씨앗 = 같은 판');
  ok(play(42) !== play(43), '다른 씨앗 = 다른 판');
}

// 9) 슬롯 표 공개 시점: 입찰 · 순서 정하기 동안은 그 라운드 표를 모름 (방송: 1차 숫자 카드 제출 때 확인) — 'all' 만 봄
{
  const st = C.init({ n: 5, seed: 61 });
  ok(st.phase === 'bid' && C.view(st, 0).defs === null && C.view(st, -1).defs === null && C.view(st, 'all').defs.length === 4, '입찰 때 슬롯 표 비공개');
  for (let s = 0; s < 5; s++) C.apply(st, s, { t: 'bid', c: s === 2 ? 3 : 0 });
  ok(st.phase === 'order' && C.view(st, 2).defs === null, '순서 정하기 때도 비공개');
  C.apply(st, 2, { t: 'order', ord: [0, 1, 2, 3, 4] });
  const V = C.view(st, 4); ok(st.phase === 'place' && V.defs && V.defs.length === 4 && V.defs[0].max === st.defs[0].max, '1차 제출이 시작되면 모두 봄');
  ok(st.coins[2] === 17 && st.coins[0] === 20, '입찰 코인: 낸 만큼 빠짐');
}
// 10) view 는 판 상태와 객체를 나눠 쓰지 않음: V 를 깊이 다 바꿔도 판(st)은 그대로
{
  const scramble = o => { if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (o[i] && typeof o[i] === 'object') scramble(o[i]); else o[i] = 99; } o.push(99); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object') scramble(o[k]); else o[k] = 99; } };
  const st = C.init({ n: 4, seed: 71 }), r = lcg(4); let checks = 0, bad = 0;
  for (let g = 0; g < 400 && !C.over(st); g++) {
    const need = C.needs(st);
    if (!need.length) { C.advance(st); continue; }
    const s = need[0], snap = J(st);
    for (const who of [s, -1, 'all']) { scramble(C.view(st, who)); checks++; if (J(st) !== snap) bad++; }
    C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r));
  }
  ok(checks > 50 && bad === 0, `view 를 바꿔도 판 상태 그대로 (${checks - bad}/${checks})`);
}
console.log(`cutline selftest: 통과 ${pass} · 실패 ${fail} (${((Date.now() - T0) / 1000).toFixed(1)}초)`);
process.exit(fail ? 1 : 0);

'use strict';
// 오픈, 패스 selftest — 수식 계산 · 구입 · 제출 · 오픈 / 패스 · 숨은 정보 · AI
const G = require('../games/gn-openpass/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const ap = (st, s, a) => G.apply(st, s, a);
const E = b => G.showVal(G.evalBoard(b));
const V0 = b => G.num(G.evalBoard(b));
const clone = o => JSON.parse(JSON.stringify(o));

// 1) 수식 계산 — 방송 기록
{
  ok(E([10, '*', 8, '*', 8, '*', 8, '*', 7]) === '35,840', '홍진호 10×8×8×8×7 = 35,840');
  ok(E([9, '+', 7, '*', 8, '+', 9, '*', 7]) === '128', '성규 9+7×8+9×7 = 128 (곱셈 먼저)');
  ok(E([9, '*', 6, '*', 9, '+', 7]) === '493', '차유람 9×6×9+7 = 493');
  ok(E([8, '*', 8, '+', 8, '*', 8]) === '128', '김풍 8×8+8×8 = 128');
  ok(E([7, '*', 8, '*', 9, '*', 8]) === '4,032', '박은지 7×8×9×8 = 4,032');
  ok(E([6, '*', 9, '*', 6, '*', 8, '*', 6]) === '15,552', '김경란 6×9×6×8×6 = 15,552');
  ok(E([6, '*', 6, '*', 9, '*', 5, '*', 6]) === '9,720', '이상민 6×6×9×5×6 = 9,720');
}
// 2) 수식 규칙 — 겹친 카드 · 끝 기호 · 앞 기호 · 0 · 나눗셈
{
  ok(E([3, 4, '+', 5]) === '8', '숫자가 연달아 있으면 맨 왼쪽 숫자만 (3 4 + 5 → 3+5)');
  ok(E([3, '+', '*', 5]) === '8', '기호가 연달아 있으면 맨 왼쪽 기호만 (3 + × 5 → 3+5)');
  ok(E([3, '*', '+', 5]) === '15', '(3 × + 5 → 3×5)');
  ok(E([3, '+']) === '3' && E([3, '+', '*']) === '3', '맨 끝 기호는 무효');
  ok(E(['+', 3]) === '3' && E(['-', 3]) === '-3' && E(['*', 3]) === '0', '맨 왼쪽 카드가 기호면 그 앞에 0');
  ok(E([6, '/', 0, '+', 5]) === '5' && E([6, '/', 0]) === '0', '0 으로 나누면 그 항은 0');
  ok(E([7, '/', 2]) === '3.5' && E([7, '/', 2, '*', 2]) === '7', '소수 · 분수는 그대로 (7÷2×2 = 7)');
  ok(E([]) === '0' && E([5]) === '5', '비었으면 0 · 숫자 하나는 그대로');
  ok(E([10, '-', 3, '-', 2]) === '5' && E([10, '-', 3, '+', 2]) === '9', '왼쪽부터 빼기');
  ok(E([2, '+', 3, '*', 4, '-', 6, '/', 3]) === '12', '2+3×4−6÷3 = 12');
  ok(G.exprText([3, 4, '+', '*', 5, '-']) === '3 + 5', '화면용 식은 유효한 카드만');
}
// 3) 카드 풀 · 팩
{
  const base = G.poolOf([0, 0, 0]);
  ok(G.poolSize(base) === 20 && base.b0 === 1 && base.b9 === 1 && base['b-'] === 3 && base['b/'] === 3 && base['b*'] === 2 && base['b+'] === 2, '기본 카드 20장: 0~9 각 1 · − 3 · ÷ 3 · × 2 · + 2');
  G.PACKS.forEach((p, i) => { const b = [0, 0, 0]; b[i] = 1; const pool = G.poolOf(b); ok(G.poolSize(pool) === 40, `${p.price}가넷 팩은 20장`); });
  const blue = G.poolOf([0, 0, 1]);
  ok(blue.u7 === 3 && blue.u8 === 3 && blue.u9 === 3 && blue.u10 === 1 && blue['u*'] === 3 && blue['u+'] === 3 && blue['u-'] === 2 && blue['u/'] === 2, '파랑 팩: 7·8·9 세 장씩 · 10 한 장 · × 3 · + 3 · − 2 · ÷ 2');
  const red = G.poolOf([0, 1, 0]);
  ok(red.r4 === 3 && red.r5 === 3 && red.r6 === 3 && red.r9 === 1 && red['r*'] === 3 && red['r/'] === 3 && red['r+'] === 2 && red['r-'] === 2, '빨강 팩: 4·5·6 세 장씩 · 9 한 장 · × 3 · ÷ 3 · + 2 · − 2');
  const blk = G.poolOf([1, 0, 0]);
  ok(blk.b0 === 3 && blk.b7 === 2 && blk.b8 === 2 && blk.b9 === 1 && blk['b-'] === 6 && blk['b*'] === 4, '검정 팩은 기본 카드와 같은 검정 뒷면 (0 · 1 · 2 · 3 두 장씩, 7 · 8, − ÷ 3, × + 2)');
  ok(G.buyCost([1, 1, 1]) === 6 && G.buyCost([2, 0, 1]) === 5, '가격 1 · 2 · 3 가넷');
  ok(G.allBuys(4).every(p => G.buyCost(p) <= 4) && G.allBuys(4).some(p => p.join() === '1,0,1'), '가넷 4개로 살 수 있는 조합');
}
// 4) 구입 → 제출 → 플레이 흐름
{
  const st = G.init({ n: 3, seed: 11, cfg: { gar: 4, order: [2, 0, 1] } });
  ok(st.phase === 'buy' && G.needs(st).join() === '0,1,2' && st.order.join() === '2,0,1', '처음엔 모두가 동시에 구입을 정해요');
  ok(!ap(st, 0, { t: 'buy', p: [0, 0, 2] }).ok, '가넷 4개 넘게는 못 사요 (파랑 2팩 = 6)');
  ok(!ap(st, 0, { t: 'buy', p: [-1, 0, 0] }).ok && !ap(st, 0, { t: 'buy', p: [1, 1] }).ok && !ap(st, 0, { t: 'buy' }).ok, '잘못된 팩 수는 거절');
  ok(ap(st, 0, { t: 'buy', p: [1, 0, 1] }).ok && !ap(st, 0, { t: 'buy', p: [0, 0, 0] }).ok, '한 번만 정해요');
  ok(G.view(st, 1).buys.every(b => b === null) && G.view(st, 0).mineBuy.join() === '1,0,1', '다른 사람이 산 팩은 아직 몰라요 (내 것만 보여요)');
  ap(st, 1, { t: 'buy', p: [0, 0, 0] }); ap(st, 2, { t: 'buy', p: [0, 2, 0] });
  ok(st.phase === 'submit' && G.needs(st).join() === '0,2' && !!st.subs[1], '안 산 사람(1번)은 기본 20장이 자동으로 제출돼요');
  ok(G.view(st, 1).buys[0].join() === '1,0,1' && G.view(st, 1).buys[2].join() === '0,2,0', '구입이 끝나면 모두의 구입이 공개');
  const pool0 = G.poolOf([1, 0, 1]);
  ok(!ap(st, 0, { t: 'submit', sel: G.pickDeck(pool0, 10), }).ok === false, '20장을 골라 제출');   // 첫 제출 성공
  const st2 = G.init({ n: 3, seed: 11, cfg: { gar: 4, order: [2, 0, 1] } });
  for (let s = 0; s < 3; s++) ap(st2, s, { t: 'buy', p: [1, 0, 1] });
  const bad = (sel, m) => ok(!ap(st2, 0, { t: 'submit', sel }).ok, m);
  bad({ b0: 1 }, '20장이 아니면 거절');
  bad(Object.assign({}, G.pickDeck(pool0, 10), { b0: 99 }), '가진 것보다 많이 내면 거절');
  bad({ x1: 20 }, '없는 카드는 거절');
  bad(null, '선택이 없으면 거절');
  const goodSel = G.pickDeck(pool0, 10); let tot = 0; for (const k of Object.keys(goodSel)) tot += goodSel[k];
  ok(tot === 20, 'pickDeck 은 정확히 20장');
  for (let s = 0; s < 3; s++) ap(st2, s, { t: 'submit', sel: goodSel });
  ok(st2.phase === 'play' && G.needs(st2).join() === '2', '모두 내면 플레이 — 순서 첫 사람(2번)부터');
  ok(st2.decks.every(d => d.length === 20), '섞인 덱 20장');
  const all = {}; st2.decks[1].forEach(c => { const k = G.gkey(c.b, c.f); all[k] = (all[k] || 0) + 1; });
  ok(JSON.stringify(Object.keys(all).sort()) === JSON.stringify(Object.keys(goodSel).sort()) && Object.keys(all).every(k => all[k] === goodSel[k]), '섞어도 낸 카드 그대로');
}
// 4b) 이상한 제출 키 (프로토타입 키 · 상속 키) 는 거절
{
  const st = G.init({ n: 2, seed: 17, cfg: { gar: 4, order: [0, 1] } });
  for (let s = 0; s < 2; s++) ap(st, s, { t: 'buy', p: [1, 0, 1] });
  for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf']) {
    const sel = JSON.parse(`{"${k}":20}`);
    ok(!ap(st, 0, { t: 'submit', sel }).ok, `${k} 키로는 못 내요`);
  }
  ok(!st.subs[0], '거절된 제출은 상태를 안 바꿔요');
  ok(!ap(st, 0, { t: 'submit', sel: { b0: 1.5, b1: 18.5 } }).ok && !ap(st, 0, { t: 'submit', sel: { b0: -1, b1: 21 } }).ok, '소수 · 음수 개수는 거절');
}
// 5) 플레이: 오픈 / 패스 · 최대 10 패스 · 10칸 · 순서 · 결과
{
  const st = G.init({ n: 3, seed: 3, cfg: { gar: 0, order: [1, 2, 0] } });
  ok(st.phase === 'play' && G.needs(st).join() === '1', '가넷 0 이면 구입 · 제출 없이 기본 카드로 바로 시작');
  ok(!ap(st, 0, { t: 'open' }).ok && !ap(st, 1, { t: 'wat' }).ok, '내 차례가 아니거나 모르는 행동은 거절');
  const d = st.decks[1]; const f0 = d[0].f;
  ap(st, 1, { t: 'open' });
  ok(st.boards[1].join() === String(f0) && st.pos[1] === 1, '오픈하면 수식판 다음 칸에 들어가요');
  ap(st, 1, { t: 'pass' });
  ok(st.passes[1] === 1 && st.boards[1].length === 1 && st.pos[1] === 2, '패스는 수식판에 안 들어가요');
  ok(G.view(st, 0).boards[1].length === 1 && !G.view(st, 0).log.some(e => e.k === 'pass' && e.f !== undefined), '패스한 카드 앞면은 아무도 몰라요');
  // 패스를 10번 다 쓰면 나머지는 자동으로 열려요
  let g = 0; while (st.passes[1] < 10 && !st.vf[1] && g++ < 40) ap(st, 1, { t: 'pass' });
  ok(st.vf[1] !== null, '패스 10장을 다 쓰면 남은 카드가 자동으로 열려서 끝나요');
  ok(st.passes[1] === 10 && st.boards[1].length <= 10 && st.pos[1] <= 20, '패스는 10장까지');
  ok(G.needs(st).join() === '2', '다음 순서(2번)로 넘어가요');
  // 10칸이 차면 끝 (남은 카드는 안 씀)
  const s2 = G.init({ n: 2, seed: 4, cfg: { gar: 0, order: [0, 1] } });
  for (let i = 0; i < 10; i++) ap(s2, 0, { t: 'open' });
  ok(s2.vf[0] !== null && s2.boards[0].length === 10 && s2.pos[0] === 10, '10칸이 차면 끝 — 남은 카드는 안 써요');
  ok(!ap(s2, 0, { t: 'open' }).ok, '끝난 사람은 더 못 해요');
  // 마지막 사람까지 끝나면 순위
  for (let i = 0; i < 10; i++) ap(s2, 1, { t: 'open' });
  ok(G.over(s2) && s2.ranks && s2.ranks.length === 2, '모두 끝나면 판 끝');
  const hi = s2.vf.findIndex(f => G.cmpF(f, s2.vf[1 - s2.vf.indexOf(f)]) >= 0);
  ok(s2.ranks[0] === (G.cmpF(s2.vf[0], s2.vf[1]) >= 0 ? 0 : 1) && s2.ranks[1] === (G.cmpF(s2.vf[1], s2.vf[0]) >= 0 ? 0 : 1), '값이 큰 사람이 1등 (같으면 같은 등수)');
  ok(Array.isArray(G.view(s2, 0).decks) && G.view(s2, 0).decks[1].length === 20, '끝나면 모든 덱이 공개');
}
// 5b) 놓는 방향 (방송 영상): 연 카드는 등호 옆 오른쪽 끝(1번 칸)부터 왼쪽으로 — boards = 화면에 보이는 왼쪽 → 오른쪽 순서
{
  // 연 순서대로 faces 를 주고 전부 오픈 (패스 없이). 남는 카드는 아무 숫자 → 반환 = 그 사람의 판 상태
  const play = faces => {
    const st = G.init({ n: 2, seed: 9, cfg: { gar: 0, order: [0, 1] } });
    st.decks[0] = Array.from({ length: 20 }, (_, i) => ({ f: i < faces.length ? faces[i] : 1, b: 'b' }));
    for (let i = 0; i < faces.length; i++) ap(st, 0, { t: 'open' });
    return st;
  };
  const a = play([2, 3, 4]);
  ok(a.boards[0].join() === '4,3,2', '첫 카드(2)가 맨 오른쪽 (등호 옆) · 나중에 연 카드가 왼쪽: 4 3 2');
  ok(G.view(a, 0).boards[0].join() === '4,3,2' && G.view(a, 1).boards[0].join() === '4,3,2', 'view 의 판도 화면 순서');
  const lg = a.log.filter(e => e.k === 'open');
  ok(lg.map(e => e.f).join() === '2,3,4' && lg.map(e => e.slot).join() === '1,2,3', '로그는 연 순서 · slot = 놓인 칸 번호 (등호 옆이 1번)');
  ok(a.tr[0].join('') === 'ooo' && a.okeys[0].length === 3, '연 기록(tr)은 연 순서');
  // 숫자가 겹치면 맨 왼쪽(나중에 연) 카드만 남아요
  ok(E(play([5, 7]).boards[0]) === '7' && E(play([7, 5]).boards[0]) === '5', '숫자가 겹치면 나중에 연 카드가 남아요 (5 다음 7 → 7)');
  ok(E(play([4, '*', 9, 7]).boards[0]) === '28', '4 × 9 7 → 열린 순서 4 · × · 9 · 7 = 화면 7 9 × 4 → 7 × 4 = 28 (9 는 7 에 덮여요)');
  // 기호가 겹치면 맨 왼쪽(나중에 연) 기호만
  ok(E(play([4, '+', '*', 5]).boards[0]) === '20', '기호가 겹치면 나중에 연 기호만: 4 · + · × · 5 → 화면 5 × + 4 → 5 × 4 = 20');
  ok(E(play([4, '*', '+', 5]).boards[0]) === '9', '4 · × · + · 5 → 화면 5 + × 4 → 5 + 4 = 9');
  // 첫 번째로 연 카드가 기호면 등호와 겹쳐 끝 기호로 무효
  ok(E(play(['*', 6]).boards[0]) === '6' && E(play(['-', 6, '*', 9]).boards[0]) === '54', '첫 카드가 기호면 끝 기호라 무효 (− 열고 6 · × · 9 → 9 × 6 = 54)');
  ok(G.exprText(play(['*', 6]).boards[0]) === '6', '화면 식에서도 끝 기호는 빠져요');
  // 열 번째(마지막) 카드가 기호면 맨 왼쪽 기호 — 앞에 0
  const tail = last => play([2, '*', 3, '*', 4, '*', 5, '*', 6, last]);
  ok(tail('+').boards[0].join() === '+,6,*,5,*,4,*,3,*,2' && G.num(tail('+').vf[0]) === 720, '열 번째가 + 면 0 + 6×5×4×3×2 = 720');
  ok(G.num(tail('*').vf[0]) === 0 && G.num(tail('-').vf[0]) === -720, '열 번째가 × 면 0 × … = 0 · − 면 0 − 720 = −720');
  ok(tail(7).boards[0].join() === '7,6,*,5,*,4,*,3,*,2' && G.num(tail(7).vf[0]) === 7 * 5 * 4 * 3 * 2, '열 번째가 숫자 7 이면 6 을 덮어써서 7×5×4×3×2 = 840');
  // 방송 기록 판 재현 — 박은지 7×8×9×8 = 4,032 (등호 옆에 처음 연 숫자 셋은 8 과 겹쳐 버려지고 맨 왼쪽 8 만 남아요)
  const park = play([2, 5, 4, 8, '*', 9, '*', 8, '*', 7]);
  ok(park.boards[0].join() === '7,*,8,*,9,*,8,4,5,2' && G.showVal(park.vf[0]) === '4,032' && park.over === false && park.vf[1] === null, '방송 판: 박은지 7 × 8 × 9 × 8 (+ 등호 옆 버려진 숫자 셋) = 4,032');
  ok(G.exprText(park.boards[0]) === '7 × 8 × 9 × 8', '화면 식 7 × 8 × 9 × 8');
  // 홍진호 10×8×8×8×7 = 35,840 (등호 옆에 처음 + 를 열어 끝 기호로 무효)
  ok(G.showVal(play(['+', 7, '*', 8, '*', 8, '*', 8, '*', 10]).vf[0]) === '35,840', '방송 판: 홍진호 10 × 8 × 8 × 8 × 7 = 35,840 (첫 + 는 끝 기호)');
  // AI 기본 규칙도 새 방향 기준 (맨 왼쪽 카드 = 가장 나중에 연 카드 왼쪽에 놓여요)
  const C = (passesLeft, slotsLeft) => ({ passesLeft, cardsLeft: 12, slotsLeft });
  ok(G.want([], 9, G.TH.hard, C(8, 10)) && !G.want([], '*', G.TH.hard, C(8, 10)), '첫 카드(맨 오른쪽)는 큰 숫자만 · 기호는 끝 기호라 낭비');
  ok(G.want([7], '*', G.TH.hard, C(8, 9)) && !G.want([7], '*', G.TH.hard, C(8, 1)), '숫자 왼쪽엔 ×  — 왼쪽에 숫자가 올 칸이 남았을 때만');
  ok(G.want(['*', 7], 9, G.TH.hard, C(8, 8)) && !G.want(['*', 7], '+', G.TH.hard, C(8, 8)) && !G.want([7], 3, G.TH.hard, C(8, 8)), '× 왼쪽엔 숫자 · 기호 왼쪽에 기호 · 숫자 왼쪽에 숫자는 패스');
  ok(G.want([5, '*', 7], 8, G.TH.hard, C(8, 1)) && !G.want([5, '*', 7], 3, G.TH.hard, C(8, 1)), '마지막 칸: 맨 왼쪽 숫자보다 큰 숫자로만 갈아 끼워요 (작은 숫자는 덮어써 해로워요)');
}
// 6) 순위 · 동점 · 대체 입력
{
  const st = G.init({ n: 3, seed: 5, cfg: { gar: 0, order: [0, 1, 2] } });
  st.vf = [{ p: 128, q: 1 }, { p: 128, q: 1 }, { p: 5, q: 1 }]; st.cur = 3;
  st.ranks = st.vf.map(a => st.vf.filter(b => G.cmpF(b, a) > 0).length);
  ok(st.ranks.join() === '0,0,2', '같은 값은 같은 등수 (128 · 128 · 5 → 0,0,2)');
  const s2 = G.init({ n: 2, seed: 6, cfg: { gar: 4 } });
  ok(G.legal(s2, 0)[0].t === 'buy', '대체 입력 (구입)');
  ap(s2, 0, { t: 'buy', p: [1, 0, 1] }); ap(s2, 1, { t: 'buy', p: [1, 0, 1] });
  ok(G.legal(s2, 0)[0].t === 'submit' && ap(s2, 0, G.legal(s2, 0)[0]).ok, '대체 입력 (제출)');
}
// 7) 숨은 정보: 남의 덱 · 안 연 카드 · 패스한 카드 앞면은 view / pub / AI / 선생님에 안 새요
{
  const mk = () => {
    const st = G.init({ n: 3, seed: 21, cfg: { gar: 4, order: [0, 1, 2] } });
    for (let s = 0; s < 3; s++) ap(st, s, { t: 'buy', p: [1, 0, 1] });
    for (let s = 0; s < 3; s++) ap(st, s, { t: 'submit', sel: G.pickDeck(G.poolOf([1, 0, 1]), 10 + s) });
    return st;
  };
  const st = mk();
  ap(st, 0, { t: 'open' }); ap(st, 0, { t: 'pass' });
  // (a) 남의 안 연 카드 바꾸기 → 내 view · pub 그대로
  const alt = clone(st);
  for (let i = 5; i < 20; i++) alt.decks[1][i] = { f: i % 2 ? 0 : 10, b: alt.decks[1][i].b };
  alt.subs[1] = { b0: 20 };
  for (const seat of [0, 1, 2, -1]) {
    const a = G.view(st, seat), b = G.view(alt, seat);
    if (seat !== 1) ok(a.pub === b.pub && JSON.stringify(a.log) === JSON.stringify(b.log), `${seat}번 보기: 남의 안 연 카드를 바꿔도 같아요`);
  }
  // (b) 같은 뒷면 색의 안 연 카드 두 장의 앞면을 맞바꿔도, 내 AI · 선생님 · pub 이 같아요 (패스한 카드 포함)
  const alt2 = clone(st), dk = alt2.decks[0];
  let a1 = -1, a2 = -1;
  for (let i = 2; i < 20 && a2 < 0; i++) for (let j = i + 1; j < 20; j++) if (dk[i].b === dk[j].b && dk[i].f !== dk[j].f) { a1 = i; a2 = j; break; }
  ok(a2 > 0, '같은 색 · 다른 앞면 두 장을 찾음');
  const t = dk[a1].f; dk[a1].f = dk[a2].f; dk[a2].f = t;
  const p0 = dk[1]; dk[1] = Object.assign({}, p0);   // 패스한 카드(1번 칸)도 바꿔요
  const u0 = alt2.decks[0].findIndex((c, i) => i > 1 && c.b === p0.b && c.f !== p0.f);
  if (u0 > 0) { const q = dk[1].f; dk[1].f = dk[u0].f; dk[u0].f = q; }
  const va = G.view(st, 0), vb = G.view(alt2, 0);
  ok(va.pub === vb.pub && JSON.stringify(va.unk) === JSON.stringify(vb.unk), '안 연 카드(패스한 카드 포함) 앞면을 맞바꿔도 내가 아는 것은 같아요');
  for (const tier of ['easy', 'normal', 'hard']) {
    const ra = G.ai(va, 0, tier, G.sampler(9)), rb = G.ai(vb, 0, tier, G.sampler(9));
    ok(JSON.stringify(ra) === JSON.stringify(rb), `${tier} AI 는 안 열어 본 앞면에 영향받지 않아요`);
  }
  ok(JSON.stringify(G.coach(va, 0, 0, null)) === JSON.stringify(G.coach(vb, 0, 0, null)), '선생님도 안 열어 본 앞면에 영향받지 않아요');
  { // 선생님 숫자는 사람이 읽을 수 있는 크기여야 해요 (자릿수 평균이 아니라 값)
    const c = G.coach(G.view(mk(), 0), 0, 0, null);
    const m = /오픈 (?:약 )?([\d,]+) · 패스 (?:약 )?([\d,]+)/.exec(c.why);
    ok(!m || +m[1].replace(/,/g, '') >= 1, '선생님 설명에 값이 나와요');
    ok(c.rec === '오픈' || c.rec === '패스', '선생님 추천은 오픈 또는 패스');
  }
  // (c) 내가 모르는 카드 = 낸 20장 − 오픈한 카드 (패스한 카드는 그대로 모르는 쪽)
  const sumUnk = Object.values(va.unk).reduce((s, x) => s + x, 0);
  ok(sumUnk === 19 && va.backs[0].length === 20 && va.backs[1].length === 20, '모르는 카드 19장 (20장 − 오픈 1장) · 뒷면 색은 모두 보여요');
  ok(G.view(st, 1).unk && G.view(st, -1).unk === null && G.view(st, 1).decks === null && G.view(st, 0).decks === null, '자리가 있는 사람은 판이 끝나기 전에 남의 덱을 못 봐요');
  ok(G.view(st, -1).decks === null && G.view(st, 'all').decks && G.view(st, 'all').decks[1].length === 20 && G.view(st, 'all').pub === G.view(st, 0).pub && G.view(st, -1).pub === G.view(st, 0).pub, 'AI 구경(all)은 덱까지 보이고 온라인 구경꾼(-1)은 못 봐요 · 공개 지문은 같아요');
  ok(G.view(st, 2).unk && Object.keys(G.view(st, 2).unk).length > 0 && G.view(st, 2).mineSub !== null, '내 제출 카드는 나만 알아요');
}
// 8) AI: 구입 · 제출 · 플레이 모두 규칙 안, 끝까지, 어려운 AI 가 쉬운 AI 보다 못하지 않아요
{
  const lgm = { easy: 0, normal: 0, hard: 0 }, cnt = { easy: 0, normal: 0, hard: 0 }, rk = { easy: 0, normal: 0, hard: 0 };
  for (const [N, gar] of [[2, 4], [3, 4], [4, 4], [5, 8], [7, 4], [4, 0]]) {
    for (let g = 0; g < (N === 4 && gar === 4 ? 70 : 12); g++) {
      const st = G.init({ n: N, seed: 800 + g * 13 + N, cfg: { gar } }), T = [...Array(N).keys()].map(i => ['hard', 'easy', 'normal'][(i + g) % 3]);
      const rr = G.sampler(g * 5 + N);
      let guard = 0;
      while (!G.over(st) && guard++ < 400) {
        const s = G.needs(st)[0], V = G.view(st, s), a = G.ai(V, s, T[s], rr), r = ap(st, s, a);
        if (!r.ok) { ok(false, `AI 거절 ${N}명 ${g}판 ${JSON.stringify(a)} ${r.err}`); ap(st, s, G.legal(st, s)[0]); }
      }
      ok(G.over(st) && st.vf.every(Boolean), `${N}명 ${g}판 끝남`);
      ok(st.decks.every(d => d.length === 20) && st.boards.every(b => b.length <= 10) && st.passes.every(p => p <= 10), '덱 20 · 칸 ≤ 10 · 패스 ≤ 10');
      if (N === 4 && gar === 4) for (let i = 0; i < N; i++) { cnt[T[i]]++; lgm[T[i]] += Math.log10(Math.max(1, G.num(st.vf[i]))); rk[T[i]] += st.ranks[i]; }
    }
  }
  const lg = t => lgm[t] / cnt[t];
  console.log(`  4명 · 가넷 4: 평균 자릿수 hard ${lg('hard').toFixed(2)} · normal ${lg('normal').toFixed(2)} · easy ${lg('easy').toFixed(2)} / 평균 순위 hard ${(rk.hard / cnt.hard).toFixed(2)} · normal ${(rk.normal / cnt.normal).toFixed(2)} · easy ${(rk.easy / cnt.easy).toFixed(2)}`);
  ok(lg('normal') > lg('easy') + 0.15, '보통 AI 가 쉬운 AI 보다 값이 커요');
  ok(lg('hard') > lg('easy') + 0.15 && lg('hard') >= lg('normal') - 0.2, '어려운 AI 도 쉬운 AI 보다 커요');
  ok(rk.hard / cnt.hard < rk.easy / cnt.easy && rk.normal / cnt.normal < rk.easy / cnt.easy, '쉬운 AI 의 평균 순위가 가장 나빠요');
}

// 💡 추천 = 고급 AI 의 수: 구입 · 20장 고르기 · 오픈/패스 전부, 어떤 난수를 줘도 같은 수 (판 전체를 돌며 비교)
{
  let tot = 0, same = 0, rndSame = 0;
  for (let g = 0; g < 6; g++) {
    const N = 2 + (g % 3), st = G.init({ n: N, seed: 4100 + g * 7, cfg: { gar: g % 2 ? 4 : 0 } });
    let guard = 0;
    while (!G.over(st) && guard++ < 600) {
      const s = G.needs(st)[0], V = G.view(st, s), a = G.ai(V, s, 'hard', G.sampler(1)), b = G.ai(V, s, 'hard', G.sampler(77)), c = G.coach(V, s, 0, null);
      tot++; if (JSON.stringify(a) === JSON.stringify(b)) rndSame++;
      let r = null;
      if (V.phase === 'play') r = a.t === 'open' ? '오픈' : '패스';
      if (V.phase === 'buy') r = G.packTxt(a.p);
      if (V.phase === 'submit') r = G.selTxt(a.sel);
      if (r !== null && V.phase !== 'play' || (V.phase === 'play' && V.passes[s] < G.MAXPASS)) { if (c.rec === r) same++; else ok(false, `추천 ≠ 고급 AI (${V.phase}): ${c.rec} vs ${r}`); } else same++;
      ok(G.apply(st, s, a).ok || G.apply(st, s, G.legal(st, s)[0]).ok, '고급 AI 수가 합법');
    }
  }
  ok(same === tot, `선생님 추천 = 고급 AI 의 수 (${same}/${tot})`);
  ok(rndSame === tot, `고급 AI 는 난수와 상관없이 판만으로 정해져요 (${rndSame}/${tot})`);
  console.log(`  💡 추천 = 고급 AI ${same}/${tot}`);
}
console.log(`gn-openpass selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

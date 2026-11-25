// 초이스 홀덤 규칙 시험 (node survival/test/choicehold_selftest.js)
'use strict';
const C = require('../games/choicehold/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const same = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' → ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
const where = () => new Error().stack.split('\n')[3].replace(/.*[\\/]/, '').replace(/\)$/, '');
const A = (st, seat, a) => { const r = C.apply(st, seat, a); ok(r.ok, '적용 ' + JSON.stringify(a) + ' ' + (r.err || '') + ' @' + where()); return r; };
const bad = (st, seat, a, m) => { const r = C.apply(st, seat, a); ok(!r.ok && r.err, m); };
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const P = C.power, call = { t: 'call' }, fold = { t: 'fold' }, rz = to => ({ t: 'raise', to });
const total = st => st.chips[0] + st.chips[1] + st.pot;
const mk = (o, seed) => C.deal(C.init({ seed: seed || 5 }), o);

// 1) 조합 분류: 20장에서 5장 뽑는 15504 가지를 모두 세어 조합별 수와 맞는지
{
  const cnt = [0, 0, 0, 0, 0, 0, 0], vals = Array.from({ length: 20 }, (_, k) => (k % 5) + 1);
  let total5 = 0, lo = Array(7).fill(1e9), hi = Array(7).fill(-1);
  for (let a = 0; a < 20; a++) for (let b = a + 1; b < 20; b++) for (let c = b + 1; c < 20; c++) for (let d = c + 1; d < 20; d++) for (let e = d + 1; e < 20; e++) {
    const five = [vals[a], vals[b], vals[c], vals[d], vals[e]], h = C.evalHand(five);
    cnt[h.r]++; total5++;
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {   // 개인 2장 = i, j
      const mine = [five[i], five[j]], com = five.filter((_, k) => k !== i && k !== j), p = P(mine, com);
      ok(C.rankOf(p) === h.r, '조합이 어떻게 나눠도 같음');
      lo[h.r] = Math.min(lo[h.r], p); hi[h.r] = Math.max(hi[h.r], p);
    }
  }
  ok(total5 === 15504, '15504 가지');
  same(cnt.slice(1), [7680, 4320, 1920, 1024, 480, 80], '원페어 · 투페어 · 트리플 · 스트레이트 · 풀하우스 · 포카드 가짓수');
  for (let r = 1; r < 6; r++) ok(hi[r] < lo[r + 1], `${C.NAMES[r]} 는 ${C.NAMES[r + 1]} 보다 항상 약함`);
}
// 2) 겨루기 규칙: 조합 숫자 → 안 쓴 개인 카드
{
  ok(P([3, 3], [3, 3, 1]) > P([4, 4], [4, 1, 1]), '포카드 > 풀하우스');
  ok(P([4, 4], [4, 1, 1]) > P([1, 2], [3, 4, 5]), '풀하우스 > 스트레이트');
  ok(P([1, 2], [3, 4, 5]) > P([2, 2], [2, 3, 4]), '스트레이트 > 트리플');
  ok(P([2, 2], [2, 3, 4]) > P([5, 5], [4, 4, 1]), '트리플 > 투페어 (숫자가 작아도)');
  ok(P([5, 5], [4, 4, 1]) > P([5, 1], [5, 2, 3]), '투페어 > 원페어');
  ok(P([4, 4], [4, 5, 5]) > P([3, 3], [3, 2, 2]), '풀하우스: 트리플 숫자가 큰 쪽');
  ok(P([3, 3], [3, 2, 2]) > P([3, 3], [3, 1, 1]), '풀하우스: 같은 트리플이면 페어 숫자');
  ok(P([4, 4], [4, 4, 1]) > P([3, 3], [3, 3, 5]), '포카드: 숫자가 큰 쪽');
  ok(P([5, 5], [1, 1, 2]) > P([4, 4], [3, 3, 2]), '투페어: 큰 페어 먼저');
  ok(P([5, 5], [3, 3, 1]) > P([5, 5], [2, 2, 1]), '투페어: 큰 페어가 같으면 작은 페어');
  ok(P([4, 1], [4, 2, 5]) > P([3, 1], [3, 2, 5]), '원페어: 페어 숫자가 큰 쪽');
  ok(P([5, 1], [3, 3, 2]) > P([4, 1], [3, 3, 2]), '같은 페어(공유 카드)면 안 쓴 개인 카드 큰 쪽');
  ok(P([5, 2], [3, 3, 4]) > P([5, 1], [3, 3, 4]), '안 쓴 개인 카드 두 번째까지 겨룸');
  ok(P([5, 1], [3, 3, 4]) === P([1, 5], [3, 3, 4]), '개인 카드 순서는 상관없음');
  ok(P([2, 5], [2, 2, 4]) > P([2, 1], [2, 2, 4]), '트리플: 조합 숫자와 같은 개인 카드는 안 쓴 카드가 아님 (남은 카드로 겨룸)');
  ok(P([2, 5], [2, 2, 4]) === P([5, 2], [4, 2, 2]), '모두 같으면 같은 값 (카드 놓인 순서는 상관없음)');
  ok(P([1, 2], [3, 4, 5]) === P([5, 4], [3, 2, 1]) && P([1, 2], [3, 4, 5]) === P([3, 1], [2, 4, 5]), '스트레이트끼리는 언제나 비김 (이월)');
  ok(P([4, 4], [4, 1, 1]) === P([4, 1], [4, 4, 1]), '풀하우스 쓴 카드가 어디 있어도 같음');
  ok(P([1, 1], [5, 5, 5]) < P([2, 2], [5, 5, 5]), '풀하우스: 트리플이 같고 페어만 다름');
  ok(P([1, 2], [5, 5, 3]) > P([1, 2], [4, 4, 3]), '원페어 비교 (공유 카드에서)');
}

// 3) 판 진행 (카드를 정해서)
const H = (o) => mk(Object.assign({ first: 0, pc: [1, 5], com: [2, 2, 3], offer: [4, 5] }, o));
{
  let st = H({});
  ok(st.hand === 1 && st.phase === 'bet1' && C.needs(st).join() === '0', '1판 시작: 선 0');
  same(st.chips, [19, 19], '기본 베팅 1칩'); ok(st.pot === 2 && total(st) === 40, '판돈 2');
  bad(st, 1, call, '선이 아닌 자리');
  bad(st, 0, rz(0), '레이즈는 지금보다 커야 함'); bad(st, 0, rz(1.5), '정수 아닌 레이즈'); bad(st, 0, rz(20), '칩보다 큰 레이즈');
  bad(st, 0, { t: 'x' }, '모르는 행동'); bad(st, 0, null, 'null');
  const v = C.view(st, 1); same(v.pc, [null, 5], '상대 개인 카드는 안 보임'); ok(v.cap === 19 && v.cur === 0 && v.maxRaise === 3, '베팅 정보');
  // 체크(콜) → 상대도 한 번 말해야 끝남
  A(st, 0, call);
  ok(st.phase === 'bet1' && C.needs(st).join() === '1', '선이 콜(체크)해도 후가 한 번 말함');
  A(st, 1, call);
  ok(st.phase === 'place' && C.needs(st).join() === '0' && st.pot === 2, '둘 다 말하면 카드 선택');
  bad(st, 1, { t: 'place', up: 0 }, '선만 카드를 놓음'); bad(st, 0, { t: 'place', up: 2 }, '0 · 1 만'); bad(st, 0, { t: 'take', d: 'up' }, '아직 놓기 전');
  same(C.view(st, 0).give, [4, 5], '선은 받은 2장을 봄'); ok(C.view(st, 1).give === null && C.view(st, -1).give === null, '후 · 구경은 못 봄');
  A(st, 0, { t: 'place', up: 1 });                                         // 5 를 앞면, 4 를 뒷면
  ok(st.phase === 'take' && C.needs(st).join() === '1', '후가 고름');
  let V1 = C.view(st, 1); ok(V1.up === 5 && V1.down === null && V1.give === null, '후는 앞면만 보임');
  let V0 = C.view(st, 0); ok(V0.up === 5 && V0.down === 4, '선은 둘 다 앎'); ok(C.view(st, -1).down === null, '구경은 뒷면 못 봄');
  bad(st, 0, { t: 'take', d: 'up' }, '후만 고름'); bad(st, 1, { t: 'take', d: 'left' }, '앞 · 뒤만');
  A(st, 1, { t: 'take', d: 'up' });                                        // 후는 앞면 5 → 선은 뒷면 4
  same(st.sec, [4, 5], '후 5 · 선 4'); ok(st.phase === 'bet2' && C.needs(st).join() === '0', '2차 베팅은 선부터');
  V0 = C.view(st, 0); V1 = C.view(st, 1);
  ok(V0.sec[0] === 4 && V0.osec === 5 && V0.pc[1] === null && V0.sec[1] === null, '선은 후가 5 를 가진 걸 앎');
  ok(V1.sec[1] === 5 && V1.osec === null && V1.sec[0] === null && V1.down === null, '후는 선이 가진 뒷면 카드를 모름');
  A(st, 0, call); A(st, 1, call);
  // 공개: 후 (5,5)+(2,2,3) = 투페어 / 선 (1,4)+(2,2,3) = 원페어 → 후 승
  ok(st.phase === 'show' && st.res.win === 1 && st.res.pot === 2 && !st.res.fold && !st.res.tie, '후 승');
  same(st.chips, [19, 21], '후가 판돈 가져감'); ok(total(st) === 40, '칩 합 40');
  const Vs = C.view(st, 0); same(Vs.pc, [1, 5], '대결 때는 상대 개인 카드도 공개'); same(Vs.sec, [4, 5], '두 번째 카드도 공개'); ok(Vs.down === 4, '뒷면 카드도 공개');
  ok(C.auto(st) > 0 && C.needs(st).length === 0, '결과 단계는 자동으로 넘어감');
  C.advance(st);
  ok(st.hand === 2 && st.first === 1 && st.phase === 'bet1' && C.needs(st).join() === '1', '선후공 번갈아');
  ok(st.chips[0] + st.chips[1] + st.pot === 40, '다음 판도 칩 합 40');
}
// 뒷면을 고르는 경우
{
  const st = H({ first: 1, pc: [3, 1], com: [1, 4, 5], offer: [2, 5] });
  A(st, 1, call); A(st, 0, call);
  A(st, 1, { t: 'place', up: 0 });                                         // 2 앞면, 5 뒷면
  ok(C.view(st, 0).up === 2 && C.view(st, 0).down === null, '후(0)는 앞면 2 만 봄');
  A(st, 0, { t: 'take', d: 'down' });
  same(st.sec, [5, 2], '0 은 뒷면 5, 선(1)은 앞면 2'); ok(st.taken === 'down', '고른 쪽');
  const V0 = C.view(st, 0); ok(V0.sec[0] === 5 && V0.down === 5 && V0.osec === 2, '뒷면을 고른 후는 그 카드를 봄, 상대(선)가 앞면 2 를 가진 것도 앎');
  const V1 = C.view(st, 1); ok(V1.sec[1] === 2 && V1.osec === 5, '선은 후가 뒷면 5 를 가진 걸 앎');
  ok(C.needs(st).join() === '1', '2차 베팅 선부터');
  A(st, 1, call); A(st, 0, call);
  // 0: (3,5)+(1,4,5) = 원페어 5 / 1: (1,2)+(1,4,5) = 원페어 1 → 0 승
  ok(st.res.win === 0 && st.chips[0] === 21, '뒷면 5 로 이김');
}
// 베팅: 레이즈 한도 · 콜 · 폴드 · 칩 부족
{
  let st = H({});
  A(st, 0, rz(1)); ok(st.cur === 1 && st.bet[0] === 1 && st.chips[0] === 18 && C.needs(st).join() === '1', '레이즈 1');
  bad(st, 1, rz(1), '이미 1 이니 2 이상'); A(st, 1, rz(3)); A(st, 0, rz(4));
  ok(st.raises === 3, '레이즈 3번');
  bad(st, 1, rz(5), '레이즈는 한 베팅에 3번까지'); ok(!C.legal(st, 1).some(a => a.t === 'raise'), '레이즈 후보도 없음');
  A(st, 1, call);
  ok(st.phase === 'place' && st.bet[0] === 4 && st.bet[1] === 4 && st.pot === 10 && st.chips[0] === 15 && st.chips[1] === 15, '콜하면 칩이 같아져 끝');
  A(st, 0, { t: 'place', up: 0 }); A(st, 1, { t: 'take', d: 'up' });
  ok(st.cur === 0 && st.bet[0] === 0 && st.raises === 0, '2차 베팅은 새로 시작');
  A(st, 0, rz(15)); ok(st.chips[0] === 0, '칩 전부 걸기');
  bad(st, 1, rz(16), '칩이 적은 쪽 한도 넘음'); A(st, 1, call);
  ok(st.phase === 'show' && total(st) === 40, '칩을 다 걸고 대결');
}
{
  const st = H({ chips: [5, 20] });                                         // 선이 칩이 적음 → 한도 4
  ok(st.cap === 4, '둘 중 적은 쪽 칩이 한도'); bad(st, 0, rz(5), '한도 5 는 못 걸음'); A(st, 0, rz(4)); A(st, 1, call);
  ok(st.chips[0] === 0 && st.chips[1] === 15, '선 칩 0 · 후 15');
  A(st, 0, { t: 'place', up: 0 }); A(st, 1, { t: 'take', d: 'up' });
  ok(st.phase === 'show', '칩이 없으면 2차 베팅 없이 바로 대결');
  same(st.chips, [0, 25], '후가 이겨 판돈 10 을 가져감'); ok(st.pot === 0, '판돈 정산');
}
{
  const st = H({});
  A(st, 0, rz(2)); A(st, 1, fold);
  ok(st.phase === 'show' && st.res.fold && st.res.win === 0 && st.res.folder === 1 && st.res.pot === 4, '폴드: 상대가 판돈');
  same(st.chips, [21, 19], '폴드 칩'); ok(!C.view(st, 0).pc[1] && C.view(st, 0).res.fold, '폴드면 상대 카드는 안 열림');
  C.advance(st); ok(st.first === 1 && st.hand === 2, '폴드 뒤에도 선후공 바뀜');
  const s2 = H({});
  A(s2, 0, call); A(s2, 1, call); A(s2, 0, { t: 'place', up: 0 }); A(s2, 1, { t: 'take', d: 'down' });
  A(s2, 0, rz(1)); A(s2, 1, fold);
  ok(s2.res.fold && s2.res.win === 0 && s2.chips[0] === 20 + 1, '2차 베팅 폴드');
  bad(s2, 0, call, '결과 단계는 입력 안 됨');
}
// 기본 베팅이 10판마다 늘어남
for (const [done, ante] of [[0, 1], [9, 1], [10, 2], [19, 2], [20, 3], [29, 3], [30, 4], [39, 4]]) {
  const st = H({ done });
  ok(st.hand === done + 1 && C.anteOf(st.hand) === ante && st.chips[0] === 20 - ante && st.pot === 2 * ante, `${done + 1}번째 판 기본 베팅 ${ante}칩`);
}
// 칩이 모자라 기본 베팅을 못 내면 짐 · 40판 뒤 칩 많은 쪽
{
  let st = H({ done: 10, chips: [1, 30] });
  ok(st.over && st.final.why === 'ante' && st.final.win === 1 && C.ranks(st).join() === '1,0' && C.needs(st).length === 0, '기본 베팅(2)을 못 내면 짐');
  st = H({ done: 10, chips: [30, 1] }); ok(st.over && C.ranks(st).join() === '0,1', '반대쪽');
  st = H({ done: 30, chips: [3, 3] }); ok(st.over && C.ranks(st).join() === '0,0', '둘 다 못 내면 칩 비교 (같으면 공동)');
  st = H({ done: 30, chips: [3, 2] }); ok(st.over && C.ranks(st).join() === '0,1', '둘 다 못 내면 칩 많은 쪽');
  st = H({ done: 30, chips: [3, 9] }); ok(st.over && C.ranks(st).join() === '1,0', '한쪽만 못 내면 그쪽이 짐');
  st = H({ done: 39, chips: [25, 15] });
  A(st, 0, rz(1)); A(st, 1, fold);
  ok(st.phase === 'show' && st.res.win === 0, '40번째 판 결과'); C.advance(st);
  ok(st.over && st.final.why === 'hands' && st.final.win === 0 && C.ranks(st).join() === '0,1', '40판을 마치면 칩 많은 쪽 승');
  const v = C.view(st, -1); ok(v.over && v.ranks.join() === '0,1' && C.view(st, 'all').ranks.join() === '0,1', '구경 · 전체 보기 등수');
  st = H({ done: 39, chips: [20, 20] }); A(st, 0, rz(1)); A(st, 1, fold); st.chips = [20, 20]; st.pot = 0; C.advance(st);
  ok(st.over && C.ranks(st).join() === '0,0', '칩이 같으면 공동 1등');
}
// 무승부: 판돈 이월 · 같은 선 · 같은 판 번호
{
  let st = H({ first: 0, pc: [4, 4], com: [1, 2, 3], offer: [5, 5] });
  A(st, 0, rz(2)); A(st, 1, call);                                         // 1판: 4 + 4 베팅 = 판돈 6
  A(st, 0, { t: 'place', up: 0 }); A(st, 1, { t: 'take', d: 'up' });       // 둘 다 5 → 스트레이트 · 스트레이트
  A(st, 0, call); A(st, 1, call);
  ok(st.res.tie && st.res.win === -1 && st.pot === 6 && total(st) === 40, '무승부면 판돈이 남음');
  C.advance(st);
  ok(st.hand === 1 && st.first === 0 && st.pot === 8 && st.chips[0] === 16 && st.chips[1] === 16 && total(st) === 40, '이월: 같은 판 번호 · 같은 선 · 판돈 위에 기본 베팅 더함');
  ok(C.view(st, 0).ante === 1, '이월된 판은 기본 베팅 그대로');
  A(st, 0, fold);
  ok(st.res.win === 1 && st.chips[1] === 16 + 8 + 0 && st.res.pot === 8, '다음 판 승자가 이월된 판돈까지 다 가져감 (폴드)');
  C.advance(st); ok(st.hand === 2 && st.first === 1, '이월이 풀리면 정상으로');
}
// 같은 조합이어도 안 쓴 개인 카드로 갈림
{
  const st = H({ first: 0, pc: [5, 1], com: [3, 3, 2], offer: [4, 2] });  // 0: (5,x) / 1: (1,y)
  A(st, 0, call); A(st, 1, call); A(st, 0, { t: 'place', up: 0 }); A(st, 1, { t: 'take', d: 'up' });   // 후(1) 가 앞면 4 · 선(0) 이 뒷면 2
  A(st, 0, call); A(st, 1, call);
  // 0: (5,2)+(3,3,2) = 투페어 3,2 + 5 / 1: (1,4)+(3,3,2) = 원페어 3
  ok(st.res.win === 0, '투페어 > 원페어');
}

// 4) 숨은 정보: 못 보는 카드만 바꾼 두 판에서 보기가 같아야 함
const clone = st => JSON.parse(JSON.stringify(st));
function hiddenSwap(st, s) {       // s 자리가 못 보는 카드를 다른 값으로
  const t = clone(st), F = t.first, B = 1 - F, nx = v => (v % 5) + 1;
  if (t.over || (t.phase === 'show' && t.res && !t.res.fold)) return t;   // 끝났거나 대결이 공개되면 다 보임
  [0, 1].forEach(i => { if (i !== s) t.pc[i] = nx(t.pc[i]); });           // 상대 개인 카드
  const seeOffer = k => (t.phase === 'bet1' ? false : t.phase === 'place' ? s === F : k === t.up || s === F || (s === B && t.taken === 'down'));
  [0, 1].forEach(k => { if (!seeOffer(k)) t.offer[k] = nx(t.offer[k]); });   // 카드 선택용 2장 중 못 보는 것
  if (t.taken) [0, 1].forEach(i => { if (i !== s && !(s === F && i === B)) t.sec[i] = nx(t.sec[i]); });   // 선은 후의 두 번째 카드를 앎
  return t;
}
function leakCheck(st, tag) {
  for (const s of [0, 1, -1]) {
    const t = hiddenSwap(st, s);
    same(C.view(st, s), C.view(t, s), `${tag} (${s}) 못 보는 카드만 바꾼 두 판의 보기`);
  }
  const pubs = new Set([-1, 0, 1, 'all'].map(s => C.view(st, s).pub));
  ok(pubs.size === 1, tag + ' 공개 지문이 자리마다 다름');
}
{
  const st = H({ first: 0, pc: [1, 5], com: [2, 2, 3], offer: [4, 5] });
  leakCheck(st, 'bet1'); A(st, 0, call); A(st, 1, call);
  leakCheck(st, 'place'); A(st, 0, { t: 'place', up: 1 });
  leakCheck(st, 'take'); A(st, 1, { t: 'take', d: 'up' });
  leakCheck(st, 'bet2(up)'); A(st, 0, call); A(st, 1, call);
  leakCheck(st, 'show');
  const s2 = H({ first: 1, pc: [3, 1], com: [1, 4, 5], offer: [2, 5] });
  A(s2, 1, call); A(s2, 0, call); A(s2, 1, { t: 'place', up: 0 }); A(s2, 0, { t: 'take', d: 'down' });
  leakCheck(s2, 'bet2(down)');
  const s3 = H({}); A(s3, 0, rz(1)); A(s3, 1, fold); leakCheck(s3, 'fold');
}

// 5) AI 끼리 끝까지: 칩 보존 · 규칙 · 결정성 · 숨은 정보
function playOut(seed, tiers) {
  const st = C.init({ seed }), r = lcg(seed * 11 + 3);
  let steps = 0;
  while (!C.over(st) && steps < 6000) {
    const need = C.needs(st);
    if (!need.length) { ok(C.auto(st) != null, '입력 없는데 자동으로도 안 넘어감 ' + st.phase); C.advance(st); steps++; continue; }
    const seat = need[0], V = C.view(st, seat), L = C.legal(st, seat);
    ok(L.length > 0, '고를 행동이 없음 ' + st.phase);
    if (steps % 23 === 0) leakCheck(st, 'AI판 ' + st.phase);
    const a = C.ai(V, seat, tiers[seat], r), res = C.apply(st, seat, a);
    if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase}) ${JSON.stringify(a)} → ${res.err}`); C.apply(st, seat, L[0]); }
    ok(st.chips[0] >= 0 && st.chips[1] >= 0, '칩이 음수'); ok(total(st) === 40, '칩 합이 바뀜 ' + total(st));
    steps++;
  }
  ok(C.over(st), `판이 끝남 (seed ${seed}, ${steps}번)`);
  ok(total(st) === 40, '끝난 판 칩 합'); ok(st.done <= 40, '40판 넘김');
  const R = C.ranks(st); ok(R.length === 2 && R.includes(0), '등수');
  return st;
}
for (let k = 0; k < 40; k++) playOut(100 + k, [['easy', 'normal', 'hard'][k % 3], ['hard', 'easy', 'normal'][k % 3]]);
for (let k = 0; k < 6; k++) { const st = playOut(300 + k, ['hard', 'hard']); ok(st.done >= 1, '고급끼리도 진행'); }
{
  const a = JSON.stringify(playOut(777, ['hard', 'normal'])), b = JSON.stringify(playOut(777, ['hard', 'normal']));
  ok(a === b, '같은 seed 는 같은 결과'); ok(a !== JSON.stringify(playOut(778, ['hard', 'normal'])), '다른 seed 는 다른 결과');
}

// 6) 확률이 맞는지 (알려진 값과 비교)
{
  // 선(0) 이 2차 베팅에서 상대 개인 카드만 모를 때: 정확히 세어서 합이 1
  const st = H({ first: 0, pc: [5, 1], com: [3, 3, 2], offer: [4, 2] });
  A(st, 0, call); A(st, 1, call); A(st, 0, { t: 'place', up: 0 }); A(st, 1, { t: 'take', d: 'up' });
  const q = C.equity(C.view(st, 0), 0, 1);
  ok(Math.abs(q.win + q.tie + q.lose - 1) < 1e-9 && q.e > 0.5, `승률 합 1 · 내가 앞섬 (${q.e.toFixed(3)})`);
  // 직접 센 값과 비교: 모르는 카드 = 상대 개인 카드 한 장 (남은 카드 중)
  const pool = [0, 4, 4, 4, 4, 4]; [5, 3, 3, 2, 2, 4].forEach(v => pool[v]--);   // 내 개인 5,(2) + 공유 3,3,2 + 상대 두 번째 4
  let W = 0, w = 0, t = 0; for (let o = 1; o <= 5; o++) { W += pool[o]; const a = P([5, 2], [3, 3, 2]), b = P([o, 4], [3, 3, 2]); if (a > b) w += pool[o]; else if (a === b) t += pool[o]; }
  ok(Math.abs(q.win - w / W) < 1e-9 && Math.abs(q.tie - t / W) < 1e-9, '직접 센 승률과 같음');
  const te = C.takeEval(3, [1, 4, 5], 2); ok(te.up >= 0 && te.up <= 1 && te.down >= 0 && te.down <= 1, '후의 고르기 계산 범위');
  const te2 = C.takeEval(2, [2, 2, 3], 5); ok(te2.up > te2.down - 0.0001 || te2.down > te2.up, '고르기 계산이 값을 냄');
}

// 7) 고급이 초급 · 중급을 이기는지 (자리 번갈아 가며, 이긴 판 수 · 비기면 반)
function match(tHard, tOpp, games, seed0) {
  let w = 0;
  for (let g = 0; g < games; g++) {
    const h = g % 2, tiers = h === 0 ? [tHard, tOpp] : [tOpp, tHard], st = C.init({ seed: seed0 + g }), r = lcg(seed0 * 7 + g);
    let steps = 0;
    while (!C.over(st) && steps++ < 6000) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const s = need[0], a = C.ai(C.view(st, s), s, tiers[s], r);
      if (!C.apply(st, s, a).ok) C.apply(st, s, C.legal(st, s)[0]);
    }
    const R = C.ranks(st); w += R[h] === 0 ? (R[1 - h] === 0 ? 0.5 : 1) : 0;
  }
  return w / games;
}
{
  const hv = match('hard', 'easy', 300, 20000), hn = match('hard', 'normal', 300, 30000), nv = match('normal', 'easy', 300, 40000);
  console.log(`  [고급 : 초급] 300판 고급 승률 ${(hv * 100).toFixed(1)}% · [고급 : 중급] ${(hn * 100).toFixed(1)}% · [중급 : 초급] ${(nv * 100).toFixed(1)}%`);
  ok(hv > 0.55, `고급이 초급을 이김 (${(hv * 100).toFixed(1)}% > 55%)`);
  ok(hn > 0.5, `고급이 중급보다 낫거나 비슷함 (${(hn * 100).toFixed(1)}%)`);
  ok(nv > 0.5, `중급이 초급보다 낫거나 비슷함 (${(nv * 100).toFixed(1)}%)`);
}

console.log(`초이스 홀덤 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

// 링 더 벨 규칙 시험: node survival/test/ringbell_selftest.js
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'games', 'ringbell', 'core.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, clone = o => JSON.parse(J(o));
const lcg = s => { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const t0 = Date.now();
const id = (k, v) => k * 10 + v - 1;                     // 색 k(0 빨강 1 파랑 2 노랑 3 초록), 숫자 v → 카드 번호
const R_ = 0, B_ = 1, Y_ = 2, G_ = 3;

// 1) 조합
{
  ok(C.best([id(G_, 3), id(G_, 9), id(R_, 9), id(B_, 2)]).sum === 18, '같은 숫자 9+9 = 18 (초록 3+9 = 12 보다 큼)');
  ok(C.best([id(R_, 7), id(R_, 8), id(R_, 2), id(R_, 10)]).sum === 27, '한 색 4장 = 27');
  ok(C.best([id(R_, 1), id(B_, 2), id(Y_, 3), id(G_, 4)]).sum === 4 && C.best([id(R_, 1), id(B_, 2), id(Y_, 3), id(G_, 4)]).kind === 'one', '모두 다르면 가장 큰 한 장');
  ok(C.best([id(R_, 6), id(B_, 6), id(Y_, 6), id(G_, 6)]).sum === 24 && C.fourV([id(R_, 6), id(B_, 6), id(Y_, 6), id(G_, 6)]) === 6, '포카드 6 = 24, fourV');
  ok(C.best([id(R_, 10), id(B_, 10), id(R_, 3), id(B_, 5)]).sum === 20, '10+10 = 20 (빨강 13 · 파랑 15 보다 큼)');
  let same = 0;
  for (let k = 0; k < 3000; k++) { const r = lcg(k), h = []; while (h.length < 4) { const c = Math.floor(r() * 40); if (!h.includes(c)) h.push(c); } if (C.best(h).sum === C.bestSum(h, -1)) same++; }
  ok(same === 3000, `빠른 계산 bestSum = best (${same}/3000)`);
  ok(C.teamsFor(4)[0].join() === '0,2' && C.teamsFor(2).length === 2 && C.teamsFor(3).length === 3, '팀: 4명 = 0·2 대 1·3');
}

// 2) 방송 기록 (나무위키 피의 게임X/5일차 · 공식 하이라이트): 세트마다 벨 친 사람 · 조합 합 → 목숨 · 라운드 승패를 그대로
//    자리 0·2 = C팀, 1·3 = R팀 (방송 차례도 팀을 번갈아). 각 세트 조합은 같은 숫자면 서로 다른 색, 다른 숫자면 한 색으로 만들고 나머지는 작은 카드로 채움
//    2:2 는 공개 차례에 조합을 골라 냄 — 방송 3R 2세트 김유현 2 · 3R 3세트 김경훈 1 은 손패에 더 큰 조합이 있어도 낮게 낸 '탱킹' (손패 4장으로는 가장 큰 조합이 3 아래일 수 없음)
{
  const CR = [
    { names: ['김유현', '현성주', '김남희', '신승용'], win: 1, sets: [
      { bell: 3, c: [[3, 6, 9], [8, 8], [5, 10], [4, 5, 8, 9]], lives: [3, 3, 2, 3] },
      { bell: 3, c: [[7], [8, 9], [2, 6], [7, 9]], lives: [2, 3, 2, 3] },
      { bell: 0, c: [[6, 10], [1, 2, 5, 9], [2, 5, 9], [7, 8]], lives: [2, 3, 2, 2] },
      { bell: 0, c: [[7, 8], [6, 10], [8, 10], [1, 4, 10]], lives: [0, 3, 2, 1] }] },
    { names: ['강지후', '현성주', '김경훈', '곽범'], win: 0, sets: [
      { bell: 2, c: [[7, 7, 7], [8, 8], [7, 8], [2, 3, 4, 9]], lives: [3, 3, 1, 3] },
      { bell: 2, c: [[2, 6, 7], [9, 9], [10, 10], [6, 10]], lives: [2, 3, 1, 3] },
      { bell: 3, c: [[2, 9, 10], [10, 10], [2, 6, 7, 8], [1, 4, 7, 8]], lives: [2, 2, 1, 1] },
      { bell: 3, c: [[1, 2, 5, 7], [6, 8], [9, 9, 9], [3, 6, 9, 10]], lives: [2, 1, 1, 1] },
      { bell: 3, c: [[5, 6, 8], [9, 9], [1, 7, 9], [4, 5, 7]], lives: [2, 1, 1, 0] }] },
    { names: ['김유현', '현성주', '김경훈', '신승용'], win: 1, sets: [
      { bell: 1, c: [[4, 7], [8, 10], [5, 10], [6, 9, 10]], lives: [2, 3, 3, 3] },
      { bell: 1, c: [[2], [10, 10], [4, 5], [7, 8]], lives: [1, 3, 3, 3] },
      { bell: 3, c: [[7], [6, 10], [1], [10, 10]], lives: [1, 3, 2, 3] },
      { bell: 3, c: [[6, 6, 6], [10, 10], [8, 8], [10, 10]], lives: [1, 3, 1, 3] },
      { deck: 3, c: [[10, 10], [5, 7, 9], [3, 7, 9, 10], [3, 6, 8, 10]], lives: [0, 3, 1, 3] }] },
  ];
  // 조합 목록 → 겹치지 않는 4장 손패들 (합이 정확히 그 조합이 되게)
  function build(combos) {
    // ① 조합 카드: 색 고르기를 되돌아가며(backtrack) 겹치지 않게
    const pick = [], used = new Set();
    const go = i => {
      if (i === combos.length) return true;
      const cb = combos[i], sameNum = cb.length > 1 && cb.every(v => v === cb[0]);
      for (let k0 = 0; k0 < 4; k0++) {
        const cand = sameNum ? cb.map((v, q) => id((k0 + q) % 4, v)) : cb.map(v => id(k0, v));
        if (cand.some(c => used.has(c)) || new Set(cand).size !== cand.length) continue;
        cand.forEach(c => used.add(c)); pick[i] = cand;
        if (go(i + 1)) return true;
        cand.forEach(c => used.delete(c));
      }
      return false;
    };
    if (!go(0)) return null;
    // ② 나머지 칸: 작은 카드부터, 조합 합이 그대로인 것만 — 그렇게 못 채우면(탱킹) 아무 작은 카드로
    const hands = [], tank = [];
    for (let i = 0; i < combos.length; i++) {
      const want = combos[i].reduce((x, y) => x + y, 0), h = pick[i].slice();
      for (let v = 1; v <= 10 && h.length < 4; v++) for (let k = 0; k < 4 && h.length < 4; k++) {
        const c = id(k, v); if (used.has(c)) continue;
        const t2 = h.concat([c]); if (C.best(t2).sum === want && !C.fourV(t2)) { h.push(c); used.add(c); }
      }
      if (h.length < 4) {
        tank.push(i);                                      // 탱킹: 큰 카드부터 채워 '더 큰 조합이 있는데 낮게 냄' 이 되게
        for (let v = 10; v >= 1 && h.length < 4; v--) for (let k = 0; k < 4 && h.length < 4; k++) {
          const c = id(k, v); if (!used.has(c) && !C.fourV(h.concat([c]))) { h.push(c); used.add(c); }
        }
      }
      if (h.length < 4) return null;
      hands.push(h);
    }
    return { hands, used, pick, tank };
  }
  const st = C.init({ n: 4, seed: 5 });
  let prevFirst = -1, allSets = 0, tanks = [], tankAI = null;
  // 공개: 차례대로 방송 조합을 냄 (내기 전 · 낸 뒤 보이는 것 확인)
  const revealAll = (B, RD, ri, si) => {
    ok(st.phase === 'reveal' && C.needs(st).length === 1 && st.res === null, `${ri + 1}R ${si + 1}세트 공개 단계`);
    const ord = st.rv.order.slice();
    ord.forEach((s, k) => {
      ok(st.cur === s, '공개 차례 ' + RD.names[s]);
      if (ri === 2 && si === 2 && s === 2) tankAI = C.recommend(C.view(st, 2), 2);      // 3R 3세트 김경훈 차례: 고급 AI 도 탱킹?
      ok(C.apply(st, s, { t: 'show', cards: B.pick[s] }).ok, `${RD.names[s]} 조합 공개`);
      const Vo = C.view(st, (s + 1) % 4);
      ok(J(Vo.shown[s]) === J(B.pick[s].slice().sort((a, b) => (a % 10) - (b % 10) || a - b)) && (k === 3 || Vo.shown[ord[k + 1]] === null), '낸 조합은 모두가 봄 · 안 낸 사람은 null');
    });
  };
  CR.forEach((RD, ri) => {
    RD.sets.forEach((S, si) => {
      ok(st.round === ri + 1 && st.set === si + 1, `${ri + 1}R ${si + 1}세트 시작`);
      if (si > 0) ok(st.start === prevFirst, `${ri + 1}R ${si + 1}세트 선 = 직전 세트 벨 친 사람 (${RD.names[st.start]})`);
      const B = build(S.c); ok(!!B, `${ri + 1}R ${si + 1}세트 손패 만들기`);
      if (!B) return;
      for (const i of B.tank) tanks.push(`${ri + 1}R${si + 1}:${RD.names[i]}`);
      st.hands = B.hands.map(h => h.slice()); st.known = [[], [], [], []];
      const rest = []; for (let c = 0; c < 40; c++) if (!B.used.has(c)) rest.push(c);
      // 앞면 = 누구의 조합도 바꾸지 않는 카드
      const upC = rest.find(c => st.hands.every(h => C.best(h.concat([c])).sum === C.best(h).sum)); st.up = upC;
      st.deck = rest.filter(c => c !== upC); st.disc = [];
      if (S.bell != null) {
        st.cur = S.bell;
        ok(C.apply(st, S.bell, { t: 'bell' }).ok, `${ri + 1}R ${si + 1}세트 ${RD.names[S.bell]} 벨`);
        while (st.phase === 'turn' || st.phase === 'drop') {      // 나머지는 앞면을 가져와 그대로 버림 (손패 그대로)
          const s = st.cur, got = st.up;
          ok(C.apply(st, s, { t: 'take', src: 'up' }).ok && C.apply(st, s, { t: 'drop', c: got }).ok, '벨 뒤 한 번 바꾸기');
        }
        ok(st.rv && st.rv.kind === 'bell' && st.rv.order[0] === S.bell, `벨 친 ${RD.names[S.bell]} 부터 공개`);
        revealAll(B, RD, ri, si);
        prevFirst = S.bell;
      } else {
        st.deck = [st.deck.find(c => C.best(st.hands[S.deck].concat([c])).sum === C.best(st.hands[S.deck]).sum)];
        st.cur = S.deck; const d = st.deck[0];
        ok(C.apply(st, S.deck, { t: 'take', src: 'deck' }).ok && C.apply(st, S.deck, { t: 'drop', c: d }).ok, '더미 마지막 장');
        ok(st.rv && st.rv.kind === 'deck' && st.rv.order[0] === (S.deck + 1) % 4, `더미를 비운 ${RD.names[S.deck]} 다음 사람부터 공개`);
        revealAll(B, RD, ri, si);
        prevFirst = (S.deck + 1) % 4;
      }
      const want = S.c.map(x => x.reduce((a, b) => a + b, 0));
      ok(J(st.res.sums) === J(want), `${ri + 1}R ${si + 1}세트 합 ${st.res.sums} = 방송 ${want}`);
      ok(J(st.lives) === J(S.lives), `${ri + 1}R ${si + 1}세트 목숨 ${st.lives} = 방송 ${S.lives}`);
      allSets++;
      if (si === RD.sets.length - 1) {
        ok(st.rres && st.rres.win.length === 1 && st.rres.win[0] === RD.win, `${ri + 1}R 승리 팀 ${st.rres && st.rres.win} = 방송 ${RD.win === 1 ? 'R' : 'C'}`);
      } else ok(!st.rres, `${ri + 1}R ${si + 1}세트에서 라운드가 끝나면 안 됨`);
      if (!C.over(st)) { ok(C.auto(st) > 0, '공개 뒤 자동으로 넘어감'); C.advance(st); }
    });
  });
  ok(allSets === 14, '방송 14세트 모두 맞춤');
  ok(J(tanks) === J(['3R2:김유현', '3R3:김경훈']), '손패보다 낮게 낸(탱킹) 조합 = 방송 2개 ' + J(tanks));
  ok(tankAI && tankAI.a.cards.reduce((x, c) => x + (c % 10) + 1, 0) < 7 && tankAI.best >= 7, `3R 3세트 김경훈 자리 고급 AI 도 탱킹 (가장 큰 합 ${tankAI && tankAI.best} → ${tankAI && tankAI.pick}, 목숨 1 김유현 7 보다 낮게)`);
  ok(C.over(st) && J(st.wins) === J([1, 2]) && J(C.ranks(st)) === J([2, 0, 2, 0]), `R팀 2:1 승 (wins ${st.wins}, ranks ${C.ranks(st)})`);
}

// 3) 진행 규칙: 교환 · 앞면 · 깔린 카드 · 벨 뒤 교환 · 포카드 · 카드 40장 보존 · 잘못된 입력은 상태를 안 바꿈
{
  const st = C.init({ n: 2, seed: 77 });
  const count = () => st.hands.reduce((a, h) => a + h.length, 0) + st.deck.length + st.disc.length + (st.up >= 0 ? 1 : 0);
  ok(count() === 40 && st.hands.every(h => h.length === 4) && st.deck.length === 31, '처음: 4장씩 · 앞면 1 · 더미 31');
  const s = st.cur, up0 = st.up, snap = J(st);
  for (const a of [null, {}, { t: 'take', src: 'x' }, { t: 'drop', c: 3 }, { t: 'four' }, { t: 'zz' }]) ok(!C.apply(st, s, a).ok, '잘못된 행동 거절 ' + J(a));
  ok(!C.apply(st, 1 - s, { t: 'bell' }).ok, '차례 아닌 사람 거절');
  ok(J(st) === snap, '거절된 행동은 상태를 안 바꿈');
  ok(C.apply(st, s, { t: 'take', src: 'up' }).ok && st.phase === 'drop' && st.hands[s].length === 5 && st.known[s].includes(up0), '앞면 가져오기 → 모두가 앎');
  const V1 = C.view(st, 1 - s); ok(V1.got === up0 && V1.known[s].includes(up0), '남도 앞면에서 가져간 카드를 봄');
  ok(!C.apply(st, s, { t: 'drop', c: 99 }).ok && !C.apply(st, s, { t: 'bell' }).ok, '버리기 단계엔 손패 카드만');
  const dropC = st.hands[s].find(c => c !== up0);
  ok(C.apply(st, s, { t: 'drop', c: dropC }).ok && st.up === dropC && st.cur === 1 - s && st.disc.length === 0 && count() === 40, '버린 카드가 새 앞면 · 다음 사람');
  const s2 = st.cur, oldUp = st.up;
  ok(C.apply(st, s2, { t: 'take', src: 'deck' }).ok, '뒷면 가져오기');
  const Vo = C.view(st, s), Vm = C.view(st, s2);
  ok(Vo.got === -1 && Vm.got >= 0 && Vm.hand.length === 5 && Vo.hand.length === 4, '뒷면에서 뽑은 카드는 나만 봄');
  ok(C.apply(st, s2, { t: 'drop', c: Vm.got }).ok && st.disc[0] === oldUp && st.up === Vm.got && count() === 40, '뽑은 카드를 바로 버림 → 원래 앞면은 깔림(기록)');
  // 벨: 나머지가 한 번씩 바꾸고, 벨 친 사람 다음 차례 · 벨 뒤엔 벨 · 포카드 없음
  const s3 = st.cur;
  ok(C.apply(st, s3, { t: 'bell' }).ok && st.cur === 1 - s3 && st.phase === 'turn' && st.bell === s3, '벨 → 상대가 한 번 바꿈');
  ok(!C.apply(st, st.cur, { t: 'bell' }).ok, '벨 뒤 교환 차례엔 벨 못 침');
  const o = st.cur, g = st.up;
  ok(C.apply(st, o, { t: 'take', src: 'up' }).ok && C.apply(st, o, { t: 'drop', c: g }).ok && st.phase === 'show' && st.res.kind === 'bell' && st.res.order[0] === s3, '한 번씩 바꾼 뒤 벨 친 사람부터 공개');
  const m = Math.min(...st.res.sums);
  ok(st.res.lost.every((l, j) => (st.res.sums[j] === m ? l === (j === s3 ? 2 : 1) : l === 0)), '가장 낮은 사람 −1, 벨 친 사람이 가장 낮으면 −2');
  ok(C.view(st, o).res.hands === null && C.view(st, 'all').res.hands.length === 2, '공개 때 조합만 · 나머지 손패는 비공개');
  C.advance(st);
  ok(st.start === s3 && st.cur === s3 && st.set === 2, '다음 세트 선 = 벨 친 사람');
  // 포카드
  st.hands[st.cur] = [id(R_, 5), id(B_, 5), id(Y_, 5), id(G_, 5)];
  const rest = []; for (let c = 0; c < 40; c++) if (!st.hands.flat().includes(c)) rest.push(c);
  st.up = rest[0]; st.deck = rest.slice(1); st.disc = [];
  const f = st.cur, lv = st.lives.slice();
  ok(C.legal(st, f).some(a => a.t === 'four'), 'legal 에 포카드');
  ok(C.apply(st, f, { t: 'four' }).ok && st.res.kind === 'four' && st.lives[1 - f] === lv[1 - f] - 1 && st.lives[f] === lv[f], '포카드: 비교 없이 상대만 −1');
  ok(st.res.combo[f].length === 4 && st.res.combo[1 - f].length === 0 && C.view(st, -1).res.combo[1 - f].length === 0, '포카드: 선언한 4장만 공개 (상대 조합은 안 드러남)');
  // 모두 앞면을 가져와 그대로 버리기만 하면: 교환 120번에서 더미가 떨어진 것처럼 공개
  C.advance(st);
  for (let k = 0; k < 200 && st.phase !== 'show'; k++) { const s = st.cur, g = st.up; C.apply(st, s, { t: 'take', src: 'up' }); C.apply(st, s, { t: 'drop', c: g }); }
  ok(st.phase === 'show' && st.res.kind === 'deck' && st.res.turns === 120 && st.deck.length > 0, '교환 120번 한도 → 공개 (' + (st.res && st.res.turns) + ')');
}
// 2:2 포카드 → 상대 팀 둘 다 −1 · 함께 0 이면 마지막 벨 팀
{
  const st = C.init({ n: 4, seed: 9 }), f = st.cur;
  st.hands[f] = [id(R_, 9), id(B_, 9), id(Y_, 9), id(G_, 9)];
  const used = new Set(st.hands[f]); st.hands = st.hands.map((h, j) => (j === f ? h : []));
  const rest = []; for (let c = 0; c < 40; c++) if (!used.has(c)) rest.push(c);
  for (let j = 0; j < 4; j++) if (j !== f) st.hands[j] = rest.splice(0, 4);
  st.up = rest.shift(); st.deck = rest; st.disc = [];
  ok(C.apply(st, f, { t: 'four' }).ok, '2:2 포카드');
  ok(st.lives.every((l, j) => l === (st.teamOf[j] === st.teamOf[f] ? 3 : 2)), '상대 팀 두 사람 모두 −1 ' + st.lives);
  // 함께 0: 목숨을 1 로 두고 두 팀이 함께 가장 낮게
  C.advance(st);
  const b = st.cur; st.lives = [1, 1, 1, 1];
  const H = [[id(R_, 1), id(B_, 2), id(Y_, 3), id(G_, 4)], [id(R_, 2), id(B_, 3), id(Y_, 4), id(G_, 1)], [id(R_, 10), id(B_, 10), id(R_, 9), id(B_, 9)], [id(Y_, 10), id(G_, 10), id(Y_, 9), id(G_, 9)]];
  st.hands = H.map(h => h.slice());
  const used2 = new Set(H.flat()), rest2 = []; for (let c = 0; c < 40; c++) if (!used2.has(c)) rest2.push(c);
  // 0·1 이 4 로 함께 가장 낮게 — 앞면은 아무 데도 안 붙는 카드
  st.up = rest2.find(c => H.every(h => C.best(h.concat([c])).sum === C.best(h).sum)); st.deck = rest2.filter(c => c !== st.up); st.disc = [];
  ok(C.apply(st, b, { t: 'bell' }).ok, '벨');
  while (st.phase === 'turn' || st.phase === 'drop') { const s = st.cur, g = st.up; C.apply(st, s, { t: 'take', src: 'up' }); C.apply(st, s, { t: 'drop', c: g }); }
  // 공개 단계: 잘못된 조합은 거절, 상태 그대로
  const p0 = st.cur, h0 = st.hands[p0], snap = J(st);
  const outC = [...Array(40).keys()].find(c => !h0.includes(c));
  for (const a of [{ t: 'show' }, { t: 'show', cards: [] }, { t: 'show', cards: [outC] }, { t: 'show', cards: [h0[0], h0[0]] }, { t: 'show', cards: h0.slice() }, { t: 'drop', c: h0[0] }, { t: 'bell' }])
    ok(!C.apply(st, p0, a).ok, '공개 때 잘못된 행동 거절 ' + J(a));
  ok(!C.apply(st, (p0 + 1) % 4, { t: 'show', cards: [st.hands[(p0 + 1) % 4][0]] }).ok, '공개 차례 아닌 사람 거절');
  ok(J(st) === snap, '거절된 공개는 상태를 안 바꿈');
  ok(C.legal(st, p0).length > 0 && C.legal(st, p0).every(a => a.t === 'show' && C.validCombo(a.cards)), 'legal = 낼 수 있는 조합');
  for (let k = 0; k < 4; k++) { const s = st.cur; ok(C.apply(st, s, { t: 'show', cards: C.best(st.hands[s]).cards }).ok, '가장 큰 조합 공개'); }
  ok(st.rres && st.rres.why === 'bell' && st.rres.win[0] === st.teamOf[b], `두 팀이 함께 0 → 벨 친 ${b} 의 팀 승 (${J(st.rres)})`);
}

// 4) 보이는 것: 남 손패 · 더미 순서 · 뽑은 카드 — 'all' 만
{
  const st = C.init({ n: 4, seed: 31 });
  const s = st.cur; C.apply(st, s, { t: 'take', src: 'deck' });
  for (let j = 0; j < 4; j++) {
    const V = C.view(st, j);
    ok(V.hands === null && V.deck === null && V.hand.length === (j === s ? 5 : 4), `자리 ${j}: 남 손패 · 더미 안 보임`);
    ok(J(V.hand.slice().sort()) === J(st.hands[j].slice().sort()), `자리 ${j}: 내 손패는 보임`);
    ok(j === s ? V.got === st.got : V.got === -1, `자리 ${j}: 뽑은 카드는 뽑은 사람만`);
  }
  const W = C.view(st, -1); ok(W.hand === null && W.got === -1 && W.hands === null, '구경꾼: 손패 없음');
  const A = C.view(st, 'all'); ok(A.hands.length === 4 && A.deck.length === st.deck.length && A.got === st.got, "'all' 은 다 봄");
  ok(C.view(st, 0).pub === C.view(st, 2).pub && C.view(st, -1).pub === C.view(st, 'all').pub, '공개 지문 pub 는 누구에게나 같음');
}

// 5) AI 는 보이는 것만: 남의 모르는 손패 · 더미 순서만 바꾼 판에서 view 가 같고 → AI 수도 같음 · 💡 = 고급 AI · ai 는 view 를 안 바꿈
{
  let same = 0, tot = 0, recN = 0;
  for (let k = 0; k < 12; k++) {
    const n = [2, 3, 4][k % 3], st = C.init({ n, seed: 300 + k, cfg: { rounds: k % 2 ? 1 : 3 } }), r = lcg(k + 5);
    for (let steps = 0; steps < 3000 && !C.over(st); steps++) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const s = need[0];
      if (steps % 5 === 0) {
        const st2 = clone(st), rr = lcg(steps + 1);
        // 남 손패 중 '모두가 아는 카드' 가 아닌 것과 더미를 섞어 바꿈
        const free = []; for (let j = 0; j < n; j++) if (j !== s) st2.hands[j].forEach((c, i) => { if (!st2.known[j].includes(c) && !(st2.phase === 'drop' && st2.cur === j && st2.got === c) && !(st2.shown && st2.shown[j] && st2.shown[j].includes(c))) free.push([j, i]); });
        const bag = free.map(([j, i]) => st2.hands[j][i]).concat(st2.deck);
        for (let i = bag.length - 1; i > 0; i--) { const q = Math.floor(rr() * (i + 1)); [bag[i], bag[q]] = [bag[q], bag[i]]; }
        free.forEach(([j, i], x) => { st2.hands[j][i] = bag[x]; });
        st2.deck = bag.slice(free.length); st2.rs = (st.rs ^ 0x5bd1e995) >>> 0;
        const v1 = C.view(st, s), v2 = C.view(st2, s);
        ok(J(v1) === J(v2), `숨은 것만 바꾼 판에서 view 가 달라짐 (자리 ${s}, ${st.phase})`);
        const a1 = C.ai(v1, s, 'hard', lcg(9)), a2 = C.ai(v2, s, 'hard', lcg(9));
        tot++; if (J(a1) === J(a2)) same++;
        const rec = C.recommend(v1, s), ha = C.ai(v1, s, 'hard', C.recRnd(v1, s)); recN++;
        ok(J(rec.a) === J(ha), `추천 ≠ 고급 AI ${J(rec.a)} vs ${J(ha)}`);
        const vv = clone(v1); C.ai(vv, s, 'hard', lcg(3)); C.ai(vv, s, 'normal', lcg(3)); C.ai(vv, s, 'easy', lcg(3)); ok(J(vv) === J(v1), 'ai 가 view 를 바꿈');
      }
      const a = C.ai(C.view(st, s), s, ['easy', 'normal', 'hard'][(s + k) % 3], r);
      const res = C.apply(st, s, a);
      ok(res.ok, `AI 수가 규칙에 맞음 ${J(a)} ${res.err || ''}`);
      const cnt = st.hands.reduce((x, h) => x + h.length, 0) + st.deck.length + st.disc.length + (st.up >= 0 ? 1 : 0);
      if (cnt !== 40) { ok(false, '카드 40장 보존 ' + cnt); break; }
    }
    ok(C.over(st), `${n}명 AI 판이 끝남 (${k % 2 ? 1 : 3}라운드)`);
    const rk = C.ranks(st); ok(rk.some(x => x === 0) && rk.every(x => x >= 0 && x < n), 'ranks ' + rk);
  }
  ok(tot > 100 && same === tot, `AI 수가 숨은 정보로 바뀌지 않음 ${same}/${tot}`);
  ok(recN > 100, '추천 시험 횟수 ' + recN);
}

// 5b) view 는 판 상태와 객체를 나눠 쓰지 않음: V 를 깊이 다 바꿔도 판(st)은 그대로
{
  const scramble = o => { if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (o[i] && typeof o[i] === 'object') scramble(o[i]); else o[i] = 99; } o.push(99); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object') scramble(o[k]); else o[k] = 99; } };
  let checks = 0, bad = 0;
  for (const n of [2, 4]) {
    const st = C.init({ n, seed: 71 + n }), r = lcg(4);
    for (let g = 0; g < 600 && !C.over(st); g++) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const s = need[0], snap = J(st);
      for (const who of [s, -1, 'all']) { scramble(C.view(st, who)); checks++; if (J(st) !== snap) bad++; }
      C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r));
    }
  }
  ok(checks > 100 && bad === 0, `view 를 바꿔도 판 상태 그대로 (${checks - bad}/${checks})`);
}

// 6) 시간: 고급 AI 한 번 150 ms 안 · 추천(선생님) 200 ms 안
{
  let worst = 0, worstRec = 0;
  for (let k = 0; k < 6; k++) {
    const n = [2, 4, 3][k % 3], st = C.init({ n, seed: 900 + k }), r = lcg(k);
    for (let g = 0; g < 4000 && !C.over(st); g++) {
      const need = C.needs(st);
      if (!need.length) { C.advance(st); continue; }
      const s = need[0], V = C.view(st, s);
      // 한 번 재고, 100ms 를 넘으면 같은 자리를 한 번 더 재서 작은 값 (다른 일꾼 시험으로 CPU 가 100% 일 때 GC · 차례 밀림을 가려냄)
      const seedA = Math.floor(r() * 1e9);
      const timeAI = () => { const t = process.hrtime.bigint(); const x = C.ai(V, s, 'hard', lcg(seedA)); return [x, Number(process.hrtime.bigint() - t) / 1e6]; };
      let [a, ms] = timeAI(); if (ms > 100) ms = Math.min(ms, timeAI()[1]); worst = Math.max(worst, ms);
      let t;
      if (g % 7 === 0) { const tr = () => { t = process.hrtime.bigint(); C.recommend(V, s); return Number(process.hrtime.bigint() - t) / 1e6; }; let m2 = tr(); if (m2 > 120) m2 = Math.min(m2, tr()); worstRec = Math.max(worstRec, m2); }
      C.apply(st, s, a);
    }
  }
  ok(worst < 150, `고급 AI 최대 ${worst.toFixed(1)}ms (150 안)`);
  ok(worstRec < 200, `추천 최대 ${worstRec.toFixed(1)}ms (200 안)`);
  console.log(`  고급 AI 최대 ${worst.toFixed(0)}ms · 추천 최대 ${worstRec.toFixed(0)}ms`);
}

// 7) 결정성: 같은 씨앗 · 같은 수 → 같은 판
{
  const play = () => { const st = C.init({ n: 3, seed: 4242 }), r = lcg(1); while (!C.over(st)) { const need = C.needs(st); if (!need.length) { C.advance(st); continue; } C.apply(st, need[0], C.ai(C.view(st, need[0]), need[0], 'normal', r)); } return J(st); };
  ok(play() === play(), '같은 씨앗 같은 판');
  const st = C.init({ n: 2, seed: 1, cfg: { rounds: 1 } }); ok(st.R === 1 && st.need === 1, '1라운드 옵션');
}

console.log(`ringbell selftest: 통과 ${pass} · 실패 ${fail} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
process.exit(fail ? 1 : 0);

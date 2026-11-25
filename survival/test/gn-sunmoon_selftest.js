// 해 달 별 규칙 시험 (node survival/test/gn-sunmoon_selftest.js)
// 방송 기록(더 지니어스 룰 브레이커 2화 10라운드 칩 표)을 그대로 먹여 칩 값이 같은지 확인 + AI 무작위 판 + 숨은 정보 새지 않는지
'use strict';
const G = require('../games/gn-sunmoon/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };

// 2화 표: [정답(0해 1달 2별), 선 좌석, 선 베팅, 후 베팅, 끝난 뒤 칩(노홍철 = 좌석 0, 재경 = 좌석 1)]
const SEQ = [
  [0, 1, [1, 1, 0], [2, 1, 1], 6, 5],
  [0, 0, [2, 0, 0], [4, 0, 0], 10, 13],
  [0, 1, [3, 0, 0], [10, 0, 0], 30, 19],
  [2, 0, [0, 0, 9], [7, 8, 3], 48, 10],
  [2, 1, [0, 1, 4], [0, 0, 48], 144, 17],   // 표에서 재경 선 베팅 0/1/4 (합 5)
  [2, 0, [8, 0, 0], [4, 6, 6], 136, 19],
  [0, 1, [0, 2, 0], [16, 0, 0], 168, 17],
  [0, 0, [0, 0, 0], [0, 0, 15], 168, 2],
  [2, 1, [0, 1, 0], [0, 8, 0], 160, 1],
  [1, 0, [0, 0, 0], [0, 1, 0], 160, 3],
];

// 1) 방송 기록 재현 (정답 · 선 좌석 · 베팅을 고정해 칩 표와 맞는지)
{
  const st = G.init({ n: 2, seed: 1, cfg: { rounds: 10, first: 1, marks: SEQ.map(x => x[0]) } });
  let allOk = true;
  SEQ.forEach((row, i) => {
    const [mk, f, fb, sb, c0, c1] = row;
    if (st.first !== f) { allOk = false; console.error(`선 좌석 ${i + 1}R`, st.first, f); }
    if (G.needs(st)[0] !== f) allOk = false;
    const r1 = G.apply(st, f, { t: 'bet', b: fb });
    const r2 = G.apply(st, 1 - f, { t: 'bet', b: sb });
    if (!r1.ok || !r2.ok) { allOk = false; console.error(`${i + 1}R 거절`, r1, r2); }
    if (st.chips[0] !== c0 || st.chips[1] !== c1) { allOk = false; console.error(`${i + 1}R 칩 ${st.chips} 기대 ${c0},${c1}`); }
    if (i < SEQ.length - 1) { ok(G.auto(st) > 0, '공개 뒤 자동 넘김'); G.advance(st); }
  });
  ok(allOk, '2화 10라운드 칩 기록이 규칙과 같다');
  ok(G.over(st) && st.chips[0] === 160 && st.chips[1] === 3, '최종 160 대 3');
  ok(G.ranks(st)[0] === 0 && G.ranks(st)[1] === 1, '노홍철 승');
}

// 2) 규칙 거절
{
  const st = G.init({ n: 2, seed: 2, cfg: { first: 0, marks: [0] } });
  ok(!G.apply(st, 1, { t: 'bet', b: [0, 0, 0] }).ok, '내 차례가 아니면 거절');
  ok(!G.apply(st, 0, { t: 'bet', b: [3, 0, 0] }).ok, '선은 상대 칩의 절반(2)까지');
  ok(!G.apply(st, 0, { t: 'bet', b: [1, 1, 1] }).ok, '합 3 > 2 거절');
  ok(!G.apply(st, 0, { t: 'bet', b: [-1, 1, 0] }).ok, '음수 거절');
  ok(!G.apply(st, 0, { t: 'bet', b: [0.5, 0, 0] }).ok, '소수 거절');
  ok(G.apply(st, 0, { t: 'bet', b: [2, 0, 0] }).ok, '선 2칩 OK');
  ok(!G.apply(st, 1, { t: 'bet', b: [3, 0, 0] }).ok, '후는 선의 2배(4) 이상 — 3 거절');
  ok(!G.apply(st, 1, { t: 'bet', b: [5, 0, 0] }).ok, '가진 칩(4)보다 많이 못 걸음');
  ok(G.apply(st, 1, { t: 'bet', b: [0, 4, 0] }).ok, '후 4칩 OK (올인)');
  ok(st.phase === 'end' || st.phase === 'reveal', '두 사람 다 걸면 공개');
  ok(st.chips[0] === 4 - 2 + 6 && st.chips[1] === 0, '해 맞힘 +6, 달 틀림 올인 → 0칩 = 즉시 끝');
  ok(G.over(st), '칩이 0이 되면 즉시 탈락(끝)');
}
// 후가 칩이 모자라면 올인으로
{
  const st = G.init({ n: 2, seed: 3, cfg: { first: 0, marks: [0, 0, 0], rounds: 3 } });
  st.chips = [10, 3];
  ok(G.limitFirst(st) === 1, '선 상한 = floor(3/2) = 1');
  ok(G.apply(st, 0, { t: 'bet', b: [1, 0, 0] }).ok, '선 1');
  ok(G.rangeSecond(st).min === 2, '후 최소 2배 = 2 (칩 3)');
  const st2 = G.init({ n: 2, seed: 3, cfg: { first: 0, marks: [0, 0, 0], rounds: 3 } });
  st2.chips = [10, 3]; st2.first = 0;
  G.apply(st2, 0, { t: 'bet', b: [1, 0, 0] });
  st2.chips[1] = 1;
  ok(G.rangeSecond(st2).min === 1, '칩이 2배에 모자라면 올인(1)이 최소');
}

// 3) 숨은 정보
{
  const st = G.init({ n: 2, seed: 7, cfg: { first: 0, marks: [1], hints: [[1, 2]] } });
  const v0 = G.view(st, 0), v1 = G.view(st, 1), va = G.view(st, 'all');
  ok(v0.hint[0] === 1 && v0.hint[1] === -2, '내 귀띔만 보임 (0)');
  ok(v1.hint[1] === 2 && v1.hint[0] === -2, '내 귀띔만 보임 (1)');
  ok(va.hint[0] === 1 && va.hint[1] === 2, '다 보기는 둘 다');
  ok(v0.mark === -1 && v1.mark === -1, '공개 전 정답은 안 보임');
  ok(v0.pub === v1.pub && v1.pub === va.pub, '공개 지문은 모두 같다');
  G.apply(st, 0, { t: 'bet', b: [0, 2, 0] });
  const w1 = G.view(st, 1);
  ok(w1.bets[0] && w1.bets[0][1] === 2 && w1.bets[1] === null, '후는 선 베팅을 칸별로 봄');
  ok(G.view(st, 0).pub === w1.pub, '베팅 뒤에도 지문 같음');
}

// 4) AI 끼리 많이 돌려서 끝까지 간다 · 합법 수만 둔다 · 칩 식이 맞다
for (const tier of ['easy', 'normal', 'hard']) {
  let games = 0, wins = [0, 0], draws = 0, bad = 0;
  for (let s = 1; s <= 120; s++) {
    const st = G.init({ n: 2, seed: s * 7919, cfg: { rounds: s % 2 ? 10 : 8 } });
    let guard = 0, rr = (() => { let a = s; return () => { a = (a * 1103515245 + 12345) >>> 0; return (a >>> 8) / 16777216; }; })();
    while (!G.over(st) && guard++ < 200) {
      const need = G.needs(st);
      if (!need.length) { G.advance(st); continue; }
      const seat = need[0], V = G.view(st, seat);
      const a = G.ai(V, seat, seat ? tier : 'normal', rr);
      const r = G.apply(st, seat, a);
      if (!r.ok) { bad++; const L = G.legal(st, seat); G.apply(st, seat, L[0]); }
    }
    ok(G.over(st), `${tier} ${s}: 끝까지 감`);
    games++;
    const R = G.ranks(st); if (R[0] === R[1]) draws++; else wins[R[0] === 0 ? 0 : 1]++;
  }
  ok(bad === 0, `${tier}: AI 가 거절당한 수 ${bad}`);
  console.log(`  ${tier}(좌석1) 대 중급(좌석0): 좌석0 ${wins[0]} · 좌석1 ${wins[1]} · 무 ${draws} / ${games}`);
}

// 5) 선생님 글이 숨은 정보를 새지 않는다 (상대 귀띔만 바꾼 두 장면에서 글이 같아야 함)
{
  const mk = oh => { const st = G.init({ n: 2, seed: 9, cfg: { first: 1, marks: [0, 1], hints: [[0, oh]] } }); G.apply(st, 1, { t: 'bet', b: [0, 2, 0] }); return st; };
  const a = G.coach(G.view(mk(1), 0), 0, -1, ['나', '상대']), b = G.coach(G.view(mk(2), 0), 0, -1, ['나', '상대']);
  ok(JSON.stringify(a) === JSON.stringify(b), '상대 귀띔이 달라도 선생님 글은 같다');
  ok(a.opp && a.mine && a.rec, '선생님 3줄이 있다');
}

console.log(`gn-sunmoon selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

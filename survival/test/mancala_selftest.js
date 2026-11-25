// 균형의 만칼라 규칙 시험 (node survival/test/mancala_selftest.js [--quick])
'use strict';
const C = require('../games/mancala/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { DEV, ANG, NC } = C;
// 장면: 말 놓기를 건너뛰고 칸 · 점수를 직접 정함 (order = 0,1,2…, 차례 = ti)
function scene(n, cells, sc, ti, cfg) {
  const st = C.init({ n, seed: 5, cfg });
  st.order = Array.from({ length: n }, (_, i) => i); st.phase = 'move'; st.pi = n * 4; st.ti = ti || 0;
  st.cells = Array.from({ length: NC }, (_, i) => (cells[i] || []).slice());
  st.sc = sc.map(x => x.slice());
  return st;
}
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 3000) {
    for (const s of C.needs(st)) {
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 게임판 (방송 번호: 위 악마 · 오른쪽 01~06 · 아래 천사 · 왼쪽 07~12, 시계 방향)
{
  const lab = Array.from({ length: NC }, (_, i) => C.labelOf(i));
  ok(lab.join() === '악마,01,02,03,04,05,06,천사,07,08,09,10,11,12', '칸 이름 ' + lab.join());
  const col = Array.from({ length: NC }, (_, i) => C.colOf(i));
  ok(col.join() === '-1,0,1,2,0,1,2,-2,0,1,2,0,1,2', '칸 색 ' + col.join());
  // 나무위키 그림: 01 빨강 · 02 파랑 · 06 초록 · 07 빨강 · 11 파랑 · 12 초록
  ok(C.colOf(1) === 0 && C.colOf(2) === 1 && C.colOf(6) === 2 && C.colOf(8) === 0 && C.colOf(12) === 1 && C.colOf(13) === 2, '방송 그림과 같은 색');
}
// 2) 최종 점수 · 동률 색
{
  ok(C.fin([13, 11, 20]) === 2, '13/11/20 → 2 (방송 예)');
  ok(C.fin([15, 15, 15]) === 15 && C.fin([30, 0, 0]) === -30 && C.fin([0, 0, 0]) === 0, '최종 점수 다른 예');
  ok(J(C.tiedCols([3, 3, 5], -2)) === '[0,1]' && J(C.tiedCols([3, 3, 5], -1)) === '[2]' && J(C.tiedCols([4, 4, 4], -1)) === '[0,1,2]', '천사 = 가장 적은 색 · 악마 = 가장 많은 색 (동률 여럿)');
}
// 3) 시작 · 옵션
{
  const st = C.init({ n: 7, seed: 11 });
  ok(st.n === 7 && st.phase === 'place' && st.maxT === 84 && st.order.length === 7 && new Set(st.order).size === 7, '7명 시작 · 12바퀴');
  ok(st.order.every((s, i) => s === (st.order[0] + i) % 7), '순서 = 한 줄로 돌기');
  ok(C.init({ n: 4, seed: 1, cfg: { laps: 6 } }).maxT === 24 && C.init({ n: 4, seed: 1, cfg: { laps: 99 } }).maxT === 48, '바퀴 옵션 6 · 엉뚱한 값은 12');
  ok(C.init({ n: 9, seed: 1 }).n === 7 && C.init({ n: 1, seed: 1 }).n === 2, '인원 2~7');
  ok(C.view(C.init({ n: 5, seed: 3 }), 0).pub === C.view(C.init({ n: 5, seed: 3 }), 0).pub, '같은 씨앗 같은 시작');
}
// 4) 말 놓기
{
  const st = C.init({ n: 3, seed: 2 }), o = st.order;
  ok(J(C.needs(st)) === J([o[0]]), '첫 차례 = 순서 1번');
  ok(!C.apply(st, o[1], { t: 'place', c: 3 }).ok, '차례 아닌 사람 막음');
  const before = J(st);
  ok(!C.apply(st, o[0], { t: 'place', c: 99 }).ok && !C.apply(st, o[0], { t: 'move', from: 1, seq: [] }).ok && J(st) === before, '없는 칸 · 다른 행동 막고 그대로');
  ok(C.apply(st, o[0], { t: 'place', c: 3 }).ok && C.apply(st, o[1], { t: 'place', c: 3 }).ok, '한 칸에 2개');
  ok(!C.apply(st, o[2], { t: 'place', c: 3 }).ok, '3개째 막음');
  ok(C.apply(st, o[2], { t: 'place', c: DEV }).ok, '악마칸에도 놓음');
  let g = 0; while (st.phase === 'place' && g++ < 20) { const s = C.needs(st)[0]; const L = C.legal(st, s); ok(L.every(a => st.cells[a.c].length < 2), '놓기 후보는 2개 미만 칸'); C.apply(st, s, L[g % L.length]); }
  ok(st.phase === 'move' && st.pi === 12 && st.cells.every(c => c.length <= 2) && [0, 1, 2].every(s => st.cells.flat().filter(x => x === s).length === 4), '모두 4개씩 놓으면 옮기기 · 칸마다 2개까지');
  ok(J(C.needs(st)) === J([o[0]]), '옮기기도 순서 1번부터');
}
// 5) 옮기기 · 점수 (방송 규칙)
{
  // 05칸 [가(1), 나(0)] → 06(초록) · 천사. 천사에 이미 2개 → 마지막 말 주인 나: 가장 적은 색(초록 1) +3
  const st = scene(4, { 5: [1, 0], [ANG]: [2, 3] }, [[5, 5, 1], [0, 0, 0], [0, 0, 0], [0, 0, 0]], 0);
  const P = C.preview(st.cells, st.sc, 5, [1, 0]);
  ok(P.land === ANG && P.owner === 0 && P.pts === 3 && P.col === -2 && J(P.opts) === '[2]', '미리 보기 천사 ' + J(P));
  ok(C.apply(st, 0, { t: 'move', from: 5, seq: [1, 0] }).ok, '옮기기');
  ok(J(st.cells[5]) === '[]' && J(st.cells[6]) === '[1]' && J(st.cells[ANG]) === '[2,3,0]', '칸마다 1개씩 · 시계 방향');
  ok(J(st.sc[0]) === '[5,5,4]' && C.fin(st.sc[0]) === 3, '천사칸 = 가장 적은 색 +3');
  ok(J(C.needs(st)) === '[1]' && st.turn === 1 && st.last.land === ANG && st.last.pts === 3, '다음 차례 · 기록');
  // 같은 칸 순서를 바꾸면 남이 점수
  const s2 = scene(4, { 5: [1, 0], [ANG]: [2, 3] }, [[5, 5, 1], [2, 0, 9], [0, 0, 0], [0, 0, 0]], 0);
  C.apply(s2, 0, { t: 'move', from: 5, seq: [0, 1] });
  ok(J(s2.sc[1]) === '[2,3,9]' && J(s2.sc[0]) === '[5,5,1]', '마지막 말 = 가 → 가의 가장 적은 색(파랑) +3');
  // 보통 칸: 그 칸 색, 자기 말 포함
  const s3 = scene(3, { 1: [0], 2: [1, 2] }, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 0);
  C.apply(s3, 0, { t: 'move', from: 1, seq: [0] });
  ok(J(s3.sc[0]) === '[0,3,0]', '02칸(파랑) 말 3개 → 파랑 +3');
  // 악마칸: 가장 많은 색
  const s4 = scene(3, { 12: [1, 0] }, [[0, 0, 0], [1, 7, 2], [0, 0, 0]], 0);
  C.apply(s4, 0, { t: 'move', from: 12, seq: [0, 1] });
  ok(J(s4.sc[1]) === '[1,8,2]' && s4.last.kind === -1, '11칸 말 2개 → 악마칸 · 가의 가장 많은 색(파랑) +1');
  // 동률: 옮긴 사람이 색을 고름 (남의 점수여도)
  const s5 = scene(3, { 6: [1] }, [[0, 0, 0], [4, 4, 9], [0, 0, 0]], 1);
  ok(!C.apply(s5, 1, { t: 'move', from: 6, seq: [1], col: 2 }).ok, '동률 아닌 색은 못 고름');
  ok(C.apply(s5, 1, { t: 'move', from: 6, seq: [1], col: 1 }).ok && J(s5.sc[1]) === '[4,5,9]', '천사 동률 → 파랑 고름');
  const s6 = scene(3, { 12: [0, 2] }, [[0, 0, 0], [0, 0, 0], [3, 3, 3]], 0);
  C.apply(s6, 0, { t: 'move', from: 12, seq: [0, 2] });
  ok(J(s6.sc[2]) === '[4,3,3]' && s6.last.land === DEV && s6.last.tie, '악마 동률 · 색을 안 고르면 첫 색');
  const s7 = scene(3, { 12: [2, 0] }, [[0, 0, 0], [0, 0, 0], [3, 3, 3]], 0);
  ok(C.apply(s7, 0, { t: 'move', from: 12, seq: [0, 2], col: 2 }).ok && J(s7.sc[2]) === '[3,3,4]', '남의 점수 동률도 옮긴 사람이 고름');
  // 한 바퀴 넘게: 15개 → 출발 다음 칸에 2개 + 원래 말
  const big = Array(15).fill(0); big[14] = 1;
  const s8 = scene(2, { 3: big, 4: [1] }, [[0, 0, 0], [0, 0, 0]], 0);
  const P8 = C.preview(s8.cells, s8.sc, 3, big);
  ok(P8.land === 4 && P8.pts === 3 && P8.owner === 1, '15개 = 한 바퀴 넘어 04칸 (2개 놓임 + 원래 1) ' + J(P8));
  ok(C.apply(s8, 0, { t: 'move', from: 3, seq: big }).ok && s8.cells[3].length === 1 && s8.cells[4].length === 3 && s8.cells.flat().length === 16, '한 바퀴 넘기 칸 수');
  // 14개 = 출발 칸에 도착 (1개)
  const b14 = Array(14).fill(0);
  ok(C.preview(scene(2, { 2: b14 }, [[0, 0, 0], [0, 0, 0]]).cells, [[0, 0, 0], [0, 0, 0]], 2, b14).pts === 1, '14개 → 출발 칸 1개');
}
// 6) 옮기기 막기
{
  const st = scene(3, { 2: [0, 1], 4: [1] }, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 0);
  const before = J(st);
  ok(!C.apply(st, 0, { t: 'move', from: 4, seq: [1] }).ok, '내 말 없는 칸 막음');
  ok(!C.apply(st, 0, { t: 'move', from: 2, seq: [0] }).ok && !C.apply(st, 0, { t: 'move', from: 2, seq: [0, 0] }).ok && !C.apply(st, 0, { t: 'move', from: 2, seq: [0, 1, 1] }).ok, '전부 · 한 번씩');
  ok(!C.apply(st, 1, { t: 'move', from: 2, seq: [0, 1] }).ok && !C.apply(st, 0, { t: 'place', c: 3 }).ok, '차례 · 단계');
  ok(J(st) === before, '막힌 행동은 상태 그대로');
  const L = C.legal(st, 0);
  ok(L.length === 2 && L.every(a => a.from === 2), '후보 = 02칸의 놓는 순서 2가지 ' + J(L));
  ok(C.arrangements([0, 1, 1], 24).length === 3 && C.arrangements([0, 1, 2, 3, 4], 24).length === 24, '놓는 순서 (같은 주인은 같음 · 24개까지)');
}
// 7) 끝 · 순위
{
  const st = scene(3, { 1: [0] }, [[0, 28, 5], [0, 0, 0], [0, 0, 0]], 0);
  st.cells[2] = [2];
  C.apply(st, 0, { t: 'move', from: 1, seq: [0] });
  ok(st.over && st.end === 'goal' && st.res.by === 0 && J(st.res.fin) === J([-30, 0, 0]), '한 색 30 → 바로 끝 ' + J(st.res));
  ok(J(C.ranks(st)) === '[2,0,0]' && C.needs(st).length === 0 && !C.apply(st, 1, { t: 'move', from: 2, seq: [2] }).ok, '같은 점수는 같은 순위 · 끝나면 막음');
  const s2 = scene(2, { 1: [0], 9: [1] }, [[1, 1, 1], [0, 0, 0]], 0, { laps: 6 });
  s2.turn = 11;
  C.apply(s2, 0, { t: 'move', from: 1, seq: [0] });
  ok(s2.over && s2.end === 'laps' && s2.turn === 12, '6바퀴(2명 × 6 = 12차례) 끝');
  const V = C.view(s2, 0);
  ok(V.over && V.res.why === 'laps' && V.ranks.length === 2 && V.needs.length === 0, '끝 보기');
}
// 8) 보기: 숨긴 정보 없음 · 안 바뀜
{
  const st = playAI(4, ['easy', 'easy', 'easy'], {}, (s, seat, V, V0) => {
    ok(J(V) === V0, '보기 자체 그대로');
    ok(C.view(s, 0).pub === C.view(s, 1).pub && C.view(s, 1).pub === C.view(s, -1).pub, '자리마다 같은 pub');
  });
  ok(st.over, 'easy 3명 끝');
  const V = C.view(st, 'all');
  ok(V.seat === 'all' && V.mine === 0 && V.hist.length === st.turn, "'all' 보기");
}
// 9) AI: 모든 수 합법 · 결정적 · 고급은 rnd 무시 · 추천 = 고급
{
  const seeds = QUICK ? [1, 2] : [1, 2, 3, 4];
  for (const sd of seeds) {
    const tiers = ['hard', 'normal', 'easy', 'hard', 'normal'].slice(0, 3 + (sd % 3));
    let chk = 0;
    const st = playAI(sd, tiers, {}, (s, seat, V, V0, a) => {
      if (chk++ % 9) return;
      const L = C.legal(s, seat).map(J);
      ok(L.includes(J(a)) || (a.t === 'move' && C.apply(JSON.parse(J(s)), seat, a).ok), `AI 수가 합법 ${J(a)}`);
      if (tiers[seat] === 'hard') {
        const a2 = C.ai(V, seat, 'hard', mul(999)), R = C.recommend(V, seat);
        ok(J(a2) === J(a), '고급은 rnd 무시');
        ok(R && J(R.a) === J(a), '추천 = 고급 AI 수 ' + J(R && R.a) + ' vs ' + J(a));
        if (V.phase === 'move') { const Jd = C.judge(V, seat, a, R.a); ok(Jd && Math.abs(Jd.my.v - Jd.best.v) < 1e-9, '같은 수 판정 같음'); }
      }
    });
    const st2 = playAI(sd, tiers, {});
    ok(J(st.sc) === J(st2.sc) && st.turn === st2.turn, `씨앗 ${sd} 결정적`);
    ok(st.turn > 0 && st.turn <= st.maxT, '차례 수');
  }
}
// 10) 실력: 고급 vs 쉬움 (짧게)
{
  const N = QUICK ? 8 : 20, n = 4; let beat = 0;
  for (let g = 0; g < N; g++) {
    const h = g % n, tiers = Array.from({ length: n }, (_, s) => (s === h ? 'hard' : 'easy'));
    const st = playAI(300 + g, tiers, {}), Rk = C.ranks(st);
    let p = 0; for (let j = 0; j < n; j++) if (j !== h) p += Rk[j] > Rk[h] ? 1 : Rk[j] === Rk[h] ? 0.5 : 0;
    beat += p / (n - 1);
  }
  console.log(`· 고급 vs 쉬움 4명 이긴 몫 ${(beat / N * 100).toFixed(0)}% (${N}판)`);
  ok(beat / N > 0.6, '고급이 쉬움을 이김 ' + (beat / N).toFixed(2));
}
console.log(`mancala selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// 수식 피라미드 규칙 시험 (node survival/test/eqpyramid_selftest.js [--quick])
'use strict';
const C = require('../games/eqpyramid/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick') || process.argv.includes('quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function playAI(seed, tiers, cfg, check) {
  const n = tiers.length, st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 6000) {
    const nd = C.needs(st);
    if (!nd.length) { if (C.auto(st) == null) throw new Error('멈춤 ' + st.phase); C.advance(st); continue; }
    for (const s of nd) {
      const V = C.view(st, s), V0 = J(V), a = C.ai(V, s, tiers[s], r);
      if (check) check(st, s, V, V0, a);
      const res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}

// 1) 방송 10라운드: 우리 해석으로 찾은 정답 = 방송 정답 목록 (나무위키 진행표)
{
  const WANT = ['ACH BJD CEI DBC IGC JHC', 'FGI GDC', 'AJD JEH JHA', 'BCJ BDF DIA JAI', 'BEC DHF ECF', 'ABE IBG', 'ABI ACF CIH DCE DEA EBG GBF IBE', 'ABC ECI FHC GHJ', 'FAE', 'DFB EFD FCA IEG IGC JEF'];
  C.TV.forEach((b, i) => ok(C.solve(b.cells, b.target).join(' ') === WANT[i], `방송 ${i + 1}라운드 정답 ${C.solve(b.cells, b.target).join(' ')}`));
  const c1 = C.TV[0].cells;
  ok(J(C.evalK(c1, 'ACH')) === '[10,1]' && C.exprOf(c1, 'ACH') === '7 + 9 ÷ 3', 'ACH = 7 + 9 ÷ 3 = 10 (첫 칸 부호 무시 · 나눗셈 먼저)');
  ok(C.valTxt(C.evalK(c1, 'JBD')) === '-22/5', 'JBD = 3 ÷ 5 − 5 = −22/5 (방송 오답)');
  ok(C.valTxt(C.evalK(C.TV[3].cells, 'DIB')) !== '11', '4라운드 DIB 오답');
  ok(C.calc2(9, '÷', 3) === '3' && C.calc2(3, '÷', 5) === '3/5', '두 칸 계산 글');
}
// 2) 새 문제: 정답 2~8개 · 같은 씨앗 같은 판
{
  const cnt = {};
  for (let s = 1; s <= (QUICK ? 15 : 40); s++) for (let r = 1; r <= 10; r++) { const b = C.makeBoard(s, r), k = C.solve(b.cells, b.target).length; cnt[k] = (cnt[k] || 0) + 1; ok(b.cells.length === 10 && b.target >= 1 && b.target <= 20, '판 모양'); }
  ok(Object.keys(cnt).every(k => +k >= 2 && +k <= 8), '새 문제 정답 2~8개 ' + J(cnt));
  ok(J(C.makeBoard(7, 3)) === J(C.makeBoard(7, 3)) && J(C.makeBoard(7, 3)) !== J(C.makeBoard(7, 4)), '씨앗 결정적');
}
// 3) 시작 · 옵션
{
  const st = C.init({ n: 2, seed: 5 });
  ok(st.n === 2 && st.R === 10 && st.round === 1 && st.phase === 'play' && st.ans.length >= 2, '2명 · 10라운드 시작');
  ok(C.init({ n: 3, seed: 1, cfg: { rounds: 5 } }).R === 5 && C.init({ n: 3, seed: 1, cfg: { rounds: 7 } }).R === 10, '라운드 옵션');
  const tv = C.init({ n: 2, seed: 1, cfg: { src: 'tv' } });
  ok(tv.board.target === 10 && tv.ans.join(' ') === 'ACH BJD CEI DBC IGC JHC', '방송 판 옵션 = 1라운드');
  ok(C.init({ n: 9, seed: 1 }).n === 4 && C.init({ n: 1, seed: 1 }).n === 2, '인원 2~4');
  const V = C.view(st, 0);
  ok(V.ans === null && !('ans' in V && V.ans), '라운드 중 정답 목록 숨김');
  ok(C.view(st, 0).pub === C.view(st, 1).pub && C.view(st, 1).pub === C.view(st, -1).pub, '자리마다 같은 pub');
}
// 4) 선언 · 점수
{
  const st = C.init({ n: 2, seed: 1, cfg: { src: 'tv' } }), a = st.turn, b = 1 - a;
  ok(!C.apply(st, b, { t: 'say', k: 'ACH' }).ok, '차례 아닌 사람 막음');
  const before = J(st);
  ok(!C.apply(st, a, { t: 'say', k: 'AAB' }).ok && !C.apply(st, a, { t: 'say', k: 'AK' }).ok && !C.apply(st, a, { t: 'bet' }).ok && J(st) === before, '같은 칸 · 없는 칸 · 다른 행동 막고 그대로');
  C.apply(st, a, { t: 'say', k: 'ACH' });
  ok(st.sc[a] === 1 && st.found.length === 1 && st.turn === b, '정답 +1 · 차례 넘김');
  C.apply(st, b, { t: 'say', k: 'ACH' });
  ok(st.sc[b] === -1 && st.tries[1].res === 'dup', '이미 나온 답 −1');
  C.apply(st, a, { t: 'say', k: 'JBD' });
  ok(st.sc[a] === 0 && st.tries[2].res === 'wrong' && st.tries[2].v === '-22/5', '오답 −1 · 값 기록');
  C.apply(st, b, { t: 'pass' }); C.apply(st, a, { t: 'pass' });
  ok(st.phase === 'rend' && st.last.why === 'pass' && st.last.ans.length === 6 && st.last.found.length === 1, '모두 넘기면 라운드 끝 · 정답 공개');
  ok(C.needs(st).length === 0 && C.auto(st) > 0, '라운드 끝은 기다렸다 넘어감');
  const V = C.view(st, 0);
  ok(V.ans && V.ans.length === 6, '라운드 끝 보기에 정답');
  C.advance(st);
  ok(st.round === 2 && st.phase === 'play' && st.turn === (st.first + 1) % 2 && st.found.length === 0, '다음 라운드 · 첫 차례 돌아감');
  // 넘김 다음 답하면 넘김 줄 다시 0
  const s2 = C.init({ n: 3, seed: 1, cfg: { src: 'tv' } }), o = [s2.turn, (s2.turn + 1) % 3, (s2.turn + 2) % 3];
  C.apply(s2, o[0], { t: 'pass' }); C.apply(s2, o[1], { t: 'pass' }); C.apply(s2, o[2], { t: 'say', k: 'BJD' }); C.apply(s2, o[0], { t: 'pass' }); C.apply(s2, o[1], { t: 'pass' });
  ok(s2.phase === 'play', '답이 나오면 넘김 줄이 끊김');
  C.apply(s2, o[2], { t: 'pass' });
  ok(s2.phase === 'rend', '3명 이어서 넘기면 끝');
  // 정답을 다 찾으면 끝
  const s3 = C.init({ n: 2, seed: 1, cfg: { src: 'tv' } });
  C.TV[0] && ['ACH', 'BJD', 'CEI', 'DBC', 'IGC', 'JHC'].forEach(k => C.apply(s3, s3.turn, { t: 'say', k }));
  ok(s3.phase === 'rend' && s3.last.why === 'all' && s3.sc[0] === 3 && s3.sc[1] === 3, '정답을 다 찾으면 라운드 끝 ' + J(s3.last && s3.last.why));
  ok(C.view(C.init({ n: 2, seed: 1 }), 0).cap === C.view(C.init({ n: 2, seed: 2 }), 0).cap, '차례 상한은 정답 수와 무관 (정답 수가 안 샘)');
}
// 5) 정답 다 찾기 · 끝 · 순위
{
  const st = C.init({ n: 2, seed: 3, cfg: { src: 'tv', rounds: 5 } });
  let g = 0;
  while (!st.over && g++ < 500) {
    const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; }
    const s = nd[0], rem = st.ans.filter(k => !st.found.some(x => x.k === k));
    C.apply(st, s, rem.length ? { t: 'say', k: rem[0] } : { t: 'pass' });
  }
  ok(st.over && st.round === 5 && st.hist.length === 5 && st.hist.every(h => h.found.length === h.nAns), '5라운드 모두 찾고 끝');
  const tot = C.TV.slice(0, 5).reduce((a, b) => a + C.solve(b.cells, b.target).length, 0);
  ok(st.sc[0] + st.sc[1] === tot, '점수 합 = 정답 수 ' + st.sc.join());
  const R = C.ranks(st);
  ok(st.sc[0] === st.sc[1] ? R[0] === 0 && R[1] === 0 : R.includes(0) && R.includes(1), '순위 (같으면 공동)');
  ok(!C.apply(st, 0, { t: 'pass' }).ok && C.needs(st).length === 0, '끝나면 막음');
}
// 6) 보기 · AI · 추천 · 결정적
const hardMiss = []; let hardSay = 0;
{
  const seeds = QUICK ? [1, 2] : [1, 2, 3, 4];
  for (const sd of seeds) {
    const tiers = ['hard', 'normal', 'easy', 'hard'].slice(0, 2 + (sd % 3));
    let chk = 0;
    const st = playAI(sd, tiers, sd % 2 ? { src: 'tv' } : {}, (s, seat, V, V0, a) => {
      ok(J(V) === V0, '보기 자체 그대로');
      if (chk++ % 5) return;
      ok(V.ans === null, '라운드 중 정답 숨김');
      if (tiers[seat] === 'hard') {
        const R = C.recommend(V, seat);
        ok(J(C.ai(V, seat, 'hard', mul(9))) === J(a), '고급 rnd 무시');
        ok(R && J(R.a) === J(R.rows.length ? { t: 'say', k: R.rows[0].k } : { t: 'pass' }), '추천 = 남은 정답 중 가장 쉬운 것');
        ok(a.t === 'pass' || C.solve(V.cells, V.target).includes(a.k) && !V.found.some(x => x.k === a.k), '고급은 헛답 없음 (아직 안 나온 정답 또는 넘김)');
        if (a.t === 'pass') hardMiss.push(R.rows.length); else hardSay++;
        const Jd = C.judge(V, seat, { t: 'pass' }, a); ok(Jd && Jd.my === 0 && Jd.best === (a.t === 'pass' ? 0 : 1), '복기 판정');
      }
    });
    const st2 = playAI(sd, tiers, sd % 2 ? { src: 'tv' } : {});
    ok(J(st.sc) === J(st2.sc) && st.hist.length === st.R, `씨앗 ${sd} 결정적 · ${st.R}라운드`);
  }
}
// 6b) 고급도 완벽한 풀이기는 아님: 어려운 식일수록 덜 보임 · 쉬운 식은 거의 다 봄
{
  const sh = d => C.seeOf(C.PROF.hard, d);
  ok(sh(1) >= 0.95 && sh(1.6) > 0.85 && sh(1.6) < 0.95 && sh(4) < 0.65 && sh(2) > sh(3), '고급 보는 확률 ' + [1, 1.6, 2, 3, 4].map(d => sh(d).toFixed(2)).join(' '));
  for (const t of ['easy', 'normal']) ok(C.seeOf(C.PROF[t], 2) < sh(2), t + ' 은 고급보다 덜 봄');
  // 여러 판에서: 남은 답이 있는데 고급이 넘긴 적이 있음 (못 봄) · 그래도 대부분은 맞힘
  let miss = 0, tot = 0;
  for (let sd = 30; sd < 30 + (QUICK ? 4 : 10); sd++) {
    let st = C.init({ n: 2, seed: sd });
    for (let g = 0; g < 400 && !C.over(st); g++) {
      const nd = C.needs(st);
      if (!nd.length) { C.advance(st); continue; }
      const s = nd[0], V = C.view(st, s), a = C.ai(V, s, 'hard'), rem = C.remainOf(V).length;
      if (rem) { tot++; if (a.t === 'pass') miss++; }
      C.apply(st, s, a);
    }
  }
  console.log(`· 고급이 남은 답을 놓친 차례 ${miss}/${tot}`);
  ok(miss > 0 && miss / tot < 0.35, '고급도 가끔 놓침 ' + miss + '/' + tot);
}
// 7) 실력: 고급 vs 쉬움 · 보통 (2명)
{
  const N = QUICK ? 20 : 60;
  for (const [A, B, need] of [['hard', 'easy', 0.9], ['hard', 'normal', 0.75], ['normal', 'easy', 0.6]]) {
    let w = 0;
    for (let g = 0; g < N; g++) { const h = g % 2, T = h ? [B, A] : [A, B]; const st = playAI(500 + g, T, {}); w += st.sc[h] > st.sc[1 - h] ? 1 : st.sc[h] === st.sc[1 - h] ? 0.5 : 0; }
    console.log(`· ${A} vs ${B} 2명 승률 ${(w / N * 100).toFixed(0)}% (${N}판)`);
    ok(w / N >= need, `${A} 이 ${B} 를 이김 ${(w / N).toFixed(2)}`);
  }
}
console.log(`eqpyramid selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

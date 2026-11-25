// 오름차순 규칙 시험 (node survival/test/ascend_selftest.js)
'use strict';
const A = require('../games/ascend/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const lcg = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const clone = o => JSON.parse(JSON.stringify(o));
const J = x => JSON.stringify(x);

// 1) 가장 긴 오름차순 구간 (같은 숫자도 이어짐 · 빈칸에서 끊김)
{
  const L = sh => A.runOf(sh).len;
  ok(L([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) === 10, '1~10 = 10');
  ok(L([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]) === 10, '같은 숫자 10칸 = 10');
  ok(L([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]) === 1, '내림차순 = 1');
  ok(L([3, 3, 2, 5, 6, 7, 1, 1, 1, 1]) === 4, '2·5·6·7 = 4 (1 이 네 번 이어진 구간과 같을 때는 앞쪽)');
  ok(A.runOf([3, 3, 2, 5, 6, 7, 1, 1, 1, 1]).from === 2, '같은 길이면 앞 구간');
  ok(L([1, 2, null, 3, 4, 5, null, null, null, null]) === 3, '빈칸에서 끊김');
  ok(L([null, null, null, null, null, null, null, null, null, null]) === 0, '빈 시트 = 0');
  ok(L([4, 3, 3, 4, 4, 9, 2, 2, 8, 8]) === 5, '3·3·4·4·9 = 5');
  ok(A.runOf([9, 1, 1, 2]).from === 1 && L([9, 1, 1, 2]) === 3, '구간 시작 칸');
}

// 2) 시작 상태
for (let n = 2; n <= 6; n++) {
  const st = A.init({ n, seed: 100 + n, cfg: {} });
  ok(st.n === n && st.sheets.length === n, `${n}명 시트`);
  ok(st.sheets.every(sh => sh.length === 10 && sh.filter(x => x != null).length === 1 && sh.every(x => x == null || (x >= 1 && x <= 10))), `${n}명: 딜러 숫자 1개씩`);
  ok(J(A.needs(st)) === J([st.start]) && st.phase === 'say', '처음엔 시작 순번이 소리침');
  ok(st.R === 2, '기본 2라운드');
}
ok(A.init({ n: 1, seed: 1 }).n === 2 && A.init({ n: 9, seed: 1 }).n === 6, '인원 범위 2~6');
ok(A.init({ n: 3, seed: 1, cfg: { rounds: 3 } }).R === 3, '3라운드 옵션');

// 3) 잘못된 입력 거부
{
  const st = A.init({ n: 3, seed: 5, cfg: {} });
  const t = st.turn, o = (t + 1) % 3;
  ok(!A.apply(st, o, { t: 'say', v: 4 }).ok, '순번 아닌 사람은 못 소리침');
  for (const bad of [{ t: 'say', v: 0 }, { t: 'say', v: 11 }, { t: 'say', v: 4.5 }, { t: 'say', v: '4' }, { t: 'put', c: 0 }, { t: 'say' }, null, undefined, {}])
    ok(!A.apply(st, t, bad).ok, '잘못된 소리치기 거부 ' + J(bad));
  ok(A.apply(st, t, { t: 'say', v: 4 }).ok && st.phase === 'put', '소리치기');
  ok(!A.apply(st, t, { t: 'say', v: 5 }).ok || st.phase === 'put', '적는 중엔 또 못 소리침');
  const sh = st.sheets[0], filled = sh.findIndex(x => x != null), empty = sh.findIndex(x => x == null);
  ok(!A.apply(st, 0, { t: 'put', c: filled }).ok, '이미 적힌 칸 거부');
  for (const bad of [{ t: 'put', c: -1 }, { t: 'put', c: 10 }, { t: 'put', c: 1.5 }, { t: 'put', c: '2' }, { t: 'put' }, { t: 'say', v: 3 }]) ok(!A.apply(st, 0, bad).ok, '잘못된 적기 거부 ' + J(bad));
  ok(A.apply(st, 0, { t: 'put', c: empty }).ok && st.sheets[0][empty] === 4, '빈칸에 적기');
  ok(!A.apply(st, 0, { t: 'put', c: sh.findIndex(x => x == null) }).ok, '같은 숫자를 두 번 적을 수 없음');
  ok(!A.needs(st).includes(0) && A.needs(st).length === 2, '동시에 적기 — 적은 사람은 빠짐');
}

// 4) 라운드 흐름: 소리치기 9번 · 시작 순번 돌림 · 점수 합산 · 끝
{
  const n = 4, st = A.init({ n, seed: 321, cfg: {} });
  const start1 = st.start, said = [];
  let steps = 0;
  while (st.round === 1 && st.phase !== 'show' && steps++ < 200) {
    const [s0] = A.needs(st);
    if (st.phase === 'say') { ok(A.needs(st)[0] === (start1 + st.said.length) % n, '소리치는 순번은 돌아가며'); const v = 1 + (st.said.length * 3) % 10; said.push(v); ok(A.apply(st, s0, { t: 'say', v }).ok, 'say'); }
    else for (const s of A.needs(st).slice()) { const c = st.sheets[s].findIndex(x => x == null); ok(A.apply(st, s, { t: 'put', c }).ok, 'put'); }
  }
  ok(st.phase === 'show' && st.said.length === 9, '소리치기 9번 뒤 라운드 끝');
  ok(st.sheets.every(sh => sh.every(x => x != null)), '시트 10칸이 다 참');
  ok(st.hist.length === 1 && J(st.hist[0].runs) === J(st.sheets.map(sh => A.runOf(sh).len)) && J(st.totals) === J(st.hist[0].runs), '점수 = 가장 긴 구간');
  ok(A.auto(st) != null && A.needs(st).length === 0 && !st.over, '결과 보여 주는 단계 (자동으로 넘어감)');
  const V = A.view(st, 0);
  ok(V.sheets.every(Boolean) && V.res && V.res.runs.length === n, '라운드가 끝나면 모든 시트가 보임');
  A.advance(st);
  ok(st.round === 2 && st.start === (start1 + 1) % n && st.phase === 'say' && st.turn === st.start, '둘째 라운드는 시작 순번이 한 칸 돌아감');
  ok(st.sheets.every(sh => sh.filter(x => x != null).length === 1), '새 시트 + 딜러 숫자');
  // 마지막 라운드
  steps = 0;
  while (!st.over && steps++ < 300) {
    if (st.phase === 'say') A.apply(st, st.turn, { t: 'say', v: 5 });
    else if (st.phase === 'put') for (const s of A.needs(st).slice()) A.apply(st, s, { t: 'put', c: st.sheets[s].findIndex(x => x == null) });
    else A.advance(st);
  }
  ok(st.over && A.needs(st).length === 0 && A.auto(st) === null, '2라운드 뒤 끝');
  ok(st.hist.length === 2 && J(st.totals) === J(st.hist[0].runs.map((x, i) => x + st.hist[1].runs[i])), '누적 점수');
  const Vo = A.view(st, 1);
  ok(Vo.over && Vo.ranks && Vo.sheets.every(Boolean) && Vo.hist.length === 2, '끝난 판은 등수와 모든 시트가 보임');
}

// 5) 순위 · 동점 공동
{
  const st = A.init({ n: 4, seed: 7, cfg: {} });
  st.totals = [12, 15, 12, 9];
  ok(J(A.ranks(st)) === J([1, 0, 1, 3]), '동점은 같은 등수 ' + J(A.ranks(st)));
  st.totals = [7, 7, 7, 7];
  ok(A.ranks(st).every(x => x === 0), '모두 같으면 공동 1등');
}

// 6) AI 끼리 끝까지 (규칙 어김 없음 · 멈춤 없음)
function play(n, seed, tiers, cfg) {
  const st = A.init({ n, seed, cfg: cfg || {} }), r = lcg(seed * 7 + 3);
  let steps = 0;
  while (!A.over(st) && steps < 3000) {
    const need = A.needs(st);
    if (!need.length) { ok(A.auto(st) != null, '사람 입력이 없는데 자동으로도 안 넘어감 ' + st.phase); A.advance(st); steps++; continue; }
    for (const seat of need) {
      if (!A.needs(st).includes(seat)) continue;
      const V = A.view(st, seat);
      ok(V.needs.includes(seat) && V.sheet && V.seat === seat, '내 자리 보기');
      const a = A.ai(V, seat, tiers[seat % tiers.length], r);
      const res = A.apply(st, seat, a);
      if (!res.ok) { ok(false, `AI 가 규칙을 어김 (${st.phase}) ${J(a)} → ${res.err}`); A.apply(st, seat, A.legal(st, seat)[0]); }
      steps++;
    }
  }
  ok(A.over(st), `${n}명 판이 끝남 (seed ${seed}, ${steps}번)`);
  ok(st.hist.length === st.R && st.round === st.R && st.hist.every(h => h.said.length === 9), '라운드 수 · 소리치기 9번씩');
  const R = A.ranks(st);
  ok(R.length === n && R.includes(0), '등수');
  const pubs = new Set([-1, 'all', ...Array.from({ length: n }, (_, i) => i)].map(i => A.view(st, i).pub));
  ok(pubs.size === 1, '공개 지문이 자리마다 다름');
  return st;
}
const T0 = Date.now();
for (let n = 2; n <= 6; n++) for (let k = 0; k < 6; k++) play(n, 1000 + n * 17 + k, ['easy', 'normal', 'hard'], k % 3 === 2 ? { rounds: 3 } : {});
for (let k = 0; k < 40; k++) play(2 + (k % 5), 5000 + k, ['normal'], {});
play(6, 777, ['hard'], { rounds: 3 });

// 무작위 합법 수만 (legal) 으로도 끝까지
for (let k = 0; k < 40; k++) {
  const n = 2 + (k % 5), st = A.init({ n, seed: 9000 + k, cfg: {} }), r = lcg(k + 1);
  let steps = 0;
  while (!A.over(st) && steps++ < 3000) {
    const need = A.needs(st);
    if (!need.length) { A.advance(st); continue; }
    const s = need[Math.floor(r() * need.length)], L = A.legal(st, s);
    ok(L.length > 0, 'legal 이 비어 있음');
    ok(A.apply(st, s, L[Math.floor(r() * L.length)]).ok, 'legal 수가 거부됨');
  }
  ok(A.over(st), '무작위 합법 수로 끝남');
}

// 7) 같은 seed → 같은 결과
{
  const a = play(4, 4242, ['hard', 'normal', 'easy', 'normal'], {}), b = play(4, 4242, ['hard', 'normal', 'easy', 'normal'], {}), c = play(4, 4243, ['hard', 'normal', 'easy', 'normal'], {});
  ok(J(a.hist) === J(b.hist) && J(a.log) === J(b.log), '같은 seed 는 같은 판');
  ok(J(a.hist) !== J(c.hist), '다른 seed 는 다른 판');
}

// 8) 숨은 정보 — 내가 못 보는 것만 바꾼 두 상태에서 내 view 가 같아야 함
{
  let tested = 0;
  for (let k = 0; k < 24; k++) {
    const n = 2 + (k % 5), st = A.init({ n, seed: 3000 + k, cfg: {} }), r = lcg(k + 5), r2 = lcg(k * 3 + 1);
    const stopAt = 1 + Math.floor(r() * 24);
    let steps = 0;
    while (!A.over(st) && steps < stopAt) {
      const need = A.needs(st);
      if (!need.length) { A.advance(st); steps++; continue; }
      const s = need[0], L = A.legal(st, s);
      A.apply(st, s, L[Math.floor(r() * L.length)]); steps++;
    }
    if (A.over(st) || st.phase === 'show') continue;
    for (let j = 0; j < n; j++) {
      const st2 = clone(st);
      // 남의 시트: 적힌 칸의 위치와 숫자를 모두 다르게 (칸 수만 같게)
      const cnt = st2.sheets[j].filter(x => x != null).length, cells = Array.from({ length: 10 }, (_, c) => c).sort(() => r2() - 0.5).slice(0, cnt);
      st2.sheets[j] = Array(10).fill(null); cells.forEach(c => { st2.sheets[j][c] = 1 + Math.floor(r2() * 10); });
      st2.rs = (st2.rs ^ 0xabcdef) >>> 0;
      for (const s of [-1, ...Array.from({ length: n }, (_, i) => i)]) {
        if (s === j) { continue; }
        ok(J(A.view(st, s)) === J(A.view(st2, s)), `남(${j})의 시트가 ${s} 자리 보기에 새어 나옴`);
        tested++;
      }
      const same = J(st.sheets[j]) === J(st2.sheets[j]);
      ok(same || J(A.view(st, j)) !== J(A.view(st2, j)), '내 시트는 내 보기에 보여야 함');
      ok(same || J(A.view(st, 'all')) !== J(A.view(st2, 'all')), "'all' 보기는 다 보임");
    }
  }
  ok(tested > 100, '새어 나옴 시험 횟수 ' + tested);
}

// 9) 구경꾼 · 'all' 보기
{
  const st = A.init({ n: 3, seed: 55, cfg: {} });
  A.apply(st, st.turn, { t: 'say', v: 6 });
  const V = A.view(st, -1), Va = A.view(st, 'all'), V0 = A.view(st, 0);
  ok(V.sheet === null && V.sheets.every(x => x === null), '구경꾼은 시트가 안 보임');
  ok(Va.sheet === null && Va.sheets.every(Array.isArray), "'all' 은 모든 시트가 보임");
  ok(V0.sheet && V0.sheets[0] && !V0.sheets[1] && !V0.sheets[2], '내 시트만 보임');
  ok(V.pub === Va.pub && V.pub === V0.pub, '공개 지문 같음');
  ok(V.cur === 6 && V.said.length === 1 && V.left === 8, '소리친 숫자는 모두에게 공개');
  ok(!JSON.stringify(V).includes('"rs"'), '난수 상태는 보기에 없음');
  A.apply(st, 1, { t: 'put', c: st.sheets[1].findIndex(x => x == null) });
  ok(J(A.view(st, -1).done) === J([false, true, false]), '누가 적었는지만 공개');
}

// 10) 세기: hard > normal > easy
function match(tA, tB, games, n) {
  let w = 0, score = 0, rank = 0;
  for (let g = 0; g < games; g++) {
    const flip = g % n, tiers = Array.from({ length: n }, (_, i) => (i === flip ? tA : tB));
    const st = A.init({ n, seed: 20000 + g * 13, cfg: {} }), r = lcg(g + 77);
    let steps = 0;
    while (!A.over(st) && steps++ < 3000) {
      const need = A.needs(st);
      if (!need.length) { A.advance(st); continue; }
      for (const seat of need) { if (!A.needs(st).includes(seat)) continue; A.apply(st, seat, A.ai(A.view(st, seat), seat, tiers[seat], r)); }
    }
    const R = A.ranks(st), mine = R[flip];
    w += mine === 0 ? (R.filter(x => x === 0).length > 1 ? 0.5 : 1) : 0; rank += mine; score += st.totals[flip] - st.totals.reduce((a, b) => a + b, 0) / n;
  }
  return { win: w / games, rank: rank / games, margin: score / games };
}
{
  const hv = match('hard', 'easy', 200, 2), nv = match('normal', 'easy', 200, 2), hn = match('hard', 'normal', 200, 2);
  console.log(`  2명 승률: hard→easy ${(hv.win * 100).toFixed(1)}% · normal→easy ${(nv.win * 100).toFixed(1)}% · hard→normal ${(hn.win * 100).toFixed(1)}%`);
  ok(hv.win > 0.55, 'hard 가 easy 를 이김 ' + hv.win);
  ok(nv.win > 0.5, 'normal 이 easy 를 이김 ' + nv.win);
  ok(hn.win > 0.5, 'hard 가 normal 을 이김 ' + hn.win);
  const h4 = match('hard', 'easy', 200, 4);
  console.log(`  4명 평균 등수(0=1등): hard ${h4.rank.toFixed(2)} (기댓값 1.5 보다 낮을수록 강함)`);
  ok(h4.rank < 1.2, '4명에서 hard 평균 등수 ' + h4.rank);
}
console.log(`  걸린 시간 ${((Date.now() - T0) / 1000).toFixed(1)}초`);

console.log(`오름차순 selftest · 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);

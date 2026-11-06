// 🐾 냥산책 엔진 시험 (Node): node nyang/test/zip.js
//   한붓길이 모든 칸을 한 번씩 · 답이 하나뿐(답 세기) · 같은 씨앗 = 같은 판 · 길 확인 · 힌트 순서 · 만드는 시간
'use strict';
const Z = require('../zip.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

for (const tier of Object.keys(Z.LEVELS)) {
  const L0 = Z.LEVELS[tier]; let ms = 0, bad = 0, uniq = 0, K = 0, worst = 0;
  const n = 30;
  for (let s = 1; s <= n; s++) {
    const t0 = Date.now(), pz = Z.make(s * 104729, tier), dt = Date.now() - t0; ms += dt; worst = Math.max(worst, dt);
    const N = pz.N, L = N * N;
    const all = new Set(pz.sol).size === L && pz.sol.every((k, i) => i === 0 || Z.adj(N, pz.sol[i - 1], k));
    const ends = pz.clue[pz.sol[0]] === 1 && pz.clue[pz.sol[L - 1]] === pz.K;
    if (!all || !ends || !Z.check(pz, pz.sol).done) bad++;
    if (Z.count(N, pz.clue, pz.K, 2, 5e6) === 1) uniq++;
    K += pz.K;
  }
  ok(bad === 0, `${tier}: 길이 모든 칸을 한 번씩 · 1번에서 시작해 마지막 번호에서 끝남 (어긋남 ${bad}/${n})`);
  ok(uniq === n, `${tier}: 답이 하나뿐 ${uniq}/${n}`);
  ok(worst < 1500, `${tier}: 판 하나 만드는 데 1.5초 안 (가장 오래 ${worst}ms)`);
  console.log(`  ${tier} ${L0.N}x${L0.N}: 판당 ${(ms / n).toFixed(0)}ms (가장 오래 ${worst}ms) · 번호 ${(K / n).toFixed(1)}개`);
}
const a = Z.make(777, 'normal'), b = Z.make(777, 'normal'), c = Z.make(778, 'normal');
ok(JSON.stringify([...a.clue]) === JSON.stringify([...b.clue]) && JSON.stringify(a.sol) === JSON.stringify(b.sol), '같은 씨앗 = 같은 판');
ok(JSON.stringify(a.sol) !== JSON.stringify(c.sol), '다른 씨앗 = 다른 판');
{
  const pz = Z.make(5, 'easy'), s = pz.sol;
  ok(!Z.check(pz, s.slice(0, 5)).done && Z.check(pz, s).done, '길 확인: 다 그려야 끝');
  const jump = [s[0], s[2]]; ok(Z.check(pz, jump).bad === 1 && Z.check(pz, jump).why === 'jump', '안 붙은 칸으로 건너뜀 → 틀림');
  const h1 = Z.hint(pz, s.slice(0, 3)); ok(h1 && h1.why === 'next' && h1.k === s[3], '힌트: 다음 칸');
  const wrong = s.slice(0, 3).concat([s.slice(0, 3).includes(s[2] + 1) ? s[2] - 1 : s[2] + 1]);
  const h2 = Z.hint(pz, wrong); ok(h2 && (h2.why === 'wrong' ? h2.at === 3 : true), '힌트: 답과 처음 달라진 곳');
}
console.log(fail ? `실패: ${pass} 통과 · ${fail} 실패` : `냥산책 엔진: ${pass} 통과 · 0 실패`);
process.exit(fail ? 1 : 0);

// 🌗 반반 엔진 시험 (Node): node nyang/test/banban.js
//   판 만들기 · 답이 하나뿐인지(전수 탐색) · 추측 없이 풀리는지 · 같은 씨앗 = 같은 판 · 규칙 어긋남 찾기 · 힌트 순서 · 만드는 시간
'use strict';
const B = require('../banban.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

// 전수 탐색: 처음 칸 · 표시에 맞는 완성판 수 (2 이상이면 멈춤)
function countSolutions(pz, cap = 2) {
  const N = pz.N, P = B.patterns(N), rows = [];
  const rowOk = (r, p) => p.every((v, c) => pz.given[r * N + c] < 0 || pz.given[r * N + c] === v) && p.slice(0, N - 1).every((v, c) => { const s = pz.h[r * (N - 1) + c]; return !s || (s === 1) === (v === p[c + 1]); });
  const cand = [...Array(N).keys()].map(r => P.filter(p => rowOk(r, p)));
  let n = 0;
  (function rec(r) {
    if (n >= cap) return;
    if (r === N) { n++; return; }
    for (const p of cand[r]) {
      rows[r] = p;
      let good = true;
      for (let c = 0; c < N && good; c++) {
        let o = 0; for (let k = 0; k <= r; k++) o += rows[k][c];
        if (o > N / 2 || r + 1 - o > N / 2) good = false;
        else if (r >= 2 && rows[r][c] === rows[r - 1][c] && rows[r][c] === rows[r - 2][c]) good = false;
        else if (r >= 1) { const s = pz.v[(r - 1) * N + c]; if (s && (s === 1) !== (rows[r][c] === rows[r - 1][c])) good = false; }
      }
      if (good) rec(r + 1);
    }
  })(0);
  return n;
}
const valid = (N, g) => B.lines({ N, h: new Int8Array(N * (N - 1)), v: new Int8Array((N - 1) * N) }).every(ln => { const x = ln.cells.map(k => g[k]); return x.filter(v => v === 1).length === N / 2 && x.every((v, i) => i < 2 || !(v === x[i - 1] && v === x[i - 2])); });

ok(B.patterns(6).length === 14, '6칸 줄 무늬 14개 (' + B.patterns(6).length + ')');
ok(B.patterns(8).length === 34, '8칸 줄 무늬 34개 (' + B.patterns(8).length + ')');

const stat = {};
for (const tier of Object.keys(B.LEVELS)) {
  const L = B.LEVELS[tier], st = stat[tier] = { n: 0, ms: 0, given: 0, signs: 0, needL2: 0, uniq: 0, bad: 0 };
  for (let s = 1; s <= 40; s++) {
    const t0 = Date.now(), pz = B.make(s * 7919, tier); st.ms += Date.now() - t0; st.n++;
    const N = pz.N;
    if (!valid(N, pz.sol)) st.bad++;
    const solved = B.solve(pz, L.lvl);
    if (!solved || !solved.every((v, k) => v === pz.sol[k])) st.bad++;
    if (countSolutions(pz) === 1) st.uniq++;
    if (L.lvl >= 2 && !B.solve(pz, 1)) st.needL2++;
    st.given += [...pz.given].filter(v => v >= 0).length; st.signs += B.signs(pz).length;
  }
  ok(st.bad === 0, `${tier}: 정답판이 규칙대로 · 추측 없이 풀림 (어긋남 ${st.bad}/40)`);
  ok(st.uniq === st.n, `${tier}: 답이 하나뿐 ${st.uniq}/${st.n}`);
  console.log(`  ${tier} ${L.N}x${L.N}: 판당 ${(st.ms / st.n).toFixed(1)}ms · 처음 칸 ${(st.given / st.n).toFixed(1)} · 표시 ${(st.signs / st.n).toFixed(1)}${L.lvl >= 2 ? ` · ⑤까지 필요 ${st.needL2}/${st.n}` : ''}`);
  ok(st.ms / st.n < 400, `${tier}: 판 만드는 시간 판당 0.4초 안 (${(st.ms / st.n).toFixed(1)}ms)`);
}
ok(stat.hard.needL2 >= 20 && stat.master.needL2 >= 20, `고급·고수는 대부분 ⑤ 줄 전체 따지기가 필요 (고급 ${stat.hard.needL2} · 고수 ${stat.master.needL2} /40)`);
ok(stat.easy.given / stat.easy.n > stat.normal.given / stat.normal.n, '초급은 중급보다 처음 칸이 많음');

// 같은 씨앗 = 같은 판 (오늘의 판 · 가족 비교)
const a = B.make(20261106, 'normal'), b = B.make(20261106, 'normal'), c = B.make(20261107, 'normal');
ok(JSON.stringify([...a.given, ...a.h, ...a.v]) === JSON.stringify([...b.given, ...b.h, ...b.v]), '같은 씨앗 = 같은 판');
ok(JSON.stringify([...a.given]) !== JSON.stringify([...c.given]), '다른 씨앗 = 다른 판');

// 규칙 어긋남 찾기
{
  const pz = B.make(5, 'easy'), cells = Array.from(pz.sol);
  ok(!B.conflicts(pz, cells).any && B.done(pz, cells), '정답판은 어긋남 없음 · 다 풀림');
  const N = pz.N, r0 = [0, 1, 2].map(c => c);
  const t = Array.from(pz.given).map(() => -1); t[0] = 0; t[1] = 0; t[2] = 0;
  ok(B.conflicts(pz, t).three.length === 3, '셋 연속 → 그 세 칸');
  const u = Array.from(pz.given).map(() => -1); for (let c = 0; c < N; c += 2) u[c] = 1; u[1] = 1;
  ok(B.conflicts(pz, u).over.includes('row0'), '한쪽이 반을 넘은 줄');
  const sg = B.signs(pz)[0];
  if (sg) { const w = Array.from(pz.sol); w[sg[1]] = 1 - w[sg[1]]; ok(B.conflicts(pz, w).badSign.includes(sg[0] + '-' + sg[1]), '어긋난 표시'); }
}
// 힌트: 틀린 칸이 먼저 · 그다음 한 걸음(그 칸이 정답과 같음)
{
  const pz = B.make(11, 'hard'), cells = Array.from(pz.given);
  const k = cells.findIndex(v => v < 0); cells[k] = 1 - pz.sol[k];
  const h1 = B.hint(pz, cells);
  ok(h1 && h1.why === 'wrong' && h1.k === k, '힌트: 틀린 칸부터 알려 줌');
  cells[k] = -1;
  let okAll = true, n = 0;
  for (let g = 0; g < 200; g++) { const h = B.hint(pz, cells); if (!h) break; if (h.why === 'wrong' || h.v !== pz.sol[h.k]) { okAll = false; break; } cells[h.k] = h.v; n++; }
  ok(okAll && B.done(pz, cells), `힌트만 따라가도 끝까지 (${n}걸음, 늘 정답과 같은 칸)`);
}

console.log(fail ? `실패: ${pass} 통과 · ${fail} 실패` : `반반 엔진: ${pass} 통과 · 0 실패`);
process.exit(fail ? 1 : 0);

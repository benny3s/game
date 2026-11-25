// 카드 체스 · 카드 나누기 점수표 만들기 (node survival/test/cardchess_deal_table.js [--games 600] [--jobs 6] [--tier normal])
//  후공이 카드를 나누는 30가지 배치마다, 같은 실력의 AI 둘이 그 배치로 시작해 N판을 두고 '후공 점수'(이김 1 · 비김 0.5)를 잼.
//  결과(30개 숫자)는 core.js 의 DEAL_TABLE 에 붙여 넣음 — 규칙 · AI 가 바뀌면 다시 돌려서 갱신 (selftest 가 배치 목록 지문이 같은지 확인).
'use strict';
const { fork } = require('child_process');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const GAMES = +opt('games', 600), JOBS = +opt('jobs', 6), TIER = opt('tier', 'normal');

if (argv.includes('--worker')) worker(); else main();
function mul(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function worker() {
  const C = require('../games/cardchess/core.js');
  process.on('message', ({ idx }) => {
    const ar = C.ARR[idx]; let sc = 0, w = 0, d = 0, l = 0;
    for (let k = 0; k < GAMES; k++) {
      const seed = 70000 + idx * 1000 + k, st = C.init({ n: 2, seed, cfg: { sets: 1, deal: 'pick' } }), r = mul(seed * 7 + 1);
      if (!C.apply(st, 1, { t: 'deal', me: ar.me, opp: ar.opp }).ok) throw new Error('deal');
      for (let g = 0; g < 300 && !C.over(st); g++) { const s = C.needs(st)[0]; if (!C.apply(st, s, C.ai(C.view(st, s), s, TIER, r)).ok) throw new Error('mv'); }
      const R = C.ranks(st); if (R[0] === R[1]) { d++; sc += 0.5; } else if (R[1] === 0) { w++; sc += 1; } else l++;
    }
    process.send({ idx, score: sc / GAMES, w, d, l });
  });
  process.send({ ready: true });
}
function main() {
  const C = require('../games/cardchess/core.js'), CN = C.CARDS, N = C.ARR.length, out = new Array(N);
  let next = 0, done = 0; const t0 = Date.now();
  for (let j = 0; j < Math.min(JOBS, N); j++) {
    const ch = fork(__filename, ['--worker', '--games', String(GAMES), '--tier', TIER]);
    const feed = () => { if (next < N) ch.send({ idx: next++ }); else ch.kill(); };
    ch.on('message', m => {
      if (m.ready) return feed();
      out[m.idx] = m; done++; feed();
      if (done === N) finish();
    });
  }
  function finish() {
    const key = C.ARR.map(a => a.opp.join('') + a.me.join('')).join(',');
    const table = out.map(o => Math.round(o.score * 1000) / 10);
    console.log(`// ${TIER} · 배치마다 ${GAMES}판 · 후공 점수(%)  [${((Date.now() - t0) / 1000).toFixed(0)}초]`);
    console.log(JSON.stringify(table));
    console.log('// key', key);
    const rows = out.map((o, i) => ({ i, a: C.ARR[i], s: o.score })).sort((x, y) => y.s - x.s);
    for (const r of rows) console.log(`${(r.s * 100).toFixed(1).padStart(5)}%  선공 앞 ${r.a.opp.map(c => CN[c]).join('·')} / 후공 앞 ${r.a.me.map(c => CN[c]).join('·')} / 대기 ${CN[r.a.wait]}`);
    process.exit(0);
  }
}

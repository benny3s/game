// 고스톱 AI 벤치 — 맞고(2인) 같은 판을 자리 바꿔 두 번 (판 운을 지움), worker_threads 로 나눠 돌림
// 실행: node gostop/test/bench.js <A> <B> [쌍 수=400] [스레드=10] [samples=80]
//   A·B = 이름(normal · hard · 고광렬 · 짝귀 · 평경장 · 아귀 · 아귀진심 …) 또는 JSON {"tier":"hard","style":"아귀","gm":1}
//   보이는 것: A 의 판당 평균 점수 ± 표준오차 · 이긴 판 % · 이긴 판 평균 · 진 판 평균 (11-06 규호 님: AI 가 자주 이기는데 질 때 크게 짐)
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

function cfgOf(x, samples) {
  if (x && typeof x === 'object') return Object.assign({ tier: 'hard', samples }, x);
  if (x === 'normal' || x === 'easy') return { tier: x };
  if (x === 'hard') return { tier: 'hard', samples };
  if (/^\{/.test(x)) return Object.assign({ tier: 'hard', samples }, JSON.parse(x));
  if (/=/.test(x)) {                                             // style=아귀,gm=1,samples=200 (PowerShell 은 JSON 따옴표를 지움)
    const o = { tier: 'hard', samples };
    for (const kv of x.split(',')) { const [k, v] = kv.split('='); o[k] = v !== '' && !isNaN(+v) ? +v : v; }
    return o;
  }
  return { tier: 'hard', samples, style: x };                    // 타짜 이름 (ai.js STYLES)
}

function playPair(G, AI, seed, A, B) {
  const one = (c0, c1) => {
    let s = G.create({ players: 2, seed });
    const cf = [c0, c1];
    for (let k = 0; s.phase !== 'end' && k < 800; k++) {
      const p = s.turn, c = cf[p], sd = (Math.imul(seed, 2654435761) + k * 97 + p) >>> 0;
      const peek = c.peek || (c.peekP && ((Math.imul(sd, 1103515245) + 12345) >>> 0) / 4294967296 < c.peekP);   // peek = 반칙 보스 (온전한 상태) · peekP = 그 확률로만
      const a = AI.choose(peek ? G.fastClone(s) : G.view(s, p), c.tier, Object.assign({}, c, { peek, seed: sd }));
      G.apply(s, a, null);
    }
    return [G.reward(s, 0), G.reward(s, 1)];
  };
  const r1 = one(A, B), r2 = one(B, A);
  return [r1[0], r2[1]];                                         // A 가 받은 점수 (두 판)
}

if (isMainThread) {
  const [a = '아귀', b = '평경장', pairs0 = '400', th0 = '10', sm0 = '80'] = process.argv.slice(2);
  const pairs = +pairs0, th = Math.max(1, +th0), samples = +sm0;
  const A = cfgOf(a, samples), B = cfgOf(b, samples);
  const t0 = Date.now(), per = Math.ceil(pairs / th);
  const jobs = [];
  for (let i = 0; i < th; i++) {
    const from = 100000 + i * per, to = Math.min(100000 + pairs, from + per);
    if (from >= to) break;
    jobs.push(new Promise((ok, bad) => { const w = new Worker(__filename, { workerData: { A, B, from, to } }); w.on('message', ok); w.on('error', bad); }));
  }
  Promise.all(jobs).then(parts => {
    const xs = parts.flat(), n = xs.length;
    const pairSum = []; for (let i = 0; i < n; i += 2) pairSum.push(xs[i] + xs[i + 1]);
    const mean = pairSum.reduce((x, y) => x + y, 0) / pairSum.length / 2;
    const sd = Math.sqrt(pairSum.reduce((x, y) => x + (y / 2 - mean) ** 2, 0) / Math.max(1, pairSum.length - 1));
    const wins = xs.filter(x => x > 0), loss = xs.filter(x => x < 0), avg = v => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0);
    console.log(`${a} vs ${b} · ${pairSum.length}쌍 (${n}판) · samples ${samples} · ${((Date.now() - t0) / 1000).toFixed(0)}초`);
    console.log(`  A 판당 ${mean >= 0 ? '+' : ''}${mean.toFixed(2)} ± ${(sd / Math.sqrt(pairSum.length)).toFixed(2)}점 · 이긴 판 ${(wins.length / n * 100).toFixed(1)}% (평균 +${avg(wins).toFixed(1)}) · 진 판 ${(loss.length / n * 100).toFixed(1)}% (평균 ${avg(loss).toFixed(1)}) · 나가리 ${((n - wins.length - loss.length) / n * 100).toFixed(1)}%`);
  }).catch(e => { console.error('벤치 실패', e); process.exit(1); });
} else {
  const G = require(path.join(__dirname, '..', 'core.js')), AI = require(path.join(__dirname, '..', 'ai.js'));
  const { A, B, from, to } = workerData, out = [];
  for (let seed = from; seed < to; seed++) out.push(...playPair(G, AI, seed, A, B));
  parentPort.postMessage(out);
}

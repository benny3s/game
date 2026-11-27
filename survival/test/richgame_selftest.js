// 부자 게임 규칙 시험 (node survival/test/richgame_selftest.js [--quick])
//  · 방송 가격표 · 낙찰(최다 · 동률 무효 · 차순위 · 유찰) · 칩 예산 · 동시 입찰 · 5라운드 · 아이템 · 숨은 정보 (구경꾼 · 이번 라운드 가격 · 남의 입찰/아이템) · AI 는 보이는 것만 · 💡 = 고급 AI · 3단계 · 속도 · 복기 약속 · 화면 글
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../games/richgame/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function playAI(seed, n, tiers, cfg, cb) {
  const st = C.init({ n, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 500) {
    for (const s of C.needs(st)) {
      if (!C.needs(st).includes(s)) continue;
      const V = C.view(st, s);
      if (cb) cb(st, s, V);
      const a = C.ai(V, s, tiers[s], r), res = C.apply(st, s, a);
      if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
    }
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
const bidAll = (st, rows) => { rows.forEach((b, s) => { const r = C.apply(st, s, { t: 'bid', bids: b }); if (!r.ok) throw new Error('bid ' + s + ' ' + r.err); }); };

// ── 1. 방송 가격표 · 준비 ──
{
  const st = C.init({ n: 4, seed: 3, cfg: {} });
  ok(J(st.prices) === J([[53500, 107400, 69507, 98720], [57000, 15800, 61878, 86380], [59500, 8960, 70182, 61250], [88000, 10440, 64080, 39480], [105000, 55960, 73944, 76580]]), '방송 가격표 R1~R5 (억 5.35/10.74/6.9507/9.872 …)');
  ok(st.chips.every(r => r.length === 4 && r.every(x => x === 10)), '종목마다 칩 10개');
  ok(J(C.needs(st)) === '[0,1,2,3]' && st.round === 0 && C.NR === 5, '모두 동시에 · 5라운드');
  ok(C.init({ n: 2, seed: 1, cfg: {} }).n === 3 && C.init({ n: 9, seed: 1, cfg: {} }).n === 6, '인원 3~6');
  const s2 = C.init({ n: 4, seed: 3, cfg: { mode: 1 } }), s3 = C.init({ n: 4, seed: 3, cfg: { mode: 1 } }), s4 = C.init({ n: 4, seed: 4, cfg: { mode: 1 } });
  ok(J(s2.prices) === J(s3.prices) && J(s2.prices) !== J(s4.prices) && s2.prices.length === 5 && s2.prices.every(r => r.every(p => p >= 3000)), '새 시세: 씨앗마다 다른 5라운드 가격');
  ok(C.trendOf(53500, 57000) === 'up' && C.trendOf(59500, 88000) === 'surge' && C.trendOf(107400, 15800) === 'crash' && C.trendOf(98720, 86380) === 'down', '등락 기준: 폭등 ≥1.4배 · 폭락 ≤0.6배');
}
// ── 2. 낙찰 ──
{
  const W = C.winnerOf;
  ok(J(W([3, 1, 2])) === '{"w":0,"b":3}', '가장 많이 건 사람');
  ok(J(W([3, 3, 1])) === '{"w":2,"b":1}', '같으면 무효 → 차순위');
  ok(J(W([3, 3, 2, 2])) === '{"w":-1,"b":0}' && J(W([0, 0, 0])) === '{"w":-1,"b":0}', '차순위도 같거나 아무도 안 걸면 유찰');
  ok(J(W([4, 4, 2, 1])) === '{"w":2,"b":2}' && J(W([0, 5, 0, 5, 2])) === '{"w":4,"b":2}', '0칩은 입찰 아님 · 동률 아래에서 단독이면 낙찰');
  const st = C.init({ n: 3, seed: 5, cfg: {} });
  ok(!C.apply(st, 0, { t: 'bid', bids: [11, 0, 0, 0] }).ok && !C.apply(st, 0, { t: 'bid', bids: [1, 2, 3] }).ok && !C.apply(st, 0, { t: 'bid', bids: [-1, 0, 0, 0] }).ok && !C.apply(st, 0, { t: 'bid', bids: [1.5, 0, 0, 0] }).ok && !C.apply(st, 0, null).ok, '칩 초과 · 모양 · 음수 · 소수 거절');
  ok(C.apply(st, 0, { t: 'bid', bids: [3, 0, 2, 0] }).ok && !C.apply(st, 0, { t: 'bid', bids: [1, 0, 0, 0] }).ok, '한 번 걸면 바꿀 수 없음');
  ok(J(C.needs(st)) === '[1,2]' && st.round === 0, '다 걸 때까지 라운드가 안 끝남');
  C.apply(st, 1, { t: 'bid', bids: [3, 1, 0, 0] }); C.apply(st, 2, { t: 'bid', bids: [0, 1, 4, 0] });
  ok(st.round === 1 && st.hist.length === 1, '모두 걸면 라운드 진행');
  const h = st.hist[0];
  ok(J(h.win) === '[-1,-1,2,-1]' && h.wb[2] === 4, 'A 3:3 무효 · 0·유찰 · B 1:1 무효 · C 4칩 낙찰: ' + J(h.win));
  ok(st.money[2] === 69507 && st.money[0] === 0 && J(st.chips[0]) === '[7,10,8,10]' && J(st.chips[2]) === '[10,9,6,10]', '낙찰 금액 6.9507억 · 칩은 걸기만 해도 차감 (돌려받지 못함)');
}
// ── 3. 5라운드 · 끝 · 순위 ──
{
  const st = C.init({ n: 3, seed: 9, cfg: {} });
  for (let r = 0; r < 5; r++) bidAll(st, [[2, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]);
  ok(st.over && st.round === 5 && J(C.needs(st)) === '[]', '5라운드 뒤 끝');
  const expect = [53500 + 57000 + 59500 + 88000 + 105000, 0, 0];
  ok(J(st.money.slice(0, 1)) === J(expect.slice(0, 1)), '0번이 A 를 매 라운드 가져감 (가격 합 ' + st.money[0] + ')');
  ok(J(C.ranks(st)) === J(st.money.map(m => st.money.filter(x => x > m).length)) && C.ranks(st)[0] === 0, '순위: 금액이 많을수록 앞 (동률은 같은 등수)');
  ok(!C.apply(st, 0, { t: 'bid', bids: [0, 0, 0, 0] }).ok, '끝난 판은 거절');
  const v = C.view(st, 0);
  ok(v.ident && v.ident.length === 4 && /세종/.test(v.ident[0]) && /리플/.test(v.ident[1]) && /휘발유/.test(v.ident[2]) && /남양/.test(v.ident[3]), '끝나면 종목 정체 공개');
}
// ── 4. 아이템 ──
{
  const st = C.init({ n: 3, seed: 5, cfg: {} });
  ok(!C.apply(st, 0, { t: 'item', k: 'trend', c: 1 }).ok, '1라운드엔 등락 정보 X (비교할 지난 가격 없음)');
  ok(C.apply(st, 0, { t: 'item', k: 'id', c: 1 }).ok && st.intel[0][0].text === '리플 40만 개' && !C.apply(st, 0, { t: 'item', k: 'id', c: 2 }).ok, '정보 공개권: 방송 가격 모드는 정체 · 한 번뿐');
  ok(J(C.needs(st)) === '[0,1,2]', '아이템을 써도 아직 안 건 걸로 남음');
  bidAll(st, [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  ok(C.apply(st, 1, { t: 'item', k: 'trend', c: 1 }).ok && st.intel[1][0].v === 'crash', '2라운드 B 등락: 10.74억 → 1.58억 = 폭락');
  ok(C.apply(st, 2, { t: 'item', k: 'trend', c: 0 }).ok && st.intel[2][0].v === 'up' && !C.apply(st, 2, { t: 'item', k: 'trend', c: 3 }).ok, 'A = 상승 · 한 번뿐');
  const s1 = C.init({ n: 3, seed: 5, cfg: { mode: 1 } }); C.apply(s1, 0, { t: 'item', k: 'id', c: 0 });
  ok(/변동 (작음|보통|큼)/.test(s1.intel[0][0].text), '새 시세: 정보 공개권 = 변동 크기');
  const s0 = C.init({ n: 3, seed: 5, cfg: { items: 0 } });
  ok(!C.apply(s0, 0, { t: 'item', k: 'id', c: 0 }).ok, '아이템 끄면 못 씀');
}
// ── 5. 숨은 정보 ──
{
  let leaks = 0, n = 0, pubBad = 0, mutate = 0, recBad = 0, aiDiff = 0;
  for (let g = 0; g < (QUICK ? 4 : 10); g++) {
    const N = 3 + (g % 4);
    playAI(300 + g, N, Array.from({ length: N }, (_, i) => ['hard', 'normal', 'easy'][(i + g) % 3]), g % 2 ? { mode: 1 } : {}, (st, s, V) => {
      n++;
      const sp = C.view(st, -1), o = C.view(st, (s + 1) % N);
      if (V.cur || V.prices || V.ident || sp.cur || sp.prices || o.cur) leaks++;
      if (st.over) leaks++;
      for (let p = 0; p < N; p++) { if (p !== s && !V.done[p] && st.bids[p]) leaks++; if (p !== s && !V.items[p].hid) leaks++; }
      if (sp.mine !== null && !st.over) leaks++;
      if (sp.intel.length) leaks++;
      if (J(V.log).includes('"item"') && V.log.some(e => e.k === 'item' && e.s !== s)) leaks++;
      if (sp.pub !== V.pub || o.pub !== V.pub) pubBad++;
      const before = J(st); C.view(st, (s + 1) % N); C.ai(C.view(st, s), s, 'hard', mul(3)); if (J(st) !== before) mutate++;
      if (J(C.ai(V, s, 'hard', mul(1))) !== J(C.ai(V, s, 'hard', mul(99))) || J(C.recommend(V, s)) !== J(C.ai(V, s, 'hard', mul(5)))) recBad++;
      // 이번 라운드 · 앞날 가격이나 남이 이미 낸 입찰을 바꿔도 내 view · 고급 AI 수가 같음
      if (n % 2 === 0 && st.round < 4) {
        const t = JSON.parse(J(st));
        for (let r = t.round; r < 5; r++) t.prices[r] = t.prices[r].map(x => x + 777 * (r + 1));
        t.bids = t.bids.map((b, p) => (b && p !== s ? [0, 1, 0, 2] : b));
        t.intel = t.intel.map((l, p) => (p === s ? l : []));
        const V2 = C.view(t, s);
        if (J(V2) !== J(V) && J(V2.hist) !== J(V.hist)) aiDiff++;
        else if (J(C.ai(V2, s, 'hard')) !== J(C.ai(V, s, 'hard'))) aiDiff++;
      }
    });
  }
  ok(!leaks, `이번 라운드 가격 · 남의 입찰/아이템 · 종목 정체가 안 보임 · 구경꾼 = 공개만 (${n}번 중 샘 ${leaks})`);
  ok(!pubBad, '공개 지문 같음 ' + pubBad);
  ok(!mutate, 'view · ai 가 상태를 안 바꿈 ' + mutate);
  ok(!recBad, '💡 추천 = 고급 AI (rnd 무관) ' + recBad);
  ok(!aiDiff, '앞날 가격 · 남의 비공개 입찰을 바꿔도 고급 AI 수가 같음 (보이는 것만 씀) ' + aiDiff);
  const st = C.init({ n: 4, seed: 5, cfg: {} }), va = C.view(st, 'all');
  ok(va.cur && va.cur.length === 4 && va.prices && va.prices.length === 5, "'all' 만 다 보임");
}
// ── 6. AI 3단계 · 속도 ──
{
  const bench = (A, Bt, n, N, cfg) => {
    let beat = 0, tot = 0;
    for (let g = 0; g < N; g++) {
      const hs = g % n, tiers = Array(n).fill(Bt); tiers[hs] = A;
      const st = playAI(1000 + g, n, tiers, cfg), m = st.money;
      for (let p = 0; p < n; p++) if (p !== hs) { tot++; beat += m[hs] > m[p] ? 1 : m[hs] === m[p] ? 0.5 : 0; }
    }
    return beat / tot;
  };
  const N = QUICK ? 24 : 80, lines = [];
  for (const n of [3, 4, 6]) {
    const he = bench('hard', 'easy', n, N, {}), hn = bench('hard', 'normal', n, N, {}), ne = bench('normal', 'easy', n, N, {});
    lines.push(`${n}명: 고급 vs 초급 ${(he * 100).toFixed(0)}% · 고급 vs 보통 ${(hn * 100).toFixed(0)}% · 보통 vs 초급 ${(ne * 100).toFixed(0)}%`);
    ok(he >= 0.62 && hn >= 0.58 && ne >= 0.5, `3단계 (${n}명, 상대 이김) ${lines[lines.length - 1]}`);
  }
  console.log('· 3단계 (상대 이김 비율, 방송 시세)', lines.join(' | '));
  let mx = 0, mc = 0;
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} } };
  global.window.SVCores = { richgame: C };
  require('../games/richgame/ui.js');
  const U = global.window.SVUI.richgame;
  for (let g = 0; g < 3; g++) playAI(700 + g, 6, Array(6).fill('hard'), {}, (st2, s, V2) => {
    let t0 = process.hrtime.bigint(); C.ai(V2, s, 'hard', mul(1)); mx = Math.max(mx, Number(process.hrtime.bigint() - t0) / 1e6);
    t0 = process.hrtime.bigint(); U.coach(V2, s, -1, ['나', 'AI', 'AI', 'AI', 'AI', 'AI']); mc = Math.max(mc, Number(process.hrtime.bigint() - t0) / 1e6);
  });
  ok(mx < 150 && mc < 200, `속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms`); console.log(`· 속도: ai 최대 ${mx.toFixed(1)} ms · 선생님 최대 ${mc.toFixed(1)} ms`);
}
// ── 7. 복기 약속 ──
{
  const src = fs.readFileSync(path.join(__dirname, '../games/richgame/core.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random|Date\.now|performance\.now/.test(src), 'core 에 Math.random · Date.now 없음');
  const a = playAI(41, 4, ['normal', 'easy', 'hard', 'easy'], {}), b = playAI(41, 4, ['normal', 'easy', 'hard', 'easy'], {});
  ok(J(a.log) === J(b.log), '같은 씨앗 → 같은 판');
  const st = C.init({ n: 3, seed: 3, cfg: {} }), before = J(st);
  C.apply(st, 0, { t: 'bid', bids: [99, 0, 0, 0] }); C.apply(st, 0, { t: 'item', k: 'trend', c: 0 }); C.apply(st, 0, { t: 'x' });
  ok(J(st) === before, '실패한 apply 는 상태를 안 바꿈');
}
// ── 8. 화면 글 ──
{
  const U = global.window.SVUI.richgame;
  ok(U.howto.length >= 5 && /^🎯 목표/.test(U.howto[0]) && /^준비물/.test(U.howto[1]) && /^진행/.test(U.howto[2]) && /^승패/.test(U.howto[3]) && /^특수/.test(U.howto[4]), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  const T = U.tutorial();
  ok(T.length >= 4 && T.length <= 8 && T.filter(t => t.interactive).length === 1, '1분 규칙 단계 ' + T.length);
  ok(U.min === 3 && U.max === 6 && U.board === false && U.opts.find(o => o.k === 'mode').def === 0, '3~6명 · 한 기기 판 없음 (비공개 입찰) · 기본 방송 시세');
  let bad = 0, n = 0, recs = 0, recMis = 0;
  for (let g = 0; g < (QUICK ? 3 : 7); g++) {
    const N = 3 + (g % 4), names = Array.from({ length: N }, (_, i) => (i ? 'AI<b>' + i : '나'));
    const st = playAI(900 + g, N, Array.from({ length: N }, (_, i) => ['normal', 'hard', 'easy'][(i + g) % 3]), g % 2 ? { mode: 1 } : {}, (s0, s, V) => {
      n++;
      const co = U.coach(V, s, -1, names), txt = co.opp + co.mine + co.rec + co.why;
      if (/undefined|NaN|null|\[object|AI<b>/.test(txt) || !co.rec) { bad++; if (bad < 4) console.error(J(co)); }
      const a = C.ai(V, s, 'hard', () => 0.5);
      if (a) { recs++; if (!co.rec.includes(U.actText(a).split(' → ')[0].slice(0, 6))) recMis++; if (a.t === 'bid' && !/\d%/.test(co.why) && !/아껴요/.test(co.why)) bad++; }
      const t = U.actText(a); if (!t || /undefined/.test(t)) bad++;
    });
    const rs = U.result(C.view(st, 0), 0); if (!/🏆/.test(rs) || /undefined|NaN/.test(rs)) { bad++; console.error(rs); }
    const ch = U.chip(C.view(st, 0), 0); if (!ch.t || /undefined/.test(ch.t)) bad++;
  }
  ok(!bad && n > 20 && recs > 20, `선생님 · 결과 글 깨끗함 (${n}번, 이상 ${bad})`);
  ok(!recMis, '선생님 💡 = 고급 AI 의 수 ' + recMis);
  const st = C.init({ n: 4, seed: 31, cfg: {} }), V = C.view(st, 0), best = C.ai(V, 0, 'hard');
  const r = U.review(V, 0, { t: 'bid', bids: [10, 10, 10, 10] }, best), r0 = U.review(V, 0, best, best);
  ok(r.sev > 0 && /\d/.test(r.why) && /고급/.test(r.why) && r0.sev === 0, '복기 ' + r.sev + ' ' + r.why);
  ok(U.actText({ t: 'bid', bids: [1, 0, 2, 3] }) === 'A 1 · B 0 · C 2 · D 3' && U.actText({ t: 'item', k: 'trend', c: 1 }) === '등락 정보 → B 종목', '행동 글');
  const cs = U.coach(C.view(st, -1), -1, -1, ['나', 'AI', 'AI', 'AI']);
  ok(!/undefined|NaN|null/.test(J(cs)), '구경꾼 선생님 글 ' + J(cs).slice(0, 100));
}
console.log(`richgame selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// 같은 그림 찾기 규칙 시험 (node survival/test/gn-samepic_selftest.js [--quick])
//  · 벨트 · 출발 위치 · 맞힘/틀림/떨어짐/결승 · 멈추기 · 시즌 1·2 선후공 · 숨은 정보 (구경꾼 · 안 연 칸) · AI 는 보이는 것만 · 💡 = 고급 AI · 3단계 · 속도 · 복기 약속 · 화면 글
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../games/gn-samepic/core.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
const J = JSON.stringify, QUICK = process.argv.includes('--quick');
const LT = 'ABCDEFGHIJKLMNOP';
const mul = a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function playAI(seed, tiers, cfg, cb) {
  const st = C.init({ n: 2, seed, cfg }), r = mul(seed * 7 + 3); let g = 0;
  while (!C.over(st) && g++ < 3000) {
    const s = C.needs(st)[0], V = C.view(st, s);
    if (cb) cb(st, s, V);
    const a = C.ai(V, s, tiers[s], r), res = C.apply(st, s, a);
    if (!res.ok) throw new Error(`AI ${tiers[s]} ${J(a)} ${res.err}`);
  }
  if (!C.over(st)) throw new Error('끝나지 않음');
  return st;
}
const panelOf = (st, pic) => st.pic.indexOf(pic);
const tgOf = (st, s) => st.seq[s][st.a[s] + st.pos[s]];

// ── 1. 준비물 · 출발 ──
{
  const st = C.init({ n: 2, seed: 7, cfg: {} });
  ok(st.pic.length === 16 && new Set(st.pic).size === 16, '그림판 16칸 · 서로 다른 그림 16장');
  ok(st.seq.length === 2 && st.seq.every(q => q.length === 48), '벨트 카드 3묶음(48장)');
  ok(st.seq.every(q => [0, 1, 2].every(k => new Set(q.slice(k * 16, k * 16 + 16)).size === 16)), '각 묶음은 16개 그림이 한 번씩');
  ok(J(st.pos) === '[12,12]' && st.phase === 'open' && (st.turn === 0 || st.turn === 1), '시즌 4: 둘 다 12번째 · 동전으로 선');
  const V = C.view(st, 0);
  ok(V.belt.every(b => b.length === 20) && J(V.tgt) === J([st.seq[0][12], st.seq[1][12]]), '벨트 20칸 · 다음 칸(13번째) 카드가 목표');
  const s1 = C.init({ n: 2, seed: 7, cfg: { ver: 1 } });
  ok(s1.phase === 'first' && C.needs(s1).length === 1 && C.needs(s1)[0] === s1.rich, '시즌 1·2: 가넷 많은 쪽이 선후공을 정함');
  ok(s1.pos[s1.rich] === 10 && s1.pos[1 - s1.rich] === 8, '시즌 1·2: 많은 쪽 10번째 · 적은 쪽 8번째');
  ok(!C.apply(s1, 1 - s1.rich, { t: 'first', who: 0 }).ok && !C.apply(s1, s1.rich, { t: 'open', k: 0 }).ok, '정하기 전엔 다른 행동 · 다른 사람 거절');
  ok(C.apply(s1, s1.rich, { t: 'first', who: 1 - s1.rich }).ok && s1.phase === 'open' && s1.turn === 1 - s1.rich, '선후공 정하기');
}
// ── 2. 맞힘 · 틀림 · 멈추기 ──
{
  const st = C.init({ n: 2, seed: 11, cfg: {} }), s = st.turn, o = 1 - s;
  const tg = tgOf(st, s);
  ok(!C.apply(st, o, { t: 'open', k: 0 }).ok, '차례 아니면 거절');
  ok(!C.apply(st, s, { t: 'stop' }).ok, '한 번도 안 열고는 멈출 수 없음');
  ok(!C.apply(st, s, { t: 'open', k: 16 }).ok && !C.apply(st, s, { t: 'open', k: -1 }).ok && !C.apply(st, s, null).ok && !C.apply(st, s, { t: 'open', k: 1.5 }).ok, '이상한 행동 거절');
  ok(C.apply(st, s, { t: 'open', k: panelOf(st, tg) }).ok, '맞는 칸 열기');
  ok(st.pos[s] === 13 && st.turn === s && st.can && st.a[s] === 0, '맞으면 한 칸 전진 · 같은 사람이 이어서');
  ok(C.view(st, o).tgt[s] === st.seq[s][13], '다음 목표는 한 칸 앞 카드');
  const nt = tgOf(st, s), bad = st.pic.findIndex(p => p !== nt);
  const vb = C.view(st, s), beltBefore = vb.belt[s].slice(), tgBefore = vb.tgt[s];
  ok(C.apply(st, s, { t: 'open', k: bad }).ok, '틀린 칸 열기');
  const V2 = C.view(st, s);
  ok(st.pos[s] === 12 && st.a[s] === 1 && st.turn === o && !st.can, '틀리면 한 칸 후진 · 벨트 한 칸 이동 · 상대 차례');
  ok(V2.tgt[s] === tgBefore && V2.belt[s][0] === beltBefore[1] && V2.belt[s].length === 20 && V2.belt[s][19] === st.seq[s][20], '벨트가 한 칸 밀려 맨 앞에 새 카드가 채워짐 · 목표 그림은 그대로');
  const st2 = C.init({ n: 2, seed: 12, cfg: {} }), s2 = st2.turn;
  C.apply(st2, s2, { t: 'open', k: panelOf(st2, tgOf(st2, s2)) });
  ok(C.apply(st2, s2, { t: 'stop' }).ok && st2.turn === 1 - s2 && !st2.can, '맞힌 뒤 멈추면 상대 차례');
  const st3 = C.init({ n: 2, seed: 13, cfg: {} }), s3 = st3.turn, nt3 = tgOf(st3, s3), b3 = st3.pic.findIndex(p => p !== nt3);
  C.apply(st3, s3, { t: 'open', k: b3 }); ok(C.apply(st3, 1 - s3, { t: 'open', k: b3 }).ok, '이미 열었던 칸을 상대가 따라 열 수 있음');
}
// ── 3. 결승 · 떨어짐 ──
{
  const st = C.init({ n: 2, seed: 21, cfg: {} }), s = st.turn;
  st.pos[s] = 19; C.apply(st, s, { t: 'open', k: panelOf(st, tgOf(st, s)) });
  ok(st.over && st.res.w === s && st.res.why === 'goal' && C.ranks(st)[s] === 0, '20번째 칸에 닿으면 승');
  ok(J(C.needs(st)) === '[]' && !C.apply(st, s, { t: 'stop' }).ok, '끝나면 행동 없음');
  const st2 = C.init({ n: 2, seed: 22, cfg: {} }), s2 = st2.turn;
  st2.pos[s2] = 1; const nt = tgOf(st2, s2);
  C.apply(st2, s2, { t: 'open', k: st2.pic.findIndex(p => p !== nt) });
  ok(st2.over && st2.res.w === 1 - s2 && st2.res.why === 'fall' && st2.pos[s2] === 0, '1번째 칸에서 틀리면 떨어져 패');
  const st3 = C.init({ n: 2, seed: 23, cfg: {} }), s3 = st3.turn; st3.pos[s3] = 2;
  const nt3 = tgOf(st3, s3);
  C.apply(st3, s3, { t: 'open', k: st3.pic.findIndex(p => p !== nt3) });
  ok(!st3.over && st3.pos[s3] === 1, '2번째 칸에서 틀리면 1번째 칸 (아직 안 떨어짐)');
}
// ── 4. 숨은 정보 ──
{
  let leaks = 0, n = 0, pubBad = 0, mutate = 0, recBad = 0, aiDiff = 0;
  for (let g = 0; g < (QUICK ? 6 : 14); g++) {
    playAI(300 + g, g % 2 ? ['hard', 'normal'] : ['normal', 'hard'], g % 3 === 0 ? { ver: 1 } : {}, (st, s, V) => {
      n++;
      const sp = C.view(st, -1), o = C.view(st, 1 - s);
      if (V.pic || sp.pic || o.pic) leaks++;
      for (const w of [V, sp, o]) for (let k = 0; k < 16; k++) if ((w.known[k] >= 0) !== (st.known[k] >= 0)) leaks++;
      if (sp.pub !== V.pub || o.pub !== V.pub) pubBad++;
      const before = J(st); C.view(st, 1 - s); C.ai(C.view(st, s), s, 'hard', mul(3)); if (J(st) !== before) mutate++;
      if (J(C.ai(V, s, 'hard', mul(1))) !== J(C.ai(V, s, 'hard', mul(99))) || J(C.recommend(V, s)) !== J(C.ai(V, s, 'hard', mul(5)))) recBad++;
      if (n % 3 === 0) {
        const t = JSON.parse(J(st)), un = [];
        for (let k = 0; k < 16; k++) if (t.known[k] < 0) un.push(k);
        if (un.length >= 2) {
          const p0 = t.pic[un[0]]; t.pic[un[0]] = t.pic[un[1]]; t.pic[un[1]] = p0;
          const V2 = C.view(t, s);
          if (J(V2) !== J(V) || J(C.ai(V2, s, 'hard')) !== J(C.ai(V, s, 'hard'))) aiDiff++;
        }
      }
    });
  }
  ok(!leaks, `안 연 칸의 그림이 view 에 없음 · 구경꾼 = 상대 눈 (${n}번 중 샘 ${leaks})`);
  ok(!pubBad, '공개 지문 같음 ' + pubBad);
  ok(!mutate, 'view · ai 가 상태를 안 바꿈 ' + mutate);
  ok(!recBad, '💡 추천 = 고급 AI (rnd 무관) ' + recBad);
  ok(!aiDiff, '안 연 칸의 그림이 달라도 view · 고급 AI 수가 같음 (보이는 것만 씀) ' + aiDiff);
  const st = C.init({ n: 2, seed: 5, cfg: {} });
  ok(C.view(st, 'all').pic && C.view(st, 'all').pic.length === 16, "'all' 만 다 보임 (구경 · 한 기기)");
}
// ── 5. AI 3단계 · 속도 ──
{
  const ladder = (A, B, N) => { let w = 0; for (let g = 0; g < N; g++) { const t = g % 2 ? [B, A] : [A, B]; const s = playAI(500 + g, t, {}); if (s.res.w === (g % 2 ? 1 : 0)) w++; } return w / N; };
  const N = QUICK ? 30 : 80;
  const he = ladder('hard', 'easy', N), hn = ladder('hard', 'normal', N), ne = ladder('normal', 'easy', N);
  const lad = `3단계: 고급 vs 초급 ${(he * 100).toFixed(0)}% · 고급 vs 보통 ${(hn * 100).toFixed(0)}% · 보통 vs 초급 ${(ne * 100).toFixed(0)}% (${N}판씩)`;
  ok(he >= 0.8 && hn >= 0.7 && ne >= 0.6, lad); console.log('·', lad);
  let mx = 0, mc = 0;
  global.window = {}; global.document = { createElement: () => ({}), head: { appendChild() {} }, addEventListener() {} };
  global.window.SVCores = { 'gn-samepic': C };
  require('../games/gn-samepic/ui.js');
  const U = global.window.SVUI['gn-samepic'];
  for (let g = 0; g < 4; g++) playAI(700 + g, ['hard', 'hard'], {}, (st2, s, V2) => {
    let t0 = process.hrtime.bigint(); C.ai(V2, s, 'hard', mul(1)); mx = Math.max(mx, Number(process.hrtime.bigint() - t0) / 1e6);
    t0 = process.hrtime.bigint(); U.coach(V2, s, -1, ['나', 'AI']); mc = Math.max(mc, Number(process.hrtime.bigint() - t0) / 1e6);
  });
  ok(mx < 150 && mc < 200, `속도: ai 최대 ${mx.toFixed(2)} ms · 선생님 최대 ${mc.toFixed(2)} ms`); console.log(`· 속도: ai 최대 ${mx.toFixed(2)} ms · 선생님 최대 ${mc.toFixed(2)} ms`);
  // 초급은 잊음: 목표 그림을 오래전에 봤으면 고급은 늘 그 칸을 열고 초급은 가끔 못 찾음
  let hardMiss = 0, easyMiss = 0, cases = 0;
  for (let g = 0; g < 40; g++) {
    const st = C.init({ n: 2, seed: 900 + g, cfg: {} }), s = st.turn, tg = tgOf(st, s), loc = panelOf(st, tg);
    st.log.push({ k: 'open', s: 1 - s, p: loc, pic: tg, tg: -1, ok: false, i: 100 }); st.known[loc] = tg;
    let c = 0; for (let k = 0; c < 5; k++) if (k !== loc) { st.log.push({ k: 'open', s: 1 - s, p: k, pic: st.pic[k], tg: -1, ok: false, i: 101 + c }); st.known[k] = st.pic[k]; c++; }
    const V = C.view(st, s); cases++;
    if (C.ai(V, s, 'hard').k !== loc) hardMiss++;
    for (let t = 0; t < 10; t++) if (C.ai(V, s, 'easy', mul(t * 17 + g)).k !== loc) easyMiss++;
  }
  ok(hardMiss === 0 && easyMiss > cases * 4, `고급은 본 목표 칸을 늘 열고 초급은 잊음 (고급 놓침 ${hardMiss} · 초급 놓침 ${easyMiss}/${cases * 10})`);
}
// ── 6. 복기 약속 ──
{
  const src = fs.readFileSync(path.join(__dirname, '../games/gn-samepic/core.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random|Date\.now|performance\.now/.test(src), 'core 에 Math.random · Date.now 없음');
  const a = playAI(41, ['normal', 'easy'], {}), b = playAI(41, ['normal', 'easy'], {});
  ok(J(a.log) === J(b.log), '같은 씨앗 → 같은 판');
  const st = C.init({ n: 2, seed: 3, cfg: {} }), before = J(st);
  C.apply(st, 1 - st.turn, { t: 'open', k: 0 }); C.apply(st, st.turn, { t: 'open', k: 99 }); C.apply(st, st.turn, { t: 'stop' });
  ok(J(st) === before, '실패한 apply 는 상태를 안 바꿈');
}
// ── 7. 화면 글 ──
{
  const U = global.window.SVUI['gn-samepic'];
  ok(U.howto.length >= 5 && /^🎯 목표/.test(U.howto[0]) && /^준비물/.test(U.howto[1]) && /^진행/.test(U.howto[2]) && /^승패/.test(U.howto[3]) && /^특수/.test(U.howto[4]), '1분 규칙 순서: 목표 → 준비물 → 진행 → 승패 → 특수');
  ok(/같은 숫자 찾기/.test(U.howto[4]), '같은 숫자 찾기와 다른 게임임을 안내');
  const T = U.tutorial();
  ok(T.length >= 4 && T.length <= 8 && T.filter(t => t.interactive).length === 1, '1분 규칙 단계 ' + T.length);
  ok(U.board === true && U.min === 2 && U.max === 2, '한 기기 두 사람 가능 (연 그림은 공개)');
  let bad = 0, n = 0, recs = 0, recMis = 0, hints = 0;
  for (let g = 0; g < (QUICK ? 4 : 8); g++) {
    const st = playAI(900 + g, ['normal', 'hard'], g % 2 ? { ver: 1 } : {}, (s0, s, V) => {
      n++;
      const co = U.coach(V, s, -1, ['나', 'AI<b>']), cf = U.coachFull(V, s, -1, ['나', 'AI<b>']);
      const txt = co.opp + co.mine + co.rec + co.why + cf.rec + cf.why;
      if (/undefined|NaN|null|\[object|AI<b>/.test(txt) || !co.rec) { bad++; if (bad < 4) console.error(J(co)); }
      const a = C.ai(V, s, 'hard', () => 0.5);
      if (V.phase === 'open' && a) {
        recs++;
        if (a.t === 'open' && !cf.rec.includes(`${LT[a.k]}칸`)) recMis++;
        if (a.t === 'stop' && !/멈추기/.test(cf.rec)) recMis++;
        if (!/\d%|\d번/.test(cf.why + co.why)) bad++;
        if (a.t === 'open' && co.rec.includes(`${LT[a.k]}칸`) && /button/.test(co.why)) hints++;
      }
      const t = U.actText(a); if (!t || /undefined/.test(t)) bad++;
    });
    const rs = U.result(C.view(st, 0), 0); if (!/(🏆)/.test(rs) || /undefined|NaN/.test(rs)) { bad++; console.error(rs); }
    const ch = U.chip(C.view(st, 0), 0); if (!ch.t || /undefined/.test(ch.t)) bad++;
  }
  ok(!bad && n > 40 && recs > 20, `선생님 · 결과 글 깨끗함 (${n}번, 내 차례 ${recs}번, 이상 ${bad})`);
  ok(!recMis, '선생님 💡(전체) = 고급 AI 의 수 ' + recMis);
  ok(hints === 0, '선생님 처음 힌트 단계에는 칸 이름이 없음 ' + hints);
  const st = C.init({ n: 2, seed: 31, cfg: {} }), s = st.turn, tg = tgOf(st, s), loc = panelOf(st, tg);
  st.log.push({ k: 'open', s: 1 - s, p: loc, pic: tg, tg: -1, ok: false, i: 50 }); st.known[loc] = tg;
  const V = C.view(st, s), best = C.ai(V, s, 'hard'), other = { t: 'open', k: (loc + 1) % 16 };
  const r = U.review(V, s, other, best);
  ok(best.k === loc && r.sev >= 80 && /\d/.test(r.why) && /목표/.test(r.why), '복기: 목표 자리를 알고도 딴 칸 ' + r.sev + ' ' + r.why);
  const r2 = U.review(V, s, { t: 'stop' }, best);
  ok(r2.sev >= 60 && r2.sev < r.sev + 1, '복기: 목표 자리를 알고 멈춤 ' + r2.sev);
  ok(U.review(V, s, best, best).sev === 0, '같은 수면 0');
  ok(U.actText({ t: 'open', k: 3 }) === 'D칸 열기' && U.actText({ t: 'stop' }) === '멈추기', '행동 글');
  const sp = C.view(st, -1), cs = U.coach(sp, -1, -1, ['나', 'AI']);
  ok(!/undefined|NaN|null/.test(J(cs)), '구경꾼 선생님 글 ' + J(cs).slice(0, 100));
}
console.log(`gn-samepic selftest: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

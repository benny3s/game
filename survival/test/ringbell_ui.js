// 링 더 벨 화면 시험: node survival/test/ringbell_ui.js
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = JSON.stringify;

// 1) Node 쪽: 선생님 글은 남의 숨은 것(모르는 손패 · 더미 순서)만 바꾼 두 장면에서 같아야 함 · 💡 = 고급 AI · 복기 sev
(() => {
  const core = require(path.join(ROOT, 'games/ringbell/core.js'));
  global.window = { SVCores: { ringbell: core } };
  require(path.join(ROOT, 'games/ringbell/ui.js'));
  const U = global.window.SVUI.ringbell;
  nok(U.board === false && U.min === 2 && U.max === 4 && U.defN === 2, '2~4명 · 한 기기 안 됨');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  nok(U.opts.length === 1 && U.opts[0].k === 'rounds' && U.opts[0].def === 3, '라운드 옵션');
  const lcg = s => { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  let recN = 0, n = 0, revN = 0, tank = 0; const phases = new Set(), kinds = new Set();
  for (let k = 0; k < 9; k++) {
    const N = [2, 4, 3][k % 3], names = ['나', '나비', '치즈', '두부'].slice(0, N);
    const st = core.init({ n: N, seed: 800 + k, cfg: { rounds: k % 2 ? 1 : 3 } }), r = lcg(k + 31);
    for (let steps = 0; steps < 900 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      const s0 = need[0];
      for (const s of [s0, (s0 + 1) % N]) {
        // 숨은 것만 바꾼 판
        const st2 = JSON.parse(J(st)), rr = lcg(steps * 7 + s + 1);
        const free = []; for (let j = 0; j < N; j++) if (j !== s) st2.hands[j].forEach((c, i) => { if (!st2.known[j].includes(c) && !(st2.phase === 'drop' && st2.cur === j && st2.got === c) && !(st2.shown && st2.shown[j] && st2.shown[j].includes(c))) free.push([j, i]); });
        if (st2.phase === 'show') free.length = 0;                         // 공개 뒤엔 조합 카드가 결과에 남음 — 바꾸지 않음
        const bag = free.map(([j, i]) => st2.hands[j][i]).concat(st2.deck);
        for (let i = bag.length - 1; i > 0; i--) { const q = Math.floor(rr() * (i + 1)); [bag[i], bag[q]] = [bag[q], bag[i]]; }
        free.forEach(([j, i], x) => { st2.hands[j][i] = bag[x]; });
        st2.deck = bag.slice(free.length); st2.rs = (st.rs ^ 0x7f4a7c15) >>> 0;
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names);
        nok(J(c1) === J(c2), `선생님 글이 숨은 정보로 바뀜 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null|\[object/.test(J(c1)), '선생님 글 이상 ' + J(c1));
        if (need.includes(s)) {
          const V0 = core.view(st, s), ha = core.ai(V0, s, 'hard', core.recRnd(V0, s)); recN++;
          const want = ha.t === 'take' ? (ha.src === 'up' ? '앞면' : '더미에서') : ha.t === 'bell' ? '벨' : ha.t === 'four' ? '포카드' : ha.t === 'drop' ? `${core.cname(ha.c)} 버리기` : `(합 ${core.sumOf(ha.cards)})`;
          nok(c1.rec.includes(want), `추천 ≠ 고급 AI ${c1.rec} vs ${J(ha)}`);
          nok(c1.why && /\d/.test(c1.why) && !/undefined|NaN/.test(c1.why), `차례인데 숫자 이유가 없음 (${st.phase}) ${c1.why}`);
          phases.add(st.phase); kinds.add(ha.t);
          if (ha.t === 'show' && core.sumOf(ha.cards) < core.best(V0.hand).sum) { tank++; nok(/탱킹/.test(c1.why), '탱킹 추천인데 까닭에 탱킹이 없음'); }
          const L = core.legal(st, s), my = L[Math.floor(r() * L.length)];
          const rv0 = U.review(V0, s, ha, ha, { seed: 5 }), rv1 = U.review(V0, s, my, ha, { seed: 5 });
          nok(rv0.sev === 0, '고급 AI 수인데 복기 sev ≠ 0 ' + J(rv0));
          nok(rv1.sev >= 0 && rv1.sev <= 100 && (!rv1.why || /\d/.test(rv1.why)), '복기 sev/이유 이상 ' + J(rv1));
          nok(typeof U.actText(my, V0, names) === 'string' && !/undefined|NaN/.test(U.actText(my, V0, names)), 'actText ' + J(my));
          revN++;
          const vv = JSON.parse(J(V0)); U.coach(vv, s, -1, names); U.review(vv, s, my, ha, { seed: 5 }); nok(J(vv) === J(V0), '선생님 · 복기가 view 를 바꿈');
        }
        n++;
      }
      const a = core.ai(core.view(st, s0), s0, ['easy', 'normal', 'hard'][(s0 + k) % 3], r);
      nok(core.apply(st, s0, a).ok, 'AI 수 ' + J(a));
    }
    nok(core.over(st), `${N}명 판이 끝남`);
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(J(fin)), '끝난 판 선생님 글');
    const rs2 = U.result(core.view(st, 0), 0);
    nok(typeof rs2 === 'string' && /<table/.test(rs2) && !/undefined|NaN/.test(rs2), '결과 html');
    const watch = U.coach(core.view(st, 'all'), -1, -1, names);
    nok(watch.rec && !/undefined|NaN/.test(J(watch)), '구경 선생님 글');
  }
  nok(U.actText({ t: 'take', src: 'up' }) === '앞면 가져오기' && U.actText({ t: 'drop', c: 6 }) === '빨강 7 버림' && U.actText({ t: 'show', cards: [6, 7] }) === '빨강 7+8 공개 (합 15)' && U.actText({ t: 'show', cards: [6, 16] }) === '빨강·파랑 7 공개 (합 14)', 'actText 글');
  nok(recN > 150, '추천 시험이 충분히 돎 ' + recN);
  nok(['turn', 'drop', 'reveal'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(['take', 'bell', 'drop', 'show'].every(p => kinds.has(p)), '추천 종류 ' + [...kinds]);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번 · 추천 ${recN} (탱킹 ${tank}) · 복기 ${revN} (겪은 단계: ${[...phases].join(' · ')})`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (앞면 · 더미 → 카드 골라 버리기 · 벨 · 포카드 · 2:2 조합 고르기 → 공개)
async function policy(page, { step }) {
  const V = await page.evaluate(() => { const v = window.__h.view(); return { phase: v.phase, bell: v.bell, turns: v.turns }; });
  if (V.phase === 'turn') {
    const four = page.locator('[data-a=four]'); if (await four.count()) { await four.click(); return true; }
    const bell = page.locator('[data-a=bell]');
    if (V.turns >= 3 && step % 4 === 3 && (await bell.count())) { await bell.click(); return true; }
    const src = step % 2 ? 'deck' : 'up';
    let b = page.locator(`[data-a=${src}]:not([disabled])`);
    if (!(await b.count())) b = page.locator('[data-a=up]:not([disabled]),[data-a=deck]:not([disabled])').first();
    if (!(await b.count())) return false;
    await b.click(); return true;
  }
  if (V.phase === 'drop') {
    const cs = page.locator('[data-c]'), c = await cs.count(); if (!c) return false;
    await cs.nth(step % c).click();
    if (step % 5 === 0) { await cs.nth((step + 1) % c).click(); }          // 다른 카드로 바꿔 고르기
    const d = page.locator('[data-a=drop]:not([disabled])'); if (!(await d.count())) return false;
    await d.click(); return true;
  }
  if (V.phase === 'reveal') {
    const cs = page.locator('[data-c]'), c = await cs.count(); if (!c) return false;
    await cs.nth(step % c).click();                                      // 한 장 넣거나 빼 보고
    if (step % 3 === 0) await cs.nth((step + 2) % c).click();
    let s = page.locator('[data-a=show]:not([disabled])');
    if (!(await s.count()) || step % 4 === 0) { await page.locator('[data-a=best]').click(); s = page.locator('[data-a=show]:not([disabled])'); }
    if (!(await s.count())) return false;
    await s.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-c="18"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('ringbell', policy, { runs: 3, ns: [2, 4, 3], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

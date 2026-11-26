// 커트라인 화면 시험: node survival/test/cutline_ui.js [--shots 폴더] [--runs 4]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = JSON.stringify;

// 1) Node 쪽: 선생님 글은 남의 숨은 것(손패 · 뒷면 숫자 · 규칙 카드 글자와 코인 · 코인 수 · 입찰액)만 바꾼 두 장면에서 같아야 함
(() => {
  const core = require(path.join(ROOT, 'games/cutline/core.js'));
  global.window = { SVCores: { cutline: core } };
  require(path.join(ROOT, 'games/cutline/ui.js'));
  const U = global.window.SVUI.cutline;
  nok(U.board === false && U.min === 3 && U.max === 8 && U.defN === 8, '3~8명 · 한 기기 안 됨');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  const lcg = s => { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
  let recN = 0, n = 0, revN = 0; const phases = new Set();
  for (let k = 0; k < 8; k++) {
    const N = 3 + (k % 6), names = Array.from({ length: N }, (_, i) => (i ? ['악어', '진호', '민아', '출구', '언규', '성범', '스티브'][i - 1] : '나'));
    const st = core.init({ n: N, seed: 700 + k }), r = lcg(k + 21);
    for (let steps = 0; steps < 500 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      const seats = steps % 2 ? need.slice(0, 2) : [need[0], (need[0] + 1) % N];
      for (const s of seats) {
        const st2 = JSON.parse(J(st)), rr = lcg(steps * 7 + s + 1);
        for (let j = 0; j < N; j++) if (j !== s) {
          if (st.phase !== 'show') for (const b of st2.board) for (const c of b) if (c.p === j) { const alt = [1, 2, 3, 4, 5, 6].filter(v => st2.hand[j][v] > 0 && v !== c.v); if (alt.length) { const v = alt[Math.floor(rr() * alt.length)]; st2.hand[j][v]--; st2.hand[j][c.v]++; c.v = v; } }
          st2.coins[j] = Math.floor(rr() * 20); st2.letters[j] = 'ABCDEFGH'[Math.floor(rr() * 8)];
          if (st2.bids[j] != null) st2.bids[j] = Math.floor(rr() * 9);
        }
        for (const rs of st2.rules) for (const x of rs) if (x.p !== s) { x.c = 1 + Math.floor(rr() * 9); x.r = 'ABCDEFGH'[Math.floor(rr() * 8)]; }
        st2.rs = (st.rs ^ 0x7f4a7c15) >>> 0;
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names);
        nok(J(c1) === J(c2), `선생님 글이 숨은 정보로 바뀜 (자리 ${s}, ${st.phase}, ${st.round}R)`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null|\[object/.test(J(c1)), '선생님 글 이상 ' + J(c1));
        if (need.includes(s)) {   // 💡 추천 = 고급 AI 의 수 (같은 고정 난수)
          const V0 = core.view(st, s), ha = core.ai(V0, s, 'hard', core.recRnd(V0, s)); recN++;
          const want = U.actText(ha, V0, names.map((x, i) => (i === s ? '나' : x)));
          if (st.phase === 'place') nok(c1.rec === want, `추천 ≠ 고급 AI (place) ${c1.rec} vs ${want}`);
          else if (st.phase === 'bid') nok(c1.rec === (ha.c ? `코인 ${ha.c}개 입찰` : '입찰하지 않아요 (0개)'), `추천 ≠ 고급 AI (bid) ${c1.rec} vs ${ha.c}`);
          else if (st.phase === 'order') nok(c1.rec.includes(ha.ord.map(i => (i === s ? '나' : names[i])).join(' → ')), `추천 ≠ 고급 AI (order) ${c1.rec}`);
          nok(c1.why && !/undefined|NaN/.test(c1.why), `차례인데 이유가 비었음 (${st.phase})`); phases.add(st.phase);
          // 🎞️ 복기: 고급 AI 수 = sev 0, 아무 수나 → 0~100 + 숫자 이유
          const L = core.legal(st, s), my = L[Math.floor(r() * L.length)];
          const rv0 = U.review(V0, s, ha, ha, { seed: 5 }), rv1 = U.review(V0, s, my, ha, { seed: 5 });
          nok(rv0.sev === 0, '고급 AI 수인데 복기 sev ≠ 0 ' + J(rv0));
          nok(rv1.sev >= 0 && rv1.sev <= 100 && (!rv1.why || /\d/.test(rv1.why)), '복기 sev/이유 이상 ' + J(rv1));
          revN++;
          const vv = JSON.parse(J(V0)); U.coach(vv, s, -1, names); U.review(vv, s, my, ha, { seed: 5 }); nok(J(vv) === J(V0), '선생님 · 복기가 view 를 바꿈');
        }
        n++;
      }
      for (const s of need) { const a = core.ai(core.view(st, s), s, ['easy', 'normal', 'hard'][s % 3], r); nok(core.apply(st, s, a).ok, 'AI 수 ' + J(a)); }
    }
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(J(fin)), '끝난 판 선생님 글');
    const rs2 = U.result(core.view(st, 0), 0);
    nok(typeof rs2 === 'string' && /<table/.test(rs2) && !/undefined|NaN/.test(rs2), '결과 html');
    const watch = U.coach(core.view(st, 'all'), -1, -1, names);
    nok(watch.rec && !/undefined|NaN/.test(J(watch)), '구경 선생님 글');
    // actText 모양
    nok(U.actText({ t: 'bid', c: 3 }) === '순서 결정권 3코인 입찰' && U.actText({ t: 'place', cards: [{ v: 4, s: 1 }, { v: 3, s: 2 }], rule: { s: 1, c: 5 } }) === '4→B · 3→C + 규칙 카드 → B (코인 5)', 'actText 글');
  }
  nok(recN > 60, '추천 시험이 충분히 돎 ' + recN);
  nok(['bid', 'place'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(n > 300, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번 · 추천 ${recN} · 복기 ${revN} (겪은 단계: ${[...phases].join(' · ')})`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (입찰 ± → 입찰 · 순서 이름 누르기 → 확정 · 숫자 → 슬롯 → 규칙 카드 → 제출)
async function policy(page, { step }) {
  const V = await page.evaluate(() => { const v = window.__h.view(); return { phase: v.phase, need: v.need, n: v.n }; });
  if (V.phase === 'bid') {
    const p = page.locator('[data-a=bp]:not([disabled])');
    for (let k = 0; k < step % 3; k++) if (await p.count()) await p.click();
    if (step % 5 === 0 && (await page.locator('[data-a=bm]:not([disabled])').count())) await page.locator('[data-a=bm]').click();
    const b = page.locator('[data-a=bid]'); if (!(await b.count())) return false;
    await b.click(); return true;
  }
  if (V.phase === 'order') {
    for (let k = 0; k < V.n + 1; k++) {
      const o = page.locator('[data-a=op]'), c = await o.count(); if (!c) break;
      await o.nth(step % c).click();
      if (k === 1 && step % 2 === 0) { await page.locator('[data-a=or]').click(); }
    }
    const ok = page.locator('[data-a=ok]:not([disabled])'); if (!(await ok.count())) return false;
    await ok.click(); return true;
  }
  if (V.phase === 'place') {
    for (let k = 0; k < V.need; k++) {
      const hs = page.locator('[data-v]:not([disabled])'), hc = await hs.count(); if (!hc) return false;
      await hs.nth((step + k) % hc).click();
      const rows = page.locator('[data-slot]'), rc = await rows.count(); if (!rc) return false;
      await rows.nth((step * 3 + k) % rc).click();
    }
    if (step % 3 === 0) {             // 규칙 카드: 고르고 → 슬롯 → 코인 + → (가끔 취소)
      const rm = page.locator('[data-a=rm]');
      if (await rm.count()) {
        await rm.click();
        const rows = page.locator('[data-slot]'), rc = await rows.count();
        if (rc) { await rows.nth(step % rc).click(); const cp = page.locator('[data-a=cp]:not([disabled])'); if (await cp.count()) await cp.click(); }
        if (step % 9 === 0 && (await page.locator('[data-a=rx]').count())) await page.locator('[data-a=rx]').click();
      }
    }
    if (step % 7 === 0) {             // 되돌리기 한 번 → 다시 놓기
      const un = page.locator('[data-a=un]:not([disabled])');
      if (await un.count()) {
        await un.click();
        const hs = page.locator('[data-v]:not([disabled])');
        if (await hs.count()) { await hs.first().click(); const rows = page.locator('[data-slot]'); if (await rows.count()) await rows.first().click(); }
      }
    }
    const go = page.locator('[data-a=go]:not([disabled])'); if (!(await go.count())) return false;
    await go.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-v="2"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('cutline', policy, { runs: 4, ns: [8, 3, 5, 4], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

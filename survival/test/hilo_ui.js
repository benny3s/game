// 하이 앤 로우 화면 시험: node survival/test/hilo_ui.js [--shots 폴더] [--runs 4]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 선생님 글은 남이 가진 숨은 것(남은 숫자 · 숨겨 낸 카드 · 리버스 · 앞으로 나올 점수 카드)만 바꾼 두 장면에서 같아야 함
(() => {
  const core = require(path.join(ROOT, 'games/hilo/core.js'));
  global.window = { SVCores: { hilo: core } };
  require(path.join(ROOT, 'games/hilo/ui.js'));
  const U = global.window.SVUI.hilo;
  nok(U.board === false && U.min === 4 && U.max === 4, '4명 고정 · 한 기기 안 됨');
  nok(U.src && U.diff && /^방송: /.test(U.src) && U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1].startsWith('※ 방송과 다른 점'), 'howto 끝 두 줄 = 방송 출처 · 방송과 다른 점');
  const names = ['나', '범수', '치즈', '삐약'];
  let recN = 0, n = 0, phases = new Set();
  for (let k = 0; k < 14; k++) {
    const st = core.init({ n: 4, seed: 400 + k, cfg: {} });
    let rs = k + 9; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 400 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      for (const s of [0, 1, 2, 3]) {
        const st2 = JSON.parse(JSON.stringify(st));
        for (let j = 0; j < 4; j++) if (j !== s) {
          const h = st2.hand[j];
          h.nums = h.nums.map(() => 1 + Math.floor(r() * 10)); h.norm = Math.floor(r() * 8); h.rev = r() < 0.5; h.revAt = Math.floor(r() * 9);
          const sub = st2.sub[j];
          if (sub && st2.shown[j] == null) { const col = sub.n <= 5 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]; sub.n = col[Math.floor(r() * 5)]; }
        }
        for (let q = st.round; q < st2.deck.length; q++) st2.deck[q] = [2, 4, 6, 8, 10, -1, -3, -5, -7, -9][Math.floor(r() * 10)];
        st2.removed = [2, 4, 6, 8, 10, -1, -3, -5, -7, -9][Math.floor(r() * 10)]; st2.rs = (st.rs ^ 0x7f4a7c15) >>> 0;
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names), c3 = U.coach(core.view(st, 'all'), s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 숨은 정보로 바뀜 (자리 ${s}, ${st.phase}, ${st.round}R)`);
        nok(JSON.stringify(c1) === JSON.stringify(c3), `선생님 글이 남의 손패를 읽음 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        if (need.includes(s)) {   // 💡 추천 = 고급 AI 의 수 (같은 고정 난수)
          const V0 = core.view(st, s), ha = core.ai(V0, s, 'hard', core.recRnd(V0, s)); recN++;
          if (st.phase === 'play') nok(c1.rec === `${ha.n} 을(를) ${ha.s === 'R' ? '리버스' : '노멀'}로 내요`, `추천 ≠ 고급 AI (play) ${c1.rec} vs ${JSON.stringify(ha)}`);
          else if (st.phase === 'reveal') nok(c1.rec === (ha.t === 'quit' ? '포기해요' : '공개해요'), `추천 ≠ 고급 AI (reveal) ${c1.rec} vs ${ha.t}`);
          else if (st.phase === 'pass' && ha.to >= 0) nok(new RegExp(`^${names[ha.to] || (ha.to + 1) + '번'} `).test(c1.rec), `추천 ≠ 고급 AI (pass) ${c1.rec} vs ${ha.to}`);
        }
        if (need.includes(s)) { nok(c1.why, `차례인데 이유가 비었음 (${st.phase})`); phases.add(st.phase); }
        n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(JSON.stringify(fin)), '끝난 판 선생님 글');
    const rs2 = U.result(core.view(st, 0), 0);
    nok(typeof rs2 === 'string' && /가져간 점수 카드/.test(rs2) && !/undefined|NaN/.test(rs2), '결과 html');
  }
  nok(recN > 100, '추천 시험이 충분히 돎 ' + recN);
  nok(['play', 'reveal'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(n > 500, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번 (겪은 단계: ${[...phases].join(' · ')})`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (숫자 고르기 → 노멀/리버스 · 공개/포기 · 넘기기)
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'play') {
    const nums = page.locator('[data-n]'), c = await nums.count();
    if (!c) return false;
    await nums.nth(step % c).click();
    if (step % 4 === 0) await nums.nth((step + 1) % c).click();            // 고른 카드를 다시 누르거나 다른 것 고르기
    if (!(await page.locator('[data-n].sel').count())) await nums.nth(step % c).click();
    let b = page.locator(`[data-a=play][data-s=${step % 5 === 0 ? 'R' : 'N'}]:not([disabled])`);
    if (!(await b.count())) b = page.locator('[data-a=play]:not([disabled])');
    if (!(await b.count())) return false;
    await b.first().click(); return true;
  }
  if (ph === 'reveal') {
    const q = page.locator('[data-a=quit]');
    if (step % 3 === 0 && (await q.count())) { await q.click(); return true; }
    const s = page.locator('[data-a=show]');
    if (!(await s.count())) return false;
    await s.click(); return true;
  }
  if (ph === 'pass') {
    const p = page.locator('[data-a=pass]'), c = await p.count();
    if (!c) return false;
    await p.nth(step % c).click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-n="10"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('hilo', policy, { runs: 4, ns: [4, 4, 4, 4], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

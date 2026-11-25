// 수식 하이 로우 화면 시험: node survival/test/formula_ui.js [--shots 폴더] [--runs 5]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 선생님 글은 남의 숨긴 카드를 바꿔도 같아야 함 + 화면 이름 · 방송 출처
(() => {
  const core = require(path.join(ROOT, 'games/formula/core.js'));
  global.window = { SVCores: { formula: core } };
  require(path.join(ROOT, 'games/formula/ui.js'));
  const U = global.window.SVUI.formula;
  nok(U.name === '수식 하이 로우', '화면 이름 = 방송 이름 (' + U.name + ')');
  nok(U.min === 2 && U.max === 6 && U.board === false, '2~6명 · 한 기기 탭 안 됨');
  nok(typeof U.qa === 'function' && typeof U.tutorial === 'function', 'qa · tutorial 손잡이');
  const names = ['나', 'A', 'B', 'C', 'D', 'E'];
  let n = 0; const phases = new Set();
  for (let k = 0; k < 10; k++) {
    const players = [2, 3, 4, 5, 6][k % 5];
    const st = core.init({ n: players, seed: 900 + k, cfg: { rounds: 3 } });
    let rs = k + 5; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 900 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) { core.advance(st); continue; }
      for (const s of need) {
        const st2 = JSON.parse(JSON.stringify(st));
        for (let j = 0; j < players; j++) if (j !== s && st2.H[j]) st2.H[j].hid = Math.floor(r() * 44);      // 남의 숨긴 카드만 바꿈
        const c1 = U.coach(core.view(st, s), s, -1, names), c2 = U.coach(core.view(st2, s), s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 남의 숨긴 카드로 바뀜 (자리 ${s}, ${st.phase})`);
        nok(c1.opp && c1.mine && c1.rec && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        phases.add(st.phase); n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      const a = r() < 0.5 ? core.ai(core.view(st, seat), seat, 'easy', r) : L[Math.floor(r() * L.length)];
      const res = core.apply(st, seat, a);
      nok(res.ok, `동작이 안 먹음 ${JSON.stringify(a)} ${res.err}`);
    }
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(JSON.stringify(fin)), '끝난 판 선생님 글');
    nok(st.chips.reduce((a, x) => a + x, 0) + st.pot === 20 * players, `칩 합 ${st.chips} + 판돈 ${st.pot} ≠ ${20 * players}`);
  }
  nok(['bet1', 'build', 'bet2', 'declare'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(n > 150, '선생님 시험 횟수 ' + n);
  console.log(`  선생님 글 숨은 정보 시험 ${n}번 (겪은 단계: ${[...phases].join(' · ')})`);
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지 (베팅 → 식 만들기(자리 바꾸기) → 선언)
let swaps = 0;
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'bet1' || ph === 'bet2') {
    const order = step % 4 === 0 ? ['[data-a=raise]', '[data-a=call]', '[data-a=check]'] : step % 7 === 0 ? ['[data-a=fold]'] : ['[data-a=call]', '[data-a=check]'];
    for (const q of order) { const b = page.locator(q); if (await b.count()) { await b.first().click(); return true; } }
    for (const q of ['[data-a=call]', '[data-a=check]', '[data-a=fold]']) { const b = page.locator(q); if (await b.count()) { await b.first().click(); return true; } }
    return false;
  }
  if (ph === 'build') {
    const btn = page.locator('[data-a=eq]');
    if (!(await btn.count())) return false;
    // 처음 줄은 '낼 수 있는 식' 이어야 함 (0 으로 나누는 식이 처음부터 떠 있으면 안 됨)
    nok((await page.locator('.fx-eq .v.bad').count()) === 0, '처음 식 줄이 계산 안 되는 식');
    nok((await page.locator('.fx-eq').count()) === 2, '식 줄이 둘(하이 · 로우)이 아님');
    // 같은 종류 두 개를 눌러 자리를 바꿨다가 되돌림 (누르는 길을 시험)
    const tok = side => page.locator(`[data-side=${side}][data-k=n]`);
    if (step % 2 === 0 && (await tok('H').count()) === 4) {
      const before = await page.locator('.fx-eq').first().innerText();
      await tok('H').nth(0).click(); await tok('H').nth(2).click();
      const mid = await page.locator('.fx-eq').first().innerText();
      await tok('H').nth(0).click(); await tok('H').nth(2).click();
      const after = await page.locator('.fx-eq').first().innerText();
      nok(after === before, '자리 바꿨다가 되돌렸는데 식이 달라짐');
      if (mid !== before) swaps++;
    }
    // 연산자끼리 자리 바꿨다 되돌림
    const ops = page.locator('[data-side=L][data-k=o]');
    if (step % 3 === 0 && (await ops.count()) === 3) { await ops.nth(0).click(); await ops.nth(1).click(); await ops.nth(0).click(); await ops.nth(1).click(); }
    // √ 붙일 숫자 바꿈 (있을 때)
    const rt = page.locator('[data-side=H][data-root="0"]');
    if (step % 2 === 1 && (await rt.count()) > 1) { await rt.nth(1).click(); await rt.nth(0).click(); }
    if ((await page.locator('.fx-eq .v.bad').count()) > 0) return false;                 // 바뀐 식이 틀리면 누르지 않음 (정책 오류)
    // 확인 단추는 화면 안에 보여야 함
    const box = await btn.boundingBox(), vh = await page.evaluate(() => innerHeight);
    nok(box && box.y >= 0 && box.y + box.height <= vh + 1, `식 내기 단추가 화면 밖 (${box && Math.round(box.y)}~${box && Math.round(box.y + box.height)} / ${vh})`);
    await btn.click(); return true;
  }
  if (ph === 'declare') {
    const order = step % 5 === 0 ? ['S', 'H', 'L'] : step % 2 ? ['L', 'H'] : ['H', 'L'];
    for (const d of order) { const b = page.locator(`[data-a=decl][data-d=${d}]`); if (await b.count()) { await b.click(); return true; } }
    return false;
  }
  return false;
}
// 1분 규칙 3단계(직접 해 보기): 숫자 두 개를 차례로 눌러 [5 10 0 10] → [10 10 0 5] (10 + 10 − 0 ÷ 5 = 20)
async function tutPolicy(page, i, k) {
  const seq = [0, 1, 1, 3];
  if (k >= seq.length) return false;
  return page.evaluate(p => { const b = document.getElementById('tutStage').querySelector(`[data-p="${p}"]`); if (!b) return false; b.click(); return true; }, seq[k]);
}
(async () => {
  await run('formula', policy, { runs: 5, ns: [2, 4, 6, 3, 5], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

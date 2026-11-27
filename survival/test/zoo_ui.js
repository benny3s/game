// 동물원 화면 시험: node survival/test/zoo_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판 끝까지: 넘침 · 잘림 · 판 · 타일이 core 와 같은지 · 선생님 · 낙찰 · 배치 · 결과
//  ② s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 + 결과 + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  const cells = [...st.querySelectorAll('.zo-board .zo-c')];
  if (V.phase === 'setup' && !V.over) return bad;
  if (cells.length !== 25) bad.push('판 칸 ' + cells.length);
  V.board.forEach((row, r) => row.forEach((x, c) => { const t = cells[r * 5 + c] && cells[r * 5 + c].innerText.trim(); const want = x == null ? '' : window.SVCores.zoo.SP[x].em; if (t !== want) bad.push(`칸 ${r},${c} ${t}≠${want}`); }));
  if (!V.over) {
    const boxes = [...st.querySelectorAll('.zo-box')]; if (boxes.length !== 2) bad.push('그룹 상자 ' + boxes.length);
    ['A', 'B'].forEach((g, i) => { if (V.tiles[g].length && boxes[i] && boxes[i].querySelector('.t').innerText.replace(/\s/g, '').length < V.tiles[g].length) bad.push('타일 수 ' + g); });
    if (V.phase === 'bid' && V.needs.includes(h.ME) && !V.mine.bid && !st.querySelector('[data-a=bid]')) bad.push('내 차례인데 입찰 단추 없음');
    if (V.phase === 'place' && V.mine && V.mine.isWin && h.ME >= 0 && !st.querySelector('.zo-q')) bad.push('낙찰했는데 타일 단추 없음');
  } else if (!st.querySelector('.zo-tbl')) bad.push('끝났는데 점수표 없음');
  return bad;
};
const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), why: c.why, phase: V.phase }; };

async function playStep(page, step) {
  const ph = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, win: !!(V.mine && V.mine.isWin) }; });
  if (ph.phase === 'setup') { const b = page.locator('[data-a=combo]'); if (!(await b.count())) return false; if (step % 2) await page.locator('[data-mv="0:1"]').first().click(); await page.locator('[data-show="2"]').first().click(); await b.click(); return true; }
  if (ph.phase === 'bid') {
    if (!(await page.locator('[data-a=bid]').count())) return false;
    await page.locator(`.zo-box[data-g=${step % 2 ? 'A' : 'B'}]`).click();
    for (let i = 0; i < step % 4; i++) await page.locator('[data-d="1"]').click();
    await page.locator('[data-a=bid]').click(); return true;
  }
  if (ph.phase === 'place') {
    if (!ph.win) return false;
    for (let i = 0; i < 5; i++) {
      const c = (step + i) % 5, free = await page.evaluate(c => window.__h.view().board[0][c] == null, c); if (!free) continue;
      if (step % 3 === 0) { const q = page.locator('[data-q]'), n = await q.count(); if (n > 1) await q.nth(n - 1).click(); }
      await page.locator(`.zo-c.pick[data-c="${c}"]`).first().click(); return true;
    }
    return false;
  }
  return false;
}
async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me] of [[4, 0], [6, 2]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'zoo', `seed=${5 + n}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `zo-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, played = 0, coached = 0; const seen = {};
    for (let k = 1; k <= 300; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW); ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 3)}`);
      if (!seen[s.phase + s.mine]) { seen[s.phase + s.mine] = 1; await shot(`${s.phase}-${s.mine ? 'me' : 'wait'}`); }
      if (s.over) { over = true; break; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (coached < (QUICK ? 3 : 7)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 3 && vp.w === 375 && n === 4) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시(' + r.phase + '):\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      const did = await playStep(page, k); played += did ? 1 : 0;
      ok(did, `${tag} #${k}: 낼 방법이 없음 (${s.phase})`); if (!did) break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`); ok(played >= 5, `${tag}: 낸 횟수 ${played}`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/위/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 120)}`);
    await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'zoo', 'seed=4&n=4&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ cells: document.querySelectorAll('.zo-c').length, go: document.querySelectorAll('[data-a]').length }));
  ok(r.cells === 25 && r.go === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) { return playStep(page, step); }
async function tutPolicy(page) { return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-v="A"]'); if (!b) return false; b.click(); return true; }); }
(async () => {
  const f = await session('동물원 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('zoo', policy, { runs: QUICK ? 2 : 4, ns: [4, 3, 6, 5], tutPolicy });
})();

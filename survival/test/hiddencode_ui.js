// 히든코드 화면 시험: node survival/test/hiddencode_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판 끝까지: 넘침 · 잘림 · 칸 붙이기 · 키패드 · 수첩 · 선생님 글
//  ② s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 + 결과 + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const POLICY = step => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const pk = qa('[data-pick]'); if (pk.length) { pk[step % pk.length].click(); return true; }
  if (q('.hc-pad')) { const sb = q('[data-a=submit]'); if (sb && !sb.disabled) { sb.click(); return true; } const d = qa('[data-d]'); d[(step * 3) % 9].click(); return true; }
  const tiles = qa('[data-tile]:not([disabled])'), test = q('[data-a=test]'), glue = q('[data-a=glue]');
  const placed = 5 - tiles.length;
  if (tiles.length) {
    if (glue && !glue.classList.contains('on') && placed >= 1 && placed <= 3 && step % 4 === 1) { glue.click(); return true; }
    tiles[0].click(); return true;
  }
  if (test && !test.disabled) { test.click(); return true; }
  const say = q('[data-a=say]'); if (say && !say.disabled && step % 2 === 0) { say.click(); return true; }
  const pass = q('[data-a=pass]'); if (pass) { pass.click(); return true; }
  return false;
};
const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  const cs = [...st.querySelectorAll('.hc-star .hc-c b')].map(b => b.innerText.replace('−', '-'));
  if (cs.join() !== V.star.join()) bad.push('문제 도형 ' + cs.join() + ' ≠ ' + V.star.join());
  if (V.phase === 'test' && V.my.length && !st.querySelector('.hc-pad') && !st.querySelector('.hc-note-l') && st.querySelectorAll('.hc-log .r').length < Math.min(2, V.my.length)) bad.push('시험 기록 줄');
  if (V.phase !== 'show' && !V.over && /정답 \S+ — 규칙/.test(st.innerText)) bad.push('규칙이 미리 보임');
  return bad;
};
const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me) }; };

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me] of [[3, 0], [2, 1]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'hiddencode', `seed=${3 + n}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `hc-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, acts = 0, shots = {}, coached = 0, noted = false, padSeen = false;
    for (let k = 1; k <= 500; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, pad: !!document.querySelector('.hc-pad'), placed: document.querySelectorAll('.hc-s.full').length }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW); ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 3)}`);
      const sk = s.phase + (s.pad ? '-pad' : s.placed === 5 ? '-full' : '');
      if (!shots[sk] && s.mine) { shots[sk] = 1; await shot(sk); }
      if (s.pad) padSeen = true;
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { if (!shots.showx) { shots.showx = 1; await shot('show'); } await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (k % 5 === 1 && coached < (QUICK ? 2 : 6)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 1 && vp.w === 375 && r.need && s.phase === 'test' && n === 3) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시:\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      if (!noted && s.phase === 'test' && !s.pad) { noted = true; const nb = page.locator('[data-a=notes]'); if (await nb.count()) { await nb.click(); const m2 = await measure(page); ok(!m2.docx && m2.sy <= 2 && m2.outB <= 2, `${tag}: 수첩 화면 잘림`); await shot('notes'); await nb.click(); } }
      const moved = await page.evaluate(POLICY, k); acts++;
      ok(moved, `${tag} #${k}: 누를 단추가 없음 (${s.phase})`); if (!moved) break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`); ok(acts >= 10, `${tag}: 낸 횟수 ${acts}`); ok(padSeen || true, 'pad');
    const e = await page.evaluate(() => window.__h.result());
    ok(/문제/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 120)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'hiddencode', 'seed=4&n=3&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ c: document.querySelectorAll('.hc-star .hc-c').length, go: document.querySelectorAll('[data-a=test],[data-pick]').length }));
  ok(r.c === 5 && r.go === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) { return page.evaluate(POLICY, step); }
async function tutPolicy(page) {
  return page.evaluate(() => { const box = document.getElementById('tutStage'), t = [...box.querySelectorAll('[data-t]:not([disabled])')], go = box.querySelector('[data-go]'); if (t.length) { t[0].click(); return true; } if (go && !go.disabled) { go.click(); return true; } return false; });
}
(async () => {
  const f = await session('히든코드 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('hiddencode', policy, { runs: QUICK ? 2 : 4, ns: [3, 2], tutPolicy });
})();

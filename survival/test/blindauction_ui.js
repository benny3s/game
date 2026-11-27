// 블라인드 경매 화면 시험: node survival/test/blindauction_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판 끝까지: 넘침 · 잘림 · 큐브/카드 단추 · 선생님 글
//  ② s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 + 결과 + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const POLICY = step => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const cards = qa('[data-card]:not([disabled])'); if (cards.length) { cards[(step * 7) % cards.length].click(); return true; }
  const bid = q('[data-a=bid]'), pass = q('[data-a=pass]');
  if (bid) {
    if (!bid.disabled && step % 4 !== 0) { bid.click(); return true; }
    if (step % 5 === 0 && pass) { pass.click(); return true; }
    const c = qa('.ba-cubes .btn:not(.sel)'); if (bid.disabled && c.length) { c[0].click(); return true; }
    if (pass) { pass.click(); return true; }
  }
  const sb = q('[data-a=sbid]');
  if (sb) { if (sb.disabled) { const c = qa('.ba-cubes .btn:not(.sel)'); c[(step * 3) % c.length].click(); return true; } sb.click(); return true; }
  const mine = qa('[data-mine]'); if (mine.length && !q('[data-mine].sel')) { mine[0].click(); return true; }
  const take = qa('[data-take]:not([disabled])'); if (take.length && step % 3 !== 0) { take[0].click(); return true; }
  const keep = q('[data-a=keep]'); if (keep) { keep.click(); return true; }
  return false;
};
const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  const rows = st.querySelectorAll('.ba-p .r').length; if (!V.over && rows !== V.n) bad.push('플레이어 줄 ' + rows + ' ≠ ' + V.n);
  if (V.phase === 'bid' && V.needs.includes(h.ME) && st.querySelectorAll('.ba-cubes .btn').length !== V.hand.length) bad.push('큐브 단추 수');
  if (V.phase === 'pick' && !V.over && st.querySelectorAll('.ba-cards .btn:not(.gone)').length !== V.left) bad.push('남은 카드 수');
  const txt = st.innerText; if (V.phase !== 'show' && !V.over && /값은 낙찰자만 알아요/.test(txt) === false && V.phase === 'bid') bad.push('값 안내 줄');
  if (/[0-9]{6,}/.test(txt)) bad.push('물품 값 같은 큰 숫자가 보임');
  return bad;
};
const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me) }; };

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me] of [[4, 0], [3, 1], [5, 2]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'blindauction', `seed=${3 + n}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (vp.w === 375 && n === 4) await page.screenshot({ path: path.join(SH, `ba-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, acts = 0, shots = {}, coached = 0;
    for (let k = 1; k <= 600; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, sel: document.querySelectorAll('.ba-cubes .btn.sel').length }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW); ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 3)}`);
      const sk = s.phase + (s.sel ? '-sel' : '');
      if (!shots[sk] && s.mine) { shots[sk] = 1; await shot(sk); }
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { if (!shots.showx) { shots.showx = 1; await shot('show'); } await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (k % 6 === 1 && coached < (QUICK ? 3 : 8)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 2 && vp.w === 375 && r.need && s.phase === 'bid') { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시:\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      const moved = await page.evaluate(POLICY, k); acts++;
      ok(moved, `${tag} #${k}: 누를 단추가 없음 (${s.phase})`); if (!moved) break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`); ok(acts >= 8, `${tag}: 낸 횟수 ${acts}`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/위/.test(e) && /억/.test(e), `${tag}: 결과 글 ${e.slice(0, 120)}`);
    if (vp.w === 375 && n === 4) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  const { page, errs, close } = await open(browser, base, 'blindauction', 'seed=4&n=4&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ rows: document.querySelectorAll('.ba-top').length, go: document.querySelectorAll('[data-card]:not([disabled]),[data-a=bid]').length }));
  ok(r.rows === 1 && r.go === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) { return page.evaluate(POLICY, step); }
async function tutPolicy(page) {
  return page.evaluate(() => { const box = document.getElementById('tutStage'), t = [...box.querySelectorAll('[data-t]:not([disabled])')], go = box.querySelector('[data-go]'); if (go && !go.disabled) { go.click(); return true; } if (t.length) { const last = t.filter(b => !b.classList.contains('sel')); (last[last.length - 1] || t[0]).click(); return true; } return false; });
}
(async () => {
  const f = await session('블라인드 경매 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('blindauction', policy, { runs: QUICK ? 2 : 4, ns: [4, 3], tutPolicy });
})();

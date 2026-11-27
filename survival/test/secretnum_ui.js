// 시크릿 넘버 화면 시험: node survival/test/secretnum_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판 끝까지: 넘침 · 잘림 · 수첩 · 티켓 수가 core 와 같은지 · 선생님(창 열고) · 답안지 · 번호 공개
//  ② s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 + 결과 + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  if (V.over) { if (!st.querySelector('.sn-mat')) bad.push('끝났는데 번호 공개표 없음'); else if (st.querySelectorAll('.sn-mat .row').length !== V.n + 2) bad.push('공개표 줄 수'); return bad; }
  if (V.phase === 'sheet') { if (V.needs.includes(h.ME) && st.querySelectorAll('.sn-cell input').length !== V.n) bad.push('답안지 칸 수'); return bad; }
  const m = V.mine; if (!m) return bad;
  const tks = [...st.querySelectorAll('.sn-tks span')].map(x => +x.innerText.replace(/\D/g, '').slice(-1));
  if (tks.length !== 4 || tks.some((t, i) => t !== m.tk[['add', 'mul', 'div', 'zero'][i]])) bad.push('티켓 수 ' + tks);
  const rows = st.querySelectorAll('.sn-note .r').length; if (rows !== Math.max(1, m.facts.length)) bad.push(`수첩 ${rows} ≠ ${m.facts.length}`);
  if (st.querySelectorAll('.sn-pairs .sn-pr:not(.sit)').length !== V.pairs.length) bad.push('짝 수');
  if (V.needs.includes(h.ME) && V.phase === 'meet' && V.mine.mate >= 0 && !st.querySelector('.sn-tkbtn')) bad.push('내 차례인데 티켓 단추 없음');
  return bad;
};
const COACH = () => { const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me); const c = U.coach(V, me, -1, h.seats.map(s => s.name)); return { text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), why: c.why, phase: V.phase }; };

async function playStep(page, step) {
  // 내 차례: 짝이 있으면 티켓 하나 골라 내기, 답안지면 일부만 적기
  const info = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, sheet: !!document.querySelector('.sn-cell input') }; });
  if (info.sheet) {
    const ins = page.locator('.sn-cell input'), n = await ins.count();
    for (let i = 0; i < n; i++) if ((i + step) % 3 === 0) await ins.nth(i).fill(String(1 + ((i * 7 + step) % 30)));
    await page.locator('[data-a=sheet]').click(); return true;
  }
  const ks = page.locator('.sn-tkbtn button[data-k]:not([disabled]):not([data-k=pass])'), nk = await ks.count();
  if (!nk) { const ps = page.locator('[data-k=pass]'); if (await ps.count()) { await ps.click(); return true; } return false; }
  await ks.nth(step % nk).click();
  await page.locator('[data-a=go]').click(); return true;
}

async function extras({ browser, base, ok }) {
  let shown = 0;
  for (const vp of VPS) for (const [n, me, cfg] of [[5, 0, ''], [8, 3, '&cfg_rounds=6']]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'secretnum', `seed=${5 + n}&n=${n}&me=${me}${cfg}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 375) await page.screenshot({ path: path.join(SH, `sn-${vp.w}x${vp.h}-n${n}-${name}.png`) }); };
    let over = false, shows = 0, played = 0, coached = 0, sheetSeen = false, coachOpen = false;
    for (let k = 1; k <= 200; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, hasPick: !!(V.mine && V.mine.mate >= 0 && V.mine.pick == null) }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW); ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 3)}`);
      if (k === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') { shows++; if (shows === 1) await shot('show'); await page.evaluate(() => window.__h.next()); continue; }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (s.phase === 'sheet' && !sheetSeen) { sheetSeen = true; await shot('sheet'); }
      if (k % 3 === 1 && coached < (QUICK ? 2 : 5)) {
        const r = await page.evaluate(COACH); coached++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && /%|개/.test(r.why + r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 160)}`);
        if (shown < 2 && vp.w === 375 && r.need && n === 5) { shown++; const c = await page.evaluate(() => window.__h.coach()); console.log('· 선생님 예시(' + r.phase + '):\n   👀', c.opp, '\n   📊', c.mine, '\n   💡', c.rec, '\n   👉', c.why); }
      }
      if (k === 2 && me === 0) await shot('mine');
      const did = await playStep(page, k); played += did ? 1 : 0;
      ok(did, `${tag} #${k}: 낼 방법이 없음`);
      if (!did) break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`); ok(played >= 3, `${tag}: 낸 횟수 ${played}`);
    const e = await page.evaluate(() => window.__h.result());
    ok(/위/.test(e) && /점/.test(e), `${tag}: 결과 글 ${e.slice(0, 120)}`);
    await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 선생님 창이 열린 채로 (fitCoach 시뮬: stage 아래를 비움) 단추가 보이는지는 shell_ui 가 시험 — 여기서는 구경꾼 · 눈에 안 보이는 것만
  const { page, errs, close } = await open(browser, base, 'secretnum', 'seed=4&n=5&me=-1', VPS[2]);
  const r = await page.evaluate(() => ({ pairs: document.querySelectorAll('.sn-pr').length + document.querySelectorAll('.sn-mat .row').length, go: document.querySelectorAll('[data-a=go]').length, tk: document.querySelectorAll('.sn-tkbtn').length }));
  ok(r.pairs >= 2 && r.go === 0 && r.tk === 0, `구경꾼 화면 ${JSON.stringify(r)}`);
  for (const x of errs) ok(false, `구경꾼: ${x}`); await close();
}
async function policy(page, { step }) { return playStep(page, step); }
async function tutPolicy(page) {
  return page.evaluate(() => { const box = document.getElementById('tutStage'), b = box.querySelector('[data-v="37"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  const f = await session('시크릿 넘버 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('secretnum', policy, { runs: QUICK ? 2 : 4, ns: [5, 4, 8, 6], tutPolicy, query: r => (r % 2 ? 'cfg_sets=1' : '') });
})();

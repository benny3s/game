// 숫자장기 화면 시험: node survival/test/gn-numchess_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판을 단추로: 넘침 · 판 54칸 · 마이너스 표시 18곳 · 말 값 = 상태(상대 숨은 말은 빈 뒷면) ·
//     판 방향(내 진영이 왼쪽) · 배치 바꾸기 · 추천 배치 · 말 고르기 → 갈 칸 점 · 다시 눌러 풀기 · 대결 아이템 · 되살리기 · 누르는 크기 44px · 판 칸 28px
//  ② 안 움직인 말 표시 옵션 · 60초 제한(시계 빨리 감기 → 시간 초과 패배) · 구경꾼(me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');
const ID = 'gn-numchess';

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const board = st.querySelector('.nc-board'); if (!board) return ['판 없음'];
  const cells = [...board.querySelectorAll('.nc-cl')];
  if (cells.length !== 54) bad.push('칸 ' + cells.length);
  const mb = board.querySelectorAll('.nc-cl.mb').length; if (mb !== 18) bad.push('마이너스 표시 ' + mb);
  const persp = me === 1 ? 1 : 0;
  if (+cells[0].dataset.c !== (persp ? 53 : 0)) bad.push('판 방향 ' + cells[0].dataset.c);
  const left = cells.filter((c, i) => i % 9 < 3).every(c => c.classList.contains('ca'));
  if (!left) bad.push('내 진영이 왼쪽이 아님');
  const word = v => (v == null ? '' : v === 11 ? '💣' : v === 12 ? '👑' : String(v));
  if (V.phase !== 'setup' || V.over) {
    const live = V.pcs.filter(p => !p.out && p.c >= 0);
    const els = board.querySelectorAll('.nc-cl > .nc-pc');
    if (els.length !== live.length) bad.push(`말 ${els.length} ≠ ${live.length}`);
    for (const p of live) {
      const el = board.querySelector(`.nc-cl[data-c="${p.c}"] > .nc-pc`);
      if (!el) { bad.push('말 없음 ' + p.c); continue; }
      const t = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : '';
      if (t !== word(p.v)) bad.push(`말 값 ${p.c}: ${t} ≠ ${word(p.v)}`);
      if (!el.classList.contains(p.s === persp ? 'a' : 'b')) bad.push('말 색 ' + p.c);
      if (p.s !== persp && p.v == null && !el.classList.contains('hid')) bad.push('숨은 말 뒷면 ' + p.c);
    }
  } else if (me >= 0 && !V.over) {
    const n = board.querySelectorAll('.nc-cl > .nc-pc').length;
    if (n !== 14) bad.push('배치 말 ' + n);
  }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  if (!can && st.querySelector('.nc-act button')) bad.push('내 차례가 아닌데 단추');
  if (can && V.phase === 'play' && !st.querySelector('.nc-cl.pk')) bad.push('누를 말 없음');
  return bad;
};
const SIZES = () => {
  const s = [...document.querySelectorAll('#stage .nc-act button')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.a || b.dataset.it || b.dataset.dead, Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
  const c = document.querySelector('#stage .nc-cl'); const r = c && c.getBoundingClientRect();
  if (r && (r.width < 28 || r.height < 28)) s.push(['칸', Math.round(r.width), Math.round(r.height)]);
  return s;
};
const COACH = () => {
  const h = window.__h, C = h.C, me = h.ME, V = C.view(h.st(), me);
  const c = h.U.coach(V, me, -1, h.seats.map(s => s.name)), a = C.ai(V, me, 'hard', () => 0.5);
  const recOk = V.phase !== 'play' || !a || c.rec.includes(`${C.cellName(a.from)} → ${C.cellName(a.to)}`);
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk };
};
const LAST = () => { const h = window.__h, V = h.C.view(h.st(), 'all'); const L = V.log.filter(e => e.k === 'mv' && e.s === h.ME).pop(); return L ? { from: L.from, to: L.to, i: L.i } : null; };

async function doAct(page, phase, a) {
  const click = sel => page.locator(sel).first().click();
  if (!a) return false;
  if (phase === 'setup') { await click('[data-a="lay"]'); return true; }
  if (phase === 'play') { await click(`.nc-cl[data-c="${a.from}"]`); await click(`.nc-cl[data-c="${a.to}"]`); return true; }
  if (phase === 'item') {
    if (!a.use || !a.use.length) { await click('[data-a="noitem"]'); return true; }
    for (const u of a.use) {
      const r = await page.evaluate(id => { const el = document.querySelector('#stage .nc-cl.tgs'); return { cur: el ? +el.dataset.c : -1, pc: window.__h.view().pcs[id].c }; }, u.id);
      if (r.cur !== r.pc) await click(`.nc-cl[data-c="${r.pc}"]`);
      await click(`[data-it="${u.k}"]`);
    }
    await click('[data-a="item"]'); return true;
  }
  if (phase === 'revive') {
    if (a.skip) { await click('[data-a="keep"]'); return true; }
    await click(`[data-dead="${a.id}"]`); await click(`.nc-cl[data-c="${a.to}"]`); return true;
  }
  return false;
}

async function extras({ browser, base, ok }) {
  let sample = 0;
  const seen = { item: 0, revive: 0, fight: 0, setupSwap: 0, sel: 0 };
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, ID, `seed=${5 + me * 3 + (vp.w % 7)}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 390) await page.screenshot({ path: path.join(SH, `nc-${vp.w}x${vp.h}-me${me}-${name}.png`) }); };
    const shown = new Set();
    let over = false, moves = 0, k = 0, coachN = 0, sizeN = 0;
    for (k = 1; k <= 420; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, ply: V.ply, fights: V.log.filter(e => e.k === 'fight').length }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)} (${s.phase})`);
      const key = s.phase + (s.mine ? '-me' : '') + (s.phase === 'play' && s.fights > 2 ? '-mid' : '');
      if (!shown.has(key)) { shown.add(key); await shot(key); }
      if (s.over) { over = true; break; }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
      if (sizeN < 6) { const z = await page.evaluate(SIZES); sizeN++; ok(!z.length, `${tag} #${k}: 누르는 크기 모자람 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachN < (QUICK ? 2 : 4) && s.phase !== 'setup' || coachN === 0) {
        const r = await page.evaluate(COACH); coachN++;
        ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(을\)/.test(r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 220)}`);
        if (sample < 3 && vp.w === 375 && s.phase !== 'setup') { sample++; console.log(`· 선생님 글 예시 (${s.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
      if (s.phase === 'setup') {
        // 두 칸 바꾸기 → 추천 배치로 되돌리기 → 완료
        const pick = await page.evaluate(me2 => { const C = window.__h.C; return [C.slotCell(me2, 0), C.slotCell(me2, 5)]; }, me);
        const val = c => page.evaluate(cc => { const el = document.querySelector(`#stage .nc-cl[data-c="${cc}"] > .nc-pc`); return el ? el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : '' : '·'; }, c);
        const b0 = await val(pick[0]), b1 = await val(pick[1]);
        await page.locator(`.nc-cl[data-c="${pick[0]}"]`).click();
        const selOk = await page.evaluate(cc => document.querySelector(`#stage .nc-cl[data-c="${cc}"]`).classList.contains('sel'), pick[0]);
        await page.locator(`.nc-cl[data-c="${pick[1]}"]`).click();
        const a0 = await val(pick[0]), a1 = await val(pick[1]);
        ok(selOk && a0 === b1 && a1 === b0, `${tag}: 배치 두 칸 바꾸기 ${b0}/${b1} → ${a0}/${a1}`);
        if (!seen.setupSwap++) await shot('setup-swap');
        await page.locator('[data-a="rec"]').click();
        ok((await val(pick[0])) === b0, `${tag}: 추천 배치로 되돌림`);
        await page.locator('[data-a="lay"]').click();
        const lay = await page.evaluate(() => window.__h.C.view(window.__h.st(), window.__h.ME).lay);
        ok(lay && JSON.stringify(lay) === JSON.stringify(a.lay), `${tag}: 낸 배치 = 추천 배치 (고급 AI)`);
        continue;
      }
      if (s.phase === 'play') {
        if (seen.sel < 4) {                                // 고르기 → 갈 칸 점 → 다시 눌러 풀기
          await page.locator(`.nc-cl[data-c="${a.from}"]`).click();
          const r = await page.evaluate(f => { const h = window.__h, V = h.view(), C = h.C, g = Array(54).fill(-1); V.pcs.forEach(p => { if (!p.out && p.c >= 0) g[p.c] = p.id; }); const p = V.pcs[g[f]]; return { sel: [...document.querySelectorAll('#stage .nc-cl.sel')].map(e => +e.dataset.c), dst: [...document.querySelectorAll('#stage .nc-cl.dst')].map(e => +e.dataset.c).sort((x, y) => x - y), want: C.destOf(g, h.ME, f, p.v).sort((x, y) => x - y) }; }, a.from);
          ok(JSON.stringify(r.sel) === JSON.stringify([a.from]) && JSON.stringify(r.dst) === JSON.stringify(r.want), `${tag} #${k}: 말 고르기 · 갈 칸 ${JSON.stringify(r)}`);
          if (seen.sel === 0) await shot('selected');
          await page.locator(`.nc-cl[data-c="${a.from}"]`).click();
          const r2 = await page.evaluate(() => document.querySelectorAll('#stage .nc-cl.sel,#stage .nc-cl.dst').length);
          ok(r2 === 0, `${tag} #${k}: 다시 눌러 풀기 ${r2}`);
          seen.sel++;
        }
        await doAct(page, 'play', a);
        const L = await page.evaluate(LAST);
        ok(L && L.from === a.from && L.to === a.to, `${tag} #${k}: 이동 기록 ${JSON.stringify(L)} ≠ ${JSON.stringify(a)}`);
        moves++;
        continue;
      }
      if (s.phase === 'item') {
        if (!seen.item++) await shot('item');
        const r = await page.evaluate(() => [...document.querySelectorAll('#stage [data-it]')].map(b => b.dataset.it).join(','));
        ok(r === 'p,m,b', `${tag} #${k}: 아이템 단추 ${r}`);
      }
      if (s.phase === 'revive' && !seen.revive++) await shot('revive');
      await doAct(page, s.phase, a);
    }
    ok(over, `${tag}: 게임이 끝나지 않음 (${k}걸음)`);
    ok(moves >= 3, `${tag}: 이동 ${moves}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.nc-st').innerText, res: h.result(), btn: t.querySelectorAll('.nc-act button').length, hid: t.querySelectorAll('.nc-pc.hid').length }; });
    ok(/(이겼어요|졌어요|무승부)/.test(e.st) && /모든 말 공개/.test(e.st) && /(🏆|🤝)/.test(e.res) && e.btn === 0 && e.hid === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  ok(seen.item > 0, `한 번 이상 아이템 단계를 눌러 봄 (${seen.item})`);
  console.log(`· 화면 시험 중 단계: 아이템 ${seen.item} · 되살리기 ${seen.revive}`);

  // 안 움직인 말 표시 (옵션)
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=8&me=0&cfg_marks=1', VPS[0]);
    await page.evaluate(() => { const h = window.__h; const a = h.C.ai(h.view(), 0, 'hard'); h.act(a); });
    const r = await page.evaluate(() => { const h = window.__h, V = h.view(); return { dots: document.querySelectorAll('#stage .nc-pc .um').length, want: V.pcs.filter(p => p.s === 1 && !p.out && p.v == null && !p.mv).length }; });
    ok(r.want > 5 && r.dots === r.want, `안 움직인 말 표시 ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `표시 옵션: ${x}`);
    await close();
  }
  // 60초 제한: 시계를 빨리 감으면 시간 초과로 짐
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.clock.install();
    await page.goto(`${base}survival/test/s3ui_harness.html?g=${ID}&seed=12&me=0&cfg_limit=60`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
    await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
    await page.locator('[data-a="lay"]').click();
    let s = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, mine: V.needs.includes(0), bar: !!document.querySelector('#stage .nc-tbar'), cd: (document.querySelector('#stage [data-cd]') || {}).textContent }; });
    ok(s.phase === 'play' && s.mine && s.bar && s.cd === '60', `60초 제한: 막대 · 초 ${JSON.stringify(s)}`);
    await page.clock.runFor(30000);
    s = await page.evaluate(() => ({ over: window.__h.view().over, cd: (document.querySelector('#stage [data-cd]') || {}).textContent }));
    ok(!s.over && +s.cd <= 30 && +s.cd >= 29, `30초 뒤 남은 초 ${JSON.stringify(s)}`);
    await page.clock.runFor(31000);
    s = await page.evaluate(() => { const V = window.__h.view(); return { over: V.over, why: V.res && V.res.why, w: V.res && V.res.w, st: document.querySelector('#stage .nc-st').innerText }; });
    ok(s.over && s.why === 'time' && s.w === 1 && /졌어요/.test(s.st), `60초가 지나면 시간 초과 패배 ${JSON.stringify(s)}`);
    for (const x of errs) ok(false, `시간 제한: ${x}`);
    await ctx.close();
  }
  // 구경꾼 — 공개된 값만 보이고 단추 없음
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => {
      const h = window.__h, C = h.C, st = h.st(), f = C.init({ n: 2, seed: 4, cfg: {} });
      Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f);
      let g = 0; const r = () => 0.3;
      while (!C.over(st) && g++ < 400 && st.log.filter(e => e.k === 'fight').length < 3) { const s = C.needs(st)[0]; C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r)); }
      h.render();
    });
    const r = await page.evaluate(() => { const h = window.__h, V = h.view(); return { btn: document.querySelectorAll('#stage .nc-act button').length, nums: [...document.querySelectorAll('#stage .nc-pc')].filter(e => e.firstChild && e.firstChild.nodeType === 3).length, rev: V.pcs.filter(p => !p.out && p.c >= 0 && p.rev).length, over: V.over }; });
    const d = await page.evaluate(DRAW);
    const m = await measure(page);
    ok(r.btn === 0 && (r.over || r.nums === r.rev) && !d.length && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${d.slice(0, 3)}`);
    await page.screenshot({ path: path.join(SH, 'nc-360x640-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const s = await page.evaluate(st => { const h = window.__h, V = h.view(); return { phase: V.phase, a: h.C.ai(V, h.ME, st % 2 ? 'hard' : 'normal', h.rnd) }; }, step);
  if (!s.a) return false;
  return doAct(page, s.phase, s.a);
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('.nc-cl[data-c="4"]'); if (w) { w.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; } }   // 먼저 2 옆 칸 (7 이 짐)
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, k);
}

(async () => {
  const f = await session('숫자장기 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run(ID, policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1' : ''), ns: [2, 2, 2] });
})();

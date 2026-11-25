// 나인 멘스 모리스 화면 시험: node survival/test/morris_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 경기를 두며 넘침 · 판 그림이 core 와 같은지 · 놓기/옮기기/빼기 표시 · '!' · '★'
//  ② 빼기 장면: 빨간 테 = 뺄 수 있는 말만, 밀에 든 말을 누르면 안 빠지고 쪽지만, 맞는 말을 누르면 빠짐
//  ③ 판 사이 · 끝 장면 글 · 결과 html
//  ④ s3ui_lib 로 화면 단추만 눌러 경기 끝까지 (단판 · 3판, 내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 판을 그대로 그리는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const pts = [...st.querySelectorAll('.mo-board .mo-p')];
  if (pts.length !== 24) bad.push('점 ' + pts.length);
  pts.forEach(p => {
    const i = +p.dataset.c, pc = p.querySelector('.mo-pc'), c = V.cells[i];
    if (!!pc !== !!c) bad.push('말 있음/없음 ' + i);
    else if (pc && pc.classList.contains('b') !== (c === 1)) bad.push('색 ' + i);
  });
  const L = h.C.legal(V, me), can = V.needs.includes(me) && !V.over && V.phase === 'play';
  const sorted = a => [...a].sort((x, y) => x - y);
  const got = q => sorted([...st.querySelectorAll(q)].map(x => +x.dataset.c));
  if (can && !V.rem && V.hand[me] > 0 && JSON.stringify(got('.mo-p.pl')) !== JSON.stringify(sorted(L.map(a => a.to)))) bad.push('놓기 표시');
  if (can && !V.rem && V.hand[me] === 0 && JSON.stringify(got('.mo-p.mv')) !== JSON.stringify(sorted(new Set(L.map(a => a.from))))) bad.push('옮길 말 표시');
  if (can && V.rem && JSON.stringify(got('.mo-p.rm')) !== JSON.stringify(sorted(L.map(a => a.at)))) bad.push('빼기 표시');
  const dots = st.querySelectorAll('.mo-hand .ds i');
  if (dots.length !== V.hand[0] + V.hand[1]) bad.push(`놓을 말 점 ${dots.length} ≠ ${V.hand[0] + V.hand[1]}`);
  return bad;
};
const MARKS = () => {                         // 선생님 창이 열렸을 때만 '!'(상대 밀 자리) · '★'(내 밀 자리)
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const want = { bang: [...new Set(C.threatsOf(V.cells, V.hand, 1 - me).map(t => t.empty))].sort((a, b) => a - b), star: [...new Set(C.threatsOf(V.cells, V.hand, me).map(t => t.empty))].filter(x => !C.threatsOf(V.cells, V.hand, 1 - me).some(t => t.empty === x)).sort((a, b) => a - b) };
  const mk = on => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: on, g: 1, wait: false, sfx() {}, toast() {} });
    const cells = q => [...d.querySelectorAll(q)].map(x => +x.parentElement.dataset.c).sort((a, b) => a - b); return { bang: cells('.mo-bang'), star: cells('.mo-star') }; };
  return { want, on: V.phase === 'play' && !V.over ? mk(true) : { bang: [], star: [] }, off: mk(false), play: V.phase === 'play' && !V.over };
};
const COACH = () => {                         // 선생님 글: 빈칸 · undefined 없음, 추천 수는 규칙 안
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, Math.max(-1, V.log.length ? V.log[V.log.length - 1].i - 3 : -1), h.seats.map(s => s.name));
  const r = C.recommend(V, me), legal = C.legal(V, me).map(a => JSON.stringify(a));
  return { c, recOk: !r || legal.includes(JSON.stringify(r.a)), text: c.opp + c.mine + c.rec + c.why };
};

async function extras({ browser, base, ok }) {
  let sampleShown = false;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'morris', `seed=${7 + me * 5}&me=${me}&cfg_bo=3`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `mo-${vp.w}x${vp.h}-${name}.png`) }); };
    let selTested = 0, markTested = 0, coachTested = 0, rmSeen = 0, moveSeen = 0, between = 0, over = false;
    for (let n = 1; n <= 400; n++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME) && V.phase === 'play', phase: V.phase, rem: V.rem, hand: V.hand[h.ME], round: V.round }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${n}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${n}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${n}: undefined/NaN 글`);
      if (n === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'between') {
        between++;
        const t = await page.evaluate(() => document.querySelector('.mo-info').innerText);
        ok(/판/.test(t) && /(승|무승부)/.test(t) && /곧/.test(t), `${tag}: 판 사이 글 '${t}'`);
        if (between === 1) await shot('between');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { await page.evaluate(() => window.__h.next()); continue; }
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${n}: 화면이 판과 다름 ${d}`);
      if (s.rem) {
        rmSeen++;
        if (rmSeen === 1) await shot('remove');
        // 밀에 든 상대 말을 누르면 안 빠짐 (있을 때만)
        const r = await page.evaluate(() => { const h = window.__h, V = h.view(), C = h.C, opp = 1 - h.ME; const can = C.removable(V.cells, opp);
          const locked = []; for (let p = 0; p < 24; p++) if (V.cells[p] === opp + 1 && !can.includes(p)) locked.push(p); return { locked, can }; });
        if (r.locked.length) {
          const before = await page.evaluate(() => JSON.stringify(window.__h.view().cells));
          await page.locator(`.mo-p[data-c="${r.locked[0]}"]`).click();
          const after = await page.evaluate(() => ({ cells: JSON.stringify(window.__h.view().cells), err: window.__h.lastErr() }));
          ok(after.cells === before && /밀/.test(after.err), `${tag} #${n}: 밀에 든 말을 눌렀는데 빠지거나 쪽지 없음 (${after.err})`);
        }
      }
      // 내 말을 누르면 선택 · 갈 곳 표시가 core.legal 과 같고, 다시 누르면 취소
      if (!s.rem && s.hand === 0 && selTested < 4) {
        const mv = page.locator('.mo-p.mv'), k = await mv.count();
        if (k) {
          moveSeen++;
          await mv.nth(n % k).click(); selTested++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.view(), sel = [...document.querySelectorAll('.mo-p.sel')].map(x => +x.dataset.c);
            const tg = [...document.querySelectorAll('.mo-p.tg')].map(x => +x.dataset.c).sort((a, b) => a - b);
            const want = sel.length ? h.C.legal(V, h.ME).filter(a => a.t === 'move' && a.from === sel[0]).map(a => a.to).sort((a, b) => a - b) : [];
            return { sel, tg, want }; });
          ok(r.sel.length === 1 && JSON.stringify(r.tg) === JSON.stringify(r.want) && r.tg.length > 0, `${tag} #${n}: 말 선택 표시가 규칙과 다름 ${JSON.stringify(r)}`);
          const mm = await measure(page); ok(!mm.docx && !mm.sx && mm.sy <= 2, `${tag} #${n}: 선택 중 화면 넘침`);
          if (selTested === 1) await shot('selected');
          await page.locator('.mo-p.sel').click();
          const after = await page.evaluate(() => ({ sel: document.querySelectorAll('.mo-p.sel').length, tg: document.querySelectorAll('.mo-p.tg').length }));
          ok(after.sel === 0 && after.tg === 0, `${tag} #${n}: 같은 말을 다시 눌러도 선택이 안 풀림`);
        }
      }
      if (n % 3 === 0 && markTested < 14) {
        const r = await page.evaluate(MARKS); markTested++;
        ok(r.off.bang.length === 0 && r.off.star.length === 0, `${tag} #${n}: 선생님 창이 닫혔는데 ! ★ 표시`);
        ok(JSON.stringify(r.on) === JSON.stringify(r.want), `${tag} #${n}: ! ★ 표시가 밀 자리와 다름 ${JSON.stringify(r)}`);
      }
      if (n % 4 === 1 && coachTested < (QUICK ? 3 : 8)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 30 && !/undefined|NaN|null|\[object/.test(r.text), `${tag} #${n}: 선생님 글 이상 ${r.text.slice(0, 160)}`);
        if (!sampleShown && /밀/.test(r.text) && s.hand === 0) { sampleShown = true; console.log('· 선생님 글 예시 (옮기기 단계):\n   👀', r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      // 내 수 (AI 수를 core 에 직접 — 이 시험은 화면 배치가 목적, 단추 놀이는 ④ 가 함)
      const a = await page.evaluate(() => { const h = window.__h; return h.act(h.C.ai(h.view(), h.ME, 'normal', h.rnd)).ok; });
      ok(a, `${tag} #${n}: AI 수가 안 먹음`);
    }
    ok(over, `${tag}: 경기가 끝나지 않음`);
    ok(between >= 1, `${tag}: 판 사이 장면이 없음`);
    if (me === 0 && vp.w === 375) {
      const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { info: t.querySelector('.mo-info').innerText, res: h.result(), cls: t.querySelector('.mo-info').className }; });
      ok(/승리|무승부/.test(e.info) && /판 승/.test(e.res) && /1판/.test(e.res), `${tag}: 끝 글 · 결과 글 ${e.info} / ${e.res.slice(0, 120)}`);
      await shot('end');
    }
    for (const e of errs) ok(false, `${tag}: ${e}`);
    await close();
  }

  // ② 빼기 장면을 직접 만들어 단추로: 밀 완성 → 밀에 든 말 (안 빠짐) → 맞는 말 (빠짐)
  for (const vp of VPS.slice(0, 2)) {
    const tag = `빼기-${vp.w}x${vp.h}`;
    const { page, errs, close } = await open(browser, base, 'morris', 'seed=3&me=0', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st();
      st.cells.fill(0); [0, 1].forEach(p => { st.cells[p] = 1; }); [3, 4, 5, 13].forEach(p => { st.cells[p] = 2; });
      st.hand = [5, 5]; st.turn = 0; st.rem = false; st.mill = null; st.phase = 'play'; st.over = false;
      h.render();
    });
    await page.locator('.mo-p.pl[data-c="2"]').click();
    let r = await page.evaluate(() => { const h = window.__h, V = h.view(), t = document.getElementById('stage');
      return { rem: V.rem, turn: V.turn, rm: [...t.querySelectorAll('.mo-p.rm')].map(x => +x.dataset.c), ml: [...t.querySelectorAll('.mo-p.ml')].map(x => +x.dataset.c).sort((a, b) => a - b), line: t.querySelectorAll('svg line.ml').length, info: t.querySelector('.mo-info').innerText, pill: t.querySelector('.mo-pill').innerText }; });
    ok(r.rem && r.turn === 0 && JSON.stringify(r.rm) === '[13]', `${tag}: 밀 뒤 빨간 테가 13 에만 ${JSON.stringify(r)}`);
    ok(JSON.stringify(r.ml) === '[0,1,2]' && r.line === 1 && /밀 완성/.test(r.info) && /뺄/.test(r.pill), `${tag}: 밀 강조 · 글 ${JSON.stringify(r)}`);
    if (vp.w === 375) await page.screenshot({ path: path.join(SH, `mo-${vp.w}x${vp.h}-mill.png`) });
    await page.locator('.mo-p[data-c="4"]').click();
    r = await page.evaluate(() => ({ cell4: window.__h.view().cells[4], err: window.__h.lastErr(), rem: window.__h.view().rem }));
    ok(r.cell4 === 2 && r.rem && /밀/.test(r.err), `${tag}: 밀에 든 말(4)을 눌렀는데 빠짐 (${JSON.stringify(r)})`);
    await page.locator('.mo-p.rm[data-c="13"]').click();
    r = await page.evaluate(() => { const V = window.__h.view(), t = document.getElementById('stage'); return { cell13: V.cells[13], rem: V.rem, x: [...t.querySelectorAll('.mo-x')].map(x => +x.parentElement.dataset.c) }; });
    ok(r.cell13 === 0 && !r.rem, `${tag}: 맞는 말(13)이 안 빠짐 ${JSON.stringify(r)}`);
    const m = await measure(page); ok(!m.docx && !m.sx && m.sy <= 2 && m.outB <= 2, `${tag}: 화면 넘침 ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  // 단추만: 빼기(빨간 테) · 놓기(금색 점선) · 옮기기(말 → 초록 점선), 가끔 엉뚱한 곳 눌러 보기
  const rm = page.locator('.mo-p.rm'), nrm = await rm.count();
  if (nrm) { if (step % 7 === 3) { const lk = page.locator('.mo-p.f:not(.rm)').first(); if (await lk.count()) await lk.click(); } await rm.nth(step % nrm).click(); return true; }
  const pl = page.locator('.mo-p.pl'), npl = await pl.count();
  if (npl) { await pl.nth(step % npl).click(); return true; }
  const mv = page.locator('.mo-p.mv'), nmv = await mv.count();
  if (nmv) {
    await mv.nth(step % nmv).click();
    const tg = page.locator('.mo-p.tg'), nt = await tg.count();
    if (!nt) return false;
    await tg.nth(step % nt).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-c="20"]'); if (w) { w.click(); return true; } }   // 먼저 틀린 점
    if (k2 === 2) { const w = box.querySelector('[data-c="4"]'); if (w) { w.click(); return true; } }    // 밀에 든 말
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('나인 멘스 모리스 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('morris', policy, { runs: QUICK ? 2 : 4, tutPolicy, query: r => `${r % 2 ? 'me=1' : ''}&cfg_bo=${r < 2 ? 1 : 3}` });
})();

// 컬러 링크 화면 시험: node survival/test/colorlink_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판을 화면 단추 · 칸 누르기로: 넘침 · 아래 잘림 · 판 칸 수 = W×H · 벽 · 말 = 상태 · 누르는 크기 44px · 판 칸 28px ·
//     색 고르기 → 빈 칸 → 되돌리기 · 놓기 · 불가능(두 번 눌러 확인) · 길 잇기(눌러서) · 포기 · 선후공 고르기 · 결과 글
//  ② 길 잇기 직접: 말을 누르고 이어 가는 칸 누르기 · 되돌아가기(앞 칸 누름) · 겹치는 칸 거절 · 제출 단추 활성 · 구경꾼 화면 · 시간 제한(빨리 감기)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');
const ID = 'colorlink';

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), bad = [];
  const board = st.querySelector('.cl-board'); if (!board) return ['판 없음'];
  const cells = [...board.querySelectorAll('.cl-cl')];
  if (cells.length !== V.W * V.H) bad.push('칸 ' + cells.length);
  cells.forEach((el, i) => {
    if (!!V.wall[i] !== el.classList.contains('wl')) bad.push('벽 ' + i);
    const pc = el.querySelector('.cl-pc:not(.pend):not(.mate)');
    if ((V.grid[i] >= 0) !== !!pc) bad.push('말 ' + i);
    else if (pc && pc.textContent !== h.C.COLORS[V.grid[i]].l) bad.push('말 글자 ' + i);
  });
  const can = V.needs.includes(h.ME) && !V.over;
  if (!can && st.querySelector('.cl-act button')) bad.push('내 차례가 아닌데 단추');
  return bad;
};
const SIZES = () => {
  const s = [...document.querySelectorAll('#stage .cl-act button, #stage .cl-chip')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.a || b.dataset.chip, Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
  const c = document.querySelector('#stage .cl-cl'); const r = c && c.getBoundingClientRect();
  if (r && (r.width < 28 || r.height < 28)) s.push(['칸', Math.round(r.width), Math.round(r.height)]);
  return s;
};
const COACH = () => {
  const h = window.__h, c = h.coach();
  return { c, text: c.opp + c.mine + c.rec + c.why };
};

async function drawPaths(page, paths) {
  // 색마다: 말(첫 칸)을 누르고 이어 갈 칸을 차례로 누름 (사람이 하는 것과 같게 칸 클릭)
  for (const k of Object.keys(paths)) {
    const p = paths[k];
    for (let i = 0; i < p.length; i++) await page.locator(`#stage .cl-cl[data-c="${p[i]}"]`).click();
  }
}
async function doAct(page, phase, a, V) {
  const click = sel => page.locator(sel).first().click();
  if (!a) return false;
  if (phase === 'choose') { await click(a.mine ? '[data-a="first1"]' : '[data-a="first0"]'); return true; }
  if (phase === 'place') {
    if (a.t === 'declare') { await click('[data-a="decl"]'); await click('[data-a="decl"]'); return true; }
    for (const p of a.put) { await click(`[data-chip="${p.k}"]`); await click(`#stage .cl-cl[data-c="${p.c}"]`); }
    await click('[data-a="put"]'); return true;
  }
  if (phase === 'prove') {
    if (a.t === 'giveup') { await click('[data-a="giveup"]'); return true; }
    await drawPaths(page, a.paths); await click('[data-a="prove"]'); return true;
  }
  void V;
  return false;
}

async function extras({ browser, base, ok }) {
  let sample = 0;
  const seen = { place: 0, prove: 0, decl: 0, choose: 0, show: 0 };
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, ID, `seed=${5 + me * 3 + (vp.w % 7)}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 390) await page.screenshot({ path: path.join(SH, `cl-${vp.w}x${vp.h}-me${me}-${name}.png`) }); };
    const shown = new Set();
    let over = false, sizeN = 0, coachN = 0, k = 0, ownDecl = 0;
    for (k = 1; k <= 160; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, round: V.round, nPlace: V.nPlace, need: V.need }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)} (${s.phase})`);
      const key = s.phase + (s.mine ? '-me' : '');
      if (!shown.has(key)) { shown.add(key); await shot(key); }
      if (s.over) { over = true; break; }
      if (!s.mine) {
        const adv = await page.evaluate(() => window.__h.next());
        if (!adv) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
        continue;
      }
      if (sizeN < 8) { const z = await page.evaluate(SIZES); sizeN++; ok(!z.length, `${tag} #${k}: 누르는 크기 모자람 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachN < (QUICK ? 2 : 5)) {
        const r = await page.evaluate(COACH); coachN++;
        ok(r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(을\)/.test(r.text), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 220)}`);
        if (sample < 3 && vp.w === 375 && s.phase !== 'choose') { sample++; console.log(`· 선생님 글 예시 (${s.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
      if (s.phase === 'place') {
        seen.place++;
        if (seen.place === 1 || (a.t === 'place' && seen.place < 5)) {
          // 색 고르기 → 빈 칸 → 되돌리기 시험
          const p0 = a.put ? a.put[0] : null;
          if (p0) {
            await page.locator(`[data-chip="${p0.k}"]`).click();
            const r1 = await page.evaluate(kk => ({ on: [...document.querySelectorAll('#stage .cl-chip.on')].map(e => +e.dataset.chip).join(','), want: String(kk) }), p0.k);
            ok(r1.on === r1.want, `${tag} #${k}: 색 고르기 ${JSON.stringify(r1)}`);
            await page.locator(`#stage .cl-cl[data-c="${p0.c}"]`).click();
            const r2 = await page.evaluate(c => ({ pend: document.querySelectorAll('#stage .cl-pc.pend').length, onCell: !!document.querySelector(`#stage .cl-cl[data-c="${c}"] .cl-pc.pend`), put: document.querySelector('#stage [data-a="put"]').disabled }), p0.c);
            ok(r2.pend === 1 && r2.onCell, `${tag} #${k}: 놓을 말이 판에 보임 ${JSON.stringify(r2)}`);
            if (seen.place === 1) await shot('pending');
            await page.locator('[data-a="undo"]').click();
            const r3 = await page.evaluate(() => document.querySelectorAll('#stage .cl-pc.pend').length);
            ok(r3 === 0, `${tag} #${k}: 되돌리기 ${r3}`);
          }
        }
        if (a.t === 'declare') {
          await page.locator('[data-a="decl"]').click();
          const q = await page.evaluate(() => ({ ask: document.querySelector('#stage [data-a="decl"]').classList.contains('ask'), over: !!window.__h.view().over, ph: window.__h.view().phase }));
          ok(q.ask && q.ph === 'place', `${tag} #${k}: 불가능은 한 번 더 눌러야 선언 ${JSON.stringify(q)}`);
          seen.decl++; ownDecl++;
          await page.locator('[data-a="decl"]').click();
          continue;
        }
        await doAct(page, 'place', a, null);
        continue;
      }
      if (s.phase === 'prove') {
        if (!seen.prove++) { await shot('prove-start'); }
        if (a.t === 'prove') {
          // 한 색을 그리다 되돌아가기 · 겹치는 칸 거절 (처음 한 번)
          if (seen.prove <= 2) {
            const ks = Object.keys(a.paths), p = a.paths[ks[0]];
            await page.locator(`#stage .cl-cl[data-c="${p[0]}"]`).click();
            await page.locator(`#stage .cl-cl[data-c="${p[1]}"]`).click();
            await page.locator(`#stage .cl-cl[data-c="${p[2]}"]`).click();
            let n = await page.evaluate(kk => (window.__clLen = document.querySelectorAll('#stage .cl-cl.pt').length), 0);
            await page.locator(`#stage .cl-cl[data-c="${p[1]}"]`).click();          // 앞 칸을 누르면 거기까지 되돌아감
            const n2 = await page.evaluate(() => document.querySelectorAll('#stage .cl-cl.pt').length);
            ok(n2 === n - 1, `${tag} #${k}: 앞 칸을 누르면 한 칸 되돌아감 ${n} → ${n2}`);
            if (seen.prove === 1) await shot('prove-drawing');
            await page.locator('[data-a="clr"]').click();
            n = await page.evaluate(() => document.querySelectorAll('#stage .cl-cl.pt').length);
            ok(n === 0, `${tag} #${k}: 모두 지우기 ${n}`);
          }
          const sub = await page.evaluate(() => document.querySelector('#stage [data-a="prove"]').disabled);
          ok(sub === true, `${tag} #${k}: 다 잇기 전엔 제출 비활성`);
        }
        await doAct(page, 'prove', a, null);
        continue;
      }
      if (s.phase === 'choose') { seen.choose++; if (seen.choose === 1) await shot('choose'); }
      await doAct(page, s.phase, a, null);
    }
    ok(over, `${tag}: 게임이 끝나지 않음 (${k}걸음)`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.cl-st').innerText, res: h.result(), btn: t.querySelectorAll('.cl-act button').length }; });
    ok(/(이겼어요|졌어요)/.test(e.st) && /(🏆)/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  ok(seen.place > 0 && seen.prove > 0, `한 번 이상 놓기 · 증명 단계를 눌러 봄 (${JSON.stringify(seen)})`);

  // 끌어서 잇기 (pointer): 말에서 시작해 이웃 칸으로 끌기, 대각선 건너뛰기는 안 됨
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=3&me=0', VPS[1]);
    const info = await page.evaluate(() => {
      const h = window.__h, st = h.st(), C = h.C; let g = 0;
      // 내가 마지막에 놓고 상대가 불가능을 선언한 판까지 AI 끼리 진행 (증명하는 사람 = 나)
      while (!(st.phase === 'place' && st.lastPlacer === h.ME && st.nPlace >= 2) && !C.over(st) && g++ < 100) { const nd = C.needs(st); if (!nd.length) { C.advance(st); continue; } const s = nd[0]; C.apply(st, s, C.ai(C.view(st, s), s, 'hard')); }
      C.apply(st, st.cur, { t: 'declare' });
      h.render();
      const V = h.view();
      return { phase: V.phase, prover: V.prover, me: h.ME };
    });
    if (info.phase === 'prove' && info.prover === info.me) {
      const sol = await page.evaluate(() => { const h = window.__h; return h.C.ai(h.view(), h.ME, 'hard', () => 0.5); });
      const p = sol && sol.paths ? sol.paths[Object.keys(sol.paths)[0]] : null;
      if (!p) { ok(true, '(끌기 시험: 풀이 없음 — 건너뜀)'); await close(); } else {
      const cellBox = async c => { const b = await page.locator(`#stage .cl-cl[data-c="${c}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
      const b0 = await cellBox(p[0]);
      await page.mouse.move(b0.x, b0.y); await page.mouse.down();
      for (let i = 1; i < Math.min(p.length, 7); i++) { const b = await cellBox(p[i]); await page.mouse.move(b.x, b.y, { steps: 3 }); }
      await page.mouse.up();
      const n = await page.evaluate(() => document.querySelectorAll('#stage .cl-cl.pt').length + document.querySelectorAll('#stage .cl-cl .cl-pc').length);
      ok(n >= Math.min(p.length, 7), `끌어서 잇기: 칸 ${n} (기대 ${Math.min(p.length, 7)} 이상)`);
      await page.screenshot({ path: path.join(SH, 'cl-drag.png') });
      }
    } else ok(true, '(끌기 시험: 이 씨앗에서는 내가 증명하는 판이 아님 — 건너뜀)');
    for (const x of errs) ok(false, `끌어서 잇기: ${x}`);
    await close();
  }
  // 시간 제한: 시계를 빨리 감으면 시간 초과로 짐
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.clock.install();
    await page.goto(`${base}survival/test/s3ui_harness.html?g=${ID}&seed=12&me=0&cfg_limit=1`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
    await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
    const me = await page.evaluate(() => window.__h.ME), first = await page.evaluate(() => window.__h.view().first);
    if (first !== me) { await page.evaluate(() => { const h = window.__h, st = h.st(); const s = st.cur; h.C.apply(st, s, h.C.ai(h.C.view(st, s), s, 'hard')); h.render(); }); }
    let s = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, mine: V.needs.includes(0), bar: !!document.querySelector('#stage .cl-tbar'), cd: (document.querySelector('#stage [data-cd]') || {}).textContent }; });
    ok(s.phase === 'place' && s.mine && s.bar && /3분/.test(s.cd || ''), `시간 제한: 막대 · 3분 ${JSON.stringify(s)}`);
    await page.clock.runFor(100000);
    s = await page.evaluate(() => ({ cd: (document.querySelector('#stage [data-cd]') || {}).textContent, r: window.__h.view().round }));
    ok(/^1분/.test(s.cd || '') || /^\d/.test(s.cd || ''), `100초 뒤 남은 시간 ${JSON.stringify(s)}`);
    await page.clock.runFor(90000);
    s = await page.evaluate(() => { const V = window.__h.view(); return { sc: V.scores, why: V.rres && V.rres.why, ph: V.phase }; });
    ok(s.why === 'time' && s.sc[1] === 1 && s.ph === 'show', `3분이 지나면 시간 초과 패배 ${JSON.stringify(s)}`);
    for (const x of errs) ok(false, `시간 제한: ${x}`);
    await ctx.close();
  }
  // 구경꾼 — 판은 보이고 단추는 없음
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => { const h = window.__h, C = h.C, st = h.st(); for (let i = 0; i < 3; i++) { const nd = C.needs(st); if (!nd.length) break; C.apply(st, nd[0], C.ai(C.view(st, nd[0]), nd[0], 'normal', () => 0.3)); } h.render(); });
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('#stage .cl-act button').length, cells: document.querySelectorAll('#stage .cl-cl').length }));
    const d = await page.evaluate(DRAW), m = await measure(page);
    ok(r.btn === 0 && r.cells > 30 && !d.length && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${d.slice(0, 3)}`);
    await page.screenshot({ path: path.join(SH, 'cl-360x640-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const s = await page.evaluate(st => { const h = window.__h, V = h.view(); return { phase: V.phase, a: h.C.ai(V, h.ME, st % 2 ? 'hard' : 'normal', h.rnd) }; }, step);
  if (!s.a) return false;
  return doAct(page, s.phase, s.a, null);
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    // 왼쪽 위 A(0번) 에서 시작해 5×5 판을 돌아 오른쪽 위 A(4번) 에 닿는 6칸 이상의 길
    const route = [0, 5, 10, 11, 12, 7, 2, 3, 4];
    const c = route[Math.min(k2, route.length - 1)], el = box.querySelector(`.cl-cl[data-c="${c}"]`);
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, k);
}

(async () => {
  const f = await session('컬러 링크 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run(ID, policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1' : ''), ns: [2, 2, 2] });
})();

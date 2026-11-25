// 4인 3목 화면 시험: node survival/test/four3_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판(2라운드)을 단추로: 넘침 · 순서 줄 · 판(맨 위 색 · 층) · 칸 고르기 / 다시 눌러 풀기 ·
//     ＋1~3 (막힌 개수는 꺼짐) · 옮기기 → 이웃 칸만 · 취소 · 넘기기 → core 기록과 같음 · 라운드 끝 글 · 3목 줄 · 누르는 크기 44px
//  ② 차례 시계 90초 (가짜 시계) · 구경꾼 (me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const pills = [...st.querySelectorAll('.f3-p')];
  if (pills.length !== V.n) bad.push('순서 줄 ' + pills.length);
  pills.forEach((p, j) => { const s = V.order[j]; if (!p.querySelector('.dt').classList.contains('c' + s)) bad.push('순서 색 ' + j); if (p.classList.contains('on') !== (V.cur === s)) bad.push('차례 표시 ' + j); if (!p.innerText.includes('✋' + V.hand[s])) bad.push('남은 말 ' + s); });
  const cells = [...st.querySelectorAll('.f3-c')];
  if (cells.length !== 16) bad.push('칸 ' + cells.length);
  cells.forEach((c, i) => {
    const sk = V.bd[i], d = c.querySelector('.d');
    if (!sk.length) { if (d) bad.push('빈 칸에 말 ' + i); return; }
    if (!d || !d.classList.contains('c' + sk[sk.length - 1]) || +d.dataset.h !== sk.length) bad.push(`칸 ${i} 맨 위/층 ${d && d.className}/${d && d.dataset.h} ≠ ${sk}`);
    const ly = [...c.querySelectorAll('.ly i')].map(x => +x.className.slice(1));
    if (sk.length > 1 && JSON.stringify(ly) !== JSON.stringify(sk)) bad.push(`칸 ${i} 층 색 ${ly} ≠ ${sk}`);
  });
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  if (!can && st.querySelector('.f3-c.pick,.f3-row button')) bad.push('내 차례가 아닌데 단추');
  if (can && st.querySelectorAll('.f3-c.pick').length !== 16) bad.push('고를 칸');
  if (V.phase === 'roundend') {
    const lines = st.querySelectorAll('.f3-board svg line').length, w = V.rw.w;
    if (w.length && !lines) bad.push('3목 줄 없음');
    if (!w.length && lines) bad.push('승자 없는데 줄');
  }
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), legal = C.legal(h.st(), me).map(a => JSON.stringify(a));
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: !r || legal.includes(JSON.stringify(r.a)) };
};
const SIZES = () => [...document.querySelectorAll('#stage .f3-c.pick, #stage .f3-row button')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + (b.dataset.k || b.dataset.a || ''), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const V = window.__h.C.view(window.__h.st(), 'all'); const L = V.log.filter(e => e.k === 'act' && e.s === window.__h.ME).pop(); return L ? Object.assign({ i: L.i }, L.a) : null; };

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'four3', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&cfg_rounds=2`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `f3-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, places = 0, moves = 0, passes = 0, rends = 0, coachTested = 0, selTested = 0, moveTested = 0, sizeTested = 0, k = 0;
    const shown = new Set();
    for (k = 1; k <= 160; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, hand: V.hand[h.ME], bd: V.bd, round: V.round }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (!shown.has(s.phase + s.mine)) { shown.add(s.phase + s.mine); await shot(`${s.phase}${s.mine ? '-me' : ''}`); }
      if (s.over) { over = true; break; }
      if (s.phase === 'roundend') {
        rends++;
        const t = await page.evaluate(() => document.querySelector('.f3-st').innerText);
        ok(/(3목! 피스 \+3|동시 3목|승자 없음)/.test(t) && /라운드 · \d+수/.test(t), `${tag} #${k}: 라운드 끝 글 ${t}`);
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
      if (sizeTested < 4) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachTested < (QUICK ? 2 : 4)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)/.test(r.text) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 220)}`);
        if (sampleShown < 2 && vp.w === 375) { sampleShown++; console.log(`· 선생님 글 예시:\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      const pick = i => page.locator(`.f3-c[data-c="${i}"]`).click();
      if (selTested < 2) {                                  // 고르기 → 다시 눌러 풀기
        await pick(5);
        let r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('.f3-c.sel')].map(b => +b.dataset.c), ks: [...document.querySelectorAll('.f3-row [data-k]')].map(b => b.disabled ? 0 : 1) }));
        const h5 = s.bd[5].length, want = [1, 2, 3].map(x => (x > s.hand || h5 + x > 3 ? 0 : 1));
        ok(JSON.stringify(r.sel) === '[5]' && JSON.stringify(r.ks) === JSON.stringify(want), `${tag} #${k}: 칸 고르기 · ＋ 단추 ${JSON.stringify(r)} (원함 ${want})`);
        if (selTested === 0) await shot('selected');
        await pick(5);
        r = await page.evaluate(() => document.querySelectorAll('.f3-c.sel').length + document.querySelectorAll('.f3-row [data-k]').length);
        ok(r === 0, `${tag} #${k}: 다시 눌러 풀기 ${r}`);
        selTested++;
      }
      // 옮길 수 있는 내 맨 위 말
      const mv = await page.evaluate(() => { const h = window.__h, V = h.view(), C = h.C; for (let f = 0; f < 16; f++) { const sk = V.bd[f]; if (sk.length && sk[sk.length - 1] === h.ME) { const t = C.NB[f].filter(x => V.bd[x].length < 3); if (t.length) return { f, t }; } } return null; });
      const choice = (k + me) % 7 === 3 ? 'pass' : mv && (k % 3 === 0 || !s.hand) ? 'move' : s.hand ? 'place' : 'pass';
      if (choice === 'move') {
        await pick(mv.f);
        await page.locator('.f3-row [data-a="move"]').click();
        const tg = await page.evaluate(() => [...document.querySelectorAll('.f3-c.tgt')].map(b => +b.dataset.c));
        ok(JSON.stringify(tg) === JSON.stringify(mv.t), `${tag} #${k}: 옮길 칸 ${tg} ≠ ${mv.t}`);
        if (moveTested === 0) {
          await shot('move');
          await page.locator('.f3-row [data-a="cancel"]').click();
          const r = await page.evaluate(() => ({ tg: document.querySelectorAll('.f3-c.tgt').length, sel: document.querySelectorAll('.f3-c.sel').length }));
          ok(r.tg === 0 && r.sel === 1, `${tag} #${k}: 취소 ${JSON.stringify(r)}`);
          await page.locator('.f3-row [data-a="move"]').click();
          moveTested++;
        }
        const to = mv.t[k % mv.t.length];
        await pick(to);
        const L = await page.evaluate(LAST);
        ok(L && L.t === 'move' && L.from === mv.f && L.to === to, `${tag} #${k}: 옮기기 기록 ${JSON.stringify(L)} (${mv.f}→${to})`);
        moves++; continue;
      }
      if (choice === 'place') {
        const c = await page.evaluate(kk => { const V = window.__h.view(); const ok = [...Array(16).keys()].filter(i => V.bd[i].length < 3); return ok[(kk * 7) % ok.length]; }, k);
        await pick(c);
        const en = await page.evaluate(() => [...document.querySelectorAll('.f3-row [data-k]')].filter(b => !b.disabled).map(b => +b.dataset.k));
        const kk = en[k % en.length];
        await page.locator(`.f3-row [data-k="${kk}"]`).click();
        const L = await page.evaluate(LAST);
        ok(L && L.t === 'place' && L.cell === c && L.k === kk, `${tag} #${k}: 놓기 기록 ${JSON.stringify(L)} (${c} ×${kk})`);
        places++; continue;
      }
      await page.locator('.f3-row [data-a="pass"]').click();
      const L = await page.evaluate(LAST);
      ok(L && L.t === 'pass', `${tag} #${k}: 넘기기 기록 ${JSON.stringify(L)}`);
      passes++;
    }
    ok(over, `${tag}: 게임이 끝나지 않음 (${k}걸음)`);
    ok(places >= 2 && rends === 2, `${tag}: 놓기 ${places} · 옮기기 ${moves} · 넘기기 ${passes} · 라운드 끝 ${rends}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.f3-st').innerText, res: h.result(), btn: t.querySelectorAll('.f3-row button,.f3-c.pick').length }; });
    ok(/(1등)/.test(e.st) && /1R /.test(e.res) && /2R /.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 차례 시계 90초 (가짜 시계) — 시간이 다 되면 넘기기
  {
    const vp = VPS[0], tag = '시계';
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    if (page.clock) {
      await page.clock.install();
      await page.goto(`${base}survival/test/s3ui_harness.html?g=four3&seed=9&me=0&cfg_timer=90`);
      await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
      await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
      const t0 = await page.evaluate(() => ({ cd: document.querySelector('[data-cd]') && document.querySelector('[data-cd]').textContent, bar: !!document.querySelector('[data-bar]') }));
      ok(t0.bar && t0.cd === '90', `${tag}: 시계 줄 · 90초 표시 ${JSON.stringify(t0)}`);
      await page.clock.runFor(89000);
      let L = await page.evaluate(LAST);
      ok(!L, `${tag}: 89초엔 아직 ${JSON.stringify(L)}`);
      await page.clock.runFor(1500);
      L = await page.evaluate(LAST);
      ok(L && L.t === 'pass', `${tag}: 90초 지나면 넘기기 ${JSON.stringify(L)}`);
    } else ok(false, `${tag}: 가짜 시계 없음`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await ctx.close();
  }
  // 구경꾼
  {
    const { page, errs, close } = await open(browser, base, 'four3', 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => { const h = window.__h, st = h.st(), f = h.C.init({ n: 4, seed: 4 }); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f); h.C.apply(st, 0, { t: 'place', cell: 5, k: 3 }); h.C.apply(st, 1, { t: 'place', cell: 6, k: 2 }); h.render(); });
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.f3-row button,.f3-c.pick').length, d: document.querySelectorAll('.f3-c .d').length, st: document.querySelector('.f3-st').innerText, me: document.querySelectorAll('.f3-p.me').length }));
    const m = await measure(page);
    ok(r.btn === 0 && r.d === 2 && r.me === 0 && /노랑/.test(r.st) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  if (!(await page.locator('.f3-c.pick').count())) return false;
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'easy' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (a.t === 'pass') { await page.locator('.f3-row [data-a="pass"]').click(); return true; }
  if (a.t === 'place') { await page.locator(`.f3-c[data-c="${a.cell}"]`).click(); await page.locator(`.f3-row [data-k="${a.k}"]`).click(); return true; }
  await page.locator(`.f3-c[data-c="${a.from}"]`).click(); await page.locator('.f3-row [data-a="move"]').click(); await page.locator(`.f3-c[data-c="${a.to}"]`).click();
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-c="15"]'); if (w) { w.click(); return true; } }            // 먼저 엉뚱한 칸(D4)
    if (k2 === 1) { const w = box.querySelector('[data-k="1"]'); if (w) { w.click(); return true; } }            // D4 에 놓기 → 3목 아님 → 처음부터
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('4인 3목 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('four3', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_rounds=2' : 'cfg_rounds=2'), ns: [4, 4, 3] });
})();

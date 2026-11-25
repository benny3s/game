// 헥사곤 화면 시험: node survival/test/hexagon_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 5라운드 한 판을 단추로: 넘침 · 점수 · 타깃 · 판(외울 땐 숫자, 덮으면 알파벳만) ·
//     다 외웠어요 → 버저 / 넘기기 → 세 칸 고르기 (다시 눌러 취소 · '다시' · 일렬 아닌 세 칸은 막음) → core 기록과 같음 · 라운드 끝 정답 줄 · 누르는 크기 44px
//  ② 10초 안에 못 부르면 시간 초과 (가짜 시계) · 구경꾼 (me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 상태를 그대로 그리는지 · 덮은 뒤 숫자가 새지 않는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const order = me >= 0 ? [me, 1 - me] : [0, 1];
  const sc = [...st.querySelectorAll('.hx-sc b')].map(b => +b.innerText.replace('−', '-'));
  if (JSON.stringify(sc) !== JSON.stringify(order.map(s => V.score[s]))) bad.push(`점수 ${sc} ≠ ${order.map(s => V.score[s])}`);
  const tg = st.querySelector('.hx-tg b'), cells = [...st.querySelectorAll('.hx-c')];
  if (cells.length !== 19) bad.push('칸 ' + cells.length);
  const nums = cells.map(c => c.querySelector('.v') ? +c.querySelector('.v').innerText : null);
  if (V.phase !== 'look' && +tg.innerText !== V.target) bad.push(`타깃 ${tg.innerText} ≠ ${V.target}`);
  const hidden = V.phase === 'buzz' || V.phase === 'call' || V.phase === 'show' || (V.phase === 'look' && me >= 0 && V.rdy[me]);
  if (hidden && nums.some(x => x !== null)) bad.push('덮었는데 숫자 보임 ' + V.phase);
  if (hidden && cells.some((c, i) => c.querySelector('.l').innerText !== 'ABCDEFGHIJKLMNOPQRS'[i])) bad.push('알파벳');
  if ((V.phase === 'look' && !hidden) || V.phase === 'reveal' || V.over) {
    if (JSON.stringify(nums) !== JSON.stringify(V.board)) bad.push(`판 숫자 ${nums} ≠ ${V.board}`);
  }
  if (V.phase === 'reveal' || V.over) {
    const H = V.hist[V.hist.length - 1], lines = st.querySelectorAll('.hx-board svg line').length;
    if (lines !== H.ans.length) bad.push(`정답 줄 ${lines} ≠ ${H.ans.length}`);
    const txt = st.querySelector('.hx-ans').innerText;
    H.ans.forEach(k => { const nm = h.C.lineName(k); if (!txt.includes(nm)) bad.push('정답 글 ' + nm); });
  }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  if (!can && st.querySelector('.hx-buzz,.hx-go,.hx-c.pick')) bad.push('내 차례가 아닌데 단추');
  if (can && V.phase === 'buzz' && (!st.querySelector('.hx-buzz') || !st.querySelector('.hx-pass'))) bad.push('버저 · 넘기기 단추 없음');
  if (can && V.phase === 'call' && st.querySelectorAll('.hx-c.pick').length !== 19) bad.push('고를 칸');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), legal = C.legal(h.st(), me).map(a => a.t);
  const all = C.view(h.st(), 'all'), leak = V.board === null && all.ans.filter(k => !all.found.some(f => f.k === k)).some(k => (c.rec + c.why + c.opp + c.mine).includes(C.lineName(k)));
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: !r || legal.includes(r.t), leak };
};
const SIZES = () => [...document.querySelectorAll('#stage .hx-c.pick, #stage .hx-buzz, #stage .hx-pass, #stage .hx-go, #stage .hx-clr')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className, Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const PICK = (page, i) => page.locator(`.hx-c[data-c="${i}"]`).click();

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'hexagon', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&cfg_rounds=5`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `hx-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, looks = 0, buzzes = 0, passes = 0, calls = 0, reveals = 0, coachTested = 0, selTested = 0, lineTested = 0, sizeTested = 0, shown = new Set();
    for (let k = 1; k <= 400; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, round: V.round, calls: V.calls }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (!shown.has(s.phase + s.mine)) { shown.add(s.phase + s.mine); await shot(`${s.phase}${s.mine ? '-me' : ''}`); }
      if (s.over) { over = true; break; }
      if (s.phase === 'show' || s.phase === 'reveal') {
        if (s.phase === 'reveal') reveals++;
        const t = await page.evaluate(() => { const h = window.__h, V = h.view(); return { st: document.querySelector('.hx-st').innerText, last: V.last, ph: V.phase }; });
        if (t.ph === 'show') ok(t.last.ok ? /정답! \+1/.test(t.st) : /오답 −1/.test(t.st), `${tag} #${k}: 결과 글 ${t.st}`);
        else ok(/정답 \d개 · 타깃 \d+/.test(t.st), `${tag} #${k}: 라운드 끝 글 ${t.st}`);
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
      if (sizeTested < 6 && s.phase !== 'look') { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachTested < (QUICK ? 3 : 6) && (k % 2 || s.phase === 'call')) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && !r.leak && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)/.test(r.text) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.leak ? '(정답 샘) ' : ''}${r.text.slice(0, 220)}`);
        if (sampleShown < 3 && vp.w === 375 && ['look', 'buzz', 'call'][sampleShown] === r.phase) { sampleShown++; console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      if (s.phase === 'look') {
        const t = await page.evaluate(() => document.querySelector('.hx-go').innerText);
        ok(/다 외웠어요/.test(t), `${tag} #${k}: 외우기 단추 ${t}`);
        await page.locator('.hx-go[data-a="ready"]').click(); looks++;
        const ph = await page.evaluate(() => window.__h.view().phase);
        ok(ph === 'buzz', `${tag} #${k}: 다 외웠어요 → 버저 단계 (${ph})`);
        continue;
      }
      if (s.phase === 'buzz') {
        await page.waitForTimeout(680);                                  // 덮은 직후 잠깐은 버저가 안 먹음 (실수 방지)
        if ((k + s.round) % 4 === 0) {
          await page.locator('.hx-pass').click(); passes++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 'all'), L = V.log.filter(e => e.k === 'buzz').pop(); return { ms: L && L.ms[h.ME], ph: V.phase }; });
          ok(r.ms === 99999, `${tag} #${k}: 넘기기 기록 ${JSON.stringify(r)}`);
        } else {
          await page.locator('.hx-buzz').click(); buzzes++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 'all'), L = V.log.filter(e => e.k === 'buzz').pop(); return { ms: L && L.ms[h.ME], w: L && L.w, ph: V.phase, caller: V.caller }; });
          ok(r.ms >= 0 && r.ms < 99999 && r.w === me && r.ph === 'call' && r.caller === me, `${tag} #${k}: 버저 기록 ${JSON.stringify(r)}`);
        }
        continue;
      }
      if (s.phase === 'call') {
        const A = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 'all'); const left = V.ans.filter(k => !V.found.some(f => f.k === k)); return { left: left.map(k => h.C.LINES[k].c), wrong: h.C.LINES.map((x, k) => k).filter(k => !V.ans.includes(k)).map(k => h.C.LINES[k].c) }; });
        if (selTested < 2) {                                            // 고르기 → 다시 눌러 취소 → '다시'
          await PICK(page, 4); await PICK(page, 9);
          let r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('.hx-c.sel')].map(b => [+b.dataset.c, b.dataset.n]), steps: document.querySelector('.hx-steps').innerText }));
          ok(JSON.stringify(r.sel) === '[[4,"1"],[9,"2"]]' && /E/.test(r.steps) && /J/.test(r.steps), `${tag} #${k}: 두 칸 고름 ${JSON.stringify(r)}`);
          if (selTested === 0) await shot('picking');
          await PICK(page, 9);
          r = await page.evaluate(() => [...document.querySelectorAll('.hx-c.sel')].map(b => +b.dataset.c));
          ok(JSON.stringify(r) === '[4]', `${tag} #${k}: 다시 눌러 취소 ${JSON.stringify(r)}`);
          await page.locator('.hx-clr').click();
          r = await page.evaluate(() => document.querySelectorAll('.hx-c.sel').length);
          ok(r === 0, `${tag} #${k}: '다시' 뒤 선택 ${r}`);
          selTested++;
        }
        if (lineTested < 1) {                                           // 일렬이 아닌 세 칸 → 막고 안내 (점수 그대로)
          const sc0 = await page.evaluate(() => JSON.stringify(window.__h.view().score));
          await PICK(page, 0); await PICK(page, 1); await PICK(page, 3);
          const r = await page.evaluate(() => ({ st: document.querySelector('.hx-st').innerText, sel: document.querySelectorAll('.hx-c.sel').length, ph: window.__h.view().phase, sc: JSON.stringify(window.__h.view().score) }));
          ok(/일렬이 아니에요/.test(r.st) && r.sel === 0 && r.ph === 'call' && r.sc === sc0, `${tag} #${k}: 일렬 아닌 세 칸 ${JSON.stringify(r)}`);
          if (vp.w === 375 && me === 0) await shot('notline');
          lineTested++;
        }
        const right = (k + calls) % 3 !== 2 && A.left.length, c = right ? A.left[0] : A.wrong[k % A.wrong.length];
        const cc = (k % 2) ? c.slice().reverse() : c;
        for (const i of cc) await PICK(page, i);
        const L = await page.evaluate(() => window.__h.view().last);
        ok(L && L.s === me && JSON.stringify(L.c) === JSON.stringify(cc) && L.ok === !!right, `${tag} #${k}: 선언 기록 ${JSON.stringify(L)} (고른 ${cc} 정답 ${!!right})`);
        calls++;
        continue;
      }
      ok(false, `${tag} #${k}: 알 수 없는 단계 ${s.phase}`); break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    ok(looks >= 5 && buzzes >= 3 && calls >= 3 && reveals >= 4, `${tag}: 외우기 ${looks} · 버저 ${buzzes} · 넘김 ${passes} · 선언 ${calls} · 라운드 끝 ${reveals}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.hx-st').innerText, res: h.result(), go: t.querySelectorAll('.hx-buzz,.hx-go,.hx-c.pick').length }; });
    ok(/(이겼어요|상대 승|무승부)/.test(e.st) && /R 타깃/.test(e.res) && e.go === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 10초 제한 · 외우기 30초 (가짜 시계)
  {
    const vp = VPS[0], tag = '시계';
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    let clock = !!page.clock;
    if (clock) await page.clock.install();
    await page.goto(`${base}survival/test/s3ui_harness.html?g=hexagon&seed=9&me=0`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
    await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
    if (clock) {
      await page.clock.runFor(29000);
      let ph = await page.evaluate(() => window.__h.view().phase);
      ok(ph === 'look', `${tag}: 29초엔 아직 외우는 중 (${ph})`);
      await page.clock.runFor(1500);
      ph = await page.evaluate(() => window.__h.view().phase);
      ok(ph === 'buzz', `${tag}: 30초 지나면 저절로 덮음 (${ph})`);
      await page.clock.runFor(700);
      await page.locator('.hx-buzz').click();
      ph = await page.evaluate(() => window.__h.view().phase);
      ok(ph === 'call', `${tag}: 버저 → 선언 (${ph})`);
      await PICK(page, 7);
      await page.clock.runFor(10300);
      const L = await page.evaluate(() => ({ last: window.__h.view().last, sc: window.__h.view().score[0], st: document.querySelector('.hx-st').innerText }));
      ok(L.last && L.last.why === 'time' && L.sc === -1 && /10초 안에 못 불렀어요/.test(L.st), `${tag}: 10초 지나면 시간 초과 −1 ${JSON.stringify(L)}`);
      await page.screenshot({ path: path.join(SH, 'hx-375x667-timeout.png') });
      await page.evaluate(() => window.__h.next());
      // 90초 동안 아무도 안 누르면 넘김 (상대 AI 가 정하든 말든 내 몫은 넘기기)
      const before = await page.evaluate(() => window.__h.view().phase);
      if (before === 'buzz') {
        await page.clock.runFor(91000);
        const r = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 'all'), L = V.log.filter(e => e.k === 'buzz').pop(); return L && L.ms[0]; });
        ok(r === 99999, `${tag}: 90초 지나면 넘기기 (${r})`);
      }
    } else ok(false, `${tag}: 가짜 시계(page.clock) 없음`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await ctx.close();
  }
  // 구경꾼: 단추 없이, 덮은 뒤엔 숫자 없음, 넘침 없음
  {
    const { page, errs, close } = await open(browser, base, 'hexagon', 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => { const h = window.__h, st = h.st(), f = h.C.init({ n: 2, seed: 4 }); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f); h.C.apply(st, 0, { t: 'ready' }); h.C.apply(st, 1, { t: 'ready' }); h.render(); });      // 구경꾼은 열자마자 AI 둘이 끝까지 두므로 새 판으로
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.hx-buzz,.hx-go,.hx-pass,.hx-c.pick').length, v: document.querySelectorAll('.hx-c .v').length, sc: document.querySelectorAll('.hx-sc').length, st: document.querySelector('.hx-st').innerText }));
    const m = await measure(page);
    ok(r.btn === 0 && r.v === 0 && r.sc === 2 && /버저 경쟁/.test(r.st) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const go = page.locator('.hx-go[data-a="ready"]');
  if (await go.count()) { await go.click(); return true; }
  const bz = page.locator('.hx-buzz');
  if (await bz.count()) {
    await page.waitForTimeout(650);
    if (step % 5 === 0) await page.locator('.hx-pass').click(); else await bz.click();
    return true;
  }
  if (await page.locator('.hx-c.pick').count()) {
    const c = await page.evaluate(st => { const h = window.__h, V = h.C.view(h.st(), 'all'); const left = V.ans.filter(k => !V.found.some(f => f.k === k)); const k = st % 3 && left.length ? left[0] : st % h.C.LINES.length; return h.C.LINES[k].c; }, step);
    for (const i of c) await page.locator(`.hx-c[data-c="${i}"]`).click();
    return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-c="0"]'); if (w) { w.click(); return true; } }      // 먼저 틀린 칸(A) → 힌트가 A 를 다시 눌러 빼라고
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('헥사곤 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('hexagon', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_rounds=5' : 'cfg_rounds=5') });
})();

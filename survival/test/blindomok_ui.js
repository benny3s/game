// 블라인드 오목 화면 시험: node survival/test/blindomok_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판을 단추로: 넘침 · 돌 색 = 판 · 누구 돌인지 안 보임(흑백 보기 끔) ·
//     점 고르기 → 고스트 · 다시 눌러 풀기 · 색 고르기(흑) · 따라 둘 색(백) · 두기 → core 기록과 같음 · 판 끝 밑면 공개 · 5목 줄 · 누르는 크기 44px
//  ② 흑백 보기 옵션 · 15줄 · 3판 2선승 · 구경꾼 (me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');
const HEX = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#2563eb', '#a855f7'];

const DRAW = HEX => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const H = V.phase !== 'play' && V.hist.length ? V.hist[V.hist.length - 1] : null, col = H ? H.col : V.col, own = H ? H.own : V.own;
  const chip = [0, 1].map(i => h.U.chip(V, i));
  if (!chip[V.black].t.includes('흑') || !chip[1 - V.black].t.includes('백') || chip.some((c, i) => c.on !== (!V.over && V.cur === i))) bad.push('칩 흑백 · 차례 ' + JSON.stringify(chip));
  const sn = [...st.querySelectorAll('.bo-board .sn')];
  const want = col.filter(c => c >= 0).length;
  if (sn.length !== want) bad.push(`돌 ${sn.length} ≠ ${want}`);
  sn.forEach(c => { const i = +c.dataset.i; if (c.getAttribute('fill') !== HEX[col[i]]) bad.push(`돌 색 ${i}`); });
  const rv = [...st.querySelectorAll('.bo-board .rv')];
  const reveal = me < 0 || V.opt.peek || V.phase !== 'play';
  if (reveal && rv.length !== want) bad.push(`밑면 ${rv.length} ≠ ${want}`);
  if (!reveal && rv.length) bad.push('흑백 보기 끔인데 밑면이 보임');
  rv.forEach(c => { const i = +c.dataset.i, b = own[i] === V.black; if (c.getAttribute('fill') !== (b ? '#000' : '#fff')) bad.push('밑면 색 ' + i); });
  if (!reveal && /data-own|흑돌|백돌/.test(st.querySelector('.bo-board').outerHTML)) bad.push('판 html 에 주인이 보임');
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  const hits = st.querySelectorAll('.bo-board .hit').length;
  if (!can && (hits || st.querySelector('.bo-act button'))) bad.push('내 차례가 아닌데 단추');
  if (can && hits !== V.col.filter(c => c < 0).length) bad.push('고를 점 ' + hits);
  if (can && (me === V.black) !== !!st.querySelector('.bo-pal')) bad.push('색 고르기는 흑만');
  if (can && me !== V.black && !(st.querySelector('.bo-fix') || {}).innerText) bad.push('백 따라 둘 색 글 없음');
  if (V.phase !== 'play' && H && H.w >= 0 && !st.querySelector('.bo-board .wl')) bad.push('5목 줄 없음');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), legalP = C.legal(h.st(), me).map(a => a.p);
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: !r || legalP.includes(r.a.p) };
};
const SIZES = () => [...document.querySelectorAll('#stage .bo-act button')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + (b.dataset.col || b.dataset.a || ''), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const V = window.__h.C.view(window.__h.st(), 'all'); const L = V.log.filter(e => e.k === 'act' && e.s === window.__h.ME).pop(); return L ? Object.assign({ i: L.i }, L.a) : null; };

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'blindomok', `seed=${3 + me * 4 + vp.w % 7}&me=${me}`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `bo-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, puts = 0, ends = 0, coachTested = 0, selTested = 0, colTested = 0, whiteTested = 0, sizeTested = 0, k = 0;
    const shown = new Set();
    for (k = 1; k <= 260; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, black: V.black === h.ME, lastC: V.lastC, n: V.mv.length }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW, HEX);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (!shown.has(s.phase + s.mine + (s.n > 8))) { shown.add(s.phase + s.mine + (s.n > 8)); await shot(`${s.phase}${s.mine ? '-me' : ''}${s.n > 8 ? '-mid' : ''}`); }
      if (s.over) { over = true; break; }
      if (s.phase === 'gameend') {
        ends++;
        const t = await page.evaluate(() => document.querySelector('.bo-st').innerText);
        ok(/(5목!|무승부)/.test(t) && /밑면 공개/.test(t), `${tag} #${k}: 판 끝 글 ${t}`);
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
      if (sizeTested < 4) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachTested < (QUICK ? 2 : 4)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)/.test(r.text) && /\d/.test(r.c.mine), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 220)}`);
        if (sampleShown < 2 && vp.w === 375) { sampleShown++; console.log(`· 선생님 글 예시:\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
      const pick = i => page.locator(`.bo-board .hit[data-p="${i}"]`).click();
      if (selTested < 2) {                                   // 고르기 → 고스트 → 다시 눌러 풀기
        await pick(a.p);
        let r = await page.evaluate(() => ({ gh: [...document.querySelectorAll('.bo-board .gh')].map(c => +c.dataset.i), dis: document.querySelector('[data-a="put"]').disabled, txt: document.querySelector('[data-a="put"]').innerText }));
        ok(JSON.stringify(r.gh) === JSON.stringify([a.p]) && !r.dis && /두기 · /.test(r.txt), `${tag} #${k}: 점 고르기 · 고스트 ${JSON.stringify(r)}`);
        if (selTested === 0) await shot('selected');
        await pick(a.p);
        r = await page.evaluate(() => ({ gh: document.querySelectorAll('.bo-board .gh').length, dis: document.querySelector('[data-a="put"]').disabled }));
        ok(r.gh === 0 && r.dis, `${tag} #${k}: 다시 눌러 풀기 ${JSON.stringify(r)}`);
        selTested++;
      }
      let col = s.lastC;
      if (s.black) {
        col = colTested < 3 ? (k * 3) % 7 : a.c;
        await page.locator(`.bo-pal [data-col="${col}"]`).click();
        const on = await page.evaluate(() => [...document.querySelectorAll('.bo-pal button.on')].map(b => +b.dataset.col));
        ok(JSON.stringify(on) === JSON.stringify([col]), `${tag} #${k}: 색 고르기 ${on} ≠ ${col}`);
        colTested++;
      } else if (whiteTested < 2) {
        const t = await page.evaluate(() => document.querySelector('.bo-fix').innerText);
        ok(t.includes(['빨강', '주황', '노랑', '초록', '하늘', '파랑', '보라'][s.lastC]), `${tag} #${k}: 백은 흑의 색 ${t}`);
        whiteTested++;
      }
      await pick(a.p);
      const g = await page.evaluate(() => { const c = document.querySelector('.bo-board .gh'); return c && c.getAttribute('fill'); });
      ok(g === HEX[col], `${tag} #${k}: 고스트 색 ${g} ≠ ${HEX[col]}`);
      await page.locator('[data-a="put"]').click();
      const L = await page.evaluate(LAST);
      ok(L && L.t === 'put' && L.p === a.p && L.c === col, `${tag} #${k}: 두기 기록 ${JSON.stringify(L)} (${a.p} 색 ${col})`);
      puts++;
    }
    ok(over, `${tag}: 게임이 끝나지 않음 (${k}걸음)`);
    ok(puts >= 4 && ends === 1, `${tag}: 두기 ${puts} · 판 끝 ${ends}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.bo-st').innerText, res: h.result(), btn: t.querySelectorAll('.bo-act button,.bo-board .hit').length }; });
    ok(/(이겼어요|졌어요|무승부)/.test(e.st) && /1판 ⚫/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 흑백 보기 켬 · 15줄 · 3판 2선승
  {
    const { page, errs, close } = await open(browser, base, 'blindomok', 'seed=6&me=0&cfg_peek=1&cfg_size=15&cfg_games=3', VPS[0]);
    await page.evaluate(() => window.__h.hold(true));
    let r = await page.evaluate(() => { const h = window.__h, V = h.view(); return { N: V.N, need: V.need, lines: document.querySelectorAll('.bo-board .gl').length, sub: h.U.sub(V) }; });
    ok(r.N === 15 && r.need === 2 && r.lines === 30 && /1판/.test(r.sub), `15줄 · 3판 2선승 ${JSON.stringify(r)}`);
    await page.evaluate(() => { const h = window.__h, st = h.st(), V = h.view(); const b = V.black; if (V.cur !== b) return; h.C.apply(st, b, { t: 'put', p: 112, c: 2 }); h.C.apply(st, 1 - b, { t: 'put', p: 113 }); h.render(); });
    r = await page.evaluate(HEX => { const d = document.querySelectorAll('.bo-board .rv').length, s = document.querySelectorAll('.bo-board .sn').length; return { d, s }; }, HEX);
    ok(r.s >= 1 && r.d === r.s, `흑백 보기 켬 → 밑면 점 ${JSON.stringify(r)}`);
    const d = await page.evaluate(DRAW, HEX);
    ok(!d.length, '흑백 보기 그림 ' + d.slice(0, 3));
    for (const x of errs) ok(false, `옵션: ${x}`);
    await close();
  }
  // 구경꾼 — 밑면이 보이고 단추 없음
  {
    const { page, errs, close } = await open(browser, base, 'blindomok', 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => { const h = window.__h, st = h.st(), f = h.C.init({ n: 2, seed: 4 }); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f); const b = st.black; h.C.apply(st, b, { t: 'put', p: 180, c: 3 }); h.C.apply(st, 1 - b, { t: 'put', p: 181 }); h.C.apply(st, b, { t: 'put', p: 200, c: 5 }); h.render(); });
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.bo-act button,.bo-board .hit').length, sn: document.querySelectorAll('.bo-board .sn').length, rv: document.querySelectorAll('.bo-board .rv').length, st: document.querySelector('.bo-st').innerText }));
    const m = await measure(page);
    ok(r.btn === 0 && r.sn === 3 && r.rv === 3 && /두는 중/.test(r.st) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  if (!(await page.locator('.bo-board .hit').count())) return false;
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (await page.locator('.bo-pal').count()) await page.locator(`.bo-pal [data-col="${a.c}"]`).click();
  await page.locator(`.bo-board .hit[data-p="${a.p}"]`).click();
  await page.locator('[data-a="put"]').click();
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('.hit[data-p="0"]'); if (w) { w.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; } }   // 먼저 엉뚱한 점
    if (k2 === 1) { const w = box.querySelector('[data-a="put"]'); if (w && !w.disabled) { w.click(); return true; } }                                      // 두기 → 5목 아님 → 처음부터
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    if (b.tagName.toLowerCase() === 'rect') b.dispatchEvent(new MouseEvent('click', { bubbles: true })); else b.click();
    return true;
  }, k);
}

(async () => {
  const f = await session('블라인드 오목 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('blindomok', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1' : ''), ns: [2, 2, 2] });
})();

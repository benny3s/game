// 바그찰 화면 시험: node survival/test/baghchal_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 경기를 두며 넘침 · 큰 판 · 작은 판이 core 와 같은지 · 놓기/옮길 말 표시 ·
//     말 선택 → 초록(한 칸) · 빨강(잡기)이 규칙과 같은지 · 다른 판 들여다보기 · 내 차례 1/2 → 2/2 판 바뀜 · 선생님 ! ★
//  ② 잡기 장면: 호랑이 → 빨간 점선 → 염소가 빠지고 잡은 수 +1, 엉뚱한 점은 안 먹음
//  ③ 끝 장면 글 · 결과 html
//  ④ s3ui_lib 로 화면 단추만 눌러 경기 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 판을 그대로 그리는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const board = st.querySelector('.bc-board'), vb = /판 B/.test(board.getAttribute('aria-label')) ? 1 : 0;
  const pts = [...st.querySelectorAll('.bc-board .bc-p')];
  if (pts.length !== 25) bad.push('점 ' + pts.length);
  pts.forEach(p => {
    const i = +p.dataset.c, pc = p.querySelector('.bc-pc'), c = V.B[vb].c[i];
    if (!!pc !== !!c) bad.push('말 있음/없음 ' + i);
    else if (pc && pc.classList.contains('g') !== (c === 1)) bad.push('종류 ' + i);
  });
  st.querySelectorAll('.bc-card').forEach((cd, b) => {
    const g = cd.querySelectorAll('.bc-mini i.g').length, t = cd.querySelectorAll('.bc-mini i.t').length;
    if (g !== V.B[b].c.filter(x => x === 1).length || t !== 4) bad.push(`작은 판 ${b}: 염소 ${g} 호랑이 ${t}`);
    if (!new RegExp(`잡힘 ${V.B[b].cap}/`).test(cd.innerText)) bad.push(`작은 판 ${b} 잡힘 글`);
  });
  const can = V.needs.includes(me) && !V.over;
  if (can && vb === V.cur.b) {
    const L = h.C.legal(V, me), sorted = a => [...a].sort((x, y) => x - y);
    const got = q => sorted([...st.querySelectorAll(q)].map(x => +x.dataset.c));
    if (L[0].t === 'place' && JSON.stringify(got('.bc-p.pl')) !== JSON.stringify(sorted(L.map(a => a.to)))) bad.push('놓기 표시');
    if (L[0].t === 'move' && !st.querySelector('.bc-p.sel') && JSON.stringify(got('.bc-p.mv')) !== JSON.stringify(sorted(new Set(L.map(a => a.from))))) bad.push('옮길 말 표시');
    const pill = st.querySelector('.bc-pill').innerText;
    if (!/내 차례 [12]\/[12]/.test(pill)) bad.push('윗줄 ' + pill);
    if (!st.querySelector(`.bc-card[data-v="${V.cur.b}"].on`)) bad.push('지금 둘 판 표시');
  }
  return bad;
};
const MARKS = () => {                         // 선생님 창이 열렸을 때만: 내 염소 판 '!'(잡힐 염소) · 내 호랑이 판 '★'(잡을 염소)
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me), out = {};
  for (const b of [0, 1]) {
    const mk = on => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: on, g: 99, wait: false, sfx() {}, toast() {} });
      // 그 판을 크게: 작은 판 단추 누르기 (들여다보기는 같은 수 안에서 남아 있으니 늘 누름)
      d.querySelector(`[data-v="${b}"]`).click();
      if (!new RegExp(`판 ${'AB'[b]}`).test(d.querySelector('.bc-board').getAttribute('aria-label'))) return { bang: ['판 안 바뀜'], star: [] };
      const cells = q => [...d.querySelectorAll(q)].map(x => +x.parentElement.dataset.c).sort((a, c) => a - c); return { bang: cells('.bc-bang'), star: cells('.bc-star') }; };
    const ex = C.exposed(V.B[b].c), mine = V.B[b].goat === me;
    out[b] = { want: { bang: mine ? ex : [], star: mine ? [] : ex }, on: mk(true), off: mk(false) };
  }
  return out;
};
const COACH = () => {                         // 선생님 글: 빈칸 · undefined 없음, 추천 수는 규칙 안
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, Math.max(-1, V.log.length ? V.log[V.log.length - 1].i - 4 : -1), h.seats.map(s => s.name));
  const r = C.recommend(V, me), legal = C.legal(V, me).map(a => JSON.stringify(a));
  return { c, recOk: !r || legal.includes(JSON.stringify(r.a)), text: c.opp + c.mine + c.rec + c.why };
};

async function extras({ browser, base, ok }) {
  let sampleShown = false;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'baghchal', `seed=${7 + me * 5}&me=${me}`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `bc-${vp.w}x${vp.h}-${name}.png`) }); };
    let selTested = 0, jumpSeen = 0, markTested = 0, coachTested = 0, peekTested = 0, partSeen = 0, over = false, lastPart = '';
    for (let n = 1; n <= 500; n++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), b: V.cur ? V.cur.b : -1, role: V.cur ? V.cur.role : '', h: V.cur ? V.B[V.cur.b].h : 0, step: V.step }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${n}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${n}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${n}: undefined/NaN 글`);
      if (n === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (!s.mine) { ok(false, `${tag} #${n}: 내 차례가 아닌데 멈춤`); break; }
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${n}: 화면이 판과 다름 ${d}`);
      // 점 크기 (누르기 좋은 크기)
      if (n === 1) { const z = await page.evaluate(() => { const b = document.querySelector('.bc-board .bc-p').getBoundingClientRect(), c = document.querySelector('.bc-card').getBoundingClientRect(); return [b.width, c.height]; });
        ok(z[0] >= 44 && z[1] >= 44, `${tag}: 누르는 점 ${z[0].toFixed(0)}px · 작은 판 단추 ${z[1].toFixed(0)}px (44 이상)`); }
      // 내 차례 1/2 → 2/2: 판이 저절로 바뀜
      const part = await page.evaluate(() => (document.querySelector('.bc-pill').innerText.match(/\d\/2/) || [''])[0]);
      if (lastPart === '1/2' && part === '2/2') partSeen++;
      lastPart = part;
      // 말을 누르면 선택 · 갈 곳 표시(초록 · 빨강)가 core.legal 과 같고, 다시 누르면 취소
      if (s.role === 't' || (s.role === 'g' && s.h === 0)) {
        const mv = page.locator('.bc-p.mv'), k = await mv.count();
        const jumpFrom = await page.evaluate(() => { const h = window.__h, V = h.view(); const a = h.C.legal(V, h.ME).find(x => x.t === 'move' && !h.C.ADJ[x.from].includes(x.to)); return a ? a.from : -1; });
        if (k && (selTested < 5 || (jumpFrom >= 0 && jumpSeen < 3))) {
          if (jumpFrom >= 0) await page.locator(`.bc-p.mv[data-c="${jumpFrom}"]`).click(); else await mv.nth(n % k).click();
          selTested++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.view(), sel = [...document.querySelectorAll('.bc-p.sel')].map(x => +x.dataset.c);
            const q = c => [...document.querySelectorAll(c)].map(x => +x.dataset.c).sort((a, b) => a - b);
            const L = sel.length ? h.C.legal(V, h.ME).filter(a => a.t === 'move' && a.from === sel[0]) : [];
            const adj = L.filter(a => h.C.ADJ[a.from].includes(a.to)).map(a => a.to).sort((a, b) => a - b), jp = L.filter(a => !h.C.ADJ[a.from].includes(a.to));
            const over = jp.map(a => h.C.JMP[a.from].find(z => z[1] === a.to)[0]).sort((a, b) => a - b);
            return { sel, tg: q('.bc-p.tg'), tj: q('.bc-p.tj'), vx: q('.bc-p.vx'), adj, jp: jp.map(a => a.to).sort((a, b) => a - b), over, lines: document.querySelectorAll('.bc-board svg line.jp').length, info: document.querySelector('.bc-info').innerText }; });
          ok(r.sel.length === 1 && JSON.stringify(r.tg) === JSON.stringify(r.adj) && JSON.stringify(r.tj) === JSON.stringify(r.jp) && JSON.stringify(r.vx) === JSON.stringify(r.over) && r.lines === r.jp.length && r.tg.length + r.tj.length > 0,
            `${tag} #${n}: 말 선택 표시가 규칙과 다름 ${JSON.stringify(r)}`);
          if (r.tj.length) { jumpSeen++; ok(/빨강/.test(r.info), `${tag} #${n}: 잡기 안내 글 '${r.info}'`); if (jumpSeen === 1) await shot('jump'); }
          const mm = await measure(page); ok(!mm.docx && !mm.sx && mm.sy <= 2, `${tag} #${n}: 선택 중 화면 넘침`);
          if (selTested === 1) await shot('selected');
          await page.locator('.bc-p.sel').click();
          const after = await page.evaluate(() => ({ sel: document.querySelectorAll('.bc-p.sel').length, tg: document.querySelectorAll('.bc-p.tg,.bc-p.tj').length }));
          ok(after.sel === 0 && after.tg === 0, `${tag} #${n}: 같은 말을 다시 눌러도 선택이 안 풀림`);
        }
      }
      // 다른 판 들여다보기 → 그 판에선 못 둠 → 돌아오기
      if (n % 9 === 4 && peekTested < 3) {
        const other = 1 - s.b; peekTested++;
        await page.locator(`.bc-card[data-v="${other}"]`).click();
        const r = await page.evaluate(o => { const t = document.getElementById('stage'), V = window.__h.view(); return { aria: t.querySelector('.bc-board').getAttribute('aria-label'), info: t.querySelector('.bc-info').innerText, pl: t.querySelectorAll('.bc-p.pl,.bc-p.mv').length, same: [...t.querySelectorAll('.bc-board .bc-p')].every(p => !!p.querySelector('.bc-pc') === !!V.B[o].c[+p.dataset.c]) }; }, other);
        ok(r.aria === `판 ${'AB'[other]}` && /보는 중/.test(r.info) && r.pl === 0 && r.same, `${tag} #${n}: 다른 판 보기 ${JSON.stringify(r)}`);
        if (peekTested === 1) await shot('peek');
        const before = await page.evaluate(() => window.__h.view().step);
        await page.locator('.bc-board .bc-p').nth(12).click();
        ok(await page.evaluate(() => window.__h.view().step) === before, `${tag} #${n}: 보기만 하는 판에서 수가 먹음`);
        await page.locator(`.bc-card[data-v="${s.b}"]`).click();
        ok(await page.evaluate(b => /판 [AB]/.test(document.querySelector('.bc-board').getAttribute('aria-label')) && document.querySelector('.bc-board').getAttribute('aria-label') === `판 ${'AB'[b]}`, s.b), `${tag} #${n}: 돌아오기`);
      }
      if (n % 3 === 0 && markTested < 12) {
        const r = await page.evaluate(MARKS); markTested++;
        for (const b of [0, 1]) {
          ok(r[b].off.bang.length === 0 && r[b].off.star.length === 0, `${tag} #${n}: 선생님 창이 닫혔는데 ! ★ 표시 (판 ${b})`);
          ok(JSON.stringify(r[b].on) === JSON.stringify(r[b].want), `${tag} #${n}: ! ★ 표시가 잡힐/잡을 염소와 다름 (판 ${b}) ${JSON.stringify(r[b])}`);
        }
      }
      if (n % 5 === 1 && coachTested < (QUICK ? 3 : 8)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 40 && !/undefined|NaN|null|\[object/.test(r.text), `${tag} #${n}: 선생님 글 이상 ${r.text.slice(0, 160)}`);
        if (!sampleShown && r.c.why && n > 20) { sampleShown = true; console.log('· 선생님 글 예시:\n   👀', r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      // 내 수 (AI 수를 core 에 직접 — 이 시험은 화면 배치가 목적, 단추 놀이는 ④ 가 함)
      const a = await page.evaluate(() => { const h = window.__h; return h.act(h.C.ai(h.view(), h.ME, 'normal', h.rnd)).ok; });
      ok(a, `${tag} #${n}: AI 수가 안 먹음`);
    }
    ok(over, `${tag}: 경기가 끝나지 않음`);
    ok(partSeen >= 1, `${tag}: 내 차례 1/2 → 2/2 가 안 보임`);
    if (vp.w === 375) {
      const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { info: t.querySelector('.bc-info').innerText, res: h.result(), cls: t.querySelector('.bc-info').className }; });
      ok(/승|무승부/.test(e.info) && /end/.test(e.cls) && /호랑이로 잡은 염소/.test(e.res), `${tag}: 끝 글 · 결과 글 ${e.info} / ${e.res.slice(0, 120)}`);
      await shot('end');
    }
    for (const e of errs) ok(false, `${tag}: ${e}`);
    await close();
  }

  // ② 잡기 장면을 직접 만들어 단추로: 내 호랑이 차례 → 엉뚱한 점 (안 먹음) → 빨간 점선 (잡힘)
  for (const vp of VPS.slice(0, 2)) {
    const tag = `잡기-${vp.w}x${vp.h}`;
    const { page, errs, close } = await open(browser, base, 'baghchal', 'seed=3&me=0', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st();
      st.X = 0; st.step = 4; st.over = false; st.res = null;            // step 4 = 판 B 호랑이 (선공 = 나)
      const c = Array(25).fill(0); [12, 0, 4, 24].forEach(p => { c[p] = 2; }); [7, 11, 3].forEach(p => { c[p] = 1; });
      st.B[1] = { c, h: 10, cap: 2, last: null, moves: 0 };
      h.render();
    });
    let r = await page.evaluate(() => { const t = document.getElementById('stage'); return { aria: t.querySelector('.bc-board').getAttribute('aria-label'), pill: t.querySelector('.bc-pill').innerText, frame: t.querySelector('.bc-board').className }; });
    ok(r.aria === '판 B' && /내 차례 2\/2/.test(r.pill) && /mt/.test(r.frame), `${tag}: 내 호랑이 판이 크게 ${JSON.stringify(r)}`);
    await page.locator('.bc-p.mv[data-c="12"]').click();
    r = await page.evaluate(() => { const t = document.getElementById('stage'); return { tj: [...t.querySelectorAll('.bc-p.tj')].map(x => +x.dataset.c).sort((a, b) => a - b), vx: [...t.querySelectorAll('.bc-p.vx')].map(x => +x.dataset.c).sort((a, b) => a - b) }; });
    ok(JSON.stringify(r.tj) === '[2,10]' && JSON.stringify(r.vx) === '[7,11]', `${tag}: 빨간 점선 · 잡힐 염소 ${JSON.stringify(r)}`);
    if (vp.w === 375) await page.screenshot({ path: path.join(SH, `bc-${vp.w}x${vp.h}-capture.png`) });
    await page.locator('.bc-board .bc-p[data-c="22"]').click();            // 두 칸 떨어진 빈 점 (염소 없음) — 안 먹음
    r = await page.evaluate(() => ({ step: window.__h.view().step, c22: window.__h.view().B[1].c[22] }));
    ok(r.step === 4 && r.c22 === 0, `${tag}: 엉뚱한 점이 먹음 ${JSON.stringify(r)}`);
    await page.locator('.bc-p.mv[data-c="12"]').click();
    // 375 는 빨간 점선 빈 점, 390 은 잡을 염소(빨간 테)를 바로 눌러 잡기
    await page.locator(vp.w === 375 ? '.bc-p.tj[data-c="2"]' : '.bc-p.vx[data-c="7"]').click();
    r = await page.evaluate(() => { const V = window.__h.view(); return { c7: V.B[1].c[7], c2: V.B[1].c[2], cap: V.B[1].cap, step: V.step, card: document.querySelector('.bc-card[data-v="1"]').innerText }; });
    ok(r.c7 === 0 && r.c2 === 2 && r.cap === 3 && r.step > 4 && /잡힘 3\/5/.test(r.card), `${tag}: 잡기가 안 됨 ${JSON.stringify(r)}`);
    const m = await measure(page); ok(!m.docx && !m.sx && m.sy <= 2 && m.outB <= 2, `${tag}: 화면 넘침 ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  // 단추만: 놓기(금색 점선) · 옮기기(말 → 초록/빨강 점선, 빨강이 있으면 먼저), 가끔 엉뚱한 곳 눌러 보기
  const pl = page.locator('.bc-p.pl'), npl = await pl.count();
  if (npl) { if (step % 9 === 4) { const f = page.locator('.bc-p.f').first(); if (await f.count()) await f.click(); } await pl.nth(step % npl).click(); return true; }
  const mv = page.locator('.bc-p.mv'), nmv = await mv.count();
  if (nmv) {
    await mv.nth(step % nmv).click();
    const tj = page.locator('.bc-p.tj'), nj = await tj.count();
    if (nj && step % 3) { await tj.nth(step % nj).click(); return true; }
    const tg = page.locator('.bc-p.tg, .bc-p.tj'), nt = await tg.count();
    if (!nt) return false;
    await tg.nth(step % nt).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-c="0"]'); if (w) { w.click(); return true; } }    // 먼저 틀린 점
    if (k2 === 2) { const w = box.querySelector('[data-c="13"]'); if (w) { w.click(); return true; } }   // 초록(한 칸) 점
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('바그찰 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('baghchal', policy, { runs: QUICK ? 2 : 4, tutPolicy, query: r => `${r % 2 ? 'me=1' : ''}` });
})();

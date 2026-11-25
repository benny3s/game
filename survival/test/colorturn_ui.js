// 컬러턴 화면 시험: node survival/test/colorturn_ui.js [--shots 폴더] [--runs 4] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 한 판씩 스크립트로 두며 넘침 · 선택 표시 · 🔒 · 지뢰 · '!' 표시 검사
//  ② 숨은 지뢰 배치만 다른 두 세계에서 선생님 글 · 화면 html 이 똑같은지
//  ③ 단추로 4목을 완성해 끝 장면(지뢰 전부 보임 · 이긴 줄 강조 · 결과 글) 확인
//  ④ s3ui_lib 로 화면 단추만 눌러 한 판 끝까지 (내 자리 0 · 1 둘 다) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const HIDDEN = () => {                       // 숨은 지뢰만 다른 두 세계 (안 밟은 칸끼리 줄 안에서 돌려놓음)
  const h = window.__h, C = h.C, U = h.U, st = h.st(), me = h.ME;
  const alt = JSON.parse(JSON.stringify(st)); let changed = 0;
  for (let r = 0; r < 6; r++) {
    const u = []; for (let c = 0; c < 6; c++) if (st.known[r * 6 + c] === 0) u.push(r * 6 + c);
    const pat = u.map(i => st.mine[i]), rot = pat.slice(1).concat(pat.slice(0, 1));
    u.forEach((i, k) => { alt.mine[i] = rot[k]; });
    if (pat.join() !== rot.join()) changed++;
  }
  const names = h.seats.map(s => s.name), same = [], texts = [];
  for (const since of [-1, Math.max(0, st.log.length - 4)]) {
    const a = U.coach(C.view(st, me), me, since, names), b = U.coach(C.view(alt, me), me, since, names);
    same.push(JSON.stringify(a) === JSON.stringify(b)); texts.push(a.opp + a.mine + a.rec + a.why);
  }
  const va = C.view(st, me), vb = C.view(alt, me);
  const mk = V => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: true, g: 1, wait: false, sfx() {}, toast() {} }); return d.innerHTML; };
  const aiA = JSON.stringify(C.ai(va, me, 'normal', () => 0.5)), aiB = JSON.stringify(C.ai(vb, me, 'normal', () => 0.5));
  return { changed, same, pubSame: va.pub === vb.pub, jsonSame: JSON.stringify(va) === JSON.stringify(vb), htmlSame: mk(va) === mk(vb), aiSame: aiA === aiB, texts, sample: U.coach(C.view(st, me), me, -1, names) };
};
const DRAW = () => {                          // 화면이 core 의 판을 그대로 그리는지 (칩 색 · 칸 종류 · 줄 끝 숫자 · 뒤집힌 판 순서)
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), k = V.known, c = V.cells, n = q => st.querySelectorAll(q).length;
  const want = { b: c.filter(x => x === 1).length, w: c.filter(x => x === 2).length, m: k.filter(x => x === 2).length, s: k.filter(x => x === 1).length, u: k.filter(x => x === 0).length };
  const got = { b: n('.ct-chip.b'), w: n('.ct-chip.w'), m: n('.ct-c.m'), s: n('.ct-c.s'), u: n('.ct-c.u') };
  const rows = []; for (let r = 0; r < 6; r++) { let rev = 0, unk = 0; for (let q = 0; q < 6; q++) { const x = k[r * 6 + q]; if (x === 2) rev++; else if (x === 0) unk++; } rows.push(unk ? `${Math.max(0, 3 - rev)}/${unk}` : '·'); }
  const flip = h.ME === 1, wantHints = flip ? rows.slice().reverse() : rows;
  const hints = [...st.querySelectorAll('.ct-rh i')].map(x => x.innerText), order = [...st.querySelectorAll('.ct-board > .ct-c')].map(x => +x.dataset.c);
  const bombs = n('.ct-bomb'), okMarks = n('.ct-ok');
  return { want, got, hintsOk: JSON.stringify(hints) === JSON.stringify(wantHints), hints, wantHints, orderOk: JSON.stringify(order) === JSON.stringify(Array.from({ length: 36 }, (_, i) => flip ? 35 - i : i)), bombsOk: bombs === want.m, okOk: okMarks === want.s };
};
const MARKS = () => {                         // 선생님 창이 열렸을 때 '!' · '★' 가 위협 칸에만 나오는지 (창이 닫히면 없음)
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const th = C.threats(V.cells), want = new Set(th.map(t => t.empty)).size;
  const mk = on => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: on, g: 1, wait: false, sfx() {}, toast() {} }); return { bang: d.querySelectorAll('.ct-bang').length, star: d.querySelectorAll('.ct-star').length, onCells: [...d.querySelectorAll('.ct-bang,.ct-star')].map(x => +x.parentElement.dataset.c).sort((a, b) => a - b) }; };
  return { want, on: mk(true), off: mk(false), cells: [...new Set(th.map(t => t.empty))].sort((a, b) => a - b) };
};

async function extras({ browser, base, ok }) {
  let sampleShown = false;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'colorturn', `seed=${7 + me * 5}&me=${me}`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `ct-${vp.w}x${vp.h}-${name}.png`) }); };
    let lockSeen = 0, selTested = 0, hidTested = 0, markTested = 0, mineSeen = 0, over = false;
    for (let n = 1; n <= 100; n++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), tc: V.tc, lastTo: V.lastTo, left: V.left[h.ME], known2: V.known.filter(k => k === 2).length }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${n}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${n}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${n}: undefined/NaN 글`);
      mineSeen = Math.max(mineSeen, s.known2);
      if (n === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (!s.mine) { await page.evaluate(() => window.__h.next()); continue; }
      const d = await page.evaluate(DRAW);
      ok(JSON.stringify(d.want) === JSON.stringify(d.got) && d.hintsOk && d.orderOk && d.bombsOk && d.okOk, `${tag} #${n}: 화면이 판과 다름 ${JSON.stringify(d)}`);
      // 🔒 : 상대가 방금 옮긴 칩에만 붙는지
      const locks = await page.evaluate(() => [...document.querySelectorAll('.ct-lock')].map(x => +x.parentElement.dataset.c));
      if (s.lastTo >= 0) { ok(locks.length === 1 && locks[0] === s.lastTo, `${tag} #${n}: 🔒 가 방금 옮긴 칩(${s.lastTo})에만 있어야 함 (${locks})`); lockSeen++; } else ok(locks.length === 0, `${tag} #${n}: 옮긴 칩이 없는데 🔒 (${locks})`);
      // 칩을 눌렀을 때 선택 · 갈 수 있는 칸 표시가 core.legal 과 같은지, 다시 누르면 취소
      if (n % 5 === 2 && selTested < 3) {
        const mv = page.locator('.ct-c.mv'), k = await mv.count();
        if (k) {
          const idx = n % k; await mv.nth(idx).click(); selTested++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.view(), sel = [...document.querySelectorAll('.ct-c.sel')].map(x => +x.dataset.c);
            const tg = [...document.querySelectorAll('.ct-c.tg')].map(x => +x.dataset.c).sort((a, b) => a - b);
            const want = sel.length ? h.C.legal(V, h.ME).filter(a => a.t === 'move' && a.from === sel[0]).map(a => a.to).sort((a, b) => a - b) : [];
            return { sel, tg, want }; });
          ok(r.sel.length === 1 && JSON.stringify(r.tg) === JSON.stringify(r.want) && r.tg.length > 0, `${tag} #${n}: 칩 선택 표시가 규칙과 다름 ${JSON.stringify(r)}`);
          const mm = await measure(page); ok(!mm.docx && !mm.sx && mm.sy <= 2, `${tag} #${n}: 선택 중 화면 넘침`);
          if (selTested === 1) await shot('selected');
          await page.locator(`.ct-c.sel`).click();
          const after = await page.evaluate(() => ({ sel: document.querySelectorAll('.ct-c.sel').length, tg: document.querySelectorAll('.ct-c.tg').length }));
          ok(after.sel === 0 && after.tg === 0, `${tag} #${n}: 같은 칩을 다시 눌러도 선택이 안 풀림`);
        }
      }
      // 상대가 방금 옮긴 칩은 눌러도 안 움직임 (쪽지만)
      if (s.lastTo >= 0 && n % 4 === 0) {
        const before = await page.evaluate(() => window.__h.view().tc);
        await page.locator(`.ct-c[data-c="${s.lastTo}"]`).click();
        const r = await page.evaluate(() => ({ tc: window.__h.view().tc, sel: document.querySelectorAll('.ct-c.sel').length, err: window.__h.lastErr() }));
        ok(r.tc === before && r.sel === 0, `${tag} #${n}: 잠긴 칩을 눌렀는데 선택되거나 움직임`);
      }
      // 숨은 지뢰만 다른 두 세계 = 선생님 글 · 화면 같음 (몇 번만)
      if (n % 9 === 3 && hidTested < 2 && !QUICK) {
        const r = await page.evaluate(HIDDEN); hidTested++;
        ok(r.same.every(Boolean), `${tag} #${n}: 숨은 지뢰만 다른데 선생님 글이 달라짐`);
        ok(r.pubSame && r.jsonSame && r.htmlSame && r.aiSame, `${tag} #${n}: 숨은 지뢰만 다른데 보이는 것 · 화면 · AI 수가 달라짐 ${JSON.stringify({ p: r.pubSame, j: r.jsonSame, h: r.htmlSame, a: r.aiSame })}`);
        ok(r.texts.every(t => !/지뢰(예요|입니다|가 있어요|칸이에요)/.test(t)), `${tag} #${n}: 안 밟은 칸을 지뢰라고 단정함: ${r.texts[0].slice(0, 160)}`);
        if (r.changed) ok(true, ''); else if (hidTested === 2) console.log(`· 메모: ${tag} 두 세계가 같아서 비교가 약함`);
        if (!sampleShown && s.tc >= 3) { sampleShown = true; console.log('· 선생님 글 예시 (내 차례, 안 밟은 칸 확률 · 3목 위협):\n   👀', r.sample.opp, '\n   📊', r.sample.mine, '\n   💡', r.sample.rec, '\n   👉', r.sample.why); }
      }
      // '!' · '★' 표시
      if (n % 3 === 0 && markTested < 12) {
        const r = await page.evaluate(MARKS); markTested++;
        ok(r.off.bang === 0 && r.off.star === 0, `${tag} #${n}: 선생님 창이 닫혔는데 ! 표시`);
        ok(r.on.bang + r.on.star === r.want && JSON.stringify(r.on.onCells) === JSON.stringify(r.cells), `${tag} #${n}: ! 표시가 위협 칸과 다름 ${JSON.stringify(r)}`);
      }
      // 내 수 (정직한 AI 수를 core 에 직접 — 이 시험은 화면 배치가 목적, 단추 놀이는 아래 ④ 가 함)
      const a = await page.evaluate(() => { const h = window.__h; return h.act(h.C.ai(h.view(), h.ME, 'normal', h.rnd)).ok; });
      ok(a, `${tag} #${n}: AI 수가 안 먹음`);
    }
    ok(over, `${tag}: 한 판이 끝나지 않음`);
    ok(mineSeen > 0, `${tag}: 한 판 동안 지뢰가 한 번도 안 드러남 (시험 장면이 약함)`);
    if (me === 0 && vp.w === 375) await shot('end');
    for (const e of errs) ok(false, `${tag}: ${e}`);
    await close();
  }
  console.log('· 메모: 가로 · 세로 넘침 시험은 화면 크기 3종 × 내 자리 2곳으로 한 판씩 (스크린샷:', SH + ')');

  // ③ 단추로 4목 완성 → 끝 장면
  for (const vp of VPS.slice(0, 2)) {
    const tag = `끝장면-${vp.w}x${vp.h}`;
    const { page, errs, close } = await open(browser, base, 'colorturn', 'seed=3&me=0', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st();
      st.cells.fill(0); st.known.fill(0); st.placed = [3, 2]; st.lastTo = -1; st.turn = 0; st.first = 0; st.tc = 5; st.over = false; st.win = -1; st.line = [];
      [31, 32, 33].forEach(i => { st.cells[i] = 1; }); [2, 4].forEach(i => { st.cells[i] = 2; });
      h.render();
    });
    const pl = await page.locator('.ct-c.pl').evaluateAll(x => x.map(e => +e.dataset.c));
    ok(JSON.stringify(pl) === JSON.stringify([30, 34, 35]), `${tag}: 올릴 수 있는 칸 표시가 내 앞 첫 줄 빈칸이 아님 (${pl})`);
    await page.locator('.ct-c.pl[data-c="35"]').click();                    // 끊긴 칸 = 4목 아님 (그냥 놓임) — 먼저 다른 판에서 확인하려고 되돌려 쓰지 않음
    const mid = await page.evaluate(() => ({ over: window.__h.view().over }));
    ok(!mid.over, `${tag}: 끊긴 칸(35)에 올렸는데 끝남`);
    // 35 에 올렸으니 다시 장면을 만들어 34 에 올림
    await page.evaluate(() => {
      const h = window.__h, st = h.st();
      st.cells.fill(0); st.known.fill(0); st.placed = [3, 2]; st.lastTo = -1; st.turn = 0; st.first = 0; st.tc = 5; st.over = false; st.win = -1; st.line = [];
      [31, 32, 33].forEach(i => { st.cells[i] = 1; }); [2, 4].forEach(i => { st.cells[i] = 2; });
      h.render();
    });
    await page.locator('.ct-c.pl[data-c="34"]').click();
    const e = await page.evaluate(() => {
      const h = window.__h, V = h.view(), t = document.getElementById('stage');
      return { over: V.over, win: V.win, winCells: [...t.querySelectorAll('.ct-c.win')].map(x => +x.dataset.c).sort((a, b) => a - b), bombs: t.querySelectorAll('.ct-bomb').length, info: t.querySelector('.ct-info').innerText, res: h.result(), pl: t.querySelectorAll('.ct-c.pl').length, lock: t.querySelectorAll('.ct-lock').length, mines: V.mines && V.mines.filter(Boolean).length };
    });
    ok(e.over && e.win && e.win.seat === 0, `${tag}: 4목 완성인데 끝나지 않음`);
    ok(JSON.stringify(e.winCells) === JSON.stringify([31, 32, 33, 34]), `${tag}: 이긴 줄 강조가 다름 ${e.winCells}`);
    ok(e.bombs === 18 && e.mines === 18, `${tag}: 끝났는데 지뢰가 18개 다 안 보임 (${e.bombs}/${e.mines})`);
    ok(/4목 완성/.test(e.info) && /4목 완성/.test(e.res) && /B6|C6|D6|E6/.test(e.res), `${tag}: 끝 글 · 결과 글 ${e.info} / ${e.res}`);
    ok(e.pl === 0 && e.lock === 0, `${tag}: 끝났는데 올리기 표시나 🔒 가 남음`);
    const m = await measure(page); ok(!m.docx && !m.sx && m.sy <= 2 && m.outB <= 2, `${tag}: 끝 장면 화면 넘침 ${JSON.stringify(m)}`);
    if (vp.w === 375) await page.screenshot({ path: path.join(SH, `ct-${vp.w}x${vp.h}-winend.png`) });
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  // 단추만: 새 칩 올리기 (빈칸을 눌러서) · 칩 → 빈칸 옮기기 · 가끔 엉뚱한 곳 눌러 보기
  const pl = page.locator('.ct-c.pl'), npl = await pl.count();
  if (step % 11 === 5) { const tc = await page.evaluate(() => window.__h.view().tc); const any = page.locator('.ct-c.u:not(.pl):not(.mv)').first(); if (await any.count()) { await any.click(); const tc2 = await page.evaluate(() => window.__h.view().tc); if (tc2 !== tc) return true; } }
  if (npl && step % 3 !== 0) { await pl.nth(step % npl).click(); return true; }
  const mv = page.locator('.ct-c.mv'), nmv = await mv.count();
  if (nmv) {
    await mv.nth(step % nmv).click();
    const tg = page.locator('.ct-c.tg'), nt = await tg.count();
    if (!nt) return false;
    await tg.nth(step % nt).click(); return true;
  }
  if (npl) { await pl.nth(0).click(); return true; }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-c="35"]'); if (w) { w.click(); return true; } }   // 먼저 틀린 칸
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('컬러턴 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('colorturn', policy, { runs: 4, tutPolicy, query: r => (r % 2 ? 'me=1' : '') });
})();

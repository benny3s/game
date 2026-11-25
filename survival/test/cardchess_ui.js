// 카드 체스 화면 시험: node survival/test/cardchess_ui.js [--shots 폴더] [--runs 4] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) 3세트 한 판씩 — 눌러서(카드→말→칸 · 말→칸 · 칸→카드 … 5가지 순서) 두며 넘침 · 선택 표시 · '!' · 성 줄 · 세트 사이 글 검사
//  ② 보이지 않는 것(난수 상태)만 다른 두 장면에서 선생님 글 · 화면이 똑같은지
//  ③ 성 경고 줄 (내 말이 상대 성에 · 상대 말이 내 성에)
//  ④ s3ui_lib 로 화면 단추만 눌러 한 판 끝까지 (1세트 · 3세트, 내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');
const ORDERS = ['cfp', 'fcp', 'fp', 'tp', 'cp'];
let badMoves = 0;

// 화면 단추로 한 수 두기 — 누르는 순서를 바꿔 가며, 되묻기(어느 카드 · 어느 말)가 나오면 마저 고름
async function domMove(page, a, order) {
  const sel = { card: `.cc-hand [data-card="${a.slot}"]`, from: `.cc-c[data-c="${a.from}"]`, to: `.cc-c[data-c="${a.to}"]` };
  const seq = { cfp: ['card', 'from', 'to'], fcp: ['from', 'card', 'to'], fp: ['from', 'to'], tp: ['to'], cp: ['card', 'to'] }[order];
  const before = await page.evaluate(() => window.__h.view().log.length);
  for (const k of seq) await page.locator(sel[k]).click();
  for (let g = 0; g < 4; g++) {
    if (await page.evaluate(b => window.__h.view().log.length > b, before)) break;
    const st = await page.evaluate(() => ({ askCard: document.querySelectorAll('.cc-card.ok').length, askPiece: document.querySelectorAll('.cc-p.ask').length }));
    if (st.askCard > 0) { await page.locator(sel.card).click(); continue; }
    if (st.askPiece > 0) { await page.locator(sel.from).click(); continue; }
    break;
  }
  return page.evaluate(b => { const h = window.__h, mv = h.view().log.slice(b).filter(e => e.k === 'mv' && e.s === h.ME)[0]; return mv ? { slot: mv.slot, from: mv.from, to: mv.to } : null; }, before);
}
const same = (x, y) => x && y && x.slot === y.slot && x.from === y.from && x.to === y.to;

const HIDDEN = () => {                       // 안 보이는 난수 상태만 다른 두 장면
  const h = window.__h, C = h.C, U = h.U, st = h.st(), me = h.ME;
  const alt = JSON.parse(JSON.stringify(st)); alt.rs = (alt.rs ^ 0x5bd1e995) >>> 0;
  const names = h.seats.map(s => s.name), va = C.view(st, me), vb = C.view(alt, me), same = [];
  for (const since of [-1, Math.max(0, st.log.length - 3)]) same.push(JSON.stringify(U.coach(va, me, since, names)) === JSON.stringify(U.coach(vb, me, since, names)));
  const mk = V => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: true, g: 1, wait: false, sfx() {}, toast() {} }); return d.innerHTML; };
  return { same, pubSame: va.pub === vb.pub, jsonSame: JSON.stringify(va) === JSON.stringify(vb), htmlSame: mk(va) === mk(vb), sample: U.coach(va, me, -1, names) };
};
const DRAW = () => {                          // 화면이 core 의 판을 그대로 그리는지 (말 색 · 보는 방향 ▲▼ · 성 · 칸 순서 · 카드)
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), flip = h.ME === 1, me = h.ME, bad = [];
  st.querySelectorAll('.cc-board > .cc-c').forEach(cell => {
    const i = +cell.dataset.c, p = cell.querySelector('.cc-p'), o = V.cells[i];
    if (!!p !== !!o) bad.push('말 있음/없음 ' + i);
    else if (p) {
      if (p.classList.contains('w') !== (o === 1)) bad.push('색 ' + i);
      const up = (V.face[i] < 0) !== flip, ar = p.querySelector('.cc-ar').textContent;
      if (ar !== (up ? '▲' : '▼')) bad.push('방향 ' + i + ' ' + ar);
    }
    if (!!cell.querySelector('.cc-cs') !== V.castle.includes(i)) bad.push('성 ' + i);
  });
  const order = [...st.querySelectorAll('.cc-board > .cc-c')].map(x => +x.dataset.c);
  if (JSON.stringify(order) !== JSON.stringify(Array.from({ length: 25 }, (_, i) => flip ? 24 - i : i))) bad.push('칸 순서');
  const bottom = [...st.querySelectorAll('.cc-hand .cc-card b')].map(x => x.textContent), top = [...st.querySelectorAll('.cc-opp .cc-card b')].map(x => x.textContent), CN = h.C.CARDS;
  if (JSON.stringify(bottom) !== JSON.stringify(V.hand[me].concat([V.wait]).map(c => CN[c]))) bad.push('내 카드 ' + bottom);
  if (JSON.stringify(top) !== JSON.stringify(V.hand[1 - me].map(c => CN[c]))) bad.push('상대 카드 ' + top);
  return bad;
};
const MARKS = () => {                         // 선생님 창이 열렸을 때 '!' 가 잡힐 내 말에만 나오는지
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const want = C.attacked(V, me).slice().sort((a, b) => a - b);
  const mk = on => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: on, g: 1, wait: false, sfx() {}, toast() {} }); return [...d.querySelectorAll('.cc-bang')].map(x => +x.parentElement.dataset.c).sort((a, b) => a - b); };
  return { want, on: mk(true), off: mk(false) };
};
const STRIP = () => {                         // 성 경고 줄 (직접 만든 장면)
  const h = window.__h, C = h.C, U = h.U, out = {};
  const mk = (setup, me, can) => {
    const st = C.init({ n: 2, seed: 5, cfg: { sets: 1 } }); setup(st);
    const V = C.view(st, me), d = document.createElement('div');
    U.render(d, V, { me, act() {}, canAct: can, seats: h.seats, mode: 'solo', coachOn: false, g: 99, wait: false, sfx() {}, toast() {} });
    const i = d.querySelector('.cc-info'); return { cls: i.className, text: i.innerText, c: U.coach(V, me, -1, ['나', '상대']) };
  };
  out.good = mk(st => { st.cells.fill(0); st.cells[2] = 1; st.cells[7] = 2; st.cells[22] = 1; st.turn = 1; }, 0, false);
  out.warn = mk(st => { st.cells.fill(0); st.cells[22] = 2; st.cells[17] = 1; st.cells[3] = 2; st.turn = 0; }, 0, true);
  out.watch = mk(st => { st.cells.fill(0); st.cells[22] = 2; st.cells[17] = 1; st.cells[3] = 2; st.turn = 0; }, -1, false);
  return out;
};

async function extras({ browser, base, ok }) {
  let sampleShown = false;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'cardchess', `seed=${4 + me * 9}&me=${me}&cfg_sets=3`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `cc-${vp.w}x${vp.h}-${name}.png`) }); };
    let between = 0, selTested = 0, hidTested = 0, markTested = 0, overSeen = false, ordIdx = me;
    for (let n = 1; n <= 400; n++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, set: V.set }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${n}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${n}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${n}: undefined/NaN 글`);
      if (n === 1) await shot('start');
      if (s.over) { overSeen = true; break; }
      if (s.phase === 'between') {
        between++;
        const t = await page.evaluate(() => document.querySelector('.cc-info').innerText);
        ok(/세트/.test(t) && /(이겼|졌|비겼|승)/.test(t), `${tag}: 세트 사이 글이 이상함 (${t})`);
        if (between === 1) await shot('between');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { await page.evaluate(() => window.__h.next()); continue; }
      const dr = await page.evaluate(DRAW); ok(dr.length === 0, `${tag} #${n}: 화면이 판과 다름 ${JSON.stringify(dr)}`);
      // 카드를 누르면: 그 카드로 움직일 수 있는 말만 반짝 · 말을 누르면 갈 칸이 규칙과 같음
      if (n % 7 === 2 && selTested < 4) {
        selTested++;
        const slot = selTested % 2;
        await page.locator(`.cc-hand [data-card="${slot}"]`).click();
        const r1 = await page.evaluate(() => { const h = window.__h, V = h.view(), L = h.C.legal(V, h.ME), on = [...document.querySelectorAll('.cc-card.on')].map(x => +x.dataset.card);
          const mv = [...document.querySelectorAll('.cc-p.mv')].map(x => +x.closest('[data-c]').dataset.c).sort((a, b) => a - b);
          return { on, mv, L }; });
        if (r1.on.length) {                       // 그 카드로 움직일 수 있을 때만 선택됨
          const want = [...new Set(r1.L.filter(a => a.slot === r1.on[0]).map(a => a.from))].sort((a, b) => a - b);
          ok(JSON.stringify(r1.mv) === JSON.stringify(want) && want.length > 0, `${tag} #${n}: 카드를 눌렀을 때 반짝이는 말이 규칙과 다름 ${JSON.stringify({ mv: r1.mv, want })}`);
          const from = want[n % want.length];
          await page.locator(`.cc-c[data-c="${from}"]`).click();
          const r2 = await page.evaluate(() => { const h = window.__h, V = h.view(), sel = [...document.querySelectorAll('.cc-p.sel')].map(x => +x.closest('[data-c]').dataset.c);
            const tg = [...document.querySelectorAll('.cc-c.tg')].map(x => +x.dataset.c).sort((a, b) => a - b);
            const cap = [...document.querySelectorAll('.cc-c.tg.cap')].map(x => +x.dataset.c).sort((a, b) => a - b);
            return { sel, tg, cap, L: h.C.legal(V, h.ME), cells: V.cells, me: h.ME, card: document.querySelectorAll('.cc-card.on').length }; });
          const wtg = [...new Set(r2.L.filter(a => a.slot === r1.on[0] && a.from === from).map(a => a.to))].sort((a, b) => a - b);
          ok(r2.sel.length === 1 && r2.sel[0] === from && JSON.stringify(r2.tg) === JSON.stringify(wtg) && r2.card === 1, `${tag} #${n}: 카드+말 선택 뒤 갈 칸 표시가 규칙과 다름 ${JSON.stringify({ sel: r2.sel, tg: r2.tg, wtg })}`);
          ok(JSON.stringify(r2.cap) === JSON.stringify(wtg.filter(c => r2.cells[c] !== 0)), `${tag} #${n}: 상대 말 잡는 칸의 빨간 테두리가 다름`);
          const mm = await measure(page); ok(!mm.docx && !mm.sx && mm.sy <= 2 && mm.outB <= 2, `${tag} #${n}: 선택 중 화면 넘침`);
          if (selTested === 1) await shot('selected');
          await page.locator(`.cc-c[data-c="${from}"]`).click();      // 말 다시 누르면 말 선택만 풀림
          const r3 = await page.evaluate(() => ({ sel: document.querySelectorAll('.cc-p.sel').length, card: document.querySelectorAll('.cc-card.on').length }));
          ok(r3.sel === 0 && r3.card === 1, `${tag} #${n}: 말을 다시 눌렀는데 선택이 안 풀림 ${JSON.stringify(r3)}`);
          await page.locator(`.cc-hand [data-card="${r1.on[0]}"]`).click();   // 카드 다시 누르면 카드 선택 풀림
          const r4 = await page.evaluate(() => ({ card: document.querySelectorAll('.cc-card.on').length, tg: document.querySelectorAll('.cc-c.tg').length }));
          ok(r4.card === 0 && r4.tg === 0, `${tag} #${n}: 카드를 다시 눌렀는데 선택이 안 풀림 ${JSON.stringify(r4)}`);
        } else await page.locator(`.cc-hand [data-card="${slot}"]`).click().catch(() => {});
      }
      // 안 보이는 난수 상태만 다른 두 장면 = 선생님 글 · 화면 같음
      if (n % 9 === 3 && hidTested < 2 && !QUICK) {
        const r = await page.evaluate(HIDDEN); hidTested++;
        ok(r.same.every(Boolean) && r.pubSame && r.jsonSame && r.htmlSame, `${tag} #${n}: 난수 상태만 다른데 선생님 글 · 화면이 달라짐 ${JSON.stringify({ c: r.same, p: r.pubSame, j: r.jsonSame, h: r.htmlSame })}`);
        if (!sampleShown) { sampleShown = true; console.log('· 선생님 글 예시:\n   👀', r.sample.opp, '\n   📊', r.sample.mine, '\n   💡', r.sample.rec, '\n   👉', r.sample.why); }
      }
      // '!' 표시
      if (n % 3 === 0 && markTested < 12) {
        const r = await page.evaluate(MARKS); markTested++;
        ok(r.off.length === 0, `${tag} #${n}: 선생님 창이 닫혔는데 ! 표시`);
        ok(JSON.stringify(r.on) === JSON.stringify(r.want), `${tag} #${n}: ! 표시가 잡힐 내 말과 다름 ${JSON.stringify(r)}`);
      }
      // 내 수: AI 수를 골라 화면 단추로 (누르는 순서를 돌려 가며) 둠 — 실제로 그 수가 둬졌는지 확인
      const a = await page.evaluate(() => { const h = window.__h; return h.C.ai(h.view(), h.ME, 'normal', h.rnd); });
      if (!a) { await page.evaluate(() => window.__h.next()); continue; }
      const order = ORDERS[ordIdx++ % ORDERS.length], got = await domMove(page, a, order);
      ok(same(got, a), `${tag} #${n}: 단추 순서 ${order} 로 눌렀더니 ${JSON.stringify(got)} 이 둬짐 (원하던 수 ${JSON.stringify(a)})`);
    }
    ok(overSeen, `${tag}: 한 판이 끝나지 않음`);
    ok(between > 0, `${tag}: 세트가 끝나는 장면이 한 번도 안 나옴 (3세트 시험)`);
    if (overSeen) {
      if (me === 0 && vp.w === 375) await shot('end');
      const e = await page.evaluate(() => { const h = window.__h, V = h.view(); return { info: document.querySelector('.cc-info').innerText, res: h.result() }; });
      ok(/(이겼|졌|무승부)/.test(e.info) && /세트/.test(e.res) && /(없앴|사라졌|버텼|가렸|말 수가 같)/.test(e.res), `${tag}: 끝 글 · 결과 글 이상 ${e.info} / ${e.res}`);
    }
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // ③ 성 경고 줄
  {
    const { page, errs, close } = await open(browser, base, 'cardchess', 'seed=5&me=0&cfg_sets=1', VPS[0]);
    const r = await page.evaluate(STRIP);
    ok(/상대 성/.test(r.good.text) && /good/.test(r.good.cls), `성 경고(좋음): ${r.good.cls} ${r.good.text}`);
    ok(/내 성/.test(r.warn.text) && /warn/.test(r.warn.cls), `성 경고(위험): ${r.warn.cls} ${r.warn.text}`);
    ok(/성/.test(r.watch.text) && /mid/.test(r.watch.cls), `성 경고(구경): ${r.watch.cls} ${r.watch.text}`);
    ok(/내 성/.test(r.warn.c.opp) && /상대 성/.test(r.good.c.mine), `선생님 글에 성 이야기가 없음: ${r.warn.c.opp} / ${r.good.c.mine}`);
    for (const x of errs) ok(false, `성 경고: ${x}`);
    await close();
  }
}

async function policy(page, { step, run }) {
  const a = await page.evaluate(() => { const h = window.__h; return h.U.qa(h.view(), h.ME, h.rnd); });
  if (!a) return false;
  const order = ORDERS[(step + run) % ORDERS.length], got = await domMove(page, a, order);
  if (!same(got, a)) { badMoves++; console.error(`FAIL: 단추 순서 ${order} 로 ${JSON.stringify(a)} 을 눌렀는데 ${JSON.stringify(got)} 이 둬짐`); }
  return !!got;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const r = box.querySelector('[data-card="0"]'); if (r) { r.click(); return true; } }   // 먼저 틀린 카드(룩)
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('카드 체스 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f || badMoves ? 1 : 0));
  run('cardchess', policy, { runs: 4, tutPolicy, query: r => ['cfg_sets=1', 'cfg_sets=3&me=1', 'cfg_sets=3', 'cfg_sets=1&me=1'][r % 4] });
})();

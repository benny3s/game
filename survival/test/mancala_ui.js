// 균형의 만칼라 화면 시험: node survival/test/mancala_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 (7명) — 한 판을 단추로: 넘침 · 14칸 말 = 상태 · 점수판 순서 · 최종 점수 ·
//     놓기(칸 → 놓기) · 옮기기(칸 → 말 순서 → 이동, 한 사람 말만이면 자동) → core 기록과 같음 · 누르는 크기 44px
//  ② 되돌리기 · 동률 색 고르기 · 말 점을 눌러도 칸이 골라짐 · 3명 · 5명(360×640) · 6바퀴 · 구경꾼
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const cells = [...st.querySelectorAll('.mc-board .mc-cell[data-cell]')];
  if (cells.length !== 14) bad.push('칸 수 ' + cells.length);
  for (const c of cells) {
    const i = +c.dataset.cell, ds = [...c.querySelectorAll(':scope > .mc-p:not(.gh):not(.nx)')].map(x => +x.dataset.o);
    if (ds.join() !== V.cells[i].join()) bad.push(`${i}칸 말 ${ds.join()} ≠ ${V.cells[i].join()}`);
  }
  const rows = [...st.querySelectorAll('.mc-sr')];
  if (rows.map(r => +r.dataset.s).join() !== V.order.join()) bad.push('점수판 순서 ' + rows.map(r => r.dataset.s).join());
  for (const r of rows) {
    const s = +r.dataset.s, b = [...r.querySelectorAll('b')].map(x => +x.textContent);
    if (b.join() !== V.sc[s].concat([V.fin[s]]).join()) bad.push(`${s} 점수 ${b.join()} ≠ ${V.sc[s].join()} ${V.fin[s]}`);
  }
  for (let i = 0; i < V.n; i++) { const c = h.U.chip(V, i); if (c.t !== `${V.fin[i]}점` || c.on !== (V.needs.includes(i) && !V.over)) bad.push('칩 ' + JSON.stringify(c)); }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  const cb = st.querySelectorAll('button.mc-cell').length, ab = st.querySelectorAll('.mc-act button').length;
  if (!can && (cb || ab)) bad.push(`내 차례가 아닌데 단추 ${cb}/${ab}`);
  if (can && V.phase === 'place' && cb !== V.cells.filter(c => c.length < 2).length) bad.push('놓을 칸 단추 ' + cb);
  if (can && V.phase === 'move' && cb !== V.cells.filter(c => c.includes(me)).length) bad.push('옮길 칸 단추 ' + cb);
  if (V.last && !V.over && !st.querySelector(`.mc-cell.lastl[data-cell="${V.last.land}"]`)) bad.push('직전 도착 칸 표시 없음');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me);
  const okA = !r || C.apply(JSON.parse(JSON.stringify(h.st())), me, r.a).ok;
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: okA };
};
const SIZES = () => [...document.querySelectorAll('#stage .mc-act button, #stage button.mc-cell')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + JSON.stringify(b.dataset), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const h = window.__h; const L = h.C.view(h.st(), 'all').log.filter(e => (e.k === 'place' || e.k === 'move') && e.s === h.ME).pop(); return L || null; };
const placed = () => { const m = (document.querySelector('.mc-lbl span') || {}).innerText; const x = m && m.match(/놓은 (\d+)/); return x ? +x[1] : -1; };

// 고른 수를 화면 단추로 (칸 → 말 순서 → 색 → 이동)
async function doAct(page, a, viaDot) {
  if (a.t === 'place') { await page.locator(`button.mc-cell[data-cell="${a.c}"]`).click(); await page.locator('[data-go="place"]').click(); return; }
  if (viaDot && (await page.locator(`button.mc-cell[data-cell="${a.from}"] .mc-p`).count())) await page.locator(`button.mc-cell[data-cell="${a.from}"] .mc-p`).first().click();
  else await page.locator(`button.mc-cell[data-cell="${a.from}"]`).click();
  for (let g = 0; g < 40; g++) {
    if (!(await page.locator('.mc-hand button').count())) break;
    const k = await page.evaluate(placed);
    await page.locator(`.mc-hand button[data-o="${a.seq[k]}"]`).click();
  }
  if (a.col !== undefined && (await page.locator('[data-col]').count())) await page.locator(`[data-col="${a.col}"]`).click();
  await page.locator('[data-go="move"]').click();
}
const sameAct = (L, a) => L && (a.t === 'place' ? L.k === 'place' && L.c === a.c : L.k === 'move' && L.from === a.from && L.seq.join() === a.seq.join() && (a.col === undefined || L.col === a.col));

async function playOne(page, tag, ok, shot, opt = {}) {
  let over = false, k = 0, places = 0, moves = 0, sizeTested = 0, coachTested = 0;
  const shown = new Set();
  for (k = 1; k <= 1500; k++) {
    const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase }; });
    const m = await measure(page);
    ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
    ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
    ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
    const d = await page.evaluate(DRAW);
    ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
    const sk = s.phase + (s.mine ? '-me' : '');
    if (!shown.has(sk)) { shown.add(sk); await shot(sk); }
    if (s.over) { over = true; break; }
    if (!s.mine) { const adv = await page.evaluate(() => window.__h.next()); if (!adv) { ok(false, `${tag} #${k}: 멈춤 (${s.phase})`); break; } continue; }
    if (sizeTested < 6) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
    if (coachTested < (QUICK ? 3 : 5) || (s.phase === 'move' && coachTested < 7)) {
      const r = await page.evaluate(COACH); coachTested++;
      ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(를\)/.test(r.text) && /\d/.test(r.c.mine) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 240)}`);
      if (opt.sample && coachTested <= 3 || (opt.sample && s.phase === 'move' && coachTested === 6)) console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why);
    }
    const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
    if (s.phase === 'move' && moves === 0) await shot('move-pick-before');
    await doAct(page, a, moves % 2 === 1);
    const L = await page.evaluate(LAST);
    ok(sameAct(L, a), `${tag} #${k}: 기록 ${JSON.stringify(L)} (${JSON.stringify(a)})`);
    if (a.t === 'place') places++; else moves++;
  }
  return { over, places, moves, k };
}

async function extras({ browser, base, ok }) {
  let sample = true;
  for (const vp of VPS) for (const me of [0, 1]) {
    if (QUICK && me === 1 && vp.w !== 375) continue;
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'mancala', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&n=7&cfg_laps=6`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `mc-${vp.w}x${vp.h}-${name}.png`) }); };
    const r = await playOne(page, tag, ok, shot, { sample: sample && vp.w === 375 });
    if (vp.w === 375) sample = false;
    ok(r.over, `${tag}: 게임이 끝나지 않음 (${r.k}걸음)`);
    ok(r.places === 4 && r.moves >= 1, `${tag}: 놓기 ${r.places} · 옮기기 ${r.moves}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.mc-info').innerText, res: h.result(), btn: t.querySelectorAll('.mc-act button, button.mc-cell').length }; });
    ok(/(1위|위 \(최종)/.test(e.st) && /끝/.test(e.st) && /바퀴/.test(e.res) && /1위/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 되돌리기 · 동률 색 · 점 눌러 칸 고르기 (장면 직접)
  {
    const { page, errs, close } = await open(browser, base, 'mancala', 'seed=9&me=0&n=5', VPS[0]);
    await page.evaluate(() => {
      const h = window.__h, st = h.st(); h.hold(true);
      st.order = [0, 1, 2, 3, 4]; st.phase = 'move'; st.pi = 20; st.ti = 0;
      st.cells = Array.from({ length: 14 }, () => []);
      st.cells[5] = [1, 0]; st.cells[7] = [2]; st.cells[2] = [0, 3]; st.cells[10] = [0, 4]; st.cells[12] = [0, 1]; st.cells[0] = [2, 3]; st.cells[3] = [4, 1];
      st.sc = [[3, 3, 8], [1, 2, 3], [4, 4, 4], [0, 5, 1], [2, 2, 2]];
      h.render();
    });
    await page.locator('button.mc-cell[data-cell="5"] .mc-p').first().click();
    let r = await page.evaluate(() => ({ from: document.querySelectorAll('.mc-cell.from[data-cell="5"]').length, hand: [...document.querySelectorAll('.mc-hand button')].map(b => +b.dataset.o), land: document.querySelectorAll('.mc-cell.land[data-cell="7"]').length, go: document.querySelector('[data-go="move"]').disabled }));
    ok(r.from === 1 && r.hand.join() === '0,1' && r.land === 1 && r.go, `점 눌러 칸 고르기 · 손 · 도착 표시 ${JSON.stringify(r)}`);
    await page.locator('.mc-hand button[data-o="1"]').click();   // 가 먼저 → 나 하나만 남아 자동
    r = await page.evaluate(() => ({ hand: document.querySelectorAll('.mc-hand button').length, cols: [...document.querySelectorAll('[data-col]')].map(b => +b.dataset.col), go: document.querySelector('[data-go="move"]').disabled, info: document.querySelector('.mc-info').innerText, gh: document.querySelectorAll('.mc-p.gh').length }));
    ok(r.hand === 0 && r.cols.join() === '0,1' && !r.go && /\+2/.test(r.info) && r.gh === 2, `자동 채움 · 천사 동률 색 2개 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'mc-tie-colors.png') });
    await page.locator('[data-undo]').click();
    r = await page.evaluate(() => ({ hand: [...document.querySelectorAll('.mc-hand button')].map(b => +b.dataset.o), cols: document.querySelectorAll('[data-col]').length }));
    ok(r.hand.join() === '0,1' && r.cols === 0, `되돌리기 한 번 = 직접 누른 것까지 ${JSON.stringify(r)}`);
    await page.locator('[data-undo]').click();
    r = await page.evaluate(() => ({ from: document.querySelectorAll('.mc-cell.from').length, act: document.querySelectorAll('.mc-act button').length }));
    ok(r.from === 0 && r.act === 0, `되돌리기로 칸 고르기까지 ${JSON.stringify(r)}`);
    // 한 사람 말만 있는 칸 (02칸은 [0,3] 이라 섞임 → 12칸 [0,1] 대신 새 칸) : 05 → 가 → 나 → 파랑 → 이동
    await page.locator('button.mc-cell[data-cell="5"]').click();
    await page.locator('.mc-hand button[data-o="1"]').click();
    await page.locator('[data-col="1"]').click();
    const on = await page.evaluate(() => [...document.querySelectorAll('[data-col].on')].map(b => +b.dataset.col).join());
    await page.locator('[data-go="move"]').click();
    r = await page.evaluate(() => { const st = window.__h.st(), L = st.hist.find(x => x.s === 0) || {}; return { sc: st.sc[0].join(), from: L.from, land: L.land, pts: L.pts, col: L.col, seq: (L.seq || []).join() }; });
    ok(on === '1' && r.sc === '3,5,8' && r.from === 5 && r.land === 7 && r.pts === 2 && r.col === 1 && r.seq === '1,0', `동률 색 고름 → 파랑 +2 ${on} ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `장면: ${x}`);
    await close();
  }
  // 3명 · 5명(작은 화면)
  for (const [n, vp] of [[3, VPS[0]], [5, VPS[2]]]) {
    const tag = `n${n}`;
    const { page, errs, close } = await open(browser, base, 'mancala', `seed=${8 + n}&me=0&n=${n}&cfg_laps=6`, vp);
    const r = await playOne(page, tag, ok, async nm => { if (n === 5) await page.screenshot({ path: path.join(SH, `mc-n5-${nm}.png`) }); });
    ok(r.over && r.moves > 0, `${tag}: 끝까지 ${JSON.stringify(r)}`);
    const sub = await page.evaluate(() => window.__h.U.sub(window.__h.view()));
    ok(sub === '끝', `${tag}: 위 글 ${sub}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 12바퀴 (기본) — 첫 화면만
  {
    const { page, errs, close } = await open(browser, base, 'mancala', 'seed=21&me=0&n=7', VPS[0]);
    const r = await page.evaluate(() => { const V = window.__h.view(); return { maxT: V.maxT, sub: window.__h.U.sub(V) }; });
    ok(r.maxT === 84 && /^말 놓기 · 남은 \d+개$/.test(r.sub), `12바퀴: ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `12바퀴: ${x}`);
    await close();
  }
  // 구경꾼 — 단추 없음 · 구경 선생님
  {
    const { page, errs, close } = await open(browser, base, 'mancala', 'seed=4&me=-1&n=5', VPS[0]);
    for (let g = 0; g < 26; g++) await page.evaluate(() => window.__h.next());
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.mc-act button, button.mc-cell').length, me: document.querySelectorAll('.mc-sr.me').length, info: document.querySelector('.mc-info').innerText, coach: window.__h.U.coach(window.__h.view(), -1, -1, null) }));
    const m = await measure(page);
    ok(r.btn === 0 && r.me === 0 && r.info.length > 4 && /구경/.test(r.coach.rec) && /최종/.test(r.coach.mine) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r).slice(0, 300)} ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(SH, 'mc-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (!(await page.locator('button.mc-cell').count())) return false;
  await doAct(page, a, step % 2 === 0);
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) {   // 먼저 틀리게: 나 → 가 (가가 점수) → 이동 → 다시
      const c = box.querySelector('button[data-cell="5"]'); if (c) { c.click();
        const a = box.querySelector('.mc-hand button[data-o="0"]'); if (a) { a.click(); const b = box.querySelector('.mc-hand button[data-o="1"]'); if (b) { b.click(); const g = box.querySelector('[data-go]'); if (g && !g.disabled) { g.click(); return true; } } } }
    }
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('균형의 만칼라 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('mancala', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_laps=6' : 'cfg_laps=6'), ns: [5, 3, 7] });
})();

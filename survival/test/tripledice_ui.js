// 트리플 다이스 화면 시험: node survival/test/tripledice_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 (4명) — 한 판을 단추로: 넘침 · 줄 = 제출 순서 · 남의 히든은 ? ·
//     내 주사위 11개 · 예측 카드 고르기 → 내기 · 주사위 3개 고르기 · 다시 눌러 풀기 · 네 번째는 첫 번째를 밀어냄 · 내기 → core 기록과 같음 · 누르는 크기 44px
//  ② 2명 · 3명 · 2라운드 옵션 · 구경꾼 (me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const rows = [...st.querySelectorAll('.td-tbl .td-row')];
  if (rows.length !== V.n) bad.push('줄 수 ' + rows.length);
  if (rows.map(r => +r.dataset.s).join() !== V.order.join()) bad.push('줄 순서 ≠ 제출 순서');
  for (let i = 0; i < V.n; i++) { const c = h.U.chip(V, i); if (!/점$/.test(c.t) || c.on !== (V.needs.includes(i) && !V.over)) bad.push('칩 ' + JSON.stringify(c)); }
  // 남의 히든 주사위: 공개 전에는 숫자가 없어야
  for (const r of rows) {
    const s = +r.dataset.s; if (s === me) continue;
    for (const d of r.querySelectorAll('svg.td-d')) { if (d.dataset.k !== 'w' && d.dataset.v !== '' && V.phase === 'play') { const sub = V.subs[s]; const x = sub && sub.find(z => z.k === d.dataset.k); if (!x || x.v == null) bad.push('남의 히든 숫자가 보임'); } }
    for (const m of r.querySelectorAll('.td-left .td-m.r, .td-left .td-m.b')) if (m.textContent !== '?') bad.push('남은 히든 숫자가 보임 ' + m.textContent);
    const left = r.querySelectorAll('.td-left .td-m').length, want = V.over || V.phase === 'rend' ? 0 : V.dice[s].filter(x => !x.u).length;
    if (left !== want) bad.push(`남은 주사위 ${left} ≠ ${want}`);
  }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  const hand = st.querySelectorAll('.td-hand .td-h');
  if (me >= 0 && !V.over && V.phase !== 'rend' && hand.length !== 11) bad.push('내 주사위 ' + hand.length);
  if (me >= 0 && hand.length) { const vs = [...hand].map(e => e.querySelector('svg').dataset.v); if (vs.some(v => v === '')) bad.push('내 주사위 숫자 없음'); }
  const pc = st.querySelectorAll('.td-pc').length, db = st.querySelectorAll('button.td-h').length;
  if (pc !== (can && V.phase === 'pred' ? 4 : 0)) bad.push('예측 카드 ' + pc);
  if (db !== (can && V.phase === 'play' ? V.dice[me].filter(x => !x.u).length : 0)) bad.push('고를 주사위 ' + db);
  if (!can && st.querySelector('.td-go')) bad.push('내 차례가 아닌데 내기 단추');
  if (V.phase === 'trick' && !st.querySelector('.td-row.top')) bad.push('1위 표시 없음');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), L = C.legal(h.st(), me).map(a => JSON.stringify(a));
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: !r || L.includes(JSON.stringify(r.a)) };
};
const SIZES = () => [...document.querySelectorAll('#stage .td-act button')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + (b.dataset.i || b.dataset.p || b.dataset.go || ''), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const h = window.__h, st = h.st(); const L = h.C.view(st, 'all').log.filter(e => e.k === 'act' && e.s === h.ME).pop(); return { a: L ? L.a : null, pred: st.pred[h.ME], used: st.used[h.ME].map((u, i) => (u ? i : -1)).filter(i => i >= 0) }; };

async function playOne(page, tag, ok, shot, opt = {}) {
  let over = false, preds = 0, subs = 0, selTested = 0, sizeTested = 0, coachTested = 0, k = 0;
  const shown = new Set();
  for (k = 1; k <= 400; k++) {
    const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, trick: V.trick, round: V.round }; });
    const m = await measure(page);
    ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
    ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
    ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
    const d = await page.evaluate(DRAW);
    ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
    const sk = s.phase + (s.mine ? '-me' : '') + (s.round > 1 ? '-r2' : '');
    if (!shown.has(sk)) { shown.add(sk); await shot(sk); }
    if (s.over) { over = true; break; }
    if (!s.mine) { const adv = await page.evaluate(() => window.__h.next()); if (!adv) { ok(false, `${tag} #${k}: 멈춤 (${s.phase})`); break; } continue; }
    if (sizeTested < 4) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
    if (coachTested < (QUICK ? 2 : 4)) {
      const r = await page.evaluate(COACH); coachTested++;
      ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)/.test(r.text) && /\d/.test(r.c.mine) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 220)}`);
      if (opt.sample && coachTested <= 2) console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why);
    }
    const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
    if (s.phase === 'pred') {
      const alt = (a.p + 1) % 4;
      await page.locator(`.td-pc[data-p="${alt}"]`).click();
      await page.locator(`.td-pc[data-p="${a.p}"]`).click();
      const r = await page.evaluate(() => ({ on: [...document.querySelectorAll('.td-pc.on')].map(b => +b.dataset.p), txt: document.querySelector('[data-go="pred"]').innerText, dis: document.querySelector('[data-go="pred"]').disabled }));
      ok(r.on.length === 1 && r.on[0] === a.p && !r.dis && /몰래 내기/.test(r.txt), `${tag} #${k}: 예측 카드 고르기 ${JSON.stringify(r)}`);
      await page.locator('[data-go="pred"]').click();
      const L = await page.evaluate(LAST);
      ok(L.pred === a.p && L.a && L.a.t === 'pred' && L.a.p === undefined, `${tag} #${k}: 예측 기록 ${JSON.stringify(L)} (기록엔 카드가 안 보여야)`);
      preds++; continue;
    }
    // 제출: 고르기 · 풀기 · 네 번째
    if (selTested < 2) {
      const free = await page.evaluate(() => [...document.querySelectorAll('button.td-h')].map(b => +b.dataset.i));
      const pick = i => page.locator(`button.td-h[data-i="${i}"]`).click();
      await pick(free[0]);
      let r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('button.td-h.sel')].map(b => +b.dataset.i), dis: document.querySelector('[data-go="sub"]').disabled }));
      ok(r.sel.length === 1 && r.sel[0] === free[0] && r.dis, `${tag} #${k}: 하나 고르기 ${JSON.stringify(r)}`);
      await pick(free[0]);
      r = await page.evaluate(() => document.querySelectorAll('button.td-h.sel').length);
      ok(r === 0, `${tag} #${k}: 다시 눌러 풀기 ${r}`);
      if (free.length >= 4) {
        for (const i of free.slice(0, 4)) await pick(i);
        r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('button.td-h.sel')].map(b => +b.dataset.i).sort((x, y) => x - y), txt: document.querySelector('[data-go="sub"]').innerText, info: document.querySelector('.td-info').innerText }));
        ok(r.sel.join() === free.slice(1, 4).sort((x, y) => x - y).join() && /내기/.test(r.txt) && /(트리플|스트레이트|더블|싱글)/.test(r.info), `${tag} #${k}: 네 번째는 첫 번째를 밀어냄 ${JSON.stringify(r)}`);
        if (selTested === 0) await shot('selected');
        for (const i of r.sel) await pick(i);
      }
      selTested++;
    }
    for (const i of a.d) await page.locator(`button.td-h[data-i="${i}"]`).click();
    await page.locator('[data-go="sub"]').click();
    const L = await page.evaluate(LAST);
    ok(L.a && L.a.t === 'sub' && L.a.d.join() === a.d.slice().sort((x, y) => x - y).join(), `${tag} #${k}: 내기 기록 ${JSON.stringify(L.a)} (${a.d})`);
    subs++;
  }
  return { over, preds, subs, k };
}

async function extras({ browser, base, ok }) {
  let sample = true;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'tripledice', `seed=${3 + me * 4 + vp.w % 7}&me=${me}${QUICK ? '&cfg_rounds=2' : ''}`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `td-${vp.w}x${vp.h}-${name}.png`) }); };
    const r = await playOne(page, tag, ok, shot, { sample: sample && vp.w === 375 });
    if (vp.w === 375) sample = false;
    const R = QUICK ? 2 : 4;
    ok(r.over, `${tag}: 게임이 끝나지 않음 (${r.k}걸음)`);
    ok(r.preds === R && r.subs === R * 3, `${tag}: 예측 ${r.preds} · 제출 ${r.subs} (라운드 ${R})`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.td-info').innerText, res: h.result(), btn: t.querySelectorAll('.td-act button').length }; });
    ok(/(1위|위 \()/.test(e.st) && /1R/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 2명 · 3명 · 2라운드
  for (const n of [2, 3]) {
    const tag = `n${n}`;
    const { page, errs, close } = await open(browser, base, 'tripledice', `seed=${8 + n}&me=0&n=${n}&cfg_rounds=2`, VPS[2]);
    const r = await playOne(page, tag, ok, async () => {});
    ok(r.over && r.preds === 2 && r.subs === 6, `${tag}: 2라운드 끝까지 ${JSON.stringify(r)}`);
    const sub = await page.evaluate(() => window.__h.U.sub(window.__h.view()));
    ok(sub === '끝', `${tag}: 위 글 ${sub}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 구경꾼 — 히든은 ? · 단추 없음 · 줄마다 남은 주사위
  {
    const { page, errs, close } = await open(browser, base, 'tripledice', 'seed=4&me=-1', VPS[0]);
    await page.evaluate(() => { const h = window.__h, st = h.st(), f0 = h.C.init({ n: 4, seed: 4 }); h.hold(true); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f0); for (let s = 0; s < st.n; s++) h.C.apply(st, s, { t: "pred", p: 1 }); const f = st.order[0]; h.C.apply(st, f, { t: 'sub', d: [0, 9, 10] }); h.render(); });
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.td-act button').length, q: [...document.querySelectorAll('.td-row svg.td-d')].filter(d => d.dataset.k !== 'w').map(d => d.dataset.v), left: document.querySelectorAll('.td-left').length, info: document.querySelector('.td-info').innerText }));
    const m = await measure(page);
    ok(r.btn === 0 && r.q.length === 2 && r.q.every(v => v === '') && r.left === 4 && /고르는 중/.test(r.info) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(SH, 'td-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (ph === 'pred') { if (!(await page.locator('.td-pc').count())) return false; await page.locator(`.td-pc[data-p="${a.p}"]`).click(); await page.locator('[data-go="pred"]').click(); return true; }
  if (!(await page.locator('button.td-h').count())) return false;
  for (const i of a.d) await page.locator(`button.td-h[data-i="${i}"]`).click();
  await page.locator('[data-go="sub"]').click();
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-i="1"]'); if (w) { w.click(); return true; } }          // 먼저 엉뚱한 주사위 (2)
    if (k2 === 1) { for (const j of [2, 6]) { const w = box.querySelector(`[data-i="${j}"]`); if (w) w.click(); } const g = box.querySelector('[data-go]'); if (g && !g.disabled) { g.click(); return true; } }   // 2·6·6 더블 → 낮다고 처음부터
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('트리플 다이스 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('tripledice', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_rounds=2' : 'cfg_rounds=2'), ns: [4, 3, 2] });
})();

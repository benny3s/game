// 수식 피라미드 화면 시험: node survival/test/eqpyramid_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 (2명) — 한 판을 단추로: 넘침 · 피라미드 10칸 = 상태 · 타깃 · 찾은 답 ·
//     3칸 고르기(번호 표시 · 다시 눌러 빼기 · 지우기) → 정답 선언 / 넘기기 → core 기록과 같음 · 정답 목록은 라운드 끝에만 · 누르는 크기 44px
//  ② 방송 판 1라운드 직접 (정답 · 오답 · 중복 글) · 4명(360×640) · 5라운드 · 구경꾼
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const rend = V.phase === 'rend' || V.over, B = rend && V.last ? V.last : null, cells = B ? B.cells : V.cells;
  const cs = [...st.querySelectorAll('.ep-pyr .ep-c')];
  if (cs.length !== 10) bad.push('칸 수 ' + cs.length);
  cs.forEach((c, i) => { const want = h.C.L[i]; if (c.dataset.c !== want || !c.innerText.includes(String(cells[i].n))) bad.push(`${want}칸 ${c.innerText}`); });
  const tg = +st.querySelector('.ep-tg b').textContent;
  if (tg !== (B ? B.target : V.target)) bad.push('타깃 ' + tg);
  const ks = [...st.querySelectorAll('.ep-list .ep-k.ok')].map(x => x.dataset.k).join();
  if (ks !== (B ? B.found : V.found).map(x => x.k).join()) bad.push('찾은 답 ' + ks);
  const miss = st.querySelectorAll('.ep-k.miss').length;
  if (!rend && miss) bad.push('라운드 중 정답 보임');
  if (rend && B && miss !== B.ans.length - B.found.length) bad.push('못 찾은 답 ' + miss);
  for (let i = 0; i < V.n; i++) { const c = h.U.chip(V, i); if (c.t !== `${V.sc[i]}점` || c.on !== (V.needs.includes(i) && !V.over)) bad.push('칩 ' + JSON.stringify(c)); }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  const en = st.querySelectorAll('.ep-c:not(:disabled)').length, ab = st.querySelectorAll('.ep-act button').length;
  if (!can && (en || ab)) bad.push(`내 차례가 아닌데 단추 ${en}/${ab}`);
  if (can && (en !== 10 || ab !== 3)) bad.push(`내 차례 단추 ${en}/${ab}`);
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me);
  return { c, text: c.opp + c.mine + c.rec + c.why, recOk: !r || C.apply(JSON.parse(JSON.stringify(h.st())), me, r.a).ok, ans: V.ans };
};
const SIZES = () => [...document.querySelectorAll('#stage .ep-act button, #stage .ep-c')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + JSON.stringify(b.dataset), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const h = window.__h; const L = h.C.view(h.st(), 'all').log.filter(e => (e.k === 'say' || e.k === 'pass') && e.s === h.ME).pop(); return L || null; };
// 내 마지막 시도 글 (하네스가 내 수 뒤 AI 를 바로 움직이므로, 내 시도만 남긴 보기로 그려 봄)
const INFO_MINE = () => { const h = window.__h, V = h.view(); V.tries = V.tries.filter(x => x.s === h.ME); V.needs = []; const d = document.createElement('div'); h.U.render(d, V, { me: h.ME, act() {}, canAct: false, seats: h.seats, g: 99, sfx() {} }); return d.querySelector('.ep-info').innerText; };
const exText = () => (document.querySelector('.ep-ex') || {}).innerText || '';

async function doAct(page, a, test) {
  if (a.t === 'pass') { await page.locator('[data-x="pass"]').click(); return; }
  if (test) {   // 고르기 · 빼기 · 지우기
    const k = a.k;
    await page.locator(`.ep-c[data-c="${k[0]}"]`).click(); await page.locator(`.ep-c[data-c="${k[1]}"]`).click();
    let r = await page.evaluate(() => ({ em: [...document.querySelectorAll('.ep-c em')].map(e => e.textContent).sort().join(), dis: document.querySelector('[data-x="say"]').disabled }));
    test(r.em === '1,2' && r.dis, `두 칸 고름 번호 ${JSON.stringify(r)}`);
    await page.locator(`.ep-c[data-c="${k[1]}"]`).click();
    r = await page.evaluate(() => document.querySelectorAll('.ep-c em').length); test(r === 1, '다시 누르면 빠짐 ' + r);
    await page.locator('[data-x="clear"]').click();
    r = await page.evaluate(() => document.querySelectorAll('.ep-c.on').length); test(r === 0, '지우기 ' + r);
  }
  for (const ch of a.k) await page.locator(`.ep-c[data-c="${ch}"]`).click();
  if (test) { const ex = await page.evaluate(exText); test(/= \?/.test(ex) && !/= \d/.test(ex), '선언 전 값 안 보임 ' + ex); }
  await page.locator('[data-x="say"]').click();
}
const sameAct = (L, a) => L && (a.t === 'pass' ? L.k === 'pass' : L.k === 'say' && L.key === a.k);

async function playOne(page, tag, ok, shot, opt = {}) {
  let over = false, k = 0, says = 0, passes = 0, sizeTested = 0, coachTested = 0, pickTested = 0;
  const shown = new Set();
  for (k = 1; k <= 3000; k++) {
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
    if (sizeTested < 4) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
    if (coachTested < (QUICK ? 3 : 5)) {
      const r = await page.evaluate(COACH); coachTested++;
      ok(r.recOk && r.ans === null && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(를\)/.test(r.text) && /\d/.test(r.c.mine) && (r.c.rec === '넘기기.' || /\d/.test(r.c.why)), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 240)}`);
      if (opt.sample && coachTested <= 2) console.log(`· 선생님 글 예시:\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why);
    }
    const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 4 ? 'normal' : 'hard', h.rnd); }, k);
    const test = a.t === 'say' && pickTested < 2 ? (c, msg) => ok(c, `${tag} #${k}: ${msg}`) : null;
    if (test) { pickTested++; if (pickTested === 1) await shot('pick'); }
    await doAct(page, a, test);
    const L = await page.evaluate(LAST);
    ok(sameAct(L, a), `${tag} #${k}: 기록 ${JSON.stringify(L)} (${JSON.stringify(a)})`);
    if (a.t === 'say') says++; else passes++;
  }
  return { over, says, passes, k };
}

async function extras({ browser, base, ok }) {
  let sample = true;
  for (const vp of VPS) for (const me of [0, 1]) {
    if (QUICK && me === 1 && vp.w !== 375) continue;
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'eqpyramid', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&n=2&cfg_rounds=5`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `ep-${vp.w}x${vp.h}-${name}.png`) }); };
    const r = await playOne(page, tag, ok, shot, { sample: sample && vp.w === 375 });
    if (vp.w === 375) sample = false;
    ok(r.over, `${tag}: 게임이 끝나지 않음 (${r.k}걸음)`);
    ok(r.says >= 1, `${tag}: 선언 ${r.says} · 넘기기 ${r.passes}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.ep-info').innerText, res: h.result(), btn: t.querySelectorAll('.ep-act button').length }; });
    ok(/(이겼|1위|위 \()/.test(e.st) && /라운드/.test(e.res) && /1위/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 방송 판 1라운드 — 정답 · 오답 · 중복 글
  {
    const { page, errs, close } = await open(browser, base, 'eqpyramid', 'seed=1&me=0&n=2&cfg_src=tv', VPS[0]);
    await page.evaluate(() => { const h = window.__h, st = h.st(); st.turn = 0; h.render(); });
    const say = async k => { for (const ch of k) await page.locator(`.ep-c[data-c="${ch}"]`).click(); await page.locator('[data-x="say"]').click(); };
    await say('ACH');
    let r = await page.evaluate(INFO => ({ info: eval(INFO)(), ok: [...document.querySelectorAll('.ep-k.ok')].map(x => x.dataset.k)[0], sc: window.__h.st().sc[0] }), '(' + INFO_MINE + ')');
    ok(/ACH/.test(r.info) && /정답 \+1/.test(r.info) && /7 \+ 9 ÷ 3 = 10/.test(r.info) && r.ok === 'ACH' && r.sc === 1, `정답 글 ${JSON.stringify(r)}`);
    await page.evaluate(() => { const h = window.__h; h.st().turn = 0; h.render(); });
    await say('JBD');
    r = await page.evaluate(INFO => ({ info: eval(INFO)(), x: [...document.querySelectorAll('.ep-k.x')].map(x => x.dataset.k), sc: window.__h.st().sc[0] }), '(' + INFO_MINE + ')');
    ok(/오답 −1/.test(r.info) && /-22\/5/.test(r.info) && r.x.includes('JBD') && r.sc === 0, `오답 글 ${JSON.stringify(r)}`);
    await page.evaluate(() => { const h = window.__h; h.st().turn = 0; h.render(); });
    await say('ACH');
    r = await page.evaluate(INFO => ({ info: eval(INFO)(), sc: window.__h.st().sc[0] }), '(' + INFO_MINE + ')');
    ok(/이미 나온 답 −1/.test(r.info) && r.sc === -1, `중복 글 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'ep-tv-r1.png') });
    // 라운드 끝 화면: 못 찾은 답 점선
    await page.evaluate(() => { const h = window.__h, st = h.st(); if (st.phase === 'play') { st.turn = 0; st.streak = 0; h.C.apply(st, 0, { t: 'pass' }); if (st.phase === 'play') h.C.apply(st, 1, { t: 'pass' }); } h.render(); });
    r = await page.evaluate(() => { const L = window.__h.st().last, got = L.found.map(x => x.k); return { miss: [...document.querySelectorAll('.ep-k.miss')].map(x => x.dataset.k).join(), want: L.ans.filter(k => !got.includes(k)).join(), info: document.querySelector('.ep-info').innerText, btn: document.querySelectorAll('.ep-act button').length, ph: window.__h.st().phase }; });
    ok(r.ph === 'rend' && r.miss === r.want && r.miss.length > 0 && new RegExp(`못 찾은 답 ${r.want.split(',').length}개`).test(r.info) && r.btn === 0, `라운드 끝 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'ep-rend.png') });
    for (const x of errs) ok(false, `방송 판: ${x}`);
    await close();
  }
  // 4명 (작은 화면)
  {
    const { page, errs, close } = await open(browser, base, 'eqpyramid', 'seed=12&me=0&n=4&cfg_rounds=5', VPS[2]);
    const r = await playOne(page, 'n4', ok, async nm => { await page.screenshot({ path: path.join(SH, `ep-n4-${nm}.png`) }); });
    ok(r.over && r.says > 0, `n4: 끝까지 ${JSON.stringify(r)}`);
    const sub = await page.evaluate(() => window.__h.U.sub(window.__h.view()));
    ok(sub === '끝', `n4: 위 글 ${sub}`);
    for (const x of errs) ok(false, `n4: ${x}`);
    await close();
  }
  // 구경꾼
  {
    const { page, errs, close } = await open(browser, base, 'eqpyramid', 'seed=4&me=-1&n=2', VPS[0]);
    for (let g = 0; g < 3; g++) await page.evaluate(() => window.__h.next());
    const r = await page.evaluate(() => ({ en: document.querySelectorAll('.ep-c:not(:disabled)').length, btn: document.querySelectorAll('.ep-act button').length, coach: window.__h.U.coach(window.__h.view(), -1, -1, null) }));
    const m = await measure(page);
    ok(r.en === 0 && r.btn === 0 && /구경/.test(r.coach.rec) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r).slice(0, 300)}`);
    await page.screenshot({ path: path.join(SH, 'ep-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (!(await page.locator('[data-x="pass"]').count())) return false;
  await doAct(page, a, null);
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) {   // 먼저 틀리게: A → H → C (7 ÷ 3 + 9) → 선언 → 다시
      const a = box.querySelector('button[data-c="A"]'), hh = box.querySelector('button[data-c="H"]'), c = box.querySelector('button[data-c="C"]');
      if (a && hh && c) { a.click(); box.querySelector('button[data-c="H"]').click(); box.querySelector('button[data-c="C"]').click(); const g = box.querySelector('[data-x="say"]'); if (g && !g.disabled) { g.click(); return true; } }
    }
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('수식 피라미드 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('eqpyramid', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_rounds=5' : 'cfg_rounds=5'), ns: [2, 3, 4] });
})();

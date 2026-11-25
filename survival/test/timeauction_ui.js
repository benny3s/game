// 시간 경매 화면 시험: node survival/test/timeauction_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 인원 8 · 6 × 내 자리 — 한 게임 끝까지: 넘침 · 줄이 core 와 같은지 · 남의 시간 숨김
//  ② 진짜로 꾹 누르기(마우스 누름 → 5초 카운트다운 → 시계 → 뗌): 카운트다운 중 떼면 포기 · 쥔 만큼 냄 · 포기 단추 · 다 쓰면 저절로 풀림
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (3 · 6 · 8 · 5명, 내 자리 0 · 2) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick'), FAST = 50;   // 시계 50배 (5초 카운트다운 = 0.1초)

const DRAW = () => {                          // 화면이 core 의 상태를 그대로 그리는지 (남의 시간은 안 보이는지)
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [], C = h.C;
  const rows = st.querySelectorAll('.ta-p');
  if (rows.length !== V.n) bad.push('줄 ' + rows.length);
  if (!rows[0] || !rows[0].classList.contains('me')) bad.push('첫 줄이 내 줄이 아님');
  for (let k = 0; k < rows.length; k++) {
    const s = (me + k) % V.n, mk = rows[k].querySelector('.mk'), kn = rows[k].querySelector('.kn').innerText.replace(/\s+/g, ' ');
    if (!mk || !mk.innerText.startsWith('★' + V.marks[s])) bad.push(`표식 ${s}`);
    const want = V.over ? `남음 ${C.fmt(V.bank[s])}` : s === me ? `내 남음 ${C.fmt(V.bank[s])}` : `낙찰에 ${C.fmt(V.known[s])}`;
    if (kn !== want) bad.push(`시간 칸 ${s}: ${kn} ≠ ${want}`);
  }
  return bad;
};
const COACH = () => {
  const h = window.__h, U = h.U, me = h.ME, V = h.C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name));
  return { c, text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), phase: V.phase };
};
// 단추를 진짜로 누르고 ms 뒤 뗌 (마우스) → 그동안 시계 글을 한 번 읽음
async function hold(page, ms, peekAt, shotPath) {
  const b = page.locator('.ta-btn'); const box = await b.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  let peek = null;
  if (peekAt != null && peekAt < ms) { await page.waitForTimeout(peekAt); peek = await page.evaluate(() => { const c = document.getElementById('taClk'); return c ? { t: c.textContent, cls: c.className, on: !!document.querySelector('.ta-btn.on'), bank: document.getElementById('taBank').textContent } : null; }); if (shotPath) { try { await page.screenshot({ path: shotPath, timeout: 4000 }); } catch (e) { /* 쥐는 도중 사진은 가끔 안 찍힘 — 시험과는 무관 */ } } await page.waitForTimeout(ms - peekAt); }
  else await page.waitForTimeout(ms);
  await page.mouse.up();
  return peek;
}

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const [n, me] of [[8, 0], [6, 2]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'timeauction', `seed=${5 + n + me}&n=${n}&me=${me}`, vp);
    await page.evaluate(f => { window.__TA_SPEED = f; }, FAST);
    const shot = async name => { if (vp.w !== 360 && me === 0) await page.screenshot({ path: path.join(SH, `ta-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, shows = 0, coachTested = 0, mine = 0, kinds = { tap: 0, pass: 0, hold: 0 };
    for (let k = 1; k <= 400; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, round: V.round, bank: V.bank[h.ME] }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · phase ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (k === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') {
        shows++;
        const t = await page.evaluate(() => { const r = document.querySelector('.ta-res'); return r ? r.innerText : null; });
        ok(t && /(낙찰|유찰)/.test(t) && /내 남은 시간/.test(t), `${tag} #${k}: 결과 띠 ${t}`);
        if (shows === 2) await shot('result');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (k % 4 === 1 && coachTested < (QUICK ? 2 : 5)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && (!r.need || /%/.test(r.c.why)), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 200)}`);
        if (sampleShown < 1 && vp.w === 375 && r.need && s.round >= 3) { sampleShown++; console.log(`· 선생님 글 예시 (경매 ${s.round}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      mine++;
      const kind = mine % 5 === 2 ? 'tap' : mine % 5 === 4 ? 'pass' : 'hold';
      kinds[kind]++;
      const before = s.bank;
      if (kind === 'pass') await page.locator('[data-a="pass"]').click();
      else if (kind === 'tap') { const sp = kinds.tap === 1 && vp.w !== 360 && me === 0 ? path.join(SH, `ta-${vp.w}x${vp.h}-countdown.png`) : null;
        if (sp) await page.evaluate(() => { window.__TA_SPEED = 1; });          // 사진 찍는 동안 카운트다운이 끝나지 않게
        const pk = await hold(page, sp ? 700 : 40, sp ? 400 : 20, sp);
        if (sp) await page.evaluate(f => { window.__TA_SPEED = f; }, FAST); ok(pk && /^[1-5]$/.test(pk.t) && /cd/.test(pk.cls) && pk.on, `${tag} #${k}: 카운트다운 숫자 ${JSON.stringify(pk)}`); }
      else {
        const ms = 100 + 60 + (mine * 37) % 300;           // 카운트다운 0.1초 + 0.06초쯤 뒤부터 · 쥔 시간 ≈ (ms-100)×50/1000 초
        const pk = await hold(page, ms, ms - 30, kinds.hold === 2 && vp.w !== 360 && me === 0 ? path.join(SH, `ta-${vp.w}x${vp.h}-holding.png`) : null);
        ok(pk && /초$/.test(pk.t) && /run/.test(pk.cls), `${tag} #${k}: 쥐는 동안 시계 ${JSON.stringify(pk)}`);
        if (kinds.hold === 1) { await page.mouse.down(); await page.mouse.up(); }   // 이미 냈으면 더 눌러도 그대로
      }
      const got = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), h.ME); return { bid: V.bid[h.ME], my: V.res ? V.res.my : null, bank: V.bank[h.ME], phase: V.phase }; });
      const paid = got.bid != null ? got.bid : got.my;
      if (kind === 'hold') ok(paid > 0 && paid <= before, `${tag} #${k}: 쥔 만큼 냄 ${JSON.stringify(got)}`);
      else ok(paid === 0, `${tag} #${k}: ${kind === 'tap' ? '카운트다운 중 떼면' : '포기 단추면'} 0 ${JSON.stringify(got)}`);
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    ok(kinds.tap >= 2 && kinds.pass >= 2 && kinds.hold >= 6, `${tag}: 누르기 종류 ${JSON.stringify(kinds)}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { note: t.querySelector('.ta-acts').innerText, res: h.result(), piece: t.querySelectorAll('.ta-p.pc').length, dead: t.querySelectorAll('.ta-p.dead').length, fin: h.view().fin }; });
    ok(/끝/.test(e.note) && /🧩|피스/.test(e.note) && /❌/.test(e.note) && /★/.test(e.res) && e.dead === 1 && e.piece === (e.fin.piece >= 0 ? 1 : 0), `${tag}: 끝 글 · 결과 글 · 줄 표시 ${e.note} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 다 쓰면 저절로 풀림: 내 남은 시간을 2.0초로 줄이고 오래 쥠
  {
    const { page, errs, close } = await open(browser, base, 'timeauction', 'seed=4&n=4&me=0', VPS[0]);
    await page.evaluate(f => { window.__TA_SPEED = f; const h = window.__h; h.st().bank[0] = 20; h.render(); }, FAST);
    const b = page.locator('.ta-btn'), box = await b.boundingBox();
    await page.mouse.move(box.x + 50, box.y + 50); await page.mouse.down(); await page.waitForTimeout(700);
    const r = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 0); return { bid: V.bid[0], my: V.res ? V.res.my : null, on: !!document.querySelector('.ta-btn.on') }; });
    await page.mouse.up();
    ok((r.bid === 20 || r.my === 20), `다 쓰면 손을 떼기 전에 저절로 풀림 (남은 2.0초) ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `저절로 풀림: ${x}`);
    await close();
  }
  // 구경꾼 (me = -1): 버튼 없이 줄만, 남은 시간 안 보임
  {
    const { page, errs, close } = await open(browser, base, 'timeauction', 'seed=4&n=8&me=-1', VPS[2]);
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.ta-btn').length, rows: document.querySelectorAll('.ta-p').length, txt: document.getElementById('stage').innerText }));
    const m = await measure(page);
    ok(r.btn === 0 && r.rows === 8 && !/내 남음/.test(r.txt) && !m.docx && m.sy <= 2, `구경꾼 화면 ${JSON.stringify({ btn: r.btn, rows: r.rows })} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  await page.evaluate(f => { window.__TA_SPEED = f; }, FAST);
  const b = page.locator('.ta-btn:not([disabled])');
  if (!(await b.count())) return false;
  if (step % 4 === 0) { await page.locator('[data-a="pass"]').click(); return true; }
  await hold(page, 110 + (step * 53) % 260);
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    const w = box.querySelector(`[data-v="${k2 === 0 ? 1 : 'n'}"]`); if (!w) return false; w.click(); return true;   // 먼저 틀린 답(AI1), 다음 맞는 답(아무도)
  }, k);
}

(async () => {
  const f = await session('시간 경매 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('timeauction', policy, { runs: QUICK ? 2 : 4, ns: [6, 3, 8, 5], tutPolicy, query: r => (r % 2 ? 'me=2' : '') });
})();

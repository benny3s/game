// 빅 스몰 화면 시험: node survival/test/bigsmall_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판(18라운드)을 단추로: 넘침 · 칩 · 딜러 카드 · 낸 카드(뒷면/앞면)가 core 와 같은지 ·
//     내 손패 단추 = 남은 카드 · 고르기/다시 눌러 취소 · 베팅 쪽 · 칩 −/+/1/3/전부 · 걸기 → core 기록과 같음 · 결과 글 · 누르는 크기 44px
//  ② 구경꾼 (me = -1) · 칩 0개로 끝나는 장면
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 상태를 그대로 그리는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [], C = h.C;
  const opp = 1 - me, order = me >= 0 ? [me, opp] : [0, 1];
  const cs = [...st.querySelectorAll('.bs-who .c')].map(x => +x.innerText.replace(/\D/g, ''));
  if (JSON.stringify(cs) !== JSON.stringify(order.map(s => V.chips[s]))) bad.push(`칩 ${cs} ≠ ${order.map(s => V.chips[s])}`);
  const dl = st.querySelector('.bs-card.dl');
  if (!dl || +dl.innerText !== V.D) bad.push('딜러 카드 ' + (dl && dl.innerText));
  const slots = st.querySelectorAll('.bs-slot .bs-card'), pc = slots[1];
  if (V.phase === 'bet') {
    if (me === V.duel) { if (+pc.innerText !== V.P || pc.classList.contains('back')) bad.push('내가 낸 카드 앞면 ' + pc.innerText); }
    else if (!pc.classList.contains('back') || /\d/.test(pc.innerText)) bad.push('상대가 낸 카드는 뒷면 ' + pc.innerText);
  }
  if (V.phase === 'duel' && /\d/.test(pc.innerText)) bad.push('내기 전 카드 칸에 숫자 ' + pc.innerText);
  if ((V.phase === 'show' || V.over) && V.last && +pc.innerText !== V.last.P) bad.push('결과 카드 ' + pc.innerText);
  const pill = st.querySelector('.bs-pill.r').innerText;
  if (pill !== `${V.r}/18R`) bad.push('라운드 ' + pill);
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  if (can && V.phase === 'duel') {
    const btn = [...st.querySelectorAll('.bs-hand button.bs-h')].map(b => +b.dataset.card), x = st.querySelectorAll('.bs-hand span.bs-h.x').length;
    const want = C.bits(V.handOwn[me]);
    if (JSON.stringify(btn) !== JSON.stringify(want) || btn.length + x !== 11) bad.push(`내 손패 단추 ${btn} ≠ ${want} (x ${x})`);
    st.querySelectorAll('.bs-hand button.bs-h').forEach(b => { const v = +b.dataset.card, c = v > V.D ? 'gt' : v < V.D ? 'lt' : 'eq'; if (!b.classList.contains(c)) bad.push('색 ' + v); });
  }
  if (can && V.phase === 'bet') {
    const sp = [...st.querySelectorAll('.bs-mini span:not(.x)')].map(s => +s.innerText), want = C.bits(V.hand[V.duel]);
    if (JSON.stringify(sp) !== JSON.stringify(want)) bad.push(`상대 손패 ${sp} ≠ ${want}`);
    if (st.querySelectorAll('.bs-sd').length !== 2) bad.push('빅 · 스몰 단추');
  }
  if (!can && st.querySelector('.bs-go')) bad.push('내 차례가 아닌데 걸기/내기 단추');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), legal = C.legal(h.st(), me).map(a => JSON.stringify(a));
  return { c, text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), phase: V.phase, recOk: !r || legal.includes(JSON.stringify(r.a)) };
};
const SIZES = () => [...document.querySelectorAll('#stage .bs-h, #stage .bs-sd, #stage .bs-amt button, #stage .bs-go')].filter(b => b.tagName === 'BUTTON')
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + (b.dataset.amt || ''), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'bigsmall', `seed=${3 + me * 4 + vp.w % 7}&me=${me}`, vp);
    await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `bs-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, shows = 0, duels = 0, bets = 0, coachTested = 0, selTested = 0, amtTested = 0, sizeTested = 0;
    for (let k = 1; k <= 120; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, r: V.r, chips: V.chips[h.ME] }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px · ${s.phase}`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (k === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'show') {
        shows++;
        const t = await page.evaluate(() => { const h = window.__h, V = h.view(); return { info: document.querySelector('.bs-info').innerText, last: V.last }; });
        ok(new RegExp(`카드 ${t.last.P} vs 딜러 ${t.last.D}`).test(t.info) && /대결/.test(t.info) && /(맞음|틀림|돌려받음)/.test(t.info), `${tag} #${k}: 결과 글 ${t.info}`);
        if (shows === 2) await shot('result');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; }
      if (sizeTested < 4) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachTested < (QUICK ? 2 : 5) && k % 3 === 1) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && /%|틀릴 수 없/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 200)}`);
        if (sampleShown < 2 && vp.w === 375 && r.phase === (sampleShown ? 'bet' : 'duel')) { sampleShown++; console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      if (s.phase === 'duel') {
        const H = await page.evaluate(() => [...document.querySelectorAll('.bs-hand button.bs-h')].map(b => +b.dataset.card));
        const v = H[(k * 5) % H.length], w = H[(k * 5 + 1) % H.length];
        if (selTested < 3 && H.length >= 2) {           // 고르기 → 다시 눌러 취소 → 다른 카드
          await page.locator(`.bs-h[data-card="${w}"]`).click();
          let r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('.bs-h.sel')].map(b => +b.dataset.card), go: document.querySelector('.bs-go').innerText, dis: document.querySelector('.bs-go').disabled }));
          ok(JSON.stringify(r.sel) === `[${w}]` && new RegExp(`카드 ${w} 내기`).test(r.go) && !r.dis, `${tag} #${k}: 카드 고르기 ${JSON.stringify(r)}`);
          if (selTested === 0) await shot('selected');
          await page.locator(`.bs-h[data-card="${w}"]`).click();
          r = await page.evaluate(() => ({ sel: document.querySelectorAll('.bs-h.sel').length, dis: document.querySelector('.bs-go').disabled }));
          ok(r.sel === 0 && r.dis, `${tag} #${k}: 다시 눌러도 취소 안 됨 ${JSON.stringify(r)}`);
          const before = await page.evaluate(() => window.__h.view().phase);
          await page.locator('.bs-go').click({ force: true });
          ok(await page.evaluate(() => window.__h.view().phase) === before, `${tag} #${k}: 카드 안 골랐는데 냄`);
          selTested++;
        }
        await page.locator(`.bs-h[data-card="${v}"]`).click();
        await page.locator('.bs-go[data-go="card"]').click();
        const got = await page.evaluate(() => { const h = window.__h, V = h.C.view(h.st(), 'all'); const L = V.hist[V.hist.length - 1]; return { P: V.P, phase: V.phase, last: L, hand: V.handOwn[h.ME] }; });
        // AI 가 바로 걸고 결과(show)까지 감
        ok(got.last && got.last.P === v && got.last.duel === me && !(got.hand >> v & 1), `${tag} #${k}: 낸 카드(${v})가 기록과 다름 ${JSON.stringify(got)}`);
        duels++;
        continue;
      }
      if (s.phase === 'bet') {
        const side = k % 2 ? 'B' : 'S';
        await page.locator(`.bs-sd[data-side="${side}"]`).click();
        let want = 1;
        if (amtTested < 3 && s.chips >= 3) {            // + + − · 전부 · 1 · 3
          await page.locator('[data-amt="+1"]').click(); await page.locator('[data-amt="+1"]').click(); await page.locator('[data-amt="-1"]').click();
          let n = await page.evaluate(() => +document.querySelector('.bs-amt .n').firstChild.textContent);
          ok(n === 2, `${tag} #${k}: + + − 뒤 칩 ${n}`);
          await page.locator(`[data-amt="=${s.chips}"]`).click();
          n = await page.evaluate(() => ({ n: +document.querySelector('.bs-amt .n').firstChild.textContent, plus: document.querySelector('[data-amt="+1"]').disabled, go: document.querySelector('.bs-go').innerText }));
          ok(n.n === s.chips && n.plus && new RegExp(`${side === 'B' ? '빅' : '스몰'}에 ${s.chips}칩 걸기`).test(n.go), `${tag} #${k}: 전부 ${JSON.stringify(n)}`);
          await page.locator('[data-amt="=1"]').click();
          n = await page.evaluate(() => ({ n: +document.querySelector('.bs-amt .n').firstChild.textContent, minus: document.querySelector('[data-amt="-1"]').disabled }));
          ok(n.n === 1 && n.minus, `${tag} #${k}: 1 ${JSON.stringify(n)}`);
          await page.locator('[data-amt="=3"]').click(); want = 3;
          if (amtTested === 0) await shot('bet');
          amtTested++;
        }
        await page.locator('.bs-go[data-go="bet"]').click();
        const L = await page.evaluate(() => { const V = window.__h.view(); return V.hist[V.hist.length - 1]; });
        ok(L && L.side === side && L.amt === want && L.duel === 1 - me, `${tag} #${k}: 건 것이 기록과 다름 ${JSON.stringify(L)} (${side} ${want})`);
        bets++;
        continue;
      }
      ok(false, `${tag} #${k}: 알 수 없는 단계 ${s.phase}`); break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    ok(duels >= 3 && bets >= 3 && shows >= 6, `${tag}: 대결 ${duels} · 베팅 ${bets} · 결과 ${shows}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { info: t.querySelector('.bs-info').innerText, cls: t.querySelector('.bs-info').className, res: h.result(), go: t.querySelectorAll('.bs-go').length }; });
    ok(/(승|무승부)/.test(e.info) && /end/.test(e.cls) && /R ·/.test(e.res) && e.go === 0, `${tag}: 끝 글 · 결과 글 ${e.info} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 구경꾼: 단추 없이 두 사람 손패만, 넘침 없음
  {
    const { page, errs, close } = await open(browser, base, 'bigsmall', 'seed=4&me=-1', VPS[2]);
    const r = await page.evaluate(() => ({ go: document.querySelectorAll('.bs-go,.bs-h[data-card],.bs-sd').length, mini: document.querySelectorAll('.bs-mini').length, who: document.querySelectorAll('.bs-who').length }));
    const m = await measure(page);
    ok(r.go === 0 && r.mini === 2 && r.who === 2 && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
  // 칩 0개: 내 베팅이 틀려 칩이 다 떨어지면 바로 끝
  for (const vp of VPS.slice(0, 2)) {
    const tag = `칩0-${vp.w}x${vp.h}`;
    const { page, errs, close } = await open(browser, base, 'bigsmall', 'seed=5&me=0', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st(), m = a => a.reduce((x, v) => x | (1 << v), 0);
      h.hold(true);
      st.r = 4; st.first = 0; st.duel = 1; st.D = 5; st.P = 9; st.phase = 'bet'; st.over = false; st.res = null;
      st.hand = [m([0, 1, 2, 3, 4, 6, 8, 10]), m([0, 2, 3, 4, 6, 7, 8, 10])]; st.dset = [m([1, 2, 3, 4, 6, 7, 8]), m([1, 2, 3, 6, 7, 8])]; st.chips = [2, 15];
      h.render();
    });
    await page.locator('.bs-sd[data-side="S"]').click();
    await page.locator('[data-amt="=2"]').click();
    await page.locator('.bs-go[data-go="bet"]').click();
    const r = await page.evaluate(() => { const V = window.__h.view(), t = document.getElementById('stage'); return { over: V.over, why: V.res && V.res.why, w: V.res && V.res.w, info: t.querySelector('.bs-info').innerText, cls: t.querySelector('.bs-info').className, chip: t.querySelector('.bs-who .c').innerText }; });
    ok(r.over && r.why === 'zero' && r.w === 1 && /0개/.test(r.info) && /bad/.test(r.cls) && /0/.test(r.chip), `${tag}: 칩 0개 끝 ${JSON.stringify(r)}`);
    if (vp.w === 375) await page.screenshot({ path: path.join(SH, `bs-${vp.w}x${vp.h}-zero.png`) });
    const m = await measure(page); ok(!m.docx && m.sy <= 2 && m.outB <= 2, `${tag}: 화면 넘침 ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const hb = page.locator('.bs-hand button.bs-h'), nh = await hb.count();
  if (nh) { await hb.nth(step % nh).click(); await page.locator('.bs-go[data-go="card"]').click(); return true; }
  const sd = page.locator('.bs-sd'), ns = await sd.count();
  if (ns) {
    await sd.nth(step % 2).click();
    if (step % 3 === 0) { const p = page.locator('[data-amt="+1"]:not([disabled])'); if (await p.count()) await p.click(); }
    await page.locator('.bs-go[data-go="bet"]').click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = box.querySelector('[data-side="B"]'); if (w) { w.click(); return true; } }      // 먼저 틀린 쪽(빅)
    if (k2 === 1) { const g = box.querySelector('[data-go]'); if (g) { g.click(); return true; } }           // 빅인 채로 걸기 → 안 먹음
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('빅 스몰 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('bigsmall', policy, { runs: QUICK ? 2 : 4, tutPolicy, query: r => (r % 2 ? 'me=1' : '') });
})();

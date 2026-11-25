// 하나 빼기 화면 시험: node survival/test/minusone_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 인원 7 · 8 × 내 자리 — 한 게임 끝까지: 넘침 · 줄이 core 와 같은지 · 숨김(공개 전 뒷면) · 내 카드 상태
//  ② 단추로 내기(2장 고르기 · 다시 눌러 취소 · 세 번째는 바꿔 끼움) · 쓰기 · 결과 · 정산 띠 · 끝 글
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (3 · 5 · 7 · 8명, 내 자리 0 · 2) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 상태를 그대로 그리는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const rows = st.querySelectorAll('.m1-p');
  if (rows.length !== V.n) bad.push('줄 ' + rows.length);
  if (!rows[0] || !rows[0].classList.contains('me')) bad.push('첫 줄이 내 줄이 아님');
  // 공개 전: 남의 줄엔 숫자 대신 뒷면
  if (V.phase === 'sub') for (let k = 1; k < rows.length; k++) { const s = (me + k) % V.n; if (V.alive[s] && V.subbed[s] && rows[k].querySelectorAll('.m1-pair .bk').length !== 2) bad.push('뒷면 ' + s); if (V.alive[s] && /\d/.test(rows[k].querySelector('.m1-pair') ? rows[k].querySelector('.m1-pair').innerText : '')) bad.push('공개 전 숫자 ' + s); }
  if (V.phase === 'pick') for (let k = 0; k < rows.length; k++) { const s = (me + k) % V.n; const t = rows[k].querySelector('.m1-pair'); if (V.alive[s] && t && t.innerText.replace(/\s/g, '') !== V.sub[s].join('')) bad.push('공개 2장 ' + s); }
  // 남은 카드 칸
  for (let k = 0; k < rows.length; k++) {
    const s = (me + k) % V.n, hd = rows[k].querySelectorAll('.m1-hd span'); if (!V.alive[s]) continue;
    if (hd.length !== 8) { bad.push('남은 칸 ' + s); continue; }
    hd.forEach((x, i) => { const c = i + 1, used = !V.hand[s].includes(c), hold = V.hold[s] === c; if (x.classList.contains('x') !== used || x.classList.contains('h') !== (hold && !used)) bad.push(`남은 칸 ${s}:${c}`); });
  }
  // 내 카드
  if (V.alive[me] && !V.over) {
    const cs = [...st.querySelectorAll('.m1-grid .m1-c')];
    if (cs.length !== 8) bad.push('내 카드 ' + cs.length);
    const can = V.needs.includes(me), en = cs.filter(b => !b.disabled).map(b => +b.dataset.c).sort((a, b) => a - b);
    const want = !can ? [] : V.phase === 'sub' ? V.usable[me] : V.phase === 'pick' ? V.sub[me].slice().sort((a, b) => a - b) : [];
    if (JSON.stringify(en) !== JSON.stringify(want)) bad.push(`누를 수 있는 카드 ${en} ≠ ${want}`);
    cs.forEach(b => { const c = +b.dataset.c; if (b.classList.contains('x') !== !V.hand[me].includes(c)) bad.push('쓴 카드 표시 ' + c); if (b.classList.contains('h') !== (V.hold[me] === c && V.hand[me].includes(c))) bad.push('쉼 표시 ' + c); });
  }
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), legal = C.legal(h.st(), me).map(a => JSON.stringify(a.t === 'sub' ? { t: 'sub', c: a.c.slice().sort((x, y) => x - y) } : a));
  return { c, text: c.opp + c.mine + c.rec + c.why, need: V.needs.includes(me), phase: V.phase, legal };
};

async function extras({ browser, base, ok }) {
  let sampleShown = 0;
  for (const vp of VPS) for (const [n, me] of [[8, 0], [7, 3]]) {
    const tag = `${vp.w}x${vp.h}-n${n}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'minusone', `seed=${5 + n + me}&n=${n}&me=${me}`, vp);
    const shot = async name => { if (vp.w !== 360 && me === 0) await page.screenshot({ path: path.join(SH, `m1-${vp.w}x${vp.h}-${name}.png`) }); };
    let over = false, shows = 0, settles = 0, clicked = 0, coachTested = 0, picked = 0;
    for (let k = 1; k <= 400; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, round: V.round, alive: V.alive[h.ME], settle: !!(V.res && V.res.settle) }; });
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
        const t = await page.evaluate(() => { const r = document.querySelector('.m1-res'); return r ? { t: r.innerText, st: r.classList.contains('st') } : null; });
        ok(t && /(승리|승자 없음|생존)/.test(t.t), `${tag} #${k}: 결과 띠 ${t && t.t}`);
        if (s.settle) { settles++; ok(t && t.st && /생존/.test(t.t), `${tag} #${k}: 정산 띠 ${t && t.t}`); if (settles === 1) await shot('settle'); }
        else if (shows === 1) await shot('result');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { const moved = await page.evaluate(() => window.__h.next()); if (!moved) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤 (${s.phase})`); break; } continue; }
      if (k % 5 === 1 && coachTested < (QUICK ? 2 : 6)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.text.length > 40 && !/undefined|NaN|null|\[object|\(가\)|\(는\)/.test(r.text) && (!r.need || /%/.test(r.c.why)), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 200)}`);
        if (sampleShown < 2 && vp.w === 375 && r.need && r.phase === (sampleShown ? 'pick' : 'sub')) { sampleShown++; console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      // 단추로 두기
      if (s.phase === 'sub') {
        const U = await page.evaluate(() => window.__h.view().usable[window.__h.ME]);
        const a = U[k % U.length], b = U[(k + 3) % U.length] === a ? U[(k + 1) % U.length] : U[(k + 3) % U.length];
        if (clicked < 3 && U.length >= 3) {                 // 다시 눌러 취소 · 세 번째는 바꿔 끼움
          await page.locator(`.m1-c[data-c="${a}"]`).click(); await page.locator(`.m1-c[data-c="${a}"]`).click();
          let r = await page.evaluate(() => document.querySelectorAll('.m1-c.sel').length);
          ok(r === 0, `${tag} #${k}: 다시 눌렀는데 선택이 안 풀림`);
          const c3 = U.find(x => x !== a && x !== b);
          await page.locator(`.m1-c[data-c="${c3}"]`).click(); await page.locator(`.m1-c[data-c="${a}"]`).click(); await page.locator(`.m1-c[data-c="${b}"]`).click();
          r = await page.evaluate(() => [...document.querySelectorAll('.m1-c.sel')].map(x => +x.dataset.c).sort((x, y) => x - y));
          ok(JSON.stringify(r) === JSON.stringify([a, b].sort((x, y) => x - y)), `${tag} #${k}: 세 번째 카드가 첫 카드를 바꿔 끼우지 않음 ${r}`);
          if (clicked === 0) await shot('selected');
          clicked++;
        } else { await page.locator(`.m1-c[data-c="${a}"]`).click(); await page.locator(`.m1-c[data-c="${b}"]`).click(); }
        const en = await page.evaluate(() => !document.querySelector('[data-a="sub"]').disabled);
        ok(en, `${tag} #${k}: 2장 골랐는데 내기 단추가 꺼져 있음`);
        await page.locator('[data-a="sub"]').click();
        const got = await page.evaluate(() => { const V = window.__h.C.view(window.__h.st(), window.__h.ME); return V.sub[window.__h.ME]; });
        ok(got && got[0] === a && got[1] === b, `${tag} #${k}: 낸 2장이 고른 순서(왼쪽 · 오른쪽)와 다름 ${got} ≠ ${a},${b}`);
        if (clicked === 1 && k < 4) { await page.evaluate(() => window.__h.render()); await shot('pick'); }
        continue;
      }
      if (s.phase === 'pick') {
        const pk = page.locator('.m1-c.pk'), np = await pk.count();
        ok(np === 2, `${tag} #${k}: 쓸 카드 후보 ${np}개`);
        const c = +(await pk.nth(k % 2).getAttribute('data-c'));
        await pk.nth(k % 2).click(); picked++;
        const r = await page.evaluate(() => { const h = window.__h, V = h.view(); return { res: V.res ? V.res.pick[h.ME] : null, pick: V.pick[h.ME] }; });
        ok(r.res === c || r.pick === c, `${tag} #${k}: 누른 카드(${c})가 안 쓰임 ${JSON.stringify(r)}`);
        continue;
      }
      ok(false, `${tag} #${k}: 알 수 없는 단계 ${s.phase}`); break;
    }
    ok(over, `${tag}: 게임이 끝나지 않음`);
    ok(settles >= 2 && picked >= 1, `${tag}: 정산 ${settles}번 · 쓰기 ${picked}번`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { note: t.querySelector('.m1-acts').innerText, res: h.result(), rows: t.querySelectorAll('.m1-p.safe').length + t.querySelectorAll('.m1-p.dead').length }; });
    ok(/끝/.test(e.note) && /R/.test(e.res) && /생존|탈락/.test(e.res) && e.rows === n, `${tag}: 끝 글 · 결과 글 · 줄 표시 ${e.note} / ${e.res.slice(0, 160)} / ${e.rows}`);
    if (vp.w === 375) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 구경꾼 (me = -1): 내 카드 칸 없이 줄만, 넘침 없음
  {
    const { page, errs, close } = await open(browser, base, 'minusone', 'seed=4&n=8&me=-1', VPS[2]);
    const r = await page.evaluate(() => ({ me: document.querySelectorAll('.m1-me').length, rows: document.querySelectorAll('.m1-p').length }));
    const m = await measure(page);
    ok(r.me === 0 && r.rows === 8 && !m.docx && m.sy <= 2, `구경꾼 화면 ${JSON.stringify(r)} ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const pk = page.locator('.m1-c.pk'), np = await pk.count();
  if (np) { await pk.nth(step % np).click(); return true; }
  const cs = page.locator('.m1-grid .m1-c:not([disabled])'), nc = await cs.count();
  if (nc >= 2) {
    const sel = await page.locator('.m1-c.sel').count();
    if (sel < 2) { await cs.nth(step % nc).click(); const s2 = await page.locator('.m1-c.sel').count(); if (s2 < 2) { const rest = page.locator('.m1-grid .m1-c:not([disabled]):not(.sel)'); await rest.nth(step % (await rest.count())).click(); } }
    const b = page.locator('[data-a="sub"]:not([disabled])');
    if (await b.count()) { await b.click(); return true; }
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    const w = box.querySelector(`[data-v="${k2 === 0 ? 6 : 2}"]`); if (!w) return false; w.click(); return true;   // 먼저 틀린 카드(6), 다음 맞는 카드(2)
  }, k);
}

(async () => {
  const f = await session('하나 빼기 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('minusone', policy, { runs: QUICK ? 2 : 4, ns: [7, 3, 8, 5], tutPolicy, query: r => (r % 2 ? 'me=2' : '') });
})();

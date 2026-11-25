// 3층 오목 화면 시험: node survival/test/omok3_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 경기를 두며 넘침 · 판 그림이 core 와 같은지 · 기본 배치 / 옮길 돌 표시 · '!' · '★'
//  ② 기본 배치: 정중앙 · 내 돌 이웃 칸을 눌러도 안 놓임
//  ③ 돌 누르기: 내 돌 선택 → 갈 곳 표시가 core.legal 과 같고, 다시 누르면 취소 · 올라타기
//  ④ 직접 만든 장면: 오목 완성 → 이긴 줄 강조 · 판 끝 글 · 선후공 고르기 단추
//  ⑤ s3ui_lib 로 화면 단추만 눌러 경기 끝까지 (단판 · 3판, 내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {                          // 화면이 core 의 판을 그대로 그리는지
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const pts = [...st.querySelectorAll('.o3-board .o3-p')];
  if (pts.length !== 85) bad.push('칸 ' + pts.length);
  pts.forEach(p => {
    const i = +p.dataset.c, ly = p.querySelectorAll('.o3-ly'), s = V.stk[i];
    if (ly.length !== s.length) bad.push('층 수 ' + i);
    else if (s.length && ly[ly.length - 1].classList.contains('w') !== (s[s.length - 1] === 1)) bad.push('색 ' + i);
  });
  const L = h.C.legal(V, me), can = V.needs.includes(me) && !V.over && (V.phase === 'setup' || V.phase === 'play');
  const sorted = a => [...a].sort((x, y) => x - y);
  const got = q => sorted([...st.querySelectorAll(q)].map(x => +x.dataset.c));
  if (can && V.phase === 'setup') { const legal = new Set(L.map(a => a.to)), want = V.stk.map((a, i) => (!a.length && !legal.has(i) ? i : -1)).filter(i => i >= 0); if (JSON.stringify(got('.o3-p.no')) !== JSON.stringify(sorted(want))) bad.push('못 놓는 칸 표시'); }
  if (can && V.phase === 'play' && JSON.stringify(got('.o3-p.mv')) !== JSON.stringify(sorted(new Set(L.filter(a => a.t === 'move').map(a => a.from))))) bad.push('옮길 돌 표시');
  const hs = [...st.querySelectorAll('.o3-hand .n')].map(x => x.innerText).join('|');
  if (!new RegExp(`놓을 돌 ${V.hand[1 - (me >= 0 ? me : 0)]}`).test(hs)) bad.push('놓을 돌 수 ' + hs);
  return bad;
};
const MARKS = () => {                         // 선생님 창이 열렸을 때만 '!'(상대가 이길 칸) · '★'(내가 이길 칸)
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me), B = C.boardOf(V.stk, V.hand);
  const bang = C.winCells(C.winMoves(B, 1 - me)), star = C.winCells(C.winMoves(B, me)).filter(x => !bang.includes(x));
  const want = { bang: bang.sort((a, b) => a - b), star: star.sort((a, b) => a - b) };
  const mk = on => { const d = document.createElement('div'); U.render(d, V, { me, act() {}, canAct: false, seats: h.seats, mode: 'solo', coachOn: on, g: 1, wait: false, sfx() {}, toast() {} });
    const cells = q => [...d.querySelectorAll(q)].map(x => +x.parentElement.dataset.c).sort((a, b) => a - b); return { bang: cells('.o3-bang'), star: cells('.o3-star') }; };
  const play = V.phase === 'play' && !V.over;
  return { want, on: play ? mk(true) : { bang: [], star: [] }, off: mk(false), play };
};
const COACH = () => {                         // 선생님 글: 빈칸 · undefined 없음, 추천 수는 규칙 안
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, Math.max(-1, V.log.length ? V.log[V.log.length - 1].i - 3 : -1), h.seats.map(s => s.name));
  const r = C.recommend(V, me), legal = C.legal(V, me).map(a => JSON.stringify(a));
  return { c, recOk: !r || legal.includes(JSON.stringify(r.a)), text: c.opp + c.mine + c.rec + c.why };
};

async function extras({ browser, base, ok }) {
  let sampleShown = false;
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'omok3', `seed=${7 + me * 5}&me=${me}&cfg_bo=3`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `o3-${vp.w}x${vp.h}-${name}.png`) }); };
    let selTested = 0, markTested = 0, coachTested = 0, setupSeen = 0, between = 0, orderSeen = 0, over = false;
    for (let n = 1; n <= 500; n++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, hand: V.hand[h.ME], round: V.round, chooser: V.chooser }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${n}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${n}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${n}: undefined/NaN 글`);
      if (n === 1) await shot('start');
      if (s.over) { over = true; break; }
      if (s.phase === 'between') {
        between++;
        const t = await page.evaluate(() => document.querySelector('.o3-info').innerText);
        ok(/판/.test(t) && /(승|무승부)/.test(t) && /곧/.test(t), `${tag}: 판 사이 글 '${t}'`);
        if (between === 1) await shot('between');
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (s.phase === 'order') {
        orderSeen++;
        const r = await page.evaluate(() => ({ btns: document.querySelectorAll('[data-o]').length, info: document.querySelector('.o3-info').innerText }));
        if (s.mine && s.chooser === me) {
          ok(r.btns === 2 && /선후공/.test(r.info), `${tag}: 선후공 고르기 단추 ${r.btns} · ${r.info}`);
          await shot('order');
          await page.locator('[data-o="' + (n % 2) + '"]').click();
          const after = await page.evaluate(() => ({ phase: window.__h.view().phase, first: window.__h.view().first, round: window.__h.view().round }));
          ok(after.phase === 'setup' && after.first === (n % 2 ? me : 1 - me), `${tag}: 선후공 고른 뒤 ${JSON.stringify(after)}`);
          continue;
        }
        ok(r.btns === 0 && /선후공/.test(r.info), `${tag}: 상대가 고를 땐 단추 없음 ${r.btns} · ${r.info}`);
        await page.evaluate(() => window.__h.next()); continue;
      }
      if (!s.mine) { await page.evaluate(() => window.__h.next()); continue; }
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${n}: 화면이 판과 다름 ${d}`);
      if (s.phase === 'setup') {
        setupSeen++;
        if (setupSeen === 1) {
          await shot('setup');
          // 정중앙을 눌러도 안 놓임
          const before = await page.evaluate(() => JSON.stringify(window.__h.view().stk));
          await page.locator('.o3-p[data-c="42"]').click();
          const after = await page.evaluate(() => JSON.stringify(window.__h.view().stk));
          ok(before === after, `${tag}: 정중앙을 눌렀는데 돌이 놓임`);
          const no42 = await page.evaluate(() => document.querySelector('.o3-p[data-c="42"]').classList.contains('no'));
          ok(no42, `${tag}: 정중앙에 '못 놓음' 붉은 테가 없음`);
        }
      }
      // 내 돌을 누르면 선택 · 갈 곳 표시가 core.legal 과 같고, 다시 누르면 취소
      if (s.phase === 'play' && selTested < 4) {
        const mv = page.locator('.o3-p.mv'), k = await mv.count();
        if (k) {
          await mv.nth(n % k).click(); selTested++;
          const r = await page.evaluate(() => { const h = window.__h, V = h.view(), sel = [...document.querySelectorAll('.o3-p.sel')].map(x => +x.dataset.c);
            const tg = [...document.querySelectorAll('.o3-p.tg')].map(x => +x.dataset.c).sort((a, b) => a - b);
            const want = sel.length ? h.C.legal(V, h.ME).filter(a => a.t === 'move' && a.from === sel[0]).map(a => a.to).sort((a, b) => a - b) : [];
            return { sel, tg, want, info: document.querySelector('.o3-info').innerText }; });
          ok(r.sel.length === 1 && JSON.stringify(r.tg) === JSON.stringify(r.want) && r.tg.length > 0 && /옮길/.test(r.info), `${tag} #${n}: 돌 선택 표시가 규칙과 다름 ${JSON.stringify(r)}`);
          const mm = await measure(page); ok(!mm.docx && !mm.sx && mm.sy <= 2, `${tag} #${n}: 선택 중 화면 넘침`);
          if (selTested === 1) await shot('selected');
          await page.locator('.o3-p.sel').click();
          const after = await page.evaluate(() => ({ sel: document.querySelectorAll('.o3-p.sel').length, tg: document.querySelectorAll('.o3-p.tg').length }));
          ok(after.sel === 0 && after.tg === 0, `${tag} #${n}: 같은 돌을 다시 눌러도 선택이 안 풀림`);
        }
      }
      if (n % 3 === 0 && markTested < 14) {
        const r = await page.evaluate(MARKS); markTested++;
        ok(r.off.bang.length === 0 && r.off.star.length === 0, `${tag} #${n}: 선생님 창이 닫혔는데 ! ★ 표시`);
        ok(JSON.stringify(r.on) === JSON.stringify(r.want), `${tag} #${n}: ! ★ 표시가 이길 칸과 다름 ${JSON.stringify(r)}`);
      }
      if (n % 5 === 1 && coachTested < (QUICK ? 3 : 8)) {
        const r = await page.evaluate(COACH); coachTested++;
        ok(r.recOk && r.text.length > 30 && !/undefined|NaN|null|\[object/.test(r.text), `${tag} #${n}: 선생님 글 이상 ${r.text.slice(0, 160)}`);
        if (!sampleShown && s.phase === 'play' && /이겨요|막아요|올라/.test(r.text)) { sampleShown = true; console.log('· 선생님 글 예시:\n   👀', r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why); }
      }
      // 내 수 (AI 수를 core 에 직접 — 이 시험은 화면 배치가 목적, 단추 놀이는 ⑤ 가 함)
      const a = await page.evaluate(() => { const h = window.__h; return h.act(h.C.ai(h.view(), h.ME, 'normal', h.rnd)).ok; });
      ok(a, `${tag} #${n}: AI 수가 안 먹음`);
    }
    ok(over, `${tag}: 경기가 끝나지 않음`);
    ok(between >= 1, `${tag}: 판 사이 장면이 없음 (${between}/${orderSeen})`);
    if (me === 0 && vp.w === 375) {
      const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { info: t.querySelector('.o3-info').innerText, res: h.result(), cls: t.querySelector('.o3-info').className }; });
      ok(/승리|무승부/.test(e.info) && /판 승/.test(e.res) && /1판/.test(e.res), `${tag}: 끝 글 · 결과 글 ${e.info} / ${e.res.slice(0, 120)}`);
      await shot('end');
    }
    for (const e of errs) ok(false, `${tag}: ${e}`);
    await close();
  }

  // 직접 만든 장면: 검정 세로 4개 + 빈 F5 → 눌러서 오목 → 이긴 줄 강조 · 판 끝 글
  for (const vp of VPS.slice(0, 2)) {
    const tag = `오목-${vp.w}x${vp.h}`;
    const { page, errs, close } = await open(browser, base, 'omok3', 'seed=3&me=0&cfg_bo=3', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st(), C = h.C, P = n => C.LBL.indexOf(n);
      st.stk = Array.from({ length: C.NP }, () => []);
      ['F1', 'F2', 'F3', 'F4'].forEach(n => { st.stk[P(n)] = [0]; });
      ['A1', 'A2', 'H5'].forEach(n => { st.stk[P(n)] = [1]; });
      st.stk[P('G6')] = [1, 0];
      st.hand = [6, 6]; st.turn = 0; st.first = 0; st.phase = 'play'; st.over = false; st.ply = 8; st.setup = { seq: [], i: 0 };
      h.render();
    });
    const idx = await page.evaluate(() => window.__h.C.LBL.indexOf('F5'));
    await page.locator(`.o3-p[data-c="${idx}"]`).click();
    const r = await page.evaluate(() => { const V = window.__h.view(), t = document.getElementById('stage'); return { res: V.res, wn: [...t.querySelectorAll('.o3-p.wn')].length, info: t.querySelector('.o3-info').innerText, phase: V.phase }; });
    ok(r.res && r.res.w === 0 && r.res.kind === 'line5' && r.phase === 'between', `${tag}: 오목 판정 ${JSON.stringify(r.res)}`);
    ok(r.wn === 5 && /오목/.test(r.info) && /1판/.test(r.info) && /선후공/.test(r.info), `${tag}: 이긴 줄 강조 5 · 글 ${r.wn} · ${r.info}`);
    if (vp.w === 375) await page.screenshot({ path: path.join(SH, `o3-${vp.w}x${vp.h}-win.png`) });
    // 이어서: 진 쪽(하양 = 상대 AI)이 선후공을 정함 → 자동 진행 후 새 판
    for (let i = 0; i < 6; i++) { await page.evaluate(() => window.__h.next()); const ph = await page.evaluate(() => window.__h.view().phase); if (ph === 'setup') break; }
    const r2 = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, round: V.round, hist: V.hist.length }; });
    ok(r2.phase === 'setup' && r2.round === 2 && r2.hist === 1, `${tag}: 다음 판 시작 ${JSON.stringify(r2)}`);
    const m = await measure(page); ok(!m.docx && !m.sx && m.sy <= 2 && m.outB <= 2, `${tag}: 화면 넘침 ${JSON.stringify(m)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }

  // 올라타기를 단추로: 검정 E4(1층) → 하양 돌 위 (2층) · 2층 칸으로는 초록 점선이 안 생김
  {
    const vp = VPS[0], tag = '올라타기';
    const { page, errs, close } = await open(browser, base, 'omok3', 'seed=3&me=0&cfg_bo=1', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st(), C = h.C, P = n => C.LBL.indexOf(n);
      st.stk = Array.from({ length: C.NP }, () => []);
      st.stk[P('E5')] = [0]; st.stk[P('E6')] = [1]; st.stk[P('D5')] = [1, 1]; st.stk[P('A1')] = [1]; st.stk[P('K1')] = [0];
      st.hand = [0, 0]; st.turn = 0; st.first = 0; st.phase = 'play'; st.over = false; st.ply = 8; st.setup = { seq: [], i: 0 };
      h.render();
    });
    const ids = await page.evaluate(() => { const C = window.__h.C, P = n => C.LBL.indexOf(n); return { e5: P('E5'), e6: P('E6'), d5: P('D5'), nb: C.NB[P('E5')].map(i => C.LBL[i]) }; });
    await page.locator(`.o3-p[data-c="${ids.e5}"]`).click();
    const t = await page.evaluate(() => [...document.querySelectorAll('.o3-p.tg')].map(x => +x.dataset.c));
    const adj = ids.nb.includes('E6') && ids.nb.includes('D5');
    ok(adj ? t.includes(ids.e6) && !t.includes(ids.d5) : true, `${tag}: 1층 돌은 1층 돌 위로 갈 수 있고 2층 칸으로는 못 감 (${adj ? '' : '이웃 아님 '}tg ${t})`);
    if (t.includes(ids.e6)) {
      await page.locator(`.o3-p[data-c="${ids.e6}"]`).click();
      // 하양 AI 가 바로 응수하므로 판 대신 기록으로 확인
      const r = await page.evaluate(() => { const V = window.__h.view(); const e = V.log.filter(x => x.k === 'mv' && x.s === 0)[0]; return e ? { from: e.from, to: e.to, fl: e.fl, cov: e.cov } : null; });
      ok(r && r.from === ids.e5 && r.to === ids.e6 && r.fl === 2 && r.cov === 1, `${tag}: 올라타기 기록 ${JSON.stringify(r)}`);
    }
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 선후공 고르기: 내가 진 쪽이면 단추 둘 → 고르면 새 판
  for (const vp of VPS.slice(0, 2)) for (const pick of [0, 1]) {
    const tag = `선후공-${vp.w}x${vp.h}-${pick ? '먼저' : '나중'}`;
    const { page, errs, close } = await open(browser, base, 'omok3', 'seed=3&me=0&cfg_bo=3', vp);
    await page.evaluate(() => {
      const h = window.__h, st = h.st(), C = h.C;
      st.stk = Array.from({ length: C.NP }, () => []);
      st.round = 1; st.wins = [0, 1]; st.lastW = 1; st.res = { r: 1, w: 1, why: 'win', kind: 'line5', ply: 9, first: 0 }; st.hist = [st.res];
      st.phase = 'order'; st.chooser = 0; st.over = false; h.render();
    });
    const r0 = await page.evaluate(() => ({ btns: [...document.querySelectorAll('[data-o]')].map(x => x.innerText), pill: document.querySelector('.o3-pill').innerText }));
    ok(r0.btns.length === 2 && /선후공/.test(r0.pill), `${tag}: 단추 ${JSON.stringify(r0)}`);
    const m0 = await measure(page); ok(!m0.docx && !m0.sx && m0.sy <= 2 && m0.outB <= 2, `${tag}: 화면 넘침 ${JSON.stringify(m0)}`);
    if (vp.w === 375 && pick) await page.screenshot({ path: path.join(SH, `o3-${vp.w}x${vp.h}-order.png`) });
    await page.locator(`[data-o="${pick}"]`).click();
    const r = await page.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, first: V.first, round: V.round }; });
    ok(r.phase === 'setup' && r.round === 2 && r.first === (pick ? 0 : 1), `${tag}: 고른 뒤 ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }

}

async function policy(page, { step }) {
  // 단추만: 선후공 · 기본 배치(금색 점선) · 놓기(빈 칸) · 옮기기(돌 → 초록 점선), 가끔 엉뚱한 곳 눌러 보기
  const ord = page.locator('[data-o]'), nord = await ord.count();
  if (nord) { await ord.nth(step % 2).click(); return true; }
  const setup = await page.evaluate(() => { const V = window.__h.view(); return V.phase === 'setup' && V.needs.includes(window.__h.ME); });
  if (setup) {
    const pl = page.locator('.o3-p:not(.f):not(.no)'), npl = await pl.count();
    if (step % 5 === 2) await page.locator('.o3-p[data-c="42"]').click();
    if (npl) { await pl.nth(step % npl).click(); return true; }
    return false;
  }
  const mv = page.locator('.o3-p.mv'), nmv = await mv.count();
  const empt = page.locator('.o3-p:not(.f)'), nem = await empt.count();
  const hand = await page.evaluate(() => window.__h.view().hand[window.__h.ME]);
  if (nmv && (step % 3 === 1 || !hand)) {
    await mv.nth(step % nmv).click();
    const tg = page.locator('.o3-p.tg'), nt = await tg.count();
    if (!nt) return false;
    await tg.nth(step % nt).click(); return true;
  }
  if (nem && hand > 0) { await empt.nth((step * 7) % nem).click(); return true; }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const w = [...box.querySelectorAll('[data-c]')].find(x => !x.hasAttribute('data-tp')); if (w) { w.click(); return true; } }   // 먼저 틀린 칸
    const b = box.querySelector('[data-tp]'); if (!b) return false; b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('3층 오목 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('omok3', policy, { runs: QUICK ? 2 : 4, tutPolicy, query: r => `${r % 2 ? 'me=1' : ''}&cfg_bo=${r < 2 ? 1 : 3}` });
})();

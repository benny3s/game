// 기억의 미로 화면 시험: node survival/test/gn-memmaze_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 — 한 판을 칸 누르기로: 넘침 · 말 자리 = 상태 · 앞 차례 길 · ✖ · 판 위 벽은 끝날 때만 32개 ·
//     칸 고르기 → 번호 · 이어지지 않은 칸은 안 들어감 · 마지막 칸 다시 눌러 지우기 · ↩ 다시 · ⚡ 더블 켜고 끄기 · 이동 → 기록 = 고른 길 · 누르는 크기 44px · 판 칸 28px
//  ② 기억 도우미 옵션(알아낸 벽 · 지나간 칸 사이 그림) · 9화 기록 판 옵션 · 구경꾼(me = -1, 벽 안 보임) · 구경 화면('all', 흐린 벽) · 선생님 '한 번 더' 단추
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 (내 자리 0 · 1) + 선생님 글 + 결과 html + 1분 규칙(직접 해 보기: 일부러 벽에 한 번 부딪힌 뒤 바른 길)
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');
const ID = 'gn-memmaze';

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const svg = st.querySelector('.mz-board svg'); if (!svg) return ['판 없음'];
  for (let s = 0; s < 2; s++) { const t = svg.querySelector(`[data-tk="${s}"]`); if (!t || +t.dataset.at !== V.pos[s]) bad.push(`말 자리 ${s}: ${t && t.dataset.at} ≠ ${V.pos[s]}`); }
  const walls = svg.querySelectorAll('[data-w]').length, help = !!(V.opt && V.opt.help);
  if (V.over) { if (walls !== 32) bad.push('끝났는데 벽 ' + walls); }
  else if (help) { if (walls !== V.known.wall.length || svg.querySelectorAll('.op').length !== V.known.open.length) bad.push(`도우미 벽 ${walls}/${V.known.wall.length}`); }
  else if (walls) bad.push('판 위에 벽이 보임 ' + walls);
  for (let s = 0; s < 2; s++) {
    const L = V.last[s], tr = svg.querySelector(`[data-tr="${s}"]`), x = svg.querySelector(`[data-x="${s}"]`);
    if (!!L !== !!tr) bad.push('앞 차례 길 ' + s);
    if (L && (L.fail >= 0) !== !!x) bad.push('부딪힌 자리 ✖ ' + s);
  }
  const can = me >= 0 && V.needs.includes(me) && !V.over;
  const hits = svg.querySelectorAll('[data-c]').length;
  if (can && hits !== 49) bad.push('누를 칸 ' + hits);
  if (!can && (hits || st.querySelector('.mz-act button'))) bad.push('내 차례가 아닌데 단추');
  if (/undefined|NaN|null/.test(st.innerText)) bad.push('글');
  return bad;
};
const SIZES = () => {
  const s = [...document.querySelectorAll('#stage .mz-act button')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.a, Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
  const c = document.querySelector('#stage .mz-board rect[data-c]'); const r = c && c.getBoundingClientRect();
  if (r && (r.width < 28 || r.height < 28)) s.push(['칸', Math.round(r.width), Math.round(r.height)]);
  return s;
};
const PLAN = () => { const st = document.getElementById('stage'), g = st.querySelector('[data-a="go"]'); return { pn: st.querySelectorAll('[data-pn]').length, nx: st.querySelectorAll('[data-nx]').length, go: g ? !g.disabled : null, goTxt: g ? g.textContent : '', db: !!st.querySelector('[data-a="dbl"].on'), st: st.querySelector('.mz-st').innerText }; };
const LAST = () => { const h = window.__h, V = h.C.view(h.st(), 'all'); const L = V.log.filter(e => e.k === 'go' && e.s === h.ME).pop(); return L ? { path: L.path, fail: L.fail, dbl: L.dbl, i: L.i } : null; };
const tap = (page, c) => page.locator(`#stage rect[data-c="${c}"]`).click();

async function doGo(page, a) {
  if (!a) return false;
  if (a.dbl) await page.locator('[data-a="dbl"]').click();
  for (const c of a.path) await tap(page, c);
  await page.locator('[data-a="go"]').click();
  return true;
}

async function extras({ browser, base, ok }) {
  let sample = 0;
  const seen = { pop: 0, clr: 0, bad: 0, dbl: 0, dblUsed: 0, fail: 0, hint: 0 };
  for (const vp of VPS) for (const me of [0, 1]) {
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, ID, `seed=${5 + me * 3 + (vp.w % 7)}&me=${me}`, vp);
    const shot = async name => { if (me === 0 || vp.w === 390) await page.screenshot({ path: path.join(SH, `mz-${vp.w}x${vp.h}-me${me}-${name}.png`) }); };
    let over = false, moves = 0, k = 0, sizeN = 0, coachN = 0;
    for (k = 1; k <= 120; k++) {
      const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), turns: V.turns, fails: V.fails }; });
      const m = await measure(page);
      ok(!m.docx && !m.sx && !m.outR && !m.outL, `${tag} #${k}: 가로 넘침 (${m.who} ${m.outR}/${m.outL})`);
      ok(m.sy <= 2 && m.outB <= 2, `${tag} #${k}: 화면 아래로 잘림 sy ${m.sy} outB ${m.outB} (${m.who}) stage ${m.stageH}px`);
      ok(!m.bad, `${tag} #${k}: undefined/NaN 글`);
      const d = await page.evaluate(DRAW);
      ok(d.length === 0, `${tag} #${k}: 화면이 상태와 다름 ${d.slice(0, 4)}`);
      if (k === 1) await shot('start');
      if (k === 6) await shot('mid');
      if (s.over) { over = true; break; }
      if (!s.mine) { ok(false, `${tag} #${k}: 내 차례도 아닌데 멈춤`); break; }
      if (sizeN < 3) { const z = await page.evaluate(SIZES); sizeN++; ok(!z.length, `${tag} #${k}: 누르는 크기 모자람 ${JSON.stringify(z.slice(0, 3))}`); }
      if (coachN < (QUICK ? 2 : 3)) {
        coachN++;
        const r = await page.evaluate(() => {
          const h = window.__h, C = h.C, me = h.ME, V = C.view(h.st(), me), c = h.coach(), a = C.ai(V, me, 'hard', () => 0.5);
          const want = [V.pos[me]].concat(a.path).map(C.cellName).join(' → ');
          const box = document.createElement('div'); box.innerHTML = `${c.rec} | ${c.why}`; document.body.appendChild(box);
          const before = box.innerText, b = box.querySelector('[data-mzhint]');
          if (b) b.click();
          const after = box.innerText; box.remove();
          const again = h.coach();                                  // 펼친 뒤 같은 차례엔 길 전체
          return { c, before, after, want, btn: !!b, again: again.rec.includes(want) };
        });
        const text = r.c.opp + r.c.mine + r.c.rec + r.c.why;
        ok(r.btn && !r.before.includes(r.want) && r.after.includes(r.want) && r.again, `${tag} #${k}: 💡 단계 힌트 (처음엔 첫 칸만 · '한 번 더' 로 고급 AI 길 ${r.want}) ${r.before.slice(0, 120)} / ${r.after.slice(-140)}`);
        ok(text.length > 60 && /\d+%/.test(text) && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(을\)/.test(text), `${tag} #${k}: 선생님 글 ${text.slice(0, 220)}`);
        seen.hint++;
        if (sample < 2 && vp.w === 375) { sample++; console.log(`· 선생님 글 예시 (${k}번째 내 차례):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.before.split(' | ')[0], '\n   👉', r.before.split(' | ')[1], '\n   💡💡', r.after.split(' | ').pop().slice(-160)); }
      }
      const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
      // 고르기 연습: 이어지지 않은 칸 · 마지막 칸 다시 눌러 지우기 · ↩ 다시 · ⚡ 켜고 끄기
      if (seen.bad < 2) {
        const far = await page.evaluate(() => { const h = window.__h, V = h.view(), C = h.C, p = V.pos[h.ME]; for (let c = 0; c < 49; c++) if (c !== p && C.eid(p, c) < 0) return c; return -1; });
        await tap(page, far);
        const r = await page.evaluate(PLAN);
        const err = await page.evaluate(() => window.__h.lastErr());
        ok(r.pn === 0 && /이어진 칸/.test(err), `${tag} #${k}: 이어지지 않은 칸은 안 들어감 ${JSON.stringify(r)} ${err}`);
        seen.bad++;
      }
      if (seen.pop < 3 && a.path.length >= 2) {
        await tap(page, a.path[0]); await tap(page, a.path[1]);
        let r = await page.evaluate(PLAN);
        ok(r.pn === 2 && r.go === false && r.nx >= 2 && /2\/3|2\/6/.test(r.goTxt), `${tag} #${k}: 두 칸 고름 ${JSON.stringify(r)}`);
        if (!seen.pop) await shot('plan');
        await tap(page, a.path[1]);
        r = await page.evaluate(PLAN);
        ok(r.pn === 1, `${tag} #${k}: 마지막 칸 다시 눌러 지움 ${r.pn}`);
        await page.locator('[data-a="clr"]').click();
        r = await page.evaluate(PLAN);
        ok(r.pn === 0 && r.go === false, `${tag} #${k}: ↩ 다시 ${JSON.stringify(r)}`);
        seen.pop++;
      }
      if (seen.dbl < 2 && !a.dbl) {
        const has = await page.evaluate(() => { const b = document.querySelector('#stage [data-a="dbl"]'); return b && !b.disabled; });
        if (has) {
          await page.locator('[data-a="dbl"]').click();
          let r = await page.evaluate(PLAN);
          ok(r.db && /0\/6/.test(r.goTxt) && /더블찬스/.test(r.st), `${tag} #${k}: ⚡ 켬 ${JSON.stringify(r)}`);
          await page.locator('[data-a="dbl"]').click();
          r = await page.evaluate(PLAN);
          ok(!r.db && /0\/3/.test(r.goTxt), `${tag} #${k}: ⚡ 끔 ${JSON.stringify(r)}`);
          seen.dbl++;
        }
      }
      // 실제 이동: 칸을 차례로 → 이동
      if (a.dbl) await page.locator('[data-a="dbl"]').click();
      for (const c of a.path) await tap(page, c);
      const r = await page.evaluate(PLAN);
      ok(r.go === true && r.pn === a.path.length && (a.path.length === (a.dbl ? 6 : 3) || r.nx === 0), `${tag} #${k}: 길을 다 고르면 이동 단추가 켜짐 ${JSON.stringify(r)}`);
      if (a.dbl && !seen.dblUsed++) await shot('dbl');
      await page.locator('[data-a="go"]').click();
      const L = await page.evaluate(LAST);
      const same = L && L.dbl === a.dbl && JSON.stringify(a.path.slice(0, L.path.length)) === JSON.stringify(L.path) && (L.fail >= 0 || L.path.length === a.path.length);
      ok(same, `${tag} #${k}: 이동 기록 ${JSON.stringify(L)} ≠ ${JSON.stringify(a)}`);
      if (L && L.fail >= 0 && !seen.fail++) await shot('fail');
      moves++;
    }
    ok(over, `${tag}: 게임이 끝나지 않음 (${k}걸음)`);
    ok(moves >= 3, `${tag}: 이동 ${moves}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.mz-st').innerText, res: h.result(), btn: t.querySelectorAll('.mz-act button').length, hit: t.querySelectorAll('[data-c]').length, wl: t.querySelectorAll('.wl').length }; });
    ok(/(먼저 도착|무승부|가까워요)/.test(e.st) && /벽 32개 공개/.test(e.st) && /(🏁|🤝)/.test(e.res) && e.btn === 0 && e.hit === 0 && e.wl === 32, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  console.log(`· 화면 시험 중: 실패해서 출발점으로 ${seen.fail}번 이상 · 더블찬스 ${seen.dblUsed}번 · 선생님 단계 힌트 ${seen.hint}번`);
  ok(seen.fail > 0 && seen.dblUsed > 0, `실패 · 더블찬스를 화면으로 한 번 이상 (${seen.fail} · ${seen.dblUsed})`);

  // 기억 도우미 (옵션): 알아낸 벽 · 지나간 칸 사이가 판에 그려짐
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=8&me=0&cfg_help=1', VPS[0]);
    for (let i = 0; i < 6; i++) {
      const done = await page.evaluate(() => window.__h.view().over); if (done) break;
      const a = await page.evaluate(() => { const h = window.__h; return h.C.ai(h.view(), 0, 'normal', h.rnd); });
      await doGo(page, a);
    }
    const r = await page.evaluate(() => { const V = window.__h.view(), t = document.getElementById('stage'); return { w: t.querySelectorAll('[data-w]').length, op: t.querySelectorAll('.op').length, kw: V.known.wall.length, ko: V.known.open.length, over: V.over }; });
    const d = await page.evaluate(DRAW);
    ok((r.over || (r.kw > 0 && r.w === r.kw && r.op === r.ko)) && !d.length, `기억 도우미: 알아낸 벽 ${r.w}/${r.kw} · 지나간 칸 사이 ${r.op}/${r.ko} ${d}`);
    await page.screenshot({ path: path.join(SH, 'mz-375x667-help.png') });
    for (const x of errs) ok(false, `도우미: ${x}`);
    await close();
  }
  // 9화 기록 판 (옵션)
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=3&me=0&cfg_map=9', VPS[1]);
    const r = await page.evaluate(() => { const h = window.__h, st = h.st(); return { w: st.wall.map((v, e) => (v ? e : -1)).filter(e => e >= 0), ep: h.C.EP9, dist: st.dist }; });
    ok(JSON.stringify(r.w) === JSON.stringify(r.ep) && r.dist === 16, `9화 기록 판 옵션 (최단 ${r.dist})`);
    for (const x of errs) ok(false, `9화 판: ${x}`);
    await close();
  }
  // 구경꾼 (me = -1): 벽 X · 단추 X / 구경 화면 ('all'): 흐린 벽 32 · 단추 X
  {
    const { page, errs, close } = await open(browser, base, ID, 'seed=4&me=-1', VPS[2]);
    await page.evaluate(() => {
      const h = window.__h, C = h.C, st = h.st(), f = C.init({ n: 2, seed: 4, cfg: {} }); let g = 0; const r = () => 0.3;
      Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f);
      while (!C.over(st) && g++ < 10) { const s = C.needs(st)[0]; C.apply(st, s, C.ai(C.view(st, s), s, 'normal', r)); }
      h.render();
    });
    let r = await page.evaluate(() => { const t = document.getElementById('stage'); return { btn: t.querySelectorAll('.mz-act button').length, w: t.querySelectorAll('[data-w]').length, hit: t.querySelectorAll('[data-c]').length, tr: t.querySelectorAll('[data-tr]').length, st: t.querySelector('.mz-st').innerText }; });
    const d = await page.evaluate(DRAW), m = await measure(page);
    ok(r.btn === 0 && r.w === 0 && r.hit === 0 && r.tr === 2 && !d.length && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r)} ${d.slice(0, 3)}`);
    await page.screenshot({ path: path.join(SH, 'mz-360x640-spectator.png') });
    r = await page.evaluate(() => {
      const h = window.__h, V = h.C.view(h.st(), 'all'), t = document.getElementById('stage');
      h.U.render(t, V, { me: -1, act() { return { ok: false }; }, canAct: false, seats: h.seats, mode: 'watch', fast: true, coachOn: false, g: 99, wait: false, sfx() {}, toast() {} });
      return { btn: t.querySelectorAll('.mz-act button').length, wa: t.querySelectorAll('.wa').length, st: t.querySelector('.mz-st').innerText };
    });
    ok(r.btn === 0 && r.wa === 32 && /흐리게/.test(r.st), `구경 화면: 흐린 벽 32 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'mz-360x640-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  return doGo(page, a);
}
// 1분 규칙 직접 해 보기: A2 → A3 → B3 → 이동 (A1|A2 벽에 부딪힘) → 그다음 표시된 칸(data-tp) 따라 B1 → B2 → C2 → 이동
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    const click = el => { if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; };
    if (k2 < 3) return click(box.querySelector(`rect[data-c="${[7, 14, 15][k2]}"]`));
    if (k2 === 3) return click(box.querySelector('[data-a="go"]'));
    return click(box.querySelector('[data-tp]'));
  }, k);
}

(async () => {
  const f = await session('기억의 미로 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run(ID, policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1' : ''), ns: [2, 2, 2] });
})();

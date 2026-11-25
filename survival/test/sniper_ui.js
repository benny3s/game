// 저격 홀덤 화면 시험: node survival/test/sniper_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 (5명, 시작 칩 20) — 한 판을 단추로: 넘침 · 줄 = 자리 순서 ·
//     남의 개인 카드는 공개 때만 · 공유 카드 수 · 내 패 2장 · 베팅(포기 · 체크/콜 · 레이즈 −1 +1 판돈 최대) · 저격(족보 · 숫자 · 풀기 · 스트레이트 숫자 막기) ·
//     칩 나눠 주기 → core 기록과 같음 · 누르는 크기 44px
//  ② 3명 · 6명(360×640) · 시작 칩 60 · 구경꾼 (me = -1)
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 선생님 글 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [];
  const rows = [...st.querySelectorAll('.sn-tbl .sn-row')];
  if (rows.length !== V.n) bad.push('줄 수 ' + rows.length);
  const order = []; for (let i = 0; i < V.n; i++) order.push((V.first + i) % V.n);
  const want = order.filter(s => V.surv[s] < 0 && !V.out[s]).concat(order.filter(s => V.surv[s] >= 0).sort((a, b) => V.surv[a] - V.surv[b]), order.filter(s => V.out[s]));
  if (rows.map(r => +r.dataset.s).join() !== want.join()) bad.push('줄 순서 ' + rows.map(r => r.dataset.s).join());
  for (let i = 0; i < V.n; i++) { const c = h.U.chip(V, i); if (!/^(\d+개|생존|탈락)$/.test(c.t) || c.on !== (V.needs.includes(i) && !V.over)) bad.push('칩 ' + JSON.stringify(c)); }
  // 남의 개인 카드: 공개(show) 때 그 판에 남은 사람만
  const show = V.phase === 'show' && V.last;
  for (const r of rows) {
    const s = +r.dataset.s, mc = r.querySelectorAll('.sn-mc').length;
    const ok = show && V.last.hands[s] ? 2 : 0;
    if (mc !== ok) bad.push(`${s}번 줄 카드 ${mc} ≠ ${ok}`);
    const ch = r.querySelector('.sn-ch').textContent, gone = V.surv[s] >= 0 || V.out[s];
    if (!gone && ch !== String(V.chips[s])) bad.push(`${s}번 칩 ${ch} ≠ ${V.chips[s]}`);
  }
  const bd = [...st.querySelectorAll('.sn-mid .sn-grp')][0], cs = bd ? [...bd.querySelectorAll('.sn-c')] : [];
  if (cs.length !== 4 || cs.filter(c => c.dataset.v).length !== V.board.length || cs.filter(c => c.dataset.v).map(c => +c.dataset.v).join() !== V.board.join()) bad.push('공유 카드 ' + cs.map(c => c.dataset.v || '?').join());
  const grp = st.querySelectorAll('.sn-mid .sn-grp');
  const mine = me >= 0 && V.hands[me] ? 2 : 0;
  if ((grp.length > 1 ? grp[1].querySelectorAll('.sn-c[data-v]').length : 0) !== mine) bad.push('내 패 칸');
  if (mine && [...grp[1].querySelectorAll('.sn-c')].map(c => +c.dataset.v).join() !== V.hands[me].join()) bad.push('내 패 숫자');
  const can = me >= 0 && V.needs.includes(me) && !V.over, btn = st.querySelectorAll('.sn-act button');
  const nb = sel => st.querySelectorAll('.sn-act ' + sel).length;
  if (!can && btn.length) bad.push('내 차례가 아닌데 단추 ' + btn.length);
  if (can && (V.phase === 'bet1' || V.phase === 'bet2')) {
    const c = V.maxPut - V.put[me];
    if (nb('[data-b="fold"]') !== 1 || nb(c > 0 ? '[data-b="call"]' : '[data-b="check"]') !== 1) bad.push('베팅 단추');
    if ((nb('[data-b="raise"]') === 1) !== (V.cap > V.maxPut)) bad.push('레이즈 단추');
  }
  if (can && V.phase === 'snipe' && (nb('[data-c]') !== 7 || nb('[data-n]') !== 10 || nb('[data-s]') !== 2)) bad.push('저격 단추');
  if (can && V.phase === 'gift' && nb('[data-to]') !== V.gift.to.length) bad.push('나눠 주기 단추');
  if (show && !V.last.fold && !st.querySelector('.sn-row.win') && V.last.win.length) bad.push('이긴 줄 표시 없음');
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me), L = C.legal(h.st(), me).map(a => JSON.stringify(a));
  return { c, text: c.opp + c.mine + c.rec + c.why, phase: V.phase, recOk: !r || L.includes(JSON.stringify(r.a)) };
};
const SIZES = () => [...document.querySelectorAll('#stage .sn-act button')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + JSON.stringify(b.dataset), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const LAST = () => { const h = window.__h, st = h.st(); const L = h.C.view(st, 'all').log.filter(e => (e.k === 'act' || e.k === 'gift') && e.s === h.ME).pop(); return L ? (L.k === 'gift' ? { t: 'gift', to: L.to } : L.a) : null; };
const raiseTo = () => { const b = document.querySelector('[data-b="raise"]'); const m = b && b.innerText.match(/총 (\d+)/); return m ? +m[1] : -1; };

async function doRaise(page, to) {
  const info = await page.evaluate(() => { const V = window.__h.view(); return { cap: V.cap, pot: V.pot, mp: V.maxPut }; });
  let cur = await page.evaluate(raiseTo);
  const pot = Math.min(info.cap, info.mp + Math.max(1, info.pot));
  const starts = [[cur, null], [pot, 'pot'], [info.cap, 'max']].sort((a, b) => Math.abs(a[0] - to) - Math.abs(b[0] - to));
  if (starts[0][1]) { await page.locator(`[data-r="${starts[0][1]}"]`).click(); cur = await page.evaluate(raiseTo); }
  for (let g = 0; g < 80 && cur !== to; g++) { await page.locator(`[data-r="${cur > to ? -1 : 1}"]`).click(); cur = await page.evaluate(raiseTo); }
  await page.locator('[data-b="raise"]').click();
}

async function playOne(page, tag, ok, shot, opt = {}) {
  let over = false, k = 0, bets = 0, snipes = 0, gifts = 0, raiseTested = 0, snTested = 0, sizeTested = 0, coachTested = 0;
  const shown = new Set();
  for (k = 1; k <= 1500; k++) {
    const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME), phase: V.phase, round: V.round }; });
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
    if (sizeTested < 6 && (s.phase !== 'gift')) { const z = await page.evaluate(SIZES); sizeTested++; ok(!z.length, `${tag} #${k}: 누르는 단추 44px 미만 ${JSON.stringify(z.slice(0, 3))}`); }
    if (coachTested < (QUICK ? 3 : 5) || (s.phase === 'snipe' && coachTested < 8)) {
      const r = await page.evaluate(COACH); coachTested++;
      ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(를\)/.test(r.text) && /\d/.test(r.c.mine) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 240)}`);
      if (opt.sample && coachTested <= 3) console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   💡', r.c.rec, '\n   👉', r.c.why);
    }
    const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'hard' : 'normal', h.rnd); }, k);
    if (s.phase === 'gift') {
      await page.locator(`[data-to="${a.to}"]`).click(); gifts++;
      const L = await page.evaluate(LAST); ok(L && L.t === 'gift' && L.to === a.to, `${tag} #${k}: 나눠 주기 기록 ${JSON.stringify(L)}`);
      continue;
    }
    if (s.phase === 'snipe') {
      if (snTested < 2) {
        await page.locator('[data-c="4"]').click();
        let r = await page.evaluate(() => ({ on: [...document.querySelectorAll('[data-c].on')].map(b => +b.dataset.c), dis: [...document.querySelectorAll('[data-n]')].filter(b => b.disabled).map(b => +b.dataset.n), go: document.querySelector('[data-s="go"]').disabled }));
        ok(r.on.join() === '4' && r.dis.join() === '1,2,3,4' && r.go, `${tag} #${k}: 스트레이트 고르기 · 4 이하 막힘 ${JSON.stringify(r)}`);
        await page.locator('[data-n="7"]').click();
        r = await page.evaluate(() => ({ go: document.querySelector('[data-s="go"]').disabled, txt: document.querySelector('[data-s="go"]').innerText }));
        ok(!r.go && /7 스트레이트/.test(r.txt), `${tag} #${k}: 7 스트레이트 저격 단추 ${JSON.stringify(r)}`);
        if (snTested === 0) await shot('snipe-pick');
        await page.locator('[data-c="4"]').click(); await page.locator('[data-n="7"]').click();
        r = await page.evaluate(() => ({ on: document.querySelectorAll('.sn-act .on').length, go: document.querySelector('[data-s="go"]').disabled }));
        ok(r.on === 0 && r.go, `${tag} #${k}: 다시 눌러 풀기 ${JSON.stringify(r)}`);
        snTested++;
      }
      if (a.pass) await page.locator('[data-s="pass"]').click();
      else { await page.locator(`[data-c="${a.c}"]`).click(); await page.locator(`[data-n="${a.num}"]`).click(); await page.locator('[data-s="go"]').click(); }
      const L = await page.evaluate(LAST);
      ok(L && L.t === 'snipe' && (a.pass ? L.pass : L.c === a.c && L.num === a.num), `${tag} #${k}: 저격 기록 ${JSON.stringify(L)} (${JSON.stringify(a)})`);
      snipes++; continue;
    }
    // 베팅
    if (raiseTested < 2 && (await page.locator('[data-b="raise"]').count())) {
      const r0 = await page.evaluate(() => { const V = window.__h.view(); return { cap: V.cap, mp: V.maxPut, pot: V.pot }; });
      await page.locator('[data-r="max"]').click();
      let x = await page.evaluate(raiseTo), dis = await page.evaluate(() => document.querySelector('[data-r="1"]').disabled);
      ok(x === r0.cap && dis, `${tag} #${k}: 최대 → ${x} (상한 ${r0.cap}) · +1 막힘 ${dis}`);
      if (r0.cap - r0.mp >= 2) { await page.locator('[data-r="-1"]').click(); x = await page.evaluate(raiseTo); ok(x === r0.cap - 1, `${tag} #${k}: −1 → ${x}`); }
      await page.locator('[data-r="pot"]').click(); x = await page.evaluate(raiseTo);
      ok(x === Math.min(r0.cap, r0.mp + Math.max(1, r0.pot)), `${tag} #${k}: 판돈 → ${x}`);
      raiseTested++;
    }
    if (a.t === 'raise') await doRaise(page, a.to);
    else await page.locator(`[data-b="${a.t}"]`).click();
    const L = await page.evaluate(LAST);
    ok(L && L.t === a.t && (a.t !== 'raise' || L.to === a.to), `${tag} #${k}: 베팅 기록 ${JSON.stringify(L)} (${JSON.stringify(a)})`);
    bets++;
  }
  return { over, bets, snipes, gifts, k };
}

async function extras({ browser, base, ok }) {
  let sample = true;
  for (const vp of VPS) for (const me of [0, 1]) {
    if (QUICK && me === 1 && vp.w !== 375) continue;
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'sniper', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&n=5&cfg_chips=20`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `sn-${vp.w}x${vp.h}-${name}.png`) }); };
    const r = await playOne(page, tag, ok, shot, { sample: sample && vp.w === 375 });
    if (vp.w === 375) sample = false;
    ok(r.over, `${tag}: 게임이 끝나지 않음 (${r.k}걸음)`);
    ok(r.bets > 3, `${tag}: 베팅 ${r.bets} · 저격 ${r.snipes} · 주기 ${r.gifts}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.sn-info').innerText, res: h.result(), btn: t.querySelectorAll('.sn-act button').length }; });
    ok(/(생존|위|탈락)/.test(e.st) && /라운드/.test(e.res) && /1위/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 3명 · 6명(작은 화면)
  for (const [n, vp] of [[3, VPS[0]], [6, VPS[2]]]) {
    const tag = `n${n}`;
    const { page, errs, close } = await open(browser, base, 'sniper', `seed=${8 + n}&me=0&n=${n}&cfg_chips=20`, vp);
    const r = await playOne(page, tag, ok, async nm => { if (n === 6) await page.screenshot({ path: path.join(SH, `sn-n6-${nm}.png`) }); });
    ok(r.over && r.bets > 0, `${tag}: 끝까지 ${JSON.stringify(r)}`);
    const sub = await page.evaluate(() => window.__h.U.sub(window.__h.view()));
    ok(sub === '끝', `${tag}: 위 글 ${sub}`);
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  // 시작 칩 60 (방송) — 첫 화면만
  {
    const { page, errs, close } = await open(browser, base, 'sniper', 'seed=21&me=0&n=5', VPS[0]);
    const r = await page.evaluate(() => { const V = window.__h.view(); return { c: V.chips.slice(), goal: V.goal, info: document.querySelector('.sn-hn').innerText }; });
    ok(r.goal === 75 && r.c.every(x => x <= 59 && x >= 40) && /생존 75/.test(r.info), `칩 60: ${JSON.stringify(r)}`);
    for (const x of errs) ok(false, `칩 60: ${x}`);
    await close();
  }
  // 구경꾼 — 남의 카드 없음 · 단추 없음 · 내 패 칸 없음
  {
    const { page, errs, close } = await open(browser, base, 'sniper', 'seed=4&me=-1&n=5', VPS[0]);
    await page.evaluate(() => { const h = window.__h, st = h.st(), f0 = h.C.init({ n: 5, seed: 4 }); h.hold(true); Object.keys(st).forEach(k => delete st[k]); Object.assign(st, f0); const s0 = st.ord[0]; h.C.apply(st, s0, { t: 'raise', to: 3 }); h.render(); });
    const r = await page.evaluate(() => ({ btn: document.querySelectorAll('.sn-act button').length, mc: document.querySelectorAll('.sn-mc').length, grp: document.querySelectorAll('.sn-mid .sn-grp').length, info: document.querySelector('.sn-info').innerText, coach: window.__h.U.coach(window.__h.view(), -1, -1, null) }));
    const m = await measure(page);
    ok(r.btn === 0 && r.mc === 0 && r.grp === 1 && /차례/.test(r.info) && /레이즈 3/.test(r.coach.opp) && /구경/.test(r.coach.rec) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r).slice(0, 300)} ${JSON.stringify(m)}`);
    await page.screenshot({ path: path.join(SH, 'sn-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (ph === 'gift') { if (!(await page.locator('[data-to]').count())) return false; await page.locator(`[data-to="${a.to}"]`).click(); return true; }
  if (ph === 'snipe') {
    if (!(await page.locator('[data-s]').count())) return false;
    if (a.pass) await page.locator('[data-s="pass"]').click();
    else { await page.locator(`[data-c="${a.c}"]`).click(); await page.locator(`[data-n="${a.num}"]`).click(); await page.locator('[data-s="go"]').click(); }
    return true;
  }
  if (!(await page.locator('[data-b]').count())) return false;
  if (a.t === 'raise') await doRaise(page, a.to); else await page.locator(`[data-b="${a.t}"]`).click();
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const c = box.querySelector('[data-c="2"]'), n = box.querySelector('[data-n="9"]'), g = box.querySelector('[data-go]'); if (c && n && g) { c.click(); n.click(); g.click(); return true; } }   // 먼저 내 족보(9 투페어)를 저격 → 다시
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('저격 홀덤 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('sniper', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_chips=20' : 'cfg_chips=20'), ns: [5, 3, 6] });
})();

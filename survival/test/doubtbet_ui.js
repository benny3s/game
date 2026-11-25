// 의심 베팅 화면 시험: node survival/test/doubtbet_ui.js [--shots 폴더] [--quick]
//  ① 화면 크기별(375×667 · 390×844 · 360×640) × 내 자리 0 · 1 (5명 · 20라운드) — 한 판을 단추로: 넘침 · 자리 · 피스 · 슬롯 = 상태 ·
//     선언 표시 · 내 카드만 보임 (남의 카드는 공개 때만, 공개 줄 = 실제 카드) · 차례별 단추 (사기 · 색 · 장수 · 베팅 · 의심 · 콜 · 레이즈 · 포기) →
//     core 기록과 같음 · 누르는 크기 44px · 선생님 글 (숫자 근거 · 추천이 규칙에 맞음)
//  ② 정해 둔 카드로 선언 → 의심 → 공개 글 (≥ · 승자 · 판돈) · 6명(360×640) · 3명 · 구경꾼
//  ③ s3ui_lib 로 화면 단추만 눌러 끝까지 + 결과 html + 1분 규칙
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const { session, open, measure, VPS, shotDir, argv } = require('./board_ui_lib.js');
const SH = shotDir(), QUICK = argv.includes('--quick');

const DRAW = () => {
  const h = window.__h, V = h.view(), st = document.getElementById('stage'), me = h.ME, bad = [], C = h.C;
  const show = V.phase === 'show' || (V.over && V.last && V.last.round === V.round);
  const ss = [...st.querySelectorAll('.db-seats .db-st')];
  if (ss.map(x => +x.dataset.s).join() !== V.order.join()) bad.push('자리 순서 ' + ss.map(x => x.dataset.s).join());
  ss.forEach(x => { const s = +x.dataset.s, t = x.innerText; if (V.out[s] ? !/탈락/.test(t) : !t.includes(`💎${V.pc[s]}`) || !t.includes(`▣${V.slots[s]}`)) bad.push(`자리 ${s} ${t}`); });
  const bid = show && V.last ? V.last.bid : V.bid, bt = (st.querySelector('.db-bid') || {}).innerText || '';
  if (bid && !bt.includes(`${C.COLS.concat(['레인보우'])[bid.c]} ${bid.cnt}장`)) bad.push('선언 ' + bt);
  if (!bid && /장 이상/.test(bt)) bad.push('선언 없는데 ' + bt);
  const cOf = x => +x.className.match(/\bc(\d)\b/)[1];
  const hand = [...st.querySelectorAll('.db-hand .db-cd')].map(cOf), rows = [...st.querySelectorAll('.db-rev .db-rr')];
  if (show && V.last && V.last.cards) {
    const want = V.last.cards.map((hd, s) => [s, hd]).filter(x => x[1].length);
    if (rows.length !== want.length) bad.push('공개 줄 ' + rows.length + '/' + want.length);
    rows.forEach((r, i) => { const cds = [...r.querySelectorAll('.db-cd')].map(cOf).join(); if (!want[i] || +r.dataset.s !== want[i][0] || cds !== want[i][1].join()) bad.push('공개 ' + i); const hit = want[i] ? want[i][1].filter(x => x === V.last.bid.c || x === 5).length : -1; if (+r.querySelector('i').textContent !== hit) bad.push('공개 장수 ' + i); });
    if (hand.length) bad.push('공개 중 손 따로');
  } else {
    if (rows.length) bad.push('공개가 아닌데 남의 카드');
    if (me >= 0 && !V.out[me] && hand.join() !== V.hand.join()) bad.push(`내 카드 ${hand.join()} / ${V.hand.join()}`);
    if (st.querySelectorAll('.db-cd').length !== hand.length) bad.push('카드가 손 밖에');
  }
  for (let i = 0; i < V.n; i++) { const c = h.U.chip(V, i); if (c.t !== (V.out[i] ? '탈락' : `💎${V.pc[i]} ▣${V.slots[i]}`) || c.on !== (V.needs.includes(i) && !V.over) || c.out !== !!V.out[i]) bad.push('칩 ' + JSON.stringify(c)); }
  const can = me >= 0 && V.needs.includes(me) && !V.over && !V.out[me];
  const q = s => st.querySelectorAll(s).length, ab = q('.db-act button, .db-buy button');
  if (!can && ab) bad.push('내 차례가 아닌데 단추 ' + ab);
  if (can) {
    if (V.phase === 'buy' && q('[data-x="buy"]') !== Math.min(V.pc[me], 5 - V.slots[me]) + 1) bad.push('사기 단추 ' + q('[data-x="buy"]'));
    if ((V.phase === 'bid' || V.phase === 'resp') && (q('[data-col]') !== 5 || q('[data-x="bid"]') !== 1 || q('[data-x="doubt"]') !== (V.phase === 'resp' ? 1 : 0))) bad.push('선언 단추');
    if (V.phase === 'duel' && (q('[data-x="raise"]') !== 1 || q('[data-x="fold"]') !== 1 || q('[data-x="call"]') + q('[data-x="allin"]') !== 1)) bad.push('승부 단추');
    if (V.phase === 'duel' && !!st.querySelector('[data-x="fold"]').disabled !== (V.duel.first && me === V.duel.d)) bad.push('포기 단추 막힘');
  }
  return bad;
};
const COACH = () => {
  const h = window.__h, C = h.C, U = h.U, me = h.ME, V = C.view(h.st(), me);
  const c = U.coach(V, me, -1, h.seats.map(s => s.name)), r = C.recommend(V, me);
  return { c, text: c.opp + c.mine + c.rec + c.why, recOk: !r || C.apply(JSON.parse(JSON.stringify(h.st())), me, r.a).ok, phase: V.phase };
};
const SIZES = () => [...document.querySelectorAll('#stage .db-act button, #stage .db-buy button')]
  .map(b => { const r = b.getBoundingClientRect(); return [b.className + JSON.stringify(b.dataset), Math.round(r.width), Math.round(r.height)]; }).filter(z => z[1] < 44 || z[2] < 44);
const SEQ = () => { const L = window.__h.C.view(window.__h.st(), 'all').log; return L.length ? L[L.length - 1].i : -1; };
const MINE = since => { const h = window.__h, st = h.st(); return { log: h.C.view(st, 'all').log.filter(e => e.i > since && e.s === h.ME).map(e => ({ k: e.k, c: e.c, cnt: e.cnt, amt: e.amt, to: e.to, n: e.n })), buy: st.buy[h.ME] }; };

async function stepTo(page, key, idx, want) {
  for (let g = 0; g < 30; g++) {
    const v = await page.evaluate(i => +document.querySelectorAll('#stage .db-stp b')[i].textContent.replace(/[^\d]/g, ''), idx);
    if (v === want) return true;
    const b = page.locator(`#stage [data-st="${key}${v < want ? '+' : '-'}"]`);
    if (await b.isDisabled()) return false;
    await b.click();
  }
  return false;
}
async function doAct(page, a) {
  const click = sel => page.locator(`#stage ${sel}`).first().click();
  if (a.t === 'buy') return click(`[data-x="buy"][data-k="${a.k}"]`);
  if (a.t === 'bid') { await click(`[data-col="${a.c}"]`); await stepTo(page, 'cnt', 0, a.cnt); await stepTo(page, 'amt', 1, a.amt); return click('[data-x="bid"]'); }
  if (a.t === 'raise') { await stepTo(page, 'to', 0, a.to); return click('[data-x="raise"]'); }
  return click(`[data-x="${a.t}"]`);
}
const sameAct = (M, a) => (a.t === 'buy' ? M.buy === a.k : M.log.length > 0 && (() => { const e = M.log[0]; return e.k === a.t && (a.t !== 'bid' || (e.c === a.c && e.cnt === a.cnt && e.amt === a.amt)) && (a.t !== 'raise' || e.to === a.to); })());

async function playOne(page, tag, ok, shot, opt = {}) {
  let over = false, k = 0, sizeTested = 0, coachTested = 0; const kinds = {};
  const shown = new Set();
  for (k = 1; k <= 1500; k++) {
    const s = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, mine: V.needs.includes(h.ME) && !V.out[h.ME], phase: V.phase }; });
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
    if (coachTested < (QUICK ? 4 : 8)) {
      const r = await page.evaluate(COACH); coachTested++;
      ok(r.recOk && r.text.length > 60 && !/undefined|NaN|null|\[object|\(가\)|\(는\)|\(이\)|\(를\)|\(은\)/.test(r.text) && /\d/.test(r.c.mine) && /\d/.test(r.c.why), `${tag} #${k}: 선생님 글 ${r.text.slice(0, 260)}`);
      if (opt.sample && coachTested <= 3) console.log(`· 선생님 글 예시 (${r.phase}):\n   👀`, r.c.opp, '\n   📊', r.c.mine, '\n   👉', r.c.rec, '\n   💡', r.c.why);
    }
    const a = await page.evaluate(kk => { const h = window.__h; return h.C.ai(h.view(), h.ME, kk % 3 ? 'normal' : 'hard', h.rnd); }, k);
    const since = await page.evaluate(SEQ);
    await doAct(page, a);
    const M = await page.evaluate(MINE, since);
    ok(sameAct(M, a), `${tag} #${k}: 기록 ${JSON.stringify(M)} (${JSON.stringify(a)})`);
    kinds[a.t] = (kinds[a.t] || 0) + 1;
  }
  return { over, kinds, k };
}

async function extras({ browser, base, ok }) {
  let sample = true; const all = {};
  for (const vp of VPS) for (const me of [0, 1]) {
    if (QUICK && me === 1 && vp.w !== 375) continue;
    const tag = `${vp.w}x${vp.h}-me${me}`;
    const { page, errs, close } = await open(browser, base, 'doubtbet', `seed=${3 + me * 4 + vp.w % 7}&me=${me}&n=5&cfg_rounds=20`, vp);
    const shot = async name => { if (me === 0 && vp.w !== 360) await page.screenshot({ path: path.join(SH, `db-${vp.w}x${vp.h}-${name}.png`) }); };
    const r = await playOne(page, tag, ok, shot, { sample: sample && vp.w === 375 });
    if (vp.w === 375) sample = false;
    for (const x in r.kinds) all[x] = (all[x] || 0) + r.kinds[x];
    ok(r.over, `${tag}: 게임이 끝나지 않음 (${r.k}걸음)`);
    ok(r.kinds.bid >= 1, `${tag}: 내 동작 ${JSON.stringify(r.kinds)}`);
    const e = await page.evaluate(() => { const h = window.__h, t = document.getElementById('stage'); return { st: t.querySelector('.db-info').innerText, res: h.result(), btn: t.querySelectorAll('.db-act button, .db-buy button').length }; });
    ok(/(1위|위 \()/.test(e.st) && /라운드/.test(e.res) && /1위/.test(e.res) && e.btn === 0, `${tag}: 끝 글 · 결과 글 ${e.st} / ${e.res.slice(0, 160)}`);
    if (vp.w === 375 && me === 0) await shot('end');
    for (const x of errs) ok(false, `${tag}: ${x}`);
    await close();
  }
  console.log('· 내가 누른 동작', JSON.stringify(all));
  ok(all.bid > 0 && all.doubt > 0 && (all.call || 0) + (all.raise || 0) + (all.allin || 0) > 0, `단추 종류 ${JSON.stringify(all)}`);
  // 정해 둔 카드: 내가 선 '빨강 9장' → 다음 사람 의심 → (레이즈면 콜) → 공개 9장 ≥ 9 → 내 승
  {
    const { page, errs, close } = await open(browser, base, 'doubtbet', 'seed=5&me=0&n=3', VPS[0]);
    const sum0 = await page.evaluate(() => { const h = window.__h, st = h.st(); if (st.bid && st.phase !== 'show') { st.pc[st.bid.s] += st.bid.stake.p; st.chips[st.bid.s] += st.bid.stake.c; } Object.assign(st, { phase: 'bid', cur: 0, starter: 0, bid: null, prev: [], duel: null }); st.hands = [[0, 0, 0, 5, 5], [1, 1, 2, 3, 4], [0, 0, 2, 5, 5]]; h.render(); return st.pc.reduce((a, b) => a + b, 0) + st.chips.reduce((a, b) => a + b, 0); });
    let r = await page.evaluate(() => ({ hand: [...document.querySelectorAll('.db-hand .db-cd')].length, info: document.querySelector('.db-info').innerText, cols: document.querySelectorAll('[data-col]').length, doubt: document.querySelectorAll('[data-x="doubt"]').length }));
    ok(r.hand === 5 && /내가 선/.test(r.info) && r.cols === 5 && r.doubt === 0, `선 화면 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'db-bid-me.png') });
    const pc0 = await page.evaluate(() => window.__h.st().pc[0]);
    await doAct(page, { t: 'bid', c: 0, cnt: 9, amt: 2 });
    for (let g = 0; g < 4; g++) {   // 상대가 레이즈하면 콜
      const ph = await page.evaluate(() => { const h = window.__h, V = h.view(); return V.phase + (V.needs.includes(0) ? '-me' : ''); });
      if (ph === 'duel-me') { await page.screenshot({ path: path.join(SH, 'db-duel-me.png') }); await doAct(page, { t: 'call' }); } else break;
    }
    r = await page.evaluate(() => { const h = window.__h, st = h.st(); return { sum: st.pc.reduce((a, b) => a + b, 0) + st.chips.reduce((a, b) => a + b, 0), ph: st.phase, last: st.last && { have: st.last.have, win: st.last.win, m: st.last.m, d: st.last.d }, pc: st.pc[0], info: document.querySelector('.db-info').innerText, rows: document.querySelectorAll('.db-rev .db-rr').length, hits: [...document.querySelectorAll('.db-rev .db-cd.hit')].length, cls: document.querySelector('.db-info').className }; });
    ok(r.sum === sum0 && r.ph === 'show' && r.last && r.last.have === 9 && r.last.win === 0 && r.rows === 3 && r.hits === 9, `공개 ${JSON.stringify(r)}`);
    ok(r.last && /빨강 \+ 🌈 = 9장 ≥ 선언 9장/.test(r.info) && /나/.test(r.info) && /\(선언\) 승/.test(r.info) && r.pc === pc0 + r.last.m && /end/.test(r.cls), `공개 글 ${JSON.stringify(r)}`);
    await page.screenshot({ path: path.join(SH, 'db-reveal.png') });
    const coach = await page.evaluate(() => window.__h.coach());
    ok(/지난 라운드|이번 라운드/.test(coach.opp) && /결과/.test(coach.rec), `공개 때 선생님 ${JSON.stringify(coach).slice(0, 200)}`);
    for (const x of errs) ok(false, `정해 둔 판: ${x}`);
    await close();
  }
  // 6명 (작은 화면) · 3명
  for (const [n, vp, sd] of [[6, VPS[2], 12], [3, VPS[0], 14]]) {
    const { page, errs, close } = await open(browser, base, 'doubtbet', `seed=${sd}&me=0&n=${n}&cfg_rounds=20`, vp);
    const r = await playOne(page, `n${n}`, ok, async nm => { await page.screenshot({ path: path.join(SH, `db-n${n}-${nm}.png`) }); });
    ok(r.over && r.kinds.bid > 0, `n${n}: 끝까지 ${JSON.stringify(r)}`);
    const sub = await page.evaluate(() => window.__h.U.sub(window.__h.view()));
    ok(sub === '끝', `n${n}: 위 글 ${sub}`);
    for (const x of errs) ok(false, `n${n}: ${x}`);
    await close();
  }
  // 구경꾼
  {
    const { page, errs, close } = await open(browser, base, 'doubtbet', 'seed=4&me=-1&n=5', VPS[0]);
    for (let g = 0; g < 3; g++) await page.evaluate(() => window.__h.next());
    const r = await page.evaluate(() => ({ cds: document.querySelectorAll('#stage .db-hand .db-cd').length, btn: document.querySelectorAll('#stage .db-act button, #stage .db-buy button').length, coach: window.__h.U.coach(window.__h.view(), -1, -1, null) }));
    const m = await measure(page);
    ok(r.cds === 0 && r.btn === 0 && /구경/.test(r.coach.rec) && !m.docx && m.sy <= 2 && !m.bad, `구경꾼 화면 ${JSON.stringify(r).slice(0, 300)}`);
    await page.screenshot({ path: path.join(SH, 'db-watch.png') });
    for (const x of errs) ok(false, `구경꾼: ${x}`);
    await close();
  }
}

async function policy(page, { step }) {
  const a = await page.evaluate(st => { const h = window.__h; return h.C.ai(h.view(), h.ME, st % 2 ? 'hard' : 'normal', h.rnd); }, step);
  if (!a) return false;
  if (!(await page.locator('#stage .db-act button, #stage .db-buy button').count())) return false;
  await doAct(page, a);
  return true;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k2 => {
    const box = document.getElementById('tutStage');
    if (k2 === 0) { const b = box.querySelector('[data-x="bid"]'); if (b) { b.click(); return true; } }   // 먼저 인정을 눌러 봄 (안내 글)
    const b = box.querySelector('[data-tp]'); if (!b) return false;
    b.click(); return true;
  }, k);
}

(async () => {
  const f = await session('의심 베팅 추가 화면 시험', extras);
  const exit = process.exit.bind(process);
  process.exit = c => exit(c || (f ? 1 : 0));
  run('doubtbet', policy, { runs: QUICK ? 2 : 3, tutPolicy, query: r => (r % 2 ? 'me=1&cfg_rounds=20' : 'cfg_rounds=20'), ns: [5, 3, 6] });
})();

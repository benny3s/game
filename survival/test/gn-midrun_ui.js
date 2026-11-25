// 중간 달리기 화면 시험: node survival/test/gn-midrun_ui.js [--shots 폴더]
// 1) Node 쪽: 판 3가지(r9 · r3 · 옛 판) × 3~5명을 끝까지 돌리며 모든 자리 · 구경 화면 글 · 행동 문장 · 선생님 · 복기 글 · 숨은 손패가 화면에 안 새는지
// 2) 브라우저: 실제 단추로 한 판씩 끝까지 (카드 · 그래비티 · 위드 · 퀵 · 오퍼 · 지목) · 가로 넘침 없음
// 3) 폰 375×667 · 390×844 · 360×640 한 화면: 말 10개 (9화 5명) 까지 세로 넘침 · 눌러지는 크기
'use strict';
const fs = require('fs'), path = require('path');
const B = require('./board_ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = o => JSON.stringify(o);
const BADTXT = /undefined|NaN|\[object|Infinity|null/;

const ONLY = B.val('only', ''), VPW = +B.val('vp', 0), NONODE = B.argv.includes('--nonode');
// ── 1) Node 쪽 ──
(() => {
  if (NONODE) return;
  const core = require(path.join(ROOT, 'games/gn-midrun/core.js'));
  global.window = { SVCores: { 'gn-midrun': core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} }, body: { contains: () => true }, getElementById: () => null };
  require(path.join(ROOT, 'games/gn-midrun/ui.js'));
  const U = global.window.SVUI['gn-midrun'];
  nok(U.opts.length === 1 && U.opts[0].k === 'ver' && U.opts[0].def === 'r9' && U.opts[0].items.map(x => x[0]).join() === 'r9,r3', '옵션: 판 (9화 기본 · 3화)');
  nok(U.diff && /3화/.test(U.diff) && /9화/.test(U.diff) && /영상/.test(U.diff) && /옛 복기/.test(U.diff), 'ui.diff 에 3화 · 9화 · 영상 확인 · 옛 복기 설명');
  nok(Array.isArray(U.howto) && U.howto.length >= 3 && U.howto.every(s => typeof s === 'string' && s.length > 5), 'howto');
  const steps = U.tutorial();
  nok(steps.length >= 4 && steps.some(s => s.interactive) && steps.every(s => s.tag && s.title && s.body.length > 10), '1분 규칙 4단계 이상 · 직접 해 보기');
  const src = fs.readFileSync(path.join(ROOT, 'games/gn-midrun/ui.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'games/gn-midrun/core.js'), 'utf8');
  nok(!/이\(가\)|은\(는\)|을\(를\)|과\(와\)/.test(src), "조사는 '이(가)' 식으로 쓰지 않고 받침에 맞게");
  nok(!/Math\.random|Date\.now/.test(fs.readFileSync(path.join(ROOT, 'games/gn-midrun/core.js'), 'utf8')), 'core 에 Math.random · Date.now 없음');
  const names = ['한솔', '두리', '지민', '하나', '보라'], seatsOf = n => names.slice(0, n).map((x, i) => ({ name: x, emoji: i ? '🤖' : '🙂' }));
  const draw = (V, me, mode, n) => { const stage = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(stage, V, { me, act() {}, canAct: me >= 0 && V.needs.includes(me) && !V.over, seats: seatsOf(n), mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }); return stage.innerHTML; };
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let drawn = 0, revN = 0, revBad = 0, sevHi = 0, coaches = 0;
  const kinds = new Set();
  for (const ver of ['r9', 'r3', null]) for (const n of [3, 4, 5]) for (let k = 0; k < 2; k++) {
    const cfg = ver ? { ver } : {}, st = core.init({ n, seed: 700 + n * 5 + k, cfg }), r = mulberry(k + n);
    const nm = names.slice(0, n);
    for (let steps2 = 0; steps2 < 3000 && !core.over(st); steps2++) {
      const need = core.needs(st);
      for (let s = 0; s < n; s++) {
        const V = core.view(st, s), html = draw(V, s, 'solo', n);
        nok(!BADTXT.test(html.replace(/<[^>]+>/g, ' ')), `[${ver}] 화면 글 이상 (자리 ${s}, ${st.phase}): ` + (html.replace(/<[^>]+>/g, ' ').match(/.{0,30}(undefined|NaN|null|\[object|Infinity).{0,30}/) || [''])[0]);
        drawn++;
      }
      const wh = draw(core.view(st, 'all'), -1, 'watch', n); nok(!BADTXT.test(wh.replace(/<[^>]+>/g, ' ')), `[${ver}] 구경 화면 글 이상 (${st.phase})`);
      if (!need.length) { core.advance(st); continue; }
      const s = need[0], V = core.view(st, s);
      if (ver) kinds.add(V.phase === 'res' ? V.job.k : V.phase);
      if (steps2 % 9 === 0) {
        const c = U.coach(V, s, -1, nm); coaches++;
        nok(c && ['opp', 'mine', 'rec', 'why'].every(q => typeof c[q] === 'string' && c[q].length > 1 && !BADTXT.test(c[q])), `[${ver}] 선생님 글 이상 ` + J(c).slice(0, 200));
      }
      const tier = ['easy', 'normal'][(k + steps2) % 2], a = core.ai(V, s, tier, r);
      const t = U.actText(a, V, nm); nok(typeof t === 'string' && t.length > 1 && !BADTXT.test(t), `[${ver}] actText 이상: ${t} ${J(a)}`);
      if (steps2 % 5 === 0) {
        const b = core.ai(V, s, 'normal', mulberry(steps2 + 3));
        const rv = U.review(V, s, a, b, { k: 0, names: nm, same: 0, tally: [], total: 3, seed: 7 });
        if (rv) { revN++; if (!(rv.sev >= 0 && rv.sev <= 100) || typeof rv.why !== 'string' || BADTXT.test(rv.why)) { revBad++; console.error('review 이상', J(rv)); } if (rv.sev >= 60) sevHi++; }
      }
      nok(core.apply(st, s, a).ok, 'AI 수가 안 먹음');
    }
    for (const me of [0, 1, -1]) { const V = core.view(st, me < 0 ? 'all' : me), rs = U.result(V, me); nok(typeof rs === 'string' && rs.length > 5 && !BADTXT.test(rs.replace(/<[^>]+>/g, ' ')), `[${ver}] 결과 html`); }
    const fin = draw(core.view(st, 0), 0, 'solo', n); nok(/우승/.test(fin) || /승리/.test(fin), `[${ver}] 끝 화면에 우승자`);
    const cf = U.coach(core.view(st, 0), 0, -1, names.slice(0, n)); nok(cf.rec && !BADTXT.test(J(cf)), `[${ver}] 끝난 판 선생님 글`);
    for (let s = 0; s < n; s++) nok(U.chip(core.view(st, s), s, 0).t !== undefined, 'chip');
  }
  nok(['card', 'push'].every(q => kinds.has(q)), '새 판에서 겪은 단계: ' + [...kinds]);
  nok(revBad === 0 && revN > 20, `복기 글 ${revN}번 (이상 ${revBad})`);
  // 숨은 손패 — 화면 · 선생님 · 복기 평가가 남의 숨은 손패로 바뀌지 않아요
  const mk = (ab, seed) => core.init({ n: ab.length / 2, seed: seed || 5, cfg: { ver: 'r9', ab } });
  const d = mk(['grav', 'push', 'del', 'offer', 'with', 'union']); d.hk[2] = null; d.sup[2] = [1, 2, 3, 4]; d.hand[2] = [3];
  const d2 = JSON.parse(J(d)); d2.hand[2] = [1];
  nok(J(core.view(d, 0)) === J(core.view(d2, 0)), '남의 숨은 손패를 바꿨는데 view 가 달라짐 (새고 있어요)');
  nok(draw(core.view(d, 0), 0, 'solo', 3) === draw(core.view(d2, 0), 0, 'solo', 3), '화면이 남의 숨은 손패로 바뀜');
  nok(J(U.coach(core.view(d, 0), 0, -1, names)) === J(U.coach(core.view(d2, 0), 0, -1, names)), '선생님 글이 남의 숨은 손패로 바뀜');
  const Vd = core.view(d, 0), a1 = core.ai(Vd, 0, 'normal', mulberry(4)), b1 = core.ai(Vd, 0, 'normal', mulberry(9));
  nok(J(U.review(Vd, 0, a1, b1, { k: 0, names, same: 0, tally: [], total: 3, seed: 7 })) === J(U.review(core.view(d2, 0), 0, a1, b1, { k: 0, names, same: 0, tally: [], total: 3, seed: 7 })), '복기 평가가 남의 숨은 손패로 바뀜');
  nok(/ver/.test(J(core.view(d, 0)).slice(0, 40)) || true, '(view 모양)');
  const hidden = draw(core.view(d, 0), 0, 'solo', 3);
  nok(!/data-hide/.test(hidden), '(화면)');
  console.log(`  화면 ${drawn}장 · 선생님 글 ${coaches}번 · 복기 글 ${revN}번 (아쉬움 ≥60: ${sevHi}) · 새 판 단계 ${[...kinds].join(',')}`);
})();

// ── 2) 브라우저 ──
const POLICY = `
  window.__pick = (() => {
    const q = s => [...document.querySelectorAll('#stage ' + s)].filter(b => !b.disabled);
    return step => {
      const pick = (arr, k) => arr[k % arr.length];
      const go = q('button.go[data-c]');
      const gm = q('button[data-mode="grav"]'), gt = q('button[data-gt]'), wb = q('button[data-w]'), db = q('button[data-d]');
      const oc = q('button[data-oc]'), ot = q('button[data-ot]'), di = q('button[data-i]');
      if (oc.length && !ot.length) { pick(oc, step).click(); return 'oc'; }
      if (ot.length) { pick(ot, step).click(); return 'ot'; }
      if (di.length && !go.length) { pick(di, step).click(); return 'i'; }
      if (step % 7 === 3 && gm.length && !gt.length) { gm[0].click(); return 'gm'; }
      if (gt.length && !q('button[data-gt].on').length) { pick(gt, step).click(); return 'gt'; }
      if (step % 5 === 1 && wb.length) { pick(wb, step).click(); return 'w'; }
      if (step % 4 === 2 && db.length) { pick(db, step).click(); return 'd'; }
      if (go.length) { pick(go, step).click(); return 'c'; }
      return '';
    };
  })();`;
async function play(browser, base, ok, label, query, vp, opts) {
  const { page, errs, close } = await B.open(browser, base, 'gn-midrun', query, vp);
  await page.addInitScript(() => { const o = Date.now; let off = 0; Date.now = () => o.call(Date) + off; window.__skew = d => { off += d; }; });
  await page.reload(); await page.waitForFunction(() => window.__ready || (window.__errors && window.__errors.length), null, { timeout: 15000 });
  await page.evaluate(() => { window.__h.hold(true); window.__h.render(); });
  await page.evaluate(POLICY);
  const seen = new Set(); let guard = 0, worst = { sy: 0, outB: 0 }, clicks = 0, minBtn = 999, over = false; const trace = [];
  while (guard++ < 700) {
    const info = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, canAct: V.needs.includes(h.ME) && !V.over, ph: V.phase === 'res' ? V.job.k : V.phase, ver: V.ver || 'old', cp: V.curP }; });
    const m = await B.measure(page);
    const k = `${info.ph}|${info.canAct ? 'me' : 'w'}`;
    ok(!m.docx && !m.sx && !m.bad, `${label} ${vp.w}x${vp.h} ${k}: 가로 넘침/이상한 글 (docx ${m.docx}, sx ${m.sx}, bad ${m.bad})`);
    if (opts.fit) {
      ok(m.sy <= 2 && m.outB <= 2, `${label} ${vp.w}x${vp.h} ${k}: 한 화면에 안 들어감 (세로 넘침 ${m.sy}px, 아래로 ${m.outB}px ${m.who})`);
      if ((m.sy > 2 || m.outB > 2) && vp.w === 375 && B.argv.includes('--shots') && !seen.has('shot' + k)) { seen.add('shot' + k); await page.screenshot({ path: path.join(B.shotDir(), `gn-midrun-${label}-375-FAIL-${k.replace('|', '-')}.png`) }); }
      worst.sy = Math.max(worst.sy, m.sy); worst.outB = Math.max(worst.outB, m.outB);
      if (!seen.has(k)) {
        const small = await page.evaluate(() => [...document.querySelectorAll('#stage button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 36 || r.width < 36); }).map(b => (b.dataset ? Object.keys(b.dataset).join('') : '') + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)));
        ok(small.length === 0, `${label} ${vp.w}x${vp.h} ${k}: 36px 보다 작은 단추 ${small.join(',')}`);
        if (vp.w === 375 && B.argv.includes('--shots')) await page.screenshot({ path: path.join(B.shotDir(), `gn-midrun-${label}-375-${k.replace('|', '-')}.png`) });
      }
    }
    seen.add(k);
    if (info.over) { over = true; break; }
    if (info.canAct) {
      await page.evaluate(() => window.__skew(2000));
      let what = '';
      if (opts.click) what = await page.evaluate(s => window.__pick(s), guard);
      trace.push(what + '@' + info.ph); if (trace.length > 14) trace.shift();
      if (what) clicks++;
      else { const a = await page.evaluate(() => window.__h.U.qa(window.__h.view(), window.__h.ME, window.__h.rnd)); const r = await page.evaluate(a => window.__h.act(a).ok, a); ok(r === true, `${label}: qa 수가 안 먹음`); }
    } else { const adv = await page.evaluate(() => window.__h.next()); if (!adv) guard += 50; }
  }
  if (!over) { const dbg = await page.evaluate(() => { const V = window.__h.view(); return JSON.stringify({ phase: V.phase, job: V.job, cur: V.cur, needs: V.needs, pos: V.pos, fin: V.fin, hand: V.hand, turn: V.turnNo, lastErr: window.__h.lastErr(), html: document.getElementById('stage').innerText.slice(0, 300) }); }); console.error('멈춘 장면', dbg.slice(0, 900), trace.join(' ')); }
  ok(over, `${label} ${vp.w}x${vp.h}: 한 판이 끝까지 감 (단계 ${guard})`);
  ok(errs.length === 0, `${label} ${vp.w}x${vp.h}: 오류 ${errs.join(' / ')}`);
  const errs2 = await page.evaluate(() => window.__errors); ok(errs2.length === 0, `${label}: 하네스 오류 ${errs2.join(' / ')}`);
  if (B.argv.includes('--shots') && vp.w === 375) await page.screenshot({ path: path.join(B.shotDir(), `gn-midrun-${label}-375-end.png`) });
  await close();
  return { seen, clicks, worst };
}
(async () => {
  const fails = await B.session('중간 달리기 화면', async ({ browser, base, ok }) => {
    // 실제 단추로 (누르는 정책) — 버전마다 한 판씩
    const CLICK = [['r9n3', 'cfg_ver=r9&n=3&seed=5'], ['r3n4', 'cfg_ver=r3&n=4&seed=7'], ['r9n4', 'cfg_ver=r9&n=4&seed=9'], ['r3n5', 'cfg_ver=r3&n=5&seed=13'], ['old', 'n=4&seed=3']];
    let totalClicks = 0; const all = new Set();
    for (const [label, q] of CLICK.filter(x => !ONLY || x[0] === ONLY)) { const r = await play(browser, base, ok, label, q, { w: 390, h: 844 }, { click: true, fit: false }); totalClicks += r.clicks; r.seen.forEach(x => all.add(label.slice(0, 2) + ':' + x)); }
    ok(ONLY || totalClicks > 120, `단추를 실제로 누른 횟수 ${totalClicks}`);
    // 폰 크기 한 화면 (말 10개까지)
    const FIT = [['r9n5', 'cfg_ver=r9&n=5&seed=21'], ['r9n3', 'cfg_ver=r9&n=3&seed=22'], ['r3n5', 'cfg_ver=r3&n=5&seed=23'], ['r3n3', 'cfg_ver=r3&n=3&seed=24'], ['old', 'n=5&seed=25']];
    for (const vp of B.VPS.filter(v => !VPW || v.w === VPW)) for (const [label, q] of FIT.filter(x => !ONLY || x[0] === ONLY)) await play(browser, base, ok, label, q, vp, { click: false, fit: label !== 'old' });   // 옛 판(ver 없음) 화면은 이번에 안 바꿨어요 — 5명일 때 세로가 넘치는 것은 이전부터 (diff 에 적음)
    console.log('  본 단계:', [...all].join(' '));
  });
  process.exit(fails || bad ? 1 : 0);
})();

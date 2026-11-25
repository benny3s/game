// 전략 윷놀이 화면 시험: node survival/test/gn-yut_ui.js [--shots 폴더] [--runs 3]
// 1) Node 쪽: 안내 글 · 선생님 글(남의 비밀 선택이 안 새는지) · 모든 단계 화면 글 · 구경(view all · me -1) · 복기 글 · 조사
// 2) 브라우저: 실제 단추로 한 판 끝까지 (선 · 후 → 앞/뒷면 → 말 고르기 두 번 눌러 확정) · 1분 규칙(직접 해 보기)
// 3) 폰 375×667 한 화면: 가로 넘침 · 세로 넘침 · 눌러지는 크기(44px 이상) · 판이 보이는 크기
'use strict';
const fs = require('fs'), path = require('path');
const { run } = require('./s3ui_lib.js');
const B = require('./board_ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const J = o => JSON.stringify(o);

// ── 1) Node 쪽 ──
(() => {
  const core = require(path.join(ROOT, 'games/gn-yut/core.js'));
  global.window = { SVCores: { 'gn-yut': core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} }, body: { contains: () => true } };
  require(path.join(ROOT, 'games/gn-yut/ui.js'));
  const U = global.window.SVUI['gn-yut'];
  nok(U.min === 4 && U.max === 4 && U.defN === 4 && U.board === false && U.fitCoach === true, '4명 고정 · board:false · fitCoach');
  nok(/전략 윷놀이/.test(U.name) && U.emoji === '🎲' && U.short.length > 10, '이름 · 이모지 · 짧은 설명');
  nok(U.src === '더 지니어스 시즌 1 전략 윷놀이 · 3·4·10화 데스매치 · 시즌 4 그랜드 파이널 2화 데스매치', 'ui.src (목록 src 와 같음)');
  nok(U.diff && /우리가 정한/.test(U.diff) && /뒷도/.test(U.diff) && /업기/.test(U.diff) && /선 · 후/.test(U.diff), 'ui.diff 에 우리가 정한 것');
  const hw = U.howto.map(s => s.replace(/<[^>]+>/g, ''));
  nok(hw.length >= 6 && /2:2/.test(hw[0]) && /다른 점 ①/.test(hw[1]) && /^②/.test(hw[2]) && /^③/.test(hw[3]) && /그 외/.test(hw[4]) && /차례/.test(hw[5]), 'howto 방송 순서 (2:2 → 다른 점 ① ② ③ → 그 외는 일반 → 차례)');
  nok(U.opts.length === 1 && U.opts[0].k === 'mate' && U.opts[0].items.some(x => x[0] === U.opts[0].def), '옵션: 내 짝 자리');
  const src = fs.readFileSync(path.join(ROOT, 'games/gn-yut/ui.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'games/gn-yut/core.js'), 'utf8');
  nok(!/이\(가\)|은\(는\)|을\(를\)|과\(와\)/.test(src), "조사는 '이(가)' 식으로 쓰지 않고 받침에 맞게");
  nok(!/Math\.random|Date\.now/.test(fs.readFileSync(path.join(ROOT, 'games/gn-yut/core.js'), 'utf8').replace(/r = r \|\| Math\.random;/, '')), 'core 에 Math.random · Date.now 없음 (ai 의 기본 난수만)');
  const seats = [{ name: '한솔', emoji: '🙂' }, { name: '두리', emoji: '🤖' }, { name: '지민', emoji: '🤖' }, { name: '하나', emoji: '🤖' }];
  const names = seats.map(s => s.name);
  const draw = (V, me, mode, canAct) => { const stage = { innerHTML: '', onclick: null, querySelector: () => null }; U.render(stage, V, { me, act() {}, canAct: canAct != null ? canAct : me >= 0 && V.needs.includes(me) && !V.over, seats, mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }); return stage.innerHTML; };
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const phases = new Set(); let n = 0, drawn = 0, hid = 0, revN = 0, revBad = 0, sevHi = 0, sevAll = 0;
  for (let k = 0; k < 14; k++) {
    const cfg = k % 3 === 0 ? { mate: 1 } : {}, st = core.init({ n: 4, seed: 600 + k, cfg }), r = mulberry(k + 3);
    for (let steps = 0; steps < 600 && !core.over(st); steps++) {
      const need = core.needs(st);
      // 화면: 4 자리 · 구경(all, me -1) 모두
      for (let s = 0; s < 4; s++) {
        const V = core.view(st, s), html = draw(V, s, 'solo');
        nok(!/undefined|NaN|null|\[object/.test(html), `화면 글 이상 (${st.phase}, 자리 ${s}): ` + (html.match(/.{0,30}(undefined|NaN|null|\[object).{0,30}/) || [''])[0]);
        nok(/yt-board/.test(html), '판 요소');
        drawn++;
        const c1 = U.coach(V, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why !== undefined && !/undefined|NaN|null/.test(J(c1)), `선생님 글 이상 (${st.phase}) ` + J(c1));
        if (need.includes(s)) { nok(c1.why, `차례인데 이유가 비었음 (${st.phase})`); phases.add(st.phase); }
        // 남의 비밀 선택만 바꾼 장면: 선생님 · 화면 · 평가가 같아야 함 (공개 전)
        if (st.phase === 'stick') {
          const alt = JSON.parse(J(st));
          for (let j = 0; j < 4; j++) if (j !== s && alt.picks[j] !== null) alt.picks[j] = 1 - alt.picks[j];
          const V2 = core.view(alt, s);
          nok(J(V) === J(V2), '남의 비밀 선택을 바꿨는데 view 가 달라짐 (새고 있어요)');
          nok(J(c1) === J(U.coach(V2, s, -1, names)), `선생님 글이 남의 비밀 선택으로 바뀜 (자리 ${s})`);
          nok(draw(V, s, 'solo') === draw(V2, s, 'solo'), '화면이 남의 비밀 선택으로 바뀜');
          hid++;
        }
        n++;
      }
      const Va = core.view(st, 'all'), wh = draw(Va, -1, 'watch', false);
      nok(!/undefined|NaN|null|\[object/.test(wh), `구경 화면 글 이상 (${st.phase})`);
      if (!need.length) { core.advance(st); continue; }
      for (const s of need) {
        if (!core.needs(st).includes(s)) continue;
        const V = core.view(st, s), tier = ['easy', 'normal', 'hard'][(k + s) % 3], a = core.ai(V, s, tier, r), b = core.ai(V, s, 'hard', mulberry(k * 7 + steps + s));
        const t = U.actText(a, V, names); nok(typeof t === 'string' && t.length > 2 && !/undefined|NaN|\[object/.test(t), 'actText 이상 ' + t);
        const rv = U.review(V, s, a, b, { k: 0, names, same: 0, tally: [], total: 3, seed: 7 });
        if (rv) { revN++; sevAll++; if (!(rv.sev >= 0 && rv.sev <= 100) || typeof rv.why !== 'string' || /undefined|NaN|\[object|Infinity/.test(rv.why)) { revBad++; console.error('review 이상', J(rv)); } if (rv.sev >= 60) sevHi++; }
        nok(core.apply(st, s, a).ok, 'AI 수가 안 먹음');
      }
    }
    const fin = U.coach(core.view(st, 0), 0, -1, names);
    nok(fin.rec && !/undefined|NaN/.test(J(fin)), '끝난 판 선생님 글');
    for (const me of [0, 1, 2, 3, -1]) { const rs = U.result(core.view(st, me < 0 ? 'all' : me), me); nok(typeof rs === 'string' && /승리/.test(rs) && !/undefined|NaN|\[object/.test(rs), '결과 html ' + rs); }
    nok(!/undefined|NaN|null|\[object/.test(draw(core.view(st, 0), 0, 'solo')) && /승리/.test(draw(core.view(st, 0), 0, 'solo')), '끝 화면에 승리 팀');
  }
  nok(['first', 'stick', 'move'].every(p => phases.has(p)), '차례 단계를 다 겪어 보지 못함 ' + [...phases]);
  nok(revBad === 0 && revN > 40, `복기 글 ${revN}번 (이상 ${revBad})`);
  nok(sevAll > 0 && sevHi / sevAll < 0.2, `아쉬움 ≥60 이 너무 흔함 (${sevHi}/${sevAll})`);
  // 첫 화면 (선 · 후)
  const V0 = core.view(core.init({ n: 4, seed: 1, cfg: {} }), 0), h0 = draw(V0, 0, 'solo');
  nok(/data-v="0"/.test(h0) && /data-v="1"/.test(h0), '선 · 후 단추');
  // 칩 · 부제
  const Vm = core.view(core.init({ n: 4, seed: 2, cfg: { first: 0 } }), 0);
  nok(/^🔵★0\/2$/.test(U.chip(Vm, 0, 0).t) && /^🔴♦0\/2$/.test(U.chip(Vm, 1, 0).t) && /^🔴★/.test(U.chip(Vm, 2, 0).t) && /^🔵♦/.test(U.chip(Vm, 3, 0).t) && /^🔴★/.test(U.chip(Vm, 0, 2).t) && /던지기/.test(U.sub(Vm, 0)), 'chip · sub');
  // 1분 규칙 글
  const steps = U.tutorial();
  nok(steps.length >= 4 && steps.length <= 8 && steps.some(s => s.interactive) && steps.every(s => s.tag && s.title && s.body.length > 10), '1분 규칙 4~8단계 · 직접 해 보기 한 단계');
  nok(steps.some(s => /윷은 한 명이/.test(s.title)) && steps.some(s => /뒷도/.test(s.body)), '1분 규칙에 방송의 다른 점 세 가지');
  console.log(`  화면 ${drawn}장 · 선생님 글 ${n}번 · 비밀 선택 안 새는지 ${hid}번 · 복기 글 ${revN}번 (아쉬움 ≥60: ${sevHi})`);
})();

// ── 2) 브라우저: 실제 단추로 ──
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'first') { await page.locator(`[data-v="${step % 2}"]`).click(); return true; }
  if (ph === 'stick') { await page.locator(`button[data-f="${step % 3 === 0 ? 0 : 1}"]`).click(); return true; }
  if (ph === 'move') {
    const bs = page.locator('button[data-p]'), c = await bs.count(); if (!c) return false;
    if (step % 4 === 1) {                                           // 판 위의 말을 눌러 고르고 → 같은 말 단추로 확정
      const tk = page.locator('.yt-tk.can').first();
      if (await tk.count()) { const p = await tk.getAttribute('data-p'); await tk.click({ force: true }); await page.locator(`button[data-p="${p}"]`).click(); return true; }
    }
    const i = step % c; await bs.nth(i).click(); await bs.nth(i).click(); return true;
  }
  return false;
}
async function tutPolicy(page, i, k) {
  return page.evaluate(k => { const b = document.getElementById('tutStage').querySelector(k === 0 ? '[data-n="8"]' : '[data-n="22"]'); if (!b) return false; b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, k);
}

// ── 3) 폰 375×667 ──
async function small() {
  return B.session('전략 윷놀이 폰 화면', async ({ browser, base, ok }) => {
    for (const vp of B.VPS) {
      const { page, errs, close } = await B.open(browser, base, 'gn-yut', 'seed=21', vp);
      const seen = new Set(); let guard = 0, worstOut = 0, minBoard = 9999;
      while (guard++ < 500) {
        const info = await page.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!V.over, ph: V.phase, canAct: V.needs.includes(h.ME) && !V.over, auto: h.C.auto(h.st()) }; });
        const m = await B.measure(page);
        const k = `${info.ph}|${info.canAct ? 'me' : 'w'}`;
        ok(!m.docx && !m.sx && !m.bad, `${vp.w}x${vp.h} ${k}: 가로 넘침/이상한 글 (docx ${m.docx}, sx ${m.sx}, bad ${m.bad})`);
        ok(m.sy <= 2 && m.outB <= 2, `${vp.w}x${vp.h} ${k}: 한 화면에 안 들어감 (세로 넘침 ${m.sy}px, 아래로 삐져나감 ${m.outB}px ${m.who})`);
        worstOut = Math.max(worstOut, m.outB);
        const bd = await page.evaluate(() => { const b = document.querySelector('.yt-board'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.width, r.height]; });
        if (bd) minBoard = Math.min(minBoard, bd[1]);
        if (!seen.has(k)) {
          seen.add(k);
          const small = await page.evaluate(() => [...document.querySelectorAll('#stage button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map(b => b.className + ':' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)));
          ok(small.length === 0, `${vp.w}x${vp.h} ${k}: 44px 보다 작은 단추 ${small.join(',')}`);
          if (vp.w === 375 && B.argv.includes('--shots')) await page.screenshot({ path: path.join(B.shotDir(), `gn-yut-375-${k.replace('|', '-')}.png`) });
        }
        if (info.over) break;
        if (info.canAct) { const a = await page.evaluate(() => window.__h.U.qa(window.__h.view(), window.__h.ME, window.__h.rnd)); const r = await page.evaluate(a => window.__h.act(a).ok, a); ok(r === true, 'qa 수가 안 먹음'); }
        else { const adv = await page.evaluate(() => window.__h.next()); if (!adv) { guard += 50; } }
      }
      ok(seen.has('first|me') && seen.has('stick|me') && seen.has('move|me') && seen.has('reveal|w'), `${vp.w}x${vp.h}: 단계 화면을 다 봄 (${[...seen].join(' ')})`);
      ok(minBoard >= 120, `${vp.w}x${vp.h}: 판 높이가 너무 작음 (${Math.round(minBoard)}px)`);
      ok(errs.length === 0, `${vp.w}x${vp.h}: 오류 ${errs.join(' / ')}`);
      console.log(`  ${vp.w}x${vp.h}: 단계 ${seen.size}개 · 판 최소 높이 ${Math.round(minBoard)}px · 가장 크게 삐져나간 ${Math.round(worstOut)}px`);
      await close();
    }
  });
}
(async () => {
  const r = await small();
  if (r) bad += r;
  await run('gn-yut', policy, { runs: 3, ns: [4, 4, 4], tutPolicy, allShots: false });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

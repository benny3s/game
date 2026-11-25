// 광부 게임 — 광부 차례 화면 시험 (node survival/test/gn-miner_ui.js [--shot <폴더>])
// 폰 375×667 세로 한 화면 · 개수 고르기(칩 · − + 단추) · 꺼내기 단추가 n 개로 들어가는지 · 스톱 · 예전 한 개씩 판 · 구경 화면
'use strict';
const path = require('path');
const U = require('../../test/qa/lib/uitest');
const args = process.argv.slice(2);
const shotAt = args.indexOf('--shot');
const shotDir = shotAt >= 0 ? args.splice(shotAt, 2)[1] : null;

U.main(async T => {
  const open = async extra => {
    const p = await T.open('survival/test/gn_harness.html', `g=gn-miner&fast=1&${extra || ''}`);
    const ok = await U.waitFor(p, () => window.__h && window.__h.ready, null, 15000);
    if (!ok) throw new Error('시험 틀이 안 열림');
    await p.setViewportSize({ width: 375, height: 667 });
    return p;
  };
  // 내가 광부로 채굴하는 차례가 올 때까지 (제시 단계는 qa 수로)
  const toMine = async p => {
    for (let i = 0; i < 4000; i++) {
      const s = await p.evaluate(() => { const V = window.__h.view(); return { over: !!(V && V.over), mine: !!(V && V.phase === 'mine' && V.needs.includes(window.__h.me)), my: !!(V && V.needs.includes(window.__h.me)) }; });
      if (s.over) return false;
      if (s.mine) return true;
      if (s.my) await p.evaluate(() => window.__h.qa());
      else await T.sleep(15);
    }
    return false;
  };
  const noScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1);

  // 1) 방송대로 (기본): 광부 차례에 개수를 골라 한 번에 꺼내요
  const p = await open('mode=solo&n=9&seed=11');
  T.ok(await toMine(p), '내가 광부 차례에 닿아요');
  T.ok(await p.evaluate(() => window.__h.view().ver === 'b'), '기본 판은 방송대로(ver b)');
  const chips = await p.evaluate(() => [...document.querySelectorAll('.mn-pre button')].map(b => b.textContent.trim()));
  T.ok(chips.join() === '1,2,3,5,8,12', `개수 칩 1·2·3·5·8·12 (${chips})`);
  T.ok(await p.evaluate(() => !!document.querySelector('.mn-step') && !!document.querySelector('[data-a="draw"]') && !!document.querySelector('[data-a="stop"]')), '− + 단추 · 꺼내기 · 스톱이 보여요');
  T.ok(await noScroll(p), '375×667 한 화면 (가로 · 세로 스크롤 없음) — 내 차례 첫 화면');
  if (shotDir) await p.screenshot({ path: path.join(shotDir, 'gn-miner_turn1.png') });
  await p.click('[data-k="5"]');
  T.ok(await p.evaluate(() => document.querySelector('.mn-step b').textContent.trim() === '5'), '칩 5 → 5개');
  await p.click('[data-dk="1"]'); await p.click('[data-dk="1"]');
  T.ok(await p.evaluate(() => document.querySelector('.mn-step b').textContent.trim() === '7'), '+ 두 번 → 7개');
  await p.click('[data-dk="-1"]');
  T.ok(await p.evaluate(() => document.querySelector('.mn-step b').textContent.trim() === '6'), '− → 6개');
  const L0 = await p.evaluate(() => window.__h.st().log.length);
  await p.click('[data-a="draw"]');
  const mine1 = await p.evaluate(L => { const h = window.__h, e = h.st().log.slice(L).find(x => x.k === 'draw' && x.s === h.me); return e ? { n: e.n, len: e.xs ? e.xs.length : -1 } : null; }, L0);
  T.ok(mine1 && mine1.n === 6 && mine1.len === 6, `꺼내기 단추 = 한 번에 6개 (${JSON.stringify(mine1)})`);
  // 다음 광부(AI)가 꺼낸 뒤 다시 내 차례 — 방금 꺼낸 것 줄(🧺)이 보여요
  const again = await U.waitFor(p, () => { const V = window.__h.view(); return V && V.phase === 'mine' && V.needs.includes(window.__h.me) && V.grabs.length >= 3; }, null, 20000) || await U.waitFor(p, () => { const V = window.__h.view(); return V && (V.over || V.phase === 'bid'); }, null, 10000);
  T.ok(!!again, '차례가 돌아오거나 그 조가 끝나요');
  const txt = await p.evaluate(() => document.getElementById('stage').innerText);
  T.ok(/꺼낸|정산|제시|점/.test(txt), '화면에 진행이 보여요');
  T.ok(await noScroll(p), '375×667 한 화면 — 꺼낸 뒤');
  if (shotDir) await p.screenshot({ path: path.join(shotDir, 'gn-miner_turn2.png') });
  T.ok((await p.evaluate(() => window.__h.errors)).length === 0, '오류 없음');
  // 스톱 단추
  const p2 = await open('mode=solo&n=9&seed=12');
  T.ok(await toMine(p2), '(스톱 시험) 광부 차례에 닿아요');
  const h0 = await p2.evaluate(() => window.__h.view().hist.length);
  await p2.click('[data-a="stop"]');
  const h1 = await U.waitFor(p2, h => window.__h.view().hist.length > h, h0, 5000);
  T.ok(!!h1, '스톱 단추 → 바로 정산');
  await p.close(); await p2.close();

  // 2) 예전 한 개씩 판: 개수 단추 없이 꺼내기 하나
  const q = await open('mode=solo&n=9&seed=13&o.ver=a');
  T.ok(await toMine(q), '(예전 판) 광부 차례에 닿아요');
  T.ok(await q.evaluate(() => window.__h.view().ver === 'a' && !document.querySelector('.mn-step') && !!document.querySelector('[data-a="draw"]')), '예전 판은 − + 단추 없이 꺼내기 · 스톱만');
  T.ok(await noScroll(q), '(예전 판) 375×667 한 화면');
  const Lq = await q.evaluate(() => window.__h.st().log.length);
  await q.click('[data-a="draw"]');
  const mineq = await q.evaluate(L => { const h = window.__h, e = h.st().log.slice(L).find(x => x.k === 'draw' && x.s === h.me); return e ? { hasX: e.x !== undefined, hasN: 'n' in e } : null; }, Lq);
  T.ok(mineq && mineq.hasX && !mineq.hasN, `(예전 판) 꺼내기 = 1개 (${JSON.stringify(mineq)})`);
  await q.close();

  // 3) 구경(AI 끼리) 화면: 방송대로 판이 끝까지 · 한 화면
  const w = await open('mode=watch&n=9&seed=14');
  const done = await U.waitFor(w, () => window.__h.view() && window.__h.view().over, null, 60000);
  T.ok(!!done, '(구경) 방송대로 판이 끝까지 가요');
  T.ok(await noScroll(w), '(구경) 375×667 끝 화면 — 스크롤 없음');
  if (shotDir) await w.screenshot({ path: path.join(shotDir, 'gn-miner_watch_end.png') });
  T.ok((await w.evaluate(() => window.__h.errors)).length === 0, '(구경) 오류 없음');
  await w.close();
}, 'gn-miner_ui');

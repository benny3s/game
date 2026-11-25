// 숫자 경매 화면 시험: node survival/test/numauction_ui.js [--shots 폴더] [--runs 6]
//  · 먼저 Node 에서 AI 선생님 글을 검사 (아직 안 열린 카드 순서만 다른 두 장면에서 글이 같아야 함 · undefined/NaN/null 없음 · 보이는 것이 바뀌면 글도 바뀜)
//  · 그다음 브라우저로 화면 단추만 눌러 한 판 끝까지 (3 · 4 · 6명, s3ui_lib)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { run } = require('./s3ui_lib.js');
const GAMES = path.resolve(__dirname, '..', 'games');

function loadAll(id) {
  const sb = { console }; sb.window = sb; sb.self = sb;
  sb.document = { createElement: () => ({}), head: { appendChild() {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(GAMES, id, 'core.js'), 'utf8'), sb, { filename: 'core.js' });
  vm.runInContext(fs.readFileSync(path.join(GAMES, id, 'ui.js'), 'utf8'), sb, { filename: 'ui.js' });
  return { C: sb.SVCores[id], U: sb.SVUI[id] };
}

function coachChecks() {
  const { C, U } = loadAll('numauction');
  let pass = 0, fail = 0, texts = 0, diffSeen = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; if (fail < 12) console.error('FAIL:', m); } };
  const rr = (() => { let a = 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
  for (let g = 0; g < 36; g++) {
    const n = 3 + (g % 4), names = ['나', 'AI1', 'AI2', 'AI3', 'AI4', 'AI5'].slice(0, n);
    const st = C.init({ n, seed: 500 + g });
    let guard = 0, since = -1;
    while (!C.over(st) && guard++ < 3000) {
      const need = C.needs(st);
      if (!need.length) { if (C.auto(st) == null) break; C.advance(st); continue; }
      for (let me = 0; me < n; me++) {
        const V = C.view(st, me), c = U.coach(V, me, since, names), all = [c.opp, c.mine, c.rec, c.why].join('|');
        texts++;
        ok(c.opp && c.mine && c.rec, `선생님 글 빔 (phase ${V.phase})`);
        ok(!/undefined|NaN|null|\[object/.test(all), `선생님 글에 undefined/NaN/null: ${all.slice(0, 200)}`);
        // 아직 안 열린 카드의 순서만 다른 쌍둥이 장면
        const t = JSON.parse(JSON.stringify(st));
        for (let i = t.deck.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); const x = t.deck[i]; t.deck[i] = t.deck[j]; t.deck[j] = x; }
        const V2 = C.view(t, me);
        if (JSON.stringify(V2) === JSON.stringify(V)) ok(JSON.stringify(U.coach(V2, me, since, names)) === JSON.stringify(c), `카드 순서만 다른데 선생님 글이 달라요 (phase ${V.phase}, 자리 ${me})`);
        else ok(false, `쌍둥이 장면의 view 가 달라요 (자리 ${me}) — 열리지 않은 카드 순서가 새고 있어요`);
        // 보이는 것(상대 블록)이 바뀌면 글도 바뀌어야 (상수가 아닌지)
        if (V.needs.includes(me) && V.phase === 'bid') {
          const u = JSON.parse(JSON.stringify(st)), o = (me + 1) % n; u.have[o] &= ~(1 << 10); u.pile[o] &= ~(1 << 10);
          if (JSON.stringify(U.coach(C.view(u, me), me, since, names)) !== JSON.stringify(c)) diffSeen++;
        }
      }
      for (const s of need) {
        const tier = ['easy', 'normal', 'hard'][Math.floor(rr() * 3)], V = C.view(st, s);
        const L = C.legal(st, s), a = rr() < 0.2 ? L[Math.floor(rr() * L.length)] : C.ai(V, s, tier, rr);
        const lg = V.log; since = lg.length ? lg[lg.length - 1].i : -1;
        const r = C.apply(st, s, a); if (!r.ok) { ok(false, `AI 동작이 안 먹음 ${JSON.stringify(a)} ${r.err}`); return finish(pass, fail, texts); }
      }
    }
  }
  ok(diffSeen > 20, `보이는 정보를 바꿔도 글이 안 바뀜 (${diffSeen})`);
  return finish(pass, fail, texts);
}
function finish(pass, fail, texts) {
  console.log(`선생님 글 시험 (${texts}번 읽음): 통과 ${pass} · 실패 ${fail}`);
  return fail;
}

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'ret') {
    const b = page.locator('[data-ret]'), n = await b.count(); if (!n) return false;
    await b.nth(step % n).click(); return true;
  }
  if (ph !== 'bid') return false;
  const bid = page.locator('[data-a=bid]:not([disabled])'), pass = page.locator('[data-a=pass]');
  const mode = step % 5;
  if (mode === 0) { await pass.click(); return true; }
  if (mode === 1 || mode === 2) {
    const rec = page.locator('[data-a=rec]:not([disabled])');
    if (await rec.count()) { await rec.click(); if (await bid.count()) { await bid.click(); return true; } }
    await pass.click(); return true;
  }
  // 직접 블록을 눌러 쌓기
  const free = page.locator('.nau-b.free'), cnt = await free.count();
  if (!cnt) { await pass.click(); return true; }
  const start = (step * 3) % cnt;
  for (let k = 0; k < cnt; k++) {
    if (await bid.count()) { await bid.click(); return true; }
    const f = page.locator('.nau-b.free'), m = await f.count(); if (!m) break;
    await f.nth(k === 0 ? Math.min(start, m - 1) : m - 1).click();
  }
  if (await bid.count()) { await bid.click(); return true; }
  await pass.click(); return true;
}
async function tutPolicy(page) {
  return page.evaluate(() => {
    const box = document.getElementById('tutStage'), sel = box.querySelectorAll('.nau-b.sel').length;
    const pick = v => { const b = box.querySelector(`[data-v="${v}"]`); if (!b) return false; b.click(); return true; };
    if (sel === 0) return pick(2);
    if (sel === 1) return pick(8);
    const b = box.querySelector('[data-a=bid]'); if (!b || b.disabled) return false; b.click(); return true;
  });
}

if (coachChecks()) process.exit(1);
run('numauction', policy, { runs: 6, ns: [3, 4, 6], tutPolicy });

// 초이스 홀덤 화면 시험: node survival/test/choicehold_ui.js [--shots 폴더] [--runs 3]
//  · 먼저 Node 에서 AI 선생님 글을 검사 (숨은 카드만 다른 두 장면에서 글이 같아야 함 · 글에 undefined/NaN 없음 · 보이는 것이 바뀌면 글도 바뀜)
//  · 그다음 브라우저로 화면 단추만 눌러 한 판 끝까지 (s3ui_lib)
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
  const { C, U } = loadAll('choicehold');
  let pass = 0, fail = 0, texts = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; if (fail < 12) console.error('FAIL:', m); } };
  const names = ['나', '상대'];
  const rr = (() => { let a = 99; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
  const change = v => (v % 5) + 1;
  let diffSeen = 0;
  for (let g = 0; g < 40; g++) {
    const st = C.init({ n: 2, seed: 300 + g });
    let guard = 0, since = -1;
    while (!C.over(st) && guard++ < 3000) {
      const need = C.needs(st);
      if (!need.length) { if (C.auto(st) == null) break; C.advance(st); continue; }
      for (const me of [0, 1]) {
        const V = C.view(st, me), c = U.coach(V, me, since, names), all = [c.opp, c.mine, c.rec, c.why].join('|');
        texts++;
        ok(c.opp && c.mine && c.rec, `선생님 글 빔 (phase ${V.phase})`);
        ok(!/undefined|NaN|null|\[object/.test(all), `선생님 글에 undefined/NaN/null: ${all.slice(0, 160)}`);
        // 숨은 카드만 바꾼 쌍둥이 장면
        const t = JSON.parse(JSON.stringify(st)), opp = 1 - me, B = 1 - st.first;
        if (V.pc[opp] == null) t.pc[opp] = change(t.pc[opp]);
        if (st.phase === 'bet1' || (st.phase === 'place' && me === B)) t.offer = t.offer.map(change);
        if (st.phase === 'take' && me === B) t.offer[1 - st.up] = change(t.offer[1 - st.up]);
        if (st.taken === 'up' && me === B) { const k = 1 - st.up; t.offer[k] = change(t.offer[k]); t.sec[st.first] = t.offer[k]; }
        const V2 = C.view(t, me);
        if (JSON.stringify(V2) === JSON.stringify(V)) {
          const c2 = U.coach(V2, me, since, names);
          ok(JSON.stringify(c2) === JSON.stringify(c), `숨은 카드만 다른데 선생님 글이 달라요 (phase ${V.phase}, 자리 ${me})`);
          // 보이는 것(내 개인 카드)을 바꾸면 글이 달라져야 (글이 상수가 아닌지)
          if (V.needs.includes(me) && (V.phase === 'bet1' || V.phase === 'bet2')) {
            const u = JSON.parse(JSON.stringify(st)); u.pc[me] = u.pc[me] === 5 ? 1 : 5;
            const V3 = C.view(u, me); if (JSON.stringify(U.coach(V3, me, since, names)) !== JSON.stringify(c)) diffSeen++;
          }
        } else ok(false, `쌍둥이 장면의 view 가 달라요 (phase ${V.phase}, 자리 ${me}) — core 가 숨은 카드를 새거나 시험이 보이는 것을 바꿨어요`);
      }
      // 아무나 한 수 (AI 둘이 섞어서)
      for (const s of need) {
        const tier = ['easy', 'normal', 'hard'][Math.floor(rr() * 3)], V = C.view(st, s);
        const a = rr() < 0.15 ? C.legal(st, s)[Math.floor(rr() * C.legal(st, s).length)] : C.ai(V, s, tier, rr);
        const r = C.apply(st, s, a); if (!r.ok) { ok(false, `AI 동작이 안 먹음 ${JSON.stringify(a)} ${r.err}`); return finish(pass, fail, texts); }
        since = C.view(st, s).log.length ? C.view(st, s).log[C.view(st, s).log.length - 1].i - 1 : -1;
      }
    }
  }
  ok(diffSeen > 20, `보이는 카드를 바꿔도 글이 안 바뀜 (${diffSeen})`);
  return finish(pass, fail, texts);
}
function finish(pass, fail, texts) {
  console.log(`선생님 글 시험 (${texts}번 읽음): 통과 ${pass} · 실패 ${fail}`);
  return fail;
}

async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'place') {
    const b = page.locator('[data-a=place]'), n = await b.count(); if (!n) return false;
    await b.nth(step % 2).click(); return true;
  }
  if (ph === 'take') {
    const b = page.locator(step % 3 === 0 ? '[data-a=take][data-d=down]' : '[data-a=take][data-d=up]');
    if (!(await b.count())) return false; await b.first().click(); return true;
  }
  if (ph === 'bet1' || ph === 'bet2') {
    const pref = step % 4 === 0 ? '[data-a=raise]' : step % 9 === 0 ? '[data-a=fold]' : '[data-a=call]';
    let b = page.locator(pref); if (!(await b.count())) b = page.locator('[data-a=call],[data-a=fold]');
    if (!(await b.count())) return false;
    await b.first().click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-d=up]'); if (!b) return false; b.click(); return true; });
}

if (coachChecks()) process.exit(1);
run('choicehold', policy, { runs: 3, ns: [2], tutPolicy });

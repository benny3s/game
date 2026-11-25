// 더 지니어스 게임 화면 시험 (node survival/test/gn_ui.js <게임id…> [--shot <폴더>])
// 시험 틀(gn_harness.html)에서 폰 크기(390×844)로: 혼자 한 판 끝까지(내 차례엔 qa 수) · AI 구경 한 판 · 선생님 3줄 · 1분 규칙 단계 · 가로 넘침 · 페이지 오류 0
'use strict';
const path = require('path');
const U = require('../../test/qa/lib/uitest');
const args = process.argv.slice(2);
const shotAt = args.indexOf('--shot');
const shotDir = shotAt >= 0 ? args.splice(shotAt, 2)[1] : null;
const ids = args.filter(a => !a.startsWith('--'));
if (!ids.length) { console.error('사용법: node survival/test/gn_ui.js gn-sunmoon [...]'); process.exit(2); }

U.main(async T => {
  for (const id of ids) {
    const open = async extra => {
      const p = await T.open('survival/test/gn_harness.html', `g=${id}&${extra || ''}`);
      const ok = await U.waitFor(p, () => window.__h && window.__h.ready, null, 15000);
      if (!ok) throw new Error(`${id}: 시험 틀이 안 열림 ${JSON.stringify(await p.evaluate(() => window.__h && window.__h.errors))}`);
      return p;
    };
    // 1) 혼자: 내 차례엔 qa 수 (화면의 단추를 통해 act) · 끝까지
    const p = await open('mode=solo&fast=1');
    T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${id}: 처음 화면 가로 넘침 없음`);
    let coached = false, shot = false, guard = 0, lastFp = '', same = 0;
    while (guard++ < 4000) {
      const s = await p.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!(V && V.over), mine: !!(V && V.needs.includes(h.me)), fp: V && V.pub, err: h.errors.length }; });
      if (s.err) break;
      if (s.over) break;
      if (s.fp === lastFp) same++; else { same = 0; lastFp = s.fp; }
      if (same > 400) { T.ok(false, `${id}: 화면이 멈춤 (${lastFp})`); break; }
      if (s.mine) {
        if (!coached) {
          const c = await p.evaluate(() => { try { return window.__h.coach(); } catch (e) { return { err: String(e && e.stack || e) }; } });
          coached = true;
          T.ok(c && !c.err && ['opp', 'mine', 'rec'].every(k => typeof c[k] === 'string' && c[k].length > 2), `${id}: 선생님 👀📊💡 세 줄 (${c && (c.err || '')})`);
        }
        if (shotDir && !shot) { shot = true; await p.screenshot({ path: path.join(shotDir, `${id}_play.png`) }); }
        const done = await p.evaluate(() => window.__h.qa());
        if (!done) await T.sleep(30);
      } else await T.sleep(15);
    }
    const end = await p.evaluate(() => { const h = window.__h, V = h.view(); return { over: !!(V && V.over), errors: h.errors, stuck: h.stuck || 0, fb: h.fallback || 0, ranks: V && V.ranks, res: h.result() }; });
    T.ok(end.over, `${id}: 한 판이 끝까지 감`);
    T.ok(end.errors.length === 0, `${id}: 오류 없음 ${JSON.stringify(end.errors.slice(0, 2))}`);
    T.ok(end.stuck === 0, `${id}: AI 가 막힌 적 없음 (${end.stuck})`);
    T.ok(Array.isArray(end.ranks), `${id}: 등수가 나옴`);
    T.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${id}: 끝 화면 가로 넘침 없음`);
    if (shotDir) await p.screenshot({ path: path.join(shotDir, `${id}_end.png`) });
    // 2) 1분 규칙 단계
    const tut = await p.evaluate(() => {
      const steps = window.__h.tutorial(), out = [];
      for (const st of steps) {
        const d = document.createElement('div'); document.body.appendChild(d);
        let ok = true, done = false;
        try {
          if (st.render) st.render(d, { complete() { done = true; }, sfx() {} });
          else d.innerHTML = st.boardHtml || '';
        } catch (e) { ok = false; }
        out.push({ ok, tag: !!st.tag, title: !!st.title, body: (st.body || '').length > 10, shown: d.innerHTML.length > 10, inter: !!st.interactive });
        d.remove();
      }
      return out;
    });
    T.ok(tut.length >= 4 && tut.every(x => x.ok && x.tag && x.title && x.body && x.shown), `${id}: 1분 규칙 ${tut.length}단계가 그려짐`);
    // 3) AI 구경 한 판
    const w = await open('mode=watch&fast=1&n=' + (await p.evaluate(() => window.__h.ui.max)));
    const ok = await U.waitFor(w, () => window.__h.view() && window.__h.view().over, null, 60000);
    T.ok(!!ok, `${id}: AI 구경이 끝까지 감`);
    T.ok((await w.evaluate(() => window.__h.errors)).length === 0, `${id}: 구경 오류 없음`);
    await p.close(); await w.close();
  }
}, 'gn_ui');

// 블라인드 베팅 화면 시험: node survival/test/blindbet_ui.js [--shots 폴더] [--runs 3]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 안내 글 · 선생님 글 (숨은 것 = 내 블라인드 · 상대가 이번 턴에 낸 오픈 카드) · 구경꾼 화면
(() => {
  const core = require(path.join(ROOT, 'games/blindbet/core.js'));
  global.window = { SVCores: { blindbet: core } };
  global.document = { createElement: () => ({}), head: { appendChild() {} } };
  require(path.join(ROOT, 'games/blindbet/ui.js'));
  const U = global.window.SVUI.blindbet;
  nok(U.src === '방송: 피의 게임 시즌3 · 블라인드 베팅' && U.diff && /^방송과 다른 점: /.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 2 && U.defN === 2 && U.board === false, '2명 고정 · board:false');
  const seats = [{ name: '나', emoji: '🙂' }, { name: 'AI1', emoji: '🤖' }];
  const draw = (V, me, mode) => { const stage = { innerHTML: '', onclick: null }; U.render(stage, V, { me, act() {}, canAct: me >= 0 && V.needs.includes(me) && !V.over, seats, mode, fast: false, coachOn: false, g: 1, wait: false, sfx() {}, toast() {} }); return stage.innerHTML; };
  const blindsIn = html => [...html.matchAll(/<div class="bb-c bl[^"]*">(\d+)<\/div>/g)].map(m => +m[1]);
  let n = 0, hid = 0, specN = 0, phases = new Set();
  for (let k = 0; k < 30; k++) {
    const st = core.init({ n: 2, seed: 900 + k, cfg: {} });
    let rs = k + 5; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 220 && !core.over(st); steps++) {
      const need = core.needs(st);
      phases.add(st.phase);
      if (!need.length) {
        for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, ['나', 'AI1']); nok(c && c.opp && c.mine && c.rec && c.why && !/undefined|NaN|null/.test(JSON.stringify(c)), '선생님 글 이상(공개 단계) ' + JSON.stringify(c)); n++; }
        const h0 = draw(core.view(st, 0), 0, 'solo'); nok(!/undefined|NaN|null|\[object/.test(h0), '공개 단계 화면 글 이상');
        core.advance(st); continue;
      }
      for (const s of [0, 1]) {
        const o = 1 - s, names = ['나', 'AI1'], V = core.view(st, s);
        const c1 = U.coach(V, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        // 숨은 것: 내 블라인드 (다른 가능한 카드로) · 상대가 이번 턴에 낸 오픈 카드
        const st2 = JSON.parse(JSON.stringify(st)), cnt = Array(13).fill(2); cnt[0] = 0;
        st.seen.forEach(v => { cnt[v]--; }); cnt[st.blind[o]]--;
        const alts = []; for (let v = 1; v <= 12; v++) if (cnt[v] > 0) alts.push(v);
        st2.blind[s] = alts[Math.floor(r() * alts.length)];
        if (st.pick[o] != null) st2.pick[o] = st.left[o][Math.floor(r() * st.left[o].length)];
        const V2 = core.view(st2, s);
        nok(JSON.stringify(V) === JSON.stringify(V2), '(시험 틀 오류) 바꾼 장면의 view 가 달라짐');
        const c2 = U.coach(V2, s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 숨은 정보로 바뀜 (${st.phase})`);
        // 내 화면에는 상대 블라인드만 숫자로 · 내 블라인드는 '?'
        const html = draw(V, s, 'solo');
        nok(!/undefined|NaN|null|\[object/.test(html), `화면 글 이상 (${st.phase}): ` + (html.match(/.{0,30}(undefined|NaN|null|\[object).{0,30}/) || [''])[0]);
        const b = blindsIn(html);
        nok(b.length === 1 && b[0] === st.blind[o], `내 화면 블라인드 숫자 ${JSON.stringify(b)} (상대 ${st.blind[o]} 하나만 보여야 함)`);
        nok(!html.includes('구경 중'), '참가자 화면에 구경 중 표시');
        hid++; n++;
      }
      // 구경꾼 (-1) · AI 구경 ('all'): 두 블라인드가 다 보이고 '구경 중' 표시
      for (const [seat, me, mode] of [[-1, -1, 'watch'], ['all', -1, 'watch']]) {
        const V = core.view(st, seat), html = draw(V, me, mode), b = blindsIn(html);
        nok(html.includes('구경 중'), `구경꾼 화면에 '구경 중' 없음 (${seat})`);
        nok(b.length === 2 && b.includes(st.blind[0]) && b.includes(st.blind[1]), `구경꾼 화면에 두 블라인드 안 보임 ${JSON.stringify(b)} vs ${st.blind}`);
        nok(!/undefined|NaN|null|\[object/.test(html), `구경 화면 글 이상 (${seat})`);
        if (seat === 'all' && st.phase === 'pick' && st.pick.some(x => x != null)) nok(/bb-c op[^"]*pre/.test(html), "AI 구경에서 낸 오픈 카드가 안 보임");
        specN++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    if (core.over(st)) for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, ['나', 'AI1']); nok(c && c.opp && c.rec && !/undefined|NaN/.test(JSON.stringify(c)), '끝난 뒤 선생님 글'); n++; }
    const rh = U.result(core.view(st, 0), 0), ra = U.result(core.view(st, 'all'), -1);
    nok(rh.length > 20 && !/undefined|NaN|null/.test(rh + ra), '결과 html 이상: ' + rh.slice(0, 80));
    nok(!/undefined|NaN|null|\[object/.test(draw(core.view(st, 0), 0, 'solo') + draw(core.view(st, -1), -1, 'watch')), '끝난 화면 글 이상');
  }
  nok(n > 300 && hid > 100 && specN > 100 && phases.has('bet') && phases.has('pick') && phases.has('show'), `시험 횟수 ${n} · 숨은 것 바꾼 쌍 ${hid} · 구경 화면 ${specN} · 단계 ${[...phases]}`);
  console.log(`  선생님 글 숨은 정보 시험: 글 ${n}번 · 숨은 것(내 블라인드 · 상대 오픈)을 바꾼 쌍 ${hid}번 · 구경꾼/AI 구경 화면 ${specN}번 통과`);
  const st = core.init({ n: 2, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok < 80) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 규칙에 안 맞음'); qaok++; } }
  delete global.document;
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph === 'bet') {
    const w = step % 6;
    if (w === 0 && (await page.locator('[data-a=raise]').count())) {          // 레이즈 칸 올렸다 내렸다 한 번 눌러 보기
      const up = page.locator('[data-r="1"]:not([disabled])'); if (await up.count()) await up.click();
      await page.locator('[data-a=raise]').click(); return true;
    }
    if (w === 3 && (await page.locator('[data-a=fold]').count())) { await page.locator('[data-a=fold]').click(); return true; }
    const b = page.locator('[data-a=call]'); if (!(await b.count())) return false;
    await b.click(); return true;
  }
  if (ph === 'pick') {
    const cs = page.locator('.bb-ob'), n = await cs.count();
    if (!n) return false;
    await cs.nth((step * 7) % n).click();
    const ok = page.locator('[data-a=open]:not([disabled])');
    if (!(await ok.count())) return false;
    await ok.click(); return true;
  }
  return false;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-v="10"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('blindbet', policy, { runs: 3, ns: [2], tutPolicy });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

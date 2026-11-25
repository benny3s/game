// 넘버 체인지 화면 시험: node survival/test/numchange_ui.js [--shots 폴더] [--runs 3]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 안내 글 · 선생님 글 (숨은 것 = 상대 손의 실제 모습 · 이번 라운드에 상대가 낸 블록 → 보이는 것은 같게 두고 바꿔서 글이 같아야 함)
(() => {
  const core = require(path.join(ROOT, 'games/numchange/core.js'));
  global.window = { SVCores: { numchange: core } };
  require(path.join(ROOT, 'games/numchange/ui.js'));
  const U = global.window.SVUI.numchange;
  nok(U.src === '방송: 피의 게임 시즌2 · 넘버 체인지' && U.diff && /^방송과 다른 점: /.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 2 && U.defN === 2 && U.board === false, '2명 고정 · board:false');
  const KEY = '큰 합을 내면 큰 블록이 상대에게 넘어간다';
  let n = 0, hid = 0, hidRounds = 0, keyN = 0;
  for (let k = 0; k < 24; k++) {
    const st = core.init({ n: 2, seed: 700 + k, cfg: {} });
    let rs = k + 11; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 80 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) {
        for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, ['나', '상대']); nok(c && c.opp && c.mine && c.rec && c.why && !/undefined|NaN|null/.test(JSON.stringify(c)), '선생님 글 이상(공개 단계) ' + JSON.stringify(c)); n++; }
        const last = st.hist[st.hist.length - 1]; if (last && (last.h[0] || last.h[1])) hidRounds++;
        core.advance(st); continue;
      }
      for (const s of [0, 1]) {
        const o = 1 - s, names = ['나', '상대'];
        const c1 = U.coach(core.view(st, s), s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        nok(c1.why.includes(KEY), '👉 에 "' + KEY + '" 없음: ' + c1.why);
        keyN++;
        // 상대의 실제 손을 '내가 보는 것과 같은 다른 경우'로 바꾸고, 낸 블록도 바꿔서 글이 같은지
        const W = st.bel[s], st2 = JSON.parse(JSON.stringify(st));
        st2.hand[o] = W[Math.floor(r() * W.length)].slice();
        if (st.sub[o]) { const L = core.legal(Object.assign({}, st2, { hand: st2.hand, hid: st2.hid }), o); const pick = L[Math.floor(r() * L.length)]; if (pick) st2.sub[o] = { a: pick.a, b: pick.b, h: st.sub[o].h }; }
        const v2 = core.view(st2, s);
        nok(JSON.stringify(core.view(st, s)) === JSON.stringify(v2), '(시험 틀 오류) 바꾼 장면의 view 가 달라짐');
        const c2 = U.coach(v2, s, -1, names);
        nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 숨은 정보로 바뀜 (라운드 ${st.round + 1})`);
        hid++; n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    if (core.over(st)) for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, ['나', '상대']); nok(c && c.opp && c.rec && c.why.includes(KEY) && !/undefined|NaN/.test(JSON.stringify(c)), '끝난 뒤 선생님 글'); n++; }
    const rh = U.result(core.view(st, 0), 0), rs2 = U.result(core.view(st, 'all'), -1), rs3 = U.result(core.view(st, -1), -1);
    nok(rh.length > 20 && !/undefined|NaN|null/.test(rh + rs2 + rs3), '결과 html 이상: ' + rh.slice(0, 80));
  }
  nok(n > 300 && hid > 100 && hidRounds > 5, `선생님 시험 횟수 ${n} · 숨은 것 바꾼 쌍 ${hid} · 히든 찬스 라운드 ${hidRounds}`);
  console.log(`  선생님 글 숨은 정보 시험: 글 ${n}번 · 숨은 것을 바꾼 쌍 ${hid}번 · 히든 찬스 라운드 ${hidRounds}번 · 👉 문구 ${keyN}번 통과`);
  const st = core.init({ n: 2, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok < 60) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 규칙에 안 맞음'); qaok++; } }
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph !== 'pick') return false;
  const bs = page.locator('.nc-hand button.nc-b'), n = await bs.count();
  if (n < 2) return false;
  const i = (step * 3) % n;
  await bs.nth(i).click();
  await bs.nth((i + 1 + (step % (n - 1))) % n).click();   // 간격 1~n-1 이라 첫 번째와 다른 블록
  if (step % 5 === 0) { const h = page.locator('[data-a=hid]:not([disabled])'); if (await h.count()) await h.click(); }
  const ok = page.locator('[data-a=submit]:not([disabled])');
  if (!(await ok.count())) return false;
  await ok.click(); return true;
}
async function tutPolicy(page) {
  // 아직 안 고른 가장 큰 블록부터 두 개 (합이 9 보다 커짐)
  return page.evaluate(() => {
    const box = document.getElementById('tutStage'), bs = [...box.querySelectorAll('.nc-hand [data-v]')].filter(b => !b.classList.contains('sel'));
    if (!bs.length) return false;
    bs[bs.length - 1].click(); return true;
  });
}
(async () => {
  await run('numchange', policy, { runs: 3, ns: [2], tutPolicy });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

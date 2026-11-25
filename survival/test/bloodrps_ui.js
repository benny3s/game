// 배틀 가위바위보 화면 시험: node survival/test/bloodrps_ui.js [--shots 폴더] [--runs 3]
'use strict';
const path = require('path');
const { run } = require('./s3ui_lib.js');
const ROOT = path.resolve(__dirname, '..');
let bad = 0;
const nok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };

// 1) Node 쪽: 안내 글 · 선생님 글 (숨은 것 = 상대가 이번 라운드에 낸 카드만 바꾼 두 장면에서 글이 같아야 함)
(() => {
  const core = require(path.join(ROOT, 'games/bloodrps/core.js'));
  global.window = { SVCores: { bloodrps: core } };
  require(path.join(ROOT, 'games/bloodrps/ui.js'));
  const U = global.window.SVUI.bloodrps;
  nok(U.src === '방송: 피의 게임 시즌1 · 배틀 가위바위보' && U.diff && /^방송과 다른 점: /.test(U.diff), 'ui.src / ui.diff');
  nok(U.howto[U.howto.length - 2] === U.src && U.howto[U.howto.length - 1] === '※ ' + U.diff, 'howto 끝 두 줄 = 방송 출처 · ※ 방송과 다른 점');
  nok(U.min === 2 && U.max === 2 && U.defN === 2 && U.board === false, '2명 고정 · board:false');
  let n = 0, hid = 0;
  for (let k = 0; k < 40; k++) {
    const st = core.init({ n: 2, seed: 500 + k, cfg: {} });
    let rs = k + 7; const r = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
    for (let steps = 0; steps < 60 && !core.over(st); steps++) {
      const need = core.needs(st);
      if (!need.length) {
        for (const s of [0, 1]) {
          const names = ['나', '상대'], c = U.coach(core.view(st, s), s, -1, names);
          nok(c && c.opp && c.mine && c.rec && c.why && !/undefined|NaN|null/.test(JSON.stringify(c)), '선생님 글 이상(공개 단계) ' + JSON.stringify(c));
          n++;
        }
        core.advance(st); continue;
      }
      for (const s of [0, 1]) {
        const o = 1 - s, names = ['나', '상대'];
        const v1 = core.view(st, s), c1 = U.coach(v1, s, -1, names);
        nok(c1 && c1.opp && c1.mine && c1.rec && c1.why && !/undefined|NaN|null/.test(JSON.stringify(c1)), '선생님 글 이상 ' + JSON.stringify(c1));
        // 상대가 이미 낸 카드가 있으면 다른 카드로 바꿔서 (낸 뒤 상태는 그대로) 글이 같은지
        if (st.sub[o]) {
          const st2 = JSON.parse(JSON.stringify(st));
          const L = core.legal(st2, o).length ? null : null; void L;
          const opts = []; for (let rr = 0; rr < 3; rr++) if (st.left[o][rr]) for (const sp of ['V', 'C', 'B']) if (sp === 'B' || st.sp[o][sp]) opts.push({ r: rr, s: sp });
          st2.sub[o] = opts[Math.floor(r() * opts.length)];
          const c2 = U.coach(core.view(st2, s), s, -1, names);
          nok(JSON.stringify(c1) === JSON.stringify(c2), `선생님 글이 상대가 낸 카드로 바뀜 (라운드 ${st.round + 1})`);
          hid++;
        }
        n++;
      }
      const seat = need[Math.floor(r() * need.length)], L = core.legal(st, seat);
      core.apply(st, seat, L[Math.floor(r() * L.length)]);
    }
    // 끝난 뒤
    if (core.over(st)) for (const s of [0, 1]) { const c = U.coach(core.view(st, s), s, -1, ['나', '상대']); nok(c && c.opp && c.rec && !/undefined|NaN/.test(JSON.stringify(c)), '끝난 뒤 선생님 글'); n++; }
    const rhtml = U.result(core.view(st, 0), 0), rspec = U.result(core.view(st, 'all'), -1);
    nok(rhtml.length > 20 && !/undefined|NaN|null/.test(rhtml + rspec), '결과 html 이상');
  }
  nok(n > 200 && hid > 40, `선생님 시험 횟수 ${n} · 숨은 것 바꾼 쌍 ${hid}`);
  console.log(`  선생님 글 숨은 정보 시험: 글 ${n}번 · 숨은 카드를 바꾼 쌍 ${hid}번 통과`);
  // 코어의 easy qa 가 규칙에 맞는 수를 두는지
  const st = core.init({ n: 2, seed: 9, cfg: {} }); let rr = 3; const rnd = () => (rr = (rr * 1103515245 + 12345) % 2147483648) / 2147483648;
  let qaok = 0;
  while (!core.over(st) && qaok < 40) { const need = core.needs(st); if (!need.length) { core.advance(st); continue; } for (const s of need) { const a = U.qa(core.view(st, s), s, rnd); nok(a && core.apply(st, s, a).ok, 'qa 수가 규칙에 안 맞음'); qaok++; } }
})();

// 2) 브라우저: 실제 단추로 한 판 끝까지
async function policy(page, { step }) {
  const ph = await page.evaluate(() => window.__h.view().phase);
  if (ph !== 'pick') return false;
  const rb = page.locator('.br-rb:not([disabled])'), n = await rb.count();
  if (!n) return false;
  await rb.nth(step % n).click();
  const want = step % 4 === 0 ? 'V' : step % 4 === 1 ? 'C' : 'B';
  const sb = page.locator(`.br-sb[data-s=${want}]:not([disabled])`);
  if (await sb.count()) await sb.click();
  const ok = page.locator('[data-a=submit]:not([disabled])');
  if (!(await ok.count())) return false;
  await ok.click(); return true;
}
async function tutPolicy(page) {
  return page.evaluate(() => { const b = document.getElementById('tutStage').querySelector('[data-r="1"]'); if (!b) return false; b.click(); return true; });
}
(async () => {
  await run('bloodrps', policy, { runs: 3, ns: [2], tutPolicy });
})().catch(e => { console.error(e); process.exit(1); });
process.on('exit', code => { if (bad && !code) process.exitCode = 1; });

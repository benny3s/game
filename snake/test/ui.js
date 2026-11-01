// slither 콘솔 도구 시험 (브라우저, 소리 없음): node snake/test/ui.js   (가짜 slither 화면 slither-fixture.html 위에서)
//   29 slither-probe: 벽 거리를 원점이 아니라 (grd,grd) 중심으로 재야 함
//   33·34 autopilot / autopilot-min / bot3 / brain: 다시 붙여넣어도 그리기 반복(rAF)이 하나만
const fs = require('fs'), path = require('path');
const U = require('../../test/qa/lib/uitest');

const SN = path.join(U.ROOT, 'snake');
const read = f => fs.readFileSync(path.join(SN, f), 'utf8');

U.main(async T => {
  // ── 29) 벽 거리
  {
    const p = await T.open('snake/slither-fixture.html');
    await U.waitFor(p, () => !!window.__slitherProbe, null, 10000);
    const r = await p.evaluate(() => {
      const P = __slitherProbe, R = 21600, st = (head, ang) => ({ playing: true, head, ang, R, len: 20, foods: [], bodies: [] });
      const wallTerms = o => Array.from({ length: 16 }, (_, k) => o[k * 4 + 3]);
      return {
        center: wallTerms(P.observe(st([R, R], 0))),                 // 판 한가운데 (벽이 멀리 → 전부 0)
        east: wallTerms(P.observe(st([2 * R - 100, R], 0))),         // 동쪽 벽까지 100 → 정면 구역은 0.5 쯤
        west: wallTerms(P.observe(st([100, R], Math.PI))),           // 서쪽 벽 가까이 보고 있음 → 마찬가지
      };
    });
    T.ok(r.center.every(v => Math.abs(v) < 1e-9), `29 한가운데에선 벽 값이 모두 0 (${r.center.map(v => v.toFixed(2)).join(' ')})`);
    T.ok(r.center.every(v => v >= 0 && v <= 1) && r.east.every(v => v >= 0 && v <= 1) && r.west.every(v => v >= 0 && v <= 1), '29 벽 값은 늘 0~1');
    T.ok(Math.abs(r.east[0] - 0.49) < 0.06 && Math.abs(r.east[15] - 0.49) < 0.06, `29 동쪽 벽 100 앞 정면 구역 ≈ 0.49 (${r.east[0].toFixed(2)} · ${r.east[15].toFixed(2)})`);
    T.ok(r.east[8] === 0 && r.east[7] === 0, `29 반대쪽(서쪽) 구역은 벽이 멀어 0 (${r.east[8].toFixed(2)})`);
    T.ok(Math.abs(r.west[0] - 0.49) < 0.06, `29 서쪽 벽 100 앞 정면 구역 ≈ 0.49 (${r.west[0].toFixed(2)})`);
    await p.close();
  }

  // ── 33·34) 다시 붙여넣기
  for (const f of ['slither-autopilot.js', 'autopilot-min.js', 'slither-bot3.js', 'slither-brain.js']) {
    const p = await T.open('snake/slither-fixture.html');
    await U.waitFor(p, () => !!window.__slitherProbe, null, 10000);
    // 우리 도구가 등록하는 rAF(코드에 S.err 가 있는 것)만 세어, 한 화면 갱신에 몇 개나 도는지 봄
    await p.evaluate(() => {
      const orig = window.requestAnimationFrame.bind(window); window.__perFrame = new Map();
      window.requestAnimationFrame = cb => orig(t => { if (String(cb).includes('S.err')) window.__perFrame.set(t, (window.__perFrame.get(t) || 0) + 1); cb(t); });
    });
    const code = read(f);
    await p.addScriptTag({ content: code });
    await p.addScriptTag({ content: code });                       // 다시 붙여넣기
    await p.addScriptTag({ content: code });
    await T.sleep(700);
    const m = await p.evaluate(() => { const v = [...window.__perFrame.values()]; return { frames: v.length, max: Math.max(0, ...v) }; });
    T.ok(m.frames > 10, `(시험 조건) ${f}: 도구 반복이 돌고 있음 (${m.frames}번)`);
    T.ok(m.max === 1, `33·34 ${f}: 세 번 붙여넣어도 한 화면 갱신에 반복이 1개 (최대 ${m.max}개)`);
    await p.close();
  }
}, 'slither 도구');

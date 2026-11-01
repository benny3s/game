// 윷놀이 화면 시험 (브라우저, 소리 없음): node yut/test/ui.js
//   24 친구랑: 손님이 받는 상태에 씨앗이 없어야 하고, 방장이 던질 때마다 난수 상태가 씨앗+횟수에서 벗어나야 함 (개발자도구로 다음 윷 계산 못 하게)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/yut');

U.main(async T => {
  const { H, W } = await T.pair(A);
  // 방장·손님이 차례대로 던지고 옮김 (시험용 autoAct) — 방장이 세 번 이상 던질 때까지
  const C0 = 0x6D2B79F5;
  let r = null;
  for (let i = 0; i < 400; i++) {
    for (const p of [H, W]) await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); __yut.autoAct(); });
    r = await H.evaluate(() => { const S = __yut.ses.S; return { th: S.throwNo, seed: S.seed, rng: S.rng }; });
    if (r.th >= 3) break;
    await T.sleep(150);
  }
  T.ok(r && r.th >= 3, `(시험 조건) 방장이 3번 이상 던짐 (${r && r.th}번)`);
  const hostRng = await H.evaluate(() => __yut.ses.S.rng), hostSeed = await H.evaluate(() => __yut.ses.S.seed);
  const th = await H.evaluate(() => __yut.ses.S.throwNo);
  T.ok(hostRng !== ((hostSeed + 4 * th * C0) | 0), `24 방장의 난수 상태가 씨앗+던진 횟수로 계산되는 값이면 안 됨 (던진 횟수 ${th})`);
  await T.sleep(500);
  const g = await W.evaluate(() => { const S = __yut.ses.S; return { seed: S.seed, rng: S.rng, str: JSON.stringify(S) }; });
  T.ok(g.seed !== hostSeed && g.rng === 0 && g.str.indexOf(String(hostSeed)) < 0, `24 손님이 받은 상태에는 씨앗이 없음 (손님 씨앗 ${g.seed}, 방장 ${hostSeed})`);
}, '윷놀이 화면');

// 땅따먹기 그리기 시험 (브라우저, 소리 없음): node land/test/ui.js
//   15 새 땅이 솟는 움직임이 끝나는 프레임에 칸이 잠깐 옛 색(종이)으로 돌아가 깜빡이던 것
//   (움직임 묶음이 끝났을 때 캐시에 넣는 일을, 캐시를 화면에 그린 뒤에 하고 있었음)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/land');

U.main(async T => {
  const p = await T.open('land/');
  await U.waitFor(p, A.ready, null, 15000);
  const r = await p.evaluate(() => {
    const st = Land.create({ n: 2, size: 'small' }, 7);
    st.owner.fill(0); st.trail.fill(0);
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:320px;z-index:-1';
    document.body.appendChild(cv);
    const R = LandRender.create(cv, null);
    R.reset(st, { me: 0 });
    const W = st.W, cells = [];
    const x0 = 6, y0 = 6, x1 = 16, y1 = 16;
    R.beforeTick();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { st.owner[y * W + x] = 1; cells.push(y * W + x); }
    R.afterTick([{ t: 'capture', p: 0, x: x0, y: y0, cells, n: cells.length }]);
    const ctx = cv.getContext('2d');
    const px = c => { const [sx, sy] = R.screenOf(R.cellCenter(c)[0], R.cellCenter(c)[1]); const d = ctx.getImageData(Math.round(sx * (cv.width / 320)), Math.round(sy * (cv.height / 320)), 1, 1).data; return [d[0], d[1], d[2]]; };
    // 종이 색 (땅이 아닌 칸) 과 먹은 칸 중 가장 늦게 솟는 칸(첫 칸에서 가장 먼 칸)
    const far = cells.reduce((b, c) => (Math.hypot(R.cellCenter(c)[0] - R.cellCenter(cells[0])[0], R.cellCenter(c)[1] - R.cellCenter(cells[0])[1]) > Math.hypot(R.cellCenter(b)[0] - R.cellCenter(cells[0])[0], R.cellCenter(b)[1] - R.cellCenter(cells[0])[1]) ? c : b), cells[0]);
    const blank = 10 * W + 22;                                       // 땅이 아닌 칸 (화면 안)
    const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    const log = [];
    let seenPainted = false, reverted = -1;
    for (let i = 0; i < 40; i++) {
      R.frame(0, 0.03);
      const painted = dist(px(far), px(blank)) > 40;                // 종이와 다른 색인가
      const busy = R.busy;
      log.push((painted ? 'P' : '.') + (busy ? '*' : ' '));
      if (painted) seenPainted = true;
      else if (seenPainted && reverted < 0) reverted = i;           // 한 번 칠해졌다가 다시 종이색으로 돌아감
    }
    return { seenPainted, reverted, log: log.join(''), left: R.check() };
  });
  T.ok(r.seenPainted, '(시험 조건) 가장 늦게 솟는 칸도 결국 칠해짐 ' + r.log);
  T.ok(r.reverted < 0, `15 움직임이 끝나는 프레임에 칠한 칸이 종이색으로 돌아가면 안 됨 (${r.reverted} 번째 프레임: ${r.log})`);
  T.ok(r.left.diff === 0 && r.left.stale === 0, '움직임이 끝나면 그린 땅 = 규칙 상태 ' + JSON.stringify(r.left));
}, '땅따먹기 그리기');

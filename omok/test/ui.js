// 오목 화면 시험 (브라우저, 소리 없음): node omok/test/ui.js
//   9 친구랑에서 Z·Backspace 로 무르기가 되어 내 판만 수가 빠지던 것 (단추는 숨겨 놓았는데 키는 살아 있었음)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/omok');

U.main(async T => {
  const { H, W } = await T.pair(A);
  // 안내 창 닫기
  for (const p of [H, W]) await p.evaluate(() => { for (let i = 0; i < 3; i++) { const b = [...document.querySelectorAll('.overlay button')].find(x => /^알겠어요$/.test(x.textContent.trim())); if (b) b.click(); } });
  // 번갈아 네 수 (먼저 둘 차례인 쪽에서)
  const picks = [112, 0, 114, 14];
  for (const i of picks) {
    let done = false;
    for (let t = 0; t < 60 && !done; t++) {
      for (const p of [H, W]) {
        done = await p.evaluate(i => { const G = __omok.G; if (G && __omok.seats.canMove(G.seats, G.cfg.uid, G.s)) { __omok.play(i); return true; } return false; }, i);
        if (done) break;
      }
      if (!done) await T.sleep(100);
    }
    T.ok(done, `${i} 번 칸에 둠`);
    await T.sleep(250);
  }
  const moves = p => p.evaluate(() => __omok.G.s.moves.length);
  await T.waitFor(W, () => __omok.G.s.moves.length === 4, null, 5000);
  T.ok((await moves(H)) === 4 && (await moves(W)) === 4, '두 화면 모두 4수');
  for (const p of [H, W]) {
    for (const key of ['z', 'Z', 'Backspace']) {
      await p.keyboard.press(key);
      await T.sleep(200);
      T.ok((await moves(p)) === 4, `친구랑에서 '${key}' 키로 무르기가 되면 안 됨 (${(await moves(p))}수)`);
    }
    // 키를 거치지 않고 함수로 불러도 막혀야 함 (손잡이)
    await p.evaluate(() => __omok.undo());
    T.ok((await moves(p)) === 4, '친구랑에서 undo() 를 직접 불러도 안 됨');
  }
  T.ok((await moves(H)) === 4 && (await moves(W)) === 4, '두 화면의 수가 그대로');
}, '오목 화면');

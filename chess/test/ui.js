// 체스 화면 시험 (브라우저, 소리 없음): node chess/test/ui.js
//   72 친구랑 시간 초과: 손님이 시계 0 에서도 둘 수 있던 것 + 방장의 시간 초과 'end' 를 손님이 받을 때 승자가 거꾸로 되던 것
const U = require('../../test/qa/lib/uitest');
const A0 = require('../../test/qa/adapters/chess');

// 시계 5분으로 방을 만듦 (대기실의 시계 단추)
const A5 = Object.assign({}, A0, { online: Object.assign({}, A0.online, { beforeStart: () => { const b = document.querySelector('#fClkSeg button[data-v="5"]'); if (b) b.click(); } }) });

// 칸을 손가락으로 누른 것처럼 (어댑터 H.tap 과 같은 길)
const tap = sq => {
  const b = __chess.board, el = b.el, r = el.getBoundingClientRect(), d = b.disp(sq);
  const x = r.left + (d[0] + 0.5) * r.width / 8, y = r.top + (d[1] + 0.5) * r.height / 8;
  for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 }));
};
const mv = (p, from, to) => p.evaluate(([f, t, fn]) => { const tp = eval('(' + fn + ')'); tp(f); tp(t); }, [from, to, tap.toString()]);
const moves = p => p.evaluate(() => __chess.G.s.moves.join(' '));

U.main(async T => {
  const closeHow = p => p.evaluate(() => { for (let i = 0; i < 3; i++) { const b = [...document.querySelectorAll('.overlay button')].find(x => /^알겠어요$/.test(x.textContent.trim())); if (b) b.click(); } });

  // ── 72a) 손님이 시계 0 에서 둘 수 없어야 함
  {
    const { H, W } = await T.pair(A5);
    await closeHow(H); await closeHow(W);
    const hasClock = await H.evaluate(() => !!__chess.G.clock);
    T.ok(hasClock, '72 (시험 조건) 시계가 켜진 방');
    const meBlack = await W.evaluate(() => __chess.G.me);
    T.ok(meBlack === 'b', '72 (시험 조건) 손님이 흑');
    await mv(H, 'e2', 'e4');
    T.ok(!!(await T.waitFor(W, () => __chess.G.s.moves.length === 1, null, 5000)), '72 손님 화면에 e2e4');
    await W.evaluate(() => { __chess.G.clock.b = 0; __chess.G.clock.at = performance.now(); });   // 손님 기기 시계: 흑 0
    await T.sleep(300);
    await mv(W, 'e7', 'e5');
    await T.sleep(600);
    const a = await moves(W), b = await moves(H);
    T.ok(a === 'e2e4' && b === 'e2e4', `72 손님이 시계 0 에서 e7e5 를 둘 수 있으면 안 됨 (손님 '${a}', 방장 '${b}')`);
  }

  // ── 72b) 방장의 시간 초과 'end' 는 e.winner 대로 (손님 화면에서 차례가 이미 넘어간 경우에도)
  {
    const { H, W } = await T.pair(A0);
    await closeHow(H); await closeHow(W);
    await mv(H, 'e2', 'e4');
    T.ok(!!(await T.waitFor(W, () => __chess.G.s.moves.length === 1, null, 5000)), '72 손님 화면에 e2e4');
    await mv(W, 'e7', 'e5');
    T.ok(!!(await T.waitFor(H, () => __chess.G.s.moves.length === 2, null, 5000)), '72 방장 화면에 e7e5');
    // 방장이 "흑이 시간 초과 → 백 승" 을 알림 (손님 화면은 이미 백 차례 — 흑이 둔 뒤 도착한 경우)
    await H.evaluate(() => { const G = __chess.G; ArenaUI.net.broadcast({ t: 'end', round: G.round, winner: 'w', reason: 'time' }, true); });
    const ok = await T.waitFor(W, () => __chess.G.over, null, 5000);
    T.ok(!!ok, '72 손님 화면이 끝남');
    const r = await W.evaluate(() => ({ winner: __chess.G.s.winner, reason: __chess.G.s.reason }));
    T.ok(r.winner === 'w' && r.reason === 'time', `72 방장이 알린 승자(백)대로 끝나야 함 (손님 화면: 승자 ${r.winner}, 이유 ${r.reason})`);
  }
}, '체스 화면');

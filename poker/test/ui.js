// 포커(홀덤) 화면 시험 (브라우저, 소리 없음): node poker/test/ui.js  (친구랑 mock — 방장 + 손님 + 구경꾼)
//   49 은행 방에서 핸드 사이에 구경꾼을 앉히면 기본 연습 칩으로 앉고 은행 장부에는 안 잡혀, 연습 칩이 장부 손익에 섞이던 것
//      → 은행 방은 새 게임(장부를 다시 읽는 때)부터 앉힘. 핸드 사이엔 구경꾼 체크 칸이 없고 자리도 안 늘어남
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/poker');

U.main(async T => {
  const { H, W, code } = await T.pair(A);
  const bank = await H.evaluate(() => !!(__poker.ses && __poker.ses.bank));
  T.ok(bank, '49 시험 방이 은행 방임 (기본 은행)');
  const S = await T.open('poker/', 'room=' + code);                         // 구경꾼
  await U.waitFor(S, A.ready, null, 15000);
  await U.waitFor(H, () => Object.keys(ArenaUI.net.players || {}).length >= 3, null, 15000);
  await T.sleep(800);
  // 이번 핸드가 끝나 결과 창이 뜰 때까지 (결과 창은 건드리지 않고 멈춤)
  const ended = p => p.evaluate(() => { const m = document.getElementById('endModal'); return !!(m && !m.hidden); });
  let end = false;
  for (let i = 0; i < 600 && !end; i++) {
    end = await ended(H);
    if (!end) { await Promise.all([H, W].map(p => p.evaluate(A.online.drive).catch(() => {}))); await T.sleep(120); }
  }
  T.ok(end, '49 한 핸드가 끝나 결과 창이 뜸');
  await T.sleep(500);
  const seen = await H.evaluate(() => ({ join: document.querySelectorAll('#endModal [data-join]').length, rdy: (document.querySelector('#endModal .rdy') || {}).textContent || '' }));
  T.ok(seen.join === 0, '49 은행 방 핸드 사이엔 구경꾼 체크 칸이 없음 (' + seen.join + ') — ' + seen.rdy.replace(/\s+/g, ' ').slice(0, 80));
  // 구경꾼이 '다음 핸드에 낄래요', 손님은 ✋ 준비 → 방장이 다음 핸드
  await S.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) b.click(); });
  await W.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) b.click(); });
  let next = false;
  for (let i = 0; i < 60 && !next; i++) {
    next = await H.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) { b.click(); return true; } return false; });
    if (!next) await T.sleep(250);
  }
  T.ok(next, '49 방장이 다음 핸드로 넘어감');
  let r = null;
  for (let i = 0; i < 60; i++) {
    r = await H.evaluate(() => { const s = __poker.ses.S, b = __poker.ses.bank; return { round: s.round, n: s.n, coins: s.coins.slice(), seats: __poker.ses.seats.length, tracked: s.coins.map((_, i) => !!b.tracks(i)) }; });
    if (r.round >= 2) break;
    await T.sleep(250);
  }
  T.ok(r && r.round >= 2, '49 다음 핸드가 시작됨 (' + (r && r.round) + ')');
  T.ok(r && r.n === 2 && r.seats === 2, '49 핸드 사이엔 구경꾼을 앉히지 않음 — 자리 ' + (r && r.n));
  T.ok(r && r.tracked.every(Boolean), '49 앉은 모든 자리가 은행 장부에 잡혀 있음 ' + (r && r.tracked.join()));
}, 'poker ui');

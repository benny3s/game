// 포커(홀덤) 화면 시험 (브라우저, 소리 없음): node poker/test/ui.js  (친구랑 mock — 방장 + 손님 + 구경꾼)
//   49 은행 방에서 핸드 사이에 구경꾼을 앉히면 기본 연습 칩으로 앉고 은행 장부에는 안 잡혀, 연습 칩이 장부 손익에 섞이던 것
//      → 11-01 처음엔 새 게임부터만 앉혔다가, 원카드·섯다와 같이 다음 핸드부터 장부 잔액으로 앉히고 장부에 묶음 (Bank reseat)
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
  const n0 = await H.evaluate(() => __poker.ses.seats.length);
  // 구경꾼이 '다음 핸드에 낄래요', 손님은 ✋ 준비 → 방장이 다음 핸드
  T.ok(!!(await U.waitFor(S, () => { const b = document.querySelector('#endModal #endBtns button.primary'); return b && !b.disabled; }, null, 25000)), '49 구경꾼에게도 결과 창');
  const lab = await S.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) { const t = b.textContent; b.click(); return t; } return null; });
  T.ok(/다음 핸드에 낄래요/.test(lab || ''), '49 구경꾼 단추 = 다음 핸드에 낄래요 (' + lab + ')');
  T.ok(!!(await U.waitFor(H, () => document.querySelectorAll('#endModal [data-join]:checked').length === 1, null, 8000)), '49 방장 화면에 구경꾼 체크 (낄래요 → 자동 체크)');
  await W.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) b.click(); });
  let next = false;
  for (let i = 0; i < 60 && !next; i++) {
    next = await H.evaluate(() => { const b = document.querySelector('#endModal #endBtns button.primary'); if (b && !b.disabled) { b.click(); return true; } return false; });
    if (!next) await T.sleep(250);
  }
  T.ok(next, '49 방장이 다음 핸드로 넘어감');
  const r = await U.waitFor(H, n0 => { const ses = __poker.ses, s = ses.S, b = ses.bank; if (!s || s.round < 2) return null; return { round: s.round, n: s.n, seats: ses.seats.length, stack: s.coins[n0] + s.totalBets[n0], tracked: s.coins.map((_, i) => !!b.tracks(i)), pid: b.pidOf(n0) }; }, n0, 15000);
  T.ok(r && r.round >= 2, '49 다음 핸드가 시작됨 (' + (r && r.round) + ')');
  T.ok(r && r.n === n0 + 1 && r.seats === n0 + 1, '49 다음 핸드에 구경꾼이 앉음 (' + n0 + ' → ' + (r && r.n) + ')');
  T.ok(r && r.tracked.every(Boolean), '49 앉은 모든 자리가 은행 장부에 잡혀 있음 ' + (r && r.tracked.join()));
  const bal = r && r.pid ? await H.evaluate(pid => Bank.getMembers(__poker.ses.bank.gid).then(m => (m[pid] ? m[pid].balance : null)), r.pid) : null;
  T.ok(r && bal != null && r.stack === bal, '49 새 자리 칩(블라인드 포함) = 장부 잔액 (' + (r && r.stack) + ' / ' + bal + ')');
}, 'poker ui');

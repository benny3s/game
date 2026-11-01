// 섯다 화면 시험 (브라우저, 소리 없음): node seotda/test/ui.js  (친구랑 mock — 방장 + 손님 + 구경꾼)
//   은행 방에서 판 사이에 구경꾼이 앉으면 기본 연습 칩으로 앉고 은행 장부에는 안 잡혀, 연습 칩이 장부 손익에 섞이던 것 (홀덤 49 와 같은 문제)
//      → 새 자리도 장부에 묶어 장부 잔액으로 앉힘 (Bank reseat)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/seotda');

U.main(async T => {
  const { H, W, code } = await T.pair(A);
  T.ok(await H.evaluate(() => !!(__seotda.ses && __seotda.ses.bank)), '합류 시험 방이 은행 방임 (기본 은행)');
  const S = await T.open('seotda/', 'room=' + code);                         // 구경꾼
  await U.waitFor(S, A.ready, null, 15000);
  await U.waitFor(H, () => Object.keys(ArenaUI.net.players || {}).length >= 3, null, 15000);
  await Promise.all([H, W].map(p => p.evaluate(A.online.setup)));
  const n0 = await H.evaluate(() => __seotda.ses.seats.length);
  const ended = p => p.evaluate(() => { const r = document.getElementById('resBox'); return !!(r && !r.hidden); });
  let end = false;
  for (let i = 0; i < 600 && !end; i++) {
    end = await ended(H);
    if (!end) { await Promise.all([H, W].map(p => p.evaluate(A.online.drive).catch(() => {}))); await T.sleep(120); }
  }
  T.ok(end, '합류 한 판이 끝나 결과 창이 뜸');
  T.ok(!!(await U.waitFor(S, () => { const r = document.getElementById('resBox'); return r && !r.hidden; }, null, 25000)), '합류 구경꾼에게도 결과 창');
  const lab = await S.evaluate(() => { const b = document.querySelector('#resBtns .btn.primary'); if (b && !b.disabled) { const t = b.textContent; b.click(); return t; } return null; });
  T.ok(/낄래요/.test(lab || ''), '합류 구경꾼이 낄래요를 누름 (' + lab + ')');
  await W.evaluate(() => { const b = document.querySelector('#resBtns .btn.primary'); if (b && !b.disabled) b.click(); });
  let next = false;
  for (let i = 0; i < 60 && !next; i++) {
    next = await H.evaluate(() => { const b = document.querySelector('#resBtns .btn.primary'); if (b && !b.disabled) { b.click(); return true; } return false; });
    if (!next) await T.sleep(250);
  }
  T.ok(next, '합류 방장이 다음 판을 시작');
  const r = await U.waitFor(H, n0 => { const ses = __seotda.ses, s = ses.S; if (!s || s.round < 2 || ses.seats.length <= n0) return null; return { round: s.round, n: s.n, seats: ses.seats.length, stack: s.coins[n0] + s.bets[n0], tracked: ses.seats.map((_, i) => ses.bank.tracks(i)), pid: ses.bank.pidOf(n0) }; }, n0, 15000);
  T.ok(r && r.n === n0 + 1 && r.seats === n0 + 1, '합류 다음 판에 구경꾼이 앉음 (' + n0 + ' → ' + (r && r.n) + ')');
  T.ok(r && r.tracked.every(Boolean), '합류 앉은 모든 자리가 은행 장부에 잡힘 ' + (r && r.tracked.join()));
  const bal = r && r.pid ? await H.evaluate(pid => Bank.getMembers(__seotda.ses.bank.gid).then(m => (m[pid] ? m[pid].balance : null)), r.pid) : null;
  T.ok(r && bal != null && r.stack === bal, '합류 새 자리 칩(학교비 포함) = 장부 잔액 (' + (r && r.stack) + ' / ' + bal + ')');
}, 'seotda ui');

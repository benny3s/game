// 원카드 화면 시험 (브라우저, 소리 없음): node onecard/test/ui.js  (친구랑 mock — 방장 + 손님 둘)
//   5  나간 사람 창이 열려 있을 때 두 번째로 나간 사람은 물어보지 않고 끝나 → 그 사람 차례에 판이 멈추던 것 (줄 세워 차례로 물음)
//   30 이미 '빼기'로 정한 자리를 세지 않아 3명 방에서 둘을 다 빼면 다음 판이 1명이 되던 것 (빼기 표시 없는 자리 수로 판단)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/onecard');

// 방장 H + 손님 둘 G[0..1] 이 3명으로 판을 시작한 상태
async function room3(T) {
  const O = A.online;
  const H = await T.open('onecard/');
  if (!(await U.waitFor(H, A.ready, null, 15000))) throw new Error('방장 화면 준비 안 됨');
  await T.sleep(400);
  await H.evaluate(O.open);
  if (!(await U.waitFor(H, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; }, null, 8000))) throw new Error('방 만들기 단추 없음');
  await H.click('[data-host]');
  const code = await U.waitFor(H, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, null, 15000);
  if (!code) throw new Error('방 코드 안 생김');
  const G = [];
  for (let k = 0; k < 2; k++) {
    const g = await T.open('onecard/', 'room=' + code);
    if (!(await U.waitFor(g, A.ready, null, 15000))) throw new Error('손님 화면 준비 안 됨');
    G.push(g);
  }
  if (!(await U.waitFor(H, () => Object.keys(ArenaUI.net.players || {}).length >= 3, null, 15000))) throw new Error('손님 둘이 안 들어옴');
  if (!(await U.waitFor(H, () => { const b = document.querySelector('[data-start]'); return b && !b.disabled && __qa.vis(b); }, null, 10000))) throw new Error('시작 단추 꺼져 있음');
  await H.click('[data-start]');
  const st = await Promise.all([H, ...G].map(p => U.waitFor(p, O.started, null, 20000)));
  if (st.some(x => !x)) throw new Error('판이 시작 안 됨 ' + st.join());
  const n = await H.evaluate(() => __onecard.ses.seats.length);
  if (n !== 3) throw new Error('3명이 아님 (' + n + ')');
  return { H, G, close: async () => { for (const p of [H, ...G]) await p.close().catch(() => {}); } };
}
const uidOf = (p, i) => p.evaluate(i => __onecard.ses.seats[i].uid, i);
const asked = p => p.evaluate(() => { const g = __onecard.ses.goneAsk; return g ? g.uid : null; });
const clickBtn = (p, src) => p.evaluate(src => { const b = [...document.querySelectorAll('.overlay button')].find(b => new RegExp(src).test(b.textContent)); if (b) b.click(); return !!b; }, src);
const dialogBtns = p => p.evaluate(() => [...document.querySelectorAll('.overlay button')].map(b => b.textContent.trim()));
const leave = g => g.evaluate(() => ArenaUI.net.leave());

U.main(async T => {
  // ── 5) 두 사람이 거의 같이 나감 — 첫 창이 열린 채로 두 번째 5초 타이머가 지나감
  {
    const R = await room3(T), { H, G } = R;
    const [u1, u2] = [await uidOf(H, 1), await uidOf(H, 2)];
    await Promise.all(G.map(leave));
    let first = null;
    for (let i = 0; i < 80 && !first; i++) { first = await asked(H); if (!first) await T.sleep(250); }
    T.ok(first === u1 || first === u2, '5 첫 나간 사람 창이 뜸');
    await T.sleep(1500);                                          // 두 번째 사람의 5초 타이머도 지난 뒤 (창은 열려 있음)
    T.ok(await clickBtn(H, '기다리기'), '5 첫 창에서 ⏳ 기다리기');
    let second = null;
    for (let i = 0; i < 20 && !second; i++) { second = await asked(H); if (!second) await T.sleep(150); }
    T.ok(second && second !== first && (second === u1 || second === u2), '5 첫 창을 닫으면 두 번째로 나간 사람 창이 이어서 뜸 (' + second + ')');
    if (second) {
      T.ok(await clickBtn(H, '중급 AI가 대신'), '5 두 번째 창에서 🤖 중급 AI가 대신');
      await T.sleep(200);
      T.ok(await asked(H) === null, '5 창이 다 닫힘');
      T.ok(await H.evaluate(u => { const x = __onecard.ses.seats.find(s => s.uid === u); return !!(x && x.sub); }, second), '5 두 번째 사람 자리를 AI 가 대신함');
    }
    await R.close();
  }

  // ── 은행 방 판 사이 합류: 구경꾼이 '다음 판에 낄래요' → 다음 판에 연습 칩이 아니라 장부 잔액으로 앉고 장부에도 잡힘
  //    (전엔 연습 칩으로 앉고 장부엔 안 잡혀 연습 칩이 장부 손익에 섞였음 — 홀덤 49 와 같은 문제)
  {
    const { H, W, code } = await T.pair(A);
    T.ok(await H.evaluate(() => !!(__onecard.ses && __onecard.ses.bank)), '합류 시험 방이 은행 방임 (기본 은행)');
    const S = await T.open('onecard/', 'room=' + code);                        // 구경꾼
    await U.waitFor(S, A.ready, null, 15000);
    await U.waitFor(H, () => Object.keys(ArenaUI.net.players || {}).length >= 3, null, 15000);
    await Promise.all([H, W].map(p => p.evaluate(A.online.setup)));
    await S.evaluate(() => __onecard.fast(1));                                // 구경꾼 화면도 빨리 감기 (안 하면 보여 주기 애니메이션이 늦어 결과 창이 늦게 뜸)
    const n0 = await H.evaluate(() => __onecard.ses.seats.length);
    const ended = p => p.evaluate(() => { const r = document.getElementById('resBox'); return !!(r && !r.hidden); });
    let end = false;
    for (let i = 0; i < 600 && !end; i++) {
      end = await ended(H);
      if (!end) { await Promise.all([H, W].map(p => p.evaluate(A.online.drive).catch(() => {}))); await T.sleep(120); }
    }
    T.ok(end, '합류 한 판이 끝나 결과 창이 뜸');
    T.ok(!!(await U.waitFor(S, () => { const r = document.getElementById('resBox'); return r && !r.hidden; }, null, 25000)), '합류 구경꾼에게도 결과 창');
    const lab = await S.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) { const t = b.textContent; b.click(); return t; } return null; });
    T.ok(/낄래요/.test(lab || ''), '합류 구경꾼이 낄래요를 누름 (' + lab + ')');
    await W.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) b.click(); });
    let next = false;
    for (let i = 0; i < 60 && !next; i++) {
      next = await H.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) { b.click(); return true; } return false; });
      if (!next) await T.sleep(250);
    }
    T.ok(next, '합류 방장이 다음 판을 시작');
    const r = await U.waitFor(H, n0 => { const ses = __onecard.ses, s = __onecard.state; if (!s || s.round < 2 || ses.seats.length <= n0) return null; return { round: s.round, n: ses.seats.length, chips: ses.chips.slice(), tracked: ses.seats.map((_, i) => ses.bank.tracks(i)), pid: ses.bank.pidOf(n0) }; }, n0, 15000);
    T.ok(r && r.n === n0 + 1, '합류 다음 판에 구경꾼이 앉음 (' + n0 + ' → ' + (r && r.n) + ')');
    T.ok(r && r.tracked.every(Boolean), '합류 앉은 모든 자리가 은행 장부에 잡힘 ' + (r && r.tracked.join()));
    const bal = r && r.pid ? await H.evaluate(pid => Bank.getMembers(__onecard.ses.bank.gid).then(m => (m[pid] ? m[pid].balance : null)), r.pid) : null;
    T.ok(r && bal != null && r.chips[n0] === bal, '합류 새 자리 칩 = 장부 잔액 (' + (r && r.chips[n0]) + ' / ' + bal + ')');
    for (const p of [H, W, S]) await p.close().catch(() => {});
  }

  // ── 30) 3명 방에서 한 명을 '다음 판부터 빼기'로 정한 뒤엔 둘째는 못 뺌 (창 · 결과 창 '👋 빼기')
  {
    await T.ctx.addInitScript(() => { try { localStorage.setItem('onecard.bank', 'null'); } catch (e) {} });   // 은행 방은 자리를 못 빼니 연습 칩 방으로
    const R = await room3(T), { H, G } = R;
    await Promise.all([H, ...G].map(p => p.evaluate(A.online.setup)));
    let end = false;
    for (let i = 0; i < 400 && !end; i++) {                      // 한 판 끝까지 (빨리 감기 · 자동 응답)
      await Promise.all([H, ...G].map(p => p.evaluate(A.online.drive).catch(() => {})));
      end = await H.evaluate(() => { const r = document.getElementById('resBox'); return !!(r && !r.hidden); });
      if (!end) await T.sleep(150);
    }
    T.ok(end, '30 한 판이 끝나 결과 창이 뜸');
    await Promise.all([H, ...G].map(p => p.evaluate(A.online.pause)));
    const u1 = await uidOf(H, 1);
    await leave(G[0]);
    let a = null;
    for (let i = 0; i < 80 && !a; i++) { a = await asked(H); if (!a) await T.sleep(250); }
    T.ok(a === u1, '30 첫 나간 사람 창이 뜸');
    const b1 = await dialogBtns(H);
    T.ok(b1.some(t => /👋 이번 판만 AI · 다음 판부터 빼기 \(2명\)/.test(t)), '30 3명일 땐 빼기 단추 (2명이 남음): ' + b1.join(' / '));
    T.ok(await clickBtn(H, '다음 판부터 빼기'), '30 한 명 빼기');
    await T.sleep(300);
    await leave(G[1]);
    let b = null;
    for (let i = 0; i < 80 && !b; i++) { b = await asked(H); if (!b) await T.sleep(250); }
    T.ok(!!b && b !== u1, '30 둘째 나간 사람 창이 뜸');
    const b2 = await dialogBtns(H);
    T.ok(!b2.some(t => /빼기/.test(t)), '30 이미 한 명을 빼기로 했으면 둘째는 빼기 단추가 없음: ' + b2.join(' / '));
    T.ok(await clickBtn(H, '기다리기'), '30 ⏳ 기다리기');
    await T.sleep(500);
    const row = await H.evaluate(() => ({ ai: document.querySelectorAll('#resBody [data-ai]').length, drop: document.querySelectorAll('#resBody [data-drop]').length }));
    T.ok(row.ai === 1, '30 결과 창에 둘째에게 🤖 AI 단추 (' + row.ai + ')');
    T.ok(row.drop === 0, '30 결과 창에 👋 빼기 단추가 없음 (' + row.drop + ')');
    const keep = await H.evaluate(() => __onecard.ses.seats.filter(x => !x.drop).length);
    T.ok(keep >= 2, '30 빼기로 정하지 않은 자리가 2명 이상 (' + keep + ')');
    await R.close();
  }
}, 'onecard ui');

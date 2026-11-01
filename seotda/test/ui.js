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

  // ── 🧑‍🏫 선생님 흐름 (11-01 베니 님 '상대 흐름 · 내 흐름 · 수의 의미'): 혼자 3명, 선생님 켬
  //    내 차례마다 창에 👀 상대 흐름 · 📊 내 흐름 · 👉 수의 의미 — 추천(제목 줄)이 먼저 뜨고 읽기는 뒤에 채워지며, 상대의 숨은 패 이름은 어디에도 없음
  {
    const P = await T.open('seotda/');
    await U.waitFor(P, A.ready, null, 15000);
    await P.evaluate(() => {
      localStorage.setItem('cozy.sound2', 'false');
      window.__snaps = [];
      const take = () => {
        const b = document.querySelector('.cpn-body'), ses = window.__seotda && __seotda.ses;
        if (!b || !ses || !ses.S) return;
        const last = window.__snaps[window.__snaps.length - 1], html = b.innerHTML;
        if (last && last.html === html) return;
        window.__snaps.push({ html, text: b.innerText, open: !document.querySelector('.cpn').hidden, hid: ses.S.hands.map((h, q) => (q ? Seotda.cardName(h[1]) : '')).filter(Boolean), my: !!ses.pending });
      };
      new MutationObserver(take).observe(document.body, { subtree: true, childList: true, characterData: true });
      const q = s => document.querySelector(s);
      q('#tabSolo').click(); q('#modeSeg [data-v="3"]').click(); q('#tiers [data-id="normal"]').click(); q('#startBtn').click();
    });
    await U.waitFor(P, () => __seotda.ses && __seotda.ses.cp, null, 10000);
    await P.evaluate(() => { __seotda.ses.cp.collapse(false); });                    // 처음엔 동그라미로 접혀 있음 → 펼쳐서 줄바꿈까지 읽음
    let turns = 0, idle = 0, withRead = 0;
    for (let i = 0; i < 260 && turns < 14; i++) {
      const r = await P.evaluate(() => {
        const ses = __seotda.ses; if (!ses) return { none: 1 };
        const rb = document.getElementById('resBox');
        if (rb && !rb.hidden) { const b = rb.querySelector('#resBtns .btn.primary'); if (b && !b.disabled) b.click(); return { next: 1 }; }
        if (!ses.pending) return { wait: 1 };
        const b = document.querySelector('.cpn-body');
        return { my: 1, ready: !!(b && /📊/.test(b.innerText)), street: ses.S.street };
      });
      if (!r || r.none) break;
      if (!r.my) { idle = 0; await T.sleep(120); continue; }
      if (!r.ready && idle++ < 25) { await T.sleep(120); continue; }       // 읽기가 뒤에 채워지길 잠깐 기다림
      idle = 0; turns++;
      await P.evaluate(() => {                                              // 2차에선 하프로 판을 키워 상대 반응(재레이즈)을 끌어냄
        const btns = [...document.querySelectorAll('#betGrid .bet-btn')].filter(b => !b.disabled);
        const pick = btns.find(b => b.dataset.a === '3' && __seotda.ses.S.street === 2) || btns.find(b => b.dataset.a === '1') || btns[0];
        if (pick) pick.click();
      });
      await T.sleep(150);
    }
    const snaps = await P.evaluate(() => window.__snaps);
    const full = snaps.filter(s => s.my && /👀/.test(s.text) && /📊/.test(s.text) && /👉/.test(s.text));
    T.ok(turns >= 4, `선생님 흐름: 내 차례 ${turns}번 진행`);
    T.ok(full.length >= 3, `선생님 창에 👀 · 📊 · 👉 세 줄이 모두 있는 내 차례 ${full.length}번`);
    T.ok(full.length > 0 && full.every(s => s.html.indexOf('cp-title') >= 0 && s.html.indexOf('cp-title') < s.html.indexOf('👀')), '추천(제목 줄)이 👀 · 📊 · 👉 보다 먼저');
    const firstPaint = snaps.findIndex(s => s.my && /cp-title/.test(s.html) && !/📊/.test(s.html));
    const filled = snaps.findIndex((s, k) => k > firstPaint && /📊/.test(s.html));
    T.ok(firstPaint >= 0 && filled > firstPaint, `추천이 먼저 뜨고 읽기는 뒤에 채워짐 (${firstPaint} → ${filled})`);
    const leaks = snaps.filter(s => s.hid.some(n => s.text.includes(n)));
    T.ok(leaks.length === 0, `선생님 창에 상대의 숨은 패 이름이 없음 (${leaks.length}곳)`);
    const lineBad = full.filter(s => s.open && s.text.split('\n').filter(x => /^(👀|📊|👉)/.test(x.trim())).length < 3);
    T.ok(full.length > 0 && !lineBad.length, '줄이 따로따로 (👀 · 📊 · 👉 각각 한 줄) ' + (lineBad.length ? JSON.stringify(lineBad[0].text.slice(0, 160)) : ''));
    withRead = full.filter(s => /👀 [^\n]*(콜|체크|하프|쿼터|따당|다이)/.test(s.text)).length;
    T.ok(withRead >= 1, `👀 줄에 상대가 한 행동이 보임 (${withRead}번)`);
    const sample = full.length ? full[full.length - 1].text.replace(/\n+/g, ' | ') : '';
    console.log('선생님 창 예: ' + sample);
    await P.close();
  }

  // ── 친구랑 (방장이 AI 선생님을 켠 방): 손님 화면에도 👀 · 📊 · 👉 — 방장이 공개된 행동 기록(h)을 같이 보냄. 남의 숨은 패 이름은 없음
  {
    const A2 = Object.assign({}, A, { online: Object.assign({}, A.online, { beforeStart: () => { const c = document.querySelector('[data-coach-sw]'); if (c && !c.checked) c.click(); } }) });
    const { H: H2, W: W2 } = await T.pair(A2);
    const obs = () => {
      window.__snaps = [];
      const take = () => {
        const b = document.querySelector('.cpn-body'), ses = window.__seotda && __seotda.ses;
        if (!b || !ses) return;
        const html = b.innerHTML, last = window.__snaps[window.__snaps.length - 1];
        if (last && last.html === html) return;
        const st = ses.S || ses.V, hid = ses.S ? ses.S.hands.map((h, q) => (q === ses.me ? '' : Seotda.cardName(h[1]))).filter(Boolean) : [];
        window.__snaps.push({ html, text: b.textContent, hid, h: Array.isArray(ses.hist) ? ses.hist.length : -1, street: st ? st.street : 0 });
      };
      new MutationObserver(take).observe(document.body, { subtree: true, childList: true, characterData: true });
    };
    await Promise.all([H2, W2].map(p => p.evaluate(obs)));
    T.ok(await W2.evaluate(() => !!(__seotda.ses && __seotda.ses.coachAvail)), '친구랑: 방장이 켠 선생님이 손님에게도 있음');
    const has3 = p => p.evaluate(() => window.__snaps.some(s => /👀/.test(s.text) && /📊/.test(s.text) && /👉/.test(s.text)));
    let hOk = false, wOk = false, gOk = false;
    for (let i = 0; i < 500 && !(hOk && wOk && gOk); i++) {
      await Promise.all([H2, W2].map(p => p.evaluate(A.online.drive).catch(() => {})));
      await T.sleep(120);
      if (i % 5 === 0) { hOk = hOk || await has3(H2); wOk = wOk || await has3(W2); gOk = gOk || await W2.evaluate(() => window.__snaps.some(s => s.street === 2 && s.h >= 2 && /👀 [^📊]*(콜|체크|하프|쿼터|따당|다이)/.test(s.text))); }
    }
    T.ok(hOk, '친구랑 방장 화면: 👀 · 📊 · 👉');
    T.ok(wOk, '친구랑 손님 화면: 👀 · 📊 · 👉 (공개 행동 기록을 받아서)');
    T.ok(gOk, '손님 화면 👀 줄에 방장이 보낸 상대 행동이 보임');
    const leaks = (await Promise.all([H2, W2].map(p => p.evaluate(() => window.__snaps.filter(s => s.hid.some(n => s.text.includes(n))).length)))).reduce((a, b) => a + b, 0);
    T.ok(leaks === 0, `친구랑 선생님 창에 남의 숨은 패 이름이 없음 (${leaks}곳)`);
  }
}, 'seotda ui');

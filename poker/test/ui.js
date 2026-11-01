// 포커(홀덤) 화면 시험 (브라우저, 소리 없음): node poker/test/ui.js  (친구랑 mock — 방장 + 손님 + 구경꾼)
//   49 은행 방에서 핸드 사이에 구경꾼을 앉히면 기본 연습 칩으로 앉고 은행 장부에는 안 잡혀, 연습 칩이 장부 손익에 섞이던 것
//      → 11-01 처음엔 새 게임부터만 앉혔다가, 원카드·섯다와 같이 다음 핸드부터 장부 잔액으로 앉히고 장부에 묶음 (Bank reseat)
//   50 선생님 읽기 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠음) — 내 차례마다 👀 상대 흐름 · 📊 내 흐름 · 👉 수의 의미, 숨은 카드는 안 새고, 친구 방 손님에게도 뜸
//   51 복기 선생님(그때까지 보인 행동으로 읽음) → '🎮 여기서부터 내가 치기' 연습 판에서도 👀·📊·👉, 페이지 오류 0
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

  // ── 50 선생님 읽기: 혼자 하기 (선생님 켠 채) — 내 차례마다 세 줄이 있어야 하고 남의 숨은 카드 이름은 없어야 함
  {
    const pg = await T.open('poker/');
    await U.waitFor(pg, A.ready, null, 15000);
    await pg.evaluate(() => {
      const q = s => document.querySelector(s);
      q('.seg[data-seg="mode"] [data-val="1p"]').click(); q('#countSeg [data-val="3"]').click(); q('.seg[data-seg="tier"] [data-val="easy"]').click(); q('#goStart').click();
    });
    const turns = [];
    const t0 = Date.now();
    while (turns.length < 6 && Date.now() - t0 < 90000) {
      const r = await pg.evaluate(() => {
        const ses = __poker.ses, em = document.getElementById('endModal');
        if (em && !em.hidden) { const b = em.querySelector('#endBtns button.primary'); if (b && !b.disabled) b.click(); return null; }
        if (!ses || !ses.pending || !ses.cp) return null;
        const S = ses.S, Pk = window.Poker, me = ses.me;
        const hide = S.hands.flatMap((h, q) => (q === me ? [] : h)).map(Pk.cardLabel);
        const open = S.hands[me].concat(S.board).map(Pk.cardLabel);
        const text = ses.cp.body.textContent || '', shown = [...ses.cp.body.children].map(e => e.textContent).join(' ¶ ');
        const btn = document.querySelector('#betBar .bet-btn[data-act="1"]');
        const key = S.round + '|' + S.street + '|' + S.pot + '|' + S.turn;
        if (!text || !btn || btn.disabled) return null;
        return { key, text, shown, street: S.street, leak: hide.filter(l => !open.includes(l) && text.includes(l)), act: true };
      });
      if (r && r.act && !turns.some(x => x.key === r.key)) {
        turns.push(r);
        await pg.evaluate(() => document.querySelector('#betBar .bet-btn[data-act="1"]').click());
      }
      await T.sleep(150);
    }
    T.ok(turns.length >= 3, '50 내 차례를 3번 이상 만남 (' + turns.length + ')');
    T.ok(turns.every(x => /👀/.test(x.text) && /📊/.test(x.text) && /👉/.test(x.text)), '50 내 차례마다 👀·📊·👉 세 줄이 있음 (' + turns.map(x => ['👀', '📊', '👉'].map(e => x.text.includes(e) ? 1 : 0).join('')).join(' ') + ')');
    T.ok(turns.every(x => x.leak.length === 0), '50 남의 숨은 카드 이름이 글에 없음 ' + JSON.stringify(turns.map(x => x.leak)));
    T.ok(turns.every(x => x.text.length < 420), '50 폰 화면에 맞게 짧음 (글자 수 ' + turns.map(x => x.text.length).join(',') + ')');
    T.ok(turns.some(x => x.street >= 1) || turns.length < 3, '50 플랍 이후 차례도 만남 (거리 ' + turns.map(x => x.street).join(',') + ')');
    T.ok(turns.some(x => /체크|콜|벳|레이즈|올인|폴드|아직/.test((x.text.match(/👀[^📊]*/) || [''])[0])), '50 👀 줄에 상대 행동이 말로 있음');
    console.log('   [예시 글] ' + turns.slice(0, 4).map(x => '(거리 ' + x.street + ')\n      ' + x.shown.split(' ¶ ').join('\n      ')).join('\n   [예시 글] '));
    await pg.close();
  }

  // ── 50 친구 방: 방장이 선생님을 켜면 손님 화면(방장이 보낸 공개 기록)에도 👀 줄이 뜸
  {
    const A2 = Object.assign({}, A, { online: Object.assign({}, A.online, { beforeStart: () => { const sw = document.querySelector('[data-coach-sw]'); if (sw && !sw.checked) sw.click(); } }) });
    const { H, W } = await T.pair(A2);
    const on = await W.evaluate(() => !!(__poker.ses && __poker.ses.coachAvail));
    T.ok(on, '50 친구 방: 손님에게도 선생님이 켜짐');
    let got = null;
    for (let i = 0; i < 300 && !got; i++) {
      got = await W.evaluate(() => {
        const ses = __poker.ses, v = ses && ses.V;
        if (!v || v.phase !== 'bet' || v.turn !== ses.me || ses.waiting || !ses.cp) return null;
        const text = ses.cp.body.textContent || '';
        return text ? { text, street: v.street } : null;
      });
      if (!got) { await H.evaluate(A.online.drive).catch(() => {}); await T.sleep(150); }
    }
    T.ok(!!got && /👀/.test(got.text) && /📊/.test(got.text) && /👉/.test(got.text), '50 친구 방 손님 화면에 👀·📊·👉 (' + (got && got.text.replace(/\s+/g, ' ').slice(0, 160)) + ')');
    await H.close(); await W.close();
  }

  // ── 51 복기 · 연습: 지난 판 다시 보기에서 선생님(그 때까지 보인 행동으로 읽음) → '여기서부터 내가 치기' 연습 판에서도 👀 가 뜸 (오류 0)
  {
    const pg = await T.open('poker/');
    await U.waitFor(pg, A.ready, null, 15000);
    const err0 = T.errors.length;
    await pg.evaluate(() => {
      const q = s => document.querySelector(s);
      q('.seg[data-seg="mode"] [data-val="1p"]').click(); q('#countSeg [data-val="3"]').click(); q('.seg[data-seg="tier"] [data-val="easy"]').click(); q('#goStart').click();
    });
    // 첫 핸드가 끝날 때까지 콜 (결과 창이 뜨면 멈춤)
    let ended = false;
    for (let i = 0; i < 400 && !ended; i++) {
      ended = await pg.evaluate(() => {
        const em = document.getElementById('endModal'); if (em && !em.hidden) return true;
        const ses = __poker.ses; if (ses && ses.pending) { const b = document.querySelector('#betBar .bet-btn[data-act="1"]'); if (b && !b.disabled) b.click(); }
        return false;
      });
      if (!ended) await T.sleep(150);
    }
    T.ok(ended, '51 첫 핸드가 끝남');
    const opened = await pg.evaluate(() => { const b = [...document.querySelectorAll('#endBtns button')].find(x => /다시 보기/.test(x.textContent)); if (b) { b.click(); return true; } return false; });
    T.ok(opened, '51 결과 창에 🎞️ 다시 보기 단추');
    T.ok(!!(await U.waitFor(pg, () => !!document.querySelector('.rpgo [data-rg="coach"]'), null, 8000)), '51 다시 보기 화면이 뜸');
    await pg.evaluate(() => { document.querySelector('.rpgo [data-rg="coach"]').click(); document.querySelector('[data-rp="start"]').click(); });
    await T.sleep(500);
    for (let k = 0; k < 2; k++) { await pg.evaluate(() => document.querySelector('[data-rp="next"]').click()); await T.sleep(400); }
    const rp = await pg.evaluate(() => { const el = document.querySelector('.cpn-body') ? [...document.querySelectorAll('.cpn-body')].map(x => x.textContent).join(' | ') : ''; return el; });
    T.ok(/추천/.test(rp) && /실제로/.test(rp), '51 복기 선생님: 추천 vs 실제로 (' + rp.replace(/\s+/g, ' ').slice(0, 90) + ')');
    await pg.evaluate(() => document.querySelector('.rpgo [data-rg="branch"]').click());
    const pr = await U.waitFor(pg, () => { const ses = __poker.ses; return ses && ses.practice && ses.pending && ses.cp ? { text: ses.cp.body.textContent, seed: (ses.alog || []).length } : null; }, null, 15000);
    T.ok(!!pr, '51 🎮 여기서부터 내가 치기 → 연습 판이 열림');
    T.ok(!!pr && /👀/.test(pr.text) && /📊/.test(pr.text) && /👉/.test(pr.text), '51 연습 판에서도 👀·📊·👉 (' + (pr && pr.text.replace(/\s+/g, ' ').slice(0, 100)) + ')');
    T.ok(T.errors.length === err0, '51 복기·연습에서 페이지 오류 없음 ' + JSON.stringify(T.errors.slice(err0)));
    await pg.close();
  }
}, 'poker ui');

// 고스톱 화면 시험 (브라우저, 소리 없음): node gostop/test/ui.js
//   11-01 베니 님: ① 선생님을 켜면 손패 위 기댓값 표시가 '낼 수 있는 패' 노란 막대를 가림 → 표시를 패 아래쪽 안으로
//                  ② 선 뽑기에서 누가 안 누르면 끝없이 기다림 → 5초 안에 안 고르면 자동으로 뽑음 (남은 초 표시)
//                  ③ 친구랑에서 상대 차례에도 몇 초 남았는지 (내 차례는 이미 ⏱ 표시)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/gostop');

const myPlay = () => { const s = __gostop.ses; return !!(s && s.pending && !s.pending.isResult && __gostop.state.phase === 'play' && __gostop.state.turn === s.cfg.me); };
const closeHow = p => p.evaluate(() => document.querySelectorAll('.overlay button').forEach(b => { if (/알겠/.test(b.textContent)) b.click(); }));

U.main(async T => {
  // ── ① 선생님 표시가 노란 막대(낼 수 있는 패)를 가리지 않음
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, A.ready);
    await p.evaluate(() => { localStorage.setItem('cozy.sound2', 'false'); __gostop.start({ seed: 1234, mode: 2, tier: 'easy', rules: { seon: 'off' } }); });
    T.ok(!!(await U.waitFor(p, myPlay, null, 30000)), '① 내 차례');
    await closeHow(p);
    if (!(await p.evaluate(() => __gostop.ses.coachOn))) await p.click('#coachBtn');
    await U.waitFor(p, () => document.querySelectorAll('.hw.mine .ev-badge:not([hidden])').length > 0, null, 10000);
    const r = await p.evaluate(() => [...document.querySelectorAll('.hw.mine.can')].map(el => {
      const bob = el.querySelector('.bob').getBoundingClientRect(), b = el.querySelector('.ev-badge:not([hidden])');
      if (!b) return null;
      const br = b.getBoundingClientRect(), bar = { l: bob.left + 9, r: bob.left + 45, t: bob.top - 15, b: bob.top - 5 };   // style.css .hw.can .bob::before
      return !(br.right <= bar.l || br.left >= bar.r || br.bottom <= bar.t || br.top >= bar.b);
    }).filter(v => v != null));
    T.ok(r.length > 0, '① 낼 수 있는 패에 선생님 표시가 있음 (' + r.length + '장)');
    T.ok(r.every(v => !v), '① 선생님 표시가 노란 막대를 가리지 않음 (' + r.map(v => (v ? '가림' : 'ok')).join(',') + ')');
    await p.close();
  }

  // ── ② 선 뽑기: 안 누르면 5초 뒤 자동으로 뽑고 넘어감 (남은 초가 보임)
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, A.ready);
    await p.evaluate(() => { localStorage.setItem('cozy.sound2', 'false'); __gostop.start({ seed: 77, mode: 2, tier: 'easy', rules: { seon: 'high' } }); });
    T.ok(!!(await U.waitFor(p, () => document.querySelector('.seonbox .seonpick button'), null, 20000)), '② 선 뽑기 창이 뜸');
    const msg = await p.evaluate(() => (document.querySelector('.seonbox .seonmsg') || {}).textContent || '');
    T.ok(/\d+초/.test(msg), '② 남은 초가 보임 (' + msg + ')');
    const auto = await U.waitFor(p, () => document.querySelectorAll('.seonbox .sp.own').length >= 2 || !document.querySelector('.seonbox'), null, 9000);
    T.ok(!!auto, '② 아무도 안 눌러도 5초 뒤 자동으로 뽑음');
    T.ok(!!(await U.waitFor(p, () => !document.querySelector('.seonbox') && __gostop.state && __gostop.state.phase !== 'deal', null, 15000)), '② 선이 정해지고 판이 시작됨');
    await p.close();
  }

  // ── ③ 친구랑: 상대 차례에도 남은 초 (⏱) 가 보임
  {
    const { H, W } = await T.pair(A);
    await closeHow(H); await closeHow(W);
    await Promise.all([H, W].map(p => p.evaluate(() => { __gostop.autoHuman = false; })));   // 손님이 바로 내 버리지 않게 (방장은 아래에서 직접 냄)
    // 방장은 제 차례면 바로 내고, 손님(사람) 차례에 방장 화면 위 줄에 ⏱ 가 뜨는지 (나누기 모습이 끝나 기다리기 시작하면)
    let sub = null, last = '';
    for (let i = 0; i < 120 && !sub; i++) {
      const r = await H.evaluate(() => {
        document.querySelectorAll('.overlay button').forEach(b => { if (/알겠/.test(b.textContent)) b.click(); });
        const ses = __gostop.ses, s = __gostop.state, t = document.getElementById('sub').textContent;
        if (!s || s.phase === 'end') return { t };
        if (s.turn === ses.cfg.me) { if (ses.pending && !ses.pending.isResult) { const L = __gostop.legal(); if (L.length) __gostop.act(L[0]); } return { t }; }   // 내 차례는 무엇이든 (패 내기·가져올 패·고/스톱) 바로
        return { t, opp: ses.seats[ses.who[s.turn]].ctrl === 'remote' };
      });
      last = r.t;
      if (r.opp && /⏱\s*\d+/.test(r.t)) sub = r.t;
      else await T.sleep(250);
    }
    T.ok(!!sub, '③ 상대(손님) 차례에도 방장 화면에 남은 초가 보임 (' + (sub || last) + ')');
    const mine = (await U.waitFor(W, () => { const t = document.getElementById('sub').textContent; return /⏱\s*\d+/.test(t) ? t : null; }, null, 6000)) || await W.evaluate(() => document.getElementById('sub').textContent);
    T.ok(/⏱\s*\d+/.test(mine), '③ 손님 자기 차례 남은 초 (그대로) (' + mine + ')');
  }

  // ── ④ 은행 방 판 사이 합류: 구경꾼이 '다음 판에 낄래요' → 다음 판에 연습 칩이 아니라 장부 잔액으로 앉고 장부·📊 통산 기록에도 잡힘
  //    (전엔 연습 칩으로 앉고 장부엔 안 잡혀 장부 손익에 섞였음 — 원카드·섯다·홀덤과 같은 문제)
  {
    const { H, W, code } = await T.pair(A);
    T.ok(await H.evaluate(() => !!(__gostop.ses && __gostop.ses.bank)), '④ 시험 방이 은행 방임 (기본 은행)');
    const S = await T.open('gostop/', 'room=' + code);                         // 구경꾼
    await U.waitFor(S, A.ready, null, 15000);
    await S.evaluate(() => __gostop.fast(1));
    await U.waitFor(H, () => Object.keys(ArenaUI.net.players || {}).length >= 3, null, 15000);
    const n0 = await H.evaluate(() => __gostop.ses.seats.length);
    const ended = p => p.evaluate(() => { const r = document.getElementById('resBox'); return !!(r && !r.hidden); });
    let end = false;
    for (let i = 0; i < 600 && !end; i++) {
      end = await ended(H);
      if (!end) { await Promise.all([H, W].map(p => p.evaluate(A.online.drive).catch(() => {}))); await T.sleep(120); }
    }
    T.ok(end, '④ 한 판이 끝나 결과 창이 뜸');
    T.ok(!!(await U.waitFor(S, () => { const r = document.getElementById('resBox'); return r && !r.hidden; }, null, 25000)), '④ 구경꾼에게도 결과 창');
    const lab = await S.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) { const t = b.textContent; b.click(); return t; } return null; });
    T.ok(/낄래요/.test(lab || ''), '④ 구경꾼이 낄래요를 누름 (' + lab + ')');
    await W.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) b.click(); });
    let next = false;
    for (let i = 0; i < 60 && !next; i++) {
      next = await H.evaluate(() => { const b = document.querySelector('#resBox .btn.primary'); if (b && !b.disabled) { b.click(); return true; } return false; });
      if (!next) await T.sleep(250);
    }
    T.ok(next, '④ 방장이 다음 판을 시작');
    const r = await U.waitFor(H, n0 => { const ses = __gostop.ses, s = __gostop.state; if (!s || s.round < 2 || ses.seats.length <= n0) return null; return { n: ses.seats.length, chips: ses.chips.slice(), tracked: ses.seats.map((_, i) => ses.bank.tracks(i)), pid: ses.bank.pidOf(n0), on: ses.rel && ses.rel.on.slice() }; }, n0, 15000);
    T.ok(r && r.n === n0 + 1, '④ 다음 판에 구경꾼이 앉음 (' + n0 + ' → ' + (r && r.n) + ')');
    T.ok(r && r.tracked.every(Boolean), '④ 앉은 모든 자리가 은행 장부에 잡힘 ' + (r && r.tracked.join()));
    const bal = r && r.pid ? await H.evaluate(pid => Bank.getMembers(__gostop.ses.bank.gid).then(m => (m[pid] ? m[pid].balance : 0)), r.pid) : null;   // 처음 온 사람은 장부에 줄이 없음 = 0 (고스톱은 시작 돈 없이 0 에서)
    T.ok(r && bal != null && r.chips[n0] === bal, '④ 새 자리 칩 = 장부 잔액 (' + (r && r.chips[n0]) + ' / ' + bal + ')');
    T.ok(r && r.on && r.on.length === n0 + 1 && r.on.every(Boolean), '④ 📊 통산 기록에도 새 자리가 켜짐 ' + (r && r.on && r.on.join()));
    for (const p of [H, W, S]) await p.close().catch(() => {});
  }
}, 'gostop ui');

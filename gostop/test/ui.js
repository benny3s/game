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
}, 'gostop ui');

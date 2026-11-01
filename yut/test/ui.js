// 윷놀이 화면 시험 (브라우저, 소리 없음): node yut/test/ui.js
//   25 AI 선생님: 내 차례마다 💡 추천 + 👉 수의 의미 + 👀 상대 흐름 + 📊 내 흐름 (11-01 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠음) · 위험한 내 말엔 판에 '!'
//   24 친구랑: 손님이 받는 상태에 씨앗이 없어야 하고, 방장이 던질 때마다 난수 상태가 씨앗+횟수에서 벗어나야 함 (개발자도구로 다음 윷 계산 못 하게)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/yut');

U.main(async T => {
  const { H, W } = await T.pair(A);
  // 방장·손님이 차례대로 던지고 옮김 (시험용 autoAct) — 방장이 세 번 이상 던질 때까지
  const C0 = 0x6D2B79F5;
  let r = null;
  for (let i = 0; i < 400; i++) {
    for (const p of [H, W]) await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); __yut.autoAct(); });
    r = await H.evaluate(() => { const S = __yut.ses.S; return { th: S.throwNo, seed: S.seed, rng: S.rng }; });
    if (r.th >= 3) break;
    await T.sleep(150);
  }
  T.ok(r && r.th >= 3, `(시험 조건) 방장이 3번 이상 던짐 (${r && r.th}번)`);
  const hostRng = await H.evaluate(() => __yut.ses.S.rng), hostSeed = await H.evaluate(() => __yut.ses.S.seed);
  const th = await H.evaluate(() => __yut.ses.S.throwNo);
  T.ok(hostRng !== ((hostSeed + 4 * th * C0) | 0), `24 방장의 난수 상태가 씨앗+던진 횟수로 계산되는 값이면 안 됨 (던진 횟수 ${th})`);
  await T.sleep(500);
  const g = await W.evaluate(() => { const S = __yut.ses.S; return { seed: S.seed, rng: S.rng, str: JSON.stringify(S) }; });
  T.ok(g.seed !== hostSeed && g.rng === 0 && g.str.indexOf(String(hostSeed)) < 0, `24 손님이 받은 상태에는 씨앗이 없음 (손님 씨앗 ${g.seed}, 방장 ${hostSeed})`);
  const flowN = p => p.evaluate(() => { const f = __yut.ses.flow; return f ? f.log.length : -1; });
  T.ok((await flowN(H)) > 0 && (await flowN(W)) > 0, `25 방장·손님 모두 선생님이 읽을 사건을 쌓음 (방장 ${await flowN(H)} · 손님 ${await flowN(W)})`);

  // ── 25) 혼자(AI 와) + AI 선생님 켬: 던지기 전엔 👀·📊, 옮기기 때는 💡·👉·👀·📊 (처음엔 상대가 둔 게 없어 '아직', 두 번째 차례부터 상대가 방금 한 일)
  {
    const p = await T.open('yut/');
    T.ok(!!(await U.waitFor(p, A.ready, null, 15000)), '25 (시험 조건) 윷놀이 화면 준비');
    await p.evaluate(A.setup);
    await p.evaluate(A.modes.solo.start, 11);
    T.ok(!!(await U.waitFor(p, () => !document.getElementById('play').hidden && window.__yut.ses && window.__yut.ses.S, null, 8000)), '25 (시험 조건) 판이 시작됨');
    const panel = () => p.evaluate(() => { const b = document.querySelector('.cpn .cpn-body'); const el = document.querySelector('.cpn'); return { txt: b ? b.innerText : '', shown: !!el && !el.hidden }; });
    // 선생님 켜기 (단추)
    await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); });
    T.ok(!!(await U.waitFor(p, () => { const b = document.getElementById('coachBtn'); return b && __qa.vis(b); }, null, 8000)), '25 AI 선생님 단추가 보임');
    await T.sleep(300);
    await p.evaluate(() => { const b = document.getElementById('coachBtn'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
    const throws = [], moves = [];
    for (let i = 0; i < 600 && (moves.length < 4 || !throws.length); i++) {
      const st = await p.evaluate(() => { const ses = __yut.ses; return { can: __yut.canAct(), ph: ses && ses.S ? ses.S.phase : '', seq: ses ? ses.seq : -1, over: !!document.querySelector('.overlay.yres') }; });
      if (st.over) break;
      if (st.can) {
        const pn = await panel();
        const rec = st.ph === 'move' ? moves : throws;
        if (!rec.some(r => r.seq === st.seq)) rec.push({ seq: st.seq, txt: pn.txt, shown: pn.shown });
        await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); __yut.autoAct(); });
      }
      await T.sleep(60);
    }
    T.ok(throws.length >= 1 && moves.length >= 3, '25 (시험 조건) 던지기 ' + throws.length + '번 · 옮기기 ' + moves.length + '번 차례를 봄');
    T.ok(throws.every(r => r.shown && /👀/.test(r.txt) && /📊/.test(r.txt)), '25 던지기 전에도 👀 상대 흐름 · 📊 내 흐름이 보임 — ' + (throws[0] && throws[0].txt.replace(/\n/g, ' / ')));
    T.ok(moves.every(r => r.shown && /💡/.test(r.txt) && /👉/.test(r.txt) && /👀/.test(r.txt) && /📊/.test(r.txt)), '25 옮길 때 💡 추천 · 👉 수의 의미 · 👀 · 📊 가 모두 보임 — ' + (moves[0] && moves[0].txt.replace(/\n/g, ' / ')));
    T.ok(moves.every(r => r.txt.indexOf('💡') < r.txt.indexOf('👀') && r.txt.indexOf('👉') < r.txt.indexOf('📊')), '25 추천이 먼저, 읽기는 뒤');
    T.ok(moves.every(r => r.txt.split('\n').filter(x => x.trim()).length <= 8), '25 줄 수가 길지 않음 (폰 한 화면) — ' + moves.map(r => r.txt.split('\n').filter(x => x.trim()).length).join(','));
    T.ok(moves.every(r => /남은 칸 \d+/.test(r.txt)), '25 📊 에 남은 칸이 숫자로');
    T.ok(moves.slice(1).some(r => /👀[^\n]*(방금|말이)/.test(r.txt)) , '25 두 번째 차례부터 👀 에 상대가 방금 한 일 — ' + (moves[1] && moves[1].txt.replace(/\n/g, ' / ')));
    T.ok(moves.every(r => !/undefined|NaN|null/.test(r.txt)), '25 글에 undefined·NaN 없음');

    // 판 위 '!' : 내 말 바로 뒤에 상대 말을 두고 던지기 전 상태에서 선생님을 껐다 켬
    let st = null;
    for (let i = 0; i < 400 && !st; i++) {
      st = await p.evaluate(() => { const ses = __yut.ses; return __yut.canAct() && ses.S.phase === 'throw' ? { seq: ses.seq } : null; });
      if (!st) { await p.evaluate(() => { __yut.autoAct(); }); await T.sleep(60); }
    }
    T.ok(!!st, '25 (시험 조건) 던질 차례를 만남');
    if (st) {
      await p.evaluate(() => {
        const S = __yut.ses.S; S.pos[0].fill(0); S.pos[1].fill(0); S.pos[0][0] = 5; S.pos[1][0] = 3;
        const b = document.getElementById('coachBtn'); b.click(); b.click();     // 껐다 켜서 다시 그림
      });
      const w = await U.waitFor(p, () => document.querySelectorAll('.tok.warn').length, null, 3000);
      T.ok(w === 1, "25 잡힐 위험이 큰 내 말 위에 '!' 표시 (" + w + "개)");
      const pn = await panel();
      T.ok(/개[^\n]*나오면 잡혀요/.test(pn.txt), '25 👀 에 개가 나오면 잡힌다고 — ' + pn.txt.replace(/\n/g, ' / '));
    }
    await p.close();
  }

  // ── 26) 한 기기에서 여럿: 팀 이름으로 부르고(나 대신), 다음 팀 차례엔 앞 팀이 한 일을 읽어 줌
  {
    const p = await T.open('yut/');
    await U.waitFor(p, A.ready, null, 15000);
    await p.evaluate(A.setup);
    await p.evaluate(A.modes.hot.start, 12);
    await U.waitFor(p, () => !document.getElementById('play').hidden && window.__yut.ses && window.__yut.ses.S, null, 8000);
    await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); });
    await T.sleep(300);
    await p.evaluate(() => { const b = document.getElementById('coachBtn'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); });     // 앞 시험이 켜 둔 걸 기억하고 있으면 그대로
    const seen = {};
    for (let i = 0; i < 500 && !(seen[0] && seen[1]); i++) {
      const st = await p.evaluate(() => { const ses = __yut.ses; return { can: __yut.canAct(), ph: ses.S.phase, t: ses.S.turn, tn: ses.S.turnNo, txt: (document.querySelector('.cpn .cpn-body') || {}).innerText || '' }; });
      if (st.can && st.ph === 'move' && st.tn >= 1) seen[st.t] = seen[st.t] || st.txt;
      if (st.can) await p.evaluate(() => { const ov = document.querySelector('.overlay:not([hidden]) .btn.primary'); if (ov && /알겠어요/.test(ov.textContent)) ov.click(); __yut.autoAct(); });
      await T.sleep(50);
    }
    T.ok(/📊 토끼팀 [0-9]+개 났음/.test(seen[0] || '') && /📊 곰돌이팀 [0-9]+개 났음/.test(seen[1] || ''), '26 한 기기: 📊 가 지금 차례 팀 이름으로 — ' + String(seen[1]).replace(/\n/g, ' / '));
    T.ok(/👀 [^\n]*방금/.test(seen[1] || '') || /👀 [^\n]*방금/.test(seen[0] || ''), '26 한 기기: 앞 팀이 한 일이 👀 에 나옴');
    await p.close();
  }
}, '윷놀이 화면');

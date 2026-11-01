// 당구 화면 시험 (브라우저, 소리 없음): node billiards/test/ui.js
//   13 AI 가 생각·겨누는 중에 🔁 다시 보기가 눌리면 AI 샷이 사라져 아무도 못 치던 것
//   62 늦게 끝난 옛 샷 애니메이션이 이미 받은 새 상태를 한 샷 전으로 되돌리던 것 (손님 화면)
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/billiards');

U.main(async T => {
  // ── 13) AI 차례에 다시 보기
  {
    const p = await T.open('billiards/');
    await U.waitFor(p, A.ready, null, 15000);
    await p.evaluate(A.modes.solo.start);
    await T.sleep(500);
    // 내가 쳐서 AI 차례가 올 때까지 (빨리 감기). 점수가 나면 내가 한 번 더 치니 몇 번 반복
    let got = false;
    for (let k = 0; k < 12 && !got; k++) {
      got = await p.evaluate(async () => {
        const b = __billiards, ses = b.ses, sleep = ms => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < 100; i++) { if (ses.aiBusy) return true; if (!ses.anim && ses.s.phase === 'play' && ses.seats[ses.s.turn].ctrl === 'me') break; await sleep(100); }
        if (ses.aiBusy) return true;
        ses.aim.angle = Math.random() * 6.28; ses.aim.power = 0.5; b.shoot();
        for (let i = 0; i < 200 && ses.anim; i++) { ses.anim.speed = 30; await sleep(50); }
        await sleep(100);
        return !!ses.aiBusy;
      });
    }
    T.ok(got, '13 AI 차례까지 진행됨');
    if (got) {
      const r = await p.evaluate(async () => {
        const ses = __billiards.ses, sleep = ms => new Promise(r => setTimeout(r, ms));
        const shots0 = ses.s.shots, btn = document.getElementById('replayBtn');
        const was = { disabled: btn.disabled, last: !!ses.last };
        btn.click();                                              // 막혀 있으면 아무 일 없음
        const started = !!(ses.anim && ses.anim.replay);
        if (started) { const a = ses.anim, len = a.frames.length / a.fps; a.speed = Math.max(0.05, len / 4); }   // 다시 보기를 약 4초로 늘림 (AI 샷이 그 안에 나가도록)
        for (let i = 0; i < 300 && ses.s.shots === shots0 && ses.alive; i++) await sleep(100);   // 최대 30초: AI 샷이 나가야 함
        // 다시 보기가 남아 있으면 끝나길 기다림
        for (let i = 0; i < 200 && ses.anim; i++) await sleep(100);
        await sleep(300);
        return { was, started, shots0, shots: ses.s.shots, anim: !!ses.anim, aiBusy: ses.aiBusy };
      });
      T.ok(r.shots > r.shots0, `13 AI 샷이 나감 (샷 ${r.shots0}→${r.shots}, 다시 보기 시작=${r.started}, 단추 꺼짐=${r.was.disabled})`);
      T.ok(!r.started, '13 AI 가 겨누는 중엔 다시 보기가 시작되지 않음');
    }
    await p.close();
  }

  // ── 62) 손님 화면: 늦게 끝난 옛 샷이 새 상태를 되돌리면 안 됨
  {
    const { H, W } = await T.pair(A);
    await H.evaluate(() => { window.__t62 = 1; });
    // 방장이 샷 결과 둘을 연달아 (no 1, no 2) 내보냄 — 손님은 1번을 굴리는 중에 2번을 받음
    await H.evaluate(async () => {
      const ses = __billiards.ses, B = window.Billiards, sleep = ms => new Promise(r => setTimeout(r, ms));
      const act = { angle: 0.3, power: 0.5, spinX: 0, spinY: 0 };
      const r1 = B.applyShot(ses.s, act), r2 = B.applyShot(r1.state, act);
      const mk = (r, no) => ({ t: 'res', gid: ses.gid, no, a: act, traj: B.packTraj(r.sim), s: r.state, result: r.result, wins: ses.wins });
      ses.net.broadcast(mk(r1, 1), true);
      await sleep(600);
      ses.net.broadcast(mk(r2, 2), true);
    });
    const got = await U.waitFor(W, () => { const s = __billiards.ses; return s && s.no === 2; }, null, 8000);
    T.ok(!!got, '62 손님이 2번째 샷 상태를 받음 (applySnap)');
    // 늦게 끝나는 1번 애니메이션을 빨리 끝냄
    await W.evaluate(async () => { const ses = __billiards.ses, sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 400 && ses.anim; i++) { ses.anim.speed = 40; await sleep(50); } await sleep(300); });
    const r = await W.evaluate(() => { const s = __billiards.ses; return { no: s.no, shots: s.s.shots, anim: !!s.anim }; });
    T.ok(r.no === 2 && r.shots === 2, `62 옛 애니메이션이 끝나도 상태 그대로 (no=${r.no}, 샷=${r.shots}; 기대 2/2)`);
  }
}, '당구 화면');

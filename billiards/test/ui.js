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

  // ── 71) AI 선생님이 '어디 두라'만이 아니라 흐름을 말함 (11-01): 💡 추천 · 👉 수의 의미 · 👀 상대 흐름 · 📊 내 흐름
  //   혼자(AI와 대결) + 선생님 켬: 첫 차례엔 👀 없이 📊, AI 가 친 뒤 내 차례엔 👀 가 붙음. 소리 없음(uitest 가 --mute-audio)
  {
    const p = await T.open('billiards/');
    await U.waitFor(p, A.ready, null, 15000);
    await p.evaluate(() => { __billiards.opt.coach = 1; });
    await p.evaluate(A.modes.solo.start);
    await T.sleep(500);
    const r = await p.evaluate(async () => {
      const b = __billiards, ses = b.ses, sleep = ms => new Promise(r => setTimeout(r, ms));
      const body = () => (document.querySelector('.cpn-body') || {}).innerText || '';
      const out = { first: null, later: null, rounds: 0 };
      for (let round = 0; round < 8; round++) {
        out.rounds = round + 1;
        // 내 차례 + 선생님 답이 나올 때까지 (공 구르기·AI 는 빨리)
        let ready = false;
        for (let i = 0; i < 600; i++) {
          if (ses.anim) ses.anim.speed = 30;
          if (ses.s.phase !== 'play') return out;
          const mine = !ses.anim && !ses.aiBusy && ses.seats[ses.s.turn].ctrl === 'me';
          if (mine && /성공률/.test(body())) { ready = true; break; }
          await sleep(100);
        }
        if (!ready) { out.stuck = body(); return out; }
        const txt = body();
        if (round === 0) out.first = txt;
        const oppShot = ses.s.last && ses.s.last.shooter !== ses.s.turn;      // 방금 친 사람이 내가 아님 = AI 가 쳤음
        if (oppShot) { out.later = txt; out.cls = [...document.querySelectorAll('.cpn-body .cl')].length; return out; }
        ses.aim.angle = Math.random() * 6.28; ses.aim.power = 0.5; b.shoot();   // 내가 한 번 침 → AI 차례
        await sleep(300);
      }
      return out;
    });
    T.ok(!!r.first, `71 첫 차례 선생님 글이 나옴 (${r.stuck || ''})`);
    if (r.first) {
      T.ok(/💡/.test(r.first) && /👉/.test(r.first), `71 첫 차례: 💡 추천 + 👉 수의 의미 (${r.first.replace(/\s+/g, ' ').slice(0, 160)})`);
      T.ok(/📊/.test(r.first) && !/👀/.test(r.first), `71 첫 차례: 📊 만 (상대가 아직 안 쳤으니 👀 없음)`);
    }
    T.ok(!!r.later, `71 AI 가 친 뒤 내 차례 글이 나옴 (${r.rounds}번째 차례)`);
    if (r.later) {
      const L = r.later, i = ['💡', '👉', '👀', '📊'].map(e => L.indexOf(e));
      T.ok(i.every(x => x >= 0), `71 💡 👉 👀 📊 가 다 있음 (${L.replace(/\s+/g, ' ').slice(0, 220)})`);
      T.ok(i[0] < i[1] && i[1] < i[2] && i[2] < i[3], `71 추천이 먼저 (💡 ${i[0]} · 👉 ${i[1]} · 👀 ${i[2]} · 📊 ${i[3]})`);
      T.ok(/AI/.test(L.slice(i[2], i[3])) || /(초급|중급|고급)/.test(L.slice(i[2], i[3])), '71 👀 에 상대(AI) 이름이 있음');
      T.ok(/나 \d/.test(L.slice(i[3])) && /목표/.test(L.slice(i[3])), '71 📊 에 내 점수 · 목표');
      T.ok(r.cls <= 5, `71 줄이 짧음 (${r.cls}줄 ≤ 5)`);
      console.log('  [선생님 글 예]', L.replace(/\s+/g, ' ').trim());
    }
    await p.close();
  }

  // ── 72) 혼자 연습: 상대가 없으니 👀 는 '방금 내 샷', 📊 는 성공/시도
  {
    const p = await T.open('billiards/');
    await U.waitFor(p, A.ready, null, 15000);
    await p.evaluate(() => { __billiards.opt.coach = 1; });
    await p.evaluate(A.modes.practice.start);
    await T.sleep(500);
    const r = await p.evaluate(async () => {
      const b = __billiards, ses = b.ses, sleep = ms => new Promise(r => setTimeout(r, ms));
      const body = () => (document.querySelector('.cpn-body') || {}).innerText || '';
      const wait = async () => { for (let i = 0; i < 600; i++) { if (ses.anim) ses.anim.speed = 30; if (!ses.anim && /성공률/.test(body())) return true; await sleep(100); } return false; };
      const first = await wait() ? body() : null;
      ses.aim.angle = 0.3; ses.aim.power = 0.5; b.shoot();
      await sleep(300);
      const later = await wait() ? body() : null;
      return { first, later };
    });
    T.ok(!!r.first && /📊/.test(r.first) && /👉/.test(r.first) && !/👀/.test(r.first), `72 연습 첫 글: 📊 👉, 👀 없음 (${(r.first || '').replace(/\s+/g, ' ').slice(0, 120)})`);
    T.ok(!!r.later && /👀/.test(r.later) && /방금 내 샷/.test(r.later) && /📊/.test(r.later) && /\d\/\d/.test(r.later), `72 연습 한 번 뒤: 👀 방금 내 샷 + 📊 성공/시도 (${(r.later || '').replace(/\s+/g, ' ').slice(0, 200)})`);
    await p.close();
  }

  // ── 73) 친구랑: 방장이 친 뒤 손님 화면에도 👀 상대 흐름이 뜸 (손님은 방장 결과 메시지로 기록을 쌓음) — 선생님이 켜진 방일 때
  {
    const { H, W } = await T.pair(A);
    await W.evaluate(() => { const ses = __billiards.ses; ses.coachAllowed = true; document.getElementById('coachBtn').click(); });   // 방장이 선생님을 켠 방 (대기실 설정) 을 흉내
    await H.evaluate(async () => {
      const b = __billiards, ses = b.ses, sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 100 && (ses.anim || ses.s.turn !== 0); i++) await sleep(100);
      ses.aim.angle = Math.PI; ses.aim.power = 0.3; ses.aim.spinX = ses.aim.spinY = 0;     // 왼쪽 쿠션 쪽 느린 샷 = 아무 공도 못 맞힘
      b.shoot();
      for (let i = 0; i < 200 && ses.anim; i++) { ses.anim.speed = 30; await sleep(50); }
    });
    const txt = await U.waitFor(W, () => {
      const ses = __billiards.ses; if (!ses || !ses.s || ses.anim) return null;
      if (ses.seats[ses.s.turn].ctrl !== 'me') return null;
      const t = (document.querySelector('.cpn-body') || {}).innerText || '';
      return /성공률/.test(t) ? t : null;
    }, null, 40000);
    T.ok(!!txt && /💡/.test(txt) && /👀/.test(txt) && /실패/.test(txt) && /📊/.test(txt), `73 친구랑 손님 화면: 💡 👀 실패 📊 (${(txt || '').replace(/\s+/g, ' ').slice(0, 200)})`);
    const hn = await H.evaluate(() => __billiards.ses.hist.length), wn = await W.evaluate(() => __billiards.ses.hist.length);
    T.ok(hn === 1 && wn === 1, `73 방장·손님 모두 샷 기록 1개 (방장 ${hn}, 손님 ${wn})`);
  }

  // ── 74) 겨누는 동안(판을 끌 때)은 선생님 창이 거의 투명해져 밑의 공이 보임 (11-02 — 흐름 줄이 늘어 세로 폰에서 판 윗부분을 가림)
  {
    const p = await T.open('billiards/');
    await U.waitFor(p, A.ready, null, 15000);
    await p.evaluate(() => { __billiards.opt.coach = 1; });
    await p.evaluate(A.modes.solo.start);
    const ok = await U.waitFor(p, () => { const b = __billiards, ses = b.ses; return ses && !ses.anim && !ses.aiBusy && ses.seats[ses.s.turn].ctrl === 'me' && /성공률/.test((document.querySelector('.cpn-body') || {}).innerText || ''); }, null, 30000);
    T.ok(!!ok, '74 내 차례 + 선생님 창');
    const cv = await p.evaluate(() => { const c = document.querySelector('canvas'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.8 }; });
    const op = () => p.evaluate(() => +getComputedStyle(document.querySelector('.cpn')).opacity);
    const before = await op();
    await p.mouse.move(cv.x, cv.y); await p.mouse.down(); await p.mouse.move(cv.x + 20, cv.y - 10, { steps: 3 });
    await T.sleep(350);
    const during = await op();
    await p.mouse.up(); await T.sleep(350);
    const after = await op();
    T.ok(before > 0.9 && during < 0.4 && after > 0.9, `74 겨누는 동안만 창이 투명 (전 ${before} · 중 ${during} · 뒤 ${after})`);
    await p.close();
  }
}, '당구 화면');

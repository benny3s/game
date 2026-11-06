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
    // ⑤ 선생님 창: 👀 상대 흐름 · 📊 내 흐름 · 추천 순서 (11-01 베니 님 '상대 흐름 · 내 흐름 · 수의 의미')
    const L = await p.evaluate(() => { const ses = __gostop.ses; return (ses.coachHtml || '').split('<br>').map(x => x.replace(/<[^>]+>/g, '').trim()).filter(Boolean); });
    const iSelf = L.findIndex(x => /^📊/.test(x)), iRec = L.findIndex(x => /추천/.test(x));
    T.ok(iSelf >= 0 && /\d+점/.test(L[iSelf]), '⑤ 📊 내 흐름 줄 (내 점수) — ' + (L[iSelf] || L.join(' / ')));
    T.ok(iSelf >= 0 && iRec > iSelf, '⑤ 순서: 📊 내 흐름 → 추천 (' + L.map(x => x.slice(0, 2)).join(' ') + ')');
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
    await U.waitFor(W, () => { const r = document.getElementById('resBox'), b = document.querySelector('#resBox .btn.primary'); return !!(r && !r.hidden && b && !b.disabled); }, null, 25000);   // 친구 결과 창이 뜬 뒤에 ✋ 준비 (먼저 누르면 놓쳐서 가끔 방장이 못 시작함)
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
  // ── ⑥ 11-06 베니 님: 추천과 내지 말 것이 같은 표시 → 👑 초록 · 🚫 빨강+어두운 패 · 나머지는 회색 숫자
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, A.ready);
    let marks = null;
    for (let seed = 11; seed < 30 && !marks; seed++) {
      await p.evaluate(sd => { localStorage.setItem('cozy.sound2', 'false'); __gostop.start({ seed: sd, mode: 2, tier: 'easy', rules: { seon: 'off' } }); }, seed);
      if (!(await U.waitFor(p, myPlay, null, 20000))) continue;
      await closeHow(p);
      if (!(await p.evaluate(() => __gostop.ses.coachOn))) await p.click('#coachBtn');
      await U.waitFor(p, () => document.querySelectorAll('.hw.mine .ev-badge:not([hidden])').length > 0, null, 8000);
      marks = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('.hw.mine')].map(el => { const b = el.querySelector('.ev-badge'), cs = getComputedStyle(b), dim = el.querySelector('.ev-dim'); return { id: +el.dataset.id, tier: b.className.split(' ')[1], t: b.textContent, bg: cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor, avoid: el.classList.contains('avoid'), dim: !!dim && getComputedStyle(dim).display !== 'none' }; });
        return rows.some(r => r.tier === 'bad') && rows.some(r => r.tier === 'best') && rows.some(r => r.tier === 'good' || r.tier === 'ok') ? rows : null;
      });
    }
    T.ok(!!marks, '⑥ 추천 · 보통 · 내지 말 것이 다 있는 손패');
    if (marks) {
      const of = t => marks.filter(r => t.includes(r.tier)), bg = rs => [...new Set(rs.map(r => r.bg))];
      T.ok(of(['bad']).every(r => r.t === '🚫' && r.avoid && r.dim), '⑥ 내지 말 것 = 🚫 + 패가 어두워짐 ' + JSON.stringify(of(['bad'])));
      T.ok(of(['best']).every(r => r.t === '👑' && !r.avoid && !r.dim), '⑥ 추천 = 👑 · 어둡지 않음');
      T.ok(of(['good', 'ok']).every(r => /^-/.test(r.t) && !r.avoid), '⑥ 나머지는 숫자만 · 어둡지 않음');
      T.ok(bg(of(['good', 'ok'])).length === 1, '⑥ 보통은 색을 나누지 않음 (회색 하나) ' + bg(of(['good', 'ok'])).join(' | '));
      T.ok(!bg(of(['best'])).some(x => bg(of(['bad'])).includes(x)) && !bg(of(['good', 'ok'])).some(x => bg(of(['bad'])).includes(x) || bg(of(['best'])).includes(x)), '⑥ 세 표시의 색이 서로 다름');
      const bad = of(['bad'])[0], best = of(['best'])[0];
      const say = id => p.evaluate(async c => { const el = document.querySelector(`.hw[data-id="${c}"]`), r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + 6, clientY: r.y + 20, pointerId: 1 })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.x + 6, clientY: r.y + 20, pointerId: 1 })); el.click(); await new Promise(z => setTimeout(z, 250)); return { sel: __gostop.ses.sel, html: __gostop.ses.coachHtml || '' }; }, id);
      const b1 = await say(bad.id);
      T.ok(b1.sel === bad.id && /🚫 내지 마세요/.test(b1.html) && !/\[[^\]]+\]<\/b> 👉/.test(b1.html), '⑥ 내지 말 패를 고르면 🚫 내지 마세요 — ' + b1.html.replace(/<[^>]+>/g, '').slice(-120));
      await p.evaluate(() => { __gostop.ses.sel = -1; });
      const b2 = await say(best.id);
      T.ok(/👑/.test(b2.html) && !/🚫/.test(b2.html) && /👉/.test(b2.html), '⑥ 추천 패 말에는 🚫 이 없음 — ' + b2.html.replace(/<[^>]+>/g, '').slice(-80));
    }
    await p.close().catch(() => {});
  }
  // ── ⑦ 11-06 베니 님: 패 고르기 창이 판을 가림 → 아래쪽 작은 줄, 판은 어둡게 안 하고 후보 두 장이 보임
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, A.ready);
    await p.evaluate(() => __gostop.fast(true));
    let box = null;
    for (let seed = 11; seed < 45 && !box; seed++) {
      await p.evaluate(sd => { localStorage.setItem('cozy.sound2', 'false'); __gostop.start({ seed: sd, mode: 2, tier: 'easy', rules: { seon: 'off' } }); }, seed);
      if (!(await U.waitFor(p, myPlay, null, 15000))) continue;
      await closeHow(p);
      for (let t = 0; t < 10 && !box; t++) {
        const pick = await U.waitFor(p, () => { const s = __gostop.state, ses = __gostop.ses; return !!(s && ses && ses.pending && !ses.pending.isResult && s.turn === ses.cfg.me) && document.querySelectorAll('.overlay .picks button').length + (s.phase === 'play' ? 1 : 0) > 0 ? s.phase : null; }, null, 8000);
        if (!pick) break;
        if (String(pick).startsWith('pick')) {
          await p.waitForTimeout(450);
          box = await p.evaluate(() => {
            const o = [...document.querySelectorAll('.overlay')].filter(x => !x.hidden && x.querySelector('.picks')).pop(), r = o.firstElementChild.getBoundingClientRect(), opts = __gostop.state.cur.opts;
            const hand = [...document.querySelectorAll('.hw')].filter(el => __gostop.state.hands[__gostop.ses.cfg.me].includes(+el.dataset.id)).map(el => el.getBoundingClientRect().top);
            const onTop = c => { const e = document.querySelector(`.hw[data-id="${c}"]`), q = e.getBoundingClientRect(); return !o.firstElementChild.contains(document.elementFromPoint(q.x + q.width / 2, q.y + 8)); };
            return { top: r.top, h: r.height, vh: innerHeight, bottom: r.bottom, dimA: +(getComputedStyle(o).backgroundColor.match(/[\d.]+/g)[3] ?? 1), blur: getComputedStyle(o).backdropFilter, peek: !!o.querySelector('.peekbtn'), n: o.querySelectorAll('.picks button').length, names: [...o.querySelectorAll('.picks button span')].map(x => x.textContent), visible: opts.map(onTop), glow: opts.map(c => document.querySelector(`.hw[data-id="${c}"]`).classList.contains('glow')), handTop: hand.length ? Math.min(...hand) : 0, phase: __gostop.state.phase };
          });
          break;
        }
        await p.evaluate(() => { const s = __gostop.state, me = __gostop.ses.cfg.me, m = c => Math.floor(c / 4), L = __gostop.legal(); const two = s.phase === 'play' ? s.hands[me].filter(c => c < 48).find(c => s.table.filter(x => x < 48 && m(x) === m(c)).length === 2) : null; __gostop.act(two != null && L.includes(two) ? two : L[0]); });
        await p.waitForTimeout(250);
      }
    }
    T.ok(!!box, '⑦ 패 고르기 장면');
    if (box) {
      T.ok(box.n === 2 && box.names.every(Boolean), '⑦ 고를 패 두 장과 이름 ' + box.names.join(' / '));
      T.ok(box.h <= box.vh * 0.22, `⑦ 창 높이가 화면의 22% 안 (${Math.round(box.h)} / ${box.vh})`);
      T.ok(box.bottom >= box.vh - 12 && box.top > box.handTop + 15, `⑦ 창이 맨 아래 · 손패 윗부분이 보임 (창 ${Math.round(box.top)}, 손패 ${Math.round(box.handTop)})`);
      T.ok(box.dimA === 0 && (!box.blur || box.blur === 'none'), `⑦ 판을 어둡게·흐리게 안 함 (${box.dimA}, ${box.blur})`);
      T.ok(box.visible.every(Boolean), '⑦ 바닥의 후보 두 장이 창에 안 가림 ' + box.visible);
      T.ok(box.glow.every(Boolean), '⑦ 바닥의 후보 두 장이 빛남 ' + box.glow);
      T.ok(!box.peek, "⑦ '판 보기' 단추가 필요 없음");
      await p.evaluate(() => [...document.querySelectorAll('.overlay .picks button')].pop().click());
      T.ok(await U.waitFor(p, () => !document.querySelector('.overlay .picks') && ![...document.querySelectorAll('.hw.glow')].length, null, 5000), '⑦ 고르면 창이 닫히고 빛도 꺼짐');
    }
    await p.close().catch(() => {});
  }

  // ── ⑧ 11-06 멋쟁이규호 님 '아귀가 좀 쉬워진 것 같다' → 👹 각성 아귀(반칙 보스: 수마다 30% 더미·손패 몰래 봄) · 😤 복수전 · 🆚 타짜별 전적
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, () => window.__gostop && document.querySelector('#tiers .tier'));
    await p.evaluate(() => { localStorage.setItem('cozy.sound2', 'false'); document.querySelector('#tiers .tier[data-id="hard"]').click(); });
    const foes = await p.evaluate(() => [...document.querySelectorAll('#foeSeg .btn')].map(b => b.textContent.trim()));
    T.ok(foes.length === 5 && foes[4] === '👹 각성' && foes[3] === '아귀', '⑧ 상대 다섯: 마지막이 👹 각성 (' + foes.join(' · ') + ')');
    const fit = await p.evaluate(() => { const s = document.getElementById('foeSeg'); return [...s.children].every(b => b.scrollWidth <= b.clientWidth + 1) && document.documentElement.scrollWidth <= innerWidth; });
    T.ok(fit, '⑧ 상대 단추 다섯이 폰 폭에 들어감');
    await p.evaluate(() => [...document.querySelectorAll('#foeSeg .btn')].pop().click());
    T.ok(await p.evaluate(() => /반칙/.test(document.getElementById('foeNote').textContent) && !document.getElementById('foeNote').hidden), '⑧ 고르면 안내에 "반칙"');
    // 늘 엿보게 해서 판 한 판: AI 수마다 온전한 상태로 고르고, 할 수 있는 수만 (판이 끝까지 감)
    await p.evaluate(() => { localStorage.setItem('gostop.lastVs', JSON.stringify({ '각성 아귀': 'l' })); __gostop.fast(true); __gostop.autoHuman = true; __gostop.bossPeek(1); __gostop.start({ seed: 4321, mode: 2, tier: 'hard', rules: { seon: 'off' } }); });
    T.ok(!!(await U.waitFor(p, () => /복수전/.test((document.querySelector('.toast') || {}).textContent || ''), null, 8000)), '⑧ 지난번에 진 상대면 "😤 복수전!"');
    T.ok(await p.evaluate(() => __gostop.ses.seats.some(x => x.ctrl === 'ai' && x.name === '각성 아귀')), '⑧ 상대 자리가 각성 아귀');
    const end = await U.waitFor(p, () => {
      const s = __gostop.state, ses = __gostop.ses;
      if (s && s.phase === 'end') return { peeks: __gostop.peeks };
      if (s && ses && s.turn === ses.cfg.me && ses.pending && !ses.pending.isResult && s.phase !== 'play') { const L = __gostop.legal(); if (L.length) __gostop.act(L[0]); }   // 고르기 · 고/스톱 · 국진은 시험이 대신
      return null;
    }, null, 60000, 120);
    T.ok(end && end.peeks > 0, '⑧ 판 끝까지 감 · 몰래 본 수 ' + (end && end.peeks));
    const lv = await U.waitFor(p, () => { const v = JSON.parse(localStorage.getItem('gostop.lastVs') || '{}')['각성 아귀']; return v === 'w' || (v === 'l' && __gostop.state.result && __gostop.state.result.winner !== __gostop.ses.cfg.me) ? v : null; }, null, 8000);
    T.ok(!!lv, '⑧ 이 상대와의 마지막 결과를 기억 (' + lv + ')');
    await p.evaluate(() => { __gostop.bossPeek(0.3); __gostop.autoHuman = false; __gostop.fast(false); localStorage.removeItem('gostop.lastVs'); });
    await p.close().catch(() => {});
  }

  // ── ⑨ 11-06 베니 님 '다 진행': 🥋 타짜 도장깨기 — 다섯 관 · 관마다 먼저 3승 · 깨면 칭호 · 져도 그 관부터
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, () => window.__gostop && document.getElementById('gntCard'));
    await p.evaluate(() => { localStorage.setItem('cozy.sound2', 'false'); localStorage.removeItem('gostop.gnt'); __gostop.menu(); });
    const c0 = await p.evaluate(() => ({ st: [...document.querySelectorAll('#gntCard .gnt-st')].map(x => x.textContent.replace(/\s+/g, '')), btn: document.getElementById('gntGo').textContent, vis: !!document.getElementById('gntCard').offsetHeight }));
    T.ok(c0.vis && c0.st.length === 5 && /1관고광렬0:0/.test(c0.st[0]) && /🔒/.test(c0.st[4]) && /도전/.test(c0.btn), '⑨ 첫 화면 도장깨기: 다섯 관 · 1관 고광렬 0:0 · 나머지 잠김 (' + c0.st.join(' | ') + ')');
    await p.evaluate(() => { localStorage.setItem('gostop.gnt', JSON.stringify({ stage: 1, w: 2, l: 2, coach: false, stars: { 0: 2 } })); __gostop.menu(); });
    const c1 = await p.evaluate(() => ({ txt: document.getElementById('gntCard').textContent.replace(/\s+/g, ' '), btn: document.getElementById('gntGo').textContent }));
    T.ok(/입담 이긴 꾼/.test(c1.txt) && /⭐⭐/.test(c1.txt) && /2관 짝귀 · 나 2 : 2/.test(c1.txt) && /이어서/.test(c1.btn), '⑨ 깬 관은 별 · 칭호, 지금 관 점수 · 이어서: ' + c1.txt.slice(0, 90));
    const fit = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    T.ok(fit, '⑨ 도장깨기 카드가 폰 폭에 들어감');
    // 2:2 에서 한 판 — 이기면 2관 돌파(다음 관 평경장), 지면 탈락(0:0 으로 그 관 다시)
    await p.evaluate(() => { __gostop.fast(true); __gostop.autoHuman = true; __gostop.gauntlet(null); });
    T.ok(await U.waitFor(p, () => __gostop.ses && __gostop.ses.seats[1] && __gostop.ses.seats[1].name === '짝귀' && __gostop.ses.seats.length === 2, null, 5000), '⑨ 도전하면 맞고로 지금 관 상대(짝귀)');
    const res = await U.waitFor(p, () => {
      const s = __gostop.state, ses = __gostop.ses;
      if (ses && ses.pending && ses.pending.isResult) return { title: document.getElementById('resTitle').textContent, big: document.getElementById('resBig').textContent, nb: (document.querySelector('#resBtns .btn.primary') || {}).textContent, g: __gostop.gnt, win: s.result && s.result.winner === ses.cfg.me, nag: s.result && s.result.kind === 'nagari' };
      if (s && ses && s.turn === ses.cfg.me && ses.pending && !ses.pending.isResult && s.phase !== 'play') { const L = __gostop.legal(); if (L.length) __gostop.act(L[0]); }
      return null;
    }, null, 60000, 120);
    const ok = res && (res.nag ? /다음 판/.test(res.nb) : res.win ? res.g.stage === 2 && res.g.stars[1] >= 1 && res.g.w === 0 && /2관 돌파/.test(res.big) && /다음 관: 평경장/.test(res.nb) : res.g.stage === 1 && res.g.w === 0 && res.g.l === 0 && /2관 탈락/.test(res.big) && /다시 도전/.test(res.nb));
    T.ok(ok, '⑨ 3승째면 돌파(⭐ · 다음 관 단추), 3패째면 탈락(그 관 0:0 · 다시 도전): ' + JSON.stringify(res && { big: res.big.slice(0, 60), nb: res.nb, g: res.g, win: res.win, nag: res.nag }));
    if (res && !res.nag) {
      await p.evaluate(() => document.querySelector('#resBtns .btn.primary').click());
      const want = res.win ? '평경장' : '짝귀';
      T.ok(await U.waitFor(p, w => __gostop.ses && __gostop.ses.seats[1] && __gostop.ses.seats[1].name === w && __gostop.state && __gostop.state.phase !== 'end', want, 8000), '⑨ 단추를 누르면 새 판으로 ' + want);
    }
    await p.evaluate(() => { __gostop.autoHuman = false; __gostop.fast(false); localStorage.removeItem('gostop.gnt'); });
    await p.close().catch(() => {});
  }

  // ── ⑩ 11-06 베니 님 '규호형이 좋아하는 것' → 🎯 오늘의 미션 (판 수 하나 + 기술 둘, 날짜로 정해짐, 깨면 판돈 냥)
  {
    const p = await T.open('gostop/');
    await U.waitFor(p, () => window.__gostop && document.getElementById('misCard'));
    const m0 = await p.evaluate(() => {
      const M = __gostop.mis, days = [...Array(14).keys()].map(i => new Date(Date.parse('2026-11-01T00:00:00Z') + i * 864e5).toISOString().slice(0, 10)), sets = days.map(d => M.today(d));
      const same = JSON.stringify(M.today('2026-11-06')) === JSON.stringify(M.today('2026-11-06'));
      const shape = sets.every(s => s.length === 3 && new Set(s).size === 3 && M.group(s[0]) === 'n' && M.group(s[1]) === 's' && M.group(s[2]) === 's');
      const skills = new Set(sets.flatMap(s => s.slice(1)));
      return { same, shape, skills: skills.size };
    });
    T.ok(m0.same && m0.shape && m0.skills >= 6, '⑩ 미션 = 날짜로 정해짐 · 판 수 1 + 기술 2 · 2주 동안 기술 미션 ' + m0.skills + '가지');
    const ck = await p.evaluate(() => {
      const M = __gostop.mis, base = { r: { go: 0, points: 10, items: [], mults: [], per: [] }, won: true, coach: false, foe: '아귀', loseM: () => false, item: () => false };
      const c = o => Object.assign({}, base, o, { r: Object.assign({}, base.r, o.r || {}) });
      return [M.check('go3', c({ r: { go: 3 } })), !M.check('go3', c({ r: { go: 2 } })), M.check('agwi', c({})), !M.check('agwi', c({ foe: '평경장' })), M.check('nocoach', c({})), !M.check('nocoach', c({ coach: true })), !M.check('win5', c({ won: false })), M.check('big', c({ r: { points: 31 } })), M.check('shake', c({ r: { mults: [{ k: '흔들기·폭탄 1번', x: 2 }] } }))];
    });
    T.ok(ck.every(Boolean), '⑩ 미션 판정: 3고 · 아귀 · 선생님 없이 · 이긴 판만 · 30점 · 흔들기 ' + JSON.stringify(ck));
    await p.evaluate(() => { localStorage.removeItem('gostop.mis'); __gostop.mis.force(['play10', 'go3', 'pibak']); __gostop.menu(); });
    const card = await p.evaluate(() => [...document.querySelectorAll('#misCard .mis-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
    T.ok(card.length === 3 && /10판 치기\s*0\/10/.test(card[0]) && /3고 이상/.test(card[1]) && /피박/.test(card[2]), '⑩ 첫 화면 미션 카드 셋 (' + card.join(' | ') + ')');
    await p.evaluate(() => { localStorage.setItem('cozy.sound2', 'false'); __gostop.fast(true); __gostop.autoHuman = true; __gostop.start({ seed: 2468, mode: 2, tier: 'easy', rules: { seon: 'off' } }); });
    const res = await U.waitFor(p, () => {
      const s = __gostop.state, ses = __gostop.ses;
      if (ses && ses.pending && ses.pending.isResult) return { big: document.getElementById('resBig').textContent, st: __gostop.mis.state, nag: s.result && s.result.kind === 'nagari' };
      if (s && ses && s.turn === ses.cfg.me && ses.pending && !ses.pending.isResult && s.phase !== 'play') { const L = __gostop.legal(); if (L.length) __gostop.act(L[0]); }
      return null;
    }, null, 60000, 120);
    T.ok(res && (res.nag || (res.st.prog.play10 === 1 && /미션 10판 치기 1\/10/.test(res.big))), '⑩ 한 판 끝나면 결과 줄 "🎯 미션 10판 치기 1/10" · 저장 ' + JSON.stringify(res && { big: res.big.slice(-60), prog: res.st.prog, nag: res.nag }));
    await p.evaluate(() => { __gostop.mis.force(null); __gostop.autoHuman = false; __gostop.fast(false); localStorage.removeItem('gostop.mis'); });
    await p.close().catch(() => {});
  }
}, 'gostop ui');

// 베니큐브 화면 시험 (브라우저, 소리 없음): node cube/test/ui.js
//   AI 선생님 흐름 (11-02 베니 님: 어디 두라고만 하니 뭔 말인지 모르겠고 재미없음)
//   · 혼자 판에서 내 차례마다 💡 추천 · 👉 수의 의미 · 👀 상대 흐름 · 📊 내 흐름이 뜸 (뽑기·버리기 두 단계 모두)
//   · 숨은 패(남의 손패·더미 순서)를 바꿔 끼워도 글이 똑같음 = 몰래 안 봄
//   · 4명 판에서는 상대 셋 모두 한 줄씩, 폰 화면에서 창이 스크롤 없이 다 보이고 더미 단추·받침대·상대 줄을 안 가림
const U = require('../../test/qa/lib/uitest');
const A = require('../../test/qa/adapters/cube');

const panelText = p => p.evaluate(() => { const b = document.querySelector('.cpn-body'); return b ? b.innerText : ''; });
// 내 차례(뽑기)가 오고 선생님 글이 뜰 때까지
const myDraw = (p, ms = 25000) => U.waitFor(p, () => {
  const G = window.__cube && __cube.G, b = document.querySelector('.cpn-body');
  return !!(G && G.st && !G.over && G.st.turn === 0 && G.st.phase === 'draw' && b && /💡/.test(b.innerText));
}, null, ms);
const myDiscard = (p, ms = 8000) => U.waitFor(p, () => {
  const G = window.__cube && __cube.G, b = document.querySelector('.cpn-body');
  return !!(G && G.st && !G.over && G.st.turn === 0 && G.st.phase === 'discard' && b && /💡/.test(b.innerText));
}, null, ms);
// 숨은 패를 바꿔 끼운 상태로 같은 글을 만들어 보고, 화면에 뜬 글과 같은지
const leakCheck = p => p.evaluate(() => {
  const G = __cube.G, st = G.st, me = G.mySeat;
  const alt = JSON.parse(JSON.stringify(st));
  const pool = alt.deck.slice();
  for (let q = 0; q < st.n; q++) if (q !== me) pool.push(...alt.hands[q]);
  let r = 20261102;
  for (let i = pool.length - 1; i > 0; i--) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; const j = r % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  let at = 0;
  for (let q = 0; q < st.n; q++) if (q !== me) { alt.hands[q] = pool.slice(at, at + alt.hands[q].length); at += alt.hands[q].length; }
  alt.deck = pool.slice(at);
  const real = __cube.coachHtml(), swapped = __cube.coachHtml(alt);
  const tmp = document.createElement('div'); tmp.innerHTML = real;
  return { same: real === swapped, shown: tmp.textContent === document.querySelector('.cpn-body').textContent, len: real.length };
});
const noScroll = p => p.evaluate(() => {
  const b = document.querySelector('.cpn-body'), el = document.querySelector('.cpn');
  const r = el.getBoundingClientRect();
  return { fits: b.scrollHeight <= b.clientHeight + 1, inside: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, h: Math.round(r.height) };
});

// 선생님 창이 가운데 더미 단추 · 받침대 · 상대 줄을 가리지 않는가 (겹친 곳 이름 목록)
const covers = p => p.evaluate(() => {
  const r = document.querySelector(".cpn").getBoundingClientRect(), out = [];
  const hit = (name, sel) => { const e = document.querySelector(sel); if (!e) return; const b = e.getBoundingClientRect(); if (b.width && r.left < b.right && r.right > b.left && r.top < b.bottom - 1 && r.bottom > b.top + 1) out.push(name); };
  hit("더미", "#deckBtn"); hit("앞사람 버림", "#prevBtn"); hit("내 버림", "#dropTray"); hit("받침대", ".rackwrap"); hit("상대 줄", "#opps");
  return out;
});

async function startSolo(p, ai, seed) {
  await p.evaluate(([n, s]) => {
    const q = x => document.querySelector(x);
    q('#tabSolo').click();
    q('#aiCount [data-v="' + n + '"]').click();
    q('#tiers [data-id="easy"]').click();
    __cube.startGame('solo', s);
    __cube.G.speed = 4;
  }, [ai, seed]);
}

U.main(async T => {
  // ── 2명 판: 첫 차례(상대가 아직 안 둠) → 이후 내 차례마다 4가지 읽기
  {
    const p = await T.open('cube/');
    T.ok(!!(await U.waitFor(p, A.ready, null, 15000)), '화면 준비');
    await startSolo(p, 1, 424242);
    await U.waitFor(p, () => /💡/.test((document.querySelector('.cpn-body') || {}).innerText || ''), null, 8000);
    let t = await panelText(p);
    T.ok(/💡/.test(t) && /👉/.test(t) && /👀/.test(t) && /📊/.test(t), '첫 차례에도 💡 👉 👀 📊 가 모두 있음: ' + t.replace(/\n/g, ' | '));
    T.ok(/아직 상대가 두지 않았어요/.test(t), '첫 차례 👀 는 "아직 상대가 두지 않았어요"');

    let seen = { take: 0, deck: 0, prev: 0, wait: 0 }, covered = 0, bad = 0, leaks = 0, notShown = 0, lines = 0, maxLines = 0, turns = 0, longestLine = 0;
    for (let k = 0; k < 14; k++) {
      await p.evaluate(() => __cube.autoTurn());                 // 첫 판은 버리기, 이후는 뽑기
      let ok = true;
      if (k > 0) {
        T.ok(!!(await myDiscard(p)), '(' + k + ') 뽑은 뒤 버릴 차례에도 선생님 글이 뜸');
        t = await panelText(p);
        if (!(/💡/.test(t) && /👉/.test(t) && /👀/.test(t) && /📊/.test(t))) bad++;
        const cv = await covers(p);
        if (cv.length) { covered++; console.error("가린 곳:", cv.join(","), "(버리기)"); }
        await p.evaluate(() => __cube.autoTurn());
        await T.sleep(650);                                      // autoTurn 이 뽑은 뒤 650ms 에 스스로 버리려고 걸어 둔 타이머가 지나가게 (다음 차례와 안 겹치게)
      }
      if (!(await myDraw(p))) { ok = false; break; }
      turns++;
      t = await panelText(p);
      if (!(/💡/.test(t) && /👉/.test(t) && /👀/.test(t) && /📊/.test(t))) { bad++; console.error('빠진 글:', t); }
      if (/👀 [^\n]*: 내 버림 [^\n]* 가져감/.test(t)) seen.take++;
      if (/👀 [^\n]*: 내 버림 [^\n]*안 가져가고 더미 뽑음/.test(t)) seen.deck++;
      if (/지난 차례/.test(t)) seen.prev++;
      if (/오면 좋은 타일/.test(t)) seen.wait++;
      const ls = t.split('\n').filter(Boolean);
      maxLines = Math.max(maxLines, ls.length);
      for (const l of ls) longestLine = Math.max(longestLine, l.length);
      const lk = await leakCheck(p);
      if (!lk.same) leaks++;
      if (!lk.shown) notShown++;
      const cv = await covers(p);
      if (cv.length) { covered++; console.error("가린 곳:", cv.join(","), "(뽑기)"); }
      if (await p.evaluate(() => __cube.G.over)) break;
    }
    T.ok(turns >= 8, '내 차례를 여러 번 겪음 (' + turns + ')');
    T.ok(bad === 0, '내 차례마다(뽑기·버리기) 💡 👉 👀 📊 가 다 있음 (빠진 곳 ' + bad + ')');
    T.ok(seen.take + seen.deck >= turns - 1, '👀 에 상대가 내 버림을 가져갔는지/안 가져갔는지가 나옴 (가져감 ' + seen.take + ' · 안 가져감 ' + seen.deck + ' / ' + turns + ')');
    T.ok(seen.prev >= 3, '📊 에 지난 차례와 비교가 나옴 (' + seen.prev + ')');
    T.ok(seen.wait >= 3, '오면 좋은 타일이 나옴 (' + seen.wait + ')');
    T.ok(leaks === 0, '숨은 패(남의 손패·더미 순서)를 바꿔 끼워도 글이 똑같음 — 몰래 안 봄 (달랐던 곳 ' + leaks + ')');
    T.ok(covered === 0, '2명 판: 선생님 창이 더미 단추·받침대·상대 줄을 안 가림 (가린 곳 ' + covered + ')');
    T.ok(notShown === 0, '창에 뜬 글 = 만들어 둔 글 (' + notShown + ')');
    T.ok(maxLines <= 7, '창 글이 짧음 (가장 길 때 ' + maxLines + '줄, 한 줄 최대 ' + longestLine + '자)');
    const ns = await noScroll(p);
    T.ok(ns.fits && ns.inside, '폰 화면에서 창이 스크롤 없이 다 보임 (높이 ' + ns.h + 'px)');
    await p.close();
  }

  // ── 4명 판: 👀 는 둘째 줄까지, 나머지는 한 줄로 모음
  {
    const p = await T.open('cube/');
    await U.waitFor(p, A.ready, null, 15000);
    await startSolo(p, 3, 777);
    let fourOk = 0, tooMany = 0, merged = 0, leaks = 0, tries = 0, covered = 0;
    for (let k = 0; k < 6; k++) {
      await p.evaluate(() => __cube.autoTurn());
      if (k > 0) { if (await myDiscard(p)) { await p.evaluate(() => __cube.autoTurn()); await T.sleep(650); } }
      if (!(await myDraw(p, 30000))) break;
      tries++;
      const t = await panelText(p);
      const eyes = (t.match(/👀/g) || []).length;
      if (eyes === 3 && /📊/.test(t) && /💡/.test(t) && /👉/.test(t)) fourOk++; else tooMany++;
      if (/👀 도윤:/.test(t) && /👀 서연:/.test(t) && /👀 민수:/.test(t)) merged++;
      const lk = await leakCheck(p);
      if (!lk.same) leaks++;
      const cv = await covers(p);
      if (cv.length) { covered++; console.error("가린 곳(4명):", cv.join(",")); }
    }
    T.ok(covered === 0, '4명 판: 선생님 창이 더미 단추·받침대·상대 줄을 안 가림 (가린 곳 ' + covered + ')');
    T.ok(tries >= 4 && tooMany === 0, '4명 판: 상대 셋 모두 👀 한 줄씩, 💡 👉 📊 도 있음 (' + fourOk + '/' + tries + ')');
    T.ok(merged >= 3, '4명 판: 민수·서연·도윤 이름이 다 나옴 (' + merged + ')');
    T.ok(leaks === 0, '4명 판: 숨은 패를 바꿔도 글이 똑같음 (' + leaks + ')');
    const ns = await noScroll(p);
    T.ok(ns.fits && ns.inside, '4명 판: 폰 화면에서 창이 스크롤 없이 다 보임 (높이 ' + ns.h + 'px)');
    await p.close();
  }
  // ── 친구랑: 방장이 AI 선생님을 켜면 방장·손님 둘 다 같은 4가지 읽기 (손님은 방장이 보낸 수 기록으로 읽음) — 숨은 패는 각자 자기 것만
  {
    const AC = Object.assign({}, A, { online: Object.assign({}, A.online, { beforeStart: () => { const c = document.querySelector('[data-coach-sw]'); if (c && !c.checked) c.click(); } }) });
    const { H, W } = await T.pair(AC);
    const sample = { H: [], W: [] }, bad = { H: 0, W: 0 }, leak = { H: 0, W: 0 };
    const grab = (p) => p.evaluate(() => {
      const G = __cube.G; if (!G || !G.st || G.over || G.st.turn !== G.mySeat || G.st.phase !== 'draw') return null;
      const b = document.querySelector('.cpn-body'); const text = b ? b.innerText : '';
      if (!/💡/.test(text)) return null;
      return { k: G.log.length, text, seat: G.mySeat };
    });
    const last = { H: -1, W: -1 };
    for (let i = 0; i < 260 && (sample.H.length < 12 || sample.W.length < 12) && !(await H.evaluate(() => __cube.G.over)); i++) {
      for (const [key, p] of [['H', H], ['W', W]]) {
        const s = await grab(p);
        if (s && s.k !== last[key]) {
          last[key] = s.k; sample[key].push(s);
          if (!(/💡/.test(s.text) && /👉/.test(s.text) && /👀/.test(s.text) && /📊/.test(s.text))) bad[key]++;
          if (!(await leakCheck(p)).same) leak[key]++;
          await p.evaluate(() => { __cube.autoTurn(); __cube.autoTurn(); });
        } else if (!s) await p.evaluate(() => { const G = __cube.G; if (G && G.st && !G.over && G.st.turn === G.mySeat && G.st.phase === 'discard') __cube.autoTurn(); });
      }
      await T.sleep(120);
    }
    T.ok(sample.H.length >= 3 && sample.W.length >= 3, '친구랑: 방장 ' + sample.H.length + '번 · 손님 ' + sample.W.length + '번 내 차례에 선생님 글이 뜸');
    T.ok(bad.H === 0 && bad.W === 0, '친구랑: 방장·손님 모두 💡 👉 👀 📊 가 다 있음 (빠진 곳 ' + bad.H + '/' + bad.W + ')');
    T.ok(leak.H === 0 && leak.W === 0, '친구랑: 숨은 패를 바꿔 끼워도 글이 똑같음 (' + leak.H + '/' + leak.W + ')');
    const guestSeat = sample.W[0] && sample.W[0].seat, hostSeat = sample.H[0] && sample.H[0].seat;
    T.ok(hostSeat === 0 && guestSeat === 1, '친구랑: 방장 0번 · 손님 1번 자리 (' + hostSeat + '/' + guestSeat + ')');
    const wLater = sample.W[sample.W.length - 1];
    T.ok(wLater && /지난 차례/.test(sample.W.map(x => x.text).join(" ")), '친구랑: 손님도 지난 차례와 비교(📊)가 나옴 — 수 기록을 받아 따라감');
    await H.close().catch(() => {}); await W.close().catch(() => {});
  }
  T.ok(T.errors.length === 0, '페이지 오류 없음: ' + T.errors.slice(0, 3).join(' | '));
}, 'cube ui');

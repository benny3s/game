// 같은 숫자 찾기 화면 시험: node survival/test/gn-samenum_ui.js [--shots <폴더>]
//  · 폰 375×667 에서 화면 단추만 눌러 혼자 한 판 끝까지 (외우기 · 버저 · 호명 3칸 · 공개 · 끝) — 단계마다 가로/세로 넘침 · undefined 글 검사
//  · 타깃이 보이기 전에 누른 버저는 무시 · 눌러 본 시각(ms)이 행동에 실림 · 넘기기 = 안 누름
//  · 제한 시간: 외우기가 저절로 끝남 · 호명 5초가 지나면 상대에게 넘어감
//  · 한 기기 두 사람: 양쪽 버저 단추 · 먼저 누른 쪽이 호명 · 구경(AI 끼리) 모든 단계가 그려짐
//  · 1분 규칙 단계 + 직접 해 보기 · 복기 글(actText · review)
'use strict';
const path = require('path'), fs = require('fs');
const U = require('../../test/qa/lib/uitest');
const argv = process.argv.slice(2);
const sAt = argv.indexOf('--shots');
const shotDir = sAt >= 0 && argv[sAt + 1] ? path.resolve(argv[sAt + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const ID = 'gn-samenum', HARNESS = 'survival/test/s3ui_harness.html';
const VW = { width: 375, height: 667 };

// 화면 한 장의 넘침 · 글 검사 (브라우저 안에서)
const probe = () => {
  const stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
  let low = 0; for (const el of stage.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
  const buzz = document.querySelector('.sn-buzz'), bb = buzz ? buzz.getBoundingClientRect() : null;
  const dock = document.getElementById('dock'), dk = dock ? dock.getBoundingClientRect() : null;
  return {
    ovx: stage.scrollWidth > stage.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    ovy: Math.round(stage.scrollHeight - stage.clientHeight), below: Math.round(low - r.bottom),
    bad: /undefined|NaN|\[object|null/.test(stage.innerText), buzzOff: bb ? Math.round(bb.bottom - innerHeight) : 0,
    dockOverlap: dk && low > dk.top + 1 ? Math.round(low - dk.top) : 0, h: Math.round(r.height),
  };
};

U.main(async T => {
  const shot = async (p, name) => { if (shotDir) await p.screenshot({ path: path.join(shotDir, `${ID}_${name}.png`) }); };
  const open = async (qs, vp) => {
    const p = await T.open(HARNESS, `g=${ID}&${qs}`);
    await p.setViewportSize(vp || VW);
    if (!(await U.waitFor(p, () => window.__ready, null, 15000))) throw new Error('시험 틀이 안 열림 ' + JSON.stringify(await p.evaluate(() => window.__errors)));
    return p;
  };
  const view = p => p.evaluate(() => window.__h.view());
  const nowPhase = p => p.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, over: V.over, needs: V.needs, caller: V.caller, round: V.round, calls: V.calls, score: V.score, last: V.last, mine: V.mine }; });
  const noErr = async (p, msg) => { const e = await p.evaluate(() => window.__errors.slice()); T.ok(e.length === 0, `${msg}: 페이지 오류 없음 ${JSON.stringify(e.slice(0, 2))}`); };

  // ───── 1) 혼자 한 판 끝까지 (화면 단추만) ─────
  {
    const p = await open('seed=21&cfg_goal=5');
    await p.evaluate(() => window.__h.hold(true));
    const seen = new Set(), bad = new Set(); let steps = 0, buzzPress = 0, buzzPass = 0, calls3 = 0, early = 0, deselect = 0, invalidCalls = 0, shown = 0, lastKey = '', same = 0;
    while (steps++ < 900) {
      const s = await nowPhase(p);
      const pr = await p.evaluate(probe);
      const key = `${s.phase}${s.needs.includes(0) ? '-me' : '-wait'}`;
      if (pr.ovx) bad.add(`${key} 가로 넘침`);
      if (pr.ovy > 2 || pr.below > 2) bad.add(`${key} 세로 넘침 (${pr.ovy}/${pr.below}px, 높이 ${pr.h})`);
      if (pr.bad) bad.add(`${key} 글에 undefined/NaN/null`);
      if (pr.buzzOff > 0) bad.add(`${key} 버저가 화면 밖 ${pr.buzzOff}px`);
      if (!seen.has(key)) { seen.add(key); await shot(p, `solo_${key}`); }
      if (s.over) break;
      const fp = `${s.round}|${s.phase}|${s.calls}|${s.needs}`; if (fp === lastKey) same++; else { same = 0; lastKey = fp; }
      if (same > 300) { T.ok(false, `${ID}: 화면이 멈춤 (${fp})`); break; }
      if (s.phase === 'look' && s.needs.includes(0)) {
        const n = await p.evaluate(() => document.querySelectorAll('.sn-c.look .v').length);
        T.ok(n === 16, `${ID}: 외우는 동안 16칸 값이 다 보임 (${n})`);
        await p.click('[data-a=ready]'); continue;
      }
      if (s.phase === 'buzz' && s.needs.includes(0)) {
        if (!early) {                       // 타깃이 공개되기 전 누르기 → 무시 (파울 없음)
          early = 1; await p.click('[data-buzz]'); await T.sleep(60);
          const s2 = await nowPhase(p);
          T.ok(s2.needs.includes(0) && !s2.mine, `${ID}: 타깃이 보이기 전에 누른 버저는 무시돼요`);
        }
        await T.sleep(720);
        if (steps % 3 === 0) { buzzPass++; await p.click('[data-a=pass]'); }
        else { buzzPress++; await p.click('[data-buzz]'); }
        await T.sleep(20); continue;
      }
      if (s.phase === 'call' && s.caller === 0 && s.needs.includes(0)) {
        const plan = await p.evaluate(inv => { const h = window.__h, V = h.view(); const c = h.C.ai(V, h.ME, 'normal', h.rnd).c; if (inv) return { c: [c[1], c[0], c[2]], inv: 1 }; return { c, inv: 0 }; }, calls3 % 4 === 3);
        // 칸을 눌러 취소해 보기
        if (!deselect) {
          deselect = 1; await p.click(`.sn-c[data-c="${plan.c[0]}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.sn-c.sel').length) === 1, `${ID}: 칸을 누르면 선택돼요`);
          await p.click(`.sn-c[data-c="${plan.c[0]}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.sn-c.sel').length) === 0, `${ID}: 선택한 칸을 다시 누르면 취소돼요`);
        }
        for (let k = 0; k < 3; k++) {
          await p.click(`.sn-c[data-c="${plan.c[k]}"]`);
          if (k < 2) {
            const n = await p.evaluate(() => document.querySelectorAll('.sn-c.sel').length);
            T.ok(n === k + 1, `${ID}: ${k + 1}번째 칸 선택 표시 (${n})`);
            if (k === 1) { const steps = await p.evaluate(() => [...document.querySelectorAll('.sn-steps span')].map(x => x.className)); T.ok(steps.length === 3 && steps[2] === 'on', `${ID}: 3번째 안내(숫자)가 켜져 있어요 ${steps}`); }
          }
        }
        calls3++; if (plan.inv) invalidCalls++;
        const s3 = await nowPhase(p);
        T.ok(s3.phase !== 'call' || s3.calls > s.calls, `${ID}: 3칸을 누르면 호명이 나가요`);
        continue;
      }
      if (s.phase === 'show') {
        shown++;
        const txt = await p.evaluate(() => (document.querySelector('.sn-res') || {}).innerText || '');
        T.ok(txt.length > 6, `${ID}: 호명 결과 글이 나와요 (${txt.slice(0, 30)})`);
        await p.evaluate(() => window.__h.next()); continue;
      }
      // 상대 차례 · 기다림
      const adv = await p.evaluate(() => window.__h.next());
      if (!adv) await T.sleep(25);
    }
    for (const b of bad) T.ok(false, `${ID}: ${b}`);
    const fin = await nowPhase(p);
    T.ok(fin.over, `${ID}: 혼자 한 판이 끝까지 감 (${steps}걸음)`);
    T.ok(buzzPress >= 2 && buzzPass >= 1 && calls3 >= 2, `${ID}: 버저 ${buzzPress}번 · 넘기기 ${buzzPass}번 · 호명 ${calls3}번 (invalid ${invalidCalls}) 눌러 봄`);
    for (const k of ['look-me', 'buzz-me', 'call-me', 'show-wait']) T.ok(seen.has(k), `${ID}: ${k} 화면을 봄 (${[...seen]})`);
    const logb = await p.evaluate(() => window.__h.view().log.filter(e => e.k === 'buzz').map(e => e.ms));
    T.ok(logb.length > 3 && logb.every(m => m.every(x => Number.isFinite(x))), `${ID}: 버저 기록 ${logb.length}개 (ms 숫자)`);
    T.ok(logb.some(m => m[0] < 99999 && m[0] >= 0 && m[0] < 20000) && logb.some(m => m[0] === 99999), `${ID}: 누른 시각이 ms 로 실리고 넘기기는 99999`);
    const res = await p.evaluate(() => window.__h.result());
    T.ok(typeof res === 'string' && res.length > 8 && !/undefined|NaN/.test(res), `${ID}: 결과 글 ${res.slice(0, 40)}`);
    await shot(p, 'solo_end');
    await noErr(p, `${ID} 혼자`); await p.close();
  }

  // ───── 2) 시간 제한: 외우기 5초 뒤 저절로 준비 · 호명 5초가 지나면 상대에게 ─────
  {
    const p = await open('seed=33&cfg_goal=5');
    await p.evaluate(() => window.__h.hold(true));
    T.ok((await nowPhase(p)).phase === 'look', `${ID}: 처음은 외우기`);
    await T.sleep(5400);
    let s = await nowPhase(p);
    T.ok(s.phase !== 'look', `${ID}: 5초가 지나면 저절로 준비가 돼요 (${s.phase})`);
    // 버저 → 호명권을 얻을 때까지
    let guard = 0;
    while (guard++ < 40) {
      s = await nowPhase(p);
      if (s.phase === 'call' && s.caller === 0) break;
      if (s.phase === 'buzz' && s.needs.includes(0)) { await T.sleep(700); await p.click('[data-buzz]'); }
      else if (s.phase === 'call' && s.caller === 1) { await p.evaluate(() => window.__h.next()); await T.sleep(30); }
      else if (s.phase === 'show') { await p.evaluate(() => window.__h.next()); }
      else await T.sleep(40);
    }
    s = await nowPhase(p);
    T.ok(s.phase === 'call' && s.caller === 0, `${ID}: 호명 차례를 얻음 (${s.phase}/${s.caller})`);
    if (s.phase === 'call' && s.caller === 0) {
      const bar = await p.evaluate(() => !!document.querySelector('.sn-bar'));
      T.ok(bar, `${ID}: 호명 제한 시간 막대가 보여요`);
      await T.sleep(5500);
      const s2 = await nowPhase(p);
      T.ok(s2.phase === 'show' && s2.last && s2.last.tmo && s2.last.s === 0, `${ID}: 5초가 지나면 호명이 시간 초과로 넘어가요 (${s2.phase} ${JSON.stringify(s2.last && s2.last.tmo)})`);
      const txt = await p.evaluate(() => document.getElementById('stage').innerText);
      T.ok(/시간 안에/.test(txt) && !/undefined|NaN/.test(txt), `${ID}: 시간 초과 안내 글 (${txt.replace(/\s+/g, ' ').slice(0, 50)})`);
      await shot(p, 'timeout');
      await p.evaluate(() => window.__h.next());
      const s3 = await nowPhase(p);
      T.ok((s3.phase === 'call' && s3.caller === 1) || (s3.last && s3.last.s === 1 && s3.last.n === s2.last.n + 1), `${ID}: 상대에게 기회가 넘어가요 (${s3.phase}/${s3.caller}/${JSON.stringify(s3.last && [s3.last.s, s3.last.n])})`);
    }
    await noErr(p, `${ID} 시간`); await p.close();
  }

  // ───── 3) 한 기기 두 사람: 양쪽 버저 단추 ─────
  {
    const p = await open('seed=5');
    await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage');
      const st = C.init({ n: 2, seed: 77, cfg: { goal: 5, limit: 5 } }), seats = [{ kind: 'human', name: '지민', emoji: '🙂' }, { kind: 'human', name: '베니', emoji: '🙂' }];
      const L = window.__loc = { st, acts: [] };
      L.render = () => {
        const V = C.view(st, 'all'), me = V.needs.length ? V.needs[0] : -1;
        Ui.render(stage, V, { me, act: a => { const r = C.apply(st, me, a); L.acts.push([me, a.t, r.ok]); L.render(); return r; }, canAct: me >= 0 && !V.over, seats, mode: 'local', fast: false, coachOn: false, g: 900, wait: false, sfx() {}, toast() {} });
      };
      L.render();
    });
    const loc = () => p.evaluate(() => { const V = window.__h.C.view(window.__loc.st, 'all'); return { phase: V.phase, needs: V.needs, caller: V.caller, score: V.score, last: V.last, round: V.round, acts: window.__loc.acts.length, hasBack: V.back.filter(x => x !== null).length }; });
    let l = await loc();
    T.ok(l.phase === 'look' && l.needs.length === 2, `${ID}: 한 기기 외우기 단계 (두 자리 모두 대기)`);
    await p.click('[data-a=ready]');
    l = await loc();
    T.ok(l.phase === 'buzz', `${ID}: 한 기기에선 준비 한 번으로 두 자리 모두 준비돼요 (${l.phase})`);
    await T.sleep(760);
    T.ok(await p.evaluate(() => document.querySelectorAll('[data-buzz]').length) === 2, `${ID}: 양쪽 버저 단추 2개`);
    const pr = await p.evaluate(probe); T.ok(!pr.ovx && pr.ovy <= 2 && pr.below <= 2 && !pr.bad, `${ID}: 한 기기 버저 화면 넘침 없음 ${JSON.stringify(pr)}`);
    const names = await p.evaluate(() => [...document.querySelectorAll('[data-buzz]')].map(b => b.innerText.replace(/\s+/g, ' ')));
    T.ok(names[0].includes('지민') && names[1].includes('베니'), `${ID}: 단추에 각자 이름 ${names}`);
    await shot(p, 'local_buzz');
    // 이른 누름 = 무시 (아직 준비 안 된 새 라운드는 따로) · 두 번째 사람(베니)이 먼저 누름
    await p.click('[data-buzz="1"]'); await T.sleep(30);
    l = await loc();
    T.ok(l.phase === 'call' && l.caller === 1, `${ID}: 베니가 먼저 눌러 베니가 호명 (${l.phase}/${l.caller})`);
    const bz = await p.evaluate(() => window.__h.C.view(window.__loc.st, 'all').log.filter(e => e.k === 'buzz').pop());
    T.ok(bz && bz.ms[1] < 99999 && bz.ms[0] === 99999, `${ID}: 베니만 시각이 있고 지민은 못 누른 걸로 (${bz && bz.ms})`);
    const pr2 = await p.evaluate(probe); T.ok(!pr2.ovx && pr2.ovy <= 2 && pr2.below <= 2 && !pr2.bad, `${ID}: 한 기기 호명 화면 넘침 없음 ${JSON.stringify(pr2)}`);
    // 호명 → 라운드 몇 번
    let hits = 0;
    for (let g = 0; g < 80; g++) {
      l = await loc();
      if (l.phase === 'call') {
        const c = await p.evaluate(() => { const V = window.__h.C.view(window.__loc.st, window.__loc.st.caller); return window.__h.C.ai(V, V.seat, 'hard', Math.random).c; });
        for (const i of c) await p.click(`.sn-c[data-c="${i}"]`);
      } else if (l.phase === 'show') { if (l.last && l.last.hit) { hits++; } await p.evaluate(() => { window.__h.C.advance(window.__loc.st); window.__loc.render(); }); }
      else if (l.phase === 'buzz') { await T.sleep(720); await p.click('[data-a=pass]'); }
      else break;
      if (hits >= 2) break;
    }
    l = await loc();
    T.ok(hits >= 1 && l.score[0] + l.score[1] >= 1, `${ID}: 한 기기에서 정답이 나와 점수가 올라요 (${l.score})`);
    T.ok(l.round >= 2, `${ID}: 다음 라운드로 넘어감 (${l.round})`);
    const un = await p.evaluate(() => { const V = window.__h.C.view(window.__loc.st, 'all'); return document.querySelectorAll('.sn-c.peek').length + (V.phase === 'call' ? 0 : 0); });
    T.ok(un === 0, `${ID}: 한 기기에선 가려진 칸 값이 화면에 안 비쳐요 (${un})`);
    await noErr(p, `${ID} 한 기기`); await p.close();
  }

  // ───── 4) 구경(AI 끼리): 모든 단계가 그려지고 오류 없음 ─────
  {
    const p = await open('seed=8');
    const rep = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage'), out = { phases: {}, errs: [], bad: 0, ov: 0, texts: 0 };
      for (const seed of [3, 4, 9]) {
        const st = C.init({ n: 2, seed, cfg: { goal: 5, season: seed === 9 ? 4 : 3 } });
        let guard = 0; const rr = (() => { let a = seed * 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 2000) {
          const V = C.view(st, 'all');
          try { Ui.render(stage, V, { me: -1, act() { return { ok: false }; }, canAct: false, seats: [{ kind: 'ai', name: '삐약' }, { kind: 'ai', name: '나비' }], mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} }); } catch (e) { out.errs.push(String(e.stack || e).slice(0, 200)); break; }
          out.phases[V.phase] = (out.phases[V.phase] || 0) + 1; out.texts++;
          if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
          if (stage.scrollWidth > stage.clientWidth + 1) out.ov++;
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) { const r = C.apply(st, s, C.ai(C.view(st, s), s, ['easy', 'normal', 'hard'][(s + seed) % 3], rr)); if (!r.ok) { out.errs.push('AI 가 막힘'); return out; } }
        }
        Ui.render(stage, C.view(st, 'all'), { me: -1, act() { return { ok: false }; }, canAct: false, seats: [{ kind: 'ai', name: '삐약' }, { kind: 'ai', name: '나비' }], mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} });
        if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
        out.phases.over = (out.phases.over || 0) + 1;
      }
      return out;
    });
    T.ok(rep.errs.length === 0, `${ID}: 구경 화면 그리기 오류 없음 ${JSON.stringify(rep.errs)}`);
    T.ok(rep.bad === 0 && rep.ov === 0, `${ID}: 구경 화면 글/넘침 문제 없음 (글 ${rep.bad} · 넘침 ${rep.ov})`);
    T.ok(['look', 'buzz', 'call', 'show', 'over'].every(k => rep.phases[k] > 0), `${ID}: 구경 단계 ${JSON.stringify(rep.phases)}`);
    await noErr(p, `${ID} 구경`); await p.close();
  }

  // ───── 5) 1분 규칙 + 직접 해 보기 ─────
  {
    const p = await open('seed=2');
    const cnt = await p.evaluate(() => window.__h.tut(0).count);
    T.ok(cnt >= 4 && cnt <= 8, `${ID}: 1분 규칙 ${cnt}단계`);
    for (let i = 0; i < cnt; i++) {
      const t = await p.evaluate(i => window.__h.tut(i), i);
      T.ok(t.html > 20 && t.tag && t.title, `${ID}: 규칙 ${i + 1}단계 내용`);
      await p.evaluate(() => { const b = document.getElementById('tutStage'); b.style.left = '0'; b.style.top = '0'; b.style.zIndex = 99; b.style.background = '#120c16'; b.style.color = '#fff'; });
      if (i === 0 || t.interactive) await shot(p, `tut${i + 1}`);
      if (t.interactive) {
        // 5 ÷ 6 은 안 되는 식 → 한 번 틀려 보고, 8 + 4 = 12 (E · Y · T 칸) 로 맞춤
        for (const c of [0, 1, 2]) await p.click(`#tutStage [data-c="${c}"]`);
        const msg = await p.evaluate(() => document.getElementById('tutStage').innerText);
        T.ok(!(await p.evaluate(() => window.__tutDone)) && /다시/.test(msg), `${ID}: 틀린 식은 다시 해 보라고 나와요 (${msg.replace(/\s+/g, ' ').slice(-30)})`);
        for (const c of [3, 4, 10]) await p.click(`#tutStage [data-c="${c}"]`);
        T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 8 + 4 = 12 를 누르면 직접 해 보기가 끝나요`);
      }
      T.ok(!(await p.evaluate(() => /undefined|NaN|\[object/.test(document.getElementById('tutStage').innerText))), `${ID}: 규칙 ${i + 1}단계 글 이상 없음`);
      await p.evaluate(() => { document.getElementById('tutStage').style.left = '-9999px'; });
    }
    await noErr(p, `${ID} 규칙`); await p.close();
  }

  // ───── 6) 복기 글: actText · review ─────
  {
    const p = await open('seed=2');
    const r = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, out = { n: 0, bad: [], sev: [], withWhy: 0, texts: new Set() };
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const st = C.init({ n: 2, seed, cfg: { goal: 5 } });
        let guard = 0; const rr = (() => { let a = seed * 31; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 1500) {
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) {
            const V = C.view(st, s), best = C.ai(V, s, 'hard', rr);
            let mine = best; const k = rr();
            if (k < 0.4 && V.phase === 'buzz') mine = { t: 'buzz', ms: k < 0.2 ? 1800 : 99999 };
            if (k < 0.4 && V.phase === 'call') { const un = V.rev.map((x, i) => (x ? -1 : i)).filter(i => i >= 0); if (un.length >= 3 && k < 0.2) mine = { t: 'call', c: un.slice(0, 3) }; if (k >= 0.2 && k < 0.3) mine = { t: 'timeout' }; }
            const txt = Ui.actText(mine, V), rv = Ui.review(V, s, mine, best, {});
            out.n++; out.texts.add(txt);
            if (!txt || /undefined|NaN/.test(txt)) out.bad.push('actText ' + JSON.stringify(mine) + ' → ' + txt);
            if (rv) { if (!(rv.sev >= 0 && rv.sev <= 100) || (rv.why && /undefined|NaN|null/.test(rv.why))) out.bad.push('review ' + JSON.stringify(rv)); out.sev.push(rv.sev); if (rv.why) out.withWhy++; }
            const ap = C.apply(st, s, mine); if (!ap.ok) { C.apply(st, s, best); }
          }
        }
      }
      out.texts = [...out.texts].slice(0, 6);
      return out;
    });
    T.ok(r.bad.length === 0, `${ID}: 복기 글 이상 없음 ${JSON.stringify(r.bad.slice(0, 2))}`);
    T.ok(r.sev.length > 20 && r.withWhy > 20, `${ID}: review 가 ${r.sev.length}번 나옴 (왜 ${r.withWhy}) · 큰 실수(sev>=60) ${r.sev.filter(x => x >= 60).length}번 · 예: ${r.texts.slice(0, 4)}`);
    await p.close();
  }
  if (T.errors.length) T.ok(false, `${ID}: 콘솔/페이지 오류 ${T.errors.slice(0, 2)}`);
}, 'gn-samenum_ui');

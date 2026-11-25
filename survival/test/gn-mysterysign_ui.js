// 미스터리 사인 화면 시험: node survival/test/gn-mysterysign_ui.js [--shots <폴더>]
//  · 폰 375×667 에서 화면 단추만 눌러 혼자 한 판 끝까지 (아이템 · 숫자 키패드 · 버저 · 정답 쓰기 · 상대 기회 넘기기) — 단계마다 가로/세로 넘침 · undefined 글 · 숨은 규칙이 화면에 새는지 검사
//  · 힌트가 열리기 전에 누른 버저는 무시 · 눌러 본 시각(ms)이 행동에 실림 · 넘기기 = 안 누름(99999)
//  · 제한 시간: 버저 1분(빨리 감기 4초) 안에 아무도 안 누르면 다음 힌트 · 정답 쓰기 시간이 지나면 오답 처리
//  · 한 기기 두 사람: 양쪽 버저 단추 · 먼저 누른 쪽이 정답 · 시크릿 숫자는 같이 보는 화면에서 감춤
//  · 구경(AI 끼리) 모든 단계가 그려지고 숨은 규칙이 보임 · 1분 규칙 + 직접 해 보기 · 복기 글(actText · review)
'use strict';
const path = require('path'), fs = require('fs');
const U = require('../../test/qa/lib/uitest');
const argv = process.argv.slice(2);
const sAt = argv.indexOf('--shots');
const shotDir = sAt >= 0 && argv[sAt + 1] ? path.resolve(argv[sAt + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const ID = 'gn-mysterysign', HARNESS = 'survival/test/s3ui_harness.html';
const VW = { width: 375, height: 667 };

// 화면 한 장의 넘침 · 글 검사 (브라우저 안에서)
const probe = () => {
  const stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
  let low = 0; for (const el of stage.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
  const buzz = document.querySelector('.ms-buzz'), bb = buzz ? buzz.getBoundingClientRect() : null;
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
  const nowPhase = p => p.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, over: V.over, needs: V.needs, caller: V.caller, round: V.round, hintNo: V.hintNo, score: V.score, last: V.last, mine: V.mine, wrong: V.wrong }; });
  const noErr = async (p, msg) => { const e = await p.evaluate(() => window.__errors.slice()); T.ok(e.length === 0, `${msg}: 페이지 오류 없음 ${JSON.stringify(e.slice(0, 2))}`); };
  const typeNum = async (p, s, root) => { for (const ch of String(s)) await p.click(`${root || ''} ${ch === '-' ? '[data-k="neg"]' : `[data-k="${ch}"]`}`.trim()); };
  const bufText = p => p.evaluate(() => (document.querySelector('.ms-buf') || {}).innerText || '');
  const stageText = p => p.evaluate(() => document.getElementById('stage').innerText.replace(/\s+/g, ' '));

  // ───── 1) 혼자 한 판 끝까지 (화면 단추만) ─────
  {
    const p = await open('seed=21&cfg_rounds=5');
    await p.evaluate(() => window.__h.hold(true));
    const seen = new Set(), bad = new Set(); let steps = 0, buzzPress = 0, buzzPass = 0, early = 0, picks = 0, answers = 0, wrongs = 0, apass = 0, items = 0, itemToggle = 0, lastKey = '', same = 0, keyChk = 0, negChk = 0, leak = 0, shown = 0;
    while (steps++ < 1500) {
      const s = await nowPhase(p);
      const pr = await p.evaluate(probe);
      const key = `${s.phase}${s.phase === 'show' ? '' : s.needs.includes(0) ? '-me' : '-wait'}`;
      if (pr.ovx) bad.add(`${key} 가로 넘침`);
      if (pr.ovy > 2 || pr.below > 2) bad.add(`${key} 세로 넘침 (${pr.ovy}/${pr.below}px, 높이 ${pr.h})`);
      if (pr.bad) bad.add(`${key} 글에 undefined/NaN/null`);
      if (pr.buzzOff > 0) bad.add(`${key} 버저가 화면 밖 ${pr.buzzOff}px`);
      if (pr.dockOverlap > 2) bad.add(`${key} 아래 단추 줄에 가려짐 ${pr.dockOverlap}px`);
      if (!seen.has(key)) { seen.add(key); await shot(p, `solo_${key}`); }
      // 숨은 규칙 설명이 화면에 새지 않아야 해요 (라운드가 끝난 show 단계만 공개)
      if (s.phase !== 'show' && !s.over) {
        const lk = await p.evaluate(() => { const h = window.__h, st = h.st(), t = h.C.RULES[st.cur.rule].txt; return document.getElementById('stage').innerText.includes(t) || document.getElementById('playSub').innerText.includes(t); });
        if (lk) leak++;
      }
      if (s.over) break;
      const fp = `${s.round}|${s.phase}|${s.hintNo}|${s.needs}|${s.score}|${s.wrong}`; if (fp === lastKey) same++; else { same = 0; lastKey = fp; }
      if (same > 300) { T.ok(false, `${ID}: 화면이 멈춤 (${fp})`); break; }
      if (s.phase === 'show') {
        shown++;
        const txt = await p.evaluate(() => (document.querySelector('.ms-res') || {}).innerText || '');
        T.ok(txt.length > 6 && !/undefined|NaN/.test(txt), `${ID}: 결과 글이 나와요 (${txt.replace(/\s+/g, ' ').slice(0, 40)})`);
        if (s.last && s.last.end) T.ok(/숨은 규칙/.test(txt), `${ID}: 라운드가 끝나면 숨은 규칙이 공개돼요`);
        await p.evaluate(() => window.__h.next()); continue;
      }
      if (!s.needs.includes(0)) { const adv = await p.evaluate(() => window.__h.next()); if (!adv) await T.sleep(25); continue; }
      if (s.phase === 'item') {
        items++;
        const have = await p.evaluate(() => [...document.querySelectorAll('[data-item]')].map(b => b.dataset.item));
        const goTxt = () => p.evaluate(() => document.querySelector('[data-a=itemgo]').innerText);
        if (have.length && !itemToggle) {
          itemToggle = 1; await p.click(`[data-item="${have[0]}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.ms-ichip.on').length) === 1 && /쓰고 시작/.test(await goTxt()), `${ID}: 아이템 칩을 누르면 골라져요`);
          await p.click(`[data-item="${have[0]}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.ms-ichip.on').length) === 0 && /없이 시작/.test(await goTxt()), `${ID}: 다시 누르면 취소돼요`);
        }
        if (have.length && items % 2 === 1) await p.click(`[data-item="${have[0]}"]`);
        await p.click('[data-a=itemgo]'); continue;
      }
      if (s.phase === 'pick') {
        picks++;
        if (!keyChk) {          // 0 으로 시작 못 함 · 7자리까지 · ⌫ · 보내기 단추는 숫자가 있어야 켜져요
          keyChk = 1;
          await typeNum(p, '0'); T.ok(/숫자를 눌러요/.test(await bufText(p)), `${ID}: 힌트 숫자는 0 으로 시작할 수 없어요`);
          T.ok(await p.evaluate(() => document.querySelector('[data-a=send]').disabled), `${ID}: 숫자가 없으면 보내기가 꺼져 있어요`);
          await typeNum(p, '12345678'); const bt = await bufText(p);
          T.ok(/1234567/.test(bt) && !/12345678/.test(bt), `${ID}: 힌트 숫자는 7자리까지 (${bt.replace(/\s+/g, ' ')})`);
          for (let k = 0; k < 7; k++) await p.click('[data-k="back"]');
          T.ok(/숫자를 눌러요/.test(await bufText(p)), `${ID}: ⌫ 로 지워요`);
        }
        await typeNum(p, String(2 + ((steps * 7) % 40)));
        T.ok(await p.evaluate(() => !document.querySelector('[data-a=send]').disabled), `${ID}: 숫자를 쓰면 보내기가 켜져요`);
        await p.click('[data-a=send]'); continue;
      }
      if (s.phase === 'buzz') {
        if (!early) {                       // 힌트가 열리기 전에 누르기 → 무시
          early = 1; await p.click('[data-buzz]'); await T.sleep(60);
          const s2 = await nowPhase(p);
          T.ok(s2.needs.includes(0) && !s2.mine, `${ID}: 힌트가 열리기 전에 누른 버저는 무시돼요`);
          T.ok(await p.evaluate(() => !!document.querySelector('[data-bar]')), `${ID}: 1분 막대가 보여요`);
        }
        await T.sleep(720);
        const a = await p.evaluate(() => { const h = window.__h; return h.C.ai(h.view(), 0, 'hard', h.rnd); });
        if (a.ms >= 99999 || (buzzPress + buzzPass) % 5 === 4) { buzzPass++; await p.click('[data-a=pass]'); }
        else { buzzPress++; await p.click('[data-buzz]'); }
        await T.sleep(20); continue;
      }
      if (s.phase === 'ans' || s.phase === 'ans2') {
        answers++;
        const a = await p.evaluate(() => { const h = window.__h; return h.C.ai(h.view(), 0, 'hard', h.rnd); });
        if (!negChk) {
          negChk = 1; await typeNum(p, '-5'); T.ok(/-5/.test(await bufText(p)), `${ID}: − 키로 음수를 써요`);
          await p.click('[data-k="neg"]'); T.ok(!/-5/.test(await bufText(p)) && /5/.test(await bufText(p)), `${ID}: − 키를 다시 누르면 양수`);
          await p.click('[data-k="back"]'); T.ok(/숫자를 눌러요/.test(await bufText(p)), `${ID}: ⌫ 로 지움`);
        }
        T.ok(await p.evaluate(() => !!document.querySelector('[data-bar]')), `${ID}: 정답 제한 시간 막대가 보여요`);
        if (s.phase === 'ans2') T.ok(await p.evaluate(() => !!document.querySelector('[data-a=apass]')), `${ID}: 상대 기회에는 '넘기기' 단추가 있어요`);
        if (a.t === 'pass' && s.phase === 'ans2') { apass++; await p.click('[data-a=apass]'); continue; }
        let n = a.t === 'ans' ? a.n : '7';
        if (answers % 3 === 2 && a.t === 'ans') { n = String(+a.n + 1000003); wrongs++; }
        await typeNum(p, n); T.ok(await p.evaluate(() => !document.querySelector('[data-a=send]').disabled), `${ID}: 정답을 쓰면 보내기가 켜져요`);
        await p.click('[data-a=send]'); continue;
      }
      await T.sleep(25);
    }
    for (const b of bad) T.ok(false, `${ID}: ${b}`);
    const fin = await nowPhase(p);
    T.ok(fin.over, `${ID}: 혼자 한 판이 끝까지 감 (${steps}걸음)`);
    T.ok(leak === 0, `${ID}: 숨은 규칙 설명이 화면에 새지 않음 (샌 화면 ${leak})`);
    T.ok(picks >= 4 && buzzPress >= 2 && buzzPass >= 1 && answers >= 2, `${ID}: 숫자 ${picks}번 · 버저 ${buzzPress}번 · 넘기기 ${buzzPass}번 · 정답 ${answers}번 (일부러 오답 ${wrongs}번 · 기회 넘기기 ${apass}번) 눌러 봄`);
    for (const k of ['pick-me', 'buzz-me', 'ans-me', 'show']) T.ok(seen.has(k), `${ID}: ${k} 화면을 봄 (${[...seen]})`);
    const logb = await p.evaluate(() => window.__h.view().log.filter(e => e.k === 'buzz').map(e => e.ms));
    T.ok(logb.length > 3 && logb.every(m => m.every(x => Number.isFinite(x))), `${ID}: 버저 기록 ${logb.length}개 (ms 숫자)`);
    T.ok(logb.some(m => m[0] < 99999 && m[0] >= 0 && m[0] < 20000) && logb.some(m => m.includes(99999)), `${ID}: 누른 시각이 ms 로 실리고 넘기기는 99999`);
    const res = await p.evaluate(() => window.__h.result());
    T.ok(typeof res === 'string' && res.length > 8 && !/undefined|NaN/.test(res), `${ID}: 결과 글 ${res.replace(/<[^>]+>/g, ' ').slice(0, 50)}`);
    await shot(p, 'solo_end');
    await noErr(p, `${ID} 혼자`); await p.close();
  }

  // ───── 2) 한 기기 두 사람 + 시간 제한 (빨리 감기 = 버저 4초 · 정답 5초) ─────
  {
    const p = await open('seed=5');
    await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage');
      const st = C.init({ n: 2, seed: 77, cfg: { rounds: 5, items: 'none', problems: 'tv', first0: 0 } }), seats = [{ kind: 'human', name: '지민', emoji: '🙂' }, { kind: 'human', name: '베니', emoji: '🙂' }];
      const L = window.__loc = { st, acts: [] };
      L.render = () => {
        const V = C.view(st, 'all'), me = V.needs.length ? V.needs[0] : -1;
        Ui.render(stage, V, { me, act: a => { const r = C.apply(st, me, a); L.acts.push([me, a.t, r.ok]); L.render(); return r; }, canAct: me >= 0 && !V.over, seats, mode: 'local', fast: true, coachOn: false, g: 900, wait: false, sfx() {}, toast() {} });
      };
      L.render();
    });
    const loc = () => p.evaluate(() => { const V = window.__h.C.view(window.__loc.st, 'all'); return { phase: V.phase, needs: V.needs, caller: V.caller, score: V.score, last: V.last, round: V.round, hintNo: V.hintNo, acts: window.__loc.acts.slice() }; });
    const sendNum = async n => { await typeNum(p, n); await p.click('[data-a=send]'); };
    let l = await loc();
    T.ok(l.phase === 'pick' && l.needs.join() === '0', `${ID}: 한 기기 첫 단계는 선(지민)이 숫자를 내요 (${l.phase}/${l.needs})`);
    T.ok(/지민/.test(await stageText(p)), `${ID}: 한 기기 화면에 이름이 나와요`);
    await sendNum('34'); l = await loc(); T.ok(l.needs.join() === '1', `${ID}: 이어서 후(베니) 차례`);
    T.ok(/34/.test(await stageText(p)), `${ID}: 후는 선이 낸 숫자 34 를 봐요`);
    await sendNum('4'); l = await loc();
    T.ok(l.phase === 'buzz' && l.needs.length === 2, `${ID}: 힌트가 열리면 버저 (두 자리 모두 대기)`);
    T.ok(await p.evaluate(() => document.querySelectorAll('[data-buzz]').length) === 2, `${ID}: 양쪽 버저 단추 2개`);
    const names = await p.evaluate(() => [...document.querySelectorAll('[data-buzz]')].map(b => b.innerText.replace(/\s+/g, ' ')));
    T.ok(names[0].includes('지민') && names[1].includes('베니'), `${ID}: 단추에 각자 이름 ${names}`);
    const pr = await p.evaluate(probe); T.ok(!pr.ovx && pr.ovy <= 2 && pr.below <= 2 && !pr.bad && pr.buzzOff <= 0, `${ID}: 한 기기 버저 화면 넘침 없음 ${JSON.stringify(pr)}`);
    await shot(p, 'local_buzz');
    // 아무도 안 누르면 4초(빨리 감기) 뒤 둘 다 안 누른 것 → 다음 힌트
    await T.sleep(4600); l = await loc();
    T.ok(l.phase === 'pick' && l.hintNo === 2 && l.acts.filter(a => a[1] === 'buzz').length === 2, `${ID}: 시간이 지나면 둘 다 넘기고 다음 힌트로 (${l.phase}/힌트 ${l.hintNo})`);
    T.ok(l.needs.join() === '1', `${ID}: 두 번째 힌트는 선이 바뀌어 베니가 먼저 (${l.needs})`);
    await sendNum('9'); await sendNum('9'); l = await loc();
    T.ok(l.phase === 'buzz', `${ID}: 두 번째 힌트도 버저`);
    await p.click('[data-buzz="1"]'); await T.sleep(40); l = await loc();
    T.ok(l.phase === 'ans' && l.caller === 1, `${ID}: 베니가 먼저 눌러 베니가 정답을 써요 (${l.phase}/${l.caller})`);
    const bz = await p.evaluate(() => window.__h.C.view(window.__loc.st, 'all').log.filter(e => e.k === 'buzz').pop());
    T.ok(bz && bz.ms[1] < 99999 && bz.ms[0] === 99999 && bz.w === 1, `${ID}: 베니만 시각이 있고 지민은 못 누른 걸로 (${bz && bz.ms})`);
    T.ok(/베니/.test(await stageText(p)) && await p.evaluate(() => !!document.querySelector('[data-a=send]')), `${ID}: 정답 쓰기 화면`);
    const pr2 = await p.evaluate(probe); T.ok(!pr2.ovx && pr2.ovy <= 2 && pr2.below <= 2 && !pr2.bad, `${ID}: 한 기기 정답 화면 넘침 없음 ${JSON.stringify(pr2)}`);
    // 정답 쓰기 5초(빨리 감기) 안에 못 쓰면 오답 처리
    await T.sleep(5600); l = await loc();
    T.ok(l.phase === 'show' && l.last && l.last.tmo && l.last.s === 1 && l.score[1] === -1, `${ID}: 시간 안에 못 쓰면 오답(−1) 처리 (${l.phase} ${JSON.stringify(l.last && l.last.tmo)} ${l.score})`);
    T.ok(/시간 안에/.test(await stageText(p)), `${ID}: 시간 초과 안내 글`);
    await p.evaluate(() => { window.__h.C.advance(window.__loc.st); window.__loc.render(); }); l = await loc();
    T.ok(l.phase === 'ans2' && l.needs.join() === '0', `${ID}: 기회가 상대(지민)에게 (${l.phase}/${l.needs})`);
    T.ok(await p.evaluate(() => !!document.querySelector('[data-a=apass]')), `${ID}: 상대 기회에는 넘기기 단추`);
    // 지민이 맞는 답을 써서 라운드 끝
    const ans = await p.evaluate(() => window.__h.C.view(window.__loc.st, 'all').rule.ans);
    await sendNum(ans); l = await loc();
    T.ok(l.phase === 'show' && l.last && l.last.hit && l.score[0] === 1, `${ID}: 지민이 맞혀 +1 (${l.score})`);
    T.ok(/숨은 규칙/.test(await stageText(p)), `${ID}: 라운드가 끝나면 숨은 규칙이 공개돼요`);
    await p.evaluate(() => { window.__h.C.advance(window.__loc.st); window.__loc.render(); }); l = await loc();
    T.ok(l.round === 2 && l.phase === 'pick', `${ID}: 다음 라운드`);
    await noErr(p, `${ID} 한 기기`); await p.close();
  }

  // ───── 3) 한 기기 + 시크릿: 같이 보는 화면에서 감춘 숫자가 안 비쳐요 ─────
  {
    const p = await open('seed=5');
    await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage');
      const st = C.init({ n: 2, seed: 4, cfg: { rounds: 5, items: 'eq', problems: 'tv', first0: 0 } }), seats = [{ kind: 'human', name: '지민', emoji: '🙂' }, { kind: 'human', name: '베니', emoji: '🙂' }];
      const L = window.__loc = { st, acts: [] };
      L.render = () => {
        const V = C.view(st, 'all'), me = V.needs.length ? V.needs[0] : -1;
        Ui.render(stage, V, { me, act: a => { const r = C.apply(st, me, a); L.acts.push([me, a.t, r.ok]); L.render(); return r; }, canAct: me >= 0 && !V.over, seats, mode: 'local', fast: true, coachOn: false, g: 910, wait: false, sfx() {}, toast() {} });
      };
      L.render();
    });
    const loc = () => p.evaluate(() => { const V = window.__h.C.view(window.__loc.st, 'all'); return { phase: V.phase, needs: V.needs, hints: V.hints.length }; });
    let l = await loc();
    T.ok(l.phase === 'item' && l.needs.length === 2, `${ID}: 아이템을 고르는 단계`);
    const pr0 = await p.evaluate(probe); T.ok(!pr0.ovx && pr0.ovy <= 2 && pr0.below <= 2 && !pr0.bad, `${ID}: 아이템 화면 넘침 없음 ${JSON.stringify(pr0)}`);
    await shot(p, 'item');
    await p.click('[data-item="secret"]'); await p.click('[data-a=itemgo]');      // 지민: 시크릿
    await p.click('[data-a=itemgo]');                                               // 베니: 안 씀
    l = await loc(); T.ok(l.phase === 'pick', `${ID}: 아이템을 고르면 숫자 단계 (${l.phase})`);
    await typeNum(p, '7654321'); await p.click('[data-a=send]');
    const t1 = await stageText(p);
    T.ok(/비공개/.test(t1) && !/7654321/.test(t1), `${ID}: 시크릿이면 후 화면에 선의 숫자가 안 보여요 (${t1.slice(0, 60)})`);
    await typeNum(p, '5'); await p.click('[data-a=send]');
    const t2 = await stageText(p), hs = await p.evaluate(() => document.querySelector('.ms-hs').innerText.replace(/\s+/g, ' '));
    T.ok(!/7654321/.test(t2) && /🔒/.test(hs) && /5/.test(hs), `${ID}: 같이 보는 버저 화면에서 감춘 숫자는 🔒 (${hs})`);
    await shot(p, 'local_secret');
    await noErr(p, `${ID} 시크릿`); await p.close();
  }

  // ───── 4) 구경(AI 끼리): 모든 단계가 그려지고 숨은 규칙이 보여요 ─────
  {
    const p = await open('seed=8');
    const rep = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage'), out = { phases: {}, errs: [], bad: 0, ov: 0, spy: 0, buzzSpy: 0 };
      for (const seed of [3, 4, 9]) {
        const st = C.init({ n: 2, seed, cfg: { rounds: 5, items: ['tv', 'eq', 'none'][seed % 3] } });
        let guard = 0; const rr = (() => { let a = seed * 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 3000) {
          const V = C.view(st, 'all');
          try { Ui.render(stage, V, { me: -1, act() { return { ok: false }; }, canAct: false, seats: [{ kind: 'ai', name: '삐약' }, { kind: 'ai', name: '나비' }], mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} }); } catch (e) { out.errs.push(String(e.stack || e).slice(0, 200)); break; }
          out.phases[V.phase] = (out.phases[V.phase] || 0) + 1;
          if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
          if (stage.scrollWidth > stage.clientWidth + 1) out.ov++;
          if (V.phase !== 'show' && V.phase !== 'end') { if (stage.querySelector('.ms-spy')) out.spy++; if (V.phase === 'buzz' && stage.querySelector('.ms-spy')) out.buzzSpy++; }
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
    T.ok(['item', 'pick', 'buzz', 'ans', 'show', 'over'].every(k => rep.phases[k] > 0), `${ID}: 구경 단계 ${JSON.stringify(rep.phases)}`);
    T.ok(rep.spy > 20 && rep.buzzSpy > 5, `${ID}: 구경에는 숨은 규칙이 보여요 (${rep.spy})`);
    await noErr(p, `${ID} 구경`); await p.close();
  }

  // ───── 5) 1분 규칙 + 직접 해 보기 ─────
  {
    const p = await open('seed=2');
    const cnt = await p.evaluate(() => window.__h.tut(0).count);
    T.ok(cnt >= 5 && cnt <= 8, `${ID}: 1분 규칙 ${cnt}단계`);
    let inter = 0;
    for (let i = 0; i < cnt; i++) {
      const t = await p.evaluate(i => window.__h.tut(i), i);
      T.ok(t.html > 20 && t.tag && t.title, `${ID}: 규칙 ${i + 1}단계 내용`);
      await p.evaluate(() => { const b = document.getElementById('tutStage'); b.style.left = '0'; b.style.top = '0'; b.style.zIndex = 99; b.style.background = '#120c16'; b.style.color = '#fff'; });
      if (i === 0 || t.interactive) await shot(p, `tut${i + 1}`);
      if (t.interactive) {
        inter++;
        // 힌트 9 ❓ 11 = 202 → 3 ❓ 5 의 정답은 34: 한 번 틀려 보고 맞춤
        await typeNum(p, '30', '#tutStage'); await p.click('#tutStage [data-a=send]');
        const msg = await p.evaluate(() => document.getElementById('tutStage').innerText);
        T.ok(!(await p.evaluate(() => window.__tutDone)) && /다시/.test(msg), `${ID}: 틀린 답은 다시 해 보라고 나와요 (${msg.replace(/\s+/g, ' ').slice(-34)})`);
        await typeNum(p, '34', '#tutStage'); await p.click('#tutStage [data-a=send]');
        T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 34 를 쓰면 직접 해 보기가 끝나요`);
      }
      T.ok(!(await p.evaluate(() => /undefined|NaN|\[object/.test(document.getElementById('tutStage').innerText))), `${ID}: 규칙 ${i + 1}단계 글 이상 없음`);
      await p.evaluate(() => { document.getElementById('tutStage').style.left = '-9999px'; });
    }
    T.ok(inter === 1, `${ID}: 직접 해 보기 한 단계`);
    await noErr(p, `${ID} 규칙`); await p.close();
  }

  // ───── 6) 복기 글: actText · review · 선생님 ─────
  {
    const p = await open('seed=2');
    const r = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, out = { n: 0, bad: [], sev: [], withWhy: 0, texts: new Set(), mut: 0, coach: 0, coachBad: [] };
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const st = C.init({ n: 2, seed, cfg: { rounds: 5, items: seed % 2 ? 'eq' : 'tv' } });
        let guard = 0; const rr = (() => { let a = seed * 31; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 3000) {
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) {
            const V = C.view(st, s), best = C.ai(V, s, 'hard', rr);
            let mine = best; const k = rr();
            if (V.phase === 'buzz' && k < 0.5) mine = { t: 'buzz', ms: k < 0.25 ? 1800 : 99999 };
            if (V.phase === 'pick' && k < 0.4) mine = { t: 'num', n: String(1 + Math.floor(rr() * 30)) };
            if (V.phase === 'ans' && k < 0.4) mine = k < 0.2 ? { t: 'ans', n: String(Math.floor(rr() * 2000) - 5) } : { t: 'timeout' };
            if (V.phase === 'ans2' && k < 0.4) mine = k < 0.2 ? { t: 'ans', n: String(Math.floor(rr() * 2000)) } : { t: 'pass' };
            const before = JSON.stringify(V), txt = Ui.actText(mine, V), rv = Ui.review(V, s, mine, best, {});
            if (JSON.stringify(V) !== before) out.mut++;
            out.n++; out.texts.add(txt);
            if (!txt || /undefined|NaN/.test(txt)) out.bad.push('actText ' + JSON.stringify(mine) + ' → ' + txt);
            if (rv) { if (!(rv.sev >= 0 && rv.sev <= 100) || (rv.why && /undefined|NaN|null/.test(rv.why)) || (rv.best && /undefined|NaN/.test(rv.best))) out.bad.push('review ' + JSON.stringify(rv)); out.sev.push(rv.sev); if (rv.why) out.withWhy++; }
            if (out.coach < 60) { const c = Ui.coach(V, s, -1, ['나', '삐약']); out.coach++; if (!c || !['opp', 'mine', 'rec', 'why'].every(q => typeof c[q] === 'string') || !c.opp || !c.mine || !c.rec || /undefined|NaN|\[object|null/.test(JSON.stringify(c))) out.coachBad.push(V.phase + ' ' + JSON.stringify(c)); }
            const ap = C.apply(st, s, mine); if (!ap.ok) { C.apply(st, s, best); }
          }
        }
      }
      out.texts = [...out.texts].slice(0, 8);
      return out;
    });
    T.ok(r.bad.length === 0, `${ID}: 복기 글 이상 없음 ${JSON.stringify(r.bad.slice(0, 2))}`);
    T.ok(r.mut === 0, `${ID}: actText · review 가 view 를 안 바꿔요`);
    T.ok(r.sev.length > 40 && r.withWhy > 40, `${ID}: review 가 ${r.sev.length}번 나옴 (왜 ${r.withWhy}) · 큰 실수(sev>=60) ${r.sev.filter(x => x >= 60).length}번 · 예: ${r.texts.slice(0, 5)}`);
    T.ok(r.sev.some(x => x >= 60), `${ID}: 큰 실수(sev>=60)도 잡아내요`);
    T.ok(r.coachBad.length === 0 && r.coach >= 50, `${ID}: 선생님 4칸이 단계마다 나와요 (${r.coach}번) ${JSON.stringify(r.coachBad.slice(0, 1))}`);
    await p.close();
  }
  if (T.errors.length) T.ok(false, `${ID}: 콘솔/페이지 오류 ${T.errors.slice(0, 2)}`);
}, 'gn-mysterysign_ui');

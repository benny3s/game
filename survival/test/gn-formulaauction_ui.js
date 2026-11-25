// 수식 경매 화면 시험: node survival/test/gn-formulaauction_ui.js [--shots <폴더>]
//  · 폰 375×667 에서 화면 단추만 눌러 혼자 한 판 끝까지 (큐브 고르기 · 내기 · 넘기기 · 막기 · 13회 가넷 · 끝) — 단계마다 가로/세로 넘침 · undefined 글 · 눌러지는 크기 검사
//  · 큐브 선택/취소 · 서 있는 입찰보다 낮은 큐브는 못 누름 · 같은 큐브는 '막기' 표시
//  · 제한 시간: 창 제한(5초)이 지나면 저절로 넘김
//  · 3 · 4 · 5명 자리 · 구경(AI 끼리) 모든 단계가 그려짐
//  · 1분 규칙 단계 + 직접 해 보기(막기 · 10 ÷ 1) · 복기 글(actText · review) · 선생님 글
'use strict';
const path = require('path'), fs = require('fs');
const U = require('../../test/qa/lib/uitest');
const argv = process.argv.slice(2);
const sAt = argv.indexOf('--shots');
const shotDir = sAt >= 0 && argv[sAt + 1] ? path.resolve(argv[sAt + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const ID = 'gn-formulaauction', HARNESS = 'survival/test/s3ui_harness.html';
const [VWW, VWH] = (process.env.GN_VW || '375x667').split('x').map(Number), VW = { width: VWW, height: VWH };   // GN_VW=360x640 처럼 다른 폰 크기도 볼 수 있어요

// 화면 한 장의 넘침 · 글 · 누르는 크기 검사 (브라우저 안에서)
const probe = () => {
  const stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
  let low = 0; for (const el of stage.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
  const dock = document.getElementById('dock'), dk = dock ? dock.getBoundingClientRect() : null;
  let small = 0, off = 0;
  for (const b of stage.querySelectorAll('.fa-cb:not(.gone):not(.off),.fa-go,.fa-pass')) { const x = b.getBoundingClientRect(); if (x.width < 38 || x.height < 34) small++; if (x.bottom > innerHeight + 1 || x.right > innerWidth + 1) off++; }
  return {
    ovx: stage.scrollWidth > stage.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    ovy: Math.round(stage.scrollHeight - stage.clientHeight), below: Math.round(low - r.bottom),
    bad: /undefined|NaN|\[object|null/.test(stage.innerText), small, off,
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
  const nowPhase = p => p.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, over: V.over, needs: V.needs, lot: V.lot, win: V.win, hi: V.hi, mine: V.mine, last: V.last, cubes: V.cubes[0], gar: V.gar, nums: V.nums[0], ops: V.ops[0] }; });
  const noErr = async (p, msg) => { const e = await p.evaluate(() => window.__errors.slice()); T.ok(e.length === 0, `${msg}: 페이지 오류 없음 ${JSON.stringify(e.slice(0, 2))}`); };

  // ───── 1) 혼자 한 판 끝까지 (화면 단추만 · 5명) ─────
  for (const n of [5, 3]) {
    const p = await open(`seed=${n === 5 ? 21 : 22}&n=${n}&cfg_limit=0`);
    await p.evaluate(() => window.__h.hold(true));
    const seen = new Set(), bad = new Set(); let steps = 0, bids = 0, passes = 0, blocks = 0, g13 = 0, selCheck = 0, offCheck = 0, shown = 0, lastKey = '', same = 0, lotsSeen = new Set();
    while (steps++ < 2500) {
      const s = await nowPhase(p);
      const pr = await p.evaluate(probe);
      const key = `${s.phase}${s.needs.includes(0) ? '-me' : '-wait'}`;
      if (pr.ovx) bad.add(`${key} 가로 넘침`);
      if (pr.ovy > 2 || pr.below > 2) { bad.add(`${key} 세로 넘침 (${pr.ovy}/${pr.below}px, 높이 ${pr.h}) · ${s.lot}회 창${s.win} hi=${JSON.stringify(s.hi)}`); await shot(p, `ovy_${s.lot}_${s.win}`); }
      if (pr.bad) bad.add(`${key} 글에 undefined/NaN/null`);
      if (pr.small) bad.add(`${key} 눌러야 하는 단추가 너무 작음 ${pr.small}개`);
      if (pr.off) bad.add(`${key} 단추가 화면 밖`);
      if (pr.dockOverlap > 2) bad.add(`${key} 아래 단추줄과 겹침 ${pr.dockOverlap}px`);
      if (!seen.has(key)) { seen.add(key); await shot(p, `solo${n}_${key}`); }
      lotsSeen.add(s.lot);
      if (s.over) break;
      const fp = `${s.lot}|${s.win}|${s.phase}|${s.needs}`; if (fp === lastKey) same++; else { same = 0; lastKey = fp; }
      if (same > 300) { T.ok(false, `${ID}: 화면이 멈춤 (${fp})`); break; }
      if (s.phase === 'show') {
        shown++;
        const txt = await p.evaluate(() => (document.querySelector('.fa-res') || {}).innerText || '');
        T.ok(txt.length > 6, `${ID}: 경매 결과 글이 나와요 (${txt.slice(0, 30)})`);
        await p.evaluate(() => window.__h.next()); continue;
      }
      if (s.phase === 'bid' && s.needs.includes(0)) {
        const act = await p.evaluate(() => { const h = window.__h, V = h.view(); return h.C.ai(V, h.ME, 'hard', h.rnd); });
        // 처음 한 번: 고르기 · 취소 · 낮은 큐브 눌림 검사
        if (!selCheck && s.cubes.length) {
          selCheck = 1;
          const c = act.t === 'bid' ? act.c : s.cubes[s.cubes.length - 1];
          T.ok(await p.evaluate(() => document.querySelector('[data-a=go]').disabled), `${ID}: 큐브를 고르기 전엔 '내기' 단추가 꺼져 있어요`);
          await p.click(`.fa-cb[data-c="${c}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.fa-cb.sel').length) === 1 && !(await p.evaluate(() => document.querySelector('[data-a=go]').disabled)), `${ID}: 큐브를 누르면 선택되고 내기 단추가 켜져요`);
          await p.click(`.fa-cb[data-c="${c}"]`);
          T.ok(await p.evaluate(() => document.querySelectorAll('.fa-cb.sel').length) === 0, `${ID}: 선택한 큐브를 다시 누르면 취소돼요`);
        }
        if (s.hi && !offCheck) {      // 서 있는 입찰보다 낮은 큐브는 못 눌러요
          offCheck = 1;
          const low = s.cubes.filter(c => c < s.hi.c);
          if (low.length) { await p.click(`.fa-cb[data-c="${low[0]}"]`, { force: true }).catch(() => {}); T.ok(await p.evaluate(() => document.querySelectorAll('.fa-cb.sel').length) === 0, `${ID}: 서 있는 입찰(${s.hi.c})보다 낮은 큐브 ${low[0]} 는 선택이 안 돼요`); }
          const blk = await p.evaluate(() => document.querySelectorAll('.fa-cb.blk').length);
          T.ok(blk === (s.cubes.includes(s.hi.c) ? 1 : 0), `${ID}: 서 있는 입찰과 같은 큐브만 '막기' 표시 (${blk})`);
        }
        if (act.t === 'bid' && steps % 5 !== 0) { bids++; if (s.hi && act.c === s.hi.c) blocks++; await p.click(`.fa-cb[data-c="${act.c}"]`); await p.click('[data-a=go]'); }
        else { passes++; await p.click('[data-a=pass]'); }
        await T.sleep(15); continue;
      }
      if (s.phase === 'gbid' && s.needs.includes(0)) {
        g13++;
        const lo = (s.hi ? s.hi.g : 0) + 1, have = s.gar[0];
        const sh = await p.evaluate(() => document.querySelector('.fa-gs b').innerText);
        T.ok(sh.includes(String(lo)) || have < lo, `${ID}: 가넷 칸이 최소 ${lo}개부터 (${sh.replace(/\s+/g, ' ')})`);
        await p.click('[data-g="1"]'); await p.click('[data-g="1"]');
        const v1 = await p.evaluate(() => document.querySelector('.fa-gs b').innerText);
        T.ok(parseInt(v1, 10) <= have && parseInt(v1, 10) >= lo, `${ID}: + 를 눌러도 가진 가넷(${have}) 안에서 (${v1.replace(/\s+/g, ' ')})`);
        await p.click('[data-g="-1"]'); await p.click('[data-g="-1"]'); await p.click('[data-g="-1"]');
        const v2 = await p.evaluate(() => document.querySelector('.fa-gs b').innerText);
        T.ok(parseInt(v2, 10) >= lo, `${ID}: − 를 눌러도 서 있는 가넷보다 낮아지지 않아요 (${v2.replace(/\s+/g, ' ')})`);
        if (g13 === 1 && have >= lo) await p.click('[data-a=go]'); else await p.click('[data-a=pass]');
        continue;
      }
      const adv = await p.evaluate(() => window.__h.next());
      if (!adv) await T.sleep(20);
    }
    for (const b of bad) T.ok(false, `${ID}(${n}명): ${b}`);
    const fin = await nowPhase(p);
    T.ok(fin.over, `${ID}(${n}명): 혼자 한 판이 끝까지 감 (${steps}걸음 · ${lotsSeen.size}개 경매)`);
    T.ok(bids >= 3 && passes >= 2, `${ID}(${n}명): 입찰 ${bids}번(막기 ${blocks}) · 넘기기 ${passes}번 눌러 봄`);
    T.ok(seen.has('bid-me') && seen.has('show-wait'), `${ID}(${n}명): 화면 단계를 봄 (${[...seen]})`);
    const res = await p.evaluate(() => window.__h.result());
    T.ok(typeof res === 'string' && res.length > 8 && !/undefined|NaN/.test(res), `${ID}(${n}명): 결과 글 ${res.slice(0, 40)}`);
    const endTxt = await p.evaluate(() => document.getElementById('stage').innerText);
    T.ok(/10|가까운/.test(endTxt) && !/undefined|NaN/.test(endTxt), `${ID}(${n}명): 끝 화면 글 (${endTxt.replace(/\s+/g, ' ').slice(0, 50)})`);
    await shot(p, `solo${n}_end`);
    await noErr(p, `${ID} 혼자 ${n}명`); await p.close();
  }

  // ───── 2) 제한 시간: 창 5초가 지나면 저절로 넘김 ─────
  {
    const p = await open('seed=33&cfg_limit=5');
    await p.evaluate(() => window.__h.hold(true));
    let s = await nowPhase(p);
    T.ok(s.phase === 'bid' && s.needs.includes(0) && !s.mine, `${ID}: 처음은 내 입찰 차례`);
    T.ok(await p.evaluate(() => !!document.querySelector('.fa-bar')), `${ID}: 제한 시간 막대가 보여요`);
    await T.sleep(5600);
    s = await nowPhase(p);
    T.ok(s.lot > 1 || s.phase === 'show' || s.win > 1 || (s.mine && s.mine.t === 'pass'), `${ID}: 5초가 지나면 저절로 넘겨져요 (lot ${s.lot} win ${s.win} ${s.phase})`);
    await shot(p, 'timeout');
    await noErr(p, `${ID} 시간`); await p.close();
    const q = await open('seed=34&cfg_limit=0');
    T.ok(await q.evaluate(() => !document.querySelector('.fa-bar')), `${ID}: 제한 없음이면 막대가 없어요`);
    await noErr(q, `${ID} 제한 없음`); await q.close();
  }

  // ───── 3) 구경(AI 끼리) · 3·4·5명: 모든 단계가 그려지고 오류 없음 ─────
  {
    const p = await open('seed=8');
    const rep = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage'), out = { phases: {}, errs: [], bad: 0, ov: 0, texts: 0, ends: [] };
      for (const [n, seed] of [[5, 3], [4, 4], [3, 9]]) {
        const st = C.init({ n, seed, cfg: { limit: 0 } });
        const seats = Array.from({ length: n }, (_, i) => ({ kind: 'ai', name: ['삐약', '나비', '범수', '뽀송', '치즈'][i] }));
        let guard = 0; const rr = (() => { let a = seed * 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 3000) {
          const V = C.view(st, 'all');
          try { Ui.render(stage, V, { me: -1, act() { return { ok: false }; }, canAct: false, seats, mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} }); } catch (e) { out.errs.push(String(e.stack || e).slice(0, 200)); break; }
          out.phases[V.phase] = (out.phases[V.phase] || 0) + 1; out.texts++;
          if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
          if (stage.scrollWidth > stage.clientWidth + 1) out.ov++;
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) { if (!C.needs(st).includes(s)) continue; const r = C.apply(st, s, C.ai(C.view(st, s), s, ['easy', 'normal', 'hard'][(s + seed) % 3], rr)); if (!r.ok) { out.errs.push('AI 가 막힘'); return out; } }
        }
        const Vend = C.view(st, 'all');
        Ui.render(stage, Vend, { me: -1, act() { return { ok: false }; }, canAct: false, seats, mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} });
        if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
        out.phases.over = (out.phases.over || 0) + 1; out.ends.push(Vend.endBy);
      }
      return out;
    });
    T.ok(rep.errs.length === 0, `${ID}: 구경 화면 그리기 오류 없음 ${JSON.stringify(rep.errs)}`);
    T.ok(rep.bad === 0 && rep.ov === 0, `${ID}: 구경 화면 글/넘침 문제 없음 (글 ${rep.bad} · 넘침 ${rep.ov})`);
    T.ok(['bid', 'gbid', 'show', 'over'].every(k => rep.phases[k] > 0), `${ID}: 구경 단계 ${JSON.stringify(rep.phases)} · 끝 ${rep.ends}`);
    await noErr(p, `${ID} 구경`); await p.close();
  }

  // ───── 4) 1분 규칙 + 직접 해 보기 ─────
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
        const html = await p.evaluate(() => document.getElementById('tutStage').innerHTML);
        if (html.includes('data-c="5"')) {                               // 막기: 다른 큐브를 눌러 보고 같은 5 로
          await p.click('#tutStage [data-c="8"]');
          T.ok(!(await p.evaluate(() => window.__tutDone)) && /높아서|막으려면/.test(await p.evaluate(() => document.getElementById('tutStage').innerText)), `${ID}: 다른 큐브를 누르면 막기가 아니라고 알려 줘요`);
          await p.click('#tutStage [data-c="5"]');
          T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 같은 큐브 5 를 누르면 직접 해 보기가 끝나요`);
        } else {                                                          // 10 ÷ 1: 순서가 틀리면 다시, 10 ÷ 1 이면 끝
          await p.click('#tutStage [data-t="0"]'); await p.click('#tutStage [data-t="1"]'); await p.click('#tutStage [data-t="2"]');   // 1 10 ÷ → 숫자 숫자 기호 (틀림)
          const msg = await p.evaluate(() => document.getElementById('tutStage').innerText);
          T.ok(!(await p.evaluate(() => window.__tutDone)) && /다시/.test(msg), `${ID}: 틀린 순서는 다시 해 보라고 나와요 (${msg.replace(/\s+/g, ' ').slice(-30)})`);
          await p.click('#tutStage [data-t="1"]'); await p.click('#tutStage [data-t="2"]'); await p.click('#tutStage [data-t="0"]');
          T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 10 ÷ 1 = 10 을 만들면 직접 해 보기가 끝나요`);
        }
      }
      T.ok(!(await p.evaluate(() => /undefined|NaN|\[object/.test(document.getElementById('tutStage').innerText))), `${ID}: 규칙 ${i + 1}단계 글 이상 없음`);
      await p.evaluate(() => { document.getElementById('tutStage').style.left = '-9999px'; });
    }
    await noErr(p, `${ID} 규칙`); await p.close();
  }

  // ───── 5) 복기 글 · 선생님 글 ─────
  {
    const p = await open('seed=2');
    const r = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, out = { n: 0, bad: [], sev: [], withWhy: 0, texts: new Set(), coach: 0 };
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const n = 3 + (seed % 3), st = C.init({ n, seed, cfg: {} });
        let guard = 0; const rr = (() => { let a = seed * 31; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 3000) {
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) {
            if (!C.needs(st).includes(s)) continue;
            const V = C.view(st, s), best = C.ai(V, s, 'hard', rr);
            let mine = best; const k = rr(), L = C.legal(st, s);
            if (k < 0.5 && L.length) mine = L[Math.floor(rr() * L.length)];
            const txt = Ui.actText(mine, V, ['a', 'b', 'c']), rv = Ui.review(V, s, mine, best, {});
            out.n++; out.texts.add(txt);
            if (!txt || /undefined|NaN/.test(txt)) out.bad.push('actText ' + JSON.stringify(mine) + ' → ' + txt);
            if (rv) { if (!(rv.sev >= 0 && rv.sev <= 100) || (rv.why && /undefined|NaN|null/.test(rv.why))) out.bad.push('review ' + JSON.stringify(rv)); out.sev.push(rv.sev); if (rv.why) out.withWhy++; }
            if (out.n % 7 === 0) { const c = Ui.coach(V, s, -1, ['가', '나', '다', '라', '마']); out.coach++; if (!c || ['opp', 'mine', 'rec', 'why'].some(x => typeof c[x] !== 'string' || /undefined|NaN|null/.test(c[x]))) out.bad.push('coach ' + JSON.stringify(c)); }
            const ap = C.apply(st, s, mine); if (!ap.ok) C.apply(st, s, best);
          }
        }
      }
      out.texts = [...out.texts].slice(0, 6);
      return out;
    });
    T.ok(r.bad.length === 0, `${ID}: 복기 · 선생님 글 이상 없음 ${JSON.stringify(r.bad.slice(0, 2))}`);
    T.ok(r.sev.length > 50 && r.withWhy > 50 && r.coach > 10, `${ID}: review 가 ${r.sev.length}번 나옴 (왜 ${r.withWhy}) · 큰 실수(sev>=60) ${r.sev.filter(x => x >= 60).length}번 · 선생님 ${r.coach}번 · 예: ${r.texts.slice(0, 4)}`);
    await p.close();
  }
  if (T.errors.length) T.ok(false, `${ID}: 콘솔/페이지 오류 ${T.errors.slice(0, 2)}`);
}, 'gn-formulaauction_ui');

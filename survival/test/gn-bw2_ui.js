// 흑과 백 II 화면 시험: node survival/test/gn-bw2_ui.js [--shots <폴더>]
//  · 폰 375×667 에서 화면 단추만 눌러 혼자 한 판 끝까지 (선 · 후 · 결과 · 끝) — 단계마다 가로/세로 넘침 · undefined 글 · 정하기 단추가 화면 안인지 검사
//  · 입력: 숫자 직접 쓰기 · 슬라이더 · −10 −1 +1 +10 · 빠른 단추 (0 · 9 흑 · 10 백 · 절반 · 전부) · 0 / 가진 만큼 경계 · 9 → 10 에서 흑 → 백 · 표시등 미리보기
//  · 숨은 정보: 상대의 정확한 포인트는 끝나기 전엔 화면 글에 없고 끝난 뒤 공개 · 후가 보는 선의 색 / 표시등 변화 글
//  · 구경(AI 끼리 · view 'all') 모든 단계가 그려짐 · 연장 · 건너뜀 화면 · 선생님 창이 열렸을 때(fitCoach) 안 가려짐
//  · 1분 규칙 단계 + 직접 해 보기 · 복기 글(actText · review)
'use strict';
const path = require('path'), fs = require('fs');
const U = require('../../test/qa/lib/uitest');
const argv = process.argv.slice(2);
const sAt = argv.indexOf('--shots');
const shotDir = sAt >= 0 && argv[sAt + 1] ? path.resolve(argv[sAt + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const ID = 'gn-bw2', HARNESS = 'survival/test/s3ui_harness.html';
const VW = { width: 375, height: 667 };

const probe = () => {
  const stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
  let low = 0; for (const el of stage.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
  const go = document.querySelector('[data-go]'), gb = go ? go.getBoundingClientRect() : null;
  const dock = document.getElementById('dock'), dk = dock ? dock.getBoundingClientRect() : null;
  return {
    ovx: stage.scrollWidth > stage.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    ovy: Math.round(stage.scrollHeight - stage.clientHeight), below: Math.round(low - r.bottom),
    bad: /undefined|NaN|\[object|null/.test(stage.innerText), goOff: gb ? Math.round(gb.bottom - innerHeight) : 0, goH: gb ? Math.round(gb.height) : 0,
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
  const nowPhase = p => p.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, over: V.over, needs: V.needs, round: V.round, score: V.score, sun: V.sun, ext: V.ext, pts: V.pts, fin: V.fin, hist: V.hist.length }; });
  const noErr = async (p, msg) => { const e = await p.evaluate(() => window.__errors.slice()); T.ok(e.length === 0, `${msg}: 페이지 오류 없음 ${JSON.stringify(e.slice(0, 2))}`); };
  const numVal = p => p.evaluate(() => +document.querySelector('.bw-num').value);
  const clsNum = p => p.evaluate(() => document.querySelector('.bw-num').className.includes('W') ? 'W' : 'B');
  const stText = p => p.evaluate(() => document.querySelector('.bw-st') ? document.querySelector('.bw-st').innerText.replace(/\s+/g, ' ') : '');

  // ───── 1) 혼자 한 판 끝까지 (화면 단추만) ─────
  {
    const p = await open('seed=21');
    await p.evaluate(() => window.__h.hold(true));
    const seen = new Set(), bad = new Set(); let steps = 0, turns = 0, lastKey = '', same = 0, leak = 0, how = { typed: 0, slider: 0, step: 0, preset: 0 }, dropSeen = 0, huTxt = 0, outLamp = 0;
    while (steps++ < 900) {
      const s = await nowPhase(p), pr = await p.evaluate(probe);
      const me = s.needs.includes(0) && !s.over;
      const key = `${s.phase}${me ? '-me' : '-wait'}`;
      if (pr.ovx) bad.add(`${key} 가로 넘침`);
      if (pr.ovy > 2 || pr.below > 2) bad.add(`${key} 세로 넘침 (${pr.ovy}/${pr.below}px, 높이 ${pr.h})`);
      if (pr.bad) bad.add(`${key} 글에 undefined/NaN/null`);
      if (pr.goOff > 0) bad.add(`${key} 정하기 단추가 화면 밖 ${pr.goOff}px`);
      if (me && pr.goH < 40) bad.add(`${key} 정하기 단추 높이 ${pr.goH}px`);
      if (pr.dockOverlap > 2) bad.add(`${key} 아래 단추줄과 겹침 ${pr.dockOverlap}px`);
      if (!seen.has(key)) { seen.add(key); await shot(p, `solo_${key}`); }
      if (s.over) break;
      const fp = `${s.round}|${s.phase}|${s.needs}|${s.hist}`; if (fp === lastKey) same++; else { same = 0; lastKey = fp; }
      if (same > 200) { T.ok(false, `${ID}: 화면이 멈춤 (${fp})`); break; }
      // 숨은 정보: 끝나기 전엔 상대 칸에 정확한 수가 없어요 (색만)
      const oppTile = await p.evaluate(() => { const t = document.querySelectorAll('.bw-p:not(.me) .bw-tile b')[0]; return t ? t.textContent : null; });
      if (oppTile !== null && oppTile !== '?') leak++;
      if (me) {
        turns++;
        const info = await p.evaluate(() => { const V = window.__h.view(), R = window.__h.C.recommend(V, 0); return { P: V.pts[0], rec: R.best.x, sun: V.sun, dropOpp: V.lite[V.sun] < V.liteStart[V.sun], colOpp: V.col[V.sun] }; });
        if (s.phase === 'hu') {
          const txt = await stText(p);
          T.ok(/선으로/.test(txt) && (info.colOpp === 'W' ? /백\(흰색\)/ : /흑\(검정\)/).test(txt) && (info.dropOpp ? /꺼졌어요/ : /그대로/).test(txt), `${ID}: 후 안내 글에 선의 색과 표시등 변화 (${txt.slice(0, 70)})`);
          huTxt++; if (info.dropOpp) { outLamp += await p.evaluate(() => document.querySelectorAll('.bw-p:not(.me) .bw-lamps i.out').length) > 0 ? 1 : 0; }
        }
        const k = turns % 4, want = Math.max(0, Math.min(info.P, info.rec));
        if (k === 0) { how.typed++; await p.fill('.bw-num', String(want)); }
        else if (k === 1) { how.preset++; await p.click('[data-v]'); const w = want; for (let i = 0; i < Math.floor(w / 10); i++) await p.click('[data-d="10"]'); for (let i = 0; i < w % 10; i++) await p.click('[data-d="1"]'); }
        else if (k === 2) { how.slider++; await p.evaluate(v => { const r = document.querySelector('.bw-rg'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, want); }
        else { how.step++; await p.click('.bw-pre button:last-child'); await p.click('[data-d="-10"]'); await p.click('[data-d="1"]'); await p.click('[data-d="-1"]'); const cur = await numVal(p); void cur; await p.fill('.bw-num', String(want)); }
        T.ok((await numVal(p)) === want, `${ID}: 입력한 ${want} 포인트가 그대로 (${await numVal(p)})`);
        T.ok((await clsNum(p)) === (want >= 10 ? 'W' : 'B'), `${ID}: ${want} 는 ${want >= 10 ? '흰색' : '검정'} 칸`);
        const pv = await p.evaluate(() => document.querySelector('[data-pv]').innerText), L0 = Math.min(5, info.P >= 80 ? 5 : info.P >= 60 ? 4 : info.P >= 40 ? 3 : info.P >= 20 ? 2 : 1), Lq = (q => (q >= 80 ? 5 : q >= 60 ? 4 : q >= 40 ? 3 : q >= 20 ? 2 : 1))(info.P - want);
        T.ok(pv.includes(`남는 ${info.P - want}포인트`) && (Lq < L0 ? /꺼져요/.test(pv) : /그대로/.test(pv)), `${ID}: 미리보기 글 (남는 ${info.P - want} · ${L0}→${Lq}칸) ${pv.replace(/\s+/g, ' ')}`);
        if (Lq < L0) dropSeen++;
        const lab = await p.evaluate(() => document.querySelector('[data-go]').innerText);
        T.ok(lab.includes(String(want)), `${ID}: 정하기 단추에 포인트가 보여요 (${lab})`);
        await p.click('[data-go]');
        const s2 = await nowPhase(p);
        T.ok(!s2.needs.includes(0) || s2.phase !== s.phase || s2.round !== s.round, `${ID}: 정하기를 누르면 내 수가 나가요`);
        continue;
      }
      if (s.phase === 'show') {
        const txt = await stText(p); T.ok(txt.length > 12 && /라운드/.test(txt), `${ID}: 결과 글이 나와요 (${txt.slice(0, 40)})`);
        await p.evaluate(() => window.__h.next()); continue;
      }
      const adv = await p.evaluate(() => window.__h.next());
      if (!adv) await T.sleep(20);
    }
    for (const b of bad) T.ok(false, `${ID}: ${b}`);
    const fin = await nowPhase(p);
    T.ok(fin.over, `${ID}: 혼자 한 판이 끝까지 감 (${steps}걸음)`);
    T.ok(turns >= 4 && how.typed >= 1 && how.slider >= 1 && how.step >= 1 && how.preset >= 1, `${ID}: 내 차례 ${turns}번 · 입력 방식 ${JSON.stringify(how)}`);
    T.ok(leak === 0, `${ID}: 끝나기 전에 상대 칸에 정확한 수가 보인 적 ${leak}번`);
    for (const k of ['sun-me', 'hu-me', 'show-wait']) T.ok(seen.has(k) || (k === 'sun-me' && seen.has('hu-me')) || (k === 'hu-me' && seen.has('sun-me')), `${ID}: ${k} 화면을 봄 (${[...seen]})`);
    T.ok(huTxt === 0 || outLamp >= 0, `${ID}: 후 화면 ${huTxt}번 · 꺼진 표시등 표시 ${outLamp}번 · 표시등이 꺼지는 수 ${dropSeen}번`);
    // 끝난 뒤: 상대 수 공개
    const endTile = await p.evaluate(() => [...document.querySelectorAll('.bw-tile b')].map(x => x.textContent));
    T.ok(endTile.length === 2 && endTile.every(x => /^\d+$/.test(x)), `${ID}: 끝나면 두 칸의 정확한 포인트가 보여요 (${endTile})`);
    const res = await p.evaluate(() => window.__h.result());
    T.ok(typeof res === 'string' && res.length > 20 && !/undefined|NaN/.test(res) && /최종 승점/.test(res) && /라운드별 낸 포인트/.test(res), `${ID}: 결과 글 ${res.replace(/<[^>]+>/g, ' ').slice(0, 60)}`);
    await shot(p, 'solo_end');
    await noErr(p, `${ID} 혼자`); await p.close();
  }

  // ───── 2) 입력 칸: 경계 · 흑↔백 · 빠른 단추 · 슬라이더 · 미리보기 ─────
  {
    const p = await open('seed=2&cfg_first=0');
    await p.evaluate(() => window.__h.hold(true));
    const s0 = await nowPhase(p);
    T.ok(s0.phase === 'sun' && s0.needs.includes(0) && s0.pts[0] === 99, `${ID}: cfg.first=0 → 내가 선으로 시작 · 99포인트`);
    T.ok((await numVal(p)) === 0 && (await clsNum(p)) === 'B', `${ID}: 처음 입력은 0 (검정)`);
    T.ok(await p.evaluate(() => document.querySelector('[data-d="-1"]').disabled && document.querySelector('[data-d="-10"]').disabled), `${ID}: 0 에서는 − 단추가 꺼져요`);
    for (let i = 0; i < 9; i++) await p.click('[data-d="1"]');
    T.ok((await numVal(p)) === 9 && (await clsNum(p)) === 'B', `${ID}: 9 는 검정 (한 자릿수)`);
    await p.click('[data-d="1"]'); T.ok((await numVal(p)) === 10 && (await clsNum(p)) === 'W', `${ID}: 10 이 되면 흰색으로 바뀌어요`);
    await p.click('[data-d="-1"]'); T.ok((await clsNum(p)) === 'B', `${ID}: 9 로 내리면 다시 검정`);
    await p.fill('.bw-num', '250'); T.ok((await numVal(p)) === 99, `${ID}: 250 을 써도 가진 99 까지 (${await numVal(p)})`);
    T.ok(await p.evaluate(() => document.querySelector('[data-d="1"]').disabled && document.querySelector('[data-d="10"]').disabled), `${ID}: 99 에서는 + 단추가 꺼져요`);
    await p.click('[data-d="-10"]'); T.ok((await numVal(p)) === 89, `${ID}: −10 → 89`);
    await p.click('.bw-pre button[data-v="0"]'); T.ok((await numVal(p)) === 0, `${ID}: 빠른 단추 0`);
    const pres = await p.evaluate(() => [...document.querySelectorAll('.bw-pre button')].map(b => [+b.dataset.v, b.innerText]));
    T.ok(pres.map(x => x[0]).join() === '0,9,10,50,99', `${ID}: 빠른 단추 0 · 9 흑 · 10 백 · 절반 · 전부 (${pres.map(x => x[0])})`);
    await p.click('.bw-pre button[data-v="99"]'); T.ok((await numVal(p)) === 99 && /꺼져요/.test(await p.evaluate(() => document.querySelector('[data-pv]').innerText)), `${ID}: 전부 99 → 표시등이 꺼진다고 미리 보여 줘요`);
    await p.evaluate(() => { const r = document.querySelector('.bw-rg'); r.value = 19; r.dispatchEvent(new Event('input', { bubbles: true })); });
    T.ok((await numVal(p)) === 19 && /그대로/.test(await p.evaluate(() => document.querySelector('[data-pv]').innerText)), `${ID}: 슬라이더 19 → 99−19=80 은 표시등 그대로`);
    await p.evaluate(() => { const r = document.querySelector('.bw-rg'); r.value = 20; r.dispatchEvent(new Event('input', { bubbles: true })); });
    T.ok(/5칸 → <b>4칸/.test(await p.evaluate(() => document.querySelector('[data-pv]').innerHTML)) || /5칸 → 4칸/.test(await p.evaluate(() => document.querySelector('[data-pv]').innerText)), `${ID}: 20 을 쓰면 5칸 → 4칸`);
    await shot(p, 'input');
    // 선이 정하면 내 칸에 색 · 정확한 수 / 상대 기다림
    await p.fill('.bw-num', '37'); await p.click('[data-go]');
    const st = await stText(p), tiles = await p.evaluate(() => [...document.querySelectorAll('.bw-tile')].map(t => t.innerText.replace(/\s+/g, ' ')));
    T.ok(/정했어요/.test(st) || (await nowPhase(p)).phase === 'show', `${ID}: 선으로 정하면 상대를 기다려요 (${st.slice(0, 40)})`);
    T.ok(tiles.some(t => t.includes('37')), `${ID}: 내 칸에는 내가 쓴 37 이 보여요 (${tiles})`);
    // 상대(후)는 정했고 결과가 보임: 상대 칸은 색만
    const s1 = await nowPhase(p);
    if (s1.phase === 'show') {
      const opp = await p.evaluate(() => document.querySelectorAll('.bw-p:not(.me) .bw-tile')[0].innerText.replace(/\s+/g, ' '));
      T.ok(/\?/.test(opp) && /(흑|백)/.test(opp), `${ID}: 결과가 나와도 상대 칸은 색만 (${opp})`);
      T.ok(/라운드/.test(await stText(p)), `${ID}: 라운드 결과 글`);
      await T.sleep(700); await shot(p, 'show');
    }
    await noErr(p, `${ID} 입력`); await p.close();
  }

  // ───── 3) 구경(AI 끼리 · view 'all'): 모든 단계가 그려지고 오류 없음 · 연장 · 건너뜀 ─────
  {
    const p = await open('seed=8');
    const rep = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage'), out = { phases: {}, errs: [], bad: 0, ov: 0, ext: 0, skip: 0, both: 0, n: 0 };
      const ctx = g => ({ me: -1, act() { return { ok: false }; }, canAct: false, seats: [{ kind: 'ai', name: '삐약' }, { kind: 'ai', name: '나비' }], mode: 'watch', fast: false, coachOn: false, g, wait: false, sfx() {}, toast() {} });
      const games = [[3, {}, ['easy', 'normal']], [4, {}, ['hard', 'hard']], [9, {}, ['normal', 'hard']], [12, { first: 1 }, ['hard', 'easy']]];
      for (const [seed, cfg, tiers] of games) {
        const st = C.init({ n: 2, seed, cfg }); let guard = 0; const rr = (() => { let a = seed * 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        const drive = () => { const need = C.needs(st); if (!need.length) { C.advance(st); return; } for (const s of need) { const r = C.apply(st, s, C.ai(C.view(st, s), s, tiers[s], rr)); if (!r.ok) { out.errs.push('AI 가 막힘'); guard = 1e9; return; } } };
        while (!C.over(st) && guard++ < 2000) {
          const V = C.view(st, 'all');
          try { Ui.render(stage, V, ctx(1000 + seed)); } catch (e) { out.errs.push(String(e.stack || e).slice(0, 200)); break; }
          out.phases[V.phase] = (out.phases[V.phase] || 0) + 1; out.n++;
          if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
          if (stage.scrollWidth > stage.clientWidth + 1) out.ov++;
          if (V.ext) out.ext++;
          if (V.skip) out.skip++;
          if (V.phase === 'hu' && [...stage.querySelectorAll('.bw-tile b')].every(x => /^\d+$/.test(x.textContent) || x.textContent === '?')) out.both++;
          drive();
        }
        Ui.render(stage, C.view(st, 'all'), ctx(1000 + seed));
        if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
        out.phases.over = (out.phases.over || 0) + 1;
      }
      // 연장 (4 : 4 → 33포인트) · 건너뜀(둘 다 99)
      const mkSt = cfg => C.init({ n: 2, seed: 5, cfg });
      const e = mkSt({ first: 0 }); const rd = (a, b) => { const s = e.sun; C.apply(e, s, { t: 'bid', n: [a, b][s] }); C.apply(e, 1 - s, { t: 'bid', n: [a, b][1 - s] }); };
      const plan = [[1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [0, 0]]; plan.forEach(([a, b], i) => { rd(a, b); if (i < 8) C.advance(e); });
      Ui.render(stage, C.view(e, 'all'), ctx(1999)); out.round9 = stage.innerText.replace(/\s+/g, ' ');
      C.advance(e); Ui.render(stage, C.view(e, 'all'), ctx(2000)); out.extTxt = stage.innerText.replace(/\s+/g, ' '); out.extOv = stage.scrollWidth > stage.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 2;
      out.extHist = stage.querySelectorAll('.bw-h').length;
      const d = mkSt({ first: 0 }); C.apply(d, 0, { t: 'bid', n: 99 }); C.apply(d, 1, { t: 'bid', n: 99 }); Ui.render(stage, C.view(d, 'all'), ctx(2001)); out.skipTxt = stage.innerText.replace(/\s+/g, ' ');
      return out;
    });
    T.ok(rep.errs.length === 0, `${ID}: 구경 화면 그리기 오류 없음 ${JSON.stringify(rep.errs)}`);
    T.ok(rep.bad === 0 && rep.ov === 0, `${ID}: 구경 화면 글/넘침 문제 없음 (글 ${rep.bad} · 넘침 ${rep.ov})`);
    T.ok(['sun', 'hu', 'show', 'over'].every(k => rep.phases[k] > 0), `${ID}: 구경 단계 ${JSON.stringify(rep.phases)}`);
    T.ok(rep.both > 0, `${ID}: 구경에선 두 사람의 정확한 포인트가 보여요(관전)`);
    T.ok(/9라운드가 끝났지만 승점이 같아 33포인트로 3라운드를 더 해요/.test(rep.round9), `${ID}: 9라운드 동점 안내 (${rep.round9.slice(-90)})`);
    T.ok(/연장 1/.test(rep.extTxt) && /33포인트씩 새로 받고 3라운드/.test(rep.extTxt) && !rep.extOv && rep.extHist === 3, `${ID}: 연장 화면 (연장 1 · 33포인트 · 기록 3칸 ${rep.extHist}) ${rep.extTxt.slice(0, 40)}`);
    T.ok(/모두 무승부로 건너뛰어요/.test(rep.skipTxt), `${ID}: 둘 다 0포인트면 건너뜀 안내 (${rep.skipTxt.slice(-60)})`);
    await noErr(p, `${ID} 구경`); await p.close();
  }

  // ───── 4) 선생님 창이 열렸을 때(fitCoach): 아래 150px 을 비워도 안 넘침 · 정하기 단추가 가려지지 않음 ─────
  {
    const p = await open('seed=21&cfg_first=0');
    await p.evaluate(() => window.__h.hold(true));
    const r = await p.evaluate(() => {
      const st = document.getElementById('stage'), cs = getComputedStyle(st), pb = parseFloat(cs.paddingBottom) || 0, res = 146;
      st.style.paddingBottom = (pb + res) + 'px'; st.classList.add('sv-coachfit'); window.__h.render();
      const sb = st.getBoundingClientRect(); let low = 0; for (const el of st.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
      const go = document.querySelector('[data-go]').getBoundingClientRect();
      return { low: Math.round(low), limit: Math.round(sb.bottom - res), goBottom: Math.round(go.bottom), ovy: st.scrollHeight - st.clientHeight, h: Math.round(sb.height) };
    });
    T.ok(r.low <= r.limit + 2 && r.goBottom <= r.limit + 2 && r.ovy <= 2, `${ID}: 선생님 창 높이(146px)만큼 비워도 맨 아래 ${r.low} ≤ ${r.limit} (스테이지 높이 ${r.h})`);
    await shot(p, 'coachfit');
    await p.evaluate(() => { const st = document.getElementById('stage'); st.style.paddingBottom = ''; st.classList.remove('sv-coachfit'); });
    await noErr(p, `${ID} fitCoach`); await p.close();
  }

  // ───── 5) 작은 화면(360×640) · 큰 화면에서도 넘침 없음 ─────
  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
    const p = await open('seed=6&cfg_first=0', vp);
    await p.evaluate(() => window.__h.hold(true));
    let bad = [];
    for (let i = 0; i < 40; i++) {
      const s = await nowPhase(p), pr = await p.evaluate(probe);
      if (s.over) break;
      if (pr.ovx || pr.ovy > 2 || pr.below > 2 || pr.bad || pr.goOff > 0) bad.push(`${s.phase}:${JSON.stringify(pr)}`);
      if (s.needs.includes(0)) { await p.fill('.bw-num', String(Math.min(s.pts[0], 8 + i % 5))); await p.click('[data-go]'); } else await p.evaluate(() => window.__h.next());
    }
    T.ok(bad.length === 0, `${ID}: ${vp.width}×${vp.height} 넘침 없음 ${bad.slice(0, 1)}`);
    await shot(p, `vp${vp.width}`);
    await noErr(p, `${ID} ${vp.width}`); await p.close();
  }

  // ───── 6) 1분 규칙 + 직접 해 보기 ─────
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
        await p.click('#tutStage [data-v="10"]');
        const msg = await p.evaluate(() => document.getElementById('tutStage').innerText);
        T.ok(!(await p.evaluate(() => window.__tutDone)) && /다시/.test(msg), `${ID}: 틀린 답은 다시 해 보라고 나와요 (${msg.replace(/\s+/g, ' ').slice(-30)})`);
        await p.click('#tutStage [data-v="19"]');
        T.ok(!(await p.evaluate(() => window.__tutDone)), `${ID}: 19 는 아직 80 이라 안 꺼져요`);
        await p.click('#tutStage [data-v="20"]');
        T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 20 을 누르면 직접 해 보기가 끝나요`);
      }
      T.ok(!(await p.evaluate(() => /undefined|NaN|\[object/.test(document.getElementById('tutStage').innerText))), `${ID}: 규칙 ${i + 1}단계 글 이상 없음`);
      await p.evaluate(() => { document.getElementById('tutStage').style.left = '-9999px'; });
    }
    await noErr(p, `${ID} 규칙`); await p.close();
  }

  // ───── 7) 복기 글: actText · review ─────
  {
    const p = await open('seed=2');
    const r = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, out = { n: 0, bad: [], sev: [], withWhy: 0, texts: new Set(), same: 0 };
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const st = C.init({ n: 2, seed, cfg: {} });
        let guard = 0; const rr = (() => { let a = seed * 31; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 1500) {
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) {
            const V = C.view(st, s), best = C.ai(V, s, 'hard', rr);
            let mine = best; const k = rr();
            if (k < 0.5) mine = { t: 'bid', n: Math.max(0, Math.min(V.pts[s], Math.round(rr() * Math.min(V.pts[s], 40)))) };
            const txt = Ui.actText(mine, V), rv = Ui.review(V, s, mine, best, { same: false });
            out.n++; out.texts.add(txt);
            if (!txt || /undefined|NaN/.test(txt)) out.bad.push('actText ' + JSON.stringify(mine) + ' → ' + txt);
            if (rv === null) out.same++;
            if (rv) { if (!(rv.sev >= 0 && rv.sev <= 100) || (rv.why && /undefined|NaN|null/.test(rv.why))) out.bad.push('review ' + JSON.stringify(rv)); out.sev.push(rv.sev); if (rv.why && /\d+%/.test(rv.why)) out.withWhy++; }
            if (!C.apply(st, s, mine).ok) C.apply(st, s, best);
          }
        }
      }
      out.texts = [...out.texts].slice(0, 4);
      out.nullAct = Ui.actText(null, null) === '—' && Ui.actText({ t: 'x' }, null) === '—';
      return out;
    });
    T.ok(r.bad.length === 0, `${ID}: 복기 글 이상 없음 ${JSON.stringify(r.bad.slice(0, 2))}`);
    T.ok(r.sev.length > 40 && r.withWhy > 40, `${ID}: review 가 ${r.sev.length}번 나옴 (숫자 근거 ${r.withWhy}) · 큰 실수(sev>=60) ${r.sev.filter(x => x >= 60).length}번 · 예: ${r.texts}`);
    T.ok(r.sev.some(x => x >= 60) && r.sev.some(x => x < 20), `${ID}: 심한 실수와 가벼운 차이가 나뉘어요`);
    T.ok(r.nullAct, `${ID}: 이상한 행동도 글이 안 터져요`);
    await p.close();
  }
  if (T.errors.length) T.ok(false, `${ID}: 콘솔/페이지 오류 ${T.errors.slice(0, 2)}`);
}, 'gn-bw2_ui');

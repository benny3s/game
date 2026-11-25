// 베팅! 흑과 백 화면 시험: node survival/test/gn-betbw_ui.js [--shots <폴더>]
//  · 폰 375×667 에서 화면 단추만 눌러 혼자 한 판 끝까지 (배치 · 추가 베팅 · 포기 · 가져올 타일 고르기 · 결과) — 단계마다 가로/세로 넘침 · undefined 글 검사
//  · 배치 화면: 순서 바꾸기(두 번 눌러 바꿈 · ◀ ▶) · 칩 걸기(−5 −1 +1 +5) · 남은 칩 30 이 되어야 확정 · 무작위 추천
//  · 가져올 타일 고르기: 손 칩이 모자랄 때 다른 타일에서 빼는 칸 (미리 채움 · 눌러 바꿈 · 다시 · 돌아가기)
//  · 구경(AI 끼리) 모든 단계가 그려짐 · 1분 규칙 단계 + 직접 해 보기 · 복기 글(actText · review) · 방송 11화 숫자 재현
'use strict';
const path = require('path'), fs = require('fs');
const U = require('../../test/qa/lib/uitest');
const argv = process.argv.slice(2);
const sAt = argv.indexOf('--shots');
const shotDir = sAt >= 0 && argv[sAt + 1] ? path.resolve(argv[sAt + 1]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const ID = 'gn-betbw', HARNESS = 'survival/test/s3ui_harness.html';
const VW = { width: 375, height: 667 };

// 화면 한 장의 넘침 · 글 검사 (브라우저 안에서)
const probe = () => {
  const stage = document.getElementById('stage'), r = stage.getBoundingClientRect();
  let low = 0; for (const el of stage.children) { const b = el.getBoundingClientRect(); if (b.height && b.bottom > low) low = b.bottom; }
  const btns = [...stage.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height);
  const btnLow = btns.reduce((m, b) => Math.max(m, Math.round(b.getBoundingClientRect().bottom)), 0);
  const dock = document.getElementById('dock'), dk = dock ? dock.getBoundingClientRect() : null;
  return {
    ovx: stage.scrollWidth > stage.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    ovy: Math.round(stage.scrollHeight - stage.clientHeight), below: Math.round(low - r.bottom),
    bad: /undefined|NaN|\[object|null/.test(stage.innerText), btnOff: btnLow > innerHeight ? btnLow - innerHeight : 0,
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
  const st = p => p.evaluate(() => { const V = window.__h.view(); return { phase: V.phase, over: V.over, needs: V.needs, pos: V.pos, dec: V.dec, chips: V.chips, hand: V.p.map(x => x.hand), nres: V.res.length, last: V.last }; });
  const noErr = async (p, msg) => { const e = await p.evaluate(() => window.__errors.slice()); T.ok(e.length === 0, `${msg}: 페이지 오류 없음 ${JSON.stringify(e.slice(0, 2))}`); };
  const okProbe = async (p, key, bad) => { const pr = await p.evaluate(probe); if (pr.ovx) bad.add(`${key} 가로 넘침`); if (pr.ovy > 2 || pr.below > 2) bad.add(`${key} 세로 넘침 (${pr.ovy}/${pr.below}px, 높이 ${pr.h})`); if (pr.bad) bad.add(`${key} 글에 undefined/NaN/null`); if (pr.btnOff > 0) bad.add(`${key} 단추가 화면 밖 ${pr.btnOff}px`); return pr; };

  // ───── 1) 배치 화면: 순서 · 칩 · 확정 ─────
  {
    const p = await open('seed=21');
    await p.evaluate(() => window.__h.hold(true));
    let s = await st(p);
    T.ok(s.phase === 'setup' && s.needs.includes(0), `${ID}: 처음은 내 배치`);
    const bad = new Set(); await okProbe(p, '배치(순서)', bad); await shot(p, 'setup_order');
    const nums = () => p.evaluate(() => [...document.querySelectorAll('.bw-cell .bw-t')].map(x => x.textContent));
    const chipsOf = () => p.evaluate(() => [...document.querySelectorAll('.bw-cell .bw-b')].map(x => +x.textContent.replace(/\D/g, '')));
    const rem = () => p.evaluate(() => +document.querySelector('.bw-pill').textContent.replace(/\D/g, ''));
    T.ok((await nums()).join('') === '0123456789' && (await rem()) === 20, `${ID}: 처음은 0~9 순서 · 칩 1개씩 · 남은 칩 20`);
    T.ok(await p.evaluate(() => document.querySelector('[data-a=setup]').disabled), `${ID}: 칩이 남으면 확정 단추가 꺼짐`);
    // 순서: 두 번 눌러 바꾸기
    await p.click('.bw-cell[data-i="0"]'); await p.click('.bw-cell[data-i="9"]');
    T.ok((await nums()).join('') === '9123456780', `${ID}: 첫 칸과 열 번째 칸을 눌러 바꿈 (${(await nums()).join('')})`);
    // ◀ ▶ 로 옮기기
    await p.click('.bw-cell[data-i="1"]'); await p.click('[data-mv="1"]'); await p.click('[data-mv="1"]');
    T.ok((await nums()).join('') === '9231456780', `${ID}: ▶ 로 두 칸 옮김 (${(await nums()).join('')})`);
    // 칩 걸기
    await p.click('[data-m=chip]');
    await okProbe(p, '배치(칩)', bad); await shot(p, 'setup_chip');
    T.ok((await p.evaluate(() => document.querySelector('.bw-cur').textContent)).includes('눌러요'), `${ID}: 칩 모드는 타일을 먼저 고르라고 안내`);
    await p.click('.bw-cell[data-i="0"]');
    await p.click('[data-d="5"]'); await p.click('[data-d="5"]'); await p.click('[data-d="5"]');
    T.ok((await chipsOf())[0] === 16 && (await rem()) === 5, `${ID}: +5 를 세 번 → 16칩 · 남은 칩 5 (${(await chipsOf())[0]}/${await rem()})`);
    await p.click('[data-d="5"]');
    T.ok((await chipsOf())[0] === 21 && (await rem()) === 0, `${ID}: 남은 칩 5 만 더 걸림 → 21칩 · 남은 칩 0 (${(await chipsOf())[0]}/${await rem()})`);
    T.ok(await p.evaluate(() => document.querySelector('[data-d="5"]').disabled), `${ID}: 남은 칩이 0 이면 +5 도 꺼짐`);
    T.ok(await p.evaluate(() => document.querySelector('[data-d="1"]').disabled), `${ID}: 남은 칩이 0 이면 + 가 꺼짐`);
    T.ok(!(await p.evaluate(() => document.querySelector('[data-a=setup]').disabled)), `${ID}: 30칩을 다 걸면 확정 단추가 켜짐`);
    await p.click('[data-d="-5"]'); await p.click('[data-d="-5"]'); await p.click('[data-d="-5"]'); await p.click('[data-d="-5"]');
    T.ok((await chipsOf())[0] === 1 && await p.evaluate(() => document.querySelector('[data-d="-1"]').disabled), `${ID}: 최소 1칩 아래로는 못 내려가요 (${(await chipsOf())[0]})`);
    // 무작위 추천 → 합 30
    await p.click('[data-h=rand]');
    T.ok((await chipsOf()).reduce((a, b) => a + b, 0) === 30 && (await rem()) === 0, `${ID}: 무작위 추천 배치는 칩 30개`);
    T.ok(new Set(await nums()).size === 10, `${ID}: 추천 배치는 타일 10개를 한 번씩`);
    await p.click('[data-h=reset]');
    T.ok((await nums()).join('') === '0123456789' && (await rem()) === 20, `${ID}: 처음으로`);
    // 방송 배치 (오현민) 로 확정
    await p.evaluate(() => { const S = null; });
    // 순서를 9 6 7 8 0 1 2 3 4 5 로: 칩 모드에서 칩 정하기 위해 코어에 직접 쓰지 않고 화면으로 한다
    const want = [9, 6, 7, 8, 0, 1, 2, 3, 4, 5], bets = [12, 4, 4, 4, 1, 1, 1, 1, 1, 1];
    await p.click('[data-m=order]');
    for (let i = 0; i < 10; i++) {                       // 선택 정렬로 want 순서를 만든다
      const cur = await nums(); const k = cur.indexOf(String(want[i]));
      if (k !== i) { await p.click(`.bw-cell[data-i="${i}"]`); await p.click(`.bw-cell[data-i="${k}"]`); }
    }
    T.ok((await nums()).join(',') === want.join(','), `${ID}: 화면 단추로 방송 순서 9 6 7 8 0 1 2 3 4 5 를 만듦 (${(await nums()).join(',')})`);
    await p.click('[data-m=chip]');
    for (let i = 0; i < 10; i++) { const need = bets[i] - 1; if (!need) continue; await p.click(`.bw-cell[data-i="${i}"]`); for (let k = 0; k < Math.floor(need / 5); k++) await p.click('[data-d="5"]'); for (let k = 0; k < need % 5; k++) await p.click('[data-d="1"]'); }
    T.ok((await chipsOf()).join(',') === bets.join(',') && (await rem()) === 0, `${ID}: 방송 칩 12 4 4 4 1 1 1 1 1 1 (${(await chipsOf()).join(',')})`);
    await shot(p, 'setup_ready');
    for (const b of bad) T.ok(false, `${ID}: ${b}`);
    await p.click('[data-a=setup]');
    s = await st(p);
    T.ok(s.phase !== 'setup', `${ID}: 확정하면 가림막이 치워져 승부 시작 (${s.phase})`);
    const mine = await p.evaluate(() => { const V = window.__h.view(); return [V.p[0].num.join(','), V.p[0].init.join(',')]; });
    T.ok(mine[0] === want.join(',') && mine[1] === bets.join(','), `${ID}: 낸 배치가 그대로 들어감 (${mine})`);
    await noErr(p, `${ID} 배치`); await p.close();
  }

  // ───── 2) 혼자 한 판 끝까지 (화면 단추만) ─────
  {
    const p = await open('seed=33');
    await p.evaluate(() => window.__h.hold(true));
    const seen = new Set(), bad = new Set(); let steps = 0, matches = 0, folds = 0, picks = 0, backs = 0, lastKey = '', same = 0, shown = 0;
    while (steps++ < 600) {
      const s = await st(p);
      const key = s.phase === 'setup' ? 'setup' : `${s.phase}${s.needs.includes(0) ? '-me' : '-wait'}${s.dec && s.dec.ex > 0 && s.needs.includes(0) ? '-pull' : ''}`;
      await okProbe(p, key, bad);
      if (!seen.has(key)) { seen.add(key); await shot(p, `solo_${key}`); }
      if (s.over) break;
      const fp = `${s.phase}|${s.pos}|${s.needs}|${s.nres}`; if (fp === lastKey) same++; else { same = 0; lastKey = fp; }
      if (same > 200) { T.ok(false, `${ID}: 화면이 멈춤 (${fp})`); break; }
      if (s.phase === 'setup' && s.needs.includes(0)) {
        await p.click('[data-h=rand]'); await p.click('[data-a=setup]'); continue;
      }
      if (s.phase === 'decide' && s.needs.includes(0)) {
        const D = s.dec;
        const txt = await p.evaluate(() => document.getElementById('stage').innerText);
        T.ok(/추가 베팅/.test(txt) && /포기/.test(txt) && !/undefined|NaN/.test(txt), `${ID}: 고를 때 추가 베팅 · 포기 단추 글`);
        const wantMatch = steps % 3 !== 0 && D.can;
        if (wantMatch) {
          await p.click('[data-a=match]');
          if (D.ex > 0) {
            picks++;
            const sel = await p.evaluate(() => ({ pk: document.querySelectorAll('.bw-col.pk').length, ok: !document.querySelector('[data-a=ok]').disabled, txt: document.querySelector('[data-a=ok]').textContent }));
            T.ok(sel.pk >= 1 && sel.ok, `${ID}: 가져올 타일을 미리 채워 둠 (고를 칸 ${sel.pk} · 확정 ${sel.ok})`);
            await okProbe(p, 'pull-pick', bad); await shot(p, 'pick');
            if (picks === 1) {                                           // 눌러 바꾸기 · 다시 · 돌아가기
              await p.click('[data-a=reset]');
              T.ok(await p.evaluate(() => document.querySelector('[data-a=ok]').disabled), `${ID}: 다시 고르기 = 비움 → 확정이 꺼짐`);
              await p.click('[data-a=back]');
              T.ok(await p.evaluate(() => !!document.querySelector('[data-a=match]')), `${ID}: 돌아가기 → 다시 추가 베팅 · 포기 선택`); backs++;
              await p.click('[data-a=match]');
            }
          }
          if (D.ex > 0) await p.click('[data-a=ok]');
          matches++;
        } else { await p.click('[data-a=fold]'); folds++; }
        await T.sleep(10); continue;
      }
      if (s.phase === 'show') {
        shown++;
        const txt = await p.evaluate(() => (document.querySelector('.bw-res') || {}).innerText || '');
        T.ok(txt.length > 10 && !/undefined|NaN/.test(txt), `${ID}: 결과 글이 나와요 (${txt.replace(/\s+/g, ' ').slice(0, 40)})`);
        await p.evaluate(() => window.__h.next()); continue;
      }
      const adv = await p.evaluate(() => window.__h.next());
      if (!adv) await T.sleep(25);
    }
    for (const b of bad) T.ok(false, `${ID}: ${b}`);
    const fin = await st(p);
    T.ok(fin.over, `${ID}: 혼자 한 판이 끝까지 감 (${steps}걸음)`);
    T.ok(matches >= 1 && folds >= 1, `${ID}: 추가 베팅 ${matches}번 · 포기 ${folds}번 (가져올 타일 고르기 ${picks}번)`);
    for (const k of ['setup', 'decide-me', 'show-wait']) T.ok(seen.has(k) || [...seen].some(x => x.startsWith(k.split('-')[0])), `${ID}: ${k} 화면을 봄 (${[...seen]})`);
    const res = await p.evaluate(() => window.__h.result());
    T.ok(typeof res === 'string' && res.length > 12 && !/undefined|NaN/.test(res), `${ID}: 결과 글 ${res.replace(/<[^>]+>/g, '').slice(0, 50)}`);
    await shot(p, 'solo_end');
    await noErr(p, `${ID} 혼자`); await p.close();
  }

  // ───── 3) 가져올 타일 고르기 (손 칩 0 · 첫 타일에서 크게 모자라는 판) ─────
  {
    let ok = false, p = null;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
      p = await open(`seed=${seed}`);
      await p.evaluate(() => window.__h.hold(true));
      await p.evaluate(() => window.__h.act({ t: 'setup', order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], bets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 21] }));
      const s = await st(p);
      if (s.phase === 'decide' && s.needs.includes(0) && s.dec && s.dec.ex >= 3) { ok = true; break; }
      await p.close();
    }
    T.ok(ok, `${ID}: 모자라는 칩이 3 이상인 첫 타일을 만듦`);
    if (ok) {
      const s = await st(p), D = s.dec;
      const bad = new Set(); await okProbe(p, '고르기 전', bad); await shot(p, 'decide_pull');
      const txt0 = await p.evaluate(() => document.getElementById('stage').innerText.replace(/\s+/g, ' '));
      T.ok(txt0.includes(`+${D.need}`) && txt0.includes(`다른 타일에서 ${D.ex}칩`), `${ID}: 맞추려면 ${D.need}칩 · 다른 타일에서 ${D.ex}칩 안내 (${txt0.slice(0, 120)})`);
      await p.click('[data-a=match]'); await shot(p, 'pick');
      const pk0 = await p.evaluate(() => [...document.querySelectorAll('.bw-col')].map(c => c.className.includes('pk')));
      T.ok(pk0.slice(0, 1).every(x => !x) && pk0.slice(1).some(x => x), `${ID}: 지나간 · 지금 타일은 못 고르고 뒤쪽만 점선`);
      const tk = () => p.evaluate(() => [...document.querySelectorAll('.bw-col')].map(c => { const m = c.querySelector('.bw-n:last-of-type small'); return m ? +m.textContent.replace(/\D/g, '') : 0; }));
      const okOff = () => p.evaluate(() => document.querySelector('[data-a=ok]').disabled);
      T.ok(!(await okOff()) && (await tk()).reduce((a, b) => a + b, 0) === D.ex, `${ID}: 미리 채운 합 = ${D.ex}칩`);
      // 한 칸을 눌러 줄이면 확정이 꺼지고, 다른 칸을 눌러 채우면 켜짐
      const pre = await tk(); const j0 = pre.findIndex(x => x > 0);
      await p.click(`.bw-col:nth-child(${j0 + 1})`);
      T.ok(await okOff() && (await tk())[j0] === pre[j0] - 1, `${ID}: 눌러서 칩을 하나 되돌리면 확정이 꺼짐`);
      await p.click(`.bw-col:nth-child(${j0 + 1})`);
      T.ok(!(await okOff()) && (await tk())[j0] === pre[j0], `${ID}: 다시 누르면 다시 채워짐`);
      await okProbe(p, '고르기 중', bad);
      await p.click('[data-a=ok]');
      const s2 = await st(p);
      T.ok(s2.phase === 'show' && s2.last && s2.last.act === 'match' && s2.last.pull.reduce((a, b) => a + b[1], 0) === D.ex, `${ID}: 확정하면 맞추고 오픈 (가져온 칩 ${s2.last && s2.last.pull.reduce((a, b) => a + b[1], 0)})`);
      await shot(p, 'show_pull');
      await okProbe(p, '정산', bad);
      for (const b of bad) T.ok(false, `${ID}: ${b}`);
      await noErr(p, `${ID} 고르기`); await p.close();
    }
  }

  // ───── 4) 구경(AI 끼리): 모든 단계가 그려지고 오류 없음 ─────
  {
    const p = await open('seed=8');
    const rep = await p.evaluate(() => {
      const h = window.__h, C = h.C, Ui = h.U, stage = document.getElementById('stage'), out = { phases: {}, errs: [], bad: 0, ov: 0, texts: 0, pull: 0 };
      for (const seed of [3, 4, 9]) {
        const st = C.init({ n: 2, seed, cfg: {} });
        let guard = 0; const rr = (() => { let a = seed * 77; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        const ctx = { me: -1, act() { return { ok: false }; }, canAct: false, seats: [{ kind: 'ai', name: '삐약' }, { kind: 'ai', name: '나비' }], mode: 'watch', fast: false, coachOn: false, g: 1000 + seed, wait: false, sfx() {}, toast() {} };
        while (!C.over(st) && guard++ < 2000) {
          const V = C.view(st, 'all');
          try { Ui.render(stage, V, ctx); } catch (e) { out.errs.push(String(e.stack || e).slice(0, 200)); break; }
          out.phases[V.phase] = (out.phases[V.phase] || 0) + 1; out.texts++;
          if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
          if (stage.scrollWidth > stage.clientWidth + 1) out.ov++;
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) { const a = C.ai(C.view(st, s), s, ['easy', 'normal', 'hard'][(s + seed) % 3], rr); if (a.t === 'match' && a.take.length) out.pull++; const r = C.apply(st, s, a); if (!r.ok) { out.errs.push('AI 가 막힘'); return out; } }
        }
        Ui.render(stage, C.view(st, 'all'), ctx);
        if (/undefined|NaN|\[object|null/.test(stage.innerText)) out.bad++;
        out.phases.over = (out.phases.over || 0) + 1;
      }
      return out;
    });
    T.ok(rep.errs.length === 0, `${ID}: 구경 화면 그리기 오류 없음 ${JSON.stringify(rep.errs)}`);
    T.ok(rep.bad === 0 && rep.ov === 0, `${ID}: 구경 화면 글/넘침 문제 없음 (글 ${rep.bad} · 넘침 ${rep.ov})`);
    T.ok(['setup', 'decide', 'show', 'over'].every(k => rep.phases[k] > 0), `${ID}: 구경 단계 ${JSON.stringify(rep.phases)} (가져온 칩 있는 판 ${rep.pull}번)`);
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
      if (i === 0 || i === 1 || t.interactive) await shot(p, `tut${i + 1}`);
      const w = await p.evaluate(() => { const b = document.getElementById('tutStage'); return b.scrollWidth - b.clientWidth; });
      T.ok(w <= 1, `${ID}: 규칙 ${i + 1}단계 가로 넘침 없음 (${w})`);
      if (t.interactive) {
        await p.click('#tutStage [data-t="m"]');
        const msg = await p.evaluate(() => document.getElementById('tutStage').innerText);
        T.ok(!(await p.evaluate(() => window.__tutDone)) && /40%/.test(msg), `${ID}: 추가 베팅을 누르면 다시 골라 보라고 해요 (${msg.replace(/\s+/g, ' ').slice(-40)})`);
        await p.click('#tutStage [data-t="f"]');
        T.ok(await p.evaluate(() => window.__tutDone), `${ID}: 포기를 누르면 직접 해 보기가 끝나요`);
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
      const h = window.__h, C = h.C, Ui = h.U, out = { n: 0, bad: [], sev: [], withWhy: 0, texts: new Set(), setups: 0 };
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const st = C.init({ n: 2, seed, cfg: {} });
        let guard = 0; const rr = (() => { let a = seed * 31; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
        while (!C.over(st) && guard++ < 1500) {
          const need = C.needs(st);
          if (!need.length) { C.advance(st); continue; }
          for (const s of need) {
            const V = C.view(st, s), best = C.ai(V, s, 'hard', rr);
            let mine = best; const k = rr();
            if (V.phase === 'setup') mine = C.ai(V, s, 'easy', rr);
            else if (V.dec && k < 0.5) mine = best.t === 'fold' ? (V.dec.can ? { t: 'match', take: C.legal(st, s).find(a => a.t === 'match').take } : best) : { t: 'fold' };
            const txt = Ui.actText(mine, V), rv = Ui.review(V, s, mine, best, {});
            out.n++; out.texts.add(txt);
            if (V.phase === 'setup') out.setups++;
            if (!txt || /undefined|NaN/.test(txt)) out.bad.push('actText ' + JSON.stringify(mine) + ' → ' + txt);
            if (rv) { if (!(rv.sev >= 0 && rv.sev <= 100) || (rv.why && /undefined|NaN|null/.test(rv.why))) out.bad.push('review ' + JSON.stringify(rv)); out.sev.push(rv.sev); if (rv.why) out.withWhy++; }
            const ap = C.apply(st, s, mine); if (!ap.ok) { C.apply(st, s, best); }
          }
        }
      }
      out.texts = [...out.texts].filter(x => !/^배치/.test(x)).slice(0, 6);
      return out;
    });
    T.ok(r.bad.length === 0, `${ID}: 복기 글 이상 없음 ${JSON.stringify(r.bad.slice(0, 2))}`);
    T.ok(r.sev.length > 20 && r.withWhy > 20, `${ID}: review 가 ${r.sev.length}번 나옴 (왜 ${r.withWhy}) · 큰 실수(sev>=60) ${r.sev.filter(x => x >= 60).length}번 · 예: ${r.texts.slice(0, 4)}`);
    await p.close();
  }
  if (T.errors.length) T.ok(false, `${ID}: 콘솔/페이지 오류 ${T.errors.slice(0, 2)}`);
}, 'gn-betbw_ui');

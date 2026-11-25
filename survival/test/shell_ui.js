// 서바이벌 껍데기(shell) 화면 시험 — 진짜 survival/index.html 을 headless 크롬(375×667, 소리 끔)으로 열어서
//  1) 목록 읽기: list/*.js 가 몇 개 없어도(404) 첫 화면이 그려지고, 방송 칸 3 · 시즌 칸 · 카드가 목록 값대로 나오는지
//  2) 목록 값만 있는 가짜 목록(link 카드 · 없는 게임 · 모르는 방송 칸)을 끼워 넣어도 깨지지 않는지
//  3) 카드를 눌러 고르기 → games/<id>/core.js · ui.js 를 그때 불러오는지 (처음엔 안 불러옴), 주소 ?g=<id> 로 바로 그 게임
//  4) 고른 게임을 '혼자(AI)' 로 끝까지 (autoAct) — 결과 창 · 콘솔 오류 0 · 가로 넘침 0
// 사용: node survival/test/shell_ui.js [--only id,id] [--prog blood] [--shots <폴더>] [--slow]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { serve } = require(path.join(ROOT, 'test', 'qa', 'lib', 'server.js'));
const PW = process.env.APPDATA + '/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const CHROME = ['1247', '1243'].map(v => `${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-${v}/chrome-headless-shell-win64/chrome-headless-shell.exe`);
const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const only = val('only', '') ? val('only', '').split(',') : null, progOnly = val('prog', '');
const shotDir = val('shots', '');

(async () => {
  const pw = require(PW), exe = CHROME.find(f => fs.existsSync(f));
  const srv = await serve(ROOT, 8860);                       // 빈 포트를 8860 부터 찾음 (다른 시험과 겹치지 않음)
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--mute-audio'] });
  let pass = 0, fail = 0; const notes = [];
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL:', m); } };
  const newPage = async (route) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|net::ERR|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 240)); });
    if (route) await route(page);
    return { page, ctx, errs };
  };
  const overflow = page => page.evaluate(() => Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, document.body.scrollWidth - document.documentElement.clientWidth));
  const shot = async (page, name) => { if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: path.join(shotDir, name + '.png') }); } };
  const url = q => `${srv.base}survival/index.html${q || ''}`;
  try {
    // ── 1) 진짜 목록 ──
    {
      const { page, ctx, errs } = await newPage();
      await page.goto(url());
      await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
      await page.evaluate(() => window.__survival.ready);
      const real = await page.evaluate(() => ({ list: window.__survival.LIST.map(e => e.id + '|' + e.prog + '|' + e.season), progs: [...document.querySelectorAll('#progTabs .prog')].map(b => b.textContent.trim()), seasons: [...document.querySelectorAll('#seasonBar .ssn')].map(b => b.dataset.s), cards: [...document.querySelectorAll('#gameCards .g-card')].map(b => b.dataset.g), loaded: Object.keys(window.SVUI || {}), panel: !document.getElementById('panel').hidden }));
      ok(real.progs.length === 3 && /데블스/.test(real.progs[0]) && /지니어스/.test(real.progs[1]) && /피의/.test(real.progs[2]), '방송 칸 셋 (데블스 → 지니어스 → 피의 게임): ' + real.progs);
      const blood = real.list.filter(s => s.split('|')[1] === 'blood');
      ok(blood.length >= 11, '피의 게임 목록 11종 이상: ' + blood.length);
      ok(real.progs.every((t, i) => i === 2 ? /\d+종/.test(t) : true), '피의 게임 칸에 종 수');
      ok(real.panel, '처음 보일 게임의 설명 칸이 열려야 함');
      ok(real.loaded.length <= 1, '처음에는 고른 게임 하나만 불러와야 함(ui 를 미리 다 안 불러옴): ' + real.loaded);
      // 피의 게임 칸 → 시즌 칸 순서 = 목록 순서 (S1 S2 S3 SX)
      await page.click('#progTabs .prog[data-p="blood"]');
      const ss = await page.evaluate(() => [...document.querySelectorAll('#seasonBar .ssn')].map(b => b.dataset.s));
      ok(ss.join() === 'S1,S2,S3,SX', '시즌 칸 순서: ' + ss);
      for (const s of ss) {
        await page.click(`#seasonBar .ssn[data-s="${s}"]`);
        const n = await page.evaluate(() => document.querySelectorAll('#gameCards .g-card').length);
        const want = blood.filter(x => x.split('|')[2] === s).length;
        ok(n === want, `시즌 ${s} 카드 수 ${n} / ${want}`);
        ok((await overflow(page)) <= 0, `시즌 ${s} 가로 넘침`);
      }
      await shot(page, 'home-blood');
      ok(errs.length === 0, '첫 화면 콘솔 오류: ' + errs.join(' // '));
      await ctx.close();
    }
    // ── 2) 가짜 목록: link 카드 · 없는 게임 · 모르는 방송 칸 · 깨진 항목 · 목록 파일 하나가 깨짐 ──
    {
      const fake = `(window.SVList = window.SVList || []).push(
        { id: "gone", prog: "genius", season: "S9", seasonName: "없는 게임", title: "없는 게임", emoji: "👻", v: 1, short: "파일이 없음" },
        { id: "lnk", prog: "genius", season: "S9", title: "지니어스 사이트", emoji: "🧠", v: 1, short: "다른 페이지", link: "../genius/" },
        { id: "bad id!", prog: "genius", season: "S9", title: "이름 이상", emoji: "x", v: 1 },
        { id: "alien", prog: "nobody", season: "S1", title: "모르는 칸", emoji: "👽", v: 1 },
        null, { id: "notitle", prog: "devil", season: "S1" });`;
      const { page, ctx, errs } = await newPage(async p => {
        await p.route('**/list/genius.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fake }));
        await p.route('**/list/devil-s3.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'throw new Error("깨진 목록 파일")' }));
        await p.route('**/list/devil.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* 데블스 S1·S2 목록을 일부러 비움 — 빈 칸 시험 */' }));
      });
      await page.goto(url());
      await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
      await page.evaluate(() => window.__survival.ready);
      const ids = await page.evaluate(() => window.__survival.LIST.map(e => e.id));
      ok(ids.includes('gone') && ids.includes('lnk') && !ids.includes('bad id!') && !ids.includes('alien') && !ids.includes('notitle'), '깨진 항목은 빼고 나머지는 받음: ' + ids.join());
      ok(ids.some(i => i === 'bloodrps'), '목록 파일 하나가 깨져도 다른 파일은 그대로');
      await page.click('#progTabs .prog[data-p="genius"]');
      const gc = await page.evaluate(() => [...document.querySelectorAll('#gameCards .g-card')].map(b => b.dataset.g + (b.classList.contains('link') ? '(link)' : '')));
      ok(gc.join() === 'gone,lnk(link)', '지니어스 칸 카드: ' + gc);
      // 없는 게임을 고르면 "불러오지 못했어요" 와 다시 해 보기
      await page.click('#gameCards .g-card[data-g="gone"]');
      await page.waitForFunction(() => /불러오지 못했어요/.test(document.getElementById('gameLoad').textContent), null, { timeout: 12000 });
      ok(await page.evaluate(() => document.getElementById('panel').hidden), '못 불러온 게임은 설명 칸을 숨김');
      ok(await page.evaluate(() => !!document.getElementById('loadRetry')), '다시 해 보기 단추');
      // 다른 칸으로 돌아가면 정상
      await page.click('#progTabs .prog[data-p="blood"]');
      await page.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 12000 });
      ok(true, '못 불러온 뒤에도 다른 칸은 그대로');
      // 빈 칸 (데블스 칸 목록을 위에서 비워 둠 — 진짜 devil.js 에는 게임이 있어도) → 준비 중
      await page.click('#progTabs .prog[data-p="devil"]');
      const emp = await page.evaluate(() => ({ txt: document.getElementById('gameCards').textContent, panel: document.getElementById('panel').hidden }));
      ok(/준비 중/.test(emp.txt) && emp.panel, '게임 없는 칸은 준비 중 · 설명 칸 숨김: ' + emp.txt);
      ok((await overflow(page)) <= 0, '가짜 목록 가로 넘침');
      await shot(page, 'home-fake');
      const real = errs.filter(e => !/깨진 목록 파일/.test(e));     // 일부러 깨뜨린 목록 파일의 오류만 빼고
      ok(errs.some(e => /깨진 목록 파일/.test(e)) && real.length === 0, '가짜 목록 콘솔 오류: ' + real.join(' // '));
      await ctx.close();
    }
    // ── 3) 주소 ?g= ──
    {
      const { page, ctx, errs } = await newPage();
      await page.goto(url('?g=mazesum'));
      await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
      await page.evaluate(() => window.__survival.ready);
      const r = await page.evaluate(() => ({ g: window.__survival.LIST && document.querySelector('#gameCards .g-card[aria-pressed="true"]') && document.querySelector('#gameCards .g-card[aria-pressed="true"]').dataset.g, prog: document.querySelector('#progTabs .prog.active').dataset.p, ssn: document.querySelector('#seasonBar .ssn.active').dataset.s, howto: document.getElementById('howto').textContent }));
      ok(r.g === 'mazesum' && r.prog === 'blood' && r.ssn === 'S3', '?g=mazesum 으로 바로 그 게임: ' + JSON.stringify([r.g, r.prog, r.ssn]));
      ok(/방송: 피의 게임/.test(r.howto) && (r.howto.match(/방송과 다른 점/g) || []).length === 1 && (r.howto.match(/방송:/g) || []).length === 1, '방송 출처 · 다른 점이 한 번씩만: ' + (r.howto.match(/방송[^\n]{0,24}/g) || []).join(' / '));
      const odd = await page.evaluate(() => { const g = new URLSearchParams(location.search).get('g'); return g; });
      ok(odd === 'mazesum', 'url');
      ok(errs.length === 0, '?g= 콘솔 오류: ' + errs.join(' // '));
      await ctx.close();
      const x = await newPage();
      await x.page.goto(url('?g=../../etc'));                    // 목록에 없는 이름은 무시 → 첫 게임
      await x.page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
      await x.page.evaluate(() => window.__survival.ready);
      ok(await x.page.evaluate(() => !!document.querySelector('#gameCards .g-card')), '이상한 ?g= 는 무시');
      await x.ctx.close();
    }
    // ── 4) 한 게임씩 골라서 혼자(AI) 끝까지 ──
    const ids = await (async () => { const { page, ctx } = await newPage(); await page.goto(url()); await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 }); await page.evaluate(() => window.__survival.ready); const L = await page.evaluate(() => window.__survival.LIST.filter(e => !e.link).map(e => e.id + '|' + e.prog)); await ctx.close(); return L; })();
    for (const it of ids) {
      const [id, prog] = it.split('|');
      if ((only && !only.includes(id)) || (progOnly && prog !== progOnly) || ['gone'].includes(id)) continue;
      const { page, ctx, errs } = await newPage();
      const t0 = Date.now();
      try {
        await page.goto(url());
        await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
        await page.evaluate(() => window.__survival.ready);
        // 카드를 눌러서 고름 (방송 칸 → 시즌 칸 → 카드)
        await page.click(`#progTabs .prog[data-p="${prog}"]`);
        const ssn = await page.evaluate(id => { const e = window.__survival.LIST.find(x => x.id === id); return e.season; }, id);
        await page.click(`#seasonBar .ssn[data-s="${ssn}"]`).catch(() => {});
        await page.click(`#gameCards .g-card[data-g="${id}"]`);
        await page.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 12000 });
        const loaded = await page.evaluate(() => Object.keys(window.SVUI || {}));
        ok(loaded.includes(id), `${id} 고른 뒤 불러옴`);
        ok((await overflow(page)) <= 0, `${id} 첫 화면 가로 넘침`);
        const hw = await page.evaluate(() => document.getElementById('howto').innerText);
        ok(/방송/.test(hw) && /다른 점/.test(hw), `${id} 방송 출처 · 다른 점 표시`);
        ok(!/undefined|NaN|\[object/.test(hw), `${id} howto 글`);
        // 혼자(AI) 시작
        await page.click('#tabSolo').catch(() => {});
        await page.evaluate(() => window.__survival.fast(1));
        await page.click('#startBtn');
        await page.waitForFunction(() => !!window.__survival.ses, null, { timeout: 8000 });
        // 선생님 창을 연 채로도 판이 가려지지 않아야 함 (ui.fitCoach 게임: 스테이지 안 맨 아래 요소 ≤ 창 위쪽)
        if (await page.evaluate(() => { const u = window.SVUI[window.__survival.ses.id]; return !!(u && u.fitCoach); })) {
          await page.click('#coachBtn'); await page.waitForTimeout(700);
          const r = await page.evaluate(() => {
            const cp = document.querySelector('.cpn'), st = document.getElementById('stage');
            let bottom = 0; for (const el of st.children) { const b = el.getBoundingClientRect(); if (b.height > 0 && getComputedStyle(el).display !== 'none') bottom = Math.max(bottom, b.bottom); }
            const bd = st.querySelector('[class$="-board"]'), bb = bd && bd.getBoundingClientRect();
            return { cpTop: cp && !cp.hidden ? cp.getBoundingClientRect().top : -1, bottom, board: bb ? [Math.round(bb.width), Math.round(bb.height)] : null, fit: st.classList.contains('sv-coachfit') };
          });
          ok(r.cpTop > 0 && r.fit && r.bottom <= r.cpTop + 1, `${id} 선생님 창을 열어도 판이 안 가려짐 (맨 아래 ${Math.round(r.bottom)} ≤ 창 위 ${Math.round(r.cpTop)}, 판 ${r.board})`);
          await shot(page, `coach-${id}`);
          await page.click('#coachBtn'); await page.waitForTimeout(300);
        }
        let over = false, acts = 0, stall = 0, last = '';
        for (let i = 0; i < 3000 && !over; i++) {
          const st = await page.evaluate(() => { const s = window.__survival; const a = s.autoAct(); const p = s.probe(); return { a, over: p.over, fp: p.fp }; });
          if (st.a) { acts++; stall = 0; } else { stall++; }
          if (st.over) { over = true; break; }
          if (st.fp === last && !st.a) { await page.waitForTimeout(40); } else { last = st.fp; await page.waitForTimeout(8); }
          if (stall > 1500) break;
        }
        ok(over, `${id} 혼자(AI) 한 판 끝까지 (내 수 ${acts}번)`);
        if (over) {
          const res = await page.evaluate(() => ({ html: document.getElementById('resBox').innerText, rows: document.querySelectorAll('#resBox .sv-rank li').length }));
          ok(res.rows >= 2 && !/undefined|NaN|\[object/.test(res.html), `${id} 결과 창 ${res.rows}줄`);
          ok((await overflow(page)) <= 0, `${id} 결과 가로 넘침`);
          await shot(page, `end-${id}`);
          // 🎞️ 복기: 결과 창 [복기] → 열림 · 내 수 비교가 끝까지 도는지 · 끝까지 넘김 · ⏮ · 닫으면 결과 창으로
          const rv = await page.$('#resBox [data-r="review"]');
          ok(!!rv, `${id} 결과 창에 🎞️ 복기 단추`);
          if (rv) {
            await rv.click();
            await page.waitForFunction(() => !document.getElementById('rev').hidden, null, { timeout: 8000 }).catch(() => {});
            const o = await page.evaluate(() => ({ open: !document.getElementById('rev').hidden, stage: document.getElementById('revStage').children.length, N: +document.getElementById('revRange').max, seats: document.querySelectorAll('#revSeats .sv-seat').length, res: document.getElementById('resOv').hidden }));
            ok(o.open && o.stage > 0 && o.N > 0 && o.seats >= 2 && o.res, `${id} 복기 열림 (판 ${o.stage}칸 · ${o.N}수 · 자리 ${o.seats} · 결과 창 숨김 ${o.res})`);
            if (o.open) {
              await page.waitForFunction(() => { const s = window.SVReview.stat; return !s || s.done; }, null, { timeout: 25000 }).catch(() => {});
              const stt = await page.evaluate(() => window.SVReview.stat);
              ok(stt && stt.done && !stt.bad, `${id} 복기 비교가 끝까지 돎 (내 수 ${stt && stt.mine} · 비교 ${stt && stt.cmps} · 같음 ${stt && stt.same} · 아쉬움 ${stt && stt.bads})${stt && stt.bad ? ' ' + stt.bad : ''}`);
              if (stt && stt.mine > 0) ok(stt.cmps >= Math.ceil(stt.mine * 0.6), `${id} 내 수 ${stt.mine}개 중 비교된 것 ${stt.cmps}`);
              const lbl = async () => page.evaluate(() => document.getElementById('revLbl').textContent);
              await page.click('#revBar [data-rv="last"]');
              ok(/끝/.test(await lbl()), `${id} ⏭ 끝까지 넘김`);
              await page.click('#revBar [data-rv="prev"]'); await page.click('#revBar [data-rv="first"]');
              ok(await page.evaluate(() => document.getElementById('revSub').textContent.startsWith('0 /')), `${id} ⏮ 처음으로`);
              await page.click('#revBar [data-rv="next"]'); await page.click('#revBar [data-rv="mine"]');
              ok(await page.evaluate(() => { const t = document.querySelector('.cpn-body'); return !!t && !/undefined|NaN|\[object/.test(t.innerText); }), `${id} 복기 선생님 글`);
              ok((await overflow(page)) <= 0, `${id} 복기 가로 넘침`);
              await shot(page, `review-${id}`);
              await page.click('#revBack');
              ok(await page.evaluate(() => document.getElementById('rev').hidden && !document.getElementById('resOv').hidden), `${id} 복기 닫으면 결과 창으로`);
            }
          }
        } else { await shot(page, `stuck-${id}`); }
        // 결과 창의 [종목 고르기] → 첫 화면
        await page.click('#resBox [data-r="home"]', { timeout: 4000 }).catch(() => {});
        await page.waitForFunction(() => !document.querySelector('.wrap').hidden, null, { timeout: 5000 }).catch(() => {});
        ok(await page.evaluate(() => !document.querySelector('.wrap').hidden), `${id} 나가면 첫 화면`);
        ok(errs.length === 0, `${id} 콘솔 오류: ` + errs.slice(0, 3).join(' // '));
        notes.push(`${id} ${((Date.now() - t0) / 1000).toFixed(1)}초 · 내 수 ${acts}`);
      } catch (e) { fail++; console.error(`FAIL: ${id} 예외`, e.message.split('\n')[0]); }
      await ctx.close();
    }
    // ── 5) 📒 → 연습 판 (?drill=): 판 하나를 끝까지 둔 기록에서 내 첫 수 앞까지 되감은 장면을 📒 에 넣고, 주소로 열어 같은 수를 두면 ✅ 해냄 · 규칙이 안 맞는 장면은 조용히 첫 화면 ──
    {
      const id = (only && only[0]) || 'hilo';
      const { page, ctx, errs } = await newPage();
      try {
        await page.goto(url(`?g=${id}`));
        await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
        await page.evaluate(() => window.__survival.ready);
        await page.evaluate(() => window.__survival.fast(1));
        await page.click('#tabSolo').catch(() => {}); await page.click('#startBtn');
        for (let i = 0; i < 3000; i++) {
          const st = await page.evaluate(() => { const s = window.__survival; s.autoAct(); return s.probe().over; });
          if (st) break; await page.waitForTimeout(8);
        }
        const mk = await page.evaluate(() => {
          const rec = JSON.parse(JSON.stringify(window.SVReview.list()[0] || null));
          if (!rec) return null;
          const j = rec.acts.findIndex(e => e.h && !e.adv); if (j < 0) return null;
          const pre = JSON.parse(JSON.stringify(rec)); pre.acts = pre.acts.slice(0, j); pre.fp = ''; pre.ranks = null; pre.drill = 1;
          const e = rec.acts[j], bad = JSON.parse(JSON.stringify(pre)); bad.acts.push({ s: e.s, a: { t: '__nope__' }, h: 1 }); bad.at = Date.now() + 1;
          const mk1 = (p, alts, k) => window.Mistakes.add({ game: 'survival', title: 't', scene: 's', my: 'm', best: 'b', why: 'w', sev: 80, lossText: '손해 80', drill: { rec: p, k, s: e.s, bestA: e.a, alts, bestText: 'b' } });
          return { good: mk1(pre, [window.SVReview.canon(e.a)], j), badId: mk1(bad, [], j + 1), j, a: e.a, s: e.s };
        });
        ok(!!mk && !!mk.good, `연습 판: ${id} 기록에서 📒 장면을 만듦`);
        if (mk) {
          await page.goto(url(`?drill=${mk.good}`));
          await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
          await page.evaluate(() => window.__survival.ready);
          await page.waitForFunction(() => !!window.__survival.ses && !document.getElementById('play').hidden, null, { timeout: 8000 }).catch(() => {});
          const d = await page.evaluate(() => ({ sub: document.getElementById('playSub').textContent, can: window.__survival.canAct(), url: location.search, ses: !!window.__survival.ses }));
          ok(d.ses && /연습 판/.test(d.sub) && !/drill/.test(d.url), `연습 판이 열림 (${d.sub}) · 주소의 drill 지움(${d.url || '없음'})`);
          await page.waitForFunction(() => window.__survival.canAct(), null, { timeout: 6000 }).catch(() => {});
          const r = await page.evaluate(a => { const r = window.__survival.act(a); const m = window.Mistakes.list('survival').find(x => x.solved); return { ok: !!r.ok, solved: !!m }; }, mk.a);
          ok(r.ok, '연습 판: 같은 수를 둘 수 있음'); ok(r.solved, '연습 판: 고급 AI 가 고른 수와 같으면 📒 에서 ✅ 해냄');
          await shot(page, 'drill');
          // 규칙이 안 맞는 장면 → 첫 화면 + 오류 없음
          await page.goto(url(`?drill=${mk.badId}`));
          await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
          await page.evaluate(() => window.__survival.ready); await page.waitForTimeout(400);
          ok(await page.evaluate(() => !document.querySelector('.wrap').hidden && !window.__survival.ses), '연습 판: 안 맞는 장면은 조용히 첫 화면으로');
          await page.goto(url(`?drill=nonexistent`));
          await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
          await page.evaluate(() => window.__survival.ready);
          ok(await page.evaluate(() => !document.querySelector('.wrap').hidden), '연습 판: 없는 장면 주소도 첫 화면');
        }
        // 첫 화면 단추: 지난 판 · 📒
        await page.goto(url());
        await page.waitForFunction(() => window.__survival && window.__survival.ready, null, { timeout: 15000 });
        await page.evaluate(() => window.__survival.ready);
        ok(await page.evaluate(() => !document.getElementById('mstBtn').hidden && /\d/.test(document.getElementById('mstBtn').textContent)), '첫 화면: 📒 아쉬운 장면 단추에 개수');
        await page.click('#revBtn'); await page.waitForTimeout(200);
        ok(await page.evaluate(() => document.querySelectorAll('.overlay [data-i]').length > 0), '첫 화면: 🎞️ 지난 판 목록에 판이 있음');
        await page.click('.overlay [data-i]'); await page.waitForFunction(() => !document.getElementById('rev').hidden, null, { timeout: 8000 }).catch(() => {});
        ok(await page.evaluate(() => !document.getElementById('rev').hidden && document.getElementById('revStage').children.length > 0), '첫 화면: 지난 판을 눌러 복기가 열림');
        await page.click('#revBack');
        ok(await page.evaluate(() => document.getElementById('rev').hidden && !document.querySelector('.wrap').hidden), '첫 화면: 복기를 닫으면 첫 화면');
        ok(errs.length === 0, '연습 판 · 지난 판 콘솔 오류: ' + errs.slice(0, 3).join(' // '));
      } catch (e) { fail++; console.error('FAIL: 연습 판 시험 예외', e.message.split('\n')[0]); }
      await ctx.close();
    }
  } finally { await browser.close(); await srv.close(); }
  const miss = srv.missing.filter(m => !/\/list\/|favicon/.test(m.path));
  if (miss.length) notes.push('404: ' + miss.slice(0, 6).map(m => m.path).join(', '));
  console.log(notes.map(n => '  · ' + n).join('\n'));
  console.log(`survival 껍데기 화면 시험: 통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

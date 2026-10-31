// 게임 하나에 대한 브라우저 검사들: 메뉴 · 한 판 끝까지 · 몽키 · 친구랑(mock)
'use strict';
const path = require('path');
const P = require('./page');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 페이지가 멈췄을 때(무한 루프 등) evaluate 가 영영 안 돌아오지 않게
async function ev(page, fn, arg, ms = 10000) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('EVAL_TIMEOUT')), ms); });
  try { return await Promise.race([page.evaluate(fn, arg), timeout]); } finally { clearTimeout(t); }
}
async function waitFor(page, fn, arg, ms = 15000, every = 200) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) {
    try { last = await ev(page, fn, arg, 5000); if (last) return last; } catch (e) { if (e.message === 'EVAL_TIMEOUT') throw e; }
    await sleep(every);
  }
  return null;
}

class GameRun {
  constructor(A, env, unit) {
    this.A = A; this.env = env; this.unit = unit;      // unit: { engine, vp, browser }
    this.events = [];                                  // 콘솔·오류 (check 이름이 붙음)
    this.check = 'setup';
  }
  tag() { return `${this.unit.engine}/${this.unit.vp}`; }
  // 로컬은 늘 ?mock (Firebase·은행을 브라우저 안 흉내로 → 실서버에 안 씀), 실서버(--live)는 늘 ?guest (시험 공간)
  url(extra) {
    const fl = this.env.live ? 'guest' : 'mock';
    if (extra && (extra === fl || extra.startsWith(fl + '&'))) extra = extra.slice(fl.length + 1);
    const q = [this.A.query, fl, extra].filter(Boolean).join('&');
    return this.env.base + this.A.path + (q ? '?' + q : '');
  }
  result(name, status, note, ms, shot) {
    this.env.check(this.A.id, { name, engine: this.unit.engine, vp: this.unit.vp, status, note: note || '', ms: ms || 0, shot: shot || '' });
  }
  issue(o) { this.env.issue(Object.assign({ game: this.A.id, engine: this.unit.engine, vp: this.unit.vp, check: this.check }, o)); }
  async shot(page, name) { return P.shot(page, this.env.shotDir, `${this.A.id}_${this.unit.engine}_${this.unit.vp}_${name}`); }

  async newPage(ctx) {
    const page = await ctx.newPage();
    P.instrument(page, this.events, null, this.env.base);
    // 이벤트에 지금 검사 이름 붙이기
    const push = this.events.push.bind(this.events);
    this.events.push = (...xs) => push(...xs.map(x => Object.assign(x, { check: x.check || this.check, where: this.tag() }, this.check === 'monkey' && this.lastClick ? { after: this.lastClick } : {})));
    page.setDefaultTimeout(15000);
    return page;
  }
  async load(page, extra) {
    const t0 = Date.now();
    await page.goto(this.url(extra), { waitUntil: 'load', timeout: 30000 });
    const ok = await waitFor(page, this.A.ready, null, 15000);
    return { ok: !!ok, ms: Date.now() - t0 };
  }

  // ── 1) 메뉴: 오류·404·가로 넘침·가려짐·잘림
  async menuCheck(page) {
    this.check = 'menu';
    const t0 = Date.now();
    let r;
    try { r = await this.load(page); } catch (e) { this.issue({ sev: 'high', title: '페이지를 열지 못함', detail: e.message }); this.result('menu', 'fail', e.message); return false; }
    // 잠금 화면(common/gate.js) 이 페이지를 덮었나 — 127.0.0.1·?mock 에서는 열려야 함
    const gate = await ev(page, () => { const g = document.getElementById('bennyGateOverlay'); return !!(g && window.__qa && __qa.shown(g)); }).catch(() => false);
    if (gate) {
      const s = await this.shot(page, 'menu_gate');
      if (this.env.live) this.issue({ sev: 'info', cat: 'harness', title: '잠금 화면(Gate)이 떠서 이 기기로는 검사 못 함 (실서버 · 허용 안 된 기기)', shot: s });
      else this.issue({ sev: 'high', title: '잠금 화면(Gate)이 로컬(127.0.0.1)에서도 페이지를 막음 — 혼자 하기·시험이 안 됨', detail: 'common/gate.js 의 IS_LOCAL 우회가 안 먹음 (gate.js 변경 확인)', shot: s, kind: 'gate' });
      this.result('menu', 'fail', '잠금 화면에 막힘', Date.now() - t0, s);
      return false;
    }
    if (!r.ok && this.A.wip) {
      const s = await this.shot(page, 'menu_noready');
      this.issue({ sev: 'info', cat: 'harness', title: '만드는 중인 게임 — 페이지/시험 손잡이가 아직 준비 안 돼 건너뜀', detail: `ready() false — ${this.A.hookName || ''}`, shot: s });
      this.result('menu', 'skip', '만드는 중 · 준비 안 됨', Date.now() - t0, s);
      return false;
    }
    if (!r.ok) { const s = await this.shot(page, 'menu_noready'); this.issue({ sev: 'high', title: '시험 손잡이(hook)가 15초 안에 준비되지 않음', detail: `ready() false — ${this.A.hookName || ''}`, shot: s }); }
    await sleep(800);
    const lay = await this.layout(page, 'menu');
    const s = await this.shot(page, 'menu');
    this.result('menu', r.ok && !lay.bad ? 'pass' : (r.ok ? 'warn' : 'fail'), `열기 ${r.ms}ms` + (lay.note ? ' · ' + lay.note : ''), Date.now() - t0, s);
    return r.ok;
  }

  // 같은 사이트 링크가 다 열리나 (포털 카드 → 게임 주소)
  async linkCheck(page) {
    this.check = 'links';
    const t0 = Date.now();
    let res = [];
    try {
      res = await ev(page, async () => {
        const hs = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin) && !/^javascript:/.test(h)).map(h => h.split('#')[0]))];
        const out = [];
        for (const h of hs) { try { const r = await fetch(h, { cache: 'no-store' }); out.push([h, r.status]); } catch (e) { out.push([h, 0]); } }
        return out;
      }, null, 20000);
    } catch (e) { this.result('links', 'warn', '링크 검사 실패 ' + e.message, Date.now() - t0); return; }
    const bad = res.filter(([, st]) => st >= 400 || st === 0);
    if (bad.length) this.issue({ sev: 'medium', title: `깨진 링크 ${bad.length}개`, detail: bad.map(([h, st]) => `${st} ${h.replace(this.env.base, '/')}`).join(' | ') });
    this.result('links', bad.length ? 'fail' : 'pass', `같은 사이트 링크 ${res.length}개 · 깨짐 ${bad.length}`, Date.now() - t0);
  }

  async layout(page, where) {
    let lay;
    try { lay = await ev(page, P.layoutProbe, { phone: this.unit.vp === 'phone' }); } catch (e) { return { bad: false, note: 'layout 검사 실패: ' + e.message }; }
    const notes = []; let bad = false;
    const phone = this.unit.vp === 'phone';
    if (lay.overflowX) {
      bad = true; notes.push(`가로 넘침 ${lay.scrollW}>${lay.W}`);
      this.issue({ sev: phone ? 'medium' : 'low', title: `${where}: 화면이 옆으로 넘침 (가로 스크롤 ${lay.scrollW}px > ${lay.W}px)`, detail: '넘친 요소: ' + (lay.wide.join(', ') || '?'), kind: 'layout', shot: await this.shot(page, where + '_overflow') });
    }
    if (lay.offscreen.length) {
      bad = true; notes.push(`화면 밖 단추 ${lay.offscreen.length}`);
      this.issue({ sev: 'medium', title: `${where}: 단추가 화면 밖으로 나가 누를 수 없음`, detail: lay.offscreen.join(' | '), kind: 'layout', shot: await this.shot(page, where + '_offscreen') });
    }
    if (lay.covered.length) {
      notes.push(`가려진 단추 ${lay.covered.length}`);
      const sticky = lay.scrollH > lay.H + 1;
      this.issue({ sev: sticky ? 'info' : 'low', title: `${where}: 다른 요소에 가려진 단추${sticky ? ' (스크롤하면 보일 수 있음)' : ''}`, detail: lay.covered.join(' | '), kind: 'layout', shot: await this.shot(page, where + '_covered') });
    }
    if (lay.toasted && lay.toasted.length) this.issue({ sev: 'low', title: `${where}: 알림(토스트)이 떠 있는 동안 단추를 덮어 누름을 막음`, detail: lay.toasted.join(' | ') + ' — 토스트에 pointer-events:none 이 없으면 그 사이 누른 손가락이 먹힘', kind: 'layout' });
    if (lay.clipped.length) {
      notes.push(`글자 잘림 ${lay.clipped.length}`);
      this.issue({ sev: 'low', title: `${where}: 단추 글자가 잘리거나 넘침`, detail: lay.clipped.join(' | '), kind: 'layout' });
    }
    if (lay.tiny.length) this.issue({ sev: 'info', title: `${where}: 손가락으로 누르기 작은 단추 (<28px)`, detail: lay.tiny.join(' | '), kind: 'layout' });
    return { bad, note: notes.join(', '), lay };
  }

  // ── 2) 한 판 끝까지 (멈춤 감지)
  async playMode(page, mode, o = {}) {
    const A = this.A, M = A.modes[mode];
    this.check = 'play:' + mode;
    const seed = (this.env.seed + mode.length * 7919 + this.A.id.length) >>> 0;
    const timeout = (M.timeout || A.timeout || 90000) * (this.unit.engine === 'webkit' ? 1.5 : 1);
    const stuckMs = M.stuckMs || A.stuckMs || 20000;
    const t0 = Date.now();
    const repro = `${this.url()} (${this.tag()}) 에서 콘솔: ${A.reproHint ? A.reproHint(mode, seed) : `start ${mode} seed=${seed}`}`;
    try {
      if (!(await ev(page, A.menu))) { await ev(page, A.home).catch(() => {}); await sleep(500); }
      await ev(page, A.setup, mode);
      await ev(page, M.start, seed);
    } catch (e) {
      const s = await this.shot(page, `play_${mode}_start`);
      this.issue({ sev: 'high', title: `${mode}: 게임 시작 실패`, detail: e.message, repro, shot: s });
      this.result('play:' + mode, 'fail', '시작 실패: ' + e.message, Date.now() - t0, s); return false;
    }
    let lastFp = null, lastChange = Date.now(), changes = 0, r = null, laid = false, waitSince = 0;
    while (true) {
      await sleep(250);
      try {
        await ev(page, A.drive, mode, 8000);
        r = await ev(page, A.probe, mode, 8000);
      } catch (e) {
        if (e.message === 'EVAL_TIMEOUT') {
          const s = await this.shot(page, `play_${mode}_hung`);
          this.issue({ sev: 'high', title: `${mode}: 화면이 굳음 (자바스크립트가 8초 넘게 응답 없음 — 무한 루프 의심)`, detail: `마지막 상태: ${r ? r.info : '?'}`, repro, shot: s });
          this.result('play:' + mode, 'fail', '응답 없음', Date.now() - t0, s); return false;
        }
        if (/Target (page|closed)|crash/i.test(e.message)) { this.issue({ sev: 'high', title: `${mode}: 페이지가 죽음`, detail: e.message, repro }); this.result('play:' + mode, 'fail', '페이지 죽음', Date.now() - t0); return false; }
        r = { fp: 'err:' + e.message.slice(0, 80), over: false, waiting: false, info: 'probe 오류: ' + e.message };
      }
      if (!r) r = { fp: null, over: false, waiting: false, info: 'probe 가 null' };
      if (!laid && Date.now() - t0 > 2500) { laid = true; await this.layout(page, `play:${mode}`); }
      if (r.fp !== lastFp) { lastFp = r.fp; lastChange = Date.now(); changes++; }
      if (r.waiting) { if (!waitSince) waitSince = Date.now(); } else waitSince = 0;
      if (r.over) {
        await sleep(500);                               // 결과 창이 다 뜬 뒤 찍기
        const s = await this.shot(page, `play_${mode}_end`);
        this.result('play:' + mode, 'pass', `${Math.round((Date.now() - t0) / 1000)}초 · 상태 변화 ${changes}번 · ${r.info || ''}`, Date.now() - t0, s);
        return true;
      }
      const idle = Date.now() - lastChange;
      if (idle > stuckMs) {
        const s = await this.shot(page, `play_${mode}_stuck`);
        if (r.waiting) {
          this.issue({ sev: 'medium', title: `${mode}: 사람 입력을 기다린 채 ${Math.round(idle / 1000)}초 진행 없음 (자동 입력이 못 넘김)`, detail: `상태: ${r.info || ''} — 입력 단추가 안 보이거나 비활성일 수 있음 (자동 입력 한계일 수도)`, repro, shot: s, kind: 'stuck-wait' });
          this.result('play:' + mode, 'warn', '입력 대기에서 멈춤: ' + (r.info || ''), Date.now() - t0, s);
        } else {
          this.issue({ sev: 'high', title: `${mode}: 게임이 멈춤 — ${Math.round(idle / 1000)}초 동안 상태가 안 바뀜 (입력 대기 아님)`, detail: `상태: ${r.info || ''}`, repro, shot: s, kind: 'stuck' });
          this.result('play:' + mode, 'fail', '멈춤: ' + (r.info || ''), Date.now() - t0, s);
        }
        return false;
      }
      if (Date.now() - t0 > timeout) {
        const s = await this.shot(page, `play_${mode}_timeout`);
        this.issue({ sev: 'medium', title: `${mode}: ${Math.round(timeout / 1000)}초 안에 한 판이 안 끝남 (진행은 됨, 변화 ${changes}번)`, detail: `상태: ${r.info || ''}`, repro, shot: s, kind: 'slow' });
        this.result('play:' + mode, 'warn', `시간 초과 (변화 ${changes}번) ${r.info || ''}`, Date.now() - t0, s);
        return false;
      }
    }
  }

  // 게임 화면만 잠깐 (PC 화면 배치 검사용)
  async peekMode(page, mode) {
    const A = this.A, M = A.modes[mode];
    this.check = 'peek:' + mode;
    const t0 = Date.now();
    try {
      await ev(page, A.setup, mode); await ev(page, M.start, this.env.seed);
      for (let i = 0; i < 12; i++) { await sleep(250); await ev(page, A.drive, mode).catch(() => {}); }
      const lay = await this.layout(page, 'game');
      const s = await this.shot(page, 'game');
      this.result('game-layout', lay.bad ? 'warn' : 'pass', lay.note, Date.now() - t0, s);
      await ev(page, A.home).catch(() => {});
    } catch (e) { this.result('game-layout', 'fail', e.message, Date.now() - t0); this.issue({ sev: 'medium', title: '게임 화면 열기 실패', detail: e.message }); }
  }

  // ── 3) 몽키: 아무 데나 누르기
  // ── 뒤로·창·선생님 (11-01 베니 님이 직접 찾은 것들을 자동으로): 혼자 한 판 도중
  //   ① 뒤로 한 번 → 게임이 그대로 있어야 함 ② 창(족보·규칙·하는 법)을 열고 뒤로 → 창만 닫히고 게임은 그대로
  //   ③ AI 선생님 창 접기 → 동그라미 톡(진짜 손가락) → 펼쳐진 채로 있어야 함 (깜빡임·다시 접힘 없음)
  async navCheck(page, mode) {
    this.check = 'nav';
    const A = this.A, t0 = Date.now(), bad = [];
    const url0 = page.url();
    const alive = async () => { try { return page.url().split('#')[0] === url0.split('#')[0] && !!(await ev(page, A.ready, null, 4000)); } catch (e) { return false; } };
    const back = async () => { await page.keyboard.press('Shift').catch(() => {}); await sleep(150); await page.goBack({ waitUntil: 'commit', timeout: 2500 }).catch(() => {}); await sleep(700); };
    const OPEN = '.overlay:not([hidden]), .modal:not([hidden]), [role="dialog"]:not([hidden]), [aria-modal="true"], dialog[open], .rk-ov';
    const openCount = () => ev(page, sel => [...document.querySelectorAll(sel)].filter(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !el.closest('.arn-ov'); }).length, OPEN).catch(() => -1);
    try {
      if (mode && A.modes[mode]) { await ev(page, A.modes[mode].start); await sleep(1800); }
      // ①
      await back();
      if (!(await alive())) {
        bad.push('뒤로 한 번에 게임이 꺼짐');
        this.issue({ sev: 'high', title: '뒤로 한 번에 게임 화면을 떠남 (두 번 눌러야 나가야 함)', detail: `${mode || '메뉴'} 도중 history.back 한 번 → ${page.url()}`, shot: await this.shot(page, 'nav_back') });
        await page.goto(url0, { waitUntil: 'load' }).catch(() => {}); await waitFor(page, A.ready, null, 10000);
        if (mode && A.modes[mode]) { await ev(page, A.modes[mode].start).catch(() => {}); await sleep(1500); }
      }
      // ②
      const before = await openCount();
      const opened = await ev(page, () => {
        const b = [...document.querySelectorAll('button, a[href^="#"], [role="button"]')].find(x => /족보|규칙|하는 ?법|📖|❔/.test(x.textContent || '') && x.offsetParent && !x.closest('.overlay, .modal, [role=dialog], .arn-ov'));
        if (!b) return null; b.click(); return (b.textContent || '').trim().slice(0, 16);
      }).catch(() => null);
      if (opened) {
        await sleep(500);
        const mid = await openCount();
        if (mid > before) {
          await back();
          const after = await openCount();
          if (!(await alive())) { bad.push(`'${opened}' 창에서 뒤로 → 게임이 꺼짐`); this.issue({ sev: 'high', title: `'${opened}' 창을 연 채 뒤로 → 게임 화면을 떠남 (창만 닫혀야 함)`, shot: await this.shot(page, 'nav_modal') }); await page.goto(url0, { waitUntil: 'load' }).catch(() => {}); await waitFor(page, A.ready, null, 10000); }
          else if (after >= mid) { bad.push(`'${opened}' 창이 뒤로로 안 닫힘`); this.issue({ sev: 'medium', title: `'${opened}' 창을 연 채 뒤로 → 창이 안 닫힘`, shot: await this.shot(page, 'nav_modal_open') }); }
        }
      }
      // ③
      const vis = sel => ev(page, s => { const el = document.querySelector(s); return !!(el && !el.hidden && el.getBoundingClientRect().width > 0); }, sel).catch(() => false);
      const has = (await vis('.cpn')) || (await vis('.cpn-chip'));     // 처음부터 접혀 있으면(동그라미만) 펼치기만 시험
      if (has) {
        if (await vis('.cpn')) { await page.click('.cpn .cpn-min', { timeout: 3000 }).catch(() => {}); await sleep(400); }
        const chipOk = await ev(page, () => { const c = document.querySelector('.cpn-chip'); return !!(c && !c.hidden); }).catch(() => false);
        if (chipOk) {
          // 폰처럼 터치로 톡 (마우스 click 은 동그라미에 붙잡혀 실제 폰의 '열린 창의 − 로 click 이 가는' 문제가 안 나옴)
          await page.tap('.cpn-chip', { timeout: 3000 }).catch(() => page.click('.cpn-chip', { timeout: 3000 }).catch(() => {}));
          const flips = [];
          for (let i = 0; i < 24; i++) { flips.push(await ev(page, () => { const el = document.querySelector('.cpn'); return el && !el.hidden ? 1 : 0; }).catch(() => -1)); await sleep(50); }
          const changes = flips.reduce((n, v, i) => n + (i && v !== flips[i - 1] ? 1 : 0), 0);
          if (flips[flips.length - 1] !== 1 || changes > 1) { bad.push('선생님 창 펼치기가 깜빡이거나 다시 접힘'); this.issue({ sev: 'high', title: 'AI 선생님 동그라미를 누르면 깜빡이거나 다시 접힘', detail: `1.2초 동안 펼침 상태 ${flips.join('')} (1=펼침)`, shot: await this.shot(page, 'nav_coach') }); }
        }
      }
    } catch (e) { this.issue({ sev: 'medium', cat: 'harness', title: 'nav 검사 도구 예외', detail: String(e && e.message) }); }
    this.result('nav', bad.length ? 'fail' : 'pass', bad.length ? bad.join(' · ') : `뒤로 한 번 버팀 · 창은 뒤로로 닫힘 · 선생님 창 접기/펴기 그대로`, Date.now() - t0);
  }

  async monkey(page, ms) {
    const A = this.A; this.check = 'monkey';
    const t0 = Date.now(); const phone = this.unit.vp === 'phone';
    try { await this.load(page, this.env.live ? 'guest' : 'mock'); } catch (e) { this.result('monkey', 'fail', '열기 실패 ' + e.message); return; }
    const home = new URL(page.url()).pathname;
    let clicks = 0, noEffect = 0, maxNoEffect = 0, navAway = 0, started = false, rng = this.env.seed ^ 0x5bd1e995;
    const rand = n => { rng = (Math.imul(rng ^ (rng >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return rng % n; };
    const ENV = /firebase|googleapis|identitytoolkit|gstatic/i;   // 로컬에서 외부 서비스가 막혀 난 오류는 게임 탓이 아님
    const errsBefore = this.events.filter(e => e.kind === 'pageerror' && !ENV.test(e.text)).length;
    while (Date.now() - t0 < ms) {
      if (!started && Date.now() - t0 > ms * 0.35 && A.modes[A.monkeyStart || 'solo']) {
        started = true;
        try { if (!(await ev(page, A.menu))) await ev(page, A.home); await sleep(300); await ev(page, A.setup, 'monkey'); await ev(page, A.modes[A.monkeyStart || 'solo'].start, this.env.seed); } catch (e) {}
        await sleep(600);
      }
      let tgt;
      try {
        tgt = await ev(page, (r) => {
          const qa = window.__qa;
          if (!qa.cands || Date.now() - qa.candT > 1500) {
            const sel = 'button, a, [role=button], select, input, label, summary, canvas, svg, [onclick], [tabindex], .card, [data-i], [data-k], [data-id], td';
            const bad = el => el.matches('a[href]:not([href^="#"]):not([href^="javascript"]), [download], [data-admin], [type=file]') || !!el.closest('a[href]:not([href^="#"]):not([href^="javascript"])');
            // 맨 위에 창(모달)이 떠 있으면 그 안의 것만 (가려진 뒤쪽을 누르는 헛클릭 줄이기)
            let modal = null;
            for (let p = document.elementFromPoint(innerWidth / 2, innerHeight / 2); p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p), b = p.getBoundingClientRect(); if ((cs.position === 'fixed' || cs.position === 'absolute') && b.width >= innerWidth * 0.8 && b.height >= innerHeight * 0.8) { modal = p; break; } }
            qa.cands = [...document.querySelectorAll(sel)].filter(el => qa.vis(el) && !el.disabled && !bad(el) && (!modal || modal.contains(el)));
            qa.candT = Date.now();
          }
          const c = qa.cands.filter(el => el.isConnected && qa.vis(el));
          if (!c.length) return null;
          const el = c[r % c.length], b = el.getBoundingClientRect();
          const big = b.width > 120 && b.height > 120;   // 판·캔버스는 아무 곳이나
          const fx = big ? ((r >>> 8) % 1000) / 1000 : 0.5, fy = big ? ((r >>> 18) % 1000) / 1000 : 0.5;
          const x = Math.max(1, Math.min(innerWidth - 2, b.left + b.width * fx)), y = Math.max(1, Math.min(innerHeight - 2, b.top + b.height * fy));
          return { x, y, m: qa.muts, d: (el.tagName + '.' + (el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : ''))).slice(0, 40), sel: el.tagName === 'SELECT', inp: el.tagName === 'INPUT' && /text|search|number/.test(el.type) };
        }, rand(1 << 30) + 1, 6000);
      } catch (e) {
        if (e.message === 'EVAL_TIMEOUT') { const s = await this.shot(page, 'monkey_hung'); this.issue({ sev: 'high', title: '몽키 중 화면이 굳음 (자바스크립트 응답 없음)', detail: `${clicks}번 누른 뒤`, shot: s }); this.result('monkey', 'fail', '응답 없음', Date.now() - t0, s); return; }
        await sleep(300); continue;
      }
      if (!tgt) { await sleep(200); continue; }
      try {
        if (tgt.inp) { await page.mouse.click(tgt.x, tgt.y); await page.keyboard.type('ab1'); }
        else if (phone) await page.touchscreen.tap(tgt.x, tgt.y);
        else await page.mouse.click(tgt.x, tgt.y);
        if (!phone && rand(6) === 0) await page.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'Enter', 'Escape'][rand(6)]);
        if (tgt.sel) await page.keyboard.press('Escape');
      } catch (e) {}
      clicks++; this.lastClick = `${tgt.d} (${Math.round(tgt.x)},${Math.round(tgt.y)})`;
      await sleep(120 + rand(200));
      // 다른 페이지로 나가면 돌아옴
      let p = '';
      try { p = new URL(page.url()).pathname; } catch (e) {}
      if (p && p !== home) { navAway++; try { await this.load(page, this.env.live ? 'guest' : 'mock'); } catch (e) {} continue; }
      try { const m = await ev(page, () => window.__qa ? __qa.muts : -1, null, 4000); if (m === tgt.m) { noEffect++; maxNoEffect = Math.max(maxNoEffect, noEffect); } else noEffect = 0; } catch (e) {}
    }
    await P.pullRejections(page, this.events, null);
    // 살아 있나: 메뉴로 돌아갈 수 있어야
    let alive = false;
    try { await ev(page, A.home, null, 6000); alive = !!(await waitFor(page, A.menu, null, 5000)); } catch (e) {}
    const errs = this.events.filter(e => e.kind === 'pageerror' && !ENV.test(e.text)).length - errsBefore;
    const s = await this.shot(page, 'monkey_end');
    const notes = [`${clicks}번 누름`, navAway ? `다른 페이지로 나감 ${navAway}번` : '', maxNoEffect >= 15 ? `반응 없는 클릭 연속 ${maxNoEffect}번` : ''].filter(Boolean).join(' · ');
    if (!alive) this.issue({ sev: 'medium', title: '몽키 뒤 메뉴로 돌아가지 못함 (UI 갇힘 의심)', detail: notes, shot: s, repro: `${this.url('mock')} 에서 아무 곳이나 ${Math.round(ms / 1000)}초 누르기 (seed ${this.env.seed})` });
    if (maxNoEffect >= 30) this.issue({ sev: 'info', title: `몽키: 연속 ${maxNoEffect}번 눌러도 화면(DOM)이 안 바뀜 — 굳은 화면일 수 있음 (캔버스 게임이면 정상일 수도)`, detail: notes, shot: s });
    this.result('monkey', errs ? 'fail' : (alive ? 'pass' : 'warn'), notes + (errs ? ` · 페이지 오류 ${errs}` : ''), Date.now() - t0, s);
  }
}

module.exports = { GameRun, ev, waitFor, sleep };

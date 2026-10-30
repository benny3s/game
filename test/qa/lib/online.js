// 친구랑 (mock, 한 브라우저 안의 탭끼리 BroadcastChannel) 검사
//   방장 방 만들기 → 손님 초대 주소로 들어옴 → 방장 시작 → 자동으로 몇 수 → 두 화면 판 비교(desync)
//   → 늦게 온 구경꾼(세 번째 탭) 들어옴 → 세 화면 비교 → 손님 새로 고침(= 나갔다 다시 들어오기) → 비교 → 더 둠 → 비교
//   → 한 판 끝 → 결과 창: 손님 ✋ 준비 → 방장 '다음 판 시작' (손님 준비 전엔 잠겨 있어야) → 다음 판이 세 화면 모두에서 시작 → 비교
// 어댑터 A.online: open · started · setup(role) · fp · drive(role) · pause · resume  (+ 선택: beforeHost · beforeStart · round · finish · specFp · spectate:false · roundMs · stuckMs)
'use strict';
const path = require('path');
const P = require('./page');
const { GameRun, ev, waitFor, sleep } = require('./checks');

// 결과 창 단추 (브라우저 안). act = 'ready' | 'start' 이면 그 단추를 누름
//   손님: '✋ 준비' / '✋ 다음 판에 낄래요' → 누르면 '✅ 준비 완료 · 방장을 기다려요' (꺼짐)
//   방장: '다음 판 시작 (준비 0/1)' (꺼짐) → 손님이 준비하면 '다음 판 시작 ▶' (켜짐).  포커는 '다음 핸드 진행' · '새 게임'
const RES = act => {
  const qa = window.__qa;
  // 다른 창에 덮이지 않은(가운데를 누르면 그 단추가 받는) 것을 먼저 — 덮인 '✋ 준비 · 결과' 다시 열기 단추보다 결과 창 안 단추
  const onTop = b => { const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === b || b.contains(e)); };
  const all = qa.$$('button');
  const bs = all.filter(onTop).concat(all.filter(b => !onTop(b)));
  const txt = b => (b.textContent || '').trim().replace(/\s+/g, ' ');
  const ready = bs.find(b => /^✋|준비 완료|신청했어요/.test(txt(b)));
  const start = bs.find(b => /^(다음 (판|핸드|게임)|새 게임)/.test(txt(b)) && !/안 기다리고/.test(txt(b)));
  const force = bs.find(b => /안 기다리고/.test(txt(b)));
  const o = b => b ? { t: txt(b).slice(0, 40), d: !!b.disabled } : null;
  const out = { ready: o(ready), start: o(start), force: !!force };
  if (act === 'ready' && ready && !ready.disabled) ready.click();
  if (act === 'start' && start && !start.disabled) start.click();
  return out;
};

async function onlineCheck(A, env, browser, engine) {
  const O = A.online; const id = A.id;
  const unit = { engine, vp: 'phone' };
  const R = new GameRun(A, env, unit);
  R.check = 'online';
  const t0 = Date.now();
  const ctx = await browser.newContext(env.ctxOpts('phone', engine));
  await env.guard(ctx);
  await ctx.addInitScript(P.HELPERS);
  if (!env.live) await ctx.addInitScript({ path: path.join(env.root, 'common', 'arena-mock.js') });
  const flag = env.live ? 'guest' : 'mock';
  let code = '';
  const repro = () => `${R.url(flag)} 방 만들기 → 다른 탭에서 ${R.url(flag + '&room=' + (code || '코드'))}`;
  const fail = async (title, detail, pages, sev = 'high', cat = 'bug', check = 'online') => {
    let s = ''; for (const [n, p] of pages || []) { const f = await R.shot(p, check + '_' + n); s = s || f; }
    R.check = check;
    R.issue({ sev, cat, title: '친구랑: ' + title, detail, shot: s, repro: repro() });
    R.result(check, cat === 'harness' ? 'warn' : 'fail', title, Date.now() - t0, s);
    R.check = 'online';
  };
  let H, W, S = null;
  try {
    // ── 방장 · 손님 · 시작
    H = await R.newPage(ctx); R.check = 'online';
    if (!(await R.load(H, flag)).ok) return fail('방장 화면 준비 안 됨', '', [['host', H]]);
    await sleep(500);
    await ev(H, O.open);
    const hb = await waitFor(H, () => { const b = document.querySelector('[data-host]'); return b && __qa.vis(b) && !b.disabled; }, null, 8000);
    if (!hb) return fail('친구랑 창에 방 만들기 단추가 안 보임', '', [['host', H]]);
    if (O.beforeHost) await ev(H, O.beforeHost);
    await H.click('[data-host]');
    code = await waitFor(H, () => window.ArenaUI && ArenaUI.net && ArenaUI.net.code, null, 15000);
    if (!code) return fail('방 코드가 안 생김', '', [['host', H]]);
    W = await R.newPage(ctx); R.check = 'online';
    if (!(await R.load(W, flag + '&room=' + code)).ok) return fail('손님 화면 준비 안 됨', '', [['guest', W]]);
    const joined = await waitFor(H, () => window.ArenaUI && ArenaUI.net && Object.keys(ArenaUI.net.players || {}).length >= 2, null, 15000);
    if (!joined) return fail('손님이 방에 안 들어옴 (방장 화면 인원 1명)', '', [['host', H], ['guest', W]]);
    if (O.beforeStart) await ev(H, O.beforeStart);
    const sb = await waitFor(H, () => { const b = document.querySelector('[data-start]'); return b && !b.disabled && __qa.vis(b); }, null, 10000);
    if (!sb) return fail('시작하기 단추가 활성화 안 됨', '', [['host', H]]);
    await H.click('[data-start]');
    const tStart = Date.now();
    let st = await Promise.all([waitFor(H, O.started, null, 15000), waitFor(W, O.started, null, 15000)]);
    if (!st[0] || !st[1]) {
      // 15초 안에 안 되면 20초 더 기다려 봄 (느린 기기·검사 부하) → 늦게라도 되면 '늦음'(낮음), 끝내 안 되면 '시작 안 됨'(높음)
      const diag = async p => ev(p, () => { const n = window.ArenaUI && ArenaUI.net; return JSON.stringify({ url: location.search, playing: window.ArenaUI && ArenaUI.playing, phase: n && n.meta && n.meta.phase, players: n ? Object.keys(n.players || {}).length : null, overlay: [...document.querySelectorAll('.overlay:not([hidden]) h2, .arn-ov:not([hidden]) h2')].map(h => h.textContent.trim()).slice(0, 2) }); }).catch(e => 'diag 실패 ' + e.message);
      const d0 = `방장 ${await diag(H)}\n손님 ${await diag(W)}`;
      st = await Promise.all([waitFor(H, O.started, null, 20000), waitFor(W, O.started, null, 20000)]);
      if (!st[0] || !st[1]) return fail(`게임이 시작 안 됨 (방장 ${!!st[0]}, 손님 ${!!st[1]}, 35초 기다림)`, d0, [['host', H], ['guest', W]]);
      R.issue({ sev: 'low', title: `친구랑: 시작 뒤 한 화면이 ${Math.round((Date.now() - tStart) / 1000)}초 늦게 게임으로 넘어감`, detail: d0, repro: repro() });
    }
    if (O.setup) { await ev(H, O.setup, 'host'); await ev(W, O.setup, 'guest'); }
    const notes = [];
    const roles = () => [[H, 'host'], [W, 'guest']].concat(S ? [[S, 'spec']] : []);

    // 몇 수 두기 + 멈춤 감지
    const play = async (ms) => {
      const end = Date.now() + ms; let last = null, since = Date.now();
      while (Date.now() < end) {
        await Promise.all([ev(H, O.drive, 'host').catch(() => {}), ev(W, O.drive, 'guest').catch(() => {}), S && O.driveSpec ? ev(S, O.drive, 'spec').catch(() => {}) : null]);   // 구경꾼은 (driveSpec 이 아니면) 아무것도 안 누름 (✋ 다음 판에 낄래요 도 안 누름)
        let f = null; try { f = await ev(H, O.fp, null, 6000); } catch (e) { if (e.message === 'EVAL_TIMEOUT') return 'hung'; }
        if (f !== last) { last = f; since = Date.now(); }
        if (Date.now() - since > (O.stuckMs || 20000)) return 'stuck';
        await sleep(250);
      }
      return 'ok';
    };
    // 화면들의 판이 같은지 (잠시 멈추고 여러 번 비교). 구경꾼은 따로 (specFp 가 있으면 그것으로)
    const same = async (lbl) => {
      if (O.pause) for (const [p] of roles()) await ev(p, O.pause).catch(() => {});
      if (O.pause) await sleep(600);
      const specFn = O.specFp || O.fp;
      let a = null, b = null, ok = false, sa = null, sc = null, sok = !S;
      for (let i = 0; i < 50; i++) {
        try { [a, b] = await Promise.all([ev(H, O.fp), ev(W, O.fp)]); } catch (e) {}
        ok = !!(a && a === b);
        if (S && !sok && O.driveSpec) await ev(S, O.drive, 'spec').catch(() => {});
        if (S && !sok) { try { [sa, sc] = await Promise.all([specFn === O.fp ? a : ev(H, specFn), ev(S, specFn)]); } catch (e) {} sok = !!(sa && sa === sc); }
        if (ok && sok) break;
        await sleep(160);
      }
      if (O.resume) for (const [p] of roles()) await ev(p, O.resume).catch(() => {});
      if (S && !sok) {
        notes.push(`${lbl}: 구경꾼 다름`);
        await fail(`${lbl}: 구경꾼 화면의 판이 방장과 다름`, `방장 ${String(sa).slice(0, 300)}\n구경꾼 ${String(sc).slice(0, 300)}`, [['host', H], ['spec', S]], 'medium', 'bug', 'spectate');
        S = null;                                   // 구경꾼은 여기서 빼고 계속
      }
      if (!ok) { notes.push(`${lbl}: 다름`); await fail(`${lbl}: 두 화면의 판이 다름 (desync)`, `방장 ${String(a).slice(0, 300)}\n손님 ${String(b).slice(0, 300)}`, [['host', H], ['guest', W]]); return false; }
      notes.push(`${lbl}: 같음`); return true;
    };

    let p = await play(env.quick ? 5000 : 12000);
    if (p !== 'ok') return fail(p === 'hung' ? '방장 화면 굳음' : `진행이 ${Math.round((O.stuckMs || 20000) / 1000)}초 넘게 멈춤`, '', [['host', H], ['guest', W]]);

    // ── 늦게 온 구경꾼 (세 번째 탭이 초대 주소로 들어옴 → 판이 진행 중이라 구경)
    if (O.spectate !== false) {
      R.check = 'spectate';
      const ts = Date.now();
      const Sp = await R.newPage(ctx);
      const okS = (await R.load(Sp, flag + '&room=' + code)).ok && await waitFor(Sp, O.started, null, 20000);
      if (!okS) await fail('구경꾼(늦게 들어온 세 번째 사람)이 진행 중인 판을 못 받음', '', [['spec', Sp], ['host', H]], 'medium', 'bug', 'spectate');
      else {
        if (O.setup) await ev(Sp, O.setup, 'spec');
        S = Sp;
        const n = await ev(H, () => Object.keys((ArenaUI.net && ArenaUI.net.players) || {}).length).catch(() => 0);
        R.result('spectate', 'pass', `구경꾼 들어옴 (방 인원 ${n}명) · ${((Date.now() - ts) / 1000).toFixed(1)}초`, Date.now() - ts);
      }
      R.check = 'online';
    }
    if (!(await same('시작 뒤'))) return;

    // ── 손님 새로 고침 = 나갔다 다시 들어오기
    await W.reload({ waitUntil: 'load' });
    await waitFor(W, A.ready, null, 15000);
    const back = await waitFor(W, O.started, null, 20000);
    if (!back) return fail('손님이 새로 고침한 뒤 게임으로 못 돌아옴', '', [['guest', W], ['host', H]]);
    if (O.setup) await ev(W, O.setup, 'guest');
    if (!(await same('다시 들어온 뒤'))) return;
    p = await play(env.quick ? 5000 : 12000);
    if (p !== 'ok') return fail(p === 'hung' ? '화면 굳음 (다시 들어온 뒤)' : '다시 들어온 뒤 진행이 멈춤', '', [['host', H], ['guest', W]]);
    if (!(await same('더 둔 뒤'))) return;
    await P.pullRejections(H, R.events, null); await P.pullRejections(W, R.events, null);
    const s1 = await R.shot(W, 'online_guest');
    R.result('online', 'pass', `방 ${code} · ` + notes.join(' · '), Date.now() - t0, s1);

    // ── 한 판 끝 → ✋ 준비 → 방장 다음 판 시작
    if (O.round && env.quick && O.nextQuick === false) R.issue({ sev: 'info', cat: 'harness', check: 'next-round', title: "친구랑: 한 판이 길어 빠른 모드(--quick)에선 '준비 → 다음 판' 검사를 건너뜀 (전체 모드에선 함)" });
    else if (O.round) await nextRound();
    else R.issue({ sev: 'info', cat: 'harness', check: 'next-round', title: "친구랑: 어댑터에 round() 가 없어 '준비 → 다음 판' 검사를 건너뜀" });
  } catch (e) {
    await fail('검사 도구 예외', (e.stack || e.message).slice(0, 500), [], 'medium', 'harness');
  } finally {
    try { for (const pg of [H, W, S]) if (pg) await P.pullRejections(pg, R.events, null); } catch (e) {}
    env.absorb(R);
    await ctx.close().catch(() => {});
  }

  async function nextRound() {
    R.check = 'next-round';
    const tn = Date.now();
    const lim = O.roundMs || (env.quick ? 90000 : 150000);
    const r0 = await ev(H, O.round).catch(() => null), w0 = await ev(W, O.round).catch(() => null), s0 = S ? await ev(S, O.round).catch(() => null) : null;
    if (O.finish) await ev(H, O.finish).catch(() => {});
    let sawRes = false, lock = false, early = '', clickedReady = false, clickedStart = false, last = null, since = Date.now(), h = {}, w = {}, done = false;
    while (Date.now() - tn < lim) {
      try { [h, w] = await Promise.all([ev(H, RES), ev(W, RES)]); } catch (e) { if (e.message === 'EVAL_TIMEOUT') break; }
      const [rh, rw] = await Promise.all([ev(H, O.round).catch(() => null), ev(W, O.round).catch(() => null)]);
      if (rh != null && rw != null && String(rh) !== String(r0) && String(rw) !== String(w0)) {
        const ok = await Promise.all([ev(H, O.started).catch(() => false), ev(W, O.started).catch(() => false)]);
        if (ok[0] && ok[1]) { done = true; break; }
      }
      const hRes = !!(h.start || h.force), wRes = !!w.ready;
      if (hRes || wRes) sawRes = true;
      if (S) { const sr = await ev(S, RES).catch(() => ({})); if (sr.ready && !sr.ready.d && /^✋ 준비$/.test(sr.ready.t)) await ev(S, RES, 'ready').catch(() => {}); }   // 구경꾼이 어쩌다 앉았으면 준비만
      if (w.ready && !w.ready.d && /^✋/.test(w.ready.t)) {
        if (h.start && h.start.d) lock = true;
        if (h.start && !h.start.d && !early) early = `방장 '${h.start.t}' 켜짐 · 손님 '${w.ready.t}'`;
        await ev(W, RES, 'ready').catch(() => {}); clickedReady = true;
      } else if (h.start && !h.start.d && (clickedReady || (w.ready && w.ready.d) || !w.ready)) {
        await ev(H, RES, 'start').catch(() => {}); clickedStart = true;
      }
      // 판 진행: 결과 창이 아닌 화면만 어댑터가 둠
      await Promise.all([hRes ? null : ev(H, O.drive, 'host').catch(() => {}), wRes ? null : ev(W, O.drive, 'guest').catch(() => {}), S && O.driveSpec ? ev(S, O.drive, 'spec').catch(() => {}) : null]);
      let f = null; try { f = await ev(H, O.fp, null, 6000); } catch (e) {}
      const key = f + '|' + JSON.stringify(h) + JSON.stringify(w);
      if (key !== last) { last = key; since = Date.now(); }
      if (Date.now() - since > Math.max(30000, O.stuckMs || 20000)) break;
      await sleep(250);
    }
    const secs = Math.round((Date.now() - tn) / 1000);
    if (!done) {
      if (!sawRes) {
        const s = await R.shot(H, 'next_host');
        R.issue({ sev: 'info', cat: 'harness', title: `친구랑: ${secs}초 안에 한 판이 안 끝나 '준비 → 다음 판' 검사를 못 함`, detail: `방장 판 ${r0} · 결과 창 단추 없음`, shot: s });
        R.result('next-round', 'skip', `${secs}초 안에 판이 안 끝남`, Date.now() - tn, s);
        return;
      }
      return fail(`결과 창에서 다음 판으로 못 넘어감 (${secs}초)`, `방장 단추 ${JSON.stringify(h)}\n손님 단추 ${JSON.stringify(w)}\n손님 ✋ 누름 ${clickedReady} · 방장 시작 누름 ${clickedStart} · 판 ${r0}→?`, [['host', H], ['guest', W]], 'high', 'bug', 'next-round');
    }
    if (early) R.issue({ sev: 'medium', title: "친구랑: 손님이 준비하기 전에 방장 '다음 판 시작' 단추가 이미 켜져 있음", detail: early, repro: repro() });
    let specNote = '';
    if (S) {
      const rs = await (async () => { for (let i = 0; i < 40; i++) { const v = await ev(S, O.round).catch(() => null); if (v != null && String(v) !== String(s0)) return v; await sleep(250); } return null; })();
      specNote = rs != null ? ' · 구경꾼도 다음 판 받음' : ' · 구경꾼은 다음 판을 못 받음';
      if (rs == null) { await fail('구경꾼 화면이 다음 판으로 안 넘어감', `구경꾼 판 ${s0}`, [['spec', S], ['host', H]], 'medium', 'bug', 'spectate'); S = null; }
    }
    if (O.setup) for (const [p, r] of [[H, 'host'], [W, 'guest']].concat(S ? [[S, 'spec']] : [])) await ev(p, O.setup, r).catch(() => {});
    // 다음 판도 조금 두고 비교
    const end = Date.now() + 3000;
    while (Date.now() < end) { await Promise.all([ev(H, O.drive, 'host').catch(() => {}), ev(W, O.drive, 'guest').catch(() => {})]); await sleep(250); }
    if (O.pause) for (const p of [H, W, S]) if (p) await ev(p, O.pause).catch(() => {});
    await sleep(600);
    let a = null, b = null;
    for (let i = 0; i < 50; i++) { try { [a, b] = await Promise.all([ev(H, O.fp), ev(W, O.fp)]); } catch (e) {} if (a && a === b) break; await sleep(160); }
    if (!(a && a === b)) return fail('다음 판에서 두 화면의 판이 다름 (desync)', `방장 ${String(a).slice(0, 300)}\n손님 ${String(b).slice(0, 300)}`, [['host', H], ['guest', W]], 'high', 'bug', 'next-round');
    const s = await R.shot(H, 'next_host');
    R.result('next-round', 'pass', `판 ${r0}→${await ev(H, O.round).catch(() => '?')} · ${lock ? '손님 준비 전 방장 시작 잠김 ✓ · ' : ''}${clickedReady ? '손님 ✋ 준비 · ' : ''}${clickedStart ? '방장 시작' : '자동 진행'}${specNote} · ${secs}초`, Date.now() - tn, s);
  }
}

module.exports = { onlineCheck, RES };

/* 베니스트레이션 — 메뉴 · 한 기기에서 여럿 · 친구랑 · 화면(제시어·그리기·맞히기·공개·투표·결과) · 시험 손잡이 (규칙은 core.js, 그림판은 pad.js)
   흐름: 공책 n권을 단계마다 옆 사람에게 넘김 (core.js 맨 위 설명). 화면은 한 장 — #scr 안에 단계마다 새로 그림
   친구랑: 방장이 판의 주인 (친구는 낸 것만 보내고, 방장이 단계·공개·투표를 정해 모두에게 뿌림). 방장도 자기 메시지를 handle() 로 똑같이 받음
     메시지: go(판 시작·다시 들어온 사람에게 지금 상태) · step · task(그 사람 몫) · prog(낸 사람) · bk(공책 한 권) · rv(공개 위치) · vote · vp · res · rdyl
             손님→방장: hi · sub · v · rdy
   한 기기: 같은 코어로 한 사람씩 가림막(HotSeat.cover) → 일 → 다음 사람 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = window.DrawCore, Wd = window.DrawWords, P = window.DrawPad, C = window.Cozy;
  const esc = C.esc;
  const sfx = (n, o) => C.sfx.play(n, o);
  const SITE = 'draw';
  try { if (window.GRank && GRank.NAMES) GRank.NAMES[SITE] = '베니스트레이션'; } catch (e) {}   // 랭킹 창 이름표 (common/rank.js 목록에 없어도 보이게)

  // ── 설정 (localStorage) ──────────────────────────────────
  const KEY = 'draw.';
  const st = (k, d) => C.store(KEY + k, d);
  const DEF = { draw: 60, guess: 25, pick: 'pick' };
  const DRAWS = [[40, '40초'], [60, '60초'], [90, '90초']], GUESSES = [[25, '25초'], [40, '40초']], PICKS = [['pick', '🎲 골라 주기'], ['write', '✍️ 직접 쓰기']];
  const opt = { draw: st('draw', 60), guess: st('guess', 25), pick: st('pick', 'pick') };
  if (!DRAWS.some(x => x[0] === opt.draw)) opt.draw = 60;
  if (!GUESSES.some(x => x[0] === opt.guess)) opt.guess = 25;
  if (opt.pick !== 'write') opt.pick = 'pick';
  const saveOpt = k => C.save(KEY + k, opt[k]);
  const pickLabel = v => (v === 'write' ? '직접 쓰기' : '골라 주기');

  // 시험용 손잡이 값
  let FAST = 0, PAUSED = false, QA_MIN = 0;
  const VOTE_SEC = 45;
  const GRACE = 4;                                                      // 방장이 시간 뒤에 더 기다리는 초 (늦게 도착한 자동 제출을 받으려고)
  const secs = n => (FAST ? Math.min(n, 5) : n);

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick, canEdit = true) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}" ${canEdit ? '' : 'disabled'}>${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b || !canEdit) return; sfx('tap'); onPick(b.dataset.v); };
  }
  let lPick = null;
  function drawMenu() {
    $('tabLocal').setAttribute('aria-pressed', 'true');
    $('tabFriend').setAttribute('aria-pressed', 'false');
    if (!lPick && window.HotSeat) lPick = HotSeat.setup($('lSeats'), { game: 'draw', min: 3, max: 8, allowAI: false });
    segBtns($('drawSeg'), DRAWS, opt.draw, v => { opt.draw = +v; saveOpt('draw'); drawMenu(); });
    segBtns($('guessSeg'), GUESSES, opt.guess, v => { opt.guess = +v; saveOpt('guess'); drawMenu(); });
    segBtns($('pickSeg'), PICKS, opt.pick, v => { opt.pick = v; saveOpt('pick'); drawMenu(); });
  }
  $('tabLocal').onclick = () => { sfx('tap'); drawMenu(); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriend(); };
  $('startBtn').onclick = () => { sfx('pop'); startHot(); };
  $('rulesBtn').onclick = () => showRules();
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open(SITE); } catch (e) {} };

  function showRules() {
    sfx('tap');
    return C.modal({
      title: '📖 베니스트레이션 하는 법',
      html: `<div class="howto" style="text-align:left;font-size:14.5px;display:grid;gap:7px;padding:12px 14px">
        <div>🐱 <b>그림 전달 놀이</b>예요. 3~8명이 각자 <b>공책</b> 한 권을 가지고 시작해요.</div>
        <div>1️⃣ 먼저 내 공책에 <b>제시어</b>를 적어요 (골라 주기·직접 쓰기)</div>
        <div>2️⃣ 공책을 옆 사람에게 넘겨요. 받은 공책이 <b>글</b>이면 <b>그림</b>으로 그리고, <b>그림</b>이면 무슨 그림인지 <b>글</b>로 적어요. 앞 쪽은 바로 앞 한 쪽만 볼 수 있어요</div>
        <div>3️⃣ 사람 수만큼 돌면 끝! 모두가 모든 공책을 한 번씩 만져요</div>
        <div>4️⃣ 방장(한 기기는 모두 같이)이 <b>공책을 한 쪽씩 공개</b>해요. 제시어가 어디서 엉뚱해졌는지 구경해요</div>
        <div>5️⃣ 마음에 드는 그림에 투표 (내 그림은 못 골라요). 가장 많이 받은 사람이 🏆 <b>오늘의 그림</b>!</div>
        <div class="small">시간이 끝나면 그리던 그대로 자동으로 내요. 못 낸 그림은 '(빈 종이 🐾)', 못 쓴 글은 '???' 로 넘어가요.</div></div>`,
      buttons: [{ label: '닫기', primary: true }], dismiss: true,
    });
  }

  // ── 화면 전환 ─────────────────────────────────────────────
  function show(which) {
    document.body.classList.toggle('online', !!(SES && SES.mode === 'online') && which === 'play');
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
  }
  function goHome() {
    if (SES) SES.dispose();
    SES = null;
    show('home'); drawMenu();
  }

  // ── 세션 ─────────────────────────────────────────────────
  class Cancel extends Error {}
  let SES = null;
  function newSession(cfg) {
    const ses = { cfg, mode: cfg.mode, alive: true, offs: [], G: null, H: null, V: null, net: cfg.net || null, role: cfg.role || null, uid: cfg.uid || '', rdy: new Set(), pick: {}, rankG: 0, hot: null };
    ses.dispose = () => {
      ses.alive = false;
      clearInterval(ses.hiT);
      if (ses.H) { clearTimeout(ses.H.tmo); clearTimeout(ses.H.vTmo); }
      for (const f of ses.offs.splice(0)) { try { f(); } catch (e) {} }
      stopTimer(); destroyCur();
      if (window.HotSeat) { try { HotSeat.close(); } catch (e) {} }
      if (ses.wake) ses.wake();
    };
    return ses;
  }
  const chk = ses => { if (!ses.alive || SES !== ses) throw new Cancel(); };

  // ── 카운트다운 (막대 오른쪽 알약) ─────────────────────────
  let TM = null;
  function stopTimer() { if (TM) { clearInterval(TM.iv); TM = null; } const t = $('timer'); t.hidden = true; t.classList.remove('hot'); }
  function startTimer(ms, cb) {
    stopTimer();
    TM = { end: Date.now() + ms, cb, iv: 0, at: Date.now(), last: -1 };
    const pill = $('timer');
    const tick = () => {
      if (!TM) return;
      const now = Date.now();
      if (PAUSED) { TM.end += now - TM.at; TM.at = now; return; }       // 시험: 멈춤
      TM.at = now;
      const left = Math.max(0, Math.ceil((TM.end - now) / 1000));
      if (left !== TM.last) {
        TM.last = left; pill.textContent = '⏱ ' + left; pill.classList.toggle('hot', left <= 10);
        if (left <= 5 && left > 0) sfx('count');
      }
      if (TM.end - now <= 0) { const f = TM.cb; stopTimer(); if (f) f(); }
    };
    pill.hidden = false;
    TM.iv = setInterval(tick, 200); tick();
  }
  function setBar(lbl, sub) { $('lbl').textContent = lbl; $('sub').textContent = sub || ''; }
  const scr = () => $('scr');
  const scrCls = c => { scr().className = 'scr' + (c ? ' ' + c : ''); };

  // ── 일 화면 (제시어 · 그리기 · 맞히기) ────────────────────
  let CUR = null;                                // 지금 떠 있는 일 { kind, pad, auto(), done, qa() }
  function destroyCur() { if (CUR && CUR.pad) CUR.pad.lock(); CUR = null; }
  const KIND_BAR = { p: '✏️ 제시어', d: '🎨 그리기', g: '🤔 맞히기' };

  // o = { kind, text(그릴 말) | enc(볼 그림), small(안내 한 줄), who(한 기기: 이름), onSubmit(payload) }
  function showWork(ses, o) {
    destroyCur(); stopTimer();
    const k = o.kind, root = scr();
    scrCls(k === 'd' ? 's-draw' : k === 'g' ? 's-guess' : '');
    const cur = CUR = { kind: k, done: false, pad: null, auto: null, qa: null };
    const finish = payload => { if (cur.done || CUR !== cur) return; cur.done = true; stopTimer(); if (cur.pad) cur.pad.lock(); sfx('pop'); o.onSubmit(payload); };
    cur.finish = finish;
    const head = (small, big, sm) => `<div class="task"><small>${esc(small)}</small><b${sm ? ' class="sm"' : ''}>${esc(big)}</b></div>`;
    const who = o.who ? `${o.who} 님 · ` : '';
    if (k === 'p') {
      if (o.cfg.pick === 'write') {
        root.innerHTML = `${head(who + '📒 내 공책 · 제시어', '그릴 만한 말을 적어요')}
          <form class="fform" id="wf"><div class="frow"><input class="fld" id="txt" maxlength="16" placeholder="예) 붕어빵" autocomplete="off" autocapitalize="off" enterkeyhint="done" aria-label="제시어"><button type="button" class="btn" id="dice" aria-label="아무거나">🎲</button></div></form>
          <p class="note">친구들이 그림으로 그릴 말이에요. 너무 어렵지 않게!</p>
          <div style="flex:1"></div>
          <div class="acts"><button class="btn primary big" id="okBtn" disabled>이걸로 정했어요 ✅</button></div>`;
        const inp = $('txt'), ok = $('okBtn');
        inp.oninput = () => { ok.disabled = !D.cleanText(inp.value, D.TEXT_MAX.p); };
        $('dice').onclick = () => { sfx('tap'); inp.value = Wd.one(); inp.oninput(); };
        const go = () => { const t = D.cleanText(inp.value, D.TEXT_MAX.p); if (t) finish({ t }); };
        ok.onclick = go; $('wf').onsubmit = e => { e.preventDefault(); go(); };
        cur.auto = () => ({ t: D.cleanText(inp.value, D.TEXT_MAX.p) || Wd.one() });
        cur.qa = () => { inp.value = Wd.one(); inp.oninput(); ok.click(); return true; };
        if (matchMedia('(hover: hover)').matches) setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 50);
      } else {
        let words = Wd.pick3(), sel = -1;
        const draw = () => {
          root.innerHTML = `${head(who + '📒 내 공책 · 제시어', '하나를 골라요')}
            <div class="picks" id="picks">${words.map((w, i) => `<button class="pick" data-i="${i}" aria-pressed="${i === sel}"><span class="em">${w.em}</span>${esc(w.w)}<small>${esc(w.cat)}</small></button>`).join('')}</div>
            <div class="acts"><button class="btn" id="reroll">🔄 다른 말로 바꾸기</button><button class="btn primary big" id="okBtn" ${sel < 0 ? 'disabled' : ''}>이걸로 정했어요 ✅</button></div>`;
          $('picks').onclick = e => { const b = e.target.closest('.pick'); if (!b) return; sfx('tap'); sel = +b.dataset.i; draw(); };
          $('reroll').onclick = () => { sfx('tap'); words = Wd.pick3(null, words.map(x => x.w)); sel = -1; draw(); };
          $('okBtn').onclick = () => { if (sel >= 0) finish({ t: words[sel].w }); };
        };
        draw();
        cur.auto = () => ({ t: words[sel >= 0 ? sel : 0].w });
        cur.qa = () => { sel = 0; draw(); $('okBtn').click(); return true; };
      }
    } else if (k === 'd') {
      const first = o.step === 1;
      root.innerHTML = `${head(who + (first ? '🖍️ 친구의 제시어를 그려요' : '🖍️ 친구가 이렇게 맞혔어요 — 그려요'), o.text, String(o.text).length > 9)}
        <div class="padwrap"><canvas class="pad" id="pad" aria-label="그림판"></canvas></div>
        <div class="pal" id="pal">${D.COLORS.map((c, i) => `<button type="button" data-c="${i}" style="--c:${c.hex}" aria-label="${c.name}" aria-pressed="${i === 0}"></button>`).join('')}</div>
        <div class="tl" id="tl">
          ${[0, 1, 2].map(i => `<button type="button" data-s="${i}" aria-label="붓 ${i + 1}" aria-pressed="${i === 1}"><i class="dot" style="width:${[6, 12, 20][i]}px;height:${[6, 12, 20][i]}px"></i></button>`).join('')}
          <button type="button" id="erBtn" aria-label="지우개" aria-pressed="false">🧽</button>
          <button type="button" id="unBtn" aria-label="되돌리기" disabled>↩️</button>
          <button type="button" id="clBtn" aria-label="모두 지우기" disabled>🗑️</button>
        </div>
        <div class="act"><button class="btn primary big" id="okBtn">다 그렸어요 ✅</button></div>`;
      const cv = $('pad');
      const sync = () => { $('unBtn').disabled = !pad.strokes.length; $('clBtn').disabled = !pad.strokes.length; $('clBtn').classList.remove('armed'); };
      const pad = cur.pad = new P.Pad(cv, { onChange: sync, onLimit: () => C.toast('획이 너무 많아요. 되돌리거나 지워 주세요', 1800) });
      let clearAt = 0;
      $('pal').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); pad.color = +b.dataset.c; pad.eraser = false; mark(); };
      const mark = () => {
        $('pal').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(!pad.eraser && +x.dataset.c === pad.color)));
        $('tl').querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.s === pad.size)));
        $('erBtn').setAttribute('aria-pressed', String(pad.eraser));
      };
      $('tl').onclick = e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.s != null) { sfx('tap'); pad.size = +b.dataset.s; mark(); }
        else if (b.id === 'erBtn') { sfx('tap'); pad.eraser = !pad.eraser; mark(); }
        else if (b.id === 'unBtn') { sfx('tap'); pad.undo(); }
        else if (b.id === 'clBtn') {
          if (Date.now() - clearAt < 2000) { clearAt = 0; pad.clear(); sfx('whoosh'); }
          else { clearAt = Date.now(); b.classList.add('armed'); C.toast('한 번 더 누르면 모두 지워요', 1500); setTimeout(() => b.classList.remove('armed'), 2000); }
        }
      };
      $('okBtn').onclick = () => {
        if (pad.blank && !confirmBlank) { confirmBlank = true; C.toast('아직 아무것도 안 그렸어요. 그대로 내려면 한 번 더 눌러요', 2200); setTimeout(() => { confirmBlank = false; }, 2500); return; }
        finish({ s: pad.toEnc() });
      };
      let confirmBlank = false;
      cur.auto = () => ({ s: pad.toEnc() });
      cur.qa = () => { scribble(cv, 3 + Math.floor(Math.random() * 3)); $('okBtn').click(); return true; };
    } else {   // 'g' 맞히기
      root.innerHTML = `${head(who + '🤔 무슨 그림일까요?', '그림을 보고 한 줄로 적어요', true)}
        <form class="fform" id="wf"><input class="fld" id="txt" maxlength="20" placeholder="이 그림은…" autocomplete="off" autocapitalize="off" enterkeyhint="send" aria-label="맞힌 글"></form>
        <div class="padwrap"><canvas id="view" aria-label="친구의 그림"></canvas></div>
        <div class="act"><button class="btn primary big" id="okBtn" disabled>이렇게 생각해요 ✅</button></div>`;
      P.render($('view'), o.enc, { w: 900 });
      const inp = $('txt'), ok = $('okBtn');
      inp.oninput = () => { ok.disabled = !D.cleanText(inp.value, D.TEXT_MAX.g); };
      const go = () => { const t = D.cleanText(inp.value, D.TEXT_MAX.g); if (t) finish({ t }); };
      ok.onclick = go; $('wf').onsubmit = e => { e.preventDefault(); go(); };
      cur.auto = () => ({ t: D.cleanText(inp.value, D.TEXT_MAX.g) });
      cur.qa = () => { inp.value = ['고양이?', '붕어빵', '우주선', '모르겠다', '감자'][Math.floor(Math.random() * 5)]; inp.oninput(); ok.click(); return true; };
      if (matchMedia('(hover: hover)').matches) setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 50);
    }
    // 시간이 다 되면 지금까지 한 것을 그대로 냄
    if (o.dur) startTimer(o.dur * 1000, () => { if (CUR === cur && !cur.done) { C.toast('⏱ 시간이 다 됐어요! 그대로 낼게요', 1500); finish(cur.auto()); } });
  }

  // 시험·몽키용: 그림판에 진짜 포인터 이벤트로 낙서 (pad.js 가 받는 길을 그대로 씀)
  function scribble(cv, n) {
    const r = cv.getBoundingClientRect(), rnd = Math.random;
    const ev = (type, x, y, id) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x * r.width, clientY: r.top + y * r.height, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true }));
    for (let i = 0; i < n; i++) {
      const id = 40 + i, rad = 0.06 + rnd() * 0.12, cx = 0.2 + rnd() * 0.6, cy = 0.3 + rnd() * 0.4;   // 판 안에 들어오게 (가로 0.2~0.8 · 세로 0.3~0.7, 세로 반지름은 ×1.2 → 최대 0.7+0.17)
      ev('pointerdown', cx + rad, cy, id);
      for (let a = 0; a <= 24; a++) { const t = a / 24 * 6.28; ev('pointermove', cx + Math.cos(t) * rad, cy + Math.sin(t) * rad * 1.2, id); }
      ev('pointerup', cx + rad, cy, id);
    }
  }

  // ── 기다리는 화면 / 구경 ───────────────────────────────────
  const chipsHtml = V => V.names.map((nm, i) => {
    const gone = V.gone.has(i), ok = V.done.has(i);
    return `<span class="chip${gone ? ' gone' : ok ? ' ok' : ''}${i === V.me ? ' me' : ''}">${gone ? '🔌' : ok ? '✅' : '✏️'} ${esc(nm)}</span>`;
  }).join('');
  function showWait(ses) {
    destroyCur(); scrCls();
    const V = ses.V, spec = V.me < 0;
    scr().innerHTML = `<div class="task"><small>${spec ? '👀 구경 중' : '📤 냈어요!'}</small><b class="sm">${spec ? '친구들이 하는 중이에요' : '다른 친구를 기다려요'}</b></div>
      <div class="waitbox"><div class="paw">🐱</div><h2 id="wtxt"></h2><div class="meter"><i id="wmeter"></i></div><div class="chips" id="chips"></div>
      <p>${spec ? '이번 판이 끝나면 다음 판에 낄 수 있어요' : '시간이 끝나면 못 낸 사람은 빈 종이로 넘어가요'}</p></div>`;
    updateProg(ses);
  }
  function updateProg(ses) {
    const V = ses.V; if (!V || V.ph !== 'step') return;
    const d = V.done.size, n = V.n;
    setBar(KIND_BAR[D.kindOf(V.step)] || '베니스트레이션', `${V.step + 1}/${n}단계 · 제출 ${d}/${n}`);
    const wt = $('wtxt'); if (wt) { wt.textContent = `${d} / ${n}명 냈어요`; $('wmeter').style.width = Math.round(d / n * 100) + '%'; $('chips').innerHTML = chipsHtml(V); }
  }

  // ── 공개 (한 쪽씩) ─────────────────────────────────────────
  function pageHtml(pg, i, names) {
    const nm = esc(names[pg.by] || '?');
    if (pg.k === 'd') return `<div class="pg"><div class="who">🎨 ${nm} · 그림</div><canvas data-i="${i}"></canvas></div>`;
    return `<div class="pg${i === 0 ? ' first' : ''}"><div class="who">${i === 0 ? '✏️' : '🤔'} ${nm} · ${i === 0 ? '제시어' : '맞힌 글'}</div><div class="txt">${esc(pg.t)}</div></div>`;
  }
  // R = { books, names, b, p, ctl(true 면 ◀ ▶ 를 눌러 넘김), onNav(dir) , goLabel }
  function showReveal(ses, R) {
    destroyCur(); stopTimer(); scrCls();
    const n = R.books.length, pages = R.books[R.b], len = pages.length, last = R.b === n - 1 && R.p === len;
    setBar('📒 공개', `${R.b + 1}/${n}권 · ${R.p}/${len}쪽`);
    const list = pages.slice(0, R.p).map((pg, i) => pageHtml(pg, i, R.names)).join('<div class="arr">⬇</div>');
    const nextLabel = last ? '🗳️ 투표하러 가기' : R.p === len ? '다음 공책 ▶' : '다음 쪽 ▶';
    scr().innerHTML = `<div class="task"><small>📒 ${R.b + 1} / ${n}번째 공책</small><b>${esc(R.names[R.b])}의 공책</b></div>
      <div class="scroll" id="rvscroll"><div class="rvlist" id="rvlist">${list}</div></div>
      ${R.p === len ? `<button class="btn rvsave" id="rvSave">📷 이 공책 이미지로 저장</button>` : ''}
      ${R.ctl
        ? `<div class="rvnav"><button class="btn" id="rvPrev" aria-label="이전 쪽">◀</button><div class="rvinfo"><b>${R.p} / ${len}쪽</b>${R.p === len ? '끝까지 봤어요' : '넘겨요'}</div><button class="btn primary" id="rvNext">${nextLabel}</button></div>`
        : `<div class="rvnav guest"><div class="rvinfo"><b>${R.p} / ${len}쪽</b>방장이 한 쪽씩 넘겨 줘요</div></div>`}`;
    const lst = $('rvlist');
    lst.querySelectorAll('canvas[data-i]').forEach(cv => { const i = +cv.dataset.i; P.render(cv, pages[i].s, { w: 600 }); });
    const sc = $('rvscroll'), lastCard = lst.querySelector('.pg:last-child');
    if (lastCard) { lastCard.style.animation = 'pgin .28s ease-out'; sc.scrollTop += lastCard.getBoundingClientRect().top - sc.getBoundingClientRect().top - 4; }
    if (R.ctl) {
      $('rvPrev').disabled = R.b === 0 && R.p === 1;
      $('rvPrev').onclick = () => { sfx('tap'); R.onNav(-1); };
      $('rvNext').onclick = () => { sfx(last ? 'go' : 'tap'); R.onNav(1); };
    }
    const sv = $('rvSave'); if (sv) sv.onclick = () => saveBook(R.books, R.names, R.b);
  }

  // ── 투표 ─────────────────────────────────────────────────
  // Vt = { books, names, voter(번호, -1 이면 구경), who(한 기기 이름), vote(b,p), disabled, status }
  function showVote(ses, Vt) {
    destroyCur(); stopTimer(); scrCls();
    const cards = D.drawings(Vt.books).filter(d => !d.blank);
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    setBar('🗳️ 투표', Vt.who ? `${Vt.who} 님` : '');
    scr().innerHTML = `<div class="task"><small>${Vt.who ? esc(Vt.who) + ' 님 · ' : ''}🗳️ 투표</small><b class="sm">마음에 드는 그림을 하나 골라요</b></div>
      <div class="scroll"><div class="vgrid" id="vgrid">${cards.map(d => {
        const mine = d.by === Vt.voter;
        return `<button class="vc${mine ? ' mine' : ''}" data-b="${d.b}" data-p="${d.p}" aria-pressed="false" ${mine || Vt.disabled ? 'disabled' : ''}><canvas></canvas><span class="cap">${d.src ? '“' + esc(d.src) + '” · ' : ''}<b>${esc(Vt.names[d.by])}</b></span></button>`;
      }).join('')}</div></div>
      <div class="acts"><p class="note" id="vnote">${Vt.voter < 0 ? '👀 구경 중이라 투표는 못 해요' : '내 그림은 못 골라요'}</p><button class="btn primary big" id="voteBtn" disabled>🗳️ 이 그림에 투표</button></div>`;
    $('vgrid').querySelectorAll('.vc').forEach((el, i) => P.render(el.querySelector('canvas'), cards[i].s, { w: 360 }));
    let sel = null;
    $('vgrid').onclick = e => {
      const b = e.target.closest('.vc'); if (!b || b.disabled) return;
      sfx('tap'); $('vgrid').querySelectorAll('.vc').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      sel = [+b.dataset.b, +b.dataset.p]; $('voteBtn').disabled = false;
    };
    const vb = $('voteBtn');
    vb.onclick = () => { if (!sel || vb.disabled) return; sfx('good'); voted(true); Vt.vote(sel[0], sel[1]); };
    const voted = on => { vb.disabled = on || !sel; if (on) { vb.textContent = '✅ 투표 완료'; $('vgrid').querySelectorAll('.vc').forEach(x => { x.disabled = true; }); } };
    if (Vt.voter < 0 || Vt.disabled) vb.hidden = true;
    return { voted, status: s => { const nt = $('vnote'); if (nt) nt.textContent = s; } };
  }

  // ── 결과 ─────────────────────────────────────────────────
  const medal = i => ['🥇', '🥈', '🥉'][i] || String(i + 1);
  // Rs = { books, names, T, me }  → 화면 + 아래 단추 자리(#resActs) 비워 둠
  function showResult(ses, Rs) {
    destroyCur(); stopTimer(); scrCls();
    const T = Rs.T, n = Rs.names.length;
    setBar('🏆 결과', T.total ? `${T.total}표` : '');
    const order = Rs.names.map((nm, i) => ({ nm, i, c: T.byPlayer[i] })).sort((a, b) => b.c - a.c || a.i - b.i);
    const win = T.top.slice(0, 3).map((t, k) => {
      const pg = Rs.books[t.b][t.p], src = t.p ? (Rs.books[t.b][t.p - 1] || {}).t : '';
      return `<div class="winc"><canvas data-w="${k}"></canvas><div class="cap">🏆 ${esc(Rs.names[t.by])} · ${t.votes}표<small>${src ? '“' + esc(src) + '” 를 그렸어요' : ''}</small></div></div>`;
    }).join('');
    scr().innerHTML = `<div class="task"><small>🏆 오늘의 그림</small><b class="sm">${T.winners.length ? T.winners.map(w => esc(Rs.names[w])).join(', ') + ' 님!' : '아무도 투표하지 않았어요 😿'}</b></div>
      <div class="scroll"><div class="res">
        ${win}
        <div class="rks">${order.map((r, k) => `<div class="rkrow${T.winners.includes(r.i) ? ' win' : ''}${r.i === Rs.me ? ' me' : ''}"><span>${T.max && r.c === T.max ? '🏆' : medal(k)}</span><span class="nm">${esc(r.nm)}</span><i>${r.c}표</i></div>`).join('')}</div>
        <div class="chips">${Rs.names.map((nm, i) => `<button class="btn" data-sv="${i}" style="padding:7px 11px;font-size:13px">📷 ${esc(nm)}의 공책</button>`).join('')}</div>
      </div></div>
      <div class="acts" id="resActs"></div>`;
    scr().querySelectorAll('canvas[data-w]').forEach(cv => { const t = T.top[+cv.dataset.w]; P.render(cv, Rs.books[t.b][t.p].s, { w: 600 }); });
    scr().querySelectorAll('[data-sv]').forEach(b => { b.onclick = () => saveBook(Rs.books, Rs.names, +b.dataset.sv); });
    if (T.winners.includes(Rs.me)) { sfx('win'); C.confetti(); } else if (Rs.me >= 0) sfx('lose'); else sfx('good');
    const top = T.top[0];
    if (top) { const w = scr().querySelector('.winc'); if (w) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = '📷 오늘의 그림 저장'; b.onclick = () => saveTop(Rs.books, Rs.names, top); w.appendChild(b); } }
  }
  async function saveBook(books, names, b) {
    try {
      const cv = P.notebookImage(books[b], names, `📒 ${names[b]}의 공책`);
      const r = await P.saveCanvas(cv, `benistration-${b + 1}.png`);
      if (r) C.toast('📷 ' + r, 2000);
      return cv;
    } catch (e) { console.warn(e); C.toast('이미지를 못 만들었어요'); }
  }
  async function saveTop(books, names, t) {
    try {
      const pg = books[t.b][t.p], src = t.p ? (books[t.b][t.p - 1] || {}).t : '';
      const r = await P.saveCanvas(P.singleImage(pg.s, `${names[t.by]}${src ? ' · “' + src + '”' : ''}`), 'benistration-best.png');
      if (r) C.toast('📷 ' + r, 2000);
    } catch (e) { console.warn(e); C.toast('이미지를 못 만들었어요'); }
  }

  // ═════════════════════════════════════════════════════════
  // 한 기기에서 여럿
  // ═════════════════════════════════════════════════════════
  function uniqNames(arr) {
    const seen = {};
    return arr.map(nm => { nm = (nm || '').trim() || '이름없음'; const c = seen[nm] = (seen[nm] || 0) + 1; return c > 1 ? nm + ' ' + '②③④⑤⑥⑦⑧'[c - 2] : nm; });
  }
  function startHot(o) {
    o = o || {};
    if (!lPick) return C.toast('한 기기 모듈을 불러오지 못했어요');
    if (o.names) lPick.set(o.names.map(name => ({ kind: 'human', name })));
    if (!lPick.valid) return C.toast('3~8명의 이름을 적어 주세요');
    const names = uniqNames(lPick.seats.map(s => s.name));
    const cfg = { draw: opt.draw, guess: opt.guess, pick: opt.pick };
    if (SES) SES.dispose();
    const ses = SES = newSession({ mode: 'hot' });
    ses.names = names; ses.hotCfg = cfg;
    show('play');
    runHot(ses).catch(e => { if (!(e instanceof Cancel)) { console.error(e); C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); } });
  }
  // 가림막: 뒤로가기가 숨겨 버려도 다시 띄움 (앞사람 화면이 비치지 않게)
  async function hotCover(ses, o) {
    let settled = false;
    const p = HotSeat.cover(o).then(() => { settled = true; });
    const iv = setInterval(() => { const el = document.querySelector('.hs-cover'); if (!settled && el && el.hidden && ses.alive) el.hidden = false; }, 200);
    try { await p; } finally { clearInterval(iv); }
    chk(ses);
  }
  const ask = (ses, fn) => new Promise((res, rej) => { ses.wake = () => rej(new Cancel()); fn(res); });
  const FACES = ['😺', '😸', '😻', '🐱', '😼', '🙀', '😽', '😹'];
  async function runHot(ses) {
    const names = ses.names, n = names.length, cfg = ses.hotCfg;
    const G = ses.G = D.create(n, cfg);
    ses.hot = { ph: 'step', step: 0, p: 0 };
    for (let step = 0; step < n; step++) {
      for (let p = 0; p < n; p++) {
        ses.hot = { ph: 'step', step, p };
        const task = D.taskFor(G, p), k = task.kind;
        setBar(KIND_BAR[k], `${step + 1}/${n}단계 · ${names[p]}`);
        if (!(step === 0 && p === 0)) await hotCover(ses, { name: names[p], emoji: FACES[p % FACES.length], text: `${names[p]} 님 차례예요`, sub: k === 'p' ? '공책에 제시어를 적어요' : k === 'd' ? '받은 공책에 쓰인 말을 그려요' : '받은 공책의 그림을 보고 글을 적어요', button: '✏️ 시작하기' });
        const dur = secs(k === 'd' ? cfg.draw : cfg.guess);
        const payload = await ask(ses, res => showWork(ses, { kind: k, step, who: names[p], cfg, dur, text: task.src && task.src.t, enc: task.src && task.src.s, onSubmit: res }));
        chk(ses);
        D.submit(G, p, payload, Wd.one());
      }
      D.advance(G, () => Wd.one());
    }
    // 공개
    let at = { b: 0, p: 1 };
    ses.hot = { ph: 'reveal', step: n, p: 0 };
    await hotCover(ses, { name: '모두', emoji: '📒', text: '공책을 공개해요!', sub: '모두 화면을 볼 수 있게 모여 주세요', button: '📒 공개 시작' });
    await ask(ses, res => {
      const draw = () => showReveal(ses, { books: G.books, names, b: at.b, p: at.p, ctl: true, onNav: dir => {
        const len = G.books[at.b].length;
        if (dir > 0) { const nx = D.revealNext(n, len, at.b, at.p); if (!nx) return res(); at = nx; } else at = D.revealPrev(n, G.books[at.b].length, at.b, at.p);
        draw();
      } });
      draw();
    });
    chk(ses);
    // 투표 (한 사람씩 몰래)
    ses.hot = { ph: 'vote', step: n, p: 0 };
    if (D.drawings(G.books).some(d => !d.blank)) {
      for (let p = 0; p < n; p++) {
        ses.hot = { ph: 'vote', step: n, p };
        if (!D.votable(G.books, p).length) continue;
        await hotCover(ses, { name: names[p], emoji: FACES[p % FACES.length], text: `${names[p]} 님, 투표해요`, sub: '마음에 드는 그림을 몰래 골라요', button: '🗳️ 투표하러 가기' });
        const pick = await ask(ses, res => showVote(ses, { books: G.books, names, voter: p, who: names[p], vote: (b, pg) => res([b, pg]) }));
        chk(ses);
        D.vote(G, p, pick[0], pick[1]);
      }
    }
    // 결과
    ses.hot = { ph: 'result', step: n, p: 0 };
    const T = D.tally(G.books, G.votes, n);
    ses.T = T;
    showResult(ses, { books: G.books, names, T, me: -1 });
    $('resActs').innerHTML = `<button class="btn primary big" id="again">🔁 같은 사람들로 한 판 더</button><button class="btn" id="toMenu">메뉴로</button>`;
    $('again').onclick = () => { sfx('pop'); startHot(); };
    $('toMenu').onclick = () => goHome();
  }

  // ═════════════════════════════════════════════════════════
  // 친구랑
  // ═════════════════════════════════════════════════════════
  function openFriend() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }
  function lobbyRender(el, cfg, canEdit, update) {
    const c = { ...DEF, ...(cfg || {}) };
    el.innerHTML = `<div class="optrows" style="background:rgba(0,0,0,.2);border:1px solid rgba(255,200,120,.18);border-radius:14px;padding:10px;display:grid;gap:8px">
      <div class="optrow"><span class="small" style="min-width:74px">그리기 시간</span><div class="seg" data-s="draw"></div></div>
      <div class="optrow"><span class="small" style="min-width:74px">맞히기 시간</span><div class="seg" data-s="guess"></div></div>
      <div class="optrow"><span class="small" style="min-width:74px">제시어</span><div class="seg" data-s="pick"></div></div>
    </div>`;
    const up = p => { if (canEdit && update) update(p); };
    segBtns(el.querySelector('[data-s="draw"]'), DRAWS, c.draw, v => up({ draw: +v }), canEdit);
    segBtns(el.querySelector('[data-s="guess"]'), GUESSES, c.guess, v => up({ guess: +v }), canEdit);
    segBtns(el.querySelector('[data-s="pick"]'), PICKS, c.pick, v => up({ pick: v }), canEdit);
  }
  function friendOpts() {
    return {
      game: 'draw', title: '베니스트레이션', max: 8,
      get min() { return QA_MIN || 3; },
      describe: n => {
        const need = QA_MIN || 3;
        if (n < need) return { text: `${need}명부터 할 수 있어요 (지금 ${n}명)`, ok: false };
        return `${n}명 → 공책 ${n}권 · ${n}단계 (그림은 공책마다 ${D.drawsPerBook(n)}장)`;
      },
      settings: { defaults: { ...DEF, draw: opt.draw, guess: opt.guess, pick: opt.pick }, label: c => `그리기 ${(c && c.draw) || 60}초 · ${pickLabel(c && c.pick)}`, render: lobbyRender },
      onStart: ctx => startOnline(ctx),
      onLobby: () => { if (SES) SES.dispose(); SES = null; show('home'); drawMenu(); },
      onLeave: why => { goHome(); if (why) C.toast(why, 2600); },
    };
  }
  function startOnline({ net, role, cfg }) {
    if (SES) SES.dispose();
    const ses = SES = newSession({ mode: 'online', net, role, uid: net.uid });
    show('play'); setBar('베니스트레이션', '연결하는 중'); scrCls();
    scr().innerHTML = `<div class="waitbox"><div class="paw">🐱</div><h2>${role === 'host' ? '공책을 준비해요' : '방장에게 공책을 받는 중'}</h2></div>`;
    ses.offs.push(net.on('players', () => onPlayers(ses)));
    if (role === 'host') hostStart(ses, cfg);
    else {
      ses.offs.push(net.on('msg', m => handle(ses, m)));
      const hi = () => { if (SES === ses && !ses.V) net.send({ t: 'hi' }, true); };      // 방장에게 지금 판을 받음 (처음이든, 나갔다 다시 들어왔든 같은 길)
      hi(); ses.hiT = setInterval(hi, 1500);
    }
  }

  // ── 방장 ─────────────────────────────────────────────────
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 방장이 보내는 길 (자기 자신에게도 똑같이 handle)
  function bc(ses, m) { ses.net.broadcast(m, true); handle(ses, m); }
  function to(ses, uid, m) { if (uid === ses.uid) handle(ses, m); else ses.net.send(uid, m, true); }

  function hostStart(ses, cfg) {
    const net = ses.net;
    const H = ses.H = { G: null, g: 0, order: [], names: [], gone: new Set(), cfg: { ...DEF, ...(cfg || {}) }, phase: 'step', dur: 0, t0: 0, tmo: 0, vTmo: 0, vEnd: 0, rv: { b: 0, p: 1 } };
    ses.offs.push(net.on('msg', (uid, m) => hostMsg(ses, uid, m)));
    ses.offs.push(net.on('leave', uid => hostLeave(ses, uid)));
    ses.offs.push(net.on('join', uid => hostJoin(ses, uid)));
    hostNewGame(ses);
  }
  function seatCandidates(ses) {
    const pl = ses.net.players || {}, H = ses.H;
    const present = Object.keys(pl).filter(u => !(pl[u] && pl[u].watch)).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    if (!H.g) return present;
    // 다음 판: 앞 판에 앉았던 사람 중 아직 있는 사람 + 구경하다 '낄래요' 한 사람
    return present.filter(u => H.order.includes(u) || ses.pick[u]);
  }
  function hostNewGame(ses) {
    const H = ses.H, need = QA_MIN || 3;
    const cand = seatCandidates(ses);
    if (cand.length < need) { C.toast(`${need}명부터 할 수 있어요`, 2400); if (window.ArenaUI && ArenaUI.net === ses.net) ArenaUI.toLobby(); return; }
    clearTimeout(H.tmo); clearTimeout(H.vTmo);
    const pl = ses.net.players || {};
    const order = shuffle(cand.slice());
    H.g++; H.order = order; H.names = uniqNames(order.map(u => (pl[u] && pl[u].name) || '친구'));
    H.gone = new Set(); H.phase = 'step';
    H.G = ses.G = D.create(order.length, { draw: H.cfg.draw, guess: H.cfg.guess, pick: H.cfg.pick });
    ses.rdy = new Set(); ses.pick = {};
    bc(ses, goMsg(ses, null));
    hostBeginStep(ses);
  }
  // 지금 상태 요약 (uid 가 있으면 그 사람 몫 표시도). 새 판 시작·다시 들어온 사람에게 같은 모양으로
  function goMsg(ses, uid) {
    const H = ses.H, G = H.G, p = uid ? H.order.indexOf(uid) : -1;
    const rem = H.phase === 'vote' ? Math.max(0, (H.vEnd - Date.now()) / 1000) : Math.max(0, H.dur - (Date.now() - H.t0) / 1000);
    return { t: 'go', g: H.g, order: H.order, names: H.names, cfg: H.cfg, ph: H.phase, s: G.step, dur: H.dur, rem: Math.round(rem * 10) / 10,
      done: G.cur.map((x, i) => (x ? i : -1)).filter(i => i >= 0), gone: [...H.gone], sub: p >= 0 && !!G.cur[p], vp: Object.keys(G.votes).map(Number) };
  }
  function stepDur(H, G) { const k = D.kindOf(G.step); return secs(k === 'd' ? H.cfg.draw : H.cfg.guess); }
  function hostBeginStep(ses) {
    const H = ses.H, G = H.G;
    H.dur = stepDur(H, G); H.t0 = Date.now(); H.phase = 'step';
    bc(ses, { t: 'step', g: H.g, s: G.step, dur: H.dur, gone: [...H.gone] });
    for (let p = 0; p < G.n; p++) {
      if (H.gone.has(p)) D.fill(G, p, Wd.one());
      else sendTask(ses, p);
    }
    clearTimeout(H.tmo);
    const arm = () => { H.tmo = setTimeout(() => { if (!ses.alive) return; if (PAUSED) return arm(); hostTimeUp(ses); }, (H.dur + GRACE) * 1000); };
    arm();
    hostProg(ses);
    hostCheckDone(ses);
  }
  function sendTask(ses, p) {
    const H = ses.H, G = H.G, t = D.taskFor(G, p);
    to(ses, H.order[p], { t: 'task', g: H.g, s: G.step, k: t.kind, b: t.book, src: t.src });
  }
  function hostProg(ses) {
    const H = ses.H, G = H.G;
    bc(ses, { t: 'prog', g: H.g, s: G.step, done: G.cur.map((x, i) => (x ? i : -1)).filter(i => i >= 0), gone: [...H.gone] });
  }
  function hostCheckDone(ses) {
    const H = ses.H; if (H.phase !== 'step') return;
    if (D.allIn(H.G)) hostAdvance(ses);
  }
  function hostTimeUp(ses) {
    const H = ses.H, G = H.G; if (H.phase !== 'step') return;
    for (const p of D.missing(G)) D.fill(G, p, Wd.one());
    hostProg(ses); hostAdvance(ses);
  }
  function hostAdvance(ses) {
    const H = ses.H, G = H.G;
    clearTimeout(H.tmo);
    D.advance(G, () => Wd.one());
    if (G.phase === 'reveal') hostStartReveal(ses); else hostBeginStep(ses);
  }
  function hostStartReveal(ses) {
    const H = ses.H, G = H.G;
    H.phase = 'reveal'; H.rv = { b: 0, p: 1 };
    for (let b = 0; b < G.n; b++) bc(ses, { t: 'bk', g: H.g, b, pg: G.books[b] });
    bc(ses, { t: 'rv', g: H.g, b: 0, p: 1 });
  }
  function hostRvNav(ses, dir) {
    const H = ses.H, G = H.G; if (H.phase !== 'reveal') return;
    const n = G.n, len = G.books[H.rv.b].length;
    if (dir > 0) {
      const nx = D.revealNext(n, len, H.rv.b, H.rv.p);
      if (!nx) return hostStartVote(ses);
      H.rv = nx;
    } else H.rv = D.revealPrev(n, len, H.rv.b, H.rv.p);
    bc(ses, { t: 'rv', g: H.g, b: H.rv.b, p: H.rv.p });
  }
  function hostStartVote(ses) {
    const H = ses.H, G = H.G;
    if (!D.drawings(G.books).some(d => !d.blank)) return hostFinishVote(ses);
    H.phase = 'vote'; H.vEnd = Date.now() + secs(VOTE_SEC) * 1000;
    bc(ses, { t: 'vote', g: H.g, dur: secs(VOTE_SEC), vp: [] });
    clearTimeout(H.vTmo);
    const arm = () => { H.vTmo = setTimeout(() => { if (!ses.alive) return; if (PAUSED) return arm(); hostFinishVote(ses); }, (secs(VOTE_SEC) + GRACE) * 1000); };
    arm();
    hostCheckVote(ses);
  }
  function hostCheckVote(ses) {
    const H = ses.H, G = H.G; if (H.phase !== 'vote') return;
    const need = H.order.map((_, p) => p).filter(p => !H.gone.has(p) && D.votable(G.books, p).length);
    if (need.every(p => G.votes[p])) hostFinishVote(ses);
  }
  function hostFinishVote(ses) {
    const H = ses.H, G = H.G; if (H.phase === 'result') return;
    clearTimeout(H.vTmo); H.phase = 'result';
    bc(ses, { t: 'res', g: H.g, votes: G.votes });
  }
  function hostMsg(ses, uid, m) {
    const H = ses.H; if (!H || !m || typeof m !== 'object') return;
    if (m.t === 'hi') return hostSync(ses, uid);
    if (m.g !== H.g) return;
    const p = H.order.indexOf(uid), G = H.G;
    if (m.t === 'sub') {
      if (p < 0 || H.phase !== 'step' || m.s !== G.step) return;
      const k = D.kindOf(G.step);
      if (D.submit(G, p, k === 'd' ? { s: JSON.stringify(m.e || []).length > D.MAX_RECV ? [] : m.e } : { t: m.x }, Wd.one())) { hostProg(ses); hostCheckDone(ses); }
    } else if (m.t === 'v') {
      if (p < 0 || H.phase !== 'vote') return;
      if (D.vote(G, p, m.b | 0, m.p | 0)) { bc(ses, { t: 'vp', g: H.g, done: Object.keys(G.votes).map(Number) }); hostCheckVote(ses); }
    } else if (m.t === 'rdy') {
      if (H.phase !== 'result') return;
      ses.rdy.add(uid);
      if (p < 0) ses.pick[uid] = true;
      bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick });
    }
  }
  // 방에 막 들어온(또는 다시 들어온) 사람에게 지금 상태를 처음부터 다시
  function hostSync(ses, uid) {
    const H = ses.H, G = H.G; if (!G) return;
    const p = H.order.indexOf(uid);
    to(ses, uid, goMsg(ses, uid));
    if (H.phase === 'step') { if (p >= 0 && !G.cur[p] && !H.gone.has(p)) sendTask(ses, p); return; }
    for (let b = 0; b < G.n; b++) to(ses, uid, { t: 'bk', g: H.g, b, pg: G.books[b] });
    if (H.phase === 'reveal') to(ses, uid, { t: 'rv', g: H.g, b: H.rv.b, p: H.rv.p });
    else if (H.phase === 'vote') { to(ses, uid, { t: 'vote', g: H.g, dur: Math.max(1, Math.round((H.vEnd - Date.now()) / 1000)), vp: Object.keys(G.votes).map(Number) }); }
    else { to(ses, uid, { t: 'res', g: H.g, votes: G.votes }); to(ses, uid, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick }); }
  }
  function hostLeave(ses, uid) {
    const H = ses.H; if (!H || !H.G) return;
    const p = H.order.indexOf(uid);
    if (p < 0) { delete ses.pick[uid]; ses.rdy.delete(uid); if (H.phase === 'result') bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick }); return; }
    if (uid === ses.uid) return;
    H.gone.add(p);
    C.toast(`${H.names[p]} 님 연결이 끊겼어요. 그 칸은 빈 종이로 넘어가요`, 2800);
    if (H.phase === 'step') { D.fill(H.G, p, Wd.one()); hostProg(ses); hostCheckDone(ses); }
    else if (H.phase === 'vote') hostCheckVote(ses);
    else if (H.phase === 'result') { ses.rdy.delete(uid); bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick }); }
    else bc(ses, { t: 'prog', g: H.g, s: H.G.step, done: [], gone: [...H.gone] });
  }
  function hostJoin(ses, uid) {
    const H = ses.H; if (!H || !H.G) return;
    const p = H.order.indexOf(uid);
    if (p >= 0 && H.gone.has(p)) {
      H.gone.delete(p); C.toast(`${H.names[p]} 님이 돌아왔어요`, 2000);
      if (H.phase === 'step') hostProg(ses);
      hostSync(ses, uid);
    }
  }

  // ── 모두(방장 포함)가 받는 곳 ─────────────────────────────
  function handle(ses, m) {
    if (!m || typeof m !== 'object' || SES !== ses || !ses.alive) return;
    let V = ses.V;
    if (m.t === 'go') {
      if (!Array.isArray(m.order) || !Array.isArray(m.names)) return;
      const n = m.order.length;
      clearInterval(ses.hiT);
      if (V && V.g === m.g && V.ph === 'step' && m.ph === 'step' && V.step === (m.s | 0) && CUR && !CUR.done) {   // 같은 단계를 이미 하는 중에 또 온 안내 (처음에 두 번 오기도 함) — 그림 날리지 않게 낸 사람 목록만 갱신
        V.done = new Set(m.done || []); V.gone = new Set(m.gone || []); updateBarSub(ses); return;
      }
      ses.rdy = new Set(); ses.pick = {};
      V = ses.V = { g: m.g, n, order: m.order, names: m.names.map(x => String(x).slice(0, 16)), me: m.order.indexOf(ses.uid), cfg: m.cfg || DEF, ph: m.ph, step: m.s | 0, dur: m.dur || 0,
        end: Date.now() + (m.rem || 0) * 1000, task: null, sent: !!m.sub, done: new Set(m.done || []), gone: new Set(m.gone || []), books: new Array(n).fill(null), rv: null, vp: new Set(m.vp || []), T: null, votes: null, voteUi: null, myVote: null };
      destroyCur(); stopTimer();
      if (m.ph === 'step') renderStep(ses);
      else { setBar('베니스트레이션', '공책을 받는 중'); scrCls(); scr().innerHTML = `<div class="waitbox"><div class="paw">🐱</div><h2>공책을 받는 중…</h2></div>`; }
      return;
    }
    if (!V || m.g !== V.g) return;
    switch (m.t) {
      case 'step':
        V.ph = 'step'; V.step = m.s | 0; V.dur = m.dur || 0; V.end = Date.now() + V.dur * 1000; V.done = new Set(); V.gone = new Set(m.gone || []); V.task = null; V.sent = false;
        renderStep(ses); break;
      case 'task':
        if (V.ph !== 'step' || (m.s | 0) !== V.step) return;
        if (V.task && (V.task.s | 0) === (m.s | 0) && CUR && !CUR.done) return;      // 이미 그 일을 하는 중
        V.task = m; V.sent = false; renderStep(ses); break;
      case 'prog':
        if (V.ph !== 'step') return;
        V.done = new Set(m.done || []); V.gone = new Set(m.gone || []); updateProg(ses); break;
      case 'bk': {
        if (!Number.isInteger(m.b) || m.b < 0 || m.b >= V.n || !Array.isArray(m.pg)) return;
        V.books[m.b] = m.pg.slice(0, V.n).map(pg => (pg && pg.k === 'd' ? { k: 'd', by: pg.by | 0, s: D.clean(pg.s) } : { k: 't', by: (pg && pg.by) | 0, t: D.cleanText(pg && pg.t, 24) }));
        break;
      }
      case 'rv':
        if (!V.books.every(Boolean)) return;
        V.ph = 'reveal'; V.rv = { b: m.b | 0, p: m.p | 0 };
        renderReveal(ses); break;
      case 'vote':
        if (!V.books.every(Boolean)) return;
        V.ph = 'vote'; V.vp = new Set(m.vp || []); V.end = Date.now() + (m.dur || VOTE_SEC) * 1000; V.myVote = null;
        renderVote(ses); break;
      case 'vp':
        V.vp = new Set(m.done || []); updateVoteProg(ses); break;
      case 'res':
        if (!V.books.every(Boolean)) return;
        { const live = V.ph !== 'result';                                   // 끝나는 걸 본 판만 랭킹에 (끝난 판에 다시 들어온 건 이미 앞 화면이 보냈음)
          V.ph = 'result'; V.votes = m.votes || {}; V.T = D.tally(V.books, V.votes, V.n);
          renderResult(ses, live); }
        break;
      case 'rdyl':
        ses.rdy = new Set(m.uids || []); ses.pick = m.pick || {}; drawResultActs(ses); break;
    }
  }

  // 단계 화면: 내 일이 있으면 일 화면, 냈거나 구경이면 기다림
  function renderStep(ses) {
    const V = ses.V;
    setBar(KIND_BAR[D.kindOf(V.step)], `${V.step + 1}/${V.n}단계`);
    if (V.me >= 0 && V.task && !V.sent) {
      const t = V.task, k = t.k;
      const dur = Math.max(1, Math.round((V.end - Date.now()) / 1000));
      showWork(ses, { kind: k, step: V.step, cfg: V.cfg, dur, text: t.src && t.src.t, enc: t.src && D.clean(t.src.s),
        onSubmit: payload => submitOnline(ses, payload) });
      updateBarSub(ses);
    } else {
      stopTimer(); showWait(ses);
      if (V.me >= 0 && !V.sent) { /* 일이 아직 안 옴 — 곧 task 가 옴 */ }
      else if (V.end > Date.now() && V.me >= 0) startTimer(V.end - Date.now(), null);       // 남은 시간 표시만
    }
  }
  function updateBarSub(ses) { const V = ses.V; if (V && V.ph === 'step') $('sub').textContent = `${V.step + 1}/${V.n}단계 · 제출 ${V.done.size}/${V.n}`; }
  function submitOnline(ses, payload) {
    const V = ses.V; if (!V || V.sent) return;
    V.sent = true;
    const k = D.kindOf(V.step), m = { t: 'sub', g: V.g, s: V.step };
    if (k === 'd') m.e = payload.s || []; else m.x = payload.t || '';
    if (ses.role === 'host') hostMsg(ses, ses.uid, m); else ses.net.send(m, true);
    if (SES === ses && ses.V === V && V.ph === 'step') { showWait(ses); if (V.end > Date.now() + 500) startTimer(V.end - Date.now(), null); }   // 기다리는 동안에도 남은 시간 보임
  }
  function renderReveal(ses) {
    const V = ses.V, host = ses.role === 'host';
    showReveal(ses, { books: V.books, names: V.names, b: V.rv.b, p: V.rv.p, ctl: host, onNav: dir => hostRvNav(ses, dir) });
  }
  function renderVote(ses) {
    const V = ses.V;
    const vt = showVote(ses, { books: V.books, names: V.names, voter: V.me, disabled: V.me < 0, vote: (b, p) => {
      V.myVote = [b, p];
      if (ses.role === 'host') hostMsg(ses, ses.uid, { t: 'v', g: V.g, b, p }); else ses.net.send({ t: 'v', g: V.g, b, p }, true);
      updateVoteProg(ses);
    } });
    V.voteUi = vt;
    if (V.me >= 0 && V.vp.has(V.me)) { V.myVote = V.myVote || [-1, -1]; vt.voted(true); }     // 다시 들어왔는데 이미 투표한 사람
    startTimer(Math.max(1000, V.end - Date.now()), () => { /* 시간이 다 되면 방장이 마감 */ });
    updateVoteProg(ses);
  }
  function updateVoteProg(ses) {
    const V = ses.V; if (!V || V.ph !== 'vote' || !V.voteUi) return;
    const k = V.vp.size, need = V.n;
    V.voteUi.status(V.myVote ? `투표했어요 · 기다리는 중 (${k}/${need}명)` : V.me < 0 ? `👀 구경 중 · ${k}/${need}명 투표` : `내 그림은 못 골라요 · ${k}/${need}명 투표`);
    setBar('🗳️ 투표', `${k}/${need}명`);
  }
  function renderResult(ses, live) {
    const V = ses.V;
    stopTimer();
    showResult(ses, { books: V.books, names: V.names, T: V.T, me: V.me });
    drawResultActs(ses);
    if (live) rankReport(ses);
  }
  // 🏆 랭킹: 친구랑 판만, 각자 자기 기기에서 한 번. 가장 많이 받은 사람(동점 포함)이면 w
  function rankReport(ses) {
    const V = ses.V;
    try {
      if (ses.mode !== 'online' || !V || V.me < 0 || ses.rankG === V.g) return;
      ses.rankG = V.g;
      const R = D.rankInfo(V.T, V.me); if (!R) return;
      const rec = { mode: 'friend', res: R.res, beat: R.beat, score: R.score, opp: R.opp.map(o => ({ uid: V.order[o.idx], res: o.res })) };
      QA.rankLog.push(rec);
      if (window.GRank) GRank.result(SITE, rec);
    } catch (e) { console.warn('[rank]', e); }
  }
  function onPlayers(ses) {
    if (SES !== ses || !ses.V) return;
    if (ses.V.ph === 'result') drawResultActs(ses);
  }

  // 결과 화면 아래 단추 (다음 판 준비)
  function drawResultActs(ses) {
    const box = $('resActs'); if (!box || !ses.V || ses.V.ph !== 'result' || ses.mode !== 'online') return;
    const V = ses.V, pl = ses.net.players || {}, host = ses.role === 'host', me = ses.uid;
    const seatUids = V.order.filter(u => pl[u]);                               // 아직 방에 있는 앉았던 사람
    const wait = seatUids.filter(u => u !== me);
    const joiners = Object.keys(pl).filter(u => !V.order.includes(u) && !(pl[u] && pl[u].watch) && ses.pick[u]);
    const spec = V.me < 0;
    const chips = V.order.map(u => {
      const nm = esc((pl[u] && pl[u].name) || V.names[V.order.indexOf(u)]);
      if (u === me) return `<span class="ok">${host ? '👑' : '✅'} ${nm}</span>`;
      if (!pl[u]) return `<span>🔌 ${nm}</span>`;
      return `<span class="${ses.rdy.has(u) ? 'ok' : ''}">${ses.rdy.has(u) ? '✅' : '⏳'} ${nm}</span>`;
    }).concat(joiners.map(u => `<span class="ok">🙋 ${esc((pl[u] && pl[u].name) || '친구')} (다음 판부터)</span>`));
    if (host) {
      const k = wait.filter(u => ses.rdy.has(u)).length, all = k === wait.length;
      const total = seatUids.length + joiners.length, need = QA_MIN || 3, okN = total >= need;
      box.innerHTML = `<div class="rdy">${chips.join('')}</div>
        <button class="btn primary big" id="nextBtn" ${all && okN ? '' : 'disabled'}>${okN ? (all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${wait.length})`) : `다음 판은 ${need}명부터 (지금 ${total}명)`}</button>
        <div class="two">${!all && okN ? '<button class="btn" id="forceBtn">안 기다리고 시작</button>' : ''}<button class="btn" id="lobbyBtn">대기실로</button></div>`;
      const nb = $('nextBtn'); if (nb) nb.onclick = () => { if (!nb.disabled) { sfx('go'); hostNewGame(ses); } };
      const fb = $('forceBtn'); if (fb) fb.onclick = () => { sfx('go'); hostNewGame(ses); };
      $('lobbyBtn').onclick = () => { try { ses.net.chat('🔄 대기실로 돌아가요'); } catch (e) {} if (window.ArenaUI) ArenaUI.toLobby(); };
    } else {
      const on = ses.rdy.has(me) || (spec && ses.pick[me]);
      box.innerHTML = `<div class="rdy">${chips.join('')}</div>
        <button class="btn primary big" id="rdyBtn" ${on ? 'disabled' : ''}>${on ? '✅ 준비 완료 · 방장을 기다려요' : spec ? '✋ 다음 판에 낄래요' : '✋ 준비'}</button>
        <button class="btn" id="leaveBtn">나가기</button>`;
      $('rdyBtn').onclick = () => { if (ses.rdy.has(me)) return; ses.rdy.add(me); if (spec) ses.pick[me] = true; ses.net.send({ t: 'rdy', g: V.g }, true); drawResultActs(ses); };
      $('leaveBtn').onclick = () => { if (window.ArenaUI) ArenaUI.leave(); };
    }
  }

  // ── 나가기 · 하는 법 · 소리 ────────────────────────────────
  C.backGuard($('backBtn'), () => {
    sfx('tap');
    if (SES && SES.mode === 'online' && window.ArenaUI && ArenaUI.net) { ArenaUI.leave(); return; }
    goHome();
  });
  $('ruleBtn').onclick = () => showRules();
  C.sfx.button($('sndBtn'));

  // ── 시험용 손잡이 ──────────────────────────────────────────
  const QA = { rankLog: [] };
  const humanPhase = () => {
    const ses = SES; if (!ses) return 'none';
    if (ses.mode === 'hot') return ses.hot ? ses.hot.ph : 'none';
    return ses.V ? ses.V.ph : 'none';
  };
  window.__draw = {
    get ses() { return SES; },
    get mode() { return SES ? SES.mode : null; },
    get V() { return SES && SES.V; },
    get G() { return SES && (SES.G || (SES.H && SES.H.G)); },
    get phase() { return humanPhase(); },
    get cur() { return CUR; },
    rankLog: QA.rankLog,
    fast(v = 1) { FAST = v ? 1 : 0; },
    pause(v = true) { PAUSED = !!v; },
    get paused() { return PAUSED; },
    setMin(n) { QA_MIN = n | 0; },                                  // 시험: 친구랑 최소 인원 (손님 하나로 시험)
    startHot(o) { o = o || {}; if (o.draw) opt.draw = o.draw; startHot(o); },
    scribble: n => { const cv = $('pad'); if (cv) scribble(cv, n || 3); return !!cv; },
    // 지금 화면에서 사람이 할 만한 걸 한 번 한다 (진짜 단추·입력을 누름). 했으면 true
    autoAct() {
      const ses = SES; if (!ses || PAUSED) return false;
      if (window.HotSeat && HotSeat.isOpen) { HotSeat.close(); return true; }
      if (CUR && !CUR.done) return CUR.qa();
      const nx = $('rvNext'); if (nx && !nx.disabled) { nx.click(); return true; }
      const vc = [...document.querySelectorAll('#vgrid .vc:not(:disabled)')];
      if (vc.length) { vc[Math.floor(Math.random() * vc.length)].click(); const vb = $('voteBtn'); if (vb && !vb.disabled) { vb.click(); return true; } }
      return false;
    },
    // 손님·방장 화면이 같은지 비교하는 무늬 (보이는 공통 정보만)
    fp() {
      const ses = SES; if (!ses) return null;
      if (ses.mode === 'hot') return JSON.stringify({ hot: ses.hot });
      const V = ses.V; if (!V) return null;
      const stp = V.ph === 'step';
      return JSON.stringify({ g: V.g, n: V.n, ph: V.ph, st: stp ? V.step : -1, done: stp ? [...V.done].sort() : [], rv: V.ph === 'reveal' ? V.rv : null, bk: V.books.map(b => (b ? b.length : -1)), vp: [...V.vp].sort(), res: V.T ? V.T.byPlayer : null });
    },
    probe() {
      const ses = SES; if (!ses) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
      if (ses.mode === 'hot') {
        const h = ses.hot || {};
        return { fp: [h.ph, h.step, h.p, window.HotSeat && HotSeat.isOpen ? 'cover' : '', CUR ? CUR.kind : ''].join('|'), over: h.ph === 'result' && !!$('again'), waiting: true, info: `${h.ph} · 단계 ${h.step} · ${h.p}번` };
      }
      const V = ses.V; if (!V) return { fp: 'none', over: false, waiting: false, info: '연결 중' };
      return { fp: window.__draw.fp(), over: V.ph === 'result', waiting: !!(CUR && !CUR.done), info: `${V.g}번째 판 · ${V.ph} · 단계 ${V.step}` };
    },
    exportTest() {                                                   // 이미지 만들기가 되는지 (저장은 안 함)
      const G = window.__draw.G; if (!G || G.phase === 'step') return null;
      const cv = P.notebookImage(G.books[0], SES.names || (SES.V && SES.V.names) || [], '시험');
      return { w: cv.width, h: cv.height, len: cv.toDataURL('image/png').length };
    },
  };

  // ── 시작 ─────────────────────────────────────────────────
  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
})();

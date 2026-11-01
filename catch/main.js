/* 베니캐치 — 메뉴 · 한 기기에서 여럿 · 친구랑 · 화면(제시어 고르기·그리기·맞히기·정답·결과) · 시험 손잡이
   규칙은 core.js(CatchCore), 그림판·제시어는 베니스트레이션 것 그대로(draw/pad.js·core.js·words.js)
   친구랑: 방장이 판의 주인 — 차례·시간·정답 판정·점수를 방장이 정해 모두에게 뿌림. 그리는 사람의 그림은 0.25초마다 방장을 거쳐 모두에게
     방장→: go(판 상태 통째로·다시 들어온 사람에게도) · turn · pick(그리는 사람에게 제시어 3개) · draw · word(그리는 사람·맞힌 사람에게 답) · pic · hint
            say(채팅·정답) · close(아까워요, 그 사람에게만) · hid(답이 든 채팅을 가림, 그 사람에게만) · rev(정답 공개) · end · prog(나간 사람) · rdyl
     손님→방장: hi · ch(제시어 고름) · pic · say · rdy
   한 기기: 그리는 사람만 가림막 뒤에서 제시어를 고르고, 다 같이 화면을 보며 말로 맞힘 → 맞힌 사람 이름을 눌러 점수 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const K = window.CatchCore, D = window.DrawCore, Wd = window.DrawWords, P = window.DrawPad, C = window.Cozy;
  const esc = C.esc;
  const sfx = (n, o) => C.sfx.play(n, o);
  const SITE = 'catch';
  try { if (window.GRank && GRank.NAMES) GRank.NAMES[SITE] = '베니캐치'; } catch (e) {}

  // ── 설정 (localStorage) ──────────────────────────────────
  const KEY = 'catch.';
  const st = (k, d) => C.store(KEY + k, d);
  const DEF = { sec: 80, rounds: 1 };
  const SECS = K.SECS.map(s => [s, s + '초']), RNDS = K.ROUNDS.map(r => [r, r + '바퀴']);
  const opt = { sec: st('sec', 80), rounds: st('rounds', 1) };
  if (!K.SECS.includes(opt.sec)) opt.sec = 80;
  if (!K.ROUNDS.includes(opt.rounds)) opt.rounds = 1;
  const saveOpt = k => C.save(KEY + k, opt[k]);

  // 시험용 손잡이 값
  let FAST = 0, PAUSED = false, QA_MIN = 0;
  const secs = n => (FAST ? Math.min(n, 4) : n);
  const GRACE = 1.5;                                                    // 방장이 고르기 시간 뒤에 더 기다리는 초

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick, canEdit = true) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}" ${canEdit ? '' : 'disabled'}>${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b || !canEdit) return; sfx('tap'); onPick(b.dataset.v); };
  }
  let lPick = null;
  function drawMenu() {
    $('tabLocal').setAttribute('aria-pressed', 'true');
    $('tabFriend').setAttribute('aria-pressed', 'false');
    if (!lPick && window.HotSeat) lPick = HotSeat.setup($('lSeats'), { game: 'catch', min: 2, max: 8, allowAI: false });
    segBtns($('secSeg'), SECS, opt.sec, v => { opt.sec = +v; saveOpt('sec'); drawMenu(); });
    segBtns($('rndSeg'), RNDS, opt.rounds, v => { opt.rounds = +v; saveOpt('rounds'); drawMenu(); });
  }
  $('tabLocal').onclick = () => { sfx('tap'); drawMenu(); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriend(); };
  $('startBtn').onclick = () => { sfx('pop'); startHot(); };
  $('rulesBtn').onclick = () => showRules();
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open(SITE); } catch (e) {} };

  function showRules() {
    sfx('tap');
    return C.modal({
      title: '📖 베니캐치 하는 법',
      html: `<div class="howto" style="text-align:left;font-size:14.5px;display:grid;gap:7px;padding:12px 14px">
        <div>🖍️ <b>그림 맞히기</b>예요. 2~8명이 차례로 한 번씩 그려요 (바퀴 수만큼).</div>
        <div>1️⃣ 그릴 사람은 <b>제시어 3개</b> 중 하나를 몰래 골라요 (${K.PICK_SEC}초 안에, 안 고르면 첫째)</div>
        <div>2️⃣ 그림이 그려지는 대로 모두의 화면에 바로 보여요. 나머지는 <b>채팅으로 맞혀요</b></div>
        <div>3️⃣ 시간이 지나면 위에 <b>힌트</b>가 나와요: 글자 수 → 초성(35%) → 첫 글자(70%)</div>
        <div>4️⃣ 먼저·빨리 맞힐수록 점수가 커요 (60·50·40… + 남은 시간). 그린 사람은 맞힌 사람마다 +20</div>
        <div>5️⃣ 한 글자만 틀리면 나에게만 '😮 아까워요!' 가 떠요. 이미 맞힌 사람이 답을 채팅에 쓰면 가려져요</div>
        <div>📺 <b>한 기기</b>: 화면 하나를 같이 봐요. 그리는 사람만 가림막 뒤에서 제시어를 보고, 나머지는 말로 외쳐요. 맞힌 사람 이름을 누르면 점수!</div></div>`,
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
    const ses = { cfg, mode: cfg.mode, alive: true, offs: [], ivs: [], G: null, H: null, V: null, net: cfg.net || null, role: cfg.role || null, uid: cfg.uid || '', rdy: new Set(), pick: {}, rankG: 0, hot: null };
    ses.every = (ms, fn) => { const id = setInterval(() => { if (ses.alive) fn(); }, ms); ses.ivs.push(id); return id; };
    ses.dispose = () => {
      ses.alive = false;
      clearInterval(ses.hiT);
      for (const id of ses.ivs.splice(0)) clearInterval(id);
      if (ses.H) { clearTimeout(ses.H.tmo); clearInterval(ses.H.tick); }
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
  function startTimer(ms, cb, onTick) {
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
        if (onTick) onTick((TM.end - now) / 1000);
      }
      if (TM.end - now <= 0) { const f = TM.cb; stopTimer(); if (f) f(); }
    };
    pill.hidden = false;
    TM.iv = setInterval(tick, 200); tick();
  }
  const timeLeft = () => (TM ? Math.max(0, (TM.end - Date.now()) / 1000) : 0);
  function setBar(lbl, sub) { $('lbl').textContent = lbl; $('sub').textContent = sub || ''; }
  const scr = () => $('scr');
  const scrCls = c => { scr().className = 'scr' + (c ? ' ' + c : ''); };
  const turnSub = (G, k) => `${K.roundOf(G, k)}/${G.cfg.rounds}바퀴 · ${k + 1}/${G.turns}번째`;
  const FACES = ['😺', '😸', '😻', '🐱', '😼', '🙀', '😽', '😹'];

  // ── 화면 조각 ─────────────────────────────────────────────
  let CUR = null;                                // 지금 떠 있는 화면 { kind, pad, qa() }
  function destroyCur() { if (CUR) { clearInterval(CUR.iv); if (CUR.pad) CUR.pad.lock(); } CUR = null; }
  const head = (small, big, cls) => `<div class="task"><small id="tSmall">${small}</small><b id="tBig" class="${cls || ''}">${big}</b></div>`;
  // 점수 줄. S = { names, scores, drawer, got:Set, gone:Set, me, tap(한 기기: 누를 수 있게) }
  function scoresHtml(S) {
    return S.names.map((nm, i) => {
      const dr = i === S.drawer, got = S.got.has(i), gone = S.gone && S.gone.has(i);
      const tag = S.tap && !dr && !got ? 'button' : 'span';
      return `<${tag} class="sc${dr ? ' dr' : ''}${got ? ' got' : ''}${gone ? ' gone' : ''}${i === S.me ? ' me' : ''}" data-p="${i}">${dr ? '🖍️' : got ? '✅' : gone ? '🔌' : FACES[i % FACES.length]} ${esc(nm)} <i>${S.scores[i]}</i></${tag}>`;
    }).join('');
  }
  // 채팅 줄 (맨 아래가 최신)
  function lineHtml(l, names) {
    const who = l.p >= 0 ? names[l.p] : (l.n || '구경');
    if (l.kind === 'hit') return `<div class="ln hit">🎉 ${esc(who)} 님 정답! <b>+${l.pts}</b></div>`;
    if (l.kind === 'close') return `<div class="ln close">😮 아까워요! 「${esc(l.x)}」 한 글자 차이</div>`;
    if (l.kind === 'hide') return `<div class="ln sys">🤫 ${esc(who)} 님 채팅은 답이 들어 있어 가렸어요</div>`;
    if (l.kind === 'sys') return `<div class="ln sys">${esc(l.x)}</div>`;
    return `<div class="ln"><b>${esc(who)}</b>${esc(l.x)}</div>`;
  }
  function drawLog(log, names) {
    const el = $('clog'); if (!el) return;
    el.innerHTML = log.slice(-30).map(l => lineHtml(l, names)).join('') || '<div class="ln sys">채팅으로 답을 적어요</div>';
    el.scrollTop = el.scrollHeight;
  }

  // 제시어 고르기 (그리는 사람만): words = [{w, em, cat}]
  function showPick(o) {
    destroyCur(); scrCls();
    const cur = CUR = { kind: 'pick', done: false };
    scr().innerHTML = `${head(esc(o.who ? o.who + ' 님 · ' : '') + '🖍️ 그릴 차례예요', '무엇을 그릴까요?', 'sm')}
      <div class="picks" id="picks">${o.words.map((w, i) => `<button class="pick" data-i="${i}"><span class="em">${w.em}</span>${esc(w.w)}<small>${esc(w.cat)}</small></button>`).join('')}</div>
      <p class="note" style="text-align:center;margin:0">누르면 바로 그리기 시작! ${o.hot ? '다른 사람은 화면을 보지 마세요 🙈' : ''}</p>`;
    const go = i => { if (cur.done || CUR !== cur) return; cur.done = true; stopTimer(); sfx('pop'); o.onPick(i); };
    $('picks').onclick = e => { const b = e.target.closest('.pick'); if (b) go(+b.dataset.i); };
    cur.qa = () => { $('picks').querySelector('.pick').click(); return true; };
    if (o.dur) startTimer(o.dur * 1000, () => go(0));
  }

  // 그리는 화면. o = { top, small, words, log, S, hot, onPic(enc), onAward(p), onSkip(), peekWord }
  function showDrawer(o) {
    destroyCur(); scrCls('s-draw drawer');
    const cur = CUR = { kind: o.hot ? 'hotdraw' : 'draw', pad: null };
    scr().innerHTML = `${head(o.small, esc(o.top), o.hot ? 'hint' : (Array.from(o.top).length > 9 ? 'sm' : ''))}
      <div class="padwrap"><canvas class="pad" id="pad" aria-label="그림판"></canvas></div>
      <div class="pal" id="pal">${D.COLORS.map((c, i) => `<button type="button" data-c="${i}" style="--c:${c.hex}" aria-label="${c.name}" aria-pressed="${i === 0}"></button>`).join('')}</div>
      <div class="tl" id="tl">
        ${[0, 1, 2].map(i => `<button type="button" data-s="${i}" aria-label="붓 ${i + 1}" aria-pressed="${i === 1}"><i class="dot" style="width:${[6, 12, 20][i]}px;height:${[6, 12, 20][i]}px"></i></button>`).join('')}
        <button type="button" id="erBtn" aria-label="지우개" aria-pressed="false">🧽</button>
        <button type="button" id="unBtn" aria-label="되돌리기" disabled>↩️</button>
        <button type="button" id="clBtn" aria-label="모두 지우기" disabled>🗑️</button>
      </div>
      ${o.hot ? `<div class="hotrow"><button class="btn peek" id="peekBtn">👀 꾹 눌러 제시어</button><button class="btn" id="skipBtn">⏭ 그만 그리기</button></div><p class="note tapnote">맞힌 사람 이름을 눌러요</p>` : `<div class="clog" id="clog"></div>`}
      <div class="scs" id="scs"></div>`;
    const cv = $('pad');
    const sync = () => { $('unBtn').disabled = !pad.strokes.length; $('clBtn').disabled = !pad.strokes.length; $('clBtn').classList.remove('armed'); };
    const pad = cur.pad = new P.Pad(cv, { onChange: sync, onLimit: () => C.toast('획이 너무 많아요. 되돌리거나 지워 주세요', 1800) });
    let clearAt = 0;
    const mark = () => {
      $('pal').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(!pad.eraser && +x.dataset.c === pad.color)));
      $('tl').querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.s === pad.size)));
      $('erBtn').setAttribute('aria-pressed', String(pad.eraser));
    };
    $('pal').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); pad.color = +b.dataset.c; pad.eraser = false; mark(); };
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
    // 그림 보내기: 바뀌었을 때만 0.25초마다 (지우기·되돌리기도 그대로 감)
    if (o.onPic) {
      let sig = '';
      cur.iv = setInterval(() => {
        if (CUR !== cur) return;
        const s = pad.strokes, l = s[s.length - 1], now = s.length + ':' + (l ? l.p.length : 0);
        if (now !== sig) { sig = now; o.onPic(pad.toEnc()); }
      }, 250);
    }
    if (o.hot) {
      const pk = $('peekBtn'), big = $('tBig'), hint = o.top;
      const on = e => { e.preventDefault(); big.textContent = o.peekWord; big.classList.remove('hint'); };
      const off = () => { big.textContent = cur.top || hint; big.classList.add('hint'); };
      pk.addEventListener('pointerdown', on); pk.addEventListener('pointerup', off); pk.addEventListener('pointerleave', off); pk.addEventListener('pointercancel', off);
      pk.addEventListener('contextmenu', e => e.preventDefault());
      $('skipBtn').onclick = () => { sfx('tap'); o.onSkip(); };
      $('scs').onclick = e => { const b = e.target.closest('button.sc'); if (!b) return; o.onAward(+b.dataset.p); };
    }
    cur.qa = () => {
      if (pad.strokes.length < 2) { scribble(cv, 2); return true; }
      if (o.hot) { const b = $('scs').querySelector('button.sc'); if (b) { b.click(); return true; } $('skipBtn').click(); return true; }
      return false;
    };
    drawScores(o.S);
    if (!o.hot) drawLog(o.log || [], o.S.names);
    return cur;
  }

  // 맞히는 화면. o = { top, small, log, S, pic, canChat, placeholder, onSay(text) }
  function showGuesser(o) {
    destroyCur(); scrCls('s-guess');
    const cur = CUR = { kind: 'guess' };
    scr().innerHTML = `${head(o.small, esc(o.top), o.topCls == null ? 'hint' : o.topCls)}
      <div class="padwrap"><canvas id="view" aria-label="친구의 그림"></canvas></div>
      <div class="clog" id="clog"></div>
      ${o.canChat ? `<form class="chatf" id="cf"><input class="fld" id="txt" maxlength="${K.MSG_MAX}" placeholder="${esc(o.placeholder || '답을 적어요')}" autocomplete="off" autocapitalize="off" enterkeyhint="send" aria-label="답"><button class="btn primary" id="sendBtn">보내기</button></form>` : ''}
      <div class="scs" id="scs"></div>`;
    P.render($('view'), o.pic || [], { w: 600, blank: false });
    drawLog(o.log || [], o.S.names);
    drawScores(o.S);
    if (o.canChat) {
      const inp = $('txt');
      $('cf').onsubmit = e => { e.preventDefault(); const t = K.cleanText(inp.value, K.MSG_MAX); if (!t) return; inp.value = ''; o.onSay(t); };
      cur.qa = () => { inp.value = o.qaWord ? o.qaWord() : ['고양이', '붕어빵', '우주선', '모르겠다', '감자'][Math.floor(Math.random() * 5)]; $('sendBtn').click(); return true; };
    } else cur.qa = () => false;
    return cur;
  }
  function drawPic(enc) { const v = $('view'); if (v) P.render(v, enc || [], { w: 600, blank: false }); }
  function drawScores(S) { const el = $('scs'); if (el && S) el.innerHTML = scoresHtml(S); }
  function setTop(small, big, cls) { const s = $('tSmall'), b = $('tBig'); if (s && small != null) s.innerHTML = small; if (b && big != null) { b.textContent = big; if (cls != null) b.className = cls; } }

  // 기다리는 화면
  function showWait(title, sub, S, log) {
    destroyCur(); scrCls();
    scr().innerHTML = `<div class="waitbox"><div class="paw">🖍️</div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${log ? '<div class="clog" id="clog"></div>' : ''}<div class="scs" id="scs"></div>`;
    if (S) drawScores(S);
    if (log && S) drawLog(log, S.names);
  }

  // 정답 공개. o = { w, drawerName, names, got, gain, e, next(단추 글), onNext }
  function showReveal(o) {
    destroyCur(); scrCls();
    const gains = o.names.map((nm, i) => ({ nm, i, g: o.gain[i] || 0 })).filter(r => r.g > 0).sort((a, b) => b.g - a.g);
    scr().innerHTML = `${head(`🖍️ ${esc(o.drawerName)} 님의 그림${o.skip ? ' · 넘어감' : ''}`, `정답은 「${esc(o.w)}」`, Array.from(o.w).length > 8 ? 'sm' : '')}
      <div class="padwrap"><canvas id="view"></canvas></div>
      <div class="gains">${gains.length ? gains.map(r => `<span class="sc${r.i === o.drawer ? ' dr' : ' got'}">${r.i === o.drawer ? '🖍️' : '🎉'} ${esc(r.nm)} <i>+${r.g}</i></span>`).join('') : '<span class="sc">😿 아무도 못 맞혔어요</span>'}</div>
      ${o.next ? `<div class="act"><button class="btn primary big" id="nextBtn2">${esc(o.next)}</button></div>` : '<p class="note" style="text-align:center;margin:0">곧 다음 차례예요</p>'}`;
    P.render($('view'), o.e || [], { w: 600 });
    sfx(gains.length ? 'good' : 'lose');
    const cur = CUR = { kind: 'reveal' };
    if (o.next) { const b = $('nextBtn2'); b.onclick = () => { sfx('tap'); o.onNext(); }; cur.qa = () => { b.click(); return true; }; }
    else cur.qa = () => false;
  }

  // 결과. o = { names, scores, me, gal: [{w, e, d, got}] }
  const medal = r => ['🥇', '🥈', '🥉'][r - 1] || String(r);
  function showResult(o) {
    destroyCur(); stopTimer(); scrCls();
    const stn = K.standings(o.scores), top = stn.filter(r => r.rank === 1 && r.s > 0);
    setBar('🏆 결과', top.length ? `${top.map(r => o.names[r.i]).join(', ')} 1등` : '');
    scr().innerHTML = `${head('🏆 오늘의 베니캐치왕', top.length ? top.map(r => esc(o.names[r.i])).join(', ') + ' 님!' : '아무도 못 맞혔어요 😿', 'sm')}
      <div class="scroll"><div class="res">
        <div class="rks">${stn.map(r => `<div class="rkrow${r.rank === 1 && r.s > 0 ? ' win' : ''}${r.i === o.me ? ' me' : ''}"><span>${medal(r.rank)}</span><span class="nm">${esc(o.names[r.i])}</span><i>${r.s}점</i></div>`).join('')}</div>
        <div class="gal">${o.gal.map((h, k) => h ? `<div class="gc"><canvas data-k="${k}"></canvas><div class="cap"><b>${esc(h.w)}</b> · ${esc(o.names[h.d] || '?')} · 맞힘 ${h.got.length}명</div></div>` : '').join('')}</div>
      </div></div>
      <div class="acts" id="resActs"></div>`;
    scr().querySelectorAll('canvas[data-k]').forEach(cv => P.render(cv, o.gal[+cv.dataset.k].e || [], { w: 360 }));
    if (top.some(r => r.i === o.me) || (o.me < 0 && top.length && o.hot)) { sfx('win'); C.confetti(); } else if (o.me >= 0) sfx('lose'); else sfx('good');
    CUR = { kind: 'result', qa: () => false };
  }

  // 시험·몽키용: 그림판에 진짜 포인터 이벤트로 낙서
  function scribble(cv, n) {
    const r = cv.getBoundingClientRect(), rnd = Math.random;
    const ev = (type, x, y, id) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x * r.width, clientY: r.top + y * r.height, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true }));
    for (let i = 0; i < n; i++) {
      const id = 40 + i, rad = 0.06 + rnd() * 0.12, cx = 0.2 + rnd() * 0.6, cy = 0.3 + rnd() * 0.4;
      ev('pointerdown', cx + rad, cy, id);
      for (let a = 0; a <= 24; a++) { const t = a / 24 * 6.28; ev('pointermove', cx + Math.cos(t) * rad, cy + Math.sin(t) * rad * 1.2, id); }
      ev('pointerup', cx + rad, cy, id);
    }
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
    if (!lPick.valid) return C.toast('2~8명의 이름을 적어 주세요');
    const names = uniqNames(lPick.seats.map(s => s.name));
    if (SES) SES.dispose();
    const ses = SES = newSession({ mode: 'hot' });
    ses.names = names; ses.hotCfg = { sec: opt.sec, rounds: o.rounds || opt.rounds };
    show('play');
    runHot(ses).catch(e => { if (!(e instanceof Cancel)) { console.error(e); C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); } });
  }
  // 가림막: 뒤로가기가 숨겨 버려도 다시 띄움 (제시어가 비치지 않게)
  async function hotCover(ses, o) {
    let settled = false;
    const p = HotSeat.cover(o).then(() => { settled = true; });
    const iv = setInterval(() => { const el = document.querySelector('.hs-cover'); if (!settled && el && el.hidden && ses.alive) el.hidden = false; }, 200);
    try { await p; } finally { clearInterval(iv); }
    chk(ses);
  }
  const ask = (ses, fn) => new Promise((res, rej) => { ses.wake = () => rej(new Cancel()); fn(res); });
  async function runHot(ses) {
    const names = ses.names, n = names.length;
    const G = ses.G = K.create(n, ses.hotCfg);
    const gal = ses.gal = [];
    for (let k = 0; k < G.turns; k++) {
      const words = Wd.pick3(null, G.used);
      const d = K.startTurn(G, k, words.map(x => x.w));
      ses.hot = { ph: 'cover', k };
      setBar('🖍️ 베니캐치', turnSub(G, k));
      await hotCover(ses, { name: names[d], emoji: FACES[d % FACES.length], text: `${names[d]} 님이 그릴 차례`, sub: '다른 사람은 화면을 보지 마세요! 제시어를 몰래 골라요', button: '🤫 제시어 보기' });
      ses.hot = { ph: 'pick', k };
      const i = await ask(ses, res => showPick({ who: names[d], words, hot: true, dur: secs(K.PICK_SEC), onPick: res }));
      chk(ses);
      K.choose(G, i);
      ses.hot = { ph: 'draw', k };
      const dur = secs(G.cfg.sec);
      const e = await ask(ses, res => {
        let lvl = 0, ended = false;
        const S = () => ({ names, scores: G.scores, drawer: d, got: new Set(G.got), me: -1, tap: true });
        const end = () => { if (ended) return; ended = true; stopTimer(); res(cur.pad.toEnc()); };
        const cur = showDrawer({ hot: true, small: `🖍️ ${esc(names[d])} 님이 그려요 · 말로 맞혀요!`, top: K.hintOf(G.word, 0), peekWord: G.word, S: S(),
          onSkip: end,
          onAward: p => {
            const pts = K.award(G, p, timeLeft());
            if (!pts) return;
            sfx('good'); const tn = document.querySelector('.tapnote'); if (tn) tn.textContent = `🎉 ${names[p]} 님 정답! +${pts} · 또 맞힌 사람을 눌러요`;
            drawScores(S());
            if (K.allGot(G)) setTimeout(end, 500);
          } });
        startTimer(dur * 1000, end, left => {
          const l = K.hintLevel(left, dur);
          if (l > lvl) { lvl = l; const b = $('tBig'); if (b && b.classList.contains('hint')) b.textContent = K.hintOf(G.word, l); cur.top = K.hintOf(G.word, l); sfx('pop'); }
        });
      });
      chk(ses);
      const h = K.endTurn(G); h.e = e; gal[k] = h;
      ses.hot = { ph: 'reveal', k };
      const last = K.isLast(G);
      await ask(ses, res => showReveal({ w: h.w, drawer: d, drawerName: names[d], names, gain: h.gain, e, next: last ? '🏆 결과 보기' : '다음 차례 ▶', onNext: res }));
      chk(ses);
    }
    K.finish(G);
    ses.hot = { ph: 'result', k: G.turns };
    showResult({ names, scores: G.scores, me: -1, gal, hot: true });
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
      <div class="optrow"><span class="small" style="min-width:74px">그리는 시간</span><div class="seg" data-s="sec"></div></div>
      <div class="optrow"><span class="small" style="min-width:74px">바퀴</span><div class="seg" data-s="rounds"></div></div>
    </div>`;
    const up = p => { if (canEdit && update) update(p); };
    segBtns(el.querySelector('[data-s="sec"]'), SECS, c.sec, v => up({ sec: +v }), canEdit);
    segBtns(el.querySelector('[data-s="rounds"]'), RNDS, c.rounds, v => up({ rounds: +v }), canEdit);
  }
  function friendOpts() {
    return {
      game: 'catch', title: '베니캐치', max: 8,
      get min() { return QA_MIN || 2; },
      describe: n => {
        const need = QA_MIN || 2;
        if (n < need) return { text: `${need}명부터 할 수 있어요 (지금 ${n}명)`, ok: false };
        return `${n}명 → 한 사람씩 그리고 나머지가 맞혀요`;
      },
      settings: { defaults: { ...DEF, sec: opt.sec, rounds: opt.rounds }, label: c => `그리기 ${(c && c.sec) || 80}초 · ${(c && c.rounds) || 1}바퀴`, render: lobbyRender },
      onStart: ctx => startOnline(ctx),
      onLobby: () => { if (SES) SES.dispose(); SES = null; show('home'); drawMenu(); },
      onLeave: why => { goHome(); if (why) C.toast(why, 2600); },
    };
  }
  function startOnline({ net, role, cfg }) {
    if (SES) SES.dispose();
    const ses = SES = newSession({ mode: 'online', net, role, uid: net.uid });
    show('play'); setBar('🖍️ 베니캐치', '연결하는 중'); scrCls();
    scr().innerHTML = `<div class="waitbox"><div class="paw">🖍️</div><h2>${role === 'host' ? '판을 준비해요' : '방장에게 판을 받는 중'}</h2></div>`;
    ses.offs.push(net.on('players', () => onPlayers(ses)));
    if (role === 'host') hostStart(ses, cfg);
    else {
      ses.offs.push(net.on('msg', m => handle(ses, m)));
      const hi = () => { if (SES === ses && !ses.V) net.send({ t: 'hi' }, true); };
      hi(); ses.hiT = setInterval(hi, 1500);
    }
  }

  // ── 방장 ─────────────────────────────────────────────────
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function bc(ses, m) { ses.net.broadcast(m, true); handle(ses, m); }
  function to(ses, uid, m) { if (uid === ses.uid) handle(ses, m); else ses.net.send(uid, m, true); }

  function hostStart(ses, cfg) {
    const net = ses.net;
    ses.H = { G: null, g: 0, order: [], names: [], gone: new Set(), cfg: { ...DEF, ...(cfg || {}) }, words: null, pic: [], left: 0, dur: 0, lvl: 0, tmo: 0, tick: 0, rev: null };
    ses.offs.push(net.on('msg', (uid, m) => hostMsg(ses, uid, m)));
    ses.offs.push(net.on('leave', uid => hostLeave(ses, uid)));
    ses.offs.push(net.on('join', uid => hostJoin(ses, uid)));
    hostNewGame(ses);
  }
  function seatCandidates(ses) {
    const pl = ses.net.players || {}, H = ses.H;
    const present = Object.keys(pl).filter(u => !(pl[u] && pl[u].watch)).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    if (!H.g) return present;
    return present.filter(u => H.order.includes(u) || ses.pick[u]);
  }
  const hostClear = H => { clearTimeout(H.tmo); clearInterval(H.tick); H.tmo = H.tick = 0; };
  // 멈춤(시험)을 지키는 기다림
  function hostAfter(ses, sec, fn) {
    const H = ses.H; clearTimeout(H.tmo);
    const arm = ms => { H.tmo = setTimeout(() => { if (!ses.alive) return; if (PAUSED) return arm(300); fn(); }, ms); };
    arm(sec * 1000);
  }
  function hostNewGame(ses) {
    const H = ses.H, need = QA_MIN || 2;
    const cand = seatCandidates(ses);
    if (cand.length < need) { C.toast(`${need}명부터 할 수 있어요`, 2400); if (window.ArenaUI && ArenaUI.net === ses.net) ArenaUI.toLobby(); return; }
    hostClear(H);
    const pl = ses.net.players || {};
    H.order = shuffle(cand.slice()); H.g++;
    H.names = uniqNames(H.order.map(u => (pl[u] && pl[u].name) || '친구'));
    H.gone = new Set(); H.rev = null; H.pic = [];
    H.G = ses.G = K.create(H.order.length, H.cfg);
    ses.rdy = new Set(); ses.pick = {};
    bc(ses, goMsg(ses, null));
    hostTurn(ses, 0);
  }
  function goMsg(ses, uid) {
    const H = ses.H, G = H.G;
    return { t: 'go', g: H.g, order: H.order, names: H.names, cfg: G.cfg, turns: G.turns, ph: G.phase, k: G.k, drawer: G.drawer, left: Math.round(H.left * 10) / 10, dur: H.dur,
      hint: G.phase === 'draw' ? K.hintOf(G.word, H.lvl) : '', scores: G.scores, got: G.got, gone: [...H.gone], pic: G.phase === 'draw' ? H.pic : [], rev: G.phase === 'reveal' ? H.rev : null };
  }
  function hostTurn(ses, k) {
    const H = ses.H, G = H.G;
    hostClear(H);
    H.words = Wd.pick3(null, G.used); H.pic = []; H.lvl = 0; H.rev = null;
    const d = K.startTurn(G, k, H.words.map(x => x.w));
    H.left = H.dur = secs(K.PICK_SEC);
    bc(ses, { t: 'turn', g: H.g, k, drawer: d, dur: H.dur });
    if (H.gone.has(d)) return hostEndTurn(ses, true);                          // 그릴 사람이 나가 있으면 넘어감
    to(ses, H.order[d], { t: 'pick', g: H.g, k, ch: H.words });
    hostAfter(ses, H.dur + GRACE, () => hostChoose(ses, 0));
  }
  function hostChoose(ses, i) {
    const H = ses.H, G = H.G;
    if (G.phase !== 'pick' || !K.choose(G, i)) return;
    hostClear(H);
    H.dur = H.left = secs(G.cfg.sec); H.lvl = 0;
    to(ses, H.order[G.drawer], { t: 'word', g: H.g, k: G.k, w: G.word });
    bc(ses, { t: 'draw', g: H.g, k: G.k, dur: H.dur, hint: K.hintOf(G.word, 0) });
    let at = Date.now();
    H.tick = setInterval(() => {
      if (!ses.alive) return;
      const now = Date.now(), dt = (now - at) / 1000; at = now;
      if (PAUSED) return;
      H.left = Math.max(0, H.left - dt);
      const l = K.hintLevel(H.left, H.dur);
      if (l > H.lvl) { H.lvl = l; bc(ses, { t: 'hint', g: H.g, k: G.k, hint: K.hintOf(G.word, l) }); }
      if (H.left <= 0) hostEndTurn(ses);
    }, 250);
  }
  function hostEndTurn(ses, skip) {
    const H = ses.H, G = H.G;
    if (G.phase !== 'pick' && G.phase !== 'draw') return;
    hostClear(H);
    const h = K.endTurn(G);
    H.rev = { k: G.k, w: h.w, d: h.d, got: h.got, gain: h.gain, scores: G.scores, e: skip ? [] : H.pic, skip: !!skip };
    bc(ses, Object.assign({ t: 'rev', g: H.g }, H.rev));
    hostAfter(ses, skip ? 1.5 : secs(K.REVEAL_SEC), () => { if (K.isLast(G)) hostEnd(ses); else hostTurn(ses, G.k + 1); });
  }
  function hostEnd(ses) {
    const H = ses.H, G = H.G;
    hostClear(H); K.finish(G);
    bc(ses, { t: 'end', g: H.g, scores: G.scores });
  }
  function hostSay(ses, uid, text) {
    const H = ses.H, G = H.G, p = H.order.indexOf(uid);
    text = K.cleanText(text, K.MSG_MAX); if (!text) return;
    const pl = ses.net.players || {}, nm = (pl[uid] && pl[uid].name) || '구경';
    const r = p < 0 ? { kind: G.phase === 'draw' && K.leaks(text, G.word) ? 'hide' : 'chat', pts: 0 } : K.guess(G, p, text, H.left);
    if (r.kind === 'hit') {
      bc(ses, { t: 'say', g: H.g, p, kind: 'hit', pts: r.pts, sc: G.scores, got: G.got });
      to(ses, uid, { t: 'word', g: H.g, k: G.k, w: G.word });
      if (K.allGot(G, [...H.gone])) { hostClear(H); hostAfter(ses, 0.7, () => hostEndTurn(ses)); }
    } else if (r.kind === 'close') to(ses, uid, { t: 'close', g: H.g, x: text });
    else if (r.kind === 'hide') { to(ses, uid, { t: 'hid', g: H.g }); bc(ses, { t: 'say', g: H.g, p, n: nm, kind: 'hide' }); }
    else bc(ses, { t: 'say', g: H.g, p, n: nm, kind: r.kind === 'miss' ? 'miss' : 'chat', x: text });
  }
  function hostMsg(ses, uid, m) {
    const H = ses.H; if (!H || !m || typeof m !== 'object') return;
    if (m.t === 'hi') return hostSync(ses, uid);
    if (m.g !== H.g) return;
    const G = H.G, p = H.order.indexOf(uid);
    if (m.t === 'ch') { if (p >= 0 && p === G.drawer && m.k === G.k) hostChoose(ses, m.i | 0); }
    else if (m.t === 'pic') {
      if (p < 0 || p !== G.drawer || m.k !== G.k || G.phase !== 'draw') return;
      if (JSON.stringify(m.e || []).length > D.MAX_RECV) return;
      H.pic = D.clean(m.e);
      ses.net.broadcast({ t: 'pic', g: H.g, k: G.k, e: H.pic }, true); handle(ses, { t: 'pic', g: H.g, k: G.k, e: H.pic });
    } else if (m.t === 'say') hostSay(ses, uid, m.x);
    else if (m.t === 'rdy') {
      if (G.phase !== 'end') return;
      ses.rdy.add(uid);
      if (p < 0) ses.pick[uid] = true;
      bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick });
    }
  }
  function hostSync(ses, uid) {
    const H = ses.H, G = H.G; if (!G) return;
    const p = H.order.indexOf(uid);
    to(ses, uid, goMsg(ses, uid));
    if (p < 0) return;
    if (G.phase === 'pick' && p === G.drawer) to(ses, uid, { t: 'pick', g: H.g, k: G.k, ch: H.words });
    if (G.phase === 'draw' && (p === G.drawer || G.got.includes(p))) to(ses, uid, { t: 'word', g: H.g, k: G.k, w: G.word });
    if (G.phase === 'end') to(ses, uid, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick });
  }
  function hostLeave(ses, uid) {
    const H = ses.H; if (!H || !H.G) return;
    const p = H.order.indexOf(uid), G = H.G;
    if (p < 0) { delete ses.pick[uid]; ses.rdy.delete(uid); if (G.phase === 'end') bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick }); return; }
    if (uid === ses.uid) return;
    H.gone.add(p);
    bc(ses, { t: 'prog', g: H.g, gone: [...H.gone] });
    if ((G.phase === 'pick' || G.phase === 'draw') && p === G.drawer) { C.toast(`${H.names[p]} 님 연결이 끊겨 이번 그림은 넘어가요`, 2600); hostEndTurn(ses, G.phase === 'pick'); }
    else if (G.phase === 'draw' && K.allGot(G, [...H.gone])) hostEndTurn(ses);
    else if (G.phase === 'end') { ses.rdy.delete(uid); bc(ses, { t: 'rdyl', g: H.g, uids: [...ses.rdy], pick: ses.pick }); }
  }
  function hostJoin(ses, uid) {
    const H = ses.H; if (!H || !H.G) return;
    const p = H.order.indexOf(uid);
    if (p >= 0 && H.gone.has(p)) {
      H.gone.delete(p); C.toast(`${H.names[p]} 님이 돌아왔어요`, 2000);
      bc(ses, { t: 'prog', g: H.g, gone: [...H.gone] });
      hostSync(ses, uid);
    }
  }

  // ── 모두(방장 포함)가 받는 곳 ─────────────────────────────
  const Sof = V => ({ names: V.names, scores: V.scores, drawer: V.ph === 'pick' || V.ph === 'draw' ? V.drawer : -1, got: V.got, gone: V.gone, me: V.me });
  const say = (ses, l) => { const V = ses.V; V.log.push(l); if (V.log.length > 60) V.log.splice(0, V.log.length - 60); drawLog(V.log, V.names); };
  function handle(ses, m) {
    if (!m || typeof m !== 'object' || SES !== ses || !ses.alive) return;
    let V = ses.V;
    if (m.t === 'go') {
      if (!Array.isArray(m.order) || !Array.isArray(m.names)) return;
      clearInterval(ses.hiT);
      const n = m.order.length, same = V && V.g === m.g;
      if (same && V.k === (m.k | 0) && V.ph === m.ph && CUR && (CUR.kind === 'draw' || CUR.kind === 'pick' || CUR.kind === 'guess')) {   // 같은 차례를 하는 중에 또 온 안내 (처음에 두 번 오기도 함) — 그리던 그림을 날리지 않게 점수·나간 사람만
        V.scores = (m.scores || V.scores).map(x => x | 0); V.got = new Set(m.got || []); V.gone = new Set(m.gone || []); drawScores(Sof(V)); return;
      }
      ses.rdy = new Set(); ses.pick = {};
      V = ses.V = { g: m.g, n, order: m.order, names: m.names.map(x => String(x).slice(0, 16)), me: m.order.indexOf(ses.uid), cfg: m.cfg || DEF, turns: m.turns | 0,
        ph: m.ph, k: m.k | 0, drawer: m.drawer | 0, end: Date.now() + (m.left || 0) * 1000, dur: m.dur || 0, hint: m.hint || '', word: same ? V.word : '', choices: same ? V.choices : null,
        scores: (m.scores || []).map(x => x | 0), got: new Set(m.got || []), gone: new Set(m.gone || []), pic: D.clean(m.pic || []), log: same ? V.log : [], gal: same ? V.gal : [], rev: m.rev || null };
      if (V.rev) V.gal[V.rev.k] = { w: V.rev.w, e: D.clean(V.rev.e || []), d: V.rev.d, got: V.rev.got || [] };
      render(ses);
      return;
    }
    if (!V || m.g !== V.g) return;
    switch (m.t) {
      case 'turn':
        V.ph = 'pick'; V.k = m.k | 0; V.drawer = m.drawer | 0; V.end = Date.now() + (m.dur || 0) * 1000; V.word = ''; V.choices = null; V.got = new Set(); V.pic = []; V.hint = '';
        if (V.me === V.drawer) sfx('pop');
        render(ses); break;
      case 'pick':
        if ((m.k | 0) !== V.k || !Array.isArray(m.ch)) return;
        V.choices = m.ch.slice(0, 3).map(x => ({ w: K.cleanText(x && x.w, 16), em: String((x && x.em) || '🎨').slice(0, 4), cat: K.cleanText(x && x.cat, 10) }));
        if (V.ph === 'pick') render(ses); break;
      case 'word':
        if ((m.k | 0) !== V.k) return;
        V.word = K.cleanText(m.w, 16);
        if (V.ph === 'draw') { if (V.me === V.drawer) setTop(null, V.word, Array.from(V.word).length > 9 ? 'sm' : ''); else setTop(null, V.word, ''); }
        break;
      case 'draw':
        if ((m.k | 0) !== V.k) return;
        V.ph = 'draw'; V.dur = m.dur || 0; V.end = Date.now() + V.dur * 1000; V.hint = m.hint || '';
        render(ses); break;
      case 'pic':
        if ((m.k | 0) !== V.k || V.ph !== 'draw') return;
        V.pic = D.clean(m.e);
        if (V.me !== V.drawer) drawPic(V.pic);
        break;
      case 'hint':
        if ((m.k | 0) !== V.k) return;
        V.hint = m.hint || '';
        if (V.ph === 'draw' && V.me !== V.drawer && !V.got.has(V.me)) { setTop(null, V.hint, 'hint'); sfx('pop'); }
        break;
      case 'say':
        if (m.kind === 'hit') {
          V.got = new Set(m.got || []); V.scores = (m.sc || V.scores).map(x => x | 0);
          if (m.p === V.me) { sfx('win'); setTop(`✅ 맞혔어요! +${m.pts} · 이제 채팅은 답이 가려져요`, null); } else sfx('good');   // 알림 창은 위 정답 칸을 가려서 안 씀
          drawScores(Sof(V));
        }
        say(ses, { p: m.p | 0, n: m.n, kind: m.kind, x: m.x, pts: m.pts | 0 });
        break;
      case 'close': say(ses, { p: V.me, kind: 'close', x: m.x }); sfx('tap'); break;
      case 'hid': C.toast('🤫 답이 들어 있어서 가렸어요', 1600); break;
      case 'prog': V.gone = new Set(m.gone || []); drawScores(Sof(V)); break;
      case 'rev':
        V.ph = 'reveal'; V.scores = (m.scores || V.scores).map(x => x | 0); V.got = new Set(m.got || []);
        V.rev = { k: m.k | 0, w: K.cleanText(m.w, 16), d: m.d | 0, got: m.got || [], gain: m.gain || [], e: D.clean(m.e || []), skip: !!m.skip };
        V.gal[V.rev.k] = { w: V.rev.w, e: V.rev.e, d: V.rev.d, got: V.rev.got };
        render(ses); break;
      case 'end':
        { const live = V.ph !== 'end';
          V.ph = 'end'; V.scores = (m.scores || V.scores).map(x => x | 0);
          render(ses);
          if (live) rankReport(ses); }
        break;
      case 'rdyl':
        ses.rdy = new Set(m.uids || []); ses.pick = m.pick || {}; drawResultActs(ses); break;
    }
  }
  function sendHost(ses, m) { if (ses.role === 'host') hostMsg(ses, ses.uid, m); else ses.net.send(m, true); }
  // 지금 상태대로 화면 한 장
  function render(ses) {
    const V = ses.V, S = Sof(V), dn = V.names[V.drawer] || '?';
    const sub = `${Math.floor(V.k / Math.max(1, V.n)) + 1}/${(V.cfg && V.cfg.rounds) || 1}바퀴 · ${V.k + 1}/${V.turns || V.n}번째`;
    const rem = () => Math.max(500, V.end - Date.now());
    if (V.ph === 'pick') {
      setBar('🖍️ 제시어 고르기', sub);
      if (V.me === V.drawer && V.choices) {
        showPick({ words: V.choices, dur: Math.round(rem() / 1000), onPick: i => sendHost(ses, { t: 'ch', g: V.g, k: V.k, i }) });
      } else {
        showWait(V.me === V.drawer ? '제시어를 받는 중…' : `${dn} 님이 제시어를 고르는 중`, V.me === V.drawer ? '' : '곧 그림이 나와요. 맞힐 준비!', S, V.log);
        startTimer(rem(), null);
      }
    } else if (V.ph === 'draw') {
      setBar('🖍️ 베니캐치', sub);
      if (V.me === V.drawer) {
        showDrawer({ small: '🖍️ 내가 그려요 · 말·글자는 쓰면 안 돼요', top: V.word || '…', S, log: V.log, onPic: e => sendHost(ses, { t: 'pic', g: V.g, k: V.k, e }) });
      } else {
        const got = V.got.has(V.me), spec = V.me < 0;
        showGuesser({ small: got ? '✅ 맞혔어요! 이제 채팅은 답이 가려져요' : `🖍️ ${esc(dn)} 님이 그려요${spec ? ' · 👀 구경 중' : ''}`, top: got && V.word ? V.word : V.hint, topCls: got && V.word ? '' : 'hint',
          S, log: V.log, pic: V.pic, canChat: true, placeholder: spec ? '구경 중 · 채팅' : '답을 적어요',
          onSay: x => sendHost(ses, { t: 'say', g: V.g, x }),
          qaWord: ses.H ? () => (Math.random() < 0.6 ? ses.H.G.word : '모르겠다') : null });
      }
      startTimer(rem(), null);
    } else if (V.ph === 'reveal' && V.rev) {
      setBar('🎉 정답', sub);
      showReveal({ w: V.rev.w, drawer: V.rev.d, drawerName: V.names[V.rev.d] || '?', names: V.names, gain: V.rev.gain, e: V.rev.e, skip: V.rev.skip });
      stopTimer();
    } else if (V.ph === 'end') {
      showResult({ names: V.names, scores: V.scores, me: V.me, gal: V.gal });
      drawResultActs(ses);
    } else showWait('판을 받는 중…', '', S);
  }

  // 🏆 랭킹: 친구랑 판만, 각자 자기 기기에서 한 번. 1등(동점 포함)이면 w
  function rankReport(ses) {
    const V = ses.V;
    try {
      if (ses.mode !== 'online' || !V || V.me < 0 || ses.rankG === V.g) return;
      ses.rankG = V.g;
      const R = K.rankInfo(V.scores, V.me); if (!R) return;
      const rec = { mode: 'friend', res: R.res, beat: R.beat, score: R.score, opp: R.opp.map(o => ({ uid: V.order[o.idx], res: o.res })) };
      QA.rankLog.push(rec);
      if (window.GRank) GRank.result(SITE, rec);
    } catch (e) { console.warn('[rank]', e); }
  }
  function onPlayers(ses) {
    if (SES !== ses || !ses.V) return;
    if (ses.V.ph === 'end') drawResultActs(ses);
  }

  // 결과 화면 아래 단추 (다음 판 준비)
  function drawResultActs(ses) {
    const box = $('resActs'); if (!box || !ses.V || ses.V.ph !== 'end' || ses.mode !== 'online') return;
    const V = ses.V, pl = ses.net.players || {}, host = ses.role === 'host', me = ses.uid;
    const seatUids = V.order.filter(u => pl[u]);
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
      const total = seatUids.length + joiners.length, need = QA_MIN || 2, okN = total >= need;
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
  window.__catch = {
    get ses() { return SES; },
    get mode() { return SES ? SES.mode : null; },
    get V() { return SES && SES.V; },
    get G() { return SES && (SES.G || (SES.H && SES.H.G)); },
    get cur() { return CUR; },
    rankLog: QA.rankLog,
    fast(v = 1) { FAST = v ? 1 : 0; },
    pause(v = true) { PAUSED = !!v; },
    get paused() { return PAUSED; },
    setMin(n) { QA_MIN = n | 0; },
    startHot(o) { startHot(o); },
    scribble: n => { const cv = $('pad'); if (cv) scribble(cv, n || 3); return !!cv; },
    // 지금 화면에서 사람이 할 만한 걸 한 번 한다 (진짜 단추·입력을 누름). 했으면 true
    autoAct() {
      const ses = SES; if (!ses || PAUSED) return false;
      if (window.HotSeat && HotSeat.isOpen) { HotSeat.close(); return true; }
      if (CUR && CUR.qa) return CUR.qa();
      return false;
    },
    fp() {
      const ses = SES; if (!ses) return null;
      if (ses.mode === 'hot') return JSON.stringify({ hot: ses.hot });
      const V = ses.V; if (!V) return null;
      return JSON.stringify({ g: V.g, n: V.n, k: V.k, ph: V.ph, d: V.drawer, sc: V.scores, got: [...V.got].sort(), gone: [...V.gone].sort() });
    },
    probe() {
      const ses = SES; if (!ses) return { fp: 'none', over: false, waiting: false, info: '세션 없음' };
      if (ses.mode === 'hot') {
        const h = ses.hot || {}, G = ses.G;
        return { fp: [h.ph, h.k, window.HotSeat && HotSeat.isOpen ? 'cover' : '', CUR ? CUR.kind : '', G ? G.got.length : 0].join('|'), over: h.ph === 'result' && !!$('again'), waiting: true, info: `${h.ph} · ${h.k}번째` };
      }
      const V = ses.V; if (!V) return { fp: 'none', over: false, waiting: false, info: '연결 중' };
      return { fp: window.__catch.fp(), over: V.ph === 'end', waiting: !!(CUR && CUR.kind !== 'result'), info: `${V.g}번째 판 · ${V.ph} · ${V.k}번째` };
    },
  };

  // ── 시작 ─────────────────────────────────────────────────
  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
})();

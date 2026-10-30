/* 정통 섯다 — 화면 · 둥근 테이블(2~6명) · 친구랑(방장이 판을 돌리고 각자에게 자기 패만 보냄) · AI 구경 · 🧑‍🏫 AI 선생님 (main.js) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const S = window.Seotda, AI = window.SeotdaAI, ART = window.GostopArt, C = window.Cozy;
  const sfx = (n, o) => C.sfx.play(n, o);
  const esc = C.esc;
  const fmtN = n => Number(n || 0).toLocaleString('ko-KR');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } };
  const MAXP = S.MAX_PLAYERS;          // 6

  // ── 코인 출입구 한 곳 (나중에 공용 은행이 여기에 꽂힘)
  //   start(kind, n, seats): 자리별 시작 코인 [n] — 기본은 혼자=저장된 내 코인·AI=같은 값, 친구랑=500
  //   report(kind, info): 판이 끝날 때마다 { round, coins:[자리별 코인], seats:[{name,ctrl}], me } 를 알림 (window 'chips:report' 이벤트)
  const CHIPS = {
    start(kind, n) {
      const base = kind === 'solo' && stats.coins >= 50 ? stats.coins : 500;
      return Array.from({ length: n }, () => base);
    },
    report(kind, info) {
      try { window.dispatchEvent(new CustomEvent('chips:report', { detail: Object.assign({ game: 'seotda', kind }, info) })); } catch (e) {}
    },
  };

  const KEY = 'seotda.';
  const opt = {
    tab: C.store(KEY + 'tab', 'solo'),
    mode: Math.max(2, Math.min(MAXP, +C.store(KEY + 'mode', 2) || 2)),
    tier: C.store(KEY + 'tier', 'normal'),
    hotN: Math.max(2, Math.min(MAXP, +C.store(KEY + 'hotN', 3) || 3)),
    hotSeats: C.store(KEY + 'hotSeats', ['h', 'h', 'h', 'a', 'a', 'a']),   // 한 기기: 자리별 사람(h)/AI(a)
    wMode: Math.max(2, Math.min(MAXP, +C.store(KEY + 'wMode', 3) || 3)),
    fill: +C.store(KEY + 'fill', 0) || 0,        // 친구랑: 빈자리를 AI 로 채울 목표 인원 (0 = 안 채움)
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  let stats = C.store(KEY + 'stats', { played: 0, won: 0, coins: 500 });

  const TIER = {
    easy:   { em: '🌱', name: '어설픈 하수', desc: '솔직하게 패대로만 베팅해요', cls: 't-easy' },
    normal: { em: '🎴', name: '노련한 꾼',   desc: '오픈패와 팟오즈를 계산해요', cls: 't-normal' },
    hard:   { em: '👑', name: '전설의 타짜', desc: '블러핑과 땡잡이 수싸움을 걸어요', cls: 't-hard' },
  };
  const AI_NAMES = ['짝귀', '독사', '아귀', '고니', '박무옥', '김첨지'];
  const AI_EMS = ['🎴', '🐍', '🦅', '🃏', '🌾', '🍶'];
  const ACT_NAME = ['다이', '콜', '쿼터', '하프', '따당'];

  function segBtns(el, items, cur, onPick) {
    if (!el) return;
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }
  const countItems = () => Array.from({ length: MAXP - 1 }, (_, i) => [i + 2, `${i + 2}인`]);

  // 한 기기 자리 고르기: 공용 HotSeat.setup 이 있으면 그걸로 (이름·사람/AI·AI 실력), 없으면 아래 간단한 대체
  let hotPick = null;
  function ensureHotPick() {
    if (hotPick || !(window.HotSeat && typeof HotSeat.setup === 'function')) return;
    try { hotPick = HotSeat.setup($('hotSetup'), { game: 'seotda', min: 2, max: MAXP, allowAI: true, tiers: ['easy', 'normal', 'hard'], onChange: () => { $('hotBtn').disabled = !hotPick.valid; } }); $('hotBtn').disabled = !hotPick.valid; } catch (e) { console.error(e); hotPick = null; }
  }

  function drawMenu() {
    ensureHotPick();
    $('hotFallback').hidden = !!hotPick;
    const solo = opt.tab === 'solo';
    $('tabSolo').setAttribute('aria-pressed', String(solo));
    $('tabWatch').setAttribute('aria-pressed', String(opt.tab === 'watch'));
    $('tabHot').setAttribute('aria-pressed', String(opt.tab === 'hot'));
    $('soloBox').hidden = !solo;
    $('hotBox').hidden = opt.tab !== 'hot';
    $('watchBox').hidden = opt.tab !== 'watch';
    $('coinLine').innerHTML = `<span class="ic">🪙</span><span class="grow"><b>${fmtN(stats.coins)} 냥</b><span class="small">${stats.played ? `${fmtN(stats.played)}판 중 ${fmtN(stats.won)}판 승리` : '정통 2장 화투 섯다 · 파산 시 500냥 자동 충전'}</span></span>`;
    segBtns($('modeSeg'), countItems(), opt.mode, v => { opt.mode = +v; saveOpt('mode'); drawMenu(); });
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })),
      id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    segBtns($('hotCountSeg'), countItems(), opt.hotN, v => { opt.hotN = +v; saveOpt('hotN'); drawMenu(); });
    $('hotSeatSeg').innerHTML = Array.from({ length: opt.hotN }, (_, i) => `<button class="btn" data-i="${i}" aria-pressed="${opt.hotSeats[i] === 'h'}">${i + 1}번 ${opt.hotSeats[i] === 'h' ? '👤 사람' : '🤖 AI'}</button>`).join('');
    $('hotSeatSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); const i = +b.dataset.i; opt.hotSeats[i] = opt.hotSeats[i] === 'h' ? 'a' : 'h'; saveOpt('hotSeats'); drawMenu(); };
    segBtns($('wModeSeg'), countItems(), opt.wMode, v => { opt.wMode = +v; saveOpt('wMode'); drawMenu(); });
  }

  $('tabSolo').onclick = () => { sfx('tap'); opt.tab = 'solo'; saveOpt('tab'); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); opt.tab = 'watch'; saveOpt('tab'); drawMenu(); };
  $('tabHot').onclick = () => { sfx('tap'); opt.tab = 'hot'; saveOpt('tab'); drawMenu(); };
  $('hotBtn').onclick = () => { sfx('pop'); startGame({ hot: true }); };
  $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('pop'); startGame({ watch: false }); };
  $('watchBtn').onclick = () => { sfx('pop'); startGame({ watch: true }); };
  $('jokboBtn').onclick = () => showJokboModal();
  $('rankBtn').onclick = () => showJokboModal();
  C.sfx.button($('sndBtn'));

  const JOKBO_HTML = `
    <div style="text-align:left;font-size:13.5px;display:grid;gap:8px">
      <p style="margin:0">섯다는 1월~10월 화투 2장씩 총 20장으로 두 장의 조합 서열을 겨룹니다. (최대 6명)</p>
      <table class="brk">
        <tr><td><b>1위 · 38광땡</b></td><td class="n">3월 광 + 8월 광 (천하무적)</td></tr>
        <tr><td><b>2위 · 13·18광땡</b></td><td class="n">1월 광 + 3·8월 광 (암행어사에게만 잡힘)</td></tr>
        <tr><td><b>3위 · 장땡~1땡</b></td><td class="n">같은 달 2장 (10땡>9땡>...>1땡)</td></tr>
        <tr><td><b>4위 · 알리</b></td><td class="n">1월 + 2월 (중간 족보 1위)</td></tr>
        <tr><td><b>5위 · 독사</b></td><td class="n">1월 + 4월</td></tr>
        <tr><td><b>6위 · 구삥</b></td><td class="n">1월 + 9월</td></tr>
        <tr><td><b>7위 · 장삥</b></td><td class="n">1월 + 10월</td></tr>
        <tr><td><b>8위 · 장사</b></td><td class="n">4월 + 10월</td></tr>
        <tr><td><b>9위 · 세륙</b></td><td class="n">4월 + 6월</td></tr>
        <tr><td><b>10위 · 갑오~망통</b></td><td class="n">두 달 합의 끝자리 (9끗 갑오 ~ 0끗 망통)</td></tr>
      </table>
      <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:8px 10px;font-size:12.5px;color:#78350f">
        <b>⚡ 특수 족보 상성</b><br>
        • <b>암행어사 (4월 열끗 + 7월 열끗)</b>: 13·18광땡을 잡음 (없으면 1끗)<br>
        • <b>땡잡이 (3월 광 + 7월 열끗)</b>: 1땡~9땡을 잡음 (장땡 제외, 없으면 망통)<br>
        • <b>멍텅구리 구사 (4월 열끗 + 9월 열끗)</b>: 9땡 이하 판을 무효(재경기)로 만듦<br>
        • <b>구사 (4월 + 9월)</b>: 알리 이하 판을 무효(재경기)로 만듦<br>
        • 같은 족보로 비기면 재경기, 판돈은 다음 판으로 넘어가요
      </div>
    </div>
  `;
  function showJokboModal() {
    sfx('tap');
    C.modal({ title: '📜 정통 섯다 족보 서열표', html: JOKBO_HTML, buttons: [{ label: '닫기', primary: true }], dismiss: true });
  }

  // ─────────────────────────────────────────────────────────────
  // 친구랑: 방 최대 6명, 온 사람끼리 시작 (최소 2명), 방장이 켜면 빈자리를 AI 로 채움
  const FRIEND = {
    game: 'seotda', title: '정통 섯다', max: MAXP, min: 2, coach: true,
    describe: n => `${n}명 · 화투 20장 중 ${Math.min(20, n * 2)}장을 나눠요`,
    buildConfig: hostEl => {
      hostEl.innerHTML = `<div class="optrow"><span class="small">빈자리</span><div class="seg" id="fFillSeg"></div></div>`;
      const drawF = () => segBtns(hostEl.querySelector('#fFillSeg'), [[0, '온 사람끼리'], [4, 'AI로 4명까지'], [MAXP, `AI로 ${MAXP}명까지`]], opt.fill, v => { opt.fill = +v; saveOpt('fill'); drawF(); });
      drawF();
      return () => ({ fill: opt.fill });
    },
    renderConfig: cfg => `${cfg && cfg.fill ? `빈자리는 AI로 ${cfg.fill}명까지` : '온 사람끼리'}${cfg && cfg.coach ? ' · AI 선생님' : ''}`,
    onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
    onLobby: () => { endSession(); showScreen('home'); drawMenu(); },
    onLeave: () => { endSession(); showScreen('home'); drawMenu(); },
  };
  function openFriendModal() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(FRIEND);
  }

  // ─────────────────────────────────────────────────────────────
  // 세션
  let SES = null;
  function showScreen(which) {
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') requestAnimationFrame(placeSeats);
  }
  function endSession() {
    if (SES) {
      SES.alive = false;
      if (SES.cpBtn) { try { SES.cpBtn.destroy(); } catch (e) {} }
      if (SES.cp) { try { SES.cp.destroy(); } catch (e) {} }
      $('coachBtn').onclick = null;
      if (window.HotSeat && HotSeat.close) { try { HotSeat.close(); } catch (e) {} }
      document.querySelectorAll('.hsx-cover').forEach(e => e.remove());
      if (SES.offs) SES.offs.forEach(f => { try { f(); } catch (e) {} });
    }
    SES = null;
    $('resBox').hidden = true;
  }
  function goHome() {
    const online = SES && SES.net;
    if (online && window.ArenaUI && ArenaUI.net) { ArenaUI.leave(); return; }   // onLeave 가 정리함
    endSession();
    showScreen('home');
    drawMenu();
  }
  Cozy.backGuard($('backBtn'), () => { sfx('tap'); goHome(); });

  // 🧑‍🏫 AI 선생님 단추 하나: 혼자·친구랑 똑같이 패널을 켜고 끔 (친구랑은 방장이 켠 방에서만 단추가 보임)
  //  공용 CoachPanel 이 있으면 CoachPanel.button 이 켜기·끄기를 맡고, 없으면 아래 대체 처리
  function isCoachOn(ses) { return !!ses && (ses.cp ? ses.cp.visible : !!ses.coachOn); }
  function fallbackCoachToggle() {
    if (!SES || !SES.coachAvail || SES.cp) return;
    sfx('tap');
    SES.coachOn = !SES.coachOn;
    SES.cc = null;
    if (!SES.coachOn) $('coachPanel').hidden = true;
    renderGame(SES);
  }
  function drawCoachBtn() {
    const b = $('coachBtn');
    b.hidden = !(SES && SES.coachAvail);
    if (SES && SES.cp) return;                       // 공용 단추가 모양을 알아서 바꿈
    const on = !!(SES && SES.coachOn);
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = `<span class="ic">🧑‍🏫</span><span>${on ? '선생님 켬' : '선생님 끔'}</span>`;
  }

  // 화투 카드 (id<0 = 뒷면)
  function hwCardHtml(seotdaId, cls, mo) {
    if (seotdaId == null || seotdaId < 0) return `<div class="${cls}">${ART.use(-1)}</div>`;
    return `<div class="${cls}" title="${esc(S.cardName(seotdaId))}">${ART.use(S.gostopIdOf(seotdaId))}${mo ? `<i class="mo">${S.cardOf(seotdaId).m}월</i>` : ''}</div>`;
  }

  // 지금 화면에 쓸 '내 시점' 상태 (방장이 판을 돌리는 쪽은 S.view 로, 손님은 받은 것 그대로, 구경은 전부 공개)
  function getView(ses) {
    if (ses.mode === 'guest') return ses.V;
    if (ses.mode === 'watch') { const v = S.fastClone(ses.S); v.me = 0; delete v.deck; delete v.seed; return v; }
    return S.view(ses.S, ses.me);
  }

  // 상대 자리를 타원 둘레에 놓기 (내 자리는 아래쪽 따로). 이름표 크기를 재서 겹치지 않게 계산
  function placeSeats() {
    const tbl = $('tbl'), seats = $('seats');
    if (!tbl || !seats) return;
    const els = Array.from(seats.children);
    const W = tbl.clientWidth, H = tbl.clientHeight;
    if (!els.length || !W || !H) return;
    const k = els.length;
    const put = () => {
      const bw = els[0].offsetWidth, bh = els[0].offsetHeight;
      const rx = Math.max(0, W / 2 - bw / 2 - 2), ry = Math.max(0, H / 2 - bh / 2 - 2);
      els.forEach((el, i) => {
        const th = Math.PI / 2 + (i + 1) * 2 * Math.PI / (k + 1);     // 아래(내 자리)에서 시계 방향으로
        el.style.left = (W / 2 + rx * Math.cos(th)).toFixed(1) + 'px';
        el.style.top = (H / 2 + ry * Math.sin(th)).toFixed(1) + 'px';
      });
      $('felt').style.inset = `${(bh / 2 + 2).toFixed(0)}px ${(bw / 2 + 2).toFixed(0)}px`;
    };
    // 이름표끼리·가운데 칸과 겹치면 '작은 이름표' 로 바꿔 다시 놓기 (좁은 폰·가로 화면에서 8명까지 안 겹치게)
    const overlap = () => {
      const rects = els.map(e => e.getBoundingClientRect());
      rects.push(document.querySelector('#potZone').getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return true;
      }
      return false;
    };
    tbl.classList.remove('compact');
    put();
    if (overlap()) { tbl.classList.add('compact'); put(); }
  }
  window.addEventListener('resize', placeSeats);
  if (window.ResizeObserver) new ResizeObserver(() => placeSeats()).observe($('tbl'));

  function seatHtml(ses, v, q) {
    const seat = ses.seats[q] || { name: `자리${q + 1}`, em: '🎴' };
    const f = v.folded[q], h = v.hands[q] || [-1, -1];
    const ended = v.phase === 'end', r = v.result;
    const win = ended && r && r.kind !== 'rematch' && (r.winners || []).includes(q);
    const cls = ['seat'];
    if (v.turn === q && v.phase === 'bet') cls.push('turn');
    if (f) cls.push('folded');
    if (win) cls.push('win');
    let status;
    if (win && r.payouts) status = `<span class="bt got">+${fmtN(r.payouts[q])}냥</span>`;
    else if (f) status = `<span class="bt dead">🏳️ 다이</span>`;
    else status = `<span class="bt">배팅 ${fmtN(v.bets[q])}</span>`;
    return `<div class="${cls.join(' ')}" data-q="${q}"><span class="nm">${esc(seat.em)} ${esc(seat.name)}</span><span class="cn">🪙 ${fmtN(v.coins[q])}</span><div class="cds">${hwCardHtml(h[0], 'hw-mini', true)}${hwCardHtml(h[1], 'hw-mini', true)}</div>${status}</div>`;
  }

  // ── AI 선생님: 공용 움직이는 패널(window.CoachPanel)이 있으면 그걸로, 없으면 화면 안 한 줄 요약으로
  //    단추는 늘 하나(#coachBtn). 혼자·한 기기는 늘 있고, 친구랑은 방장이 켠 방에서만 보임
  function ensureCoach(ses) {
    const btn = $('coachBtn');
    btn.hidden = !ses.coachAvail;
    if (!ses.coachAvail) return;
    if (window.CoachPanel && !ses.cp) {
      try {
        // 처음엔 테이블 아래쪽 모서리에 작은 동그라미로 (내 카드·배팅 버튼을 가리지 않게). 눌러 펴고 끌어 옮길 수 있음
        const tb = $('tbl').getBoundingClientRect();
        ses.cp = CoachPanel.create({ game: 'seotda', title: 'AI 선생님', bottom: Math.max(64, Math.round(window.innerHeight - tb.bottom + 6)) });
        try { if (!localStorage.getItem(ses.cp.key)) ses.cp.collapse(true); } catch (e) {}
        ses.cpBtn = CoachPanel.button(btn, ses.cp, { onToggle: () => { ses.cc = null; renderGame(ses); } });
      } catch (e) { console.error(e); ses.cp = null; }
    }
    if (!ses.cp) btn.onclick = fallbackCoachToggle;
    drawCoachBtn();
  }
  // 행동별 기댓값(EV) 한 줄 — 예전 단추 위 꼬리표를 선생님 안으로 옮김
  function evRow(c) {
    const items = Object.values(c.byAction || {}).map(x => `<span class="ev-chip ${x.tier}">${x.action === c.bestAction ? '👑 ' : ''}${ACT_NAME[x.action]} ${x.evText}</span>`);
    return items.length ? `<div class="ev-row">${items.join('')}</div>` : '';
  }
  function coachHtml(c) {
    return `<div class="cp-top"><span class="cp-title">${esc(c.headline)}</span><div class="cp-meters"><span class="cp-chip win">승률 ${c.winPct}%</span><span class="cp-chip odds">팟오즈 ${c.potOddsPct}%</span></div></div>
      <div class="cp-bar"><div class="cp-fill" style="width:${Math.max(4, Math.min(100, c.winPct))}%"></div></div>
      <p class="cp-desc">${esc(c.detail)}</p>${evRow(c)}`;
  }
  function showCoach(ses, html) {
    if (!ses.coachAvail) return;
    if (ses.cp) { try { ses.cp.set(html); } catch (e) {} $('coachPanel').hidden = true; }
    else if (ses.coachOn) { const cp = $('coachPanel'); cp.hidden = false; cp.innerHTML = html; }
  }

  function renderGame(ses) {
    if (!ses.alive) return;
    const v = getView(ses), me = ses.me, s = v;
    const spect = me < 0;                               // 한 기기에서 다음 사람을 기다리는 동안 (아무 패도 안 보임)
    const mi = spect ? 0 : me;
    const watch = ses.mode === 'watch';
    $('lbl').textContent = watch ? '🍿 AI 섯다 구경' : ses.net ? `👥 친구랑 섯다 (${ses.net.code})` : ses.mode === 'hot' ? '📱 한 기기 섯다' : `🔥 정통 섯다 · ${TIER[opt.tier].name}`;
    $('sub').textContent = `${s.round}판 · ${s.street === 1 ? '1차 오픈 배팅' : '2차 본 배팅'} · ${s.n}명`;
    $('coinPill').textContent = spect ? '🪙 —' : `🪙 ${fmtN(s.coins[mi])}냥`;
    $('potVal').textContent = fmtN(s.pot);
    const toCall = spect ? 0 : Math.max(0, s.curBet - s.bets[mi]);
    $('potSub').innerHTML = s.phase === 'end' ? '판이 끝났어요' : `${s.street === 1 ? '첫 장 공개 후 탐색전' : '두 장 완성 후 승부'}${watch || spect ? '' : `<br>내 콜 ${fmtN(toCall)}냥`}`;

    // 상대 자리들 (내 다음 사람부터 시계 방향; 가려진 동안은 모든 자리를 상대로 그림)
    const html = [];
    const first = spect ? 0 : 1;
    for (let j = first; j < (spect ? s.n : s.n); j++) html.push(seatHtml(ses, v, (mi + j) % s.n));
    $('seats').innerHTML = html.join('');
    placeSeats();

    // 내 자리 & 카드
    const mySeat = spect ? { em: '🪑', name: '다음 사람을 기다려요' } : (ses.seats[me] || { em: '🎴', name: '나' });
    const myTurn = !watch && !spect && s.phase === 'bet' && s.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('meZone').classList.toggle('turn', myTurn);
    $('meName').textContent = spect ? `${mySeat.em} ${mySeat.name}` : `${mySeat.em} ${mySeat.name} · ${fmtN(s.coins[me])}냥 · 배팅 ${fmtN(s.bets[me])}`;
    const h = spect ? [] : (v.hands[me] || [-1, -1]);
    const mc1 = h.length ? h[0] : -2, mc2 = h.length ? h[1] : -2;
    $('myCards').innerHTML = spect ? '' : hwCardHtml(mc1, 'hw-big') + hwCardHtml(mc2, 'hw-big');
    const myEval = mc2 >= 0 ? S.evalHand(mc1, mc2) : { name: mc1 >= 0 ? `${S.cardOf(mc1).m}월 오픈` : "대기 중" };
    $('myJokbo').textContent = spect ? '' : `🎴 ${myEval.name}`;
    $('myJokbo').hidden = spect;

    // 🧑‍🏫 AI 선생님 분석 (패널이 꺼져 있어도 복기 노트용으로 내 차례엔 계산)
    let coachData = null;
    const coachOn = isCoachOn(ses);
    if (ses.coachAvail && !watch && !spect && s.phase === 'bet' && (coachOn || myTurn)) {
      const key = `${s.round}|${s.street}|${s.turn}|${s.pot}|${s.raises}|${me}`;
      if (!ses.cc || ses.cc.key !== key) ses.cc = { key, data: AI.coach(v, me) };
      coachData = ses.cc.data;
      showCoach(ses, coachHtml(coachData));
    } else if (ses.coachAvail && (spect || s.phase === 'end')) {
      showCoach(ses, `<p class="cp-desc">${spect ? '다음 사람 차례를 기다려요' : '판이 끝났어요. 결과를 확인해 보세요 🙂'}</p>`);
    }

    const L = myTurn ? S.legal(v) : [];
    const BTN_DEFS = [
      { a: S.A_FOLD, label: '다이', cls: 'fold' },
      { a: S.A_CALL, label: toCall === 0 ? '체크' : '콜', cls: 'call' },
      { a: S.A_QUARTER, label: '쿼터', cls: 'raise' },
      { a: S.A_HALF, label: '하프', cls: 'raise' },
      { a: S.A_DDADANG, label: '따당', cls: 'raise' },
    ];
    $('betGrid').innerHTML = BTN_DEFS.map(b => {
      const ok = myTurn && L.includes(b.a);
      const cost = spect ? 0 : S.actionCost(v, mi, b.a);
      const best = coachOn && coachData && myTurn && coachData.bestAction === b.a;
      return `<button class="bet-btn ${b.cls}${best ? ' coach-best' : ''}" data-a="${b.a}" ${ok ? '' : 'disabled'}>
        <span>${b.label}</span>
        <small>${b.a === S.A_FOLD ? '기권' : `+${fmtN(cost)}`}</small>
      </button>`;
    }).join('');
    $('betGrid').querySelectorAll('.bet-btn').forEach(btn => { btn.onclick = () => act(ses, +btn.dataset.a); });
    drawCoachBtn();
  }

  // 내가 고른 행동
  function act(ses, a) {
    const v = getView(ses);
    if (v.phase !== 'bet' || v.turn !== ses.me) return;
    if (ses.mode === 'guest') {
      if (ses.waiting) return;
      noteTurn(ses, v, a);
      ses.waiting = true;
      ses.net.send({ t: 'act', a }, true);
      renderGame(ses);
      return;
    }
    if (!ses.pending) return;
    noteTurn(ses, v, a);
    const p = ses.pending; ses.pending = null;
    p.resolve(a);
  }
  // 복기 노트용 기록 (선생님이 켜져 있을 때만)
  function noteTurn(ses, v, a) {
    if (!ses.coachAvail || !ses.cc || !ses.cc.data) return;
    const c = ses.cc.data, ch = c.byAction[a];
    if (ch) ses.turnLog.push({ street: v.street, chosenAct: a, bestAct: c.bestAction, delta: ch.delta, winPct: c.winPct, headline: c.headline });
  }

  // ─────────────────────────────────────────────────────────────
  // 시작: 혼자 / AI 구경
  // 한 기기 자리 목록 [{kind:'human'|'ai', name, emoji, tier}]
  function hotSeatsCfg() {
    if (hotPick) return hotPick.seats;
    return Array.from({ length: opt.hotN }, (_, i) => opt.hotSeats[i] === 'h'
      ? { kind: 'human', name: `플레이어${i + 1}`, emoji: ['🎴', '🌸', '🍀', '🔥', '🌙', '⭐'][i] }
      : { kind: 'ai', name: 'AI', emoji: '🤖', tier: opt.tier });
  }

  function startGame({ watch, hot }) {
    endSession();
    const n = watch ? opt.wMode : hot ? hotSeatsCfg().length : opt.mode;
    const s = S.create({ players: n, stacks: CHIPS.start(watch ? 'watch' : hot ? 'hot' : 'solo', n), seed: rand32() });
    const seats = [];
    let ai = 0;
    for (let i = 0; i < n; i++) {
      if (hot) {
        const hs = hotSeatsCfg()[i];
        if (hs.kind === 'human') seats.push({ ctrl: 'hot', name: hs.name, em: hs.emoji });
        else { seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length], em: AI_EMS[ai % AI_EMS.length], tier: hs.tier || 'normal' }); ai++; }
      } else if (i === 0 && !watch) seats.push({ ctrl: 'me', name: '나', em: '🎴' });
      else {
        const tr = watch ? ['hard', 'normal', 'easy'][i % 3] : opt.tier;
        seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length], em: TIER[tr].em === '🎴' ? AI_EMS[ai % AI_EMS.length] : TIER[tr].em, tier: tr });
        ai++;
      }
    }
    const ses = SES = { alive: true, mode: watch ? 'watch' : hot ? 'hot' : 'solo', n, me: hot ? -1 : 0, S: s, seats, pending: null, turnLog: [], coachAvail: !watch, coachOn: !watch };
    showScreen('play');
    ensureCoach(ses);
    runLoop(ses);
  }

  // ─────────────────────────────────────────────────────────────
  // 친구랑
  //  · 방장 PC/폰이 판 전체(덱·모든 패)를 쥐고 진행, 손님에게는 그 사람 시점(S.view)만 보냄
  //  · 손님 → 방장: {t:'hi'} (참가 알림) · {t:'act', a} (내 배팅)
  //  · 방장 → 손님: {t:'st', me, v, ro:[{name,em,ctrl}], coach} (그 사람 시점 상태) · {t:'full'} (이미 시작된 판)
  function startOnline({ net, role, cfg, players }) {
    endSession();
    cfg = cfg || {};
    const coachAvail = !!cfg.coach;               // 방장이 방에서 AI 선생님을 켠 경우만
    const coachOn = coachAvail;
    if (role === 'host') {
      const host = net.meta && net.meta.host;
      const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p))
        .filter(p => !p.watch)
        .sort((a, b) => (b.uid === host) - (a.uid === host) || (a.t || 0) - (b.t || 0))
        .slice(0, MAXP);
      const seats = plist.map((p, i) => ({ ctrl: p.uid === net.uid ? 'me' : 'remote', uid: p.uid, name: p.name || `친구${i + 1}`, em: p.uid === net.uid ? '🎴' : '🌸' }));
      const target = Math.max(seats.length, Math.min(MAXP, cfg.fill || 0));
      let ai = 0;
      while (seats.length < target) { seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length] + '(AI)', em: AI_EMS[ai % AI_EMS.length], tier: 'normal' }); ai++; }
      const n = Math.max(2, seats.length);
      while (seats.length < n) { seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length] + '(AI)', em: AI_EMS[ai % AI_EMS.length], tier: 'normal' }); ai++; }
      const s = S.create({ players: n, stacks: CHIPS.start('online', n), seed: rand32() });     // 씨앗은 방 설정에 싣지 않음 (덱을 거꾸로 계산 못 하게)
      const me = Math.max(0, seats.findIndex(x => x.ctrl === 'me'));
      const uidSeat = {};
      seats.forEach((x, i) => { if (x.uid && x.uid !== net.uid) uidSeat[x.uid] = i; });
      const ses = SES = { alive: true, mode: 'host', n, me, S: s, seats, net, cfg, uidSeat, pending: null, remoteWait: null, turnLog: [], coachAvail, coachOn, offs: [] };
      ses.offs.push(net.on('msg', (uid, m) => onHostMsg(ses, uid, m)));
      ses.offs.push(net.on('leave', uid => onHostLeave(ses, uid)));
      showScreen('play');
      ensureCoach(ses);
      runLoop(ses);
    } else {
      const ses = SES = { alive: true, mode: 'guest', n: 2, me: 0, V: null, seats: [], net, cfg, turnLog: [], coachAvail, coachOn, waiting: false, offs: [], lastRound: 0 };
      ses.offs.push(net.on('msg', m => onGuestMsg(ses, m)));
      showScreen('play');
      ensureCoach(ses);
      $('lbl').textContent = `👥 친구랑 섯다 (${net.code})`;
      $('sub').textContent = '방장이 판을 준비하는 중…';
      net.send({ t: 'hi' }, true);
      // 첫 상태가 안 오면 몇 번 더 인사
      let tries = 0;
      const t = setInterval(() => { if (!ses.alive || ses.V || ++tries > 8) { clearInterval(t); return; } net.send({ t: 'hi' }, true); }, 1500);
    }
  }

  // 방장: 손님 메시지
  function onHostMsg(ses, uid, m) {
    if (!ses.alive || !m) return;
    const i = ses.uidSeat[uid];
    if (m.t === 'hi') {
      if (i == null) { ses.net.send(uid, { t: 'full' }, true); return; }
      sendTo(ses, uid, i);
    } else if (m.t === 'act') {
      if (i == null) return;
      const w = ses.remoteWait;
      if (w && w.seat === i && ses.S.phase === 'bet' && ses.S.turn === i && S.isLegal(ses.S, m.a)) w.res(m.a);
      else sendTo(ses, uid, i);                     // 순서가 아니거나 안 되는 행동이면 지금 상태를 다시 알려 줌
    }
  }
  function onHostLeave(ses, uid) {
    const i = ses.uidSeat[uid];
    if (i == null || !ses.alive) return;
    const seat = ses.seats[i];
    seat.ctrl = 'ai'; seat.tier = 'normal'; seat.name = `${seat.name}(AI)`;      // 나간 자리는 AI 가 이어 받음
    delete ses.uidSeat[uid];
    if (ses.remoteWait && ses.remoteWait.seat === i) ses.remoteWait.res(null);
    publish(ses);
    renderGame(ses);
  }
  function rosterOf(ses) { return ses.seats.map(x => ({ name: x.name, em: x.em, ctrl: x.ctrl === 'ai' ? 'a' : 'h' })); }
  function sendTo(ses, uid, i) {
    try { ses.net.send(uid, { t: 'st', me: i, v: S.view(ses.S, i), ro: rosterOf(ses), coach: ses.coachAvail }, true); } catch (e) { console.error(e); }
  }
  function publish(ses) {
    if (ses.mode !== 'host') return;
    for (const [uid, i] of Object.entries(ses.uidSeat)) sendTo(ses, uid, i);
  }

  // 손님: 방장 메시지
  function onGuestMsg(ses, m) {
    if (!ses.alive || !m) return;
    if (m.t === 'full') { C.toast('이미 시작된 판이에요. 다음에 같이 해요'); if (window.ArenaUI) ArenaUI.leave(); return; }
    if (m.t !== 'st') return;
    const prev = ses.V;
    ses.V = m.v; ses.me = m.me; ses.n = m.v.n; ses.waiting = false;
    ses.seats = m.ro.map(r => ({ name: r.name, em: r.em, ctrl: r.ctrl === 'a' ? 'ai' : 'remote' }));
    if (!prev || prev.round !== m.v.round) ses.turnLog = [];
    renderGame(ses);
    if (m.v.phase === 'end') {
      if (ses.lastRound !== m.v.round) { ses.lastRound = m.v.round; showRoundResult(ses); }
    } else {
      if ($('resBox').hidden === false) $('resBox').hidden = true;
      if (!prev || prev.turn !== m.v.turn) sfx(m.v.turn === ses.me ? 'pop' : 'tap');
    }
  }

  // 방장: 한 사람 차례를 기다림 (제한 시간 90초가 지나면 AI 가 대신)
  function waitRemote(ses, seat) {
    return new Promise(res => {
      const done = a => { clearTimeout(tm); if (ses.remoteWait && ses.remoteWait.seat === seat) ses.remoteWait = null; res(a); };
      const tm = setTimeout(() => done(null), 90000);
      ses.remoteWait = { seat, res: done };
    });
  }

  // 한 기기: 다음 사람에게 넘기기 전 가림 화면 (공용 HotSeat.cover 가 있으면 그걸로, 아니면 같은 동작의 기본 화면)
  function coverFor(name, em) {
    if (window.HotSeat && typeof HotSeat.cover === 'function') {
      try { const r = HotSeat.cover({ name, emoji: em }); if (r && typeof r.then === 'function') return r; } catch (e) { console.error(e); }
    }
    return new Promise(res => {
      const ov = document.createElement('div');
      ov.className = 'hsx-cover';
      ov.innerHTML = `<div><div class="hsx-em">${esc(em || '🙂')}</div><h2>${esc(name)} 님 차례예요</h2><p>다른 사람은 화면을 보지 마세요<br>준비되면 아래 단추를 눌러 주세요</p><button class="btn primary big">내 패 보기</button></div>`;
      ov.querySelector('button').onclick = () => { ov.remove(); res(); };
      document.body.appendChild(ov);
    });
  }

  function aiChoose(ses, p) {
    const seat = ses.seats[p];
    return AI.choose(S.view(ses.S, p), seat.tier || 'normal', { seed: rand32() });
  }

  async function runLoop(ses) {
    try {
      while (ses.alive) {
        ses.turnLog = [];
        publish(ses);
        renderGame(ses);
        while (ses.S.phase === 'bet' && ses.alive) {
          renderGame(ses);
          const p = ses.S.turn, seat = ses.seats[p];
          let a;
          if (seat.ctrl === 'hot') {
            ses.me = -1; renderGame(ses);
            await coverFor(seat.name, seat.em);       // 앞사람 패가 안 보이게 가림 화면 → 누르면 내 패
            if (!ses.alive) return;
            ses.me = p; ses.cc = null;
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); sfx('pop'); });
            ses.me = -1;
          } else if (seat.ctrl === 'me') {
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); sfx('pop'); });
          } else if (seat.ctrl === 'remote') {
            a = await waitRemote(ses, p);
            if (a == null) { if (!ses.alive) return; await sleep(300); a = aiChoose(ses, p); }
          } else {
            await sleep(ses.mode === 'watch' ? 480 : 620);
            if (!ses.alive) return;
            a = aiChoose(ses, p);
          }
          if (!ses.alive) return;
          sfx(a === S.A_FOLD ? 'lose' : a === S.A_CALL ? 'tap' : 'coin');
          if (ses.mode !== 'watch') toastAct(ses, p, a);
          ses.S = S.step(ses.S, a).state;
          publish(ses);
          renderGame(ses);
        }
        if (!ses.alive) return;
        publish(ses);
        renderGame(ses);
        const next = await showRoundResult(ses);
        if (!ses.alive) return;
        if (next !== 'next') {
          if (ses.mode === 'host' && next === 'lobby' && window.ArenaUI) { ArenaUI.toLobby(); return; }
          goHome();
          return;
        }
        ses.S = S.nextRound(ses.S, { seed: rand32() });
      }
    } catch (e) {
      console.error(e);
    }
  }
  function toastAct(ses, p, a) {
    if (p === ses.me) return;
    C.toast(`${ses.seats[p].name}: ${ACT_NAME[a]}`, 900);
  }

  // 판 결과 창 — 방장/혼자는 '다음 판', 손님은 방장을 기다림
  function showRoundResult(ses) {
    return new Promise(resolve => {
      const v = getView(ses), r = v.result, me = ses.me;
      const solo = ses.mode === 'solo';
      const myPay = (r.payouts && r.payouts[me]) || 0;
      const iWon = r.kind !== 'rematch' && (r.winners || [r.winner]).includes(me);
      if (ses.mode !== 'guest') CHIPS.report(ses.mode, { round: v.round, coins: S.fastClone(v.coins), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl })), me });
      if (solo) {
        stats.played++;
        if (iWon) stats.won++;
        stats.coins = v.coins[me];
        C.save(KEY + 'stats', stats);
      }
      const hot = ses.mode === 'hot';
      if (hot) sfx('win');
      else if (ses.mode !== 'watch') {
        if (iWon) { sfx('win'); C.confetti({ particleCount: 55, spread: 60 }); }
        else sfx('lose');
      }

      const winnerName = r.winner != null && ses.seats[r.winner] ? ses.seats[r.winner].name : '';
      const title = r.kind === 'rematch'
        ? '🔄 사구파토 · 동점 재경기!'
        : hot ? `🎉 ${esc(winnerName)} 승리!`
        : iWon ? '🎉 승리! 판돈을 쓸어담았어요!'
        : `😿 ${esc(winnerName)} 승리`;
      const rows = r.evals.map(e => {
        const name = ses.seats[e.p] ? ses.seats[e.p].name : `자리${e.p + 1}`;
        const win = r.kind !== 'rematch' && (r.winners || []).includes(e.p);
        const pay = r.payouts ? r.payouts[e.p] : 0;
        const hand = e.hidden ? '<span class="small">비공개</span>' : `<b>${esc(e.effName || e.name)}</b> <span class="small">(${esc(S.cardName(e.c1))} · ${esc(S.cardName(e.c2))})</span>`;
        return `<tr class="${win ? 'win' : e.folded ? 'dim' : ''}">
          <td>${esc(name)}${e.p === me ? ' <span class="small">(나)</span>' : ''} ${e.folded ? '<span class="small">(다이)</span>' : ''}</td>
          <td class="n">${hand}${pay > 0 && r.kind !== 'rematch' ? ` <b style="color:#86efac">+${fmtN(pay)}</b>` : ''}</td>
        </tr>`;
      }).join('');

      let coachNote = '';
      if (ses.coachAvail && ses.turnLog.length) {
        const worst = ses.turnLog.slice().sort((a, b) => a.delta - b.delta)[0];
        const actName = a => ACT_NAME[a] || '콜';
        coachNote = `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:12px;padding:9px 11px;margin-top:8px;text-align:left;font-size:12.5px;color:#78350f">
          <b>🧑‍🏫 AI 선생님 복기 노트</b><br>
          ${worst && worst.delta < -5
            ? `• ${worst.street}차 배팅(승률 ${worst.winPct}%)에서 <b>[${actName(worst.chosenAct)}]</b> 대신 <b>[${actName(worst.bestAct)}]</b>을(를) 선택했다면 기댓값이 <b>+${Math.round(-worst.delta)}냥</b> 더 높았어요!`
            : `• 이번 판은 승률과 팟 오즈에 맞춰 아주 정석적인 배팅을 하셨어요! 👏`}
        </div>`;
      }

      $('resTitle').innerHTML = title;
      const bigTxt = r.kind === 'rematch' ? `이월 ${fmtN(r.carry || r.pot)}냥` : (hot && r.payouts && r.winner != null ? `+${fmtN(r.payouts[r.winner])}냥` : myPay > 0 ? `+${fmtN(myPay)}냥` : `판돈 ${fmtN(r.pot)}냥`);
      $('resBig').innerHTML = `<div class="resbig">${bigTxt}</div><p class="small" style="margin:2px 0">${esc(r.reason)}</p>`;
      $('resBody').innerHTML = `<table class="res-tbl">${rows}</table>${coachNote}`;
      $('resBtns').innerHTML = '';
      const done = val => { $('resBox').hidden = true; resolve(val); };
      const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); fn(); }; $('resBtns').append(b); };
      if (ses.mode === 'guest') {
        const p = document.createElement('p'); p.className = 'small'; p.textContent = '방장이 다음 판을 시작하면 이어서 해요'; p.style.width = '100%'; p.style.margin = '0';
        $('resBtns').append(p);
        mk('나가기', '', () => { $('resBox').hidden = true; goHome(); });
      } else {
        mk(r.kind === 'rematch' ? '🔥 묻고 더블 재경기 ▶' : '다음 판 ▶', 'primary', () => done('next'));
        if (ses.mode === 'host') mk('대기실로', '', () => done('lobby'));
        else mk('메뉴', '', () => done('menu'));
      }
      $('resBox').hidden = false;
    });
  }

  ART.install();
  drawMenu();
  showScreen('home');
  if (window.ArenaUI) ArenaUI.checkUrl(FRIEND);
})();

/* 정통 섯다 — 화면 · 둥근 테이블(2~6명) · 친구랑(방장이 판을 돌리고 각자에게 자기 패만 보냄 · 판 사이 준비 · 구경꾼 · 끊김 AI 대신 · 점수판 · 30초 시계) · AI 구경 · 🧑‍🏫 AI 선생님 (main.js) */
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
  const TURN_SEC = 30;                 // 친구랑: 한 차례 제한 시간 (넘으면 중급 AI 가 대신 둠)

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
    bank: C.store(KEY + 'bank', 'gbasic'), // 처음엔 🏦 기본 은행           // 친구랑: 은행 모임(gid) — null = 은행 안 씀 (연습 칩)
    bankName: C.store(KEY + 'bankName', '기본 은행'),
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
  // 그 장면에서 낸 행동 이름 (낼 돈이 없을 때 콜 = 체크)
  const actLabel = (st, p, a) => (a === S.A_CALL && Math.max(0, st.curBet - st.bets[p]) === 0 ? '체크' : ACT_NAME[a] || '콜');
  const iga = w => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이' : '가'); };

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
    drawReplayBtn();
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
  $('replayBtn').onclick = () => { sfx('tap'); openReplayList(); };
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
      hostEl.innerHTML = `<div class="optrow"><span class="small">빈자리</span><div class="seg" id="fFillSeg"></div></div><div data-bank></div>`;
      const drawF = () => segBtns(hostEl.querySelector('#fFillSeg'), [[0, '온 사람끼리'], [4, 'AI로 4명까지'], [MAXP, `AI로 ${MAXP}명까지`]], opt.fill, v => { opt.fill = +v; saveOpt('fill'); drawF(); });
      drawF();
      // 🏦 은행 모임 고르기 (대기실에 보일 때만 — 방 만들 때 임시로 부르는 건 건너뜀)
      const bx = hostEl.querySelector('[data-bank]');
      if (window.Bank && bx && hostEl.isConnected) Bank.lobbyPicker(bx, { bank: opt.bank, bankName: opt.bankName }, true, p => { opt.bank = p.bank || null; opt.bankName = p.bankName || null; saveOpt('bank'); saveOpt('bankName'); });
      return () => ({ fill: opt.fill, bank: opt.bank || null, bankName: opt.bank ? opt.bankName || null : null });
    },
    renderConfig: cfg => `${cfg && cfg.fill ? `빈자리는 AI로 ${cfg.fill}명까지` : '온 사람끼리'}${cfg && cfg.coach ? ' · AI 선생님' : ''}${window.Bank && Bank.label(cfg) ? ' · ' + Bank.label(cfg) : ''}`,
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
      if (SES.rpClose) { try { SES.rpClose(); } catch (e) {} }     // 🎞️ 다시 보기 줄·창 정리
      if (SES.cpBtn) { try { SES.cpBtn.destroy(); } catch (e) {} }
      if (SES.cp) { try { SES.cp.destroy(); } catch (e) {} }
      $('coachBtn').onclick = null;
      if (window.HotSeat && HotSeat.close) { try { HotSeat.close(); } catch (e) {} }
      document.querySelectorAll('.hsx-cover').forEach(e => e.remove());
      if (SES.offs) SES.offs.splice(0).forEach(f => { try { f(); } catch (e) {} });
      if (SES.bank) { try { SES.bank.detach(); } catch (e) {} }
      clockStop(SES);
      if (SES.modals) SES.modals.splice(0).forEach(f => { try { f(); } catch (e) {} });
    }
    SES = null;
    $('resBox').hidden = true;
    $('scoreBar').hidden = true;
    $('sub').classList.remove('myturn');
    drawBankBtns(null);
  }

  // 🏦 은행 (친구랑에서 방장이 모임을 고른 방만): 💰 빌리기 · 🏦 잔액·정산 창
  function drawBankBtns(ses) {
    const on = !!(ses && ses.bank);
    $('loanBtn').hidden = !on;
    $('bankBtn').hidden = !on;
  }
  function bankEvent(ses, ev) {
    if (!ses.alive || !ev) return;
    if (ev.op === 'queued') C.toast(ev.mine || ses.mode === 'guest' ? `💰 다음 판에 ${fmtN(ev.n)}칩을 받아요` : `💰 ${ev.name} 님이 ${fmtN(ev.n)}칩 빌리기 (다음 판에)`, 2200);
    else if (ev.op === 'loan') {
      C.toast(`💰 ${ev.name} 님이 은행에서 ${fmtN(ev.n)}칩 빌렸어요`, 2200);
      if (ses.mode === 'host' && ses.net) ses.net.broadcast({ t: '_bank', op: 'loan', name: ev.name, n: ev.n }, true);
    } else if (ev.op === 'no' || ev.op === 'error') C.toast('🏦 ' + (ev.msg || '은행 장부에 못 썼어요'), 2600);
  }
  $('loanBtn').onclick = async () => {
    const ses = SES;
    if (!ses || !ses.bank || !window.Bank) return;
    sfx('tap');
    if (!(await Bank.askLoan(ses.bank.gid)) || SES !== ses) return;
    if (ses.mode === 'guest') ses.bank.requestLoan(); else ses.bank.requestLoan(ses.me);
  };
  $('bankBtn').onclick = () => { if (SES && SES.bank && window.Bank) { sfx('tap'); Bank.panel({ game: 'seotda', gid: SES.bank.gid }); } };
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
    tbl.classList.remove('compact', 'tight');
    put();
    if (overlap()) { tbl.classList.add('compact'); put(); }
    if (overlap()) { tbl.classList.add('tight'); put(); }          // 그래도 겹치면 한 번 더 작게 (점수판이 늘어 낮아진 폰 화면의 6명)
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
    return `<div class="${cls.join(' ')}" data-q="${q}"><span class="nm">${esc(seat.em)} ${esc(seat.name)}${seat.sub ? ' 🤖' : ''}</span><span class="cn">🪙 ${fmtN(v.coins[q])}</span><div class="cds">${hwCardHtml(h[0], 'hw-mini', true)}${hwCardHtml(h[1], 'hw-mini', true)}</div>${status}</div>`;
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
        ses.cp = CoachPanel.create({ game: 'seotda', title: 'AI 선생님', bottom: Math.max(64, Math.round(window.innerHeight - tb.bottom + 6)), right: tb.width ? Math.max(6, Math.round(window.innerWidth - tb.right + 6)) : 10 });   // 테이블 오른쪽 아래 (가로 화면에서도 내 자리 칸을 안 가림)
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
    if (ses.rp) { renderReplay(ses); return; }                           // 🎞️ 다시 보기 중엔 그 장면을 그림 (친구 메시지가 와도)
    if (ses.mode === 'replay' || !(ses.mode === 'guest' ? ses.V : ses.S)) return;   // 방장: 은행 장부를 여는 동안은 아직 판 없음
    const v = getView(ses), me = ses.me, s = v;
    const spect = me < 0;                               // 한 기기에서 다음 사람을 기다리는 동안 (아무 패도 안 보임)
    const mi = spect ? 0 : me;
    const watch = ses.mode === 'watch';
    $('lbl').textContent = watch ? '🍿 AI 섯다 구경' : ses.drill ? '🎮 연습 · 그 장면부터' : ses.net ? `👥 친구랑 섯다 (${ses.net.code})` : ses.mode === 'hot' ? '📱 한 기기 섯다' : `🔥 정통 섯다 · ${TIER[opt.tier].name}`;
    $('coinPill').textContent = spect ? '🪙 —' : ses.chipWon ? `💰 내 돈 ${fmtN(Math.round(s.coins[mi] * ses.chipWon))}원` : `🪙 내 칩 ${fmtN(s.coins[mi])}냥`;   // 냥 = 게임 안 연습 칩 (은행 방이면 원)
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
    const mySeat = spect ? (ses.spec ? { em: '👀', name: '구경 중이에요 · 다음 판에 같이 해요' } : { em: '🪑', name: '다음 사람을 기다려요' }) : (ses.seats[me] || { em: '🎴', name: '나' });
    const myTurn = !watch && !spect && s.phase === 'bet' && s.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('meZone').classList.toggle('turn', myTurn);
    $('meZone').classList.toggle('pulse', myTurn && !!ses.net);               // 친구랑: 내 차례를 더 눈에 띄게
    drawSub(ses);
    if (ses.net && myTurn) { const bk = `${s.round}|${s.street}|${s.pot}|${s.raises}`; if (ses.bell !== bk) { ses.bell = bk; C.vibrate(40); } }
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
      showCoach(ses, `<p class="cp-desc">${spect ? (ses.spec ? '구경 중이에요. 판이 끝나면 방장이 다음 판에 넣어 줄 수 있어요' : '다음 사람 차례를 기다려요') : '판이 끝났어요. 결과를 확인해 보세요 🙂'}</p>`);
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
    drawScore(ses);
  }

  // 위 막대 작은 글씨: 몇 판째 · 단계. 친구랑에서 내 차례면 금색으로 뛰고 남은 초(⏱)가 같이 떠요
  function drawSub(ses) {
    if (!ses || !ses.alive || ses.rp || !(ses.mode === 'guest' ? ses.V : ses.S)) return;
    const s = getView(ses), me = ses.me;
    const myTurn = !!ses.net && me >= 0 && s.phase === 'bet' && s.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('sub').textContent = myTurn ? `${s.round}판 · 🔔 내 차례${ses.turnLeft != null ? ` ⏱${ses.turnLeft}` : '예요'}` : `${s.round}판 · ${s.street === 1 ? '1차 오픈 배팅' : '2차 본 배팅'} · ${s.n}명${ses.spec ? ' · 👀 구경' : ''}`;
    $('sub').classList.toggle('myturn', myTurn);
  }
  // 점수판 한 줄 (친구랑): 자리마다 전적 · 돈(은행이 있으면 원, 없으면 냥), 지금 차례는 금색, 구경 인원
  function drawScore(ses) {
    const el = $('scoreBar');
    if (!ses || !ses.alive || !ses.net || ses.rp || !(ses.mode === 'guest' ? ses.V : ses.S)) { el.hidden = true; return; }
    const v = getView(ses), sc = ses.score || {}, turnSeat = v.phase === 'bet' ? v.turn : -1;
    const seatUids = new Set(ses.seats.map(x => x.uid).filter(Boolean));
    const watching = Object.keys(ses.net.players || {}).filter(u => !seatUids.has(u)).length;
    el.hidden = false;
    el.innerHTML = ses.seats.map((x, q) => {
      const c = v.coins[q], money = c == null ? '' : ses.chipWon ? `${fmtN(Math.round(c * ses.chipWon))}원` : `${fmtN(c)}냥`;
      return `<span class="sbi${q === turnSeat ? ' on' : ''}${v.folded[q] ? ' rest' : ''}"><b>${esc(q === ses.me ? '나' : x.name)}</b> ${(sc.w && sc.w[q]) || 0}승${(sc.l && sc.l[q]) || 0}패${money ? ' ' + money : ''}</span>`;
    }).join('') + (watching ? `<span class="sbi">👀 구경 ${watching}</span>` : '');
  }

  // ⏱ 친구랑 30초 시계: 방장은 차례마다 켜서 끝나면 AI 가 대신 두게 하고, 손님은 받은 남은 초를 보여 주기만 해요
  function clockStop(ses) {
    if (!ses) return;
    if (ses.clock) { clearInterval(ses.clock.t); ses.clock = null; }
    if (ses.turnLeft != null) { ses.turnLeft = null; if (ses.alive) drawSub(ses); }
  }
  function clockStart(ses, left, show, onExpire) {
    clockStop(ses);
    const end = Date.now() + left * 1000, clk = ses.clock = { end, t: 0 };
    clk.t = setInterval(() => {
      if (!ses.alive || ses.clock !== clk) { clearInterval(clk.t); return; }
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (show && l !== ses.turnLeft) { ses.turnLeft = l; if (l === 10) { C.toast('⏱ 10초 남았어요', 1500); C.vibrate(30); } drawSub(ses); }
      if (l <= 0) { clearInterval(clk.t); if (onExpire) onExpire(); }
    }, 250);
    if (show) { ses.turnLeft = left; drawSub(ses); }
  }

  // 내가 고른 행동
  function act(ses, a) {
    const v = getView(ses);
    if (v.phase !== 'bet' || v.turn !== ses.me) return;
    if (ses.mode === 'guest') {
      if (ses.waiting) return;
      noteTurn(ses, v, a);
      ses.waiting = true;
      ses.net.send({ t: 'act', a, r: v.round }, true);
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
  //  · 방장 PC/폰이 판 전체(덱·모든 패)를 쥐고 진행, 손님에게는 그 사람 시점(S.view)만 보냄 (구경꾼은 아무 패도 안 보이는 시점, me = -1)
  //  · 손님 → 방장: {t:'hi'} (참가·다시 들어옴 알림) · {t:'act', a, r} (내 배팅) · {t:'_ready', round} (판 사이 준비)
  //  · 방장 → 손님: {t:'st', me, v, ro:[{name,em,ctrl,u,b}], coach, sc:{w,l}, left} (그 사람 시점 상태 + 전적 + 내 차례 남은 초) · {t:'_rl', round, uids} (누가 준비했나)
  //  · 모두 꼭 도착(rel=true). 손님이 새로 고침해도 같은 uid 라 방장이 자리를 지켜 두었다가 돌려줌
  const seatOfUid = (ses, uid) => ses.seats.findIndex(x => x.uid === uid && x.ctrl !== 'me');
  function startOnline({ net, role, cfg, players }) {
    endSession();
    cfg = cfg || {};
    const coachAvail = !!cfg.coach;               // 방장이 방에서 AI 선생님을 켠 경우만
    const coachOn = coachAvail;
    // 이 판(세션)이 붙인 듣기는 세션이 끝날 때 뗌 (대기실로 돌아갔다 다시 시작해도 겹치지 않게)
    const hook = (ses, ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') ses.offs.push(off); };
    // 🏦 은행 모임이 있으면 1칩 = 몇 원인지 알아 둠 (점수판·내 칩을 원으로)
    const loadWon = ses => { if (cfg.bank && window.Bank && Bank.getMeta) Bank.getMeta(cfg.bank).then(m => { if (SES === ses && m && m.chipWon) { ses.chipWon = m.chipWon; renderGame(ses); } }, () => {}); };
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
      const me = Math.max(0, seats.findIndex(x => x.ctrl === 'me'));
      const ses = SES = { alive: true, mode: 'host', n, me, S: null, seats, net, cfg, pending: null, remoteWait: null, turnLog: [], coachAvail, coachOn, offs: [], bank: null,
        score: { w: seats.map(() => 0), l: seats.map(() => 0) }, readyMap: {}, joinPick: {}, watchers: new Set(), modals: [], chipWon: 0, turnLeft: null, clock: null };
      hook(ses, 'msg', (uid, m) => onHostMsg(ses, uid, m));
      hook(ses, 'leave', uid => onHostLeave(ses, uid));
      hook(ses, 'join', uid => onHostJoin(ses, uid));
      hook(ses, 'players', () => { if (SES !== ses) return; drawScore(ses); if (ses.drawReady) ses.drawReady(); });     // 구경 인원 · 준비 목록
      showScreen('play');
      loadWon(ses);
      // 시작 칩: 은행 모임이 있으면 각자 잔액(없으면 자동으로 빌림), AI 자리·은행 안 씀은 기본 칩
      const base = CHIPS.start('online', n);
      const go = stacks => {
        if (!ses.alive) return;
        ses.S = S.create({ players: n, stacks: base.map((b, i) => (stacks && stacks[i] > 0 ? stacks[i] : b)), seed: rand32() });     // 씨앗은 방 설정에 싣지 않음 (덱을 거꾸로 계산 못 하게)
        ensureCoach(ses);
        drawBankBtns(ses);
        runLoop(ses);
      };
      if (cfg.bank && window.Bank) {
        ses.bank = Bank.attach({ game: 'seotda', net, cfg, seats, min: 30, onEvent: ev => bankEvent(ses, ev) });
        $('lbl').textContent = `👥 친구랑 섯다 (${net.code})`;
        $('sub').textContent = '🏦 은행 장부를 여는 중…';
        ses.bank.ready.then(go);
      } else go(null);
    } else {
      const ses = SES = { alive: true, mode: 'guest', n: 2, me: 0, V: null, seats: [], net, cfg, turnLog: [], coachAvail, coachOn, waiting: false, offs: [], lastRound: 0, bank: null,
        score: null, readyMap: {}, spec: false, modals: [], chipWon: 0, turnLeft: null, clock: null };
      hook(ses, 'msg', m => onGuestMsg(ses, m));
      hook(ses, 'players', () => { if (SES !== ses) return; drawScore(ses); if (ses.drawReady) ses.drawReady(); });
      if (cfg.bank && window.Bank) ses.bank = Bank.attach({ game: 'seotda', net, cfg, role: 'guest', onEvent: ev => bankEvent(ses, ev) });
      showScreen('play');
      loadWon(ses);
      drawBankBtns(ses);
      ensureCoach(ses);
      $('lbl').textContent = `👥 친구랑 섯다 (${net.code})`;
      $('sub').textContent = '방장이 판을 준비하는 중…';
      net.send({ t: 'hi' }, true);
      // 첫 상태가 안 오면 계속 인사 (방장이 은행 장부를 여는 동안이나 다시 들어오는 길 포함)
      let tries = 0;
      const t = setInterval(() => { if (!ses.alive || ses.V || ++tries > 40) { clearInterval(t); return; } net.send({ t: 'hi' }, true); }, 1500);
    }
  }

  // 방장: 손님 메시지
  function onHostMsg(ses, uid, m) {
    if (!ses.alive || !m) return;
    if (m.t === '_ready') { onHostReady(ses, uid, m); return; }
    if (!ses.S) return;                                     // 판 준비 전 인사는 판이 시작될 때 publish 로 대신
    const i = seatOfUid(ses, uid);
    if (i >= 0 && ses.seats[i].sub) restoreSeat(ses, i);    // AI 가 대신 치던 자리인데 본인 메시지가 오면 돌아온 것
    if (m.t === 'hi') {
      if (i < 0) { ses.watchers.add(uid); sendTo(ses, uid, -1); }       // 앉을 자리가 없으면 구경 (다음 판에 방장이 넣어 줄 수 있음)
      else sendTo(ses, uid, i);
      if (ses.S.phase === 'end') sendReadyList(ses, uid);
    } else if (m.t === 'act') {
      if (i < 0) return;
      const w = ses.remoteWait;
      if (w && w.seat === i && ses.S.phase === 'bet' && ses.S.turn === i && (m.r == null || m.r === ses.S.round) && S.isLegal(ses.S, m.a)) w.res(m.a);
      else sendTo(ses, uid, i);                     // 순서가 아니거나 안 되는 행동이면 지금 상태를 다시 알려 줌
    }
  }
  // 방장: 손님이 (다시) 들어옴 — 앉았던 사람이면 자리를 돌려주고, 아니면 구경
  function onHostJoin(ses, uid) {
    if (!ses.alive) return;
    const i = seatOfUid(ses, uid);
    if (i >= 0) {
      if (ses.goneAsk && ses.goneAsk.uid === uid) { try { ses.goneAsk.close(); } catch (e) {} }
      if (ses.seats[i].sub) restoreSeat(ses, i);
      if (ses.S) { sendTo(ses, uid, i); if (ses.S.phase === 'end') sendReadyList(ses, uid); }
    } else if (ses.S) {
      const nm = ((ses.net.players || {})[uid] || {}).name || '친구';
      C.toast(`👀 ${nm} 님이 구경하러 왔어요`, 2000);
      ses.watchers.add(uid);
      sendTo(ses, uid, -1);
    }
    drawScore(ses); if (ses.drawReady) ses.drawReady();
  }
  function restoreSeat(ses, i) {
    const st = ses.seats[i];
    st.sub = false; st.drop = false; st.ctrl = 'remote'; st.tier = null;
    C.toast(`${st.name} 님이 돌아왔어요. 다시 직접 쳐요`, 2400);
    try { ses.net.chat(`🙌 ${st.name} 님이 돌아와서 직접 쳐요`); } catch (e) {}
    publish(ses); renderGame(ses);
  }
  // 방장: 앉은 사람 연결이 끊김 — 5초 안에 안 돌아오면 어떻게 할지 물음 (새로 고침은 금방 돌아와서 안 물음)
  function onHostLeave(ses, uid) {
    if (!ses.alive) return;
    ses.watchers.delete(uid);
    const i = seatOfUid(ses, uid);
    if (i < 0) { drawScore(ses); if (ses.drawReady) ses.drawReady(); return; }
    const st = ses.seats[i];
    C.toast(`${st.name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    drawScore(ses); if (ses.drawReady) ses.drawReady();
    setTimeout(() => {
      if (!ses.alive || SES !== ses || (ses.net.players || {})[uid] || ses.seats.indexOf(st) < 0 || st.sub || ses.goneAsk) return;
      askGone(ses, ses.seats.indexOf(st));
    }, 5000);
  }
  const canDropSeat = ses => ses.seats.filter(x => !x.drop).length > 2 && !ses.bank;     // 빼고도 2명 이상 남고, 은행 방이 아닐 때만
  function askGone(ses, i) {
    const st = ses.seats[i]; if (!st || st.sub || ses.goneAsk) return;
    const close = C.modal({
      title: `🔌 ${st.name} 님이 나갔어요`, cls: 'goneAsk',
      html: `<p class="gone-note">어떻게 할까요? AI 는 🎴 중급이 대신 쳐요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.${ses.bank ? '<br><span class="small">은행 방은 자리를 빼지 않고 AI 가 대신 쳐요</span>' : ''}</p>`,
      buttons: [{ label: '🤖 AI가 대신 쳐요', primary: true, onClick: () => subAI(ses, ses.seats.indexOf(st), false) }]
        .concat(canDropSeat(ses) ? [{ label: '👋 다음 판부터 빼기', onClick: () => subAI(ses, ses.seats.indexOf(st), true) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { try { ses.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} if (window.ArenaUI && ArenaUI.net === ses.net) ArenaUI.toLobby(); } }, { label: '⏳ 기다릴게요' }]),
      dismiss: false,
      onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; ses.modals = ses.modals.filter(x => x !== close); },
    });
    ses.goneAsk = { uid: st.uid, close }; ses.modals.push(close);
  }
  // 나간 자리를 AI 가 이어 받음 (drop 이면 이번 판만 AI 가 치고 다음 판부터 자리가 빠짐). 돌아오면 restoreSeat 로 다시 본인
  function subAI(ses, i, drop) {
    const st = ses.seats[i]; if (!st || !ses.alive) return;
    st.sub = true; st.drop = !!drop; st.ctrl = 'ai'; st.tier = 'normal';
    try { ses.net.chat(drop ? `🤖 ${st.name} 님 자리는 이번 판만 AI 가 치고, 다음 판부터 빠져요` : `🤖 ${st.name} 님 자리는 AI 가 대신 쳐요 (돌아오면 다시 직접)`); } catch (e) {}
    if (ses.remoteWait && ses.remoteWait.seat === i) ses.remoteWait.res(null);       // 지금 그 자리 차례를 기다리는 중이면 AI 가 바로 둠
    publish(ses); renderGame(ses);
    if (ses.drawReady) ses.drawReady();
  }
  const rosterOf = ses => ses.seats.map(x => ({ name: x.name, em: x.em, ctrl: x.ctrl === 'ai' ? 'a' : 'h', u: x.uid || null, b: x.sub ? 1 : 0 }));
  // 그 사람 시점 상태 한 묶음 (i = -1 이면 구경꾼: 아무 패도 안 보임)
  function packSt(ses, i) {
    const left = ses.clock && ses.S.phase === 'bet' ? Math.max(0, Math.ceil((ses.clock.end - Date.now()) / 1000)) : null;
    return { t: 'st', me: i, v: S.view(ses.S, i), ro: rosterOf(ses), coach: ses.coachAvail, sc: ses.score, left };
  }
  function sendTo(ses, uid, i) {
    try { ses.net.send(uid, packSt(ses, i), true); } catch (e) { console.error(e); }
  }
  function publish(ses) {
    if (ses.mode !== 'host' || !ses.S) return;
    const pl = ses.net.players || {};
    ses.seats.forEach((x, i) => { if (x.uid && x.uid !== ses.net.uid && pl[x.uid]) sendTo(ses, x.uid, i); });
    for (const u of [...ses.watchers]) { if (pl[u]) sendTo(ses, u, -1); else ses.watchers.delete(u); }
  }

  // 판 사이 '준비': 손님이 누르면 방장이 모아서 모두에게 알림 (구경꾼이 누르면 '다음 판에 낄래요')
  const readyOf = (ses, r) => (ses.readyMap[r] = ses.readyMap[r] || new Set());
  function sendReadyList(ses, uid) {
    const m = { t: '_rl', round: ses.S.round, uids: [...readyOf(ses, ses.S.round)] };
    if (uid) ses.net.send(uid, m, true); else ses.net.broadcast(m, true);
  }
  function onHostReady(ses, uid, m) {
    if (!ses.S || ses.S.phase !== 'end' || m.round !== ses.S.round) return;
    const i = seatOfUid(ses, uid);
    if (i >= 0 && ses.seats[i].sub) restoreSeat(ses, i);
    readyOf(ses, m.round).add(uid);
    if (i < 0) ses.joinPick[uid] = true;                    // 구경꾼이 '낄래요' 를 누르면 일단 체크해 둠 (방장이 풀 수 있음)
    sendReadyList(ses);
    if (ses.drawReady) ses.drawReady();
  }

  // 방장: 다음 판 자리 정하기 — 다음 판부터 빠질 자리를 빼고, 방장이 체크한 구경꾼을 최대 인원까지 앉힘 (칩·전적은 자리 따라감)
  function reseatForNext(ses) {
    const old = ses.seats, prev = ses.S, pl = ses.net.players || {};
    let keep = old.map((x, i) => i).filter(i => !old[i].drop);
    const have = new Set(old.map(x => x.uid).filter(Boolean));
    const fresh = Object.keys(pl).filter(u => !have.has(u) && !(pl[u] && pl[u].watch) && ses.joinPick[u]).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    if (keep.length + Math.min(fresh.length, Math.max(0, MAXP - keep.length)) < 2) keep = old.map((x, i) => i);     // 2명 밑으로는 못 빼요
    const add = fresh.slice(0, Math.max(0, MAXP - keep.length));
    if (!add.length && keep.length === old.length) { old.forEach(x => { x.drop = false; }); return; }
    const idx = {}; keep.forEach((o, k) => { idx[o] = k; });
    const gone = old.filter((x, i) => idx[i] == null).map(x => x.name);
    const p = S.fastClone(prev), start = CHIPS.start('online', 1)[0];
    p.n = keep.length + add.length;
    p.coins = keep.map(i => prev.coins[i]).concat(add.map(() => start));
    p.first = idx[prev.first] != null ? idx[prev.first] : 0;
    if (p.result && p.result.winner != null) p.result.winner = idx[p.result.winner] != null ? idx[p.result.winner] : null;
    const sc = ses.score;
    ses.score = { w: keep.map(i => sc.w[i] || 0).concat(add.map(() => 0)), l: keep.map(i => sc.l[i] || 0).concat(add.map(() => 0)) };
    const seats = keep.map(i => old[i]);
    for (const u of add) {
      const k = seats.length;
      seats.push({ ctrl: 'remote', uid: u, name: (pl[u] && pl[u].name) || `친구${k + 1}`, em: '🌸' });
      delete ses.joinPick[u]; ses.watchers.delete(u);
    }
    old.splice(0, old.length, ...seats);                    // 은행 장부가 같은 배열을 보고 있어서 통째로 바꾸지 않고 자리만 갈아 끼움
    ses.n = p.n; ses.me = Math.max(0, old.findIndex(x => x.ctrl === 'me')); ses.S = p;
    const msg = [add.length ? `${add.map(u => (pl[u] && pl[u].name) || '친구').join(', ')} 님 합류` : '', gone.length ? `${gone.join(', ')} 님 빠짐` : ''].filter(Boolean).join(' · ');
    C.toast(`${msg} → ${p.n}명`, 2600);
    try { ses.net.chat(`📣 ${msg} → 이번 판부터 ${p.n}명`); } catch (e) {}
  }
  // 판이 끝날 때 한 번: 이긴 자리 승, 나머지 패 (재경기는 건너뜀)
  function tally(ses) {
    const r = ses.S.result;
    if (!r || r.kind === 'rematch' || ses.tallied === ses.S.round) return;
    ses.tallied = ses.S.round;
    for (let q = 0; q < ses.S.n; q++) { const k = (r.winners || []).includes(q) ? 'w' : 'l'; ses.score[k][q] = (ses.score[k][q] || 0) + 1; }
  }

  // 손님: 방장 메시지
  function onGuestMsg(ses, m) {
    if (!ses.alive || !m) return;
    if (m.t === 'full') { C.toast('이미 시작된 판이에요. 다음에 같이 해요'); if (window.ArenaUI) ArenaUI.leave(); return; }
    if (m.t === '_rl') { const R = readyOf(ses, m.round); (m.uids || []).forEach(u => R.add(u)); if (ses.drawReady) ses.drawReady(); return; }
    if (m.t !== 'st') return;
    const prev = ses.V, wasSpec = ses.spec;
    ses.V = m.v; ses.me = m.me; ses.n = m.v.n; ses.waiting = false; ses.spec = m.me < 0;
    ses.seats = m.ro.map(r => ({ name: r.name, em: r.em, ctrl: r.ctrl === 'a' ? 'ai' : 'remote', uid: r.u || null, sub: !!r.b }));
    if (m.sc) ses.score = m.sc;
    if (!prev || prev.round !== m.v.round) ses.turnLog = [];
    // 내 차례 시계: 방장이 보낸 남은 초부터 세기만 해요 (시간이 다 되면 방장이 AI 로 대신 둠)
    const mine = m.me >= 0 && m.v.phase === 'bet' && m.v.turn === m.me;
    if (mine && m.left != null) clockStart(ses, m.left, true, null);
    else if (!mine) clockStop(ses);
    renderGame(ses);
    if (wasSpec && !ses.spec) { C.toast('🎉 자리에 앉았어요! 같이 해요', 2400); sfx('pop'); }
    if (m.v.phase === 'end') {
      if (ses.lastRound !== m.v.round) { ses.lastRound = m.v.round; showRoundResult(ses); }
    } else {
      if ($('resBox').hidden === false) $('resBox').hidden = true;
      ses.drawReady = null;
      if (!prev || prev.turn !== m.v.turn) sfx(m.v.turn === ses.me ? 'pop' : 'tap');
    }
  }

  // 방장: 한 사람 차례를 기다림 (시계 30초가 먼저 끝나 AI 가 대신 하고, 이건 못 받았을 때를 위한 여유)
  function waitRemote(ses, seat) {
    return new Promise(res => {
      const done = a => { clearTimeout(tm); if (ses.remoteWait && ses.remoteWait.seat === seat) ses.remoteWait = null; res(a); };
      const tm = setTimeout(() => done(null), (TURN_SEC + 8) * 1000);
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
        // 🎞️ 복기용 기록: 이 판 처음 상태 + 행동 차례 (같은 규칙 엔진으로 그대로 다시 둠). 판 전체를 쥔 쪽만 (손님은 남의 패를 몰라서 안 함)
        ses.rec = canRecord(ses) ? { at: Date.now(), kind: ses.mode, start: S.fastClone(ses.S), acts: [],
          seats: ses.seats.map(x => ({ name: x.ctrl === 'me' ? '나' : x.name, em: x.em, tier: x.ctrl === 'ai' ? x.tier : undefined })) } : null;
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
            // 친구랑: 30초 안에 못 고르면 중급 AI 가 대신 둠 (⏱ 남은 초는 위 막대에, 10초 남으면 알림)
            if (ses.mode === 'host') clockStart(ses, TURN_SEC, true, () => { const pe = ses.pending; if (!pe) return; C.toast('⏱ 30초가 지나서 AI 가 대신 냈어요', 2000); ses.pending = null; pe.resolve(aiChoose(ses, p)); });
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); sfx('pop'); });
            clockStop(ses);
          } else if (seat.ctrl === 'remote') {
            clockStart(ses, TURN_SEC, false, () => { if (ses.remoteWait && ses.remoteWait.seat === p) ses.remoteWait.res(null); });   // 시간이 다 되면 AI 가 대신
            if (seat.uid && (ses.net.players || {})[seat.uid]) sendTo(ses, seat.uid, p);       // 손님 화면에 남은 초가 뜨게 한 번 더
            a = await waitRemote(ses, p);
            clockStop(ses);
            if (a == null) { if (!ses.alive) return; if (ses.seats[p] === seat && seat.ctrl === 'remote') C.toast(`⏱ ${seat.name} 님 시간이 지나서 AI 가 대신 냈어요`, 2000); await sleep(300); a = aiChoose(ses, p); }
          } else {
            await sleep(ses.mode === 'watch' ? 480 : 620);
            if (!ses.alive) return;
            a = aiChoose(ses, p);
          }
          if (!ses.alive) return;
          if (!S.isLegal(ses.S, a)) a = S.A_CALL;           // 엔진도 똑같이 콜로 바꿈 — 기록·알림은 실제로 된 행동으로
          if (ses.rec) ses.rec.acts.push(a);
          sfx(a === S.A_FOLD ? 'lose' : a === S.A_CALL ? 'tap' : 'coin');
          if (ses.mode !== 'watch') toastAct(ses, p, a);
          ses.S = S.step(ses.S, a).state;
          publish(ses);
          renderGame(ses);
        }
        if (!ses.alive) return;
        if (ses.rec && ses.rec.acts.length && ses.S.phase === 'end') saveReplay(ses.rec, ses.S);
        if (ses.mode === 'host') tally(ses);
        publish(ses);
        renderGame(ses);
        const next = await showRoundResult(ses);
        if (!ses.alive) return;
        if (next === 'retry' && ses.drill) {                 // 🎮 연습: 같은 장면을 한 번 더
          ses.S = S.fastClone(ses.drill.st); ses.cc = null;
          C.toast('🔁 그 장면으로 돌아왔어요', 1600);
          continue;
        }
        if (next !== 'next') {
          if (ses.mode === 'host' && next === 'lobby' && window.ArenaUI) { ArenaUI.toLobby(); return; }
          goHome();
          return;
        }
        // 은행: 빌리기 요청 + 칩이 모자란 사람(학교비 3번 미만)은 은행에서 빌려 채움, 공짜 리필은 AI 자리만
        let refill;
        if (ses.bank) {
          $('sub').textContent = '🏦 장부에 쓰는 중…';
          const r = await ses.bank.beforeNext({ coins: ses.S.coins, min: ses.S.ante * 3 });
          if (!ses.alive) return;
          ses.S.coins = r.coins;
        }
        if (ses.mode === 'host') reseatForNext(ses);          // 친구랑: 빠질 사람은 빼고, 방장이 체크한 구경꾼은 앉힘
        if (ses.bank) refill = ses.seats.map((x, i) => !ses.bank.tracks(i));
        ses.S = S.nextRound(ses.S, { seed: rand32(), refill });
      }
    } catch (e) {
      console.error(e);
    }
  }
  function toastAct(ses, p, a) {
    if (p === ses.me) return;
    C.toast(`${ses.seats[p].name}: ${ACT_NAME[a]}`, 900);
  }

  // 결과 창 안 '준비' 목록: 앉은 사람 ✅/⏳/🔌, 구경 N명. 방장은 끊긴 사람을 AI 로 바꾸거나 빼고, 구경꾼을 체크해 다음 판부터 앉힘. 다 준비돼야 '다음 판' 이 켜짐
  function mountReady(ses, round, nb, fb, label) {
    const host = ses.mode === 'host', rb = document.createElement('div');
    rb.className = 'rdy'; $('resBody').appendChild(rb);
    const draw = () => {
      if (!rb.isConnected || !ses.alive || !ses.net) return;
      const pl = ses.net.players || {}, R = readyOf(ses, round), hostUid = host ? ses.net.uid : (ses.net.meta || {}).host;
      const seated = [];
      ses.seats.forEach((x, i) => {
        if (x.ctrl === 'ai' && !x.sub) return;                             // 처음부터 AI 인 자리는 안 보임
        if (x.uid && x.uid === hostUid) { seated.push(`<span class="ok">👑 ${esc(x.name)}</span>`); return; }
        const gone = !pl[x.uid], ok = R.has(x.uid) || x.sub;
        const fix = host && gone && !x.sub ? ` <button type="button" data-ai="${i}">🤖 AI</button>${canDropSeat(ses) ? ` <button type="button" data-drop="${i}">👋 빼기</button>` : ''}` : '';
        seated.push(`<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(x.name)}${x.sub ? ' (AI)' : ''}${fix}</span>`);
      });
      const seatUids = new Set(ses.seats.map(x => x.uid).filter(Boolean));
      const watchers = Object.keys(pl).filter(u => !seatUids.has(u));
      const nameOf = u => esc((pl[u] && pl[u].name) || '친구');
      const wl = watchers.map(u => host ? `<label><input type="checkbox" data-join="${esc(u)}" ${ses.joinPick[u] ? 'checked' : ''}> ${nameOf(u)}${R.has(u) ? ' ✋' : ''}</label>` : `<span>${nameOf(u)}${R.has(u) ? ' ✋' : ''}</span>`).join('');
      rb.innerHTML = `<div class="rdy-row">${seated.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? ` · 체크하면 다음 판부터 같이 (최대 ${MAXP}명)` : ''}: ${wl}</div>` : ''}`;
      if (!host) return;
      const need = ses.seats.filter(x => x.ctrl === 'remote'), k = need.filter(x => R.has(x.uid)).length, all = k === need.length;
      nb.disabled = !all; nb.textContent = all ? label : `${label.replace(' ▶', '')} (준비 ${k}/${need.length})`;
      if (fb) fb.hidden = all;
      rb.querySelectorAll('[data-join]').forEach(c => { c.onchange = () => { ses.joinPick[c.dataset.join] = c.checked; }; });
      rb.querySelectorAll('[data-ai]').forEach(b => { b.onclick = () => { subAI(ses, +b.dataset.ai, false); draw(); }; });
      rb.querySelectorAll('[data-drop]').forEach(b => { b.onclick = () => { subAI(ses, +b.dataset.drop, true); draw(); }; });
    };
    draw();
    return draw;
  }

  // 판 결과 창 — 방장/혼자는 '다음 판', 손님은 '준비' 를 누르고 방장을 기다림
  function showRoundResult(ses) {
    return new Promise(resolve => {
      const v = getView(ses), r = v.result, me = ses.me;
      const solo = ses.mode === 'solo';
      const drill = !!ses.drill;                            // 🎮 복기에서 '여기서부터 내가 두기' — 전적·칩·장부에 안 넣음
      const myPay = (r.payouts && r.payouts[me]) || 0;
      const iWon = r.kind !== 'rematch' && (r.winners || [r.winner]).includes(me);
      // 재경기(사구파토)는 판돈이 다음 판으로 넘어가 칩이 아직 탁자 위 → 알리지 않음 (다음 판 결과에 합쳐짐)
      if (ses.mode !== 'guest' && r.kind !== 'rematch' && !drill) CHIPS.report(ses.mode, { round: v.round, coins: S.fastClone(v.coins), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl, uid: x.uid })), me });
      if (solo && !drill) {
        stats.played++;
        if (iWon) stats.won++;
        stats.coins = v.coins[me];
        C.save(KEY + 'stats', stats);
      }
      const hot = ses.mode === 'hot';
      if (hot) sfx('win');
      else if (ses.mode !== 'watch' && !ses.spec) {
        if (iWon) { sfx('win'); C.confetti({ particleCount: 55, spread: 60 }); }
        else sfx('lose');
      }

      const winnerName = r.winner != null && ses.seats[r.winner] ? ses.seats[r.winner].name : '';
      const title = r.kind === 'rematch'
        ? '🔄 사구파토 · 동점 재경기!'
        : hot ? `🎉 ${esc(winnerName)} 승리!`
        : ses.spec ? `👀 ${esc(winnerName)} 승리`
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
      $('resBody').innerHTML = `<table class="res-tbl">${rows}</table>${coachNote}${drill ? '<p class="small rp-note">🎮 연습 판이라 전적·칩 기록에 안 들어가요</p>' : ''}`;
      $('resBtns').innerHTML = '';
      const done = val => { $('resBox').hidden = true; ses.drawReady = null; resolve(val); };
      const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); fn(); }; $('resBtns').append(b); return b; };
      let nb = null, fb = null;
      const nextLabel = r.kind === 'rematch' ? '🔥 묻고 더블 재경기 ▶' : '다음 판 ▶';
      // 🎞️ 다시 보기: 결과 창을 잠깐 내리고 이 판을 처음부터 (끝나면 결과 창으로). 친구 방에선 '여기서부터 내가 두기' 가 안 보임
      const rec = ses.rec && ses.rec.acts.length ? ses.rec : null;
      const openInline = () => {
        $('resBox').hidden = true;
        runReplay(ses, rec, true).then(res => {
          if (!ses.alive || SES !== ses) return;
          if (res && res.branch && startBranch(rec, res.branch.k, res.branch.seat)) { done('branch'); return; }
          $('resBox').hidden = false;
        });
      };
      if (drill) {
        mk('🔁 그 장면 다시', 'primary', () => done('retry'));
        mk('메뉴', '', () => done('menu'));
      } else if (ses.mode === 'guest') {
        // 손님: '✋ 준비' (구경꾼은 '다음 판에 낄래요') 만 누르고, 시작은 방장이 해요
        const R = readyOf(ses, v.round), paint = () => {
          const on = R.has(ses.net.uid);
          nb.textContent = on ? (ses.spec ? '✅ 신청했어요 · 방장을 기다려요' : '✅ 준비 완료 · 방장을 기다려요') : ses.spec ? '✋ 다음 판에 낄래요' : '✋ 준비';
          nb.disabled = on;
        };
        nb = mk('', 'primary', () => { R.add(ses.net.uid); ses.net.send({ t: '_ready', round: v.round }, true); paint(); if (ses.drawReady) ses.drawReady(); });
        paint();
        if (ses.bank && !ses.spec) mk('💰 빌리기', '', () => $('loanBtn').click());      // 결과 창이 아래 단추를 가리므로 여기에도
        mk('나가기', '', () => { $('resBox').hidden = true; goHome(); });
        ses.drawReady = mountReady(ses, v.round, nb, null, nextLabel);
      } else {
        nb = mk(nextLabel, 'primary', () => done('next'));
        if (ses.mode === 'host') fb = mk('안 기다리고 시작', '', () => done('next'));
        if (ses.mode === 'host' && ses.bank && window.Bank) {
          mk('💰 빌리기', '', () => $('loanBtn').click());
          mk('🏦 정산', '', () => ses.bank.flush().then(() => Bank.panel({ game: 'seotda', gid: ses.bank.gid, tab: 'settle' })));
        }
        if (rec) mk('🎞️ 다시 보기', '', openInline);
        if (ses.mode === 'host') mk('대기실로', '', () => done('lobby'));
        else mk('메뉴', '', () => done('menu'));
        if (ses.mode === 'host') ses.drawReady = mountReady(ses, v.round, nb, fb, nextLabel);
      }
      $('resBox').hidden = false;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 🎞️ 복기 (다시 보기): 이 기기에 지난 판 10개까지
  //  · 혼자 · 한 기기 · AI 구경 · 친구랑 방장(판 전체를 쥔 쪽)만 기록. 친구랑 손님은 남의 패를 받지 않아서 기록 안 함
  //  · 다시 보기에서는 모든 패를 펴서 보여 주고, 🧑‍🏫 선생님은 그 차례 사람 시점(S.view)만으로 계산
  const RKEY = KEY + 'replays';
  const REC_HOST = false;                                  // 친구랑은 기록 안 함 — 방장만 친구들의 다이한 패를 다시 보게 되니 (포커와 같음)
  const MODE_NAME = { solo: '혼자', hot: '한 기기', watch: 'AI 구경', host: '친구랑' };
  const canRecord = ses => !ses.drill && (ses.mode === 'solo' || ses.mode === 'hot' || ses.mode === 'watch' || (ses.mode === 'host' && REC_HOST));
  function saveReplay(rec, end) {
    const r = end && end.result;
    const wn = r && r.winner != null ? (rec.seats[r.winner] || {}).name || '?' : '';
    rec.title = !r ? '' : r.kind === 'rematch' ? '🔄 재경기 판' : `${wn === '나' ? '내가' : iga(wn)} 이겼어요${r.winnerHand ? ' · ' + r.winnerHand : r.kind === 'foldWin' ? ' · 기권승' : ''}`;
    rec.mode = `${MODE_NAME[rec.kind] || ''} · ${end.n}명`;
    try { const list = C.store(RKEY, []).filter(x => x && x.at !== rec.at); list.unshift(rec); C.save(RKEY, list.slice(0, 10)); } catch (e) {}
    drawReplayBtn();
  }
  function drawReplayBtn() { const b = $('replayBtn'); if (b) b.hidden = !C.store(RKEY, []).length; }
  const fmtAt = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function openReplayList() {
    const list = C.store(RKEY, []).filter(x => x && x.start && Array.isArray(x.acts) && Array.isArray(x.seats));
    if (!list.length) return C.toast('아직 저장된 판이 없어요');
    const close = C.modal({
      title: '🎞️ 지난 판 다시 보기',
      html: `<p class="small" style="margin:0 0 8px">이 기기에서 한 판 ${list.length}개 (최근 10개까지). 다시 보기에서는 모두의 패가 보여요.</p><div class="rplist">${list.map((x, i) => `<button class="btn" data-i="${i}"><b>${esc(x.title || '판')}</b><span class="small">${fmtAt(x.at)} · ${esc(x.mode || '')} · ${x.seats.slice(0, 6).map(q => esc(q.name)).join(', ')}</span></button>`).join('')}</div>`,
      buttons: [{ label: '닫기' }], dismiss: true,
    });
    document.querySelectorAll('.rplist [data-i]').forEach(b => { b.onclick = () => { sfx('tap'); close(); startReplay(list[+b.dataset.i]); }; });
  }
  function startReplay(rec) {
    endSession();
    const ses = SES = { alive: true, mode: 'replay', n: rec.start.n, me: -1, S: S.fastClone(rec.start), seats: rec.seats.map(x => ({ ctrl: 'remote', name: x.name, em: x.em })), turnLog: [], coachAvail: false };
    showScreen('play');
    runReplay(ses, rec, false).then(res => {
      if (res && res.branch && SES === ses && startBranch(rec, res.branch.k, res.branch.seat)) return;
      if (SES === ses) goHome();
    });
  }
  // 🎮 '여기서부터 내가 두기': k 번째 행동 앞 장면(같은 패·같은 판돈)에서 seat 자리를 내가, 나머지는 AI. 선생님 켠 채 시작, 연습 판(기록 안 함)
  function startBranch(rec, k, seat) {
    let st = S.fastClone(rec.start);
    for (let j = 0; j < k && st.phase === 'bet'; j++) st = S.step(st, rec.acts[j]).state;
    if (st.phase !== 'bet' || !rec.seats[seat] || st.folded[seat]) { C.toast('이미 끝난 장면이에요. 앞으로 돌아가서 눌러 주세요'); return false; }
    endSession();
    const tier = TIER[opt.tier] ? opt.tier : 'normal';
    const seats = rec.seats.map((x, i) => (i === seat ? { ctrl: 'me', name: '나', em: '🎴' }
      : { ctrl: 'ai', name: x.name === '나' ? '그때의 나' : x.name, em: x.name === '나' ? '🙂' : x.em || '🎴', tier: TIER[x.tier] ? x.tier : tier }));
    const ses = SES = { alive: true, mode: 'solo', n: st.n, me: seat, S: st, seats, pending: null, turnLog: [], coachAvail: true, coachOn: true, drill: { st: S.fastClone(st), k } };
    showScreen('play');
    ensureCoach(ses);
    if (ses.cp) {                                          // 선생님 창을 펴서 시작 (사용자가 저장해 둔 접힘·끔 설정은 그대로 둠)
      let keep = null; try { keep = localStorage.getItem(ses.cp.key); } catch (e) {}
      ses.cp.show(); ses.cp.collapse(false);
      try { if (keep == null) localStorage.removeItem(ses.cp.key); else localStorage.setItem(ses.cp.key, keep); } catch (e) {}
    }
    drawCoachBtn();
    C.toast(`🎮 ${k}수째 장면부터 내가 해요 · 연습 판이라 기록엔 안 남아요`, 2600);
    runLoop(ses);
    return true;
  }
  // 고를 자리: 기록에 '나' 가 있고 그 장면에 살아 있으면 그 자리, 아니면 살아 있는 자리 중에서 고름
  function pickSeat(rec, st) {
    return new Promise(res => {
      const ok = rec.seats.map((x, k) => k).filter(k => !st.folded[k]);
      const mine = rec.seats.findIndex(x => x.name === '나');
      if (mine >= 0 && ok.includes(mine)) return res(mine);
      if (!ok.length) return res(-1);
      C.modal({
        title: '🎮 어느 자리를 할까요?', dismiss: true,
        html: `<p class="small" style="margin:0">${mine >= 0 ? '이 장면에선 내가 벌써 다이했어요. ' : ''}고른 자리는 내가, 나머지는 AI 가 이어서 해요.</p>`,
        buttons: ok.map((k, j) => ({ label: `${rec.seats[k].em || ''} ${rec.seats[k].name}`, primary: j === 0, onClick: () => res(k) })).concat([{ label: '취소', ghost: true }]),
        onClose: () => res(-1),
      });
    });
  }
  // 다시 보기 화면: 처음 ⏮ · 한 수 ◀ ▶ · 재생/멈춤 + 🧑‍🏫 선생님 · 🎮 여기서부터 내가 두기. 줄은 내 자리 칸 안(배팅 단추 자리)에 넣어 패를 안 가림
  //  inline = 판 결과 창에서 (닫으면 결과로). 끝나면 { branch:{k, seat} } 또는 null
  function runReplay(ses, rec, inline) {
    return new Promise(resolve => {
      if (ses.rpClose) ses.rpClose();
      const acts = rec.acts || [], states = [S.fastClone(rec.start)], log = [];
      for (let j = 0; j < acts.length && states[j].phase === 'bet'; j++) {
        const st = states[j], p = st.turn, cost = acts[j] === S.A_FOLD ? 0 : S.actionCost(st, p, acts[j]);
        log.push(`${(rec.seats[p] || {}).name || `자리${p + 1}`}: ${actLabel(st, p, acts[j])}${cost > 0 ? ' +' + fmtN(cost) : ''}`);
        states.push(S.step(st, acts[j]).state);
      }
      const N = states.length - 1, mine = rec.seats.findIndex(x => x.name === '나');
      const rp = { rec, states, log, N, i: 0, S: states[0], me: mine >= 0 ? mine : 0, seats: rec.seats, play: true, t: 0, coach: false, panel: null, cc: {}, draw: () => {} };
      const cpWas = !!(ses.cp && ses.cp.visible);
      if (cpWas) ses.cp.hide();
      $('coachPanel').hidden = true; $('coachBtn').hidden = true; $('scoreBar').hidden = true;
      $('meZone').classList.remove('pulse');
      const canBranch = !(inline && ses.net);              // 친구 방 결과 창에서는 방을 떠나게 되니 안 보임 (지난 판 목록에서는 됨)
      const box = document.createElement('div');
      box.className = 'rpbox';
      box.innerHTML = `<div class="rpbar"><button data-rp="start" aria-label="처음으로">⏮</button><button data-rp="prev" aria-label="한 수 뒤로">◀</button><button data-rp="play" class="pp" aria-label="재생 · 멈춤"></button><button data-rp="next" aria-label="한 수 앞으로">▶</button><span class="rpn"></span><button data-rp="exit" class="rpx">${inline ? '결과로' : '닫기'}</button></div>`
        + `<div class="rpgo"><button data-rg="coach" aria-pressed="false">🧑‍🏫 선생님</button>${canBranch ? '<button data-rg="branch" class="br">🎮 여기서부터 내가 두기</button>' : ''}</div>`;
      $('betGrid').hidden = true;
      $('meZone').appendChild(box);
      // 🧑‍🏫 그 장면 차례인 사람 눈(S.view)으로 본 추천 vs 실제로 한 행동
      const out = html => {
        if (rp.panel) { rp.panel.set(html); if (!rp.panel.visible) rp.panel.show(); }
        else { const el = $('coachPanel'); el.hidden = false; el.innerHTML = html; }
      };
      const rpCoach = () => {
        if (!rp.coach) return;
        const st = rp.S, i = rp.i;
        if (st.phase !== 'bet' || i >= N) {
          out(`<p class="cp-desc">${st.phase === 'end' ? `판이 끝났어요${rec.title ? ' — ' + esc(rec.title) : ''}. ◀ 로 돌아가면 장면마다 추천을 볼 수 있어요` : '배팅 장면에서 추천을 보여 드려요 (▶ 로 한 수씩)'}</p>`);
          return;
        }
        const p = st.turn, a = acts[i], who = (rec.seats[p] || {}).name || '?';
        const c = rp.cc[i] || (rp.cc[i] = AI.coach(S.view(st, p), p));
        const info = c.byAction[a];
        const mark = !info ? '' : info.tier === 'best' ? '👑 최선' : `${info.tier === 'good' ? '🟢' : info.tier === 'ok' ? '🟡' : '🔴'} 기댓값 ${Math.round(info.delta)}냥`;
        // 짧게 (테이블을 덜 가리게): 누구 차례·승률 / 추천 vs 실제 / 행동별 기댓값 / 한 줄 해설
        out(`<div class="rpc-who"><b>${esc(who)}</b> 차례 · ${st.street}차 · <span class="cp-chip win">승률 ${c.winPct}%</span> <span class="cp-chip odds">팟오즈 ${c.potOddsPct}%</span></div>`
          + `<div class="rpc-act">👑 추천 <b>[${esc(actLabel(st, p, c.bestAction))}]</b> · 실제 <b>[${esc(actLabel(st, p, a))}]</b> ${mark}</div>`
          + `${evRow(c)}<p class="cp-desc rpc-desc">${esc(c.detail)} <span class="small">(${esc(who)} 눈으로 본 계산)</span></p>`);
      };
      rp.draw = () => {
        box.querySelector('.pp').textContent = rp.play ? '⏸' : '⏵';
        box.querySelector('.rpn').textContent = `${rp.i} / ${N}수`;
        rpCoach();
      };
      const go = k => { rp.i = Math.max(0, Math.min(N, k)); rp.S = states[rp.i]; renderGame(ses); };
      const fwd = () => {
        if (rp.i >= N) return;
        const a = acts[rp.i];
        sfx(a === S.A_FOLD ? 'lose' : a === S.A_CALL ? 'tap' : 'coin');
        go(rp.i + 1);
        if (rp.i >= N) { rp.play = false; rp.draw(); C.toast(rec.title ? '끝 — ' + rec.title : '끝까지 봤어요', 2200); }
        else C.toast(log[rp.i - 1], 900);
      };
      const tick = () => {
        clearTimeout(rp.t);
        if (!rp.play || ses.rp !== rp) return;
        rp.t = setTimeout(() => { if (ses.rp !== rp || !rp.play) return; fwd(); tick(); }, 1100);
      };
      const close = res => {
        if (ses.rp !== rp) return;
        clearTimeout(rp.t);
        ses.rp = null; ses.rpClose = null;
        box.remove();
        if (rp.panel) { try { rp.panel.destroy(); } catch (e) {} }
        $('coachPanel').hidden = true;
        $('betGrid').hidden = false;
        if (cpWas && ses.cp) ses.cp.show();
        $('coachBtn').hidden = !ses.coachAvail;
        if (inline && ses.alive) renderGame(ses);
        resolve(res || null);
      };
      ses.rp = rp; ses.rpClose = () => close(null);
      box.querySelector('.rpbar').onclick = e => {
        const b = e.target.closest('[data-rp]'); if (!b) return;
        sfx('tap');
        const k = b.dataset.rp;
        if (k === 'exit') { close(null); return; }
        if (k === 'play') { rp.play = !rp.play; if (rp.play && rp.i >= N) go(0); rp.draw(); tick(); return; }
        rp.play = false; clearTimeout(rp.t);
        if (k === 'start') go(0); else if (k === 'prev') go(rp.i - 1); else fwd();
        rp.draw();
      };
      box.querySelector('.rpgo').onclick = e => {
        const b = e.target.closest('[data-rg]'); if (!b) return;
        sfx('tap');
        if (b.dataset.rg === 'coach') {
          rp.coach = !rp.coach; b.setAttribute('aria-pressed', String(rp.coach)); b.classList.toggle('on', rp.coach);
          if (rp.coach && !rp.panel && window.CoachPanel) {
            // 복기 창은 따로 기억 — 처음엔 테이블 오른쪽 아래 (내 자리 칸·다시 보기 줄을 안 가림)
            const tb = $('tbl').getBoundingClientRect();
            try { rp.panel = CoachPanel.create({ game: 'seotda-rp', title: 'AI 선생님 · 복기', startHidden: true, bottom: Math.max(8, Math.round(innerHeight - tb.bottom + 6)), right: tb.width ? Math.max(6, Math.round(innerWidth - tb.right + 6)) : 10 }); } catch (err) { rp.panel = null; }
          }
          if (rp.coach) { rpCoach(); if (rp.panel && rp.panel.collapsed) rp.panel.collapse(false); }
          else if (rp.panel) rp.panel.hide();
          else $('coachPanel').hidden = true;
          return;
        }
        if (rp.S.phase !== 'bet' || rp.i >= N) { C.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요'); return; }
        rp.play = false; clearTimeout(rp.t); rp.draw();
        const k = rp.i;
        pickSeat(rec, rp.S).then(seat => { if (seat >= 0 && ses.rp === rp && ses.alive) close({ branch: { k, seat } }); });
      };
      renderGame(ses);
      tick();
    });
  }
  // 다시 보기 장면 그리기: 모든 패를 펴서, 아래 내 자리 칸엔 기록의 '나'(없으면 1번 자리)
  function renderReplay(ses) {
    const rp = ses.rp, s = rp.S, me = rp.me, v = S.fastClone(s);
    $('lbl').textContent = '🎞️ 다시 보기';
    $('sub').classList.remove('myturn');
    $('sub').textContent = rp.i ? `${rp.i}수 · ${rp.log[rp.i - 1]}` : `처음 장면 · ${s.n}명`;
    $('coinPill').textContent = `🪙 ${fmtN(s.coins[me])}냥`;
    $('potVal').textContent = fmtN(s.pot);
    $('potSub').innerHTML = s.phase === 'end' ? esc(s.result ? s.result.reason : '판이 끝났어요') : s.street === 1 ? '첫 장 공개 후 탐색전' : '두 장 완성 후 승부';
    const html = [];
    for (let j = 1; j < s.n; j++) html.push(seatHtml(rp, v, (me + j) % s.n));
    $('seats').innerHTML = html.join('');
    placeSeats();
    const seat = rp.seats[me] || { em: '🎴', name: '나' }, h = s.hands[me] || [-1, -1], r = s.result;
    const pay = s.phase === 'end' && r && r.kind !== 'rematch' && r.payouts ? r.payouts[me] : 0;
    $('meZone').classList.toggle('turn', s.phase === 'bet' && s.turn === me);
    $('meName').textContent = `${seat.em || '🎴'} ${seat.name} · ${fmtN(s.coins[me])}냥 · ${s.folded[me] ? '다이' : '배팅 ' + fmtN(s.bets[me])}${pay > 0 ? ` · +${fmtN(pay)}` : ''}`;
    $('myCards').innerHTML = hwCardHtml(h[0], 'hw-big') + hwCardHtml(h[1], 'hw-big');
    $('myJokbo').hidden = false;
    $('myJokbo').textContent = `🎴 ${h[1] >= 0 ? S.evalHand(h[0], h[1]).name : '—'}`;
    rp.draw();
  }

  window.__seotda = { get ses() { return SES; } };        // 시험용 (읽기만)
  ART.install();
  drawMenu();
  showScreen('home');
  if (window.ArenaUI) ArenaUI.checkUrl(FRIEND);
})();

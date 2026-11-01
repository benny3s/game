/* 텍사스 홀덤 포커 (Texas Hold'em) — 화면 · 둥근 테이블(2~8명) · AI 선생님 · 친구랑(방장이 판을 돌림 · 핸드 사이 준비 · 구경꾼 · 끊김 AI 대신 · 점수판 · 30초 시계) · 한 기기 · AI 구경 (main.js) */
(function () {
  'use strict';
  const P = window.Poker;
  const AI = window.PokerAI;
  const MAXP = P.MAX_PLAYERS;                         // 8
  const TURN_SEC = 30;                                // 친구랑: 한 차례 제한 시간 (넘으면 중급 AI 가 대신 둠)

  const $ = (id) => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff; } catch (e) { return (Math.random() * 2147483647) | 0; } };
  const fmtN = n => Number(n || 0).toLocaleString('ko-KR');

  const store = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const cfg = {
    mode: '1p',                                        // 1p | online | watch | hot
    tier: 'normal',
    count: Math.max(2, Math.min(MAXP, +store('poker.count', 4) || 4)),     // 혼자·구경·한 기기 인원
    fill: +store('poker.fill', 0) || 0,                // 친구랑: 빈자리를 AI 로 채울 목표 인원
    hotSeats: store('poker.hotSeats', ['h', 'h', 'h', 'a', 'a', 'a', 'a', 'a']),
    bank: store('poker.bank', 'gbasic'),             // 처음엔 🏦 기본 은행                   // 친구랑: 은행 모임(gid) — null = 은행 안 씀 (연습 칩)
    bankName: store('poker.bankName', '기본 은행'),
  };
  const TIER_META = {
    easy:   { name: '캐주얼 루키', avatar: '🌱' },
    normal: { name: '레귤러 프로', avatar: '♠️' },
    hard:   { name: 'GTO 마스터', avatar: '👑' },
  };
  const AI_NAMES = ['레귤러', '쿨러', '블러퍼', '샤크', '피쉬', '타이트', '루즈', '마스터'];
  const AI_EMS = ['♠️', '🦈', '🐟', '🃏', '🎩', '🦊', '🐺', '👑'];
  const ACT_LABELS = {
    [P.A_FOLD]:  '폴드',
    [P.A_CALL]:  '체크/콜',
    [P.A_HALF]:  '하프 벳',
    [P.A_POT]:   '팟 벳',
    [P.A_ALLIN]: '올인',
  };

  // ── 칩 출입구 한 곳 (나중에 공용 은행이 여기에 꽂힘)
  //   start(kind, n): 자리별 시작 칩 [n] — 기본은 모두 1000
  //   report(kind, info): 판(핸드)이 끝날 때, 게임이 끝날 때 { round, over, coins:[자리별 칩], seats, me } 를 알림 ('chips:report' 이벤트)
  const CHIPS = {
    start(kind, n) { return Array.from({ length: n }, () => 1000); },
    report(kind, info) {
      try { window.dispatchEvent(new CustomEvent('chips:report', { detail: Object.assign({ game: 'poker', kind }, info) })); } catch (e) {}
    },
  };
  // 은행 잔액(사람 자리)으로 시작 칩 덮어쓰기 — null(AI·은행 안 씀) 은 기본 칩
  const withBank = (base, stacks) => base.map((b, i) => (stacks && stacks[i] > 0 ? stacks[i] : b));
  const seatsInfo = ses => ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl, uid: x.uid }));

  const STATS_KEY = 'poker_stats_v1';
  function loadStats() {
    try { return Object.assign({ wins: 0, games: 0 }, JSON.parse(localStorage.getItem(STATS_KEY) || '{}')); }
    catch (_) { return { wins: 0, games: 0 }; }
  }
  function saveStats(st) { try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (_) {} }

  // ─────────────────────────────────────────────────────────────
  // 카드 그리기
  function cardHtml(cid, cls, glow) {
    cls = cls || '';
    if (cid === undefined || cid === null) return `<div class="pcard ${cls} empty-slot"></div>`;
    if (cid < 0) return `<div class="pcard ${cls} back"></div>`;
    const c = P.cardOf(cid);
    const colour = c.isRed ? 'red' : 'black';
    if (cls.indexOf('mini') >= 0) return `<div class="pcard ${cls} ${colour}"><span class="mr">${c.rankStr}</span><span class="ms">${c.suitChar}</span></div>`;
    return `<div class="pcard ${cls} ${colour}${glow ? ' best-glow' : ''}"><div class="corner"><span>${c.rankStr}</span><small>${c.suitChar}</small></div><div class="pip-center">${c.suitChar}</div></div>`;
  }

  let toastT = null;
  function showToast(msg, ms) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, ms || 1500);
  }
  const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  // ─────────────────────────────────────────────────────────────
  // 세션 (SES): { alive, mode: solo|hot|watch|host|guest, S(전체 상태, 방장·혼자) | V(받은 시점 상태, 손님), me(-1 = 아무도 안 보는 중), seats }
  let SES = null;
  const getMeInfo = () => (window.Me && window.Me.get ? window.Me.get() : null) || { name: '나', avatar: '🧑' };

  function endSession() {
    if (SES) {
      // 🎞️ 결과 창에서 연 다시 보기면 그 아래 판(parent)도 같이 끝냄
      for (const s of SES.parent ? [SES, SES.parent] : [SES]) {
        s.alive = false;
        if (s.onEnd) { try { s.onEnd(); } catch (e) {} }
        if (s.cpBtn) { try { s.cpBtn.destroy(); } catch (e) {} }
        if (s.cp) { try { s.cp.destroy(); } catch (e) {} }
        if (s.offs) s.offs.splice(0).forEach(f => { try { f(); } catch (e) {} });
        if (s.bank) { try { s.bank.detach(); } catch (e) {} }
        clockStop(s);
        if (s.modals) s.modals.splice(0).forEach(f => { try { f(); } catch (e) {} });
      }
      if (window.HotSeat && HotSeat.close) { try { HotSeat.close(); } catch (e) {} }
      document.querySelectorAll('.hsx-cover').forEach(e => e.remove());
      $('coachBtn').onclick = null;
    }
    SES = null;
    $('endModal').hidden = true;
    $('coachPanel').hidden = true;
    $('scoreBar').hidden = true;
    $('subTitle').classList.remove('myturn');
    drawBankBtns(null);
  }

  // 🏦 은행 (친구랑에서 방장이 모임을 고른 방만): 💰 빌리기 · 🏦 잔액·정산 창
  function drawBankBtns(ses) {
    const on = !!(ses && ses.bank);
    $('loanBtn').hidden = true;   // 11-01 베니 님: 빌리기 없음 — 바닥나면 자동으로 채우고 손익은 마이너스로
    $('bankBtn').hidden = !on;
  }
  function bankEvent(ses, ev) {
    if (!ses.alive || !ev) return;
    if (ev.op === 'queued') showToast(ev.mine || ses.mode === 'guest' ? `💰 다음 핸드에 ${fmtN(ev.n)}칩을 받아요` : `💰 ${ev.name} 님 ${fmtN(ev.n)}칩 빌리기 (다음 핸드에)`);
    else if (ev.op === 'loan') {
      showToast(`🎟️ ${ev.name} 님 칩이 바닥나 다시 채웠어요 — 손익은 마이너스로 이어져요`);
      if (ses.mode === 'host' && ses.net) ses.net.broadcast({ t: '_bank', op: 'loan', name: ev.name, n: ev.n }, true);
    } else if (ev.op === 'no' || ev.op === 'error') showToast('🏦 ' + (ev.msg || '은행 장부에 못 썼어요'));
  }
  $('loanBtn').addEventListener('click', async () => {
    const ses = SES;
    if (!ses || !ses.bank || !window.Bank) return;
    if (!(await Bank.askLoan(ses.bank.gid)) || SES !== ses) return;
    if (ses.mode === 'guest') ses.bank.requestLoan(); else ses.bank.requestLoan(ses.me);
  });
  $('bankBtn').addEventListener('click', () => { if (SES && SES.bank && window.Bank) Bank.panel({ game: 'poker', gid: SES.bank.gid }); });
  function openMenu() {
    endSession();
    $('startModal').hidden = false;
    $('coachBtn').hidden = true;
    drawReplayBtn();
  }

  function getView(ses) {
    if (ses.mode === 'guest') return ses.V;
    if (ses.mode === 'watch' || ses.mode === 'replay') {   // 구경·다시 보기: 모든 카드 공개
      const v = P.fastClone(ses.S); v.me = Math.max(0, ses.me); delete v.deck; delete v.seed; return v;
    }
    return P.view(ses.S, ses.me);
  }

  // 상대 자리를 타원 둘레에 놓기 (내 자리는 아래 따로). 이름표 크기를 재서 겹치지 않게
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
      rects.push(document.querySelector('#tCenter').getBoundingClientRect());
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
    const seat = ses.seats[q] || { name: `자리${q + 1}`, em: '🃏' };
    const out = v.out && v.out[q], f = v.folded[q] && !out;
    const ended = v.phase === 'end', r = v.result;
    const win = ended && r && r.kind !== 'over' && (r.winners || []).includes(q);
    const cls = ['ps'];
    if (v.turn === q && v.phase === 'bet') cls.push('turn');
    if (f) cls.push('folded');
    if (out) cls.push('out');
    if (win) cls.push('win');
    const marks = (v.dealer === q ? '<span class="mark d">D</span>' : '') + (v.sbSeat === q ? '<span class="mark sb">SB</span>' : '') + (v.bbSeat === q ? '<span class="mark bb">BB</span>' : '');
    let status;
    if (out) status = '<span class="bt dead">탈락</span>';
    else if (win && r.payouts) status = `<span class="bt got">+${fmtN(r.payouts[q])}</span>`;
    else if (f) status = '<span class="bt dead">폴드</span>';
    else if (v.allIn[q]) status = '<span class="bt all">ALL-IN</span>';
    else status = `<span class="bt">${v.bets[q] > 0 ? '베팅 ' + fmtN(v.bets[q]) : (v.turn === q && v.phase === 'bet' ? (ses.mode === 'replay' ? '차례' : '생각 중') : '-')}</span>`;
    const h = out ? [] : (v.hands[q] && v.hands[q].length ? v.hands[q] : [-1, -1]);
    const cards = out ? '' : `<div class="cds">${cardHtml(h[0], 'mini')}${cardHtml(h[1], 'mini')}</div>`;
    return `<div class="${cls.join(' ')}" data-q="${q}"><span class="nm">${esc(seat.em)} ${esc(seat.name)}${seat.sub ? ' 🤖' : ''}${marks}</span><span class="cn">${fmtN(v.coins[q])}</span>${cards}${status}</div>`;
  }

  // ─────────────────────────────────────────────────────────────
  // 🧑‍🏫 AI 선생님: 공용 CoachPanel(움직이는 창 + CoachPanel.button) 이 있으면 그걸로, 없으면 화면 안 한 줄 요약
  //   단추는 늘 하나(#coachBtn): 혼자·한 기기는 늘 보임, 친구랑은 방장이 켠 방에서만 보임
  function isCoachOn(ses) { return !!ses && (ses.cp ? ses.cp.visible : !!ses.coachOn); }
  function ensureCoach(ses) {
    const btn = $('coachBtn');
    btn.hidden = !ses.coachAvail;
    if (!ses.coachAvail) return;
    if (window.CoachPanel && !ses.cp) {
      try {
        const tb = $('tbl').getBoundingClientRect();
        ses.cp = CoachPanel.create({ game: 'poker', title: 'AI 선생님', bottom: Math.max(64, Math.round(window.innerHeight - tb.bottom + 6)) });
        try { if (!localStorage.getItem(ses.cp.key)) ses.cp.collapse(true); } catch (e) {}
        ses.cpBtn = CoachPanel.button(btn, ses.cp, { onToggle: () => { ses.cc = null; renderGame(ses); } });
      } catch (e) { console.error(e); ses.cp = null; }
    }
    if (!ses.cp) btn.onclick = () => { ses.coachOn = !ses.coachOn; ses.cc = null; if (!ses.coachOn) $('coachPanel').hidden = true; renderGame(ses); };
    drawCoachBtn();
  }
  function drawCoachBtn() {
    const b = $('coachBtn');
    b.hidden = !(SES && SES.coachAvail);
    if (!SES || SES.cp || SES.idle) return;
    const on = !!(SES && SES.coachOn);
    b.classList.toggle('coach-on', on);
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? '🧑‍🏫 AI 선생님' : '🧑‍🏫 선생님 꺼짐';
  }
  function evRow(c) {
    const items = Object.values(c.byAction || {}).map(x => `<span class="ev-chip ${x.tier}">${x.action === c.bestAction ? '👑 ' : ''}${ACT_LABELS[x.action]} ${x.evText}</span>`);
    return items.length ? `<div class="ev-row">${items.join('')}</div>` : '';
  }
  function coachHtml(c) {
    const outs = c.draws && c.draws.outsCount > 0 ? `${c.draws.outsCount}장 (${c.draws.hitPct}%)` : '메이드 중심';
    return `<div class="coach-meters">
        <div class="meter-box"><span class="m-lbl">에퀴티</span><strong class="m-val">${c.equityPct}%</strong></div>
        <div class="meter-vs">VS</div>
        <div class="meter-box"><span class="m-lbl">팟 오즈</span><strong class="m-val">${c.potOddsPct}%</strong></div>
        <div class="meter-box outs"><span class="m-lbl">아웃츠</span><strong class="m-val">${esc(outs)}</strong></div>
      </div>
      <div class="coach-headline">${esc(c.headline)}</div>
      <div class="coach-detail">${esc(c.detail)}</div>${evRow(c)}`;
  }
  function showCoach(ses, html) {
    if (!ses.coachAvail) return;
    if (ses.cp) { try { ses.cp.set(html); } catch (e) {} $('coachPanel').hidden = true; }
    else if (ses.coachOn) { const cp = $('coachPanel'); cp.hidden = false; cp.innerHTML = html; }
  }

  // ─────────────────────────────────────────────────────────────
  function renderGame(ses) {
    if (!ses || !ses.alive || !(ses.mode === 'guest' ? ses.V : ses.S)) return;   // 방장: 은행 장부를 여는 동안은 아직 판 없음
    const v = getView(ses), me = ses.me;
    const spect = me < 0;                              // 한 기기에서 다음 사람을 기다리는 동안
    const rpl = ses.mode === 'replay';                 // 🎞️ 다시 보기 (모든 카드 공개, 버튼 대신 재생 줄)
    const watch = ses.mode === 'watch' || rpl;
    const mi = spect ? 0 : me;
    const outMe = !spect && v.out && v.out[me];
    const n = v.n;

    $('streetBadge').textContent = v.over ? '게임 끝' : (P.STREET_NAMES[v.street] || '쇼다운');
    $('potVal').textContent = fmtN(v.pot);
    const pots = v.phase === 'end' ? [] : P.buildPots(v.totalBets, v.folded.map(f => !f));
    const realPots = pots.filter(p => !p.refund);
    $('sideInfo').hidden = realPots.length < 2;
    $('sideInfo').textContent = `메인 + 사이드 ${realPots.length - 1}개`;

    // 공용 카드 5칸 (+ 내 최상 5장 하이라이트)
    const myKnown = spect || outMe ? [] : (v.hands[me] || []).concat(v.board || []).filter(c => c >= 0);
    const myEval = P.eval7(myKnown);
    const bestSet = new Set(myEval.best5 || []);
    let comm = '';
    for (let i = 0; i < 5; i++) {
      const cid = i < v.board.length ? v.board[i] : null;
      comm += cardHtml(cid, '', cid !== null && bestSet.has(cid) && v.board.length >= 3);
    }
    $('commRow').innerHTML = comm;

    const toCall = spect || outMe ? 0 : Math.max(0, v.curBet - v.bets[me]);
    $('callInfo').dataset.base = $('callInfo').textContent = v.over ? (v.result ? v.result.reason : '') : v.phase === 'end'
      ? (v.result ? v.result.reason : '핸드 종료')
      : rpl ? `${(ses.seats[v.turn] || {}).name || ''} 차례`
      : spect ? (ses.spec ? '구경 중이에요 · 다음 핸드에 같이 해요' : '다음 사람을 기다려요')
      : outMe ? '탈락했어요 · 구경 중' : toCall > 0 ? `콜 필요: ${fmtN(toCall)}칩` : '체크 가능 (추가 비용 0)';

    // 상대 자리들 (내 다음 사람부터 시계 방향)
    const html = [];
    for (let j = spect ? 0 : 1; j < n; j++) html.push(seatHtml(ses, v, (mi + j) % n));
    $('seats').innerHTML = html.join('');
    placeSeats();

    // 내 자리
    const mySeat = spect ? (ses.spec ? { em: '👀', name: '구경 중' } : { em: '🪑', name: '다음 사람을 기다려요' }) : (ses.seats[me] || { em: '🧑', name: '나' });
    $('myAvatar').textContent = mySeat.em;
    $('myName').innerHTML = `${esc(mySeat.name)}${!spect && v.dealer === me ? ' <span class="mark d">D</span>' : ''}${!spect && v.sbSeat === me ? ' <span class="mark sb">SB</span>' : ''}${!spect && v.bbSeat === me ? ' <span class="mark bb">BB</span>' : ''}`;
    $('myCoins').textContent = spect ? '-' : fmtN(v.coins[me]);
    $('myBet').textContent = spect ? '-' : fmtN(v.bets[me]);
    $('myHandBadge').textContent = spect ? '' : outMe ? '탈락' : myEval.name;
    $('myHandBadge').hidden = spect;
    const myHole = spect || outMe ? [] : (v.hands[me] || []);
    $('myHand').innerHTML = myHole.map(cid => cardHtml(cid, 'lg', cid >= 0 && bestSet.has(cid) && v.board.length >= 3)).join('');

    const myTurn = !watch && !spect && v.phase === 'bet' && v.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('mySeat').classList.toggle('turn', myTurn || (rpl && v.phase === 'bet' && v.turn === me));
    $('mySeat').classList.toggle('pulse', myTurn && !!ses.net);               // 친구랑: 내 차례를 더 눈에 띄게
    drawSub(ses);
    if (ses.net && myTurn) { const bk = `${v.round}|${v.street}|${v.pot}|${v.raises}`; if (ses.bell !== bk) { ses.bell = bk; vibrate(40); } }

    // AI 선생님 분석 (패널이 꺼져 있어도 복기 노트용으로 내 차례엔 계산)
    let coachData = null;
    const coachOn = isCoachOn(ses);
    if (ses.coachAvail && !watch && !spect && !outMe && v.phase === 'bet' && (coachOn || myTurn)) {
      const key = `${v.round}|${v.street}|${v.turn}|${v.pot}|${v.raises}|${me}`;
      if (!ses.cc || ses.cc.key !== key) ses.cc = { key, data: AI.coach(v, me) };
      coachData = ses.cc.data;
      if (mHide(ses) && myTurn) { showCoach(ses, `<div class="coach-detail">${MHIDE_HTML}</div>`); coachData = null; }   // 📒 노트 연습 첫 장면: 💡 를 누를 때까지 추천을 감춤
      else showCoach(ses, coachHtml(coachData));
    } else if (ses.coachAvail && (spect || v.phase === 'end')) {
      showCoach(ses, `<div class="coach-detail">${spect ? (ses.spec ? '구경 중이에요. 핸드가 끝나면 방장이 다음 핸드에 넣어 줄 수 있어요' : '다음 사람 차례를 기다려요') : '핸드가 끝났어요. 결과를 확인해 보세요 🙂'}</div>`);
    }

    const L = myTurn ? P.legal(v) : [];
    const btnDefs = [
      { act: P.A_FOLD,  btn: 'btnFold',  cost: 'costFold' },
      { act: P.A_CALL,  btn: 'btnCall',  cost: 'costCall' },
      { act: P.A_HALF,  btn: 'btnHalf',  cost: 'costHalf' },
      { act: P.A_POT,   btn: 'btnPot',   cost: 'costPot' },
      { act: P.A_ALLIN, btn: 'btnAllin', cost: 'costAllin' },
    ];
    for (const d of btnDefs) {
      const b = $(d.btn), cEl = $(d.cost);
      const allowed = L.includes(d.act);
      b.disabled = !allowed;
      b.classList.toggle('coach-best', !!(coachOn && coachData && myTurn && allowed && coachData.bestAction === d.act));
      const costVal = spect || outMe ? 0 : P.actionCost(v, mi, d.act);
      if (d.act === P.A_FOLD) cEl.textContent = '기권';
      else if (d.act === P.A_CALL) { $('lblCall').textContent = costVal === 0 ? '체크' : '콜'; cEl.textContent = costVal === 0 ? '0칩' : `${fmtN(costVal)}칩`; }
      else cEl.textContent = `${fmtN(costVal)}칩`;
    }
    drawCoachBtn();
    drawScore(ses);
  }

  // 위 막대 작은 글씨: 어떤 판인지 · 인원. 친구랑에서 내 차례면 금색으로 뛰고 남은 초(⏱)가 같이 떠요
  function drawSub(ses) {
    if (!ses || !ses.alive || !(ses.mode === 'guest' ? ses.V : ses.S)) return;
    const v = getView(ses), me = ses.me, watch = ses.mode === 'watch';
    const myTurn = !!ses.net && me >= 0 && v.phase === 'bet' && v.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('subTitle').textContent = myTurn ? `🔔 내 차례 ${ses.turnLeft != null ? '⏱' + ses.turnLeft : ''}`.trim() : `${ses.mode === 'replay' ? '🎞️ 다시 보기' : ses.practice ? '🎮 연습' : watch ? 'AI 구경' : ses.mode === 'hot' ? '한 기기' : ses.net ? '친구랑 ' + ses.net.code : '노리밋'} ${v.n}인${ses.spec ? ' · 👀 구경' : ''}`;
    $('subTitle').classList.toggle('myturn', myTurn);
    // 좁은 폰은 위 막대 글이 숨으니(CSS) 테이블 가운데 안내에도 남은 초를 붙여요
    const ci = $('callInfo'), base = ci.dataset.base;
    if (base != null) ci.textContent = myTurn && ses.turnLeft != null ? `${base} · ⏱${ses.turnLeft}` : base;
  }
  // 점수판 한 줄 (친구랑): 자리마다 전적 · 칩(은행이 있으면 원), 지금 차례는 금색, 구경 인원
  function drawScore(ses) {
    const el = $('scoreBar');
    if (!ses || !ses.alive || !ses.net || !(ses.mode === 'guest' ? ses.V : ses.S)) { el.hidden = true; return; }
    const v = getView(ses), sc = ses.score || {}, turnSeat = v.phase === 'bet' ? v.turn : -1;
    const seatUids = new Set(ses.seats.map(x => x.uid).filter(Boolean));
    const watching = Object.keys(ses.net.players || {}).filter(u => !seatUids.has(u)).length;
    el.hidden = false;
    el.innerHTML = ses.seats.map((x, q) => {
      const c = v.coins[q], money = c == null ? '' : ses.chipWon ? `${fmtN(Math.round(c * ses.chipWon))}원` : `🪙${fmtN(c)}`;
      const rest = (v.out && v.out[q]) || (v.folded[q] && v.phase === 'bet');
      return `<span class="sbi${q === turnSeat ? ' on' : ''}${rest ? ' rest' : ''}"><b>${esc(q === ses.me ? '나' : x.name)}</b> ${(sc.w && sc.w[q]) || 0}승${(sc.l && sc.l[q]) || 0}패${money ? ' ' + money : ''}${v.out && v.out[q] ? ' 탈락' : ''}</span>`;
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
      if (show && l !== ses.turnLeft) { ses.turnLeft = l; if (l === 10) { showToast('⏱ 10초 남았어요', 1500); vibrate(30); } drawSub(ses); }
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
  function noteTurn(ses, v, a) {
    if (!ses.coachAvail || !ses.cc || !ses.cc.data) return;
    const c = ses.cc.data, ch = c.byAction[a];
    if (ch) ses.coachLog.push({ street: P.STREET_NAMES[v.street], myHand: c.handEval ? c.handEval.name : '', chosen: ACT_LABELS[a], best: ACT_LABELS[c.bestAction], tier: ch.tier, delta: Math.round(ch.delta || 0), equityPct: c.equityPct });
  }
  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled || !SES) return;
      act(SES, Number(btn.dataset.act));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 시작: 혼자 / 한 기기 / AI 구경
  function seatNames(n, kinds, tier) {
    const seats = [];
    let ai = 0, hum = 0;
    for (let i = 0; i < n; i++) {
      const k = kinds[i];
      if (k === 'me') { const me = getMeInfo(); seats.push({ ctrl: 'me', name: me.name || '나', em: me.avatar || '🧑' }); }
      else if (k === 'hot') { seats.push({ ctrl: 'hot', name: `플레이어${++hum}`, em: ['🧑', '🌸', '🍀', '🔥', '🌙', '⭐', '🐱', '🐶'][i] }); }
      else { seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length], em: AI_EMS[ai % AI_EMS.length], tier }); ai++; }
    }
    return seats;
  }

  // 한 기기 자리 고르기: 공용 HotSeat.setup 이 있으면 그걸로, 없으면 메뉴의 간단한 대체
  let hotPick = null;
  function ensureHotPick() {
    if (hotPick || !(window.HotSeat && typeof HotSeat.setup === 'function')) return;
    try { hotPick = HotSeat.setup($('hotSetup'), { game: 'poker', min: 2, max: MAXP, allowAI: true, tiers: ['easy', 'normal', 'hard'], onChange: () => drawMenu() }); } catch (e) { console.error(e); hotPick = null; }
  }
  function hotSeatsCfg() {
    if (hotPick) return hotPick.seats;
    return Array.from({ length: cfg.count }, (_, i) => (cfg.hotSeats[i] === 'h'
      ? { kind: 'human', name: `플레이어${i + 1}`, emoji: ['🧑', '🌸', '🍀', '🔥', '🌙', '⭐', '🐱', '🐶'][i] }
      : { kind: 'ai', tier: cfg.tier }));
  }

  function startLocal() {
    endSession();
    $('startModal').hidden = true;
    $('endModal').hidden = true;
    const mode = cfg.mode;
    const hotCfg = mode === 'hot' ? hotSeatsCfg() : null;
    const n = mode === 'hot' ? hotCfg.length : cfg.count;
    let kinds;
    if (mode === 'hot') kinds = hotCfg.map(x => (x.kind === 'human' ? 'hot' : 'ai'));
    else if (mode === 'watch') kinds = Array.from({ length: n }, () => 'ai');
    else kinds = Array.from({ length: n }, (_, i) => (i === 0 ? 'me' : 'ai'));
    const seats = seatNames(n, kinds, cfg.tier);
    if (hotCfg) hotCfg.forEach((x, i) => { if (x.kind === 'human') { seats[i].name = x.name; seats[i].em = x.emoji || seats[i].em; } else seats[i].tier = x.tier || 'normal'; });
    if (mode === 'watch') seats.forEach((x, i) => { x.tier = ['hard', 'normal', 'easy'][i % 3]; });
    const kind = mode === '1p' ? 'solo' : mode;
    const S0 = P.create({ players: n, stacks: CHIPS.start(kind, n), seed: rand32() });
    const ses = SES = { alive: true, mode: kind, n, me: mode === 'hot' ? -1 : 0, S: S0, seats, pending: null, coachLog: [], coachAvail: mode !== 'watch', coachOn: mode !== 'watch', spectating: false };
    ensureCoach(ses);
    runLoop(ses);
  }

  // ─────────────────────────────────────────────────────────────
  // 친구랑
  //  · 방장 기기가 덱·모든 카드를 쥐고 진행, 손님에게는 그 사람 시점(P.view)만 보냄 → 남의 홀카드는 쇼다운 전에 전달되지 않음
  const FRIEND = {
    game: 'poker', title: '♠️ 텍사스 홀덤', max: MAXP, min: 2, coach: true,
    describe: n => `${n}명 · 블라인드 10/20 · 시작 칩 1,000`,
    buildConfig: hostEl => {
      hostEl.innerHTML = '<div class="optrow" style="display:grid;gap:6px"><span style="font-size:12px;color:#94a3b8">빈자리</span><div class="seg" id="fFillSeg" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>';
      const draw = () => {
        const seg = hostEl.querySelector('#fFillSeg');
        const items = [[0, '온 사람끼리'], [4, 'AI로 4명까지'], [6, 'AI로 6명까지'], [MAXP, `AI로 ${MAXP}명까지`]];
        seg.innerHTML = items.map(([v, l]) => `<button class="arn-btn" data-v="${v}" style="padding:8px 10px;font-size:13px;${cfg.fill === v ? 'outline:2px solid #fbbf24' : ''}">${l}</button>`).join('');
        seg.onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.fill = +b.dataset.v; save('poker.fill', cfg.fill); draw(); };
      };
      draw();
      // 🏦 은행 모임 고르기 (대기실에 보일 때만 — 방 만들 때 임시로 부르는 건 건너뜀)
      const bx = document.createElement('div');
      hostEl.appendChild(bx);
      if (window.Bank && hostEl.isConnected) Bank.lobbyPicker(bx, { bank: cfg.bank, bankName: cfg.bankName }, true, p => { cfg.bank = p.bank || null; cfg.bankName = p.bankName || null; save('poker.bank', cfg.bank); save('poker.bankName', cfg.bankName); });
      return () => ({ fill: cfg.fill, bank: cfg.bank || null, bankName: cfg.bank ? cfg.bankName || null : null });
    },
    renderConfig: c => `${c && c.fill ? `빈자리는 AI로 ${c.fill}명까지` : '온 사람끼리'}${c && c.coach ? ' · AI 선생님' : ''}${window.Bank && Bank.label(c) ? ' · ' + Bank.label(c) : ''}`,
    onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
    onLobby: () => { endSession(); $('coachBtn').hidden = true; },         // 대기실이 위에 뜸 (시작 창은 띄우지 않음)
    onLeave: () => openMenu(),
  };
  function startOnlineGame() {
    if (!window.ArenaUI) { alert('온라인 대결 모듈을 불러오지 못했습니다.'); return; }
    $('startModal').hidden = true;
    window.ArenaUI.open(FRIEND);
  }

  //  · 손님 → 방장: {t:'hi'} (참가·다시 들어옴 알림) · {t:'act', a, r} (내 베팅) · {t:'_ready', k} (판 사이 준비)
  //  · 방장 → 손님: {t:'st', me, v, ro:[{name,em,ctrl,u,b}], coach, sc:{w,l}, left} (그 사람 시점 + 전적 + 내 차례 남은 초; 구경꾼은 me = -1, 아무 카드도 안 보임) · {t:'_rl', k, uids} (누가 준비했나)
  //  · 모두 꼭 도착(rel=true). 손님이 새로 고침해도 같은 uid 라 방장이 자리를 지켜 두었다가 돌려줌
  const seatOfUid = (ses, uid) => ses.seats.findIndex(x => x.uid === uid && x.ctrl !== 'me');
  const readyKey = S => `${S.round}${S.over ? 'o' : ''}`;                  // 핸드 끝 = 라운드 번호, 게임 끝(우승) = 번호 + 'o'
  function startOnline({ net, role, cfg: c, players }) {
    endSession();
    $('startModal').hidden = true;
    c = c || {};
    const coachAvail = !!c.coach;
    // 이 판(세션)이 붙인 듣기는 세션이 끝날 때 뗌 (대기실로 돌아갔다 다시 시작해도 겹치지 않게)
    const hook = (ses, ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') ses.offs.push(off); };
    // 🏦 은행 모임이 있으면 1칩 = 몇 원인지 알아 둠 (점수판을 원으로)
    const loadWon = ses => { if (c.bank && window.Bank && Bank.getMeta) Bank.getMeta(c.bank).then(m => { if (SES === ses && m && m.chipWon) { ses.chipWon = m.chipWon; renderGame(ses); } }, () => {}); };
    if (role === 'host') {
      const host = net.meta && net.meta.host;
      const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p))
        .filter(p => !p.watch)
        .sort((a, b) => (b.uid === host) - (a.uid === host) || (a.t || 0) - (b.t || 0))
        .slice(0, MAXP);
      const seats = plist.map((p, i) => ({ ctrl: p.uid === net.uid ? 'me' : 'remote', uid: p.uid, name: p.name || `친구${i + 1}`, em: p.uid === net.uid ? (getMeInfo().avatar || '🧑') : (p.avatar || '🙂') }));
      const target = Math.max(2, seats.length, Math.min(MAXP, c.fill || 0));
      let ai = 0;
      while (seats.length < target) { seats.push({ ctrl: 'ai', name: AI_NAMES[ai % AI_NAMES.length] + '(AI)', em: AI_EMS[ai % AI_EMS.length], tier: 'normal' }); ai++; }
      const n = seats.length;
      const me = Math.max(0, seats.findIndex(x => x.ctrl === 'me'));
      const ses = SES = { alive: true, mode: 'host', n, me, S: null, seats, net, cfgR: c, pending: null, remoteWait: null, coachLog: [], coachAvail, coachOn: coachAvail, offs: [], spectating: false, bank: null,
        score: { w: seats.map(() => 0), l: seats.map(() => 0) }, readyMap: {}, joinPick: {}, watchers: new Set(), modals: [], chipWon: 0, turnLeft: null, clock: null };
      hook(ses, 'msg', (uid, m) => onHostMsg(ses, uid, m));
      hook(ses, 'leave', uid => onHostLeave(ses, uid));
      hook(ses, 'join', uid => onHostJoin(ses, uid));
      hook(ses, 'players', () => { if (SES !== ses) return; drawScore(ses); if (ses.drawReady) ses.drawReady(); });     // 구경 인원 · 준비 목록
      loadWon(ses);
      // 시작 칩: 은행 모임이 있으면 각자 잔액(없으면 자동으로 빌림), AI 자리·은행 안 씀은 기본 칩
      const go = stacks => {
        if (!ses.alive) return;
        ses.S = P.create({ players: n, stacks: withBank(CHIPS.start('online', n), stacks), seed: rand32() });   // 씨앗은 방 설정에 싣지 않음
        ensureCoach(ses);
        drawBankBtns(ses);
        runLoop(ses);
      };
      if (c.bank && window.Bank) {
        ses.bank = Bank.attach({ game: 'poker', net, cfg: c, seats, min: 1, onEvent: ev => bankEvent(ses, ev) });
        $('subTitle').textContent = '🏦 은행 장부를 여는 중…';
        ses.bank.ready.then(go);
      } else go(null);
    } else {
      const ses = SES = { alive: true, mode: 'guest', n: 2, me: 0, V: null, seats: [], net, cfgR: c, coachLog: [], coachAvail, coachOn: coachAvail, waiting: false, offs: [], lastKey: '', bank: null,
        score: null, readyMap: {}, spec: false, modals: [], chipWon: 0, turnLeft: null, clock: null };
      hook(ses, 'msg', m => onGuestMsg(ses, m));
      hook(ses, 'players', () => { if (SES !== ses) return; drawScore(ses); if (ses.drawReady) ses.drawReady(); });
      if (c.bank && window.Bank) ses.bank = Bank.attach({ game: 'poker', net, cfg: c, role: 'guest', onEvent: ev => bankEvent(ses, ev) });
      loadWon(ses);
      drawBankBtns(ses);
      ensureCoach(ses);
      $('subTitle').textContent = '방장이 준비하는 중…';
      net.send({ t: 'hi' }, true);
      // 첫 상태가 안 오면 계속 인사 (방장이 은행 장부를 여는 동안이나 다시 들어오는 길 포함)
      let tries = 0;
      const t = setInterval(() => { if (!ses.alive || ses.V || ++tries > 40) { clearInterval(t); return; } net.send({ t: 'hi' }, true); }, 1500);
    }
  }

  function onHostMsg(ses, uid, m) {
    if (!ses.alive || !m) return;
    if (m.t === '_ready') { onHostReady(ses, uid, m); return; }
    if (!ses.S) return;                                     // 판 준비 전 인사는 판이 시작될 때 publish 로 대신
    const i = seatOfUid(ses, uid);
    if (i >= 0 && ses.seats[i].sub) restoreSeat(ses, i);    // AI 가 대신 치던 자리인데 본인 메시지가 오면 돌아온 것
    if (m.t === 'hi') {
      if (i < 0) { ses.watchers.add(uid); sendTo(ses, uid, -1); }       // 앉을 자리가 없으면 구경 (다음 핸드에 방장이 넣어 줄 수 있음)
      else sendTo(ses, uid, i);
      if (ses.S.phase === 'end') sendReadyList(ses, uid);
    } else if (m.t === 'act') {
      if (i < 0) return;
      const w = ses.remoteWait;
      if (w && w.seat === i && ses.S.phase === 'bet' && ses.S.turn === i && (m.r == null || m.r === ses.S.round) && P.isLegal(ses.S, m.a)) w.res(m.a);
      else sendTo(ses, uid, i);
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
      showToast(`👀 ${nm} 님이 구경하러 왔어요`, 2000);
      ses.watchers.add(uid);
      sendTo(ses, uid, -1);
    }
    drawScore(ses); if (ses.drawReady) ses.drawReady();
  }
  function restoreSeat(ses, i) {
    const st = ses.seats[i];
    st.sub = false; st.drop = false; st.ctrl = 'remote'; st.tier = null;
    showToast(`${st.name} 님이 돌아왔어요. 다시 직접 쳐요`, 2400);
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
    showToast(`${st.name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    drawScore(ses); if (ses.drawReady) ses.drawReady();
    setTimeout(() => {
      if (!ses.alive || SES !== ses || (ses.net.players || {})[uid] || ses.seats.indexOf(st) < 0 || st.sub || ses.goneAsk) return;
      const j = ses.seats.indexOf(st);
      if (ses.S && ses.S.out && ses.S.out[j]) return;                                  // 이미 탈락해 구경 중인 자리는 안 물음
      askGone(ses, j);
    }, 5000);
  }
  const canDropSeat = ses => ses.seats.filter(x => !x.drop).length > 2 && !ses.bank;     // 빼고도 2명 이상 남고, 은행 방이 아닐 때만
  // 작은 선택 창 (포커 화면용): buttons = [{label, primary, onClick}] — 누르면 닫힘
  function askBox({ title, html, buttons, onClose }) {
    const ov = document.createElement('div');
    ov.className = 'modal gone-modal';
    ov.innerHTML = `<div class="modal-box"><h2>${esc(title)}</h2><p class="sub" style="margin-bottom:12px">${html}</p><div class="row-btns"></div></div>`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; ov.remove(); if (onClose) try { onClose(); } catch (e) { console.error(e); } };
    buttons.forEach(b => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = b.primary ? 'primary' : 'ghost'; el.textContent = b.label;
      el.onclick = () => { if (b.onClick) b.onClick(); close(); };
      ov.querySelector('.row-btns').appendChild(el);
    });
    document.body.appendChild(ov);
    return close;
  }
  function askGone(ses, i) {
    const st = ses.seats[i]; if (!st || st.sub || ses.goneAsk) return;
    const close = askBox({
      title: `🔌 ${st.name} 님이 나갔어요`,
      html: `어떻게 할까요? AI 는 ♠️ 중급이 대신 쳐요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.${ses.bank ? '<br>은행 방은 자리를 빼지 않고 AI 가 대신 쳐요' : ''}`,
      buttons: [{ label: '🤖 AI가 대신 쳐요', primary: true, onClick: () => subAI(ses, ses.seats.indexOf(st), false) }]
        .concat(canDropSeat(ses) ? [{ label: '👋 다음 판부터 빼기', onClick: () => subAI(ses, ses.seats.indexOf(st), true) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { try { ses.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} if (window.ArenaUI && ArenaUI.net === ses.net) ArenaUI.toLobby(); } }, { label: '⏳ 기다릴게요' }]),
      onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; ses.modals = ses.modals.filter(x => x !== close); },
    });
    ses.goneAsk = { uid: st.uid, close }; ses.modals.push(close);
  }
  // 나간 자리를 AI 가 이어 받음 (drop 이면 이번 핸드만 AI 가 치고 다음 판부터 자리가 빠짐). 돌아오면 restoreSeat 로 다시 본인
  function subAI(ses, i, drop) {
    const st = ses.seats[i]; if (!st || !ses.alive) return;
    st.sub = true; st.drop = !!drop; st.ctrl = 'ai'; st.tier = 'normal';
    try { ses.net.chat(drop ? `🤖 ${st.name} 님 자리는 이번 핸드만 AI 가 치고, 다음 판부터 빠져요` : `🤖 ${st.name} 님 자리는 AI 가 대신 쳐요 (돌아오면 다시 직접)`); } catch (e) {}
    if (ses.remoteWait && ses.remoteWait.seat === i) ses.remoteWait.res(null);       // 지금 그 자리 차례를 기다리는 중이면 AI 가 바로 둠
    publish(ses); renderGame(ses);
    if (ses.drawReady) ses.drawReady();
  }
  const rosterOf = ses => ses.seats.map(x => ({ name: x.name, em: x.em, ctrl: x.ctrl === 'ai' ? 'a' : 'h', u: x.uid || null, b: x.sub ? 1 : 0 }));
  // 그 사람 시점 상태 한 묶음 (i = -1 이면 구경꾼: 아무 카드도 안 보임)
  function packSt(ses, i) {
    const left = ses.clock && ses.S.phase === 'bet' ? Math.max(0, Math.ceil((ses.clock.end - Date.now()) / 1000)) : null;
    return { t: 'st', me: i, v: P.view(ses.S, i), ro: rosterOf(ses), coach: ses.coachAvail, sc: ses.score, left };
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

  // 판 사이 '준비': 손님이 누르면 방장이 모아서 모두에게 알림 (구경꾼이 누르면 '다음 핸드에 낄래요')
  const readyOf = (ses, k) => (ses.readyMap[k] = ses.readyMap[k] || new Set());
  function sendReadyList(ses, uid) {
    const k = readyKey(ses.S), m = { t: '_rl', k, uids: [...readyOf(ses, k)] };
    if (uid) ses.net.send(uid, m, true); else ses.net.broadcast(m, true);
  }
  function onHostReady(ses, uid, m) {
    if (!ses.S || ses.S.phase !== 'end' || m.k !== readyKey(ses.S)) return;
    const i = seatOfUid(ses, uid);
    if (i >= 0 && ses.seats[i].sub) restoreSeat(ses, i);
    readyOf(ses, m.k).add(uid);
    if (i < 0) ses.joinPick[uid] = true;                    // 구경꾼이 '낄래요' 를 누르면 일단 체크해 둠 (방장이 풀 수 있음)
    sendReadyList(ses);
    if (ses.drawReady) ses.drawReady();
  }

  // 방장: 자리 바꾸기 — 다음 판부터 빠질 자리를 빼고, 방장이 체크한 구경꾼을 최대 인원까지 앉힘. 자리 번호가 달라지면 {keep, add} 를 돌려줌 (전적·자리 목록은 여기서 바꿈)
  //  noAdd: 구경꾼은 안 앉힘 — 은행 방은 핸드 사이에 앉히면 기본 연습 칩으로 앉고 장부(자리 번호별)에 안 잡혀 장부 손익에 섞임 → 장부를 다시 읽는 새 게임에서만 앉힘
  function reseatSeats(ses, noAdd) {
    const old = ses.seats, pl = ses.net.players || {};
    let keep = old.map((x, i) => i).filter(i => !old[i].drop);
    const have = new Set(old.map(x => x.uid).filter(Boolean));
    const fresh = noAdd ? [] : Object.keys(pl).filter(u => !have.has(u) && !(pl[u] && pl[u].watch) && ses.joinPick[u]).sort((a, b) => ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
    if (keep.length + Math.min(fresh.length, Math.max(0, MAXP - keep.length)) < 2) keep = old.map((x, i) => i);     // 2명 밑으로는 못 빼요
    const add = fresh.slice(0, Math.max(0, MAXP - keep.length));
    if (!add.length && keep.length === old.length) { old.forEach(x => { x.drop = false; }); return null; }
    const gone = old.filter((x, i) => keep.indexOf(i) < 0).map(x => x.name);
    const sc = ses.score;
    ses.score = { w: keep.map(i => sc.w[i] || 0).concat(add.map(() => 0)), l: keep.map(i => sc.l[i] || 0).concat(add.map(() => 0)) };
    const seats = keep.map(i => old[i]);
    for (const u of add) {
      const k = seats.length;
      seats.push({ ctrl: 'remote', uid: u, name: (pl[u] && pl[u].name) || `친구${k + 1}`, em: (pl[u] && pl[u].avatar) || '🙂' });
      delete ses.joinPick[u]; ses.watchers.delete(u);
    }
    old.splice(0, old.length, ...seats);                    // 은행 장부가 같은 배열을 보고 있어서 통째로 바꾸지 않고 자리만 갈아 끼움
    ses.n = seats.length; ses.me = Math.max(0, old.findIndex(x => x.ctrl === 'me'));
    const msg = [add.length ? `${add.map(u => (pl[u] && pl[u].name) || '친구').join(', ')} 님 합류` : '', gone.length ? `${gone.join(', ')} 님 빠짐` : ''].filter(Boolean).join(' · ');
    showToast(`${msg} → ${ses.n}명`, 2600);
    try { ses.net.chat(`📣 ${msg} → 이번 판부터 ${ses.n}명`); } catch (e) {}
    return { keep, add: add.length };
  }
  // 다음 핸드: 자리가 바뀌면 상태 배열도 새 자리 번호에 맞춰 옮김 (칩은 자리 따라감, 새로 앉은 사람은 기본 칩)
  function reseatForNext(ses) {
    const prev = ses.S, plan = reseatSeats(ses, !!ses.bank);
    if (!plan) return;
    const { keep, add } = plan, p = P.fastClone(prev), start = CHIPS.start('online', 1)[0];
    const pick = (arr, def) => keep.map(i => arr[i]).concat(Array.from({ length: add }, () => def));
    p.n = keep.length + add;
    p.coins = keep.map(i => prev.coins[i]).concat(Array.from({ length: add }, () => start));
    p.out = pick(prev.out, false); p.folded = pick(prev.folded, true); p.allIn = pick(prev.allIn, false);
    p.bets = pick(prev.bets, 0); p.totalBets = pick(prev.totalBets, 0); p.acted = pick(prev.acted, false);
    p.hands = keep.map(i => prev.hands[i]).concat(Array.from({ length: add }, () => []));
    p.sbSeat = keep.indexOf(prev.sbSeat); p.bbSeat = keep.indexOf(prev.bbSeat);
    // 딜러 버튼: 빠진 자리면 그 다음 자리가 다음 딜러가 되게 (nextRound 가 한 칸 더 넘기므로 바로 앞 칸으로)
    let target = keep.findIndex(o => o > prev.dealer); if (target < 0) target = 0;
    p.dealer = keep.indexOf(prev.dealer) >= 0 ? keep.indexOf(prev.dealer) : (target - 1 + p.n) % p.n;
    p.result = null;
    ses.S = p;
  }
  // 판(핸드)이 끝날 때 한 번: 이긴 자리 승, 같이 친 나머지 패 (탈락해 구경하던 자리는 빼고)
  function tally(ses) {
    const r = ses.S.result;
    if (!r || r.kind === 'over' || ses.tallied === ses.S.round) return;
    ses.tallied = ses.S.round;
    for (let q = 0; q < ses.S.n; q++) {
      if (ses.S.out[q]) continue;
      const k = (r.winners || []).includes(q) ? 'w' : 'l';
      ses.score[k][q] = (ses.score[k][q] || 0) + 1;
    }
  }

  function onGuestMsg(ses, m) {
    if (!ses.alive || !m) return;
    if (m.t === 'full') { alert('이미 시작된 판이에요. 다음에 같이 해요'); if (window.ArenaUI) ArenaUI.leave(); return; }
    if (m.t === '_rl') { const R = readyOf(ses, m.k); (m.uids || []).forEach(u => R.add(u)); if (ses.drawReady) ses.drawReady(); return; }
    if (m.t !== 'st') return;
    const prev = ses.V, wasSpec = ses.spec;
    ses.V = m.v; ses.me = m.me; ses.n = m.v.n; ses.waiting = false; ses.spec = m.me < 0;
    ses.seats = m.ro.map(r => ({ name: r.name, em: r.em, ctrl: r.ctrl === 'a' ? 'ai' : 'remote', uid: r.u || null, sub: !!r.b }));
    if (m.sc) ses.score = m.sc;
    rankNote(ses, m.v, m.me);
    if (!prev || prev.round !== m.v.round) ses.coachLog = [];
    if (prev && m.v.round < prev.round) { ses.readyMap = {}; ses.lastKey = ''; }      // 새 게임 (핸드 번호가 처음으로)
    $('startModal').hidden = true;
    // 내 차례 시계: 방장이 보낸 남은 초부터 세기만 해요 (시간이 다 되면 방장이 AI 로 대신 둠)
    const mine = m.me >= 0 && m.v.phase === 'bet' && m.v.turn === m.me;
    if (mine && m.left != null) clockStart(ses, m.left, true, null);
    else if (!mine) clockStop(ses);
    renderGame(ses);
    if (wasSpec && !ses.spec) showToast('🎉 자리에 앉았어요! 같이 해요', 2400);
    const key = `${m.v.round}|${m.v.over ? 'o' : m.v.phase}`;
    if (m.v.phase === 'end') {
      if (ses.lastKey !== key) { ses.lastKey = key; showEnd(ses); }
    } else {
      $('endModal').hidden = true;
      ses.drawReady = null;
      if (!prev || prev.turn !== m.v.turn) { if (m.v.turn === ses.me) showToast('내 차례예요'); }
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
      ov.innerHTML = `<div><div class="hsx-em">${esc(em || '🙂')}</div><h2>${esc(name)} 님 차례예요</h2><p>다른 사람은 화면을 보지 마세요<br>준비되면 아래 단추를 눌러 주세요</p><button class="primary" type="button">내 카드 보기</button></div>`;
      ov.querySelector('button').onclick = () => { ov.remove(); res(); };
      document.body.appendChild(ov);
    });
  }

  function aiChoose(ses, p) {
    const seat = ses.seats[p];
    return AI.choose(P.view(ses.S, p), seat.tier || 'normal', { seed: rand32() & 0xffff });
  }

  // 방장·혼자·한 기기·구경이 쓰는 진행 루프
  async function runLoop(ses) {
    try {
      while (ses.alive) {
        ses.coachLog = [];
        rankNote(ses, ses.S, ses.me);
        // 🎞️ 복기용 기록: 이 핸드 처음 상태 + 행동 차례 (같은 규칙 엔진으로 그대로 다시 둠)
        //   혼자·한 기기만 (친구랑은 기록 안 함 — 아래 saveReplay 설명), 연습 판·탈락 뒤 구경은 안 남김
        ses.rec = (ses.mode === 'solo' || ses.mode === 'hot') && !ses.practice && !ses.spectating && ses.S.phase === 'bet'
          ? { at: Date.now(), start: P.fastClone(ses.S), acts: [], hot: ses.mode === 'hot', seats: ses.seats.map(x => ({ name: x.ctrl === 'me' ? '나' : x.name, em: x.em, tier: x.ctrl === 'ai' ? x.tier || 'normal' : null, h: x.ctrl === 'me' || x.ctrl === 'hot' ? 1 : undefined })) }
          : null;
        publish(ses);
        renderGame(ses);
        while (ses.S.phase === 'bet' && ses.alive) {
          renderGame(ses);
          const p = ses.S.turn, seat = ses.seats[p];
          let a;
          if (seat.ctrl === 'hot') {
            ses.me = -1; renderGame(ses);
            await coverFor(seat.name, seat.em);
            if (!ses.alive) return;
            ses.me = p; ses.cc = null;
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); });
            ses.me = -1;
          } else if (seat.ctrl === 'me') {
            // 친구랑: 30초 안에 못 고르면 중급 AI 가 대신 둠 (⏱ 남은 초는 위 막대에, 10초 남으면 알림)
            if (ses.mode === 'host') clockStart(ses, TURN_SEC, true, () => { const pe = ses.pending; if (!pe) return; showToast('⏱ 30초가 지나서 AI 가 대신 냈어요', 2000); ses.pending = null; pe.resolve(aiChoose(ses, p)); });
            const mdPre = ses.mdrill && ses.mdrill.pending ? ses.S : null;   // 📒 노트에서 온 연습: 그 장면에서 고른 수를 채점
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); });
            clockStop(ses);
            if (mdPre) mDrillCheck(ses, mdPre, p, a);
          } else if (seat.ctrl === 'remote') {
            clockStart(ses, TURN_SEC, false, () => { if (ses.remoteWait && ses.remoteWait.seat === p) ses.remoteWait.res(null); });   // 시간이 다 되면 AI 가 대신
            if (seat.uid && (ses.net.players || {})[seat.uid]) sendTo(ses, seat.uid, p);       // 손님 화면에 남은 초가 뜨게 한 번 더
            a = await waitRemote(ses, p);
            clockStop(ses);
            if (a == null) { if (!ses.alive) return; if (ses.seats[p] === seat && seat.ctrl === 'remote') showToast(`⏱ ${seat.name} 님 시간이 지나서 AI 가 대신 냈어요`, 2000); await sleep(300); a = aiChoose(ses, p); }
          } else {
            await sleep(ses.mode === 'watch' ? 520 : 680);
            if (!ses.alive) return;
            a = aiChoose(ses, p);
          }
          if (!ses.alive) return;
          if (p !== ses.me) showToast(`${seat.name}: ${ACT_LABELS[a]}`);
          ses.S = P.step(ses.S, a).state;
          if (ses.rec) ses.rec.acts.push(a);
          publish(ses);
          renderGame(ses);
        }
        if (!ses.alive) return;
        if (ses.rec && ses.rec.acts.length && ses.S.phase === 'end') { saveReplay(ses.rec, ses.S); scanMistakes(ses.rec); } else ses.rec = null;   // 기록은 혼자·한 기기만
        if (ses.mode === 'host') tally(ses);
        publish(ses);
        renderGame(ses);
        if (!ses.practice) CHIPS.report(ses.mode, { round: ses.S.round, over: false, coins: ses.S.coins.slice(), seats: seatsInfo(ses), me: ses.me });
        const next = await showEnd(ses);
        if (!ses.alive) return;
        if (ses.practice) {                                   // 🎮 연습 판: 이 핸드 하나만 (전적·칩 보고 없음) → 다시 / 처음으로
          const pr = ses.practice;
          if (next === 'retry') startBranch(pr.rec, pr.k, pr.seat, ses.mdrill && !ses.mdrill.solved ? ses.mdrill.id : null); else openMenu();
          return;
        }
        if (next === 'lobby') { if (window.ArenaUI) ArenaUI.toLobby(); return; }
        if (next === 'menu') { openMenu(); return; }
        // 은행: 빌리기 요청 + 칩이 바닥난 사람은 은행에서 빌려 다시 앉음 (탈락 대신)
        if (ses.bank) {
          $('subTitle').textContent = '🏦 장부에 쓰는 중…';
          const r = await ses.bank.beforeNext({ coins: ses.S.coins, min: 1 });
          if (!ses.alive) return;
          ses.S.coins = r.coins;
          ses.S.coins.forEach((v, i) => { if (v > 0 && ses.S.out[i] && ses.bank.tracks(i)) ses.S.out[i] = false; });
        }
        if (ses.mode === 'host') reseatForNext(ses);          // 친구랑: 빠질 사람은 빼고, 방장이 체크한 구경꾼은 앉힘
        // 다음 핸드 (칩이 바닥난 자리는 여기서 탈락)
        ses.S = P.nextRound(ses.S, rand32());
        if (ses.S.over) {
          publish(ses); renderGame(ses);
          CHIPS.report(ses.mode, { round: ses.S.round, over: true, champion: ses.S.champion, coins: ses.S.coins.slice(), seats: seatsInfo(ses), me: ses.me });
          const o = await showOver(ses);
          if (!ses.alive) return;
          if (o === 'again') {
            if (ses.mode === 'host') reseatSeats(ses);        // 새 게임: 빠질 사람은 빼고 구경꾼은 앉힘 (모두 처음 칩으로 다시)
            const n = ses.mode === 'host' ? ses.seats.length : ses.S.n;
            const stacks = ses.bank ? await ses.bank.restart() : null;
            if (!ses.alive) return;
            ses.S = P.create({ players: n, stacks: withBank(CHIPS.start(ses.mode, n), stacks), seed: rand32() });
            ses.spectating = false;
            ses.readyMap = {}; ses.tallied = 0;               // 새 게임은 핸드 번호가 1 부터 다시 → 지난 게임의 준비·집계 표시를 지움
            continue;
          }
          if (o === 'lobby') { if (window.ArenaUI) ArenaUI.toLobby(); return; }
          openMenu(); return;
        }
        // 내가 탈락했으면 (혼자) 새 게임 / 구경 계속 고르기
        if (ses.mode === 'solo' && !ses.spectating && ses.S.out[ses.me]) {
          const o = await showBust(ses);
          if (!ses.alive) return;
          if (o === 'again') {
            const n = ses.S.n;
            ses.S = P.create({ players: n, stacks: CHIPS.start('solo', n), seed: rand32() });
            continue;
          }
          ses.spectating = true;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 결과 창
  function setEndButtons(list) {
    const box = $('endBtns'), out = [];
    box.innerHTML = '';
    for (const it of list) {
      if (it.note) { const p = document.createElement('p'); p.className = 'wait-note'; p.textContent = it.note; box.append(p); out.push(null); continue; }
      const b = document.createElement('button');
      b.type = 'button'; b.className = it.primary ? 'primary' : 'ghost'; b.textContent = it.label;
      b.onclick = it.onClick;
      box.append(b); out.push(b);
    }
    return out;
  }
  // 결과 창 안 '준비' 목록: 앉은 사람 ✅/⏳/🔌, 구경 N명. 방장은 끊긴 사람을 AI 로 바꾸거나 빼고, 구경꾼을 체크해 다음 판부터 앉힘. 다 준비돼야 '다음' 이 켜짐
  //  key = 이번 결과 번호 (핸드 끝 = 라운드, 게임 끝 = 라운드 + 'o'), over = 게임 끝 결과 (탈락자도 새 게임에는 같이 하니 기다림)
  function mountReady(ses, key, nb, fb, label, over) {
    document.querySelectorAll('#endModal .rdy').forEach(e => e.remove());
    const host = ses.mode === 'host', rb = document.createElement('div');
    rb.className = 'rdy'; $('endBtns').before(rb);
    const draw = () => {
      if (!rb.isConnected || !ses.alive || !ses.net) return;
      const v = getView(ses), pl = ses.net.players || {}, R = readyOf(ses, key), hostUid = host ? ses.net.uid : (ses.net.meta || {}).host;
      const isOut = i => !over && !!(v.out && v.out[i]);               // 탈락해 구경하는 자리는 안 기다림
      const seated = [];
      ses.seats.forEach((x, i) => {
        if (x.ctrl === 'ai' && !x.sub) return;                         // 처음부터 AI 인 자리는 안 보임
        if (x.uid && x.uid === hostUid) { seated.push(`<span class="ok">👑 ${esc(x.name)}</span>`); return; }
        const gone = !pl[x.uid], ok = R.has(x.uid) || x.sub, out = isOut(i);
        const fix = host && gone && !x.sub && !out ? ` <button type="button" data-ai="${i}">🤖 AI</button>${canDropSeat(ses) ? ` <button type="button" data-drop="${i}">👋 빼기</button>` : ''}` : '';
        seated.push(`<span class="${out ? 'dim' : ok ? 'ok' : gone ? 'gone' : ''}">${out ? '💤' : ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(x.name)}${x.sub ? ' (AI)' : ''}${out ? ' 탈락' : ''}${fix}</span>`);
      });
      const seatUids = new Set(ses.seats.map(x => x.uid).filter(Boolean));
      const watchers = Object.keys(pl).filter(u => !seatUids.has(u));
      const nameOf2 = u => esc((pl[u] && pl[u].name) || '친구');
      const canJoin = !ses.bank || over;                               // 은행 방은 새 게임(우승 창)에서만 구경꾼을 앉힘
      const wl = watchers.map(u => host && canJoin ? `<label><input type="checkbox" data-join="${esc(u)}" ${ses.joinPick[u] ? 'checked' : ''}> ${nameOf2(u)}${R.has(u) ? ' ✋' : ''}</label>` : `<span>${nameOf2(u)}${R.has(u) ? ' ✋' : ''}</span>`).join('');
      rb.innerHTML = `<div class="rdy-row">${seated.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? (canJoin ? ` · 체크하면 다음 판부터 같이 (최대 ${MAXP}명)` : ' · 은행 방은 새 게임부터 같이 쳐요') : ''}: ${wl}</div>` : ''}`;
      if (!host) return;
      const need = ses.seats.filter((x, i) => x.ctrl === 'remote' && !isOut(i)), k = need.filter(x => R.has(x.uid)).length, all = k === need.length;
      nb.disabled = !all; nb.textContent = all ? label : `${label} (준비 ${k}/${need.length})`;
      if (fb) fb.hidden = all;
      rb.querySelectorAll('[data-join]').forEach(c => { c.onchange = () => { ses.joinPick[c.dataset.join] = c.checked; }; });
      rb.querySelectorAll('[data-ai]').forEach(b => { b.onclick = () => { subAI(ses, +b.dataset.ai, false); draw(); }; });
      rb.querySelectorAll('[data-drop]').forEach(b => { b.onclick = () => { subAI(ses, +b.dataset.drop, true); draw(); }; });
    };
    draw();
    return draw;
  }
  // 손님 '✋ 준비' 단추 한 벌 (구경꾼은 '낄래요'). 눌렀다는 건 준비 목록(R)이 알고 있어서 새로 고침 뒤에도 방장이 알려 주면 이어짐
  function guestReadyBtn(ses, key) {
    const R = readyOf(ses, key);
    return {
      label: '✋ 준비', primary: true,
      onClick: () => { R.add(ses.net.uid); ses.net.send({ t: '_ready', k: key }, true); guestReadyBtn.paint(ses, key); if (ses.drawReady) ses.drawReady(); },
    };
  }
  guestReadyBtn.paint = (ses, key) => {
    const b = ses.readyBtn; if (!b) return;
    const on = readyOf(ses, key).has(ses.net.uid);
    b.textContent = on ? (ses.spec ? '✅ 신청했어요 · 방장을 기다려요' : '✅ 준비 완료 · 방장을 기다려요') : ses.spec ? (ses.bank && !/o$/.test(String(key)) ? '✋ 새 게임에 낄래요' : '✋ 다음 핸드에 낄래요') : '✋ 준비';
    b.disabled = on;
  };
  const nameOf = (ses, q) => (ses.seats[q] ? ses.seats[q].name : `자리${q + 1}`);

  // 한 핸드 결과. 방장·혼자는 '다음 핸드' 를 기다림 (구경·탈락 후엔 4초 뒤 자동), 손님은 방장이 넘기면 닫힘
  function showEnd(ses) {
    return new Promise(resolve => {
      const v = getView(ses), r = v.result, me = ses.me;
      if (v.over) { showOver(ses); resolve('over'); return; }      // 손님이 받은 '게임 끝'
      if (!r || r.kind === 'over') { resolve('next'); return; }
      const hot = ses.mode === 'hot';
      const iWon = me >= 0 && (r.winners || []).includes(me);
      const myPay = me >= 0 && r.payouts ? r.payouts[me] : 0;
      const splitMain = (r.mainWinners || []).length > 1;
      let title;
      if (ses.mode === 'watch') title = `🍿 ${esc(nameOf(ses, r.topPayout != null ? r.topPayout : (r.winners || [0])[0]))} 승리`;
      else if (hot) title = `🎉 ${esc(nameOf(ses, r.topPayout != null ? r.topPayout : r.winner))} 승리! (+${fmtN((r.payouts || [])[r.topPayout != null ? r.topPayout : r.winner])})`;
      else if (ses.spec) title = `👀 ${esc(nameOf(ses, r.topPayout != null ? r.topPayout : (r.winners || [0])[0]))} 승리`;
      else title = splitMain && iWon ? '🤝 스플릿 팟!' : iWon ? `🎉 이겼어요! (+${fmtN(myPay)}칩)` : (v.out && v.out[me]) ? '😶 구경 중' : '😢 아쉬운 패배';
      $('endTitle').textContent = title;
      $('endSub').textContent = r.reason;

      // 팟별 승자 (사이드 팟이 있을 때 보여 줌)
      const pb = $('endPots');
      const real = (r.pots || []).filter(p => !p.refund);
      if (real.length > 1 || (r.pots || []).some(p => p.refund)) {
        pb.hidden = false;
        pb.innerHTML = (r.pots || []).map((p, i) => `<div class="pt"><span>${p.refund ? '돌려받은 칩' : i === 0 ? '메인 팟' : `사이드 팟 ${i}`} ${fmtN(p.amount)}</span><b>${p.winners.map(w => esc(nameOf(ses, w))).join(', ')}</b></div>`).join('');
      } else pb.hidden = true;

      const sd = $('endShowdown');
      sd.innerHTML = '';
      (r.evals || []).forEach(ev => {
        if (ev.out) return;
        const isMe = ev.p === me;
        const isW = (r.winners || []).includes(ev.p);
        const row = document.createElement('div');
        row.className = 'sd-row' + (isW ? ' win' : '');
        const cardsTxt = ev.hidden ? '비공개' : (ev.hole || []).map(P.cardLabel).join(' ');
        const pay = r.payouts && r.payouts[ev.p] > 0 ? `<span class="pay">+${fmtN(r.payouts[ev.p])}</span>` : '';
        row.innerHTML = `<div><b>${esc(nameOf(ses, ev.p))}${isMe && nameOf(ses, ev.p) !== '나' ? ' (나)' : ''}</b> <span class="cards">${esc(cardsTxt)}</span></div>
          <div><strong style="color:#fde68a">${ev.folded ? '폴드' : esc(ev.name)}</strong> ${isW ? '👑' : ''}${pay}</div>`;
        sd.appendChild(row);
      });

      const cBox = $('endCoachBox');
      if (ses.coachAvail && ses.coachLog.length > 0) {
        const bestCnt = ses.coachLog.filter(x => x.tier === 'best' || x.tier === 'good').length;
        const acc = Math.round((bestCnt / ses.coachLog.length) * 100);
        const worst = ses.coachLog.slice().sort((a, b) => a.delta - b.delta)[0];
        cBox.hidden = false;
        cBox.innerHTML = `<div><b>🧑‍🏫 AI 선생님 복기 노트</b> · 정석 일치율 <b style="color:#34d399">${acc}%</b> (${bestCnt}/${ses.coachLog.length}회)</div>
          <div style="margin-top:4px;color:#a7f3d0">${worst && worst.delta < -8
            ? `💡 <b>아쉬운 순간</b>: ${esc(worst.street)} [${esc(worst.myHand)}] (에퀴티 ${worst.equityPct}%)에서 <b>${worst.chosen}</b> 대신 <b>${worst.best}</b> 선택이 기댓값 +${Math.abs(worst.delta)}칩 더 유리했습니다.`
            : '👏 에퀴티와 팟 오즈에 맞는 좋은 플레이였어요!'}</div>`;
      } else cBox.hidden = true;

      let autoT = 0;
      const done = val => { clearTimeout(autoT); $('endModal').hidden = true; ses.drawReady = null; resolve(val); };
      document.querySelectorAll('#endModal .rdy').forEach(e => e.remove());
      const key = readyKey(v);
      if (ses.mode === 'guest') {
        const list = [guestReadyBtn(ses, key)];
        list.push({ label: '나가기', onClick: () => { $('endModal').hidden = true; if (window.ArenaUI) ArenaUI.leave(); else openMenu(); } });
        const bs = setEndButtons(list);
        ses.readyBtn = bs[0]; guestReadyBtn.paint(ses, key);
        ses.drawReady = mountReady(ses, key, bs[0], null, '', false);
      } else if (ses.practice) {
        setEndButtons([
          { label: '🔁 다시 (같은 장면)', primary: true, onClick: () => done('retry') },
          { label: '처음으로', onClick: () => done('menu') },
          { note: '🎮 연습 판이라 전적·칩 기록엔 안 들어가요' },
        ]);
      } else {
        const list = [{ label: '다음 핸드 진행', primary: true, onClick: () => done('next') }];
        const rec = ses.rec;                                  // 방금 끝난 핸드 기록 (혼자·한 기기)
        if (rec && rec.acts.length) list.push({ label: '🎞️ 다시 보기', onClick: () => { clearTimeout(autoT); runReplay(rec, true); } });
        if (ses.mode === 'host') list.push({ label: '안 기다리고 시작', onClick: () => done('next') });
        if (ses.mode === 'host' && ses.bank && window.Bank) {
          list.push({ label: '🏦 정산', onClick: () => ses.bank.flush().then(() => Bank.panel({ game: 'poker', gid: ses.bank.gid, tab: 'settle' })) });
        }
        list.push(ses.mode === 'host' ? { label: '대기실로', onClick: () => done('lobby') } : { label: '설정 바꾸기', onClick: () => done('menu') });
        const bs = setEndButtons(list);
        if (ses.mode === 'host') ses.drawReady = mountReady(ses, key, bs[0], bs[1], '다음 핸드 진행', false);
        if (ses.mode === 'watch' || ses.spectating) autoT = setTimeout(() => { if (!$('endModal').hidden && ses.alive) done('next'); }, 4200);
      }
      $('endModal').hidden = false;
    });
  }

  // 🏆 랭킹: 한 게임(우승자가 가려질 때까지)이 끝날 때 내 기기에서 내 결과만 알림 (혼자=AI 판 · 친구 방=친구 판, 한 기기·AI 구경·구경꾼·연습은 안 보냄)
  //   rankNote: 새 게임 첫 핸드에서 내 시작 칩 기록 (이번 게임 칩 손익 = 지금 칩 - 시작 칩) · 블라인드 낸 뒤라 낸 돈을 더해 둠
  function rankNote(ses, v, me) {
    if (v && v.round === 1 && v.phase === 'bet' && me >= 0) { ses.rankStart = v.coins[me] + (v.totalBets ? v.totalBets[me] : 0); ses.rankDone = false; }
  }
  function rankReport(ses, v, bust) {
    try {
      if (!window.GRank || ses.practice || ses.rankDone || ses.spec) return;
      if (ses.mode !== 'solo' && ses.mode !== 'host' && ses.mode !== 'guest') return;
      const me = ses.me;
      if (!(me >= 0)) return;
      ses.rankDone = true;
      const myUid = ses.net && ses.net.uid, won = !bust && v.champion === me;
      const humans = ses.mode === 'solo' ? [] : ses.seats.map((x, i) => ({ x, i })).filter(o => o.i !== me && o.x.uid && o.x.uid !== myUid && !o.x.sub);
      const aiSeat = humans.length ? null : ses.seats.find(x => x && x.ctrl === 'ai' && x.tier);   // 혼자 하기는 AI 난이도(easy·normal·hard)도 같이
      GRank.result('poker', {
        mode: humans.length ? 'friend' : 'ai', tier: aiSeat ? aiSeat.tier : undefined, res: won ? 'w' : 'l', beat: won ? v.n - 1 : 0,
        score: ses.rankStart != null ? v.coins[me] - ses.rankStart : undefined,
        opp: humans.map(o => ({ uid: o.x.uid, res: v.coins[me] > v.coins[o.i] ? 'w' : v.coins[me] < v.coins[o.i] ? 'l' : 'd' })),
      });
    } catch (e) { console.warn('[rank]', e); }
  }

  // 게임 끝 (한 명만 남음)
  function showOver(ses) {
    return new Promise(resolve => {
      const v = getView(ses), champ = v.champion, me = ses.me;
      const iWon = champ === me;
      if (!ses.spectating) rankReport(ses, v);
      if (ses.mode === 'solo' && !ses.spectating) { const st = loadStats(); st.games += 1; if (iWon) st.wins += 1; saveStats(st); }
      $('endTitle').textContent = iWon ? '🏆 우승! 끝까지 살아남았어요' : `🏆 ${esc(nameOf(ses, champ))} 우승!`;
      $('endSub').textContent = `${fmtN(v.coins[champ])}칩으로 테이블을 차지했어요 · ${v.round}번째 핸드`;
      $('endPots').hidden = true;
      $('endCoachBox').hidden = true;
      const order = v.coins.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c);
      $('endShowdown').innerHTML = order.map((o, k) => `<div class="sd-row${o.i === champ ? ' win' : ''}"><div><b>${k + 1}위 ${esc(nameOf(ses, o.i))}${o.i === me && nameOf(ses, o.i) !== '나' ? ' (나)' : ''}</b></div><div><strong style="color:#fde68a">${fmtN(o.c)}칩</strong>${o.c === 0 ? ' · 탈락' : ''}</div></div>`).join('');
      const done = val => { $('endModal').hidden = true; ses.drawReady = null; resolve(val); };
      document.querySelectorAll('#endModal .rdy').forEach(e => e.remove());
      const key = readyKey(v);
      if (ses.mode === 'guest') {
        const bs = setEndButtons([guestReadyBtn(ses, key), { label: '나가기', onClick: () => { $('endModal').hidden = true; if (window.ArenaUI) ArenaUI.leave(); else openMenu(); } }]);
        ses.readyBtn = bs[0]; guestReadyBtn.paint(ses, key);
        ses.drawReady = mountReady(ses, key, bs[0], null, '', true);
      } else {
        const list = [{ label: '새 게임', primary: true, onClick: () => done('again') }];
        if (ses.mode === 'host') list.push({ label: '안 기다리고 시작', onClick: () => done('again') });
        if (ses.mode === 'host' && ses.bank && window.Bank) list.push({ label: '🏦 정산', onClick: () => ses.bank.flush().then(() => Bank.panel({ game: 'poker', gid: ses.bank.gid, tab: 'settle' })) });
        list.push(ses.mode === 'host' ? { label: '대기실로', onClick: () => done('lobby') } : { label: '설정 바꾸기', onClick: () => done('menu') });
        const bs = setEndButtons(list);
        if (ses.mode === 'host') ses.drawReady = mountReady(ses, key, bs[0], bs[1], '새 게임', true);
      }
      $('endModal').hidden = false;
    });
  }
  function showBust(ses) {
    return new Promise(resolve => {
      const st = loadStats(); st.games += 1; saveStats(st);
      rankReport(ses, getView(ses), true);
      $('endTitle').textContent = '😵 칩이 바닥나 탈락!';
      $('endSub').textContent = '남은 AI들의 승부를 구경하거나, 새 게임을 시작할 수 있어요';
      $('endPots').hidden = true; $('endCoachBox').hidden = true; $('endShowdown').innerHTML = '';
      const done = val => { $('endModal').hidden = true; resolve(val); };
      setEndButtons([{ label: '새 게임', primary: true, onClick: () => done('again') }, { label: '구경 계속', onClick: () => done('watch') }]);
      $('endModal').hidden = false;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 🎞️ 복기 (다시 보기): 이 기기에서 친 핸드 10개까지 (혼자·한 기기)
  //   rec = { at, start(핸드 처음 전체 상태: 덱·홀카드·칩·팟), acts[행동 번호], seats[{name, em, tier}], title, mode, hot }
  //   · 친구랑은 남기지 않음: 손님 기기엔 남의 홀카드가 없고, 방장 기기만 남기면 친구가 폴드한 카드를 방장 혼자 보게 돼요
  const RKEY = 'poker.replays';
  const loadReplays = () => { const l = store(RKEY, []); return Array.isArray(l) ? l.filter(x => x && x.start && Array.isArray(x.acts) && Array.isArray(x.seats)) : []; };
  function saveReplay(rec, end) {
    const r = end && end.result;
    const ws = r ? (r.winners || []).map(w => (rec.seats[w] || {}).name || '?') : [];
    const who = ws.includes('나') ? (ws.length > 1 ? '스플릿 (나 포함)' : '내가 이겼어요') : ws.length > 1 ? `스플릿 (${ws.join('·')})` : `${ws[0] || '?'} 승리`;
    rec.title = r ? `${who} · ${r.kind === 'foldWin' ? '모두 폴드' : r.winnerHand || '쇼다운'} · 팟 ${fmtN(r.pot)}` : '핸드';
    rec.mode = `${rec.hot ? '한 기기' : '혼자'} ${end.n}인 · ${end.round}번째 핸드`;
    try { const list = loadReplays().filter(x => x.at !== rec.at); list.unshift(rec); save(RKEY, list.slice(0, 10)); } catch (e) {}
    drawReplayBtn();
  }
  function drawReplayBtn() { const b = $('replayBtn'); if (b) b.hidden = !loadReplays().length; drawMistakeBtn(); }

  // ── 📒 아쉬운 장면 (common/mistakes.js): 내 행동이 선생님 추천보다 뚜렷이 손해였던 장면을 모음 → 그 장면부터 다시 ──
  //   · 핸드가 끝나면 쉬는 틈에(조금씩) 사람 자리 행동만 그 사람 눈(P.view)으로 다시 봄 → 손해 큰 것 2개까지 (판정 기준은 AI.review)
  //   · 복기 선생님이 본 장면도 같은 기준으로 넣음 (같은 핸드·같은 장면은 하나로)
  const MST_PER_ROUND = 2;
  const isHumanSeat = (rec, i) => { const x = rec && rec.seats[i]; return !!x && (!!x.h || x.name === '나'); };
  const idleRun = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 60));
  const recLite = (rec, k) => ({ at: rec.at, start: rec.start, acts: rec.acts.slice(0, k), seats: rec.seats, title: rec.title, mode: rec.mode, hot: rec.hot });
  const streetName = s => String(P.STREET_NAMES[s] || '').replace(/\s*\(.*\)\s*$/, '');
  function addMistake(rec, k, seat, street, r) {
    if (!window.Mistakes || !r || !r.miss) return;
    try {
      Mistakes.add({ game: 'poker', title: `포커 · ${rec.title || '핸드'}`, scene: `${streetName(street)} · ${(rec.seats[seat] || {}).name || '나'}`,
        my: r.my, best: r.best, why: r.why, sev: r.sev, lossText: r.lossText, drill: { rec: recLite(rec, k), k, seat } });
    } catch (e) {}
  }
  function scanMistakes(rec) {
    if (!window.Mistakes || !AI.review || !rec || !rec.acts.length || !rec.seats.some((x, i) => isHumanSeat(rec, i))) return;
    let st = P.fastClone(rec.start), k = 0;
    const found = [];
    const run = () => {
      try {
        const t0 = performance.now();
        while (k < rec.acts.length && st.phase === 'bet' && performance.now() - t0 < 10) {
          const a = rec.acts[k];
          if (isHumanSeat(rec, st.turn)) { const r = AI.review(P.view(st, st.turn), a); if (r && r.miss) found.push({ k, seat: st.turn, street: st.street, r }); }
          st = P.step(st, a).state; k++;
        }
      } catch (e) { return; }
      if (k < rec.acts.length && st.phase === 'bet') { idleRun(run); return; }
      found.sort((x, y) => y.r.sev - x.r.sev).slice(0, MST_PER_ROUND).forEach(f => addMistake(rec, f.k, f.seat, f.street, f.r));
    };
    idleRun(run);
  }
  // 노트에서 온 연습(?drill): 첫 장면은 추천을 감추고(💡 로 봄), 고른 행동이 추천 쪽(👑·🟢)이면 ✅
  const mHide = ses => !!(ses && ses.mdrill && ses.mdrill.pending && ses.mdrill.hide);
  const MHIDE_HTML = '📒 아쉬웠던 그 장면이에요 — 이번엔 직접 골라 보세요 · <button type="button" class="mst-reveal" data-mreveal style="border:0;border-radius:8px;padding:3px 9px;margin:2px 0;background:#fde68a;color:#3a2e0b;font-family:inherit;font-weight:700;font-size:12.5px;line-height:1.3;cursor:pointer">💡 답 보기</button>';
  function mDrillCheck(ses, st, p, a) {
    const m = ses.mdrill; if (!m) return;
    m.pending = false; m.hide = false;
    let r = null;
    try { r = AI.review(P.view(st, p), a, { read: false }); } catch (e) { r = null; }
    if (!r) return;
    if (r.tier === 'best' || r.tier === 'good') { m.solved = true; if (window.Mistakes) Mistakes.solved(m.id); showToast('✅ 이번엔 잘 골랐어요!', 2400); }
    else showToast(`🤔 아쉬워요 — 추천은 ${r.best}`, 2600);
  }
  function drawMistakeBtn() {
    const b = $('mistakeBtn'); if (!b) return;
    const n = window.Mistakes ? Mistakes.count('poker') : 0;
    b.hidden = !n; b.textContent = `📒 아쉬운 장면 ${n}`;
  }
  const fmtAt = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function openReplayList() {
    const list = loadReplays();
    if (!list.length) { drawReplayBtn(); return; }
    const ov = document.createElement('div');
    ov.className = 'modal rp-modal';
    ov.innerHTML = `<div class="modal-box"><h2>🎞️ 지난 판 다시 보기</h2><p class="sub">이 기기에서 친 핸드 ${list.length}개 (최근 10개까지). 다시 보기에서는 모두의 카드가 보여요.</p>`
      + `<div class="rplist">${list.map((x, i) => `<button type="button" data-i="${i}"><b>${esc(x.title || '핸드')}</b><span class="small">${fmtAt(x.at)} · ${esc(x.mode || '')} · ${x.seats.slice(0, 8).map(q => esc(q.name)).join(', ')}</span></button>`).join('')}</div>`
      + '<div class="row-btns"><button type="button" class="ghost" data-x style="flex:1">닫기</button></div></div>';
    ov.onclick = e => {
      if (e.target === ov || e.target.closest('[data-x]')) { ov.remove(); return; }
      const b = e.target.closest('[data-i]'); if (!b) return;
      ov.remove(); startReplay(list[+b.dataset.i]);
    };
    document.body.appendChild(ov);
  }
  function startReplay(rec) {
    endSession();
    $('startModal').hidden = true; $('endModal').hidden = true;
    runReplay(rec, false);
  }
  const stateAt = (rec, k) => { let st = P.fastClone(rec.start); for (let j = 0; j < k; j++) st = P.step(st, rec.acts[j]).state; return st; };
  // 🎮 '여기서부터 내가 치기': k 번째 행동 앞 장면(같은 카드·덱·칩·팟)에서 seat 자리를 내가, 나머지는 AI.
  //   선생님 켠 채 시작 · 이 핸드 하나만 치고 끝 (전적·칩 보고·은행 없음)
  function startBranch(rec, k, seat, mid) {
    let st = null;
    try { st = stateAt(rec, k); } catch (e) { console.warn(e); }
    if (!st || st.phase !== 'bet') { showToast('이 장면에선 이어서 칠 수 없어요', 2000); return; }
    endSession();
    $('startModal').hidden = true; $('endModal').hidden = true;
    const meInfo = getMeInfo();
    const seats = rec.seats.map((x, i) => (i === seat
      ? { ctrl: 'me', name: '나', em: meInfo.avatar || '🧑' }
      : { ctrl: 'ai', tier: x.tier || cfg.tier || 'normal', name: x.name === '나' ? '그때의 나' : x.name, em: x.name === '나' ? '🙂' : x.em }));
    const ses = SES = { alive: true, mode: 'solo', practice: { rec, k, seat }, n: st.n, me: seat, S: st, seats, pending: null, coachLog: [], coachAvail: true, coachOn: true, spectating: false, mdrill: mid ? { id: mid, pending: true, hide: true } : null };
    ensureCoach(ses);
    if (ses.cp) { try { ses.cp.show(); ses.cp.collapse(false); } catch (e) {} }   // 선생님 켠 채 시작 (단추로 끌 수 있음)
    showToast(mid ? '📒 아쉬웠던 장면부터 다시 — 이번엔 추천 수를 찾아보세요' : '🎮 이 장면부터 내가 쳐요 · 🧑‍🏫 선생님 켜 둠', 2600);
    runLoop(ses);
  }
  // 다시 보기: ⏮ 처음 · ◀ 한 수 뒤 · ⏯ 재생/멈춤 · ▶ 한 수 앞. inline = 결과 창에서 (닫으면 결과 창으로)
  //   위 줄: 🧑‍🏫 선생님(그 차례 사람 카드만 보고 낸 추천 vs 실제로 한 것) · 🎮 여기서부터 내가 치기
  //   재생 줄은 내 자리 안 베팅 버튼 자리에 들어가서 카드·버튼을 가리지 않아요
  async function runReplay(rec, inline) {
    const parent = inline ? SES : null;
    const acts = rec.acts || [];
    const mine = rec.seats.findIndex(x => x.name === '나');
    const rs = { alive: true, mode: 'replay', n: rec.start.n, me: mine >= 0 ? mine : 0, S: P.fastClone(rec.start), seats: rec.seats.map(x => ({ ctrl: 'remote', name: x.name, em: x.em })),
      pending: null, coachLog: [], coachAvail: false, coachOn: false, parent, modals: [] };
    let wake = null;
    const kick = () => { const w = wake; wake = null; if (w) w(); };
    rs.onEnd = () => { rs.killed = true; kick(); };          // ⚙ 메뉴 등으로 세션이 끝나면 바로 멈춤
    const nap = ms => new Promise(res => { const t = setTimeout(() => { wake = null; res(); }, ms); wake = () => { clearTimeout(t); res(); }; });
    const pcv = !!(parent && parent.cp && parent.cp.visible);   // 그 판 선생님 창은 잠깐 숨김
    if (pcv) parent.cp.hide();
    $('endModal').hidden = true; $('coachPanel').hidden = true;
    SES = rs;
    const seatEl = $('mySeat');
    seatEl.classList.add('rp');
    let i = 0;
    const rp = { cmd: null, play: true, branch: null };
    const canBranch = !(parent && parent.net);                 // 친구 방 결과 창에서는 방을 떠나게 되니 안 보임
    const rg = document.createElement('div'); rg.className = 'rpgo';
    rg.innerHTML = `<button type="button" data-rg="coach" aria-pressed="false">🧑‍🏫 선생님</button>${canBranch ? '<button type="button" data-rg="branch" class="br">🎮 여기서부터 내가 치기</button>' : ''}`;
    const bar = document.createElement('div'); bar.className = 'rpbar';
    bar.innerHTML = `<button type="button" data-rp="start" aria-label="처음으로">⏮</button><button type="button" data-rp="prev" aria-label="한 수 뒤로">◀</button><button type="button" data-rp="play" class="pp" aria-label="재생 · 멈춤"></button><button type="button" data-rp="next" aria-label="한 수 앞으로">▶</button><span class="rpn"></span><button type="button" data-rp="exit" class="rpx">${inline ? '결과로' : '닫기'}</button>`;
    seatEl.append(rg, bar);

    const nm = q => (rec.seats[q] || {}).name || `자리${q + 1}`;
    const actText = (st, p, a) => { const c = P.actionCost(st, p, a); return a === P.A_FOLD ? '폴드' : a === P.A_CALL ? (c ? `콜 ${fmtN(c)}칩` : '체크') : `${ACT_LABELS[a]} ${fmtN(c)}칩`; };
    const MARK = { best: '✅ 추천과 같아요',good: '🟢 괜찮아요', ok: '🟡 조금 아쉬워요', bad: '🔴 손해가 커요' };
    let rpPanel = null, rpOn = false;
    const readCache = new Map(), noted = new Set();
    function rpCoach() {
      if (!rpOn) return;
      const st = rs.S, a = acts[i];
      let html;
      if (st.phase === 'bet' && i < acts.length) {
        const p = st.turn, c = AI.coach(P.view(st, p), p), info = c.byAction[a];    // 그 사람 시점(남의 카드는 가림)으로만 계산
        if (!noted.has(i) && AI.review && isHumanSeat(rec, p)) {   // 📒 사람 자리의 뚜렷한 손해는 노트에도 (같은 기준)
          noted.add(i);
          try { addMistake(rec, i, p, st.street, AI.review(P.view(st, p), a, { c })); } catch (e) {}
        }
        // 🤔 이 행동으로 본 패 짐작 (보드·베팅만 보고) + 실제 패는 그 중 어디쯤 — 장면마다 한 번만 셈
        let rd = readCache.get(i);
        if (rd === undefined) { try { rd = AI.readAction ? AI.readAction(P.view(st, p), p, a, st.hands[p]) : null; } catch (e) { rd = null; } readCache.set(i, rd); }
        const KIND = { fold: '폴드', call: '콜·체크', bet: '베팅' };
        const read = rd ? `<div class="rp-read">🤔 <b>${esc(rd.tag)}</b> — ${esc(rd.why)}<br><span>이 자리에서 ${KIND[rd.kind]}하는 패는 보통 승률 ${rd.avgSame != null ? rd.avgSame + '%' : '?'} 정도 (올 수 있는 패의 ${rd.share}%) · 실제 패는 [${esc(rd.handName)}] 승률 ${rd.equityPct}% · 상위 ${rd.top}%</span></div>` : '';
        html = `<div class="rp-who"><b>${esc(nm(p))}</b> 차례 · ${esc(P.STREET_NAMES[st.street] || '')} <span>(그 사람 카드만 보고)</span></div>`
          + `<div class="rp-real">👑 추천 <b>${esc(actText(st, p, c.bestAction))}</b> · 실제로 <b>${esc(actText(st, p, a))}</b><br>${info ? MARK[info.tier] + (info.tier !== 'best' ? ` (기댓값 ${Math.round(info.delta)}칩)` : '') : ''}</div>${read}${coachHtml(c)}`;
      } else html = `<div class="coach-detail">핸드 끝 — ${esc(rec.title || '')}. ◀ 로 돌아가면 장면마다 볼 수 있어요</div>`;
      if (rpPanel) { rpPanel.set(html); if (!rpPanel.visible) rpPanel.show(); }
      else { const cp = $('coachPanel'); cp.hidden = false; cp.innerHTML = html; }
    }
    const draw = () => {
      bar.querySelector('.pp').textContent = rp.play ? '⏸' : '⏵';
      bar.querySelector('.rpn').textContent = `${i} / ${acts.length}`;
      renderGame(rs); rpCoach();
    };
    // 어느 자리를 칠까: '나' 가 아직 칠 수 있으면 바로, 아니면 이 장면에서 칠 수 있는 자리 중에서 고름
    const pickSeat = st => new Promise(res => {
      const canAct = q => !st.folded[q] && !(st.out && st.out[q]) && !st.allIn[q];
      if (mine >= 0 && canAct(mine)) { res(mine); return; }
      let picked = -1;
      const close = askBox({
        title: '🎮 어느 자리를 칠까요?',
        html: `${mine >= 0 ? '이 장면엔 내 자리가 이미 폴드·올인이에요. ' : ''}고른 자리는 내가, 나머지는 AI 가 이어서 쳐요.`,
        buttons: rec.seats.map((x, q) => q).filter(canAct).map(q => ({ label: `${rec.seats[q].em || ''} ${nm(q)}${q === st.turn ? ' (지금 차례)' : ''}`, primary: q === st.turn, onClick: () => { picked = q; } })).concat([{ label: '취소' }]),
        onClose: () => res(picked),
      });
      rs.modals.push(close);
    });
    rg.onclick = async e => {
      const b = e.target.closest('[data-rg]'); if (!b || !rs.alive) return;
      if (b.dataset.rg === 'coach') {
        rpOn = !rpOn; b.setAttribute('aria-pressed', String(rpOn)); b.classList.toggle('on', rpOn);
        if (rpOn && !rpPanel && window.CoachPanel) {
          // 처음 자리: 테이블 오른쪽 아래 안 (내 카드·재생 줄을 안 가림, 가로 화면에서도 테이블 칸 안)
          try { const tb = $('tbl').getBoundingClientRect(); rpPanel = CoachPanel.create({ game: 'poker-rp', title: 'AI 선생님 · 복기', startHidden: true, bottom: Math.max(8, Math.round(innerHeight - tb.bottom + 6)), right: Math.max(8, Math.round(innerWidth - tb.right + 6)) }); } catch (err) { rpPanel = null; }
        }
        if (rpOn) { rpCoach(); if (rpPanel && rpPanel.collapsed) rpPanel.collapse(false); }
        else if (rpPanel) rpPanel.hide(); else $('coachPanel').hidden = true;
        return;
      }
      if (rs.S.phase !== 'bet' || i >= acts.length) { showToast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요', 2000); return; }
      rp.play = false; draw();
      const seat = await pickSeat(rs.S);
      if (seat < 0 || !rs.alive) return;
      rp.branch = { k: i, seat }; rp.cmd = 'exit'; kick();
    };
    bar.onclick = e => {
      const b = e.target.closest('[data-rp]'); if (!b || !rs.alive) return;
      const k = b.dataset.rp;
      if (k === 'play') { rp.play = !rp.play; if (rp.play && i >= acts.length) rp.cmd = 'start'; }
      else { rp.cmd = k; rp.play = false; }
      bar.querySelector('.pp').textContent = rp.play ? '⏸' : '⏵';
      kick();
    };
    let broken = false;
    try {
      draw();
      await nap(700);                                         // 첫 장면을 잠깐 보여 주고 재생
      while (rs.alive) {
        let cmd = rp.cmd; rp.cmd = null;
        if (!cmd && rp.play && i < acts.length) cmd = 'next';
        if (!cmd) { await new Promise(res => { wake = res; }); continue; }
        if (cmd === 'exit') break;
        if (cmd === 'next') {
          if (i >= acts.length) continue;
          const st = rs.S, p = st.turn, a = acts[i], label = actText(st, p, a);
          rs.S = P.step(st, a).state; i++;
          draw();
          showToast(`${nm(p)}: ${label}`);
          if (i >= acts.length) { rp.play = false; draw(); showToast(rec.title ? '끝 — ' + rec.title : '끝까지 봤어요', 2600); }
          else if (rp.play) await nap(950);
        } else {
          const k = cmd === 'start' ? 0 : Math.max(0, i - 1);
          rs.S = stateAt(rec, k); i = k; draw();
        }
      }
    } catch (e) {
      console.warn(e); broken = true;                         // 망가진 기록 (규칙이 바뀐 뒤의 옛 기록 등)
    } finally {
      seatEl.classList.remove('rp'); rg.remove(); bar.remove();
      if (rpPanel) { try { rpPanel.destroy(); } catch (e) {} }
      $('coachPanel').hidden = true;
      rs.modals.splice(0).forEach(f => { try { f(); } catch (e) {} });
    }
    if (rs.killed) return;                                    // 다른 곳에서 세션을 끝냄 (메뉴 등)
    if (broken) showToast('이 기록은 다시 볼 수 없어요', 2200);
    if (rp.branch) { startBranch(rec, rp.branch.k, rp.branch.seat); if (SES !== rs) return; }
    if (parent && parent.alive) {                             // 결과 창으로 돌아감 (판 상태 그대로)
      rs.alive = false; SES = parent;
      if (pcv && parent.cp) parent.cp.show();
      renderGame(parent); drawCoachBtn();
      $('endModal').hidden = false;
      return;
    }
    openMenu();
  }

  // ─────────────────────────────────────────────────────────────
  // 메뉴 (시작 모달)
  function drawMenu() {
    const mode = cfg.mode;
    document.querySelectorAll('.seg[data-seg="mode"] button').forEach(b => b.classList.toggle('on', b.dataset.val === mode));
    document.querySelectorAll('.seg[data-seg="tier"] button').forEach(b => b.classList.toggle('on', b.dataset.val === cfg.tier));
    ensureHotPick();
    $('hotField').hidden = !(mode === 'hot' && hotPick);
    $('countField').hidden = mode === 'online' || (mode === 'hot' && !!hotPick);
    $('goStart').disabled = mode === 'hot' && hotPick ? !hotPick.valid : false;
    $('tierField').hidden = mode === 'online' || mode === 'watch' || (mode === 'hot' && !!hotPick);
    $('countLabel').textContent = mode === 'watch' ? 'AI 인원' : mode === 'hot' ? '인원 (자리를 눌러 사람↔AI)' : '인원 (나 + AI)';
    $('countSeg').innerHTML = Array.from({ length: MAXP - 1 }, (_, i) => `<button type="button" data-val="${i + 2}" class="${cfg.count === i + 2 ? 'on' : ''}">${i + 2}인</button>`).join('');
    const hotBox = $('hotSeats');
    hotBox.hidden = mode !== 'hot';
    if (mode === 'hot') {
      hotBox.innerHTML = Array.from({ length: cfg.count }, (_, i) => `<button type="button" data-i="${i}" class="${cfg.hotSeats[i] === 'h' ? 'on' : ''}">${i + 1}번 ${cfg.hotSeats[i] === 'h' ? '👤 사람' : '🤖 AI'}</button>`).join('');
    }
    $('goStart').textContent = mode === 'online' ? '방 만들기·들어가기' : mode === 'hot' ? '📱 한 기기로 시작' : '홀덤 테이블 입장';
  }
  document.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-val]');
      if (!btn) return;
      const key = seg.dataset.seg, val = btn.dataset.val;
      if (key === 'mode') cfg.mode = val;
      else if (key === 'tier') cfg.tier = val;
      else if (key === 'count') { cfg.count = +val; save('poker.count', cfg.count); }
      drawMenu();
    });
  });
  $('hotSeats').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const i = +b.dataset.i;
    cfg.hotSeats[i] = cfg.hotSeats[i] === 'h' ? 'a' : 'h';
    save('poker.hotSeats', cfg.hotSeats);
    drawMenu();
  });

  $('jokboBtn').addEventListener('click', () => { $('jokboModal').hidden = false; });
  $('closeJokboBtn').addEventListener('click', () => { $('jokboModal').hidden = true; });
  $('menuBtn').addEventListener('click', () => {
    if (SES && SES.net && window.ArenaUI && ArenaUI.net) { if (confirm('방에서 나갈까요?')) ArenaUI.leave(); return; }
    openMenu();
  });
  $('goStart').addEventListener('click', () => {
    if (cfg.mode === 'online') startOnlineGame();
    else startLocal();
  });
  $('replayBtn').addEventListener('click', openReplayList);
  // 📱 아래 여백: 폴드처럼 작업 표시줄이 판 아래를 덮는 기기 (자동으로 켜지기도 함, common/fit.js)
  const drawGap = () => { const b = $('gapBtn'); if (b) b.textContent = window.FitGap && FitGap.on ? '📱 화면 아래 여백: 켬 (누르면 끔)' : '📱 화면 아래가 가려지면 켜기'; };
  $('gapBtn').addEventListener('click', () => { if (!window.FitGap) return; FitGap.set(!FitGap.on); drawGap(); showToast(FitGap.on ? '아래를 조금 비웠어요' : '아래 여백을 껐어요'); });
  drawGap(); setTimeout(drawGap, 800);
  $('gRankBtn').addEventListener('click', () => { if (window.GRank) GRank.open('poker'); else showToast('랭킹을 불러오지 못했어요'); });
  try { if (window.GRank) GRank.migrateLocal('poker', () => { const st = loadStats(); return { n: st.games, w: st.wins, l: Math.max(0, st.games - st.wins) }; }); } catch (e) {}   // 예전 기기 기록 한 번 올림
  // 📒 아쉬운 장면: 시작 창 단추(없으면 숨김) · 목록을 닫으면 숫자 다시 · 노트에서 온 주소(?drill=)면 그 장면부터 연습 (맨 아래)
  $('mistakeBtn').addEventListener('click', () => {
    if (!window.Mistakes) return;
    Mistakes.open({ game: 'poker' });
    const t = setInterval(() => { if (!document.querySelector('.mst-ov')) { clearInterval(t); drawMistakeBtn(); } }, 400);
  });
  if (window.Mistakes) Mistakes.onChange(drawMistakeBtn);
  document.addEventListener('click', e => {                 // 💡 답 보기 (노트 연습 첫 장면)
    if (!e.target.closest('[data-mreveal]')) return;
    const ses = SES; if (!ses || !ses.mdrill || !ses.mdrill.hide) return;
    ses.mdrill.hide = false; renderGame(ses);
  });
  drawReplayBtn();

  window.__poker = { get ses() { return SES; } };          // 시험용 (읽기만)
  // 처음 화면: 배경용 빈 테이블
  drawMenu();
  $('coachBtn').hidden = true;
  // 초대 링크(?room=코드)로 오면 시작 창을 닫고 바로 대기실 (시작 창이 대기실을 가리지 않게)
  const mDrill = window.Mistakes ? Mistakes.fromUrl('poker') : null;
  if (!mDrill && window.ArenaUI) ArenaUI.checkUrl(() => { $('startModal').hidden = true; ArenaUI.open(FRIEND); });
  (function idleTable() {
    const S0 = P.create({ players: 4, seed: 2026 });
    const seats = seatNames(4, ['me', 'ai', 'ai', 'ai'], 'normal');
    SES = { alive: true, mode: 'solo', n: 4, me: 0, S: S0, seats, pending: null, coachLog: [], coachAvail: false, coachOn: false, idle: true };
    renderGame(SES);
    SES = null;
  })();
  if (mDrill && mDrill.drill && mDrill.drill.rec && mDrill.drill.rec.start) {     // 📒 노트에서 온 주소: 그 장면부터 연습 (선생님 켠 채, 첫 장면은 💡 로 답 보기)
    const d = mDrill.drill, seat = d.seat != null ? d.seat : Math.max(0, d.rec.seats.findIndex(x => x.name === '나'));
    try { startBranch(d.rec, d.k, seat, mDrill.id); } catch (e) { console.warn(e); showToast('이 장면은 다시 열 수 없어요', 2200); }
  }
})();

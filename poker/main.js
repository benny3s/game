/* 텍사스 홀덤 포커 (Texas Hold'em) — 화면 · 둥근 테이블(2~8명) · AI 선생님 · 친구랑(방장이 판을 돌림) · 한 기기 · AI 구경 (main.js) */
(function () {
  'use strict';
  const P = window.Poker;
  const AI = window.PokerAI;
  const MAXP = P.MAX_PLAYERS;                         // 8

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
  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 1500);
  }

  // ─────────────────────────────────────────────────────────────
  // 세션 (SES): { alive, mode: solo|hot|watch|host|guest, S(전체 상태, 방장·혼자) | V(받은 시점 상태, 손님), me(-1 = 아무도 안 보는 중), seats }
  let SES = null;
  const getMeInfo = () => (window.Me && window.Me.get ? window.Me.get() : null) || { name: '나', avatar: '🧑' };

  function endSession() {
    if (SES) {
      SES.alive = false;
      if (window.HotSeat && HotSeat.close) { try { HotSeat.close(); } catch (e) {} }
      document.querySelectorAll('.hsx-cover').forEach(e => e.remove());
      if (SES.cpBtn) { try { SES.cpBtn.destroy(); } catch (e) {} }
      if (SES.cp) { try { SES.cp.destroy(); } catch (e) {} }
      $('coachBtn').onclick = null;
      if (SES.offs) SES.offs.forEach(f => { try { f(); } catch (e) {} });
    }
    SES = null;
    $('endModal').hidden = true;
    $('coachPanel').hidden = true;
  }
  function openMenu() {
    endSession();
    $('startModal').hidden = false;
    $('coachBtn').hidden = true;
  }

  function getView(ses) {
    if (ses.mode === 'guest') return ses.V;
    if (ses.mode === 'watch') {                       // 구경: 모든 카드 공개 (끝난 판은 쇼다운 규칙 그대로)
      const v = P.fastClone(ses.S); v.me = 0; delete v.deck; delete v.seed; return v;
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
    else status = `<span class="bt">${v.bets[q] > 0 ? '베팅 ' + fmtN(v.bets[q]) : (v.turn === q && v.phase === 'bet' ? '생각 중' : '-')}</span>`;
    const h = out ? [] : (v.hands[q] && v.hands[q].length ? v.hands[q] : [-1, -1]);
    const cards = out ? '' : `<div class="cds">${cardHtml(h[0], 'mini')}${cardHtml(h[1], 'mini')}</div>`;
    return `<div class="${cls.join(' ')}" data-q="${q}"><span class="nm">${esc(seat.em)} ${esc(seat.name)}${marks}</span><span class="cn">${fmtN(v.coins[q])}</span>${cards}${status}</div>`;
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
    if (!ses || !ses.alive) return;
    const v = getView(ses), me = ses.me;
    const spect = me < 0;                              // 한 기기에서 다음 사람을 기다리는 동안
    const watch = ses.mode === 'watch';
    const mi = spect ? 0 : me;
    const outMe = !spect && v.out && v.out[me];
    const n = v.n;

    $('subTitle').textContent = `${watch ? 'AI 구경' : ses.mode === 'hot' ? '한 기기' : ses.net ? '친구랑 ' + ses.net.code : '노리밋'} ${n}인`;
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
    $('callInfo').textContent = v.over ? (v.result ? v.result.reason : '') : v.phase === 'end'
      ? (v.result ? v.result.reason : '핸드 종료')
      : spect ? '다음 사람을 기다려요'
      : outMe ? '탈락했어요 · 구경 중' : toCall > 0 ? `콜 필요: ${fmtN(toCall)}칩` : '체크 가능 (추가 비용 0)';

    // 상대 자리들 (내 다음 사람부터 시계 방향)
    const html = [];
    for (let j = spect ? 0 : 1; j < n; j++) html.push(seatHtml(ses, v, (mi + j) % n));
    $('seats').innerHTML = html.join('');
    placeSeats();

    // 내 자리
    const mySeat = spect ? { em: '🪑', name: '다음 사람을 기다려요' } : (ses.seats[me] || { em: '🧑', name: '나' });
    $('myAvatar').textContent = mySeat.em;
    $('myName').innerHTML = `${esc(mySeat.name)}${!spect && v.dealer === me ? ' <span class="mark d">D</span>' : ''}${!spect && v.sbSeat === me ? ' <span class="mark sb">SB</span>' : ''}${!spect && v.bbSeat === me ? ' <span class="mark bb">BB</span>' : ''}`;
    $('myCoins').textContent = spect ? '-' : fmtN(v.coins[me]);
    $('myBet').textContent = spect ? '-' : fmtN(v.bets[me]);
    $('myHandBadge').textContent = spect ? '' : outMe ? '탈락' : myEval.name;
    $('myHandBadge').hidden = spect;
    const myHole = spect || outMe ? [] : (v.hands[me] || []);
    $('myHand').innerHTML = myHole.map(cid => cardHtml(cid, 'lg', cid >= 0 && bestSet.has(cid) && v.board.length >= 3)).join('');

    const myTurn = !watch && !spect && v.phase === 'bet' && v.turn === me && (ses.mode === 'guest' ? !ses.waiting : !!ses.pending);
    $('mySeat').classList.toggle('turn', myTurn);

    // AI 선생님 분석 (패널이 꺼져 있어도 복기 노트용으로 내 차례엔 계산)
    let coachData = null;
    const coachOn = isCoachOn(ses);
    if (ses.coachAvail && !watch && !spect && !outMe && v.phase === 'bet' && (coachOn || myTurn)) {
      const key = `${v.round}|${v.street}|${v.turn}|${v.pot}|${v.raises}|${me}`;
      if (!ses.cc || ses.cc.key !== key) ses.cc = { key, data: AI.coach(v, me) };
      coachData = ses.cc.data;
      showCoach(ses, coachHtml(coachData));
    } else if (ses.coachAvail && (spect || v.phase === 'end')) {
      showCoach(ses, `<div class="coach-detail">${spect ? '다음 사람 차례를 기다려요' : '핸드가 끝났어요. 결과를 확인해 보세요 🙂'}</div>`);
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
  //  · 손님 → 방장: {t:'hi'} · {t:'act', a}   방장 → 손님: {t:'st', me, v, ro, coach} · {t:'full'}
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
      return () => ({ fill: cfg.fill });
    },
    renderConfig: c => `${c && c.fill ? `빈자리는 AI로 ${c.fill}명까지` : '온 사람끼리'}${c && c.coach ? ' · AI 선생님' : ''}`,
    onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
    onLobby: () => { endSession(); $('coachBtn').hidden = true; },         // 대기실이 위에 뜸 (시작 창은 띄우지 않음)
    onLeave: () => openMenu(),
  };
  function startOnlineGame() {
    if (!window.ArenaUI) { alert('온라인 대결 모듈을 불러오지 못했습니다.'); return; }
    $('startModal').hidden = true;
    window.ArenaUI.open(FRIEND);
  }

  function startOnline({ net, role, cfg: c, players }) {
    endSession();
    $('startModal').hidden = true;
    c = c || {};
    const coachAvail = !!c.coach;
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
      const S0 = P.create({ players: n, stacks: CHIPS.start('online', n), seed: rand32() });   // 씨앗은 방 설정에 싣지 않음
      const me = Math.max(0, seats.findIndex(x => x.ctrl === 'me'));
      const uidSeat = {};
      seats.forEach((x, i) => { if (x.uid && x.uid !== net.uid) uidSeat[x.uid] = i; });
      const ses = SES = { alive: true, mode: 'host', n, me, S: S0, seats, net, cfgR: c, uidSeat, pending: null, remoteWait: null, coachLog: [], coachAvail, coachOn: coachAvail, offs: [], spectating: false };
      ses.offs.push(net.on('msg', (uid, m) => onHostMsg(ses, uid, m)));
      ses.offs.push(net.on('leave', uid => onHostLeave(ses, uid)));
      ensureCoach(ses);
      runLoop(ses);
    } else {
      const ses = SES = { alive: true, mode: 'guest', n: 2, me: 0, V: null, seats: [], net, cfgR: c, coachLog: [], coachAvail, coachOn: coachAvail, waiting: false, offs: [], lastKey: '' };
      ses.offs.push(net.on('msg', m => onGuestMsg(ses, m)));
      ensureCoach(ses);
      $('subTitle').textContent = '방장이 준비하는 중…';
      net.send({ t: 'hi' }, true);
      let tries = 0;
      const t = setInterval(() => { if (!ses.alive || ses.V || ++tries > 8) { clearInterval(t); return; } net.send({ t: 'hi' }, true); }, 1500);
    }
  }

  function onHostMsg(ses, uid, m) {
    if (!ses.alive || !m) return;
    const i = ses.uidSeat[uid];
    if (m.t === 'hi') {
      if (i == null) { ses.net.send(uid, { t: 'full' }, true); return; }
      sendTo(ses, uid, i);
    } else if (m.t === 'act') {
      if (i == null) return;
      const w = ses.remoteWait;
      if (w && w.seat === i && ses.S.phase === 'bet' && ses.S.turn === i && P.isLegal(ses.S, m.a)) w.res(m.a);
      else sendTo(ses, uid, i);
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
  const rosterOf = ses => ses.seats.map(x => ({ name: x.name, em: x.em, ctrl: x.ctrl === 'ai' ? 'a' : 'h' }));
  function sendTo(ses, uid, i) {
    try { ses.net.send(uid, { t: 'st', me: i, v: P.view(ses.S, i), ro: rosterOf(ses), coach: ses.coachAvail }, true); } catch (e) { console.error(e); }
  }
  function publish(ses) {
    if (ses.mode !== 'host') return;
    for (const [uid, i] of Object.entries(ses.uidSeat)) sendTo(ses, uid, i);
  }

  function onGuestMsg(ses, m) {
    if (!ses.alive || !m) return;
    if (m.t === 'full') { alert('이미 시작된 판이에요. 다음에 같이 해요'); if (window.ArenaUI) ArenaUI.leave(); return; }
    if (m.t !== 'st') return;
    const prev = ses.V;
    ses.V = m.v; ses.me = m.me; ses.n = m.v.n; ses.waiting = false;
    ses.seats = m.ro.map(r => ({ name: r.name, em: r.em, ctrl: r.ctrl === 'a' ? 'ai' : 'remote' }));
    if (!prev || prev.round !== m.v.round) ses.coachLog = [];
    $('startModal').hidden = true;
    renderGame(ses);
    const key = `${m.v.round}|${m.v.over ? 'o' : m.v.phase}`;
    if (m.v.phase === 'end') {
      if (ses.lastKey !== key) { ses.lastKey = key; showEnd(ses); }
    } else {
      $('endModal').hidden = true;
      if (!prev || prev.turn !== m.v.turn) { if (m.v.turn === ses.me) showToast('내 차례예요'); }
    }
  }

  function waitRemote(ses, seat) {
    return new Promise(res => {
      const done = a => { clearTimeout(tm); if (ses.remoteWait && ses.remoteWait.seat === seat) ses.remoteWait = null; res(a); };
      const tm = setTimeout(() => done(null), 90000);       // 90초 안에 안 하면 AI 가 대신
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
            a = await new Promise(res => { ses.pending = { resolve: res }; renderGame(ses); });
          } else if (seat.ctrl === 'remote') {
            a = await waitRemote(ses, p);
            if (a == null) { if (!ses.alive) return; await sleep(300); a = aiChoose(ses, p); }
          } else {
            await sleep(ses.mode === 'watch' ? 520 : 680);
            if (!ses.alive) return;
            a = aiChoose(ses, p);
          }
          if (!ses.alive) return;
          if (p !== ses.me) showToast(`${seat.name}: ${ACT_LABELS[a]}`);
          ses.S = P.step(ses.S, a).state;
          publish(ses);
          renderGame(ses);
        }
        if (!ses.alive) return;
        publish(ses);
        renderGame(ses);
        CHIPS.report(ses.mode, { round: ses.S.round, over: false, coins: ses.S.coins.slice(), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl })), me: ses.me });
        const next = await showEnd(ses);
        if (!ses.alive) return;
        if (next === 'lobby') { if (window.ArenaUI) ArenaUI.toLobby(); return; }
        if (next === 'menu') { openMenu(); return; }
        // 다음 핸드 (칩이 바닥난 자리는 여기서 탈락)
        ses.S = P.nextRound(ses.S, rand32());
        if (ses.S.over) {
          publish(ses); renderGame(ses);
          CHIPS.report(ses.mode, { round: ses.S.round, over: true, champion: ses.S.champion, coins: ses.S.coins.slice(), seats: ses.seats.map(x => ({ name: x.name, ctrl: x.ctrl })), me: ses.me });
          const o = await showOver(ses);
          if (!ses.alive) return;
          if (o === 'again') {
            const n = ses.S.n;
            ses.S = P.create({ players: n, stacks: CHIPS.start(ses.mode, n), seed: rand32() });
            ses.spectating = false;
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
    const box = $('endBtns');
    box.innerHTML = '';
    for (const it of list) {
      if (it.note) { const p = document.createElement('p'); p.className = 'wait-note'; p.textContent = it.note; box.append(p); continue; }
      const b = document.createElement('button');
      b.type = 'button'; b.className = it.primary ? 'primary' : 'ghost'; b.textContent = it.label;
      b.onclick = it.onClick;
      box.append(b);
    }
  }
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

      const done = val => { $('endModal').hidden = true; resolve(val); };
      if (ses.mode === 'guest') {
        setEndButtons([{ note: '방장이 다음 핸드를 시작하면 이어서 해요' }, { label: '나가기', onClick: () => { $('endModal').hidden = true; if (window.ArenaUI) ArenaUI.leave(); else openMenu(); } }]);
      } else {
        const list = [{ label: '다음 핸드 진행', primary: true, onClick: () => done('next') }];
        list.push(ses.mode === 'host' ? { label: '대기실로', onClick: () => done('lobby') } : { label: '설정 바꾸기', onClick: () => done('menu') });
        setEndButtons(list);
        if (ses.mode === 'watch' || ses.spectating) setTimeout(() => { if (!$('endModal').hidden && ses.alive) done('next'); }, 4200);
      }
      $('endModal').hidden = false;
    });
  }

  // 게임 끝 (한 명만 남음)
  function showOver(ses) {
    return new Promise(resolve => {
      const v = getView(ses), champ = v.champion, me = ses.me;
      const iWon = champ === me;
      if (ses.mode === 'solo' && !ses.spectating) { const st = loadStats(); st.games += 1; if (iWon) st.wins += 1; saveStats(st); }
      $('endTitle').textContent = iWon ? '🏆 우승! 끝까지 살아남았어요' : `🏆 ${esc(nameOf(ses, champ))} 우승!`;
      $('endSub').textContent = `${fmtN(v.coins[champ])}칩으로 테이블을 차지했어요 · ${v.round}번째 핸드`;
      $('endPots').hidden = true;
      $('endCoachBox').hidden = true;
      const order = v.coins.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c);
      $('endShowdown').innerHTML = order.map((o, k) => `<div class="sd-row${o.i === champ ? ' win' : ''}"><div><b>${k + 1}위 ${esc(nameOf(ses, o.i))}${o.i === me && nameOf(ses, o.i) !== '나' ? ' (나)' : ''}</b></div><div><strong style="color:#fde68a">${fmtN(o.c)}칩</strong>${o.c === 0 ? ' · 탈락' : ''}</div></div>`).join('');
      const done = val => { $('endModal').hidden = true; resolve(val); };
      if (ses.mode === 'guest') {
        setEndButtons([{ note: '방장이 새 게임을 시작하면 이어서 해요' }, { label: '나가기', onClick: () => { $('endModal').hidden = true; if (window.ArenaUI) ArenaUI.leave(); else openMenu(); } }]);
      } else {
        setEndButtons([{ label: '새 게임', primary: true, onClick: () => done('again') }, ses.mode === 'host' ? { label: '대기실로', onClick: () => done('lobby') } : { label: '설정 바꾸기', onClick: () => done('menu') }]);
      }
      $('endModal').hidden = false;
    });
  }
  function showBust(ses) {
    return new Promise(resolve => {
      const st = loadStats(); st.games += 1; saveStats(st);
      $('endTitle').textContent = '😵 칩이 바닥나 탈락!';
      $('endSub').textContent = '남은 AI들의 승부를 구경하거나, 새 게임을 시작할 수 있어요';
      $('endPots').hidden = true; $('endCoachBox').hidden = true; $('endShowdown').innerHTML = '';
      const done = val => { $('endModal').hidden = true; resolve(val); };
      setEndButtons([{ label: '새 게임', primary: true, onClick: () => done('again') }, { label: '구경 계속', onClick: () => done('watch') }]);
      $('endModal').hidden = false;
    });
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

  // 처음 화면: 배경용 빈 테이블
  drawMenu();
  $('coachBtn').hidden = true;
  if (window.ArenaUI) ArenaUI.checkUrl(FRIEND);
  (function idleTable() {
    const S0 = P.create({ players: 4, seed: 2026 });
    const seats = seatNames(4, ['me', 'ai', 'ai', 'ai'], 'normal');
    SES = { alive: true, mode: 'solo', n: 4, me: 0, S: S0, seats, pending: null, coachLog: [], coachAvail: false, coachOn: false, idle: true };
    renderGame(SES);
    SES = null;
  })();
})();

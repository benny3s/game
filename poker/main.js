/* 텍사스 홀덤 포커 (Texas Hold'em) — 화면 · 코치 · 온라인 대결 (main.js) */
(function () {
  'use strict';
  const P = window.Poker;
  const AI = window.PokerAI;

  const $ = (id) => document.getElementById(id);
  const cfg = { mode: '1p', tier: 'normal', coach: true };
  const TIER_META = {
    easy:   { name: '캐주얼 루키', avatar: '🌱' },
    normal: { name: '레귤러 프로', avatar: '♠️' },
    hard:   { name: 'GTO 마스터', avatar: '👑' },
  };
  const ACT_LABELS = {
    [P.A_FOLD]:  '폴드',
    [P.A_CALL]:  '체크/콜',
    [P.A_HALF]:  '하프 벳',
    [P.A_POT]:   '팟 벳',
    [P.A_ALLIN]: '올인',
  };

  const STATS_KEY = 'poker_stats_v1';
  function loadStats() {
    try { return Object.assign({ wins: 0, games: 0, coins: 1000 }, JSON.parse(localStorage.getItem(STATS_KEY) || '{}')); }
    catch (_) { return { wins: 0, games: 0, coins: 1000 }; }
  }
  function saveStats(st) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (_) {}
  }

  let state = null;
  let mySeat = 0;
  let aiTimer = null;
  let coachLog = [];
  let onlineMatch = null;
  let onlineSeat = 0;

  // 플레잉 카드 DOM 생성
  function renderCardEl(cid, opts) {
    opts = opts || {};
    const div = document.createElement('div');
    div.className = 'pcard' + (opts.lg ? ' lg' : '');
    if (cid === undefined || cid === null) {
      div.className += ' empty-slot';
      return div;
    }
    if (cid < 0) {
      div.className += ' back';
      return div;
    }
    const c = P.cardOf(cid);
    div.className += c.isRed ? ' red' : ' black';
    if (opts.glow) div.className += ' best-glow';
    div.innerHTML = `
      <div class="corner"><span>${c.rankStr}</span><small>${c.suitChar}</small></div>
      <div class="pip-center">${c.suitChar}</div>
    `;
    return div;
  }

  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(() => { t.hidden = true; }, 1900);
  }

  function render() {
    if (!state) return;
    const oppSeat = (mySeat + 1) % state.n;
    const v = P.view(state, mySeat);

    const meInfo = window.Me ? window.Me.get() : { name: '나', avatar: '🧑' };
    $('myName').innerHTML = `${meInfo.name || '나'} <span class="dealer-chip" id="myDealer" ${state.dealer === mySeat ? '' : 'hidden'}>D</span>`;
    $('myAvatar').textContent = cfg.mode === 'watch' ? '🤖' : (meInfo.avatar || '🧑');

    if (cfg.mode === 'online' && onlineMatch && onlineMatch.players) {
      const oppUid = Object.keys(onlineMatch.players).find(u => onlineMatch.players[u].seat !== mySeat);
      const oppP = oppUid ? onlineMatch.players[oppUid] : null;
      $('oppName').innerHTML = `${oppP ? oppP.name : '친구'} <span class="dealer-chip" ${state.dealer === oppSeat ? '' : 'hidden'}>D</span>`;
      $('oppAvatar').textContent = (oppP && oppP.avatar) || '🃏';
    } else {
      const tm = TIER_META[cfg.tier] || TIER_META.normal;
      $('oppName').innerHTML = `${tm.name} <span class="dealer-chip" ${state.dealer === oppSeat ? '' : 'hidden'}>D</span>`;
      $('oppAvatar').textContent = tm.avatar;
    }

    $('myCoins').textContent = state.coins[mySeat];
    $('myBet').textContent = state.bets[mySeat];
    $('oppCoins').textContent = state.coins[oppSeat];
    $('oppBet').textContent = state.bets[oppSeat];
    $('potVal').textContent = state.pot;
    $('streetBadge').textContent = P.STREET_NAMES[state.street] || '쇼다운';

    const toCall = Math.max(0, state.curBet - state.bets[mySeat]);
    $('callInfo').textContent = state.phase === 'end'
      ? (state.result ? state.result.reason : '핸드 종료')
      : toCall > 0 ? `콜 필요: ${toCall}칩` : '체크 가능 (추가 비용 0)';

    $('oppTag').textContent = state.folded[oppSeat]
      ? '폴드'
      : state.allIn[oppSeat]
        ? '올인!'
        : state.turn === oppSeat && state.phase === 'bet' ? '생각 중...' : `베팅 ${state.bets[oppSeat]}`;

    // 내 최상 5장 하이라이트 계산
    const myKnown = (v.hands[mySeat] || []).concat(v.board || []).filter(c => c >= 0);
    const myEval = P.eval7(myKnown);
    const bestSet = new Set(myEval.best5 || []);
    $('myHandBadge').textContent = myEval.name;

    // 상대 홀카드
    const oppBox = $('oppHand');
    oppBox.innerHTML = '';
    for (const cid of (v.hands[oppSeat] || [-1, -1])) {
      oppBox.appendChild(renderCardEl(cid, { lg: false }));
    }

    // 공용 커뮤니티 보드 5슬롯
    const commRow = $('commRow');
    commRow.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const cid = i < v.board.length ? v.board[i] : null;
      commRow.appendChild(renderCardEl(cid, { lg: false, glow: cid !== null && bestSet.has(cid) && v.board.length >= 3 }));
    }

    // 내 홀카드
    const myBox = $('myHand');
    myBox.innerHTML = '';
    for (const cid of (v.hands[mySeat] || [])) {
      myBox.appendChild(renderCardEl(cid, { lg: true, glow: cid >= 0 && bestSet.has(cid) && v.board.length >= 3 }));
    }

    // 코치 패널 & 버튼 업데이트
    const isMyTurn = state.phase === 'bet' && state.turn === mySeat && cfg.mode !== 'watch';
    const L = isMyTurn ? P.legal(v) : [];
    const coachData = (cfg.coach && state.phase === 'bet') ? AI.coach(v, mySeat) : null;

    const coachPanel = $('coachPanel');
    if (cfg.coach && coachData) {
      coachPanel.hidden = false;
      $('coachEquity').textContent = `${coachData.equityPct}%`;
      $('coachOdds').textContent = `${coachData.potOddsPct}%`;
      $('coachOuts').textContent = coachData.draws && coachData.draws.outsCount > 0
        ? `${coachData.draws.outsCount}장 (${coachData.draws.hitPct}%)`
        : '메이드 중심';
      $('coachHeadline').textContent = coachData.headline;
      $('coachDetail').textContent = coachData.detail;
    } else {
      coachPanel.hidden = !cfg.coach;
    }

    const btnDefs = [
      { act: P.A_FOLD,  btn: 'btnFold',  cost: 'costFold',  ev: 'evFold' },
      { act: P.A_CALL,  btn: 'btnCall',  cost: 'costCall',  ev: 'evCall' },
      { act: P.A_HALF,  btn: 'btnHalf',  cost: 'costHalf',  ev: 'evHalf' },
      { act: P.A_POT,   btn: 'btnPot',   cost: 'costPot',   ev: 'evPot' },
      { act: P.A_ALLIN, btn: 'btnAllin', cost: 'costAllin', ev: 'evAllin' },
    ];

    for (const d of btnDefs) {
      const b = $(d.btn);
      const cEl = $(d.cost);
      const eEl = $(d.ev);
      const allowed = L.includes(d.act);
      b.disabled = !allowed;
      b.classList.remove('coach-best');
      const costVal = P.actionCost(v, mySeat, d.act);
      if (d.act === P.A_FOLD) {
        cEl.textContent = '기권';
      } else if (d.act === P.A_CALL) {
        $('lblCall').textContent = costVal === 0 ? '체크' : '콜';
        cEl.textContent = costVal === 0 ? '0칩' : `${costVal}칩`;
      } else {
        cEl.textContent = `${costVal}칩`;
      }

      if (allowed && cfg.coach && coachData && coachData.byAction[d.act]) {
        const info = coachData.byAction[d.act];
        eEl.hidden = false;
        eEl.className = 'b-ev ' + info.tier;
        eEl.textContent = info.tier === 'best' ? `👑 최선 (${info.evText})` : `EV ${info.evText}`;
        if (info.tier === 'best') b.classList.add('coach-best');
      } else {
        eEl.hidden = true;
        eEl.textContent = '';
      }
    }
  }

  function applyAction(action) {
    if (!state || state.phase !== 'bet') return;
    const actor = state.turn;
    if (actor === mySeat && cfg.mode !== 'watch') {
      const v = P.view(state, mySeat);
      const c = AI.coach(v, mySeat);
      if (c && c.byAction[action]) {
        coachLog.push({
          street: P.STREET_NAMES[state.street],
          myHand: c.handEval ? c.handEval.name : '',
          chosen: ACT_LABELS[action],
          best: ACT_LABELS[c.bestAction],
          tier: c.byAction[action].tier,
          delta: Math.round(c.byAction[action].delta || 0),
          equityPct: c.equityPct,
        });
      }
    }

    const prevStreet = state.street;
    const res = P.step(state, action);
    state = res.state;
    const whoLabel = actor === mySeat ? '나' : '상대';
    showToast(`${whoLabel}: ${ACT_LABELS[action]}`);

    if (cfg.mode === 'online' && onlineMatch && actor === mySeat) {
      window.Arena.submitMove({ state, lastBy: mySeat });
    }

    render();

    if (state.phase === 'end') {
      setTimeout(showEndModal, 550);
      return;
    }
    if (state.street !== prevStreet) {
      showToast(`🃏 ${P.STREET_NAMES[state.street]} 오픈!`);
    }
    scheduleAI();
  }

  function scheduleAI() {
    clearTimeout(aiTimer);
    if (!state || state.phase !== 'bet') return;
    if (cfg.mode === 'online') return;
    if (cfg.mode === '1p' && state.turn === mySeat) return;

    aiTimer = setTimeout(() => {
      if (!state || state.phase !== 'bet') return;
      const v = P.view(state, state.turn);
      const act = AI.choose(v, cfg.tier, { seed: Date.now() & 0xffff });
      applyAction(act);
    }, 650);
  }

  function showEndModal() {
    if (!state || !state.result) return;
    const r = state.result;
    const iWon = (r.winners || []).includes(mySeat);
    $('endTitle').textContent = r.winners && r.winners.length > 1
      ? '🤝 무승부 스플릿 팟!'
      : iWon ? '🎉 홀덤 핸드 승리! (+' + r.pot + '칩)' : '😢 아쉬운 패배';
    $('endSub').textContent = r.reason;

    const sd = $('endShowdown');
    sd.innerHTML = '';
    (r.evals || []).forEach(ev => {
      const isMe = ev.p === mySeat;
      const isW = (r.winners || []).includes(ev.p);
      const row = document.createElement('div');
      row.className = 'sd-row' + (isW ? ' win' : '');
      const cardsTxt = (ev.hole || []).map(P.cardLabel).join(' ');
      row.innerHTML = `
        <div><b>${isMe ? '나' : '상대'}</b> <span style="color:#a7f3d0">(${cardsTxt})</span></div>
        <div><strong style="color:#fde68a">${ev.folded ? '폴드(기권)' : ev.name}</strong> ${isW ? '👑' : ''}</div>
      `;
      sd.appendChild(row);
    });

    // 복기 노트
    const cBox = $('endCoachBox');
    if (coachLog.length > 0) {
      const bestCnt = coachLog.filter(x => x.tier === 'best' || x.tier === 'good').length;
      const acc = Math.round((bestCnt / coachLog.length) * 100);
      const worst = coachLog.slice().sort((a, b) => a.delta - b.delta)[0];
      cBox.hidden = false;
      cBox.innerHTML = `
        <div><b>🧑‍🏫 홀덤 GTO 복기 노트</b> · 정석 일치율 <b style="color:#34d399">${acc}%</b> (${bestCnt}/${coachLog.length}회)</div>
        <div style="margin-top:4px;color:#a7f3d0">
          ${worst && worst.delta < -8
            ? `💡 <b>아쉬운 순간</b>: ${worst.street} [${worst.myHand}] (승률 ${worst.equityPct}%)에서 <b>${worst.chosen}</b> 대신 <b>${worst.best}</b> 선택이 기댓값 +${Math.abs(worst.delta)}칩 더 유리했습니다.`
            : `👏 모든 스트리트에서 에퀴티와 팟 오즈에 부합하는 훌륭한 플레이를 펼쳤습니다!`}
        </div>
      `;
    } else {
      cBox.hidden = true;
    }

    const st = loadStats();
    st.games += 1;
    if (iWon) st.wins += 1;
    st.coins = state.coins[mySeat];
    saveStats(st);

    $('endModal').hidden = false;
  }

  function startNewGame(keepCoins) {
    clearTimeout(aiTimer);
    $('startModal').hidden = true;
    $('endModal').hidden = true;
    coachLog = [];
    mySeat = 0;

    if (keepCoins && state) {
      state = P.nextRound(state, Date.now() & 0x7fffffff);
    } else {
      const st = loadStats();
      state = P.create({
        players: 2,
        coins: Math.max(400, st.coins || 1000),
        seed: Date.now() & 0x7fffffff,
      });
    }
    render();
    scheduleAI();
  }

  function startOnlineGame() {
    if (!window.ArenaUI) {
      alert('온라인 대결 모듈을 불러오지 못했습니다.');
      return;
    }
    $('startModal').hidden = true;
    window.ArenaUI.open({
      game: 'poker',
      title: '♠️ 텍사스 홀덤 친구 대결',
      minPlayers: 2,
      maxPlayers: 2,
      createInitialState: (seed) => P.create({ players: 2, seed }),
      onStart: ({ match, seat }) => {
        onlineMatch = match;
        onlineSeat = seat;
        mySeat = seat;
        state = match.state || P.create({ players: 2, seed: match.seed || 2026 });
        coachLog = [];
        render();
      },
      onState: (data) => {
        if (!data || !data.state) return;
        state = data.state;
        render();
        if (state.phase === 'end') setTimeout(showEndModal, 500);
      },
    });
  }

  // 이벤트 바인딩
  document.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-val]');
      if (!btn) return;
      seg.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const key = seg.dataset.seg;
      const val = btn.dataset.val;
      if (key === 'mode') {
        cfg.mode = val;
        $('tierField').hidden = val === 'online';
      } else if (key === 'tier') {
        cfg.tier = val;
      } else if (key === 'coach') {
        cfg.coach = val === 'on';
        updateCoachToggleUI();
      }
    });
  });

  function updateCoachToggleUI() {
    const b = $('coachBtn');
    if (!b) return;
    b.textContent = cfg.coach ? '🧑‍🏫 코치 켜짐' : '🧑‍🏫 코치 꺼짐';
    b.classList.toggle('coach-on', cfg.coach);
    render();
  }

  $('coachBtn').addEventListener('click', () => {
    cfg.coach = !cfg.coach;
    updateCoachToggleUI();
  });

  $('jokboBtn').addEventListener('click', () => { $('jokboModal').hidden = false; });
  $('closeJokboBtn').addEventListener('click', () => { $('jokboModal').hidden = true; });
  $('menuBtn').addEventListener('click', () => { $('startModal').hidden = false; });

  $('goStart').addEventListener('click', () => {
    if (cfg.mode === 'online') startOnlineGame();
    else startNewGame(false);
  });

  $('againBtn').addEventListener('click', () => {
    if (cfg.mode === 'online' && onlineMatch) {
      const nxt = P.nextRound(state, Date.now() & 0x7fffffff);
      state = nxt;
      $('endModal').hidden = true;
      window.Arena.submitMove({ state: nxt, lastBy: mySeat });
      render();
      return;
    }
    startNewGame(true);
  });

  $('changeBtn').addEventListener('click', () => {
    $('endModal').hidden = true;
    $('startModal').hidden = false;
  });

  document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const act = Number(btn.dataset.act);
      applyAction(act);
    });
  });

  // 초기 배경용 테이블 미리 세팅
  state = P.create({ players: 2, seed: 2026 });
  render();
})();

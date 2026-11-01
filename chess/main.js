/* 체스 — 메뉴 · 대국 흐름 · 입력 · AI 워커 · 시계 · AI 선생님 · 친구랑(방장이 판의 주인)
   누가 어느 색을 두는지는 G.players[색] = { kind: 'human' | 'ai' | 'remote', tier, name }
   모든 수는 act() 한 길로 들어가 ChessCore.step() → 돌아온 사건(events)으로 움직임 · 소리 · 끝 처리 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.ChessCore, Z = window.Cozy, esc = Z.esc;
  const sfx = (n, o) => Z.sfx.play(n, o);
  const store = (k, d) => Z.store('chess.' + k, d), save = (k, v) => Z.save('chess.' + k, v);
  const PIECE = code => `vendor/pieces/chessnut/${code}.svg`;
  const CN = { w: '백', b: '흑' };
  const other = c => (c === 'w' ? 'b' : 'w');
  const TIERS = {
    easy:   { em: '🐣', name: '초급', desc: '규칙을 익히는 중이에요', cls: 't-easy' },
    normal: { em: '🐱', name: '중급', desc: '기본 전술을 알아요', cls: 't-normal' },
    hard:   { em: '🐯', name: '고급', desc: '여러 수 앞을 읽어요', cls: 't-hard' },
  };
  const TIER_IDS = ['easy', 'normal', 'hard'];
  const tierLabel = t => `${TIERS[t].em} ${TIERS[t].name}`;
  // 창: Cozy.modal 그대로, 열린 창 닫기 함수만 기억 (메뉴로 나갈 때 깔끔히 닫으려고)
  const modals = [];
  function modal(o) {
    const oc = o.onClose;
    const close = Z.modal(Object.assign({}, o, { onClose: () => { const i = modals.indexOf(close); if (i >= 0) modals.splice(i, 1); if (oc) oc(); } }));
    modals.push(close);
    return close;
  }
  const closeModals = () => { for (const c of modals.slice().reverse()) c(); };

  // ── 고른 것 · 설정 ──
  const pref = Object.assign({ tab: 'solo', tier: 'normal', color: 'w', clock: 0, rot: 'auto', ww: 'hard', wb: 'normal', speed: 'normal' }, store('pref', {}));
  if (pref.tab === 'friend') pref.tab = 'solo';
  const set = Object.assign({ notation: 'ko', coords: true }, store('settings', {}));
  const savePref = () => save('pref', pref), saveSet = () => save('settings', set);

  // ── 소리 (Web Audio 합성) ──
  Z.sfx.add('move', (t, o, S) => { const p = 0.95 + Math.random() * 0.1; S.noise(t, 0.045, { vol: 0.42, type: 'bandpass', f: 1900 * p, q: 2.2 }); S.tone(t, 230 * p, 0.06, { vol: 0.2, f2: 140 }); });
  Z.sfx.add('capture', (t, o, S) => { S.noise(t, 0.07, { vol: 0.55, type: 'bandpass', f: 1300, q: 1.5 }); S.tone(t, 170, 0.09, { vol: 0.3, f2: 85 }); S.noise(t + 0.05, 0.05, { vol: 0.28, type: 'bandpass', f: 2700, q: 2 }); });
  Z.sfx.add('castle', (t, o, S) => { [0, 0.1].forEach((d, i) => { S.noise(t + d, 0.045, { vol: 0.4, type: 'bandpass', f: 1800 + i * 300, q: 2.2 }); S.tone(t + d, 220 + i * 30, 0.05, { vol: 0.18, f2: 140 }); }); });
  Z.sfx.add('check', (t, o, S) => { S.tone(t, 880, 0.09, { type: 'triangle', vol: 0.12 }); S.tone(t + 0.1, 1175, 0.15, { type: 'triangle', vol: 0.12 }); });
  Z.sfx.add('promote', (t, o, S) => { [S.N.C5, S.N.E5, S.N.G5, S.N.C6].forEach((f, i) => S.tone(t + i * 0.06, f, 0.16, { type: 'triangle', vol: 0.11 })); });
  Z.sfx.add('lowtime', (t, o, S) => { S.tone(t, 1480, 0.05, { type: 'square', vol: 0.05 }); S.tone(t + 0.12, 1480, 0.05, { type: 'square', vol: 0.05 }); });
  Z.sfx.add('start', (t, o, S) => { [S.N.G4, S.N.C5, S.N.E5].forEach((f, i) => S.tone(t + i * 0.08, f, 0.16, { type: 'triangle', vol: 0.12 })); });
  Z.sfx.add('hint', (t, o, S) => { [S.N.A5, S.N.E6].forEach((f, i) => S.tone(t + i * 0.07, f, 0.18, { vol: 0.09 })); });

  // ════════ 메뉴 ════════
  function seg(el, items, cur, on) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); on(b.dataset.v); };
  }
  const stats = () => store('stats', {});
  // 🏆 전적 숫자는 메인 랭킹(GRank)에서만 읽음 (11-01) — 기기 저장 값은 화면에 안 씀. 못 받으면 빈칸
  const recLine = t => { try { return window.GRank ? GRank.line('chess', t) : ''; } catch (e) { return ''; } };
  const recFill = () => { document.querySelectorAll('#tiers .tier').forEach(b => { const s = b.querySelector('.rec'); if (s) s.textContent = recLine(b.dataset.t); }); };
  const recLoad = () => { try { if (window.GRank) GRank.mine('chess').then(recFill, () => {}); } catch (e) {} };
  let rankFresh = false;   // 이번 판 결과가 랭킹에 올라가 다시 읽힌 뒤인가 (그 전엔 옛 숫자라 결과 창에 안 보임)
  const resRecTxt = g => { const s = rankFresh && window.GRank ? GRank.line('chess', g.cfg.tier) : '', T = TIERS[g.cfg.tier]; return s ? `${T.em} ${T.name} 전적 ${s}` : ''; };
  const resRecFill = () => { const el = document.getElementById('rkRec'); if (!el || !G || G.mode !== 'ai') return; const t = resRecTxt(G); el.textContent = t; el.style.display = t ? '' : 'none'; };
  addEventListener('grank', e => { if (!e.detail || e.detail.game !== 'chess') return; rankFresh = true; recFill(); resRecFill(); });
  let seatPick = null;
  function drawMenu() {
    const tabs = { solo: 'tabSolo', duo: 'tabDuo', watch: 'tabWatch' };
    for (const t in tabs) $(tabs[t]).setAttribute('aria-pressed', String(pref.tab === t));
    $('soloBox').hidden = pref.tab !== 'solo'; $('duoBox').hidden = pref.tab !== 'duo'; $('watchBox').hidden = pref.tab !== 'watch';
    $('tiers').innerHTML = TIER_IDS.map(t => `<button class="tier ${TIERS[t].cls}" data-t="${t}" aria-pressed="${pref.tier === t}"><span class="em">${TIERS[t].em}</span><b>${TIERS[t].name}</b><span>${TIERS[t].desc}</span><span class="rec">${recLine(t)}</span></button>`).join('');
    recLoad();
    $('tiers').onclick = e => { const b = e.target.closest('.tier'); if (!b) return; sfx('tap'); pref.tier = b.dataset.t; savePref(); drawMenu(); };
    seg($('colorSeg'), [['w', '<i class="kp w"></i>백 (먼저)'], ['b', '<i class="kp b"></i>흑'], ['r', '🎲 랜덤']], pref.color, v => { pref.color = v; savePref(); drawMenu(); });
    seg($('clockSeg'), [[0, '없음'], [5, '⏱ 5분'], [10, '⏱ 10분']], pref.clock, v => { pref.clock = +v; savePref(); drawMenu(); });
    $('clockRow').hidden = pref.tab === 'watch';
    seg($('rotSeg'), [['auto', '🔄 차례마다'], ['fixed', '돌리지 않기']], pref.rot, v => { pref.rot = v; savePref(); drawMenu(); });
    if (pref.tab === 'duo' && !seatPick && window.HotSeat) {
      try { seatPick = HotSeat.setup($('seats'), { game: 'chess', min: 2, max: 2, allowAI: true, tiers: TIER_IDS.map(id => ({ id, emoji: TIERS[id].em, label: TIERS[id].name })) }); } catch (e) { seatPick = null; }
    }
    const tl = TIER_IDS.map(t => [t, tierLabel(t)]);
    seg($('watchW'), tl, pref.ww, v => { pref.ww = v; savePref(); drawMenu(); });
    seg($('watchB'), tl, pref.wb, v => { pref.wb = v; savePref(); drawMenu(); });
    seg($('speedSeg'), [['slow', '🐢 느리게'], ['normal', '보통'], ['fast', '🐇 빠르게']], pref.speed, v => { pref.speed = v; savePref(); drawMenu(); });
    $('startBtn').textContent = pref.tab === 'watch' ? '▶ 구경 시작' : pref.tab === 'duo' ? '👥 둘이서 시작!' : `${tierLabel(pref.tier)} AI와 한 판!`;
    $('howtoList').hidden = pref.tab === 'watch';
    $('mstBtn').hidden = !(window.Mistakes && Mistakes.count('chess'));   // 📒 아쉬운 장면 (풀 것이 있을 때만)
  }
  const tab = t => () => { sfx('tap'); pref.tab = t; savePref(); drawMenu(); };
  $('tabSolo').onclick = tab('solo'); $('tabDuo').onclick = tab('duo'); $('tabWatch').onclick = tab('watch');
  $('tabFriend').onclick = () => { sfx('tap'); openFriend(); };
  $('startBtn').onclick = () => { sfx('tap'); startFromMenu(); };
  $('helpBtn').onclick = () => howto(true);
  $('setBtn').onclick = openSettings;
  $('recBtn').onclick = () => openRecords();
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open('chess'); } catch (e) {} };
  // 🏆 예전에 이 기기에만 있던 AI 대국 전적을 랭킹에 한 번 올림
  if (window.GRank) try { GRank.migrateLocal('chess', () => {
    let w = 0, l = 0, d = 0;
    Object.values(stats() || {}).forEach(v => { w += v.w || 0; l += v.l || 0; d += v.d || 0; });
    return { n: w + l + d, w, l };
  }); } catch (e) {}
  // 🏆 난이도별 예전 기기 전적도 한 번 올림
  if (window.GRank) try { GRank.migrateTiers('chess', () => stats()); } catch (e) {}

  function startFromMenu() {
    if (pref.tab === 'watch') newGame({ mode: 'watch', ww: pref.ww, wb: pref.wb, speed: pref.speed });
    else if (pref.tab === 'duo') {
      const seats = seatPick ? seatPick.seats : [{ kind: 'human', name: '사람 1' }, { kind: 'human', name: '사람 2' }];
      newGame({ mode: 'duo', seats, rot: pref.rot, clock: pref.clock });
    } else newGame({ mode: 'ai', tier: pref.tier, color: pref.color, clock: pref.clock });
  }
  const HOWTO = [
    '백이 먼저, 번갈아 한 수씩 둬요. 상대 <b>킹</b>을 피할 곳 없이 공격하면(<b>체크메이트</b>) 이겨요',
    '기물을 <b>끌어 놓거나</b>, 한 번 눌러 고른 뒤 <b>점</b>이 찍힌 칸을 눌러요. 고리는 잡을 수 있는 기물이에요',
    '<b>캐슬링</b>: 킹을 룩 쪽으로 두 칸 옮기면 룩이 넘어와요 · <b>앙파상</b>·<b>승진</b>도 그대로 돼요',
    '둘 곳이 없으면(스테일메이트), 같은 국면 세 번, 50수 동안 잡기·폰 이동이 없으면 비겨요',
    '🧑‍🏫 <b>AI 선생님</b>을 켜면 좋은 수를 화살표로 보여 주고 까닭도 알려 줘요',
    'AI 대전에서 실수했으면 ↶ 되돌리기 (내 수와 AI 수를 함께 물러요)',
    '👥 친구랑: 2명이 두고, 더 들어온 친구는 실시간으로 구경해요 (최대 16명)',
  ];
  const howto = force => Z.howto('chess', '체스 하는 법', HOWTO, { force: !!force });
  function openSettings() {
    sfx('tap');
    modal({ title: '⚙ 설정', html: `<div class="setlist">
      <div class="optrow"><span class="small">기보 글자</span><div class="seg" id="sNot"></div></div>
      <div class="optrow"><span class="small">좌표</span><div class="seg" id="sCoord"></div></div>
      <div class="optrow"><span class="small">소리</span><div class="seg" id="sSnd"></div></div></div>`, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const draw = () => {
      seg($('sNot'), [['ko', '한글 (나f3)'], ['san', '영어 (Nf3)']], set.notation, v => { set.notation = v; saveSet(); drawMoves(); draw(); });
      seg($('sCoord'), [['1', '보이기'], ['0', '숨기기']], set.coords ? '1' : '0', v => { set.coords = v === '1'; saveSet(); board.setCoords(set.coords); draw(); });
      seg($('sSnd'), [['1', '켬'], ['0', '끔']], Z.sfx.on ? '1' : '0', v => { Z.sfx.set(v === '1'); drawSnd(); draw(); });
    };
    draw();
  }

  // ════════ AI 워커 (수 두기용 · 선생님용 따로) ════════
  let mainAI = null;
  function loadMainAI() {
    if (mainAI) return mainAI;
    mainAI = new Promise((ok, bad) => { if (window.ChessAI) return ok(window.ChessAI); const sc = document.createElement('script'); sc.src = 'ai.js?v=3'; sc.onload = () => ok(window.ChessAI); sc.onerror = bad; document.head.appendChild(sc); });
    return mainAI;
  }
  function makeWorker() {
    let w = null, okW = true, seq = 0;
    const waits = new Map();
    const kill = () => { if (w) w.terminate(); w = null; for (const [, x] of waits) x.bad(new Error('worker')); waits.clear(); };
    const get = () => {
      if (w || !okW) return w;
      try {
        w = new Worker('ai-worker.js?v=3');
        w.onmessage = e => { const x = waits.get(e.data.id); if (x) { waits.delete(e.data.id); x.ok(e.data.res); } };
        w.onerror = () => kill();
      } catch (e) { w = null; okW = false; }
      return w;
    };
    // 일꾼에게 보내고, 일꾼이 없거나 죽으면 화면 쪽 ChessAI 로 (local)
    function run(msg, local) {
      const ww = get();
      if (!ww) return loadMainAI().then(ai => new Promise(ok => setTimeout(() => ok(local(ai, 600)), 20)));
      const id = ++seq;
      return new Promise((ok, bad) => {
        const t = setTimeout(() => { if (waits.has(id)) { waits.delete(id); kill(); bad(new Error('timeout')); } }, 12000);
        waits.set(id, { ok: r => { clearTimeout(t); ok(r); }, bad: e => { clearTimeout(t); bad(e); } });
        ww.postMessage(Object.assign({ id }, msg));
      }).catch(() => loadMainAI().then(ai => local(ai, 500)));
    }
    const think = (game, opts) => run({ game, opts }, (ai, cap) => ai.think(game, Object.assign({}, opts, { timeMs: Math.min(cap, opts.timeMs || cap) })));
    const intent = (game, uci, opts) => run({ op: 'intent', game, uci, opts }, (ai, cap) => ai.intent(game, uci, Object.assign({}, opts, { timeMs: Math.min(cap / 2, opts.timeMs || cap) })));
    return { think, intent, kill };
  }
  const AIW = makeWorker(), COACHW = makeWorker();

  // ════════ 대국 ════════
  const board = new ChessBoardView($('board'), {
    pieceUrl: PIECE,
    canMove: sq => { if (!humanTurn()) return false; const p = G.s.chess.get(sq); return !!p && p.color === C.turn(G.s); },
    legalFrom: sq => { const seen = new Set(), out = []; for (const m of C.legal(G.s, sq)) if (!seen.has(m.to)) { seen.add(m.to); out.push({ to: m.to, cap: !!m.captured }); } return out; },
    onMove: (from, to) => humanMove(from, to),
    onPick: () => sfx('tap'),
  });
  board.setCoords(set.coords);
  let G = null, aiTimer = 0, tickT = 0, reqId = 0;
  const show = which => {
    $('play').hidden = which !== 'play'; document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') { requestAnimationFrame(fit); pushHist(); }
  };
  function fit() {
    if ($('play').hidden) return;
    const st = $('stage'), s = Math.floor(Math.min(st.clientWidth, st.clientHeight));
    if (s > 60) $('board').style.setProperty('--bs', s + 'px');
  }
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe($('stage'));
  addEventListener('resize', () => requestAnimationFrame(fit));

  function newGame(cfg) {
    stopAll();
    const s = cfg.from ? C.fromJSON(cfg.from) : C.create();          // cfg.from = { start, moves }: 복기에서 '여기서부터 내가 두기'
    let me = null, players;
    const ai = t => ({ kind: 'ai', tier: t, name: `${tierLabel(t)} AI` });
    if (cfg.mode === 'ai') {
      me = cfg.color === 'b' ? 'b' : cfg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : 'w';
      players = { [me]: { kind: 'human', name: (window.GME && GME.me && GME.me.name) || '나' }, [other(me)]: ai(cfg.tier) };
    } else if (cfg.mode === 'duo') {
      const sp = (x, i) => x && x.kind === 'ai' ? ai(x.tier || 'normal') : { kind: 'human', name: (x && x.name) || `사람 ${i + 1}` };
      players = { w: sp(cfg.seats[0], 0), b: sp(cfg.seats[1], 1) };
    } else if (cfg.mode === 'online') {
      me = colorOf(cfg.seats, cfg.uid);
      players = onlinePlayers(cfg.seats, me);
    } else players = { w: ai(cfg.ww), b: ai(cfg.wb) };
    const base = cfg.clock ? cfg.clock * 60000 : 0;
    G = { cfg, mode: cfg.mode, s, me, players, clock: base ? { base, w: base, b: base, at: performance.now() } : null, over: false, thinking: false, paused: false,
      undos: 0, coachUsed: 0, round: cfg.round || 0, seats: cfg.seats || null, low: {}, t0: Date.now(), coachRes: null, coachKey: '', review: null,
      practice: !!cfg.practice, floor: cfg.practice ? s.moves.length : 0, rv: null, recAt: 0,
      drill: cfg.drill ? Object.assign({}, cfg.drill, { done: false, peek: false }) : null };   // 📒 노트의 아쉬운 장면부터: 첫 수는 스스로 찾게 (선생님 답은 '💡 답 보기')   // practice: 복기에서 이어 둔 연습 판 (전적·기록에 안 넣음) · floor: 되돌리기는 여기까지
    board.clearSel(); board.setArrow(null); board.closePromo();
    board.setFlip(cfg.mode === 'ai' || cfg.mode === 'online' ? me === 'b' : false);
    if (cfg.mode === 'online') closeModals();
    show('play');
    render(null);
    drawDock(); coachEnter();
    if (G.practice && coachBox) { coachBox.show(); coachBox.collapse(false); }   // 연습 판은 선생님 켠 채 시작
    tickT = setInterval(tick, 200);
    sfx('start');
    if (G.drill) Z.toast('📒 아쉬웠던 장면부터 다시 — 이번엔 추천 수를 찾아보세요', 3000);
    else if (G.practice) Z.toast(`🎮 이 장면부터 내가 ${CN[me]}이에요 · 연습 판이라 전적엔 안 넣어요`, 2600);
    else if (cfg.mode === 'ai') Z.toast(me === 'w' ? `${cfg.color === 'r' ? '🎲 이번엔 ' : ''}내가 백이에요. 먼저 둬요!` : `${cfg.color === 'r' ? '🎲 이번엔 ' : ''}내가 흑이에요. ${TIERS[cfg.tier].em} AI가 먼저 둬요`, 1800);
    else if (cfg.mode === 'online' && !cfg.quiet) Z.toast(!me ? '👀 구경 중이에요. 다음 판에 빈자리가 나면 앉을 수 있어요' : me === 'w' ? '⚪ 내가 백이에요. 먼저 둬요!' : '⚫ 내가 흑이에요. 친구가 먼저 둬요', 2000);
    if (cfg.mode !== 'watch' && cfg.mode !== 'online') howto(false);
    const g = G;
    setTimeout(() => { if (G === g) advance(); }, cfg.mode === 'watch' ? 500 : 300);
  }
  function stopAll() { clearTimeout(aiTimer); clearInterval(tickT); reqId++; rvSeq++; turnStop(); if (G) G.thinking = false; }
  function leaveRoom() { if (!ON) return; const n = ON.net; endOnline(); leaving = true; try { if (window.ArenaUI && ArenaUI.net === n) ArenaUI.leave(); else n.leave(); } catch (e) {} leaving = false; }
  function goMenu() {
    leaveRoom();
    stopAll(); board.closePromo(); coachHide();
    G = null; $('viewbar').hidden = true; show('menu'); drawMenu(); closeModals();
    popHist();
  }
  // 휴대폰 '뒤로' 몸짓: 페이지를 떠나지 않고 ‹ 단추처럼
  let histOn = false;
  window.__ownBack = () => histOn;                         // 판 두는 동안(이 게임이 뒤로 칸을 넣은 동안)만 직접, 메뉴·창은 common/backnav.js
  function pushHist() { if (histOn) return; try { history.pushState({ chess: 1 }, ''); histOn = true; } catch (e) {} }
  function popHist() { if (!histOn) return; histOn = false; try { history.back(); } catch (e) {} }
  addEventListener('popstate', () => {
    if (!histOn) return;
    histOn = false;
    if (!G || $('play').hidden) return;
    if (modals.length) { modals[modals.length - 1](); pushHist(); return; }
    pushHist(); tryLeave();
  });
  const needGuard = () => !!(G && !G.over && !G.rv && G.mode !== 'watch' && G.s.moves.length > (G.floor || 0) && !(G.mode === 'online' && !G.me));
  function tryLeave() {
    if (G && G.rv && G.mode !== 'review') { exitReview(); return; }    // 결과 창에서 들어온 복기: ‹ 는 결과 창으로
    if (!needGuard()) { goMenu(); return; }
    modal({ title: '나갈까요?', html: `<p class="sub">${G.mode === 'online' ? '나가면 이번 판은 기권으로 끝나요.' : '지금 판은 저장되지 않아요.'}</p>`, buttons: [{ label: '계속 두기', primary: true }, { label: '나가기', onClick: () => { if (G && G.mode === 'online' && G.me && !G.over) act({ resign: G.me }); goMenu(); } }], dismiss: true });
  }
  $('backBtn').onclick = () => { sfx('tap'); tryLeave(); };

  // 지금 둘 차례가 이 화면의 사람인가
  const humanTurn = () => {
    if (!G || G.over || G.thinking) return false;
    const c = C.turn(G.s), pl = G.players[c];
    if (G.mode === 'online') return G.me === c;
    return pl.kind === 'human';
  };
  async function humanMove(from, to) {
    if (!humanTurn()) return;
    const g = G;
    let promo = '';
    if (C.needsPromotion(g.s, from, to)) {
      promo = await board.pickPromotion(to, C.turn(g.s));
      if (G !== g || !promo) { render(null); return; }
    }
    if (!act(from + to + promo)) { render(null); sfx('bad'); }
  }

  // 행동 하나: 'e2e4' 같은 수 · { resign: 색 } · { timeout: 색 }. 사람·AI·친구 모두 이 길로
  function act(a, info) {
    info = info || {};
    if (!G || G.over) return false;
    const g = G, s = g.s, n0 = s.moves.length, prevKey = posKey();
    const ev = typeof a === 'string' ? C.step(s, a) : a.resign ? C.resign(s, a.resign) : a.timeout ? C.timeout(s, a.timeout) : [{ type: 'illegal' }];
    if (ev[0].type === 'illegal') return false;
    if (g.mode === 'online' && ON) {                                       // 방장은 확인한 수를 모두에게, 손님은 내 수를 방장에게 (꼭 도착)
      const ck = g.clock ? { cw: Math.round(g.clock.w), cb: Math.round(g.clock.b) } : {};
      if (ON.host) ON.net.broadcast(typeof a === 'string' ? Object.assign({ t: 'move', u: a, n: n0, round: g.round }, ck) : Object.assign({ t: 'end', round: g.round, winner: s.winner, reason: s.reason }, ck), true);
      else if (info.from !== 'remote') ON.net.send(typeof a === 'string' ? { t: 'move', u: a, n: n0, round: g.round } : { t: 'resign', round: g.round }, true);
    }
    const mv = ev.find(e => e.type === 'move');
    board.clearSel(); board.setArrow(null);
    if (g.coachRes && g.coachRes.key !== posKey()) board.setArrow(null);
    render(mv || null);
    if (mv) {
      sfx(mv.promotion ? 'promote' : mv.castle ? 'castle' : mv.captured ? 'capture' : 'move');
      // 특수한 수는 한 번 알려 줌 (캐슬링은 킹·룩이 같이 움직여서 '두 번 둔 것'처럼 보임)
      const sideName = g.me ? (mv.color === g.me ? '내가 ' : '상대가 ') : '';
      if (mv.castle) Z.toast(`🏰 ${sideName}캐슬링 — 킹이 두 칸, 룩이 킹 옆으로 넘어오는 한 수예요`, 2600);
      else if (mv.promotion) Z.toast(`👑 ${sideName}폰 승진!`, 1800);
      else if (mv.ep) Z.toast(`↗️ ${sideName}앙파상 — 옆으로 지나간 폰을 잡는 특별한 수예요`, 2400);
      if (mv.check) setTimeout(() => { if (G === g) sfx('check'); }, 90);
      if (info.from !== 'remote' || g.me) buzz(mv.captured ? 14 : 7);
      // 선생님: 방금 이 화면의 사람이 둔 수 돌아보기 (AI·친구가 둔 수는 건드리지 않음)
      if (g.players[mv.color] && g.players[mv.color].kind === 'human')
        g.review = g.coachRes && g.coachRes.key === prevKey ? { prev: g.coachRes, played: mv.uci, san: mv.san, game: C.toJSON(s) } : null;
      if (g.drill && !g.drill.done && n0 === g.drill.k && g.players[mv.color].kind === 'human') drillCheck(g, mv);
    }
    if (s.over) finish();
    else advance();
    return true;
  }
  const posKey = () => G ? G.round + ':' + G.s.moves.join(' ') : '';

  function advance() {
    if (!G || G.over) return;
    drawStat(); drawBars();
    const c = C.turn(G.s), pl = G.players[c];
    if (G.mode === 'duo' && G.cfg.rot === 'auto' && pl.kind === 'human' && (G.players.w.kind === 'human' && G.players.b.kind === 'human')) {
      const g = G; setTimeout(() => { if (G === g && C.turn(g.s) === c) { board.setFlip(c === 'b'); drawBars(); } }, 420);
    }
    if (pl.kind === 'ai' && !G.thinking && !(G.mode === 'watch' && G.paused)) requestAI();
    coachTick();
    if (G.mode === 'online') { subTurn(); turnSync(); }
  }
  function requestAI() {
    const g = G, s = g.s, c = C.turn(s), pl = g.players[c], id = ++reqId, t0 = performance.now();
    g.thinking = true; drawStat(); drawBars();
    const sp = g.mode === 'watch' ? g.cfg.speed : 'normal';
    const minWait = g.mode === 'watch' ? (sp === 'fast' ? 120 : sp === 'slow' ? 1100 : 550) : pl.tier === 'easy' ? 550 + Math.random() * 350 : 350 + Math.random() * 250;
    const opts = { tier: pl.tier, seed: (Math.random() * 1e9) | 0 };
    if (g.mode === 'watch' && sp === 'fast' && pl.tier === 'hard') opts.timeMs = 350;
    if (g.clock && pl.tier === 'hard') opts.timeMs = Math.max(150, Math.min(1200, g.clock[c] / 40));
    AIW.think(C.toJSON(s), opts).then(res => {
      if (G !== g || id !== reqId || g.over) return;
      const run = () => {
        if (G !== g || id !== reqId || g.over) return;
        if (g.paused) { aiTimer = setTimeout(run, 250); return; }
        g.thinking = false;
        if (!res || !res.move || !act(res.move, { ai: true })) { const L = C.legal(g.s); if (L.length) act(L[0].uci, { ai: true }); }
      };
      aiTimer = setTimeout(run, Math.max(0, minWait - (performance.now() - t0)));
    }).catch(() => { if (G === g && id === reqId) { g.thinking = false; const L = C.legal(g.s); if (L.length) act(L[Math.floor(L.length / 2)].uci, { ai: true }); } });
  }
  function cancelAI() { reqId++; clearTimeout(aiTimer); if (G) G.thinking = false; }

  // ── 시계 ──
  function tick() {
    if (!G || G.over || !G.clock) return;
    const now = performance.now(), dt = now - G.clock.at; G.clock.at = now;
    if (G.paused || G.s.moves.length < 1) return;
    if (document.hidden && G.mode !== 'online') return;               // 화면을 내리면 혼자·둘이서는 멈춤
    const c = C.turn(G.s);
    G.clock[c] = Math.max(0, G.clock[c] - dt);
    if (G.clock[c] <= 10000 && !G.low[c] && (G.mode === 'duo' || G.me === c)) { G.low[c] = 1; sfx('lowtime'); }
    if (G.clock[c] <= 0 && (G.mode !== 'online' || (ON && ON.host))) { cancelAI(); act({ timeout: c }); return; }
    drawClocks();
  }
  const fmtClock = ms => { const s = Math.ceil(ms / 1000); if (ms < 10000) return `${Math.floor(ms / 1000)}.${Math.floor(ms % 1000 / 100)}`; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function drawClocks() {
    if (!G) return;
    for (const id of ['pTop', 'pBot']) {
      const el = $(id), c = el.dataset.c, k = el.querySelector('.clk'); if (!k) continue;
      if (!G.clock || G.rv) { k.hidden = true; continue; }
      k.hidden = false; k.textContent = fmtClock(G.clock[c]);
      k.classList.toggle('low', G.clock[c] < 20000);
      k.classList.toggle('run', !G.over && C.turn(G.s) === c && G.s.moves.length >= 1);
    }
  }

  // ── 화면 그리기 ──
  // 화면에 보일 국면: 복기 중이면 k 수째 장면, 아니면 지금 판
  const VS = () => (G.rv ? G.rv.s : G.s);
  function render(mv) {
    if (!G) return;
    const s = VS(), chk = s.chess.inCheck() ? C.kingSquare(s, C.turn(s)) : null;
    board.set(C.board(s), mv);
    const rh = G.rv && G.rv.hint && G.rv.hint.k === G.rv.k && coachOpen() ? G.rv.hint : null;   // 복기 선생님: 추천(초록) + 실제로 둔 수(파랑)
    const showHint = !G.rv && G.coachRes && G.coachRes.key === posKey() && coachOpen() && !G.over;
    const hint = rh ? [rh.from, rh.to] : showHint ? [G.coachRes.from, G.coachRes.to] : null;
    const ot = showHint && G.coachRes.opp && G.coachRes.opp.threat;   // 👀 대국 중: 상대가 다음에 노리는 수 (주황, 창이 열려 있고 같은 판일 때만)
    board.setMarks({ last: s.last ? [s.last.from, s.last.to] : null, check: chk, hint });
    board.setArrow(hint, rh && rh.real, rh ? rh.threat : ot ? [ot.from, ot.to] : null);
    drawBars(); drawMoves(); drawStat();
  }
  function nameOf(c) {
    const pl = G.players[c];
    if (G.mode === 'online') { const u = G.seats && G.seats[c]; return u ? nmOf(u) : '빈자리'; }
    return pl.name;
  }
  function drawBars() {
    if (!G) return;
    const vs = VS(), bot = board.flip ? 'b' : 'w', top = other(bot), cap = C.captured(vs), t = C.turn(vs), live = G.rv ? !vs.over : !G.over;
    for (const [id, c] of [['pTop', top], ['pBot', bot]]) {
      const el = $(id), pl = G.players[c];
      el.dataset.c = c;
      const mine = (G.mode === 'ai' || G.mode === 'online' || G.mode === 'review') && G.me === c;
      const caps = cap[c];
      let ci = '', prev = '';
      for (const x of caps) { ci += `<i class="${prev && prev !== x ? 'gap' : ''}" style="background-image:url('${PIECE(other(c) + x.toUpperCase())}')"></i>`; prev = x; }
      const d = c === 'w' ? cap.diff : -cap.diff;
      el.innerHTML = `<span class="pk" style="background-image:url('${PIECE(c + 'K')}')"></span>
        <span class="pn"><b class="nm">${esc(nameOf(c))}${mine && nameOf(c) !== '나' ? '<span class="tag">나</span>' : ''}<small>${CN[c]}</small></b><span class="caps">${ci}${d > 0 ? `<span class="diff">+${d}</span>` : ''}</span></span>
        <span class="clk" hidden></span>`;
      el.classList.toggle('turn', live && t === c);
      el.classList.toggle('think', !!(G.thinking && t === c && pl.kind === 'ai'));
    }
    drawClocks();
    if (G.mode === 'online') drawViewers();
  }
  function drawMoves() {
    if (!G) return;
    const el = $('moves'), h = G.s.hist, lab = san => set.notation === 'ko' ? C.sanKo(san) : san;
    const cur = G.rv ? G.rv.k - 1 : h.length - 1;                     // 복기: 전체 기보를 보이고 k 수째에 불 (눌러서 그 수로)
    let html = '';
    h.forEach((m, i) => {
      const no = moveNo(i);
      if (no.white) html += `<span class="no">${no.n}.</span>`;
      else if (i === 0) html += `<span class="no">${no.n}…</span>`;
      html += `<span class="m${i === cur ? ' cur' : ''}${G.rv && i > cur ? ' later' : ''}" data-i="${i}" title="${esc(C.describe(m))}">${esc(lab(m.san))}</span>`;
    });
    el.innerHTML = html;
    el.classList.toggle('rv', !!G.rv);
    const c = G.rv && el.querySelector('.m.cur');
    if (c) { const r = c.getBoundingClientRect(), er = el.getBoundingClientRect(); el.scrollLeft += r.left - er.left - (er.width - r.width) / 2; el.scrollTop += r.top - er.top - (er.height - r.height) / 2; }
    else if (G.rv) { el.scrollLeft = 0; el.scrollTop = 0; }
    else { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight; }
    $('movePill').textContent = G.rv ? `${G.rv.k} / ${G.rv.n}` : `${Math.floor(G.s.moves.length / 2) + 1}수`;
  }
  // i 번째(0부터) 수의 수 번호: 백이 둔 수면 white (시작 FEN 의 차례 · 수 번호를 따름)
  function moveNo(i, start) {
    const p = (start || G.s.start).split(' '), k = i + (p[1] === 'b' ? 1 : 0);
    return { n: +(p[5] || 1) + Math.floor(k / 2), white: k % 2 === 0 };
  }
  $('moves').onclick = e => { const m = G && G.rv && e.target.closest('.m'); if (m) rvGoto(+m.dataset.i + 1); };
  function drawStat() {
    if (!G) return;
    if (G.rv) { drawRvStat(); return; }
    const s = G.s, c = C.turn(s), pl = G.players[c];
    const lbl = G.mode === 'ai' ? (G.practice ? `🎮 연습 · ${tierLabel(G.cfg.tier)} AI와` : `${tierLabel(G.cfg.tier)} AI와 대국`) : G.mode === 'duo' ? '👥 둘이서' : G.mode === 'online' ? '👥 친구랑' : `👀 ${tierLabel(G.cfg.ww)} vs ${tierLabel(G.cfg.wb)}`;
    $('lbl').textContent = lbl;
    const st = $('stat');
    st.classList.remove('thinking'); st.classList.remove('myturn'); $('stage').classList.remove('myturn');
    if (s.over) { st.textContent = resultLine(); return; }
    const chk = s.chess.inCheck() ? ' · 체크!' : '';
    if (G.thinking && pl.kind === 'ai') { st.textContent = `${CN[c]} AI가 생각 중`; st.classList.add('thinking'); return; }
    if (G.mode === 'ai') st.textContent = (c === G.me ? '내 차례' : '상대 차례') + chk;
    else if (G.mode === 'online') {                                    // 친구랑: 내 차례는 금색으로 반짝 + 남은 시간
      const mine = humanTurn(), u = G.seats && G.seats[c];
      st.textContent = (mine ? '내 차례' + (TT.left != null ? ` · ⏱${TT.left}` : '') : G.me ? `${u ? nmOf(u) + '님' : '상대'} 차례${u && ON && ON.sub[u] ? ' 🤖' : ''}` : `${CN[c]} ${u ? nmOf(u) + '님 ' : ''}차례`) + chk;
      if (mine) { st.classList.add('myturn'); $('stage').classList.add('myturn'); }
    }
    else st.textContent = `${CN[c]} 차례${G.mode === 'duo' && pl.kind === 'human' ? ` · ${pl.name}` : ''}${chk}`;
  }
  function resultLine() {
    const s = G.s;
    return s.winner ? `${CN[s.winner]} 승 · ${C.REASON[s.reason] || ''}` : `무승부 · ${C.REASON[s.reason] || ''}`;
  }
  function drawDock() {
    const rv = !!(G && G.rv);
    $('dock').hidden = rv; $('dockReview').hidden = !rv;
    if (rv) { rvSync(); return; }
    rvLayout();
    const m = G ? G.mode : '';
    $('undoBtn').hidden = !(m === 'ai' || m === 'duo');
    $('resignBtn').hidden = !(m === 'ai' || m === 'duo' || (m === 'online' && G.me));
    $('pauseBtn').hidden = m !== 'watch'; $('speedBtn').hidden = m !== 'watch'; $('againBtn').hidden = m !== 'watch';
    if (m === 'watch') drawWatchDock();
  }
  function drawWatchDock() {
    if (!G) return;
    $('pauseBtn').setAttribute('aria-pressed', String(G.paused));
    $('pauseBtn').innerHTML = G.paused ? '<span class="ic">▶</span><span>계속</span>' : '<span class="ic">⏸</span><span>멈춤</span>';
    const sp = G.cfg.speed;
    $('speedBtn').innerHTML = `<span class="ic">${sp === 'fast' ? '🐇' : sp === 'slow' ? '🐢' : '🚶'}</span><span>${sp === 'fast' ? '빠르게' : sp === 'slow' ? '느리게' : '보통'}</span>`;
  }
  Z.sfx.button($('sndBtn'));
  const drawSnd = () => { const b = $('sndBtn'); b.querySelector('.ic').textContent = Z.sfx.on ? '🔊' : '🔇'; b.querySelector('.ic + span').textContent = Z.sfx.on ? '소리 켬' : '소리 끔'; };

  $('flipBtn').onclick = () => { if (!G) return; sfx('flip'); board.setFlip(!board.flip); drawBars(); };
  $('undoBtn').onclick = () => {
    if (!G || !(G.mode === 'ai' || G.mode === 'duo') || G.s.moves.length <= G.floor) { sfx('bad'); return; }
    cancelAI(); board.closePromo();
    const s = G.s, humanColor = c => G.players[c].kind === 'human';
    let n = 0;
    do { C.undo(s, 1); n++; } while (s.moves.length > G.floor && !humanColor(C.turn(s)));   // 연습 판은 시작 장면 앞으로는 안 물림
    G.over = false; G.undos++; G.review = null; G.coachRes = null; G.flow = {};
    sfx('flip'); render(null); drawDock();
    if (!tickT) tickT = setInterval(tick, 200);
    if (G.clock) G.clock.at = performance.now();
    advance();
  };
  $('resignBtn').onclick = () => {
    if (!G || G.over) return;
    const who = G.mode === 'duo' ? C.turn(G.s) : G.me;
    if (!who) return;
    sfx('tap');
    modal({ title: '🏳️ 기권할까요?', html: `<p class="sub">${G.mode === 'duo' ? `${CN[who]}(${esc(G.players[who].name)})이 기권해요` : '이번 판은 지는 걸로 끝나요'}</p>`, buttons: [{ label: '계속 두기', primary: true }, { label: '기권', onClick: () => { if (G && !G.over) { cancelAI(); act({ resign: who }); } } }], dismiss: true });
  };
  $('pauseBtn').onclick = () => { if (!G) return; G.paused = !G.paused; sfx('tap'); drawWatchDock(); if (!G.paused) advance(); };
  $('speedBtn').onclick = () => { if (!G) return; const o = ['slow', 'normal', 'fast']; G.cfg.speed = o[(o.indexOf(G.cfg.speed) + 1) % 3]; pref.speed = G.cfg.speed; savePref(); sfx('tap'); drawWatchDock(); };
  $('againBtn').onclick = () => { if (G) { sfx('tap'); newGame(G.cfg); } };

  // ── 끝 ──
  // 🏆 랭킹: 판이 끝나면 내 기기 몫만 한 번 (구경 · 둘이서 · AI 구경 · 복기에서 이어 둔 연습 판은 안 셈, 새로 고침으로 다시 받은 끝난 판도 한 번만)
  function rankReport(g) {
    try {
      if (!window.GRank || !g.me || g.practice || (g.mode !== 'ai' && g.mode !== 'online')) return;
      const w = g.s.winner, res = !w ? 'd' : w === g.me ? 'w' : 'l', r = { mode: 'ai', res, beat: res === 'w' ? 1 : 0 };
      if (g.mode === 'online' && ON) {
        const key = ON.net.code + ':' + g.round + ':' + g.s.start + ':' + g.s.moves.join(' ') + ':' + g.s.reason;
        let seen = []; try { seen = JSON.parse(sessionStorage.getItem('chess.rk') || '[]'); } catch (e) {}
        if (seen.includes(key)) return;
        try { sessionStorage.setItem('chess.rk', JSON.stringify(seen.concat(key).slice(-12))); } catch (e) {}
        const ou = g.seats && g.seats[other(g.me)];
        if (ou && !(ON.sub && ON.sub[ou])) { r.mode = 'friend'; r.opp = [{ uid: ou, res }]; }   // AI 가 대신 앉았으면 AI 판
      }
      if (g.mode === 'ai') r.tier = g.cfg.tier;   // 난이도별 전적 (친구 판은 없음)
      rankFresh = false;
      GRank.result('chess', r);
    } catch (e) {}
  }
  function finish() {
    const g = G; g.over = true; cancelAI(); clearInterval(tickT); tickT = 0; board.closePromo(); board.setArrow(null); rankReport(g);
    if (g.mode === 'online') { turnStop(); if (ON && ON.goneAsk) { try { ON.goneAsk(); } catch (e) {} } countScore(g); }   // 친구랑: 내 차례 시계 끄기 · '나갔어요' 창 닫기 · 이 방 전적 +1
    const s = g.s, w = s.winner;
    let res = 'd';
    if (g.mode === 'ai') { res = !w ? 'd' : w === g.me ? 'w' : 'l'; if (!g.practice) { const st = stats(), r = st[g.cfg.tier] || { w: 0, l: 0, d: 0 }; r[res]++; st[g.cfg.tier] = r; save('stats', st); } }   // 연습 판은 전적에 안 넣음
    saveRecord(g);
    if (g.mode === 'ai' && !g.practice) setTimeout(() => scanGame(g), 1500);   // 📒 손해 큰 내 수 1~3개를 노트에 (뒤에서)
    render(null);
    const humanWon = g.mode === 'ai' ? res === 'w' : g.mode === 'online' ? !!g.me && w === g.me : g.mode === 'duo' ? !!w && g.players[w].kind === 'human' : false;
    setTimeout(() => {
      if (G !== g) return;
      if (humanWon) { sfx('win'); Z.confetti(); } else if (w && (g.mode === 'ai' || (g.mode === 'online' && g.me))) sfx('lose'); else sfx('count');
    }, 250);
    coachTick();
    setTimeout(() => { if (G === g) showResult(); }, s.reason === 'checkmate' ? 1100 : 600);
  }
  const fmtT = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; };
  function showResult() {
    const g = G, s = g.s, w = s.winner, n = Math.ceil(s.moves.length / 2), why = C.REASON[s.reason] || '';
    let title, body = '';
    const pieceImg = c => `<div class="winp" style="background-image:url('${PIECE(c + 'K')}')"></div>`;
    title = resTitle(g);
    if (g.mode === 'ai') {
      const T = TIERS[g.cfg.tier];
      const rec = g.practice ? '<p class="why">🎮 복기에서 이어 둔 연습 판이라 전적엔 안 넣어요</p>' : `<p class="why" id="rkRec" style="${resRecTxt(g) ? '' : 'display:none'}">${esc(resRecTxt(g))}</p>`;
      if (w === g.me) {
        const stars = 1 + (g.undos ? 0 : 1) + (g.coachUsed ? 0 : 1);
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < stars ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <p class="bigline">${T.em} ${T.name} AI를 이겼어요 · ${why}</p><p class="sub">${n}수 · ${fmtT(Date.now() - g.t0)}</p>
          <p class="why">${g.undos ? `되돌리기 ${g.undos}번` : '되돌리기 0 ✓'} · ${g.coachUsed ? '선생님 도움 받음' : '선생님 없이 ✓'}</p>${rec}`;
      } else if (w) {
        body = `<p class="bigline">${T.em} ${T.name} AI가 이겼어요 · ${why}</p><p class="sub">${n}수 · ${fmtT(Date.now() - g.t0)}</p>
          <p class="why">${s.reason === 'checkmate' ? '킹 둘레를 비워 두지 말고, 상대의 체크를 미리 살펴봐요. 🎞️ 복기로 어디서 갈렸는지 볼 수 있어요' : '다음 판은 끝까지 버텨 봐요!'}</p>${rec}`;
      } else body = `<p class="bigline">${why}</p><p class="sub">${n}수</p>${rec}`;
    } else {
      const nm = c => esc(nameOf(c));
      body = (w ? pieceImg(w) + `<p class="bigline">${nm(w)}</p>` : '') + `<p class="sub">${why} · ${n}수</p>` +
        (g.mode === 'online' && !g.me ? `<p class="why">👀 구경 중 · ${ON && ON.host ? '' : '방장이 다음 판을 시작하면 이어서 봐요'}</p>` : '');
    }
    const online = g.mode === 'online' && !!ON;
    if (online) body += '<div class="rdy" id="rdyBox"></div>';         // 친구랑: 준비 · 시작은 이 칸에서 (손님은 ✋ 준비, 방장이 시작)
    const rvB = { label: '🎞️ 복기', onClick: () => startReview() };
    const btns = online
      ? [rvB, { label: '기보 복사', onClick: () => { copyPgn(); return false; } }].concat(ON.host && window.ArenaUI ? [{ label: '대기실', onClick: () => ArenaUI.toLobby() }] : [], [{ label: '메뉴', ghost: true, onClick: () => goMenu() }])
      : [
        { label: g.mode === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => again() },
        rvB,
        { label: '기보 복사', onClick: () => { copyPgn(); return false; } },
        { label: '메뉴', ghost: true, onClick: () => goMenu() },
      ];
    modal({ title, html: body, buttons: btns });
    if (online) { const box = document.getElementById('rdyBox'); if (box) { wireReady(box); drawReady(); } }
  }
  function resTitle(g) {
    const w = g.s.winner, me = g.mode === 'ai' || (g.mode === 'online' && g.me) ? g.me : null;
    if (me) return !w ? '🤝 비겼어요' : w === me ? '🎉 이겼어요!' : '😿 아쉽게 졌어요';
    return w ? `${CN[w]} 승리!` : '🤝 비겼어요';
  }
  function copyPgn() {
    if (!G) return;
    const tags = { White: nameOf('w'), Black: nameOf('b') };
    const txt = C.pgn(G.s, tags);
    const done = () => Z.toast('기보(PGN)를 복사했어요');
    try { navigator.clipboard.writeText(txt).then(done, () => Z.toast('복사하지 못했어요')); } catch (e) { Z.toast('복사하지 못했어요'); }
  }
  function again() {
    if (!G) return;
    if (G.mode === 'online') { if (!ON) goMenu(); else if (G.over) showResult(); return; }   // 다음 판은 결과 창의 준비 칸에서
    const cfg = G.cfg;
    if (cfg.mode === 'ai' && cfg.color !== 'r') cfg.color = G.me;   // 같은 색으로 다시
    newGame(cfg);
  }

  // ════════ AI 선생님 (공용 창 CoachPanel + 아래 줄 단추 하나) ════════
  // 혼자·둘이서는 늘, 친구랑은 방장이 대기실에서 켰을 때만 (cfg.coach). 창이 열려 있을 때만 수를 읽음
  // 내 차례 창: 👀 상대가 방금 둔 수(한 일 · 다음 노림, 판에 주황 화살표) · 📊 형세 · 💡 추천 · 👉 추천이 그 노림을 막는지 — 말 만들기는 read.js, 읽기는 ChessAI.intent (복기 '🤔 노린 것'과 같은 계산)
  let coachBox = null;
  const CR = window.ChessRead || null;                                   // 상대 수 읽기·형세 말 (read.js) — 없어도 선생님은 예전처럼
  function coachSetup() {
    if (coachBox || !window.CoachPanel) return;
    try {
      coachBox = CoachPanel.create({ game: 'chess', title: 'AI 선생님', startHidden: true });
      CoachPanel.button($('coachBtn'), coachBox, { onToggle: on => { if (on) sfx('hint'); } });
      coachBox.onChange(() => { requestAnimationFrame(coachPlace); if (G) { if (coachOpen() || G.rv) coachTick(); render(null); rvLayout(); } });
      coachBox.body.addEventListener('click', e => { if (e.target.closest('[data-peek]') && G && G.drill) { G.drill.peek = true; sfx('hint'); coachTick(); } });
      addEventListener('resize', () => requestAnimationFrame(coachPlace));
    } catch (e) { coachBox = null; }
  }
  // 기본 자리: 세로 화면은 아래 단추 줄 위, 가로 화면은 내 이름 줄 위(기보 칸) — 판과 내 줄을 가리지 않게. 사용자가 옮긴 자리는 그대로
  function coachPlace() {
    if (!coachBox || $('play').hidden) return;
    let st = null; try { st = JSON.parse(localStorage.getItem('game.coach.chess') || 'null'); } catch (e) {}
    const land = matchMedia('(orientation:landscape) and (min-width:600px)').matches;
    const r = (land ? $('pBot') : G && G.rv ? $('dockReview') : $('dock')).getBoundingClientRect(); if (!r.height) return;
    const off = Math.max(8, Math.round(innerHeight - r.top + 8)) + 'px';
    if (!(st && st.p)) { coachBox.el.style.bottom = off; coachBox.el.style.top = 'auto'; }
    if (!(st && st.c)) { coachBox.chip.style.bottom = off; coachBox.chip.style.top = 'auto'; }
  }
  const coachAvail = () => !!(G && (G.rv || (G.mode !== 'watch' && (G.mode !== 'online' || (ON && ON.coach)))));   // 복기는 어느 판이든
  const coachOpen = () => !!(coachBox && coachBox.visible && !coachBox.collapsed && coachAvail());
  function coachEnter() {
    coachSetup();
    if (G && G.rv) return;                                             // 복기 중엔 복기 단추 줄의 🧑‍🏫 로만 켜고 끔
    const ok = coachAvail();
    $('coachBtn').hidden = !ok;
    if (!coachBox) return;
    if (ok && !CoachPanel.isOff('chess')) { coachBox.show(); coachBox.set(''); } else coachBox.hide();
  }
  function coachHide() { if (coachBox) coachBox.hide(); }
  const pawnFmt = sc => (sc >= 0 ? '+' : '−') + (Math.abs(sc) / 100).toFixed(1);
  function evalLine(res, c) {
    if (res.mate) { const win = res.mate > 0 ? c : other(c); return `${CN[win]}이 ${Math.abs(res.mate)}수 안에 메이트할 수 있어요`; }
    const w = c === 'w' ? res.score : -res.score;
    if (Math.abs(w) < 35) return '형세: 비슷해요';
    return `형세: ${w > 0 ? '백' : '흑'} ${pawnFmt(Math.abs(w))} ${Math.abs(w) >= 300 ? '(크게 유리)' : Math.abs(w) >= 120 ? '(유리)' : '(조금 유리)'}`;
  }
  const lab = san => (set.notation === 'ko' ? C.sanKo(san) : san);
  function coachTick() {
    if (G && G.rv) { rvCoach(); return; }
    if (!G || !coachOpen()) return;
    const g = G, s = g.s, key = posKey(), c = C.turn(s);
    if (s.over) { coachBox.set(`이번 판은 끝났어요 · ${esc(resultLine())}`); return; }
    const spec = g.mode === 'online' && !g.me;
    const mine = humanTurn() || (g.mode === 'duo' && g.players[c].kind === 'human') || spec;
    const revHtml = reviewHtml();
    if (g.review && g.review.score == null && !g.review.busy) reviewMove();
    if (!mine) {
      coachBox.set(revHtml + (g.mode === 'online' ? '친구 차례예요 · 친구가 두면 다시 알려 드릴게요' : 'AI가 생각하는 중이에요 · 내 차례가 되면 알려 드릴게요'));
      return;
    }
    if (g.drill && !g.drill.done && !g.drill.peek && s.moves.length === g.drill.k && humanTurn()) {
      coachBox.set(`<div class="ch-mv">📒 아쉬웠던 그 장면이에요</div><div class="ch-sub">이번엔 스스로 좋은 수를 찾아봐요 · 막히면 <button type="button" class="ch-peek" data-peek>💡 답 보기</button></div>`);
      return;
    }
    if (g.coachRes && g.coachRes.key === key) { coachShow(); oppRead(g, key); return; }
    if (g.coachBusy === key) return;
    g.coachBusy = key;
    coachBox.set(revHtml + '💡 좋은 수를 찾는 중…');
    COACHW.think(C.toJSON(s), { tier: 'hard', hint: true, explain: true, timeMs: 800, seed: 7 }).then(res => {
      if (G !== g) return;
      if (g.coachBusy === key) g.coachBusy = null;
      if (posKey() !== key || !res || !res.move) return;
      const san = C.sanLine(s, res.pv, 4), n = s.moves.length, pf = g.flow && g.flow[c];
      g.coachRes = { key, move: res.move, from: res.move.slice(0, 2), to: res.move.slice(2, 4), san: san[0] || res.move, line: san, score: res.score, mate: res.mate, why: res.why, c,
        prev: pf && pf.n === n - 2 ? { score: pf.score, mate: pf.mate } : null, opp: null };   // prev = 내 지난 차례 때 형세 (달라진 폭을 말해 주려고)
      (g.flow = g.flow || {})[c] = { n, score: res.score, mate: res.mate };
      g.coachUsed++;
      if (coachOpen()) { coachShow(); sfx('hint'); oppRead(g, key); }
    }).catch(() => { if (G === g && g.coachBusy === key) g.coachBusy = null; });
  }
  function coachShow() {
    const g = G, r = g.coachRes; if (!r || !coachBox) return;
    const spec = g.mode === 'online' && !g.me, duo = g.mode === 'duo', read = !spec && !!CR;
    const who = spec || duo ? `${CN[r.c]} 차례라면 ` : '';
    const line = r.line.length > 1 ? `예상 수순: ${r.line.slice(0, read ? 3 : 4).map(lab).join(' ')}` : '';
    // 흐름: 👀 상대가 방금 둔 수(한 일 · 다음 노림) → 📊 형세 → 💡 추천 → 👉 추천이 그 노림을 막는지 (구경꾼은 예전처럼 추천 + 형세만)
    const note = read && r.opp && r.opp.threat ? CR.threatNote(r, r.opp.threat, lab) : '', one = !!note && CR.overlaps(r);   // one = 추천 까닭과 겹치면 한 줄로
    const sub = read ? line : [line, evalLine(r, r.c), spec ? '👀 구경 중' : ''].filter(Boolean).join(' · ');
    coachBox.set(`${reviewHtml()}${read ? `${oppHtml(g, r)}<div class="ch-form">📊 형세: ${esc(CR.formLine(r, r.c, { duo, prev: r.prev }))}</div>` : ''}<div class="ch-mv">💡 ${who}<b>${esc(lab(r.san))}</b> ${one ? esc(note) : r.why ? esc(r.why.text) : ''}</div>`
      + `${note && !one ? `<div class="ch-why">👉 ${esc(note)}</div>` : ''}${sub ? `<div class="ch-sub">${esc(sub)}</div>` : ''}`);
    render(null); rvLayout();
  }
  // 👀 상대가 방금 둔 수 한 줄 (읽는 동안은 '읽는 중…')
  function oppHtml(g, r) {
    const s = g.s, last = s.hist[s.moves.length - 1], o = r.opp;
    if (!last || (o && o.none)) return '';
    const head = `👀 ${g.mode === 'duo' ? CN[last.color] : '상대'} <b>${esc(lab(last.san))}</b>: `;
    if (!o) return `<div class="ch-int">${head}읽는 중…</div>`;
    const next = o.threat ? ` → 🟠 다음 <b>${esc(lab(o.threat.san))}</b> ${esc(o.threat.text)}` : o.check ? '' : ' · 급한 노림은 없어 보여요';
    return `<div class="ch-int">${head}${esc(o.done)}${next}</div>`;
  }
  // 👀 복기 '🤔 노린 것' 과 같은 계산(ChessAI.intent)을 대국 중 상대 쪽에서: 방금 한 일 + 내가 한 수 쉬면 다음에 노리는 수(판에 주황 화살표).
  //   추천은 먼저 보여 주고 뒤에 채움 · 선생님이 이미 읽은 값을 쓰니 새로 읽는 건 '한 번 더 둔다면' 하나뿐 · 같은 판일 때만 반영
  function oppRead(g, key) {
    const r = g.coachRes, s = g.s, n = s.moves.length, last = s.hist[n - 1];
    if (!CR || !r || r.key !== key || r.opp || r.oppBusy || !last || (g.mode === 'online' && !g.me) || g.rv || g.over) return;
    const c = C.turn(s), my = g.mode === 'duo' ? CN[c] : '내';
    r.oppBusy = true;
    const done = o => { r.oppBusy = false; if (G !== g || g.coachRes !== r || posKey() !== key) return; r.opp = o || { none: true }; if (coachOpen()) coachShow(); };
    COACHW.intent({ start: s.start, moves: s.moves.slice(0, n - 1) }, last.uci, { timeMs: 400, my, skipScore: true, reply: r.move })
      .then(it => done(CR.oppRead(it, r, (fen, u) => C.sanLine(C.create(fen), [u], 1)[0]))).catch(() => done(null));
  }
  // 방금 둔 사람 수 돌아보기: 선생님이 본 최선과 견줘 봄 (새 국면을 짧게 읽음)
  function reviewMove() {
    const g = G, rv = g.review; if (!rv || rv.busy) return;
    rv.busy = true;
    if (rv.played === rv.prev.move) { rv.score = rv.prev.score; rv.loss = 0; coachTick(); return; }
    COACHW.think(rv.game, { tier: 'hard', hint: true, timeMs: 350, seed: 3 }).then(res => {
      if (G !== g || g.review !== rv || !res || !res.move) return;
      rv.score = -res.score; rv.loss = rv.prev.mate > 0 && !(res.mate < 0) ? 999 : Math.max(0, rv.prev.score - rv.score);
      if (Math.abs(rv.prev.score) > 20000 && Math.abs(rv.score) > 20000) rv.loss = 0;
      coachTick();
    }).catch(() => {});
  }
  function reviewHtml() {
    const rv = G && G.review; if (!rv || rv.score == null) return '';
    const p = rv.prev;
    if (rv.played === p.move) return `<div class="ch-rev">👍 방금 <b>${esc(lab(rv.san))}</b>, 선생님 추천과 같은 수예요!</div>`;
    if (rv.loss <= 45) return `<div class="ch-rev">👍 방금 <b>${esc(lab(rv.san))}</b>, 좋은 수예요</div>`;
    if (rv.loss <= 140) return `<div class="ch-rev">🙂 방금 <b>${esc(lab(rv.san))}</b>도 괜찮아요. <b>${esc(lab(p.san))}</b>가 조금 더 좋았어요</div>`;
    return `<div class="ch-rev bad">😮 방금 <b>${esc(lab(rv.san))}</b>는 아쉬워요${rv.loss < 900 ? ` (${pawnFmt(-rv.loss)})` : ''}. <b>${esc(lab(p.san))}</b>${p.why ? ` — ${esc(p.why.text)}` : '가 더 좋았어요'}</div>`;
  }

  // ════════ 🎞️ 지난 대국 · 복기 ════════
  // 끝난 판은 이 기기에 최근 MAX_REC 판 (혼자 · 둘이서 · 친구랑. 연습 판 · AI 구경 · 구경만 한 판은 빼고)
  // 기록 { at, start: FEN, moves: ['e2e4', …], names: { w, b }, title, result, winner, reason, mode, me, tier }
  // 복기는 G.rv = { rec, k, n, s: k 수째 장면, hint, cache, wait } — 결과 창에서 들어오면 지금 판(G) 위에 얹고, 지난 대국은 mode 'review' 판을 새로 만듦
  const MAX_REC = 20;
  const records = () => { const r = store('records', []); return Array.isArray(r) ? r.filter(x => x && Array.isArray(x.moves)) : []; };
  function makeRec(g) {
    const s = g.s;
    return { at: Date.now(), start: s.start, moves: s.moves.slice(), names: { w: nameOf('w'), b: nameOf('b') }, title: resTitle(g), result: resultLine(),
      winner: s.winner || null, reason: s.reason || null, mode: g.mode, me: g.me || null, tier: g.mode === 'ai' ? g.cfg.tier : null };
  }
  function saveRecord(g) {
    if (g !== G || g.practice || g.mode === 'watch' || g.mode === 'review' || (g.mode === 'online' && !g.me) || !g.s.moves.length) return;
    const rec = makeRec(g), list = records(), i = g.recAt ? list.findIndex(r => r.at === g.recAt) : -1;   // 되돌리기로 다시 끝낸 판은 같은 칸을 고침
    if (i >= 0) { rec.at = g.recAt; list[i] = rec; } else { g.recAt = rec.at; list.push(rec); }
    save('records', list.slice(-MAX_REC));
  }
  const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function recWho(r) {
    const nm = c => (r.names && r.names[c]) || CN[c];
    if (r.mode === 'ai') return `${TIERS[r.tier] ? tierLabel(r.tier) + ' ' : ''}AI · 내가 ${CN[r.me] || '백'}`;
    return `${r.mode === 'online' ? '👥 친구랑' : '👥 둘이서'} · ${nm('w')} vs ${nm('b')}`;
  }
  function openRecords() {
    sfx('tap');
    const list = records().reverse();
    if (!list.length) { Z.toast('아직 끝낸 대국이 없어요. 한 판 두면 여기에 남아요', 2200); return; }
    const html = `<ul class="list reclist">${list.map((r, i) => `<li data-i="${i}"><span class="inf"><b>${esc(r.title || '')}</b><span class="small">${esc(recWho(r))}</span><span class="small">${esc(r.result || '')} · ${Math.ceil(r.moves.length / 2)}수 · ${when(r.at)}</span></span><button class="btn mint" type="button">🎞️ 복기</button></li>`).join('')}</ul>
      <p class="small" style="margin:8px 0 0">이 기기에 최근 ${MAX_REC}판까지 남아요</p>`;
    const close = modal({ title: '🎞️ 지난 대국', html, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const ul = document.querySelector('.reclist');
    if (ul) ul.onclick = e => { const li = e.target.closest('li[data-i]'); if (!li) return; close(); startReview(list[+li.dataset.i]); };
  }
  let rvSeq = 0, rvT = 0;
  // rec 없이: 결과 창에서 지금 끝난 판 그대로 (친구랑 방은 그대로) · rec: 지난 대국
  function startReview(rec) {
    closeModals();
    if (!rec) {                                                         // 저장된 판이면 그 기록(at)을 그대로 — 📒 노트가 같은 장면을 하나로 묶게
      if (!G || !G.over) return;
      const r = makeRec(G); if (G.recAt) r.at = G.recAt; else r.unsaved = true;
      rvOpen(G, r); return;
    }
    let full = null;
    try { full = C.fromJSON({ start: rec.start, moves: rec.moves }); } catch (e) { full = null; }
    if (!full || !full.moves.length) { Z.toast('기보를 읽지 못했어요'); return; }
    if (!full.over && rec.reason) { full.over = true; full.winner = rec.winner || null; full.reason = rec.reason; }   // 기권 · 시간 끝
    leaveRoom(); stopAll(); board.closePromo(); coachHide();
    const nm = c => (rec.names && rec.names[c]) || CN[c];
    G = { cfg: { mode: 'review' }, mode: 'review', s: full, me: rec.me || null, players: { w: { kind: 'human', name: nm('w') }, b: { kind: 'human', name: nm('b') } },
      clock: null, over: true, thinking: false, paused: false, undos: 0, coachUsed: 0, round: 0, seats: null, low: {}, t0: Date.now(), coachRes: null, coachKey: '', review: null,
      practice: false, floor: 0, rv: null, recAt: rec.at };
    $('viewbar').hidden = true; $('specPill').hidden = true;
    board.clearSel(); board.setArrow(null); board.setFlip(rec.me === 'b');
    show('play');
    rvOpen(G, rec);
  }
  function rvOpen(g, rec) {
    rvSeq++;
    board.closePromo(); board.clearSel();
    g.rv = { rec, k: 0, n: g.s.moves.length, s: C.create(g.s.start), hint: null, cache: {}, wait: null, intent: {}, iwait: null };
    coachSetup(); if (coachBox) coachBox.hide();                      // 선생님은 꺼진 채 시작 (🧑‍🏫 로 켜고 끔)
    render(null); drawDock(); sfx('flip');
    requestAnimationFrame(fit);
    Z.toast('🎞️ 복기 · ▶ 로 한 수씩, 🧑‍🏫 선생님을 켜면 추천 수와 실제로 둔 수를 보여 줘요', 3000);
  }
  // 결과 창에서 들어온 복기를 접고 결과 창으로 (친구랑은 여기서 다음 판 준비)
  function exitReview() {
    const g = G; if (!g || !g.rv) return;
    rvSeq++; g.rv = null; board.setArrow(null);
    render(null); drawDock(); coachEnter(); coachTick();
    if (g.mode === 'online') drawViewers();
    if (g.over) showResult();
  }
  function rvGoto(k) {
    const g = G, R = g && g.rv; if (!R) return;
    R.n = g.s.moves.length;
    k = Math.max(0, Math.min(R.n, k | 0));
    if (k === R.k) { rvSync(); return; }
    const fwd = k === R.k + 1;
    if (k > R.k) { for (let i = R.k; i < k; i++) if (C.step(R.s, g.s.moves[i])[0].type === 'illegal') break; }
    else C.undo(R.s, R.k - k);
    R.k = R.s.moves.length; R.hint = null; R.wait = null; rvSeq++;
    const mv = fwd ? R.s.last : null;
    board.clearSel(); render(mv);
    if (mv) { sfx(mv.promotion ? 'promote' : mv.castle ? 'castle' : mv.captured ? 'capture' : 'move'); if (mv.check) setTimeout(() => sfx('check'), 90); } else sfx('tap');
    rvCoach();
  }
  // 세로 화면에서 선생님 창이 열려 있으면 판이 창 아래로 숨지 않게 판을 줄임 (창은 내 이름 줄·기보 줄 위에만). 복기도 대국 중도 같은 길 · 사용자가 옮긴 창이면 그대로
  function rvLayout() {
    requestAnimationFrame(() => {
      const sp = document.querySelector('#play .spring'), R = G && (G.rv || G); if (!sp) return;
      let px = 0;
      if (R && coachOpen() && !matchMedia('(orientation:landscape) and (min-width:600px)').matches) {
        let st = null; try { st = JSON.parse(localStorage.getItem('game.coach.chess') || 'null'); } catch (e) {}
        if (!(st && st.p)) px = R.pad = Math.max(R.pad || 0, Math.ceil(coachBox.el.offsetHeight - $('pBot').offsetHeight - $('moves').offsetHeight - 24));   // 커지기만 (판이 출렁이지 않게)
      } else if (R) R.pad = 0;
      const v = px > 0 ? `${G.rv ? '0 0' : '1 0'} ${px}px` : '';      // 대국 중엔 남는 자리는 그대로 이 칸이 먹음 (단추 줄이 아래에 붙은 채)
      if (sp.style.flex !== v) { sp.style.flex = v; requestAnimationFrame(() => { fit(); coachPlace(); }); }
    });
  }
  function rvSync() {
    rvLayout();
    const R = G && G.rv; if (!R) return;
    $('rvFirst').disabled = $('rvPrev').disabled = R.k <= 0;
    $('rvNext').disabled = $('rvLast').disabled = R.k >= R.n;
    $('rvGo').disabled = !!R.s.over;
    $('rvCoach').setAttribute('aria-pressed', String(coachOpen()));
  }
  function drawRvStat() {
    const R = G.rv, st = $('stat'), k = R.k, m = k ? G.s.hist[k - 1] : null, s = R.s;
    $('lbl').textContent = '🎞️ 복기';
    st.classList.remove('thinking', 'myturn'); $('stage').classList.remove('myturn');
    if (k >= R.n && G.s.over) st.textContent = resultLine();
    else if (!m) st.textContent = `처음 장면 · ${CN[C.turn(s)]} 차례`;
    else { const no = moveNo(k - 1); st.textContent = `${no.n}${no.white ? '.' : '…'} ${CN[m.color]} ${lab(m.san)}${s.chess.inCheck() ? ' · 체크!' : ''}`; }
  }
  // 🧑‍🏫 복기 선생님: 이 장면에서 둘 차례라면? (초록 화살표) + 실제로 둔 수 (파랑 점선). 답이 늦게 오면 그 사이 넘긴 장면은 버림
  function rvCoach() {
    const g = G, R = g && g.rv; if (!R) return;
    rvSync();
    if (!coachOpen()) return;
    const k = R.k, s = R.s, c = C.turn(s), real = g.s.hist[k] || null;
    if (s.over) { R.hint = null; coachBox.set(`<div class="ch-mv">판이 끝난 장면이에요 · ${esc(resultLine())}</div><div class="ch-sub">◀ 로 앞으로 가서 어디서 갈렸는지 봐요</div>`); return; }
    if (R.cache[k]) { rvShow(R.cache[k], real); rvIntent(k); return; }
    if (R.wait && R.wait.k === k && R.wait.id === rvSeq) return;     // 같은 장면을 이미 읽는 중
    const id = ++rvSeq, js = C.toJSON(s); R.wait = { k, id };
    coachBox.set(`<div class="ch-mv">${CN[c]} 차례 · 🤔 생각 중…</div>`);
    clearTimeout(rvT);
    rvT = setTimeout(() => {                                           // ▶ 를 빠르게 여러 번 누르면 멈춘 장면만 읽음 (일꾼에 줄이 쌓이지 않게)
      if (id !== rvSeq || G !== g || g.rv !== R) return;
      COACHW.think(js, { tier: 'hard', hint: true, explain: true, timeMs: 800, seed: 7 + k }).then(res => {
        if (G !== g || g.rv !== R) return;
        const cur = id === rvSeq;
        if (cur) R.wait = null;
        if (!res || !res.move) { if (cur) coachBox.set('선생님이 수를 찾지 못했어요'); return; }
        if (!R.cache[k]) {                                             // 늦게 온 답도 그 장면 몫으로 남겨 둠 (다시 오면 바로)
          const line = C.sanLine(cur ? s : C.fromJSON(js), res.pv && res.pv.length ? res.pv : [res.move], 4);
          R.cache[k] = { move: res.move, from: res.move.slice(0, 2), to: res.move.slice(2, 4), san: line[0] || res.move, line, score: res.score, mate: res.mate, why: res.why, c };
        }
        if (cur && coachOpen()) { rvShow(R.cache[k], real); sfx('hint'); rvIntent(k); }
      }).catch(() => { if (id === rvSeq && G === g && g.rv === R) { R.wait = null; coachBox.set('선생님이 잠깐 쉬어요. 다시 켜 보세요'); } });
    }, 220);
  }
  function rvShow(r, real) {
    const R = G.rv, same = !!real && real.uci === r.move, I = real ? R.intent[R.k] : null;
    R.hint = { k: R.k, from: r.from, to: r.to, real: real && !same ? [real.from, real.to] : null, threat: I && I.threat ? [I.threat.from, I.threat.to] : null };
    const lossTxt = I && !same && I.loss >= 50 ? ` <span class="ch-loss">(${I.loss >= 900 ? '메이트 차이' : pawnFmt(-I.loss)})</span>` : '';
    const realHtml = real ? `🔵 실제로 둔 수: <b>${esc(lab(real.san))}</b>${same ? ' · 👑 추천과 같아요' : lossTxt}`
      : `🏁 실제로는 여기서 끝났어요${G.s.reason ? ` (${esc(C.REASON[G.s.reason] || '')})` : ''}`;
    coachBox.set(`<div class="ch-mv">🟢 추천: <b>${esc(lab(r.san))}</b> ${r.why ? esc(r.why.text) : ''}</div><div class="ch-real">${realHtml}</div>
      ${real ? `<div class="ch-int">${I ? intentHtml(I) : '🤔 노린 것: 생각 중…'}</div>` : ''}
      <div class="ch-sub">${CN[r.c]} 차례 · ${esc(evalLine(r, r.c))}</div>`);
    render(null); rvLayout();
  }
  // 🤔 실제로 둔 수가 노린 것: 그 수 자체(잡기·포크·핀·지키기·교환·캐슬링·전진 …) + 한 번 더 둔다면 무엇을 하려 했나(주황 화살표)
  const TACTIC = new Set(['mate', 'mateIn', 'promote', 'fork', 'win', 'pin', 'check', 'threat']);
  function rvLoss(r, it) {                                             // 추천 대비 손해 (둔 쪽 기준 cp) · 메이트를 놓치거나 내준 차이는 999
    if (r.mate > 0 && !(it.mate > 0)) return 999;
    if (it.mate < 0 && !(r.mate < 0)) return 999;
    if (Math.abs(r.score) > 20000 && Math.abs(it.score) > 20000) return 0;
    return Math.max(0, r.score - it.score);
  }
  function intentHtml(I) {
    let h = `🤔 노린 것: ${esc(I.text)}`;
    if (I.threat) h += ` → 🟠 다음 <b>${esc(lab(I.threat.san))}</b>: ${esc(I.threat.text)}`;
    if (I.loss >= 150) h += ' · 추천보다 많이 손해라 노림수보다는 실수였을 수 있어요';
    return h;
  }
  function rvIntent(k) {
    const g = G, R = g && g.rv, real = R && g.s.hist[k], r = R && R.cache[k];
    if (!real || !r || R.intent[k] || (R.iwait && R.iwait.k === k && R.iwait.seq === rvSeq)) return;
    const seq = rvSeq, js = { start: g.s.start, moves: g.s.moves.slice(0, k) };
    R.iwait = { k, seq };
    COACHW.intent(js, real.uci, { timeMs: 450 }).then(it => {
      if (G !== g || g.rv !== R) return;
      if (R.iwait && R.iwait.k === k) R.iwait = null;
      if (!it || it.error || R.intent[k]) return;
      const w = it.why, th = it.threat;
      let threat = null;
      if (th && th.move && (th.mate > 0 || (th.why && TACTIC.has(th.why.kind) && th.score - it.score >= 100))) {   // 뚜렷한 노림만 (그저 자리 좋은 수는 말하지 않음)
        let san = th.move; try { san = C.sanLine(C.create(th.fen), [th.move], 1)[0] || th.move; } catch (e) {}
        threat = { from: th.move.slice(0, 2), to: th.move.slice(2, 4), san, text: th.mate > 0 || (th.why && th.why.kind === 'mate') ? '메이트 위협' : th.why.text };
      }
      const I = R.intent[k] = { text: !w || w.kind === 'quiet' || w.kind === 'hold' ? '자리 잡기(다음 수 준비)' : w.text, threat, loss: real.uci === r.move ? 0 : rvLoss(r, it), score: it.score, mate: it.mate };
      noteMistake(g, R, k, r, real, I);
      if (rvSeq === seq && R.k === k && coachOpen()) rvShow(r, real);
    }).catch(() => { if (R.iwait && R.iwait.k === k) R.iwait = null; });
  }
  // 📒 아쉬운 장면: 내가 둔 수가 추천보다 많이 손해면 공용 노트(common/mistakes.js)에 (같은 판·장면은 하나로)
  const MIST_CP = 150;
  function noteMistake(g, R, k, r, real, I) {
    const rec = R.rec;
    if (!window.Mistakes || rec.unsaved || !rec.me || real.color !== rec.me || I.loss < MIST_CP) return;
    const no = moveNo(k);
    try {
      Mistakes.add({ game: 'chess', title: `체스 · ${rec.title || ''}`, scene: `${no.n}수 · ${CN[real.color]} 차례`, my: lab(real.san), best: lab(r.san),
        why: mistakeWhy(r, I.text), sev: mistakeSev(I.loss), lossText: mistakeLoss(I.loss), drill: { rec: recLite(rec), k, best: r.move, bestScore: r.score, bestMate: r.mate } });
    } catch (e) {}
  }
  const mistakeWhy = (r, mine) => `${mine ? `내 수: ${mine} · ` : ''}추천 ${lab(r.san)}: ${r.why ? r.why.text : '더 좋은 수예요'}`.slice(0, 150);
  const mistakeSev = loss => loss >= 900 ? 100 : Math.min(100, Math.round(loss / 6));
  const mistakeLoss = loss => loss >= 900 ? '메이트 차이' : `평가 ${pawnFmt(-loss)}`;
  // 판이 끝나면(AI 대전) 내 수를 따로 일꾼으로 짧게 훑어 손해가 큰 1~3개를 노트에 (복기를 안 열어도)
  let SCANW = null;
  async function scanGame(g) {
    if (!window.Mistakes || typeof Worker === 'undefined' || g.mode !== 'ai' || g.practice || !g.recAt || !g.me) return;
    const rec = records().find(r => r.at === g.recAt); if (!rec) return;
    const W = SCANW || (SCANW = makeWorker()), start = rec.start, mv = rec.moves, found = [];
    const s = C.create(start), colorAt = [];
    for (const u of mv) { colorAt.push(C.turn(s)); if (C.step(s, u)[0].type === 'illegal') return; }
    try {
      for (let i = 0; i < mv.length; i++) {
        if (colorAt[i] !== g.me) continue;
        const r = await W.think({ start, moves: mv.slice(0, i) }, { tier: 'hard', hint: true, timeMs: 150, seed: 11 });
        if (!r || !r.move || r.move === mv[i]) continue;
        const a = await W.think({ start, moves: mv.slice(0, i + 1) }, { tier: 'hard', hint: true, timeMs: 150, seed: 13 });
        let my;
        if (a && a.move) my = { score: -a.score, mate: -(a.mate || 0) };
        else { const t2 = C.fromJSON({ start, moves: mv.slice(0, i + 1) }), win = t2.over && t2.winner === g.me; my = { score: win ? 29999 : 0, mate: win ? 1 : 0 }; }   // 이 수로 끝남 (메이트 · 비김)
        const loss = rvLoss(r, my);
        if (loss >= 200) found.push({ i, loss });                        // 짧게 읽은 값이라 복기 선생님(150)보다 조금 높게
      }
      found.sort((a, b) => b.loss - a.loss);
      for (const f of found.slice(0, 3)) {
        const js = { start, moves: mv.slice(0, f.i) };
        const r = await W.think(js, { tier: 'hard', hint: true, explain: true, timeMs: 300, seed: 7 + f.i });
        if (!r || !r.move) continue;
        const san = C.sanLine(C.fromJSON(js), [r.move], 1)[0] || r.move, real = s.hist[f.i], no = moveNo(f.i, start);
        Mistakes.add({ game: 'chess', title: `체스 · ${rec.title || ''}`, scene: `${no.n}수 · ${CN[real.color]} 차례`, my: lab(real.san), best: lab(san),
          why: mistakeWhy({ san, why: r.why }, ''), sev: mistakeSev(f.loss), lossText: mistakeLoss(f.loss), drill: { rec: recLite(rec), k: f.i, best: r.move, bestScore: r.score, bestMate: r.mate } });
      }
    } catch (e) {}
    W.kill();
    if (!G) drawMenu();
  }
  const recLite = rec => ({ at: rec.at, start: rec.start, moves: rec.moves, names: rec.names, title: rec.title, mode: rec.mode, me: rec.me, tier: rec.tier });
  // 📒 노트에서 '이 장면부터' (?drill=id): 그 판 그 장면부터 연습 판 (내가 그때 둔 쪽, 선생님 켠 채)
  function startDrill(m) {
    const d = m.drill || {}, rec = d.rec || {}, k = d.k | 0;
    let s = null; try { s = C.fromJSON({ start: rec.start, moves: (rec.moves || []).slice(0, k) }); } catch (e) { s = null; }
    if (!s || s.moves.length !== k || s.over) { Z.toast('그 장면을 열지 못했어요'); return; }
    const tier = rec.mode === 'ai' && TIERS[rec.tier] ? rec.tier : pref.tier;
    newGame({ mode: 'ai', tier, color: C.turn(s), clock: 0, from: { start: rec.start, moves: s.moves.slice() }, practice: true,
      drill: { id: m.id, k, best: d.best, bestScore: d.bestScore, bestMate: d.bestMate || 0 } });
  }
  // 그 장면에서 둔 첫 수가 추천이거나 거의 같은 값이면 노트에 ✅
  function drillCheck(g, mv) {
    const d = g.drill; d.done = true;
    const ok = () => { try { if (window.Mistakes) Mistakes.solved(d.id); } catch (e) {} Z.toast('✅ 이번엔 좋은 수예요! 📒 노트에 해냈다고 적었어요', 2800); };
    if (mv.uci === d.best || (g.s.over && g.s.winner === mv.color)) { ok(); return; }
    if (d.bestScore == null) return;
    COACHW.think({ start: g.s.start, moves: g.s.moves.slice(0, d.k + 1) }, { tier: 'hard', hint: true, timeMs: 500, seed: 3 }).then(res => {
      if (!res || !res.move) return;
      const loss = rvLoss({ score: d.bestScore, mate: d.bestMate || 0 }, { score: -res.score, mate: -(res.mate || 0) });
      if (loss <= 60) ok(); else if (G === g) Z.toast(`🙂 이번 수도 추천보다는 아쉬워요 (${loss >= 900 ? '메이트 차이' : pawnFmt(-loss)}) · 🧑‍🏫 선생님 줄을 봐요`, 2600);
    }).catch(() => {});
  }
  $('rvFirst').onclick = () => rvGoto(0);
  $('rvPrev').onclick = () => { if (G && G.rv) rvGoto(G.rv.k - 1); };
  $('rvNext').onclick = () => { if (G && G.rv) rvGoto(G.rv.k + 1); };
  $('rvLast').onclick = () => { if (G && G.rv) rvGoto(G.rv.n); };
  $('rvCoach').onclick = () => {
    if (!G || !G.rv) return;
    coachSetup(); if (!coachBox) { Z.toast('선생님을 불러오지 못했어요'); return; }
    if (coachOpen()) { sfx('tap'); coachBox.hide(); } else { sfx('hint'); coachBox.show(); coachBox.collapse(false); }
  };
  // 🎮 여기서부터 내가 두기: 같은 판 이 장면부터, 다른 쪽은 AI (AI 대전 기록이면 그때 그 AI · 아니면 메뉴에서 고른 난이도), 선생님 켠 채, 전적엔 안 넣음
  $('rvGo').onclick = () => {
    const g = G, R = g && g.rv; if (!R) return;
    if (R.s.over) { Z.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요'); return; }
    sfx('tap');
    const rec = R.rec, from = { start: g.s.start, moves: g.s.moves.slice(0, R.k) }, tc = C.turn(R.s);
    const tier = rec.mode === 'ai' && TIERS[rec.tier] ? rec.tier : pref.tier;
    const go = me => { closeModals(); leaveRoom(); newGame({ mode: 'ai', tier, color: me, clock: 0, from, practice: true }); };
    if (rec.mode === 'ai' && CN[rec.me] && !ON) { go(rec.me); return; }
    modal({ title: '🎮 어느 쪽을 둘까요?', dismiss: true,
      html: `<p class="sub">고른 쪽은 내가, 다른 쪽은 ${tierLabel(tier)} AI가 이어서 둬요 · 지금은 ${CN[tc]} 차례${ON ? '<br>🚪 친구 방에서는 나가요' : ''}</p>`,
      buttons: [{ label: '⚪ 백', primary: tc === 'w', onClick: () => go('w') }, { label: '⚫ 흑', primary: tc === 'b', onClick: () => go('b') }, { label: '취소', ghost: true }] });
  };
  addEventListener('keydown', e => {
    if (!G || !G.rv || $('play').hidden || document.querySelector('.overlay') || e.altKey || e.ctrlKey || e.metaKey) return;
    const R = G.rv, k = e.key;
    if (k === 'ArrowLeft') rvGoto(R.k - 1); else if (k === 'ArrowRight') rvGoto(R.k + 1);
    else if (k === 'Home') rvGoto(0); else if (k === 'End') rvGoto(R.n); else return;
    e.preventDefault();
  });

  // ════════ 친구랑: 방 최대 16명 — 2명이 두고 나머지는 실시간 구경 ════════
  // 방장이 판의 주인: 손님 수는 방장에게 보내고, 방장이 확인해 모두에게 (수 번호 n 으로 순서 맞춤). 늦게 온 사람은 'hello' → 방장이 판 전체(sync)
  let ON = null, leaving = false;
  let TT = { key: '', t: 0, end: 0, left: null };   // ⏱ 내 차례 30초 (친구랑)
  const TURN_SEC = 30;
  const buzz = ms => { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; Z.vibrate(ms); };   // 한 번도 안 누른 화면은 브라우저가 막고 오류를 남김
  const nmOf = u => (ON && ON.names[u]) || '친구';
  function noteNames(p) { if (!ON) return; for (const u in p || {}) if (p[u] && p[u].name) ON.names[u] = p[u].name; }
  const colorOf = (seats, uid) => !seats || !uid ? null : seats.w === uid ? 'w' : seats.b === uid ? 'b' : null;
  function order(players, hostUid) {
    const pl = players || {};
    return Object.keys(pl).filter(u => !(pl[u] && pl[u].watch)).sort((a, b) => (b === hostUid) - (a === hostUid) || ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
  }
  function firstSeats(players, hostUid, hostColor) {
    const o = order(players, hostUid), mate = o.find(u => u !== hostUid) || '';
    const hc = hostColor === 'b' ? 'b' : hostColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : 'w';
    return hc === 'w' ? { w: hostUid, b: mate } : { w: mate, b: hostUid };
  }
  function onlinePlayers(seats, me) { return { w: { kind: me === 'w' ? 'human' : 'remote', name: '' }, b: { kind: me === 'b' ? 'human' : 'remote', name: '' } }; }
  const cfgLabel = c => `방장 ${c && c.hostColor === 'b' ? '흑' : c && c.hostColor === 'r' ? '랜덤' : '백'}${c && c.clock ? ` · ⏱ ${c.clock}분` : ''}${c && c.coach ? ' · AI 선생님' : ''}`;
  function friendOpts() {
    return {
      game: 'chess', title: '체스', max: 16, min: 2, coach: true,
      describe: n => n < 2 ? '친구가 한 명 더 들어오면 시작할 수 있어요' : n === 2 ? '2명이면 1:1 대국' : `${n}명이면 2명이 두고 ${n - 2}명은 구경해요 (다음 판엔 방장이 고른 구경꾼이 빈자리에)`,
      settings: {
        defaults: { hostColor: 'w', clock: 0 },
        label: cfgLabel,
        render(el, c, canEdit, update) {
          if (!canEdit) { el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(cfgLabel(c))}</p>`; return; }
          el.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
            <div class="optrow"><span class="small">방장 색</span><div class="seg" id="fColSeg"></div></div>
            <div class="optrow"><span class="small">시계</span><div class="seg" id="fClkSeg"></div></div>
            <p class="arn-soft" style="text-align:center">먼저 온 2명이 두고 나머지는 구경해요</p></div>`;
          seg(el.querySelector('#fColSeg'), [['w', '⚪ 백'], ['b', '⚫ 흑'], ['r', '🎲 랜덤']], (c && c.hostColor) || 'w', v => update({ hostColor: v }));
          seg(el.querySelector('#fClkSeg'), [[0, '없음'], [5, '5분'], [10, '10분']], (c && c.clock) || 0, v => update({ clock: +v }));
        },
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => leaveOnlineGame(),
      onLeave: () => { if (leaving) return; endOnline(); if (G && G.mode === 'online') goMenu(); },
    };
  }
  function openFriend() { if (!window.ArenaUI) return Z.toast('온라인 모듈을 불러오지 못했어요'); ArenaUI.open(friendOpts()); }
  function endOnline() {
    if (!ON) return;
    ON.offs.forEach(f => { try { f(); } catch (e) {} });
    for (const k in ON.goneT) clearTimeout(ON.goneT[k]);
    if (ON.goneAsk) { try { ON.goneAsk(); } catch (e) {} }
    turnStop(); ON = null;
  }
  function startOnline({ net, role, cfg, players }) {
    endOnline();
    const c = cfg || {};
    const hostUid = (net.meta && net.meta.host) || (role === 'host' ? net.uid : '');
    ON = { net, host: role === 'host', hostUid, uid: net.uid, cfg: c, names: {}, offs: [], coach: !!c.coach, syncAt: 0,
      score: {}, scoreRound: 0, sub: {}, ready: { round: 0, set: new Set(), pick: {} }, goneT: {}, goneAsk: null, myReady: 0 };
    noteNames(players || net.players);
    startRound(firstSeats(players || net.players, hostUid, ON.host ? c.hostColor : (c.hostColor === 'b' ? 'b' : 'w')), 1, !ON.host);   // 손님은 방장 판(sync)을 받을 때까지 조용히
    if (ON.host) {
      ON.offs.push(net.on('msg', (from, m) => onHostMsg(from, m)));
      ON.offs.push(net.on('leave', uid => hostLeft(uid)));
      ON.offs.push(net.on('join', uid => hostJoined(uid)));
      broadcastSync();
    } else { ON.offs.push(net.on('msg', m => onGuestMsg(m))); askSync(true); }
    ON.offs.push(net.on('players', p => { noteNames(p); drawBars(); drawReady(); }));
  }
  function startRound(seats, round, quiet) {
    newGame({ mode: 'online', seats, round, uid: ON.uid, clock: (ON.cfg && ON.cfg.clock) || 0, quiet: !!quiet });
    applyOnlineUI(); drawViewers();
  }
  // 방 안의 것들 (점수 · AI 가 대신 앉은 사람 · 한 판 더 준비): 방장이 정하고 모두에게
  const readyOf = r => { if (ON.ready.round !== r) ON.ready = { round: r, set: new Set(), pick: {} }; return ON.ready; };
  const roomPart = () => { const R = readyOf(G.round); return { score: ON.score, sr: ON.scoreRound, sub: Object.keys(ON.sub).filter(u => ON.sub[u]), ready: [...R.set], pick: R.pick, round: G.round }; };
  const syncMsg = () => ({ t: 'sync', round: G.round, seats: G.seats, start: G.s.start, moves: G.s.moves.slice(), over: G.s.over ? { winner: G.s.winner, reason: G.s.reason } : null,
    clock: G.clock ? { w: Math.round(G.clock.w), b: Math.round(G.clock.b) } : null, names: ON.names, cfg: ON.cfg, room: roomPart() });
  function broadcastSync() { if (ON && ON.host && G && G.mode === 'online') ON.net.broadcast(syncMsg(), true); }
  function broadcastRoom() {
    if (ON && ON.host && G && G.mode === 'online') ON.net.broadcast(Object.assign({ t: 'room' }, roomPart()), true);
    drawBars(); drawReady();
  }
  function applyRoom(r) {
    if (!r || !ON || ON.host) return;
    if ((r.sr || 0) >= ON.scoreRound) { ON.score = r.score || {}; ON.scoreRound = r.sr || 0; }
    ON.sub = {}; (r.sub || []).forEach(u => { ON.sub[u] = true; });
    if (G && r.round === G.round) ON.ready = { round: r.round, set: new Set(r.ready || []), pick: r.pick || {} };
    drawBars(); drawReady();
  }
  // 방장: 판이 끝나면 이긴 사람 +1승 · 진 사람 +1패 (사람 기준, 색이 바뀌어도 이어짐)
  function countScore(g) {
    if (!ON || !ON.host || ON.scoreRound >= g.round) return;
    const w = g.s.winner; ON.scoreRound = g.round;
    for (const c of ['w', 'b']) { const u = g.seats[c]; if (!u) continue; const r = ON.score[u] = ON.score[u] || { w: 0, l: 0, d: 0 }; if (!w) r.d++; else if (w === c) r.w++; else r.l++; }
    broadcastRoom();
  }
  function askSync(force) {
    if (!ON || ON.host) return;
    const t = Date.now(); if (!force && t - ON.syncAt < 800) return;
    ON.syncAt = t; ON.net.send({ t: 'hello' }, true);
  }
  function onHostMsg(from, m) {
    if (!m || !ON || !G || G.mode !== 'online') return;
    if (m.t === 'hello') { ON.net.send(from, syncMsg(), true); return; }
    const col = colorOf(G.seats, from);
    if (m.t === 'ready' || m.t === 'again') {                           // 한 판 더: 준비 (구경꾼이 보내면 '끼고 싶어요')
      if (!G.over) return;
      const R = readyOf(G.round); R.set.add(from);
      if (!col) R.pick[from] = true;
      broadcastRoom(); return;
    }
    const back = () => ON.net.send(from, syncMsg(), true);              // 어긋났으면 그 사람에게 지금 판을 다시
    if (m.round !== G.round || G.over) { back(); return; }
    if (m.t === 'resign') { if (col) act({ resign: col }, { from: 'remote' }); return; }
    if (m.t !== 'move') return;
    if (m.n !== G.s.moves.length || col !== C.turn(G.s)) { back(); return; }
    if (!act(m.u, { from: 'remote' })) back();
  }
  function onGuestMsg(m) {
    if (!m || !ON) return;
    if (m.t === 'sync') { applySync(m); return; }
    if (m.t === 'room') { applyRoom(m); return; }
    if (!G || G.mode !== 'online') return;
    if (m.round !== G.round) { askSync(); return; }
    const setClock = () => { if (G.clock && typeof m.cw === 'number') { G.clock.w = m.cw; G.clock.b = m.cb; G.clock.at = performance.now(); drawClocks(); } };
    if (m.t === 'end') { if (!G.over) applyEnd(m); setClock(); return; }
    if (m.t !== 'move') return;
    const n = G.s.moves.length;
    if (m.n === n) { if (!act(m.u, { from: 'remote' })) askSync(); }
    else if (m.n < n) { if (G.s.moves[m.n] !== m.u) askSync(); }     // 내가 이미 둔 수 (방장 확인)
    else askSync();                                                    // 빠진 수가 있음
    setClock();
  }
  function applyEnd(e) {
    if (!G || G.over) return;
    if (e.reason === 'time') act({ timeout: C.turn(G.s) }, { from: 'remote' });
    else if (e.reason === 'resign') act({ resign: e.winner ? other(e.winner) : C.turn(G.s) }, { from: 'remote' });
  }
  function applySync(m) {
    if (m.names) Object.assign(ON.names, m.names);
    if (m.cfg) { ON.cfg = Object.assign({}, ON.cfg, m.cfg); ON.coach = !!ON.cfg.coach; }
    const fresh = !G || G.mode !== 'online' || G.round !== m.round;
    if (fresh) startRound(m.seats, m.round, true);
    const g = G;
    g.seats = m.seats; const meWas = g.me; g.me = colorOf(m.seats, ON.uid); g.players = onlinePlayers(m.seats, g.me);
    if (m.room) applyRoom(m.room);
    if (meWas !== g.me || fresh) board.setFlip(g.me === 'b');
    if (fresh || !ON.synced) { ON.synced = true; Z.toast(!g.me ? '👀 구경 중이에요. 다음 판에 빈자리가 나면 앉을 수 있어요' : g.me === 'w' ? '⚪ 내가 백이에요. 먼저 둬요!' : '⚫ 내가 흑이에요. 친구가 먼저 둬요', 2000); }
    const cur = g.s.moves, nx = m.moves || [];
    if (!g.over && g.s.start === m.start && cur.length <= nx.length && cur.every((u, i) => u === nx[i])) {
      for (let i = cur.length; i < nx.length && G === g && !g.over; i++) act(nx[i], { from: 'remote' });   // 앞부분이 같으면 이어서 (소리·움직임 그대로)
    } else if (g.s.start !== m.start || cur.join(' ') !== nx.join(' ')) {
      const s = C.create(m.start); for (const u of nx) C.step(s, u);   // 크게 어긋나면 통째로
      g.s = s; g.over = false; g.coachRes = null; g.review = null; render(null);
      if (s.over) finish();
    }
    if (m.over && G === g && !g.over) applyEnd(m.over);
    if (m.clock && g.clock) { g.clock.w = m.clock.w; g.clock.b = m.clock.b; g.clock.at = performance.now(); }
    applyOnlineUI(); drawBars(); drawStat(); drawViewers(); coachEnter();
    if (G === g && !g.over) advance();
    turnSync();
  }
  // ── 방장: 두던 사람이 나가면 5초 기다렸다가 물음 (AI 가 대신 · 처음부터 · 기다리기). 돌아오면 그 자리로
  function hostLeft(uid) {
    if (!ON || !ON.host || !G || G.mode !== 'online') return;
    drawBars(); drawReady();
    if (!colorOf(G.seats, uid) || ON.sub[uid]) return;
    Z.toast(`${nmOf(uid)}님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    const on = ON;
    clearTimeout(on.goneT[uid]);
    on.goneT[uid] = setTimeout(() => { if (ON !== on || !G || (on.net.players || {})[uid] || on.sub[uid] || !colorOf(G.seats, uid)) return; askGone(uid); }, 5000);
  }
  function hostJoined(uid) {
    if (!ON || !ON.host || !G || G.mode !== 'online') return;
    clearTimeout(ON.goneT[uid]);
    if (ON.goneAsk && ON.goneFor === uid) { try { ON.goneAsk(); } catch (e) {} }
    if (ON.sub[uid]) {
      delete ON.sub[uid];
      Z.toast(`${nmOf(uid)}님이 돌아왔어요. 다시 직접 둬요`, 2400);
      try { ON.net.chat(`🙌 ${nmOf(uid)}님이 돌아와서 직접 둬요`); } catch (e) {}
      broadcastRoom();
    }
    drawBars(); drawReady();
  }
  function askGone(uid) {
    if (!ON || !G || G.over || ON.goneAsk || !colorOf(G.seats, uid)) return;
    const on = ON;
    const close = modal({
      title: `🔌 ${nmOf(uid)}님이 나갔어요`,
      html: `<p class="sub">어떻게 할까요? AI(🐱 중급)가 대신 두거나, 대기실로 돌아가 처음부터 다시 할 수 있어요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.</p>`,
      buttons: [{ label: '🤖 AI가 대신 둬요', primary: true, onClick: () => subAI(uid) },
        { label: '🔄 처음부터 다시 (대기실로)', onClick: () => { try { on.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} if (window.ArenaUI) ArenaUI.toLobby(); } },
        { label: '⏳ 기다릴게요' }],
      onClose: () => { if (on.goneAsk === close) { on.goneAsk = null; on.goneFor = null; } },
    });
    on.goneAsk = close; on.goneFor = uid;
  }
  function subAI(uid) {
    if (!ON || !ON.host || !G) return;
    ON.sub[uid] = true; clearTimeout(ON.goneT[uid]);
    try { ON.net.chat(`🤖 ${nmOf(uid)}님 자리는 AI가 대신 둬요 (돌아오면 다시 직접)`); } catch (e) {}
    broadcastRoom(); advance();
  }
  // 방장: 자리 주인이 없어 AI 가 대신 두는 차례면 둠 (🐱 중급)
  function subTurn() {
    if (!ON || !ON.host || !G || G.mode !== 'online' || G.over || G.subBusy) return;
    const u = G.seats[C.turn(G.s)];
    if (!u || !ON.sub[u]) return;
    const g = G, n = g.s.moves.length, t0 = performance.now(); g.subBusy = true;
    AIW.think(C.toJSON(g.s), { tier: 'normal', seed: (Math.random() * 1e9) | 0 }).catch(() => null).then(res => {
      setTimeout(() => {
        g.subBusy = false;
        if (G !== g || g.over || g.s.moves.length !== n || !ON || !ON.sub[u]) return;
        if (!(res && res.move && act(res.move, { from: 'remote' }))) { const L = C.legal(g.s); if (L.length) act(L[0].uci, { from: 'remote' }); }
      }, Math.max(0, 700 - (performance.now() - t0)));
    });
  }
  // ⏱ 내 차례 30초: 지나면 🐱 중급 AI 가 대신 둠 (10초 남으면 알림). 차례가 바뀔 때마다 새로 셈
  function turnStop() { clearInterval(TT.t); TT = { key: '', t: 0, end: 0, left: null }; }
  function turnSync() {
    const on = !!(G && G.mode === 'online' && ON && !G.over && humanTurn());
    const key = on ? G.round + ':' + G.s.moves.length : '';
    if (key === TT.key) return;
    turnStop(); TT.key = key;
    if (!on) { drawStat(); return; }
    const g = G;
    TT.end = Date.now() + TURN_SEC * 1000; TT.left = TURN_SEC;
    sfx('pop'); buzz(40);
    TT.t = setInterval(() => {
      if (G !== g || g.over || !humanTurn() || TT.key !== g.round + ':' + g.s.moves.length) { turnSync(); return; }
      const left = Math.max(0, Math.ceil((TT.end - Date.now()) / 1000));
      if (left !== TT.left) { TT.left = left; if (left === 10) { Z.toast('⏱ 10초 남았어요', 1500); buzz(30); } drawStat(); }
      if (left <= 0) { clearInterval(TT.t); TT.t = 0; turnTimeout(g, key); }
    }, 250);
    drawStat();
  }
  async function turnTimeout(g, key) {
    Z.toast('⏱ 30초가 지나서 AI가 대신 뒀어요', 2200);
    board.closePromo(); board.clearSel();
    let mv = '';
    try { const res = await AIW.think(C.toJSON(g.s), { tier: 'normal', seed: (Math.random() * 1e9) | 0 }); mv = res && res.move; } catch (e) {}
    if (G !== g || g.over || g.round + ':' + g.s.moves.length !== key) return;   // 그 사이 직접 뒀으면 그대로
    if (!mv || !act(mv)) { const L = C.legal(g.s); if (L.length) act(L[0].uci); }
  }
  // 방장: 다음 판 — 색 바꾸고, 남은 사람(AI 가 대신 앉은 사람 포함)은 그대로, 빈자리는 방장이 고른 구경꾼
  function hostAgain() {
    if (!ON || !ON.host || !G) return;
    const pl = ON.net.players || {}, o = order(pl, ON.hostUid), pick = readyOf(G.round).pick;
    let seats = { w: G.seats.b, b: G.seats.w };
    for (const c of ['w', 'b']) if (!seats[c] || !(pl[seats[c]] || ON.sub[seats[c]])) seats[c] = '';
    for (const c of ['w', 'b']) if (!seats[c]) { const u = o.find(x => x !== seats.w && x !== seats.b && pick[x]); if (u) seats[c] = u; }
    if (!seats.w || !seats.b) { Z.toast('같이 둘 친구가 없어요. 대기실에서 기다려요', 2200); if (window.ArenaUI) ArenaUI.toLobby(); return; }
    startRound(seats, G.round + 1);
    broadcastSync();
  }
  function leaveOnlineGame() { endOnline(); stopAll(); closeModals(); coachHide(); G = null; $('viewbar').hidden = true; show('menu'); drawMenu(); popHist(); }
  function applyOnlineUI() {
    if (!G || G.mode !== 'online') return;
    $('specPill').hidden = !!G.me;
    drawDock();
  }
  // 점수판 한 줄 (구경 중 배지 · 양쪽 이름 · 이 방 전적 · 지금 차례는 금색 · 구경 인원)
  function drawViewers() {
    const el = $('viewbar');
    if (!G || G.mode !== 'online' || !ON) { el.hidden = true; $('specPill').hidden = true; return; }
    const pl = ON.net.players || {}, t = G.over ? '' : C.turn(G.s);
    const chips = ['w', 'b'].map(c => {
      const u = G.seats[c], nm = u ? (u === ON.uid ? '나' : nmOf(u)) + (ON.sub[u] ? '🤖' : !pl[u] ? '🔌' : '') : '빈자리';
      const r = ON.score[u] || { w: 0, l: 0, d: 0 };
      return `<span class="rbi${t === c ? ' on' : ''}"><i class="kp ${c}"></i><b>${esc(nm)}</b> ${r.w}승${r.l}패${r.d ? r.d + '무' : ''}</span>`;
    });
    const v = order(pl, ON.hostUid).filter(u => !colorOf(G.seats, u));
    el.hidden = false;
    el.innerHTML = (G.me ? '' : '<b class="vbadge">👀 구경 중</b>') + chips.join('') + (v.length ? `<span class="rbi" title="${esc(v.map(nmOf).join(', '))}">👀 구경 ${v.length}명</span>` : '');
  }
  // 결과 창 '한 판 더' 칸: 앉은 사람 준비 상태 · 구경꾼 신청 (손님은 ✋ 준비만, 시작은 방장이 — 혼자 다시 시작하는 사람 없음)
  function drawReady() {
    const box = document.getElementById('rdyBox');
    if (!box || !box.isConnected || !G || G.mode !== 'online' || !ON || !G.over) return;
    const host = ON.host, pl = ON.net.players || {}, R = readyOf(G.round);
    const seated = ['w', 'b'].map(c => G.seats[c]).filter(Boolean);
    const rows = seated.map(u => {
      if (u === ON.hostUid) return `<span class="ok">👑 ${esc(nmOf(u))}</span>`;
      const gone = !pl[u], sub = !!ON.sub[u], ok = (R.set.has(u) && !gone) || sub;
      return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(nmOf(u))}${sub ? ' (AI)' : ''}${host && gone && !sub ? ` <button type="button" data-ai="${esc(u)}">🤖 AI</button>` : ''}</span>`;
    });
    const watchers = order(pl, ON.hostUid).filter(u => !colorOf(G.seats, u));
    const free = ['w', 'b'].filter(c => !(G.seats[c] && (pl[G.seats[c]] || ON.sub[G.seats[c]]))).length;
    const wl = watchers.map(u => host
      ? `<label><input type="checkbox" data-join="${esc(u)}" ${R.pick[u] ? 'checked' : ''}${free ? '' : ' disabled'}> ${esc(nmOf(u))}${R.set.has(u) ? ' ✋' : ''}</label>`
      : `<span>${esc(nmOf(u))}${R.set.has(u) ? ' ✋' : ''}</span>`).join('');
    let act = '';
    if (host) {
      const need = seated.filter(u => u !== ON.hostUid && !ON.sub[u]), k = need.filter(u => R.set.has(u) && pl[u]).length, all = k === need.length;
      act = `<button type="button" class="btn primary" data-start${all ? '' : ' disabled'}>${all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${need.length})`}</button>${all ? '' : '<button type="button" class="btn" data-force>안 기다리고 시작</button>'}`;
    } else {
      const on = ON.myReady === G.round;
      act = `<button type="button" class="btn primary" data-ready${on ? ' disabled' : ''}>${on ? (G.me ? '✅ 준비 완료 · 방장을 기다려요' : '✅ 신청했어요 · 방장이 정해요') : G.me ? '✋ 준비' : '✋ 다음 판에 낄래요'}</button>`;
    }
    box.innerHTML = `<div class="rdy-row">${rows.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? (free ? ` · 체크하면 다음 판에 같이 (${free}자리)` : ' · 자리가 다 찼어요') : ''}: ${wl}</div>` : ''}<div class="rdy-act">${act}</div>`;
  }
  function wireReady(box) {
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b || !ON || !G) return;
      if (b.hasAttribute('data-ready')) { ON.myReady = G.round; ON.net.send({ t: 'ready', round: G.round }, true); sfx('tap'); drawReady(); }
      else if (b.hasAttribute('data-start') || b.hasAttribute('data-force')) { sfx('tap'); hostAgain(); }
      else if (b.dataset.ai) subAI(b.dataset.ai);
    };
    box.onchange = e => { const c = e.target.closest('input[data-join]'); if (c && ON && ON.host) { readyOf(G.round).pick[c.dataset.join] = c.checked; broadcastRoom(); } };
  }

  addEventListener('visibilitychange', () => { if (G && G.clock) G.clock.at = performance.now(); });
  drawMenu(); drawSnd();
  $('mstBtn').onclick = () => { sfx('tap'); if (window.Mistakes) Mistakes.open({ game: 'chess' }); };
  if (window.Mistakes && Mistakes.onChange) Mistakes.onChange(() => { if (!G) drawMenu(); });
  const DRILL = window.Mistakes ? Mistakes.fromUrl('chess') : null;     // 📒 노트에서 왔으면 그 장면부터
  if (DRILL && DRILL.drill && DRILL.drill.rec) startDrill(DRILL);
  else if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
  // 시험용 엿보기 (?debug 일 때만)
  if (/[?&]debug\b/.test(location.search)) window.__chess = { get G() { return G; }, act, C, board, coachTick, rvGoto, startReview, openRecords, newGame };
})();

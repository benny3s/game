/* 오목 — 메뉴 · 대국 흐름 · 입력(터치 미리 보기 / 마우스 / 방향키) · AI 워커 · 복기 · 기록
   누가 어느 색을 두는지는 G.players[색] = { kind: 'human' } | { kind: 'ai', tier } 로 갈아 끼움 (나중에 'remote' 추가).
   모든 수는 act(행동) 한 길로 들어가 코어 Omok.step() → 돌아온 events 로 소리 · 효과 · 끝 처리 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const O = window.Omok;
  const sfx = (n, o) => Cozy.sfx.play(n, o);
  const store = (k, d) => Cozy.store('omok.' + k, d), save = (k, v) => Cozy.save('omok.' + k, v);
  const esc = Cozy.esc;
  // 창: Cozy.modal 그대로, 열린 창 닫기 함수만 기억 (뒤로 몸짓 · 메뉴로 나갈 때 깔끔히 닫으려고)
  const modals = [];
  function modal(o) {
    const oc = o.onClose;
    const close = Cozy.modal(Object.assign({}, o, { onClose: () => { const i = modals.indexOf(close); if (i >= 0) modals.splice(i, 1); if (oc) oc(); } }));
    modals.push(close);
    return close;
  }

  const TIERS = ['easy', 'normal', 'hard'];
  const TIER_DESC = { easy: '가볍게 한 판', normal: '제법 잘 막아요', hard: '만만치 않아요' };
  const RULES = ['standard', 'renju', 'free'];
  const RULE_LINE = {
    standard: '흑백 모두 열린 삼 두 개를 한 번에 못 만들어요. 여섯 알 이상은 승리가 아니에요.',
    renju: '흑만 삼삼·사사·장목(여섯 알 이상)이 금지예요. 백은 자유롭고 여섯 알도 이겨요.',
    free: '금지 없이 다섯 알 이상 먼저 이으면 이겨요.',
  };
  const BAN_MSG = { '33': '삼삼 금수예요 (열린 삼이 두 개)', '44': '사사 금수예요 (사가 두 개)', overline: '장목 금수예요 (여섯 알 이상)' };
  const COLOR_NAME = { 1: '흑', 2: '백' };
  const TIER_MAP = {
    easy:   { em: '🌱', name: '수련생',   cls: 't-easy' },
    normal: { em: '⚪', name: '유단자',   cls: 't-normal' },
    hard:   { em: '👑', name: '렌주 명인', cls: 't-hard' },
  };
  const tier = t => TIER_MAP[t] || Cozy.TIERS[t];
  // AI 한마디 (난이도마다 말투)
  const SAY = {
    four:  { easy: '앗, 사(4)예요!', normal: '사(4)를 부릅니다!', hard: '외길 사(4) 공격입니다.' },
    block: { easy: '휴, 급소를 막았어요!', normal: '날카로운 수를 막았습니다.', hard: '그 공격은 이미 읽었습니다.' },
    sure:  { easy: '이길 길이 보여요!', normal: '승기가 잡혔습니다!', hard: '수읽기가 끝났습니다.' },
    win:   { easy: '제가 이겼네요! 한 수 배웠어요.', normal: '좋은 대국이었습니다!', hard: '명승부였습니다. 한 판 더 하시죠!' },
    lose:  { easy: '멋진 수네요, 졌어요!', normal: '대단한 수읽기입니다!', hard: '완벽한 공격이군요. 인정합니다!' },
  };

  // ── 저장된 고르기 · 설정 ──
  const pref = Object.assign({ tab: 'solo', mode: 'ai', tier: 'normal', color: 'black', rule: 'standard', wb: 'hard', ww: 'normal' }, store('pref', {}));
  const set = Object.assign({ touch: 'confirm', coords: false, nums: false }, store('settings', {}));
  const savePref = () => save('pref', pref), saveSet = () => save('settings', set);

  // ── 소리 (Cozy.sfx 위에 몇 가지 더) ──
  Cozy.sfx.add('stone', (t, o, S) => {                                   // 나무판에 돌 '탁' (Cozy place 를 바탕으로 색마다 살짝 다르게)
    const p = (o.pitch || 1) * (0.96 + Math.random() * 0.08);
    S.noise(t, 0.045, { vol: 0.5, type: 'bandpass', f: 2500 * p, q: 2.6 });
    S.noise(t + 0.004, 0.08, { vol: 0.16, type: 'lowpass', f: 900 * p });
    S.tone(t, 190 * p, 0.07, { type: 'sine', vol: 0.26, f2: 115 * p });
  });
  Cozy.sfx.add('alert', (t, o, S) => { S.tone(t, 1175, 0.08, { type: 'triangle', vol: 0.11 }); S.tone(t + 0.12, 1397, 0.1, { type: 'triangle', vol: 0.11 }); });
  Cozy.sfx.add('hint', (t, o, S) => { [S.N.A5, S.N.E6].forEach((f, i) => S.tone(t + i * 0.07, f, 0.18, { vol: 0.1 })); });
  Cozy.sfx.add('start', (t, o, S) => { [S.N.C5, S.N.E5, S.N.G5].forEach((f, i) => S.tone(t + i * 0.08, f, 0.16, { type: 'triangle', vol: 0.12 })); });
  Cozy.sfx.add('star', (t, o, S) => { S.tone(t, [S.N.C6, S.N.E6, S.N.G5 * 2][Math.min(2, o.i || 0)], 0.22, { type: 'triangle', vol: 0.12 }); });

  // ════════ 메뉴 ════════
  function seg(el, items, cur, on) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); on(b.dataset.v); };
  }
  const stats = () => store('stats', {});
  function recLine(t) { const r = stats()[t]; return r && (r.w || r.l || r.d) ? `${r.w}승 ${r.l}패${r.d ? ` ${r.d}무` : ''}` : ''; }
  function drawMenu() {
    for (const [t, box] of [['solo', 'soloBox'], ['watch', 'watchBox']]) { $('tab' + t[0].toUpperCase() + t.slice(1)).setAttribute('aria-pressed', String(pref.tab === t)); $(box).hidden = pref.tab !== t; }
    seg($('modeSeg'), [['ai', '🤖 AI 대전'], ['two', '👥 둘이서']], pref.mode, v => { pref.mode = v; savePref(); drawMenu(); });
    $('aiOpts').hidden = pref.mode !== 'ai'; $('twoDesc').hidden = pref.mode !== 'two';
    $('tiers').innerHTML = TIERS.map(t => `<button class="tier ${tier(t).cls}" data-t="${t}" aria-pressed="${pref.tier === t}"><span class="em">${tier(t).em}</span><b>${tier(t).name}</b><span>${TIER_DESC[t]}</span><span class="rec">${recLine(t)}</span></button>`).join('');
    $('tiers').onclick = e => { const b = e.target.closest('.tier'); if (!b) return; sfx('tap'); pref.tier = b.dataset.t; savePref(); drawMenu(); };
    seg($('colorSeg'), [['black', '<i class="dot b"></i>흑 (먼저)'], ['white', '<i class="dot w"></i>백'], ['random', '🎲 랜덤']], pref.color, v => { pref.color = v; savePref(); drawMenu(); });
    const tierItems = TIERS.map(t => [t, tier(t).em + ' ' + tier(t).name]);
    seg($('watchB'), tierItems, pref.wb, v => { pref.wb = v; savePref(); drawMenu(); });
    seg($('watchW'), tierItems, pref.ww, v => { pref.ww = v; savePref(); drawMenu(); });
    seg($('ruleSeg'), RULES.map(r => [r, O.RULES[r].name]), pref.rule, v => { pref.rule = v; savePref(); drawMenu(); });
    $('ruleDesc').textContent = RULE_LINE[pref.rule];
    $('startBtn').textContent = pref.tab === 'watch' ? '▶ 구경 시작' : '시작!';
    $('howtoList').hidden = pref.tab === 'watch';
  }
  $('tabSolo').onclick = () => { sfx('tap'); pref.tab = 'solo'; savePref(); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); pref.tab = 'watch'; savePref(); drawMenu(); };
  if ($('tabFriend')) $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('tap'); startFromMenu(); };
  $('helpBtn').onclick = () => howto(true);
  $('setBtn').onclick = openSettings;
  $('recBtn').onclick = openRecords;

  function openFriendModal() {
    if (!window.ArenaUI) return Cozy.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open({
      game: 'omok', title: '오목', max: 2, min: 2,
      buildConfig: (hostEl) => {
        const state = { rule: pref.rule || 'standard', hostColor: 1 };
        hostEl.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
          <div class="optrow"><span class="small">규칙</span><div class="seg" id="fRuleSeg"></div></div>
          <div class="optrow"><span class="small">방장 돌</span><div class="seg" id="fColSeg"></div></div>
        </div>`;
        const drawF = () => {
          seg(hostEl.querySelector('#fRuleSeg'), RULES.map(r => [r, O.RULES[r].name]), state.rule, v => { state.rule = v; drawF(); });
          seg(hostEl.querySelector('#fColSeg'), [[1, '⚫ 흑'], [2, '⚪ 백']], state.hostColor, v => { state.hostColor = +v; drawF(); });
        };
        drawF();
        return () => ({ rule: state.rule, hostColor: state.hostColor });
      },
      renderConfig: (cfg) => `${(O.RULES[cfg && cfg.rule] || O.RULES.standard).name} · 방장 ${(cfg && cfg.hostColor) === 2 ? '백' : '흑'}`,
      onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
    });
  }
  function startOnline({ net, role, cfg, players }) {
    const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p)).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
    const hostCol = (cfg && cfg.hostColor) === 2 ? 2 : 1;
    const me = role === 'host' ? hostCol : (3 - hostCol);
    const myPl = plist.find(p => p.uid === net.uid) || { name: '나' };
    const oppPl = plist.find(p => p.uid !== net.uid) || { name: '친구' };
    newGame({ mode: 'online', rule: (cfg && cfg.rule) || 'standard', me, myName: myPl.name || '나', oppName: oppPl.name || '친구', net, role });
    const onMsg = (m) => {
      if (!m || !G || G.mode !== 'online') return;
      if (m.t === 'move') act(m.a, { from: 'remote', color: m.color });
      else if (m.t === 'again') newGame(Object.assign({}, G.cfg, { me: 3 - G.me }));
    };
    if (role === 'host') net.on('msg', (_uid, m) => onMsg(m));
    else net.on('msg', m => onMsg(m));
  }
  function startFromMenu() {
    if (pref.tab === 'watch') newGame({ mode: 'watch', rule: pref.rule, wb: pref.wb, ww: pref.ww });
    else if (pref.mode === 'two') newGame({ mode: 'two', rule: pref.rule });
    else newGame({ mode: 'ai', rule: pref.rule, tier: pref.tier, color: pref.color });
  }
  const HOWTO = [
    '가로·세로·대각선으로 내 돌 <b>다섯 개</b>를 먼저 이으면 이겨요',
    '휴대폰은 한 번 눌러 자리를 보고, <b>한 번 더 누르거나 착수</b>를 누르면 둬요 (⚙ 설정에서 바로 두기로 바꿀 수 있어요)',
    '빨간 <b>✕</b>는 지금 둘 수 없는 금수 자리예요. 규칙마다 금수가 달라요',
    '막히면 💡 힌트, 실수했으면 ↶ 되돌리기 (AI 대전은 내 수와 AI 수를 함께 물러요)',
    'PC에선 클릭으로 바로 두고, 방향키로 옮겨 Enter 로 둘 수도 있어요',
  ];
  const howto = force => Cozy.howto('omok', '오목 하는 법', HOWTO, { force: !!force });

  function openSettings() {
    sfx('tap');
    const html = `<div class="setlist">
      <div class="optrow"><span class="small">터치로 둘 때</span><div class="seg" id="sTouch"></div></div>
      <div class="optrow"><span class="small">좌표</span><div class="seg" id="sCoords"></div></div>
      <div class="optrow"><span class="small">수 번호</span><div class="seg" id="sNums"></div></div>
      <div class="optrow"><span class="small">소리</span><div class="seg" id="sSound"></div></div></div>`;
    modal({ title: '⚙ 설정', html, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const draw = () => {
      seg($('sTouch'), [['confirm', '한 번 더 눌러 확정'], ['instant', '바로 두기']], set.touch, v => { set.touch = v; saveSet(); draw(); });
      seg($('sCoords'), [['1', '보이기'], ['0', '숨기기']], set.coords ? '1' : '0', v => { set.coords = v === '1'; saveSet(); board.setOptions({ coords: set.coords }); draw(); });
      seg($('sNums'), [['1', '보이기'], ['0', '숨기기']], set.nums ? '1' : '0', v => { set.nums = v === '1'; saveSet(); syncBoard(); draw(); });
      seg($('sSound'), [['1', '켬'], ['0', '끔']], Cozy.sfx.on ? '1' : '0', v => { Cozy.sfx.set(v === '1'); drawSnd(); draw(); });
    };
    draw();
  }

  // ── 지난 대국 (휴대폰에 최근 200판) ──
  const records = () => store('records', []);
  function addRecord(r) { const list = records(); list.push(r); while (list.length > 200) list.shift(); save('records', list); }
  function openRecords() {
    sfx('tap');
    const list = records().slice().reverse();
    const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const resTxt = r => r.mode !== 'ai' ? (r.win ? [`<i class="st ${r.win === 1 ? 'b' : 'w'}"></i>`, 'd'] : ['무', 'd']) : r.res === 'w' ? ['이김', 'w'] : r.res === 'l' ? ['짐', 'l'] : ['무', 'd'];
    const who = r => r.mode === 'ai' ? `${tier(r.tier).em} ${tier(r.tier).name} AI · 내가 ${COLOR_NAME[r.me]}` : r.mode === 'two' ? `👥 둘이서 · ${r.win ? COLOR_NAME[r.win] + ' 승' : '무승부'}` : `👀 ${tier(r.wb).em} vs ${tier(r.ww).em}`;
    const html = list.length ? `<ul class="reclist">${list.slice(0, 60).map((r, i) => { const [t, c] = resTxt(r); return `<li data-i="${i}"><span class="res ${c}">${t}</span><span class="inf"><b>${esc(who(r))}</b><span class="small">${esc(O.RULES[r.rule] ? O.RULES[r.rule].name : '')} · ${r.n}수 · ${when(r.t)}</span></span><span class="go">›</span></li>`; }).join('')}</ul>`
      : '<p class="sub">아직 끝낸 대국이 없어요. 한 판 두면 여기에 남아요.</p>';
    const close = modal({ title: '📜 지난 대국', html, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const ul = document.querySelector('.reclist');
    if (ul) ul.onclick = e => { const li = e.target.closest('li'); if (!li) return; const r = list[+li.dataset.i]; close(); sfx('tap'); openReview(r); };
  }

  // ════════ 대국 ════════
  const board = new OmokBoard($('board'), { coords: set.coords });
  let G = null;                 // 지금 판
  let session = { key: '', a: 0, b: 0 };   // 같은 상대와 이어서 둔 판 점수 (메뉴로 나가면 새로)
  let preview = -1, hover = -1, cursor = -1, forbidMask = null;
  let aiTimer = 0, tickT = 0, reqId = 0;
  let askClose = null;                     // 열려 있는 '기권할까요? · 처음부터 할까요?' 창 닫기

  const show = which => {
    $('play').hidden = which !== 'play'; document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') { requestAnimationFrame(fit); pushHist(); }
  };
  // 휴대폰 '뒤로' 몸짓 · 브라우저 뒤로: 페이지를 떠나지 않고 ‹ 단추처럼 (두는 중이면 두 번)
  let histOn = false, backArmed = 0;
  function pushHist() { if (histOn) return; try { history.pushState({ omok: 1 }, ''); histOn = true; } catch (e) {} }
  function popHist() { if (!histOn) return; histOn = false; try { history.back(); } catch (e) {} }
  addEventListener('popstate', () => {
    if (!histOn) return;                                                 // 우리가 부른 back() 이거나 메뉴 화면
    histOn = false;
    if (!G || $('play').hidden) return;
    if (modals.length) { modals[modals.length - 1](); pushHist(); return; }   // 창이 떠 있으면 창만 닫음
    const ov = document.querySelector('.overlay');                       // (하는 법 창 등 Cozy 가 연 창: 바깥 누르기로 닫음)
    if (ov) { ov.dispatchEvent(new MouseEvent('click')); pushHist(); return; }
    if (!needGuard() || Date.now() - backArmed < 2000) { backArmed = 0; goMenu(); return; }
    backArmed = Date.now(); Cozy.toast('한 번 더 누르면 메뉴로 나가요', 1800); pushHist();
  });
  function fit() {
    const st = $('stage'); if ($('play').hidden) return;
    const s = Math.floor(Math.min(st.clientWidth, st.clientHeight));
    if (s > 50) board.resize(s);
  }
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe($('stage'));
  addEventListener('resize', () => requestAnimationFrame(fit));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { board.bg = null; board.S = 0; fit(); });

  function newGame(cfg) {
    stopAll();
    const rule = RULES.includes(cfg.rule) ? cfg.rule : 'standard';
    const s = O.create(15, rule, (Math.random() * 4294967296) >>> 0);
    let me = 0, players;
    if (cfg.mode === 'ai') {
      me = cfg.color === 'white' ? 2 : cfg.color === 'random' ? (Math.random() < 0.5 ? 1 : 2) : 1;
      players = { [me]: { kind: 'human' }, [3 - me]: { kind: 'ai', tier: cfg.tier } };
    } else if (cfg.mode === 'online') {
      me = cfg.me || 1;
      players = { [me]: { kind: 'human', name: cfg.myName || '나' }, [3 - me]: { kind: 'remote', name: cfg.oppName || '친구' } };
    } else if (cfg.mode === 'two') players = { 1: { kind: 'human' }, 2: { kind: 'human' } };
    else players = { 1: { kind: 'ai', tier: cfg.wb }, 2: { kind: 'ai', tier: cfg.ww } };
    const key = JSON.stringify([cfg.mode, cfg.tier, cfg.wb, cfg.ww, rule]);
    if (session.key !== key) session = { key, a: 0, b: 0 };
    G = { cfg, s, mode: cfg.mode, rule, me, players, net: cfg.net || null, role: cfg.role || null, hints: cfg.mode === 'ai' ? 3 : 0, hintUsed: 0, undos: 0, secs: 0, over: false,
      thinking: false, paused: false, fast: false, review: null, said: {}, startAt: Date.now() };
    preview = hover = cursor = -1;
    board.clearFx();
    show('play');
    $('dockPlay').hidden = cfg.mode === 'watch'; $('dockWatch').hidden = cfg.mode !== 'watch'; $('dockReview').hidden = true;
    $('hintBtn').hidden = cfg.mode !== 'ai';
    $('undoBtn').hidden = cfg.mode === 'online';
    $('restartBtn').hidden = cfg.mode === 'online';
    drawWatchDock();
    syncAll();
    tickT = setInterval(tick, 1000);
    sfx('start');
    if (cfg.mode === 'online') Cozy.toast(me === 1 ? '⚫ 내가 흑이에요. 먼저 둬요!' : '⚪ 내가 백이에요. 친구가 먼저 둬요!', 1800);
    else if (cfg.mode === 'ai' && (cfg.color === 'random' || me === 2)) Cozy.toast(me === 1 ? (cfg.color === 'random' ? '🎲 이번엔 흑이에요. 먼저 둬요!' : '내가 흑이에요. 먼저 둬요!') : `${cfg.color === 'random' ? '🎲 이번엔 백' : '내가 백'}이에요. ${tier(cfg.tier).em} AI가 먼저 둬요`, 1800);
    if (cfg.mode !== 'watch' && howto(false)) { /* 처음이면 안내를 먼저 */ }
    setTimeout(() => { if (G && G.s === s) advance(); }, cfg.mode === 'watch' ? 500 : 250);
  }
  function stopAll() {
    clearTimeout(aiTimer); clearInterval(tickT); reqId++;
    if (G) G.thinking = false;
    hideBubble();
  }
  function goMenu() {
    if (G && G.net) { try { G.net.leave(); } catch (e) {} }
    stopAll(); G = null; board.clearFx(); show('menu'); drawMenu();
    session = { key: '', a: 0, b: 0 };
    for (const c of modals.slice().reverse()) c();                      // 열린 창(기권 묻기 등)도 닫음
    const t = document.querySelector('.toast'); if (t) t.hidden = true;  // '한 번 더 누르면…' 알림이 메뉴에 남지 않게
    popHist();
  }
  function tick() {
    if (!G || G.over || G.review || document.hidden || G.paused) return;
    G.secs++; drawStat();
  }

  // 지금 둘 차례가 사람인가 (입력 받을 때)
  const humanTurn = () => !!(G && !G.over && !G.review && G.players[G.s.turn].kind === 'human');

  function advance() {
    if (!G || G.review) return;
    syncAll();
    if (G.s.over) return;
    const ctl = G.players[G.s.turn];
    if (ctl.kind === 'ai' && !G.thinking && !(G.mode === 'watch' && (G.paused || document.hidden))) requestAI();
  }

  // 행동 하나 = 칸 번호 또는 기권. 사람·AI(나중엔 원격) 모두 이 길로
  function act(a, info) {
    if (!G || G.over || G.review) return false;
    const g = G, mover = g.s.turn;
    const col = info && info.color || mover;
    const ev = a === O.RESIGN ? O.resign(g.s, col) : O.step(g.s, a);
    if (ev[0].type === 'illegal') {
      if (ev[0].reason === 'forbidden') { sfx('bad'); Cozy.vibrate(30); Cozy.toast(BAN_MSG[ev[0].ban] || '둘 수 없는 자리예요'); }
      return false;
    }
    if (g.mode === 'online' && g.net && !(info && info.from === 'remote')) {
      const m = { t: 'move', a, color: col };
      if (g.role === 'host') g.net.broadcast(m); else g.net.send(m);
    }
    preview = hover = cursor = -1; showConfirm(false); board.setHint(-1); board.setGhost(null);   // 둔 자리에 미리 보기 · 커서가 남지 않게 (둘이서)
    let won = null;
    for (const e of ev) {
      if (e.type === 'place') {
        board.drop(e.idx, e.color);
        sfx('stone', { pitch: e.color === 1 ? 0.94 : 1.06 });
        Cozy.vibrate(8);
      } else if (e.type === 'threat' && g.mode !== 'review') {
        const strong = e.kind !== 'three';
        // 열린 삼: 둘이서, 그리고 🐣·🐱 AI 가 만든 것은 은은한 고리로 알려 줌 (초보가 가장 많이 놓치는 것)
        const helpThree = g.mode === 'two' || (g.mode === 'ai' && g.players[e.color].kind === 'ai' && g.cfg.tier !== 'hard');
        if (strong || helpThree) board.pulse(e.idx, e.kind === 'open4');
        if (strong) setTimeout(() => { if (G === g) sfx(g.players[e.color].kind === 'ai' && g.mode === 'ai' ? 'alert' : 'tick'); }, 160);
        if (g.mode === 'ai' && strong && g.players[e.color].kind === 'ai') say('four', 0.7);
      } else if (e.type === 'win') won = e;
    }
    // AI 가 사람의 사를 막았을 때 한마디
    if (info && info.kind === 'block' && g.mode === 'ai') say('block', 0.6);
    if ((info && (info.kind === 'vcf' || info.kind === 'vct')) && g.mode === 'ai' && !g.said.sure) { g.said.sure = 1; say('sure', 1); }
    syncAll();
    if (g.s.over) finish(won);
    else advance();
    return true;
  }

  // ── AI (웹 워커) ──
  let worker = null, workerOK = true, mainAI = null;
  const waits = new Map();
  function getWorker() {
    if (worker || !workerOK) return worker;
    try {
      worker = new Worker('ai-worker.js?v=1');
      worker.onmessage = e => { const w = waits.get(e.data.id); if (w) { waits.delete(e.data.id); w.ok(e.data.res); } };
      worker.onerror = () => { killWorker(); };
    } catch (e) { worker = null; workerOK = false; }
    return worker;
  }
  function killWorker() { if (worker) worker.terminate(); worker = null; for (const [, w] of waits) w.bad(new Error('worker')); waits.clear(); }
  let thinkSeq = 0;
  // 워커가 안 되거나 멈추면 화면 쪽에서 직접 (ai.js 를 그때 불러옴)
  function loadMainAI() {
    if (mainAI) return mainAI;
    mainAI = new Promise((ok, bad) => { if (window.OmokAI) return ok(window.OmokAI); const sc = document.createElement('script'); sc.src = 'ai.js?v=1'; sc.onload = () => ok(window.OmokAI); sc.onerror = bad; document.head.appendChild(sc); });
    return mainAI;
  }
  function think(state, opts) {
    const w = getWorker();
    if (!w) return loadMainAI().then(ai => new Promise(ok => setTimeout(() => ok(ai.think(state, opts)), 30)));
    const id = ++thinkSeq;
    return new Promise((ok, bad) => {
      const t = setTimeout(() => { if (waits.has(id)) { waits.delete(id); killWorker(); bad(new Error('timeout')); } }, 9000);
      waits.set(id, { ok: r => { clearTimeout(t); ok(r); }, bad: e => { clearTimeout(t); bad(e); } });
      w.postMessage({ id, state, opts });
    }).catch(() => loadMainAI().then(ai => ai.think(state, Object.assign({}, opts, { timeMs: 600 }))));
  }
  function requestAI() {
    const g = G, s = g.s, ctl = g.players[s.turn], id = ++reqId, t0 = performance.now();
    g.thinking = true; syncSides(); syncInput();
    const minWait = g.mode === 'watch' ? (g.fast ? 140 : 650) : ctl.tier === 'easy' ? 520 + Math.random() * 300 : 380 + Math.random() * 200;
    think(O.toJSON(s), { tier: ctl.tier, seed: (Math.random() * 1e9) | 0 }).then(res => {
      if (G !== g || id !== reqId || g.over) return;
      const run = () => {
        if (G !== g || id !== reqId || g.over) return;
        if (g.paused || (g.mode === 'watch' && document.hidden)) { aiTimer = setTimeout(run, 300); return; }
        g.thinking = false;
        if (!act(res.move, res)) { const lm = O.legalMoves(g.s); if (lm.length) act(lm[0]); }
      };
      aiTimer = setTimeout(run, Math.max(0, minWait - (performance.now() - t0)));
    }).catch(() => { if (G === g && id === reqId) { g.thinking = false; const lm = O.legalMoves(g.s); if (lm.length) act(lm[Math.floor(lm.length / 2)]); } });
  }
  function cancelAI() { reqId++; clearTimeout(aiTimer); if (G) G.thinking = false; }

  // ── 끝 ──
  function finish(won) {
    const g = G; g.over = true; clearInterval(tickT); cancelAI();
    if (askClose) askClose();                                           // 기권·처음부터 묻는 창이 열려 있었으면 닫음 (결과 창과 겹치지 않게)
    board.setForbidden(null); board.setGhost(null);
    const s = g.s, w = s.winner;
    if (s.winLines && s.winLines.length) board.setWin(s.winLines);
    let res = 'd';
    if (g.mode === 'ai') res = !w ? 'd' : w === g.me ? 'w' : 'l';
    // 점수 (같은 상대와 이어서)
    if (w) { if (g.mode === 'ai') { if (w === g.me) session.a++; else session.b++; } else { if (w === 1) session.a++; else session.b++; } }
    // 소리 · 효과
    const humanWon = g.mode === 'ai' ? res === 'w' : !!w;
    setTimeout(() => {
      if (G !== g) return;
      if (humanWon) { sfx('win'); Cozy.confetti(); } else if (w) sfx('lose'); else sfx('count');
      if (g.mode === 'ai') say(res === 'w' ? 'lose' : res === 'l' ? 'win' : null, 1);
    }, s.winLines && s.winLines.length ? 380 : 120);
    // 기록 (AI 대전 · 둘이서만)
    if (g.mode !== 'watch') {
      addRecord({ t: Date.now(), rec: O.encode(s), mode: g.mode, rule: g.rule, tier: g.cfg.tier, me: g.me, res, win: w, n: s.moves.length, secs: g.secs });
      if (g.mode === 'ai') { const st = stats(); const r = st[g.cfg.tier] || { w: 0, l: 0, d: 0 }; r[res]++; st[g.cfg.tier] = r; save('stats', st); }
    }                                                                  // AI 구경 판은 남기지 않음 (내 대국 기록이 밀려나지 않게, 복기는 끝나자마자 볼 수 있음)
    syncAll();
    setTimeout(() => { if (G === g && !g.review) showResult(); }, s.reason === 'resign' ? 500 : 1500);
  }
  const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function showResult() {
    hideBubble();                                                       // 말풍선이 결과 창 위에 뜨지 않게
    const g = G, s = g.s, w = s.winner, n = s.moves.length;
    let title, body = '';
    const why = s.reason === 'resign' ? ' (기권)' : '';
    if (g.mode === 'ai') {
      const T = tier(g.cfg.tier), r = stats()[g.cfg.tier] || { w: 0, l: 0, d: 0 };
      const recTxt = `<p class="why">${T.em} ${T.name} 전적 ${r.w}승 ${r.l}패${r.d ? ` ${r.d}무` : ''}</p>`;
      if (w === g.me) {
        const st = 1 + (g.undos ? 0 : 1) + (g.hintUsed ? 0 : 1);
        title = '🎉 이겼어요!';
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <p class="bigline">${T.em} ${T.name} AI를 이겼어요${why}</p>
          <p class="sub">${n}수 · ${fmtT(g.secs)}</p>
          <p class="why">${g.undos ? `되돌리기 ${g.undos}번` : '되돌리기 0 ✓'} · ${g.hintUsed ? `힌트 ${g.hintUsed}번` : '힌트 0 ✓'}</p>${recTxt}`;
        [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => sfx('star', { i: j }), 250 + j * 250));
      } else if (w) {
        title = '😿 아쉽게 졌어요';
        body = `<p class="bigline">${T.em} ${T.name} AI가 이겼어요${why}</p><p class="sub">${n}수 · ${fmtT(g.secs)}</p>
          <p class="why">${s.reason === 'resign' ? '다음 판은 끝까지 버텨 봐요!' : '상대의 열린 삼과 사를 먼저 막아 보세요. 복기로 어디서 갈렸는지 볼 수 있어요.'}</p>${recTxt}`;
      } else { title = '🤝 비겼어요'; body = `<p class="sub">${n}수 · 판이 가득 찼어요</p>${recTxt}`; }
    } else if (g.mode === 'online') {
      const wonMe = w === g.me;
      title = !w ? '🤝 비겼어요' : wonMe ? '🎉 이겼어요!' : '😿 아쉽게 졌어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div>` : '') + `<p class="sub">${n}수 · ${fmtT(g.secs)}${why}</p><p class="why">점수 흑 ${session.a} : ${session.b} 백</p>`;
    } else if (g.mode === 'two') {
      title = w ? `${COLOR_NAME[w]} 승리!` : '🤝 비겼어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div>` : '') + `<p class="sub">${n}수 · ${fmtT(g.secs)}${why}</p><p class="why">점수 흑 ${session.a} : ${session.b} 백</p>`;
    } else {
      const nm = c => { const t = tier(g.players[c].tier); return `${t.em} ${t.name}`; };
      title = w ? `${nm(w)} 승리!` : '🤝 비겼어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div>` : '') + `<p class="sub">${w ? COLOR_NAME[w] + ' · ' : ''}${n}수${why}</p><p class="why">점수 ${nm(1)} ${session.a} : ${session.b} ${nm(2)}</p>`;
    }
    modal({ title, html: body, buttons: [
      { label: g.mode === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => again() },
      { label: '복기', onClick: () => startReview() },
      { label: '메뉴', ghost: true, onClick: () => goMenu() },
    ] });
  }
  function again() {
    if (!G) return;
    const cfg = G.review && G.review.cfg ? G.review.cfg : G.cfg;
    if (!cfg) { goMenu(); return; }
    if (G.mode === 'online' && G.net) {
      const m = { t: 'again' };
      if (G.role === 'host') G.net.broadcast(m); else G.net.send(m);
      newGame(Object.assign({}, cfg, { me: 3 - G.me }));
      return;
    }
    newGame(cfg);
  }

  // ── 복기: 끝난 판 · 지난 대국을 한 수씩 ──
  function startReview() {
    if (!G) return;
    G.review = { k: G.s.moves.length, cfg: G.cfg };
    enterReview();
  }
  function openReview(r) {
    const s = O.fromRecord(r.rec); if (!s) { Cozy.toast('기보를 못 읽었어요'); return; }
    stopAll();
    const cfg = r.mode === 'ai' ? { mode: 'ai', rule: r.rule, tier: r.tier, color: r.me === 2 ? 'white' : 'black' } : r.mode === 'two' ? { mode: 'two', rule: r.rule } : { mode: 'watch', rule: r.rule, wb: r.wb, ww: r.ww };
    const players = r.mode === 'ai' ? { [r.me]: { kind: 'human' }, [3 - r.me]: { kind: 'ai', tier: r.tier } } : r.mode === 'two' ? { 1: { kind: 'human' }, 2: { kind: 'human' } } : { 1: { kind: 'ai', tier: r.wb }, 2: { kind: 'ai', tier: r.ww } };
    G = { cfg, s, mode: r.mode, rule: r.rule, me: r.me || 0, players, hints: 0, hintUsed: 0, undos: 0, secs: r.secs || 0, over: true, thinking: false, paused: false, said: {}, review: { k: s.moves.length, cfg, old: true } };
    board.clearFx(); show('play'); enterReview();
  }
  function enterReview() {
    $('dockPlay').hidden = true; $('dockWatch').hidden = true; $('dockReview').hidden = false; showConfirm(false);
    board.setForbidden(null); board.setGhost(null); board.setHint(-1);
    sfx('flip'); syncAll();
  }
  function reviewTo(k) {
    const R = G && G.review; if (!R) return;
    k = Math.max(0, Math.min(G.s.moves.length, k));
    if (k === R.k) return;
    const fwd = k === R.k + 1;
    R.k = k; syncAll();
    if (fwd) { const i = G.s.moves[k - 1]; board.drop(i, k % 2 ? 1 : 2); sfx('stone', { pitch: k % 2 ? 0.94 : 1.06 }); } else sfx('tap');
  }
  $('rvFirst').onclick = () => reviewTo(0);
  $('rvPrev').onclick = () => reviewTo(G.review.k - 1);
  $('rvNext').onclick = () => reviewTo(G.review.k + 1);
  $('rvLast').onclick = () => reviewTo(G.s.moves.length);
  $('rvAgain').onclick = () => { sfx('tap'); again(); };

  // ── 화면 맞추기 ──
  function syncAll() { syncBoard(); syncSides(); drawStat(); syncInput(); syncDock(); }
  function syncBoard() {
    if (!G) return;
    const s = G.s, R = G.review;
    const k = R ? R.k : s.moves.length;
    const stones = new Int8Array(225), nums = new Int16Array(225);
    if (R) for (let i = 0; i < k; i++) { stones[s.moves[i]] = i % 2 ? 2 : 1; nums[s.moves[i]] = i + 1; }
    else { for (let i = 0; i < 225; i++) stones[i] = s.board[i]; s.moves.forEach((m, i) => { nums[m] = i + 1; }); }
    board.set({ stones, nums, last: k ? s.moves[k - 1] : -1, showNums: R ? true : G.mode === 'watch' ? !!G.nums : set.nums });
    board.setWin(R ? (k === s.moves.length && s.winLines.length ? s.winLines : null) : (s.over && s.winLines.length ? s.winLines : null));
    // 금수 ✕: 지금 둘 차례가 금수 규칙을 받고, 사람(또는 구경)일 때
    forbidMask = null;
    if (!R && !s.over && O.restricted(s.rule, s.turn) && (G.players[s.turn].kind === 'human' || G.mode === 'watch')) {
      const m = O.forbiddenMask(s);
      if (m.some(v => v)) forbidMask = m;
    }
    board.setForbidden(forbidMask);
  }
  // 이름표: 아바타(난이도 동물 · 나 · 흑백) + 이름 + 상태 + 점수
  function syncSides() {
    if (!G) return;
    const s = G.s;
    for (const c of [1, 2]) {
      const el = $(c === 1 ? 'sideB' : 'sideW'), p = G.players[c];
      let emo, nm, sayTxt = '';
      if (G.mode === 'ai') { if (p.kind === 'human') { emo = '🙂'; nm = '나'; } else { emo = tier(p.tier).em; nm = tier(p.tier).name; } }
      else if (G.mode === 'online') { emo = p.kind === 'human' ? '🙂' : '👥'; nm = p.name || COLOR_NAME[c]; }
      else if (G.mode === 'two') { emo = ''; nm = COLOR_NAME[c]; }
      else { emo = tier(p.tier).em; nm = tier(p.tier).name; }
      const turn = !s.over && !G.review && s.turn === c;
      if (G.review) sayTxt = '';
      else if (s.over) sayTxt = s.winner === c ? '승리!' : s.winner ? '' : '무승부';
      else if (turn && G.paused) sayTxt = '멈춤';
      else if (turn) sayTxt = p.kind === 'ai' ? (G.thinking ? '생각 중' : '') : p.kind === 'remote' ? '상대 차례' : (G.mode === 'ai' || G.mode === 'online') ? '내 차례' : '차례';
      el.querySelector('.emo').textContent = emo;
      el.querySelector('.av').classList.toggle('stoneav', G.mode === 'two');
      el.querySelector('.nm').textContent = nm;
      const sy = el.querySelector('.say'); sy.textContent = sayTxt; sy.classList.toggle('thinking', turn && p.kind === 'ai' && G.thinking && !G.paused);
      const sc = G.mode === 'ai' ? (p.kind === 'human' ? session.a : session.b) : c === 1 ? session.a : session.b;
      el.querySelector('.n').textContent = session.a || session.b ? String(sc) : '';
      el.classList.toggle('turn', turn);
    }
    $('lbl').textContent = G.review ? '📜 복기' : G.mode === 'ai' ? `${tier(G.cfg.tier).em} ${tier(G.cfg.tier).name} AI와 대국` : G.mode === 'online' ? `👥 친구랑 (${G.net ? G.net.code : ''})` : G.mode === 'two' ? '👥 둘이서' : '👀 AI 구경';
    $('rulePill').textContent = O.RULES[G.rule].name;
  }
  function drawStat() {
    if (!G) return;
    const n = G.s.moves.length;
    $('stat').textContent = G.review ? `${G.review.k} / ${n}수` : `${n}수 · ${fmtT(G.secs)}`;
  }
  function syncInput() {
    const ok = humanTurn() && !G.thinking;
    $('board').classList.toggle('wait', !ok);
    if (!ok) { if (preview >= 0) { preview = -1; showConfirm(false); } board.setGhost(null); }
  }
  function syncDock() {
    if (!G) return;
    if (G.review) {
      const k = G.review.k, n = G.s.moves.length;
      $('rvFirst').disabled = $('rvPrev').disabled = k <= 0; $('rvNext').disabled = $('rvLast').disabled = k >= n;
      return;
    }
    if (G.mode === 'watch') return;
    const live = !G.over;
    const humanMoves = G.mode === 'ai' ? G.s.moves.filter((m, i) => (i % 2 ? 2 : 1) === G.me).length : G.s.moves.length;
    $('undoBtn').disabled = !live || humanMoves === 0;
    $('resignBtn').disabled = !live;
    $('hintBtn').disabled = !live || G.hints <= 0 || !humanTurn() || G.thinking || G.hintBusy;
    $('hintBadge').textContent = live && G.mode === 'ai' && G.hints > 0 ? String(G.hints) : '';
    $('restartBtn').disabled = false;
  }

  // ── 입력: 터치 = 미리 보기 후 확정(기본) · 마우스 = 바로 · 방향키 커서 ──
  const cv = $('board');
  let down = null;
  function ghostFor(i, kind) { return { idx: i, color: G.s.turn, kind, bad: !!(forbidMask && forbidMask[i]) }; }
  function showConfirm(on) {
    $('confirm').hidden = !on;
    const dock = G && G.review ? $('dockReview') : G && G.mode === 'watch' ? $('dockWatch') : $('dockPlay');
    for (const d of [$('dockPlay'), $('dockWatch'), $('dockReview')]) d.style.visibility = on && d === dock ? 'hidden' : '';
    if (on && G) {
      $('placeSt').className = 'st ' + (G.s.turn === 1 ? 'b' : 'w');
      $('placeBtn').disabled = !!(forbidMask && forbidMask[preview]);
    }
  }
  function setPreview(i) {
    preview = i;
    board.setGhost(i >= 0 ? ghostFor(i, 'preview') : null);
    showConfirm(i >= 0);
    if (i >= 0 && forbidMask && forbidMask[i]) { const r = O.forbiddenReason(G.s, i); Cozy.toast(BAN_MSG[r] || '둘 수 없는 자리예요', 1600); }
  }
  function tryPlace(i) {
    if (!humanTurn() || G.thinking || i < 0 || G.s.board[i]) return;
    if (forbidMask && forbidMask[i]) { sfx('bad'); Cozy.vibrate(30); Cozy.toast(BAN_MSG[O.forbiddenReason(G.s, i)] || '둘 수 없는 자리예요'); return; }
    cursor = -1;
    act(i);
  }
  let waitToastAt = 0;
  cv.addEventListener('pointerdown', e => {
    if (!G || G.review) return;
    e.preventDefault();
    if (!humanTurn() || G.thinking) {
      if (G && !G.over && G.thinking && performance.now() - waitToastAt > 2500) { waitToastAt = performance.now(); Cozy.toast('AI가 생각 중이에요…', 1200); }
      return;
    }
    const i = board.idxAt(e.clientX, e.clientY);
    const touch = e.pointerType !== 'mouse';
    down = { id: e.pointerId, i, touch, prev: preview, moved: false };
    if (touch && set.touch === 'confirm' && i >= 0 && !G.s.board[i]) { if (i !== preview) { setPreview(i); sfx('tap'); } }
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', e => {
    if (!G || G.review) return;
    if (down && down.id === e.pointerId) {
      if (down.touch && set.touch === 'confirm') {                      // 손가락을 끌어 미리 보기 옮기기
        const i = board.idxAt(e.clientX, e.clientY);
        if (i >= 0 && i !== preview && !G.s.board[i]) { down.moved = true; setPreview(i); sfx('tick'); }
      }
      return;
    }
    if (e.pointerType === 'mouse' && humanTurn() && !G.thinking) {
      const i = board.idxAt(e.clientX, e.clientY);
      if (i !== hover) { hover = i; cursor = -1; board.setGhost(i >= 0 && !G.s.board[i] ? ghostFor(i, 'hover') : null); }
    }
  });
  cv.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId) return;
    const d = down; down = null;
    if (!G || G.review || !humanTurn()) return;
    const i = board.idxAt(e.clientX, e.clientY);
    if (!d.touch) { if (i >= 0 && i === d.i) tryPlace(i); return; }
    if (set.touch === 'instant') { if (i >= 0 && i === d.i) tryPlace(i); return; }
    if (!d.moved && i >= 0 && i === d.prev && i === preview) tryPlace(i);   // 같은 자리를 한 번 더 = 착수
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && hover >= 0) { hover = -1; if (cursor < 0 && preview < 0) board.setGhost(null); } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  $('placeBtn').onclick = () => { if (preview >= 0) tryPlace(preview); };
  $('cancelBtn').onclick = () => { sfx('tap'); setPreview(-1); };
  document.addEventListener('gesturestart', e => { if (document.body.classList.contains('playing')) e.preventDefault(); });

  document.addEventListener('keydown', e => {
    if (!G || $('play').hidden || document.querySelector('.overlay')) return;
    const k = e.key;
    if (G.review) {
      if (k === 'ArrowLeft') { reviewTo(G.review.k - 1); e.preventDefault(); } else if (k === 'ArrowRight') { reviewTo(G.review.k + 1); e.preventDefault(); }
      else if (k === 'Home') reviewTo(0); else if (k === 'End') reviewTo(G.s.moves.length);
      return;
    }
    if (k === 'Escape') { if (preview >= 0) setPreview(-1); cursor = -1; board.setGhost(null); return; }
    if ((k === 'z' || k === 'Z' || k === 'Backspace') && G.mode !== 'watch') { e.preventDefault(); undo(); return; }
    if ((k === 'h' || k === 'H') && G.mode === 'ai') { useHint(); return; }
    if (!humanTurn() || G.thinking) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (d) {
      e.preventDefault();
      if (cursor < 0) cursor = preview >= 0 ? preview : hover >= 0 ? hover : G.s.moves.length ? G.s.moves[G.s.moves.length - 1] : 112;
      const x = Math.max(0, Math.min(14, cursor % 15 + d[0])), y = Math.max(0, Math.min(14, Math.floor(cursor / 15) + d[1]));
      cursor = y * 15 + x; board.setGhost(ghostFor(cursor, 'cursor')); sfx('tick');
    } else if ((k === 'Enter' || k === ' ') && cursor >= 0) { e.preventDefault(); tryPlace(cursor); }
  });

  // ── 아래 단추 ──
  function undo() {
    if (!G || G.over || G.review || G.mode === 'watch') return;
    const s = G.s;
    if (G.mode === 'two') {
      if (!s.moves.length) return;
      popMove();
    } else {
      const mine = s.moves.filter((m, i) => (i % 2 ? 2 : 1) === G.me).length;
      if (!mine) { Cozy.toast('되돌릴 수가 없어요'); return; }
      cancelAI();
      // 내 수를 하나 지우고, 내 차례가 될 때까지
      while (s.moves.length) { const c = s.board[s.moves[s.moves.length - 1]]; popMove(); if (c === G.me && s.turn === G.me) break; }
    }
    G.undos++; preview = hover = cursor = -1; showConfirm(false); board.setHint(-1); board.setGhost(null);
    sfx('flip'); advance();
  }
  function popMove() { const s = G.s, i = s.moves[s.moves.length - 1], c = s.board[i]; O.undo(s); board.lift(i, c); }
  $('undoBtn').onclick = undo;
  async function useHint() {
    if (!G || G.mode !== 'ai' || !humanTurn() || G.thinking || G.hintBusy) return;
    if (G.hints <= 0) { Cozy.toast('힌트를 다 썼어요'); return; }
    const g = G, s0 = O.encode(g.s);
    g.hintBusy = true; syncDock();
    let res = null;
    try { res = await think(O.toJSON(g.s), { tier: 'hard', hint: true, timeMs: 900, seed: (Math.random() * 1e9) | 0 }); } catch (e) {}
    g.hintBusy = false;
    if (G !== g || O.encode(g.s) !== s0 || !res || res.move < 0) { syncDock(); return; }
    g.hints--; g.hintUsed++;
    board.setHint(res.move); sfx('hint');
    const msg = { win: '여기 두면 바로 이겨요!', open4: '여기 두면 열린 사, 이길 수 있어요!', vcf: '여기부터 사로 몰아붙이면 이겨요!', vct: '여기부터 몰아붙이면 이길 수 있어요!', block: '여기를 막아야 해요!', lost: '여기를 막아 봐요…', 'defend-vcf': '상대 공격을 미리 끊는 자리예요', 'defend-vct': '상대 공격을 미리 끊는 자리예요' }[res.kind] || '여기가 좋아 보여요';
    Cozy.toast('💡 ' + msg, 2200);
    if (set.touch === 'confirm' && matchMedia('(pointer: coarse)').matches) setPreview(res.move);
    syncDock();
  }
  $('hintBtn').onclick = useHint;
  $('resignBtn').onclick = () => {
    if (!G || G.over || G.review) return;
    sfx('tap');
    const who = (G.mode === 'ai' || G.mode === 'online') ? G.me : G.s.turn;
    askClose = modal({ title: '기권할까요?', html: `<p class="sub">${G.mode === 'two' ? `${COLOR_NAME[who]}이 기권하면 ${COLOR_NAME[3 - who]} 승리예요.` : '이번 판은 진 걸로 남아요.'}</p>`, dismiss: true, onClose: () => { askClose = null; },
      buttons: [{ label: '계속 둘래요', primary: true }, { label: '기권', ghost: true, onClick: () => { if (G && !G.over) { cancelAI(); act(O.RESIGN, { color: who }); } } }] });
  };
  $('restartBtn').onclick = () => {
    if (!G) return;
    sfx('tap');
    if (G.over || G.s.moves.length < 2) { newGame(Object.assign({}, G.cfg, G.mode === 'ai' ? { color: G.me === 1 ? 'black' : 'white' } : {})); return; }
    askClose = modal({ title: '처음부터 할까요?', html: '<p class="sub">지금 판은 기록에 남지 않아요.</p>', dismiss: true, onClose: () => { askClose = null; },
      buttons: [{ label: '처음부터', primary: true, onClick: () => newGame(Object.assign({}, G.cfg, G.mode === 'ai' ? { color: G.me === 1 ? 'black' : 'white' } : {})) }, { label: '계속', ghost: true }] });
  };
  const drawSnd = () => { for (const b of document.querySelectorAll('.dock .snd')) { b.querySelector('.ic').textContent = Cozy.sfx.on ? '🔊' : '🔇'; b.querySelector('.ic + span').textContent = Cozy.sfx.on ? '소리 켬' : '소리 끔'; b.setAttribute('aria-pressed', String(!Cozy.sfx.on)); } };
  for (const b of document.querySelectorAll('.dock .snd')) b.addEventListener('click', () => { Cozy.sfx.toggle(); drawSnd(); });
  drawSnd();
  $('rulePill').onclick = () => { if (G) { sfx('tap'); Cozy.toast(`${O.RULES[G.rule].name}: ${RULE_LINE[G.rule]}`, 3200); } };
  // 구경 단추
  function drawWatchDock() {
    if (!G) return;
    $('pauseBtn').innerHTML = G.paused ? '<span class="ic">▶</span><span>계속</span>' : '<span class="ic">⏸</span><span>멈춤</span>';
    $('pauseBtn').setAttribute('aria-pressed', String(!!G.paused));
    $('speedBtn').innerHTML = G.fast ? '<span class="ic">🐇</span><span>빠르게</span>' : '<span class="ic">🐢</span><span>천천히</span>';
    $('numBtn').setAttribute('aria-pressed', String(!!G.nums));
  }
  $('pauseBtn').onclick = () => { if (!G || G.mode !== 'watch') return; sfx('tap'); G.paused = !G.paused; drawWatchDock(); syncSides(); if (!G.paused && !G.thinking && !G.over) advance(); };
  $('speedBtn').onclick = () => { if (!G) return; sfx('tap'); G.fast = !G.fast; drawWatchDock(); };
  $('numBtn').onclick = () => { if (!G) return; sfx('tap'); G.nums = !G.nums; drawWatchDock(); syncBoard(); };
  $('againBtn').onclick = () => { if (!G) return; sfx('tap'); newGame(G.cfg); };

  // 나가기: 끝난 판 · 구경 · 복기는 바로, 두는 중이면 두 번 눌러야 (Cozy.backGuard)
  const needGuard = () => !!(G && !G.over && !G.review && G.mode !== 'watch' && G.s.moves.length > 0);
  $('backBtn').addEventListener('click', e => { if (!needGuard()) { e.stopImmediatePropagation(); goMenu(); } });
  Cozy.backGuard($('backBtn'), goMenu, '한 번 더 누르면 메뉴로 나가요');

  // AI 한마디 (말풍선, 잠깐)
  let bubbleEl = null, bubbleT = 0, lastSayAt = 0;
  function say(kind, prob) {
    if (!kind || !G || G.mode !== 'ai' || Math.random() > prob) return;
    const t = G.cfg.tier, line = SAY[kind] && SAY[kind][t];
    if (!line || (kind !== 'win' && kind !== 'lose' && performance.now() - lastSayAt < 2500)) return;
    lastSayAt = performance.now();
    if (!bubbleEl) { bubbleEl = document.createElement('div'); bubbleEl.className = 'bubble say'; document.body.appendChild(bubbleEl); }
    bubbleEl.innerHTML = `${tier(t).em} ${esc(line)}`; bubbleEl.hidden = false;
    bubbleEl.style.animation = 'none'; void bubbleEl.offsetWidth; bubbleEl.style.animation = '';
    const side = $(G.me === 1 ? 'sideW' : 'sideB'); side.classList.remove('mood'); void side.offsetWidth; side.classList.add('mood');
    clearTimeout(bubbleT); bubbleT = setTimeout(hideBubble, 1700);
  }
  function hideBubble() { if (bubbleEl) bubbleEl.hidden = true; }

  // 탭이 가려지면 시계 멈춤 (구경은 수도 멈춤), 돌아오면 이어서
  document.addEventListener('visibilitychange', () => {
    if (!G || G.over || G.review) return;
    if (!document.hidden && G.players[G.s.turn].kind === 'ai' && !G.thinking) advance();
  });

  // 시험용 손잡이 (화면은 안 씀)
  window.__omok = {
    get G() { return G; }, Omok: O, board, think,
    play: i => tryPlace(i), act, newGame, goMenu, reviewTo, useHint, undo,
    state: () => G && O.toJSON(G.s),
  };

  // ── 시작 ──
  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl({
    game: 'omok', title: '오목', max: 2, min: 2,
    renderConfig: (cfg) => `${(O.RULES[cfg && cfg.rule] || O.RULES.standard).name} · 방장 ${(cfg && cfg.hostColor) === 2 ? '백' : '흑'}`,
    onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
  });
  OmokBoard.prewarm();
  getWorker();                                                         // 워커를 미리 깨워 둠 (첫 수가 빠르게)
  if (worker) think(O.toJSON(O.create(15, pref.rule)), { tier: 'easy' }).catch(() => {});
})();

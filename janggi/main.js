/* 장기 — 메뉴 · 상차림 · 대국 흐름 · 입력 · AI 워커 · AI 선생님 · 🎞️ 복기 · 지난 대국 · 친구랑(방장이 판의 주인)
   누가 어느 편을 두는지는 G.players[편] = { kind: 'human' | 'ai' | 'remote', tier, name }  (편 0 = 초 · 1 = 한)
   모든 수(상차림 · 한수 쉼 포함)는 act() 한 길로 들어가 JanggiCore.step() → 돌아온 사건(events)으로 움직임 · 소리 · 끝 처리 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const C = window.JanggiCore, Z = window.Cozy, esc = Z.esc;
  const sfx = (n, o) => Z.sfx.play(n, o);
  const store = (k, d) => Z.store('janggi.' + k, d), save = (k, v) => Z.save('janggi.' + k, v);
  const CN = ['초', '한'];
  const other = c => c ^ 1;
  const IGA = c => (c ? '한이' : '초가');   // 조사: 초가 · 한이
  const TIERS = {
    easy:   { em: '🐣', name: '초급', desc: '규칙을 익히는 중이에요', cls: 't-easy' },
    normal: { em: '🐱', name: '중급', desc: '잡고 피하는 걸 알아요', cls: 't-normal' },
    hard:   { em: '🐯', name: '고급', desc: '여러 수 앞을 읽어요', cls: 't-hard' },
  };
  const TIER_IDS = ['easy', 'normal', 'hard'];
  const tierLabel = t => `${TIERS[t].em} ${TIERS[t].name}`;
  const modals = [];
  function modal(o) {
    const oc = o.onClose;
    const close = Z.modal(Object.assign({}, o, { onClose: () => { const i = modals.indexOf(close); if (i >= 0) modals.splice(i, 1); if (oc) oc(); } }));
    modals.push(close);
    return close;
  }
  const closeModals = () => { for (const c of modals.slice().reverse()) c(); };

  // ── 고른 것 · 설정 ──
  const pref = Object.assign({ tab: 'solo', tier: 'normal', side: 0, rot: 'auto', wc: 'hard', wh: 'normal', speed: 'normal', setup: C.DEFAULT_SETUP, rules: C.normRules({}) }, store('pref', {}));
  if (pref.tab === 'friend') pref.tab = 'solo';
  pref.rules = C.normRules(pref.rules);
  const set = Object.assign({ glyph: 'jang', coords: true }, store('settings', {}));
  const savePref = () => save('pref', pref), saveSet = () => save('settings', set);
  const glyph = (t, side) => C.glyph(t, side, set.glyph === 'chohan' ? 'chohan' : 'jang');

  // ── 소리 (Web Audio 합성 · 나무 기물 '딱') ──
  Z.sfx.add('clack', (t, o, S) => { const p = 0.94 + Math.random() * 0.12; S.noise(t, 0.04, { vol: 0.5, type: 'bandpass', f: 1500 * p, q: 3 }); S.tone(t, 260 * p, 0.07, { vol: 0.26, f2: 150 }); S.noise(t + 0.012, 0.03, { vol: 0.18, type: 'highpass', f: 3200 }); });
  Z.sfx.add('capture', (t, o, S) => { S.noise(t, 0.06, { vol: 0.62, type: 'bandpass', f: 1100, q: 2 }); S.tone(t, 180, 0.1, { vol: 0.34, f2: 90 }); S.noise(t + 0.06, 0.05, { vol: 0.3, type: 'bandpass', f: 2200, q: 2.5 }); S.tone(t + 0.06, 220, 0.06, { vol: 0.15, f2: 120 }); });
  Z.sfx.add('janggun', (t, o, S) => { [0, 0.09].forEach(d => { S.noise(t + d, 0.05, { vol: 0.55, type: 'bandpass', f: 1300, q: 2.4 }); S.tone(t + d, 240, 0.06, { vol: 0.25, f2: 140 }); }); S.tone(t + 0.2, 784, 0.14, { type: 'triangle', vol: 0.13 }); S.tone(t + 0.32, 1046, 0.2, { type: 'triangle', vol: 0.13 }); });
  Z.sfx.add('bik', (t, o, S) => { S.tone(t, 196, 0.9, { type: 'sine', vol: 0.18, f2: 185 }); S.tone(t, 392, 0.6, { type: 'triangle', vol: 0.06 }); S.noise(t, 0.08, { vol: 0.3, type: 'lowpass', f: 900 }); });
  Z.sfx.add('start', (t, o, S) => { [S.N.G4, S.N.C5, S.N.E5].forEach((f, i) => S.tone(t + i * 0.08, f, 0.16, { type: 'triangle', vol: 0.12 })); });
  Z.sfx.add('hint', (t, o, S) => { [S.N.A5, S.N.E6].forEach((f, i) => S.tone(t + i * 0.07, f, 0.18, { vol: 0.09 })); });

  // ════════ 메뉴 ════════
  function seg(el, items, cur, on) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); on(b.dataset.v); };
  }
  const stats = () => store('stats', {});
  const recLine = t => { const r = stats()[t]; return r && (r.w || r.l || r.d) ? `${r.w}승 ${r.l}패${r.d ? ` ${r.d}무` : ''}` : ''; };
  // ── 🎞️ 지난 대국 (이 기기에 최근 20판): { t, mode, rules, moves(상차림 포함), end(기권), names, me, tier, res, winner, reason, title, n } ──
  const REC_MAX = 20;
  const records = () => { const a = store('records', []); return Array.isArray(a) ? a.filter(r => r && Array.isArray(r.moves)) : []; };
  function addRecord(r) { const list = records(); list.push(r); while (list.length > REC_MAX) list.shift(); save('records', list); }
  const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function openRecords() {
    sfx('tap');
    const list = records().reverse();
    const res = r => r.mode === 'ai' ? (r.res === 'w' ? ['이김', 'w'] : r.res === 'l' ? ['짐', 'l'] : ['무', 'd']) : r.winner === 0 || r.winner === 1 ? [`${CN[r.winner]} 승`, r.winner ? 'han' : 'cho'] : ['무', 'd'];
    const nm = (r, c) => (r.names && r.names[c]) || CN[c];
    const who = r => r.mode === 'ai' ? `${TIERS[r.tier] ? tierLabel(r.tier) : ''} AI · 내가 ${CN[r.me] || '?'}` : r.mode === 'online' ? `👥 친구랑 · ${nm(r, r.me === 1 ? 0 : 1)}님과` : `👥 ${nm(r, 0)} vs ${nm(r, 1)}`;
    const why = r => String(r.title || '').split(' · ').slice(1).join(' · ');
    const html = list.length ? `<ul class="reclist">${list.map((r, i) => { const [t, c] = res(r); return `<li data-i="${i}"><span class="res ${c}">${t}</span><span class="inf"><b>${esc(who(r))}</b><span class="small">${esc(why(r))}${why(r) ? ' · ' : ''}${r.n | 0}수 · ${when(r.t)}</span></span><button class="btn" type="button">🎞️ 복기</button></li>`; }).join('')}</ul><p class="recnote">이 기기에 최근 ${REC_MAX}판까지 남아요</p>`
      : '<p class="sub">아직 끝낸 대국이 없어요. 한 판 두면 여기에 남아요.</p>';
    const close = modal({ title: '🎞️ 지난 대국', html, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const ul = document.querySelector('.overlay .reclist');
    if (ul) ul.onclick = e => { const li = e.target.closest('li'); if (!li) return; const r = list[+li.dataset.i]; close(); sfx('tap'); openRecord(r); };
  }
  let seatPick = null;
  function drawMenu() {
    const tabs = { solo: 'tabSolo', duo: 'tabDuo', watch: 'tabWatch' };
    for (const t in tabs) $(tabs[t]).setAttribute('aria-pressed', String(pref.tab === t));
    $('soloBox').hidden = pref.tab !== 'solo'; $('duoBox').hidden = pref.tab !== 'duo'; $('watchBox').hidden = pref.tab !== 'watch';
    $('tiers').innerHTML = TIER_IDS.map(t => `<button class="tier ${TIERS[t].cls}" data-t="${t}" aria-pressed="${pref.tier === t}"><span class="em">${TIERS[t].em}</span><b>${TIERS[t].name}</b><span>${TIERS[t].desc}</span><span class="rec">${recLine(t)}</span></button>`).join('');
    $('tiers').onclick = e => { const b = e.target.closest('.tier'); if (!b) return; sfx('tap'); pref.tier = b.dataset.t; savePref(); drawMenu(); };
    seg($('sideSeg'), [[0, '<i class="dotc cho"></i>초 (먼저)'], [1, '<i class="dotc han"></i>한'], ['r', '🎲 랜덤']], pref.side, v => { pref.side = v === 'r' ? 'r' : +v; savePref(); drawMenu(); });
    seg($('rotSeg'), [['auto', '🔄 차례마다'], ['fixed', '돌리지 않기']], pref.rot, v => { pref.rot = v; savePref(); drawMenu(); });
    if (pref.tab === 'duo' && !seatPick && window.HotSeat) {
      try { seatPick = HotSeat.setup($('seats'), { game: 'janggi', min: 2, max: 2, allowAI: true, tiers: TIER_IDS.map(id => ({ id, emoji: TIERS[id].em, label: TIERS[id].name })) }); } catch (e) { seatPick = null; }
    }
    const tl = TIER_IDS.map(t => [t, tierLabel(t)]);
    seg($('watchC'), tl, pref.wc, v => { pref.wc = v; savePref(); drawMenu(); });
    seg($('watchH'), tl, pref.wh, v => { pref.wh = v; savePref(); drawMenu(); });
    seg($('speedSeg'), [['slow', '🐢 느리게'], ['normal', '보통'], ['fast', '🐇 빠르게']], pref.speed, v => { pref.speed = v; savePref(); drawMenu(); });
    $('ruleLine').textContent = '규칙: ' + C.ruleText(pref.rules);
    $('startBtn').textContent = pref.tab === 'watch' ? '▶ 구경 시작' : pref.tab === 'duo' ? '👥 둘이서 시작!' : `${tierLabel(pref.tier)} AI와 한 판!`;
    $('howtoList').hidden = pref.tab === 'watch';
    let mc = 0; try { mc = window.Mistakes ? Mistakes.count('janggi') : 0; } catch (e) {}
    $('mstBtn').hidden = !mc; $('mstBtn').textContent = `📒 아쉬운 장면 ${mc}`;
  }
  const tab = t => () => { sfx('tap'); pref.tab = t; savePref(); drawMenu(); };
  $('tabSolo').onclick = tab('solo'); $('tabDuo').onclick = tab('duo'); $('tabWatch').onclick = tab('watch');
  $('tabFriend').onclick = () => { sfx('tap'); openFriend(); };
  $('startBtn').onclick = () => { sfx('tap'); startFromMenu(); };
  $('helpBtn').onclick = () => rulesSheet();
  $('recBtn').onclick = () => openRecords();
  $('mstBtn').onclick = () => { sfx('tap'); if (window.Mistakes) Mistakes.open({ game: 'janggi' }); };
  $('setBtn').onclick = openSettings;
  $('ruleBtn').onclick = () => openRules(pref.rules, r => { pref.rules = r; savePref(); drawMenu(); });

  function startFromMenu() {
    const rules = pref.rules;
    if (pref.tab === 'watch') newGame({ mode: 'watch', wc: pref.wc, wh: pref.wh, speed: pref.speed, rules });
    else if (pref.tab === 'duo') {
      const seats = seatPick ? seatPick.seats : [{ kind: 'human', name: '사람 1' }, { kind: 'human', name: '사람 2' }];
      newGame({ mode: 'duo', seats, rot: pref.rot, rules });
    } else newGame({ mode: 'ai', tier: pref.tier, side: pref.side, rules });
  }
  // 규칙 고르기 창 (메뉴 · 친구랑 대기실 공용)
  function rulesForm(el, r, onChange) {
    const draw = () => {
      el.innerHTML = C.RULE_DEFS.map(d => `<div class="optrow"><span class="small">${esc(d.name)}</span><div class="seg" data-k="${d.k}"></div></div><p class="rhelp">${esc(d.help)}</p>`).join('');
      for (const d of C.RULE_DEFS) seg(el.querySelector(`[data-k="${d.k}"]`), d.opts.map(o => [String(o[0]), o[1]]), String(r[d.k]), v => { r = C.normRules(Object.assign({}, r, { [d.k]: v })); onChange(r); draw(); });
    };
    draw();
  }
  function openRules(cur, done) {
    sfx('tap');
    let r = C.normRules(cur);
    modal({ title: '규칙 바꾸기', html: '<div class="setlist" id="rForm"></div>', buttons: [{ label: '좋아요', primary: true, onClick: () => done(r) }], dismiss: true });
    rulesForm($('rForm'), r, x => { r = x; });
  }
  const PIECE_RULES = [
    ['k', 1, '궁', '궁성 안에서 줄을 따라 한 칸 (대각선은 금이 그어진 곳만)'],
    ['s', 2, '사', '궁과 똑같이, 궁성 안에서 한 칸'],
    ['m', 5, '차', '줄을 따라 몇 칸이든 (궁성 대각선도)'],
    ['m', 6, '포', '꼭 기물 하나를 넘어서 움직여요. 포는 넘을 수도, 잡을 수도 없어요'],
    ['m', 4, '마', '한 칸 곧게 + 한 칸 대각선. 첫 칸이 막히면 못 가요'],
    ['m', 3, '상', '한 칸 곧게 + 두 칸 대각선. 가는 길이 막히면 못 가요'],
    ['s', 7, '졸·병', '앞이나 옆으로 한 칸 (뒤로 X). 상대 궁성에선 앞 대각선도'],
  ];
  function rulesSheet() {
    sfx('tap');
    const r = G ? G.s.rules : pref.rules;
    const mini = (sz, t, side) => `<i class="pc ${side ? 'han' : 'cho'} ${sz} mini"><i class="o"><i class="i"><b>${glyph(t, side)}</b></i></i></i>`;
    const rows = PIECE_RULES.map(([sz, t, n, d]) => `<li>${mini(sz, t, 0)}${mini(sz, t, 1)}<b>${n}</b> ${esc(d)}</li>`).join('');
    const bik = r.bik === 'off' ? '없음 (마주 봐도 괜찮아요)' : `두 궁이 사이에 아무것도 없이 마주 보면 <b>빅장</b>! 상대가 바로 풀지 않으면 ${r.bik === 'draw' ? '<b>비겨요</b>' : '<b>점수</b>로 승패를 가려요'}`;
    modal({ title: '📖 장기 규칙', cls: 'rulesheet', dismiss: true, buttons: [{ label: '알겠어요', primary: true }], html: `<div class="rs">
      <p><b>초</b>(파랑)가 먼저, 한(빨강)이 뒤에 둬요. 상대 궁을 피할 곳 없이 몰면(<b>외통</b>) 이겨요.</p>
      <ul class="rs-p">${rows}</ul>
      <ul class="rs-l">
        <li><b>상차림</b>: 시작 전에 마·상 자리를 골라요 (한이 먼저). 이름은 내 자리에서 왼쪽부터 — 마상마상 · 상마상마 · 마상상마 · 상마마상</li>
        <li><b>장군</b>: 궁을 잡으려 함 · 받은 쪽은 꼭 피하거나 막아야 해요 (<b>멍군</b>). 내 궁이 잡히게 두는 수는 못 둬요</li>
        <li><b>빅장</b>: ${bik}</li>
        <li><b>한수 쉼</b>: ${r.pass ? '장군이 아니면 언제든 한 번 쉴 수 있어요' : '둘 곳이 없을 때만 쉬어요'}. 둘 다 연달아 쉬면 점수로 끝</li>
        <li><b>점수</b>: 차 13 · 포 7 · 마 5 · 상 3 · 사 3 · 졸 2, 한은 <b>덤 1.5</b> (처음 72 : 73.5)</li>
        <li>같은 국면 세 번 · ${r.limit}수가 되면 점수가 높은 쪽이 이겨요</li>
      </ul></div>` });
  }
  const HOWTO = [
    '시작하면 먼저 <b>상차림</b>(마·상 자리)을 골라요. 판에서 바로 미리 볼 수 있어요',
    '내 기물을 누르면 갈 수 있는 곳에 <b>점</b>이 찍혀요. 점을 누르면 둬요 (고리는 잡을 수 있는 기물)',
    '상대 궁을 피할 곳 없이 몰면(<b>외통</b>) 이겨요. 📖 규칙에서 기물 걸음을 볼 수 있어요',
    '🧑‍🏫 <b>AI 선생님</b>을 켜면 좋은 수를 화살표로 보여 주고 까닭도 알려 줘요',
    'AI 대전에서 실수했으면 ↶ 무르기 (내 수와 AI 수를 함께 물러요)',
  ];
  const howto = force => Z.howto('janggi', '장기 하는 법', HOWTO, { force: !!force });
  function openSettings() {
    sfx('tap');
    modal({ title: '⚙ 설정', html: `<div class="setlist">
      <div class="optrow"><span class="small">궁 글자</span><div class="seg" id="sGly"></div></div>
      <div class="optrow"><span class="small">줄 번호</span><div class="seg" id="sCoord"></div></div>
      <div class="optrow"><span class="small">소리</span><div class="seg" id="sSnd"></div></div></div>`, buttons: [{ label: '닫기', primary: true }], dismiss: true });
    const draw = () => {
      seg($('sGly'), [['jang', '將 · 帥'], ['chohan', '楚 · 漢']], set.glyph, v => { set.glyph = v; saveSet(); board.restyle(); if (G) drawBars(); draw(); });
      seg($('sCoord'), [['1', '보이기'], ['0', '숨기기']], set.coords ? '1' : '0', v => { set.coords = v === '1'; saveSet(); board.setCoords(set.coords); draw(); });
      seg($('sSnd'), [['1', '켬'], ['0', '끔']], Z.sfx.on ? '1' : '0', v => { Z.sfx.set(v === '1'); drawSnd(); draw(); });
    };
    draw();
  }

  // ════════ AI 워커 (수 두기용 · 선생님용 따로) ════════
  let mainAI = null;
  function loadMainAI() {
    if (mainAI) return mainAI;
    mainAI = new Promise((ok, bad) => { if (window.JanggiAI) return ok(window.JanggiAI); const sc = document.createElement('script'); sc.src = 'ai.js?v=1'; sc.onload = () => ok(window.JanggiAI); sc.onerror = bad; document.head.appendChild(sc); });
    return mainAI;
  }
  function makeWorker() {
    let w = null, okW = true, seq = 0;
    const waits = new Map();
    const kill = () => { if (w) w.terminate(); w = null; for (const [, x] of waits) x.bad(new Error('worker')); waits.clear(); };
    const get = () => {
      if (w || !okW) return w;
      try {
        w = new Worker('ai-worker.js?v=1');
        w.onmessage = e => { const x = waits.get(e.data.id); if (x) { waits.delete(e.data.id); x.ok(e.data.res); } };
        w.onerror = () => kill();
      } catch (e) { w = null; okW = false; }
      return w;
    };
    function think(game, opts) {
      const ww = get();
      if (!ww) return loadMainAI().then(ai => new Promise(ok => setTimeout(() => ok(ai.think(game, Object.assign({}, opts, { timeMs: Math.min(600, opts.timeMs || 600) }))), 20)));
      const id = ++seq;
      return new Promise((ok, bad) => {
        const t = setTimeout(() => { if (waits.has(id)) { waits.delete(id); kill(); bad(new Error('timeout')); } }, 12000);
        waits.set(id, { ok: r => { clearTimeout(t); ok(r); }, bad: e => { clearTimeout(t); bad(e); } });
        ww.postMessage({ id, game, opts });
      }).catch(() => loadMainAI().then(ai => ai.think(game, Object.assign({}, opts, { timeMs: 500 }))));
    }
    return { think, kill };
  }
  const AIW = makeWorker(), COACHW = makeWorker();

  // ════════ 대국 ════════
  const board = new JanggiBoard($('board'), {
    glyph,
    canPick: sq => { if (!humanTurn() || G.s.phase !== 'play') return false; const p = G.s.b[sq]; return !!p && (p >> 3) === G.s.turn; },
    targets: sq => C.legal(G.s, sq).map(m => ({ to: m.to, cap: !!m.captured })),
    onMove: (from, to) => humanMove(from, to),
    onPick: () => sfx('tap'),
  });
  board.setCoords(set.coords);
  let G = null, aiTimer = 0, reqId = 0;
  const show = which => {
    $('play').hidden = which !== 'play'; document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') { requestAnimationFrame(fit); pushHist(); }
  };
  // 판 크기: 무대(stage)에 맞춰 가로 9 : 세로 10
  function fit() {
    if ($('play').hidden) return;
    const st = $('stage'), w = st.clientWidth, h = st.clientHeight;
    const bw = Math.floor(Math.min(w, h * 0.9));
    if (bw > 60) { const el = $('board'); el.style.width = bw + 'px'; el.style.height = Math.round(bw * 10 / 9) + 'px'; el.style.setProperty('--cell', (bw / 9).toFixed(2) + 'px'); }
  }
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe($('stage'));
  addEventListener('resize', () => requestAnimationFrame(fit));

  function newGame(cfg) {
    stopAll(); rvClear();
    // cfg.start: 복기에서 '여기서부터 내가 두기' — 그 장면까지의 수(상차림 포함)로 시작 · cfg.branch = 몇 수째 (전적·기록엔 안 넣음)
    const s = cfg.start ? C.fromJSON({ rules: cfg.rules, moves: cfg.start }) : C.create({ rules: cfg.rules });
    let me = null, players;
    const ai = t => ({ kind: 'ai', tier: t, name: `${tierLabel(t)} AI` });
    if (cfg.mode === 'ai') {
      me = cfg.side === 1 ? 1 : cfg.side === 'r' ? (Math.random() < 0.5 ? 0 : 1) : 0;
      players = []; players[me] = { kind: 'human', name: (window.GME && GME.me && GME.me.name) || '나' }; players[other(me)] = ai(cfg.tier);
    } else if (cfg.mode === 'duo') {
      const sp = (x, i) => x && x.kind === 'ai' ? ai(x.tier || 'normal') : { kind: 'human', name: (x && x.name) || `사람 ${i + 1}` };
      players = [sp(cfg.seats[0], 0), sp(cfg.seats[1], 1)];
    } else if (cfg.mode === 'online') {
      me = sideOf(cfg.seats, cfg.uid);
      players = onlinePlayers(cfg.seats, me);
    } else players = [ai(cfg.wc), ai(cfg.wh)];
    G = { cfg, mode: cfg.mode, s, me, players, over: false, thinking: false, paused: false, undos: 0, coachUsed: 0, round: cfg.round || 0, seats: cfg.seats || null,
      t0: Date.now(), coachRes: null, review: null, preview: null, branch: cfg.start && cfg.branch != null ? cfg.branch : null, rv: null, saved: false };
    board.clearSel(); board.setArrow(null);
    board.setFlip((cfg.mode === 'ai' || cfg.mode === 'online') ? me === 1 : false);
    if (cfg.mode === 'online') closeModals();
    show('play');
    render(null);
    drawDock(); coachEnter();
    sfx('start');
    if (cfg.drill) {                                                       // 📒 아쉬웠던 장면: 선생님은 켠 채로, 첫 수 답은 '💡 답 보기'를 눌러야 보임 (coachTick)
      if (coachBox) { coachBox.show(); coachBox.collapse(false); }
      Z.toast('📒 아쉬웠던 장면부터 다시 — 이번엔 추천 수를 찾아보세요', 3000);
    } else if (G.branch != null) {                                         // 연습 판: 선생님을 켠 채로 시작
      if (coachBox) { coachBox.show(); coachBox.collapse(false); }
      Z.toast(`🎮 ${G.branch}수째부터 내가 ${me ? '한으로' : '초로'} 둬요 · 연습 판이라 전적엔 안 넣어요`, 2600);
    } else if (cfg.mode === 'ai') Z.toast(me === 0 ? `${cfg.side === 'r' ? '🎲 이번엔 ' : ''}내가 초예요. 한이 상차림을 고르면 내가 골라요` : `${cfg.side === 'r' ? '🎲 이번엔 ' : ''}내가 한이에요. 상차림을 먼저 골라요`, 2200);
    else if (cfg.mode === 'online' && !cfg.quiet) Z.toast(!me && me !== 0 ? '👀 구경 중이에요. 다음 판에 빈자리가 나면 앉을 수 있어요' : me === 0 ? '🔵 내가 초예요. 먼저 둬요!' : '🔴 내가 한이에요. 상차림을 먼저 골라요', 2000);
    if (cfg.mode !== 'watch' && cfg.mode !== 'online' && G.branch == null) howto(false);
    const g = G;
    setTimeout(() => { if (G === g) advance(); }, cfg.mode === 'watch' ? 500 : 300);
  }
  function stopAll() { clearTimeout(aiTimer); reqId++; turnStop(); if (G) G.thinking = false; }
  function leaveRoom() { if (!ON) return; const n = ON.net; endOnline(); leaving = true; try { if (window.ArenaUI && ArenaUI.net === n) ArenaUI.leave(); else n.leave(); } catch (e) {} leaving = false; }
  function goMenu() {
    leaveRoom();
    stopAll(); rvClear(); coachHide();
    G = null; $('viewbar').hidden = true; $('setupBox').hidden = true; show('menu'); drawMenu(); closeModals();
    popHist();
  }
  let histOn = false;
  function pushHist() { if (histOn) return; try { history.pushState({ janggi: 1 }, ''); histOn = true; } catch (e) {} }
  function popHist() { if (!histOn) return; histOn = false; try { history.back(); } catch (e) {} }
  addEventListener('popstate', () => {
    if (!histOn) return;
    histOn = false;
    if (!G || $('play').hidden) return;
    if (modals.length) { modals[modals.length - 1](); pushHist(); return; }
    pushHist(); tryLeave();
  });
  const isSpec = () => !!(G && G.mode === 'online' && G.me == null);
  const needGuard = () => !!(G && !G.over && G.mode !== 'watch' && G.s.plies > 0 && !isSpec());
  function tryLeave() {
    if (G && G.rv) { if (G.rv.back) rvExit(); else goMenu(); return; }   // 복기: 끝난 판에서 왔으면 결과 창으로, 지난 대국에서 왔으면 메뉴로
    if (!needGuard()) { goMenu(); return; }
    modal({ title: '나갈까요?', html: `<p class="sub">${G.mode === 'online' ? '나가면 이번 판은 기권으로 끝나요.' : '지금 판은 저장되지 않아요.'}</p>`, buttons: [{ label: '계속 두기', primary: true }, { label: '나가기', onClick: () => { if (G && G.mode === 'online' && G.me != null && !G.over) act({ resign: G.me }); goMenu(); } }], dismiss: true });
  }
  $('backBtn').onclick = () => { sfx('tap'); tryLeave(); };

  // 지금 둘 차례가 이 화면의 사람인가
  const humanTurn = () => {
    if (!G || G.over || G.thinking) return false;
    const c = G.s.turn;
    if (G.mode === 'online') return G.me === c;
    return G.players[c].kind === 'human';
  };
  function humanMove(from, to) {
    if (!humanTurn()) return;
    const u = C.sqName(from) + C.sqName(to);
    if (!act(u)) { render(null); sfx('bad'); }
  }

  // 행동 하나: '7978' · 'pass' · 'h=2' · { resign: 편 }. 사람·AI·친구 모두 이 길로
  function act(a, info) {
    info = info || {};
    if (!G || G.over) return false;
    const g = G, s = g.s, n0 = s.moves.length, prevKey = posKey();
    const ev = typeof a === 'string' ? C.step(s, a) : a.resign != null ? C.resign(s, a.resign) : [{ type: 'illegal' }];
    if (ev[0].type === 'illegal') return false;
    if (g.mode === 'online' && ON) {                                       // 방장은 확인한 수를 모두에게, 손님은 내 수를 방장에게 (꼭 도착)
      if (ON.host) ON.net.broadcast(typeof a === 'string' ? { t: 'move', u: a, n: n0, round: g.round } : { t: 'end', round: g.round, winner: s.winner, reason: s.reason }, true);
      else if (info.from !== 'remote') ON.net.send(typeof a === 'string' ? { t: 'move', u: a, n: n0, round: g.round } : { t: 'resign', round: g.round }, true);
    }
    const mv = ev.find(e => e.type === 'move'), su = ev.find(e => e.type === 'setup');
    board.clearSel(); board.setArrow(null);
    if (su) g.preview = null;
    render(mv && !mv.pass ? mv : null);
    if (su) sfx('clack');
    if (ev.some(e => e.type === 'start')) { Z.toast('상차림 끝! 초부터 둬요', 1500); }
    if (mv) {
      sfx(mv.pass ? 'tap' : mv.captured ? 'capture' : 'clack');
      if (mv.pass) Z.toast(`${CN[mv.side]} 한수 쉼`, 1300);
      if (mv.check) { setTimeout(() => { if (G === g) { sfx('janggun'); board.banner(mv.escaped ? '멍군 장군!' : '장군!', 'chk'); } }, 120); }
      else if (mv.escaped && !mv.pass) setTimeout(() => { if (G === g) board.banner('멍군!', 'mung'); }, 120);
      if (ev.some(e => e.type === 'bikjang')) setTimeout(() => { if (G === g) { sfx('bik'); board.banner('빅장!', 'bik'); } }, 160);
      if (info.from !== 'remote' || g.me != null) buzz(mv.captured ? 14 : 7);
      if (g.players[mv.side] && g.players[mv.side].kind === 'human') {
        g.review = g.coachRes && g.coachRes.key === prevKey ? { prev: g.coachRes, played: mv.uci, label: C.notation(mv), game: C.toJSON(s) } : null;
        if (g.cfg.drill && g.cfg.start && n0 === g.cfg.start.length) drillCheck(g, { rules: s.rules, moves: s.moves.slice(0, n0) }, mv.uci);   // 📒 그 장면 첫 수 채점
      }
    }
    if (s.over) finish();
    else advance();
    return true;
  }
  const posKey = () => G ? G.round + ':' + G.s.moves.join(' ') : '';

  function advance() {
    if (!G || G.over) return;
    const c = G.s.turn, pl = G.players[c];
    if (G.mode === 'duo' && G.cfg.rot === 'auto' && pl.kind === 'human' && G.players[0].kind === 'human' && G.players[1].kind === 'human') {
      const g = G; setTimeout(() => { if (G === g && g.s.turn === c) { board.setFlip(c === 1); drawBars(); } }, 420);
    }
    drawStat(); drawBars(); drawSetup(); drawDock();
    if (pl.kind === 'ai' && !G.thinking && !(G.mode === 'watch' && G.paused)) requestAI();
    coachTick();
    if (G.mode === 'online') { subTurn(); turnSync(); }
  }
  function requestAI() {
    const g = G, s = g.s, c = s.turn, pl = g.players[c], id = ++reqId, t0 = performance.now();
    g.thinking = true; drawStat(); drawBars();
    const sp = g.mode === 'watch' ? g.cfg.speed : 'normal';
    const minWait = s.phase === 'setup' ? 450 : g.mode === 'watch' ? (sp === 'fast' ? 120 : sp === 'slow' ? 1100 : 550) : pl.tier === 'easy' ? 550 + Math.random() * 350 : 350 + Math.random() * 250;
    const opts = { tier: pl.tier, seed: (Math.random() * 1e9) | 0 };
    if (g.mode === 'watch' && sp === 'fast' && pl.tier === 'hard') opts.timeMs = 350;
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

  // ── 상차림 고르기 (내 차례일 때 판 아래 칸) ──
  function drawSetup() {
    const box = $('setupBox');
    const on = !!(G && !G.over && G.s.phase === 'setup' && humanTurn());
    box.hidden = !on; $('moves').hidden = on;
    // 상차림 고르는 동안은 선생님 창을 잠깐 치움 (고르기 칸 · 내 끝줄을 가리지 않게), 끝나면 다시
    if (on && coachBox && coachBox.visible) { coachBox.hide(); G.coachAway = true; }
    if (!on && G && G.coachAway) { G.coachAway = false; if (coachAvail() && coachBox && !CoachPanel.isOff('janggi')) { coachBox.show(); coachTick(); } }
    if (!on) { if (G && G.preview != null && G.s.phase !== 'setup') G.preview = null; return; }
    const side = G.s.turn;
    if (G.preview == null) G.preview = pref.setup != null ? +pref.setup : C.DEFAULT_SETUP;
    const who = G.mode === 'duo' ? `${CN[side]} · ${esc(G.players[side].name)}` : `내 상차림 (${CN[side]})`;
    $('suTitle').innerHTML = `${who} 고르기`;
    $('suSub').textContent = side === 1 ? '한이 먼저 골라요' : G.s.setup[1] >= 0 ? `한은 ${C.SETUPS[G.s.setup[1]].name}` : '';
    const mini = (t, i) => `<i class="pc ${side ? 'han' : 'cho'} m mini"><i class="o"><i class="i"><b>${glyph(t, side)}</b></i></i></i>`;
    $('suOpts').innerHTML = C.SETUPS.map(x => `<button class="su-o" data-i="${x.id}" aria-pressed="${G.preview === x.id}"><span class="su-p">${[...x.name].map((ch, i) => mini(ch === '마' ? C.H : C.E, i)).join('')}</span><b>${x.name}</b></button>`).join('');
    $('suDesc').textContent = C.SETUPS[G.preview].desc;
    render(null);
  }
  $('suOpts').onclick = e => {
    const b = e.target.closest('.su-o'); if (!b || !G || G.s.phase !== 'setup' || !humanTurn()) return;
    sfx('tap'); G.preview = +b.dataset.i; drawSetup(); coachTick();
  };
  $('suGo').onclick = () => {
    if (!G || G.s.phase !== 'setup' || !humanTurn()) return;
    const idx = G.preview != null ? G.preview : C.DEFAULT_SETUP;
    if (G.mode === 'ai' || G.mode === 'online') { pref.setup = idx; savePref(); }
    act((G.s.turn === 1 ? 'h=' : 'c=') + idx);
  };

  // ── 화면 그리기 ──
  // 화면에 보이는 판: 복기 중이면 그 장면(G.rv.s), 아니면 지금 판(G.s — 친구랑 방장 · 손님 동기화는 늘 G.s 로)
  const V = () => (G.rv ? G.rv.s : G.s);
  function render(mv) {
    if (!G) return;
    const rv = G.rv, s = V();
    const prev = !rv && s.phase === 'setup' && G.preview != null && humanTurn();
    board.set(prev ? C.previewBoard(s, s.turn, G.preview) : C.board(s), mv);
    const chk = s.phase === 'play' && s.check ? C.lo.kingSq(s.b, s.turn) : null;
    const last = s.last && !s.last.pass ? [s.last.from, s.last.to] : null;
    if (rv) {                                                              // 복기: 추천 수(초록) + 실제로 둔 수(주황 점선) + 그 수가 다음에 노리는 수(보라 점선) — 선생님을 켰을 때만
      const open = coachOpen() && !s.over, h = open ? rv.cache[rv.k] : null, nx = open ? rv.plays[rv.k] : null;
      const hint = h && h.from != null ? [h.from, h.to] : null;
      const real = nx && !nx.pass && !(h && h.move === nx.uci) ? [nx.from, nx.to] : null;
      const ti = nx ? rvThreatInfo(rv, rv.k) : null;
      board.setMarks({ last, check: chk, hint });
      board.setArrow(hint, real, ti && ti.arrow);
    } else {
      const showHint = G.coachRes && G.coachRes.key === posKey() && coachOpen() && !G.over && G.coachRes.from != null;
      board.setMarks({ last, check: chk, hint: showHint ? [G.coachRes.from, G.coachRes.to] : null });
      board.setArrow(showHint ? [G.coachRes.from, G.coachRes.to] : null);
    }
    drawBars(); drawMoves(); drawStat();
  }
  function nameOf(c) {
    if (G.mode === 'online') { const u = G.seats && G.seats[c]; return u ? nmOf(u) : '빈자리'; }
    return G.players[c].name;
  }
  const miniPc = (t, side, cls) => `<i class="pc ${side ? 'han' : 'cho'} ${t === 1 ? 'k' : t === 2 || t === 7 ? 's' : 'm'} ${cls || 'mini'}"><i class="o"><i class="i"><b>${glyph(t, side)}</b></i></i></i>`;
  function drawBars() {
    if (!G) return;
    const S = V(), bot = board.flip ? 1 : 0, top = other(bot), cap = C.captured(S), t = S.turn, sc = C.score(S);
    for (const [id, c] of [['pTop', top], ['pBot', bot]]) {
      const el = $(id), pl = G.players[c];
      el.dataset.c = c;
      const mine = (G.mode === 'ai' || G.mode === 'online' || G.mode === 'record') && G.me === c;
      const caps = cap[c].map(x => miniPc(x, other(c), 'cap')).join('');
      const pts = c ? sc.han : sc.cho;
      el.innerHTML = `${miniPc(1, c, 'pk')}
        <span class="pn"><b class="nm">${esc(nameOf(c))}${mine && nameOf(c) !== '나' ? '<span class="tag">나</span>' : ''}<small>${CN[c]}${S.phase === 'setup' && S.setup[c] >= 0 ? ' · ' + C.SETUPS[S.setup[c]].name : ''}</small></b><span class="caps">${caps}</span></span>
        <span class="pts" title="점수 (차13 포7 마5 상3 사3 졸2${c ? ' + 덤 1.5' : ''})">${pts}<small>점</small></span>`;
      el.classList.toggle('turn', (G.rv ? !S.over : !G.over) && t === c);
      el.classList.toggle('think', !!(G.thinking && t === c && pl && pl.kind === 'ai'));
    }
    if (G.mode === 'online') drawViewers();
  }
  function drawMoves() {
    if (!G) return;
    const el = $('moves'), rv = G.rv;
    // 복기: 판 전체 기보를 보이고 지금 장면까지만 밝게 · 누르면 그 수로
    const hist = rv ? rv.full.hist : G.s.hist, cur = rv ? rv.plays[rv.k - 1] : G.s.last, K = rv ? rv.k : Infinity;
    let html = '', n = 0;
    for (const h of hist) {
      if (h.type === 'setup') { html += `<span class="m su ${h.side ? 'han' : 'cho'}"${rv ? ' data-k="0"' : ''}>${CN[h.side]} ${esc(C.SETUPS[h.idx].name)}</span>`; continue; }
      n++;
      html += `<span class="no">${n}</span><span class="m ${h.side ? 'han' : 'cho'}${h === cur ? ' cur' : ''}${n > K ? ' fut' : ''}"${rv ? ` data-k="${n}"` : ''} title="${esc(C.describe(h))}">${esc(C.notation(h))}${h.check ? '<i>장</i>' : ''}</span>`;
    }
    el.innerHTML = html;
    el.classList.toggle('rv', !!rv);
    if (!rv) el.scrollLeft = el.scrollWidth;
    else {                                                                 // 지금 수를 가운데로 (세로 화면은 옆으로, 가로 화면은 위아래로)
      const c = el.querySelector('.cur'), er = el.getBoundingClientRect();
      if (!c) { el.scrollLeft = 0; el.scrollTop = 0; }
      else { const cr = c.getBoundingClientRect(); el.scrollLeft += cr.left - er.left - (er.width - cr.width) / 2; el.scrollTop += cr.top - er.top - (er.height - cr.height) / 2; }
    }
    $('movePill').textContent = `${V().plies}수`;
  }
  $('moves').onclick = e => { if (!G || !G.rv) return; const m = e.target.closest('[data-k]'); if (m) rvGoto(+m.dataset.k); };
  function drawStat() {
    if (!G) return;
    const st = $('stat');
    st.classList.remove('thinking', 'myturn', 'warn'); $('stage').classList.remove('myturn');
    if (G.rv) {                                                            // 복기: 그 장면에서 둘 차례 · 끝 장면이면 결과
      const v = G.rv.s;
      $('lbl').textContent = '🎞️ 복기 · ' + modeName(G);
      st.textContent = v.over ? resultLine(v) : `${CN[v.turn]} 차례${v.check ? ' · 장군!' : ''}${v.bik ? ' · 빅장!' : ''}`;
      if (!v.over && (v.check || v.bik)) st.classList.add('warn');
      return;
    }
    const s = G.s, c = s.turn, pl = G.players[c];
    const lbl = G.branch != null ? `🎮 연습 · ${tierLabel(G.cfg.tier)} AI` : G.mode === 'ai' ? `${tierLabel(G.cfg.tier)} AI와 대국` : G.mode === 'duo' ? '👥 둘이서' : G.mode === 'online' ? '👥 친구랑' : `👀 ${tierLabel(G.cfg.wc)} vs ${tierLabel(G.cfg.wh)}`;
    $('lbl').textContent = lbl;
    if (s.over) { st.textContent = resultLine(); return; }
    if (s.phase === 'setup') {
      const mine = humanTurn();
      st.textContent = mine ? (G.mode === 'duo' ? `${CN[c]} 상차림을 골라요` : '내 상차림을 골라요') + (G.mode === 'online' && TT.left != null ? ` · ⏱${TT.left}` : '') : `${CN[c]} 상차림 고르는 중…`;
      if (mine && G.mode === 'online') { st.classList.add('myturn'); }
      return;
    }
    const tail = (s.check ? ' · 장군!' : '') + (s.bik ? ` · 빅장! ${s.rules.bik === 'draw' ? '안 풀면 비김' : '안 풀면 점수'}` : '');
    if (s.check || s.bik) st.classList.add('warn');
    if (G.thinking && pl.kind === 'ai') { st.textContent = `${CN[c]} AI가 생각 중` + tail; st.classList.add('thinking'); return; }
    if (G.mode === 'ai') st.textContent = (c === G.me ? '내 차례' : '상대 차례') + tail;
    else if (G.mode === 'online') {
      const mine = humanTurn(), u = G.seats && G.seats[c];
      st.textContent = (mine ? '내 차례' + (TT.left != null ? ` · ⏱${TT.left}` : '') : G.me != null ? `${u ? nmOf(u) + '님' : '상대'} 차례${u && ON && ON.sub[u] ? ' 🤖' : ''}` : `${CN[c]} ${u ? nmOf(u) + '님 ' : ''}차례`) + tail;
      if (mine) { st.classList.add('myturn'); $('stage').classList.add('myturn'); }
    } else st.textContent = `${CN[c]} 차례${G.mode === 'duo' && pl.kind === 'human' ? ` · ${pl.name}` : ''}${tail}`;
  }
  function resultLine(s) {
    s = s || G.s; const why = reasonText(s);
    return s.winner != null ? `${CN[s.winner]} 승 · ${why}` : `무승부 · ${why}`;
  }
  // 어떤 판이었나 (복기 머리글 · 지난 대국): 기록에서 연 판은 cfg.mode 가 원래 모드
  const modeName = g => { const m = g.mode === 'record' ? g.cfg.mode : g.mode; return m === 'ai' ? `${TIERS[g.cfg.tier] ? tierLabel(g.cfg.tier) : ''} AI` : m === 'duo' ? '둘이서' : m === 'online' ? '친구랑' : 'AI 구경'; };
  const reasonText = s => s.reason === 'limit' ? `${s.rules.limit}수 제한 (점수)` : s.reason === 'mate' || s.reason === 'resign' ? C.REASON[s.reason] : s.reason === 'bikjang' && s.winner == null ? '빅장' : `${C.REASON[s.reason] || s.reason} (점수)`;
  function drawDock() {
    const m = G ? G.mode : '';
    const play = !!(G && !G.over && G.s.phase === 'play');
    $('undoBtn').hidden = !(m === 'ai' || m === 'duo');
    $('undoBtn').disabled = !(G && G.s.plies > 0 && G.s.moves.length > undoFloor());
    $('resignBtn').hidden = !(m === 'ai' || m === 'duo' || (m === 'online' && G.me != null));
    $('passBtn').hidden = m === 'watch' || isSpec();
    $('passBtn').disabled = !(play && humanTurn() && C.legal(G.s).some(x => x.pass));
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
  const drawSnd = () => { $('sndBtn').querySelector('.ic').textContent = Z.sfx.on ? '🔊' : '🔇'; };

  $('flipBtn').onclick = () => { if (!G) return; sfx('flip'); board.setFlip(!board.flip); drawBars(); };
  $('rulesBtn').onclick = () => rulesSheet();
  $('passBtn').onclick = () => {
    if (!G || G.over || !humanTurn() || G.s.phase !== 'play' || !C.legal(G.s).some(x => x.pass)) { sfx('bad'); return; }
    sfx('tap');
    const two = G.s.passes > 0, sc = C.score(G.s), lead = (G.s.turn ? sc.han > sc.cho : sc.cho > sc.han);
    modal({ title: '⏭ 한수 쉴까요?', html: `<p class="sub">${two ? `상대도 방금 쉬었어요. 지금 쉬면 <b>점수로 끝나요</b> (초 ${sc.cho} : 한 ${sc.han}) — ${lead ? '내가 이겨요!' : '내가 져요'}` : '이번 차례를 그냥 넘겨요.'}</p>`, buttons: [{ label: '쉬기', primary: true, onClick: () => { if (G && humanTurn()) act('pass'); } }, { label: '그만두기' }], dismiss: true });
  };
  const undoFloor = () => (G && G.cfg.start ? G.cfg.start.length : 0);   // 연습 판은 시작한 장면 앞으로는 못 무름
  $('undoBtn').onclick = () => {
    if (!G || G.rv || !(G.mode === 'ai' || G.mode === 'duo') || !G.s.plies || G.s.moves.length <= undoFloor()) { sfx('bad'); return; }
    cancelAI();
    const s = G.s, human = c => G.players[c].kind === 'human', floor = undoFloor();
    do { C.undo(s, 1); } while (s.plies > 0 && s.moves.length > floor && !human(s.turn));
    G.over = false; G.undos++; G.review = null; G.coachRes = null;
    sfx('flip'); render(null); drawDock();
    advance();
  };
  $('resignBtn').onclick = () => {
    if (!G || G.over) return;
    const who = G.mode === 'duo' ? G.s.turn : G.me;
    if (who == null) return;
    sfx('tap');
    modal({ title: '🏳️ 기권할까요?', html: `<p class="sub">${G.mode === 'duo' ? `${CN[who]} 편 ${esc(G.players[who].name)} 님이 기권해요` : '이번 판은 지는 걸로 끝나요'}</p>`, buttons: [{ label: '계속 두기', primary: true }, { label: '기권', onClick: () => { if (G && !G.over) { cancelAI(); act({ resign: who }); } } }], dismiss: true });
  };
  $('pauseBtn').onclick = () => { if (!G) return; G.paused = !G.paused; sfx('tap'); drawWatchDock(); if (!G.paused) advance(); };
  $('speedBtn').onclick = () => { if (!G) return; const o = ['slow', 'normal', 'fast']; G.cfg.speed = o[(o.indexOf(G.cfg.speed) + 1) % 3]; pref.speed = G.cfg.speed; savePref(); sfx('tap'); drawWatchDock(); };
  $('againBtn').onclick = () => { if (G) { sfx('tap'); newGame(G.cfg); } };

  // ── 끝 ──
  function finish() {
    const g = G; g.over = true; cancelAI(); board.setArrow(null); $('setupBox').hidden = true; $('moves').hidden = false;
    if (g.mode === 'online') { turnStop(); if (ON && ON.goneAsk) { try { ON.goneAsk(); } catch (e) {} } countScore(g); }
    const s = g.s, w = s.winner;
    let res = 'd';
    if (g.mode === 'ai') res = w == null ? 'd' : w === g.me ? 'w' : 'l';
    if (g.mode === 'ai' && g.branch == null) { const st = stats(), r = st[g.cfg.tier] || { w: 0, l: 0, d: 0 }; r[res]++; st[g.cfg.tier] = r; save('stats', st); }   // 복기에서 이어 둔 연습 판은 전적에 안 넣음
    // 🎞️ 지난 대국에 남김: AI 대전 · 둘이서 · 친구랑(내가 둔 판). AI 구경 · 구경꾼 · 연습 판은 안 남김 (복기는 결과 창에서 바로 볼 수 있음)
    if (!g.saved && g.branch == null && s.plies > 0 && (g.mode === 'ai' || g.mode === 'duo' || (g.mode === 'online' && g.me != null))) {
      g.saved = true;
      const j = C.toJSON(s);
      g.rec = { t: Date.now(), mode: g.mode, rules: j.rules, moves: j.moves, end: j.end, names: [nameOf(0), nameOf(1)], me: g.me, tier: g.mode === 'ai' ? g.cfg.tier : undefined, res, winner: w, reason: s.reason, title: resultLine(s), n: s.plies };
      try { addRecord(g.rec); } catch (e) {}
      if (g.mode === 'ai') setTimeout(() => autoScan(g), 1500);          // 📒 내 수 중 가장 아쉬운 것 1~3개를 뒤에서 찾아 노트에
    }
    render(null); drawDock();
    const humanWon = g.mode === 'ai' ? res === 'w' : g.mode === 'online' ? g.me != null && w === g.me : g.mode === 'duo' ? w != null && g.players[w].kind === 'human' : false;
    setTimeout(() => {
      if (G !== g) return;
      if (humanWon) { sfx('win'); Z.confetti(); } else if (w != null && (g.mode === 'ai' || (g.mode === 'online' && g.me != null))) sfx('lose'); else sfx('count');
    }, 250);
    if (s.reason === 'mate') setTimeout(() => { if (G === g) board.banner('외통!', 'chk'); }, 300);
    coachTick();
    setTimeout(() => { if (G === g) showResult(); }, s.reason === 'mate' ? 1400 : 700);
  }
  const fmtT = ms => { const x = Math.round(ms / 1000); return `${Math.floor(x / 60)}분 ${x % 60}초`; };
  function showResult() {
    const g = G, s = g.s, w = s.winner, n = s.plies, why = reasonText(s), sc = C.score(s);
    const pts = s.reason !== 'mate' && s.reason !== 'resign' ? `<p class="pline"><span class="cho">초 ${sc.cho}점</span> : <span class="han">한 ${sc.han}점</span> <small>(덤 1.5 포함)</small></p>` : '';
    let title, body = '';
    if (g.mode === 'ai') {
      const T = TIERS[g.cfg.tier], r = stats()[g.cfg.tier] || { w: 0, l: 0, d: 0 };
      const rec = g.branch != null ? `<p class="why">🎮 연습 판 (${g.branch}수째부터) · 전적엔 안 넣어요</p>` : `<p class="why">${T.em} ${T.name} 전적 ${r.w}승 ${r.l}패${r.d ? ` ${r.d}무` : ''}</p>`;
      if (w === g.me) {
        const stars = 1 + (g.undos ? 0 : 1) + (g.coachUsed ? 0 : 1);
        title = '🎉 이겼어요!';
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < stars ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <p class="bigline">${T.em} ${T.name} AI를 이겼어요 · ${why}</p>${pts}<p class="sub">${n}수 · ${fmtT(Date.now() - g.t0)}</p>
          <p class="why">${g.undos ? `무르기 ${g.undos}번` : '무르기 0 ✓'} · ${g.coachUsed ? '선생님 도움 받음' : '선생님 없이 ✓'}</p>${rec}`;
      } else if (w != null) {
        title = '😿 아쉽게 졌어요';
        body = `<p class="bigline">${T.em} ${T.name} AI가 이겼어요 · ${why}</p>${pts}<p class="sub">${n}수 · ${fmtT(Date.now() - g.t0)}</p>
          <p class="why">${s.reason === 'mate' ? '궁 둘레(사·궁성)를 비워 두지 말고, 상대 차·포가 노리는 줄을 미리 막아요. 🧑‍🏫 AI 선생님을 켜면 도움이 돼요' : '점수(잡은 기물)를 지키면서 끝까지 버텨 봐요!'}</p>${rec}`;
      } else { title = '🤝 비겼어요'; body = `<p class="bigline">${why}</p>${pts}<p class="sub">${n}수</p>${rec}`; }
    } else {
      const nm = c => esc(nameOf(c));
      if (g.mode === 'online' && g.me != null) title = w == null ? '🤝 비겼어요' : w === g.me ? '🎉 이겼어요!' : '😿 아쉽게 졌어요';
      else title = w != null ? `${CN[w]} 승리!` : '🤝 비겼어요';
      body = (w != null ? `<div class="winp">${miniPc(1, w, 'big')}</div><p class="bigline">${nm(w)}</p>` : '') + `<p class="sub">${why} · ${n}수</p>` + pts +
        (isSpec() ? `<p class="why">👀 구경 중 · ${ON && ON.host ? '' : '방장이 다음 판을 시작하면 이어서 봐요'}</p>` : '');
    }
    const online = g.mode === 'online' && !!ON;
    if (online) body += '<div class="rdy" id="rdyBox"></div>';
    const rvb = n > 0 ? [{ label: '🎞️ 복기', onClick: () => { if (G === g) reviewNow(); } }] : [];
    const btns = online
      ? rvb.concat([{ label: '기보 복사', onClick: () => { copyKibo(); return false; } }], ON.host && window.ArenaUI ? [{ label: '대기실', onClick: () => ArenaUI.toLobby() }] : [], [{ label: '메뉴', ghost: true, onClick: () => goMenu() }])
      : [
        { label: g.mode === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => again() },
        ...rvb,
        { label: '기보 복사', onClick: () => { copyKibo(); return false; } },
        { label: '메뉴', ghost: true, onClick: () => goMenu() },
      ];
    modal({ title, html: body, buttons: btns });
    if (online) { const box = document.getElementById('rdyBox'); if (box) { wireReady(box); drawReady(); } }
  }
  function copyKibo() {
    if (!G) return;
    const txt = C.kiboText(G.s, [nameOf(0), nameOf(1)]);
    const done = () => Z.toast('기보를 복사했어요');
    try { navigator.clipboard.writeText(txt).then(done, () => Z.toast('복사하지 못했어요')); } catch (e) { Z.toast('복사하지 못했어요'); }
  }
  function again() {
    if (!G) return;
    if (G.mode === 'online') { if (!ON) goMenu(); else if (G.over) showResult(); return; }
    const cfg = G.cfg;
    if (cfg.mode === 'ai' && cfg.side !== 'r') cfg.side = G.me;
    newGame(cfg);
  }

  // ════════ AI 선생님 (공용 창 CoachPanel + 아래 줄 단추 하나) ════════
  let coachBox = null;
  function coachSetup() {
    if (coachBox || !window.CoachPanel) return;
    try {
      coachBox = CoachPanel.create({ game: 'janggi', title: 'AI 선생님', startHidden: true });
      CoachPanel.button($('coachBtn'), coachBox, { onToggle: on => { if (on) sfx('hint'); } });
      coachBox.onChange(() => { requestAnimationFrame(coachPlace); if (G) { if (coachOpen()) coachTick(); render(null); rvSync(); } });
      coachBox.body.addEventListener('click', e => { if (e.target.closest('[data-peek]') && G) { G.drillPeek = true; sfx('hint'); coachTick(); } });
      addEventListener('resize', () => requestAnimationFrame(coachPlace));
    } catch (e) { coachBox = null; }
  }
  // 기본 자리: 세로 화면은 아래 단추 줄 위 (판 아래쪽 이름 줄을 가리지 않게), 가로 화면은 오른쪽 기보 칸 위
  // 세로 화면에서 창이 펼쳐져 있으면 단추 줄 위에 그만큼 자리를 비워 둠 (#coachSpace) → 판이 알아서 줄어 창이 판·내 줄을 가리지 않음
  const COACH_H = 100;
  function coachPlace() {
    if (!coachBox || $('play').hidden) return;
    let st = null; try { st = JSON.parse(localStorage.getItem('game.coach.janggi') || 'null'); } catch (e) {}
    const land = matchMedia('(orientation:landscape) and (min-width:600px)').matches;
    const open = coachBox.visible && !coachBox.collapsed && !(st && st.p);
    const want = !land && open ? (G && G.rv ? COACH_H + 40 : COACH_H) : 0, sp = $('coachSpace');   // 복기는 설명(추천 · 실제 수 · 노린 것)이 길어 조금 더
    const tuck = !!want && innerHeight < 760;                         // 낮은 화면: 창이 펼쳐진 동안 기보 줄을 접어 판 크기를 지킴
    if (sp.offsetHeight !== want || $('moves').classList.contains('tuck') !== tuck) { sp.style.height = want + 'px'; $('moves').classList.toggle('tuck', tuck); requestAnimationFrame(fit); }
    coachBox.el.style.maxHeight = want ? (want - 6) + 'px' : '';
    const r = (land ? $('pBot') : $('dock').hidden ? $('dockReview') : $('dock')).getBoundingClientRect(); if (!r.height) return;
    const off = Math.max(8, Math.round(innerHeight - r.top + 8)) + 'px';
    if (!(st && st.p)) { coachBox.el.style.bottom = off; coachBox.el.style.top = 'auto'; }
    if (!(st && st.c)) { coachBox.chip.style.bottom = off; coachBox.chip.style.top = 'auto'; }
  }
  const coachAvail = () => !!(G && (G.rv || (G.mode !== 'watch' && (G.mode !== 'online' || (ON && ON.coach)))));   // 복기에선 어느 판이든 켤 수 있음 (끝난 판)
  const coachOpen = () => !!(coachBox && coachBox.visible && !coachBox.collapsed && coachAvail());
  function coachEnter() {
    coachSetup();
    if (G && G.rv) return;                                                 // 복기 중엔 🧑‍🏫 선생님 단추(복기 줄)로만 켜고 끔
    const ok = coachAvail();
    $('coachBtn').hidden = !ok;
    if (!coachBox) return;
    if (ok && !CoachPanel.isOff('janggi')) { coachBox.show(); coachBox.set(''); } else coachBox.hide();
    requestAnimationFrame(coachPlace);
  }
  function coachHide() { if (coachBox) coachBox.hide(); $('coachSpace').style.height = '0px'; $('moves').classList.remove('tuck'); }
  const ptsFmt = sc => (Math.abs(sc) / 100).toFixed(1);
  function evalLine(res, c) {
    if (res.mate) { const win = res.mate > 0 ? c : other(c); return `${IGA(win)} ${Math.abs(res.mate)}수 안에 외통을 만들 수 있어요`; }
    if (Math.abs(res.score) > 15000) { const win = res.score > 0 ? c : other(c); return `이대로면 ${IGA(win)} 점수로 이겨요`; }
    const w = c === 0 ? res.score : -res.score;
    if (Math.abs(w) < 60) return '형세: 비슷해요';
    return `형세: ${w > 0 ? '초' : '한'} +${ptsFmt(w)}점 ${Math.abs(w) >= 600 ? '(크게 유리)' : Math.abs(w) >= 250 ? '(유리)' : '(조금 유리)'}`;
  }
  function coachTick() {
    if (!G || !coachOpen()) return;
    if (G.rv) { rvCoach(); return; }
    const g = G, s = g.s, key = posKey(), c = s.turn;
    if (s.over) { coachBox.set(`이번 판은 끝났어요 · ${esc(resultLine())}`); return; }
    const spec = isSpec();
    const mine = humanTurn() || (g.mode === 'duo' && g.players[c].kind === 'human') || spec;
    if (s.phase === 'setup') {
      const id = g.preview != null ? g.preview : C.DEFAULT_SETUP;
      coachBox.set(mine ? `<div class="ch-mv">💡 <b>${C.SETUPS[id].name}</b> — ${esc(C.SETUPS[id].desc)}</div><div class="ch-sub">처음이면 마상상마가 무난해요. 고르면 판에서 바로 미리 보여요</div>` : `${IGA(c)} 상차림을 고르는 중이에요`);
      return;
    }
    if (g.cfg.drill && !g.drillPeek && !g.drillOk && g.cfg.start && s.moves.length === g.cfg.start.length && humanTurn()) {   // 📒 그 장면: 먼저 스스로 찾아봄
      coachBox.set('<div class="ch-mv">📒 아쉬웠던 그 장면이에요 — 이번엔 직접 찾아보세요 · <button type="button" class="btn sm" data-peek>💡 답 보기</button></div><div class="ch-sub">두고 나면 채점해 드려요</div>');
      return;
    }
    const revHtml = reviewHtml();
    if (g.review && g.review.score == null && !g.review.busy) reviewMove();
    if (!mine) { coachBox.set(revHtml + (g.mode === 'online' ? '친구 차례예요 · 친구가 두면 다시 알려 드릴게요' : 'AI가 생각하는 중이에요 · 내 차례가 되면 알려 드릴게요')); return; }
    if (g.coachRes && g.coachRes.key === key) { coachShow(); return; }
    if (g.coachBusy === key) return;
    g.coachBusy = key;
    coachBox.set(revHtml + '💡 좋은 수를 찾는 중…');
    COACHW.think(C.toJSON(s), { tier: 'hard', hint: true, explain: true, timeMs: 900, seed: 7 }).then(res => {
      if (G !== g) return;
      if (g.coachBusy === key) g.coachBusy = null;
      if (posKey() !== key || !res || !res.move) return;
      const pass = res.move === 'pass', m = pass ? -1 : C.parseMove(res.move);
      const label = pass ? '한수 쉼' : C.sqName(m >> 7) + C.pieceName(s.b[m >> 7] & 7, c) + C.sqName(m & 127);
      g.coachRes = { key, move: res.move, from: pass ? null : m >> 7, to: pass ? null : m & 127, label, score: res.score, mate: res.mate, why: res.why, c };
      g.coachUsed++;
      if (coachOpen()) { coachShow(); sfx('hint'); }
    }).catch(() => { if (G === g && g.coachBusy === key) g.coachBusy = null; });
  }
  function coachShow() {
    const g = G, r = g.coachRes; if (!r || !coachBox || g.rv) return;
    const spec = isSpec();
    const who = spec || g.mode === 'duo' ? `${CN[r.c]} 차례라면 ` : '';
    coachBox.set(`${reviewHtml()}<div class="ch-mv">💡 ${who}<b>${esc(r.label)}</b> ${r.why ? esc(r.why.text) : ''}</div>
      <div class="ch-sub">${esc(evalLine(r, r.c))}${spec ? ' · 👀 구경 중' : ''}</div>`);
    render(null);
  }
  function reviewMove() {
    const g = G, rv = g.review; if (!rv || rv.busy) return;
    rv.busy = true;
    if (rv.played === rv.prev.move) { rv.score = rv.prev.score; rv.loss = 0; coachTick(); return; }
    COACHW.think(rv.game, { tier: 'hard', hint: true, timeMs: 400, seed: 3 }).then(res => {
      if (G !== g || g.review !== rv || !res || !res.move) return;
      rv.score = -res.score; rv.loss = rv.prev.mate > 0 && !(res.mate < 0) ? 9999 : Math.max(0, rv.prev.score - rv.score);
      if (Math.abs(rv.prev.score) > 15000 && Math.abs(rv.score) > 15000 && Math.sign(rv.prev.score) === Math.sign(rv.score)) rv.loss = 0;
      coachTick();
    }).catch(() => {});
  }
  function reviewHtml() {
    const rv = G && G.review; if (!rv || rv.score == null) return '';
    const p = rv.prev;
    if (rv.played === p.move) return `<div class="ch-rev">👍 방금 <b>${esc(rv.label)}</b>, 선생님 추천과 같은 수예요!</div>`;
    if (rv.loss <= 70) return `<div class="ch-rev">👍 방금 <b>${esc(rv.label)}</b>, 좋은 수예요</div>`;
    if (rv.loss <= 220) return `<div class="ch-rev">🙂 방금 <b>${esc(rv.label)}</b>도 괜찮아요. <b>${esc(p.label)}</b> 쪽이 조금 더 좋았어요</div>`;
    return `<div class="ch-rev bad">😮 방금 <b>${esc(rv.label)}</b> 수는 아쉬워요${rv.loss < 5000 ? ` (−${ptsFmt(rv.loss)}점)` : ''}. <b>${esc(p.label)}</b>${p.why ? ` — ${esc(p.why.text)}` : ' 쪽이 더 좋았어요'}</div>`;
  }

  // ════════ 🎞️ 복기: 끝난 판 · 지난 대국을 한 수씩 (⏮ ◀ ▶ ⏭) · 🧑‍🏫 선생님(그 장면이라면? + 실제로 둔 수) · 🎮 여기서부터 내가 두기 ════════
  // G.rv = { full(끝난 판), last(분석용 끝 판 — 기권이면 기권 전), n(둔 수), base(상차림 수), plays(둔 수 기록), k(지금 장면 = k수 둔 뒤), s(보이는 판),
  //          cache{k: 추천}, thr{k: 실제 수가 노리는 수}, why{k}, mist{k: 노트에 담음}, wait · twait(묻는 중), seq, back(결과 창에서 왔나) }
  // 결과 창에서 열면 G 는 그대로 두고(친구랑 방장 · 손님 동기화도 G.s 로 그대로) 보이는 판만 바꿈 · 지난 대국에서 열면 G 를 새로 만듦 (mode 'record')
  const rvMake = (full, back) => ({ full, last: full.reason === 'resign' ? C.fromJSON({ rules: full.rules, moves: full.moves }) : full, n: full.plies, base: full.moves.length - full.plies,
    plays: full.hist.filter(h => h.type === 'move'), k: full.plies, s: full, cache: {}, thr: {}, why: {}, mist: {}, wait: {}, twait: {}, seq: 0, t: 0, back });
  function reviewNow() {
    const g = G; if (!g || !g.over || !g.s.plies) return;
    closeModals(); stopAll();
    g.rv = rvMake(C.fromJSON(C.toJSON(g.s)), true);
    rvEnter();
  }
  function openRecord(r) {
    let full = null;
    try { full = C.fromJSON({ rules: r.rules, moves: r.moves, end: r.end }); } catch (e) {}
    if (!full || !full.plies) { Z.toast('둔 수가 없거나 기보를 읽지 못했어요'); return; }
    stopAll(); closeModals();
    const names = [0, 1].map(c => (r.names && r.names[c]) || CN[c]), me = r.me === 0 || r.me === 1 ? r.me : null;
    G = { cfg: { mode: r.mode, tier: r.tier, rules: full.rules }, mode: 'record', s: full, me, players: names.map(name => ({ kind: 'human', name })), over: true, thinking: false, paused: false,
      undos: 0, coachUsed: 0, round: 0, seats: null, t0: Date.now(), coachRes: null, review: null, preview: null, branch: null, saved: true, rec: r, rv: rvMake(full, false) };
    board.clearSel(); board.setFlip(me === 1);
    show('play'); rvEnter();
  }
  function rvEnter() {
    $('dock').hidden = true; $('dockReview').hidden = false; $('setupBox').hidden = true; $('moves').hidden = false;
    coachSetup(); if (coachBox) coachBox.hide();                          // 선생님은 꺼진 채로 시작 (🧑‍🏫 단추로 켬)
    sfx('flip');
    rvGoto(G.rv.k, true);
    Z.toast('🎞️ 복기 · ◀ ▶ 로 한 수씩 · 🧑‍🏫 선생님을 켜면 추천 수와 실제로 둔 수를 보여 줘요', 2600);
    requestAnimationFrame(() => { fit(); coachPlace(); });
  }
  function rvClear() {
    if (G && G.rv) { G.rv.seq++; clearTimeout(G.rv.t); G.rv = null; }
    $('dockReview').hidden = true; $('dock').hidden = false; $('moves').classList.remove('rv');
    board.setArrow(null);
  }
  // 결과 창으로 돌아가기 (끝난 판에서 연 복기 · 친구랑이면 '다음 판' 준비 칸도 다시)
  function rvExit() {
    const g = G; if (!g || !g.rv) return;
    rvClear(); coachHide();
    board.clearSel(); render(null); drawDock();
    if (g.mode === 'online') { applyOnlineUI(); drawViewers(); }
    requestAnimationFrame(fit);
    showResult();
  }
  function rvGoto(k, quiet) {
    const g = G, rv = g && g.rv; if (!rv) return;
    k = Math.max(0, Math.min(rv.n, k | 0));
    if (k === rv.k && !quiet) return;
    const fwd = !quiet && k === rv.k + 1;
    rv.k = k; rv.seq++; clearTimeout(rv.t);
    rv.s = k >= rv.n ? rv.full : C.fromJSON({ rules: rv.full.rules, moves: rv.full.moves.slice(0, rv.base + k) });
    board.clearSel();
    const mv = fwd && rv.s.last && !rv.s.last.pass ? rv.s.last : null;
    render(mv);
    if (!quiet) sfx(mv ? (mv.captured ? 'capture' : 'clack') : 'tap');
    rvSync(); coachTick();
  }
  function rvSync() {
    const rv = G && G.rv; if (!rv) return;
    $('rvFirst').disabled = $('rvPrev').disabled = rv.k <= 0;
    $('rvNext').disabled = $('rvLast').disabled = rv.k >= rv.n;
    $('rvNum').innerHTML = `<b>${rv.k}</b><small>/ ${rv.n}수</small>`;
    $('rvCoach').setAttribute('aria-pressed', String(coachOpen()));
  }
  function rvCoachToggle() {
    if (!G || !G.rv) return;
    coachSetup(); if (!coachBox) { Z.toast('선생님을 불러오지 못했어요'); return; }
    if (coachOpen()) { sfx('tap'); coachBox.hide(); } else { sfx('hint'); coachBox.show(); coachBox.collapse(false); }
    rvSync();
  }

  // ── 복기 선생님: 추천 수 · 실제로 둔 수 · 🤔 노린 것(그 수의 까닭 + 다음에 노리는 수) · 손해 ──
  const MISS = 300;                                                      // 추천보다 3점(졸 1.5개) 넘게 손해면 '실수였을 수도' · 📒 노트에
  const JS = { 궁: 1, 상: 1, 졸: 1, 병: 1 };                              // 받침 있는 기물 이름 (조사)
  const eul = n => n + (JS[n] ? '을' : '를'), ro = n => n + (JS[n] && n !== '졸' ? '으로' : '로'), wa = n => n + (JS[n] ? '과' : '와'), iga = n => n + (JS[n] ? '이' : '가');
  const VQ = [0, 99, 3, 3, 5, 13, 7, 2];                                  // 잡힘 판단용 값 (궁은 크게)
  // 분석용 장면 k 판 (끝 장면은 기권 전 판)
  const rvAt = (rv, k) => (k >= rv.n ? rv.last : k === rv.k && rv.s && rv.s !== rv.full ? rv.s : C.fromJSON({ rules: rv.full.rules, moves: rv.full.moves.slice(0, rv.base + k) }));
  const rvMoveLabel = (s, u) => { if (u === 'pass') return '한수 쉼'; const m = C.parseMove(u); return C.sqName(m >> 7) + C.pieceName(s.b[m >> 7] & 7, s.turn) + C.sqName(m & 127); };
  // 이 편 기물 중 공짜로(또는 손해 보고) 잡힐 것: [자리, 종류, 노리는 상대 자리들]
  function hangingOf(b0, side) {
    const L = C.lo, b = b0.slice(), out = [];
    for (let q = 0; q < 90; q++) {
      const p = b[q]; if (!p || (p >> 3) !== side || (p & 7) === C.K) continue;
      const atk = L.attackers(b, q, side ^ 1); if (!atk.length) continue;
      const low = Math.min(...atk.map(x => VQ[b[x] & 7]));
      b[q] = C.mk(C.P, side ^ 1); const def = L.attackers(b, q, side).filter(x => x !== q).length; b[q] = p;
      if (!def || low < VQ[p & 7]) out.push([q, p & 7, atk]);
    }
    return out;
  }
  // 실제로 둔 수(장면 k → k+1)가 한 일: 판에서 바로 보이는 것만 (모르면 null → 다음 노림 · 자리 잡기)
  function rvWhy(rv, k) {
    if (k in rv.why) return rv.why[k];
    const nx = rv.plays[k]; if (!nx) return null;
    const s0 = rvAt(rv, k), s1 = rvAt(rv, k + 1), L = C.lo, me = nx.side, op = me ^ 1;
    const mine = t => C.pieceName(t, me), his = t => C.pieceName(t, op);
    const out = (() => {
      if (nx.pass) return { term: '한수 쉼', text: '움직이지 않고 넘겼어요' };
      const b0 = s0.b, b1 = s1.b, f = nx.from, t = nx.to, pc = nx.piece, cap = nx.captured;
      if (s1.over && s1.reason === 'mate') return { term: '외통', text: '이 수로 외통이에요' };
      if (s0.check) {
        if (cap && L.attackers(b0, L.kingSq(b0, me), op).includes(t)) return { term: '장군 피하기', text: `장군을 건 ${eul(his(cap))} 잡았어요` };
        if (pc === C.K) return { term: '장군 피하기', text: '궁을 옮겨 피했어요' };
        return { term: '길 막기', text: `${ro(mine(pc))} 장군을 막았어요 (멍군)${s1.check ? ' · 장군까지' : ''}` };
      }
      const safe = !L.attacked(b1, t, op), V = C.VAL;
      if (cap) {
        if (safe) return { term: '기물 따기', text: `${eul(his(cap))} 공짜로 땄어요${s1.check ? ' · 장군까지' : ''}` };
        if (V[cap] > V[pc]) return { term: '교환', text: `${ro(mine(pc))} 더 비싼 ${eul(his(cap))} 땄어요 (다시 잡혀도 이득)` };
        if (V[cap] === V[pc]) return { term: '교환', text: `${wa(mine(pc))} ${eul(his(cap))} 맞바꿔요` };
        return { term: '기물 따기', text: `${eul(his(cap))} 땄지만 ${iga(mine(pc))} 다시 잡힐 수 있어요` };
      }
      if (s1.check) return { term: '장군', text: `${ro(mine(pc))} 궁을 몰아요` };
      if (nx.bik) return { term: '빅장', text: '궁끼리 마주 보게 했어요' };
      const h0 = hangingOf(b0, me), h1 = hangingOf(b1, me);
      if (h0.some(([q]) => q === f) && safe) return { term: '피하기', text: `잡힐 뻔한 ${eul(mine(pc))} 옮겼어요` };
      const saved = h0.filter(([q]) => q !== f && !h1.some(([x]) => x === q)).sort((x, y) => V[y[1]] - V[x[1]]);
      if (saved.length) {
        const [q, tp, atk] = saved[0];
        const blocked = atk.some(a => b1[a] === b0[a] && !L.attackers(b1, q, op).includes(a));     // 노리던 기물은 그대로인데 이제 못 노림 = 길을 막음
        return blocked ? { term: '길 막기', text: `${ro(mine(pc))} 길을 막아 ${eul(mine(tp))} 지켰어요` } : { term: '지키기', text: `노려지던 ${eul(mine(tp))} 지켰어요` };
      }
      return null;
    })();
    return (rv.why[k] = out);
  }
  // 장면 k 의 추천 수 (워커 · 같은 장면은 한 번만 물어봄) → Promise<추천 | null>
  function rvAsk(rv, k) {
    if (k in rv.cache) return Promise.resolve(rv.cache[k]);
    if (rv.wait[k]) return rv.wait[k];
    const s = rvAt(rv, k);
    if (s.over) { rv.cache[k] = null; return Promise.resolve(null); }
    return (rv.wait[k] = COACHW.think(C.toJSON(s), { tier: 'hard', hint: true, explain: true, timeMs: 700, seed: 7 }).then(res => {
      delete rv.wait[k];
      if (!res || !res.move) return null;
      const pass = res.move === 'pass', m = pass ? -1 : C.parseMove(res.move);
      return (rv.cache[k] = { k, move: res.move, from: pass ? null : m >> 7, to: pass ? null : m & 127, label: rvMoveLabel(s, res.move), score: res.score, mate: res.mate, why: res.why, c: s.turn });
    }, () => { delete rv.wait[k]; return null; }));
  }
  // 실제로 둔 수가 다음에 노리는 것: 그 수 뒤 판에서 같은 쪽이 한 번 더 둔다면(상대가 쉰다고 보고) 무엇을? — 장군 · 판이 끝난 수 · 한수 쉼은 안 물어봄
  function rvThreat(rv, k) {
    if (k in rv.thr) return Promise.resolve(rv.thr[k]);
    if (rv.twait[k]) return rv.twait[k];
    const nx = rv.plays[k], s1 = nx && rvAt(rv, k + 1);
    if (!nx || nx.pass || s1.over || s1.check) { rv.thr[k] = null; return Promise.resolve(null); }
    const me = nx.side, fen = C.toFen(s1.b, me);
    return (rv.twait[k] = COACHW.think({ rules: s1.rules, fen }, { tier: 'hard', hint: true, timeMs: 500, seed: 11 }).then(res => {
      delete rv.twait[k];
      if (!res || !res.move || res.move === 'pass') return (rv.thr[k] = null);
      const m = C.parseMove(res.move), f = m >> 7, t = m & 127, sF = C.create({ rules: s1.rules, fen }), pc = sF.b[f] & 7, cap = sF.b[t] & 7;
      C.step(sF, res.move);
      return (rv.thr[k] = { move: res.move, from: f, to: t, piece: pc, captured: cap, check: sF.check, score: res.score, mate: res.mate, side: me });
    }, () => { delete rv.twait[k]; return null; }));
  }
  // 다음 노림 (뚜렷할 때만): 외통 위협 · 기물 따기 · 장군 · 그 밖의 큰 수 — 그 수 뒤 판 값(상대 차례)보다 한 번 더 두면 1.5점 넘게 좋아질 때
  function rvThreatInfo(rv, k) {
    const nx = rv.plays[k], nxt = rv.cache[k + 1], th = rv.thr[k]; if (!nx || !nxt) return null;
    if (nxt.mate < 0) return { term: '외통 위협', text: `상대가 어떻게 받아도 ${-nxt.mate}수 안에 외통이에요`, arrow: th && th.mate > 0 ? [th.from, th.to] : null };
    if (!th) return null;
    const gain = th.score + nxt.score, me = nx.side, pn = C.pieceName(th.piece, me), arrow = [th.from, th.to];   // gain = 한 번 더 둘 때 얼마나 좋아지나 (100 = 1점)
    if (th.mate > 0) return { term: '외통 위협', text: `그냥 두면 ${th.mate}수 안에 외통이에요`, arrow };
    if (th.captured && gain >= 150) return { term: '기물 따기', text: `다음에 ${ro(pn)} ${eul(C.pieceName(th.captured, me ^ 1))} 따려고 해요`, arrow };
    if (th.check && gain >= 200) return { term: '장군', text: `다음에 ${ro(pn)} 장군을 노려요`, arrow };
    if (!th.captured && !th.check && gain >= 400) return { term: '노림', text: `다음에 ${C.sqName(th.from)}${pn}${C.sqName(th.to)} 수를 노려요`, arrow };   // 조용한 수는 아주 클 때만
    return null;
  }
  // 실제로 둔 수가 추천보다 얼마나 손해인가 (둔 쪽 기준 · 100 = 1점) — 아직 모르면 null
  function rvLoss(rv, k) {
    const h = rv.cache[k], nx = rv.plays[k]; if (!h || !nx) return null;
    if (nx.uci === h.move) return 0;
    const nxt = rv.cache[k + 1]; if (!nxt) return null;
    const after = -nxt.score;
    if (h.mate > 0 && !(nxt.mate < 0)) return 9999;                       // 외통을 놓침
    if (Math.abs(h.score) > 15000 && Math.abs(after) > 15000 && Math.sign(h.score) === Math.sign(after)) return 0;
    return Math.max(0, h.score - after);
  }
  const lossTxt = l => (l >= 5000 ? '외통을 놓침' : `평가 −${ptsFmt(l)}`);
  // 📒 아쉬운 장면 노트: 내 쪽 수가 크게 손해면 담음 (같은 판 · 같은 장면은 노트가 하나로 합침)
  function rvNote(rv, k) {
    const g = G, nx = rv.plays[k], h = rv.cache[k];
    if (!g || g.rv !== rv) return;
    if (!window.Mistakes || !nx || !h || rv.mist[k] || !(g.me === 0 || g.me === 1) || nx.side !== g.me) return;
    const loss = rvLoss(rv, k); if (loss == null || loss < MISS) return;
    const rec = recOf(g); if (!rec) return;
    try {
      rv.mist[k] = Mistakes.add({ game: 'janggi', title: `장기 · ${rec.title || resultLine(rv.full)}`, scene: `${k + 1}수째 · ${CN[nx.side]} 차례`, my: C.notation(nx), best: h.label,
        why: (h.why && h.why.text) || evalLine(h, h.c), sev: loss >= 5000 ? 100 : Math.min(100, Math.round(loss / 13)), lossText: lossTxt(loss), drill: { rec, k } }) || true;
    } catch (e) {}
  }
  // 이 판의 기록 (지난 대국에 남긴 것 · 없으면 같은 모양으로 만듦) — 📒 노트의 '이 장면부터 다시'에 씀
  function recOf(g) {
    if (g.rec) return g.rec;
    const s = g.s, j = C.toJSON(s);
    return (g.rec = { t: g.t0, mode: g.mode, rules: j.rules, moves: j.moves, end: j.end, names: [nameOf(0), nameOf(1)], me: g.me, tier: g.mode === 'ai' ? g.cfg.tier : undefined,
      winner: s.winner, reason: s.reason, title: resultLine(s), n: s.plies });
  }
  function rvHtml(rv, k) {
    const s = rv.s, h = rv.cache[k], nx = rv.plays[k];
    let html = h ? `<div class="ch-mv"><i class="lg"></i>💡 ${CN[h.c]} 차례 추천: <b>${esc(h.label)}</b> ${h.why ? esc(h.why.text) : ''}</div>` : `<div class="ch-mv">💡 ${CN[s.turn]} 차례 · 좋은 수를 생각 중…</div>`;
    if (nx) {
      const same = !!(h && nx.uci === h.move);
      html += `<div class="ch-real">${same ? '👑 ' : '<i class="lg"></i>'}실제로 둔 수: <b>${esc(C.notation(nx))}</b>${same ? ' · 추천과 같아요!' : ''}</div>`;
      const w = rvWhy(rv, k), th = rvThreatInfo(rv, k), loss = rvLoss(rv, k), busy = !(k + 1 in rv.cache) || !(k in rv.thr);
      const parts = [];
      if (w) parts.push(`<b>${esc(w.term)}</b> — ${esc(w.text)}`);
      if (th) parts.push(!w || th.term === '외통 위협' ? `<b>${esc(th.term)}</b> — ${esc(th.text)}` : esc(th.text.replace(/^다음에/, '다음엔')));
      if (!parts.length) parts.push(busy ? '생각 중…' : '<b>자리 잡기</b> (다음 수 준비)');
      else if (busy && !th) parts.push('다음 노림은 생각 중…');
      html += `<div class="ch-why">${th && th.arrow ? '<i class="lg"></i>' : ''}🤔 노린 것: ${parts.join(' · ')}${loss != null && loss >= MISS && !same ? ` · <span class="bad">추천보다 많이 손해라 노림수보다는 실수였을 수 있어요 (${esc(lossTxt(loss))})</span>` : ''}</div>`;
      if (rv.mist[k]) html += '<div class="ch-sub">📒 아쉬운 장면 노트에 담았어요</div>';
    }
    if (h) html += `<div class="ch-sub">${esc(evalLine(h, h.c))}</div>`;
    return html;
  }
  // 그 장면에서 둘 차례라면? → 실제 수 뒤 판 값(손해 셈) → 다음 노림 순으로 워커에 물음. 넘기면 늦게 온 답은 그 장면 몫으로만 기억하고 화면엔 안 그림
  function rvCoach() {
    const g = G, rv = g && g.rv; if (!rv || !coachOpen()) return;
    const k = rv.k, s = rv.s, nx = rv.plays[k], id = rv.seq;
    if (s.over) { coachBox.set(`<div class="ch-mv">🏁 끝난 장면이에요 · ${esc(resultLine(s))}</div><div class="ch-sub">◀ 로 앞으로 가서 어디서 갈렸는지 봐요</div>`); return; }
    coachBox.set(rvHtml(rv, k));
    if ((k in rv.cache) && (!nx || ((k + 1 in rv.cache) && (k in rv.thr)))) { rvNote(rv, k); return; }
    const live = () => G === g && g.rv === rv && rv.k === k;
    const draw = () => { if (live() && coachOpen()) { coachBox.set(rvHtml(rv, k)); render(null); } };
    clearTimeout(rv.t);
    rv.t = setTimeout(async () => {                                       // 빠르게 넘길 때는 멈춘 장면만 물어봄
      if (!live() || rv.seq !== id) return;
      await rvAsk(rv, k); draw();
      if (!nx || !live()) return;
      await rvAsk(rv, k + 1); rvNote(rv, k); draw();
      if (!live()) return;
      await rvThreat(rv, k); draw();
    }, 220);
  }
  // 🎮 여기서부터 내가 두기: 같은 판 그 장면부터 새 판 (상대는 AI · 선생님 켠 채 · 전적 · 지난 대국엔 안 넣음)
  function rvBranch() {
    const g = G, rv = g && g.rv; if (!rv) return;
    const s = rv.s, k = rv.k;
    if (s.over) { Z.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요', 2000); return; }
    sfx('tap');
    const m0 = g.mode === 'record' ? g.cfg.mode : g.mode;
    const tier = m0 === 'ai' && TIERS[g.cfg.tier] ? g.cfg.tier : pref.tier;
    const start = rv.full.moves.slice(0, rv.base + k), rules = rv.full.rules;
    const go = me => { leaveRoom(); newGame({ mode: 'ai', tier, side: me, rules, start, branch: k }); };
    const room = ON ? '<p class="sub" style="margin-top:6px">친구 방에서는 나가요.</p>' : '';
    if ((m0 === 'ai' || m0 === 'online') && (g.me === 0 || g.me === 1)) {
      if (!ON) { go(g.me); return; }
      modal({ title: '🎮 여기서부터 내가 둘까요?', html: `<p class="sub">${k}수째 장면부터 내가 ${g.me ? '한을' : '초를'}, 상대는 ${tierLabel(tier)} AI가 둬요.</p>${room}`, dismiss: true,
        buttons: [{ label: '시작', primary: true, onClick: () => go(g.me) }, { label: '그만두기', ghost: true }] });
      return;
    }
    modal({ title: '🎮 어느 쪽을 둘까요?', html: `<p class="sub">고른 쪽은 내가, 다른 쪽은 ${tierLabel(tier)} AI가 이어서 둬요 (지금 ${CN[s.turn]} 차례).</p>${room}`, dismiss: true,
      buttons: [0, 1].map(c => ({ label: `${c ? '🔴 한' : '🔵 초'} · ${nameOf(c)}`, primary: s.turn === c, onClick: () => go(c) })).concat([{ label: '그만두기', ghost: true }]) });
  }
  // 📒 AI 대전이 끝나면 내 수를 뒤에서 얕게 훑어 가장 아쉬운 1~3개를 노트에 (따로 워커 하나 · 복기 선생님과 안 겹침 · 안 되면 그냥 건너뜀)
  function autoScan(g) {
    if (!window.Mistakes || typeof Worker !== 'function' || g.mode !== 'ai' || g.branch != null || !(g.me === 0 || g.me === 1) || !g.rec) return;
    const rec = g.rec, full = C.fromJSON({ rules: rec.rules, moves: rec.moves }), n = full.plies, base = full.moves.length - n;
    const plays = full.hist.filter(h => h.type === 'move'), need = new Set();
    plays.forEach((h, k) => { if (h.side === g.me && !h.pass) { need.add(k); need.add(k + 1); } });
    let w; try { w = new Worker('ai-worker.js?v=1'); } catch (e) { return; }
    let seq = 0; const waits = new Map();
    w.onmessage = e => { const f = waits.get(e.data && e.data.id); if (f) { waits.delete(e.data.id); f(e.data.res); } };
    w.onerror = () => { for (const [, f] of waits) f(null); waits.clear(); };
    const ask = (game, explain) => new Promise(ok => { const id = ++seq, t = setTimeout(() => { waits.delete(id); ok(null); }, 5000); waits.set(id, r => { clearTimeout(t); ok(r); }); w.postMessage({ id, game, opts: { tier: 'hard', hint: true, explain, timeMs: 120, seed: 5 } }); });
    (async () => {
      const sc = {};
      for (const k of [...need].sort((a, b) => a - b)) {
        const s = C.fromJSON({ rules: full.rules, moves: full.moves.slice(0, base + k) });
        sc[k] = s.over ? null : await ask(C.toJSON(s), !!(plays[k] && plays[k].side === g.me));
        if (sc[k]) sc[k].label = rvMoveLabel(s, sc[k].move || 'pass');
      }
      w.terminate();
      const bad = [];
      plays.forEach((h, k) => {
        const a = sc[k], b = sc[k + 1]; if (h.side !== g.me || h.pass || !a || !a.move || !b || a.move === h.uci) return;
        const after = -b.score;
        let loss = a.mate > 0 && !(b.mate < 0) ? 9999 : Math.max(0, a.score - after);
        if (Math.abs(a.score) > 15000 && Math.abs(after) > 15000 && Math.sign(a.score) === Math.sign(after)) loss = 0;
        if (loss >= MISS) bad.push({ k, h, a, loss });
      });
      bad.sort((x, y) => y.loss - x.loss).slice(0, 3).forEach(({ k, h, a, loss }) => {
        try { Mistakes.add({ game: 'janggi', title: `장기 · ${rec.title || ''}`, scene: `${k + 1}수째 · ${CN[h.side]} 차례`, my: C.notation(h), best: a.label, why: (a.why && a.why.text) || '',
          sev: loss >= 5000 ? 100 : Math.min(100, Math.round(loss / 13)), lossText: lossTxt(loss), drill: { rec, k } }); } catch (e) {}
      });
      if (!G || $('play').hidden) drawMenu();
    })().catch(() => { try { w.terminate(); } catch (e) {} });
  }
  // 📒 노트에서 '이 장면부터' (?drill=<id>): 그 장면부터 연습 판 · 내가 그때 둔 쪽 · 첫 수가 추천만큼 좋으면 노트에 ✅
  function startDrill(m) {
    const r = m && m.drill && m.drill.rec, k = m && m.drill ? m.drill.k | 0 : -1;
    let full = null;
    try { full = r && C.fromJSON({ rules: r.rules, moves: r.moves }); } catch (e) {}
    if (!full || k < 0 || k >= full.plies) { Z.toast('그 장면을 열지 못했어요'); return; }
    const start = full.moves.slice(0, full.moves.length - full.plies + k), sk = C.fromJSON({ rules: full.rules, moves: start });
    if (sk.over || sk.phase !== 'play') { Z.toast('그 장면을 열지 못했어요'); return; }
    const tier = r.mode === 'ai' && TIERS[r.tier] ? r.tier : pref.tier;
    newGame({ mode: 'ai', tier, side: sk.turn, rules: full.rules, start, branch: k, drill: { id: m.id, best: m.best } });
  }
  // 연습(📒) 판 첫 수 채점: 추천과 같거나 1점 안쪽이면 해냄
  function drillCheck(g, before, uci) {
    const d = g.cfg.drill; if (!d || g.drillBusy || g.drillOk) return;
    g.drillBusy = true;
    const after = C.fromJSON({ rules: before.rules, moves: before.moves.concat([uci]) });
    Promise.all([COACHW.think(before, { tier: 'hard', hint: true, timeMs: 700, seed: 7 }), after.over ? Promise.resolve(null) : COACHW.think(C.toJSON(after), { tier: 'hard', hint: true, timeMs: 700, seed: 7 })]).then(([a, b]) => {
      g.drillBusy = false;
      if (G !== g || !a) return;
      const won = after.over && after.winner === after.hist[after.hist.length - 1].side;
      const loss = a.move === uci || won ? 0 : !b ? 9999 : a.mate > 0 && !(b.mate < 0) ? 9999 : Math.max(0, a.score + b.score);
      if (loss <= 100 && g.drillPeek) { g.drillOk = true; Z.toast('👍 추천대로 뒀어요 · 답을 봤으니 📒 노트엔 그대로 둬요', 2600); }
      else if (loss <= 100) { g.drillOk = true; try { Mistakes.solved(d.id); } catch (e) {} sfx('hint'); Z.toast('✅ 이번엔 좋은 수예요! 📒 노트에 해냄으로 표시했어요', 2600); }
      else Z.toast(`🤔 아직 아쉬워요 (${lossTxt(loss)}) · ↶ 무르고 다시 찾아봐요`, 2600);
    }, () => { g.drillBusy = false; });
  }
  $('rvFirst').onclick = () => rvGoto(0);
  $('rvPrev').onclick = () => { if (G && G.rv) rvGoto(G.rv.k - 1); };
  $('rvNext').onclick = () => { if (G && G.rv) rvGoto(G.rv.k + 1); };
  $('rvLast').onclick = () => { if (G && G.rv) rvGoto(G.rv.n); };
  $('rvCoach').onclick = () => rvCoachToggle();
  $('rvGo').onclick = () => rvBranch();
  addEventListener('keydown', e => {
    if (!G || !G.rv || modals.length || $('play').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key, rv = G.rv;
    if (k === 'ArrowLeft') rvGoto(rv.k - 1); else if (k === 'ArrowRight') rvGoto(rv.k + 1); else if (k === 'Home') rvGoto(0); else if (k === 'End') rvGoto(rv.n); else return;
    e.preventDefault();
  });

  // ════════ 친구랑: 방 최대 16명 — 2명이 두고 나머지는 실시간 구경 ════════
  // 방장이 판의 주인: 손님 수는 방장에게 보내고, 방장이 확인해 모두에게 (수 번호 n 으로 순서 맞춤). 늦게 온 사람은 'hello' → 방장이 판 전체(sync)
  let ON = null, leaving = false;
  let TT = { key: '', t: 0, end: 0, left: null };   // ⏱ 내 차례 30초 (친구랑)
  const TURN_SEC = 30;
  const buzz = ms => { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; Z.vibrate(ms); };
  const nmOf = u => (ON && ON.names[u]) || '친구';
  function noteNames(p) { if (!ON) return; for (const u in p || {}) if (p[u] && p[u].name) ON.names[u] = p[u].name; }
  const sideOf = (seats, uid) => !seats || !uid ? null : seats[0] === uid ? 0 : seats[1] === uid ? 1 : null;
  function order(players, hostUid) {
    const pl = players || {};
    return Object.keys(pl).filter(u => !(pl[u] && pl[u].watch)).sort((a, b) => (b === hostUid) - (a === hostUid) || ((pl[a] && pl[a].t) || 0) - ((pl[b] && pl[b].t) || 0));
  }
  function firstSeats(players, hostUid, hostSide) {
    const o = order(players, hostUid), mate = o.find(u => u !== hostUid) || '';
    const hs = hostSide === 1 || hostSide === '1' ? 1 : hostSide === 'r' ? (Math.random() < 0.5 ? 0 : 1) : 0;
    return hs === 0 ? [hostUid, mate] : [mate, hostUid];
  }
  function onlinePlayers(seats, me) { return [0, 1].map(c => ({ kind: me === c ? 'human' : 'remote', name: '' })); }
  const cfgLabel = c => `방장 ${c && (c.hostSide === 1 || c.hostSide === '1') ? '한' : c && c.hostSide === 'r' ? '랜덤' : '초'} · ${C.ruleText(c && c.rules)}${c && c.coach ? ' · AI 선생님' : ''}`;
  function friendOpts() {
    return {
      game: 'janggi', title: '장기', max: 16, min: 2, coach: true,
      describe: n => n < 2 ? '친구가 한 명 더 들어오면 시작할 수 있어요' : n === 2 ? '2명이면 1:1 대국' : `${n}명이면 2명이 두고 ${n - 2}명은 구경해요 (다음 판엔 방장이 고른 구경꾼이 빈자리에)`,
      settings: {
        defaults: { hostSide: 0, rules: C.normRules(pref.rules) },
        label: cfgLabel,
        render(el, c, canEdit, update) {
          if (!canEdit) { el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(cfgLabel(c))}</p>`; return; }
          el.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
            <div class="optrow"><span class="small">방장 편</span><div class="seg" id="fSideSeg"></div></div>
            <div class="setlist" id="fRules"></div>
            <p class="arn-soft" style="text-align:center">먼저 온 2명이 두고 나머지는 구경해요</p></div>`;
          seg(el.querySelector('#fSideSeg'), [['0', '🔵 초'], ['1', '🔴 한'], ['r', '🎲 랜덤']], String((c && c.hostSide) != null ? c.hostSide : 0), v => update({ hostSide: v === 'r' ? 'r' : +v }));
          rulesForm(el.querySelector('#fRules'), C.normRules(c && c.rules), r => update({ rules: r }));
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
    startRound(firstSeats(players || net.players, hostUid, ON.host ? c.hostSide : 0), 1, !ON.host);
    if (ON.host) {
      ON.offs.push(net.on('msg', (from, m) => onHostMsg(from, m)));
      ON.offs.push(net.on('leave', uid => hostLeft(uid)));
      ON.offs.push(net.on('join', uid => hostJoined(uid)));
      broadcastSync();
    } else { ON.offs.push(net.on('msg', m => onGuestMsg(m))); askSync(true); }
    ON.offs.push(net.on('players', p => { noteNames(p); drawBars(); drawReady(); }));
  }
  function startRound(seats, round, quiet) {
    newGame({ mode: 'online', seats, round, uid: ON.uid, rules: (ON.cfg && ON.cfg.rules) || {}, quiet: !!quiet });
    applyOnlineUI(); drawViewers();
  }
  const readyOf = r => { if (ON.ready.round !== r) ON.ready = { round: r, set: new Set(), pick: {} }; return ON.ready; };
  const roomPart = () => { const R = readyOf(G.round); return { score: ON.score, sr: ON.scoreRound, sub: Object.keys(ON.sub).filter(u => ON.sub[u]), ready: [...R.set], pick: R.pick, round: G.round }; };
  const syncMsg = () => ({ t: 'sync', round: G.round, seats: G.seats, rules: G.s.rules, moves: G.s.moves.slice(), over: G.s.over ? { winner: G.s.winner, reason: G.s.reason } : null,
    names: ON.names, cfg: ON.cfg, room: roomPart() });
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
  function countScore(g) {
    if (!ON || !ON.host || ON.scoreRound >= g.round) return;
    const w = g.s.winner; ON.scoreRound = g.round;
    for (const c of [0, 1]) { const u = g.seats[c]; if (!u) continue; const r = ON.score[u] = ON.score[u] || { w: 0, l: 0, d: 0 }; if (w == null) r.d++; else if (w === c) r.w++; else r.l++; }
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
    const col = sideOf(G.seats, from);
    if (m.t === 'ready' || m.t === 'again') {
      if (!G.over) return;
      const R = readyOf(G.round); R.set.add(from);
      if (col == null) R.pick[from] = true;
      broadcastRoom(); return;
    }
    const back = () => ON.net.send(from, syncMsg(), true);
    if (m.round !== G.round || G.over) { back(); return; }
    if (m.t === 'resign') { if (col != null) act({ resign: col }, { from: 'remote' }); return; }
    if (m.t !== 'move') return;
    if (m.n !== G.s.moves.length || col !== G.s.turn) { back(); return; }
    if (!act(m.u, { from: 'remote' })) back();
  }
  function onGuestMsg(m) {
    if (!m || !ON) return;
    if (m.t === 'sync') { applySync(m); return; }
    if (m.t === 'room') { applyRoom(m); return; }
    if (!G || G.mode !== 'online') return;
    if (m.round !== G.round) { askSync(); return; }
    if (m.t === 'end') { if (!G.over) applyEnd(m); return; }
    if (m.t !== 'move') return;
    const n = G.s.moves.length;
    if (m.n === n) { if (!act(m.u, { from: 'remote' })) askSync(); }
    else if (m.n < n) { if (G.s.moves[m.n] !== m.u) askSync(); }
    else askSync();
  }
  function applyEnd(e) {
    if (!G || G.over) return;
    if (e.reason === 'resign') act({ resign: e.winner != null ? other(e.winner) : G.s.turn }, { from: 'remote' });
  }
  function applySync(m) {
    if (m.names) Object.assign(ON.names, m.names);
    if (m.cfg) { ON.cfg = Object.assign({}, ON.cfg, m.cfg); ON.coach = !!ON.cfg.coach; }
    const fresh = !G || G.mode !== 'online' || G.round !== m.round;
    if (fresh) startRound(m.seats, m.round, true);
    const g = G;
    g.seats = m.seats; const meWas = g.me; g.me = sideOf(m.seats, ON.uid); g.players = onlinePlayers(m.seats, g.me);
    if (m.room) applyRoom(m.room);
    if (meWas !== g.me || fresh) board.setFlip(g.me === 1);
    if (fresh || !ON.synced) { ON.synced = true; Z.toast(g.me == null ? '👀 구경 중이에요. 다음 판에 빈자리가 나면 앉을 수 있어요' : g.me === 0 ? '🔵 내가 초예요. 한이 상차림을 고르면 골라요' : '🔴 내가 한이에요. 상차림을 먼저 골라요', 2000); }
    const cur = g.s.moves, nx = m.moves || [];
    const sameRules = JSON.stringify(C.normRules(m.rules)) === JSON.stringify(g.s.rules);
    if (!g.over && sameRules && cur.length <= nx.length && cur.every((u, i) => u === nx[i])) {
      for (let i = cur.length; i < nx.length && G === g && !g.over; i++) act(nx[i], { from: 'remote' });
    } else if (!sameRules || cur.join(' ') !== nx.join(' ')) {
      const s = C.fromJSON({ rules: m.rules, moves: nx });
      g.s = s; g.over = false; g.coachRes = null; g.review = null; render(null);
      if (s.over) finish();
    }
    if (m.over && G === g && !g.over) applyEnd(m.over);
    applyOnlineUI(); drawBars(); drawStat(); drawViewers(); coachEnter();
    if (G === g && !g.over) advance();
    turnSync();
  }
  // ── 방장: 두던 사람이 나가면 5초 기다렸다가 물음 (AI 가 대신 · 처음부터 · 기다리기). 돌아오면 그 자리로
  function hostLeft(uid) {
    if (!ON || !ON.host || !G || G.mode !== 'online') return;
    drawBars(); drawReady();
    if (sideOf(G.seats, uid) == null || ON.sub[uid]) return;
    Z.toast(`${nmOf(uid)}님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    const on = ON;
    clearTimeout(on.goneT[uid]);
    on.goneT[uid] = setTimeout(() => { if (ON !== on || !G || (on.net.players || {})[uid] || on.sub[uid] || sideOf(G.seats, uid) == null) return; askGone(uid); }, 5000);
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
    if (!ON || !G || G.over || ON.goneAsk || sideOf(G.seats, uid) == null) return;
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
    const u = G.seats[G.s.turn];
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
  // ⏱ 내 차례 30초: 지나면 🐱 중급 AI 가 대신 둠 (10초 남으면 알림). 상차림도 같음
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
    Z.toast(g.s.phase === 'setup' ? '⏱ 30초가 지나서 상차림을 정했어요' : '⏱ 30초가 지나서 AI가 대신 뒀어요', 2200);
    board.clearSel();
    let mv = '';
    if (g.s.phase === 'setup') mv = (g.s.turn === 1 ? 'h=' : 'c=') + (g.preview != null ? g.preview : C.DEFAULT_SETUP);
    else { try { const res = await AIW.think(C.toJSON(g.s), { tier: 'normal', seed: (Math.random() * 1e9) | 0 }); mv = res && res.move; } catch (e) {} }
    if (G !== g || g.over || g.round + ':' + g.s.moves.length !== key) return;
    if (!mv || !act(mv)) { const L = C.legal(g.s); if (L.length) act(L[0].uci); }
  }
  // 방장: 다음 판 — 편 바꾸고, 남은 사람(AI 가 대신 앉은 사람 포함)은 그대로, 빈자리는 방장이 고른 구경꾼
  function hostAgain() {
    if (!ON || !ON.host || !G) return;
    const pl = ON.net.players || {}, o = order(pl, ON.hostUid), pick = readyOf(G.round).pick;
    let seats = [G.seats[1], G.seats[0]];
    for (const c of [0, 1]) if (!seats[c] || !(pl[seats[c]] || ON.sub[seats[c]])) seats[c] = '';
    for (const c of [0, 1]) if (!seats[c]) { const u = o.find(x => x !== seats[0] && x !== seats[1] && pick[x]); if (u) seats[c] = u; }
    if (!seats[0] || !seats[1]) { Z.toast('같이 둘 친구가 없어요. 대기실에서 기다려요', 2200); if (window.ArenaUI) ArenaUI.toLobby(); return; }
    startRound(seats, G.round + 1);
    broadcastSync();
  }
  function leaveOnlineGame() { endOnline(); stopAll(); closeModals(); rvClear(); coachHide(); G = null; $('viewbar').hidden = true; $('setupBox').hidden = true; show('menu'); drawMenu(); popHist(); }
  function applyOnlineUI() {
    if (!G || G.mode !== 'online') return;
    $('specPill').hidden = G.me != null;
    drawDock();
  }
  // 점수판 한 줄 (구경 중 배지 · 양쪽 이름 · 이 방 전적 · 지금 차례는 금색 · 구경 인원)
  function drawViewers() {
    const el = $('viewbar');
    if (!G || G.mode !== 'online' || !ON) { el.hidden = true; $('specPill').hidden = true; return; }
    const pl = ON.net.players || {}, t = G.over ? -1 : G.s.turn;
    const chips = [0, 1].map(c => {
      const u = G.seats[c], nm = u ? (u === ON.uid ? '나' : nmOf(u)) + (ON.sub[u] ? '🤖' : !pl[u] ? '🔌' : '') : '빈자리';
      const r = ON.score[u] || { w: 0, l: 0, d: 0 };
      return `<span class="rbi${t === c ? ' on' : ''}"><i class="dotc ${c ? 'han' : 'cho'}"></i><b>${esc(nm)}</b> ${r.w}승${r.l}패${r.d ? r.d + '무' : ''}</span>`;
    });
    const v = order(pl, ON.hostUid).filter(u => sideOf(G.seats, u) == null);
    el.hidden = false;
    el.innerHTML = (G.me != null ? '' : '<b class="vbadge">👀 구경 중</b>') + chips.join('') + (v.length ? `<span class="rbi" title="${esc(v.map(nmOf).join(', '))}">👀 구경 ${v.length}명</span>` : '');
  }
  // 결과 창 '한 판 더' 칸: 앉은 사람 준비 상태 · 구경꾼 신청 (손님은 ✋ 준비만, 시작은 방장이)
  function drawReady() {
    const box = document.getElementById('rdyBox');
    if (!box || !box.isConnected || !G || G.mode !== 'online' || !ON || !G.over) return;
    const host = ON.host, pl = ON.net.players || {}, R = readyOf(G.round);
    const seated = [0, 1].map(c => G.seats[c]).filter(Boolean);
    const rows = seated.map(u => {
      if (u === ON.hostUid) return `<span class="ok">👑 ${esc(nmOf(u))}</span>`;
      const gone = !pl[u], sub = !!ON.sub[u], ok = (R.set.has(u) && !gone) || sub;
      return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(nmOf(u))}${sub ? ' (AI)' : ''}${host && gone && !sub ? ` <button type="button" data-ai="${esc(u)}">🤖 AI</button>` : ''}</span>`;
    });
    const watchers = order(pl, ON.hostUid).filter(u => sideOf(G.seats, u) == null);
    const free = [0, 1].filter(c => !(G.seats[c] && (pl[G.seats[c]] || ON.sub[G.seats[c]]))).length;
    const wl = watchers.map(u => host
      ? `<label><input type="checkbox" data-join="${esc(u)}" ${R.pick[u] ? 'checked' : ''}${free ? '' : ' disabled'}> ${esc(nmOf(u))}${R.set.has(u) ? ' ✋' : ''}</label>`
      : `<span>${esc(nmOf(u))}${R.set.has(u) ? ' ✋' : ''}</span>`).join('');
    let actH = '';
    if (host) {
      const need = seated.filter(u => u !== ON.hostUid && !ON.sub[u]), k = need.filter(u => R.set.has(u) && pl[u]).length, all = k === need.length;
      actH = `<button type="button" class="btn primary" data-start${all ? '' : ' disabled'}>${all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${need.length})`}</button>${all ? '' : '<button type="button" class="btn" data-force>안 기다리고 시작</button>'}`;
    } else {
      const on = ON.myReady === G.round;
      actH = `<button type="button" class="btn primary" data-ready${on ? ' disabled' : ''}>${on ? (G.me != null ? '✅ 준비 완료 · 방장을 기다려요' : '✅ 신청했어요 · 방장이 정해요') : G.me != null ? '✋ 준비' : '✋ 다음 판에 낄래요'}</button>`;
    }
    box.innerHTML = `<div class="rdy-row">${rows.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? (free ? ` · 체크하면 다음 판에 같이 (${free}자리)` : ' · 자리가 다 찼어요') : ''}: ${wl}</div>` : ''}<div class="rdy-act">${actH}</div>`;
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

  drawMenu(); drawSnd();
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
  // 📒 아쉬운 장면 노트에서 열림 (?drill=<id>) → 그 장면부터 연습 판
  try { const dm = window.Mistakes && Mistakes.fromUrl('janggi'); if (dm) startDrill(dm); } catch (e) {}
  // 시험용 엿보기 (?debug 일 때만)
  if (/[?&]debug\b/.test(location.search)) window.__janggi = { get G() { return G; }, get ON() { return ON; }, get TT() { return TT; }, act, C, board, coachTick, AIW, records, openRecord, reviewNow, rvGoto, rvBranch, rvCoachToggle, startDrill, autoScan, COACHW };
})();

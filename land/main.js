/* 땅따먹기 — 메뉴 · 게임 화면 · 조작 · 혼자 하기 · AI 구경
   누가 어느 편을 움직이나는 '조종 칸'(ctrls[i].decide(st, i) → 행동) 하나로 갈아 끼움:
   사람(손가락·키) · 봇(bots.js) · 나중에 학습한 AI(LandBots.policy) · 친구(온라인) — 규칙 진행은 모두 같은 길 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = window.Land, B = window.LandBots, A = window.LandArt, PAL = A.PAL;
  const TPS = L.C.TPS, TICK = 1 / TPS;
  const sfx = (n, o) => Cozy.sfx.play(n, o);
  const MODES = [['classic', '🖍 클래식 3분'], ['life', '❤️ 한 목숨']];
  const MODE_DESC = { classic: '3분 동안 가장 넓게! 아웃돼도 2초 뒤 새 땅에서 다시', life: '아웃되면 끝! 끝까지 살아남거나 3분 뒤 가장 넓으면 이겨요' };
  const TIER_DESC = { easy: '느긋해요', normal: '제법 영리해요', hard: '빈틈을 노려요' };
  const TIERS = ['easy', 'normal', 'hard'].map(id => Object.assign({ id, desc: TIER_DESC[id] }, Cozy.TIERS[id]));
  const HOWTO = [
    '손가락으로 밀면(스와이프) 그쪽으로 돌아요. 화면 어디서나 돼요. PC는 방향키나 WASD',
    '내 땅 밖으로 나가면 크레파스 선이 그려져요. 다시 내 땅으로 돌아오면 선 안쪽이 모두 내 땅!',
    '선을 긋는 동안 누가 내 선을 밟으면 아웃! 반대로 남의 선을 밟으면 그 친구가 아웃이에요',
    '종이 끝(빨간 테두리)에 닿거나 내 선을 밟아도 아웃. 아웃되면 땅이 모두 사라져요',
    '친구를 통째로 둘러싸 내 땅으로 만들면 그 친구도 아웃! 머리끼리 부딪히면 둘 다 아웃인데, 그 칸이 누구 땅이면 땅 주인만 살아요',
    '🖍 클래식은 3분 동안 가장 넓게(아웃돼도 2초 뒤 다시), ❤️ 한 목숨은 끝까지 살아남기',
  ];
  const opts = Object.assign({ tab: 'solo', mode: 'classic', tier: 'normal', animal: 0, pad: false, count: 8 }, Cozy.store('land.opts', {}));
  if (!(opts.animal >= 0 && opts.animal < A.ANIMALS.length)) opts.animal = 0;
  const COUNTS = [[4, '4마리'], [8, '8마리'], [12, '12마리']];
  const KEYBOARD = matchMedia('(hover: hover) and (pointer: fine)').matches;   // 마우스·키보드 기기 (한 키보드 둘이서는 여기서만)
  if (!COUNTS.some(c => c[0] === opts.count)) opts.count = 8;
  // 최고 기록 칸: 8마리 판은 예전 기록 그대로, 다른 인원은 따로
  const bestKey = (mode, tier, n) => mode + '.' + tier + (n === 8 ? '' : '.' + n);
  const saveOpts = () => Cozy.save('land.opts', opts);
  // 받침 따라 조사 (이/가, 과/와)
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const pctStr = v => (Math.round(v * 10) / 10).toFixed(1);
  const howto = force => Cozy.howto('land', '🖍️ 땅따먹기 하는 법', HOWTO, { force });

  // ══ 메뉴 ══════════════════════════════════════════════════
  function segBtns(el, items, cur, on) {
    el.innerHTML = items.map(([v, l]) => `<button class="btn" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('');
    for (const b of el.children) b.onclick = () => { sfx('tap'); on(b.dataset.v); };
  }
  const animalBtns = A.ANIMALS.map((an, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', an.name);
    const c = document.createElement('canvas');
    A.faceCanvas(c, i, 46, { look: [0, 0.25] });
    const s = document.createElement('span'); s.textContent = an.name;
    b.append(c, s);
    b.onclick = () => { opts.animal = i; saveOpts(); sfx('pop', { pitch: 0.8 + i * 0.06 }); drawMenu(); };
    $('animals').appendChild(b);
    return b;
  });
  // 2P 동물: 1P 와 다르게 (저장된 것이 같으면 다음 동물)
  const p2Animal = () => { let a = opts.animal2 >= 0 && opts.animal2 < A.ANIMALS.length ? opts.animal2 : 1; if (a === opts.animal) a = (a + 1) % A.ANIMALS.length; return a; };
  function drawMenu() {
    if (opts.tab === 'duo' && !KEYBOARD) opts.tab = 'solo';               // 손가락만 되는 기기: 한 키보드 둘이서는 없음
    const solo = opts.tab === 'solo', duo = opts.tab === 'duo', play = solo || duo;
    $('tabSolo').setAttribute('aria-pressed', String(solo)); $('tabWatch').setAttribute('aria-pressed', String(opts.tab === 'watch'));
    $('tabDuo').hidden = !KEYBOARD; $('tabDuo').setAttribute('aria-pressed', String(duo));
    $('lede').textContent = solo ? '크레파스로 선을 그어 내 땅을 넓혀요. 선을 긋는 동안 밟히면 아웃이니 조심!'
      : duo ? '⌨️ 한 키보드 둘이서! 1P는 WASD, 2P는 방향키로 움직여요. 화면은 두 사람이 다 보이게 넓어져요'
      : `AI 친구 ${opts.count}마리가 땅따먹기를 해요. 화면은 1등을 따라가요`;
    segBtns($('modeSeg'), MODES, opts.mode, v => { opts.mode = v; saveOpts(); drawMenu(); });
    segBtns($('countSeg'), COUNTS, opts.count, v => { opts.count = +v; saveOpts(); drawMenu(); });
    $('countDesc').textContent = `${solo ? '나까지 ' : duo ? '둘까지 ' : ''}${opts.count}마리 · 종이 ${L.sizeFor(opts.count)}×${L.sizeFor(opts.count)}칸`;
    $('modeDesc').textContent = MODE_DESC[opts.mode];
    $('tierLbl').textContent = play ? 'AI 친구들 실력' : 'AI 실력';
    Cozy.tierCards($('tiers'), TIERS, id => { opts.tier = id; saveOpts(); drawMenu(); }, { selected: opts.tier });
    $('animalBox').hidden = !play;
    $('animalLbl').textContent = duo ? '1P 동물 (1P 색)' : '내 동물 (내 색)';
    animalBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === opts.animal)));
    $('p2Row').hidden = !duo;
    if (duo) { const a = A.ANIMALS[p2Animal()]; $('p2Name').textContent = `${a.em} ${a.name}`; }
    $('howtoList').hidden = !play;
    $('howto1').textContent = duo ? '1P는 W·A·S·D, 2P는 방향키로 돌아요 · 멈춤은 Space' : '밀면(스와이프) 그쪽으로 돌아요 · PC는 방향키나 WASD';
    $('startBtn').textContent = solo ? '시작!' : duo ? '⌨️ 둘이서 시작!' : '구경하기';
    const best = Cozy.store('land.best', {})[bestKey(opts.mode, opts.tier, opts.count)];
    $('bestLine').textContent = solo && best ? `🏅 최고 기록 · ${best.rank}등 · ${pctStr(best.pct)}%` : '';
  }
  $('tabSolo').onclick = () => { if (opts.tab !== 'solo') sfx('tap'); opts.tab = 'solo'; saveOpts(); drawMenu(); };
  if ($('tabFriend')) $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('tabWatch').onclick = () => { if (opts.tab !== 'watch') sfx('tap'); opts.tab = 'watch'; saveOpts(); drawMenu(); };
  $('tabDuo').onclick = () => { if (opts.tab !== 'duo') sfx('tap'); opts.tab = 'duo'; saveOpts(); drawMenu(); };
  $('p2Btn').onclick = () => { sfx('pop'); let a = (p2Animal() + 1) % A.ANIMALS.length; if (a === opts.animal) a = (a + 1) % A.ANIMALS.length; opts.animal2 = a; saveOpts(); drawMenu(); };
  $('startBtn').onclick = () => start(opts.tab);
  $('helpBtn').onclick = () => howto(true);
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open('land'); } catch (e) {} };
  // 기기에만 있던 기록 한 번 올리기: 'land.best' 는 설정(모드·실력·마리 수)마다 최고 기록 하나뿐이라 판 수는 알 수 없어 '설정 수 / 그중 1등'을 최소치로 (혼자 1마리 설정은 제외)
  try {
    // 예전 기록(land.best)은 설정마다 최고 기록 하나뿐이라 판 수를 알 수 없어 랭킹에 올리지 않음
  } catch (e) {}

  // ══ 친구랑 (온라인 2~12명) ═════════════════════════════════
  //  · 방장 기기가 판을 돌림(봇도 방장이). 틱마다 모두의 행동을 꼭 전하기(rel)로 보내고, 친구 기기는 같은 규칙으로 따라 돌림
  //  · 판 정보(자리·씨앗·인원)는 공유 기록 'land' 에 → 판 중간에 들어온 친구도 읽고 '구경'으로 따라옴
  //  · 친구 기기는 들어오자마자 방장에게 지금 상태(작게 묶은 것)를 받아 맞춤. 틱 번호가 비거나 확인값이 다르면 다시 받음
  //  · 판 도중 나간 친구 자리는 AI 가 이어서 함
  const MAXP = 12;
  const FILLS = [[0, '없이'], [6, '6마리까지'], [8, '8마리까지'], [12, '12마리까지']];
  const modeTxt = m => m === 'life' ? '❤️ 한 목숨' : '🖍 클래식 3분';
  const fillOf = c => (c && c.fill != null ? c.fill | 0 : 8);
  const totalFor = (humans, c) => Math.max(1, Math.min(MAXP, Math.max(humans, fillOf(c))));
  const lobbyCfg = () => (window.ArenaUI && ArenaUI.net && ArenaUI.net.meta && ArenaUI.net.meta.cfg) || null;
  function describe(n, cfg) {
    const t = totalFor(n, cfg || lobbyCfg()), s = L.sizeFor(t);
    return `${n}명${t > n ? ` + AI ${t - n}마리` : ''} · 종이 ${s}×${s}칸`;
  }
  // 대기실 설정 (방장만 바꿈, 친구는 보기만)
  function renderCfg(el, c, canEdit, update) {
    c = c || {};
    const seg = (k, items, cur) => `<div class="lnd-seg">${items.map(([v, t]) => `<button class="arn-btn" data-k="${k}" data-v="${v}" aria-pressed="${String(v) === String(cur)}" ${canEdit ? '' : 'disabled'}>${t}</button>`).join('')}</div>`;
    el.innerHTML = `<div class="lnd-set">
        <span>모드</span>${seg('mode', MODES, c.mode || 'classic')}
        <span>빈자리 AI 동물</span>${seg('fill', FILLS, fillOf(c))}
        <span>AI 실력</span>${seg('tier', TIERS.map(t => [t.id, `${t.em || ''} ${String(t.name || t.id).split(' · ')[0]}`]), c.tier || 'normal')}
      </div>${canEdit ? '' : '<p class="arn-soft lnd-desc">설정은 방장이 정해요</p>'}`;
    if (!canEdit) return;
    el.onclick = e => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      sfx('tap');
      const k = b.dataset.k, v = k === 'fill' ? +b.dataset.v : b.dataset.v;
      if (k === 'mode') { opts.mode = v; saveOpts(); } else if (k === 'tier') { opts.tier = v; saveOpts(); }
      update({ [k]: v });
    };
  }
  function openFriendModal() {
    if (!window.ArenaUI) { Cozy.toast('친구 대전 모듈을 불러오지 못했어요'); return; }
    ArenaUI.open({
      game: 'land',
      title: '🖍️ 땅따먹기',
      max: MAXP, min: 2,
      describe,
      settings: {
        defaults: { mode: opts.mode, tier: opts.tier, fill: 8 },
        label: c => `${modeTxt(c && c.mode)}${fillOf(c) ? ` · AI ${fillOf(c)}마리까지` : ''}`,
        render: renderCfg,
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => { if (S && S.kind === 'online') { endSession(true); show(false); drawMenu(); } },
      onLeave: () => { NET = null; lastSh = null; if (S && S.kind === 'online') { endSession(true); show(false); drawMenu(); } },
    });
  }

  let NET = null, lastSh = null, hostG = 0, early = [], syncAt = 0;
  // 방 하나에 대한 것 (판이 바뀌어도 유지): 이긴 횟수(uid별) · 판 끝난 뒤 준비한 사람 · 방장이 고른 구경꾼
  let RM = { wins: {}, rdy: new Set(), pick: {} };
  function bindNet(net) {
    if (net._land) return;                                              // 듣기는 방(net) 하나에 한 번만 (net.leave 때 같이 정리됨)
    net._land = true;
    RM = { wins: {}, rdy: new Set(), pick: {} };
    net.on('players', () => { if (net !== NET || !S || S.kind !== 'online') return; hud(); if (S.drawReady) S.drawReady(); });   // 구경 인원 · 준비 목록
    if (net.isHost) {
      hostG = 0;
      net.on('msg', (uid, m) => onHostMsg(uid, m));
      net.on('leave', uid => onHostLeave(uid));
      net.on('join', uid => restoreSeat(uid));
    } else {
      early = [];
      net.on('msg', m => onGuestMsg(m));
      net.watchShared('land', v => { if (net !== NET) return; lastSh = v || null; guestMaybeStart(); });
    }
  }
  function startOnline(ctx) {
    NET = ctx.net;
    bindNet(ctx.net);
    if (ctx.net.isHost) hostRound(ctx.cfg);
    else guestMaybeStart();
  }
  // 방장: 새 판 (자리 = 방장 먼저, 그다음 들어온 순 · 12명까지) → 공유 기록에 적고 바로 시작
  //  again: 같은 방에서 다음 판 — 앉았던 사람 중 아직 방에 있는 사람 + 방장이 체크한 구경꾼
  function hostRound(c, again) {
    const net = NET; if (!net || !net.isHost) return;
    c = c || (net.meta && net.meta.cfg) || {};
    const pl = net.players || {}, host = net.meta && net.meta.host;
    let ids = Object.keys(pl).filter(u => !pl[u].watch)
      .sort((a, b) => (b === host) - (a === host) || (pl[a].t || 0) - (pl[b].t || 0) || (a < b ? -1 : 1));
    if (again && S && S.kind === 'online') {
      const prev = S.seats.filter(u => pl[u]);
      ids = prev.concat(ids.filter(u => !prev.includes(u) && RM.pick[u]));
    }
    const seats = ids.slice(0, MAXP);
    if (!seats.includes(net.uid)) { seats.unshift(net.uid); seats.length = Math.min(seats.length, MAXP); }
    const sh = {
      g: ++hostG, seed: (Math.random() * 4294967296) >>> 0, n: totalFor(seats.length, c),
      mode: c.mode === 'life' ? 'life' : 'classic', tier: c.tier || 'normal',
      seats, names: seats.map(u => String((pl[u] && pl[u].name) || '친구').slice(0, 12)),
      wins: Object.assign({}, RM.wins),                                 // 이 판을 시작하기 전까지의 이긴 횟수 (이긴 판은 모두가 같은 순간에 +1)
    };
    try { net.setShared('land', sh); } catch (e) {}
    startRound(sh);
  }
  function guestMaybeStart() {
    const net = NET;
    if (!net || net.isHost || !lastSh || !net.meta || net.meta.phase !== 'play') return;
    if (S && S.kind === 'online' && S.g === lastSh.g) return;
    startRound(lastSh);
  }
  // 방장·친구 같은 길: 씨앗으로 판을 만들고 그림 준비 (친구는 방장에게 지금 상태를 받아 맞춤)
  function startRound(sh) {
    endSession(true);
    const net = NET, host = net.isHost;
    RM.wins = Object.assign({}, sh.wins || {}); RM.rdy = new Set(); RM.pick = {};
    const st = L.create({ n: sh.n, mode: sh.mode }, sh.seed);
    const me = sh.seats.indexOf(net.uid);
    const animals = Array.from({ length: st.n }, (_, i) => (i + sh.seed) % A.ANIMALS.length);
    const names = st.players.map((_, i) => i < sh.seats.length ? (i === me ? '나' : sh.names[i] || `친구${i + 1}`) : A.ANIMALS[animals[i]].name);
    const humanSeats = sh.seats.map((_, i) => i);
    const here = net.players || {};
    const ctrls = st.players.map((_, i) => {
      if (!host) return i === me ? humanCtrl() : null;
      if (i < sh.seats.length && (here[sh.seats[i]] || sh.seats[i] === net.uid)) return humanCtrl();
      return botCtrl(st, i, sh.tier, sh.seed, humanSeats);                 // 빈자리 · 시작 전에 나간 친구 = AI
    });
    S = {
      kind: 'online', role: host ? 'host' : 'guest', net, g: sh.g, seats: sh.seats,
      mode: sh.mode, tier: sh.tier, seed: sh.seed, st, me, animals, names,
      ctrls, acts: new Array(st.n), netQ: [], synced: host, acc: 0, speed: 1, ff: false,
      running: false, counting: false, paused: false, ended: false, out: false,
      timers: [], cdTimers: [], modals: [], danger: false, dangerTick: -99, followAuto: true, followTick: 0, lastSec: -1, crashKey: '',
      subs: new Set(), goneAsk: {}, drawReady: null,                        // subs = 나간 친구 자리를 AI 가 대신하는 중인 번호
    };
    if (host) for (let i = 0; i < sh.seats.length; i++) if (S.ctrls[i].kind === 'bot') { S.subs.add(i); S.names[i] += ' 🤖'; }   // 시작 전에 나간 친구 자리는 처음부터 AI
    show(true);
    R.reset(st, { me, follow: me >= 0 ? me : leader(), animals, names });
    $('feed').innerHTML = ''; hideMsg();
    dockFor(); syncPad(); hud(); drawRank(true);
    if (!host) {
      S.netQ = early.filter(m => m.g === sh.g); early = [];
      askSync(true);
    }
    countdown(() => { if (S) S.running = true; });
  }
  function askSync(force) {
    if (!S || S.kind !== 'online' || S.role === 'host') return;
    const now = performance.now();
    if (!force && now - syncAt < 1200) return;
    syncAt = now; S.synced = false;
    try { NET.send({ t: 'sync', g: S.g }, true); } catch (e) {}
  }
  const rdylMsg = () => ({ t: 'rdyl', g: S.g, uids: [...RM.rdy], pick: RM.pick });
  const sendRdy = () => { if (!S || S.kind !== 'online' || S.role !== 'host') return; try { NET.broadcast(rdylMsg(), true); } catch (e) {} if (S.drawReady) S.drawReady(); };
  function onHostMsg(uid, m) {
    if (!m || !S || S.kind !== 'online' || S.role !== 'host' || NET !== S.net) return;
    if (m.t === 'steer') {
      const p = S.seats.indexOf(uid), c = S.ctrls[p], pl = S.st.players[p];
      if (p < 0 || !c || c.kind !== 'human' || !pl || !pl.alive || m.g !== S.g) return;
      const q = c.q, lastD = q.length ? q[q.length - 1] : pl.dir, d = m.d | 0;
      if (d < 0 || d > 3 || d === lastD || d === ((lastD + 2) & 3)) return;
      if (q.length >= 3) q.pop();
      q.push(d);
    } else if (m.t === 'sync') {
      if (m.g !== S.g) return;
      restoreSeat(uid);                                                    // 다시 들어온 친구는 자리를 되찾음
      try { NET.send(uid, { t: 'snap', g: S.g, s: L.pack(S.st), sub: [...S.subs] }, true); if (S.ended) NET.send(uid, rdylMsg(), true); } catch (e) {}
    } else if (m.t === 'rdy') {                                            // 판이 끝난 뒤 '준비' (구경꾼이 누르면 '다음 판에 낄래요')
      if (!S.ended || m.g !== S.g) return;
      RM.rdy.add(uid);
      if (!S.seats.includes(uid)) RM.pick[uid] = true;
      sendRdy();
    }
  }
  // 방장: 판 도중 나간 친구 — 5초 안에 안 돌아오면 고름 (그동안 그 동물은 방향을 못 바꿈)
  function onHostLeave(uid) {
    if (!S || S.kind !== 'online' || S.role !== 'host') return;
    const p = S.seats.indexOf(uid);
    if (p < 0) return;
    if (S.drawReady) S.drawReady();
    if (S.ended || !S.ctrls[p] || S.ctrls[p].kind !== 'human') return;
    S.ctrls[p].q.length = 0;
    Cozy.toast(`${S.names[p].replace(/ 🤖$/, '')} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    const s0 = S;
    setTimeout(() => { if (S !== s0 || s0.ended || (NET.players || {})[uid] || s0.ctrls[p].kind !== 'human') return; askGone(p); }, 5000);
  }
  // 실시간 경기라 경기를 가리지 않는 작은 카드로 물음 (조작은 그대로 됨)
  const goneBox = () => { let b = $('goneBox'); if (!b) { b = document.createElement('div'); b.id = 'goneBox'; document.body.appendChild(b); } return b; };
  function closeGone(p) {
    if (!S || !S.goneAsk) return;
    for (const i of p == null ? Object.keys(S.goneAsk) : [p]) { const x = S.goneAsk[i]; if (x) { x.el.remove(); delete S.goneAsk[i]; } }
  }
  function askGone(p) {
    const s = S; if (!s || s.kind !== 'online' || s.role !== 'host' || s.subs.has(p) || s.goneAsk[p]) return;
    const el = document.createElement('div'), nm = Cozy.esc(s.names[p]); el.className = 'gcard';
    el.innerHTML = `<b>🔌 ${nm} 님이 나갔어요</b><span>AI 가 대신 움직여요 · 같은 링크로 돌아오면 자리를 돌려줘요</span>
      <div><button type="button" data-a="ai" class="pri">🤖 AI가 대신</button><button type="button" data-a="lobby">🔄 처음부터 다시 (대기실로)</button><button type="button" data-a="wait">⏳ 기다릴게요</button></div>`;
    el.onclick = e => {
      const b = e.target.closest('button'), a = b && b.dataset.a; if (!a || S !== s) return;
      sfx('tap');
      if (a === 'ai') subAI(p);
      else if (a === 'lobby') { try { NET.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (er) {} toLobby(); }
      closeGone(p);
    };
    goneBox().appendChild(el);
    s.goneAsk[p] = { uid: s.seats[p], el };
  }
  function subAI(p) {
    if (!S || S.kind !== 'online' || S.role !== 'host' || S.ended || !S.ctrls[p] || S.ctrls[p].kind !== 'human') return;
    S.ctrls[p] = botCtrl(S.st, p, S.tier, S.seed, S.seats.map((_, i) => i));
    markSub(p, true);
    try { NET.broadcast({ t: 'bot', g: S.g, p, on: 1 }, true); NET.chat(`🤖 ${S.names[p].replace(/ 🤖$/, '')} 님 자리는 AI 가 대신 움직여요 (돌아오면 다시 직접)`); } catch (e) {}
  }
  // 돌아온 친구: AI 가 대신하던 동물을 다시 직접 (방장)
  function restoreSeat(uid) {
    if (!S || S.kind !== 'online' || S.role !== 'host') return;
    const p = S.seats.indexOf(uid); if (p < 0) return;
    closeGone(p);
    if (!S.subs.has(p) || S.ended) { if (S.drawReady) S.drawReady(); return; }
    S.ctrls[p] = humanCtrl();
    markSub(p, false);
    try { NET.broadcast({ t: 'bot', g: S.g, p, on: 0 }, true); NET.chat(`🙌 ${S.names[p]} 님이 돌아와서 직접 움직여요`); } catch (e) {}
  }
  // 이름 옆 🤖 (AI 가 대신하는 자리) — 방장·친구 모두 같게. quiet = 알림 없이
  function markSub(p, on, quiet) {
    if (!S || p < 0 || p >= S.names.length || S.subs.has(p) === !!on) return;
    const base = S.names[p].replace(/ 🤖$/, '');
    if (on) { S.subs.add(p); S.names[p] = `${base} 🤖`; if (!quiet) Cozy.toast(`${base} 님이 나갔어요 · AI 가 이어서 해요`, 2200); }
    else { S.subs.delete(p); S.names[p] = base; if (!quiet) Cozy.toast(`${base} 님이 돌아왔어요`, 2200); }
    drawRank(true);
    if (S.drawReady) S.drawReady();
  }
  function onGuestMsg(m) {
    if (!m || !NET || NET.isHost) return;
    const cur = S && S.kind === 'online' && S.net === NET ? S : null;
    if (m.t === 'tk') {
      if (cur && cur.g === m.g) cur.netQ.push(m);
      else { if (early.length && early[0].g !== m.g) early = []; if (early.length < 400) early.push(m); }
    } else if (m.t === 'snap') {
      if (cur && cur.g === m.g && m.s) applySnap(m.s, m.sub);
    } else if (m.t === 'bot') {
      if (cur && cur.g === m.g && m.p >= 0 && m.p < cur.names.length) markSub(m.p, m.on !== 0 && m.on !== false);
    } else if (m.t === 'rdyl') {
      if (!cur || cur.g !== m.g) return;
      (m.uids || []).forEach(u => RM.rdy.add(u)); RM.pick = m.pick || {};
      if (cur.drawReady) cur.drawReady();
    }
  }
  // 친구: 방장이 보낸 지금 상태로 맞춤 (처음 · 중간 참가 · 어긋났을 때)
  function applySnap(o, sub) {
    let st;
    try { st = L.unpack(o); } catch (e) { return; }
    if (!st || st.n !== S.st.n) return;
    const same = L.hash(st) === L.hash(S.st);
    S.netQ = S.netQ.filter(m => m.k > st.tick);
    S.synced = true;
    if (!same) {
      S.st = st;
      R.reset(st, { me: S.me, follow: S.me >= 0 && st.players[S.me].alive ? S.me : leader(), animals: S.animals, names: S.names });
      if (S.me >= 0 && S.ctrls[S.me]) S.ctrls[S.me].q.length = 0;
      hud(); drawRank(true);
    }
    if (Array.isArray(sub)) for (let p = 0; p < S.names.length; p++) markSub(p, sub.includes(p), true);   // 지금 AI 가 대신하는 자리 (늦게 들어온 사람도)
    if (st.tick > 0 && S.counting) {                                        // 판이 이미 돌고 있음 → 카운트다운 없이 바로 따라감
      for (const t of S.cdTimers) clearTimeout(t);
      S.cdTimers = []; S.counting = false; R.setHint(false); $('countBox').hidden = true; S.running = true;
      if (S.me < 0) Cozy.toast('게임 중이라 이번 판은 구경해요 · 다음 판부터 같이 해요', 2600);
    }
    if (st.over && !S.ended) {                                              // 판이 이미 끝난 뒤에 들어옴 → 바로 결과
      for (const t of S.cdTimers) clearTimeout(t);
      S.cdTimers = []; S.counting = false; R.setHint(false); $('countBox').hidden = true;
      endGame();
    }
  }

  // ══ 판 (세션) ══════════════════════════════════════════════
  const R = window.LandRender.create($('cv'), $('mini'));
  let S = null;

  const ANIM = i => A.ANIMALS[S.animals[i]];
  const nameOf = i => Cozy.esc((S && S.names && S.names[i]) ? S.names[i] : (i === S.me ? '나' : ANIM(i).name));   // 친구 이름은 HTML 로 들어가니 꼭 이스케이프
  const who = i => `${ANIM(i).em} ${nameOf(i)}`;
  function later(fn, ms) { const s = S, id = setTimeout(() => { if (S === s) fn(); }, ms); if (s) s.timers.push(id); return id; }
  function modal(title, html, buttons, dismiss, cls) {
    const close = Cozy.modal({ title, html, cls: 'land-modal' + (cls ? ' ' + cls : ''), dismiss: !!dismiss, buttons: buttons.map(b => ({ label: b[0], primary: !!b[2], ghost: !!b[3], onClick: b[1] })) });
    if (S) S.modals.push(close);
    return close;
  }

  // 조종 칸: 사람 (버퍼에 쌓인 방향을 한 틱에 하나씩)
  function humanCtrl() {
    const q = [];
    return {
      kind: 'human', q,
      decide(st, pid) {
        const p = st.players[pid];
        while (q.length) { const d = q.shift(); if (d !== p.dir && d !== ((p.dir + 2) & 3)) return L.ACT.UP + d; }
        return L.ACT.KEEP;
      },
    };
  }
  // 조종 칸: 규칙 봇 (gentle = 봐줄 사람: 혼자 하기의 나 → 초급은 내 선을 안 끊고, 중급은 덜 노림)
  function botCtrl(st, pid, tier, seed, gentle) {
    const m = B.create(st, pid, tier, (seed * 31 + pid * 7919 + 1) >>> 0, { gentle });
    return { kind: 'bot', m, decide(s, i) { return B.decide(s, i, m); } };
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function start(kind) {
    endSession();
    const seed = (Math.random() * 4294967296) >>> 0;
    if (kind === 'duo' && !KEYBOARD) kind = 'solo';
    const duo = kind === 'duo';
    const st = L.create({ n: Math.max(duo ? 2 : 1, opts.count), mode: opts.mode }, seed);
    const me = kind === 'solo' || duo ? 0 : -1, me2 = duo ? 1 : -1;    // 둘이서: 0번 = 1P (WASD) · 1번 = 2P (방향키)
    const mine = duo ? [opts.animal, p2Animal()] : kind === 'solo' ? [opts.animal] : [];
    const rest = shuffle(A.ANIMALS.map((_, i) => i).filter(i => !mine.includes(i)));
    const animals = mine.concat(rest.slice(0, st.n - mine.length));
    const humans = duo ? [0, 1] : me >= 0 ? [me] : [];
    const names = st.players.map((p, i) => duo && i < 2 ? `${i + 1}P` : i === me ? '나' : A.ANIMALS[animals[i]].name);
    S = {
      kind, mode: opts.mode, tier: opts.tier, seed, st, me, me2, animals, names, outs: [false, false],
      ctrls: st.players.map((p, i) => humans.includes(i) ? humanCtrl() : botCtrl(st, i, opts.tier, seed, humans)),
      acts: new Array(st.n), acc: 0, speed: 1, ff: false,
      running: false, counting: false, paused: false, ended: false, out: false,
      timers: [], cdTimers: [], modals: [], danger: false, dangerTick: -99, followAuto: true, followTick: 0, lastSec: -1, crashKey: '',
    };
    show(true);
    R.reset(st, { me, follow: me >= 0 ? me : leader(), animals, names, pair: duo ? [0, 1] : null });
    $('feed').innerHTML = ''; hideMsg();
    dockFor(); syncPad(); hud(); drawRank(true);
    countdown(() => { S.running = true; });
  }
  function endSession(keepNet) {
    if (!S) return;
    const wasNet = S.kind === 'online' && !keepNet;
    for (const t of S.timers) clearTimeout(t);
    for (const c of S.modals) c();
    if (S.kind === 'online') closeGone();
    S = null;
    $('countBox').hidden = true; $('comboPop').hidden = true; hideMsg();
    $('feed').innerHTML = ''; $('rankBox').innerHTML = '';
    if (wasNet && window.ArenaUI) ArenaUI.leave();                       // 방 나가기 (방장이면 방이 닫힘)
  }
  function goMenu() { endSession(); show(false); drawMenu(); }
  // 친구랑 대기실로 (방장만): 공유 판 정보를 지워 대기실에서 옛 판이 다시 시작되지 않게
  function toLobby() {
    if (!NET || !NET.isHost || !window.ArenaUI) return;
    try { NET.setShared('land', null); } catch (e) {}
    ArenaUI.toLobby();
  }
  function restart() {
    if (S && S.kind === 'online') {
      if (S.role === 'host') hostRound(undefined, true);
      else Cozy.toast('새 판은 방장만 열 수 있어요', 1600);
      return;
    }
    start(S ? S.kind : opts.tab);
  }

  // 화면 바꾸기 (게임 화면에서만 그리기 고리를 돌림)
  let raf = 0, last = 0;
  function show(play) {
    $('play').hidden = !play;
    document.body.classList.toggle('playing', play);
    if (play && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    if (!play && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!play) window.scrollTo(0, 0);
  }

  // ══ 고리: 고정 틱(초당 8번) + 매 화면 보간 ══════════════════
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!S) return;
    let alpha = 1;
    if (S.running && !S.paused && !S.ended) {
      watchSpeed(dt);
      S.acc += dt * S.speed;
      let n = 0;
      while (S.acc >= TICK && n < 16) { tick(); n++; if (!S) return; S.acc -= TICK; if (S.ended) break; }
      // 친구 기기: 받아 둔 틱이 밀렸으면(늦게 시작 · 잠깐 끊김) 조금씩 더 돌려 따라잡음
      if (S.kind === 'online' && S.role !== 'host') for (let x = 0; x < 12 && S && !S.ended && S.synced && S.netQ.length > 3; x++) { const k = S.st.tick; tick(); if (!S || S.st.tick === k) break; }
      if (!S) return;
      if (S.ended) S.acc = 0;
      if (S.acc > TICK) S.acc = TICK;                                   // 느린 기기: 밀린 시간은 버림
      alpha = S.ended ? 1 : S.acc / TICK;
    }
    R.frame(alpha, S.paused && !S.counting ? 0 : dt);
  }
  // 느린 기기: 화면이 계속 끊기면(평균 36fps 아래로 2.5초) 그리기 해상도를 한 단계씩 낮춤 (판 진행은 그대로)
  //  다시 8초 동안 넉넉히 빠르면(53fps 넘게) 한 단계 올림. 올리자마자(20초 안) 또 느려지면 그 기기는 낮은 단계로 고정
  let slowT = 0, fastT = 0, ema = 0, raisedAt = -1e9, qLock = false;
  function watchSpeed(dt) {
    if (dt <= 0 || S.ff) return;
    const now = performance.now();
    ema = ema ? ema * 0.94 + dt * 0.06 : dt;
    if (ema > 0.028) slowT += dt; else slowT = Math.max(0, slowT - dt);
    if (ema < 0.019) fastT += dt; else fastT = 0;
    if (slowT > 2.5 && R.quality > 0.6) {
      if (now - raisedAt < 20000) qLock = true;
      R.setQuality(R.quality > 0.8 ? 0.75 : 0.6); slowT = 0; fastT = 0; ema = 0;
    } else if (fastT > 8 && R.quality < 1 && !qLock) {
      R.setQuality(R.quality < 0.7 ? 0.75 : 1); raisedAt = now; slowT = 0; fastT = 0; ema = 0;
    }
  }
  function tick() {
    const st = S.st, acts = S.acts;
    if (S.kind === 'online') {
      if (S.role === 'host') {
        for (let i = 0; i < st.n; i++) acts[i] = S.ctrls[i].decide(st, i);
        // 꼭 전하기(순서대로) · 틱 번호 k · 5초마다 확인값 h (친구 기기가 어긋났는지 스스로 알게)
        const m = { t: 'tk', g: S.g, k: st.tick + 1, a: acts.slice() };
        if (st.tick % 40 === 0) m.h = L.hash(st);
        try { S.net.broadcast(m, true); } catch (e) {}
      } else {
        if (!S.synced) return;
        let m = null;
        while (S.netQ.length && S.netQ[0].k <= st.tick) S.netQ.shift();   // 이미 지난 틱
        if (!S.netQ.length) return;
        m = S.netQ[0];
        if (m.k !== st.tick + 1 || (m.h && m.h !== L.hash(st))) { askSync(); return; }   // 빠졌거나 어긋남 → 다시 받음
        S.netQ.shift();
        for (let i = 0; i < st.n; i++) acts[i] = m.a[i] | 0;
      }
    } else {
      for (let i = 0; i < st.n; i++) acts[i] = S.ctrls[i].decide(st, i);
    }
    R.beforeTick();
    const evs = L.step(st, acts);
    R.afterTick(evs);
    for (const e of evs) { onEvent(e); if (!S) return; }
    if (!S.ended) afterTick();
  }

  // ══ 일어난 일 → 소리 · 효과 · 알림 ══════════════════════════
  const onScreen = c => R.visible(c[0], c[1], 2);                       // 화면 안(+2칸)에서 일어난 일만 소리
  const isMine = i => S.me >= 0 && i >= 0 && (i === S.me || i === S.me2);   // 이 기기 사람 (둘이서면 1P·2P 둘 다)
  function onEvent(e) {
    const st = S.st, total = st.W * st.H;
    if (window.__land && __land.onEv) __land.onEv(e);
    if (e.t === 'capture') {
      const pct = e.n / total * 100, c = R.cellCenter(e.y * st.W + e.x);
      const watchIt = S.me < 0 || S.out ? e.p === R.follow : isMine(e.p);
      if (watchIt && !S.ff) {
        sfx('land-cap', { pct: isMine(e.p) ? pct : pct * 0.7 });
        const m = R.centroid(e.cells);                                  // 새로 칠해진 곳 가운데 (내 머리를 가리지 않게)
        R.floatText(m[0], m[1], `+${pctStr(Math.max(0.1, pct))}%`, PAL[S.animals[e.p]].text, Math.min(34, 19 + pct * 2.4), e.p);
        if (isMine(e.p)) { if (pct >= 1) Cozy.vibrate(pct >= 4 ? 30 : 12); if (pct >= 5) combo('🎉 크게 먹었다!'); }
      } else if (!S.ff && onScreen(c)) sfx('land-pop');
    } else if (e.t === 'death') {
      feed(e);
      if (isMine(e.p)) myDeath(e);
      else if (isMine(e.by)) myKill(e);
      else if (!S.ff && onScreen(R.cellCenter(e.y * st.W + e.x))) sfx('land-splat', { vol: 0.12 });
    } else if (e.t === 'spawn') {
      if (isMine(e.p)) { sfx('land-spawn'); hideMsg(); S.ctrls[e.p].q.length = 0; }
    } else if (e.t === 'leave') {
      if (isMine(e.p)) sfx('land-leave');
    } else if (e.t === 'end') endGame();
  }
  function deathWhy(e) {
    const w = e.by >= 0 ? who(e.by) : '';
    switch (e.cause) {
      case 'cut': return `앗! ${josa(w, '이', '가')} 내 선을 끊었어요`;
      case 'crash': return e.by >= 0 ? `꽝! ${josa(w, '과', '와')} 부딪혔어요` : '꽝! 머리끼리 부딪혔어요';
      case 'trap': return `앗! ${w}에게 갇혔어요`;
      case 'wipe': return `앗! ${josa(w, '이', '가')} 내 땅을 다 가져갔어요`;
      case 'wall': return '앗! 종이 밖으로 나갔어요';
      case 'self': return '앗! 내 선을 밟았어요';
    }
    return '앗! 아웃!';
  }
  function myDeath(e) {
    sfx('land-die'); Cozy.vibrate([40, 40, 70]);
    S.ctrls[e.p].q.length = 0;
    if (e.p === S.me) { S.danger = false; R.setDanger(false); }
    const duo = S.kind === 'duo', pre = duo ? `${S.names[e.p]} · ` : '';
    // 알림은 철퍽 자리 반대쪽에 (터지는 모습이 가려지지 않게)
    const c = R.cellCenter(e.y * S.st.W + e.x), s = R.screenOf(c[0], c[1]), h = $('stage').clientHeight;
    $('msg').style.top = s[1] < h * 0.5 ? '68%' : '30%';
    if (S.mode === 'classic') showMsg(pre + deathWhy(e), '2초 뒤 새 땅에서 다시 시작해요');
    else if (duo && !S.outs[1 - e.p]) {                                    // 둘이서 한 목숨: 한 명만 탈락 → 다른 한 명은 계속
      S.outs[e.p] = true;
      showMsg(pre + deathWhy(e), `탈락! ${S.names[1 - e.p]} 힘내요`);
      later(hideMsg, 2200);
    } else {
      S.outs[e.p] = true; S.out = true; S.followAuto = true;
      showMsg(pre + deathWhy(e), duo ? '둘 다 탈락! 남은 친구들을 구경해요' : '탈락! 남은 친구들을 구경해요');
      later(() => { hideMsg(); dockFor(); syncPad(); }, 2200);
    }
  }
  function myKill(e) {
    sfx('land-kill'); Cozy.vibrate(25);
    combo(e.cause === 'trap' ? '🫧 가뒀다!' : e.cause === 'wipe' ? '🍽️ 다 먹었다!' : e.cause === 'crash' ? '💥 이겼다!' : '✂️ 잡았다!');
  }
  function feed(e) {
    if (S.ff) return;
    const v = who(e.p), k = e.by >= 0 ? who(e.by) : '';
    let h = '';
    if (e.cause === 'cut') h = `<b>${k}</b> ✂️ ${v}`;
    else if (e.cause === 'crash') {
      if (e.by >= 0) h = `<b>${k}</b> 💥 ${v}`;
      else {
        const ids = [e.p].concat(e.w || []).sort((a, b) => a - b), key = S.st.tick + ':' + ids.join(',');
        if (S.crashKey === key) return;
        S.crashKey = key; h = `💥 ${ids.map(who).join(' · ')} 꽝!`;
      }
    } else if (e.cause === 'trap') h = `<b>${k}</b> 🫧 ${v} 가둠`;
    else if (e.cause === 'wipe') h = `<b>${k}</b> 🍽️ ${v}`;
    else if (e.cause === 'wall') h = `${v} 종이 밖으로 💫`;
    else h = `${v} 자기 선에 꼬였어요 🌀`;
    const d = document.createElement('div');
    d.innerHTML = h;
    if (isMine(e.p) || isMine(e.by) || (e.w && e.w.some(isMine))) d.className = 'mine';
    const f = $('feed'); f.appendChild(d);
    while (f.children.length > 3) f.firstChild.remove();
    later(() => d.remove(), 3800);
  }
  function combo(text) {
    const d = $('comboPop'); d.textContent = text; d.hidden = false;
    d.classList.remove('go'); void d.offsetWidth; d.classList.add('go');
    clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, 1100);
  }
  function showMsg(a, b) { const m = $('msg'); m.innerHTML = `${a}${b ? `<small>${b}</small>` : ''}`; m.hidden = false; m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; }
  function hideMsg() { $('msg').hidden = true; }

  // ══ 틱마다 화면 숫자 ══════════════════════════════════════
  function leader() {
    let b = -1, ba = -1;
    for (const p of S.st.players) if (p.alive && p.area > ba) { ba = p.area; b = p.id; }
    return b < 0 ? 0 : b;
  }
  function focusId() { return S.me >= 0 && !S.out ? S.me : R.follow; }
  function hud() {
    const st = S.st, f = focusId(), p = st.players[f], total = st.W * st.H;
    const left = (st.limit - st.tick) / TPS;
    const setT = (id, v) => { const el = $(id); if (el.textContent !== v) el.textContent = v; };   // 바뀔 때만 (레이아웃 일 줄이기)
    if (S.kind === 'duo') { const a = st.players[0], b = st.players[1]; setT('myPct', `${ANIM(0).em}${pctStr(a.area / total * 100)} · ${ANIM(1).em}${pctStr(b.area / total * 100)}%`); }
    else setT('myPct', `${ANIM(f).em} ${pctStr(p.area / total * 100)}%`);
    const tl = $('timer');
    let tt = `⏱ ${fmtT(left)}`;
    if (S.mode === 'life') { let n = 0; for (const q of st.players) if (q.alive) n++; tt += ` · ❤️ ${n}`; }
    if (S.kind === 'online') {                                          // 친구랑: 이 방에서 내가 이긴 횟수 · 구경하는 사람 수
      const mw = S.me >= 0 ? RM.wins[S.seats[S.me]] || 0 : 0, wc = Object.keys((NET && NET.players) || {}).filter(u => !S.seats.includes(u)).length;
      if (mw) tt += ` · 🏅 ${mw}승`;
      if (wc) tt += ` · 👀 ${wc}`;
    }
    if (tl.textContent !== tt) tl.textContent = tt;
    tl.classList.toggle('hurry', left <= 10 && !S.ended);
  }
  function drawRank(force) {
    if (!force && performance.now() - rankDown.t < 600) return;          // 구경에서 줄을 누르는 중
    const st = S.st, rk = L.ranking(st), f = focusId(), total = st.W * st.H;
    const row = (r, i) => {
      const p = st.players[r.id], an = ANIM(r.id), cls = ['rk'];
      if (isMine(r.id)) cls.push('me');
      if (!p.alive) cls.push('out');
      if (r.id === R.follow && (S.me < 0 || S.out)) cls.push('fol');
      return `<div class="${cls.join(' ')}" data-id="${r.id}"><i>${i + 1}</i><span class="dot" style="background:${PAL[S.animals[r.id]].mini}">${an.em}</span><b>${nameOf(r.id)}</b><em>${pctStr(r.area / total * 100)}</em></div>`;
    };
    // 늘 6줄 + 점선 자리 (내가 5등 안팎을 오가도 카드 크기가 그대로): 6등 밖이면 점선 + 나, 아니면 6등을 그대로
    let h = rk.slice(0, 5).map(row).join('');
    const fi = rk.findIndex(r => r.id === f);
    if (S.kind === 'duo') {                                                // 둘이서: 5등 밖의 1P·2P 를 아래에 (등수 순)
      const out = [0, 1].map(id => rk.findIndex(r => r.id === id)).filter(i => i >= 5).sort((a, b) => a - b);
      if (out.length) h += '<div class="rk sep"></div>' + out.map(i => row(rk[i], i)).join('');
      else if (rk.length > 5) h += '<div class="rk sep ghost"></div>' + row(rk[5], 5);
    } else if (fi >= 6) h += '<div class="rk sep"></div>' + row(rk[fi], fi);
    else if (rk.length > 5) h += '<div class="rk sep ghost"></div>' + row(rk[5], 5);
    $('rankBox').innerHTML = h;
    // 위 알약(내 등수)도 같은 순위로 같이 (둘이 어긋나 보이지 않게)
    const r2 = S.kind === 'duo' ? rk.findIndex(r => r.id === 1) : -1;
    const pill = S.kind === 'duo' ? `1P ${rk.findIndex(r => r.id === 0) + 1}등 · 2P ${r2 + 1}등` : S.me >= 0 && !S.out ? `🏆 ${fi + 1}등` : `${ANIM(f).em} ${fi + 1}등`, pe = $('rankPill');
    if (pe.textContent !== pill) pe.textContent = pill;
  }
  function afterTick() {
    const st = S.st;
    hud();
    if (st.tick % 2 === 0) drawRank();
    // 마지막 10초 째깍
    const sec = Math.ceil((st.limit - st.tick) / TPS);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec <= 10 && sec > 0 && !S.ff) sfx('tick'); }
    // 내 선 위험: 남의 머리가 내 선 3칸 안
    if (S.me >= 0 && !S.out) {
      const p = st.players[S.me];
      const d = p.alive && p.trail.length ? B.threat(st, p, true) : 99, on = d <= 3;
      if (on && !S.danger && st.tick - S.dangerTick > 12) { sfx('land-danger'); S.dangerTick = st.tick; }
      S.danger = on; R.setDanger(on);
    }
    // 구경: 1등을 따라감 (자주 바뀌지 않게 넉넉히)
    if ((S.me < 0 || S.out) && st.tick % 4 === 0) {
      const cur = R.follow, cp = st.players[cur], lead = leader();
      const deadLong = !cp || (!cp.alive && st.tick - cp.dieT > 8);
      if (deadLong && !S.followAuto && !cp.alive && st.mode === 'life') S.followAuto = true;
      if (lead !== cur && (deadLong || (S.followAuto && st.players[lead].area > cp.area + 40 && st.tick - S.followTick > 24))) { R.setFollow(lead); S.followTick = st.tick; drawRank(); }
    }
  }

  // ══ 시작 카운트다운 · 멈춤 · 끝 ════════════════════════════
  const PC = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function countdown(then, fast) {
    S.counting = true;
    const box = $('countBox'), el = $('count'), steps = ['3', '2', '1', '시작!'];
    let i = 0;
    box.hidden = false;
    // 처음 시작 땐 조작 한 줄 (카운트 중에 미리 방향을 정할 수 있음)
    const hint = $('cntHint');
    hint.hidden = !!fast;
    hint.textContent = S.kind === 'duo' ? '⌨️ 1P는 WASD · 2P는 방향키' : S.me < 0 ? '🎥 화면이 1등을 따라가요' : PC ? '⌨️ 방향키·WASD로 움직여요' : '👆 화면을 밀면 그쪽으로 돌아요';
    const cd = (fn, ms) => S.cdTimers.push(later(fn, ms));              // 카운트다운 타이머는 따로 (멈추면 이것만 지움)
    R.setHint(S.me >= 0 || S.kind === 'watch');                          // '나'(구경: 따라가는 친구) 이름표 통통
    const next = () => {
      el.textContent = steps[i]; el.classList.toggle('go', i === 3);
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      sfx(i < 3 ? 'count' : 'go');
      if (i === 3) { S.counting = false; R.setHint(false); then(); cd(() => { box.hidden = true; }, 420); return; }
      i++; cd(next, fast ? 450 : 620);
    };
    next();
  }
  function pause() {
    if (!S || S.ended || S.kind === 'online' || (S.paused && !S.counting)) return;   // 다시 시작 카운트 중에 숨겨져도 다시 멈춤 · 친구랑은 멈춤 없음
    if (S.counting) { for (const t of S.cdTimers) clearTimeout(t); S.cdTimers = []; S.counting = false; R.setHint(false); $('countBox').hidden = true; S.running = true; }
    S.paused = true;
    modal('⏸ 잠깐 멈췄어요', '<p class="lede" style="margin:0">준비되면 계속해요. 3초를 세고 다시 시작해요.</p>', [
      ['계속하기', resume, true], ['하는 법', () => { howto(true); return false; }], ['메뉴', goMenu, false, true]]);
  }
  function resume() { if (!S || !S.paused) return; countdown(() => { if (S) S.paused = false; }, true); }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.kind !== 'online' && !S.ended && (S.counting || (S.running && !S.paused))) pause(); });

  // 🏆 랭킹: 혼자(AI)·친구랑 판만 — 각자 자기 기기에서 한 번 (둘이서·구경 제외). 1등만 승, 점수 = 칠한 땅 %
  function rankReport() {
    try {
      const res = S.st.results, online = S.kind === 'online';
      if (!window.GRank || !res || S.me < 0 || (!online && S.kind !== 'solo') || res.length < 2) return;
      const r = res.find(x => x.id === S.me); if (!r) return;
      GRank.result('land', {
        mode: online ? 'friend' : 'ai', res: r.rank === 1 ? 'w' : 'l', beat: res.filter(x => x.rank > r.rank).length, score: r.pct,
        opp: online ? res.filter(x => x.id !== S.me && x.id < S.seats.length && !S.subs.has(x.id)).map(x => ({ uid: S.seats[x.id], res: r.rank < x.rank ? 'w' : 'l' })) : undefined,
      });
    } catch (e) { console.warn('[rank]', e); }
  }
  function endGame() {
    S.ended = true; S.running = false; S.ff = false;
    rankReport();
    if (S.kind === 'online' && S.st.results) {                          // 1등인 사람 +1승 (모든 화면이 같은 순간에 세므로 방장 기록과 같음)
      const w = S.st.results.find(r => r.rank === 1), u = w && S.seats[w.id];
      if (u) RM.wins[u] = (RM.wins[u] || 0) + 1;
    }
    sfx('land-whistle'); R.setDanger(false); hideMsg();
    hud(); drawRank(true);
    $('timer').classList.remove('hurry');
    later(() => R.setOverview(true), 450);
    later(showResults, 1300);
  }
  function medal(r) { return r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r; }
  // 한 목숨: 끝까지 산 친구는 ❤️, 아웃된 친구는 흐리게 + 아웃된 때 (순위가 '오래 버틴 순'인 게 보이게)
  function resRow(r) {
    const an = ANIM(r.id), life = S.mode === 'life', cls = [];
    if (r.id === S.me || (S.kind === 'duo' && r.id === S.me2)) cls.push('me');
    if (life && !r.alive) cls.push('out');
    const tag = life ? `<small>${r.alive ? '❤️ 끝까지' : `💫 ${fmtT(r.aliveT / TPS)}`}</small>` : '';
    const ww = S.kind === 'online' ? RM.wins[S.seats[r.id]] || 0 : 0;      // 친구랑: 이 방 전적
    return `<li class="${cls.join(' ')}"><i>${medal(r.rank)}</i><span class="dot" style="background:${PAL[S.animals[r.id]].mini}">${an.em}</span><span>${nameOf(r.id)}${ww ? ` <small class="wn">🏅${ww}</small>` : ''}</span><em>${tag}${pctStr(r.pct)}%</em></li>`;
  }
  function showResults() {
    const st = S.st, res = st.results;
    const online = S.kind === 'online', host = online && S.role === 'host';
    // 친구랑: 판 사이에 손님은 '✋ 준비', 방장은 다 준비되면 다음 판 시작 (혼자 다시 시작하지 못함) · 구경꾼은 방장이 체크하면 다음 판부터 같이
    const nextRound = () => hostRound(undefined, true);
    const againBtns = online
      ? (host ? [['다음 판 시작 ▶', nextRound, true], ['안 기다리고 시작', nextRound], ['대기실', toLobby], ['나가기', goMenu, false, true]]
        : [['✋ 준비', () => { RM.rdy.add(NET.uid); try { NET.send({ t: 'rdy', g: S.g }, true); } catch (e) {} S.drawReady(); return false; }, true], ['나가기', goMenu, false, true]])
      : null;
    const rdy = online ? '<div class="rdy"></div>' : '';
    if (S.me < 0) {
      const w = res[0];
      modal('🏁 구경 끝!', `<div class="big">${ANIM(w.id).em} ${nameOf(w.id)}</div><p class="res-sub">${pctStr(w.pct)}% 칠하고 1등! · ✂️ ${w.kills}번 끊었어요</p><ol class="rlist">${res.map(resRow).join('')}</ol>${rdy}`,
        againBtns || [['한 판 더 구경', restart, true], ['메뉴', goMenu]], false, 'land-res');
      if (online) wireReady();
      sfx('good');
      return;
    }
    if (S.kind === 'duo') return duoResults(res);
    const r = res.find(x => x.id === S.me);
    const life = S.mode === 'life';
    const title = life && r.rank === 1 && r.alive ? '🏆 끝까지 살아남았어요!' : r.rank <= 3 ? `${medal(r.rank)} ${r.rank}등!` : `${r.rank}등`;
    let sub = r.rank === 1 ? '땅따먹기 왕이에요! 👑' : r.rank <= 3 ? '아깝다! 조금만 더 넓게!' : '다음엔 더 넓게 칠해 봐요';
    if (!life && !r.alive) sub = '끝날 때 아웃돼 있어서 0%예요. 마지막엔 내 땅 안에 있기!';
    if (life && !r.alive) sub = `${fmtT(r.aliveT / TPS)} 동안 버텼어요. ${r.rank <= 3 ? '잘했어요!' : '다음엔 더 오래!'}`;
    // 최고 기록: 클래식은 % 먼저, 한 목숨은 등수 → 버틴 시간 → % 순. 처음 기록은 3등 안일 때만 '최고 기록!' 으로 축하
    const key = bestKey(S.mode, S.tier, S.st.n), bests = Cozy.store('land.best', {}), old = bests[key];
    const beat = !online && life
      ? (!old || r.rank < old.rank || (r.rank === old.rank && ((r.aliveT || 0) > (old.aliveT || 0) || ((r.aliveT || 0) === (old.aliveT || 0) && r.pct > old.pct))))
      : !online && r.pct > 0 && (!old || r.pct > old.pct || (r.pct === old.pct && r.rank < old.rank));
    if (beat) { bests[key] = { pct: r.pct, rank: r.rank, aliveT: r.aliveT }; Cozy.save('land.best', bests); }
    const isBest = beat && (old ? true : r.rank <= 3);
    const html = `<div class="big">${pctStr(r.pct)}%</div>
      <p class="res-sub">${sub}${isBest ? ' <b class="newbest">· 최고 기록!</b>' : ''}</p>
      <div class="rstat">
        <span><i>✂️ 끊은 횟수</i><b>${r.kills}번</b></span>
        <span><i>🍰 가장 크게 먹은 땅</i><b>+${pctStr(r.bestPct)}%</b></span>
        <span><i>⏱ 살아 있던 시간</i><b>${fmtT(r.aliveT / TPS)}</b></span>
        <span><i>💫 아웃</i><b>${r.deaths}번</b></span>
      </div>
      <ol class="rlist">${res.map(resRow).join('')}</ol>${rdy}`;
    modal(title, html, againBtns || [['다시 하기', restart, true], ['메뉴', goMenu]], false, 'land-res');
    if (online) wireReady();
    if (r.rank === 1) { sfx('land-win'); Cozy.confetti(); }
    else if (r.rank <= 3) sfx('good');
    else sfx('lose');
  }

  // 판 사이 준비 목록 (결과 창 안): 앉은 사람 ✅/⏳/🔌 · 구경하는 사람(방장은 체크해서 다음 판에 같이) · 방장 단추는 다 준비돼야 켜짐
  function wireReady() {
    const s = S, net = NET, host = s.role === 'host', myId = net.uid;
    const ov = [...document.querySelectorAll('.overlay.land-res')].pop(); if (!ov) return;
    const rb = ov.querySelector('.rdy'), bs = ov.querySelectorAll('.row button'), nb = bs[0], fb = host ? bs[1] : null;
    s.drawReady = () => {
      if (S !== s || !rb.isConnected) return;
      const pl = net.players || {}, hostId = (net.meta || {}).host, esc = Cozy.esc;
      const row = s.seats.map((u, p) => {
        const nm = esc(u === myId ? '나' : s.names[p]);
        if (u === hostId) return `<span class="ok">👑 ${nm}</span>`;
        const gone = !pl[u], ok = RM.rdy.has(u) || s.subs.has(p);
        return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${nm}</span>`;
      });
      const wu = Object.keys(pl).filter(u => !s.seats.includes(u));
      const wl = wu.map(u => {
        const nm = esc((pl[u] || {}).name || '친구'), hand = RM.rdy.has(u) ? ' ✋' : '';
        return host ? `<label><input type="checkbox" data-pick="${esc(u)}" ${RM.pick[u] ? 'checked' : ''}> ${nm}${hand}</label>` : `<span>${nm}${hand}${RM.pick[u] ? ' ✔' : ''}</span>`;
      }).join('');
      rb.innerHTML = `<div class="rdy-row">${row.join('')}</div>${wu.length ? `<div class="rdy-w">👀 구경 ${wu.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
      if (host) {
        const need = s.seats.filter((u, p) => u !== myId && pl[u] && !s.subs.has(p)), n = need.filter(u => RM.rdy.has(u)).length, all = n === need.length;
        nb.disabled = !all; nb.textContent = all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${n}/${need.length})`;
        fb.hidden = all;
        rb.querySelectorAll('[data-pick]').forEach(c => c.onchange = () => { RM.pick[c.dataset.pick] = c.checked; sendRdy(); });
      } else {
        const on = RM.rdy.has(myId), seated = s.seats.includes(myId);
        nb.disabled = on; nb.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : seated ? '✋ 준비' : '✋ 다음 판에 낄래요';
      }
    };
    s.drawReady();
  }

  // 한 키보드 둘이서 결과: 1P · 2P 중 누가 이겼나 + 둘의 기록 (최고 기록은 안 남김)
  function duoResults(res) {
    const a = res.find(x => x.id === 0), b = res.find(x => x.id === 1);
    const win = a.rank < b.rank ? 0 : 1, w = win ? b : a;
    const card = (r, i) => `<span><i>${ANIM(i).em} ${i + 1}P · ${medal(r.rank)}${r.rank > 3 ? '등' : ''}</i><b>${pctStr(r.pct)}%</b><i>✂️ ${r.kills}번 · 💫 ${r.deaths}번</i></span>`;
    const html = `<div class="big">${ANIM(win).em} ${win + 1}P 승리!</div>
      <p class="res-sub">${w.rank === 1 ? '전체 1등까지! 👑' : `${win ? '1P' : '2P'}보다 넓게 칠했어요`}</p>
      <div class="rstat">${card(a, 0)}${card(b, 1)}</div>
      <ol class="rlist">${res.map(resRow).join('')}</ol>`;
    modal(`🏁 ${win + 1}P 승리!`, html, [['다시 하기', restart, true], ['메뉴', goMenu]], false, 'land-res');
    sfx('land-win'); Cozy.confetti();
  }

  // ══ 조작: 밀기(어디서나) · 방향키 · 둥근 방향 단추 ══════════
  // 돌았으면 true (같은 쪽 · 되돌기는 버림)
  function heading() {
    if (!S || S.me < 0) return -1;
    const q = S.ctrls[S.me].q;
    return q.length ? q[q.length - 1] : S.st.players[S.me].dir;
  }
  function steer(d, seat) {
    if (!S || S.me < 0 || S.paused || S.ended) return false;
    seat = seat == null ? S.me : seat;                                   // 둘이서: 1 = 2P
    if (seat !== S.me && seat !== S.me2) return false;
    const p = S.st.players[seat];
    if (!p.alive || (S.kind === 'duo' ? S.outs[seat] : S.out)) return false;
    const q = S.ctrls[seat].q, lastD = q.length ? q[q.length - 1] : p.dir;
    if (d === lastD || d === ((lastD + 2) & 3)) return false;
    if (q.length >= 3) q.pop();
    q.push(d);
    if (S.kind === 'online' && S.role !== 'host' && S.net) {
      try { S.net.send({ t: 'steer', g: S.g, d }, true); } catch (e) {}  // 꼭 전하기 (돌기 하나가 빠지면 벽으로 가니까)
    }
    return true;
  }
  const KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
  // 창이 두 겹(멈춤 위에 하는 법)이면 Enter·Esc 는 맨 위 창만 받게 (공통 창은 저마다 Enter 를 받아서 아래 '계속하기'까지 눌림)
  addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    const ovs = document.querySelectorAll('.overlay:not(.soft)');
    if (ovs.length < 2) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const top = ovs[ovs.length - 1], b = top.querySelector('.row .primary') || top.querySelector('.row button');
    if (b) b.click();
  }, true);
  addEventListener('keydown', e => {
    // 메뉴: Enter = 시작 (단추에 초점이 있으면 그 단추가 받음)
    if ($('play').hidden && e.key === 'Enter' && !document.querySelector('.overlay:not([hidden])') && !(document.activeElement && document.activeElement.closest('button, a, input'))) { e.preventDefault(); start(opts.tab); return; }
    if (!S || $('play').hidden) return;
    if (document.querySelector('.overlay.land-modal, .overlay:not(.soft):not([hidden])')) return;   // 창이 떠 있으면 창이 키를 받음
    if (e.code in KEYS) { e.preventDefault(); if (!e.repeat) steer(KEYS[e.code], S.kind === 'duo' ? (e.code.startsWith('Arrow') ? 1 : 0) : S.me); return; }   // 둘이서: WASD = 1P · 방향키 = 2P
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { e.preventDefault(); if ((S.kind === 'solo' || S.kind === 'duo') && !S.out) pause(); }
  });
  // 밀기 (손가락마다 따로): 한 번 끄는 동안(손을 떼기 전)
  //  · 첫 돌기: 16px 움직이면 바로, 가장 많이 움직인 쪽으로
  //  · 다음 돌기: 마지막으로 돈 곳에서 36px 넘게, 옆보다 1.8배 넘게 그쪽으로 움직여야 (둥글게·비스듬히 미는 엄지가 두 번 돌지 않게)
  //  · 끌기 전 가던 쪽으로 되돌아가는 돌기는 180ms 지났거나 48px 넘게 움직였을 때만
  //  · 방금 돈 쪽으로 계속 미는 동안엔 기준점이 손가락을 따라감 (꺾는 곳부터 다시 잼)
  const SWIPE = 16, SWIPE2 = 36, SWIPE_BACK = 48, RATIO2 = 1.8, BACK_MS = 180, swipes = new Map(), stage = $('stage');
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.dpad') || (e.target.closest('.rankbox') && (S && (S.me < 0 || S.out)))) return;
    swipes.set(e.pointerId, { x: e.clientX, y: e.clientY, n: 0, last: -1, pre: -1, t: 0 });
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    if (e.pointerType !== 'mouse') e.preventDefault();
  });
  stage.addEventListener('pointermove', e => {
    const s = swipes.get(e.pointerId); if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y, ax = Math.abs(dx), ay = Math.abs(dy);
    const big = Math.max(ax, ay), small = Math.min(ax, ay), d = ax > ay ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    const here = () => { s.x = e.clientX; s.y = e.clientY; };
    if (s.n === 0) {
      if (big < SWIPE) return;
      const before = heading();
      if (steer(d)) { s.n = 1; s.last = d; s.pre = before; s.t = e.timeStamp; }
      here();
      return;
    }
    if (d === s.last) { here(); return; }                                // 같은 쪽으로 계속 밂: 기준점만 따라감
    if (big < SWIPE2 || big < small * RATIO2) return;
    if (d === s.pre && e.timeStamp - s.t < BACK_MS && big < SWIPE_BACK) return;
    if (steer(d)) { s.n++; s.last = d; s.t = e.timeStamp; }
    here();
  });
  const endSwipe = e => swipes.delete(e.pointerId);
  stage.addEventListener('pointerup', endSwipe);
  stage.addEventListener('pointercancel', endSwipe);
  stage.addEventListener('contextmenu', e => e.preventDefault());
  for (const b of $('dpad').querySelectorAll('button')) {
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      steer(+b.dataset.d); sfx('tap');
      b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 120);
    });
  }
  // 구경: 순위표 줄을 누르면 그 친구를 따라감
  //  손가락이 닿은 순간의 줄로 정함 (떼기 전에 순위가 바뀌어 줄이 밀려도 처음 누른 친구) · 누르는 동안은 순위표를 다시 그리지 않음
  let rankDown = { id: -1, t: -1e9 };
  $('rankBox').addEventListener('pointerdown', e => {
    const r = e.target.closest('.rk[data-id]');
    rankDown = { id: r ? +r.dataset.id : -1, t: performance.now() };
  });
  $('rankBox').addEventListener('click', e => {
    if (!S || !(S.me < 0 || S.out)) return;
    const r = e.target.closest('.rk[data-id]');
    const id = performance.now() - rankDown.t < 1500 && rankDown.id >= 0 ? rankDown.id : r ? +r.dataset.id : -1;
    rankDown.t = -1e9;
    if (id < 0 || !S.st.players[id].alive) return;
    S.followAuto = false; R.setFollow(id); sfx('tap'); hud(); drawRank(true);
  });

  // ══ 아래 단추 줄 ══════════════════════════════════════════
  function dockFor() {
    const solo = S.me >= 0, watching = !solo || S.out, online = S.kind === 'online';
    $('pauseBtn').hidden = watching || online;                           // 친구랑: 멈춤·빠르게·결과 보기 없음 (모두 같은 시계)
    $('padBtn').hidden = watching || S.kind === 'duo';                    // 둘이서는 키보드만
    $('speedBtn').hidden = !watching || online;
    $('followBtn').hidden = solo && !(online && S.out);
    $('skipBtn').hidden = !(solo && S.out) || online;
    $('restartBtn').hidden = online && S.role !== 'host';
    $('restartBtn').lastElementChild.textContent = online ? '새 판' : solo ? '처음부터' : '다시 구경';
    $('play').classList.toggle('watch', watching);
    drawSpeed();
  }
  function syncPad() {
    const on = opts.pad && S && S.me >= 0 && !S.out && S.kind !== 'duo';
    $('dpad').hidden = !on;
    $('padBtn').setAttribute('aria-pressed', String(!!opts.pad));
    $('play').classList.toggle('padon', !!on);
  }
  function drawSpeed() { $('speedBtn').lastElementChild.textContent = S && S.speed > 1 ? `${S.speed}배` : '빠르게'; $('speedBtn').setAttribute('aria-pressed', String(!!S && S.speed > 1)); }
  $('pauseBtn').onclick = () => pause();
  $('padBtn').onclick = () => { opts.pad = !opts.pad; saveOpts(); syncPad(); sfx('tap'); };
  $('speedBtn').onclick = () => { if (!S || S.ff) return; S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 4 : 1; drawSpeed(); sfx('tap'); };
  $('followBtn').onclick = () => { if (!S) return; S.followAuto = true; R.setFollow(leader()); S.followTick = S.st.tick; sfx('tap'); hud(); drawRank(true); };
  $('skipBtn').onclick = () => { if (!S || S.ended) return; S.ff = true; S.speed = 40; R.setFast(true); sfx('whoosh'); };
  // 처음부터: 한창 하는 중(10초 넘게)이면 두 번 눌러야 (실수로 3분 판이 날아가지 않게). 처음 10초 · 구경 · 탈락 뒤엔 한 번에
  let rsArm = 0;
  $('restartBtn').onclick = () => {
    if (S && !S.ended && S.me >= 0 && !S.out && S.st.tick > 80) {
      const now = Date.now();
      if (now - rsArm > 2000) { rsArm = now; sfx('tap'); Cozy.toast('한 번 더 누르면 처음부터 해요', 1800); return; }
    }
    rsArm = 0; sfx('tap'); restart();
  };
  Cozy.sfx.button($('sndBtn'));
  Cozy.backGuard($('backBtn'), goMenu);

  // 무대 크기 바뀜 (회전 · 주소창)
  let rsT = 0;
  const onResize = () => { cancelAnimationFrame(rsT); rsT = requestAnimationFrame(() => { if (S && !$('play').hidden) R.resize(); }); };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  addEventListener('resize', onResize);

  // ── 시작
  if (document.fonts && document.fonts.load) document.fonts.load('20px Jua').catch(() => {});
  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl(() => openFriendModal());
  window.__land = {                                                     // 점검용
    get S() { return S; }, get st() { return S && S.st; }, R, opts,
    ff(n) { R.setFast(true); for (let i = 0; i < n && S && !S.ended; i++) tick(); if (S) R.setFast(S.ff); },
    steer, start, goMenu, pause, resume, restart, toLobby,
    get net() { return NET; }, get shared() { return lastSh; },
  };
})();

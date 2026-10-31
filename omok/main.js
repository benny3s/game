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
    seg($('modeSeg'), [['ai', '🤖 AI 대전'], ['two', '👥 한 기기 둘이서']], pref.mode, v => { pref.mode = v; savePref(); drawMenu(); });
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
    drawMst();
  }
  $('tabSolo').onclick = () => { sfx('tap'); pref.tab = 'solo'; savePref(); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); pref.tab = 'watch'; savePref(); drawMenu(); };
  if ($('tabFriend')) $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('tap'); startFromMenu(); };
  $('helpBtn').onclick = () => howto(true);
  $('setBtn').onclick = openSettings;
  $('recBtn').onclick = openRecords;
  $('rankBtn').onclick = () => { sfx('tap'); try { if (window.GRank) GRank.open('omok'); } catch (e) {} };
  // 🏆 예전에 이 기기에만 있던 AI 대국 전적을 랭킹에 한 번 올림
  if (window.GRank) try { GRank.migrateLocal('omok', () => {
    let w = 0, l = 0, d = 0;
    const sum = o => Object.values(o || {}).forEach(v => { w += v.w || 0; l += v.l || 0; d += v.d || 0; });
    sum(stats()); if (!(w || l || d)) sum(Cozy.store('omok_stats_v1', null));
    return { n: w + l + d, w, l };
  }); } catch (e) {}

  // ════════ 친구랑: 방 최대 16명 — 2명(상담이면 4명)이 두고 나머지는 실시간 구경 ════════
  // 방장이 판의 주인: 손님 수는 방장에게 보내고, 방장이 확인해 모두에게 (수 번호 n 으로 순서 맞춤). 늦게 온 사람은 'hello' → 방장이 판 전체(sync)
  const OS = window.OmokSeats;
  const cfgLabel = c => `${(O.RULES[c && c.rule] || O.RULES.standard).name} · 방장 ${(c && c.hostColor) === 2 ? '백' : '흑'}${c && c.team ? ' · 2:2 상담' : ''}${c && c.coach ? ' · AI 선생님' : ''}`;
  function friendOpts() {
    let cur = { team: false };
    return {
      game: 'omok', title: '오목', max: 16, min: 2, coach: true,
      describe: (n, c) => OS.describe(n, !!((c || cur) && (c || cur).team)),
      settings: {
        defaults: { rule: pref.rule || 'standard', hostColor: 1, team: false },
        label: cfgLabel,
        render(el, c, canEdit, update) {
          cur = c || cur;
          if (!canEdit) { el.innerHTML = `<p class="arn-soft" style="text-align:center">${esc(cfgLabel(c))}</p>`; return; }
          el.innerHTML = `<div style="display:grid;gap:8px;margin-top:4px">
            <div class="optrow"><span class="small">규칙</span><div class="seg" id="fRuleSeg"></div></div>
            <div class="optrow"><span class="small">방장 돌</span><div class="seg" id="fColSeg"></div></div>
            <div class="optrow"><span class="small">방식</span><div class="seg" id="fTeamSeg"></div></div>
            <p class="arn-soft" style="text-align:center">${c && c.team ? '🤝 상담: 4명이 2:2, 같은 색끼리 번갈아 둬요' : '먼저 온 2명이 두고 나머지는 구경해요'}</p>
          </div>`;
          seg(el.querySelector('#fRuleSeg'), RULES.map(r => [r, O.RULES[r].name]), (c && c.rule) || 'standard', v => update({ rule: v }));
          seg(el.querySelector('#fColSeg'), [[1, '⚫ 흑'], [2, '⚪ 백']], (c && c.hostColor) || 1, v => update({ hostColor: +v }));
          seg(el.querySelector('#fTeamSeg'), [['0', '1:1 + 구경'], ['1', '🤝 2:2 상담']], c && c.team ? '1' : '0', v => update({ team: v === '1' }));
        },
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => leaveOnlineGame(),
      onLeave: () => { if (leaving) return; endOnline(); if (G && G.mode === 'online') goMenu(); },
    };
  }
  function openFriendModal() {
    if (!window.ArenaUI) return Cozy.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }
  let ON = null, leaving = false;           // 지금 친구 방 { net, host, hostUid, uid, lcfg, names, offs, team, coach, score, scoreRound, sub, ready, goneT, goneAsk }
  let TT = { key: '', t: 0, end: 0, left: null };   // ⏱ 내 차례 30초 (친구랑)
  const TURN_SEC = 30;
  const buzz = ms => { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; Cozy.vibrate(ms); };   // 한 번도 안 누른 화면은 브라우저가 막고 오류를 남김
  const nmOf = u => (ON && ON.names[u]) || '친구';
  function noteNames(p) { if (!ON) return; for (const u in p || {}) if (p[u] && p[u].name) ON.names[u] = p[u].name; }
  function endOnline() {
    if (!ON) return;
    ON.offs.forEach(f => { try { f(); } catch (e) {} });
    for (const k in ON.goneT) clearTimeout(ON.goneT[k]);
    if (ON.goneAsk) { try { ON.goneAsk(); } catch (e) {} }
    turnStop(); ON = null; coachOff();
    const rb = $('roomBar'); if (rb) rb.hidden = true;
  }
  function startOnline({ net, role, cfg, players }) {
    endOnline();
    const c = cfg || {};
    const hostUid = (net.meta && net.meta.host) || (role === 'host' ? net.uid : '');
    ON = { net, host: role === 'host', hostUid, uid: net.uid, lcfg: c, names: {}, offs: [], team: !!c.team, coach: !!c.coach, syncAt: 0,
      score: {}, scoreRound: 0, sub: {}, ready: { round: 0, set: new Set(), pick: {} }, goneT: {}, goneAsk: null, myReady: 0 };
    noteNames(players || net.players);
    startRound(OS.seat(players || net.players, hostUid, c.hostColor, c.team), 1);
    if (ON.host) {
      ON.offs.push(net.on('msg', (from, m) => onHostMsg(from, m)));
      ON.offs.push(net.on('leave', uid => hostLeft(uid)));
      ON.offs.push(net.on('join', uid => hostJoined(uid)));
      broadcastSync();
    } else {
      ON.offs.push(net.on('msg', m => onGuestMsg(m)));
      askSync(true);                                                   // 판이 이미 진행 중이었을 수도 있으니 방장에게 지금 판을 받음
    }
    ON.offs.push(net.on('players', p => { noteNames(p); syncSides(); drawViewers(); drawReady(); }));
  }
  function startRound(seats, round) {
    newGame({ mode: 'online', rule: (ON.lcfg && ON.lcfg.rule) || 'standard', seats, round, uid: ON.uid, net: ON.net, role: ON.host ? 'host' : 'guest' });
  }
  // 방 안의 것들 (점수 · AI 가 대신 앉은 사람 · 한 판 더 준비): 방장이 정하고 모두에게
  const readyOf = r => { if (ON.ready.round !== r) ON.ready = { round: r, set: new Set(), pick: {} }; return ON.ready; };
  const roomPart = () => { const R = readyOf(G.round); return { score: ON.score, sr: ON.scoreRound, sub: Object.keys(ON.sub).filter(u => ON.sub[u]), ready: [...R.set], pick: R.pick, round: G.round }; };
  const syncMsg = () => ({ t: 'sync', round: G.round, rule: G.rule, seats: G.seats, rec: O.encode(G.s), names: ON.names, secs: G.secs, room: roomPart() });
  function broadcastSync() { if (ON && ON.host && G && G.mode === 'online') ON.net.broadcast(syncMsg(), true); }
  function broadcastRoom() {
    if (ON && ON.host && G && G.mode === 'online') ON.net.broadcast(Object.assign({ t: 'room' }, roomPart()), true);
    syncSides(); drawReady();
  }
  function applyRoom(r) {
    if (!r || !ON || ON.host) return;
    if ((r.sr || 0) >= ON.scoreRound) { ON.score = r.score || {}; ON.scoreRound = r.sr || 0; }
    ON.sub = {}; (r.sub || []).forEach(u => { ON.sub[u] = true; });
    if (G && r.round === G.round) ON.ready = { round: r.round, set: new Set(r.ready || []), pick: r.pick || {} };
    syncSides(); drawReady();
  }
  // 방장: 판이 끝나면 이긴 쪽 +1승 · 진 쪽 +1패 (사람 기준, 색이 바뀌어도 이어짐)
  function countScore(g) {
    if (!ON || !ON.host || ON.scoreRound >= g.round) return;
    const w = g.s.winner; ON.scoreRound = g.round;
    for (const c of [1, 2]) for (const u of g.seats[c]) { const r = ON.score[u] = ON.score[u] || { w: 0, l: 0, d: 0 }; if (!w) r.d++; else if (w === c) r.w++; else r.l++; }
    broadcastRoom();
  }
  function askSync(force) {
    if (!ON || ON.host) return;
    const t = Date.now(); if (!force && t - ON.syncAt < 800) return;
    ON.syncAt = t; ON.net.send({ t: 'hello' }, true);
  }
  // 방장: 손님 메시지 확인
  function onHostMsg(from, m) {
    if (!m || !ON || !G || G.mode !== 'online') return;
    if (m.t === 'hello') { ON.net.send(from, syncMsg(), true); return; }
    if (m.t === 'ready' || m.t === 'again') {                         // 한 판 더: 준비 (구경꾼이 보내면 '끼고 싶어요')
      if (!G.over) return;
      const R = readyOf(G.round); R.set.add(from);
      if (!OS.colorOf(G.seats, from)) R.pick[from] = true;
      broadcastRoom(); return;
    }
    if (m.t !== 'move') return;
    const back = () => ON.net.send(from, syncMsg(), true);           // 어긋났으면 그 사람에게 지금 판을 다시
    if (m.round !== G.round || G.over) return back();
    if (m.a === O.RESIGN) { const col = OS.colorOf(G.seats, from); if (col) act(O.RESIGN, { color: col, from: 'remote' }); else back(); return; }
    if (m.n !== G.s.moves.length || !OS.canMove(G.seats, from, G.s)) return back();
    if (!act(m.a, { from: 'remote' })) back();
  }
  // 손님: 방장이 확인한 수 · 판 전체 · 방 소식
  function onGuestMsg(m) {
    if (!m || !ON) return;
    if (m.t === 'sync') { applySync(m); return; }
    if (m.t === 'room') { applyRoom(m); return; }
    if (m.t !== 'move' || !G || G.mode !== 'online') return;
    if (m.round !== G.round) return askSync();
    if (m.a === O.RESIGN) { if (!G.over) act(O.RESIGN, { color: m.color, from: 'remote' }); return; }
    const n = G.s.moves.length;
    if (m.n === n) { if (!act(m.a, { from: 'remote' })) askSync(); }
    else if (m.n < n) { if (G.s.moves[m.n] !== m.a) askSync(); }           // 내가 이미 둔 수 (방장 확인)
    else askSync();                                                    // 빠진 수가 있음
  }
  function applySync(m) {
    if (m.names) Object.assign(ON.names, m.names);
    ON.lcfg = Object.assign({}, ON.lcfg, { rule: m.rule });
    if (!G || G.mode !== 'online' || G.round !== m.round) startRound(m.seats, m.round);
    const g = G;
    g.seats = m.seats; g.me = OS.colorOf(m.seats, ON.uid); setOnlinePlayers(g);
    if (m.room) applyRoom(m.room);
    if (typeof m.secs === 'number' && m.secs > g.secs) g.secs = m.secs;
    const st = O.fromRecord(m.rec);
    if (st && O.encode(st) !== O.encode(g.s)) {
      const cur = g.s.moves, nx = st.moves;
      if (!g.over && cur.length <= nx.length && cur.every((v, i) => v === nx[i])) {   // 앞부분이 같으면 이어서 (소리·효과 그대로)
        for (let i = cur.length; i < nx.length && G === g && !g.over; i++) act(nx[i], { from: 'remote' });
        if (G === g && st.over && st.reason === 'resign' && !g.over) act(O.RESIGN, { color: 3 - st.winner, from: 'remote' });
      } else {                                                         // 크게 어긋나면 통째로
        g.s = st; g.over = false; board.clearFx(); preview = hover = cursor = -1; showConfirm(false);
        syncAll();
        if (st.over) finish(null); else advance();
      }
    }
    applyOnlineUI(); syncAll(); drawViewers(); turnSync();
  }
  // ── 방장: 두던 사람이 나가면 5초 기다렸다가 물음 (AI 가 대신 · 팀이면 빼기 · 처음부터 · 기다리기). 돌아오면 그 자리로
  function hostLeft(uid) {
    if (!ON || !ON.host || !G || G.mode !== 'online') return;
    syncSides(); drawViewers(); drawReady();
    if (!OS.colorOf(G.seats, uid) || ON.sub[uid]) return;
    Cozy.toast(`${nmOf(uid)}님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    const on = ON;
    clearTimeout(on.goneT[uid]);
    on.goneT[uid] = setTimeout(() => { if (ON !== on || !G || (on.net.players || {})[uid] || on.sub[uid] || !OS.colorOf(G.seats, uid)) return; askGone(uid); }, 5000);
  }
  function hostJoined(uid) {
    if (!ON || !ON.host || !G || G.mode !== 'online') return;
    clearTimeout(ON.goneT[uid]);
    if (ON.goneAsk && ON.goneFor === uid) { try { ON.goneAsk(); } catch (e) {} }
    if (ON.sub[uid]) {
      delete ON.sub[uid];
      Cozy.toast(`${nmOf(uid)}님이 돌아왔어요. 다시 직접 둬요`, 2400);
      try { ON.net.chat(`🙌 ${nmOf(uid)}님이 돌아와서 직접 둬요`); } catch (e) {}
      broadcastRoom();
    }
    syncSides(); drawViewers(); drawReady();
  }
  function askGone(uid) {
    if (!ON || !G || G.over || ON.goneAsk) return;
    const col = OS.colorOf(G.seats, uid); if (!col) return;
    const team = G.seats[col].length > 1, on = ON;
    const close = modal({
      title: `🔌 ${nmOf(uid)}님이 나갔어요`,
      html: `<p class="sub">어떻게 할까요? AI(🐱 중급)가 대신 두거나, 대기실로 돌아가 처음부터 다시 할 수 있어요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.</p>`,
      buttons: [{ label: '🤖 AI가 대신 둬요', primary: true, onClick: () => subAI(uid) }]
        .concat(team ? [{ label: '👋 빼기 (팀원이 이어서)', onClick: () => dropSeat(uid) }] : [])
        .concat([{ label: '🔄 처음부터 다시 (대기실로)', onClick: () => { try { on.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} if (window.ArenaUI) ArenaUI.toLobby(); } }, { label: '⏳ 기다릴게요' }]),
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
  // 팀 판에서만: 나간 사람을 빼고 팀원이 이어서 (한 색에 한 명뿐이면 못 뺌)
  function dropSeat(uid) {
    if (!ON || !ON.host || !G) return;
    const col = OS.colorOf(G.seats, uid); if (!col || G.seats[col].length < 2) return;
    G.seats = OS.remove(G.seats, uid).seats; delete ON.sub[uid];
    try { ON.net.chat(`👋 ${nmOf(uid)}님을 빼고 팀원이 이어서 둬요`); } catch (e) {}
    setOnlinePlayers(G); broadcastSync(); broadcastRoom(); advance();
  }
  // 방장: 자리 주인이 없어 AI 가 대신 두는 차례면 둠 (🐱 중급)
  function subTurn() {
    if (!ON || !ON.host || !G || G.mode !== 'online' || G.over || G.review || G.subBusy) return;
    const u = OS.mover(G.seats, G.s.turn, G.s.moves.length);
    if (!u || !ON.sub[u]) return;
    const g = G, n = g.s.moves.length, t0 = performance.now(); g.subBusy = true;
    think(O.toJSON(g.s), { tier: 'normal', seed: (Math.random() * 1e9) | 0 }).catch(() => null).then(res => {
      setTimeout(() => {
        g.subBusy = false;
        if (G !== g || g.over || g.review || g.s.moves.length !== n || !ON || !ON.sub[u]) return;
        if (!(res && res.move >= 0 && act(res.move, { from: 'remote' }))) { const lm = O.legalMoves(g.s); if (lm.length) act(lm[0], { from: 'remote' }); }
      }, Math.max(0, 700 - (performance.now() - t0)));
    });
  }
  // ⏱ 내 차례 30초: 지나면 🐱 중급 AI 가 대신 둠 (10초 남으면 알림). 차례가 바뀔 때마다 새로 셈
  function turnStop() { clearInterval(TT.t); TT = { key: '', t: 0, end: 0, left: null }; }
  function turnSync() {
    const on = !!(G && G.mode === 'online' && ON && !G.over && !G.review && humanTurn());
    const key = on ? G.round + ':' + G.s.moves.length : '';
    if (key === TT.key) return;
    turnStop(); TT.key = key;
    if (!on) { drawStat(); return; }
    const g = G;
    TT.end = Date.now() + TURN_SEC * 1000; TT.left = TURN_SEC;
    sfx('pop'); buzz(40);
    TT.t = setInterval(() => {
      if (G !== g || g.over || g.review || !humanTurn() || TT.key !== g.round + ':' + g.s.moves.length) { turnSync(); return; }
      const left = Math.max(0, Math.ceil((TT.end - Date.now()) / 1000));
      if (left !== TT.left) { TT.left = left; if (left === 10) { Cozy.toast('⏱ 10초 남았어요', 1500); buzz(30); } drawStat(); }
      if (left <= 0) { clearInterval(TT.t); TT.t = 0; turnTimeout(g, key); }
    }, 250);
    drawStat();
  }
  async function turnTimeout(g, key) {
    Cozy.toast('⏱ 30초가 지나서 AI가 대신 뒀어요', 2200);
    let mv = -1;
    try { const res = await think(O.toJSON(g.s), { tier: 'normal', seed: (Math.random() * 1e9) | 0 }); mv = res && res.move; } catch (e) {}
    if (G !== g || g.over || g.round + ':' + g.s.moves.length !== key) return;   // 그 사이 직접 뒀으면 그대로
    if (!(mv >= 0) || !act(mv)) { const lm = O.legalMoves(g.s); if (lm.length) act(lm[0]); }
  }
  // 방장: 다음 판 — 색 바꾸고, 남은 사람(AI 가 대신 앉은 사람 포함)은 그대로, 빈자리는 방장이 고른 구경꾼
  function hostAgain() {
    if (!ON || !ON.host || !G) return;
    const seats = OS.next(G.seats, ON.net.players, ON.hostUid, ON.team, { sub: ON.sub, pick: readyOf(G.round).pick });
    if (!seats[1].length || !seats[2].length) { Cozy.toast('같이 둘 친구가 없어요. 대기실에서 기다려요', 2200); if (window.ArenaUI) ArenaUI.toLobby(); return; }
    startRound(seats, G.round + 1);
    broadcastSync();
  }
  // 대기실로 (방장이 모두를 되돌림): 판 화면만 정리, 방은 그대로
  function leaveOnlineGame() {
    endOnline(); stopAll();
    for (const c of modals.slice().reverse()) c();
    G = null; board.clearFx(); show('menu'); drawMenu(); popHist();
  }
  function setOnlinePlayers(g) {
    g.players = { 1: { kind: g.me === 1 ? 'human' : 'remote' }, 2: { kind: g.me === 2 ? 'human' : 'remote' } };
  }
  function applyOnlineUI() {
    if (!G || G.mode !== 'online') return;
    $('resignBtn').hidden = !G.me;                                    // 구경하는 사람은 기권 없음
  }
  // 구경 표시: 구경꾼에게 '👀 구경 중' 배지 · 팀 구성 (구경하는 사람 수는 점수판 한 줄에)
  function drawViewers() {
    const el = $('viewbar'); if (!el) return;
    if (!G || G.mode !== 'online' || !ON || G.review && G.review.old) { el.hidden = true; return; }
    const team = G.seats[1].length > 1 || G.seats[2].length > 1;
    const tl = c => G.seats[c].map(u => esc(nmOf(u)) + (u === ON.uid ? '(나)' : '')).join('·');
    el.hidden = !!G.me && !team;
    el.innerHTML = (G.me ? '' : '<b class="vbadge">👀 구경 중</b><span class="vlist">끼고 싶으면 판이 끝난 뒤 ✋ 를 눌러요</span>') + (team ? `<span class="vlist">🤝 ⚫ ${tl(1)} vs ⚪ ${tl(2)}</span>` : '');
  }
  // 점수판 한 줄: 양쪽 이름 · 이 방 전적 · 지금 차례는 금색 · 구경 인원
  const roomBar = document.createElement('div'); roomBar.className = 'rbar'; roomBar.id = 'roomBar'; roomBar.hidden = true;
  $('scorebar').after(roomBar);
  function drawRoomBar() {
    const el = $('roomBar'); if (!el) return;
    if (!G || G.mode !== 'online' || !ON || G.review && G.review.old) { el.hidden = true; return; }
    const pl = ON.net.players || {}, turnC = G.over ? 0 : G.s.turn;
    const chips = [1, 2].map(c => {
      const l = G.seats[c] || [], nm = l.map(u => (u === ON.uid ? '나' : nmOf(u)) + (ON.sub[u] ? '🤖' : !pl[u] ? '🔌' : '')).join('·') || COLOR_NAME[c];
      const r = ON.score[l[0]] || { w: 0, l: 0, d: 0 };
      return `<span class="rbi${turnC === c ? ' on' : ''}"><i class="st ${c === 1 ? 'b' : 'w'}"></i><b>${esc(nm)}</b> ${r.w}승${r.l}패${r.d ? r.d + '무' : ''}</span>`;
    });
    const v = OS.order(pl, ON.hostUid).filter(u => !OS.colorOf(G.seats, u));
    el.innerHTML = chips.join('') + (v.length ? `<span class="rbi" title="${esc(v.map(nmOf).join(', '))}">👀 구경 ${v.length}</span>` : '');
    el.hidden = false;
  }
  // 결과 창 '한 판 더' 칸: 앉은 사람 준비 상태 · 구경꾼 신청 (손님은 ✋ 준비만, 시작은 방장이 — 혼자 다시 시작하는 사람 없음)
  function drawReady() {
    const box = document.getElementById('rdyBox');
    if (!box || !box.isConnected || !G || G.mode !== 'online' || !ON || !G.over) return;
    const host = ON.host, pl = ON.net.players || {}, R = readyOf(G.round);
    const seated = [...G.seats[1], ...G.seats[2]];
    const rows = seated.map(u => {
      if (u === ON.hostUid) return `<span class="ok">👑 ${esc(nmOf(u))}</span>`;
      const gone = !pl[u], sub = !!ON.sub[u], ok = (R.set.has(u) && !gone) || sub, col = OS.colorOf(G.seats, u);
      const tools = host && gone && !sub ? ` <button type="button" data-ai="${esc(u)}">🤖 AI</button>${G.seats[col].length > 1 ? ` <button type="button" data-drop="${esc(u)}">👋 빼기</button>` : ''}` : '';
      return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(nmOf(u))}${sub ? ' (AI)' : ''}${tools}</span>`;
    });
    const watchers = OS.order(pl, ON.hostUid).filter(u => !OS.colorOf(G.seats, u));
    const free = OS.free(G.seats, pl, ON.team, ON.sub);
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
      else if (b.dataset.drop) dropSeat(b.dataset.drop);
    };
    box.onchange = e => { const c = e.target.closest('input[data-join]'); if (c && ON && ON.host) { readyOf(G.round).pick[c.dataset.join] = c.checked; broadcastRoom(); } };
  }

  // ── AI 선생님: 아래 줄 🧑‍🏫 단추 하나로 켜고 끄는 공용 창 (common/coach.js) — 혼자·둘이서는 늘, 친구랑은 방장이 켰을 때만
  //    창이 열려 있으면 지금 둘 사람에게 추천 수(좌표) + 짧은 까닭, 판에도 그 자리가 반짝 (닫거나 수를 두면 지움)
  //    공용 창이 없으면 단추를 누를 때마다 판 반짝임 + 알림 (예전 방식)
  const COACH_MSG = { win: '여기 두면 바로 이겨요!', open4: '여기 두면 열린 사(4), 이길 수 있어요!', vcf: '여기부터 사(4)로 몰아붙이면 이겨요!', vct: '여기부터 몰아붙이면 이길 수 있어요!', block: '상대 사(4)를 꼭 막아야 해요!', lost: '여기를 막아 봐요… 버티는 자리예요', 'defend-vcf': '상대 공격을 미리 끊는 자리예요', 'defend-vct': '상대 공격을 미리 끊는 자리예요' };
  const coordOf = i => 'ABCDEFGHIJKLMNO'[i % 15] + (15 - Math.floor(i / 15));
  // 까닭: AI 가 알려 준 종류가 있으면 그것, 아니면 그 자리에 두었을 때 내 위협 · 상대가 두었을 때 위협으로
  function coachReason(s, mv, kind) {
    if (COACH_MSG[kind]) return COACH_MSG[kind];
    const b = Array.from(s.board), me = s.turn, op = 3 - me, N = s.size || 15;
    b[mv] = me; const mine = O.threatKind(b, N, mv, me, s.rule);
    b[mv] = op; const theirs = O.threatKind(b, N, mv, op, s.rule);
    if (mine === 'four') return '사(4)를 만들어 상대가 막게 해요';
    if (theirs === 'four' || theirs === 'open4') return '상대가 사(4)를 만들 자리를 미리 막아요';
    if (mine === 'three') return '열린 삼을 만들어 공격해요';
    if (theirs === 'three') return '상대가 열린 삼을 만들 자리를 막아요';
    if (kind === 'book') return '처음엔 가운데 가까이, 돌끼리 붙여 두는 게 좋아요';
    return '내 돌과 이어 모양을 넓히는 자리예요';
  }
  let coachP = null, coachSeq = 0, coachWired = false;
  const coachAllowed = () => !!(G && !G.review && (G.mode === 'ai' || G.mode === 'two' || (G.mode === 'online' && ON && ON.coach)));
  const coachOn = () => !!(coachP && coachP.visible && !coachP.collapsed);
  const coachStoredOn = () => { try { return (JSON.parse(localStorage.getItem('game.coach.omok') || '{}') || {}).v === 1; } catch (e) { return false; } };
  function coachInit() {
    if (coachWired) return coachP;
    coachWired = true;
    if (window.CoachPanel && CoachPanel.create) {
      try {
        coachP = CoachPanel.create({ game: 'omok', title: 'AI 선생님', startHidden: true });
        CoachPanel.button($('coachBtn'), coachP);
        coachP.onChange(() => { if (coachOn()) coachTick(true); else board.setHint(-1); });
      } catch (e) { coachP = null; }
    }
    if (!coachP) $('coachBtn').addEventListener('click', coachOnce);
    return coachP;
  }
  // 새 판마다: 단추 보이기 · 창은 혼자면 지난번에 켜 둔 경우만(별점에 들어가니까), 친구랑(방장이 켬)은 사용자가 끄지 않았으면 켬
  function coachSetup() {
    coachInit();
    const ok = coachAllowed();
    $('coachBtn').hidden = !ok;
    if (!coachP) return;
    const want = ok && (G.mode === 'online' ? !(CoachPanel.isOff && CoachPanel.isOff('omok')) : coachStoredOn());
    if (want !== coachP.visible) { if (want) coachP.show(); else coachP.hide(); }
    if (want) coachTick(true);
  }
  function coachOff() { if (coachP && coachP.visible) coachP.hide(); board.setHint(-1); }
  function coachTick(force) {
    if (!coachP || !coachOn()) return;
    if (!coachAllowed()) { coachP.set('지금은 쉬는 중이에요'); return; }
    const g = G, s = g.s, key = (g.round || 0) + ':' + s.moves.length + ':' + (s.over ? 'x' : '');
    if (!force && g.coachKey === key) return;
    g.coachKey = key;
    if (s.over) { board.setHint(-1); coachP.set('판이 끝났어요. <b>복기</b>로 어디서 갈렸는지 같이 봐요'); return; }
    const spectator = g.mode === 'online' && !g.me;
    const who = g.mode === 'online' ? OS.mover(g.seats, s.turn, s.moves.length) : null;
    if (!humanTurn() && !spectator) {
      board.setHint(-1);
      coachP.set(g.mode === 'ai' ? `${tier(g.cfg.tier).em} AI 차례예요. 내 차례가 오면 추천해 줄게요`
        : g.me && s.turn === g.me ? `${esc(nmOf(who))}님 차례예요. 같이 봐 줘요` : '상대 차례예요. 상대의 삼·사를 잘 봐 두세요');
      return;
    }
    if (drillScene()) {                                                 // 📒 다시 해 보는 그 장면: 답은 💡 를 눌러야
      board.setHint(-1);
      coachP.set('📒 아쉬웠던 그 장면이에요 — 이번엔 직접 찾아보세요 · <button class="btn" data-peek style="padding:4px 10px;font-size:13px">💡 답 보기</button>');
      const pb = coachP.body && coachP.body.querySelector('[data-peek]');
      if (pb) pb.onclick = () => { if (G && G.drill) { G.drill.peek = true; sfx('tap'); coachTick(true); } };
      return;
    }
    const head = g.mode === 'two' ? `${COLOR_NAME[s.turn]} 차례 · ` : spectator ? `👀 ${COLOR_NAME[s.turn]} ${esc(nmOf(who))}님 차례 · ` : '';
    const show = res => {
      if (!coachOn() || G !== g || g.coachKey !== key) return;
      board.setHint(res.move);
      coachP.set(`${head}<b>💡 ${coordOf(res.move)}</b> — ${esc(coachReason(s, res.move, res.kind))}<br><span style="opacity:.7;font-size:12px">판에 반짝이는 자리예요</span>`);
    };
    if (g.coachCache && g.coachCache.key === key) { show(g.coachCache.res); return; }
    coachP.set(`${head}🤔 좋은 자리를 찾는 중…`);
    const id = ++coachSeq;
    think(O.toJSON(s), { tier: 'hard', hint: true, timeMs: 700, seed: s.moves.length * 7919 + 13 }).then(res => {
      if (id !== coachSeq || G !== g || g.coachKey !== key || !res || res.move < 0) return;
      g.coachCache = { key, res };
      if (g.mode === 'ai' && humanTurn()) g.coachUsed = (g.coachUsed || 0) + 1;   // 별점: AI 선생님을 본 수
      show(res);
    }).catch(() => {});
  }
  // 공용 창이 없을 때: 누를 때마다 한 번 (판 반짝임 + 알림)
  async function coachOnce() {
    if (!coachAllowed() || !humanTurn() || G.thinking || G.coachBusy) return;
    const g = G, s0 = O.encode(g.s);
    g.coachBusy = true;
    let res = null;
    try { res = await think(O.toJSON(g.s), { tier: 'hard', hint: true, timeMs: 900, seed: g.s.moves.length * 7919 + 13 }); } catch (e) {}
    g.coachBusy = false;
    if (G !== g || O.encode(g.s) !== s0 || !res || res.move < 0) return;
    if (g.mode === 'ai') g.coachUsed = (g.coachUsed || 0) + 1;
    board.setHint(res.move); sfx('hint');
    Cozy.toast(`🧑‍🏫 ${coordOf(res.move)} — ${coachReason(g.s, res.move, res.kind)}`, 2600);
    if (set.touch === 'confirm' && matchMedia('(pointer: coarse)').matches) setPreview(res.move);
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
    '막히면 🧑‍🏫 <b>AI 선생님</b>을 켜 보세요 (추천 자리와 까닭), 실수했으면 ↶ 되돌리기 (AI 대전은 내 수와 AI 수를 함께 물러요)',
    'PC에선 클릭으로 바로 두고, 방향키로 옮겨 Enter 로 둘 수도 있어요',
    '👥 친구랑: 2명이 두고 더 들어온 친구는 실시간으로 구경해요 (🤝 상담을 켜면 4명이 2:2로 번갈아)',
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
    const who = r => r.mode === 'ai' ? `${tier(r.tier).em} ${tier(r.tier).name} AI · 내가 ${COLOR_NAME[r.me]}` : r.mode === 'online' ? `👥 친구랑 · 내가 ${COLOR_NAME[r.me] || '?'} · ${r.win ? COLOR_NAME[r.win] + ' 승' : '무승부'}` : r.mode === 'two' ? `👥 둘이서 · ${r.win ? COLOR_NAME[r.win] + ' 승' : '무승부'}` : `👀 ${tier(r.wb).em} vs ${tier(r.ww).em}`;
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
      me = OS.colorOf(cfg.seats, cfg.uid);                              // 0 = 구경
      players = { 1: { kind: me === 1 ? 'human' : 'remote' }, 2: { kind: me === 2 ? 'human' : 'remote' } };
    } else if (cfg.mode === 'two') players = { 1: { kind: 'human' }, 2: { kind: 'human' } };
    else players = { 1: { kind: 'ai', tier: cfg.wb }, 2: { kind: 'ai', tier: cfg.ww } };
    const key = JSON.stringify([cfg.mode, cfg.tier, cfg.wb, cfg.ww, rule]);
    if (session.key !== key) session = { key, a: 0, b: 0 };
    G = { cfg, s, mode: cfg.mode, rule, me, players, net: cfg.net || null, role: cfg.role || null, coachUsed: 0, undos: 0, secs: 0, over: false,
      thinking: false, paused: false, fast: false, review: null, said: {}, startAt: Date.now(),
      seats: cfg.seats || null, round: cfg.round || 0 };
    preview = hover = cursor = -1;
    board.clearFx();
    if (cfg.mode === 'online') for (const c of modals.slice().reverse()) c();   // 새 판이 오면 지난 판 결과 창은 닫음
    show('play');
    $('dockPlay').hidden = cfg.mode === 'watch'; $('dockWatch').hidden = cfg.mode !== 'watch'; $('dockReview').hidden = true;
    $('undoBtn').hidden = cfg.mode === 'online';
    $('restartBtn').hidden = cfg.mode === 'online';
    $('resignBtn').hidden = cfg.mode === 'online' && !me;
    drawWatchDock();
    syncAll(); drawViewers(); coachSetup();
    tickT = setInterval(tick, 1000);
    sfx('start');
    if (cfg.mode === 'online') {
      const mates = me ? cfg.seats[me].filter(u => u !== cfg.uid) : [];
      Cozy.toast(!me ? '👀 구경 중이에요. 다음 판에 빈자리가 나면 앉을 수 있어요' : mates.length ? `${me === 1 ? '⚫ 우리 팀이 흑' : '⚪ 우리 팀이 백'}이에요. ${nmOf(mates[0])}님과 번갈아 둬요` : me === 1 ? '⚫ 내가 흑이에요. 먼저 둬요!' : '⚪ 내가 백이에요. 친구가 먼저 둬요!', 2000);
    }
    else if (cfg.mode === 'ai' && (cfg.color === 'random' || me === 2)) Cozy.toast(me === 1 ? (cfg.color === 'random' ? '🎲 이번엔 흑이에요. 먼저 둬요!' : '내가 흑이에요. 먼저 둬요!') : `${cfg.color === 'random' ? '🎲 이번엔 백' : '내가 백'}이에요. ${tier(cfg.tier).em} AI가 먼저 둬요`, 1800);
    if (cfg.mode !== 'watch' && howto(false)) { /* 처음이면 안내를 먼저 */ }
    setTimeout(() => { if (G && G.s === s) advance(); }, cfg.mode === 'watch' ? 500 : 250);
  }
  function stopAll() {
    clearTimeout(aiTimer); clearInterval(tickT); reqId++; turnStop(); rvHide();
    if (G) G.thinking = false;
    hideBubble();
  }
  function goMenu() {
    if (ON) {                                                          // 친구 방에서 나감 (ArenaUI 도 정리되게)
      const n = ON.net; endOnline(); leaving = true;
      try { if (window.ArenaUI && ArenaUI.net === n) ArenaUI.leave(); else n.leave(); } catch (e) {}
      leaving = false;
    }
    stopAll(); coachOff();
    if ($('viewbar')) $('viewbar').hidden = true; G = null; board.clearFx(); show('menu'); drawMenu();
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
  // 친구랑은 자리표로: 지금 수 번호의 차례가 나일 때만 (상담이면 같은 색끼리 번갈아, 구경은 늘 아님)
  const humanTurn = () => !!(G && !G.over && !G.review && (G.mode === 'online' ? OS.canMove(G.seats, G.cfg.uid, G.s) : G.players[G.s.turn].kind === 'human'));

  function advance() {
    if (!G || G.review) return;
    syncAll();
    if (G.s.over) return;
    const ctl = G.players[G.s.turn];
    if (ctl.kind === 'ai' && !G.thinking && !(G.mode === 'watch' && (G.paused || document.hidden))) requestAI();
    coachTick();
    if (G.mode === 'online') { subTurn(); turnSync(); }
  }

  // 행동 하나 = 칸 번호 또는 기권. 사람·AI(나중엔 원격) 모두 이 길로
  function act(a, info) {
    if (!G || G.over || G.review) return false;
    const g = G, mover = g.s.turn, n0 = g.s.moves.length;
    const col = info && info.color || mover;
    const drill0 = !info && a !== O.RESIGN && g.drill && !g.drill.solved && g.mode === 'ai' && n0 === g.drill.k && mover === g.me ? O.clone(g.s) : null;
    const ev = a === O.RESIGN ? O.resign(g.s, col) : O.step(g.s, a);
    if (ev[0].type === 'illegal') {
      if (ev[0].reason === 'forbidden') { sfx('bad'); Cozy.vibrate(30); Cozy.toast(BAN_MSG[ev[0].ban] || '둘 수 없는 자리예요'); }
      return false;
    }
    if (drill0) drillCheck(drill0, a);
    if (g.mode === 'online' && ON) {                                  // 방장은 확인한 수를 모두에게, 손님은 내 수를 방장에게 (꼭 도착)
      const m = { t: 'move', a, color: col, n: n0, round: g.round };
      if (ON.host) ON.net.broadcast(m, true);
      else if (!(info && info.from === 'remote')) ON.net.send(m, true);
    }
    preview = hover = cursor = -1; showConfirm(false); board.setHint(-1); board.setGhost(null);   // 둔 자리에 미리 보기 · 커서가 남지 않게 (둘이서)
    let won = null;
    for (const e of ev) {
      if (e.type === 'place') {
        board.drop(e.idx, e.color);
        sfx('stone', { pitch: e.color === 1 ? 0.94 : 1.06 });
        if (!(info && info.from === 'remote') || (g.mode === 'online' && g.me && !(navigator.userActivation && !navigator.userActivation.hasBeenActive))) Cozy.vibrate(8);   // 친구 수는 두는 사람에게만 (구경꾼은 울리지 않음, 한 번도 안 누른 화면은 브라우저가 막음)
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
  // 🏆 랭킹: 판이 끝나면 내 기기 몫만 한 번 (구경 · 둘이서 · AI 구경 · 복기에서 이어 둔 판은 안 셈, 새로 고침으로 다시 받은 끝난 판도 한 번만)
  function rankReport(g) {
    try {
      if (!window.GRank || !g.me || (g.mode !== 'ai' && g.mode !== 'online') || g.branch) return;
      const w = g.s.winner, res = !w ? 'd' : w === g.me ? 'w' : 'l', r = { mode: 'ai', res, beat: res === 'w' ? 1 : 0 };
      if (g.mode === 'online' && g.net) {
        const key = g.net.code + ':' + g.round + ':' + O.encode(g.s);
        let seen = []; try { seen = JSON.parse(sessionStorage.getItem('omok.rk') || '[]'); } catch (e) {}
        if (seen.includes(key)) return;
        try { sessionStorage.setItem('omok.rk', JSON.stringify(seen.concat(key).slice(-12))); } catch (e) {}
        const ou = ((g.seats && g.seats[3 - g.me]) || []).filter(u => !(ON && ON.sub[u]));       // AI 가 대신 앉은 자리는 빼고
        if (ou.length) { r.mode = 'friend'; r.opp = ou.map(uid => ({ uid, res })); }
      }
      GRank.result('omok', r);
    } catch (e) {}
  }
  function finish(won) {
    const g = G; g.over = true; clearInterval(tickT); cancelAI(); rankReport(g);
    if (g.mode === 'online') { turnStop(); if (ON && ON.goneAsk) { try { ON.goneAsk(); } catch (e) {} } countScore(g); }   // 친구랑: 내 차례 시계 끄기 · '나갔어요' 창 닫기 · 이 방 전적 +1
    if (askClose) askClose();                                         // 기권·처음부터 묻는 창이 열려 있었으면 닫음 (결과 창과 겹치지 않게)
    board.setForbidden(null); board.setGhost(null);
    const s = g.s, w = s.winner;
    if (s.winLines && s.winLines.length) board.setWin(s.winLines);
    let res = 'd';
    if (g.mode === 'ai') res = !w ? 'd' : w === g.me ? 'w' : 'l';
    // 점수 (같은 상대와 이어서)
    if (w) { if (g.mode === 'ai') { if (w === g.me) session.a++; else session.b++; } else { if (w === 1) session.a++; else session.b++; } }
    // 소리 · 효과
    const humanWon = g.mode === 'ai' ? res === 'w' : g.mode === 'online' && g.me ? w === g.me : !!w;
    setTimeout(() => {
      if (G !== g) return;
      if (humanWon) { sfx('win'); if (g.mode !== 'online' || g.me) Cozy.confetti(); } else if (w) sfx('lose'); else sfx('count');
      if (g.mode === 'ai') say(res === 'w' ? 'lose' : res === 'l' ? 'win' : null, 1);
    }, s.winLines && s.winLines.length ? 380 : 120);
    // 기록 (AI 대전 · 둘이서만)
    if (g.mode !== 'watch' && !(g.mode === 'online' && !g.me)) {      // 구경한 판은 남기지 않음
      g.rec = { t: Date.now(), rec: O.encode(s), mode: g.mode, rule: g.rule, tier: g.cfg.tier, me: g.me, res, win: w, n: s.moves.length, secs: g.secs };
      addRecord(g.rec);
      if (g.mode === 'ai' && !g.branch) { const st = stats(); const r = st[g.cfg.tier] || { w: 0, l: 0, d: 0 }; r[res]++; st[g.cfg.tier] = r; save('stats', st); }   // 복기에서 이어 둔 연습 판은 전적에 안 넣음
    }                                                                  // AI 구경 판은 남기지 않음 (내 대국 기록이 밀려나지 않게, 복기는 끝나자마자 볼 수 있음)
    syncAll();
    setTimeout(() => { if (G === g && !g.review) showResult(); }, s.reason === 'resign' ? 500 : 1500);
    if (g.mode === 'ai' && res === 'l') setTimeout(() => autoScan(g), 1600);
  }
  // 📒 AI 에게 진 판: 내 수를 가볍게 훑어 상대에게 '반드시 이기는 길'을 처음 열어 준 수 하나를 노트에 (새 판·복기로 가면 그만둠)
  async function autoScan(g) {
    const RVm = window.OmokReview;
    if (!window.Mistakes || !RVm || !g.rec || !g.me) return;
    const mv = g.s.moves, from = g.branch || 0, live = () => G === g && !g.review;
    const s = O.create(15, g.s.rule); for (let i = 0; i < from; i++) O.play(s, mv[i]);
    try {
      for (let k = from; k < mv.length - 1; k++) {
        if (!live()) return;
        if (s.turn === g.me) {
          const s1 = O.clone(s); O.play(s1, mv[k]);
          if (s1.over) return;
          const after = await think(O.toJSON(s1), { tier: 'hard', hint: true, timeMs: 200, seed: (k + 1) * 7919 + 13 });
          if (!live()) return;
          if (after && RVm.WIN[after.kind]) {
            const rec = await think(O.toJSON(s), { tier: 'hard', hint: true, timeMs: 700, seed: k * 7919 + 13 });   // 복기 선생님과 같은 조건 (같은 추천)
            if (!live() || !rec || rec.move < 0) return;
            const j = RVm.judge({ a: mv[k], recMove: rec.move, recKind: rec.kind, afterKind: after.kind, fx: RVm.fx(s, mv[k]) });
            if (j) Mistakes.add({ game: 'omok', title: `오목 · ${tier(g.rec.tier) ? tier(g.rec.tier).name + ' AI' : '대국'} · 진 판`, scene: `${k + 1}수째 · ${COLOR_NAME[s.turn]} 차례`, my: coordOf(mv[k]), best: coordOf(rec.move),
              why: j.why, sev: j.sev, lossText: j.lossText, drill: { rec: g.rec, k, best: rec.move, miss: j.miss, allow: j.allow } });
            return;                                                    // 처음 갈린 수 하나만
          }
        }
        O.play(s, mv[k]);
      }
    } catch (e) {}
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
        const st = 1 + (g.undos ? 0 : 1) + (g.coachUsed ? 0 : 1);
        title = '🎉 이겼어요!';
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <p class="bigline">${T.em} ${T.name} AI를 이겼어요${why}</p>
          <p class="sub">${n}수 · ${fmtT(g.secs)}</p>
          <p class="why">${g.undos ? `되돌리기 ${g.undos}번` : '되돌리기 0 ✓'} · ${g.coachUsed ? `🧑‍🏫 AI 선생님 ${g.coachUsed}번` : 'AI 선생님 없이 ✓'}</p>${recTxt}`;
        [0, 1, 2].slice(0, st).forEach(j => setTimeout(() => sfx('star', { i: j }), 250 + j * 250));
      } else if (w) {
        title = '😿 아쉽게 졌어요';
        body = `<p class="bigline">${T.em} ${T.name} AI가 이겼어요${why}</p><p class="sub">${n}수 · ${fmtT(g.secs)}</p>
          <p class="why">${s.reason === 'resign' ? '다음 판은 끝까지 버텨 봐요!' : '상대의 열린 삼과 사를 먼저 막아 보세요. 복기로 어디서 갈렸는지 볼 수 있어요.'}</p>${recTxt}`;
      } else { title = '🤝 비겼어요'; body = `<p class="sub">${n}수 · 판이 가득 찼어요</p>${recTxt}`; }
    } else if (g.mode === 'online') {
      const wonMe = w === g.me, team = c => (g.seats[c] || []).map(nmOf).join(' · ') || COLOR_NAME[c];
      title = !w ? '🤝 비겼어요' : !g.me ? `${COLOR_NAME[w]} 승리!` : wonMe ? '🎉 이겼어요!' : '😿 아쉽게 졌어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div><p class="bigline">${esc(team(w))}</p>` : '') + `<p class="sub">${n}수 · ${fmtT(g.secs)}${why}</p>` +
        (g.me ? '' : `<p class="why">👀 구경 중 · ${ON && ON.host ? '' : '방장이 다음 판을 시작하면 이어서 봐요'}</p>`);
    } else if (g.mode === 'two') {
      title = w ? `${COLOR_NAME[w]} 승리!` : '🤝 비겼어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div>` : '') + `<p class="sub">${n}수 · ${fmtT(g.secs)}${why}</p><p class="why">점수 흑 ${session.a} : ${session.b} 백</p>`;
    } else {
      const nm = c => { const t = tier(g.players[c].tier); return `${t.em} ${t.name}`; };
      title = w ? `${nm(w)} 승리!` : '🤝 비겼어요';
      body = (w ? `<div class="winst"><i class="st ${w === 1 ? 'b' : 'w'}"></i></div>` : '') + `<p class="sub">${w ? COLOR_NAME[w] + ' · ' : ''}${n}수${why}</p><p class="why">점수 ${nm(1)} ${session.a} : ${session.b} ${nm(2)}</p>`;
    }
    const online = g.mode === 'online' && !!ON;
    if (online) body += '<div class="rdy" id="rdyBox"></div>';       // 친구랑: 준비 · 시작은 이 칸에서 (손님은 ✋ 준비, 방장이 시작)
    const btns = online
      ? [{ label: '복기', onClick: () => startReview() }].concat(ON.host && window.ArenaUI ? [{ label: '대기실', onClick: () => ArenaUI.toLobby() }] : [], [{ label: '메뉴', ghost: true, onClick: () => goMenu() }])   // 방장: 설정(상담 등)을 바꾸려면 대기실
      : [
        { label: g.mode === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => again() },
        { label: '복기', onClick: () => startReview() },
        { label: '메뉴', ghost: true, onClick: () => goMenu() },
      ];
    modal({ title, html: body, buttons: btns });
    if (online) { const box = document.getElementById('rdyBox'); if (box) { wireReady(box); drawReady(); } }
  }
  function again() {
    if (!G) return;
    const cfg = G.review && G.review.cfg ? G.review.cfg : G.cfg;
    if (!cfg) { goMenu(); return; }
    if (G.mode === 'online') {                                         // 다음 판은 결과 창의 준비 칸에서 (손님은 ✋ 준비, 방장이 시작) — 복기에서 돌아오면 그 창을 다시
      if (!ON) { goMenu(); return; }
      exitReview(); if (G && G.over) showResult();
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
    const rec0 = r;
    if (r.mode === 'online') r = Object.assign({}, r, { mode: 'two' });   // 친구랑 판은 둘이서처럼 복기
    const cfg = r.mode === 'ai' ? { mode: 'ai', rule: r.rule, tier: r.tier, color: r.me === 2 ? 'white' : 'black' } : r.mode === 'two' ? { mode: 'two', rule: r.rule } : { mode: 'watch', rule: r.rule, wb: r.wb, ww: r.ww };
    const players = r.mode === 'ai' ? { [r.me]: { kind: 'human' }, [3 - r.me]: { kind: 'ai', tier: r.tier } } : r.mode === 'two' ? { 1: { kind: 'human' }, 2: { kind: 'human' } } : { 1: { kind: 'ai', tier: r.wb }, 2: { kind: 'ai', tier: r.ww } };
    G = { cfg, s, mode: r.mode, rule: r.rule, me: r.me || 0, players, coachUsed: 0, undos: 0, secs: r.secs || 0, over: true, thinking: false, paused: false, said: {}, review: { k: s.moves.length, cfg, old: true }, rec: rec0 };
    board.clearFx(); show('play'); enterReview();
  }
  // 친구랑: 복기를 접고 판 화면으로 (아래 단추 줄 · AI 선생님 되살리기)
  function exitReview() {
    if (!G || !G.review) return;
    rvHide();
    G.review = null; $('dockReview').hidden = true; $('dockPlay').hidden = false;
    board.setForbidden(null); syncAll(); coachSetup();
  }
  function enterReview() {
    $('rvAgain').lastElementChild.textContent = G.mode === 'online' ? '다음 판' : '다시 하기';
    coachOff(); $('coachBtn').hidden = true;
    $('dockPlay').hidden = true; $('dockWatch').hidden = true; $('dockReview').hidden = false; showConfirm(false);
    board.setForbidden(null); board.setGhost(null); board.setHint(-1);
    sfx('flip'); syncAll(); rvCoach();
  }
  function reviewTo(k) {
    const R = G && G.review; if (!R) return;
    k = Math.max(0, Math.min(G.s.moves.length, k));
    if (k === R.k) return;
    const fwd = k === R.k + 1;
    R.k = k; board.setHint(-1); syncAll(); rvCoach();
    if (fwd) { const i = G.s.moves[k - 1]; board.drop(i, k % 2 ? 1 : 2); sfx('stone', { pitch: k % 2 ? 0.94 : 1.06 }); } else sfx('tap');
  }
  // ── 📒 아쉬운 장면 (?drill=<id>): 그때 둔 쪽으로 그 장면부터 AI 와 · 그 장면에서 추천(또는 그만큼 좋은 수)을 두면 ✅
  function drillScene() { return !!(G && G.drill && !G.drill.solved && !G.drill.peek && G.mode === 'ai' && G.s.moves.length === G.drill.k && G.s.turn === G.me); }
  function drillFromUrl() {
    if (!window.Mistakes) return false;
    let m = null; try { m = Mistakes.fromUrl('omok'); } catch (e) {}
    const d = m && m.drill, r = d && d.rec, dec = r && r.rec ? O.decode(r.rec) : null;
    if (!dec) return false;
    const k = d.k | 0; if (k < 0 || k >= dec.moves.length) return false;
    const s = O.create(15, dec.rule);
    for (let i = 0; i < k; i++) if (O.play(s, dec.moves[i])[0].type === 'illegal') return false;
    if (s.over) return false;
    const me = s.turn;
    newGame({ mode: 'ai', rule: s.rule, tier: TIERS.includes(r.tier) ? r.tier : pref.tier || 'normal', color: me === 2 ? 'white' : 'black' });
    G.s = s; G.branch = k; G.drill = { id: m.id, k, best: d.best, miss: !!d.miss, allow: !!d.allow, peek: false, solved: false };
    syncAll();
    if (coachP) { coachP.show(); if (coachP.collapsed) coachP.collapse(false); coachTick(true); }
    Cozy.toast('📒 아쉬웠던 장면부터 다시 — 이번엔 추천 수를 찾아보세요', 2800);
    setTimeout(() => { if (G && G.s === s) advance(); }, 300);
    return true;
  }
  // 이길 길을 놓쳤던 장면: 이번엔 오목·막을 수 없는 수(또는 사로 몰기) · 지는 길을 열었던 장면: 이번엔 상대에게 반드시 이기는 길이 없어야
  function drillCheck(s0, a) {
    const g = G, d = g.drill;
    d.peek = true;
    const done = good => {
      if (G !== g || d.solved) return;
      if (good) { d.solved = true; try { Mistakes.solved(d.id); } catch (e) {} Cozy.toast('✅ 이번엔 해냈어요! 📒 노트에 표시해 둘게요', 2600); }
      else Cozy.toast(`🤔 아쉬워요 · 추천은 ${coordOf(d.best)} 였어요. ↶ 되돌려 다시 해 봐요`, 3000);
    };
    const f = RV ? RV.fx(s0, a) : { atk: '' };
    if (a === d.best || f.atk === 'five') return done(true);
    if (!RV) return done(false);
    const s1 = O.clone(s0); O.play(s1, a);
    think(O.toJSON(s1), { tier: 'hard', hint: true, timeMs: 600, seed: 99 }).then(res => {
      const kd = res && res.kind;
      let good = !RV.WIN[kd];
      if (d.miss) good = good && (kd === 'lost' || f.atk === 'open4' || f.atk === '43' || f.atk === 'four');
      done(good);
    }).catch(() => {});
  }
  function drawMst() {
    const b = $('mstBtn'); if (!b) return;
    const n = window.Mistakes ? Mistakes.count('omok') : 0;
    b.hidden = !n; b.textContent = `📒 아쉬운 장면 ${n}`;
  }
  if ($('mstBtn')) $('mstBtn').onclick = () => { sfx('tap'); if (window.Mistakes) Mistakes.open({ game: 'omok' }); };

  // 🧑‍🏫 복기 선생님: 그 장면에서 둘 차례라면 어디? + 실제로 둔 곳 · 🎮 여기서부터 내가 두기 (상대는 AI, 전적엔 안 넣음)
  let rvP = null, rvOn = false, rvSeq = 0, rvT = 0;
  const RV = window.OmokReview;
  const stateAt = k => { const s = O.create(15, G.s.rule); for (let i = 0; i < k; i++) O.play(s, G.s.moves[i]); return s; };
  function rvHide() { rvSeq++; clearTimeout(rvT); if (rvP) rvP.hide(); board.setHint(-1); board.setMarks(null); }
  // 장면 k 의 추천 (같은 장면은 다시 안 셈 — 실제 수 뒤 장면(k+1)의 추천은 '상대가 이기는 길이 생겼나' 판단에도 씀)
  const rvHintOpts = k => ({ tier: 'hard', hint: true, timeMs: 700, seed: k * 7919 + 13 });
  function rvCoach() {
    $('rvCoach').setAttribute('aria-pressed', String(rvOn));
    clearTimeout(rvT);
    if (!rvOn || !rvP || !G || !G.review) { board.setMarks(null); return; }
    const R = G.review, k = R.k, s = stateAt(k), id = ++rvSeq;
    R.hint = R.hint || {}; R.nul = R.nul || {}; R.noted = R.noted || {};
    if (!rvP.visible) rvP.show();
    board.setMarks(null);
    if (s.over || k >= G.s.moves.length && G.s.over) { board.setHint(-1); rvP.set('판이 끝난 장면이에요. ◀ 로 앞으로 가 보세요'); return; }
    if (R.hint[k]) { rvDraw(k, s); rvMore(k, s, id); return; }
    board.setHint(-1);
    rvP.set(`${COLOR_NAME[s.turn]} 차례 · 🤔 좋은 자리를 찾는 중…`);
    rvT = setTimeout(() => {                                            // 빠르게 넘길 때는 멈춘 장면만 (워커에 일이 쌓이지 않게)
      if (id !== rvSeq) return;
      think(O.toJSON(s), rvHintOpts(k)).then(res => {
        if (!G || G.review !== R || !res || res.move < 0) return;
        R.hint[k] = res;
        if (id !== rvSeq || !rvOn) return;
        rvDraw(k, s); rvMore(k, s, id);
      }).catch(() => {});
    }, 250);
  }
  // 🤔 노린 것: 실제 수 뒤 같은 쪽이 한 번 더 둔다면 AI 가 둘 곳 → 그다음 실제 수 뒤 상대 차례 추천(손해 판단). 하나씩 차례로, 장면을 옮기면 그만둠
  function rvMore(k, s, id) {
    const R = G.review, real = G.s.moves[k];
    if (real == null) return;
    const live = () => id === rvSeq && rvOn && G && G.review === R && R.k === k;
    const s1 = O.clone(s); O.play(s1, real);
    const step2 = () => {
      if (!live()) return;
      if (s1.over || R.hint[k + 1]) { rvDraw(k, s); return; }
      think(O.toJSON(s1), rvHintOpts(k + 1)).then(res => {
        if (!G || G.review !== R || !res || res.move < 0) return;
        R.hint[k + 1] = res;
        if (live()) rvDraw(k, s);
      }).catch(() => {});
    };
    if (R.nul[k] || s1.over) { if (s1.over) R.nul[k] = { move: -1 }; rvDraw(k, s); step2(); return; }
    const sn = O.clone(s1); sn.turn = s.turn;                           // 상대가 손 뺐다고 보고 같은 쪽 차례
    think(O.toJSON(sn), { tier: 'hard', hint: true, timeMs: 500, seed: k * 104729 + 7 }).then(res => {
      if (!G || G.review !== R) return;
      R.nul[k] = res && res.move >= 0 ? { move: res.move, kind: res.kind } : { move: -1 };
      if (live()) { rvDraw(k, s); step2(); }
    }).catch(() => {});
  }
  function rvDraw(k, s) {
    const R = G.review, res = R.hint[k], real = G.s.moves[k];
    if (!res || !rvP) return;
    board.setHint(res.move);
    let html = `${COLOR_NAME[s.turn]} 차례라면 <b>💡 ${coordOf(res.move)}</b> — ${esc(coachReason(s, res.move, res.kind))}`;
    if (real != null) {
      html += `<br>🎞️ 실제 <b>${coordOf(real)}</b>${real === res.move ? ' 👑 추천과 같아요' : '(흐린 돌)'}`;   // 창이 판을 더 가리지 않게 한 문단으로
      const nul = R.nul[k];
      let aim = '살펴보는 중…', t = -1;
      if (nul && RV) {
        t = nul.move;
        const w = RV.aimWhy(s, real, t, nul.kind, () => '@T@');
        aim = [w.done, w.next].filter(Boolean).map(x => esc(x).replace('@T@', `<b>${t >= 0 ? coordOf(t) : ''}</b>`)).join(' · ') || '뚜렷한 노림은 안 보여요';
        const after = R.hint[k + 1], j = after ? RV.judge({ a: real, recMove: res.move, recKind: res.kind, afterKind: after.kind, fx: RV.fx(s, real) }) : null;
        if (j) { aim += ' · 추천보다 많이 손해라 노림수보다는 실수였을 수 있어요'; rvNote(k, s, real, res, j); }
      }
      html += ` · 🤔 노린 것${t >= 0 ? '(<b style="color:#d9466f">!</b>)' : ''}: ${aim}`;
      board.setMarks({ real, color: s.turn, num: k + 1, aim: t });
    }
    rvP.set(html);
  }
  // 📒 아쉬운 장면 노트: 내 수(내 색)일 때만 · 같은 판·같은 장면은 하나로 (common/mistakes.js)
  function rvNote(k, s, real, res, j) {
    const R = G.review, rec = G.rec;
    if (!window.Mistakes || !rec || !rec.rec || !G.me || s.turn !== G.me || R.noted[k]) return;
    R.noted[k] = 1;
    const resTxt = rec.res === 'w' ? '이긴 판' : rec.res === 'l' ? '진 판' : '비긴 판';
    const who = rec.mode === 'ai' && tier(rec.tier) ? `${tier(rec.tier).name} AI` : rec.mode === 'online' ? '친구랑' : '대국';
    try {
      Mistakes.add({ game: 'omok', title: `오목 · ${who} · ${resTxt}`, scene: `${k + 1}수째 · ${COLOR_NAME[s.turn]} 차례`, my: coordOf(real), best: coordOf(res.move),
        why: j.why, sev: j.sev, lossText: j.lossText, drill: { rec, k, best: res.move, miss: j.miss, allow: j.allow } });
    } catch (e) {}
  }
  $('rvCoach').onclick = () => {
    if (!G || !G.review) return;
    sfx('tap'); rvOn = !rvOn;
    if (rvOn && !rvP && window.CoachPanel) { try { rvP = CoachPanel.create({ game: 'omok-rp', title: 'AI 선생님 · 복기', startHidden: true }); rvP.onChange(() => { if (!rvP.visible && rvOn) { rvOn = false; rvHide(); rvCoach(); } }); } catch (e) { rvP = null; } }
    if (rvOn) { if (rvP && rvP.collapsed) rvP.collapse(false); rvCoach(); } else { rvHide(); rvCoach(); }
  };
  $('rvGo').onclick = () => {
    if (!G || !G.review) return;
    const k = G.review.k, s = stateAt(k);
    if (s.over) { Cozy.toast('끝난 장면이에요. ◀ 로 앞으로 가서 눌러 주세요'); return; }
    sfx('tap');
    const go = me => {
      const ai = G.players[3 - me], tierId = (ai && ai.tier) || G.cfg.tier || pref.tier || 'normal';
      rvHide();
      newGame({ mode: 'ai', rule: s.rule, tier: tierId, color: me === 2 ? 'white' : 'black' });
      G.s = s; G.branch = k; syncAll();
      if (coachP) { coachP.show(); if (coachP.collapsed) coachP.collapse(false); coachTick(true); }
      Cozy.toast(`🎮 ${k}수째부터 ${COLOR_NAME[me]}으로 내가 둬요 — 🧑‍🏫 선생님을 켜고 끄며 해 보세요`, 2600);
      setTimeout(() => { if (G && G.s === s) advance(); }, 300);
    };
    if (G.mode === 'ai' && G.me) return go(G.me);
    Cozy.modal({ title: '🎮 어느 쪽을 둘까요?', html: '<p class="small" style="margin:0">고른 쪽은 내가, 다른 쪽은 AI 가 이어서 둬요.</p>', dismiss: true,
      buttons: [{ label: '⚫ 흑', primary: s.turn === 1, onClick: () => go(1) }, { label: '⚪ 백', primary: s.turn === 2, onClick: () => go(2) }] });
  };
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
      else if (G.mode === 'online') { const l = (G.seats && G.seats[c]) || []; emo = G.me === c ? '🙂' : l.length > 1 ? '👥' : '👤'; const nx = OS.mover(G.seats, c, s.turn === c ? s.moves.length : s.moves.length + 1); nm = l.length > 1 ? nmOf(nx) : l.map(nmOf).join(' · ') || COLOR_NAME[c]; }   // 상담: 그 색에서 다음에 둘 사람 (팀 전체는 구경 줄에)
      else if (G.mode === 'two') { emo = ''; nm = COLOR_NAME[c]; }
      else { emo = tier(p.tier).em; nm = tier(p.tier).name; }
      const turn = !s.over && !G.review && s.turn === c;
      if (G.review) sayTxt = '';
      else if (s.over) sayTxt = s.winner === c ? '승리!' : s.winner ? '' : '무승부';
      else if (turn && G.paused) sayTxt = '멈춤';
      else if (turn && G.mode === 'online') { const mv = OS.mover(G.seats, c, s.moves.length); sayTxt = mv === G.cfg.uid ? '내 차례' : G.me && G.me !== c ? '상대 차례' : '차례'; }
      else if (turn) sayTxt = p.kind === 'ai' ? (G.thinking ? '생각 중' : '') : p.kind === 'remote' ? '상대 차례' : G.mode === 'ai' ? '내 차례' : '차례';
      el.querySelector('.emo').textContent = emo;
      el.querySelector('.av').classList.toggle('stoneav', G.mode === 'two');
      el.querySelector('.nm').textContent = nm;
      const sy = el.querySelector('.say'); sy.textContent = sayTxt; sy.classList.toggle('thinking', turn && p.kind === 'ai' && G.thinking && !G.paused);
      const sc = G.mode === 'ai' ? (p.kind === 'human' ? session.a : session.b) : c === 1 ? session.a : session.b;
      el.querySelector('.n').textContent = G.mode !== 'online' && (session.a || session.b) ? String(sc) : '';   // 친구랑은 판마다 색이 바뀌어 색별 점수는 안 보임
      el.classList.toggle('turn', turn);
    }
    $('lbl').textContent = G.review ? '📜 복기' : G.mode === 'ai' ? `${tier(G.cfg.tier).em} ${tier(G.cfg.tier).name} AI와 대국` : G.mode === 'online' ? `👥 친구랑 (${G.net ? G.net.code : ''})` : G.mode === 'two' ? '👥 한 기기 둘이서' : '👀 AI 구경';
    $('rulePill').textContent = O.RULES[G.rule].name;
    drawRoomBar();
  }
  // 위쪽 한 줄: 친구랑은 누구 차례인지 (내 차례는 금색으로 반짝 + 남은 시간), 나머지는 수 · 시간
  function drawStat() {
    if (!G) return;
    const n = G.s.moves.length, st = $('stat');
    let mine = false;
    if (G.mode === 'online' && ON && !G.review) {
      const s = G.s;
      if (s.over) st.textContent = `${n}수 · ${fmtT(G.secs)}`;
      else {
        const mv = OS.mover(G.seats, s.turn, n); mine = humanTurn();
        st.textContent = (mine ? '내 차례' + (TT.left != null ? ` · ⏱${TT.left}` : '') : G.me && mv ? `${nmOf(mv)}님 차례${ON.sub[mv] ? ' 🤖' : ''}` : `${COLOR_NAME[s.turn]} ${mv ? nmOf(mv) + '님 ' : ''}차례`) + ` · ${n}수`;
      }
    } else st.textContent = G.review ? `${G.review.k} / ${n}수` : `${n}수 · ${fmtT(G.secs)}`;
    st.classList.toggle('myturn', mine); $('stage').classList.toggle('myturn', mine);
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
      else if (G && !G.over && G.mode === 'online' && performance.now() - waitToastAt > 2500) { waitToastAt = performance.now(); Cozy.toast(!G.me ? '👀 구경 중이라 둘 수 없어요' : OS.mover(G.seats, G.s.turn, G.s.moves.length) ? `${nmOf(OS.mover(G.seats, G.s.turn, G.s.moves.length))}님 차례예요` : '차례를 기다려요', 1400); }
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
    if ((k === 'h' || k === 'H') && !$('coachBtn').hidden && !$('dockPlay').hidden) { $('coachBtn').click(); return; }   // H = AI 선생님 켜기·끄기
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
  $('resignBtn').onclick = () => {
    if (!G || G.over || G.review || (G.mode === 'online' && !G.me)) return;
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
  const needGuard = () => !!(G && !G.over && !G.review && G.mode !== 'watch' && !(G.mode === 'online' && !G.me) && G.s.moves.length > 0);
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
    play: i => tryPlace(i), act, newGame, goMenu, reviewTo, undo, get coach() { return coachP; },
    state: () => G && O.toJSON(G.s),
    get ON() { return ON; }, hostAgain, seats: OS,
  };

  // ── 시작 ──
  drawMenu();
  if (window.Mistakes && Mistakes.onChange) Mistakes.onChange(drawMst);
  if (!drillFromUrl() && window.ArenaUI) ArenaUI.checkUrl(friendOpts());
  OmokBoard.prewarm();
  getWorker();                                                         // 워커를 미리 깨워 둠 (첫 수가 빠르게)
  if (worker) think(O.toJSON(O.create(15, pref.rule)), { tier: 'easy' }).catch(() => {});
})();

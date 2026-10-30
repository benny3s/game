/* 냥냥 배구 — 화면·조작·게임 흐름
   메뉴(혼자: AI 🐣🐱🐯 · 둘이서 한 화면 / AI 구경) → 게임 화면 한 장(점수판 · 판 · 엄지 단추) → 결과
   - 코어는 60Hz 고정 틱으로 돌리고, 그림은 화면 새로 고침마다 두 틱 사이를 이어 그림(보간)
   - 각 편을 누가 움직이는지는 ctl 하나로 끼움: ctl.input(state) → 입력 비트 (사람 키보드·터치 / AI / 나중엔 친구 연결) */
(() => {
  const $ = id => document.getElementById(id);
  const V = window.Volley, B = window.VolleyBots, ART = window.VolleyArt, SND = window.VolleySound;
  const { IN } = V;
  const DT = 1 / 60;
  const TIER_IDS = ['easy', 'normal', 'hard'];
  const TIER_TXT = { easy: '느긋하게 받아 줘요', normal: '스매시도 제법 해요', hard: '빈자리를 노려요' };
  const AI_FUR = { easy: ['mackerel', 'calico', 'cheese', 'black'], normal: ['calico', 'cheese', 'mackerel', 'black'], hard: ['black', 'mackerel', 'calico', 'cheese'] };
  const FUR_TXT = { cheese: '#ec8a45', mackerel: '#6d97c4', black: '#8a6cc0', calico: '#45a58c' };
  const FURS = ART.FURS, FUR_IDS = ART.FUR_IDS;
  const tierName = t => Cozy.TIERS[t].em + ' ' + Cozy.TIERS[t].name;

  // ── 설정·기록 (폰에 저장)
  const cfg = Object.assign({ tab: 'solo', mode: 'easy', fur: 'cheese', fur2: 'mackerel', target: 11, wl: 'normal', wr: 'hard', wtarget: 11, team: 1, wteam: 1, lteam: 1, lseat: ['h', 'h', 'normal', 'normal'], ltarget: 11 }, Cozy.store('volley.cfg', {}));
  for (const k of ['team', 'wteam', 'lteam']) if (cfg[k] !== 2) cfg[k] = 1;
  if (!FURS[cfg.fur]) cfg.fur = 'cheese';
  if (!FURS[cfg.fur2] || cfg.fur2 === cfg.fur) cfg.fur2 = FUR_IDS.find(f => f !== cfg.fur);
  if (cfg.mode === 'duo') { cfg.mode = 'easy'; cfg.tab = 'local'; }   // 예전 '둘이서' → 한 기기 탭
  if (!TIER_IDS.includes(cfg.mode)) cfg.mode = 'easy';
  if (!['solo', 'local', 'watch'].includes(cfg.tab)) cfg.tab = 'solo';
  // 한 기기 자리 (고양이 번호 순서 0~3): 'h' = 사람, 아니면 AI 단계
  if (!Array.isArray(cfg.lseat) || cfg.lseat.length !== 4) cfg.lseat = ['h', 'h', 'normal', 'normal'];
  cfg.lseat = cfg.lseat.map(v => v === 'h' || TIER_IDS.includes(v) ? v : 'normal');
  if (![7, 11, 15].includes(cfg.ltarget)) cfg.ltarget = 11;
  for (const k of ['target', 'wtarget']) if (![7, 11, 15].includes(cfg[k])) cfg[k] = 11;
  for (const k of ['wl', 'wr']) if (!TIER_IDS.includes(cfg[k])) cfg[k] = 'normal';
  const saveCfg = () => Cozy.save('volley.cfg', cfg);
  const rec = Cozy.store('volley.rec', {});            // { easy: { w, l, best: [11, 3] } }

  // 터치 화면인가 (터치가 한 번이라도 오면 터치 단추를 보여 줌)
  let touchUI = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches);
  addEventListener('touchstart', () => { if (!touchUI) { touchUI = true; drawMenu(); applyMode(); } }, { passive: true, capture: true });

  const R = ART.create($('cv'));

  // ════════ 메뉴 ════════
  function recLine(t) { const r = rec[t]; return r && (r.w || r.l) ? `🏆 ${r.w}승 ${r.l}패` : ''; }
  function drawMenu() {
    for (const [id, box, t] of [['tabSolo', 'soloBox', 'solo'], ['tabLocal', 'localBox', 'local'], ['tabWatch', 'watchBox', 'watch']]) { $(id).setAttribute('aria-pressed', String(cfg.tab === t)); $(box).hidden = cfg.tab !== t; }
    const items = TIER_IDS.map(id => ({ id, em: Cozy.TIERS[id].em, name: Cozy.TIERS[id].name, cls: Cozy.TIERS[id].cls, desc: TIER_TXT[id], rec: recLine(id) }));
    items.push({ id: 'local', em: '👫', name: '한 기기에서', cls: 't-master', desc: '둘~넷이 한 화면에서 같이', rec: '' });   // 누르면 '한 기기' 탭으로
    $('tiers').innerHTML = items.map(x => `<button class="tier ${x.cls}" data-id="${x.id}" aria-pressed="${cfg.mode === x.id}"><span class="em">${x.em}</span><b>${x.name}</b><span>${x.desc}</span>${x.rec ? `<span>${x.rec}</span>` : ''}</button>`).join('');
    furs($('fur1'), cfg.fur, id => { cfg.fur = id; if (cfg.fur2 === id) cfg.fur2 = FUR_IDS.find(f => f !== id); saveCfg(); drawMenu(); });
    seg($('team'), [[1, '1:1'], [2, '2:2 복식']], cfg.team, v => { cfg.team = v; saveCfg(); drawMenu(); });
    $('teamTip').textContent = cfg.team === 2 ? 'AI 짝꿍과 한 편이 되어 AI 둘과 겨뤄요' : '';
    seg($('wteam'), [[1, '1:1'], [2, '2:2 복식']], cfg.wteam, v => { cfg.wteam = v; saveCfg(); drawMenu(); });
    seg($('target'), [7, 11, 15].map(n => [n, n + '점']), cfg.target, v => { cfg.target = v; saveCfg(); drawMenu(); });
    seg($('wl'), TIER_IDS.map(t => [t, tierName(t)]), cfg.wl, v => { cfg.wl = v; saveCfg(); drawMenu(); });
    seg($('wr'), TIER_IDS.map(t => [t, tierName(t)]), cfg.wr, v => { cfg.wr = v; saveCfg(); drawMenu(); });
    seg($('wtarget'), [7, 11, 15].map(n => [n, n + '점']), cfg.wtarget, v => { cfg.wtarget = v; saveCfg(); drawMenu(); });
    $('keys').innerHTML = keysHtml(false);
    $('startBtn').textContent = `▶ ${Cozy.TIERS[cfg.mode].name} 고양이와 시작!`;
    drawLocal();
  }
  $('tiers').addEventListener('click', e => {
    const b = e.target.closest('.tier'); if (!b) return; Cozy.sfx.play('tap');
    if (b.dataset.id === 'local') cfg.tab = 'local'; else cfg.mode = b.dataset.id;
    saveCfg(); drawMenu();
  });

  // ── 한 기기에서 여럿: 자리마다 사람/AI. PC 는 사람 4명까지(자리마다 키 묶음), 폰은 터치 단추가 둘이라 사람 2명까지
  const KS = window.VolleyKeys;
  const SEAT_NAME = ['왼쪽 ①', '오른쪽 ①', '왼쪽 ②', '오른쪽 ②'];
  const maxHumans = () => touchUI ? 2 : 4;
  const localCats = () => cfg.lteam === 2 ? [0, 2, 1, 3] : [0, 1];        // 보여 주는 순서: 왼쪽 편 먼저
  const localHumans = () => localCats().filter(k => cfg.lseat[k] === 'h').sort((a, b) => a - b);
  function localFurs() { const f0 = cfg.fur, f1 = cfg.fur2, rest = FUR_IDS.filter(f => f !== f0 && f !== f1); return [f0, f1, rest[0], rest[1]]; }
  function seatKeysHtml(k) {
    const kb = s => `<kbd>${s}</kbd>`;
    if (touchUI) { const hs = localHumans(), i = hs.indexOf(k); return i < 0 ? '' : i === 0 ? '👈 화면 아래 왼쪽 단추' : '👉 화면 아래 오른쪽 단추'; }
    const st = KS.SETS[k]; return `${kb(st.show[0])}${kb(st.show[1])} 이동 ${kb(st.show[2])} 점프 ${kb(st.show[3])} 스매시`;
  }
  function drawLocal() {
    const box = $('lseats'); if (!box) return;
    // 폰에서 사람이 너무 많으면 뒤 자리부터 AI 로
    let hs = localHumans();
    while (hs.length > maxHumans()) { cfg.lseat[hs.pop()] = 'normal'; }
    if (!hs.length) cfg.lseat[0] = 'h';
    seg($('lteam'), [[1, '1:1'], [2, '2:2 복식']], cfg.lteam, v => { cfg.lteam = v; saveCfg(); drawMenu(); });
    seg($('ltarget'), [7, 11, 15].map(n => [n, n + '점']), cfg.ltarget, v => { cfg.ltarget = v; saveCfg(); drawMenu(); });
    const fu = localFurs(), full = localHumans().length >= maxHumans();
    box.innerHTML = localCats().map(k => {
      const v = cfg.lseat[k], human = v === 'h';
      const tiers = TIER_IDS.map(t => `<button class="btn" data-k="${k}" data-v="${t}" aria-pressed="${v === t}" title="${Cozy.TIERS[t].name}">${Cozy.TIERS[t].em}</button>`).join('');
      return `<div class="lseat ${k & 1 ? 'r' : 'l'}" data-k="${k}">
        <span class="lface" data-k="${k}" data-fur="1"></span>
        <div class="lmid"><b title="${FURS[fu[k]].name}">${SEAT_NAME[k]}</b><span class="small">${human ? seatKeysHtml(k) : 'AI 가 해요'}</span></div>
        <div class="seg lkind"><button class="btn" data-k="${k}" data-v="h" aria-pressed="${human}" ${!human && full ? 'disabled' : ''}>🙂 사람</button><button class="btn" data-k="${k}" data-v="ai" aria-pressed="${!human}">🤖 AI</button></div>
        ${human ? '' : `<div class="seg ltier">${tiers}</div>`}
      </div>`;
    }).join('');
    for (const el of box.querySelectorAll('.lface')) el.appendChild(ART.portrait(fu[+el.dataset.k], 40));
    const n = localHumans().length;
    $('ltip').textContent = touchUI ? `폰에서는 사람 2명까지 (아래 단추를 왼쪽·오른쪽으로 나눠 써요)${cfg.lteam === 2 ? ' · 남는 자리는 AI' : ''}`
      : '키보드 하나로 4명까지 · 자리마다 키가 달라요 (왼쪽 편은 왼손 쪽, 오른쪽 편은 오른손 쪽 키 · 키보드에 따라 한꺼번에 너무 많이 누르면 몇 개가 안 먹을 수 있어요)';
    $('localBtn').textContent = n >= 2 ? `▶ ${n}명이서 시작!` : '▶ 시작!';
  }
  $('lseats').addEventListener('click', e => {
    const b = e.target.closest('button'), face = e.target.closest('.lface');
    if (face) {                                                     // 얼굴을 누르면 고양이 바꾸기 (왼쪽 ①·오른쪽 ① 털색)
      Cozy.sfx.play('tap'); const k = +face.dataset.k;
      if (k === 0 || k === 1) {
        const key = k === 0 ? 'fur' : 'fur2', other = k === 0 ? cfg.fur2 : cfg.fur;
        let i = FUR_IDS.indexOf(cfg[key]); do { i = (i + 1) % FUR_IDS.length; } while (FUR_IDS[i] === other);
        cfg[key] = FUR_IDS[i]; saveCfg(); drawMenu();
      }
      return;
    }
    if (!b || b.disabled) return;
    Cozy.sfx.play('tap');
    const k = +b.dataset.k, v = b.dataset.v;
    if (v === 'h') cfg.lseat[k] = 'h';
    else if (v === 'ai') { if (cfg.lseat[k] === 'h') { if (localHumans().length <= 1) { Cozy.toast('사람이 한 명은 있어야 해요'); return; } cfg.lseat[k] = 'normal'; } }
    else cfg.lseat[k] = v;
    saveCfg(); drawMenu();
  });
  $('localBtn').onclick = () => {
    const team = cfg.lteam, N = team * 2, fu = localFurs();
    start({ kind: 'duo', team, seats: cfg.lseat.slice(0, N), furs: fu.slice(0, N), target: cfg.ltarget });
  };
  function keysHtml(duo) {
    const k = s => `<kbd>${s}</kbd>`;
    if (duo && G && G.o.seats) {                                    // 한 기기: 사람 자리마다 키 한 줄
      const hs = G.o.seats.map((v, c) => v === 'h' ? c : -1).filter(c => c >= 0);
      if (touchUI) return hs.length > 1 ? `아래 단추를 반씩 나눠 써요 · 왼쪽 = ${SEAT_NAME[hs[0]]}, 오른쪽 = ${SEAT_NAME[hs[1]]}` : '왼쪽 ◀ ▶ 로 움직이고, 오른쪽 점프 · 스매시를 눌러요';
      return [0, 2, 1, 3].filter(c => hs.includes(c)).map(c => `${SEAT_NAME[c]} ${seatKeysHtml(c)}`).join('<br>');
    }
    if (touchUI) return '왼쪽 ◀ ▶ 로 움직이고, 오른쪽 점프 · 스매시를 눌러요';
    return `${k('←')}${k('→')} 또는 ${k('A')}${k('D')} 이동 · ${k('↑')}/${k('W')} 점프 · ${k('Space')} 스매시`;
  }
  function furs(el, cur, onPick) {
    if (!el.children.length) {
      for (const id of FUR_IDS) {
        const b = document.createElement('button'); b.className = 'fur'; b.dataset.id = id; b.type = 'button';
        b.appendChild(ART.portrait(id, 54)); const n = document.createElement('span'); n.textContent = FURS[id].name; b.appendChild(n);
        el.appendChild(b);
      }
    }
    el.onclick = e => { const b = e.target.closest('.fur'); if (!b) return; Cozy.sfx.play('tap'); onPick(b.dataset.id); };
    for (const b of el.children) b.setAttribute('aria-pressed', String(b.dataset.id === cur));
  }
  function seg(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, t]) => `<button class="btn" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('.btn'); if (!b) return; Cozy.sfx.play('tap'); const v = b.dataset.v; onPick(/^\d+$/.test(v) ? +v : v); };
  }
  $('tabSolo').onclick = () => { cfg.tab = 'solo'; saveCfg(); Cozy.sfx.play('tap'); drawMenu(); };
  if ($('tabFriend')) $('tabFriend').onclick = () => { Cozy.sfx.play('tap'); openFriendModal(); };
  $('tabLocal').onclick = () => { cfg.tab = 'local'; saveCfg(); Cozy.sfx.play('tap'); drawMenu(); };
  $('tabWatch').onclick = () => { cfg.tab = 'watch'; saveCfg(); Cozy.sfx.play('tap'); drawMenu(); };

  // ── 친구랑: 방 인원은 미리 안 정함 (최대 4명) — 시작할 때 들어온 사람 수로 1:1 / 2:2 를 정함
  //   2명 = 1:1 (방장이 켜면 2:2, 빈자리는 AI) · 3명 = 2:2 (한 자리 AI) · 4명 = 2:2 복식
  //   자리: 들어온 순서대로 방장 → 왼쪽, 둘째 → 오른쪽, 셋째 → 왼쪽 짝, 넷째 → 오른쪽 짝 (고양이 0·1·2·3)
  const describe = (n, c) => n <= 1 ? '친구를 기다려요 (2~4명)' : n === 2 ? (c && c.fill ? '2명 + AI 짝꿍 둘 → 2:2' : '2명이면 1:1') : n === 3 ? '3명이면 2:2 (빈자리는 AI)' : '4명이면 2:2 복식';
  const escH = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function friendSettings(el, c, canEdit, update) {
    const tgt = c.target || 11, ai = TIER_IDS.includes(c.ai) ? c.ai : 'normal';
    const b = (on, v, t, k) => `<button type="button" class="arn-btn" data-${k}="${v}" ${canEdit ? '' : 'disabled'} style="flex:1;padding:9px 6px;font-size:14px;${on ? 'background:var(--accent,#10b981);color:#fff' : ''}">${t}</button>`;
    el.innerHTML = `<div class="arn-row">${[7, 11, 15].map(v => b(v === tgt, v, v + '점', 'tg')).join('')}</div>
      <label class="arn-row" style="justify-content:space-between;font-size:14px;gap:10px"><span>🐾 2명이어도 2:2 (빈자리는 AI 짝꿍)</span><input type="checkbox" data-fill ${c.fill ? 'checked' : ''} ${canEdit ? '' : 'disabled'} style="width:22px;height:22px"></label>
      <div class="arn-row"><span class="arn-soft" style="flex:none">AI 짝꿍</span>${TIER_IDS.map(t => b(t === ai, t, Cozy.TIERS[t].em + ' ' + Cozy.TIERS[t].name.split(' · ')[0], 'ai')).join('')}</div>`;
    if (!canEdit) return;
    el.onclick = e => { const x = e.target.closest('button'); if (!x) return; if (x.dataset.tg) update({ target: +x.dataset.tg }); else if (x.dataset.ai) update({ ai: x.dataset.ai }); };
    el.onchange = e => { if (e.target.matches('[data-fill]')) update({ fill: e.target.checked }); };
  }
  let boundNet = null, hostGo = null;
  function openFriendModal() {
    if (!window.ArenaUI) { Cozy.toast('친구 대전 모듈을 불러오지 못했어요'); return; }
    ArenaUI.open({
      game: 'volley',
      title: '🏐 냥냥 배구',
      max: 4, min: 2,
      describe,
      settings: {
        defaults: { target: cfg.target, fill: false, ai: 'normal', hostFur: cfg.fur },
        label: c => `🏖 ${(c && c.target) || 11}점${c && c.fill ? ' · 2:2' : ''}`,
        render: friendSettings,
      },
      onStart: ctx => startOnline(ctx),
      onLobby: () => stopGame(true),
      onLeave: () => { if (G && G.o.kind === 'online') goMenu(); },
    });
  }

  // 방장: 자리·씨앗을 정해 모두에게 'go' (늦게 온 친구는 'hi' 를 보내면 같은 go 를 받아 구경)
  function makeGo(net) {
    const c = (net.meta && net.meta.cfg) || {}, pl = net.players || {}, host = (net.meta && net.meta.host) || net.uid;
    const ids = Object.keys(pl).sort((a, b) => (b === host) - (a === host) || (pl[a].t || 0) - (pl[b].t || 0)).slice(0, 4);
    const team = ids.length >= 3 || c.fill ? 2 : 1, N = team * 2;
    const seats = Array.from({ length: N }, (_, k) => ids[k] || null);
    const f0 = FURS[c.hostFur] ? c.hostFur : 'cheese';
    const furs = [f0, ...FUR_IDS.filter(f => f !== f0)].slice(0, N);
    const names = seats.map((u, k) => u ? String((pl[u] && pl[u].name) || '친구').slice(0, 8) : '🤖 AI');
    return { t: 'go', seats, team, furs, names, target: c.target || 11, ai: TIER_IDS.includes(c.ai) ? c.ai : 'normal', seed: (Math.random() * 4294967296) >>> 0 };
  }
  function bindNet(net, role) {
    if (boundNet === net) return;
    boundNet = net;
    if (role === 'host') {
      net.on('msg', (uid, m) => {
        if (!m || boundNet !== net) return;
        if (m.t === 'hi') { if (hostGo) net.send(uid, hostGo, true); }
        else if (m.t === 'in') { if (G && G.o.kind === 'online') { const k = G.o.seats.indexOf(uid); if (k >= 0) G.rin[k] = m.b | 0; } }
        else if (m.t === 'rematch') { if (G && G.o.kind === 'online' && G.over) hostRestart(); }
      });
      net.on('leave', uid => {                                      // 경기 중에 나간 친구 자리는 AI 가 이어받음
        if (!G || G.o.kind !== 'online' || boundNet !== net) return;
        const k = G.o.seats.indexOf(uid); if (k < 0) return;
        G.o.seats[k] = null; G.ctl[k] = G.mkBot(G.o.ai, k);
        Cozy.toast(`${G.o.names[k]} 님이 나가서 AI 가 이어 해요`);
      });
    } else {
      net.on('msg', m => {
        if (!m || boundNet !== net) return;
        if (m.t === 'go') startFromGo(m, net, 'guest');
        else if (m.t === 'st' && G && G.o.kind === 'online' && G.o.seed === m.sd) applyState(m);
      });
    }
  }
  function startOnline({ net, role }) {
    bindNet(net, role);
    if (role === 'host') { hostGo = makeGo(net); net.broadcast(hostGo, true); startFromGo(hostGo, net, 'host'); }
    else {
      hostGo = null; net.send({ t: 'hi' }, true);
      if (!(G && G.o.kind === 'online' && G.o.net === net)) { stopGame(); show('play'); banner('준비 중…', '방장과 맞추는 중이에요', 0); }
    }
  }
  function hostRestart() {
    const net = window.ArenaUI && ArenaUI.net; if (!net || !net.isHost) return;
    hostGo = makeGo(net); net.broadcast(hostGo, true); startFromGo(hostGo, net, 'host');
  }
  function startFromGo(go, net, role) {
    start({ kind: 'online', role, net, seats: go.seats.slice(), team: go.team, furs: go.furs, names: go.names, target: go.target, ai: go.ai, seed: go.seed });
  }
  // 손님: 방장 상태를 그대로 덮어씀 (사이 틱은 마지막으로 받은 입력으로 미리 굴려 둠)
  function applyState(m) {
    const gs = G.s;
    if (m.s && m.s.cats && m.s.cats.length === gs.cats.length) { Object.assign(gs, m.s); if (!('lastPoint' in m.s)) gs.lastPoint = null; }
    if (m.in) for (let k = 0; k < G.rin.length; k++) G.rin[k] = m.in[k] | 0;
    if (m.evs && m.evs.length) onEvents(m.evs, true);
    drawHud();
  }

  $('startBtn').onclick = () => {
    const team = cfg.team, op = AI_FUR[cfg.mode].find(f => f !== cfg.fur), rest = FUR_IDS.filter(f => f !== cfg.fur && f !== op);
    start({ kind: 'ai', team, tier: cfg.mode, furs: team === 2 ? [cfg.fur, op, rest[0], rest[1]] : [cfg.fur, op], target: cfg.target });
  };
  $('watchBtn').onclick = () => {
    const a = AI_FUR[cfg.wl][0], b = AI_FUR[cfg.wr].find(f => f !== a), rest = FUR_IDS.filter(f => f !== a && f !== b);
    start({ kind: 'watch', team: cfg.wteam, tiers: [cfg.wl, cfg.wr], furs: cfg.wteam === 2 ? [a, b, rest[0], rest[1]] : [a, b], target: cfg.wtarget });
  };

  // ════════ 조작: 키보드 · 터치 ════════
  // 누르고 있는 것 · 틱 사이에 눌렀다 뗀 것 · 터치 — 자리 번호별 (혼자·친구랑은 0번, 한 기기는 고양이 번호 0~3)
  const held = [0, 0, 0, 0], latch = [0, 0, 0, 0], touchHeld = [0, 0, 0, 0];
  const L = IN.LEFT, Rt = IN.RIGHT, J = IN.JUMP, S = IN.SMASH;
  const KEYS1 = { ArrowLeft: [0, L], KeyA: [0, L], ArrowRight: [0, Rt], KeyD: [0, Rt], ArrowUp: [0, J], KeyW: [0, J], Space: [0, S], ArrowDown: [0, S], KeyS: [0, S], Enter: [0, S], NumpadEnter: [0, S], KeyF: [0, S], KeyZ: [0, S], Slash: [0, S] };
  const down = new Set();
  const keyMap = () => G && G.o.kind === 'duo' && G.keys ? G.keys : KEYS1;   // 한 기기: 사람 자리마다 키 묶음 (keys.js)
  function recalcKeys() { held.fill(0); const m = keyMap(); for (const c of down) { const k = m[c]; if (k) held[k[0]] |= k[1]; } }
  function clearInput() { down.clear(); ptrs.clear(); latch.fill(0); recalcKeys(); syncPad(); }
  const readInput = p => { const v = held[p] | touchHeld[p] | latch[p]; latch[p] = 0; return v; };
  const overlayOpen = () => !!document.querySelector('.overlay:not([hidden])');

  // Esc 를 누른 순간 '하는 법' 같은 창이 떠 있었나 (Cozy 가 창을 먼저 닫아 버려서 미리 봐 둠 → 창만 닫고 쉬기로 넘어가지 않게)
  let escModal = false;
  addEventListener('keydown', e => { if (e.code === 'Escape') escModal = !!document.querySelector('.overlay:not([hidden]):not(#pauseBox)'); }, true);
  addEventListener('keydown', e => {
    if (!G || $('play').hidden) return;
    if (e.code === 'Escape' && escModal) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (G.paused) { e.preventDefault(); pause(false); }
      else if (!overlayOpen() && !G.over) { e.preventDefault(); pause(true); }
      return;
    }
    if (overlayOpen()) return;                                    // 창이 떠 있으면 Enter 같은 키는 창 단추 몫
    const k = keyMap()[e.code];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) latch[k[0]] |= k[1];
    down.add(e.code); recalcKeys();
  });
  addEventListener('keyup', e => { if (down.delete(e.code)) recalcKeys(); });
  // 결과창이 막 떴을 때 스매시(Space·Enter)를 누르던 손이 '다시 하기'를 눌러 버리지 않게 잠깐 막음
  let keyGuardUntil = 0;
  const keyGuard = e => { if (performance.now() < keyGuardUntil && /^(Space|Enter|NumpadEnter)$/.test(e.code)) { e.preventDefault(); e.stopPropagation(); } };
  addEventListener('keydown', keyGuard, true); addEventListener('keyup', keyGuard, true);
  addEventListener('blur', () => { clearInput(); if (G && !G.over && !G.paused && G.o.kind !== 'watch' && G.o.kind !== 'online' && !$('play').hidden) pause(true); });

  // 터치 단추: 손가락마다 따로 (여럿 같이 눌러도 됨) · 누른 채 옆 단추로 밀면 바뀜
  const ptrs = new Map();                                         // pointerId → 단추
  let padBtns = [];
  function cachePad() {
    padBtns = [];
    const play = $('play');
    if (play.hidden || !play.classList.contains('touch') || play.classList.contains('watch')) return;
    for (const cl of $('pad').querySelectorAll('.cl')) {
      if (getComputedStyle(cl).display === 'none') continue;
      for (const el of cl.querySelectorAll('.pb')) {
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        padBtns.push({ el, p: +(cl.dataset.cat || cl.dataset.p), bit: +el.dataset.b, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 });
      }
    }
  }
  function hitPad(x, y) {
    let best = null, bd = 1e9;
    for (const b of padBtns) { const d = Math.hypot(x - b.cx, y - b.cy); if (d < b.r * 1.38 && d < bd) { bd = d; best = b; } }
    return best;
  }
  function syncPad() {
    touchHeld.fill(0);
    const on = new Set();
    for (const b of ptrs.values()) if (b) { touchHeld[b.p] |= b.bit; on.add(b.el); }
    for (const el of $('pad').querySelectorAll('.pb')) el.classList.toggle('on', on.has(el));
  }
  addEventListener('pointerdown', e => {
    if (!G || !padBtns.length || overlayOpen()) return;
    const b = hitPad(e.clientX, e.clientY); if (!b) return;
    e.preventDefault();
    ptrs.set(e.pointerId, b); latch[b.p] |= b.bit; syncPad();
  }, { passive: false });
  addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const b = hitPad(e.clientX, e.clientY);
    if (b !== ptrs.get(e.pointerId)) { ptrs.set(e.pointerId, b); if (b) latch[b.p] |= b.bit; syncPad(); }
  });
  const ptrUp = e => { if (ptrs.delete(e.pointerId)) syncPad(); };
  addEventListener('pointerup', ptrUp); addEventListener('pointercancel', ptrUp);
  $('play').addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => { if (!$('play').hidden) e.preventDefault(); });

  // ── 누가 움직이나 (끼우는 자리): 사람 · AI · (나중) 친구
  const humanCtl = p => ({ kind: 'human', input: () => readInput(p) });

  // ════════ 게임 ════════
  let G = null, gen = 0, timers = [];
  const later = (fn, ms) => { const g0 = gen, id = setTimeout(() => { timers = timers.filter(x => x !== id); if (G && G.gen === g0) fn(); }, ms); timers.push(id); };
  const clearLater = () => { timers.forEach(clearTimeout); timers = []; };

  function start(o) {
    clearLater();
    for (const ov of document.querySelectorAll('body > .overlay:not(#pauseBox)')) ov.remove();
    const seed = o.seed != null ? o.seed >>> 0 : (Math.random() * 4294967296) >>> 0;   // 시험 때만 씨앗을 정해 줌
    const team = o.team === 2 ? 2 : 1, N = team * 2;
    const s = V.create({ target: o.target, team }, seed);
    const teams = [{}, {}];                                         // 복식: 같은 편 AI 둘이 '누가 받을지'를 같이 봄
    const mkBot = (tier, k) => { const b = B.create(tier, k & 1, (seed ^ (0x51ed + k * 0x9e37)) >>> 0, team === 2 ? { cat: k, team: teams[k & 1] } : undefined); return { kind: 'bot', tier, input: st => b.act(st) }; };
    const rin = new Array(N).fill(0);
    const ctl = [], humanCat = new Array(N).fill(false);
    let myCat = -1;
    if (o.kind === 'online') {
      myCat = o.seats.indexOf(o.net.uid);                           // -1 이면 구경 (늦게 들어온 친구)
      let lastSent = -1;
      for (let k = 0; k < N; k++) {
        if (k === myCat) {
          humanCat[k] = true;
          ctl.push({ kind: 'human', input: () => {
            const v = readInput(0);
            if (o.role !== 'host' && v !== lastSent) { lastSent = v; o.net.send({ t: 'in', b: v }); }
            return v;
          } });
        } else if (o.role === 'host' && !o.seats[k]) ctl.push(mkBot(o.ai, k));
        else { if (o.seats[k]) humanCat[k] = true; ctl.push({ kind: 'remote', input: () => G.rin[k] }); }
      }
    } else if (o.kind === 'watch') {
      for (let k = 0; k < N; k++) ctl.push(mkBot(o.tiers[k & 1], k));
    } else {
      // 혼자: 나 = 고양이 0 (2:2 면 짝꿍 2 는 AI) · 한 기기: 자리마다 사람('h')이면 그 고양이 번호의 키·단추, 아니면 그 단계 AI
      for (let k = 0; k < N; k++) {
        if (o.kind === 'duo') {
          const v = (o.seats && o.seats[k]) || (k < 2 ? 'h' : 'normal');
          if (v === 'h') { ctl.push(humanCtl(k)); humanCat[k] = true; } else ctl.push(mkBot(TIER_IDS.includes(v) ? v : 'normal', k));
        } else if (k === 0) { ctl.push(humanCtl(0)); humanCat[0] = true; }
        else ctl.push(mkBot(o.tier, k));
      }
    }
    // human[편] = 그 편에 내(이 기기) 고양이가 있나 (소리·떨림용)
    const local = humanCat.map((h, k) => o.kind === 'online' ? k === myCat : h);
    const human = [local.some((h, k) => h && (k & 1) === 0), local.some((h, k) => h && (k & 1) === 1)];
    const hcats = humanCat.map((h, k) => h ? k : -1).filter(k => k >= 0);
    const keys = o.kind === 'duo' ? KS.build(hcats).map : null;
    G = { o, s, seed, ctl, human, local, myCat, rin, mkBot, team, keys, hcats, prev: { c: s.cats.map(() => [0, 0]), b: [0, 0] }, acc: 0, speed: 1, paused: false, stop: 0, wait: 0, held: false, over: false, gen: ++gen, lastHit: null };
    snap();
    $('pauseBox').hidden = true;
    clearInput();
    let labels;
    if (o.kind === 'online') labels = o.names.map((n, k) => k === myCat ? '나' : n);
    else if (o.kind === 'duo') labels = humanCat.map((h, k) => !h ? 'AI' : touchUI ? (hcats.indexOf(k) === 0 ? '👈' : '👉') : KS.SETS[k].label);
    else if (o.kind === 'ai') labels = team === 2 ? ['나', '', '짝꿍', ''] : ['나', ''];
    else labels = s.cats.map((_, k) => Cozy.TIERS[o.tiers[k & 1]].name);
    R.setFurs(o.furs, labels);
    R.reset();
    drawFast();
    show('play');
    drawHud(true);
    hideBanner(true);
    banner(o.kind === 'watch' ? 'AI 구경' : o.kind === 'online' ? (myCat < 0 ? '👀 구경 중' : '친구랑 대결!') : '준비~', team === 2 ? `${teamName(0)} vs ${teamName(1)}` : `${FURS[o.furs[0]].name} vs ${FURS[o.furs[1]].name}`, 1300);
    SND.play('start');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (o.kind !== 'watch' && o.kind !== 'online') Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems());
    // 폰 세로로 둘이서: 한 번만 '가로로 돌리면 더 편해요'
    if (o.kind === 'duo' && hcats.length >= 2 && touchUI && innerHeight > innerWidth && !Cozy.store('volley.duoTip', false)) {
      Cozy.save('volley.duoTip', true); later(() => Cozy.toast('가로로 돌리면 둘이서 하기 더 편해요 📱', 2800), 600);
    }
  }
  function snap() {
    const s = G.s, p = G.prev;
    for (let k = 0; k < s.cats.length; k++) { p.c[k][0] = s.cats[k].x; p.c[k][1] = s.cats[k].y; }
    p.b[0] = s.ball.x; p.b[1] = s.ball.y;
  }
  function tick() {
    const s = G.s, ins = G.ctl.map(c => c.input(s) | 0);
    snap();
    const evs = V.step(s, ins[0], ins[1], ins[2], ins[3]);
    if (G.o.kind === 'online' && G.o.role === 'host' && G.o.net) {
      if (evs.length || (s.tick & 1) === 0) {                       // 방장 상태를 통째로 (JSON 으로 한 번 씻어 undefined 없이)
        const m = { t: 'st', sd: G.o.seed, s, in: ins };
        if (evs.length) m.evs = evs;
        G.o.net.broadcast(JSON.parse(JSON.stringify(m)));
      }
    }
    if (!(G.o.kind === 'online' && G.o.role !== 'host')) {
      onEvents(evs);                                                 // 일이 없는 틱도 그림 쪽(공 회전·꼬리)은 매 틱 갱신
    } else {
      R.events([], G.s);
    }
  }
  function onEvents(evs, fromNet) {
    const stop = R.events(evs, G.s);
    if (!evs.length) return;
    if (stop && G.speed === 1) G.stop = Math.max(G.stop, stop);
    SND.onEvents(evs, G.human);
    for (const e of evs) {
      if (e.t === 'hit') {
        G.lastHit = e;
        const ci = e.cat != null ? e.cat : e.side, mine = G.local[ci] || G.o.kind === 'watch';     // 퍼펙트·나이스 글씨는 내 고양이 것만 (AI 구경은 둘 다)
        if (e.kind === 'smash' && e.perfect && mine) popText('퍼펙트!', e.x, e.y + 36);
        else if (e.kind === 'dig' && mine) popText('나이스!', e.x, e.y + 34);
        if (G.local[ci] && e.kind === 'smash') Cozy.vibrate(12);
      } else if (e.t === 'heat') { if (e.n === V.C.HEAT_FROM + 1) popText('공이 달아올라요! 🔥', G.s.ball.x, G.s.ball.y + 40, 'hot'); }
      else if (e.t === 'point') onPoint(e);
      else if (e.t === 'ready') { snap(); onReady(); }
      else if (e.t === 'serve') hideBanner();
      else if (e.t === 'over') onOver(e);
    }
  }
  const furName = i => FURS[G.o.furs[i]].name;
  // 편 이름: 1:1 이면 고양이 이름, 2:2 면 '치즈·고등어' 처럼 둘
  const teamName = w => G.team === 2 ? `${furName(w)}·${furName(w + 2)}` : furName(w);
  function onPoint(e) {
    drawHud();
    const h = G.lastHit, sc = `${e.score[0]} : ${e.score[1]}`;
    let how = '';
    if (e.reason === 'touches') how = '네 번 닿았어요';
    else if (h && h.side === e.w && e.kind === 'smash') how = h.perfect ? '퍼펙트 스매시!' : '스매시!';
    else if (e.kind === 'dig') how = '몸 날려 넘겼어요';
    if (e.final) banner(`${teamName(e.w)} 승리! 🏆`, sc, 0, FUR_TXT[G.o.furs[e.w]]);
    else banner(`${teamName(e.w)} 득점!`, how ? `${how} · ${sc}` : sc, 1500, FUR_TXT[G.o.furs[e.w]]);
    if (G.human[e.w] && !(G.human[0] && G.human[1])) Cozy.vibrate(20);
  }
  function onReady() {
    const sc = G.s.score, t = G.s.target;
    if (sc[0] === t - 1 || sc[1] === t - 1) banner('매치 포인트!', `${sc[0]} : ${sc[1]}`, 1000, '#f2647e');
    else hideBanner();
  }
  function onOver(e) {
    G.over = true;
    drawHud();
    const o = G.o, solo = o.kind === 'ai', won = solo ? e.w === 0 : o.kind === 'online' ? (G.myCat < 0 || G.human[e.w]) : true;
    if (solo && G.team === 1) {                                     // 기록은 1:1 만 (2:2 는 짝꿍 몫이 커서 따로 안 셈)
      const r = rec[o.tier] || (rec[o.tier] = { w: 0, l: 0, best: null });
      const sc = G.s.score;
      if (won) { r.w++; if (!r.best || sc[0] - sc[1] > r.best[0] - r.best[1]) r.best = [sc[0], sc[1]]; } else r.l++;
      Cozy.save('volley.rec', rec);
    }
    SND.play(won ? 'matchWin' : 'matchLose');
    if (won) later(() => Cozy.confetti(), 200);
    later(() => showResult(e.w), 1700);
  }
  const TIPS = ['공이 떨어질 곳으로 먼저 가서 기다려 보세요', '공이 앞발에 닿기 직전에 스매시를 누르면 퍼펙트! 더 빠르게 날아가요', '공이 낮으면 땅에서 스매시! 몸을 날려 받아요',
    '그물 앞에서 높이 뛰어 그냥 스매시하면 그물 바로 뒤로 꽂혀요', '앞쪽을 누른 채 스매시하면 납작하고 빠른 강타가 나가요', '상대가 그물 앞에 있으면 뒤쪽을 누르고 스매시, 살짝 넘겨 봐요',
    '그물보다 높은 곳에서 쳐야 세게 넘어가요'];
  function showResult(w) {
    const s = G.s, o = G.o, sc = s.score;
    const stats = `<p class="small" style="margin:0">가장 긴 랠리 ${s.stats.longest}번 넘김 · 스매시 ${s.stats.smashes[0]} : ${s.stats.smashes[1]}</p>`;
    let title, body, body0 = '';
    if (o.kind === 'ai') {
      const won = w === 0, margin = sc[0] - sc[1];
      const vsTxt = G.team === 2 ? `${tierName(o.tier)} 고양이 둘` : `${tierName(o.tier)} 고양이`;
      if (won) {
        const st = 1 + (margin >= 3 ? 1 : 0) + (margin >= Math.ceil(s.target / 2) ? 1 : 0);
        const next = o.tier !== 'hard' && st === 3 ? `<p class="cheer">다음엔 ${tierName(TIER_IDS[TIER_IDS.indexOf(o.tier) + 1])} 고양이에게 도전해 봐요!</p>` : '';
        [0, 1, 2].slice(0, st).forEach(j => later(() => Cozy.sfx.play('pop', { pitch: 1 + j * 0.25 }), 250 + j * 250));
        title = '🏆 이겼어요!';
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <div class="big">${sc[0]} : ${sc[1]}</div><p style="margin:0">${vsTxt}를 이겼어요</p>${stats}${next}`;
      } else {
        title = '😿 아쉬워요';
        body = `<div class="big">${sc[0]} : ${sc[1]}</div><p style="margin:0">${vsTxt}에게 졌어요</p>${stats}<p class="cheer">💡 ${TIPS[Math.floor(Math.random() * TIPS.length)]}</p>`;
      }
    } else {
      title = `🏆 ${o.kind === 'watch' ? tierName(o.tiers[w]) + ' ' : ''}${teamName(w)} 승리!`;
      if (o.kind === 'online' && G.team === 2) body0 = `<p style="margin:0">${o.names.filter((_, k) => (k & 1) === w).map(escH).join(' · ')}</p>`;
      body = `<div class="big">${sc[0]} : ${sc[1]}</div>${body0}${stats}`;
    }
    keyGuardUntil = performance.now() + 900;
    // 친구랑: 방장은 다시 하기(지금 방 인원으로 자리 다시 정함)·대기실로, 손님은 다시 하자고 부탁·나가기
    const online = o.kind === 'online' && o.net;
    const buttons = online
      ? (o.role === 'host'
        ? [{ label: '다시 하기', primary: true, onClick: hostRestart }, { label: '대기실로', onClick: () => { if (window.ArenaUI) ArenaUI.toLobby(); } }]
        : [{ label: '다시 하자고 하기', primary: true, onClick: () => { o.net.send({ t: 'rematch' }, true); Cozy.toast('방장에게 알렸어요'); } }, { label: '나가기', onClick: goMenu }])
      : [{ label: o.kind === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => start(o) }, { label: '메뉴', onClick: goMenu }];
    Cozy.modal({ title, html: body, buttons });
  }
  // 게임만 멈춤 (친구랑 대기실로 돌아갈 때) · back = 메뉴 화면 뒤에 깔기
  function stopGame(back) {
    clearLater(); hideBanner(true);
    for (const ov of document.querySelectorAll('body > .overlay:not(#pauseBox)')) ov.remove();
    G = null; clearInput();
    $('pauseBox').hidden = true;
    if (back) { hostGo = null; document.body.classList.remove('vb-pad'); show('menu'); drawMenu(); }
  }
  function goMenu() {
    const online = G && G.o.kind === 'online';
    stopGame(true);
    if ((online || boundNet) && window.ArenaUI && ArenaUI.net) ArenaUI.leave();   // 친구랑이면 방에서도 나감
    boundNet = null;
  }
  function pause(v) {
    if (!G) return;
    G.paused = v; $('pauseBox').hidden = !v;
    clearInput();
    if (v) {
      $('pauseInfo').textContent = `${teamName(0)} ${G.s.score[0]} : ${G.s.score[1]} ${teamName(1)}`;
      if (matchMedia('(hover: hover)').matches) setTimeout(() => $('resumeBtn').focus({ preventScroll: true }), 30);
    } else { last = performance.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  }

  // ── 점수판 · 알림
  function drawHud(first) {
    const s = G.s;
    if (first) {
      for (let i = 0; i < 2; i++) {                                // 2:2 면 편마다 얼굴 둘
        const w = $('who' + i); w.innerHTML = ''; w.classList.toggle('two', G.team === 2);
        w.appendChild(ART.portrait(G.o.furs[i], 44)); if (G.team === 2) w.appendChild(ART.portrait(G.o.furs[i + 2], 44));
      }
      const o = G.o;
      $('sub').textContent = o.kind === 'ai' ? `${tierName(o.tier)}${G.team === 2 ? ' · 2:2' : ''} · ${s.target}점 내기` : o.kind === 'online' ? `🌐 친구랑${G.team === 2 ? ' 2:2' : ''}${G.myCat < 0 ? ' · 👀 구경 중' : ''} · ${s.target}점 내기` : o.kind === 'duo' ? `👫 한 기기 ${G.hcats.length}명${G.team === 2 ? ' · 2:2' : ''} · ${s.target}점 내기` : `${tierName(o.tiers[0])} vs ${tierName(o.tiers[1])}`;
    }
    for (let i = 0; i < 2; i++) {
      const el = $('sc' + i), v = String(s.score[i]);
      if (el.textContent !== v) { el.textContent = v; if (!first) bump(el, 'pop'); }
      $('who' + i).classList.toggle('srv', s.server === i && !G.over);
    }
  }
  function bump(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  let bannerT = 0;
  function banner(big, small, ms, color) {
    const el = $('banner'), b = el.querySelector('b');
    b.textContent = big; b.style.color = color || ''; el.querySelector('span').textContent = small || '';
    el.hidden = false; el.classList.remove('out'); bump(el, 'go');
    clearTimeout(bannerT); if (ms) bannerT = setTimeout(() => hideBanner(), ms);
  }
  function hideBanner(now) {
    const el = $('banner'); clearTimeout(bannerT);
    if (el.hidden) return;
    if (now) { el.hidden = true; el.classList.remove('out', 'go'); return; }
    el.classList.remove('go'); el.classList.add('out');
    bannerT = setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 300);
  }
  function popText(text, wx, wy, cls) {
    const cam = R.cam, box = $('pops');
    const i = document.createElement('i'); i.textContent = text; if (cls) i.className = cls;
    i.style.left = (cam.ox + wx * cam.s) + 'px'; i.style.top = Math.max(16, cam.oy - wy * cam.s) + 'px';
    box.appendChild(i); setTimeout(() => i.remove(), 900);
  }
  function howtoItems() {
    const t = touchUI, k = s => `<kbd>${s}</kbd>`, duo = G && G.o.kind === 'duo';
    const items = [
      t ? '왼쪽 ◀ ▶ 로 움직이고, <b>점프</b> 로 뛰어올라요' : duo ? '자리마다 정해진 키로 움직이고 점프·스매시해요 (아래 키 안내)' : `${k('←')}${k('→')} (또는 ${k('A')}${k('D')}) 로 움직이고 ${k('↑')} (${k('W')}) 로 점프해요`,
      '공이 머리에 닿으면 통 하고 넘어가요. 공이 떨어질 곳에 먼저 가 있어요',
      `공 가까이 뛰어올라 <b>스매시</b>${t || duo ? '' : ` (${k('Space')})`}! 앞쪽을 같이 누르면 강타, 뒤쪽은 살짝 넘기기, 그냥 누르면 내리꽂기`,
      '공이 앞발에 닿기 직전에 누르면 <b>퍼펙트</b>! 그물보다 높은 곳에서 쳐야 세게 넘어가요',
      '땅에서 스매시를 누르면 몸을 날려 낮은 공을 받아요 (일어나는 데 잠깐 걸려요)',
      `상대 쪽 모래에 공이 떨어지면 1점! 먼저 ${G ? G.s.target : 11}점 내면 이겨요`,
    ];
    if (duo) items.push(keysHtml(true));
    return items;
  }

  // ════════ 화면 배치 ════════
  function show(which) {
    const play = which === 'play';
    $('menu').hidden = play; $('play').hidden = !play;
    document.body.classList.toggle('playing', play);
    if (play) { applyMode(); startLoop(); } else stopLoop();
  }
  function applyMode() {
    const p = $('play');
    const land = touchUI && innerWidth > innerHeight && innerHeight <= 560;
    p.classList.toggle('touch', touchUI);
    p.classList.toggle('desk', !touchUI);
    p.classList.toggle('land', land);
    // 한 기기: 터치 단추 왼쪽 = 첫 사람 자리, 오른쪽 = 둘째 사람 자리 (data-cat = 고양이 번호)
    const hc = G && G.o.kind === 'duo' ? G.hcats : null;
    p.classList.toggle('duo', !!hc && hc.length >= 2);
    $('pad').querySelectorAll('.cl').forEach((cl, i) => {
      cl.dataset.cat = hc && hc[i] != null ? hc[i] : i;
      const tg = cl.querySelector('.ptag'); if (tg) tg.textContent = hc && hc[i] != null ? SEAT_NAME[hc[i]] : (i ? '2P' : '1P');
    });
    const watching = !!G && (G.o.kind === 'watch' || (G.o.kind === 'online' && G.myCat < 0));   // 늦게 와서 구경만 해도 단추 없이
    p.classList.toggle('watch', watching);
    document.body.classList.toggle('vb-pad', touchUI && !land && !watching);   // 엄지 단추가 아래에 있으면 알림은 위로
    $('keyline').innerHTML = G && !watching ? keysHtml(G.o.kind === 'duo') : '';
    drawSnd();
    fit(true);
  }
  let fitW = 0, fitH = 0, dirty = true;
  function fit(force) {
    if ($('play').hidden) return;
    const st = $('stage'), w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    if (force === true || w !== fitW || Math.abs(h - fitH) > 48) {
      fitW = w; fitH = h;
      const land = $('play').classList.contains('land'), pad = $('play').classList.contains('touch') && !land;
      // 폰 세로: 판이 무대 높이를 다 채움 (하늘을 더 보여 줌) → 판과 엄지 단추 사이에 빈 띠가 없고 고양이가 엄지 바로 위에
      const sz = ART.sizeFor(w, h, land ? 440 : pad ? 1400 : 760);
      // 폰 가로: 구석 엄지 단추 자리만큼 코트를 안쪽으로 (단추가 고양이를 가리지 않게)
      let reserve = 0;
      if (land && !$('play').classList.contains('watch')) {
        for (const el of $('pad').querySelectorAll('.pb')) {
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          reserve = Math.max(reserve, r.left + r.width / 2 < w / 2 ? r.right + 6 : w - r.left + 6);
        }
      }
      const inset = land ? Math.max(0, $('play').querySelector('.bar').getBoundingClientRect().bottom - st.getBoundingClientRect().top) : 0;
      R.resize(sz.w, sz.h, Math.min(2, window.devicePixelRatio || 1), reserve, inset);
      const ct = $('court'); ct.style.width = sz.w + 'px'; ct.style.height = sz.h + 'px';
      dirty = true;
    }
    cachePad();
  }
  let fitT = 0;
  const onResize = () => { clearTimeout(fitT); fitT = setTimeout(() => { if (!$('play').hidden) applyMode(); }, 60); };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);

  // ── 돌리기: 고정 틱 + 보간 그리기 · 멈칫(스매시) · 일시정지 · 창이 떠 있으면 멈춤
  let raf = 0, last = 0;
  function startLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!G) return;
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 0; else if (dt > 0.1) dt = 0.1;
    const hold = (G.paused || overlayOpen()) && G.o.kind !== 'online';   // 친구랑은 쉬어도 경기는 계속 (다른 사람이 있으니)
    let drawDt = dt;
    if (hold) G.held = true;
    else if (G.held) {                                             // 쉬기·창이 닫힌 직전: 랠리 중이면 손을 다시 올릴 틈을 줌
      G.held = false;
      if (G.s.phase === 'play' && !G.over && G.o.kind !== 'watch') { G.wait = 700; banner('계속!', '', 650); }
    }
    if (hold) { if (!dirty) return; drawDt = 0; }
    else if (G.wait > 0) { G.wait -= dt * 1000; G.acc = 0; }
    else if (G.stop > 0) { G.stop -= dt * 1000; drawDt = dt * 0.35; }
    else {
      G.acc += dt * G.speed;
      let n = 0;
      while (G.acc >= DT && n < 8) {
        tick(); G.acc -= DT; n++;
        if (!G) return;
        if (G.stop > 0) { G.acc = 0; break; }
      }
      if (G.acc > DT * 4) G.acc = 0;
    }
    const alpha = hold || G.stop > 0 || G.wait > 0 ? 1 : Math.min(1, G.acc / DT);
    R.draw(G.s, G.prev, alpha, drawDt);
    dirty = false;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInput(); if (G && !G.over && !G.paused && G.o.kind !== 'online' && !$('play').hidden) pause(true); }
    else last = performance.now();
  });

  // ── 단추들
  Cozy.backGuard($('backBtn'), () => goMenu());
  $('pauseBtn').onclick = () => { if (G && !G.over) pause(true); };
  $('resumeBtn').onclick = () => pause(false);
  const restart = () => { if (!G) return; if (G.o.kind !== 'online') start(G.o); else if (G.o.role === 'host') hostRestart(); else Cozy.toast('처음부터는 방장만 할 수 있어요'); };
  $('pRestart').onclick = restart;
  $('restartBtn').onclick = restart;
  $('pMenu').onclick = goMenu;
  $('helpBtn').onclick = () => Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems(), { force: true });
  $('pHelp').onclick = () => { pause(false); Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems(), { force: true }); };
  function drawFast() { const on = !!G && G.speed > 1; $('fastBtn').setAttribute('aria-pressed', String(on)); $('fastIc').setAttribute('aria-pressed', String(on)); }
  $('fastBtn').onclick = $('fastIc').onclick = () => { if (!G || G.o.kind === 'online') return; G.speed = G.speed === 1 ? 2 : 1; Cozy.sfx.play('tap'); drawFast(); };
  function drawSnd() {
    const on = Cozy.sfx.on;
    $('sndBtn').innerHTML = `<span class="ic">${on ? '🔊' : '🔇'}</span><span>소리 ${on ? '켬' : '끔'}</span>`;
    $('sndBtn').setAttribute('aria-pressed', String(!on));
    $('pSound').textContent = on ? '🔊 소리 켬' : '🔇 소리 끔';
  }
  $('sndBtn').onclick = () => { Cozy.sfx.toggle(); drawSnd(); };
  $('pSound').onclick = () => { Cozy.sfx.toggle(); drawSnd(); };

  // 시험용 손잡이 (자동 시험·디버깅)
  window.__volley = {
    get G() { return G; }, R, start, goMenu, pause, applyMode,
    state: () => G && G.s,
    ff(n) { for (let i = 0; i < n && G; i++) tick(); dirty = true; },     // 틱 빨리 돌리기
    hold(p, bits) { held[p] = bits; },                                     // 키를 누르고 있는 것처럼
    get touchUI() { return touchUI; }, set touchUI(v) { touchUI = !!v; drawMenu(); applyMode(); },
  };

  drawMenu();
  if (window.ArenaUI) ArenaUI.checkUrl(() => openFriendModal());
})();

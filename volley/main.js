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

  // 🏆 예전 기기 기록(1:1 AI 판)을 공용 랭킹에 한 번 올림
  if (window.GRank) try { GRank.migrateLocal('volley', () => { let n = 0, w = 0, l = 0, b = null; for (const r of Object.values(rec)) { if (!r) continue; w += r.w || 0; l += r.l || 0; if (r.best && (b == null || r.best[0] > b)) b = r.best[0]; } n = w + l; return { n, w, l, b }; }); } catch (e) {}
  // 예전 난이도별 기록(1:1 AI 판)도 한 번 올림
  if (window.GRank) try { GRank.migrateTiers('volley', () => { const o = {}; for (const [t, r] of Object.entries(rec)) if (r && (r.w || r.l)) o[t] = { w: r.w || 0, l: r.l || 0 }; return o; }); } catch (e) {}

  const R = ART.create($('cv'));

  // ════════ 메뉴 ════════
  // 🏆 난이도별 전적은 랭킹(GRank)에서만 읽음 (기기 volley.rec 는 더 이상 화면에 안 보임) — 못 읽으면 숫자 없이
  let rk = null;
  function rankPull() { try { if (window.GRank) GRank.mine('volley').then(v => { if (v !== rk) { rk = v; if (!$('menu').hidden) drawMenu(); } }, () => {}); } catch (e) {} }
  try { addEventListener('grank', e => { if (e.detail && e.detail.game === 'volley') rankPull(); }); } catch (e) {}
  function recLine(t) { const r = rk && rk.tier && rk.tier[t]; return r && (r.w || r.l) ? `🏆 ${r.w}승 ${r.l}패` : ''; }
  function drawMenu() {
    rankPull();
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
  $('rankBtn').addEventListener('click', () => { if (window.GRank) try { GRank.open('volley'); } catch (e) {} });
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
    const st = KS.SETS[k]; return `${kb(st.show[0])}${kb(st.show[1])} 이동 ${kb(st.show[2])} 점프 ${kb(st.show[3])} 아래 ${kb(st.show[4])} 스매시`;
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
  const TOUCH_KEYS = '왼쪽 ◀ ▶ 로 움직이고, 오른쪽 점프 · 스매시를 눌러요 (🤖 자동 스매시: 점프만 하면 공 가까이서 알아서 쳐요 · ⏸ 에서 끔)<br>스매시 단추를 누른 채 위·아래로 끌면 ▲ 위 · ▼ 아래로 쳐요 (◀ ▶ 와 같이 쓰면 앞·뒤)';
  function keysHtml(duo) {
    const k = s => `<kbd>${s}</kbd>`;
    if (duo && G && G.o.seats) {                                    // 한 기기: 사람 자리마다 키 한 줄
      const hs = G.o.seats.map((v, c) => v === 'h' ? c : -1).filter(c => c >= 0);
      if (touchUI) return hs.length > 1 ? `아래 단추를 반씩 나눠 써요 · 왼쪽 = ${SEAT_NAME[hs[0]]}, 오른쪽 = ${SEAT_NAME[hs[1]]}<br>스매시 단추를 누른 채 위·아래로 끌면 ▲ 위 · ▼ 아래로 쳐요` : TOUCH_KEYS;
      return [0, 2, 1, 3].filter(c => hs.includes(c)).map(c => `${SEAT_NAME[c]} ${seatKeysHtml(c)}`).join('<br>');
    }
    if (touchUI) return TOUCH_KEYS;
    return `${k('←')}${k('→')} 또는 ${k('A')}${k('D')} 이동 · ${k('↑')}/${k('W')} 점프 · ${k('↓')}/${k('S')} 아래 · ${k('Space')} 스매시<br>스매시와 같이 누른 방향대로 날아가요: 그물 쪽 = 강타 · 점프 키 = 높이 · 아래 키 = 내리꽂기 · 그물 반대쪽 = 뒤로`;
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
  let boundNet = null, boundOffs = [], hostGo = null;
  // 방 하나에 대한 것 (판이 바뀌어도 유지): 이긴 횟수(uid별) · 판 끝난 뒤 준비한 사람 · 방장이 고른 구경꾼
  let RM = { wins: {}, rdy: new Set(), pick: {} };
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
  //  again: 같은 방에서 다음 판 — 앉았던 사람 중 아직 있는 사람 + 방장이 체크한 구경꾼 (최대 4명)
  function makeGo(net, again) {
    const c = (net.meta && net.meta.cfg) || {}, pl = net.players || {}, host = (net.meta && net.meta.host) || net.uid;
    let ids = Object.keys(pl).sort((a, b) => (b === host) - (a === host) || (pl[a].t || 0) - (pl[b].t || 0));
    if (again && G && G.o.kind === 'online') {
      const prev = G.o.seats.filter(u => u && pl[u]);
      ids = prev.concat(ids.filter(u => !prev.includes(u) && RM.pick[u]));
    }
    ids = ids.slice(0, 4);
    const team = ids.length >= 3 || c.fill ? 2 : 1, N = team * 2;
    const seats = Array.from({ length: N }, (_, k) => ids[k] || null);
    const f0 = FURS[c.hostFur] ? c.hostFur : 'cheese';
    const furs = [f0, ...FUR_IDS.filter(f => f !== f0)].slice(0, N);
    const names = seats.map((u, k) => u ? String((pl[u] && pl[u].name) || '친구').slice(0, 8) : '🤖 AI');
    // wins = 이 판을 시작하기 전까지의 이긴 횟수 (이긴 판은 모두가 같은 순간에 +1 하므로, 다시 들어온 친구가 두 번 세지 않게)
    return { t: 'go', seats, team, furs, names, target: c.target || 11, ai: TIER_IDS.includes(c.ai) ? c.ai : 'normal', seed: (Math.random() * 4294967296) >>> 0, wins: Object.assign({}, RM.wins) };
  }
  const curGo = () => Object.assign({}, hostGo, { sub: G && G.sub ? G.sub.slice() : [] });   // 'hi' 에 답할 때: 지금 AI 가 대신하는 자리도 같이
  function bindNet(net, role) {
    if (boundNet === net) return;
    boundOffs.splice(0).forEach(f => { try { f(); } catch (e) {} });
    boundNet = net; RM = { wins: {}, rdy: new Set(), pick: {} };
    const ON = (ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') boundOffs.push(off); };
    ON('players', () => { if (boundNet !== net || !G || G.o.kind !== 'online') return; drawSub(); if (G.drawReady) G.drawReady(); });   // 구경 인원 · 준비 목록
    if (role === 'host') {
      ON('msg', (uid, m) => {
        if (!m || boundNet !== net) return;
        if (m.t === 'hi') { restoreSeat(uid); if (hostGo) net.send(uid, curGo(), true); }
        else if (m.t === 'in') { if (G && G.o.kind === 'online') { const k = G.o.seats.indexOf(uid); if (k >= 0 && !G.sub[k]) G.rin[k] = m.b | 0; } }
        else if (m.t === 'rdy') {                                   // 판이 끝난 뒤 '준비' (구경꾼이 누르면 '다음 판에 낄래요')
          if (!G || G.o.kind !== 'online' || !G.over || m.sd !== G.o.seed) return;
          RM.rdy.add(uid);
          if (!G.o.seats.includes(uid)) RM.pick[uid] = true;
          sendRdy();
        }
      });
      ON('leave', uid => {                                          // 경기 중에 나간 친구: 5초 안에 안 돌아오면 방장이 고름
        if (!G || G.o.kind !== 'online' || boundNet !== net) return;
        const k = G.o.seats.indexOf(uid); if (k < 0) return;
        G.rin[k] = 0;                                               // 누르고 있던 키로 계속 달리지 않게
        Cozy.toast(`${G.o.names[k]} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
        if (G.drawReady) G.drawReady();
        if (G.over) return;
        const g0 = G;
        setTimeout(() => { if (G !== g0 || boundNet !== net || g0.over || (net.players || {})[uid] || g0.sub[k]) return; askGone(k); }, 5000);
      });
      ON('join', uid => restoreSeat(uid));
    } else {
      ON('msg', m => {
        if (!m || boundNet !== net) return;
        if (m.t === 'go') startFromGo(m, net, 'guest');
        else if (m.t === 'st' && G && G.o.kind === 'online' && G.o.seed === m.sd) applyState(m);
        else if (m.t === 'sub') { if (G && G.o.kind === 'online' && G.o.seed === m.sd && m.k < G.sub.length) { G.sub[m.k] = !!m.on; relabel(); } }
        else if (m.t === 'rdyl') {
          if (!G || G.o.kind !== 'online' || m.sd !== G.o.seed) return;
          (m.uids || []).forEach(u => RM.rdy.add(u)); RM.pick = m.pick || {};
          if (G.drawReady) G.drawReady();
        }
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
    hostGo = makeGo(net, true); net.broadcast(hostGo, true); startFromGo(hostGo, net, 'host');
  }
  function startFromGo(go, net, role) {
    RM.wins = Object.assign({}, go.wins || {}); RM.rdy = new Set(); RM.pick = {};
    start({ kind: 'online', role, net, seats: go.seats.slice(), team: go.team, furs: go.furs, names: go.names, target: go.target, ai: go.ai, seed: go.seed, sub: go.sub });
  }
  // 손님: 방장 상태를 그대로 덮어씀 (사이 틱은 마지막으로 받은 입력으로 미리 굴려 둠)
  function applyState(m) {
    const gs = G.s;
    if (m.s && m.s.cats && m.s.cats.length === gs.cats.length) { Object.assign(gs, m.s); if (!('lastPoint' in m.s)) gs.lastPoint = null; }
    if (m.in) for (let k = 0; k < G.rin.length; k++) G.rin[k] = m.in[k] | 0;
    if (m.evs && m.evs.length) onEvents(m.evs, true);
    if (gs.phase === 'over' && !G.over) onOver({ t: 'over', w: gs.winner });          // 결과 창이 떠 있을 때 다시 들어온 친구도 결과를 받음
    drawHud();
  }

  // ── 🔌 AI 가 대신 · 돌아온 친구 (방장). 실시간 경기라 경기를 가리지 않는 작은 카드로 물음
  const goneBox = () => { let b = $('goneBox'); if (!b) { b = document.createElement('div'); b.id = 'goneBox'; document.body.appendChild(b); } return b; };
  function closeGone(k) {
    if (!G || !G.goneAsk) return;
    for (const i of k == null ? Object.keys(G.goneAsk) : [k]) { const x = G.goneAsk[i]; if (x) { x.el.remove(); delete G.goneAsk[i]; } }
  }
  function askGone(k) {
    const g = G; if (!g || g.o.kind !== 'online' || g.o.role !== 'host' || g.sub[k] || g.goneAsk[k]) return;
    const net = g.o.net, el = document.createElement('div'); el.className = 'gcard';
    el.innerHTML = `<b>🔌 ${escH(g.o.names[k])} 님이 나갔어요</b><span>AI 는 ${escH(Cozy.TIERS[g.o.ai].em + ' ' + Cozy.TIERS[g.o.ai].name.split(' · ')[0])} 고양이가 대신 쳐요 · 같은 링크로 돌아오면 자리를 돌려줘요</span>
      <div><button type="button" data-a="ai" class="pri">🤖 AI가 대신</button><button type="button" data-a="lobby">🔄 처음부터 다시 (대기실로)</button><button type="button" data-a="wait">⏳ 기다릴게요</button></div>`;
    el.onclick = e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a; if (!a || G !== g) return;
      Cozy.sfx.play('tap');
      if (a === 'ai') subAI(k);
      else if (a === 'lobby') { try { net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (er) {} if (window.ArenaUI && ArenaUI.net === net) ArenaUI.toLobby(); }
      closeGone(k);
    };
    goneBox().appendChild(el);
    g.goneAsk[k] = { uid: g.o.seats[k], el };
  }
  function relabel() { if (G && G.o.kind === 'online') R.setFurs(G.o.furs, labelsOf(G.o, G.myCat)); }
  function subAI(k) {
    const g = G; if (!g || g.o.kind !== 'online' || g.o.role !== 'host' || g.sub[k]) return;
    g.sub[k] = true; g.ctl[k] = g.mkBot(g.o.ai, k); g.rin[k] = 0;
    try { g.o.net.broadcast({ t: 'sub', sd: g.o.seed, k, on: 1 }, true); g.o.net.chat(`🤖 ${g.o.names[k]} 님 자리는 AI 가 대신 쳐요 (돌아오면 다시 직접)`); } catch (e) {}
    relabel();
  }
  function restoreSeat(uid) {
    const g = G; if (!g || g.o.kind !== 'online' || g.o.role !== 'host') return;
    const k = g.o.seats.indexOf(uid); if (k < 0) return;
    closeGone(k);
    if (!g.sub[k]) return;
    g.sub[k] = false; g.ctl[k] = { kind: 'remote', input: () => G.rin[k] }; g.rin[k] = 0;
    Cozy.toast(`${g.o.names[k]} 님이 돌아왔어요. 다시 직접 쳐요`, 2400);
    try { g.o.net.broadcast({ t: 'sub', sd: g.o.seed, k, on: 0 }, true); g.o.net.chat(`🙌 ${g.o.names[k]} 님이 돌아와서 직접 쳐요`); } catch (e) {}
    relabel();
  }
  const sendRdy = () => { if (!G || !G.o.net) return; G.o.net.broadcast({ t: 'rdyl', sd: G.o.seed, uids: [...RM.rdy], pick: RM.pick }, true); if (G.drawReady) G.drawReady(); };
  const watchers = () => G && G.o.kind === 'online' && G.o.net ? Object.keys(G.o.net.players || {}).filter(u => !G.o.seats.includes(u)).length : 0;

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
  const Dn = IN.DOWN;
  // 혼자·친구랑: 방향 = ←→ 또는 AD · 위(점프) = ↑ W · 아래 = ↓ S · 스매시 = Space Enter E F Z /
  const KEYS1 = { ArrowLeft: [0, L], KeyA: [0, L], ArrowRight: [0, Rt], KeyD: [0, Rt], ArrowUp: [0, J], KeyW: [0, J], ArrowDown: [0, Dn], KeyS: [0, Dn], Space: [0, S], Enter: [0, S], NumpadEnter: [0, S], KeyE: [0, S], KeyF: [0, S], KeyZ: [0, S], Slash: [0, S] };
  const down = new Set();
  const keyMap = () => G && G.o.kind === 'duo' && G.keys ? G.keys : KEYS1;   // 한 기기: 사람 자리마다 키 묶음 (keys.js)
  function recalcKeys() { held.fill(0); const m = keyMap(); for (const c of down) { const k = m[c]; if (k) held[k[0]] |= k[1]; } }
  function clearInput() { down.clear(); ptrs.clear(); latch.fill(0); recalcKeys(); syncPad(); }
  // 🤖 자동 스매시 (폰 기본 켬): 공중에서 공이 앞발 가까이 오면 알아서 휘두름 — 퍼펙트는 없음. ⏸ 창에서 켜고 끔
  let autoSmash = Cozy.store('volley.autoSmash', true);
  const readInput = p => { const v = held[p] | touchHeld[p] | latch[p] | (touchUI && autoSmash ? IN.AUTO : 0); latch[p] = 0; return v; };
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
  const SLIDE = 22;                                               // 스매시 단추에서 이만큼(px) 끌면 위·아래
  const grab = (b, e) => b.bit === S ? Object.assign({}, b, { y0: e.clientY, ext: 0 }) : b;   // 스매시는 처음 누른 높이를 기억
  function syncPad() {
    touchHeld.fill(0);
    const on = new Set();
    for (const b of ptrs.values()) if (b) { touchHeld[b.p] |= b.bit | (b.ext || 0); on.add(b.el); }
    for (const el of $('pad').querySelectorAll('.pb')) {
      el.classList.toggle('on', on.has(el));
      let d = '';
      for (const b of ptrs.values()) if (b && b.el === el && b.ext) d = b.ext === IN.UP ? 'up' : 'dn';
      if (el.dataset.dir !== d) { if (d) el.dataset.dir = d; else delete el.dataset.dir; }
    }
  }
  addEventListener('pointerdown', e => {
    if (!G || !padBtns.length || overlayOpen()) return;
    const b = hitPad(e.clientX, e.clientY); if (!b) return;
    e.preventDefault();
    ptrs.set(e.pointerId, grab(b, e)); latch[b.p] |= b.bit; syncPad();
  }, { passive: false });
  addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const cur = ptrs.get(e.pointerId), b = hitPad(e.clientX, e.clientY);
    if (cur && cur.bit === S && (!b || b.bit === S)) {              // 스매시 단추를 누른 채 위·아래로 끌면 방향 (단추를 벗어나도 유지)
      const dy = e.clientY - cur.y0, ext = dy < -SLIDE ? IN.UP : dy > SLIDE ? IN.DOWN : 0;
      if (ext !== cur.ext) { cur.ext = ext; syncPad(); }
      return;
    }
    if (b !== cur) { ptrs.set(e.pointerId, b && grab(b, e)); if (b) latch[b.p] |= b.bit; syncPad(); }
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
    clearLater(); closeGone();
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
      let lastSent = -1, lastAt = 0;
      for (let k = 0; k < N; k++) {
        if (k === myCat) {
          humanCat[k] = true;
          ctl.push({ kind: 'human', input: () => {
            const v = readInput(0);
            const now = performance.now();   // 바뀔 때 + 0.25초마다 한 번 더 (빠른 길이라 '떼기'가 빠지면 눌린 채로 남지 않게)
            if (o.role !== 'host' && (v !== lastSent || now - lastAt > 250)) { lastSent = v; lastAt = now; o.net.send({ t: 'in', b: v }); }
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
    G = { o, s, seed, ctl, human, local, myCat, rin, mkBot, team, keys, hcats, prev: { c: s.cats.map(() => [0, 0]), b: [0, 0] }, acc: 0, speed: 1, paused: false, stop: 0, wait: 0, held: false, over: false, gen: ++gen, lastHit: null,
      sub: Array.from({ length: N }, (_, k) => !!(o.sub && o.sub[k])), goneAsk: {} };      // sub = 나간 친구 자리를 AI 가 대신하는 중
    snap();
    $('pauseBox').hidden = true;
    clearInput();
    let labels;
    if (o.kind === 'online') labels = labelsOf(o, myCat);
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
    if (o.kind !== 'watch' && o.kind !== 'online') Cozy.howto('volley-aim', '냥냥 배구 하는 법', howtoItems());
    // 폰 세로로 둘이서: 한 번만 '가로로 돌리면 더 편해요'
    if (o.kind === 'duo' && hcats.length >= 2 && touchUI && innerHeight > innerWidth && !Cozy.store('volley.duoTip', false)) {
      Cozy.save('volley.duoTip', true); later(() => Cozy.toast('가로로 돌리면 둘이서 하기 더 편해요 📱', 2800), 600);
    }
  }
  // 고양이 위 이름표: 친구랑은 내 고양이 = '나', AI 가 대신하는 자리는 🤖
  const labelsOf = (o, myCat) => o.names.map((n, k) => k === myCat ? '나' : n + (G.sub[k] ? ' 🤖' : ''));
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
        if (e.kind === 'smash' && mine && AIM_TXT[e.aim]) popText(AIM_TXT[e.aim], e.x, e.y + (e.perfect ? 66 : 38), 'aim');
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
  const AIM_TXT = { lob: '높이~', rise: '깊이!', dunk: '쾅!', back: '뒤로~', set: '올려요~' };   // 평범한 방향(곧게·강타·내리꽂기)은 글씨 없이 화살표만
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
  // 🏆 공용 랭킹: 내 기기에서 뛴 판만 (한 기기·AI 구경·구경꾼·AI 가 대신 친 자리는 제외)
  function rankReport(w) {
    try {
      const g = G, o = g.o; if (!window.GRank) return;
      if (o.kind === 'ai') {
        const won = w === 0;
        GRank.result('volley', { mode: 'ai', tier: o.tier, res: won ? 'w' : 'l', beat: won ? g.team : 0, score: g.s.score[0] });
      } else if (o.kind === 'online' && g.myCat >= 0 && !g.sub[g.myCat]) {
        const mt = g.myCat & 1, won = w === mt, opp = [];
        o.seats.forEach((u, k) => { if (u && (k & 1) !== mt && !g.sub[k]) opp.push({ uid: u, res: won ? 'w' : 'l' }); });
        GRank.result('volley', { mode: 'friend', res: won ? 'w' : 'l', beat: won ? opp.length : 0, score: g.s.score[mt], opp });
      }
    } catch (er) {}
  }
  function onOver(e) {
    G.over = true;
    if (G.o.kind === 'online') G.o.seats.forEach((u, k) => { if (u && (k & 1) === e.w) RM.wins[u] = (RM.wins[u] || 0) + 1; });   // 이긴 편 사람마다 +1 (모든 화면이 같은 순간에)
    drawHud(); drawSub();
    const o = G.o, solo = o.kind === 'ai', won = solo ? e.w === 0 : o.kind === 'online' ? (G.myCat < 0 || G.human[e.w]) : true;
    if (solo && G.team === 1) {                                     // 기록은 1:1 만 (2:2 는 짝꿍 몫이 커서 따로 안 셈)
      const r = rec[o.tier] || (rec[o.tier] = { w: 0, l: 0, best: null });
      const sc = G.s.score;
      if (won) { r.w++; if (!r.best || sc[0] - sc[1] > r.best[0] - r.best[1]) r.best = [sc[0], sc[1]]; } else r.l++;
      Cozy.save('volley.rec', rec);
    }
    rankReport(e.w);
    SND.play(won ? 'matchWin' : 'matchLose');
    if (won) later(() => Cozy.confetti(), 200);
    later(() => showResult(e.w), 1700);
  }
  const TIPS = ['공이 떨어질 곳으로 먼저 가서 기다려 보세요', '공이 앞발에 닿기 직전에 스매시를 누르면 퍼펙트! 더 빠르게 날아가요', '공이 낮으면 땅에서 스매시! 몸을 날려 받아요',
    '그물 앞에서 높이 뛰어 아래를 누르고 스매시하면 그물 바로 뒤로 꽂혀요', '그물 쪽을 누른 채 스매시하면 납작하고 빠른 강타가 나가요', '상대가 그물 앞에 있으면 위를 누르고 스매시, 높이 살짝 넘겨 봐요', '땅에서 방향키 없이 스매시만 누르면 안 움직여요. 몸을 날리려면 방향키도 같이!',
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
    // 친구랑: 판 사이에 손님은 '✋ 준비', 방장은 다 준비되면 다음 판 시작 (혼자 다시 시작하지 못함) · 구경꾼은 방장이 체크하면 다음 판부터 같이
    if (o.kind === 'online' && o.net) return onlineResult(title, body);
    Cozy.modal({ title, html: body, buttons: [{ label: o.kind === 'watch' ? '한 판 더' : '다시 하기', primary: true, onClick: () => start(o) }, { label: '메뉴', onClick: goMenu }] });
  }
  function onlineResult(title, body) {
    const g = G, o = g.o, net = o.net, host = o.role === 'host', myId = net.uid;
    const buttons = host
      ? [{ label: '다음 판 시작 ▶', primary: true, onClick: hostRestart }, { label: '안 기다리고 시작', onClick: hostRestart }, { label: '대기실로', onClick: () => { if (window.ArenaUI) ArenaUI.toLobby(); } }, { label: '나가기', ghost: true, onClick: goMenu }]
      : [{ label: '✋ 준비', primary: true, onClick: () => { RM.rdy.add(myId); net.send({ t: 'rdy', sd: o.seed }, true); g.drawReady(); return false; } }, { label: '나가기', onClick: goMenu }];
    Cozy.modal({ title, html: body + '<div class="rdy"></div>', buttons, cls: 'vb-res' });
    const ov = [...document.querySelectorAll('body > .overlay.vb-res')].pop(), rb = ov.querySelector('.rdy'), bs = ov.querySelectorAll('.row button'), nb = bs[0], fb = host ? bs[1] : null;
    g.drawReady = () => {
      if (G !== g || !rb.isConnected) return;
      const pl = net.players || {}, hostId = (net.meta || {}).host;
      const row = o.seats.map((u, k) => u ? [k, u] : null).filter(Boolean).map(([k, u]) => {
        if (u === hostId) return `<span class="ok">👑 ${escH(o.names[k])}${u === myId ? ' (나)' : ''}</span>`;
        const gone = !pl[u], ok = RM.rdy.has(u) || g.sub[k];
        return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${escH(o.names[k])}${u === myId ? ' (나)' : ''}</span>`;
      });
      const wu = Object.keys(pl).filter(u => !o.seats.includes(u));
      const wl = wu.map(u => {
        const nm = escH((pl[u] || {}).name || '친구'), hand = RM.rdy.has(u) ? ' ✋' : '';
        return host ? `<label><input type="checkbox" data-pick="${escH(u)}" ${RM.pick[u] ? 'checked' : ''}> ${nm}${hand}</label>` : `<span>${nm}${hand}${RM.pick[u] ? ' ✔' : ''}</span>`;
      }).join('');
      rb.innerHTML = `<div class="rdy-row">${row.join('')}</div>${wu.length ? `<div class="rdy-w">👀 구경 ${wu.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
      if (host) {
        const need = o.seats.filter((u, k) => u && u !== myId && pl[u] && !g.sub[k]), n = need.filter(u => RM.rdy.has(u)).length, all = n === need.length;
        nb.disabled = !all; nb.textContent = all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${n}/${need.length})`;
        fb.hidden = all;
        rb.querySelectorAll('[data-pick]').forEach(c => c.onchange = () => { RM.pick[c.dataset.pick] = c.checked; sendRdy(); });
      } else {
        const on = RM.rdy.has(myId), seated = o.seats.includes(myId);
        nb.disabled = on; nb.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : seated ? '✋ 준비' : '✋ 다음 판에 낄래요';
      }
    };
    g.drawReady();
  }
  // 게임만 멈춤 (친구랑 대기실로 돌아갈 때) · back = 메뉴 화면 뒤에 깔기
  function stopGame(back) {
    clearLater(); closeGone(); hideBanner(true);
    for (const ov of document.querySelectorAll('body > .overlay:not(#pauseBox)')) ov.remove();
    G = null; clearInput();
    $('pauseBox').hidden = true;
    if (back) { hostGo = null; document.body.classList.remove('vb-pad'); show('menu'); drawMenu(); }
  }
  function goMenu() {
    const online = G && G.o.kind === 'online';
    stopGame(true);
    if ((online || boundNet) && window.ArenaUI && ArenaUI.net) ArenaUI.leave();   // 친구랑이면 방에서도 나감
    boundOffs.splice(0).forEach(f => { try { f(); } catch (e) {} });
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
      drawSub();
    }
    for (let i = 0; i < 2; i++) {
      const el = $('sc' + i), v = String(s.score[i]);
      if (el.textContent !== v) { el.textContent = v; if (!first) bump(el, 'pop'); }
      $('who' + i).classList.toggle('srv', s.server === i && !G.over);
    }
  }
  // 점수판 아래 한 줄. 친구랑은 이 방 전적(이긴 횟수)과 구경 인원도 (경기를 가리지 않게 같은 줄에)
  function drawSub() {
    if (!G) return;
    const o = G.o, s = G.s;
    let t;
    if (o.kind === 'ai') t = `${tierName(o.tier)}${G.team === 2 ? ' · 2:2' : ''} · ${s.target}점 내기`;
    else if (o.kind === 'online') {
      const hs = o.seats.map((u, k) => u ? [k, u] : null).filter(Boolean), wc = watchers();
      const wl = hs.some(([, u]) => RM.wins[u]) ? hs.map(([k, u]) => `${[...o.names[k]].slice(0, 4).join('')} ${RM.wins[u] || 0}승`).join(' · ') : '';
      t = (wl ? `🏆 ${wl}` : `🌐 친구랑${G.team === 2 ? ' 2:2' : ''} · ${s.target}점 내기`) + (G.myCat < 0 ? ' · 👀 구경 중' : '') + (wc ? ` · 👀 ${wc}` : '');
    } else if (o.kind === 'duo') t = `👫 한 기기 ${G.hcats.length}명${G.team === 2 ? ' · 2:2' : ''} · ${s.target}점 내기`;
    else t = `${tierName(o.tiers[0])} vs ${tierName(o.tiers[1])}`;
    if ($('sub').textContent !== t) $('sub').textContent = t;
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
      `공 가까이 뛰어올라 <b>스매시</b>${t || duo ? '' : ` (${k('Space')})`}! <b>누른 방향대로</b> 날아가요 (그물 쪽이 앞)`,
      '그냥 = 곧고 힘찬 공 · 앞 = 더 빠른 강타 · 위 = 높이 띄우기 · 아래 = 내리꽂기 · 뒤 = 내 쪽 뒤로 높이 (짝에게 올려 주기!) · 앞+위 = 깊이, 앞+아래 = 더 빠른 내리꽂기, 뒤+위 = 더 높이 뒤로',
      t ? '위·아래는 <b>스매시 단추를 누른 채 위나 아래로 끌어요</b> (◀ ▶ 를 같이 누르면 앞·뒤 조합). 스매시 때 공 쪽에 작은 화살표가 떠요'
        : duo ? '스매시를 누를 때 같이 누른 방향이 공 방향이에요. 공 쪽에 작은 화살표가 떠요'
          : `위 = <b>점프 키(${k('↑')}/${k('W')})를 누른 채</b> (높이 오르는 중엔 제외), 아래 = ${k('↓')}/${k('S')}. 스매시 때 공 쪽에 작은 화살표가 떠요`,
      '공이 앞발에 닿기 직전에 누르면 <b>퍼펙트</b>! 그물보다 높은 곳에서 쳐야 세게 넘어가요',
      '땅에서는 <b>방향키를 누른 채</b> 스매시해야 몸을 날려 낮은 공을 받아요 (그냥 누르면 안 움직여요 · 일어나는 데 잠깐 걸려요)',
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
  const drawAuto = () => { $('pAuto').textContent = autoSmash ? '🤖 자동 스매시 켬' : '✋ 자동 스매시 끔'; $('pAuto').hidden = !touchUI; };
  $('pAuto').onclick = () => { autoSmash = !autoSmash; Cozy.save('volley.autoSmash', autoSmash); drawAuto(); };
  new MutationObserver(drawAuto).observe($('pauseBox'), { attributes: true, attributeFilter: ['hidden'] });
  drawAuto();

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

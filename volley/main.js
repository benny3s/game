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
  const cfg = Object.assign({ tab: 'solo', mode: 'easy', fur: 'cheese', fur2: 'mackerel', target: 11, wl: 'normal', wr: 'hard', wtarget: 11 }, Cozy.store('volley.cfg', {}));
  if (!FURS[cfg.fur]) cfg.fur = 'cheese';
  if (!FURS[cfg.fur2] || cfg.fur2 === cfg.fur) cfg.fur2 = FUR_IDS.find(f => f !== cfg.fur);
  if (![...TIER_IDS, 'duo'].includes(cfg.mode)) cfg.mode = 'easy';
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
    for (const [id, box, t] of [['tabSolo', 'soloBox', 'solo'], ['tabWatch', 'watchBox', 'watch']]) { $(id).setAttribute('aria-pressed', String(cfg.tab === t)); $(box).hidden = cfg.tab !== t; }
    const items = TIER_IDS.map(id => ({ id, em: Cozy.TIERS[id].em, name: Cozy.TIERS[id].name, cls: Cozy.TIERS[id].cls, desc: TIER_TXT[id], rec: recLine(id) }));
    items.push({ id: 'duo', em: '👫', name: '둘이서', cls: 't-master', desc: '한 화면에서 같이 해요', rec: '' });
    $('tiers').innerHTML = items.map(x => `<button class="tier ${x.cls}" data-id="${x.id}" aria-pressed="${cfg.mode === x.id}"><span class="em">${x.em}</span><b>${x.name}</b><span>${x.desc}</span>${x.rec ? `<span>${x.rec}</span>` : ''}</button>`).join('');
    const duo = cfg.mode === 'duo';
    $('furLbl').textContent = duo ? '왼쪽 고양이 (1P)' : '내 고양이';
    $('fur2Row').hidden = !duo;
    $('soloBox').classList.toggle('duo-pick', duo);
    furs($('fur1'), cfg.fur, id => { cfg.fur = id; if (cfg.fur2 === id) cfg.fur2 = FUR_IDS.find(f => f !== id); saveCfg(); drawMenu(); });
    furs($('fur2'), cfg.fur2, id => { cfg.fur2 = id; if (cfg.fur === id) cfg.fur = FUR_IDS.find(f => f !== id); saveCfg(); drawMenu(); });
    seg($('target'), [7, 11, 15].map(n => [n, n + '점']), cfg.target, v => { cfg.target = v; saveCfg(); drawMenu(); });
    seg($('wl'), TIER_IDS.map(t => [t, tierName(t)]), cfg.wl, v => { cfg.wl = v; saveCfg(); drawMenu(); });
    seg($('wr'), TIER_IDS.map(t => [t, tierName(t)]), cfg.wr, v => { cfg.wr = v; saveCfg(); drawMenu(); });
    seg($('wtarget'), [7, 11, 15].map(n => [n, n + '점']), cfg.wtarget, v => { cfg.wtarget = v; saveCfg(); drawMenu(); });
    $('keys').innerHTML = keysHtml(duo);
    $('startBtn').textContent = duo ? '▶ 둘이서 시작!' : `▶ ${Cozy.TIERS[cfg.mode].name} 고양이와 시작!`;
  }
  $('tiers').addEventListener('click', e => { const b = e.target.closest('.tier'); if (!b) return; Cozy.sfx.play('tap'); cfg.mode = b.dataset.id; saveCfg(); drawMenu(); });
  function keysHtml(duo) {
    const k = s => `<kbd>${s}</kbd>`;
    if (touchUI) return duo ? '아래 단추를 반씩 나눠 써요 · 왼쪽 = 1P, 오른쪽 = 2P' : '왼쪽 ◀ ▶ 로 움직이고, 오른쪽 점프 · 스매시를 눌러요';
    if (duo) return `1P ${k('A')}${k('D')} 이동 ${k('W')} 점프 ${k('F')} 스매시<br>2P ${k('←')}${k('→')} 이동 ${k('↑')} 점프 ${k('Enter')} 스매시`;
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
  $('tabWatch').onclick = () => { cfg.tab = 'watch'; saveCfg(); Cozy.sfx.play('tap'); drawMenu(); };

  function openFriendModal() {
    if (!window.ArenaUI) { Cozy.toast('친구 대전 모듈을 불러오지 못했어요'); return; }
    ArenaUI.open({
      game: 'volley',
      title: '🏐 냥냥 배구 · 친구랑',
      minPlayers: 2,
      maxPlayers: 2,
      extraOptionsHtml: `
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:4px">
          <span class="small" style="align-self:center">내기 점수: <b>${cfg.target}점</b> · 내 고양이: <b>${FURS[cfg.fur].name}</b></span>
        </div>`,
      buildConfig: () => ({
        target: cfg.target,
        hostFur: cfg.fur,
        seed: (Math.random() * 4294967296) >>> 0,
      }),
      renderConfig: c => `🏖 ${(c && c.target) || 11}점 내기`,
      onStart: ({ net, role, cfg: c, players }) => startOnline({ net, role, cfg: c, players }),
    });
  }

  function startOnline({ net, role, cfg: c, players }) {
    const plist = Object.entries(players || {}).map(([uid, p]) => Object.assign({ uid }, p)).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9));
    const mySide = role === 'host' ? 0 : 1;
    const f0 = (c && FURS[c.hostFur]) ? c.hostFur : 'cheese';
    const f1 = FUR_IDS.find(f => f !== f0) || 'mackerel';
    const names = [
      plist[0] ? plist[0].name : '방장',
      plist[1] ? plist[1].name : '친구',
    ];
    start({
      kind: 'online',
      role,
      net,
      mySide,
      names,
      furs: [f0, f1],
      target: (c && c.target) || 11,
      seed: (c && c.seed) || 12345,
    });
  }
  $('startBtn').onclick = () => {
    if (cfg.mode === 'duo') start({ kind: 'duo', furs: [cfg.fur, cfg.fur2], target: cfg.target });
    else start({ kind: 'ai', tier: cfg.mode, furs: [cfg.fur, AI_FUR[cfg.mode].find(f => f !== cfg.fur)], target: cfg.target });
  };
  $('watchBtn').onclick = () => {
    const a = AI_FUR[cfg.wl][0], b = AI_FUR[cfg.wr].find(f => f !== a);
    start({ kind: 'watch', tiers: [cfg.wl, cfg.wr], furs: [a, b], target: cfg.wtarget });
  };

  // ════════ 조작: 키보드 · 터치 ════════
  const held = [0, 0], latch = [0, 0], touchHeld = [0, 0];   // 누르고 있는 것 · 틱 사이에 눌렀다 뗀 것 · 터치
  const L = IN.LEFT, Rt = IN.RIGHT, J = IN.JUMP, S = IN.SMASH;
  const KEYS1 = { ArrowLeft: [0, L], KeyA: [0, L], ArrowRight: [0, Rt], KeyD: [0, Rt], ArrowUp: [0, J], KeyW: [0, J], Space: [0, S], ArrowDown: [0, S], KeyS: [0, S], Enter: [0, S], NumpadEnter: [0, S], KeyF: [0, S], KeyZ: [0, S], Slash: [0, S] };
  const KEYS2 = { KeyA: [0, L], KeyD: [0, Rt], KeyW: [0, J], KeyF: [0, S], KeyS: [0, S], KeyG: [0, S], Space: [0, S], ArrowLeft: [1, L], ArrowRight: [1, Rt], ArrowUp: [1, J], Enter: [1, S], NumpadEnter: [1, S], Slash: [1, S], ArrowDown: [1, S] };
  const down = new Set();
  const keyMap = () => G && G.o.kind === 'duo' ? KEYS2 : KEYS1;
  function recalcKeys() { held[0] = held[1] = 0; const m = keyMap(); for (const c of down) { const k = m[c]; if (k) held[k[0]] |= k[1]; } }
  function clearInput() { down.clear(); ptrs.clear(); latch[0] = latch[1] = 0; recalcKeys(); syncPad(); }
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
  addEventListener('blur', () => { clearInput(); if (G && !G.over && !G.paused && G.o.kind !== 'watch' && !$('play').hidden) pause(true); });

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
        padBtns.push({ el, p: +cl.dataset.p, bit: +el.dataset.b, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 });
      }
    }
  }
  function hitPad(x, y) {
    let best = null, bd = 1e9;
    for (const b of padBtns) { const d = Math.hypot(x - b.cx, y - b.cy); if (d < b.r * 1.38 && d < bd) { bd = d; best = b; } }
    return best;
  }
  function syncPad() {
    touchHeld[0] = touchHeld[1] = 0;
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
  const botCtl = (tier, side, seed) => { const b = B.create(tier, side, seed); return { kind: 'bot', tier, input: s => b.act(s) }; };

  // ════════ 게임 ════════
  let G = null, gen = 0, timers = [];
  const later = (fn, ms) => { const g0 = gen, id = setTimeout(() => { timers = timers.filter(x => x !== id); if (G && G.gen === g0) fn(); }, ms); timers.push(id); };
  const clearLater = () => { timers.forEach(clearTimeout); timers = []; };

  function start(o) {
    clearLater();
    for (const ov of document.querySelectorAll('body > .overlay:not(#pauseBox)')) ov.remove();
    const seed = o.seed != null ? o.seed >>> 0 : (Math.random() * 4294967296) >>> 0;   // 시험 때만 씨앗을 정해 줌
    const s = V.create({ target: o.target }, seed);
    let human, ctl, remoteIn = 0, lastSentIn = -1;
    if (o.kind === 'online') {
      const mySide = o.mySide || 0;
      human = [mySide === 0, mySide === 1];
      const myCtl = {
        kind: 'human',
        input: () => {
          const v = readInput(0);
          if (v !== lastSentIn && o.net) {
            lastSentIn = v;
            const msg = { t: 'in', b: v };
            if (o.role === 'host') o.net.broadcast(msg);
            else o.net.send(msg);
          }
          return v;
        },
      };
      const remCtl = { kind: 'remote', input: () => remoteIn };
      ctl = mySide === 0 ? [myCtl, remCtl] : [remCtl, myCtl];
      const onNetMsg = m => {
        if (!m || !G || G.o.kind !== 'online') return;
        if (m.t === 'in') {
          remoteIn = m.b | 0;
        } else if (m.t === 'st' && o.role !== 'host') {
          const gs = G.s;
          gs.cats[0] = Object.assign(gs.cats[0], m.c[0]);
          gs.cats[1] = Object.assign(gs.cats[1], m.c[1]);
          gs.ball = Object.assign(gs.ball, m.b);
          gs.phase = m.ph; gs.timer = m.tm; gs.server = m.sv;
          gs.touches = m.tc; gs.score = m.sc; gs.rally = m.rl; gs.heat = m.ht;
          if (m.st) gs.stats = m.st;
          if (m.evs && m.evs.length) onEvents(m.evs, true);
          drawHud();
        } else if (m.t === 'rematch') {
          if (o.role === 'host') o.net.broadcast(m);
          start(Object.assign({}, o, { seed: m.seed }));
        }
      };
      if (o.net && !o._boundNet) {
        o._boundNet = true;
        if (o.role === 'host') o.net.on('msg', (_uid, m) => onNetMsg(m));
        else o.net.on('msg', m => onNetMsg(m));
      }
      o._setRemoteIn = v => { remoteIn = v; };
    } else {
      human = [o.kind !== 'watch', o.kind === 'duo'];
      ctl = [
        o.kind === 'watch' ? botCtl(o.tiers[0], 0, seed ^ 0x51ed) : humanCtl(0),
        o.kind === 'duo' ? humanCtl(1) : botCtl(o.kind === 'watch' ? o.tiers[1] : o.tier, 1, seed ^ 0x9e37),
      ];
    }
    G = { o, s, seed, ctl, human, prev: { c: [[0, 0], [0, 0]], b: [0, 0] }, acc: 0, speed: 1, paused: false, stop: 0, wait: 0, held: false, over: false, gen: ++gen, lastHit: null };
    snap();
    $('pauseBox').hidden = true;
    clearInput();
    const labels = o.kind === 'online' ? (o.names || ['1P', '2P']) : o.kind === 'duo' ? ['1P', '2P'] : o.kind === 'ai' ? ['나', ''] : [Cozy.TIERS[o.tiers[0]].name, Cozy.TIERS[o.tiers[1]].name];
    R.setFurs(o.furs, labels);
    R.reset();
    drawFast();
    show('play');
    drawHud(true);
    hideBanner(true);
    banner(o.kind === 'watch' ? 'AI 구경' : o.kind === 'online' ? '친구랑 대결!' : '준비~', `${FURS[o.furs[0]].name} vs ${FURS[o.furs[1]].name}`, 1300);
    SND.play('start');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (o.kind !== 'watch' && o.kind !== 'online') Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems());
    // 폰 세로로 둘이서: 한 번만 '가로로 돌리면 더 편해요'
    if (o.kind === 'duo' && touchUI && innerHeight > innerWidth && !Cozy.store('volley.duoTip', false)) {
      Cozy.save('volley.duoTip', true); later(() => Cozy.toast('가로로 돌리면 둘이서 하기 더 편해요 📱', 2800), 600);
    }
  }
  function snap() {
    const s = G.s, p = G.prev;
    p.c[0][0] = s.cats[0].x; p.c[0][1] = s.cats[0].y; p.c[1][0] = s.cats[1].x; p.c[1][1] = s.cats[1].y; p.b[0] = s.ball.x; p.b[1] = s.ball.y;
  }
  function tick() {
    const s = G.s;
    const a = G.ctl[0].input(s) | 0, b = G.ctl[1].input(s) | 0;
    snap();
    const evs = V.step(s, a, b);
    if (G.o.kind === 'online' && G.o.role === 'host' && G.o.net) {
      if (evs.length || (s.tick & 1) === 0) {
        G.o.net.broadcast({
          t: 'st',
          c: s.cats, b: s.ball, ph: s.phase, tm: s.timer, sv: s.server,
          tc: s.touches, sc: s.score, rl: s.rally, ht: s.heat,
          st: evs.length ? s.stats : undefined,
          evs: evs.length ? evs : undefined,
        });
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
        const mine = G.human[e.side] || G.o.kind === 'watch';     // 퍼펙트·나이스 글씨는 내 고양이 것만 (AI 구경은 둘 다)
        if (e.kind === 'smash' && e.perfect && mine) popText('퍼펙트!', e.x, e.y + 36);
        else if (e.kind === 'dig' && mine) popText('나이스!', e.x, e.y + 34);
        if (G.human[e.side] && e.kind === 'smash') Cozy.vibrate(12);
      } else if (e.t === 'heat') { if (e.n === V.C.HEAT_FROM + 1) popText('공이 달아올라요! 🔥', G.s.ball.x, G.s.ball.y + 40, 'hot'); }
      else if (e.t === 'point') onPoint(e);
      else if (e.t === 'ready') { snap(); onReady(); }
      else if (e.t === 'serve') hideBanner();
      else if (e.t === 'over') onOver(e);
    }
  }
  const furName = i => FURS[G.o.furs[i]].name;
  function onPoint(e) {
    drawHud();
    const h = G.lastHit, sc = `${e.score[0]} : ${e.score[1]}`;
    let how = '';
    if (e.reason === 'touches') how = '네 번 닿았어요';
    else if (h && h.side === e.w && e.kind === 'smash') how = h.perfect ? '퍼펙트 스매시!' : '스매시!';
    else if (e.kind === 'dig') how = '몸 날려 넘겼어요';
    if (e.final) banner(`${furName(e.w)} 승리! 🏆`, sc, 0, FUR_TXT[G.o.furs[e.w]]);
    else banner(`${furName(e.w)} 득점!`, how ? `${how} · ${sc}` : sc, 1500, FUR_TXT[G.o.furs[e.w]]);
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
    const o = G.o, solo = o.kind === 'ai', won = solo ? e.w === 0 : true;
    if (solo) {
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
    let title, body;
    if (o.kind === 'ai') {
      const won = w === 0, margin = sc[0] - sc[1];
      if (won) {
        const st = 1 + (margin >= 3 ? 1 : 0) + (margin >= Math.ceil(s.target / 2) ? 1 : 0);
        const next = o.tier !== 'hard' && st === 3 ? `<p class="cheer">다음엔 ${tierName(TIER_IDS[TIER_IDS.indexOf(o.tier) + 1])} 고양이에게 도전해 봐요!</p>` : '';
        [0, 1, 2].slice(0, st).forEach(j => later(() => Cozy.sfx.play('pop', { pitch: 1 + j * 0.25 }), 250 + j * 250));
        title = '🏆 이겼어요!';
        body = `<div class="stars">${[0, 1, 2].map(j => `<span class="${j < st ? 'on' : ''}" style="animation-delay:${0.15 + j * 0.25}s">⭐</span>`).join('')}</div>
          <div class="big">${sc[0]} : ${sc[1]}</div><p style="margin:0">${tierName(o.tier)} 고양이를 이겼어요</p>${stats}${next}`;
      } else {
        title = '😿 아쉬워요';
        body = `<div class="big">${sc[0]} : ${sc[1]}</div><p style="margin:0">${tierName(o.tier)} 고양이에게 졌어요</p>${stats}<p class="cheer">💡 ${TIPS[Math.floor(Math.random() * TIPS.length)]}</p>`;
      }
    } else {
      title = `🏆 ${o.kind === 'watch' ? tierName(o.tiers[w]) + ' ' : ''}${FURS[o.furs[w]].name} 승리!`;
      body = `<div class="big">${sc[0]} : ${sc[1]}</div>${stats}`;
    }
    keyGuardUntil = performance.now() + 900;
    Cozy.modal({
      title,
      html: body,
      buttons: [
        {
          label: o.kind === 'watch' ? '한 판 더' : '다시 하기',
          primary: true,
          onClick: () => {
            if (o.kind === 'online' && o.net) {
              const msg = { t: 'rematch', seed: (Math.random() * 4294967296) >>> 0 };
              if (o.role === 'host') { o.net.broadcast(msg); start(Object.assign({}, o, { seed: msg.seed })); }
              else o.net.send(msg);
            } else {
              start(o);
            }
          },
        },
        { label: '메뉴', onClick: goMenu },
      ],
    });
  }
  function goMenu() {
    clearLater(); hideBanner(true);
    document.body.classList.remove('vb-pad');
    if (G && G.o && G.o.net) { try { G.o.net.close(); } catch (e) {} }
    G = null; clearInput();
    $('pauseBox').hidden = true;
    show('menu'); drawMenu();
  }
  function pause(v) {
    if (!G) return;
    G.paused = v; $('pauseBox').hidden = !v;
    clearInput();
    if (v) {
      $('pauseInfo').textContent = `${furName(0)} ${G.s.score[0]} : ${G.s.score[1]} ${furName(1)}`;
      if (matchMedia('(hover: hover)').matches) setTimeout(() => $('resumeBtn').focus({ preventScroll: true }), 30);
    } else { last = performance.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  }

  // ── 점수판 · 알림
  function drawHud(first) {
    const s = G.s;
    if (first) {
      for (let i = 0; i < 2; i++) { const w = $('who' + i); w.innerHTML = ''; w.appendChild(ART.portrait(G.o.furs[i], 44)); }
      const o = G.o;
      $('sub').textContent = o.kind === 'ai' ? `${tierName(o.tier)} · ${s.target}점 내기` : o.kind === 'online' ? `🌐 친구랑 · ${s.target}점 내기` : o.kind === 'duo' ? `👫 둘이서 · ${s.target}점 내기` : `${tierName(o.tiers[0])} vs ${tierName(o.tiers[1])}`;
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
      t ? '왼쪽 ◀ ▶ 로 움직이고, <b>점프</b> 로 뛰어올라요' : `${k('←')}${k('→')} (또는 ${k('A')}${k('D')}) 로 움직이고 ${k('↑')} (${k('W')}) 로 점프해요`,
      '공이 머리에 닿으면 통 하고 넘어가요. 공이 떨어질 곳에 먼저 가 있어요',
      `공 가까이 뛰어올라 <b>스매시</b>${t || duo ? '' : ` (${k('Space')})`}! 앞쪽을 같이 누르면 강타, 뒤쪽은 살짝 넘기기, 그냥 누르면 내리꽂기`,
      '공이 앞발에 닿기 직전에 누르면 <b>퍼펙트</b>! 그물보다 높은 곳에서 쳐야 세게 넘어가요',
      '땅에서 스매시를 누르면 몸을 날려 낮은 공을 받아요 (일어나는 데 잠깐 걸려요)',
      `상대 쪽 모래에 공이 떨어지면 1점! 먼저 ${G ? G.s.target : 11}점 내면 이겨요`,
    ];
    if (duo) items.push(t ? '둘이서는 아래 단추를 반씩: 왼쪽 = 1P, 오른쪽 = 2P' : `1P ${k('A')}${k('D')} ${k('W')} ${k('F')} · 2P ${k('←')}${k('→')} ${k('↑')} ${k('Enter')}`);
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
    p.classList.toggle('duo', !!G && G.o.kind === 'duo');
    p.classList.toggle('watch', !!G && G.o.kind === 'watch');
    document.body.classList.toggle('vb-pad', touchUI && !land && !(G && G.o.kind === 'watch'));   // 엄지 단추가 아래에 있으면 알림은 위로
    $('keyline').innerHTML = G ? keysHtml(G.o.kind === 'duo') : '';
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
    const hold = G.paused || overlayOpen();
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
    if (document.hidden) { clearInput(); if (G && !G.over && !G.paused && !$('play').hidden) pause(true); }
    else last = performance.now();
  });

  // ── 단추들
  Cozy.backGuard($('backBtn'), () => goMenu());
  $('pauseBtn').onclick = () => { if (G && !G.over) pause(true); };
  $('resumeBtn').onclick = () => pause(false);
  $('pRestart').onclick = () => { if (G) start(G.o); };
  $('restartBtn').onclick = () => { if (G) start(G.o); };
  $('pMenu').onclick = goMenu;
  $('helpBtn').onclick = () => Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems(), { force: true });
  $('pHelp').onclick = () => { pause(false); Cozy.howto('volley', '냥냥 배구 하는 법', howtoItems(), { force: true }); };
  function drawFast() { const on = !!G && G.speed > 1; $('fastBtn').setAttribute('aria-pressed', String(on)); $('fastIc').setAttribute('aria-pressed', String(on)); }
  $('fastBtn').onclick = $('fastIc').onclick = () => { if (!G) return; G.speed = G.speed === 1 ? 2 : 1; Cozy.sfx.play('tap'); drawFast(); };
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

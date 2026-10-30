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
  const opts = Object.assign({ tab: 'solo', mode: 'classic', tier: 'normal', animal: 0, pad: false }, Cozy.store('land.opts', {}));
  if (!(opts.animal >= 0 && opts.animal < A.ANIMALS.length)) opts.animal = 0;
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
  function drawMenu() {
    const solo = opts.tab === 'solo';
    $('tabSolo').setAttribute('aria-pressed', String(solo)); $('tabWatch').setAttribute('aria-pressed', String(!solo));
    $('lede').textContent = solo ? '크레파스로 선을 그어 내 땅을 넓혀요. 선을 긋는 동안 밟히면 아웃이니 조심!' : 'AI 친구 8마리가 땅따먹기를 해요. 화면은 1등을 따라가요';
    segBtns($('modeSeg'), MODES, opts.mode, v => { opts.mode = v; saveOpts(); drawMenu(); });
    $('modeDesc').textContent = MODE_DESC[opts.mode];
    $('tierLbl').textContent = solo ? '친구들 실력' : 'AI 실력';
    Cozy.tierCards($('tiers'), TIERS, id => { opts.tier = id; saveOpts(); drawMenu(); }, { selected: opts.tier });
    $('animalBox').hidden = !solo;
    animalBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === opts.animal)));
    $('howtoList').hidden = !solo;
    $('startBtn').textContent = solo ? '시작!' : '구경하기';
    const best = Cozy.store('land.best', {})[opts.mode + '.' + opts.tier];
    $('bestLine').textContent = solo && best ? `🏅 최고 기록 · ${best.rank}등 · ${pctStr(best.pct)}%` : '';
  }
  $('tabSolo').onclick = () => { if (opts.tab !== 'solo') sfx('tap'); opts.tab = 'solo'; saveOpts(); drawMenu(); };
  $('tabWatch').onclick = () => { if (opts.tab !== 'watch') sfx('tap'); opts.tab = 'watch'; saveOpts(); drawMenu(); };
  $('startBtn').onclick = () => start(opts.tab);
  $('helpBtn').onclick = () => howto(true);

  // ══ 판 (세션) ══════════════════════════════════════════════
  const R = window.LandRender.create($('cv'), $('mini'));
  let S = null;

  const ANIM = i => A.ANIMALS[S.animals[i]];
  const nameOf = i => i === S.me ? '나' : ANIM(i).name;
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
    const st = L.create({ n: 8, mode: opts.mode }, seed);
    const me = kind === 'solo' ? 0 : -1;
    const rest = shuffle(A.ANIMALS.map((_, i) => i).filter(i => kind !== 'solo' || i !== opts.animal));
    const animals = kind === 'solo' ? [opts.animal].concat(rest.slice(0, st.n - 1)) : rest.slice(0, st.n);
    S = {
      kind, mode: opts.mode, tier: opts.tier, seed, st, me, animals,
      ctrls: st.players.map((p, i) => i === me ? humanCtrl() : botCtrl(st, i, opts.tier, seed, me >= 0 ? [me] : [])),
      acts: new Array(st.n), acc: 0, speed: 1, ff: false,
      running: false, counting: false, paused: false, ended: false, out: false,
      timers: [], cdTimers: [], modals: [], danger: false, dangerTick: -99, followAuto: true, followTick: 0, lastSec: -1, crashKey: '',
    };
    show(true);
    R.reset(st, { me, follow: me >= 0 ? me : leader(), animals, names: st.players.map((p, i) => i === me ? '나' : A.ANIMALS[animals[i]].name) });
    $('feed').innerHTML = ''; hideMsg();
    dockFor(); syncPad(); hud(); drawRank(true);
    countdown(() => { S.running = true; });
  }
  function endSession() {
    if (!S) return;
    for (const t of S.timers) clearTimeout(t);
    for (const c of S.modals) c();
    S = null;
    $('countBox').hidden = true; $('comboPop').hidden = true; hideMsg();
    $('feed').innerHTML = ''; $('rankBox').innerHTML = '';
  }
  function goMenu() { endSession(); show(false); drawMenu(); }
  function restart() { start(S ? S.kind : opts.tab); }

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
    for (let i = 0; i < st.n; i++) acts[i] = S.ctrls[i].decide(st, i);
    R.beforeTick();
    const evs = L.step(st, acts);
    R.afterTick(evs);
    for (const e of evs) { onEvent(e); if (!S) return; }
    if (!S.ended) afterTick();
  }

  // ══ 일어난 일 → 소리 · 효과 · 알림 ══════════════════════════
  const onScreen = c => R.visible(c[0], c[1], 2);                       // 화면 안(+2칸)에서 일어난 일만 소리
  function onEvent(e) {
    const st = S.st, total = st.W * st.H;
    if (window.__land && __land.onEv) __land.onEv(e);
    if (e.t === 'capture') {
      const pct = e.n / total * 100, c = R.cellCenter(e.y * st.W + e.x);
      const watchIt = S.me < 0 || S.out ? e.p === R.follow : e.p === S.me;
      if (watchIt && !S.ff) {
        sfx('land-cap', { pct: e.p === S.me ? pct : pct * 0.7 });
        const m = R.centroid(e.cells);                                  // 새로 칠해진 곳 가운데 (내 머리를 가리지 않게)
        R.floatText(m[0], m[1], `+${pctStr(Math.max(0.1, pct))}%`, PAL[S.animals[e.p]].text, Math.min(34, 19 + pct * 2.4), e.p);
        if (e.p === S.me) { if (pct >= 1) Cozy.vibrate(pct >= 4 ? 30 : 12); if (pct >= 5) combo('🎉 크게 먹었다!'); }
      } else if (!S.ff && onScreen(c)) sfx('land-pop');
    } else if (e.t === 'death') {
      feed(e);
      if (e.p === S.me) myDeath(e);
      else if (e.by === S.me && S.me >= 0) myKill(e);
      else if (!S.ff && onScreen(R.cellCenter(e.y * st.W + e.x))) sfx('land-splat', { vol: 0.12 });
    } else if (e.t === 'spawn') {
      if (e.p === S.me) { sfx('land-spawn'); hideMsg(); S.ctrls[S.me].q.length = 0; }
    } else if (e.t === 'leave') {
      if (e.p === S.me) sfx('land-leave');
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
    S.ctrls[S.me].q.length = 0;
    S.danger = false; R.setDanger(false);
    // 알림은 철퍽 자리 반대쪽에 (터지는 모습이 가려지지 않게)
    const c = R.cellCenter(e.y * S.st.W + e.x), s = R.screenOf(c[0], c[1]), h = $('stage').clientHeight;
    $('msg').style.top = s[1] < h * 0.5 ? '68%' : '30%';
    if (S.mode === 'classic') showMsg(deathWhy(e), '2초 뒤 새 땅에서 다시 시작해요');
    else {
      S.out = true; S.followAuto = true;
      showMsg(deathWhy(e), '탈락! 남은 친구들을 구경해요');
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
    if (S.me >= 0 && (e.p === S.me || e.by === S.me || (e.w && e.w.includes(S.me)))) d.className = 'mine';
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
    setT('myPct', `${ANIM(f).em} ${pctStr(p.area / total * 100)}%`);
    const tl = $('timer');
    let tt = `⏱ ${fmtT(left)}`;
    if (S.mode === 'life') { let n = 0; for (const q of st.players) if (q.alive) n++; tt += ` · ❤️ ${n}`; }
    if (tl.textContent !== tt) tl.textContent = tt;
    tl.classList.toggle('hurry', left <= 10 && !S.ended);
  }
  function drawRank(force) {
    if (!force && performance.now() - rankDown.t < 600) return;          // 구경에서 줄을 누르는 중
    const st = S.st, rk = L.ranking(st), f = focusId(), total = st.W * st.H;
    const row = (r, i) => {
      const p = st.players[r.id], an = ANIM(r.id), cls = ['rk'];
      if (r.id === S.me) cls.push('me');
      if (!p.alive) cls.push('out');
      if (r.id === R.follow && (S.me < 0 || S.out)) cls.push('fol');
      return `<div class="${cls.join(' ')}" data-id="${r.id}"><i>${i + 1}</i><span class="dot" style="background:${PAL[S.animals[r.id]].mini}">${an.em}</span><b>${nameOf(r.id)}</b><em>${pctStr(r.area / total * 100)}</em></div>`;
    };
    // 늘 6줄 + 점선 자리 (내가 5등 안팎을 오가도 카드 크기가 그대로): 6등 밖이면 점선 + 나, 아니면 6등을 그대로
    let h = rk.slice(0, 5).map(row).join('');
    const fi = rk.findIndex(r => r.id === f);
    if (fi >= 6) h += '<div class="rk sep"></div>' + row(rk[fi], fi);
    else if (rk.length > 5) h += '<div class="rk sep ghost"></div>' + row(rk[5], 5);
    $('rankBox').innerHTML = h;
    // 위 알약(내 등수)도 같은 순위로 같이 (둘이 어긋나 보이지 않게)
    const pill = S.me >= 0 && !S.out ? `🏆 ${fi + 1}등` : `${ANIM(f).em} ${fi + 1}등`, pe = $('rankPill');
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
    hint.textContent = S.me < 0 ? '🎥 화면이 1등을 따라가요' : PC ? '⌨️ 방향키·WASD로 움직여요' : '👆 화면을 밀면 그쪽으로 돌아요';
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
    if (!S || S.ended || (S.paused && !S.counting)) return;               // 다시 시작 카운트 중에 숨겨져도 다시 멈춤
    if (S.counting) { for (const t of S.cdTimers) clearTimeout(t); S.cdTimers = []; S.counting = false; R.setHint(false); $('countBox').hidden = true; S.running = true; }
    S.paused = true;
    modal('⏸ 잠깐 멈췄어요', '<p class="lede" style="margin:0">준비되면 계속해요. 3초를 세고 다시 시작해요.</p>', [
      ['계속하기', resume, true], ['하는 법', () => { howto(true); return false; }], ['메뉴', goMenu, false, true]]);
  }
  function resume() { if (!S || !S.paused) return; countdown(() => { if (S) S.paused = false; }, true); }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.ended && (S.counting || (S.running && !S.paused))) pause(); });

  function endGame() {
    S.ended = true; S.running = false; S.ff = false;
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
    if (r.id === S.me) cls.push('me');
    if (life && !r.alive) cls.push('out');
    const tag = life ? `<small>${r.alive ? '❤️ 끝까지' : `💫 ${fmtT(r.aliveT / TPS)}`}</small>` : '';
    return `<li class="${cls.join(' ')}"><i>${medal(r.rank)}</i><span class="dot" style="background:${PAL[S.animals[r.id]].mini}">${an.em}</span><span>${nameOf(r.id)}</span><em>${tag}${pctStr(r.pct)}%</em></li>`;
  }
  function showResults() {
    const st = S.st, res = st.results;
    if (S.me < 0) {
      const w = res[0];
      modal('🏁 구경 끝!', `<div class="big">${ANIM(w.id).em} ${nameOf(w.id)}</div><p class="res-sub">${pctStr(w.pct)}% 칠하고 1등! · ✂️ ${w.kills}번 끊었어요</p><ol class="rlist">${res.map(resRow).join('')}</ol>`,
        [['한 판 더 구경', restart, true], ['메뉴', goMenu]], false, 'land-res');
      sfx('good');
      return;
    }
    const r = res.find(x => x.id === S.me);
    const life = S.mode === 'life';
    const title = life && r.rank === 1 && r.alive ? '🏆 끝까지 살아남았어요!' : r.rank <= 3 ? `${medal(r.rank)} ${r.rank}등!` : `${r.rank}등`;
    let sub = r.rank === 1 ? '땅따먹기 왕이에요! 👑' : r.rank <= 3 ? '아깝다! 조금만 더 넓게!' : '다음엔 더 넓게 칠해 봐요';
    if (!life && !r.alive) sub = '끝날 때 아웃돼 있어서 0%예요. 마지막엔 내 땅 안에 있기!';
    if (life && !r.alive) sub = `${fmtT(r.aliveT / TPS)} 동안 버텼어요. ${r.rank <= 3 ? '잘했어요!' : '다음엔 더 오래!'}`;
    // 최고 기록: 클래식은 % 먼저, 한 목숨은 등수 → 버틴 시간 → % 순. 처음 기록은 3등 안일 때만 '최고 기록!' 으로 축하
    const key = S.mode + '.' + S.tier, bests = Cozy.store('land.best', {}), old = bests[key];
    const beat = life
      ? (!old || r.rank < old.rank || (r.rank === old.rank && ((r.aliveT || 0) > (old.aliveT || 0) || ((r.aliveT || 0) === (old.aliveT || 0) && r.pct > old.pct))))
      : r.pct > 0 && (!old || r.pct > old.pct || (r.pct === old.pct && r.rank < old.rank));
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
      <ol class="rlist">${res.map(resRow).join('')}</ol>`;
    modal(title, html, [['다시 하기', restart, true], ['메뉴', goMenu]], false, 'land-res');
    if (r.rank === 1) { sfx('land-win'); Cozy.confetti(); }
    else if (r.rank <= 3) sfx('good');
    else sfx('lose');
  }

  // ══ 조작: 밀기(어디서나) · 방향키 · 둥근 방향 단추 ══════════
  // 돌았으면 true (같은 쪽 · 되돌기는 버림)
  function heading() {
    if (!S || S.me < 0) return -1;
    const q = S.ctrls[S.me].q;
    return q.length ? q[q.length - 1] : S.st.players[S.me].dir;
  }
  function steer(d) {
    if (!S || S.me < 0 || S.out || S.paused || S.ended) return false;
    const p = S.st.players[S.me];
    if (!p.alive) return false;
    const q = S.ctrls[S.me].q, lastD = q.length ? q[q.length - 1] : p.dir;
    if (d === lastD || d === ((lastD + 2) & 3)) return false;
    if (q.length >= 3) q.pop();
    q.push(d);
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
    if (e.code in KEYS) { e.preventDefault(); if (!e.repeat) steer(KEYS[e.code]); return; }
    if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Space') { e.preventDefault(); if (S.kind === 'solo' && !S.out) pause(); }
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
    const solo = S.me >= 0, watching = !solo || S.out;
    $('pauseBtn').hidden = watching;
    $('padBtn').hidden = watching;
    $('speedBtn').hidden = !watching;
    $('followBtn').hidden = solo;
    $('skipBtn').hidden = !(solo && S.out);
    $('restartBtn').lastElementChild.textContent = solo ? '처음부터' : '다시 구경';
    $('play').classList.toggle('watch', watching);
    drawSpeed();
  }
  function syncPad() {
    const on = opts.pad && S && S.me >= 0 && !S.out;
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
  howto(false);
  window.__land = {                                                     // 점검용
    get S() { return S; }, get st() { return S && S.st; }, R, opts,
    ff(n) { R.setFast(true); for (let i = 0; i < n && S && !S.ended; i++) tick(); if (S) R.setFast(S.ff); },
    steer, start, goMenu, pause, resume, restart,
  };
})();

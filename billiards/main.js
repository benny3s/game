/* 당구 — 메뉴 · 조작(겨냥·힘·당점) · 애니메이션 · 소리 · AI · 한 기기 여럿 · 친구랑(ArenaUI) · AI 선생님 (main.js) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const B = window.Billiards, AI = window.BilliardsAI, D = window.BilliardsDraw, C = window.Cozy;
  const esc = C.esc, sfx = (n, o) => C.sfx.play(n, o);
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const norm = a => ((a % TAU) + TAU) % TAU;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0] | 0; } catch (e) { return (Math.random() * 4294967296) | 0; } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── 설정 (기기에 기억)
  const KEY = 'billiards.';
  const st = (k, d) => C.store(KEY + k, d);
  const opt = {
    game: st('game', '3c'), tab: st('tab', 'ai'), tier: st('tier', 'normal'),
    targets: Object.assign({ '4gu': 80, '3c': 10, '8ball': 1 }, st('targets', {})),
    finish3c: st('finish3c', 0), guide: st('guide', 'basic'), cloth: st('cloth', 'green'),
    hotN: st('hotN', 2), hotNames: st('hotNames', []), power: st('power', 0.4), coach: st('coach', 0),
  };
  const save = k => C.save(KEY + k, opt[k]);
  const meName = () => (window.GME && GME.me && GME.me.name) || (() => { try { return localStorage.getItem('game.arena.name') || ''; } catch (e) { return ''; } })() || '나';

  const GAMES = {
    '4gu': { name: '4구', desc: '빨간 공 둘 맞히기', balls: ['#f8f5ec', '#f4c21b', '#d1142c', '#d1142c'] },
    '3c': { name: '3쿠션', desc: '쿠션 3번 뒤 두 공', balls: ['#f8f5ec', '#f4c21b', '#d1142c'] },
    '8ball': { name: '포켓볼', desc: '8볼 · 단색/줄무늬', balls: ['#f2c418', '#1f4fc4', '#151515', '#f07a12'] },
  };
  const TIER = AI.TIERS;
  const HOWTO = {
    '4gu': ['내 공(흰 공 또는 노란 공)으로 <b>빨간 공 두 개</b>를 모두 맞히면 1점(10다마), 계속 쳐요', '상대 공을 맞히면 <b>감점</b>, 못 맞히면 차례가 넘어가요', '다마 수(30·50·80…)를 10으로 나눈 만큼 먼저 치면 이겨요'],
    '3c': ['내 공으로 <b>나머지 두 공</b>을 맞히되, 두 번째 공에 닿기 전에 <b>쿠션 3번 이상</b>', '성공하면 1점 + 계속, 실패하면 차례가 넘어가요', '회전(당점)을 주면 쿠션에서 꺾이는 각이 달라져요'],
    '8ball': ['브레이크 뒤 처음 넣은 공 종류(단색 1~7 / 줄무늬 9~15)가 내 공', '내 공을 다 넣고 <b>8번 공</b>을 넣으면 승리 (먼저 넣으면 패배)', '반칙(스크래치·헛치기·남의 공 먼저)이면 상대가 <b>프리볼</b>'],
  };

  // ── 소리 (Web Audio 합성)
  C.sfx.add('clack', (t, o, S) => { const v = clamp((o.v || 1) / 2.5, 0.08, 1); S.noise(t, 0.035, { vol: 0.55 * v, type: 'highpass', f: 2600 }); S.tone(t, 2300, 0.05, { vol: 0.32 * v, f2: 1750 }); S.tone(t, 3900, 0.02, { vol: 0.14 * v }); });
  C.sfx.add('cushion', (t, o, S) => { const v = clamp((o.v || 1) / 3, 0.08, 1); S.noise(t, 0.09, { vol: 0.5 * v, type: 'lowpass', f: 520, f2: 180 }); S.tone(t, 110, 0.09, { vol: 0.3 * v, f2: 70 }); });
  C.sfx.add('pocket', (t, o, S) => { S.tone(t, 190, 0.12, { vol: 0.3, f2: 85 }); S.noise(t + 0.02, 0.2, { vol: 0.3, type: 'lowpass', f: 900, f2: 240 }); S.tone(t + 0.13, 150, 0.08, { vol: 0.16, f2: 100 }); });
  C.sfx.add('cue', (t, o, S) => { const p = o.p || 0.5; S.noise(t, 0.03, { vol: 0.3 + 0.35 * p, type: 'bandpass', f: 1500, q: 1.4 }); S.tone(t, 720, 0.045, { type: 'triangle', vol: 0.16 + 0.1 * p, f2: 420 }); });

  // ── 메뉴
  function segBtns(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }
  const targetLabel = (mode, t) => mode === '4gu' ? `${t}다마` : mode === '3c' ? `${t}점` : '';
  function drawMenu() {
    $('meChip').textContent = '👤 ' + meName();
    $('gameCards').innerHTML = Object.entries(GAMES).map(([id, g]) => `<button class="gcard" data-id="${id}" aria-pressed="${opt.game === id}"><span class="balls">${g.balls.map(c => `<i style="background:radial-gradient(circle at 35% 30%,#fff8,${c} 45%,${c})"></i>`).join('')}</span><b>${g.name}</b><span>${g.desc}</span></button>`).join('');
    document.querySelectorAll('.tabs .btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === opt.tab)));
    const tab = opt.tab;
    $('tiers').hidden = tab !== 'ai';
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: id === 'easy' ? '살살 쳐요 · 손이 떨려요' : id === 'normal' ? '동네 당구장 고수' : '수천 번 계산해요', cls: 't-' + id })), id => { opt.tier = id; save('tier'); drawMenu(); }, { selected: opt.tier });
    $('hotBox').hidden = tab !== 'hot';
    if (tab === 'hot') {
      const ns = opt.game === '8ball' ? [2, 4] : [2, 3, 4];
      if (!ns.includes(opt.hotN)) opt.hotN = 2;
      segBtns($('hotN'), ns.map(n => [n, n + '명' + (opt.game === '8ball' && n === 4 ? ' (2:2 팀)' : '')]), opt.hotN, v => { opt.hotN = +v; save('hotN'); drawMenu(); });
      const names = $('hotNames'); const cur = [...names.querySelectorAll('input')].map(i => i.value);
      names.innerHTML = Array.from({ length: opt.hotN }, (_, i) => `<input maxlength="10" data-i="${i}" placeholder="${i === 0 ? '선수 1' : '선수 ' + (i + 1)}" value="${esc(cur[i] != null ? cur[i] : (opt.hotNames[i] || (i === 0 ? meName() : '친구 ' + (i + 1))))}">`).join('');
    }
    const m = opt.game;
    $('targetRow').hidden = m === '8ball' || tab === 'friend';
    $('targetLbl').textContent = m === '4gu' ? '다마 수' : '목표 점수';
    segBtns($('targetSeg'), B.MODES[m].targets.map(t => [t, targetLabel(m, t)]), opt.targets[m], v => { opt.targets[m] = +v; save('targets'); drawMenu(); });
    $('finishRow').hidden = m !== '4gu' || tab === 'friend';
    segBtns($('finishSeg'), [[0, '그냥'], [1, '마지막은 쓰리쿠션']], opt.finish3c, v => { opt.finish3c = +v; save('finish3c'); drawMenu(); });
    segBtns($('guideSeg'), [['basic', '보통'], ['long', '길게 (초보)'], ['off', '끄기']], opt.guide, v => { opt.guide = v; save('guide'); drawMenu(); });
    segBtns($('clothSeg'), [['green', '초록'], ['blue', '파랑']], opt.cloth, v => { opt.cloth = v; save('cloth'); drawMenu(); });
    $('howto').innerHTML = HOWTO[m].map(s => `<li>${s}</li>`).join('');
    $('startBtn').textContent = tab === 'friend' ? '👥 친구랑 방 열기 · 들어가기' : tab === 'practice' ? '🎱 연습 시작' : tab === 'hot' ? '🎱 같이 시작' : `🎱 ${TIER[opt.tier].em} AI와 시작`;
  }
  $('gameCards').onclick = e => { const b = e.target.closest('.gcard'); if (!b) return; sfx('tap'); opt.game = b.dataset.id; save('game'); drawMenu(); };
  document.querySelector('.tabs').onclick = e => { const b = e.target.closest('.btn'); if (!b) return; sfx('tap'); opt.tab = b.dataset.tab; save('tab'); drawMenu(); };
  $('hotNames').addEventListener('input', () => { opt.hotNames = [...$('hotNames').querySelectorAll('input')].map(i => i.value.trim()); save('hotNames'); });
  $('meChip').onclick = () => {
    if (!window.GME || !window.Arena) return;
    Arena.init().then(() => Arena.db() && GME.pick(Arena.db(), { canClose: true })).then(() => drawMenu()).catch(() => C.toast('지금은 이름을 바꿀 수 없어요'));
  };
  $('startBtn').onclick = () => {
    sfx('pop');
    if (opt.tab === 'friend') return openFriend();
    startLocal(opt.tab);
  };
  $('rulesBtn').onclick = () => showRules(opt.game);
  $('ruleBtn').onclick = () => showRules(SES ? SES.s.mode : opt.game);

  function showRules(m) {
    sfx('tap');
    const h = {
      '4gu': `<h3>4구 (한국식)</h3><ul><li>공 4개: 흰 공·노란 공(각자 수구), 빨간 공 2개</li><li>내 수구로 <b>빨간 공 둘</b>을 다 맞히면 득점(10다마) + 계속 치기</li><li>상대 수구를 건드리면 <b>감점</b>(−10다마) 후 차례 넘김</li><li>다마 수 ÷ 10 만큼 먼저 득점하면 승리 (예: 80다마 = 8점)</li><li>'마지막은 쓰리쿠션'을 켜면 마지막 한 점은 두 번째 빨간 공 전에 쿠션 3번</li></ul>`,
      '3c': `<h3>3쿠션</h3><ul><li>공 3개: 흰 공·노란 공(각자 수구), 빨간 공</li><li>수구가 나머지 두 공을 맞히되, <b>두 번째 공 전에 쿠션 3번 이상</b> 닿아야 득점</li><li>쿠션은 첫 공 전이든 뒤든 상관없어요</li><li>득점하면 계속, 실패하면 차례 넘김 · 이닝당 평균 = 에버리지</li></ul>`,
      '8ball': `<h3>포켓볼 (8볼, 간단 규칙)</h3><ul><li>첫 샷은 헤드 스트링(점선) 뒤에서 브레이크</li><li>브레이크 뒤 오픈 테이블 → 처음 넣은 공 종류가 내 공 (단색 1~7 / 줄무늬 9~15)</li><li>내 공을 넣으면 계속, 못 넣으면 차례 넘김</li><li>반칙: 수구가 들어감(스크래치) · 아무것도 못 맞힘 · 남의 공(또는 8번)을 먼저 맞힘 · 맞힌 뒤 쿠션에 닿은 공 없음 → 상대 <b>프리볼</b>(어디든 놓기)</li><li>내 공을 다 넣고 8번을 넣으면 승리, 그 전에 8번이 들어가면 패배</li><li>4명이면 2:2 팀 (1·3번 / 2·4번)</li></ul>`,
    }[m];
    C.modal({ title: '📖 규칙', html: `<div class="rules">${h}<h3>조작</h3><ul><li>당구대를 누르고 끌면 그쪽으로 겨눠요 (멀리서 끌수록 정밀) · ◀ ▶ 로 0.1°씩</li><li>힘 막대를 끌어서 힘, 작은 흰 공을 눌러 당점(회전)</li><li>PC: ← → 겨냥(Shift 정밀) · ↑ ↓ 힘 · 스페이스 샷</li></ul></div>`, buttons: [{ label: '닫기', primary: true }], dismiss: true });
  }

  // ── 화면 전환
  function showScreen(which) {
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
    if (which === 'play') requestAnimationFrame(relayout);
  }
  function stopSession() {
    if (SES) {
      SES.alive = false;                                        // 연결(방)은 ArenaUI 가 관리 — 여기서는 이 판이 붙인 듣기·타이머·창만 정리
      clearInterval(SES.shotT);
      (SES.netOffs || []).splice(0).forEach(f => { try { f(); } catch (e) {} });
      if (SES.goneAsk) { try { SES.goneAsk.close(); } catch (e) {} SES.goneAsk = null; }
    }
    SES = null; $('resBox').hidden = true;
    $('sub').classList.remove('myturn');
    if (coachP) coachP.hide();
  }
  function goHome() { stopSession(); showScreen('home'); drawMenu(); }
  C.backGuard($('backBtn'), () => {
    sfx('tap');
    if (SES && SES.kind === 'online' && window.ArenaUI) { ArenaUI.leave(); }
    goHome();
  });

  // ── 판 시작 (혼자 연습 · AI · 한 기기 여럿)
  let SES = null;
  function newSes(o) {
    return Object.assign({
      alive: true, aim: { angle: 0, power: opt.power, spinX: 0, spinY: 0 }, place: null, anim: null, sinking: [], last: null, undo: [],
      no: 0, coachTok: 0, coachRes: null, aiBusy: false, guideKey: '', guide: null, pr: { tries: 0, ok: 0, run: 0, best: 0 }, remoteAim: null, waiting: false,
      gid: 0, wins: {}, rdy: new Set(), pick: {}, netOffs: [], shotLeft: null, goneAsk: null,   // 친구랑: 판 번호 · 이긴 횟수(uid별) · 준비한 사람 · 방장이 고른 구경꾼
    }, o);
  }
  function startLocal(kind) {
    stopSession();
    const mode = opt.game;
    let seats;
    if (kind === 'practice') seats = [{ name: meName(), em: '🙂', ctrl: 'me' }];
    else if (kind === 'ai') seats = [{ name: meName(), em: '🙂', ctrl: 'me' }, { name: `${TIER[opt.tier].em} ${TIER[opt.tier].name} AI`, em: TIER[opt.tier].em, ctrl: 'ai', tier: opt.tier }];
    else {
      const names = [...$('hotNames').querySelectorAll('input')].map((i, k) => i.value.trim() || ('선수 ' + (k + 1)));
      seats = names.slice(0, opt.hotN).map(n => ({ name: n, em: '🙂', ctrl: 'me' }));
    }
    const s = B.create({ mode, players: seats.length, target: opt.targets[mode], finish3c: !!opt.finish3c, seed: rand32(), practice: kind === 'practice' });
    SES = newSes({ kind, mode, s, seats, coachAllowed: true });
    SES.coachOn = !!opt.coach;
    enterPlay();
    C.howto('billiards', '🎱 당구 하는 법', ['당구대를 <b>누르고 끌면</b> 그쪽으로 겨눠요 (공에서 멀리 끌수록 정밀해요)', '<b>힘 막대</b>를 끌고, 작은 흰 공을 눌러 <b>당점(회전)</b>을 골라요', '<b>샷!</b> 을 누르면 쳐요 · 🔁 다시 보기로 방금 샷을 천천히 볼 수 있어요', '🧑‍🏫 <b>AI 선생님</b>을 켜면 추천 샷과 까닭을 알려 줘요']);
  }
  function enterPlay() {
    showScreen('play');
    const s = SES.s;
    V.resetOrient(s.balls.length);
    relayout();
    setupTools();
    startTurn();
  }

  // ── 그리기 준비
  const cv = $('cv'), V = D.create(cv);
  function relayout() {
    if (!SES || !SES.s) return;
    const land = innerWidth > innerHeight * 1.1;
    document.body.classList.toggle('land', land);
    const short = land && innerHeight < 520;
    document.body.classList.toggle('short', short);
    // 낮은 가로 화면: 점수판을 조작판 맨 위로 옮김
    const bd = $('board');
    if (short && bd.parentNode !== $('ctl')) $('ctl').prepend(bd);
    else if (!short && bd.parentNode !== $('play')) $('play').insertBefore(bd, $('arena'));
    const r = $('stage').getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    V.layout(SES.s.table, SES.s.mode, Math.floor(r.width), Math.floor(r.height), opt.cloth);
    SES.guideKey = '';
    D.drawSpinPad($('spin'), SES.aim.spinX, SES.aim.spinY);
  }
  addEventListener('resize', () => requestAnimationFrame(relayout));
  if (window.ResizeObserver) new ResizeObserver(() => relayout()).observe($('stage'));

  // ── 차례
  const seatOf = () => SES.seats[SES.s.turn];
  const myTurn = () => SES && SES.s && SES.s.phase === 'play' && !SES.anim && !SES.aiBusy && !SES.waiting && seatOf() && seatOf().ctrl === 'me';
  function defaultAim() {
    const s = SES.s, cue = B.cueOf(s, s.turn), c = s.balls[cue];
    let tgt = [];
    if (s.mode === '8ball') {
      const g = s.groups[B.teamOf(s, s.turn)];
      for (let i = 1; i < 16; i++) if (s.balls[i].on && (g == null ? i !== 8 : (B.remainingOf(s, g) === 0 ? i === 8 : B.groupOf(i) === g))) tgt.push(i);
    } else tgt = s.mode === '4gu' ? [2, 3] : [1 - cue, 2];
    let best = null, bd = 1e9;
    for (const i of tgt) { const b = s.balls[i]; const d = Math.hypot(b.x - c.x, b.y - c.y); if (d < bd) { bd = d; best = b; } }
    if (best) SES.aim.angle = norm(Math.atan2(best.y - c.y, best.x - c.x));
    SES.aim.spinX = 0; SES.aim.spinY = 0;
    D.drawSpinPad($('spin'), 0, 0);
  }
  function startTurn() {
    if (!SES || !SES.alive) return;
    const s = SES.s;
    SES.coachRes = null; SES.guideKey = ''; SES.remoteAim = null;
    shotTimer();
    updateHud();
    if (s.phase !== 'play') return;
    const cue = B.cueOf(s, s.turn);
    SES.place = s.ballInHand ? B.fixPlace(s, s.balls[cue].x, s.balls[cue].y) : null;
    const seat = seatOf();
    const turnChanged = SES.lastTurn !== s.turn;
    if (seat.ctrl === 'ai' && (SES.kind !== 'online' || SES.role === 'host')) { SES.lastTurn = s.turn; renderCoach(); aiTurn(); return; }
    if (seat.ctrl === 'me') {
      defaultAim();
      if (SES.kind === 'online' && turnChanged) { sfx('pop'); Cozy.vibrate(40); }   // 친구랑: 내 차례가 오면 짧게 알림
      if (SES.seats.length > 1 && SES.kind === 'hot' && SES.lastTurn !== s.turn) flash(`${seat.name} 차례예요`);
      else if (s.ballInHand) flash(s.kitchen ? '수구를 점선 뒤에 놓고 브레이크!' : '프리볼 · 수구를 끌어서 놓아요');
      requestCoach();
    }
    SES.lastTurn = s.turn;
    if (turnChanged && seat.ctrl !== 'me') renderCoach();
    updateHud();
  }

  // ── AI 차례
  async function aiTurn() {
    const ses = SES; ses.aiBusy = true; updateHud();
    const seat = seatOf();
    const t0 = performance.now();
    const act = await AI.chooseAsync(ses.s, seat.tier || 'normal', { seed: rand32() });
    if (!ses.alive || SES !== ses) return;
    const wait = 650 - (performance.now() - t0); if (wait > 0) await sleep(wait);
    // 겨냥하는 모습 (큐가 돌아감)
    if (act.place) ses.place = act.place;
    const a0 = ses.aim.angle, p0 = ses.aim.power;
    let da = norm(act.angle - a0); if (da > Math.PI) da -= TAU;
    const T = 600, start = performance.now();
    await new Promise(res => { const f = () => { const k = Math.min(1, (performance.now() - start) / T), e = k * k * (3 - 2 * k); ses.aim.angle = norm(a0 + da * e); ses.aim.power = p0 + (act.power - p0) * e; ses.aim.spinX = act.spinX * e; ses.aim.spinY = act.spinY * e; aiAimOut(ses); if (k < 1 && ses.alive) requestAnimationFrame(f); else res(); }; f(); });
    await sleep(250);
    if (!ses.alive || SES !== ses) return;
    ses.aiBusy = false;
    shoot(act);
  }

  // 방장이 돌리는 AI 의 겨냥도 친구·구경꾼 화면에 (0.1초마다)
  let aiAimT = 0;
  function aiAimOut(ses) {
    if (ses.kind !== 'online' || ses.role !== 'host') return;
    const now = performance.now(); if (now - aiAimT < 100) return; aiAimT = now;
    ses.net.broadcast({ t: 'aim', angle: ses.aim.angle, power: ses.aim.power, spinX: ses.aim.spinX, spinY: ses.aim.spinY, place: ses.s.ballInHand ? ses.place : null });
  }

  // ── 샷
  function currentAction() {
    const a = { angle: SES.aim.angle, power: SES.aim.power, spinX: SES.aim.spinX, spinY: SES.aim.spinY };
    if (SES.s.ballInHand && SES.place) a.place = SES.place.slice();
    return a;
  }
  function shoot(act) {
    if (!SES || SES.anim) return;
    const s = SES.s;
    if (SES.kind === 'online') stopShotTimer();
    if (SES.kind === 'online' && SES.role === 'guest') {
      SES.waiting = true; updateHud();
      SES.net.send({ t: 'shot', a: act, no: SES.no, gid: SES.gid }, true);     // 샷은 꼭 도착하게 (rel)
      setTimeout(() => { if (SES && SES.waiting) { SES.waiting = false; updateHud(); } }, 8000);
      return;
    }
    if (SES.kind === 'practice') { SES.undo.push(B.clone(s)); if (SES.undo.length > 40) SES.undo.shift(); }
    const res = B.applyShot(s, act);
    if (SES.kind === 'online') {
      SES.no++;
      if (res.state.phase === 'end') bumpWins(res.state);
      const msg = { t: 'res', gid: SES.gid, no: SES.no, a: act, traj: B.packTraj(res.sim), s: res.state, result: res.result, wins: SES.wins };
      SES.net.broadcast(msg, true);
      publishSnap(res.state);
    }
    playShot(s, res.sim, act, an => afterShot(res, an));
  }
  function playShot(before, traj, act, done) {
    const ses = SES;
    ses.anim = { before, frames: traj.frames, fps: traj.fps, events: traj.events, cue: traj.cue, act, start: performance.now() + 200, ei: 0, done, speed: 1, stroke: true };
    ses.sinking = [];
    ses.coachRes = null; renderCoach();
    Cozy.vibrate(12);
    updateHud();
  }
  function afterShot(res, an) {
    const ses = SES; if (!ses) return;
    if (an) ses.last = { before: an.before, traj: { frames: an.frames, fps: an.fps, events: an.events, cue: an.cue }, act: an.act };
    ses.anim = null;
    ses.s = res.state;
    const r = res.result || {};
    const s = ses.s;
    if (ses.kind === 'practice') {
      ses.pr.tries++;
      const good = s.mode === '8ball' ? r.cont && !r.foul : r.score > 0;
      if (good) { ses.pr.ok++; ses.pr.run++; ses.pr.best = Math.max(ses.pr.best, ses.pr.run); } else ses.pr.run = 0;
    }
    // 점수 알림
    if (r.win) { pop(s.mode === '8ball' ? '🎱 8번 성공!' : '🏆 승리!', 'good big'); sfx('win'); C.confetti(); }
    else if (r.lose) { pop('8번 공 · 패배', 'bad'); sfx('lose'); }
    else if (r.foul) { pop(s.mode === '8ball' ? '반칙 · 프리볼' : '감점 −10', 'bad'); sfx('bad'); }
    else if ((r.score || 0) > 0 || r.cont) {
      const run = s.mode === '8ball' ? s.run : (ses.kind === 'practice' ? ses.pr.run : s.run);
      const txt = s.mode === '3c' ? `${r.cushions || 3}쿠션 성공!` : s.mode === '4gu' ? '+10 득점!' : (r.score > 1 ? `${r.score}개 쏙!` : '쏙!');
      pop(run >= 3 ? `${txt} · ${run}연속` : txt, 'good' + (run >= 3 ? ' big' : ''));
      sfx('good');
    }
    flash(r.msg || '', 2600);
    updateHud();
    if (s.phase === 'end') { const g0 = ses.gid; stopShotTimer(); setTimeout(() => { if (SES === ses && ses.gid === g0) showResult(); }, 900); return; }
    startTurn();
  }

  // ── 다시 보기 · 되돌리기 · 공 옮기기 · 처음 배치
  function setupTools() {
    const pr = SES.kind === 'practice';
    $('undoBtn').hidden = !pr; $('moveBtn').hidden = !pr;
    $('rackBtn').hidden = !pr;
    $('moveBtn').setAttribute('aria-pressed', 'false'); SES.moveMode = false;
    $('coachBtn').hidden = !SES.coachAllowed;
    $('coachBtn').setAttribute('aria-pressed', String(!!SES.coachOn));
    $('guideBtn').setAttribute('aria-pressed', String(opt.guide !== 'off'));
    $('guideBtn').querySelector('span:last-child').textContent = opt.guide === 'long' ? '선 길게' : opt.guide === 'off' ? '선 끔' : '겨냥 선';
    if (SES.coachOn && SES.coachAllowed) coach().show(); else if (coachP) coachP.hide();
  }
  $('replayBtn').onclick = () => {
    if (!SES || !SES.last || SES.anim) return;
    sfx('tap');
    const L = SES.last;
    SES.anim = { before: L.before, frames: L.traj.frames, fps: L.traj.fps, events: L.traj.events, cue: L.traj.cue, act: L.act, start: performance.now() + 250, ei: 0, speed: 0.55, replay: true, stroke: true, done: () => { SES.anim = null; updateHud(); } };
    SES.sinking = [];
    flash('🔁 다시 보기 (천천히)', 1500);
    updateHud();
  };
  $('undoBtn').onclick = () => {
    if (!SES || SES.anim || !SES.undo.length) return;
    sfx('tap'); SES.s = SES.undo.pop(); SES.last = null; startTurn();
  };
  $('rackBtn').onclick = () => {
    if (!SES || SES.anim) return;
    sfx('tap'); SES.undo.push(B.clone(SES.s));
    const s = SES.s; const fresh = B.create({ mode: s.mode, players: 1, seed: rand32(), practice: true });
    SES.s = fresh; startTurn();
  };
  $('moveBtn').onclick = () => {
    if (!SES) return; sfx('tap'); SES.moveMode = !SES.moveMode;
    $('moveBtn').setAttribute('aria-pressed', String(SES.moveMode));
    flash(SES.moveMode ? '공을 끌어서 원하는 자리에 놓아요' : '공 옮기기 끝', 1800);
  };
  $('guideBtn').onclick = () => {
    sfx('tap'); opt.guide = opt.guide === 'basic' ? 'long' : opt.guide === 'long' ? 'off' : 'basic'; save('guide');
    if (SES) { SES.guideKey = ''; setupTools(); }
    flash(opt.guide === 'long' ? '겨냥 선: 길게 (수구 길 전체)' : opt.guide === 'off' ? '겨냥 선: 끔' : '겨냥 선: 보통', 1500);
  };
  $('coachBtn').onclick = () => {
    if (!SES || !SES.coachAllowed) return;
    sfx('tap'); SES.coachOn = !SES.coachOn;
    if (SES.kind !== 'online') { opt.coach = SES.coachOn ? 1 : 0; save('coach'); }
    $('coachBtn').setAttribute('aria-pressed', String(SES.coachOn));
    if (SES.coachOn) { coach().show(); coach().collapse(false); requestCoach(); } else if (coachP) coachP.hide();
  };
  C.sfx.button($('sndBtn'));

  // ── 조작: 겨냥 · 힘 · 당점
  let drag = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => {
    if (!SES || SES.anim) return;
    const [sx, sy] = pt(e), [wx, wy] = V.toW(sx, sy), s = SES.s, R = B.TABLES[s.table].R;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    if (SES.moveMode) {
      let bi = -1, bd = 3.2 * R;
      s.balls.forEach((b, i) => { if (!b.on) return; const d = Math.hypot(b.x - wx, b.y - wy); if (d < bd) { bd = d; bi = i; } });
      if (bi >= 0) { SES.undo.push(B.clone(s)); drag = { kind: 'ball', i: bi, id: e.pointerId }; }
      return;
    }
    if (!myTurn()) return;
    const cue = B.cueOf(s, s.turn), cp = SES.place || [s.balls[cue].x, s.balls[cue].y];
    if (s.ballInHand && Math.hypot(cp[0] - wx, cp[1] - wy) < 3.5 * R) { drag = { kind: 'place', id: e.pointerId }; return; }
    drag = { kind: 'aim', id: e.pointerId };
    aimAt(wx, wy);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || !SES) return;
    const [sx, sy] = pt(e), [wx, wy] = V.toW(sx, sy), s = SES.s, T = B.TABLES[s.table];
    if (drag.kind === 'aim') aimAt(wx, wy);
    else if (drag.kind === 'place') { SES.place = [clamp(wx, T.R, s.kitchen ? T.L / 4 : T.L - T.R), clamp(wy, T.R, T.W - T.R)]; SES.guideKey = ''; sendAim(); }
    else if (drag.kind === 'ball') { const b = s.balls[drag.i]; b.x = clamp(wx, T.R, T.L - T.R); b.y = clamp(wy, T.R, T.W - T.R); SES.guideKey = ''; }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id || !SES) return;
    const s = SES.s;
    if (drag.kind === 'place') { SES.place = B.fixPlace(s, SES.place[0], SES.place[1]); requestCoach(); }
    if (drag.kind === 'ball') {
      // 다른 공과 겹치면 살짝 비켜 놓음
      const R = B.TABLES[s.table].R, b = s.balls[drag.i];
      for (let k = 0; k < 40; k++) {
        const o = s.balls.find((c, j) => j !== drag.i && c.on && Math.hypot(c.x - b.x, c.y - b.y) < 2 * R + 0.001);
        if (!o) break; const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1; b.x = o.x + dx / d * (2 * R + 0.002); b.y = o.y + dy / d * (2 * R + 0.002);
      }
      SES.coachRes = null; requestCoach();
    }
    if (drag.kind === 'aim') requestCoachSoon();
    drag = null;
  };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', e => { if (!myTurn()) return; e.preventDefault(); turnAim((e.deltaY > 0 ? 1 : -1) * (e.shiftKey ? 0.02 : 0.1)); }, { passive: false });
  function cuePos() { const s = SES.s, c = s.balls[B.cueOf(s, s.turn)]; return SES.place && s.ballInHand ? SES.place : [c.x, c.y]; }
  function aimAt(wx, wy) {
    const [cx, cy] = cuePos();
    if (Math.hypot(wx - cx, wy - cy) < 0.01) return;
    SES.aim.angle = norm(Math.atan2(wy - cy, wx - cx));
    sendAim();
  }
  // 화면 기준으로 시계 방향(+)
  // 두 화면 방향 모두 당구대 각도가 줄면 화면에서 시계 방향
  function turnAim(deg) { SES.aim.angle = norm(SES.aim.angle - deg * DEG); sendAim(); }
  function holdRepeat(btn, fn) {
    let t = null, n = 0;
    const stop = () => { clearTimeout(t); t = null; };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); n = 0; const go = () => { fn(n++); t = setTimeout(go, n < 2 ? 320 : n < 12 ? 70 : 40); }; go(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  }
  holdRepeat($('fineL'), n => { if (myTurn()) turnAim(-(n > 14 ? 0.4 : 0.1)); });
  holdRepeat($('fineR'), n => { if (myTurn()) turnAim(n > 14 ? 0.4 : 0.1); });

  // 힘 막대
  const pw = $('power');
  let pwDrag = null;
  const setPow = e => { const r = pw.getBoundingClientRect(); SES.aim.power = clamp((e.clientX - r.left) / r.width, 0.03, 1); opt.power = SES.aim.power; sendAim(); };
  pw.addEventListener('pointerdown', e => { if (!myTurn()) return; pwDrag = e.pointerId; try { pw.setPointerCapture(e.pointerId); } catch (_) {} setPow(e); });
  pw.addEventListener('pointermove', e => { if (pwDrag === e.pointerId) setPow(e); });
  const pwEnd = e => { if (pwDrag === e.pointerId) { pwDrag = null; save('power'); requestCoachSoon(); } };
  pw.addEventListener('pointerup', pwEnd); pw.addEventListener('pointercancel', pwEnd);

  // 당점
  const sp = $('spin');
  let spDrag = null;
  const setSpin = e => {
    const r = sp.getBoundingClientRect(), rad = Math.min(r.width, r.height) / 2 - 3;
    let x = (e.clientX - r.left - r.width / 2) / (rad * 0.82), y = -(e.clientY - r.top - r.height / 2) / (rad * 0.82);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    if (Math.abs(x) < 0.07) x = 0; if (Math.abs(y) < 0.07) y = 0;
    SES.aim.spinX = x; SES.aim.spinY = y; D.drawSpinPad(sp, x, y); sendAim();
  };
  sp.addEventListener('pointerdown', e => { if (!myTurn()) return; spDrag = e.pointerId; try { sp.setPointerCapture(e.pointerId); } catch (_) {} setSpin(e); });
  sp.addEventListener('pointermove', e => { if (spDrag === e.pointerId) setSpin(e); });
  const spEnd = e => { if (spDrag === e.pointerId) { spDrag = null; requestCoachSoon(); } };
  sp.addEventListener('pointerup', spEnd); sp.addEventListener('pointercancel', spEnd);
  sp.addEventListener('dblclick', () => { if (!myTurn()) return; SES.aim.spinX = SES.aim.spinY = 0; D.drawSpinPad(sp, 0, 0); });

  $('shootBtn').onclick = () => { if (!myTurn()) return; sfx('tap'); shoot(currentAction()); };
  addEventListener('keydown', e => {
    if (!SES || $('play').hidden || e.target.closest('input,textarea')) return;
    if (!myTurn()) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); turnAim((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 0.05 : 0.5)); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); SES.aim.power = clamp(SES.aim.power + (e.key === 'ArrowUp' ? 0.02 : -0.02), 0.03, 1); opt.power = SES.aim.power; sendAim(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot(currentAction()); }
  });

  function spinText(sx, sy) {
    const p = [];
    if (Math.abs(sx) >= 0.12) p.push(`${sx > 0 ? '오른쪽' : '왼쪽'} ${Math.min(3, Math.max(1, Math.round(Math.abs(sx) * 3)))}팁`);
    if (sy >= 0.15) p.push(sy > 0.6 ? '강한 밀어치기' : '밀어치기'); else if (sy <= -0.15) p.push(sy < -0.6 ? '강한 끌어치기' : '끌어치기');
    return p.length ? p.join(' · ') : '중앙';
  }

  // ── 화면 위 글 (점수판 · 막대)
  function updateHud() {
    if (!SES) return;
    const s = SES.s, seat = seatOf(), need = B.needPoints(s);
    const kindName = { practice: '혼자 연습', ai: 'AI와 대결', hot: '여럿이', online: '친구랑' }[SES.kind];
    $('lbl').textContent = `${B.MODES[s.mode].name} · ${kindName}${SES.kind === 'online' && SES.net ? ' ' + SES.net.code : ''}`;
    let sub = '';
    if (s.phase === 'end') sub = '경기 끝';
    else if (SES.anim) sub = SES.anim.replay ? '다시 보기' : '굴러가는 중…';
    else if (SES.aiBusy) sub = `${seat.name} 생각 중…`;
    else if (SES.waiting) sub = '방장에게 보내는 중…';
    else sub = SES.kind === 'practice' ? (s.ballInHand ? '프리볼' : '마음껏 쳐 보세요') : `${SES.kind === 'online' && seat.ctrl === 'me' ? '내 차례!' : sname(seat) + ' 차례'}${s.ballInHand ? ' · 프리볼' : ''}${s.run ? ` · ${s.run}연속` : ''}`;
    if (SES.kind === 'online' && SES.shotLeft != null && s.phase === 'play' && !SES.anim) sub += ` · ⏱${SES.shotLeft}`;   // 친구랑: 30초 안에 쳐요
    if (SES.kind === 'online' && SES.spectator) sub = '👀 구경 중 · ' + sub;
    $('sub').textContent = sub;
    if (s.mode === '8ball') {
      const g = s.groups[B.teamOf(s, s.turn)];
      $('pill').textContent = g ? (g === 'solid' ? '● 단색' : '◐ 줄무늬') : '오픈 테이블';
    } else if (SES.kind === 'practice') $('pill').textContent = `${SES.pr.ok}/${SES.pr.tries}`;
    else $('pill').textContent = `이닝 ${Math.max(...s.innings)}`;
    // 점수판
    let html = '';
    if (SES.kind === 'practice') {
      html = `<div class="chip turn"><span class="dot" style="background:${s.mode === '8ball' ? '#f7f3e8' : '#f8f5ec'}"></span><b>${esc(SES.seats[0].name)}</b><span class="n">${SES.pr.ok}<small> 성공 / ${SES.pr.tries}번</small></span></div><div class="chip"><b>연속</b><span class="n">${SES.pr.run}<small> · 최고 ${SES.pr.best}</small></span></div>`;
    } else {
      html = SES.seats.map((p, i) => {
        let dot = '', n = '';
        if (s.mode === '8ball') { const g = s.groups[B.teamOf(s, i)]; dot = `<span class="dot ${g || 'open'}"></span>`; n = g ? `${B.remainingOf(s, g)}<small>개 남음</small>` : '<small>오픈</small>'; }
        else {
          dot = `<span class="dot" style="background:${i % 2 ? '#f4c21b' : '#f8f5ec'}"></span>`;
          n = s.mode === '4gu' ? `${s.scores[i] * 10}<small>/${s.target}</small>` : `${s.scores[i]}<small>/${need}</small>`;
        }
        const w = SES.kind === 'online' && p.uid ? SES.wins[p.uid] || 0 : 0;      // 친구랑: 이 방에서 이긴 횟수
        return `<div class="chip ${i === s.turn && s.phase === 'play' ? 'turn' : ''}${p.sub ? ' sub' : ''}">${dot}<b>${esc(sname(p))}</b>${w ? `<span class="wn">🏆${w}</span>` : ''}<span class="n">${n}</span></div>`;
      }).join('');
      const wc = watcherCount();
      if (wc) html += `<div class="chip eye"><b>👀 구경 ${wc}</b></div>`;
    }
    $('board').innerHTML = html;
    const on = myTurn();
    $('sub').classList.toggle('myturn', SES.kind === 'online' && on);     // 내 차례: 금색으로 깜빡
    $('ctl').classList.toggle('off', !on);
    $('shootBtn').disabled = !on;
    $('replayBtn').disabled = !SES.last || !!SES.anim;
    $('undoBtn').disabled = !SES.undo.length || !!SES.anim;
  }
  const sname = x => x.name + (x.sub ? ' 🤖' : '');                  // AI 가 대신 치는 자리는 🤖
  // 구경하는 사람 수 (방에는 있는데 자리가 없는 사람)
  function watcherCount() {
    if (!SES || SES.kind !== 'online' || !SES.net) return 0;
    return Object.keys(SES.net.players || {}).filter(u => !SES.seats.some(x => x.uid === u)).length;
  }
  let flashT = null;
  function flash(msg, ms) {
    const el = $('msgline'); if (!msg) { el.hidden = true; return; }
    el.textContent = msg; el.hidden = false; clearTimeout(flashT); flashT = setTimeout(() => { el.hidden = true; }, ms || 2200);
  }
  let popT = null;
  function pop(txt, cls) {
    const el = $('pop'); el.textContent = txt; el.className = 'combo ' + (cls || ''); el.hidden = false;
    void el.offsetWidth; el.classList.add('go'); clearTimeout(popT); popT = setTimeout(() => { el.hidden = true; }, 1150);
  }

  // ── 결과
  function showResult() {
    if (!SES) return;
    const s = SES.s, w = s.winner;
    const mine = SES.seats[w] && SES.seats[w].ctrl === 'me' && SES.kind !== 'hot';
    let title = s.mode === '8ball' && SES.seats.length === 4 ? `🏆 ${s.winTeam === 0 ? '1·3번' : '2·4번'} 팀 승리!` : `🏆 ${SES.seats[w] ? SES.seats[w].name : ''} 승리!`;
    if (mine) title = '🎉 이겼어요!';
    else if (SES.kind === 'ai' && w !== 0) title = '😿 AI가 이겼어요';
    const rows = SES.seats.map((p, i) => {
      const avg = s.innings[i] ? (s.scores[i] / s.innings[i]).toFixed(3) : '0.000';
      const win = s.mode === '8ball' ? B.teamOf(s, i) === s.winTeam : i === w;
      const wn = SES.kind === 'online' && p.uid && SES.wins[p.uid] ? ` <small>(방 전적 ${SES.wins[p.uid]}승)</small>` : '';
      return `<tr class="${win ? 'win' : ''}"><td>${win ? '🏆 ' : ''}${esc(sname(p))}${wn}</td>${s.mode === '8ball' ? '' : `<td class="n">${s.mode === '4gu' ? s.scores[i] * 10 + '다마' : s.scores[i] + '점'}</td><td class="n">에버 ${avg}</td><td class="n">하이런 ${s.high[i]}</td>`}</tr>`;
    }).join('');
    $('resTitle').textContent = title;
    $('resBody').innerHTML = `<table class="brk">${rows}</table><p class="small" style="margin:8px 0 0">${esc(s.last && s.last.result ? s.last.result.msg : '')}</p>`;
    const btns = $('resBtns'); btns.innerHTML = '';
    const add = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); fn(); }; btns.appendChild(b); return b; };
    if (SES.kind === 'online') {
      // 판 사이: 손님은 '✋ 준비', 방장은 다 준비되면 다음 판 시작 (혼자 다시 시작하지 못함) · 구경꾼은 방장이 체크하면 다음 판부터 같이
      const ses = SES, host = ses.role === 'host', myId = ses.net.uid;
      const rb = document.createElement('div'); rb.className = 'rdy'; $('resBody').appendChild(rb);
      let nb, fb = null;
      if (host) {
        nb = add('다음 판 시작 ▶', 'primary', hostNext);
        fb = add('안 기다리고 시작', '', hostNext);
        add('대기실로', '', () => { $('resBox').hidden = true; ArenaUI.toLobby(); });
      } else nb = add('✋ 준비', 'primary', () => { ses.rdy.add(myId); ses.net.send({ t: 'rdy', gid: ses.gid }, true); ses.drawReady(); });
      add('나가기', '', () => { ArenaUI.leave(); goHome(); });
      ses.drawReady = () => {
        if (!rb.isConnected || SES !== ses) return;
        const pl = ses.net.players || {};
        const row = ses.seats.filter(x => x.uid).map(x => {
          if (x.uid === (ses.net.meta || {}).host) return `<span class="ok">👑 ${esc(x.name)}${x.uid === myId ? ' (나)' : ''}</span>`;
          const gone = !pl[x.uid], ok = ses.rdy.has(x.uid);
          return `<span class="${ok ? 'ok' : gone ? 'gone' : ''}">${ok ? '✅' : gone ? '🔌' : '⏳'} ${esc(x.name)}${x.uid === myId ? ' (나)' : ''}</span>`;
        });
        const watchers = Object.keys(pl).filter(u => !ses.seats.some(x => x.uid === u));
        const wl = watchers.map(u => {
          const nm = esc((pl[u] || {}).name || '친구'), hand = ses.rdy.has(u) ? ' ✋' : '';
          return host ? `<label><input type="checkbox" data-pick="${esc(u)}" ${ses.pick[u] ? 'checked' : ''}> ${nm}${hand}</label>` : `<span>${nm}${hand}${ses.pick[u] ? ' ✔' : ''}</span>`;
        }).join('');
        rb.innerHTML = `<div class="rdy-row">${row.join('')}</div>${watchers.length ? `<div class="rdy-w">👀 구경 ${watchers.length}명${host ? ' · 체크하면 다음 판부터 같이' : ''}: ${wl}</div>` : ''}`;
        if (host) {
          const need = ses.seats.filter(x => x.uid && x.uid !== myId && pl[x.uid]), k = need.filter(x => ses.rdy.has(x.uid)).length, all = k === need.length;
          nb.disabled = !all; nb.textContent = all ? '다음 판 시작 ▶' : `다음 판 시작 (준비 ${k}/${need.length})`;
          fb.hidden = all;
          rb.querySelectorAll('[data-pick]').forEach(c => c.onchange = () => { ses.pick[c.dataset.pick] = c.checked; sendRdy(ses); });
        } else {
          const on = ses.rdy.has(myId), seated = ses.seats.some(x => x.uid === myId);
          nb.disabled = on; nb.textContent = on ? '✅ 준비 완료 · 방장을 기다려요' : seated ? '✋ 준비' : '✋ 다음 판에 낄래요';
        }
      };
      ses.drawReady();
    } else {
      add('한 판 더', 'primary', () => { $('resBox').hidden = true; const k = SES.kind; startLocal(k); });
      add('메뉴', '', () => goHome());
    }
    $('resBox').hidden = false;
  }

  // ── AI 선생님 (common/coach.js 가 있으면 그 창, 없으면 간단한 창)
  let coachP = null;
  function coach() {
    if (coachP) return coachP;
    // 세로 화면: 당구대 위쪽 / 가로 화면: 조작판 왼쪽 아래 (끌어서 옮기면 그 자리를 기억)
    const land = innerWidth > innerHeight * 1.1;
    if (window.CoachPanel) coachP = CoachPanel.create({ game: 'billiards', title: 'AI 선생님', startHidden: true, bottom: land ? 10 : Math.max(150, innerHeight - 330), right: land ? 210 : 10 });
    else {
      const el = document.createElement('section'); el.className = 'cpn'; el.style.cssText = 'position:fixed;right:10px;bottom:150px;z-index:17;width:min(320px,86vw);background:var(--card);border:1.5px solid var(--coach);border-radius:16px;padding:8px 11px;font-size:13px';
      el.innerHTML = '<b>🧑‍🏫 AI 선생님</b><div class="cpn-body"></div>'; el.hidden = true; document.body.appendChild(el);
      const body = el.querySelector('.cpn-body');
      coachP = { el, body, set(h) { body.innerHTML = h; return this; }, show() { el.hidden = false; return this; }, hide() { el.hidden = true; return this; }, collapse() { return this; }, get visible() { return !el.hidden; } };
    }
    coachP.body.addEventListener('click', e => {
      const b = e.target.closest('[data-apply]'); if (!b || !SES || !SES.coachRes || !myTurn()) return;
      const a = SES.coachRes.action; sfx('pop');
      SES.aim.angle = a.angle; SES.aim.power = a.power; SES.aim.spinX = a.spinX; SES.aim.spinY = a.spinY;
      if (a.place && SES.s.ballInHand) SES.place = a.place.slice();
      D.drawSpinPad($('spin'), a.spinX, a.spinY); sendAim();
    });
    return coachP;
  }
  let coachSoonT = null;
  function requestCoachSoon() { /* 겨냥만 바꿔서는 다시 계산하지 않음 (추천은 공 자리마다 한 번) */ }
  function requestCoach() {
    if (!SES || !SES.coachOn || !SES.coachAllowed || !myTurn()) { renderCoach(); return; }
    if (SES.coachRes) { renderCoach(); return; }
    const tok = ++SES.coachTok, ses = SES;
    coach().set('🧑‍🏫 여러 샷을 미리 쳐 보는 중…');
    clearTimeout(coachSoonT);
    coachSoonT = setTimeout(() => {
      const s = B.clone(ses.s);
      if (s.ballInHand && ses.place) { /* 프리볼은 선생님이 자리도 골라 줌 */ }
      AI.coachAsync(s).then(res => { if (ses !== SES || tok !== ses.coachTok) return; ses.coachRes = res; renderCoach(); });
    }, 120);
  }
  const ballName = (s, i) => s.mode === '8ball' ? `${i}번 공` : i === 3 ? '빨간 공(둘째)' : B.CAROM_NAMES[i];
  function thickLabel(t) { return t >= 0.85 ? '정면(두껍게)' : t >= 0.62 ? '3/4 두께' : t >= 0.4 ? '1/2 두께' : t >= 0.2 ? '1/4 두께' : '아주 얇게'; }
  function pocketName(pk) {
    const gm = B.geom(SES.s.table), p = gm.pockets[pk]; if (!p) return '';
    const [sx, sy] = V.toS(p.x, p.y), cx = V.V.cx, cy = V.V.cy, side = pk === 1 || pk === 4;
    const h = sx < cx - 20 ? '왼쪽' : sx > cx + 20 ? '오른쪽' : '가운데', v = sy < cy - 20 ? '위' : sy > cy + 20 ? '아래' : '가운데';
    if (side) return V.V.portrait ? `${h} 가운데` : `${v} 가운데`;
    return `${h} ${v} 코너`;
  }
  function renderCoach() {
    if (!coachP || !SES) return;
    if (!SES.coachOn || !SES.coachAllowed) { coachP.hide(); return; }
    const seat = seatOf();
    if (SES.s.phase !== 'play') { coachP.set('경기가 끝났어요. 수고했어요! 🎉'); return; }
    if (SES.anim) { coachP.set('🧑‍🏫 공이 어떻게 구르는지 잘 봐요…'); return; }
    if (!myTurn()) { coachP.set(`🧑‍🏫 ${esc(seat ? seat.name : '')} 차례예요. 내 차례가 오면 추천 샷을 알려 줄게요`); return; }
    const r = SES.coachRes; if (!r) return;
    const s = SES.s, L = [];
    const a = r.action;
    if (s.mode === '8ball') {
      if (r.ball != null && r.ok) {
        const cut = r.thick != null ? Math.round(Math.asin(clamp(1 - r.thick, 0, 1)) / DEG) : null;
        L.push(`🎯 <b>${r.ball}번 공</b>을 <b>${pocketName(r.pocket)}</b> 포켓으로${cut != null ? ` · 컷 약 ${cut}°` : ''}`);
        if (a.place) L.push('✋ 프리볼: 수구를 추천 자리에 놓았어요');
        L.push(`🎱 당점: ${spinText(a.spinX, a.spinY)} · 힘 ${Math.round(a.power * 100)}%`);
        if (a.spinY < -0.2) L.push('↩️ 끌어치기로 수구를 세워 다음 공 자리를 잡아요');
        else if (a.spinY > 0.2) L.push('➡️ 밀어치기로 수구가 따라 나가요');
      } else {
        L.push('🤔 확실히 넣을 공이 안 보여요');
        L.push('🛡️ 내 공을 먼저 맞히고 쿠션에 닿게 하는 <b>안전한 샷</b>이에요');
        L.push(`🎱 당점: ${spinText(a.spinX, a.spinY)} · 힘 ${Math.round(a.power * 100)}%`);
      }
    } else {
      const cue = B.cueOf(s, s.turn);
      if (r.firstBall != null) {
        if (r.bankFirst) L.push(`🎯 <b>쿠션 먼저</b>(빈 쿠션) 쳐서 <b>${ballName(s, r.firstBall)}</b>부터 맞혀요`);
        else L.push(`🎯 <b>${ballName(s, r.firstBall)}</b>의 <b>${r.side === 'left' ? '왼쪽' : '오른쪽'}</b>을 <b>${thickLabel(r.thick)}</b>로 맞혀요`);
      }
      if (r.second != null) {
        const rails = r.rails.map(x => (x === 1 || x === 3) ? '짧은' : '긴');
        L.push(`↪️ ${rails.length ? `쿠션 ${rails.length}번 (${rails.join(' → ')})` : '바로'} → <b>${ballName(s, r.second)}</b>`);
      }
      L.push(`🎱 당점: ${spinText(a.spinX, a.spinY)} · 힘 ${Math.round(a.power * 100)}%`);
      if (s.mode === '4gu') L.push(`⚠️ ${B.CAROM_NAMES[1 - cue]}은 건드리지 않게!`);
      if (!r.ok) L.push('🤔 확실한 길이 안 보여서 가장 가까이 가는 샷이에요');
    }
    coachP.set(L.map(x => `<span class="cl">${x}</span>`).join('') + `<button class="cbtn" data-apply>👉 이대로 겨누기</button> <span class="rate" title="조금씩 흔들어 10번 쳐 본 결과">성공률 약 ${r.rate}%</span>`);
  }

  // ── 친구랑 (온라인)
  function onlineSettings() {
    return {
      defaults: { mode: opt.game, target: opt.targets[opt.game], finish3c: opt.finish3c ? 1 : 0 },
      label: cfg => cfg ? `${B.MODES[cfg.mode] ? B.MODES[cfg.mode].name : ''} ${targetLabel(cfg.mode, cfg.target)}` : '',
      render(el, cfg, canEdit, update) {
        const m = cfg.mode || '3c';
        if (!canEdit) {
          el.innerHTML = `<p class="arn-soft" style="text-align:center">🎱 ${B.MODES[m].name} ${targetLabel(m, cfg.target)}</p>`;
          return;
        }
        const row = (lbl, items, cur, key) => `<div class="optrow"><span class="small">${lbl}</span><div class="seg">${items.map(([v, t]) => `<button class="btn" data-k="${key}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${t}</button>`).join('')}</div></div>`;
        el.innerHTML = row('종목', Object.keys(GAMES).map(k => [k, GAMES[k].name]), m, 'mode')
          + (m === '8ball' ? '' : row(m === '4gu' ? '다마 수' : '목표', B.MODES[m].targets.map(t => [t, targetLabel(m, t)]), cfg.target, 'target'));
        el.onclick = e => {
          const b = e.target.closest('button[data-k]'); if (!b) return;
          const k = b.dataset.k, v = b.dataset.v;
          if (k === 'mode') update({ mode: v, target: B.MODES[v].defTarget });
          else update({ [k]: +v });
        };
      },
    };
  }
  const friendOpts = () => ({
    game: 'billiards', title: '당구', max: 4, min: 2, coach: true,
    // 지금 인원이면 어떻게 되는지 한 줄 (AI 선생님 켜기는 ArenaUI 가 cfg.coach 로 관리)
    describe: (n, cfg) => (cfg && cfg.mode === '8ball') ? (n >= 3 ? `2:2 팀전${n === 3 ? ' · 빈자리는 🐱 AI' : ''}` : '1:1 포켓볼') : (n > 2 ? `${n}명이 차례로 쳐요` : '1:1 대결'),
    settings: onlineSettings(),
    onStart: ctx => startOnline(ctx),
    onLobby: () => { stopSession(); showScreen('home'); drawMenu(); },
    onLeave: () => { if (SES && SES.kind === 'online') goHome(); },
  });
  function openFriend() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }
  function sortedIds(players, hostId) {
    return Object.keys(players || {}).filter(u => !(players[u] || {}).watch).sort((a, b) => (b === hostId) - (a === hostId) || ((players[a].t || 0) - (players[b].t || 0)));
  }
  function startOnline(ctx) {
    stopSession();
    const { net, role } = ctx, cfg = Object.assign({ mode: '3c', target: 10, coach: false }, ctx.cfg || {});
    SES = newSes({ kind: 'online', role, net, mode: cfg.mode, cfg, coachAllowed: !!cfg.coach, s: null, seats: [] });
    SES.coachOn = !!cfg.coach;                                   // 방장이 '모두에게 보이기'를 켰으면 처음부터 보임 (각자 끌 수 있음)
    const ses = SES;
    // 이 판이 붙인 듣기는 판이 끝날 때 뗌 (대기실로 갔다 다시 시작해도 겹치지 않게)
    const ON = (ev, fn) => { const off = net.on(ev, fn); if (typeof off === 'function') ses.netOffs.push(off); };
    ON('players', () => { if (SES !== ses) return; if (ses.s) updateHud(); if (ses.drawReady) ses.drawReady(); });   // 구경 인원 · 준비 목록
    if (role === 'host') {
      hostSetup(ses, sortedIds(ctx.players, net.uid));
      ON('msg', (uid, m) => { if (SES !== ses || !m) return; hostMsg(uid, m); });
      ON('leave', uid => hostLeave(ses, uid));
      ON('join', uid => hostJoin(ses, uid));
      enterPlay();
      publishSnap(ses.s);
    } else {
      showScreen('play');
      flash('방장 판을 받아 오는 중…', 3000);
      ON('msg', m => { if (SES !== ses || !m) return; guestMsg(m); });
      net.watchShared('snap', sn => { if (SES === ses && sn) onSnap(sn, true); });
    }
  }
  // 방장: 새 판의 자리 · 공 배치 (ids = 자리에 앉을 사람 uid 순서, 모자라면 AI)
  function hostSetup(ses, ids) {
    const { net, cfg } = ses, pl = net.players || {};
    const n = cfg.mode === '8ball' ? (ids.length >= 3 ? 4 : 2) : Math.min(4, Math.max(2, ids.length));
    ses.seats = Array.from({ length: n }, (_, i) => ids[i] ? { uid: ids[i], name: (pl[ids[i]] || {}).name || `친구${i + 1}`, em: '🙂', ctrl: ids[i] === net.uid ? 'me' : 'remote' } : { uid: null, name: '🐱 중급 AI', em: '🐱', ctrl: 'ai', tier: 'normal' });
    ses.s = B.create({ mode: cfg.mode, players: n, target: cfg.target, finish3c: !!cfg.finish3c, seed: rand32() });
    ses.gid++; ses.no = 0; ses.rdy = new Set(); ses.pick = {}; ses.lastTurn = -1; ses.last = null; ses.anim = null; ses.waiting = false; ses.spectator = false;
  }
  // 방장: 같은 방에서 다음 판 — 앉았던 사람 중 아직 방에 있는 사람 + 방장이 체크한 구경꾼 (최대 4명)
  function hostNext() {
    const ses = SES;
    if (!ses || ses.kind !== 'online' || ses.role !== 'host' || !ses.s || ses.s.phase !== 'end') return;
    const pl = ses.net.players || {};
    const prev = ses.seats.filter(x => x.uid && pl[x.uid]).map(x => x.uid);
    const add = Object.keys(pl).filter(u => !prev.includes(u) && ses.pick[u] && !pl[u].watch).sort((a, b) => (pl[a].t || 0) - (pl[b].t || 0));
    const ids = prev.concat(add).slice(0, 4), n0 = ses.seats.filter(x => x.uid).length;
    $('resBox').hidden = true; ses.drawReady = null;
    hostSetup(ses, ids);
    enterPlay();
    publishSnap(ses.s);
    if (ids.length !== n0) { try { ses.net.chat(`📣 새 판 시작 · ${ids.length}명이 쳐요`); } catch (e) {} }
  }
  const seatInfo = ses => ({ seats: ses.seats.map(x => ({ uid: x.uid || null, name: x.name, ai: x.ctrl === 'ai', sub: !!x.sub })), wins: ses.wins });
  function snapOf(s) { return Object.assign({ s, no: SES.no, gid: SES.gid }, seatInfo(SES)); }
  function publishSnap(s) {
    if (!SES || SES.kind !== 'online' || SES.role !== 'host') return;
    const sn = snapOf(s);
    SES.net.setShared('snap', sn);
    SES.net.broadcast({ t: 'snap', snap: sn }, true);
  }
  // 이름 옆 🤖 · 이긴 횟수가 바뀌었을 때 (판 상태는 그대로)
  function pushSeats(ses) { ses.net.broadcast(Object.assign({ t: 'seats', gid: ses.gid }, seatInfo(ses)), true); updateHud(); }
  function applySeatInfo(m) {
    const ses = SES; if (!ses || !m) return;
    if (m.wins) ses.wins = m.wins;
    if (Array.isArray(m.seats) && m.seats.length === ses.seats.length) m.seats.forEach((x, i) => { ses.seats[i].sub = !!x.sub; });
    updateHud();
  }
  // 이긴 횟수 (방장만 셈 — 판이 끝나는 샷에서). 8볼 4명은 팀 둘 다
  function bumpWins(s) {
    SES.seats.forEach((x, i) => {
      if (!x.uid) return;
      const win = s.mode === '8ball' ? B.teamOf(s, i) === s.winTeam : i === s.winner;
      if (win) SES.wins[x.uid] = (SES.wins[x.uid] || 0) + 1;
    });
  }
  function hostMsg(uid, m) {
    const s = SES.s, seat = SES.seats[s.turn];
    if (m.t === 'shot') {
      if (seat && seat.uid === uid && !seat.sub && !SES.anim && s.phase === 'play' && m.no === SES.no && (m.gid | 0) === SES.gid && m.a) shoot(m.a);
    } else if (m.t === 'aim') {
      if (seat && seat.uid === uid && !SES.anim) { SES.remoteAim = m; SES.guideKey = ''; SES.net.broadcast(m); }
    } else if (m.t === 'rdy') {                                  // 판이 끝난 뒤 '준비' (구경꾼이 누르면 '다음 판에 낄래요')
      if (s.phase !== 'end' || (m.gid | 0) !== SES.gid) return;
      SES.rdy.add(uid);
      if (!SES.seats.some(x => x.uid === uid)) SES.pick[uid] = true;
      sendRdy(SES);
    }
  }
  const sendRdy = ses => { ses.net.broadcast({ t: 'rdyl', gid: ses.gid, uids: [...ses.rdy], pick: ses.pick }, true); if (ses.drawReady) ses.drawReady(); };
  let snapWait = null;
  function onSnap(sn, fromShared) {
    const ses = SES, g = sn.gid | 0;
    if (ses.s && g < ses.gid) return;                            // 지난 판 소식
    if (ses.s && g === ses.gid) {
      if (sn.no <= ses.no) { applySeatInfo(sn); return; }        // 같은 상태: 이름 · 이긴 횟수만 맞춤
      if (ses.anim) return;
      if (fromShared && sn.no === ses.no + 1) {
        // 샷 결과(res)가 곧 올 테니 조금 기다렸다가, 안 오면 그때 맞춤
        clearTimeout(snapWait); snapWait = setTimeout(() => { if (SES === ses && !ses.anim && sn.no > ses.no) applySnap(sn); }, 1800);
        return;
      }
    }
    applySnap(sn);
  }
  function applySnap(sn) {
    const ses = SES, first = !ses.s, g = sn.gid | 0, fresh = first || g > ses.gid;
    ses.s = sn.s; ses.no = sn.no; ses.gid = g;
    if (fresh) { ses.anim = null; ses.last = null; ses.lastTurn = -1; ses.waiting = false; ses.rdy = new Set(); ses.pick = {}; ses.drawReady = null; $('resBox').hidden = true; }   // 새 판: 결과 창·준비 목록 치움
    if (sn.wins) ses.wins = sn.wins;
    ses.seats = sn.seats.map(x => ({ uid: x.uid, name: x.name, em: '🙂', ctrl: x.uid && x.uid === ses.net.uid ? 'me' : 'remote', sub: !!x.sub }));
    ses.spectator = !ses.seats.some(x => x.ctrl === 'me');
    if (fresh) enterPlay(); else startTurn();
    if (ses.s.phase === 'end') showResult();
  }
  function guestMsg(m) {
    const ses = SES;
    if (m.t === 'snap') onSnap(m.snap, false);
    else if (m.t === 'seats') { if ((m.gid | 0) === ses.gid) applySeatInfo(m); }
    else if (m.t === 'rdyl') {
      if ((m.gid | 0) !== ses.gid) return;
      (m.uids || []).forEach(u => ses.rdy.add(u)); ses.pick = m.pick || {};
      if (ses.drawReady) ses.drawReady();
    }
    else if (m.t === 'aim') { if (!ses.anim && ses.s && seatOf() && seatOf().ctrl !== 'me') { ses.remoteAim = m; ses.guideKey = ''; } }
    else if (m.t === 'res') {
      if (!ses.s || (m.gid | 0) !== ses.gid) return;
      if (m.no <= ses.no) return;
      clearTimeout(snapWait);
      ses.waiting = false;
      if (m.wins) ses.wins = m.wins;
      if (m.no > ses.no + 1 || ses.anim) { applySnap({ s: m.s, no: m.no, gid: ses.gid, wins: m.wins, seats: ses.seats.map(x => ({ uid: x.uid, name: x.name, sub: x.sub })) }); return; }
      const traj = B.unpackTraj(m.traj);
      playShot(ses.s, traj, m.a, an => { ses.no = m.no; afterShot({ state: m.s, result: m.result }, an); });
    }
  }
  let aimT = 0;
  function sendAim() {
    if (!SES) return;
    SES.guideKey = '';
    $('spinLbl').textContent = spinText(SES.aim.spinX, SES.aim.spinY);
    if (SES.kind !== 'online' || !myTurn()) return;
    const now = performance.now(); if (now - aimT < 110) return; aimT = now;
    const m = { t: 'aim', angle: SES.aim.angle, power: SES.aim.power, spinX: SES.aim.spinX, spinY: SES.aim.spinY, place: SES.s.ballInHand ? SES.place : null };
    if (SES.role === 'host') SES.net.broadcast(m); else SES.net.send(m);          // 겨냥은 자주 보내는 값이라 늦으면 버림 (rel 아님)
  }

  // ── ⏱ 친구랑 샷 시간: 내 차례 30초가 지나면 방장이 중급 AI 로 대신 침 (10초 남으면 알림)
  const SHOT_SEC = 30;
  function stopShotTimer() { if (!SES) return; clearInterval(SES.shotT); SES.shotT = 0; SES.shotLeft = null; }
  function shotTimer() {
    const ses = SES; if (!ses) return;
    stopShotTimer();
    if (ses.kind !== 'online' || !ses.s || ses.s.phase !== 'play') return;
    const seat = ses.seats[ses.s.turn];
    if (!seat || seat.ctrl === 'ai') return;                     // AI 차례는 알아서 침
    const end = Date.now() + SHOT_SEC * 1000, no0 = ses.no, gid0 = ses.gid;
    ses.shotLeft = SHOT_SEC;
    const id = ses.shotT = setInterval(() => {
      if (!(SES === ses && ses.no === no0 && ses.gid === gid0 && ses.s.phase === 'play')) { clearInterval(id); if (SES === ses && ses.shotT === id) { ses.shotT = 0; ses.shotLeft = null; } return; }
      if (ses.anim) return;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (left !== ses.shotLeft) {
        ses.shotLeft = left;
        if (left === 10 && seat.ctrl === 'me') { C.toast('⏱ 10초 남았어요', 1500); C.vibrate(30); }
        updateHud();
      }
      if (left <= 0) { clearInterval(id); ses.shotT = 0; ses.shotLeft = null; if (ses.role === 'host') autoShot(ses, seat); else updateHud(); }
    }, 250);
  }
  async function autoShot(ses, seat) {
    const no0 = ses.no, gid0 = ses.gid;
    C.toast('⏱ 30초가 지나서 AI 가 대신 쳐요', 2200);
    try { ses.net.chat(`⏱ ${seat.name} 님은 30초가 지나서 AI 가 대신 쳤어요`); } catch (e) {}
    const act = await AI.chooseAsync(ses.s, 'normal', { seed: rand32() });
    if (SES !== ses || ses.no !== no0 || ses.gid !== gid0 || ses.anim || ses.s.phase !== 'play') return;   // 그 사이 직접 쳤으면 그만
    shoot(act);
  }

  // ── 🔌 나간 사람: 방장이 5초 뒤 고름 (AI 가 대신 · 대기실에서 처음부터 · 기다리기). 같은 링크로 돌아오면 자리를 되찾음
  function hostLeave(ses, uid) {
    if (SES !== ses) return;
    const i = ses.seats.findIndex(x => x.uid === uid); if (i < 0) return;
    const st = ses.seats[i];
    C.toast(`${st.name} 님 연결이 끊겼어요. 같은 링크로 다시 들어오면 이어서 해요`, 3200);
    if (ses.drawReady) ses.drawReady();
    if (ses.s.phase === 'end') return;                          // 판이 끝난 뒤엔 묻지 않음 (다음 판 자리에서 빠짐)
    setTimeout(() => { if (SES !== ses || (ses.net.players || {})[uid] || st.sub || ses.seats[i] !== st) return; askGone(ses, i); }, 5000);
  }
  function hostJoin(ses, uid) {
    if (SES !== ses || !ses.s) return;
    const i = ses.seats.findIndex(x => x.uid === uid);
    if (i >= 0) {
      const st = ses.seats[i];
      if (ses.goneAsk && ses.goneAsk.uid === uid) { try { ses.goneAsk.close(); } catch (e) {} ses.goneAsk = null; }
      if (st.sub) {                                              // 돌아온 사람: AI 가 대신하던 자리를 되돌려 줌
        st.sub = false; st.ctrl = 'remote'; delete st.tier;
        C.toast(`${st.name} 님이 돌아왔어요. 다시 직접 쳐요`, 2400);
        try { ses.net.chat(`🙌 ${st.name} 님이 돌아와서 직접 쳐요`); } catch (e) {}
        pushSeats(ses);
        if (ses.s.phase === 'play' && ses.s.turn === i && !ses.anim && !ses.aiBusy) startTurn();
      }
    }
    ses.net.send(uid, { t: 'snap', snap: snapOf(ses.s) }, true);   // 처음 온 사람 · 다시 온 사람에게 지금 판
    if (ses.drawReady) ses.drawReady();
  }
  function askGone(ses, i) {
    const st = ses.seats[i]; if (SES !== ses || !st || st.sub) return;
    if (ses.goneAsk) { setTimeout(() => { if (SES === ses && !st.sub && !(ses.net.players || {})[st.uid]) askGone(ses, i); }, 2500); return; }   // 다른 질문이 떠 있으면 조금 뒤
    const close = C.modal({
      title: `🔌 ${st.name} 님이 나갔어요`,
      html: '<p style="margin:0">어떻게 할까요? AI 는 🐱 중급이 대신 쳐요. 같은 링크로 다시 들어오면 그 자리로 돌아와요.</p>',
      buttons: [
        { label: '🤖 AI가 대신 쳐요', primary: true, onClick: () => subAI(ses, i) },
        { label: '🔄 처음부터 다시 (대기실로)', onClick: () => { if (window.ArenaUI && ArenaUI.net === ses.net) { try { ses.net.chat('🔄 방장이 처음부터 다시 하기로 했어요'); } catch (e) {} ArenaUI.toLobby(); } } },
        { label: '⏳ 기다릴게요' },
      ],
      dismiss: false, onClose: () => { if (ses.goneAsk && ses.goneAsk.close === close) ses.goneAsk = null; },
    });
    ses.goneAsk = { uid: st.uid, close };
  }
  function subAI(ses, i) {
    const st = ses.seats[i]; if (SES !== ses || !st) return;
    st.sub = true; st.ctrl = 'ai'; st.tier = 'normal';
    try { ses.net.chat(`🤖 ${st.name} 님 자리는 AI 가 대신 쳐요 (돌아오면 다시 직접)`); } catch (e) {}
    pushSeats(ses);
    if (ses.s.phase === 'play' && ses.s.turn === i && !ses.anim && !ses.aiBusy) startTurn();      // 지금 그 사람 차례면 AI 가 바로 침
    if (ses.drawReady) ses.drawReady();
  }

  // ── 겨냥 선 계산 (시뮬레이터로 수구·목적구 길 미리 보기)
  function computeGuide(aim, place) {
    const s = SES.s, cue = B.cueOf(s, s.turn);
    const st2 = place && s.ballInHand ? Object.assign({}, s, { balls: s.balls.map((b, i) => i === cue ? { x: place[0], y: place[1], on: true } : b) }) : s;
    const fc = B.firstContact(st2, aim.angle, cue);
    const long = opt.guide === 'long';
    const sim = B.simulate(st2, { angle: aim.angle, power: aim.power, spinX: aim.spinX, spinY: aim.spinY, cue }, { maxTime: long ? 9 : 2.5 });
    const F = sim.frames, path = i => F.map(f => [f[2 * i], f[2 * i + 1]]).filter(p => !isNaN(p[0]));
    // 첫 접촉 프레임
    const fe = sim.events.find(e => (e.k === 'b' && (e.a === cue || e.b === cue)) || (e.k === 'c' && e.a === cue));
    const fi = fe ? fe.f : F.length - 1;
    const cuePath = path(cue);
    const cut = (pts, from, maxLen) => { const out = []; let d = 0; for (let k = from; k < pts.length; k++) { if (out.length) d += Math.hypot(pts[k][0] - out[out.length - 1][0], pts[k][1] - out[out.length - 1][1]); out.push(pts[k]); if (d > maxLen) break; } return out; };
    const g = { fc, cue: cuePath.slice(0, fi + 1), after: cut(cuePath, fi, long ? 99 : 0.32), obj: null, long };
    if (fe && fe.k === 'b') { const o = fe.a === cue ? fe.b : fe.a; g.obj = cut(path(o), fi, long ? 0.9 : 0.4); g.objId = o; }
    return g;
  }

  // ── 매 프레임 그리기
  function loop() {
    requestAnimationFrame(loop);
    if (!SES || !SES.s || $('play').hidden || !V.V.T) return;
    try { draw(); } catch (e) {
      console.error(e);
      const a = SES.anim; SES.anim = null; SES.sinking = [];   // 그림이 깨져도 샷 결과는 그대로 넘김 (AI 차례가 멈추지 않게)
      if (a && a.done) { try { a.done(a); updateHud(); renderCoach(); } catch (e2) { console.error(e2); } }
      if (window.Cozy && Cozy.sendReport) Cozy.sendReport('error', '(당구 그리기) ' + (e && e.message || e), { src: String((e && e.stack || '').split(/\n/)[1] || '').trim().slice(0, 200) });
    }
  }
  function draw() {
    const ses = SES, s = ses.s, n = s.balls.length, R = V.V.T.R, ctx = V.ctx, now = performance.now();
    let pos = new Float32Array(2 * n), animFrame = -1, a = ses.anim;
    if (a) {
      const t = (now - a.start) / 1000 * a.fps * a.speed;
      if (t < 0) { const b = a.before.balls; for (let i = 0; i < n; i++) { pos[2 * i] = b[i].on ? b[i].x : NaN; pos[2 * i + 1] = b[i].on ? b[i].y : NaN; } if (a.act && a.act.place) { pos[2 * a.cue] = a.act.place[0]; pos[2 * a.cue + 1] = a.act.place[1]; } }
      else {
        if (a.stroke) { a.stroke = false; sfx('cue', { p: a.act ? a.act.power : 0.5 }); }
        const F = a.frames, k = Math.min(F.length - 1, Math.floor(t)), fr = Math.min(1, t - k), f0 = F[k], f1 = F[Math.min(F.length - 1, k + 1)];
        for (let j = 0; j < 2 * n; j++) { const v0 = f0[j], v1 = f1[j]; pos[j] = isNaN(v1) ? v0 : v0 + (v1 - v0) * fr; }
        animFrame = k;
        // 사건 → 소리 · 포켓 빠짐
        const evf = t * (60 / a.fps);
        while (a.ei < a.events.length && (a.events[a.ei].f60 != null ? a.events[a.ei].f60 : a.events[a.ei].f) <= evf) {
          const e = a.events[a.ei++];
          if (e.k === 'b') sfx('clack', { v: e.v }); else if (e.k === 'c') sfx('cushion', { v: e.v });
          else if (e.k === 'p') {
            sfx('pocket'); const pk = B.geom(s.table).pockets[e.b];
            let li = Math.min(F.length - 1, Math.max(0, Math.floor((e.f60 != null ? e.f60 : e.f) * a.fps / 60) - 1));   // 빠지기 바로 전 프레임
            while (li > 0 && isNaN(F[li][2 * e.a])) li--;
            const x = F[li][2 * e.a], y = F[li][2 * e.a + 1];
            if (isFinite(x) && isFinite(y)) ses.sinking.push({ i: e.a, x, y, px: pk ? pk.x : 0, py: pk ? pk.y : 0, t0: now });
          }
        }
        if (t >= F.length - 1 + 2) { const d = a.done; ses.anim = null; d && d(a); updateHud(); renderCoach(); return; }
      }
    } else {
      for (let i = 0; i < n; i++) { const b = s.balls[i]; pos[2 * i] = b.on ? b.x : NaN; pos[2 * i + 1] = b.on ? b.y : NaN; }
      if (s.ballInHand && ses.place) { const c = B.cueOf(s, s.turn); pos[2 * c] = ses.place[0]; pos[2 * c + 1] = ses.place[1]; }
    }
    V.roll(pos);
    V.clear();
    const aiming = !a && s.phase === 'play' && (myTurn() || ses.aiBusy || (ses.remoteAim && seatOf().ctrl !== 'me'));
    const aim = (!myTurn() && !ses.aiBusy && ses.remoteAim) ? ses.remoteAim : ses.aim;
    const place = (!myTurn() && ses.remoteAim) ? ses.remoteAim.place : ses.place;
    // 프리볼 놓는 곳 (부엌 = 헤드 스트링 뒤)
    if (!a && s.ballInHand && s.kitchen && myTurn()) {
      const T = V.V.T, p0 = V.toS(0, 0), p1 = V.toS(T.L / 4, T.W);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1]));
    }
    // 겨냥 선 (공 아래)
    let g = null;
    if (aiming && opt.guide !== 'off' && !(ses.aiBusy && SES.kind !== 'online')) {
      const key = [aim.angle.toFixed(5), aim.power.toFixed(3), aim.spinX.toFixed(2), aim.spinY.toFixed(2), place ? place.join(',') : '', s.turn, ses.no, s.shots, opt.guide, s.balls.map(b => b.x.toFixed(4) + b.y.toFixed(4)).join('')].join('|');
      if (key !== ses.guideKey) { ses.guideKey = key; ses.guide = computeGuide(aim, place); }
      g = ses.guide;
    }
    const line = (pts, color, w, dash) => {
      if (!pts || pts.length < 2) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); pts.forEach((p, k) => { const q = V.toS(p[0], p[1]); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
    };
    if (g) {
      const c0 = cuePos2(place);
      line([c0, [g.fc.x, g.fc.y]], 'rgba(255,255,255,.75)', 1.6, [6, 5]);
      line(g.after, g.long ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.6)', 1.6, [2, 4]);
      if (g.obj) line(g.obj, 'rgba(253,224,71,.85)', 2, null);
    }
    // 그림자 → 공
    for (let i = 0; i < n; i++) if (!isNaN(pos[2 * i])) V.shadow(pos[2 * i], pos[2 * i + 1]);
    for (let i = 0; i < n; i++) if (!isNaN(pos[2 * i])) V.ball(i, pos[2 * i], pos[2 * i + 1]);
    // 포켓에 빠지는 공
    ses.sinking = ses.sinking.filter(k => now - k.t0 < 320);
    for (const k of ses.sinking) { const e = (now - k.t0) / 320; V.ball(k.i, k.x + (k.px - k.x) * e, k.y + (k.py - k.y) * e, 1 - e * 0.6, 1 - e * 0.55); }
    if (g && g.fc.type === 'ball') {
      const q = V.toS(g.fc.x, g.fc.y);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(q[0], q[1], R * V.V.s, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // 프리볼 표시
    if (!a && s.ballInHand && s.phase === 'play' && place) {
      const q = V.toS(place[0], place[1]), pr = R * V.V.s * (1.7 + 0.15 * Math.sin(now / 220));
      ctx.save(); ctx.strokeStyle = 'rgba(253,224,71,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], pr, 0, TAU); ctx.stroke();
      ctx.font = `${Math.max(12, R * V.V.s * 1.4)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('✋', q[0], q[1] - pr - 4); ctx.restore();
    }
    // 큐
    if (aiming) { const c0 = cuePos2(place); V.cue(c0[0], c0[1], aim.angle, 0.02 + aim.power * 0.2); }
    else if (a && (now < a.start + 40) && a.act) {
      const k = clamp((now - (a.start - 200)) / 200, 0, 1), c = a.before.balls[a.cue], cx0 = a.act.place ? a.act.place[0] : c.x, cy0 = a.act.place ? a.act.place[1] : c.y;
      V.cue(cx0, cy0, a.act.angle, (0.02 + a.act.power * 0.2) * (1 - k * k));
    }
    // 조작판 글
    const pwv = Math.round((aim.power || 0) * 100), al = (aim.angle / DEG).toFixed(1) + '°';
    if (ses.uiP !== pwv) { ses.uiP = pwv; $('pfill').style.width = pwv + '%'; $('pthumb').style.left = pwv + '%'; $('plbl').textContent = `힘 ${pwv}%`; }
    if (ses.uiA !== al) { ses.uiA = al; $('angLbl').textContent = al; }
    const sk = aim.spinX.toFixed(2) + aim.spinY.toFixed(2);
    if (ses.uiS !== sk) { ses.uiS = sk; D.drawSpinPad($('spin'), aim.spinX, aim.spinY); $('spinLbl').textContent = spinText(aim.spinX, aim.spinY); }
  }
  function cuePos2(place) { const s = SES.s, c = s.balls[B.cueOf(s, s.turn)]; return s.ballInHand && place ? place : [c.x, c.y]; }
  requestAnimationFrame(loop);

  // ── 시작
  drawMenu();
  showScreen('home');
  if (window.GME && GME.onChange) GME.onChange(() => drawMenu());
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
  // 시험·디버그용 (헤드리스 브라우저 확인)
  window.__billiards = { get ses() { return SES; }, opt, startLocal, shoot: a => shoot(a || currentAction()), V };
})();

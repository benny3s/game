/* 고스톱 — 메뉴 · 화면 한 장 · 패 움직임 · 조작 · 소리 (규칙은 core.js, AI 는 ai.js·ai-worker.js, 패 그림은 cards.js)
   한 판 흐름: 상태 S → 차례인 자리(seatAt(ses, p).ctrl: 'me' | 'ai' | 'remote')가 행동 번호를 고름 → Gostop.step → 돌려받은 events 로 움직임·소리 → 다음
   인원: 2 맞고 · 3 고스톱 · 4~5 광 팔기 (3명이 치고 나머지는 판마다 돌아가며 쉼, state 의 who/bench). 친구 자리도 같은 길로 (행동 번호만 주고받음) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const G = window.Gostop, AI = window.GostopAI, ART = window.GostopArt, C = window.Cozy;
  const sfx = (n, o) => C.sfx.play(n, o);
  const esc = C.esc;
  const fmtN = n => Number(n || 0).toLocaleString('ko-KR');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // 받침 따라 '이/가' ('나' 는 '내가')
  const hasJong = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const iga = w => (w === '나' ? '내가' : w + (hasJong(w) ? '이' : '가'));

  // ── 설정 · 기록 (localStorage) ─────────────────────────────
  const KEY = 'gostop.';
  const opt = {
    tab: C.store(KEY + 'tab', 'solo'), mode: C.store(KEY + 'mode', 2), tier: C.store(KEY + 'tier', 'normal'),
    bonus: C.store(KEY + 'bonus', 0), speed: C.store(KEY + 'speed', 'normal'), coach: C.store(KEY + 'coach', 1),
    wMode: C.store(KEY + 'wMode', 2), wTiers: C.store(KEY + 'wTiers', ['hard', 'normal', 'easy']), wSpeed: C.store(KEY + 'wSpeed', 'normal'),
    lMode: C.store(KEY + 'lMode', 2), lSeats: C.store(KEY + 'lSeats', ['human', 'human', 'normal', 'normal', 'normal']),
  };
  const saveOpt = k => C.save(KEY + k, opt[k]);
  let coins = C.store(KEY + 'coins', 0);
  let stats = C.store(KEY + 'stats', { played: 0, won: 0, best: 0 });

  const TIER = {
    easy:   { em: '🌱', name: '동네 하수', cls: 't-easy',   desc: '패를 솔직하게 내는 입문자', names: ['김씨', '박씨', '정씨', '한씨'] },
    normal: { em: '🎴', name: '사랑방 고수', cls: 't-normal', desc: '피 계산과 견제가 탄탄한 실력자', names: ['이생원', '최주사', '강서방', '윤참봉'] },
    hard:   { em: '👑', name: '전설의 타짜', cls: 't-hard',   desc: '숨은 패까지 읽는 일류 타짜', names: ['고광렬', '평경장', '아귀', '짝귀'] },
  };
  const SPEEDS = { slow: { label: '느긋하게', em: '🐢', mul: 1.45, think: 950 }, normal: { label: '보통', em: '⚡', mul: 1, think: 560 }, fast: { label: '빠르게', em: '🚀', mul: 0.55, think: 230 } };
  const SPEED_ORDER = ['slow', 'normal', 'fast'];

  // ── 메뉴 ─────────────────────────────────────────────────
  function segBtns(el, items, cur, onPick) {
    el.innerHTML = items.map(([v, label]) => `<button class="btn" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${label}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('button'); if (!b) return; sfx('tap'); onPick(b.dataset.v); };
  }
  function drawMenu() {
    const tab = ['solo', 'watch', 'local'].includes(opt.tab) ? opt.tab : 'solo';
    $('tabSolo').setAttribute('aria-pressed', String(tab === 'solo')); $('tabWatch').setAttribute('aria-pressed', String(tab === 'watch')); $('tabLocal').setAttribute('aria-pressed', String(tab === 'local'));
    $('soloBox').hidden = tab !== 'solo'; $('watchBox').hidden = tab !== 'watch'; $('localBox').hidden = tab !== 'local';
    $('coinLine').innerHTML = `<span class="ic">🪙</span><span class="grow"><b>보유 자금 ${fmtN(coins)}냥</b><span class="small">${stats.played ? `통산 ${fmtN(stats.played)}판 중 ${fmtN(stats.won)}승 · 최고 기록 ${fmtN(stats.best)}점` : '승리 시 점수만큼 판돈이 쌓입니다 (1점 = 10냥)'}</span></span>`;
    segBtns($('modeSeg'), [[2, '맞고 2인'], [3, '고스톱 3인'], [4, '광팔기 4인'], [5, '광팔기 5인']], opt.mode, v => { opt.mode = +v; saveOpt('mode'); drawMenu(); });
    const mo = G.modeOf(opt.mode);
    $('modeNote').textContent = mo.bench ? `${mo.n}명이 치고 ${mo.bench}명은 판마다 돌아가며 쉬어요. 쉬는 사람이 내놓는 광을 살 수 있어요` : '';
    $('modeNote').hidden = !mo.bench;
    C.tierCards($('tiers'), ['easy', 'normal', 'hard'].map(id => ({ id, em: TIER[id].em, name: TIER[id].name, desc: TIER[id].desc, cls: TIER[id].cls })),
      id => { opt.tier = id; saveOpt('tier'); drawMenu(); }, { selected: opt.tier });
    segBtns($('bonusSeg'), [[0, '없음'], [2, '2장'], [3, '3장']], opt.bonus, v => { opt.bonus = +v; saveOpt('bonus'); drawMenu(); });
    segBtns($('speedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    if ($('coachSeg')) segBtns($('coachSeg'), [[1, '🧑‍🏫 켬'], [0, '끔']], opt.coach ? 1 : 0, v => { opt.coach = +v; saveOpt('coach'); drawMenu(); });
    $('startBtn').textContent = `🎴 ${mo.name} 대국 시작 (${TIER[opt.tier].name})`;
    segBtns($('wModeSeg'), [[2, '2인 맞고'], [3, '3인 고스톱']], opt.wMode, v => { opt.wMode = +v; saveOpt('wMode'); drawMenu(); });
    const seatName = ['아래 자리', opt.wMode === 2 ? '맞은편 자리' : '오른쪽 자리', '왼쪽 자리'];
    $('wSeats').innerHTML = Array.from({ length: opt.wMode }, (_, i) => `<div class="wseat"><b>${seatName[i]}</b><div class="seg" data-i="${i}"></div></div>`).join('');
    for (const el of $('wSeats').querySelectorAll('.seg')) {
      const i = +el.dataset.i;
      segBtns(el, ['easy', 'normal', 'hard'].map(t => [t, TIER[t].em + ' ' + TIER[t].name]), opt.wTiers[i], v => { opt.wTiers[i] = v; saveOpt('wTiers'); drawMenu(); });
    }
    drawLocalMenu();
    segBtns($('wSpeedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.wSpeed, v => { opt.wSpeed = v; saveOpt('wSpeed'); drawMenu(); });
  }
  // 한 기기에서 여럿 (2~5명, 자리마다 사람 / AI). 공통 HotSeat.setup 이 있으면 그걸 쓰고, 없으면 아래 간단한 고르기
  let lPick = null;
  function hotSeats() {
    if (lPick) return lPick.seats.map(s => (s.kind === 'human' ? { human: true, name: s.name, em: s.emoji } : { human: false, tier: s.tier }));
    const N = Math.max(2, Math.min(5, opt.lMode | 0 || 2)), EM = ['🙂', '😎', '🤠', '🦊', '🐱'];
    let hn = 0;
    return Array.from({ length: N }, (_, i) => { const k = opt.lSeats[i] || 'normal'; return k === 'human' ? { human: true, name: `플레이어${++hn}`, em: EM[i] } : { human: false, tier: k }; });
  }
  function drawLocalNote() {
    const seats = hotSeats(), N = seats.length, humans = seats.filter(s => s.human).length, mo = G.modeOf(N);
    $('lNote').textContent = (mo.bench ? `${mo.n}명이 치고 ${mo.bench}명은 돌아가며 쉬어요 (쉬는 사람의 광을 살 수 있어요). ` : '') + (humans > 1 ? '사람 차례가 되면 덮개가 나와요. 기기를 받은 사람만 "내 패 보기"를 눌러요' : humans === 0 ? '사람이 한 명은 있어야 해요' : '');
    $('localBtn').disabled = humans < 1 || N < 2 || N > 5;
    $('localBtn').textContent = `🎴 ${mo.name} 시작 (사람 ${humans} · AI ${N - humans})`;
  }
  function drawLocalMenu() {
    if (window.HotSeat && HotSeat.setup) {
      if (!lPick) lPick = HotSeat.setup($('lSeats'), { game: 'gostop', min: 2, max: 5, allowAI: true, tiers: ['easy', 'normal', 'hard'], onChange: drawLocalNote });
      $('lModeRow').hidden = true;
    } else {
      const N = Math.max(2, Math.min(5, opt.lMode | 0 || 2));
      segBtns($('lModeSeg'), [[2, '2명'], [3, '3명'], [4, '4명'], [5, '5명']], N, v => { opt.lMode = +v; saveOpt('lMode'); drawMenu(); });
      const kinds = Array.from({ length: N }, (_, i) => opt.lSeats[i] || 'normal');
      const KINDS = [['human', '🙂 사람'], ['easy', TIER.easy.em + ' AI 하수'], ['normal', TIER.normal.em + ' AI 고수'], ['hard', TIER.hard.em + ' AI 타짜']];
      $('lSeats').innerHTML = kinds.map((_, i) => `<div class="wseat"><b>${i + 1}번 자리</b><div class="seg" data-i="${i}"></div></div>`).join('');
      for (const el of $('lSeats').querySelectorAll('.seg')) {
        const i = +el.dataset.i;
        segBtns(el, KINDS, kinds[i], v => { opt.lSeats[i] = v; saveOpt('lSeats'); drawMenu(); });
      }
    }
    segBtns($('lBonusSeg'), [[0, '없음'], [2, '2장'], [3, '3장']], opt.bonus, v => { opt.bonus = +v; saveOpt('bonus'); drawMenu(); });
    segBtns($('lSpeedSeg'), SPEED_ORDER.map(k => [k, SPEEDS[k].em + ' ' + SPEEDS[k].label]), opt.speed, v => { opt.speed = v; saveOpt('speed'); drawMenu(); });
    drawLocalNote();
  }
  $('tabLocal').onclick = () => { sfx('tap'); opt.tab = 'local'; saveOpt('tab'); drawMenu(); };
  $('localBtn').onclick = () => { sfx('pop'); startHotSeat(); };
  $('tabSolo').onclick = () => { sfx('tap'); opt.tab = 'solo'; saveOpt('tab'); drawMenu(); };
  $('tabWatch').onclick = () => { sfx('tap'); opt.tab = 'watch'; saveOpt('tab'); drawMenu(); };
  if ($('tabFriend')) $('tabFriend').onclick = () => { sfx('tap'); openFriendModal(); };
  $('startBtn').onclick = () => { sfx('pop'); startGame({ watch: false }); };
  $('watchBtn').onclick = () => { sfx('pop'); startGame({ watch: true }); };
  $('rulesBtn').onclick = () => showRules();

  // 친구랑: 인원은 미리 안 정함 — 들어온 사람 수로 2 맞고 · 3 고스톱 · 4~5 광 팔기 (방 최대 5명)
  function friendOpts() {
    return {
      game: 'gostop', title: '고스톱', max: 5, min: 2, coach: true,
      describe: (count) => count < 2 ? '2명부터 시작할 수 있어요'
        : count === 2 ? '2명이면 맞고'
        : count === 3 ? '3명이면 고스톱'
        : count === 4 ? '4명이면 고스톱 · 한 명씩 돌아가며 쉬고 광 팔기'
        : '5명이면 고스톱 · 두 명씩 돌아가며 쉬고 광 팔기',
      settings: {
        defaults: { bonus: opt.bonus || 0, seed: rand32() },
        label: cfg => `보너스 피 ${(cfg && cfg.bonus) || 0}장`,
        render(el, cfg, canEdit, update) {
          el.innerHTML = `<div class="optrow"><span class="small">보너스 피</span><div class="seg" id="fBonusSeg"></div></div>`;
          const seg = el.querySelector('#fBonusSeg'), cur = (cfg && cfg.bonus) || 0;
          if (canEdit) segBtns(seg, [[0, '없음'], [2, '2장'], [3, '3장']], cur, v => update({ bonus: +v }));
          else seg.innerHTML = `<span class="small">${cur ? cur + '장' : '없음'} (방장이 정해요)</span>`;
        },
      },
      onStart: ({ net, role, cfg, players }) => startOnline({ net, role, cfg, players }),
    };
  }
  function openFriendModal() {
    if (!window.ArenaUI) return C.toast('온라인 모듈을 불러오지 못했어요');
    ArenaUI.open(friendOpts());
  }

  // ── 규칙 창 ───────────────────────────────────────────────
  const RULES_HTML = `<div class="rules">
    <p>화투 48장(열두 달 × 네 장)으로 같은 달끼리 짝을 맞춰 가져오고, 모은 패로 점수를 내요. 둘이 하면 <b>맞고</b>, 셋이 하면 <b>고스톱</b>, 넷·다섯이 하면 셋이 치고 나머지는 돌아가며 쉬는 <b>광 팔기 고스톱</b>이에요.</p>
    <h3>나누기</h3><ul><li>맞고: 한 사람 10장, 바닥 8장 · 셋이: 한 사람 7장, 바닥 6장, 나머지는 더미</li><li>바닥에 깔린 보너스 피는 선(먼저 하는 사람)이 가져가요</li></ul>
    <h3>4~5명: 광 팔기</h3><ul><li>한 판에 3명이 쳐요. 4명이면 1명, 5명이면 2명이 쉬고, 판마다 순서대로 돌아가며 쉬어요 (모두 같은 횟수)</li><li>쉬는 사람은 더미 위에서 7장씩 받아 둬요. 그중 <b>광</b>이 있으면 판에 내놓아요 (다른 패는 안 보이고, 나중에 더미 아래로 돌아가요)</li><li>치는 사람이 선부터 차례로 "그 광을 살래요?" 에 답해요. 사면 그 광이 내 먹은 패가 되고, 값은 <b>광 한 장에 1점</b>을 쉬는 사람에게 줘요 (이기든 지든 똑같이). 아무도 안 사면 광은 더미로 돌아가요</li><li>쉬는 사람이 둘이면 광 묶음도 둘까지 나올 수 있어요. 점수 계산은 셋이 치는 고스톱과 똑같아요</li></ul>
    <h3>내 차례</h3><ul><li>손패 한 장을 내요. 바닥에 같은 달이 있으면 그 위에, 없으면 그냥 바닥에</li><li>더미에서 한 장을 뒤집어 똑같이 해요</li><li>짝이 맞은 패(두 장씩)를 내 것으로 가져와요. 같은 달이 바닥에 두 장이면 하나를 골라요</li></ul>
    <h3>특별한 일 (상대에게 피 한 장씩 받아요)</h3><table>
      <tr><td>쪽</td><td>바닥에 짝 없이 낸 패를 뒤집은 패가 바로 맞힘</td></tr>
      <tr><td>따닥</td><td>바닥 두 장 + 낸 패 + 뒤집은 패, 같은 달 네 장을 한꺼번에</td></tr>
      <tr><td>싹쓸이</td><td>내 차례가 끝났을 때 바닥이 텅 빔</td></tr>
      <tr><td>뻑</td><td>낸 패로 짝을 맞췄는데 뒤집은 패도 같은 달 → 세 장이 바닥에 남아요. 나중에 네 번째 패로 먹으면 피 한 장, 내가 싼 뻑(자뻑)을 먹으면 두 장</td></tr>
      <tr><td>폭탄</td><td>손에 같은 달 세 장 + 바닥에 한 장 → 세 장을 한꺼번에 내서 네 장 다. 피 한 장 받고, 흔들기처럼 두 배, 그 뒤 두 번은 '뒤집기만' 해도 돼요</td></tr>
      <tr><td>흔들기</td><td>손에 같은 달 세 장 → 보여 주고 내면, 이겼을 때 두 배</td></tr>
      <tr><td>보너스 피</td><td>내면 바로 내 피가 되고 더미에서 한 장 더 받아요. 더미에서 나오면 먹고 한 장 더 뒤집어요 (설정에서 켬)</td></tr>
      <tr><td>총통</td><td>처음 받은 손패에 같은 달 네 장 → 10점으로 바로 이김</td></tr>
      <tr><td>쓰리뻑</td><td>한 판에 뻑을 세 번 → 바로 이김 (맞고 7점, 셋이 3점)</td></tr>
    </table><p class="small">마지막 차례의 쪽·따닥·싹쓸이·뻑 먹기는 피를 안 받아요. 피가 없는 사람에겐 못 받고, 쌍피만 있으면 쌍피를 받아요.</p>
    <h3>점수</h3><table>
      <tr><td>광</td><td>3장 3점 (비광이 끼면 2점) · 4장 4점 · 5장 15점</td></tr>
      <tr><td>열끗</td><td>5장 1점, 한 장마다 +1 · 고도리(2·4·8월 새 세 마리) 5점</td></tr>
      <tr><td>띠</td><td>5장 1점, 한 장마다 +1 · 홍단(1·2·3월) · 청단(6·9·10월) · 초단(4·5·7월) 각 3점</td></tr>
      <tr><td>피</td><td>10장 1점, 한 장마다 +1 · 쌍피는 2장, 보너스 쓰리피는 3장으로 셈</td></tr>
      <tr><td>국진</td><td>9월 술잔(열끗)은 먹을 때 열끗으로 둘지 쌍피로 쓸지 골라요</td></tr>
    </table>
    <h3>고 · 스톱</h3><ul><li>내 차례가 끝났을 때 맞고는 7점, 셋이는 3점이 넘으면 <b>고</b>(계속) 또는 <b>스톱</b>(끝내기)</li><li>고 한 번 +1점, 두 번 +2점, 세 번부터는 (점수 + 고 횟수)에 두 배씩</li><li>고한 뒤에는 그때보다 점수가 올라야 다시 고르고, 낼 패가 없으면 저절로 스톱</li><li>아무도 못 나고 패가 다 떨어지면 <b>나가리</b> → 다음 판 점수 두 배 (연달아면 네 배, 여덟 배까지)</li></ul>
    <h3>박 (진 사람 점수 두 배)</h3><table>
      <tr><td>피박</td><td>이긴 사람이 피로 점수를 냈고, 진 사람 피가 1~7장 (셋이는 1~5장)</td></tr>
      <tr><td>광박</td><td>이긴 사람이 광으로 점수를 냈고, 진 사람 광이 0장</td></tr>
      <tr><td>멍박</td><td>이긴 사람 열끗이 7장 이상 (모두에게)</td></tr>
      <tr><td>고박</td><td>고를 했다가 상대가 나면: 맞고는 두 배, 셋이는 고한 사람이 진 사람 몫을 혼자 다 내요</td></tr>
      <tr><td>흔들기·폭탄</td><td>이긴 사람이 한 번마다 두 배</td></tr>
    </table>
    <p class="small">점수는 놀이용 점과 🪙 냥코인으로만 쌓여요. 패 왼쪽 위 숫자는 달, 작은 동그라미는 광·끗(열끗)·띠·쌍(쌍피)이에요.</p>
  </div>`;
  function showRules() { sfx('tap'); return C.modal({ title: '📖 고스톱 규칙', html: RULES_HTML, buttons: [{ label: '처음 안내', onClick: () => { setTimeout(() => showHowto(true), 30); } }, { label: '닫기', primary: true }], dismiss: true, cls: 'rulesov' }); }
  function showHowto(force) {
    return C.howto('gostop', '🎴 고스톱 하는 법', [
      '같은 달(같은 그림)끼리 짝을 맞춰 가져와요',
      '손패를 누르면 짝이 되는 바닥 패가 반짝여요. 한 번 더 누르면 내요 (바닥 패를 눌러도 돼요)',
      '내고 나면 더미에서 한 장이 저절로 뒤집혀요',
      '광·열끗·띠·피를 모아 맞고는 7점, 셋이면 3점부터 <b>고</b>(계속)·<b>스톱</b>(끝내기)',
      '패 왼쪽 위 숫자는 달, 작은 동그라미는 광·끗·띠·쌍(쌍피). 노란 표가 붙은 손패는 바닥에 짝이 있어요',
    ], { force: !!force });
  }

  // ── 화면 전환 ─────────────────────────────────────────────
  function show(which) {
    $('home').hidden = which !== 'home';
    $('play').hidden = which !== 'play';
    document.body.classList.toggle('playing', which === 'play');
  }
  function goHome() {
    if (SES) SES.dispose();
    SES = null;
    $('goBox').hidden = true; $('resBox').hidden = true; $('pop').hidden = true;
    $('layer').innerHTML = '';
    $('stage').querySelectorAll('.hud').forEach(e => e.remove());
    show('home'); drawMenu();
  }

  // ── AI 일꾼 (🐯 은 Web Worker 에서) ─────────────────────────
  let worker = null, wid = 0;
  const wjobs = new Map();
  try {
    worker = new Worker('ai-worker.js?v=2');
    worker.onmessage = e => { const j = wjobs.get(e.data.id); if (j) { wjobs.delete(e.data.id); j(e.data.a); } };
    worker.onerror = () => { worker = null; for (const j of wjobs.values()) j(-1); wjobs.clear(); };
  } catch (e) { worker = null; }
  const rand32 = () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } };
  function aiChoose(v, tier) {
    const seed = rand32();
    const local = () => AI.choose(v, tier, { seed, samples: tier === 'hard' ? 80 : 0 });
    if (tier !== 'hard' || !worker) return Promise.resolve(local());
    return new Promise(res => {
      const id = ++wid;
      const to = setTimeout(() => { if (wjobs.delete(id)) res(local()); }, 4000);
      wjobs.set(id, a => { clearTimeout(to); res(a >= 0 ? a : local()); });
      worker.postMessage({ id, view: v, tier, seed, ms: 320 });
    }).then(a => (G.isLegal(v, a) ? a : AI.choose(v, 'normal', { seed })));
  }

  // ── 한 판 (세션) ─────────────────────────────────────────
  class Cancel extends Error {}
  let SES = null;
  function newSession(cfg) {
    const ses = { cfg, alive: true, timers: new Set(), waiters: [], modals: [], pending: null, paused: false, S: null, seats: [], sel: -1, pre: -1, net: null, seq: 0, actQ: [], actWaiters: [], who: G.tablePlan(cfg.N, 0).who, bench: [], spec: false, hot: !!cfg.hot, hide: !!cfg.hot, panel: null, coachOn: false, coachHtml: null };
    ses.wait = ms => new Promise((res, rej) => {
      if (!ses.alive) return rej(new Cancel());
      const t = setTimeout(() => { ses.timers.delete(t); if (ses.alive) res(); else rej(new Cancel()); }, Math.max(0, ms));
      ses.timers.add(t);
    });
    ses.check = () => { if (!ses.alive) throw new Cancel(); };
    // 탭이 숨었거나 멈춤이면 기다림
    ses.ready = () => new Promise((res, rej) => {
      const go = () => { if (!ses.alive) return rej(new Cancel()); if (document.hidden || ses.paused) { ses.waiters.push(go); return; } res(); };
      go();
    });
    ses.wake = () => { const w = ses.waiters.splice(0); w.forEach(f => f()); };
    ses.dispose = () => {
      ses.alive = false;
      if (ses.panel) { try { ses.panel.destroy(); } catch (e) {} ses.panel = null; }
      hotClose();
      if (ses.net) { try { ses.net.leave(); } catch (e) {} ses.net = null; }
      for (const t of ses.timers) clearTimeout(t);
      ses.timers.clear();
      if (ses.pending) { const p = ses.pending; ses.pending = null; p.reject(new Cancel()); }
      for (const w of ses.actWaiters.splice(0)) { try { w.reject(new Cancel()); } catch (e) {} }
      for (const close of ses.modals.splice(0)) { try { close(); } catch (e) {} }
      ses.wake();
      document.querySelectorAll('.overlay:not(#goBox):not(#resBox)').forEach(o => o.remove());
    };
    return ses;
  }
  document.addEventListener('visibilitychange', () => { if (SES) SES.wake(); });
  const speedKey = () => (SES && SES.cfg.watch ? 'wSpeed' : 'speed');
  const SP = () => SPEEDS[opt[speedKey()]] || SPEEDS.normal;
  let FAST = 0;                                            // 시험용: 움직임 시간 줄이기
  const D = ms => (FAST ? 1 : Math.round(ms * SP().mul));

  let startSeed = 0;                                       // 시험용: 첫 판 씨앗을 정할 때
  function startGame({ watch }) {
    if (SES) SES.dispose();
    const n = watch ? opt.wMode : opt.mode;
    const cfg = { watch, N: n, bonus: watch ? 2 : opt.bonus, seed: startSeed, me: watch ? -1 : 0 };
    startSeed = 0;
    const ses = SES = newSession(cfg);
    const used = {};
    const mk = (tier) => { const t = TIER[tier]; used[tier] = (used[tier] || 0) + 1; return { ctrl: 'ai', tier, name: t.names[(used[tier] - 1) % t.names.length], em: t.em }; };
    if (watch) ses.seats = Array.from({ length: n }, (_, i) => mk(opt.wTiers[i] || 'normal'));
    else ses.seats = [{ ctrl: 'me', tier: null, name: '나', em: '나' }].concat(Array.from({ length: n - 1 }, () => mk(opt.tier)));
    ses.coachOn = !!opt.coach;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }

  // 한 기기에서 여럿: 사람 자리마다 차례가 오면 덮개 → 그 사람만 패를 봄. 점수·코인은 안 쌓음
  function startHotSeat() {
    const picks = hotSeats(), N = picks.length;
    if (N < 2 || N > 5 || !picks.some(s => s.human)) return C.toast('사람이 한 명은 있어야 해요');
    if (SES) SES.dispose();
    const cfg = { watch: false, hot: true, N, bonus: opt.bonus, seed: startSeed, me: picks.findIndex(s => s.human) };
    startSeed = 0;
    const ses = SES = newSession(cfg);
    const used = {};
    ses.seats = picks.map((k, i) => {
      if (k.human) return { ctrl: 'me', tier: null, name: k.name || `플레이어${i + 1}`, em: k.em || '🙂' };
      const t = TIER[k.tier] || TIER.normal; used[k.tier] = (used[k.tier] || 0) + 1;
      return { ctrl: 'ai', tier: TIER[k.tier] ? k.tier : 'normal', name: t.names[(used[k.tier] - 1) % t.names.length], em: t.em };
    });
    ses.coachOn = false;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }

  function startOnline({ net, role, cfg, players }) {
    if (SES) SES.dispose();
    // 자리 순서: 방장 먼저, 그다음 들어온 순서 (모든 화면이 똑같이 계산)
    const host = net.meta && net.meta.host;
    const plist = Object.entries(players || {}).filter(([, p]) => !(p && p.watch)).map(([uid, p]) => Object.assign({ uid }, p))
      .sort((x, y) => (y.uid === host) - (x.uid === host) || (x.t || 0) - (y.t || 0) || (x.uid < y.uid ? -1 : 1));
    const N = Math.max(2, Math.min(5, plist.length));
    const myIdx = plist.findIndex(p => p.uid === net.uid);
    const sesCfg = { watch: false, online: true, role, N, bonus: (cfg && cfg.bonus) || 0, seed: (cfg && cfg.seed) || 12345, me: myIdx, coach: !!(cfg && cfg.coach) };
    const ses = SES = newSession(sesCfg);
    ses.net = net;
    const AV = ['🎴', '🌸', '🌕', '🍀', '🔥'];
    ses.seats = plist.slice(0, N).map((pl, i) => ({ ctrl: i === myIdx ? 'me' : 'remote', tier: null, name: i === myIdx ? (pl.name || '나') : (pl.name || `친구${i + 1}`), em: i === myIdx ? '나' : AV[i % AV.length], uid: pl.uid }));
    const pushAct = (m) => {
      if (!m || m.t !== 'act') return;
      if (m.seq != null && m.seq < ses.seq) return;
      if (ses.actWaiters.length) {
        const w = ses.actWaiters.shift();
        w.resolve(m.a);
      } else {
        ses.actQ.push(m.a);
      }
      if (role === 'host') net.broadcast(m);
    };
    if (role === 'host') net.on('msg', (_uid, m) => pushAct(m));
    else net.on('msg', m => pushAct(m));
    net.sendAct = (a) => {
      const m = { t: 'act', seq: ses.seq, a };
      if (role === 'host') net.broadcast(m);
      else net.send(m);
    };
    ses.coachOn = sesCfg.coach;
    show('play');
    setupCoach(ses);
    drawDock();
    runMatch(ses);
  }
  Cozy.backGuard($('backBtn'), () => { sfx('tap'); goHome(); });

  async function runMatch(ses) {
    try {
      const baseSeed = (ses.cfg.seed || rand32()) >>> 0;
      let s = G.create({ players: ses.cfg.N, bonus: ses.cfg.bonus, seed: baseSeed, first: 0 });
      for (;;) {
        await playRound(ses, s);
        const next = await showResult(ses);
        if (next && typeof next === 'object' && next.drillState) {
          s = G.fastClone(next.drillState);
          ses.isDrill = true;
          continue;
        }
        ses.isDrill = false;
        if (next !== 'next') { goHome(); return; }
        const rSeed = ses.cfg.online ? ((baseSeed + (ses.S.round + 1) * 0x9e3779b9) >>> 0) : rand32();
        s = G.nextRound(ses.S, { seed: rSeed });
      }
    } catch (e) {
      if (e instanceof Cancel) return;
      console.error(e);
      if (SES === ses) { C.toast('앗, 문제가 생겼어요. 메뉴로 돌아갈게요'); goHome(); }
    }
  }

  // ── 자리 · 이름표 (HUD) ───────────────────────────────────
  const GROUP_NAME = ['광', '끗', '띠', '피'];
  // 이번 판의 자리(state 번호 p) ↔ 방 자리(ses.seats 번호): s.who[p]. 쉬는 사람은 meSeat = -1 (구경)
  // 한 기기 여럿(hot)이면 cfg.me 는 '지금 화면을 보는 사람' (차례가 바뀔 때 덮개 뒤에서 바뀜)
  const nOf = ses => (ses.S ? ses.S.n : ses.cfg.N === 2 ? 2 : 3);
  const meSeat = ses => (ses.cfg.watch ? -1 : ses.who.indexOf(ses.cfg.me ?? 0));
  const seatAt = (ses, p) => ses.seats[ses.who[p]];
  const tname = (ses, seat) => (seat === ses.cfg.me && !ses.cfg.watch && !ses.hot ? '나' : ses.seats[seat].name);
  function seatPos(ses, p) {
    const me = meSeat(ses), n = nOf(ses);
    const rel = me >= 0 ? (p - me + n) % n : p;
    return rel === 0 ? 'bottom' : n === 2 ? 'top' : rel === 1 ? 'right' : 'left';
  }
  function buildHud(ses) {
    const st = $('stage'), me = meSeat(ses);
    st.querySelectorAll('.hud').forEach(e => e.remove());
    ses.hud = [];
    for (let p = 0; p < nOf(ses); p++) {
      const s = seatAt(ses, p), isBottom = seatPos(ses, p) === 'bottom';
      const seat = document.createElement('div');
      seat.className = 'seat hud' + (isBottom ? ' mine' : '');
      seat.innerHTML = `<span class="av"${p === me && !ses.cfg.watch ? ' style="background:var(--accent);color:#fff;font:15px var(--round)"' : ''}>${esc(s.em)}</span><span class="nm">${esc(s.name)}</span><span class="sc">0점</span><span class="tags"></span>`;
      st.appendChild(seat);
      const labels = GROUP_NAME.map(() => { const l = document.createElement('span'); l.className = 'glbl hud'; st.appendChild(l); return l; });
      const hc = document.createElement('span'); hc.className = 'hcount hud'; hc.hidden = true; st.appendChild(hc);
      ses.hud.push({ seat, labels, hc });
    }
    const mode = G.modeOf(ses.cfg.N).name;
    if (ses.cfg.watch) $('lbl').textContent = '🍿 AI 구경';
    else if (ses.hot) $('lbl').textContent = `📱 한 기기 ${mode}`;
    else if (ses.cfg.online) $('lbl').textContent = `👥 친구랑 ${mode} (${ses.net.code})`;
    else $('lbl').textContent = `${mode} · ${TIER[ses.seats[1].tier].em} ${TIER[ses.seats[1].tier].name}`;
    // 쉬는 사람 (4~5명)
    const bb = $('benchBar');
    if (ses.bench.length) {
      bb.hidden = false;
      bb.innerHTML = '💤 쉬는 사람: ' + ses.bench.map(b => `<b>${esc(tname(ses, b))}</b>`).join(' · ') + (ses.spec && !ses.hot ? ' <span>— 구경 중</span>' : '');
    } else bb.hidden = true;
    drawCoinPill();
  }
  function drawCoinPill() { $('coinPill').textContent = '🪙 ' + fmtN(coins); }
  function drawHud(ses) {
    const s = ses.S; if (!s || !ses.hud) return;
    const shown = { cap: VM ? VM.cap : s.cap, kook: s.kook };        // 움직임이 끝난 패 기준 (점수가 먼저 바뀌지 않게)
    for (let p = 0; p < s.n; p++) {
      const h = ses.hud[p], t = G.tally(shown, p);
      const scEl = h.seat.querySelector('.sc');
      scEl.textContent = t.base + '점';
      // 점수가 오르면 점수 위로 '+N' 이 둥실
      if (h.last != null && t.base > h.last && s.phase !== 'end') {
        const f = document.createElement('span'); f.className = 'floatup'; f.textContent = '+' + (t.base - h.last);
        scEl.appendChild(f); setTimeout(() => f.remove(), 950);
        scEl.classList.remove('bump'); void scEl.offsetWidth; scEl.classList.add('bump');
        if (p === meSeat(ses)) sfx('coin');
      }
      h.last = t.base;
      const tags = [];
      if (s.go[p]) tags.push(`<span class="tag go">${s.go[p]}고</span>`);
      if (s.shake[p]) tags.push(`<span class="tag sh">${s.shake[p] > 1 ? '×' + Math.pow(2, s.shake[p]) : '흔듦'}</span>`);
      if (s.ppeok[p]) tags.push(`<span class="tag pp">뻑${s.ppeok[p]}</span>`);
      h.seat.querySelector('.tags').innerHTML = tags.join('');
      h.seat.classList.toggle('turn', s.phase !== 'end' && (ses.actor != null ? ses.actor === p : s.turn === p));
      const cnt = [t.g, t.y, t.t, t.pi];
      const hot = [t.gwang > 0, t.yeol > 0 || t.godori > 0, t.tti > 0 || t.dan > 0, t.piPts > 0];
      h.labels.forEach((l, gi) => { l.innerHTML = `${GROUP_NAME[gi]} <b>${cnt[gi]}</b>`; l.classList.toggle('hot', hot[gi]); });
    }
    for (let p = 0; p < s.n; p++) { if (seatPos(ses, p) === 'bottom') continue; const hc = ses.hud[p].hc, k = VM ? VM.hand[p].length : s.hands[p].length; hc.hidden = !!(ses.cfg.watch || ses.spec) || !k; hc.textContent = k; }
    $('deckN').textContent = s.deck.length ? `더미 ${s.deck.length}` : '';
    const me = meSeat(ses);
    let sub = '';
    if (s.phase === 'end') sub = '판 끝';
    else if (s.phase === 'buy') sub = s.turn === me && !ses.hide ? '광을 살까요?' : `광 팔기 · ${seatAt(ses, s.turn).name}`;
    else if (ses.actor != null) sub = ses.actor === me && !ses.hot ? '내 차례' : `${seatAt(ses, ses.actor).name} 차례`;   // 움직이는 동안은 지금 두는 사람
    else if (s.turn === me) sub = s.phase === 'goStop' ? '고? 스톱?' : s.phase === 'kook' ? '국진을 어디에?' : s.phase.startsWith('pick') ? '가져올 패를 골라요' : '내 차례 · 패를 골라요';
    else sub = `${seatAt(ses, s.turn).name} 차례`;
    if (s.carry) sub += ` · 나가리 ×${Math.pow(2, s.carry)}`;
    $('sub').textContent = `${s.round}판 · ${sub}`;
    $('passBtn').hidden = !(s.phase === 'play' && s.turn === me && me >= 0 && s.pass[me] > 0 && ses.pending && !ses.pending.isResult);
    if (!$('passBtn').hidden) $('passN').textContent = s.pass[me];
  }
  function setThinking(ses, p, on) { const h = ses.hud && ses.hud[p]; if (!h) return; h.seat.querySelector('.nm').classList.toggle('thinking', on); h.seat.classList.toggle('busy', on); }

  // ── 자리 계산 (화면 크기에 맞춰) ─────────────────────────────
  let GEO = null;
  function layout(ses) {
    const st = $('stage'), W = st.clientWidth, H = st.clientHeight;
    if (!W || !H) return;
    const n = nOf(ses), nh = n === 2 ? 10 : 7, land = W > H * 1.22;
    const gap = 8;
    const geo = { W, H, n, land, watch: !!(ses.cfg.watch || ses.spec), wrow: 0 };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    if (!land) {
      // 세로: 위 상대 · 바닥 · 내가 먹은 패 · 내 손패
      const handSpan = nh === 10 ? 5.7 : 4.9;
      const k = n === 2 ? 0.64 : 0.5;
      let u = Math.min((H - 80) / (1.82 + 0.74 + k + 4.0), W / handSpan, W / 5.6);
      u = clamp(u, 34, 96);
      const hw = u, hh = hw * 1.6, lift = hh * 0.14;
      const mw = clamp(u * 0.46, 18, 40), ow = clamp(u * (n === 2 ? 0.42 : 0.33), 15, 34);
      geo.wrow = geo.watch ? ow * 1.25 * 1.6 + 8 : 0;                 // AI 구경: 상대 손패를 펼쳐 보이는 줄
      const handH = hh + lift + 2, capH = 16 + mw * 1.6, oppH = 34 + geo.wrow + ow * 1.6 + 4;
      const tableH = H - handH - capH - oppH - gap * 3;
      geo.opp = { x: 0, y: 0, w: W, h: oppH };
      geo.table = { x: 0, y: oppH + gap, w: W, h: tableH };
      geo.mine = { x: 0, y: oppH + gap + tableH + gap, w: W, h: capH };
      geo.hand = { x: 0, y: H - handH, w: W, h: handH, cw: hw, lift };
      geo.mw = mw; geo.ow = ow;
      geo.cols = 5; geo.rows = 3; geo.deckCell = 7;
    } else {
      // 가로: 왼쪽 판(상대·내가 먹은 패) · 오른쪽(바닥 위, 손패 아래)
      const LW = clamp(W * 0.3, 190, 330);
      const MW = W - LW - gap;
      let u = Math.min((H - 12) / (1.82 + 2.85), MW / 5.7, MW / 7.6);
      u = clamp(u, 34, 92);
      const hw = u, hh = hw * 1.6, lift = hh * 0.12, handH = hh + lift + 2;
      geo.table = { x: LW + gap, y: 0, w: MW, h: H - handH - gap };
      geo.hand = { x: LW + gap, y: H - handH, w: MW, h: handH, cw: hw, lift };
      const oppH = n === 2 ? H * 0.5 - gap / 2 : H * 0.62 - gap / 2;
      geo.opp = { x: 0, y: 0, w: LW, h: oppH };
      geo.mine = { x: 0, y: oppH + gap, w: LW, h: H - oppH - gap };
      geo.mw = n === 3 ? clamp(Math.min(u * 0.5, (geo.mine.h - 34 - 16 - 8) / 1.6, LW / 4 / 1.3), 13, 36) : clamp(Math.min(u * 0.5, (geo.mine.h - 70) / 2 / 1.6), 14, 38);
      geo.ow = clamp(Math.min(u * (n === 2 ? 0.46 : 0.34), n === 2 ? (oppH - 70) / 2 / 1.6 : (oppH / 2 - 4 - 34 - 16 - 6) / 1.6), 12, 34);
      if (geo.watch) {
        const avail = n === 2 ? oppH - 34 - 32 - 10 : oppH / 2 - 4 - 34 - 16 - 8;
        geo.ow = clamp(avail / (1.6 * ((n === 2 ? 2 : 1) + 1.25)), 11, 30);
        geo.wrow = geo.ow * 1.25 * 1.6 + 6;
      }
      geo.cols = 7; geo.rows = 2; geo.deckCell = -1;
    }
    // 바닥 칸 (월마다 한 칸) + 더미 자리
    const T = geo.table;
    const slots = [];
    let deck;
    if (!land) {
      const cw = T.w / geo.cols, ch = T.h / geo.rows;
      for (let r = 0; r < geo.rows; r++) for (let c = 0; c < geo.cols; c++) {
        const cell = r * geo.cols + c, x = T.x + cw * (c + 0.5), y = T.y + ch * (r + 0.5);
        if (cell === geo.deckCell) deck = { x, y }; else slots.push({ x, y });
      }
      geo.tw = Math.min(cw / 1.5, ch / 1.6 / 1.12, geo.hand.cw * 0.86);
    } else {
      // 더미는 가운데 칸, 양옆에 세 칸씩 두 줄 = 열두 칸
      const cw = T.w / geo.cols, ch = T.h / geo.rows;
      deck = { x: T.x + cw * 3.5, y: T.y + T.h / 2 };
      for (let r = 0; r < geo.rows; r++) for (let c = 0; c < geo.cols; c++) if (c !== 3) slots.push({ x: T.x + cw * (c + 0.5), y: T.y + ch * (r + 0.5) });
      geo.tw = Math.min(cw / 1.42, ch / 1.6 / 1.1, geo.hand.cw * 0.86);
    }
    // 가운데(더미)에 가까운 칸부터 채움
    slots.forEach((sl, i) => { sl.i = i; sl.d = Math.hypot((sl.x - deck.x) / T.w, (sl.y - deck.y) / T.h * 0.8) + (sl.y > deck.y ? 0.001 : 0); });
    geo.slotOrder = slots.slice().sort((a, b) => a.d - b.d).map(s => s.i);
    geo.slots = slots; geo.deck = deck;
    // 먹은 패 자리 (사람마다 광·끗·띠·피 네 묶음)
    geo.cap = []; geo.seat = []; geo.oppHand = [];
    for (let p = 0; p < n; p++) geo.cap.push(capArea(geo, ses, p));
    GEO = geo;
    // 영역 상자
    const put = (el, r) => { el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px'; };
    put($('zTable'), geo.table); put($('zOpp'), geo.opp); put($('zMine'), geo.mine); put($('zHand'), geo.hand);
    $('deckN').style.left = (deck.x - geo.table.x) + 'px';
    $('deckN').style.top = (deck.y - geo.table.y + geo.tw * 0.8 + 6) + 'px';
    placeHud(ses);
  }
  // p 의 먹은 패 네 묶음 자리 + 이름표 자리 + (상대) 손패 자리
  function capArea(geo, ses, p) {
    const n = geo.n, pos = seatPos(ses, p);
    let box, w, cols, infoAt;
    let left = 0;
    if (pos === 'bottom') {
      box = geo.mine; w = geo.mw;
      if (geo.land) { cols = n === 3 ? 4 : 2; infoAt = { x: box.x + 2, y: box.y + 2 }; }
      else { cols = 4; infoAt = { x: box.x + 2, y: box.y + 4, vert: true }; left = 50; }
    } else {
      w = geo.ow;
      const o = geo.opp;
      if (n === 2) { box = { x: o.x, y: o.y, w: o.w, h: o.h }; cols = geo.land ? 2 : 4; }
      else if (!geo.land) { const half = o.w / 2 - 4; box = { x: pos === 'left' ? o.x : o.x + o.w / 2 + 4, y: o.y, w: half, h: o.h }; cols = 4; }
      else { const half = o.h / 2 - 4; box = { x: o.x, y: pos === 'left' ? o.y + o.h / 2 + 4 : o.y, w: o.w, h: half }; cols = 4; }
      infoAt = { x: box.x + 2, y: box.y + 2 };
    }
    const h = w * 1.6;
    const infoH = infoAt && !infoAt.vert ? 34 + (pos !== 'bottom' ? geo.wrow : 0) : 0;
    const top = box.y + infoH + (pos === 'bottom' && !geo.land ? 14 : 16);
    const rows = Math.ceil(4 / cols);
    const gw = box.w / cols;
    const groups = [];
    for (let gi = 0; gi < 4; gi++) {
      const c = gi % cols, r = Math.floor(gi / cols);
      const gx = box.x + c * gw + 4, gy = top + r * (h + 16);
      const width = gw - 8;
      groups.push({ x: gx, y: gy, w: width, h, cx: gx + width / 2 });
    }
    // 4묶음이 한 줄일 때 피 묶음은 넓게 (피가 많음)
    if (cols === 4) {
      const share = [0.21, 0.25, 0.25, 0.29], tot = box.w - 8 - left;
      let x = box.x + 4 + left;
      groups.forEach((g, gi) => { g.x = x + 2; g.w = tot * share[gi] - 6; g.cx = g.x + g.w / 2; x += tot * share[gi]; });
    }
    return { box, w, h, groups, infoAt, rows };
  }
  function placeHud(ses) {
    const geo = GEO;
    for (let p = 0; p < nOf(ses); p++) {
      const h = ses.hud[p], ca = geo.cap[p];
      const seat = h.seat;
      seat.style.left = ca.infoAt.x + 'px'; seat.style.top = ca.infoAt.y + 'px';
      seat.classList.toggle('vert', !!ca.infoAt.vert);
      ca.groups.forEach((g, gi) => { const l = h.labels[gi]; l.style.left = g.cx + 'px'; l.style.top = (g.y - 14) + 'px'; });
      // 상대 손패(뒷면) 자리: 이름표 오른쪽
      if (seatPos(ses, p) !== 'bottom' || geo.watch) geo.oppHand[p] = null;
    }
    // 상대 손패 부채: 이름표 오른쪽 끝
    for (let p = 0; p < nOf(ses); p++) {
      if (seatPos(ses, p) === 'bottom') continue;
      const ca = geo.cap[p], box = ca.box;
      const bw = Math.max(12, Math.min(geo.land ? 18 : 24, geo.ow * 0.8));
      const infoW = ses.hud[p].seat.offsetWidth || 150;            // 이름·점수가 차지한 너비만큼 비켜서
      const maxW = Math.max(bw + 4, Math.min(96, box.w - infoW - 12));
      geo.oppHand[p] = geo.watch ? { row: true, x0: box.x + 6, y: box.y + 34 + geo.wrow / 2 - 2, cw: geo.ow * 1.25, maxW: box.w - 12 }
        : { x1: box.x + box.w - 4, y: box.y + 15, bw, maxW };
      const hc = ses.hud[p].hc;
      hc.style.left = (box.x + box.w - 4) + 'px'; hc.style.top = (box.y + 15 - bw * 0.8 - 6) + 'px';
    }
  }

  // ── 패 요소 · 화면 속 자리 모형 (VM) ──────────────────────────
  // VM: 각 패가 지금 화면 어디에 있는지 (규칙 상태와 따로, 움직임 중간 모습까지)
  let VM = null;
  const els = {};
  function buildCards(ses) {
    const layer = $('layer');
    layer.innerHTML = '';
    for (const k in els) delete els[k];
    for (const id of G.gameCards(ses.S.bonus)) {
      const el = document.createElement('div');
      el.className = 'hw down';
      el.dataset.id = id;
      el.innerHTML = `<div class="bob"><span class="ev-badge" hidden></span><div class="in">${ART.use(id, 'f')}${ART.use(-1, 'b')}</div></div>`;
      layer.appendChild(el);
      els[id] = el;
    }
  }
  function vmFromState(s) {
    VM = { hand: s.hands.map(h => h.slice()), deck: s.deck.slice(), cap: s.cap.map(c => c.slice()), slots: new Array(GEO.slots.length).fill(null), fly: {} };
    for (const c of s.table) vmTable(c);
  }
  function vmRemove(id) {
    for (const h of VM.hand) { const i = h.indexOf(id); if (i >= 0) { h.splice(i, 1); return; } }
    { const i = VM.deck.indexOf(id); if (i >= 0) { VM.deck.splice(i, 1); return; } }
    for (const c of VM.cap) { const i = c.indexOf(id); if (i >= 0) { c.splice(i, 1); return; } }
    VM.slots.forEach((sl, si) => { if (!sl) return; const i = sl.ids.indexOf(id); if (i >= 0) { sl.ids.splice(i, 1); if (!sl.ids.length) VM.slots[si] = null; } });
    delete VM.fly[id];
  }
  function vmTable(id) {
    const m = G.monthOf(id);
    let si = VM.slots.findIndex(sl => sl && sl.m === m);
    if (si < 0) { si = GEO.slotOrder.find(i => !VM.slots[i]); if (si == null) si = 0; VM.slots[si] = { m, ids: [] }; }
    VM.slots[si].ids.push(id);
    return si;
  }
  const capGroup = (s, c) => (c === G.KOOK ? (s.kook === 'P' ? 3 : 1) : G.isBonus(c) ? 3 : [0, 1, 2, 3][G.KIND[c]]);
  // 모든 패의 목표 자리 계산
  function targets(ses) {
    const s = ses.S, geo = GEO, out = {};
    const me = meSeat(ses), watch = ses.cfg.watch;
    // 더미
    const ds = geo.tw / 100;
    VM.deck.forEach((id, i) => { out[id] = { x: geo.deck.x - i * 0.25, y: geo.deck.y - i * 0.35, s: ds, r: 0, z: 10 + i, up: false }; });
    // 바닥
    VM.slots.forEach((sl, si) => {
      if (!sl) return;
      const c = geo.slots[si], k = sl.ids.length;
      sl.ids.forEach((id, j) => {
        const off = j - (k - 1) / 2;
        out[id] = { x: c.x + off * geo.tw * 0.32, y: c.y + off * geo.tw * 0.1, s: geo.tw / 100, r: k > 1 ? off * 4 : 0, z: 60 + j, up: true };
      });
    });
    // 손패
    for (let p = 0; p < s.n; p++) {
      const h = VM.hand[p];
      if (seatPos(ses, p) === 'bottom') {
        const H = geo.hand, cw = H.cw, n = h.length;
        const myTurn = !!ses.pending && !ses.pending.isResult && s.phase === 'play' && s.turn === me;
        const tm = new Set(); VM.slots.forEach(sl => { if (sl) tm.add(sl.m); });
        const step = n > 1 ? Math.min(cw * 1.05, (H.w - cw - 8) / (n - 1)) : 0;
        const x0 = H.x + H.w / 2 - (step * (n - 1)) / 2;
        h.forEach((id, i) => {
          const lift = id === ses.sel ? H.lift : (myTurn && tm.has(G.monthOf(id)) ? H.lift * 0.32 : 0) + (id === ses.hover ? H.lift * 0.3 : 0);
          out[id] = { x: x0 + i * step, y: H.y + H.h - cw * 0.8 - 2 - lift, s: cw / 100, r: 0, z: id === ses.sel ? 330 : 200 + i, up: !!(watch || (me === p && !ses.hide)) };
        });
      } else {
        const oh = geo.oppHand[p], n = h.length, bw = oh.bw;
        if (oh.row) {   // AI 구경: 이름표 아래 줄에 펼쳐서
          const cw = oh.cw, st3 = n > 1 ? Math.min(cw * 1.04, (oh.maxW - cw) / (n - 1)) : 0;
          h.forEach((id, i) => { out[id] = { x: oh.x0 + cw / 2 + i * st3, y: oh.y, s: cw / 100, r: 0, z: 150 + i, up: !ses.spec }; });
          continue;
        }
        const showAll = watch;
        const known = new Set(s.known[p] || []);
        const step = Math.min(bw * 0.55, (oh.maxW - bw) / Math.max(1, n - 1));
        const sc = (showAll ? Math.max(bw, geo.ow) : bw) / 100;
        const st2 = showAll ? Math.min(geo.ow * 0.62, (geo.cap[p].box.w * 0.42) / Math.max(1, n)) : step;
        h.forEach((id, i) => {
          out[id] = { x: oh.x1 - (n - 1 - i) * st2 - (showAll ? geo.ow : bw) / 2, y: oh.y + (showAll ? 2 : 0), s: sc, r: 0, z: 150 + i, up: showAll || known.has(id) };
        });
      }
    }
    // 먹은 패
    for (let p = 0; p < s.n; p++) {
      const ca = geo.cap[p], groups = [[], [], [], []];
      for (const id of VM.cap[p]) groups[capGroup(s, id)].push(id);
      groups.forEach((ids, gi) => {
        const g = ca.groups[gi], k = ids.length, w = ca.w;
        const step = k > 1 ? Math.min(w * 0.62, (g.w - w) / (k - 1)) : 0;
        ids.forEach((id, j) => { out[id] = { x: g.x + w / 2 + j * step, y: g.y + ca.h / 2, s: w / 100, r: 0, z: 20 + j, up: true }; });
      });
    }
    return out;
  }
  const TF = t => `translate(${(t.x - 50).toFixed(1)}px,${(t.y - 80).toFixed(1)}px) rotate(${(t.r || 0).toFixed(1)}deg) scale(${t.s.toFixed(4)})`;
  // 한 장 움직이기 (WAAPI). arc: 들어 올리는 높이
  function moveTo(id, t, o) {
    o = o || {};
    const el = els[id]; if (!el) return Promise.resolve();
    const from = el._t;
    const to = TF(t);
    if (from && o.dur && TF(from) === to && (!from.up) === (!t.up) && !o.force) { el._t = t; el.style.zIndex = t.z; return Promise.resolve(); }
    el._t = t;
    el.classList.toggle('down', !t.up);
    el.style.zIndex = o.z || t.z;
    if (!from || !o.dur) { el.style.transform = to; if (!o.keepZ) el.style.zIndex = t.z; return Promise.resolve(); }
    const kf = [{ transform: TF(from) }];
    if (o.arc) kf.push({ transform: TF({ x: (from.x + t.x) / 2, y: (from.y + t.y) / 2 - o.arc, s: Math.max(from.s, t.s) * (o.grow || 1.1), r: ((from.r || 0) + (t.r || 0)) / 2 }), offset: 0.5 });
    kf.push({ transform: to });
    el.style.transform = to;
    let a;
    try { a = el.animate(kf, { duration: o.dur, delay: o.delay || 0, easing: o.ease || 'cubic-bezier(.25,.8,.3,1)', fill: 'backwards' }); } catch (e) { return Promise.resolve(); }
    return a.finished.then(() => { if (el._t === t) el.style.zIndex = t.z; }, () => {});
  }
  function bounce(id, big) {
    const el = els[id]; if (!el) return;
    try { el.querySelector('.bob').animate([{ transform: `scale(${big ? 1.16 : 1.1})` }, { transform: 'scale(.94)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], { duration: D(300), easing: 'ease-out' }); } catch (e) {}
  }
  function flash(id) { const el = els[id]; if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 520); }
  // 화면 전체를 VM 에 맞춤 (dur 0 = 바로)
  function syncAll(ses, dur, skip) {
    if (!GEO || !VM) return Promise.resolve();
    const T = targets(ses), ps = [];
    for (const id in T) { if (skip && skip.has(+id)) continue; if (VM.fly[id]) continue; ps.push(moveTo(+id, T[id], dur ? { dur } : null)); }
    for (const id in els) els[id].classList.toggle('gone', !T[id] && !VM.fly[id]);
    drawHud(ses); markHand(ses);
    return Promise.all(ps);
  }
  addEventListener('resize', onResize);
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
  // 무대 크기가 바뀌면(글꼴이 늦게 와서 위 줄 높이가 바뀌는 것 포함) 다시 맞춤
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('stage'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  let rsT = 0, lastWH = '';
  function onResize() {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      if (!SES || !SES.S || $('play').hidden || !VM) return;
      const st = $('stage'), wh = st.clientWidth + 'x' + st.clientHeight;
      if (wh === lastWH) return;
      lastWH = wh; layout(SES); syncAll(SES, 0);
    }, 50);
  }

  // ── 큰 글씨 알림 (차례대로) ──────────────────────────────────
  let popQ = Promise.resolve();
  function popup(text, cls, sub) {
    const p = popQ.then(() => new Promise(res => {
      const d = $('pop');
      d.className = 'combo ' + (cls || '');
      d.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
      d.hidden = false;
      void d.offsetWidth; d.classList.add('go');
      clearTimeout(d._t); d._t = setTimeout(() => { d.hidden = true; }, 1100);
      setTimeout(res, FAST ? 0 : 520);
    }));
    popQ = p;
    return p;
  }
  // 소리 몇 가지 더 (Cozy.sfx 위에)
  C.sfx.add('ppeok', (t, o, S) => { S.tone(t, 420, 0.18, { type: 'triangle', vol: 0.16, f2: 180 }); S.tone(t + 0.12, 300, 0.22, { type: 'sine', vol: 0.14, f2: 120 }); });
  C.sfx.add('bomb', (t, o, S) => { S.noise(t, 0.4, { vol: 0.5, type: 'lowpass', f: 900, f2: 120 }); S.tone(t, 110, 0.35, { type: 'sine', vol: 0.3, f2: 45 }); });
  C.sfx.add('shake', (t, o, S) => { for (let i = 0; i < 4; i++) S.noise(t + i * 0.06, 0.04, { vol: 0.25, type: 'highpass', f: 3000 }); });
  C.sfx.add('steal', (t, o, S) => { S.tone(t, 880, 0.07, { type: 'triangle', vol: 0.12 }); S.tone(t + 0.06, 1320, 0.12, { type: 'triangle', vol: 0.1 }); });
  C.sfx.add('mew', (t, o, S) => { const ac = S.ac; const os = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); os.type = 'sawtooth'; f.type = 'bandpass'; f.Q.value = 3; os.frequency.setValueAtTime(620, t); os.frequency.linearRampToValueAtTime(900, t + 0.1); os.frequency.exponentialRampToValueAtTime(560, t + 0.32); f.frequency.setValueAtTime(1000, t); f.frequency.linearRampToValueAtTime(2300, t + 0.1); f.frequency.exponentialRampToValueAtTime(1100, t + 0.32); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); os.connect(f).connect(g).connect(S.ac.destination); os.start(t); os.stop(t + 0.36); });

  // ── 한 판 진행 ───────────────────────────────────────────
  async function playRound(ses, s) {
    ses.S = s; ses.sel = -1; ses.pre = -1; ses.hover = -1;
    ses.turnLog = []; ses.coachCache = null; ses.coachHtml = null; ses.hotLast = -1;
    ses.who = s.who.slice(); ses.bench = s.bench.slice();
    ses.spec = !ses.cfg.watch && ses.who.indexOf(ses.cfg.me) < 0;       // 쉬는 중이면 구경
    if (ses.hot) ses.hide = true;
    if ($('coachBar')) $('coachBar').hidden = true;
    $('resBox').hidden = true; $('goBox').hidden = true;
    buildHud(ses);
    buildCards(ses);
    layout(ses);
    lastWH = $('stage').clientWidth + 'x' + $('stage').clientHeight;
    if (ses.isDrill) {
      vmFromState(s);
      await syncAll(ses, 0);
      C.toast('🧑‍🏫 결정적 장면으로 돌아왔어요! 추천 수를 내 보세요', 2400);
    } else {
      // 처음엔 모두 더미에
      VM = { hand: s.hands.map(() => []), deck: G.gameCards(s.bonus).slice(), cap: s.hands.map(() => []), slots: new Array(GEO.slots.length).fill(null), fly: {} };
      await syncAll(ses, 0);
      await dealAnim(ses);
    }
    while (ses.S.phase !== 'end') {
      await ses.ready();
      const p = ses.S.turn;
      drawHud(ses);
      const ctrl = seatAt(ses, p).ctrl;
      let a;
      if (ses.S.phase === 'buy') await announceOffer(ses);
      if (ctrl === 'me') {
        if (ses.hot) await hotAccept(ses, p);
        const beforePlay = ses.S.phase === 'play' && coachOn(ses) ? G.fastClone(ses.S) : null;
        const coachSnap = beforePlay && AI.coachHand ? AI.coachHand(G.view(ses.S, p)) : null;
        a = await humanTurn(ses);
        if (beforePlay && coachSnap && coachSnap.bestCard >= 0) {
          let chosenCard = -1;
          if (a < G.A_SHAKE) chosenCard = a - G.A_PLAY;
          else if (a >= G.A_SHAKE && a < G.A_BOMB) chosenCard = a - G.A_SHAKE;
          else if (a >= G.A_BOMB && a < G.A_PASS) {
            const bm = a - G.A_BOMB;
            chosenCard = beforePlay.hands[p].find(x => G.monthOf(x) === bm) ?? -1;
          }
          const chInfo = chosenCard >= 0 ? coachSnap.byCard[chosenCard] : null;
          if (chInfo) {
            ses.turnLog.push({
              turnNo: ses.turnLog.length + 1,
              stateBefore: beforePlay,
              chosenCard,
              chosenName: chInfo.name,
              chosenTag: chInfo.tag,
              chosenWhy: chInfo.why,
              delta: chInfo.delta,
              bestCard: coachSnap.bestCard,
              bestName: coachSnap.bestName,
              bestTag: coachSnap.bestTag,
              bestWhy: coachSnap.bestWhy,
            });
          }
        }
        if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
      } else if (ctrl === 'remote') {
        a = await remoteTurn(ses, p);
      } else {
        a = await aiTurn(ses, p);
        if (ses.net && ses.net.sendAct) ses.net.sendAct(a);
      }
      ses.seq++;
      ses.check();
      const { state, events } = G.step(ses.S, a);
      ses.S = state;
      ses.actor = p;
      try { await playEvents(ses, events); } finally { ses.actor = null; }
      ses.check();
      vmFromState(ses.S);                                   // 혹시 어긋났으면 규칙 상태로 맞춤
      await syncAll(ses, D(220));
      // 한 기기 여럿: 다음 차례가 같은 사람이 아니면 패를 다시 가림
      if (ses.hot && !ses.hide) {
        const st = ses.S, keep = st.phase !== 'end' && seatAt(ses, st.turn).ctrl === 'me' && ses.who[st.turn] === ses.hotLast;
        if (!keep) { ses.hide = true; await syncAll(ses, 0); }
      }
    }
    drawHud(ses);
  }

  function remoteTurn(ses, p) {
    setThinking(ses, p, true);
    if (ses.actQ.length) {
      setThinking(ses, p, false);
      return Promise.resolve(ses.actQ.shift());
    }
    return new Promise((resolve, reject) => {
      ses.actWaiters.push({
        resolve: a => { setThinking(ses, p, false); resolve(a); },
        reject: e => { setThinking(ses, p, false); reject(e); },
      });
    });
  }

  // 나누기: 더미에서 바닥 → 손패 순서로 한 장씩
  async function dealAnim(ses) {
    const s = ses.S, order = [];
    const tb = s.table.slice(), half = Math.ceil(tb.length / 2);
    const hands = s.hands.map(h => h.slice());
    const hs = hands.map(h => Math.ceil(h.length / 2));
    const seatOrder = Array.from({ length: s.n }, (_, i) => (s.first + i) % s.n);
    tb.slice(0, half).forEach(c => order.push(['t', c]));
    seatOrder.forEach(p => hands[p].slice(0, hs[p]).forEach(c => order.push(['h', c, p])));
    tb.slice(half).forEach(c => order.push(['t', c]));
    seatOrder.forEach(p => hands[p].slice(hs[p]).forEach(c => order.push(['h', c, p])));
    const stagger = D(42), dur = D(300);
    const ps = [];
    order.forEach(([k, c, p], i) => {
      vmRemove(c);
      if (k === 't') vmTable(c); else { VM.hand[p].push(c); }
      VM.fly[c] = 1;
      ps.push(ses.wait(i * stagger).then(() => {
        delete VM.fly[c];
        const T = targets(ses);
        if (k === 'h') VM.hand[p].sort((a, b) => a - b);
        if (i % 3 === 0) sfx('flip');
        return moveTo(c, T[c], { dur, arc: 10, z: 400 });
      }));
    });
    await Promise.all(ps);
    for (const h of VM.hand) h.sort((a, b) => a - b);
    // 남은 더미·보너스를 상태대로
    vmFromState(s);
    const bonus = s.dealt.bonus;
    if (bonus.length) {
      for (const c of bonus) { vmRemove(c); VM.cap[s.first].push(c); }
      await syncAll(ses, D(380));
      sfx('coin');
      await popup('보너스 피!', 'gold', `${iga(nameOf(ses, s.first))} 선이라 가져가요`);
    } else await syncAll(ses, D(250));
    sfx('slap');
    if (s.result && s.result.kind === 'chongtong') {
      const w = s.result.winner;
      if (w !== meSeat(ses)) for (const c of s.hands[w]) { const el = els[c]; if (el) el.classList.remove('down'); }
      sfx('good');
      await popup('총통!', 'gold', `${(s.result.extra.month + 1)}월 네 장`);
      await ses.wait(D(900));
    }
  }

  // ── 이벤트 → 움직임 · 소리 · 알림 ──────────────────────────────
  const nameOf = (ses, p) => (p === meSeat(ses) && !ses.hot ? '나' : seatAt(ses, p).name);
  async function playEvents(ses, evs) {
    for (const e of evs) {
      ses.check();
      await ses.ready();
      switch (e.t) {
        case 'shake': {
          sfx('shake');
          for (const c of e.cards) { const el = els[c]; if (el) el.classList.remove('down'); bounce(c); }
          await popup('흔들기!', 'gold', `${nameOf(ses, e.p)} · ${e.m + 1}월 세 장 · 이기면 두 배`);
          await ses.wait(D(500));
          break;
        }
        case 'bomb': {
          sfx('bomb'); C.vibrate(30);
          for (const c of e.cards) { vmRemove(c); vmTable(c); }
          const T = targets(ses);
          await Promise.all(e.cards.map((c, i) => moveTo(c, T[c], { dur: D(360), arc: 40, z: 450 + i, delay: i * D(50) })));
          for (const c of e.cards.concat(e.target)) bounce(c, true);
          sfx('slap');
          await popup('폭탄!', '', `${e.m + 1}월 네 장 · 피 한 장씩`);
          break;
        }
        case 'play': {
          vmRemove(e.card); vmTable(e.card);
          const T = targets(ses);
          ses.sel = -1;
          await moveTo(e.card, T[e.card], { dur: D(330), arc: 36, grow: 1.18, z: 480 });
          bounce(e.card, true);
          sfx(e.n ? 'slap' : 'place'); C.vibrate(8);
          await syncAll(ses, D(200), new Set([e.card]));
          break;
        }
        case 'flip': {
          // 더미 맨 위 한 장: 들어서 뒤집고 자리로
          const c = e.card;
          vmRemove(c);
          if (G.isBonus(c)) { VM.fly[c] = 1; }
          else vmTable(c);
          const T = targets(ses);
          const lifted = { x: GEO.deck.x, y: GEO.deck.y - GEO.tw * 0.5, s: (GEO.tw / 100) * 1.25, r: 0, z: 470, up: true };
          sfx('flip');
          await moveTo(c, lifted, { dur: D(230), z: 470 });
          if (G.isBonus(c)) { await ses.wait(D(200)); break; }
          await moveTo(c, T[c], { dur: D(280), z: 470 });
          bounce(c);
          sfx('slap');
          await syncAll(ses, D(160), new Set([c]));
          break;
        }
        case 'bonus': {
          vmRemove(e.card); VM.cap[e.p].push(e.card);
          const T = targets(ses);
          sfx('coin');
          await moveTo(e.card, T[e.card], { dur: D(420), arc: 30, z: 470 });
          await popup('보너스 피!', 'gold', e.from === 'hand' ? '한 장 더 받아요' : '한 장 더 뒤집어요');
          break;
        }
        case 'draw': {
          vmRemove(e.card); VM.hand[e.p].push(e.card); VM.hand[e.p].sort((a, b) => a - b);
          const T = targets(ses);
          sfx('flip');
          await moveTo(e.card, T[e.card], { dur: D(320), arc: 20, z: 470 });
          await syncAll(ses, D(180));
          break;
        }
        case 'pick': flash(e.card); await ses.wait(D(140)); break;
        case 'ppeok': sfx('ppeok'); C.vibrate([20, 40, 20]); await popup('뻑!', 'sad', e.count >= 2 ? `${nameOf(ses, e.p)} 뻑 ${e.count}번째` : '세 장이 바닥에 남아요'); break;
        case 'jjok': sfx('good'); await popup('쪽!', 'mint', '피 한 장씩 받아요'); break;
        case 'ttadak': sfx('good'); await popup('따닥!', 'mint', '네 장 다 · 피 한 장씩'); break;
        case 'eat': sfx('good'); await popup(e.own ? '자뻑 먹기!' : '뻑 먹기!', 'mint', e.steal ? `피 ${e.steal}장씩 받아요` : '세 장 한꺼번에'); break;
        case 'sweep': sfx('win'); await popup('싹쓸이!', 'gold', '피 한 장씩 받아요'); break;
        case 'capture': {
          for (const c of e.cards) flash(c);
          await ses.wait(D(170));
          for (const c of e.cards) { vmRemove(c); VM.cap[e.p].push(c); }
          const T = targets(ses);
          sfx('whoosh');
          await Promise.all(e.cards.map((c, i) => moveTo(c, T[c], { dur: D(380), delay: i * D(55), arc: 14, z: 430 + i })));
          await syncAll(ses, D(160));
          break;
        }
        case 'steal': {
          vmRemove(e.card); VM.cap[e.to].push(e.card);
          const T = targets(ses);
          sfx('steal');
          await moveTo(e.card, T[e.card], { dur: D(520), arc: 50, z: 490 });
          bounce(e.card);
          await syncAll(ses, D(150));
          if (e.to === meSeat(ses)) C.toast('피 한 장 가져왔어요', 1100);
          break;
        }
        case 'combo': sfx('good'); await popup(e.name + '!', 'gold', nameOf(ses, e.p)); break;
        case 'kook': drawHud(ses); C.toast(`${nameOf(ses, e.p)}: 국진을 ${e.as === 'P' ? '쌍피로' : '열끗으로'} 써요`, 1300); await syncAll(ses, D(260)); break;
        case 'go': sfx('go'); if (e.p !== meSeat(ses)) sfx('mew'); await popup(e.count + '고!', '', `${nameOf(ses, e.p)} ${e.base}점에서 한 번 더`); drawHud(ses); break;
        case 'stop': sfx('count'); await popup(e.auto ? '나!' : '스톱!', 'gold', `${nameOf(ses, e.p)} ${e.base}점`); break;
        case 'nagari': sfx('lose'); await popup('나가리', 'sad', '다음 판은 두 배'); break;
        case 'pass': sfx('flip'); await popup('뒤집기만', 'mint', `남은 ${e.left}번`); break;
        case 'buy': {
          sfx('coin');
          for (const c of e.cards) {
            const el = els[c]; if (el) { el.classList.remove('gone'); el._t = { x: GEO.deck.x, y: GEO.deck.y, s: GEO.tw / 100, r: 0, z: 460, up: true }; }
            VM.cap[e.p].push(c);
          }
          const T = targets(ses);
          await Promise.all(e.cards.map((c, i) => moveTo(c, T[c], { dur: D(420), delay: i * D(60), arc: 30, z: 470 + i })));
          await popup('광을 샀어요!', 'gold', `${nameOf(ses, e.p)} → ${tname(ses, e.seat)} · ${e.cards.length}점`);
          break;
        }
        case 'nobuy': C.toast(`${nameOf(ses, e.p)}: 안 사요`, 900); await ses.wait(D(380)); break;
        case 'unsold': C.toast('아무도 안 사서 광은 도로 들어가요', 1300); await ses.wait(D(500)); break;
        case 'saleEnd': break;
        case 'turn': case 'canStop': case 'end': break;
      }
      drawHud(ses);
    }
  }

  // ── 내 차례 ──────────────────────────────────────────────
  function humanTurn(ses) {
    return new Promise((resolve, reject) => {
      ses.pending = { resolve, reject };
      const s = ses.S;
      if (s.phase === 'play') {
        // 손의 패를 누르면 고르기, 한 번 더 누르면 내기
        drawHud(ses); markHand(ses);
        if (window.__gostop && __gostop.autoHuman) setTimeout(() => autoAct(ses), FAST ? 1 : 300);
      } else if (s.phase === 'pickHand' || s.phase === 'pickFlip') {
        const o = s.cur.opts;
        if (ses.pre >= 0 && o.indexOf(ses.pre) >= 0) { const k = o.indexOf(ses.pre); ses.pre = -1; return finishHuman(ses, G.A_PICK + k); }
        askPick(ses, o);
      } else if (s.phase === 'goStop') askGoStop(ses);
      else if (s.phase === 'buy') askBuy(ses);
      else if (s.phase === 'kook') askKook(ses);
    });
  }
  function finishHuman(ses, a) {
    const p = ses.pending; if (!p) return;
    ses.pending = null; ses.sel = -1;
    markHand(ses);
    $('passBtn').hidden = true;
    p.resolve(a);
  }
  function autoAct(ses) {
    if (!ses.pending || !ses.alive) return;
    const a = AI.choose(G.view(ses.S, ses.S.turn), 'easy', { seed: rand32() });
    finishHuman(ses, a);
  }
  // 손패 표시: 내 차례면 누를 수 있게, 짝이 있는 패는 아래 금빛 막대 + 코치 모드면 기댓값 신호등
  function getCoachForTurn(ses) {
    const s = ses.S, me = meSeat(ses);
    if (!s || me < 0 || s.phase !== 'play' || s.turn !== me || !AI.coachHand) return null;
    if (!ses.coachCache || ses.coachCache.seq !== ses.seq) {
      ses.coachCache = { seq: ses.seq, data: AI.coachHand(G.view(s, me)) };
    }
    return ses.coachCache.data;
  }

  function markHand(ses) {
    const s = ses.S; if (!s || !VM) return;
    const me = meSeat(ses), mine = s.phase === 'play' && s.turn === me && !!ses.pending && !ses.hide;
    const tm = new Set(s.table.map(G.monthOf));
    const showCoach = mine && coachOn(ses);
    const coach = showCoach ? getCoachForTurn(ses) : null;
    const best = coach && coach.bestCard >= 0 && ses.sel < 0 ? coach.bestCard : -1;      // 추천 패는 반짝 (선생님이 켜져 있을 때만)
    for (const id in els) {
      const el = els[id], c = +id;
      const inHand = me >= 0 && VM.hand[me] && VM.hand[me].indexOf(c) >= 0;
      el.classList.toggle('mine', inHand && mine);
      el.classList.toggle('can', inHand && mine && !G.isBonus(c) && tm.has(G.monthOf(c)));
      el.classList.toggle('sel', inHand && mine && ses.sel === c);
      el.classList.toggle('hint', inHand && best === c);
      const onTable = s.table.indexOf(c) >= 0;
      el.classList.toggle('glow', onTable && mine && ses.sel >= 0 && !G.isBonus(ses.sel) && G.monthOf(c) === G.monthOf(ses.sel));
      el.classList.toggle('pick', onTable && mine && ses.sel >= 0 && G.monthOf(c) === G.monthOf(ses.sel));
      const badge = el.querySelector('.ev-badge');
      if (badge) {
        const ci = coach && inHand ? coach.byCard[c] : null;
        if (ci) {
          badge.hidden = false;
          badge.className = 'ev-badge ' + ci.tier;
          const ic = ci.tier === 'best' ? '👑' : ci.tier === 'good' ? '🟢' : ci.tier === 'ok' ? '🟡' : '🔴';
          badge.textContent = `${ic} ${ci.tier === 'best' ? '최선' : ci.deltaText}`;
        } else {
          badge.hidden = true;
        }
      }
    }
    coachRender(ses, mine, coach);
  }

  // ── 🧑‍🏫 AI 선생님: 떠 있는 창(CoachPanel)에 추천을 띄움. 창 모듈이 없으면 예전 띠(coachBar) ──
  const coachAvail = ses => !!ses && !ses.cfg.watch && (!ses.cfg.online || !!ses.cfg.coach);   // 친구랑은 방장이 켠 방에서만
  const coachOn = ses => coachAvail(ses) && !!ses.coachOn;
  function setupCoach(ses) {
    if (!coachAvail(ses) || !window.CoachPanel) return;
    const KEYP = 'game.coach.gostop';
    let saved = null; try { saved = localStorage.getItem(KEYP); } catch (e) {}
    // 처음 쓰는 좁은 화면(폰): 접힌 동그라미를 위쪽 구석에 — 내 손패와 바닥을 안 가림
    if (!saved && innerWidth < 900) {
      // (동그라미는 위 줄의 코인 표시 자리에, 펼친 창은 상대 자리 위에)
      const top = Math.round($('stage').getBoundingClientRect().top) + 2, barTop = Math.round($('play').querySelector('.bar').getBoundingClientRect().top) + 2, pw = Math.min(320, innerWidth * 0.86);
      try { localStorage.setItem(KEYP, JSON.stringify({ c: [Math.max(4, innerWidth - 56), barTop], p: [Math.max(4, Math.round(innerWidth - pw - 6)), top], z: 1 })); } catch (e) {}
    }
    try { ses.panel = CoachPanel.create({ game: 'gostop', title: 'AI 선생님', startHidden: true }); } catch (e) { ses.panel = null; }
  }
  function coachRender(ses, mine, coach) {
    const on = coachOn(ses) && !ses.spec && !ses.hide;
    let html = '', advice = false;
    if (on && mine && coach && coach.bestCard >= 0 && GEO) {
      advice = true;
      const selInfo = ses.sel >= 0 ? coach.byCard[ses.sel] : null;
      if (selInfo) {
        const ic = selInfo.tier === 'best' ? '👑 최선 추천' : selInfo.tier === 'good' ? '🟢 좋은 수' : selInfo.tier === 'ok' ? '🟡 무난한 수' : '🔴 아쉬운 수';
        const cmp = selInfo.tier !== 'best' ? ` (추천: <b>${esc(coach.bestName)}</b>)` : '';
        html = `<span class="cb-tag">${ic} · ${esc(selInfo.tag)}</span><br><b>[${esc(selInfo.name)}]</b> ${esc(selInfo.why)}${cmp}`;
      } else {
        html = `<span class="cb-tag">👑 추천 · ${esc(coach.bestTag)}</span><br><b>[${esc(coach.bestName)}]</b> — ${esc(coach.bestWhy)}`;
      }
    } else if (on) html = '<span class="small">내 차례가 되면 추천 수를 알려 드려요</span>';
    const bar = $('coachBar');
    if (ses.panel) {
      if (bar) bar.hidden = true;
      if (!on) { ses.panel.hide(); ses.coachHtml = null; return; }
      if (ses.coachHtml !== html) { ses.coachHtml = html; ses.panel.set(html); }
      if (!ses.panel.visible) ses.panel.show();
    } else if (bar) {
      if (advice && GEO) { bar.hidden = false; bar.style.bottom = (GEO.H - GEO.hand.y + 6) + 'px'; bar.innerHTML = `<span class="cb-ic">🧑‍🏫</span><div class="cb-txt">${html}</div>`; }
      else bar.hidden = true;
    }
  }

  // ── 📱 한 기기에서 여럿: 사람 차례가 바뀔 때 덮개로 앞사람 패를 가림 (common/hotseat.js 가 있으면 그걸, 없으면 간단한 덮개) ──
  let hotEl = null;
  function hotClose() { if (hotEl) { hotEl.remove(); hotEl = null; } if (window.HotSeat && HotSeat.isOpen) HotSeat.close(); }
  function hotCover(info) {
    if (window.HotSeat && typeof HotSeat.cover === 'function') {
      try { return Promise.resolve(HotSeat.cover({ name: info.name, emoji: info.em })); } catch (e) { console.warn(e); }
    }
    return new Promise(res => {
      hotClose();
      const d = hotEl = document.createElement('div');
      d.className = 'hotcover';
      d.innerHTML = `<div class="hc-box"><div class="hc-em">${esc(info.em)}</div><h2>${esc(info.name)} 차례예요</h2><p>기기를 ${esc(info.name)}에게 넘겨 주세요.<br>다른 사람은 화면을 보지 마세요</p><button class="btn primary big" type="button">내 패 보기</button></div>`;
      document.body.appendChild(d);
      d.querySelector('button').onclick = () => { sfx('tap'); hotClose(); res(); };
    });
  }
  async function hotAccept(ses, p) {
    const seat = ses.who[p];
    if (!ses.hide && ses.hotLast === seat) return;
    $('goBox').hidden = true;
    await hotCover(seatAt(ses, p));
    ses.check();
    ses.hotLast = seat; ses.hide = false;
    if (ses.cfg.me !== seat) {
      ses.cfg.me = seat; ses.spec = ses.who.indexOf(seat) < 0;
      buildHud(ses); layout(ses);
    }
    await syncAll(ses, 0);
  }

  // ── 광 팔기 알림 · 사기 ──
  async function announceOffer(ses) {
    const sale = ses.S.sale, o = sale.offers[sale.i];
    const key = ses.S.round + ':' + sale.i;
    if (sale.k !== 0 || ses.offerKey === key) return;
    ses.offerKey = key;
    sfx('pop');
    await popup('광 팔기!', 'gold', `${tname(ses, o.seat)}: ${o.cards.map(c => G.cardName(c)).join(' · ')} (${o.cards.length}점)`);
  }
  function askBuy(ses) {
    sfx('pop');
    const s = ses.S, o = s.sale.offers[s.sale.i], n = o.cards.length, p = s.turn;
    const own = s.hands[p].filter(c => c >= 0 && G.KIND[c] === G.GW).length + s.cap[p].filter(c => G.KIND[c] === G.GW).length;
    ask(ses, '💰 광 팔기', `<p style="margin:0">${esc(iga(tname(ses, o.seat)))} 광 ${n}장을 팔아요.<br>사면 내 먹은 패가 되고, 값 <b>${n * G.SALE_PRICE}점</b>을 ${esc(tname(ses, o.seat))}에게 줘요 (이기든 지든 똑같이).</p><div class="cardrow" style="margin-top:8px">${o.cards.map(x => ART.use(x)).join('')}</div><p class="small" style="margin:6px 0 0">내가 가진 광 ${own}장</p>`,
      [{ label: `광 사기 (${n}점)`, primary: true, a: G.A_BUY }, { label: '안 사요', a: G.A_NOBUY }]);
  }

  function select(ses, c) {
    ses.sel = c; ses.hover = -1;
    sfx('tap');
    syncAll(ses, D(140));
  }
  function playSelected(ses) {
    const s = ses.S, c = ses.sel, me = meSeat(ses); if (c < 0 || !ses.pending) return;
    const L = G.legal(s), m = G.monthOf(c);
    if (G.isBonus(c)) return finishHuman(ses, G.A_PLAY + c);
    if (L.indexOf(G.A_BOMB + m) >= 0) {
      const tc = s.table.find(x => G.monthOf(x) === m);
      return ask(ses, '💣 폭탄!', `<p style="margin:0">손에 ${m + 1}월이 세 장, 바닥에 한 장이 있어요.<br>세 장을 한꺼번에 내면 네 장을 다 가져오고 <b>피 한 장씩</b> 받아요. 이기면 <b>두 배</b>!</p><div class="cardrow" style="margin-top:8px">${s.hands[me].filter(x => G.monthOf(x) === m).concat(tc).map(x => ART.use(x)).join('')}</div>`,
        [{ label: '💣 폭탄', primary: true, a: G.A_BOMB + m }, { label: '한 장만 내기', a: G.A_PLAY + c }]);
    }
    if (L.indexOf(G.A_SHAKE + c) >= 0) {
      return ask(ses, '👋 흔들까요?', `<p style="margin:0">손에 ${m + 1}월이 세 장 있어요. 보여 주고 내면 이겼을 때 점수가 <b>두 배</b>예요.<br><span class="small">(세 장을 상대도 보게 돼요)</span></p><div class="cardrow" style="margin-top:8px">${s.hands[me].filter(x => G.monthOf(x) === m).map(x => ART.use(x)).join('')}</div>`,
        [{ label: '👋 흔들기', primary: true, a: G.A_SHAKE + c }, { label: '그냥 내기', a: G.A_PLAY + c }]);
    }
    finishHuman(ses, G.A_PLAY + c);
  }
  function ask(ses, title, html, btns) {
    const close = C.modal({ title, html, buttons: btns.map(b => ({ label: b.label, primary: b.primary, onClick: () => { ses.modals = ses.modals.filter(x => x !== close); finishHuman(ses, b.a); } })), dismiss: false });
    ses.modals.push(close);
  }
  function askPick(ses, o) {
    sfx('pop');
    const s = ses.S;
    const close = C.modal({
      title: '어느 패를 가져올까요?',
      html: `<div class="picks">${o.map((c, k) => `<button data-k="${k}">${ART.use(c)}<span>${esc(G.cardName(c))}</span></button>`).join('')}</div><p class="small" style="margin:6px 0 0">${s.phase === 'pickFlip' ? '뒤집은 패' : '낸 패'}와 같은 달이 바닥에 두 장이에요</p>`,
      buttons: [], dismiss: false,
    });
    ses.modals.push(close);
    const ov = document.querySelector('.overlay:last-of-type');
    ov.querySelectorAll('.picks button').forEach(b => b.onclick = () => { sfx('tap'); ses.modals = ses.modals.filter(x => x !== close); close(); finishHuman(ses, G.A_PICK + +b.dataset.k); });
    if (matchMedia('(hover: hover)').matches) setTimeout(() => { const b = ov.querySelector('.picks button'); if (b) b.focus({ preventScroll: true }); }, 30);
  }
  function askKook(ses) {
    sfx('pop');
    const s = ses.S, p = s.turn, ty = G.tally(s, p, 'Y'), tp = G.tally(s, p, 'P');
    ask(ses, '🍶 국진을 어떻게 쓸까요?', `<div class="cardrow">${ART.use(G.KOOK)}</div><p style="margin:6px 0 0">9월 술잔은 <b>열끗</b>으로 두거나 <b>쌍피</b>(피 두 장)로 쓸 수 있어요.</p>
      <table class="brk" style="margin-top:6px"><tr><td>열끗으로</td><td class="n">열끗 ${ty.y}장 · 지금 ${ty.base}점</td></tr><tr><td>쌍피로</td><td class="n">피 ${tp.pi}장 · 지금 ${tp.base}점</td></tr></table>`,
    [{ label: '열끗으로', primary: ty.base >= tp.base, a: G.A_KOOK_Y }, { label: '쌍피로', primary: tp.base > ty.base, a: G.A_KOOK_P }]);
  }
  function askGoStop(ses) {
    const s = ses.S, p = s.turn, pre = G.stopPreview(s, p), t = G.tally(s, p);
    sfx('good');
    const opp = Array.from({ length: s.n }, (_, q) => q).filter(q => q !== p).map(q => `${esc(seatAt(ses, q).name)} ${G.tally(s, q).base}점`).join(' · ');
    let rows = '';
    for (const it of pre.items) if (!/고$/.test(it.k)) rows += `<tr><td>${esc(it.k)}</td><td class="n">${it.pts}점</td></tr>`;
    if (s.go[p]) rows += `<tr class="sub"><td>지금까지 ${s.go[p]}고</td><td class="n">${pre.total}점</td></tr>`;
    for (const m of pre.mults) rows += `<tr class="x"><td>${esc(m.k)}</td><td class="n">×${m.x}</td></tr>`;
    const per = pre.per.map(l => `${esc(seatAt(ses, l.p).name)}${l.mults.length ? ' (' + l.mults.map(m => m.k).join('·') + ')' : ''}`).join(', ');
    const nextGo = s.go[p] + 1;
    const goTxt = nextGo <= 2 ? `+${nextGo}점` : `점수 ×${Math.pow(2, nextGo - 2)}`;
    const gc = (coachOn(ses) && AI.coachGoStop) ? AI.coachGoStop(G.view(s, p)) : null;
    const coachHtml = gc ? `
      <div class="go-coach">
        <div class="gc-row">
          <span>🧑‍🏫 AI 선생님 분석</span>
          <b>추천: ${gc.rec === G.A_GO ? '🔥 고(Go)!' : '✋ 스톱(Stop)!'}</b>
        </div>
        <div style="font-size:12.5px;margin-bottom:3px">
          • 스톱 확정: <b>+${gc.stopPts}점</b> vs 고 평균 기댓값: <b>${gc.goEv >= 0 ? '+' : ''}${gc.goEv.toFixed(1)}점</b> (승리 유지 ${gc.winRateGo}% · 역고박 위험 ${gc.gobakRisk}%)
        </div>
        <div style="font-size:12px;color:#065f46">💡 ${esc(gc.why)}</div>
      </div>
    ` : '';
    $('goTitle').textContent = `${t.base}점! 고? 스톱?`;
    $('goBody').innerHTML = `<table class="brk">${rows}<tr class="sum"><td>지금 스톱하면</td><td class="n">+${pre.points}점</td></tr></table>
      <p class="gonote">${per ? '진 사람: ' + per + '<br>' : ''}상대: ${opp} · 남은 손패 ${s.hands[p].length}장</p>
      <p class="gonote">고 하면 ${nextGo}고(${goTxt}) — 대신 상대가 먼저 나면 <b>고박</b>이에요</p>
      ${coachHtml}`;
    $('goBtns').innerHTML = '';
    $('goBtns').className = 'gobtns';
    const mk = (label, cls, a) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { $('goBox').hidden = true; sfx('tap'); finishHuman(ses, a); }; $('goBtns').appendChild(b); return b; };
    const gb = mk('고! 🔥', 'primary', G.A_GO);
    const sb = mk('스톱 ✋', 'mint', G.A_STOP);
    if (gc) (gc.rec === G.A_GO ? gb : sb).classList.add('look');
    $('goBox').hidden = false;
    if (matchMedia('(hover: hover)').matches) setTimeout(() => sb.focus({ preventScroll: true }), 30);
    drawHud(ses);
  }

  // 누르기: 손패 · 바닥 패 · 빈 곳
  $('layer').addEventListener('pointerdown', e => {
    const ses = SES; if (!ses || !ses.pending || ses.S.phase !== 'play') return;
    const el = e.target.closest('.hw'); if (!el) return;
    const c = +el.dataset.id, s = ses.S, me = meSeat(ses);
    e.preventDefault();
    if (me >= 0 && s.hands[me].indexOf(c) >= 0) {
      if (ses.sel === c) playSelected(ses); else select(ses, c);
    } else if (s.table.indexOf(c) >= 0) {
      const m = G.monthOf(c);
      if (ses.sel >= 0 && G.monthOf(ses.sel) === m) { ses.pre = c; playSelected(ses); }
      else { const h = s.hands[me].find(x => G.monthOf(x) === m); if (h != null) select(ses, h); }
    }
  });
  $('stage').addEventListener('pointerdown', e => {
    const ses = SES; if (!ses || !ses.pending || ses.S.phase !== 'play') return;
    if (e.target.closest('.hw') || e.target.closest('button')) return;
    if (ses.sel >= 0) { ses.sel = -1; syncAll(ses, D(140)); }
  });
  // 마우스: 손패 위에 올리면 살짝 들림
  $('layer').addEventListener('pointerover', e => {
    const ses = SES; if (!ses || e.pointerType !== 'mouse') return;
    const el = e.target.closest('.hw.mine'); const c = el ? +el.dataset.id : -1;
    if (c !== ses.hover) { ses.hover = c; if (ses.pending) syncAll(ses, D(120)); }
  });
  $('layer').addEventListener('pointerleave', () => { const ses = SES; if (ses && ses.hover !== -1) { ses.hover = -1; if (ses.pending) syncAll(ses, D(120)); } });
  $('passBtn').onclick = () => { const ses = SES; if (!ses || !ses.pending) return; if (G.legal(ses.S).indexOf(G.A_PASS) >= 0) { sfx('tap'); finishHuman(ses, G.A_PASS); } };
  $('play').addEventListener('contextmenu', e => e.preventDefault());

  // 키보드: ←→ 고르기 · Enter/Space 내기 · 1~0 바로 고르기 · Esc 취소 · G/S 고·스톱
  addEventListener('keydown', e => {
    const ses = SES; if (!ses || $('play').hidden) return;
    if (document.querySelector('.overlay:not([hidden]):not(#goBox):not(#resBox)')) return;
    const s = ses.S; if (!s) return;
    const k = e.key;
    if (!$('goBox').hidden) { if (k === 'g' || k === 'G' || k === 'ㅎ') { e.preventDefault(); $('goBtns').children[0].click(); } else if (k === 's' || k === 'S' || k === 'ㄴ') { e.preventDefault(); $('goBtns').children[1].click(); } return; }
    if (!ses.pending || s.phase !== 'play') return;
    const me = meSeat(ses), hand = VM.hand[me] || [];
    if (!hand.length) { if (k === 'Enter' || k === ' ') { e.preventDefault(); $('passBtn').click(); } return; }
    const i = hand.indexOf(ses.sel);
    if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); const d = k === 'ArrowRight' ? 1 : -1; select(ses, hand[i < 0 ? (d > 0 ? 0 : hand.length - 1) : (i + d + hand.length) % hand.length]); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (ses.sel >= 0) playSelected(ses); else select(ses, hand[0]); }
    else if (/^[0-9]$/.test(k)) { const j = k === '0' ? 9 : +k - 1; if (hand[j] != null) { e.preventDefault(); if (ses.sel === hand[j]) playSelected(ses); else select(ses, hand[j]); } }
    else if (k === 'Escape') { if (ses.sel >= 0) { ses.sel = -1; syncAll(ses, D(120)); } }
    else if (k === 'p' || k === 'P') $('passBtn').click();
  });

  // ── AI 차례 ──────────────────────────────────────────────
  async function aiTurn(ses, p) {
    const seat = seatAt(ses, p);
    setThinking(ses, p, true);
    const t0 = performance.now();
    const v = G.view(ses.S, p);
    const a = await aiChoose(v, seat.tier);
    ses.check();
    const want = FAST ? 0 : SP().think * (ses.S.phase === 'goStop' ? 1.5 : ses.S.phase === 'play' ? 1 : 0.6);
    const left = want - (performance.now() - t0);
    if (left > 0) await ses.wait(left);
    setThinking(ses, p, false);
    return a;
  }

  // ── 판 결과 ──────────────────────────────────────────────
  async function showResult(ses) {
    await Promise.race([popQ, sleep(1500)]);
    await ses.wait(FAST ? 0 : 350);
    $('pop').hidden = true;
    return new Promise((resolve, reject) => {
      const s = ses.S, r = s.result, me = meSeat(ses), watch = ses.cfg.watch, spec = watch || ses.spec || ses.hot;
      if (!r) return resolve('menu');
      let title, big = '', bigCls = '', coinLine = '';
      const nm = p => esc(seatAt(ses, p).name);
      if (r.kind === 'nagari') { title = '🤝 나가리'; big = '다음 판 ×' + Math.pow(2, r.carryNext); bigCls = 'lose'; sfx('lose'); }
      else if (spec) { title = `${seatAt(ses, r.winner).em} ${nm(r.winner)} 승리!`; big = '+' + fmtN(r.points) + '점'; sfx('win'); }
      else if (r.winner === me) {
        title = r.kind === 'chongtong' ? '🎴 총통으로 이겼어요!' : r.kind === 'ppeok3' ? '💥 쓰리뻑으로 이겼어요!' : '🎉 이겼어요!';
        big = '+' + fmtN(r.points) + '점';
        const gain = r.points * 10;
        coins += gain; C.save(KEY + 'coins', coins);
        coinLine = `<p class="rescoin">🪙 판돈 획득 +${fmtN(gain)}냥</p>`;
        sfx('win');
        if (r.points >= 10) setTimeout(() => C.confetti(), 150); else setTimeout(() => C.confetti({ particleCount: 60, spread: 60 }), 150);
      } else {
        const mine = r.per.find(l => l.p === me);
        title = r.kind === 'chongtong' ? `🎴 ${nm(r.winner)}의 총통` : r.kind === 'ppeok3' ? `💥 ${nm(r.winner)}의 쓰리뻑` : `😿 ${esc(iga(seatAt(ses, r.winner).name))} 났어요`;
        big = mine ? '-' + fmtN(mine.pay) + '점' : '';
        bigCls = 'lose'; sfx('lose');
      }
      if (!spec && r.kind !== 'nagari') {
        stats.played++; if (r.winner === me) { stats.won++; stats.best = Math.max(stats.best, r.points); }
        C.save(KEY + 'stats', stats); drawCoinPill();
      }
      // 점수 내역
      const saleRows = (r.sale || []).map(x => `<tr><td>💰 광 팔기 <span class="small">${esc(tname(ses, x.buyerSeat))} → ${esc(tname(ses, x.seat))} · 광 ${x.cards.length}장</span></td><td class="n">${x.price}점</td></tr>`).join('');
      let rows = '';
      if (r.kind !== 'nagari') {
        for (const it of r.items) rows += `<tr><td>${esc(it.k)}</td><td class="n">${it.x ? '(+' + s.go[r.winner] + ')×' + it.x : '+' + it.pts}${it.x ? '' : '점'}</td></tr>`;
        rows += `<tr class="sub"><td>${r.winner === me && !ses.hot ? '내' : nm(r.winner)} 점수</td><td class="n">${fmtN(r.total)}점</td></tr>`;
        for (const m of r.mults) rows += `<tr class="x"><td>${esc(m.k)}</td><td class="n">×${m.x}</td></tr>`;
        for (const l of r.per) {
          const ms = l.mults.map(m => m.x ? `${m.k} ×${m.x}` : m.k).join(' · ');
          rows += `<tr class="${l.p === me ? 'x' : ''}"><td>${nm(l.p)}${ms ? ` <span class="small">${esc(ms)}</span>` : ''}</td><td class="n">${l.pay ? '-' + fmtN(l.pay) : '0'}점</td></tr>`;
        }
        rows += `<tr class="sum"><td>${esc(iga(nameOf(ses, r.winner)))} 받는 점</td><td class="n">+${fmtN(r.points)}</td></tr>`;
        rows += saleRows;
      }
      const sumLine = r.kind === 'nagari' ? `<p style="margin:0">아무도 못 났어요. 다음 판 점수는 <b>${Math.pow(2, r.carryNext)}배</b>!</p>${saleRows ? `<table class="brk">${saleRows}</table>` : ''}` : `<table class="brk">${rows}</table>`;
      // 🧑‍🏫 일타 강사 복기 노트 (가장 아쉬웠던 결정적 한 수 + 다시 쳐보기 Drill)
      let reviewHtml = '', worstTurn = null;
      if (!spec && ses.turnLog && ses.turnLog.length) {
        const logs = ses.turnLog;
        const avgLoss = logs.reduce((acc, x) => acc + Math.max(0, -x.delta), 0) / logs.length;
        const grade = avgLoss < 0.18 ? 'S급 프로 타짜' : avgLoss < 0.45 ? 'A급 고수' : avgLoss < 0.85 ? 'B급 실전파' : 'C급 입문자';
        const sorted = logs.slice().sort((a, b) => a.delta - b.delta);
        if (sorted[0] && sorted[0].delta < -0.25) worstTurn = sorted[0];
        reviewHtml = `
          <div class="review-card">
            <h4><span>🧑‍🏫 AI 선생님 복기 노트</span><span class="rv-grade">정확도: ${grade}</span></h4>
            ${worstTurn ? `
              <div><b>📌 아쉬웠던 ${worstTurn.turnNo}번째 차례 (기댓값 ${worstTurn.delta.toFixed(1)}점 손실)</b><br>
              내가 낸 패: <b>[${esc(worstTurn.chosenName)}]</b> (${esc(worstTurn.chosenTag)})<br>
              선생님 추천: <b>[${esc(worstTurn.bestName)}]</b> — ${esc(worstTurn.bestWhy)}</div>
              ${!ses.cfg.online ? `<button class="rv-drill" id="drillBtn" type="button">👉 ${worstTurn.turnNo}번째 차례 그 장면으로 돌아가 다시 쳐보기</button>` : ''}
            ` : `<div>👏 이번 판은 모든 차례에서 최선에 가까운 완벽한 수읽기를 보여주셨어요!</div>`}
          </div>
        `;
      }
      $('resTitle').textContent = title;
      $('resBig').innerHTML = `${big ? `<div class="resbig ${bigCls}">${big}</div>` : ''}${coinLine}`;
      $('resBody').innerHTML = sumLine + reviewHtml;
      $('resBtns').innerHTML = '';
      const done = v => { clearTimeout(autoT); $('resBox').hidden = true; resolve(v); };
      if (worstTurn && $('drillBtn')) {
        $('drillBtn').onclick = () => { sfx('pop'); done({ drillState: worstTurn.stateBefore }); };
      }
      const mk = (label, cls, v) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { sfx('tap'); done(v); }; $('resBtns').appendChild(b); return b; };
      const nb = mk(watch ? '다음 판 ▶' : '다음 판 ▶', 'primary', 'next');
      mk(watch ? '그만 보기' : '메뉴', '', 'menu');
      let autoT = 0;
      if (watch && !ses.paused) autoT = setTimeout(() => { if (SES === ses && ses.alive) done('next'); }, FAST ? 30 : 4200);
      ses.pending = { resolve: v => done(v), reject: e => { clearTimeout(autoT); $('resBox').hidden = true; reject(e); } };
      ses.pending.isResult = true;
      $('resBox').hidden = false;
      if (matchMedia('(hover: hover)').matches) setTimeout(() => nb.focus({ preventScroll: true }), 40);
      drawHud(ses);
    }).finally(() => { if (ses.pending && ses.pending.isResult) ses.pending = null; });
  }

  // ── 아래 단추 줄 ──────────────────────────────────────────
  function drawDock() {
    const ses = SES, watch = ses && ses.cfg.watch;
    const cb = $('coachBtn');
    cb.hidden = !coachAvail(ses);
    cb.setAttribute('aria-pressed', String(coachOn(ses)));
    cb.innerHTML = `<span class="ic">🧑‍🏫</span><span>AI 선생님</span>`;
    $('pauseBtn').hidden = !watch;
    if (ses) $('pauseBtn').innerHTML = `<span class="ic">${ses.paused ? '▶' : '⏸'}</span><span>${ses.paused ? '계속' : '멈춤'}</span>`;
    const sp = SPEEDS[opt[speedKey()]] || SPEEDS.normal;
    $('speedBtn').innerHTML = `<span class="ic">${sp.em}</span><span>${sp.label}</span>`;
  }
  // AI 선생님 단추 하나: 선생님 창을 켜고 끔 (혼자는 늘, 친구랑은 방장이 켠 방에서만). 힌트 단추는 따로 없음
  $('coachBtn').onclick = () => {
    const ses = SES; if (!coachAvail(ses)) return;
    ses.coachOn = !ses.coachOn;
    if (!ses.cfg.online && !ses.hot) { opt.coach = ses.coachOn ? 1 : 0; saveOpt('coach'); }
    sfx('tap');
    ses.coachHtml = null;
    drawDock();
    markHand(ses);
    C.toast(ses.coachOn ? '🧑‍🏫 AI 선생님을 켰어요' : 'AI 선생님을 껐어요', 1100);
  };
  $('speedBtn').onclick = () => { const k = speedKey(); opt[k] = SPEED_ORDER[(SPEED_ORDER.indexOf(opt[k]) + 1) % 3]; saveOpt(k); sfx('tap'); drawDock(); C.toast('진행 속도: ' + SPEEDS[opt[k]].label, 1000); };
  $('pauseBtn').onclick = () => { const ses = SES; if (!ses) return; ses.paused = !ses.paused; sfx('tap'); drawDock(); if (!ses.paused) ses.wake(); };
  $('ruleBtn').onclick = () => showRules();
  C.sfx.button($('sndBtn'));
  // ── 시험용 손잡이 (headless 시험에서 씀) ─────────────────────
  window.__gostop = {
    get ses() { return SES; }, get state() { return SES && SES.S; }, get vm() { return VM; }, get geo() { return GEO; },
    autoHuman: false,
    fast(on) { FAST = on ? 1 : 0; },
    startHot(o) { o = o || {}; startSeed = o.seed >>> 0; if (o.mode) opt.lMode = o.mode; if (o.seats) opt.lSeats = o.seats; if (lPick) lPick.set(o.picks || Array.from({ length: opt.lMode }, (_, i) => ((opt.lSeats[i] || 'normal') === 'human' ? { kind: 'human', name: '사람' + (i + 1) } : { kind: 'ai', tier: opt.lSeats[i] }))); startHotSeat(); },
    start(o) { o = o || {}; startSeed = o.seed >>> 0; if (o.mode) opt.mode = o.mode; if (o.tier) opt.tier = o.tier; if (o.bonus != null) opt.bonus = o.bonus; if (o.wTiers) opt.wTiers = o.wTiers; if (o.wMode) opt.wMode = o.wMode; startGame({ watch: !!o.watch }); },
    home: () => goHome(),
    act(a) { const ses = SES; if (ses && ses.pending && !ses.pending.isResult) finishHuman(ses, a); },
    legal() { return SES ? G.legal(SES.S) : []; },
    get panel() { return SES && SES.panel; },
  };

  // ── 시작 ────────────────────────────────────────────────
  ART.install();
  drawMenu();
  show('home');
  if (window.ArenaUI) ArenaUI.checkUrl(friendOpts());
})();
